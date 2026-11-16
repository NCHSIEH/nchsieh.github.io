/* B9 梯度提升 GBDT */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = LAB.data.columns('clinic', ['bmi', 'sbp'], { sbp: 'y' });
  const AX = { x: { label: 'BMI (kg/m²)', min: 15, max: 40 }, y: { label: '收縮壓 (mmHg)', min: 90, max: 190 } };
  const pick = r => ({ id: r.id, bmi: r.bmi, sbp: r.sbp });

  function fitGBDT(rows, p) {
    const n = rows.length;
    const xs = LAB.col(rows, 'bmi'), ys = LAB.col(rows, 'sbp');
    const f0 = M.mean(ys);
    const T = Math.max(1, Math.min(8, Math.round(p.trees || 4)));
    const lr = p.lr || 0.3;

    let F = M.range(n, () => f0);
    const mse0 = M.mean(ys.map((y, i) => (y - F[i]) * (y - F[i])));
    const uniqX = Array.from(new Set(xs)).sort((a, b) => a - b);
    const mids = [];
    for (let i = 0; i < uniqX.length - 1; i++) mids.push((uniqX[i] + uniqX[i + 1]) / 2);

    const rounds = [];
    for (let t = 0; t < T; t++) {
      const res = ys.map((y, i) => y - F[i]);
      let best = null;
      const cands = [];
      mids.forEach(th => {
        const L = [], R = [];
        for (let i = 0; i < n; i++) (xs[i] <= th ? L : R).push(res[i]);
        const vL = M.mean(L), vR = M.mean(R);
        let sse = 0;
        L.forEach(v => { sse += (v - vL) * (v - vL); });
        R.forEach(v => { sse += (v - vR) * (v - vR); });
        cands.push({ th, vL, vR, sse });
        if (!best || sse < best.sse - 1e-12) best = { th, vL, vR, sse };
      });
      if (!best) best = { th: mids[0] || 25, vL: 0, vR: 0, sse: 0 };
      const Fnew = F.map((fv, i) => fv + lr * (xs[i] <= best.th ? best.vL : best.vR));
      const mse = M.mean(ys.map((y, i) => (y - Fnew[i]) * (y - Fnew[i])));
      rounds.push({ round: t + 1, resBefore: res, stump: best, cands, F: Fnew.slice(), mse });
      F = Fnew;
    }

    function predictX(x) {
      let v = f0;
      rounds.forEach(rd => { v += lr * (x <= rd.stump.th ? rd.stump.vL : rd.stump.vR); });
      return v;
    }

    return { f0, mse0, rounds, finalF: F, finalMse: rounds[rounds.length - 1].mse, predictX };
  }

  LAB.register({
    id: 'B9', group: 'B', title: '梯度提升 GBDT',
    module: { name: 'M4 第 06 節', url: '../m4/#p06' },
    goal: '看懂 GBDT 如何從平均值出發，每一輪用一棵淺決策樹去擬合上一輪剩下的殘差，讓階梯預測線逐步貼近資料。',
    data: {
      name: 'clinic_gbdt',
      scenario: '門診健檢：用 BMI 預測收縮壓，觀察多棵深度 1 樹樁如何接力修正殘差',
      columns: COLS,
      editable: ['bmi', 'sbp'],
      small: seed => LAB.data.clinic(seed, 12).map(pick)
    },
    params: [
      { key: 'trees', label: '樹的棵數 T', type: 'int', min: 1, max: 8, step: 1, value: 4 },
      { key: 'lr', label: '學習率 η', type: 'num', min: 0.1, max: 1, step: 0.1, value: 0.3 }
    ],
    pseudo: [
      '起始預測 F₀ = 全部 y 的平均值 ȳ',
      '重複 T 輪：',
      '  計算每筆殘差 rᵢ = yᵢ − F(xᵢ)',
      '  用深度 1 的樹樁擬合殘差 rᵢ',
      '  更新 F(x) ← F(x) + η · hₜ(x)',
      '檢查殘差與 MSE 下降趨勢'
    ],
    build(rows, p) {
      const R = fitGBDT(rows, p), steps = [];

      function stepLines(uptoRound) {
        const cuts = R.rounds.slice(0, uptoRound).map(rd => rd.stump.th).sort((a, b) => a - b);
        const xs = [AX.x.min].concat(cuts).concat([AX.x.max]);
        const evalF = x => {
          let v = R.f0;
          for (let t = 0; t < uptoRound; t++) {
            const st = R.rounds[t].stump;
            v += p.lr * (x <= st.th ? st.vL : st.vR);
          }
          return v;
        };
        const out = [];
        for (let i = 0; i < xs.length - 1; i++) {
          const mid = (xs[i] + xs[i + 1]) / 2;
          const yv = evalF(mid);
          out.push({ id: 'h' + i, x1: xs[i], y1: yv, x2: xs[i + 1], y2: yv, cls: 'c1', w: 2.5 });
          if (i < xs.length - 2) {
            const yNext = evalF((xs[i + 1] + xs[i + 2]) / 2);
            out.push({ id: 'v' + i, x1: xs[i + 1], y1: yv, x2: xs[i + 1], y2: yNext, cls: 'c1', dash: true, w: 1.5 });
          }
        }
        return out;
      }

      function views(st) {
        const points = rows.map(r => ({
          id: 'p' + r.id, x: r.bmi, y: r.sbp, cls: 'c0', label: String(r.id), r: 6
        }));
        const curF = st.upto === 0 ? rows.map(() => R.f0) : R.rounds[st.upto - 1].F;
        const resLines = st.showLine ? rows.map((r, i) => ({
          id: 'res' + r.id, x1: r.bmi, y1: r.sbp, x2: r.bmi, y2: curF[i], cls: 'c4', dash: true, w: 1.3
        })) : [];
        const main = {
          type: 'scatter', slot: 'main',
          title: 'BMI × 收縮壓與階梯預測線（已加 ' + st.upto + ' 棵樹）',
          axes: AX, points, lines: st.showLine ? resLines.concat(stepLines(st.upto)) : [], circles: [],
          legend: [{ cls: 'c0', label: '病人實際值' }, { cls: 'c1', shape: 'line', label: 'GBDT 階梯預測' }, { cls: 'c4', shape: 'line', label: '殘差' }]
        };
        const side = {
          type: 'table', slot: 'side',
          title: '每筆預測與殘差（第 ' + st.upto + ' 輪）',
          cols: [
            { key: 'id', label: '#' },
            { key: 'y', label: '實際 y', num: true, digits: 0 },
            { key: 'pred', label: '預測 F', num: true, digits: 1 },
            { key: 'res', label: '殘差', num: true, digits: 1 }
          ],
          rows: rows.map((r, i) => ({
            id: r.id,
            cells: [r.id, r.sbp, st.showLine ? curF[i] : null, st.showLine ? (r.sbp - curF[i]) : null]
          }))
        };
        const msePts = [[0, R.mse0]].concat(R.rounds.slice(0, st.upto).map(rd => [rd.round, rd.mse]));
        const curMse = st.upto === 0 ? R.mse0 : R.rounds[st.upto - 1].mse;
        const line = {
          type: 'line', slot: 'bottom',
          title: '訓練 MSE 變化',
          axes: { x: { label: '樹的棵數', min: 0, max: R.rounds.length }, y: { label: 'MSE', min: 0, max: Math.max(50, R.mse0 * 1.1) } },
          series: [{ id: 'mse', label: 'MSE', pts: msePts, cls: 'c1', dots: true }],
          marker: { x: st.upto, y: curMse, label: 'T=' + st.upto }
        };
        return [main, side, line];
      }

      const st = { upto: 0, showLine: false };
      const add = (line, title, say, calc, extra) => steps.push(Object.assign({ line, title, say, calc: calc || [], views: views(st), focus: [] }, extra));

      add(0, '題目', '12 位門診病人的 BMI 與收縮壓。GBDT 不用一棵大樹，而是讓 ' + R.rounds.length + ' 棵深度為 1 的小樹樁接力修補殘差。', [
        '目標收縮壓平均 ȳ = ' + f(R.f0, 2) + ' mmHg'
      ]);

      st.showLine = true;
      add(1, '起始預測 F₀ = ȳ', '第 0 步先對所有人都預測平均值 ' + f(R.f0, 2) + '，此時殘差就是每個人的實際值減去平均。', [
        'F₀ = ' + f(R.f0, 2) + '，起始 MSE = ' + f(R.mse0, 2)
      ]);

      R.rounds.forEach((rd, idx) => {
        if (idx < 2) {
          add(3, '第 ' + rd.round + ' 輪：算殘差', '算出每筆目前還差多少（rᵢ = yᵢ − F），下一棵樹不學 y，改學這個殘差。', [
            '1 號殘差 = ' + f(rd.resBefore[0], 2) + '，最大正殘差 = ' + f(M.max(rd.resBefore), 2)
          ], { phase: '第 ' + rd.round + ' 輪' });
          add(4, '第 ' + rd.round + ' 輪：找樹樁切點', '試切所有 BMI 中點，找出讓左右兩邊殘差平方誤差最小的切點。', [
            '切點：BMI ≤ ' + f(rd.stump.th, 2) + '（左葉 ' + f(rd.stump.vL, 2) + '、右葉 ' + f(rd.stump.vR, 2) + '）'
          ], { phase: '第 ' + rd.round + ' 輪' });
          st.upto = rd.round;
          add(5, '第 ' + rd.round + ' 輪：加上 η·h(x)', '把樹樁輸出乘上學習率 η = ' + f(p.lr, 1) + ' 加回預測線，階梯形狀多出一階、MSE 下降。', [
            '左調 ' + f(p.lr * rd.stump.vL, 2) + '、右調 ' + f(p.lr * rd.stump.vR, 2),
            'MSE = ' + f(rd.mse, 2)
          ], { phase: '第 ' + rd.round + ' 輪' });
        } else {
          st.upto = rd.round;
          add(5, '第 ' + rd.round + ' 輪樹樁加入', '以切點 BMI ≤ ' + f(rd.stump.th, 2) + ' 繼續修補殘差，MSE 降至 ' + f(rd.mse, 2) + '。', [
            '左葉 ' + f(rd.stump.vL, 2) + '、右葉 ' + f(rd.stump.vR, 2) + '｜MSE = ' + f(rd.mse, 2)
          ], { phase: rd.round + ' / ' + R.rounds.length });
        }
      });

      add(6, 'XGBoost 與 LGB', '真實專案常在 GBDT 上再加正則化（懲罰葉數與葉值大小）、二階梯度（牛頓法）與直方圖切點（免逐一排序），更快更穩。', [
        '最終訓練 MSE：從 ' + f(R.mse0, 2) + ' 降至 ' + f(R.finalMse, 2)
      ]);

      while (steps.length < 10) {
        add(6, '學習率與樹數的權衡', '學習率 η 越小，每一步修正越保守，需要較多棵樹才能收斂，但通常比較不容易過擬合。', [
          '目前 T = ' + R.rounds.length + ' 棵，η = ' + f(p.lr, 1)
        ]);
      }
      return steps;
    },

    keys(steps, rows, p) {
      const R = fitGBDT(rows, p);
      const k = { f0: R.f0, mse0: R.mse0, final_mse: R.finalMse };
      R.rounds.forEach((rd, i) => {
        k['r' + i + '_th'] = rd.stump.th;
        k['r' + i + '_vL'] = rd.stump.vL;
        k['r' + i + '_vR'] = rd.stump.vR;
        k['r' + i + '_mse'] = rd.mse;
      });
      R.finalF.forEach((v, i) => { k['pred_' + rows[i].id] = v; });
      return k;
    },

    explain(steps, rows, p) {
      const R = fitGBDT(rows, p);
      return [
        'GBDT 從常數預測 F₀ = ' + f(R.f0, 2) + ' 出發（初始 MSE = ' + f(R.mse0, 2) + '）。',
        '每輪用深度為 1 的樹樁擬合當前殘差，再以學習率 ' + f(p.lr, 1) + ' 累加，經過 ' + R.rounds.length + ' 輪後 MSE 降到 ' + f(R.finalMse, 2) + '。',
        '實務常用的 XGBoost 與 LightGBM 核心精神相同，但加入葉權重正則化、二階導數與直方圖加速。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Set Role', 'Gradient Boosted Trees'],
      params: [
        ['Set Role › sbp', 'label'],
        ['Gradient Boosted Trees › number of trees', p => String(p.trees)],
        ['Gradient Boosted Trees › maximal depth', '1'],
        ['Gradient Boosted Trees › learning rate', p => String(p.lr)]
      ],
      note: 'AI Studio 的 Gradient Boosted Trees 底層為 H2O 實作，預設可能啟用抽樣（sample rate）與提前停止；需關閉抽樣才會與 scikit-learn GradientBoostingRegressor 一致。',
      expect: (steps, rows, p) => {
        const R = fitGBDT(rows, p);
        return ['訓練 MSE = ' + f(R.finalMse, 2)];
      },
      python: `from sklearn.ensemble import GradientBoostingRegressor\ngbr = GradientBoostingRegressor(max_depth=1, learning_rate=0.3, n_estimators=4, loss='squared_error').fit(X, y)`,
      confirmed: false
    }
  });
})();
