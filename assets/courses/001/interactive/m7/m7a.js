/* M7 互動頁 A：PART 01–08 */
(function () {
  'use strict';
  const { h, $, S, C, rng, randn, seg, slider, check, lc } = U;
  U.initModule('m7');
  const cap = (el, px) => { el.style.maxWidth = px + 'px'; el.style.width = '100%'; el.style.margin = '0 auto'; return el; };
  const row = (...a) => h('div', { class: 'row', style: { marginBottom: '6px' } }, ...a);
  const lbl = t => h('span', { style: { fontSize: '14px', color: 'var(--muted)' } }, t);
  const nt = (t, cls = '') => h('div', { class: 'note ' + cls, style: { fontSize: '14px' } }, t);
  const ttl = t => h('b', { style: { fontSize: '13.5px' } }, t);
  const kpi = (...a) => h('div', { class: 'kpi' }, ...a.map(([k, v, c]) => h('div', null, h('div', { class: 'k' }, k), h('div', { class: 'v ' + (c || '') }, v))));
  const tok = (t, o = {}) => h('span', { title: o.title || '', style: { display: 'inline-block', margin: '2px', padding: '3px 7px', borderRadius: '6px', fontSize: '14px', background: o.bg || '#eef3f2', border: '1px solid ' + (o.bd || 'transparent'), fontWeight: o.b ? 700 : 400 } }, t);
  const tbl = (head, rows, o = {}) => h('div', { class: 'tscroll' }, h('table', { class: 'dt' }, h('tr', null, head.map(c => h('th', null, c))), rows.map(r => h('tr', null, r.map((v, j) => v instanceof Node ? h('td', null, v) : h('td', { class: typeof v === 'number' ? 'num' : '', style: { fontWeight: j || o.plain ? 400 : 600 } }, v))))));
  const M7 = window.M7 = { cap, row, lbl, nt, ttl, kpi, tok, tbl };

  // ================= P01 =================
  (function () {
    const Y = [['2017', 'Transformer 論文', '〈Attention Is All You Need〉問世。RNN 逐字讀、長文前後文接不上、無法平行運算的問題被解決——之後所有發展都建立在這個機制上。'], ['2018', 'BERT／GPT-1', '兩條路線分道：BERT 走「理解」（Encoder），GPT 走「生成」（Decoder）。'], ['2020', 'GPT-3（175B）', '規模帶來質變：只給幾個範例就會做新任務（少樣本學習）。'], ['2022', 'ChatGPT', '對話介面把門檻降到零，大眾第一次感受到它。新問題：大眾開始把它當成「知識來源」，而它其實不是。'], ['2023', 'Llama／Mistral', '開源浪潮，本地部署變可行，Ollama 生態成形。'], ['2024', '多模態＋RAG 普及', '看得懂圖、查得到資料——企業導入的主要形態。'], ['2025', '推理模型', '會「想一下再答」；Agent 品質躍升。'], ['2026', 'Agent 與 MCP', '★ 從「會聊天」到「會做事」——M8 期末專題做的就是這一格。']];
    let yi = 0; const out = h('div');
    function draw() { out.innerHTML = ''; const bar = h('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' } }, Y.map(([y, t], i) => { const b = h('button', { class: 'btn' + (i === yi ? ' on' : ''), style: { flex: '1 0 90px', flexDirection: 'column', alignItems: 'flex-start', display: 'flex' } }, h('b', null, y), h('span', { style: { fontSize: '11.5px' } }, t)); b.onclick = () => { yi = i; draw(); }; return b; }));
      out.append(bar, nt(h('span', null, h('b', null, `${Y[yi][0]}　${Y[yi][1]}：`), Y[yi][2]), yi === 7 ? '' : ''), tbl(['轉折', '之前的困境', '解決了什麼', '留下什麼新問題'], [['2017 Transformer', 'RNN 逐字讀，長文本接不上；無法平行', '距離不再衰減；可大規模平行訓練', '計算量隨長度平方成長 → 上下文有上限'], ['2022 ChatGPT', '能力已具備，但一般人接觸不到', '對話介面把門檻降到零', '★ 被當成「知識來源」，而它其實不是'], ['2024–26 RAG 與 Agent', '知識過時、不知道你的資料、只會講不會做', 'RAG 補事實、工具調用補行動力', '可靠性與可稽核性成為主要瓶頸——本課程的重心']])); }
    $('#w-timeline').append(out); draw();
  })();

  // ================= P02 生成 vs 判別 =================
  (function () {
    const R = rng(202), P = [], gen = (m, L, n, y) => { for (let i = 0; i < n; i++) { const z = [randn(R), randn(R)]; P.push({ x: [m[0] + L[0][0] * z[0], m[1] + L[1][0] * z[0] + L[1][1] * z[1]], y }); } };
    gen([3.2, 3.4], [[1.0, 0], [.45, .7]], 60, 0); gen([5.8, 5.6], [[.9, 0], [-.3, .85]], 60, 1);
    const fit = y => { const Q = P.filter(p => p.y === y).map(p => p.x), m = [S.mean(Q.map(q => q[0])), S.mean(Q.map(q => q[1]))], c = [[0, 0], [0, 0]]; Q.forEach(q => { const d = [q[0] - m[0], q[1] - m[1]]; c[0][0] += d[0] * d[0]; c[0][1] += d[0] * d[1]; c[1][1] += d[1] * d[1]; }); c[0][0] /= Q.length - 1; c[0][1] /= Q.length - 1; c[1][1] /= Q.length - 1; c[1][0] = c[0][1]; const l11 = Math.sqrt(c[0][0]), l21 = c[1][0] / l11, l22 = Math.sqrt(c[1][1] - l21 * l21); return { m, c, L: [[l11, 0], [l21, l22]] }; };
    const G = [fit(0), fit(1)], b = ML.logistic(P.map(p => p.x), P.map(p => p.y), null, { lr: .3, iters: 600 });
    let mode = 'disc', samp = []; const ctl = h('div'), out = h('div'), sr = rng(9);
    function draw() { out.innerHTML = ''; const bx = h('div');
      U.scatter(bx, [...P.map(p => ({ x: p.x[0], y: p.x[1], c: p.y ? C.bad : C.blue, r: 3.2, op: .8 })), ...samp.map(s => ({ x: s.x[0], y: s.x[1], c: s.y ? '#7a1a10' : '#0f3f6b', r: 5.5, op: 1, stroke: '#fff' }))], { w: 420, h: 360, xmin: 0, xmax: 9, ymin: 0, ymax: 9, noGrid: true, xlabel: '特徵 1', ylabel: '特徵 2',
        under: [(sv, x, y) => { if (mode === 'disc') ML.regionMap(sv, x, y, (a, c) => ML.sigmoid(ML.predict(b, [a, c])), 0, 9, 0, 9, 50, 50); else G.forEach((g, k) => [1, 2].forEach(s => { const pts = []; for (let a = 0; a <= 60; a++) { const t = a / 60 * 2 * Math.PI, z = [s * Math.cos(t), s * Math.sin(t)]; pts.push(`${x(g.m[0] + g.L[0][0] * z[0])},${y(g.m[1] + g.L[1][0] * z[0] + g.L[1][1] * z[1])}`); } U.s('polyline', { points: pts.join(' '), fill: k ? '#f5c9c2' : '#cfe3f3', 'fill-opacity': s === 1 ? .5 : .25, stroke: k ? C.bad : C.blue, 'stroke-width': 1.2 }, sv); })); }] });
      out.append(h('div', { class: 'grid2', style: { alignItems: 'center' } }, cap(bx, 440), h('div', null, mode === 'disc' ? h('div', null, kpi(['學到的東西', 'P(y | x)'], ['輸出', '這一筆屬於哪一類']), nt('判別式只學「分界線」：給一筆資料，告訴你它在線的哪一邊。它完全不知道資料「長什麼樣」，所以無法產生新的病人。M2–M5 的分類器都是這一類。')) : h('div', null, kpi(['學到的東西', 'P(x)（每一類的分布）'], ['已抽樣產生', samp.length + ' 筆新資料']), h('button', { class: 'btn primary sm', onclick: () => { for (let i = 0; i < 10; i++) { const y = sr() < .5 ? 0 : 1, g = G[y], z = [randn(sr), randn(sr)]; samp.push({ x: [g.m[0] + g.L[0][0] * z[0], g.m[1] + g.L[1][0] * z[0] + g.L[1][1] * z[1]], y }); } draw(); } }, '從學到的分布抽樣 10 筆新資料'), ' ', h('button', { class: 'btn sm', onclick: () => { samp = []; draw(); } }, '清除'),
        nt('生成式學的是「資料長什麼樣」（橢圓＝學到的分布），學會之後可以從分布中抽樣出沒見過的新資料（深色大點）。產生新東西對它來說是正常運作——這就是 LLM 會「編」的根源。', samp.length ? 'warn' : ''))))); }
    ctl.append(row(seg([['disc', '判別式：學分界線'], ['gen', '生成式：學分布']], () => mode, v => mode = v, draw)));
    $('#w-gvd').append(ctl, out); draw();
  })();
  U.sorter('#w-scene', [['再入院風險：30 個特徵 → 高風險 0.82', '判別式', '分類問題，邏輯斯迴歸更準也更可解釋。'], ['依病人狀況產生個別化的出院衛教說明', '生成式', '答案是一段沒有標準答案的內容。'], ['讀完長篇病程紀錄，整理成 SOAP 格式', '生成式', '摘要與格式轉換。'], ['檢驗數值異常偵測', '判別式', '用 Isolation Forest 或統計法，穩定可稽核；數值判斷不該交給會「生成」數字的模型。'], ['理解家屬的自然語言問題並回答照護問題', '生成式', '衛教問答。'], ['把通報分成五種事件類型', '判別式', '從已知選項中選一個。']], ['判別式', '生成式'], '判準：答案是「從已知選項中選一個」→ 判別式；答案是「一段沒有標準答案的內容」→ 生成式。');

  // ================= P03 Diffusion =================
  (function () {
    const N = 18, IMG = Array.from({ length: N }, (_, i) => Array.from({ length: N }, (_, j) => ((i >= 6 && i <= 11 && j >= 2 && j <= 15) || (j >= 6 && j <= 11 && i >= 2 && i <= 15)) ? 1 : 0)), r = rng(303), NOISE = Array.from({ length: N }, () => Array.from({ length: N }, () => r()));
    let t = 10; const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; const a = t / 10, g = (k, tt) => { const bx = h('div'), sv = U.svgBox(bx, 180, 180), cs = 180 / N, aa = tt / 10; for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) { const v = IMG[i][j] * (1 - aa) + NOISE[i][j] * aa, c = Math.round(245 - v * 200); U.s('rect', { x: j * cs, y: i * cs, width: cs + .5, height: cs + .5, fill: `rgb(${c},${Math.round(c * .97 + 8)},${Math.round(c * .95 + 12)})` }, sv); } return h('div', { style: { textAlign: 'center' } }, cap(bx, 160), h('div', { style: { fontSize: '12px', color: 'var(--muted)' } }, k)); };
      out.append(h('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' } }, g('純雜訊（第 10 步）', 10), g('第 7 步', 7), g('第 4 步', 4), g(`目前：第 ${t} 步`, t), g('清晰（第 0 步）', 0)), nt(t > 6 ? '從純雜訊開始。訓練時模型學的是反過來的事：給一張被加了雜訊的圖，猜出「加了哪些雜訊」。' : t > 0 ? '每一步只去掉一點點雜訊，形狀慢慢浮現。生成新影像，就是從一張新的隨機雜訊開始，一步一步去噪。' : '去噪完成。DALL·E、Stable Diffusion 等影像生成主流就是這個原理；文字生成則幾乎全是 Transformer。')); }
    ctl.append(row(slider('去噪進度（剩幾步雜訊）', 0, 10, 1, () => t, v => t = v, draw)));
    $('#w-diff').append(ctl, out); draw();
  })();

  // ================= P04 Token =================
  (function () {
    const MERGE = ['病人', '高血壓', '病史', '長期', '服藥', '糖尿病', '護理師', '衛教', '注意', '飲食', '血糖'], EN = new Set(['the', 'patient', 'has', 'a', 'history', 'of', 'needs', 'long', 'term', 'medication', 'blood', 'pressure', 'high', 'and', 'is', 'to']);
    let text = '病人有高血壓病史，需長期服藥。', newer = false; const ctl = h('div'), out = h('div'), inp = h('input', { type: 'text', style: { width: '100%', maxWidth: '520px', padding: '6px 8px' } }); inp.value = text; inp.oninput = () => { text = inp.value; draw(); };
    const tokenize = s => { const out = []; let i = 0; const A = [...s]; while (i < A.length) { const ch = A[i]; if (/\s/.test(ch)) { i++; continue; } if (/[A-Za-z]/.test(ch)) { let j = i; while (j < A.length && /[A-Za-z]/.test(A[j])) j++; const w = A.slice(i, j).join(''), lw = w.toLowerCase(); if (EN.has(lw) || w.length <= 4) out.push(w); else if (lw === 'hypertension') out.push('hyper', 'tension'); else { for (let k = 0; k < w.length; k += 4) out.push(w.slice(k, k + 4)); } i = j; continue; }
      if (newer) { const m = MERGE.find(w => A.slice(i, i + [...w].length).join('') === w); if (m) { out.push(m); i += [...m].length; continue; } } out.push(ch); i++; } return out; };
    const hid = s => { let x = 7; for (const c of s) x = (x * 31 + c.codePointAt(0)) % 99991; return x; };
    function draw() { out.innerHTML = ''; const T = tokenize(text), chars = [...text.replace(/\s/g, '')].length;
      out.append(h('div', { style: { padding: '8px', background: '#fff', border: '1px solid var(--line)', borderRadius: '8px' } }, T.map((t, i) => h('span', { style: { display: 'inline-flex', flexDirection: 'column', alignItems: 'center', margin: '2px' } }, tok(t, { bg: ['#e6f2f0', '#f6ecd9', '#e3ebf6', '#efe6f6'][i % 4] }), h('span', { class: 'mono', style: { fontSize: '10px', color: 'var(--muted)' } }, hid(t))))), kpi(['字元數', String(chars)], ['token 數', String(T.length)], ['token ／ 字元', (T.length / Math.max(1, chars)).toFixed(2)]),
        nt(newer ? '新一代 tokenizer 會把常見詞（病人、高血壓）合併成一個 token，中文變得比較省。下方小字是 token 編號——模型看到的只有這些數字，所以它數不清字數。' : '舊 tokenizer 下中文常是一字一 token（甚至更多）。英文 1 token ≈ 0.75 個單字 ≈ 4 個字元；少見的長詞會被拆開：試試輸入 hypertension。', '')); }
    ctl.append(row(inp), row(check('新一代 tokenizer（常見詞合併）', () => newer, v => newer = v, draw), h('button', { class: 'btn sm', onclick: () => { inp.value = 'The patient has a history of hypertension and needs long-term medication.'; text = inp.value; draw(); } }, '換英文例句'), h('button', { class: 'btn sm', onclick: () => { inp.value = '病人有高血壓病史，需長期服藥。'; text = inp.value; draw(); } }, '中文例句')));
    $('#w-token').append(ctl, out); draw();
  })();
  (function () {
    const P = { sys: 450, k: 5, chunk: 300, turns: 3, q: 30, outT: 400, pin: .15, pout: .6, day: 500, rounds: 1 }; const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; const ret = P.k * P.chunk, hist = P.turns * 200, inT = (P.sys + ret + hist + P.q) * P.rounds, oT = P.outT * P.rounds, one = inT * P.pin / 1e6 + oT * P.pout / 1e6, mon = one * P.day * 30;
      const parts = [['System Prompt', P.sys * P.rounds, C.accent], [`召回段落（Top-${P.k}×${P.chunk}）`, ret * P.rounds, C.amber], ['對話歷史', hist * P.rounds, C.blue], ['提問', P.q * P.rounds, '#7c3aed'], ['輸出', oT, C.bad]], tot = S.sum(parts.map(p => p[1]));
      const bar = h('div', { style: { display: 'flex', height: '30px', borderRadius: '6px', overflow: 'hidden', margin: '6px 0' } }, parts.map(([n, v, c]) => h('div', { title: `${n} ${v}`, style: { width: v / tot * 100 + '%', background: c, color: '#fff', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', whiteSpace: 'nowrap' } }, v / tot > .08 ? n.split('（')[0] : '')));
      out.append(bar, h('div', { style: { fontSize: '12px', color: 'var(--muted)' } }, parts.map(([n, v, c]) => h('span', { style: { marginRight: '12px' } }, h('span', { style: { color: c } }, '■ '), `${n} ${v.toLocaleString()}`))),
        h('div', { class: 'note', style: { fontFamily: 'var(--mono)', fontSize: '13px' } }, h('div', null, `輸入 ${inT.toLocaleString()} tokens × ${P.pin}/1M ＋ 輸出 ${oT.toLocaleString()} × ${P.pout}/1M = US$${one.toFixed(6)}`), h('div', null, `每天 ${P.day} 次 × 30 天 = ${(P.day * 30).toLocaleString()} 次 → 月成本 ≈ US$${mon.toFixed(1)}（約新臺幣 ${Math.round(mon * 32).toLocaleString()} 元）`)),
        kpi(['單次成本', 'US$' + one.toFixed(6)], ['月成本', 'US$' + mon.toFixed(1), mon > 100 ? 'bad' : 'good'], ['召回段落佔輸入', Math.round(ret / (P.sys + ret + hist + P.q) * 100) + '%']),
        nt(P.rounds > 1 ? `Agent 一次任務跑 ${P.rounds} 輪，每一輪都重送上下文——成本直接乘上 ${P.rounds}。真正會爆掉的是 Agent（輪數不固定），要另外設成本上限。` : `召回段落佔輸入的 ${Math.round(ret / (P.sys + ret + hist + P.q) * 100)}%：Top-K 調大，成本線性上升。輸出比輸入貴 4 倍但量少，所以輸入才是成本主體。這個量級的成本其實很低。`, P.rounds > 1 ? 'warn' : '')); }
    ctl.append(row(slider('System Prompt', 100, 2000, 50, () => P.sys, v => P.sys = v, draw), slider('Top-K', 1, 20, 1, () => P.k, v => P.k = v, draw), slider('每段 tokens', 100, 800, 50, () => P.chunk, v => P.chunk = v, draw), slider('對話歷史（輪）', 0, 10, 1, () => P.turns, v => P.turns = v, draw)), row(slider('輸出 tokens', 100, 1500, 50, () => P.outT, v => P.outT = v, draw), slider('每天問答次數', 50, 5000, 50, () => P.day, v => P.day = v, draw), slider('Agent 每次任務輪數', 1, 10, 1, () => P.rounds, v => P.rounds = v, draw)));
    $('#w-cost').append(ctl, out); draw();
  })();

  // ================= P05 Attention =================
  (function () {
    const T = ['這', '病', '人', '血', '糖', '他'], A = [[1, .22, .18, .10, .08, .15], [.22, 1, .90, .30, .26, .85], [.18, .90, 1, .28, .24, .92], [.10, .30, .28, 1, .88, .35], [.08, .26, .24, .88, 1, .30], [.15, .85, .92, .35, .30, 1]];
    let q = 5; const out = h('div');
    function draw() { out.innerHTML = ''; const W = 620, H = 200, sv0 = h('div'), sv = U.svgBox(sv0, W, H), xs = T.map((_, i) => 60 + i * 100);
      T.forEach((t, j) => { if (j === q) return; const w = A[q][j], x1 = xs[q], x2 = xs[j], mx = (x1 + x2) / 2, hh = 30 + Math.abs(x1 - x2) * .35; U.s('path', { d: `M${x1},140 Q${mx},${140 - hh} ${x2},140`, fill: 'none', stroke: w > .6 ? C.bad : C.accent, 'stroke-width': 1 + w * 8, opacity: .25 + w * .7 }, sv); U.s('text', { x: mx, y: 140 - hh / 2 - 6, 'text-anchor': 'middle', text: w.toFixed(2), style: 'font-size:11px;font-weight:700' }, sv); });
      T.forEach((t, i) => { const g = U.s('g', { style: 'cursor:pointer' }, sv); U.s('rect', { x: xs[i] - 24, y: 146, width: 48, height: 40, rx: 8, fill: i === q ? C.ink : '#fff', stroke: C.ink }, g); U.s('text', { x: xs[i], y: 173, 'text-anchor': 'middle', text: t, style: `font-size:20px;font-weight:700;fill:${i === q ? '#fff' : '#1c2430'}` }, g); g.addEventListener('click', () => { q = i; draw(); }); });
      const t = h('table', { class: 'dt' }, h('tr', null, h('th', null, ''), T.map(x => h('th', { style: { textAlign: 'center' } }, x))), A.map((r, i) => h('tr', { style: { outline: i === q ? '2px solid ' + C.bad : '' } }, h('td', { style: { fontWeight: 700 } }, T[i]), r.map(v => h('td', { style: { textAlign: 'center', fontFamily: 'var(--mono)', background: `rgba(13,107,103,${v * .8})`, color: v > .5 ? '#fff' : 'var(--ink)' } }, v.toFixed(2))))));
      out.append(cap(sv0, 640), h('div', { class: 'grid2', style: { alignItems: 'center' } }, h('div', { class: 'tscroll' }, t), nt(q === 5 ? '「他」對「病」「人」的權重最高（0.85、0.92）——模型讀到「他」時，直接把注意力放回「病人」，不管中間隔了多遠。' : `點「${T[q]}」：它最關注的是「${T[A[q].map((v, j) => [v, j]).filter(o => o[1] !== q).sort((a, b) => b[0] - a[0])[0][1]]}」。每一個字都對每一個字算一次關聯——多頭注意力會同時算好幾組（語法、語意…）。`)), h('p', { class: 'ai' }, '★ 但否定詞仍是弱點：「無胸痛」被誤讀成「胸痛」是實務常見錯誤——醫療 NLP 的否定偵測通常要另外處理（M6）。')); }
    $('#w-attn').append(out); draw();
  })();
  (function () {
    const L = [1000, 4000, 8000, 32000, 128000, 200000, 1000000]; let li = 3; const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; const n = L[li], b = h('div');
      lc(b, [{ pts: L.map((v, i) => [i, Math.log10(v)]), color: C.accent, w: 2, dots: true }, { pts: L.map((v, i) => [i, Math.log10(v * v)]), color: C.bad, w: 2.4, dots: true }], { w: 460, h: 230, xmin: 0, xmax: L.length - 1, ymin: 2, ymax: 12.5, xt: L.map((_, i) => i), xfmt: i => L[i] >= 1e6 ? '1M' : (L[i] / 1000) + 'k', yfmt: t => '10^' + Math.round(t), xl: '上下文長度（tokens）', legend: [['長度 n', C.accent], ['兩兩配對 n²', C.bad]], legW: 100, marks: [{ x: li, color: C.amber }] });
      out.append(h('div', { class: 'grid2', style: { alignItems: 'center' } }, cap(b, 480), h('div', null, kpi(['長度', n.toLocaleString() + ' tokens'], ['要算的配對數', n * n >= 1e9 ? (n * n / 1e9).toFixed(1) + ' 十億' : (n * n / 1e6).toFixed(1) + ' 百萬'], ['相對於 1k 的計算量', '×' + ((n / 1000) ** 2).toLocaleString(), 'bad']), nt('長度變 2 倍，注意力要算的配對數變 4 倍。這就是上下文長度有上限、長文特別貴的原因。主流模型標稱 12.8 萬～100 萬 tokens，但有效利用長度常低於標稱（P15「中間迷失」）。')))); }
    ctl.append(row(slider('上下文長度', 0, L.length - 1, 1, () => li, v => li = v, draw, v => L[v].toLocaleString())));
    $('#w-quad').append(ctl, out); draw();
  })();

  // ================= P06 三種架構 =================
  (function () {
    const T = ['病', '人', '血', '糖', '偏', '高']; let a = 'dec'; const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; const n = T.length, cs = 34;
      const grid = (rows, cols, f, rl, cl, title) => h('div', { style: { textAlign: 'center' } }, h('div', { style: { fontSize: '12.5px', fontWeight: 700, marginBottom: '4px' } }, title), h('table', { style: { borderCollapse: 'collapse', margin: '0 auto' } }, h('tr', null, h('td', null, ''), cl.map(c => h('td', { style: { fontSize: '11px', textAlign: 'center', width: cs + 'px' } }, c))), rl.map((r, i) => h('tr', null, h('td', { style: { fontSize: '11px', paddingRight: '4px' } }, r), cl.map((_, j) => h('td', { style: { width: cs + 'px', height: cs * .8 + 'px', background: f(i, j) ? C.accent : '#ece9e2', border: '2px solid #fff' } }))))));
      const views = { enc: [grid(n, n, () => true, T, T, 'Encoder：每個字都看得到全部（雙向）')], dec: [grid(n, n, (i, j) => j <= i, T, T, 'Decoder：只能看自己和左邊（單向）')], ed: [grid(n, n, () => true, T, T, '① Encoder 讀原文：雙向'), grid(4, n, () => true, ['摘', '要', '：', '高'], T, '② Decoder 看原文（cross）'), grid(4, 4, (i, j) => j <= i, ['摘', '要', '：', '高'], ['摘', '要', '：', '高'], '③ Decoder 自己：單向')] };
      const msg = { enc: 'Encoder-only（BERT 系）：雙向，用克漏字訓練（遮住一個詞讓它猜）。擅長「理解」：分類、NER、檢索。★ RAG 的嵌入模型就是這一類（bge、text-embedding）。', dec: 'Decoder-only（GPT 系、所有主流對話 LLM）：只能看左邊，訓練目標是「預測下一個 token」。擅長「生成」。★ 你在 Dify 呼叫的就是這一類。', ed: 'Encoder-Decoder（T5、BART）：先讀完原文，再一個字一個字生成。擅長「轉換」：翻譯、摘要。AI Studio 的 T5 範例屬於這類。' }[a];
      out.append(h('div', { style: { display: 'flex', gap: '18px', flexWrap: 'wrap', justifyContent: 'center' } }, ...views[a]), h('div', { style: { fontSize: '12px', color: 'var(--muted)', textAlign: 'center', margin: '4px 0' } }, '列＝正在處理的字，欄＝它可以看的字；綠＝看得到'), nt(msg)); }
    ctl.append(row(seg([['enc', 'Encoder-only（BERT）'], ['dec', 'Decoder-only（GPT）'], ['ed', 'Encoder-Decoder（T5）']], () => a, v => a = v, draw)));
    $('#w-mask').append(ctl, out); draw();
  })();
  U.sorter('#w-arch3', [['把知識庫段落與使用者問題轉成向量', 'Encoder-only', '嵌入模型。'], ['依召回的段落產生回答', 'Decoder-only', '生成。'], ['把英文衛教單翻成中文', 'Encoder-Decoder', '序列轉換。'], ['Agent 規劃下一步要呼叫哪個工具', 'Decoder-only', 'Agent 的大腦。'], ['判斷一則留言的情緒類別', 'Encoder-only', '理解型任務（也可用 Decoder 做）。']], ['Encoder-only', 'Decoder-only', 'Encoder-Decoder']);

  // ================= P07 Embedding =================
  (function () {
    const W = [['糖尿病', 1.2, 4.2, 'd'], ['高血壓', 1.8, 3.4, 'd'], ['心臟病', 1.0, 3.0, 'd'], ['胰島素', 4.2, 4.4, 'm'], ['降血壓藥', 4.6, 3.6, 'm'], ['止痛藥', 5.0, 2.8, 'm'], ['護理師', 2.0, .9, 'p'], ['醫師', 2.8, .6, 'p'], ['藥師', 3.6, .9, 'p']];
    const D = [['A', '糖尿病照護指引', 2.0, 4.6], ['B', '血糖監測方法', 2.6, 4.1], ['C', '高血壓用藥', 3.9, 3.0], ['D', '長照給付標準', 6.4, .8]];
    const Q = [['血糖控制', 2.3, 4.5], ['降壓藥怎麼吃', 3.6, 3.2], ['長照怎麼申請', 6.0, 1.1], ['誰可以開藥', 3.0, 1.2]];
    let qi = 0, K = 2, th = .4; const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; const [qn, qx, qy] = Q[qi], R = D.map(([id, n, x, y]) => { const d = Math.hypot(x - qx, y - qy); return { id, n, x, y, d, s: 1 / (1 + d) }; }).sort((a, b) => a.d - b.d), got = R.filter((r, i) => i < K && r.s >= th);
      const bx = h('div'); U.scatter(bx, [], { w: 460, h: 330, xmin: 0, xmax: 7.2, ymin: 0, ymax: 5.2, noGrid: true, xlabel: '語意維度 1（示意）', ylabel: '語意維度 2（示意）', over: [(sv, x, y) => {
        [['疾病名稱', .5, 4.9, C.blue], ['藥物', 4.2, 4.9, '#7c3aed'], ['醫療人員', 1.8, 1.5, C.good]].forEach(([t, a, b, c]) => U.s('text', { x: x(a), y: y(b), text: t, style: `font-size:11px;fill:${c};font-weight:700` }, sv));
        W.forEach(([t, a, b, g]) => { U.s('circle', { cx: x(a), cy: y(b), r: 4, fill: g === 'd' ? C.blue : g === 'm' ? '#7c3aed' : C.good, 'fill-opacity': .7 }, sv); U.s('text', { x: x(a) + 6, y: y(b) + 4, text: t, style: 'font-size:11px;fill:#5d6774' }, sv); });
        R.forEach(r => { const ok = got.includes(r); U.s('line', { x1: x(qx), y1: y(qy), x2: x(r.x), y2: y(r.y), stroke: ok ? C.good : '#c4c0b6', 'stroke-dasharray': ok ? null : '4 3', 'stroke-width': ok ? 2 : 1 }, sv); U.s('rect', { x: x(r.x) - 9, y: y(r.y) - 9, width: 18, height: 18, rx: 4, fill: ok ? C.good : '#fff', stroke: C.ink }, sv); U.s('text', { x: x(r.x), y: y(r.y) + 4, 'text-anchor': 'middle', text: r.id, style: `font-size:11px;font-weight:700;fill:${ok ? '#fff' : '#1c2430'}` }, sv); });
        U.s('path', { d: `M${x(qx)},${y(qy) - 10} l9,16 h-18 z`, fill: C.amber, stroke: C.ink }, sv); U.s('text', { x: x(qx), y: y(qy) - 14, 'text-anchor': 'middle', text: '★ ' + qn, style: 'font-size:12px;font-weight:700;fill:#b45309' }, sv); }] });
      out.append(h('div', { class: 'grid2', style: { alignItems: 'center' } }, cap(bx, 480), h('div', null, tbl(['段落', '距離', '相似度分數', '召回？'], R.map((r, i) => [`${r.id} ${r.n}`, r.d.toFixed(2), r.s.toFixed(2), got.includes(r) ? h('span', { class: 'tag good' }, '✔ 召回') : h('span', { class: 'tag gray' }, i >= K ? '超出 Top-K' : '低於閾值')])),
        nt(!got.length ? '沒有任何段落通過閾值——知識庫裡沒有跟這個問題夠像的內容。這時正確的行為是回答「查無相關資料」，而不是讓 LLM 自己編（M8）。' : qi === 0 ? '查詢「血糖控制」召回了 A「糖尿病照護指引」——即使 A 裡沒有「血糖控制」四個字。這就是「語意」而不是「關鍵字」。' : '把 Top-K 調大或閾值調低，召回會變多，但不相干的段落也會混進來（而且每段都要付 token）。', !got.length ? 'warn' : '')))); }
    ctl.append(row(lbl('查詢'), seg(Q.map((q, i) => [i, q[0]]), () => qi, v => qi = v, draw), slider('Top-K', 1, 4, 1, () => K, v => K = v, draw), slider('Score 閾值', 0, .8, .05, () => th, v => th = v, draw, v => (+v).toFixed(2))));
    $('#w-emb').append(ctl, out, h('div', { class: 'concept' }, h('div', null, h('b', null, '① 中文嵌入模型要選對'), '看模型卡是否支援中文（如 bge-m3、multilingual-e5）'), h('div', null, h('b', null, '② 換嵌入模型＝全部重新索引'), '不同模型的向量在不同空間，彼此不可比較'), h('div', null, h('b', null, '③ 語意相似 ≠ 答案正確'), '問「第 4 級給付多少」可能召回「第 4 級的評估標準」——M8「召回對了但答案不對」的根源'))); draw();
  })();
  (function () {
    const Q = [.8, .6, .1, 0], A = [.7, .7, .1, .1], B = [.1, 0, .9, .4]; const ctl = h('div'), out = h('div');
    const cs = (a, b) => { const d = a.reduce((s, v, i) => s + v * b[i], 0), na = Math.sqrt(a.reduce((s, v) => s + v * v, 0)), nb = Math.sqrt(b.reduce((s, v) => s + v * v, 0)); return { d, na, nb, c: na && nb ? d / (na * nb) : 0 }; };
    function draw() { out.innerHTML = ''; const a = cs(Q, A), b = cs(Q, B), f = v => +v.toFixed(2);
      out.append(tbl(['向量', '內容（示意 4 維）', '值'], [['查詢 Q', '「病人的血糖偏高」', `[${Q.map(f).join(', ')}]`], ['段落 A', '「糖尿病的血糖監測方式」', `[${A.map(f).join(', ')}]`], ['段落 B', '「長照給付額度標準」', `[${B.map(f).join(', ')}]`]]),
        h('div', { class: 'note', style: { fontFamily: 'var(--mono)', fontSize: '13px' } }, h('div', null, `Q·A = ${Q.map((v, i) => `${f(v)}×${f(A[i])}`).join(' + ')} = ${a.d.toFixed(3)}`), h('div', null, `|Q| = ${a.na.toFixed(3)}，|A| = ${a.nb.toFixed(3)} → cos(Q,A) = ${a.d.toFixed(3)} / (${a.na.toFixed(3)} × ${a.nb.toFixed(3)}) = `, h('b', null, a.c.toFixed(3))), h('div', null, `cos(Q,B) = ${b.d.toFixed(3)} / (${b.na.toFixed(3)} × ${b.nb.toFixed(3)}) = `, h('b', null, b.c.toFixed(3)))),
        kpi(['cos(Q, A)', a.c.toFixed(3), a.c > .5 ? 'good' : 'bad'], ['cos(Q, B)', b.c.toFixed(3), b.c > .5 ? 'good' : 'bad'], ['Dify Score 閾值 0.5', `${a.c > .5 ? 'A 召回' : 'A 過濾'}；${b.c > .5 ? 'B 召回' : 'B 過濾'}`])); }
    build();
    function build() { ctl.append(row(lbl('段落 A：'), ...[0, 1, 2, 3].map(i => slider(`第 ${i + 1} 維`, 0, 1, .1, () => A[i], v => A[i] = v, draw, v => (+v).toFixed(1))), h('button', { class: 'btn sm', onclick: () => { A.splice(0, 4, .7, .7, .1, .1); ctl.innerHTML = ''; build(); draw(); } }, '↺ 講義數值'))); }
    $('#w-cos').append(ctl, out); draw();
  })();

  // ================= P08 =================
  (function () {
    const b = h('div'), sv = U.svgBox(b, 660, 170), x = U.scale(-3, 7.5, 150, 640);
    [-3, -1, 1, 3, 5, 7].forEach(t => { U.s('line', { x1: x(t), x2: x(t), y1: 10, y2: 140, class: 'grid' }, sv); U.s('text', { x: x(t), y: 158, 'text-anchor': 'middle', text: 'US$' + (t < 0 ? (10 ** t).toString() : (10 ** t).toLocaleString()), style: 'font-size:10.5px' }, sv); });
    [['③ 推論（一次）', -3, -2.5, C.accent, '你天天在做'], ['② 微調', 2, 4.5, C.amber, '你可能會做'], ['① 預訓練', 7, 7.3, C.bad, '只有大公司']].forEach(([n, a, c, col, who], i) => { const y = 22 + i * 40; U.s('text', { x: 144, y: y + 12, 'text-anchor': 'end', text: n, style: 'font-weight:700;font-size:12.5px' }, sv); U.s('rect', { x: x(-3), y, width: Math.max(8, x(c) - x(-3)), height: 20, rx: 4, fill: col, opacity: .85 }, sv); U.s('text', { x: x(c) + 6, y: y + 14, text: who, style: 'font-size:11px' }, sv); });
    $('#w-stage').append(cap(b, 680), h('div', { class: 'concept' }, h('div', null, h('b', null, '① 預訓練'), '兆級 token、上萬張 GPU、數千萬美元。你不會做'), h('div', null, h('b', null, '② 微調'), '領域資料數千～數萬筆，數百到數萬美元。有專屬資料與明確需求時才做（SFT、RLHF、領域適配…）'), h('div', null, h('b', null, '③ 推論'), '呼叫模型拿答案，權重完全不變，按 token 計費。★ M8 的 Dify 只做這一階段')));
  })();
  U.sorter('#w-route', [['回答要固定分三點、每點 50 字以內', '提示詞', '行為與格式的調整，改一行字就好。'], ['要回答最新版的長照給付標準', 'RAG', '★ 知識會變動：換文件、重新索引即可，還能標註來源。'], ['臨床指引每年改版，回答要跟著更新', 'RAG', '微調把知識鎖進權重，要更新只能重訓。'], ['讓模型「天生」用院內病歷書寫格式，且範例量大到提示詞塞不下', '微調', '風格與格式要深度內化時才考慮。'], ['對長者要用淺白、親切的語氣', '提示詞', '角色與對象寫進提示詞。'], ['回答時要附上「出自院內衛教手冊第幾頁」', 'RAG', '可以回傳召回的段落；微調說不出答案從哪來。']], ['提示詞', 'RAG', '微調'], '決策順序：先試提示詞 → 不夠加 RAG → 還不夠才考慮微調。醫療場域幾乎總是先選 RAG——「說得出答案從哪來」是硬需求。');
})();
