/* M2-1 互動頁 B：PART 08–14 */
(function () {
  'use strict';
  const { h, $, S, fmt, C, rng, randn, Store, seg, slider, check } = U;
  const cap = (el, px) => { el.style.maxWidth = px + 'px'; el.style.width = '100%'; el.style.margin = '0 auto'; return el; };
  const rmse = (y, p) => Math.sqrt(S.mean(y.map((v, i) => (v - p[i]) ** 2)));

  // ================= P08 五個假設 =================
  (function () {
    const A = [['線性 Linearity', '殘差圖有無彎曲', '系統性高估／低估某些區間', 'x²、log(x)、樣條'], ['誤差獨立 Independence', '殘差有無週期；Durbin-Watson', '標準誤低估、p 值過度樂觀', '納入時間／群組結構；混合效應模型'], ['誤差常態 Normality', '殘差直方圖、Q-Q 圖', '小樣本時 p 值不可信（大樣本影響小）', '對 y 取對數；bootstrap 信賴區間'], ['等變異 Equal Variance', '殘差圖有無喇叭狀', '預測區間在高值區失準', '對 y 取對數；加權最小平方；穩健標準誤'], ['無完美共線性', '相關矩陣、VIF', '係數不穩、正負翻轉，無法解釋因素', '刪變數、合成變數、Ridge']];
    const t = h('table', { class: 'dt' }, h('tr', null, ['假設', '檢查方法', '違反的後果', '處理'].map(c => h('th', null, c))), A.map((r, i) => h('tr', null, r.map((v, j) => h('td', { style: { whiteSpace: 'normal', fontWeight: j === 0 ? 600 : 400 }, class: (i === 3 || i === 4) && j === 0 ? 'hl' : '' }, v)))));
    $('#w-assume').append(h('div', { class: 'tscroll' }, t), h('p', { class: 'ai' }, '黃底：醫療資料最常違反的兩項（費用、天數右偏；生理指標成群相關）。'));
  })();

  // ================= P08 對數 =================
  (function () {
    const r = rng(33), X = []; for (let i = 0; i < 1200; i++) X.push(31000 * Math.exp(.75 * randn(r)));
    let lg = false, beta = .18, k = 1; const out = h('div');
    function draw() { out.innerHTML = '';
      const V = lg ? X.map(Math.log) : X.map(v => Math.min(v / 1000, 300)), m = S.mean(V), md = S.median(V);
      const ch = h('div'); U.hist(ch, [{ values: V, color: C.accent, opacity: .8 }], { min: lg ? 8 : 0, max: lg ? 13 : 300, bins: 40, w: 460, h: 220, xlabel: lg ? 'ln(費用)' : '費用（千元，≥300 併入最右）', marks: [{ x: md, label: '中位數', color: C.good }, { x: m, label: '平均', color: C.bad, dy: 13 }] });
      const eb = Math.exp(beta * k), pct = (eb - 1) * 100;
      out.append(h('div', { class: 'grid2' }, h('div', null, h('div', { class: 'row', style: { marginBottom: '6px' } }, seg([[false, '原始費用'], [true, 'ln(費用)']], () => lg, v => lg = v, draw), h('span', { class: 'tag ' + (Math.abs(S.skew(V)) > 1 ? 'amber' : 'good') }, `偏度 ${S.skew(V).toFixed(2)}`)), ch),
        h('div', null, h('div', { style: { fontWeight: 600, marginBottom: '6px' } }, 'ln(y) 模型的係數怎麼讀'), h('div', { class: 'row' }, slider('係數 β', -.5, .5, .01, () => beta, v => beta = v, draw, v => (+v).toFixed(2)), slider('x 增加幾單位', 1, 10, 1, () => k, v => k = v, draw)),
          h('div', { class: 'note', style: { fontSize: '15px', fontFamily: 'var(--mono)' } }, `e^(${beta.toFixed(2)}×${k}) = ${eb.toFixed(3)} → y ${pct >= 0 ? '增加' : '減少'} ${Math.abs(pct).toFixed(1)}%`),
          h('p', { class: 'ai' }, `例：ln(費用) 對共病數的係數 0.18 → 每多一項共病，費用約 ×1.197（+19.7%）。b 很小時 e^b ≈ 1+b。預測要指數還原：e^(預測值) 還原的是中位數；估平均需乘 smearing 係數（Duan, 1983），誤差回原尺度評估。`)))); }
    $('#w-log').append(out); draw();
  })();

  // ================= P09 多項式 =================
  (function () {
    const r = rng(26), f0 = x => 1 + 1.6 * x - .17 * x * x, TR = [], TE = [];
    for (let i = 0; i < 12; i++) { const x = .3 + r() * 7.4; TR.push({ x, y: f0(x) + .7 * randn(r) }); }
    for (let i = 0; i < 60; i++) { const x = .5 + r() * 7; TE.push({ x, y: f0(x) + .7 * randn(r) }); }
    const curve = d => ML.polyfit(TR.map(p => p.x), TR.map(p => p.y), d, 0, 8);
    const ALL = Array.from({ length: 9 }, (_, i) => { const f = curve(i + 1); return { d: i + 1, tr: rmse(TR.map(p => p.y), TR.map(p => f(p.x))), te: rmse(TE.map(p => p.y), TE.map(p => f(p.x))) }; });
    const best = ALL.reduce((a, b) => b.te < a.te ? b : a);
    let deg = 1; const out = h('div');
    function draw() { out.innerHTML = ''; const f = curve(deg), cur = ALL[deg - 1];
      const c1 = h('div'); U.scatter(c1, [...TE.map(p => ({ x: p.x, y: p.y, c: C.gray, r: 2.5, op: .5 })), ...TR.map(p => ({ x: p.x, y: p.y, c: C.ink, r: 4.5 }))], { w: 420, h: 280, xmin: 0, xmax: 8, ymin: -2, ymax: 9, xlabel: '特徵 x', ylabel: 'y', over: [(sv, x, y) => { const pts = []; for (let v = .3; v <= 7.7; v += .02) pts.push(`${x(v)},${y(Math.max(-2, Math.min(9, f(v))))}`); U.s('polyline', { points: pts.join(' '), fill: 'none', stroke: deg === best.d ? C.accent : deg > 4 ? C.bad : C.amber, 'stroke-width': 2.5 }, sv); }] });
      const c2 = h('div'); const W = 380, H = 280, m = { l: 40, r: 12, t: 14, b: 34 }, sv = U.svgBox(c2, W, H), x = U.scale(1, 9, m.l, W - m.r), y = U.scale(0, 4, H - m.b, m.t);
      [0, 1, 2, 3, 4].forEach(t => { U.s('line', { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: 'grid' }, sv); U.s('text', { x: m.l - 6, y: y(t) + 4, 'text-anchor': 'end', text: t }, sv); }); for (let d = 1; d <= 9; d++) U.s('text', { x: x(d), y: H - m.b + 16, 'text-anchor': 'middle', text: d }, sv);
      U.s('text', { x: (m.l + W - m.r) / 2, y: H - 3, 'text-anchor': 'middle', text: '多項式次數', style: 'font-size:12px;fill:#5d6774' }, sv);
      [['tr', C.gray], ['te', C.blue]].forEach(([k, c]) => U.s('polyline', { points: ALL.map(a => `${x(a.d)},${y(Math.min(4, a[k]))}`).join(' '), fill: 'none', stroke: c, 'stroke-width': 2.5 }, sv));
      U.s('line', { x1: x(deg), x2: x(deg), y1: m.t, y2: H - m.b, stroke: C.amber, 'stroke-dasharray': '4 3', 'stroke-width': 2 }, sv); U.s('text', { x: x(best.d), y: y(Math.min(4, best.te)) - 10, 'text-anchor': 'middle', text: '▲ 甜蜜點', style: 'fill:#0d6b67;font-weight:600' }, sv);
      const state = deg < best.d ? ['欠擬合', '模型太簡單，訓練與測試誤差都高', 'warn'] : deg === best.d ? ['剛好', '訓練與測試接近且都不高——偏誤與變異的平衡點', ''] : cur.te > cur.tr * 1.6 ? ['過擬合', '訓練誤差很低，測試誤差回升——開始背雜訊', 'bad'] : ['略複雜', '測試誤差已不再下降', 'warn'];
      out.append(h('div', { class: 'row', style: { marginBottom: '6px' } }, slider('多項式次數', 1, 9, 1, () => deg, v => deg = v, draw)),
        h('div', { class: 'grid2' }, h('div', null, cap(c1, 440), h('div', { class: 'legend' }, h('span', null, h('i', { style: { background: C.ink } }), '訓練 12 筆'), h('span', null, h('i', { style: { background: C.gray } }), '測試 60 筆'))), h('div', null, cap(c2, 400), h('div', { class: 'legend' }, h('span', null, h('i', { style: { background: C.gray } }), '訓練 RMSE'), h('span', null, h('i', { style: { background: C.blue } }), '測試 RMSE')))),
        h('div', { class: 'kpi', style: { margin: '8px 0' } }, h('div', null, h('div', { class: 'k' }, '訓練 RMSE'), h('div', { class: 'v' }, cur.tr.toFixed(2))), h('div', null, h('div', { class: 'k' }, '測試 RMSE'), h('div', { class: 'v ' + (state[2] === 'bad' ? 'bad' : '') }, cur.te > 9 ? '> 9' : cur.te.toFixed(2))), h('div', null, h('div', { class: 'k' }, '判定'), h('div', { class: 'v' }, state[0]))),
        h('div', { class: 'note ' + state[2], style: { fontSize: '14px' } }, state[1] + '。這條曲線到處都是：k-NN 的 k、樹的深度、正則化的 λ——換個參數名，同一個故事。')); }
    $('#w-poly').append(out); draw();
  })();

  // ================= P09 交叉驗證 =================
  (function () {
    const r = rng(52), P = []; for (let i = 0; i < 120; i++) { const x = r() * 10; P.push({ x, y: 2 + .8 * x + 1.6 * randn(r) }); }
    let k = 5, seed = 1, singles = []; const out = h('div');
    const fitEval = (tr, te) => { const b = ML.ols(tr.map(p => [p.x]), tr.map(p => p.y)); return rmse(te.map(p => p.y), te.map(p => b[0] + b[1] * p.x)); };
    function draw() { out.innerHTML = '';
      const rr = rng(seed * 31), idx = P.map((_, i) => [rr(), i]).sort((a, b) => a[0] - b[0]).map(a => a[1]);
      const folds = Array.from({ length: k }, (_, f) => idx.filter((_, j) => j % k === f));
      const sc = folds.map(f => { const te = f.map(i => P[i]), tr = P.filter((_, i) => !f.includes(i)); return fitEval(tr, te); });
      const grid = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '3px' } }); folds.forEach((_, f) => grid.append(h('div', { style: { display: 'flex', alignItems: 'center', gap: '6px' } }, h('span', { class: 'mono', style: { width: '44px', fontSize: '12px', color: 'var(--muted)' } }, `第 ${f + 1} 折`), h('div', { style: { display: 'flex', flex: 1, gap: '2px' } }, Array.from({ length: k }, (_, j) => h('div', { style: { flex: 1, height: '16px', borderRadius: '3px', background: j === f ? C.amber : '#cfe3e0' } }))), h('span', { class: 'mono', style: { width: '90px', fontSize: '12px' } }, 'RMSE ' + sc[f].toFixed(2)))));
      const bt = h('button', { class: 'btn sm' }, '單次 80/20 切分 ×20'); bt.onclick = () => { const rs = rng(Date.now() % 1e6); singles = Array.from({ length: 20 }, () => { const id = P.map((_, i) => [rs(), i]).sort((a, b) => a[0] - b[0]).map(a => a[1]); return fitEval(id.slice(0, 96).map(i => P[i]), id.slice(96).map(i => P[i])); }); draw(); };
      const strip = h('div'); if (singles.length) { const sv = U.svgBox(strip, 420, 60), x = U.scale(1, 2.4, 20, 400); [1.2, 1.6, 2, 2.4].forEach(t => U.s('text', { x: x(t), y: 56, 'text-anchor': 'middle', text: t }, sv)); singles.forEach(v => U.s('circle', { cx: x(v), cy: 22, r: 5, fill: C.gray, 'fill-opacity': .7 }, sv)); U.s('line', { x1: x(S.mean(sc)), x2: x(S.mean(sc)), y1: 6, y2: 38, stroke: C.amber, 'stroke-width': 3 }, sv); }
      out.append(h('div', { class: 'row', style: { marginBottom: '8px' } }, seg([[5, '5-fold'], [10, '10-fold']], () => k, v => k = v, draw), h('button', { class: 'btn sm', onclick: () => { seed++; draw(); } }, '重新洗牌'), bt),
        h('div', { class: 'grid2' }, grid, h('div', null, h('div', { class: 'kpi' }, h('div', null, h('div', { class: 'k' }, `${k}-fold CV RMSE`), h('div', { class: 'v' }, `${S.mean(sc).toFixed(2)} ± ${S.sd(sc).toFixed(2)}`))), singles.length ? h('div', null, h('div', { style: { fontSize: '13px', color: 'var(--muted)', marginTop: '6px' } }, `20 次單次切分的 RMSE：${S.min(singles).toFixed(2)}–${S.max(singles).toFixed(2)}（灰點）；橘線為 CV 平均`), strip) : '',
          h('div', { class: 'note', style: { fontSize: '14px' } }, '正確寫法：「5-fold CV：RMSE 2.3 ± 0.2 天」。只寫一個數字，讀者無從判斷它有多可信。小資料集：驗證集可用交叉驗證取代，但測試集仍要獨立保留、只看一次。')))); }
    $('#w-cv').append(out); draw();
  })();

  // ================= P10 虛擬變數 =================
  (function () {
    const D = [['內科', [5, 4, 6]], ['外科', [8, 9, 7]], ['復健科', [12, 11, 13]]]; let ref = '內科'; const out = h('div');
    function draw() { out.innerHTML = ''; const mean = {}; D.forEach(([g, v]) => mean[g] = S.mean(v)); const others = D.map(d => d[0]).filter(g => g !== ref);
      const t = h('table', { class: 'dt' }, h('tr', null, h('th', null, '科別'), others.map(o => h('th', null, o + ' (0/1)')), h('th', null, '住院天數')), D.flatMap(([g, v]) => v.map(d => h('tr', null, h('td', { class: g === ref ? 'hl' : '' }, g), others.map(o => h('td', { class: 'num' }, o === g ? 1 : 0)), h('td', { class: 'num' }, d)))));
      const coef = h('div', { class: 'note', style: { fontSize: '14.5px', fontFamily: 'var(--mono)' } }, h('div', null, `截距 = ${mean[ref].toFixed(1)}（參照組 ${ref} 的平均）`), others.map(o => h('div', null, `${o} 係數 = ${(mean[o] - mean[ref] >= 0 ? '+' : '') + (mean[o] - mean[ref]).toFixed(1)}`)));
      const pr = h('div', { class: 'kpi' }, D.map(([g]) => h('div', null, h('div', { class: 'k' }, g + ' 預測'), h('div', { class: 'v' }, mean[g].toFixed(1) + ' 天'))));
      out.append(h('div', { class: 'row', style: { marginBottom: '8px' } }, h('span', { style: { fontSize: '14px', color: 'var(--muted)' } }, '參照組'), seg(D.map(d => [d[0], d[0]]), () => ref, v => ref = v, draw)),
        h('div', { class: 'grid2' }, h('div', { class: 'tscroll' }, t), h('div', null, coef, pr, h('p', { class: 'ai' }, `「外科係數」＝外科比參照組多住幾天，不是外科的絕對天數。3 個科別只展開 2 欄（k−1），全展開會與截距完全共線。換參照組，係數全變但預測不變——報告一定要寫明參照組。AI Studio：Nominal to Numerical → dummy coding，勾選 use comparison groups。`)))); }
    $('#w-dummy').append(out); draw();
  })();

  // ================= P10 交互作用 =================
  (function () {
    const r = rng(61), P = []; [[40, .5], [60, .3], [80, .1]].forEach(([age, s]) => { for (let i = 0; i < 30; i++) { const hr = r() * 8; P.push({ hr, age, y: 2 + s * hr + (80 - age) * .01 + .45 * randn(r) }); } });
    let inter = false; const out = h('div'); const COL = { 40: C.good, 60: C.amber, 80: C.bad };
    function draw() { out.innerHTML = '';
      const X = P.map(p => inter ? [p.hr, p.age, p.hr * p.age] : [p.hr, p.age]), b = ML.ols(X, P.map(p => p.y));
      const pf = (hr, age) => b[0] + b[1] * hr + b[2] * age + (inter ? b[3] * hr * age : 0);
      const ch = h('div'); U.scatter(ch, P.map(p => ({ x: p.hr, y: p.y, c: COL[p.age], r: 3 })), { w: 440, h: 280, xmin: 0, xmax: 8, ymin: 0, ymax: 8, xlabel: '每週復健時數', ylabel: '功能恢復分數', over: [(sv, x, y) => [40, 60, 80].forEach(a => U.s('line', { x1: x(0), y1: y(pf(0, a)), x2: x(8), y2: y(pf(8, a)), stroke: COL[a], 'stroke-width': 2.5 }, sv))] });
      const sl = a => inter ? b[1] + b[3] * a : b[1];
      out.append(h('div', { class: 'row', style: { marginBottom: '6px' } }, check('加入交互作用項 時數 × 年齡', () => inter, v => inter = v, draw)),
        h('div', { class: 'grid2', style: { alignItems: 'center' } }, cap(ch, 460), h('div', null, h('div', { class: 'kpi' }, [40, 60, 80].map(a => h('div', null, h('div', { class: 'k' }, a + ' 歲的復健斜率'), h('div', { class: 'v' }, (sl(a) >= 0 ? '+' : '') + sl(a).toFixed(2))))),
          h('div', { class: 'note ' + (inter ? '' : 'warn'), style: { fontSize: '14px' } }, inter ? `dY/d時數 = b₁ + b₃×年齡，b₃ = ${b[3].toFixed(4)}：年齡越大，每小時復健的邊際效果越小。放了交互作用項，主效果必須保留（階層原則）；中心化可緩解 VIF。` : '沒有交互作用項，模型被迫用一條共同斜率代表三群人——三條線平行，對誰都不準。依年齡分組畫散布圖，斜率明顯不同就該加交互作用項。')))); }
    $('#w-inter').append(out); draw();
  })();

  // ================= P10 樣本數 =================
  (function () {
    let p = 8, n = 120; const out = h('div');
    function draw() { out.innerHTML = ''; const ratio = n / p, lo = p * 10, hi = p * 20, ok = ratio >= 20 ? 'good' : ratio >= 10 ? '' : 'bad';
      out.append(h('div', { class: 'row' }, slider('候選變數數', 1, 30, 1, () => p, v => p = v, draw), slider('樣本數', 20, 1000, 10, () => n, v => n = v, draw)),
        h('div', { class: 'kpi', style: { margin: '8px 0' } }, h('div', null, h('div', { class: 'k' }, '每變數樣本數'), h('div', { class: 'v ' + (ok || '') }, ratio.toFixed(1))), h('div', null, h('div', { class: 'k' }, '建議至少'), h('div', { class: 'v' }, `${lo}–${hi} 筆`))),
        h('div', { class: 'note ' + (ok === 'bad' ? 'bad' : ok === '' ? 'warn' : ''), style: { fontSize: '14px' } }, ok === 'bad' ? '樣本不足：過擬合幾乎必然。選擇：用領域知識先砍變數（不要用逐步迴歸砍）、改用 Ridge／Lasso、或在限制段誠實寫明比例。' : ok === '' ? '勉強夠：建議用交叉驗證確認各折分數是否穩定。' : '樣本數充足。仍以交叉驗證的穩定度為最終依據。'),
        h('p', { class: 'ai' }, '經驗法則：每個「候選」變數 10–20 筆——篩掉的變數也用掉了自由度。臨床資料常常幾十到幾百筆卻有幾十個欄位，這是最容易做出漂亮但無效模型的情境。')); }
    $('#w-ss').append(out); draw();
  })();

  // ================= P11 Ridge / Lasso =================
  (function () {
    const n = 100, p = 8, r = rng(30), TRUE = [2, 0, 1, -1, .5, 0, 0, .3]; const X = [], y = [];
    for (let i = 0; i < n; i++) { const z1 = randn(r), row = [z1, .97 * z1 + Math.sqrt(1 - .97 * .97) * randn(r)]; for (let j = 2; j < p; j++) row.push(randn(r)); X.push(row); y.push(row.reduce((s, v, j) => s + v * TRUE[j], 0) + 2.5 * randn(r)); }
    const ntr = 40, std = ML.standardize(X.slice(0, ntr)), Zte = X.slice(ntr).map(rw => rw.map((v, j) => (v - std.m[j]) / std.s[j])), ytr = y.slice(0, ntr), yte = y.slice(ntr);
    const GRID = { ridge: Array.from({ length: 41 }, (_, i) => 10 ** (-2 + i * .125)), lasso: Array.from({ length: 41 }, (_, i) => 10 ** (-3 + i * .085)) };
    const fit = (mode, lam) => mode === 'ridge' ? ML.ols(std.Z, ytr, lam) : ML.lasso(std.Z, ytr, lam);
    const PATH = {}; ['ridge', 'lasso'].forEach(m => PATH[m] = GRID[m].map(l => { const b = fit(m, l); return { l, b, te: rmse(yte, Zte.map(rw => ML.predict(b, rw))) }; }));
    let mode = 'ridge', li = 0; const out = h('div'); const COL = ['#0d6b67', '#c0392b', '#2b6cb0', '#b45309', '#7c3aed', '#8a929c', '#a3abb4', '#2f7d4f'];
    function draw() { out.innerHTML = ''; const P = PATH[mode], cur = P[li], best = P.reduce((a, b) => b.te < a.te ? b : a);
      const W = 520, H = 300, m = { l: 44, r: 14, t: 14, b: 36 }, ch = h('div'), sv = U.svgBox(ch, W, H), x = U.scale(Math.log10(P[0].l), Math.log10(P[P.length - 1].l), m.l, W - m.r), lo = -5, hi = 7, yy = U.scale(lo, hi, H - m.b, m.t);
      [-4, -2, 0, 2, 4, 6].forEach(t => { U.s('line', { x1: m.l, x2: W - m.r, y1: yy(t), y2: yy(t), class: 'grid', stroke: t === 0 ? C.ink : null }, sv); U.s('text', { x: m.l - 6, y: yy(t) + 4, 'text-anchor': 'end', text: t }, sv); });
      for (let e = Math.ceil(Math.log10(P[0].l)); e <= Math.log10(P[P.length - 1].l); e++) U.s('text', { x: x(e), y: H - m.b + 16, 'text-anchor': 'middle', text: 10 ** e >= 1 ? 10 ** e : (10 ** e).toPrecision(1) }, sv);
      U.s('text', { x: (m.l + W - m.r) / 2, y: H - 3, 'text-anchor': 'middle', text: '懲罰強度 λ（對數軸）', style: 'font-size:12px;fill:#5d6774' }, sv);
      for (let j = 0; j < p; j++) U.s('polyline', { points: P.map(q => `${x(Math.log10(q.l))},${yy(Math.max(lo, Math.min(hi, q.b[j + 1])))}`).join(' '), fill: 'none', stroke: COL[j], 'stroke-width': j < 2 ? 2.8 : 1.8 }, sv);
      U.s('line', { x1: x(Math.log10(cur.l)), x2: x(Math.log10(cur.l)), y1: m.t, y2: H - m.b, stroke: C.amber, 'stroke-width': 2, 'stroke-dasharray': '4 3' }, sv);
      U.s('line', { x1: x(Math.log10(best.l)), x2: x(Math.log10(best.l)), y1: m.t, y2: H - m.b, stroke: C.good, 'stroke-width': 1.5 }, sv); U.s('text', { x: x(Math.log10(best.l)) + 4, y: m.t + 10, text: '驗證最佳', style: 'fill:#2f7d4f;font-weight:600' }, sv);
      const bars = h('div'); U.hbars(bars, cur.b.slice(1).map((v, j) => ({ label: `x${j + 1} = ${v >= 0 ? '+' : '−'}${Math.abs(v).toFixed(2)}（真值 ${TRUE[j]}）`, value: Math.abs(v), color: Math.abs(v) < 1e-6 ? '#e2ddd2' : COL[j] })), { w: 380, lw: 170, rowH: 22, max: 7, fmt: () => '' });
      const zeros = cur.b.slice(1).filter(v => Math.abs(v) < 1e-6).length;
      out.append(h('div', { class: 'row', style: { marginBottom: '6px' } }, seg([['ridge', 'Ridge（L2）'], ['lasso', 'Lasso（L1）']], () => mode, v => mode = v, draw), slider('λ', 0, 40, 1, () => li, v => li = v, draw, v => { const l = PATH[mode][v].l; return l < .1 ? l.toPrecision(2) : l.toFixed(l < 10 ? 2 : 0); })),
        h('div', { class: 'grid2' }, h('div', null, ch, h('div', { class: 'legend' }, COL.map((c, j) => h('span', null, h('i', { style: { background: c } }), 'x' + (j + 1))))), h('div', null, h('div', { style: { fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' } }, '目前的係數（長條為絕對值，標準化尺度）'), bars,
          h('div', { class: 'kpi', style: { marginTop: '6px' } }, h('div', null, h('div', { class: 'k' }, '驗證 RMSE'), h('div', { class: 'v ' + (cur === best ? 'good' : '') }, cur.te.toFixed(2))), mode === 'lasso' ? h('div', null, h('div', { class: 'k' }, '被壓到 0 的變數'), h('div', { class: 'v' }, zeros + ' 個')) : ''))),
        h('div', { class: 'note', style: { fontSize: '14px' } }, li < 6 ? `λ 很小：等同普通最小平方。共線的 x1、x2（相關 0.97）被估成 ${cur.b[1].toFixed(1)} 與 ${cur.b[2].toFixed(1)}——一正一負、遠離真值 2 與 0，係數不穩。` : cur.te > best.te * 1.15 && li > 30 ? 'λ 太大：所有係數被壓扁，模型退化成只剩截距 → 欠擬合。' : mode === 'lasso' ? 'Lasso 把不重要的係數直接壓到 0（灰色長條）＝自動變數選擇；真值為 0 的 x2、x6、x7 通常最先消失。' : 'Ridge 把係數穩定地壓向 0 但不歸零；共線的 x1、x2 不再互相擺盪。犧牲一點訓練誤差，換取驗證誤差下降。'),
        h('p', { class: 'ai' }, '模擬 100 筆 × 8 個變數（40 訓練／60 驗證，刻意讓樣本少、變數相關）。λ 的選法：掃一排 λ，每個跑交叉驗證，取驗證誤差最低者；最終測試集不參與選 λ。AI Studio：GLM 的 alpha（0＝Ridge、1＝Lasso）＋ Optimize Parameters。')); }
    $('#w-ridge').append(out); draw();
  })();

  // ================= P12 CI vs PI =================
  (function () {
    const r = rng(60), P = []; for (let i = 0; i < 60; i++) { const a = 40 + r() * 40; P.push({ x: a, y: 2.23 + .119 * a + 1.1 * randn(r) }); }
    const b = ML.ols(P.map(p => [p.x]), P.map(p => p.y)), n = P.length, mx = S.mean(P.map(p => p.x)), sxx = S.sum(P.map(p => (p.x - mx) ** 2)), s = Math.sqrt(S.sum(P.map(p => (p.y - b[0] - b[1] * p.x) ** 2)) / (n - 2)), t = 2.0;
    const ci = x0 => t * s * Math.sqrt(1 / n + (x0 - mx) ** 2 / sxx), pi = x0 => t * s * Math.sqrt(1 + 1 / n + (x0 - mx) ** 2 / sxx);
    let age = 60; const out = h('div');
    function draw() { out.innerHTML = ''; const f = v => b[0] + b[1] * v;
      const ch = h('div'); U.scatter(ch, P.map(p => ({ x: p.x, y: p.y, c: C.gray, r: 3 })), { w: 520, h: 300, xmin: 38, xmax: 82, ymin: 2, ymax: 16, xlabel: '年齡', ylabel: '住院天數', under: [(sv, x, y) => { const xs = []; for (let v = 40; v <= 80; v += 1) xs.push(v); U.s('polygon', { points: [...xs.map(v => `${x(v)},${y(f(v) + pi(v))}`), ...xs.slice().reverse().map(v => `${x(v)},${y(f(v) - pi(v))}`)].join(' '), fill: C.amber, 'fill-opacity': .15 }, sv); U.s('polygon', { points: [...xs.map(v => `${x(v)},${y(f(v) + ci(v))}`), ...xs.slice().reverse().map(v => `${x(v)},${y(f(v) - ci(v))}`)].join(' '), fill: C.blue, 'fill-opacity': .35 }, sv); }],
        over: [(sv, x, y) => { U.s('line', { x1: x(40), y1: y(f(40)), x2: x(80), y2: y(f(80)), stroke: C.ink, 'stroke-width': 2 }, sv); U.s('line', { x1: x(age), x2: x(age), y1: y(f(age) - pi(age)), y2: y(f(age) + pi(age)), stroke: C.amber, 'stroke-width': 3 }, sv); U.s('line', { x1: x(age) + 6, x2: x(age) + 6, y1: y(f(age) - ci(age)), y2: y(f(age) + ci(age)), stroke: C.blue, 'stroke-width': 4 }, sv); }] });
      out.append(h('div', { class: 'row', style: { marginBottom: '6px' } }, slider('年齡', 40, 80, 1, () => age, v => age = v, draw)),
        h('div', { class: 'grid2', style: { alignItems: 'center' } }, ch, h('div', null, h('div', { class: 'kpi' }, h('div', null, h('div', { class: 'k' }, '預測值'), h('div', { class: 'v' }, f(age).toFixed(1) + ' 天')), h('div', null, h('div', { class: 'k' }, '信賴區間（平均）'), h('div', { class: 'v', style: { color: C.blue } }, '±' + ci(age).toFixed(2))), h('div', null, h('div', { class: 'k' }, '預測區間（單一病人）'), h('div', { class: 'v', style: { color: C.amber } }, '±' + pi(age).toFixed(2)))),
          h('div', { class: 'note', style: { fontSize: '14px' } }, `寬了約 ${(pi(age) / ci(age)).toFixed(1)} 倍——多的是個體之間的隨機變異，不會因為樣本變多而消失。注意兩條帶子在資料兩端都變寬：離平均年齡越遠，估得越不準。`)))); }
    $('#w-pi').append(out); draw();
  })();

  $('#w-tree').append(h('div', { class: 'grid2' }, h('div', { class: 'concept' }, h('div', null, h('b', null, '線性迴歸的優勢'), '係數可直接解讀、有信賴區間與 p 值；樣本需求較少；醫學文獻的通用語言。適合：關係大致線性、需要解釋、樣本不多')), h('div', { class: 'concept' }, h('div', null, h('b', null, '迴歸樹／集成的優勢'), '自動抓非線性與交互作用；不需正規化；對離群值較不敏感。但無法外插——預測永遠落在訓練資料範圍內'))),
    h('p', { class: 'ai' }, '實務建議：先跑線性迴歸建立可解釋的基準線，再跑迴歸樹或隨機森林看能否大幅超越。差距很大＝關係高度非線性，值得回頭做特徵工程。M4 會實作。'));

  // ================= P13 實作 =================
  (function () {
    const L = [['實作 1｜University Admission', '入門', '基準與檢定：記錄 R²、RMSE；找 p > 0.05 的特徵移除後重跑；比較調整後 R²；畫殘差圖；用一句話解讀係數。', '4.1 University Admission / university_admission.csv'], ['實作 2｜Car Sales ★ 本週核心', '中', '漸進改良五輪：原始 → 遺失值 → 離群值 → 對數（注意還原）→ 多項式或交互作用。先讀「資料品質檢查.docx」。', '4.2 Car Sales / car_sales_data.csv'], ['實作 3｜Car Purchasing', '進階', '特徵選擇與交叉驗證：Forward Selection 包住迴歸；比較全變數與選擇後的 CV RMSE；fold 10 → 5；用領域知識覆核入選變數。', 'AI Studio Repository ▸ 4.3.1 Car Purchasing']];
    const g = h('div', { class: 'grid3' }); L.forEach(([t, lv, d, f]) => g.append(h('div', { style: { border: '1px solid var(--line)', borderRadius: '10px', padding: '10px 12px', background: '#fff' } }, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('b', null, t), h('span', { class: 'tag ' + (lv === '入門' ? 'good' : lv === '中' ? 'amber' : 'bad') }, lv)), h('div', { style: { fontSize: '13.5px', color: 'var(--muted)', margin: '4px 0' } }, d), h('code', { style: { fontSize: '11.5px' } }, f))));
    $('#w-labs').append(g);
  })();

  // ================= P13 五輪表 =================
  (function () {
    const R = ['第 0 輪：原始', '第 1 輪：處理遺失值', '第 2 輪：處理離群值', '第 3 輪：價格取對數（已還原）', '第 4 輪：多項式／交互作用'], K = [['mae', 'MAE'], ['rmse', 'RMSE'], ['r2', 'R²'], ['adj', '調整後 R²']];
    const st = Store.get('m21:rounds', {}); const out = h('div');
    function draw() { out.innerHTML = '';
      const t = h('table', { class: 'dt' }, h('tr', null, h('th', null, '輪次'), K.map(k => h('th', null, k[1])), h('th', null, 'RMSE 變化'), h('th', null, '這輪做了什麼／觀察')), R.map((rn, i) => { const row = st[i] || {}; const prev = i ? (st[i - 1] || {}).rmse : null, cur = row.rmse; const d = prev != null && cur != null && prev !== '' && cur !== '' ? (cur - prev) / prev * 100 : null;
        return h('tr', null, h('td', { style: { fontWeight: 600 } }, rn), K.map(([k]) => { const inp = h('input', { type: 'number', step: 'any', value: row[k] ?? '', style: { width: '74px' } }); inp.onchange = () => { st[i] = { ...(st[i] || {}), [k]: inp.value === '' ? '' : +inp.value }; Store.set('m21:rounds', st); draw(); }; return h('td', null, inp); }), h('td', { class: 'num ' + (d == null ? '' : d < 0 ? 'ok' : 'hl') }, d == null ? '—' : (d > 0 ? '+' : '') + d.toFixed(1) + '%'), h('td', null, (() => { const i2 = h('input', { type: 'text', value: row.note || '', style: { width: '220px' } }); i2.onchange = () => { st[i] = { ...(st[i] || {}), note: i2.value }; Store.set('m21:rounds', st); }; return i2; })())); }));
      const dl = h('button', { class: 'btn primary sm' }, '下載 CSV'); dl.onclick = () => { const csv = '﻿輪次,MAE,RMSE,R2,調整後R2,說明\n' + R.map((rn, i) => { const r = st[i] || {}; return [rn, r.mae ?? '', r.rmse ?? '', r.r2 ?? '', r.adj ?? '', `"${(r.note || '').replace(/"/g, '""')}"`].join(','); }).join('\n'); const a = h('a', { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'M2-1_五輪改良表.csv' }); document.body.append(a); a.click(); a.remove(); };
      out.append(h('div', { class: 'row', style: { marginBottom: '8px' } }, dl), h('div', { class: 'tscroll' }, t), h('p', { class: 'ai' }, '取對數那一輪通常改善最明顯；某一輪變差是正常的——寫下原因與證據。這張表就是 Task 1 的方法論骨架。')); }
    $('#w-rounds').append(out); draw();
  })();

  // ================= P13 作業任務 =================
  (function () {
    const T = [['EDA 與轉換決策', '檢視目標分布，判斷是否取對數，附直方圖與理由', 'P2'], ['基準線', 'MAE 用中位數、RMSE 用平均值的常數基準', 'P7'], ['漸進改良五輪表', '每輪記錄 MAE、RMSE、R²、調整後 R²', 'P13'], ['係數與檢定解讀', '解讀三個係數（含一個不顯著的）、F 檢定；取對數者以百分比解讀', 'P3、P8'], ['假設檢查', '殘差圖診斷四種形狀；相關矩陣最高 |r| 與處理', 'P5、P6'], ['交叉驗證', '5-fold CV 的 RMSE 平均與標準差，並與單次切分比較', 'P9']];
    const st = Store.get('m21:tasks', {}); const out = h('div');
    function draw() { out.innerHTML = ''; T.forEach(([t, d, p], i) => { const c = h('input', { type: 'checkbox' }); c.checked = !!st[i]; c.onchange = () => { st[i] = c.checked; Store.set('m21:tasks', st); draw(); }; out.append(h('label', { style: { display: 'flex', gap: '10px', padding: '7px 4px', borderBottom: '1px solid var(--line)', cursor: 'pointer' } }, c, h('div', { style: { flex: 1 } }, h('b', { style: { textDecoration: st[i] ? 'line-through' : 'none' } }, `任務 ${i + 1}　${t}`), h('div', { style: { fontSize: '13.5px', color: 'var(--muted)' } }, d)), h('span', { class: 'tag gray' }, p))); });
      out.append(h('div', { class: 'note', style: { fontSize: '14px' } }, h('b', null, '必答思考題：'), 'Q1 模型贏過常數基準多少？值得部署嗎？　Q2 只能留三個變數，留哪三個？p 值、係數大小、領域知識怎麼取捨？　Q3 違反了哪些假設？沒處理的話該怎麼誠實聲明？')); }
    $('#w-tasks').append(out); draw();
  })();

  // ================= P14 =================
  (function () {
    const E = [['只看 R² 不看殘差圖', '模型形式錯了卻不知道'], ['變數數不同的模型比 R²', '永遠選到最複雜的'], ['對外插的預測有信心', '資料只到 73 歲卻預測 90 歲'], ['把係數當因果', '「減少用藥可縮短住院」'], ['共線性下解讀個別係數', '正負可能只是抽樣偶然'], ['忽略異質變異', '高值區預測區間嚴重低估'], ['取對數後忘記還原', '誤差單位變成 ln(元)'], ['用信賴區間跟病人溝通', '應該用預測區間']];
    const st = Store.get('m21:err', {}); const out = h('div');
    function draw() { out.innerHTML = ''; const g = h('div', { class: 'grid2' }); E.forEach(([t, d], i) => g.append(check(`${i + 1}. ${t}（${d}）`, () => !!st[i], v => { st[i] = v; Store.set('m21:err', st); }, draw))); out.append(h('p', { class: 'hint' }, '報告交出前，逐條確認自己「沒有」犯這個錯，再打勾。'), g); }
    $('#w-errors').append(out); draw();
  })();
  U.flashcards('#w-cards', [['迴歸', 'Regression', '預測連續數值'], ['最小平方法', 'OLS', '讓殘差平方和最小的擬合方法'], ['係數', 'Coefficient', '自變數每增一單位，目標變動多少'], ['截距', 'Intercept', '所有自變數為 0 時的預測值'], ['殘差', 'Residual', '實際值 − 預測值'], ['決定係數', 'R²', '目標變異被模型解釋的比例'], ['調整後 R²', 'Adjusted R²', '對變數個數施加懲罰後的 R²'], ['平均絕對誤差', 'MAE', '誤差絕對值的平均；對大誤差不敏感'], ['均方根誤差', 'RMSE', 'MSE 開根號；與目標同單位'], ['平均絕對百分比誤差', 'MAPE', '百分比誤差，便於跨尺度比較'], ['基準線', 'Baseline', '一律預測平均值的模型；比較的起點'], ['等變異', 'Homoscedasticity', '殘差的散布程度處處相同'], ['異質變異', 'Heteroscedasticity', '殘差呈喇叭狀'], ['過擬合', 'Overfitting', '記住訓練資料的雜訊，新資料表現差'], ['欠擬合', 'Underfitting', '模型太簡單，訓練集就學不好'], ['偏誤-變異取捨', 'Bias-Variance Tradeoff', '太簡單＝高偏誤，太複雜＝高變異'], ['交叉驗證', 'Cross Validation', '切成 k 份輪流驗證，取平均'], ['多項式項', 'Polynomial Term', '加入 x² 以捕捉曲線關係'], ['交互作用', 'Interaction Term', '一個變數的效果依另一個變數而不同'], ['正則化', 'Regularization', '對係數施加懲罰以抑制過擬合'], ['脊迴歸', 'Ridge (L2)', '壓小係數但不歸零；對共線性有效'], ['套索迴歸', 'Lasso (L1)', '把不重要的係數壓到 0'], ['彈性網', 'Elastic Net', 'Ridge 與 Lasso 的混合'], ['變異數膨脹因子', 'VIF', '共線性指標，> 10 警戒']]);
  U.finalQuiz('#w-final', [
    ['「年齡每多一歲，住院天數增加多少？」屬於迴歸的哪種目標？', ['預測', '解釋', '情境模擬', '分類'], 1, '在乎係數本身的意義與顯著性。'],
    ['手算例 ŷ = −6.53 + 0.206x，截距 −6.53 天代表什麼？', ['0 歲病人住院 −6.53 天', '數學上的必要項，沒有現實意義', '模型錯了', '平均住院天數'], 1, '而且 0 歲遠在資料範圍外。'],
    ['樣本很大時 BMI 係數 0.04 變得顯著，該怎麼解讀？', ['BMI 是最重要的因素', '統計顯著但臨床上可能不重要', '應該刪掉 BMI', '模型過擬合'], 1, '顯著 ≠ 效果大。'],
    ['殘差圖呈喇叭狀（越右越寬），最可能的處方是？', ['加入 x²', '對 y 取對數', '刪掉離群值', '增加變數'], 1, '異質變異——醫療費用的典型。'],
    ['身高與體重同時放入，身高係數從 +0.42 翻成 −0.18，R² 幾乎不變。代表？', ['身高讓住院變短', '共線性讓係數不可信', '模型預測力變差', '資料錯誤'], 1, '受害的是解釋，不是預測。'],
    ['兩模型 MAE 相同，B 的 RMSE 明顯較大，代表？', ['B 比較好', 'B 有少數大誤差', '兩者一樣好', 'A 過擬合'], 1, 'RMSE 用平方放大大誤差。'],
    ['ln(費用) 對共病數的係數 0.18，正確解讀是？', ['每多一項共病，費用多 0.18 元', '每多一項共病，費用約增加 19.7%', '費用增加 18 倍', '無法解讀'], 1, 'e^0.18 ≈ 1.197。'],
    ['九次多項式訓練 RMSE ≈ 0、測試 RMSE 爆炸，這是？', ['欠擬合', '過擬合', '剛好', '資料洩漏'], 1, '它記住了雜訊。'],
    ['Lasso 與 Ridge 最大的差別是？', ['Lasso 不需標準化', 'Lasso 會把部分係數壓到 0', 'Ridge 會刪變數', '兩者完全一樣'], 1, 'L1 懲罰＝自動變數選擇。'],
    ['要告訴病人「像你這樣的人可能住幾天」，應該用？', ['信賴區間', '預測區間', 'R²', 'p 值'], 1, '個人的不確定性大得多。'],
  ]);
  (function () {
    const R = [['三種目標', '預測、解釋、模擬——係數不代表因果。', 'p01'], ['先殘差圖再 R²', '形式對不對，再看解釋力夠不夠。', 'p05'], ['MAE 與 RMSE 併報', '差距大提示少數大誤差，回查個案。', 'p07'], ['淨效果與共線性', '多元迴歸係數是其他不變下的淨效果；共線性讓它不可信。', 'p06'], ['過擬合與正則化', '訓練/測試差距大＝過擬合；正則化給係數加韁繩。', 'p09'], ['永遠跟基準線比', '沒有比較的 RMSE 是沒有意義的數字。', 'p07']];
    const g = h('div', { class: 'grid3' }); R.forEach(([t, d, id], i) => g.append(h('a', { href: '#' + id, style: { textDecoration: 'none', color: 'inherit', border: '1px solid var(--line)', borderRadius: '10px', padding: '10px 12px', background: '#fff', display: 'block' } }, h('div', { class: 'mono', style: { color: 'var(--accent)', fontWeight: 700 } }, i + 1), h('b', null, t), h('div', { style: { fontSize: '13.5px', color: 'var(--muted)' } }, d))));
    $('#w-review').append(g, h('div', { class: 'note' }, h('b', null, '下一步：'), '第 5 週 M2-2 分類：從 k-NN 到集成方法。', h('a', { href: '../m2-2/' }, '前往 M2-2 →')));
  })();
})();
