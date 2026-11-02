/* 補充：n8n 入門與 AI Agent 互動頁 A：PART 01–06 */
(function () {
  'use strict';
  const { h, $, s, svgBox, seg, slider, check, Store } = U;
  U.initModule('n8n');
  const cap = (el, px) => { el.style.maxWidth = px + 'px'; el.style.width = '100%'; el.style.margin = '0 auto'; return el; };
  const row = (...a) => h('div', { class: 'row', style: { marginBottom: '6px' } }, ...a);
  const lbl = t => h('span', { style: { fontSize: '14px', color: 'var(--muted)' } }, t);
  const nt = (t, cls = '') => h('div', { class: 'note ' + cls, style: { fontSize: '14px' } }, t);
  const ttl = t => h('b', { style: { fontSize: '13.5px' } }, t);
  const kpi = (...a) => h('div', { class: 'kpi' }, ...a.map(([k, v, c]) => h('div', null, h('div', { class: 'k' }, k), h('div', { class: 'v ' + (c || '') }, v))));
  const tok = (t, o = {}) => h('span', { style: { display: 'inline-block', margin: '2px', padding: '3px 7px', borderRadius: '6px', fontSize: '14px', background: o.bg || '#eef3f2', fontWeight: o.b ? 700 : 400, color: o.c || 'inherit', fontFamily: o.mono ? 'var(--mono)' : 'inherit' } }, t);
  const tbl = (head, rows) => h('div', { class: 'tscroll' }, h('table', { class: 'dt' }, h('tr', null, head.map(c => h('th', null, c))), rows.map(r => h('tr', null, r.map((v, j) => v instanceof Node ? h('td', null, v) : h('td', { style: { fontWeight: j ? 400 : 600 } }, v))))));
  const pre = (t, o = {}) => h('pre', { style: { whiteSpace: 'pre-wrap', background: o.dark ? '#1f2a2b' : '#f6f5f1', color: o.dark ? '#d9e4e2' : 'inherit', border: '1px solid var(--line)', borderRadius: '8px', padding: '10px 12px', fontSize: '12.8px', lineHeight: '1.6', margin: '6px 0', fontFamily: 'var(--mono)' } }, t);
  const box = (title, body, o = {}) => h('div', { style: { border: '1px solid ' + (o.bd || 'var(--line)'), background: o.bg || '#fff', borderRadius: '10px', padding: '10px 12px', fontSize: '14px', ...(o.st || {}) } }, title ? h('div', { style: { fontWeight: 700, marginBottom: '4px', color: o.tc || 'inherit' } }, title) : '', body);
  const ul = items => h('ul', { style: { margin: '4px 0', paddingLeft: '18px' } }, items.map(x => h('li', null, x)));
  const copyBtn = getText => { const b = h('button', { class: 'btn sm' }, '複製'); b.onclick = () => { try { navigator.clipboard.writeText(getText()).then(() => { b.textContent = '✓ 已複製'; setTimeout(() => b.textContent = '複製', 1500); }, () => { b.textContent = '請手動選取複製'; }); } catch (e) { b.textContent = '請手動選取複製'; } }; return b; };
  /* 簡易 $json 路徑求值（只支援 .欄位 與 [索引]） */
  function evalPath(expr, json) { const e = expr.trim(); if (!e.startsWith('$json')) throw new Error('本練習只支援以 $json 開頭的表達式'); let cur = json; const re = /\.([A-Za-z_][\w]*)|\[(\d+)\]/g; let m, pos = 5; while ((m = re.exec(e))) { if (m.index !== pos) throw new Error('語法不正確：' + e.slice(pos)); pos = re.lastIndex; const k = m[1] !== undefined ? m[1] : +m[2]; if (cur == null || typeof cur !== 'object') return undefined; cur = cur[k]; } if (pos !== e.length) throw new Error('語法不正確：' + e.slice(pos)); return cur; }
  function render(tpl, json) { return tpl.replace(/\{\{([\s\S]*?)\}\}/g, (_, x) => { const v = evalPath(x, json); return v === undefined ? '' : typeof v === 'object' ? (Array.isArray(v) ? v.join(',') : '[object Object]') : String(v); }); }
  const N8 = window.N8 = { cap, row, lbl, nt, ttl, kpi, tok, tbl, pre, box, ul, copyBtn, evalPath, render };

  // ================= P01 =================
  U.sorter('#w-concept', [
    ['workflow 做好了，卻不知道它「什麼時候」會開始跑', 'Trigger', '每個可執行的 workflow 至少要有一個 Trigger（藥丸狀）。'],
    ['昨天凌晨的排程失敗了，想知道是哪個節點出錯', 'Execution', '每跑一次都留一筆紀錄，可回放、可看每個節點的輸出——除錯第一站。'],
    ['三個節點都要用同一組 Gemini 金鑰', 'Credential', '建立一次，多個節點共用；不會出現在匯出的 JSON 裡。'],
    ['訊息裡要放「今天的降雨機率」，不能寫死', 'Expression', '用兩層大括號動態帶入前面節點的資料。'],
    ['想把整個流程另存一份給同學參考', 'Workflow', '一群節點連接起來的整體，可另存、複製、匯出成 JSON。'],
    ['雙擊一個方塊，打開它的參數設定', 'Node', '一個節點＝一個動作或判斷；雙擊開啟 NDV。'],
  ], ['Node', 'Workflow', 'Trigger', 'Credential', 'Execution', 'Expression']);

  // ================= P02 =================
  (function () {
    const G = [['先確認四件事', ['Windows 11，或 Windows 10 64 位元 22H2（Win＋R → winver）', '工作管理員 → 效能 → CPU：「虛擬化」已啟用', '記憶體 8GB 以上、可用磁碟 6GB 以上', '有系統管理員帳號']], ['Step 1　安裝 WSL2', ['系統管理員 PowerShell：wsl --install', '★ 安裝後務必重開機', '驗證：wsl -l -v 看到 Ubuntu 且 VERSION 為 2']], ['Step 2　安裝 Docker Desktop', ['安裝時勾選「Use WSL 2 instead of Hyper-V」', '再重開機一次', '驗證：鯨魚圖示變綠「Engine running」；docker --version 印出版本號']], ['Step 3–4　啟動 n8n 並登入', ['docker volume create n8n_data', '執行下方產生器的啟動指令', '驗證：瀏覽器開 http://localhost:5678 看到帳號設定畫面', '建立擁有者帳號（只存在你自己的電腦）→ Create Workflow 看到空白畫布']]];
    const st = Store.get('n8n:install', {}); const out = h('div'), total = G.reduce((a, g) => a + g[1].length, 0);
    function draw() { out.innerHTML = ''; let n = 0; const g = h('div', { class: 'grid2' });
      G.forEach(([t, items], gi) => g.append(box(t, h('div', null, items.map((x, i) => { const k = gi + '-' + i, c = h('input', { type: 'checkbox' }); c.checked = !!st[k]; if (st[k]) n++; c.onchange = () => { st[k] = c.checked; Store.set('n8n:install', st); draw(); }; return h('label', { style: { display: 'block', fontSize: '14px', padding: '2px 0' } }, c, ' ' + x); })))));
      out.append(g, row(h('span', { class: 'tag ' + (n === total ? 'good' : 'gray') }, `完成 ${n} / ${total}`), lbl('不想打指令也可以：Docker Desktop 搜尋 n8nio/n8n → Pull → Run，在 Optional settings 填一樣的三個欄位。'))); }
    $('#w-install').append(out); draw();
  })();
  (function () {
    const P = { sh: 'ps', port: 5678, tz: true, vol: true }; const ctl = h('div'), out = h('div');
    function build() { ctl.innerHTML = ''; ctl.append(row(lbl('終端機：'), seg([['ps', 'PowerShell'], ['cmd', '命令提示字元 CMD']], () => P.sh, v => P.sh = v, draw), lbl('　本機埠號：'), seg([[5678, '5678'], [5679, '5679（5678 被佔用時）']], () => P.port, v => P.port = v, draw)), row(check('帶時區 GENERIC_TIMEZONE / TZ', () => P.tz, v => P.tz = v, draw), check('掛 volume（-v n8n_data:/home/node/.n8n）', () => P.vol, v => P.vol = v, draw))); }
    function draw() { out.innerHTML = ''; const c = P.sh === 'ps' ? '`' : '^', L = [`docker run -d --name n8n -p ${P.port}:5678`]; if (P.tz) L.push('  -e GENERIC_TIMEZONE="Asia/Taipei"', '  -e TZ="Asia/Taipei"'); if (P.vol) L.push('  -v n8n_data:/home/node/.n8n'); L.push('  docker.n8n.io/n8nio/n8n');
      const cmd = L.map((l, i) => i < L.length - 1 ? l + ' ' + c : l).join('\n'), W = [];
      if (!P.vol) W.push(['bad', '沒有掛 volume：容器一刪（例如更新版本時），workflow 和憑證全部不見。']);
      if (!P.tz) W.push(['warn', '沒有設時區：排程時間會差 8 小時——你設 08:00，它在台灣時間下午 4 點才跑。']);
      out.append(pre('docker volume create n8n_data', { dark: true }), pre(cmd, { dark: true }), row(copyBtn(() => 'docker volume create n8n_data\n' + cmd), lbl(`啟動後開 http://localhost:${P.port}　｜　行末續行符號：PowerShell 用反引號 \`，CMD 用 ^`)), ...W.map(([k, t]) => nt(t, k)), W.length ? '' : nt('三個參數都在：埠號對應、時區、資料保存。第一次執行會自動下載映像檔（約 1–3 分鐘）。'),
        lbl('註：M8 講義 PART 10 的 n8n 自架指令寫成 docker.n8n.io/n8n/n8n，正確的映像檔名稱是 docker.n8n.io/n8nio/n8n（以本頁為準）。')); }
    build(); $('#w-cmd').append(ctl, out); draw();
  })();

  // ================= P03 =================
  U.sorter('#w-fix', [
    ['wsl --install 顯示找不到命令', 'Windows Update', 'Windows 版本太舊：更新到 22H2 以上再重試。'],
    ['Docker 啟動後一直轉圈、報 WSL 錯誤', 'wsl --update 後重開機', 'WSL2 沒裝好或沒重開機。'],
    ['安裝時提示虛擬化未啟用', '進 BIOS 開虛擬化', '找 Intel VT-x 或 SVM Mode 並啟用。'],
    ['localhost:5678 打不開', '檢查容器／換埠號', 'Docker Desktop 看容器是否 Running；或把 -p 改成 5679:5678。'],
    ['重開機後 workflow 不見了', '補掛 volume', '確認指令有 -v n8n_data:/home/node/.n8n。'],
    ['排程時間差 8 小時', '設定時區', '確認有帶 GENERIC_TIMEZONE=Asia/Taipei。'],
  ], ['Windows Update', 'wsl --update 後重開機', '進 BIOS 開虛擬化', '檢查容器／換埠號', '補掛 volume', '設定時區'], '更新：docker pull → docker stop n8n → docker rm n8n → 重新執行啟動指令；課堂期間不必急著更新。');

  // ================= P04 =================
  U.sorter('#w-nodes', [
    ['每天早上 8 點開始跑', 'Schedule Trigger', '依排程（每天／每週／Cron）觸發。'],
    ['外部系統送一個網址請求進來就開始', 'Webhook', '串接第三方系統、接收表單。'],
    ['使用者在聊天視窗打字', 'Chat Trigger', 'AI Agent 對話型應用的入口。'],
    ['查一個沒有專屬節點的 API（例如天氣）', 'HTTP Request', '幾乎萬用。'],
    ['降雨機率大於 50% 走一條路，否則走另一條', 'If', '二選一；三條以上用 Switch。'],
    ['把上一步的資料整理成你要的欄位', 'Set（Edit Fields）', '新增／修改／整理欄位。'],
    ['200 筆資料要分批送，避免打爆外部 API', 'Loop Over Items', '把多筆資料分批處理。'],
  ], ['Schedule Trigger', 'Webhook', 'Chat Trigger', 'HTTP Request', 'If', 'Set（Edit Fields）', 'Loop Over Items'], '三大分類：Core（邏輯）、App（400＋服務整合）、AI（LangChain：Agent、Chat Model、Memory、Tool）。');

  // ================= P05 =================
  const WX = { latitude: 25.0, longitude: 121.5, timezone: 'Asia/Taipei', current: { time: '2027-03-10T08:00', temperature_2m: 24.3 }, daily: { time: ['2027-03-10'], precipitation_probability_max: [62] } };
  N8.WX = WX;
  (function () {
    const PRE = ['{{ $json.daily.precipitation_probability_max[0] }}', '{{ $json.daily.precipitation_probability_max }}', '{{ $json.daily }}', '{{ $json.current.temperature_2m }}', '目前 {{ $json.current.temperature_2m }} 度，降雨 {{ $json.daily.precipitation_probability_max[0] }}%', '{{ $json.current.temp }}'];
    let txt = PRE[0], exprMode = true; const ctl = h('div'), out = h('div');
    const inp = h('input', { type: 'text', value: txt, style: { width: '100%', fontFamily: 'var(--mono)', fontSize: '14px', padding: '6px 8px' } }); inp.oninput = () => { txt = inp.value; draw(); };
    ctl.append(row(...PRE.map(p => h('button', { class: 'btn sm', style: { fontFamily: 'var(--mono)', fontSize: '12px' }, onclick: () => { inp.value = txt = p; draw(); } }, p.length > 34 ? p.slice(0, 32) + '…' : p))), inp, row(check('欄位已切到 Expression 模式（fx）', () => exprMode, v => exprMode = v, draw)));
    function draw() { out.innerHTML = ''; let res, cls = '', note = '';
      if (!exprMode) { res = txt; cls = 'warn'; note = '沒切到 Expression 模式：n8n 把它當純文字，原封不動輸出大括號。'; }
      else { try { res = N8.render(txt, WX); if (/\{\{\s*\$json\.daily\.precipitation_probability_max\s*\}\}/.test(txt)) note = '取到的是整個陣列，不是今天那一格——拿去跟 50 比大小會出問題。看到 [ ] 就要加 [0]。', cls = 'warn'; else if (res.includes('[object Object]')) note = '取到的是整個物件不是單一數值：回 OUTPUT 的 JSON 檢視確認完整路徑。', cls = 'bad'; else if (/\{\{[^}]*\}\}/.test(txt) && res.trim() === '' ) note = '欄位路徑不存在（例如 temp 應為 temperature_2m），結果是空的。', cls = 'bad'; else if (/current\.temp\b/.test(txt)) note = '欄位名稱打錯（應為 temperature_2m），該段結果是空的。', cls = 'bad'; } catch (e) { res = '（錯誤）' + e.message; cls = 'bad'; } }
      out.append(h('div', { class: 'grid2', style: { alignItems: 'start' } }, h('div', null, ttl('上一個節點的 OUTPUT（JSON 檢視）'), pre(JSON.stringify(WX, null, 2))), h('div', null, ttl('算出來的值'), pre(res === '' ? '（空字串）' : res), note ? nt(note, cls) : nt('✓ 取到了。不用背語法：多數情況把左側 INPUT 的欄位拖進參數框，n8n 會自動生成表達式。'), lbl('其他常用：$("節點名稱").item.json.x 取指定節點；$now.format("yyyy-MM-dd")；$today.minus(7, "days")；三元運算 a > 30 ? "炎熱" : "舒適"（本練習場只支援 $json 路徑）。')))); }
    $('#w-expr').append(ctl, out); draw();
  })();
  (function () {
    let n = 10, loop = false; const ctl = h('div'), out = h('div');
    ctl.append(row(slider('上一個節點輸出幾筆 item', 1, 200, 1, () => n, v => n = v, draw), check('中間加 Loop Over Items（Batch Size = 1，每筆間隔 1 秒）', () => loop, v => loop = v, draw)));
    function draw() { out.innerHTML = ''; const limit = 30, burst = loop ? 1 : n;
      out.append(kpi(['HTTP Request 被呼叫', n + ' 次'], ['同一分鐘內送出', loop ? `≤ 60 次（每秒 1 筆）` : `${n} 次（幾乎同時）`], ['外部 API 速率上限（假設每分鐘 30 次）', limit]),
        nt(!loop && n > limit ? `同時送出 ${n} 次，超過上限——後面的請求會拿到 429，部分資料處理失敗。用 Loop Over Items 一筆一筆送，並開 Retry On Fail。` : n === 1 ? '就算只有一筆，它也是一個只有一個元素的陣列。' : `節點會對每一筆 item 各執行一次：${n} 筆就是 ${n} 次呼叫。`, !loop && n > limit ? 'bad' : '')); }
    $('#w-items').append(ctl, out); draw();
  })();

  // ================= P06 =================
  (function () {
    const P = { rain: 62, idx: true, type: 'Number', th: 50, expr: true, pub: false, ran: false }; const ctl = h('div'), out = h('div');
    function build() { ctl.innerHTML = ''; ctl.append(row(slider('今天的降雨機率（API 回傳）', 0, 100, 1, () => P.rain, v => P.rain = v, draw, v => v + '%'), slider('If 右值', 0, 100, 5, () => P.th, v => P.th = v, draw)), row(check('If 左值有加 [0]', () => P.idx, v => P.idx = v, draw), lbl('資料型別：'), seg([['Number', 'Number'], ['String', 'String']], () => P.type, v => P.type = v, draw), check('Set 的 Value 已切到 Expression', () => P.expr, v => P.expr = v, draw), check('已按 Publish', () => P.pub, v => P.pub = v, draw)), row(h('button', { class: 'btn primary', onclick: () => { P.ran = true; draw(); } }, '▶ Execute Workflow（手動測試）'), lbl('Schedule：每天 08:00'))); }
    function draw() { out.innerHTML = ''; const json = { ...N8.WX, daily: { ...N8.WX.daily, precipitation_probability_max: [P.rain] } };
      let branch = null, err = '';
      if (P.type === 'String') err = 'If 節點報型別錯誤：資料型別選成 String 卻拿來比大小 → 改成 Number。';
      else if (!P.idx) branch = false;
      else branch = P.rain > P.th;
      const tplT = '今天降雨機率 {{ $json.daily.precipitation_probability_max[0] }}%，記得帶傘', tplF = '今天降雨機率低，放心出門。目前氣溫 {{ $json.current.temperature_2m }} 度';
      const msg = branch == null ? '' : P.expr ? N8.render(branch ? tplT : tplF, json) : (branch ? tplT : tplF);
      const sv = svgBox(h('div'), 720, 150), N = [['Schedule', '每天 08:00', 10, 55], ['HTTP Request', 'Open-Meteo', 170, 55], ['If', `降雨 > ${P.th}%？`, 330, 55], ['帶傘提醒', 'Set', 520, 15], ['晴天提醒', 'Set', 520, 95]];
      const st = i => !P.ran ? 'idle' : i < 2 ? 'ok' : i === 2 ? (err ? 'bad' : 'ok') : err ? 'idle' : (i === 3 ? branch : !branch) ? 'ok' : 'idle';
      [[0, 1], [1, 2], [2, 3], [2, 4]].forEach(([a, b]) => s('line', { x1: N[a][2] + 130, y1: N[a][3] + 20, x2: N[b][2], y2: N[b][3] + 20, stroke: '#999', 'stroke-width': 1.6 }, sv));
      N.forEach(([t, d, x, y], i) => { const k = st(i), c = { ok: ['#e6f3ea', '#2f7d4f'], bad: ['#fbe9e7', '#c0392b'], idle: ['#fff', '#b9b4a8'] }[k]; s('rect', { x, y, width: 130, height: 40, rx: i === 0 ? 20 : 6, fill: c[0], stroke: c[1], 'stroke-width': 1.6 }, sv); s('text', { x: x + 65, y: y + 17, 'text-anchor': 'middle', 'font-size': 12.5, 'font-weight': 700, text: (k === 'ok' ? '✓ ' : k === 'bad' ? '✗ ' : '') + t }, sv); s('text', { x: x + 65, y: y + 32, 'text-anchor': 'middle', 'font-size': 11, style: 'fill:#6b675e', text: d }, sv); });
      s('text', { x: 470, y: 30, 'font-size': 11, style: 'fill:#2f7d4f', text: 'true' }, sv); s('text', { x: 470, y: 128, 'font-size': 11, style: 'fill:#c0392b', text: 'false' }, sv);
      out.append(cap(sv.parentNode, 720));
      if (!P.ran) { out.append(lbl('按「Execute Workflow」手動跑一次。')); }
      else if (err) out.append(nt(err, 'bad'));
      else { out.append(box(`${branch ? '帶傘提醒' : '晴天提醒'} 的 OUTPUT`, pre(JSON.stringify({ message: msg }, null, 2)), { bg: '#fbfaf6' }));
        if (!P.idx) out.append(nt(`左值忘了加 [0]：比較的是整個陣列不是數字，條件永遠不成立——降雨 ${P.rain}% 也走了 false。`, 'bad'));
        else if (!P.expr) out.append(nt('Set 的 Value 沒切到 Expression：訊息裡是原始的大括號文字。', 'bad'));
        else out.append(nt(`降雨 ${P.rain}% ${P.rain > P.th ? '>' : '≤'} ${P.th}% → 走 ${branch ? 'true' : 'false'}。想測另一條分支，把右值暫時改成 0 或 100，測完再改回來。`)); }
      out.append(nt(P.pub ? '已發布：每天 08:00 會自動執行（自架版需保持 Docker 容器運作；電腦關機就不會跑）。' : '尚未發布：Schedule Trigger 不會真的定時執行——要按 Publish（2.0 前叫 Active）。', P.pub ? '' : 'warn'),
        h('details', null, h('summary', { style: { cursor: 'pointer', fontSize: '14px' } }, '看 HTTP Request 節點的逐欄位設定'), pre('Method  GET\nURL     https://api.open-meteo.com/v1/forecast\nSend Query Parameters：開\n  latitude       25.03\n  longitude      121.56\n  daily          precipitation_probability_max\n  current        temperature_2m\n  timezone       Asia/Taipei\n  forecast_days  1')),
        lbl('延伸：Set 後面接 Gmail／Telegram／Slack 真的收到通知；HTTP Request 的 Settings 開 Retry On Fail；workflow 設定指定 Error Workflow。')); }
    build(); $('#w-weather').append(ctl, out); draw();
  })();
})();
