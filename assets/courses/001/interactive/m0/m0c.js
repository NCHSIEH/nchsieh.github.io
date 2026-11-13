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
  /* ====================================================================
     ④ 第 05 節：醫療 AI 進臨床（2026-11-09 新增）
        美國 FDA AI‑Enabled Medical Device List（2026/9 更新，決定日至 2026/6/29）
        台灣衛福部三大 AI 中心（2024/10 成立）
     ==================================================================== */
  (function clinic() {
    const box = $('#w-clinic'); if (!box) return;
    let view = 'us', stage = 0; const out = h('div');
    const YR = [['1995–2014 年均', 1.8], ['2023 年', 226], ['2024 年', 235], ['2025 年', 335], ['2026 上半年', 181]];
    const TW = [
      ['取證', '臨床 AI 取證驗證中心', '4 家醫學中心', '這個模型在台灣病人身上準不準、安不安全？',
        '衛福部的比喻：食藥署是 AI 的「監理站」，這裡是「驗車中心」。用具台灣人群代表性的跨院資料替廠商做外部驗證；聯邦學習讓模型到各院受測，原始資料不必搬出醫院。首批實測包括眼底影像判讀糖尿病視網膜病變、心電圖預測一年內猝死、斷層影像辨識腸穿孔。',
        'W5 外部驗證：不同來源的資料才算數'],
      ['落地', '負責任 AI 執行中心', '10 家醫院', '醫師為什麼要相信它？出問題誰負責？',
        '處理自主、當責、透明、公平、安全、永續、隱私七類倫理風險；院內訂 AI 臨床使用管理辦法，揭露訓練資料來源、臨床準確度與可解釋性，並以美國 HTI‑1 的透明性指標（外部驗證、公平性評估、上線後持續監測）為原則。',
        'M9：子群體檢核、可解釋性、模型卡'],
      ['給付', 'AI 影響性研究中心', '5 家醫院', '用了它，病人真的比較好嗎？值得健保付錢嗎？',
        '對已取證的 AI 醫材設計有對照組的臨床試驗，比較「用」與「不用」的實際效益，結果提供衛福部與健保署作為是否納入健保給付、如何定價的依據。',
        'M0：相關 ≠ 因果；要有對照才看得出效益']];
    function draw() {
      out.innerHTML = '';
      out.append(h('div', { class: 'row' }, seg([['us', '美國：FDA 授權了多少'], ['tw', '台灣：取證 → 落地 → 給付']], () => view, v => view = v, draw)));
      if (view === 'us') {
        out.append(h('div', { class: 'kpi', style: { margin: '10px 0' } }, kpi('累計授權（1995–2026/6）', '1,614 項'), kpi('放射科占比', '76%'), kpi('經 510(k) 等同性審查', '96%', 'bad'), kpi('LLM 生成式 AI 醫材', '0 項')));
        const bars = h('div'); out.append(sub('每年授權數（項）'), bars);
        U.hbars(bars, YR.map(([l, v], i) => ({ label: l, value: v, color: i === 4 ? C.amber || '#b7791f' : i === 0 ? '#9aa3ad' : C.accent })), { w: 820, lw: 120, rowH: 30 });
        const r = (226 + 235 + 335) / 3;
        out.append(note(`1995–2014 年平均每年不到 2 項，2023–2025 年平均每年 ${r.toFixed(0)} 項，是原來的 ${Math.round(r / 1.8)} 倍；2026 上半年已有 181 項，全年可望再創新高。但 96% 是用「與既有器材實質等同」的 510(k) 途徑上市，不需要前瞻性臨床試驗——核准多，不代表證明了對病人有效。至 2026/9 仍沒有任何以 LLM 生成內容為核心功能的醫材獲准，FDA 表示將開始標註含基礎模型的器材。`));
      } else {
        const row = h('div', { class: 'grid3', style: { marginTop: '10px' } });
        TW.forEach(([k, name, n, q], i) => { const on = i === stage; const c = h('div', { style: { border: '1.5px solid ' + (on ? 'var(--accent)' : 'var(--line)'), background: on ? 'var(--accent-soft)' : '#fff', borderRadius: '10px', padding: '10px 12px', cursor: 'pointer' } }, h('div', { class: 'mono', style: { fontWeight: 700, color: 'var(--accent-ink)' } }, `第 ${i + 1} 關・${k}`), h('b', null, name), h('div', { style: { fontSize: '13px', color: 'var(--muted)' } }, n), h('div', { style: { fontSize: '13.5px', marginTop: '6px' } }, '「' + q + '」')); c.onclick = () => { stage = i; draw(); }; row.append(c); });
        const [k, name, , , d, m] = TW[stage];
        out.append(row, h('div', { style: { border: '1px solid var(--line)', borderRadius: '10px', padding: '10px 14px', marginTop: '10px', background: 'var(--paper)' } }, h('b', null, name + '在做什麼'), h('div', { style: { fontSize: '14px', margin: '4px 0 6px' } }, d), h('span', { class: 'tag' }, '本課對應：' + m)));
        out.append(note('三關回答的是三個不同的問題：準不準（取證）、信不信得過（落地）、有沒有幫助（給付）。一個 AI 可以過了第一關卻卡在第三關——這正是美國 FDA 數字「核准多、證據少」的另一面。2024/10 成立，30 家醫院提案、16 家醫院 19 案入選。'));
      }
      out.append(h('p', { class: 'ai' }, '資料：U.S. FDA AI‑Enabled Medical Device List（2026/9 更新）；衛福部 2024/10/7 新聞稿、iThome 報導。講義 M0 第 41、43 頁。'));
    }
    box.append(out); draw();
  })();

  /* ====================================================================
     第 05 節：誰在用、證據多少、健保署糖尿病風險 AI（2026-11-13 新增）
     ==================================================================== */
  (function adopt() {
    const box = $('#w-adopt'); if (!box) return;
    const out = h('div'); let view = 'use', stage = 0, shown = {};
    const USE = [['2023 年', 38], ['2026 年', 81]];
    const TOP = [['整理醫學文獻與照護標準', 39], ['寫出院指示／照護計畫／病程紀錄', 30]];
    const EV = [['用考試式題目評估（近半數，圖以 50 示意）', 50], ['使用真實臨床資料', 5], ['有臨床研究的 FDA 醫材中，依據隨機試驗', 2.4]];
    const DM = [
      ['界定問題', '三高慢性病人口逾 850 萬、糖尿病約 320 萬人。目標不是「預測得準」，而是分級照護：誰該留在診所、誰該轉到醫院。', '講義 PART 10：為誰預測什麼、預測後做什麼'],
      ['蒐集資料', '去識別化的健保資料：性別、年齡、ICD‑10 診斷碼、檢驗檢查等。原則是「資料不離署」，存取金鑰由健保署掌控。', 'M1：資料來源、納入排除、去識別化'],
      ['建立模型', '以糖尿病併發症嚴重度指數（DCSI）為架構，輸出紅、黃、綠燈風險分級，並預測視網膜、腦血管、腎病變等共病風險。', 'W5：分類與決策門檻'],
      ['驗證', '40 家診所場域驗證：北部 7、中部 29、南部 4，含都會型與偏鄉型。', 'W5 外部驗證；M9 子群體檢核'],
      ['溝通部署', '2026/3 起，醫師在家醫大平台看分級；民眾在健康存摺 App 用 Gemini 驅動的衛教助理（需本人授權）。', 'M8：衛教助理；M9：人在迴路'],
      ['成效', '官方公布：單一病例評估時間由 20 分鐘縮到 25 秒。血糖控制與併發症是否改善，尚未見到公布的數字。', 'M0：上線 ≠ 證明有效']];
    const Q = [['單一病例評估由 20 分鐘縮到 25 秒', '效率', '省下的是醫師的時間。它沒有告訴你病人後來有沒有比較好。'],
      ['寫病歷時間最多減少 83%', '效率', '同樣是時間。而且是部分醫療體系醫師的自述，隨機試驗的結果沒有這麼一致（見 M7）。'],
      ['用了 AI 分級的病人，三年後洗腎比例較低', '對病人有幫助', '這才是結果指標，而且要有對照組才能下結論。目前這個案子還沒有公布這類數字。']];
    function draw() {
      out.innerHTML = '';
      out.append(h('div', { class: 'row' }, seg([['use', '誰在用'], ['ev', '證據有多少'], ['dm', '台灣案例：糖尿病風險 AI'], ['q', '判斷：效率還是效益？']], () => view, v => view = v, draw)));
      if (view === 'use') {
        out.append(h('div', { class: 'kpi', style: { margin: '10px 0' } }, kpi('專業上使用 AI 的美國醫師', '81%'), kpi('2023 年', '38%'), kpi('平均用途數', '1.1 → 2.3 項'), kpi('擔心技能流失（程度不一）', '88%', 'bad')));
        const a = h('div'), b = h('div'); out.append(sub('使用 AI 的醫師比例（%）'), a, sub('2026 年最常見的兩種用途（%）'), b);
        U.hbars(a, USE.map(([l, v], i) => ({ label: l, value: v, color: i ? C.accent : '#9aa3ad' })), { w: 820, lw: 120, rowH: 30, max: 100 });
        U.hbars(b, TOP.map(([l, v]) => ({ label: l, value: v, color: C.accent })), { w: 820, lw: 260, rowH: 30, max: 100 });
        out.append(note('三年內使用比例翻倍，但最常見的用途是整理文獻與寫文件，不是診斷。76% 的醫師認為 AI 有助於照顧病人，85% 希望參與導入決策——工具進來得很快，醫師要的是決定怎麼用的權利。'));
      } else if (view === 'ev') {
        const a = h('div'); out.append(sub('臨床 AI 的證據基礎（%）'), a);
        U.hbars(a, EV.map(([l, v], i) => ({ label: l, value: v, color: i ? (C.amber || '#b7791f') : '#9aa3ad' })), { w: 820, lw: 300, rowH: 30, max: 100 });
        out.append(note('AI Index 2026 回顧 500 多篇臨床 AI 研究：近半數是用考試式題目評估，只有 5% 用真實臨床資料；有臨床研究的 FDA 授權 AI 醫材中，只有 2.4% 依據隨機試驗。另一方面，健康相關的 Google 搜尋有 84–92% 會出現 AI 生成摘要——民眾拿到的 AI 答案，受到的把關比醫材更少。'));
      } else if (view === 'dm') {
        const row = h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' } });
        DM.forEach(([k], i) => { const b = h('button', { class: 'btn' + (i === stage ? ' primary' : '') }, `${i + 1} ${k}`); b.onclick = () => { stage = i; draw(); }; row.append(b); });
        const [k, d, m] = DM[stage];
        out.append(row, h('div', { style: { border: '1px solid var(--line)', borderRadius: '10px', padding: '10px 14px', marginTop: '10px', background: 'var(--paper)' } }, h('b', null, k), h('div', { style: { fontSize: '14px', margin: '4px 0 6px' } }, d), h('span', { class: 'tag' }, '本課對應：' + m)));
        out.append(note('健保署、Google、國衛院與北醫 2024 年中起合作。這個案子把講義的專案流程走了一遍；最後一格「成效」目前只有效率數字，這正是下一個分頁要你判斷的事。'));
      } else {
        Q.forEach(([t, ans, why], i) => {
          const r = h('div', { style: { border: '1px solid var(--line)', borderRadius: '10px', padding: '10px 14px', marginTop: '8px' } }, h('div', { style: { fontSize: '14.5px', marginBottom: '6px' } }, '「' + t + '」'));
          if (shown[i] === undefined) { ['效率', '對病人有幫助'].forEach(o => { const b = h('button', { class: 'btn', style: { marginRight: '6px' } }, o); b.onclick = () => { shown[i] = o; draw(); }; r.append(b); }); }
          else r.append(h('div', { style: { fontSize: '14px' } }, h('b', { style: { color: shown[i] === ans ? 'var(--accent-ink)' : '#b42318' } }, (shown[i] === ans ? '對。' : '再想想。') + '這是「' + ans + '」。'), why));
          out.append(r);
        });
        if (Object.keys(shown).length === Q.length) out.append(note('效率數字容易量、也最先被公布；效益要等時間、要有對照。看到 AI 成果報導時，先問它量的是哪一種。'));
      }
      out.append(h('p', { class: 'ai' }, '資料：AMA 2026 Physician Survey on Augmented Intelligence（2026/3，1,692 位醫師）；Stanford AI Index 2026 第 6 章；健保署與 Google 2026/3/4 發表（科技新報、CIO Taiwan、GeneOnline 報導）。最後一題的「三年後洗腎比例」為假設情境。講義 M0 第 42、44 頁。'));
    }
    box.append(out); draw();
  })();
})();
