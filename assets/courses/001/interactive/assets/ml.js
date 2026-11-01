/* 小型機器學習工具：線性代數、OLS、Ridge/Lasso、多項式、Logistic、CART、隨機森林 */
(function (G) {
  'use strict';
  const S = U.S;
  function solve(A, b) { const n = b.length, M = A.map((r, i) => [...r, b[i]]); for (let c = 0; c < n; c++) { let p = c; for (let r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[p][c])) p = r;[M[c], M[p]] = [M[p], M[c]]; const d = M[c][c] || 1e-12; for (let r = 0; r < n; r++) if (r !== c) { const f = M[r][c] / d; for (let k = c; k <= n; k++) M[r][k] -= f * M[c][k]; } } return M.map((r, i) => r[n] / (r[i] || 1e-12)); }
  const xtx = (X, lam = 0, skip0 = false) => { const p = X[0].length, A = Array.from({ length: p }, () => new Array(p).fill(0)); X.forEach(r => { for (let i = 0; i < p; i++) for (let j = 0; j < p; j++) A[i][j] += r[i] * r[j]; }); for (let i = skip0 ? 1 : 0; i < p; i++) A[i][i] += lam; return A; };
  const xty = (X, y) => { const p = X[0].length, b = new Array(p).fill(0); X.forEach((r, n) => { for (let i = 0; i < p; i++) b[i] += r[i] * y[n]; }); return b; };
  /* X 不含截距；回傳 [b0, b1, ...] */
  function ols(X, y, lam = 0) { const Z = X.map(r => [1, ...r]); return solve(xtx(Z, lam, true), xty(Z, y)); }
  const predict = (b, x) => b[0] + x.reduce((s, v, i) => s + v * b[i + 1], 0);
  function standardize(X) { const p = X[0].length, m = [], s = []; for (let j = 0; j < p; j++) { const c = X.map(r => r[j]); m.push(S.mean(c)); s.push(S.sd(c) || 1); } return { Z: X.map(r => r.map((v, j) => (v - m[j]) / s[j])), m, s }; }
  function lasso(Z, y, lam, iters = 200) { const n = Z.length, p = Z[0].length, my = S.mean(y), yc = y.map(v => v - my), b = new Array(p).fill(0), r = yc.slice(); const zz = []; for (let j = 0; j < p; j++) zz.push(S.sum(Z.map(row => row[j] ** 2)) / n);
    for (let it = 0; it < iters; it++) for (let j = 0; j < p; j++) { let rho = 0; for (let i = 0; i < n; i++) rho += Z[i][j] * (r[i] + Z[i][j] * b[j]); rho /= n; const nb = Math.sign(rho) * Math.max(0, Math.abs(rho) - lam) / zz[j]; const d = nb - b[j]; if (d) { for (let i = 0; i < n; i++) r[i] -= Z[i][j] * d; b[j] = nb; } }
    return [my, ...b]; }
  function polyfit(x, y, deg, lo, hi) { const t = v => 2 * (v - lo) / (hi - lo) - 1; const X = x.map(v => { const a = []; for (let d = 1; d <= deg; d++) a.push(t(v) ** d); return a; }); const b = ols(X, y, 1e-9); return v => { let s = b[0]; for (let d = 1; d <= deg; d++) s += b[d] * t(v) ** d; return s; }; }
  const sigmoid = z => 1 / (1 + Math.exp(-z));
  /* Logistic：X 不含截距，w 為樣本權重 */
  function logistic(X, y, w, opt = {}) { const p = X[0].length, b = new Array(p + 1).fill(0), lr = opt.lr || .5, it = opt.iters || 400, l2 = opt.l2 || 0; const W = w || y.map(() => 1), sw = S.sum(W);
    for (let k = 0; k < it; k++) { const g = new Array(p + 1).fill(0); X.forEach((r, i) => { const e = (sigmoid(predict(b, r)) - y[i]) * W[i]; g[0] += e; r.forEach((v, j) => g[j + 1] += e * v); }); for (let j = 0; j <= p; j++) b[j] -= lr * (g[j] / sw + (j ? l2 * b[j] : 0)); }
    return b; }
  const gini = (c1, n) => n ? 1 - (c1 / n) ** 2 - (1 - c1 / n) ** 2 : 0;
  /* 二維 CART；pts=[{x:[..], y:0/1}] */
  function cart(pts, depth, opt = {}) { const minLeaf = opt.minLeaf || 1, r = opt.rng, mtry = opt.mtry;
    function build(P, d) { const n = P.length, c1 = P.filter(p => p.y).length, leaf = { leaf: true, p: n ? c1 / n : 0, n };
      if (d === 0 || n < 2 * minLeaf || c1 === 0 || c1 === n) return leaf;
      let feats = P[0].x.map((_, j) => j); if (mtry && r) { feats = feats.sort(() => r() - .5).slice(0, mtry); }
      let best = null; const g0 = gini(c1, n);
      feats.forEach(j => { const s = P.slice().sort((a, b) => a.x[j] - b.x[j]); let l1 = 0; for (let i = 0; i < n - 1; i++) { l1 += s[i].y; if (s[i].x[j] === s[i + 1].x[j] || i + 1 < minLeaf || n - i - 1 < minLeaf) continue; const nl = i + 1, nr = n - nl, g = (nl * gini(l1, nl) + nr * gini(c1 - l1, nr)) / n; if (!best || g < best.g) best = { g, j, t: (s[i].x[j] + s[i + 1].x[j]) / 2 }; } });
      if (!best || g0 - best.g < 1e-9) return leaf;
      return { j: best.j, t: best.t, l: build(P.filter(p => p.x[best.j] <= best.t), d - 1), r: build(P.filter(p => p.x[best.j] > best.t), d - 1), n, p: c1 / n }; }
    return build(pts, depth); }
  const treeP = (t, x) => { while (!t.leaf) t = x[t.j] <= t.t ? t.l : t.r; return t.p; };
  function forest(pts, ntree, depth, seed) { const r = U.rng(seed), T = []; for (let k = 0; k < ntree; k++) { const bs = pts.map(() => pts[Math.floor(r() * pts.length)]); T.push(cart(bs, depth, { rng: r, mtry: 1, minLeaf: 2 })); } return x => S.mean(T.map(t => treeP(t, x))); }
  function wilson(k, n, z = 1.96) { if (!n) return [0, 0]; const p = k / n, d = 1 + z * z / n, c = (p + z * z / (2 * n)) / d, h = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d; return [Math.max(0, c - h), Math.min(1, c + h)]; }
  /* 二維分類底色圖：f(x,y)->機率 */
  function regionMap(sv, x, y, f, x0, x1, y0, y1, nx = 60, ny = 45, th = .5) { const dx = (x1 - x0) / nx, dy = (y1 - y0) / ny, g = U.s('g', null, sv); for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) { const cx = x0 + (i + .5) * dx, cy = y0 + (j + .5) * dy, p = f(cx, cy); U.s('rect', { x: x(x0 + i * dx), y: y(y0 + (j + 1) * dy), width: x(x0 + dx) - x(x0) + .6, height: y(y0) - y(y0 + dy) + .6, fill: p >= th ? '#f5c9c2' : '#cfe3f3', 'fill-opacity': .75 }, g); } return g; }

  /* ---------- 非監督式 ---------- */
  const d2 = (a, b) => { let s = 0; for (let i = 0; i < a.length; i++) s += (a[i] - b[i]) ** 2; return s; };
  function kmeans(X, k, opt = {}) { const r = U.rng(opt.seed || 1), runs = opt.runs || 8; let best = null;
    for (let rep = 0; rep < runs; rep++) { let C = opt.init ? opt.init.map(c => c.slice()) : [X[Math.floor(r() * X.length)].slice()];
      while (C.length < k) { const dd = X.map(x => Math.min(...C.map(c => d2(x, c)))); let t = r() * dd.reduce((a, b) => a + b, 0), j = 0; while ((t -= dd[j]) > 0 && j < X.length - 1) j++; C.push(X[j].slice()); }
      let lab = [], hist = [{ C: C.map(c => c.slice()) }];
      for (let it = 0; it < (opt.iters || 60); it++) { lab = X.map(x => { let bi = 0, bd = Infinity; C.forEach((c, i) => { const v = d2(x, c); if (v < bd) { bd = v; bi = i; } }); return bi; });
        const NC = C.map((c, i) => { const m = X.filter((_, n) => lab[n] === i); return m.length ? c.map((_, j) => m.reduce((s, v) => s + v[j], 0) / m.length) : c; });
        const moved = NC.some((c, i) => d2(c, C[i]) > 1e-12); C = NC; hist.push({ lab: lab.slice(), C: C.map(c => c.slice()) }); if (!moved) break; }
      const inertia = X.reduce((s, x, n) => s + d2(x, C[lab[n]]), 0);
      if (!best || inertia < best.inertia) best = { lab, C, inertia, hist }; if (opt.init) break; }
    return best; }
  function silhouette(X, lab) { const k = Math.max(...lab) + 1, s = X.map((x, i) => { const sums = new Array(k).fill(0), cnt = new Array(k).fill(0); X.forEach((y, j) => { if (i !== j) { sums[lab[j]] += Math.sqrt(d2(x, y)); cnt[lab[j]]++; } }); const own = lab[i]; if (!cnt[own]) return 0; const a = sums[own] / cnt[own]; let b = Infinity; for (let c = 0; c < k; c++) if (c !== own && cnt[c]) b = Math.min(b, sums[c] / cnt[c]); return (b - a) / Math.max(a, b); }); return s; }
  function daviesBouldin(X, lab, C) { const k = C.length, S = C.map((c, i) => { const m = X.filter((_, n) => lab[n] === i); return m.length ? m.reduce((s, x) => s + Math.sqrt(d2(x, c)), 0) / m.length : 0; }); let tot = 0; for (let i = 0; i < k; i++) { let mx = 0; for (let j = 0; j < k; j++) if (i !== j) mx = Math.max(mx, (S[i] + S[j]) / Math.sqrt(d2(C[i], C[j]))); tot += mx; } return tot / k; }
  /* 凝聚式階層分群：回傳合併紀錄 [{a,b,d,members}] */
  function agglomerative(X, link = 'average') { let G = X.map((_, i) => ({ id: i, m: [i] })), next = X.length; const merges = [], D = (A, B) => { const ds = []; A.m.forEach(i => B.m.forEach(j => ds.push(Math.sqrt(d2(X[i], X[j]))))); return link === 'single' ? Math.min(...ds) : link === 'complete' ? Math.max(...ds) : ds.reduce((a, b) => a + b, 0) / ds.length; };
    while (G.length > 1) { let bi = 0, bj = 1, bd = Infinity; for (let i = 0; i < G.length; i++) for (let j = i + 1; j < G.length; j++) { const d = D(G[i], G[j]); if (d < bd) { bd = d; bi = i; bj = j; } } const n = { id: next++, m: G[bi].m.concat(G[bj].m), a: G[bi].id, b: G[bj].id, d: bd }; merges.push(n); G = G.filter((_, i) => i !== bi && i !== bj).concat([n]); }
    return merges; }
  function cutTree(n, merges, h) { const parent = {}; let lab = Array.from({ length: n }, (_, i) => i); merges.forEach(m => { if (m.d <= h) { const t = lab[m.m[0]]; m.m.forEach(i => lab[i] = t); } }); const map = {}; let c = 0; return lab.map(v => (v in map ? map[v] : (map[v] = c++))); }
  function dbscan(X, eps, minPts) { const n = X.length, e2 = eps * eps, nb = X.map(x => X.map((y, j) => d2(x, y) <= e2 ? j : -1).filter(j => j >= 0)), core = nb.map(a => a.length >= minPts), lab = new Array(n).fill(-1); let c = 0;
    for (let i = 0; i < n; i++) { if (lab[i] !== -1 || !core[i]) continue; const q = [i]; lab[i] = c; while (q.length) { const p = q.pop(); if (!core[p]) continue; nb[p].forEach(j => { if (lab[j] === -1) { lab[j] = c; q.push(j); } }); } c++; }
    const type = X.map((_, i) => core[i] ? 'core' : lab[i] >= 0 ? 'border' : 'noise'); return { lab, type, k: c }; }
  /* Isolation Forest：回傳每點平均路徑長度（越短越異常） */
  function isoPath(X, ntree = 100, seed = 7, sub = 128) { const r = U.rng(seed), p = X[0].length, H = new Array(X.length).fill(0), cn = n => n <= 1 ? 0 : 2 * (Math.log(n - 1) + .5772) - 2 * (n - 1) / n;
    for (let t = 0; t < ntree; t++) { const idx = Array.from({ length: Math.min(sub, X.length) }, () => Math.floor(r() * X.length));
      const build = (ids, depth) => { if (ids.length <= 1 || depth > 12) return { leaf: true, n: ids.length }; const j = Math.floor(r() * p), vals = ids.map(i => X[i][j]), lo = Math.min(...vals), hi = Math.max(...vals); if (lo === hi) return { leaf: true, n: ids.length }; const s = lo + r() * (hi - lo); return { j, s, l: build(ids.filter(i => X[i][j] < s), depth + 1), r: build(ids.filter(i => X[i][j] >= s), depth + 1) }; };
      const tree = build(idx, 0); X.forEach((x, i) => { let nd = tree, d = 0; while (!nd.leaf) { nd = x[nd.j] < nd.s ? nd.l : nd.r; d++; } H[i] += d + cn(nd.n); }); }
    return H.map(v => v / ntree); }
  /* 對稱矩陣特徵分解（Jacobi） */
  function eigSym(A) { const n = A.length, a = A.map(r => r.slice()), V = Array.from({ length: n }, (_, i) => Array.from({ length: n }, (_, j) => i === j ? 1 : 0));
    for (let sw = 0; sw < 100; sw++) { let off = 0; for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) off += a[i][j] ** 2; if (off < 1e-12) break;
      for (let p = 0; p < n; p++) for (let q = p + 1; q < n; q++) { if (Math.abs(a[p][q]) < 1e-14) continue; const th = (a[q][q] - a[p][p]) / (2 * a[p][q]), t = Math.sign(th || 1) / (Math.abs(th) + Math.sqrt(th * th + 1)), c = 1 / Math.sqrt(t * t + 1), s = t * c;
        for (let k = 0; k < n; k++) { const akp = a[k][p], akq = a[k][q]; a[k][p] = c * akp - s * akq; a[k][q] = s * akp + c * akq; } for (let k = 0; k < n; k++) { const apk = a[p][k], aqk = a[q][k]; a[p][k] = c * apk - s * aqk; a[q][k] = s * apk + c * aqk; } for (let k = 0; k < n; k++) { const vkp = V[k][p], vkq = V[k][q]; V[k][p] = c * vkp - s * vkq; V[k][q] = s * vkp + c * vkq; } } }
    const vals = a.map((r, i) => r[i]), ord = vals.map((v, i) => i).sort((x, y) => vals[y] - vals[x]); return { values: ord.map(i => vals[i]), vectors: ord.map(i => V.map(r => r[i])) }; }
  function covMatrix(X) { const n = X.length, p = X[0].length, m = Array.from({ length: p }, (_, j) => X.reduce((s, x) => s + x[j], 0) / n); return Array.from({ length: p }, (_, i) => Array.from({ length: p }, (_, j) => X.reduce((s, x) => s + (x[i] - m[i]) * (x[j] - m[j]), 0) / (n - 1))); }
  G.ML = { d2, kmeans, silhouette, daviesBouldin, agglomerative, cutTree, dbscan, isoPath, eigSym, covMatrix, solve, ols, predict, standardize, lasso, polyfit, sigmoid, logistic, gini, cart, treeP, forest, wilson, regionMap };
})(window);
