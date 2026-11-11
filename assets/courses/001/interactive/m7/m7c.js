/* M7 加強版（2026-11）：同一份 600 句衛教語料——①從共現學出詞向量 ②訓練迷你 n-gram 語言模型看生成與幻覺 ③自我一致性檢查 */
(function () {
  'use strict';
  const { h, $, S, fmt, seg, slider, C } = U;
  const kpi = (k, v, cls) => h('div', null, h('div', { class: 'k' }, k), h('div', { class: 'v' + (cls ? ' ' + cls : '') }, v));
  const sub = t => h('div', { style: { fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' } }, t);
  const lab = t => h('span', { style: { fontSize: '13px', color: 'var(--muted)' } }, t);
  const note = (msg, cls) => h('div', { class: 'note' + (cls ? ' ' + cls : ''), style: { marginTop: '10px' } }, h('b', null, '看懂了什麼：'), msg);
  const span = (t, st) => h('span', { style: st }, t);

  /* ---------- 共用語料：600 句衛教句子（已斷詞），同一件事有不同說法 ---------- */
  const R0 = U.rng(7070), pick0 = a => a[Math.floor(R0() * a.length)];
  const VAR = { 跌: ['跌倒', '摔倒', '滑倒'], 傷: ['傷口', '刀口'], 注: ['注射', '打'], 尿: ['導尿管', '尿管'], 胃: ['鼻胃管', '灌食管'], 藥: ['服藥', '吃藥'], 術: ['手術', '開刀'], 長: ['長輩', '老人家'], 壓: ['降血壓藥', '血壓藥'] };
  const TOPIC = { 糖尿病: '#c0392b', 跌倒: '#6b46c1', 傷口: '#b45309', 管路: '#0d6b67', 用藥: '#2b6cb0', 術後: '#7a8794' };
  const TPL = [
    ['糖尿病', '胰島素 {注} 部位 要 輪替'], ['糖尿病', '胰島素 {注} 在 肚子 要 避開 肚臍'], ['糖尿病', '胰島素 開封 後 可 室溫 保存 一 個 月'], ['糖尿病', '低血糖 時 先 吃 十五 公克 糖'], ['糖尿病', '飯後 兩 小時 血糖 應 低於 一百八十'], ['糖尿病', '血糖機 試紙 要 避光 保存'], ['糖尿病', '糖尿病 足部 要 每天 檢查 有沒有 傷口'],
    ['跌倒', '{長} 在 浴室 {跌} 要 先 評估 意識'], ['跌倒', '浴室 要 裝 扶手 和 止滑墊 預防 {跌}'], ['跌倒', '夜間 起床 先 坐 在 床邊 再 下床'], ['跌倒', '服用 安眠藥 後 下床 容易 {跌}'], ['跌倒', '{長} {跌} 後 髖部 疼痛 要 就醫 檢查 骨折'], ['跌倒', '走道 保持 明亮 可以 預防 {跌}'],
    ['傷口', '{傷} 紅腫 熱痛 可能 是 感染'], ['傷口', '{傷} 拆線 前 不 可 泡水'], ['傷口', '{傷} 換藥 前 要 先 洗手'], ['傷口', '人工皮 可以 貼 三 到 五 天'], ['傷口', '{傷} 有 黃色 分泌物 要 回診'], ['傷口', '{傷} 癢 不 可 用手 抓'],
    ['管路', '{尿} 尿袋 要 低於 膀胱'], ['管路', '{尿} 不 可 自行 拔除'], ['管路', '{尿} 尿液 混濁 要 多 喝水 並 回診'], ['管路', '{胃} 灌食 前 要 反抽 確認 位置'], ['管路', '{胃} 灌食 後 要 半坐臥 三十 分鐘'], ['管路', '{胃} 滑脫 不 可 自行 放回'],
    ['用藥', '{藥} 不 可 配 葡萄柚汁'], ['用藥', '漏 吃 一 次 藥 不 要 一次 吃 兩 倍'], ['用藥', '{壓} 不 可 自行 停藥'], ['用藥', '抗凝血劑 要 固定 攝取 深綠色 蔬菜 份量'], ['用藥', '{藥} 後 頭暈 要 先 坐 下 休息'], ['用藥', '藥物 要 放 在 兒童 拿 不 到 的 地方'],
    ['術後', '{術} 後 排氣 才 可以 進食'], ['術後', '{術} 後 多 補充 蛋白質 幫助 {傷} 癒合'], ['術後', '{術} 後 避免 麻油 和 酒'], ['術後', '{術} 後 第一 天 先 喝 清流質'], ['術後', '{術} 後 便秘 可以 多 吃 蔬菜 水果']];
  const SENT = [];
  for (let i = 0; i < 600; i++) { const [t, s0] = pick0(TPL); SENT.push({ t, toks: s0.replace(/\{(.)\}/g, (_, k) => pick0(VAR[k])).split(' ') }); }
  const SEEN = new Set(SENT.map(s0 => s0.toks.join(' ')));
  const WC = {}; SENT.forEach(s0 => s0.toks.forEach(w => WC[w] = (WC[w] || 0) + 1));
  const wordTopic = {}; { const tc = {}; SENT.forEach(s0 => s0.toks.forEach(w => { (tc[w] = tc[w] || {})[s0.t] = (tc[w][s0.t] || 0) + 1; })); for (const w in tc) wordTopic[w] = Object.entries(tc[w]).sort((a, b) => b[1] - a[1])[0][0]; }
  const together = (a, b) => SENT.some(s0 => s0.toks.includes(a) && s0.toks.includes(b));

  /* ====================================================================
     ① 第 07 節：從 600 句語料學出詞向量（共現 + PPMI）
     ==================================================================== */
  (function ppmi() {
    const box = $('#w-ppmi'); if (!box) return;
    const SHOW = ['跌倒', '摔倒', '滑倒', '浴室', '扶手', '長輩', '老人家', '下床', '傷口', '刀口', '拆線', '換藥', '感染', '分泌物', '注射', '打', '胰島素', '輪替', '肚子', '血糖', '導尿管', '尿管', '尿袋', '鼻胃管', '灌食管', '灌食', '服藥', '吃藥', '降血壓藥', '血壓藥', '停藥', '葡萄柚汁', '手術', '開刀', '進食', '蛋白質', '麻油', '泡水'];
    const PAIRS = [['跌倒', '摔倒'], ['傷口', '刀口'], ['注射', '打'], ['導尿管', '尿管'], ['鼻胃管', '灌食管'], ['服藥', '吃藥'], ['手術', '開刀'], ['長輩', '老人家']];
    let win = 2, sel = '摔倒';
    function build(wn) {
      const cnt = {}, wc = {}; let tot = 0;
      SENT.forEach(s0 => s0.toks.forEach((w, i) => { for (let j = Math.max(0, i - wn); j <= Math.min(s0.toks.length - 1, i + wn); j++) { if (j === i) continue; const c = s0.toks[j]; (cnt[w] = cnt[w] || {})[c] = (cnt[w][c] || 0) + 1; wc[c] = (wc[c] || 0) + 1; tot++; } }));
      const ww = {}; for (const w in cnt) ww[w] = S.sum(Object.values(cnt[w]));
      const V = {}; for (const w in cnt) { const v = {}; let nn = 0; for (const c in cnt[w]) { const p = Math.log(cnt[w][c] * tot / (ww[w] * wc[c])); if (p > 0) { v[c] = p; nn += p * p; } } nn = Math.sqrt(nn) || 1; for (const c in v) v[c] /= nn; V[w] = v; }
      return { V, cnt };
    }
    const cos = (a, b) => { let d = 0; for (const k in a) if (b[k]) d += a[k] * b[k]; return d; };
    const cache = {};
    function model(wn) {
      if (cache[wn]) return cache[wn];
      const { V, cnt } = build(wn);
      const G = SHOW.map(a => SHOW.map(b => cos(V[a], V[b]))), rm = G.map(r => S.mean(r)), gm = S.mean(rm), Gc = G.map((r, i) => r.map((v, j) => v - rm[i] - rm[j] + gm));
      const eig = []; let A = Gc.map(r => r.slice());
      for (let e = 0; e < 2; e++) { let v = SHOW.map((_, i) => Math.cos(i * 1.3 + e)), lam = 0; for (let it = 0; it < 200; it++) { const w = A.map(r => S.sum(r.map((x, j) => x * v[j]))); lam = Math.sqrt(S.sum(w.map(x => x * x))); v = w.map(x => x / lam); } eig.push({ v, lam }); A = A.map((r, i) => r.map((x, j) => x - lam * v[i] * v[j])); }
      const XY = SHOW.map((_, i) => [eig[0].v[i] * Math.sqrt(eig[0].lam), eig[1].v[i] * Math.sqrt(eig[1].lam)]);
      const pairSim = S.mean(PAIRS.map(([a, b]) => cos(V[a], V[b])));
      const r = U.rng(3), rnd = []; for (let k = 0; k < 300; k++) { const a = SHOW[Math.floor(r() * SHOW.length)], b = SHOW[Math.floor(r() * SHOW.length)]; if (a !== b) rnd.push(cos(V[a], V[b])); }
      return (cache[wn] = { V, cnt, XY, pairSim, rndSim: S.mean(rnd) });
    }
    const out = h('div');
    function draw() {
      out.innerHTML = '';
      const M = model(win);
      out.append(h('div', { class: 'row', style: { gap: '10px', flexWrap: 'wrap', marginBottom: '10px' } }, lab('上下文視窗（左右各幾個詞）'), seg([[1, '1'], [2, '2'], [4, '4']], () => win, v => win = v, draw)));
      out.append(h('div', { class: 'kpi', style: { marginBottom: '10px' } }, kpi('語料', '600 句・' + Object.keys(WC).length + ' 個詞'), kpi('8 組同義詞的平均相似度', M.pairSim.toFixed(2), 'good'), kpi('隨機兩個詞的平均相似度', M.rndSim.toFixed(2)), kpi('同義詞同時出現在同一句', PAIRS.filter(([a, b]) => together(a, b)).length + ' 組')));
      const g = h('div', { class: 'grid2', style: { gap: '18px', alignItems: 'start' } });
      const mp = h('div'); mp.append(sub('38 個詞的向量投影到 2 維（顏色＝這個詞最常出現的主題）。點任一個詞。'));
      const ch = h('div'); mp.append(ch);
      const nb = Object.keys(M.V).filter(w => w !== sel && WC[w] >= 10).map(w => [w, cos(M.V[sel], M.V[w])]).sort((a, b) => b[1] - a[1]).slice(0, 6);
      const nbSet = new Set(nb.slice(0, 3).map(z => z[0]));
      U.scatter(ch, SHOW.map((w, i) => ({ x: M.XY[i][0], y: M.XY[i][1], c: TOPIC[wordTopic[w]], r: w === sel ? 7 : 4.5, op: .85, stroke: w === sel ? '#1c2430' : null, title: w, onclick: () => { sel = w; draw(); } })), {
        w: 460, h: 360, noGrid: true, xlabel: '維度 1', ylabel: '維度 2',
        over: [(sv, x, y) => SHOW.forEach((w, i) => { const t = U.s('text', { x: x(M.XY[i][0]) + 6, y: y(M.XY[i][1]) - 5, text: w, style: `font-size:${w === sel || nbSet.has(w) ? 12.5 : 10.5}px;font-weight:${w === sel || nbSet.has(w) ? 700 : 400};fill:#1c2430;cursor:pointer` }, sv); t.addEventListener('click', () => { sel = w; draw(); }); })]
      });
      mp.append(h('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '12px', marginTop: '4px' } }, ...Object.entries(TOPIC).map(([t, c]) => h('span', null, h('i', { style: { display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: c, marginRight: '4px' } }), t))));
      const rt = h('div');
      rt.append(sub(`和「${sel}」最像的詞（cosine 相似度）`));
      const tb = h('div', { style: { display: 'grid', gridTemplateColumns: '90px 1fr 46px 110px', gap: '5px 8px', alignItems: 'center', fontSize: '13px' } });
      nb.forEach(([w, c]) => tb.append(h('div', { style: { textAlign: 'right', fontWeight: 600 } }, w), h('div', { style: { background: '#efece5', borderRadius: '4px' } }, h('i', { style: { display: 'block', height: '14px', borderRadius: '4px', background: TOPIC[wordTopic[w]], width: Math.max(2, c * 100) + '%' } })), h('div', { style: { fontFamily: 'var(--mono)' } }, c.toFixed(2)), h('div', { style: { fontSize: '11.5px', color: together(sel, w) ? 'var(--muted)' : C.accent } }, together(sel, w) ? '曾同句出現' : '從未同句出現')));
      rt.append(tb);
      const ctx = Object.entries(M.cnt[sel] || {}).sort((a, b) => b[1] - a[1]).slice(0, 8);
      rt.append(h('div', { style: { marginTop: '12px' } }, sub(`「${sel}」周圍最常出現的詞（向量就是從這些算出來的）`), h('div', null, ...ctx.map(([w, n]) => span(`${w} ×${n}`, { display: 'inline-block', margin: '2px 3px', padding: '2px 8px', borderRadius: '5px', background: '#eef3f2', fontSize: '13px' })))));
      const ex = h('div', { style: { marginTop: '10px', fontSize: '13px' } }, sub('語料裡的例句'), ...SENT.filter(s0 => s0.toks.includes(sel)).slice(0, 3).map(s0 => h('div', null, ...s0.toks.map(w => span(w, w === sel ? { color: C.accent, fontWeight: 700 } : null)))));
      rt.append(ex);
      g.append(mp, rt); out.append(g);
      const top = nb[0];
      let msg = `每個詞的向量只來自「它周圍出現哪些詞」（PPMI 加權的共現）。「${sel}」最像的是「${top[0]}」（${top[1].toFixed(2)}）${together(sel, top[0]) ? '。' : '——這兩個詞在 600 句裡從來沒有出現在同一句，模型是因為它們的「鄰居」一樣，才把它們放在一起。'}這正好解決 M6 檢索遇到的「摔倒找不到跌倒」：同義詞不用人工列表。`;
      if (sel === '血壓藥' || sel === '降血壓藥' || sel === '泡水') msg = `注意「血壓藥」和「泡水」也很像——因為它們後面都接「不 可 ……」。分布相似只代表「用法相似」，不代表意思相同；反義詞（冷／熱、增加／減少）也常因此靠得很近。這是詞向量最常見的誤解。`;
      else if (win === 1) msg += ' 視窗 1 時只看緊鄰的詞，抓到的是語法位置（名詞跟名詞像）；視窗 4 時看得更廣，抓到的是主題（同一類衛教的詞聚在一起）。';
      out.append(note(msg));
    }
    box.append(out); draw();
  })();

  /* ---------- 共用：n-gram 語言模型（含退避） ---------- */
  const NG = {};
  function ngram(n) {
    if (NG[n]) return NG[n];
    const Cn = {};
    SENT.forEach(s0 => { const t = ['<s>', '<s>', '<s>'].concat(s0.toks, ['</s>']); for (let i = 3; i < t.length; i++) for (let k = 1; k <= n; k++) { const ctx = t.slice(i - (k - 1), i).join(' '); const key = k + '|' + ctx; (Cn[key] = Cn[key] || {})[t[i]] = ((Cn[key] || {})[t[i]] || 0) + 1; } });
    return (NG[n] = Cn);
  }
  function dist(n, hist) { const Cn = ngram(n), t = ['<s>', '<s>', '<s>'].concat(hist); for (let k = n; k >= 1; k--) { const d = Cn[k + '|' + t.slice(t.length - (k - 1)).join(' ')]; if (d) return { d, k }; } return { d: Cn['1|'], k: 1 }; }
  function sample(n, T, topP, prompt, r) {
    const out = prompt.slice(), used = [];
    for (let s0 = 0; s0 < 22; s0++) {
      const { d, k } = dist(n, out); used.push(k);
      let e = Object.entries(d).map(([w, c]) => [w, Math.pow(c, 1 / T)]); const Z = S.sum(e.map(z => z[1])); e = e.map(([w, v]) => [w, v / Z]).sort((a, b) => b[1] - a[1]);
      let cum = 0; const keep = []; for (const z of e) { keep.push(z); cum += z[1]; if (cum >= topP) break; }
      const Z2 = S.sum(keep.map(z => z[1])); let u = r() * Z2, i = 0; while (u > keep[i][1] && i < keep.length - 1) { u -= keep[i][1]; i++; }
      if (keep[i][0] === '</s>') { if (out.length === prompt.length) continue; break; } out.push(keep[i][0]);
    }
    return { toks: out, backoff: used.some((k, i) => k < Math.min(n, i + prompt.length + 1)) };
  }
  const FOUR = new Set(); SENT.forEach(s0 => { const t = ['<s>', '<s>', '<s>'].concat(s0.toks); for (let i = 3; i < t.length; i++) FOUR.add(t.slice(i - 3, i + 1).join(' ')); });
  const seams = toks => { const t = ['<s>', '<s>', '<s>'].concat(toks); return toks.map((_, i) => !FOUR.has(t.slice(i, i + 4).join(' '))); };

  /* ====================================================================
     ② 第 09 節：在瀏覽器裡訓練一個迷你語言模型
     ==================================================================== */
  (function lm() {
    const box = $('#w-lm'); if (!box) return;
    const PROMPTS = [['（從頭開始）', []], ['胰島素', ['胰島素']], ['導尿管', ['導尿管']], ['傷口', ['傷口']], ['長輩', ['長輩']], ['手術 後', ['手術', '後']]];
    let n = 3, T = 1, topP = 1, pi = 0, gens = [], seed = 1;
    function run() { const r = U.rng(seed * 97 + n * 13 + Math.round(T * 10) + pi * 7); gens = Array.from({ length: 10 }, () => sample(n, T, topP, PROMPTS[pi][1], r)); }
    run();
    const out = h('div'), ctl = h('div');
    function draw() {
      out.innerHTML = '';
      const copy = gens.filter(g => SEEN.has(g.toks.join(' '))).length;
      out.append(h('div', { class: 'kpi', style: { marginBottom: '10px' } }, kpi('訓練語料', '600 句（75 種不同句子）'), kpi('照抄訓練句', copy + ' / 10'), kpi('訓練資料裡沒有的新句子', (10 - copy) + ' / 10', 10 - copy > 5 ? 'bad' : '')));
      const g = h('div', { class: 'grid2', style: { gap: '18px', alignItems: 'start' } });
      const lst = h('div'); lst.append(sub('生成的 10 句（橘底＝接縫：這 4 個詞的組合在訓練資料裡從沒出現過）'));
      gens.forEach(gn => { const cp = SEEN.has(gn.toks.join(' ')), sm = seams(gn.toks);
        lst.append(h('div', { style: { padding: '5px 0', borderTop: '1px dashed var(--line)', fontSize: '14.5px', display: 'flex', justifyContent: 'space-between', gap: '8px' } }, h('div', null, ...gn.toks.map((w, i) => span(w, i < PROMPTS[pi][1].length ? { fontWeight: 700 } : !cp && sm[i] ? { background: '#fde7c8', borderRadius: '3px' } : null))), h('span', { class: 'tag ' + (cp ? 'gray' : 'amber'), style: { alignSelf: 'center' } }, cp ? '照抄' : '新組合'))); });
      const pr = h('div');
      const { d, k } = dist(n, PROMPTS[pi][1]);
      let e = Object.entries(d).map(([w, c]) => [w, Math.pow(c, 1 / T)]); const Z = S.sum(e.map(z => z[1])); e = e.map(([w, v]) => [w === '</s>' ? '（結束）' : w, v / Z]).sort((a, b) => b[1] - a[1]);
      let cum = 0; const inP = e.map(z => { const ok = cum < topP; cum += z[1]; return ok; });
      pr.append(sub(`「${PROMPTS[pi][0]}」之後，下一個詞的機率（${k > 1 ? `看前 ${k - 1} 個詞` : '不看前文'}）`));
      const bars = h('div', { style: { display: 'grid', gridTemplateColumns: '84px 1fr 48px', gap: '4px 8px', alignItems: 'center', fontSize: '13px' } });
      e.slice(0, 9).forEach(([w, p], i) => bars.append(h('div', { style: { textAlign: 'right', color: inP[i] ? 'inherit' : 'var(--muted)' } }, w), h('div', { style: { background: '#efece5', borderRadius: '4px' } }, h('i', { style: { display: 'block', height: '14px', borderRadius: '4px', background: inP[i] ? C.accent : C.gray, width: Math.max(1, p * 100 / e[0][1]) + '%' } })), h('div', { style: { fontFamily: 'var(--mono)' } }, (p * 100).toFixed(1) + '%')));
      pr.append(bars, h('div', { style: { fontSize: '12px', color: 'var(--muted)', marginTop: '4px' } }, `共 ${e.length} 個候選詞${topP < 1 ? `；Top-p ${topP} 只留下前 ${inP.filter(Boolean).length} 個（綠色）` : ''}`));
      g.append(lst, pr); out.append(g);
      let msg;
      if (n === 1) msg = '1-gram 不看前文，每個詞只照出現頻率抽——結果是一串詞彙亂湊，完全不成句。';
      else if (n === 2) msg = `2-gram 只看前一個詞：每一小段都通順，但「要」「後」「不 可」這種常見詞像轉轍器，把不同的句子接在一起。10 句裡有 ${10 - copy} 句是訓練資料沒有的新句子，看看橘底接縫前後，常常是兩條衛教硬拼起來的。`;
      else msg = `3-gram 看前兩個詞，句子變得很通順，10 句裡有 ${copy} 句照抄訓練資料；但剩下 ${10 - copy} 句「新組合」最危險——它們讀起來像真的衛教${(() => { const nw = gens.find(g => !SEEN.has(g.toks.join(' '))); return nw ? `，例如「${nw.toks.join('')}」：前半句和後半句各自來自不同的衛教條目` : ''; })()}。` + ' 這就是幻覺的本質：模型學的是「接下來哪個詞最常出現」，不是「這句話是不是對的」。大型語言模型看的前文長得多、語料大得多，但機制一樣。';
      if (T >= 1.6) msg += ' Temperature 調高後，低機率的詞也常被抽中，新組合變多。';
      if (T <= .4 && n > 1) msg += ' Temperature 很低時幾乎每次都選最高機率的詞，10 句會很接近甚至一樣。';
      out.append(note(msg, n > 1 && 10 - copy >= 3 ? 'warn' : ''));
    }
    const regen = h('button', { class: 'btn primary' }, '↻ 再生成 10 句'); regen.onclick = () => { seed++; run(); draw(); };
    ctl.append(h('div', { class: 'row', style: { gap: '10px', flexWrap: 'wrap', marginBottom: '8px' } }, regen, lab('模型看前文'), seg([[1, '1-gram（不看）'], [2, '2-gram（1 個詞）'], [3, '3-gram（2 個詞）']], () => n, v => { n = v; run(); }, draw)),
      h('div', { class: 'row', style: { gap: '10px', flexWrap: 'wrap', marginBottom: '10px' } }, lab('開頭'), seg(PROMPTS.map((p, i) => [i, p[0]]), () => pi, v => { pi = v; run(); }, draw)),
      h('div', { class: 'row', style: { gap: '18px', flexWrap: 'wrap', marginBottom: '10px' } }, slider('Temperature', .2, 2, .1, () => T, v => { T = v; run(); }, draw, v => (+v).toFixed(1)), slider('Top-p', .3, 1, .05, () => topP, v => { topP = v; run(); }, draw, v => (+v).toFixed(2))));
    box.append(ctl, out); draw();
  })();

  /* ====================================================================
     ③ 第 10 節：同一個問題問 5 次——自我一致性檢查
     ==================================================================== */
  (function selfcheck() {
    const box = $('#w-self'); if (!box) return;
    const PR = [['血糖機', 'seen'], ['低血糖', 'seen'], ['灌食管', 'seen'], ['手術', 'seen'], ['人工血管', 'unseen'], ['洗腎', 'unseen']];
    let seed = 1, th = .5, res = [];
    const jac = (a, b) => { const A = new Set(a), B = new Set(b); let i = 0; A.forEach(x => { if (B.has(x)) i++; }); const u = A.size + B.size - i; return u ? i / u : 1; };
    function run() { const r = U.rng(seed * 31 + 5); res = PR.map(([p, kind]) => { const g = Array.from({ length: 5 }, () => sample(3, 1, 1, [p], r)); const sc = []; for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) sc.push(jac(g[i].toks.slice(1), g[j].toks.slice(1))); const cont = new Set(SENT.filter(s0 => s0.toks[0] === p).map(s0 => s0.toks.join(' '))).size; return { p, kind, g, cons: S.mean(sc), n: WC[p] || 0, cont }; }); }
    run();
    const out = h('div');
    function draw() {
      out.innerHTML = '';
      const re = h('button', { class: 'btn primary' }, '↻ 每題重新問 5 次'); re.onclick = () => { seed++; run(); draw(); };
      out.append(h('div', { class: 'row', style: { gap: '18px', flexWrap: 'wrap', marginBottom: '10px' } }, re, slider('一致性低於多少就標示「可能是幻覺」', .2, .8, .05, () => th, v => th = v, draw, v => (+v).toFixed(2))));
      const flagged = res.filter(z => z.cons < th);
      out.append(h('div', { class: 'kpi', style: { marginBottom: '10px' } }, kpi('被標示的題目', flagged.length + ' / 6'), kpi('語料裡根本沒有的詞（應該要標）', res.filter(z => z.kind === 'unseen' && z.cons < th).length + ' / 2 抓到', res.filter(z => z.kind === 'unseen' && z.cons < th).length === 2 ? 'good' : 'bad'), kpi('語料有、但被誤標', res.filter(z => z.kind === 'seen' && z.cons < th).length + ' 題', res.filter(z => z.kind === 'seen' && z.cons < th).length ? 'bad' : '')));
      const g = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '10px' } });
      res.forEach(z => { const fl = z.cons < th;
        g.append(h('div', { style: { border: '1px solid ' + (fl ? '#e8b4ab' : 'var(--line)'), background: fl ? '#fdf3f1' : 'transparent', borderRadius: '8px', padding: '9px 11px' } },
          h('div', { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' } }, h('b', null, `「${z.p}」……`), h('span', { class: 'tag ' + (z.kind === 'seen' ? 'gray' : 'bad') }, z.kind === 'seen' ? `語料出現 ${z.n} 次・${z.cont} 種說法` : '語料裡沒有這個詞')),
          ...z.g.map(gn => h('div', { style: { fontSize: '13.5px', padding: '2px 0', borderTop: '1px dashed var(--line)' } }, ...gn.toks.map((w, i) => span(w, i === 0 ? { fontWeight: 700 } : null)))),
          h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', fontSize: '12.5px' } }, '一致性', h('div', { style: { flex: '1', background: '#efece5', borderRadius: '4px' } }, h('i', { style: { display: 'block', height: '10px', borderRadius: '4px', background: fl ? C.bad : C.good, width: Math.max(2, z.cons * 100) + '%' } })), h('span', { style: { fontFamily: 'var(--mono)' } }, z.cons.toFixed(2)), fl ? h('b', { style: { color: C.bad } }, '可能是幻覺') : null)));
      });
      out.append(g);
      const sm = res.find(z => z.p === '手術'), un = res.filter(z => z.kind === 'unseen');
      out.append(note(`問模型沒學過的東西（人工血管、洗腎），它不會說「不知道」，而是照樣造出通順的句子——但每次答案都不一樣，一致性只有 ${un.map(z => z.cons.toFixed(2)).join('、')}。這就是 SelfCheckGPT 這類方法的原理：同一題問 5 次，答案彼此矛盾就是警訊。再看學過的詞：${(() => { const fs = res.filter(z => z.kind === 'seen' && z.cons < th), bad = fs.filter(z => z.g.some(g => !SEEN.has(g.toks.join(' ')))), fa = fs.filter(z => !bad.includes(z)), parts = [];
        if (bad.length) parts.push(bad.map(z => `「${z.p}」雖然學過，5 個答案裡也真的拼出了錯句（例如「${z.g.find(g => !SEEN.has(g.toks.join(' '))).toks.join('')}」），被標示是對的`).join('；'));
        if (fa.length) parts.push(fa.map(z => `「${z.p}」的 5 個答案全是訓練資料裡的正確句子，只是語料本來就有 ${z.cont} 種說法（一致性 ${z.cons.toFixed(2)}）——這是誤報`).join('；'));
        if (!fs.length) parts.push(`「手術」在語料裡有 ${sm.cont} 種正確說法，答案本來就會不同（一致性 ${sm.cons.toFixed(2)}），門檻一調高就會被誤報`);
        return parts.join('；'); })()}。它也不是萬靈丹：模型如果把錯的東西學得很牢，它會每次都一致地答錯。醫療場域仍需要 M8 的 RAG 附上出處，加上人工審核。`, flagged.some(z => z.kind === 'seen') ? 'warn' : ''));
    }
    box.append(out); draw();
  })();
  /* ====================================================================
     第 12 節：TAIDE 與 AIEC 在地評測（2026-11-09 新增）
     ==================================================================== */
  (function taide() {
    const box = $('#w-taide'); if (!box) return;
    const lab = t => h('span', { style: { fontSize: '13px', color: 'var(--muted)' } }, t);
    const note = msg => h('div', { class: 'note', style: { marginTop: '10px' } }, h('b', null, '看懂了什麼：'), msg);
    const kpi = (k, v, cls) => h('div', null, h('div', { class: 'k' }, k), h('div', { class: 'v' + (cls ? ' ' + cls : '') }, v));
    let view = 'tl'; const res = h('div');
    const TL = [['2024/4', 'TAIDE‑LX‑7B（底模 Llama 2）', '可商用；另有學研用 13B'], ['2024/4–5', 'Llama3‑TAIDE‑LX‑8B（底模 Llama 3）', 'Llama 3 釋出後 4 天完成訓練，表現勝過 Llama 2 底的 13B'], ['2025/2', 'TAIDE 8B（底模 Llama 3.1）', '可商用；研發肺癌、乳癌、大腸癌衛教詢答等應用'], ['2025', 'Gemma‑3‑TAIDE‑12b（底模 Gemma 3）', '參加 AIEC 在地化評測']];
    const EV = [['IBM granite‑3.3‑8b', 90], ['Llama‑3.1‑8B', 84], ['Gemma‑3‑TAIDE‑12b', 84]];
    function draw() {
      res.innerHTML = '';
      if (view === 'tl') {
        res.append(h('div', { style: { display: 'grid', gap: '6px', marginTop: '10px' } }, ...TL.map(([d, m, x]) => h('div', { style: { display: 'grid', gridTemplateColumns: '90px 1fr', gap: '10px', border: '1px solid var(--line)', borderRadius: '8px', padding: '8px 12px', background: '#fff' } }, h('div', { class: 'mono', style: { color: 'var(--accent-ink)', fontWeight: 700 } }, d), h('div', null, h('b', null, m), h('div', { style: { fontSize: '13.5px', color: 'var(--muted)' } }, x))))));
        res.append(note('TAIDE 沒有從零預訓練，而是每當有更好的開源底模（Llama 2 → 3 → 3.1 → Gemma 3），就用繁中與台灣資料做持續預訓練與微調——這正是本模組「預訓練 → 微調 → 推論」三階段的真實版本。底模換了，授權條款也跟著換，使用前一定要看模型卡。'));
      } else {
        const bars = h('div'); res.append(lab('AIEC 小模型在地化評測（2025 年，20 款受測；顯示前段三款）'), bars);
        U.hbars(bars, EV.map(([l, v], i) => ({ label: l, value: v, color: /TAIDE/.test(l) ? C.accent : '#9aa3ad' })), { w: 760, lw: 160, rowH: 30, max: 100, fmt: v => v + '%' });
        res.append(note('評測題目來自「臺灣價值觀」題庫、高中學測國文與社會。在地化表現最好的是 IBM 的 granite‑3.3‑8b（90%），以台灣資料微調的 Gemma‑3‑TAIDE‑12b 與 Llama‑3.1‑8B 同為 84%——「本土訓練」不保證分數最高，評測也會定期更新。選模型時：先查最新一期評測，再用自己專題的 10 題測試集實測（Take‑Home 任務一）。'));
      }
    }
    box.append(h('div', { class: 'row' }, seg([['tl', 'TAIDE 怎麼換底模'], ['ev', 'AIEC 在地化評測']], () => view, v => view = v, draw)), res); draw();
  })();
  /* ====================================================================
     第 16 節：找出 AI 草稿裡的錯（2026-11-11 新增；虛構對話與草稿）
     ==================================================================== */
  (function scribe() {
    const box = $('#w-scribe'); if (!box) return;
    const TR = ['病人：右膝痛兩週了，上下樓梯更痛。', '病人：我對盤尼西林會起疹子。', '病人：我太太也有類似的膝痛。', '醫師：血壓 142/88，先不調藥，兩週後回診。', '醫師：止痛藥痛的時候才吃，少爬樓梯。'];
    const DR = [['主訴：左膝疼痛兩週，上下樓梯加劇。', '左右弄錯：對話是「右膝」', true], ['血壓 142/88 mmHg，暫不調整藥物，兩週後回診。', '', false], ['過敏史：無。', '與對話矛盾，也是遺漏：病人說對盤尼西林會起疹子', true], ['家族史：病人的母親有類似膝痛。', '人物弄錯：對話是「我太太」', true], ['計畫：止痛藥必要時使用（PRN），建議減少爬樓梯。', '', false]];
    const picked = new Set(); let checked = false;
    const out = h('div');
    function draw() {
      out.innerHTML = '';
      out.append(h('div', { class: 'grid2' },
        h('div', { style: { border: '1px solid var(--line)', borderRadius: '8px', padding: '10px 12px', background: '#fff' } }, h('b', null, '看診對話（虛構）'), ...TR.map(t => h('div', { style: { fontSize: '14px', margin: '4px 0' } }, t))),
        h('div', { style: { border: '1px solid var(--line)', borderRadius: '8px', padding: '10px 12px', background: '#fff' } }, h('b', null, 'AI 草稿——點你覺得有問題的句子'), ...DR.map(([t, why, bad], i) => {
          const on = picked.has(i); let bg = on ? '#fff4d6' : '#f6f8fa', bd = on ? '#d9a400' : 'var(--line)';
          if (checked) { if (bad && on) { bg = '#e3f4e6'; bd = '#2f9e44'; } else if (bad) { bg = '#fde8e8'; bd = '#c0392b'; } else if (on) { bg = '#fff0e0'; bd = '#e8590c'; } }
          return h('div', { style: { margin: '6px 0' } },
            h('button', { class: 'btn', style: { display: 'block', width: '100%', textAlign: 'left', background: bg, border: '1px solid ' + bd, padding: '6px 10px', borderRadius: '6px', cursor: checked ? 'default' : 'pointer', fontSize: '14px' }, onclick: () => { if (checked) return; on ? picked.delete(i) : picked.add(i); draw(); } }, t),
            checked && (bad || on) ? h('div', { style: { fontSize: '13px', color: 'var(--muted)', margin: '2px 4px' } }, bad ? (on ? '找到了：' : '漏掉了：') + why : '這句其實是對的（誤報）') : null);
        }))));
      const bar = h('div', { class: 'row', style: { marginTop: '10px' } },
        h('button', { class: 'btn', onclick: () => { checked = true; draw(); } }, '檢查答案'),
        h('button', { class: 'btn sm', onclick: () => { picked.clear(); checked = false; draw(); } }, '重來'));
      out.append(bar);
      if (checked) {
        const hit = DR.filter(([, , b], i) => b && picked.has(i)).length, miss = DR.filter(([, , b], i) => b && !picked.has(i)).length, fa = DR.filter(([, , b], i) => !b && picked.has(i)).length;
        out.append(h('div', { class: 'note' + (miss ? ' warn' : ''), style: { marginTop: '10px' } }, h('b', null, '結果：'), `找到 ${hit} 個、漏掉 ${miss} 個、誤報 ${fa} 個。草稿看起來流暢、格式完整，錯誤卻藏在細節裡：左右、人物、遺漏。這就是為什麼試驗作者說需要醫師主動監督，而不是被動接受；你的專題只要有 AI 生成的內容給人看，流程裡就要有人工覆核這一步。`));
      }
    }
    box.append(out); draw();
  })();
})();
