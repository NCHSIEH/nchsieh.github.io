/* 補充：n8n 入門與 AI Agent 互動頁 B：PART 07–13 */
(function () {
  'use strict';
  const { h, $, s, svgBox, seg, slider, check, Store } = U;
  const { cap, row, lbl, nt, ttl, kpi, tok, tbl, pre, box, ul, copyBtn } = window.N8;

  // ================= P07 =================
  (function () {
    const P = { root: 'agent', model: 'gemini', mem: true, wiki: true, wx: false, maxIt: true }; const ctl = h('div'), out = h('div');
    const MODELS = { none: ['（未接）', ''], gemini: ['Google Gemini Chat Model', '★ 免費額度較慷慨；課堂推薦首選'], openai: ['OpenAI Chat Model', '需先儲值；生態最成熟'], claude: ['Anthropic Chat Model', '需先儲值；需要較強推理與長文本時'], groq: ['Groq Chat Model', '★ 免費額度寬鬆、速度極快'], ollama: ['Ollama Chat Model', '★ 完全免費、資料不出機器；需先在本機安裝（M7）'] };
    ctl.append(row(lbl('根節點：'), seg([['agent', 'AI Agent'], ['chain', 'Basic LLM Chain']], () => P.root, v => P.root = v, draw)), row(lbl('Chat Model 插槽：'), seg(Object.keys(MODELS).map(k => [k, k === 'none' ? '未接' : MODELS[k][0].replace(' Chat Model', '')]), () => P.model, v => P.model = v, draw)), row(check('Memory：Simple Memory', () => P.mem, v => P.mem = v, draw), check('Tool：Wikipedia', () => P.wiki, v => P.wiki = v, draw), check('Tool：get_weather（HTTP Request Tool）', () => P.wx, v => P.wx = v, draw), check('Options → Max Iterations 設 5–10', () => P.maxIt, v => P.maxIt = v, draw)));
    function draw() { out.innerHTML = ''; const tools = [P.wiki && 'Wikipedia', P.wx && 'get_weather'].filter(Boolean), isA = P.root === 'agent', okM = P.model !== 'none', okT = !isA || tools.length > 0;
      const sv = svgBox(h('div'), 720, 190); s('rect', { x: 260, y: 14, width: 200, height: 54, rx: 10, fill: '#fff', stroke: okM && okT ? '#2a7f78' : '#c0392b', 'stroke-width': 2 }, sv); s('text', { x: 360, y: 38, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, text: isA ? 'AI Agent' : 'Basic LLM Chain' }, sv); s('text', { x: 360, y: 56, 'text-anchor': 'middle', 'font-size': 11.5, style: 'fill:#6b675e', text: 'root node' }, sv);
      const slots = isA ? [['Chat Model', okM ? MODELS[P.model][0].replace(' Chat Model', '') : '必填・未接', okM], ['Memory', P.mem ? 'Simple Memory' : '選填', true], ['Tools', tools.length ? tools.join('、') : '★ 至少一個・未接', okT]] : [['Chat Model', okM ? MODELS[P.model][0].replace(' Chat Model', '') : '必填・未接', okM]];
      slots.forEach(([n, d, ok], i) => { const x = isA ? 70 + i * 220 : 290; s('line', { x1: 360, y1: 68, x2: x + 70, y2: 120, stroke: '#aaa', 'stroke-dasharray': '4 3' }, sv); s('rect', { x, y: 120, width: 140, height: 50, rx: 8, fill: ok ? '#eef3f2' : '#fbe9e7', stroke: ok ? '#2a7f78' : '#c0392b' }, sv); s('text', { x: x + 70, y: 141, 'text-anchor': 'middle', 'font-size': 12.5, 'font-weight': 700, text: (ok ? '' : '⚠ ') + n }, sv); s('text', { x: x + 70, y: 159, 'text-anchor': 'middle', 'font-size': 11, style: 'fill:#6b675e', text: d }, sv); });
      out.append(cap(sv.parentNode, 720));
      if (!okM || !okT) out.append(nt(`紅色驚嘆號：${!okM ? 'Chat Model ' : ''}${!okM && !okT ? '與 ' : ''}${!okT ? 'Tool ' : ''}插槽沒接——官方規定兩者皆為必填，各接上至少一個才能執行。`, 'bad'));
      else out.append(nt(isA ? `可以執行。${P.model !== 'none' ? MODELS[P.model][1] + '。' : ''}${!P.mem ? '沒有 Memory：每一句都是全新對話，追問「那台北呢」它會聽不懂。' : 'Simple Memory 只存在記憶體，n8n 重啟即清空；要永久保存改用 Postgres／Redis Chat Memory。'}` : 'Basic LLM Chain：照固定順序一步接一步，不能用持久記憶、不能呼叫工具——任務單純、路徑固定時更穩定、成本可預估。', ''));
      if (isA && !P.maxIt) out.append(nt('沒設 Max Iterations：Agent 可能一直重複呼叫工具停不下來，費用暴增。', 'warn'));
      out.append(lbl('換大腦不用重做流程：刪掉 Chat Model 子節點、改接另一家即可——這就是子節點設計的好處。'));
    }
    $('#w-agent').append(ctl, out); draw();
  })();

  // ================= P08 =================
  (function () {
    let where = 'docker', url = 'http://localhost:11434'; const ctl = h('div'), out = h('div');
    ctl.append(row(lbl('n8n 跑在：'), seg([['docker', 'Docker 容器裡（本講義的裝法）'], ['host', '直接裝在電腦上']], () => where, v => where = v, draw)), row(lbl('Ollama Chat Model 的 Base URL：'), seg([['http://localhost:11434', 'localhost:11434'], ['http://127.0.0.1:11434', '127.0.0.1:11434'], ['http://host.docker.internal:11434', 'host.docker.internal:11434']], () => url, v => url = v, draw)));
    function draw() { out.innerHTML = ''; const ok = where === 'docker' ? url.includes('host.docker.internal') : !url.includes('host.docker.internal');
      const sv = svgBox(h('div'), 720, 130); s('rect', { x: 10, y: 10, width: 700, height: 110, rx: 10, fill: '#fbfaf6', stroke: '#b9b4a8' }, sv); s('text', { x: 24, y: 30, 'font-size': 12.5, 'font-weight': 700, text: '你的電腦' }, sv);
      if (where === 'docker') { s('rect', { x: 40, y: 42, width: 260, height: 64, rx: 8, fill: '#eef3f2', stroke: '#2a7f78' }, sv); s('text', { x: 170, y: 62, 'text-anchor': 'middle', 'font-size': 12.5, 'font-weight': 700, text: 'Docker 容器：n8n' }, sv); s('text', { x: 170, y: 82, 'text-anchor': 'middle', 'font-size': 11.5, style: 'fill:#6b675e', text: '這裡的 localhost＝容器自己' }, sv); }
      else { s('rect', { x: 40, y: 42, width: 260, height: 64, rx: 8, fill: '#eef3f2', stroke: '#2a7f78' }, sv); s('text', { x: 170, y: 78, 'text-anchor': 'middle', 'font-size': 12.5, 'font-weight': 700, text: 'n8n（直接裝在電腦上）' }, sv); }
      s('rect', { x: 460, y: 42, width: 220, height: 64, rx: 8, fill: '#fff', stroke: '#7a6fb0' }, sv); s('text', { x: 570, y: 70, 'text-anchor': 'middle', 'font-size': 12.5, 'font-weight': 700, text: 'Ollama：11434' }, sv); s('text', { x: 570, y: 88, 'text-anchor': 'middle', 'font-size': 11.5, style: 'fill:#6b675e', text: 'M7 已安裝' }, sv);
      s('line', { x1: 300, y1: 74, x2: 460, y2: 74, stroke: ok ? '#2f7d4f' : '#c0392b', 'stroke-width': 2.5, 'stroke-dasharray': ok ? '' : '6 4' }, sv); s('text', { x: 380, y: 66, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, style: 'fill:' + (ok ? '#2f7d4f' : '#c0392b'), text: ok ? '✓ 連得到' : '✗ 連不到' }, sv);
      out.append(cap(sv.parentNode, 720), nt(ok ? (where === 'docker' ? 'host.docker.internal 指向容器外面的你的電腦——連得到本機的 Ollama。' : 'n8n 和 Ollama 在同一台電腦上，localhost 就是電腦本身。') : where === 'docker' ? '容器內的 localhost 指的是容器自己，裡面沒有 Ollama——這是新手最常見的連線失敗原因。改填 http://host.docker.internal:11434。' : 'n8n 沒有跑在容器裡，不需要 host.docker.internal——用 localhost 即可。', ok ? '' : 'bad'),
        box('金鑰管理原則（與 M8 Dify 一致）', ul(['每人申請自己的金鑰，不共用、不寫進報告、不上傳公開儲存庫', '★ 絕對不要把金鑰直接打在節點參數欄位裡——一定要走 Credential', 'Gemini 金鑰：aistudio.google.com → Get API key → Create API key；n8n 選「Google Gemini(PaLM) Api」憑證貼上']))); }
    $('#w-ollama').append(ctl, out); draw();
  })();

  // ================= P09 =================
  (function () {
    const P = { mem: true, desc: true, lang: true, rule: true, maxIt: true }; let log = [], lastTopic = null; const ctl = h('div'), out = h('div');
    const MSG = ['牛頓是誰？', '東京現在天氣如何？', '那台北呢？', '幫我推薦一部電影', '請問火星上今天的降雨機率？', '我頭痛可以吃什麼藥？'];
    function reply(q) {
      const T = []; let a;
      if (q === '牛頓是誰？') { T.push(['Action', 'Wikipedia', 'query: "Isaac Newton"'], ['Observation', 'Wikipedia', '英國物理學家、數學家，提出萬有引力與三大運動定律…']); a = P.lang ? '根據維基百科，牛頓（Isaac Newton）是英國物理學家與數學家，提出萬有引力定律與三大運動定律。' : 'According to Wikipedia, Isaac Newton was an English physicist and mathematician…'; lastTopic = 'wiki'; }
      else if (q === '東京現在天氣如何？') { if (P.desc) { T.push(['Action', 'get_weather', 'lat: 35.68, lon: 139.69（$fromAI 由 Agent 自己決定）'], ['Observation', 'get_weather', '{ temperature_2m: 18.2, precipitation_probability_max: [30] }']); a = P.lang ? '根據即時天氣資料，東京目前約 18°C，今天降雨機率 30%。' : 'Tokyo is about 18°C with a 30% chance of rain today.'; } else { a = '（沒有呼叫任何工具）東京這個季節通常是晴時多雲，氣溫約 20 度左右。'; } lastTopic = 'weather'; }
      else if (q === '那台北呢？') { if (P.mem && lastTopic === 'weather') { if (P.desc) { T.push(['Action', 'get_weather', 'lat: 25.03, lon: 121.56'], ['Observation', 'get_weather', '{ temperature_2m: 24.3, precipitation_probability_max: [62] }']); a = '台北目前約 24°C，今天降雨機率 62%，出門記得帶傘。'; } else a = '（沒有呼叫任何工具）台北應該比較潮濕，可能會下雨。'; } else a = P.mem ? '請問你想知道台北的什麼呢？' : '請問你想知道台北的什麼呢？（沒有 Memory，它不記得上一句在問天氣）'; }
      else if (q === '幫我推薦一部電影') { a = P.lang ? '可以試試《心靈捕手》，一部關於天賦與人際關係的經典電影。（不需要呼叫工具）' : 'You might enjoy "Good Will Hunting".'; lastTopic = null; }
      else if (q === '請問火星上今天的降雨機率？') { if (P.rule) a = '我查不到這項資訊：天氣工具只提供地球上的城市，火星沒有降雨預報。'; else { const n = P.maxIt ? 5 : 12; for (let i = 0; i < Math.min(n, 4); i++) T.push(['Action', 'get_weather', `lat: ${(4.5 + i).toFixed(1)}, lon: ${(137.4 + i).toFixed(1)}（亂猜座標）`]); if (n > 4) T.push(['…', '', `共重複呼叫 ${n} 輪`]); a = P.maxIt ? '（達到 Max Iterations 上限後停止）火星今天的降雨機率約 0%。' : '（迴圈沒有上限，持續燒額度）火星今天的降雨機率約 0%。'; } lastTopic = null; }
      else if (q === '我頭痛可以吃什麼藥？') { a = P.rule ? '我不能提供用藥建議。頭痛持續或加劇時，請諮詢醫師或藥師。' : '可以考慮服用乙醯胺酚，一般成人一次 500 毫克……（沒有限制時，它會直接給出用藥建議）'; lastTopic = null; }
      return { q, T, a, bad: (q.includes('東京') || q.includes('台北')) && !P.desc || (q.includes('火星') && !P.rule) || (q.includes('頭痛') && !P.rule) || (q === '那台北呢？' && !P.mem) || !P.lang && /^[A-Za-z]/.test(a) };
    }
    function build() { ctl.innerHTML = ''; ctl.append(row(check('Memory（Simple Memory）', () => P.mem, v => P.mem = v, () => { }), check('get_weather 的 Description 寫清楚（含「天氣、氣溫、會不會下雨」）', () => P.desc, v => P.desc = v, () => { }), check('System Message：一律繁體中文', () => P.lang, v => P.lang = v, () => { }), check('System Message：查不到要說查不到、不提供醫療用藥建議', () => P.rule, v => P.rule = v, () => { }), check('Max Iterations 設 5', () => P.maxIt, v => P.maxIt = v, () => { })), row(lbl('送出：'), ...MSG.map(m => h('button', { class: 'btn sm', onclick: () => { log.push(reply(m)); draw(); } }, m)), h('button', { class: 'btn sm', onclick: () => { log = []; lastTopic = null; draw(); } }, '清除對話'))); }
    function draw() { out.innerHTML = ''; if (!log.length) { out.append(lbl('照講義 Step 7 的順序送出，或改設定後再送一次比較。')); return; }
      out.append(h('div', { style: { display: 'grid', gap: '8px', maxHeight: '520px', overflowY: 'auto', padding: '4px' } }, log.map(r => h('div', null, h('div', { style: { textAlign: 'right' } }, h('span', { style: { display: 'inline-block', background: 'var(--accent)', color: '#fff', borderRadius: '12px', padding: '6px 12px', fontSize: '14px' } }, r.q)),
        r.T.length ? h('div', { style: { fontSize: '12.5px', fontFamily: 'var(--mono)', color: 'var(--muted)', margin: '4px 0 4px 8px' } }, r.T.map(([k, t, d]) => h('div', null, `▸ ${k}${t ? ' ' + t : ''}：${d}`))) : h('div', { style: { fontSize: '12.5px', color: 'var(--muted)', margin: '4px 0 4px 8px' } }, '▸ 沒有呼叫工具'),
        h('div', null, h('span', { style: { display: 'inline-block', background: r.bad ? 'var(--bad-soft)' : '#eef3f2', borderRadius: '12px', padding: '6px 12px', fontSize: '14px', maxWidth: '85%' } }, r.a))))),
        nt(log[log.length - 1].bad ? '這一句的行為不對——對照講義的卡關表：Description 不清楚 → 不用工具、憑印象答；沒 Memory → 聽不懂追問；沒寫限制 → 亂猜或給用藥建議；沒指定語言 → 回英文；沒 Max Iterations → 停不下來。' : '行為正確。點對話訊息旁的執行標記，可以看到 Agent 實際呼叫了哪個工具、傳了什麼參數、拿回什麼結果。', log[log.length - 1].bad ? 'bad' : ''),
        h('details', null, h('summary', { style: { cursor: 'pointer', fontSize: '14px' } }, '看講義的 System Message（可直接複製）'), pre('你是一個誠實、有幫助的中文助理，能查詢維基百科與即時天氣。\n\n【使用工具的時機】\n- 使用者詢問人物、地點、歷史、科學等知識性問題時，使用 Wikipedia 工具。\n- 使用者詢問天氣、氣溫、會不會下雨時，使用 get_weather 工具。\n- 一般閒聊或你已經確定知道的常識，不需要呼叫工具。\n\n【回答原則】\n- 一律使用繁體中文回答。\n- 引用工具查到的內容時，簡短說明資料來源。\n- 不確定、或工具查不到時，明確說「我查不到這項資訊」，不要編造。\n- 不提供醫療診斷、用藥建議或法律意見。'))); }
    build(); $('#w-chat').append(ctl, out); draw();
  })();

  // ================= P10 =================
  (function () {
    let key = 'lat', desc = '城市的緯度', type = 'number', where = 'tool'; const out = h('div');
    const ki = h('input', { type: 'text', value: key, style: { width: '140px', padding: '4px 6px' } }), di = h('input', { type: 'text', value: desc, style: { width: '220px', padding: '4px 6px' } });
    ki.oninput = () => { key = ki.value; draw(); }; di.oninput = () => { desc = di.value; draw(); };
    const ctl = h('div', null, row(h('label', { style: { fontSize: '13px', color: 'var(--muted)' } }, 'key ', ki), h('label', { style: { fontSize: '13px', color: 'var(--muted)' } }, 'description ', di)), row(lbl('type：'), seg([['string', 'string'], ['number', 'number'], ['boolean', 'boolean'], ['json', 'json']], () => type, v => type = v, draw), lbl('　寫在：'), seg([['tool', '接在 Agent Tool 插槽的 HTTP Request Tool'], ['node', '一般的 HTTP Request 節點']], () => where, v => where = v, draw)), row(lbl('範例：'), ...[['lat', '城市的緯度', 'number'], ['drug_name', '使用者詢問的藥品學名', 'string'], ['城市', '城市名稱', 'string'], ['cms level', 'CMS 等級', 'number']].map(([k, d, t]) => h('button', { class: 'btn sm', onclick: () => { ki.value = key = k; di.value = desc = d; type = t; draw(); } }, k))));
    function draw() { out.innerHTML = ''; const okKey = /^[A-Za-z0-9_-]+$/.test(key), expr = `{{ $fromAI("${key}", "${desc}", "${type}") }}`, W = [];
      if (!okKey) W.push(['bad', 'key 只能用英數字、底線、連字號——不能有空格或中文。']); if (!desc.trim()) W.push(['warn', 'description 空白：Agent 不知道這個參數代表什麼（強烈建議填）。']); if (where === 'node') W.push(['bad', '$fromAI() 只在「連接到 AI Agent 的 Tool 節點」裡有效；一般節點寫了不會有作用。']);
      out.append(pre(expr, { dark: true }), row(copyBtn(() => expr), lbl('語法：$fromAI(key, description, type, defaultValue)；多數工具參數欄位旁的星星圖示可自動生成。')), ...W.map(([c, t]) => nt(t, c)), W.length ? '' : nt('✓ 可以用。這不是「取值」而是「提示」：Agent 依上下文自己想出該填的值，找不到線索時會反問使用者。')); }
    $('#w-fromai').append(ctl, out); draw();
  })();

  // ================= P11 =================
  U.sorter('#w-debug', [
    ['HTTP Request：Timeout，逾時未回應', '檢查 URL＋Retry On Fail', '網址打錯、外部服務暫時掛掉或網路不通；必要時延長逾時秒數。'],
    ['401 Authentication failed', '檢查 Credential', '九成是 Credential 沒設對或已過期。'],
    ['訊息裡顯示 [object Object]', '對照前一步 OUTPUT', '取到的是整個物件，回 JSON 檢視確認完整路徑。'],
    ['Webhook 的正式網址呼叫沒反應', '按 Publish', '未發布時 Production URL 無效；開發時用 Test URL。'],
    ['改了 workflow，但線上行為沒變', '按 Publish', '存檔不會更新線上版本，每次修改都要再按 Publish。'],
    ['偶爾失敗，大部分時候成功', '檢查 URL＋Retry On Fail', '偶爾失敗通常是外部服務不穩定；每次都失敗才是設定錯誤。'],
  ], ['檢查 URL＋Retry On Fail', '檢查 Credential', '對照前一步 OUTPUT', '按 Publish']);
  (function () {
    const C = [['Credential', '所有節點用到的憑證都已設定，且不是共用帳號'], ['錯誤處理', '關鍵節點設定 Retry On Fail；workflow 掛了 Error Workflow'], ['Publish 發布', '確認已發布；之後每次修改都要再按 Publish'], ['成本評估', 'AI Agent 每次對話會呼叫 LLM 多次——留意用量與免費額度'], ['速率限制', '批次處理用 Loop Over Items 節流'], ['敏感資料', '涉及機構或個人資料時，確認符合自架與資安規範（同 M8／M9）'], ['容器持續運作', '自架版：電腦關機或容器停止，排程與 Webhook 都不會運作'], ['公開 Chatbot 前', '公開＝任何人都能用你的金鑰；先設 Max Iterations，System Message 限制寫嚴謹']];
    const st = Store.get('n8n:launch', {}); const out = h('div');
    function draw() { out.innerHTML = ''; C.forEach(([t, d], i) => { const c = h('input', { type: 'checkbox' }); c.checked = !!st[i]; c.onchange = () => { st[i] = c.checked; Store.set('n8n:launch', st); draw(); }; out.append(h('label', { style: { display: 'flex', gap: '10px', padding: '6px 2px', borderBottom: '1px solid var(--line)', fontSize: '14.5px' } }, c, h('span', null, h('b', null, t), '　', lbl(d)))); }); const n = C.filter((_, i) => st[i]).length; out.append(row(h('span', { class: 'tag ' + (n === C.length ? 'good' : 'gray') }, `完成 ${n} / ${C.length}`))); }
    $('#w-launch').append(out); draw();
  })();

  // ================= P12 =================
  (function () {
    const ROWS = [['LTC-001', '有', '一般戶', '阿公完全臥床，插鼻胃管，大小便都在床上。', 8], ['LTC-002', '無', '中低收', '中風後右側偏癱，無法自行如廁與沐浴。', 4], ['LTC-003', 'Yes', '低收 ', '女兒說："爸爸會問媽媽去哪了"，需要協助進食。', 6], ['LTC-004', '無', '中低收入戶', '可自行行走，但洗澡需要有人在旁。', 3], ['LTC-005', '有', '一般戶', '老人家最近比較沒力氣。', null], ['LTC-006', '無', '低收', '失智中度，夜間遊走，需全日照顧。', 7], ['LTC-007', '有', '一般戶', '骨折術後臥床，換藥與翻身需協助。', 6], ['LTC-008', '無', '一般戶', '輕度失能，需要交通接送就醫。', 2]];
    const CAPS = { 2: 10020, 3: 15460, 4: 18580, 5: 24100, 6: 28070, 7: 32090, 8: 36180 };
    const P = { norm: true, loop: true, retry: true, path: 'chat', bearer: true, str: true, hitl: true, ran: false }; const ctl = h('div'), out = h('div');
    const normFC = v => ({ '有': 'Yes', '無': 'No', 'Yes': 'Yes', 'No': 'No' })[v.trim()] || v, normInc = v => { const t = v.trim(); return t === '中低收入戶' ? '中低收' : t; };
    function build() { ctl.innerHTML = ''; ctl.append(row(check('Set 節點先正規化（有／無 → Yes／No、去空白、統一身分別）', () => P.norm, v => P.norm = v, draw), check('Loop Over Items（Batch Size = 1）', () => P.loop, v => P.loop = v, draw), check('Retry On Fail（3 次、間隔 3000 ms）', () => P.retry, v => P.retry = v, draw)), row(lbl('URL：'), seg([['chat', '/v1/chat-messages'], ['wf', '/v1/workflows/run']], () => P.path, v => P.path = v, draw), check('Header：Bearer app-…', () => P.bearer, v => P.bearer = v, draw), check('transcript 用 JSON.stringify() 帶入', () => P.str, v => P.str = v, draw), check('需人工覆核的個案改發通知、不寫回額度（M9）', () => P.hitl, v => P.hitl = v, draw)), row(h('button', { class: 'btn primary', onclick: () => { P.ran = true; draw(); } }, '▶ Execute Workflow'), lbl('Schedule：每天 02:00'))); }
    function run() { const R = [];
      ROWS.forEach(([id, fc0, inc0, tr, lv], i) => { const fc = P.norm ? normFC(fc0) : fc0, inc = P.norm ? normInc(inc0) : inc0; let st, msg = '', att = 1, rep = '';
        if (!P.bearer) { st = 'err'; msg = '401 unauthorized：金鑰錯誤或漏了 Bearer'; }
        else if (P.path !== 'chat') { st = 'err'; msg = '400 not_chat_app：Chatflow 要用 /chat-messages'; }
        else if (!P.str && /["\n]/.test(tr)) { st = 'err'; msg = 'JSON parameter needs to be valid JSON：逐字稿裡的引號弄壞了 JSON'; }
        else if (!['Yes', 'No'].includes(fc) || !['一般戶', '中低收', '低收'].includes(inc)) { st = 'err'; msg = `400 invalid_param：${!['Yes', 'No'].includes(fc) ? `has_foreign_caregiver="${fc}"` : `income_status="${inc}"`} 不在選項內`; }
        else if (!P.loop && i >= 3) { if (P.retry && i < 5) { att = 2; } else { st = 'err'; msg = '429 too_many_requests：同時打太多請求' + (P.retry ? '（重試 3 次仍失敗）' : ''); } }
        if (!st) { if (lv == null) { st = P.hitl ? 'review' : 'wrote-unknown'; rep = '【預估等級】無法判定，請洽照管專員評估'; } else { st = 'ok'; rep = `【預估等級】CMS 第 ${lv} 級　【月額度上限】${CAPS[lv].toLocaleString()} 元${fc === 'Yes' ? '　（外籍看護排他條款已套用）' : ''}`; } }
        R.push({ id, fc, inc, st, msg, att, rep }); });
      return R; }
    function draw() { out.innerHTML = '';
      const r0 = ROWS[2], body = `{\n  "inputs": {\n    "transcript": ${P.str ? JSON.stringify(r0[3]) : '"' + r0[3] + '"'},\n    "has_foreign_caregiver": "${P.norm ? normFC(r0[1]) : r0[1]}",\n    "income_status": "${P.norm ? normInc(r0[2]) : r0[2]}"\n  },\n  "query": "請根據訪視紀錄產出計畫。",\n  "response_mode": "blocking",\n  "user": "n8n-${r0[0]}"\n}`;
      out.append(h('details', null, h('summary', { style: { cursor: 'pointer', fontSize: '14px' } }, `看 HTTP Request 的 Body（以 ${r0[0]} 為例）`), pre(`POST https://api.dify.ai${P.path === 'chat' ? '/v1/chat-messages' : '/v1/workflows/run'}\nAuthorization: ${P.bearer ? 'Bearer ' : ''}app-你的金鑰（存成 Credential）\nContent-Type: application/json\n\n${body}`, { dark: true })));
      if (!P.ran) { out.append(lbl('按「Execute Workflow」跑一次批次。')); return; }
      const R = run(), ok = R.filter(r => r.st === 'ok').length, rev = R.filter(r => r.st === 'review').length, err = R.filter(r => r.st === 'err').length;
      const C = { ok: ['var(--good-soft)', '✓ 已寫回'], review: ['var(--amber-soft)', '⚑ 已通知督導，未寫回額度'], 'wrote-unknown': ['var(--amber-soft)', '△ 已寫回「無法判定」，沒有人被通知'], err: ['var(--bad-soft)', '✗ 失敗'] };
      out.append(kpi(['成功寫回', ok, ok === 7 ? 'good' : ''], ['轉人工覆核', rev], ['失敗', err, err ? 'bad' : 'good']),
        h('div', { class: 'tscroll' }, h('table', { class: 'dt' }, h('tr', null, ['個案編號', '外籍看護（送出值）', '身分別（送出值）', '狀態', '評估報告／錯誤訊息'].map(c => h('th', null, c))), R.map(r => h('tr', null, h('td', { style: { fontWeight: 600 } }, r.id), h('td', { style: { fontFamily: 'var(--mono)' } }, JSON.stringify(r.fc)), h('td', { style: { fontFamily: 'var(--mono)' } }, JSON.stringify(r.inc)), h('td', { style: { background: C[r.st][0], whiteSpace: 'nowrap' } }, C[r.st][1] + (r.att > 1 ? `（重試 ${r.att - 1} 次後成功）` : '')), h('td', { style: { fontSize: '13px' } }, r.msg || r.rep))))),
        nt(!P.bearer ? 'Header 值格式要是「Bearer 空格 app-xxxx」。' : P.path !== 'chat' ? 'Chatflow 用 /chat-messages；只有 Workflow 型應用才用 /workflows/run。（M8 講義 PART 10 寫的 /v1/workflows/run 是 Workflow 型應用的路徑；接長照 Chatflow 請以本頁為準。）' : !P.norm ? 'Dify 的 Select 型變數只接受表單裡設定的那幾個字串，不會自動轉換——「有」「低收 」（多一個空格）「中低收入戶」都會被拒。先用 Set 節點正規化。' : !P.loop ? 'Dify 免費方案有並發上限：一次打一堆一定會拿到 429。用 Loop Over Items 一筆一筆送，是這個架構能穩定運作的關鍵。' : !P.str ? '逐字稿裡有引號或換行時，直接塞進 JSON 會弄壞格式——用 JSON.stringify() 帶入。' : !P.hitl ? 'LTC-005 資訊不足，Dify 回「無法判定」，但流程照樣寫回、沒有通知任何人——這筆就這樣被埋在試算表裡。' : '全部跑完：7 筆寫回、1 筆資訊不足的個案改發通知請督導處理。機器做初步判斷，人做最終決定。', (!P.bearer || P.path !== 'chat' || !P.norm || !P.loop || !P.str) ? 'bad' : !P.hitl ? 'warn' : ''),
        lbl('延伸：把 metadata.retriever_resources（召回的原文段落）也寫回試算表，承辦就能核對「這個級別是根據哪一條規定判的」（M9 可解釋性）。回應很長時，blocking 模式可能被逾時中斷，可改用 streaming 或縮短輸出。'));
    }
    build(); $('#w-batch').append(ctl, out); draw();
  })();

  // ================= P13 =================
  U.flashcards('#w-cards', [['工作流程', 'Workflow', '從 Trigger 開始依序執行的一群節點'], ['觸發節點', 'Trigger Node', '決定何時開始；藥丸狀'], ['憑證', 'Credential', '存放金鑰，供多個節點共用'], ['執行紀錄', 'Execution', '每跑一次留一筆，除錯第一站'], ['表達式', 'Expression', '{{ }} 動態帶入前面節點資料'], ['節點詳細視窗', 'NDV', '左輸入、中參數、右輸出'], ['資料項', 'Item', '節點會對每一筆各執行一次'], ['根節點', 'Root Node', '如 AI Agent，可接子節點'], ['子節點', 'Sub Node', 'Chat Model／Memory／Tool'], ['鏈', 'Basic LLM Chain', '固定順序、不具持久記憶'], ['迭代上限', 'Max Iterations', 'Agent 迴圈最大輪數'], ['$fromAI()', '$fromAI()', '讓 Agent 自己決定工具參數'], ['分批處理', 'Loop Over Items', '一次處理一筆，避免 429'], ['測試網址', 'Test URL', '未發布時，監聽一次'], ['正式網址', 'Production URL', 'Publish 後固定、持續接收']]);
  U.finalQuiz('#w-final', [
    ['Windows 安裝 n8n 需要先裝哪兩個東西？', ['Node.js 與 Python', 'WSL2 與 Docker Desktop', 'Ubuntu 與 VS Code', '只要瀏覽器'], 1, '不需要安裝 Node.js，也不需要會用 Linux。'],
    ['重開機後 workflow 不見了，最可能的原因？', ['沒按儲存', '啟動時沒有掛 volume', '時區沒設', '埠號被佔用'], 1, '-v n8n_data:/home/node/.n8n。'],
    ['上一個節點輸出 10 筆 item，下一個 HTTP Request 會被呼叫幾次？', ['1 次', '10 次', '看設定', '0 次'], 1, 'n8n 最重要的心智模型。'],
    ['降雨機率條件永遠走同一邊，最可能是？', ['API 壞了', '左值忘了加 [0]，比較的是整個陣列', '右值太大', '沒按 Publish'], 1, '看到 [ ] 就要加索引。'],
    ['Schedule Trigger 設好了卻沒有定時執行？', ['要改成 Manual Trigger', '還沒按 Publish 發布', '要加 Code 節點', '要重灌 Docker'], 1, 'Schedule 只有在已發布時才會真的定時執行。'],
    ['AI Agent 節點的必填插槽是？', ['Memory 與 Tool', 'Chat Model 與至少一個 Tool', '只有 Chat Model', '三個都必填'], 1, 'Memory 選填。'],
    ['Agent 一直不用新接的工具，最該檢查？', ['模型大小', 'Tool 的 Description', 'Memory 長度', 'Docker 版本'], 1, 'Description 是 Agent 判斷何時用它的唯一依據。'],
    ['Docker 版 n8n 連本機 Ollama 的 Base URL？', ['http://localhost:11434', 'http://host.docker.internal:11434', 'http://ollama.com', 'http://0.0.0.0:5678'], 1, '容器內的 localhost 指的是容器自己。'],
    ['n8n 呼叫 Dify 的長照 Chatflow，該打哪個路徑？', ['/v1/workflows/run', '/v1/chat-messages', '/v1/completion', '/api/run'], 1, 'Workflow 型應用才用 /workflows/run。'],
    ['批次送 200 筆給 Dify，為什麼 Batch Size 要設 1？', ['比較好看', '避免觸發並發上限（429）', 'Dify 規定', '節省金鑰'], 1, '用 Loop Over Items 一筆一筆送。'],
  ]);
  (function () {
    const R = [['骨架只有一個', 'Trigger → 抓資料 → 判斷 → 輸出。', 'p01'], ['volume 與時區', '資料不見、差 8 小時的兩大原因。', 'p02'], ['每筆 item 跑一次', '10 筆就是 10 次呼叫。', 'p05'], ['看到 [ ] 加 [0]', 'If 永遠同一邊的頭號原因。', 'p06'], ['Chat Model＋Tool 必填', 'Memory 選填；統一為 Tools Agent。', 'p07'], ['host.docker.internal', '容器內的 localhost 是容器自己。', 'p08'], ['Description 決定一切', 'Agent 不用工具，九成是描述不清。', 'p09'], ['沒 Publish 就沒動', '存檔不會更新線上版本。', 'p11'], ['Dify 判斷、n8n 搬運', '正規化、一筆一筆送、異常轉人工。', 'p12']];
    const g = h('div', { class: 'grid3' }); R.forEach(([t, d, id], i) => g.append(h('a', { href: '#' + id, style: { textDecoration: 'none', color: 'inherit', border: '1px solid var(--line)', borderRadius: '10px', padding: '10px 12px', background: '#fff', display: 'block' } }, h('div', { class: 'mono', style: { color: 'var(--accent)', fontWeight: 700 } }, i + 1), h('b', null, t), h('div', { style: { fontSize: '13.5px', color: 'var(--muted)' } }, d))));
    $('#w-review').append(g, h('div', { class: 'note' }, h('b', null, '下一步：'), '挑一個你自己真的會用到的流程，實際做一個屬於自己的 workflow。資源：docs.n8n.io、learn.n8n.io、n8n.io/workflows。', h('a', { href: '../' }, '回到課程首頁 →')));
  })();
})();
