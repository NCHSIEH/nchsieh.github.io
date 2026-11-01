/* M8 互動頁 A：PART 01–10 */
(function () {
  'use strict';
  const { h, $, s, svgBox, rng, seg, slider, check, lc, Store } = U;
  U.initModule('m8');
  const cap = (el, px) => { el.style.maxWidth = px + 'px'; el.style.width = '100%'; el.style.margin = '0 auto'; return el; };
  const row = (...a) => h('div', { class: 'row', style: { marginBottom: '6px' } }, ...a);
  const lbl = t => h('span', { style: { fontSize: '14px', color: 'var(--muted)' } }, t);
  const nt = (t, cls = '') => h('div', { class: 'note ' + cls, style: { fontSize: '14px' } }, t);
  const ttl = t => h('b', { style: { fontSize: '13.5px' } }, t);
  const kpi = (...a) => h('div', { class: 'kpi' }, ...a.map(([k, v, c]) => h('div', null, h('div', { class: 'k' }, k), h('div', { class: 'v ' + (c || '') }, v))));
  const tok = (t, o = {}) => h('span', { title: o.title || '', style: { display: 'inline-block', margin: '2px', padding: '3px 7px', borderRadius: '6px', fontSize: '14px', background: o.bg || '#eef3f2', border: '1px solid ' + (o.bd || 'transparent'), fontWeight: o.b ? 700 : 400, color: o.c || 'inherit' } }, t);
  const tbl = (head, rows, o = {}) => h('div', { class: 'tscroll' }, h('table', { class: 'dt' }, h('tr', null, head.map(c => h('th', null, c))), rows.map(r => h('tr', null, r.map((v, j) => v instanceof Node ? h('td', null, v) : h('td', { class: typeof v === 'number' ? 'num' : '', style: { fontWeight: j || o.plain ? 400 : 600 } }, v))))));
  const pre = t => h('pre', { style: { whiteSpace: 'pre-wrap', background: '#f6f5f1', border: '1px solid var(--line)', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', lineHeight: '1.55', margin: '6px 0', fontFamily: 'var(--mono)' } }, t);
  const box = (title, body, o = {}) => h('div', { style: { border: '1px solid ' + (o.bd || 'var(--line)'), background: o.bg || '#fff', borderRadius: '10px', padding: '10px 12px', fontSize: '14px', ...(o.st || {}) } }, title ? h('div', { style: { fontWeight: 700, marginBottom: '4px', color: o.tc || 'inherit' } }, title) : '', body);
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const M8 = window.M8 = { cap, row, lbl, nt, ttl, kpi, tok, tbl, pre, box, fmt };

  // ================= P01 =================
  U.sorter('#w-isnot', [
    ['Dify 是一個大型語言模型', '不是', '它本身不是模型；它呼叫你接上的模型（Gemini、Groq Llama、Ollama…）。'],
    ['Dify 把 LLM、知識庫、外部工具與流程邏輯組裝成一個應用', '是', '這就是它的定位：組裝平台。'],
    ['在 Dify 裡可以用自己的資料重新訓練模型', '不是', 'Dify 只做推論＋提示；讓模型懂你的資料靠 RAG 知識庫，不是訓練。'],
    ['Dify 可以一鍵發佈成獨立網頁供 Demo', '是', '期末專題要交的「可測試 App URL」就是這樣來的。'],
    ['換到 Dify 之後，寫得很爛的 Prompt 也會自動變好', '不是', '組裝平台不會讓爛 Prompt 變好——System Prompt 四段式還是要自己寫。'],
    ['Dify 可以用 Docker 本地部署，搭配 Ollama 讓資料不出機器', '是', '處理健康資料時，這一點是紅線不是加分。'],
  ], ['是', '不是']);
  $('#w-vs').append(tbl(['比較', 'M1–M5 的機器學習', 'M8 的 Dify'], [
    ['做的事', '用資料「訓練」模型（迴歸、樹、神經網路）', '把現成的 LLM「組裝」成應用，只做推論＋提示'],
    ['你調整的東西', '特徵、超參數、驗證方式', 'System Prompt、知識庫切塊、召回參數、節點與分支'],
    ['評估方式', '準確率、AUC、混淆矩陣', 'Tracing、召回測試、同題多次執行是否一致'],
    ['最大的風險', '過擬合、資料洩漏', '幻覺、數字是生成的、流程靜默失敗'],
    ['產出', '一個模型（預測函式）', '一個可分享的應用（App URL＋DSL 匯出檔）'],
  ]));

  // ================= P02 =================
  (function () {
    const MODES = {
      chatbot: { n: 'Chatbot', who: '沒有流程', nodes: [['使用者輸入', '「BMI 多少算過重？」'], ['LLM＋System Prompt', '角色・步驟・限制・格式'], ['直接回覆', '四段結構化輸出']], ex: 'AI Chatbot (healthcare)、教學 01／02', note: '畫布上沒有可編輯的節點——想改行為，只能改 Prompt 文字。無法保證「先查資料再回答」，也無法在中途插入計算或驗證。' },
      workflow: { n: 'Workflow', who: '流程由你決定', nodes: [['開始 Start', 'case_desc（文字）'], ['知識檢索', 'KB：CMS 評估標準'], ['LLM', '判定 CMS 等級'], ['輸出 End', 'level / reason']], ex: 'CMS Workflow - case assessment-01（4 節點）、Marketing Plan Generator', note: '不保留對話歷史：「跑一次給一個結果」。同樣輸入永遠同樣路徑——批次跑 50 份也放心。' },
      chatflow: { n: 'Chatflow', who: '流程由你決定', nodes: [['開始', '提問＋對話歷史'], ['LLM 1', '意圖判斷'], ['知識檢索 1／2', 'KB1 量表・KB3 給付'], ['LLM 2', '綜合生成'], ['程式碼', '查表算金額'], ['模板＋回覆', '固定格式＋來源']], ex: '台灣長照 3.0 Chatflow（15 節點）', note: '有對話、有分支，但分支數量有限且可窮舉——這是它跟 Agent 最關鍵的差別。每一條路都是你事先畫好的。' },
      agent: { n: 'Agent', who: '流程由 LLM 決定', nodes: [['開始', '「查一下肌少症」'], ['Agent 節點', 'LLM 自主決定查什麼'], ['工具 A／B', 'Wikipedia・知識庫'], ['最終答案', '摘要＋來源標註']], loop: true, ex: 'Component-Agent-01（3 個工具）、教學 03 健康主題查證 Agent', note: '你交出去的不是流程，而是一組工具與一句目標。迴圈次數由 LLM 決定，你只能設「最大迭代次數」當煞車。' },
    };
    const SPEC = [['對話歷史', '✔', '✘', '✔', '✔'], ['可編輯畫布', '✘', '✔', '✔', '部分'], ['條件分支', '✘', '✔', '✔', 'LLM 自訂'], ['路徑可預測', '✔', '✔✔', '✔', '✘'], ['可插入程式碼計算', '✘', '✔', '✔', '經工具'], ['每次執行成本', '固定・低', '固定', '固定', '不固定・高'], ['除錯難度', '低', '低', '中', '高（需讀 Tracing）'], ['醫療場域適用度', '限單輪衛教', '★ 批次', '★★ 主力', '需嚴格護欄']];
    const KEYS = ['chatbot', 'workflow', 'chatflow', 'agent'];
    let m = 'chatflow'; const ctl = h('div'), out = h('div');
    ctl.append(row(seg(KEYS.map(k => [k, MODES[k].n]), () => m, v => m = v, draw)));
    function draw() {
      out.innerHTML = ''; const M = MODES[m], n = M.nodes.length, W = 720, H = M.loop ? 190 : 150, bw = Math.min(150, (W - 30 - (n - 1) * 26) / n), sv = svgBox(out, W, H);
      const gap = (W - 20 - n * bw) / (n - 1 || 1);
      M.nodes.forEach(([a, b], i) => { const x = 10 + i * (bw + gap), y = 40, hot = (m === 'agent' && i === 1) || (m === 'chatflow' && i === 4);
        s('rect', { x, y, width: bw, height: 62, rx: 9, fill: hot ? 'var(--accent-soft)' : '#fff', stroke: hot ? 'var(--accent)' : '#b9b4a8', 'stroke-width': hot ? 2 : 1.2 }, sv);
        s('text', { x: x + bw / 2, y: y + 26, 'text-anchor': 'middle', 'font-weight': 700, 'font-size': 13.5, text: a }, sv);
        s('text', { x: x + bw / 2, y: y + 46, 'text-anchor': 'middle', 'font-size': 11.5, style: 'fill:#6b675e', text: b }, sv);
        if (i < n - 1) { const x1 = x + bw + 3, x2 = x + bw + gap - 4; s('line', { x1, x2, y1: y + 31, y2: y + 31, stroke: '#888', 'stroke-width': 1.6 }, sv); s('path', { d: `M${x2} ${y + 31} l-7 -4 v8 z`, fill: '#888' }, sv); } });
      s('text', { x: 10, y: 22, 'font-size': 13, style: 'fill:var(--accent)', 'font-weight': 700, text: `${M.n}｜${M.who}` }, sv);
      if (M.loop) { const x1 = 10 + 2 * (bw + gap) + bw / 2, x0 = 10 + (bw + gap) + bw / 2; s('path', { d: `M${x1} 104 C ${x1} 160, ${x0} 160, ${x0} 104`, fill: 'none', stroke: 'var(--bad)', 'stroke-width': 2, 'stroke-dasharray': '6 4' }, sv); s('path', { d: `M${x0} 104 l-4 8 h8 z`, fill: 'var(--bad)' }, sv); s('text', { x: (x0 + x1) / 2, y: 176, 'text-anchor': 'middle', 'font-size': 12, style: 'fill:var(--bad)', text: '觀察結果 → 資訊不夠 → 再想一輪（最大迭代次數＝唯一煞車）' }, sv); }
      if (m === 'chatflow') s('text', { x: 10 + 4 * (bw + gap) + bw / 2, y: 122, 'text-anchor': 'middle', 'font-size': 11.5, style: 'fill:var(--accent)', text: '★ 金額不讓 LLM 算' }, sv);
      const ci = KEYS.indexOf(m) + 1;
      out.append(nt(h('span', null, h('b', null, '重點：'), M.note, h('br'), h('b', null, '課程範例：'), M.ex)),
        h('div', { class: 'tscroll' }, h('table', { class: 'dt' }, h('tr', null, ['規格', 'Chatbot', 'Workflow', 'Chatflow', 'Agent'].map((c, j) => h('th', { style: j === ci ? { background: 'var(--accent)', color: '#fff' } : {} }, c))), SPEC.map(r => h('tr', null, r.map((v, j) => h('td', { class: j === ci ? 'hl' : '', style: { fontWeight: j ? 400 : 600, textAlign: j ? 'center' : 'left' } }, v)))))),
        nt('選型口訣：能用 Workflow 就別用 Agent；需要對話就升 Chatflow；只有「連你自己都說不清要查什麼」才用 Agent。', 'warn'));
    }
    $('#w-modes').append(ctl, out); draw();
  })();
  U.sorter('#w-pickmode', [
    ['把 200 份出院病摘轉成結構化表格', 'Workflow', '不需要對話、路徑固定、要能批次跑。用 Chatflow 反而多此一舉。'],
    ['衛教問答：「BMI 多少算過重？」', 'Chatbot', '問了就答的單輪問答，一段四段式 System Prompt 就夠。'],
    ['家屬多輪描述個案 → 判定等級 → 查表算給付', 'Chatflow', '有對話、有分支、要插入程式碼計算——長照 3.0 Chatflow 就是這一型。'],
    ['「這個主題的最新證據有哪些？」要自己決定查哪些來源、查幾次', 'Agent', '需求說不清楚要查什麼、需要組合多個外部來源，且允許路徑不可重現。'],
    ['每週一自動生成上週個案統計報告', 'Workflow', '固定步驟、不需要對話。'],
    ['依使用者回答的問題類型，分流到 CMS 量表或給付標準兩個知識庫', 'Chatflow', '分支數量有限、可窮舉——你畫得出流程圖，就不需要 Agent。'],
  ], ['Chatbot', 'Workflow', 'Chatflow', 'Agent'], '若你能畫得出流程圖，就該用 Chatflow／Workflow。');

  // ================= P03 =================
  (function () {
    let seed = 1, maxIt = 5; const ctl = h('div'), out = h('div');
    const TOOLS = [['Wikipedia', '「肌少症」條目'], ['知識庫', '國健署調查報告'], ['Tavily 搜尋', '近期研究新聞'], ['Wikipedia', '「握力」條目'], ['知識庫', '衛教手冊・運動建議']];
    ctl.append(row(h('button', { class: 'btn', onclick: () => { seed++; draw(); } }, '▶ 兩邊各再跑 3 次'), slider('Agent 最大迭代次數', 1, 8, 1, () => maxIt, v => maxIt = v, draw)));
    function draw() {
      out.innerHTML = ''; const R = rng(seed * 97 + maxIt), wf = h('div'), ag = h('div'); const agTok = [];
      for (let k = 0; k < 3; k++) {
        const t = (1.7 + R() * .15).toFixed(1);
        wf.append(h('div', { style: { padding: '6px 0', borderBottom: '1px dashed var(--line)' } }, lbl(`第 ${k + 1} 次　`), ['開始', '知識檢索', 'LLM', '輸出'].map(x => tok(x)), lbl(` ${t}s・約 2,750 tokens`)));
        let need = 2 + Math.floor(R() * 4), it = Math.min(need, maxIt), seq = [];
        for (let i = 0; i < it; i++) seq.push(TOOLS[Math.floor(R() * TOOLS.length)]);
        const tk = 900 + it * (1100 + Math.floor(R() * 500)); agTok.push(tk); const cut = need > maxIt;
        ag.append(h('div', { style: { padding: '6px 0', borderBottom: '1px dashed var(--line)' } }, lbl(`第 ${k + 1} 次　`), seq.map((q, i) => tok(`${i + 1}. ${q[0]}`, { title: q[1], bg: '#fdf1e2' })), cut ? tok('達上限・未完成', { bg: 'var(--bad-soft)', c: 'var(--bad)' }) : tok('Final Answer', { bg: 'var(--good-soft)' }), lbl(` ${it} 輪・約 ${fmt(tk)} tokens`)));
      }
      out.append(h('div', { class: 'grid2' }, box('Workflow（路徑固定）', wf), box('Agent（LLM 自己決定）', ag, { bg: '#fffaf3' })),
        kpi(['Workflow 三次 Token', '2,750 × 3（一樣）', 'good'], ['Agent 三次 Token', agTok.map(fmt).join(' / '), 'bad'], ['Agent 最多／最少', (Math.max(...agTok) / Math.min(...agTok)).toFixed(1) + ' 倍']),
        nt(maxIt <= 2 ? '最大迭代次數設得太小：資訊還不夠就被迫收手，回答不完整——這也要有提示訊息告訴使用者。' : 'Workflow 的 Tracing 每次都一樣，任何一次出錯都能逐次比對；Agent 同樣的問題，這次查 2 輪、下次可能查 5 輪——成本無法事先估算。', maxIt <= 2 ? 'warn' : ''));
    }
    $('#w-runs').append(ctl, out); draw();
  })();

  // ================= P04 =================
  (function () {
    const P = { k: 5, sp: 380, hist: 5, calls: 200 }; const ctl = h('div'), out = h('div');
    const per = 290, Q = 60, A = 340, hr = 104;
    function build() { ctl.append(row(slider('Top-K（召回段數）', 1, 10, 1, () => P.k, v => P.k = v, draw), slider('System Prompt tokens', 100, 1500, 20, () => P.sp, v => P.sp = v, draw, fmt)), row(slider('保留對話歷史（輪）', 0, 15, 1, () => P.hist, v => P.hist = v, draw), slider('每天呼叫次數', 20, 2000, 20, () => P.calls, v => P.calls = v, draw, fmt), h('button', { class: 'btn sm', onclick: () => { Object.assign(P, { k: 5, sp: 380, hist: 5, calls: 200 }); ctl.innerHTML = ''; build(); draw(); } }, '回到講義預設'))); }
    const total = (k, sp = P.sp, hi = P.hist) => sp + hi * hr + k * per + Q + A;
    function draw() {
      out.innerHTML = ''; const parts = [['System Prompt', P.sp, '#7a6fb0'], ['對話歷史', P.hist * hr, '#a7a39a'], ['召回的知識庫段落', P.k * per, '#2a7f78'], ['使用者問題', Q, '#d29a3a'], ['模型回答', A, '#c0392b']], T = total(P.k);
      const W = 720, sv = svgBox(h('div'), W, 74); let x = 0;
      parts.forEach(([n, v, c]) => { const w = v / T * W; if (w <= 0) return; s('rect', { x, y: 8, width: w, height: 34, fill: c }, sv); if (w > 52) s('text', { x: x + w / 2, y: 30, 'text-anchor': 'middle', style: 'fill:#fff', 'font-size': 12, 'font-weight': 700, text: Math.round(v / T * 100) + '%' }, sv); x += w; });
      let lx = 0; parts.forEach(([n, v, c]) => { s('rect', { x: lx, y: 54, width: 10, height: 10, fill: c }, sv); s('text', { x: lx + 14, y: 63, 'font-size': 11.5, text: `${n} ${fmt(v)}` }, sv); lx += 146; });
      const chart = h('div'); lc(chart, [{ pts: Array.from({ length: 10 }, (_, i) => [i + 1, total(i + 1)]), color: '#2a7f78', w: 2.5, dots: true }], { w: 420, h: 220, xmin: 1, xmax: 10, ymin: 0, ymax: Math.max(5000, total(10) * 1.1), xl: 'Top-K', yl: '單次 tokens', yfmt: fmt, marks: [{ x: P.k, label: `K=${P.k}：${fmt(T)}`, color: 'var(--accent)' }], ml: 54 });
      const ret = P.k * per / T, mon = T * P.calls * 30;
      out.append(sv.parentNode, h('div', { class: 'grid2', style: { alignItems: 'center' } }, cap(chart, 440),
        h('div', null, kpi(['單次合計', fmt(T) + ' tokens'], ['召回段落佔比', Math.round(ret * 100) + '%', ret > .6 ? 'bad' : ''], ['Top-K 3 → 10', (total(10) / total(3)).toFixed(2) + ' 倍']), h('div', { style: { height: '8px' } }), kpi(['每月 tokens（×30 天）', (mon / 1e6).toFixed(1) + ' M']),
          nt(P.k === 5 && P.sp === 380 && P.hist === 5 ? '講義的例子：合計約 2,750 tokens／次，召回段落佔 53%，是唯一會隨設定放大的部分。' : ret > .6 ? '召回段落已超過六成：先試著降低 Top-K（8 → 5 若品質不變就採用）或開 Rerank。' : P.hist > 5 ? '對話歷史會無限累積——只保留最近 3–5 輪，長對話省很多。' : 'System Prompt 每次呼叫都重送：刪掉重複與冗詞，範例保留 2 個就好。', ret > .6 ? 'warn' : ''))),
        tbl(['成本手法', '做法', '省多少'], [['精簡 System Prompt', '刪重複與冗詞；範例保留 2 個', '每次呼叫都省'], ['降低 Top-K', '8 → 5，召回品質不變就採用', '線性減少'], ['模型混用', '判定節點用小模型，生成才用大模型', '判定節點可省 8–10 倍'], ['限制對話歷史', '只保留最近 3–5 輪', '長對話省很多'], ['設最大迭代次數', 'Agent 設 5–10 次上限', '避免失控的極端情況']]));
    }
    build(); $('#w-cost').append(ctl, out); draw();
  })();
  $('#w-env').append(tbl(['', 'Dify Cloud', '本地部署（Docker）'], [['建置成本', '註冊即用，五分鐘上手', '需安裝 Docker，約 30–60 分鐘'], ['資料落地', '對話與知識庫存放在雲端', '全部留在自己的機器上'], ['模型選擇', '接雲端 API', '可接雲端，也可搭配 Ollama 完全離線'], ['成本', '免費額度有限，超出需付費', '硬體自負；本地模型無 API 費用'], ['課程建議', 'W13–W15 課堂練習、專題 Demo', '專題若處理醫療資料，改用本地部署']]),
    h('div', { class: 'grid2', style: { marginTop: '10px' } },
      box('金鑰規範（評分項目，也是資安底線）', h('ul', { style: { margin: '4px 0', paddingLeft: '18px' } }, h('li', null, '每位同學自行申請，不共用、不寫進報告、不上傳公開儲存庫'), h('li', null, '金鑰存在「設定 → 模型供應商」，不會出現在匯出的 DSL 檔——匯出檔可安全繳交'), h('li', null, '匯入範例 .yml 後，記得先填金鑰，否則無法執行'))),
      box('模型混用', h('ul', { style: { margin: '4px 0', paddingLeft: '18px' } }, h('li', null, 'Gemini、Groq 有免費額度（Groq 快、額度較寬）；OpenAI 需先儲值'), h('li', null, '歷屆專題：危機等級判定切到 Groq＋Llama 解決 429/503，文書生成才用大模型'), h('li', null, 'LTC3.0 資料夾的三個 yml＝同一應用的三種模型版本，可直接比較')))));

  // ================= P05 =================
  (function () {
    const on = { role: false, steps: false, cons: false, fmt: false }; const ctl = h('div'), out = h('div');
    const SEC = { role: ['# 角色', '你是長照衛教助理，服務對象為家庭照顧者。'], steps: ['# 步驟', '1. 先辨識是否含警訊徵象。\n2. 閱讀【參考資料】。\n3. 給衛教建議，最後提醒就醫時機。'], cons: ['# 限制', '- 不得依症狀推測特定疾病，不做診斷、不給藥物劑量。\n- 偵測到警訊（胸悶、胸痛、呼吸困難…）時，最前段標示【建議儘速就醫】。\n- 【參考資料】沒有的內容，回答「查無相關資料」。\n- 結尾加上：以上僅供參考，請諮詢醫師。'], fmt: ['# 格式', '依序輸出：【建議儘速就醫（若有警訊）】【衛教說明】【資料來源】'] };
    ctl.append(row(check('① 角色', () => on.role, v => on.role = v, draw), check('② 任務步驟', () => on.steps, v => on.steps = v, draw), check('③ 限制邊界', () => on.cons, v => on.cons = v, draw), check('④ 輸出格式', () => on.fmt, v => on.fmt = v, draw), h('button', { class: 'btn sm', onclick: () => { Object.keys(on).forEach(k => on[k] = true); ctl.querySelectorAll('input').forEach(c => c.checked = true); draw(); } }, '全部加上（教學 02）'), h('button', { class: 'btn sm', onclick: () => { Object.keys(on).forEach(k => on[k] = false); ctl.querySelectorAll('input').forEach(c => c.checked = false); draw(); } }, '全部拿掉（教學 01）')));
    function draw() {
      out.innerHTML = ''; const n = Object.values(on).filter(Boolean).length;
      const sp = n ? Object.keys(SEC).filter(k => on[k]).map(k => SEC[k].join('\n')).join('\n\n') : '你是一個健康照護助理，請回答使用者的健康問題。';
      const L = [];
      if (on.cons) L.push(h('div', { style: { color: 'var(--bad)', fontWeight: 700 } }, on.fmt || on.steps ? '【建議儘速就醫】' : '（文中某處）建議儘速就醫。'));
      if (on.fmt) L.push(h('b', null, '【衛教說明】'));
      L.push(h('div', null, on.cons ? '胸悶屬於需要警覺的徵象，原因很多，無法由文字判斷。' + (on.steps ? '若合併胸痛、冒冷汗、呼吸困難，請立即就醫或撥打 119。' : '') : '可能是心絞痛、胃食道逆流或焦慮症。建議觀察是否伴隨其他症狀，也可以試著放鬆、少吃刺激性食物…' + (on.steps ? '（有分步驟，但仍自行推測疾病）' : '')));
      if (on.role) L.push(h('div', { style: { color: 'var(--muted)', fontSize: '13px' } }, '（用語收斂為給家庭照顧者的衛教口吻）'));
      if (on.fmt) L.push(h('b', null, '【資料來源】'), h('div', null, '衛教手冊・胸痛警訊章節'));
      if (on.cons) L.push(h('div', { style: { fontSize: '13px', color: 'var(--muted)' } }, '以上僅供參考，請諮詢醫師。'));
      const Qs = [['不自行推測疾病', on.cons], ['警訊徵象前置', on.cons && (on.fmt || on.steps)], ['格式每次一致', on.fmt], ['有資料來源欄位', on.fmt], ['有免責聲明', on.cons], ['服務對象與用語明確', on.role]];
      out.append(h('div', { class: 'grid2' }, h('div', null, ttl('System Prompt'), pre(sp)), h('div', null, ttl('提問：我最近胸口悶，可能是什麼病？'), box('', h('div', null, ...L), { bg: n === 4 ? 'var(--good-soft)' : n ? '#fff' : 'var(--bad-soft)', st: { marginTop: '6px' } }))),
        h('div', { style: { marginTop: '8px' } }, Qs.map(([t, ok]) => tok((ok ? '✓ ' : '✗ ') + t, { bg: ok ? 'var(--good-soft)' : 'var(--bad-soft)', c: ok ? 'var(--good)' : 'var(--bad)' }))),
        nt(n === 4 ? '四段到齊：偵測到「胸悶」屬警訊 → 強制前置就醫建議；格式固定；標註限制。這不是模型變聰明了——同一個模型、同一個問題，差別只在 System Prompt。' : n === 0 ? '無約束對照組：自行推測疾病（超出範圍）、沒有警訊標示、沒有來源、沒有免責。' : `還缺 ${4 - n} 段——四者缺一，行為就會開始漂移。`, n === 4 ? '' : 'warn'));
    }
    $('#w-sp').append(ctl, out); draw();
  })();

  // ================= P06 =================
  U.sorter('#w-force', [
    ['每次都依序輸出四段，每段加粗標題', '強', '模型擅長模仿範例的形狀；保險做法：給 Few-shot 範例，或交給模板轉換節點。'],
    ['用「給家庭照顧者的衛教助理」的語氣回答', '強', '身分設定會全面影響用詞；角色要寫具體。'],
    ['使用者問到用藥時一律拒答', '中', '多數時候有效，但會被巧妙提問繞過；加流程節點做前置判斷。'],
    ['每條建議不超過 15 字', '弱', '「不超過 15 字」經常被違反；用流程節點驗證後截斷。'],
    ['算出第 4 級一般戶每月自負額', '很弱', 'LLM 心算不可靠——一律用工具查表或計算（程式碼節點）。'],
    ['保證引用的是最新版給付規定', '弱', '事實正確性由訓練資料決定，Prompt 改不了；接知識庫（RAG）＋標註版本與來源。'],
  ], ['強', '中', '弱', '很弱'], '需要「保證」的東西不能只靠 Prompt。');

  // ================= P07 =================
  (function () {
    const DOC = '第三章 給付基準。一、照顧及專業服務依長照需要等級（CMS）核定每月給付額度。CMS 第 2 級每月給付額度為 10,020 元。CMS 第 3 級每月給付額度為 15,460 元。CMS 第 4 級每月給付額度為 18,580 元，自負額依身分別分為一般戶 16%、中低收入戶 5%。CMS 第 5 級每月給付額度為 24,100 元。CMS 第 6 級每月給付額度為 28,070 元。CMS 第 7 級每月給付額度為 32,090 元。CMS 第 8 級每月給付額度為 36,180 元。二、交通接送、輔具及居家無障礙環境改善、喘息服務另有額度，不與上述額度合併計算。三、申請流程：向各縣市照管中心申請，由照管專員到宅評估後核定。';
    const P = { size: 20, ov: 0, sep: false }; const ctl = h('div'), out = h('div');
    function build() { ctl.innerHTML = ''; ctl.append(row(lbl('講義三種切法：'), ...[[20, '200 字'], [60, '600 字'], [150, '1500 字']].map(([v, t]) => h('button', { class: 'btn sm' + (P.size === v ? ' on' : ''), onclick: () => { P.size = v; build(); draw(); } }, t)), slider('切塊大小（縮 1:10）', 12, 160, 2, () => P.size, v => P.size = v, draw, v => v * 10 + ' 字')), row(slider('重疊 Overlap', 0, 30, 1, () => P.ov, v => P.ov = v, draw, v => v + '%'), check('依句號「。」分隔再合併（分隔符切塊）', () => P.sep, v => P.sep = v, draw))); }
    function chunks() {
      const size = P.size, ov = Math.round(size * P.ov / 100), C = [];
      if (P.sep) { const sent = DOC.split(/(?<=。)/); let cur = '', st = 0, pos = 0; sent.forEach(x => { if (cur && cur.length + x.length > size) { C.push([st, cur]); const keep = ov ? cur.slice(-ov) : ''; st = pos - keep.length; cur = keep; } cur += x; pos += x.length; }); if (cur) C.push([st, cur]); return C; }
      for (let i = 0; i < DOC.length; i += Math.max(1, size - ov)) { C.push([i, DOC.slice(i, i + size)]); if (i + size >= DOC.length) break; } return C;
    }
    const TERMS = [['第 4 級', 3], ['CMS', 1], ['每月', 1], ['給付額度', 1]];
    function draw() {
      out.innerHTML = ''; const C = chunks();
      const sc = C.map(([, t]) => { let r = 0; TERMS.forEach(([w, k]) => { if (t.includes(w)) r += k; }); return r / (1 + t.length / 90); });
      const best = sc.indexOf(Math.max(...sc)), bt = C[best][1], full = bt.includes('第 4 級') && bt.includes('18,580'), split = !C.some(([, t]) => t.includes('第 4 級每月給付額度為 18,580'));
      const list = h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px', margin: '8px 0' } });
      C.forEach(([st, t], i) => { const has4 = t.includes('第 4 級'), hasA = t.includes('18,580');
        const html = t.replace(/(CMS 第 4 級|第 4 級)/g, '<mark style="background:#ffe08a">$1</mark>').replace(/18,580/g, '<mark style="background:#bfe3d2">18,580</mark>');
        list.append(h('div', { style: { flex: `1 1 ${Math.min(100, 12 + t.length * 1.4)}%`, minWidth: '120px', border: '1.5px solid ' + (i === best ? 'var(--accent)' : '#d8d4ca'), background: i === best ? 'var(--accent-soft)' : '#fff', borderRadius: '8px', padding: '6px 8px', fontSize: '12.5px', lineHeight: 1.5 } }, h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--muted)' } }, `#${i + 1}・${t.length * 10} 字・相關 ${sc[i].toFixed(2)}${i === best ? '・★ 召回第 1' : ''}${has4 && !hasA ? '・缺金額' : ''}${hasA && !has4 ? '・缺等級' : ''}`), h('div', { html }))); });
      const noise = 1 - 25 / bt.length;
      out.append(kpi(['切出段數', C.length], ['召回第 1 段', full ? '等級＋金額都在' : '不完整', full ? 'good' : 'bad'], ['召回段的雜訊', Math.max(0, Math.round(noise * 100)) + '%', noise > .7 ? 'bad' : ''], ['召回段 tokens（約）', fmt(bt.length * 10 * 1.1)]), list,
        nt(!full ? (split ? '「CMS 第 4 級每月給付」與「額度 18,580 元」被切開了：問「第 4 級給付多少」只召回上半，下半段沒有「第 4 級」，比對不到。試著加大重疊或改用分隔符切塊。' : '金額所在的那段沒有排到第 1：句子被切在中間，含「第 4 級」的那段反而沒有金額。') : noise > .7 ? '答案有召回，但整段幾乎都是無關內容：Prompt 被雜訊塞滿、成本高，多段候選長得都很像，召回精準度下降。' : '語意完整、雜訊少——條列式規定建議「小到中等 chunk＋15% 重疊」。實際設定仍要用召回測試驗證。', !full ? 'bad' : noise > .7 ? 'warn' : ''));
    }
    build(); $('#w-chunk').append(ctl, out); draw();
  })();

  // ================= P08 =================
  (function () {
    const SIM = [.82, .78, .74, .71, .69, .66, .63, .61, .58, .55, .52, .49, .46, .44, .41, .38, .35, .31, .27, .22];
    const LAB = ['CMS 量表：第 4 級評估項目', '第 3 級每月給付額度', '第 5 級每月給付額度', '給付額度總說明', '自負額比例總表', '第 4 級個案服務範例', '喘息服務額度', '照管中心申請流程', '★ 第 4 級每月給付額度 18,580 元', '交通接送額度', '輔具及無障礙額度', '★ 第 4 級自負額（一般戶 16%）', '長照 2.0 舊制說明', '中低收入戶資格', '居家護理說明', '失智症照護說明', '專業服務項目', '住宿式機構補助', '家庭照顧者支持', '其他縣市補助'];
    const RR = [.41, .52, .48, .66, .55, .45, .2, .25, .93, .18, .22, .84, .3, .28, .15, .12, .35, .14, .1, .16];
    const EXACT = [0, 5, 8, 11];
    const P = { k: 5, th: .5, rr: false, hy: false }; const ctl = h('div'), out = h('div');
    function build() { ctl.innerHTML = ''; ctl.append(row(slider('Top-K', 1, 20, 1, () => P.k, v => P.k = v, draw), slider('相似度閾值', 0, .9, .05, () => P.th, v => P.th = +v.toFixed(2), draw, v => (+v).toFixed(2))), row(check('Rerank（先召回 20，重排後取前 K）', () => P.rr, v => P.rr = v, draw), check('混合檢索（全文比對「第 4 級」加分）', () => P.hy, v => P.hy = v, draw), h('button', { class: 'btn sm', onclick: () => { Object.assign(P, { k: 5, th: .3, rr: true, hy: false }); build(); draw(); } }, '套用：閾值 .3＋Rerank＋取 5'), h('button', { class: 'btn sm', onclick: () => { Object.assign(P, { k: 5, th: .5, rr: false, hy: false }); build(); draw(); } }, '重設'))); }
    function draw() {
      out.innerHTML = ''; const sim = SIM.map((v, i) => +(Math.min(.99, v + (P.hy && EXACT.includes(i) ? .2 : 0))).toFixed(2));
      const pass = sim.map((v, i) => i).filter(i => sim[i] >= P.th);
      const order = P.rr ? pass.slice(0, 20).sort((a, b) => RR[b] - RR[a]) : pass.slice().sort((a, b) => sim[b] - sim[a]);
      const inP = new Set(order.slice(0, P.k));
      const W = 720, H = 268, m = { l: 40, r: 10, t: 14, b: 74 }, sv = svgBox(h('div'), W, H), bw = (W - m.l - m.r) / 20, y = v => H - m.b - v * (H - m.t - m.b);
      [0, .2, .4, .6, .8, 1].forEach(t => { s('line', { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: 'grid' }, sv); s('text', { x: m.l - 5, y: y(t) + 4, 'text-anchor': 'end', 'font-size': 11, text: t.toFixed(1) }, sv); });
      sim.forEach((v, i) => { const x = m.l + i * bw, c = inP.has(i) ? 'var(--accent)' : v >= P.th ? '#e0a34a' : '#cfcac0'; s('rect', { x: x + 3, y: y(v), width: bw - 6, height: y(0) - y(v), fill: c, rx: 2 }, sv); s('text', { x: x + bw / 2, y: H - m.b + 14, 'text-anchor': 'middle', 'font-size': 11, text: i + 1 }, sv); if (LAB[i][0] === '★') s('text', { x: x + bw / 2, y: y(v) - 4, 'text-anchor': 'middle', 'font-size': 14, style: 'fill:#c0392b', text: '★' }, sv); if (P.rr && inP.has(i)) s('text', { x: x + bw / 2, y: H - m.b + 28, 'text-anchor': 'middle', 'font-size': 10.5, style: 'fill:var(--accent)', text: '#' + (order.indexOf(i) + 1) }, sv); });
      s('line', { x1: m.l, x2: W - m.r, y1: y(P.th), y2: y(P.th), stroke: 'var(--bad)', 'stroke-dasharray': '5 4', 'stroke-width': 1.5 }, sv); s('text', { x: W - m.r, y: y(P.th) - 5, 'text-anchor': 'end', 'font-size': 11.5, style: 'fill:var(--bad)', text: `閾值 ${P.th.toFixed(2)}` }, sv);
      [['進 Prompt', 'var(--accent)'], ['過閾值、被 Top-K 擋掉', '#e0a34a'], ['低於閾值不召回', '#cfcac0']].forEach(([t, c], j) => { s('rect', { x: m.l + j * 200, y: H - 16, width: 11, height: 11, fill: c }, sv); s('text', { x: m.l + j * 200 + 16, y: H - 6, 'font-size': 12, text: t }, sv); });
      s('text', { x: m.l, y: H - m.b + 40, 'font-size': 11, style: 'fill:#6b675e', text: P.rr ? '依向量相似度排名（下方 #n＝Rerank 後的名次）' : '依向量相似度由高到低排名' }, sv);
      const got = [...inP].filter(i => LAB[i][0] === '★').length, noise = inP.size - got;
      out.append(sv.parentNode, kpi(['進 Prompt 段數', inP.size], ['含答案的段落 ★', `${got} / 2`, got === 2 ? 'good' : got ? '' : 'bad'], ['雜訊段落', noise, noise > 5 ? 'bad' : ''], ['context tokens（約）', fmt(inP.size * 290)]),
        h('div', { style: { margin: '6px 0' } }, order.slice(0, P.k).map(i => tok(`${i + 1}. ${LAB[i]}`, { bg: LAB[i][0] === '★' ? 'var(--good-soft)' : '#eef3f2' }))),
        nt(inP.size === 0 ? '閾值設太高：一段都沒召回，系統只能回「查無資料」。' : got === 0 ? (pass.some(i => LAB[i][0] === '★') ? '正確段落過了閾值，卻被 Top-K 擋在門外（排第 9、12 名）。別急著把 Top-K 開到 20——先看切塊，再考慮 Rerank 或混合檢索。' : '正確段落連閾值都沒過：閾值太高，或檢索模式抓不到精確詞彙。') : noise > 6 ? 'Top-K 開太大想「保險一點」：無關段落淹沒正確段落，答案反而變差，成本也暴增。' : got === 2 ? '兩段答案都進了 Prompt，雜訊也控制住了。Top-K 與閾值是「且」的關係：必須同時過閾值、又排進前 K。' : '只拿到一段答案——再調調看。', got === 2 && noise <= 6 ? '' : 'warn'));
    }
    build(); $('#w-topk').append(ctl, out); draw();
  })();

  // ================= P09 =================
  (function () {
    let mode = 'agentic', maxIt = 3; const ctl = h('div'), out = h('div');
    ctl.append(row(seg([['plain', '一般 RAG（一次性）'], ['agentic', 'Agentic RAG（可迭代）']], () => mode, v => mode = v, draw), slider('最大迭代次數', 1, 5, 1, () => maxIt, v => maxIt = v, draw)));
    const R = [
      { q: '跌倒 長照服務項目', hits: [['居家無障礙環境改善（扶手、防滑）', .71], ['輔具補助（助行器、便盆椅）', .66]], ev: '有服務項目了，但缺「怎麼申請」——不夠。' },
      { q: '長照 申請流程 照管中心', hits: [['照管中心申請流程與到宅評估', .74]], ev: '服務項目＋申請管道都有了——夠了。' },
    ];
    function draw() {
      out.innerHTML = ''; const steps = h('div');
      if (mode === 'plain') {
        steps.append(box('檢索一次', h('div', null, '查詢：「我媽最近常跌倒，長照可以幫什麼？」（口語原句）', h('br'), '召回：最高分 0.38（< 閾值 0.5）→ 0 段'), { bd: 'var(--bad)' }), box('生成答案', '查無相關資料，建議洽詢當地照管中心。', { bg: 'var(--bad-soft)', st: { marginTop: '6px' } }));
        out.append(steps, kpi(['檢索輪數', 1], ['Token（約）', '1,200'], ['來源數', 0, 'bad']), nt('它沒有第二次機會：一次沒問對關鍵詞，整條路就到此為止。好處是成本可估算。', 'warn'));
        return;
      }
      let used = 0, done = false; const srcs = [];
      steps.append(box('① 分析意圖', '使用者要知道：跌倒相關的長照服務有哪些？要怎麼申請？', { bg: '#fffaf3' }));
      for (let i = 0; i < maxIt && !done; i++) { const r = R[i]; used++; r.hits.forEach(x => srcs.push(x[0]));
        steps.append(box(`第 ${i + 1} 輪`, h('div', null, h('div', null, '② 改寫查詢：', h('b', null, r.q)), h('div', null, '③ 檢索：', r.hits.map(([t, v]) => tok(`${t} ${v.toFixed(2)}`))), h('div', null, '④ 評估證據：', r.ev)), { st: { marginTop: '6px' } }));
        if (i === 1) done = true; }
      steps.append(box('生成答案', done ? '可申請居家無障礙環境改善與輔具補助；請向所在縣市照管中心申請，照管專員會到宅評估後核定。【資料來源】' + srcs.join('、') : '目前查到可申請的服務項目（無障礙改善、輔具），但尚未查到申請管道。⚠ 已達最大迭代次數，資訊可能不完整，建議洽詢當地照管中心。', { bg: done ? 'var(--good-soft)' : 'var(--amber-soft)', st: { marginTop: '6px' } }));
      out.append(steps, kpi(['檢索輪數', used], ['Token（約）', fmt(800 + used * 1900)], ['來源數', srcs.length, done ? 'good' : '']), nt(done ? (maxIt > 2 ? `上限設 ${maxIt}，這次 2 輪就收手；下一次同樣的問題可能查 4 輪——Agentic RAG 的成本無法事先估算。` : '剛好 2 輪就夠。') : '迭代上限太小：證據還不夠就被迫收手——要告知使用者限制。', done ? '' : 'warn'));
    }
    $('#w-agentic').append(ctl, out); draw();
  })();

  // ================= P10 =================
  U.sorter('#w-fail', [
    ['知識檢索節點召回 0 段，但文件裡明明有，系統回答「查無資料」', '召回不到', '降低 Score 閾值／加大 Top-K；檢查切塊是否把規定切散。'],
    ['召回 5 段，分數都只有 0.3 左右；答得很篤定，但引用的段落不相關', '召回錯的', '加 Rerank／提高閾值；清理知識庫裡的無關文件。'],
    ['context 裡有正確段落，答案卻對不上', '召回到但沒用', 'Prompt 強制「只依以下內容回答」；查無依據要說清楚。'],
    ['召回段落來自 2023 年版文件，正確地引用了舊版規定', '文件過時', '標註版本與生效日期並顯示；舊版文件下架或加註。'],
    ['5 段來自 3 份不同縣市的文件，規定互相矛盾', '跨文件矛盾', '用 metadata 過濾：先依縣市／年份把範圍縮小再檢索。'],
    ['問台北市的補助，答案混入新北市與 2024 年的規定', '跨文件矛盾', '不同縣市／年份同時被召回 → metadata 過濾。'],
    ['正確的給付段落排在第 9 名，Top-K=5', '召回不到', '先看切塊（答案可能被切散），再考慮 Rerank 或調閾值。'],
  ], ['召回不到', '召回錯的', '召回到但沒用', '文件過時', '跨文件矛盾'], '前兩種調召回參數，第三種調 Prompt，後兩種治理知識庫本身。');
})();
