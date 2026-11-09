/* M4 加強版（2026-11）：三份有「真實感」的資料——2,000 次出院（梯度提升）、ICU 72 小時生命徵象（異常偵測）、1,200 張處方（關聯規則） */
(function () {
  'use strict';
  const { h, $, S, fmt, seg, C } = U;
  const kpi = (k, v, cls) => h('div', null, h('div', { class: 'k' }, k), h('div', { class: 'v' + (cls ? ' ' + cls : '') }, v));
  const sub = t => h('div', { style: { fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' } }, t);

  /* ====================================================================
     ① 第 6 節：梯度提升一棵一棵長出來（2,000 次出院、9 個欄位）
     ==================================================================== */
  (function gbdt() {
    const box = $('#w-gbreal'); if (!box) return;
    const R = U.rng(6060), N = 2000, F = ['年齡', '前一年住院', '住院天數', '共病數', '用藥數', '白蛋白', '護理之家', '獨居', 'eGFR'];
    const X = [], Y = [];
    for (let i = 0; i < N; i++) {
      const age = 70 + 13 * U.randn(R), prior = Math.max(0, Math.round(Math.abs(.5 + 1.2 * U.randn(R)))), los = Math.max(1, Math.round(Math.exp(1.5 + .45 * U.randn(R)))), com = Math.max(0, Math.round(1.5 + 1.2 * U.randn(R)));
      const meds = Math.max(0, Math.round(3 + com * 1.4 + 2 * U.randn(R))), alb = 3.7 + .42 * U.randn(R), nh = R() < .14 ? 1 : 0, alone = R() < .2 ? 1 : 0, egfr = Math.max(8, 75 - .5 * (age - 70) + 18 * U.randn(R));
      // 含非線性與交互作用：白蛋白低於 3.2 風險陡升；eGFR < 30 才有影響；獨居 × 高齡
      const z = -2.9 + .015 * (age - 70) + .45 * Math.min(prior, 4) + .05 * (los - 5) + .15 * com + (alb < 3.2 ? 1.0 : 0) + (egfr < 30 ? .8 : 0) + .6 * nh + (alone && age > 80 ? .9 : 0) + .4 * U.randn(R);
      X.push([age, prior, los, com, meds, alb, nh, alone, egfr]); Y.push(R() < 1 / (1 + Math.exp(-z)) ? 1 : 0);
    }
    const TRI = [], VAI = []; X.forEach((_, i) => (i % 10 < 7 ? TRI : VAI).push(i));
    // 每個欄位的候選切點（分位數）
    const CUT = F.map((_, j) => { const v = TRI.map(i => X[i][j]).sort((a, b) => a - b); return [...new Set(Array.from({ length: 15 }, (_, q) => v[Math.floor((q + 1) / 16 * v.length)]))]; });
    function regTree(idx, g, depth, imp) {
      const mean = S.mean(idx.map(i => g[i]));
      if (depth === 0 || idx.length < 60) return { leaf: true, v: mean };
      let best = null; const tot = S.sum(idx.map(i => g[i])), n = idx.length;
      F.forEach((_, j) => CUT[j].forEach(t => { let sl = 0, nl = 0; idx.forEach(i => { if (X[i][j] <= t) { sl += g[i]; nl++; } }); const nr = n - nl; if (nl < 30 || nr < 30) return; const gain = sl * sl / nl + (tot - sl) ** 2 / nr - tot * tot / n; if (!best || gain > best.gain) best = { j, t, gain }; }));
      if (!best) return { leaf: true, v: mean };
      imp[best.j] += best.gain;
      return { j: best.j, t: best.t, l: regTree(idx.filter(i => X[i][best.j] <= best.t), g, depth - 1, imp), r: regTree(idx.filter(i => X[i][best.j] > best.t), g, depth - 1, imp) };
    }
    const tp = (t, x) => { while (!t.leaf) t = x[t.j] <= t.t ? t.l : t.r; return t.v; };
    function auc(idx, F0) { const o = idx.map(i => [F0[i], Y[i]]).sort((a, b) => b[0] - a[0]); let tp0 = 0, a = 0; const P = S.sum(o.map(z => z[1])), Nn = o.length - P; o.forEach(([, y]) => { if (y) tp0++; else a += tp0; }); return a / (P * Nn); }
    function logloss(idx, F0) { return S.mean(idx.map(i => { const p = Math.min(1 - 1e-6, Math.max(1e-6, 1 / (1 + Math.exp(-F0[i])))); return -(Y[i] * Math.log(p) + (1 - Y[i]) * Math.log(1 - p)); })); }
    let lr = 0.3, depth = 3, M = 0, Fs = null, hist = [], imp = null, timer = null;
    const base = Math.log(S.mean(TRI.map(i => Y[i])) / (1 - S.mean(TRI.map(i => Y[i]))));
    function reset() { M = 0; Fs = X.map(() => base); hist = [{ m: 0, tr: logloss(TRI, Fs), va: logloss(VAI, Fs), auc: .5 }]; imp = F.map(() => 0); }
    function addTree() { const g = Fs.map((f, i) => Y[i] - 1 / (1 + Math.exp(-f))); const t = regTree(TRI, g, depth, imp); X.forEach((x, i) => { Fs[i] += lr * tp(t, x) * 2.5; }); M++; hist.push({ m: M, tr: logloss(TRI, Fs), va: logloss(VAI, Fs), auc: auc(VAI, Fs) }); }
    reset();
    const out = h('div');
    function draw() {
      out.innerHTML = '';
      const go = h('button', { class: 'btn primary' }, timer ? `長第 ${M + 1} 棵…` : M ? '▶ 再長 40 棵' : '▶ 開始，一棵一棵長'); go.disabled = !!timer || M >= 120;
      go.onclick = () => { let k = 0; timer = setInterval(() => { addTree(); k++; if (k >= 40 || M >= 120) { clearInterval(timer); timer = null; } draw(); }, 60); draw(); };
      const rs = h('button', { class: 'btn sm' }, '重來'); rs.disabled = !!timer; rs.onclick = () => { reset(); draw(); };
      out.append(h('div', { class: 'row', style: { gap: '10px', flexWrap: 'wrap', marginBottom: '10px' } }, go, rs,
        h('span', { style: { fontSize: '13px', color: 'var(--muted)' } }, '學習率'), seg([[0.1, '0.1'], [0.3, '0.3'], [1.0, '1.0（太大）']], () => lr, v => { if (!timer) { lr = v; reset(); } }, draw),
        h('span', { style: { fontSize: '13px', color: 'var(--muted)' } }, '每棵深度'), seg([[1, '1（樁）'], [3, '3'], [6, '6']], () => depth, v => { if (!timer) { depth = v; reset(); } }, draw)));
      const bestV = hist.reduce((m, z) => z.va < m.va ? z : m, hist[0]);
      out.append(h('div', { class: 'kpi', style: { marginBottom: '10px' } }, kpi('已長的樹', M + ' 棵'), kpi('驗證集 AUC', (hist[hist.length - 1].auc || .5).toFixed(3), 'good'), kpi('驗證損失最低點', bestV.m ? `第 ${bestV.m} 棵` : '—'), kpi('目前比最低點差', hist.length > 1 ? fmt((hist[hist.length - 1].va - bestV.va) * 1000, 1) + '‰' : '—', hist[hist.length - 1].va - bestV.va > .003 ? 'bad' : '')));
      const g = h('div', { class: 'grid2', style: { gap: '18px', alignItems: 'start' } });
      const lc = h('div'); lc.append(sub('損失（log loss）隨棵數的變化：訓練一路下降，驗證會在某處開始回升'));
      const ys = hist.flatMap(z => [z.tr, z.va]);
      U.lc(lc, [{ pts: hist.map(z => [z.m, z.tr]), color: C.gray, w: 2 }, { pts: hist.map(z => [z.m, z.va]), color: C.accent, w: 2.4 }], { w: 460, h: 260, xmin: 0, xmax: Math.max(40, M), ymin: Math.min(...ys) * .97, ymax: Math.max(...ys) * 1.01, xl: '樹的棵數', yl: 'log loss', legend: [['訓練', C.gray], ['驗證', C.accent]], marks: bestV.m ? [{ x: bestV.m, color: C.bad, label: '早停點' }] : [] });
      const im = h('div'); im.append(sub('特徵重要性（所有樹的分裂增益加總）'));
      const tot = S.sum(imp) || 1;
      const items = F.map((n, j) => ({ n, v: imp[j] / tot })).sort((a, b) => b.v - a.v);
      const gg = h('div', { style: { display: 'grid', gridTemplateColumns: '84px 1fr 46px', gap: '5px 8px', alignItems: 'center', fontSize: '12.5px' } });
      items.forEach(it => gg.append(h('div', { style: { textAlign: 'right' } }, it.n), h('div', { style: { background: '#efece5', borderRadius: '4px' } }, h('i', { style: { display: 'block', height: '15px', borderRadius: '4px', background: C.blue, width: (it.v * 100 / (items[0].v || 1)) + '%', transition: 'width .3s' } })), h('div', { style: { fontFamily: 'var(--mono)' } }, Math.round(it.v * 100) + '%')));
      im.append(gg); g.append(lc, im); out.append(g);
      let msg = '按開始，看驗證損失（綠線）先降後升的那個轉折——那就是早停點。';
      if (M >= 20) msg = lr >= 1 ? '學習率 1.0：前幾棵就把訓練損失壓下去，但驗證損失很快就回升——每一步走太大，記住了雜訊。' : depth === 6 ? '每棵深度 6：單棵樹本身就很複雜，沒長幾棵就開始過擬合。GBDT 的精神是「很多棵淺樹」。' : `學習率 ${lr}、深度 ${depth}：驗證損失在第 ${bestV.m} 棵左右最低，之後的樹只是在記住訓練集——實務上就用早停。重要性前三名是 ${items.slice(0, 3).map(i => i.n).join('、')}。注意兩件事：白蛋白 < 3.2、eGFR < 30 才陡升的「門檻效應」是樹模型比 Logistic 擅長抓的；而年齡這種切點很多的連續欄位，分裂增益型的重要性容易被高估（M9 會談更穩健的 permutation importance）。`;
      out.append(h('div', { class: 'note', style: { marginTop: '10px' } }, h('b', null, '看懂了什麼：'), msg));
    }
    box.append(out); draw();
  })();

  /* ====================================================================
     ② 第 9 節：ICU 72 小時生命徵象回放
     ==================================================================== */
  (function icu() {
    const box = $('#w-icu'); if (!box) return;
    const R = U.rng(909), T = 432; // 每 10 分鐘一筆
    const HR = [], SP = [], RR = [];
    for (let t = 0; t < T; t++) {
      const hour = (t / 6) % 24, night = hour < 6 || hour > 22;
      let hr = 82 + (night ? -8 : 0) + 4 * Math.sin(t / 9) + 3 * U.randn(R), sp = 96.5 + .7 * U.randn(R), rr = 17 + (night ? -1.5 : 0) + 1.2 * U.randn(R);
      if (t >= 300 && t < 372) { const k = (t - 300) / 72; hr += 30 * k; rr += 9 * k; sp -= 2.5 * k; }   // 敗血症前兆：緩慢惡化 12 小時
      if (t === 120) sp = 71;                                                      // 血氧夾脫落：單點偽訊號
      if (t >= 200 && t < 206) hr += 25;                                           // 抽痰／翻身：短暫上升
      if (t >= 30 && t < 40) { hr += 18; }                                         // 半夜心搏偏快（情境異常：白天正常的值，夜裡不尋常）
      HR.push(hr); SP.push(sp); RR.push(rr);
    }
    const EV = [
      { name: '血氧夾脫落（偽訊號）', a: 120, b: 121, kind: '點異常', color: C.amber },
      { name: '夜間心搏偏快', a: 30, b: 40, kind: '情境異常', color: '#7b3fa8' },
      { name: '抽痰／翻身', a: 200, b: 206, kind: '可預期的短暫變化', color: C.gray },
      { name: '敗血症前兆：12 小時緩慢惡化', a: 300, b: 372, kind: '集體異常（趨勢）', color: C.bad }];
    // 偵測器
    const z = a => { const m = S.mean(a.slice(0, 200)), s = S.sd(a.slice(0, 200)); return a.map(v => (v - m) / s); };
    const zH = z(HR), zS = z(SP), zR = z(RR);
    const CUS = []; { let c = 0; for (let t = 0; t < T; t++) { const v = Math.min(1.5, (zH[t] + zR[t] - zS[t]) / 3); c = Math.max(0, c + v - 0.3); if (Math.abs(zS[t]) > 6) c = 0; CUS.push(c); } }
    const isNight = t => { const hr = (t / 6) % 24; return hr < 6 || hr > 22; };
    const BL = { n: null, d: null }; ['n', 'd'].forEach(k => { const v = HR.filter((_, t) => t >= 44 && t < 200 && (k === 'n') === isNight(t)); BL[k] = { m: S.mean(v), s: S.sd(v) }; });
    const DET = {
      fixed: { name: '固定閾值（HR>120、SpO₂<90、RR>28）', f: t => HR[t] > 120 || SP[t] < 90 || RR[t] > 28 },
      zs: { name: '單變量 Z 分數 |z|>3', f: t => Math.abs(zH[t]) > 3 || Math.abs(zS[t]) > 3 || Math.abs(zR[t]) > 3 },
      ctx: { name: '依時段的基線（夜間另算）', f: t => { const k = isNight(t) ? 'n' : 'd'; return t >= 2 && [t, t - 1, t - 2].every(u => (HR[u] - BL[isNight(u) ? 'n' : 'd'].m) / BL[isNight(u) ? 'n' : 'd'].s > 2.2) || SP[t] < 90; } },
      trend: { name: 'CUSUM 累積和（抓緩慢偏移）', f: t => CUS[t] > 10 },
    };
    let det = 'fixed', cur = T, timer = null;
    const out = h('div');
    function draw() {
      out.innerHTML = '';
      const go = h('button', { class: 'btn primary' }, timer ? '播放中…' : '▶ 從頭播放 72 小時'); go.disabled = !!timer;
      go.onclick = () => { cur = 0; timer = setInterval(() => { cur = Math.min(T, cur + 6); if (cur >= T) { clearInterval(timer); timer = null; } draw(); }, 50); draw(); };
      out.append(h('div', { class: 'row', style: { gap: '10px', flexWrap: 'wrap', marginBottom: '10px' } }, go, h('span', { style: { fontSize: '13px', color: 'var(--muted)' } }, '偵測方法：'), seg(Object.entries(DET).map(([k, d]) => [k, d.name]), () => det, v => det = v, draw)));
      const flags = []; for (let t = 0; t < cur; t++) if (DET[det].f(t)) flags.push(t);
      const caught = EV.map(e => flags.find(t => t >= e.a && t < e.b + 6));
      const fa = flags.filter(t => !EV.some(e => t >= e.a && t < e.b + 6)).length;
      // 三條線
      const chart = h('div'); out.append(chart);
      const W = 920, Hh = 330, ml = 60, sv = U.svgBox(chart, W, Hh), x = U.scale(0, T, ml, W - 10);
      const rows = [['心跳 HR', HR, 50, 140, C.bad], ['血氧 SpO₂', SP, 68, 100, C.blue], ['呼吸 RR', RR, 8, 36, C.accent]];
      EV.forEach(e => U.s('rect', { x: x(e.a), y: 4, width: Math.max(3, x(e.b) - x(e.a)), height: Hh - 30, fill: e.color, opacity: .1 }, sv));
      for (let d = 0; d <= 3; d++) { U.s('line', { x1: x(d * 144), x2: x(d * 144), y1: 4, y2: Hh - 26, stroke: '#e2ddd2' }, sv); U.s('text', { x: x(d * 144), y: Hh - 10, 'text-anchor': 'middle', text: `第 ${d * 24} 小時`, style: 'font-size:11px;fill:#8a929c' }, sv); }
      rows.forEach(([n, a, lo, hi, col], k) => { const y0 = 8 + k * 100, y = U.scale(lo, hi, y0 + 90, y0);
        U.s('text', { x: ml - 6, y: y0 + 48, 'text-anchor': 'end', text: n, style: `font-size:11.5px;fill:${col};font-weight:600` }, sv);
        U.s('polyline', { points: a.slice(0, cur).map((v, t) => `${x(t)},${y(Math.max(lo, Math.min(hi, v)))}`).join(' '), fill: 'none', stroke: col, 'stroke-width': 1.4 }, sv); });
      flags.forEach(t => U.s('line', { x1: x(t), x2: x(t), y1: Hh - 28, y2: Hh - 22, stroke: C.ink, 'stroke-width': 2 }, sv));
      if (cur < T) U.s('line', { x1: x(cur), x2: x(cur), y1: 0, y2: Hh - 26, stroke: C.ink, 'stroke-width': 1.5 }, sv);
      out.append(h('div', { class: 'ai' }, '底部黑色刻痕＝這個方法發出警示的時間點；淡色底＝實際發生的四件事。'));
      const tb = h('table', { class: 'dt', style: { fontSize: '13px', marginTop: '8px' } }, h('tr', null, ['事件', '型態', '該不該警示', '這個方法'].map(t => h('th', null, t))));
      EV.forEach((e, i) => { const should = i !== 2 && i !== 0; const got = caught[i] != null && caught[i] < cur;
        const lag = got ? Math.round((caught[i] - e.a) * 10) : null;
        tb.append(h('tr', null, h('td', null, h('span', { style: { color: e.color, fontWeight: 700 } }, '■ '), e.name), h('td', null, e.kind), h('td', null, i === 0 ? '要處理，但不是病人變差（檢查探頭）' : should ? '要' : '不需要'),
          h('td', { class: got ? (should || i === 0 ? 'ok' : 'miss') : (should && cur >= e.b ? 'miss' : null) }, cur < e.a ? '（還沒發生）' : got ? `抓到${lag > 0 ? `（事件開始後 ${lag} 分鐘）` : ''}` : '沒抓到'))); });
      out.append(h('div', { class: 'tscroll' }, tb), h('div', { class: 'kpi', style: { marginTop: '10px' } }, kpi('總警示次數', flags.length), kpi('與事件無關的警示', fa, fa > 5 ? 'bad' : '')));
      const firstOf3 = () => { let best = null; Object.entries(DET).forEach(([k, d]) => { for (let t = EV[3].a; t < EV[3].b + 6; t++) if (d.f(t)) { if (!best || t < best.t) best = { k, t }; break; } }); return best && best.k; };
      const got = i => caught[i] != null && caught[i] < cur, lagOf = i => Math.round((caught[i] - EV[i].a) * 10 / 60 * 10) / 10;
      const msg = cur < T ? '播放中…看黑色刻痕在哪裡出現。' : {
        fixed: `固定閾值只在數值「已經很糟」時才響${got(3) ? `：敗血症前兆在開始後 ${lagOf(3)} 小時才抓到` : '：敗血症前兆的心跳最高 115 左右、沒有跨過 120，到最後都沒有警示'}；夜間心搏偏快也沒有反應——92 下在白天是正常的。它唯一抓到的是血氧夾脫落，那還不是病人變差。`,
        zs: `Z 分數比固定閾值敏感${got(3) ? `，敗血症前兆在開始後 ${lagOf(3)} 小時抓到` : ''}，也會被抽痰時的短暫上升觸發——警示疲勞就是這樣來的。單看每個點，看不出「慢慢變壞」，也分不出白天和夜裡。`,
        ctx: `把夜間和白天分開算基線之後，半夜的心搏偏快${got(1) ? '終於被抓到了' : '仍然沒抓到'}——情境異常的關鍵是「跟同一個情境比」，而不是跟全體比。但它對緩慢惡化${got(3) ? `要到開始後 ${lagOf(3)} 小時才反應` : '一樣沒反應'}。`,
        trend: `CUSUM 把「每一點比平常高一點點」的偏差累加起來，小而持續的變化會越積越大：敗血症前兆${got(3) ? `在開始後 ${lagOf(3)} 小時就被抓到${firstOf3() === 'trend' ? '，是四種方法裡最早的' : ''}` : '還是沒抓到'}；單點的偽訊號與短暫變化累積不起來，不會亂響。代價是抓不到瞬間事件——所以實務上會多種方法一起用，各自負責不同型態的異常。` }[det];
      out.append(h('div', { class: 'note', style: { marginTop: '10px' } }, h('b', null, '看懂了什麼：'), msg));
    }
    box.append(out); draw();
  })();

  /* ====================================================================
     ③ 第 13 節：1,200 張處方挖關聯規則
     ==================================================================== */
  (function rx() {
    const box = $('#w-rx'); if (!box) return;
    const R = U.rng(1313), N = 1200;
    const D = ['Metformin', 'Statin', 'ACEI/ARB', '利尿劑', 'Aspirin', 'PPI', 'NSAID', '制酸劑', 'Warfarin', '鎮靜安眠', '抗憂鬱', '維他命', '止咳藥', '抗組織胺', 'Insulin'];
    const TX = [];
    for (let i = 0; i < N; i++) {
      const s = new Set(); const p = (n, q) => { if (R() < q) s.add(n); };
      const dm = R() < .22, htn = R() < .30, cad = R() < .10, pain = R() < .14, uri = R() < .12, af = R() < .03, psy = R() < .08;
      if (dm) { s.add('Metformin'); p('Statin', .7); p('Insulin', .18); }
      if (htn) { s.add('ACEI/ARB'); p('利尿劑', .45); p('Statin', .3); }
      if (cad) { s.add('Aspirin'); p('Statin', .8); p('PPI', .5); }
      if (pain) { s.add('NSAID'); p('PPI', .35); }
      if (uri) { s.add('止咳藥'); p('抗組織胺', .6); }
      if (af) { s.add('Warfarin'); p('NSAID', .15); }
      if (psy) { p('抗憂鬱', .7); p('鎮靜安眠', .5); }
      p('制酸劑', .55);              // 幾乎每張都開：lift 陷阱
      p('維他命', .06); p('鎮靜安眠', .05);
      if (s.size) TX.push([...s]);
    }
    const n = TX.length, cnt = {}; TX.forEach(t => t.forEach(d => cnt[d] = (cnt[d] || 0) + 1));
    const pair = {}; TX.forEach(t => { for (let i = 0; i < t.length; i++) for (let j = 0; j < t.length; j++) if (i !== j) { const k = t[i] + '→' + t[j]; pair[k] = (pair[k] || 0) + 1; } });
    const RULES = Object.entries(pair).map(([k, c]) => { const [a, b] = k.split('→'); const sup = c / n, conf = c / cnt[a], lift = conf / (cnt[b] / n); return { a, b, c, sup, conf, lift }; });
    const NOTE = { 'Metformin→Statin': '糖尿病合併高血脂，符合治療指引', 'Aspirin→PPI': '預防阿斯匹靈造成腸胃出血——合理的保護性處方', 'NSAID→PPI': '止痛藥合併胃保護', 'ACEI/ARB→利尿劑': '高血壓常見的併用組合', '止咳藥→抗組織胺': '上呼吸道感染的「套餐」', 'Warfarin→NSAID': '⚠ 出血風險升高的交互作用——這是要警示的組合，不是要推薦的', '抗憂鬱→鎮靜安眠': '情緒與睡眠問題常一起處理' };
    let minS = .02, minC = .3, sortBy = 'lift', sel = null;
    const out = h('div');
    function draw() {
      out.innerHTML = '';
      out.append(h('div', { class: 'row', style: { gap: '14px', flexWrap: 'wrap', marginBottom: '8px' } },
        U.slider('最小 support', .005, .1, .005, () => minS, v => { minS = +v; sel = null; }, draw, v => (+v).toFixed(3)),
        U.slider('最小 confidence', .1, .9, .05, () => minC, v => { minC = +v; sel = null; }, draw, v => (+v).toFixed(2)),
        h('span', { style: { fontSize: '13px', color: 'var(--muted)' } }, '排序'), seg([['conf', 'confidence'], ['lift', 'lift ★']], () => sortBy, v => sortBy = v, draw)));
      const rs = RULES.filter(r => r.sup >= minS && r.conf >= minC).sort((a, b) => b[sortBy] - a[sortBy]);
      out.append(h('div', { class: 'kpi', style: { marginBottom: '10px' } }, kpi('處方張數', n.toLocaleString()), kpi('藥品種類', D.length), kpi('通過門檻的規則', rs.length), kpi('其中 lift < 1', rs.filter(r => r.lift < 1).length, rs.some(r => r.lift < 1) ? 'bad' : '')));
      const g = h('div', { class: 'grid2', style: { gap: '18px', alignItems: 'start' } });
      const sc = h('div'); sc.append(sub('每個點是一條規則：橫軸 support、縱軸 confidence、大小與顏色是 lift（點一下看說明）'));
      const all = RULES.filter(r => r.c >= 5);
      U.scatter(sc, all.map(r => { const ok = r.sup >= minS && r.conf >= minC; return { x: r.sup, y: r.conf, r: Math.min(10, 2 + r.lift * 1.6), c: !ok ? '#d6d1c6' : r.lift >= 1.5 ? C.good : r.lift >= 1 ? C.amber : C.bad, op: ok ? .8 : .5, stroke: sel && r.a === sel.a && r.b === sel.b ? C.ink : null }; }),
        { w: 440, h: 320, xmin: 0, xmax: .35, ymin: 0, ymax: 1, xlabel: 'support', ylabel: 'confidence',
          over: [(sv, x, y) => { U.s('line', { x1: x(minS), x2: x(minS), y1: y(0), y2: y(1), stroke: C.ink, 'stroke-dasharray': '4 3' }, sv); U.s('line', { x1: x(0), x2: x(.35), y1: y(minC), y2: y(minC), stroke: C.ink, 'stroke-dasharray': '4 3' }, sv);
            all.forEach(r => { const c = U.s('circle', { cx: x(r.sup), cy: y(r.conf), r: 9, fill: 'transparent', style: 'cursor:pointer' }, sv); c.addEventListener('click', () => { sel = r; draw(); }); }); }] });
      sc.append(h('div', { class: 'row', style: { gap: '12px', fontSize: '12px', color: 'var(--muted)' } }, ...[[C.good, 'lift ≥ 1.5'], [C.amber, '1–1.5'], [C.bad, '< 1（負相關）'], ['#d6d1c6', '沒通過門檻']].map(([c, t]) => h('span', null, h('i', { style: { display: 'inline-block', width: '9px', height: '9px', borderRadius: '50%', background: c, marginRight: '4px' } }), t))));
      const tb = h('table', { class: 'dt', style: { fontSize: '12.5px' } }, h('tr', null, ['規則', 'support', 'conf', 'lift'].map(t => h('th', null, t))));
      rs.slice(0, 10).forEach(r => { const tr = h('tr', { style: { cursor: 'pointer', background: sel === r ? 'var(--accent-soft)' : r.lift < 1 ? 'var(--bad-soft)' : null } }, h('td', null, `${r.a} → ${r.b}`), h('td', { style: { fontFamily: 'var(--mono)' } }, r.sup.toFixed(3)), h('td', { style: { fontFamily: 'var(--mono)' } }, r.conf.toFixed(2)), h('td', { style: { fontFamily: 'var(--mono)', fontWeight: 700, color: r.lift >= 1.5 ? C.good : r.lift < 1 ? C.bad : C.amber } }, r.lift.toFixed(2))); tr.onclick = () => { sel = r; draw(); }; tb.append(tr); });
      g.append(sc, h('div', null, sub(`排序後前 10 條（共 ${rs.length} 條）`), h('div', { class: 'tscroll' }, tb))); out.append(g);
      if (sel) {
        const k = sel.a + '→' + sel.b, why = NOTE[k] || (sel.b === '制酸劑' ? `制酸劑出現在 ${Math.round(cnt['制酸劑'] / n * 100)}% 的處方裡——任何藥 → 制酸劑的 confidence 都很高，但 lift ≈ 1，代表沒有真的關聯。` : sel.lift < 1 ? '負相關：一起出現的機會比隨機還低，通常代表兩種病人族群不同。' : sel.c < 15 ? `只出現在 ${sel.c} 張處方——lift 再高也可能是巧合，support 門檻就是用來擋這種規則的。` : '沒有預先寫好的解讀——請用你的臨床知識判斷：這是治療指引、處方習慣，還是巧合？');
        out.append(h('div', { class: 'note' + (sel.lift < 1 || /⚠/.test(why) ? ' warn' : ''), style: { marginTop: '10px' } }, h('b', null, `${sel.a} → ${sel.b}：`), `${sel.c} 張處方同時有這兩種藥；開了 ${sel.a} 的處方中 ${Math.round(sel.conf * 100)}% 也有 ${sel.b}（lift ${sel.lift.toFixed(2)}）。`, h('br'), why));
      } else out.append(h('div', { class: 'note', style: { marginTop: '10px' } }, h('b', null, '看懂了什麼：'), sortBy === 'conf' ? '依 confidence 排，前面擠滿了「→ 制酸劑」——因為它幾乎每張處方都有。切到 lift 排序，真正有臨床意義的組合（Metformin → Statin、Aspirin → PPI）才浮上來。' : '依 lift 排，前面是真的有關聯的組合。點任一條規則看解讀；也試試把 support 拉到最低，看會冒出哪些「高 lift、但只出現幾次」的可疑規則。'));
    }
    box.append(out); draw();
  })();
  /* ====================================================================
     第 06 節：表格資料選模型（Grinsztajn 2022；TabPFN, Nature 2025；TabPFN-2.5, 2025/11）（2026-11-09 新增）
     ==================================================================== */
  (function tabsel() {
    const box = $('#w-tabsel'); if (!box) return;
    const lab = t => h('span', { style: { fontSize: '13px', color: 'var(--muted)' } }, t);
    const note = msg => h('div', { class: 'note', style: { marginTop: '10px' } }, h('b', null, '看懂了什麼：'), msg);
    const kpi = (k, v, cls) => h('div', null, h('div', { class: 'k' }, k), h('div', { class: 'v' + (cls ? ' ' + cls : '') }, v));
    let lg = 3, feat = 20, explain = 'some', gpu = 'no'; const res = h('div');
    const nOf = v => Math.round(Math.pow(10, v));
    function draw() {
      res.innerHTML = '';
      const n = nOf(lg), rows = [];
      rows.push(['Logistic 迴歸（正則化）', 'good', '永遠要做的基準：可解釋、係數可報告勝算比；若它已經夠好，就不必更複雜（M2-2）']);
      rows.push(['GBDT（XGBoost／LightGBM／AI Studio 的 GBT）', 'good', n >= 1000 ? '約 1 萬筆上下的表格資料，樹模型在 45 個資料集的大規模比較中仍勝過深度學習；成熟、快、AI Studio 內建' : '樣本少時容易過擬合，要調小學習率、限制深度並用交叉驗證；仍是必比的強基準']);
      const pfnOK = n <= 50000 && feat <= 2000, pfnV2 = n <= 10000 && feat <= 500;
      rows.push(['TabPFN（表格基礎模型）', pfnOK ? (gpu === 'yes' ? 'good' : 'amber') : 'bad',
        !pfnOK ? `超出設計範圍（TabPFN‑2.5 為 5 萬筆、2,000 欄以內）——這個規模先用 GBDT` :
        (pfnV2 ? '正是它的主場：1 萬筆、500 欄以內，論文中 2.8 秒勝過調參 4 小時的基準集成' : '在 TabPFN‑2.5 的範圍內（5 萬筆、2,000 欄），原廠報告與調參 4 小時的 AutoGluon 相當') +
        (gpu === 'yes' ? '；有 GPU 可在本機跑，資料不必上雲' : '；沒有 GPU 時本機會很慢，雲端 API 又要評估資料能不能出院——醫療資料這點常是關卡')]);
      rows.push(['深度學習 MLP', n >= 100000 ? 'amber' : 'bad', n >= 100000 ? '資料量很大時才有機會追上；仍要和 GBDT 在同一切分下比較（M5）' : '在這個規模的表格資料上很少贏過樹模型，不建議當主力']);
      if (explain === 'must') rows.forEach(r => { if (/TabPFN|MLP|GBDT/.test(r[0])) r[2] += '。需要逐筆解釋時，要額外配 SHAP 並給臨床人員看得懂的說明（M9）'; });
      const col = { good: 'var(--good-soft)', amber: 'var(--amber-soft)', bad: 'var(--bad-soft)' }, tag = { good: '建議比較', amber: '可試，注意條件', bad: '不建議' };
      res.append(h('div', { style: { display: 'grid', gap: '6px', marginTop: '10px' } }, ...rows.map(([m, c, why]) => h('div', { style: { background: col[c], borderRadius: '8px', padding: '8px 12px' } }, h('b', null, m), h('span', { class: 'tag gray', style: { marginLeft: '8px' } }, tag[c]), h('div', { style: { fontSize: '13.5px', marginTop: '2px' } }, why)))));
      res.append(note(`你的條件：${fmt(n, 0)} 筆 × ${feat} 欄。不管選哪個模型，評估規則都一樣——同一切分、同一指標、先贏過 Logistic 這個最簡單的基準；新方法是「多一個值得比較的對手」，不是跳過比較的理由。${explain === 'must' ? '你勾了「每筆都要能解釋」：Logistic 的係數最直接，其餘模型要靠 SHAP 等事後解釋。' : ''}`));
    }
    box.append(h('div', { class: 'row' }, U.slider('樣本數', 2, 5.3, 0.1, () => lg, v => lg = v, draw, v => fmt(nOf(+v), 0) + ' 筆'), U.slider('欄位數', 5, 3000, 5, () => feat, v => feat = v, draw, v => v + ' 欄')),
      h('div', { class: 'row', style: { marginTop: '6px' } }, lab('逐筆解釋'), seg([['some', '整體說得清楚就好'], ['must', '每筆都要能解釋']], () => explain, v => explain = v, draw), lab('GPU'), seg([['no', '沒有'], ['yes', '有']], () => gpu, v => gpu = v, draw)), res); draw();
  })();
})();
