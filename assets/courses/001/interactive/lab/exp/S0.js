/* S0 AI 任務選型總覽（從醫療問題出發：依資料型態與有無標籤導向 S1–S9 與 A–J 群） */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = [
    { key: 'task', label: '臨床問題', type: 'text' },
    { key: 'dtype', label: '資料型態', type: 'text' },
    { key: 'has_y', label: '有標籤y', type: 'cat', levels: ['無', '有', '獎勵回饋'] },
    { key: 'pipe', label: '建議管線', type: 'text' }
  ];

  const CASES = [
    { id: 1, task: '糖尿病風險預測', dtype: '表格數值', has_y: 1, pipe: 'S1 → S2 (B1–B18)' },
    { id: 2, task: '慢性病患亞型分群', dtype: '無標籤表格', has_y: 0, pipe: 'S1 → S3 (C1–C12)' },
    { id: 3, task: '門診處方併用規則', dtype: '交易籃/序列', has_y: 0, pipe: 'S7 (D1–D4)' },
    { id: 4, task: '護理紀錄自動分類', dtype: '中文短文', has_y: 1, pipe: 'S5 (E1–E5)' },
    { id: 5, task: 'X光病灶影像辨識', dtype: '2D影像', has_y: 1, pipe: 'S4 CNN (F3/F6)' },
    { id: 6, task: '下季門診人次預測', dtype: '時間序列', has_y: 1, pipe: 'S6 (G1–G4)' },
    { id: 7, task: '衛教問答與智能助理', dtype: '文件+工具', has_y: 0, pipe: 'S5/S9 (H1–H9)' },
    { id: 8, task: '適應性新藥臨床試驗', dtype: '動態互動', has_y: 2, pipe: 'J2 UCB / J1 RL' }
  ];

  function simulate(rows, p) {
    const sc = p.scenario || 'tabular';
    const map = {
      tabular: { name: '表格預測 (監督式)', startId: 'S2', grp: 'B1–B18', val: 'K-Fold CV (B13)', idx: 0 },
      unsup: { name: '無標籤探索與處方籃', startId: 'S3 / S7', grp: 'C1–C12 · D1–D4', val: 'Silhouette (C9) / Kulc (D4)', idx: 1 },
      seq_img: { name: '時間序列與醫療影像', startId: 'S6 / S4', grp: 'G1–G4 · F3–F6', val: '滑動視窗 (G3) / Val Loss', idx: 4 },
      text_agent: { name: '病歷文字、LLM 與 Agent', startId: 'S5 / S9', grp: 'E1–E5 · H1–H9', val: 'Recall@K / Rerank / 護欄', idx: 6 },
      rl: { name: '互動試錯與適應性試驗 (RL)', startId: 'J1 / J2', grp: 'J1 Q-Learning · J2 UCB', val: '累積獎勵 / 累積遺憾 Regret', idx: 7 }
    };
    const info = map[sc] || map.tabular;
    return Object.assign({ sc, nCases: rows.length, nGroups: 10 }, info);
  }

  LAB.register({
    id: 'S0', group: 'S', title: 'AI 任務選型總覽',
    module: { name: '課程總覽地圖', url: '../m1/' },
    goal: '拿到一份醫療資料時第一步該做什麼？依「資料型態」與「有無標準答案標籤 y」一路分流，快速鎖定對應的 S1–S9 流程管線與 A–J 群 80 個演算法。',
    data: {
      name: 'task_router',
      scenario: '8 種常見智慧醫療 AI 實戰問題，示範從資料型態與學習目標路由到正確演算法管線',
      columns: COLS,
      small: () => CASES.map(c => Object.assign({}, c))
    },
    params: [
      {
        key: 'scenario', label: '醫療任務情境', type: 'choice', value: 'tabular', options: [
          { v: 'tabular', label: '表格預測 (S1→S2)' },
          { v: 'unsup', label: '分群/異常/處方 (S3/S7)' },
          { v: 'seq_img', label: '時序與影像 (S6/S4)' },
          { v: 'text_agent', label: 'NLP / LLM / Agent (S5/S9)' },
          { v: 'rl', label: '互動試錯決策 (J1/J2)' }
        ]
      }
    ],
    pseudo: [
      '1. 盤點原始資料型態與商業／臨床問題',
      '2. 判斷學習範式：有標籤 / 無標籤 / 獎勵',
      '3. 依模型家族規劃無洩漏前處理 (S1)',
      '4. 路由至對應核心演算法族 (A–J 群)',
      '5. 選對驗證機制（CV / 時序窗 / 遺憾）',
      '6. 臨床解釋、門檻校準與上線監控 (S8)'
    ],
    build(rows, p) {
      const R = simulate(rows, p), steps = [];

      const ROUTE_ROWS = [
        { id: 'r0', st: '前處理基底', pipe: 'S1', alg: 'A1 補值 · A2 縮放 · A4 編碼 · A7 縮尾 · A8 偏態 · A9 VIF', use: '幾乎所有表格任務起點，嚴守 Train fit → Test transform' },
        { id: 'r1', st: '表格預測', pipe: 'S2', alg: 'B1–B6 基礎 · B7–B12 集成 · B17 LDA · B18 多元', use: '有標準答案 y（分類或迴歸），搭配 B13 CV 與 B16 ROC/PR' },
        { id: 'r2', st: '無標籤探索', pipe: 'S3', alg: 'C1–C4/C11 分群 · C5–C6 降維 · C7/C8/C12 異常', use: '沒有標籤 y，找病人亞型、壓縮高維或揪出極端個案' },
        { id: 'r3', st: '關聯與序列', pipe: 'S7', alg: 'D1 Apriori · D2 FP-Growth · D3 PrefixSpan · D4 Kulc', use: '處方籃共現、跨次就醫時間軌跡與互斥負關聯規則' },
        { id: 'r4', st: '深度與影像', pipe: 'S4', alg: 'F1 反向傳播 · F2 Adam · F3 CNN · F4 LSTM · F5 AE · F6 BN/Drop', use: '影像、長序列或複雜非線性高維表示學習' },
        { id: 'r5', st: '時間序列', pipe: 'S6', alg: 'G1 指數平滑 · G2 ARIMA · G3 滑動驗證 · G4 STL/Lag', use: '嚴禁隨機打亂，依時間軸往前滾動預測未來期數' },
        { id: 'r6', st: 'NLP 與 LLM', pipe: 'S5 / S9', alg: 'E1–E5 詞袋/BM25 · H1–H7 Transformer/RAG · H8 Agent · H9 DPO', use: '自由書寫護理紀錄分類、衛教 RAG 與自主工具呼叫' },
        { id: 'r7', st: '落地與試錯', pipe: 'S8 / J', alg: 'I1 SHAP · I2 LIME/反事實 · J1 Q-Learning · J2 UCB 老虎機', use: '上線解釋、反事實處方、飄移監控與動態適應性試驗' }
      ];

      function views(st) {
        const done = k => st.stage > k;
        const act = k => st.stage === k;
        const clsOf = k => act(k) ? 'hl' : (done(k) ? 'good' : 'c5');
        const isTab = R.sc === 'tabular', isUns = R.sc === 'unsup', isSeq = R.sc === 'seq_img', isTxt = R.sc === 'text_agent', isRl = R.sc === 'rl';

        const layers = [
          [
            { id: 'q', label: '1a. 臨床與商業問題', value: R.name, shape: 'box', w: 146, cls: clsOf(0), hl: act(0), sub: '先定義成功指標' },
            { id: 'dt', label: '1b. 原始資料型態', value: isTab ? '表格 X, y' : isUns ? '表格 / 處方籃' : isSeq ? '時序 / 影像' : isTxt ? '文本 / 知識庫' : '動態環境回饋', shape: 'box', w: 146, cls: clsOf(0), hl: act(0), sub: '決定前處理與骨幹' }
          ],
          [
            { id: 'sup', label: '2a. 有標籤 y (監督)', value: '分類 / 迴歸 / 影像', shape: 'box', w: 142, cls: (isTab || isSeq) ? clsOf(1) : 'c5', hl: act(1) && (isTab || isSeq), dim: !(isTab || isSeq), sub: 'S2 · S4 · S6 管線' },
            { id: 'uns', label: '2b. 無標籤 (探勘/生成)', value: '分群 / 關聯 / RAG', shape: 'box', w: 142, cls: (isUns || isTxt) ? clsOf(1) : 'c5', hl: act(1) && (isUns || isTxt), dim: !(isUns || isTxt), sub: 'S3 · S5 · S7 · S9' },
            { id: 'rl0', label: '2c. 獎勵回饋 (試錯)', value: '探索 vs 利用', shape: 'box', w: 142, cls: isRl ? clsOf(1) : 'c5', hl: act(1) && isRl, dim: !isRl, sub: 'J1 路徑 · J2 試驗' }
          ],
          [
            { id: 'p1', label: '3a. 表格清洗前處理', value: 'S1 管線', shape: 'box', w: 142, cls: (isTab || isUns) ? clsOf(2) : 'c5', hl: act(2) && (isTab || isUns), dim: !(isTab || isUns), sub: 'A1–A9 防洩漏封裝' },
            { id: 'p2', label: '3b. 專屬型態轉換', value: isSeq ? 'G4 Lag / 增強' : isTxt ? 'E1/H1 切詞切塊' : '狀態與獎勵定義', shape: 'box', w: 142, cls: (isSeq || isTxt || isRl) ? clsOf(2) : 'c5', hl: act(2) && (isSeq || isTxt || isRl), dim: !(isSeq || isTxt || isRl), sub: '時序/像素/Token/MDP' }
          ],
          [
            { id: 'm1', label: '4a. 傳統 ML 與探勘', value: isTab ? 'B1–B18' : 'C1–C12 / D1–D4', shape: 'box', w: 142, cls: (isTab || isUns) ? clsOf(3) : 'c5', hl: act(3) && (isTab || isUns), dim: !(isTab || isUns), sub: '表格最穩健省資料' },
            { id: 'm2', label: '4b. 深度學習與時序', value: isSeq ? 'F1–F6 / G1–G4' : 'E1–E5 / H1–H9', shape: 'box', w: 142, cls: (isSeq || isTxt) ? clsOf(3) : 'c5', hl: act(3) && (isSeq || isTxt), dim: !(isSeq || isTxt), sub: '非結構化與生成 AI' },
            { id: 'm3', label: '4c. 線上強化學習', value: 'J1 / J2', shape: 'box', w: 142, cls: isRl ? clsOf(3) : 'c5', hl: act(3) && isRl, dim: !isRl, sub: 'Q-Learning · UCB1' }
          ],
          [
            { id: 'v1', label: '5a. 嚴格防洩漏驗證', value: R.val, shape: 'box', w: 146, cls: clsOf(4), hl: act(4), sub: '依資料結構選對指標' },
            { id: 'v2', label: '5b. 決策門檻與安全', value: isTxt ? 'Guardrail 護欄' : 'B16 成本門檻', shape: 'box', w: 146, cls: clsOf(4), hl: act(4), sub: '平衡漏診與誤報代價' }
          ],
          [
            { id: 'd1', label: '6a. 可解釋與反事實', value: 'S8 (I1 / I2)', shape: 'box', w: 146, cls: clsOf(5), hl: act(5), sub: 'SHAP · LIME · 反事實' },
            { id: 'd2', label: '6b. 監控重訓與適應', value: 'MLOps + J2 試驗', shape: 'box', w: 146, cls: clsOf(5), hl: act(5), sub: 'PSI 飄移偵測＋滾動' }
          ]
        ];

        const activeBranch = (isTab || isSeq) ? 'sup' : isRl ? 'rl0' : 'uns';
        const activePrep = (isTab || isUns) ? 'p1' : 'p2';
        const activeMod = (isTab || isUns) ? 'm1' : isRl ? 'm3' : 'm2';

        const edges = [
          { from: 'q', to: activeBranch, active: st.stage === 1, cls: done(0) ? 'good' : 'c5' },
          { from: 'dt', to: activeBranch, active: st.stage === 1, cls: done(0) ? 'good' : 'c5' },
          { from: activeBranch, to: activePrep, active: st.stage === 2, cls: done(1) ? 'good' : 'c5' },
          { from: activePrep, to: activeMod, active: st.stage === 3, cls: done(2) ? 'good' : 'c5' },
          { from: activeMod, to: 'v1', active: st.stage === 4, cls: done(3) ? 'good' : 'c5' },
          { from: activeMod, to: 'v2', active: st.stage === 4, cls: done(3) ? 'good' : 'c5' },
          { from: 'v1', to: 'd1', active: st.stage === 5, cls: done(4) ? 'good' : 'c5' },
          { from: 'v2', to: 'd2', active: st.stage === 5, cls: done(4) ? 'good' : 'c5' }
        ];

        const main = {
          type: 'network', slot: 'main', w: 1480, h: 260,
          title: '醫療 AI 任務選型總覽圖（當前情境：' + R.name + ' → 推薦 ' + R.startId + '）',
          layerLabels: ['1. 問題與資料', '2. 學習範式', '3. 前處理準備', '4. 核心演算法族', '5. 驗證與門檻', '6. 解釋與落地'],
          layers, edges
        };

        const side = {
          type: 'table', slot: 'side',
          title: '8 大臨床問題路由速查（點擊編號可直達）',
          cols: [{ key: 't', label: '臨床問題' }, { key: 'd', label: '資料型態' }, { key: 'p', label: '推薦管線' }],
          rows: rows.map((r, i) => ({
            id: r.id,
            cells: [r.task, r.dtype, { v: r.pipe, cls: i === R.idx ? 'good' : 'c0' }],
            hl: i === R.idx
          }))
        };

        const bottom = {
          type: 'table', slot: 'bottom',
          title: '全站 10 大主題與 80 個實驗導覽地圖（點擊演算法編號可直接開啟實驗！）',
          cols: [{ key: 'st', label: '領域' }, { key: 'p', label: '流程' }, { key: 'alg', label: '代表演算法（可點擊）' }, { key: 'use', label: '適用時機' }],
          rows: ROUTE_ROWS.map((rr, idx) => ({
            id: rr.id,
            cells: [rr.st, { v: rr.pipe, cls: 'hl' }, rr.alg, rr.use],
            hl: (isTab && idx <= 1) || (isUns && (idx === 2 || idx === 3)) || (isSeq && (idx === 4 || idx === 5)) || (isTxt && idx === 6) || (isRl && idx === 7)
          }))
        };
        return [main, side, bottom];
      }

      const st = { stage: 0 };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '1. 從問題與資料出發', '做 AI 專案千萬不要一上來就套最紅的模型！第一步先問：我的資料是表格、影像、時間序列、文字還是動態互動？', [
        '當前演練情境：' + R.name + '（全站共涵蓋 10 大領域、80 個演算法）'
      ]);
      st.stage = 1;
      add(1, '2. 判斷有無標準答案 y', '有明確歷史結果 y → 走監督式學習（S2/S4/S6）；無標籤找結構 → 非監督/關聯（S3/S7）；邊互動邊拿獎勵 → 強化學習（J1/J2）。', [
        '推薦切入流程：' + R.startId + '｜對應演算法群：' + R.grp
      ]);
      st.stage = 2;
      add(2, '3. 專屬前處理防洩漏', '表格資料進 S1（補值 A1、縮尾 A7、偏態 A8、共線 VIF A9）；時序切 Lag 窗（G4）；文字斷詞或切塊（E1/H1/H6）。', [
        '最高鐵律：所有統計量只能在訓練集內計算，絕不偷看驗證與測試集'
      ]);
      st.stage = 3;
      add(3, '4. 挑選核心演算法族', '表格先比線性/樹與 GBDT（B1–B18）；影像用 CNN（F3/F6）；病歷問答用 RAG+Rerank+Agent（H6/H8/H9）；線上試驗用 UCB（J2）。', [
        '基線原則：永遠先建立簡單快速的基線模型，再逐步升級複雜架構'
      ]);
      st.stage = 4;
      add(4, '5. 選對驗證與評估指標', '一般表格用分層 K-Fold（B13）；時間序列強制用滑動視窗（G3）；不平衡篩檢改看 PR-AUC（B16）；強化學習看累積遺憾（J2）。', [
        '本情境建議驗證：' + R.val
      ]);
      st.stage = 5;
      add(5, '6. 解釋、落地與監控', '模型上線不是結束！透過 S8 結合 SHAP（I1）、LIME 與反事實處方（I2）讓醫師信任，並用 PSI 監控與 J2 適應性測試持續演化。', [
        '完整生命週期：S0 選型 → S1 前處理 → S2–S7/S9 建模 → S8 上線監控'
      ]);
      add(5, '常見選型誤區 1：硬套深度學習', '只有幾百筆表格健檢資料卻硬套深度神經網路，常比 B7 隨機森林或 B9 GBDT 更容易過擬合且難解釋。', [
        '表格首選：B3 邏輯迴歸基線 → B7/B9 樹集成 → I1/I2 可解釋分析'
      ]);
      add(5, '常見選型誤區 2：切分洩漏', '時間序列用了隨機 K-Fold、或在切分前就先做 SMOTE/標準化，都會讓驗證分數虛高，一上線準確率就雪崩。', [
        '對應防雷實驗：S1 防洩漏管線、B13 折內標準化、G3 時間序滾動驗證'
      ]);
      add(5, '常見選型誤區 3：只看準確率', '面對 5% 罕見疾病若無腦全猜陰性也有 95% 準確率！務必改看 PR-AUC、Recall 與醫療成本門檻（B16）。', [
        '不平衡任務必走 S2「不平衡醫療分類」管線（A5 SMOTE + B16 PR 門檻）'
      ]);
      add(5, '互動導覽地圖用法', '下方表格中每一個淺綠色編號（如 S1、B9、D3、H9、J2）都可以直接點擊跳轉到該互動實驗，立即動手實作！', [
        '試著切換上方 5 種醫療任務情境，觀察整條路徑如何動態切換'
      ]);

      return steps;
    },
    keys(steps, rows, p) {
      const R = simulate(rows, p);
      return { n_cases: R.nCases, n_groups: R.nGroups, n_routes: 8, active_idx: R.idx, n_steps: steps.length };
    },
    explain(steps, rows, p) {
      const R = simulate(rows, p);
      return [
        '面對任何智慧醫療 AI 題目，先依「資料型態 × 有無標籤 y」路由：表格預測走 S1→S2、無標籤走 S3/S7、時序影像走 S6/S4、文字生成走 S5/S9、動態試錯決策走 J1/J2。',
        '本情境（' + R.name + '）對應流程為 ' + R.startId + '，建議使用 ' + R.val + ' 進行無洩漏評估。',
        '下方對照表中的所有實驗編號皆已升級為可點擊連結，可直接從全局地圖一鍵進入各演算法互動實驗。'
      ];
    },
    aistudio: {
      operators: ['Read CSV', 'Auto Model / Turbo Prep', 'Cross Validation / Sliding Validation', 'Explain Predictions'],
      params: [['Task Type', p => simulate(CASES, p).name]],
      note: '在 AI Studio 中可透過 Auto Model 快速檢驗多種監督／分群模型基線，再依本頁 S1–S9 流程圖精修防洩漏管線。',
      expect: (steps, rows, p) => ['鎖定對應管線：' + simulate(rows, p).startId + '（' + simulate(rows, p).grp + '）'],
      python: '# 選型口訣：表格→sklearn/xgboost｜時序→statsmodels｜深度/LLM→PyTorch/transformers｜RL→gymnasium',
      confirmed: false
    }
  });
})();
