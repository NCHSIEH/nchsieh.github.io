/* M2-1 加強版（2026-11）：用一份 500 位病人的住院天數資料集，把迴歸做成可以動手調的實驗 */
(function () {
  'use strict';
  const { h, $, S, fmt, seg, C } = U;

  /* ---------- 教學用模擬資料：500 位住院病人（數值為教學設計，非真實病人） ---------- */
  const R = U.rng(2027);
  const N = 500;
  const DEPTS = ['內科', '外科', '骨科'];
  const P = [];
  for (let i = 0; i < N; i++) {
    const age = Math.round(Math.min(95, Math.max(30, 68 + 12 * U.randn(R))));
    const sev = Math.round(Math.min(10, Math.max(1, 4 + (age - 68) / 18 + 1.9 * U.randn(R))));
    const comorb = Math.min(6, Math.max(0, Math.round(0.6 + (age - 50) / 22 + 0.9 * U.randn(R))));
    const dept = R() < .5 ? 0 : R() < .55 ? 1 : 2;
    const surg = R() < (dept === 0 ? .12 : .7) ? 1 : 0;
    const alb = +(Math.min(5, Math.max(2, 3.95 - 0.07 * sev + 0.38 * U.randn(R)))).toFixed(1);
    const alone = R() < .2 ? 1 : 0;
    const sbp = Math.round(132 + 16 * U.randn(R));            // 與天數無關的欄位
    const ln = 0.55 + 0.011 * age + 0.10 * sev + 0.07 * comorb + 0.22 * surg - 0.30 * (alb - 3.8) + 0.14 * alone + (dept === 2 ? .18 : 0) + 0.33 * U.randn(R);
    const los = Math.max(1, Math.round(Math.exp(ln) * 10) / 10);
    P.push({ id: 'H' + String(i + 1).padStart(3, '0'), age, sev, comorb, dept, surg, alb, alone, sbp, los });
  }
  const FEATS = [
    ['age', '年齡', p => p.age, '歲'], ['sev', '疾病嚴重度', p => p.sev, '分'], ['comorb', '共病數', p => p.comorb, '項'],
    ['surg', '有手術', p => p.surg, ''], ['alb', '白蛋白', p => p.alb, 'g/dL'], ['alone', '獨居', p => p.alone, ''],
    ['surgd', '科別：外科', p => +(p.dept === 1), ''], ['orth', '科別：骨科', p => +(p.dept === 2), ''], ['sbp', '收縮壓', p => p.sbp, 'mmHg']];
  const idx = P.map((_, i) => i).sort(() => 0).filter(() => true);
  const rs = U.rng(7); const order = idx.map(i => [rs(), i]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  const TR = order.slice(0, 350).map(i => P[i]), TE = order.slice(350).map(i => P[i]);

  /* OLS + 標準誤 */
  function fit(feats, logY) {
    const fx = feats.map(k => FEATS.find(f => f[0] === k));
    const X = TR.map(p => fx.map(f => f[2](p))), y = TR.map(p => logY ? Math.log(p.los) : p.los);
    const b = ML.ols(X, y, 0);
    const pr = x => ML.predict(b, x);
    const res = X.map((x, i) => y[i] - pr(x)), n = X.length, k = fx.length;
    const s2 = S.sum(res.map(e => e * e)) / Math.max(1, n - k - 1);
    // (X'X)^-1 的對角線：逐欄解線性方程
    const Z = X.map(r => [1, ...r]), p = k + 1;
    const A = Array.from({ length: p }, () => new Array(p).fill(0)); Z.forEach(r => { for (let i = 0; i < p; i++) for (let j = 0; j < p; j++) A[i][j] += r[i] * r[j]; });
    const se = []; for (let j = 0; j < p; j++) { const e = new Array(p).fill(0); e[j] = 1; const col = ML.solve(A.map(r => r.slice()), e); se.push(Math.sqrt(Math.max(0, col[j] * s2))); }
    const back = v => logY ? Math.exp(v) * Math.exp(s2 / 2) : v; // 對數模型還原時做平滑校正
    const predTE = TE.map(p0 => back(pr(fx.map(f => f[2](p0)))));
    const predTR = TR.map(p0 => back(pr(fx.map(f => f[2](p0)))));
    const err = TE.map((p0, i) => p0.los - predTE[i]);
    const ybar = S.mean(y), r2 = 1 - S.sum(res.map(e => e * e)) / S.sum(y.map(v => (v - ybar) ** 2));
    return { b, se, fx, predTE, predTR, err, r2, rmse: Math.sqrt(S.mean(err.map(e => e * e))), mae: S.mean(err.map(Math.abs)), logY };
  }
  const BASE = (() => { const m = S.mean(TR.map(p => p.los)); const e = TE.map(p => p.los - m); return { rmse: Math.sqrt(S.mean(e.map(v => v * v))), mae: S.mean(e.map(Math.abs)), m }; })();
  const kpi = (k, v, cls) => h('div', null, h('div', { class: 'k' }, k), h('div', { class: 'v' + (cls ? ' ' + cls : '') }, v));

  /* ====================================================================
     ① 第 3 節：拖動直線，找最小殘差平方和（＋梯度下降動畫）
     ==================================================================== */
  (function sse() {
    const box = $('#w-sse'); if (!box) return;
    const D = P.slice(0, 40).map(p => ({ x: p.age, y: Math.min(16, p.los) }));
    const xm = S.mean(D.map(d => d.x)), ym = S.mean(D.map(d => d.y));
    const bOpt = S.sum(D.map(d => (d.x - xm) * (d.y - ym))) / S.sum(D.map(d => (d.x - xm) ** 2)), aOpt = ym - bOpt * xm;
    const SSE = (a, b) => S.sum(D.map(d => (d.y - a - b * d.x) ** 2)), SST = S.sum(D.map(d => (d.y - ym) ** 2));
    // 以「年齡 70 歲時的預測值」與斜率當兩個旋鈕，比直接調截距直觀
    let b = 0, c70 = ym, timer = null, trail = [];
    const out = h('div');
    function draw() {
      out.innerHTML = '';
      const a = c70 - b * 70, sse = SSE(a, b), best = SSE(aOpt, bOpt);
      const ctl = h('div', { class: 'row', style: { gap: '16px', flexWrap: 'wrap', marginBottom: '8px' } },
        U.slider('斜率（每多 1 歲多幾天）', -0.1, 0.3, 0.005, () => b, v => { b = v; trail = []; }, draw, v => (+v).toFixed(3)),
        U.slider('70 歲時的預測天數', 2, 12, 0.05, () => c70, v => { c70 = v; trail = []; }, draw, v => (+v).toFixed(2)));
      const go = h('button', { class: 'btn primary' }, timer ? '下山中…' : '▶ 讓電腦自己下山（梯度下降）'); go.disabled = !!timer;
      go.onclick = () => { trail = [[b, c70]]; let k = 0; timer = setInterval(() => {
        // 對 (b, c70) 做梯度下降（中心化參數，收斂快）
        const a0 = c70 - b * 70; let gb = 0, gc = 0; D.forEach(d => { const e = (a0 + b * d.x) - d.y; gc += 2 * e; gb += 2 * e * (d.x - 70); });
        c70 -= 0.012 * gc / D.length * 2; b -= 0.00004 * gb / D.length * 10; trail.push([b, c70]); k++;
        if (k > 60 || Math.abs(SSE(c70 - b * 70, b) - best) < 0.05) { clearInterval(timer); timer = null; }
        draw(); }, 70); draw(); };
      const snap = h('button', { class: 'btn' }, '直接用公式算'); snap.onclick = () => { b = bOpt; c70 = aOpt + bOpt * 70; trail = []; draw(); };
      const reset = h('button', { class: 'btn sm' }, '重設成水平線'); reset.onclick = () => { b = 0; c70 = ym; trail = []; draw(); };
      out.append(ctl, h('div', { class: 'row', style: { gap: '8px', marginBottom: '10px' } }, go, snap, reset));
      const wrap = h('div', { class: 'grid2', style: { gap: '18px', alignItems: 'start' } });
      const plot = h('div');
      U.scatter(plot, D.map(d => ({ x: d.x, y: d.y, c: C.ink, r: 3.6, op: .8 })), { xmin: 30, xmax: 95, ymin: 0, ymax: 16, w: 470, h: 330, xlabel: '年齡（歲）', ylabel: '住院天數',
        under: [(sv, x, y) => { D.forEach(d => { const yh = a + b * d.x, e = d.y - yh; U.s('line', { x1: x(d.x), x2: x(d.x), y1: y(d.y), y2: y(yh), stroke: e > 0 ? C.bad : C.blue, 'stroke-width': 1.6, 'stroke-opacity': .7 }, sv); }); }],
        over: [(sv, x, y) => { U.s('line', { x1: x(30), x2: x(95), y1: y(a + b * 30), y2: y(a + b * 95), stroke: C.accent, 'stroke-width': 2.6 }, sv); }] });
      const side = h('div');
      const pct = sse / SST;
      side.append(h('div', { class: 'kpi', style: { marginBottom: '10px' } }, kpi('目前的殘差平方和 SSE', fmt(sse, 1), sse - best < 0.5 ? 'good' : 'bad'), kpi('最小可能的 SSE', fmt(best, 1)), kpi('R²', fmt(1 - pct, 3))));
      // SSE 量表
      const bar = h('div', { style: { height: '22px', background: '#efece5', borderRadius: '6px', position: 'relative', overflow: 'hidden', margin: '4px 0 4px' } },
        h('i', { style: { position: 'absolute', left: 0, top: 0, bottom: 0, width: Math.min(100, sse / (SST * 1.6) * 100) + '%', background: sse - best < 0.5 ? C.good : C.amber, transition: 'width .15s' } }),
        h('i', { style: { position: 'absolute', left: (best / (SST * 1.6) * 100) + '%', top: 0, bottom: 0, width: '2px', background: C.ink } }));
      side.append(h('div', { style: { fontSize: '13px', color: 'var(--muted)' } }, 'SSE 量表（黑線＝最小值；水平線的 SSE 就是 SS_tot）'), bar);
      side.append(h('div', { style: { fontSize: '13px', color: 'var(--muted)', margin: '10px 0 4px' } }, `目前的直線：ŷ = ${fmt(a, 2)} ＋ ${fmt(b, 3)} × 年齡`));
      if (trail.length > 1) side.append(h('div', { style: { fontSize: '13px', color: 'var(--muted)' } }, `梯度下降第 ${trail.length - 1} 步：每一步都往「SSE 下降最快」的方向走一點。`));
      const msg = sse - best < 0.5 ? '到底了！這就是最小平方法的答案——再怎麼轉、怎麼移，SSE 都不會更小。紅線（低估）和藍線（高估）的長度平方加總，正負不會互相抵消。'
        : b === 0 ? '水平線＝「一律猜平均」。這時的 SSE 就是 SS_tot，R² = 0。試著把斜率往右拉。'
        : '紅色＝實際比預測多（低估），藍色＝實際比預測少（高估）。調整兩個旋鈕，讓量表縮到黑線。';
      side.append(h('div', { class: 'note', style: { marginTop: '12px' } }, msg));
      wrap.append(plot, side); out.append(wrap);
    }
    box.append(out); draw();
  })();

  /* ====================================================================
     ② 第 6 節：多元迴歸實驗台（500 位病人）
     ==================================================================== */
  let LAST = null;
  (function lab() {
    const box = $('#w-lab21'); if (!box) return;
    let on = new Set(['age']), logY = false, timer = null, path = [];
    const out = h('div');
    function draw() {
      out.innerHTML = '';
      const feats = FEATS.map(f => f[0]).filter(k => on.has(k));
      const m = feats.length ? fit(feats, logY) : null; LAST = m;
      // 欄位開關
      const chips = h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' } });
      FEATS.forEach(([k, name]) => { const b = h('button', { class: 'btn sm' + (on.has(k) ? ' on' : '') }, (on.has(k) ? '✓ ' : '＋ ') + name); b.onclick = () => { on.has(k) ? on.delete(k) : on.add(k); path = []; draw(); }; chips.append(b); });
      const fwd = h('button', { class: 'btn primary sm' }, timer ? '逐步加入中…' : '▶ 逐步加入：每次加最有幫助的一個'); fwd.disabled = !!timer;
      fwd.onclick = () => { on = new Set(); path = [{ n: 0, rmse: BASE.rmse, add: '（只猜平均）' }]; draw();
        timer = setInterval(() => { const rest = FEATS.map(f => f[0]).filter(k => !on.has(k)); if (!rest.length) { clearInterval(timer); timer = null; draw(); return; }
          let best = null; rest.forEach(k => { const r = fit([...on, k], logY).rmse; if (!best || r < best.r) best = { k, r }; });
          on.add(best.k); path.push({ n: on.size, rmse: best.r, add: FEATS.find(f => f[0] === best.k)[1] }); if (!rest.length || on.size === FEATS.length) { clearInterval(timer); timer = null; } draw(); }, 650); };
      const clr = h('button', { class: 'btn sm' }, '全部取消'); clr.onclick = () => { on = new Set(); path = []; draw(); };
      out.append(h('div', { class: 'row', style: { gap: '8px', flexWrap: 'wrap', marginBottom: '6px' } }, h('span', { style: { fontSize: '14px', color: 'var(--muted)' } }, '放進模型的欄位：'), fwd, clr,
        U.check('目標取對數 ln(天數)', () => logY, v => { logY = v; path = []; }, draw)), chips);
      if (!m) { out.append(h('div', { class: 'note warn' }, '還沒有任何欄位——模型只能「一律猜平均」。測試集 RMSE = ' + fmt(BASE.rmse, 2) + ' 天，這就是要打敗的基準線。')); return; }
      out.append(h('div', { class: 'kpi', style: { marginBottom: '12px' } },
        kpi('訓練 R²', fmt(m.r2, 3)), kpi('測試 RMSE', fmt(m.rmse, 2) + ' 天', m.rmse < BASE.rmse ? 'good' : 'bad'), kpi('測試 MAE', fmt(m.mae, 2) + ' 天'),
        kpi('基準線 RMSE（猜平均）', fmt(BASE.rmse, 2) + ' 天'), kpi('比基準線改善', Math.round((1 - m.rmse / BASE.rmse) * 100) + '%', m.rmse < BASE.rmse ? 'good' : 'bad')));
      const g = h('div', { class: 'grid2', style: { gap: '18px', alignItems: 'start' } });
      // 係數與 95% CI
      const coef = h('div');
      coef.append(h('div', { style: { fontSize: '13px', color: 'var(--muted)', marginBottom: '6px' } }, logY ? '係數（換算成「天數變化 %」，橫線＝95% 信賴區間）' : '係數（每增加 1 單位，天數變化幾天；橫線＝95% 信賴區間）'));
      const rows = m.fx.map((f, j) => { const b = m.b[j + 1], se = m.se[j + 1]; const tr = v => logY ? (Math.exp(v) - 1) * 100 : v; return { name: f[1], unit: f[3], b: tr(b), lo: tr(b - 1.96 * se), hi: tr(b + 1.96 * se), sig: Math.abs(b) > 1.96 * se }; });
      const lim = Math.max(...rows.map(r => Math.max(Math.abs(r.lo), Math.abs(r.hi))), 0.01);
      const W = 470, rh = 30, lw = 110, Hh = rows.length * rh + 30, sv = U.svgBox(coef, W, Hh), x = U.scale(-lim, lim, lw, W - 70);
      U.s('line', { x1: x(0), x2: x(0), y1: 4, y2: Hh - 22, stroke: C.ink, 'stroke-dasharray': '3 3' }, sv);
      rows.forEach((r, i) => { const y = 14 + i * rh; const col = r.sig ? (r.b > 0 ? C.bad : C.blue) : C.gray;
        U.s('text', { x: lw - 8, y: y + 4, 'text-anchor': 'end', text: r.name, style: 'font-size:12.5px;fill:#1c2430' }, sv);
        U.s('line', { x1: x(r.lo), x2: x(r.hi), y1: y, y2: y, stroke: col, 'stroke-width': 2.4 }, sv);
        U.s('circle', { cx: x(r.b), cy: y, r: 5, fill: col }, sv);
        U.s('text', { x: W - 66, y: y + 4, text: (r.b > 0 ? '+' : '') + fmt(r.b, logY ? 1 : 2) + (logY ? '%' : ''), style: `font-size:12px;font-family:var(--mono);fill:${col}` }, sv); });
      U.s('text', { x: x(0), y: Hh - 6, 'text-anchor': 'middle', text: '0（沒有效果）', style: 'font-size:11px;fill:#8a929c' }, sv);
      coef.append(h('div', { class: 'ai' }, '紅＝顯著延長、藍＝顯著縮短、灰＝區間跨過 0（資料無法確定它有沒有效果）。'));
      // 預測 vs 實際
      const pv = h('div'); pv.append(h('div', { style: { fontSize: '13px', color: 'var(--muted)', marginBottom: '6px' } }, '測試集 150 人：預測 vs 實際（越貼近對角線越好）'));
      U.scatter(pv, TE.map((p, i) => ({ x: m.predTE[i], y: p.los, c: Math.abs(m.err[i]) > 2 * m.mae ? C.bad : C.accent, r: 3.4, op: .7, title: `${p.id}：實際 ${p.los} 天，預測 ${fmt(m.predTE[i], 1)} 天` })),
        { xmin: 0, xmax: 22, ymin: 0, ymax: 22, w: 440, h: 300, xlabel: '預測天數', ylabel: '實際天數', under: [(sv2, x2, y2) => U.s('line', { x1: x2(0), y1: y2(0), x2: x2(22), y2: y2(22), stroke: C.gray, 'stroke-dasharray': '4 3' }, sv2)] });
      g.append(coef, pv); out.append(g);
      // 逐步加入的路徑
      if (path.length > 1) {
        const lcb = h('div', { style: { marginTop: '10px' } }); lcb.append(h('div', { style: { fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' } }, '逐步加入欄位時，測試 RMSE 的變化'));
        U.lc(lcb, [{ pts: path.map(q => [q.n, q.rmse]), color: C.accent, w: 2.4 }], { w: 900, h: 200, xmin: 0, xmax: FEATS.length, ymin: Math.min(...path.map(q => q.rmse)) * .95, ymax: BASE.rmse * 1.02, xt: path.map(q => q.n), xfmt: t => { const q = path.find(z => z.n === t); return q ? (t ? '+' + q.add : '只猜平均') : ''; }, yl: 'RMSE（天）' });
        out.append(lcb);
      }
      // 自動回饋
      const tips = [];
      if (on.has('sbp')) tips.push('收縮壓的區間跨過 0：它跟住院天數其實無關。放進去 R² 幾乎不變、測試 RMSE 甚至可能變差——這就是「欄位不是越多越好」。');
      if (!on.has('sev')) tips.push('疾病嚴重度還沒放進來——它是最強的預測因子，試試加入，看 RMSE 掉多少。');
      if (on.has('age') && on.has('sev')) tips.push('加入疾病嚴重度後，年齡的係數變小了：一部分「年紀大住比較久」，其實是因為年紀大的人病得比較重（第 6 節上面那張圖講的就是這件事）。');
      if (!logY && on.size >= 3) tips.push('住院天數右偏：試試勾選「目標取對數」，係數會變成「天數變化 %」，通常更好解讀，大誤差也會少一點。');
      if (logY) tips.push('取對數後，係數要讀成百分比：例如白蛋白每高 1 g/dL，天數約少幾 %。預測時已自動還原成天數。');
      out.append(h('div', { class: 'note' }, h('b', null, '看懂了什麼：'), tips[0] || '試著逐一加入欄位，看哪些讓測試 RMSE 明顯下降、哪些只是讓模型變複雜。'));
      if (tips.length > 1) out.append(h('div', { class: 'ai' }, '另外：' + tips.slice(1).join('　')));
      const ev = new Event('lab21'); document.dispatchEvent(ev);
    }
    box.append(out); draw();
  })();

  /* ====================================================================
     ③ 第 7 節：大誤差落在誰身上？
     ==================================================================== */
  (function errs() {
    const box = $('#w-err21'); if (!box) return;
    let th = 3;
    const m = fit(['age', 'sev', 'comorb', 'surg', 'alb', 'alone', 'surgd', 'orth'], true);
    const out = h('div');
    function draw() {
      out.innerHTML = '';
      out.append(h('div', { class: 'row', style: { gap: '12px', marginBottom: '8px' } }, U.slider('誤差超過幾天算「大誤差」', 1, 8, 0.5, () => th, v => th = v, draw, v => v + ' 天'), h('span', { class: 'tag gray' }, '模型：8 個欄位＋取對數（測試集 150 人）')));
      const g = h('div', { class: 'grid2', style: { gap: '18px', alignItems: 'start' } });
      const hb = h('div'); hb.append(h('div', { style: { fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' } }, '誤差分布（實際 − 預測，天）'));
      U.hist(hb, [{ values: m.err.map(e => Math.max(-10, Math.min(10, e))), color: C.accent }], { min: -10, max: 10, bins: 40, w: 460, h: 230, xlabel: '誤差（天）；右邊＝低估、左邊＝高估',
        marks: [{ x: th, color: C.bad, label: '+' + th }, { x: -th, color: C.bad, label: '−' + th }] });
      const big = TE.map((p, i) => ({ p, e: m.err[i], pr: m.predTE[i] })).filter(z => Math.abs(z.e) > th).sort((a, b) => Math.abs(b.e) - Math.abs(a.e));
      const rest = TE.filter((p, i) => Math.abs(m.err[i]) <= th);
      const share = (arr, f) => arr.length ? Math.round(S.mean(arr.map(f)) * 100) : 0;
      const side = h('div');
      side.append(h('div', { class: 'kpi', style: { marginBottom: '10px' } }, kpi('MAE', fmt(m.mae, 2) + ' 天'), kpi('RMSE', fmt(m.rmse, 2) + ' 天'), kpi('大誤差人數', big.length + ' / 150', 'bad')));
      side.append(h('div', { style: { fontSize: '13px', color: 'var(--muted)', margin: '4px 0' } }, '大誤差組 vs 其他人：有什麼不一樣？'));
      const cmp = [['有手術 %', z => z.surg], ['獨居 %', z => z.alone], ['嚴重度 ≥ 7 %', z => +(z.sev >= 7)], ['實際 ≥ 14 天 %', z => +(z.los >= 14)]];
      const tb = h('table', { class: 'dt', style: { fontSize: '13px' } }, h('tr', null, h('th', null, ''), h('th', null, `大誤差（${big.length}）`), h('th', null, `其他（${rest.length}）`)));
      cmp.forEach(([n, f]) => { const a = share(big.map(z => z.p), f), b = share(rest, f); tb.append(h('tr', null, h('td', null, n), h('td', { class: a > b * 1.5 && a - b > 8 ? 'hl' : null, style: { fontFamily: 'var(--mono)' } }, a + '%'), h('td', { style: { fontFamily: 'var(--mono)' } }, b + '%'))); });
      side.append(tb);
      g.append(hb, side); out.append(g);
      const list = h('table', { class: 'dt', style: { fontSize: '13px', marginTop: '12px' } }, h('tr', null, ['病人', '年齡', '嚴重度', '共病', '手術', '白蛋白', '實際', '預測', '誤差'].map(t => h('th', null, t))));
      big.slice(0, 6).forEach(z => list.append(h('tr', null, h('td', null, z.p.id), h('td', null, z.p.age), h('td', null, z.p.sev), h('td', null, z.p.comorb), h('td', null, z.p.surg ? '有' : '—'), h('td', null, z.p.alb), h('td', null, z.p.los), h('td', null, fmt(z.pr, 1)), h('td', { class: 'miss' }, (z.e > 0 ? '+' : '') + fmt(z.e, 1)))));
      out.append(h('div', { style: { fontSize: '13px', color: 'var(--muted)', marginTop: '12px' } }, `誤差最大的 ${Math.min(6, big.length)} 位（回查個案從這裡開始）`), h('div', { class: 'tscroll' }, list));
      const under = big.length ? Math.round(big.filter(z => z.e > 0).length / big.length * 100) : 0;
      out.append(h('div', { class: 'note' }, h('b', null, '看懂了什麼：'), big.length ? `大誤差的 ${big.length} 人中，${under}% 是「實際住得比預測久」——右偏的長尾個案${share(big.map(z => z.p), z => z.surg) > share(rest, z => z.surg) + 10 ? '；而且有手術的人在這組特別多，代表模型對「手術後的變化」掌握不夠' : ''}。MAE ${fmt(m.mae, 1)} 天看起來不錯，RMSE ${fmt(m.rmse, 1)} 天卻被這些人拉高。回查時要問：是資料錯了，還是有模型沒看到的原因（併發症、等床）？` : '門檻拉得太高，沒有人超過——試著往左拉。'));
    }
    box.append(out); draw();
  })();
})();
