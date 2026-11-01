/* M5 互動頁 B：PART 13–22（CNN、架構、遷移學習、何時不該用、醫學影像、自動化、作業） */
(function () {
  'use strict';
  const { h, $, S, C, rng, randn, seg, slider, check, lc, Store } = U;
  const { cap, row, lbl, nt, ttl, kpi } = window.M5;
  const dl = (name, csv) => { const a = h('a', { href: URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })), download: name }); document.body.append(a); a.click(); a.remove(); };
  const tbl = (head, rows) => h('div', { class: 'tscroll' }, h('table', { class: 'dt' }, h('tr', null, head.map(c => h('th', null, c))), rows.map(r => h('tr', null, r.map((v, j) => v instanceof Node ? h('td', null, v) : h('td', { class: typeof v === 'number' ? 'num' : '', style: { fontWeight: j ? 400 : 600 } }, v))))));
  const fmtN = n => n.toLocaleString();

  // ================= P13 卷積 =================
  (function () {
    const IMG = { v: () => Array.from({ length: 5 }, () => [10, 10, 10, 0, 0]), hz: () => [[10, 10, 10, 10, 10], [10, 10, 10, 10, 10], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0], [0, 0, 0, 0, 0]], d: () => Array.from({ length: 5 }, (_, i) => Array.from({ length: 5 }, (_, j) => j <= i ? 10 : 0)) };
    const KER = { v: ['垂直邊緣', [[1, 0, -1], [1, 0, -1], [1, 0, -1]]], h: ['水平邊緣', [[1, 1, 1], [0, 0, 0], [-1, -1, -1]]], blur: ['模糊（平均）', [[1, 1, 1], [1, 1, 1], [1, 1, 1]].map(r => r.map(v => v / 9))], sharp: ['銳化', [[0, -1, 0], [-1, 5, -1], [0, -1, 0]]] };
    let im = 'v', X = IMG.v(), k = 'v', pad = 0, st = 1, sel = [0, 0]; const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; const K = KER[k][1], N = 5 + 2 * pad, P = Array.from({ length: N }, (_, i) => Array.from({ length: N }, (_, j) => { const a = i - pad, b = j - pad; return a >= 0 && a < 5 && b >= 0 && b < 5 ? X[a][b] : 0; })), O = Math.floor((5 - 3 + 2 * pad) / st) + 1;
      const Y = Array.from({ length: O }, (_, i) => Array.from({ length: O }, (_, j) => { let s = 0; for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) s += P[i * st + a][j * st + b] * K[a][b]; return s; }));
      if (sel[0] >= O || sel[1] >= O) sel = [0, 0]; const [si, sj] = sel, r0 = si * st, c0 = sj * st;
      const cellS = { width: '38px', height: '38px', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: '13px', border: '1px solid var(--line)' };
      const tin = h('table', { style: { borderCollapse: 'collapse' } }, P.map((rw, i) => h('tr', null, rw.map((v, j) => { const inWin = i >= r0 && i < r0 + 3 && j >= c0 && j < c0 + 3, isPad = i < pad || j < pad || i >= 5 + pad || j >= 5 + pad; const td = h('td', { style: { ...cellS, background: isPad ? '#f3f1ec' : v ? '#e7e2d6' : '#3c4652', color: isPad ? '#b0aaa0' : v ? 'var(--ink)' : '#fff', outline: inWin ? '3px solid ' + C.bad : '', outlineOffset: '-2px', cursor: isPad ? 'default' : 'pointer' } }, String(+v.toFixed(2))); if (!isPad) td.onclick = () => { X[i - pad][j - pad] = X[i - pad][j - pad] ? 0 : 10; draw(); }; return td; }))));
      const tk = h('table', { style: { borderCollapse: 'collapse' } }, K.map(rw => h('tr', null, rw.map(v => h('td', { style: { ...cellS, background: v > 0 ? '#d7ece9' : v < 0 ? '#f6dcd7' : '#fff', fontWeight: 700 } }, String(+v.toFixed(2)))))));
      const mx = Math.max(1, ...Y.flat().map(Math.abs)), to = h('table', { style: { borderCollapse: 'collapse' } }, Y.map((rw, i) => h('tr', null, rw.map((v, j) => { const td = h('td', { style: { ...cellS, background: v >= 0 ? `rgba(13,107,103,${Math.abs(v) / mx * .75})` : `rgba(192,57,43,${Math.abs(v) / mx * .75})`, color: Math.abs(v) / mx > .5 ? '#fff' : 'var(--ink)', outline: i === si && j === sj ? '3px solid ' + C.bad : '', outlineOffset: '-2px', cursor: 'pointer', fontWeight: 700 } }, String(+v.toFixed(1))); td.onclick = () => { sel = [i, j]; draw(); }; return td; }))));
      const terms = []; for (let a = 0; a < 3; a++) for (let b = 0; b < 3; b++) terms.push(`${+P[r0 + a][c0 + b].toFixed(2)}×${+K[a][b].toFixed(2)}`);
      const box = (t, el) => h('div', { style: { textAlign: 'center' } }, h('div', { style: { fontSize: '13px', fontWeight: 700, marginBottom: '4px' } }, t), h('div', { style: { display: 'inline-block' } }, el));
      out.append(h('div', { style: { display: 'flex', gap: '18px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' } }, box(`輸入 ${N}×${N}${pad ? '（含補零）' : ''}`, tin), h('div', { style: { fontSize: '22px' } }, '×'), box(`卷積核：${KER[k][0]}`, tk), h('div', { style: { fontSize: '22px' } }, '='), box(`輸出特徵圖 ${O}×${O}`, to)),
        h('div', { class: 'note', style: { fontFamily: 'var(--mono)', fontSize: '13px' } }, `第 (${si + 1}, ${sj + 1}) 格 = ${terms.join(' + ')} = ${+Y[si][sj].toFixed(2)}`),
        kpi(['輸出尺寸公式', `(5 − 3 + 2×${pad}) / ${st} + 1 = ${O}`]), nt(k === 'v' && Y.flat().some(v => v) ? '垂直邊緣核：左右兩側亮度相同的地方輸出 0，亮暗交界（邊緣）所在的位置數值最大。換成「水平邊緣」影像看看——垂直核就沒反應了。' : 'padding = 1 → 尺寸不變（最常用）；stride = 2 → 尺寸減半（用來降維）。實際 CNN 裡卷積核的數值是模型學出來的：淺層會自己學出類似這些的邊緣、紋理偵測器。')); }
    ctl.append(row(lbl('輸入影像'), seg([['v', '左亮右暗（講義）'], ['hz', '上亮下暗'], ['d', '對角']], () => im, v => { im = v; X = IMG[v](); }, draw), lbl('卷積核'), seg(Object.entries(KER).map(([kk, v]) => [kk, v[0]]), () => k, v => k = v, draw)), row(lbl('padding'), seg([[0, '0'], [1, '1（same）']], () => pad, v => pad = v, draw), lbl('stride'), seg([[1, '1'], [2, '2']], () => st, v => st = v, draw)));
    $('#w-conv').append(ctl, out); draw();
  })();

  // ================= P14 池化、CNN 流程 =================
  (function () {
    const M0 = [[12, 20, 30, 0], [8, 12, 2, 0], [34, 70, 37, 4], [112, 100, 25, 12]]; let mode = 'max', shift = false; const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; const M = shift ? M0.map(r => [0, ...r.slice(0, 3)]) : M0, Q = [[0, 0], [0, 2], [2, 0], [2, 2]].map(([a, b]) => { const v = [M[a][b], M[a][b + 1], M[a + 1][b], M[a + 1][b + 1]]; return mode === 'max' ? Math.max(...v) : S.mean(v); });
      const QC = ['#d7ece9', '#f6e3c8', '#dde7f5', '#ece0f7'], cs = { width: '44px', height: '40px', textAlign: 'center', fontFamily: 'var(--mono)', border: '2px solid #fff' };
      const t1 = h('table', { style: { borderCollapse: 'collapse' } }, M.map((r, i) => h('tr', null, r.map((v, j) => { const q = (i >= 2 ? 2 : 0) + (j >= 2 ? 1 : 0), blk = [M[i - i % 2][j - j % 2], M[i - i % 2][j - j % 2 + 1], M[i - i % 2 + 1][j - j % 2], M[i - i % 2 + 1][j - j % 2 + 1]], isMax = mode === 'max' && v === Math.max(...blk); return h('td', { style: { ...cs, background: QC[q], fontWeight: isMax ? 800 : 400, textDecoration: isMax ? 'underline' : 'none' } }, v); }))));
      const t2 = h('table', { style: { borderCollapse: 'collapse' } }, [0, 1].map(i => h('tr', null, [0, 1].map(j => h('td', { style: { ...cs, width: '64px', height: '56px', background: QC[i * 2 + j], fontWeight: 800, fontSize: '16px' } }, +Q[i * 2 + j].toFixed(1))))));
      out.append(h('div', { style: { display: 'flex', gap: '24px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' } }, h('div', null, ttl(`特徵圖 4×4${shift ? '（整張右移一格）' : ''}`), t1), h('div', { style: { fontSize: '20px' } }, `→ ${mode === 'max' ? '取每區塊最大值' : '取每區塊平均'} →`), h('div', null, ttl('2×2'), t2)),
        nt(shift ? (mode === 'max' ? '整張圖右移一格，最大池化的結果有三格完全沒變——物體稍微移動，結果仍相近：這就是平移不變性。' : '平均池化對位移比較敏感，數值都變了一些。') : '最大池化保留「最強的訊號」→ 影像分類主流；平均池化較平滑 → 常用在網路最末端。池化沒有參數要學。★ 醫學影像要小心：病灶的精確位置有時很重要，過度池化會把位置資訊丟掉。', shift && mode === 'max' ? '' : '')); }
    ctl.append(row(seg([['max', '最大池化'], ['avg', '平均池化']], () => mode, v => mode = v, draw), check('把輸入右移一格（平移）', () => shift, v => shift = v, draw)));
    $('#w-pool').append(ctl, out); draw();
  })();
  (function () {
    let f1 = 32, f2 = 64, k = 3, pad = 'valid', d = 0; const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; const p = pad === 'same' ? (k - 1) / 2 : 0, c1 = 28 - k + 2 * p + 1, p1 = Math.floor(c1 / 2), c2 = p1 - k + 2 * p + 1, p2 = Math.floor(c2 / 2), flat = p2 * p2 * f2;
      const L = [['輸入影像', `28×28×1`, 0, '灰階手寫數字'], [`卷積 ${k}×${k} ×${f1} ＋ ReLU`, `${c1}×${c1}×${f1}`, (k * k * 1 + 1) * f1, '淺層：邊緣、線條'], ['最大池化 2×2', `${p1}×${p1}×${f1}`, 0, '尺寸減半'], [`卷積 ${k}×${k} ×${f2} ＋ ReLU`, `${c2}×${c2}×${f2}`, (k * k * f1 + 1) * f2, '中層：紋理、形狀'], ['最大池化 2×2', `${p2}×${p2}×${f2}`, 0, '再減半'], ['展平 Flatten', String(flat), 0, '攤成一維'], ...(d ? [[`全連接 ${d} ＋ ReLU`, String(d), (flat + 1) * d, '整合特徵']] : []), ['全連接 10 ＋ Softmax', '10 類', ((d || flat) + 1) * 10, '輸出 0–9']];
      const tot = S.sum(L.map(l => l[2])), fc = 784 * 128 + 128 * 10;
      out.append(tbl(['層', '輸出尺寸', '參數量', '這一層在做什麼'], L.map(([a, b, c, e]) => [a, b, c ? fmtN(c) : '—', e])), kpi(['CNN 總參數', fmtN(tot)], ['對照：784 → 128 → 10 全連接', fmtN(fc)], ['影像 224×224×3 接 1000 神經元（第一層）', fmtN(224 * 224 * 3 * 1000), 'bad']),
        nt(`空間尺寸逐步縮小（28 → ${c1} → ${p1} → ${c2} → ${p2}），通道數逐步增加（1 → ${f1} → ${f2}）：位置資訊逐步換成語意資訊。${d ? '' : '講義的設定（32、64、3×3、不補零、無中間全連接層）展平後是 1,600 維。'}卷積層靠權重共享，參數量遠少於把影像展平直接接全連接。注意參數大多集中在最後的全連接層——VGG 之後的架構改用全域平均池化，就是為了解決這個問題。`)); }
    ctl.append(row(lbl('第 1 層卷積核數'), seg([[8, '8'], [16, '16'], [32, '32'], [64, '64']], () => f1, v => f1 = v, draw), lbl('第 2 層'), seg([[16, '16'], [32, '32'], [64, '64'], [128, '128']], () => f2, v => f2 = v, draw)), row(lbl('卷積核'), seg([[3, '3×3'], [5, '5×5']], () => k, v => k = v, draw), lbl('padding'), seg([['valid', '不補零'], ['same', 'same']], () => pad, v => pad = v, draw), lbl('中間全連接層'), seg([[0, '無'], [128, '128']], () => d, v => d = v, draw)));
    $('#w-flow').append(ctl, out); draw();
  })();

  // ================= P15 參數量 =================
  (function () {
    let Cn = 64; const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; const s = Math.max(1, Math.round(Cn / 8)), e = Cn / 2;
      const P = [['VGG：等效 5×5', '一個 5×5', 25 * Cn * Cn, '兩個 3×3 堆疊', 18 * Cn * Cn, '每層之間都有 ReLU：非線性多一倍'], ['VGG：等效 7×7', '一個 7×7', 49 * Cn * Cn, '三個 3×3 堆疊', 27 * Cn * Cn, '感受野相同、參數更少'], ['SqueezeNet：Fire Module', '一般 3×3 卷積', 9 * Cn * Cn, `1×1 壓到 ${s} → 1×1 與 3×3 各展開 ${e}`, Cn * s + s * e + 9 * s * e, '先用 1×1 把通道壓下來，再展開'], ['Xception：深度可分離卷積', '標準 3×3 卷積', 9 * Cn * Cn, '逐通道 3×3 ＋ 1×1 混合', 9 * Cn + Cn * Cn, '空間關聯與通道關聯分開處理（MobileNet 也採用）']];
      const g = h('div', { class: 'grid2' }); P.forEach(([t, a, va, b, vb, why]) => { const red = 1 - vb / va, bx = h('div'), sv = U.svgBox(bx, 360, 86), x = U.scale(0, va, 120, 350);
        [[a, va, '#9aa3ad'], [b, vb, C.accent]].forEach(([n, v, c], i) => { U.s('text', { x: 114, y: 26 + i * 34, 'text-anchor': 'end', text: n.length > 12 ? n.slice(0, 12) + '…' : n, style: 'font-size:11px' }, sv); U.s('rect', { x: 120, y: 12 + i * 34, width: Math.max(2, x(v) - 120), height: 22, fill: c, rx: 3 }, sv); U.s('text', { x: Math.min(x(v) + 4, 300), y: 28 + i * 34, text: fmtN(v), style: `font-size:11px;font-weight:700;fill:${v / va > .8 ? '#fff' : '#1c2430'}`, dx: v / va > .8 ? -60 : 0 }, sv); });
        g.append(h('div', { style: { border: '1px solid var(--line)', borderRadius: '10px', padding: '10px', background: '#fff' } }, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, ttl(t), h('span', { class: 'tag good' }, `少 ${(red * 100).toFixed(1)}%`)), cap(bx, 380), h('div', { style: { fontSize: '12.5px', color: 'var(--muted)' } }, b + '。' + why))); });
      out.append(g, nt(`通道數 C = ${Cn}（不含偏差）。講義的數字：C = 64 時 5×5 為 102,400、兩個 3×3 為 73,728；Fire Module 在 C = 128 時為 12,288（vs 147,456）；深度可分離卷積在 C = 256 時為 67,840（vs 589,824）。為什麼在意參數量：模型要放進手機、平板、床邊裝置時，528 MB 的 VGG16 根本塞不進去。`)); }
    ctl.append(row(lbl('通道數 C'), seg([[64, '64'], [128, '128'], [256, '256'], [512, '512']], () => Cn, v => Cn = v, draw)));
    $('#w-params').append(ctl, out); draw();
  })();
  (function () {
    const Z = [['SimpleCNN', .1, .9, '★ 教學、基準線、小型任務'], ['SqueezeNet', 1.2, 5, '★ 邊緣裝置、行動端部署'], ['Xception', 22.9, 88, '效率與準確度兼顧'], ['ResNet50', 25.6, 98, '★ 醫學影像遷移學習的預設起點'], ['VGG16', 138, 528, '通用特徵抽取；但太肥'], ['VGG19', 144, 549, '表徵略強，過擬合風險也升高']];
    const b = h('div'), sv = U.svgBox(b, 640, 230), x = U.scale(Math.log10(.5), Math.log10(800), 110, 620);
    [1, 10, 100, 600].forEach(t => { U.s('line', { x1: x(Math.log10(t)), x2: x(Math.log10(t)), y1: 8, y2: 200, class: 'grid' }, sv); U.s('text', { x: x(Math.log10(t)), y: 218, 'text-anchor': 'middle', text: t + ' MB' }, sv); });
    Z.forEach(([n, p, mb], i) => { const y = 22 + i * 31; U.s('text', { x: 104, y: y + 4, 'text-anchor': 'end', text: n, style: 'font-weight:600' }, sv); U.s('rect', { x: 110, y: y - 9, width: x(Math.log10(mb)) - 110, height: 18, fill: n === 'ResNet50' ? C.accent : n === 'SqueezeNet' ? C.blue : n === 'SimpleCNN' ? C.amber : '#b0b7be', rx: 3 }, sv); U.s('text', { x: x(Math.log10(mb)) + 5, y: y + 4, text: `${mb < 1 ? '< 1' : mb} MB · ${p}M 參數`, style: 'font-size:11px' }, sv); });
    $('#w-zoo').append(cap(b, 660), tbl(['模型', '參數量', '檔案', '最適合的用途'], Z.map(([n, p, mb, u]) => [n, p + 'M', (mb < 1 ? '< 1' : mb) + ' MB', u])), nt('課程建議的實驗順序：① SimpleCNN 建立基準線 → ② ResNet50 遷移學習 → ③ 有部署限制時才考慮 SqueezeNet。公平比較：同一份資料、同樣的訓練輪數與資料增強，只換架構。選型三問：資料域接近嗎？資料量夠嗎？要部署在哪裡？同樣是 VGG16，ImageNet、CIFAR-10、VGGFace 預訓練學到的特徵完全不同——權重來源跟架構一樣重要。'));
  })();

  // ================= P16 ResNet =================
  (function () {
    let D = 30, seed = 1; const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; const r = rng(seed), plain = [0], res = [0]; for (let l = 1; l < D; l++) { const a = .45 + .5 * r(), f = (r() - .5) * .4; plain.push(plain[l - 1] + Math.log10(a)); res.push(res[l - 1] + Math.log10(1 + f * .5)); }
      const Ls = Array.from({ length: D }, (_, i) => D - i), b = h('div');
      lc(b, [{ pts: plain.map((v, i) => [D - i, v]), color: C.bad, w: 2.4 }, { pts: res.map((v, i) => [D - i, v]), color: C.accent, w: 2.4 }], { w: 480, h: 250, xmin: 1, xmax: D, ymin: Math.min(-1, Math.floor(Math.min(...plain))), ymax: 1, yfmt: t => '10^' + Math.round(t), xl: '第幾層（右＝靠近輸出，左＝第 1 層）', yl: '傳回來的梯度（相對大小）', legend: [['一般深層網路', C.bad], ['殘差網路 x + F(x)', C.accent]], legW: 140 });
      const g1 = 10 ** plain[D - 1];
      out.append(h('div', { class: 'grid2', style: { alignItems: 'center' } }, cap(b, 500), h('div', null, kpi(['一般網路：第 1 層剩', g1 < 1e-3 ? g1.toExponential(1) : g1.toFixed(3), g1 < .01 ? 'bad' : ''], ['殘差網路：第 1 層剩', (10 ** res[D - 1]).toFixed(2), 'good']),
        nt(`一般網路每往回一層，梯度乘上一個小於 1 的數；${D} 層後前面幾層幾乎學不動——56 層反而比 20 層差（退化，連訓練分數都變差，不是過擬合）。殘差塊的梯度是 1 + F′(x)：捷徑讓梯度可以直達前層。另一個角度：殘差網路只要學「該修正多少」F(x) = H(x) − x；這層不需要做什麼時，F(x) 學成 0 就好。`), h('p', { class: 'ai' }, '示意模擬：每層的局部梯度為隨機值。ResNet50 只有 25.6M 參數，準確度卻明顯優於 138M 的 VGG16。')))); }
    ctl.append(row(slider('網路深度（層）', 5, 100, 1, () => D, v => D = v, draw), h('button', { class: 'btn sm', onclick: () => { seed++; draw(); } }, '重抽隨機值')));
    $('#w-res').append(ctl, out); draw();
  })();
  $('#w-evo').append(tbl(['年代', '架構', '核心創新', '解決的問題', '留下的問題'], [['2012', 'AlexNet', 'GPU 訓練深層 CNN＋ReLU＋Dropout', '證明深度學習在影像上可行', '架構隨意'], ['2014', 'VGG', '★ 統一用 3×3 卷積堆疊', '架構規則化、參數效率提升', '全連接層太肥；太深訓練不動'], ['2015', 'ResNet', '★ 殘差捷徑 x + F(x)', '★ 深度不再是障礙', '仍有相當運算量'], ['2016', 'SqueezeNet', 'Fire Module（1×1 壓縮）', '體積比 AlexNet 小 50 倍', '準確度略低'], ['2017', 'Xception', '深度可分離卷積', '運算量大減、準確度維持', '實作較複雜'], ['2020+', 'Vision Transformer', '影像切塊當序列，用注意力', '★ 大資料下超越 CNN', '★ 小資料上仍常輸給 CNN']]), nt('醫學影像資料通常很少——CNN＋遷移學習仍是更務實的選擇。新的不一定適合你。'));

  // ================= P17 遷移學習 =================
  (function () {
    const NS = [100, 300, 1000, 3000, 10000, 30000, 100000]; let ni = 2, sim = 'mid'; const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; const n = NS[ni]; let k, name, time, why;
      if (n < 1000) { k = 4; name = '① 特徵抽取'; time = '分鐘級'; why = '資料很少：凍結全部卷積層，只訓練最後的分類層。'; }
      else if (n < 10000 || sim !== 'far') { k = sim === 'near' ? 3 : 2; name = '② 部分微調'; time = '小時級'; why = sim === 'near' ? '領域相近：凍結大部分，只解凍最深一層＋分類層。' : '最常用的折衷：凍結淺層（通用的邊緣偵測器），解凍深層＋分類層。'; }
      else { k = 0; name = '③ 全部微調'; time = '小時～天'; why = '資料充足且領域差異大：全部解凍，用小學習率重訓。'; }
      const layers = ['卷積層 1（淺）：邊緣、線條', '卷積層 2', '卷積層 3', '卷積層 4（深）：物件部件', '分類層（新）'];
      const dia = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '4px', maxWidth: '360px' } }, layers.map((t, i) => { const fr = i < k; return h('div', { style: { padding: '9px 12px', borderRadius: '8px', background: fr ? '#e9e6df' : i === 4 ? C.bad : C.accent, color: fr ? 'var(--muted)' : '#fff', fontSize: '13.5px', display: 'flex', justifyContent: 'space-between' } }, h('span', null, t), h('b', null, fr ? '🔒 凍結' : '訓練')); }));
      out.append(h('div', { class: 'grid2', style: { alignItems: 'center' } }, dia, h('div', null, kpi(['建議策略', name, 'good'], ['訓練時間', time]), nt(why), nt(`微調時學習率要比從零訓練小一個數量級（例如 1e-4 → 1e-5）：太大會把預訓練好的權重破壞掉——災難性遺忘。輸入格式也要對齊：預訓練模型有固定的輸入尺寸與正規化方式，醫學影像常是灰階與非標準尺寸，要先轉換。`, 'warn')))); }
    ctl.append(row(slider('影像張數', 0, NS.length - 1, 1, () => ni, v => ni = v, draw, v => NS[v].toLocaleString() + ' 張'), lbl('與預訓練資料（ImageNet）的相似度'), seg([['near', '相近'], ['mid', '中等'], ['far', '差異大']], () => sim, v => sim = v, draw)));
    $('#w-tl').append(ctl, out, h('p', { class: 'ai' }, '預訓練來源：ImageNet（自然影像）泛化性較好，是通用起點；資料極少時醫學影像專用預訓練常較佳，資料多時差距縮小（RadImageNet，Mei et al., 2022）。')); draw();
  })();

  // ================= P18 何時不該用 =================
  (function () {
    const Q = [['① 資料型態', '是影像、語音或長文本嗎？', '不是 → 用樹模型。表格資料上 XGBoost 等樹模型長期領先（Grinsztajn et al., 2022）；2025 年 TabPFN 在萬筆以下小表格開始挑戰此結論。'], ['② 資料量', '有上萬筆嗎？（遷移學習例外）', '沒有 → 從零訓練幾乎一定過擬合。影像可走遷移學習。'], ['③ 可解釋性', '可以接受「說不出理由」嗎？', '需要逐案解釋判斷依據 → 慎用。醫療決策場景要三思。'], ['④ 算力與維運', '有 GPU、也有人長期維護嗎？', '沒有 → 先別開始。★ 沒人維護的系統就是廢墟。']];
    const A = [null, null, null, null]; const out = h('div');
    function draw() { out.innerHTML = ''; let stop = -1; for (let i = 0; i < 4; i++) { if (A[i] === false) { stop = i; break; } if (A[i] == null) break; }
      Q.forEach(([t, q, no], i) => { const active = (stop < 0 || i <= stop) && (i === 0 || A[i - 1] === true || (A[i - 1] === false && false)); const reached = i === 0 || A.slice(0, i).every(v => v === true);
        out.append(h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center', padding: '8px 10px', margin: '4px 0', borderRadius: '10px', border: '1px solid ' + (A[i] === false ? C.bad : A[i] ? C.accent : 'var(--line)'), background: reached ? '#fff' : '#f3f1ec', opacity: reached ? 1 : .5 } }, h('b', { style: { width: '110px' } }, t), h('div', { style: { flex: 1, fontSize: '14px' } }, q, A[i] === false ? h('div', { style: { color: 'var(--bad)', fontSize: '13px' } }, no) : ''), ...(reached ? [h('button', { class: 'btn sm' + (A[i] === true ? ' on' : ''), onclick: () => { A[i] = true; for (let j = i + 1; j < 4; j++) if (A[j] === false) A[j] = null; draw(); } }, '是'), h('button', { class: 'btn sm', style: A[i] === false ? { background: 'var(--bad)', color: '#fff', borderColor: 'var(--bad)' } : {}, onclick: () => { A[i] = false; for (let j = i + 1; j < 4; j++) A[j] = null; draw(); } }, '否')] : []))); });
      const all = A.every(v => v === true); out.append(nt(all ? '四道關卡全部通過：影像／語音／長文本＋資料充足＋可接受黑箱＋有算力與維運 → 深度學習是對的工具。' : stop >= 0 ? `停在${Q[stop][0]}：這個問題不該用深度學習（或先別開始）。用在表格資料上而輸給 XGBoost，不是調參技術不好，是工具本來就選錯了。` : '從第一關開始回答。', all ? '' : stop >= 0 ? 'warn' : ''), h('button', { class: 'btn sm', onclick: () => { A.fill(null); draw(); } }, '↺ 重來')); }
    $('#w-gate').append(out); draw();
  })();
  U.sorter('#w-cases', [['預測 30 天再入院（病歷欄位 8,000 筆）', 'XGBoost（M4）', '表格、量不大、需要解釋。'], ['胸部 X 光異常篩檢（影像 3,000 張）', '遷移學習', '影像但資料少：凍結卷積層。'], ['護理紀錄分類（文字 5,000 筆）', 'TF-IDF＋邏輯斯（M6）', '先建立傳統基準線，或微調小型語言模型。'], ['急診人次預測（3 年日資料）', '樹模型＋滯後特徵', '序列太短，LSTM 會過擬合。'], ['語音轉文字', '現成預訓練模型', '不要自己訓練——用 Whisper 等成熟模型。']], ['XGBoost（M4）', '遷移學習', 'TF-IDF＋邏輯斯（M6）', '樹模型＋滯後特徵', '現成預訓練模型'], '五個情境中只有一個真的需要你自己訓練深度學習模型，而且還是遷移學習——這相當接近實務比例。');

  // ================= P19 捷徑學習 =================
  (function () {
    const auc = (s, y) => { const o = s.map((v, i) => [v, y[i]]).sort((a, b) => a[0] - b[0]); let rk = 0, sp = 0, np = 0; o.forEach(([, yy], i) => { if (yy) { sp += i + 1; np++; } }); const nn = o.length - np; return (sp - np * (np + 1) / 2) / (np * nn); };
    const gen = (r, N, pm1, pm0) => Array.from({ length: N }, () => { const y = r() < .3 ? 1 : 0; return { x: [y * 1 + 1.25 * randn(r), (r() < (y ? pm1 : pm0)) ? 1 : 0], y }; });
    const R = rng(1919), TR = gen(R, 600, .85, .15), TA = gen(R, 600, .85, .15), TB = gen(R, 600, .3, .3);
    let useM = true, ext = false; const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; const F = p => useM ? p.x : [p.x[0]], b = ML.logistic(TR.map(F), TR.map(p => p.y), null, { lr: .5, iters: 500 }), sc = P => P.map(p => ML.predict(b, F(p)));
      const aA = auc(sc(TA), TA.map(p => p.y)), aB = auc(sc(TB), TB.map(p => p.y)), w = b.slice(1).map(Math.abs), sw = S.sum(w);
      const bars = h('div', null, h('div', { style: { fontSize: '13px', fontWeight: 700, marginBottom: '4px' } }, '模型主要在看什麼（係數比例）'), ...[['肺部病灶訊號', w[0] / sw, C.accent], ...(useM ? [['片子上的「PORT」標記（攜帶式 X 光機）', w[1] / sw, C.bad]] : [])].map(([n, v, c]) => h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', margin: '5px 0' } }, h('div', { style: { width: '220px', fontSize: '13px' } }, n), h('div', { style: { flex: 1, height: '14px', background: 'var(--line)', borderRadius: '7px', overflow: 'hidden' } }, h('div', { style: { width: v * 100 + '%', height: '100%', background: c } })), h('span', { class: 'mono' }, Math.round(v * 100) + '%'))));
      out.append(h('div', { class: 'grid2', style: { alignItems: 'center' } }, bars, kpi(['院內測試 AUC', aA.toFixed(3), aA > .8 ? 'good' : ''], ['外院（外部驗證）AUC', ext ? aB.toFixed(3) : '？ 還沒做', ext ? (aB < aA - .1 ? 'bad' : 'good') : 'bad'])),
        nt(!ext ? '院內 AUC 很漂亮，所有指標都通過。但這家醫院裡，重症（陽性）病人多半用攜帶式 X 光機拍，片子上有「PORT」標記。打開「外部驗證」看看。' : useM ? `換到外院（標記與病情無關）AUC 掉到 ${aB.toFixed(3)}：模型從未好好學會看肺部，它學會了看標記。只有外部驗證會讓它露餡——或用 Grad-CAM 看模型在看哪裡（M9）。` : `移除標記後，院內 AUC 降到 ${aA.toFixed(3)}，但外院也有 ${aB.toFixed(3)}——這才是模型真正的能力。前處理時移除可能洩漏的資訊（標記、日期、機器型號）。`, ext && useM ? 'bad' : ''),
        h('p', { class: 'ai' }, '模擬資料：陽性盛行率 30%；院內 85% 的陽性有標記、15% 的陰性有標記；外院一律 30%。案例出處：Zech et al., 2018。')); }
    ctl.append(row(check('做外部驗證（換一家醫院）', () => ext, v => ext = v, draw), check('模型可以看到標記', () => useM, v => useM = v, draw)));
    $('#w-short').append(ctl, out, h('div', { class: 'concept' }, ...[['① 資料量永遠不夠', '標註要專科醫師 → 遷移學習＋資料增強＋跨機構合作'], ['② 類別極度不平衡', '陽性往往 < 5% → 代價敏感（M4）＋看 Recall 與 PR 曲線'], ['③ 捷徑學習', '★ 學到的可能不是病灶（上面的模擬）'], ['④ 跨機構泛化差', '外部驗證是必要的，不是加分項'], ['⑤ 標註本身有歧異', '多人標註＋算 Kappa'], ['⑥ 法規與責任', '★ 課堂專題請避開「診斷」類應用']].map(([a, b]) => h('div', null, h('b', null, a), b)))); draw();
  })();
  U.sorter('#w-aug', [['胸部 X 光左右翻轉', '不建議', '心臟在左邊；翻轉後的胸片在真實世界不會出現——那是製造錯誤資料。'], ['小角度旋轉（±10°）', '可以', '角度太大會偏離真實拍攝條件。'], ['隨機裁切，但可能裁掉邊緣的病灶', '不建議', '別裁掉病灶。'], ['調整亮度／對比', '可以', '★ 很有用：模擬不同機器與參數。'], ['加入隨機雜訊', '可以', '模擬影像品質變異。'], ['局部彈性形變', '可以', '模擬器官的自然形變，醫學影像常用。'], ['把影像旋轉 90°', '不建議', '真實拍攝不會這樣擺。']], ['可以', '不建議'], '原則：增強後的影像「在真實世界中應該有可能出現」。');

  // ================= P20 自動化、漂移、錯誤 =================
  (function () {
    const f = (a) => Math.exp(-((a - .73) ** 2) / .006) * .12 + .78; let seed = 1; const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; const G = []; [.15, .5, .85].forEach(a => [.15, .5, .85].forEach(b => G.push([a, b]))); const r = rng(seed * 7), Rn = Array.from({ length: 9 }, () => [r(), r()]);
      const best = P => P.reduce((m, p) => f(p[0]) > f(m[0]) ? p : m), bg = best(G), br = best(Rn);
      const mk = (title, P, bp) => { const b = h('div'); U.scatter(b, P.map(p => ({ x: p[0], y: p[1], c: p === bp ? C.bad : C.accent, r: p === bp ? 7 : 5, op: .9 })), { w: 300, h: 280, xmin: 0, xmax: 1, ymin: 0, ymax: 1, xlabel: '參數 A（重要）', ylabel: '參數 B（其實不重要）', under: [(sv, x, y) => { for (let i = 0; i < 60; i++) { const a = i / 60; U.s('rect', { x: x(a), y: y(1), width: x(1 / 60) - x(0) + .5, height: y(0) - y(1), fill: C.amber, opacity: (f(a + 1 / 120) - .78) / .12 * .45 }, sv); } }] }); return h('div', null, ttl(title), b, h('div', { class: 'mono', style: { fontSize: '13px' } }, `找到的最佳分數：${f(bp[0]).toFixed(3)}`)); };
      out.append(h('div', { class: 'grid2' }, mk('網格搜尋（3 × 3）', G, bg), mk('隨機搜尋（9 次）', Rn, br)), nt(`橘色帶＝參數 A 的好區域（最佳在 0.73 附近）；參數 B 完全不影響分數。網格搜尋 9 次只試了 3 個不同的 A 值，另外 6 次浪費在不重要的 B 上；隨機搜尋 9 次就試了 9 個不同的 A。同樣的預算下，隨機搜尋通常更快找到好解。實務順序：先手動試幾組 → 隨機搜尋擴大範圍 → 貝氏最佳化精修（AI Studio 內建 Grid 與 Evolutionary；貝氏需 Python，如 Optuna）。`)); }
    ctl.append(row(h('button', { class: 'btn sm', onclick: () => { seed++; draw(); } }, '重抽隨機搜尋點')));
    $('#w-search').append(ctl, out); draw();
  })();
  (function () {
    let mon = 'q', th = .8, re = true; const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; const r = rng(2020), every = { m: 1, q: 3, n: 999 }[mon], pts = [], marks = []; let acc = .86, drift = 0, lastRe = 0;
      for (let t = 0; t <= 24; t++) { if (t >= 8) drift += .012; let a = acc - drift + .008 * randn(r); if (re && every < 999 && t % every === 0 && t > 0 && a < th) { drift = 0; a = acc + .008 * randn(r); marks.push(t); } pts.push([t, a]); }
      const b = h('div'); lc(b, [{ pts, color: C.accent, w: 2.4, dots: true }, { pts: [[0, th], [24, th]], color: C.bad, w: 1.4, dash: '5 4' }], { w: 560, h: 240, xmin: 0, xmax: 24, ymin: .55, ymax: .92, xt: [0, 3, 6, 9, 12, 15, 18, 21, 24], xl: '上線後的月份', yl: '實際準確率', marks: [{ x: 8, color: C.amber, label: '換新檢驗儀器' }, ...marks.map(m => ({ x: m, color: C.good, label: '再訓練', dy: 14 }))] });
      const below = pts.filter(p => p[1] < th).length;
      out.append(cap(b, 580), kpi(['低於告警門檻的月數', below + ' 個月', below > 3 ? 'bad' : 'good'], ['再訓練次數', String(marks.length)]), nt(mon === 'n' ? '沒有人監測：模型不會報錯，它會安靜地變得越來越不準——兩年後已經掉到門檻以下很久。技術上不難，難在組織裡沒有人被指派做這件事。' : `每${mon === 'm' ? '月' : '季'}抽樣人工覆核一次，低於門檻就再訓練（重訓後一定要重新驗證）。監測頻率越低，掉在門檻下的時間越長。上線前就要把這件事寫進交付文件、指定負責的人。`, mon === 'n' ? 'bad' : '')); }
    ctl.append(row(lbl('監測頻率'), seg([['m', '每月'], ['q', '每季'], ['n', '沒人監測']], () => mon, v => mon = v, draw), slider('告警門檻', .7, .85, .01, () => th, v => th = v, draw, v => Math.round(v * 100) + '%'), check('低於門檻就再訓練', () => re, v => re = v, draw)));
    $('#w-drift').append(ctl, out, h('p', { class: 'ai' }, '資料漂移的常見來源：換了新的檢驗儀器、改了紀錄方式、人口結構改變、季節或疫情。偵測：監測輸入特徵的分布與缺值率、預測為陽性的比例、定期抽樣人工覆核。多數學生專題只做到「訓練」；把監測與再訓練寫進報告（即使沒做），會讓評審知道你懂完整的生命週期。')); draw();
  })();
  (function () {
    const E = [['忘記標準化特徵', '訓練不收斂或極慢', '★ 一律先做 Z-score'], ['資料量太少卻用大網路', '嚴重過擬合', '參數量別超過樣本數'], ['用測試集調參', '分數虛高，上線就崩', '切三份：訓練／驗證／測試'], ['標準化參數用全部資料算', '資料洩漏', '★ 只用訓練集算，再套用'], ['多標籤問題用 Softmax', '機率被迫加總為 1', '多標籤要用 Sigmoid'], ['沒開早停', '白白訓練到過擬合', '一律開啟'], ['只看準確率', '類別不平衡時毫無意義', '看 Recall、PR-AUC（M2-2）'], ['學習率沒調就說模型不好', 'Loss 亂跳或不動', '★ 先降學習率再說'], ['沒有跟簡單模型比', '不知道有沒有進步', '★ 一定要有梯度提升樹基準線'], ['時間序列資料隨機切分', '嚴重洩漏', '依時間切（M4）']];
    const st = Store.get('m5:err', {}); const out = h('div');
    function draw() { out.innerHTML = ''; E.forEach(([e, c, a], i) => { const cb = h('input', { type: 'checkbox' }); cb.checked = !!st[i]; cb.onchange = () => { st[i] = cb.checked; Store.set('m5:err', st); draw(); }; out.append(h('label', { style: { display: 'flex', gap: '10px', padding: '6px 4px', borderBottom: '1px solid var(--line)', cursor: 'pointer', alignItems: 'baseline' } }, cb, h('b', { class: 'mono', style: { color: 'var(--accent)', width: '22px' } }, i + 1), h('div', { style: { flex: 1 } }, h('b', null, e), h('span', { style: { color: 'var(--bad)', fontSize: '13px' } }, '　→ ' + c), h('div', { style: { fontSize: '13px', color: 'var(--muted)' } }, '避免：' + a)))); });
      out.append(h('p', { class: 'ai' }, `我的專題已檢查 ${E.filter((_, i) => st[i]).length} / 10 項。依發生頻率排序；第 9 項最常被忽略：很多人花兩週調深度學習，最後才發現 XGBoost 跑 5 分鐘就贏了。`)); }
    $('#w-err').append(out); draw();
  })();

  // ================= P21 實作與作業 =================
  (function () {
    const LABS = [['實作 1｜Iris 與 Titanic：逐步加深網路（W8）', '8. Deep Learning/1、2.1、2.2、3、4', ['先跑 Iris，記錄準確率（最單純的三分類）', '★ 打開 2.2，觀察訓練過程的 Loss 曲線', 'Titanic 先跑 1 層 10 個神經元，記錄訓練與驗證分數', '改成 2 層 [50,50]，比較差距', '改成 4 層 [200,200,200,200]，★ 觀察是否過擬合', '在過擬合的設定上加 Dropout 0.3 再跑', '★ 用 M4 的 Gradient Boosted Trees 跑同一份 Titanic，比較誰贏'], '層數加深不一定變好；深網路訓練分數漂亮、驗證分數下降；GBT 很可能贏過所有深度學習設定。'],
      ['實作 2｜MNIST 手寫數字與 Fine-tune（W9）', '8. Deep Learning/5、5.1、6、8', ['跑範例 5，記錄準確率與訓練時間', '★ 對照 P14 的流程圖，找出每一層對應哪個運算', '卷積核數量從 32 改成 8，觀察準確率與速度', '跑範例 6（更多層），比較是否真的更好', '★ 跑 5.1 Fine-tune，觀察凍結了哪些層', '跑範例 8（增量訓練），理解模型可以續訓', '三種設定做成表：準確率、訓練時間、參數量'], '卷積核減少 → 速度快但準確率降；更多層不一定更好；Fine-tune 訓練時間遠短於從零訓練。'],
      ['實作 3｜自動模型選擇與超參數最佳化', 'Export-Import/08、8. Deep Learning/7', ['先手動跑三組網路設定（建立感覺）', '★ Optimize Parameters (Grid)：2 個參數各 3 個值 = 9 組', '觀察執行時間——組合數是相乘不是相加', '改用 Optimize Parameters (Evolutionary)，比較最佳解', '★ 同一份資料跑 GBT，與最佳深度學習設定比較', '匯出模型，再用 Apply Model 載入', '填寫模型比較表'], '網格搜尋時間成本很快就無法接受；演化式通常用更少次數找到相近或更好的解；Telco 這類表格資料上 GBT 很可能勝出。'],
      ['實作 4｜同一資料集比較四種架構', '模型匯入 → 選擇預訓練架構', ['固定資料集、訓練輪數、資料增強——只換架構', '① SimpleCNN 從零訓練：準確率、時間、模型大小', '② VGG16-ImageNet 遷移學習（凍結卷積層）', '③ ResNet50-ImageNet 遷移學習（凍結卷積層）', '④ SqueezeNet 遷移學習', '★ 做成表：準確率／訓練時間／模型大小／推論速度', '★ 寫下：要部署到平板上，你會選哪一個？為什麼？'], 'ResNet50 通常準確率最高；SqueezeNet 略低但檔案小 20 倍以上；「最準」與「最適合」往往不是同一個。']];
    const st = Store.get('m5:labs', {}); const out = h('div');
    function draw() { out.innerHTML = ''; const g = h('div', { class: 'grid2' });
      LABS.forEach(([t, path, steps, exp], li) => { const done = steps.filter((_, i) => st[li + ':' + i]).length; g.append(h('div', { style: { border: '1px solid var(--line)', borderRadius: '10px', padding: '12px 14px', background: '#fff' } }, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('b', null, t), h('span', { class: 'tag ' + (done === steps.length ? 'good' : 'gray') }, `${done} / ${steps.length}`)), h('div', { class: 'mono', style: { fontSize: '12px', color: 'var(--muted)', margin: '4px 0 6px' } }, 'Repository ▸ ' + path),
        steps.map((s, i) => { const c = h('input', { type: 'checkbox' }); c.checked = !!st[li + ':' + i]; c.onchange = () => { st[li + ':' + i] = c.checked; Store.set('m5:labs', st); draw(); }; return h('label', { style: { display: 'flex', gap: '8px', padding: '3px 0', fontSize: '14px', cursor: 'pointer' } }, c, h('span', { style: { textDecoration: c.checked ? 'line-through' : 'none' } }, `${i + 1}. ${s}`)); }), h('div', { class: 'note', style: { fontSize: '13px', marginTop: '6px' } }, h('b', null, '預期結果：'), exp))); });
      out.append(g); }
    $('#w-labs').append(out); draw();
  })();
  (function () {
    const M = ['Logistic Regression（基準）', 'Gradient Boosted Trees（基準）', '[10]', '[50, 50]', '[200, 200]', '[200, 200, 200, 200]', '[50, 50] ＋ Dropout 0.3'], st = Store.get('m5:t1', {}); const out = h('div');
    function draw() { out.innerHTML = ''; const v = (i, k) => { const x = (st[i] || {})[k]; return x === '' || x == null ? null : +x; };
      const t = h('table', { class: 'dt' }, h('tr', null, ['設定', '訓練準確率', '驗證準確率', '差距', 'AUC', '訓練時間（秒）'].map(c => h('th', null, c))), M.map((m, i) => { const tr = v(i, 'tr'), va = v(i, 'va'), gap = tr != null && va != null ? tr - va : null, inp = k => { const e = h('input', { type: 'number', step: 'any', value: (st[i] || {})[k] ?? '', style: { width: '84px' } }); e.onchange = () => { st[i] = { ...(st[i] || {}), [k]: e.value }; Store.set('m5:t1', st); draw(); }; return h('td', null, e); };
        return h('tr', null, h('td', { style: { fontWeight: 600 } }, m), inp('tr'), inp('va'), h('td', { class: 'num ' + (gap != null && gap > .05 ? 'hl' : '') }, gap == null ? '—' : (gap > 0 ? '+' : '') + gap.toFixed(3) + (gap > .05 ? ' 過擬合' : '')), inp('auc'), inp('time')); }));
      const vs = M.map((_, i) => v(i, 'va')), have = vs.filter(x => x != null).length; let msg = '填入 AI Studio 的結果（準確率用 0–1）。差距 > 0.05 會標示為過擬合。';
      if (have >= 3) { const bi = vs.reduce((b, x, i) => x != null && (b < 0 || x > vs[b]) ? i : b, -1), dl1 = vs.slice(2).filter(x => x != null), bestDL = dl1.length ? Math.max(...dl1) : null, base = Math.max(vs[0] ?? -1, vs[1] ?? -1);
        msg = `驗證準確率最高的是「${M[bi]}」。${bestDL != null && base > 0 ? (bestDL > base ? `最好的深度學習設定（${bestDL.toFixed(3)}）贏過基準線（${base.toFixed(3)}）——差多少？值得多付出的成本與可解釋性嗎？` : `深度學習最好只有 ${bestDL.toFixed(3)}，沒有贏過基準線（${base.toFixed(3)}）。任務三要從資料型態（表格）與資料量（768 筆）分析原因。`) : ''}`; }
      const btn = h('button', { class: 'btn primary sm', onclick: () => dl('M5_作業二_任務一.csv', '設定,訓練準確率,驗證準確率,差距,AUC,訓練時間\n' + M.map((m, i) => { const r = st[i] || {}; const g = r.tr && r.va ? (r.tr - r.va).toFixed(3) : ''; return [`"${m}"`, r.tr ?? '', r.va ?? '', g, r.auc ?? '', r.time ?? ''].join(','); }).join('\n')) }, '下載 CSV');
      const demo = h('button', { class: 'btn sm', onclick: () => { [[.78, .77, .83, 1], [.86, .76, .82, 3], [.79, .75, .80, 4], [.84, .74, .80, 6], [.93, .72, .78, 9], [.99, .69, .74, 21], [.82, .75, .81, 8]].forEach(([a, b, c, d], i) => st[i] = { tr: a, va: b, auc: c, time: d }); Store.set('m5:t1', st); draw(); } }, '填入示範數字');
      const clr = h('button', { class: 'btn sm', onclick: () => { M.forEach((_, i) => delete st[i]); Store.set('m5:t1', st); draw(); } }, '清除');
      out.append(row(btn, demo, clr), h('div', { class: 'tscroll' }, t), nt(msg), h('p', { class: 'ai' }, '示範數字為虛構，只用來展示功能；請以你自己跑出的結果為準。記得附上至少兩張 Loss 曲線截圖（一張健康、一張過擬合）。')); }
    $('#w-t1').append(out); draw();
  })();
  (function () {
    const T = [['任務一　網路架構實驗（40%）', 'Pima Indians Diabetes（768 筆；先處理偽裝成 0 的遺失值，見 M1）：Logistic 與 GBT 基準線 → 至少五組深度學習設定 → 每組記錄訓練／驗證分數、差距、時間 → ★ 兩張 Loss 曲線截圖', 'P06–P11'], ['任務二　CNN 影像分類（35%）', 'MNIST mini（不得使用真實醫療影像）：跑通基本 CNN → 「卷積核數量」與「層數」各做兩組變化 → ★ 一組 Fine-tune（範例 5.1）→ 三組結果做成表', 'P13–P17'], ['任務三　★ 判斷與論述（25%，分數最重）', '深度學習有贏過 Logistic 與 GBT 嗎？沒有的話原因是什麼（資料型態、資料量）？若要在服務單位導入其中一個，選哪一個？技術理由＋非技術理由（誰維護、出錯怎麼辦、如何說服同仁）。400 字以上', 'P18–P20']];
    const st = Store.get('m5:tasks', {}); const out = h('div');
    function draw() { out.innerHTML = ''; T.forEach(([t, d, p], i) => { const c = h('input', { type: 'checkbox' }); c.checked = !!st[i]; c.onchange = () => { st[i] = c.checked; Store.set('m5:tasks', st); draw(); }; out.append(h('label', { style: { display: 'flex', gap: '10px', padding: '8px 4px', borderBottom: '1px solid var(--line)', cursor: 'pointer' } }, c, h('div', { style: { flex: 1 } }, h('b', { style: { textDecoration: st[i] ? 'line-through' : 'none' } }, t), h('div', { style: { fontSize: '13.5px', color: 'var(--muted)' } }, d)), h('span', { class: 'tag gray', style: { alignSelf: 'flex-start' } }, p))); });
      out.append(h('p', { class: 'ai' }, `已完成 ${T.filter((_, i) => st[i]).length} / 3。繳交：PDF 報告（含流程截圖、Loss 曲線、結果表）＋ .rmp，壓縮為一個檔案；檔名 M5_學號_姓名；W12 繳交。★ 不得使用任何真實醫療影像或病歷資料。`)); }
    $('#w-tasks').append(out); draw();
  })();

  // ================= P22 =================
  U.flashcards('#w-cards', [['深度學習', 'Deep Learning', '多層神經網路自動學表徵'], ['表徵學習', 'Representation Learning', '模型自己學特徵'], ['神經元', 'Neuron', '加權求和＋激活'], ['前向傳播', 'Forward Propagation', '輸入逐層算到輸出'], ['反向傳播', 'Backpropagation', '連鎖律把誤差往回傳'], ['梯度下降', 'Gradient Descent', '沿梯度反方向更新權重'], ['學習率', 'Learning Rate', '步伐大小；不穩時先檢查'], ['Adam', 'Adaptive Moment Estimation', '動量＋自適應學習率；預設'], ['激活函數', 'Activation Function', '引入非線性'], ['ReLU', 'Rectified Linear Unit', 'max(0,x)；隱藏層預設'], ['Softmax', 'Softmax', '多分類；機率加總為 1'], ['梯度消失', 'Vanishing Gradient', '梯度傳回時趨近 0'], ['全連接層', 'Dense Layer', '連到前一層所有神經元'], ['Dropout', 'Dropout', '訓練時隨機關閉神經元'], ['批次正規化', 'Batch Normalization', '每層輸出重新標準化'], ['Epoch', 'Epoch', '整個訓練集掃過一次'], ['批次', 'Batch', '一次送入的樣本數'], ['迭代', 'Iteration', '一次權重更新'], ['交叉熵', 'Cross-Entropy', '分類的標準損失'], ['早停', 'Early Stopping', '驗證不再進步就停'], ['嵌入層', 'Embedding', '類別 → 有距離關係的向量'], ['卷積', 'Convolution', '卷積核滑動做局部加權求和'], ['卷積核', 'Kernel / Filter', '學出來的特徵偵測器'], ['特徵圖', 'Feature Map', '卷積的輸出'], ['步幅', 'Stride', '滑動間隔'], ['補零', 'Padding', '邊緣補零維持尺寸'], ['感受野', 'Receptive Field', '一個輸出對應的輸入範圍'], ['池化', 'Pooling', '取最大或平均縮小特徵圖'], ['平移不變性', 'Translation Invariance', '物體移動結果仍相近'], ['展平', 'Flatten', '多維攤成一維'], ['殘差連接', 'Residual Connection', 'x + F(x)，梯度直達前層'], ['遷移學習', 'Transfer Learning', '以預訓練模型為起點'], ['凍結', 'Freezing', '固定權重不訓練'], ['微調', 'Fine-tuning', '解凍並以小學習率續訓'], ['災難性遺忘', 'Catastrophic Forgetting', '學習率太大破壞預訓練知識'], ['資料增強', 'Data Augmentation', '真實世界可能出現的變換'], ['捷徑學習', 'Shortcut Learning', '學到無關但相關的線索'], ['外部驗證', 'External Validation', '換機構、換機型測試'], ['隨機搜尋', 'Random Search', '同預算下常優於網格'], ['資料漂移', 'Data Drift', '上線後輸入分布改變']]);
  U.finalQuiz('#w-final', [
    ['深度學習與傳統 ML 最核心的差別是？', ['模型比較準', '誰決定特徵', '需要 GPU', '層數比較多'], 1, '把特徵工程交給模型。'],
    ['講義手算例中，h1 = ReLU(0.54)、h2 = ReLU(0.48)，輸出 z = 1.2×0.54 − 0.7×0.48 + 0.3 = ？', ['0.312', '0.612', '0.948', '1.020'], 1, 'Sigmoid(0.612) = 0.648。'],
    ['所有隱藏層都不用激活函數，100 層網路等於？', ['100 倍強', '1 層線性模型', '隨機森林', '無法訓練'], 1, '線性疊線性還是線性。'],
    ['Loss 上下亂跳，第一個該懷疑的是？', ['層數', '學習率', 'Dropout', '標準化'], 1, '先降學習率。'],
    ['一位病人可能同時有多個診斷，輸出層應該用？', ['1 個 Sigmoid', 'N 個 Softmax', 'N 個 Sigmoid', '不用激活'], 2, 'Softmax 會強迫機率加總為 1。'],
    ['權重全部初始化為 0，會發生什麼？', ['訓練更快', '所有隱藏神經元學到一模一樣的東西', '梯度爆炸', '沒有影響'], 1, '對稱永遠打不破。'],
    ['1,000 筆、batch_size = 100、30 個 epoch，權重共更新幾次？', ['30', '100', '300', '3,000'], 2, '10 × 30 = 300。'],
    ['訓練 Loss 持續降、驗證 Loss 從第 12 epoch 開始升，最先做的是？', ['加 Dropout', '早停在第 12 epoch', '加深網路', '換優化器'], 1, '早停 → 減少容量 → 才加 Dropout。'],
    ['5×5 輸入、3×3 卷積核、padding 0、stride 1，輸出尺寸是？', ['2×2', '3×3', '4×4', '5×5'], 1, '(5 − 3 + 0) / 1 + 1 = 3。'],
    ['兩個 3×3 卷積堆疊取代一個 5×5，好處不包括？', ['參數更少', '非線性更多', '感受野相同', '感受野更大'], 3, '感受野相同（都是 5×5）。'],
    ['醫學影像只有 600 張，遷移學習最合適的策略是？', ['從零訓練', '特徵抽取（凍結全部卷積層）', '全部微調', '不能做'], 1, '資料 < 1,000 張的首選。'],
    ['X 光模型院內準確率 94%，導入前最不可少的是？', ['再加一層', '外部驗證', '換成 VGG', '提高學習率'], 1, '捷徑學習只有外部驗證會露餡。'],
  ]);
  (function () {
    const R = [['誰決定特徵', '深度學習＝把特徵工程交給模型。', 'p01'], ['沒有魔法', '加權求和＋非線性，重複幾百萬次。', 'p03'], ['非線性是存在前提', '沒有激活函數，100 層等於 1 層。', 'p04'], ['80% 時間看 Loss 曲線', '四種樣態與處方。', 'p10'], ['過擬合處理順序', '早停 → 減少容量 → Dropout 與正則化。', 'p11'], ['參數量別超過樣本數', '否則是背答案。', 'p06'], ['不要從零訓練', '醫學影像：遷移學習＋資料增強。', 'p17'], ['★ 什麼時候不該用', '表格資料多半是樹模型的主場。', 'p18'], ['外部驗證是必要條件', '捷徑學習只有它會抓出來。', 'p19']];
    const g = h('div', { class: 'grid3' }); R.forEach(([t, d, id], i) => g.append(h('a', { href: '#' + id, style: { textDecoration: 'none', color: 'inherit', border: '1px solid var(--line)', borderRadius: '10px', padding: '10px 12px', background: '#fff', display: 'block' } }, h('div', { class: 'mono', style: { color: 'var(--accent)', fontWeight: 700 } }, i + 1), h('b', null, t), h('div', { style: { fontSize: '13.5px', color: 'var(--muted)' } }, d))));
    $('#w-review').append(g, h('div', { class: 'note' }, h('b', null, '下一步：'), 'M6 NLP 與文字探勘：讓電腦讀懂文字。', h('a', { href: '../' }, '回到課程首頁 →')));
  })();
})();
