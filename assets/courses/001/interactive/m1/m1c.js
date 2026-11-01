/* M1 互動頁 C：PART 10–14（縮放、特徵工程、洩漏、實驗室、作業與回顧） */
(function () {
  'use strict';
  const { h, $, S, fmt, C, rng, randn, quiz, Store } = U;
  const seg = (opts, get, set, redraw) => { const s = h('div', { class: 'seg' }); opts.forEach(([v, l]) => { const b = h('button', { class: get() === v ? 'on' : '' }, l); b.onclick = () => { set(v); redraw(); }; s.append(b); }); return s; };
  const slider = (label, min, max, step, get, set, redraw, f = v => v) => { const i = h('input', { type: 'range', min, max, step }); i.value = get(); const v = h('span', { class: 'val' }, f(get())); i.oninput = () => { set(+i.value); v.textContent = f(+i.value); redraw(); }; return h('label', { class: 'ctl' }, label, i, v); };
  const check = (label, get, set, redraw) => { const c = h('input', { type: 'checkbox' }); c.checked = get(); c.onchange = () => { set(c.checked); redraw(); }; return h('label', { class: 'ctl' }, c, label); };

  // ================= P10 公式實驗 =================
  (function () {
    const base = [45, 52, 38, 61, 70, 29, 55, 48]; let outlier = false; const out = h('div');
    function draw() {
      out.innerHTML = '';
      const X = outlier ? base.concat([180]) : base.slice();
      const mn = S.min(X), mx = S.max(X), m = S.mean(X), sd = S.sd(X), md = S.median(X), iqr = S.q(X, .75) - S.q(X, .25);
      const M = { 'Min-Max': X.map(x => (x - mn) / (mx - mn)), 'Z-Score': X.map(x => (x - m) / sd), 'Robust（中位數／IQR）': X.map(x => (x - md) / iqr) };
      const t = h('table', { class: 'dt' }, h('tr', null, h('th', null, '原始 x'), Object.keys(M).map(k => h('th', null, k))), X.map((x, i) => h('tr', null, h('td', { class: 'num' + (x === 180 ? ' hl' : '') }, x), Object.values(M).map(a => h('td', { class: 'num' }, a[i].toFixed(2))))));
      const strips = h('div');
      Object.entries(M).forEach(([k, a]) => { const lo = Math.min(-3, ...a), hi = Math.max(3, ...a); const sv = U.svgBox(h('div'), 420, 40); const x = U.scale(k === 'Min-Max' ? -.1 : lo, k === 'Min-Max' ? 1.1 : hi, 130, 410); U.s('text', { x: 0, y: 24, text: k, style: 'font-size:11px;fill:#1c2430' }, sv); U.s('line', { x1: 130, x2: 410, y1: 20, y2: 20, class: 'axis' }, sv); a.forEach((v, i) => U.s('circle', { cx: x(v), cy: 20, r: 5, fill: X[i] === 180 ? C.bad : C.accent, 'fill-opacity': .7 }, sv)); strips.append(sv.parentNode); });
      out.append(h('div', { class: 'row', style: { marginBottom: '8px' } }, check('加入一個極端值 180', () => outlier, v => outlier = v, draw)),
        h('div', { class: 'grid2' }, h('div', { class: 'tscroll' }, t), h('div', null, strips, h('div', { class: 'note ' + (outlier ? 'warn' : ''), style: { fontSize: '14px' } }, outlier ? 'Min-Max 對極端值最敏感：一個 180 把其他所有值壓縮到 0–0.3。Z-Score 也受影響；Robust 縮放用中位數與 IQR，較不受影響。' : 'Min-Max：(x−min)/(max−min)，固定 0–1。Z-Score：(x−平均)/標準差，平均 0、標準差 1。兩者都是線性轉換——★ 不會讓分布變成常態。'))));
    }
    $('#w-scalef').append(out); draw();
  })();

  // ================= P10 k-NN =================
  (function () {
    const r = rng(31), P = []; for (let i = 0; i < 120; i++) P.push({ age: 20 + r() * 60, inc: Math.max(150, Math.min(1200, 550 + 230 * randn(r))) });
    const ma = S.mean(P.map(p => p.age)), sa = S.sd(P.map(p => p.age)), mi = S.mean(P.map(p => p.inc)), si = S.sd(P.map(p => p.inc));
    let q = { age: 30, inc: 600 }; const out = h('div');
    function nn(z) { return P.map((p, i) => { const da = z ? (p.age - q.age) / sa : p.age - q.age, di = z ? (p.inc - q.inc) / si : p.inc - q.inc; return { i, d: Math.sqrt(da * da + di * di), da2: da * da, di2: di * di }; }).sort((a, b) => a.d - b.d).slice(0, 5); }
    function panel(title, z) {
      const N = nn(z), set = new Set(N.map(n => n.i)); const box = h('div');
      const g = U.scatter(box, P.map((p, i) => ({ x: p.age, y: p.inc, c: set.has(i) ? C.amber : C.gray, r: set.has(i) ? 5 : 3, op: set.has(i) ? 1 : .55 })), { w: 380, h: 280, xmin: 18, xmax: 82, ymin: 100, ymax: 1250, xlabel: '年齡', ylabel: '收入（千元）',
        over: [(sv, x, y) => { N.forEach(n => U.s('line', { x1: x(q.age), y1: y(q.inc), x2: x(P[n.i].age), y2: y(P[n.i].inc), stroke: C.amber, 'stroke-width': 1 }, sv)); U.s('circle', { cx: x(q.age), cy: y(q.inc), r: 7, fill: C.bad, stroke: '#fff', 'stroke-width': 2 }, sv); }] });
      g.sv.style.cursor = 'crosshair';
      g.sv.addEventListener('click', e => { const pt = g.sv.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY; const p = pt.matrixTransform(g.sv.getScreenCTM().inverse()); q = { age: Math.max(20, Math.min(80, g.x.inv(p.x))), inc: Math.max(150, Math.min(1200, g.y.inv(p.y))) }; draw(); });
      const ages = N.map(n => P[n.i].age), share = S.mean(N.map(n => n.di2 / (n.da2 + n.di2 || 1)));
      return h('div', null, h('div', { style: { fontWeight: 600, fontSize: '14px' } }, title), box, h('div', { style: { fontSize: '13px', color: 'var(--muted)' } }, `5 個鄰居年齡：${fmt(S.min(ages), 0)}–${fmt(S.max(ages), 0)} 歲　·　距離中收入佔 ${Math.round(share * 100)}%`));
    }
    function draw() {
      out.innerHTML = '';
      out.append(h('div', { class: 'grid2' }, panel('① 原始尺度的 5 個最近鄰居', false), panel('② Z-Score 後的 5 個最近鄰居', true)),
        h('div', { class: 'note', style: { fontSize: '14px' } }, `查詢點：${fmt(q.age, 0)} 歲、收入 ${fmt(q.inc, 0)} 千元。原始尺度下，收入差 50 與年齡差 5 平方後，收入的貢獻是年齡的 100 倍——鄰居落在一條水平帶上，年齡幾乎沒作用。Z-Score 後兩者都變成「離平均幾個標準差」，等權參與。影響所有用距離的方法：k-NN、K-Means、PCA、SVM、神經網路。`));
    }
    $('#w-knn').append(out); draw();
  })();

  // ================= P10 K-Means =================
  (function () {
    const r = rng(77), P = [];
    [[30, 5, 450, 110, 0], [65, 5, 450, 110, 1], [47, 6, 1000, 110, 2]].forEach(([ma, sa, mi, si, g]) => { for (let i = 0; i < 60; i++) P.push({ a: ma + sa * randn(r), i: mi + si * randn(r), g }); });
    function kmeans(X, k, seed) {
      let best = null; const rr = rng(seed);
      for (let rep = 0; rep < 8; rep++) {
        const cents = [X[Math.floor(rr() * X.length)].slice()];
        while (cents.length < k) { const d = X.map(x => Math.min(...cents.map(c => (x[0] - c[0]) ** 2 + (x[1] - c[1]) ** 2))); let t = rr() * S.sum(d), j = 0; while ((t -= d[j]) > 0 && j < X.length - 1) j++; cents.push(X[j].slice()); }
        let lab = new Array(X.length).fill(0);
        for (let it = 0; it < 50; it++) { lab = X.map(x => { let bi = 0, bd = Infinity; cents.forEach((c, ci) => { const d = (x[0] - c[0]) ** 2 + (x[1] - c[1]) ** 2; if (d < bd) { bd = d; bi = ci; } }); return bi; }); cents.forEach((c, ci) => { const m = X.filter((_, n) => lab[n] === ci); if (m.length) { c[0] = S.mean(m.map(v => v[0])); c[1] = S.mean(m.map(v => v[1])); } }); }
        const inertia = S.sum(X.map((x, n) => (x[0] - cents[lab[n]][0]) ** 2 + (x[1] - cents[lab[n]][1]) ** 2));
        if (!best || inertia < best.inertia) best = { lab, inertia };
      }
      return best.lab;
    }
    function purity(lab) { let s = 0; for (let c = 0; c < 3; c++) { const g = [0, 0, 0]; P.forEach((p, n) => { if (lab[n] === c) g[p.g]++; }); s += Math.max(...g); } return s / P.length; }
    const COL = [C.accent, C.amber, C.blue];
    let seed = 1; const out = h('div');
    function draw() {
      out.innerHTML = '';
      const raw = kmeans(P.map(p => [p.a, p.i]), 3, seed);
      const ma = S.mean(P.map(p => p.a)), sa = S.sd(P.map(p => p.a)), mi = S.mean(P.map(p => p.i)), si = S.sd(P.map(p => p.i));
      const zl = kmeans(P.map(p => [(p.a - ma) / sa, (p.i - mi) / si]), 3, seed);
      const pnl = (title, lab) => { const b = h('div'); U.scatter(b, P.map((p, n) => ({ x: p.a, y: p.i, c: COL[lab[n]], r: 3.2 })), { w: 300, h: 240, xmin: 15, xmax: 80, ymin: 100, ymax: 1400, xlabel: '年齡', ylabel: '收入' }); return h('div', null, h('div', { style: { fontWeight: 600, fontSize: '14px' } }, title), b); };
      const pr = purity(raw), pz = purity(zl);
      const bt = h('button', { class: 'btn sm' }, '換一組初始中心重跑'); bt.onclick = () => { seed++; draw(); };
      out.append(h('div', { class: 'row', style: { marginBottom: '6px' } }, bt, h('span', { style: { fontSize: '13px', color: 'var(--muted)' } }, '180 筆模擬資料：中低收入年輕、中低收入年長、高收入中年')),
        h('div', { class: 'grid3' }, pnl('真實結構', P.map(p => p.g)), pnl(`未縮放　純度 ${Math.round(pr * 100)}%`, raw), pnl(`Z-Score 後　純度 ${Math.round(pz * 100)}%`, zl)),
        h('div', { class: 'note', style: { fontSize: '14px' } }, '未縮放時切線幾乎全是水平的——收入的值域是年齡的十幾倍，距離完全被它主導，年齡等於沒有參與。★ 作業一任務 4 要你在 Mall Customer 資料上親手跑出這組對照。'));
    }
    $('#w-kmeans').append(out); draw();
  })();

  // ================= P10 演算法分類 =================
  (function () {
    const A = [['k-NN 最近鄰', 1, 'W5'], ['K-Means 分群', 1, 'W6'], ['PCA 主成分分析', 1, 'W6'], ['SVM 支援向量機', 1, 'W5'], ['神經網路／深度學習', 1, 'W8'], ['線性／邏輯斯迴歸（有正則化）', 1, 'W4–W5'], ['決策樹', 0, 'W5'], ['隨機森林／梯度提升', 0, 'W5、W7'], ['Naive Bayes', 0, 'W5']];
    const ans = {}; const out = h('div');
    function draw() {
      out.innerHTML = ''; let ok = 0;
      const g = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(250px,1fr))', gap: '8px' } });
      A.forEach(([n, need, w], i) => { const st = ans[i]; const right = st != null && st === need; if (right) ok++;
        g.append(h('div', { style: { border: '1px solid ' + (st == null ? 'var(--line)' : right ? 'var(--good)' : 'var(--bad)'), borderRadius: '8px', padding: '8px 10px', background: st == null ? '#fff' : right ? 'var(--good-soft)' : 'var(--bad-soft)' } }, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('b', { style: { fontSize: '14px' } }, n), h('span', { class: 'tag gray' }, w)), h('div', { class: 'row', style: { marginTop: '6px' } }, ...[[1, '需要縮放'], [0, '不需要']].map(([v, l]) => { const b = h('button', { class: 'btn sm' + (st === v ? ' on' : '') }, l); b.onclick = () => { ans[i] = v; draw(); }; return b; })))); });
      out.append(g, h('div', { class: 'row', style: { marginTop: '8px' } }, h('span', { class: 'tag ' + (ok === A.length ? 'good' : 'gray') }, `答對 ${ok} / ${A.length}`), h('span', { style: { fontSize: '13px', color: 'var(--muted)' } }, '判準：演算法有沒有用到「距離」或「權重大小」？樹模型只比大小不比距離，所以不需要。')));
    }
    $('#w-algos').append(out); draw();
  })();

  // ================= P11 六種手法 =================
  (function () {
    const P = { 病歷號: 'P0121', 出生年: 1958, 就診日: '2026-03-14', 科別: '內科', 身高cm: 162, 體重kg: 70, 收縮壓: 142, 舒張壓: 86, 就診費用: 2350, 近一年就診: [800, 650, 1200, 2350, 900] };
    const T = [
      ['ARITHMETIC', '算術衍生', 'BMI、脈壓', () => ({ BMI: (P.體重kg / (P.身高cm / 100) ** 2).toFixed(1), 脈壓: P.收縮壓 - P.舒張壓 }), 'Generate Attributes'],
      ['BINNING', '分箱', 'BMI → 國健署體位', () => { const b = P.體重kg / (P.身高cm / 100) ** 2; return { 體位分類: b < 18.5 ? '過輕' : b < 24 ? '健康' : b < 27 ? '過重' : b < 30 ? '輕度肥胖' : b < 35 ? '中度肥胖' : '重度肥胖' }; }, 'Discretize by User Specification'],
      ['ENCODING', '類別編碼', '科別 One-Hot', () => ({ '科別=內科': 1, '科別=外科': 0, '科別=家醫科': 0, '科別=復健科': 0, '科別=急診': 0 }), 'Nominal to Numerical'],
      ['TRANSFORM', '數值轉換', 'log10(費用)', () => ({ 'log10費用': Math.log10(P.就診費用).toFixed(2) }), 'Generate Attributes: log()'],
      ['DATETIME', '時間特徵', '年齡、星期幾', () => { const d = new Date(P.就診日 + 'T00:00:00'); return { 年齡: d.getFullYear() - P.出生年, 星期: '日一二三四五六'[d.getDay()], 月份: d.getMonth() + 1 }; }, 'Date to Numerical'],
      ['AGGREGATION', '聚合特徵', '近一年就診次數、平均費用', () => ({ 近一年就診次數: P.近一年就診.length, 近一年平均費用: Math.round(S.mean(P.近一年就診)) }), 'Aggregate → Join 回主檔'],
    ];
    const on = new Set([0, 4]); const out = h('div');
    function draw() {
      out.innerHTML = '';
      const cards = h('div', { class: 'grid3' }); T.forEach(([en, zh, ex, , op], i) => { const c = h('div', { style: { border: '1.5px solid ' + (on.has(i) ? 'var(--accent)' : 'var(--line)'), background: on.has(i) ? 'var(--accent-soft)' : '#fff', borderRadius: '10px', padding: '8px 12px', cursor: 'pointer' } }, h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--faint)' } }, en), h('div', { style: { fontWeight: 700 } }, (on.has(i) ? '☑ ' : '☐ ') + zh), h('div', { style: { fontSize: '13px', color: 'var(--muted)' } }, ex + '　·　' + op)); c.onclick = () => { on.has(i) ? on.delete(i) : on.add(i); draw(); }; cards.append(c); });
      const base = { 病歷號: P.病歷號, 出生年: P.出生年, 就診日: P.就診日, 科別: P.科別, 身高cm: P.身高cm, 體重kg: P.體重kg, 收縮壓: P.收縮壓, 舒張壓: P.舒張壓, 就診費用: P.就診費用 };
      const add = {}; [...on].sort().forEach(i => Object.assign(add, T[i][3]()));
      const t = h('table', { class: 'dt' }, h('tr', null, Object.keys(base).map(k => h('th', null, k)), Object.keys(add).map(k => h('th', { style: { background: 'var(--accent-soft)', color: 'var(--accent-ink)' } }, k))), h('tr', null, Object.values(base).map(v => h('td', null, v)), Object.values(add).map(v => h('td', { class: 'ok' }, v))));
      out.append(cards, h('div', { style: { fontSize: '13px', color: 'var(--muted)', margin: '10px 0 4px' } }, `一位病人：原始 ${Object.keys(base).length} 欄 → 加上衍生 ${Object.keys(add).length} 欄`), h('div', { class: 'tscroll' }, t),
        h('p', { class: 'ai' }, '類別過多時可用頻率或目標編碼（Target Encoding，洩漏風險高）。聚合特徵最能帶入領域知識。原課程範例：Module 4 - Creating & Removing Columns.rmp；6. SumUp/4、5。'));
    }
    $('#w-fe').append(out); draw();
  })();

  // ================= P11 分箱 =================
  (function () {
    const r = rng(17), B = []; for (let i = 0; i < 500; i++) B.push(Math.max(14, Math.min(42, 23.6 * Math.exp(.16 * randn(r)))));
    const CL = [[18.5, '過輕'], [24, '健康'], [27, '過重'], [30, '輕度肥胖'], [35, '中度肥胖'], [Infinity, '重度肥胖']];
    let meth = 'clin', nb = 5; const out = h('div');
    function draw() {
      out.innerHTML = '';
      let cuts, names;
      if (meth === 'clin') { cuts = CL.slice(0, -1).map(c => c[0]); names = CL.map(c => c[1]); }
      else if (meth === 'width') { const lo = S.min(B), hi = S.max(B); cuts = Array.from({ length: nb - 1 }, (_, k) => +(lo + (k + 1) * (hi - lo) / nb).toFixed(1)); names = Array.from({ length: nb }, (_, k) => '箱 ' + (k + 1)); }
      else { cuts = Array.from({ length: nb - 1 }, (_, k) => +S.q(B, (k + 1) / nb).toFixed(1)); names = Array.from({ length: nb }, (_, k) => '箱 ' + (k + 1)); }
      const cnt = new Array(cuts.length + 1).fill(0); B.forEach(v => { let k = cuts.findIndex(c => v < c); if (k < 0) k = cuts.length; cnt[k]++; });
      const ch = h('div'); U.hist(ch, [{ values: B, color: C.accent, opacity: .7 }], { min: 14, max: 42, bins: 56, w: 520, h: 200, xlabel: 'BMI', marks: cuts.map((c, i) => ({ x: c, label: String(c), color: C.bad, dy: (i % 2) * 13 })) });
      const bars = h('div'); U.hbars(bars, cnt.map((n, k) => ({ label: names[k], value: n, color: meth === 'clin' ? C.accent : C.gray })), { w: 360, lw: 80, rowH: 22, max: 500 });
      const msg = { clin: '切點來自國民健康署成人健康體位標準，不是資料本身。BMI 23.9 與 24.1 數值幾乎一樣，但跨越了「過重」的臨床界線——演算法不會知道這條線，你知道。', width: `等距：把最小到最大切成 ${nb} 等分。切點（${cuts.join('、')}）在臨床上沒有意義，而且兩端的箱子幾乎是空的。`, freq: `等頻：每箱人數相同（約 ${Math.round(500 / nb)} 人）。切點（${cuts.join('、')}）隨資料而變，換一批病人就不同。` }[meth];
      out.append(h('div', { class: 'row', style: { marginBottom: '8px' } }, seg([['width', '等距'], ['freq', '等頻'], ['clin', '臨床切點（國健署）']], () => meth, v => meth = v, draw), meth !== 'clin' ? slider('箱數', 3, 8, 1, () => nb, v => nb = v, draw) : null),
        h('div', { class: 'grid2' }, ch, bars), h('div', { class: 'note ' + (meth === 'clin' ? '' : 'warn'), style: { fontSize: '14px' } }, msg),
        h('p', { class: 'ai' }, '代價：分箱會損失組內細節——建議原始數值與分箱欄位同時保留，讓模型自己選。（模擬 BMI 500 筆）'));
    }
    $('#w-bin').append(out); draw();
  })();

  // ================= P11 BMI =================
  (function () {
    let ht = 165, wt = 66; const out = h('div');
    const TW = [[18.5, '過輕'], [24, '健康'], [27, '過重'], [30, '輕度肥胖'], [35, '中度肥胖'], [99, '重度肥胖']];
    const WHO = [[18.5, 'Underweight'], [25, 'Normal'], [30, 'Pre-obese'], [35, 'Obese I'], [40, 'Obese II'], [99, 'Obese III']];
    const cat = (b, T) => T.find(t => b < t[0])[1];
    function band(T, b, title) {
      const sv = U.svgBox(h('div'), 520, 52), x = U.scale(14, 42, 10, 510), cols = ['#9fc5e8', '#9fd3c7', '#f6d58e', '#f3b07b', '#e8836b', '#c0392b'];
      let prev = 14; T.forEach((t, i) => { const e = Math.min(42, t[0]); U.s('rect', { x: x(prev), y: 18, width: x(e) - x(prev), height: 16, fill: cols[i] }, sv); U.s('text', { x: (x(prev) + x(e)) / 2, y: 30, 'text-anchor': 'middle', text: t[1], style: 'font-size:10px;fill:#1c2430' }, sv); if (t[0] < 42) U.s('text', { x: x(e), y: 46, 'text-anchor': 'middle', text: t[0], style: 'font-size:10px;font-family:var(--mono)' }, sv); prev = e; });
      U.s('text', { x: 10, y: 12, text: title, style: 'font-size:11px;fill:#1c2430;font-weight:600' }, sv);
      const X = x(Math.max(14, Math.min(42, b))); U.s('path', { d: `M${X - 6},14 L${X + 6},14 L${X},22 Z`, fill: C.ink }, sv);
      return sv.parentNode;
    }
    function draw() {
      out.innerHTML = '';
      const b = wt / (ht / 100) ** 2, a = cat(b, TW), w = cat(b, WHO), diff = (a === '過重' && w === 'Normal') || (a === '輕度肥胖' && w === 'Pre-obese');
      out.append(h('div', { class: 'row', style: { marginBottom: '8px' } }, slider('身高', 140, 195, 1, () => ht, v => ht = v, draw, v => v + ' cm'), slider('體重', 35, 130, .5, () => wt, v => wt = v, draw, v => v + ' kg')),
        h('div', { class: 'kpi', style: { marginBottom: '8px' } }, h('div', null, h('div', { class: 'k' }, 'BMI = 體重 ÷ 身高²'), h('div', { class: 'v' }, b.toFixed(1))), h('div', null, h('div', { class: 'k' }, '國健署'), h('div', { class: 'v' }, a)), h('div', null, h('div', { class: 'k' }, 'WHO'), h('div', { class: 'v' }, w))),
        band(TW, b, '國民健康署（台灣）'), band(WHO, b, 'WHO 國際標準'),
        h('div', { class: 'note ' + (diff ? 'warn' : ''), style: { fontSize: '14px' } }, diff ? '同一個 BMI，兩套標準給出不同類別！WHO 過重切點是 25，台灣是 24。寫報告時要標明採用哪一套。' : '試著把 BMI 調到 24–25 或 27–30 之間，看兩套標準的差異。'));
    }
    $('#w-bmi').append(out); draw();
  })();

  // ================= P11 對數轉換 =================
  (function () {
    const r = rng(23), X = []; for (let i = 0; i < 500; i++) X.push(Math.round(Math.exp(Math.log(873) + .94 * randn(r))));
    let mode = 'raw', zeros = false; const out = h('div');
    function draw() {
      out.innerHTML = '';
      const D = zeros ? X.map((v, i) => i % 20 === 0 ? 0 : v) : X;
      const nz = D.filter(v => v === 0).length;
      let V, o;
      if (mode === 'raw') { V = D.map(v => Math.min(v, 6000)); o = { min: 0, max: 6000, bins: 40, xlabel: '門診費用（元，≥6,000 併入最右）', xt: [0, 2000, 4000, 6000], xfmt: t => t.toLocaleString() }; }
      else if (mode === 'log') { V = D.filter(v => v > 0).map(Math.log10); o = { min: 1.5, max: 4.5, bins: 36, xlabel: 'log10(費用)', xt: [2, 3, 4], xfmt: t => `${t}（${(10 ** t).toLocaleString()}）` }; }
      else { V = D.map(v => Math.log10(v + 1)); o = { min: -0.2, max: 4.5, bins: 40, xlabel: 'log10(費用＋1)', xt: [0, 1, 2, 3, 4] }; }
      const mean = S.mean(V), med = S.median(V);
      const ch = h('div'); U.hist(ch, [{ values: V, color: C.accent, opacity: .8 }], { ...o, w: 560, h: 210, marks: [{ x: med, label: '中位數', color: C.blue }, { x: mean, label: '平均', color: C.bad, dy: 13 }] });
      const rawD = D.filter(v => v > 0);
      out.append(h('div', { class: 'row', style: { marginBottom: '8px' } }, seg([['raw', '原始'], ['log', 'log10(x)'], ['log1', 'log10(x+1)']], () => mode, v => mode = v, draw), check('資料中有 5% 為 0 元（免部分負擔）', () => zeros, v => zeros = v, draw)),
        h('div', { class: 'grid2' }, ch, h('div', null,
          h('div', { class: 'kpi' }, h('div', null, h('div', { class: 'k' }, '偏態係數'), h('div', { class: 'v ' + (Math.abs(S.skew(V)) > 1 ? 'bad' : 'good') }, fmt(S.skew(V), 2))), h('div', null, h('div', { class: 'k' }, '原始平均 / 中位數'), h('div', { class: 'v' }, `${fmt(S.mean(rawD), 0)} / ${fmt(S.median(rawD), 0)}`))),
          h('div', { class: 'note ' + (mode === 'log' && nz ? 'bad' : ''), style: { fontSize: '14px', marginTop: '10px' } }, mode === 'log' && nz ? `log(0) = −∞：有 ${nz} 筆 0 元無法計算（圖中被丟掉）。有 0 時改用 log(x+1)。` : mode === 'raw' ? '多數人幾百到兩千元，少數人上萬元，平均被長尾拉高。' : '100、1,000、10,000 變成 2、3、4 等距，接近對稱。線性迴歸與距離型方法受益最大；樹模型只看順序，轉不轉幾乎一樣。'))));
    }
    $('#w-log').append(out); draw();
  })();

  // ================= P12 時間洩漏 =================
  (function () {
    const F = [['入院檢驗值', 0.05, 0], ['住院用藥紀錄', 0.3, 0], ['護理評估分數', 0.45, 0], ['出院前 ADL', 0.58, 0], ['出院後門診次數', 0.78, 1], ['30 天內急診紀錄', 0.85, 1], ['出院後檢驗值', 0.72, 1], ['結案註記（追蹤結束才填）', 0.95, 1]];
    const ans = {}; const out = h('div');
    function draw() {
      out.innerHTML = '';
      const W = 640, H = 40 + F.length * 30, sv = U.svgBox(h('div'), W, H), x = U.scale(0, 1, 170, 630), cut = x(.62);
      U.s('rect', { x: x(0), y: 6, width: cut - x(0), height: H - 12, fill: '#eef6f4' }, sv); U.s('rect', { x: cut, y: 6, width: x(1) - cut, height: H - 12, fill: '#fbefed' }, sv);
      [['入院', 0], ['住院期間', .3], ['出院＝預測時點', .62], ['出院後 30 天', .85]].forEach(([t, v]) => U.s('text', { x: x(v) + 4, y: 20, text: t, style: 'font-size:11px;fill:#5d6774' }, sv));
      U.s('line', { x1: cut, x2: cut, y1: 6, y2: H - 6, stroke: C.bad, 'stroke-width': 2.5 }, sv);
      F.forEach(([n, t, leak], i) => { const Y = 34 + i * 30, st = ans[i]; U.s('text', { x: 160, y: Y + 13, 'text-anchor': 'end', text: n, style: 'font-size:12px;fill:#1c2430' }, sv); const show = st != null; U.s('rect', { x: x(t) - 6, y: Y + 2, width: 12, height: 16, rx: 3, fill: show ? (leak ? C.bad : C.good) : C.gray }, sv); });
      const list = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(280px,1fr))', gap: '6px', marginTop: '8px' } });
      let ok = 0; F.forEach(([n, , leak], i) => { const st = ans[i]; if (st === leak) ok++; list.append(h('div', { class: 'row', style: { justifyContent: 'space-between', padding: '4px 8px', border: '1px solid ' + (st == null ? 'var(--line)' : st === leak ? 'var(--good)' : 'var(--bad)'), borderRadius: '8px', background: '#fff' } }, h('span', { style: { fontSize: '14px' } }, n), h('span', { class: 'row', style: { gap: '4px' } }, ...[[0, '可以用'], [1, '洩漏']].map(([v, l]) => { const b = h('button', { class: 'btn sm' + (st === v ? ' on' : '') }, l); b.onclick = () => { ans[i] = v; draw(); }; return b; })))); });
      out.append(sv.parentNode, list, h('div', { class: 'row', style: { marginTop: '8px' } }, h('span', { class: 'tag ' + (ok === F.length ? 'good' : 'gray') }, `答對 ${ok} / ${F.length}`), h('span', { style: { fontSize: '13px', color: 'var(--muted)' } }, '把每個欄位問一次：「預測那一刻，我真的拿得到這個值嗎？」')));
    }
    $('#w-time').append(out); draw();
  })();

  // ================= P12 流程排序 =================
  (function () {
    const SC = {
      '前處理': ['Retrieve', 'Split Data', '訓練集 Normalize／Impute（保留 preprocessing model）', '以同一組參數套用到測試集', '建模與評估'],
      '不平衡處理': ['Retrieve', 'Split Data', '僅對訓練集做 SMOTE', '測試集維持原分布', '建模與評估'],
      '特徵選擇': ['Retrieve', 'Split Data', '僅用訓練集算相關、挑欄位', '同一組欄位套用到測試集', '建模與評估'],
      '時間序列': ['Retrieve', '依時間排序', '前段訓練、後段測試（或 Forward Chaining）', '建模與評估'],
    };
    let cur = '前處理', order = null, checked = false; const out = h('div');
    const shuffle = a => { const r = rng(Date.now() % 1e6), b = a.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1));[b[i], b[j]] = [b[j], b[i]]; } return b.join() === a.join() ? shuffle(a) : b; };
    function reset() { order = shuffle(SC[cur]); checked = false; }
    function draw() {
      out.innerHTML = '';
      const right = SC[cur];
      const list = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '560px' } });
      order.forEach((s, i) => { const ok = checked && s === right[i]; const bad = checked && s !== right[i];
        list.append(h('div', { class: 'row', style: { border: '1px solid ' + (ok ? 'var(--good)' : bad ? 'var(--bad)' : 'var(--line2)'), background: ok ? 'var(--good-soft)' : bad ? 'var(--bad-soft)' : '#fff', borderRadius: '8px', padding: '6px 10px', gap: '8px' } }, h('span', { class: 'mono', style: { color: 'var(--faint)', width: '18px' } }, i + 1), h('span', { style: { flex: 1, fontSize: '14.5px', fontWeight: /Split|依時間/.test(s) ? 700 : 400 } }, s),
          h('button', { class: 'btn sm', disabled: i === 0, onclick: () => { [order[i - 1], order[i]] = [order[i], order[i - 1]]; checked = false; draw(); } }, '↑'), h('button', { class: 'btn sm', disabled: i === order.length - 1, onclick: () => { [order[i + 1], order[i]] = [order[i], order[i + 1]]; checked = false; draw(); } }, '↓'))); });
      const all = order.join() === right.join();
      const b1 = h('button', { class: 'btn primary sm' }, '檢查順序'); b1.onclick = () => { checked = true; draw(); };
      const b2 = h('button', { class: 'btn sm' }, '重新打亂'); b2.onclick = () => { reset(); draw(); };
      out.append(h('div', { class: 'row', style: { marginBottom: '10px' } }, seg(Object.keys(SC).map(k => [k, k]), () => cur, v => { cur = v; reset(); }, draw), b1, b2), list,
        checked ? h('div', { class: 'note ' + (all ? '' : 'warn'), style: { fontSize: '14px' } }, all ? '✓ 正確！正確的那一欄，切分永遠排在第二格。最省事的統一解法：把前處理整包放進 Cross Validation 的訓練子流程內（W5 會示範）。' : '還不對。規律：所有會用到整份資料統計量的動作，都必須發生在切分之後。') : '');
    }
    reset(); $('#w-order').append(out); draw();
  })();

  // ================= P12 群組切分 =================
  (function () {
    const V = []; [['A', 3], ['B', 4], ['C', 2], ['D', 3]].forEach(([p, n]) => { for (let i = 1; i <= n; i++) V.push(p + i); });
    let mode = 'visit', seed = 3; const out = h('div');
    function split() {
      const r = rng(seed);
      if (mode === 'visit') { const idx = V.map((v, i) => [r(), i]).sort((a, b) => a[0] - b[0]); const test = new Set(idx.slice(0, 3).map(x => V[x[1]])); return v => test.has(v); }
      const pts = ['A', 'B', 'C', 'D']; const tp = pts[Math.floor(r() * 4)]; return v => v[0] === tp;
    }
    function draw() {
      out.innerHTML = '';
      const isTest = split(), tr = V.filter(v => !isTest(v)), te = V.filter(isTest);
      const pT = new Set(tr.map(v => v[0])), pE = new Set(te.map(v => v[0])), inter = [...pE].filter(p => pT.has(p));
      const PC = { A: '#0d6b67', B: '#b45309', C: '#2b6cb0', D: '#7c3aed' };
      const chip = v => h('span', { style: { display: 'inline-block', padding: '3px 9px', borderRadius: '6px', background: PC[v[0]], color: '#fff', fontFamily: 'var(--mono)', fontSize: '13px', margin: '2px', outline: inter.includes(v[0]) ? '2px solid #c0392b' : 'none', outlineOffset: '1px' } }, v);
      const bt = h('button', { class: 'btn sm' }, '重新隨機切'); bt.onclick = () => { seed++; draw(); };
      out.append(h('div', { class: 'row', style: { marginBottom: '10px' } }, seg([['visit', '✗ 依就診隨機切'], ['patient', '✓ 依病人切']], () => mode, v => mode = v, draw), bt, h('span', { style: { fontSize: '13px', color: 'var(--muted)' } }, '4 位病人、12 次就診')),
        h('div', { class: 'grid2' }, h('div', { style: { border: '1px solid var(--line)', borderRadius: '10px', padding: '10px', background: '#fff' } }, h('div', { style: { fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' } }, `訓練集（${tr.length}）`), tr.map(chip)), h('div', { style: { border: '1px solid var(--line)', borderRadius: '10px', padding: '10px', background: '#fff' } }, h('div', { style: { fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' } }, `測試集（${te.length}）`), te.map(chip))),
        h('div', { class: 'note ' + (inter.length ? 'bad' : ''), style: { fontSize: '14px' } }, inter.length ? `交集：${inter.join('、')} 共 ${inter.length} 人 → 洩漏。模型在測試時認出「老朋友」，分數虛高。` : '交集：0 人 → 測試集全是新病人。AI Studio：病歷號設成 batch 角色，Cross Validation 勾選 split on batch attribute。'));
    }
    $('#w-group').append(out); draw();
  })();

  // ================= P12 洩漏實測（真實資料） =================
  (function () {
    const rows = U.parseCSV(M1DATA.main), head = rows[0]; const seen = new Set(); const D = rows.slice(1).filter(r => { const k = r.join('|'); if (seen.has(k)) return false; seen.add(k); return true; });
    const col = n => D.map(r => r[head.indexOf(n)]); const y = col('再就診30天').map(Number);
    function stumpCat(x) { const g = {}; x.forEach((v, i) => { g[v] = g[v] || [0, 0]; g[v][y[i]]++; }); let ok = 0; Object.values(g).forEach(c => ok += Math.max(...c)); return ok / y.length; }
    function stumpNum(x) { const idx = x.map((v, i) => [v, y[i]]).filter(p => !isNaN(p[0])).sort((a, b) => a[0] - b[0]); const n = idx.length, tot1 = idx.filter(p => p[1]).length; let best = Math.max(tot1, n - tot1), l1 = 0; for (let i = 0; i < n - 1; i++) { l1 += idx[i][1]; if (idx[i][0] === idx[i + 1][0]) continue; const l0 = i + 1 - l1, r1 = tot1 - l1, r0 = n - i - 1 - r1; best = Math.max(best, l0 + r1, l1 + r0); } return best / n; }
    const base = Math.max(y.filter(v => v).length, y.filter(v => !v).length) / y.length;
    const age = col('出生年').map(v => { const b = +v; return b > 1900 && b < 2026 ? 2026 - b : NaN; });
    const items = [
      { label: '基準（全猜 0）', value: base, color: C.gray },
      { label: '科別', value: stumpCat(col('科別').map(s => s.trim())), color: C.accent },
      { label: '年齡', value: stumpNum(age), color: C.accent },
      { label: '收縮壓', value: stumpNum(col('收縮壓').map(v => +v || NaN)), color: C.accent },
      { label: '就診費用', value: stumpNum(col('就診費用').map(v => +v.replace(/,/g, ''))), color: C.accent },
      { label: '出院後30天門診次數', value: stumpNum(col('出院後30天門診次數').map(Number)), color: C.bad },
      { label: '結案註記', value: stumpCat(col('結案註記')), color: C.bad },
    ];
    const box = $('#w-leakdemo'); const ch = h('div'); U.hbars(ch, items, { w: 560, lw: 140, rowH: 26, max: 1, fmt: v => (v * 100).toFixed(1) + '%' });
    box.append(h('p', { class: 'hint' }, `去重後 ${D.length} 筆。每一列是「只用這一個欄位」做最佳單一切分（決策樹樹樁）能達到的 Accuracy，用整份資料即時計算。`), ch,
      h('div', { class: 'note bad', style: { fontSize: '14px' } }, `兩個洩漏誘餌單獨就能達到 ${(items[6].value * 100).toFixed(0)}%——結案註記是由目標推導而來，出院後門診次數則是預測當下還沒發生的事。正常欄位只比基準 ${(base * 100).toFixed(1)}% 多一點點，這才是真實醫療預測的樣子。拿掉它們重跑，指標暴跌，就代表模型完全靠它。`));
  })();

  // ================= P13 實驗室 =================
  (function () {
    const RAW = U.parseCSV(M1DATA.main), H0 = RAW[0], B0 = RAW.slice(1);
    const LAB = U.parseCSV(M1DATA.lab), LH = LAB[0], LB = LAB.slice(1);
    const STEPS = [
      ['fee', '① 就診費用：去千分位、轉成數值', 'PART 2'],
      ['trim', '② Trim 所有文字欄位', 'PART 8'],
      ['sex', '③ 性別對照表 → M / F', 'PART 8'],
      ['city', '④ 縣市：台 → 臺、TAIPEI → 臺北市', 'PART 8'],
      ['date', '⑤ 就診日統一成 YYYY-MM-DD', 'PART 1'],
      ['dedup', '⑥ 移除完全重複列', 'PART 8'],
      ['h_m', '⑦ 身高 < 3 視為公尺 → ×100', 'PART 7'],
      ['zero', '⑧ 0 → 遺失（身高、體重、收縮壓、舒張壓）', 'PART 6'],
      ['byear', '⑨ 出生年不合理（0／999／1899）→ 遺失', 'PART 6'],
      ['leak', '⑩ 移除洩漏欄位（出院後30天門診次數、結案註記）', 'PART 12'],
      ['derive', '⑪ 衍生：年齡、BMI、脈壓', 'PART 11'],
      ['role', '⑫ 移除 id 類欄位不進模型（就診序號）', 'PART 3'],
    ];
    const on = {}; STEPS.forEach(s => on[s[0]] = false);
    const out = h('div');
    function pipeline() {
      let Hd = H0.slice(), B = B0.map(r => r.slice());
      const ix = n => Hd.indexOf(n);
      if (on.trim) B = B.map(r => r.map(v => v.trim()));
      if (on.dedup) { const s = new Set(); B = B.filter(r => { const k = r.join('|'); if (s.has(k)) return false; s.add(k); return true; }); }
      if (on.fee) B.forEach(r => r[ix('就診費用')] = r[ix('就診費用')].replace(/,/g, ''));
      if (on.sex) B.forEach(r => { const t = r[ix('性別')].trim(); r[ix('性別')] = ['男', 'M', '1'].includes(t) ? 'M' : ['女', 'F', '0'].includes(t) ? 'F' : r[ix('性別')]; });
      if (on.city) B.forEach(r => { let v = r[ix('縣市')].replace(/台/g, '臺'); if (v.trim().toUpperCase() === 'TAIPEI') v = '臺北市'; r[ix('縣市')] = v; });
      if (on.date) B.forEach(r => { const v = r[ix('就診日')].trim(); let m; if ((m = v.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/))) r[ix('就診日')] = `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`; else if ((m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) r[ix('就診日')] = `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`; });
      if (on.h_m) B.forEach(r => { const v = +r[ix('身高cm')]; if (v > 0 && v < 3) r[ix('身高cm')] = (v * 100).toFixed(1); });
      if (on.zero) B.forEach(r => ['身高cm', '體重kg', '收縮壓', '舒張壓'].forEach(c => { if (r[ix(c)] !== '' && +r[ix(c)] === 0) r[ix(c)] = ''; }));
      if (on.byear) B.forEach(r => { const v = +r[ix('出生年')]; if (!(v > 1900 && v <= 2026)) r[ix('出生年')] = ''; });
      if (on.derive) { Hd.push('年齡', 'BMI', '脈壓'); B.forEach(r => { const by = +r[ix('出生年')], ht = +r[ix('身高cm')], wt = +r[ix('體重kg')], sb = +r[ix('收縮壓')], db = +r[ix('舒張壓')]; const ok = (v, lo, hi) => v > lo && v < hi; r.push(ok(by, 1900, 2027) ? String(2026 - by) : '', ok(ht, 100, 230) && ok(wt, 20, 300) ? (wt / (ht / 100) ** 2).toFixed(1) : '', ok(sb, 40, 300) && ok(db, 20, 200) ? String(sb - db) : ''); }); }
      const drop = []; if (on.leak) drop.push('出院後30天門診次數', '結案註記'); if (on.role) drop.push('就診序號');
      if (drop.length) { const keep = Hd.map((c, i) => drop.includes(c) ? -1 : i).filter(i => i >= 0); Hd = keep.map(i => Hd[i]); B = B.map(r => keep.map(i => r[i])); }
      return { Hd, B };
    }
    function profile(Hd, B) {
      return Hd.map((c, j) => {
        const v = B.map(r => r[j]), ne = v.filter(x => x !== ''), num = ne.every(x => /^-?\d+(\.\d+)?$/.test(x));
        const uq = new Set(ne).size;
        let type = num ? (ne.every(x => /^-?\d+$/.test(x)) ? 'integer' : 'real') : (uq === 2 ? 'binominal' : 'polynominal');
        if (!num && ne.every(x => /^\d{4}-\d{2}-\d{2}$/.test(x))) type = 'date';
        const nums = num ? ne.map(Number) : [];
        const issues = [];
        if (c === '就診費用' && !num) issues.push('含千分位，被讀成文字');
        if (!num && ne.some(x => x !== x.trim())) issues.push('有前後空白');
        if (c === '性別' && uq > 2) issues.push(`${uq} 種寫法`);
        if (c === '縣市' && uq > 4) issues.push(`${uq} 種寫法`);
        if (c === '就診日' && type !== 'date') issues.push('日期格式混用');
        if (num && ['身高cm', '體重kg', '收縮壓', '舒張壓'].includes(c) && nums.some(x => x === 0)) issues.push('以 0 代表未量測');
        if (c === '身高cm' && num && nums.some(x => x > 0 && x < 3)) issues.push('誤填公尺');
        if (c === '出生年' && nums.some(x => x < 1900 || x > 2026)) issues.push('不可能的出生年');
        if (['出院後30天門診次數', '結案註記'].includes(c)) issues.push('洩漏誘餌');
        if (c === '就診序號') issues.push('id，不可進模型');
        return { c, type, miss: v.length - ne.length, zero: nums.filter(x => x === 0).length, min: num ? S.min(nums) : null, max: num ? S.max(nums) : null, uq, issues };
      });
    }
    function draw() {
      out.innerHTML = '';
      const { Hd, B } = pipeline(), P = profile(Hd, B), get = c => P.find(p => p.c === c);
      // steps
      const stepBox = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px' } });
      STEPS.forEach(([k, l, part]) => { const c = h('input', { type: 'checkbox' }); c.checked = on[k]; c.onchange = () => { on[k] = c.checked; draw(); }; stepBox.append(h('label', { style: { display: 'flex', gap: '8px', alignItems: 'center', fontSize: '14px', padding: '4px 8px', borderRadius: '6px', background: on[k] ? 'var(--accent-soft)' : 'transparent', cursor: 'pointer' } }, c, h('span', { style: { flex: 1 } }, l), h('span', { class: 'tag gray', style: { fontSize: '11px' } }, part))); });
      const ba = h('button', { class: 'btn sm' }, '全部套用'); ba.onclick = () => { STEPS.forEach(s => on[s[0]] = true); draw(); };
      const br = h('button', { class: 'btn sm' }, '全部取消'); br.onclick = () => { STEPS.forEach(s => on[s[0]] = false); draw(); };
      // answers
      const g = c => get(c) || { uq: 0, type: '', miss: 0, issues: [] };
      const ANS = [
        ['完全重複 14 筆：765 → 751', B.length === 751],
        ['就診費用為數值型態（約 3.5% 的列含逗號）', g('就診費用').type === 'integer'],
        ['病歷號 300 個且保留前導零', g('病歷號').uq === 300 && g('病歷號').type === 'polynominal'],
        ['性別剩 2 類', g('性別').uq === 2],
        ['縣市剩 4 類', g('縣市').uq === 4],
        ['科別 5 類（無尾空白）', g('科別').uq === 5],
        ['就診日為 date 型態', g('就診日').type === 'date'],
        ['身高誤填公尺（約 5.5%）已修正', g('身高cm').issues.indexOf('誤填公尺') < 0],
        ['0 不再偽裝成有效值', !['身高cm', '體重kg', '收縮壓', '舒張壓'].some(c => g(c).issues.includes('以 0 代表未量測'))],
        ['出生年不合理值（約 1%）→ 遺失', g('出生年').issues.length === 0],
        ['洩漏誘餌已移除', !Hd.includes('出院後30天門診次數') && !Hd.includes('結案註記')],
      ];
      const nOK = ANS.filter(a => a[1]).length;
      const ansBox = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '3px', fontSize: '13.5px' } }, ANS.map(([t, ok]) => h('div', { style: { color: ok ? 'var(--good)' : 'var(--muted)' } }, (ok ? '● ' : '○ ') + t)));
      // profile table
      const pt = h('table', { class: 'dt' }, h('tr', null, ['欄位', '型態', '遺失', '0 值', '最小', '最大', '不重複', '警示'].map(x => h('th', null, x))),
        P.map(p => h('tr', null, h('td', { style: { fontWeight: 600 } }, p.c), h('td', { class: 'mono' + (p.c === '就診費用' && p.type !== 'integer' ? ' hl' : '') }, p.type), h('td', { class: 'num' }, p.miss ? `${p.miss}（${(p.miss / B.length * 100).toFixed(1)}%）` : 0), h('td', { class: 'num' + (p.zero && !['出院後30天門診次數', '再就診30天'].includes(p.c) ? ' hl' : '') }, p.zero), h('td', { class: 'num' }, p.min == null ? '—' : p.min), h('td', { class: 'num' }, p.max == null ? '—' : p.max), h('td', { class: 'num' }, p.uq), h('td', { style: { whiteSpace: 'normal', minWidth: '140px' } }, p.issues.map(t => h('span', { class: 'tag ' + (t.includes('洩漏') ? 'bad' : t.includes('id') ? 'gray' : 'amber'), style: { margin: '1px 3px 1px 0' } }, t))))));
      // MAR evidence: 體重缺失 by 科別 (raw zero)
      const ki = H0.indexOf('科別'), wi = H0.indexOf('體重kg'), grp = {};
      B0.forEach(r => { const k = r[ki].trim(); grp[k] = grp[k] || [0, 0]; grp[k][1]++; if (+r[wi] === 0) grp[k][0]++; });
      const mar = h('div'); U.hbars(mar, Object.entries(grp).sort((a, b) => b[1][0] / b[1][1] - a[1][0] / a[1][1]).map(([k, [m, n]]) => ({ label: k, value: m / n, color: k === '急診' ? C.bad : C.accent })), { w: 360, lw: 60, rowH: 22, max: .5, fmt: v => (v * 100).toFixed(1) + '%' });
      // join / pivot
      const pidx = Hd.indexOf('病歷號'), lp = LH.indexOf('病歷號');
      const cnt = {}; LB.forEach(r => cnt[r[lp]] = (cnt[r[lp]] || 0) + 1);
      const leftJoin = B.reduce((s, r) => s + (cnt[r[pidx]] || 1), 0), pats = Object.keys(cnt).length;
      const items = [...new Set(LB.map(r => r[LH.indexOf('檢驗項目')]))];
      // preview
      const pv = h('table', { class: 'dt' }, h('tr', null, Hd.map(c => h('th', null, c))), B.slice(0, 8).map(r => h('tr', null, r.map(v => h('td', { class: v === '' ? 'miss' : '' }, v === '' ? '?' : v)))));
      const dl = h('button', { class: 'btn primary sm' }, '下載目前結果 CSV'); dl.onclick = () => { const csv = '﻿' + [Hd, ...B].map(r => r.map(v => /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v).join(',')).join('\n'); const a = h('a', { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'M1_門診主檔_我的清理版.csv' }); document.body.append(a); a.click(); a.remove(); };
      out.append(
        h('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(300px,1fr) minmax(260px,.8fr)', gap: '16px' } },
          h('div', { class: 'wd', style: { margin: 0 } }, h('div', { class: 'wh' }, h('h3', null, '清理步驟'), ba, br), stepBox),
          h('div', { class: 'wd', style: { margin: 0 } }, h('div', { class: 'wh' }, h('h3', null, '對答案'), h('span', { class: 'tag ' + (nOK === ANS.length ? 'good' : 'amber') }, `${nOK} / ${ANS.length}`)), ansBox,
            h('div', { class: 'kpi', style: { marginTop: '10px' } }, h('div', null, h('div', { class: 'k' }, '列數'), h('div', { class: 'v' }, B.length)), h('div', null, h('div', { class: 'k' }, '欄位數'), h('div', { class: 'v' }, Hd.length))))),
        h('div', { class: 'wd' }, h('div', { class: 'wh' }, h('h3', null, 'Statistics：逐欄品質檢查表'), h('span', { class: 'tag' }, '作業任務 1 就是做出這張表')), h('div', { class: 'tscroll' }, pt)),
        h('div', { class: 'grid2' },
          h('div', { class: 'wd', style: { margin: 0 } }, h('div', { class: 'wh' }, h('h3', null, '體重未量測率（依科別）')), mar, h('p', { class: 'ai' }, '急診明顯偏高、其他科 2–5%：缺失可由看得到的「科別」解釋 → MAR。分組看遺失率就看得出來。')),
          h('div', { class: 'wd', style: { margin: 0 } }, h('div', { class: 'wh' }, h('h3', null, 'Join 與 Pivot 檢驗結果')),
            h('div', { class: 'kpi' }, h('div', null, h('div', { class: 'k' }, '檢驗結果'), h('div', { class: 'v' }, LB.length), h('div', { class: 'k' }, `屬 ${pats} 位病人`)), h('div', null, h('div', { class: 'k' }, '主檔 Left Join 檢驗'), h('div', { class: 'v bad' }, leftJoin.toLocaleString()), h('div', { class: 'k' }, `一對多：${B.length} → ${leftJoin}`)), h('div', null, h('div', { class: 'k' }, '先 Pivot 成寬表再 Join'), h('div', { class: 'v good' }, B.length), h('div', { class: 'k' }, `寬表 ${pats} 列 × ${items.length + 1} 欄`))),
            h('p', { class: 'ai' }, `檢驗項目：${items.join('、')}。300 位病人中 ${300 - pats} 位沒有檢驗——Left Join 後是「?」，不是錯誤。`))),
        h('div', { class: 'wd' }, h('div', { class: 'wh' }, h('h3', null, '預覽前 8 列'), dl), h('div', { class: 'tscroll' }, pv)));
    }
    $('#w-lab').append(out); draw();
  })();

  // ================= P14 作業清單 =================
  (function () {
    const T = [['資料品質健檢', '以 Statistics 做品質檢查表：筆數、欄位數、型態、遺失比例、極值；標出生理上不可能的值', 'PART 1–2'], ['遺失值機制判別', '至少三個欄位判斷 MCAR／MAR／MNAR 並說明依據', 'PART 6'], ['遺失值處理與比較', '同一欄位做刪除、平均、中位數，比較平均、標準差與分布圖', 'PART 6'], ['離群值檢查', '直方圖、盒鬚圖、標準差法檢查至少兩個欄位，說明處理理由', 'PART 7'], ['共線性檢查', 'Correlation Matrix 找出 |r| 最高的一組並說明處理', 'PART 9'], ['特徵工程', '算術衍生、分箱（領域切點）、類別編碼各一，說明領域理由', 'PART 11'], ['防洩漏檢核', '流程圖標出切分點，逐項檢查五種洩漏來源', 'PART 12']];
    const st = Store.get('m1:tasks', {}); const out = h('div');
    function draw() {
      out.innerHTML = ''; const n = T.filter((_, i) => st[i]).length;
      out.append(h('div', { class: 'row', style: { marginBottom: '8px' } }, h('div', { class: 'pbar', style: { width: '200px' } }, h('i', { style: { width: (n / T.length * 100) + '%' } })), h('span', { style: { fontSize: '13px', color: 'var(--muted)' } }, `${n} / ${T.length} 完成（只存在你的瀏覽器）`)));
      T.forEach(([t, d, p], i) => { const c = h('input', { type: 'checkbox' }); c.checked = !!st[i]; c.onchange = () => { st[i] = c.checked; Store.set('m1:tasks', st); draw(); }; out.append(h('label', { style: { display: 'flex', gap: '10px', padding: '7px 4px', borderBottom: '1px solid var(--line)', cursor: 'pointer', alignItems: 'flex-start' } }, c, h('div', { style: { flex: 1 } }, h('b', { style: { textDecoration: st[i] ? 'line-through' : 'none' } }, `任務 ${i + 1}　${t}`), h('div', { style: { fontSize: '13.5px', color: 'var(--muted)' } }, d)), h('span', { class: 'tag gray' }, p))); });
      out.append(h('p', { class: 'ai' }, '形式：個人作業，PDF 報告（本文 5–8 頁，含截圖）＋ .rmp 流程檔，壓縮上傳 iClass；檔名「學號_姓名_M1作業.zip」。另需回答四個思考題（偽裝的遺失、填補讓哪些統計量失真、預測當下拿不到的欄位、最可能被質疑的決策）。不另計分，屬隨堂 Lab。'));
    }
    $('#w-tasks').append(out); draw();
  })();

  // ================= P14 術語翻卡 =================
  (function () {
    const G = [['資料工程', 'Data Engineering', '讓資料可用、可信、可取得'], ['探索性資料分析', 'EDA', '建模前先理解資料的分布與關係'], ['資料品質', 'Data Quality', '完整、正確、一致、時效、有效、唯一'], ['遺失值', 'Missing Data', '該有值卻沒有；醫療資料常偽裝成 0'], ['完全隨機遺失', 'MCAR', '缺失與任何變數無關'], ['隨機遺失', 'MAR', '缺失與其他已觀測變數有關'], ['非隨機遺失', 'MNAR', '缺失與缺失值本身有關（最麻煩）'], ['填補', 'Imputation', '以平均、中位數或模型預測補上缺失值'], ['離群值', 'Outlier', '明顯偏離其他資料的觀測值'], ['四分位距', 'IQR', 'Q3−Q1；盒鬚圖判定離群的依據'], ['正規化', 'Min-Max Scaling', '壓縮到 0–1 區間'], ['標準化', 'Z-Score', '轉為平均 0、標準差 1'], ['特徵工程', 'Feature Engineering', '把領域知識變成模型看得懂的欄位'], ['分箱', 'Binning', '連續值切成有意義的區間'], ['虛擬變數', 'One-Hot Encoding', '類別展開成 0/1 欄位'], ['序數編碼', 'Ordinal Encoding', '有序類別編成 1/2/3 保留次序'], ['目標編碼', 'Target Encoding', '以各類別的陽性率取代類別（洩漏風險高）'], ['聚合', 'Aggregation', '把多列壓成一列，改變分析單位'], ['樞紐／重塑', 'Pivot / Reshape', '長寬表互轉'], ['合併', 'Join / Merge', '依鍵值把兩張表接起來'], ['一對多', 'One-to-Many', '右表同鍵值多筆，Join 後筆數增加'], ['資料洩漏', 'Data Leakage', '訓練時用到預測當下拿不到的資訊'], ['共線性', 'Collinearity', '自變數之間高度相關'], ['變異數膨脹因子', 'VIF', '共線性的量化指標，>10 需警覺'], ['醫療資料交換標準', 'FHIR（HL7）', '以 JSON「資源」交換病歷；台灣規範為 TW Core'], ['長表／寬表', 'Long / Wide Format', '一列一筆紀錄 vs 一列一個對象'], ['對數轉換', 'Log Transform', '壓縮右偏長尾，有 0 時用 log(x+1)'], ['群組切分', 'Group Split', '同一對象的紀錄只能在訓練或測試其中一邊']];
    let front = 'zh'; const out = h('div');
    function draw() {
      out.innerHTML = '';
      const g = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: '8px' } });
      G.forEach(([zh, en, d]) => { const c = h('div', { style: { border: '1px solid var(--line)', borderRadius: '10px', padding: '10px 12px', minHeight: '86px', background: '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'center' } }); let f = false; const paint = () => { c.innerHTML = ''; c.style.background = f ? 'var(--accent-soft)' : '#fff'; if (!f) c.append(h('div', { style: { fontWeight: 700, fontSize: '15.5px' } }, front === 'zh' ? zh : en)); else c.append(h('div', { style: { fontWeight: 600, fontSize: '13.5px', color: 'var(--accent-ink)' } }, front === 'zh' ? en : zh), h('div', { style: { fontSize: '13px', color: 'var(--muted)' } }, d)); }; c.onclick = () => { f = !f; paint(); }; paint(); g.append(c); });
      out.append(h('div', { class: 'row', style: { marginBottom: '8px' } }, seg([['zh', '正面：中文'], ['en', '正面：英文']], () => front, v => front = v, draw)), g);
    }
    $('#w-cards').append(out); draw();
  })();

  // ================= P14 總測驗 =================
  (function () {
    const Q = [
      ['資料品質檢查建議先做哪三項（用 Statistics 就能看出大半）？', ['正確性、時效性、一致性', '有效性、完整性、唯一性', '一致性、正確性、唯一性', '時效性、完整性、有效性'], 1, '順序：有效性 → 完整性 → 唯一性 → 一致性 → 正確性 → 時效性。'],
      ['病歷號「P0007」在 AI Studio 中應如何設定？', ['integer + regular', 'polynominal + id', 'real + label', 'binominal + regular'], 1, '識別碼是文字、有前導零；不參與建模但保留追溯。'],
      ['「科別」（內科／外科／急診）最適合的編碼方式？', ['序數編碼 1/2/3', 'One-Hot', '直接刪除', 'Min-Max'], 1, '類別間沒有大小順序；序數編碼會讓模型以為急診 = 內科的三倍。'],
      ['主檔 751 筆 Left Join 檢驗結果後變成 1,383 筆，原因是？', ['鍵值有空白', '一對多關係', 'Inner Join 用錯', '資料有遺失值'], 1, '同一病人有多筆檢驗，主檔那一列被複製。Join 前先 Aggregate 或 Pivot。'],
      ['急診體重未量測率 39%、其他科 2–5%，最可能是？', ['MCAR', 'MAR', 'MNAR', '不是遺失'], 1, '缺失可由看得到的「科別」解釋。'],
      ['右偏的胰島素有 45% 缺失，若要用集中量數填補，較佳選擇？', ['平均數', '中位數', '0', '最大值'], 1, '偏態時平均被長尾拉高；中位數較貼近多數人。仍建議加 is_missing 欄。'],
      ['預測高風險病人的模型中，舒張壓 138 的病人應該？', ['直接移除', '標記保留，建模後單獨檢視', '改成平均值', '視為遺失'], 1, '生理上可能但罕見——可能正是你要找的重症個案。'],
      ['r = 0.8 代表兩個變數共享多少變異？', ['80%', '64%', '40%', '8%'], 1, 'r² = 0.64。'],
      ['下列哪一個演算法「不需要」縮放？', ['k-NN', 'K-Means', 'SVM', '隨機森林'], 3, '樹模型只比大小不比距離。'],
      ['哪一個流程順序是正確的？', ['Retrieve → Normalize → Split → 建模', 'Retrieve → SMOTE → Split → 建模', 'Retrieve → Split → 訓練集 Normalize → 同參數套用測試集', 'Retrieve → 全部資料挑欄位 → Split'], 2, '所有會用到整份資料統計量的動作，都要在切分之後。'],
    ];
    const box = $('#w-final'); let score = 0, ans = 0; const sc = h('div', { class: 'note', style: { display: 'none' } });
    Q.forEach(([q, o, a, ex], i) => quiz(box, { head: `第 ${i + 1} 題`, q, opts: o, a, ex, onRight: () => { const qb = box.children[i]; if (!qb.dataset.miss) score++; } }));
    box.addEventListener('click', () => { ans = box.querySelectorAll('.quiz.done').length; if (ans === Q.length) { sc.style.display = 'block'; sc.textContent = `完成！一次答對 ${score} / ${Q.length} 題。${score >= 8 ? '資料工程的觀念很扎實，可以進入 M2。' : '建議回頭看看答錯題目對應的 PART。'}`; } });
    box.append(sc);
  })();

  // ================= P14 重點回顧 =================
  (function () {
    const R = [['資料品質六個維度', '有效性、完整性、唯一性最容易用 Statistics 快速檢查。', 'p01'], ['Join 前後一定要比對筆數', '一對多關係會讓筆數暴增而不報錯。', 'p05'], ['遺失值先問「為什麼缺」', '再決定怎麼補；醫療資料的遺失常偽裝成 0。', 'p06'], ['離群值傾向標記而非刪除', '極端值往往正是目標族群。', 'p07'], ['縮放參數只能從訓練集計算', '且樹模型不需要縮放。', 'p10'], ['資料洩漏不會報錯', '只會給你好看的假分數。指標好到不合理時先查它。', 'p12']];
    const g = h('div', { class: 'grid3' }); R.forEach(([t, d, id], i) => g.append(h('a', { href: '#' + id, style: { textDecoration: 'none', color: 'inherit', border: '1px solid var(--line)', borderRadius: '10px', padding: '10px 12px', background: '#fff', display: 'block' } }, h('div', { class: 'mono', style: { color: 'var(--accent)', fontWeight: 700 } }, i + 1), h('b', null, t), h('div', { style: { fontSize: '13.5px', color: 'var(--muted)' } }, d))));
    $('#w-review').append(g, h('div', { class: 'note' }, h('b', null, '下一步：'), '第 4 週 M2 監督式學習 I：迴歸。', h('a', { href: '../' }, '回到課程首頁 →')));
  })();
})();
