/* G4 季節趨勢分解 STL 與 Lag 機器學習 */
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

  function runSTL(rows, p) {
    const y = LAB.col(rows, 'visits');
    const n = y.length;
    const maWin = Math.max(3, Math.min(7, Math.round(p.ma_win || 5)));
    const half = Math.floor(maWin / 2);
    const useSeason = p.use_season !== false;

    // 1. 中心移動平均萃取平滑趨勢 T_t
    const trend = y.map((_, t) => {
      const lo = Math.max(0, t - half), hi = Math.min(n - 1, t + half);
      return M.mean(y.slice(lo, hi + 1));
    });

    // 2. 去趨勢殘差 y_t - T_t，對同月份 (m = t % 12) 求平均得季節項 S_t（並做零均值中心化）
    const detrend = y.map((v, t) => v - trend[t]);
    const rawSeason12 = M.range(12, m => {
      const vals = [];
      for (let t = m; t < n; t += 12) vals.push(detrend[t]);
      return vals.length ? M.mean(vals) : 0;
    });
    const sMean = M.mean(rawSeason12);
    const season12 = rawSeason12.map(v => v - sMean);
    const season = y.map((_, t) => season12[t % 12]);

    // 3. 剩餘雜訊項 R_t = y_t - T_t - S_t
    const resid = y.map((v, t) => v - trend[t] - season[t]);
    const residSd = M.sd(resid) || 1;
    const maxAbsZ = M.max(resid.map(r => Math.abs(r) / residSd));
    const anomalyIdx = M.argmax(resid.map(r => Math.abs(r)));

    // 4. 滑動視窗特徵工程 (Windowing): 用 [1, lag_1, lag_2, (season_t)] 預測 y_t (t = 2..n-1)
    const X = [], yt = [], lagRows = [];
    for (let t = 2; t < n; t++) {
      const feat = useSeason ? [1, y[t - 1], y[t - 2], season[t]] : [1, y[t - 1], y[t - 2]];
      X.push(feat);
      yt.push(y[t]);
      lagRows.push({
        t: t + 1,
        lag1: y[t - 1],
        lag2: y[t - 2],
        s: season[t],
        y: y[t]
      });
    }
    const coefs = solveOLS(X, yt);
    const preds = X.map(row => M.sum(row.map((v, j) => v * coefs[j])));
    const mae = M.mean(yt.map((v, i) => Math.abs(v - preds[i])));

    // 預測下一期 t = n + 1
    const nextSeason = season12[n % 12];
    const nextFeat = useSeason ? [1, y[n - 1], y[n - 2], nextSeason] : [1, y[n - 1], y[n - 2]];
    const nextPred = M.sum(nextFeat.map((v, j) => v * coefs[j]));

    return {
      y, n, maWin, useSeason,
      trend, season12, season, resid, residSd, maxAbsZ, anomalyIdx,
      lagRows, coefs, preds, mae, nextPred
    };
  }

  LAB.register({
    id: 'G4', group: 'G', title: '季節分解 STL 與滯後特徵工程',
    module: { name: 'M4 第 15 節', url: '../m4/#p15' },
    goal: '看懂加法時間序列分解如何將門診量拆解為「趨勢 Trend + 季節 Seasonality + 殘差 Remainder」，並學會用 Windowing 將過去期數轉成 Lag-1、Lag-2 表格特徵交給機器學習迴歸預測。',
    data: {
      name: 'opd_stl',
      scenario: '24 個月門診人次：執行 STL 季節趨勢分解，並轉換為監督式學習滯後特徵表 (Lag Features)',
      columns: COLS,
      small: seed => LAB.data.opd(seed, 24).map(pick)
    },
    params: [
      { key: 'ma_win', label: '趨勢平滑窗長', type: 'int', min: 3, max: 7, step: 2, value: 5 },
      { key: 'use_season', label: '加入季節特徵', type: 'bool', value: true }
    ],
    pseudo: [
      '以移動平均萃取平滑長期趨勢 Tₜ',
      '算去趨勢項並按月份平均得季節 Sₜ',
      '扣除趨勢與季節得殘差雜訊 Rₜ',
      'Windowing：建立 Lag-1 與 Lag-2',
      '以最小平方迴歸擬合滯後特徵表',
      '評估擬合誤差 MAE 並推算下一期'
    ],
    build(rows, p) {
      const R = runSTL(rows, p), steps = [];
      const yMin = Math.floor(M.min(R.y) * 0.9), yMax = Math.ceil(M.max(R.y) * 1.08);

      function views(st) {
        const series = [
          { id: 'y', label: '實際門診 yₜ', pts: R.y.map((v, i) => [i + 1, v]), cls: 'c0', dots: false }
        ];
        if (st.stage >= 1) {
          series.push({ id: 'tr', label: '長期趨勢 Tₜ', pts: R.trend.map((v, i) => [i + 1, v]), cls: 'c1', dots: false });
        }
        if (st.stage >= 2) {
          series.push({ id: 'ts', label: '趨勢+季節 Tₜ+Sₜ', pts: R.trend.map((v, i) => [i + 1, v + R.season[i]]), cls: 'c3', dash: true, dots: false });
        }
        if (st.stage >= 5) {
          series.push({ id: 'ml', label: 'Lag-ML 預測', pts: R.preds.map((v, i) => [i + 3, v]), cls: 'good', dots: true });
        }
        const main = {
          type: 'line', slot: 'main',
          title: st.stage >= 5 ? '滯後特徵機器學習擬合（MAE = ' + f(R.mae, 1) + ' 人次）' : '時間序列加法分解 yₜ = Tₜ + Sₜ + Rₜ',
          axes: { x: { label: '月份 t', min: 1, max: R.n + 1 }, y: { label: '門診人次', min: yMin, max: yMax } },
          series
        };

        const side = {
          type: 'table', slot: 'side',
          title: st.stage >= 4 ? 'Windowing 監督式滯後特徵表' : '序列三成分拆解明細',
          cols: st.stage >= 4 ? [
            { key: 't', label: '月t', num: true, digits: 0 },
            { key: 'l1', label: 'Lag-1', num: true, digits: 0 },
            { key: 'l2', label: 'Lag-2', num: true, digits: 0 },
            { key: 's', label: '季節Sₜ', num: true, digits: 0 },
            { key: 'y', label: '目標yₜ', num: true, digits: 0 }
          ] : [
            { key: 't', label: '月t', num: true, digits: 0 },
            { key: 'y', label: '原值yₜ', num: true, digits: 0 },
            { key: 'tr', label: '趨勢Tₜ', num: true, digits: 0 },
            { key: 's', label: '季節Sₜ', num: true, digits: 0 },
            { key: 'r', label: '殘差Rₜ', num: true, digits: 0 }
          ],
          rows: st.stage >= 4
            ? R.lagRows.slice(0, 8).map((lr, idx) => ({
                id: 'l' + lr.t,
                cells: [lr.t, lr.lag1, lr.lag2, lr.s, { v: String(lr.y), cls: 'good' }],
                hl: idx === 0
              }))
            : R.y.slice(0, 8).map((v, t) => ({
                id: 'd' + t,
                cells: [
                  t + 1,
                  v,
                  st.stage >= 1 ? R.trend[t] : 0,
                  st.stage >= 2 ? R.season[t] : 0,
                  st.stage >= 3 ? R.resid[t] : 0
                ],
                hl: st.stage === 3 && t === R.anomalyIdx
              }))
        };

        const topResid = R.resid.map((r, i) => ({ i, r, abs: Math.abs(r) })).sort((a, b) => b.abs - a.abs).slice(0, 8);
        const bottom = {
          type: 'bars', slot: 'bottom',
          title: st.stage === 3
            ? '殘差絕對值 Top-8 月份（超過 ±2σ 可抓出突發疫情／連假異常月）'
            : '12 個月季節效應 Sₘ（冬季 12–1 月正高峰、2 月農曆年低谷）',
          digits: 0,
          items: st.stage === 3
            ? topResid.map(o => ({
                id: 'r' + o.i, label: 't=' + (o.i + 1), value: o.abs,
                cls: o.i === R.anomalyIdx ? 'bad' : 'c0', hl: o.i === R.anomalyIdx
              }))
            : R.season12.map((s, m) => ({
                id: 'm' + m, label: (m + 1) + '月', value: Math.abs(s),
                cls: s >= 0 ? 'c1' : 'c0'
              }))
        };

        return [main, side, bottom];
      }

      const st = { stage: 0 };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '加法分解概念', '任何具有週期規律的醫療序列，都可以拆解為三個獨立成分相加：原始值 yₜ = 趨勢 Tₜ + 季節 Sₜ + 殘差 Rₜ。', [
        '共 ' + R.n + ' 個月門診量，移動平均窗長 = ' + R.maWin + ' 個月'
      ]);

      st.stage = 1;
      add(1, '1. 萃取長期趨勢 Tₜ', '用 ' + R.maWin + ' 個月滑動平均濾掉短期高低起伏，浮現平滑上升的長期趨勢線（橙線）。', [
        '第 1 月趨勢 T₁ = ' + f(R.trend[0], 0) + ' → 第 ' + R.n + ' 月趨勢 T₂₄ = ' + f(R.trend[R.n - 1], 0)
      ]);

      st.stage = 2;
      add(2, '2. 萃取季節周期 Sₜ', '將原序列減去趨勢（yₜ − Tₜ），把每年相同月份平均並中心化，得到 12 個月固定淡旺季效應！', [
        '1 月旺季效應 = +' + f(R.season12[0], 0) + ' 人次｜2 月過年低谷 = ' + f(R.season12[1], 0) + ' 人次'
      ]);

      st.stage = 3;
      add(3, '3. 殘差 Rₜ 與時序異常', '把趨勢跟季節都扣掉後，剩下的 Rₜ = yₜ − Tₜ − Sₜ 就是隨機波動；若某月 |Rₜ| 特別大，就代表發生突發異常（如流感爆發）！', [
        '殘差標準差 σ_R = ' + f(R.residSd, 1) + '｜最大殘差在第 ' + (R.anomalyIdx + 1) + ' 月（' + f(R.resid[R.anomalyIdx], 0) + ' 人次）'
      ]);

      st.stage = 4;
      add(4, '4. 建立 Lag 特徵表', '一般機器學習（如 B1 線性迴歸、B9 GBDT）看不懂時間軸怎麼辦？把「上個月 yₜ₋₁ (Lag-1)」與「上上月 yₜ₋₂ (Lag-2)」直接搬成表格的 X 欄位！', [
        't=3 特徵列：Lag-1 = ' + R.lagRows[0].lag1 + ', Lag-2 = ' + R.lagRows[0].lag2 + ', 目標 y₃ = ' + R.lagRows[0].y
      ]);

      add(4, '加入季節外生特徵', R.useSeason
        ? '除了 Lag-1、Lag-2，再把剛剛分解出的「當月季節指數 Sₜ」也放進表格當第 3 個特徵，讓迴歸模型預知下個月是淡季還旺季！'
        : '目前設定不加入季節特徵，僅靠 Lag-1 與 Lag-2 預測（可切換上方開關比較 MAE 差距）。', [
        '特徵數 = ' + (R.useSeason ? '3 欄 (Lag-1, Lag-2, Season)' : '2 欄 (Lag-1, Lag-2)')
      ]);

      st.stage = 5;
      add(5, '5. 擬合 Lag 迴歸模型', '對這張 22 筆的滯後特徵表直接解 OLS 線性迴歸，綠線立即精準貼合門診量曲線！', [
        '迴歸係數：c=' + f(R.coefs[0], 1) + ', w₁(Lag1)=' + f(R.coefs[1], 2) + ', w₂(Lag2)=' + f(R.coefs[2], 2) + (R.useSeason ? ', w₃(S)=' + f(R.coefs[3], 2) : ''),
        '擬合 MAE = ' + f(R.mae, 1) + ' 人次'
      ]);

      add(6, '6. 推算第 25 月預測', '把第 24 月（Lag-1）、第 23 月（Lag-2）與第 25 月季節指數代入迴歸式，算出下一期預測值。', [
        '第 25 月預測 = ' + f(R.nextPred, 0) + ' 人次'
      ]);

      add(6, '比較有無季節特徵', '切換上方「加入季節特徵」開關，比較兩種設定的擬合 MAE（目前' + (R.useSeason ? '有' : '沒有') + '季節項）；季節項主要幫助模型預測固定月份的高峰與低谷。', [
        '目前 MAE = ' + f(R.mae, 2) + ' 人次'
      ]);

      add(6, '時序轉監督式學習總結', '透過 STL 看懂趨勢／季節／異常並用 Windowing 建 Lag 表格交給 GBDT。切記：實務不可先對全序列做 STL 再切分，須在 G3 訓練窗內分解防洩漏！', [
        '下一期預測 = ' + f(R.nextPred, 0) + ' 人次'
      ]);

      return steps;
    },

    keys(steps, rows, p) {
      const R = runSTL(rows, p);
      return {
        trend_0: R.trend[0],
        trend_last: R.trend[R.n - 1],
        season_0: R.season12[0],
        season_1: R.season12[1],
        resid_sd: R.residSd,
        mae: R.mae,
        next_pred: R.nextPred
      };
    },

    explain(steps, rows, p) {
      const R = runSTL(rows, p);
      return [
        '透過 ' + R.maWin + ' 期移動平均與同月去趨勢平均，將 24 個月門診量拆解為長期趨勢 Tₜ、12 個月季節指數 Sₜ（1 月 +' + f(R.season12[0], 0) + '、2 月 ' + f(R.season12[1], 0) + '）與殘差 Rₜ（標準差 ' + f(R.residSd, 1) + '）。',
        '利用 Windowing 建立 Lag-1、Lag-2' + (R.useSeason ? ' 與季節項' : '') + ' 的監督式表格後，OLS 線性迴歸擬合 MAE 為 ' + f(R.mae, 1) + ' 人次，第 25 月預測為 ' + f(R.nextPred, 0) + ' 人次。',
        '這正是實務競賽與醫療預測最常用的「Lag 特徵工程 + 表格機器學習」標準手法（對照 S6 第 2 條管線）。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'STL Decomposition', 'Windowing', 'Linear Regression'],
      params: [
        ['Windowing › lag width', '2'],
        ['Windowing › create label', 'true (horizon = 1)']
      ],
      note: 'AI Studio 的 Time Series 擴充同時內建 STL Decomposition（季節分解）與 Windowing（將時間序列切窗轉成 Lag-0, Lag-1 表格欄位），後面可直接串接任何 B 群迴歸模型。',
      expect: (steps, rows, p) => {
        const R = runSTL(rows, p);
        return ['Lag 迴歸 MAE = ' + f(R.mae, 1) + ' 人次，第 25 月預測 = ' + f(R.nextPred, 0)];
      },
      python: 'from statsmodels.tsa.seasonal import seasonal_decompose\nres = seasonal_decompose(y, model="additive", period=12)\n# 再以 df["y"].shift(1), df["y"].shift(2) 建立 Lag 特徵',
      confirmed: false
    }
  });
})();
