/* M8 加強版（2026-11）：長照手冊＋40 題測試問題的切塊實驗與檢索評測台、600 則居服員 ISBAR 通報的人機分流 */
(function () {
  'use strict';
  const { h, $, S, fmt, seg, slider, check, C } = U;
  const kpi = (k, v, cls) => h('div', null, h('div', { class: 'k' }, k), h('div', { class: 'v' + (cls ? ' ' + cls : '') }, v));
  const sub = t => h('div', { style: { fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' } }, t);
  const lab = t => h('span', { style: { fontSize: '13px', color: 'var(--muted)' } }, t);
  const note = (msg, cls) => h('div', { class: 'note' + (cls ? ' ' + cls : ''), style: { marginTop: '10px' } }, h('b', null, '看懂了什麼：'), msg);
  const span = (t, st) => h('span', { style: st }, t);
  const KB = window.M8KB; if (!KB) return;
  const { SEC, Q, REWRITE } = KB;
  const clean = t => t.replace(/[，。、：；（）「」？！【】\s%,]/g, '');
  const bg = t => { const c = clean(t), o = []; for (let i = 0; i < c.length - 1; i++) o.push(c.slice(i, i + 2)); return o; };
  const rewrite = q => { let o = q; const used = []; REWRITE.forEach(([a, b]) => { if (o.includes(a) && !used.includes(b)) { o += ' ' + b; used.push(b); } }); return { q: o, used }; };
  function bm25(docs) {
    const D = docs.map(bg), N = D.length, avg = S.mean(D.map(d => d.length)), df = {};
    D.forEach(d => new Set(d).forEach(b => df[b] = (df[b] || 0) + 1));
    const tf = D.map(d => { const m = {}; d.forEach(b => m[b] = (m[b] || 0) + 1); return m; });
    return q => { const qb = [...new Set(bg(q))]; return D.map((d, i) => { let s0 = 0; qb.forEach(b => { if (!tf[i][b]) return; const idf = Math.log(1 + (N - df[b] + .5) / (df[b] + .5)), f = tf[i][b]; s0 += idf * f * 2.2 / (f + 1.2 * (.25 + .75 * d.length / avg)); }); return s0; }); };
  }
  function tfidfCos(docs) {
    const D = docs.map(bg), N = D.length, df = {}; D.forEach(d => new Set(d).forEach(b => df[b] = (df[b] || 0) + 1));
    const idf = b => Math.log((N + 1) / ((df[b] || 0) + 1)) + 1;
    const vec = bs => { const tf = {}; bs.forEach(b => tf[b] = (tf[b] || 0) + 1); const v = {}; let nn = 0; for (const b in tf) { v[b] = tf[b] * idf(b); nn += v[b] ** 2; } nn = Math.sqrt(nn) || 1; for (const b in v) v[b] /= nn; return v; };
    const V = D.map(vec);
    return q => { const qv = vec(bg(q)); return V.map(v => { let s0 = 0; for (const k in qv) if (v[k]) s0 += qv[k] * v[k]; return s0; }); };
  }
  const markAns = (text, ans) => { const i = ans ? text.indexOf(ans) : -1; if (i < 0) return [span(text)]; return [span(text.slice(0, i)), span(ans, { background: '#fde7c8', fontWeight: 700, borderRadius: '2px' }), span(text.slice(i + ans.length))]; };

  /* ====================================================================
     ① 第 07 節：切塊大小實驗——40 題、8 種切法
     ==================================================================== */
  (function chunkExp() {
    const box = $('#w-chunkexp'); if (!box) return;
    const FULL = SEC.map(s0 => '【' + s0[0] + '】' + s0[1]).join('');
    const SIZES = [60, 120, 250, 500], OVS = [0, .25], K = 3;
    const ansPos = Q.map(q => { const st = FULL.indexOf(q[2], FULL.indexOf('【' + q[1] + '】')); return [st, st + q[2].length]; });
    const RES = {};
    SIZES.forEach(size => OVS.forEach(ov => {
      const step = Math.round(size * (1 - ov)), ch = [];
      for (let i = 0; i < FULL.length; i += step) { ch.push([i, FULL.slice(i, i + size)]); if (i + size >= FULL.length) break; }
      const f = bm25(ch.map(c => c[1]));
      const per = Q.map((q, qi) => { const [st, en] = ansPos[qi], cont = ch.map(([s0, t]) => s0 <= st && s0 + t.length >= en); const sc = f(q[0]), top = sc.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]).slice(0, K).map(z => z[1]); return { cut: !cont.some(Boolean), hit: top.some(i => cont[i]), top, cont }; });
      const ctx = S.mean(Q.map((_, qi) => S.sum(per[qi].top.map(i => ch[i][1].length))));
      RES[size + '|' + ov] = { size, ov, ch, per, hit: per.filter(p => p.hit).length / Q.length, cut: per.filter(p => p.cut).length, ctx, share: ctx / FULL.length, dens: S.mean(Q.map((q, qi) => per[qi].hit ? q[2].length / ctx : 0)) };
    }));
    let size = 120, ov = 0, qi = 7;
    const out = h('div');
    function draw() {
      out.innerHTML = '';
      const M = RES[size + '|' + ov];
      out.append(h('div', { class: 'row', style: { gap: '10px', flexWrap: 'wrap', marginBottom: '10px' } }, lab('切塊大小（字）'), seg(SIZES.map(z => [z, z + '']), () => size, v => size = v, draw), lab('重疊'), seg([[0, '0%'], [.25, '25%']], () => ov, v => ov = v, draw)));
      out.append(h('div', { class: 'kpi', style: { marginBottom: '10px' } }, kpi('切成幾塊', M.ch.length + ' 塊'), kpi('Top-3 找到答案', Math.round(M.hit * 100) + '%', M.hit >= .8 ? 'good' : M.hit < .7 ? 'bad' : ''), kpi('答案被切斷', M.cut + ' 題', M.cut ? 'bad' : 'good'), kpi('每題送進模型', fmt(M.ctx, 0) + ' 字'), kpi('＝整份手冊的', Math.round(M.share * 100) + '%', M.share > .4 ? 'bad' : '')));
      const g = h('div', { class: 'grid2', style: { gap: '18px', alignItems: 'start' } });
      const lcb = h('div'); lcb.append(sub('8 種切法：橫軸＝每題送進模型的字數、縱軸＝Top-3 命中率（實心＝無重疊、空心＝25% 重疊）'));
      const pts = Object.values(RES);
      U.scatter(lcb, pts.map(p => ({ x: p.ctx, y: p.hit * 100, c: p.size === size && p.ov === ov ? C.bad : C.accent, r: p.size === size && p.ov === ov ? 8 : 6, op: p.ov ? .25 : .85, stroke: p.ov ? C.accent : null, title: `${p.size} 字・重疊 ${p.ov * 100}%：命中 ${Math.round(p.hit * 100)}%、送 ${Math.round(p.ctx)} 字`, onclick: () => { size = p.size; ov = p.ov; draw(); } })), { w: 440, h: 270, xmin: 0, xmax: 1600, ymin: 50, ymax: 100, xlabel: '每題送進模型的字數', ylabel: 'Top-3 命中率 %', over: [(sv, x, y) => pts.filter(p => !p.ov).forEach(p => U.s('text', { x: x(p.ctx) + 9, y: y(p.hit * 100) + 4, text: p.size + ' 字', style: 'font-size:11px;fill:#5d6774' }, sv))] });
      const dt = h('div');
      const q = Q[qi], P = M.per[qi];
      dt.append(sub('選一題，看它被切在哪裡、檢索拿回哪幾塊'), h('select', { style: { width: '100%', padding: '5px', fontSize: '14px', marginBottom: '8px' }, onchange: e => { qi = +e.target.value; draw(); } }, ...Q.map((z, i) => { const o = h('option', { value: i }, `${i + 1}. ${z[0]}`); if (i === qi) o.selected = true; return o; })));
      // 文件條：每一塊一格，綠＝拿回來且含答案、藍＝拿回來不含答案、黃框＝含答案
      const strip = h('div', { style: { display: 'flex', gap: '1px', marginBottom: '8px', flexWrap: 'wrap' } });
      M.ch.forEach((_, i) => strip.append(h('i', { title: `第 ${i + 1} 塊`, style: { display: 'block', width: Math.max(4, Math.min(30, 420 / M.ch.length)) + 'px', height: '18px', borderRadius: '2px', background: P.top.includes(i) ? (P.cont[i] ? C.good : C.blue) : '#e5e1d8', outline: P.cont[i] ? '2px solid #e0a54b' : 'none', outlineOffset: '-2px' } })));
      dt.append(strip, h('div', { style: { fontSize: '11.5px', color: 'var(--muted)', marginBottom: '6px' } }, '每一格是一塊；綠＝拿回且含完整答案、藍＝拿回但沒有答案、橘框＝含完整答案的塊'));
      P.top.forEach((i, r) => dt.append(h('div', { style: { fontSize: '13px', padding: '4px 0', borderTop: '1px dashed var(--line)' } }, span(`Top ${r + 1}・第 ${i + 1} 塊　`, { color: P.cont[i] ? C.good : 'var(--muted)', fontWeight: 600, fontSize: '12px' }), ...markAns(M.ch[i][1], P.cont[i] ? q[2] : null))));
      if (P.cut) dt.append(h('div', { style: { fontSize: '13px', color: C.bad, marginTop: '4px' } }, `答案「${q[2]}」剛好被切在兩塊的交界，沒有任何一塊含有完整答案。`));
      g.append(lcb, dt); out.append(g);
      const small = RES['60|0'], big = RES['500|0'];
      let msg = `切太小（60 字）時有 ${small.cut} 題的答案被切成兩半，命中率只有 ${Math.round(small.hit * 100)}%；加 25% 重疊就把切斷的情況降到 ${RES['60|0.25'].cut} 題。切太大（500 字）命中率最高（${Math.round(big.hit * 100)}%），但那是因為這份手冊只有 ${fmt(FULL.length, 0)} 字——每題送進 3 塊就等於送了整份手冊的 ${Math.round(big.share * 100)}%。真實的長照手冊有幾百頁，這招不能用，而且塊越大，模型越容易被不相干的內容干擾、成本也越高。`;
      msg += ` 實務起點：200–500 字（中文）、10–20% 重疊，再用 Tracing 看召回的段落調整。`;
      out.append(note(msg));
    }
    box.append(out); draw();
  })();

  /* ====================================================================
     ② 第 08 節：檢索評測台——40 題 × Top-K × 閾值 × 查詢改寫
     ==================================================================== */
  (function evalBench() {
    const box = $('#w-ragbench'); if (!box) return;
    const DOCS = SEC.map(s0 => s0[0] + '：' + s0[1]), f = tfidfCos(DOCS);
    let K = 3, th = 0, rw = false, sel = 22;
    const out = h('div');
    function evalAll() {
      return Q.map(q => { const qq = rw ? rewrite(q[0]) : { q: q[0], used: [] }; const sc = f(qq.q), ord = sc.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]); const g = SEC.findIndex(s0 => s0[0] === q[1]); const ret = ord.filter(z => z[0] >= th).slice(0, K); const rk = ret.findIndex(z => z[1] === g) + 1; return { q, qq, ord, g, ret, rk, gs: sc[g] }; });
    }
    function draw() {
      out.innerHTML = '';
      const E = evalAll(), E0 = (() => { const o = rw; rw = !rw; const r = evalAll(); rw = o; return r; })();
      const rec = E.filter(e => e.rk > 0).length / Q.length, rec0 = E0.filter(e => e.rk > 0).length / Q.length, mrr = S.mean(E.map(e => e.rk ? 1 / e.rk : 0)), empty = E.filter(e => !e.ret.length).length, avgN = S.mean(E.map(e => e.ret.length));
      out.append(h('div', { class: 'row', style: { gap: '18px', flexWrap: 'wrap', marginBottom: '10px' } }, slider('Top-K', 1, 8, 1, () => K, v => K = v, draw), slider('相似度閾值', 0, .12, .01, () => th, v => th = v, draw, v => (+v).toFixed(2)), check('查詢改寫（口語→手冊用語，模擬 Agentic RAG 的改寫節點）', () => rw, v => rw = v, draw)));
      out.append(h('div', { class: 'kpi', style: { marginBottom: '10px' } }, kpi('Recall@K', Math.round(rec * 100) + '%', rec >= .9 ? 'good' : rec < .75 ? 'bad' : ''), kpi('MRR', mrr.toFixed(3)), kpi('平均拿回幾段', avgN.toFixed(1) + ' 段'), kpi('空結果（全部低於閾值）', empty + ' 題', empty ? 'bad' : '')));
      const g = h('div', { class: 'grid2', style: { gap: '18px', alignItems: 'start' } });
      const left = h('div'); left.append(sub('40 題逐題結果（點格子看細節）：深綠＝第 1 名就對、淺綠＝在 Top-K 內、紅＝沒找到、灰＝空結果'));
      const grid = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(8,1fr)', gap: '4px' } });
      E.forEach((e, i) => { const bgc = !e.ret.length ? '#d6d2c9' : e.rk === 1 ? C.good : e.rk ? '#9fcfb2' : C.bad; const b = h('div', { title: e.q[0], style: { height: '34px', borderRadius: '5px', background: bgc, color: e.rk === 1 || (!e.rk && e.ret.length) ? '#fff' : 'var(--ink)', fontFamily: 'var(--mono)', fontSize: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', outline: i === sel ? '2px solid #1c2430' : 'none' } }, i + 1); b.onclick = () => { sel = i; draw(); }; grid.append(b); });
      left.append(grid);
      // 分數分布：正確段落 vs 其他段落
      const hb = h('div', { style: { marginTop: '12px' } }); left.append(sub('正確段落 vs 其他段落的相似度分布（虛線＝閾值）'), hb);
      const gold = E.map(e => e.gs), other = E.flatMap(e => e.ord.filter(z => z[1] !== e.g).slice(0, 5).map(z => z[0]));
      U.hist(hb, [{ values: other, color: C.gray, opacity: .7 }, { values: gold, color: C.good, opacity: .75 }], { w: 420, h: 170, bins: 24, min: 0, max: .24, xlabel: '相似度（灰＝其他段落、綠＝正確段落）', marks: [{ x: th, color: C.bad }] });
      const right = h('div'); const e = E[sel];
      right.append(sub(`第 ${sel + 1} 題`), h('div', { style: { fontSize: '15px', fontWeight: 700, marginBottom: '4px' } }, e.q[0]));
      if (rw && e.qq.used.length) right.append(h('div', { style: { fontSize: '13px', color: C.accent, marginBottom: '6px' } }, '改寫後加入：' + e.qq.used.join('、')));
      e.ord.slice(0, 5).forEach(([v, i], r) => { const isG = i === e.g, inR = e.ret.some(z => z[1] === i);
        right.append(h('div', { style: { padding: '5px 0', borderTop: '1px dashed var(--line)', fontSize: '13px', opacity: inR ? 1 : .55 } }, h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '12px' } }, h('b', { style: { color: isG ? C.good : 'inherit' } }, `${r + 1}. ${SEC[i][0]}${isG ? ' ★ 正確段落' : ''}`), h('span', { style: { fontFamily: 'var(--mono)', color: v < th ? C.bad : 'var(--muted)' } }, v.toFixed(3) + (inR ? '' : v < th ? '（低於閾值）' : '（超出 K）'))), h('div', null, ...markAns(SEC[i][1].slice(0, 90) + (SEC[i][1].length > 90 ? '…' : ''), isG ? e.q[2] : null)))); });
      g.append(left, right); out.append(g);
      let msg;
      if (empty >= 5) msg = `閾值 ${th.toFixed(2)} 太高：${empty} 題一段都拿不回來，Chatflow 會走到「查無資料」分支。看左下的分布圖，正確段落（綠）和其他段落（灰）的分數有一大段重疊，閾值切在哪都會誤傷。注意這裡的分數是字元 TF-IDF 餘弦，長段落配短問題數值普遍很低；換成 Dify 的向量模型，分數範圍完全不同——閾值不能抄別人的，要看自己資料的分布來設。`;
      else if (!rw) msg = `沒有改寫時，Recall@${K} 是 ${Math.round(rec * 100)}%。漏掉的多半是口語問法：「外勞」「車資」「喘口氣」「幾成」在手冊裡寫成「外籍家庭看護工」「交通接送」「喘息服務」「部分負擔」，字面對不上。打開「查詢改寫」會變成 ${Math.round(rec0 * 100)}%。`;
      else msg = `查詢改寫把 Recall@${K} 從 ${Math.round(rec0 * 100)}% 拉到 ${Math.round(rec * 100)}%——這就是第 09 節 Agentic RAG 先改寫再檢索的價值（真實系統由 LLM 改寫，這裡用對照表模擬）。${E.filter(x => !x.rk).length ? `還沒找到的 ${E.filter(x => !x.rk).map(x => '第 ' + (E.indexOf(x) + 1) + ' 題').join('、')}，點開看是哪一段搶走了位置。` : ''}`;
      msg += K >= 6 ? ` K=${K} 時 Recall 雖然高，但每題平均塞進 ${avgN.toFixed(1)} 段，多的都是雜訊——這時該加 Rerank，而不是一直加大 K。` : '';
      out.append(note(msg, empty >= 5 ? 'warn' : ''));
    }
    box.append(out); draw();
  })();

  /* ====================================================================
     ③ 第 16 節：一個月 600 則居服員 ISBAR 通報——AI 分流 × 主管複核量
     ==================================================================== */
  (function triage() {
    const box = $('#w-triage'); if (!box) return;
    const R = U.rng(1616), pick = a => a[Math.floor(R() * a.length)], cl = x => Math.max(.01, Math.min(.99, x));
    const TXT = {
      urgent: ['長輩今早叫不醒，呼吸很喘，血氧 86%', '跌倒後右髖劇痛，無法站立', '胸口悶痛、冒冷汗，持續 20 分鐘', '嘴角歪斜、講話不清楚，右手無力', '發燒 39.2 度、意識混亂', '解黑便兩次，臉色蒼白頭暈'],
      vague: ['長輩今天精神比較差，一直想睡，吃很少', '說話跟平常不太一樣，有點怪怪的', '今天特別躁動，一直想脫衣服', '一整天都沒有小便，家屬說應該還好'],
      follow: ['薦骨傷口周圍有點紅', '這週食量減少一半', '夜裡起來好幾次上廁所', '腳踝水腫比上週明顯', '情緒低落，不太想說話', '咳嗽三天，痰變黃'],
      normal: ['今天精神很好，有出門散步', '按時服藥，血壓 128/76', '協助沐浴完成，皮膚完整', '家屬詢問輔具申請流程', '午餐吃完一碗飯，心情不錯', '協助復健運動 20 分鐘，配合度佳']
    };
    const REP = [];
    for (let d = 0; d < 30; d++) for (let i = 0; i < 20; i++) {
      const u = R(); let cls, kind, sc;
      if (u < .06) { const vg = R() < .3; cls = 'urgent'; kind = vg ? 'vague' : 'urgent'; sc = vg ? cl(.32 + .1 * U.randn(R)) : cl(.86 + .07 * U.randn(R)); }
      else if (u < .3) { cls = 'follow'; kind = 'follow'; sc = cl(.45 + .15 * U.randn(R)); }
      else { cls = 'normal'; kind = 'normal'; sc = cl(.15 + .1 * U.randn(R)); }
      const self = R() < (cls === 'urgent' ? .7 : cls === 'follow' ? .08 : .01);
      REP.push({ d, cls, kind, sc, self, txt: pick(TXT[kind]), id: REP.length + 1 });
    }
    let th = .7, cap = 5, selfUp = false;
    const NAME = { urgent: '急件', follow: '需追蹤', normal: '一般' };
    const out = h('div');
    function run() {
      // 規則：分數 ≥ 門檻（或勾選後居服員自評急件）→ 立即通知主管；其餘每天依分數由高到低，主管複核 cap 則；剩下的週末批次看（延遲 72 小時計）
      const res = REP.map(r => ({ ...r }));
      for (let d = 0; d < 30; d++) { const day = res.filter(r => r.d === d); day.forEach(r => { r.route = (r.sc >= th || (selfUp && r.self)) ? 'now' : null; }); day.filter(r => !r.route).sort((a, b) => b.sc - a.sc).forEach((r, i) => { r.route = i < cap ? 'today' : 'batch'; }); }
      res.forEach(r => { r.delay = r.route === 'now' ? .5 : r.route === 'today' ? 8 : 72; });
      return res;
    }
    function draw() {
      out.innerHTML = '';
      out.append(h('div', { class: 'row', style: { gap: '18px', flexWrap: 'wrap', marginBottom: '10px' } }, slider('AI 立即通知門檻', .3, .95, .05, () => th, v => th = v, draw, v => (+v).toFixed(2)), slider('主管每天另外複核幾則', 0, 15, 1, () => cap, v => cap = v, draw), check('居服員自評「急」可直接升級', () => selfUp, v => selfUp = v, draw)));
      const res = run(), U0 = res.filter(r => r.cls === 'urgent'), now = res.filter(r => r.route === 'now');
      const caughtNow = U0.filter(r => r.route === 'now').length, late = U0.filter(r => r.route === 'batch'), falseA = now.filter(r => r.cls !== 'urgent').length;
      const load = (now.length + res.filter(r => r.route === 'today').length) / 30;
      out.append(h('div', { class: 'kpi', style: { marginBottom: '10px' } }, kpi('一個月急件', U0.length + ' 則'), kpi('立即通知抓到', `${caughtNow} / ${U0.length}`, caughtNow / U0.length > .9 ? 'good' : ''), kpi('急件拖到週末才被看到', late.length + ' 則', late.length ? 'bad' : 'good'), kpi('立即通知裡的誤報', now.length ? Math.round(falseA / now.length * 100) + '%' : '—', now.length && falseA / now.length > .5 ? 'bad' : ''), kpi('主管每天要看', load.toFixed(1) + ' 則')));
      const g = h('div', { class: 'grid2', style: { gap: '18px', alignItems: 'start' } });
      const sc = h('div'); sc.append(sub('600 則通報的 AI 風險分數（每一點一則；紅＝真的急件、橘＝需追蹤、灰＝一般；虛線＝門檻）'));
      const r2 = U.rng(4);
      U.scatter(sc, res.map(r => ({ x: r.d + 1 + (r2() - .5) * .7, y: r.sc, c: r.cls === 'urgent' ? C.bad : r.cls === 'follow' ? C.amber : C.gray, r: r.cls === 'urgent' ? 5 : 2.6, op: r.cls === 'urgent' ? .95 : .45, stroke: r.cls === 'urgent' && r.route === 'batch' ? '#1c2430' : null, title: `第 ${r.d + 1} 天・${NAME[r.cls]}・分數 ${r.sc.toFixed(2)}：${r.txt}` })), { w: 460, h: 280, xmin: 0, xmax: 31, ymin: 0, ymax: 1, xlabel: '日期（第幾天）', ylabel: 'AI 風險分數', under: [(sv, x, y) => U.s('line', { x1: x(0), x2: x(31), y1: y(th), y2: y(th), stroke: C.bad, 'stroke-dasharray': '5 4', 'stroke-width': 1.4 }, sv)] });
      sc.append(h('div', { style: { fontSize: '12px', color: 'var(--muted)' } }, '黑框紅點＝急件卻拖到週末才被看到'));
      const ls = h('div'); ls.append(sub('拖到週末才被看到的急件原文'));
      if (!late.length) ls.append(h('div', { style: { fontSize: '14px', color: C.good } }, '沒有。所有急件都在當天被看到。'));
      late.slice(0, 7).forEach(r => ls.append(h('div', { style: { fontSize: '13.5px', padding: '4px 0', borderTop: '1px dashed var(--line)' } }, span(`第 ${r.d + 1} 天・分數 ${r.sc.toFixed(2)}${r.self ? '・居服員有自評急' : ''}　`, { color: 'var(--muted)', fontSize: '12px', fontFamily: 'var(--mono)' }), r.txt)));
      g.append(sc, ls); out.append(g);
      const vg = late.filter(r => r.kind === 'vague').length;
      let msg = `AI 對「叫不醒、血氧 86%」這種寫得很明確的急件分數都很高，門檻 ${th.toFixed(2)} 就能立即通知；但${late.length ? `仍有 ${late.length} 則急件拖到週末${vg ? `，其中 ${vg} 則是${[...new Set(late.filter(r => r.kind === 'vague').map(r => r.txt))].slice(0, 2).map(t => '「' + t + '」').join('')}這種描述模糊的早期警訊（譫妄、中風、敗血症都可能這樣開始）——AI 給它們的分數跟一般觀察差不多` : ''}。` : '這次所有急件都在當天被看到。'}`;
      if (!selfUp && late.length) msg += ' 打開「居服員自評急可直接升級」：第一線人員的直覺正好補上 AI 看不懂的模糊描述——這就是三段式權責分工的意義，AI 負責排序，不負責把關。';
      else if (selfUp) msg += ` 讓居服員的判斷可以直接升級後，${late.length ? '剩下的是連居服員也沒察覺的個案，要靠主管每天複核量補上。' : '急件全部當天處理。'}`;
      if (th <= .4) msg += ` 門檻壓到 ${th.toFixed(2)}，立即通知裡 ${Math.round(falseA / Math.max(1, now.length) * 100)}% 是誤報，主管每天要看 ${load.toFixed(0)} 則——警示疲勞會讓真正的急件被忽略。`;
      out.append(note(msg, late.length ? 'warn' : ''));
    }
    box.append(out); draw();
  })();
})();
