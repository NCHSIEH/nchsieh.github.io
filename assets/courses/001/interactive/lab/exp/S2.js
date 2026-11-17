/* S2 監督式學習標準流程（含交叉驗證） */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = [
    { key: 'stage', label: '階段', type: 'cat', levels: ['切分', 'CV', '訓練', '測試'] },
    { key: 'train_n', label: '訓練筆數', type: 'int' },
    { key: 'val_n', label: '驗證筆數', type: 'int' },
    { key: 'score', label: '評估分數', type: 'num' }
  ];

  function makeRows(seed) {
    const r = LAB.rng(9200 + seed);
    return [1, 2, 3, 4, 5, 6].map(i => ({
      id: i,
      stage: i <= 3 ? 'CV' : (i === 4 ? '切分' : (i === 5 ? '訓練' : '測試')),
      train_n: 80 + Math.round(r() * 4),
      val_n: 20,
      score: Number((0.78 + r() * 0.12).toFixed(3))
    }));
  }

  function simulate(p) {
    const k = Math.max(3, Math.round(p.folds || 5));
    const isReg = p.task === 'reg';
    const cvScores = M.range(k, i => Number((0.81 + Math.sin(i * 1.7) * 0.035).toFixed(3)));
    const meanCv = M.mean(cvScores);
    const testScore = Number((meanCv - 0.014).toFixed(3));
    return { k, isReg, cvScores, meanCv, testScore };
  }

  LAB.register({
    id: 'S2', group: 'S', title: '監督式學習流程（含 CV）',
    module: { name: 'M2 監督式學習', url: '../m2-2/#p08' },
    goal: '透過動畫看懂監督式學習的標準流程：先保留獨立測試集，在訓練集內用 K-Fold 交叉驗證反覆調參，最後才用測試集驗收。',
    data: {
      name: 'sup_cv_flow',
      scenario: '120 位門診病人資料（80% 訓練開發、20% 封存測試），走完監督式學習與交叉驗證全流程',
      columns: COLS,
      small: makeRows
    },
    params: [
      { key: 'task', label: '任務類型', type: 'choice', value: 'clf', options: [{ v: 'clf', label: '分類 (糖尿病是/否)' }, { v: 'reg', label: '迴歸 (預測收縮壓)' }] },
      { key: 'folds', label: '交叉驗證折數 K', type: 'int', min: 3, max: 10, step: 1, value: 5 }
    ],
    pseudo: [
      '1. 準備特徵 X 與標準答案標籤 y',
      '2. 切出訓練集 (80%) 與封存測試集 (20%)',
      '3. 在訓練集內切出 K 折交叉驗證：',
      '   輪流留 1 折驗證、K−1 折訓練',
      '   依 K 折平均分數調整超參數',
      '4. 用最佳超參數重訓全體訓練集',
      '5. 最後解封測試集評估真實泛化力'
    ],
    build(rows, p) {
      const R = simulate(p), steps = [];
      const metric = R.isReg ? 'R²' : 'AUC';

      function views(st) {
        const done = k => st.stage > k;
        const act = k => st.stage === k;
        const clsOf = k => act(k) ? 'hl' : (done(k) ? 'good' : 'c5');
        const layers = [
          [{ id: 'data', label: '1. X 與標籤 y', value: '120 筆', shape: 'box', cls: clsOf(0), hl: act(0), sub: R.isReg ? '連續目標' : '二元分類' }],
          [
            { id: 'tr', label: '2a. 訓練開發集', value: '96 筆 (80%)', shape: 'box', cls: clsOf(1), hl: act(1), sub: '做前處理+CV' },
            { id: 'te', label: '2b. 封存測試集', value: '24 筆 (20%)', shape: 'box', cls: act(5) ? 'hl' : (done(5) ? 'good' : 'c4'), hl: act(5), sub: st.stage < 5 ? '嚴禁偷看' : '最終驗收' }
          ],
          [{ id: 'cv', label: '3. ' + R.k + '-Fold CV 調參', value: st.stage >= 2 ? metric + '=' + f(R.meanCv, 3) : '待驗證', shape: 'box', cls: clsOf(2), hl: act(2), sub: 'B13 網格搜尋' }],
          [{ id: 'fit', label: '4. 全訓練集重訓', value: st.stage >= 3 ? '已收斂' : '待重訓', shape: 'box', cls: clsOf(3), hl: act(3), sub: '鎖定最佳參數' }],
          [{ id: 'eval', label: '5. 測試驗收與部署', value: st.stage >= 5 ? metric + '=' + f(R.testScore, 3) : '待解封', shape: 'box', cls: clsOf(5), hl: act(5), sub: 'B16 ROC/PR' }]
        ];
        const edges = [
          { from: 'data', to: 'tr', active: st.stage === 1, cls: done(0) ? 'good' : 'c5' },
          { from: 'data', to: 'te', active: st.stage === 1, cls: done(0) ? 'c4' : 'c5' },
          { from: 'tr', to: 'cv', active: st.stage === 2, cls: done(1) ? 'good' : 'c5', label: '輪流驗證' },
          { from: 'cv', to: 'tr', active: st.stage === 2 && st.cvLoop, back: true, cls: 'c3', label: '調參回圈' },
          { from: 'cv', to: 'fit', active: st.stage === 3, cls: done(2) ? 'good' : 'c5' },
          { from: 'fit', to: 'eval', active: st.stage === 4 || st.stage === 5, cls: done(3) ? 'good' : 'c5' },
          { from: 'te', to: 'eval', active: st.stage === 5, cls: done(4) ? 'good' : 'c4' }
        ];
        const main = {
          type: 'network', slot: 'main',
          title: '監督式學習標準流程（含 ' + R.k + '-Fold 交叉驗證）',
          layerLabels: ['資料', '切分', '驗證調參', '訓練', '驗收'],
          layers, edges
        };
        const side = {
          type: 'table', slot: 'side',
          title: R.k + '-Fold 各折驗證與測試對照',
          cols: [{ key: 'fd', label: '資料集 / 折次' }, { key: 'n', label: '筆數', num: true, digits: 0 }, { key: 'sc', label: metric, num: true, digits: 3 }],
          rows: R.cvScores.slice(0, 5).map((sc, i) => ({
            id: 'f' + i,
            cells: ['CV 第 ' + (i + 1) + ' 折', Math.round(96 / R.k), st.stage >= 2 ? { v: f(sc, 3), cls: 'c0' } : null],
            hl: st.stage === 2 && st.cvLoop
          })).concat([{
            id: 'test',
            cells: ['封存測試集 (20%)', 24, st.stage >= 5 ? { v: f(R.testScore, 3), cls: 'good' } : { v: '封存中', cls: 'c4' }],
            hl: st.stage === 5
          }])
        };
        const bottom = {
          type: 'bars', slot: 'bottom',
          title: '各階段模型評估分數 (' + metric + ')',
          max: 1, digits: 3,
          items: [
            { id: 'cv', label: R.k + '-Fold CV 平均', value: st.stage >= 2 ? R.meanCv : 0, cls: 'c0', hl: st.stage === 2 },
            { id: 'te', label: '獨立測試集驗收', value: st.stage >= 5 ? R.testScore : 0, cls: 'good', hl: st.stage === 5 }
          ]
        };
        return [main, side, bottom];
      }

      const st = { stage: 0, cvLoop: false };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '1. 準備 X 與標籤 y', '監督式學習必須有標準答案 y（' + (R.isReg ? '連續血壓值' : '是否糖尿病') + '），我們有 120 筆資料。', [
        '目標：學出能準確預測「未來新病人」的模型'
      ]);
      st.stage = 1;
      add(1, '2. 切出獨立測試集', '第一件事就是把 20%（24 筆）測試集鎖進保險箱，只留 80%（96 筆）開發，避免調參作弊。', [
        '訓練開發集 = 96 筆｜封存測試集 = 24 筆'
      ]);
      st.stage = 2;
      add(2, '3a. K-Fold 交叉驗證', '把 96 筆訓練集切成 ' + R.k + ' 折，輪流拿 1 折當驗證集、其餘訓練，算出平均 ' + metric + '。', [
        R.k + '-Fold 平均 ' + metric + ' = ' + f(R.meanCv, 3)
      ]);
      st.cvLoop = true;
      add(4, '3b. 網格調參迴圈', '比較不同超參數（如 k-NN 的 K、正則化 λ、樹深度）的 CV 分數，挑出平均表現最佳的一組。', [
        '橙色回流箭頭代表「調參 → 重算 CV → 挑最佳組合」'
      ]);
      st.cvLoop = false; st.stage = 3;
      add(5, '4. 全訓練集重訓', '選定最佳超參數後，用全部 96 筆訓練資料（包含剛剛輪流驗證的資料）重新訓練最終模型。', [
        '模型資料量變回完整的 96 筆，估計更穩健'
      ]);
      st.stage = 4;
      add(5, '5a. 檢查誤差與殘差', '確認沒有明顯過擬合（訓練遠高於 CV）後，準備解封測試集做最終考驗。', [
        'CV 平均 ' + metric + ' = ' + f(R.meanCv, 3)
      ]);
      st.stage = 5;
      add(6, '5b. 解封測試集驗收', '把從未參與訓練與調參的 24 筆測試集送進模型，測出真實上線表現 ' + metric + ' = ' + f(R.testScore, 3) + '！', [
        'CV = ' + f(R.meanCv, 3) + ' vs 測試 = ' + f(R.testScore, 3) + '（差距小代表泛化良好）'
      ]);
      while (steps.length < 10) {
        add(6, '分類 vs 迴歸指標', R.isReg ? '迴歸看 RMSE、MAE 與 R²；記得畫殘差圖檢查是否漏掉非線性規律。' : '分類不平衡時別只看準確率，要看 ROC-AUC、PR-AUC 與臨床門檻下的 Recall/Precision。', [
          '測試集只能用來驗收，不可看到分數低就回頭改參數！'
        ]);
      }
      return steps;
    },
    keys(steps, rows, p) {
      const R = simulate(p);
      return { k_folds: R.k, mean_cv: R.meanCv, test_score: R.testScore, cv_0: R.cvScores[0], cv_1: R.cvScores[1], cv_2: R.cvScores[2] };
    },
    explain(steps, rows, p) {
      const R = simulate(p);
      return [
        '監督式學習必須先切出獨立測試集封存，所有前處理與 ' + R.k + '-Fold 交叉驗證都只能在訓練集內進行。',
        '交叉驗證用來比較演算法與調整超參數；選定最佳參數後再用全部訓練集重訓，最後才在測試集驗收一次。',
        '若看到測試集分數不佳又回頭修改參數，測試集就變成了驗證集，會高估模型上線後的表現。'
      ];
    },
    aistudio: {
      operators: ['Read CSV', 'Split Data', 'Cross Validation', 'Apply Model', 'Performance'],
      params: [['Split Data', '0.8 / 0.2'], ['Cross Validation › number of folds', p => String(p.folds)]],
      note: 'AI Studio 的 Cross Validation 子流程內左側放訓練模型、右側放 Apply Model + Performance，外層再接獨立測試集驗收。',
      expect: (steps, rows, p) => {
        const R = simulate(p);
        return [R.k + '-Fold 平均 ≈ ' + f(R.meanCv, 3) + '，測試驗收 ≈ ' + f(R.testScore, 3)];
      },
      python: 'from sklearn.model_selection import train_test_split, GridSearchCV\n# 先切 test，再對 X_train 跑 GridSearchCV',
      confirmed: false
    }
  });
})();
