/* M5 互動頁 A：小型神經網路引擎、PART 01–12 */
(function () {
  'use strict';
  const { h, $, S, C, rng, randn, seg, slider, check, lc } = U;
  U.initModule('m5');
  const cap = (el, px) => { el.style.maxWidth = px + 'px'; el.style.width = '100%'; el.style.margin = '0 auto'; return el; };
  const row = (...a) => h('div', { class: 'row', style: { marginBottom: '6px' } }, ...a);
  const lbl = t => h('span', { style: { fontSize: '14px', color: 'var(--muted)' } }, t);
  const nt = (t, cls = '') => h('div', { class: 'note ' + cls, style: { fontSize: '14px' } }, t);
  const ttl = t => h('b', { style: { fontSize: '13.5px' } }, t);
  const kpi = (...a) => h('div', { class: 'kpi' }, ...a.map(([k, v, c]) => h('div', null, h('div', { class: 'k' }, k), h('div', { class: 'v ' + (c || '') }, v))));
  const sig = z => 1 / (1 + Math.exp(-z));

  /* ---------- 小型 MLP（二元分類、Adam） ---------- */
  const ACT = { relu: [z => z > 0 ? z : 0, (z) => z > 0 ? 1 : 0], tanh: [Math.tanh, z => { const t = Math.tanh(z); return 1 - t * t; }], sigmoid: [sig, z => { const s = sig(z); return s * (1 - s); }], linear: [z => z, () => 1] };
  function mlp(X, y, o = {}) {
    const r = rng(o.seed || 1), sz = [X[0].length, ...(o.hidden || []), 1], L = sz.length - 1, act = ACT[o.act || 'relu'], lr = o.lr ?? .02, ep = o.epochs ?? 200, l2 = o.l2 || 0, dp = o.dropout || 0, bs = o.batch || X.length;
    const sc = l => o.init === 'zero' ? 0 : o.init === 'large' ? 10 : o.init === 'tiny' ? .01 : Math.sqrt((o.act === 'relu' || !o.act ? 2 : 1) / sz[l]);
    const W = [], B = []; for (let l = 0; l < L; l++) { W.push(Array.from({ length: sz[l + 1] }, () => Array.from({ length: sz[l] }, () => sc(l) * randn(r)))); B.push(new Array(sz[l + 1]).fill(0)); }
    const mW = W.map(m => m.map(rw => rw.map(() => 0))), vW = W.map(m => m.map(rw => rw.map(() => 0))), mB = B.map(b => b.map(() => 0)), vB = B.map(b => b.map(() => 0));
    const fwd = (x, drop) => { const A = [x], Z = [], M = []; let a = x; for (let l = 0; l < L; l++) { const z = W[l].map((rw, j) => rw.reduce((s, w, i) => s + w * a[i], B[l][j])); Z.push(z); if (l < L - 1) { const m = z.map(() => drop && dp ? (r() < dp ? 0 : 1 / (1 - dp)) : 1); M.push(m); a = z.map((v, j) => act[0](v) * m[j]); } else a = [sig(z[0])]; A.push(a); } return { A, Z, M }; };
    const loss = (XX, yy) => S.mean(XX.map((x, i) => { const p = Math.min(1 - 1e-7, Math.max(1e-7, fwd(x).A[L][0])); return -(yy[i] * Math.log(p) + (1 - yy[i]) * Math.log(1 - p)); }));
    const tr = [], va = [], gn = []; let t = 0; const idx = X.map((_, i) => i);
    for (let e = 0; e < ep; e++) { if (bs < X.length) idx.sort(() => r() - .5);
      for (let s0 = 0; s0 < X.length; s0 += bs) { const bi = idx.slice(s0, s0 + bs), gW = W.map(m => m.map(rw => rw.map(() => 0))), gB = B.map(b => b.map(() => 0));
        bi.forEach(i => { const { A, Z, M } = fwd(X[i], true); let d = [A[L][0] - y[i]]; for (let l = L - 1; l >= 0; l--) { for (let j = 0; j < d.length; j++) { gB[l][j] += d[j]; for (let k = 0; k < A[l].length; k++) gW[l][j][k] += d[j] * A[l][k]; } if (l > 0) d = A[l].map((_, k) => W[l].reduce((s, rw, j) => s + rw[k] * d[j], 0) * act[1](Z[l - 1][k]) * M[l - 1][k]); } });
        t++; const n = bi.length; let g1 = 0;
        for (let l = 0; l < L; l++) { for (let j = 0; j < W[l].length; j++) { for (let k = 0; k < W[l][j].length; k++) { const g = gW[l][j][k] / n + l2 * W[l][j][k]; if (l === 0) g1 += g * g; if (o.opt === 'sgd') W[l][j][k] -= lr * g; else { mW[l][j][k] = .9 * mW[l][j][k] + .1 * g; vW[l][j][k] = .999 * vW[l][j][k] + .001 * g * g; W[l][j][k] -= lr * (mW[l][j][k] / (1 - .9 ** t)) / (Math.sqrt(vW[l][j][k] / (1 - .999 ** t)) + 1e-8); } }
            const g = gB[l][j] / n; if (o.opt === 'sgd') B[l][j] -= lr * g; else { mB[l][j] = .9 * mB[l][j] + .1 * g; vB[l][j] = .999 * vB[l][j] + .001 * g * g; B[l][j] -= lr * (mB[l][j] / (1 - .9 ** t)) / (Math.sqrt(vB[l][j] / (1 - .999 ** t)) + 1e-8); } } }
        gn.push(Math.sqrt(g1)); }
      if (!o.fast || e % 5 === 4 || e === ep - 1) { tr.push([e + 1, loss(X, y)]); if (o.Xv) va.push([e + 1, loss(o.Xv, o.yv)]); } }
    const f = x => fwd(x).A[L][0]; return { f, tr, va, W, gn, nparam: W.reduce((s, m, l) => s + m.length * (m[0].length + 1), 0) };
  }
  const accOf = (f, X, y) => S.mean(X.map((x, i) => ((f(x) >= .5 ? 1 : 0) === y[i]) ? 1 : 0));
  const map2 = (box, f, X, y, o = {}) => U.scatter(box, X.map((p, i) => ({ x: p[0], y: p[1], c: y[i] ? C.bad : C.blue, r: 3, op: .9 })), { w: o.w || 330, h: o.h || 300, xmin: -3, xmax: 3, ymin: -3, ymax: 3, noGrid: true, xlabel: o.xl || '特徵 1', ylabel: o.yl || '特徵 2', under: [(sv, x, yy) => ML.regionMap(sv, x, yy, (a, b) => f([a, b]), -3, 3, -3, 3, o.n || 44, o.n || 44)] });
  const ring = (r, N, noise = .12) => { const X = [], y = []; for (let i = 0; i < N; i++) { const p = [r() * 6 - 3, r() * 6 - 3], d = Math.hypot(p[0], p[1]); let c = d < 1.6 + .25 * Math.sin(3 * Math.atan2(p[1], p[0])) ? 1 : 0; if (r() < noise) c = 1 - c; X.push(p); y.push(c); } return { X, y }; };
  const M5 = window.M5 = { cap, row, lbl, nt, ttl, kpi, mlp, accOf, map2, ring, sig };

  // ================= P01 =================
  U.sorter('#w-type', [['胸部 X 光影像 3,000 張，篩檢異常', '深度學習有優勢', '影像：但資料少 → 一定用遷移學習。'], ['病歷欄位 8,000 筆，預測 30 天再入院', '樹模型通常較好', '表格資料、量不大、需要解釋。'], ['語音門診紀錄轉成文字', '深度學習有優勢', '用現成預訓練模型（如 Whisper），不要自己訓練。'], ['檢驗值＋人口學欄位 2,000 筆，預測住院天數', '樹模型通常較好', '表格＋小資料。'], ['傷口照片判斷癒合階段', '深度學習有優勢', '影像任務；遷移學習＋資料增強。'], ['急診每日人次（3 年日資料）', '樹模型通常較好', '序列太短，LSTM 會過擬合；樹模型＋滯後特徵（M4）。']], ['深度學習有優勢', '樹模型通常較好'], '只問一件事：資料有沒有「結構」——空間（影像）、聲音、長文本。');

  // ================= P02 一堆邏輯斯迴歸 =================
  (function () {
    const R = rng(202), D = ring(R, 220, .05), T = ring(R, 400, .05); let H = 4, act = 'relu'; const cache = {}, ctl = h('div'), out = h('div');
    const get = () => { const k = H + act; if (!cache[k]) cache[k] = mlp(D.X, D.y, { hidden: H ? [H] : [], act, lr: .05, epochs: 600, seed: 7, fast: true }); return cache[k]; };
    function draw() { out.innerHTML = ''; const m = get(), b = h('div'); map2(b, m.f, D.X, D.y, { w: 380, h: 340 });
      const net = h('div'), sv = U.svgBox(net, 300, 220), lay = [2, H, 1].filter(v => v > 0), xs = lay.map((_, i) => 40 + i * (220 / (lay.length - 1 || 1))), ys = n => Array.from({ length: n }, (_, j) => 110 + (j - (n - 1) / 2) * Math.min(26, 190 / n));
      for (let l = 0; l < lay.length - 1; l++) ys(lay[l]).forEach(y1 => ys(lay[l + 1]).forEach(y2 => U.s('line', { x1: xs[l], y1, x2: xs[l + 1], y2, stroke: '#b9c0c7', 'stroke-width': .8 }, sv)));
      lay.forEach((n, l) => ys(n).forEach(yy => U.s('circle', { cx: xs[l], cy: yy, r: 9, fill: l === 0 ? '#fff' : l === lay.length - 1 ? C.bad : C.accent, stroke: C.accent, 'stroke-width': 2 }, sv)));
      ['輸入', ...(H ? ['隱藏層'] : []), '輸出'].forEach((t, i) => U.s('text', { x: xs[i], y: 212, 'text-anchor': 'middle', text: t, style: 'font-size:12px' }, sv));
      const a = accOf(m.f, T.X, T.y);
      out.append(h('div', { class: 'grid2', style: { alignItems: 'center' } }, cap(b, 400), h('div', null, cap(net, 300), kpi(['隱藏神經元', String(H)], ['可學參數', String(m.nparam)], ['測試準確率', (a * 100).toFixed(1) + '%', a > .9 ? 'good' : a < .7 ? 'bad' : '']),
        nt(H === 0 ? '0 個隱藏神經元＝邏輯斯迴歸：只能畫一條直線，圈形的資料怎麼畫都分不開。' : act === 'linear' ? '隱藏層用「線性」激活：疊再多層還是一條直線——非線性才是關鍵（P04）。' : H <= 2 ? `只有 ${H} 個隱藏神經元：每個神經元畫一條直線，組合起來能切出簡單的形狀，但還圈不住。` : `${H} 個隱藏神經元各自畫一條線，輸出層把它們組合成封閉的邊界——這就是「學出特徵的組合」。`, H === 0 || act === 'linear' ? 'warn' : '')))); }
    ctl.append(row(slider('隱藏神經元數', 0, 16, 1, () => H, v => H = v, draw), lbl('激活'), seg([['relu', 'ReLU'], ['tanh', 'Tanh'], ['linear', '線性（無激活）']], () => act, v => act = v, draw)));
    $('#w-nn').append(ctl, out); draw();
  })();

  // ================= P03 前向傳播 =================
  (function () {
    const P = { x: [.8, 1.2, .5], w1: [.5, -.3, .8], b1: .1, w2: [.2, .6, -.4], b2: -.2, v: [1.2, -.7], c: .3, y: 1 }; const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; const z1 = P.w1.reduce((s, w, i) => s + w * P.x[i], P.b1), z2 = P.w2.reduce((s, w, i) => s + w * P.x[i], P.b2), h1 = Math.max(0, z1), h2 = Math.max(0, z2), zo = P.v[0] * h1 + P.v[1] * h2 + P.c, p = sig(zo), L = -(P.y ? Math.log(p) : Math.log(1 - p));
      const sv0 = h('div'), sv = U.svgBox(sv0, 640, 250), IN = [[70, 50], [70, 125], [70, 200]], HD = [[320, 80], [320, 170]], OU = [560, 125], nm = ['年齡（標準化）', '住院天數', '共病數'];
      IN.forEach((a, i) => HD.forEach((b, j) => { const w = (j ? P.w2 : P.w1)[i]; U.s('line', { x1: a[0], y1: a[1], x2: b[0], y2: b[1], stroke: w >= 0 ? C.accent : C.bad, 'stroke-width': 1 + Math.abs(w) * 3, opacity: .7 }, sv); U.s('text', { x: a[0] + (b[0] - a[0]) * .32, y: a[1] + (b[1] - a[1]) * .32 - 4, text: w, style: 'font-size:11px;font-weight:600' }, sv); }));
      HD.forEach((b, j) => { U.s('line', { x1: b[0], y1: b[1], x2: OU[0], y2: OU[1], stroke: P.v[j] >= 0 ? C.accent : C.bad, 'stroke-width': 1 + Math.abs(P.v[j]) * 3, opacity: .7 }, sv); U.s('text', { x: (b[0] + OU[0]) / 2, y: (b[1] + OU[1]) / 2 - 6, text: P.v[j], style: 'font-size:11px;font-weight:600' }, sv); });
      IN.forEach((a, i) => { U.s('circle', { cx: a[0], cy: a[1], r: 20, fill: '#fff', stroke: C.ink, 'stroke-width': 1.5 }, sv); U.s('text', { x: a[0], y: a[1] + 4, 'text-anchor': 'middle', text: P.x[i], style: 'font-weight:700' }, sv); U.s('text', { x: a[0] - 26, y: a[1] + 4, 'text-anchor': 'end', text: nm[i], style: 'font-size:11px' }, sv); });
      [[h1, 'h1'], [h2, 'h2']].forEach(([v, n], j) => { U.s('circle', { cx: HD[j][0], cy: HD[j][1], r: 24, fill: C.soft, stroke: C.accent, 'stroke-width': 2 }, sv); U.s('text', { x: HD[j][0], y: HD[j][1] + 4, 'text-anchor': 'middle', text: v.toFixed(2), style: 'font-weight:700' }, sv); U.s('text', { x: HD[j][0], y: HD[j][1] - 30, 'text-anchor': 'middle', text: n + '（ReLU）', style: 'font-size:11px' }, sv); });
      U.s('circle', { cx: OU[0], cy: OU[1], r: 28, fill: '#fbe3df', stroke: C.bad, 'stroke-width': 2 }, sv); U.s('text', { x: OU[0], y: OU[1] + 5, 'text-anchor': 'middle', text: (p * 100).toFixed(1) + '%', style: 'font-weight:700;font-size:14px' }, sv); U.s('text', { x: OU[0], y: OU[1] + 46, 'text-anchor': 'middle', text: '再入院機率（Sigmoid）', style: 'font-size:11px' }, sv);
      const f = v => (v < 0 ? '(' + v + ')' : v);
      const lines = [['h1 的加權和', `z = ${P.w1.map((w, i) => `${f(w)}×${P.x[i]}`).join(' + ')} + ${f(P.b1)} = ${z1.toFixed(3)}`, `ReLU → ${h1.toFixed(3)}`], ['h2 的加權和', `z = ${P.w2.map((w, i) => `${f(w)}×${P.x[i]}`).join(' + ')} + ${f(P.b2)} = ${z2.toFixed(3)}`, `ReLU → ${h2.toFixed(3)}`], ['輸出層', `z = ${f(P.v[0])}×${h1.toFixed(3)} + ${f(P.v[1])}×${h2.toFixed(3)} + ${P.c} = ${zo.toFixed(3)}`, `Sigmoid → ${p.toFixed(3)}`], [`損失（真實 y = ${P.y}）`, `交叉熵 = −ln(${P.y ? p.toFixed(3) : (1 - p).toFixed(3)})`, `= ${L.toFixed(3)}`]];
      out.append(cap(sv0, 660), h('div', { class: 'tscroll' }, h('table', { class: 'dt' }, lines.map(([a, b, c]) => h('tr', null, h('td', { style: { fontWeight: 600, whiteSpace: 'nowrap' } }, a), h('td', { class: 'mono', style: { fontSize: '13px' } }, b), h('td', { class: 'mono hl', style: { whiteSpace: 'nowrap', fontWeight: 700 } }, c))))),
        nt(z1 < 0 || z2 < 0 ? `有一個隱藏神經元的加權和是負的，ReLU 把它變成 0——它這一次「沒有發言」。ReLU 負區梯度為 0，若一直這樣，這個神經元就「死掉」了。` : `訓練就是在調這些線上的數字，讓損失（${L.toFixed(3)}）越來越小。真實答案是「${P.y ? '會' : '不會'}」再入院：模型說 ${(p * 100).toFixed(1)}%，${P.y ? (p > .5 ? '方向對了' : '方向錯了，損失會很大') : (p < .5 ? '方向對了' : '方向錯了，損失會很大')}。`, z1 < 0 || z2 < 0 ? 'warn' : '')); }
    build();
    function build() { ctl.append(row(slider('年齡', -2, 2, .1, () => P.x[0], v => P.x[0] = +v.toFixed(1), draw), slider('住院天數', -2, 2, .1, () => P.x[1], v => P.x[1] = +v.toFixed(1), draw), slider('共病數', -2, 2, .1, () => P.x[2], v => P.x[2] = +v.toFixed(1), draw)), row(slider('h1←住院天數的權重', -1, 1, .1, () => P.w1[1], v => P.w1[1] = +v.toFixed(1), draw), lbl('真實答案'), seg([[1, '會再入院'], [0, '不會']], () => P.y, v => P.y = v, draw), h('button', { class: 'btn sm', onclick: () => { Object.assign(P, { x: [.8, 1.2, .5], w1: [.5, -.3, .8], y: 1 }); ctl.innerHTML = ''; build(); draw(); } }, '↺ 講義數值'))); }
    $('#w-fwd').append(ctl, out); draw();
  })();

  // ================= P04 激活函數 =================
  (function () {
    const F = { sigmoid: ['Sigmoid', sig, z => sig(z) * (1 - sig(z)), C.bad, '輸出 0–1；★ 二分類的輸出層。兩端導數趨近 0 → 不要用在隱藏層'], tanh: ['Tanh', Math.tanh, z => 1 - Math.tanh(z) ** 2, C.amber, '輸出 −1–1、以 0 為中心；同樣有梯度消失'], relu: ['ReLU', z => Math.max(0, z), z => z > 0 ? 1 : 0, C.accent, '★ 隱藏層的預設；計算快、不飽和。負區為 0 → 神經元可能死掉'], leaky: ['Leaky ReLU', z => z > 0 ? z : .1 * z, z => z > 0 ? 1 : .1, C.blue, '負區保留小斜率，解決神經元死亡；多一個超參數'] };
    let k = 'sigmoid', x0 = 2, der = true; const ctl = h('div'), out = h('div'), G = Array.from({ length: 121 }, (_, i) => -6 + i * .1);
    function draw() { out.innerHTML = ''; const [n, f, d, c, desc] = F[k], b = h('div');
      lc(b, [{ pts: G.map(x => [x, f(x)]), color: c, w: 2.8 }, ...(der ? [{ pts: G.map(x => [x, d(x)]), color: C.ink, w: 1.6, dash: '5 4' }] : [])], { w: 440, h: 260, xmin: -6, xmax: 6, ymin: -1.2, ymax: 2.2, yt: [-1, 0, 1, 2], legend: [[n, c], ...(der ? [['導數（梯度）', C.ink, '5 4']] : [])], legW: 100, over: [(sv, x, y) => { U.s('circle', { cx: x(x0), cy: y(Math.min(2.2, f(x0))), r: 6, fill: c }, sv); if (der) U.s('circle', { cx: x(x0), cy: y(d(x0)), r: 5, fill: C.ink }, sv); U.s('line', { x1: x(x0), x2: x(x0), y1: y(-1.2), y2: y(2.2), stroke: '#999', 'stroke-dasharray': '2 3' }, sv); }] });
      out.append(h('div', { class: 'grid2', style: { alignItems: 'center' } }, cap(b, 460), h('div', null, kpi([`${n}(${x0})`, f(x0).toFixed(3)], ['導數', d(x0).toFixed(3), d(x0) < .05 ? 'bad' : '']), nt(desc), nt(d(x0) < .05 ? `在 x = ${x0} 這裡，梯度只剩 ${d(x0).toFixed(3)}：誤差傳到這裡幾乎就停了——這就是「飽和」。` : '把 x 拉到 ±5 附近，看導數剩多少。', d(x0) < .05 ? 'warn' : '')))); }
    ctl.append(row(seg(Object.entries(F).map(([kk, v]) => [kk, v[0]]), () => k, v => k = v, draw), slider('x', -6, 6, .5, () => x0, v => x0 = v, draw), check('顯示導數', () => der, v => der = v, draw)));
    $('#w-act').append(ctl, out); draw();
  })();
  (function () {
    let n = 10; const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; const Ls = Array.from({ length: n }, (_, i) => i + 1), b = h('div');
      lc(b, [{ pts: Ls.map(l => [l, Math.log10(.25 ** l)]), color: C.bad, w: 2.4, dots: true }, { pts: Ls.map(l => [l, 0]), color: C.accent, w: 2.4, dots: true }], { w: 460, h: 240, xmin: 1, xmax: n, ymin: Math.min(-1, Math.floor(Math.log10(.25 ** n))), ymax: .5, yfmt: t => '10^' + Math.round(t), xl: '往回傳了幾層', yl: '梯度剩下的比例', legend: [['Sigmoid（每層 ×0.25）', C.bad], ['ReLU（正區每層 ×1）', C.accent]], legW: 160 });
      out.append(h('div', { class: 'grid2', style: { alignItems: 'center' } }, cap(b, 480), h('div', null, kpi([`Sigmoid ${n} 層後`, (.25 ** n).toExponential(1), 'bad'], ['ReLU', '1']), nt(`Sigmoid 的導數最大只有 0.25。往回傳 ${n} 層，最好的情況也只剩 0.25^${n} ≈ ${(.25 ** n).toExponential(1)}——前面幾層幾乎學不動（梯度消失）。處方：隱藏層改用 ReLU、加殘差連接（P16）、Batch Normalization。反過來梯度連乘後急速放大就是梯度爆炸（Loss 變 NaN）：梯度裁剪、降學習率。`)))); }
    ctl.append(row(slider('層數', 2, 20, 1, () => n, v => n = v, draw)));
    $('#w-vanish').append(ctl, out); draw();
  })();

  // ================= P05 梯度下降 =================
  (function () {
    const Lf = w => .5 * (w - 1) ** 2 + .4, dL = w => (w - 1);
    let lr = .3, st = 25; const ctl = h('div'), out = h('div'), G = Array.from({ length: 161 }, (_, i) => -3 + i * .05);
    function draw() { out.innerHTML = ''; let w = -2.6; const path = [[w, Lf(w)]]; let div = false; for (let i = 0; i < st; i++) { w -= lr * dL(w); if (Math.abs(w) > 30) { div = true; break; } path.push([w, Lf(w)]); }
      const b = h('div'); lc(b, [{ pts: G.map(x => [x, Lf(x)]), color: '#9aa3ad', w: 2.2 }, { pts: path.map(p => [Math.max(-3, Math.min(3, p[0])), p[1]]), color: C.bad, w: 1.4, dots: true, r: 4 }], { w: 460, h: 260, xmin: -3, xmax: 3, ymin: 0, ymax: 8, xl: '權重值 w', yl: '損失', over: [(sv, x, y) => { const e = path[path.length - 1]; U.s('circle', { cx: x(Math.max(-3, Math.min(3, e[0]))), cy: y(Math.min(8, e[1])), r: 8, fill: 'none', stroke: C.ink, 'stroke-width': 2.4 }, sv); U.s('text', { x: x(1), y: y(.4) + 16, 'text-anchor': 'middle', text: '谷底', style: 'font-size:11px' }, sv); }] });
      const fin = path[path.length - 1], good = !div && Math.abs(fin[0] - 1) < .05;
      const msg = div ? `學習率 ${lr} 太大：每一步都跨過谷底而且越跳越遠——發散（實務上 Loss 會變成 NaN）。` : lr <= .05 ? `學習率 ${lr} 太小：${st} 步後還在半山腰，訓練不完。` : lr > 1 ? `學習率 ${lr}：每一步都跨過谷底、在兩側來回彈跳${good ? '，最後才勉強收斂' : ''}。Loss 上下亂跳時，第一個該懷疑的就是學習率。` : `學習率 ${lr}：每一步都往谷底走，穩定收斂。`;
      out.append(h('div', { class: 'grid2', style: { alignItems: 'center' } }, cap(b, 480), h('div', null, kpi(['最後的 w（谷底在 1）', div ? '發散' : fin[0].toFixed(3), div ? 'bad' : good ? 'good' : ''], ['最後的損失', div ? 'NaN' : fin[1].toFixed(3), good ? 'good' : 'bad']), nt(msg, good && lr <= 1 ? '' : 'warn')))); }
    ctl.append(row(lbl('學習率'), seg([[.02, '0.02'], [.3, '0.3'], [1.5, '1.5'], [1.9, '1.9'], [2.1, '2.1']], () => lr, v => lr = v, draw), slider('走幾步', 1, 60, 1, () => st, v => st = v, draw)));
    $('#w-gd').append(ctl, out); draw();
  })();
  (function () {
    const f = (x, y) => .05 * x * x + 2 * y * y, g = (x, y) => [.1 * x, 4 * y]; let lr = .2, n = 40; const ctl = h('div'), out = h('div');
    const run = kind => { let x = -9, y = 1.6, vx = 0, vy = 0, mx = 0, my = 0, sx = 0, sy = 0; const P = [[x, y]]; for (let t = 1; t <= n; t++) { const [gx, gy] = g(x, y);
      if (kind === 'sgd') { x -= lr * gx; y -= lr * gy; } else if (kind === 'mom') { vx = .9 * vx + gx; vy = .9 * vy + gy; x -= lr * vx; y -= lr * vy; } else { const a = lr * 2.5; mx = .9 * mx + .1 * gx; my = .9 * my + .1 * gy; sx = .999 * sx + .001 * gx * gx; sy = .999 * sy + .001 * gy * gy; x -= a * (mx / (1 - .9 ** t)) / (Math.sqrt(sx / (1 - .999 ** t)) + 1e-8); y -= a * (my / (1 - .9 ** t)) / (Math.sqrt(sy / (1 - .999 ** t)) + 1e-8); }
      if (!Number.isFinite(x) || Math.abs(y) > 50) break; P.push([x, y]); } return P; };
    function draw() { out.innerHTML = ''; const R = { sgd: run('sgd'), mom: run('mom'), adam: run('adam') }, CL = { sgd: C.bad, mom: C.amber, adam: C.accent };
      const b = h('div'); U.scatter(b, [], { w: 560, h: 260, xmin: -10, xmax: 2, ymin: -2.2, ymax: 2.2, noGrid: true, xlabel: '權重 1（平緩方向）', ylabel: '權重 2（陡峭方向）', under: [(sv, x, y) => { [.5, 1.5, 3, 5, 8].forEach(lv => { const pts = []; for (let a = 0; a <= 64; a++) { const t = a / 64 * 2 * Math.PI; pts.push(`${x(Math.sqrt(lv / .05) * Math.cos(t))},${y(Math.sqrt(lv / 2) * Math.sin(t))}`); } U.s('polyline', { points: pts.join(' '), fill: 'none', stroke: '#d6d2c8' }, sv); }); U.s('circle', { cx: x(0), cy: y(0), r: 5, fill: C.ink }, sv); }],
        over: [(sv, x, y) => Object.entries(R).forEach(([k, P]) => U.s('polyline', { points: P.map(p => `${x(Math.max(-10, Math.min(2, p[0])))},${y(Math.max(-2.2, Math.min(2.2, p[1])))}`).join(' '), fill: 'none', stroke: CL[k], 'stroke-width': 2.2 }, sv))] });
      const d = k => { const p = R[k][R[k].length - 1]; return Math.hypot(p[0], p[1]); };
      out.append(cap(b, 580), kpi(['SGD 離谷底', d('sgd').toFixed(2), d('sgd') > 1 ? 'bad' : ''], ['Momentum', d('mom').toFixed(2)], ['Adam', d('adam').toFixed(2), 'good']), nt(lr >= .5 ? 'SGD 的學習率太大，在陡峭方向來回震盪甚至發散——但在平緩方向又走得很慢。單一學習率顧不了兩個方向。' : 'SGD（紅）在平緩方向走得很慢；Momentum（橘）累積慣性加速，但會衝過頭；Adam（綠）每個參數各自調步伐，兩個方向都顧到——所以是多數情況的預設（學習率 0.001 起跑）。H2O 用的是同家族的 ADADELTA。', lr >= .5 ? 'warn' : '')); }
    ctl.append(row(lbl('學習率'), seg([[.1, '0.1'], [.2, '0.2'], [.45, '0.45'], [.52, '0.52']], () => lr, v => lr = v, draw), slider('步數', 5, 120, 5, () => n, v => n = v, draw)));
    $('#w-opt').append(ctl, out); draw();
  })();

  // ================= P06 層堆疊 =================
  (function () {
    let nin = 8, L = [64, 32], dp = .3, N = 1000; const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; const sz = [nin, ...L, 1], pc = sz.slice(1).map((s, i) => s * (sz[i] + 1)), tot = S.sum(pc), ratio = tot / N;
      const stack = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center' } }, h('div', { style: { padding: '6px 14px', border: '1px dashed var(--line2)', borderRadius: '8px', fontSize: '13px' } }, `輸入層：${nin} 個特徵`),
        ...L.flatMap((n, i) => [h('div', { style: { width: Math.min(100, 30 + n / 2.6) + '%', padding: '7px', background: C.accent, color: '#fff', borderRadius: '8px', textAlign: 'center', fontSize: '13px' } }, `Dense (${n}) ＋ ReLU　·　${pc[i].toLocaleString()} 參數`), ...(dp > 0 ? [h('div', { style: { fontSize: '12px', color: 'var(--amber)' } }, `Dropout ${dp}（訓練時隨機關掉 ${Math.round(dp * 100)}%，預測時自動關閉）`)] : [])]),
        h('div', { style: { padding: '7px 14px', background: C.bad, color: '#fff', borderRadius: '8px', fontSize: '13px' } }, `輸出 Dense (1) ＋ Sigmoid　·　${pc[pc.length - 1]} 參數`));
      const ctrls = h('div', null, h('div', { class: 'row', style: { marginBottom: '6px' } }, h('button', { class: 'btn sm', disabled: L.length >= 5, onclick: () => { L.push(Math.max(4, Math.round(L[L.length - 1] / 2))); draw(); } }, '＋ 加一層'), h('button', { class: 'btn sm', disabled: L.length <= 1, onclick: () => { L.pop(); draw(); } }, '－ 減一層'), h('button', { class: 'btn sm', onclick: () => { L = L.map(n => n * 2); draw(); } }, '每層 ×2'), h('button', { class: 'btn sm', onclick: () => { L = L.map(n => Math.max(2, Math.round(n / 2))); draw(); } }, '每層 ÷2')));
      out.append(ctrls, h('div', { class: 'grid2', style: { alignItems: 'center' } }, stack, h('div', null, kpi(['總參數量', tot.toLocaleString()], ['訓練樣本數', N.toLocaleString()], ['參數 ÷ 樣本', ratio.toFixed(1) + ' 倍', ratio > 1 ? 'bad' : 'good']),
        nt(ratio > 10 ? `參數是樣本的 ${ratio.toFixed(0)} 倍——這不是在學習，是在背答案。先減少層數或每層神經元。` : ratio > 1 ? '參數量超過樣本數：小型表格資料幾乎必定過擬合。' : '參數量在樣本數以內。經驗法則：從 2–3 層隱藏層開始；第一層約為特徵數的 1–2 倍，之後逐層減半；表格資料很少需要超過 5 層。', ratio > 1 ? 'warn' : '')))); }
    ctl.append(row(slider('特徵數', 3, 50, 1, () => nin, v => nin = v, draw), slider('Dropout', 0, .5, .1, () => dp, v => dp = +v.toFixed(1), draw), slider('訓練樣本數', 200, 20000, 200, () => N, v => N = v, draw, v => v.toLocaleString())));
    $('#w-arch').append(ctl, out); draw();
  })();
  (function () {
    const z = [2, 1.5, -1]; let mode = 'multi'; const ctl = h('div'), out = h('div'), NM = ['高血壓', '糖尿病', '心衰竭'];
    function draw() { out.innerHTML = ''; const ex = z.map(Math.exp), sm = ex.map(v => v / S.sum(ex)), sg = z.map(sig), P = mode === 'multi' ? sm : sg;
      const bars = h('div', null, NM.map((n, i) => h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', margin: '6px 0' } }, h('div', { style: { width: '64px', fontWeight: 600 } }, n), h('div', { style: { flex: 1, height: '16px', background: 'var(--line)', borderRadius: '8px', overflow: 'hidden' } }, h('div', { style: { width: P[i] * 100 + '%', height: '100%', background: P[i] >= .5 ? C.bad : C.blue } })), h('span', { class: 'mono', style: { width: '52px' } }, (P[i] * 100).toFixed(1) + '%'))));
      out.append(h('div', { class: 'grid2', style: { alignItems: 'center' } }, bars, h('div', null, kpi(['三個機率加總', (S.sum(P) * 100).toFixed(1) + '%', mode === 'multi' ? 'good' : ''], ['判定為「有」的診斷', P.filter(v => v >= .5).length + ' 個']),
        nt(mode === 'multi' ? 'Softmax：三個機率被迫加總為 100%。若問題是「只能屬於其中一類」（例如檢傷分級），這是對的；但一位病人可以同時有高血壓和糖尿病——用 Softmax 就錯了（最常見的錯誤）。' : 'Sigmoid：每個標籤各自判斷，加總可以超過 100%。多標籤問題（可同時有多個診斷）要用 N 個 Sigmoid。', mode === 'multi' ? 'warn' : '')))); }
    ctl.append(row(seg([['multi', 'Softmax（多分類）'], ['multilabel', 'Sigmoid（多標籤）']], () => mode, v => mode = v, draw), ...NM.map((n, i) => slider(n + ' 的分數', -3, 4, .1, () => z[i], v => z[i] = v, draw, v => (+v).toFixed(1)))));
    $('#w-softmax').append(ctl, out); draw();
  })();
  U.sorter('#w-out', [['會不會 30 天再入院', '1 個＋Sigmoid＋BCE', '二分類。'], ['五級檢傷分類', 'N 個＋Softmax＋CCE', '多分類：只能屬於一級，機率加總＝1。'], ['病人可能同時有的多個診斷', 'N 個＋Sigmoid＋BCE', '★ 多標籤：不是 Softmax。'], ['預測住院天數', '1 個＋不用激活＋MSE', '迴歸：輸出可以是任意實數。']], ['1 個＋Sigmoid＋BCE', 'N 個＋Softmax＋CCE', 'N 個＋Sigmoid＋BCE', '1 個＋不用激活＋MSE'], 'BCE＝Binary Cross-Entropy；CCE＝Categorical Cross-Entropy。');

  // ================= P07 標準化與初始化 =================
  (function () {
    const R = rng(707), D = ring(R, 200, .04), V = ring(R, 300, .04);
    const OPT = { good: ['✓ 標準化＋He 初始化', D.X, V.X, { init: 'he' }], raw: ['✗ 沒標準化（特徵 2 放大 100 倍）', D.X.map(p => [p[0], p[1] * 100]), V.X.map(p => [p[0], p[1] * 100]), { init: 'he' }], zero: ['✗ 權重全設 0', D.X, V.X, { init: 'zero' }], large: ['✗ 權重太大＋Sigmoid（飽和）', D.X, V.X, { init: 'large', act: 'sigmoid' }] };
    const RES = {}; Object.entries(OPT).forEach(([k, [, X, Xv, o]]) => { RES[k] = mlp(X, D.y, { hidden: [8], act: 'relu', lr: .02, epochs: 150, seed: 3, Xv, yv: V.y, fast: true, ...o }); });
    let sel = 'zero'; const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; const CL = { good: C.accent, raw: C.amber, zero: C.bad, large: C.blue }, b = h('div');
      lc(b, Object.entries(RES).map(([k, m]) => ({ pts: m.va, color: CL[k], w: k === sel ? 3.2 : 1.4, op: k === sel ? 1 : .45 })), { w: 440, h: 260, xmin: 1, xmax: 150, ymin: 0, ymax: 1, xl: 'Epoch', yl: '驗證 Loss', legend: [['標準化', C.accent], ['未標準化', C.amber], ['全設 0', C.bad], ['太大', C.blue]], legW: 74 });
      const m = RES[sel], W0 = m.W[0], spread = S.mean(W0[0].map((_, k) => S.sd(W0.map(rw => rw[k])))), acc = accOf(m.f, OPT[sel][2], V.y);
      const msg = { good: '標準化＋適當的隨機初始化：Loss 穩定下降。H2O 運算子會自動處理這兩件事，用 DL4J 自訂架構時要自己確認。', raw: '特徵 2 的尺度是特徵 1 的 100 倍：梯度被大尺度特徵主導，訓練卡住或極慢。做法：Z-score 標準化——★ 參數只能用訓練集算，再套用到驗證與測試集。', zero: `權重全設 0：8 個隱藏神經元算出來一模一樣（彼此差異 ${spread.toExponential(1)}），對稱永遠打不破，等於只有一個神經元——學不出圈形。`, large: '權重太大又用 Sigmoid：加權和落在兩端，導數趨近 0，梯度消失、Loss 幾乎不動。現代作法：He 初始化（ReLU）或 Xavier（Sigmoid／Tanh）——框架預設好了，但要知道為什麼。' }[sel];
      out.append(h('div', { class: 'grid2', style: { alignItems: 'center' } }, cap(b, 460), h('div', null, kpi(['驗證準確率', (acc * 100).toFixed(1) + '%', acc > .9 ? 'good' : 'bad'], ['隱藏神經元彼此差異', spread < 1e-6 ? '0（完全相同）' : spread.toFixed(2), spread < 1e-6 ? 'bad' : '']), nt(msg, sel === 'good' ? '' : 'warn')))); }
    ctl.append(row(seg(Object.entries(OPT).map(([k, v]) => [k, v[0]]), () => sel, v => sel = v, draw)));
    $('#w-init').append(ctl, out); draw();
  })();

  // ================= P08 嵌入層 =================
  (function () {
    const CODES = [['I10', '本態性高血壓', -1.6, 1.2], ['I11', '高血壓性心臟病', -1.3, 1.5], ['I50', '心衰竭', -.8, 1.9], ['E11', '第二型糖尿病', -1.9, .3], ['E78', '高血脂', -1.2, .6], ['N18', '慢性腎臟病', -.7, .1], ['S72', '股骨骨折', 1.8, -1.2], ['S82', '小腿骨折', 2.1, -.8], ['M81', '骨質疏鬆', 1.3, -.4], ['J18', '肺炎', .6, 1.6], ['J44', '慢性阻塞性肺病', .3, 2.1]];
    let a = 0, b = 6, K = 1000; const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; const bx = h('div'); U.scatter(bx, CODES.map((c, i) => ({ x: c[2], y: c[3], c: i === a ? C.accent : i === b ? C.amber : C.gray, r: i === a || i === b ? 8 : 6, op: .95, title: c[1], onclick: () => { if (i !== a) { b = a; a = i; } draw(); } })), { w: 400, h: 320, xmin: -2.6, xmax: 2.8, ymin: -1.8, ymax: 2.6, noGrid: true, xlabel: '嵌入維度 1（示意）', ylabel: '嵌入維度 2（示意）', over: [(sv, x, y) => { CODES.forEach((c, i) => U.s('text', { x: x(c[2]) + 9, y: y(c[3]) + 4, text: c[0], style: `font-size:12px;font-weight:${i === a || i === b ? 700 : 400}` }, sv)); U.s('line', { x1: x(CODES[a][2]), y1: y(CODES[a][3]), x2: x(CODES[b][2]), y2: y(CODES[b][3]), stroke: C.ink, 'stroke-dasharray': '4 3' }, sv); }] });
      const de = Math.hypot(CODES[a][2] - CODES[b][2], CODES[a][3] - CODES[b][3]), dim = Math.min(50, Math.round(6 * K ** .25));
      out.append(h('div', { class: 'grid2', style: { alignItems: 'center' } }, cap(bx, 420), h('div', null, h('div', { style: { fontSize: '14px', marginBottom: '6px' } }, h('b', { style: { color: C.accent } }, `${CODES[a][0]} ${CODES[a][1]}`), ' vs ', h('b', { style: { color: C.amber } }, `${CODES[b][0]} ${CODES[b][1]}`)), kpi(['One-Hot 距離', '√2 ≈ 1.414'], ['嵌入距離', de.toFixed(2), de < 1 ? 'good' : '']),
        nt('One-Hot：任何兩個不同的診斷碼距離都是 √2——高血壓與高血壓性心臟病，跟高血壓與股骨骨折一樣遠。嵌入向量則是模型在訓練中學出來的：常一起出現、對預測有相似影響的診斷會靠近。點圖上任一個點換一組比較。'),
        h('div', { style: { marginTop: '8px' } }, slider('類別數', 10, 20000, 10, () => K, v => K = v, draw, v => v.toLocaleString())), kpi(['建議嵌入維度 min(50, 6×類別數^¼)', dim + ' 維']), nt('這與 M6 的 Word2Vec、M7 的詞嵌入是同一個概念。但要有足夠資料才學得出有意義的嵌入；只有幾千筆時，CatBoost 的類別處理（M4）通常更務實。', 'warn')))); }
    $('#w-emb').append(ctl, out); draw();
  })();

  // ================= P09 Epoch／Batch =================
  (function () {
    let N = 1000, B = 100, E = 30; const ctl = h('div'), out = h('div');
    const R = rng(909), D = ring(R, 240, .06); const cache = {};
    const lossC = bs => { if (!cache[bs]) cache[bs] = mlp(D.X, D.y, { hidden: [8], lr: .01, epochs: bs < 50 ? 10 : 300, batch: bs, seed: 5, fast: true }); return cache[bs]; };
    function draw() { out.innerHTML = ''; const it = Math.ceil(N / B), nb = Math.min(it, 40);
      const blocks = h('div', { style: { display: 'flex', gap: '3px', flexWrap: 'wrap', margin: '6px 0' } }, Array.from({ length: nb }, (_, i) => h('div', { style: { flex: `1 0 ${Math.max(14, 600 / nb - 3)}px`, height: '30px', background: i % 2 ? '#3d8f8a' : C.accent, borderRadius: '4px', color: '#fff', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' } }, nb < 25 ? '批' + (i + 1) : '')), it > 40 ? h('span', { style: { fontSize: '12px', color: 'var(--muted)' } }, `…共 ${it} 批`) : '');
      const c1 = lossC(8), c2 = lossC(240), b = h('div'); lc(b, [{ pts: c1.gn.slice(0, 300).map((v, i) => [i + 1, v]), color: C.amber, w: 1 }, { pts: c2.gn.slice(0, 300).map((v, i) => [i + 1, v]), color: C.accent, w: 2.4 }], { w: 440, h: 200, xmin: 1, xmax: 300, ymin: 0, xl: '權重更新次數', yl: '梯度大小', legend: [['batch = 8（雜訊多）', C.amber], ['batch = 全部（平滑）', C.accent]], legW: 150 });
      out.append(blocks, kpi(['每個 Epoch 的 Iteration', `${N} ÷ ${B} = ${it}`], ['總權重更新次數', `${it} × ${E} = ${(it * E).toLocaleString()}`]), h('div', { class: 'grid2', style: { alignItems: 'center', marginTop: '8px' } }, cap(b, 460), nt('小批次每次只看幾筆，梯度估計雜訊多（橘線），但這些雜訊反而有助於跳出差的解、泛化較好，記憶體也省；大批次梯度穩定（綠線）、速度快，但可能收斂到較差的解。常見起點 32–128。Epoch 太少欠擬合、太多過擬合——交給早停決定。'))); }
    ctl.append(row(slider('訓練集筆數', 100, 10000, 100, () => N, v => N = v, draw, v => v.toLocaleString()), slider('batch_size', 8, 512, 8, () => B, v => B = v, draw), slider('Epoch', 1, 100, 1, () => E, v => E = v, draw)));
    $('#w-ebi').append(ctl, out); draw();
  })();

  // ================= P10 Loss 判讀 =================
  (function () {
    const ep = Array.from({ length: 50 }, (_, i) => i + 1), r = rng(1010);
    const K = { healthy: ['① 健康', e => .9 * Math.exp(-e / 10) + .1, e => .9 * Math.exp(-e / 10) + .14, '繼續訓練或就此收工。'], over: ['② 過擬合', e => .9 * Math.exp(-e / 9) + .02, e => .6 * Math.exp(-e / 7) + .2 + .012 * Math.max(0, e - 14), '早停、減少容量、加 Dropout。'], under: ['③ 欠擬合', e => .35 * Math.exp(-e / 3) + .6, e => .35 * Math.exp(-e / 3) + .63, '加深加寬、訓練久一點。'], unstable: ['④ 訓練不穩', e => .5 + .3 * Math.sin(e * 1.7) * Math.exp(-e / 80) + .15 * (r() - .5), e => .55 + .32 * Math.sin(e * 1.7 + .5) * Math.exp(-e / 80) + .15 * (r() - .5), '降學習率、加大 batch。'] };
    const order = ['over', 'unstable', 'healthy', 'under'], ans = {}; const out = h('div');
    const data = {}; order.forEach(k => data[k] = [ep.map(e => [e, K[k][1](e)]), ep.map(e => [e, K[k][2](e)])]);
    function draw() { out.innerHTML = ''; const g = h('div', { class: 'grid2' });
      order.forEach((k, i) => { const b = h('div'); lc(b, [{ pts: data[k][0], color: C.accent, w: 2.2 }, { pts: data[k][1], color: C.bad, w: 2.2 }], { w: 320, h: 180, xmin: 1, xmax: 50, ymin: 0, ymax: 1.1, xl: 'Epoch', legend: i === 0 ? [['訓練', C.accent], ['驗證', C.bad]] : null, legW: 60 });
        const sg = h('div', { class: 'row', style: { gap: '4px' } }, order.map(c => { const bt = h('button', { class: 'btn sm' }, K[c][0]); if (ans[k] === c) { if (c === k) bt.classList.add('on'); else bt.style.cssText = 'background:var(--bad-soft);border-color:var(--bad)'; } bt.onclick = () => { ans[k] = c; draw(); }; return bt; }));
        g.append(h('div', { style: { border: '1px solid var(--line)', borderRadius: '10px', padding: '8px', background: '#fff' } }, ttl(`曲線 ${String.fromCharCode(65 + i)}`), b, sg, ans[k] ? h('div', { style: { fontSize: '13px', marginTop: '4px', color: ans[k] === k ? 'var(--good)' : 'var(--bad)' } }, ans[k] === k ? `✓ ${K[k][0]}：${K[k][3]}` : `✗ 再想想：看兩條線的距離與走勢`) : '')); });
      const ok = order.filter(k => ans[k] === k).length; out.append(g, h('div', { class: 'row', style: { marginTop: '8px' } }, h('span', { class: 'tag ' + (ok === 4 ? 'good' : 'gray') }, `答對 ${ok} / 4`))); }
    $('#w-lossq').append(out); draw();
  })();

  // ================= P11 過擬合實驗室 =================
  (function () {
    const R = rng(1111), D = ring(R, 80, .14), V = ring(R, 400, .14);
    let H = 32, nl = 2, dp = 0, l2 = 0, es = false, res = null; const ctl = h('div'), out = h('div');
    function train() { res = mlp(D.X, D.y, { hidden: Array(nl).fill(H), lr: .02, epochs: 300, dropout: dp, l2, seed: 9, Xv: V.X, yv: V.y, fast: true }); draw(); }
    function draw() { out.innerHTML = ''; if (!res) { out.append(nt('調整設定後按「訓練」。')); return; }
      const best = res.va.reduce((a, b) => b[1] < a[1] ? b : a), stopE = es ? best[0] : 300, b = h('div');
      lc(b, [{ pts: res.tr, color: C.accent, w: 2.2 }, { pts: res.va, color: C.bad, w: 2.2 }], { w: 400, h: 240, xmin: 1, xmax: 300, ymin: 0, ymax: Math.min(1.5, Math.max(...res.va.map(p => p[1])) * 1.05), xl: 'Epoch', yl: 'Loss', legend: [['訓練', C.accent], ['驗證', C.bad]], legW: 60, marks: [{ x: best[0], color: C.good, label: '驗證最低（早停點）', dy: 14 }] });
      const m2 = h('div'); map2(m2, res.f, D.X, D.y, { w: 330, h: 300 });
      const vAcc = accOf(res.f, V.X, V.y), tAcc = accOf(res.f, D.X, D.y), gap = res.va[res.va.length - 1][1] - res.tr[res.tr.length - 1][1];
      const over = gap > .25, msg = over ? `訓練 Loss 一路降到 ${res.tr[res.tr.length - 1][1].toFixed(2)}，驗證 Loss 卻回升到 ${res.va[res.va.length - 1][1].toFixed(2)}：典型過擬合。邊界繞著每個雜訊點打轉。${es ? `早停會停在第 ${best[0]} 個 epoch。` : '先開早停（免費）。'}` : `訓練與驗證 Loss 差距 ${gap.toFixed(2)}，在可接受範圍。`;
      out.append(h('div', { class: 'grid2', style: { alignItems: 'center' } }, h('div', null, ttl('Loss 曲線'), cap(b, 420)), h('div', null, ttl(es ? `決策邊界（第 300 epoch；早停建議第 ${stopE}）` : '決策邊界（第 300 epoch）'), cap(m2, 340))),
        kpi(['參數量', res.nparam.toLocaleString(), res.nparam > 80 ? 'bad' : ''], ['訓練樣本', '80'], ['訓練準確率', (tAcc * 100).toFixed(0) + '%'], ['驗證準確率', (vAcc * 100).toFixed(1) + '%', vAcc > .8 ? 'good' : 'bad']), nt(msg, over ? 'warn' : '')); }
    ctl.append(row(slider('每層神經元', 2, 48, 2, () => H, v => H = v, () => { }), slider('隱藏層數', 1, 3, 1, () => nl, v => nl = v, () => { }), slider('Dropout', 0, .5, .1, () => dp, v => dp = +v.toFixed(1), () => { }), lbl('L2'), seg([[0, '0'], [.001, '0.001'], [.01, '0.01']], () => l2, v => l2 = v, () => { }), check('早停', () => es, v => es = v, draw), h('button', { class: 'btn primary', onclick: () => { out.innerHTML = ''; out.append(nt('訓練中…')); setTimeout(train, 30); } }, '▶ 訓練')),
      row(h('button', { class: 'btn sm', onclick: () => { H = 32; nl = 2; dp = 0; l2 = 0; rebuild(); train(); } }, '預設：大網路、沒有防護'), h('button', { class: 'btn sm', onclick: () => { H = 4; nl = 1; dp = 0; l2 = 0; rebuild(); train(); } }, '減少容量'), h('button', { class: 'btn sm', onclick: () => { H = 32; nl = 2; dp = .4; l2 = .01; rebuild(); train(); } }, '大網路＋Dropout＋L2')));
    function rebuild() { ctl.innerHTML = ''; ctl.append(row(slider('每層神經元', 2, 48, 2, () => H, v => H = v, () => { }), slider('隱藏層數', 1, 3, 1, () => nl, v => nl = v, () => { }), slider('Dropout', 0, .5, .1, () => dp, v => dp = +v.toFixed(1), () => { }), lbl('L2'), seg([[0, '0'], [.001, '0.001'], [.01, '0.01']], () => l2, v => l2 = v, () => { }), check('早停', () => es, v => es = v, draw), h('button', { class: 'btn primary', onclick: () => { out.innerHTML = ''; out.append(nt('訓練中…')); setTimeout(train, 30); } }, '▶ 訓練')), row(h('button', { class: 'btn sm', onclick: () => { H = 32; nl = 2; dp = 0; l2 = 0; rebuild(); train(); } }, '預設：大網路、沒有防護'), h('button', { class: 'btn sm', onclick: () => { H = 4; nl = 1; dp = 0; l2 = 0; rebuild(); train(); } }, '減少容量'), h('button', { class: 'btn sm', onclick: () => { H = 32; nl = 2; dp = .4; l2 = .01; rebuild(); train(); } }, '大網路＋Dropout＋L2'))); }
    $('#w-ovf').append(ctl, out); setTimeout(train, 50);
  })();

  // ================= P12 H2O =================
  (function () {
    const G = [['網路架構', [['hidden = [50, 50]', '兩層隱藏層，每層 50 個神經元。表格資料從 2–3 層開始。'], ['activation = Rectifier', '即 ReLU，max(0, x)。隱藏層的預設。'], ['loss_function = Automatic', '依標籤型別自動選：分類→交叉熵、迴歸→MSE。']]],
      ['訓練與優化', [['adaptive_rate = true', '★ 啟用 ADADELTA：每個參數自動調學習率（同 Adam 家族）。此時 rate 不生效。'], ['rho = 0.99、epsilon = 1e-8', 'ADADELTA 的衰減係數與防除以零的極小值，通常不用動。'], ['rate = 0.005、rate_annealing = 1e-6、nesterov = true', '手動學習率、學習率逐步下降、Nesterov 動量——僅在 adaptive_rate = false 時生效。'], ['epochs = 10', '整個訓練集掃描 10 次。'], ['train_samples_per_iteration = −2', '自動決定每次迭代的樣本數。']]],
      ['正則化', [['l1 = 1e-5', '★ 絕對值懲罰 → 部分權重趨近 0（稀疏化）。'], ['l2 = 0.0', '未啟用；啟用則以平方和抑制權重爆炸。'], ['max_w2 = 10.0', '限制單一神經元的權重平方和，提升數值穩定。']]],
      ['資料前處理', [['standardize = true', '★ 所有數值特徵自動做 Z-score 標準化。'], ['missing_values_handling = MeanImputation', '★ 數值欄缺值以平均數填補——是否恰當要看資料（M1 的 MCAR／MAR／MNAR），別讓自動化替你做決定。']]]];
    const open = new Set([8]); const out = h('div');
    function draw() { out.innerHTML = ''; let k = 0; G.forEach(([g, items]) => { out.append(h('div', { style: { fontWeight: 700, margin: '8px 0 4px', color: 'var(--accent-ink)' } }, '【' + g + '】')); items.forEach(([p, d]) => { const id = k++; const it = h('div', { style: { border: '1px solid var(--line)', borderRadius: '8px', margin: '4px 0', background: '#fff', cursor: 'pointer' } }, h('div', { class: 'mono', style: { padding: '6px 10px', fontSize: '13.5px', fontWeight: 600 } }, (open.has(id) ? '▾ ' : '▸ ') + p), open.has(id) ? h('div', { style: { padding: '0 10px 8px 26px', fontSize: '14px', color: 'var(--muted)' } }, d) : ''); it.onclick = () => { open.has(id) ? open.delete(id) : open.add(id); draw(); }; out.append(it); }); });
      out.append(h('div', { class: 'tscroll', style: { marginTop: '10px' } }, h('table', { class: 'dt' }, h('tr', null, ['實作', '特點', '適合', '限制'].map(c => h('th', null, c))), [['Neural Net（內建）', '最陽春的多層感知器', '教學、快速試水溫', '無 Dropout 等現代機制'], ['H2O Deep Learning', '★ 參數完整、自動標準化與缺值處理；CPU 即可', '★ 表格資料主力（W8）', '不支援卷積'], ['Deep Learning（DL4J）', '逐層堆疊、CNN、GPU', '★ 影像、自訂架構（W9）', '設定複雜']].map(r => h('tr', null, r.map((v, j) => h('td', { style: { fontWeight: j ? 400 : 600 } }, v))))))); }
    $('#w-h2o').append(out); draw();
  })();
})();
