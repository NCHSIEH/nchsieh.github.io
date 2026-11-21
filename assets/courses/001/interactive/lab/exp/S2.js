/* S2 監督式學習標準流程（單一線性／單一樹規則／集成學習／不平衡分類 4 條管線） */
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
    const isTree = task === 'tree';
    const isEns = task === 'ensemble';
    const isImb = task === 'imbalance';
    const cvScores = M.range(k, i => Number((0.81 + Math.sin(i * 1.7) * 0.035).toFixed(3)));
    const meanCv = M.mean(cvScores);
    const testScore = Number((meanCv - 0.014).toFixed(3));
    return { k, task, isTree, isEns, isImb, cvScores, meanCv, testScore };
  }

  LAB.register({
    id: 'S2', group: 'S', title: '監督式學習流程（含 CV）',
    module: { name: 'M2 監督式學習', url: '../m2-2/#p08' },
    goal: '點選不同管線比較「單一線性／距離模型」、「單一樹／規則模型」、「集成學習 (RF/GBDT/Stacking)」與「不平衡醫療分類」的完整標準流程。',
    data: {
      name: 'sup_cv_flow',
      scenario: '120 位門診病人資料（80% 訓練開發、20% 封存測試），比較 4 種監督式學習標準管線',
      columns: COLS,
      small: makeRows
    },
    params: [
      { key: 'task', label: '監督學習管線', type: 'choice', value: 'clf', options: [
        { v: 'clf', label: '單一線性／距離模型' },
        { v: 'tree', label: '單一樹／規則模型' },
        { v: 'ensemble', label: '集成學習 (Bagging/Boosting)' },
        { v: 'imbalance', label: '不平衡醫療分類 (SMOTE+PR)' }
      ] },
      { key: 'folds', label: '交叉驗證折數 K', type: 'int', min: 3, max: 10, step: 1, value: 5 }
    ],
    pseudo: [
      '1. 準備特徵 X 與標準答案標籤 y',
      '2. 切出訓練集 (80%) 與封存測試集 (20%)',
      '3. 在訓練集內執行 K 折交叉驗證：',
      '   依模型家族做對應前處理（折內不洩漏）',
      '   網格搜尋最佳超參數或集成組合',
      '4. 用最佳參數重訓全體訓練集',
      '5. 解封測試集評估並校正決策門檻'
    ],
    build(rows, p) {
      const R = simulate(p), steps = [];
      const metric = R.isImb ? 'PR-AUC' : 'ROC-AUC';
      const pipeName = R.isTree ? '單一樹／規則管線' : R.isEns ? '集成學習管線' : R.isImb ? '不平衡醫療分類' : '單一線性／距離管線';

      const ALGO_ROWS = R.isTree ? [
        { id: 's0', st: '1. 切分訓練/測試', alg: 'Stratified Split (80/20)', use: '保留原始正負比例，測試集封存' },
        { id: 's1', st: '2. 樹專用前處理', alg: '免縮放 · A4 One-hot', use: '保留原始 BMI/血糖單位，直接看出切點意義' },
        { id: 's2', st: '3. ' + R.k + '-Fold 剪枝調深', alg: 'B6 決策樹 · B14 迴歸樹 · B15 規則', use: '用 B13 CV 調整 max_depth 防止樹長太深過擬合' },
        { id: 's3', st: '4. 產出可解釋規則', alg: '視覺化樹狀圖 / IF–THEN', use: '可列印給醫師審查每條切點門檻' },
        { id: 's4', st: '5. 測試驗收', alg: 'B16 ROC / PR · 準確率', use: '解封測試集驗證真實泛化表現' }
      ] : R.isEns ? [
        { id: 's0', st: '1. 切分訓練/測試', alg: 'Stratified Split (80/20)', use: '集成模型容量大，更要嚴守測試集隔離' },
        { id: 's1', st: '2. 選集成策略', alg: 'Bagging(B7) / Boosting(B8,B9) / B12', use: '降變異用森林；降偏差用 GBDT；異質融合用 Stacking' },
        { id: 's2', st: '3. ' + R.k + '-Fold 調學習率/樹數', alg: 'B13 網格搜尋 (n_trees, lr)', use: '森林可搭 OOB 袋外驗證；Stacking 需折外預測防洩漏' },
        { id: 's3', st: '4. 全訓練集成重訓', alg: 'B7 RF · B9 GBDT · B12 Stacking', use: '結合多棵樹或異質基模型投票／堆疊' },
        { id: 's4', st: '5. 測試驗收與 SHAP', alg: 'B16 ROC/PR · I1 SHAP 解釋', use: '黑箱集成模型搭配 I1 SHAP 補回可解釋性' }
      ] : R.isImb ? [
        { id: 's0', st: '1. 分層切分', alg: 'Stratified Split (80/20)', use: '確保測試集也有足夠少數類陽性個案' },
        { id: 's1', st: '2. 折內過抽樣', alg: 'A5 SMOTE（僅限訓練折）', use: '嚴禁在 CV 切分前就先做 SMOTE，否則驗證分數虛高' },
        { id: 's2', st: '3. ' + R.k + '-Fold 優化 PR-AUC', alg: 'B3/B7/B9 + class_weight', use: '改用 PR-AUC 或 F1 挑超參數，不看易被多數類稀釋的 Acc' },
        { id: 's3', st: '4. 決策門檻校正', alg: 'B16 移動機率門檻', use: '依漏診與誤報醫療成本調降切點，取代預設 0.50' },
        { id: 's4', st: '5. 測試集最終驗收', alg: 'Recall / Precision / PR-AUC', use: '確認實戰抓出高風險病人的能力' }
      ] : [
        { id: 's0', st: '1. 準備與切分', alg: 'Stratified Split (80/20)', use: '線性／距離模型對資料洩漏敏感，必先切分' },
        { id: 's1', st: '2. 必做縮放與共線處理', alg: 'A2 標準化 · A4 Dummy · A7 縮尾', use: '必做 Z 分數（否則 k-NN/SVM 被大尺度欄主導）' },
        { id: 's2', st: '3. ' + R.k + '-Fold 調正則化', alg: 'B1–B5 / B10 / B17 LDA / B18 多元', use: '用 B13 網格搜尋調 λ、k-NN 的 K 或 SVM 的 C' },
        { id: 's3', st: '4. 全訓練集重訓', alg: 'B2/B3/B10 最佳超參數', use: '用全部訓練資料算出最終權重或支持向量' },
        { id: 's4', st: '5. 驗收與係數解讀', alg: 'B16 ROC/PR · 勝算比 OR', use: '線性模型可直接從係數 exp(w) 解讀風險倍數' }
      ];

      function views(st) {
        const done = k => st.stage > k;
        const act = k => st.stage === k;
        const clsOf = k => act(k) ? 'hl' : (done(k) ? 'good' : 'c5');
        const layers = R.isEns ? [
          [
            { id: 'data', label: '1a. 訓練集 (80%)', value: '96 筆', shape: 'box', w: 140, cls: clsOf(0), hl: act(0), sub: '開發與交叉驗證' },
            { id: 'te', label: '1b. 封存測試集', value: '24 筆 (20%)', shape: 'box', w: 140, cls: act(5) ? 'hl' : (done(5) ? 'good' : 'c4'), hl: act(5), sub: st.stage < 5 ? '嚴禁偷看' : '最終驗收' }
          ],
          [
            { id: 'p1', label: '2a. Bootstrap 抽樣', value: '有放回重抽', shape: 'box', w: 140, cls: clsOf(1), hl: act(1), sub: 'Bagging 產生多樣性' },
            { id: 'p2', label: '2b. 殘差/折外準備', value: '順序/異質', shape: 'box', w: 140, cls: clsOf(1), hl: act(1), sub: 'Boosting / Stacking' }
          ],
          [
            { id: 'm1', label: '3a. Bagging 森林', value: '降變異', shape: 'box', w: 140, cls: clsOf(1), hl: act(1), sub: 'B7 隨機森林/OOB' },
            { id: 'm2', label: '3b. Boosting 接力', value: '降偏差', shape: 'box', w: 140, cls: clsOf(1), hl: act(1), sub: 'B8 Ada · B9 GBDT' },
            { id: 'm3', label: '3c. 異質基模型', value: 'Log+樹+kNN', shape: 'box', w: 140, cls: clsOf(1), hl: act(1), sub: 'B12 多樣性互補' }
          ],
          [
            { id: 'cv', label: '4a. ' + R.k + '-Fold 評估', value: st.stage >= 2 ? metric + '≈' + f(R.meanCv, 3) : '待驗證', shape: 'box', w: 142, cls: clsOf(2), hl: act(2), sub: '折外預測防洩漏' },
            { id: 'tune', label: '4b. B13 網格調參', value: st.cvLoop ? '調樹數/學習率' : '超參數空間', shape: 'box', w: 142, cls: st.cvLoop ? 'hl' : clsOf(2), hl: st.cvLoop, sub: 'n_trees · lr · depth' }
          ],
          [
            { id: 'fit', label: '5a. 投票/加權融合', value: st.stage >= 3 ? 'Soft Voting' : '待融合', shape: 'box', w: 142, cls: clsOf(3), hl: act(3), sub: 'B7/B9 全資料重訓' },
            { id: 'meta', label: '5b. Meta-Learner', value: st.stage >= 3 ? 'Stacking 二層' : '待堆疊', shape: 'box', w: 142, cls: clsOf(3), hl: act(3), sub: 'B12 邏輯迴歸整合' }
          ],
          [
            { id: 'eval', label: '6a. 測試集驗收', value: st.stage >= 5 ? metric + '≈' + f(R.testScore, 3) : '待解封', shape: 'box', w: 142, cls: act(5) ? 'hl' : (done(5) ? 'good' : 'c5'), hl: act(5), sub: 'B16 ROC/PR 曲線' },
            { id: 'xai', label: '6b. SHAP 歸因', value: st.stage >= 5 ? '補回解釋力' : '黑箱拆解', shape: 'box', w: 142, cls: act(5) ? 'hl' : (done(5) ? 'good' : 'c5'), hl: act(5), sub: 'I1 排列重要度+SHAP' }
          ]
        ] : [
          [
            { id: 'data', label: '1a. 訓練集 (80%)', value: '96 筆', shape: 'box', w: 142, cls: clsOf(0), hl: act(0), sub: R.isImb ? '分層保留少數類' : '開發與交叉驗證' },
            { id: 'te', label: '1b. 封存測試集', value: '24 筆 (20%)', shape: 'box', w: 142, cls: act(5) ? 'hl' : (done(5) ? 'good' : 'c4'), hl: act(5), sub: st.stage < 5 ? '嚴禁偷看' : '最終驗收' }
          ],
          [
            { id: 'tr', label: R.isTree ? '2a. 免縮放原單位' : R.isImb ? '2a. 折內 SMOTE' : '2a. Z 分數標準化', value: R.isTree ? '排序切點' : R.isImb ? 'A5 僅訓練折' : 'A2 必做', shape: 'box', w: 142, cls: clsOf(1), hl: act(1), sub: R.isTree ? '保留臨床原單位' : R.isImb ? '禁在切分前合成' : '防大尺度欄主導' },
            { id: 'tr2', label: R.isTree ? '2b. 類別/分箱' : R.isImb ? '2b. 類別權重設定' : '2b. Dummy+縮尾', value: R.isTree ? 'A3 / A4' : R.isImb ? 'class_weight' : 'A4 / A7', shape: 'box', w: 142, cls: clsOf(1), hl: act(1), sub: R.isTree ? '支援非線性交互' : R.isImb ? '加重漏診懲罰' : '去共線與防離群拉偏' }
          ],
          [
            { id: 'mod1', label: R.isTree ? '3a. B6 分類決策樹' : R.isImb ? '3a. 加權邏輯迴歸' : '3a. B1/B2/B3 線性', value: R.isTree ? 'Gini / 熵' : R.isImb ? 'B3 機率輸出' : 'Ridge/Lasso/Log', shape: 'box', w: 142, cls: clsOf(2), hl: act(2), sub: R.isTree ? '白箱樹狀分支' : R.isImb ? '校正陽性基準率' : 'L1/L2 正則化' },
            { id: 'mod2', label: R.isTree ? '3b. B14 迴歸樹/B15' : R.isImb ? '3b. B7/B9 樹集成' : '3b. B4 k-NN / B10 SVM', value: R.isTree ? 'IF-THEN 規則' : R.isImb ? 'PR-AUC 導向' : '距離 / 最大邊界', shape: 'box', w: 142, cls: clsOf(2), hl: act(2), sub: R.isTree ? '階梯預測與規則集' : R.isImb ? '抓非線性少數類' : '歐氏距離與核函數' }
          ],
          [
            { id: 'cv', label: '4a. ' + R.k + '-Fold 驗證', value: st.stage >= 2 ? metric + '≈' + f(R.meanCv, 3) : '待驗證', shape: 'box', w: 142, cls: clsOf(2), hl: act(2), sub: 'K 折平均防運氣偏差' },
            { id: 'tune', label: '4b. B13 網格調參', value: st.cvLoop ? '搜尋最佳組合' : '超參數空間', shape: 'box', w: 142, cls: st.cvLoop ? 'hl' : clsOf(2), hl: st.cvLoop, sub: R.isTree ? '調 max_depth 剪枝' : '調 λ / K / C 參數' }
          ],
          [
            { id: 'fit', label: '5a. 全訓練集重訓', value: st.stage >= 3 ? '96 筆已收斂' : '待重訓', shape: 'box', w: 142, cls: clsOf(3), hl: act(3), sub: '鎖定最佳超參數' },
            { id: 'cal', label: R.isImb ? '5b. B16 門檻下修' : '5b. 係數/規則鎖定', value: R.isImb ? 'p ≥ 0.30' : '模型定型', shape: 'box', w: 142, cls: clsOf(3), hl: act(3), sub: R.isImb ? '提高篩檢 Recall' : (R.isTree ? '提取臨床規則' : '計算勝算比 OR') }
          ],
          [
            { id: 'eval', label: '6a. 測試集驗收', value: st.stage >= 5 ? metric + '≈' + f(R.testScore, 3) : '待解封', shape: 'box', w: 142, cls: act(5) ? 'hl' : (done(5) ? 'good' : 'c5'), hl: act(5), sub: 'B16 混淆矩陣/AUC' },
            { id: 'xai', label: '6b. 臨床決策解讀', value: st.stage >= 5 ? '可解釋輸出' : '待產出', shape: 'box', w: 142, cls: act(5) ? 'hl' : (done(5) ? 'good' : 'c5'), hl: act(5), sub: R.isTree ? '白箱路徑透明' : '係數正負與風險倍數' }
          ]
        ];
        const edges = R.isEns ? [
          { from: 'data', to: 'p1', active: st.stage === 1, cls: done(0) ? 'good' : 'c5' },
          { from: 'data', to: 'p2', active: st.stage === 1, cls: done(0) ? 'good' : 'c5' },
          { from: 'p1', to: 'm1', active: st.stage === 1, cls: done(1) ? 'good' : 'c5' },
          { from: 'p2', to: 'm2', active: st.stage === 1, cls: done(1) ? 'good' : 'c5' },
          { from: 'p2', to: 'm3', active: st.stage === 1, cls: done(1) ? 'good' : 'c5' },
          { from: 'm1', to: 'cv', active: st.stage === 2, cls: done(1) ? 'good' : 'c5' },
          { from: 'm2', to: 'cv', active: st.stage === 2, cls: done(1) ? 'good' : 'c5' },
          { from: 'm3', to: 'tune', active: st.stage === 2, cls: done(1) ? 'good' : 'c5' },
          { from: 'tune', to: 'm2', active: st.stage === 2 && st.cvLoop, back: true, cls: 'c3', label: '調參回圈' },
          { from: 'cv', to: 'fit', active: st.stage === 3, cls: done(2) ? 'good' : 'c5' },
          { from: 'tune', to: 'meta', active: st.stage === 3, cls: done(2) ? 'good' : 'c5' },
          { from: 'fit', to: 'eval', active: st.stage === 4 || st.stage === 5, cls: done(3) ? 'good' : 'c5' },
          { from: 'meta', to: 'xai', active: st.stage === 4 || st.stage === 5, cls: done(3) ? 'good' : 'c5' },
          { from: 'te', to: 'eval', active: st.stage === 5, cls: done(4) ? 'good' : 'c4', label: '解封驗收' }
        ] : [
          { from: 'data', to: 'tr', active: st.stage === 1, cls: done(0) ? 'good' : 'c5' },
          { from: 'data', to: 'tr2', active: st.stage === 1, cls: done(0) ? 'good' : 'c5' },
          { from: 'tr', to: 'mod1', active: st.stage === 2, cls: done(1) ? 'good' : 'c5' },
          { from: 'tr2', to: 'mod2', active: st.stage === 2, cls: done(1) ? 'good' : 'c5' },
          { from: 'mod1', to: 'cv', active: st.stage === 2, cls: done(1) ? 'good' : 'c5' },
          { from: 'mod2', to: 'tune', active: st.stage === 2, cls: done(1) ? 'good' : 'c5' },
          { from: 'tune', to: 'mod1', active: st.stage === 2 && st.cvLoop, back: true, cls: 'c3', label: '調參回圈' },
          { from: 'cv', to: 'fit', active: st.stage === 3, cls: done(2) ? 'good' : 'c5' },
          { from: 'tune', to: 'cal', active: st.stage === 3, cls: done(2) ? 'good' : 'c5' },
          { from: 'fit', to: 'eval', active: st.stage === 4 || st.stage === 5, cls: done(3) ? 'good' : 'c5' },
          { from: 'cal', to: 'xai', active: st.stage === 4 || st.stage === 5, cls: done(3) ? 'good' : 'c5' },
          { from: 'te', to: 'eval', active: st.stage === 5, cls: done(4) ? 'good' : 'c4', label: '解封驗收' }
        ];
        const main = {
          type: 'network', slot: 'main', w: 1480, h: R.isEns ? 250 : 230,
          title: '監督式學習全流程圖（' + pipeName + '｜' + R.k + '-Fold CV）',
          layerLabels: ['1. 資料切分', '2. 專屬前處理', '3. 候選模型族', '4. 交叉驗證調參', '5. 重訓與校準', '6. 最終驗收解釋'],
          layers, edges
        };
        const side = {
          type: 'table', slot: 'side',
          title: R.k + '-Fold 各折驗證與測試對照',
          cols: [{ key: 'fd', label: '資料集 / 折次' }, { key: 'n', label: '筆數', num: true, digits: 0 }, { key: 'sc', label: metric + '（示意）', num: true, digits: 3 }],
          rows: R.cvScores.map((sc, i) => ({
            id: 'f' + i,
            cells: ['CV 第 ' + (i + 1) + ' 折', Math.floor(96 / R.k) + (i < 96 % R.k ? 1 : 0), st.stage >= 2 ? { v: f(sc, 3), cls: 'c0' } : null],
            hl: st.stage === 2 && st.cvLoop
          })).concat([{
            id: 'test',
            cells: ['封存測試集 (20%)', 24, st.stage >= 5 ? { v: f(R.testScore, 3), cls: 'good' } : { v: '封存中', cls: 'c4' }],
            hl: st.stage === 5
          }])
        };
        const bottom = {
          type: 'table', slot: 'bottom',
          title: '步驟與可用演算法對照（' + pipeName + '）',
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

      add(0, '1. 準備 X 與標籤 y', '監督式學習有標準答案 y。依「線性距離 / 樹規則 / 集成 / 不平衡」選對管線，從源頭決定前處理與調參策略。', [
        '目前選擇：' + pipeName + '｜指標：' + metric,
        '注意：本頁各分數是示意值；真正的 CV 實算請做 B13（K-Fold）與 B16（PR/ROC）'
      ]);
      st.stage = 1;
      add(1, '2. 切分與專屬前處理', R.isTree ? '切分 80/20 後，樹模型可免縮放直接保留原單位；線性與距離模型則必做標準化（A2）。' : R.isImb ? '分層切分保留少數類比例；SMOTE（A5）只能寫在 CV 訓練折內。' : '切分後在訓練集做 Z 分數標準化（A2）、Dummy 編碼（A4）與離群縮尾（A7）。', [
        '訓練開發集 = 96 筆｜封存測試集 = 24 筆'
      ]);
      st.stage = 2;
      add(2, '3a. K-Fold 交叉驗證', '在訓練集內切成 ' + R.k + ' 折輪流驗證，算出平均 ' + metric + ' 評估模型穩定度。', [
        R.k + '-Fold 平均 ' + metric + ' ≈ ' + f(R.meanCv, 3) + '（示意）'
      ]);
      st.cvLoop = true;
      add(4, '3b. 網格搜尋調參 (B13)', R.isTree ? '調整樹深 max_depth 與葉節點最小樣本，防止決策樹過擬合（B6/B14/B15）。' : R.isEns ? '調整樹數、學習率（B9 GBDT）或訓練多異質基模型（B12 Stacking）。' : '搜尋正則化強度 λ（B2）、k-NN 的 K（B4）或 SVM 的 C/Kernel（B10）。', [
        '橙色回流箭頭代表「調參 → 重算 CV → 挑最佳組合」'
      ]);
      st.cvLoop = false; st.stage = 3;
      add(5, '4. 全訓練集重訓', R.isImb ? '重訓後用驗證集 PR 曲線（B16）移動判定門檻，取代預設 0.50。' : R.isEns ? '以全部 96 筆訓練資料重訓隨機森林／GBDT 或 Meta-Learner。' : '以全部 96 筆訓練資料與最佳超參數算出最終模型。', [
        '資料量恢復為完整的 96 筆'
      ]);
      st.stage = 4;
      add(5, '5a. 過擬合與解釋檢查', R.isEns ? '集成模型準確率高但較黑箱，建議搭配 I1 SHAP 與排列重要度檢查特徵合理性。' : '比較訓練分數與 CV 分數落差（B11），確認無嚴重過擬合。', [
        'CV 平均 ' + metric + ' ≈ ' + f(R.meanCv, 3) + '（示意）'
      ]);
      st.stage = 5;
      add(6, '5b. 解封測試集驗收', '最後一次解封 24 筆測試集測出泛化表現（本頁示意值 ' + metric + ' ≈ ' + f(R.testScore, 3) + '）。', [
        'CV = ' + f(R.meanCv, 3) + ' vs 測試 = ' + f(R.testScore, 3)
      ]);
      add(6, '生成式與多元分類', '連續特徵的貝氏與線性判別見 B17（GNB / Fisher LDA）；三類別以上疾病分期見 B18（OvR 與 Softmax 聯合最佳化）。', [
        '可點擊下方對照表中的演算法編號直接跳轉體驗'
      ]);
      add(6, '常見踩雷：偷看測試集', '若看到測試集分數不滿意就回頭改超參數再重測，測試集就會淪為第二驗證集而喪失公正性！', [
        '調參一律只看 K-Fold CV（B13），測試集全程封存只開一次'
      ]);
      add(6, '四條管線選用速查', '需白箱解釋選「線性或單一樹」；追求最高預測力選「集成學習＋SHAP (I1/I2)」；罕病篩檢必走「不平衡管線」。', [
        '目前管線：' + pipeName
      ]);
      return steps;
    },
    keys(steps, rows, p) {
      const R = simulate(p);
      const nTrain = Math.round(120 * 0.8);
      return { k_folds: R.k, n_total: 120, n_train: nTrain, n_test: 120 - nTrain, fold_size: Math.floor(nTrain / R.k), fold_extra: nTrain % R.k };
    },
    explain(steps, rows, p) {
      const R = simulate(p);
      return [
        '監督式學習依模型家族分為「單一線性／距離」、「單一樹／規則」、「集成學習」與「不平衡醫療分類」四條不同流程。',
        '線性與距離模型必做標準化（A2）；樹模型可免縮放；集成模型常搭配 SHAP（I1）補回可解釋性；不平衡資料必做折內 SMOTE（A5）與門檻校正（B16）。',
        '不管哪一條管線，測試集都只能封存到最後驗收一次，不可看測試分數回頭調參。'
      ];
    },
    aistudio: {
      operators: ['Read CSV', 'Split Data', 'Cross Validation', 'Apply Model', 'Performance'],
      params: [['Split Data', '0.8 / 0.2'], ['Cross Validation › number of folds', p => String(p.folds)]],
      note: 'AI Studio 的 Cross Validation 內可自由替換單一模型或集成運算子（Random Forest / GBDT / Vote / Stacking）。',
      expect: (steps, rows, p) => {
        const R = simulate(p);
        return ['切分 96 / 24 筆；' + R.k + ' 折每折約 ' + Math.floor(96 / R.k) + ' 筆（分數為示意值）'];
      },
      python: 'from sklearn.model_selection import train_test_split, GridSearchCV\n# 依模型家族組合 Pipeline 與 GridSearchCV',
      confirmed: false
    }
  });
})();
