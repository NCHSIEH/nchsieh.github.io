/* B2 正則化迴歸 Ridge／Lasso */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = LAB.data.columns('clinic', ['age', 'bmi', 'glu', 'sbp'], { sbp: 'y' });
  const FEATS = ['age', 'bmi', 'glu'];
  const FLAB = ['年齡', 'BMI', '空腹血糖'];
  const LAMBDAS = [0.01, 0.025, 0.06, 0.15, 0.4, 1, 2.5, 6, 15, 40, 100, 250];
  const pick = r => ({ id: r.id, age: r.age, bmi: r.bmi, glu: r.glu, sbp: r.sbp });

  function solve3x3(A, b) {
    const M3 = A.map((r, i) => r.slice().concat([b[i]]));
    for (let i = 0; i < 3; i++) {
      let piv = i;
      for (let r = i + 1; r < 3; r++) if (Math.abs(M3[r][i]) > Math.abs(M3[piv][i])) piv = r;
      const tmp = M3[i]; M3[i] = M3[piv]; M3[piv] = tmp;
      const div = M3[i][i] || 1e-12;
      for (let j = i; j < 4; j++) M3[i][j] /= div;
      for (let r = 0; r < 3; r++) {
        if (r === i) continue;
        const fac = M3[r][i];
        for (let j = i; j < 4; j++) M3[r][j] -= fac * M3[i][j];
      }
    }
    return [M3[0][3], M3[1][3], M3[2][3]];
  }

  function softThresh(z, g) {
    if (z > g) return z - g;
    if (z < -g) return z + g;
    return 0;
  }

  function fitAll(rows) {
    const n = rows.length;
    const ys = LAB.col(rows, 'sbp');
    const my = M.mean(ys);
    const yc = ys.map(y => y - my);
    const Z = rows.map(() => [0, 0, 0]);
    FEATS.forEach((ft, j) => {
      const xs = LAB.col(rows, ft), mx = M.mean(xs), sx = M.sd(xs) || 1;
      for (let i = 0; i < n; i++) Z[i][j] = (xs[i] - mx) / sx;
    });

    // Z^T Z and Z^T yc
    const ZtZ = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    const Zty = [0, 0, 0];
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < 3; j++) {
        Zty[j] += Z[i][j] * yc[i];
        for (let k = 0; k < 3; k++) ZtZ[j][k] += Z[i][j] * Z[i][k];
      }
    }

    const mseOf = w => {
      let s = 0;
      for (let i = 0; i < n; i++) {
        const err = w[0] * Z[i][0] + w[1] * Z[i][1] + w[2] * Z[i][2] - yc[i];
        s += err * err;
      }
      return s / n;
    };

    const ridgePath = LAMBDAS.map(lam => {
      const A = ZtZ.map((r, i) => r.map((v, j) => v + (i === j ? lam : 0)));
      const w = solve3x3(A, Zty);
      return { lam, logL: Math.log10(lam), w, mse: mseOf(w) };
    });

    // Lasso: 目標 (1/(2n))||yc - Z w||^2 + (lam/n)||w||_1，對應 sklearn Lasso(alpha = lam/n)
    const lassoPath = LAMBDAS.map(lam => {
      const w = [0, 0, 0];
      const alpha = lam / n;
      let sweep1 = null;
      for (let it = 0; it < 2000; it++) {
        const prev = w.slice();
        for (let j = 0; j < 3; j++) {
          let rho = 0;
          for (let i = 0; i < n; i++) {
            let predOther = 0;
            for (let k = 0; k < 3; k++) if (k !== j) predOther += Z[i][k] * w[k];
            rho += Z[i][j] * (yc[i] - predOther);
          }
          w[j] = softThresh(rho / n, alpha) / (ZtZ[j][j] / n);
        }
        if (it === 0) sweep1 = w.slice();
        if (Math.max(Math.abs(w[0] - prev[0]), Math.abs(w[1] - prev[1]), Math.abs(w[2] - prev[2])) < 1e-11) break;
      }
      return { lam, logL: Math.log10(lam), w, mse: mseOf(w), sweep1 };
    });

    return { n, my, ridgePath, lassoPath };
  }

  LAB.register({
    id: 'B2', group: 'B', title: '正則化迴歸 Ridge／Lasso',
    module: { name: 'M2-1 第 11 節', url: '../m2-1/#p11' },
    goal: '看懂懲罰係數 λ 變大時，Ridge 如何把三個係數平滑縮小，而 Lasso 如何透過軟閾值把不重要的係數直接壓成 0。',
    data: {
      name: 'clinic_reg',
      scenario: '門診健檢：用標準化後的年齡、BMI、空腹血糖預測中心化收縮壓，觀察係數收縮路徑',
      columns: COLS,
      editable: ['age', 'bmi', 'glu', 'sbp'],
      small: seed => LAB.data.clinic(seed, 14).map(pick)
    },
    params: [
      { key: 'method', label: '正則化方法', type: 'choice', value: 'ridge', options: [{ v: 'ridge', label: 'Ridge (L2)' }, { v: 'lasso', label: 'Lasso (L1)' }] },
      { key: 'lamIdx', label: 'λ 刻度 (12 格對數)', type: 'int', min: 0, max: 11, step: 1, value: 5 }
    ],
    pseudo: [
      '把年齡、BMI、血糖標準化，y 中心化',
      '設定 12 格對數刻度的 λ（小 → 大）',
      '對每一個 λ 求解係數：',
      '  Ridge：解 (XᵀX + λI)⁻¹ Xᵀy',
      '  Lasso：座標下降套用軟閾值',
      '觀察係數路徑圖與 MSE 變化',
      '找出 Lasso 下哪個係數最先歸零'
    ],
    build(rows, p) {
      const R = fitAll(rows), steps = [];
      const isLasso = p.method === 'lasso';
      const path = isLasso ? R.lassoPath : R.ridgePath;
      const curIdx = Math.max(0, Math.min(11, Math.round(p.lamIdx)));
      const allW = path.reduce((a, x) => a.concat(x.w), []);
      const yMin = Math.min(-5, Math.floor(M.min(allW) - 1));
      const yMax = Math.max(10, Math.ceil(M.max(allW) + 1));

      function views(st) {
        const sub = path.slice(0, st.upto);
        const series = [
          { id: 'zero', label: '0 線', pts: [[-2.1, 0], [2.5, 0]], cls: 'c5', dash: true, dots: false }
        ].concat([0, 1, 2].map(j => ({
          id: 'f' + j,
          label: FLAB[j],
          pts: sub.map(pt => [pt.logL, pt.w[j]]),
          cls: 'c' + j,
          dots: true
        })));
        const curPt = path[Math.min(st.cur, path.length - 1)];
        const main = {
          type: 'line', slot: 'main',
          title: (isLasso ? 'Lasso (L1)' : 'Ridge (L2)') + ' 係數路徑（x = log₁₀ λ）',
          axes: { x: { label: 'log₁₀(λ)', min: -2.1, max: 2.5 }, y: { label: '標準化係數', min: yMin, max: yMax } },
          series,
          marker: { x: curPt.logL, y: curPt.w[0], label: 'λ=' + curPt.lam }
        };
        const maxBar = Math.max(5, M.max(path[0].w.map(Math.abs)));
        const side = {
          type: 'bars', slot: 'side',
          title: '目前係數大小（λ = ' + curPt.lam + '）',
          max: maxBar, digits: 2,
          items: [0, 1, 2].map(j => {
            const isZero = Math.abs(curPt.w[j]) < 1e-6;
            return {
              id: 'b' + j,
              label: FLAB[j] + ' (' + f(curPt.w[j], 2) + (isZero ? ' 歸零' : '') + ')',
              value: Math.abs(curPt.w[j]),
              cls: isZero ? 'c5' : 'c' + j,
              hl: isLasso && isZero
            };
          })
        };
        const bottom = {
          type: 'table', slot: 'bottom',
          title: '各 λ 係數與訓練 MSE',
          cols: [
            { key: 'lam', label: 'λ', num: true, digits: 2 },
            { key: 'w0', label: '年齡', num: true, digits: 2 },
            { key: 'w1', label: 'BMI', num: true, digits: 2 },
            { key: 'w2', label: '血糖', num: true, digits: 2 },
            { key: 'mse', label: 'MSE', num: true, digits: 2 }
          ],
          rows: sub.slice(-6).map((pt, i) => ({
            id: 'l' + pt.lam,
            cells: [pt.lam, pt.w[0], pt.w[1], pt.w[2], pt.mse],
            hl: pt.lam === curPt.lam
          }))
        };
        return [main, side, bottom];
      }

      const st = { upto: 1, cur: 0 };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '題目', '用 14 位病人的年齡、BMI、血糖預測收縮壓。特徵先標準化、目標先減去平均，比較懲罰係數 λ 變大時係數怎麼縮。', [
        '目標 y 平均 = ' + f(R.my, 2) + ' mmHg；共 12 格 λ（0.01 ～ 250）'
      ]);

      for (let i = 0; i < path.length; i++) {
        st.upto = i + 1; st.cur = i;
        const pt = path[i];
        if (isLasso && i === curIdx) {
          add(5, 'Lasso 掃描 (λ=' + pt.lam + ')', '在 λ = ' + pt.lam + ' 做座標下降：第 1 輪掃描套用軟閾值 α = λ÷n = ' + f(pt.lam / R.n, 3) + '。', [
            '第 1 次掃描後：(' + pt.sweep1.map(v => f(v, 2)).join(', ') + ')',
            '收斂後係數：(' + pt.w.map(v => f(v, 2)).join(', ') + ')，MSE = ' + f(pt.mse, 2)
          ]);
        } else {
          add(isLasso ? 5 : 4, 'λ = ' + pt.lam, (isLasso ? 'Lasso' : 'Ridge') + ' 懲罰增強到 λ = ' + pt.lam + '，係數繼續往 0 收縮，訓練誤差略微上升。', [
            '係數 = (' + pt.w.map(v => f(v, 2)).join(', ') + ')',
            '訓練 MSE = ' + f(pt.mse, 2)
          ]);
        }
      }

      st.cur = curIdx;
      const sel = path[curIdx];
      const zeros = [0, 1, 2].filter(j => Math.abs(sel.w[j]) < 1e-6).map(j => FLAB[j]);
      add(7, '指定 λ 總結 (λ=' + sel.lam + ')', '回到你選定的 λ = ' + sel.lam + '。' + (isLasso ? (zeros.length ? '已有係數被壓為 0：' + zeros.join('、') : '目前尚未有係數歸零，再加大 λ 就會開始歸零。') : 'Ridge 會把係數縮得很小，但不會剛好變成 0。'), [
        '選定 λ = ' + sel.lam + '｜係數 = (' + sel.w.map(v => f(v, 2)).join(', ') + ')',
        '訓練 MSE = ' + f(sel.mse, 2)
      ]);
      return steps;
    },

    keys(steps, rows, p) {
      const R = fitAll(rows);
      const k = { mean_y: R.my };
      R.ridgePath.forEach((pt, i) => {
        k['ridge_' + i + '_w0'] = pt.w[0];
        k['ridge_' + i + '_w1'] = pt.w[1];
        k['ridge_' + i + '_w2'] = pt.w[2];
        k['ridge_' + i + '_mse'] = pt.mse;
      });
      R.lassoPath.forEach((pt, i) => {
        k['lasso_' + i + '_w0'] = pt.w[0];
        k['lasso_' + i + '_w1'] = pt.w[1];
        k['lasso_' + i + '_w2'] = pt.w[2];
        k['lasso_' + i + '_mse'] = pt.mse;
      });
      return k;
    },

    explain(steps, rows, p) {
      const R = fitAll(rows);
      const idx = Math.max(0, Math.min(11, Math.round(p.lamIdx)));
      const pt = (p.method === 'lasso' ? R.lassoPath : R.ridgePath)[idx];
      return [
        '在 λ = ' + pt.lam + ' 時，' + (p.method === 'lasso' ? 'Lasso (L1)' : 'Ridge (L2)') + ' 算出的三個標準化係數為年齡 ' + f(pt.w[0], 2) + '、BMI ' + f(pt.w[1], 2) + '、血糖 ' + f(pt.w[2], 2) + '，訓練 MSE = ' + f(pt.mse, 2) + '。',
        'Ridge 懲罰係數平方和，能穩定共線性並把係數平滑縮小；Lasso 懲罰絕對值和，會直接把弱特徵係數壓成 0（兼具特徵選擇）。',
        '注意：scikit-learn 的 Lasso 目標函式前面有 1/(2n)，因此本網站的 λ 對應 sklearn Lasso(alpha = λ/n)。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Set Role', 'Normalize', 'Linear Regression', 'Generalized Linear Model'],
      params: [
        ['Set Role › sbp', 'label'],
        ['Linear Regression › ridge', p => String(LAMBDAS[Math.round(p.lamIdx)])],
        ['Generalized Linear Model › alpha (1=Lasso)', '1']
      ],
      note: 'AI Studio 的 Linear Regression 內建 ridge 參數（L2）；要做 Lasso（L1）需改用 Generalized Linear Model（設 alpha=1 與 lambda）或 Execute Python。',
      expect: (steps, rows, p) => {
        const R = fitAll(rows);
        const pt = (p.method === 'lasso' ? R.lassoPath : R.ridgePath)[Math.round(p.lamIdx)];
        return ['λ = ' + pt.lam + ' 時係數：(' + pt.w.map(v => f(v, 2)).join(', ') + ')'];
      },
      python: `from sklearn.linear_model import Ridge, Lasso\nRidge(alpha=lam, fit_intercept=False).fit(Z, yc)\nLasso(alpha=lam/len(Z), fit_intercept=False).fit(Z, yc)`,
      confirmed: false
    }
  });
})();
