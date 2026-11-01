/* M3 互動頁 B：PART 08–14 */
(function () {
  'use strict';
  const { h, $, S, fmt, C, rng, randn, seg, slider, Store } = U;
  const { cap, COL } = window.M3;
  const pca = X => { const p = X[0].length, m = Array.from({ length: p }, (_, j) => S.mean(X.map(x => x[j]))), E = ML.eigSym(ML.covMatrix(X));
    const vals = E.values, vecs = E.vectors.map(v => { const big = v.reduce((a, b) => Math.abs(b) > Math.abs(a) ? b : a, 0); return big < 0 ? v.map(x => -x) : v; }); return { m, vals, vecs, proj: (x, k = 2) => vecs.slice(0, k).map(v => v.reduce((s, vj, j) => s + vj * (x[j] - m[j]), 0)) }; };
  const dl = (name, csv) => { const a = h('a', { href: URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })), download: name }); document.body.append(a); a.click(); a.remove(); };

  // ================= P08 群組剖析 =================
  (function () {
    const F = ['年齡', '年支出', '就診次數', '共病數'], r = rng(808), X = [];
    [[57, [74, 18, 4, 1.5], [6, 6, 1.5, .8]], [61, [38, 52, 3, .6], [7, 9, 1.4, .6]], [62, [63, 34, 11, 3.6], [7, 8, 2, .9]]].forEach(([n, mu, sd]) => { for (let i = 0; i < n; i++) X.push(mu.map((m, j) => Math.max(0, m + sd[j] * randn(r)))); });
    const Z = ML.standardize(X).Z; let k = 3; const st = Store.get('m3:profile', {}); const out = h('div');
    function draw() { out.innerHTML = ''; const km = ML.kmeans(Z, k, { seed: 8, runs: 5 });
      const G = Array.from({ length: k }, (_, c) => { const idx = km.lab.map((l, i) => l === c ? i : -1).filter(i => i >= 0); return { c, n: idx.length, z: F.map((_, j) => S.mean(idx.map(i => Z[i][j]))), raw: F.map((_, j) => S.mean(idx.map(i => X[i][j]))) }; });
      const W = 640, H = 270, m = { l: 40, r: 10, t: 14, b: 30 }, box = h('div'), sv = U.svgBox(box, W, H), y = U.scale(-1.6, 1.6, H - m.b, m.t), gw = (W - m.l - m.r) / F.length, bw = Math.min(30, (gw - 20) / k);
      [-1.5, -1, -.5, 0, .5, 1, 1.5].forEach(t => { U.s('line', { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: t ? 'grid' : 'axis' }, sv); U.s('text', { x: m.l - 6, y: y(t) + 4, 'text-anchor': 'end', text: (t > 0 ? '+' : '') + t }, sv); });
      F.forEach((f, j) => { U.s('text', { x: m.l + gw * (j + .5), y: H - m.b + 18, 'text-anchor': 'middle', text: f, style: 'font-weight:600' }, sv);
        G.forEach((g, gi) => { const v = Math.max(-1.6, Math.min(1.6, g.z[j])), x0 = m.l + gw * (j + .5) - bw * k / 2 + gi * bw; U.s('rect', { x: x0 + 1, y: Math.min(y(v), y(0)), width: bw - 2, height: Math.abs(y(v) - y(0)), fill: COL[g.c], rx: 2 }, sv); U.s('text', { x: x0 + bw / 2, y: v >= 0 ? y(v) - 4 : y(v) + 12, 'text-anchor': 'middle', text: Math.abs(g.z[j]) < .05 ? '0.0' : (g.z[j] > 0 ? '+' : '') + g.z[j].toFixed(1), style: 'font-size:10px' }, sv); }); });
      const tbl = h('table', { class: 'dt' }, h('tr', null, h('th', null, '群'), h('th', null, 'n（佔比）'), F.map(f => h('th', null, f + '平均')), h('th', null, '你的命名'), h('th', null, '對應行動')),
        G.map(g => { const key = k + ':' + g.c, row = st[key] || {}; const nm = h('input', { type: 'text', value: row.name || '', placeholder: '2–6 個字', style: { width: '110px' } }), ac = h('input', { type: 'text', value: row.act || '', placeholder: '照護／行銷策略', style: { width: '180px' } });
          nm.onchange = () => { st[key] = { ...(st[key] || {}), name: nm.value }; Store.set('m3:profile', st); }; ac.onchange = () => { st[key] = { ...(st[key] || {}), act: ac.value }; Store.set('m3:profile', st); draw(); };
          return h('tr', null, h('td', null, h('span', { style: { color: COL[g.c], fontWeight: 700 } }, '● ' + (g.c + 1))), h('td', { class: 'num' + (g.n / X.length < .05 ? ' hl' : '') }, `${g.n}（${Math.round(g.n / X.length * 100)}%）`), g.raw.map((v, j) => h('td', { class: 'num' }, v.toFixed(j === 3 ? 1 : 0))), h('td', null, nm), h('td', null, ac)); }));
      const acts = G.map(g => ((st[k + ':' + g.c] || {}).act || '').trim()).filter(Boolean), dup = acts.length !== new Set(acts).size;
      const msg = k === 3 ? '讀剖析圖：哪幾根特別突出？群內「年齡 +、支出 −」的是年長低支出型；「年齡 −、支出 +」是年輕高支出型；「就診、共病都很高」是高需求族群。' : k === 2 ? 'K = 2 把兩個不同的族群併在一起了——你寫得出兩種行動，但其中一群內部其實需求差很多。' : `K = ${k} 時有群被硬切開：比較它們的長條，是不是幾乎一樣？若寫出來的行動相同，就不需要分開。`;
      out.append(h('div', { class: 'row', style: { marginBottom: '6px' } }, h('span', { style: { fontSize: '14px', color: 'var(--muted)' } }, 'K'), seg([2, 3, 4, 5].map(v => [v, 'K = ' + v]), () => k, v => k = v, draw)),
        h('b', { style: { fontSize: '14px' } }, '各群在四個特徵上與整體平均的差（Z-Score）'), cap(box, 680), h('div', { class: 'tscroll', style: { marginTop: '8px' } }, tbl),
        h('div', { class: 'note ' + (dup ? 'warn' : ''), style: { fontSize: '14px' } }, dup ? '有兩群寫了相同的行動——代表這兩群其實不需要分開（作業一思考題 Q3）。試著降低 K。' : msg)); }
    $('#w-profile').append(out); draw();
  })();

  // ================= P09 異常偵測 =================
  const AN = (() => { const r = rng(909), X = []; for (let i = 0; i < 180; i++) { const a = randn(r), b = randn(r); X.push([5 + 1.1 * a, 5 + .7 * a + .8 * b]); } [[1, 9], [9.3, 1.2], [9.4, 9.2], [.8, 1.5]].forEach(p => X.push(p)); return X; })();
  (function () {
    const X = AN, Z = ML.standardize(X).Z; let n = 6, zt = 3; const out = h('div');
    const kd = Z.map(p => Z.map(q => Math.sqrt(ML.d2(p, q))).sort((a, b) => a - b)[5]), iso = ML.isoPath(X, 150, 3, 128);
    const top = (sc, hi) => { const idx = sc.map((v, i) => [v, i]).sort((a, b) => hi ? b[0] - a[0] : a[0] - b[0]).slice(0, n).map(o => o[1]); return new Set(idx); };
    function draw() { out.innerHTML = ''; const zs = new Set(Z.map((p, i) => Math.max(Math.abs(p[0]), Math.abs(p[1])) > zt ? i : -1).filter(i => i >= 0)), ks = top(kd, true), is = top(iso, false);
      const panel = (t, set, sub) => { const b = h('div'); U.scatter(b, X.map((p, i) => ({ x: p[0], y: p[1], c: set.has(i) ? C.bad : C.gray, r: set.has(i) ? 5 : 2.8, op: set.has(i) ? .95 : .6 })), { w: 280, h: 260, xmin: 0, xmax: 10, ymin: 0, ymax: 10, noGrid: true }); return h('div', null, h('b', { style: { fontSize: '14px' } }, t), h('div', { style: { fontSize: '12.5px', color: 'var(--muted)' } }, `${sub}　標出 ${set.size} 點`), b); };
      const all3 = [...zs].filter(i => ks.has(i) && is.has(i)).length, real = [180, 181, 182, 183], caught = s => real.filter(i => s.has(i)).length;
      out.append(h('div', { class: 'row', style: { marginBottom: '6px' } }, slider('統計法門檻 |z| >', 2, 4, .1, () => zt, v => zt = v, draw, v => (+v).toFixed(1)), slider('距離法／孤立森林：標出幾點（污染比例）', 2, 20, 1, () => n, v => n = v, draw, v => `${v} 點（${(v / X.length * 100).toFixed(1)}%）`)),
        h('div', { class: 'grid3' }, panel('① 統計法', zs, '假設近常態'), panel('② 距離法（第 5 鄰居）', ks, '必須先縮放'), panel('③ Isolation Forest', is, '不需假設分布')),
        h('div', { class: 'note', style: { fontSize: '14px' } }, `四個刻意放進去的離群點：統計法抓到 ${caught(zs)}、距離法 ${caught(ks)}、孤立森林 ${caught(is)}；三種方法同時標出 ${all3} 點。邊緣地帶的點就各有各的看法——沒有標準答案。把污染比例拉到 20 點：兩種方法照樣標出 20 點，不管實際只有 4 個。`)); }
    $('#w-anom').append(out); draw();
  })();
  (function () {
    const X = AN; let sel = 181, seed = 1; const out = h('div');
    function draw() { out.innerHTML = ''; const r = rng(seed * 37 + sel); let box = [0, 10, 0, 10], ids = X.map((_, i) => i); const cuts = [];
      while (ids.length > 1 && cuts.length < 40) { const j = r() < .5 ? 0 : 1, lo = Math.min(...ids.map(i => X[i][j])), hi = Math.max(...ids.map(i => X[i][j])); if (lo === hi) break; const s = lo + r() * (hi - lo); cuts.push({ j, s, box: box.slice() }); const left = X[sel][j] < s; ids = ids.filter(i => (X[i][j] < s) === left);
        if (j === 0) { if (left) box[1] = s; else box[0] = s; } else { if (left) box[3] = s; else box[2] = s; } }
      const avg = (() => { let t = 0; for (let k = 0; k < 100; k++) { const rr = rng(k * 7 + 3 + sel); let ii = X.map((_, i) => i), c = 0; while (ii.length > 1 && c < 40) { const j = rr() < .5 ? 0 : 1, lo = Math.min(...ii.map(i => X[i][j])), hi = Math.max(...ii.map(i => X[i][j])); if (lo === hi) break; const s = lo + rr() * (hi - lo), L = X[sel][j] < s; ii = ii.filter(i => (X[i][j] < s) === L); c++; } t += c; } return t / 100; })();
      const b = h('div'); U.scatter(b, X.map((p, i) => ({ x: p[0], y: p[1], c: i === sel ? C.bad : C.gray, r: i === sel ? 6 : 3, op: i === sel ? 1 : .55, onclick: () => { sel = i; draw(); }, title: '點我追蹤' })), { w: 420, h: 360, xmin: 0, xmax: 10, ymin: 0, ymax: 10, noGrid: true, under: [(sv, x, y) => { cuts.forEach(c => { const bx = c.box; if (c.j === 0) U.s('line', { x1: x(c.s), x2: x(c.s), y1: y(bx[2]), y2: y(bx[3]), stroke: C.blue, 'stroke-width': 1 }, sv); else U.s('line', { x1: x(bx[0]), x2: x(bx[1]), y1: y(c.s), y2: y(c.s), stroke: C.blue, 'stroke-width': 1 }, sv); }); U.s('rect', { x: x(box[0]), y: y(box[3]), width: x(box[1]) - x(box[0]), height: y(box[2]) - y(box[3]), fill: 'none', stroke: C.ink, 'stroke-width': 2.2 }, sv); }] });
      out.append(h('div', { class: 'row', style: { marginBottom: '6px' } }, h('button', { class: 'btn sm', onclick: () => { sel = 0; draw(); } }, '追蹤密集區的點'), h('button', { class: 'btn sm', onclick: () => { sel = 181; draw(); } }, '追蹤離群點'), h('button', { class: 'btn primary sm', onclick: () => { seed++; draw(); } }, '重新隨機切一次')),
        h('div', { class: 'grid2', style: { alignItems: 'center' } }, cap(b, 440), h('div', null, h('div', { class: 'kpi' }, h('div', null, h('div', { class: 'k' }, '這一次切了幾刀'), h('div', { class: 'v' }, cuts.length)), h('div', null, h('div', { class: 'k' }, '100 次平均刀數'), h('div', { class: 'v ' + (avg < 6 ? 'bad' : '') }, avg.toFixed(1)))),
          h('div', { class: 'note', style: { fontSize: '14px' } }, avg < 6 ? '稀疏區的點：兩三刀就孤立了 → 異常分數高。' : '密集區的點：要切很多刀，框內才只剩它自己 → 正常。'), h('p', { class: 'ai' }, '細線＝隨機切的一刀（隨機選一個特徵、在範圍內隨機選切點），粗框＝追蹤點目前所在、還沒被切開的區域。建很多棵這樣的樹取平均刀數，就是 Isolation Forest 的異常分數——不需要算距離，高維也能用。')))); }
    $('#w-iso').append(out); draw();
  })();

  // ================= P10 PCA =================
  (function () {
    const r = rng(1010), X = []; for (let i = 0; i < 120; i++) { const a = randn(r), b = randn(r); X.push([.83 * a + .12 * b, .78 * a - .2 * b + .1 * randn(r)]); }
    const P = pca(X), best = Math.atan2(P.vecs[0][1], P.vecs[0][0]) * 180 / Math.PI, bestDeg = ((best % 180) + 180) % 180, tot = S.sum(P.vals); let ang = 10; const out = h('div');
    function draw() { out.innerHTML = ''; const t = ang * Math.PI / 180, u = [Math.cos(t), Math.sin(t)], pr = X.map(x => u[0] * (x[0] - P.m[0]) + u[1] * (x[1] - P.m[1])), v = S.mean(pr.map(p => p * p)) * X.length / (X.length - 1), share = v / tot;
      const b = h('div'); U.scatter(b, X.map(p => ({ x: p[0], y: p[1], c: C.accent, r: 3, op: .7 })), { w: 380, h: 360, xmin: -3, xmax: 3, ymin: -3, ymax: 3, xlabel: '特徵 1（標準化）', ylabel: '特徵 2（標準化）', over: [(sv, x, y) => { U.s('line', { x1: x(P.m[0] - 3.5 * u[0]), y1: y(P.m[1] - 3.5 * u[1]), x2: x(P.m[0] + 3.5 * u[0]), y2: y(P.m[1] + 3.5 * u[1]), stroke: C.amber, 'stroke-width': 2.5 }, sv); X.forEach((p, i) => { if (i % 3) return; const q = [P.m[0] + pr[i] * u[0], P.m[1] + pr[i] * u[1]]; U.s('line', { x1: x(p[0]), y1: y(p[1]), x2: x(q[0]), y2: y(q[1]), stroke: C.amber, 'stroke-width': .7, opacity: .5 }, sv); }); }] });
      const strip = h('div'), sv = U.svgBox(strip, 380, 70), x = U.scale(-3.5, 3.5, 10, 370); U.s('line', { x1: 10, x2: 370, y1: 35, y2: 35, stroke: C.amber, 'stroke-width': 2 }, sv); pr.forEach(p => U.s('circle', { cx: x(p), cy: 35, r: 3, fill: C.accent, 'fill-opacity': .4 }, sv)); U.s('text', { x: 190, y: 64, 'text-anchor': 'middle', text: '投影到橘線上之後的 1 維資料', style: 'font-size:11px' }, sv);
      out.append(h('div', { class: 'row', style: { marginBottom: '6px' } }, slider('投影方向（度）', 0, 179, 1, () => ang, v => ang = v, draw, v => v + '°'), h('button', { class: 'btn primary sm', onclick: () => { ang = Math.round(bestDeg); draw(); } }, 'PCA 最佳解'), h('button', { class: 'btn sm', onclick: () => { ang = Math.round((bestDeg + 90) % 180); draw(); } }, '第 2 主成分方向')),
        h('div', { class: 'grid2', style: { alignItems: 'center' } }, cap(b, 400), h('div', null, h('div', { class: 'kpi' }, h('div', null, h('div', { class: 'k' }, '投影後變異'), h('div', { class: 'v' }, v.toFixed(3))), h('div', null, h('div', { class: 'k' }, '佔總變異'), h('div', { class: 'v ' + (share > .95 ? 'good' : share < .1 ? 'bad' : '') }, (share * 100).toFixed(1) + '%'))), cap(strip, 400),
          h('div', { class: 'note', style: { fontSize: '14px', fontFamily: 'var(--mono)' } }, `共變異數矩陣 → 特徵值 λ₁ = ${P.vals[0].toFixed(3)}、λ₂ = ${P.vals[1].toFixed(3)}`, h('br'), `PC1 = (${P.vecs[0].map(v => v.toFixed(3)).join(', ')})，方向 ${bestDeg.toFixed(0)}°`, h('br'), `PC1 解釋 ${(P.vals[0] / tot * 100).toFixed(1)}% 變異`),
          h('p', { class: 'ai' }, 'PC1 就是「投影後變異最大」的方向；PC2 與它正交，撿剩下的變異。轉到最佳解時，點散得最開；轉 90°，點擠成一團——那一軸就是 PCA 決定丟掉的。代價：PC1 = 0.7×特徵1 + 0.7×特徵2，不再是原本的欄位，難以向臨床人員解釋。')))); }
    $('#w-pca').append(out); draw();
  })();
  (function () {
    const r = rng(1111), L = [[.9, .85, .8, .1, .05, .1, 0, .1, .2, 0], [0, .1, .15, .9, .85, .8, .05, 0, .1, .2], [.1, 0, 0, .05, .1, 0, .85, .8, .3, .1]], X = [];
    for (let i = 0; i < 300; i++) { const f = [randn(r), randn(r), randn(r)]; X.push(L[0].map((_, j) => f[0] * L[0][j] + f[1] * L[1][j] + f[2] * L[2][j] + .45 * randn(r))); }
    const P = pca(ML.standardize(X).Z), tot = S.sum(P.vals), ratio = P.vals.map(v => v / tot), cum = ratio.map((_, i) => S.sum(ratio.slice(0, i + 1))); let th = 80; const out = h('div');
    function draw() { out.innerHTML = ''; const nk = cum.findIndex(c => c * 100 >= th) + 1, kai = P.vals.filter(v => v > 1).length;
      const W = 560, H = 260, m = { l: 44, r: 44, t: 14, b: 34 }, box = h('div'), sv = U.svgBox(box, W, H), bw = (W - m.l - m.r) / 10, y = U.scale(0, Math.ceil(P.vals[0]), H - m.b, m.t), y2 = U.scale(0, 1, H - m.b, m.t);
      U.ticks(0, Math.ceil(P.vals[0]), 4).forEach(t => { U.s('line', { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: 'grid' }, sv); U.s('text', { x: m.l - 6, y: y(t) + 4, 'text-anchor': 'end', text: t }, sv); }); [0, .5, 1].forEach(t => U.s('text', { x: W - m.r + 6, y: y2(t) + 4, text: t * 100 + '%', style: 'fill:#b45309' }, sv));
      P.vals.forEach((v, i) => { U.s('rect', { x: m.l + i * bw + 4, y: y(v), width: bw - 8, height: y(0) - y(v), fill: i < nk ? C.accent : C.gray, rx: 2 }, sv); U.s('text', { x: m.l + (i + .5) * bw, y: H - m.b + 16, 'text-anchor': 'middle', text: 'PC' + (i + 1) }, sv); U.s('text', { x: m.l + (i + .5) * bw, y: y(v) - 4, 'text-anchor': 'middle', text: (ratio[i] * 100).toFixed(0) + '%', style: 'font-size:10px' }, sv); });
      U.s('line', { x1: m.l, x2: W - m.r, y1: y(1), y2: y(1), stroke: C.blue, 'stroke-dasharray': '4 3' }, sv); U.s('text', { x: W - m.r - 4, y: y(1) - 4, 'text-anchor': 'end', text: 'λ = 1（Kaiser）', style: 'fill:#2b6cb0;font-size:11px' }, sv);
      U.s('polyline', { points: cum.map((c, i) => `${m.l + (i + .5) * bw},${y2(c)}`).join(' '), fill: 'none', stroke: C.amber, 'stroke-width': 2.2 }, sv); cum.forEach((c, i) => U.s('circle', { cx: m.l + (i + .5) * bw, cy: y2(c), r: 3, fill: C.amber }, sv)); U.s('line', { x1: m.l, x2: W - m.r, y1: y2(th / 100), y2: y2(th / 100), stroke: C.amber, 'stroke-dasharray': '6 4' }, sv);
      out.append(h('div', { class: 'row', style: { marginBottom: '6px' } }, slider('累積解釋變異門檻', 60, 95, 5, () => th, v => th = v, draw, v => v + '%')), cap(box, 600),
        h('div', { class: 'kpi' }, h('div', null, h('div', { class: 'k' }, `累積 ≥ ${th}%`), h('div', { class: 'v' }, nk + ' 個')), h('div', null, h('div', { class: 'k' }, 'Kaiser（λ > 1）'), h('div', { class: 'v' }, kai + ' 個')), h('div', null, h('div', { class: 'k' }, '陡坡轉折'), h('div', { class: 'v' }, '3 個'))),
        h('div', { class: 'note', style: { fontSize: '14px' } }, '這份 10 個欄位的模擬資料其實由 3 個潛在因素產生：PC3 之後長條突然變矮（陡坡轉折），Kaiser 法則也給 3。累積門檻定 80% 或 90% 會得到不同答案——報告裡寫出你用哪一個、為什麼。對應實作 2：A2 流程輸出的 Eigenvalues 就是這些長條。')); }
    $('#w-scree').append(out); draw();
  })();
  (function () {
    const DS = [1, 2, 5, 10, 20, 50, 100, 300], r = rng(1212);
    const R = DS.map(d => { const P = Array.from({ length: 200 }, () => Array.from({ length: d }, () => r())), q = P[0], ds = P.slice(1).map(p => Math.sqrt(ML.d2(p, q))); return { d, ds, ratio: (S.max(ds) - S.min(ds)) / S.mean(ds) }; });
    let di = 0; const out = h('div');
    function draw() { out.innerHTML = ''; const cur = R[di];
      const W = 320, H = 220, m = { l: 44, r: 10, t: 12, b: 34 }, box = h('div'), sv = U.svgBox(box, W, H), x = U.scale(0, DS.length - 1, m.l, W - m.r), y = U.scale(0, 3, H - m.b, m.t);
      [0, 1, 2, 3].forEach(t => { U.s('line', { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: 'grid' }, sv); U.s('text', { x: m.l - 6, y: y(t) + 4, 'text-anchor': 'end', text: t * 100 + '%' }, sv); }); DS.forEach((d, i) => U.s('text', { x: x(i), y: H - m.b + 16, 'text-anchor': 'middle', text: d }, sv)); U.s('text', { x: (m.l + W - m.r) / 2, y: H - 3, 'text-anchor': 'middle', text: '維度數', style: 'font-size:12px;fill:#5d6774' }, sv);
      U.s('polyline', { points: R.map((o, i) => `${x(i)},${y(o.ratio)}`).join(' '), fill: 'none', stroke: C.bad, 'stroke-width': 2.4 }, sv); R.forEach((o, i) => U.s('circle', { cx: x(i), cy: y(o.ratio), r: i === di ? 6 : 3.5, fill: i === di ? C.amber : C.bad }, sv));
      const hb = h('div'); U.hist(hb, [{ values: cur.ds.map(v => v / S.mean(cur.ds)), color: C.accent }], { w: 320, h: 220, bins: 24, min: 0, max: Math.max(2, Math.ceil(S.max(cur.ds) / S.mean(cur.ds))), xlabel: '距離 ÷ 平均距離' });
      out.append(h('div', { class: 'row', style: { marginBottom: '6px' } }, h('span', { style: { fontSize: '14px', color: 'var(--muted)' } }, '維度'), seg(DS.map((d, i) => [i, String(d)]), () => di, v => di = v, draw)),
        h('div', { class: 'grid2' }, h('div', null, h('b', { style: { fontSize: '13.5px' } }, '（最遠 − 最近）÷ 平均距離'), cap(box, 340)), h('div', null, h('b', { style: { fontSize: '13.5px' } }, `${cur.d} 維：199 個點到同一點的距離分布`), cap(hb, 340))),
        h('div', { class: 'note', style: { fontSize: '14px' } }, `${cur.d} 維時，最遠與最近的差距是平均距離的 ${(cur.ratio * 100).toFixed(0)}%。維度越高，所有距離擠向同一個值——「最近的鄰居」失去意義，K-Means、k-NN、DBSCAN 都受影響。這就是作業一思考題 Q4 的答案方向：欄位多了要先降維或做特徵選擇。`)); }
    $('#w-curse').append(out); draw();
  })();

  // ================= P11 降維＋分群 =================
  (function () {
    const r = rng(1313), X = [], T = [], MU = [[2.4, 0, 0, 1.4, 0, 0, 1.2, 0, 0, 0], [0, 2.4, 0, 0, 1.4, 0, 0, 1.2, 0, 0], [0, 0, 2.4, 0, 0, 1.4, 0, 0, 1.2, 0]];
    MU.forEach((mu, g) => { for (let i = 0; i < 60; i++) { X.push(mu.map(m => m + .55 * randn(r))); T.push(g); } });
    const P = pca(X), Y = X.map(x => P.proj(x, 2)), tot = S.sum(P.vals); let k = 3, colorTrue = false; const out = h('div');
    const ext = [Math.min(...Y.map(p => p[0])) - .3, Math.max(...Y.map(p => p[0])) + .3, Math.min(...Y.map(p => p[1])) - .3, Math.max(...Y.map(p => p[1])) + .3];
    function draw() { out.innerHTML = ''; const km = ML.kmeans(X, k, { seed: 13, runs: 5 }), cp = km.C.map(c => P.proj(c, 2)), sil = S.mean(ML.silhouette(X, km.lab));
      const a = h('div'), b = h('div'); const o = { w: 340, h: 300, xmin: ext[0], xmax: ext[1], ymin: ext[2], ymax: ext[3], xl: 'PC1', yl: 'PC2' };
      window.M3.plot(a, Y, null, o); window.M3.plot(b, Y, colorTrue ? T : km.lab, { ...o, cent: colorTrue ? [] : cp });
      out.append(h('div', { class: 'row', style: { marginBottom: '6px' } }, h('span', { style: { fontSize: '14px', color: 'var(--muted)' } }, '在 10 維原始空間跑 K-Means：'), seg([2, 3, 4, 5].map(v => [v, 'K = ' + v]), () => k, v => k = v, draw), U.check('改用真實群組上色（對答案）', () => colorTrue, v => colorTrue = v, draw)),
        h('div', { class: 'grid2' }, h('div', null, h('b', { style: { fontSize: '14px' } }, '步驟一：先 PCA 降到 2 維「看見」'), cap(a, 360)), h('div', null, h('b', { style: { fontSize: '14px' } }, colorTrue ? '真實群組' : `步驟三：10 維分群結果上色（K = ${k}）`), cap(b, 360))),
        h('div', { class: 'note', style: { fontSize: '14px' } }, `PC1＋PC2 解釋了 ${((P.vals[0] + P.vals[1]) / tot * 100).toFixed(0)}% 的變異，肉眼看得出大約三團——這是選 K 的第三個線索。分群是在 10 維做的（Silhouette ${sil.toFixed(3)}），降維圖只是拿來檢視；✕ 是 10 維群中心投影到同一張圖的位置。`)); }
    $('#w-combo').append(out); draw();
  })();
  $('#w-tsne').append(h('div', { class: 'grid2' },
    h('div', { class: 'concept', style: { gridTemplateColumns: '1fr' } }, h('div', null, h('b', null, 'PCA：線性投影'), '保留整體變異與全域距離結構；計算快、結果穩定、可以拿去後續建模。只抓線性關係，彎曲的結構抓不到。')),
    h('div', { class: 'concept', style: { gridTemplateColumns: '1fr' } }, h('div', null, h('b', null, 't-SNE：非線性'), '強調「鄰近關係」，群看起來更分明。只適合視覺化探索，不要拿它的座標去做後續建模。UMAP 是類似且較快的替代。'))),
    h('div', { class: 'wrong', style: { marginTop: '10px' } }, h('b', null, '★ t-SNE 的三個陷阱（Wattenberg et al., 2016）'), h('div', null, '① 群之間的距離沒有意義　② 群的大小沒有意義　③ 每次跑結果都不同（還受 perplexity 影響）')),
    h('p', { class: 'ai' }, '口訣：降維是為了「看見」，分群才是「切開」——兩件事分開想，順序才不會搞混。'));

  // ================= P12 AI Studio =================
  (function () {
    const LABS = [['實作 1｜Customer Credit Risk 分群', '範例/ML (AI Studio)/M3. 非監督式與降維/CLUSTERING - Customer Credit Risk 2026/', ['先跑 6. Iris Clustering K-means：資料小、結構清楚，建立直覺', '開 1 data preparation：確認 Normalize 有沒有啟用，記下被排除的欄位', '★ 停用 Normalize 跑一次、啟用再跑一次，比較兩組 centroid 表', '開 2 view clusters：檢視散布圖與各群中心，試著為每一群命名', '接 Cluster Distance Performance，k = 2 到 6 各跑一次記錄指標', '畫出手肘圖與 Davies-Bouldin 折線，決定你的 K（可填到 P13 的紀錄表）', '開 3 X-means：它自動決定的 K 與你手動選的一致嗎？', '開 4 PSO 版本觀摩（進階，理解即可）'], '未縮放時，分群幾乎由值域最大的欄位決定；手肘轉折常不明顯，要搭配其他判準。'],
      ['實作 2｜降維與 PCA', '範例/ML (AI Studio)/M3. 非監督式與降維/HR Churn 降維系列/', ['開 A2，找到 PCA Operator，檢視 Eigenvalues 與解釋變異比例', '把保留的主成分數從 2 調到 5，觀察累積解釋變異', '畫出陡坡圖（同 P10 的長條圖）', '決定保留幾個主成分並寫下理由（80% 門檻還是看轉折？）', '開 A3：Weights by PCA 是「特徵選擇」而非「特徵萃取」——比較兩者', '★ 思考：哪一種適合你的專題？（可解釋 vs 效果）', '進階：對降維後資料再跑 K-Means，與原始高維結果比較'], '前 2–3 個主成分通常就能解釋大部分變異；Weights by PCA 保留原始欄位名稱，可解釋性高得多。挑戰題：Dimension Reduction Challenge（abalone）。']];
    const st = Store.get('m3:labs', {}); const out = h('div');
    function draw() { out.innerHTML = ''; const g = h('div', { class: 'grid2' });
      LABS.forEach(([t, path, steps, exp], li) => { const done = steps.filter((_, i) => st[li + ':' + i]).length; g.append(h('div', { style: { border: '1px solid var(--line)', borderRadius: '10px', padding: '12px 14px', background: '#fff' } }, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('b', null, t), h('span', { class: 'tag ' + (done === steps.length ? 'good' : 'gray') }, `${done} / ${steps.length}`)), h('div', { class: 'mono', style: { fontSize: '12px', color: 'var(--muted)', margin: '4px 0 6px' } }, path),
        steps.map((s, i) => { const c = h('input', { type: 'checkbox' }); c.checked = !!st[li + ':' + i]; c.onchange = () => { st[li + ':' + i] = c.checked; Store.set('m3:labs', st); draw(); }; return h('label', { style: { display: 'flex', gap: '8px', padding: '4px 0', fontSize: '14px', cursor: 'pointer' } }, c, h('span', { style: { textDecoration: c.checked ? 'line-through' : 'none' } }, `${i + 1}. ${s}`)); }), h('div', { class: 'note', style: { fontSize: '13px', marginTop: '6px' } }, h('b', null, '預期結果：'), exp))); });
      out.append(g); }
    $('#w-labs').append(out); draw();
  })();

  // ================= P13 作業一 =================
  (function () {
    const KS = [2, 3, 4, 5, 6], st = Store.get('m3:k', {}); const out = h('div');
    function draw() { out.innerHTML = '';
      const t = h('table', { class: 'dt' }, h('tr', null, h('th', null, 'K'), h('th', null, 'Davies-Bouldin（必做，越小越好）'), h('th', null, 'Silhouette（選做，越大越好）'), h('th', null, 'Inertia／手肘（選填）')), KS.map(k => h('tr', null, h('td', { style: { fontWeight: 700 } }, k), ['db', 'sil', 'in'].map(key => { const inp = h('input', { type: 'number', step: 'any', value: (st[k] || {})[key] ?? '', style: { width: '110px' } }); inp.onchange = () => { st[k] = { ...(st[k] || {}), [key]: inp.value === '' ? '' : +inp.value }; Store.set('m3:k', st); draw(); }; return h('td', null, inp); }))));
      const ser = (key) => KS.map(k => (st[k] || {})[key]).map(v => v === '' || v == null ? null : v);
      const db = ser('db'), sl = ser('sil'), has = a => a.some(v => v != null);
      const chart = (vals, title, color, best) => { const W = 300, H = 200, m = { l: 44, r: 10, t: 12, b: 30 }, box = h('div'), sv = U.svgBox(box, W, H), v = vals.filter(x => x != null), lo = Math.min(...v), hi = Math.max(...v), pad = (hi - lo) * .15 || .1, x = U.scale(2, 6, m.l, W - m.r), y = U.scale(lo - pad, hi + pad, H - m.b, m.t);
        U.ticks(lo - pad, hi + pad, 4).forEach(t2 => { U.s('line', { x1: m.l, x2: W - m.r, y1: y(t2), y2: y(t2), class: 'grid' }, sv); U.s('text', { x: m.l - 6, y: y(t2) + 4, 'text-anchor': 'end', text: +t2.toFixed(2) }, sv); }); KS.forEach(k => U.s('text', { x: x(k), y: H - m.b + 16, 'text-anchor': 'middle', text: 'K=' + k }, sv));
        U.s('polyline', { points: KS.map((k, i) => vals[i] == null ? null : `${x(k)},${y(vals[i])}`).filter(Boolean).join(' '), fill: 'none', stroke: color, 'stroke-width': 2.4 }, sv); KS.forEach((k, i) => { if (vals[i] != null) U.s('circle', { cx: x(k), cy: y(vals[i]), r: k === best ? 7 : 4, fill: k === best ? C.amber : color }, sv); });
        return h('div', null, h('b', { style: { fontSize: '13.5px' } }, title), box); };
      const bestOf = (vals, min) => { let b = null, bv = null; vals.forEach((v, i) => { if (v != null && (bv == null || (min ? v < bv : v > bv))) { bv = v; b = KS[i]; } }); return b; };
      const bd = bestOf(db, true), bs = bestOf(sl, false), charts = h('div', { class: 'grid2' }); if (has(db)) charts.append(chart(db, 'Davies-Bouldin', C.bad, bd)); if (has(sl)) charts.append(chart(sl, 'Silhouette', C.blue, bs));
      const btn = h('button', { class: 'btn primary sm', onclick: () => dl('M3_作業一_K值紀錄.csv', 'K,Davies-Bouldin,Silhouette,Inertia\n' + KS.map(k => { const r2 = st[k] || {}; return [k, r2.db ?? '', r2.sil ?? '', r2.in ?? ''].join(','); }).join('\n')) }, '下載 CSV');
      const clr = h('button', { class: 'btn sm', onclick: () => { KS.forEach(k => delete st[k]); Store.set('m3:k', st); draw(); } }, '清除');
      const demo = h('button', { class: 'btn sm', onclick: () => { [[2, .95, .42, 155], [3, .78, .45, 106], [4, .82, .40, 76], [5, .74, .44, 58], [6, .80, .41, 47]].forEach(([k, a, b, c]) => st[k] = { db: a, sil: b, in: c }); Store.set('m3:k', st); draw(); } }, '填入示範數字');
      const msg = !has(db) ? '把 AI Studio Cluster Distance Performance 輸出的 Davies-Bouldin 填進表格，就會自動畫出折線並標出建議 K。' : (bs && bs !== bd ? `Davies-Bouldin 指向 K = ${bd}，Silhouette 指向 K = ${bs}——不一致是常態。報告中說明你最後相信哪一個、為什麼（例如哪個 K 的群組命名得出不同行動）。` : `建議 K = ${bd}${bs ? '（兩指標一致）' : ''}。記得再加上業務可解釋性：這幾群能對應到不同的策略嗎？`);
      out.append(h('div', { class: 'row', style: { marginBottom: '8px' } }, btn, demo, clr), h('div', { class: 'tscroll' }, t), charts, h('div', { class: 'note', style: { fontSize: '14px' } }, msg), h('p', { class: 'ai' }, '資料只存在你這台電腦的瀏覽器中。Silhouette 需用 Execute Python：from sklearn.metrics import silhouette_score。')); }
    $('#w-ktable').append(out); draw();
  })();
  (function () {
    const T = [['資料探索 EDA', '以 Statistics 檢視型態、極值、缺失；繪製各數值欄位分布，判斷偏態或多峰（多峰是群數的直觀線索）', 'P02'], ['前處理與類別編碼', '移除 ID 欄位並說明理由；類別欄位編碼並截圖前後型態。思考：Label Encoding 與 One-Hot 的距離意義有何不同？', 'P02'], ['相關性檢查', 'Correlation Matrix，找出 |r| 最高的一組並報告數值，說明是否移除', 'M1 P09'], ['★ 縮放對照實驗', '實驗 A（未縮放）與 B（Z-Score）各跑 K-Means（K=3），記錄群平均表與散布圖，說明縮放為何必要', 'P02'], ['決定最佳 K', '標準化後 K = 2–6，記錄 Davies-Bouldin（必做）與 Silhouette（選做），做成表格與折線圖', 'P04'], ['視覺化與群組命名', '群組上色散布圖；每群各特徵平均；為每群命名並提出行銷或照護策略', 'P08'], ['演算法比較', '另跑階層式或 DBSCAN，與 K-Means 比較，說明哪一個較適合這份資料', 'P05–P07']];
    const Q = ['Q1 為什麼縮放是必要的？用實驗 A 與 B 的實際數字說明——指出哪個欄位主導了分群、群平均差多少。', 'Q2 你選定的 K，三個判準（手肘、Silhouette、業務）各指向什麼？不一致時怎麼取捨？', 'Q3 你為每群取的名字能對應到不同的行動嗎？兩群行動一樣代表什麼？', 'Q4 若資料多了 20 個欄位，流程要改哪些地方？（維度詛咒、降維、演算法選擇）'];
    const st = Store.get('m3:tasks', {}); const out = h('div');
    function draw() { out.innerHTML = ''; T.forEach(([t, d, p], i) => { const c = h('input', { type: 'checkbox' }); c.checked = !!st[i]; c.onchange = () => { st[i] = c.checked; Store.set('m3:tasks', st); draw(); }; out.append(h('label', { style: { display: 'flex', gap: '10px', padding: '7px 4px', borderBottom: '1px solid var(--line)', cursor: 'pointer' } }, c, h('div', { style: { flex: 1 } }, h('b', { style: { textDecoration: st[i] ? 'line-through' : 'none' } }, `任務 ${i + 1}　${t}`), h('div', { style: { fontSize: '13.5px', color: 'var(--muted)' } }, d)), h('span', { class: 'tag gray', style: { alignSelf: 'flex-start', whiteSpace: 'nowrap' } }, p))); });
      out.append(h('div', { class: 'note', style: { fontSize: '14px', marginTop: '10px' } }, h('b', null, '四個必答思考題（寫入報告）'), Q.map(q => h('div', { style: { marginTop: '4px' } }, q))),
        h('p', { class: 'ai' }, `已完成 ${T.filter((_, i) => st[i]).length} / 7。評分：EDA 與前處理 20、縮放對照實驗 25、K 值決定 20、群組解讀與命名 20、演算法比較與報告品質 15；加分至多 +10（PCA 2D 視覺化、X-Means 對照、穩定性檢驗）。第 9 週上課前上傳 iClass，逾期一週內八折。`)); }
    $('#w-tasks').append(out); draw();
  })();

  // ================= P14 =================
  U.flashcards('#w-cards', [['非監督式學習', 'Unsupervised Learning', '沒有標籤，找資料本身的結構'], ['分群', 'Clustering', '把相似的個案分成幾群'], ['降維', 'Dimensionality Reduction', '把很多欄位壓成少數幾個'], ['異常偵測', 'Anomaly Detection', '找出不像其他人的個案'], ['K-Means', 'K-Means Clustering', '以中心點與距離反覆指派'], ['中心點', 'Centroid', '一群的平均位置＝典型個案'], ['組內平方和', 'Inertia / WCSS', '各點到自己群中心距離平方的總和'], ['手肘法', 'Elbow Method', 'Inertia 對 K 作圖找轉折'], ['輪廓係數', 'Silhouette', '(b−a)/max(a,b)，越大越好'], ['DB 指數', 'Davies-Bouldin Index', '群內緊密÷群間分離，越小越好'], ['X-Means', 'X-Means', '自動選 K 的 K-Means 變體'], ['凝聚式', 'Agglomerative', '由下而上反覆合併'], ['樹狀圖', 'Dendrogram', '合併順序與距離'], ['單一連結', 'Single Linkage', '兩群最短距離；易成鏈狀'], ['完全連結', 'Complete Linkage', '兩群最長距離；緊密均勻'], ['平均連結', 'Average Linkage', '所有配對距離的平均'], ['Ward 法', "Ward's Method", '合併後組內變異增加最少'], ['DBSCAN', 'Density-Based Clustering', '以密度定義群，可標雜訊'], ['核心點', 'Core Point', '半徑內鄰居數達門檻'], ['邊界點', 'Border Point', '不夠密但在核心點半徑內'], ['雜訊點', 'Noise Point', '不屬於任何群'], ['局部離群因子', 'LOF', '與鄰居相比密度稀疏程度'], ['孤立森林', 'Isolation Forest', '隨機切幾刀能孤立'], ['污染比例', 'Contamination', '預期異常所佔比例'], ['主成分分析', 'PCA', '找變異最大的正交方向'], ['特徵值', 'Eigenvalue', '該主成分方向上的變異量'], ['解釋變異比例', 'Explained Variance Ratio', '各主成分佔總變異的比例'], ['陡坡圖', 'Scree Plot', '各主成分變異的長條圖'], ['t-SNE', 't-SNE', '非線性降維，僅供視覺化'], ['維度詛咒', 'Curse of Dimensionality', '高維時距離失去鑑別力'], ['群組剖析', 'Cluster Profiling', '各群與整體平均的差異']]);
  U.finalQuiz('#w-final', [
    ['未縮放的年齡（20–80）與收入（100–1400 千元）跑 K-Means，結果會？', ['兩欄等權', '幾乎只依收入分群', '幾乎只依年齡分群', '跑不出來'], 1, '值域大的欄位主導距離。'],
    ['Inertia 隨 K 增加會？', ['先降後升', '一定下降', '一定上升', '不變'], 1, '所以不能選 Inertia 最小的 K。'],
    ['某點 a = 2、b = 8，Silhouette 為？', ['0.25', '0.75', '−0.75', '4'], 1, '(8−2)/8 = 0.75。'],
    ['平均 Silhouette = 0.2 代表？', ['群組結構強', '合理結構', '沒有明顯結構', '分錯了'], 2, '≤ 0.25 無明顯結構。'],
    ['資料呈兩彎月形，最適合？', ['K-Means', 'DBSCAN', 'PCA', '單一 K-Means 多跑幾次'], 1, 'DBSCAN 順著密度延伸，能抓任意形狀。'],
    ['AI Studio 的 DBSCAN 輸出 cluster_0 代表？', ['第一群', '雜訊點', '核心點', '最大群'], 1, 'Python 為 −1。'],
    ['樹狀圖上合併距離從 0.7 跳到 5.6，代表？', ['那裡是自然的切點', '連結方式選錯', '應該用 Ward', '資料有缺失'], 0, '距離大跳＝把兩個本來分開的群硬併在一起。'],
    ['Isolation Forest 異常分數高的點是？', ['要切很多刀才孤立', '切兩三刀就孤立', '在密集區中央', '離群中心最近'], 1, '稀疏區的點很快被隔離。'],
    ['PCA 第一主成分的意義？', ['最重要的原始欄位', '投影後變異最大的方向', '相關係數最高的兩欄', '群中心連線'], 1, 'PC 是原始欄位的線性組合，不是某一欄。'],
    ['兩群命名不同但對應行動一樣，代表？', ['命名要改', '這兩群不需要分開', 'K 太小', '要換演算法'], 1, '分群的最終判準是能不能幫你做決定。'],
  ]);
  (function () {
    const R = [['沒有標準答案', '最終判準是「這些群組能不能幫你做決定」。', 'p01'], ['縮放從可選變必要', '距離是所有技術的核心。', 'p02'], ['形狀決定演算法', 'K-Means 只擅長球狀；不規則用 DBSCAN；想看結構用階層式。', 'p07'], ['決定 K 三判準', '手肘看趨勢、Silhouette 看品質、業務可解釋性拍板。', 'p04'], ['分群跑完只是一半', '說不出每群是誰、該做什麼，就等於沒做。', 'p08'], ['PCA 保留變異但難解釋', '要解釋時改用特徵選擇（Weights by PCA）。', 'p10']];
    const g = h('div', { class: 'grid3' }); R.forEach(([t, d, id], i) => g.append(h('a', { href: '#' + id, style: { textDecoration: 'none', color: 'inherit', border: '1px solid var(--line)', borderRadius: '10px', padding: '10px 12px', background: '#fff', display: 'block' } }, h('div', { class: 'mono', style: { color: 'var(--accent)', fontWeight: 700 } }, i + 1), h('b', null, t), h('div', { style: { fontSize: '13.5px', color: 'var(--muted)' } }, d))));
    $('#w-review').append(g, h('div', { class: 'note' }, h('b', null, '下一步（第 7 週）：'), 'M4 進階監督式學習：集成、異常偵測與關聯規則。', h('a', { href: '../' }, '回到課程首頁 →')));
  })();
})();
