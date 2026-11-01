/* M6 互動頁 A：文字處理小工具、PART 01–10 */
(function () {
  'use strict';
  const { h, $, S, C, rng, randn, seg, slider, check, lc } = U;
  U.initModule('m6');
  const cap = (el, px) => { el.style.maxWidth = px + 'px'; el.style.width = '100%'; el.style.margin = '0 auto'; return el; };
  const row = (...a) => h('div', { class: 'row', style: { marginBottom: '6px' } }, ...a);
  const lbl = t => h('span', { style: { fontSize: '14px', color: 'var(--muted)' } }, t);
  const nt = (t, cls = '') => h('div', { class: 'note ' + cls, style: { fontSize: '14px' } }, t);
  const ttl = t => h('b', { style: { fontSize: '13.5px' } }, t);
  const kpi = (...a) => h('div', { class: 'kpi' }, ...a.map(([k, v, c]) => h('div', null, h('div', { class: 'k' }, k), h('div', { class: 'v ' + (c || '') }, v))));
  const tok = (t, o = {}) => h('span', { style: { display: 'inline-block', margin: '2px', padding: '3px 8px', borderRadius: '6px', fontSize: '14px', background: o.bg || '#eef3f2', color: o.c || 'var(--ink)', border: '1px solid ' + (o.bd || 'transparent'), textDecoration: o.del ? 'line-through' : 'none', fontWeight: o.b ? 700 : 400 } }, t);
  const tbl = (head, rows, o = {}) => h('div', { class: 'tscroll' }, h('table', { class: 'dt' }, h('tr', null, head.map(c => h('th', null, c))), rows.map(r => h('tr', null, r.map((v, j) => v instanceof Node ? h('td', null, v) : h('td', { class: typeof v === 'number' ? 'num' : '', style: { fontWeight: j || o.plain ? 400 : 600 } }, v))))));

  /* ---------- 文字工具 ---------- */
  const BASE = '病人 主訴 合併 心房 顫動 否認 胸痛 研究 研究生 生命 起源 的 服藥 後 不適 慢性 阻塞 肺病 需要 灌食 有 壓力 損傷 傷口 滲液 增加 糖化 血色素 偏高 注意 血糖 胃管 脫垂 發燒 咳嗽 頭痛 頭暈 疼痛 護理 衛教 出院 用藥 家屬 換藥 止痛藥 給予 予以 乾淨 覆蓋 詢問 照顧 方式 完成 了解 已 無 主訴 傷口 疼痛 病房 等待 時間 醫師 護理師 說明 服務 住院 天 三天 就診 指導 評估 協助 休息 觀察 持續 減少 改善 下床 跌倒 預防 每日 兩次 監測 發現 可能'.split(' ');
  const MED = ['二尖瓣脫垂', '心房顫動', '慢性阻塞性肺病', '鼻胃管', '壓力性損傷', '糖化血色素', '低血糖'];
  const PUNC = new Set('，。、；：！？「」（）,.;:!?() '.split(''));
  function segment(text, dict, dir = 'fwd', maxL = 7) { const D = new Set(dict), s = [...text], out = [];
    if (dir === 'fwd') { let i = 0; while (i < s.length) { if (PUNC.has(s[i])) { if (s[i].trim()) out.push(s[i]); i++; continue; } let L = Math.min(maxL, s.length - i), w = s[i]; for (; L > 1; L--) { const c = s.slice(i, i + L).join(''); if (D.has(c)) { w = c; break; } } if (/[A-Za-z0-9]/.test(s[i])) { let j = i; while (j < s.length && /[A-Za-z0-9./%-]/.test(s[j])) j++; w = s.slice(i, j).join(''); } out.push(w); i += [...w].length; } return out; }
    let j = s.length; while (j > 0) { if (PUNC.has(s[j - 1])) { if (s[j - 1].trim()) out.unshift(s[j - 1]); j--; continue; } let L = Math.min(maxL, j), w = s[j - 1]; for (; L > 1; L--) { const c = s.slice(j - L, j).join(''); if (D.has(c)) { w = c; break; } } out.unshift(w); j -= [...w].length; } return out; }
  function tfidf(docs, o = {}) { const N = docs.length, V = []; docs.forEach(d => d.forEach(t => { if (!V.includes(t)) V.push(t); })); const df = V.map(t => docs.filter(d => d.includes(t)).length), idf = df.map(x => Math.log((1 + N) / (1 + x)) + 1);
    const M = docs.map(d => { const v = V.map((t, j) => d.filter(x => x === t).length * idf[j]); const n = Math.sqrt(S.sum(v.map(x => x * x))) || 1; return v.map(x => x / n); }); return { V, df, idf, M }; }
  const cos = (a, b) => { let s = 0, x = 0, y = 0; for (let i = 0; i < a.length; i++) { s += a[i] * b[i]; x += a[i] * a[i]; y += b[i] * b[i]; } return x && y ? s / Math.sqrt(x * y) : 0; };
  const M6 = window.M6 = { cap, row, lbl, nt, ttl, kpi, tok, tbl, BASE, MED, PUNC, segment, tfidf, cos };

  // ================= P01 規則式 =================
  (function () {
    const R = [['病人下床如廁時滑倒，右膝擦傷', 1], ['夜班巡房發現病人倒臥浴室地板', 1], ['病人自述腳軟，坐在地上等待協助', 1], ['地板濕滑已立警示牌，未有人跌倒', 0], ['衛教家屬預防跌倒注意事項', 0], ['病人從輪椅摔下，頭部無外傷', 1], ['病人自述差點跌倒，扶住床欄未倒地', 0], ['病人主訴頭暈，協助臥床休息', 0]];
    const K = { 跌倒: true, 滑倒: true, 摔: false, 倒臥: false, 坐在地上: false }; let negRule = false; const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; const on = Object.keys(K).filter(k => K[k]); let tp = 0, fp = 0, fn = 0;
      const rows = R.map(([t, y]) => { const hits = on.filter(k => t.includes(k)), negd = negRule && /(未有人|預防|差點|未倒地)/.test(t); const p = hits.length && !negd ? 1 : 0; if (p && y) tp++; else if (p && !y) fp++; else if (!p && y) fn++;
        let html = t; hits.forEach(k => html = html.split(k).join(`⟦${k}⟧`)); const parts = html.split(/⟦|⟧/).map((s, i) => i % 2 ? h('mark', { style: { background: '#f6dcd7', padding: '0 2px' } }, s) : s);
        return [h('span', null, ...parts), y ? '是' : '否', h('span', { class: 'tag ' + (p === y ? 'good' : 'bad') }, p ? (y ? '✓ 抓到' : '✗ 誤報') : (y ? '✗ 漏掉' : '✓ 正確排除'))]; });
      out.append(tbl(['虛構通報內容', '真的是跌倒事件？', '規則判斷'], rows, { plain: true }), kpi(['抓到', `${tp} / 4`], ['漏掉', String(fn), fn ? 'bad' : 'good'], ['誤報', String(fp), fp ? 'bad' : 'good']),
        nt(fn ? `換句話說就抓不到：「倒臥」「坐在地上」「摔下」都是跌倒，但不在關鍵字表裡。把它們加進去看看。` : fp ? `關鍵字表擴充後都抓到了，但「未有人跌倒」「預防跌倒」「差點跌倒」也被當成跌倒——規則看不懂否定與語境。${negRule ? '' : '試試勾選「排除否定／衛教語境」規則。'}` : '規則全部正確——但這只是 8 筆。真實資料裡會一直出現新的說法與例外，規則會越寫越多（規則爆炸）。這就是為什麼實務上規則式當安全網、模型抓委婉表達、人工覆核當最後一層。', fn || fp ? 'warn' : '')); }
    ctl.append(row(lbl('關鍵字表：'), ...Object.keys(K).map(k => check(k, () => K[k], v => K[k] = v, draw)), check('加一條規則：排除否定／衛教語境', () => negRule, v => negRule = v, draw)));
    $('#w-rule').append(ctl, out); draw();
  })();

  // ================= P02 前處理 =================
  (function () {
    const ST = [['原始文本', '從系統匯出的原始字串，含 HTML 標籤與全形符號', null], ['① 清理', '去 HTML、去標點、全形轉半形', ['病人 78 歲 主訴 胸痛 三天 於 2027/3/5 就診 否認發燒']], ['② 斷詞', '★ 中文沒有空格，這一步決定後面所有結果', ['病人', '78', '歲', '主訴', '胸痛', '三天', '於', '2027/3/5', '就診', '否認', '發燒']], ['③ 去停用詞', '移除無實質意義的詞', null], ['④ 正規化', '數字與日期抽成結構化欄位，不留在詞袋裡', null], ['⑤ 向量化', '詞袋：只記次數，不記順序', null]];
    let step = 0, negInStop = true; const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; const stop = new Set(['於', '的', '了', ...(negInStop ? ['否認', '無', '未', '不'] : [])]);
      const s2 = ST[2][2], s3 = s2.filter(t => !stop.has(t)), s4 = s3.filter(t => !/^\d|\//.test(t)).map(t => t === '三天' ? '天' : t), fields = ['年齡：78', '日期：2027-03-05'];
      const view = [h('div', { class: 'mono', style: { fontSize: '14px', background: '#fff', padding: '8px', border: '1px solid var(--line)', borderRadius: '8px' } }, '病人 78 歲，主訴「胸痛」三天，於 2027/3/5 就診。 <br> 否認發燒。'), h('div', { class: 'mono', style: { fontSize: '14px' } }, ST[1][2][0]), h('div', null, s2.map(t => tok(t))), h('div', null, s2.map(t => stop.has(t) ? tok(t, { del: true, bg: '#f3f1ec', c: 'var(--muted)' }) : tok(t, { bg: t === '否認' ? '#fbe3df' : undefined, b: t === '否認' }))), h('div', null, s4.map(t => tok(t, { bg: t === '否認' ? '#fbe3df' : undefined })), ' ＋ ', fields.map(f => tok(f, { bg: '#dde7f5' }))), h('div', { class: 'mono', style: { fontSize: '14px' } }, '{ ' + [...new Set(s4)].map(t => `${t}: 1`).join(', ') + ' }')];
      const list = h('div', null, ST.slice(0, step + 1).map(([n, d], i) => h('div', { style: { display: 'flex', gap: '12px', padding: '8px 0', borderBottom: '1px solid var(--line)', alignItems: 'flex-start' } }, h('div', { style: { width: '96px', flex: 'none' } }, h('b', null, n), h('div', { style: { fontSize: '12px', color: 'var(--muted)' } }, d)), h('div', { style: { flex: 1 } }, view[i]))));
      const negLost = step >= 3 && negInStop;
      out.append(row(h('button', { class: 'btn sm', disabled: step === 0, onclick: () => { step--; draw(); } }, '← 上一步'), h('button', { class: 'btn primary sm', disabled: step === 5, onclick: () => { step++; draw(); } }, '下一步 →'), check('停用詞表裡含否定詞（很多預設詞表都是）', () => negInStop, v => negInStop = v, draw)), list,
        step >= 3 ? nt(negLost ? '「否認」被當成停用詞刪掉了——向量裡只剩「發燒」，意思完全相反。照抄別人的停用詞表，你的模型會分不出「有」跟「沒有」。' : step === 5 ? '「否認」保留下來了，但詞袋裡「否認」與「發燒」是兩顆獨立的球，看不出「否認」是在修飾「發燒」——解法在 P07（N-gram 與否定範圍標記）。' : '「否認」保留下來了。年齡、日期、檢驗值抽成結構化欄位，不要留在詞袋裡當成一般的詞。', negLost ? 'bad' : 'warn') : ''); }
    ctl.append(row(lbl('前處理技巧：轉小寫、去標點、斷詞、去停用詞、詞形還原（中文不需要）、詞性標註——每一個都有「什麼時候不要做」。')));
    $('#w-pipe').append(ctl, out); draw();
  })();

  // ================= P03 斷詞 =================
  (function () {
    const SEN = ['病人主訴二尖瓣脫垂合併心房顫動，否認胸痛', '研究生命的起源', '病人服藥後不適', '慢性阻塞性肺病病人需要鼻胃管灌食', '病人有壓力性損傷，傷口滲液增加', '糖化血色素偏高，注意低血糖'];
    let si = 0, custom = '', on = new Set(), dir = 'fwd'; const ctl = h('div'), out = h('div');
    const inp = h('input', { type: 'text', placeholder: '或輸入自己的句子（虛構）', style: { width: '100%', maxWidth: '420px', padding: '6px 8px' } }); inp.oninput = () => { custom = inp.value.trim(); draw(); };
    function draw() { out.innerHTML = ''; const text = custom || SEN[si], dict = [...BASE, ...on], a = segment(text, BASE, dir), b = segment(text, dict, dir), f = segment(text, dict, 'fwd'), bw = segment(text, dict, 'bwd');
      const single = a.filter(t => [...t].length === 1 && !PUNC.has(t)).length;
      out.append(h('div', { class: 'grid2' }, h('div', null, ttl('只用基本詞典'), h('div', null, a.map(t => tok(t, { bg: [...t].length === 1 && !PUNC.has(t) && !['的', '後', '有', '低', '已', '無', '天'].includes(t) ? '#fbe3df' : undefined }))), h('div', { style: { fontSize: '12.5px', color: 'var(--muted)' } }, `${a.length} 個詞；紅底＝被切成單字的可疑片段`)),
        h('div', null, ttl(`加入自訂詞典（${on.size} 個醫療術語）`), h('div', null, b.map(t => tok(t, { bg: MED.includes(t) ? '#d7ece9' : undefined, b: MED.includes(t) }))), h('div', { style: { fontSize: '12.5px', color: 'var(--muted)' } }, `${b.length} 個詞；綠底＝自訂詞典命中`))),
        h('div', { style: { marginTop: '8px' } }, ttl('同一句、兩種切法（目前詞典）'), h('div', null, h('span', { style: { fontSize: '13px', width: '110px', display: 'inline-block' } }, '正向最大匹配：'), f.map(t => tok(t))), h('div', null, h('span', { style: { fontSize: '13px', width: '110px', display: 'inline-block' } }, '逆向最大匹配：'), bw.map(t => tok(t)))),
        nt(text === SEN[1] ? '經典歧義：正向切成「研究生｜命｜的｜起源」，逆向切成「研究｜生命｜的｜起源」。切錯語意全變——斷詞器會用統計或模型來選比較合理的那一種。' : single && !on.size ? '專有名詞被切碎了：「二尖瓣脫垂」變成「二｜尖｜瓣｜脫垂」。勾選上方的術語加入自訂詞典。' : on.size ? '加入自訂詞典後，術語保持完整。後面的 TF-IDF、主題模型都建立在這些詞上——斷詞錯了，後面全白做。' : '試試其他句子。', single && !on.size ? 'warn' : '')); }
    ctl.append(row(lbl('句子'), seg(SEN.map((s, i) => [i, s.length > 9 ? s.slice(0, 9) + '…' : s]), () => si, v => { si = v; custom = ''; inp.value = ''; }, draw)), row(inp), row(lbl('自訂詞典：'), ...MED.map(w => check(w, () => on.has(w), v => v ? on.add(w) : on.delete(w), draw)), h('button', { class: 'btn sm', onclick: () => { MED.forEach(w => on.add(w)); ctl.querySelectorAll('input[type=checkbox]').forEach(c => c.checked = true); draw(); } }, '全選')));
    $('#w-seg').append(ctl, out); draw();
  })();

  // ================= P04 DTM =================
  const DOCS = ['病人 主訴 胸痛 三 天', '病人 主訴 頭痛 兩 天', '病人 否認 胸痛 但 有 頭痛', '護理 指導 衛教 出院 用藥'];
  (function () {
    const D = DOCS.slice(); const out = h('div'), eds = h('div', { class: 'grid2' });
    D.forEach((d, i) => { const t = h('input', { type: 'text', value: d, style: { width: '100%', padding: '5px 8px', fontFamily: 'var(--mono)' } }); t.oninput = () => { D[i] = t.value; draw(); }; eds.append(h('label', { style: { fontSize: '13px' } }, `D${i + 1}　`, t)); });
    function draw() { out.innerHTML = ''; const docs = D.map(d => d.trim().split(/\s+/).filter(Boolean)), V = []; docs.forEach(d => d.forEach(t => { if (!V.includes(t)) V.push(t); }));
      const M = docs.map(d => V.map(t => d.filter(x => x === t).length)), zeros = M.flat().filter(v => !v).length, tot = M.flat().length;
      const t = h('table', { class: 'dt' }, h('tr', null, h('th', null, '文件＼詞'), V.map(v => h('th', { style: { textAlign: 'center' } }, v))), M.map((r, i) => h('tr', null, h('td', { style: { fontWeight: 600 } }, 'D' + (i + 1)), r.map(v => h('td', { style: { textAlign: 'center', fontFamily: 'var(--mono)', background: v ? '#d7ece9' : '', color: v ? 'var(--ink)' : '#c4c0b6' } }, v)))));
      const d1 = docs[0], rev = d1.slice().reverse(), same = V.every(v => d1.filter(x => x === v).length === rev.filter(x => x === v).length);
      out.append(h('div', { class: 'tscroll', style: { marginTop: '8px' } }, t), kpi(['矩陣大小', `${docs.length} × ${V.length}`], ['0 的比例（稀疏度）', `${zeros} / ${tot} = ${Math.round(zeros / tot * 100)}%`]),
        nt(h('span', null, `順序沒了：「${d1.join(' ')}」與「${rev.join(' ')}」${same ? '在矩陣裡是同一列' : ''}。「否認胸痛」的「否認」也只是袋子裡的一顆球。真實資料通常是幾千篇 × 幾萬個詞，而每篇只用到其中幾十個 → 99% 以上是 0。`))); }
    $('#w-dtm').append(eds, out); draw();
  })();

  // ================= P05 TF-IDF =================
  (function () {
    let di = 0, strip = false; const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; const docs = DOCS.map(d => d.split(' ').filter(t => !strip || !['三', '兩'].includes(t))), R = tfidf(docs), d = docs[di];
      const words = [...new Set(d)], rows = words.map(w => { const j = R.V.indexOf(w), tf = d.filter(x => x === w).length; return { w, tf, df: R.df[j], idf: R.idf[j], raw: tf * R.idf[j], n: R.M[di][j] }; }).sort((a, b) => b.n - a.n);
      const b = h('div'); U.hbars(b, rows.map(r => ({ label: r.w, value: r.n, color: r.n === rows[0].n ? C.accent : r.n === rows[rows.length - 1].n ? C.gray : '#5aa29c' })), { w: 360, rowH: 26, lw: 60, max: .7, fmt: v => v.toFixed(3) });
      out.append(h('div', { class: 'grid2', style: { alignItems: 'center' } }, h('div', null, tbl(['詞', 'tf', 'df（幾篇有）', 'idf = ln(5/(1+df)) + 1', 'tf × idf', 'L2 正規化'], rows.map(r => [r.w, r.tf, `${r.df} / 4`, `ln(5/${1 + r.df}) + 1 = ${r.idf.toFixed(3)}`, r.raw.toFixed(3), h('b', null, r.n.toFixed(3))]))), h('div', null, ttl(`D${di + 1} 的 TF-IDF 權重`), cap(b, 380))),
        nt(di === 0 && !strip ? '「病人」4 篇中出現 3 篇 → 沒有鑑別力 → 權重最低（0.353）；「三」只出現在 1 篇 → 權重最高（0.553）。但「三」是數字，不該當關鍵詞——這正是前處理第 ④ 步要先把數字抽成欄位的理由。勾選看看。' : strip && di === 0 ? '把數字抽走之後，D1 最重要的詞變成「主訴、胸痛、天」，「病人」仍然最低。' : '換一篇文件看看：每篇都有自己的「代表詞」。實用建議：先用 TF-IDF ＋ 邏輯斯迴歸跑一次當基準線，夠好就不需要動用嵌入與深度模型。', di === 0 && !strip ? 'warn' : '')); }
    ctl.append(row(lbl('文件'), seg(DOCS.map((d, i) => [i, `D${i + 1}：${d}`]), () => di, v => di = v, draw)), row(check('數字抽成欄位（移除「三」「兩」）', () => strip, v => strip = v, draw)));
    $('#w-tfidf').append(ctl, out); draw();
  })();

  // ================= P06 Zipf =================
  (function () {
    const TOP = [['的', 820, 1], ['病人', 610, 0], ['了', 540, 1], ['護理', 470, 0], ['是', 430, 1], ['疼痛', 380, 0], ['有', 350, 1], ['傷口', 300, 0], ['在', 280, 1], ['家屬', 260, 0], ['換藥', 240, 0], ['和', 230, 1], ['協助', 215, 0], ['評估', 200, 0], ['也', 190, 1], ['說明', 180, 0], ['服藥', 170, 0], ['就', 160, 1], ['血壓', 150, 0], ['衛教', 140, 0]];
    const tail = Array.from({ length: 2980 }, (_, i) => Math.max(1, Math.round(140 * (21 / (i + 21)) ** 1.35))), all = [...TOP.map(t => t[1]), ...tail];
    let rmStop = false, mc = 1; const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; const show = TOP.filter(t => !rmStop || !t[2]).slice(0, 12), b = h('div');
      U.hbars(b, show.map(([w, f, s]) => ({ label: w, value: f, color: s ? C.gray : C.accent })), { w: 380, rowH: 22, lw: 50 });
      const c = h('div'); lc(c, [{ pts: all.slice(0, 200).map((v, i) => [i + 1, v]), color: C.accent, w: 2 }], { w: 380, h: 220, xmin: 1, xmax: 200, ymin: 0, xl: '詞的排名（前 200 名）', yl: '出現次数'.replace('数', '數') });
      const keep = all.filter(v => v >= mc), once = all.filter(v => v <= 2).length;
      out.append(h('div', { class: 'grid2' }, h('div', null, ttl(rmStop ? '去停用詞後的前 12 名' : '前 12 名（灰＝停用詞）'), cap(b, 400)), h('div', null, ttl('Zipf 定律：少數詞佔大半，剩下是長尾'), cap(c, 400))),
        kpi(['詞彙量', `${keep.length.toLocaleString()} / ${all.length.toLocaleString()}`], ['只出現 1–2 次的詞', Math.round(once / all.length * 100) + '%'], ['保留的詞次佔比', Math.round(S.sum(keep) / S.sum(all) * 100) + '%']),
        nt(!rmStop ? '前十名有一半是「的、了、是、有、在」——不去停用詞，每個主題都會長得一模一樣。勾選「去停用詞」。' : mc < 3 ? '把「最少出現次數」拉到 3：詞彙量大減，但保留的詞次幾乎不變——被丟掉的多半是雜訊或錯字。' : `最少出現 ${mc} 次：詞彙量剩 ${keep.length}，卻保留了 ${Math.round(S.sum(keep) / S.sum(all) * 100)}% 的詞次。任何文字探勘專案，先畫這兩張圖；看不出問題就先別急著建模。`, !rmStop ? 'warn' : '')); }
    ctl.append(row(check('去停用詞', () => rmStop, v => rmStop = v, draw), slider('最少出現次數門檻', 1, 10, 1, () => mc, v => mc = v, draw)));
    $('#w-zipf').append(ctl, out, M6.tbl(['探索指標', '看出什麼'], [['文件數與長度分布', '極短（空白）或極長（複製貼上）的異常紀錄'], ['詞彙量', '太小 → 用語制式；太大 → 可能斷詞有問題'], ['前 50 高頻詞', '★ 停用詞夠不夠乾淨；該加進詞典的術語'], ['只出現 1–2 次的詞佔比', '通常 50% 以上，多半是雜訊或錯字'], ['共現詞對（bigram）', '★ 找出被切碎專有名詞的最好方法'], ['各類別的詞頻差異', '哪些詞真的能區分類別']])); draw();
  })();

  // ================= P07 N-gram、否定 =================
  (function () {
    const SS = ['病人 否認 胸痛', '病人 主訴 胸痛 三 天', '無 發燒 但 有 咳嗽']; let si = 0, n = 2; const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; const t = SS[si].split(' '), g = k => t.slice(0, t.length - k + 1).map((_, i) => t.slice(i, i + k).join(''));
      out.append(h('div', null, ...[1, 2, 3].map(k => h('div', { style: { padding: '6px 0', opacity: k <= n ? 1 : .35 } }, h('b', { style: { width: '96px', display: 'inline-block' } }, ['Unigram', 'Bigram', 'Trigram'][k - 1]), g(k).map(x => tok(x, { bg: k === 2 && /否認|無/.test(x) ? '#d7ece9' : undefined, b: k === 2 && /否認|無/.test(x) }))))),
        kpi(['特徵數（本句，用到 1 到 ' + n + '-gram）', String([1, 2, 3].filter(k => k <= n).reduce((s, k) => s + g(k).length, 0))], ['1 萬個詞的 bigram 可能組合', '1 億', 'bad']),
        nt(n === 1 ? '只有 unigram：「否認」與「胸痛」各自獨立。' : n === 2 ? '★ Bigram 把「否認胸痛」變成一個特徵——修飾關係救回來了。實務設定：unigram + bigram（AI Studio：Generate n-Grams），只保留出現 ≥ 5 次的 bigram。' : 'Trigram 讓整句變成一個特徵：太細碎，換個主詞就對不上，容易過擬合。', n === 3 ? 'warn' : '')); }
    ctl.append(row(lbl('句子'), seg(SS.map((s, i) => [i, s.replace(/ /g, '｜')]), () => si, v => si = v, draw), lbl('最多到'), seg([[1, '1-gram'], [2, '2-gram'], [3, '3-gram']], () => n, v => n = v, draw)));
    $('#w-ngram').append(ctl, out); draw();
  })();
  (function () {
    const SS = ['病人 否認 胸痛 ， 主訴 頭痛', '無 發燒 ， 但 有 咳嗽 及 喘', '未 見 傷口 紅腫 滲液 ， 疼痛 加劇', '排除 肺炎 可能 ， 持續 觀察 血氧', '病人 表示 頭暈 已 緩解'];
    const CUE = new Set(['否認', '無', '未', '沒有', '不曾', '排除', '非']), STOP = new Set(['，', '。', '但', '然而', '不過']), SW = new Set(['無', '未', '不', '及', '的', '已', '有']);
    let si = 0, win = 5, bnd = true, order = 'neg'; const ctl = h('div'), out = h('div');
    function mark(T) { const o = []; let left = 0; T.forEach(t => { if (CUE.has(t)) { left = win; o.push([t, 'cue']); return; } if (STOP.has(t)) { if (bnd) left = 0; o.push([t, 'stop']); return; } if (left > 0) { o.push(['NEG_' + t, 'neg']); left--; } else o.push([t, '']); }); return o; }
    function draw() { out.innerHTML = ''; let T = SS[si].split(' '), res;
      if (order === 'stop') { T = T.filter(t => !SW.has(t)); res = mark(T); } else res = mark(T).filter(([t, k]) => !(k === '' && SW.has(t)));
      const wrong = (si === 0 && res.some(([t]) => t === 'NEG_頭痛')) || (si === 2 && res.some(([t]) => t === 'NEG_疼痛')) || (si === 1 && res.some(([t]) => t === 'NEG_咳嗽'));
      out.append(h('div', { style: { padding: '8px', background: '#fff', border: '1px solid var(--line)', borderRadius: '8px' } }, res.map(([t, k]) => tok(t, k === 'cue' ? { bg: C.amber, c: '#fff', b: true } : k === 'neg' ? { bg: '#fbe3df', c: C.bad, b: true } : k === 'stop' ? { bg: '#e9e6df', c: 'var(--muted)' } : {}))),
        nt(order === 'stop' && !res.some(([, k]) => k === 'cue') ? '先去停用詞：否定詞「無」「未」被刪掉了，否定標記完全沒作用——順序反了就前功盡棄。要先做否定標記，再去停用詞（或從停用詞表中把否定詞刪掉）。' : wrong ? '沒有邊界：逗號、「但」之後的詞也被標成否定——「否認胸痛，主訴頭痛」的頭痛被標成沒有，那就完全錯了。標點與轉折詞都是天然的邊界。' : si === 4 ? '「已緩解」是隱含否定，規則抓不到。中文的否定表達很多樣：「未見」「並無」「查無」「已改善」——建議從自己的語料統計，不要只抄現成清單。' : '現在「NEG_胸痛」與「胸痛」是兩個不同的特徵了。視窗建議 3–5 個詞，太長容易誤標。', order === 'stop' || wrong ? 'bad' : '')); }
    ctl.append(row(lbl('句子'), seg(SS.map((s, i) => [i, s.replace(/ /g, '')]), () => si, v => si = v, draw)), row(slider('否定視窗（詞數）', 1, 8, 1, () => win, v => win = v, draw), check('遇到標點或轉折詞就關閉否定範圍', () => bnd, v => bnd = v, draw), lbl('順序'), seg([['neg', '✓ 先否定標記，再去停用詞'], ['stop', '✗ 先去停用詞']], () => order, v => order = v, draw)));
    $('#w-neg').append(ctl, out); draw();
  })();

  // ================= P08 關鍵詞 =================
  (function () {
    const r = rng(808), COM = ['住院', '醫師', '護理師', '病房', '治療', '服務', '態度', '時間', '等待', '說明'], ISS = [['動線混亂', 6], ['領藥', 5], ['停車', 5], ['候診椅', 4], ['叫號', 4], ['轉診單', 3], ['衛教單張', 3], ['批價', 3], ['輪椅', 2], ['指標不清', 2]];
    const pool = ISS.flatMap(([w, k]) => Array(k).fill(w)).sort(() => r() - .5), docs = Array.from({ length: 30 }, (_, i) => { const d = COM.filter(() => r() < .88); if (!d.length) d.push('住院'); if (r() < .4) d.push(COM[Math.floor(r() * 3)]); if (pool[i]) d.push(pool[i]); if (pool[i + 30]) d.push(pool[i + 30]); return d.sort(() => r() - .5); });
    const V = [...new Set(docs.flat())], N = docs.length, cnt = V.map(w => S.sum(docs.map(d => d.filter(x => x === w).length))), df = V.map(w => docs.filter(d => d.includes(w)).length), sc = V.map((w, j) => cnt[j] * Math.log(N / df[j]));
    const out = h('div');
    const top = (arr, f) => V.map((w, j) => [w, arr[j]]).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([w, v]) => ({ label: w, value: v, color: COM.includes(w) ? C.gray : C.accent }));
    const a = h('div'), b = h('div'); U.hbars(a, top(cnt), { w: 330, rowH: 22, lw: 76 }); U.hbars(b, top(sc), { w: 330, rowH: 22, lw: 76, fmt: v => v.toFixed(1) });
    out.append(h('div', { class: 'grid2' }, h('div', null, ttl('① 只看詞頻'), cap(a, 340)), h('div', null, ttl('② 詞頻 × ln(N / df)'), cap(b, 340))), h('div', { style: { fontSize: '13px', color: 'var(--muted)', margin: '4px 0' } }, '例句：', docs.slice(0, 3).map(d => h('span', { class: 'mono', style: { marginRight: '10px' } }, '「' + d.join(' ') + '」'))),
      nt('左邊那些詞（灰色）每一則留言幾乎都有，看了等於沒看；右邊「動線混亂、領藥、停車、候診椅、叫號」才是可以拿去開會討論的東西。做法：對每個類別或每個時間區間各算一次，比較「本月」與「上月」的關鍵詞差異，就看得出問題的變化趨勢。'),
      M6.tbl(['方法', '原理', '優點', '限制'], [['詞頻', '數次數', '最簡單', '★ 幾乎沒用，全是常見詞'], ['TF-IDF', '相對於整體語料的稀有度', '★ 簡單有效，本課程主力', '看不出詞與詞的關係'], ['TextRank', '詞當節點、共現當邊，跑 PageRank', '考慮詞之間的關聯', '計算較慢'], ['KeyBERT／嵌入式', '用語意向量找最能代表全文的詞', '能抓換句話說的表達', '需要模型與算力（M7）']]));
    $('#w-kw').append(out);
  })();

  // ================= P09 Naive Bayes =================
  (function () {
    const W = { 免費: { s: 3, h: 1, st: 1 }, 會議: { s: 0, h: 4, st: 0 }, 連結: { s: 3, h: 1, st: -1 } }; let ns = 4, nh = 6, lap = true; const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; const ps = ns / (ns + nh), ph = nh / (ns + nh), cp = (k, n) => lap ? (k + 1) / (n + 2) : k / n, used = Object.entries(W).filter(([, v]) => v.st >= 0);
      let ss = ps, sh = ph; const L = [['先驗機率', `P(spam) = ${ns}/${ns + nh} = ${ps.toFixed(3)}`, `P(ham) = ${nh}/${ns + nh} = ${ph.toFixed(3)}`]];
      used.forEach(([w, v]) => { const a = cp(v.s, ns), b = cp(v.h, nh); L.push([`「${w}」${v.st ? '出現' : '沒出現'}`, `P(${w}|spam) = ${lap ? `(${v.s}+1)/(${ns}+2)` : `${v.s}/${ns}`} = ${a.toFixed(3)}${v.st ? '' : `　→ 用 1 − ${a.toFixed(3)}`}`, `P(${w}|ham) = ${lap ? `(${v.h}+1)/(${nh}+2)` : `${v.h}/${nh}`} = ${b.toFixed(3)}${v.st ? '' : `　→ 用 1 − ${b.toFixed(3)}`}`]); ss *= v.st ? a : 1 - a; sh *= v.st ? b : 1 - b; });
      const p = ss + sh ? ss / (ss + sh) : .5; L.push(['相乘', `spam 分數 = ${(ss + 1e-9).toFixed(4)}`, `ham 分數 = ${(sh + 1e-9).toFixed(4)}`]);
      const zero = !lap && used.some(([, v]) => (v.st && v.s === 0) || (!v.st && v.s === ns));
      out.append(M6.tbl(['步驟', '垃圾信 spam', '正常信 ham'], L), kpi(['P(spam | 這封信)', (p * 100).toFixed(1) + '%', p > .5 ? 'bad' : 'good'], ['判定', p > .5 ? '垃圾信' : '正常信']),
        nt(zero ? '沒有 Laplace 平滑：「會議」在 spam 中出現 0 次，機率為 0，整個乘積歸零——一個沒看過的詞就能一票否決。分子加 1、分母加 2 就避開了這個問題。' : `${used.map(([w, v]) => `${v.st ? '含' : '不含'}「${w}」`).join('、')} → ${(p * 100).toFixed(1)}% 是垃圾信。「天真」指的是它假設這些詞互相獨立——語言上明顯不成立，但它照樣好用。`, zero ? 'warn' : '')); }
    const wctl = Object.keys(W).map(w => h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '6px', marginRight: '10px' } }, h('b', null, w), seg([[1, '出現'], [0, '沒出現'], [-1, '不考慮']], () => W[w].st, v => W[w].st = v, draw)));
    ctl.append(row(...wctl), row(slider('「免費」在 spam 中出現幾封', 0, 4, 1, () => W.免費.s, v => W.免費.s = v, draw), slider('「會議」在 spam 中出現幾封', 0, 4, 1, () => W.會議.s, v => W.會議.s = v, draw), check('Laplace 平滑', () => lap, v => lap = v, draw)));
    $('#w-nb').append(ctl, out, M6.tbl(['資料量', '首選', '為什麼'], [['小（< 1 萬筆）', '★ Naive Bayes', '參數少、不易過擬合、訓練極快'], ['中（1 萬–100 萬）', '邏輯斯迴歸', '★ 可看係數 → 知道是哪些詞造成判斷'], ['大（> 100 萬）', '線性 SVM／邏輯斯迴歸', '最擅長大量稀疏特徵'], ['沒有標註資料', '零樣本分類（M7）／主題模型', '★ 最常見的真實情況']])); draw();
  })();

  // ================= P10 混淆矩陣 =================
  (function () {
    const iN = p => { const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924], b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857]; const q = p - .5, r = q * q; return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); };
    const pos = Array.from({ length: 80 }, (_, i) => 1.5 + iN(.02 + .96 * (i + .5) / 80)), neg = Array.from({ length: 920 }, (_, i) => -.9 + iN(.02 + .96 * (i + .5) / 920));
    let t = .745, all = false; const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; const TP = all ? 0 : pos.filter(s => s >= t).length, FP = all ? 0 : neg.filter(s => s >= t).length, FN = 80 - TP, TN = 920 - FP, acc = (TP + TN) / 1000, pr = TP + FP ? TP / (TP + FP) : 0, rc = TP / 80, f1 = pr + rc ? 2 * pr * rc / (pr + rc) : 0;
      const cm = h('table', { class: 'dt', style: { maxWidth: '330px' } }, h('tr', null, h('th', null, ''), h('th', null, '預測：是'), h('th', null, '預測：否')), h('tr', null, h('th', null, '實際：是（80）'), h('td', { class: 'num', style: { background: 'var(--good-soft)', fontWeight: 700 } }, TP), h('td', { class: 'num', style: { background: 'var(--bad-soft)', fontWeight: 700 } }, FN + ' ← 漏掉')), h('tr', null, h('th', null, '實際：否（920）'), h('td', { class: 'num', style: { background: 'var(--amber-soft)' } }, FP + ' 誤報'), h('td', { class: 'num' }, TN)));
      const cf = h('div'); U.hbars(cf, [['給藥', 2.41], ['劑量', 2.18], ['藥名', 1.96], ['點滴', 1.74], ['處方', 1.63], ['口服', 1.51], ['注射', 1.44], ['領藥', 1.32], ['標籤', 1.18], ['核對', 1.05]].map(([l, v]) => ({ label: l, value: v, color: C.accent })), { w: 330, rowH: 20, lw: 46, max: 2.6 });
      out.append(h('div', { class: 'grid2' }, h('div', null, cm, kpi(['準確率', (acc * 100).toFixed(1) + '%'], ['Precision', (pr * 100).toFixed(1) + '%'], ['Recall', (rc * 100).toFixed(1) + '%', rc < .7 ? 'bad' : 'good'], ['F1', (f1 * 100).toFixed(1) + '%'])), h('div', null, ttl('邏輯斯迴歸係數前十名（講義數值）'), cap(cf, 340))),
        nt(all ? '全部猜「否」：準確率 92%，但 Recall = 0——80 筆用藥相關事件一筆都沒抓到。這是 M2-2 教過的類別不平衡陷阱，在文本分類特別常見。' : `準確率 ${(acc * 100).toFixed(1)}% 看起來很好，但漏掉的 ${FN} 筆才是風險所在。醫療場域通常寧可誤報也不能漏報：把門檻往左拉，看 Recall 怎麼換。右邊的係數表才是說服臨床單位的關鍵——「模型看的是給藥、劑量、藥名、點滴」，證明它抓的是對的東西。`, all ? 'bad' : rc < .7 ? 'warn' : '')); }
    ctl.append(row(slider('判定門檻（分數）', -1, 2.5, .05, () => t, v => t = v, draw, v => (+v).toFixed(2)), check('基準線：全部猜「否」', () => all, v => all = v, draw)));
    $('#w-cm').append(ctl, out, h('div', { class: 'concept' }, h('div', null, h('b', null, '交付時缺一不可'), '混淆矩陣；Precision／Recall／F1 並說明優先哪一個；類別分布；模型看重的前十個詞；各 3–5 筆假陽性與假陰性原文'), h('div', null, h('b', null, '讓人信任你的加分項'), '與基準線比較（全猜多數類、關鍵字規則）；不同子群的表現；★ 標註一致性 Kappa（P16）；失效情況的誠實說明；上線後誰監測'))); draw();
  })();
})();
