/* S2 監督式學習標準流程（分類／迴歸／不平衡 3 條管線＋可用演算法） */
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
    const task = p.task || 'clf';
    const isReg = task === 'reg';
    const isImb = task === 'imbalance';
    const cvScores = M.range(k, i => Number((0.81 + Math.sin(i * 1.7) * 0.035).toFixed(3)));
    const meanCv = M.mean(cvScores);
    const testScore = Number((meanCv - 0.014).toFixed(3));
    return { k, task, isReg, isImb, cvScores, meanCv, testScore };
  }

  LAB.register({
    id: 'S2', group: 'S', title: '監督式學習流程（含 CV）',
    module: { name: 'M2 監督式學習', url: '../m2-2/#p08' },
    goal: '透過全寬流程圖對照「分類＋CV」、「迴歸＋CV」與「不平衡醫療分類」3 條標準管線，標註各步可用的 B1–B16 與 A5 演算法。',
    data: {
      name: 'sup_cv_flow',
      scenario: '120 位門診病人資料（80% 訓練開發、20% 封存測試），走完監督式學習與交叉驗證全流程',
      columns: COLS,
      small: makeRows
    },
    params: [
      { key: 'task', label: '監督學習管線', type: 'choice', value: 'clf', options: [{ v: 'clf', label: '標準分類＋CV' }, { v: 'reg', label: '連續迴歸＋CV' }, { v: 'imbalance', label: '不平衡醫療分類 (SMOTE+PR)' }] },
      { key: 'folds', label: '交叉驗證折數 K', type: 'int', min: 3, max: 10, step: 1, value: 5 }
    ],
    pseudo: [
      '1. 準備特徵 X 與標準答案標籤 y',
      '2. 切出訓練集 (80%) 與封存測試集 (20%)',
      '3. 在訓練集內執行 K 折交叉驗證：',
      '   輪流留 1 折驗證（不平衡需折內採樣）',
      '   網格搜尋最佳超參數組合',
      '4. 用最佳參數重訓全體訓練集',
      '5. 解封測試集評估並校正決策門檻'
    ],
    build(rows, p) {
      const R = simulate(p), steps = [];
      const metric = R.isReg ? 'R²' : (R.isImb ? 'PR-AUC' : 'ROC-AUC');

      const ALGO_ROWS = [
        { id: 's0', st: '1. 定義 X 與 y', alg: R.isReg ? '連續血壓/費用' : '二元/多元標籤', use: '先確認問題是分類還是迴歸' },
        { id: 's1', st: '2. 切分訓練/測試', alg: R.isReg ? '隨機切分' : '分層抽樣 Stratified', use: '分類保留正負比例，測試集鎖進保險箱' },
        { id: 's2', st: '3. ' + R.k + '-Fold CV 調參', alg: R.isReg ? 'B1/B2/B9/B11/B14' : (R.isImb ? 'A5 折內 + B6/B7/B9' : 'B3/B4/B5/B6/B7/B10'), use: '搭配 B13 網格搜尋挑最佳超參數' },
        { id: 's3', st: '4. 全訓練集重訓', alg: R.isReg ? 'Ridge/Lasso/GBDT' : 'B7 森林 / B12 集成', use: '用 100% 訓練資料與最佳參數重訓' },
        { id: 's4', st: '5. 驗收與門檻校正', alg: R.isReg ? 'MSE / R² / 殘差圖' : 'B16 ROC & PR 曲線', use: R.isImb ? '依漏診/誤報成本調門檻，不用預設 0.5' : '最後才解封測試集評估泛化力' }
      ];

      function views(st) {
        const done = k => st.stage > k;
        const act = k => st.stage === k;
        const clsOf = k => act(k) ? 'hl' : (done(k) ? 'good' : 'c5');
        const layers = [
          [{ id: 'data', label: '1. X 與標籤 y', value: '120 筆', shape: 'box', w: 156, cls: clsOf(0), hl: act(0), sub: R.isReg ? '連續 y' : (R.isImb ? '少數陽性' : '分類 y') }],
          [
            { id: 'tr', label: '2a. 訓練開發集', value: '96 筆 (80%)', shape: 'box', w: 156, cls: clsOf(1), hl: act(1), sub: R.isImb ? '分層+折內 A5' : '前處理+CV' },
            { id: 'te', label: '2b. 封存測試集', value: '24 筆 (20%)', shape: 'box', w: 156, cls: act(5) ? 'hl' : (done(5) ? 'good' : 'c4'), hl: act(5), sub: st.stage < 5 ? '嚴禁偷看' : '最終驗收' }
          ],
          [{ id: 'cv', label: '3. ' + R.k + '-Fold CV', value: st.stage >= 2 ? metric + '=' + f(R.meanCv, 3) : '待驗證', shape: 'box', w: 156, cls: clsOf(2), hl: act(2), sub: R.isReg ? 'B1/B2/B11/B14' : 'B3–B13 網格搜尋' }],
          [{ id: 'fit', label: '4. 全訓練重訓', value: st.stage >= 3 ? '已收斂' : '待重訓', shape: 'box', w: 156, cls: clsOf(3), hl: act(3), sub: R.isReg ? 'B2/B9 GBDT' : 'B7 森林/B12 集成' }],
          [{ id: 'eval', label: '5. 驗收與部署', value: st.stage >= 5 ? metric + '=' + f(R.testScore, 3) : '待解封', shape: 'box', w: 156, cls: clsOf(5), hl: act(5), sub: R.isReg ? 'R² / RMSE' : 'B16 ROC/PR 門檻' }]
        ];
        const edges = [
          { from: 'data', to: 'tr', active: st.stage === 1, cls: done(0) ? 'good' : 'c5', label: '80%' },
          { from: 'data', to: 'te', active: st.stage === 1, cls: done(0) ? 'c4' : 'c5', label: '20% 封存' },
          { from: 'tr', to: 'cv', active: st.stage === 2, cls: done(1) ? 'good' : 'c5', label: '輪流驗證' },
          { from: 'cv', to: 'tr', active: st.stage === 2 && st.cvLoop, back: true, cls: 'c3', label: '調參回圈' },
          { from: 'cv', to: 'fit', active: st.stage === 3, cls: done(2) ? 'good' : 'c5' },
          { from: 'fit', to: 'eval', active: st.stage === 4 || st.stage === 5, cls: done(3) ? 'good' : 'c5' },
          { from: 'te', to: 'eval', active: st.stage === 5, cls: done(4) ? 'good' : 'c4', label: '驗收' }
        ];
        const main = {
          type: 'network', slot: 'main', w: 1320, h: 230,
          title: '監督式學習全流程圖（含 ' + R.k + '-Fold 調參回圈）',
          layerLabels: ['1. 資料', '2. 切分', '3. 驗證調參', '4. 重訓', '5. 驗收'],
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
          type: 'table', slot: 'bottom',
          title: '步驟與可用演算法對照（' + (R.isReg ? '迴歸管線' : R.isImb ? '不平衡分類管線' : '標準分類管線') + '）',
          cols: [{ key: 'st', label: '步驟' }, { key: 'alg', label: '可用演算法' }, { key: 'use', label: '關鍵設計重點' }],
          rows: ALGO_ROWS.map((ar, idx) => ({
            id: ar.id,
            cells: [ar.st, { v: ar.alg, cls: idx === Math.min(st.stage, 4) ? 'hl' : (idx < st.stage ? 'good' : 'c0') }, ar.use],
            hl: idx === Math.min(st.stage, 4)
          }))
        };
        return [main, side, bottom];
      }

      const st = { stage: 0, cvLoop: false };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '1. 準備 X 與標籤 y', '監督式學習有標準答案 y。先依任務選對指標：分類看 ROC/PR-AUC，迴歸看 R²/RMSE，不平衡看 PR-AUC。', [
        '目前管線：' + (R.isReg ? '連續迴歸' : R.isImb ? '不平衡分類' : '標準分類') + '｜指標：' + metric
      ]);
      st.stage = 1;
      add(1, '2. 切出獨立測試集', '把 20% 測試集封存。分類任務建議用分層抽樣（Stratified）確保訓練與測試的正負比例一致。', [
        '訓練開發集 = 96 筆｜封存測試集 = 24 筆'
      ]);
      st.stage = 2;
      add(2, '3a. K-Fold 交叉驗證', '在訓練集內做 ' + R.k + ' 折交叉驗證；若是不平衡分類，SMOTE（A5）只能寫在每一折的訓練側，不可先整份過採樣！', [
        R.k + '-Fold 平均 ' + metric + ' = ' + f(R.meanCv, 3)
      ]);
      st.cvLoop = true;
      add(4, '3b. 網格搜尋調參 (B13)', '比對不同模型家族與超參數（線性 B1/B3、k-NN B4、SVM B10、樹 B6/B7/B9）的 CV 平均分數。', [
        '橙色回流箭頭代表「調參 → 重算 CV → 挑最佳模型」'
      ]);
      st.cvLoop = false; st.stage = 3;
      add(5, '4. 全訓練集重訓', '選定最佳模型與超參數後，用全部 96 筆訓練資料重訓（也可將多模結合為 Voting/Stacking B12）。', [
        '可用集成：B7 隨機森林、B8 AdaBoost、B9 GBDT、B12 Stacking'
      ]);
      st.stage = 4;
      add(5, '5a. 檢查過擬合與偏差', '比較訓練分數與 CV 分數（B11 過擬合檢查），若兩者落差太大可改用正則化（B2 Ridge/Lasso）或調淺樹深。', [
        'CV 平均 ' + metric + ' = ' + f(R.meanCv, 3)
      ]);
      st.stage = 5;
      add(6, '5b. 解封測試集與校正', '用 24 筆測試集測出真實泛化分數 ' + metric + ' = ' + f(R.testScore, 3) + '；分類模型可依醫療成本調 B16 機率門檻。', [
        'CV = ' + f(R.meanCv, 3) + ' vs 測試 = ' + f(R.testScore, 3)
      ]);
      while (steps.length < 10) {
        add(6, '模型挑選心法', '表格資料先試線性/Logistic 基線，再試隨機森林與 GBDT；若需高度可解釋性可用決策樹 B6 或 Rule Induction B15。', [
          '測試集只能用來驗收，不可看到分數低就回頭調參！'
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
        '監督式學習依任務分為分類、迴歸與不平衡分類三種管線，共同原則是「先封存測試集，只在訓練集內做 ' + R.k + '-Fold CV 調參」。',
        '不平衡醫療資料務必在 CV 折內做 SMOTE（A5）並改看 PR-AUC 與調整判定門檻（B16）。',
        'B 區 16 個實驗對應這條管線的各個核心模型與評估工具。'
      ];
    },
    aistudio: {
      operators: ['Read CSV', 'Split Data', 'Cross Validation', 'Apply Model', 'Performance'],
      params: [['Split Data', '0.8 / 0.2'], ['Cross Validation › number of folds', p => String(p.folds)]],
      note: 'AI Studio 的 Cross Validation 子流程內左側放訓練模型（或含 SMOTE），右側放 Apply Model + Performance。',
      expect: (steps, rows, p) => {
        const R = simulate(p);
        return [R.k + '-Fold 平均 ≈ ' + f(R.meanCv, 3) + '，測試驗收 ≈ ' + f(R.testScore, 3)];
      },
      python: 'from sklearn.model_selection import train_test_split, GridSearchCV\n# 先切 test，再對 X_train 跑 GridSearchCV',
      confirmed: false
    }
  });
})();
