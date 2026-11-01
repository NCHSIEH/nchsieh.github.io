/* M2-2 互動頁 A：共用資料、PART 01–07 */
(function () {
  'use strict';
  const { h, $, S, fmt, C, rng, randn, quiz, seg, slider, check } = U;
  U.initModule('m22');
  const cap = (el, px) => { el.style.maxWidth = px + 'px'; el.style.width = '100%'; el.style.margin = '0 auto'; return el; };

  // ---------- 共用資料 ----------
  const M22 = window.M22 = { cap };
  (function () { // 分數資料：60 陽性、940 陰性；機率已校準
    const r = rng(2025), d = 1.6, prior = 60 / 940, P = [];
    for (let i = 0; i < 1000; i++) { const y = i < 60 ? 1 : 0, z = (y ? d : 0) + randn(r); P.push({ y, z, p: 1 / (1 + 1 / (prior * Math.exp(d * z - d * d / 2))) }); }
    M22.scores = P;
    M22.cm = th => { let tp = 0, fp = 0, fn = 0, tn = 0; P.forEach(q => { if (q.p >= th) q.y ? tp++ : fp++; else q.y ? fn++ : tn++; }); return { tp, fp, fn, tn }; };
  })();
  (function () { // 二維資料：彎曲邊界，180 筆（120 訓練／60 測試）
    const r = rng(77), P = []; for (let i = 0; i < 180; i++) { const x = r() * 9, y = r() * 9, m = (y - (4.2 + 1.5 * Math.sin(x * .8))) * 1.25; P.push({ x: [x, y], y: r() < 1 / (1 + Math.exp(-m)) ? 1 : 0 }); }
    M22.d2 = P; M22.tr = P.slice(0, 120); M22.te = P.slice(120);
    M22.map = (box, f, pts, o = {}) => { const g = U.scatter(box, pts.map(p => ({ x: p.x[0], y: p.x[1], c: p.y ? C.bad : C.blue, r: o.r || 3.4, op: .9, stroke: p.ring ? '#1c2430' : null })), { w: o.w || 380, h: o.h || 330, xmin: 0, xmax: 9, ymin: 0, ymax: 9, noGrid: true, xlabel: '特徵 1', ylabel: '特徵 2', under: [(sv, x, y) => ML.regionMap(sv, x, y, (a, b) => f([a, b]), 0, 9, 0, 9, o.nx || 54, o.ny || 54)] }); return g; };
    M22.acc = (f, pts) => S.mean(pts.map(p => ((f(p.x) >= .5 ? 1 : 0) === p.y) ? 1 : 0));
  })();

  // ================= P01 Hard / Soft =================
  (function () {
    const P = [['A', .92, 1], ['B', .73, 1], ['C', .51, 0], ['D', .49, 1], ['E', .35, 0], ['F', .18, 1], ['G', .09, 0], ['H', .04, 0]];
    let mode = 'soft', th = .5; const out = h('div');
    function draw() { out.innerHTML = '';
      const t = h('table', { class: 'dt' }, h('tr', null, ['病人', mode === 'soft' ? '再入院機率' : '模型輸出', '判定', '實際'].map(c => h('th', null, c))), P.map(([n, p, y]) => { const pos = p >= (mode === 'soft' ? th : .5); return h('tr', null, h('td', null, n), mode === 'soft' ? h('td', null, h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, h('div', { style: { width: '120px', height: '10px', background: 'var(--line)', borderRadius: '5px', overflow: 'hidden' } }, h('div', { style: { width: p * 100 + '%', height: '100%', background: pos ? C.bad : C.blue } })), h('span', { class: 'mono' }, p.toFixed(2)))) : h('td', null, pos ? '會' : '不會'), h('td', { class: pos ? 'hl' : '' }, pos ? '追蹤' : '—'), h('td', null, y ? '再入院' : '未再入院')); }));
      out.append(h('div', { class: 'row', style: { marginBottom: '8px' } }, seg([['hard', 'Hard：直接給類別'], ['soft', 'Soft：先給機率']], () => mode, v => mode = v, draw), mode === 'soft' ? slider('門檻', .05, .95, .01, () => th, v => th = v, draw, v => (+v).toFixed(2)) : ''),
        h('div', { class: 'grid2' }, h('div', { class: 'tscroll' }, t), h('div', { class: 'note ' + (mode === 'hard' ? 'warn' : ''), style: { fontSize: '14px' } }, mode === 'hard' ? 'Hard：C（0.51）與 A（0.92）被當成同一件事，D（0.49）則完全看不出它差一點點就是陽性。無法調整門檻、無法排序。k-NN 多數決、決策樹的預設輸出屬此類。' : `Soft：先排序、再依場域決定門檻。目前門檻 ${th.toFixed(2)}，追蹤 ${P.filter(p => p[1] >= th).length} 人。人力只夠追兩成時，就從機率最高的開始。提醒：模型的「機率」是相對排序分數，要當機率讀需要校準（P08）。`))); }
    $('#w-soft').append(out); draw();
  })();

  // ================= P02 時間窗 =================
  (function () {
    const P = [['P1', '3/01', 11], ['P2', '3/03', 48], ['P3', '3/05', null], ['P4', '3/08', 21], ['P5', '3/10', 97], ['P6', '3/12', 9], ['P7', '3/15', 62], ['P8', '3/18', null], ['P9', '3/20', 29], ['P10', '3/22', 140]];
    let w = 30; const out = h('div');
    function draw() { out.innerHTML = ''; const lab = P.map(p => p[2] != null && p[2] <= w ? 1 : 0), prev = S.mean(lab);
      const t = h('table', { class: 'dt' }, h('tr', null, ['病人', '出院日', '距下次入院', `${w} 天定義`].map(c => h('th', null, c))), P.map((p, i) => h('tr', null, h('td', null, p[0]), h('td', null, p[1]), h('td', { class: 'num' }, p[2] == null ? '—' : p[2] + ' 天'), h('td', { class: lab[i] ? 'hl' : '', style: { fontWeight: 700 } }, lab[i]))));
      out.append(h('div', { class: 'row', style: { marginBottom: '8px' } }, slider('時間窗', 7, 120, 1, () => w, v => w = v, draw, v => v + ' 天'), h('button', { class: 'btn sm', onclick: () => { w = 30; draw(); } }, '30 天'), h('button', { class: 'btn sm', onclick: () => { w = 90; draw(); } }, '90 天')),
        h('div', { class: 'grid2' }, h('div', { class: 'tscroll' }, t), h('div', null, h('div', { class: 'kpi' }, h('div', null, h('div', { class: 'k' }, '陽性（再入院）'), h('div', { class: 'v' }, `${S.sum(lab)} / ${P.length}`)), h('div', null, h('div', { class: 'k' }, '盛行率'), h('div', { class: 'v' }, Math.round(prev * 100) + '%'))),
          h('div', { class: 'note', style: { fontSize: '14px' } }, '同一個人在不同定義下可能翻轉（例如 P2：30 天陰性、90 天陽性），所有指標的基準也跟著變。沒有對錯——出院衛教管 30 天，慢性病管理管 90 天。目標定義必須完整寫進報告第一節，包括排除條件。')))); }
    $('#w-window').append(out); draw();
  })();
  (function () {
    const G = [['回家（自理）', 6000, 180], ['回家（家人照顧）', 3600, 252], ['護理之家', 1800, 216], ['呼吸照護病房', 600, 72]];
    const ch = h('div'); U.hbars(ch, G.map(([n, N, k]) => ({ label: n, value: k / N * 100, color: k / N > .1 ? C.bad : C.accent })), { w: 460, lw: 120, rowH: 28, max: 15, fmt: v => v.toFixed(1) + '%' });
    $('#w-group').append(h('div', { class: 'grid2', style: { alignItems: 'center' } }, ch, h('div', null, h('div', { class: 'note', style: { fontSize: '14px' } }, '出院去向從 3% 到 12%，四倍差距＝強特徵。陽性率在組間差異越大，切下去的資訊增益越高——決策樹自己也是這樣挑的。'), h('p', { class: 'ai' }, '陷阱：呼吸照護只有 600 筆，12% 的估計較不穩；樣本太少的類別可考慮合併。這張表也是「單特徵基準線」。整體 6.0%（720 / 12,000），數字為教學設計。'))));
  })();

  // ================= P03 k-NN 手算 =================
  (function () {
    const D = [['P1', 55, 3, 0], ['P2', 78, 9, 1], ['P3', 62, 5, 0], ['P4', 81, 11, 1], ['P5', 70, 7, 1]], Q = [72, 8];
    let k = 3, norm = true; const out = h('div');
    function draw() { out.innerHTML = '';
      const all = D.map(d => [d[1], d[2]]).concat([Q]), mn = [0, 1].map(j => S.min(all.map(a => a[j]))), mx = [0, 1].map(j => S.max(all.map(a => a[j])));
      const tf = a => norm ? a.map((v, j) => (v - mn[j]) / (mx[j] - mn[j])) : a, q = tf(Q);
      const R = D.map(d => { const v = tf([d[1], d[2]]); return { d, v, dist: Math.hypot(v[0] - q[0], v[1] - q[1]) }; }), order = R.slice().sort((a, b) => a.dist - b.dist), nn = new Set(order.slice(0, k).map(o => o.d[0]));
      const yes = order.slice(0, k).filter(o => o.d[3]).length;
      const t = h('table', { class: 'dt' }, h('tr', null, ['病人', '年齡', '住院天數', '再入院', norm ? '正規化 (年齡, 天數)' : '原始座標', '距 P6'].map(c => h('th', null, c))), R.map(o => h('tr', null, h('td', { class: nn.has(o.d[0]) ? 'hl' : '' }, o.d[0] + (nn.has(o.d[0]) ? ' ★' : '')), h('td', { class: 'num' }, o.d[1]), h('td', { class: 'num' }, o.d[2]), h('td', null, o.d[3] ? '是' : '否'), h('td', { class: 'mono' }, `(${o.v.map(v => fmt(v, 2)).join(', ')})`), h('td', { class: 'num' + (nn.has(o.d[0]) ? ' hl' : '') }, fmt(o.dist, 3)))), h('tr', null, h('td', { style: { fontWeight: 700 } }, 'P6'), h('td', { class: 'num' }, Q[0]), h('td', { class: 'num' }, Q[1]), h('td', null, '？'), h('td', { class: 'mono' }, `(${q.map(v => fmt(v, 2)).join(', ')})`), h('td', null, '—')));
      out.append(h('div', { class: 'row', style: { marginBottom: '8px' } }, seg([[1, 'k = 1'], [3, 'k = 3'], [5, 'k = 5']], () => k, v => k = v, draw), check('先做 Min-Max 正規化', () => norm, v => norm = v, draw)),
        h('div', { class: 'grid2' }, h('div', { class: 'tscroll' }, t), h('div', null, h('div', { class: 'kpi' }, h('div', null, h('div', { class: 'k' }, `最近 ${k} 位投票`), h('div', { class: 'v' }, `是 ${yes} : 否 ${k - yes}`)), h('div', null, h('div', { class: 'k' }, '判定'), h('div', { class: 'v ' + (yes * 2 > k ? 'bad' : '') }, yes * 2 > k ? '會再入院' : '不會')), h('div', null, h('div', { class: 'k' }, '機率（比例）'), h('div', { class: 'v' }, (yes / k).toFixed(2)))),
          h('div', { class: 'note ' + (norm ? '' : 'warn'), style: { fontSize: '14px' } }, norm ? '步驟：① 正規化 → ② 歐氏距離 → ③ 取最近 k 個 → ④ 多數決（或比例當機率）。' : '沒有正規化：年齡值域 26、天數值域 8，距離幾乎只由年齡決定，住院天數形同虛設——這是 k-NN 最常見的死法。')))); }
    $('#w-knnhand').append(out); draw();
  })();

  // ================= P03 k-NN 邊界 =================
  (function () {
    let k = 1; const out = h('div'); const TR = M22.tr, TE = M22.te;
    const knn = kk => x => { const d = TR.map(p => [(p.x[0] - x[0]) ** 2 + (p.x[1] - x[1]) ** 2, p.y]).sort((a, b) => a[0] - b[0]).slice(0, kk); return S.mean(d.map(a => a[1])); };
    const curve = [1, 3, 5, 9, 15, 25, 41, 61].map(kk => { const f = knn(kk); return { k: kk, tr: M22.acc(f, TR), te: M22.acc(f, TE) }; });
    function draw() { out.innerHTML = ''; const f = knn(k), tr = M22.acc(f, TR), te = M22.acc(f, TE);
      const m = h('div'); M22.map(m, f, TR, { nx: 50, ny: 50 });
      const c2 = h('div'); const W = 340, H = 240, mg = { l: 40, r: 12, t: 12, b: 34 }, sv = U.svgBox(c2, W, H), x = U.scale(0, curve.length - 1, mg.l, W - mg.r), y = U.scale(.6, 1, H - mg.b, mg.t);
      [.6, .7, .8, .9, 1].forEach(t => { U.s('line', { x1: mg.l, x2: W - mg.r, y1: y(t), y2: y(t), class: 'grid' }, sv); U.s('text', { x: mg.l - 6, y: y(t) + 4, 'text-anchor': 'end', text: t.toFixed(1) }, sv); }); curve.forEach((c, i) => U.s('text', { x: x(i), y: H - mg.b + 16, 'text-anchor': 'middle', text: c.k }, sv)); U.s('text', { x: (mg.l + W - mg.r) / 2, y: H - 3, 'text-anchor': 'middle', text: 'k（右邊越平滑）', style: 'font-size:12px;fill:#5d6774' }, sv);
      [['tr', C.gray], ['te', C.blue]].forEach(([kk, c]) => U.s('polyline', { points: curve.map((q, i) => `${x(i)},${y(q[kk])}`).join(' '), fill: 'none', stroke: c, 'stroke-width': 2.5 }, sv));
      out.append(h('div', { class: 'row', style: { marginBottom: '6px' } }, slider('k', 1, 61, 2, () => k, v => k = v, draw)),
        h('div', { class: 'grid2' }, cap(m, 400), h('div', null, h('div', { class: 'kpi' }, h('div', null, h('div', { class: 'k' }, '訓練正確率'), h('div', { class: 'v' }, tr.toFixed(2))), h('div', null, h('div', { class: 'k' }, '測試正確率'), h('div', { class: 'v' }, te.toFixed(2)))), cap(c2, 360), h('div', { class: 'legend' }, h('span', null, h('i', { style: { background: C.gray } }), '訓練'), h('span', null, h('i', { style: { background: C.blue } }), '測試')),
          h('div', { class: 'note ' + (k <= 3 ? 'warn' : ''), style: { fontSize: '14px' } }, k === 1 ? 'k = 1：訓練正確率必為 1.0——每個點最近的鄰居就是它自己。邊界圍著單一樣本挖出小島，那是記憶不是學習。' : k >= 41 ? 'k 很大：邊界太平滑，開始欠擬合。' : '選 k 的方法：在合理範圍掃描，依交叉驗證取最高點。與 M2-1 的多項式次數是同一個過擬合故事。')))); }
    $('#w-knnmap').append(out); draw();
  })();

  // ================= P04 Sigmoid =================
  (function () {
    let b0 = -6, b1 = .08, age = 72; const out = h('div');
    function draw() { out.innerHTML = ''; const f = a => ML.sigmoid(b0 + b1 * a), z = b0 + b1 * age, bd = -b0 / b1;
      const W = 520, H = 260, m = { l: 44, r: 12, t: 14, b: 34 }, ch = h('div'), sv = U.svgBox(ch, W, H), x = U.scale(20, 100, m.l, W - m.r), y = U.scale(0, 1, H - m.b, m.t);
      [0, .25, .5, .75, 1].forEach(t => { U.s('line', { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: 'grid', 'stroke-dasharray': t === .5 ? '4 3' : null }, sv); U.s('text', { x: m.l - 6, y: y(t) + 4, 'text-anchor': 'end', text: t }, sv); }); [20, 40, 60, 80, 100].forEach(t => U.s('text', { x: x(t), y: H - m.b + 16, 'text-anchor': 'middle', text: t }, sv)); U.s('text', { x: (m.l + W - m.r) / 2, y: H - 3, 'text-anchor': 'middle', text: '年齡', style: 'font-size:12px;fill:#5d6774' }, sv);
      const pts = []; for (let a = 20; a <= 100; a += .5) pts.push(`${x(a)},${y(f(a))}`); U.s('polyline', { points: pts.join(' '), fill: 'none', stroke: C.accent, 'stroke-width': 3 }, sv);
      if (bd > 20 && bd < 100) { U.s('line', { x1: x(bd), x2: x(bd), y1: m.t, y2: H - m.b, stroke: C.bad, 'stroke-dasharray': '5 3' }, sv); U.s('text', { x: x(bd) + 4, y: m.t + 10, text: `決策邊界 ${bd.toFixed(0)} 歲`, style: 'fill:#c0392b;font-weight:600' }, sv); }
      U.s('circle', { cx: x(age), cy: y(f(age)), r: 7, fill: C.amber, stroke: '#fff', 'stroke-width': 2 }, sv);
      out.append(h('div', { class: 'row', style: { marginBottom: '6px' } }, slider('β₀ 截距', -12, 2, .1, () => b0, v => b0 = v, draw, v => (+v).toFixed(1)), slider('β₁ 年齡係數', 0, .2, .005, () => b1, v => b1 = v, draw, v => (+v).toFixed(3)), slider('病人年齡', 20, 100, 1, () => age, v => age = v, draw)),
        h('div', { class: 'grid2', style: { alignItems: 'center' } }, ch, h('div', null, h('div', { class: 'note', style: { fontFamily: 'var(--mono)', fontSize: '14px' } }, h('div', null, `z = ${b0.toFixed(1)} + ${b1.toFixed(3)} × ${age} = ${z.toFixed(2)}`), h('div', { style: { fontWeight: 700, fontSize: '16px' } }, `p = 1 / (1 + e^(−z)) = ${f(age).toFixed(3)}`)),
          h('div', { class: 'concept' }, h('div', null, h('b', null, 'z = 0 ↔ p = 0.5'), '線性組合的 0 就是決策邊界——所以 Logistic 的邊界是直的'), h('div', null, h('b', null, '中段陡、兩端平'), '邊界附近的個案，特徵小變動影響最大；兩端飽和')),
          h('p', { class: 'ai' }, '訓練：最大概似估計——找一組 β 讓「實際發生的事」機率最大。')))); }
    $('#w-sig').append(out); draw();
  })();

  // ================= P04 勝算比 =================
  (function () {
    const V = [['年齡（每 1 歲）', .045, '<0.001', 1], ['糖尿病（有=1）', .693, '<0.001', 1], ['性別（女=1）', -.105, '0.460', 1]];
    let beta = .045, k = 10, p = .5; const out = h('div');
    function draw() { out.innerHTML = ''; const or = Math.exp(beta * k), odds = p / (1 - p);
      const t = h('table', { class: 'dt' }, h('tr', null, ['變數', '係數 β', 'p 值', 'OR = e^β', '解讀'].map(c => h('th', null, c))), V.map(([n, b, pv]) => { const o = Math.exp(b), sig = pv !== '0.460'; return h('tr', null, h('td', null, n), h('td', { class: 'num' }, (b > 0 ? '+' : '') + b), h('td', { class: 'num' }, pv), h('td', { class: 'num' }, o.toFixed(3)), h('td', { style: { whiteSpace: 'normal', color: sig ? 'var(--ink)' : 'var(--faint)' } }, sig ? (b > .5 ? `勝算為 ${o.toFixed(1)} 倍` : `勝算 ${o > 1 ? '+' : ''}${((o - 1) * 100).toFixed(1)}%`) : '不顯著，不應解讀')); }));
      out.append(h('div', { class: 'grid2' }, h('div', null, h('div', { class: 'tscroll' }, t), h('div', { class: 'row', style: { marginTop: '10px' } }, slider('係數 β', -1, 1.5, .005, () => beta, v => beta = v, draw, v => (+v).toFixed(3)), slider('每幾單位', 1, 20, 1, () => k, v => k = v, draw)), h('div', { class: 'note', style: { fontFamily: 'var(--mono)', fontSize: '14.5px' } }, `OR = e^(${beta.toFixed(3)} × ${k}) = ${or.toFixed(3)} → 勝算 ${or >= 1 ? '增加' : '減少'} ${Math.abs((or - 1) * 100).toFixed(1)}%`)),
        h('div', null, h('div', { style: { fontWeight: 600, marginBottom: '4px' } }, '機率 ↔ 勝算'), slider('機率 p', .01, .99, .01, () => p, v => p = v, draw, v => (+v).toFixed(2)), h('div', { class: 'kpi', style: { margin: '6px 0' } }, h('div', null, h('div', { class: 'k' }, '勝算 p/(1−p)'), h('div', { class: 'v' }, odds.toFixed(2)))),
          h('div', { class: 'note warn', style: { fontSize: '14px' } }, 'OR ≠ RR：事件常見時，OR 會誇大相對風險——醫學文獻解讀的常見誤區。正則化後的係數被往 0 拉，OR 會被系統性低估：解釋用無正則化的 Logistic，預測用調到最好的版本。')))); }
    $('#w-or').append(out); draw();
  })();
  $('#w-others').append(h('div', { class: 'concept' }, h('div', null, h('b', null, 'SVM 支援向量機'), '找間隔最寬的那條線；核技巧處理非線性。必須正規化；高維中樣本的效能候選，可解釋性差'), h('div', null, h('b', null, 'LDA / QDA'), '假設各類近似常態；樣本少時比 Logistic 穩。QDA 允許曲線邊界但需要更多樣本'), h('div', null, h('b', null, '神經網路 MLP'), '隱藏層自動組合特徵；表格資料上常輸給樹提升，非結構化資料才是主場（M5）'), h('div', null, h('b', null, 'XGBoost／LightGBM'), '梯度提升的高效實作，表格資料競賽常勝軍（M4）')));

  // ================= P05 Naive Bayes =================
  (function () {
    const st = { pr: .1, f1: .8, c1: .7, f0: .2, c0: .3 }; const out = h('div');
    function draw() { out.innerHTML = '';
      const s1 = st.pr * st.f1 * st.c1, s0 = (1 - st.pr) * st.f0 * st.c0, p1 = s1 / (s1 + s0);
      const t = h('table', { class: 'dt' }, h('tr', null, ['步驟', '流感', '非流感'].map(c => h('th', null, c))), h('tr', null, h('td', null, '先驗'), h('td', { class: 'num' }, st.pr.toFixed(2)), h('td', { class: 'num' }, (1 - st.pr).toFixed(2))), h('tr', null, h('td', null, '× P(發燒｜類)'), h('td', { class: 'num' }, '×' + st.f1.toFixed(2)), h('td', { class: 'num' }, '×' + st.f0.toFixed(2))), h('tr', null, h('td', null, '× P(咳嗽｜類)'), h('td', { class: 'num' }, '×' + st.c1.toFixed(2)), h('td', { class: 'num' }, '×' + st.c0.toFixed(2))), h('tr', null, h('td', null, '分數'), h('td', { class: 'num' }, s1.toFixed(4)), h('td', { class: 'num' }, s0.toFixed(4))), h('tr', null, h('td', { style: { fontWeight: 700 } }, '歸一化'), h('td', { class: 'num ' + (p1 > .5 ? 'hl' : '') }, p1.toFixed(3)), h('td', { class: 'num ' + (p1 <= .5 ? 'hl' : '') }, (1 - p1).toFixed(3))));
      const sl = (l, k, a = .01, b = .99) => slider(l, a, b, .01, () => st[k], v => st[k] = v, draw, v => (+v).toFixed(2));
      out.append(h('div', { class: 'grid2' }, h('div', null, sl('先驗 P(流感)', 'pr'), sl('P(發燒｜流感)', 'f1'), sl('P(咳嗽｜流感)', 'c1'), sl('P(發燒｜非流感)', 'f0'), sl('P(咳嗽｜非流感)', 'c0'), h('button', { class: 'btn sm', style: { marginTop: '6px' }, onclick: () => { Object.assign(st, { pr: .1, f1: .8, c1: .7, f0: .2, c0: .3 }); draw(); } }, '還原講義數字')),
        h('div', null, h('div', { class: 'tscroll' }, t), h('div', { class: 'kpi', style: { marginTop: '8px' } }, h('div', null, h('div', { class: 'k' }, '判定'), h('div', { class: 'v ' + (p1 > .5 ? 'bad' : '') }, p1 > .5 ? '流感' : '非流感'))),
          h('div', { class: 'note', style: { fontSize: '14px' } }, 'Naive 在哪：假設發燒與咳嗽在給定類別下彼此獨立——實際上顯然相關。講義數字下流感只贏一點點（0.509 vs 0.491）：先驗 0.10 的劣勢幾乎吃掉了症狀的證據力。訓練集沒出現過的組合會得到機率 0，需拉普拉斯平滑。M6 文字分類它會翻身。')))); }
    $('#w-nb').append(out); draw();
  })();

  // ================= P06 混淆矩陣 =================
  (function () {
    let th = .2; const out = h('div');
    function draw() { out.innerHTML = ''; const { tp, fp, fn, tn } = M22.cm(th), N = 1000;
      const acc = (tp + tn) / N, prec = tp / (tp + fp || 1), rec = tp / (tp + fn), spec = tn / (tn + fp), npv = tn / (tn + fn || 1), f1 = 2 * prec * rec / (prec + rec || 1), bal = (rec + spec) / 2, mcc = (tp * tn - fp * fn) / Math.sqrt((tp + fp) * (tp + fn) * (tn + fp) * (tn + fn) || 1);
      const cell = (l, v, c) => h('td', { style: { background: c, textAlign: 'center', padding: '12px', fontSize: '15px' } }, h('div', { style: { fontSize: '12px', color: 'var(--muted)' } }, l), h('div', { class: 'mono', style: { fontSize: '22px', fontWeight: 700 } }, v));
      const t = h('table', { class: 'dt', style: { width: 'auto' } }, h('tr', null, h('th'), h('th', { style: { textAlign: 'center' } }, '模型：會'), h('th', { style: { textAlign: 'center' } }, '模型：不會'), h('th', null, '小計')), h('tr', null, h('th', null, '實際：會'), cell('TP', tp, 'var(--good-soft)'), cell('FN 漏掉', fn, 'var(--bad-soft)'), h('td', { class: 'num' }, tp + fn)), h('tr', null, h('th', null, '實際：不會'), cell('FP 誤報', fp, 'var(--amber-soft)'), cell('TN', tn, '#eef3f6'), h('td', { class: 'num' }, fp + tn)), h('tr', null, h('th', null, '小計'), h('td', { class: 'num' }, tp + fp), h('td', { class: 'num' }, fn + tn), h('td', { class: 'num' }, N)));
      const M = [['Accuracy', acc, '(TP+TN)/N', acc < .94 ? 'bad' : ''], ['Precision（PPV）', prec, 'TP/(TP+FP)'], ['Recall（敏感度）', rec, 'TP/(TP+FN)'], ['特異度', spec, 'TN/(TN+FP)'], ['NPV', npv, 'TN/(TN+FN)'], ['F1', f1, '2PR/(P+R)'], ['Balanced Accuracy', bal, '(敏感度+特異度)/2'], ['MCC', mcc, '四格全入的相關係數']];
      const mt = h('table', { class: 'dt' }, h('tr', null, ['指標', '公式', '值'].map(c => h('th', null, c))), M.map(([n, v, f, c]) => h('tr', null, h('td', null, n), h('td', { class: 'mono', style: { fontSize: '12px' } }, f), h('td', { class: 'num ' + (c === 'bad' ? 'hl' : '') }, v.toFixed(3)))));
      out.append(h('div', { class: 'row', style: { marginBottom: '8px' } }, slider('門檻', .02, .9, .01, () => th, v => th = v, draw, v => (+v).toFixed(2)), h('span', { class: 'tag gray' }, '60 位再入院 / 940 位未再入院')),
        h('div', { class: 'grid2' }, h('div', null, t, h('div', { class: 'note warn', style: { fontSize: '14px', marginTop: '10px' } }, `「全判不會」的 Accuracy = 940/1000 = 0.940。${acc < .94 ? `模型的 ${acc.toFixed(3)} 反而比較低——但它抓到了 ${tp}/60 個真陽性。` : '模型略勝，但這個數字幾乎全靠 TN 撐著。'} 攔到 ${tp} 個真的，代價是多追蹤 ${fp} 個假的——值不值得是臨床決定，不是統計決定。`)), h('div', { class: 'tscroll' }, mt))); }
    $('#w-cm').append(out); draw();
  })();
  (function () {
    const T = [['Recall／TPR', '敏感度 Sensitivity', 'TP/(TP+FN)', '真的有病的，抓到幾成？'], ['—', '特異度 Specificity', 'TN/(TN+FP)', '沒病的，正確排除幾成？'], ['Precision', '陽性預測值 PPV', 'TP/(TP+FP)', '說有病的，幾成真的有？'], ['—', '陰性預測值 NPV', 'TN/(TN+FN)', '說沒病的，幾成真的沒有？'], ['FPR', '1 − 特異度', 'FP/(FP+TN)', '沒病卻被誤判的比例']];
    $('#w-terms').append(h('div', { class: 'tscroll' }, h('table', { class: 'dt' }, h('tr', null, ['ML 用語', '醫學用語', '公式', '回答的問題'].map(c => h('th', null, c))), T.map(r => h('tr', null, r.map((v, j) => h('td', { class: j === 2 ? 'mono' : '' }, v)))))), h('p', { class: 'ai' }, '敏感度與特異度是「模型的性質」，不受盛行率影響；PPV 與 NPV 是「部署結果」，隨盛行率大幅變動——下一節就是這件事。'));
  })();

  // ================= P07 盛行率 =================
  (function () {
    let se = .9, sp = .95, pv = .1; const out = h('div');
    function draw() { out.innerHTML = ''; const N = 10000, P = N * pv, tp = se * P, fn = P - tp, fp = (1 - sp) * (N - P), tn = N - P - fp, ppv = tp / (tp + fp), npv = tn / (tn + fn);
      const g = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(50, 1fr)', gap: '2px', maxWidth: '560px' } }); const n1 = 1000, a = Math.round(tp / 10), b = Math.round(fn / 10), c = Math.round(fp / 10);
      for (let i = 0; i < n1; i++) { const col = i < a ? C.good : i < a + b ? C.bad : i < a + b + c ? C.amber : '#dfe6ea'; g.append(h('div', { style: { aspectRatio: '1', background: col, borderRadius: '1.5px' } })); }
      out.append(h('div', { class: 'row', style: { marginBottom: '6px' } }, slider('敏感度', .5, .99, .01, () => se, v => se = v, draw, v => (+v).toFixed(2)), slider('特異度', .5, .99, .01, () => sp, v => sp = v, draw, v => (+v).toFixed(2)), slider('盛行率', .005, .5, .005, () => pv, v => pv = v, draw, v => (v * 100).toFixed(1) + '%')),
        h('div', { class: 'row', style: { marginBottom: '8px' } }, h('button', { class: 'btn sm', onclick: () => { se = .9; sp = .95; pv = .1; draw(); } }, '高風險科別 10%'), h('button', { class: 'btn sm', onclick: () => { se = .9; sp = .95; pv = .01; draw(); } }, '社區篩檢 1%'), h('button', { class: 'btn sm', onclick: () => { se = .9; sp = .95; pv = .02; draw(); } }, '隨堂檢核：盛行率 2%')),
        h('div', { class: 'grid2' }, h('div', null, g, h('div', { class: 'legend', style: { marginTop: '6px' } }, h('span', null, h('i', { style: { background: C.good } }), '真陽性'), h('span', null, h('i', { style: { background: C.bad } }), '漏掉'), h('span', null, h('i', { style: { background: C.amber } }), '誤報'), h('span', null, h('i', { style: { background: '#dfe6ea' } }), '真陰性'))),
          h('div', null, h('div', { class: 'kpi' }, h('div', null, h('div', { class: 'k' }, '每萬人：真陽性'), h('div', { class: 'v' }, Math.round(tp))), h('div', null, h('div', { class: 'k' }, '每萬人：誤報'), h('div', { class: 'v' }, Math.round(fp))), h('div', null, h('div', { class: 'k' }, 'PPV'), h('div', { class: 'v ' + (ppv < .3 ? 'bad' : 'good') }, (ppv * 100).toFixed(1) + '%')), h('div', null, h('div', { class: 'k' }, 'NPV'), h('div', { class: 'v' }, (npv * 100).toFixed(1) + '%'))),
            h('div', { class: 'note ' + (ppv < .3 ? 'bad' : ''), style: { fontSize: '14px' } }, `模型沒變，敏感度 ${se.toFixed(2)}、特異度 ${sp.toFixed(2)}。盛行率 ${(pv * 100).toFixed(1)}% 時，健康人是病人的 ${((1 - pv) / pv).toFixed(0)} 倍；就算只誤判 ${((1 - sp) * 100).toFixed(0)}%，誤報仍${fp > tp ? `是真陽性的 ${(fp / tp).toFixed(1)} 倍` : '少於真陽性'}。對策：依部署場域重估 PPV、提高門檻、或兩階段篩檢。`)))); }
    $('#w-prev').append(out); draw();
  })();
})();
