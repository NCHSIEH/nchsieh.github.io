/* H8 AI Agent：ReAct 推理與工具呼叫 */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = [
    { key: 'step', label: '輪次', type: 'int' },
    { key: 'tool', label: '候選工具', type: 'cat', levels: ['sql_lab', 'rag_guide', 'py_calc', 'finish'] },
    { key: 'logit', label: '基礎分', type: 'num' },
    { key: 'tokens', label: '消耗Token', type: 'int' }
  ];

  const TOOLS = [
    { key: 'sql_lab', name: '病歷檢驗 SQL' },
    { key: 'rag_guide', name: '衛教指引 RAG' },
    { key: 'py_calc', name: 'Python 計算機' },
    { key: 'finish', name: '結束輸出 Answer' }
  ];

  function makeRows(seed) {
    const r = LAB.rng(8800 + seed);
    return [
      { id: 1, step: 1, tool: 'sql_lab', logit: Number((2.4 + r() * 0.4).toFixed(2)), tokens: 55 },
      { id: 2, step: 1, tool: 'rag_guide', logit: Number((1.1 + r() * 0.3).toFixed(2)), tokens: 65 },
      { id: 3, step: 2, tool: 'py_calc', logit: Number((2.2 + r() * 0.4).toFixed(2)), tokens: 42 },
      { id: 4, step: 2, tool: 'rag_guide', logit: Number((2.5 + r() * 0.4).toFixed(2)), tokens: 72 },
      { id: 5, step: 3, tool: 'finish', logit: Number((2.9 + r() * 0.3).toFixed(2)), tokens: 88 },
      { id: 6, step: 3, tool: 'sql_lab', logit: Number((0.4 + r() * 0.3).toFixed(2)), tokens: 50 }
    ];
  }

  function simulate(rows, p) {
    const task = p.task || 'combo';
    const maxSteps = Math.max(2, Math.min(5, Math.round(p.max_steps || 4)));
    const qText = task === 'bmi'
      ? '查 #3 病人身高體重並計算 BMI 與判定標準'
      : task === 'guide'
        ? '查 #3 病人糖化血色素並比對糖尿病衛教指引'
        : '查 #3 病人血壓與血糖，計算風險比並查照護指引';

    const plan = task === 'bmi' ? ['sql_lab', 'py_calc', 'finish']
      : task === 'guide' ? ['sql_lab', 'rag_guide', 'finish']
      : ['sql_lab', 'py_calc', 'rag_guide', 'finish'];

    const obsMap = {
      sql_lab: task === 'bmi' ? '身高=168cm, 體重=79kg' : 'HbA1c=7.8%, 空腹血糖=146',
      py_calc: task === 'bmi' ? 'BMI = 79 ÷ 1.68² = 27.99' : '風險指標 = 1.68（偏高）',
      rag_guide: '指引第3條：HbA1c>7% 建議飲食減醣與規律運動',
      finish: '已備齊數據與指引出處，產出最終回答'
    };

    const actualPlan = plan.slice(0, maxSteps);
    if (actualPlan[actualPlan.length - 1] !== 'finish' && maxSteps >= 2) {
      actualPlan[actualPlan.length - 1] = 'finish';
    }

    const turns = actualPlan.map((winKey, idx) => {
      const logits = TOOLS.map((t, ti) => {
        if (t.key === winKey) return 2.8 + (idx === 0 ? 0.2 : 0.1);
        if (t.key === 'finish') return idx === actualPlan.length - 1 ? 2.8 : 0.3 + idx * 0.35;
        return 0.6 + ((ti + idx) % 3) * 0.25;
      });
      const exps = logits.map(Math.exp);
      const sumE = M.sum(exps);
      const probs = exps.map(e => e / sumE);
      const tokCost = 48 + idx * 14 + (winKey === 'rag_guide' ? 24 : 0);
      return {
        turn: idx + 1,
        winKey,
        winName: TOOLS.find(t => t.key === winKey).name,
        logits,
        probs,
        obs: obsMap[winKey],
        tokCost
      };
    });

    const totTokens = M.sum(turns.map(t => t.tokCost));
    return { task, maxSteps, qText, turns, totTokens };
  }

  LAB.register({
    id: 'H8', group: 'H', title: 'AI Agent：ReAct 工具呼叫',
    wideMain: true,
    module: { name: 'M8 AI Agent', url: '../m8/' },
    goal: '看懂 AI Agent 如何在每一輪對候選工具計算 Softmax 選擇機率，透過 Thought → Action → Observation 把外部真實資料寫回上下文完成任務。',
    data: {
      name: 'react_agent',
      scenario: '門診智能助理：依據問題動態挑選 SQL 查詢、Python 計算或 RAG 衛教工具',
      columns: COLS,
      small: makeRows
    },
    params: [
      { key: 'task', label: '臨床任務', type: 'choice', value: 'combo', options: [
        { v: 'combo', label: '綜合：查數據＋計算＋衛教' },
        { v: 'bmi', label: '查身高體重並算 BMI' },
        { v: 'guide', label: '查檢驗並比對衛教指引' }
      ] },
      { key: 'max_steps', label: '最大步數上限', type: 'int', min: 2, max: 5, step: 1, value: 4 }
    ],
    pseudo: [
      '初始化上下文 [System, User]',
      '重複執行直到選到 finish 或達步數上限：',
      '  Thought：LLM 評估現有線索與缺口',
      '  計算各候選工具的選擇機率 (Softmax)',
      '  Action：呼叫機率最高的外部工具',
      '  Observation：將工具回傳寫回 Context',
      '輸出整合所有觀察結果的 Final Answer'
    ],
    build(rows, p) {
      const R = simulate(rows, p), steps = [];

      function views(st) {
        const curT = R.turns[Math.min(st.turnIdx, R.turns.length - 1)];
        const activeTool = st.showAct ? curT.winKey : null;
        const layers = [
          [{ id: 'ctx', label: '上下文 Context', value: st.ctxLines.length + ' 筆訊息', shape: 'box', w: 145, cls: st.phase === 'obs' ? 'good' : 'c0', hl: st.phase === 'ctx', sub: '累積對話與觀察' }],
          [{ id: 'llm', label: 'LLM 思維鏈', value: st.phase === 'think' ? '規劃中…' : 'Thought', shape: 'box', w: 145, cls: st.phase === 'think' ? 'hl' : 'c2', hl: st.phase === 'think', sub: 'Softmax 挑工具' }],
          TOOLS.map(t => ({
            id: t.key, label: t.name, shape: 'box', w: 145,
            cls: activeTool === t.key ? (t.key === 'finish' ? 'good' : 'hl') : 'c5',
            hl: activeTool === t.key,
            dim: activeTool && activeTool !== t.key
          }))
        ];
        const edges = [
          { from: 'ctx', to: 'llm', active: st.phase === 'think', cls: 'c0', label: '輸入上下文' },
          ...TOOLS.map(t => ({
            from: 'llm', to: t.key,
            active: st.phase === 'act' && curT.winKey === t.key,
            dim: st.phase === 'act' && curT.winKey !== t.key,
            cls: curT.winKey === t.key ? 'hl' : 'c5'
          })),
          ...(st.phase === 'obs' && curT.winKey !== 'finish'
            ? [{ from: curT.winKey, to: 'ctx', active: true, back: true, cls: 'c3', label: '寫回 Obs' }]
            : [])
        ];
        const main = {
          type: 'network', slot: 'main', w: 1480, h: 280,
          title: 'ReAct 單輪狀態機（Turn ' + curT.turn + ' / ' + R.turns.length + '）',
          layerLabels: ['記憶上下文', 'LLM 決策', '外部工具 / 結束'],
          layers, edges
        };
        const side = {
          type: 'bars', slot: 'side',
          title: '第 ' + curT.turn + ' 輪候選工具選擇機率',
          max: 1, digits: 3,
          items: TOOLS.map((t, i) => ({
            id: t.key, label: t.name,
            value: st.showProbs ? curT.probs[i] : 0,
            cls: t.key === curT.winKey ? (t.key === 'finish' ? 'good' : 'hl') : 'c0',
            hl: st.showProbs && t.key === curT.winKey
          }))
        };
        const bottom = {
          type: 'table', slot: 'bottom',
          title: 'Prompt 上下文視窗累積（目前共 ' + st.usedTok + ' tokens）',
          cols: [{ key: 'role', label: '角色/階段' }, { key: 'msg', label: '寫入內容' }, { key: 'tk', label: 'Tok', num: true, digits: 0 }],
          rows: st.ctxLines.map((cl, idx) => ({
            id: 'c' + idx,
            cells: [{ v: cl.role, cls: cl.cls }, cl.msg, cl.tk],
            hl: idx === st.ctxLines.length - 1
          }))
        };
        return [main, side, bottom];
      }

      const st = {
        turnIdx: 0, phase: 'ctx', showProbs: false, showAct: false, usedTok: 35,
        ctxLines: [{ role: 'User', cls: 'c0', msg: R.qText, tk: 35 }]
      };
      const add = (line, title, say, calc, extra) => steps.push(Object.assign({ line, title, say, calc: calc || [], views: views(st), focus: [] }, extra));

      add(0, '題目與系統設定', '使用者提問：「' + R.qText + '」。Agent 最多可執行 ' + R.maxSteps + ' 輪工具呼叫。', [
        '可用工具：病歷 SQL、衛教 RAG、Python 計算機、finish'
      ]);

      R.turns.forEach((tr, ti) => {
        st.turnIdx = ti;
        st.phase = 'think'; st.showProbs = true; st.showAct = false;
        const winIdx = TOOLS.findIndex(t => t.key === tr.winKey);
        add(3, 'R' + tr.turn + '：Thought 選工具', '根據目前上下文還缺少的資訊，計算 4 個候選動作的 Softmax 機率。', [
          '最高機率：' + tr.winName + '（p = ' + f(tr.probs[winIdx], 3) + '）'
        ], { phase: '第 ' + tr.turn + ' 輪' });

        st.phase = 'act'; st.showAct = true;
        st.ctxLines = st.ctxLines.concat([{ role: 'Action #' + tr.turn, cls: 'hl', msg: '呼叫 ' + tr.winName, tk: Math.round(tr.tokCost * 0.4) }]);
        st.usedTok += Math.round(tr.tokCost * 0.4);
        add(4, 'R' + tr.turn + '：Action 執行', tr.winKey === 'finish' ? '判斷資訊已足夠，呼叫 finish 彙整輸出最終回答。' : '暫停文字生成，改為呼叫外部工具「' + tr.winName + '」取得真實結果。', [
          '執行動作：' + tr.winKey
        ], { phase: '第 ' + tr.turn + ' 輪' });

        st.phase = 'obs';
        st.ctxLines = st.ctxLines.concat([{ role: tr.winKey === 'finish' ? 'Final' : 'Obs #' + tr.turn, cls: tr.winKey === 'finish' ? 'good' : 'c2', msg: tr.obs, tk: Math.round(tr.tokCost * 0.6) }]);
        st.usedTok += Math.round(tr.tokCost * 0.6);
        add(tr.winKey === 'finish' ? 6 : 5, tr.winKey === 'finish' ? '輸出 Final Answer' : 'R' + tr.turn + '：寫回 Obs', tr.winKey === 'finish' ? '整合所有工具取得的數據與指引，產出有憑有據的最終回覆！' : '工具回傳真實結果並寫回 Context（橙色回流），下一輪 LLM 就能看見這份新線索。', [
          (tr.winKey === 'finish' ? '最終結果：' : '回傳寫入：') + tr.obs
        ], { phase: '第 ' + tr.turn + ' 輪' });
      });

      while (steps.length < 10) {
        add(6, 'ReAct 與步數上限', '設定 max_steps = ' + R.maxSteps + ' 可防止 Agent 在工具回傳失敗時陷入無窮迴圈；所有資料皆來自真實查詢而非臆測。', [
          '共執行 ' + R.turns.length + ' 輪｜累計消耗 ' + st.usedTok + ' tokens'
        ]);
      }
      return steps;
    },
    keys(steps, rows, p) {
      const R = simulate(rows, p);
      return {
        n_turns: R.turns.length,
        tot_tokens: R.totTokens,
        t0_win_prob: R.turns[0].probs[TOOLS.findIndex(t => t.key === R.turns[0].winKey)],
        last_win_prob: R.turns[R.turns.length - 1].probs[3],
        max_steps: R.maxSteps
      };
    },
    explain(steps, rows, p) {
      const R = simulate(rows, p);
      return [
        'ReAct（Reasoning + Acting）讓 LLM 在每一輪交替進行「思維鏈推理（Thought）→ 挑選並呼叫外部工具（Action）→ 讀取回傳（Observation）」。',
        '本任務共執行 ' + R.turns.length + ' 輪（依序為 ' + R.turns.map(t => t.winName).join(' → ') + '），每次工具回傳都會寫回 Prompt 上下文。',
        '因為數字運算交給 Python、數據查詢交給 SQL、指南引用交給 RAG（H6），大幅降低 LLM 直接編造數據的幻覺風險。'
      ];
    },
    aistudio: {
      operators: ['Execute Python', 'RAG / Vector Store', 'Tool Calling Agent'],
      params: [['max_steps', p => String(p.max_steps)], ['temperature', '0.1']],
      note: 'AI Studio / Dify / n8n 建置 Agent 時，建議將 Temperature 設低（0–0.2）讓工具呼叫參數穩定，並務必設定最大迭代步數上限。',
      expect: (steps, rows, p) => ['依序呼叫 ' + simulate(rows, p).turns.map(t => t.winName).join(' → ')],
      python: '# ReAct Agent 核心迴圈\nfor step in range(max_steps):\n    act, args = llm_choose_tool(context)\n    if act == "finish": break\n    context.append(run_tool(act, args))',
      confirmed: false
    }
  });
})();
