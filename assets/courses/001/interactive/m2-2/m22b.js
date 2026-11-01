/* M2-2 互動頁 B：PART 08–14 */
(function () {
  'use strict';
  const { h, $, S, fmt, C, rng, randn, Store, seg, slider, check } = U;
  const { cap } = M22;
  const axes = (sv, x, y, W, H, m, xl, yl, xt, yt) => { yt.forEach(t => { U.s('line', { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: 'grid' }, sv); U.s('text', { x: m.l - 6, y: y(t) + 4, 'text-anchor': 'end', text: t }, sv); }); xt.forEach(t => U.s('text', { x: x(t), y: H - m.b + 16, 'text-anchor': 'middle', text: t }, sv)); U.s('text', { x: (m.l + W - m.r) / 2, y: H - 3, 'text-anchor': 'middle', text: xl, style: 'font-size:12px;fill:#5d6774' }, sv); U.s('text', { x: 12, y: (m.t + H - m.b) / 2, 'text-anchor': 'middle', transform: `rotate(-90 12 ${(m.t + H - m.b) / 2})`, text: yl, style: 'font-size:12px;fill:#5d6774' }, sv); };

  // ================= P08 ROC / PR =================
  const SC = M22.scores, SORTED = SC.slice().sort((a, b) => b.p - a.p);
  const CURVE = (() => { const pts = [{ fpr: 0, tpr: 0, prec: 1, th: 1 }]; let tp = 0, fp = 0; SORTED.forEach(q => { q.y ? tp++ : fp++; pts.push({ fpr: fp / 940, tpr: tp / 60, prec: tp / (tp + fp), th: q.p }); }); return pts; })();
  const AUC = (() => { let a = 0; for (let i = 1; i < CURVE.length; i++) a += (CURVE[i].fpr - CURVE[i - 1].fpr) * (CURVE[i].tpr + CURVE[i - 1].tpr) / 2; return a; })();
  (function () {
    let th = .2; const out = h('div');
    function draw() { out.innerHTML = ''; const { tp, fp, fn, tn } = M22.cm(th), tpr = tp / 60, fpr = fp / 940, prec = tp / (tp + fp || 1);
      const mk = (kind) => { const W = 340, H = 300, m = { l: 44, r: 12, t: 12, b: 36 }, box = h('div'), sv = U.svgBox(box, W, H), x = U.scale(0, 1, m.l, W - m.r), y = U.scale(0, 1, H - m.b, m.t);
        axes(sv, x, y, W, H, m, kind === 'roc' ? 'FPR（1 − 特異度）' : 'Recall（敏感度）', kind === 'roc' ? 'TPR' : 'Precision', [0, .25, .5, .75, 1], [0, .25, .5, .75, 1]);
        if (kind === 'roc') U.s('line', { x1: x(0), y1: y(0), x2: x(1), y2: y(1), stroke: C.gray, 'stroke-dasharray': '4 3' }, sv); else U.s('line', { x1: x(0), y1: y(.06), x2: x(1), y2: y(.06), stroke: C.gray, 'stroke-dasharray': '4 3' }, sv);
        const pts = CURVE.filter((_, i) => kind === 'roc' || i > 3).map(c => kind === 'roc' ? `${x(c.fpr)},${y(c.tpr)}` : `${x(c.tpr)},${y(c.prec)}`); U.s('polyline', { points: pts.join(' '), fill: 'none', stroke: C.accent, 'stroke-width': 2.5 }, sv);
        const cx = kind === 'roc' ? x(fpr) : x(tpr), cy = kind === 'roc' ? y(tpr) : y(prec); U.s('circle', { cx, cy, r: 7, fill: C.amber, stroke: '#fff', 'stroke-width': 2 }, sv);
        U.s('text', { x: kind === 'roc' ? x(.55) : x(.55), y: kind === 'roc' ? y(.15) : y(.11), text: kind === 'roc' ? `AUC = ${AUC.toFixed(2)}` : '基準線 = 陽性比例 0.06', style: 'font-size:12px;fill:#1c2430;font-weight:600' }, sv); return box; };
      out.append(h('div', { class: 'row', style: { marginBottom: '6px' } }, slider('門檻', .02, .9, .01, () => th, v => th = v, draw, v => (+v).toFixed(2))),
        h('div', { class: 'grid3', style: { alignItems: 'start' } }, h('div', null, h('b', { style: { fontSize: '14px' } }, 'ROC'), mk('roc')), h('div', null, h('b', { style: { fontSize: '14px' } }, 'PR'), mk('pr')),
          h('div', null, h('div', { class: 'kpi' }, h('div', null, h('div', { class: 'k' }, 'TPR／Recall'), h('div', { class: 'v' }, tpr.toFixed(2))), h('div', null, h('div', { class: 'k' }, 'FPR'), h('div', { class: 'v' }, fpr.toFixed(3))), h('div', null, h('div', { class: 'k' }, 'Precision'), h('div', { class: 'v' }, prec.toFixed(2)))),
            h('div', { class: 'note', style: { fontSize: '13.5px' } }, 'ROC-AUC：隨機抽一正一負，模型給正例較高分的機率；與門檻無關，適合比較模型。PR 不看 TN，在 6% 陽性時更誠實——基準是 0.06 不是 0.5。AUC > 0.95 先查洩漏。')))); }
    $('#w-roc').append(out); draw();
  })();

  // ================= P08 期望成本 =================
  (function () {
    let R = 10; const out = h('div'); const TH = Array.from({ length: 89 }, (_, i) => .01 + i * .01);
    function draw() { out.innerHTML = ''; const costs = TH.map(t => { const c = M22.cm(t); return { t, c: c.fn * R + c.fp, ...c }; }), best = costs.reduce((a, b) => b.c < a.c ? b : a), theo = 1 / (1 + R);
      const W = 520, H = 260, m = { l: 50, r: 12, t: 14, b: 36 }, box = h('div'), sv = U.svgBox(box, W, H), ymax = Math.max(...costs.map(c => c.c)) * 1.05, x = U.scale(0, .9, m.l, W - m.r), y = U.scale(0, ymax, H - m.b, m.t);
      axes(sv, x, y, W, H, m, '門檻', '期望總成本', [0, .2, .4, .6, .8], U.ticks(0, ymax, 4));
      U.s('polyline', { points: costs.map(c => `${x(c.t)},${y(c.c)}`).join(' '), fill: 'none', stroke: C.accent, 'stroke-width': 2.5 }, sv);
      U.s('line', { x1: x(.5), x2: x(.5), y1: m.t, y2: H - m.b, stroke: C.gray, 'stroke-dasharray': '4 3' }, sv); U.s('text', { x: x(.5) + 4, y: m.t + 10, text: '軟體預設 0.5', style: 'fill:#8a929c' }, sv);
      U.s('circle', { cx: x(best.t), cy: y(best.c), r: 7, fill: C.amber, stroke: '#fff', 'stroke-width': 2 }, sv); U.s('text', { x: x(best.t) + 8, y: y(best.c) - 8, text: `最低成本 @ ${best.t.toFixed(2)}`, style: 'fill:#b45309;font-weight:600' }, sv);
      out.append(h('div', { class: 'row', style: { marginBottom: '6px' } }, slider('代價比（漏一個 : 誤報一次）', 1, 40, 1, () => R, v => R = v, draw, v => v + ' : 1')),
        h('div', { class: 'grid2', style: { alignItems: 'center' } }, box, h('div', null, h('div', { class: 'kpi' }, h('div', null, h('div', { class: 'k' }, '最佳門檻'), h('div', { class: 'v' }, best.t.toFixed(2))), h('div', null, h('div', { class: 'k' }, '理論值 1/(1+代價比)'), h('div', { class: 'v' }, theo.toFixed(2))), h('div', null, h('div', { class: 'k' }, '此時 漏掉／誤報'), h('div', { class: 'v' }, `${best.fn} / ${best.fp}`))),
          h('div', { class: 'note', style: { fontSize: '14px' } }, `總成本 = FN × ${R} + FP × 1。代價比越大，最佳門檻越往左（用誤報買回漏網之魚）。若機率已校準，理論最佳門檻＝1/(1+代價比)。${Math.abs(best.t - theo) < .04 ? '本例兩者相近。' : '本例有落差：只有 60 位陽性，成本曲線底部很平，抽樣誤差就會讓最佳點偏移；若落差在大樣本仍很大，代表機率需要校準。'}`), h('p', { class: 'ai' }, '資料科學家的工作：把「選門檻」翻譯成「選代價比」這個臨床與管理者答得出的問題，並在報告放敏感度分析。AI Studio：Performance (Costs)、Find Threshold。門檻應在驗證／CV 內選定。')))); }
    $('#w-cost').append(out); draw();
  })();

  // ================= P08 校準 =================
  (function () {
    let over = false; const out = h('div'); const lg = p => Math.log(p / (1 - p));
    function draw() { out.innerHTML = ''; const pr = SC.map(q => over ? ML.sigmoid(1.9 * lg(q.p) + 2.4) : q.p);
      const bins = Array.from({ length: 10 }, () => [0, 0, 0]); pr.forEach((p, i) => { const b = Math.min(9, Math.floor(p * 10)); bins[b][0] += p; bins[b][1] += SC[i].y; bins[b][2]++; });
      const pts = bins.filter(b => b[2] >= 8).map(b => ({ x: b[0] / b[2], y: b[1] / b[2], n: b[2] })), brier = S.mean(pr.map((p, i) => (p - SC[i].y) ** 2));
      const box = h('div'); U.scatter(box, pts.map(p => ({ x: p.x, y: p.y, c: over ? C.bad : C.accent, r: 6, title: `n=${p.n}` })), { w: 360, h: 300, xmin: 0, xmax: 1, ymin: 0, ymax: 1, xlabel: '模型宣稱的機率', ylabel: '實際發生率', under: [(sv, x, y) => U.s('line', { x1: x(0), y1: y(0), x2: x(1), y2: y(1), stroke: C.gray, 'stroke-dasharray': '4 3' }, sv)], over: [(sv, x, y) => U.s('polyline', { points: pts.map(p => `${x(p.x)},${y(p.y)}`).join(' '), fill: 'none', stroke: over ? C.bad : C.accent, 'stroke-width': 2 }, sv)] });
      out.append(h('div', { class: 'row', style: { marginBottom: '6px' } }, seg([[false, '校準良好的模型'], [true, '機率虛胖的模型']], () => over, v => over = v, draw)),
        h('div', { class: 'grid2', style: { alignItems: 'center' } }, cap(box, 380), h('div', null, h('div', { class: 'kpi' }, h('div', null, h('div', { class: 'k' }, 'AUC（排序能力）'), h('div', { class: 'v' }, AUC.toFixed(2))), h('div', null, h('div', { class: 'k' }, 'Brier 分數（越小越好）'), h('div', { class: 'v ' + (over ? 'bad' : 'good') }, brier.toFixed(4))), h('div', null, h('div', { class: 'k' }, '一律預測 6% 的 Brier'), h('div', { class: 'v' }, (S.mean(SC.map(q => (.06 - q.y) ** 2))).toFixed(4)))),
          h('div', { class: 'note ' + (over ? 'bad' : ''), style: { fontSize: '14px' } }, over ? '兩個模型排序完全相同（AUC 一樣），但右邊這個宣稱的機率遠高於實際發生率——排序可用，數值不能拿去衛教。修正：Platt scaling（AI Studio：Rescale Confidences (Logistic)）或等張回歸，務必在獨立驗證資料上做。' : '點貼著對角線：說 30% 就大約 30% 發生。要把機率講給病人聽（衛教、共享決策）之前，先確認這條線。'), h('p', { class: 'ai' }, 'AUC 只看「排得對不對」，校準看「數字準不準」。臨床預測模型論文只報 AUC 會被退稿；建議依 TRIPOD+AI（2024）報告區辨力、校準與驗證類型。')))); }
    $('#w-calib').append(out); draw();
  })();

  // ================= P09 不平衡資料 =================
  const IMB = (() => { const r = rng(324), P = []; for (let i = 0; i < 300; i++) P.push({ x: [randn(r) * 1.1 + 3, randn(r) * 1.1 + 3], y: 0 }); for (let i = 0; i < 24; i++) P.push({ x: [randn(r) * .8 + 5.2, randn(r) * .8 + 5], y: 1 }); return P; })();
  (function () {
    let m = 'orig'; const out = h('div'); const r = rng(9);
    const MIN = IMB.filter(p => p.y), MAJ = IMB.filter(p => !p.y);
    const smote = Array.from({ length: 276 }, () => { const a = MIN[Math.floor(r() * 24)], b = MIN[Math.floor(r() * 24)], t = r(); return { x: [a.x[0] + t * (b.x[0] - a.x[0]), a.x[1] + t * (b.x[1] - a.x[1])], y: 1, syn: 1 }; });
    const keep = new Set(MAJ.map((_, i) => i).sort(() => r() - .5).slice(0, 40));
    const INFO = { orig: ['① 原始', '300 : 24（7.4%）', '多數類淹沒少數類。'], over: ['② 過取樣（複製）', '300 : 300（複製）', '少數類被複製多份疊在同一位置——模型容易死背這幾個點。'], smote: ['③ SMOTE', '300 : 300（內插）', '在少數類樣本的連線上內插出新點，比複製多樣；但會製造「不存在的病人」，報告須聲明。'], under: ['④ 欠取樣', '40 : 24（刪 260 筆）', '刪掉大量多數類——丟資訊，小資料不可行。'], weight: ['⑤ 類別權重', '300 : 24（少數類 ×12.5）', '一筆資料都沒動，改的是損失函數裡少數類的代價——最安全。'] };
    function draw() { out.innerHTML = ''; let pts;
      if (m === 'orig' || m === 'weight') pts = IMB.map(p => ({ x: p.x[0], y: p.x[1], c: p.y ? C.bad : C.blue, r: p.y && m === 'weight' ? 7 : 3.2 }));
      else if (m === 'over') pts = MAJ.map(p => ({ x: p.x[0], y: p.x[1], c: C.blue, r: 3.2 })).concat(MIN.map(p => ({ x: p.x[0], y: p.x[1], c: C.bad, r: 3.2, stroke: '#7a1d12' })));
      else if (m === 'smote') pts = MAJ.map(p => ({ x: p.x[0], y: p.x[1], c: C.blue, r: 3.2 })).concat(smote.map(p => ({ x: p.x[0], y: p.x[1], c: C.amber, r: 2.6 })), MIN.map(p => ({ x: p.x[0], y: p.x[1], c: C.bad, r: 3.6 })));
      else pts = MAJ.map((p, i) => ({ x: p.x[0], y: p.x[1], c: C.blue, r: 3.2, op: keep.has(i) ? .9 : .12 })).concat(MIN.map(p => ({ x: p.x[0], y: p.x[1], c: C.bad, r: 3.2 })));
      const box = h('div'); U.scatter(box, pts, { w: 380, h: 320, xmin: 0, xmax: 8, ymin: 0, ymax: 8, noGrid: true, xlabel: '特徵 1', ylabel: '特徵 2' });
      const [t, n, d] = INFO[m];
      out.append(h('div', { class: 'row', style: { marginBottom: '6px' } }, seg([['orig', '① 原始'], ['over', '② 過取樣'], ['smote', '③ SMOTE'], ['under', '④ 欠取樣'], ['weight', '⑤ 類別權重']], () => m, v => m = v, draw)),
        h('div', { class: 'grid2', style: { alignItems: 'center' } }, cap(box, 400), h('div', null, h('div', { class: 'kpi' }, h('div', null, h('div', { class: 'k' }, t), h('div', { class: 'v' }, n))), h('div', { class: 'note ' + (m === 'weight' ? '' : m === 'orig' ? '' : 'warn'), style: { fontSize: '14px' } }, d + (m !== 'orig' && m !== 'weight' ? '　①–④ 都動到資料集，只能在訓練折內做，否則會洩漏到驗證折。' : ''))))); }
    $('#w-imb').append(out); draw();
  })();
  (function () {
    const X = IMB.map(p => p.x), Y = IMB.map(p => p.y), cache = {};
    const fit = w => cache[w] || (cache[w] = ML.logistic(X, Y, Y.map(y => y ? w : 1), { lr: .4, iters: 900 }));
    let w = 1, th = .5; const out = h('div');
    function draw() { out.innerHTML = ''; const b = fit(w), f = x => ML.sigmoid(ML.predict(b, x));
      const pos = IMB.filter(p => p.y), neg = IMB.filter(p => !p.y), cov = pos.filter(p => f(p.x) >= th).length, fa = neg.filter(p => f(p.x) >= th).length;
      const box = h('div'); U.scatter(box, IMB.map(p => ({ x: p.x[0], y: p.x[1], c: p.y ? C.bad : C.blue, r: 3.2 })), { w: 380, h: 320, xmin: 0, xmax: 8, ymin: 0, ymax: 8, noGrid: true, xlabel: '特徵 1', ylabel: '特徵 2', under: [(sv, x, y) => ML.regionMap(sv, x, y, (a, c) => f([a, c]), 0, 8, 0, 8, 48, 48, th)] });
      out.append(h('div', { class: 'row', style: { marginBottom: '6px' } }, slider('少數類權重', 1, 15, .5, () => w, v => w = v, draw, v => v + ' : 1'), slider('門檻', .05, .9, .01, () => th, v => th = v, draw, v => (+v).toFixed(2)), h('button', { class: 'btn sm', onclick: () => { w = 1; th = .5; draw(); } }, '① 不處理'), h('button', { class: 'btn sm', onclick: () => { w = 12.5; th = .5; draw(); } }, '② 權重 12.5'), h('button', { class: 'btn sm', onclick: () => { w = 1; th = .15; draw(); } }, '③ 只調門檻 0.15')),
        h('div', { class: 'grid2', style: { alignItems: 'center' } }, cap(box, 400), h('div', null, h('div', { class: 'kpi' }, h('div', null, h('div', { class: 'k' }, '少數類涵蓋（Recall）'), h('div', { class: 'v ' + (cov / 24 > .7 ? 'good' : 'bad') }, `${cov}/24（${Math.round(cov / 24 * 100)}%）`)), h('div', null, h('div', { class: 'k' }, '多數類誤報'), h('div', { class: 'v' }, `${fa}/300`))),
          h('div', { class: 'note', style: { fontSize: '14px' } }, w > 1 && th === .5 ? '類別權重：重新訓練出另一個模型，邊界被拉回中間。' : w === 1 && th < .5 ? '只調門檻：模型一個係數都沒改，只是把判定線平移。最簡單透明——永遠先試這個。' : w > 1 ? '權重訓練＋門檻微調可以並用。權重設成類別比例的倒數（約 12.5）是常見起點，再依驗證結果微調。' : '不處理：邊界被多數類推向少數類那一側，少數類大量被判為陰性。')))); }
    $('#w-weight').append(out); draw();
  })();

  // ================= P10 分層 =================
  (function () {
    let seed = 1, strat = false; const out = h('div');
    function draw() { out.innerHTML = ''; const r = rng(seed * 13 + 1), lab = Array.from({ length: 100 }, (_, i) => i < 6 ? 1 : 0);
      let folds; if (strat) { const pos = [0, 1, 2, 3, 4, 5].sort(() => r() - .5), neg = Array.from({ length: 94 }, (_, i) => i + 6).sort(() => r() - .5); folds = Array.from({ length: 5 }, () => []); pos.forEach((v, i) => folds[i % 5].push(v)); neg.forEach((v, i) => folds[(i + 1) % 5].push(v)); }
      else { const idx = lab.map((_, i) => [r(), i]).sort((a, b) => a[0] - b[0]).map(a => a[1]); folds = Array.from({ length: 5 }, (_, f) => idx.slice(f * 20, f * 20 + 20)); }
      const cnt = folds.map(f => f.filter(i => lab[i]).length), zero = cnt.filter(c => c === 0).length;
      const g = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px' } }); folds.forEach((f, k) => g.append(h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, h('span', { class: 'mono', style: { width: '44px', fontSize: '12px', color: 'var(--muted)' } }, `第 ${k + 1} 折`), h('div', { style: { display: 'flex', gap: '1px', flex: 1 } }, f.map(i => h('div', { style: { flex: 1, height: '16px', background: lab[i] ? C.bad : '#cfe3e0' } }))), h('span', { class: 'mono', style: { width: '70px', fontSize: '12px', color: cnt[k] ? 'var(--ink)' : 'var(--bad)', fontWeight: cnt[k] ? 400 : 700 } }, `陽性 ${cnt[k]}`))));
      out.append(h('div', { class: 'row', style: { marginBottom: '8px' } }, seg([[false, '隨機切 5 折'], [true, '分層 Stratified']], () => strat, v => strat = v, draw), h('button', { class: 'btn sm', onclick: () => { seed++; draw(); } }, '重新洗牌')),
        h('div', { class: 'grid2' }, g, h('div', { class: 'note ' + (zero ? 'bad' : ''), style: { fontSize: '14px' } }, `100 筆、6 個陽性。${zero ? `這次有 ${zero} 折一個陽性都沒有——那一折的 Recall、AUC 算不出來或毫無意義。` : '各折陽性數：' + cnt.join('、') + '。'}${strat ? '分層讓每折陽性比例一致。AI Studio：sampling type = stratified，本課程分類作業預設要求。' : '多按幾次重新洗牌看看。'}`))); }
    $('#w-strat').append(out); draw();
  })();
  (function () {
    const D = [[500, .95, .68], [2000, .9, .75], [5000, .87, .8], [12000, .86, .83]];
    const W = 520, H = 260, m = { l: 44, r: 14, t: 14, b: 36 }, box = h('div'), sv = U.svgBox(box, W, H), x = U.scale(Math.log10(400), Math.log10(14000), m.l, W - m.r), y = U.scale(.6, 1, H - m.b, m.t);
    [.6, .7, .8, .9, 1].forEach(t => { U.s('line', { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: 'grid' }, sv); U.s('text', { x: m.l - 6, y: y(t) + 4, 'text-anchor': 'end', text: t.toFixed(1) }, sv); }); D.forEach(d => U.s('text', { x: x(Math.log10(d[0])), y: H - m.b + 16, 'text-anchor': 'middle', text: d[0].toLocaleString() }, sv)); U.s('text', { x: (m.l + W - m.r) / 2, y: H - 3, 'text-anchor': 'middle', text: '訓練樣本數（對數軸）', style: 'font-size:12px;fill:#5d6774' }, sv);
    U.s('polygon', { points: [...D.map(d => `${x(Math.log10(d[0]))},${y(d[1])}`), ...D.slice().reverse().map(d => `${x(Math.log10(d[0]))},${y(d[2])}`)].join(' '), fill: C.bad, 'fill-opacity': .1 }, sv);
    [[1, C.gray, '訓練 AUC'], [2, C.blue, '交叉驗證 AUC']].forEach(([k, c]) => { U.s('polyline', { points: D.map(d => `${x(Math.log10(d[0]))},${y(d[k])}`).join(' '), fill: 'none', stroke: c, 'stroke-width': 2.5 }, sv); D.forEach(d => U.s('circle', { cx: x(Math.log10(d[0])), cy: y(d[k]), r: 4, fill: c }, sv)); });
    $('#w-lc').append(h('div', { class: 'grid2', style: { alignItems: 'center' } }, box, h('div', null, h('div', { class: 'concept' }, h('div', null, h('b', null, '兩線仍在靠攏'), '更多資料仍有幫助 → 繼續收資料'), h('div', null, h('b', null, '已收斂但都低'), '資料夠了、特徵不夠 → 做特徵工程'), h('div', null, h('b', null, '差距持續巨大'), '嚴重過擬合 → 簡化模型或正則化')), h('p', { class: 'ai' }, '本例：差距從 0.27 收斂到 0.03，5,000 → 12,000 筆只多 0.03，再收資料的報酬已遞減。「再收一年資料值得嗎？」用這張圖回答。AI Studio：Loop + Sample。'))));
  })();

  // ================= P11 Gini =================
  (function () {
    const st = { n: 100, k: 30, an: 50, ak: 8, bn: 60, bk: 12 }; const out = h('div'); const g = ML.gini;
    function draw() { out.innerHTML = ''; const g0 = g(st.k, st.n);
      const cand = [['年齡 ≥ 65', st.an, st.ak], ['糖尿病 = 有', st.bn, st.bk]].map(([nm, ln, lk]) => { const rn = st.n - ln, rk = st.k - lk, gl = g(lk, ln), gr = g(rk, rn), w = (ln * gl + rn * gr) / st.n; return { nm, ln, lk, rn, rk, gl, gr, w, gain: g0 - w }; });
      const win = cand[0].gain >= cand[1].gain ? 0 : 1;
      const num = (k, a, b) => { const i = h('input', { type: 'number', value: st[k], min: a, max: b, style: { width: '64px' } }); i.onchange = () => { const v = Math.round(+i.value); if (!isNaN(v)) { st[k] = Math.max(a, Math.min(b, v)); draw(); } }; return i; };
      const t = h('table', { class: 'dt' }, h('tr', null, ['候選切點', '左：人數', '左：再入院', '右（自動）', '左 Gini', '右 Gini', '加權 Gini', '增益'].map(c => h('th', null, c))), cand.map((c, i) => h('tr', null, h('td', { class: i === win ? 'hl' : '', style: { fontWeight: 600 } }, c.nm + (i === win ? ' ★' : '')), h('td', null, num(i ? 'bn' : 'an', 1, st.n - 1)), h('td', null, num(i ? 'bk' : 'ak', 0, Math.min(st.k, i ? st.bn : st.an))), h('td', { class: 'num' }, `${c.rk}/${c.rn}`), h('td', { class: 'num' }, c.gl.toFixed(4)), h('td', { class: 'num' }, c.gr.toFixed(4)), h('td', { class: 'num' }, c.w.toFixed(4)), h('td', { class: 'num ' + (i === win ? 'ok' : '') }, c.gain.toFixed(4)))));
      out.append(h('div', { class: 'row', style: { marginBottom: '8px' } }, h('label', { class: 'ctl' }, '母節點人數', num('n', 10, 1000)), h('label', { class: 'ctl' }, '母節點再入院', num('k', 0, st.n)), h('span', { class: 'tag' }, `母節點 Gini = 1 − (${(st.k / st.n).toFixed(2)}² + ${(1 - st.k / st.n).toFixed(2)}²) = ${g0.toFixed(4)}`), h('button', { class: 'btn sm', onclick: () => { Object.assign(st, { n: 100, k: 30, an: 50, ak: 8, bn: 60, bk: 12 }); draw(); } }, '還原講義數字')),
        h('div', { class: 'tscroll' }, t), h('div', { class: 'note', style: { fontSize: '14px' } }, `第一刀切「${cand[win].nm}」，增益 ${cand[win].gain.toFixed(4)} vs ${cand[1 - win].gain.toFixed(4)}。Gini＝隨機抽兩筆、類別不同的機率（0 全純、0.5 最亂）。演算法對每個特徵×每個切點都算一次增益，挑最大的切下去再遞迴。差距很小時換一批資料就可能翻盤——這就是單棵樹不穩定的根源。若第一刀切的是「病歷號 > 5000」，該做的是查洩漏。`)); }
    $('#w-gini').append(out); draw();
  })();

  // ================= P11 深度 =================
  (function () {
    const TR = M22.tr, TE = M22.te, cache = {}; const tree = d => cache[d] || (cache[d] = ML.cart(TR, d, { minLeaf: 1 }));
    const curve = [1, 2, 3, 4, 5, 6, 8, 10].map(d => { const t = tree(d); return { d, tr: M22.acc(x => ML.treeP(t, x), TR), te: M22.acc(x => ML.treeP(t, x), TE) }; });
    let d = 3; const out = h('div');
    function draw() { out.innerHTML = ''; const t = tree(d), f = x => ML.treeP(t, x), tr = M22.acc(f, TR), te = M22.acc(f, TE);
      const m = h('div'); M22.map(m, f, TR, { nx: 72, ny: 72 });
      const c2 = h('div'); const W = 340, H = 240, mg = { l: 40, r: 12, t: 12, b: 34 }, sv = U.svgBox(c2, W, H), x = U.scale(0, curve.length - 1, mg.l, W - mg.r), y = U.scale(.6, 1, H - mg.b, mg.t);
      [.6, .7, .8, .9, 1].forEach(v => { U.s('line', { x1: mg.l, x2: W - mg.r, y1: y(v), y2: y(v), class: 'grid' }, sv); U.s('text', { x: mg.l - 6, y: y(v) + 4, 'text-anchor': 'end', text: v.toFixed(1) }, sv); }); curve.forEach((c, i) => U.s('text', { x: x(i), y: H - mg.b + 16, 'text-anchor': 'middle', text: c.d }, sv)); U.s('text', { x: (mg.l + W - mg.r) / 2, y: H - 3, 'text-anchor': 'middle', text: 'maximal depth', style: 'font-size:12px;fill:#5d6774' }, sv);
      [['tr', C.gray], ['te', C.blue]].forEach(([k, c]) => U.s('polyline', { points: curve.map((q, i) => `${x(i)},${y(q[k])}`).join(' '), fill: 'none', stroke: c, 'stroke-width': 2.5 }, sv));
      out.append(h('div', { class: 'row', style: { marginBottom: '6px' } }, slider('樹的最大深度', 1, 10, 1, () => d, v => d = v, draw)),
        h('div', { class: 'grid2' }, cap(m, 400), h('div', null, h('div', { class: 'kpi' }, h('div', null, h('div', { class: 'k' }, '訓練正確率'), h('div', { class: 'v' }, tr.toFixed(2))), h('div', null, h('div', { class: 'k' }, '測試正確率'), h('div', { class: 'v' }, te.toFixed(2)))), cap(c2, 360),
          h('div', { class: 'note ' + (d >= 7 ? 'warn' : ''), style: { fontSize: '14px' } }, '邊界是軸平行的階梯——每一刀只問一個特徵，斜線要切很多刀。第四次見到這條曲線：多項式次數、k、λ、depth，名字不同，物理相同。醫療小資料起手：depth 4–6、minimal leaf size ≥ 20、開啟剪枝；用 Optimize Parameters 包住 CV 掃描。')))); }
    $('#w-depth').append(out); draw();
  })();

  // ================= P11 印出來的樹 =================
  (function () {
    const LEAF = [['低風險', 2, 26, '年齡 < 65 且 共病數 < 2'], ['中風險', 6, 24, '年齡 < 65 且 共病數 ≥ 2'], ['中風險', 9, 27, '年齡 ≥ 65 且 非護理之家'], ['高風險', 13, 23, '年齡 ≥ 65 且 出院到護理之家']];
    let sel = 3; const out = h('div');
    function draw() { out.innerHTML = ''; const W = 640, H = 270, sv = U.svgBox(h('div'), W, H);
      const node = (x, y, t, s, fill) => { U.s('rect', { x: x - 95, y, width: 190, height: 44, rx: 8, fill: fill || '#fff', stroke: C.accent }, sv); U.s('text', { x, y: y + 18, 'text-anchor': 'middle', text: t, style: 'font-size:12.5px;fill:#1c2430;font-weight:600' }, sv); U.s('text', { x, y: y + 34, 'text-anchor': 'middle', text: s, style: 'font-size:11px' }, sv); };
      const ln = (x1, y1, x2, y2, l) => { U.s('line', { x1, y1, x2, y2, stroke: C.line2 || '#c9c2b4', 'stroke-width': 1.5 }, sv); U.s('text', { x: (x1 + x2) / 2 + (x2 < x1 ? -10 : 10), y: (y1 + y2) / 2, 'text-anchor': 'middle', text: l, style: 'font-size:11px;fill:#5d6774' }, sv); };
      ln(320, 50, 170, 100, '否'); ln(320, 50, 470, 100, '是'); ln(170, 144, 85, 196, '否'); ln(170, 144, 245, 196, '是'); ln(470, 144, 395, 196, '否'); ln(470, 144, 555, 196, '是');
      node(320, 6, '年齡 ≥ 65？', '100 人・30 位再入院（30%）', 'var(--accent-soft)'); node(170, 100, '共病數 ≥ 2？', '50 人・8 位（16%）'); node(470, 100, '出院去向＝護理之家？', '50 人・22 位（44%）');
      [85, 245, 395, 555].forEach((x, i) => { const [t, k, n] = LEAF[i], p = k / n, g = U.s('g', { style: 'cursor:pointer' }, sv); U.s('rect', { x: x - 72, y: 196, width: 144, height: 58, rx: 8, fill: i === sel ? C.amber : p > .5 ? '#f6d1cb' : p > .2 ? '#fbe7c9' : '#d8ece6', stroke: i === sel ? C.ink : 'none', 'stroke-width': 2 }, g); U.s('text', { x, y: 218, 'text-anchor': 'middle', text: `${t} ${Math.round(p * 100)}%`, style: `font-size:13px;font-weight:700;fill:${i === sel ? '#fff' : '#1c2430'}` }, g); U.s('text', { x, y: 238, 'text-anchor': 'middle', text: `n = ${n}（${k} 位）`, style: `font-size:11.5px;fill:${i === sel ? '#fff' : '#5d6774'}` }, g); g.addEventListener('click', () => { sel = i; draw(); }); });
      const [t, k, n, path] = LEAF[sel], [lo, hi] = ML.wilson(k, n);
      out.append(sv.parentNode, h('div', { class: 'note', style: { fontSize: '14px' } }, h('b', null, `${path} → ${t} ${Math.round(k / n * 100)}%`), h('div', null, `${n} 人中 ${k} 人再入院；95% 信賴區間約 ${Math.round(lo * 100)}%–${Math.round(hi * 100)}%（Wilson）。`), h('div', { style: { color: 'var(--muted)' } }, '葉節點太小時比率不穩：可調大 minimal leaf size，或在報告中附區間。每個葉節點都要同時看「比率」與「人數」——這是把模型交給臨床人員時最重要的溝通能力。'))); }
    $('#w-printtree').append(out); draw();
  })();

  // ================= P12 投票 =================
  (function () {
    let p = .7, n = 5, corr = false; const out = h('div'); const C2 = (a, b) => { let r = 1; for (let i = 1; i <= b; i++) r = r * (a - b + i) / i; return r; };
    const maj = (p, n) => { let s = 0; for (let k = Math.floor(n / 2) + 1; k <= n; k++) s += C2(n, k) * p ** k * (1 - p) ** (n - k); return s; };
    function draw() { out.innerHTML = ''; const v = corr ? p : maj(p, n);
      const rows = [.6, .7, .8, .9].map(q => h('tr', null, h('td', { class: 'num' }, q.toFixed(2)), h('td', { class: 'num' }, maj(q, 5).toFixed(3)), h('td', { class: 'num ok' }, '+' + (maj(q, 5) - q).toFixed(3))));
      out.append(h('div', { class: 'row', style: { marginBottom: '6px' } }, slider('單一模型正確率', .5, .95, .01, () => p, v => p = v, draw, v => (+v).toFixed(2)), h('label', { class: 'ctl' }, '成員數', seg([[1, '1'], [3, '3'], [5, '5'], [11, '11'], [25, '25']], () => n, v => n = v, draw)), check('成員錯得一模一樣（完全相關）', () => corr, v => corr = v, draw)),
        h('div', { class: 'grid2' }, h('div', null, h('div', { class: 'kpi' }, h('div', null, h('div', { class: 'k' }, `${n} 個模型多數決的正確率`), h('div', { class: 'v ' + (v > p ? 'good' : '') }, v.toFixed(3)))), h('div', { class: 'note ' + (corr ? 'warn' : ''), style: { fontSize: '14px' } }, corr ? '五個一模一樣的模型投票毫無意義——正確率不會提升。獨立性是關鍵。' : '兩個前提：各自要比亂猜好、而且錯的地方不能都一樣。實務手段：隨機抽資料（Bagging）、隨機抽特徵（隨機森林）逼出多樣性。')),
          h('div', { class: 'tscroll' }, h('table', { class: 'dt' }, h('tr', null, ['單一模型', '5 個獨立投票', '提升'].map(c => h('th', null, c))), rows)))); }
    $('#w-vote').append(out); draw();
  })();

  // ================= P12 隨機森林 =================
  (function () {
    const TR = M22.tr, TE = M22.te, r = rng(2027), T = []; for (let k = 0; k < 200; k++) { const bs = TR.map(() => TR[Math.floor(r() * TR.length)]); T.push(ML.cart(bs, 6, { rng: r, mtry: 1, minLeaf: 2 })); }
    let n = 1; const out = h('div');
    function draw() { out.innerHTML = ''; const sub = T.slice(0, n), f = x => S.mean(sub.map(t => ML.treeP(t, x)));
      const m = h('div'); M22.map(m, f, TR, { nx: 60, ny: 60 });
      const accs = [1, 5, 25, 200].map(k => { const s = T.slice(0, k); return [k, M22.acc(x => S.mean(s.map(t => ML.treeP(t, x))), TE)]; });
      out.append(h('div', { class: 'row', style: { marginBottom: '6px' } }, seg([[1, '1 棵樹'], [5, '5 棵'], [25, '25 棵'], [200, '200 棵']], () => n, v => n = v, draw)),
        h('div', { class: 'grid2' }, cap(m, 400), h('div', null, h('div', { class: 'tscroll' }, h('table', { class: 'dt' }, h('tr', null, h('th', null, '樹的數量'), h('th', null, '測試正確率')), accs.map(([k, a]) => h('tr', null, h('td', { class: k === n ? 'hl' : '' }, k), h('td', { class: 'num ' + (k === n ? 'hl' : '') }, a.toFixed(2)))))),
          h('div', { class: 'note', style: { fontSize: '14px', marginTop: '8px' } }, '每棵樹都是用自助抽樣（bootstrap）的資料、每次分裂只看隨機一個特徵長出來的，本身很粗糙；但它們錯的地方不一樣，平均之後就抵消了。樹再多也不會過擬合，200 棵之後報酬遞減。附贈：OOB 驗證（約 36.8% 樣本沒被每棵樹抽中）與特徵重要性。')))); }
    $('#w-rf').append(out); draw();
  })();
  $('#w-ens').append(h('div', { class: 'concept' }, h('div', null, h('b', null, 'Voting 投票'), '用不同種類的演算法（樹＋kNN＋NB＋Logistic）。最簡單；AI Studio：Vote'), h('div', null, h('b', null, 'Bagging 裝袋 → 隨機森林'), '同一演算法、不同自助抽樣資料，平行訓練、降低變異。幾乎不需調參，結構化資料主力'), h('div', null, h('b', null, 'Boosting 提升 → 梯度提升'), '序列訓練，每個新成員專攻前面錯的樣本，降低偏誤。威力最強，但對雜訊敏感；低學習率＋多棵＋early stopping')),
    h('p', { class: 'ai' }, 'AdaBoost 把答錯的樣本權重調高；若那些「難分的點」其實是標錯的雜訊，Boosting 會越陷越深。Stacking 用第二層模型組合第一層預測，第一層必須 out-of-fold。M4 會實作四種集成的完整比較。'));

  // ================= P13 模型選擇 =================
  (function () {
    const M = ['Logistic', 'LDA', 'k-NN', 'Naive Bayes', 'SVM', 'MLP', '決策樹', '隨機森林', '梯度提升'];
    const R = [['需要向臨床人員解釋每個判斷', [2, 1, 0, 0, 0, 0, 2, 0, 0]], ['需要報告勝算比 OR', [2, 0, 0, 0, 0, 0, 0, 0, 0]], ['樣本數很少（< 200）', [2, 2, 0, 2, 0, 0, 1, 0, 0]], ['特徵數 > 樣本數', [1, 0, 0, 2, 2, 0, 0, 0, 0]], ['特徵高度非線性', [0, 0, 2, 0, 2, 2, 2, 2, 2]], ['類別型特徵很多', [1, 0, 0, 2, 0, 0, 2, 2, 2]], ['追求最高預測效能', [0, 0, 0, 0, 1, 1, 0, 2, 2]], ['要轉成紙本決策流程', [0, 0, 0, 0, 0, 0, 2, 0, 0]], ['資料量大、需快速預測', [2, 2, 0, 2, 1, 0, 2, 2, 1]]];
    const on = new Set([0]); const out = h('div');
    function draw() { out.innerHTML = '';
      const cbs = h('div', { class: 'grid3' }, R.map(([t], i) => check(t, () => on.has(i), v => { v ? on.add(i) : on.delete(i); }, draw)));
      const score = M.map((m, j) => { const s = [...on].map(i => R[i][1][j]); return { m, ok: s.every(v => v > 0), sum: S.sum(s) }; }).sort((a, b) => (b.ok - a.ok) || (b.sum - a.sum));
      const t = h('table', { class: 'dt' }, h('tr', null, h('th', null, '情境'), M.map(m => h('th', { style: { textAlign: 'center' } }, m))), R.map(([n, v], i) => h('tr', { style: { opacity: on.has(i) ? 1 : .45 } }, h('td', { class: on.has(i) ? 'hl' : '' }, n), v.map(x => h('td', { style: { textAlign: 'center', color: x === 2 ? C.accent : C.gray, fontSize: '15px' } }, x === 2 ? '●' : x === 1 ? '○' : '')))));
      const fit = score.filter(s => s.ok && on.size);
      out.append(cbs, h('div', { class: 'note ' + (fit.length ? '' : 'warn'), style: { fontSize: '14.5px' } }, on.size ? (fit.length ? h('span', null, h('b', null, '同時符合：'), fit.map(s => s.m).join('、'), '。挑 3–4 個用 Compare ROCs 一次比完，不要只用一個。') : '沒有單一模型同時滿足所有需求——這正是「解釋用 Logistic／樹、預測用森林」兩個模型並用的理由。') : '請勾選至少一個需求。'), h('div', { class: 'tscroll' }, t), h('p', { class: 'ai' }, '● 建議　○ 可用但非首選。依講義模型比較總表整理。')); }
    $('#w-pick').append(out); draw();
  })();

  // ================= P14 Loan Risk 六步 =================
  (function () {
    const R = ['Ref 5.1 切分基準（stratified？）', 'Ref 5.2 不平衡處理', 'Ref 5.3 Compare ROCs', 'Ref 5.4 決策樹調參', 'Ref 5.5 CV＋參數最佳化', 'Ref 5.6 門檻最佳化'], K = [['acc', 'Accuracy'], ['prec', 'Precision'], ['rec', 'Recall'], ['auc', 'AUC']];
    const st = Store.get('m22:loan', {}); const out = h('div');
    function draw() { out.innerHTML = '';
      const t = h('table', { class: 'dt' }, h('tr', null, h('th', null, '步驟'), K.map(k => h('th', null, k[1])), h('th', null, 'Recall 變化'), h('th', null, '觀察')), R.map((rn, i) => { const row = st[i] || {}, prev = i ? (st[i - 1] || {}).rec : null, d = prev != null && row.rec != null && prev !== '' && row.rec !== '' ? row.rec - prev : null;
        return h('tr', null, h('td', { style: { fontWeight: 600 } }, rn), K.map(([k]) => { const inp = h('input', { type: 'number', step: 'any', value: row[k] ?? '', style: { width: '70px' } }); inp.onchange = () => { st[i] = { ...(st[i] || {}), [k]: inp.value === '' ? '' : +inp.value }; Store.set('m22:loan', st); draw(); }; return h('td', null, inp); }), h('td', { class: 'num ' + (d == null ? '' : d > 0 ? 'ok' : 'hl') }, d == null ? '—' : (d > 0 ? '+' : '') + d.toFixed(3)), h('td', null, (() => { const i2 = h('input', { type: 'text', value: row.note || '', style: { width: '200px' } }); i2.onchange = () => { st[i] = { ...(st[i] || {}), note: i2.value }; Store.set('m22:loan', st); }; return i2; })())); }));
      const dl = h('button', { class: 'btn primary sm' }, '下載 CSV'); dl.onclick = () => { const csv = '﻿步驟,Accuracy,Precision,Recall,AUC,觀察\n' + R.map((rn, i) => { const r = st[i] || {}; return [rn, r.acc ?? '', r.prec ?? '', r.rec ?? '', r.auc ?? '', `"${(r.note || '').replace(/"/g, '""')}"`].join(','); }).join('\n'); const a = h('a', { href: URL.createObjectURL(new Blob([csv], { type: 'text/csv' })), download: 'M2-2_LoanRisk六步表.csv' }); document.body.append(a); a.click(); a.remove(); };
      out.append(h('div', { class: 'row', style: { marginBottom: '8px' } }, dl), h('div', { class: 'tscroll' }, t), h('p', { class: 'ai' }, '檔案：範例/ML (AI Studio)/M2. 監督式學習/4.3.3 Loan Risk/ Ref 5.1–5.6。5.5 的 CV 分數通常略低——這才是誠實的估計；5.6 的最佳門檻不一定是 0.5。另有 HR Churn（特徵選擇與 Lift Chart）與自動模型選擇八步曲。')); }
    $('#w-loan').append(out); draw();
  })();
  (function () {
    const T = [['目標定義', '時間窗、事件定義、分母、預測時點四要素', 'P2'], ['基準線', '類別比例與「全判多數類」的 Accuracy', 'P6'], ['六模型比較', 'stratified 5-fold CV：Logistic、kNN、NB、樹、森林、梯度提升；四指標平均 ± 標準差＋Compare ROCs', 'P3–P5、P11–P12'], ['混淆矩陣六指標', '對最佳模型手算六個指標', 'P6'], ['不平衡與門檻', '至少比較兩種處理；取樣只在訓練折；門檻依代價比與容量選定', 'P8–P9'], ['勝算比與樹的解讀', '三個變數的 OR 與臨床解讀；印出樹、描述前兩層分裂邏輯', 'P4、P11'], ['盛行率敏感度', '部署到「盛行率減半」場域時的 PPV 變化', 'P7']];
    const st = Store.get('m22:tasks', {}); const out = h('div');
    function draw() { out.innerHTML = ''; T.forEach(([t, d, p], i) => { const c = h('input', { type: 'checkbox' }); c.checked = !!st[i]; c.onchange = () => { st[i] = c.checked; Store.set('m22:tasks', st); draw(); }; out.append(h('label', { style: { display: 'flex', gap: '10px', padding: '7px 4px', borderBottom: '1px solid var(--line)', cursor: 'pointer' } }, c, h('div', { style: { flex: 1 } }, h('b', { style: { textDecoration: st[i] ? 'line-through' : 'none' } }, `任務 ${i + 1}　${t}`), h('div', { style: { fontSize: '13.5px', color: 'var(--muted)' } }, d)), h('span', { class: 'tag gray' }, p))); });
      out.append(h('p', { class: 'ai' }, '與迴歸篇合併一份報告，第 6 週上課前繳交，不另計分。回饋規準：目標與資料界定 15、方法正確性 25、評估完整性 25、解讀與臨床意義 20、報告品質 15。')); }
    $('#w-tasks').append(out); draw();
  })();
  U.flashcards('#w-cards', [['二元分類', 'Binary Classification', '目標只有兩種值'], ['決策門檻', 'Decision Threshold', '機率高於此值判為陽性；0.5 只是預設'], ['混淆矩陣', 'Confusion Matrix', 'TP、FP、FN、TN 四格'], ['敏感度', 'Sensitivity / Recall', '真的有病的，抓到幾成'], ['特異度', 'Specificity', '沒病的，正確排除幾成'], ['陽性預測值', 'PPV / Precision', '說有病的，幾成真的有'], ['陰性預測值', 'NPV', '說沒病的，幾成真的沒有'], ['盛行率', 'Prevalence', '陽性在母體中的比例；左右 PPV'], ['ROC 曲線', 'ROC Curve', 'FPR 對 TPR，掃過所有門檻'], ['曲線下面積', 'AUC', '隨機一正一負，正例分數較高的機率'], ['PR 曲線', 'Precision-Recall Curve', '不看 TN，不平衡時更誠實'], ['代價比', 'Cost Ratio', '漏一個真陽性＝幾個偽陽性的成本'], ['校準', 'Calibration', '說 70% 就真的 70% 發生'], ['勝算比', 'Odds Ratio', 'e^β；勝算的倍數'], ['類別不平衡', 'Imbalanced Data', '少數類遠少於多數類'], ['過取樣／SMOTE', 'Oversampling / SMOTE', '複製或內插少數類；只在訓練集做'], ['類別權重', 'Class Weight', '加重少數類的錯誤代價'], ['分層切分', 'Stratified Split', '每份維持類別比例'], ['巢狀交叉驗證', 'Nested CV', '內層選參數、外層估效能'], ['學習曲線', 'Learning Curve', '隨樣本數增加的訓練與驗證分數'], ['Gini 不純度', 'Gini Impurity', '隨機抽兩筆類別不同的機率'], ['剪枝', 'Pruning', '限制樹的成長以避免過擬合'], ['特徵重要性', 'Feature Importance', '不純度下降總和；ID 欄位排前面是洩漏警訊'], ['隨機森林', 'Random Forest', 'Bagging＋隨機特徵的樹群投票'], ['梯度提升', 'Gradient Boosting', '序列地修正前面的殘差'], ['袋外驗證', 'Out-of-Bag (OOB)', '用沒抽到該筆的樹驗證它']]);
  U.finalQuiz('#w-final', [
    ['再入院率 6% 的資料，「全判不會」的 Accuracy 是？', ['0.06', '0.50', '0.94', '1.00'], 2, '所以不平衡時不能用 Accuracy 當主指標。'],
    ['k-NN 忘了正規化，會發生什麼？', ['跑不動', '距離被值域最大的特徵獨占', '變成 Logistic', 'k 自動變大'], 1, '其他特徵形同虛設。'],
    ['Logistic 係數 β = 0.693，勝算比約為？', ['0.693', '1.0', '2.0', '6.93'], 2, 'e^0.693 ≈ 2：勝算為 2 倍。'],
    ['同一模型從醫院（盛行率 10%）搬到社區（1%），哪個指標會大幅下降？', ['敏感度', '特異度', 'PPV', 'AUC'], 2, '健康人變多，誤報的絕對數碾壓真陽性。'],
    ['盛行率 3% 的問題要比較模型，優先看？', ['Accuracy', 'ROC-AUC 即可', 'PR 曲線／PR-AUC', 'R²'], 2, 'PR 不看 TN，不被龐大負類稀釋。'],
    ['漏一個再入院的代價是無效追蹤的 20 倍，門檻應該？', ['維持 0.5', '往高調', '往低調', '設成 1'], 2, '代價比越大，越該用誤報買回漏網之魚。'],
    ['下列哪一種做法會讓 Precision 虛高？', ['只在訓練折做 SMOTE', '測試集也做 SMOTE', '用類別權重', '調門檻'], 1, '測試集陽性比例被人工拉高。'],
    ['5-fold CV 得到 AUC 0.82 ± 0.09，±0.09 代表？', ['模型很穩', '模型對切分很敏感', 'AUC 被高估 0.09', '應該用 10 折'], 1, '部署後的表現可能落在很寬的範圍。'],
    ['特徵重要性第一名是「病歷號」，最可能是？', ['病歷號真的很重要', '資料洩漏（隱含時間順序）', 'Gini 算錯', '樹太淺'], 1, '刪掉重跑；排序大變代表原模型是假的。'],
    ['五個一模一樣的模型投票，正確率會？', ['大幅提升', '不會提升', '下降', '變成 100%'], 1, '集成的關鍵是成員錯得不一樣。'],
  ]);
  (function () {
    const R = [['先定義目標', '時間窗、事件、分母、預測時點——寫進報告第一節。', 'p02'], ['混淆矩陣家族', 'Accuracy 可能輸給什麼都不做；看 Recall、Precision。', 'p06'], ['盛行率決定 PPV', '換場域就要重估。', 'p07'], ['門檻跟著代價比走', '0.5 只是軟體預設。', 'p08'], ['不平衡三鐵則', '取樣只在訓練折、測試集原分布、不用 Accuracy。', 'p09'], ['解釋與預測可以分開', 'Logistic／樹給解釋，森林／提升拚效能。', 'p13']];
    const g = h('div', { class: 'grid3' }); R.forEach(([t, d, id], i) => g.append(h('a', { href: '#' + id, style: { textDecoration: 'none', color: 'inherit', border: '1px solid var(--line)', borderRadius: '10px', padding: '10px 12px', background: '#fff', display: 'block' } }, h('div', { class: 'mono', style: { color: 'var(--accent)', fontWeight: 700 } }, i + 1), h('b', null, t), h('div', { style: { fontSize: '13.5px', color: 'var(--muted)' } }, d))));
    $('#w-review').append(g, h('div', { class: 'note' }, h('b', null, '下一步：'), 'M3 非監督式學習：分群與降維。', h('a', { href: '../' }, '回到課程首頁 →')));
  })();
})();
