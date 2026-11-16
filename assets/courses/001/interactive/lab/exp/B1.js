/* B1 線性迴歸 */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = LAB.data.columns('clinic', ['bmi', 'sbp'], { sbp: 'y' });
  const AX = { x: { label: 'BMI (kg/m²)', min: 15, max: 40 }, y: { label: '收縮壓 (mmHg)', min: 90, max: 190 } };
  const pick = r => ({ id: r.id, bmi: r.bmi, sbp: r.sbp });

  function makeRows(seed) {
    const r = LAB.rng(2100 + seed);
    const base = LAB.data.clinic(seed, 12).map(pick);
    return base.map(o => ({
      id: o.id,
      bmi: o.bmi,
      sbp: Math.round(68 + 2.25 * o.bmi + (r() - 0.5) * 14)
    }));
  }

  function solve(rows, p) {
    const xs = LAB.col(rows, 'bmi'), ys = LAB.col(rows, 'sbp'), n = rows.length;
    const mx = M.mean(xs), sx = M.sd(xs) || 1, my = M.mean(ys);
    const zs = xs.map(x => (x - mx) / sx);
    const sxx = M.sum(xs.map(x => (x - mx) * (x - mx)));
    const sxy = M.sum(xs.map((x, i) => (x - mx) * (ys[i] - my)));
    const wRaw = sxx > 0 ? sxy / sxx : 0;
    const bRaw = my - wRaw * mx;
    const wStar = wRaw * sx;
    const bStar = my;

    const mseFn = (w, b) => M.mean(zs.map((z, i) => { const e = w * z + b - ys[i]; return e * e; }));
    const r2Fn = (w, b) => {
      const sse = M.sum(zs.map((z, i) => { const e = w * z + b - ys[i]; return e * e; }));
      const sst = M.sum(ys.map(y => (y - my) * (y - my)));
      return sst > 0 ? 1 - sse / sst : 0;
    };

    const epochs = Math.max(20, Math.round(p.epochs || 60));
    const lr = p.lr || 0.1;
    let w = 0, b = 0;
    const hist = [{ epoch: 0, w, b, mse: mseFn(w, b), gw: 0, gb: 0 }];
    for (let ep = 1; ep <= epochs; ep++) {
      let gw = 0, gb = 0;
      for (let i = 0; i < n; i++) {
        const err = w * zs[i] + b - ys[i];
        gw += (2 / n) * err * zs[i];
        gb += (2 / n) * err;
      }
      w -= lr * gw;
      b -= lr * gb;
      hist.push({ epoch: ep, w, b, mse: mseFn(w, b), gw, gb });
    }
    const last = hist[hist.length - 1];
    return {
      mx, sx, my, zs, ys, sxx, sxy,
      wRaw, bRaw, wStar, bStar,
      olsMse: mseFn(wStar, bStar), olsR2: r2Fn(wStar, bStar),
      hist, gdW: last.w, gdB: last.b, gdMse: last.mse, gdR2: r2Fn(last.w, last.b),
      mseFn
    };
  }

  LAB.register({
    id: 'B1', group: 'B', title: '線性迴歸',
    module: { name: 'M2-1 第 03 節', url: '../m2-1/#p03' },
    goal: '看懂最小平方法如何一次算出最佳直線，並對照梯度下降如何一步步走下損失曲面、逼近同一組解。',
    data: {
      name: 'clinic',
      scenario: '門診健檢：用 BMI 預測收縮壓，比較最小平方法直接解與梯度下降',
      columns: COLS,
      editable: ['bmi', 'sbp'],
      small: makeRows
    },
    params: [
      { key: 'method', label: '求解方式', type: 'choice', value: 'gd', options: [{ v: 'ols', label: '最小平方法直接解' }, { v: 'gd', label: '梯度下降' }] },
      { key: 'lr', label: '學習率 η', type: 'num', min: 0.01, max: 0.5, step: 0.01, value: 0.1 },
      { key: 'epochs', label: '迭代次數', type: 'int', min: 20, max: 200, step: 10, value: 60 }
    ],
    pseudo: [
      '把特徵 BMI 標準化成 z',
      '方法一（最小平方法直接解）：',
      '  算 x̄、ȳ、Sxx、Sxy',
      '  直接求斜率 w* 與截距 b*',
      '方法二（梯度下降）：',
      '  從 (w, b) = (0, 0) 出發',
      '  重複算 MSE 對 w, b 的梯度',
      '  依學習率更新 (w, b)',
      '比較兩種解的係數與 R²'
    ],
    build(rows, p) {
      const R = solve(rows, p), steps = [];
      const wMin = Math.min(-10, R.wStar - 15), wMax = Math.max(25, R.wStar + 15);
      const bMin = 0, bMax = Math.max(160, R.bStar + 30);
      const lossGrid = LAB.grid((w, b) => Math.log10(1 + R.mseFn(w, b)), wMin, wMax, bMin, bMax, 24, 24);

      function views(st) {
        const points = rows.map(r => ({
          id: 'p' + r.id, x: r.bmi, y: r.sbp, cls: 'c0', label: String(r.id), r: 6
        }));
        const yAt = x => st.w * ((x - R.mx) / R.sx) + st.b;
        const lines = [];
        if (st.showLine) {
          lines.push({ id: 'reg', x1: AX.x.min, y1: yAt(AX.x.min), x2: AX.x.max, y2: yAt(AX.x.max), cls: 'c1', w: 2.5, label: '迴歸線' });
        }
        if (st.showRes) {
          rows.forEach(r => {
            lines.push({ id: 'res' + r.id, x1: r.bmi, y1: r.sbp, x2: r.bmi, y2: yAt(r.bmi), cls: 'c4', dash: true, w: 1.5 });
          });
        }
        const main = {
          type: 'scatter', slot: 'main',
          title: 'BMI × 收縮壓與迴歸線',
          axes: AX, points, lines, circles: [],
          legend: [{ cls: 'c0', label: '病人' }, { cls: 'c1', label: '迴歸線' }, { cls: 'c4', shape: 'line', label: '殘差' }]
        };
        const side = {
          type: 'surface', slot: 'side',
          title: '損失曲面 log(1+MSE) 與軌跡',
          grid: lossGrid,
          x: { label: 'w (標準化斜率)' },
          y: { label: 'b (截距)' },
          path: st.path,
          label: st.surfLabel,
          target: { x: R.wStar, y: R.bStar }
        };
        const line = {
          type: 'line', slot: 'bottom',
          title: 'MSE 隨步數變化',
          axes: { x: { label: '步數 / Epoch', min: 0, max: R.hist.length - 1 }, y: { label: 'MSE', min: 0, max: Math.max(100, R.hist[0].mse * 1.05) } },
          series: [{ id: 'mse', label: 'MSE', pts: st.msePts, cls: 'c1', dots: false }],
          marker: st.marker
        };
        return [main, side, line];
      }

      const st = {
        showLine: false, showRes: false,
        w: 0, b: 0,
        path: [{ x: 0, y: 0 }],
        surfLabel: '起點 (0, 0)',
        msePts: [[0, R.hist[0].mse]],
        marker: { x: 0, y: R.hist[0].mse, label: '起點' }
      };
      const add = (line, title, say, calc, extra) => steps.push(Object.assign({ line, title, say, calc: calc || [], views: views(st), focus: [] }, extra));

      add(0, '題目', '給定 12 位病人的 BMI 與收縮壓，要找一條直線 ŷ = w·z + b 來預測收縮壓。最小平方法能一次解出，梯度下降則一步步逼近。', [
        'BMI 平均 x̄ = ' + f(R.mx, 2) + '，標準差 = ' + f(R.sx, 2),
        '收縮壓平均 ȳ = ' + f(R.my, 2)
      ]);

      if (p.method === 'ols') {
        add(3, '計算 Sxx 與 Sxy', '先算 BMI 的離均差平方和 Sxx，以及 BMI 與收縮壓的乘積和 Sxy。', [
          'Sxx = Σ(x − x̄)² = ' + f(R.sxx, 2),
          'Sxy = Σ(x − x̄)(y − ȳ) = ' + f(R.sxy, 2)
        ]);
        st.showLine = true; st.w = R.wStar; st.b = R.bStar;
        st.path = [{ x: R.wStar, y: R.bStar }];
        st.surfLabel = '直接解 (w*, b*)';
        add(4, '算出原始斜率與截距', '直接解斜率 w_raw = Sxy ÷ Sxx，截距 b_raw = ȳ − w_raw·x̄。', [
          'w_raw = ' + f(R.sxy, 2) + ' ÷ ' + f(R.sxx, 2) + ' = ' + f(R.wRaw, 3),
          'b_raw = ' + f(R.my, 2) + ' − ' + f(R.wRaw, 3) + '×' + f(R.mx, 2) + ' = ' + f(R.bRaw, 2)
        ]);
        add(4, '對應到標準化座標', '若先把 BMI 標準化成 z，則直接解為 w* = ' + f(R.wStar, 2) + '、b* = ȳ = ' + f(R.bStar, 2) + '。', [
          'w* = w_raw × s_x = ' + f(R.wStar, 3),
          'b* = ȳ = ' + f(R.bStar, 2)
        ]);
        st.showRes = true;
        const e0 = rows[0].sbp - (R.wStar * R.zs[0] + R.bStar);
        add(4, '畫出殘差與 MSE', '紅虛線是每個點到迴歸線的垂直誤差（殘差）。直接解使所有殘差平方和最小。', [
          '例：1 號殘差 = ' + f(e0, 2),
          '最小 MSE = ' + f(R.olsMse, 2)
        ]);
        for (let t = 1; t <= 4; t++) {
          const ep = Math.round(t * (R.hist.length - 1) / 4);
          const h = R.hist[ep];
          st.msePts = R.hist.slice(0, ep + 1).map(x => [x.epoch, x.mse]);
          st.marker = { x: h.epoch, y: h.mse, label: 'GD 第 ' + ep + ' 輪' };
          add(7, '對照梯度下降（第 ' + ep + ' 輪）', '如果改用梯度下降從 (0,0) 出發，第 ' + ep + ' 輪會走到這裡。', [
            'GD (w, b) = (' + f(h.w, 2) + ', ' + f(h.b, 2) + ')，MSE = ' + f(h.mse, 2)
          ]);
        }
      } else {
        st.showLine = true; st.showRes = true;
        add(6, '初始化 (w,b)=(0,0)', '梯度下降從斜率 0、截距 0 開始（直線貼在 y = 0），此時殘差很大。', [
          '起始 MSE = ' + f(R.hist[0].mse, 2)
        ]);
        for (let ep = 1; ep <= 3; ep++) {
          const h = R.hist[ep];
          st.w = h.w; st.b = h.b;
          st.path = R.hist.slice(0, ep + 1).map(x => ({ x: x.w, y: x.b }));
          st.surfLabel = '第 ' + ep + ' 步';
          st.msePts = R.hist.slice(0, ep + 1).map(x => [x.epoch, x.mse]);
          st.marker = { x: ep, y: h.mse, label: '第 ' + ep + ' 步' };
          add(7, '第 ' + ep + ' 步更新', '計算 MSE 對 w 與 b 的偏微分（梯度），往下降方向跨出 η = ' + f(p.lr, 2) + ' 的一步。', [
            '梯度 (∂w, ∂b) = (' + f(h.gw, 2) + ', ' + f(h.gb, 2) + ')',
            '更新後 (w, b) = (' + f(h.w, 2) + ', ' + f(h.b, 2) + ')，MSE = ' + f(h.mse, 2)
          ], { phase: '第 ' + ep + ' 輪' });
        }
        const epochs = R.hist.length - 1;
        const marks = [];
        const stepCount = 8;
        for (let k = 1; k <= stepCount; k++) {
          const ep = Math.max(4, Math.round(4 + (epochs - 4) * k / stepCount));
          if (!marks.includes(ep)) marks.push(ep);
        }
        marks.forEach((ep, idx) => {
          const h = R.hist[ep];
          st.w = h.w; st.b = h.b;
          st.path = R.hist.slice(0, ep + 1).map(x => ({ x: x.w, y: x.b }));
          st.surfLabel = '第 ' + ep + ' 輪';
          st.msePts = R.hist.slice(0, ep + 1).map(x => [x.epoch, x.mse]);
          st.marker = { x: ep, y: h.mse, label: '第 ' + ep + ' 輪' };
          add(8, '迭代至第 ' + ep + ' 輪', idx === 0 ? '之後每 ' + Math.max(1, Math.round((epochs - 3) / stepCount)) + ' 輪顯示一步，觀察直線轉向並貼近資料點。' : '繼續沿負梯度往谷底（★ 直接解）移動，MSE 持續下降。', [
            '(w, b) = (' + f(h.w, 2) + ', ' + f(h.b, 2) + ')，MSE = ' + f(h.mse, 2)
          ], { phase: ep + ' / ' + epochs });
        });
      }

      add(9, '比較直接解與 R²', '比較梯度下降最終位置與最小平方法直接解，並計算解釋變異量 R²。', [
        '直接解 (w*, b*) = (' + f(R.wStar, 2) + ', ' + f(R.bStar, 2) + ')，R² = ' + f(R.olsR2, 3),
        'GD 最終 (w, b) = (' + f(R.gdW, 2) + ', ' + f(R.gdB, 2) + ')，R² = ' + f(R.gdR2, 3)
      ]);
      return steps;
    },

    keys(steps, rows, p) {
      const R = solve(rows, p);
      return {
        mean_bmi: R.mx, sd_bmi: R.sx, mean_sbp: R.my,
        Sxx: R.sxx, Sxy: R.sxy,
        ols_w_raw: R.wRaw, ols_b_raw: R.bRaw,
        ols_w_std: R.wStar, ols_b_std: R.bStar, ols_r2: R.olsR2,
        gd1_w: R.hist[1].w, gd1_b: R.hist[1].b, gd1_mse: R.hist[1].mse,
        gd2_w: R.hist[2].w, gd2_b: R.hist[2].b, gd2_mse: R.hist[2].mse,
        gd3_w: R.hist[3].w, gd3_b: R.hist[3].b, gd3_mse: R.hist[3].mse,
        gd_w: R.gdW, gd_b: R.gdB, gd_mse: R.gdMse, gd_r2: R.gdR2
      };
    },

    explain(steps, rows, p) {
      const R = solve(rows, p);
      return [
        '最小平方法直接解出 BMI（標準化後）的斜率 w* = ' + f(R.wStar, 2) + '、截距 b* = ' + f(R.bStar, 2) + '，對應原始尺度為 ŷ = ' + f(R.wRaw, 2) + '·BMI + ' + f(R.bRaw, 2) + '。',
        '模型的 R² 為 ' + f(R.olsR2, 3) + '，代表 BMI 能解釋收縮壓約 ' + f(R.olsR2 * 100, 1) + '% 的變異。',
        '以學習率 ' + f(p.lr, 2) + ' 跑 ' + p.epochs + ' 輪梯度下降後，走到 (w, b) = (' + f(R.gdW, 2) + ', ' + f(R.gdB, 2) + ')，MSE = ' + f(R.gdMse, 2) + '（最小理論 MSE = ' + f(R.olsMse, 2) + '）。',
        '特徵先標準化能讓損失曲面更圓滑、梯度下降更容易收斂；否則截距與斜率尺度差太多會走得很慢。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Set Role', 'Linear Regression'],
      params: [
        ['Set Role › sbp', 'label'],
        ['Linear Regression › feature selection', 'none'],
        ['Linear Regression › ridge', '0']
      ],
      note: 'AI Studio 的 Linear Regression 預設會開啟特徵選擇（M5 prime）與 ridge = 1e-8；需將 feature selection 設為 none、ridge 設為 0，係數才會與最小平方法完全一致。',
      expect: (steps, rows, p) => {
        const R = solve(rows, p);
        return [
          'BMI 係數（原始尺度）= ' + f(R.wRaw, 3) + '，截距 = ' + f(R.bRaw, 2),
          'R² = ' + f(R.olsR2, 3)
        ];
      },
      python: `from sklearn.linear_model import LinearRegression\nreg = LinearRegression().fit(X, y)\nprint(reg.coef_[0], reg.intercept_, reg.score(X, y))`,
      confirmed: false
    }
  });
})();
