/* M6 加強版（2026-11）：600 筆異常事件通報分類、1,200 則滿意度留言的面向趨勢、240 則衛教問答檢索 */
(function () {
  'use strict';
  const { h, $, S, fmt, seg, check, C } = U;
  const kpi = (k, v, cls) => h('div', null, h('div', { class: 'k' }, k), h('div', { class: 'v' + (cls ? ' ' + cls : '') }, v));
  const sub = t => h('div', { style: { fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' } }, t);
  const lab = t => h('span', { style: { fontSize: '13px', color: 'var(--muted)' } }, t);
  const note = (msg, cls) => h('div', { class: 'note' + (cls ? ' ' + cls : ''), style: { marginTop: '10px' } }, h('b', null, '看懂了什麼：'), msg);
  const ascii = w => /^[A-Za-z0-9]+$/.test(w);
  const join = toks => toks.reduce((s0, w, i) => s0 + (i && ascii(w) && ascii(toks[i - 1]) ? ' ' : '') + w, '');
  const span = (t, st) => h('span', { style: st }, t);

  /* ====================================================================
     ① 第 10 節：600 筆異常事件通報，五類分類
     ==================================================================== */
  (function incident() {
    const box = $('#w-inc'); if (!box) return;
    const R = U.rng(6161), pick = a => a[Math.floor(R() * a.length)];
    const DRUG = ['insulin', 'KCl', 'heparin', 'warfarin', '抗生素', '止痛藥', '降血壓藥', '安眠藥', 'morphine', '點滴'];
    const TUBE = ['NG', 'Foley', 'CVC', '氣管內管', '引流管', '周邊靜脈留置針', '鼻胃管', '導尿管'];
    const PLACE = ['床邊', '浴室', '走廊', '廁所', '病房門口'];
    const HURT = ['無 明顯 外傷', '額頭 擦傷', '右 髖部 疼痛 ， 安排 X光', '左 手腕 腫脹', '頭部 撞擊 ， 安排 CT'];
    const LABS = ['血液', '尿液', '痰液', '血液 培養'];
    const T = {
      用藥: [() => `${pick(['早班', '小夜', '大夜'])} 給藥 時 發現 ${pick(DRUG)} 劑量 ${pick(['錯誤', '過高', '不足'])}`, () => `${pick(DRUG)} 給 錯 病人 ， 已 通知 醫師 ， ${pick(['病人 無 不適', '密切 觀察 生命徵象'])}`, () => `醫囑 ${pick(DRUG)} 重複 開立 ， 藥師 攔截`, () => `病人 使用 ${pick(DRUG)} 後 出現 皮疹 ， 疑 藥物 過敏`, () => `${pick(DRUG)} 漏 給 一 劑 ， 交班 時 發現`, () => `抽血 後 給予 ${pick(DRUG)} ， 發現 速率 設定 錯誤`, () => `病人 下床 時 頭暈 ， 未 跌倒 ， 查 為 ${pick(DRUG)} 給藥 時間 錯誤`],
      跌倒: [() => `病人 ${pick(PLACE)} 跌倒 ， ${pick(HURT)}`, () => `病人 自行 下床 於 ${pick(PLACE)} 滑倒 ， ${pick(HURT)}`, () => `夜間 如廁 時 跌坐 地上 ， ${pick(HURT)}`, () => `家屬 未 陪伴 ， 病人 從 床 上 跌落 ， ${pick(HURT)}`, () => `病人 跌倒 ， ${pick(TUBE)} 未 滑脫 ， ${pick(HURT)}`, () => `病人 使用 ${pick(DRUG)} 後 下床 跌倒 ， ${pick(HURT)}`],
      管路: [() => `病人 躁動 自拔 ${pick(TUBE)}`, () => `${pick(TUBE)} 滑脫 ， 重新 置放`, () => `翻身 時 ${pick(TUBE)} 脫落 ， 通知 醫師`, () => `${pick(TUBE)} 阻塞 ， 沖洗 後 通暢`, () => `病人 下床 時 ${pick(TUBE)} 滑脫 ， 未 跌倒`, () => `病人 下床 如廁 拉扯 ${pick(TUBE)} ， 未 跌倒 ， 重新 固定`],
      檢驗: [() => `檢體 標籤 ${pick(['貼錯', '漏貼', '資料 不符'])}`, () => `${pick(LABS)} 檢體 溶血 ， 重新 抽血`, () => `${pick(LABS)} 危急值 未 即時 通報 醫師`, () => `抽血 時 病人 辨識 錯誤 ， 檢體 退回`, () => `${pick(LABS)} 檢體 遺失 ， 重新 採檢`],
      其他: [() => '家屬 情緒 激動 ， 口頭 辱罵 護理師', () => `${pick(['輸液 幫浦', '監視器', '電動 床'])} 故障 ， 更換 設備`, () => `病人 ${pick(['薦骨', '足跟', '枕部'])} 壓傷 第二級`, () => '病人 擅自 離院 ， 通報 警衛', () => '病人 頭暈 ， 扶 回 床 上 ， 未 跌倒 ， 無 外傷', () => `病人 拒絕 ${pick(['抽血', '服藥', '翻身'])} ， 已 說明 並 記錄`]
    };
    const CL = Object.keys(T), K = CL.length, W = [.26, .24, .2, .15, .15];
    const FILL = ['通知 醫師', '家屬 在 旁', '意識 清楚', '生命徵象 穩定', '已 衛教 病人 及 家屬', '持續 觀察', '填寫 通報 單', '病人 下床', '夜間 巡房 時 發現', '交班 時 告知'];
    const DIS = [['無 給藥 錯誤', '未 給藥'], ['未 跌倒', '無 跌倒'], ['無 管路 滑脫', '管路 未 脫落'], ['未 抽血', '無 檢體 問題'], ['無 外傷']];
    const DOCS = [];
    for (let i = 0; i < 600; i++) {
      let u = R(), c = 0; while (u > W[c]) { u -= W[c]; c++; }
      const parts = [pick(T[CL[c]])()];
      const nf = Math.floor(R() * 3); for (let k = 0; k < nf; k++) parts.splice(Math.floor(R() * (parts.length + 1)), 0, pick(FILL));
      if (R() < .5) { let o = Math.floor(R() * 4); if (o >= c) o++; if (o < 4) parts.push(pick(DIS[o])); }
      let y = c; if (R() < .04) y = Math.floor(R() * 5);   // 約 4% 標註錯誤（真實通報常見）
      DOCS.push({ id: i + 1, c: y, truth: c, toks: parts.join(' ， ').split(' ') });
    }
    const NEG = new Set(['未', '無', '否認', '沒有']), STOP = new Set(['，', '時', '後', '於', '的', '並', '已']);
    function feats(t, neg, bi) {
      const o = []; let sc = 0;
      t.forEach(w => { if (w === '，') { sc = 0; return; } if (NEG.has(w)) { sc = neg ? 3 : 0; if (!neg) o.push(w); return; } if (STOP.has(w)) return; o.push(sc > 0 ? '未_' + w : w); if (sc > 0) sc--; });
      if (bi) { const b = []; for (let i = 0; i < o.length - 1; i++) b.push(o[i] + '+' + o[i + 1]); return o.concat(b); }
      return o;
    }
    function train(ntr, neg, bi) {
      const tr = DOCS.slice(0, ntr), te = DOCS.slice(420), cnt = CL.map(() => ({})), tot = new Array(K).fill(0), pri = new Array(K).fill(0), V = new Set();
      tr.forEach(d => { pri[d.c]++; feats(d.toks, neg, bi).forEach(f => { cnt[d.c][f] = (cnt[d.c][f] || 0) + 1; tot[d.c]++; V.add(f); }); });
      const lp = (k, w) => Math.log(((cnt[k][w] || 0) + 1) / (tot[k] + V.size));
      const cm = CL.map(() => CL.map(() => [])), pred = [];
      te.forEach(d => { const f = feats(d.toks, neg, bi); let best = -1e9, bc = 0; for (let k = 0; k < K; k++) { let s0 = Math.log((pri[k] + 1) / (tr.length + K)); f.forEach(w => { if (V.has(w)) s0 += lp(k, w); }); if (s0 > best) { best = s0; bc = k; } } cm[d.c][bc].push(d); pred.push(bc); });
      const top = CL.map((_, k) => [...V].filter(w => (cnt[k][w] || 0) >= 3).map(w => [w, lp(k, w) - Math.log(S.mean(CL.map((_, j) => j === k ? 0 : Math.exp(lp(j, w))).filter(Boolean)))]).sort((a, b) => b[1] - a[1]).slice(0, 6));
      const acc = te.filter((d, i) => pred[i] === d.c).length / te.length;
      const f1 = S.mean(CL.map((_, k) => { const tp = cm[k][k].length, fp = S.sum(CL.map((_, j) => j === k ? 0 : cm[j][k].length)), fn = S.sum(cm[k].map((x, j) => j === k ? 0 : x.length)); return tp ? 2 * tp / (2 * tp + fp + fn) : 0; }));
      return { cm, acc, f1, top, te, cnt };
    }
    let ntr = 150, neg = false, bi = false, cell = null;
    const out = h('div');
    function draw() {
      out.innerHTML = '';
      out.append(h('div', { class: 'row', style: { gap: '10px', flexWrap: 'wrap', marginBottom: '10px' } },
        lab('訓練筆數'), seg([[60, '60'], [150, '150'], [420, '420']], () => ntr, v => { ntr = v; cell = null; }, draw),
        check('否定處理（未／無 之後 3 個詞加上「未_」）', () => neg, v => { neg = v; cell = null; }, draw), check('加 Bigram', () => bi, v => { bi = v; cell = null; }, draw)));
      const M = train(ntr, neg, bi), M0 = train(ntr, !neg, bi);
      const errs = S.sum(M.cm.flatMap((r, i) => r.map((x, j) => i === j ? 0 : x.length))), noisy = S.sum(M.cm.flatMap((r, i) => r.map((x, j) => i === j ? 0 : x.filter(d => d.c !== d.truth).length)));
      out.append(h('div', { class: 'kpi', style: { marginBottom: '10px' } }, kpi('測試集', '180 筆'), kpi('準確率', (M.acc * 100).toFixed(1) + '%', 'good'), kpi('Macro F1', M.f1.toFixed(3)), kpi('分錯幾筆', errs + ' 筆'), kpi('其中「標註本身就錯」', noisy + ' 筆', noisy ? 'bad' : '')));
      const g = h('div', { class: 'grid2', style: { gap: '18px', alignItems: 'start' } });
      const cmB = h('div'); cmB.append(sub('混淆矩陣（列＝人工標註、欄＝模型預測）。點格子看是哪幾筆。'));
      const tb = h('div', { style: { display: 'grid', gridTemplateColumns: `56px repeat(${K},1fr)`, gap: '3px', fontSize: '13px' } });
      tb.append(h('div'), ...CL.map(c => h('div', { style: { textAlign: 'center', fontWeight: 600, color: 'var(--muted)' } }, c)));
      const mx = Math.max(...M.cm.flat().map(x => x.length));
      M.cm.forEach((r, i) => { tb.append(h('div', { style: { fontWeight: 600, color: 'var(--muted)', alignSelf: 'center' } }, CL[i])); r.forEach((x, j) => { const n = x.length, on = cell && cell[0] === i && cell[1] === j; const b = h('div', { style: { textAlign: 'center', padding: '9px 0', borderRadius: '5px', cursor: n ? 'pointer' : 'default', fontFamily: 'var(--mono)', fontWeight: 600, background: i === j ? `rgba(13,107,103,${.12 + .6 * n / mx})` : n ? `rgba(192,57,43,${.15 + .5 * Math.min(1, n / 6)})` : '#f4f2ed', color: i === j && n / mx > .5 ? '#fff' : 'var(--ink)', outline: on ? '2px solid #1c2430' : 'none' } }, n); if (n) b.onclick = () => { cell = [i, j]; draw(); }; tb.append(b); }); });
      cmB.append(tb);
      const tw = h('div'); tw.append(sub('每一類模型最看重的詞（相對其他類的對數機率比）'));
      const tg = h('div', { style: { display: 'grid', gridTemplateColumns: '44px 1fr', gap: '5px 8px', fontSize: '13px' } });
      M.top.forEach((ws, k) => tg.append(h('b', null, CL[k]), h('div', null, ...ws.map(([w]) => span(w.replace(/\+/g, ' '), { display: 'inline-block', margin: '1px 3px', padding: '1px 7px', borderRadius: '5px', background: w.includes('未_') ? '#fdf0dc' : '#eef3f2', color: w.includes('未_') ? C.amber : 'inherit' })))));
      tw.append(tg); g.append(cmB, tw); out.append(g);
      // 點選格子的原文
      if (cell) {
        const [i, j] = cell, list = M.cm[i][j].slice(0, 8);
        const lb = h('div', { style: { marginTop: '12px', border: '1px solid var(--line)', borderRadius: '8px', padding: '10px 12px' } }, h('div', { style: { fontSize: '13.5px', fontWeight: 600, marginBottom: '6px' } }, `人工標「${CL[i]}」、模型判「${CL[j]}」：${M.cm[i][j].length} 筆${M.cm[i][j].length > 8 ? '（顯示前 8 筆）' : ''}`));
        list.forEach(d => { let sc = 0; const toks = d.toks.map(w => { if (w === '，') { sc = 0; return span('，'); } if (NEG.has(w)) { sc = 3; return span(w, { color: C.amber, fontWeight: 700 }); } const inS = sc > 0 && !STOP.has(w); if (inS) sc--; return span((ascii(w) ? ' ' + w + ' ' : w), inS && neg ? { background: '#fdf0dc', borderRadius: '3px' } : null); });
          lb.append(h('div', { style: { fontSize: '14px', padding: '3px 0', borderTop: '1px dashed var(--line)' } }, span(`#${d.id} `, { color: 'var(--muted)', fontFamily: 'var(--mono)', fontSize: '12px' }), ...toks, d.c !== d.truth ? span(`　← 依內容應為「${CL[d.truth]}」，標註錯了`, { color: C.bad, fontSize: '12.5px' }) : null)); });
        out.append(lb);
      }
      const d = M.acc - M0.acc; let msg;
      if (!neg) msg = `沒有否定處理時，「未 跌倒」裡的「跌倒」會被當成跌倒的證據——點「管路」列、「跌倒」欄看看那幾筆。打開否定處理後，準確率會${M0.acc > M.acc ? `從 ${(M.acc * 100).toFixed(1)}% 升到 ${(M0.acc * 100).toFixed(1)}%` : '變化不大'}。`;
      else msg = `否定處理讓「未_跌倒」變成另一個詞（橘色），它反而成了「管路」「其他」的證據；準確率${d > .004 ? `比沒處理多 ${(d * 100).toFixed(1)} 個百分點` : '與沒處理差不多（訓練資料夠多時，模型能從其他詞補回來）'}。`;
      msg += noisy ? ` 剩下的 ${errs} 筆錯誤裡有 ${noisy} 筆其實是人工標註錯（紅字）——模型再好也到不了 100%，這就是第 16 節要先算標註一致性 Kappa 的原因。` : '';
      if (ntr === 60) msg += ' 只有 60 筆訓練資料時，少數類（檢驗、其他）的詞看得太少，最容易被分錯。';
      out.append(note(msg));
    }
    box.append(out); draw();
  })();

  /* ====================================================================
     ② 第 12 節：1,200 則滿意度留言，12 個月的面向情感趨勢
     ==================================================================== */
  (function aspects() {
    const box = $('#w-aspect'); if (!box) return;
    const R = U.rng(1212), pick = a => a[Math.floor(R() * a.length)];
    const ASP = [
      { n: '候診時間', kw: ['候診', '等', '叫號', '排隊'], pos: ['叫號 很 快', '候診 時間 很 短', '等 不 久'], neg: ['候診 太 久', '叫號 很 亂', '排隊 排 很 久', '候診 區 很 擠', '叫號 系統 很 慢', '等 了 兩 小時', '等 了 三 小時 ， 真 有 效率'], mr: () => .45, nr: m => m >= 9 ? .2 : .75 },
      { n: '服務態度', kw: ['護理師', '醫師', '櫃檯', '態度'], pos: ['護理師 很 親切', '醫師 很 有 耐心', '櫃檯 人員 態度 很 好'], neg: ['櫃檯 態度 很 差', '護理師 不 耐心', '醫師 很 兇'], mr: () => .45, nr: () => .3 },
      { n: '停車', kw: ['停車', '車位', '停車場'], pos: ['停車 很 方便', '停車場 車位 充足'], neg: ['停車場 一位 難求', '停車 很 不 方便', '繞 了 三 圈 才 找到 車位'], negX: ['停車場 施工 很 亂', '停車場 施工 車位 少 一半'], mr: m => m >= 6 && m <= 8 ? .38 : .18, nr: m => m >= 6 && m <= 8 ? .82 : .35 },
      { n: '衛教說明', kw: ['衛教', '說明', '解釋'], pos: ['衛教 說明 很 清楚', '護理師 解釋 得 很 詳細'], neg: ['說明 不 清楚', '衛教 單 看 不 懂'], mr: () => .2, nr: () => .3 },
      { n: '環境清潔', kw: ['環境', '廁所', '病房'], pos: ['廁所 很 乾淨', '病房 環境 整潔'], neg: ['廁所 很 髒', '環境 有 異味'], mr: () => .15, nr: () => .3 },
      { n: '費用', kw: ['費用', '自費', '收費'], pos: ['收費 合理'], neg: ['自費 項目 太 貴', '費用 沒有 事先 說明'], mr: () => .12, nr: () => .55 }
    ];
    const POS = new Set(['快', '短', '親切', '耐心', '好', '方便', '充足', '清楚', '詳細', '懂', '乾淨', '整潔', '合理', '有效率']), NEGW = new Set(['久', '亂', '差', '兇', '難求', '髒', '異味', '貴', '少', '擠', '慢']), FLIP = new Set(['不', '沒有']);
    const COM = [];  // {m, clauses:[{a, p, toks}]}
    for (let m = 0; m < 12; m++) for (let i = 0; i < 100; i++) {
      let cl = ASP.map((a, k) => R() < a.mr(m) ? k : -1).filter(k => k >= 0); if (!cl.length) cl = [Math.floor(R() * 2)];
      COM.push({ m, cl: cl.slice(0, 3).map(k => { const a = ASP[k], ng = R() < a.nr(m); const bank = ng ? (a.negX && m >= 6 && m <= 8 && R() < .5 ? a.negX : a.neg) : a.pos; return { a: k, p: ng ? -1 : 1, toks: pick(bank).replace('有 效率', '有效率').split(' ') }; }) });
    }
    // 詞典法：每個子句找第一個面向關鍵詞，情感詞前 2 個詞內有「不／沒有」就反轉
    function lex(toks) {
      let a = -1; for (const w of toks) { const k = ASP.findIndex(x => x.kw.includes(w)); if (k >= 0) { a = k; break; } }
      let s0 = 0; toks.forEach((w, i) => { const v = POS.has(w) ? 1 : NEGW.has(w) ? -1 : 0; if (!v) return; const f = FLIP.has(toks[i - 1]) || FLIP.has(toks[i - 2]); s0 += f ? -v : v; });
      return { a, p: Math.sign(s0) };
    }
    COM.forEach(c => c.cl.forEach(z => { z.L = lex(z.toks); }));
    const all = COM.flatMap(c => c.cl), agree = all.filter(z => z.L.a === z.a && z.L.p === z.p).length / all.length;
    const missP = all.filter(z => z.L.p === 0).length / all.length, wrongA = all.filter(z => z.L.a !== z.a).length / all.length, flipP = all.filter(z => z.L.p && z.L.p !== z.p).length / all.length;
    function stat(k, m, mode) { const zs = COM.filter(c => c.m === m).flatMap(c => c.cl).filter(z => (mode === 'lex' ? z.L.a : z.a) === k); const p = zs.filter(z => (mode === 'lex' ? z.L.p : z.p) > 0).length, n = zs.filter(z => (mode === 'lex' ? z.L.p : z.p) < 0).length; return { cnt: zs.length, net: zs.length ? (p - n) / zs.length : 0, negS: zs.length ? n / zs.length : 0 }; }
    const overall = Array.from({ length: 12 }, (_, m) => { const cs = COM.filter(c => c.m === m); return S.mean(cs.map(c => Math.sign(S.sum(c.cl.map(z => z.L.p))))); });
    const overNeg = Array.from({ length: 12 }, (_, m) => { const cs = COM.filter(c => c.m === m); return cs.filter(c => S.sum(c.cl.map(z => z.L.p)) < 0).length / cs.length; });
    let selA = 2, selM = 7;
    const out = h('div');
    const colr = v => v >= 0 ? `rgba(47,125,79,${.12 + .75 * v})` : `rgba(192,57,43,${.12 + .75 * -v})`;
    function draw() {
      out.innerHTML = '';
      out.append(h('div', { class: 'kpi', style: { marginBottom: '10px' } }, kpi('留言', '1,200 則（每月 100）'), kpi('面向子句', fmt(all.length, 0) + ' 句'), kpi('詞典法完全判對', Math.round(agree * 100) + '%', agree > .8 ? 'good' : ''), kpi('整體情感（全年平均）', (S.mean(overall) >= 0 ? '+' : '') + S.mean(overall).toFixed(2))));
      const hm = h('div'); hm.append(sub('面向 × 月份的淨情感（正面 − 負面）÷ 提及數，詞典法判讀。點格子看原文。'));
      const g = h('div', { style: { display: 'grid', gridTemplateColumns: '70px repeat(12,1fr)', gap: '2px', fontSize: '12px' } });
      g.append(h('div'), ...Array.from({ length: 12 }, (_, m) => h('div', { style: { textAlign: 'center', color: 'var(--muted)' } }, (m + 1) + '月')));
      ASP.forEach((a, k) => { g.append(h('div', { style: { fontWeight: 600, alignSelf: 'center', cursor: 'pointer', color: k === selA ? C.accent : 'inherit' }, onclick: () => { selA = k; draw(); } }, a.n)); for (let m = 0; m < 12; m++) { const st = stat(k, m, 'lex'), on = k === selA && m === selM; const c0 = h('div', { title: `${a.n} ${m + 1} 月：提及 ${st.cnt}、淨情感 ${st.net.toFixed(2)}`, style: { height: '30px', borderRadius: '4px', background: colr(st.net), cursor: 'pointer', textAlign: 'center', lineHeight: '30px', fontFamily: 'var(--mono)', fontSize: '11px', outline: on ? '2px solid #1c2430' : 'none', color: Math.abs(st.net) > .55 ? '#fff' : 'var(--ink)' } }, (st.net > 0 ? '+' : '') + st.net.toFixed(1)); c0.onclick = () => { selA = k; selM = m; draw(); }; g.append(c0); } });
      hm.append(g, h('div', { style: { fontSize: '12px', color: 'var(--muted)', marginTop: '4px' } }, '紅＝負面多、綠＝正面多。7–9 月停車場施工；10 月新叫號系統上線。'));
      out.append(hm);
      const g2 = h('div', { class: 'grid2', style: { gap: '18px', alignItems: 'start', marginTop: '12px' } });
      const lcb = h('div'); lcb.append(sub(`「${ASP[selA].n}」每月負面比例：實線＝詞典法、虛線＝真實標記；灰線＝整句判為負面的留言比例`));
      const ln = (mode) => Array.from({ length: 12 }, (_, m) => [m + 1, stat(selA, m, mode).negS]);
      U.lc(lcb, [{ pts: ln('lex'), color: C.bad, w: 2.4, dots: true }, { pts: ln('true'), color: C.bad, w: 1.4, dash: '5 4' }, { pts: overNeg.map((v, m) => [m + 1, v]), color: C.gray, w: 1.6 }], { w: 460, h: 230, xmin: 1, xmax: 12, ymin: 0, ymax: 1, xl: '月份', yl: '負面比例', xt: [1, 3, 6, 9, 12], legend: [['詞典法', C.bad], ['真實', C.bad, '5 4'], ['整句', C.gray]], legW: 70 });
      const ex = h('div'); ex.append(sub(`${ASP[selA].n}・${selM + 1} 月的留言（藍＝面向詞、綠／紅＝情感詞、橘＝否定）`));
      const zs = COM.filter(c => c.m === selM).flatMap(c => c.cl).filter(z => z.L.a === selA).slice(0, 7);
      if (!zs.length) ex.append(h('div', { style: { fontSize: '13px', color: 'var(--muted)' } }, '這個月沒有被歸到這個面向的子句。'));
      zs.forEach(z => { const ok = z.L.a === z.a && z.L.p === z.p; ex.append(h('div', { style: { fontSize: '14px', padding: '4px 0', borderTop: '1px dashed var(--line)' } }, ...z.toks.map(w => span(w, ASP[selA].kw.includes(w) ? { color: C.blue, fontWeight: 700 } : POS.has(w) ? { color: C.good, fontWeight: 700 } : NEGW.has(w) ? { color: C.bad, fontWeight: 700 } : FLIP.has(w) ? { color: C.amber, fontWeight: 700 } : null)), span(`　詞典：${z.L.p > 0 ? '正' : z.L.p < 0 ? '負' : '無法判斷'}${ok ? '' : `（實際：${z.a !== z.L.a ? ASP[z.a].n + '・' : ''}${z.p > 0 ? '正' : '負'}）`}`, { fontSize: '12px', color: ok ? 'var(--muted)' : C.bad }))); });
      g2.append(lcb, ex); out.append(g2);
      const pk = Array.from({ length: 12 }, (_, m) => stat(2, m, 'lex').negS), wt = Array.from({ length: 12 }, (_, m) => stat(0, m, 'lex').negS), wtT = Array.from({ length: 12 }, (_, m) => stat(0, m, 'true').negS);
      const pc = v => Math.round(v * 100) + '%';
      out.append(note(`整句判為負面的留言比例 12 個月在 ${pc(Math.min(...overNeg))}～${pc(Math.max(...overNeg))} 之間起伏（灰線）——看得出「好像有變」，卻說不出是什麼變了。拆成面向後就清楚：停車的負面比例在 7–9 月從 ${pc(S.mean(pk.slice(0, 6)))} 升到 ${pc(S.mean(pk.slice(6, 9)))}；候診的負面比例在新叫號系統上線後從 ${pc(S.mean(wt.slice(0, 9)))} 降到 ${pc(S.mean(wt.slice(9)))}，兩件事在整體分數裡互相抵消。詞典法有 ${Math.round(agree * 100)}% 的子句完全判對，但會系統性低估抱怨：候診的真實負面比例前 9 個月是 ${pc(S.mean(wtT.slice(0, 9)))}，詞典法只抓到 ${pc(S.mean(wt.slice(0, 9)))}。錯在三種地方：沒有情感詞的抱怨（「等了兩小時」「繞了三圈才找到車位」，占 ${Math.round(missP * 100)}%）、反諷（「真有效率」被當成稱讚）、面向歸錯（「護理師解釋得很詳細」歸到服務態度、「費用沒有事先說明」歸到衛教，共 ${Math.round(wrongA * 100)}%）。點候診時間 1–9 月任一格就能找到這些句子。`));
    }
    box.append(out); draw();
  })();

  /* ====================================================================
     ③ 第 15 節：240 則衛教問答的 TF-IDF 檢索（M8 RAG 的前身）
     ==================================================================== */
  (function retrieve() {
    const box = $('#w-faq'); if (!box) return;
    const R = U.rng(1515), pick = a => a[Math.floor(R() * a.length)];
    const TOP = [
      ['糖尿病照護', '#c0392b', [() => `${pick(['飯後', '早上', '睡前'])}血糖${pick(['偏高', '超過200', '一直降不下來'])}要怎麼辦`, () => `胰島素要注射在${pick(['肚子', '手臂', '大腿'])}嗎`, () => '胰島素注射部位需要輪替嗎', () => `低血糖${pick(['發抖冒冷汗', '頭暈'])}時應該吃什麼`, () => `糖尿病可以吃${pick(['水果', '地瓜', '白飯'])}嗎`, () => '血糖機要怎麼使用與校正', () => '空腹血糖多少算正常', () => `胰島素${pick(['開封後', '出門時'])}要怎麼保存`]],
      ['傷口照護', '#b45309', [() => `傷口${pick(['紅腫', '有分泌物', '一直流湯'])}是不是感染了`, () => `傷口換藥${pick(['多久一次', '要用什麼'])}`, () => `手術傷口${pick(['可以碰水嗎', '可以洗澡嗎'])}`, () => '傷口拆線後要注意什麼', () => `傷口${pick(['癢', '痛'])}可以抓嗎`, () => '人工皮要多久換一次', () => '壓傷傷口要怎麼照顧']],
      ['跌倒預防', '#6b46c1', [() => `長輩在${pick(['浴室', '廁所', '房間'])}跌倒要怎麼預防`, () => `夜間起床${pick(['如廁', '喝水'])}怎麼避免跌倒`, () => '浴室要裝扶手和止滑墊嗎', () => `吃了${pick(['安眠藥', '降血壓藥'])}下床要注意什麼`, () => '下床前要先坐在床邊嗎', () => '跌倒後要怎麼判斷有沒有骨折', () => '病床護欄要一直拉起來嗎']],
      ['用藥安全', '#2b6cb0', [() => `${pick(['忘記吃藥', '漏吃一次藥'])}要補吃嗎`, () => `藥物可以${pick(['磨粉', '剝半'])}嗎`, () => `${pick(['降血壓藥', '抗凝血劑', '抗生素'])}可以自己停藥嗎`, () => '吃藥可以配牛奶或果汁嗎', () => '服用抗凝血劑要注意哪些食物', () => `藥物${pick(['過期', '受潮'])}還能用嗎`, () => '同時看多科要怎麼避免重複用藥']],
      ['管路照護', '#0d6b67', [() => `導尿管${pick(['尿液混濁', '漏尿', '沒有尿出來'])}怎麼辦`, () => '導尿管多久要更換一次', () => `鼻胃管灌食${pick(['前要反抽嗎', '後要躺多久'])}`, () => '鼻胃管滑出來可以自己放回去嗎', () => '導尿管可以自己拔除嗎', () => `尿袋要放在${pick(['什麼高度', '哪裡'])}`, () => '鼻胃管灌食後要怎麼沖洗管路']],
      ['術後飲食', '#7a8794', [() => `手術後${pick(['多久', '第一天'])}可以開始進食`, () => `術後可以吃${pick(['麻油雞', '海鮮', '辣的'])}嗎`, () => '開刀後要多補充蛋白質嗎', () => `術後${pick(['便秘', '脹氣'])}飲食怎麼調整`, () => '手術後傷口癒合要吃什麼', () => '術後什麼時候可以喝咖啡']]
    ];
    const DOCS = []; const seen = new Set();
    TOP.forEach(([, , tp], k) => { let tries = 0; while (DOCS.filter(d => d.k === k).length < 40 && tries < 600) { tries++; const q = pick(tp)(); const v = q + (R() < .5 ? '' : pick(['？', '呢？', '，謝謝', '（家屬詢問）', '，第一次照顧不太懂'])); if (seen.has(v)) continue; seen.add(v); DOCS.push({ k, q: v }); } });
    const SYN = [['摔倒', '跌倒'], ['滑倒', '跌倒'], ['刀口', '傷口'], ['開刀', '手術'], ['打針', '注射'], ['尿管', '導尿管'], ['吃藥', '服藥'], ['灌食管', '鼻胃管'], ['血糖高', '血糖偏高'], ['阿嬤', '長輩'], ['阿公', '長輩'], ['位置', '部位']];
    const clean = t => t.replace(/[？，。（）、！\s]/g, '');
    const bg = t => { const c = clean(t), o = []; for (let i = 0; i < c.length - 1; i++) o.push(c.slice(i, i + 2)); return o; };
    const DF = {}; DOCS.forEach(d => { d.bg = bg(d.q); new Set(d.bg).forEach(b => DF[b] = (DF[b] || 0) + 1); });
    const ND = DOCS.length, idf = b => Math.log((ND + 1) / ((DF[b] || 0) + 1)) + 1;
    const vec = bs => { const tf = {}; bs.forEach(b => tf[b] = (tf[b] || 0) + 1); const v = {}; let nn = 0; for (const b in tf) { v[b] = tf[b] * idf(b); nn += v[b] ** 2; } nn = Math.sqrt(nn) || 1; for (const b in v) v[b] /= nn; return v; };
    DOCS.forEach(d => d.v = vec(d.bg));
    const dot = (a, b) => { let s0 = 0; for (const k in a) if (b[k]) s0 += a[k] * b[k]; return s0; };
    // 2 維地圖：Gram 矩陣中心化後用冪迭代取前 2 個特徵向量
    const G = DOCS.map(a => DOCS.map(b => dot(a.v, b.v))), rm = G.map(r => S.mean(r)), gm = S.mean(rm);
    const Gc = G.map((r, i) => r.map((v, j) => v - rm[i] - rm[j] + gm));
    const eig = []; { let A = Gc.map(r => r.slice()); for (let e = 0; e < 2; e++) { let v = DOCS.map((_, i) => Math.sin(i * 1.7 + e)); let lam = 0; for (let it = 0; it < 120; it++) { const w = A.map(r => S.sum(r.map((x, j) => x * v[j]))); lam = Math.sqrt(S.sum(w.map(x => x * x))); v = w.map(x => x / lam); } eig.push({ v, lam }); A = A.map((r, i) => r.map((x, j) => x - lam * v[i] * v[j])); } }
    const XY = DOCS.map((_, i) => [eig[0].v[i] * Math.sqrt(eig[0].lam), eig[1].v[i] * Math.sqrt(eig[1].lam)]);
    const PRE = [['阿公晚上摔倒怎麼辦', 2], ['打針的位置要換嗎', 0], ['尿管多久換', 4], ['打針要打在哪', 0], ['刀口紅腫是不是發炎', 1], ['開刀後可以吃什麼', 5]];
    let q = PRE[0][0], intent = PRE[0][1], syn = false;
    const expand = t => { let o = t; SYN.forEach(([a, b]) => { if (o.includes(a) && !o.includes(b)) o += ' ' + b; }); return o; };
    const out = h('div');
    const inp = h('input', { type: 'text', value: q, style: { flex: '1', minWidth: '220px', padding: '7px 10px', border: '1px solid var(--line)', borderRadius: '6px', fontSize: '15px' } });
    inp.oninput = () => { q = inp.value; intent = -1; draw(); };
    function search(text) { const qq = syn ? expand(text) : text; const qv = vec(bg(qq)); return { qq, qv, res: DOCS.map((d, i) => ({ d, i, s: dot(qv, d.v) })).sort((a, b) => b.s - a.s) }; }
    function draw() {
      out.innerHTML = '';
      const { qq, qv, res } = search(q), top5 = res.slice(0, 5).filter(r => r.s > 0);
      const prec = intent >= 0 ? top5.filter(r => r.d.k === intent).length : null;
      const other = (() => { const o = syn; syn = !syn; const r = search(q).res.slice(0, 5).filter(z => z.s > 0); syn = o; return intent >= 0 ? r.filter(z => z.d.k === intent).length : null; })();
      out.append(h('div', { class: 'kpi', style: { marginBottom: '10px' } }, kpi('問答庫', `${ND} 則・6 類`), kpi('最高相似度', top5[0] ? top5[0].s.toFixed(2) : '0', top5[0] && top5[0].s > .3 ? 'good' : 'bad'), kpi('前 5 筆答對類別', prec == null ? '（自訂查詢）' : `${prec} / 5`, prec == null ? '' : prec >= 4 ? 'good' : prec <= 2 ? 'bad' : '')));
      const g = h('div', { class: 'grid2', style: { gap: '18px', alignItems: 'start' } });
      const mp = h('div'); mp.append(sub('240 則問答的 TF-IDF 投影到 2 維（顏色＝類別）；黑圈＝前 5 筆、★＝你的查詢'));
      const qc = (() => { const dq = DOCS.map(d => dot(qv, d.v)), mq = S.mean(dq); const c = dq.map((v, i) => v - mq - rm[i] + gm); return [0, 1].map(e => S.sum(c.map((v, i) => v * eig[e].v[i])) / Math.sqrt(eig[e].lam)); })();
      const tops = new Set(top5.map(r => r.i));
      const ch = h('div'); mp.append(ch);
      U.scatter(ch, DOCS.map((d, i) => ({ x: XY[i][0], y: XY[i][1], c: TOP[d.k][1], r: tops.has(i) ? 6 : 3.2, op: tops.has(i) ? .95 : .5, stroke: tops.has(i) ? '#1c2430' : null, title: `${TOP[d.k][0]}：${d.q}` })), { w: 440, h: 330, noGrid: true, xlabel: '主成分 1', ylabel: '主成分 2', over: [(sv, x, y) => U.s('text', { x: x(qc[0]), y: y(qc[1]) + 6, 'text-anchor': 'middle', text: '★', style: 'font-size:20px;fill:#1c2430' }, sv)] });
      mp.append(h('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '12px', marginTop: '4px' } }, ...TOP.map(t => h('span', null, h('i', { style: { display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: t[1], marginRight: '4px' } }), t[0]))));
      const rs = h('div'); rs.append(sub(syn ? `實際送出的查詢（已同義詞擴充）：${qq}` : '檢索結果（底色＝與查詢共有的字元 bigram）'));
      const qb = new Set(bg(qq));
      if (!top5.length) rs.append(h('div', { style: { fontSize: '14px', color: C.bad } }, '沒有任何一則問答和查詢有共同的兩字組合——TF-IDF 直接找不到。'));
      top5.forEach((r, n) => { const c = clean(r.d.q), marks = new Array(c.length).fill(false); for (let i = 0; i < c.length - 1; i++) if (qb.has(c.slice(i, i + 2))) { marks[i] = marks[i + 1] = true; }
        rs.append(h('div', { style: { padding: '6px 0', borderTop: '1px dashed var(--line)', fontSize: '14px' } }, h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--muted)' } }, h('span', null, h('i', { style: { display: 'inline-block', width: '9px', height: '9px', borderRadius: '50%', background: TOP[r.d.k][1], marginRight: '4px' } }), `${n + 1}. ${TOP[r.d.k][0]}`, intent >= 0 && r.d.k !== intent ? span('　✗ 類別不對', { color: C.bad }) : ''), h('span', { style: { fontFamily: 'var(--mono)' } }, '相似度 ' + r.s.toFixed(2))), h('div', null, ...[...c].map((ch0, i) => span(ch0, marks[i] ? { background: '#d5ebe8', borderRadius: '2px' } : null))))); });
      g.append(mp, rs); out.append(g);
      let msg;
      if (intent < 0) msg = 'TF-IDF 只看字面：查詢和問答要有相同的兩字組合才會被找到。試著用口語換個說法（「摔倒」「刀口」「打針」），看看相似度掉多少。';
      else if (!syn) { const hit = SYN.filter(([a]) => q.includes(a));
        if (prec > 3) msg = `前 5 筆有 ${prec} 筆是對的類別${hit.length ? `：雖然「${hit[0][0]}」在問答庫裡寫成「${hit[0][1]}」，但查詢裡其他字（${[...new Set(bg(q))].filter(b => DF[b] && DF[b] < 40).slice(0, 3).map(b => '「' + b + '」').join('')}）剛好對得上，所以還找得到` : '：這個問法剛好和問答庫用字相近'}。換一個更口語的說法再試。`;
        else if (hit.length) msg = `前 5 筆只有 ${prec} 筆是對的類別：查詢裡的${hit.map(([a]) => `「${a}」`).join('')}在問答庫裡寫成${hit.map(([, b]) => `「${b}」`).join('')}，字元完全不同，TF-IDF 看不出它們是同一件事，只能靠碰巧相同的字（例如「怎麼辦」「多久」）湊數。打開「同義詞擴充」試試——會變成 ${other} / 5。`;
        else msg = `前 5 筆只有 ${prec} 筆是對的類別：查詢和問答庫的用字差太多。TF-IDF 只認得字面上相同的兩字組合。`; }
      else msg = prec <= 2 ? `同義詞擴充後還是只有 ${prec} 筆對（擴充前 ${other} 筆）：「打」「哪」這些字到處都是，而問答庫寫的是「胰島素要注射在肚子嗎」——意思一樣、整句說法不同時，同義詞表也救不了。這就是 M7 的詞嵌入與 M8 的語意檢索（RAG）要解決的問題。` : `同義詞擴充後前 5 筆有 ${prec} 筆對（擴充前 ${other} 筆）。但同義詞表要人工維護，永遠列不完——這就是 M7 的詞嵌入與 M8 的語意檢索（RAG）要解決的問題：讓「摔倒」和「跌倒」的向量本來就很接近。`;
      out.append(note(msg, intent >= 0 && !syn && prec <= 3 ? 'warn' : ''));
    }
    const pb = h('div', { class: 'row', style: { gap: '6px', flexWrap: 'wrap', marginBottom: '8px' } }, lab('試試：'), ...PRE.map(([t, k]) => { const b = h('button', { class: 'btn sm' }, t); b.onclick = () => { q = t; intent = k; inp.value = t; draw(); }; return b; }));
    box.append(pb, h('div', { class: 'row', style: { gap: '10px', flexWrap: 'wrap', marginBottom: '10px', alignItems: 'center' } }, inp, check('同義詞擴充（摔倒→跌倒、刀口→傷口…）', () => syn, v => syn = v, draw)), out); draw();
  })();
})();
