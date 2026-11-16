/* C6 t-SNE */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = LAB.data.columns('clinic', ['age', 'bmi', 'glu', 'sbp', 'dm'], { dm: 'y' });
  const FEATS = ['age', 'bmi', 'glu', 'sbp'];
  const pick = r => ({ id: r.id, age: r.age, bmi: r.bmi, glu: r.glu, sbp: r.sbp, dm: r.dm });
  const cls = dm => dm ? 'c1' : 'c0';

  function runTSNE(rows, p) {
    const n = rows.length;
    const Z = rows.map(() => [0, 0, 0, 0]);
    FEATS.forEach((ft, j) => {
      const xs = LAB.col(rows, ft), mx = M.mean(xs), sx = M.sd(xs) || 1;
      for (let i = 0; i < n; i++) Z[i][j] = (xs[i] - mx) / sx;
    });

    // 高維平方距離矩陣
    const D2 = M.range(n, i => M.range(n, j => {
      let s = 0;
      for (let k = 0; k < 4; k++) s += (Z[i][k] - Z[j][k]) ** 2;
      return s;
    }));

    const perp = Math.max(2, Math.min(6, Math.round(p.perplexity || 4)));
    const targetH = Math.log(perp);
    const sigmas = [];
    const Pcond = M.range(n, () => M.range(n, () => 0));

    for (let i = 0; i < n; i++) {
      let beta = 1.0, bMin = -Infinity, bMax = Infinity;
      for (let step = 0; step < 50; step++) {
        let sumP = 0;
        const rowP = M.range(n, j => {
          if (i === j) return 0;
          const v = Math.exp(-D2[i][j] * beta);
          sumP += v;
          return v;
        });
        let H = 0;
        if (sumP > 0) {
          for (let j = 0; j < n; j++) {
            if (i === j) continue;
            const pj = rowP[j] / sumP;
            if (pj > 1e-12) H -= pj * Math.log(pj);
          }
        }
        const diff = H - targetH;
        if (Math.abs(diff) < 1e-5) {
          for (let j = 0; j < n; j++) Pcond[i][j] = sumP > 0 ? rowP[j] / sumP : 0;
          break;
        }
        if (diff > 0) {
          bMin = beta;
          beta = Number.isFinite(bMax) ? 0.5 * (beta + bMax) : beta * 2;
        } else {
          bMax = beta;
          beta = Number.isFinite(bMin) ? 0.5 * (beta + bMin) : beta * 0.5;
        }
        if (step === 49) {
          for (let j = 0; j < n; j++) Pcond[i][j] = sumP > 0 ? rowP[j] / sumP : 0;
        }
      }
      sigmas.push(Math.sqrt(0.5 / beta));
    }

    const P = M.range(n, i => M.range(n, j => {
      if (i === j) return 0;
      return Math.max((Pcond[i][j] + Pcond[j][i]) / (2 * n), 1e-12);
    }));

    const rng = LAB.rng(6600 + Math.round(p.init || 1) * 41 + perp);
    const Y0 = rows.map(() => [LAB.randn(rng) * 0.1, LAB.randn(rng) * 0.1]);
    let Y = Y0.map(pt => pt.slice());
    let vel = rows.map(() => [0, 0]);
    const iters = Math.max(100, Math.min(400, Math.round(p.iters || 200)));
    const lr = 20.0, mom = 0.5;

    function computeQ(curY) {
      let sumQ = 0;
      const num = M.range(n, i => M.range(n, j => {
        if (i === j) return 0;
        const d2 = (curY[i][0] - curY[j][0]) ** 2 + (curY[i][1] - curY[j][1]) ** 2;
        const v = 1 / (1 + d2);
        sumQ += v;
        return v;
      }));
      const Q = M.range(n, i => M.range(n, j => i === j ? 0 : Math.max(num[i][j] / (sumQ || 1), 1e-12)));
      let kl = 0;
      for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) if (i !== j) kl += P[i][j] * Math.log(P[i][j] / Q[i][j]);
      return { num, Q, kl };
    }

    const q0 = computeQ(Y);
    const snaps = [{ iter: 0, Y: Y.map(pt => pt.slice()), Q: q0.Q, kl: q0.kl }];

    for (let it = 1; it <= iters; it++) {
      const { num, Q } = computeQ(Y);
      const grad = M.range(n, () => [0, 0]);
      for (let i = 0; i < n; i++) {
        for (let j = 0; j < n; j++) {
          if (i === j) continue;
          const mult = 4 * (P[i][j] - Q[i][j]) * num[i][j];
          grad[i][0] += mult * (Y[i][0] - Y[j][0]);
          grad[i][1] += mult * (Y[i][1] - Y[j][1]);
        }
      }
      for (let i = 0; i < n; i++) {
        vel[i][0] = mom * vel[i][0] - lr * grad[i][0];
        vel[i][1] = mom * vel[i][1] - lr * grad[i][1];
        Y[i][0] += vel[i][0];
        Y[i][1] += vel[i][1];
      }
      if (it <= 2 || it % 20 === 0 || it === iters) {
        const qn = computeQ(Y);
        snaps.push({ iter: it, Y: Y.map(pt => pt.slice()), Q: qn.Q, kl: qn.kl });
      }
    }

    const fin = snaps[snaps.length - 1];
    return { sigmas, P, Y0, snaps, fin };
  }

  LAB.register({
    id: 'C6', group: 'C', title: 't-SNE',
    module: { name: 'M3 第 11 節', url: '../m3/#p11' },
    goal: '看懂 t-SNE 如何用高斯相似度（依 Perplexity 調整 σ）記錄高維鄰居關係 P，再在低維以 t 分布 Q 透過 KL 散度拉近鄰居。',
    data: {
      name: 'clinic_tsne',
      scenario: '門診健檢：把 4 個生理指標（年齡、BMI、血糖、血壓）降到 2 維觀察群聚',
      columns: COLS,
      editable: ['age', 'bmi', 'glu', 'sbp', 'dm'],
      small: seed => LAB.data.clinic(seed, 14).map(pick)
    },
    params: [
      { key: 'perplexity', label: 'Perplexity (有效鄰居數)', type: 'int', min: 2, max: 6, step: 1, value: 4 },
      { key: 'iters', label: '迭代次數', type: 'int', min: 100, max: 400, step: 100, value: 200 },
      { key: 'init', label: '起始種子', type: 'int', min: 1, max: 5, step: 1, value: 1 }
    ],
    pseudo: [
      '把 4 個生理指標標準化',
      '依 Perplexity 為每點二分搜尋 σᵢ',
      '算高維對稱相似度矩陣 P',
      '在 2D 隨機放起始座標 Y⁽⁰⁾',
      '重複迭代直到指定次數：',
      '  用 t 分布算低維相似度 Q',
      '  算 KL(P || Q) 的梯度並移動點'
    ],
    build(rows, p) {
      const R = runTSNE(rows, p), steps = [];
      const allX = R.snaps.reduce((a, s) => a.concat(s.Y.map(pt => pt[0])), []);
      const allY = R.snaps.reduce((a, s) => a.concat(s.Y.map(pt => pt[1])), []);
      const bnd = Math.max(1.5, Math.ceil(Math.max(M.max(allX.map(Math.abs)), M.max(allY.map(Math.abs))) * 1.15));
      const AX = { x: { label: 't-SNE 維度 1', min: -bnd, max: bnd }, y: { label: 't-SNE 維度 2', min: -bnd, max: bnd } };

      function views(st) {
        const sn = st.snap;
        const points = rows.map((r, i) => ({
          id: 'p' + r.id, x: sn.Y[i][0], y: sn.Y[i][1],
          cls: cls(r.dm), label: String(r.id), r: 6
        }));
        const main = {
          type: 'scatter', slot: 'main',
          title: '2D 嵌入空間（顏色僅供對照糖尿病）',
          axes: AX, points, lines: [], circles: [],
          legend: [{ cls: 'c1', label: '糖尿病：是' }, { cls: 'c0', label: '糖尿病：否' }]
        };
        const mat = st.showQ ? sn.Q : R.P;
        const side = {
          type: 'matrix', slot: 'side',
          title: st.showQ ? '低維相似度矩陣 Q（第 ' + sn.iter + ' 步）' : '高維對稱相似度矩陣 P',
          rowLabels: rows.slice(0, 8).map(r => '#' + r.id),
          colLabels: rows.slice(0, 8).map(r => '#' + r.id),
          values: mat.slice(0, 8).map(row => row.slice(0, 8)),
          digits: 3, heat: true
        };
        const klMax = Math.max(0.5, R.snaps[0].kl * 1.1);
        const line = {
          type: 'line', slot: 'bottom',
          title: 'KL 散度變化（越小代表 Q 越貼近 P）',
          axes: { x: { label: '迭代次數', min: 0, max: R.fin.iter }, y: { label: 'KL(P || Q)', min: 0, max: klMax } },
          series: [{ id: 'kl', label: 'KL 散度', pts: st.klPts, cls: 'c1', dots: true }],
          marker: { x: sn.iter, y: sn.kl, label: '第 ' + sn.iter + ' 步' }
        };
        return [main, side, line];
      }

      const st = { snap: R.snaps[0], showQ: false, klPts: [[0, R.snaps[0].kl]] };
      const add = (line, title, say, calc, extra) => steps.push(Object.assign({ line, title, say, calc: calc || [], views: views(st), focus: [] }, extra));

      add(0, '題目', '4 個指標畫不進 2D 圖。t-SNE 要把高維裡彼此靠近的病人，在 2D 平面上也拉近（注意：每次座標軸方向不同，只看誰靠近誰）。', [
        '目標 Perplexity = ' + p.perplexity + '，迭代次數 = ' + p.iters
      ]);

      add(2, '搜尋每點帶寬 σ', '高維密集處 σ 較小、稀疏處 σ 較大，使每個人有效鄰居數都約等於 Perplexity = ' + p.perplexity + '。', [
        '1 號 σ₁ = ' + f(R.sigmas[0], 3) + '，2 號 σ₂ = ' + f(R.sigmas[1], 3)
      ]);

      add(3, '建立高維相似度矩陣 P', '把條件機率對稱化成 Pᵢⱼ = (p(j|i)+p(i|j)) ÷ 2n，數值越大代表兩人在 4 維空間越相似。', [
        'P[0, 1] = ' + f(R.P[0][1], 4) + '，所有 Pᵢⱼ 總和 = 1'
      ]);

      st.showQ = true;
      add(4, '隨機放置低維起始座標', '在 2D 平面隨機撒下起始點 Y⁽⁰⁾，此時低維相似度 Q 與高維 P 還差很多。', [
        '起始 KL(P || Q) = ' + f(R.snaps[0].kl, 3)
      ]);

      for (let k = 1; k < R.snaps.length; k++) {
        const sn = R.snaps[k];
        st.snap = sn;
        st.klPts = R.snaps.slice(0, k + 1).map(x => [x.iter, x.kl]);
        add(7, '第 ' + sn.iter + ' 次迭代', sn.iter <= 2 ? '前幾步依 KL 梯度移動各點，把高維鄰居拉近、把不相似的點推開。' : '持續調整 2D 座標，KL 散度下降，相似病人在平面上慢慢靠攏。', [
          'KL(P || Q) = ' + f(sn.kl, 4)
        ], { phase: sn.iter + ' / ' + R.fin.iter });
      }

      add(7, 't-SNE 解讀提醒', '完成降維！t-SNE 座標沒有物理意義、不保留絕對距離，也不能直接對新病人投影，只看局部群聚結構。', [
        '最終 KL 散度 = ' + f(R.fin.kl, 4)
      ]);
      return steps;
    },

    inputs(rows, p) {
      const R = runTSNE(rows, p);
      return { y0: R.Y0 };
    },

    keys(steps, rows, p) {
      const R = runTSNE(rows, p);
      const k = { kl_final: R.fin.kl, p_0_1: R.P[0][1], p_0_2: R.P[0][2] };
      rows.forEach((r, i) => {
        k['sigma_' + r.id] = R.sigmas[i];
        k['y0_' + r.id] = R.fin.Y[i][0];
        k['y1_' + r.id] = R.fin.Y[i][1];
      });
      return k;
    },

    explain(steps, rows, p) {
      const R = runTSNE(rows, p);
      return [
        '在 Perplexity = ' + p.perplexity + ' 下，演算法為每個點自動調整出不同的高維帶寬 σ（如 #1 σ = ' + f(R.sigmas[0], 3) + '）。',
        '經 ' + p.iters + ' 次梯度下降後，低維 t 分布與高維高斯分布的 KL 散度降至 ' + f(R.fin.kl, 4) + '。',
        't-SNE 每次起始不同、座標軸旋轉也不同，只能用來觀察「誰跟誰聚在一起」，不可直接比較兩群間的距離大小。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Normalize', 'Execute Python'],
      params: [
        ['TSNE › perplexity', p => String(p.perplexity)],
        ['TSNE › max_iter', p => String(p.iters)]
      ],
      note: 'AI Studio 核心版沒有原生 t-SNE 運算子，實務上常透過 Execute Python 呼叫 scikit-learn TSNE；本實驗與 Python 驗證依原始論文公式對齊（無 early exaggeration）。',
      expect: (steps, rows, p) => {
        const R = runTSNE(rows, p);
        return ['最終 KL 散度 = ' + f(R.fin.kl, 4)];
      },
      python: `from sklearn.manifold import TSNE\nY = TSNE(n_components=2, perplexity=4, init='random').fit_transform(Z)`,
      confirmed: false
    }
  });
})();
