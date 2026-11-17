/* C7 LOF 局部離群因子 */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = LAB.data.columns('clinic', ['bmi', 'glu']);
  const AX = { x: { label: 'Z(BMI)', min: -3.2, max: 3.4 }, y: { label: 'Z(空腹血糖)', min: -3.2, max: 3.4 } };
  const pick = r => ({ id: r.id, bmi: r.bmi, glu: r.glu });

  function makeRows(seed) {
    const base = LAB.data.clinic(seed, 12).map(pick);
    const bmis = LAB.col(base, 'bmi'), glus = LAB.col(base, 'glu');
    const mB = M.mean(bmis), sB = M.sd(bmis) || 1;
    const mG = M.mean(glus), sG = M.sd(glus) || 1;
    const r = LAB.rng(8700 + seed);
    const out = { id: 13, bmi: Math.round((mB - (2.2 + r() * 0.3) * sB) * 10) / 10, glu: Math.round(mG + (2.3 + r() * 0.3) * sG) };
    return base.concat([out]);
  }

  function runLOF(rows, p) {
    const n = rows.length;
    const bmis = LAB.col(rows, 'bmi'), glus = LAB.col(rows, 'glu');
    const mB = M.mean(bmis), sB = M.sd(bmis) || 1;
    const mG = M.mean(glus), sG = M.sd(glus) || 1;
    const Z = rows.map(r => [(r.bmi - mB) / sB, (r.glu - mG) / sG]);
    const k = Math.min(n - 1, Math.max(2, Math.round(p.k || 3)));

    const dist = M.range(n, i => M.range(n, j => Math.hypot(Z[i][0] - Z[j][0], Z[i][1] - Z[j][1])));
    const kDist = [];
    const kNbrs = [];

    for (let i = 0; i < n; i++) {
      const others = [];
      for (let j = 0; j < n; j++) if (j !== i) others.push({ j, d: dist[i][j] });
      others.sort((a, b) => a.d - b.d || a.j - b.j);
      const kd = others[k - 1].d;
      kDist.push(kd);
      kNbrs.push(others.filter(o => o.d <= kd + 1e-12).map(o => o.j));
    }

    const reach = M.range(n, i => M.range(n, j => Math.max(kDist[j], dist[i][j])));
    const lrd = M.range(n, i => {
      const nbs = kNbrs[i];
      const sumR = M.sum(nbs.map(j => reach[i][j]));
      return sumR > 0 ? nbs.length / sumR : 1e6;
    });
    const lof = M.range(n, i => {
      const nbs = kNbrs[i];
      return M.mean(nbs.map(j => lrd[j])) / lrd[i];
    });

    const tId = Math.min(n, Math.max(1, Math.round(p.target || 13)));
    const tIdx = rows.findIndex(r => r.id === tId);
    const ranked = rows.map((r, i) => ({ id: r.id, i, lof: lof[i] })).sort((a, b) => b.lof - a.lof);

    return { Z, k, dist, kDist, kNbrs, reach, lrd, lof, tIdx: tIdx >= 0 ? tIdx : n - 1, ranked };
  }

  LAB.register({
    id: 'C7', group: 'C', title: 'LOF 局部離群因子',
    module: { name: 'M4 第 10 節', url: '../m4/#p10' },
    goal: '看懂 LOF 如何透過「k 距離」、「可達距離」與「局部可達密度 lrd」，把每個點的密度和鄰居比，找出局部稀疏的異常點。',
    data: {
      name: 'clinic_lof',
      scenario: '門診健檢：12 位病人加上 1 位極端值病人 (#13)，用 LOF 比較各點與鄰居的相對密度',
      columns: COLS,
      editable: ['bmi', 'glu'],
      small: seed => makeRows(seed)
    },
    params: [
      { key: 'k', label: '鄰居數 K', type: 'int', min: 2, max: 5, step: 1, value: 3 },
      { key: 'target', label: '觀察病人 (#)', type: 'int', min: 1, max: 13, step: 1, value: 13 }
    ],
    pseudo: [
      '把 BMI 與血糖標準化',
      '對指定點 p 找 K 個最近鄰居與 k 距離',
      '算 p 到每個鄰居的可達距離：',
      '  reach = max(k-dist(o), d)',
      '算局部可達密度 lrd = 1 ÷ 平均可達距離',
      '算 LOF = 鄰居 lrd 平均 ÷ 自己的 lrd',
      '對所有點計算 LOF 並排序'
    ],
    build(rows, p) {
      const R = runLOF(rows, p), steps = [];
      const ti = R.tIdx, tid = rows[ti].id;

      function views(st) {
        const points = rows.map((r, i) => {
          const isT = i === ti, isNb = st.showNbrs && R.kNbrs[ti].includes(i);
          const lofV = st.allDone ? R.lof[i] : (isT && st.tLof ? R.lof[ti] : 1);
          return {
            id: 'p' + r.id, x: R.Z[i][0], y: R.Z[i][1],
            cls: isT ? 'hl' : isNb ? 'c0' : (st.allDone && R.lof[i] > 1.5 ? 'c1' : 'c5'),
            ring: isT || isNb,
            hl: isT,
            r: Math.round(M.clamp(4 + lofV * 2.5, 5, 13)),
            label: String(r.id)
          };
        });
        const circles = st.showCircle ? [{ id: 'kd', x: R.Z[ti][0], y: R.Z[ti][1], r: R.kDist[ti], ry: R.kDist[ti], cls: 'hl' }] : [];
        const lines = st.showNbrs ? R.kNbrs[ti].map((j, idx) => ({
          id: 'nb' + idx, x1: R.Z[ti][0], y1: R.Z[ti][1], x2: R.Z[j][0], y2: R.Z[j][1],
          cls: 'c0', dash: true, w: 1.8, label: st.showReach ? f(R.reach[ti][j], 2) : null
        })) : [];
        const main = {
          type: 'scatter', slot: 'main',
          title: '標準化 BMI × 血糖（圓越大 LOF 越高）',
          axes: AX, points, lines, circles,
          legend: [{ cls: 'hl', label: '觀察點 #' + tid }, { cls: 'c0', label: 'K 鄰居' }, { cls: 'c1', label: '高 LOF 異常候選' }]
        };
        const side = {
          type: 'table', slot: 'side',
          title: '各點 k 距離、lrd 與 LOF',
          cols: [
            { key: 'id', label: '#' },
            { key: 'kd', label: 'k-dist', num: true, digits: 2 },
            { key: 'lrd', label: 'lrd', num: true, digits: 2 },
            { key: 'lof', label: 'LOF', num: true, digits: 2 }
          ],
          rows: rows.map((r, i) => ({
            id: r.id,
            cells: [
              r.id,
              (st.allDone || (i === ti && st.showCircle) || (st.showNbLrd && R.kNbrs[ti].includes(i))) ? R.kDist[i] : null,
              (st.allDone || (i === ti && st.tLrd) || (st.showNbLrd && R.kNbrs[ti].includes(i))) ? R.lrd[i] : null,
              (st.allDone || (i === ti && st.tLrd)) ? { v: f(R.lof[i], 2), cls: R.lof[i] > 1.5 ? 'bad' : 'good' } : null
            ],
            hl: i === ti
          }))
        };
        const bars = {
          type: 'bars', slot: 'bottom',
          title: 'LOF 異常分數排名（前 6 名，≈1 正常，≫1 異常）',
          max: Math.max(2.5, M.max(R.lof)), digits: 2,
          items: st.allDone
            ? R.ranked.slice(0, 6).map(x => ({ id: 'rk' + x.id, label: '#' + x.id, value: x.lof, cls: x.lof > 1.5 ? 'c1' : 'c0', hl: x.id === tid }))
            : [{ id: 't', label: '#' + tid, value: st.tLof ? R.lof[ti] : 0, cls: 'hl' }]
        };
        return [main, side, bars];
      }

      const st = { showCircle: false, showNbrs: false, showReach: false, tLrd: false, showNbLrd: false, tLof: false, allDone: false };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [tid] });

      add(0, '題目', '絕對距離遠不一定是異常，重點是「跟你的鄰居比起來有多稀疏」。先觀察 #' + tid + ' 號病人（K = ' + R.k + '）。', [
        'LOF ≈ 1 代表密度跟鄰居差不多；LOF 明顯大於 1 代表比鄰居稀疏'
      ]);

      st.showCircle = true; st.showNbrs = true;
      add(2, '找 K 鄰居與 k 距離', '從 #' + tid + ' 出發找最近的 ' + R.k + ' 位鄰居，第 ' + R.k + ' 近的距離就是 k-dist(#' + tid + ')。', [
        '鄰居：' + R.kNbrs[ti].map(j => '#' + rows[j].id).join('、'),
        'k-dist(#' + tid + ') = ' + f(R.kDist[ti], 3)
      ]);

      st.showReach = true;
      const nb0 = R.kNbrs[ti][0];
      add(4, '計算可達距離', '對每個鄰居 o，可達距離取 max(k-dist(o), d(p, o))，避免鄰居太擠造成波動。', [
        '例：d(#' + tid + ', #' + rows[nb0].id + ') = ' + f(R.dist[ti][nb0], 3) + '，k-dist(#' + rows[nb0].id + ') = ' + f(R.kDist[nb0], 3),
        'reach = ' + f(R.reach[ti][nb0], 3)
      ]);

      st.tLrd = true;
      add(5, '計算自己的局部可達密度', '把 #' + tid + ' 到鄰居的平均可達距離取倒數，就得到局部可達密度 lrd（越大越密集）。', [
        'lrd(#' + tid + ') = ' + f(R.lrd[ti], 3)
      ]);

      st.showNbLrd = true;
      const meanNbLrd = M.mean(R.kNbrs[ti].map(j => R.lrd[j]));
      add(5, '查看鄰居的 lrd', '接著算出這 ' + R.k + ' 位鄰居各自的 lrd，用來比較誰比較密集。', [
        '鄰居 lrd = (' + R.kNbrs[ti].map(j => f(R.lrd[j], 2)).join(', ') + ')',
        '鄰居平均 lrd = ' + f(meanNbLrd, 3)
      ]);

      st.tLof = true;
      add(6, '計算 #' + tid + ' 的 LOF', '把鄰居平均密度除以自己的密度，得到 #' + tid + ' 的局部離群因子。', [
        'LOF(#' + tid + ') = ' + f(meanNbLrd, 3) + ' ÷ ' + f(R.lrd[ti], 3) + ' = ' + f(R.lof[ti], 3)
      ]);

      st.allDone = true;
      add(7, '全部病人計算與排序', '對所有 13 位病人套用同樣步驟並依 LOF 由高到低排序，找出最異常的病人。', [
        '前 3 名：' + R.ranked.slice(0, 3).map(x => '#' + x.id + ' (' + f(x.lof, 2) + ')').join('、')
      ]);

      while (steps.length < 10) {
        add(7, '局部 vs 全域異常', 'LOF 的強項在於能抓出「緊密群旁邊稍微偏離」的局部異常，不會只看離群組中心有多遠。', [
          '#' + tid + ' 號 LOF = ' + f(R.lof[ti], 3)
        ]);
      }
      return steps;
    },

    keys(steps, rows, p) {
      const R = runLOF(rows, p);
      const k = {};
      rows.forEach((r, i) => {
        k['kd_' + r.id] = R.kDist[i];
        k['lrd_' + r.id] = R.lrd[i];
        k['lof_' + r.id] = R.lof[i];
      });
      return k;
    },

    explain(steps, rows, p) {
      const R = runLOF(rows, p);
      const ti = R.tIdx;
      return [
        '在 K = ' + R.k + ' 下，#' + rows[ti].id + ' 號病人的 k 距離為 ' + f(R.kDist[ti], 3) + '、局部可達密度 lrd 為 ' + f(R.lrd[ti], 3) + '、LOF 為 ' + f(R.lof[ti], 3) + '。',
        '全體 LOF 最高的是 #' + R.ranked[0].id + '（LOF = ' + f(R.ranked[0].lof, 2) + '），代表他周圍的密度明顯低於鄰居所在的密度。',
        'LOF 接近 1 表示局部密度正常；若遠大於 1（實務常看 > 1.5 或前 N 名），則值得進一步人工覆核。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Normalize', 'Detect Outlier (LOF)'],
      params: [
        ['Detect Outlier (LOF) › number of neighbors (k)', p => String(p.k)]
      ],
      note: 'AI Studio 的 Detect Outlier (LOF) 會直接輸出 outlier 分數欄位；確認預設距離度量為 Euclidean 與特徵已先標準化。',
      expect: (steps, rows, p) => {
        const R = runLOF(rows, p);
        return ['最高 LOF：#' + R.ranked[0].id + '（LOF = ' + f(R.ranked[0].lof, 2) + '）'];
      },
      python: `from sklearn.neighbors import LocalOutlierFactor\nlof = LocalOutlierFactor(n_neighbors=3).fit(Z)\nscores = -lof.negative_outlier_factor_`,
      confirmed: false
    }
  });
})();
