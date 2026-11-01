/* M10 互動頁 A：PART 01–10 */
(function () {
  'use strict';
  const { h, $, s, svgBox, seg, slider, check, Store } = U;
  U.initModule('m10');
  const cap = (el, px) => { el.style.maxWidth = px + 'px'; el.style.width = '100%'; el.style.margin = '0 auto'; return el; };
  const row = (...a) => h('div', { class: 'row', style: { marginBottom: '6px' } }, ...a);
  const lbl = t => h('span', { style: { fontSize: '14px', color: 'var(--muted)' } }, t);
  const nt = (t, cls = '') => h('div', { class: 'note ' + cls, style: { fontSize: '14px' } }, t);
  const ttl = t => h('b', { style: { fontSize: '13.5px' } }, t);
  const kpi = (...a) => h('div', { class: 'kpi' }, ...a.map(([k, v, c]) => h('div', null, h('div', { class: 'k' }, k), h('div', { class: 'v ' + (c || '') }, v))));
  const tok = (t, o = {}) => h('span', { style: { display: 'inline-block', margin: '2px', padding: '3px 7px', borderRadius: '6px', fontSize: '14px', background: o.bg || '#eef3f2', fontWeight: o.b ? 700 : 400, color: o.c || 'inherit', fontFamily: o.mono ? 'var(--mono)' : 'inherit' } }, t);
  const tbl = (head, rows) => h('div', { class: 'tscroll' }, h('table', { class: 'dt' }, h('tr', null, head.map(c => h('th', null, c))), rows.map(r => h('tr', null, r.map((v, j) => v instanceof Node ? h('td', null, v) : h('td', { style: { fontWeight: j ? 400 : 600 } }, v))))));
  const pre = (t, o = {}) => h('pre', { style: { whiteSpace: 'pre-wrap', background: o.dark ? '#1f2a2b' : '#f6f5f1', color: o.dark ? '#d9e4e2' : 'inherit', border: '1px solid var(--line)', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', lineHeight: '1.6', margin: '6px 0', fontFamily: 'var(--mono)' } }, t);
  const box = (title, body, o = {}) => h('div', { style: { border: '1px solid ' + (o.bd || 'var(--line)'), background: o.bg || '#fff', borderRadius: '10px', padding: '10px 12px', fontSize: '14px', ...(o.st || {}) } }, title ? h('div', { style: { fontWeight: 700, marginBottom: '4px', color: o.tc || 'inherit' } }, title) : '', body);
  const copyBtn = getText => { const b = h('button', { class: 'btn sm' }, '複製'); b.onclick = () => { const t = getText(); try { navigator.clipboard.writeText(t).then(() => { b.textContent = '✓ 已複製'; setTimeout(() => b.textContent = '複製', 1500); }, () => { b.textContent = '請手動選取複製'; }); } catch (e) { b.textContent = '請手動選取複製'; } }; return b; };
  const ul = items => h('ul', { style: { margin: '4px 0', paddingLeft: '18px' } }, items.map(x => h('li', null, x)));
  const M10 = window.M10 = { cap, row, lbl, nt, ttl, kpi, tok, tbl, pre, box, copyBtn, ul };

  // ================= P01 =================
  (function () {
    const E = [['1960s–70s', '結構化程式設計', ['GOTO → 結構化控制流', 'Fortran、COBOL、C', '抽象層級：機器 → 邏輯', '人要懂電腦怎麼運作']], ['1980s–90s', '物件導向', ['封裝、繼承、多型', 'C++、Java、Python', '抽象層級：邏輯 → 概念', '人用現實世界的比喻思考']], ['2000s–10s', '敏捷與 DevOps', ['快速迭代、持續整合', 'Scrum、Kanban、CI/CD', '抽象層級：程式 → 流程', '重點從寫得對變成交付得快']], ['2020s', 'AI 輔助開發', ['Copilot、ChatGPT、Cursor', '自然語言 → 程式碼', '抽象層級：概念 → 意圖', '★ 人描述要什麼，不描述怎麼做']]];
    let k = 3; const out = h('div');
    function draw() { out.innerHTML = ''; const W = 720, sv = svgBox(h('div'), W, 120);
      E.forEach(([y, t], i) => { const x = 20 + i * 175, yy = 90 - i * 22, on = i === k, g = s('g', { style: 'cursor:pointer' }, sv);
        s('rect', { x, y: yy - 30, width: 160, height: 44, rx: 8, fill: on ? 'var(--accent)' : '#fff', stroke: '#2a7f78', 'stroke-width': 1.5 }, g);
        s('text', { x: x + 80, y: yy - 12, 'text-anchor': 'middle', 'font-size': 12, style: 'fill:' + (on ? '#fff' : '#6b675e'), text: y }, g);
        s('text', { x: x + 80, y: yy + 6, 'text-anchor': 'middle', 'font-size': 13.5, 'font-weight': 700, style: 'fill:' + (on ? '#fff' : '#222'), text: t }, g);
        g.addEventListener('click', () => { k = i; draw(); }); });
      s('text', { x: 700, y: 16, 'text-anchor': 'end', 'font-size': 12, style: 'fill:#b45309', text: '抽象層級 ↑' }, sv);
      out.append(cap(sv.parentNode, 720), box(`${E[k][0]}　${E[k][1]}`, ul(E[k][2]), { bg: 'var(--accent-soft)' }), nt('貫穿五十年的單一主線：抽象層級持續提高。Vibe Coding 是這條線的最新一段，不是斷裂式的革命。')); }
    $('#w-era').append(out); draw();
  })();

  // ================= P02 =================
  (function () {
    const L = [['手工撰寫', 'AI 只用來查文件或解釋錯誤訊息', '你寫每一行', '—', 95], ['行內補全', 'AI 補完當前這一行或下一個區塊；你仍主導每一個決定', '每一個補全', '小、局部', 80], ['區塊生成', '以註解或對話描述一個函式，AI 產出整段', '逐行審查後採用', '一段函式', 55], ['代理協作', 'AI 讀懂整個專案，自行修改多個檔案', '計畫與 diff，而非逐行', '可能一次改壞很多地方', 25], ['完全交付', '描述目標即產出可運行的應用', '只看結果，不看程式碼', '你可能完全不知道哪裡錯', 8]];
    let lv = 2; const ctl = h('div'), out = h('div');
    ctl.append(row(slider('Level', 0, 4, 1, () => lv, v => lv = v, draw, v => 'Level ' + v)));
    function draw() { out.innerHTML = ''; const [n, d, rv, err, hu] = L[lv];
      const bar = h('div', { style: { display: 'flex', height: '30px', borderRadius: '8px', overflow: 'hidden', margin: '6px 0', fontSize: '13px', fontWeight: 700 } }, h('div', { style: { width: hu + '%', background: '#7a6fb0', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' } }, hu > 15 ? '你寫' : ''), h('div', { style: { width: (100 - hu) + '%', background: '#2a7f78', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' } }, 100 - hu > 15 ? 'AI 寫' : ''));
      out.append(h('div', { style: { fontSize: '18px', fontWeight: 700 } }, `Level ${lv}　${n}`), bar, lbl('程式碼由誰寫的比例（示意）'), h('div', { class: 'grid3', style: { marginTop: '8px' } }, box('做法', d), box('你審查什麼', rv), box('出錯的規模', err)),
        nt(lv >= 3 ? '這是真正的 Karpathy 式 vibe coding。適合「不熟 × 低風險」的任務；碰到會影響真實決策的計算，就該往下調。' : lv === 2 ? '多數人在 Level 2–3 之間游走，依任務風險調整強度——這才是專業的用法。' : '你比 AI 更快知道要什麼時，用補全型就夠了。', lv === 4 ? 'warn' : '')); }
    $('#w-level').append(ctl, out); draw();
  })();
  $('#w-agentic').append(tbl(['比較項目', 'Copilot 式（Level 1–2）', 'Agentic 式（Level 3–4）'], [['互動方式', '你寫，它補；以游標位置為中心', '你說目標，它規劃並執行多個步驟'], ['看得到多少', '當前檔案與少量上下文', '整個專案結構、依賴關係、測試檔'], ['能改幾個檔案', '通常一個', '可同時新增、修改、刪除多個檔案'], ['你審查什麼', '逐行看它補的程式碼', '它提出的計畫，以及最後的 diff'], ['出錯的規模', '小而局部，容易發現', '可能一次改壞很多地方，需靠版本控制救回'], ['適合的任務', '熟悉的程式碼、精細調整', '新功能、重構、你不熟的技術棧']]), nt('兩者不是取代關係：日常編輯用 Copilot 式，大工程用 Agentic 式。'));

  // ================= P03 =================
  U.sorter('#w-where', [
    ['資料清理腳本（重複性高、邏輯明確）', '很適合', 'M1；算錯了你看得出來。'],
    ['批次檔案處理、格式轉換', '很適合', 'M1。'],
    ['視覺化圖表產生', '很適合', 'M1；畫錯一眼就看得出來。'],
    ['報表與文件自動生成', '很適合', 'M10。'],
    ['統計分析與模型訓練程式', '要小心', 'M2–M5；程式能跑不代表方法對。'],
    ['評估指標的計算與解讀', '要小心', 'M2；指標算錯不會報錯。'],
    ['臨床決策邏輯、給付金額計算', '要小心', 'M8；數字不生成，要查表並驗算。'],
    ['小型網頁工具、儀表板原型', '很適合', 'M10。'],
  ], ['很適合', '要小心'], '判準：這段程式碼算錯了，你有沒有辦法看出來？');
  $('#w-link').append(h('div', { class: 'grid3' }, box('M7 生成式 AI → 本模組', ul(['Token、上下文、提示詞是直接的操作基礎', 'M7 輸出是文字，這裡是「會被執行的程式碼」', '程式碼可以被測試驗證——相對於一般文字生成的優勢'])), box('M8 Dify Agent → 本模組', ul(['Agentic coding 用的是完全相同的迴圈', '只是工具換成「讀檔、改檔、跑測試」', '「工具描述要寫清楚」「要有失敗分支」一樣適用'])), box('M9 倫理 → 本模組', ul(['AI 生成的程式碼一樣會有偏誤', '劑量、給付、風險分數必須人工驗證', '「我不知道這段程式碼在做什麼」在醫療場域不可接受']))));

  // ================= P04 =================
  $('#w-tools').append(tbl(['工具', '形態', '設計哲學', '適合誰'], [['Cursor', '獨立 IDE（VS Code 分支）', '把 AI 織進編輯體驗的每一層', '需要順手的完整編輯環境；初學者相對友善'], ['Claude Code', '終端機原生代理', '在命令列直接運作，強調理解整個程式碼庫與多檔案修改', '偏好命令列、處理複雜或大型專案'], ['GitHub Copilot', '平台整合', '橫跨 VS Code 與 GitHub 生態', '已經在用 GitHub 的團隊；入門價位最低']]),
    h('div', { class: 'grid3', style: { marginTop: '8px' } }, box('① 任務規模', '改幾行 → 補全型就夠；跨多個檔案 → 代理型。'), box('② 計費與用量', '多已轉向用量計費，代理模式特別耗用量；先用免費額度跑通。'), box('③ 資料會送到哪裡', '★ 真實個案資料是紅線；敏感專案改用本地模型（Ollama）。', { bd: 'var(--bad)' })), nt('這個領域變化極快，實際採用前請自行確認最新的功能與計費方式。', 'warn'));
  (function () {
    const Q = { '不熟-低': ['最適合 Agentic 模式', ['讓 AI 主導、你看結果', '學習效果也最好']], '不熟-高': ['★ 最危險的象限', ['AI 寫得出來、你看不出對錯', '做法：先找人審查，或不要用']], '熟悉-低': ['用補全型即可', ['你比 AI 更快知道要什麼', 'AI 負責打字，你負責思考']], '熟悉-高': ['可以用，但要逐行審查', ['AI 提案、你做最終決定', '務必寫測試驗證']] };
    const T = [['做一個資料視覺化小工具', '不熟', '低'], ['臨床劑量計算邏輯', '不熟', '高'], ['熟悉的資料清理腳本', '熟悉', '低'], ['模型評估指標的計算', '熟悉', '高'], ['給家屬看的長照給付金額試算（第一次寫網頁）', '不熟', '高'], ['把自己的會議紀錄轉成表格', '熟悉', '低']];
    let f = '不熟', r = '高', ti = 1; const ctl = h('div'), out = h('div');
    function build() { ctl.innerHTML = ''; ctl.append(row(lbl('例子：'), ...T.map(([t, a, b], i) => h('button', { class: 'btn sm' + (i === ti ? ' on' : ''), onclick: () => { ti = i; f = a; r = b; build(); draw(); } }, t))), row(lbl('或自己選：你的熟悉度'), seg([['不熟', '不熟'], ['熟悉', '熟悉']], () => f, v => { f = v; ti = -1; }, () => { build(); draw(); }), lbl('　任務風險'), seg([['低', '低（做壞重來就好）'], ['高', '高（會影響真實決策）']], () => r, v => { r = v; ti = -1; }, () => { build(); draw(); }))); }
    function draw() { out.innerHTML = ''; const g = h('div', { style: { display: 'grid', gridTemplateColumns: '70px 1fr 1fr', gap: '6px', alignItems: 'stretch' } });
      g.append(h('div'), h('div', { style: { textAlign: 'center', fontSize: '13px', color: 'var(--muted)' } }, '風險：低'), h('div', { style: { textAlign: 'center', fontSize: '13px', color: 'var(--muted)' } }, '風險：高'));
      ['不熟', '熟悉'].forEach(ff => { g.append(h('div', { style: { fontSize: '13px', color: 'var(--muted)', display: 'flex', alignItems: 'center' } }, ff)); ['低', '高'].forEach(rr => { const k = ff + '-' + rr, on = ff === f && rr === r, danger = k === '不熟-高'; g.append(box(Q[k][0], ul(Q[k][1]), { bg: on ? (danger ? 'var(--bad-soft)' : 'var(--accent-soft)') : '#fff', bd: on ? (danger ? 'var(--bad)' : 'var(--accent)') : 'var(--line)', st: { borderWidth: on ? '2px' : '1px' } })); }); });
      out.append(g, nt(f === '不熟' && r === '高' ? 'AI 能產出你看不懂但看起來很合理的程式碼。看不懂就不要用在會影響別人的地方。' : '依任務風險調整強度，不是永遠全開。', f === '不熟' && r === '高' ? 'bad' : '')); }
    build(); $('#w-quad').append(ctl, out); draw();
  })();

  // ================= P05 =================
  (function () {
    let k = 'dify'; const ctl = h('div'), out = h('div');
    const D = { dify: ['Dify Agent（W15）', ['① Thought：缺什麼資訊？', '② Call Tool：Wikipedia／搜尋／知識庫', '③ Observation：讀回工具結果', '④ 夠了嗎？不夠回到 ①'], '你替 Agent 掛上 Wikipedia、搜尋工具。'], mcp: ['編碼助理＋MCP（M10）', ['① 想：要改哪裡？', '② 呼叫工具：讀檔／改檔／跑測試／查資料庫', '③ 觀察：看測試結果與錯誤訊息', '④ 測試過了嗎？沒過回到 ①'], '你替編碼助理掛上檔案系統、資料庫、瀏覽器。'] };
    ctl.append(row(seg([['dify', '在 Dify 裡'], ['mcp', '在編碼工具裡']], () => k, v => k = v, draw)));
    function draw() { out.innerHTML = ''; const [t, st, d] = D[k], sv = svgBox(h('div'), 720, 210), P = [[360, 30], [600, 105], [360, 180], [120, 105]];
      P.forEach(([x, y], i) => { s('rect', { x: x - 115, y: y - 20, width: 230, height: 40, rx: 20, fill: i === 1 ? 'var(--accent-soft)' : '#fff', stroke: '#2a7f78', 'stroke-width': 1.5 }, sv); s('text', { x, y: y + 5, 'text-anchor': 'middle', 'font-size': 12.5, text: st[i] }, sv); });
      [[0, 1], [1, 2], [2, 3], [3, 0]].forEach(([a, b]) => { const [x1, y1] = P[a], [x2, y2] = P[b]; s('path', { d: `M${x1 + (x2 - x1) * .35} ${y1 + (y2 - y1) * .35} L${x1 + (x2 - x1) * .65} ${y1 + (y2 - y1) * .65}`, stroke: '#888', 'stroke-width': 1.5, 'marker-end': '' }, sv); });
      s('text', { x: 360, y: 110, 'text-anchor': 'middle', 'font-size': 14, 'font-weight': 700, style: 'fill:#2a7f78', text: t }, sv);
      out.append(cap(sv.parentNode, 720), nt(h('span', null, d, ' 迴圈完全相同——共同原則：', h('b', null, '工具描述要寫清楚，否則 AI 會在錯的時機調用它。'))), lbl('Lab 中的用途：接上檔案系統，讓 AI 直接讀你的資料集結構；接上瀏覽器，讓 AI 查最新的套件文件。MCP 生態變化快，可用連接器以官方文件為準。')); }
    $('#w-mcp').append(ctl, out); draw();
  })();

  // ================= P06 =================
  (function () {
    const S6 = [['規劃與規格', '寫下目標、範圍、使用者、輸入輸出、不做什麼', '一份 PRD.md（一頁即可）', '跳過這步直接開始聊'], ['環境與骨架', '建立專案、Git 初始化、選定技術棧', '可運行的空專案＋第一次 commit', '沒有版本控制就開始改'], ['生成', '以 Prompt 描述單一功能，一次只做一件事', '一段可執行的程式碼', '一次要求太多功能'], ['執行與驗證', '實際跑起來看結果，補上測試', '執行結果＋測試通過', '看起來對就當成對'], ['審查與迭代', '閱讀 diff，判斷方向對不對，給出具體修正', '確認過的變更', '盲目接受 AI 的所有修改'], ['部署與交付', '部署到可存取的位置，設定自動化流程', '可分享的網址', '本機能跑就以為完成']];
    let k = 0; const out = h('div');
    function draw() { out.innerHTML = ''; const sv = svgBox(h('div'), 720, 300), cx = 360, cy = 150, R = 115;
      s('circle', { cx, cy, r: R, fill: 'none', stroke: '#cfe3df', 'stroke-width': 10 }, sv); s('text', { x: cx, y: cy - 4, 'text-anchor': 'middle', 'font-size': 18, 'font-weight': 700, style: 'fill:#2a7f78', text: 'Vibe' }, sv); s('text', { x: cx, y: cy + 18, 'text-anchor': 'middle', 'font-size': 18, 'font-weight': 700, style: 'fill:#2a7f78', text: 'Loop' }, sv);
      S6.forEach(([t], i) => { const a = -Math.PI / 2 + i * Math.PI / 3, x = cx + R * Math.cos(a) * 1.55, y = cy + R * Math.sin(a) * 1.05, on = i === k, g = s('g', { style: 'cursor:pointer' }, sv);
        s('rect', { x: x - 78, y: y - 20, width: 156, height: 40, rx: 10, fill: on ? 'var(--accent)' : '#fff', stroke: i === 0 ? '#b45309' : '#2a7f78', 'stroke-width': i === 0 ? 2.2 : 1.5 }, g);
        s('text', { x, y: y + 5, 'text-anchor': 'middle', 'font-size': 13.5, 'font-weight': 700, style: 'fill:' + (on ? '#fff' : '#222'), text: `${i + 1}　${t}` }, g); g.addEventListener('click', () => { k = i; draw(); }); });
      const [t, d, o, e] = S6[k];
      out.append(cap(sv.parentNode, 720), h('div', { class: 'grid3' }, box('做什麼', d), box('產出', o, { bg: 'var(--accent-soft)' }), box('最常見的錯', e, { bg: 'var(--bad-soft)' })), k === 0 ? nt('第 1 步最常被略過，也是失敗率最高的原因。', 'warn') : ''); }
    $('#w-six').append(out); draw();
  })();

  // ================= P07 =================
  (function () {
    const PRE = { task: [['壞例子', '幫我做一個病人資料管理系統'], ['好例子', '閱讀 @PRD.md 第 3 節，實作病人清單的篩選功能。只改 components/PatientList.tsx，不要動資料層。'], ['差一點', '幫我在病人清單加上篩選功能，順便把登入和報表也做一做。']], fix: [['壞例子', '這樣不對，再改一次'], ['好例子', '執行後出現這個錯誤：TypeError: Cannot read properties of undefined (reading \'map\')。預期是顯示 5 筆病人，實際得到空白畫面。'], ['差一點', '畫面怪怪的，金額好像算錯了，請修正。']] };
    let mode = 'task', txt = PRE.task[1][1]; const ctl = h('div'), out = h('div');
    const ta = h('textarea', { rows: 3, style: { width: '100%', fontSize: '14.5px', padding: '6px 8px', borderRadius: '8px', border: '1px solid var(--line)' } }); ta.value = txt; ta.oninput = () => { txt = ta.value; draw(); };
    function build() { ctl.innerHTML = ''; ctl.append(row(seg([['task', '任務 Prompt'], ['fix', '修正 Prompt']], () => mode, v => { mode = v; ta.value = txt = PRE[v][0][1]; }, () => { build(); draw(); }), ...PRE[mode].map(([n, t]) => h('button', { class: 'btn sm', onclick: () => { ta.value = txt = t; draw(); } }, n))), ta); }
    function draw() { out.innerHTML = ''; const t = txt;
      const C = mode === 'task' ? [['明確的參照（@檔案、第幾節）', /@\S+|第\s*\S+\s*節|PRD/i.test(t)], ['單一目標（一次一件事）', !/系統|全部|所有功能|整個|順便|還有|和.*也/.test(t) && t.length > 6], ['明確的邊界（只改哪裡）', /只改|只修改|只動|不要動|不要更動|不要修改|不要改/.test(t)]] : [['貼完整錯誤訊息', /error|exception|錯誤[:：]|訊息[:：]|Traceback/i.test(t)], ['說明實際得到什麼', /實際|得到|顯示/.test(t)], ['說明預期是什麼', /預期|應該|應為|應顯示/.test(t)]];
      const vague = /不對|再改一次|怪怪|好像|爛|有問題/.test(t) && !C.every(c => c[1]), n = C.filter(c => c[1]).length;
      out.append(h('div', { style: { margin: '6px 0' } }, C.map(([k, ok]) => tok((ok ? '✓ ' : '✗ ') + k, { bg: ok ? 'var(--good-soft)' : 'var(--bad-soft)', c: ok ? 'var(--good)' : 'var(--bad)' })), vague ? tok('⚠ 形容詞多、證據少', { bg: 'var(--amber-soft)', c: 'var(--amber)' }) : ''),
        nt(n === 3 ? (mode === 'task' ? '三個要素到齊：AI 知道看哪裡、做什麼、不能碰什麼。' : '錯誤訊息、實際、預期三樣給齊——成功率會高很多。') : mode === 'task' ? `缺 ${3 - n} 個要素。太大的任務 AI 會亂猜；不給邊界，它可能順手改了你不想動的檔案。` : `缺 ${3 - n} 樣證據。AI 看不到你的螢幕——「這樣不對」它不知道哪裡不對。`, n === 3 ? '' : 'warn'),
        mode === 'task' ? lbl('第三種句型 System Prompt：在專案根目錄放規則檔（Cursor：.cursor/rules；Claude Code：CLAUDE.md；通用：AGENTS.md），寫技術棧、風格、命名、禁止事項、領域背景。') : ''); }
    build(); $('#w-diag').append(ctl, out); draw();
  })();
  (function () {
    const T = {
      feat: ['新功能開發', [['節', 'N', '3'], ['功能', '功能名稱', '病人清單的篩選'], ['檔案', '檔案路徑', 'components/PatientList.tsx']], v => `閱讀 @PRD.md 第 ${v[0]} 節，實作${v[1]}。\n只修改 ${v[2]}，不要更動其他檔案。完成後說明你改了什麼。`],
      bug: ['除錯', [['錯誤', '完整錯誤訊息', 'TypeError: Cannot read properties of undefined'], ['A', '預期行為', '顯示 5 筆資料'], ['B', '實際得到', '空白畫面']], v => `執行時出現以下錯誤：\n${v[0]}\n預期行為是${v[1]}，實際得到${v[2]}。請先說明你認為原因是什麼，再提出修改。`],
      ref: ['重構', [['檔案', '檔案', 'utils/report.js']], v => `@${v[0]} 這個函式太長且難以測試。請拆分成數個單一職責的小函式，\n保持對外介面不變，並補上對應的測試。`],
      exp: ['解釋既有程式碼', [['檔案', '檔案', 'src/App.jsx'], ['重點', '某個變數或流程', '自負額的計算']], v => `請逐段解釋 @${v[0]} 在做什麼，特別說明${v[1]}的用途。\n用我看得懂的方式說，假設我不熟這個框架。`],
      test: ['寫測試', [['檔案', '檔案', 'src/calc.js'], ['函式', '函式名稱', 'copayOf'], ['框架', '測試框架', 'Vitest']], v => `為 @${v[0]} 的 ${v[1]} 撰寫測試，涵蓋正常情況、邊界值與錯誤輸入。\n使用 ${v[2]}。`],
    };
    let k = 'feat'; const val = {}; const ctl = h('div'), out = h('div');
    Object.keys(T).forEach(x => val[x] = T[x][1].map(f => f[2]));
    function build() { ctl.innerHTML = ''; ctl.append(row(seg(Object.keys(T).map(x => [x, T[x][0]]), () => k, v => k = v, () => { build(); draw(); })), h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '8px' } }, T[k][1].map((f, i) => { const e = h('input', { type: 'text', value: val[k][i], style: { width: f[0] === '錯誤' ? '360px' : '220px', padding: '4px 6px' } }); e.oninput = () => { val[k][i] = e.value; draw(); }; return h('label', { style: { fontSize: '13px', color: 'var(--muted)', display: 'flex', flexDirection: 'column' } }, f[1], e); }))); }
    function draw() { out.innerHTML = ''; const t = T[k][2](val[k]); out.append(pre(t, { dark: true }), row(copyBtn(() => T[k][2](val[k])), lbl('共同點：明確的檔案參照、明確的範圍、明確的預期。'))); }
    build(); $('#w-tpl').append(ctl, out); draw();
  })();

  // ================= P08 =================
  (function () {
    const S = [['初始化', '建立 GitHub 儲存庫；用 AI 產生專案骨架與 README；完成第一次 commit', 'git log 看得到第一筆紀錄；專案能在本機啟動'], ['規格', '寫一份 PRD.md：目標、使用者、功能清單、不做什麼', '一頁以內，且你自己看得懂'], ['Vibe Session', '三到五個 Prompt：資料結構 → 清單元件 → 新增與完成 → 篩選 → AI 拆解功能', '每個 Prompt 之後都執行一次，確認畫面真的動起來'], ['迭代與除錯', '跑不起來時貼錯誤訊息、貼實際輸出、說明預期', '每修好一個問題就 commit 一次'], ['測試', '請 AI 為核心邏輯補上測試並執行', '測試全部通過；故意改壞一行看測試會不會抓到'], ['部署', '推上 GitHub，在 Vercel 連接儲存庫自動部署；GitHub Actions 每次推送跑測試', '拿到公開網址，用手機打得開']];
    const st = Store.get('m10:tf', {}); const out = h('div');
    function draw() { out.innerHTML = ''; S.forEach(([t, d, c], i) => { const cb = h('input', { type: 'checkbox' }); cb.checked = !!st[i]; cb.onchange = () => { st[i] = cb.checked; Store.set('m10:tf', st); draw(); }; out.append(h('label', { style: { display: 'grid', gridTemplateColumns: '24px 130px 1fr 1fr', gap: '8px', padding: '7px 2px', borderBottom: '1px solid var(--line)', fontSize: '14px', alignItems: 'start' } }, cb, h('b', null, `${i + 1}　${t}`), h('span', null, d), h('span', { style: { color: 'var(--accent)' } }, '✓ ' + c))); });
      const n = S.filter((_, i) => st[i]).length; out.append(row(h('span', { class: 'tag ' + (n === S.length ? 'good' : 'gray') }, `檢查點 ${n} / ${S.length}`), lbl('技術棧：Next.js（React）、Tailwind CSS、TypeScript、Git＋GitHub、Vercel、GitHub Actions；資料存在瀏覽器記憶體，不接資料庫。'))); }
    $('#w-taskflow').append(out); draw();
  })();

  // ================= P09 =================
  U.sorter('#w-stuck', [
    ['你只跟 AI 說「壞了」，它改了兩次都沒改到點上', '給足證據', '貼完整錯誤訊息、實際輸出與預期，附上 @檔案。'],
    ['AI 連續改了三次還是壞的，而且越改越亂', '退回上一個好狀態', '方向錯了：用 Git 退回最後一個可運行的版本，換一種說法重新描述需求。'],
    ['要它改一段給付金額的計算邏輯（高風險）', '先解釋再動手', '「請先說明你認為原因是什麼，再提出修改」——在高風險程式碼上這一步不可省。'],
    ['同一個問題，用盡方法這個模型就是解不出來', '換模型或工具', '不同模型的訓練資料與強項不同，換個工具有時就過了。'],
    ['AI 說它「修好了」，但你看不出它到底改了什麼方向', '先解釋再動手', '從它的解釋判斷有沒有搞錯方向；解釋明顯錯誤時直接糾正。'],
    ['剛剛還能跑，接受 AI 一大串修改後整個開不起來', '退回上一個好狀態', '沒有 commit 就沒有退路——每次功能可運行就立刻 commit。'],
  ], ['給足證據', '先解釋再動手', '退回上一個好狀態', '換模型或工具']);

  // ================= P10 =================
  (function () {
    const ST = [['① 想清楚', 5, true], ['② 第一個指令', 1, false], ['③ 看懂資料夾', 3, true], ['④ 迭代修正', 10, false], ['⑤ 本機測試', 3, false], ['⑥ 推上 GitHub', 5, true], ['⑦ 雲端部署', 5, true]];
    const sv = svgBox(h('div'), 720, 120), bw = 720 / 32;
    let x = 0; ST.forEach(([t, m, hard], i) => { const w = m * bw; s('rect', { x: x + 1, y: 20, width: w - 2, height: 40, rx: 4, fill: hard ? '#e0a34a' : '#7fb3ad' }, sv); s('text', { x: x + w / 2, y: 45, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, style: 'fill:#fff', text: m + ' 分' }, sv); s('text', { x: x + w / 2, y: 80 + (i % 2) * 16, 'text-anchor': 'middle', 'font-size': 12, text: t }, sv); x += w; });
    s('text', { x: 0, y: 12, 'font-size': 11.5, style: 'fill:#b45309', text: '橘色＝學生最常卡住的階段（①③⑥⑦）' }, sv);
    $('#w-seven').append(cap(sv.parentNode, 720), nt('想不清楚要做什麼 → 指令下得含糊；看不懂資料夾 → 只能一直重生成；⑥⑦ 做不出來 → 東西只存在自己電腦裡，沒辦法給別人用。'));
  })();
  (function () {
    const F = [['做什麼', '單頁的長照給付試算器'], ['給誰用', '照管專員與家屬，手機也要能正常顯示'], ['輸入什麼', 'CMS 等級（2–8 的下拉選單）、身分別（一般戶／中低收／低收）'], ['輸出什麼', '每月給付額度上限、民眾自負額（金額與比率）、可申請的服務類別'], ['技術限制', '純前端、單一 HTML 檔、不要資料庫、不要引入額外套件']];
    const v = F.map(f => f[1]); let data = true; const ctl = h('div'), out = h('div');
    F.forEach(([k], i) => { const e = h('input', { type: 'text', value: v[i], style: { flex: 1, padding: '5px 8px', fontSize: '14px' } }); e.oninput = () => { v[i] = e.value.trim(); draw(); }; ctl.append(h('label', { style: { display: 'flex', gap: '8px', alignItems: 'center', margin: '4px 0' } }, h('b', { style: { width: '84px', fontSize: '14px' } }, `【${k}】`), e, h('button', { class: 'btn sm', onclick: () => { e.value = v[i] = ''; draw(); } }, '清空'))); });
    ctl.append(row(check('附上額度資料，並要求「寫成查表，不要用計算公式」', () => data, x => data = x, draw)));
    function draw() { out.innerHTML = '';
      const prompt = `請幫我做一個【${v[0] || '……'}】${v[1] ? `，給【${v[1]}】使用` : ''}。\n` + (v[2] ? `\n輸入：${v[2]}` : '') + (v[3] ? `\n輸出：${v[3]}` : '') + (data ? '\n\n額度資料（請寫成查表，不要用計算公式）：\n第 2 級 10,020　第 3 級 15,460　第 4 級 18,580　第 5 級 24,100\n第 6 級 28,070　第 7 級 32,090　第 8 級 36,180\n自負額比率：一般戶 16%、中低收 5%、低收 0%' : '') + (v[4] ? `\n\n技術限制：${v[4]}\n請在頁面底部加上免責聲明：本試算僅供參考，實際給付以照管專員評估結果為準` : '') + '\n\n開始前，請先說明你的實作計畫。';
      const R = [];
      if (!v[0]) R.push(['bad', '沒有「做什麼」：AI 只能自己猜要做什麼。']);
      if (!v[1]) R.push(['warn', '沒有「給誰用」：AI 不知道要不要做手機版——家屬多半用手機。']);
      if (!v[2] || !v[3]) R.push(['warn', '沒有寫清楚輸入／輸出：AI 會自己加一堆你不需要的功能。']);
      if (!v[4]) R.push(['bad', '★ 沒有「技術限制」：AI 很可能給你 React＋Node.js＋資料庫的完整專案——殺雞用牛刀。']);
      if (!data) R.push(['bad', '沒有給額度資料：金額會是 AI 生成的，不是你給的（回想 M7、M8 的「數字不生成」）。']);
      const single = v[4] && /單一\s*HTML|單一 HTML/.test(v[4]);
      const tree = single ? 'ltc-calculator/\n  └─ index.html      ← 結構＋樣式＋邏輯全在這裡' : 'ltc-calculator/\n  ├─ package.json\n  ├─ vite.config.js\n  ├─ index.html\n  ├─ src/\n  │   ├─ App.jsx\n  │   └─ components/ …\n  ├─ server/          ← 可能還有後端\n  ├─ prisma/          ← 可能還有資料庫\n  └─ node_modules/    ← 幾萬個檔案';
      out.append(h('div', { class: 'grid2', style: { alignItems: 'start' } }, h('div', null, ttl('產生的第一個指令'), pre(prompt, { dark: true }), copyBtn(() => prompt)), h('div', null, ttl('AI 可能產出的專案'), pre(tree), R.length ? h('div', null, R.map(([c, t]) => nt(t, c))) : nt('五件事都說清楚了，也把數字交給它查表——一次就做出剛好合用的東西。接下來：認真讀它的實作計畫，理解錯了就在這裡糾正，比做完再改省事十倍。')))); }
    $('#w-spec').append(ctl, out); draw();
  })();
})();
