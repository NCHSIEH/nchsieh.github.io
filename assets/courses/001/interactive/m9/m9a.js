/* M9 互動頁 A：PART 01–10 */
(function () {
  'use strict';
  const { h, $, s, svgBox, rng, randn, seg, slider, check, lc, Store } = U;
  U.initModule('m9');
  const cap = (el, px) => { el.style.maxWidth = px + 'px'; el.style.width = '100%'; el.style.margin = '0 auto'; return el; };
  const row = (...a) => h('div', { class: 'row', style: { marginBottom: '6px' } }, ...a);
  const lbl = t => h('span', { style: { fontSize: '14px', color: 'var(--muted)' } }, t);
  const nt = (t, cls = '') => h('div', { class: 'note ' + cls, style: { fontSize: '14px' } }, t);
  const ttl = t => h('b', { style: { fontSize: '13.5px' } }, t);
  const kpi = (...a) => h('div', { class: 'kpi' }, ...a.map(([k, v, c]) => h('div', null, h('div', { class: 'k' }, k), h('div', { class: 'v ' + (c || '') }, v))));
  const tok = (t, o = {}) => h('span', { style: { display: 'inline-block', margin: '2px', padding: '3px 7px', borderRadius: '6px', fontSize: '14px', background: o.bg || '#eef3f2', fontWeight: o.b ? 700 : 400, color: o.c || 'inherit' } }, t);
  const tbl = (head, rows) => h('div', { class: 'tscroll' }, h('table', { class: 'dt' }, h('tr', null, head.map(c => h('th', null, c))), rows.map(r => h('tr', null, r.map((v, j) => v instanceof Node ? h('td', null, v) : h('td', { class: typeof v === 'number' ? 'num' : '', style: { fontWeight: j ? 400 : 600 } }, v))))));
  const pre = t => h('pre', { style: { whiteSpace: 'pre-wrap', background: '#f6f5f1', border: '1px solid var(--line)', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', lineHeight: '1.6', margin: '6px 0', fontFamily: 'var(--mono)' } }, t);
  const box = (title, body, o = {}) => h('div', { style: { border: '1px solid ' + (o.bd || 'var(--line)'), background: o.bg || '#fff', borderRadius: '10px', padding: '10px 12px', fontSize: '14px', ...(o.st || {}) } }, title ? h('div', { style: { fontWeight: 700, marginBottom: '4px', color: o.tc || 'inherit' } }, title) : '', body);
  const ul = items => h('ul', { style: { margin: '4px 0', paddingLeft: '18px' } }, items.map(x => h('li', null, x)));
  const pct = x => (x * 100).toFixed(1) + '%';
  const copyBtn = getText => { const b = h('button', { class: 'btn sm' }, '複製'); b.onclick = () => { try { navigator.clipboard.writeText(getText()).then(() => { b.textContent = '✓ 已複製'; setTimeout(() => b.textContent = '複製', 1500); }, () => { b.textContent = '請手動選取複製'; }); } catch (e) { b.textContent = '請手動選取複製'; } }; return b; };
  const M9 = window.M9 = { cap, row, lbl, nt, ttl, kpi, tok, tbl, pre, box, ul, pct, copyBtn };

  // ================= P01 =================
  U.sorter('#w-fail3', [
    ['肺炎判讀模型內測 AUC 0.93，換到外院表現大幅下降；原來它在看攜帶式 X 光機的標記', '學到錯的東西', '捷徑學習 → 用 Grad-CAM 檢視、做外部驗證（P03、P13）。'],
    ['整體 AUC 0.842，但 80 歲以上只有 0.771、非都會區只有 0.782', '對某些人特別不準', '整體指標被多數群體主導 → 子群體稽核（P09）。'],
    ['高精確度的再入院預測，被用來決定「誰不值得投入資源」', '準確但不該用', '問題在使用方式 → 責任邊界（P04、P15）。'],
    ['「已開立會診單」這個欄位預測「重症」準得驚人', '學到錯的東西', '表格資料一樣會有捷徑：與標籤高度相關但沒有因果。'],
    ['同一個模型，女性的召回率比男性低 0.09', '對某些人特別不準', '拆到子群體才看得到。'],
  ], ['學到錯的東西', '對某些人特別不準', '準確但不該用'], '共同點：所有評估指標都通過。');

  // ================= P02 =================
  (function () {
    const P = { acc: .7 }; const ctl = h('div'), out = h('div');
    ctl.append(row(slider('B 群就醫可近性（同樣的病，花費是 A 群的幾成）', .3, 1, .05, () => P.acc, v => P.acc = +v.toFixed(2), draw, v => (v * 100).toFixed(0) + '%')));
    const R = rng(909), D = Array.from({ length: 2000 }, (_, i) => ({ g: R() < .3 ? 'B' : 'A', need: Math.exp(.6 * randn(R)), noise: Math.exp(.25 * randn(R)) }));
    function draw() {
      out.innerHTML = '';
      D.forEach(d => { d.cost = d.need * (d.g === 'B' ? P.acc : 1) * d.noise; });
      const k = 200, byCost = D.slice().sort((a, b) => b.cost - a.cost).slice(0, k), byNeed = D.slice().sort((a, b) => b.need - a.need).slice(0, k);
      const shB = arr => arr.filter(d => d.g === 'B').length / arr.length;
      const sorted = D.slice().sort((a, b) => a.need - b.need), dec = i => sorted.slice(i * 200, i * 200 + 200);
      const mean = (arr, f) => arr.length ? arr.reduce((a, d) => a + f(d), 0) / arr.length : NaN;
      const lineFor = g => Array.from({ length: 10 }, (_, i) => [i + 1, mean(dec(i).filter(d => d.g === g), d => d.cost)]);
      const chart = h('div'); lc(chart, [{ pts: lineFor('A'), color: '#2a7f78', w: 2.5, dots: true }, { pts: lineFor('B'), color: '#c0392b', w: 2.5, dots: true }], { w: 440, h: 240, xmin: 1, xmax: 10, ymin: 0, xl: '真實健康需求（十分位，1＝最輕 10＝最重）', yl: '模型風險分數（預測花費）', legend: [['A 群', '#2a7f78'], ['B 群', '#c0392b']], yfmt: v => (+v).toFixed(1) });
      const gap = 1 - P.acc;
      out.append(h('div', { class: 'grid2', style: { alignItems: 'center' } }, cap(chart, 460), h('div', null,
        kpi(['B 群占全體', '30%'], ['計畫名單中 B 群（依花費選）', pct(shB(byCost)), shB(byCost) < .25 ? 'bad' : ''], ['若依真實需求選', pct(shB(byNeed)), 'good']), h('div', { style: { height: '8px' } }),
        kpi(['模型「預測花費」準不準', '完美（預測的就是花費）', 'good'], ['同樣需求下 B 群分數低', (gap * 100).toFixed(0) + '%', gap > .05 ? 'bad' : '']))),
        nt(gap < .05 ? '兩群就醫可近性相同時，花費是需求的好代理，名單比例也接近 30%。' : `同樣病得那麼重，B 群的分數系統性偏低——因為可近性差、付不起、歷史上的醫療不平等造成的迴避，讓他們花得比較少。模型忠實學到「這群人花費少」，並把它解讀成「需求低」。B 群在計畫名單中只占 ${pct(shB(byCost))}，依真實需求應有 ${pct(shB(byNeed))}。`, gap < .05 ? '' : 'bad'),
        nt('下次你要用一個代理指標時，問自己：「這個代理指標，對哪一群人特別不準？為什麼？」', 'warn'));
    }
    $('#w-label').append(ctl, out); draw();
  })();

  // ================= P03 =================
  (function () {
    const P = { c: .93, cam: false }; const ctl = h('div'), out = h('div');
    ctl.append(row(slider('原醫院：重症病人用攜帶式機器的比例（標記與重症的相關）', .5, .98, .01, () => P.c, v => P.c = +v.toFixed(2), draw, v => (v * 100).toFixed(0) + '%'), check('顯示 Grad-CAM 熱區', () => P.cam, v => P.cam = v, draw)));
    function cxr(sv, x, hot) { s('rect', { x, y: 10, width: 170, height: 170, rx: 8, fill: '#1d1d1d' }, sv); s('ellipse', { cx: x + 55, cy: 95, rx: 32, ry: 62, fill: '#555' }, sv); s('ellipse', { cx: x + 115, cy: 95, rx: 32, ry: 62, fill: '#555' }, sv); s('text', { x: x + 140, y: 30, 'font-size': 12, 'font-weight': 700, style: 'fill:#eee', text: 'PORT' }, sv);
      if (hot === 'lung') { s('circle', { cx: x + 118, cy: 125, r: 26, fill: 'rgba(255,60,30,.55)' }, sv); s('circle', { cx: x + 118, cy: 125, r: 14, fill: 'rgba(255,220,0,.6)' }, sv); }
      if (hot === 'mark') { s('circle', { cx: x + 152, cy: 26, r: 24, fill: 'rgba(255,60,30,.55)' }, sv); s('circle', { cx: x + 152, cy: 26, r: 12, fill: 'rgba(255,220,0,.6)' }, sv); } }
    function draw() { out.innerHTML = '';
      const lungIn = .82, lungEx = .81, markIn = P.c, markEx = .5, chosen = markIn > lungIn ? 'mark' : 'lung';
      const sv = svgBox(h('div'), 720, 200); cxr(sv, 20, P.cam ? 'lung' : null); cxr(sv, 270, P.cam ? 'mark' : null);
      s('text', { x: 105, y: 196, 'text-anchor': 'middle', 'font-size': 12.5, text: '模型甲：學會看肺野' }, sv); s('text', { x: 355, y: 196, 'text-anchor': 'middle', 'font-size': 12.5, text: '模型乙：學會看標記' }, sv);
      out.append(cap(sv.parentNode, 720), tbl(['', '原醫院內測準確率', '外院驗證準確率', '依內測分數會選誰？'], [['模型甲（看肺野）', pct(lungIn), pct(lungEx), chosen === 'lung' ? '★ 選它' : ''], ['模型乙（看標記）', pct(markIn), pct(markEx), chosen === 'mark' ? '★ 選它' : '']]),
        nt(chosen === 'mark' ? `標記在原醫院跟重症的相關高達 ${(P.c * 100).toFixed(0)}%：看標記的模型內測分數反而比較高，會被選上；到了外院（標記與病情無關），準確率掉到 ${pct(markEx)}。院內測試集與訓練集來自同一個分布，標記的相關性一樣成立——只有外部驗證才會露餡。` : '標記的相關性不夠強時，看肺野的模型勝出。但你無法事先知道資料裡藏著什麼捷徑——所以外部驗證是必要條件，不是加分項。', chosen === 'mark' ? 'bad' : ''),
        P.cam ? '' : lbl('勾選「顯示 Grad-CAM 熱區」看兩個模型各在看哪裡。')); }
    $('#w-shortcut').append(ctl, out); draw();
  })();

  // ================= P04 =================
  (function () {
    const PT = [['王先生 84 歲', .72, '獨居、共病 5 項'], ['林女士 79 歲', .66, '剛出院一週、家屬白天上班'], ['陳先生 68 歲', .58, '糖尿病控制不佳'], ['黃女士 88 歲', .81, '失智、照顧者也是高齡'], ['張先生 55 歲', .18, '術後恢復良好、家人同住'], ['李女士 61 歲', .22, '規律回診'], ['吳先生 47 歲', .12, '首次住院'], ['蔡女士 70 歲', .35, '有居家護理']];
    let pol = 'roi'; const ctl = h('div'), out = h('div');
    ctl.append(row(seg([['roi', '管理者提議：「預測不會再入院」者優先（投資報酬率高）'], ['need', '高風險者優先'], ['human', '高風險優先＋人工覆核決定']], () => pol, v => pol = v, draw)));
    function draw() { out.innerHTML = ''; const order = PT.map((p, i) => i).sort((a, b) => pol === 'roi' ? PT[a][1] - PT[b][1] : PT[b][1] - PT[a][1]), got = new Set(order.slice(0, 4));
      const g = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: '6px' } }, PT.map(([n, r, d], i) => box(n, h('div', null, h('div', null, '預測再入院 ', h('b', null, (r * 100).toFixed(0) + '%')), lbl(d), h('div', { style: { fontWeight: 700, color: got.has(i) ? 'var(--good)' : 'var(--muted)', marginTop: '4px' } }, got.has(i) ? '✓ 取得出院準備資源' : '—')), { bg: got.has(i) ? 'var(--good-soft)' : r > .6 ? '#fff6f4' : '#fff' })));
      out.append(g, nt(pol === 'roi' ? '技術上完全沒問題，模型也確實準確——但這等於把資源從最需要的人身上移開。模型回答「會不會發生」，被拿去回答「值不值得投入」，中間跳過了本該由人明確做並負責的價值判斷。' : pol === 'need' ? '同一個模型、同樣的預測，換一種使用方式，結果完全不同。差別不在技術，而在「誰問了這個問題」。' : '把價值判斷明確交給人：模型排序、人做決定、並記錄理由——責任歸屬清楚。', pol === 'roi' ? 'bad' : '')); }
    $('#w-alloc').append(ctl, out); draw();
  })();

  // ================= P05 =================
  (function () {
    const S6 = [['① 問題定義', '把「醫療需求」代換成「醫療花費」', '弱勢族群花費低不是因為健康，是因為看不起病。'], ['② 資料蒐集', '誰有機會進入資料庫、誰沒有', '偏鄉、無健保、外籍移工的資料本來就少 → 模型對他們的預測必然不準。'], ['③ 標註', '標註者的主觀與不一致', '多人標註要算一致性（Kappa，M6）；標準答案本身可能有偏。'], ['④ 特徵選擇', '代理變數藏著受保護屬性', '郵遞區號、就醫院所、保險別——族群與社經地位的代理變數。'], ['⑤ 建模', '多數類主導，少數群被犧牲', '整體指標由多數群體決定，少數群被平均掉。'], ['⑥ 部署使用', '使用者的過度信任', '臨床人員看到分數就照做，不再自己判斷——自動化偏誤。']];
    let k = 0; const out = h('div');
    function draw() { out.innerHTML = ''; const sv = svgBox(h('div'), 720, 120);
      S6.forEach(([t], i) => { const x = 6 + i * 119, on = i === k, g = s('g', { style: 'cursor:pointer' }, sv), lvl = (i + 1) / 6;
        s('rect', { x, y: 70 - lvl * 40, width: 108, height: 6 + lvl * 40, fill: `rgba(192,57,43,${.15 + lvl * .5})` }, g);
        s('rect', { x, y: 78, width: 108, height: 34, rx: 8, fill: on ? 'var(--accent)' : '#fff', stroke: '#2a7f78' }, g); s('text', { x: x + 54, y: 100, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, style: 'fill:' + (on ? '#fff' : '#222'), text: t }, g); g.addEventListener('click', () => { k = i; draw(); }); });
      s('text', { x: 6, y: 14, 'font-size': 12, style: 'fill:#c0392b', text: '紅色高度＝沿流程累積的偏誤（示意）：每一環都在前一環的基礎上再疊一層' }, sv);
      out.append(cap(sv.parentNode, 720), box(S6[k][0] + '：' + S6[k][1], S6[k][2], { bg: 'var(--accent-soft)' })); }
    $('#w-six').append(out); draw();
  })();

  // ================= P06 =================
  U.sorter('#w-btype', [
    ['資料只來自三家醫學中心，偏鄉診所的病人不在裡面', '選擇偏誤', '檢查資料涵蓋率，與服務區母體比對。'],
    ['兩家院所的血糖儀器校正不同，同樣的人量出來差一截', '測量偏誤', '按來源分組看分布是否一致。'],
    ['「是否需要轉介」的標籤，是由不同護理師憑經驗勾的', '標籤偏誤', '追問標籤怎麼來；算多人標註 Kappa。'],
    ['用「醫療花費」當「醫療需求」的標籤', '標籤偏誤', '最隱蔽也最嚴重的一種。'],
    ['為 A 醫院訓練的模型，直接拿到 B 醫院用', '部署偏誤', '外部驗證、明訂適用範圍。'],
    ['線上問卷只有會用手機的人會填', '選擇偏誤', '誰進得了資料庫。'],
  ], ['選擇偏誤', '測量偏誤', '標籤偏誤', '部署偏誤']);
  $('#w-bcheck').append(tbl(['類型', '檢查方法', '要看什麼數字', '發現問題怎麼辦'], [['選擇偏誤', '資料的人口結構 vs 服務區母體', '各年齡層／地區的佔比差異', '補資料；或明訂適用範圍並揭露'], ['測量偏誤', '按資料來源（院所、儀器、期間）分組看分布', '各組平均、標準差、缺值率', '標準化轉換；或把來源當成特徵'], ['標籤偏誤', '★ 追問「這個標籤實際上是怎麼產生的」', '多人標註的 Kappa 一致性', '重新定義標籤；多人標註並仲裁'], ['部署偏誤', '★ 用另一機構／另一時期的資料測試', '外部驗證的表現掉多少', '限定適用範圍；或重新訓練']]), nt('「追問標籤怎麼來」是最有價值也最少人做的一步。很多專題直接接受資料附的標籤，從沒問過它代表什麼。', 'warn'));

  // ================= P07 =================
  (function () {
    const R = rng(77);
    const FE = { zip: ['郵遞區號（8 區）', g => g ? (R() < .85 ? 5 + Math.floor(R() * 3) : Math.floor(R() * 5)) : (R() < .93 ? Math.floor(R() * 5) : 5 + Math.floor(R() * 3))], hosp: ['就醫院所層級', g => { const u = R(); return g ? (u < .55 ? 2 : u < .85 ? 3 : u < .95 ? 1 : 0) : (u < .35 ? 0 : u < .65 ? 1 : u < .85 ? 2 : 3); }], ins: ['保險別', g => { const u = R(); return g ? (u < .78 ? 0 : u < .95 ? 1 : 2) : (u < .86 ? 0 : u < .9 ? 1 : 2); }], age: ['年齡層', g => { const u = R(); return g ? (u < .3 ? 0 : u < .65 ? 1 : 2) : (u < .4 ? 0 : u < .75 ? 1 : 2); }], bmi: ['BMI 分級', () => Math.floor(R() * 3)] };
    const D = Array.from({ length: 2000 }, () => { const g = R() < .22 ? 1 : 0, d = { g }; Object.keys(FE).forEach(k => d[k] = FE[k][1](g)); return d; });
    const on = { zip: false, hosp: true, ins: false, age: false, bmi: false }; const ctl = h('div'), out = h('div');
    ctl.append(row(...Object.keys(FE).map(k => check(FE[k][0], () => on[k], v => on[k] = v, draw))));
    function nb(keys) { if (!keys.length) return .5; const cnt = [{}, {}], n = [0, 0]; D.forEach(d => { n[d.g]++; keys.forEach(k => { const c = cnt[d.g]; c[k + d[k]] = (c[k + d[k]] || 0) + 1; }); });
      let tp = 0, tn = 0, P = 0, N = 0; D.forEach(d => { let l = 0; keys.forEach(k => { l += Math.log(((cnt[1][k + d[k]] || 0) + 1) / (n[1] + 8)) - Math.log(((cnt[0][k + d[k]] || 0) + 1) / (n[0] + 8)); }); const yh = l > 0 ? 1 : 0; if (d.g) { P++; if (yh) tp++; } else { N++; if (!yh) tn++; } }); return (tp / P + tn / N) / 2; }
    function draw() { out.innerHTML = ''; const keys = Object.keys(on).filter(k => on[k]), ba = nb(keys);
      const single = Object.keys(FE).map(k => [FE[k][0], nb([k])]).sort((a, b) => b[1] - a[1]);
      const bars = h('div'); U.hbars(bars, single.map(([n, v]) => ({ label: n, value: v, color: v > .75 ? '#c0392b' : v > .62 ? '#e0a34a' : '#2a7f78' })), { max: 1, lw: 130, fmt: v => v.toFixed(2) });
      out.append(h('div', { class: 'grid2', style: { alignItems: 'start' } }, h('div', null, kpi(['用勾選欄位預測「非都會區」的平衡準確率', ba.toFixed(2), ba > .75 ? 'bad' : ba > .62 ? '' : 'good']), nt(ba > .75 ? '代理很強：就算資料裡沒有「地區」欄位，模型也能從這些欄位幾乎還原出來——偏誤照樣會進來。' : ba > .62 ? '有一定的代理能力。拆到子群體看表現差異，並考慮拿掉可疑欄位重跑。' : '幾乎猜不出來：這些欄位對「地區」的代理能力很弱。', ba > .75 ? 'bad' : '')), h('div', null, ttl('單一欄位的代理強度'), bars)),
        nt('關鍵觀念：把敏感欄位刪掉，並不能消除偏誤——因為其他欄位仍然攜帶那個資訊。這叫「透過不知情達成公平」的謬誤。', 'warn')); }
    $('#w-proxy').append(ctl, out); draw();
  })();

  // ================= P08 =================
  (function () {
    const G = { A: { P: 200, k: 1.386 }, B: { P: 100, k: 1.145 } }, NTOT = 1000;
    const TP = (g, n) => Math.min(n, G[g].P * (1 - Math.exp(-G[g].k * n / G[g].P)));
    const nForRecall = (g, r) => -G[g].P / G[g].k * Math.log(1 - r);
    const nForPrec = (g, p) => { let lo = 1, hi = NTOT; for (let i = 0; i < 60; i++) { const m = (lo + hi) / 2; if (TP(g, m) / m > p) lo = m; else hi = m; } return lo; };
    const P = { mode: 'dp', nA: 200, nB: 200 }; const ctl = h('div'), out = h('div');
    function build() { ctl.innerHTML = ''; ctl.append(row(seg([['dp', '① 人口平價（選出率相同）'], ['pp', '② 預測平價（精確率相同）'], ['eo', '③ 機會均等（召回率相同）'], ['free', '自己調']], () => P.mode, v => { P.mode = v; P.nA = 200; P.nB = v === 'dp' ? 200 : v === 'pp' ? Math.round(nForPrec('B', TP('A', 200) / 200)) : v === 'eo' ? Math.round(nForRecall('B', TP('A', 200) / 200)) : P.nB; }, () => { build(); draw(); })), P.mode === 'free' ? row(slider('A 群選出人數', 20, 600, 5, () => P.nA, v => P.nA = v, draw), slider('B 群選出人數', 20, 600, 5, () => P.nB, v => P.nB = v, draw)) : ''); }
    function draw() { out.innerHTML = ''; const m = g => { const n = g === 'A' ? P.nA : P.nB, tp = TP(g, n); return { sel: n / NTOT, rec: tp / G[g].P, prec: tp / n, n, tp }; }, a = m('A'), b = m('B');
      const W = 720, H = 230, sv = svgBox(h('div'), W, H), y = v => 190 - v * 160, M = [['選出率', 'sel'], ['召回率', 'rec'], ['精確率', 'prec']];
      [0, .25, .5, .75, 1].forEach(t => { s('line', { x1: 40, x2: W - 10, y1: y(t), y2: y(t), class: 'grid' }, sv); s('text', { x: 34, y: y(t) + 4, 'text-anchor': 'end', 'font-size': 11, text: t.toFixed(2) }, sv); });
      M.forEach(([n, k], i) => { const x0 = 70 + i * 220; [[a, '#2a7f78', 'A'], [b, '#c0392b', 'B']].forEach(([o, c, g], j) => { const v = o[k], x = x0 + j * 70; s('rect', { x, y: y(v), width: 56, height: 190 - y(v), fill: c, rx: 3 }, sv); s('text', { x: x + 28, y: y(v) - 5, 'text-anchor': 'middle', 'font-size': 12.5, 'font-weight': 700, text: v.toFixed(3) }, sv); s('text', { x: x + 28, y: 206, 'text-anchor': 'middle', 'font-size': 11.5, text: g + ' 群' }, sv); });
        const eq = Math.abs(a[k] - b[k]) < .02; s('text', { x: x0 + 63, y: 224, 'text-anchor': 'middle', 'font-size': 13, 'font-weight': 700, style: 'fill:' + (eq ? '#2f7d4f' : '#c0392b'), text: `${n} ${eq ? '○ 相同' : '× 不同'}` }, sv); });
      const msg = { dp: `兩群都選 ${a.n} 人，選出率相同。但 B 群精確率只有 ${b.prec.toFixed(3)}——被標記的人超過一半其實不會再入院。`, pp: `兩群精確率都約 ${a.prec.toFixed(3)}。但 B 群召回率只有 ${b.rec.toFixed(3)}——有更多真正需要的人被漏掉。`, eo: `兩群召回率都約 ${a.rec.toFixed(3)}：真正需要的人在每一群被抓到的比例一樣。代價是 B 群精確率 ${b.prec.toFixed(3)}、選出率也不同。`, free: '試著讓三根長條同時相等——盛行率不同時做不到。' }[P.mode];
      out.append(cap(sv.parentNode, 720), tbl(['', '選出人數', '命中（真的會再入院）', '盛行率'], [['A 群', Math.round(a.n), Math.round(a.tp), '20%'], ['B 群', Math.round(b.n), Math.round(b.tp), '10%']]), nt(msg, P.mode === 'eo' ? '' : 'warn'),
        nt('不可能定理：盛行率不同時，除非模型完美預測，三種定義無法同時滿足。所以不能說「我們的模型是公平的」，要說「我們選擇以 ○○ 為準，因為……」，並把選擇寫進文件、由能負責的人拍板。')); }
    build(); $('#w-fair').append(ctl, out); draw();
  })();
  U.sorter('#w-fairpick', [
    ['癌症篩檢：漏掉一個真正生病的人代價最高', '機會均等', '醫療篩檢最常用——各群召回率相同。'],
    ['免費健檢名額要公平分給各區', '人口平價', '資源分配、機會給予——各群被選中的比例相同。'],
    ['居家訪視人力極有限，每次誤報都浪費一趟', '預測平價', '資源有限、誤報成本高——各群精確率相同。'],
    ['再入院高風險名單，目標是不漏掉需要出院準備的人', '機會均等', '真正需要的人，在每一群被抓到的比例一樣。'],
  ], ['人口平價', '機會均等', '預測平價'], '還有第四種：個體公平——但「什麼叫相似」本身就需要價值判斷。');

  // ================= P09 =================
  (function () {
    const D = [['整體', 5000, .842, .781, .664, .184], ['65 歲以下', 1800, .861, .812, .690, .142], ['65–79 歲', 2100, .848, .795, .671, .191], ['80 歲以上', 1100, .771, .684, .598, .238], ['男性', null, .851], ['女性', null, .833], ['都會區', 3900, .858, .803, .682, .176], ['非都會區', 1100, .782, .701, .611, .212]];
    let met = 2, gap = .07; const ctl = h('div'), out = h('div');
    ctl.append(row(seg([[2, 'AUC'], [3, 'Recall'], [4, 'Precision']], () => met, v => met = v, draw), slider('與整體差距超過多少就標記', .02, .1, .01, () => gap, v => gap = +v.toFixed(2), draw, v => (+v).toFixed(2))));
    function draw() { out.innerHTML = ''; const rows = D.filter(r => r[met] != null), all = D[0][met];
      const W = 720, H = 30 + rows.length * 28, sv = svgBox(h('div'), W, H), x0 = 110, xs = v => x0 + (v - .55) / .35 * 520;
      [.6, .7, .8, .9].forEach(t => { s('line', { x1: xs(t), x2: xs(t), y1: 8, y2: H - 18, class: 'grid' }, sv); s('text', { x: xs(t), y: H - 4, 'text-anchor': 'middle', 'font-size': 11, text: t.toFixed(1) }, sv); });
      rows.forEach((r, i) => { const v = r[met], y = 12 + i * 28, bad = all - v > gap, c = i === 0 ? '#7a7a7a' : bad ? '#c0392b' : all - v > gap / 2 ? '#e0a34a' : '#2a7f78'; s('text', { x: x0 - 8, y: y + 14, 'text-anchor': 'end', 'font-size': 12.5, 'font-weight': bad ? 700 : 400, text: r[0] }, sv); s('rect', { x: xs(.55), y: y + 2, width: xs(v) - xs(.55), height: 18, rx: 3, fill: c }, sv); s('text', { x: xs(v) + 6, y: y + 15, 'font-size': 12, style: 'font-family:var(--mono)', text: v.toFixed(3) }, sv); });
      s('line', { x1: xs(all), x2: xs(all), y1: 6, y2: H - 18, stroke: '#333', 'stroke-dasharray': '4 3' }, sv);
      const flagged = rows.slice(1).filter(r => all - r[met] > gap).map(r => r[0]);
      out.append(cap(sv.parentNode, 720), tbl(['子群體', 'n', 'AUC', 'Recall', 'Precision', '實際陽性率'], D.filter(r => r[1]).map(r => [r[0], r[1].toLocaleString(), r[2].toFixed(3), r[3].toFixed(3), r[4].toFixed(3), r[5].toFixed(3)])),
        nt(flagged.length ? `超過門檻的子群體：${flagged.join('、')}。判讀三問：① 差距多大？② 是不是樣本少造成的（1,100 vs 3,900）？③ 是不是盛行率不同造成的（0.238 vs 0.176，盛行率不同時精確率本來就會不同）？` : '目前門檻下沒有子群體被標記——試著把門檻調小，或切換指標。', flagged.length ? 'warn' : ''),
        nt('處理與揭露：技術面——對弱勢群體單獨調整門檻、加權訓練、補資料；流程面——★ 這兩群的預測一律加註「建議人工覆核」；文件面——★ 把這張表放進交付文件與發表投影片，不要藏起來。')); }
    $('#w-audit').append(ctl, out); draw();
  })();

  // ================= P10 =================
  U.sorter('#w-fix', [
    ['對少數群重抽樣或重加權，調整訓練資料的組成', '前處理', '與模型無關、可解釋；但可能損失資訊。'],
    ['把公平性當成損失函數的一部分（公平性正則化）', '訓練中', '效果直接；但需要改演算法、較難實作。'],
    ['80 歲以上族群用較低的決策門檻', '後處理', '最容易實作；但「不同群不同標準」在法律與倫理上可能有爭議。'],
    ['80 歲以上與非都會區的預測一律加註「建議人工覆核」', '流程', '不改模型，改流程：成本低、立即可行、責任歸屬清楚。'],
    ['跨機構合作，把高齡族群樣本補到可靠的最低量', '流程', '最根本的解法，也是最少人做的。'],
    ['在模型卡寫明「本模型在 80 歲以上族群表現顯著較差，不建議單獨依賴」', '流程', '明訂適用範圍並誠實揭露——這不是承認失敗，這是專業。'],
  ], ['前處理', '訓練中', '後處理', '流程'], '對 80 歲以上用較低門檻，是「補償他們資料少」還是「差別待遇」？這正是本模組要練的判斷。');
})();
