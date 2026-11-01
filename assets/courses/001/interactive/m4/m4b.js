/* M4 互動頁 B：PART 09–20（異常、關聯、時間序列、校準、代價、實作、作業） */
(function () {
  'use strict';
  const { h, $, S, fmt, C, rng, randn, seg, slider, check, Store } = U;
  const { cap, COL, row, lbl, nt, ttl, lc, invNorm } = window.M4;
  const kpi = (...a) => h('div', { class: 'kpi' }, ...a.map(([k, v, c]) => h('div', null, h('div', { class: 'k' }, k), h('div', { class: 'v ' + (c || '') }, v))));
  const dl = (name, csv) => { const a = h('a', { href: URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })), download: name }); document.body.append(a); a.click(); a.remove(); };
  const tbl = (head, rows, o = {}) => h('div', { class: 'tscroll' }, h('table', { class: 'dt' }, h('tr', null, head.map(c => h('th', null, c))), rows.map(r => h('tr', null, r.map((v, j) => v instanceof Node ? h('td', null, v) : h('td', { class: typeof v === 'number' ? 'num' : '', style: { fontWeight: j || o.plain ? 400 : 600 } }, v))))));

  // ================= P09 三種異常 =================
  (function () {
    const r = rng(909), base = Array.from({ length: 120 }, (_, t) => 36.8 + .28 * Math.sin(2 * Math.PI * (t - 6) / 24) + (t >= 48 && t < 72 ? .85 : 0) + .12 * randn(r));
    const SC = {
      point: { name: '① 點異常', y: base.map((v, t) => t === 61 ? 40.8 : v), truth: t => t === 61, desc: '第 61 小時體溫突然 40.8°C（術後第一天體溫本來就會略高，但不會到這樣）。' },
      ctx: { name: '② 情境異常', y: base.map((v, t) => t >= 48 && t < 72 ? 36.25 + .08 * Math.sin(t) : (v)), post: [48, 72], truth: t => t >= 48 && t < 72, desc: '第 48–72 小時是術後第一天，這段期間病人通常體溫偏高（37.2–38.2°C），他卻一直 36.2°C 左右。' },
      coll: { name: '③ 集體異常', y: base.map((v, t) => t >= 70 && t < 95 ? 36.9 : v), truth: t => t >= 70 && t < 95, desc: '第 70–95 小時連續 25 小時數值完全不動——訊號僵住（感測器脫落或傳輸卡住）。' } };
    let sc = 'point', on = { g: true, c: false, f: false }; const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; const D = SC[sc], y = D.y, m = S.mean(y), sd = S.sd(y);
      const fG = y.map(v => Math.abs(v - m) > 3 * sd), fC = y.map((v, t) => t >= 48 && t < 72 && (v < 37.2 || v > 38.2)), fF = y.map((_, t) => { const w = y.slice(Math.max(0, t - 3), t + 3); return w.length >= 5 && S.sd(w) < .02; });
      const flags = [['g', '全域 3σ', fG, C.bad], ['c', '情境規則（術後第一天應 37.2–38.2）', fC, C.amber], ['f', '6 小時滾動標準差 < 0.02', fF, C.blue]];
      const b = h('div'); lc(b, [{ pts: y.map((v, t) => [t, v]), color: '#7b8590', w: 1.4 }], { w: 720, h: 260, xmin: 0, xmax: 119, ymin: 35.6, ymax: 41.2, xt: [0, 24, 48, 72, 96, 119], yt: [36, 37, 38, 39, 40, 41], xl: '小時', yl: '體溫 ℃', under: [(sv, x, yy) => { U.s('rect', { x: x(48), y: yy(41.2), width: x(72) - x(48), height: yy(35.6) - yy(41.2), fill: '#f5ecd9', opacity: .7 }, sv); U.s('text', { x: x(60), y: yy(35.6) - 6, 'text-anchor': 'middle', text: '術後第一天', style: 'font-size:11px;fill:#b45309' }, sv); U.s('line', { x1: x(0), x2: x(119), y1: yy(m + 3 * sd), y2: yy(m + 3 * sd), stroke: C.bad, 'stroke-dasharray': '5 4', opacity: on.g ? .8 : 0 }, sv); U.s('line', { x1: x(0), x2: x(119), y1: yy(m - 3 * sd), y2: yy(m - 3 * sd), stroke: C.bad, 'stroke-dasharray': '5 4', opacity: on.g ? .8 : 0 }, sv); }],
        over: [(sv, x, yy) => flags.forEach(([k, , f, c], i) => { if (!on[k]) return; f.forEach((v, t) => { if (v) U.s('circle', { cx: x(t), cy: yy(y[t]) - i * 0, r: 4.5 - i * .8, fill: 'none', stroke: c, 'stroke-width': 2 }, sv); }); })] });
      const truth = y.map((_, t) => D.truth(t)), hit = f => truth.filter((v, t) => v && f[t]).length, fp = f => f.filter((v, t) => v && !truth[t]).length, nT = truth.filter(Boolean).length;
      out.append(cap(b, 760), tbl(['偵測規則', '標出幾點', '抓到真正異常', '誤報'], flags.map(([k, n, f, c]) => [h('span', { style: { color: c, fontWeight: 700 } }, '◯ ' + n), f.filter(Boolean).length, `${hit(f)} / ${nT}`, fp(f)])),
        nt(h('span', null, D.desc, ' ', sc === 'point' ? '全域 3σ 一抓就中——點異常最容易，統計法就夠。' : sc === 'ctx' ? '全域 3σ 完全看不到：36.2°C 本身是正常值。要先建立「情境」（術後第幾天），在情境內比較才抓得到。這是實務上最有價值、也最常做錯的一類：把所有病人的數值混在一起算門檻。' : '每一點都在正常範圍，3σ 抓不到；要看一整段區間的統計特性（變異數消失）。'), sc === 'point' ? '' : 'warn')); }
    ctl.append(row(seg(Object.entries(SC).map(([k, v]) => [k, v.name]), () => sc, v => sc = v, draw), check('全域 3σ', () => on.g, v => on.g = v, draw), check('情境規則', () => on.c, v => on.c = v, draw), check('滾動標準差', () => on.f, v => on.f = v, draw)));
    $('#w-types').append(ctl, out); draw();
  })();
  $('#w-adtax').append(h('div', { class: 'concept' }, h('div', null, h('b', null, '① 統計法'), '3σ、IQR、Grubbs、時間序列殘差。假設資料服從某分布。★ 可解釋、可稽核——醫療場域的首選起點'), h('div', null, h('b', null, '② 距離／密度法'), 'kNN 距離、LOF、DBSCAN 雜訊點、Mahalanobis。★ 能抓局部異常'), h('div', null, h('b', null, '③ 模型法'), 'Isolation Forest、One-Class SVM、自編碼器（M5）、GMM。★ 高維資料主力'), h('div', null, h('b', null, '④ 監督式'), '一般分類器＋不平衡處理（M2-2）、代價敏感。★ 但異常通常沒標註')),
    tbl(['演算法', '原理', '維度', '可解釋性', '什麼時候用'], [['IQR／3σ', '統計門檻', '單變量', '★ 極高', '單一指標監測；一定要先試這個'], ['LOF', '局部密度比較', '中低維', '中', '不同密度的群體混在一起'], ['Isolation Forest', '隨機切分路徑長度', '★ 高維', '低', '特徵多、資料量大時的起點'], ['One-Class SVM', '學一個包住正常資料的邊界', '中維', '低', '正常樣態集中、資料量不大']]),
    h('p', { class: 'ai' }, '選用順序：先試統計法（最好解釋）→ 維度高或有局部結構就換密度法 → 都不行才用模型法。監督式只有在你已經有一批標好的異常案例時才能用——那通常正是你沒有的東西。'));

  // ================= P10 統計法、LOF =================
  (function () {
    const r = rng(1010), base = Array.from({ length: 29 }, () => Math.round(47 + 6 * randn(r))).concat([22]); let ext = 0; const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; const X = ext ? base.concat([ext]) : base.slice(), mu = S.mean(X), sd = S.sd(X), med = S.median(X), q1 = S.q(X, .25), q3 = S.q(X, .75), iqr = q3 - q1, mad = S.median(X.map(v => Math.abs(v - med)));
      const B = [['3σ', mu - 3 * sd, mu + 3 * sd, C.bad], ['IQR', q1 - 1.5 * iqr, q3 + 1.5 * iqr, C.amber], ['MAD（|修正 Z| > 3.5）', med - 3.5 * mad / .6745, med + 3.5 * mad / .6745, C.blue]];
      const b = h('div'), W = 720, H = 200, sv = U.svgBox(b, W, H), lo = 20, hi = Math.max(80, (ext || 0) + 5), x = U.scale(lo, hi, 40, W - 20);
      U.ticks(lo, hi, 8).forEach(t => { U.s('line', { x1: x(t), x2: x(t), y1: 10, y2: 170, class: 'grid' }, sv); U.s('text', { x: x(t), y: 188, 'text-anchor': 'middle', text: t }, sv); });
      B.forEach(([n, l, u, c], i) => { const yy = 30 + i * 22; U.s('line', { x1: x(Math.max(lo, l)), x2: x(Math.min(hi, u)), y1: yy, y2: yy, stroke: c, 'stroke-width': 6, opacity: .35 }, sv); [l, u].forEach(v => { if (v > lo && v < hi) U.s('line', { x1: x(v), x2: x(v), y1: yy - 8, y2: yy + 8, stroke: c, 'stroke-width': 2.4 }, sv); }); U.s('text', { x: x(Math.min(hi, u)) + 6, y: yy + 4, text: n, style: `font-size:11px;fill:${c};font-weight:600` }, sv); });
      const cnt = {}; X.forEach(v => { const k = Math.round(v); cnt[k] = (cnt[k] || 0) + 1; const yy = 160 - (cnt[k] - 1) * 9; const fl = B.map(([, l, u]) => v < l || v > u); U.s('circle', { cx: x(v), cy: yy, r: 4, fill: v === ext ? C.ink : C.accent, 'fill-opacity': .85, stroke: fl[1] ? C.amber : null, 'stroke-width': 2 }, sv); });
      out.append(cap(b, 740), tbl(['方法', '下界', '上界', '標出幾筆', '計算'], B.map(([n, l, u, c], i) => [h('span', { style: { color: c, fontWeight: 700 } }, n), l.toFixed(1), u.toFixed(1), X.filter(v => v < l || v > u).length, i === 0 ? `μ = ${mu.toFixed(1)}、σ = ${sd.toFixed(1)}` : i === 1 ? `Q1 = ${q1.toFixed(1)}、Q3 = ${q3.toFixed(1)}、IQR = ${iqr.toFixed(1)}` : `中位數 = ${med.toFixed(1)}、MAD = ${mad.toFixed(1)}`])),
        (() => { const f3 = v => v < mu - 3 * sd || v > mu + 3 * sd, bm = S.mean(base), bs = S.sd(base), was = 22 < bm - 3 * bs, now = f3(22), iq = 22 < q1 - 1.5 * iqr;
          return nt(ext && was && !now ? `加入 ${ext} 之後，σ 從 ${bs.toFixed(1)} 膨脹到 ${sd.toFixed(1)}，3σ 下界被推到 ${(mu - 3 * sd).toFixed(1)}——原本抓得到的 22 現在抓不到了。IQR ${iq ? '照樣抓到 22' : ''}、MAD 幾乎不動：中位數與四分位數是穩健的。` : '資料近常態且乾淨 → 3σ；不確定分布 → ★ IQR（最安全的預設，就是 M1 箱形圖的兩條鬚）；樣本少或嚴重偏斜 → MAD。資料裡有一天只有 22 次——拖動滑桿加入一筆極端值，看哪一種門檻因此漏掉它。', ext && was && !now ? 'warn' : ''); })()); }
    ctl.append(row(slider('加入一筆極端值（0＝不加）', 0, 160, 5, () => ext, v => ext = v, draw)));
    $('#w-stat').append(ctl, out); draw();
  })();
  (function () {
    const r = rng(1111), X = []; for (let i = 0; i < 80; i++) X.push([3 + .35 * randn(r), 3 + .35 * randn(r)]); for (let i = 0; i < 30; i++) X.push([7 + 1.1 * randn(r), 6.6 + 1.1 * randn(r)]); X.push([4.15, 3.3]); X.push([7.2, 4.9]); const iA = 110, iB = 111;
    const D = X.map(a => X.map(b => Math.sqrt(ML.d2(a, b))));
    const lof = k => { const nn = X.map((_, i) => D[i].map((d, j) => [d, j]).filter(p => p[1] !== i).sort((a, b) => a[0] - b[0]).slice(0, k)), kd = nn.map(l => l[k - 1][0]);
      const lrd = nn.map((l, i) => 1 / (S.mean(l.map(([d, j]) => Math.max(kd[j], d))) || 1e-9)); return { kd, L: nn.map((l, i) => S.mean(l.map(([, j]) => lrd[j])) / lrd[i]) }; };
    let k = 10; const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; const R = lof(k), top = (s) => new Set(s.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]).slice(0, 6).map(o => o[1]));
      const panel = (title, score, set, fmtv) => { const b = h('div'); U.scatter(b, X.map((p, i) => ({ x: p[0], y: p[1], c: i === iA || i === iB ? C.ink : set.has(i) ? C.bad : C.gray, r: i === iA || i === iB ? 6 : set.has(i) ? 5 : 3, op: .85 })), { w: 330, h: 290, xmin: 1, xmax: 10.5, ymin: 1, ymax: 10, noGrid: true, over: [(sv, x, y) => [[iA, 'A'], [iB, 'B']].forEach(([i, n]) => U.s('text', { x: x(X[i][0]) + 8, y: y(X[i][1]) - 6, text: `${n}：${fmtv(score[i])}`, style: 'font-size:12px;font-weight:700' }, sv))] }); return h('div', null, ttl(title), b); };
      out.append(h('div', { class: 'grid2' }, panel(`全域：第 ${k} 近鄰距離（紅＝前 6 名）`, R.kd, top(R.kd), v => v.toFixed(2)), panel('LOF：跟鄰居的密度比（紅＝前 6 名）', R.L, top(R.L), v => v.toFixed(2))),
        nt(`A 緊貼密集群卻比鄰居稀疏得多：LOF = ${R.L[iA].toFixed(2)}（明顯 > 1，異常）。B 在稀疏群裡，周圍本來就疏：LOF = ${R.L[iB].toFixed(2)}（≈ 1，正常）。全域距離法卻把稀疏群邊緣的點排在前面——同樣的距離，結論相反。LOF ≈ 1 正常；明顯 > 1 異常。`)); }
    ctl.append(row(slider('鄰居數 k', 3, 25, 1, () => k, v => k = v, draw)));
    $('#w-lof').append(ctl, out, h('p', { class: 'ai' }, 'LOF 的「局部」是跟特徵空間裡的鄰居比；臨床上「跟病人自己平常比」是個人基線，概念相近但不相同。')); draw();
  })();

  // ================= P11 評估 =================
  (function () {
    const r = rng(1212), N = 10000, A = 50, sc = [], y = []; for (let i = 0; i < N; i++) { const an = i < A; y.push(an ? 1 : 0); sc.push(an ? 2.6 + 1.1 * randn(r) : randn(r)); }
    const ord = sc.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]); const cum = []; let c = 0; ord.forEach(([, i], k) => { c += y[i]; cum.push(c); });
    let n = 50, god = false; const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; const tp = cum[n - 1], prec = tp / n, rec = tp / A, th = ord[n - 1][0];
      const Ns = [10, 20, 30, 50, 75, 100, 150, 200, 300, 500];
      const b = h('div'); lc(b, [{ pts: Ns.map(m => [m, cum[m - 1] / m]), color: C.accent, dots: true }, ...(god ? [{ pts: Ns.map(m => [m, cum[m - 1] / A]), color: C.bad, dots: true }] : [])], { w: 420, h: 240, xmin: 10, xmax: 500, ymin: 0, ymax: 1, xt: [10, 100, 200, 300, 400, 500], yfmt: t => Math.round(t * 100) + '%', xl: '每天交給專家覆核的筆數', marks: [{ x: n, color: C.amber, label: `每天 ${n} 筆`, dy: 14 }], legend: [['精確率@N', C.accent], ...(god ? [['召回率（上帝視角）', C.bad]] : [])], legW: 90 });
      out.append(h('div', { class: 'grid2', style: { alignItems: 'center' } }, cap(b, 440), h('div', null, kpi([`精確率@${n}`, (prec * 100).toFixed(0) + '%'], ['對應的分數門檻', th.toFixed(2)], ['召回率', god ? (rec * 100).toFixed(0) + '%' : '？ 不知道', god ? '' : 'bad']),
        nt(god ? `上帝視角：這一天其實有 ${A} 筆真異常。每天覆核 ${n} 筆抓到 ${tp} 筆。現實中你看不到這個數字——分母未知，所以準確率、召回率都算不出來。` : `每天 1 萬筆、專家能看 ${n} 筆，門檻就設在分數 ${th.toFixed(2)}。專家覆核後才知道其中 ${tp} 筆是真的（精確率@${n}）。設太嚴 → 漏掉真正的問題；太鬆 → 沒人看，系統形同虛設。`)))); }
    ctl.append(row(slider('專家每天能覆核幾筆', 10, 500, 10, () => n, v => n = v, draw), check('開啟上帝視角（看召回率）', () => god, v => god = v, draw)));
    $('#w-cap').append(ctl, out, h('div', { class: 'concept' }, h('div', null, h('b', null, '① 人工覆核前 N 名'), '分數最高的 50 筆交給專家，算精確率@50。最務實'), h('div', null, h('b', null, '② 注入已知異常'), '把已知案例混進資料，看抓不抓得到。可算召回率，但只對這類異常有效'), h('div', null, h('b', null, '③ 穩定性檢查'), '換參數、換時段跑，看抓到的是不是同一批（下一個互動）'), h('div', null, h('b', null, '④ 留回饋迴路'), '覆核結果回寫成標註，累積後就能改走監督式分類')));
    draw();
  })();
  (function () {
    const r = rng(1313), X = []; for (let i = 0; i < 290; i++) { const a = randn(r), b = randn(r); X.push([5 + 1.2 * a, 5 + .8 * a + .7 * b]); } [[1, 9], [9.2, 1.4], [9.4, 9.3], [.9, 1.3], [2, 8.4], [8.6, 2.2], [1.6, 5.6], [8.8, 6.2], [5, .7], [5.2, 9.5]].forEach(p => X.push(p));
    let seed = 1; const ctl = h('div'), out = h('div'); const C3 = [.01, .05, .10];
    function draw() { out.innerHTML = ''; const s1 = ML.isoPath(X, 100, seed, 128), s2 = ML.isoPath(X, 100, seed + 50, 128), top = (s, c) => new Set(s.map((v, i) => [v, i]).sort((a, b) => a[0] - b[0]).slice(0, Math.round(c * X.length)).map(o => o[1]));
      const sets = C3.map(c => top(s1, c)), sets2 = C3.map(c => top(s2, c)), jac = (a, b) => [...a].filter(x => b.has(x)).length / new Set([...a, ...b]).size;
      const g = h('div', { class: 'grid3' }); C3.forEach((c, i) => { const b = h('div'); U.scatter(b, X.map((p, j) => ({ x: p[0], y: p[1], c: sets[i].has(j) ? C.bad : C.gray, r: sets[i].has(j) ? 4.5 : 2.6, op: .85 })), { w: 280, h: 250, xmin: 0, xmax: 10, ymin: 0, ymax: 10, noGrid: true }); g.append(h('div', null, ttl(`contamination = ${c}　標出 ${sets[i].size} 筆`), b)); });
      out.append(g, tbl(['設定', '標出', '其中包含 0.01 那批的幾筆', '換一個隨機種子重跑：重疊比例'], C3.map((c, i) => [`contamination ${c}`, sets[i].size, `${[...sets[0]].filter(x => sets[i].has(x)).length} / ${sets[0].size}`, (jac(sets[i], sets2[i]) * 100).toFixed(0) + '%'])),
        nt(`contamination 直接決定抓幾筆——它不是演算法自己算出來的。最明顯的異常（0.01 那批）在三個設定裡都會出現；越往邊緣，換種子重跑的結果越不一致。三種方法或多種設定的交集，通常才是最可信的異常。`)); }
    ctl.append(row(h('button', { class: 'btn primary sm', onclick: () => { seed += 7; draw(); } }, '換隨機種子重跑')));
    $('#w-stab').append(ctl, out); draw();
  })();

  // ================= P12 關聯規則 =================
  const IT = ['止痛藥', '胃藥', '降血壓藥', '維他命'];
  const T0 = () => [[1, 1, 0, 0], [1, 1, 0, 0], [1, 1, 0, 0], [1, 1, 0, 0], [1, 1, 0, 0], [1, 1, 0, 1], [0, 1, 1, 1], [0, 1, 1, 0], [0, 1, 1, 0], [0, 0, 1, 1]];
  const TX = { T: T0(), subs: [] }; const pub = () => TX.subs.forEach(f => f());
  const sup = set => S.mean(TX.T.map(t => set.every(j => t[j]) ? 1 : 0));
  const metrics = (a, b) => { const sA = sup([a]), sB = sup([b]), sAB = sup([a, b]), conf = sA ? sAB / sA : 0; return { sA, sB, sAB, conf, lift: sB ? conf / sB : 0, lev: sAB - sA * sB, conv: conf >= 1 ? Infinity : (1 - sB) / (1 - conf) }; };
  (function () {
    let A = 0, B = 1; const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; if (A === B) B = (A + 1) % 4; const m = metrics(A, B), n = TX.T.length;
      const grid = h('table', { class: 'dt' }, h('tr', null, h('th', null, ''), TX.T.map((_, i) => h('th', { style: { textAlign: 'center' } }, 'T' + (i + 1))), h('th', null, '筆數')), IT.map((it, j) => h('tr', null, h('td', { style: { fontWeight: 600, color: j === A ? C.accent : j === B ? C.amber : '' } }, it), TX.T.map((t, i) => { const c = h('td', { style: { textAlign: 'center', cursor: 'pointer', background: t[j] ? (j === A ? '#cfe6e3' : j === B ? '#f6e3c8' : '#e8e6df') : '#fff', fontWeight: 700 } }, t[j] ? '■' : ''); c.onclick = () => { t[j] = 1 - t[j]; pub(); }; return c; }), h('td', { class: 'num' }, TX.T.filter(t => t[j]).length))));
      const L = (n2, f, v, c) => h('div', { style: { display: 'flex', gap: '10px', padding: '4px 0', borderBottom: '1px solid var(--line)', alignItems: 'baseline' } }, h('b', { style: { width: '150px', flex: 'none' } }, n2), h('span', { class: 'mono', style: { flex: 1, fontSize: '13px' } }, f), h('b', { class: 'mono', style: { color: c || 'var(--ink)', fontSize: '15px' } }, v));
      const lc2 = m.lift > 1.2 ? C.good : m.lift < 1 ? C.bad : C.amber;
      out.append(h('div', { class: 'tscroll' }, grid), h('div', { class: 'grid2', style: { marginTop: '8px' } }, h('div', null,
        L('支持度 Support', `P(A∩B) = ${Math.round(m.sAB * n)} / ${n}`, m.sAB.toFixed(2)), L('信賴度 Confidence', `P(B|A) = ${Math.round(m.sAB * n)} / ${Math.round(m.sA * n)}`, m.conf.toFixed(3)), L('★ 提升度 Lift', `P(B|A) / P(B) = ${m.conf.toFixed(3)} / ${m.sB.toFixed(2)}`, m.lift.toFixed(3), lc2), L('槓桿度 Leverage', `P(A∩B) − P(A)P(B) = ${m.sAB.toFixed(2)} − ${m.sA.toFixed(2)}×${m.sB.toFixed(2)}`, m.lev.toFixed(3)), L('確信度 Conviction', `(1 − P(B)) / (1 − P(B|A))`, Number.isFinite(m.conv) ? m.conv.toFixed(3) : '∞')),
        nt(m.lift === 0 ? 'A 與 B 從未同時出現。' : m.lift < 1 ? `lift ${m.lift.toFixed(2)} < 1：負相關——開了${IT[A]}的人，反而比較少同時開${IT[B]}。confidence ${m.conf.toFixed(2)} 看起來不低，但那只是因為${IT[B]}本來就常見（${Math.round(m.sB * 100)}%）。` : m.lift < 1.2 ? `confidence ${m.conf.toFixed(2)} 看起來很高，但 lift 只有 ${m.lift.toFixed(2)}：只比隨機好 ${Math.round((m.lift - 1) * 100)}%。${IT[B]}本來就出現在 ${Math.round(m.sB * 100)}% 的交易裡，隨便挑一個藥，它的信賴度都會很高。` : `lift ${m.lift.toFixed(2)}：比「隨機碰巧一起出現」強 ${m.lift.toFixed(1)} 倍，值得注意。但記得——關聯不是因果。`, m.lift < 1.2 ? 'warn' : ''))); }
    ctl.append(row(lbl('規則 A →'), seg(IT.map((t, i) => [i, t]), () => A, v => A = v, draw), lbl('B ='), seg(IT.map((t, i) => [i, t]), () => B, v => B = v, draw), h('button', { class: 'btn sm', onclick: () => { TX.T = T0(); pub(); } }, '↺ 講義資料')));
    TX.subs.push(draw); $('#w-rule').append(ctl, out); draw();
  })();
  (function () {
    let by = 'conf', ms = .1, ml = 0; const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; const R = []; for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) if (a !== b) { const m = metrics(a, b); if (m.sAB >= ms - 1e-9 && m.lift >= ml - 1e-9) R.push({ a, b, ...m }); }
      R.sort((x, y) => by === 'conf' ? y.conf - x.conf || y.lift - x.lift : y.lift - x.lift || y.conf - x.conf);
      const mx = Math.max(1.6, ...R.map(r => r.lift));
      const t = h('table', { class: 'dt' }, h('tr', null, ['#', '規則', 'support', 'confidence', 'lift（虛線＝1.0）', '判讀'].map(c => h('th', null, c))), R.map((r, i) => { const bar = h('div', { style: { position: 'relative', width: '150px', height: '12px', background: 'var(--line)', borderRadius: '6px' } }, h('div', { style: { width: Math.min(100, r.lift / mx * 100) + '%', height: '100%', background: r.lift < 1 ? C.bad : r.lift < 1.2 ? C.amber : C.good, borderRadius: '6px' } }), h('div', { style: { position: 'absolute', left: (1 / mx * 100) + '%', top: '-3px', bottom: '-3px', borderLeft: '2px dashed #1c2430' } }));
        return h('tr', { style: { background: r.lift < 1 && by === 'conf' && i < 5 ? 'var(--bad-soft)' : '' } }, h('td', null, i + 1), h('td', { style: { fontWeight: 600 } }, `${IT[r.a]} → ${IT[r.b]}`), h('td', { class: 'num' }, r.sAB.toFixed(2)), h('td', { class: 'num' + (by === 'conf' ? ' hl' : '') }, r.conf.toFixed(3)), h('td', null, h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } }, bar, h('span', { class: 'mono' + (by === 'lift' ? ' hl' : '') }, r.lift.toFixed(3)))), h('td', null, h('span', { class: 'tag ' + (r.lift < 1 ? 'bad' : r.lift < 1.2 ? 'amber' : 'good') }, r.lift < 1 ? '負相關' : r.lift < 1.2 ? '關聯很弱' : '值得注意'))); }));
      const trap = R.filter((r, i) => by === 'conf' && i < 5 && r.lift < 1);
      out.append(h('div', { class: 'tscroll' }, t), nt(!R.length ? '沒有規則通過門檻。' : by === 'conf' ? (trap.length ? `依 confidence 排序，前段有 ${trap.length} 條 lift < 1（紅底）——只看信賴度，會把負相關當成重要發現。` : '依 confidence 排序。改成依 lift 排序比較看看。') : '正確做法：先用 support 濾掉太罕見的 → 再用 lift 排序 → 最後才看 confidence 判斷實用性。', trap.length ? 'warn' : '')); }
    ctl.append(row(lbl('排序'), seg([['conf', '依 confidence'], ['lift', '依 lift ★']], () => by, v => by = v, draw), slider('最小 support', .1, .6, .1, () => ms, v => ms = v, draw, v => (+v).toFixed(1)), slider('最小 lift', 0, 1.4, .1, () => ml, v => ml = v, draw, v => (+v).toFixed(1))));
    TX.subs.push(draw); $('#w-rank').append(ctl, out); draw();
  })();

  // ================= P13 Apriori =================
  (function () {
    let ms = .3; const ctl = h('div'), out = h('div');
    const combos = (arr, k) => k === 0 ? [[]] : arr.flatMap((v, i) => combos(arr.slice(i + 1), k - 1).map(c => [v, ...c]));
    function draw() { out.innerHTML = ''; const n = TX.T.length, levels = []; let freq = IT.map((_, j) => [j]).filter(() => true), scans = 0, cands = IT.map((_, j) => [j]);
      for (let k = 1; k <= 4 && cands.length; k++) { scans++; const lv = cands.map(c => ({ c, s: sup(c), ok: sup(c) >= ms - 1e-9 })); const F = lv.filter(x => x.ok).map(x => x.c), pr = [];
        const items = [...new Set(F.flat())].sort(), next = []; combos(items, k + 1).forEach(c => { const subs = combos(c, k), bad = subs.find(s => !F.some(f => f.join() === s.join())); if (bad) pr.push({ c, bad }); else next.push(c); });
        levels.push({ k, lv, pr }); cands = next; }
      const chip = (c, txt, st) => h('span', { style: { display: 'inline-block', margin: '3px', padding: '4px 9px', borderRadius: '8px', fontSize: '13px', border: '1px solid ' + (st === 'ok' ? C.accent : st === 'cut' ? C.gray : C.bad), background: st === 'ok' ? 'var(--accent-soft)' : st === 'cut' ? '#f3f1ec' : 'var(--bad-soft)', textDecoration: st === 'prune' ? 'line-through' : 'none', color: st === 'ok' ? 'var(--accent-ink)' : st === 'cut' ? 'var(--muted)' : 'var(--bad)' } }, '{' + c.map(j => IT[j]).join(', ') + '}' + (txt ? ' ' + txt : ''));
      const L = levels.map(l => h('div', { style: { padding: '6px 0', borderBottom: '1px solid var(--line)' } }, h('b', { style: { fontSize: '13.5px' } }, `${l.k} 品項（掃第 ${l.k} 次資料庫）：`), l.lv.map(x => chip(x.c, x.s.toFixed(1), x.ok ? 'ok' : 'cut')), l.pr.length ? h('div', { style: { fontSize: '12.5px', color: 'var(--bad)' } }, '直接剪掉、不必計數：', l.pr.map(p => chip(p.c, `（因 {${p.bad.map(j => IT[j]).join(',')}} 不頻繁）`, 'prune'))) : ''));
      // FP-tree
      const cnt = IT.map((_, j) => TX.T.filter(t => t[j]).length), fi = IT.map((_, j) => j).filter(j => cnt[j] / n >= ms - 1e-9).sort((a, b) => cnt[b] - cnt[a]), root = { ch: {} };
      TX.T.forEach(t => { let nd = root; fi.filter(j => t[j]).forEach(j => { nd.ch[j] = nd.ch[j] || { n: 0, ch: {} }; nd = nd.ch[j]; nd.n++; }); });
      const ren = (nd, d) => Object.entries(nd.ch).map(([j, c]) => h('div', { style: { paddingLeft: d * 20 + 'px', fontFamily: 'var(--mono)', fontSize: '13px' } }, (d ? '└ ' : '') + `${IT[j]} : ${c.n}`, ...ren(c, d + 1)));
      out.append(h('div', { class: 'grid2' }, h('div', null, ttl('Apriori：逐層產生候選並剪枝'), ...L, h('div', { style: { fontSize: '12.5px', color: 'var(--muted)', marginTop: '4px' } }, '綠＝頻繁；灰＝支持度不足；紅刪除線＝依定理直接剪掉')),
        h('div', null, ttl('FP-Growth：前綴樹（只掃兩次）'), h('div', { style: { fontSize: '12.5px', color: 'var(--muted)', margin: '2px 0 6px' } }, `第 1 次掃：算各品項次數並排序（${fi.map(j => IT[j] + ' ' + cnt[j]).join('、') || '無'}）；第 2 次掃：把每筆交易掛上樹`), h('div', { style: { border: '1px solid var(--line)', borderRadius: '8px', padding: '8px 12px', background: '#fff' } }, h('div', { class: 'mono', style: { fontSize: '13px' } }, 'root'), ...ren(root, 1)))),
        kpi(['Apriori 掃描資料庫', scans + ' 次'], ['FP-Growth 掃描資料庫', '2 次', 'good']), nt('品項少（< 100）用哪個都行；品項多或交易量大，一律用 FP-Growth。AI Studio 內建的就是 FP-Growth。調高最小支持度，看候選集怎麼驟減——support 門檻對規則數量的影響是指數級的。')); }
    ctl.append(row(slider('最小支持度', .1, .7, .1, () => ms, v => ms = v, draw, v => (+v).toFixed(1))));
    TX.subs.push(draw); $('#w-apriori').append(ctl, out); draw();
  })();
  U.sorter('#w-unit', [['處方組合分析：常見的用藥組合、潛在交互作用', '一張處方', '品項＝開立的藥品。'], ['★ 共病分析：哪些疾病常同時出現', '一位病人', '不是一次就診——單位錯了整個分析就沒有意義。'], ['檢驗開單模式：是否有不必要的重複開單', '一次就診', '品項＝檢驗項目。'], ['衛材耗用：備料組合最佳化', '一台手術', '品項＝使用的衛材。'], ['照護活動：工作流程的實際樣態', '一個班別', '品項＝執行的護理活動。']], ['一張處方', '一位病人', '一次就診', '一台手術', '一個班別']);

  // ================= P14 時間序列切分 =================
  (function () {
    const r0 = rng(1414), Y = Array.from({ length: 60 }, (_, t) => 100 + 1.5 * t + 8 * Math.sin(2 * Math.PI * t / 12) + 2.5 * randn(r0));
    let seed = 1; const ctl = h('div'), out = h('div');
    const knn = (tr, t) => { const s = tr.slice().sort((a, b) => Math.abs(a - t) - Math.abs(b - t)).slice(0, 2); return S.mean(s.map(i => Y[i])); };
    function draw() { out.innerHTML = ''; const r = rng(seed * 17), idx = Y.map((_, i) => i).sort(() => r() - .5), teR = new Set(idx.slice(0, 18)), trR = Y.map((_, i) => i).filter(i => !teR.has(i)), trT = Y.map((_, i) => i).filter(i => i < 42), teT = Y.map((_, i) => i).filter(i => i >= 42);
      const ev = (tr, te) => { const P = te.map(t => [t, knn(tr, t)]); return { P, mae: S.mean(P.map(([t, p]) => Math.abs(p - Y[t]))) }; };
      const a = ev(trR, [...teR].sort((x, y) => x - y)), b = ev(trT, teT);
      const pan = (title, tr, te, res, bad) => { const bx = h('div'); lc(bx, [{ pts: tr.map(t => [t, Y[t]]), dots: true, dotsOnly: true, color: C.accent, r: 3.4 }, { pts: te.map(t => [t, Y[t]]), dots: true, dotsOnly: true, color: C.amber, r: 3.4 }, { pts: res.P, dots: true, dotsOnly: true, color: C.ink, r: 2 }], { w: 360, h: 230, xmin: 0, xmax: 59, ymin: 85, ymax: 200, xl: '時間 →', legend: [['訓練', C.accent], ['測試', C.amber], ['預測', C.ink]], legW: 60, over: [(sv, x, y) => res.P.forEach(([t, p]) => U.s('line', { x1: x(t), x2: x(t), y1: y(p), y2: y(Y[t]), stroke: C.bad, 'stroke-width': 1 }, sv))] });
        return h('div', null, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, ttl(title), h('span', { class: 'tag ' + (bad ? 'bad' : 'good') }, 'MAE ' + res.mae.toFixed(1))), bx); };
      out.append(h('div', { class: 'grid2' }, pan('✗ 隨機切分（70/30）', trR, [...teR], a, true), pan('✓ 依時間切分（前 70% 訓練、後 30% 測試）', trT, teT, b, false)),
        nt(`同一個模型（用時間鄰近的兩點平均來預測）、同一份資料：隨機切分的 MAE ${a.mae.toFixed(1)}，依時間切分 ${b.mae.toFixed(1)}——差了 ${(b.mae / a.mae).toFixed(1)} 倍。隨機切分時，每個測試點左右都有訓練點，等於偷看了「未來」；依時間切才是上線後的真實情境。左邊那個漂亮的分數，上線之後才會發現全是假的。`, 'warn')); }
    ctl.append(row(h('button', { class: 'btn sm', onclick: () => { seed++; draw(); } }, '重新隨機切一次')));
    $('#w-split').append(ctl, out); draw();
  })();
  (function () {
    let K = 4, mode = 'exp'; const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; const N = 30, W = 680, rh = 26, sv0 = h('div'), sv = U.svgBox(sv0, W, (K + 1) * rh + 30), cw = (W - 110) / N, r = rng(3);
      const kf = mode === 'kfold' ? Array.from({ length: N }, (_, i) => i % K).sort(() => r() - .5) : null;
      for (let k = 0; k < K; k++) { const y = 10 + k * rh; U.s('text', { x: 100, y: y + 15, 'text-anchor': 'end', text: `第 ${k + 1} 折` }, sv);
        const teS = Math.round(N * .4) + Math.round(k * (N * .6) / K), teE = Math.round(N * .4) + Math.round((k + 1) * (N * .6) / K);
        for (let i = 0; i < N; i++) { let c = '#ece9e2'; if (mode === 'kfold') c = kf[i] === k ? C.amber : C.accent; else if (i >= teS && i < teE) c = C.amber; else if (i < teS && (mode === 'exp' || i >= teS - Math.round(N * .4))) c = C.accent;
          U.s('rect', { x: 110 + i * cw, y, width: cw - 1.5, height: rh - 6, fill: c, rx: 2 }, sv); } }
      U.s('text', { x: 110, y: K * rh + 26, text: '時間 →', style: 'font-size:12px;fill:#5d6774' }, sv);
      out.append(cap(sv0, 700), h('div', { style: { fontSize: '12.5px', color: 'var(--muted)' } }, '綠＝訓練　橘＝測試　灰＝不使用'), nt(mode === 'kfold' ? '一般 K-Fold：測試折散布在整條時間軸上，大部分折都在「用未來預測過去」——時間序列不能用。' : mode === 'exp' ? '擴張視窗：每一折都用「到那時為止」的全部資料訓練，測試永遠在訓練之後。' : '滑動視窗：訓練長度固定，適合資料型態會隨時間改變（舊資料不再代表現在）時。', mode === 'kfold' ? 'warn' : '')); }
    ctl.append(row(seg([['exp', 'Walk-forward（擴張視窗）'], ['slide', 'Walk-forward（滑動視窗）'], ['kfold', '✗ 一般 K-Fold']], () => mode, v => mode = v, draw), slider('折數', 3, 6, 1, () => K, v => K = v, draw)));
    $('#w-wf').append(ctl, out); draw();
  })();

  // ================= P15 滯後特徵、分解 =================
  (function () {
    const r = rng(1515), Nd = 120, dowEff = [18, 6, 2, 0, 4, -14, -16], hol = new Set([33, 34, 35, 61, 62, 96, 97, 98]);
    const D = Array.from({ length: Nd }, (_, t) => { const dow = t % 7; return { t, dow, hol: hol.has(t) ? 1 : 0, y: Math.round(150 + .12 * t + dowEff[dow] - (hol.has(t) ? 26 : 0) + 6 * randn(r)) }; });
    D.forEach(d => d.adm = Math.round(d.y * .3 + 3 * randn(r)));
    const F = { lag1: true, lag7: true, ma3: false, dow: true, hol: true, leak: false };
    const FN = [['lag1', 'lag_1（昨天）'], ['lag7', 'lag_7（上週同日）'], ['ma3', 'ma_3（前 3 天平均）'], ['dow', '星期幾（6 個虛擬變數）'], ['hol', 'is_holiday（連假）'], ['leak', '⚠ 當日住院人數']];
    const feat = t => { const f = []; if (F.lag1) f.push(D[t - 1].y); if (F.lag7) f.push(D[t - 7].y); if (F.ma3) f.push((D[t - 1].y + D[t - 2].y + D[t - 3].y) / 3); if (F.dow) for (let k = 1; k < 7; k++) f.push(D[t].dow === k ? 1 : 0); if (F.hol) f.push(D[t].hol); if (F.leak) f.push(D[t].adm); return f; };
    const ctl = h('div'), out = h('div'), SPLIT = 80;
    function draw() { out.innerHTML = ''; const tr = D.filter(d => d.t >= 7 && d.t < SPLIT), te = D.filter(d => d.t >= SPLIT), any = Object.values(F).some(Boolean);
      let pred = null, mae = null; if (any) { const b = ML.ols(tr.map(d => feat(d.t)), tr.map(d => d.y), 1e-6); pred = te.map(d => ML.predict(b, feat(d.t))); mae = S.mean(te.map((d, i) => Math.abs(pred[i] - d.y))); }
      const nv = S.mean(te.map(d => Math.abs(D[d.t - 1].y - d.y))), sn = S.mean(te.map(d => Math.abs(D[d.t - 7].y - d.y)));
      const b = h('div'); lc(b, [{ pts: D.map(d => [d.t, d.y]), color: '#9aa3ad', w: 1.3 }, { pts: te.map(d => [d.t, D[d.t - 7].y]), color: C.blue, w: 1.4, dash: '4 3' }, ...(pred ? [{ pts: te.map((d, i) => [d.t, pred[i]]), color: C.bad, w: 2 }] : [])], { w: 720, h: 240, xmin: 0, xmax: 119, ymin: 105, ymax: 200, xl: '日', yl: '人次', marks: [{ x: SPLIT, color: C.ink, label: '← 訓練｜測試 →' }], legend: [['實際', '#9aa3ad'], ['季節性基準（上週同日）', C.blue, '4 3'], ['你的模型', C.bad]], legW: 150, under: [(sv, x, y) => hol.forEach(t => U.s('rect', { x: x(t) - 2, y: y(200), width: 4, height: y(105) - y(200), fill: C.amber, opacity: .25 }, sv))] });
      const cols = ['日期', 'y（今日）', ...(F.lag1 ? ['lag_1'] : []), ...(F.lag7 ? ['lag_7'] : []), ...(F.ma3 ? ['ma_3'] : []), ...(F.dow ? ['dow'] : []), ...(F.hol ? ['is_holiday'] : []), ...(F.leak ? ['當日住院'] : [])];
      const rowsT = [0, 1, 2, 6, 7, 8].map(t => { const d = D[t]; return [`第 ${t + 1} 天`, d.y, ...(F.lag1 ? [t >= 1 ? D[t - 1].y : '空值'] : []), ...(F.lag7 ? [t >= 7 ? D[t - 7].y : '空值'] : []), ...(F.ma3 ? [t >= 3 ? ((D[t - 1].y + D[t - 2].y + D[t - 3].y) / 3).toFixed(1) : '空值'] : []), ...(F.dow ? [d.dow + 1] : []), ...(F.hol ? [d.hol] : []), ...(F.leak ? [d.adm] : [])]; });
      const best = Math.min(nv, sn), win = mae != null && mae < best;
      out.append(cap(b, 740), h('div', { class: 'grid2', style: { marginTop: '6px' } }, h('div', null, ttl('特徵表前幾列（最前面的空值列必須刪掉）'), tbl(cols, rowsT, { plain: true })), h('div', null, kpi(['天真基準（明天＝今天）', nv.toFixed(1)], ['季節性基準（上週同日）', sn.toFixed(1)], ['你的模型', mae == null ? '—' : mae.toFixed(1), F.leak ? 'bad' : win ? 'good' : 'bad']), h('div', { style: { fontSize: '12px', color: 'var(--muted)' } }, '測試期 MAE（越小越好）'),
        nt(F.leak ? `MAE 只剩 ${mae.toFixed(1)}，好得不像話——因為「當日住院人數」要到當天結束才知道，上線預測時你拿不到。這是最典型的洩漏：絕對不能用當天或未來的資訊當特徵。` : !any ? '請至少勾一個特徵。' : win ? `模型 MAE ${mae.toFixed(1)} 贏過兩個基準線（最佳 ${best.toFixed(1)}）。星期幾與連假是主力——醫療需求有強烈的週週期，台灣的連假效應也非常明顯。` : `模型 MAE ${mae.toFixed(1)} 沒有贏過基準線（${best.toFixed(1)}）——那就別用了。這很常發生；試著加入星期幾或連假。`, F.leak || !win ? 'warn' : '')))); }
    const cb = h('div', { class: 'row' }); FN.forEach(([k, n]) => cb.append(check(n, () => F[k], v => F[k] = v, draw))); ctl.append(cb);
    $('#w-lag').append(ctl, out); draw();
  })();
  (function () {
    const r = rng(1616), N = 104; let spike = 'one'; const base = Array.from({ length: N }, (_, t) => 20 + .06 * t + 2.6 * Math.sin(2 * Math.PI * (t - 4) / 52) + .9 * Math.sin(4 * Math.PI * t / 52) + .55 * randn(r));
    const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; const Y = base.map((v, t) => spike === 'one' && t === 68 ? v + 4.2 : spike === 'run' && t >= 66 && t < 72 ? v + 2.2 : v);
      const X = Y.map((_, t) => [t, Math.sin(2 * Math.PI * t / 52), Math.cos(2 * Math.PI * t / 52), Math.sin(4 * Math.PI * t / 52), Math.cos(4 * Math.PI * t / 52)]), b = ML.ols(X, Y, 1e-6);
      const tr = Y.map((_, t) => b[0] + b[1] * t), se = Y.map((_, t) => b[2] * X[t][1] + b[3] * X[t][2] + b[4] * X[t][3] + b[5] * X[t][4]), re = Y.map((v, t) => v - tr[t] - se[t]), sd = S.sd(re), fl = re.map(v => Math.abs(v) > 3 * sd);
      const P = (title, v, col, o = {}) => { const bx = h('div'); lc(bx, [{ pts: v.map((y, t) => [t, y]), color: col, w: 1.8 }], { w: 720, h: 120, xmin: 0, xmax: 103, xt: [0, 26, 52, 78, 103], yt: o.yt, ...o, over: o.over }); return h('div', null, h('div', { style: { fontSize: '13px', fontWeight: 700, color: col } }, title), bx); };
      out.append(P('觀測值 Observed', Y, C.ink), P('趨勢 Trend：長期方向', tr, C.accent), P('季節性 Seasonal：何時該加派人力', se, C.blue), P('殘差 Residual：大波動＝異常事件（虛線＝±3σ）', re, C.amber, { xl: '週（兩年＝104 週）', over: [(sv, x, y) => { [3 * sd, -3 * sd].forEach(v => U.s('line', { x1: x(0), x2: x(103), y1: y(v), y2: y(v), stroke: C.bad, 'stroke-dasharray': '4 3' }, sv)); re.forEach((v, t) => { if (fl[t]) U.s('circle', { cx: x(t), cy: y(v), r: 5, fill: 'none', stroke: C.bad, 'stroke-width': 2 }, sv); }); }] }),
        nt(spike === 'one' ? '第 68 週殘差突然衝高、超過 3σ——單一週是「點異常」，分解圖直接把它挑出來了。這裡與 PART 3 的異常偵測接上了。' : spike === 'run' ? '第 66–71 週連續偏高，但每一週都沒超過 3σ：這是「集體異常」，要看一段區間（例如連續 4 週同方向偏離）才抓得到。' : '沒有異常事件時，殘差只是雜訊。光是把趨勢與季節性兩張圖給管理者看，往往就足以支撐排班與資源配置的決策——不一定要做到預測。', spike === 'run' ? 'warn' : '')); }
    ctl.append(row(lbl('異常事件'), seg([['none', '無'], ['one', '第 68 週單週暴增'], ['run', '第 66–71 週連續偏高']], () => spike, v => spike = v, draw)));
    $('#w-decomp').append(ctl, out, h('p', { class: 'ai' }, '本例以迴歸擬合線性趨勢與年週期（正弦項），殘差＝其餘部分。AI Studio／Python 的經典分解（移動平均、STL）原理相同。完整的 ARIMA、Prophet、LSTM 超出本課程範圍。')); draw();
  })();

  // ================= P16 校準 =================
  (function () {
    const r = rng(1717), gen = N => Array.from({ length: N }, () => { const z = 1.4 * randn(r) - .6, p = ML.sigmoid(z); return { p, y: r() < p ? 1 : 0 }; });
    const CAL = gen(1500), TE = gen(3000), lg = p => Math.log(Math.max(1e-6, p) / Math.max(1e-6, 1 - p));
    const TY = { good: ['校準良好', p => p], rf: ['分數擠向中間（未調整的隨機森林、SVM）', p => .5 + (p - .5) * .5], nb: ['過度自信（Naive Bayes、過擬合模型）', p => ML.sigmoid(2.6 * lg(p))] };
    let ty = 'rf', platt = false; const ctl = h('div'), out = h('div');
    const curve = (S0, Y) => Array.from({ length: 10 }, (_, b) => { const idx = S0.map((s, i) => [s, i]).filter(([s]) => s >= b / 10 && (s < (b + 1) / 10 || b === 9)); return idx.length >= 15 ? [S.mean(idx.map(o => o[0])), S.mean(idx.map(o => Y[o[1]])), idx.length] : null; }).filter(Boolean);
    function draw() { out.innerHTML = ''; const g = TY[ty][1], sTe = TE.map(d => g(d.p)), Y = TE.map(d => d.y);
      let sAdj = null; if (platt) { const b = ML.logistic(CAL.map(d => [lg(g(d.p))]), CAL.map(d => d.y), null, { lr: .5, iters: 500 }); sAdj = sTe.map(s => ML.sigmoid(ML.predict(b, [lg(s)]))); }
      const c0 = curve(sTe, Y), c1 = sAdj ? curve(sAdj, Y) : null, brier = s => S.mean(s.map((v, i) => (v - Y[i]) ** 2));
      const at = (c, v) => { const k = c.reduce((a, b) => Math.abs(b[0] - v) < Math.abs(a[0] - v) ? b : a); return k; }, k7 = at(c1 || c0, .7);
      const b = h('div'); lc(b, [{ pts: [[0, 0], [1, 1]], color: C.ink, w: 1.2, dash: '4 3' }, { pts: c0.map(p => [p[0], p[1]]), color: platt ? '#c9a27a' : C.amber, w: 2.4, dots: true, op: platt ? .6 : 1 }, ...(c1 ? [{ pts: c1.map(p => [p[0], p[1]]), color: C.accent, w: 2.6, dots: true }] : [])], { w: 380, h: 340, xmin: 0, xmax: 1, ymin: 0, ymax: 1, xt: [0, .2, .4, .6, .8, 1], yt: [0, .2, .4, .6, .8, 1], xl: '模型輸出的預測機率', yl: '實際發生比例', legend: [['完美校準', C.ink, '4 3'], ['原始', C.amber], ...(c1 ? [['Platt 後', C.accent]] : [])], legW: 84, over: [(sv, x, y) => { U.s('line', { x1: x(k7[0]), x2: x(k7[0]), y1: y(k7[0]), y2: y(k7[1]), stroke: C.bad, 'stroke-width': 2.4 }, sv); }] });
      const hb = h('div'); U.hist(hb, [{ values: sAdj || sTe, color: platt ? C.accent : C.amber }], { w: 360, h: 140, bins: 20, min: 0, max: 1, xlabel: '預測機率的分布' });
      out.append(h('div', { class: 'grid2', style: { alignItems: 'center' } }, cap(b, 400), h('div', null, kpi([`模型說 ${Math.round(k7[0] * 100)}%`, `實際 ${Math.round(k7[1] * 100)}%`, Math.abs(k7[0] - k7[1]) > .06 ? 'bad' : 'good'], ['Brier 分數', brier(sAdj || sTe).toFixed(4)]), cap(hb, 380),
        nt(platt ? `Platt Scaling：在獨立的 1,500 筆校準集上，用邏輯斯迴歸把原始分數映射成機率，再套到測試集。曲線回到對角線附近，Brier 從 ${brier(sTe).toFixed(4)} 降到 ${brier(sAdj).toFixed(4)}。排序（AUC）不變，改變的是「數字的意義」。` : ty === 'good' ? '點落在對角線附近：模型說 70% 就真的約 70%。' : ty === 'rf' ? '分數擠在中間：模型很少說出很高或很低的機率——兩端被低估。拿它跟「超過 20% 介入」比對，會漏掉高風險病人。' : '過度自信：模型說 90%，實際只有七成多；說 10%，實際卻更高。', platt || ty === 'good' ? '' : 'warn')))); }
    ctl.append(row(seg(Object.entries(TY).map(([k, v]) => [k, v[0]]), () => ty, v => ty = v, draw), check('套用 Platt Scaling（獨立校準集）', () => platt, v => platt = v, draw)));
    $('#w-cal').append(ctl, out, tbl(['方法', '作法', '適合', '注意'], [['Platt Scaling', '用邏輯斯迴歸把分數映射到機率', '★ 樣本少（< 1000）、偏差呈 S 形', '假設偏差形狀固定'], ['Isotonic Regression 保序迴歸', '學一個單調遞增的映射函數', '★ 樣本多（> 1000）、偏差形狀不規則', '樣本少時容易過擬合']]),
      h('p', { class: 'ai' }, '兩者都必須在「獨立的校準集」上訓練——用訓練集校準等於沒校準。實務做法：切三份（訓練／校準／測試）。只需要排序、或門檻由驗證資料調出來時，可以不校準；但畫一張校準曲線仍然值得，它會告訴你這個模型的「性格」。')); draw();
  })();

  // ================= P17 代價敏感 =================
  (function () {
    const NP = 20, NN = 980, mu = 2.1, pos = Array.from({ length: NP }, (_, i) => mu + invNorm((i + .5) / NP)), neg = Array.from({ length: NN }, (_, i) => invNorm((i + .5) / NN)), pi = NP / (NP + NN);
    const risk = s => { const a = pi * Math.exp(-((s - mu) ** 2) / 2), b = (1 - pi) * Math.exp(-(s * s) / 2); return a / (a + b); };
    const TH = [.005, .01, .015, .02, .03, .05, .08, .1, .15, .2, .3, .4, .5, .7, .9];
    let ti = 12, cFN = 200, cFP = 3; const ctl = h('div'), out = h('div');
    const cm = t => { const TP = pos.filter(s => risk(s) >= t).length, FP = neg.filter(s => risk(s) >= t).length; return { TP, FN: NP - TP, FP, TN: NN - FP }; };
    function draw() { out.innerHTML = ''; const t = TH[ti], m = cm(t), accv = (m.TP + m.TN) / 1000, rec = m.TP / NP, prec = m.TP + m.FP ? m.TP / (m.TP + m.FP) : 0, cost = m.FN * cFN + m.FP * cFP;
      const costs = TH.map((tt, i) => { const q = cm(tt); return [i, q.FN * cFN + q.FP * cFP]; }), bi = costs.reduce((a, b) => b[1] < a[1] ? b : a)[0], opt = cFP / (cFP + cFN);
      const mat = h('table', { class: 'dt', style: { maxWidth: '360px' } }, h('tr', null, h('th', null, ''), h('th', null, '預測：會'), h('th', null, '預測：不會')), h('tr', null, h('th', null, '實際會'), h('td', { class: 'num', style: { background: 'var(--good-soft)', fontWeight: 700 } }, m.TP), h('td', { class: 'num', style: { background: 'var(--bad-soft)', fontWeight: 700 } }, m.FN + ' ← 漏掉')), h('tr', null, h('th', null, '實際不會'), h('td', { class: 'num', style: { background: 'var(--amber-soft)' } }, m.FP + ' 誤報'), h('td', { class: 'num' }, m.TN)));
      const b = h('div'); lc(b, [{ pts: costs.map(([i, c]) => [i, c]), color: C.bad, w: 2.2, dots: true }], { w: 380, h: 220, xmin: 0, xmax: TH.length - 1, ymin: 0, xt: [0, 2, 4, 6, 8, 10, 12, 14], xfmt: i => TH[i], xl: '風險門檻', yl: '總代價', ml: 54, marks: [{ x: ti, color: C.amber, label: '目前' }, { x: bi, color: C.good, label: '最低', dy: 14 }] });
      out.append(h('div', { class: 'grid2', style: { alignItems: 'start' } }, h('div', null, mat, kpi(['準確率', (accv * 100).toFixed(1) + '%'], ['Recall', (rec * 100).toFixed(0) + '%', rec < .7 ? 'bad' : 'good'], ['Precision', (prec * 100).toFixed(0) + '%'], ['總代價', cost.toLocaleString(), ti === bi ? 'good' : 'bad']),
        h('div', { class: 'mono', style: { fontSize: '13px', marginTop: '6px' } }, `總代價 = ${m.FN} × ${cFN} + ${m.FP} × ${cFP} = ${cost.toLocaleString()}`)), h('div', null, ttl('不同門檻的總代價'), cap(b, 400))),
        nt(`代價比 漏報 : 誤報 = ${cFN} : ${cFP}。模型機率已校準時，理論最佳門檻 = ${cFP} / (${cFP} + ${cFN}) = ${opt.toFixed(3)}；圖上最低點落在 ${TH[bi]}。${ti === bi ? '' : `把門檻從 ${t} 移到 ${TH[bi]}，總代價可從 ${cost.toLocaleString()} 降到 ${costs[bi][1].toLocaleString()}。`}準確率最高的門檻通常不是代價最低的——這是醫療 AI 的核心觀念。`, ti === bi ? '' : 'warn')); }
    ctl.append(row(slider('風險門檻', 0, TH.length - 1, 1, () => ti, v => ti = v, draw, v => TH[v]), slider('漏掉一位的代價', 10, 500, 10, () => cFN, v => cFN = v, draw), slider('一次誤報的代價', 1, 30, 1, () => cFP, v => cFP = v, draw)));
    $('#w-cost').append(ctl, out, h('p', { class: 'ai' }, '講義情境：① 一般訓練 TP 8／FN 12／FP 15，準確率 97.3%、總代價 2,445；② 代價敏感 TP 18／FN 2／FP 140，準確率 85.8%、總代價 820。最實用的組合：class_weight 訓練＋校準＋依代價選門檻；AI Studio 可用 MetaCost 寫入代價矩陣。')); draw();
  })();
  $('#w-ask').append(h('div', { class: 'concept' }, ...[['① 漏掉一個會怎樣？', '✘「Recall 要多少？」', '✔「如果系統沒示警，但病人真的惡化了，後果是什麼？」→ 延誤時數、併發症、法律責任'], ['② 誤報一次會怎樣？', '✔「系統示警但其實沒事，誰要去做什麼？花多久？」', '★ 同時問「一天最多能承受幾次誤報？」——這決定門檻'], ['③ 警報疲勞的臨界點？', '✔「十次示警有九次是假的，你們還會理它嗎？」', '幾乎都答「不會」。沒人理的系統，Recall 再高也等於零'], ['④ 現在沒有系統時怎麼做？', '✔「目前靠什麼發現？漏掉的比例大概多少？」', '得到「人的基準線」——模型要贏過的是這個，不是 0']].map(([t, a, b]) => h('div', null, h('b', null, t), h('div', { style: { color: a.startsWith('✘') ? 'var(--bad)' : 'var(--good)', fontSize: '13.5px' } }, a), h('div', { style: { fontSize: '13.5px', color: 'var(--muted)' } }, b)))), nt('把答案換算成代價比例（例：漏報 : 誤報 = 200 : 3），就能直接算出最佳門檻，而不是憑感覺設 0.5。'));

  // ================= P18 實作 =================
  (function () {
    const LABS = [['實作 1｜Titanic 集成模型比較', '3. Outlier and Ensemble/Ensemble - bagging vote stacking Adaboost.rmp', ['先跑單一決策樹，記錄準確率與各折標準差（基準線）', '跑 Bagging（10 個成員），比較準確率「與標準差」', '★ 重點看標準差：Bagging 主要降的是變異', '跑 AdaBoost，觀察它在哪些樣本上反覆調權重', '跑 Vote（決策樹＋kNN＋邏輯斯迴歸），比較硬投票與軟投票', '跑 Stacking，注意 meta-learner 的設定', '把五種結果做成一張表：準確率、標準差、訓練時間'], 'Bagging 的標準差明顯小於單一決策樹；AdaBoost 常能提升平均但對雜訊敏感；軟投票通常略優於硬投票；Stacking 訓練時間最長。'],
      ['實作 2｜鍋爐感測器異常偵測', '3. Outlier and Ensemble/Anomaly Detection .rmp、Boiler Sensor', ['先畫時序圖，用肉眼找出你認為的異常段落（初步候選）', '跑 IQR 門檻——通常只抓到「點異常」', '跑 LOF，比較它抓到的與 IQR 有什麼不同', '跑 Isolation Forest，contamination 設 0.01／0.05／0.10', '★ 比較三個設定抓到的是不是同一批（穩定性檢查）', '做成表：各抓幾筆、重疊多少', '對照第一步的標註，算「相對於你標註」的精確率'], 'IQR 只抓單點極端值；LOF 能抓數值不極端但脈絡奇怪的點；contamination 直接決定抓幾筆；三種方法的交集通常最可信。'],
      ['實作 3｜Golf 與購物籃分析', '6. Association Rules/1. GOLF - FPGrowth、2. Market Basket Analysis', ['先跑 Golf（14 筆）——★ 手算驗證一條規則的三個指標', 'min support 從 0.1 調到 0.5，觀察規則數量驟減', '改跑 Market Basket，先用預設參數', '★ 依 confidence 排序，再依 lift 排序，比較前十名', '在 confidence 前 10 名中找出 lift 最低的一條', 'min lift 設 1.2，看剩下幾條', '挑三條最有行動價值的規則，說明理由'], 'support 門檻的影響是指數級的；兩種排序的前十名差異明顯；真正有價值的規則通常只有個位數條。'],
      ['實作 4｜芝加哥犯罪率時間序列', '4. Case Studies/5. Time Series - Predict Crime Rate in Chicago/', ['彙總成「每月犯罪件數」，畫時序圖', '做時間序列分解，觀察趨勢與季節性', '★ 基準線：上個月的值，記錄 MAE', '★ 季節性基準：去年同月的值，記錄 MAE', '建立 lag_1、lag_12、月份，跑隨機森林', '依時間切分（前 80% 訓練、後 20% 測試）', '比較三者的 MAE——模型有沒有真的贏過基準線？'], '加了滯後特徵的模型不一定贏過季節性基準；若沒贏，表示可預測性主要來自季節性——這是很正常也很重要的發現，不是失敗。']];
    const st = Store.get('m4:labs', {}); const out = h('div');
    function draw() { out.innerHTML = ''; const g = h('div', { class: 'grid2' });
      LABS.forEach(([t, path, steps, exp], li) => { const done = steps.filter((_, i) => st[li + ':' + i]).length; g.append(h('div', { style: { border: '1px solid var(--line)', borderRadius: '10px', padding: '12px 14px', background: '#fff' } }, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('b', null, t), h('span', { class: 'tag ' + (done === steps.length ? 'good' : 'gray') }, `${done} / ${steps.length}`)), h('div', { class: 'mono', style: { fontSize: '12px', color: 'var(--muted)', margin: '4px 0 6px' } }, 'Repository ▸ ' + path),
        steps.map((s, i) => { const c = h('input', { type: 'checkbox' }); c.checked = !!st[li + ':' + i]; c.onchange = () => { st[li + ':' + i] = c.checked; Store.set('m4:labs', st); draw(); }; return h('label', { style: { display: 'flex', gap: '8px', padding: '3px 0', fontSize: '14px', cursor: 'pointer' } }, c, h('span', { style: { textDecoration: c.checked ? 'line-through' : 'none' } }, `${i + 1}. ${s}`)); }), h('div', { class: 'note', style: { fontSize: '13px', marginTop: '6px' } }, h('b', null, '預期結果：'), exp))); });
      out.append(g); }
    $('#w-labs').append(out); draw();
  })();

  // ================= P19 作業 =================
  (function () {
    const M = ['單一決策樹（基準）', 'Bagging', 'AdaBoost', 'Vote（軟投票）', 'Stacking'], st = Store.get('m4:t1', {}); const out = h('div');
    function draw() { out.innerHTML = '';
      const t = h('table', { class: 'dt' }, h('tr', null, ['方法', '平均準確率', '標準差', '訓練時間（秒）'].map(c => h('th', null, c))), M.map((m, i) => h('tr', null, h('td', { style: { fontWeight: 600 } }, m), ['m', 's', 't'].map(k => { const inp = h('input', { type: 'number', step: 'any', value: (st[i] || {})[k] ?? '', style: { width: '100px' } }); inp.onchange = () => { st[i] = { ...(st[i] || {}), [k]: inp.value === '' ? '' : +inp.value }; Store.set('m4:t1', st); draw(); }; return h('td', null, inp); }))));
      const ok = i => st[i] && st[i].m !== '' && st[i].m != null && st[i].s !== '' && st[i].s != null, have = M.map((_, i) => ok(i));
      let chart = '', msg = '把 AI Studio 10-fold CV 的平均與標準差填進表格（準確率用 0–1 或百分比皆可，但要一致）。';
      if (have.filter(Boolean).length >= 2) { const vals = M.map((_, i) => have[i] ? st[i] : null), all = vals.filter(Boolean), lo = Math.min(...all.map(v => v.m - v.s)), hi = Math.max(...all.map(v => v.m + v.s)), pad = (hi - lo) * .1 || .01;
        const b = h('div'), sv = U.svgBox(b, 560, 200), x = U.scale(lo - pad, hi + pad, 170, 540);
        U.ticks(lo - pad, hi + pad, 5).forEach(tk => { U.s('line', { x1: x(tk), x2: x(tk), y1: 6, y2: 180, class: 'grid' }, sv); U.s('text', { x: x(tk), y: 194, 'text-anchor': 'middle', text: +tk.toFixed(3) }, sv); });
        vals.forEach((v, i) => { const y = 22 + i * 34; U.s('text', { x: 164, y: y + 4, 'text-anchor': 'end', text: M[i], style: 'font-weight:600' }, sv); if (!v) return; U.s('line', { x1: x(v.m - v.s), x2: x(v.m + v.s), y1: y, y2: y, stroke: COL[i], 'stroke-width': 3 }, sv); [v.m - v.s, v.m + v.s].forEach(e => U.s('line', { x1: x(e), x2: x(e), y1: y - 6, y2: y + 6, stroke: COL[i], 'stroke-width': 2 }, sv)); U.s('circle', { cx: x(v.m), cy: y, r: 6, fill: COL[i] }, sv); });
        chart = h('div', null, ttl('平均 ± 標準差'), cap(b, 580));
        if (have[0]) { const base = st[0], R = M.slice(1).map((m, j) => have[j + 1] ? [m, st[j + 1].m - base.m, st[j + 1].s - base.s] : null).filter(Boolean), bm = R.reduce((a, b) => b[1] > a[1] ? b : a), bs = R.reduce((a, b) => b[2] < a[2] ? b : a);
          msg = `相對於單一決策樹：平均改善最多的是 ${bm[0]}（${bm[1] >= 0 ? '+' : ''}${bm[1].toFixed(3)}），標準差降最多的是 ${bs[0]}（${bs[2].toFixed(3)}）。理論預期：Bagging 主要降標準差（變異）、AdaBoost 主要拉高平均（偏誤）。你的結果符合嗎？不符合也是發現——寫進那 200 字。`; } }
      const btn = h('button', { class: 'btn primary sm', onclick: () => dl('M4_任務一_集成比較.csv', '方法,平均準確率,標準差,訓練時間\n' + M.map((m, i) => { const r = st[i] || {}; return [m, r.m ?? '', r.s ?? '', r.t ?? ''].join(','); }).join('\n')) }, '下載 CSV');
      const demo = h('button', { class: 'btn sm', onclick: () => { [[.781, .046, 1], [.803, .028, 6], [.812, .041, 5], [.806, .033, 3], [.809, .035, 14]].forEach(([m, s, tt], i) => st[i] = { m, s, t: tt }); Store.set('m4:t1', st); draw(); } }, '填入示範數字');
      const clr = h('button', { class: 'btn sm', onclick: () => { M.forEach((_, i) => delete st[i]); Store.set('m4:t1', st); draw(); } }, '清除');
      out.append(row(btn, demo, clr), h('div', { class: 'tscroll' }, t), chart, nt(msg), h('p', { class: 'ai' }, '示範數字為虛構，只用來展示圖表；請以你自己跑出的結果為準。資料只存在你這台電腦的瀏覽器中。')); }
    $('#w-t1').append(out); draw();
  })();
  (function () {
    const T = [['任務一　集成方法比較（40%）', 'Titanic：單一決策樹 10-fold CV 基準 → Bagging、AdaBoost、Vote（軟投票）、Stacking → 表格（平均／標準差／訓練時間）→ 200 字：誰改善平均、誰改善標準差、符合偏誤—變異理論嗎？', 'P02–P07'], ['任務二　異常偵測與門檻設定（30%）', 'Boiler Sensor：肉眼標出異常區段 → IQR、LOF、Isolation Forest（contamination 0.01／0.05／0.10）→ 表格（各抓幾筆、重疊、與標註吻合）→ 150 字：每天只有 30 分鐘人力覆核，門檻怎麼設？', 'P09–P11'], ['任務三　關聯規則與 lift 陷阱（30%）', 'Transactions：FP-Growth（min support 0.01）→ 依 confidence、依 lift 各取前 10 → 找出 confidence 前 10 中 lift 最低的一條 → 150 字：為什麼會誤導、正確判讀方式', 'P12–P13']];
    const st = Store.get('m4:tasks', {}); const out = h('div');
    function draw() { out.innerHTML = ''; T.forEach(([t, d, p], i) => { const c = h('input', { type: 'checkbox' }); c.checked = !!st[i]; c.onchange = () => { st[i] = c.checked; Store.set('m4:tasks', st); draw(); }; out.append(h('label', { style: { display: 'flex', gap: '10px', padding: '8px 4px', borderBottom: '1px solid var(--line)', cursor: 'pointer' } }, c, h('div', { style: { flex: 1 } }, h('b', { style: { textDecoration: st[i] ? 'line-through' : 'none' } }, t), h('div', { style: { fontSize: '13.5px', color: 'var(--muted)' } }, d)), h('span', { class: 'tag gray', style: { alignSelf: 'flex-start' } }, p))); });
      out.append(h('p', { class: 'ai' }, `已完成 ${T.filter((_, i) => st[i]).length} / 3。繳交：PDF 一份，含流程截圖與結果表；檔名 M4_學號_姓名.pdf；W8 上課前。可改用自選的公開資料。`)); }
    $('#w-tasks').append(out); draw();
  })();

  // ================= P20 =================
  U.flashcards('#w-cards', [['集成學習', 'Ensemble Learning', '組合多個模型以提升表現與穩定性'], ['偏誤', 'Bias', '系統性偏離真實；高偏誤＝欠擬合'], ['變異', 'Variance', '對訓練資料抖動敏感；高變異＝過擬合'], ['多樣性', 'Diversity', '成員錯得不一樣；集成有效的前提'], ['拔靴抽樣', 'Bootstrap', '有放回抽 n 筆'], ['袋外樣本', 'Out-of-Bag', '約 36.8% 沒被抽到，免費驗證集'], ['Bagging', 'Bootstrap Aggregating', '平行訓練再平均；降變異'], ['隨機森林', 'Random Forest', 'Bagging＋每次分裂隨機抽特徵'], ['Extra Trees', 'Extremely Randomized Trees', '分裂點也隨機取'], ['Boosting', 'Boosting', '序列訓練修正前者；降偏誤'], ['弱學習器', 'Weak Learner', '僅略優於隨機猜'], ['決策樁', 'Decision Stump', '只有一層的樹'], ['AdaBoost', 'Adaptive Boosting', '調高分錯樣本的權重'], ['梯度提升', 'Gradient Boosting', '逐棵擬合殘差'], ['學習率', 'Learning Rate', '每棵樹的貢獻比例'], ['早停', 'Early Stopping', '驗證分數不再進步就停'], ['逐葉生長', 'Leaf-wise', 'LightGBM；挑增益最大的葉'], ['軟投票', 'Soft Voting', '平均各成員的機率'], ['堆疊法', 'Stacking', '第二層學怎麼組合'], ['折外預測', 'Out-of-Fold', 'Stacking 避免洩漏的關鍵'], ['點異常', 'Point Anomaly', '單一點明顯偏離'], ['情境異常', 'Contextual Anomaly', '在該情境下不正常'], ['集體異常', 'Collective Anomaly', '一整段序列不正常'], ['四分位距', 'IQR', 'Q1−1.5IQR、Q3+1.5IQR；穩健'], ['中位數絕對離差', 'MAD', '穩健的離散度量'], ['局部離群因子', 'LOF', '≈1 正常、>1 異常'], ['孤立森林', 'Isolation Forest', '切幾刀能孤立'], ['汙染率', 'Contamination', '預期異常比例；決定標出幾筆'], ['精確率@N', 'Precision@N', '前 N 名中真異常的比例'], ['支持度', 'Support', '規則涵蓋的交易比例'], ['信賴度', 'Confidence', 'P(B|A)'], ['提升度', 'Lift', '>1 正相關、<1 負相關'], ['FP-Growth', 'Frequent Pattern Growth', '前綴樹，只掃兩次'], ['滯後特徵', 'Lag Feature', 'n 期前的值'], ['滾動驗證', 'Walk-forward Validation', '測試恆在訓練之後'], ['天真預測', 'Naive Forecast', '明天＝今天；基準線'], ['時間序列分解', 'Decomposition', '趨勢＋季節性＋殘差'], ['機率校準', 'Calibration', '說 70% 就真的 70%'], ['Platt Scaling', 'Platt Scaling', '用邏輯斯迴歸映射分數'], ['代價敏感學習', 'Cost-Sensitive Learning', '把錯誤代價放進模型']]);
  U.finalQuiz('#w-final', [
    ['訓練 0.99、測試 0.71，最適合的處方是？', ['Boosting', 'Bagging／隨機森林', '加更多特徵', '換更複雜的模型'], 1, '高變異 → 平均掉抖動。'],
    ['三個模型錯在完全相同的題目，多數決後準確率會？', ['提高', '不變', '下降', '變成 100%'], 1, '沒有多樣性，集成白做。'],
    ['n 很大時，某筆資料從沒被 bootstrap 抽到的機率約為？', ['10%', '25%', '36.8%', '50%'], 2, '(1−1/n)ⁿ → 1/e。'],
    ['AdaBoost 某輪加權錯誤率 ε = 0.3，α 約為？', ['0.30', '0.42', '0.85', '1.15'], 1, '0.5 × ln(0.7/0.3) = 0.424。'],
    ['學習率從 0.1 降到 0.05，棵數大致要？', ['減半', '不變', '加倍', '固定 100'], 2, '學習率與棵數是一組交易。'],
    ['Stacking 第一層的預測為什麼要用 out-of-fold？', ['算得比較快', '避免第二層學到「第一層記住答案」', '提高多樣性', 'AI Studio 規定'], 1, '否則驗證分數虛高、上線就崩。'],
    ['36.2°C 本身正常，但病人術後第一天一直這樣，這屬於？', ['點異常', '情境異常', '集體異常', '不是異常'], 1, '要先建立情境才抓得到。'],
    ['加入一筆極端值後，哪一種門檻最容易被拉走？', ['3σ', 'IQR', 'MAD', '三者一樣'], 0, 'μ 與 σ 本身會被離群值拉走。'],
    ['異常偵測的門檻最該由什麼決定？', ['3σ', 'contamination 預設值', '專家每天能覆核的筆數', 'AUC'], 2, '設太鬆沒人看，系統形同虛設。'],
    ['{止痛藥}→{胃藥} confidence 1.0、lift 1.11，應該怎麼解讀？', ['非常強的關聯', '只比隨機好 11%，胃藥本來就很常見', '負相關', '因果關係'], 1, '先看 lift，再看 confidence。'],
    ['時間序列用隨機切分，最可能的結果是？', ['驗證分數虛高', '驗證分數偏低', '沒有影響', '模型訓練不起來'], 0, '訓練集裡有未來的資料。'],
    ['漏報代價 200、誤報代價 3，模型已校準，理論最佳門檻約為？', ['0.5', '0.2', '0.015', '0.985'], 2, '3 / (3 + 200) ≈ 0.015。'],
  ]);
  (function () {
    const R = [['換一種看資料的角度', '四大主題都不是換更強的模型。', 'p01'], ['先診斷再開藥', 'Bagging 常降變異；Boosting 常先改善偏誤。', 'p02'], ['多樣性是集成的燃料', '成員必須錯得不一樣。', 'p03'], ['Stacking 必用 out-of-fold', '否則嚴重洩漏。', 'p07'], ['這 0.01 值得嗎', '集成的代價是可解釋性。', 'p08'], ['異常有三種型態', '情境與集體異常更重要，也更難抓。', 'p09'], ['先 support、再 lift', '只看 confidence 會把負相關當發現。', 'p12'], ['時間序列不能隨機切', '還要贏過「明天＝今天」。', 'p14'], ['校準＋代價選門檻', '準確率最高的門檻通常不是代價最低的。', 'p17']];
    const g = h('div', { class: 'grid3' }); R.forEach(([t, d, id], i) => g.append(h('a', { href: '#' + id, style: { textDecoration: 'none', color: 'inherit', border: '1px solid var(--line)', borderRadius: '10px', padding: '10px 12px', background: '#fff', display: 'block' } }, h('div', { class: 'mono', style: { color: 'var(--accent)', fontWeight: 700 } }, i + 1), h('b', null, t), h('div', { style: { fontSize: '13.5px', color: 'var(--muted)' } }, d))));
    $('#w-review').append(g, h('div', { class: 'note' }, h('b', null, '下一步：'), 'M5 深度學習：從神經網路到 CNN。', h('a', { href: '../' }, '回到課程首頁 →')));
  })();
})();
