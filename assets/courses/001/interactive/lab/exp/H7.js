/* H7 LoRA 微調 */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = [
    { key: 'x0', label: 'x₀', type: 'num', role: 'x' },
    { key: 'x1', label: 'x₁', type: 'num', role: 'x' },
    { key: 'x2', label: 'x₂', type: 'num', role: 'x' },
    { key: 'x3', label: 'x₃', type: 'num', role: 'x' }
  ];

  function makeRows(seed) {
    const r = LAB.rng(7700 + seed);
    return M.range(6, i => ({
      id: i + 1,
      x0: Math.round((r() - 0.5) * 200) / 100,
      x1: Math.round((r() - 0.5) * 200) / 100,
      x2: Math.round((r() - 0.5) * 200) / 100,
      x3: Math.round((r() - 0.5) * 200) / 100
    }));
  }

  function runLoRA(rows, p) {
    const n = rows.length, d = 4;
    const rank = Math.max(1, Math.min(3, Math.round(p.rank || 1)));
    const epochs = Math.max(20, Math.min(200, Math.round(p.epochs || 80)));
    const lr = p.lr || 0.05;

    const rng = LAB.rng(7750 + rank * 17 + rows[0].id);
    const W = M.range(d, () => M.range(d, () => Math.round((rng() - 0.5) * 120) / 100));
    const X = rows.map(r => [r.x0, r.x1, r.x2, r.x3]);
    // 目標新行為：W*x + 小幅低秩偏移
    const dTrue = [[0.4, -0.3, 0.2, 0.1], [-0.2, 0.5, -0.1, 0.3], [0.1, 0.2, 0.4, -0.2], [0.3, -0.1, 0.2, 0.5]];
    const Y = X.map(x => M.range(d, i => M.sum(x.map((v, j) => (W[i][j] + dTrue[i][j]) * v))));

    const A0 = M.range(rank, () => M.range(d, () => Math.round((rng() - 0.5) * 100) / 100));
    const B0 = M.range(d, () => M.range(rank, () => 0));

    let A = A0.map(r => r.slice());
    let B = B0.map(r => r.slice());

    const mulBA = (Bm, Am) => M.range(d, i => M.range(d, j => M.sum(M.range(rank, k => Bm[i][k] * Am[k][j]))));
    const evalLoss = (Bm, Am) => {
      const dW = mulBA(Bm, Am);
      let s = 0;
      for (let m = 0; m < n; m++) {
        for (let i = 0; i < d; i++) {
          let yh = 0;
          for (let j = 0; j < d; j++) yh += (W[i][j] + dW[i][j]) * X[m][j];
          s += (yh - Y[m][i]) ** 2;
        }
      }
      return s / (n * d);
    };

    const snaps = [{ ep: 0, A: A.map(r => r.slice()), B: B.map(r => r.slice()), dW: mulBA(B, A), loss: evalLoss(B, A) }];

    for (let ep = 1; ep <= epochs; ep++) {
      const dW = mulBA(B, A);
      const gA = M.range(rank, () => M.range(d, () => 0));
      const gB = M.range(d, () => M.range(rank, () => 0));

      for (let m = 0; m < n; m++) {
        const x = X[m];
        const h = M.range(rank, k => M.sum(x.map((v, j) => A[k][j] * v)));
        for (let i = 0; i < d; i++) {
          let yh = 0;
          for (let j = 0; j < d; j++) yh += (W[i][j] + dW[i][j]) * x[j];
          const err = (2 / (n * d)) * (yh - Y[m][i]);
          for (let k = 0; k < rank; k++) {
            gB[i][k] += err * h[k];
            for (let j = 0; j < d; j++) gA[k][j] += err * B[i][k] * x[j];
          }
        }
      }
      for (let i = 0; i < d; i++) for (let k = 0; k < rank; k++) B[i][k] -= lr * gB[i][k];
      for (let k = 0; k < rank; k++) for (let j = 0; j < d; j++) A[k][j] -= lr * gA[k][j];

      if (ep === 1 || ep % Math.max(1, Math.floor(epochs / 6)) === 0 || ep === epochs) {
        snaps.push({ ep, A: A.map(r => r.slice()), B: B.map(r => r.slice()), dW: mulBA(B, A), loss: evalLoss(B, A) });
      }
    }

    const fin = snaps[snaps.length - 1];
    return { d, rank, W, X, Y, A0, B0, A, B, dW: fin.dW, snaps, fin, fullParams: d * d, loraParams: 2 * d * rank };
  }

  LAB.register({
    id: 'H7', group: 'H', title: 'LoRA 微調',
    module: { name: 'M7 生成式 AI', url: '../m7/' },
    goal: '看懂 LoRA 為什麼能凍結龐大的原權重 W，只在旁邊訓練兩個低秩小矩陣 B×A（參數量大幅減少），就能微調模型行為。',
    data: {
      name: 'llm_lora',
      scenario: '4×4 凍結權重矩陣 W 與 6 筆新任務資料，用低秩分解 ΔW = B·A 學習微調',
      columns: COLS,
      small: seed => makeRows(seed)
    },
    params: [
      { key: 'rank', label: '低秩 rank (r)', type: 'int', min: 1, max: 3, step: 1, value: 1 },
      { key: 'epochs', label: '訓練輪數', type: 'int', min: 20, max: 200, step: 20, value: 80 },
      { key: 'lr', label: '學習率 η', type: 'num', min: 0.01, max: 0.2, step: 0.01, value: 0.05 }
    ],
    pseudo: [
      '凍結原權重矩陣 W (4×4，不更新)',
      '建立低秩旁路 A (r×4)、B (4×r, 初值 0)',
      '前向計算 ŷ = (W + B·A) x',
      '算損失與對 A、B 的梯度',
      '只更新 A 與 B，ΔW = B·A 成形',
      '比較原模型與 LoRA 的參數量'
    ],
    build(rows, p) {
      const R = runLoRA(rows, p), steps = [];

      function views(st) {
        const sn = st.snap;
        const main = {
          type: 'matrix', slot: 'main',
          title: '學習到的微調增量 ΔW = B·A（第 ' + sn.ep + ' 輪）',
          rowLabels: ['y₀', 'y₁', 'y₂', 'y₃'],
          colLabels: ['x₀', 'x₁', 'x₂', 'x₃'],
          values: sn.dW,
          digits: 3, heat: 'div'
        };
        const side = {
          type: 'bars', slot: 'side',
          title: '可訓練參數量比較（本例 4×4，rank=' + R.rank + '）',
          max: R.fullParams * 1.6, digits: 0, unit: ' 個',
          items: [
            { id: 'full', label: '全量微調 W', value: R.fullParams, cls: 'c0' },
            { id: 'lora', label: 'LoRA (A+B)', value: R.loraParams, cls: 'c1' }
          ]
        };
        const line = {
          type: 'line', slot: 'bottom',
          title: '微調損失 MSE 變化',
          axes: { x: { label: 'Epoch', min: 0, max: p.epochs }, y: { label: 'MSE', min: 0, max: Math.max(0.1, R.snaps[0].loss * 1.15) } },
          series: [{ id: 'loss', label: 'MSE', pts: st.lossPts, cls: 'c1', dots: true }],
          marker: { x: sn.ep, y: sn.loss, label: 'Ep ' + sn.ep }
        };
        return [main, side, line];
      }

      const st = { snap: R.snaps[0], lossPts: [[0, R.snaps[0].loss]] };
      const add = (line, title, say, calc, extra) => steps.push(Object.assign({ line, title, say, calc: calc || [], views: views(st), focus: [] }, extra));

      add(0, '題目', '70B 參數的 LLM 全量微調太吃記憶體。LoRA 凍結原本的 W，只在旁邊掛兩個瘦長小矩陣 B·A。', [
        'W (4×4) 凍結，只訓練 A (' + R.rank + '×4) 與 B (4×' + R.rank + ')'
      ]);

      add(2, '初始化 ΔW = B·A = 0', 'A 隨機初始化，B 全部設為 0，確保訓練開始前 ΔW = 0、不破壞原本模型輸出。', [
        '起始 MSE = ' + f(R.snaps[0].loss, 4)
      ]);

      add(2, '比較參數量', '全量微調要存 16 個參數的梯度；rank=' + R.rank + ' 的 LoRA 只需 2×4×' + R.rank + ' = ' + R.loraParams + ' 個參數。', [
        '本例參數量：' + R.fullParams + ' vs ' + R.loraParams + '（比例 ' + LAB.pct(R.loraParams / R.fullParams, 1) + '）'
      ]);

      for (let k = 1; k < R.snaps.length; k++) {
        const sn = R.snaps[k];
        st.snap = sn;
        st.lossPts = R.snaps.slice(0, k + 1).map(x => [x.ep, x.loss]);
        add(k === 1 ? 4 : 5, '訓練第 ' + sn.ep + ' 輪', k === 1 ? '計算第 1 輪誤差對 A、B 的梯度並更新，ΔW 開始浮現出目標權重偏移。' : '繼續只更新 A 和 B，ΔW = B·A 逐步成形、損失穩定下降。', [
          'Epoch ' + sn.ep + ' / ' + p.epochs + '｜MSE = ' + f(sn.loss, 4)
        ], { phase: sn.ep + ' / ' + p.epochs });
      }

      const bigFull = 4096 * 4096, bigLora = 2 * 4096 * 8;
      add(6, '真實 LLM 規模比較', '若換成真實模型的 4096×4096 權重矩陣、取 rank=8，可訓練參數瞬間從 1,677 萬降到 6.5 萬！', [
        '4096² = ' + bigFull + ' → 2×4096×8 = ' + bigLora + '（僅 ' + LAB.pct(bigLora / bigFull, 2) + '）'
      ]);

      while (steps.length < 10) {
        add(6, 'LoRA 部署優勢', '推論時可以把 B·A 直接加回 W（W_new = W + BA），完全不增加任何推論延遲！', [
          '最終 MSE = ' + f(R.fin.loss, 4)
        ]);
      }
      return steps;
    },

    inputs(rows, p) {
      const R = runLoRA(rows, p);
      return { W: R.W, X: R.X, Y: R.Y, A0: R.A0, B0: R.B0 };
    },

    keys(steps, rows, p) {
      const R = runLoRA(rows, p);
      const k = { full_params: R.fullParams, lora_params: R.loraParams, final_loss: R.fin.loss };
      for (let i = 0; i < 4; i++) {
        for (let j = 0; j < 4; j++) k['dw_' + i + '_' + j] = R.dW[i][j];
      }
      for (let r = 0; r < R.rank; r++) {
        for (let j = 0; j < 4; j++) k['a_' + r + '_' + j] = R.A[r][j];
      }
      return k;
    },

    explain(steps, rows, p) {
      const R = runLoRA(rows, p);
      return [
        '凍結 4×4 原權重 W，以 rank = ' + R.rank + ' 的低秩旁路 ΔW = B·A 訓練 ' + p.epochs + ' 輪後，MSE 降至 ' + f(R.fin.loss, 4) + '。',
        '在真實 LLM（d = 4096, r = 8）中，LoRA 只需訓練約 0.39% 的參數即可完成領域微調。',
        '微調完成後還可將 B·A 合併回原權重，推論速度與原模型完全相同。'
      ];
    },

    aistudio: {
      operators: ['Execute Python'],
      params: [['rank', p => String(p.rank)], ['epochs', p => String(p.epochs)]],
      note: 'AI Studio 無原生 LLM LoRA 微調運算子；可對照 M7 生成式 AI 單元。',
      expect: (steps, rows, p) => {
        const R = runLoRA(rows, p);
        return ['參數數量：' + R.fullParams + ' → ' + R.loraParams + '，最終 MSE = ' + f(R.fin.loss, 4)];
      },
      python: `import numpy as np\n# 凍結 W，僅對 A (r×4) 與 B (4×r) 做梯度下降`,
      confirmed: false
    }
  });
})();
