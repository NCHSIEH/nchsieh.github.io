/* M0 加強版（2026-11）：腎結石 700 位病人的辛普森悖論（真實資料）、雜訊也能考高分的資料洩漏實驗、真實 Auto MPG 392 輛車 */
(function () {
  'use strict';
  const { h, $, S, fmt, seg, check, C } = U;
  const kpi = (k, v, cls) => h('div', null, h('div', { class: 'k' }, k), h('div', { class: 'v' + (cls ? ' ' + cls : '') }, v));
  const sub = t => h('div', { style: { fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' } }, t);
  const lab = t => h('span', { style: { fontSize: '13px', color: 'var(--muted)' } }, t);
  const note = (msg, cls) => h('div', { class: 'note' + (cls ? ' ' + cls : ''), style: { marginTop: '10px' } }, h('b', null, '看懂了什麼：'), msg);
  const pc = v => (v * 100).toFixed(0) + '%';

  /* ====================================================================
     ① 第 05 節：腎結石兩種療法，700 位病人的辛普森悖論（Charig et al., BMJ 1986）
     ==================================================================== */
  (function simpson() {
    const box = $('#w-simpson'); if (!box) return;
    // [組別, 療法, 成功, 總數]
    const D = { A: { small: [81, 87], large: [192, 263] }, B: { small: [234, 270], large: [55, 80] } };
    const NAME = { A: '療法 A：開放式手術', B: '療法 B：經皮腎造廔取石' };
    let strat = false;
    const out = h('div');
    function dots(succ, tot, color) { const g = h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '2px', maxWidth: '300px' } }); for (let i = 0; i < tot; i++) g.append(h('i', { style: { display: 'block', width: '7px', height: '7px', borderRadius: '50%', background: i < succ ? color : '#e3dfd6' } })); return g; }
    function draw() {
      out.innerHTML = '';
      out.append(h('div', { class: 'row', style: { gap: '10px', marginBottom: '10px' } }, lab('看法'), seg([[false, '全部合在一起'], [true, '依結石大小分開']], () => strat, v => strat = v, draw)));
      const tot = k => [D[k].small[0] + D[k].large[0], D[k].small[1] + D[k].large[1]];
      const g = h('div', { class: 'grid2', style: { gap: '18px', alignItems: 'start' } });
      ['A', 'B'].forEach(k => {
        const col = k === 'A' ? C.accent : C.blue, c = h('div', { style: { border: '1px solid var(--line)', borderRadius: '8px', padding: '10px 12px' } }, h('div', { style: { fontWeight: 700, marginBottom: '6px' } }, NAME[k]));
        if (!strat) { const [s0, n] = tot(k); c.append(h('div', { style: { fontSize: '13px', marginBottom: '4px' } }, `${n} 人，成功 ${s0} 人`), dots(s0, n, col), h('div', { style: { fontSize: '26px', fontWeight: 700, fontFamily: 'var(--mono)', marginTop: '6px', color: col } }, pc(s0 / n))); }
        else ['small', 'large'].forEach(z => { const [s0, n] = D[k][z]; c.append(h('div', { style: { fontSize: '13px', margin: '6px 0 3px' } }, `${z === 'small' ? '小結石（< 2 公分）' : '大結石（≥ 2 公分）'}：${n} 人，成功 ${s0} 人　`, h('b', { style: { fontFamily: 'var(--mono)', color: col, fontSize: '15px' } }, pc(s0 / n))), dots(s0, n, col)); });
        g.append(c);
      });
      out.append(g);
      const ta = tot('A'), tb = tot('B');
      out.append(h('div', { class: 'kpi', style: { marginTop: '10px' } }, kpi('整體成功率', `A ${pc(ta[0] / ta[1])}　B ${pc(tb[0] / tb[1])}`), kpi('小結石', `A ${pc(81 / 87)}　B ${pc(234 / 270)}`, 'good'), kpi('大結石', `A ${pc(192 / 263)}　B ${pc(55 / 80)}`, 'good'), kpi('大結石病人分到 A 的比例', pc(263 / 350))));
      out.append(note(strat ? '分開看：不論小結石還是大結石，療法 A 的成功率都比較高。但合起來卻是 B 贏——原因是 A 收的病人裡 75% 是比較難治的大結石（263／350），B 只有 23%（80／350）。「結石大小」同時影響「選哪個療法」和「會不會成功」，它就是干擾因子。'
        : `合在一起看，療法 B 成功率 ${pc(tb[0] / tb[1])}，比 A 的 ${pc(ta[0] / ta[1])} 高，好像該選 B？切到「依結石大小分開」再看一次。這是 1986 年發表在 BMJ 的真實資料，也是辛普森悖論最常被引用的例子。`));
    }
    box.append(out); draw();
  })();

  /* ====================================================================
     ② 第 07 節：純雜訊也能考高分——先篩特徵再交叉驗證的洩漏
     ==================================================================== */
  (function leak() {
    const box = $('#w-leakbig'); if (!box) return;
    const N = 100, FOLD = 5;
    let P = 1000, K = 10, seed = 1, res = null;
    function corrSel(X, y, idx, k) {
      const my = S.mean(idx.map(i => y[i])), sc = [];
      for (let j = 0; j < X[0].length; j++) { let mx = 0; idx.forEach(i => mx += X[i][j]); mx /= idx.length; let sxy = 0, sxx = 0; idx.forEach(i => { const dx = X[i][j] - mx; sxy += dx * (y[i] - my); sxx += dx * dx; }); sc.push([Math.abs(sxy) / Math.sqrt(sxx || 1), j]); }
      return sc.sort((a, b) => b[0] - a[0]).slice(0, k).map(z => z[1]);
    }
    function centroid(X, y, tr, te, feat) { // 最近質心分類器：簡單、沒有超參數
      const m = [0, 1].map(c => feat.map(j => S.mean(tr.filter(i => y[i] === c).map(i => X[i][j]))));
      return te.filter(i => { const d = m.map(mc => S.sum(feat.map((j, q) => (X[i][j] - mc[q]) ** 2))); return (d[1] < d[0] ? 1 : 0) === y[i]; }).length;
    }
    function once(r) {
      const X = Array.from({ length: N }, () => Array.from({ length: P }, () => U.randn(r))), y = Array.from({ length: N }, (_, i) => i % 2);
      for (let i = N - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [y[i], y[j]] = [y[j], y[i]]; }
      const all = [...Array(N).keys()], folds = all.map(i => i % FOLD);
      const bad = corrSel(X, y, all, K); let okBad = 0, okGood = 0;
      for (let f = 0; f < FOLD; f++) { const tr = all.filter(i => folds[i] !== f), te = all.filter(i => folds[i] === f); okBad += centroid(X, y, tr, te, bad); okGood += centroid(X, y, tr, te, corrSel(X, y, tr, K)); }
      return [okBad / N, okGood / N];
    }
    function run() { const r = U.rng(seed * 7919 + P + K); const reps = P >= 5000 ? 8 : 20; res = Array.from({ length: reps }, () => once(r)); }
    const out = h('div');
    function draw() {
      out.innerHTML = '';
      const go = h('button', { class: 'btn primary' }, '↻ 重抽雜訊再做一次'); go.onclick = () => { seed++; out.style.opacity = .5; setTimeout(() => { run(); out.style.opacity = 1; draw(); }, 20); };
      out.append(h('div', { class: 'row', style: { gap: '10px', flexWrap: 'wrap', marginBottom: '10px' } }, go, lab('雜訊特徵數'), seg([[100, '100'], [1000, '1,000'], [5000, '5,000']], () => P, v => { P = v; run(); }, draw), lab('篩選後留下'), seg([[5, '5 個'], [10, '10 個'], [50, '50 個']], () => K, v => { K = v; run(); }, draw)));
      const b = S.mean(res.map(z => z[0])), g0 = S.mean(res.map(z => z[1]));
      out.append(h('div', { class: 'kpi', style: { marginBottom: '10px' } }, kpi('資料', `${N} 位病人 × ${fmt(P, 0)} 個隨機數字`), kpi('標籤', '丟銅板決定（50% 是／否）'), kpi('✗ 先篩再交叉驗證', pc(b), 'bad'), kpi('✓ 每一折內才篩', pc(g0), 'good')));
      const hb = h('div'); out.append(sub(`重複 ${res.length} 次的交叉驗證準確率（紅＝先用全部資料篩特徵、綠＝在每一折的訓練資料內才篩；虛線＝瞎猜 50%）`), hb);
      U.hist(hb, [{ values: res.map(z => z[0]), color: C.bad, opacity: .75 }, { values: res.map(z => z[1]), color: C.good, opacity: .75 }], { w: 640, h: 190, bins: 24, min: .2, max: 1, xfmt: v => Math.round(v * 100) + '%', marks: [{ x: .5, color: C.ink }] });
      out.append(note(`資料完全是隨機數字，標籤是丟銅板——理論上任何模型都只能猜對 50%。可是「先用全部 ${N} 筆挑出和標籤最相關的 ${K} 個特徵，再做交叉驗證」平均考到 ${pc(b)}：挑特徵的那一步已經偷看了測試折的答案。把篩選放進每一折的訓練資料裡（正確做法），準確率就回到 ${pc(g0)}。特徵越多、樣本越少，這個假象越嚴重——基因、影像、問卷題目很多的研究最常踩到。這和上面「先補值再切分」是同一種錯：任何從資料學東西的步驟，都要在切分之後、只用訓練資料做。`, 'warn'));
    }
    run(); box.append(out); draw();
  })();

  /* ====================================================================
     ③ 第 09 節：真實的 Auto MPG——392 輛車
     ==================================================================== */
  (function mpg() {
    const box = $('#w-mpgreal'); if (!box || !window.AUTOMPG) return;
    const D = window.AUTOMPG, ORI = ['美國', '歐洲', '日本'], OC = [C.bad, C.blue, C.good];
    const VARS = [[4, '車重（磅）'], [3, '馬力'], [2, '排氣量'], [6, '年份'], [5, '0–60 加速（秒）'], [1, '汽缸數']];
    let vx = 4, logY = false, sel = null;
    const ols1 = (xs, ys) => { const mx = S.mean(xs), my = S.mean(ys); let sxy = 0, sxx = 0; xs.forEach((x, i) => { sxy += (x - mx) * (ys[i] - my); sxx += (x - mx) ** 2; }); const b = sxy / sxx, a = my - b * mx; const pred = xs.map(x => a + b * x); const sse = S.sum(ys.map((y, i) => (y - pred[i]) ** 2)), sst = S.sum(ys.map(y => (y - my) ** 2)); return { a, b, r2: 1 - sse / sst }; };
    // 多元迴歸（全部 6 個數值欄位＋產地虛擬變數），80/20 固定切分
    const multi = (() => {
      const r = U.rng(392), idx = D.map((_, i) => i); for (let i = idx.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [idx[i], idx[j]] = [idx[j], idx[i]]; }
      const ntr = Math.round(D.length * .8), tr = idx.slice(0, ntr), te = idx.slice(ntr);
      const row = d => [1, d[1], d[2], d[3], d[4], d[5], d[6], d[7] === 1 ? 1 : 0, d[7] === 2 ? 1 : 0];
      const fit = (yf) => { const X = tr.map(i => row(D[i])), y = tr.map(i => yf(D[i][0])), p = X[0].length; const A = Array.from({ length: p }, (_, a) => Array.from({ length: p }, (_, b) => S.sum(X.map(x => x[a] * x[b])))), bb = Array.from({ length: p }, (_, a) => S.sum(X.map((x, i) => x[a] * y[i]))); const w = window.ML ? ML.solve(A, bb) : null; return w; };
      const ev = (yf, inv) => { const w = fit(yf); if (!w) return null; const pr = i => inv(S.sum(row(D[i]).map((x, k) => x * w[k]))); const rmse = Math.sqrt(S.mean(te.map(i => (D[i][0] - pr(i)) ** 2))); const my = S.mean(te.map(i => D[i][0])); const r2 = 1 - S.sum(te.map(i => (D[i][0] - pr(i)) ** 2)) / S.sum(te.map(i => (D[i][0] - my) ** 2)); return { rmse, r2 }; };
      return { lin: ev(y => y, v => v), log: ev(y => Math.log(y), v => Math.exp(v)), base: Math.sqrt(S.mean(te.map(i => (D[i][0] - S.mean(tr.map(j => D[j][0]))) ** 2))) };
    })();
    const out = h('div');
    function draw() {
      out.innerHTML = '';
      out.append(h('div', { class: 'row', style: { gap: '10px', flexWrap: 'wrap', marginBottom: '10px' } }, lab('橫軸'), seg(VARS.map(([k, n]) => [k, n.replace(/（.*）/, '')]), () => vx, v => { vx = v; sel = null; }, draw), check('縱軸取 log（mpg）', () => logY, v => logY = v, draw)));
      const xs = D.map(d => d[vx]), ys = D.map(d => logY ? Math.log(d[0]) : d[0]), f = ols1(xs, ys);
      const all = VARS.map(([k, n]) => ({ n, r2: ols1(D.map(d => d[k]), D.map(d => logY ? Math.log(d[0]) : d[0])).r2 })).sort((a, b) => b.r2 - a.r2);
      out.append(h('div', { class: 'kpi', style: { marginBottom: '10px' } }, kpi('資料', '392 輛真實車款（1970–82）'), kpi(`只用${VARS.find(v => v[0] === vx)[1].replace(/（.*）/, '')}的 R²`, f.r2.toFixed(3)), kpi('全部欄位的多元迴歸（測試集 R²）', (logY ? multi.log : multi.lin).r2.toFixed(3), 'good'), kpi('測試集 RMSE', (logY ? multi.log : multi.lin).rmse.toFixed(2) + ' mpg'), kpi('瞎猜平均值的 RMSE', multi.base.toFixed(2) + ' mpg')));
      const g = h('div', { class: 'grid2', style: { gap: '18px', alignItems: 'start' } });
      const sc = h('div'); sc.append(sub('每一點是一輛車（顏色＝產地）；點一下看車名'));
      const ch = h('div'); sc.append(ch);
      const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
      U.scatter(ch, D.map((d, i) => ({ x: xs[i] + (vx === 1 ? (i % 7 - 3) * .06 : 0), y: ys[i], c: OC[d[7]], r: sel === i ? 7 : 3, op: sel === i ? 1 : .55, stroke: sel === i ? '#1c2430' : null, title: `${d[8]}（19${d[6]}，${ORI[d[7]]}）：${d[0]} mpg`, onclick: () => { sel = i; draw(); } })), {
        w: 460, h: 320, xmin: x0, xmax: x1, ymin: y0, ymax: y1, xlabel: VARS.find(v => v[0] === vx)[1], ylabel: logY ? 'log(mpg)' : '每加侖英里 mpg', yfmt: logY ? (v => (+v).toFixed(1)) : null,
        over: [(sv, x, y) => U.s('line', { x1: x(x0), x2: x(x1), y1: y(f.a + f.b * x0), y2: y(f.a + f.b * x1), stroke: '#1c2430', 'stroke-width': 2 }, sv)]
      });
      sc.append(h('div', { style: { display: 'flex', gap: '12px', fontSize: '12px', marginTop: '4px' } }, ...ORI.map((o, i) => h('span', null, h('i', { style: { display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: OC[i], marginRight: '4px' } }), `${o}（${D.filter(d => d[7] === i).length}）`))));
      const rt = h('div');
      if (sel != null) { const d = D[sel], pr = f.a + f.b * xs[sel], prv = logY ? Math.exp(pr) : pr; rt.append(h('div', { style: { border: '1px solid var(--line)', borderRadius: '8px', padding: '8px 10px', marginBottom: '10px', fontSize: '13.5px' } }, h('b', null, d[8]), `（19${d[6]}，${ORI[d[7]]}）`, h('div', null, `${d[1]} 缸・${d[3]} 匹馬力・${fmt(d[4], 0)} 磅`), h('div', null, `實際 ${d[0]} mpg，這條線預測 ${prv.toFixed(1)} mpg，誤差 ${(d[0] - prv >= 0 ? '+' : '') + (d[0] - prv).toFixed(1)}`))); }
      rt.append(sub('單一欄位能解釋多少（R²）'));
      const hb = h('div'); rt.append(hb);
      U.hbars(hb, all.map(z => ({ label: z.n.replace(/（.*）/, ''), value: z.r2, color: z.n === VARS.find(v => v[0] === vx)[1] ? C.accent : C.gray })), { w: 400, lw: 80, fmt: v => v.toFixed(2), max: 1 });
      g.append(sc, rt); out.append(g);
      const yr = ols1(D.map(d => d[6]), D.map(d => d[0]));
      let msg = `這是真實資料，不是模擬的。車重單獨就能解釋 ${pc(all.find(z => z.n.startsWith('車重')).r2)} 的油耗差異；把 6 個欄位加上產地一起放進多元迴歸，測試集 R² 到 ${(logY ? multi.log : multi.lin).r2.toFixed(2)}，RMSE 從瞎猜的 ${multi.base.toFixed(1)} 降到 ${(logY ? multi.log : multi.lin).rmse.toFixed(1)} mpg。`;
      if (vx === 6) msg = `年份越新越省油：每晚一年平均多 ${yr.b.toFixed(2)} mpg——1973、1979 年兩次石油危機後，美國實施燃油經濟標準（CAFE），車廠被迫把車做小做輕。年份本身不會讓車省油，它是「法規與車重變化」的代理變數：相關不等於因果。`;
      else if (!logY && (vx === 4 || vx === 3 || vx === 2)) msg += ' 但仔細看：點雲是一條彎的曲線，直線在兩端都低估——試試勾選「log（mpg）」，關係會變直，R² 也會提高。';
      else if (logY) msg += ' 取 log 後彎曲變直，模型的假設（線性）更符合資料，這是 M2 會再談的「轉換」。';
      out.append(note(msg));
    }
    box.append(out); draw();
  })();
})();
