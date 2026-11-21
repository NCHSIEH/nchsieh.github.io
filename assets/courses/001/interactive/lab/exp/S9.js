/* S9 AI Agent 工作流程（ReAct 工具迴圈／Multi-Agent 協作／混合工作流 3 條管線） */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = [
    { key: 'turn', label: '輪次', type: 'int' },
    { key: 'phase', label: '階段', type: 'cat', levels: ['Thought', 'Action', 'Observation', 'Final'] },
    { key: 'tool', label: '工具/角色', type: 'text' },
    { key: 'tokens', label: 'Token數', type: 'int' }
  ];

  function makeRows(seed) {
    const r = LAB.rng(9900 + seed);
    return [
      { id: 1, turn: 1, phase: 'Thought', tool: '拆解問題規劃', tokens: 45 + Math.round(r() * 10) },
      { id: 2, turn: 1, phase: 'Action', tool: '查詢病歷 SQL', tokens: 28 + Math.round(r() * 8) },
      { id: 3, turn: 1, phase: 'Observation', tool: 'HbA1c=7.8%', tokens: 36 + Math.round(r() * 8) },
      { id: 4, turn: 2, phase: 'Action', tool: 'RAG 查衛教指引', tokens: 62 + Math.round(r() * 12) },
      { id: 5, turn: 2, phase: 'Observation', tool: '取得第3段建議', tokens: 84 + Math.round(r() * 15) },
      { id: 6, turn: 3, phase: 'Final', tool: '彙整回覆醫師', tokens: 95 + Math.round(r() * 15) }
    ];
  }

  function simulate(rows, p) {
    const mode = p.mode || 'react';
    const isMulti = mode === 'multi';
    const isMix = mode === 'workflow';
    const totTokens = M.sum(rows.map(r => r.tokens));
    return { mode, isMulti, isMix, nTurns: 3, totTokens, nTools: 3 };
  }

  LAB.register({
    id: 'S9', group: 'S', title: 'AI Agent 工作流程',
    module: { name: 'M8 生成式 AI 應用', url: '../m8/' },
    goal: '透過動畫架構圖看懂 AI Agent 如何從單純「一問一答」進化成能自主規劃、呼叫工具、多代理協作與人工把關的智能工作流程。',
    data: {
      name: 'agent_flow',
      scenario: '門診輔助情境：查詢病人糖化血色素並比對衛教指引，追蹤 Agent 3 輪思考與呼叫工具紀錄',
      columns: COLS,
      small: makeRows
    },
    params: [
      { key: 'mode', label: 'Agent 架構管線', type: 'choice', value: 'react', options: [
        { v: 'react', label: 'ReAct 單代理工具迴圈' },
        { v: 'multi', label: 'Multi-Agent 多代理協作' },
        { v: 'workflow', label: '混合工作流 (Router+把關)' }
      ] }
    ],
    pseudo: [
      '1. 接收任務並載入系統提示詞與記憶',
      '2. LLM 推理拆解子步驟 (Thought)',
      '3. 決定呼叫工具或指派專才代理 (Action)',
      '4. 取得外部真實結果 (Observation)',
      '5. 若資訊不足則回圈繼續推理（設上限）',
      '6. 通過安全檢核與人工把關後輸出答案'
    ],
    build(rows, p) {
      const R = simulate(rows, p), steps = [];
      const pipeName = R.isMulti ? 'Multi-Agent 多代理協作' : R.isMix ? '混合工作流 (Router+把關)' : 'ReAct 單代理工具迴圈';

      const ALGO_ROWS = R.isMulti ? [
        { id: 's0', st: '1. 接收複雜任務', alg: 'Prompt + 短期記憶', use: '例如「整理近半年病歷並比對最新指南」' },
        { id: 's1', st: '2. 協調者拆解', alg: 'Coordinator LLM (H5)', use: '把大任務拆成獨立子任務分派出去' },
        { id: 's2', st: '3. 平行專才代理', alg: '資料 / RAG(H6) / 程式 Agent', use: '各自擁有專屬工具與系統提示，互不干擾' },
        { id: 's3', st: '4. 審查與彙整', alg: 'Critic Agent 交叉查核', use: '檢查各代理回傳是否矛盾或有幻覺' },
        { id: 's4', st: '5. 交付最終報告', alg: '結構化輸出＋引用來源', use: '附帶資料來源供臨床人員覆核' }
      ] : R.isMix ? [
        { id: 's0', st: '1. 意圖分類路由', alg: 'Router (E2 / H5 小模型)', use: '把簡單查詢與高風險決策分流，省錢又快' },
        { id: 's1', st: '2. 結構化抽取', alg: 'JSON Schema / Function Call', use: '強制 LLM 輸出固定欄位，方便接資料庫' },
        { id: 's2', st: '3. 程式與規則檢核', alg: 'Guardrail 確定性檢查', use: '用程式檢查劑量範圍、格式與個資遮罩' },
        { id: 's3', st: '4. 人工審核節點', alg: 'Human-in-the-Loop', use: '高風險操作（如開立建議）須經醫師按確認' },
        { id: 's4', st: '5. 安全執行動作', alg: '寫入紀錄 / 回覆病人', use: '兼具確定性安全與 LLM 彈性' }
      ] : [
        { id: 's0', st: '1. 目標與記憶', alg: 'System Prompt + Memory', use: '定義角色邊界、可用工具清單與對話記憶' },
        { id: 's1', st: '2. 推理規劃 Thought', alg: 'LLM (H3/H5 CoT 思維鏈)', use: '先想「我還缺什麼資料」，不直接瞎猜' },
        { id: 's2', st: '3. 呼叫工具 Action', alg: 'RAG(H6) / SQL / 計算機', use: '輸出標準工具參數去查真實外部系統' },
        { id: 's3', st: '4. 觀察回饋 Obs', alg: '回傳結果→檢查是否足夠', use: '不足就橙色回流再想一輪（設 max_steps 防無窮）' },
        { id: 's4', st: '5. 最終回答', alg: 'H5 解碼生成 Final Answer', use: '依據真實觀察結果彙整，大幅減少幻覺' }
      ];

      function views(st) {
        const done = k => st.stage > k;
        const act = k => st.stage === k;
        const clsOf = k => act(k) ? 'hl' : (done(k) ? 'good' : 'c5');
        const layers = R.isMulti ? [
          [
            { id: 'n0a', label: '1a. 複雜臨床任務', value: '多源問題', shape: 'box', w: 138, cls: clsOf(0), hl: act(0), sub: '需數據+指引+計算' },
            { id: 'n0b', label: '1b. 共享任務記憶', value: 'Shared State', shape: 'box', w: 138, cls: clsOf(0), hl: act(0), sub: '跨代理狀態同步' }
          ],
          [
            { id: 'n1a', label: '2a. 協調者拆解', value: 'Coordinator', shape: 'box', w: 138, cls: clsOf(1), hl: act(1), sub: '拆成獨立子任務' },
            { id: 'n1b', label: '2b. 角色權限分派', value: '最小權限', shape: 'box', w: 138, cls: clsOf(1), hl: act(1), sub: '各代理僅配專屬工具' }
          ],
          [
            { id: 'a1', label: '3a. 資料 Agent', value: '查病歷 SQL', shape: 'box', w: 138, cls: clsOf(2), hl: act(2), sub: '唯讀查詢檢驗值' },
            { id: 'a2', label: '3b. 文獻 Agent', value: 'RAG 檢索', shape: 'box', w: 138, cls: clsOf(2), hl: act(2), sub: 'H6 查臨床照護指引' },
            { id: 'a3', label: '3c. 程式 Agent', value: 'Python 沙盒', shape: 'box', w: 138, cls: clsOf(2), hl: act(2), sub: 'H8 精確算風險指標' }
          ],
          [
            { id: 'o1', label: '4a. 結構化檢驗值', value: 'HbA1c=7.8%', shape: 'box', w: 138, cls: clsOf(3), hl: act(3), sub: '附資料時間戳記' },
            { id: 'o2', label: '4b. 指引段落與公式', value: '第3段+風險比', shape: 'box', w: 138, cls: clsOf(3), hl: act(3), sub: '附文獻出處編號' }
          ],
          [
            { id: 'n3a', label: '5a. Critic 交叉查核', value: '檢查矛盾/幻覺', shape: 'box', w: 140, cls: clsOf(3), hl: act(3), sub: '數值與指引是否一致' },
            { id: 'n3b', label: '5b. 缺漏退回補查', value: st.loopBack ? '退回重查' : '通過查核', shape: 'box', w: 140, cls: st.loopBack ? 'hl' : clsOf(3), hl: st.loopBack, sub: '設最大輪數防死結' }
          ],
          [
            { id: 'n4a', label: '6a. 綜合臨床報告', value: st.stage >= 4 ? R.totTokens + ' tok' : '待產出', shape: 'box', w: 140, cls: clsOf(4), hl: act(4), sub: '整合多代理證據' },
            { id: 'n4b', label: '6b. 醫師最終簽核', value: '附完整溯源', shape: 'box', w: 140, cls: clsOf(4), hl: act(4), sub: '展開 Trace 供稽核' }
          ]
        ] : R.isMix ? [
          [
            { id: 'n0a', label: '1a. 意圖分類路由', value: 'Router 分流', shape: 'box', w: 138, cls: clsOf(0), hl: act(0), sub: 'E2/H5 判斷任務風險' },
            { id: 'n0b', label: '1b. 輸入去識別護欄', value: 'PII 遮罩', shape: 'box', w: 138, cls: clsOf(0), hl: act(0), sub: '攔截個資與注入攻擊' }
          ],
          [
            { id: 'n1a', label: '2a. 結構化抽取', value: 'JSON Schema', shape: 'box', w: 138, cls: clsOf(1), hl: act(1), sub: '強制固定欄位型別' },
            { id: 'n1b', label: '2b. 工具參數生成', value: 'Function Call', shape: 'box', w: 138, cls: clsOf(1), hl: act(1), sub: 'H8 產生標準 API 參數' }
          ],
          [
            { id: 'n2a', label: '3a. 外部系統查詢', value: '唯讀 SQL/RAG', shape: 'box', w: 138, cls: clsOf(2), hl: act(2), sub: '取得真實病歷與指引' },
            { id: 'n2b', label: '3b. 確定性規則檢核', value: 'Guardrail', shape: 'box', w: 138, cls: clsOf(2), hl: act(2), sub: '程式檢查劑量與格式' }
          ],
          [
            { id: 'n3a', label: '4a. 格式/數值驗證', value: st.loopBack ? '異常重試' : '通過驗證', shape: 'box', w: 138, cls: st.loopBack ? 'hl' : clsOf(2), hl: st.loopBack, sub: '不合規即退回重抽' },
            { id: 'n3b', label: '4b. 風險等級分流', value: '低風險 vs 高風險', shape: 'box', w: 138, cls: clsOf(3), hl: act(3), sub: '高風險必走人工審核' }
          ],
          [
            { id: 'n4a', label: '5a. 人工把關節點', value: 'Human-in-Loop', shape: 'box', w: 140, cls: clsOf(3), hl: act(3), sub: '醫師檢視證據按確認' },
            { id: 'n4b', label: '5b. 審核修改回饋', value: '紀錄修正原因', shape: 'box', w: 140, cls: clsOf(3), hl: act(3), sub: '回饋微調或規則庫' }
          ],
          [
            { id: 'n5a', label: '6a. 安全執行動作', value: st.stage >= 4 ? '已核准執行' : '待核准', shape: 'box', w: 140, cls: clsOf(4), hl: act(4), sub: '寫入醫囑或發送衛教' },
            { id: 'n5b', label: '6b. 稽核日誌留存', value: 'Audit Log', shape: 'box', w: 140, cls: clsOf(4), hl: act(4), sub: '完整保留輸入與決策' }
          ]
        ] : [
          [
            { id: 'n0a', label: '1a. 使用者任務', value: '臨床提問', shape: 'box', w: 138, cls: clsOf(0), hl: act(0), sub: '查檢驗並比對指引' },
            { id: 'n0b', label: '1b. 系統與記憶', value: 'System+Memory', shape: 'box', w: 138, cls: clsOf(0), hl: act(0), sub: '載入可用工具宣告' }
          ],
          [
            { id: 'n1a', label: '2a. 推理 Thought', value: 'CoT 思維鏈', shape: 'box', w: 138, cls: clsOf(1), hl: act(1), sub: 'H5 盤點已知與缺口' },
            { id: 'n1b', label: '2b. 工具機率路由', value: 'Softmax(z/τ)', shape: 'box', w: 138, cls: clsOf(1), hl: act(1), sub: 'H8 挑選最高分動作' }
          ],
          [
            { id: 't1', label: '3a. 工具: 病歷 SQL', value: '查檢驗數據', shape: 'box', w: 138, cls: clsOf(2), hl: act(2), sub: 'SELECT HbA1c=7.8%' },
            { id: 't2', label: '3b. 工具: 衛教 RAG', value: '查照護指引', shape: 'box', w: 138, cls: clsOf(2), hl: act(2), sub: 'H6 混合檢索第3段' },
            { id: 't3', label: '3c. 工具: Python', value: '精確計算機', shape: 'box', w: 138, cls: clsOf(2), hl: act(2), sub: '避免 LLM 心算錯誤' }
          ],
          [
            { id: 'ob1', label: '4a. 觀察結果 Obs', value: st.stage >= 3 ? '取得真實回傳' : '待回傳', shape: 'box', w: 138, cls: clsOf(3), hl: act(3), sub: '外部系統結構化回傳' },
            { id: 'ob2', label: '4b. 寫回 Context', value: '追加至提示詞', shape: 'box', w: 138, cls: clsOf(3), hl: act(3), sub: '累積 Token 供下輪讀' }
          ],
          [
            { id: 'chk1', label: '5a. 資訊完備判斷', value: st.loopBack ? '尚缺衛教→續查' : '資料已齊全', shape: 'box', w: 140, cls: st.loopBack ? 'hl' : clsOf(3), hl: st.loopBack, sub: '決定再跑一輪或 finish' },
            { id: 'chk2', label: '5b. 步數上限護欄', value: 'max_steps ≤ 5', shape: 'box', w: 140, cls: clsOf(3), hl: act(3), sub: '防工具失敗無窮迴圈' }
          ],
          [
            { id: 'n4a', label: '6a. 呼叫 finish', value: st.stage >= 4 ? R.totTokens + ' tok' : '待生成', shape: 'box', w: 140, cls: clsOf(4), hl: act(4), sub: '停止工具迴圈' },
            { id: 'n4b', label: '6b. 最終臨床回答', value: '附數據與出處', shape: 'box', w: 140, cls: clsOf(4), hl: act(4), sub: '有憑有據大幅降幻覺' }
          ]
        ];
        const edges = R.isMulti ? [
          { from: 'n0a', to: 'n1a', active: st.stage === 1, cls: done(0) ? 'good' : 'c5' },
          { from: 'n0b', to: 'n1b', active: st.stage === 1, cls: done(0) ? 'good' : 'c5' },
          { from: 'n1a', to: 'a1', active: st.stage === 2, cls: done(1) ? 'good' : 'c5' },
          { from: 'n1a', to: 'a2', active: st.stage === 2, cls: done(1) ? 'good' : 'c5' },
          { from: 'n1b', to: 'a3', active: st.stage === 2, cls: done(1) ? 'good' : 'c5' },
          { from: 'a1', to: 'o1', active: st.stage === 3, cls: done(2) ? 'good' : 'c5' },
          { from: 'a2', to: 'o2', active: st.stage === 3, cls: done(2) ? 'good' : 'c5' },
          { from: 'a3', to: 'o2', active: st.stage === 3, cls: done(2) ? 'good' : 'c5' },
          { from: 'o1', to: 'n3a', active: st.stage === 3, cls: done(2) ? 'good' : 'c5' },
          { from: 'o2', to: 'n3b', active: st.stage === 3, cls: done(2) ? 'good' : 'c5' },
          { from: 'n3b', to: 'n1b', active: st.stage === 3 && st.loopBack, back: true, cls: 'c3', label: '退回補查' },
          { from: 'n3a', to: 'n4a', active: st.stage === 4, cls: done(3) ? 'good' : 'c5' },
          { from: 'n3b', to: 'n4b', active: st.stage === 4, cls: done(3) ? 'good' : 'c5' }
        ] : R.isMix ? [
          { from: 'n0a', to: 'n1a', active: st.stage === 1, cls: done(0) ? 'good' : 'c5' },
          { from: 'n0b', to: 'n1b', active: st.stage === 1, cls: done(0) ? 'good' : 'c5' },
          { from: 'n1a', to: 'n2a', active: st.stage === 2, cls: done(1) ? 'good' : 'c5' },
          { from: 'n1b', to: 'n2b', active: st.stage === 2, cls: done(1) ? 'good' : 'c5' },
          { from: 'n2a', to: 'n3a', active: st.stage === 2, cls: done(1) ? 'good' : 'c5' },
          { from: 'n2b', to: 'n3b', active: st.stage === 3, cls: done(2) ? 'good' : 'c5' },
          { from: 'n3a', to: 'n1a', active: st.stage === 2 && st.loopBack, back: true, cls: 'c3', label: '格式重試' },
          { from: 'n3a', to: 'n4a', active: st.stage === 3, cls: done(2) ? 'good' : 'c5' },
          { from: 'n3b', to: 'n4b', active: st.stage === 3, cls: done(2) ? 'good' : 'c5' },
          { from: 'n4a', to: 'n5a', active: st.stage === 4, cls: done(3) ? 'good' : 'c5' },
          { from: 'n4b', to: 'n5b', active: st.stage === 4, cls: done(3) ? 'good' : 'c5' }
        ] : [
          { from: 'n0a', to: 'n1a', active: st.stage === 1, cls: done(0) ? 'good' : 'c5' },
          { from: 'n0b', to: 'n1b', active: st.stage === 1, cls: done(0) ? 'good' : 'c5' },
          { from: 'n1a', to: 't1', active: st.stage === 2, cls: done(1) ? 'good' : 'c5' },
          { from: 'n1b', to: 't2', active: st.stage === 2, cls: done(1) ? 'good' : 'c5' },
          { from: 'n1b', to: 't3', active: st.stage === 2, cls: done(1) ? 'good' : 'c5' },
          { from: 't1', to: 'ob1', active: st.stage === 3, cls: done(2) ? 'good' : 'c5' },
          { from: 't2', to: 'ob1', active: st.stage === 3, cls: done(2) ? 'good' : 'c5' },
          { from: 't3', to: 'ob2', active: st.stage === 3, cls: done(2) ? 'good' : 'c5' },
          { from: 'ob1', to: 'chk1', active: st.stage === 3, cls: done(2) ? 'good' : 'c5' },
          { from: 'ob2', to: 'chk2', active: st.stage === 3, cls: done(2) ? 'good' : 'c5' },
          { from: 'chk1', to: 'n1a', active: st.stage === 3 && st.loopBack, back: true, cls: 'c3', label: 'ReAct 迴圈' },
          { from: 'chk1', to: 'n4a', active: st.stage === 4, cls: done(3) ? 'good' : 'c5' },
          { from: 'chk2', to: 'n4b', active: st.stage === 4, cls: done(3) ? 'good' : 'c5' }
        ];
        const main = {
          type: 'network', slot: 'main', w: 1480, h: R.isMix ? 230 : 250,
          title: 'AI Agent 架構流程圖（' + pipeName + '）',
          layerLabels: R.isMulti ? ['1. 任務與記憶', '2. 協調者拆解', '3. 平行專才代理', '4. 結構化回傳', '5. 審查與補查', '6. 報告交付簽核']
            : R.isMix ? ['1. 路由與護欄', '2. 結構化抽取', '3. 查詢與規則檢核', '4. 驗證與分流', '5. 人工把關', '6. 安全執行留存']
            : ['1. 任務與記憶', '2. 推理與路由', '3. 外部工具呼叫', '4. 觀察寫回', '5. 完備性與上限', '6. 最終回答輸出'],
          layers, edges
        };
        const traceRows = R.isMulti ? [
          { turn: 1, phase: 'Thought', tool: 'Coordinator 拆解3子任務', tokens: rows[0].tokens },
          { turn: 1, phase: 'Action', tool: '平行：SQL+RAG+Python', tokens: rows[1].tokens },
          { turn: 1, phase: 'Observation', tool: '彙整 HbA1c 與指引段落', tokens: rows[2].tokens },
          { turn: 2, phase: 'Action', tool: 'Critic 交叉查核矛盾', tokens: rows[3].tokens },
          { turn: 2, phase: 'Observation', tool: '補查飲食禁忌條款通過', tokens: rows[4].tokens },
          { turn: 3, phase: 'Final', tool: '產出溯源報告供醫師簽核', tokens: rows[5].tokens }
        ] : R.isMix ? [
          { turn: 1, phase: 'Thought', tool: 'Router 判為高風險查詢', tokens: rows[0].tokens },
          { turn: 1, phase: 'Action', tool: 'JSON Schema 結構化抽取', tokens: rows[1].tokens },
          { turn: 1, phase: 'Observation', tool: 'Guardrail 劑量/格式驗證', tokens: rows[2].tokens },
          { turn: 2, phase: 'Action', tool: '送交醫師人工審核把關', tokens: rows[3].tokens },
          { turn: 2, phase: 'Observation', tool: '醫師點擊核准並註記', tokens: rows[4].tokens },
          { turn: 3, phase: 'Final', tool: '寫入病歷＋留存 Audit Log', tokens: rows[5].tokens }
        ] : rows;
        const side = {
          type: 'table', slot: 'side',
          title: 'Agent 執行軌跡紀錄（' + (R.isMulti ? 'Multi-Agent' : R.isMix ? '混合護欄' : 'ReAct') + ' Trace）',
          cols: [{ key: 't', label: '輪', num: true, digits: 0 }, { key: 'ph', label: '階段' }, { key: 'tl', label: '動作/結果' }, { key: 'tk', label: 'Tok', num: true, digits: 0 }],
          rows: traceRows.map((r, i) => ({
            id: 'tr' + i,
            cells: [
              r.turn,
              { v: r.phase, cls: r.phase === 'Thought' ? 'c2' : r.phase === 'Action' ? 'c1' : r.phase === 'Observation' ? 'c0' : 'good' },
              i <= st.traceIdx ? r.tool : '—',
              i <= st.traceIdx ? r.tokens : null
            ],
            hl: i === st.traceIdx
          }))
        };
        const bottom = {
          type: 'table', slot: 'bottom',
          title: '步驟與可用技術對照（' + pipeName + '）',
          cols: [{ key: 'st', label: '步驟' }, { key: 'alg', label: '可用技術 / 模組' }, { key: 'use', label: '實務設計重點' }],
          rows: ALGO_ROWS.map((ar, idx) => ({
            id: ar.id,
            cells: [ar.st, { v: ar.alg, cls: idx === Math.min(st.stage, 4) ? 'hl' : (idx < st.stage ? 'good' : 'c0') }, ar.use],
            hl: idx === Math.min(st.stage, 4)
          }))
        };
        return [main, side, bottom];
      }

      const st = { stage: 0, loopBack: false, traceIdx: 0 };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '1. 載入任務與記憶', 'Agent 不只靠模型記憶回答，而是把「目標、對話記憶與可用工具說明」一起放進上下文。', [
        '目前管線：' + pipeName
      ]);
      st.stage = 1; st.traceIdx = 0;
      add(1, '2. 推理規劃 Thought', R.isMulti ? '協調者把複雜任務拆解成「查數據、查文獻、算趨勢」三個子任務。' : R.isMix ? '用結構化抽取（JSON Schema）確保輸出能安全接進後續規則程式。' : '模型先用思維鏈思考：要回答糖化血色素問題，需先查病歷再查衛教指引。', [
        '第 1 輪 Thought：決定先查近三次檢驗值'
      ]);
      st.stage = 2; st.traceIdx = 1;
      add(2, '3. 呼叫工具 Action', R.isMulti ? '三位專才代理平行出發，各自呼叫 SQL、RAG 與 Python 工具！' : '模型不自己編造數字，而是輸出工具呼叫指令查詢病歷資料庫與 RAG（H6）。', [
        '呼叫工具：SQL 病歷查詢 / RAG 知識庫（H6）'
      ]);
      st.stage = 3; st.traceIdx = 2;
      add(3, '4. 取得觀察結果 (Obs)', '外部工具回傳真實結果（HbA1c = 7.8%）。若為確定性護欄，程式會先檢查格式與數值合理性。', [
        'Observation：HbA1c = 7.8%（示意情境），尚缺飲食衛教依據'
      ]);
      st.loopBack = true; st.traceIdx = 4;
      add(4, '5. 迴圈補查與把關', R.isMix ? '若檢查失敗則橙色回流重試；高風險決策交由人工審核點按確認。' : '因為還缺衛教依據，橙色回流箭頭再跑第 2 輪呼叫 RAG 查指引（務必設最大輪數上限！）。', [
        '第 2 輪 Action → Observation：取得衛教第 3 段建議'
      ]);
      st.loopBack = false; st.stage = 4; st.traceIdx = 5;
      add(5, '6. 安全輸出最終答案', '資訊齊全並通過護欄檢查後，才生成附帶數據與指南出處的最終回覆。', [
        '總耗用 ≈ ' + R.totTokens + ' tokens｜共 ' + R.nTurns + ' 輪完成'
      ]);
      add(5, '實作體驗：H8 工具呼叫', '想看每一輪 LLM 如何用 Softmax(z/τ) 挑選 SQL / RAG / Python 工具，請直接點開下方或目錄的 H8 互動實驗！', [
        '對應實驗：H8 AI Agent：ReAct 工具呼叫'
      ]);
      add(5, '常見踩雷：無窮迴圈', '若外部 API 失敗或 RAG 查無資料，沒設 max_steps 上限的 Agent 會不斷重試燒光 Token 預算，且高風險動作絕不可跳過人工審核。', [
        '醫療護欄三要素：低溫 τ (0–0.2) · max_steps 上限 · Human-in-the-Loop'
      ]);
      add(5, '三種架構選用速查', '單純固定流程用「混合工作流 (Workflow+Guardrail)」最穩；開放式多步查詢用「ReAct」；跨科別複雜報告再用「Multi-Agent」。', [
        '目前管線：' + pipeName
      ]);
      add(5, '點擊編號直達實驗', '點擊下方對照表的 H5、H6、H8、E2 編號可直接跳轉，動手調整溫度 τ 觀察工具路由機率變化！', [
        '建議路線：H6 RAG → H8 ReAct 工具呼叫 → H9 KV Cache / DPO'
      ]);
      return steps;
    },
    keys(steps, rows, p) {
      const R = simulate(rows, p);
      return {
        n_rows: rows.length, n_turns: R.nTurns,
        tot_tokens: R.totTokens, n_tools: R.nTools,
        mean_tokens: M.mean(rows.map(r => r.tokens))
      };
    },
    explain(steps, rows, p) {
      return [
        'AI Agent 核心在於把 LLM 從「靜態問答」變成「能規劃 (Thought) → 呼叫工具 (Action) → 觀察修正 (Observation)」的閉環系統。',
        '實務依複雜度與風險分為三條主流管線：ReAct 單代理工具迴圈、Multi-Agent 多代理協作、以及最穩健的「確定性護欄＋人工把關」混合工作流。',
        '醫療與高風險場景務必加上 Guardrail 檢查、最大步數上限（防無窮迴圈燒錢）與 Human-in-the-Loop 人工確認。'
      ];
    },
    aistudio: {
      operators: ['Execute Python', 'REST / Tool Calling', 'RAG / Vector Store'],
      params: [['max_iterations', '5'], ['temperature', '0.1']],
      note: 'AI Studio / Dify / n8n 可透過 Agent 節點掛載 RAG 檢索工具與 Python 計算節點，並建議設低 Temperature 與最大步數上限。',
      expect: (steps, rows, p) => ['3 輪思考與工具呼叫完成，總耗用約 ' + simulate(rows, p).totTokens + ' tokens'],
      python: '# ReAct / Tool-Calling 迴圈概念\nwhile step < max_steps:\n    thought, action = llm.plan(obs)\n    obs = tools[action.name](**action.args)',
      confirmed: false
    }
  });
})();
