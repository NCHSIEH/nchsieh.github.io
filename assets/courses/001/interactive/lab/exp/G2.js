/* G2 ARIMA */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = LAB.data.columns('opd', ['t', 'month', 'visits']);
  const pick = r => ({ id: r.id, t: r.t, month: r.month, visits: r.visits });

  function solveOLS(X, y) {
    const m = X[0].length;
    const XtX = M.range(m, i => M.range(m, j => M.sum(X.map(r => r[i] * r[j]))));
    const Xty = M.range(m, i => M.sum(X.map((r, k) => r[i] * y[k])));
    const A = XtX.map((r, i) => r.slice().concat([Xty[i]]));
    for (let i = 0; i < m; i++) {
      let piv = i;
      for (let r = i + 1; r < m; r++) if (Math.abs(A[r][i]) > Math.abs(A[piv][i])) piv = r;
      const tmp = A[i]; A[i] = A[piv]; A[piv] = tmp;
      const div = A[i][i] || 1e-12;
      for (let j = i; j < m + 1; j++) A[i][j] /= div;
      for (let r = 0; r < m; r++) {
        if (r === i) continue;
        const fac = A[r][i];
        for (let j = i; j < m + 1; j++) A[r][j] -= fac * A[i][j];
      }
    }
    return A.map(r => r[m]);
  }

  function runARIMA(rows, p) {
    const y = LAB.col(rows, 'visits');
    const n = y.length;
    const d = Math.round(p.d || 0);
    const arP = Math.max(1, Math.min(2, Math.round(p.p || 1)));
    const H = Math.max(1, Math.min(12, Math.round(p.horizon || 6)));

    const diff1 = [];
    for (let t = 1; t < n; t++) diff1.push(y[t] - y[t - 1]);
    const series = d === 1 ? diff1 : y.slice();

    // ACF (nlags = 6)
    const meanS = M.mean(series);
    const denom = M.sum(series.map(v => (v - meanS) * (v - meanS))) || 1;
    const acf = [];
    for (let k = 1; k <= 6; k++) {
      let num = 0;
      for (let t = k; t < series.length; t++) num += (series[t] - meanS) * (series[t - k] - meanS);
      acf.push(num / denom);
    }

    // AR(p) with intercept via OLS (matches statsmodels AutoReg(lags=p, trend='c'))
    const X = [], yt = [];
    for (let t = arP; t < series.length; t++) {
      const row = [1];
      for (let k = 1; k <= arP; k++) row.push(series[t - k]);
      X.push(row);
      yt.push(series[t]);
    }
    const coefs = solveOLS(X, yt); // [c, phi1, (phi2)]

    // Forecast on series
    const buf = series.slice();
    const fcSeries = [];
    for (let h = 0; h < H; h++) {
      let nextV = coefs[0];
      for (let k = 1; k <= arP; k++) nextV += coefs[k] * buf[buf.length - k];
      buf.push(nextV);
      fcSeries.push(nextV);
    }

    // Inverse difference if d === 1
    const fcOrig = [];
    let prevY = y[n - 1];
    for (let h = 0; h < H; h++) {
      if (d === 1) { prevY += fcSeries[h]; fcOrig.push(prevY); }
      else fcOrig.push(fcSeries[h]);
    }

    return { y, n, d, arP, H, diff1, series, acf, coefs, fcSeries, fcOrig };
  }

  LAB.register({
    id: 'G2', group: 'G', title: 'ARIMA',
    module: { name: 'M4 第 15 節', url: '../m4/#p15' },
    goal: '看懂 ARIMA 如何先用差分（d）消除趨勢變平穩、用自相關 ACF 找滯後關聯，再用前 p 期做 AR(p) 迴歸並累加回原尺度預測。',
    data: {
      name: 'opd_arima',
      scenario: '月門診量：36 個月門診人次，示範 ARIMA(p, d, 0) 的差分、ACF 與條件最小平方 AR 估計',
      columns: COLS,
      small: seed => LAB.data.opd(seed, 24).map(pick),
      large: seed => LAB.data.opd(seed, 36).map(pick),
      view: rows => ({
        type: 'line', title: '36 個月門診人次',
        series: [{ id: 'v', label: '門診人次', pts: rows.map(r => [r.t, r.visits]), cls: 'c0', dots: false }]
      })
    },
    params: [
      { key: 'd', label: '差分階數 d', type: 'int', min: 0, max: 1, step: 1, value: 1 },
      { key: 'p', label: '自迴歸階數 p', type: 'int', min: 1, max: 2, step: 1, value: 2 },
      { key: 'horizon', label: '預測期數', type: 'int', min: 1, max: 12, step: 1, value: 6 }
    ],
    pseudo: [
      '觀察原序列是否有趨勢',
      '若 d=1，相鄰兩期相減做一次差分',
      '計算滯後 1–6 階的自相關 ACF',
      '把前 p 期當特徵，用 OLS 解 AR(p)',
      '遞迴預測未來 H 期的差分值',
      '若 d=1，從最後一期累加回原尺度'
    ],
    build(rows, p) {
      const R = runARIMA(rows, p), steps = [];

      function views(st) {
        const showDiff = st.showDiff && R.d === 1;
        const pts = showDiff
          ? R.diff1.map((v, i) => [i + 2, v])
          : R.y.map((v, i) => [i + 1, v]);
        const series = [{ id: 's', label: showDiff ? '一次差分 Δy' : '門診人次', pts, cls: 'c0', dots: false }];
        if (st.showFc) {
          const fcPts = (showDiff ? R.fcSeries : R.fcOrig).map((v, i) => [R.n + i + 1, v]);
          series.push({ id: 'fc', label: '預測', pts: fcPts, cls: 'c1', dash: true, dots: true });
        }
        const allY = pts.map(x => x[1]).concat(st.showFc ? (showDiff ? R.fcSeries : R.fcOrig) : []);
        const main = {
          type: 'line', slot: 'main',
          title: showDiff ? '一次差分序列 Δyₜ = yₜ − yₜ₋₁' : '月門診量與 ARIMA(' + R.arP + ',' + R.d + ',0) 預測',
          axes: { x: { label: '期數 (月)', min: 1, max: R.n + R.H }, y: { label: showDiff ? '月增減量' : '門診人次', min: Math.floor(M.min(allY) * 0.95), max: Math.ceil(M.max(allY) * 1.05) } },
          series
        };
        const side = {
          type: 'bars', slot: 'side',
          title: '自相關係數 ACF（滯後 1–6 階）',
          max: 1, digits: 3,
          items: R.acf.map((v, idx) => ({
            id: 'lag' + (idx + 1),
            label: 'Lag ' + (idx + 1),
            value: st.showAcf ? v : 0,
            cls: idx < R.arP ? 'c1' : 'c0'
          }))
        };
        const bottom = {
          type: 'table', slot: 'bottom',
          title: 'AR(' + R.arP + ') 係數與未來預測',
          cols: [
            { key: 'h', label: '預測期', num: true, digits: 0 },
            { key: 'dval', label: R.d === 1 ? '預測差分 Δy' : '預測值', num: true, digits: 1 },
            { key: 'orig', label: '原尺度預測', num: true, digits: 0 }
          ],
          rows: st.showFc ? R.fcOrig.map((v, h) => ({
            id: 'h' + h,
            cells: [R.n + h + 1, R.fcSeries[h], v]
          })) : []
        };
        return [main, side, bottom];
      }

      const st = { showDiff: false, showAcf: false, showFc: false };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '題目', '對 36 個月門診人次建立 ARIMA(' + R.arP + ', ' + R.d + ', 0) 模型（註：AR 係數以最小平方法估計，套件預設 ARIMA 用最大概似法會略有差異）。', [
        '起始最後一期（第 36 月）= ' + R.y[R.n - 1] + ' 人次'
      ]);

      add(1, '檢視序列平穩性', '原序列呈現明顯上升趨勢與季節擺盪，平均值隨時間漂移（非平穩）。', [
        '第 1 月 = ' + R.y[0] + '，第 36 月 = ' + R.y[R.n - 1]
      ]);

      if (R.d === 1) {
        st.showDiff = true;
        add(2, '一次差分 Δyₜ', '用本期減去前一期，把上升趨勢消掉，序列變成在零附近震盪的「月增減量」。', [
          't=2：' + R.y[1] + ' − ' + R.y[0] + ' = ' + R.diff1[0],
          't=3：' + R.y[2] + ' − ' + R.y[1] + ' = ' + R.diff1[1]
        ]);
        add(2, '完成全部 35 期差分', '差分後序列平均 = ' + f(M.mean(R.diff1), 1) + '，趨勢已大致消除。', [
          'Δy 平均 = ' + f(M.mean(R.diff1), 2) + '，標準差 = ' + f(M.sd(R.diff1), 1)
        ]);
      } else {
        add(2, '不差分 (d = 0)', '目前設定 d = 0，直接對原序列進行自迴歸建模。', [
          '序列平均 = ' + f(M.mean(R.y), 1)
        ]);
      }

      st.showAcf = true;
      add(3, '計算自相關係數 ACF', '算序列與自己滯後 k 期的相關性。Lag 1 = ' + f(R.acf[0], 3) + ' 代表本月與上月有明顯關聯。', [
        'ACF(1..3) = (' + R.acf.slice(0, 3).map(v => f(v, 3)).join(', ') + ')'
      ]);

      add(4, 'OLS 估計 AR(' + R.arP + ') 係數', '把前 ' + R.arP + ' 期當自變數、當期當應變數解最小平方迴歸（與 statsmodels AutoReg 一致）。', [
        '截距 c = ' + f(R.coefs[0], 2),
        'AR 係數 φ = (' + R.coefs.slice(1).map(v => f(v, 3)).join(', ') + ')'
      ]);

      st.showFc = true;
      add(5, '遞迴預測差分值', '把前幾期代入 AR(' + R.arP + ') 算出第 37 月預測，再拿它當輸入推算第 38 月…。', [
        '未來 ' + R.H + ' 期差分預測：' + R.fcSeries.slice(0, 3).map(v => f(v, 1)).join(', ') + '…'
      ]);

      st.showDiff = false;
      add(6, '累加回原尺度預測', R.d === 1 ? '從第 36 月實際人次出發，把每期預測的增減量逐期累加回去。' : '直接輸出未來 ' + R.H + ' 個月的預測人次。', [
        '第 37 月預測 = ' + f(R.fcOrig[0], 0) + '，第 ' + (36 + R.H) + ' 月預測 = ' + f(R.fcOrig[R.H - 1], 0)
      ]);

      while (steps.length < 10) {
        add(6, 'ARIMA vs 指數平滑', '指數平滑著重把序列拆成水準、趨勢、季節加權平均；ARIMA 則直接對差分後的自相關結構建模。', [
          '模型：ARIMA(' + R.arP + ', ' + R.d + ', 0)（OLS）'
        ]);
      }
      return steps;
    },

    keys(steps, rows, p) {
      const R = runARIMA(rows, p);
      const k = { ar_c: R.coefs[0] };
      for (let i = 1; i <= R.arP; i++) k['ar_phi_' + i] = R.coefs[i];
      for (let i = 0; i < 6; i++) k['acf_' + (i + 1)] = R.acf[i];
      for (let i = 0; i < 4; i++) k['diff_' + i] = R.diff1[i];
      R.fcOrig.forEach((v, h) => { k['fc_' + h] = v; });
      return k;
    },

    explain(steps, rows, p) {
      const R = runARIMA(rows, p);
      return [
        '對 36 個月門診量做 d = ' + R.d + ' 階差分後，滯後 1 階自相關 ACF(1) = ' + f(R.acf[0], 3) + '。',
        '以條件最小平方法估計 AR(' + R.arP + ') 得截距 ' + f(R.coefs[0], 2) + '、係數 (' + R.coefs.slice(1).map(v => f(v, 3)).join(', ') + ')。',
        '注意：本實驗使用條件最小平方法（等同 statsmodels AutoReg），與套件 ARIMA 預設的最大概似法（MLE）數值會略有差異。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'ARIMA'],
      params: [
        ['ARIMA › p / d / q', p => p.p + ' / ' + p.d + ' / 0']
      ],
      note: 'AI Studio 的 ARIMA 採用最大概似法估計；本實驗為了能逐步列出迴歸式，採用條件最小平方法（OLS）並與 statsmodels AutoReg 對齊。',
      expect: (steps, rows, p) => {
        const R = runARIMA(rows, p);
        return ['第 37 月預測 = ' + f(R.fcOrig[0], 0) + ' 人次'];
      },
      python: `from statsmodels.tsa.ar_model import AutoReg\nres = AutoReg(series, lags=2, trend='c').fit()`,
      confirmed: false
    }
  });
})();
