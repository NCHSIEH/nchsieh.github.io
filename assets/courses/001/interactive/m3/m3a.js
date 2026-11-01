/* M3 互動頁 A：共用資料、PART 01–07 */
(function () {
  'use strict';
  const { h, $, S, fmt, C, rng, randn, quiz, seg, slider, check } = U;
  U.initModule('m3');
  const cap = (el, px) => { el.style.maxWidth = px + 'px'; el.style.width = '100%'; el.style.margin = '0 auto'; return el; };
  const COL = ['#0d6b67', '#b45309', '#2b6cb0', '#7c3aed', '#c0392b', '#2f7d4f', '#8a5a2b', '#d6336c', '#5d6774'];
  const M3 = window.M3 = { cap, COL };
  // 共用：三團資料
  M3.blobs = (() => { const r = rng(33), P = [], T = []; [[2.6, 7.2, .9], [7.4, 7.6, .8], [5.2, 2.6, 1]].forEach(([x, y, s], g) => { for (let i = 0; i < 60; i++) { P.push([x + s * randn(r), y + s * randn(r)]); T.push(g); } }); return { X: P, T }; })();
  M3.plot = (box, X, lab, o = {}) => U.scatter(box, X.map((p, i) => ({ x: p[0], y: p[1], c: lab ? (lab[i] < 0 ? '#b8bfc6' : COL[lab[i] % COL.length]) : C.gray, r: o.r ? o.r(i) : 3.4, op: .85 })), { w: o.w || 380, h: o.h || 320, xmin: o.xmin ?? 0, xmax: o.xmax ?? 10, ymin: o.ymin ?? 0, ymax: o.ymax ?? 10, noGrid: o.grid ? false : true, xlabel: o.xl || '特徵 1', ylabel: o.yl || '特徵 2', over: [(sv, x, y) => { (o.cent || []).forEach(c => { U.s('path', { d: `M${x(c[0]) - 7},${y(c[1]) - 7} L${x(c[0]) + 7},${y(c[1]) + 7} M${x(c[0]) + 7},${y(c[1]) - 7} L${x(c[0]) - 7},${y(c[1]) + 7}`, stroke: '#1c2430', 'stroke-width': 3.2 }, sv); U.s('path', { d: `M${x(c[0]) - 6},${y(c[1]) - 6} L${x(c[0]) + 6},${y(c[1]) + 6} M${x(c[0]) + 6},${y(c[1]) - 6} L${x(c[0]) - 6},${y(c[1]) + 6}`, stroke: '#fff', 'stroke-width': 1.2 }, sv); }); (o.over || []).forEach(f => f(sv, x, y)); }] });
  M3.purity = (lab, T, k) => { let s = 0; for (let c = 0; c < k; c++) { const cnt = {}; lab.forEach((l, i) => { if (l === c) cnt[T[i]] = (cnt[T[i]] || 0) + 1; }); s += Math.max(0, ...Object.values(cnt)); } return s / T.length; };

  // ================= P01 沒有標準答案 =================
  (function () {
    const { X } = M3.blobs; let k = 3; const out = h('div');
    function draw() { out.innerHTML = ''; const km = ML.kmeans(X, k, { seed: 3 }), sil = S.mean(ML.silhouette(X, km.lab));
      const a = h('div'), b = h('div'); M3.plot(a, X, null); M3.plot(b, X, km.lab, { cent: km.C });
      out.append(h('div', { class: 'row', style: { marginBottom: '6px' } }, h('span', { style: { fontSize: '14px', color: 'var(--muted)' } }, '群數 K'), seg([2, 3, 4, 5, 6].map(v => [v, 'K = ' + v]), () => k, v => k = v, draw)),
        h('div', { class: 'grid2' }, h('div', null, h('b', { style: { fontSize: '14px' } }, '你拿到的資料：全部同色'), cap(a, 400)), h('div', null, h('b', { style: { fontSize: '14px' } }, `K-Means 的輸出：K = ${k}`), cap(b, 400))),
        h('div', { class: 'kpi' }, h('div', null, h('div', { class: 'k' }, '組內平方和 Inertia'), h('div', { class: 'v' }, fmt(km.inertia, 0))), h('div', null, h('div', { class: 'k' }, '平均 Silhouette'), h('div', { class: 'v ' + (sil > .6 ? 'good' : '') }, sil.toFixed(3)))),
        h('div', { class: 'note', style: { fontSize: '14px' } }, `沒有人告訴你有幾群、誰屬於哪一群。K = ${k} 是演算法「正確」的輸出——它不會抱怨。哪一個 K 對？演算法本身無法回答，要靠指標（P04）加上你的領域判斷。`)); }
    $('#w-nok').append(out); draw();
  })();

  // ================= P02 縮放 =================
  (function () {
    const r = rng(77), X = [], T = [];
    [[30, 5, 450, 110], [65, 5, 450, 110], [47, 6, 1000, 110]].forEach(([ma, sa, mi, si], g) => { for (let i = 0; i < 60; i++) { X.push([ma + sa * randn(r), mi + si * randn(r)]); T.push(g); } });
    const std = ML.standardize(X), raw = ML.kmeans(X, 3, { seed: 5 }), z = ML.kmeans(std.Z, 3, { seed: 5 });
    const panel = (title, lab, extra) => { const b = h('div'); U.scatter(b, X.map((p, i) => ({ x: p[1], y: p[0], c: COL[lab[i]], r: 3.2 })), { w: 300, h: 250, xmin: 100, xmax: 1400, ymin: 15, ymax: 80, xlabel: '收入（千元）', ylabel: '年齡' }); return h('div', null, h('b', { style: { fontSize: '14px' } }, title), b, extra || ''); };
    const tbl = lab => { const rows = [0, 1, 2].map(c => { const m = X.filter((_, i) => lab[i] === c); return [c, m.length, S.mean(m.map(p => p[0])), S.mean(m.map(p => p[1]))]; }); return h('table', { class: 'dt', style: { fontSize: '12.5px' } }, h('tr', null, ['群', 'n', '平均年齡', '平均收入'].map(c => h('th', null, c))), rows.map(([c, n, a, i]) => h('tr', null, h('td', null, h('span', { style: { color: COL[c], fontWeight: 700 } }, '● ' + (c + 1))), h('td', { class: 'num' }, n), h('td', { class: 'num' }, a.toFixed(1)), h('td', { class: 'num' }, i.toFixed(0))))); };
    $('#w-scale').append(h('div', { class: 'grid3' }, panel('真實結構', T), panel(`未縮放　純度 ${Math.round(M3.purity(raw.lab, T, 3) * 100)}%`, raw.lab, tbl(raw.lab)), panel(`Z-Score 後　純度 ${Math.round(M3.purity(z.lab, T, 3) * 100)}%`, z.lab, tbl(z.lab))),
      h('div', { class: 'note', style: { fontSize: '14px' } }, '收入的值域是年齡的十幾倍，未縮放時距離完全被收入主導——三群的平均年齡差不多，年齡等於沒有參與計算。Z-Score 後兩個維度等權，三個真實群組（中低收入年輕、中低收入年長、高收入中年）被還原。報告裡要用這樣的群平均表說明，不要只寫「因為尺度不同」。'));
  })();

  // ================= P03 手算 =================
  (function () {
    const X = [[2, 2], [3, 3], [2.5, 2], [8, 8], [9, 7], [8.5, 9]], N = 'ABCDEF';
    const INIT = { bad: [[2, 2], [3, 3]], good: [[2, 2], [8, 8]], weird: [[8, 8], [9, 7]] };
    let init = 'bad', step = 0; const out = h('div');
    function draw() { out.innerHTML = ''; const km = ML.kmeans(X, 2, { init: INIT[init] }), H = km.hist, last = H.length - 1; step = Math.min(step, last);
      const Cprev = H[Math.max(0, step - 1)].C, Ccur = H[step].C, lab = step ? H[step].lab : null;
      const b = h('div'); M3.plot(b, X, lab, { cent: Ccur, xmin: 0, xmax: 10, ymin: 0, ymax: 10, r: () => 6, over: [(sv, x, y) => { X.forEach((p, i) => U.s('text', { x: x(p[0]) + 8, y: y(p[1]) - 6, text: N[i], style: 'font-size:12px;font-weight:700;fill:#1c2430' }, sv)); [0, 1].forEach(c => U.s('polyline', { points: H.slice(0, step + 1).map(hh => `${x(hh.C[c][0])},${y(hh.C[c][1])}`).join(' '), fill: 'none', stroke: COL[c], 'stroke-width': 2, 'stroke-dasharray': '4 3' }, sv)); }] });
      const t = h('table', { class: 'dt' }, h('tr', null, ['點', 'x', 'y', `到 C1 (${Cprev[0].map(v => v.toFixed(2)).join(', ')})`, `到 C2 (${Cprev[1].map(v => v.toFixed(2)).join(', ')})`, '歸屬'].map(c => h('th', null, c))), X.map((p, i) => { const d1 = Math.sqrt(ML.d2(p, Cprev[0])), d2v = Math.sqrt(ML.d2(p, Cprev[1])); return h('tr', null, h('td', { style: { fontWeight: 700 } }, N[i]), h('td', { class: 'num' }, p[0]), h('td', { class: 'num' }, p[1]), h('td', { class: 'num' + (step && d1 <= d2v ? ' hl' : '') }, step ? d1.toFixed(2) : '—'), h('td', { class: 'num' + (step && d2v < d1 ? ' hl' : '') }, step ? d2v.toFixed(2) : '—'), h('td', null, step ? h('span', { style: { color: COL[lab[i]], fontWeight: 700 } }, '群' + (lab[i] + 1)) : '—')); }));
      const traj = h('table', { class: 'dt' }, h('tr', null, ['輪次', 'C1', 'C2'].map(c => h('th', null, c))), H.slice(0, step + 1).map((hh, i) => h('tr', null, h('td', null, i ? `第 ${i} 輪後` : '起始'), h('td', { class: 'mono' }, `(${hh.C[0].map(v => +v.toFixed(2)).join(', ')})`), h('td', { class: 'mono' }, `(${hh.C[1].map(v => +v.toFixed(2)).join(', ')})`))));
      const done = step === last;
      const msg = step === 0 ? '起始中心已選好。按「下一步」：① 每點歸給最近的中心　② 中心移到該群的平均位置。' : done ? `第 ${step} 輪中心不再移動 → 收斂。最終：群1 = {${N.split('').filter((_, i) => lab[i] === 0).join(' ')}}、群2 = {${N.split('').filter((_, i) => lab[i] === 1).join(' ')}}；Inertia = ${km.inertia.toFixed(3)}。` : init === 'bad' && step === 1 ? '起始中心都在左下角，第 1 輪把 B 分到群2——明顯不合理。但中心移動後會自己修正。' : '中心移動後重新指派。';
      out.append(h('div', { class: 'row', style: { marginBottom: '8px' } }, h('span', { style: { fontSize: '14px', color: 'var(--muted)' } }, '起始中心'), seg([['bad', 'A、B（刻意選差）'], ['good', 'A、D'], ['weird', 'D、E']], () => init, v => { init = v; step = 0; }, draw), h('button', { class: 'btn sm', onclick: () => { step = 0; draw(); } }, '↺ 重來'), h('button', { class: 'btn primary sm', disabled: done, onclick: () => { step++; draw(); } }, '下一步 →')),
        h('div', { class: 'grid2' }, cap(b, 400), h('div', null, h('div', { class: 'tscroll' }, t), h('div', { class: 'tscroll', style: { marginTop: '8px' } }, traj))), h('div', { class: 'note ' + (done ? '' : ''), style: { fontSize: '14px' } }, msg)); }
    $('#w-hand').append(out); draw();
  })();

  // ================= P03 180 筆一步步 =================
  (function () {
    const { X } = M3.blobs; let k = 3, seed = 2, step = 0; const out = h('div');
    function draw() { out.innerHTML = ''; const r = rng(seed * 101), init = Array.from({ length: k }, () => [r() * 10, r() * 10]); const km = ML.kmeans(X, k, { init }), H = km.hist, last = H.length - 1; step = Math.min(step, last);
      const lab = step ? H[step].lab : null, inert = lab ? X.reduce((s, x, i) => s + ML.d2(x, H[step].C[lab[i]]), 0) : null;
      const b = h('div'); M3.plot(b, X, lab, { cent: H[step].C, over: [(sv, x, y) => { for (let c = 0; c < k; c++) U.s('polyline', { points: H.slice(0, step + 1).map(hh => `${x(hh.C[c][0])},${y(hh.C[c][1])}`).join(' '), fill: 'none', stroke: '#1c2430', 'stroke-width': 1.5, 'stroke-dasharray': '3 3' }, sv); }] });
      out.append(h('div', { class: 'row', style: { marginBottom: '6px' } }, slider('K', 2, 5, 1, () => k, v => { k = v; step = 0; }, draw), h('button', { class: 'btn sm', onclick: () => { seed++; step = 0; draw(); } }, '隨機換起始中心'), h('button', { class: 'btn primary sm', disabled: step === last, onclick: () => { step++; draw(); } }, '下一步 →'), h('button', { class: 'btn sm', disabled: step === last, onclick: () => { step = last; draw(); } }, '跑到收斂')),
        h('div', { class: 'grid2', style: { alignItems: 'center' } }, cap(b, 420), h('div', null, h('div', { class: 'kpi' }, h('div', null, h('div', { class: 'k' }, '目前輪次'), h('div', { class: 'v' }, `${step} / ${last}`)), h('div', null, h('div', { class: 'k' }, 'Inertia'), h('div', { class: 'v' }, inert == null ? '—' : fmt(inert, 1)))),
          h('div', { class: 'note', style: { fontSize: '14px' } }, step === last ? '收斂了。換幾次起始中心：結果偶爾會不同（例如兩個中心擠在同一團）——K-Means 不保證全域最優，所以 AI Studio 要設 max runs 多跑幾次取 Inertia 最小者。' : '虛線是中心移動的軌跡：每一輪都移向該群所有點的平均位置。'),
          h('p', { class: 'ai' }, '優點：快、可擴展、中心點就是「典型個案」。缺點：要先指定 K；只擅長球狀、大小相近的群；對離群值敏感；結果依起始中心而變。')))); }
    $('#w-steps').append(out); draw();
  })();

  // ================= P04 決定 K =================
  (function () {
    const { X } = M3.blobs, KS = [2, 3, 4, 5, 6, 7, 8, 9];
    const R = KS.map(k => { const km = ML.kmeans(X, k, { seed: 3 }), sil = ML.silhouette(X, km.lab); return { k, km, sil, ms: S.mean(sil), db: ML.daviesBouldin(X, km.lab, km.C) }; });
    let ki = 1; const out = h('div');
    const line = (key, title, better, color) => { const W = 300, H = 210, m = { l: 44, r: 10, t: 12, b: 34 }, box = h('div'), sv = U.svgBox(box, W, H), vals = R.map(r => r[key]), lo = Math.min(...vals) * (key === 'km' ? 0 : .9), hi = Math.max(...vals) * 1.05, x = U.scale(2, 9, m.l, W - m.r), y = U.scale(lo, hi, H - m.b, m.t);
      U.ticks(lo, hi, 4).forEach(t => { U.s('line', { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: 'grid' }, sv); U.s('text', { x: m.l - 6, y: y(t) + 4, 'text-anchor': 'end', text: +t.toFixed(2) }, sv); }); KS.forEach(k => U.s('text', { x: x(k), y: H - m.b + 16, 'text-anchor': 'middle', text: k }, sv)); U.s('text', { x: (m.l + W - m.r) / 2, y: H - 3, 'text-anchor': 'middle', text: 'K', style: 'font-size:12px;fill:#5d6774' }, sv);
      U.s('polyline', { points: R.map(r => `${x(r.k)},${y(r[key])}`).join(' '), fill: 'none', stroke: color, 'stroke-width': 2.5 }, sv); R.forEach((r, i) => U.s('circle', { cx: x(r.k), cy: y(r[key]), r: i === ki ? 7 : 4, fill: i === ki ? C.amber : color }, sv));
      return h('div', null, h('b', { style: { fontSize: '13.5px' } }, title), h('div', { style: { fontSize: '12px', color: 'var(--muted)' } }, better), box); };
    R.forEach(r => r.kmI = r.km.inertia);
    function draw() { out.innerHTML = ''; const cur = R[ki];
      const e = line('kmI', '① 手肘法 Inertia', '找下降突然變慢的轉折', C.accent), s = line('ms', '② 平均 Silhouette', '越大越好，看最高點', C.blue), d = line('db', '③ Davies-Bouldin', '越小越好（AI Studio 內建）', C.bad);
      const sc = h('div'); M3.plot(sc, X, cur.km.lab, { cent: cur.km.C, w: 320, h: 280 });
      const ord = cur.sil.map((v, i) => [cur.km.lab[i], v]).sort((a, b) => a[0] - b[0] || b[1] - a[1]), sb = h('div'), sv = U.svgBox(sb, 320, 280), y = U.scale(-.3, 1, 260, 10), bw = 300 / ord.length;
      U.s('line', { x1: 10, x2: 310, y1: y(0), y2: y(0), stroke: C.ink }, sv); ord.forEach(([l, v], i) => U.s('rect', { x: 10 + i * bw, y: Math.min(y(v), y(0)), width: Math.max(1, bw - .2), height: Math.abs(y(v) - y(0)), fill: v < 0 ? C.bad : COL[l] }, sv)); U.s('line', { x1: 10, x2: 310, y1: y(cur.ms), y2: y(cur.ms), stroke: C.ink, 'stroke-dasharray': '4 3' }, sv); U.s('text', { x: 312, y: y(cur.ms) + 4, text: '平均', style: 'font-size:10px' }, sv);
      const best = R.reduce((a, b) => b.ms > a.ms ? b : a), neg = cur.sil.filter(v => v < 0).length;
      out.append(h('div', { class: 'row', style: { marginBottom: '6px' } }, h('span', { style: { fontSize: '14px', color: 'var(--muted)' } }, '選擇 K'), seg(KS.map((k, i) => [i, String(k)]), () => ki, v => ki = v, draw)), h('div', { class: 'grid3' }, e, s, d),
        h('div', { class: 'grid2', style: { marginTop: '10px' } }, h('div', null, h('b', { style: { fontSize: '13.5px' } }, `K = ${cur.k} 的分群`), cap(sc, 340)), h('div', null, h('b', { style: { fontSize: '13.5px' } }, '每一點的 Silhouette（依群排序）'), cap(sb, 340), h('div', { style: { fontSize: '12.5px', color: neg ? 'var(--bad)' : 'var(--muted)' } }, neg ? `有 ${neg} 個點 s < 0（紅色）——離另一群反而更近，很可能分錯。` : '沒有 s < 0 的點。'))),
        h('div', { class: 'note', style: { fontSize: '14px' } }, `Silhouette 最高在 K = ${best.k}（${best.ms.toFixed(3)}）；DB 最低在 K = ${R.reduce((a, b) => b.db < a.db ? b : a).k}；手肘轉折也在 3。Inertia 隨 K 一定下降，不能直接選最小的；Silhouette：> 0.7 強、0.5–0.7 合理、≤ 0.25 無明顯結構（Kaufman & Rousseeuw, 1990）。三者不一致時，以業務可解釋性拍板——例如 Silhouette 最高在 6，但你只能設計 3 種照護方案，就選 3。`)); }
    $('#w-k').append(out); draw();
  })();
  (function () {
    const X = [[2, 2], [3, 3], [2.5, 2], [8, 8], [9, 7], [8.5, 9]], N = 'ABCDEF', lab = [0, 0, 0, 1, 1, 1]; let p = 0; const out = h('div');
    function draw() { out.innerHTML = ''; const own = X.filter((_, i) => i !== p && lab[i] === lab[p]), oth = X.filter((_, i) => lab[i] !== lab[p]);
      const da = own.map(q => Math.sqrt(ML.d2(X[p], q))), db = oth.map(q => Math.sqrt(ML.d2(X[p], q))), a = S.mean(da), b = S.mean(db), s = (b - a) / Math.max(a, b);
      out.append(h('div', { class: 'row', style: { marginBottom: '8px' } }, h('span', { style: { fontSize: '14px', color: 'var(--muted)' } }, '選一個點'), seg(N.split('').map((n, i) => [i, n]), () => p, v => p = v, draw)),
        h('div', { class: 'grid2' }, h('div', { class: 'note', style: { fontFamily: 'var(--mono)', fontSize: '14px' } }, h('div', null, `a = 同群平均距離 = (${da.map(v => v.toFixed(3)).join(' + ')}) / ${da.length} = ${a.toFixed(3)}`), h('div', null, `b = 最近他群平均距離 = (${db.map(v => v.toFixed(2)).join(' + ')}) / ${db.length} = ${b.toFixed(3)}`), h('div', { style: { fontWeight: 700, fontSize: '16px', marginTop: '4px' } }, `s(${N[p]}) = (${b.toFixed(3)} − ${a.toFixed(3)}) / ${Math.max(a, b).toFixed(3)} = ${s.toFixed(3)}`)),
          h('div', { class: 'concept' }, h('div', null, h('b', null, 'a 越小越好'), '與自己群其他成員的平均距離'), h('div', null, h('b', null, 'b 越大越好'), '與最近另一群全部成員的平均距離'), h('div', null, h('b', null, '整體 Silhouette'), '每點的 s 取平均；AI Studio 內建沒有，可用 Execute Python（sklearn silhouette_score）')))); }
    $('#w-sil').append(out); draw();
  })();
  quiz('#q04', { q: 'K-Means 跑兩次得到不同結果，是程式有問題嗎？', opts: ['是，應該回報錯誤', '不是：起始中心隨機，結果本來就可能不同；提高 max runs 或固定 random seed', '代表資料沒有結構', '代表 K 選錯了'], a: 1, ex: 'K-Means 保證收斂，但不保證全域最優。' });

  // ================= P05 樹狀圖 =================
  (function () {
    const P = [[1, 1], [1.5, 1.5], [5, 5], [5.5, 5.2], [9, 1]], N = ['P1', 'P2', 'P3', 'P4', 'P5'];
    let link = 'average', cut = 3; const out = h('div');
    function draw() { out.innerHTML = ''; const M = ML.agglomerative(P, link), lab = ML.cutTree(5, M, cut), k = Math.max(...lab) + 1, maxH = Math.ceil(M[M.length - 1].d + .8);
      const W = 400, H = 300, m = { l: 40, r: 12, t: 14, b: 30 }, box = h('div'), sv = U.svgBox(box, W, H), y = U.scale(0, maxH, H - m.b, m.t);
      U.ticks(0, maxH, 5).forEach(t => { U.s('line', { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: 'grid' }, sv); U.s('text', { x: m.l - 6, y: y(t) + 4, 'text-anchor': 'end', text: t }, sv); });
      const order = M[M.length - 1].m, xs = {}; order.forEach((id, i) => xs[id] = m.l + 30 + i * (W - m.l - m.r - 60) / 4); const pos = {}; order.forEach(id => pos[id] = { x: xs[id], y: y(0) });
      M.forEach(mg => { const A = pos[mg.a], B = pos[mg.b], Y = y(mg.d); U.s('path', { d: `M${A.x},${A.y} V${Y} H${B.x} V${B.y}`, fill: 'none', stroke: mg.d <= cut ? COL[lab[mg.m[0]]] : '#8a929c', 'stroke-width': 2.2 }, sv); U.s('text', { x: (A.x + B.x) / 2, y: Y - 5, 'text-anchor': 'middle', text: mg.d.toFixed(2), style: 'font-size:11px;fill:#1c2430' }, sv); pos[mg.id] = { x: (A.x + B.x) / 2, y: Y }; });
      order.forEach(id => U.s('text', { x: xs[id], y: H - m.b + 16, 'text-anchor': 'middle', text: N[id], style: `font-size:12px;font-weight:700;fill:${COL[lab[id]]}` }, sv));
      U.s('line', { x1: m.l, x2: W - m.r, y1: y(cut), y2: y(cut), stroke: C.bad, 'stroke-width': 2, 'stroke-dasharray': '6 4' }, sv); U.s('text', { x: W - m.r - 4, y: y(cut) - 6, 'text-anchor': 'end', text: `切在 ${cut.toFixed(1)} → ${k} 群`, style: 'fill:#c0392b;font-weight:600' }, sv);
      const sc = h('div'); M3.plot(sc, P, lab, { r: () => 7, w: 300, h: 260, over: [(sv2, x, yy) => P.forEach((p, i) => U.s('text', { x: x(p[0]) + 9, y: yy(p[1]) - 6, text: N[i], style: 'font-size:12px;font-weight:700;fill:#1c2430' }, sv2))] });
      const jumps = M.map((mg, i) => i ? mg.d / M[i - 1].d : 0), bigI = jumps.indexOf(Math.max(...jumps));
      out.append(h('div', { class: 'row', style: { marginBottom: '6px' } }, seg([['single', '單一連結（最短）'], ['complete', '完全連結（最長）'], ['average', '平均連結 ★']], () => link, v => link = v, draw), slider('切線高度', .2, maxH - .2, .1, () => cut, v => cut = v, draw, v => (+v).toFixed(1))),
        h('div', { class: 'grid2', style: { alignItems: 'center' } }, box, h('div', null, cap(sc, 320), h('div', { class: 'tscroll' }, h('table', { class: 'dt' }, h('tr', null, ['步驟', '合併', '距離'].map(c => h('th', null, c))), M.map((mg, i) => h('tr', null, h('td', null, i + 1), h('td', null, '{' + mg.m.map(j => N[j]).join(',') + '}'), h('td', { class: 'num' + (i === bigI ? ' hl' : '') }, mg.d.toFixed(3)))))))),
        h('div', { class: 'note', style: { fontSize: '14px' } }, `由下往上：每次合併最近的兩群。第 ${bigI} 步（${M[bigI - 1].d.toFixed(2)}）到第 ${bigI + 1} 步（${M[bigI].d.toFixed(2)}）距離跳了 ${jumps[bigI].toFixed(1)} 倍——那裡就是最自然的切點。換連結方式，第 3、4 步的距離就變了：單一連結容易產生鏈狀長條群，完全連結傾向大小相近的緊密群。Ward 法常最好用，但 AI Studio 沒有此選項（需 Python）。`)); }
    $('#w-dendro').append(out); draw();
  })();

  // ================= P06 DBSCAN =================
  (function () {
    const r = rng(61), X = []; [[2.8, 7, .55, 45], [7.2, 7.2, .5, 40], [5, 2.6, .7, 40]].forEach(([x, y, s, n]) => { for (let i = 0; i < n; i++) X.push([x + s * randn(r), y + s * randn(r)]); }); for (let i = 0; i < 12; i++) X.push([.5 + r() * 9, .5 + r() * 9]);
    let eps = .7, mp = 5; const out = h('div');
    function draw() { out.innerHTML = ''; const R = ML.dbscan(X, eps, mp), cnt = { core: 0, border: 0, noise: 0 }; R.type.forEach(t => cnt[t]++);
      const b = h('div'); U.scatter(b, X.map((p, i) => ({ x: p[0], y: p[1], c: R.lab[i] < 0 ? '#b8bfc6' : COL[R.lab[i] % COL.length], r: R.type[i] === 'core' ? 4.2 : R.type[i] === 'border' ? 3 : 3, op: R.type[i] === 'border' ? .55 : .9, stroke: R.type[i] === 'noise' ? '#5d6774' : null })), { w: 400, h: 340, xmin: 0, xmax: 10, ymin: 0, ymax: 10, noGrid: true, xlabel: '特徵 1', ylabel: '特徵 2', over: [(sv, x, y) => { const ci = R.type.indexOf('core'); if (ci >= 0) U.s('circle', { cx: x(X[ci][0]), cy: y(X[ci][1]), r: x(eps) - x(0), fill: 'none', stroke: C.ink, 'stroke-dasharray': '3 3' }, sv); }] });
      const kd = X.map(p => X.map(q => Math.sqrt(ML.d2(p, q))).sort((a, c) => a - c)[Math.min(mp, X.length - 1)]).sort((a, c) => a - c);
      const kb = h('div'); const W = 320, H = 200, m = { l: 40, r: 10, t: 10, b: 30 }, sv = U.svgBox(kb, W, H), x = U.scale(0, kd.length, m.l, W - m.r), y = U.scale(0, 3, H - m.b, m.t);
      [0, 1, 2, 3].forEach(t => { U.s('line', { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: 'grid' }, sv); U.s('text', { x: m.l - 6, y: y(t) + 4, 'text-anchor': 'end', text: t }, sv); }); U.s('polyline', { points: kd.map((v, i) => `${x(i)},${y(Math.min(3, v))}`).join(' '), fill: 'none', stroke: C.accent, 'stroke-width': 2.2 }, sv); U.s('line', { x1: m.l, x2: W - m.r, y1: y(eps), y2: y(eps), stroke: C.bad, 'stroke-dasharray': '5 3' }, sv); U.s('text', { x: m.l + 4, y: y(eps) - 4, text: 'eps', style: 'fill:#c0392b;font-weight:600' }, sv); U.s('text', { x: (m.l + W - m.r) / 2, y: H - 4, 'text-anchor': 'middle', text: `各點到第 ${mp} 個鄰居的距離（排序）`, style: 'font-size:11px' }, sv);
      const msg = cnt.noise > X.length * .4 ? 'eps 太小或 min_samples 太大：大部分點變雜訊。看右邊 k-距離圖，把 eps 設在曲線急速上升的轉折處。' : R.k <= 1 ? 'eps 太大：所有群被併成一群。' : `找到 ${R.k} 群、${cnt.noise} 個雜訊點。不必事先指定群數——密度夠的地方自己長成群。`;
      out.append(h('div', { class: 'row', style: { marginBottom: '6px' } }, slider('eps（半徑）', .2, 2.5, .05, () => eps, v => eps = v, draw, v => (+v).toFixed(2)), slider('min_samples', 2, 12, 1, () => mp, v => mp = v, draw)),
        h('div', { class: 'grid2' }, cap(b, 420), h('div', null, h('div', { class: 'kpi' }, h('div', null, h('div', { class: 'k' }, '群數'), h('div', { class: 'v' }, R.k)), h('div', null, h('div', { class: 'k' }, '核心點'), h('div', { class: 'v' }, cnt.core)), h('div', null, h('div', { class: 'k' }, '邊界點'), h('div', { class: 'v' }, cnt.border)), h('div', null, h('div', { class: 'k' }, '雜訊點'), h('div', { class: 'v ' + (cnt.noise > X.length * .4 ? 'bad' : '') }, cnt.noise))), cap(kb, 340),
          h('div', { class: 'note ' + (cnt.noise > X.length * .4 || R.k <= 1 ? 'warn' : ''), style: { fontSize: '14px' } }, msg))),
        h('p', { class: 'ai' }, '大點＝核心點（半徑內 ≥ min_samples 個點）；淡色＝邊界點（自己不夠密但落在核心點半徑內）；灰點＝雜訊。AI Studio 把雜訊歸為 cluster_0，別誤讀成第一群（Python 為 −1）。min_samples 經驗值：維度數 × 2；高維時密度概念失效。')); }
    $('#w-db').append(out); draw();
  })();

  // ================= P07 形狀 =================
  (function () {
    const r = rng(15), n = 120, DS = {
      blob: (() => { const X = [], T = []; [[2.5, 7], [7.5, 7], [5, 2.5]].forEach(([x, y], g) => { for (let i = 0; i < 40; i++) { X.push([x + .8 * randn(r), y + .8 * randn(r)]); T.push(g); } }); return { X, T, k: 3, eps: .9, mp: 4 }; })(),
      moon: (() => { const X = [], T = []; for (let i = 0; i < 60; i++) { const t = Math.PI * i / 59; X.push([3.2 + 2.6 * Math.cos(t) + .18 * randn(r), 4.6 + 2.6 * Math.sin(t) + .18 * randn(r)]); T.push(0); X.push([5.8 - 2.6 * Math.cos(t) + .18 * randn(r), 5.4 - 2.6 * Math.sin(t) + .18 * randn(r)]); T.push(1); } return { X, T, k: 2, eps: .75, mp: 4 }; })(),
      ring: (() => { const X = [], T = []; for (let i = 0; i < 40; i++) { const a = r() * 2 * Math.PI, rr = 1 + .25 * randn(r); X.push([5 + rr * Math.cos(a), 5 + rr * Math.sin(a)]); T.push(0); } for (let i = 0; i < 80; i++) { const a = r() * 2 * Math.PI, rr = 3.8 + .25 * randn(r); X.push([5 + rr * Math.cos(a), 5 + rr * Math.sin(a)]); T.push(1); } return { X, T, k: 2, eps: .9, mp: 4 }; })(),
    };
    const avgLink = (X, k) => { const nn = X.length; let D = X.map(a => X.map(b => Math.sqrt(ML.d2(a, b)))), act = X.map((_, i) => i), sz = X.map(() => 1), grp = X.map((_, i) => [i]);
      while (act.length > k) { let bi = -1, bj = -1, bd = Infinity; for (let a = 0; a < act.length; a++) for (let b = a + 1; b < act.length; b++) { const d = D[act[a]][act[b]]; if (d < bd) { bd = d; bi = act[a]; bj = act[b]; } }
        act.forEach(c => { if (c !== bi && c !== bj) { D[bi][c] = D[c][bi] = (sz[bi] * D[bi][c] + sz[bj] * D[bj][c]) / (sz[bi] + sz[bj]); } }); sz[bi] += sz[bj]; grp[bi] = grp[bi].concat(grp[bj]); act = act.filter(c => c !== bj); }
      const lab = new Array(nn); act.forEach((c, ci) => grp[c].forEach(i => lab[i] = ci)); return lab; };
    const cache = {}; const run = (d, a) => { const key = d + a; if (cache[key]) return cache[key]; const D = DS[d]; let lab; if (a === 'km') lab = ML.kmeans(D.X, D.k, { seed: 4 }).lab; else if (a === 'hc') lab = avgLink(D.X, D.k); else lab = ML.dbscan(D.X, D.eps, D.mp).lab; return cache[key] = lab; };
    const correct = (lab, T) => { const ks = [...new Set(lab.filter(l => l >= 0))]; let s = 0; ks.forEach(c => { const cnt = {}; lab.forEach((l, i) => { if (l === c) cnt[T[i]] = (cnt[T[i]] || 0) + 1; }); s += Math.max(...Object.values(cnt)); }); const pur = s / T.length; return pur >= .93 && ks.length === new Set(T).size; };
    let d = 'moon'; const out = h('div');
    function draw() { out.innerHTML = ''; const D = DS[d]; const g = h('div', { class: 'grid3' });
      [['km', 'K-Means'], ['hc', '階層式（平均連結）'], ['db', 'DBSCAN']].forEach(([a, nm]) => { const lab = run(d, a), ok = correct(lab, D.T), b = h('div'); M3.plot(b, D.X, lab, { w: 300, h: 280, r: i => lab[i] < 0 ? 2.5 : 3.2 }); g.append(h('div', null, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('b', { style: { fontSize: '14px' } }, nm), h('span', { class: 'tag ' + (ok ? 'good' : 'bad') }, ok ? '✓ 正確' : '✗ 分錯')), b)); });
      const msg = { blob: '球狀：三者都做對了。這種情況選最快的 K-Means 即可。', moon: '彎月形：K-Means 與階層式從中間切開（錯）；DBSCAN 順著密集區延伸，正確分出兩彎。', ring: '同心圓：K-Means 切成左右兩半（完全錯）；DBSCAN 正確分出內外環。' }[d];
      out.append(h('div', { class: 'row', style: { marginBottom: '6px' } }, seg([['blob', '球狀'], ['moon', '彎月形'], ['ring', '同心圓']], () => d, v => d = v, draw)), g, h('div', { class: 'note', style: { fontSize: '14px' } }, msg + '　灰點＝DBSCAN 標出的雜訊。')); }
    $('#w-shape').append(out); draw();
  })();
  (function () {
    const R = [['需要指定群數', '★ 要', '不用（事後切）', '不用'], ['能抓的形狀', '只有球狀', '看連結方式，較彈性', '任意形狀'], ['雜訊處理', '強制每點歸群', '強制每點歸群', '★ 自動標為雜訊'], ['對離群值', '敏感（拉走中心）', '敏感（尤其單一連結）', '穩健'], ['計算量', '低，可處理大資料', '高（n×n 距離矩陣）', '中等'], ['結果穩定性', '依起始中心而變', '穩定', '依參數而變'], ['高維表現', '尚可', '尚可', '差（密度失效）'], ['AI Studio', 'k-Means / X-Means', 'Agglomerative Clustering', 'DBSCAN']];
    $('#w-cmp').append(h('div', { class: 'tscroll' }, h('table', { class: 'dt' }, h('tr', null, ['面向', 'K-Means', '階層式', 'DBSCAN'].map(c => h('th', null, c))), R.map(r => h('tr', null, r.map((v, j) => h('td', { style: { fontWeight: j ? 400 : 600 } }, v)))))), h('p', { class: 'ai' }, '實務建議：先跑 K-Means 建立基準（快），畫散布圖檢視結果；若形狀明顯不是球狀，再換 DBSCAN 或階層式。'));
  })();
})();
