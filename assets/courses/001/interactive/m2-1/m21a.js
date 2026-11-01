/* M2-1 互動頁 A：PART 01–07 */
(function () {
  'use strict';
  const { h, $, S, fmt, C, rng, randn, quiz, seg, slider, check } = U;
  U.initModule('m21');
  const cap = (el, px) => { el.style.maxWidth = px + 'px'; el.style.width = '100%'; el.style.margin = '0 auto'; return el; };
  const fitLine = (x, y) => { const b = ML.ols(x.map(v => [v]), y); return { a: b[0], b: b[1] }; };

  // ================= P01 三種用途 =================
  (function () {
    const r = rng(5), P = []; for (let i = 0; i < 70; i++) { const a = 45 + r() * 40; P.push({ x: a, y: 1.28 + .11 * a + 1.2 * randn(r) }); }
    const L = fitLine(P.map(p => p.x), P.map(p => p.y));
    let mode = 'pred', age = 72, shift = 1.6; const out = h('div');
    function draw() { out.innerHTML = '';
      const ch = h('div'); const yv = L.a + L.b * age;
      U.scatter(ch, P.map(p => ({ x: p.x, y: p.y, c: C.gray, r: 3 })), { w: 520, h: 300, xmin: 42, xmax: 88, ymin: 2, ymax: 14, xlabel: '年齡', ylabel: '住院天數',
        over: [(sv, x, y) => {
          U.s('line', { x1: x(42), y1: y(L.a + L.b * 42), x2: x(88), y2: y(L.a + L.b * 88), stroke: C.accent, 'stroke-width': 2.5 }, sv);
          if (mode === 'pred') { U.s('line', { x1: x(age), x2: x(age), y1: y(2), y2: y(yv), stroke: C.amber, 'stroke-dasharray': '4 3' }, sv); U.s('line', { x1: x(42), x2: x(age), y1: y(yv), y2: y(yv), stroke: C.amber, 'stroke-dasharray': '4 3' }, sv); U.s('circle', { cx: x(age), cy: y(yv), r: 7, fill: C.amber, stroke: '#fff', 'stroke-width': 2 }, sv); }
          if (mode === 'inf') { const x0 = 55, y0 = L.a + L.b * x0; U.s('path', { d: `M${x(x0)},${y(y0)} L${x(x0 + 10)},${y(y0)} L${x(x0 + 10)},${y(y0 + 10 * L.b)}`, fill: 'none', stroke: C.amber, 'stroke-width': 2 }, sv); U.s('text', { x: x(x0 + 5), y: y(y0) + 16, 'text-anchor': 'middle', text: '每 10 歲', style: 'fill:#b45309;font-weight:600' }, sv); U.s('text', { x: x(x0 + 10) + 6, y: y(y0 + 5 * L.b), text: `+${(10 * L.b).toFixed(1)} 天`, style: 'fill:#b45309;font-weight:600' }, sv); }
          if (mode === 'sim') U.s('line', { x1: x(42), y1: y(L.a - shift + L.b * 42), x2: x(88), y2: y(L.a - shift + L.b * 88), stroke: C.bad, 'stroke-width': 2, 'stroke-dasharray': '6 4' }, sv);
        }] });
      const msg = { pred: `新病人 ${age} 歲 → 預測住院 ${yv.toFixed(1)} 天。只在乎準不準，可以用黑箱模型。`, inf: `斜率 = +${L.b.toFixed(3)} 天／歲，每 10 歲約 +${(10 * L.b).toFixed(1)} 天。這個數字本身才是重點——要做解釋，必須檢查假設。`, sim: `「若提早介入，整條線往下平移 ${shift.toFixed(1)} 天」——這是假想。迴歸係數不代表因果，回答這題需要實驗或準實驗設計。` }[mode];
      out.append(h('div', { class: 'row', style: { marginBottom: '8px' } }, seg([['pred', '① 預測'], ['inf', '② 解釋'], ['sim', '③ 情境模擬']], () => mode, v => mode = v, draw), mode === 'pred' ? slider('新病人年齡', 45, 85, 1, () => age, v => age = v, draw) : mode === 'sim' ? slider('假想下移', 0, 3, .1, () => shift, v => shift = v, draw, v => (+v).toFixed(1) + ' 天') : ''),
        h('div', { class: 'grid2', style: { alignItems: 'center' } }, ch, h('div', null, h('div', { class: 'note ' + (mode === 'sim' ? 'warn' : ''), style: { fontSize: '14px' } }, msg), h('p', { class: 'ai' }, `迴歸式：ŷ = ${L.a.toFixed(2)} + ${L.b.toFixed(3)} × 年齡（模擬 70 筆）。三種用途的資料與線完全相同。`)))); }
    $('#w-uses').append(out); draw();
  })();

  // ================= P01 工作流程 =================
  (function () {
    const F = [['EDA', '看目標分布、特徵關係'], ['準備資料', '切分、轉換、特徵工程'], ['擬合模型', '從簡單開始，逐步加入變數'], ['檢查假設', '殘差圖、共線性 ★ 正式的一步'], ['評估與調整', 'MAE/RMSE，與基準線比較']];
    const g = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '8px' } });
    F.forEach(([t, d], i) => g.append(h('div', { style: { border: '1px solid ' + (i === 3 ? 'var(--amber)' : 'var(--line)'), borderRadius: '10px', padding: '10px', background: i === 3 ? 'var(--amber-soft)' : '#fff', textAlign: 'center' } }, h('div', { class: 'mono', style: { fontWeight: 700, color: 'var(--accent)', fontSize: '18px' } }, i + 1), h('b', null, t), h('div', { style: { fontSize: '12.5px', color: 'var(--muted)' } }, d))));
    $('#w-flow').append(g, h('p', { class: 'ai' }, '「檢查假設」是迴歸與其他方法最大的差別。迴歸家族：線性（簡單、多元）、非線性形式（多項式、對數、樣條）、正則化（Ridge、Lasso、Elastic Net）、樹與集成（M4）。'));
  })();

  // ================= P02 EDA =================
  (function () {
    const r = rng(8), P = []; for (let i = 0; i < 300; i++) { const sev = r() * 10, lab = 4 + r() * 12; P.push({ sev, lab, d: Math.exp(.9 + .13 * sev + .42 * randn(r)) }); }
    let logT = false; const out = h('div');
    function draw() { out.innerHTML = '';
      const ys = P.map(p => logT ? Math.log(p.d) : p.d), m = S.mean(ys), md = S.median(ys);
      const h1 = h('div'); U.hist(h1, [{ values: ys, color: C.accent, opacity: .8 }], { min: logT ? 0 : 0, max: logT ? 3.6 : 20, bins: 28, w: 340, h: 230, xlabel: logT ? 'ln(住院天數)' : '住院天數', marks: [{ x: md, label: '中位數', color: C.good }, { x: m, label: '平均', color: C.bad, dy: 13 }] });
      const sc = (k, lab) => { const d = h('div'), rr = S.r(P.map(p => p[k]), ys); U.scatter(d, P.map(p => ({ x: p[k], y: logT ? Math.log(p.d) : Math.min(p.d, 20), c: C.blue, r: 2.4 })), { w: 340, h: 230, ymin: logT ? 0 : 0, ymax: logT ? 3.6 : 20, xlabel: lab, ylabel: logT ? 'ln(天數)' : '住院天數' }); return [d, rr]; };
      const [h2, r2] = sc('sev', '疾病嚴重度'), [h3, r3] = sc('lab', '某檢驗值');
      const card = (t, el, note, cls) => h('div', { style: { border: '1px solid var(--line)', borderRadius: '10px', padding: '8px 10px', background: '#fff' } }, h('b', { style: { fontSize: '14px' } }, t), el, h('div', { class: 'tag ' + cls, style: { marginTop: '4px' } }, note));
      out.append(h('div', { class: 'row', style: { marginBottom: '8px' } }, check('目標取對數 ln(y)', () => logT, v => logT = v, draw)),
        h('div', { class: 'grid3' }, card('① 目標的分布', h1, logT ? `平均 ${m.toFixed(2)} ≈ 中位數 ${md.toFixed(2)}：接近對稱` : `平均 ${m.toFixed(1)} > 中位數 ${md.toFixed(1)}：右偏`, logT ? 'good' : 'amber'), card(`② 嚴重度 vs 天數　r = ${r2.toFixed(2)}`, h2, '強候選變數', 'good'), card(`③ 檢驗值 vs 天數　r = ${r3.toFixed(2)}`, h3, '看不出方向 → 列入剔除清單', 'gray')),
        h('div', { class: 'note', style: { fontSize: '14px' } }, h('b', null, 'EDA 待辦清單：'), '① 目標右偏 → 考慮取對數（預測後要還原）　② 嚴重度標記為強候選　③ 檢驗值列入剔除候選。（模擬 300 筆）'));
    }
    $('#w-eda').append(out); draw();
  })();

  // ================= P03 OLS 手算 =================
  const OLS_D = [['P1', 45, 3], ['P2', 52, 4], ['P3', 61, 6], ['P4', 68, 7], ['P5', 73, 9]];
  (function () {
    const D = OLS_D.map(r => r.slice()); let view = 'res'; const out = h('div'); const res = h('div');
    function calc() { res.innerHTML = '';
      const x = D.map(d => d[1]), y = D.map(d => d[2]), mx = S.mean(x), my = S.mean(y);
      const sxy = S.sum(x.map((v, i) => (v - mx) * (y[i] - my))), sxx = S.sum(x.map(v => (v - mx) ** 2)), b = sxy / sxx, a = my - b * mx;
      const pr = x.map(v => a + b * v), e = y.map((v, i) => v - pr[i]), sse = S.sum(e.map(v => v * v)), sst = S.sum(y.map(v => (v - my) ** 2)), r2 = 1 - sse / sst;
      const t = h('table', { class: 'dt' }, h('tr', null, ['病人', '年齡 x', '天數 y', 'x−x̄', 'y−ȳ', '(x−x̄)(y−ȳ)', '(x−x̄)²', '預測 ŷ', '殘差 e'].map(c => h('th', null, c))),
        D.map((d, i) => h('tr', null, h('td', null, d[0]), [1, 2].map(j => { const inp = h('input', { type: 'number', value: d[j], style: { width: '58px' } }); inp.onchange = () => { const v = parseFloat(inp.value); if (!isNaN(v)) { D[i][j] = v; calc(); } }; return h('td', null, inp); }), [x[i] - mx, y[i] - my, (x[i] - mx) * (y[i] - my), (x[i] - mx) ** 2, pr[i], e[i]].map((v, k) => h('td', { class: 'num' + (k === 5 ? ' hl' : '') }, (k === 5 && v > 0 ? '+' : '') + fmt(v, k >= 4 ? 2 : 1))))),
        h('tr', null, h('td', { style: { fontWeight: 700 } }, '合計'), h('td', { class: 'num' }, 'x̄=' + fmt(mx, 1)), h('td', { class: 'num' }, 'ȳ=' + fmt(my, 1)), h('td'), h('td'), h('td', { class: 'num', style: { fontWeight: 700 } }, fmt(sxy, 1)), h('td', { class: 'num', style: { fontWeight: 700 } }, fmt(sxx, 1)), h('td'), h('td', { class: 'num' }, 'SSE ' + fmt(sse, 3))));
      const ch = h('div'); const X0 = Math.min(...x) - 6, X1 = Math.max(...x) + 6, Y0 = 0, Y1 = Math.max(...y) + 3;
      U.scatter(ch, D.map((d, i) => ({ x: d[1], y: d[2], c: C.ink, r: 5, title: d[0] })), { w: 420, h: 300, xmin: X0, xmax: X1, ymin: Y0, ymax: Y1, xlabel: '年齡', ylabel: '住院天數',
        under: [(sv, X, Y) => { const ppu = Y(0) - Y(1);
          if (view === 'res') { D.forEach((d, i) => U.s('line', { x1: X(d[1]), x2: X(d[1]), y1: Y(d[2]), y2: Y(pr[i]), stroke: C.bad, 'stroke-width': 2, 'stroke-dasharray': '3 2' }, sv)); }
          else { const useMean = view === 'tot'; D.forEach((d, i) => { const base = useMean ? my : pr[i], s = Math.abs(d[2] - base) * ppu; U.s('rect', { x: X(d[1]), y: Math.min(Y(d[2]), Y(base)), width: s, height: s, fill: useMean ? C.bad : C.good, 'fill-opacity': .28, stroke: useMean ? C.bad : C.good }, sv); }); if (useMean) U.s('line', { x1: X(X0), x2: X(X1), y1: Y(my), y2: Y(my), stroke: C.bad, 'stroke-dasharray': '5 3' }, sv); }
          if (view !== 'tot') U.s('line', { x1: X(X0), y1: Y(a + b * X0), x2: X(X1), y2: Y(a + b * X1), stroke: C.accent, 'stroke-width': 2.5 }, sv); }] });
      res.append(h('div', { class: 'tscroll' }, t), h('div', { class: 'grid2', style: { marginTop: '10px', alignItems: 'start' } }, h('div', null, h('div', { class: 'row', style: { marginBottom: '6px' } }, seg([['res', '殘差'], ['tot', 'SS_tot 方塊'], ['sse', 'SS_res 方塊']], () => view, v => view = v, calc)), cap(ch, 440)),
        h('div', null, h('div', { class: 'note', style: { fontFamily: 'var(--mono)', fontSize: '14px' } }, h('div', null, `斜率 b = ${fmt(sxy, 1)} ÷ ${fmt(sxx, 1)} = ${b.toFixed(4)}`), h('div', null, `截距 a = ${fmt(my, 2)} − ${b.toFixed(4)} × ${fmt(mx, 1)} = ${a.toFixed(2)}`), h('div', { style: { fontWeight: 700, fontSize: '16px', marginTop: '4px' } }, `ŷ = ${a.toFixed(2)} ${b < 0 ? '−' : '+'} ${Math.abs(b).toFixed(4)} x`)),
          h('div', { class: 'kpi' }, h('div', null, h('div', { class: 'k' }, 'SS_tot（只用平均值猜）'), h('div', { class: 'v' }, fmt(sst, 2))), h('div', null, h('div', { class: 'k' }, 'SS_res（用了模型）'), h('div', { class: 'v' }, fmt(sse, 3))), h('div', null, h('div', { class: 'k' }, 'R² = 1 − SS_res/SS_tot'), h('div', { class: 'v good' }, r2.toFixed(3)))),
          h('p', { class: 'ai' }, `解讀：在樣本年齡範圍內，年齡每增 1 歲，預測住院平均增加約 ${b.toFixed(2)} 天。截距是 0 歲時的預測值，沒有現實意義。R² 的本質：跟直接用平均值猜相比，模型好多少。本例只有五筆且刻意造得線性；真實醫療資料 R² 常在 0.2–0.6。`))));
      const rs = h('button', { class: 'btn sm' }, '還原講義數字'); rs.onclick = () => { OLS_D.forEach((d, i) => D[i] = d.slice()); calc(); }; res.prepend(h('div', { class: 'row', style: { marginBottom: '8px' } }, rs, h('span', { style: { fontSize: '13px', color: 'var(--muted)' } }, '試試：把 P5 的天數改成 4，看 R² 掉多少。')));
    }
    out.append(res); $('#w-ols').append(out); calc();
  })();

  // ================= P03 外插 =================
  (function () {
    const x = OLS_D.map(d => d[1]), y = OLS_D.map(d => d[2]), L = fitLine(x, y); let age = 61; const out = h('div');
    function draw() { out.innerHTML = ''; const p = L.a + L.b * age, inR = age >= 45 && age <= 73;
      out.append(h('div', { class: 'row' }, slider('病人年齡', 15, 100, 1, () => age, v => age = v, draw, v => v + ' 歲')), h('div', { class: 'kpi', style: { margin: '8px 0' } }, h('div', null, h('div', { class: 'k' }, '預測住院天數'), h('div', { class: 'v ' + (inR ? '' : 'bad') }, p.toFixed(2) + ' 天'))),
        h('div', { class: 'note ' + (inR ? '' : 'bad'), style: { fontSize: '14px' } }, inR ? '在資料範圍（45–73 歲）內，預測可以參考。' : (p < 0 ? `預測出負的住院天數——` : '') + `資料範圍只有 45–73 歲，拿去預測 ${age} 歲的病人，模型不負責任何後果（外插）。`)); }
    $('#w-extrap').append(out); draw();
  })();
  quiz('#q03', { q: '最小平方法為什麼要把殘差「取平方」再加總？', opts: ['讓數字變大比較好看', '正負不抵消，且大誤差被加重懲罰、可微分有唯一解', '因為 AI Studio 規定', '讓 R² 介於 0 和 1'], a: 1, ex: '直接加總殘差，正負會互相抵消；取絕對值雖可行但不可微。平方讓大誤差的懲罰不成比例地變大。' });

  // ================= P04 森林圖 =================
  (function () {
    const V = [['年齡', .21, .06], ['共病數', 1.35, .3], ['男性', .18, .35], ['BMI', .04, .03], ['住院前活動功能', -.62, .2]];
    let n = 100; const out = h('div');
    function draw() { out.innerHTML = '';
      const W = 620, rowH = 34, H = V.length * rowH + 40, sv = U.svgBox(h('div'), W, H), x = U.scale(-1.2, 2.2, 160, W - 120);
      [-1, -.5, 0, .5, 1, 1.5, 2].forEach(t => { U.s('line', { x1: x(t), x2: x(t), y1: 8, y2: H - 28, class: t === 0 ? '' : 'grid', stroke: t === 0 ? C.bad : null, 'stroke-width': t === 0 ? 1.8 : null }, sv); U.s('text', { x: x(t), y: H - 12, 'text-anchor': 'middle', text: t }, sv); });
      const rows = V.map(([nm, b, se], i) => { const s = se * Math.sqrt(100 / n), lo = b - 1.96 * s, hi = b + 1.96 * s, sig = lo > 0 || hi < 0, Y = 20 + i * rowH;
        U.s('text', { x: 150, y: Y + 4, 'text-anchor': 'end', text: nm, style: 'font-size:12px;fill:#1c2430' }, sv);
        U.s('line', { x1: x(Math.max(-1.2, lo)), x2: x(Math.min(2.2, hi)), y1: Y, y2: Y, stroke: sig ? C.accent : C.gray, 'stroke-width': 3 }, sv);
        U.s('circle', { cx: x(b), cy: Y, r: 6, fill: sig ? C.accent : '#fff', stroke: sig ? C.accent : C.gray, 'stroke-width': 2 }, sv);
        U.s('text', { x: W - 110, y: Y + 4, text: `β=${b > 0 ? '+' : ''}${b}  ${sig ? '顯著 ✓' : '不顯著'}`, style: `font-size:12px;fill:${sig ? '#08504d' : '#8a929c'};font-weight:${sig ? 600 : 400}` }, sv);
        return { nm, sig, lo, hi }; });
      const bmi = rows[3];
      out.append(h('div', { class: 'row', style: { marginBottom: '6px' } }, slider('樣本數 n', 30, 3000, 10, () => n, v => n = v, draw, v => v.toLocaleString())), sv.parentNode,
        h('div', { class: 'note ' + (bmi.sig ? 'warn' : ''), style: { fontSize: '14px' } }, bmi.sig ? `n = ${n.toLocaleString()} 時 BMI 的區間 [${bmi.lo.toFixed(3)}, ${bmi.hi.toFixed(3)}] 不含 0，變「顯著」了——但每單位 BMI 只多 0.04 天，臨床上幾乎沒有意義。統計顯著 ≠ 臨床重要。` : '每條橫線是 95% 信賴區間；跨過紅色 0 線＝不顯著（可能根本沒效果）。區間寬＝估得不準，例如「男性」。'), h('p', { class: 'ai' }, '示意數值；區間寬度隨 1/√n 縮小。'));
    }
    $('#w-forest').append(out); draw();
  })();

  // ================= P05 殘差形狀 =================
  (function () {
    const r = rng(12), base = []; for (let i = 0; i < 120; i++) base.push({ x: r() * 10, e: randn(r) });
    const T = { ok: ['健康：隨機散布在 0 附近', '—', '繼續前進', p => p.e], curve: ['倒 U 型：模型形式錯誤', '真實關係是曲線，你用直線去配', '加入 x² 項，或對 x 取對數', p => p.e * .6 - .25 * (p.x - 5) ** 2 + 2], funnel: ['喇叭狀：異質變異', '數值越大變異越大（醫療費用的典型）', '對 y 取對數；或加權最小平方', p => p.e * (.2 + .35 * p.x)], cycle: ['週期起伏：誤差不獨立', '有時間或分群結構沒處理', '加入時間特徵；或改用適當模型', p => .5 * p.e + 2 * Math.sin(p.x * 1.9)] };
    let k = 'ok'; const out = h('div');
    function draw() { out.innerHTML = ''; const [t, cause, fix, f] = T[k]; const ch = h('div');
      U.scatter(ch, base.map(p => ({ x: p.x, y: f(p), c: k === 'ok' ? C.accent : C.amber, r: 3 })), { w: 420, h: 250, xmin: 0, xmax: 10, ymin: -5, ymax: 5, xlabel: '預測值 →', ylabel: '殘差', under: [(sv, x, y) => U.s('line', { x1: x(0), x2: x(10), y1: y(0), y2: y(0), stroke: C.ink, 'stroke-dasharray': '4 3' }, sv)] });
      out.append(h('div', { class: 'row', style: { marginBottom: '8px' } }, seg([['ok', '健康'], ['curve', '彎曲'], ['funnel', '喇叭'], ['cycle', '週期']], () => k, v => k = v, draw)),
        h('div', { class: 'grid2', style: { alignItems: 'center' } }, cap(ch, 440), h('div', null, h('div', { class: 'note ' + (k === 'ok' ? '' : 'warn'), style: { fontSize: '14.5px' } }, h('b', null, t), h('div', null, '病因：' + cause), h('div', null, '處方：' + fix))))); }
    $('#w-resid').append(out); draw();
  })();

  // ================= P05 劑量反應 =================
  (function () {
    const D = [[1, 2.1], [2, 3.9], [4, 5.9], [5, 6.1], [7, 5.2], [8, 4.1]]; let deg = 1; const out = h('div');
    function draw() { out.innerHTML = '';
      const f = ML.polyfit(D.map(d => d[0]), D.map(d => d[1]), deg, 0, 9), my = S.mean(D.map(d => d[1]));
      const r2 = 1 - S.sum(D.map(d => (d[1] - f(d[0])) ** 2)) / S.sum(D.map(d => (d[1] - my) ** 2));
      const c1 = h('div'); U.scatter(c1, D.map(d => ({ x: d[0], y: d[1], c: C.ink, r: 5 })), { w: 360, h: 240, xmin: 0, xmax: 9, ymin: 0, ymax: 8, xlabel: '劑量', ylabel: '反應', over: [(sv, x, y) => { const pts = []; for (let v = .5; v <= 8.5; v += .1) pts.push(`${x(v)},${y(f(v))}`); U.s('polyline', { points: pts.join(' '), fill: 'none', stroke: deg === 1 ? C.gray : C.accent, 'stroke-width': 2.5 }, sv); }] });
      const c2 = h('div'); U.scatter(c2, D.map(d => ({ x: d[0], y: d[1] - f(d[0]), c: deg === 1 ? C.amber : C.accent, r: 5 })), { w: 360, h: 240, xmin: 0, xmax: 9, ymin: -2, ymax: 2, xlabel: '劑量', ylabel: '殘差', under: [(sv, x, y) => U.s('line', { x1: x(0), x2: x(9), y1: y(0), y2: y(0), stroke: C.ink, 'stroke-dasharray': '4 3' }, sv)] });
      out.append(h('div', { class: 'row', style: { marginBottom: '8px' } }, seg([[1, '線性 y = a + bx'], [2, '二次 y = a + bx + cx²']], () => deg, v => deg = v, draw), h('span', { class: 'tag ' + (r2 > .9 ? 'good' : 'amber') }, `R² = ${r2.toFixed(3)}`)),
        h('div', { class: 'grid2' }, cap(c1, 380), cap(c2, 380)), h('div', { class: 'note ' + (deg === 1 ? 'warn' : ''), style: { fontSize: '14px' } }, deg === 1 ? '線性模型的殘差：先負、後正、再負——標準的倒 U 型。劑量-反應常有「先升後降」，直線根本配不上。' : 'Generate Attributes 加一個 x² 欄位，殘差變成隨機散布。提醒：不是所有低 R² 都該加多項式——先看殘差圖有沒有形狀。'));
    }
    $('#w-dose').append(out); draw();
  })();

  // ================= P05 槓桿點 =================
  (function () {
    const r = rng(41), P = []; for (let i = 0; i < 40; i++) { const a = 40 + r() * 45; P.push({ x: a, y: .6 + .115 * a + 1.1 * randn(r) }); }
    let inc = false, px = 95, py = 3; const out = h('div');
    function draw() { out.innerHTML = '';
      const Q = inc ? P.concat([{ x: px, y: py }]) : P, L0 = fitLine(P.map(p => p.x), P.map(p => p.y)), L1 = fitLine(Q.map(p => p.x), Q.map(p => p.y));
      let cook = null; if (inc) { const n = Q.length, mx = S.mean(Q.map(p => p.x)), sxx = S.sum(Q.map(p => (p.x - mx) ** 2)), e = Q.map(p => p.y - (L1.a + L1.b * p.x)), mse = S.sum(e.map(v => v * v)) / (n - 2), hh = 1 / n + (px - mx) ** 2 / sxx; cook = e[n - 1] ** 2 / (2 * mse) * hh / (1 - hh) ** 2; }
      const ch = h('div'); U.scatter(ch, Q.map((p, i) => ({ x: p.x, y: p.y, c: i === 40 ? C.bad : C.gray, r: i === 40 ? 7 : 3 })), { w: 480, h: 280, xmin: 38, xmax: 100, ymin: 0, ymax: 15, xlabel: '年齡', ylabel: '住院天數', over: [(sv, x, y) => { U.s('line', { x1: x(38), y1: y(L0.a + L0.b * 38), x2: x(100), y2: y(L0.a + L0.b * 100), stroke: C.accent, 'stroke-width': 2 }, sv); if (inc) U.s('line', { x1: x(38), y1: y(L1.a + L1.b * 38), x2: x(100), y2: y(L1.a + L1.b * 100), stroke: C.bad, 'stroke-width': 2, 'stroke-dasharray': '6 4' }, sv); }] });
      out.append(h('div', { class: 'row', style: { marginBottom: '6px' } }, check('加入一位 95 歲的病人', () => inc, v => inc = v, draw), inc ? slider('他的住院天數', 1, 14, .5, () => py, v => py = v, draw, v => v + ' 天') : ''),
        h('div', { class: 'grid2', style: { alignItems: 'center' } }, cap(ch, 500), h('div', null, h('div', { class: 'kpi' }, h('div', null, h('div', { class: 'k' }, '不含此點斜率'), h('div', { class: 'v' }, '+' + L0.b.toFixed(3))), inc ? h('div', null, h('div', { class: 'k' }, '含此點斜率'), h('div', { class: 'v bad' }, (L1.b >= 0 ? '+' : '') + L1.b.toFixed(3))) : '', inc ? h('div', null, h('div', { class: 'k' }, "Cook's D（> 4/n = 0.098 值得查）"), h('div', { class: 'v ' + (cook > 4 / 41 ? 'bad' : '') }, cook.toFixed(2))) : ''),
          h('div', { class: 'note', style: { fontSize: '14px' } }, '高槓桿：x 遠離其他資料，對線有很大的拉力；高影響：同時偏離趨勢，加入後斜率明顯改變。先查是不是輸入錯誤；確認是真實個案時，分別跑含與不含的版本並報告差異。')))); }
    $('#w-lever').append(out); draw();
  })();

  // ================= P06 淨效果 =================
  (function () {
    const r = rng(24), P = []; for (let i = 0; i < 220; i++) { const age = 30 + r() * 50, sev = Math.max(1, Math.min(10, 1 + (age - 30) / 50 * 6 + 1.6 * randn(r))); P.push({ age, sev, d: 2 + .038 * age + .9 * sev + 1.1 * randn(r) }); }
    const simple = fitLine(P.map(p => p.age), P.map(p => p.d)), mult = ML.ols(P.map(p => [p.age, p.sev]), P.map(p => p.d));
    const LAY = [[1, 4, C.good, '嚴重度 1–4'], [4, 7, C.amber, '嚴重度 4–7'], [7, 10.1, C.bad, '嚴重度 7–10']].map(([lo, hi, c, n]) => { const q = P.filter(p => p.sev >= lo && p.sev < hi); return { c, n, q, L: fitLine(q.map(p => p.age), q.map(p => p.d)) }; });
    let strat = false; const out = h('div');
    function draw() { out.innerHTML = '';
      const ch = h('div'); U.scatter(ch, P.map(p => ({ x: p.age, y: p.d, c: strat ? LAY.find(l => l.q.includes(p)).c : C.gray, r: 2.8 })), { w: 480, h: 290, xmin: 28, xmax: 82, ymin: 2, ymax: 18, xlabel: '年齡', ylabel: '住院天數', over: [(sv, x, y) => { if (!strat) U.s('line', { x1: x(30), y1: y(simple.a + simple.b * 30), x2: x(80), y2: y(simple.a + simple.b * 80), stroke: C.ink, 'stroke-width': 2.5 }, sv); else LAY.forEach(l => { const xs = l.q.map(p => p.age), lo = S.min(xs), hi = S.max(xs); U.s('line', { x1: x(lo), y1: y(l.L.a + l.L.b * lo), x2: x(hi), y2: y(l.L.a + l.L.b * hi), stroke: l.c, 'stroke-width': 2.5 }, sv); }); }] });
      out.append(h('div', { class: 'row', style: { marginBottom: '6px' } }, check('依疾病嚴重度分三層', () => strat, v => strat = v, draw)),
        h('div', { class: 'grid2', style: { alignItems: 'center' } }, cap(ch, 500), h('div', null, h('div', { class: 'kpi' }, h('div', null, h('div', { class: 'k' }, '簡單迴歸 年齡係數'), h('div', { class: 'v' }, simple.b.toFixed(3))), h('div', null, h('div', { class: 'k' }, '多元迴歸（＋嚴重度）年齡淨係數'), h('div', { class: 'v good' }, mult[1].toFixed(3)))),
          strat ? h('div', { style: { fontSize: '13.5px', margin: '6px 0' } }, LAY.map(l => h('div', null, h('span', { class: 'legend' }, h('span', null, h('i', { style: { background: l.c } }), `${l.n}：年齡斜率 ${l.L.b >= 0 ? '+' : ''}${l.L.b.toFixed(3)}`))))) : '',
          h('div', { class: 'note', style: { fontSize: '14px' } }, '簡單迴歸的年齡係數包含「年齡帶動嚴重度、嚴重度拉長住院」這條間接路徑。分層後三條線都變平；把嚴重度完整放進模型，年齡的淨效果只剩一小截——多出來的那一截，是嚴重度借給年齡的。')))); }
    $('#w-net').append(out); draw();
  })();

  // ================= P06 共線性 =================
  (function () {
    const n = 60, r0 = rng(77), z = [], e = [], ny = []; for (let i = 0; i < n; i++) { z.push(randn(r0)); e.push(randn(r0)); ny.push(randn(r0)); }
    const BS = []; const rb = rng(99); for (let k = 0; k < 40; k++) BS.push(Array.from({ length: n }, () => Math.floor(rb() * n)));
    let rho = .95; const out = h('div');
    function draw() { out.innerHTML = '';
      const hgt = z, wgt = z.map((v, i) => rho * v + Math.sqrt(1 - rho * rho) * e[i]), y = z.map((v, i) => .4 * hgt[i] + .5 * wgt[i] + 1.5 * ny[i]);
      const coefs = BS.map(idx => { const b = ML.ols(idx.map(i => [hgt[i], wgt[i]]), idx.map(i => y[i])); return [b[1], b[2]]; });
      const full = ML.ols(hgt.map((v, i) => [v, wgt[i]]), y), pred = hgt.map((v, i) => full[0] + full[1] * v + full[2] * wgt[i]), my = S.mean(y), r2 = 1 - S.sum(y.map((v, i) => (v - pred[i]) ** 2)) / S.sum(y.map(v => (v - my) ** 2));
      const sdH = S.sd(coefs.map(c => c[0])), sdW = S.sd(coefs.map(c => c[1])), flips = coefs.filter(c => c[0] < 0 || c[1] < 0).length;
      const ch = h('div'); U.scatter(ch, coefs.map(c => ({ x: c[0], y: c[1], c: (c[0] < 0 || c[1] < 0) ? C.bad : C.accent, r: 4 })), { w: 380, h: 300, xmin: -2.5, xmax: 3, ymin: -2.5, ymax: 3, xlabel: '身高係數', ylabel: '體重係數', under: [(sv, x, y) => { U.s('line', { x1: x(0), x2: x(0), y1: y(-2.5), y2: y(3), stroke: C.bad, 'stroke-dasharray': '3 3' }, sv); U.s('line', { x1: x(-2.5), x2: x(3), y1: y(0), y2: y(0), stroke: C.bad, 'stroke-dasharray': '3 3' }, sv); U.s('circle', { cx: x(.4), cy: y(.5), r: 7, fill: 'none', stroke: C.ink, 'stroke-width': 2 }, sv); }] });
      const vif = 1 / (1 - rho * rho);
      out.append(h('div', { class: 'row', style: { marginBottom: '6px' } }, slider('身高與體重的相關 r', 0, .99, .01, () => rho, v => rho = v, draw, v => (+v).toFixed(2))),
        h('div', { class: 'grid2', style: { alignItems: 'center' } }, cap(ch, 400), h('div', null, h('div', { class: 'kpi' }, h('div', null, h('div', { class: 'k' }, 'VIF ≈ 1/(1−r²)'), h('div', { class: 'v ' + (vif > 10 ? 'bad' : vif > 5 ? '' : 'good') }, fmt(vif, 1))), h('div', null, h('div', { class: 'k' }, '係數標準差（身高／體重）'), h('div', { class: 'v' }, `${sdH.toFixed(2)} / ${sdW.toFixed(2)}`)), h('div', null, h('div', { class: 'k' }, 'R²（全樣本）'), h('div', { class: 'v' }, r2.toFixed(2)))),
          h('div', { class: 'note ' + (vif > 10 ? 'bad' : ''), style: { fontSize: '14px' } }, `重抽 40 次，有 ${flips} 次至少一個係數翻成負的（紅點）。黑圈是真實係數 (0.4, 0.5)。${vif > 10 ? '資訊高度重疊：係數不穩、正負翻轉，無法回答「哪個比較重要」——但 R² 幾乎沒變。受害的是解釋，不是預測。' : '相關不高時，係數穩定地聚在真實值附近。'}`),
          h('p', { class: 'ai' }, '處理三選一：刪一個、合成新變數（如 BMI）、或改用 Ridge。目的只是預測可以容忍；要解釋因素影響就必須處理。')))); }
    $('#w-coll').append(out); draw();
  })();

  // ================= P07 指標 =================
  (function () {
    const Y = [3, 4, 6, 7, 9], A = [3.5, 4.5, 5.5, 7.5, 8.5]; let bLast = 6.5; const out = h('div');
    const M = p => { const e = Y.map((v, i) => v - p[i]); return { mae: S.mean(e.map(Math.abs)), mse: S.mean(e.map(v => v * v)), rmse: Math.sqrt(S.mean(e.map(v => v * v))), max: S.max(e.map(Math.abs)), mape: S.mean(e.map((v, i) => Math.abs(v / Y[i]))) * 100 }; };
    function draw() { out.innerHTML = ''; const B = [3, 4, 6, 7, bLast], base = Y.map(() => S.mean(Y));
      const ma = M(A), mb = M(B), m0 = M(base);
      const t = h('table', { class: 'dt' }, h('tr', null, ['實際', '模型 A', 'A 誤差', '模型 B', 'B 誤差'].map(c => h('th', null, c))), Y.map((v, i) => h('tr', null, h('td', { class: 'num' }, v), h('td', { class: 'num' }, A[i]), h('td', { class: 'num' }, fmt(v - A[i], 1)), h('td', { class: 'num' + (i === 4 ? ' hl' : '') }, B[i]), h('td', { class: 'num' + (i === 4 ? ' hl' : '') }, fmt(v - B[i], 1)))));
      const row = (n, k, d = 2) => { const a = ma[k], b = mb[k], w = Math.abs(a - b) < 1e-9 ? '平手' : a < b ? 'A' : 'B'; return h('tr', null, h('td', null, n), h('td', { class: 'num' }, fmt(a, d)), h('td', { class: 'num' }, fmt(b, d)), h('td', { class: 'num' }, fmt(m0[k], d)), h('td', { class: w === '平手' ? '' : 'ok' }, w)); };
      const t2 = h('table', { class: 'dt' }, h('tr', null, ['指標', '模型 A', '模型 B', '基準（猜平均）', '誰好'].map(c => h('th', null, c))), row('MAE', 'mae'), row('MSE', 'mse'), row('RMSE', 'rmse'), row('最大誤差', 'max', 1), row('MAPE %', 'mape', 1));
      out.append(h('div', { class: 'row', style: { marginBottom: '8px' } }, slider('模型 B 最後一筆的預測', 3, 9, .5, () => bLast, v => bLast = v, draw)), h('div', { class: 'grid2' }, h('div', { class: 'tscroll' }, t), h('div', { class: 'tscroll' }, t2)),
        h('div', { class: 'note', style: { fontSize: '14px' } }, `模型 A 每筆都差 0.5；模型 B 四筆全對、一筆差 ${(9 - bLast).toFixed(1)}。${Math.abs(ma.mae - mb.mae) < 1e-9 ? 'MAE 完全一樣，' : ''}RMSE 用平方放大了那一筆大誤差。兩者差距大＝有少數大誤差，要回查個案。你的場域怕不怕「單次大誤差」，決定該看哪個。`),
        h('p', { class: 'ai' }, 'MAE：好解釋（平均差幾天）；RMSE：大誤差代價不成比例時，醫療常用；MAPE：跨尺度比較，但 y 接近 0 會爆炸。'));
    }
    $('#w-metric').append(out); draw();
  })();
  quiz('#q07', { q: '你的模型 RMSE = 2.3 天。下一步最該做什麼？', opts: ['直接寫進報告', '跟「一律預測平均值」的基準模型比較', '換成 MAE 讓數字更小', '把 RMSE 平方'], a: 1, ex: '沒有比較對象的 RMSE 沒有意義。作業要求：MAE 用中位數基準、RMSE 用平均值基準。' });
})();
