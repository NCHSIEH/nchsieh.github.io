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
  G.ML = { solve, ols, predict, standardize, lasso, polyfit, sigmoid, logistic, gini, cart, treeP, forest, wilson, regionMap };
})(window);
