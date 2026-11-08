/* M9 加強版（2026-11）：COMPAS 真實資料的公平性不可能定理、24 個子群體稽核與信賴區間、置換重要性與代理特徵 */
(function () {
  'use strict';
  const { h, $, S, fmt, seg, check, slider, C } = U;
  const kpi = (k, v, cls) => h('div', null, h('div', { class: 'k' }, k), h('div', { class: 'v' + (cls ? ' ' + cls : '') }, v));
  const sub = t => h('div', { style: { fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' } }, t);
  const lab = t => h('span', { style: { fontSize: '13px', color: 'var(--muted)' } }, t);
  const note = (msg, cls) => h('div', { class: 'note' + (cls ? ' ' + cls : ''), style: { marginTop: '10px' } }, h('b', null, '看懂了什麼：'), msg);
  const pc = v => (v * 100).toFixed(0) + '%';
  const wilson = (k, n, z = 1.96) => { if (!n) return [0, 1]; const p = k / n, d = 1 + z * z / n, c = (p + z * z / (2 * n)) / d, m = z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n)) / d; return [Math.max(0, c - m), Math.min(1, c + m)]; };

  /* ====================================================================
     ① 第 08 節：COMPAS 真實資料——校準了，誤判率卻差一倍
     ==================================================================== */
  (function compas() {
    const box = $('#w-compas'); if (!box) return;
    // ProPublica（2016）公開資料，依其篩選條件後：每個風險分數（1–10）的 [兩年內沒再犯, 有再犯] 人數
    const T = {
      非裔: [[280, 85], [241, 105], [173, 125], [179, 158], [165, 158], [131, 187], [134, 209], [86, 215], [88, 229], [37, 190]],
      白人: [[477, 128], [221, 100], [156, 82], [145, 98], [109, 91], [67, 93], [45, 68], [24, 72], [22, 55], [15, 35]]
    };
    const G = Object.keys(T), GC = { 非裔: C.bad, 白人: C.blue };
    let cut = 5;
    function stat(g) { const t = T[g], neg = S.sum(t.map(z => z[0])), pos = S.sum(t.map(z => z[1])), fp = S.sum(t.slice(cut - 1).map(z => z[0])), tp = S.sum(t.slice(cut - 1).map(z => z[1])); return { n: neg + pos, base: pos / (neg + pos), fpr: fp / neg, fnr: 1 - tp / pos, ppv: tp / (tp + fp), sel: (tp + fp) / (neg + pos) }; }
    const out = h('div');
    function draw() {
      out.innerHTML = '';
      out.append(h('div', { class: 'row', style: { gap: '10px', marginBottom: '10px' } }, slider('分數幾分以上算「高風險」', 2, 9, 1, () => cut, v => cut = v, draw)));
      const st = Object.fromEntries(G.map(g => [g, stat(g)]));
      out.append(h('div', { class: 'kpi', style: { marginBottom: '10px' } }, kpi('人數', `非裔 ${fmt(st.非裔.n, 0)}・白人 ${fmt(st.白人.n, 0)}`), kpi('兩年內真的再犯（盛行率）', `${pc(st.非裔.base)} vs ${pc(st.白人.base)}`), kpi('預測正確率 PPV（預測公平）', `${pc(st.非裔.ppv)} vs ${pc(st.白人.ppv)}`, Math.abs(st.非裔.ppv - st.白人.ppv) < .08 ? 'good' : ''), kpi('沒再犯卻被判高風險（FPR）', `${pc(st.非裔.fpr)} vs ${pc(st.白人.fpr)}`, 'bad'), kpi('有再犯卻被判低風險（FNR）', `${pc(st.非裔.fnr)} vs ${pc(st.白人.fnr)}`, 'bad')));
      const g = h('div', { class: 'grid2', style: { gap: '18px', alignItems: 'start' } });
      const cal = h('div'); cal.append(sub('校準圖：同一個分數，兩群真的再犯的比例（兩條線很接近＝分數有校準）'));
      U.lc(cal, G.map(gr => ({ pts: T[gr].map((z, i) => [i + 1, z[1] / (z[0] + z[1])]), color: GC[gr], w: 2.4, dots: true })), { w: 440, h: 250, xmin: 1, xmax: 10, ymin: 0, ymax: 1, xl: 'COMPAS 風險分數', yl: '兩年內再犯比例', xt: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10], yfmt: v => Math.round(v * 100) + '%', legend: G.map(gr => [gr, GC[gr]]), marks: [{ x: cut - .5, color: C.ink, label: '高風險門檻' }] });
      const ds = h('div'); ds.append(sub('分數分布：每一分有多少人（深色＝有再犯、淺色＝沒再犯）'));
      G.forEach(gr => { const t = T[gr], mx = Math.max(...Object.values(T).flatMap(z => z.map(q => q[0] + q[1]))); ds.append(h('div', { style: { fontSize: '12.5px', fontWeight: 600, color: GC[gr], margin: '4px 0 2px' } }, gr));
        const row = h('div', { style: { display: 'flex', alignItems: 'flex-end', gap: '3px', height: '80px' } });
        t.forEach((z, i) => row.append(h('div', { title: `${i + 1} 分：沒再犯 ${z[0]}、有再犯 ${z[1]}`, style: { flex: '1', display: 'flex', flexDirection: 'column-reverse', opacity: i + 1 >= cut ? 1 : .45, outline: i + 1 === cut ? '1px dashed #1c2430' : 'none' } }, h('i', { style: { display: 'block', height: z[1] / mx * 78 + 'px', background: GC[gr] } }), h('i', { style: { display: 'block', height: z[0] / mx * 78 + 'px', background: GC[gr], opacity: .3 } }))));
        ds.append(row); });
      ds.append(h('div', { style: { display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--muted)' } }, ...Array.from({ length: 10 }, (_, i) => h('span', null, i + 1))));
      g.append(cal, ds); out.append(g);
      out.append(note(`這是 ProPublica 2016 年公開的美國佛州真實資料。開發商說公平：同一個分數，兩群真的再犯的比例差不多（校準、PPV ${pc(st.非裔.ppv)} vs ${pc(st.白人.ppv)}）。ProPublica 說不公平：沒有再犯的人裡，非裔被判高風險的比例是白人的 ${(st.非裔.fpr / st.白人.fpr).toFixed(1)} 倍（${pc(st.非裔.fpr)} vs ${pc(st.白人.fpr)}）。兩邊的數字都對——當兩群的盛行率不同（${pc(st.非裔.base)} vs ${pc(st.白人.base)}），「校準」和「誤判率相等」在數學上不可能同時成立（Kleinberg 2016、Chouldechova 2017）。移動門檻看看：不論切在哪，FPR 的差距都還在。選哪一種公平，是價值判斷，不是技術問題。`, 'warn'));
    }
    box.append(out); draw();
  })();

  /* ====================================================================
     ② 第 09 節：24 個子群體的稽核——點估計 vs 信賴區間
     ==================================================================== */
  (function subAudit() {
    const box = $('#w-subaudit'); if (!box) return;
    const SEX = ['男', '女'], AGE = ['<65', '65–79', '≥80'], REG = ['北', '中', '南', '東'], RW = [.42, .25, .27, .06];
    let unfair = false, seed = 1, sortBy = 'est';
    function gen() {
      const r = U.rng(seed * 101 + (unfair ? 7 : 0)), P = [];
      for (let i = 0; i < 12000; i++) {
        const s0 = r() < .5 ? 0 : 1, a = r() < .4 ? 0 : r() < .6 ? 1 : 2; let u = r(), g0 = 0; while (u > RW[g0]) { u -= RW[g0]; g0++; }
        const y = r() < .15 ? 1 : 0, bad = unfair && g0 === 3 && a === 2, sep = bad ? .35 : 1.25;
        P.push({ s: s0, a, g: g0, y, sc: (y ? sep : 0) + U.randn(r) });
      }
      const th = P.map(p => p.sc).sort((x, z) => z - x)[Math.round(P.length * .2)];
      P.forEach(p => p.hi = p.sc > th); return P;
    }
    let P = gen();
    const out = h('div');
    function draw() {
      out.innerHTML = '';
      const re = h('button', { class: 'btn sm' }, '↻ 換一批病人'); re.onclick = () => { seed++; P = gen(); draw(); };
      out.append(h('div', { class: 'row', style: { gap: '10px', flexWrap: 'wrap', marginBottom: '10px' } }, lab('情境'), seg([[false, '模型對每一群都一樣好'], [true, '模型對「東部・≥80 歲」真的比較差']], () => unfair, v => { unfair = v; P = gen(); }, draw), re, lab('排序'), seg([['est', '依點估計'], ['n', '依人數']], () => sortBy, v => sortBy = v, draw)));
      const pos = P.filter(p => p.y), all = pos.filter(p => p.hi).length / pos.length;
      const groups = []; SEX.forEach((sx, si) => AGE.forEach((ag, ai) => REG.forEach((rg, gi) => { const ps = pos.filter(p => p.s === si && p.a === ai && p.g === gi), k = ps.filter(p => p.hi).length, n = ps.length; const ci = wilson(k, n); groups.push({ name: `${sx}・${ag}・${rg}`, k, n, est: n ? k / n : 0, ci, out: ci[1] < all || ci[0] > all, target: ai === 2 && gi === 3 }); })));
      groups.sort((a, b) => sortBy === 'n' ? b.n - a.n : a.est - b.est);
      const flagged = groups.filter(g => g.out), worst3 = groups.slice().sort((a, b) => a.est - b.est).slice(0, 3);
      out.append(h('div', { class: 'kpi', style: { marginBottom: '10px' } }, kpi('病人', '12,000 位（再入院 15%）'), kpi('整體 Recall（前 20% 列為高風險）', pc(all)), kpi('點估計最差的一組', `${worst3[0].name} ${pc(worst3[0].est)}`, 'bad'), kpi('信賴區間不含整體值的組', flagged.length + ' / 24', flagged.length ? 'bad' : 'good')));
      const W = 660, rowH = 17, H = groups.length * rowH + 40;
      const ch = h('div'); out.append(sub('每一列一個子群體：點＝Recall 點估計、橫線＝95% 信賴區間（Wilson）、虛線＝整體值；紅色＝區間不含整體值'), ch);
      const svg = U.svgBox(ch, W, H), lw = 130, x = U.scale(0, 1, lw, W - 70);
      [0, .25, .5, .75, 1].forEach(t => { U.s('line', { x1: x(t), x2: x(t), y1: 8, y2: H - 22, class: 'grid' }, svg); U.s('text', { x: x(t), y: H - 6, 'text-anchor': 'middle', text: Math.round(t * 100) + '%' }, svg); });
      U.s('line', { x1: x(all), x2: x(all), y1: 4, y2: H - 22, stroke: C.ink, 'stroke-dasharray': '4 3' }, svg);
      groups.forEach((g, i) => { const y = 14 + i * rowH, col = g.out ? C.bad : g.target && unfair ? C.amber : C.accent;
        U.s('text', { x: lw - 8, y: y + 4, 'text-anchor': 'end', text: g.name, style: `font-size:11.5px;fill:#1c2430;font-weight:${g.target ? 700 : 400}` }, svg);
        U.s('line', { x1: x(g.ci[0]), x2: x(g.ci[1]), y1: y, y2: y, stroke: col, 'stroke-width': 2 }, svg);
        U.s('circle', { cx: x(g.est), cy: y, r: 3.6, fill: col }, svg);
        U.s('text', { x: W - 64, y: y + 4, text: `n=${g.n}`, style: 'font-size:10.5px;fill:#5d6774;font-family:var(--mono)' }, svg); });
      const tg = groups.filter(g => g.target);
      let msg;
      if (!unfair) msg = `這批資料裡，模型對每一群的能力完全一樣（是我們設定的）。可是只看點估計，「${worst3.map(g => g.name).join('」「')}」的 Recall 只有 ${worst3.map(g => pc(g.est)).join('、')}，比整體的 ${pc(all)} 低一截——它們幾乎都是人數很少的組，信賴區間很寬。拆成 24 組、用 95% 信賴區間，平均本來就會有 1 組「看起來顯著」${flagged.length ? `（這次是 ${flagged.length} 組）` : '（這次剛好沒有）'}。按「換一批病人」，最差的組每次都不一樣。稽核表一定要附人數與信賴區間。`;
      else msg = `現在模型對「東部・≥80 歲」真的比較差（橘色／紅色兩列：${tg.map(g => `${g.name} ${pc(g.est)}，n=${g.n}`).join('；')}）。但東部只占 6%、再入院的又只有 15%，這兩組各只有幾十位陽性病人，信賴區間很寬——${tg.every(g => g.out) ? '這次兩組都被抓出來了' : tg.some(g => g.out) ? '這次只有一組被確認' : '這次甚至沒有一組能被統計確認'}。真正的問題要靠「事先指定要看的群體」加上「足夠的樣本」（必要時刻意多收），而不是事後在 24 組裡挑最差的。`;
      out.append(note(msg, unfair ? 'warn' : ''));
    }
    box.append(out); draw();
  })();

  /* ====================================================================
     ③ 第 12 節：置換重要性——功勞會被代理特徵與相關特徵分走
     ==================================================================== */
  (function perm() {
    const box = $('#w-perm'); if (!box) return;
    const R = U.rng(6060), N = 2000;   // 與 M4、M5 同一份 2,000 次出院資料，多加一個「前一年急診次數」
    const F = ['年齡', '前一年住院', '住院天數', '共病數', '用藥數', '白蛋白', '護理之家', '獨居', 'eGFR', '前一年急診'];
    const CAUSAL = [1, 1, 1, 1, 0, 1, 1, 1, 1, 0];
    const X = [], Y = [];
    for (let i = 0; i < N; i++) {
      const age = 70 + 13 * U.randn(R), prior = Math.max(0, Math.round(Math.abs(.5 + 1.2 * U.randn(R)))), los = Math.max(1, Math.round(Math.exp(1.5 + .45 * U.randn(R)))), com = Math.max(0, Math.round(1.5 + 1.2 * U.randn(R)));
      const meds = Math.max(0, Math.round(3 + com * 1.4 + 2 * U.randn(R))), alb = 3.7 + .42 * U.randn(R), nh = R() < .14 ? 1 : 0, alone = R() < .2 ? 1 : 0, egfr = Math.max(8, 75 - .5 * (age - 70) + 18 * U.randn(R));
      const z = -2.9 + .015 * (age - 70) + .45 * Math.min(prior, 4) + .05 * (los - 5) + .15 * com + (alb < 3.2 ? 1.0 : 0) + (egfr < 30 ? .8 : 0) + .6 * nh + (alone && age > 80 ? .9 : 0) + .4 * U.randn(R);
      X.push([age, prior, los, com, meds, alb, nh, alone, egfr, 0]); Y.push(R() < 1 / (1 + Math.exp(-z)) ? 1 : 0);
    }
    const R2 = U.rng(99); X.forEach(x => { x[9] = Math.max(0, Math.round(x[1] * 1.2 + .5 * U.randn(R2))); });   // 前一年急診次數：跟著前一年住院走，但本身不在公式裡
    const TR = [], VA = []; X.forEach((_, i) => (i % 10 < 7 ? TR : VA).push(i));
    const corr19 = (() => { const a = X.map(x => x[1]), b = X.map(x => x[9]), ma = S.mean(a), mb = S.mean(b); let sab = 0, saa = 0, sbb = 0; a.forEach((v, i) => { sab += (v - ma) * (b[i] - mb); saa += (v - ma) ** 2; sbb += (b[i] - mb) ** 2; }); return sab / Math.sqrt(saa * sbb); })();
    const auc = (idx, p) => { const o = idx.map(i => [p(i), Y[i]]).sort((a, b) => b[0] - a[0]); let t = 0, a = 0; const P = S.sum(o.map(z => z[1])), Nn = o.length - P; o.forEach(([, y]) => { if (y) t++; else a += t; }); return a / (P * Nn); };
    const cache = {};
    function fit(use) {
      const key = use.join(''); if (cache[key]) return cache[key];
      const cols = use.map((u, j) => u ? j : -1).filter(j => j >= 0), m = cols.map(j => S.mean(TR.map(i => X[i][j]))), s = cols.map((j, q) => S.sd(TR.map(i => X[i][j])) || 1);
      const zf = (row, q) => (row[cols[q]] - m[q]) / s[q], w = new Array(cols.length + 1).fill(0);
      for (let it = 0; it < 500; it++) { const g = new Array(cols.length + 1).fill(0); TR.forEach(i => { let o = w[cols.length]; cols.forEach((_, q) => o += w[q] * zf(X[i], q)); const d = 1 / (1 + Math.exp(-o)) - Y[i]; cols.forEach((_, q) => g[q] += d * zf(X[i], q)); g[cols.length] += d; }); w.forEach((_, k) => w[k] -= .8 * g[k] / TR.length); }
      const pr = row => { let o = w[cols.length]; cols.forEach((_, q) => o += w[q] * zf(row, q)); return o; };
      const base = auc(VA, i => pr(X[i])), r = U.rng(5);
      const imp = F.map((_, j) => { if (!use[j]) return null; let drop = 0; for (let rep = 0; rep < 3; rep++) { const perm = VA.map(i => X[i][j]); for (let a = perm.length - 1; a > 0; a--) { const b = Math.floor(r() * (a + 1)); [perm[a], perm[b]] = [perm[b], perm[a]]; } const mp = new Map(VA.map((i, k) => [i, perm[k]])); drop += base - auc(VA, i => { const row = X[i].slice(); row[j] = mp.get(i); return pr(row); }); } return drop / 3; });
      return (cache[key] = { base, imp, w, cols });
    }
    let use = [1, 1, 1, 1, 1, 1, 1, 1, 1, 0];
    const out = h('div');
    function draw() {
      out.innerHTML = '';
      const tg = h('div', { class: 'row', style: { gap: '6px 12px', flexWrap: 'wrap', marginBottom: '10px' } }, lab('放進模型的欄位：'), ...F.map((n, j) => check(n, () => !!use[j], v => { use = use.slice(); use[j] = v ? 1 : 0; if (!use.some(Boolean)) use[0] = 1; }, draw)));
      out.append(tg);
      const M = fit(use), ref = fit([1, 1, 1, 1, 1, 1, 1, 1, 1, 0]);
      out.append(h('div', { class: 'kpi', style: { marginBottom: '10px' } }, kpi('驗證集 AUC', M.base.toFixed(3)), kpi('用藥數的重要性', M.imp[4] == null ? '（未放入）' : (M.imp[4] * 1000).toFixed(1) + '‰'), kpi('前一年住院的重要性', M.imp[1] == null ? '（未放入）' : (M.imp[1] * 1000).toFixed(1) + '‰'), kpi('前一年急診的重要性', M.imp[9] == null ? '（未放入）' : (M.imp[9] * 1000).toFixed(1) + '‰')));
      const g = h('div', { class: 'grid2', style: { gap: '18px', alignItems: 'start' } });
      const bb = h('div'); bb.append(sub('置換重要性：把這一欄在驗證集裡隨機打亂，AUC 掉多少（千分點）'));
      const items = F.map((n, j) => ({ n, j, v: M.imp[j] })).filter(z => z.v != null).sort((a, b) => b.v - a.v);
      const hb = h('div'); bb.append(hb);
      U.hbars(hb, items.map(z => ({ label: z.n, value: Math.max(0, z.v * 1000), color: CAUSAL[z.j] ? C.accent : C.amber })), { w: 420, lw: 84, fmt: v => v.toFixed(1) });
      bb.append(h('div', { style: { fontSize: '12px', color: 'var(--muted)' } }, '綠＝在產生資料的公式裡真的會影響再入院；橘＝公式裡沒有它（純粹是代理）'));
      const rt = h('div'); rt.append(sub('這份資料是怎麼產生的（真相）'));
      rt.append(h('div', { style: { fontSize: '13px', lineHeight: 1.75 } }, h('div', null, '• 再入院風險由年齡、前一年住院、住院天數、共病數、白蛋白（< 3.2 陡升）、eGFR（< 30 陡升）、護理之家、獨居×高齡決定'), h('div', null, '• ', h('b', { style: { color: C.amber } }, '用藥數'), '不在公式裡，它只是跟著共病數一起變多（相關約 0.6）'), h('div', null, '• ', h('b', { style: { color: C.amber } }, '前一年急診'), `也不在公式裡，它跟著前一年住院次數走（相關約 ${corr19.toFixed(2)}）`)));
      g.append(bb, rt); out.append(g);
      let msg;
      if (use[4] && !use[3]) msg = `拿掉共病數之後，用藥數的重要性從 ${(ref.imp[4] * 1000).toFixed(1)}‰ 跳到 ${(M.imp[4] * 1000).toFixed(1)}‰——模型把「共病」的功勞記到「用藥數」頭上。但用藥數根本不會影響再入院（資料是我們產生的，所以知道）。如果有人據此建議「減少用藥就能降低再入院」，就是把 SHAP／重要性誤讀成因果。`;
      else if (use[1] && use[9]) { const wq = j0 => M.w[M.cols.indexOf(j0)], up = M.imp[1] > ref.imp[1];
        msg = `前一年住院和前一年急診高度相關（${corr19.toFixed(2)}），同時放入後，前一年住院的重要性${up ? '反而' : ''}從 ${(ref.imp[1] * 1000).toFixed(1)}‰ ${up ? '升' : '降'}到 ${(M.imp[1] * 1000).toFixed(1)}‰，根本不影響再入院的急診次數也分到 ${(M.imp[9] * 1000).toFixed(1)}‰。` + (up ? `原因：模型給兩者的係數是 ${wq(1).toFixed(2)} 與 ${wq(9).toFixed(2)}（標準化後），${wq(9) < 0 ? '一正一負、互相抵消' : '彼此分攤'}；打亂其中一欄，會造出現實中幾乎不存在的組合（例如住院 4 次、急診 0 次），預測因此大亂。` : '兩者攜帶同一份資訊，打亂其中一個時，模型還能從另一個拿到。') + '結論：特徵相關時，置換重要性會失真（可能高估、也可能低估），要把相關的特徵分成一組一起打亂，或改用條件式的方法。'; }
      else if (!use[1] && use[9]) msg = `拿掉前一年住院、只留急診次數：急診的重要性變成 ${(M.imp[9] * 1000).toFixed(1)}‰，模型照樣用得很開心——它是很好的代理，但不是原因。`;
      else msg = `預設模型裡，用藥數仍有一點重要性（${(M.imp[4] * 1000).toFixed(1)}‰），但它不在產生資料的公式裡。試兩件事：①取消勾選「共病數」，看用藥數的重要性怎麼變；②勾選「前一年急診」，看前一年住院的重要性怎麼變。重要性回答的是「模型用了什麼」，不是「什麼造成再入院」。`;
      out.append(note(msg, (use[4] && !use[3]) || (use[1] && use[9]) ? 'warn' : ''));
    }
    box.append(out); draw();
  })();
})();
