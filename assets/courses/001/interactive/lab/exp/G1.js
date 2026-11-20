/* G1 指數平滑 */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = LAB.data.columns('opd', ['t', 'month', 'visits']);
  const pick = r => ({ id: r.id, t: r.t, month: r.month, visits: r.visits });

  function runES(rows, p) {
    const y = LAB.col(rows, 'visits');
    const n = y.length;
    const alpha = p.alpha || 0.3;
    const beta = p.beta || 0.2;
    const gamma = p.gamma || 0.2;
    const H = Math.max(1, Math.min(12, Math.round(p.horizon || 6)));
    const method = p.method || 'hw';

    const l0 = method === 'hw' ? M.mean(y.slice(0, 12)) : y[0];
    const b0 = method === 'hw'
      ? (n >= 24 ? (M.mean(y.slice(12, 24)) - M.mean(y.slice(0, 12))) / 12 : (y[Math.min(12, n - 1)] - y[0]) / 12)
      : (method === 'holt' ? y[1] - y[0] : 0);
    const s0 = method === 'hw' ? y.slice(0, 12).map(v => v - l0) : M.range(12, () => 0);

    let lv = l0, tr = b0;
    const sn = s0.slice();
    const fitted = [], levels = [], trends = [], seasons = [];

    for (let t = 0; t < n; t++) {
      const m = t % 12;
      const sPrev = sn[m];
      if (method === 'ses') {
        fitted.push(lv);
        lv = alpha * y[t] + (1 - alpha) * lv;
        levels.push(lv); trends.push(0); seasons.push(0);
      } else if (method === 'holt') {
        fitted.push(lv + tr);
        const lvNew = alpha * y[t] + (1 - alpha) * (lv + tr);
        tr = beta * (lvNew - lv) + (1 - beta) * tr;
        lv = lvNew;
        levels.push(lv); trends.push(tr); seasons.push(0);
      } else {
        fitted.push(lv + tr + sPrev);
        const lvNew = alpha * (y[t] - sPrev) + (1 - alpha) * (lv + tr);
        const trNew = beta * (lvNew - lv) + (1 - beta) * tr;
        const sNew = gamma * (y[t] - lv - tr) + (1 - gamma) * sPrev;
        lv = lvNew; tr = trNew; sn[m] = sNew;
        levels.push(lv); trends.push(tr); seasons.push(sNew);
      }
    }

    const fc = [];
    for (let h = 1; h <= H; h++) {
      const sVal = method === 'hw' ? sn[(n - 1 + h) % 12] : 0;
      fc.push(lv + (method === 'ses' ? 0 : h * tr) + sVal);
    }

    const errs = y.map((v, t) => Math.abs(v - fitted[t]));
    const mae = M.mean(errs);
    const mape = M.mean(y.map((v, t) => Math.abs(v - fitted[t]) / (Math.abs(v) || 1))) * 100;

    return { y, n, H, method, l0, b0, s0, sn, fitted, levels, trends, seasons, fc, mae, mape };
  }

  LAB.register({
    id: 'G1', group: 'G', title: '指數平滑',
    module: { name: 'M4 第 15 節', url: '../m4/#p15' },
    goal: '看懂簡單指數平滑、Holt（加趨勢）與 Holt-Winters（加季節）如何逐期更新水準、趨勢與 12 個月季節指數來預測未來門診量。',
    data: {
      name: 'opd_es',
      scenario: '月門診量：24–36 個月門診人次（具上升趨勢與 12 個月季節波動），預測未來幾個月',
      columns: COLS,
      small: seed => LAB.data.opd(seed, 24).map(pick),
      large: seed => LAB.data.opd(seed, 36).map(pick),
      view: rows => ({
        type: 'line', title: rows.length + ' 個月門診人次',
        series: [{ id: 'v', label: '門診人次', pts: rows.map(r => [r.t, r.visits]), cls: 'c0', dots: false }]
      })
    },
    params: [
      { key: 'method', label: '平滑方法', type: 'choice', value: 'hw', options: [{ v: 'ses', label: '簡單 (SES)' }, { v: 'holt', label: 'Holt (趨勢)' }, { v: 'hw', label: 'Holt-Winters' }] },
      { key: 'alpha', label: '水準平滑 α', type: 'num', min: 0.05, max: 0.95, step: 0.05, value: 0.3 },
      { key: 'beta', label: '趨勢平滑 β', type: 'num', min: 0.05, max: 0.95, step: 0.05, value: 0.2 },
      { key: 'gamma', label: '季節平滑 γ', type: 'num', min: 0.05, max: 0.95, step: 0.05, value: 0.2 },
      { key: 'horizon', label: '預測期數', type: 'int', min: 1, max: 12, step: 1, value: 6 }
    ],
    pseudo: [
      '設定初始水準 ℓ₀、趨勢 b₀ 與季節 s₀',
      '逐期 t = 1…N 更新：',
      '  產出一步預測 ŷₜ',
      '  水準 ℓₜ = α·去季節 + (1−α)前值',
      '  趨勢 bₜ = β(ℓₜ−ℓₜ₋₁) + (1−β)bₜ₋₁',
      '  季節 sₜ = γ·殘差 + (1−γ)sₜ₋₁₂',
      '往後推算未來 H 期預測與 MAE'
    ],
    build(rows, p) {
      const R = runES(rows, p), steps = [];
      const allV = R.y.concat(R.fc);
      const yMin = Math.floor(M.min(allV) * 0.9), yMax = Math.ceil(M.max(allV) * 1.1);

      function views(st) {
        const series = [{ id: 'act', label: '實際人次', pts: R.y.map((v, i) => [i + 1, v]), cls: 'c0', dots: false }];
        if (st.upto > 0) {
          series.push({ id: 'fit', label: '平滑擬合', pts: R.fitted.slice(0, st.upto).map((v, i) => [i + 1, v]), cls: 'c1', dots: false });
        }
        if (st.showFc) {
          series.push({ id: 'fc', label: '未來預測', pts: R.fc.map((v, i) => [R.n + i + 1, v]), cls: 'c2', dash: true, dots: true });
        }
        const main = {
          type: 'line', slot: 'main',
          title: '月門診量與指數平滑預測（' + R.method.toUpperCase() + '）',
          axes: { x: { label: '期數 (月)', min: 1, max: R.n + R.H }, y: { label: '門診人次', min: yMin, max: yMax } },
          series,
          marker: st.upto > 0 ? { x: st.upto, y: R.y[st.upto - 1], label: '第 ' + st.upto + ' 月' } : null
        };
        const startT = Math.max(0, st.upto - 8);
        const side = {
          type: 'table', slot: 'side',
          title: '各期水準、趨勢、季節與預測',
          cols: [
            { key: 't', label: '月', num: true, digits: 0 },
            { key: 'y', label: '實際', num: true, digits: 0 },
            { key: 'fit', label: '預測', num: true, digits: 0 },
            { key: 'lv', label: '水準 ℓ', num: true, digits: 0 },
            { key: 'tr', label: '趨勢 b', num: true, digits: 1 }
          ],
          rows: R.y.slice(startT, Math.max(8, st.upto)).map((v, idx) => {
            const t = startT + idx;
            return {
              id: t + 1,
              cells: [t + 1, v, t < st.upto ? R.fitted[t] : null, t < st.upto ? R.levels[t] : null, t < st.upto ? R.trends[t] : null],
              hl: t === st.upto - 1
            };
          })
        };
        const bars = {
          type: 'bars', slot: 'bottom',
          title: R.method === 'hw' ? '12 個月季節指數（相對於水準的增減人次）' : '12 個月季節指數（' + R.method.toUpperCase() + ' 不含季節項）',
          digits: 0,
          items: M.range(12, m => ({
            id: 'm' + m, label: (m + 1) + '月',
            value: R.method === 'hw' ? R.sn[m] : 0,
            cls: R.sn[m] >= 0 ? 'c1' : 'c0'
          }))
        };
        return [main, side, bars];
      }

      const st = { upto: 0, showFc: false };
      const add = (line, title, say, calc, extra) => steps.push(Object.assign({ line, title, say, calc: calc || [], views: views(st), focus: [] }, extra));

      add(0, '題目', R.n + ' 個月門診人次有長期成長趨勢與每年固定淡旺季。用 ' + (R.method === 'ses' ? '簡單指數平滑' : R.method === 'holt' ? 'Holt 雙參數' : 'Holt-Winters 三參數') + ' 預測未來 ' + R.H + ' 個月。', [
        'α = ' + f(p.alpha, 2) + (R.method !== 'ses' ? '，β = ' + f(p.beta, 2) : '') + (R.method === 'hw' ? '，γ = ' + f(p.gamma, 2) : '')
      ]);

      add(1, '設定初始狀態', R.method === 'hw' ? 'Holt-Winters 用第 1 年平均當起始水準 ℓ₀，前兩年平均差÷12 當起始趨勢 b₀，第 1 年各月偏差當季節指數 s₀。' : '以第 1 期觀測值作為起始水準 ℓ₀。', [
        '起始 ℓ₀ = ' + f(R.l0, 1) + (R.method !== 'ses' ? '，起始 b₀ = ' + f(R.b0, 2) : '')
      ]);

      for (let t = 1; t <= 4; t++) {
        st.upto = t;
        add(4, '第 ' + t + ' 期更新', '比較實際值 ' + R.y[t - 1] + ' 與預測值 ' + f(R.fitted[t - 1], 1) + '，依 α = ' + f(p.alpha, 2) + ' 拉動水準。', [
          'ℓ' + t + ' = ' + f(R.levels[t - 1], 1) + (R.method !== 'ses' ? '，b' + t + ' = ' + f(R.trends[t - 1], 2) : '')
        ], { phase: 't = ' + t });
      }

      [12, 18, R.n].forEach(t => {
        st.upto = t;
        add(6, '推進到第 ' + t + ' 個月', '平滑線逐步貼合門診量走勢，季節指數也在每年同月重複修正。', [
          '第 ' + t + ' 月：實際 ' + R.y[t - 1] + '｜預測 ' + f(R.fitted[t - 1], 1) + '｜水準 ' + f(R.levels[t - 1], 1)
        ], { phase: t + ' / ' + R.n });
      });

      st.showFc = true;
      add(7, '預測未來 ' + R.H + ' 個月', '從第 ' + R.n + ' 月的最終水準與趨勢出發，加上對應月份的季節指數，往後推出未來 ' + R.H + ' 期預測。', [
        '第 ' + (R.n + 1) + ' 月預測 = ' + f(R.fc[0], 0) + '，第 ' + (R.n + R.H) + ' 月預測 = ' + f(R.fc[R.H - 1], 0)
      ]);

      add(7, '訓練期誤差 MAE / MAPE', '計算 ' + R.n + ' 個月一步預測的 MAE 與 MAPE。若季節震幅隨趨勢等比例放大改用乘法季節；長距外推宜加阻尼趨勢 (Damped)。', [
        'MAE = ' + f(R.mae, 1) + ' 人次，MAPE = ' + f(R.mape, 2) + '%'
      ]);
      return steps;
    },

    keys(steps, rows, p) {
      const R = runES(rows, p);
      const k = {
        mae: R.mae, mape: R.mape,
        last_level: R.levels[R.n - 1],
        last_trend: R.trends[R.n - 1]
      };
      for (let t = 0; t < 4; t++) {
        k['fit_' + t] = R.fitted[t];
        k['lv_' + t] = R.levels[t];
      }
      R.fc.forEach((v, h) => { k['fc_' + h] = v; });
      return k;
    },

    explain(steps, rows, p) {
      const R = runES(rows, p);
      return [
        '使用 ' + (R.method === 'ses' ? '簡單指數平滑' : R.method === 'holt' ? 'Holt 線性趨勢法' : 'Holt-Winters 加法季節法') + ' 擬合 ' + R.n + ' 個月門診量，訓練期 MAE = ' + f(R.mae, 1) + ' 人次（MAPE = ' + f(R.mape, 2) + '%）。',
        '簡單法預測是水平線；Holt 能外推線性趨勢；Holt-Winters 同時捕捉趨勢與 12 個月淡旺季。',
        '未來 ' + R.H + ' 個月預測範圍為 ' + f(M.min(R.fc), 0) + ' ～ ' + f(M.max(R.fc), 0) + ' 人次。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Holt-Winters'],
      params: [
        ['alpha / beta / gamma', p => f(p.alpha, 2) + ' / ' + f(p.beta, 2) + ' / ' + f(p.gamma, 2)]
      ],
      note: 'AI Studio 的 Time Series 擴充提供 Holt-Winters 運算子；不同實作的起始值設定（known vs estimated）會造成前幾期數值差異。',
      expect: (steps, rows, p) => {
        const R = runES(rows, p);
        return ['訓練期 MAE = ' + f(R.mae, 1) + '，第 ' + (R.n + 1) + ' 月預測 = ' + f(R.fc[0], 0)];
      },
      python: `from statsmodels.tsa.holtwinters import ExponentialSmoothing\n# 以 initialization_method='known' 固定起始值對照`,
      confirmed: false
    }
  });
})();
