/* 演算法實驗室 · 核心（不碰 DOM，瀏覽器與 Node 檢查程式共用）　凍結檔，請勿修改 */
(function (G) {
  'use strict';
  const LAB = G.LAB = G.LAB || {};
  LAB.version = '1.1';
  LAB.exps = LAB.exps || {};

  /* 實驗註冊：每個實驗檔只呼叫一次 */
  LAB.register = function (def) {
    if (!def || !def.id) throw new Error('LAB.register：缺少 id');
    LAB.exps[def.id] = def;
    if (typeof LAB.onRegister === 'function') LAB.onRegister(def);
  };

  /* 可重現亂數（mulberry32）。實驗檔只能用這個，不可用 Math.random */
  LAB.rng = function (seed) {
    let a = (seed >>> 0) || 1;
    return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };
  };
  LAB.randn = function (r) { let u = 0, v = 0; while (u === 0) u = r(); v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
  LAB.pick = function (r, arr) { return arr[Math.floor(r() * arr.length)]; };
  LAB.shuffle = function (r, arr) { const a = arr.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1));[a[i], a[j]] = [a[j], a[i]]; } return a; };

  /* 數學小工具 */
  const sum = a => a.reduce((s, v) => s + v, 0);
  const mean = a => a.length ? sum(a) / a.length : 0;
  /* sd(a) 為母體標準差（除以 n，與 scikit-learn StandardScaler 相同）；sd(a, 1) 為樣本標準差 */
  const sd = (a, ddof = 0) => { const m = mean(a); return Math.sqrt(sum(a.map(v => (v - m) * (v - m))) / Math.max(1, a.length - ddof)); };
  const median = a => { const b = a.slice().sort((x, y) => x - y), n = b.length; return n ? (n % 2 ? b[(n - 1) / 2] : (b[n / 2 - 1] + b[n / 2]) / 2) : 0; };
  const dist = (p, q) => Math.sqrt(sum(p.map((v, i) => (v - q[i]) * (v - q[i]))));
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const sigmoid = z => 1 / (1 + Math.exp(-z));
  LAB.M = { sum, mean, sd, median, dist, clamp, sigmoid,
    min: a => Math.min.apply(null, a), max: a => Math.max.apply(null, a),
    argmin: a => a.reduce((b, v, i) => v < a[b] ? i : b, 0), argmax: a => a.reduce((b, v, i) => v > a[b] ? i : b, 0),
    range: (n, f) => Array.from({ length: n }, (_, i) => f ? f(i) : i) };

  /* 數字顯示：f(3.14159, 2) → '3.14'；負號用真正的減號，-0 顯示為 0 */
  LAB.f = function (v, d = 2) {
    if (v == null || Number.isNaN(v)) return '—';
    if (typeof v !== 'number') return String(v);
    let s = v.toFixed(d); if (parseFloat(s) === 0) s = (0).toFixed(d);
    return s.replace('-', '−');
  };
  LAB.pct = (v, d = 0) => LAB.f(v * 100, d) + '%';

  /* 把函式取樣成格點，供 surface／regions 使用。回傳列優先的一維陣列（由上到下、由左到右，y 由大到小） */
  LAB.grid = function (fn, x0, x1, y0, y1, nx, ny) {
    const z = []; for (let j = 0; j < ny; j++) { const y = y1 - (j + 0.5) * (y1 - y0) / ny; for (let i = 0; i < nx; i++) { const x = x0 + (i + 0.5) * (x1 - x0) / nx; z.push(fn(x, y)); } }
    return { nx, ny, x0, x1, y0, y1, z };
  };

  /* 取欄位值 */
  LAB.col = (rows, key) => rows.map(r => r[key]);
  LAB.clone = o => JSON.parse(JSON.stringify(o));
})(typeof window !== 'undefined' ? window : globalThis);
