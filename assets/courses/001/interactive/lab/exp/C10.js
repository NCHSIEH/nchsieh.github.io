/* C10 K-Medoids 分群 */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = LAB.data.columns('clinic', ['bmi', 'glu']);
  const AX = { x: { label: 'Z(BMI)', min: -2.8, max: 3.4 }, y: { label: 'Z(空腹血糖)', min: -2.8, max: 3.4 } };
  const CL = ['c0', 'c1', 'c2', 'c3'];

  function makeRows(seed) {
    const base = LAB.data.clinic(seed, 11).map(r => ({ id: r.id, bmi: r.bmi, glu: r.glu }));
    const mB = M.mean(base.map(r => r.bmi)), sB = M.sd(base.map(r => r.bmi)) || 1;
    const mG = M.mean(base.map(r => r.glu)), sG = M.sd(base.map(r => r.glu)) || 1;
    base.push({ id: 12, bmi: Math.round((mB + 2.6 * sB) * 10) / 10, glu: Math.round(mG + 2.7 * sG) });
    return base;
  }

  function runPAM(rows, p) {
    const n = rows.length;
    const K = Math.max(2, Math.min(4, Math.round(p.k || 2)));
    const bmis = LAB.col(rows, 'bmi'), glus = LAB.col(rows, 'glu');
    const mB = M.mean(bmis), sB = M.sd(bmis) || 1;
    const mG = M.mean(glus), sG = M.sd(glus) || 1;
    const Z = rows.map(r => [(r.bmi - mB) / sB, (r.glu - mG) / sG]);
    const dist = M.range(n, i => M.range(n, j => Math.hypot(Z[i][0] - Z[j][0], Z[i][1] - Z[j][1])));

    const assign = meds => {
      const a = [], cost = [];
      for (let i = 0; i < n; i++) {
        let best = 0, bd = dist[i][meds[0]];
        for (let k = 1; k < K; k++) {
          const d = dist[i][meds[k]];
          if (d < bd) { bd = d; best = k; }
        }
        a.push(best); cost.push(bd);
      }
      return { a, totalCost: M.sum(cost) };
    };

    const rng = LAB.rng(4100 + K * 19 + Math.round(rows[0].bmi * 10));
    let meds = LAB.shuffle(rng, M.range(n)).slice(0, K).sort((a, b) => a - b);
    let cur = assign(meds);
    const hist = [{ step: 0, meds: meds.slice(), a: cur.a.slice(), cost: cur.totalCost, swapMsg: '隨機挑 ' + K + ' 位初始代表病人' }];

    for (let it = 1; it <= 12; it++) {
      let bestMeds = null, bestCost = cur.totalCost - 1e-9, bestAssign = null, msg = '';
      for (let mIdx = 0; mIdx < K; mIdx++) {
        for (let cand = 0; cand < n; cand++) {
          if (meds.includes(cand)) continue;
          const trial = meds.slice();
          trial[mIdx] = cand;
          const res = assign(trial);
          if (res.totalCost < bestCost) {
            bestCost = res.totalCost;
            bestMeds = trial;
            bestAssign = res;
            msg = '將 #' + rows[meds[mIdx]].id + ' 換成 #' + rows[cand].id;
          }
        }
      }
      if (!bestMeds) break;
      meds = bestMeds;
      cur = bestAssign;
      hist.push({ step: it, meds: meds.slice(), a: cur.a.slice(), cost: cur.totalCost, swapMsg: msg });
    }

    // 計算同群的 K-Means 平均中心，供對比離群點牽引差異
    const kmCent = M.range(K, k => {
      const mem = Z.filter((_, i) => cur.a[i] === k);
      return mem.length ? [M.mean(mem.map(z => z[0])), M.mean(mem.map(z => z[1]))] : Z[meds[k]];
    });

    return { K, Z, hist, fin: hist[hist.length - 1], kmCent };
  }

  LAB.register({
    id: 'C10', group: 'C', title: 'K-Medoids 分群',
    module: { name: 'M3 第 03 節', url: '../m3/#p03' },
    goal: '不同於 K-Means 用「可能不存在的幾何平均點」當中心，K-Medoids (PAM) 規定群中心必須是「真實病人」，從而在含極端離群點 #12 時保持穩健不被拉偏。',
    data: {
      name: 'clinic_kmedoids',
      scenario: '門診健檢：11 位一般病人＋1 位極端高血糖高 BMI 離群病人 (#12)',
      columns: COLS,
      editable: ['bmi', 'glu'],
      small: makeRows
    },
    params: [
      { key: 'k', label: '分群數 K', type: 'int', min: 2, max: 4, step: 1, value: 2 },
      { key: 'compare', label: '對照 K-Means 平均中心', type: 'bool', value: true }
    ],
    pseudo: [
      '隨機選 K 位真實病人當初始中心 (Medoids)',
      '其餘病人指派給最近的 Medoid',
      '重複 PAM 交換步驟直到總距離不再下降：',
      '  試著用非中心病人替換某個 Medoid',
      '  若總距離 Σd 變小則正式替換',
      '輸出真實代表病人與各群成員'
    ],
    build(rows, p) {
      const R = runPAM(rows, p), steps = [];

      function views(st) {
        const h = R.hist[st.idx];
        const medSet = new Set(h.meds);
        const points = rows.map((r, i) => ({
          id: 'p' + r.id, x: R.Z[i][0], y: R.Z[i][1],
          cls: CL[h.a[i]],
          shape: medSet.has(i) ? 'diamond' : 'circle',
          r: medSet.has(i) ? 9 : 6,
          ring: medSet.has(i),
          hl: medSet.has(i),
          label: medSet.has(i) ? 'M#' + r.id : String(r.id)
        }));
        if (p.compare && st.showKm) {
          R.kmCent.forEach((c, k) => {
            points.push({ id: 'km' + k, x: c[0], y: c[1], cls: 'hl', shape: 'star', r: 8, label: 'KM' + (k + 1) });
          });
        }
        const lines = [];
        if (st.showLines) {
          h.a.forEach((ak, i) => {
            if (!medSet.has(i)) {
              const mIdx = h.meds[ak];
              lines.push({ id: 'sp' + i, x1: R.Z[i][0], y1: R.Z[i][1], x2: R.Z[mIdx][0], y2: R.Z[mIdx][1], cls: CL[ak], dash: true, w: 1.3 });
            }
          });
        }
        const regions = st.showReg ? LAB.grid((x, y) => {
          const ds = h.meds.map(mi => Math.hypot(x - R.Z[mi][0], y - R.Z[mi][1]));
          return CL[M.argmin(ds)];
        }, AX.x.min, AX.x.max, AX.y.min, AX.y.max, 28, 18) : null;
        const main = {
          type: 'scatter', slot: 'main',
          title: 'K-Medoids 真實代表點（菱形＝Medoid，星號＝K-Means 平均）',
          axes: AX, points, lines, circles: [], regions,
          legend: [{ cls: 'c0', shape: 'diamond', label: 'Medoid 代表病人' }, { cls: 'hl', shape: 'star', label: 'K-Means 平均中心' }]
        };
        const side = {
          type: 'table', slot: 'side',
          title: '各群代表病人 (Medoids)',
          cols: [
            { key: 'g', label: '群' },
            { key: 'm', label: '代表病人' },
            { key: 'n', label: '人數', num: true, digits: 0 },
            { key: 'c', label: '群內總距', num: true, digits: 2 }
          ],
          rows: h.meds.map((mi, k) => {
            const memIdx = h.a.map((ak, i) => ak === k ? i : -1).filter(i => i >= 0);
            const cSum = M.sum(memIdx.map(i => Math.hypot(R.Z[i][0] - R.Z[mi][0], R.Z[i][1] - R.Z[mi][1])));
            return { id: 'k' + k, cells: [{ v: '第 ' + (k + 1) + ' 群', cls: CL[k] }, '#' + rows[mi].id, memIdx.length, cSum] };
          })
        };
        const maxC = Math.max(2, R.hist[0].cost * 1.1);
        const bottom = {
          type: 'line', slot: 'bottom',
          title: '總距離成本 Σ d(x, Medoid) 下降曲線',
          axes: { x: { label: 'PAM 交換輪次', min: 0, max: Math.max(1, R.hist.length - 1) }, y: { label: '總距離成本', min: 0, max: maxC } },
          series: [{ id: 'cost', label: '總距離', pts: R.hist.slice(0, st.idx + 1).map(x => [x.step, x.cost]), cls: 'c1', dots: true }],
          marker: { x: h.step, y: h.cost, label: '第 ' + h.step + ' 輪' }
        };
        return [main, side, bottom];
      }

      const st = { idx: 0, showLines: false, showReg: false, showKm: false };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '題目', '12 位病人裡 #12 是極端高血糖與高 BMI 離群點。看 K-Medoids 如何只挑「真實病人」當代表中心。', [
        '初始 Medoids：' + R.hist[0].meds.map(i => '#' + rows[i].id).join('、')
      ]);
      add(0, '極端點 #12 的拉扯風險', '若用 K-Means 算群內平均，#12 的極端數值會把整群中心往右上拉離主群體；K-Medoids 改以最小化距離總和抵抗拉偏。', [
        '#12 座標 (Z_BMI, Z_血糖) = (' + f(R.Z[rows.length - 1][0], 2) + ', ' + f(R.Z[rows.length - 1][1], 2) + ')'
      ]);

      st.showLines = true;
      add(1, '指派並算總距離', '每位病人連到距離最近的 Medoid，算出所有連線距離總和（目標是讓總距離最小）。', [
        '起始總距離 = ' + f(R.hist[0].cost, 3)
      ]);

      for (let i = 1; i < R.hist.length; i++) {
        st.idx = i;
        const h = R.hist[i];
        add(4, '第 ' + i + ' 次 PAM 交換', h.swapMsg + '，總距離從 ' + f(R.hist[i - 1].cost, 2) + ' 降到 ' + f(h.cost, 2) + '。', [
          '目前代表：' + h.meds.map(mi => '#' + rows[mi].id).join('、'),
          '總距離 = ' + f(h.cost, 3)
        ]);
      }

      st.idx = R.hist.length - 1; st.showReg = true; st.showKm = true;
      add(5, '收斂與對照 K-Means', '沒有任何交換能再降低總距離，演算法收斂！注意星號（K-Means 平均）會被 #12 往右上方拉偏，但菱形 Medoid 仍穩居群心。', [
        '最終 Medoids：' + R.fin.meds.map(mi => '#' + rows[mi].id).join('、'),
        '最終總距離 = ' + f(R.fin.cost, 3)
      ]);

      add(5, '真實代表病人的價值', 'K-Medoids 的中心是真實存在的病人（Medoid），醫師可直接調閱該代表病人的完整病歷作為該亞型典型範例！', [
        '最終代表病人：' + R.fin.meds.map(mi => '#' + rows[mi].id).join('、')
      ]);
      add(5, '為何比 K-Means 抗離群', 'K-Means 最小化「距離平方和 (L2)」，單一極端點誤差平方會被無限放大；K-Medoids 最小化「距離和 (L1)」，就像中位數一樣穩健。', [
        'K-Means ≈ 算術平均 (怕離群)｜K-Medoids ≈ 中位數 (抗離群)'
      ]);
      add(5, '支援非歐氏與類別距離', '只要算得出兩兩距離矩陣（如曼哈頓距離、問卷 Gower 距離、文字編輯距離），K-Medoids 都能分群，K-Means 卻無法算平均！', [
        '適用混合型臨床表（數值＋類別＋序位欄位）'
      ]);
      add(5, '複雜度與 CLARA 加速', '標準 PAM 每輪需嘗試交換所有候選點，複雜度 O(k(n−k)²)，樣本數超過數千筆時實務改用抽樣加速版 CLARA 或 FasterPAM。', [
        '本次共經歷 ' + (R.hist.length - 1) + ' 次交換，總距離 = ' + f(R.fin.cost, 3)
      ]);
      add(5, 'K-Medoids 實務選用', '資料含極端離群值、非歐氏距離或需要真實典型案例解讀時首選 K-Medoids；大型純數值表則用 K-Means++ (C11)。', [
        '總距離 = ' + f(R.fin.cost, 3)
      ]);
      add(5, '對照其他分群家族', 'K-Medoids 仍需事先指定 K（可用 C9 輪廓係數挑）；若群呈彎曲非球狀或要自動抓雜訊，則改用 DBSCAN (C3)。', [
        '球狀抗離群 → K-Medoids｜彎曲含雜訊 → DBSCAN'
      ]);
      return steps;
    },

    keys(steps, rows, p) {
      const R = runPAM(rows, p);
      const k = { init_cost: R.hist[0].cost, final_cost: R.fin.cost, n_swaps: R.hist.length - 1 };
      R.fin.meds.forEach((mi, idx) => { k['medoid_' + idx] = rows[mi].id; });
      return k;
    },

    explain(steps, rows, p) {
      const R = runPAM(rows, p);
      return [
        '經 ' + (R.hist.length - 1) + ' 次 PAM 交換，總距離成本從 ' + f(R.hist[0].cost, 2) + ' 降至 ' + f(R.fin.cost, 2) + '。',
        '最終選出的真實代表病人為：' + R.fin.meds.map(mi => '#' + rows[mi].id).join('、') + '。',
        '當資料有極端離群值（如 #12）或距離矩陣非歐氏距離（如類別／問卷距離）時，K-Medoids 比 K-Means 更穩健且具臨床可解釋性。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Normalize', 'k-Medoids'],
      params: [
        ['k-Medoids › k', p => String(p.k)],
        ['k-Medoids › measure types', 'NumericalMeasures › EuclideanDistance']
      ],
      note: 'AI Studio 內建 k-Medoids 運算子，介面與 k-Means 幾乎相同，但輸出的 Centroid Table 會是資料中真實存在的樣本。',
      expect: (steps, rows, p) => {
        const R = runPAM(rows, p);
        return ['最終 Medoids：' + R.fin.meds.map(mi => '#' + rows[mi].id).join('、')];
      },
      python: 'from sklearn_extra.cluster import KMedoids\n# KMedoids(n_clusters=2, method="pam").fit(Z)',
      confirmed: false
    }
  });
})();
