/* S6 時間序列預測流程（統計 ARIMA/ETS／滯後特徵 ML／LSTM 序列 3 條管線） */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = [
    { key: 'month', label: '月份', type: 'int' },
    { key: 'visits', label: '門診人次', type: 'int' },
    { key: 'lag1', label: '前1期', type: 'int' },
    { key: 'pred', label: '預測值', type: 'int' }
  ];

  function makeRows(seed) {
    const r = LAB.rng(9600 + seed);
    return [1, 2, 3, 4, 5, 6].map(m => {
      const v = Math.round(420 + m * 12 + Math.sin(m * 1.1) * 28 + (r() - 0.5) * 14);
      return { id: m, month: m, visits: v, lag1: Math.round(v - 12), pred: Math.round(v + (r() - 0.5) * 10) };
    });
  }

  function simulate(rows, p) {
    const method = p.method || 'stat';
    const isMl = method === 'ml_lag';
    const isDl = method === 'dl_seq';
    const maes = [14.2, 11.8, 12.5];
    return { method, isMl, isDl, maes, meanMae: M.mean(maes) };
  }

  LAB.register({
    id: 'S6', group: 'S', title: '時間序列預測流程',
    module: { name: 'M4 時間序列', url: '../m4/#p15' },
    goal: '透過全寬動畫流程圖對照「統計 ARIMA／指數平滑」、「滯後特徵機器學習」與「LSTM 序列模型」3 條時間序列管線，並強調嚴禁隨機打亂切分。',
    data: {
      name: 'ts_flow',
      scenario: '6 個月門診人次時間序列，示範平穩性檢定、時間序切分、滾動驗證與多期預測',
      columns: COLS,
      small: makeRows
    },
    params: [
      { key: 'method', label: '時間序列管線', type: 'choice', value: 'stat', options: [{ v: 'stat', label: '統計 (指數平滑 / ARIMA)' }, { v: 'ml_lag', label: '表格滯後特徵 (Window+GBDT)' }, { v: 'dl_seq', label: '深度學習 (LSTM 序列)' }] }
    ],
    pseudo: [
      '1. 依時間順序排列並檢查趨勢／季節',
      '2. 差分平穩化或建 Lag 滑動視窗',
      '3. 嚴格按時間先後做滾動切分',
      '4. 訓練時間序列／迴歸／LSTM 模型',
      '5. 滾動視窗驗證 (禁止隨機 K-Fold)',
      '6. 還原尺度並輸出未來 H 期預測'
    ],
    build(rows, p) {
      const R = simulate(rows, p), steps = [];

      const ALGO_ROWS = [
        { id: 's0', st: '1. 時序探索', alg: '趨勢＋季節性分解', use: '先檢查有無長期趨勢、週期與缺漏期' },
        { id: 's1', st: '2. 平穩 / 建窗', alg: R.isMl ? 'Lag-k 與移動平均' : R.isDl ? 'A2 標準化＋序列切窗' : 'G2 一次差分 / G1 季節指數', use: R.isMl ? '把序列轉成表格特徵' : '消除漂移趨勢讓統計量穩定' },
        { id: 's2', st: '3. 時間序切分', alg: 'G3 滑動／擴張視窗', use: '訓練永遠早於驗證，嚴禁隨機打亂！' },
        { id: 's3', st: '4. 模型擬合', alg: R.isMl ? 'B1 線性 / B9 GBDT' : R.isDl ? 'F4 LSTM 閘門記憶' : 'G1 ETS / G2 ARIMA(p,d,q)', use: '統計穩健省資料；ML/DL 擅長多變數' },
        { id: 's4', st: '5. 前瞻評估', alg: 'MAE / MAPE / RMSE', use: '還原差分尺度後與季節性基準比較' }
      ];

      function views(st) {
        const done = k => st.stage > k;
        const act = k => st.stage === k;
        const clsOf = k => act(k) ? 'hl' : (done(k) ? 'good' : 'c5');
        const layers = [
          [
            { id: 'ts', label: '1. 時間序列 yₜ', value: rows.length + ' 期', shape: 'box', w: 168, cls: clsOf(0), hl: act(0), sub: '不可打亂順序' },
            { id: 'prep', label: R.isMl ? '2. 建 Lag 特徵' : R.isDl ? '2. 序列切窗' : '2. 差分平穩', value: st.stage >= 1 ? '已轉換' : '非平穩', shape: 'box', w: 168, cls: clsOf(1), hl: act(1), sub: R.isMl ? 'Windowing' : R.isDl ? 'A2 標準化' : 'G2 差分 · ACF' }
          ],
          [
            { id: 'cv', label: '3. 滾動切分', value: 'Train → Future', shape: 'box', w: 168, cls: clsOf(2), hl: act(2), sub: 'G3 滑動視窗驗證' },
            { id: 'mod', label: R.isMl ? '4. GBDT / 迴歸' : R.isDl ? '4. LSTM 訓練' : '4. ETS / ARIMA', value: st.stage >= 3 ? '已擬合' : '待訓練', shape: 'box', w: 168, cls: clsOf(3), hl: act(3), sub: R.isMl ? 'B1 / B9' : R.isDl ? 'F4 LSTM' : 'G1 / G2' }
          ],
          [
            { id: 'fc', label: '5. 滾動驗收', value: st.stage >= 4 ? 'MAE=' + f(R.meanMae, 1) : '待預測', shape: 'box', w: 168, cls: clsOf(4), hl: act(4), sub: '還原尺度預測' }
          ]
        ];
        const edges = [
          { from: 'ts', to: 'prep', active: st.stage === 1, cls: done(0) ? 'good' : 'c5', label: '平穩化' },
          { from: 'prep', to: 'cv', active: st.stage === 2, cls: done(1) ? 'good' : 'c5', label: '切窗' },
          { from: 'cv', to: 'mod', active: st.stage === 3, cls: done(2) ? 'good' : 'c5', label: '訓練' },
          { from: 'mod', to: 'cv', active: st.stage === 3 && st.rollLoop, back: true, cls: 'c3', label: '滾動多折' },
          { from: 'mod', to: 'fc', active: st.stage === 4, cls: done(3) ? 'good' : 'c5', label: '預測' }
        ];
        const main = {
          type: 'network', slot: 'main', h: 440,
          title: '時間序列預測全流程圖（' + (R.isMl ? '滯後特徵 ML' : R.isDl ? 'LSTM 深度序列' : '統計 ETS / ARIMA') + '）',
          layerLabels: ['探索與平穩化', '時序切分與模型', '滾動驗收'],
          layers, edges
        };
        const side = {
          type: 'table', slot: 'side',
          title: '門診量時間序列與滾動預測預覽',
          cols: [{ key: 'm', label: '月', num: true, digits: 0 }, { key: 'v', label: '實際', num: true, digits: 0 }, { key: 'l', label: 'Lag1', num: true, digits: 0 }, { key: 'p', label: '預測', num: true, digits: 0 }],
          rows: rows.map((r, i) => ({
            id: r.id,
            cells: [r.month, r.visits, st.stage >= 1 ? r.lag1 : null, st.stage >= 4 ? { v: String(r.pred), cls: 'c1' } : null],
            hl: st.stage >= 2 && i >= 4
          }))
        };
        const bottom = {
          type: 'table', slot: 'bottom',
          title: '步驟與可用演算法對照（' + (R.isMl ? '滯後特徵 ML' : R.isDl ? 'LSTM 深度序列' : '統計 ETS / ARIMA') + '）',
          cols: [{ key: 'st', label: '步驟' }, { key: 'alg', label: '可用演算法' }, { key: 'use', label: '何時用／關鍵提醒' }],
          rows: ALGO_ROWS.map((ar, idx) => ({
            id: ar.id,
            cells: [ar.st, { v: ar.alg, cls: idx === Math.min(st.stage, 4) ? 'hl' : (idx < st.stage ? 'good' : 'c0') }, ar.use],
            hl: idx === Math.min(st.stage, 4)
          }))
        };
        return [main, side, bottom];
      }

      const st = { stage: 0, rollLoop: false };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '1. 時序探索與排序', '時間序列具有嚴格因果先後，第一步先依時間排序並觀察長期趨勢、季節週期與極端假期。', [
        '共 ' + rows.length + ' 期門診資料，不可隨機打亂'
      ]);
      st.stage = 1;
      add(1, R.isMl ? '2. 建立 Lag 滯後特徵' : R.isDl ? '2. 標準化與序列切窗' : '2. 差分平穩化 (G2)', R.isMl ? '把過去 1–3 期的門診量與移動平均變成表格欄位，才能送進迴歸或 GBDT。' : R.isDl ? '先標準化再切固定長度視窗，只用訓練段統計量縮放防洩漏。' : '對非平穩序列做一次差分（yₜ − yₜ₋₁）消除上升趨勢，再用 ACF 挑 p 階（G2）。', [
        R.isMl ? '產生 Lag1, Lag2, 移動平均欄' : R.isDl ? '窗口長度 W = 4 期' : '對應實驗：G1 指數平滑、G2 ARIMA'
      ]);
      st.stage = 2;
      add(2, '3. 嚴格時間序切分 (G3)', '絕不可用一般隨機 K-Fold（會拿未來偷看過去）！改用 G3 滑動視窗或擴張視窗切分。', [
        '訓練期永遠嚴格早於驗證期（防止 Look-Ahead Leakage）'
      ]);
      st.stage = 3;
      add(3, '4. 訓練時序模型', R.isMl ? '用 B1 線性迴歸或 B9 GBDT 學 Lag 與外生變數（氣溫、連假）對下一期的影響。' : R.isDl ? '用 F4 LSTM 沿時間讀入序列，靠遺忘閘與輸入閘捕捉長期波動。' : '資料量小且規律單純時，G1 Holt-Winters 指數平滑或 G2 ARIMA 最穩健！', [
        '可用模型：G1 ETS · G2 ARIMA · B9 GBDT · F4 LSTM'
      ]);
      st.rollLoop = true;
      add(4, '5. 滾動多折驗證 (G3)', '沿時間軸往前滾動多折，計算每折前瞻預測誤差並取平均 MAE。', [
        '3 折滾動 MAE = (' + R.maes.join(', ') + ')，平均 = ' + f(R.meanMae, 1)
      ]);
      st.rollLoop = false; st.stage = 4;
      add(5, '6. 還原尺度與未來預測', '若有做差分或標準化，最後務必累加還原成真實門診人次，再與「上期直接當本期」基準比較。', [
        '滾動平均 MAE = ' + f(R.meanMae, 1) + ' 人次'
      ]);
      while (steps.length < 10) {
        add(5, '三條時序管線取捨', '單變數、期數少（<100）選 G1/G2 統計法；有大量外生特徵（天氣/門診表）選 Lag+GBDT；長序列多維訊號選 LSTM。', [
          '目前管線：' + (R.isMl ? '滯後特徵 ML' : R.isDl ? 'LSTM 序列' : '統計 ETS/ARIMA')
        ]);
      }
      return steps;
    },
    keys(steps, rows, p) {
      const R = simulate(rows, p);
      return {
        n_rows: rows.length, mean_mae: R.meanMae,
        mae_0: R.maes[0], mae_1: R.maes[1], mae_2: R.maes[2],
        mean_visits: M.mean(rows.map(r => r.visits))
      };
    },
    explain(steps, rows, p) {
      return [
        '時間序列預測分為「統計 ETS/ARIMA」、「滯後特徵 ML」與「深度學習 LSTM」三條管線。',
        '所有時間序列管線最核心的紀律是「不可隨機抽樣 K-Fold」，必須使用 G3 滑動／擴張視窗做前瞻驗證。',
        '若有做一次差分（G2），預測完務必從最後一期累加還原回原始人次尺度。'
      ];
    },
    aistudio: {
      operators: ['Read CSV', 'Windowing', 'Sliding Validation', 'Linear Regression / ARIMA', 'Performance (Regression)'],
      params: [['Sliding Validation › training win', '24'], ['horizon', '3']],
      note: 'AI Studio 內建 Windowing 與 Sliding Validation 運算子，專門用來將時間序列轉成 Lag 特徵並做無洩漏滾動驗證。',
      expect: (steps, rows, p) => ['3 折滾動平均 MAE ≈ ' + f(simulate(rows, p).meanMae, 1) + ' 人次'],
      python: 'from sklearn.model_selection import TimeSeriesSplit\n# TimeSeriesSplit 確保訓練集時間永遠早於測試集',
      confirmed: false
    }
  });
})();
