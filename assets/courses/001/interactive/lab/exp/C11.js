/* C11 K-Means++ 與模糊分群 FCM */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = LAB.data.columns('clinic', ['bmi', 'glu']);
  const AX = { x: { label: 'BMI（Z 分數）', min: -2.8, max: 2.8 }, y: { label: '空腹血糖（Z 分數）', min: -2.8, max: 2.8 } };
  const CL = ['c0', 'c1', 'c2', 'c3'];
  const pick = r => ({ id: r.id, bmi: r.bmi, glu: r.glu });

  function runAlgo(rows, p) {
    const n = rows.length;
    const K = Math.max(2, Math.min(4, Math.round(p.k || 3)));
    const mFuzzy = Math.max(1.5, Math.min(3.0, Number(p.m || 2.0)));
    const mB = M.mean(rows.map(r => r.bmi)), sB = M.sd(rows.map(r => r.bmi)) || 1;
    const mG = M.mean(rows.map(r => r.glu)), sG = M.sd(rows.map(r => r.glu)) || 1;
    const Z = rows.map(r => [(r.bmi - mB) / sB, (r.glu - mG) / sG]);

    // 1. K-Means++ deterministic greedy / probability trace (seed from #1)
    const initIdx = [0];
    const d2Steps = [];
    for (let c = 1; c < K; c++) {
      const d2s = Z.map((z, i) => {
        if (initIdx.includes(i)) return 0;
        return Math.min.apply(null, initIdx.map(ci => (z[0] - Z[ci][0]) ** 2 + (z[1] - Z[ci][1]) ** 2));
      });
      const sumD2 = M.sum(d2s) || 1;
      const probs = d2s.map(v => v / sumD2);
      // 挑選距離平方機率最高（最遠未覆蓋）的點作為示範代表，確保可重現且直觀
      let bestI = 0;
      for (let i = 1; i < n; i++) if (d2s[i] > d2s[bestI]) bestI = i;
      initIdx.push(bestI);
      d2Steps.push({ step: c, d2s, probs, pickedIdx: bestI, pickedId: rows[bestI].id });
    }

    // 2. Fuzzy C-Means iterations starting from K-Means++ centers
    let cent = initIdx.map(idx => Z[idx].slice());
    let memU = M.range(n, () => M.range(K, () => 1 / K));
    const power = 2 / (mFuzzy - 1);

    const calcU = curC => Z.map(z => {
      const ds = curC.map(c => Math.max(1e-6, Math.hypot(z[0] - c[0], z[1] - c[1])));
      return M.range(K, k => {
        let denom = 0;
        for (let j = 0; j < K; j++) denom += (ds[k] / ds[j]) ** power;
        return 1 / denom;
      });
    });

    const calcObj = (curU, curC) => {
      let s = 0;
      for (let i = 0; i < n; i++) {
        for (let k = 0; k < K; k++) {
          const d2 = (Z[i][0] - curC[k][0]) ** 2 + (Z[i][1] - curC[k][1]) ** 2;
          s += (curU[i][k] ** mFuzzy) * d2;
        }
      }
      return s;
    };

    memU = calcU(cent);
    const hist = [{ it: 0, cent: cent.map(c => c.slice()), uMat: memU.map(r => r.slice()), obj: calcObj(memU, cent) }];

    for (let it = 1; it <= 12; it++) {
      cent = M.range(K, k => {
        let wx = 0, wy = 0, wSum = 0;
        for (let i = 0; i < n; i++) {
          const w = memU[i][k] ** mFuzzy;
          wx += w * Z[i][0]; wy += w * Z[i][1]; wSum += w;
        }
        return wSum > 0 ? [wx / wSum, wy / wSum] : cent[k];
      });
      memU = calcU(cent);
      hist.push({ it, cent: cent.map(c => c.slice()), uMat: memU.map(r => r.slice()), obj: calcObj(memU, cent) });
    }

    const fin = hist[hist.length - 1];
    return { K, mFuzzy, Z, initIdx, d2Steps, hist, fin };
  }

  LAB.register({
    id: 'C11', group: 'C', title: 'K-Means++ 與模糊分群 FCM',
    module: { name: 'M3 第 03 節', url: '../m3/#p03' },
    goal: '看懂 K-Means++ 如何用距離平方 D(x)² 抽樣把初始中心拉開（避開 C1 壞起點），並搭配模糊 C-Means (FCM) 算出邊界病人的軟隸屬度 u_ik。',
    data: {
      name: 'clinic_fcm',
      scenario: '門診健檢：12 位病人的標準化 BMI 與血糖，用 K-Means++ 選起點並做模糊軟分群',
      columns: COLS,
      editable: ['bmi', 'glu'],
      small: seed => LAB.data.clinic(seed, 12).map(pick)
    },
    params: [
      { key: 'k', label: '群數 K', type: 'int', min: 2, max: 4, step: 1, value: 3 },
      { key: 'm', label: '模糊指數 m', type: 'num', min: 1.5, max: 3.0, step: 0.5, value: 2.0 }
    ],
    pseudo: [
      '把 BMI 與血糖標準化成 Z 分數',
      'K-Means++ 挑選 K 個分散起點：',
      '  算每點到最近已選中心的距離平方 D(x)²',
      '  依 D(x)² 比例挑距離最遠區的新中心',
      '模糊 C-Means (FCM) 交替更新：',
      '  依距離倒數算每點對各群隸屬度 u_ik',
      '  以 u_ik^m 加權平均更新各群中心'
    ],
    build(rows, p) {
      const R = runAlgo(rows, p), steps = [];

      function views(st) {
        const h = R.hist[st.iter];
        const points = rows.map((r, i) => {
          const bestK = M.argmax(h.uMat[i]);
          const maxU = h.uMat[i][bestK];
          return {
            id: 'p' + r.id, x: R.Z[i][0], y: R.Z[i][1],
            cls: st.showFcm ? CL[bestK] : (st.pickedSet.has(i) ? 'hl' : 'c5'),
            hollow: st.showFcm && maxU < 0.65,
            ring: st.pickedSet.has(i) || (st.showFcm && maxU < 0.65),
            hl: st.hlIdx === i,
            label: String(r.id), r: st.hlIdx === i ? 8 : 6
          };
        });
        const centsShow = st.showFcm ? h.cent : Array.from(st.pickedSet).map(idx => R.Z[idx]);
        centsShow.forEach((c, k) => {
          points.push({ id: 'c' + k, x: c[0], y: c[1], cls: CL[k], shape: 'diamond', r: 9, hl: true, label: 'C' + (k + 1) });
        });
        const main = {
          type: 'scatter', slot: 'main',
          title: st.showFcm ? ('FCM 模糊分群（空心圓＝最大隸屬度 < 0.65 之邊界病人）') : 'K-Means++ 距離平方 D(x)² 選取分散起始中心',
          axes: AX, points, lines: [], circles: [],
          legend: M.range(R.K, k => ({ cls: CL[k], label: '群 ' + (k + 1) })).concat([{ cls: 'hl', shape: 'ring', label: '邊界模糊點 / 起點' }])
        };

        const cols = [{ key: 'id', label: '#' }];
        if (!st.showFcm) {
          cols.push({ key: 'd2', label: 'D(x)²', num: true, digits: 2 }, { key: 'pr', label: '被選機率', num: true, digits: 3 });
        } else {
          for (let k = 0; k < R.K; k++) cols.push({ key: 'u' + k, label: 'u_群' + (k + 1), num: true, digits: 2 });
        }
        const side = {
          type: 'table', slot: 'side',
          title: st.showFcm ? ('模糊隸屬度矩陣（m = ' + f(R.mFuzzy, 1) + '）') : 'K-Means++ 候選距離平方 D(x)²',
          cols,
          rows: rows.map((r, i) => {
            if (!st.showFcm) {
              const ds = R.d2Steps[Math.min(st.d2Idx, R.d2Steps.length - 1)];
              return { id: r.id, cells: [r.id, ds.d2s[i], ds.probs[i]], hl: st.hlIdx === i };
            }
            const bestK = M.argmax(h.uMat[i]);
            return {
              id: r.id,
              cells: [r.id].concat(M.range(R.K, k => ({ v: f(h.uMat[i][k], 2), cls: k === bestK ? CL[k] : null }))),
              hl: h.uMat[i][bestK] < 0.65
            };
          })
        };

        const bottom = {
          type: 'line', slot: 'bottom',
          title: 'FCM 加權目標函數 J_m 隨迭代收斂曲線',
          axes: { x: { label: 'FCM 迭代輪次', min: 0, max: 12 }, y: { label: 'J_m 目標值', min: 0, max: Math.max(2, R.hist[0].obj * 1.15) } },
          series: [{ id: 'obj', label: 'J_m', pts: R.hist.slice(0, st.iter + 1).map(x => [x.it, x.obj]), cls: 'c1', dots: true }],
          marker: { x: h.it, y: h.obj, label: 'It=' + h.it }
        };
        return [main, side, bottom];
      }

      const st = { pickedSet: new Set([0]), d2Idx: 0, hlIdx: 0, showFcm: false, iter: 0 };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '1. 題目與 C1 的痛點', '標準 K-Means (C1) 隨機挑起點很容易選到擠在一起的點。K-Means++ 改用「距離平方 D(x)²」確保起點彼此遠離！', [
        '第 1 個起點 C1 選 #1 號病人'
      ]);

      R.d2Steps.forEach((ds, idx) => {
        st.d2Idx = idx; st.hlIdx = ds.pickedIdx;
        st.pickedSet.add(ds.pickedIdx);
        add(3, '2. 挑起始中心 C' + (idx + 2), '計算每點到最近已選中心的距離平方 D(x)²，距離越遠被選中機率越高，成功挑出遠處的 #' + ds.pickedId + '！', [
          '最大 D(x)² 落在 #' + ds.pickedId + '（D² = ' + f(ds.d2s[ds.pickedIdx], 2) + '，抽樣權重 ' + LAB.pct(ds.probs[ds.pickedIdx], 1) + '）'
        ]);
      });

      st.hlIdx = -1; st.showFcm = true; st.iter = 0;
      add(5, '3. 計算初始模糊隸屬度', '接著進入模糊 C-Means (FCM)：不強迫每個人非 0 即 1，而是依距離倒數算出屬於各群的隸屬度 u_ik（每列總和 = 1）。', [
        '模糊指數 m = ' + f(R.mFuzzy, 1) + '，初始目標值 J_m = ' + f(R.hist[0].obj, 3)
      ]);

      [1, 3, 6, 12].forEach(it => {
        st.iter = it;
        const h = R.hist[it];
        add(6, '4. FCM 第 ' + it + ' 輪更新', '以 u_ik^m 當權重更新群中心，再重算隸屬度，目標值 J_m 單調下降至 ' + f(h.obj, 3) + '。', [
          '第 ' + it + ' 輪 J_m = ' + f(h.obj, 3)
        ]);
      });

      const nBorder = R.fin.uMat.filter(u => Math.max.apply(null, u) < 0.65).length;
      add(6, '5. 辨識邊界過渡病人', '收斂完成！右表標亮的 ' + nBorder + ' 位病人最大隸屬度 < 0.65（圖上空心圈），代表他們同時具備兩群特徵，適合跨科共同照護。', [
        '邊界過渡病人數 = ' + nBorder + ' 人｜最終 J_m = ' + f(R.fin.obj, 3)
      ]);

      while (steps.length < 10) {
        add(6, '模糊指數 m 的效果', 'm 越接近 1 越像硬分群 K-Means；m 越大（如 2.5–3.0）各群隸屬度越趨近 1/K 平均。實務預設 m = 2.0。', [
          '目前 K = ' + R.K + '，m = ' + f(R.mFuzzy, 1)
        ]);
      }
      return steps;
    },
    keys(steps, rows, p) {
      const R = runAlgo(rows, p);
      return {
        init_c1: rows[R.initIdx[0]].id,
        init_c2: rows[R.initIdx[1]].id,
        obj_0: R.hist[0].obj,
        obj_final: R.fin.obj,
        u0_0: R.fin.uMat[0][0],
        u0_1: R.fin.uMat[0][1]
      };
    },
    explain(steps, rows, p) {
      const R = runAlgo(rows, p);
      return [
        'K-Means++ 透過距離平方 D(x)² 加權挑選起始中心（本例選出 ' + R.initIdx.map(i => '#' + rows[i].id).join('、') + '），大幅減少落入差勁局部最佳解的機率。',
        '模糊 C-Means (FCM, m = ' + f(R.mFuzzy, 1) + ') 經 12 輪迭代後，目標值 J_m 從 ' + f(R.hist[0].obj, 3) + ' 收斂至 ' + f(R.fin.obj, 3) + '。',
        '不同於 K-Means 硬性切一刀，FCM 的隸屬度能自然呈現慢性病亞型之間的連續過渡狀態。'
      ];
    },
    aistudio: {
      operators: ['Read CSV', 'Normalize', 'k-Means (init=k-means++) / Fuzzy C-Means'],
      params: [
        ['k-Means › initialization', 'k-means++ (scikit-learn 預設)'],
        ['Fuzzy C-Means › fuzziness m', p => String(p.m)]
      ],
      note: 'scikit-learn 的 KMeans 預設即採用 init="k-means++"；若需模糊 C-Means 軟分群可使用 scikit-fuzzy 或 GMM (C4)。',
      expect: (steps, rows, p) => {
        const R = runAlgo(rows, p);
        return ['K-Means++ 初始中心：' + R.initIdx.map(i => '#' + rows[i].id).join('、') + '，FCM 最終 J_m = ' + f(R.fin.obj, 3)];
      },
      python: 'from sklearn.cluster import KMeans\nkm = KMeans(n_clusters=3, init="k-means++", random_state=0).fit(Z)',
      confirmed: false
    }
  });
})();
