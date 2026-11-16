/* G3 時間序列滑動視窗驗證 */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = LAB.data.columns('opd', ['t', 'visits'], { visits: 'y' });

  function runSW(rows, p) {
    const y = rows.map(r => r.visits);
    const n = y.length;
    const win = Math.max(4, Math.min(12, Math.round(p.win || 8)));
    const hor = Math.max(1, Math.min(4, Math.round(p.horizon || 2)));
    const mode = p.mode || 'sliding';

    const folds = [];
    for (let end = win; end + hor <= n; end += hor) {
      const start = mode === 'expanding' ? 0 : end - win;
      const tr = y.slice(start, end);
      const va = y.slice(end, end + hor);

      // 以訓練視窗做線性趨勢 y = a + b*t 來外推預測未來 hor 期
      const m = tr.length;
      const mx = (m - 1) / 2;
      const my = M.mean(tr);
      let sxx = 0, sxy = 0;
      for (let i = 0; i < m; i++) {
        sxx += (i - mx) ** 2;
        sxy += (i - mx) * (tr[i] - my);
      }
      const slope = sxx > 0 ? sxy / sxx : 0;
      const intercept = my - slope * mx;
      const preds = va.map((_, h) => intercept + slope * (m + h));
      const mae = M.mean(va.map((v, h) => Math.abs(v - preds[h])));
      folds.push({ fold: folds.length + 1, start, end, trLen: m, va, preds, mae });
    }

    const meanMae = M.mean(folds.map(fl => fl.mae));
    return { y, n, win, hor, mode, folds, meanMae };
  }

  LAB.register({
    id: 'G3', group: 'G', title: '滑動視窗驗證',
    module: { name: 'M4 第 15 節', url: '../m4/#p15' },
    goal: '時間序列不能用會「用未來預測過去」的隨機 K-Fold！以滾動／擴張視窗 (Sliding / Expanding Window) 依時間順序切出訓練窗與未來驗證期，真實評估前瞻預測誤差 MAE。',
    data: {
      name: 'er_sliding',
      scenario: '急診就診量：24 個月時序資料，依時間軸滾動驗證未來預測準確度',
      columns: COLS,
      small: seed => LAB.data.opd(seed, 24).map(r => ({ id: r.id, t: r.t, visits: r.visits }))
    },
    params: [
      { key: 'mode', label: '視窗模式', type: 'choice', value: 'sliding', options: [{ v: 'sliding', label: '滑動固定窗 (Sliding)' }, { v: 'expanding', label: '擴張累積窗 (Expanding)' }] },
      { key: 'win', label: '訓練窗長 W', type: 'int', min: 6, max: 12, step: 2, value: 8 },
      { key: 'horizon', label: '每次驗證期數 H', type: 'int', min: 1, max: 4, step: 1, value: 2 }
    ],
    pseudo: [
      '嚴禁隨機打亂時間序列',
      '設定訓練窗長 W 與預測期數 H',
      '從 t = W 開始往前滾動：',
      '  用訓練窗擬合趨勢模型',
      '  預測緊接在後的 H 期未來',
      '  計算該折 MAE 後視窗右移 H 步',
      '平均所有滾動折的 MAE'
    ],
    build(rows, p) {
      const R = runSW(rows, p), steps = [];

      function views(st) {
        const fl = R.folds[Math.min(st.foldIdx, R.folds.length - 1)];
        const series = [
          { id: 'all', label: '完整急診量', pts: R.y.map((v, i) => [i + 1, v]), cls: 'c5', dots: false }
        ];
        if (st.showFold && fl) {
          series.push({ id: 'tr', label: '本折訓練窗', pts: R.y.slice(fl.start, fl.end).map((v, i) => [fl.start + i + 1, v]), cls: 'c0', dots: true });
          series.push({ id: 'va', label: '實際未來', pts: fl.va.map((v, h) => [fl.end + h + 1, v]), cls: 'good', dots: true });
          series.push({ id: 'pr', label: '模型預測', pts: fl.preds.map((v, h) => [fl.end + h + 1, v]), cls: 'c1', dash: true, dots: true });
        }
        const yAll = R.y.concat(fl ? fl.preds : []);
        const yLo = M.min(yAll), yHi = M.max(yAll), pad = (yHi - yLo) * 0.08 || 50;
        const main = {
          type: 'line', slot: 'main',
          title: fl && st.showFold ? '第 ' + fl.fold + ' 折：訓練 [' + (fl.start + 1) + '–' + fl.end + '] → 預測 [' + (fl.end + 1) + '–' + (fl.end + R.hor) + ']' : '24 個月急診就診量時間序列',
          axes: { x: { label: '月份 t', min: 1, max: R.n }, y: { label: '就診人次', min: Math.floor(yLo - pad), max: Math.ceil(yHi + pad) } },
          series
        };
        const side = {
          type: 'table', slot: 'side',
          title: '各滾動折驗證誤差 (MAE)',
          cols: [
            { key: 'f', label: '折' },
            { key: 'tr', label: '訓練區間' },
            { key: 'va', label: '驗證區間' },
            { key: 'mae', label: 'MAE', num: true, digits: 1 }
          ],
          rows: R.folds.map((x, idx) => ({
            id: 'fl' + idx,
            cells: ['F' + x.fold, (x.start + 1) + '–' + x.end, (x.end + 1) + '–' + (x.end + R.hor), idx < st.doneCount ? x.mae : null],
            hl: st.showFold && idx === st.foldIdx
          }))
        };
        const bottom = {
          type: 'bars', slot: 'bottom',
          title: '各滾動折 MAE 比較（全折平均 = ' + f(R.meanMae, 1) + ' 人次）',
          max: Math.max(50, Math.ceil(M.max(R.folds.map(x => x.mae)) * 1.15)),
          digits: 1,
          items: R.folds.map((x, idx) => ({
            id: 'b' + idx, label: 'F' + x.fold,
            value: idx < st.doneCount ? x.mae : 0,
            cls: st.showFold && idx === st.foldIdx ? 'hl' : 'c0'
          }))
        };
        return [main, side, bottom];
      }

      const st = { foldIdx: 0, showFold: false, doneCount: 0 };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '題目', '時間序列具有先後因果，不能像表格資料那樣隨機抽樣做 K-Fold，否則會用未來的月份偷預測過去。', [
        '共 ' + R.n + ' 期，設訓練窗 W = ' + R.win + '、驗證步數 H = ' + R.hor + '（共 ' + R.folds.length + ' 折）'
      ]);

      R.folds.forEach((fl, idx) => {
        st.foldIdx = idx; st.showFold = true; st.doneCount = idx + 1;
        add(idx === 0 ? 3 : 5, '第 ' + fl.fold + ' 折滾動驗證', '用第 ' + (fl.start + 1) + '–' + fl.end + ' 月（共 ' + fl.trLen + ' 期）擬合趨勢，預測第 ' + (fl.end + 1) + '–' + (fl.end + R.hor) + ' 月。', [
          '本折 MAE = ' + f(fl.mae, 2) + ' 人次'
        ]);
      });

      add(6, '彙總滾動平均 MAE', '把全部 ' + R.folds.length + ' 折的前瞻驗證誤差取平均，作為模型在真實上線滾動預測的期望誤差。', [
        '平均 MAE = ' + f(R.meanMae, 2) + ' 人次（模式：' + (R.mode === 'expanding' ? '擴張窗' : '滑動固定窗') + '）'
      ]);

      while (steps.length < 10) {
        add(6, '滑動 vs 擴張窗取捨', '資料結構會隨年份改變（概念飄移）時選「滑動固定窗」只看近期；長期規律穩定時選「擴張窗」累積越多歷史越好。', [
          '平均 MAE = ' + f(R.meanMae, 2)
        ]);
      }
      return steps;
    },

    keys(steps, rows, p) {
      const R = runSW(rows, p);
      const k = { n_folds: R.folds.length, mean_mae: R.meanMae };
      R.folds.forEach((fl, i) => { k['fold_' + i + '_mae'] = fl.mae; });
      return k;
    },

    explain(steps, rows, p) {
      const R = runSW(rows, p);
      return [
        '以「' + (R.mode === 'expanding' ? '擴張累積窗' : '滑動固定窗') + '」（W=' + R.win + '、H=' + R.hor + '）共切出 ' + R.folds.length + ' 折前瞻驗證，平均 MAE = ' + f(R.meanMae, 2) + ' 人次。',
        '每一折的訓練資料時間永遠嚴格早於驗證資料，徹底杜絕時間序列的未來資料洩漏（Look-Ahead Leakage）。',
        '當急診量受季節或政策轉折影響時，固定窗長能更快忘掉過時趨勢。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Sliding Validation', 'Windowing', 'Linear Regression', 'Performance (Regression)'],
      params: [
        ['Sliding Validation › training win width', p => String(p.win)],
        ['Sliding Validation › test win width', p => String(p.horizon)]
      ],
      note: 'AI Studio 專門提供 Sliding Validation 運算子來驗證時間序列（不可直接用一般打亂的 Cross Validation）。',
      expect: (steps, rows, p) => {
        const R = runSW(rows, p);
        return ['共 ' + R.folds.length + ' 折滾動驗證，平均 MAE = ' + f(R.meanMae, 2)];
      },
      python: 'from sklearn.model_selection import TimeSeriesSplit\n# TimeSeriesSplit(n_splits=5) 實作時間序擴張／滑動驗證',
      confirmed: false
    }
  });
})();
