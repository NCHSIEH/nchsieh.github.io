/* M4 互動頁 A：共用工具、PART 01–08（集成） */
(function () {
  'use strict';
  const { h, $, S, fmt, C, rng, randn, seg, slider, check } = U;
  U.initModule('m4');
  const cap = (el, px) => { el.style.maxWidth = px + 'px'; el.style.width = '100%'; el.style.margin = '0 auto'; return el; };
  const COL = ['#0d6b67', '#b45309', '#2b6cb0', '#7c3aed', '#c0392b', '#2f7d4f'];
  const row = (...a) => h('div', { class: 'row', style: { marginBottom: '6px' } }, ...a);
  const lbl = t => h('span', { style: { fontSize: '14px', color: 'var(--muted)' } }, t);
  const nt = (t, cls = '') => h('div', { class: 'note ' + cls, style: { fontSize: '14px' } }, t);
  const ttl = t => h('b', { style: { fontSize: '13.5px' } }, t);
  /* 通用折線圖：series=[{pts:[[x,y]],color,w,dash,dots}]；o: w,h,xmin..,xl,yl,yfmt,marks:[{x,label,color}],over */
  function lc(box, series, o = {}) {
    const W = o.w || 420, H = o.h || 240, m = { l: o.ml || 46, r: 12, t: 12, b: 36 }, sv = U.svgBox(box, W, H);
    const xs = series.flatMap(s => s.pts.map(p => p[0])), ys = series.flatMap(s => s.pts.map(p => p[1])).filter(Number.isFinite);
    const x0 = o.xmin ?? Math.min(...xs), x1 = o.xmax ?? Math.max(...xs), y0 = o.ymin ?? Math.min(...ys), y1 = o.ymax ?? Math.max(...ys);
    const x = U.scale(x0, x1, m.l, W - m.r), y = U.scale(y0, y1, H - m.b, m.t), cy = v => y(Math.max(y0, Math.min(y1, v)));
    (o.yt || U.ticks(y0, y1, 4)).forEach(t => { U.s('line', { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: 'grid' }, sv); U.s('text', { x: m.l - 6, y: y(t) + 4, 'text-anchor': 'end', text: o.yfmt ? o.yfmt(t) : +(+t).toFixed(3) }, sv); });
    (o.xt || U.ticks(x0, x1, 5)).forEach(t => U.s('text', { x: x(t), y: H - m.b + 16, 'text-anchor': 'middle', text: o.xfmt ? o.xfmt(t) : t }, sv));
    U.s('line', { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, class: 'axis' }, sv);
    (o.under || []).forEach(f => f(sv, x, y));
    series.forEach(s => { if (s.pts.length > 1 && !s.dotsOnly) U.s('polyline', { points: s.pts.map(p => `${x(p[0])},${cy(p[1])}`).join(' '), fill: 'none', stroke: s.color || C.accent, 'stroke-width': s.w || 2, 'stroke-dasharray': s.dash || null, opacity: s.op ?? 1 }, sv); if (s.dots) s.pts.forEach(p => U.s('circle', { cx: x(p[0]), cy: cy(p[1]), r: s.r || 3, fill: s.color || C.accent, 'fill-opacity': s.dop ?? .8 }, sv)); });
    (o.marks || []).forEach(mk => { U.s('line', { x1: x(mk.x), x2: x(mk.x), y1: m.t, y2: H - m.b, stroke: mk.color || C.ink, 'stroke-dasharray': '4 3', 'stroke-width': 1.4 }, sv); if (mk.label) U.s('text', { x: x(mk.x) + 4, y: m.t + 26 + (mk.dy || 0), text: mk.label, style: `font-size:11px;fill:${mk.color || C.ink}` }, sv); });
    if (o.xl) U.s('text', { x: (m.l + W - m.r) / 2, y: H - 3, 'text-anchor': 'middle', text: o.xl, style: 'font-size:12px;fill:#5d6774' }, sv);
    if (o.yl) U.s('text', { x: 12, y: (m.t + H - m.b) / 2, 'text-anchor': 'middle', transform: `rotate(-90 12 ${(m.t + H - m.b) / 2})`, text: o.yl, style: 'font-size:12px;fill:#5d6774' }, sv);
    if (o.legend) o.legend.forEach(([t, c, d], i) => { const lx = m.l + 8 + i * (o.legW || 92); U.s('line', { x1: lx, x2: lx + 16, y1: m.t + 4, y2: m.t + 4, stroke: c, 'stroke-width': 2.4, 'stroke-dasharray': d || null }, sv); U.s('text', { x: lx + 20, y: m.t + 8, text: t, style: 'font-size:11px' }, sv); });
    (o.over || []).forEach(f => f(sv, x, y)); return { sv, x, y };
  }
  const invNorm = p => { const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924], b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857], c = [-7.78489400243029e-3, -.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878], d = [7.78469570904146e-3, .32246712907004, 2.445134137143, 3.75440866190742], pl = .02425;
    if (p < pl) { const q = Math.sqrt(-2 * Math.log(p)); return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1); }
    if (p > 1 - pl) return -invNorm(1 - p); const q = p - .5, r = q * q; return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1); };
  const map2 = (box, f, pts, o = {}) => U.scatter(box, pts.map((p, i) => ({ x: p.x[0], y: p.x[1], c: p.y ? C.bad : C.blue, r: o.r ? o.r(i) : 3.2, op: .9 })), { w: o.w || 340, h: o.h || 300, xmin: 0, xmax: 9, ymin: 0, ymax: 9, noGrid: true, xlabel: '特徵 1', ylabel: '特徵 2', under: [(sv, x, y) => ML.regionMap(sv, x, y, (a, b) => f([a, b]), 0, 9, 0, 9, o.n || 48, o.n || 48)], over: o.over || [] });
  const acc = (f, P) => S.mean(P.map(p => ((f(p.x) >= .5 ? 1 : 0) === p.y) ? 1 : 0));
  const M4 = window.M4 = { cap, COL, row, lbl, nt, ttl, lc, invNorm, map2, acc };

  // ================= P01 =================
  U.sorter('#w-map', [
    ['已有再入院預測模型（AUC 0.81），想再提高幾個百分點', '集成', '有標註、已經有模型 → 集成。'],
    ['加護病房監視器：找出訊號突然怪異的時段，幾乎沒有標註', '異常偵測', '沒標註、想找怪的。'],
    ['哪些藥品常同時開在同一張處方上？', '關聯規則', '沒有 Y 要預測，要找「常一起出現」。'],
    ['預測下個月每天的急診人次以排班', '時間序列', '資料有時間順序，切分方式要改。'],
    ['決策樹換一批資料就長得完全不同，結果不穩', '集成', '高變異 → Bagging／隨機森林。'],
    ['健保申報資料中找出可能的異常申報，交稽核人員覆核', '異常偵測', '定位成「縮小範圍的工具」。'],
    ['糖尿病病人常同時有哪些共病？', '關聯規則', '注意：一筆交易＝一位病人。'],
    ['預測未來四週的衛材耗用量', '時間序列', '先建基準線：這週＝上週同期。'],
  ], ['集成', '異常偵測', '關聯規則', '時間序列']);

  // ================= P02 偏誤—變異 =================
  (function () {
    const f = x => Math.sin(2 * Math.PI * x) * .9 + .6 * x, n = 18, sd = .32;
    const sample = r => { const x = Array.from({ length: n }, () => r()), y = x.map(v => f(v) + sd * randn(r)); return { x, y }; };
    const G = Array.from({ length: 101 }, (_, i) => i / 100);
    let deg = 3, seed = 1; const ctl = h('div'), out = h('div');
    const stats = {}; const getStats = d => { if (stats[d]) return stats[d]; const r = rng(500 + d), preds = []; for (let k = 0; k < 60; k++) { const s = sample(r), g = ML.polyfit(s.x, s.y, d, 0, 1); preds.push(G.map(v => Math.max(-3, Math.min(3, g(v))))); } const avg = G.map((_, j) => S.mean(preds.map(p => p[j])));
      const bias2 = S.mean(G.map((v, j) => (avg[j] - f(v)) ** 2)), vr = S.mean(G.map((_, j) => S.mean(preds.map(p => (p[j] - avg[j]) ** 2)))); return stats[d] = { bias2, vr }; };
    function draw() { out.innerHTML = ''; const r = rng(seed * 31 + 7), fits = []; let lastS; for (let k = 0; k < 6; k++) { const s = sample(r); lastS = s; fits.push(ML.polyfit(s.x, s.y, deg, 0, 1)); }
      const avgF = v => S.mean(fits.map(g => g(v))), st = getStats(deg);
      const mk = (title, ser) => { const b = h('div'); lc(b, ser, { w: 300, h: 230, xmin: 0, xmax: 1, ymin: -1.6, ymax: 2.2, xt: [0, .5, 1], yt: [-1, 0, 1, 2] }); return h('div', null, ttl(title), b); };
      const truth = { pts: G.map(v => [v, f(v)]), color: C.ink, w: 3 };
      const thin = fits.map((g, i) => ({ pts: G.map(v => [v, g(v)]), color: COL[i % 6], w: 1.2, op: .75 }));
      const grid = h('div', { class: 'grid3' }, mk('① 一次抽樣的模型', [{ pts: lastS.x.map((v, i) => [v, lastS.y[i]]), dots: true, dotsOnly: true, color: C.gray }, truth, thin[5]]), mk('② 六次抽樣的六個模型', [truth, ...thin]), mk('③ 六個模型的平均（集成）', [truth, ...thin.map(t => ({ ...t, op: .18 })), { pts: G.map(v => [v, avgF(v)]), color: C.bad, w: 2.6, dash: '6 3' }]));
      const bb = h('div'), sv = U.svgBox(bb, 360, 96), mx = Math.max(.12, st.bias2 + st.vr + sd * sd), xs = U.scale(0, mx, 110, 340);
      [['偏誤²', st.bias2, C.amber], ['變異', st.vr, C.blue], ['雜訊（不可約）', sd * sd, C.gray]].forEach(([t, v, c], i) => { U.s('text', { x: 104, y: 20 + i * 28, 'text-anchor': 'end', text: t }, sv); U.s('rect', { x: 110, y: 8 + i * 28, width: Math.max(1, xs(Math.min(v, mx)) - 110), height: 18, fill: c, rx: 3 }, sv); U.s('text', { x: Math.min(xs(Math.min(v, mx)) + 4, 300), y: 21 + i * 28, text: v.toFixed(3), style: 'font-size:11px;font-weight:600' }, sv); });
      const msg = deg <= 1 ? '一次式：六條線幾乎一樣（變異小），但都離真相很遠——高偏誤（欠擬合）。平均起來還是錯的：集成救不了太弱的模型，要換 Boosting 或加特徵。' : deg >= 7 ? '高次式：每次抽樣差很多（變異大），抓到的是雜訊——高變異（過擬合）。但右圖把六條平均後，抖動互相抵消，回到真相附近：這就是 Bagging 的原理。' : '中等複雜度：偏誤很小、變異中等。把六條平均（右圖）仍能再收斂一些，但增益有限——別為了用而用。';
      out.append(grid, h('div', { class: 'grid2', style: { alignItems: 'center', marginTop: '6px' } }, h('div', null, ttl(`誤差分解（60 次抽樣估計，${deg} 次式）`), cap(bb, 380)), nt(msg, deg >= 7 || deg <= 1 ? 'warn' : ''))); }
    ctl.append(row(slider('模型複雜度（多項式次數）', 1, 10, 1, () => deg, v => deg = v, draw, v => v + ' 次'), h('button', { class: 'btn sm', onclick: () => { seed++; draw(); } }, '重新抽六批資料')));
    $('#w-bv').append(ctl, out, h('p', { class: 'ai' }, '一句話記住：Bagging 常藉平均降低變異；Boosting 常先改善偏誤。模型不穩定（換資料差很多）→ Bagging；模型太弱（怎麼調都不準）→ Boosting。')); draw();
  })();
  U.sorter('#w-diag', [
    ['訓練 0.68、測試 0.66', '高偏誤', '兩邊都差 → 換更強的模型、加特徵、用 Boosting。'],
    ['訓練 0.99、測試 0.71', '高變異', '訓練好測試差 → 減少複雜度、正則化、Bagging／隨機森林。'],
    ['訓練 0.91、測試 0.88（±0.09）', '變異偏高', '平均不錯但各折差很多 → 集成可降波動；也檢查資料量是否太少。'],
    ['訓練 0.91、測試 0.89（±0.02）', '健康', '不需要集成。別為了用而用。'],
    ['訓練 1.00、測試 0.80（±0.07）', '高變異', '單棵深樹的典型樣子 → 隨機森林。'],
    ['訓練 0.74、測試 0.73（±0.01）', '高偏誤', '很穩但不準 → 加特徵或 Boosting。'],
  ], ['高偏誤', '高變異', '變異偏高', '健康'], '「測試分數 ±」是交叉驗證各折的標準差——只看平均看不出穩不穩定。');

  // ================= P03 多樣性 =================
  (function () {
    const P = { same: ['1101101101', '1101101101', '1101101101'], diff: ['1101101101', '1011110111', '0111111011'], all: ['1111111111', '1111111111', '1111111111'] };
    let M = P.same.map(s => s.split('').map(Number)); const out = h('div');
    function draw() { out.innerHTML = ''; const vote = Array.from({ length: 10 }, (_, j) => M.reduce((s, r) => s + r[j], 0) >= 2 ? 1 : 0), accs = M.map(r => S.mean(r)), va = S.mean(vote);
      const cell = (v, on) => h('td', { style: { textAlign: 'center', cursor: on ? 'pointer' : 'default', color: v ? C.good : C.bad, fontWeight: 700, fontSize: '16px', background: v ? '' : 'var(--bad-soft)' } }, v ? '○' : '✕');
      const t = h('table', { class: 'dt' }, h('tr', null, h('th', null, ''), Array.from({ length: 10 }, (_, j) => h('th', { style: { textAlign: 'center' } }, '第' + (j + 1) + '題')), h('th', null, '準確率')),
        M.map((r, i) => h('tr', null, h('td', { style: { fontWeight: 600 } }, '模型 ' + (i + 1)), r.map((v, j) => { const c = cell(v, true); c.onclick = () => { M[i][j] = 1 - M[i][j]; draw(); }; return c; }), h('td', { class: 'num' }, Math.round(accs[i] * 100) + '%'))),
        h('tr', { style: { borderTop: '2px solid var(--ink)' } }, h('td', { style: { fontWeight: 700 } }, '多數決'), vote.map(v => cell(v, false)), h('td', { class: 'num hl', style: { fontWeight: 700 } }, Math.round(va * 100) + '%')));
      const ov = [[0, 1], [0, 2], [1, 2]].map(([a, b]) => M[a].filter((v, j) => !v && !M[b][j]).length), best = Math.max(...accs);
      const msg = va > best ? `多數決 ${Math.round(va * 100)}% 高於最好的單一模型（${Math.round(best * 100)}%）——成員錯在不同的題目，彼此互補。` : va === best && ov.every(o => o === Math.min(...M.map(r => r.filter(v => !v).length))) ? '三個模型錯在同樣的題目，多數決結果與單一模型完全相同——集成白做了。' : `多數決 ${Math.round(va * 100)}%，沒有超過最好的單一模型。看看哪幾題有兩個以上的模型同時答錯。`;
      out.append(row(h('button', { class: 'btn sm', onclick: () => { M = P.same.map(s => s.split('').map(Number)); draw(); } }, '錯在同樣題目'), h('button', { class: 'btn sm', onclick: () => { M = P.diff.map(s => s.split('').map(Number)); draw(); } }, '錯在不同題目'), h('button', { class: 'btn sm', onclick: () => { M = P.all.map(s => s.split('').map(Number)); draw(); } }, '全部改成答對')),
        h('div', { class: 'tscroll' }, t), h('div', { style: { fontSize: '13px', color: 'var(--muted)', margin: '4px 0' } }, `兩兩同時答錯的題數：模型1&2 ${ov[0]} 題、1&3 ${ov[1]} 題、2&3 ${ov[2]} 題`), nt(msg, va > best ? '' : 'warn')); }
    $('#w-div').append(out); draw();
  })();
  (function () {
    let p = .7, rho = .1, M = 9; const ctl = h('div'), out = h('div');
    const sim = (p, rho, M, N = 2000) => { const r = rng(42), th = invNorm(p); let ok = 0; for (let k = 0; k < N; k++) { const z = randn(r); let c = 0; for (let m = 0; m < M; m++) if (Math.sqrt(rho) * z + Math.sqrt(1 - rho) * randn(r) < th) c++; if (c > M / 2) ok++; } return ok / N; };
    function draw() { out.innerHTML = ''; const Ms = [1, 3, 5, 7, 9, 15, 25], cur = sim(p, rho, M);
      const ser = [0, .3, .7, 1].map((rr, i) => ({ pts: Ms.map(m => [m, sim(p, rr, m, 2500)]), color: ['#2f7d4f', '#2b6cb0', '#b45309', '#c0392b'][i], w: 2, dots: true }));
      const b = h('div'); lc(b, ser, { w: 440, h: 250, xmin: 1, xmax: 25, ymin: .5, ymax: 1, xt: Ms, yfmt: t => Math.round(t * 100) + '%', xl: '成員數', legend: [['ρ = 0', '#2f7d4f'], ['ρ = 0.3', '#2b6cb0'], ['ρ = 0.7', '#b45309'], ['ρ = 1', '#c0392b']], legW: 70, over: [(sv, x, y) => U.s('circle', { cx: x(M), cy: y(cur), r: 7, fill: 'none', stroke: C.ink, 'stroke-width': 2.4 }, sv)] });
      out.append(h('div', { class: 'grid2', style: { alignItems: 'center' } }, cap(b, 460), h('div', null, h('div', { class: 'kpi' }, h('div', null, h('div', { class: 'k' }, '單一成員'), h('div', { class: 'v' }, Math.round(p * 100) + '%')), h('div', null, h('div', { class: 'k' }, `${M} 個成員多數決`), h('div', { class: 'v ' + (cur - p > .05 ? 'good' : '') }, (cur * 100).toFixed(1) + '%'))),
        nt(rho >= .9 ? '錯誤幾乎完全相關：加再多成員也一樣，這就是「五個一模一樣的模型」。' : p < .5 ? '成員比亂猜還差：多數決反而更差。成員至少要「比隨機猜好一點」。' : `錯誤相關 ρ = ${rho}：成員越多越好，但相關越高、增益越快飽和。多樣性才是集成的燃料。`, rho >= .9 || p < .5 ? 'warn' : '')))); }
    ctl.append(row(slider('成員準確率 p', .45, .9, .05, () => p, v => p = v, draw, v => Math.round(v * 100) + '%'), slider('錯誤相關 ρ', 0, 1, .1, () => rho, v => rho = v, draw, v => (+v).toFixed(1)), slider('成員數', 1, 25, 2, () => M, v => M = v, draw)));
    $('#w-corr').append(ctl, out); draw();
  })();

  // ================= P04 =================
  U.sorter('#w-tax', [['Bagging', '平行', '各自用不同的 bootstrap 樣本獨立訓練。'], ['隨機森林', '平行', 'Bagging＋每次分裂隨機抽特徵。'], ['Extra Trees', '平行', '連分裂點也隨機取。'], ['AdaBoost', '序列', '下一個要知道前一個分錯哪些樣本（調權重）。'], ['Gradient Boosting', '序列', '下一棵擬合前面的殘差。'], ['XGBoost／LightGBM／CatBoost', '序列', 'GBDT 的三大實作。'], ['硬投票／軟投票', '異質', '不同演算法各自預測再投票。'], ['Stacking', '異質', '第二層只用第一層的「預測值」。']], ['平行', '序列', '異質'], '平行→降低變異；序列→降低偏誤；異質→兩者都降一點。');
  $('#w-tax').append(h('div', { class: 'tscroll', style: { marginTop: '10px' } }, h('table', { class: 'dt' }, h('tr', null, ['方法', '抽樣本', '抽特徵', '分裂點', '特點'].map(c => h('th', null, c))), [['Bagging', '★ 有放回抽樣', '全部使用', '找最佳', '最基本；可搭配任何模型'], ['隨機森林', '★ 有放回抽樣', '★ 每次分裂隨機抽（sklearn √p；AI Studio log(p)+1）', '在抽到的特徵中找最佳', '多樣性更高；分類問題預設起點'], ['Extra Trees', '通常用全部資料', '每次分裂隨機抽', '★ 隨機取，不找最佳', '更快、變異更低，偏誤略高']].map(r => h('tr', null, r.map((v, j) => h('td', { style: { fontWeight: j ? 400 : 600 } }, v)))))));
  (function () {
    let n = 30, seed = 1; const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; const r = rng(seed * 13 + n), cnt = new Array(n).fill(0); for (let i = 0; i < n; i++) cnt[Math.floor(r() * n)]++; const oob = cnt.filter(c => !c).length / n, th = (1 - 1 / n) ** n;
      let avg = 0; const r2 = rng(99 + n); for (let k = 0; k < 200; k++) { const c = new Array(n).fill(0); for (let i = 0; i < n; i++) c[Math.floor(r2() * n)]++; avg += c.filter(v => !v).length / n; } avg /= 200;
      const grid = h('div', { style: { display: 'grid', gridTemplateColumns: `repeat(${n <= 30 ? 10 : 20},1fr)`, gap: '3px', maxWidth: n <= 30 ? '420px' : '560px' } }, n <= 100 ? cnt.map((c, i) => h('div', { title: `第 ${i + 1} 筆：被抽中 ${c} 次`, style: { aspectRatio: '1', borderRadius: '4px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: n <= 30 ? '12px' : '9px', fontFamily: 'var(--mono)', background: c ? `rgba(13,107,103,${.25 + Math.min(c, 4) * .18})` : '#fff', border: c ? '1px solid transparent' : '1.5px dashed var(--amber)', color: c > 1 ? '#fff' : 'var(--ink)' } }, c || '')) : []);
      out.append(h('div', { class: 'grid2', style: { alignItems: 'center' } }, n <= 100 ? h('div', null, ttl(`這一次抽樣：格內數字＝被抽中幾次；虛線框＝OOB`), grid) : nt('n = 1000 時格子太多，只顯示統計結果。'),
        h('div', null, h('div', { class: 'kpi' }, h('div', null, h('div', { class: 'k' }, '這次 OOB 比例'), h('div', { class: 'v' }, (oob * 100).toFixed(1) + '%')), h('div', null, h('div', { class: 'k' }, '200 次平均'), h('div', { class: 'v' }, (avg * 100).toFixed(1) + '%')), h('div', null, h('div', { class: 'k' }, '(1 − 1/n)ⁿ'), h('div', { class: 'v' }, (th * 100).toFixed(1) + '%'))),
          nt(`n → ∞ 時 (1 − 1/n)ⁿ → 1/e ≈ 36.8%。每棵樹都有約三分之一的資料沒看過——拿它們來評估，就是免費的驗證集（OOB 誤差）。AI Studio 的 Random Forest 可直接輸出。`)))); }
    ctl.append(row(lbl('資料筆數 n'), seg([[10, '10'], [30, '30'], [100, '100'], [1000, '1000']], () => n, v => n = v, draw), h('button', { class: 'btn primary sm', onclick: () => { seed++; draw(); } }, '再抽一次')));
    $('#w-boot').append(ctl, out); draw();
  })();
  (function () {
    const gen = (r, N) => Array.from({ length: N }, () => { const x = [r() * 9, r() * 9], d = Math.hypot(x[0] - 4.5, x[1] - 4.5), sc = 2.6 - d + .35 * Math.sin(2.2 * x[0]); let y = sc > 0 ? 1 : 0; if (r() < .12) y = 1 - y; return { x, y }; });
    const R = rng(404), TE = gen(R, 700), TR = Array.from({ length: 10 }, () => gen(R, 110));
    const NT = 25, models = { tree: [], bag: [], rf: [] };
    TR.forEach((P, k) => { const r = rng(800 + k); models.tree.push((t => x => ML.treeP(t, x))(ML.cart(P, 9, { minLeaf: 1 })));
      const B = [], F = []; for (let t = 0; t < NT; t++) { const bs = P.map(() => P[Math.floor(r() * P.length)]); B.push(ML.cart(bs, 9, { minLeaf: 1 })); const bs2 = P.map(() => P[Math.floor(r() * P.length)]); F.push(ML.cart(bs2, 9, { minLeaf: 1, rng: r, mtry: 1 })); }
      models.bag.push(x => S.mean(B.map(t => ML.treeP(t, x)))); models.rf.push(x => S.mean(F.map(t => ML.treeP(t, x)))); });
    const A = {}; Object.keys(models).forEach(k => A[k] = models[k].map(f => acc(f, TE)));
    const NM = { tree: '單棵深樹', bag: `Bagging（${NT} 棵）`, rf: `隨機森林（${NT} 棵）` };
    let bi = 0; const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; const g = h('div', { class: 'grid3' });
      Object.keys(models).forEach(k => { const b = h('div'); map2(b, models[k][bi], TR[bi], { w: 290, h: 260, n: 44 }); g.append(h('div', null, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, ttl(NM[k]), h('span', { class: 'tag gray' }, '測試 ' + (A[k][bi] * 100).toFixed(1) + '%')), b)); });
      const dp = h('div'), sv = U.svgBox(dp, 520, 150), lo = Math.min(...Object.values(A).flat()) - .01, hi = Math.max(...Object.values(A).flat()) + .01, x = U.scale(lo, hi, 140, 500);
      U.ticks(lo, hi, 5).forEach(t => { U.s('line', { x1: x(t), x2: x(t), y1: 8, y2: 128, class: 'grid' }, sv); U.s('text', { x: x(t), y: 144, 'text-anchor': 'middle', text: Math.round(t * 100) + '%' }, sv); });
      Object.keys(A).forEach((k, i) => { const yy = 28 + i * 38, m = S.mean(A[k]), s = S.sd(A[k]); U.s('text', { x: 134, y: yy + 4, 'text-anchor': 'end', text: `${NM[k]}`, style: 'font-weight:600' }, sv); U.s('line', { x1: x(m - s), x2: x(m + s), y1: yy, y2: yy, stroke: COL[i], 'stroke-width': 6, opacity: .25 }, sv); A[k].forEach((a, j) => U.s('circle', { cx: x(a), cy: yy, r: j === bi ? 6 : 4, fill: COL[i], 'fill-opacity': j === bi ? 1 : .55, stroke: j === bi ? C.ink : null }, sv)); U.s('line', { x1: x(m), x2: x(m), y1: yy - 10, y2: yy + 10, stroke: C.ink, 'stroke-width': 2 }, sv); });
      const st = k => `${(S.mean(A[k]) * 100).toFixed(1)}% ± ${(S.sd(A[k]) * 100).toFixed(1)}`;
      out.append(g, h('div', { class: 'grid2', style: { marginTop: '8px', alignItems: 'center' } }, h('div', null, ttl('十批訓練資料的測試準確率（點＝一批；淡色帶＝±1 標準差）'), cap(dp, 540)),
        nt(h('span', null, `單棵樹 ${st('tree')}；Bagging ${st('bag')}；隨機森林 ${st('rf')}。`, h('br'), (() => { const d1 = (S.mean(A.bag) - S.mean(A.tree)) * 100, sdT = S.sd(A.tree), sdR = S.sd(A.rf); return `單棵深樹的邊界跟著每批資料的雜訊亂長（看那些零碎的小方塊）；把 25 棵平均後，邊界平滑許多。這份資料裡，Bagging 平均提高 ${d1.toFixed(1)} 個百分點${sdR < sdT * .8 ? '；隨機森林多了「抽特徵」這層隨機，各批之間的 ± 也明顯縮小' : ''}。實務上要同時看平均與 ±：Bagging 家族主要降的是變異，在 AI Studio 裡就看 10-fold CV 的標準差。`; })())))); }
    ctl.append(row(slider('看第幾批訓練資料', 1, 10, 1, () => bi + 1, v => bi = v - 1, draw)));
    $('#w-bag').append(ctl, out); draw();
  })();

  // ================= P05 AdaBoost =================
  (function () {
    let W = [[0, 1, 2], [3, 4, 5], [6, 7]], ed = 0; const ctl = h('div'), out = h('div');
    const run = () => { let w = new Array(10).fill(.1); const hist = [{ w: w.slice() }];
      for (let t = 0; t < 3; t++) { const wr = new Set(W[t]), eps = S.sum(W[t].map(i => w[i])); if (eps <= 0 || eps >= .5) { hist.push({ eps, bad: true, w: w.slice(), wr }); break; } const a = .5 * Math.log((1 - eps) / eps), before = w.slice();
        w = w.map((v, i) => v * Math.exp(wr.has(i) ? a : -a)); const z = S.sum(w); w = w.map(v => v / z); hist.push({ eps, a, w: w.slice(), before, wr }); }
      return hist; };
    function draw() { out.innerHTML = ''; const H = run(), ok = H.every(x => !x.bad);
      const g = h('div', { class: 'grid2', style: { gridTemplateColumns: 'repeat(4,1fr)', gap: '8px' } });
      H.forEach((st, k) => { const b = h('div'), sv = U.svgBox(b, 200, 150), y = U.scale(0, .3, 120, 10), bw = 17; [0, .1, .2, .3].forEach(t => { U.s('line', { x1: 22, x2: 198, y1: y(t), y2: y(t), class: 'grid' }, sv); U.s('text', { x: 19, y: y(t) + 4, 'text-anchor': 'end', text: t.toFixed(1), style: 'font-size:9px' }, sv); });
        st.w.forEach((v, i) => { const wrong = st.wr && st.wr.has(i); U.s('rect', { x: 25 + i * bw, y: y(Math.min(v, .3)), width: bw - 3, height: y(0) - y(Math.min(v, .3)), fill: wrong ? C.bad : C.accent, rx: 2 }, sv); U.s('text', { x: 25 + i * bw + (bw - 3) / 2, y: 134, 'text-anchor': 'middle', text: i + 1, style: 'font-size:9px' }, sv); });
        g.append(h('div', null, h('b', { style: { fontSize: '13px' } }, k ? `第 ${k} 輪後` : '初始：每筆一樣重'), b, h('div', { class: 'mono', style: { fontSize: '12px', color: 'var(--muted)' } }, k ? (st.bad ? `ε = ${st.eps.toFixed(3)} → 停止` : `ε = ${st.eps.toFixed(3)}　α = ${st.a.toFixed(3)}`) : 'w = 1/10 = 0.100'))); });
      const lines = [h('div', null, '【初始】每筆權重 w = 1/10 = 0.100')]; H.slice(1).forEach((st, k) => { const ws = [...st.wr].map(i => i + 1).join(', ');
        if (st.bad) { lines.push(h('div', { style: { color: 'var(--bad)' } }, `【第 ${k + 1} 輪】分錯 {${ws}}，ε = ${st.eps.toFixed(4)}：${st.eps <= 0 ? '全對，α 無限大——一個分類器就完美，不需要 Boosting' : 'ε ≥ 0.5，比亂猜還差，AdaBoost 會丟棄這個分類器'}。`)); return; }
        const i0 = [...st.wr][0], j0 = [...Array(10).keys()].find(i => !st.wr.has(i));
        lines.push(h('div', null, `【第 ${k + 1} 輪】h${k + 1} 分錯 {${ws}}：ε = ${[...st.wr].map(i => st.before[i].toFixed(4)).join(' + ')} = ${st.eps.toFixed(4)}；α = 0.5 × ln(${(1 - st.eps).toFixed(4)} / ${st.eps.toFixed(4)}) = ${st.a.toFixed(4)}`), h('div', { style: { paddingLeft: '1.2em', color: 'var(--muted)' } }, `→ 分錯者 ${st.before[i0].toFixed(4)} → ${st.w[i0].toFixed(4)}（×${(st.w[i0] / st.before[i0]).toFixed(2)}）；分對者 ${st.before[j0].toFixed(4)} → ${st.w[j0].toFixed(4)}`)); });
      const AL = H.slice(1).filter(x => !x.bad), score = [...Array(10).keys()].map(i => S.sum(AL.map(st => st.wr.has(i) ? -st.a : st.a))), fw = score.map((s, i) => s > 0 ? null : i + 1).filter(Boolean);
      if (ok) lines.push(h('div', { style: { marginTop: '4px', fontWeight: 700 } }, `【最終】H(x) = sign( ${AL.map((st, k) => `${st.a.toFixed(4)}·h${k + 1}`).join(' + ')} )`));
      const sel = h('div', { class: 'row', style: { gap: '4px' } }, lbl(`點樣本切換「第 ${ed + 1} 輪分錯」：`), [...Array(10).keys()].map(i => { const on = W[ed].includes(i); const b = h('button', { class: 'btn sm' + (on ? '' : ''), style: on ? { background: 'var(--bad)', color: '#fff', borderColor: 'var(--bad)' } : {} }, i + 1); b.onclick = () => { W[ed] = on ? W[ed].filter(x => x !== i) : [...W[ed], i].sort((a, b) => a - b); draw(); }; return b; }));
      out.append(sel, g, h('div', { class: 'note', style: { fontFamily: 'var(--mono)', fontSize: '13px' } }, lines),
        ok ? nt(fw.length ? `最終投票：樣本 ${fw.join('、')} 的加權票 ≤ 0，仍被 H(x) 判錯。例如樣本 7：+${AL[0].a.toFixed(3)} +${AL[1] ? AL[1].a.toFixed(3) : 0} −${AL[2] ? AL[2].a.toFixed(3) : 0} = ${score[6].toFixed(3)}。三輪不夠，Boosting 會繼續加分類器——也說明 ε 逐輪下降只是本例的設計。` : '最終加權投票把十筆都判對了：每一筆被分錯的那一輪，都被其他輪的票數蓋過。', fw.length ? 'warn' : '') : ''); }
    ctl.append(row(lbl('編輯'), seg([[0, '第 1 輪'], [1, '第 2 輪'], [2, '第 3 輪']], () => ed, v => ed = v, draw), h('button', { class: 'btn sm', onclick: () => { W = [[0, 1, 2], [3, 4, 5], [6, 7]]; draw(); } }, '↺ 講義例子')));
    $('#w-ada').append(ctl, out); draw();
  })();
  (function () {
    const gen = (r, N) => Array.from({ length: N }, () => { const x = [r() * 9, r() * 9]; let y = (x[1] > 1.2 + .55 * x[0] + 1.2 * Math.sin(x[0])) ? 1 : 0; if (r() < .06) y = 1 - y; return { x, y }; });
    const R = rng(55), TR = gen(R, 120), TE = gen(R, 600), yy = TR.map(p => p.y ? 1 : -1);
    const stump = w => { let best = null; [0, 1].forEach(j => { const s = TR.map((p, i) => i).sort((a, b) => TR[a].x[j] - TR[b].x[j]); let wl = 0; const tot = S.sum(TR.map((p, i) => yy[i] * w[i]));
      for (let k = 0; k < s.length - 1; k++) { wl += yy[s[k]] * w[s[k]]; const t = (TR[s[k]].x[j] + TR[s[k + 1]].x[j]) / 2; [1, -1].forEach(pol => { const sc = pol * (-wl + (tot - wl)); if (!best || sc > best.sc) best = { sc, j, t, pol }; }); } }); return best; };
    const T = 60, ST = []; let w = TR.map(() => 1 / TR.length); const WH = [w.slice()];
    for (let t = 0; t < T; t++) { const s = stump(w), hp = x => (x[s.j] > s.t ? 1 : -1) * s.pol, err = S.sum(TR.map((p, i) => hp(p.x) !== yy[i] ? w[i] : 0)), e = Math.min(Math.max(err, 1e-6), .499), a = .5 * Math.log((1 - e) / e); ST.push({ ...s, a, hp });
      w = w.map((v, i) => v * Math.exp(-a * yy[i] * hp(TR[i].x))); const z = S.sum(w); w = w.map(v => v / z); WH.push(w.slice()); }
    const F = (k, x) => S.sum(ST.slice(0, k).map(s => s.a * s.hp(x))), accK = (k, P) => S.mean(P.map(p => ((F(k, p.x) > 0 ? 1 : 0) === p.y) ? 1 : 0));
    const curve = [1, 2, 3, 5, 8, 12, 20, 30, 45, 60].map(k => [k, accK(k, TR), accK(k, TE)]);
    let k = 1; const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; const wk = WH[k], last = ST[k - 1], b = h('div');
      map2(b, x => F(k, x) > 0 ? 1 : 0, TR, { w: 380, h: 340, n: 50, r: i => 1.8 + Math.sqrt(wk[i] * TR.length) * 2.4, over: [(sv, x, y) => { if (last.j === 0) U.s('line', { x1: x(last.t), x2: x(last.t), y1: y(0), y2: y(9), stroke: C.amber, 'stroke-width': 2.4, 'stroke-dasharray': '6 3' }, sv); else U.s('line', { x1: x(0), x2: x(9), y1: y(last.t), y2: y(last.t), stroke: C.amber, 'stroke-width': 2.4, 'stroke-dasharray': '6 3' }, sv); }] });
      const c = h('div'); lc(c, [{ pts: curve.map(r => [r[0], r[1]]), color: C.accent, dots: true }, { pts: curve.map(r => [r[0], r[2]]), color: C.bad, dots: true }], { w: 330, h: 220, xmin: 1, xmax: 60, ymin: .6, ymax: 1, xt: [1, 10, 20, 30, 40, 50, 60], yfmt: t => Math.round(t * 100) + '%', xl: '棵數（決策樁）', marks: [{ x: k, color: C.amber }], legend: [['訓練', C.accent], ['測試', C.bad]], legW: 60 });
      out.append(h('div', { class: 'grid2', style: { alignItems: 'center' } }, cap(b, 400), h('div', null, h('div', { class: 'kpi' }, h('div', null, h('div', { class: 'k' }, '第 ' + k + ' 刀的 α'), h('div', { class: 'v' }, last.a.toFixed(3))), h('div', null, h('div', { class: 'k' }, '測試準確率'), h('div', { class: 'v' }, (accK(k, TE) * 100).toFixed(1) + '%'))), cap(c, 340),
        nt(k === 1 ? '一刀只能畫一條直線（橘色虛線）——很弱的分類器。往右拉，看邊界怎麼一刀一刀變彎。' : '每一刀都只是一條直線，但疊起來就能逼近彎曲的邊界：多個弱但互補的模型組成強模型。大點＝目前權重高的樣本，多半在邊界附近或是標錯的點——標錯的點會被一路放大。')))); }
    ctl.append(row(slider('疊幾刀', 1, T, 1, () => k, v => k = v, draw)));
    $('#w-adamap').append(ctl, out); draw();
  })();

  // ================= P06 梯度提升 =================
  (function () {
    const f = x => Math.sin(x) * 1.2 + .25 * x, r = rng(606), mk = N => Array.from({ length: N }, () => { const x = r() * 10; return [x, f(x) + .45 * randn(r)]; });
    const TR = mk(60), VA = mk(80), Ys = TR.map(p => p[1]), m0 = S.mean(Ys);
    const rtree = (X, R, d) => { if (d === 0 || X.length < 4) return { v: S.mean(R) }; const id = X.map((_, i) => i).sort((a, b) => X[a] - X[b]); let best = null, sl = 0, sl2 = 0; const st = S.sum(R), st2 = S.sum(R.map(v => v * v)), n = R.length;
      for (let k = 0; k < n - 1; k++) { const v = R[id[k]]; sl += v; sl2 += v * v; if (k < 1 || X[id[k]] === X[id[k + 1]]) continue; const nl = k + 1, nr = n - nl, sse = sl2 - sl * sl / nl + (st2 - sl2) - (st - sl) ** 2 / nr; if (!best || sse < best.sse) best = { sse, t: (X[id[k]] + X[id[k + 1]]) / 2 }; }
      if (!best) return { v: S.mean(R) }; const L = [], RR = [], LX = [], RX = []; X.forEach((x, i) => x <= best.t ? (LX.push(x), L.push(R[i])) : (RX.push(x), RR.push(R[i]))); return { t: best.t, l: rtree(LX, L, d - 1), r: rtree(RX, RR, d - 1) }; };
    const tp = (t, x) => { while (t.t != null) t = x <= t.t ? t.l : t.r; return t.v; };
    const cache = {}, MAXN = 300; const fit = (lr, d) => { const key = lr + '|' + d; if (cache[key]) return cache[key]; const X = TR.map(p => p[0]); let F = TR.map(() => m0), Fv = VA.map(() => m0); const trees = [], tr = [], va = [];
      for (let m = 1; m <= MAXN; m++) { const res = Ys.map((y, i) => y - F[i]), t = rtree(X, res, d); trees.push(t); F = F.map((v, i) => v + lr * tp(t, X[i])); Fv = Fv.map((v, i) => v + lr * tp(t, VA[i][0])); tr.push(S.mean(F.map((v, i) => (v - Ys[i]) ** 2))); va.push(S.mean(Fv.map((v, i) => (v - VA[i][1]) ** 2))); }
      return cache[key] = { trees, tr, va, best: va.indexOf(Math.min(...va)) + 1 }; };
    let lr = .1, d = 2, n = 20; const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; const R = fit(lr, d), G = Array.from({ length: 101 }, (_, i) => i / 10), pred = x => m0 + lr * S.sum(R.trees.slice(0, n).map(t => tp(t, x)));
      const a = h('div'); lc(a, [{ pts: VA.map(p => [p[0], p[1]]), dots: true, dotsOnly: true, color: '#c9ced4', r: 2.5 }, { pts: TR.map(p => [p[0], p[1]]), dots: true, dotsOnly: true, color: C.blue, r: 3 }, { pts: G.map(x => [x, f(x)]), color: C.ink, w: 1.5, dash: '5 4' }, { pts: G.map(x => [x, pred(x)]), color: C.bad, w: 2.6 }], { w: 400, h: 260, xmin: 0, xmax: 10, ymin: -2, ymax: 4.5, xl: 'x', legend: [['訓練點', C.blue], ['真實關係', C.ink, '5 4'], [`${n} 棵的預測`, C.bad]], legW: 96 });
      const b = h('div'), mx = Math.max(R.va[0], R.tr[0]) * 1.05; lc(b, [{ pts: R.tr.map((v, i) => [i + 1, v]), color: C.accent }, { pts: R.va.map((v, i) => [i + 1, v]), color: C.bad }], { w: 360, h: 260, xmin: 1, xmax: MAXN, ymin: 0, ymax: Math.min(mx, 2.5), xl: '棵數', yl: 'MSE', marks: [{ x: n, color: C.amber, label: '目前' }, { x: R.best, color: C.good, label: '早停點', dy: 14 }], legend: [['訓練誤差', C.accent], ['驗證誤差', C.bad]] });
      const over = n > R.best * 1.6 && R.va[n - 1] > R.va[R.best - 1] * 1.08, under = n < R.best * .4;
      const msg = under ? `只有 ${n} 棵、學習率 ${lr}：每棵只補一點點殘差，還沒走到——欠擬合。` : over ? `已經過了早停點（第 ${R.best} 棵）：訓練誤差還在降，驗證誤差卻回升——開始擬合雜訊。` : `接近早停點（第 ${R.best} 棵）。學習率 ${lr} 時最佳棵數約 ${R.best}；把學習率減半，最佳棵數大致加倍。`;
      out.append(h('div', { class: 'grid2' }, h('div', null, ttl('預測曲線'), cap(a, 420)), h('div', null, ttl('誤差曲線（綠線＝驗證誤差最低點）'), cap(b, 380))), h('div', { class: 'kpi' }, h('div', null, h('div', { class: 'k' }, '訓練 MSE'), h('div', { class: 'v' }, R.tr[n - 1].toFixed(3))), h('div', null, h('div', { class: 'k' }, '驗證 MSE'), h('div', { class: 'v ' + (over ? 'bad' : '') }, R.va[n - 1].toFixed(3))), h('div', null, h('div', { class: 'k' }, '早停建議棵數'), h('div', { class: 'v good' }, R.best))), nt(msg, over || under ? 'warn' : '')); }
    ctl.append(row(lbl('學習率'), seg([[.05, '0.05'], [.1, '0.1'], [.3, '0.3'], [1, '1.0']], () => lr, v => lr = v, draw), lbl('樹深'), seg([[1, '1（樁）'], [2, '2'], [4, '4']], () => d, v => d = v, draw), slider('棵數', 1, MAXN, 1, () => n, v => n = v, draw)));
    $('#w-gb').append(ctl, out); draw();
  })();
  (function () {
    const tree = (sv, ox, edges, leafs, hl) => { edges.forEach(([a, b]) => U.s('line', { x1: ox + a[0], y1: a[1], x2: ox + b[0], y2: b[1], stroke: '#8a929c', 'stroke-width': 1.6 }, sv)); const nodes = new Map(); edges.forEach(([a, b]) => { nodes.set(a.join(), a); nodes.set(b.join(), b); });
      nodes.forEach(p => { const leaf = leafs.some(l => l[0] === p[0] && l[1] === p[1]); U.s('circle', { cx: ox + p[0], cy: p[1], r: 7, fill: leaf ? '#fff' : (hl && hl.some(q => q[0] === p[0] && q[1] === p[1]) ? C.amber : C.accent), stroke: C.accent, 'stroke-width': 2 }, sv); }); };
    const b = h('div'), sv = U.svgBox(b, 720, 200);
    const L1 = [[[90, 20], [45, 75]], [[90, 20], [135, 75]], [[45, 75], [20, 135]], [[45, 75], [70, 135]], [[135, 75], [110, 135]], [[135, 75], [160, 135]]];
    tree(sv, 30, L1, [[20, 135], [70, 135], [110, 135], [160, 135]]);
    const L2 = [[[60, 15], [25, 55]], [[60, 15], [95, 55]], [[95, 55], [70, 95]], [[95, 55], [125, 95]], [[125, 95], [105, 140]], [[125, 95], [150, 140]]];
    tree(sv, 270, L2, [[25, 55], [70, 95], [105, 140], [150, 140]], [[95, 55], [125, 95]]);
    tree(sv, 510, L1, [[20, 135], [70, 135], [110, 135], [160, 135]]); U.s('text', { x: 510 + 155, y: 24, text: 'x₁ < 3.5', style: 'font-size:11px' }, sv); U.s('text', { x: 510 + 170, y: 80, text: 'x₂ < 7.0（整層同一條件）', style: 'font-size:11px' }, sv);
    [['XGBoost：逐層生長', 120], ['LightGBM：逐葉生長', 360], ['CatBoost：對稱樹', 600]].forEach(([t, x]) => U.s('text', { x, y: 180, 'text-anchor': 'middle', text: t, style: 'font-weight:700;font-size:13px' }, sv));
    $('#w-grow').append(cap(b, 740), h('div', { class: 'concept' }, h('div', null, h('b', null, 'XGBoost 逐層'), '整層一起長，樹形對稱。穩定、不易過擬合，但會長出沒用的分支。要穩定、文件齊全 → XGBoost'), h('div', null, h('b', null, 'LightGBM 逐葉'), '每次挑增益最大的葉子往下長（橘色）。同樣葉數下更準更快，小資料易過擬合（限制 max_depth）。資料大又趕時間 → LightGBM'), h('div', null, h('b', null, 'CatBoost 對稱'), '同一層用同一個切分條件，預測極快；原生處理類別特徵、避免目標洩漏。醫療資料類別特徵多 → CatBoost')),
      h('div', { class: 'tscroll' }, h('table', { class: 'dt' }, h('tr', null, ['參數', '作用', '建議起點'].map(c => h('th', null, c))), [['learning_rate 學習率', '每棵樹的貢獻比例', '0.05 – 0.1'], ['n_estimators 棵數', '總共長幾棵', '★ 設大一點＋早停'], ['max_depth 樹深', '單棵樹的複雜度', '3 – 6（比隨機森林淺）'], ['subsample', '每棵樹用多少資料', '0.8'], ['early_stopping 早停', '驗證分數不再進步就停', '★ 一定要開']].map(r => h('tr', null, r.map((v, j) => h('td', { style: { fontWeight: j ? 400 : 600 } }, v)))))),
      h('p', { class: 'ai' }, '演進：AdaBoost（1997，調樣本權重）→ Gradient Boosting（2001，擬合殘差）→ XGBoost（2014，正則化＋平行化）→ LightGBM（2017，逐葉＋直方圖）→ CatBoost（2018，類別特徵）。AI Studio 內建 Gradient Boosted Trees；LightGBM、CatBoost 需透過 Python。'));
  })();

  // ================= P07 投票與 Stacking =================
  (function () {
    const P = [['決策樹', .55], ['kNN', .52], ['邏輯斯迴歸', .10]]; let th = .5; const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; const votes = P.filter(p => p[1] >= th).length, hard = votes >= 2, avg = S.mean(P.map(p => p[1])), soft = avg >= th;
      const bars = h('div', null, P.map(([n, p]) => h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', margin: '6px 0' } }, h('div', { style: { width: '84px', fontWeight: 600, fontSize: '14px' } }, n), h('div', { style: { flex: 1, height: '14px', background: 'var(--line)', borderRadius: '7px', position: 'relative', overflow: 'hidden' } }, h('div', { style: { width: p * 100 + '%', height: '100%', background: p >= th ? C.bad : C.blue } }), h('div', { style: { position: 'absolute', left: th * 100 + '%', top: 0, bottom: 0, width: '2px', background: C.ink } })), h('span', { class: 'mono', style: { width: '40px' } }, p.toFixed(2)), h('span', { class: 'tag ' + (p >= th ? 'bad' : 'blue') }, p >= th ? '投「是」' : '投「否」'))));
      out.append(h('div', { class: 'grid2', style: { alignItems: 'center' } }, bars, h('div', { class: 'kpi' }, h('div', null, h('div', { class: 'k' }, `硬投票（${votes}:${3 - votes}）`), h('div', { class: 'v ' + (hard ? 'bad' : '') }, hard ? '會再入院' : '不會')), h('div', null, h('div', { class: 'k' }, `軟投票（平均 ${avg.toFixed(2)}）`), h('div', { class: 'v ' + (soft ? 'bad' : '') }, soft ? '會再入院' : '不會')))),
        nt(hard !== soft ? `兩種投票給出相反的答案：${hard ? '兩張「勉強過半」的票蓋過了一張「非常確定」的票' : '軟投票保留了信心程度'}。只要成員能輸出可比較的機率，優先用軟投票——前提是各成員的機率已校準（P16）。` : '兩種投票結論一致。試著把某個模型拉到很確定（接近 0 或 1），看兩者何時分歧。', hard !== soft ? 'warn' : '')); }
    P.forEach(p => ctl.append(slider(p[0], 0, 1, .01, () => p[1], v => p[1] = v, draw, v => (+v).toFixed(2))));
    ctl.append(slider('判定門檻', .1, .9, .05, () => th, v => th = v, draw, v => (+v).toFixed(2)));
    ctl.className = 'row'; $('#w-vote').append(ctl, out); draw();
  })();
  (function () {
    const gen = (r, N) => Array.from({ length: N }, () => { const y = r() < .5 ? 1 : 0, x = y ? [5.4 + 1.5 * randn(r), 5.2 + 1.5 * randn(r)] : [3.6 + 1.5 * randn(r), 3.8 + 1.5 * randn(r)]; return { x, y }; });
    const R = rng(707), TR = gen(R, 200), TE = gen(R, 1000);
    const knn1 = (P, x, skip) => { let b = Infinity, y = 0; P.forEach((p, i) => { if (i === skip) return; const d = ML.d2(p.x, x); if (d < b) { b = d; y = p.y; } }); return y; };
    const lg = P => { const b = ML.logistic(P.map(p => [(p.x[0] - 4.5) / 1.8, (p.x[1] - 4.5) / 1.8]), P.map(p => p.y), null, { lr: .5, iters: 300 }); return x => ML.sigmoid(ML.predict(b, [(x[0] - 4.5) / 1.8, (x[1] - 4.5) / 1.8])); };
    const LG = lg(TR), K = 5, fold = TR.map((_, i) => i % K);
    const inS = TR.map(p => [knn1(TR, p.x), LG(p.x)]);
    const oof = TR.map(() => [0, 0]); for (let k = 0; k < K; k++) { const tr = TR.filter((_, i) => fold[i] !== k), l = lg(tr); TR.forEach((p, i) => { if (fold[i] === k) oof[i] = [knn1(tr, p.x), l(p.x)]; }); }
    const teF = TE.map(p => [knn1(TR, p.x), LG(p.x)]);
    const meta = F => ML.logistic(F, TR.map(p => p.y), null, { lr: .8, iters: 600 });
    const evalM = (b, F, Y) => S.mean(F.map((f, i) => ((ML.sigmoid(ML.predict(b, f)) >= .5 ? 1 : 0) === Y[i]) ? 1 : 0));
    const bIn = meta(inS), bOof = meta(oof), Ytr = TR.map(p => p.y), Yte = TE.map(p => p.y);
    const res = { in: { b: bIn, tr: evalM(bIn, inS, Ytr), te: evalM(bIn, teF, Yte) }, oof: { b: bOof, tr: evalM(bOof, oof, Ytr), te: evalM(bOof, teF, Yte) } };
    const base1 = S.mean(teF.map((f, i) => (f[0] === Yte[i]) ? 1 : 0)), base2 = S.mean(teF.map((f, i) => ((f[1] >= .5 ? 1 : 0) === Yte[i]) ? 1 : 0));
    let mode = 'in'; const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; const F = mode === 'in' ? inS : oof, r = res[mode];
      const t = h('table', { class: 'dt' }, h('tr', null, ['病人', '1-NN 預測', '邏輯斯 機率', '實際'].map(c => h('th', null, c))), F.slice(0, 8).map((f, i) => h('tr', null, h('td', null, '#' + (i + 1)), h('td', { class: 'num' + (f[0] === TR[i].y ? '' : ' hl') }, f[0]), h('td', { class: 'num' }, f[1].toFixed(2)), h('td', { class: 'num' }, TR[i].y))));
      const w = r.b.slice(1), ws = Math.abs(w[0]) + Math.abs(w[1]);
      out.append(h('div', { class: 'grid2' }, h('div', null, ttl(mode === 'in' ? '第二層看到的特徵：第一層「訓練時」的預測' : '第二層看到的特徵：5 折 out-of-fold 預測'), h('div', { class: 'tscroll' }, t), h('div', { style: { fontSize: '12.5px', color: 'var(--muted)' } }, mode === 'in' ? '1-NN 對訓練資料的預測就是它自己的標籤——永遠「全對」。' : '每一筆的預測都來自沒看過它的那 4 折模型；1-NN 開始會錯（標色）。')),
        h('div', null, h('div', { class: 'kpi' }, h('div', null, h('div', { class: 'k' }, '第二層給 1-NN 的權重比例'), h('div', { class: 'v ' + (mode === 'in' ? 'bad' : '') }, Math.round(Math.abs(w[0]) / ws * 100) + '%')), h('div', null, h('div', { class: 'k' }, '你看到的訓練分數'), h('div', { class: 'v' }, (r.tr * 100).toFixed(1) + '%')), h('div', null, h('div', { class: 'k' }, '上線後（測試）'), h('div', { class: 'v ' + (mode === 'in' ? 'bad' : 'good') }, (r.te * 100).toFixed(1) + '%'))),
          h('div', { style: { fontSize: '13px', color: 'var(--muted)', margin: '6px 0' } }, `對照：單獨 1-NN 測試 ${(base1 * 100).toFixed(1)}%；單獨邏輯斯 ${(base2 * 100).toFixed(1)}%`),
          nt(mode === 'in' ? `第二層學到的是「1-NN 永遠對」——這只是它記住了答案。訓練分數 ${(r.tr * 100).toFixed(0)}% 很漂亮，上線後只剩 ${(r.te * 100).toFixed(1)}%，跟單獨用 1-NN 差不多。` : `用 out-of-fold 預測後，第二層知道 1-NN 其實常錯，把權重移到邏輯斯迴歸；訓練分數變得誠實，上線表現 ${(r.te * 100).toFixed(1)}%。`, mode === 'in' ? 'bad' : '')))); }
    ctl.append(row(seg([['in', '✗ 用訓練時的預測'], ['oof', '✓ 用 out-of-fold 預測']], () => mode, v => mode = v, draw)));
    $('#w-stack').append(ctl, out, h('p', { class: 'ai' }, '實務順序：先試軟投票（簡單、不易出錯）；只有在軟投票明顯不夠、且你有時間仔細處理 out-of-fold 時，才上 Stacking。AI Studio 的 Stacking 運算子：注意 meta-learner 的設定。')); draw();
  })();

  // ================= P08 代價 =================
  (function () {
    let a1 = .88, a2 = .89, ex = true, rt = false, dirty = false, chg = false; const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; const g = a2 - a1, R = [];
      if (dirty) R.push(['bad', '先修資料', '集成放大不了不存在的訊號。資料髒、標註爛、特徵沒訊息量，換再厲害的集成也救不回來——回去修資料，投報率最高。']);
      if (g <= 0) R.push(['bad', '不用集成', '集成沒有比單一模型好。']);
      else if (g < .02 && !chg) R.push(['bad', `+${g.toFixed(3)} 不值得`, '多花的維運成本、失去的可解釋性，換來不會改變任何臨床決策的增益。']);
      else if (g < .02 && chg) R.push(['warn', `+${g.toFixed(3)} 可以考慮`, '增益小但會改變決策（例如多抓到需要介入的病人）——先量化它換來幾個病人。']);
      else R.push(['good', `+${g.toFixed(3)} 有實質增益`, '集成值得一試。']);
      if (ex && g > 0 && !dirty) R.push(['warn', '需要逐案解釋', '單棵樹可以印給臨床看，100 棵樹不行。折衷：預測用集成、解釋用單一模型或 SHAP（M9，但那是另一層近似）。']);
      if (rt && g > 0 && !dirty) R.push(['warn', '即時預測', '預測時每一筆都要跑過所有成員。床邊監測要先確認延遲可接受。']);
      out.append(...R.map(([c, t, d]) => h('div', { class: 'note ' + (c === 'good' ? '' : c), style: { fontSize: '14px' } }, h('b', null, t + '：'), d))); }
    ctl.append(row(slider('單一模型 AUC', .6, .95, .01, () => a1, v => a1 = v, draw, v => (+v).toFixed(2)), slider('集成 AUC', .6, .97, .01, () => a2, v => a2 = v, draw, v => (+v).toFixed(2))), row(check('需要向臨床逐案解釋判斷依據', () => ex, v => ex = v, draw), check('需要即時（床邊）預測', () => rt, v => rt = v, draw), check('資料品質有疑慮（標註不可靠、缺值多）', () => dirty, v => dirty = v, draw), check('這個增益會改變臨床決策', () => chg, v => chg = v, draw)));
    $('#w-worth').append(ctl, out); draw();
  })();
})();
