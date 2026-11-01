/* M0 互動頁 A：PART 01–06 */
(function () {
  'use strict';
  const { h, $, S, fmt, C, rng, randn, quiz, seg, slider, check, sorter } = U;
  U.initModule('m0');
  const cap = (el, px) => { el.style.maxWidth = px + 'px'; el.style.width = '100%'; el.style.margin = '0 auto'; return el; };

  // ================= P01 文氏圖 =================
  (function () {
    const has = { tools: false, stats: false, domain: true }; const out = h('div');
    const CIR = { tools: [150, 120, '程式與工具'], stats: [250, 120, '數學與統計'], domain: [200, 205, '領域專業'] };
    const ZONE = { '': ['還沒開始', '三個支柱都還沒具備——沒關係，這門課就是從這裡開始。'], tools: ['只有工具', '做得出東西，但不知道結果是否可信、是否有用。'], stats: ['只有統計', '能正確分析，但缺工具做不出來，也缺領域知識判斷意義。'], domain: ['只有領域專業', '這是你們最大的優勢，也是最難速成的一塊。這門課要補上工具與統計。'], 'tools,stats': ['機器學習', '演算法做得出來也算得對，但可能回答了一個場域不在乎的問題。'], 'tools,domain': ['危險區', '做得出東西又懂場域，卻缺統計——可能誤讀結果，做出「看起來很準」的錯誤系統。'], 'stats,domain': ['傳統研究', '能嚴謹回答問題，但規模與自動化受限。'], 'tools,stats,domain': ['資料科學', '三者交集。統計確保結果可信、工具讓它做得出來、領域知識讓它真的有用。'] };
    function draw() {
      out.innerHTML = '';
      const keys = ['tools', 'stats', 'domain'].filter(k => has[k]), z = ZONE[keys.join(',')];
      const sv = U.svgBox(h('div'), 400, 310); const defs = U.s('defs', null, sv);
      Object.entries(CIR).forEach(([k, [x, y]]) => { const cp = U.s('clipPath', { id: 'vc-' + k }, defs); U.s('circle', { cx: x, cy: y, r: 95 }, cp); });
      if (keys.length) {
        const m = U.s('mask', { id: 'vmask' }, defs); let g = m; keys.forEach(k => { g = U.s('g', { 'clip-path': `url(#vc-${k})` }, g); }); U.s('rect', { x: 0, y: 0, width: 400, height: 310, fill: '#fff' }, g);
        ['tools', 'stats', 'domain'].filter(k => !has[k]).forEach(k => U.s('circle', { cx: CIR[k][0], cy: CIR[k][1], r: 95, fill: '#000' }, m));
        U.s('rect', { x: 0, y: 0, width: 400, height: 310, fill: z[0] === '危險區' ? C.bad : C.accent, 'fill-opacity': .55, mask: 'url(#vmask)' }, sv);
      }
      Object.entries(CIR).forEach(([k, [x, y, l]]) => { U.s('circle', { cx: x, cy: y, r: 95, fill: 'none', stroke: has[k] ? C.ink : C.gray, 'stroke-width': has[k] ? 2 : 1.2 }, sv); });
      [[95, 92, '程式與工具'], [305, 92, '數學與統計'], [200, 285, '領域專業'], [200, 84, '機器學習'], [130, 195, '危險區'], [270, 195, '傳統研究'], [200, 152, '資料科學']].forEach(([x, y, t]) => U.s('text', { x, y, 'text-anchor': 'middle', text: t, style: `font-size:${t === '資料科學' ? 14 : 12}px;fill:#1c2430;font-weight:${t === z[0] ? 700 : 400}` }, sv));
      const cbs = [['tools', '我會用工具處理資料'], ['stats', '我懂統計與機率'], ['domain', '我有健康照護領域專業']].map(([k, l]) => check(l, () => has[k], v => has[k] = v, draw));
      out.append(h('div', { class: 'row', style: { marginBottom: '8px' } }, ...cbs), h('div', { class: 'grid2', style: { alignItems: 'center' } }, cap(sv.parentNode, 380), h('div', null, h('div', { class: 'kpi' }, h('div', null, h('div', { class: 'k' }, '你目前落在'), h('div', { class: 'v ' + (z[0] === '危險區' ? 'bad' : z[0] === '資料科學' ? 'good' : '') }, z[0]))), h('div', { class: 'note ' + (z[0] === '危險區' ? 'bad' : ''), style: { fontSize: '14px' } }, z[1]))));
    }
    $('#w-venn').append(out); draw();
  })();

  // ================= P01 描述／預測／指示 =================
  (function () {
    const r = rng(3), hist = [], fc = [];
    for (let m = 0; m < 24; m++) hist.push(122 + m * .9 + 12 * Math.sin((m + 2) / 12 * 2 * Math.PI) + 5 * randn(r));
    for (let m = 24; m < 30; m++) fc.push(122 + m * .9 + 12 * Math.sin((m + 2) / 12 * 2 * Math.PI));
    const L = { d: true, p: false, a: false }; let th = 160; const out = h('div');
    function draw() {
      out.innerHTML = '';
      const W = 640, H = 260, m = { l: 44, r: 16, t: 14, b: 32 }, x = U.scale(0, 29, m.l, W - m.r), y = U.scale(95, 185, H - m.b, m.t);
      const sv = U.svgBox(h('div'), W, H);
      [100, 120, 140, 160, 180].forEach(t => { U.s('line', { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: 'grid' }, sv); U.s('text', { x: m.l - 6, y: y(t) + 4, 'text-anchor': 'end', text: t }, sv); });
      [0, 6, 12, 18, 24, 29].forEach(t => U.s('text', { x: x(t), y: H - m.b + 16, 'text-anchor': 'middle', text: t < 24 ? `第${t + 1}月` : t === 24 ? '未來' : `+${t - 23}` }, sv));
      U.s('line', { x1: x(23.5), x2: x(23.5), y1: m.t, y2: H - m.b, stroke: C.gray, 'stroke-dasharray': '3 3' }, sv);
      if (L.d) U.s('polyline', { points: hist.map((v, i) => `${x(i)},${y(v)}`).join(' '), fill: 'none', stroke: C.ink, 'stroke-width': 2.2 }, sv);
      let over = [];
      if (L.p) { const band = fc.map((v, i) => v + 6 + i * 2), low = fc.map((v, i) => v - 6 - i * 2); U.s('polygon', { points: [...band.map((v, i) => `${x(24 + i)},${y(v)}`), ...low.map((v, i) => `${x(24 + i)},${y(v)}`).reverse()].join(' '), fill: C.blue, 'fill-opacity': .15 }, sv); U.s('polyline', { points: [`${x(23)},${y(hist[23])}`, ...fc.map((v, i) => `${x(24 + i)},${y(v)}`)].join(' '), fill: 'none', stroke: C.blue, 'stroke-width': 2, 'stroke-dasharray': '6 4' }, sv); }
      if (L.a) { U.s('line', { x1: m.l, x2: W - m.r, y1: y(th), y2: y(th), stroke: C.bad, 'stroke-width': 1.8, 'stroke-dasharray': '5 3' }, sv); U.s('text', { x: W - m.r - 4, y: y(th) - 5, 'text-anchor': 'end', text: `行動門檻 ${th}`, style: 'fill:#c0392b;font-weight:600' }, sv);
        if (L.p) { over = fc.map((v, i) => [v, i]).filter(([v]) => v > th); over.forEach(([v, i]) => U.s('circle', { cx: x(24 + i), cy: y(v), r: 6, fill: C.bad }, sv)); } }
      const cbs = [['d', '① 描述性：過去發生了什麼'], ['p', '② 預測性：接下來會怎樣'], ['a', '③ 指示性：該怎麼做']].map(([k, l]) => check(l, () => L[k], v => L[k] = v, draw));
      let msg;
      if (L.d && L.p && L.a) msg = over.length ? `預測未來 ${over.map(o => '+' + (o[1] + 1)).join('、')} 個月將超過 ${th} 人次 → 現在就排定加開門診。三者疊在一起才有用。` : `未來 6 個月預測都在 ${th} 以下 → 暫不加開。試著把門檻調低。`;
      else if (L.a && !L.p) msg = '只有門檻沒有預測：只能等事情發生了才知道要行動。';
      else if (L.p && !L.a) msg = '只有預測：知道會發生，卻不知道該做什麼。';
      else msg = '只有描述：知道發生什麼，但來不及。BI 儀表板做的就是這段。';
      out.append(h('div', { class: 'row', style: { marginBottom: '6px' } }, ...cbs, L.a ? slider('門檻', 130, 180, 1, () => th, v => th = v, draw) : ''), sv.parentNode, h('div', { class: 'note', style: { fontSize: '14px' } }, msg), h('p', { class: 'ai' }, '急診人次為模擬資料。本課 M2 做的就是「預測性」這段。'));
    }
    $('#w-analytics').append(out); draw();
  })();

  // ================= P01 四個問題 =================
  sorter('#w-terms', [
    ['儀表板顯示上個月各科門診量與 KPI', '描述性', '回答「發生了什麼」——商業智慧（BI）'],
    ['下鑽比較：為什麼這季跌倒事件變多？', '診斷性', '回答「為什麼會這樣」——根因分析、A/B 測試'],
    ['每位住院病人的 30 天再入院風險分數', '預測性', '回答「接下來會怎樣」——資料科學／機器學習'],
    ['依預測結果建議下週各病房護理人力配置', '指示性', '回答「我們該怎麼做」——最佳化與決策支援'],
    ['預測未來三個月的疫苗需求量', '預測性', '有明確數值答案可從歷史學習'],
    ['報表列出去年各縣市長照使用人數', '描述性', '純粹描述過去'],
  ], ['描述性', '診斷性', '預測性', '指示性'], '四者層層堆疊：沒把「發生了什麼」看清楚就跳到預測，多半會做出漂亮但沒用的模型。（Gartner 分析成熟度模型）');

  // ================= P02 監督／非監督 =================
  (function () {
    const r = rng(9), P = [];
    for (let i = 0; i < 90; i++) { const g = i < 45 ? 0 : 1; P.push({ x: (g ? 6.3 : 3.6) + 1.05 * randn(r), y: (g ? 6 : 3.8) + 1.05 * randn(r), g }); }
    let mode = 'sup', km = null; const out = h('div');
    function kmeans() { let c = [[P[0].x, P[0].y], [P[89].x, P[89].y]], lab = []; for (let it = 0; it < 20; it++) { lab = P.map(p => ((p.x - c[0][0]) ** 2 + (p.y - c[0][1]) ** 2 < (p.x - c[1][0]) ** 2 + (p.y - c[1][1]) ** 2) ? 0 : 1); c = [0, 1].map(k => { const m = P.filter((_, i) => lab[i] === k); return [S.mean(m.map(p => p.x)), S.mean(m.map(p => p.y))]; }); } return lab; }
    function draw() {
      out.innerHTML = '';
      const pts = P.map((p, i) => ({ x: p.x, y: p.y, c: mode === 'sup' ? (p.g ? C.amber : C.accent) : km ? (km[i] ? '#7c3aed' : C.blue) : C.gray }));
      const ch = h('div'); U.scatter(ch, pts, { w: 380, h: 300, xmin: 0, xmax: 10, ymin: 0, ymax: 10, xlabel: '特徵 x1', ylabel: '特徵 x2', over: mode === 'sup' ? [(sv, x, y) => U.s('line', { x1: x(2), y1: y(9.8), x2: x(8.3), y2: y(.2), stroke: C.ink, 'stroke-dasharray': '5 4', 'stroke-width': 1.5 }, sv)] : [] });
      const bt = h('button', { class: 'btn sm' }, km ? '清除分群' : '讓演算法分群（K-Means, k=2）'); bt.onclick = () => { km = km ? null : kmeans(); draw(); };
      const T = [['C001', 399, '基本', 12, '是'], ['C002', 799, '進階', 45, '否'], ['C003', 399, '基本', 3, '是'], ['C004', 1299, '旗艦', 80, '否']];
      const tb = h('table', { class: 'dt' }, h('tr', null, ['客戶', '月費', '方案', '使用時數'].map(c => h('th', null, c)), mode === 'sup' ? h('th', { style: { background: 'var(--amber-soft)', color: 'var(--amber)' } }, '是否取消（y）') : ''), T.map(r => h('tr', null, r.slice(0, 4).map((v, j) => h('td', { class: j === 1 || j === 3 ? 'num' : '' }, v)), mode === 'sup' ? h('td', { class: 'hl' }, r[4]) : '')));
      out.append(h('div', { class: 'row', style: { marginBottom: '8px' } }, seg([['sup', '監督式：有標籤 y'], ['uns', '非監督式：沒有標籤']], () => mode, v => { mode = v; km = null; }, draw), mode === 'uns' ? bt : ''),
        h('div', { class: 'grid2' }, cap(ch, 420), h('div', null, h('div', { class: 'tscroll' }, tb), h('div', { class: 'note', style: { fontSize: '14px' } }, mode === 'sup' ? '每個點自帶顏色（y=0 或 1）。模型要學一條線把兩色分開，再用來預測新客戶會不會取消。x 是特徵＝輸入，y 是標籤＝目標。' : km ? '演算法自己把點分成兩群——它不知道「取消」是什麼，只是找出哪些點彼此相似。換到醫療：把病人依生活型態與共病分成幾個族群。' : '全部同色。沒有答案可學，只能問「哪些點自然聚在一起」。'))));
    }
    $('#w-sup').append(out); draw();
  })();

  // ================= P02 演算法地圖 =================
  (function () {
    const M = [['監督式　迴歸', '有標籤，預測連續數值', ['線性迴歸', '迴歸樹', '隨機森林', '神經網路'], 'M2-1'], ['監督式　分類', '有標籤，預測類別', ['決策樹', 'k-NN', 'Logistic', 'Naive Bayes'], 'M2-2'], ['非監督式　分群', '無標籤，找出群體結構', ['K-Means', '階層式', 'DBSCAN', 'X-Means'], 'M3'], ['非監督式　降維', '無標籤，壓縮維度', ['PCA', 'SVD', 't-SNE', '自編碼器'], 'M3']];
    const g = h('div', { class: 'grid2' });
    M.forEach(([t, d, a, mo]) => g.append(h('div', { style: { border: '1px solid var(--line)', borderRadius: '10px', padding: '10px 12px', background: '#fff' } }, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('b', null, t), h('span', { class: 'tag' }, mo)), h('div', { style: { fontSize: '13px', color: 'var(--muted)', margin: '2px 0 6px' } }, d), h('div', { class: 'row', style: { gap: '6px' } }, a.map(x => h('span', { class: 'tag gray' }, x))))));
    $('#w-algmap').append(g, h('p', { class: 'ai' }, 'M4 加上集成方法，M5 進入深度學習。【原講義 ML 3.1】p13'));
  })();
  sorter('#w-supq', [
    ['估計元旦當天會有多少人上門就診', '監督式', '有明確的數值答案可以從歷史資料學（迴歸）'],
    ['找出病人回饋意見中最常被提到的幾個主題', '非監督式', '沒有預先定義的主題清單（主題建模）'],
    ['標記哪些病人最可能在三個月內再入院', '監督式', '歷史資料中有「是否再入院」的答案（分類）'],
    ['把病人依生活型態與共病狀況分成幾個族群', '非監督式', '沒有預先定義的族群（分群）'],
    ['依檢驗值預測住院天數', '監督式', '住院天數是已知答案（迴歸）'],
    ['在生理訊號中找出不像其他人的異常片段', '非監督式', '異常的定義本身不明確（異常偵測）'],
  ], ['監督式', '非監督式'], '判斷方式只有一個：你的資料裡有沒有「答案」那一欄。');

  // ================= P03 時間軸 =================
  (function () {
    const E = [
      [1958, 'Perceptron 感知器', '最早的神經網路雛形；1969 年被證明單層無法處理非線性問題。', 'a'],
      [1970, '關聯式資料庫模型', 'Codd 提出。資料從此可以被有結構地累積——後續一切的前提。', 'a'],
      [1984, 'CART 決策樹', 'Breiman 等人。可解釋、對資料型態寬容，至今仍是醫療場域的重要選項。', 'a'],
      [1986, '反向傳播普及', '多層網路終於可以訓練，但當時算力與資料都不足。', 'a'],
      [1996, 'KDD 流程', 'Fayyad 等人把「從資料到知識」拆成五步，資料探勘只是其中一步。從「人提假設」轉為「電腦找假設」。', 'a'],
      [1999, 'CRISP-DM 發表', '業界標準流程，二十多年幾乎沒被取代；本課六步驟由此簡化。', 'a'],
      [2001, '隨機森林', 'Breiman 提出。與梯度提升（XGBoost, 2016）同為表格資料最可靠的方法。', 'a'],
      [2006, 'Hadoop 開源', '分散式儲存與運算，讓「大數據」成為一般組織做得到的事。', 'a'],
      [2012, 'AlexNet 贏得 ImageNet', '錯誤率一次降約十個百分點。GPU 算力與百萬張標註影像同時到位。', 'b'],
      [2014, 'GAN 生成對抗網路', '讓機器生成逼真影像，為生成式 AI 埋下伏筆。', 'b'],
      [2017, 'Transformer', '以 Attention 取代循環結構，可平行訓練——今日 LLM 的共同基礎。', 'b'],
      [2018, 'BERT 與預訓練範式', '一個模型預訓練、多個任務微調。', 'b'],
      [2020, 'GPT-3 與 few-shot', '不必微調，光靠提示就能完成新任務。', 'b'],
      [2022, 'ChatGPT 公開', '技術不算全新，但把門檻降到人人可用——真正的分水嶺。', 'b'],
      [2023, 'RAG 成為標準架構', '緩解知識過期，並讓答案可追溯來源。', 'b'],
      [2024, '推理模型、Agent 與 MCP', 'o1（2024）、DeepSeek-R1（2025）先想再答；MCP 成為工具連接標準。模型從「回答」走向「完成任務」。', 'b'],
      [2026, '巨模型開源、小模型落地', '2026/4 DeepSeek-V4 開源 1.6 兆參數（MoE）；Gartner 預測 2027 年企業用任務專用小模型次數達通用 LLM 三倍（預測）。', 'b'],
    ];
    let cur = 8, era = 'all'; const out = h('div');
    function draw() {
      out.innerHTML = '';
      const W = 680, H = 120, sv = U.svgBox(h('div'), W, H), xi = U.scale(0, E.length - 1, 24, W - 24), split = E.findIndex(e => e[3] === 'b') - .5, x = yr => { const i = E.findIndex(e => e[0] >= yr); return xi(i < 0 ? E.length - 1 : i); };
      U.s('rect', { x: 10, y: 50, width: xi(split) - 10, height: 8, fill: '#e3ded2' }, sv); U.s('rect', { x: xi(split), y: 50, width: W - 10 - xi(split), height: 8, fill: '#cde5e1' }, sv);
      U.s('text', { x: xi(split / 2), y: 82, 'text-anchor': 'middle', text: '上篇：統計 → 資料探勘', style: 'font-size:11px;fill:#5d6774' }, sv); U.s('text', { x: xi((split + E.length - 1) / 2), y: 82, 'text-anchor': 'middle', text: '下篇：深度學習 → Agent', style: 'font-size:11px;fill:#08504d' }, sv);
      E.forEach(([yr], i) => U.s('text', { x: xi(i), y: 106, 'text-anchor': 'middle', text: "'" + String(yr).slice(2), style: 'font-size:10px' }, sv));
      E.forEach(([yr, t, , e], i) => { const dim = era !== 'all' && era !== e; const g = U.s('g', { style: 'cursor:pointer', opacity: dim ? .25 : 1 }, sv); U.s('circle', { cx: xi(i), cy: 54, r: i === cur ? 8 : 5.5, fill: i === cur ? C.amber : (e === 'a' ? '#8a929c' : C.accent), stroke: '#fff', 'stroke-width': 1.5 }, g); if (i === cur) U.s('text', { x: xi(i), y: 34, 'text-anchor': 'middle', text: yr, style: 'font-size:12px;font-weight:700;fill:#b45309' }, g); g.addEventListener('click', () => { cur = i; draw(); }); });
      const [yr, t, d] = E[cur];
      const prev = h('button', { class: 'btn sm', disabled: cur === 0 }, '← 上一個'); prev.onclick = () => { cur--; draw(); };
      const next = h('button', { class: 'btn sm', disabled: cur === E.length - 1 }, '下一個 →'); next.onclick = () => { cur++; draw(); };
      out.append(h('div', { class: 'row', style: { marginBottom: '6px' } }, seg([['all', '全部'], ['a', '1958–2011'], ['b', '2012–2026']], () => era, v => { era = v; cur = E.findIndex(e => v === 'all' || e[3] === v); }, draw), prev, next), sv.parentNode,
        h('div', { class: 'note fade-in', style: { fontSize: '15px' } }, h('b', null, `${yr}　${t}`), h('div', null, d)),
        h('div', { class: 'concept' }, h('div', null, h('b', null, '① 資料變多'), '電子病歷、穿戴裝置、網路文本。但「多」不等於「好」'), h('div', null, h('b', null, '② 算力變便宜'), 'GPU、雲端；本地小模型開始可行'), h('div', null, h('b', null, '③ 演算法突破'), '反向傳播、Attention、預訓練、自監督')),
        h('p', { class: 'ai' }, '新技術很少「取代」舊技術，多半只是多了一個選項——決策樹在 2026 年仍然是很多場域的最佳選擇。'));
    }
    $('#w-timeline').append(out); draw();
  })();

  // ================= P03 CRISP-DM =================
  (function () {
    const N = [['業務理解', '問題是什麼？誰要用？'], ['資料理解', '有什麼資料？品質如何？'], ['資料準備', '清理、轉換、特徵工程'], ['建模', '選演算法、訓練、調參'], ['評估', '結果站得住腳嗎？'], ['部署', '實際交付並持續監控']];
    const PATH = [[0, '界定：預測新收個案三個月內是否需加派'], [1, '盤點長照評估與派案紀錄'], [2, '清理、合併兩個系統的資料'], [3, '第一版模型'], [2, '發現缺「主要照顧者」欄位，回頭補特徵'], [3, '重新訓練'], [4, 'Recall 只有 0.5，個管師說不夠用'], [0, '回到業務理解：改成「需求上升」的定義'], [1, '重新檢視資料'], [2, '重做標籤'], [3, '再訓練'], [4, 'Recall 0.72，個管師願意試用'], [5, '部署並持續監控']];
    let sel = 0, step = -1, timer = null; const out = h('div');
    function draw() {
      out.innerHTML = '';
      const sv = U.svgBox(h('div'), 360, 330), cx = 180, cy = 165, R = 120;
      U.s('circle', { cx, cy, r: R, fill: 'none', stroke: C.line, 'stroke-width': 10 }, sv);
      U.s('text', { x: cx, y: cy + 5, 'text-anchor': 'middle', text: 'CRISP-DM', style: 'font-size:15px;font-weight:700;fill:#0d6b67' }, sv);
      const pos = N.map((_, i) => { const a = -Math.PI / 2 + i * Math.PI / 3; return [cx + R * Math.cos(a), cy + R * Math.sin(a)]; });
      if (step > 0) { const [a, b] = [PATH[step - 1][0], PATH[step][0]]; U.s('line', { x1: pos[a][0], y1: pos[a][1], x2: pos[b][0], y2: pos[b][1], stroke: b < a ? C.bad : C.amber, 'stroke-width': 3, 'stroke-dasharray': b < a ? '6 4' : null }, sv); }
      const active = step >= 0 ? PATH[step][0] : sel;
      N.forEach(([t], i) => { const g = U.s('g', { style: 'cursor:pointer' }, sv); U.s('circle', { cx: pos[i][0], cy: pos[i][1], r: 34, fill: i === active ? C.accent : '#fff', stroke: C.accent, 'stroke-width': 2 }, g); U.s('text', { x: pos[i][0], y: pos[i][1] - 4, 'text-anchor': 'middle', text: i + 1, style: `font-size:13px;font-weight:700;fill:${i === active ? '#fff' : '#0d6b67'}` }, g); U.s('text', { x: pos[i][0], y: pos[i][1] + 12, 'text-anchor': 'middle', text: t, style: `font-size:11px;fill:${i === active ? '#fff' : '#1c2430'}` }, g); g.addEventListener('click', () => { stop(); sel = i; draw(); }); });
      const bt = h('button', { class: 'btn sm primary' }, timer ? '■ 停止' : '▶ 模擬一個真實專案'); bt.onclick = () => { if (timer) stop(); else { step = 0; timer = setInterval(() => { step++; if (step >= PATH.length) { clearInterval(timer); timer = null; step = PATH.length - 1; } draw(); }, 1100); draw(); } };
      const log = h('ol', { style: { fontSize: '13.5px', paddingLeft: '1.4em', margin: '8px 0', color: 'var(--muted)' } }, PATH.slice(0, step + 1).map(([n, t], i) => h('li', { style: { color: i === step ? 'var(--ink)' : '', fontWeight: i === step ? 600 : 400 } }, `${N[n][0]}：${t}`)));
      out.append(h('div', { class: 'grid2', style: { alignItems: 'center' } }, cap(sv.parentNode, 330), h('div', null, h('div', { class: 'row' }, bt), step < 0 ? h('div', { class: 'note', style: { fontSize: '14px' } }, h('b', null, `${sel + 1}　${N[sel][0]}`), h('div', null, N[sel][1])) : log,
        h('p', { class: 'ai' }, '它不是直線。評估後常要回到業務理解重新界定問題；資料準備與建模之間更是反覆來回。另兩套方法論：KDD（1996，學術標準）、SEMMA（1998，SAS）。三者共同點：建模都只是其中一步。'))));
    }
    function stop() { if (timer) clearInterval(timer); timer = null; step = -1; }
    $('#w-crisp').append(out); draw();
  })();

  // ================= P03 成本試算 =================
  (function () {
    let docs = 10000, chars = 3000, custom = 0.5; const out = h('div');
    function draw() {
      out.innerHTML = '';
      const tok = chars * 1.5 * docs, M = tok / 1e6;
      const P = [['2022/11（GPT-3.5 等級）', 20], ['2024/10（同等能力最便宜）', 0.07], ['自訂價格', custom]];
      const ci = h('input', { type: 'number', step: '0.01', min: 0, value: custom, style: { width: '80px' } }); ci.onchange = () => { custom = Math.max(0, +ci.value || 0); draw(); };
      out.append(h('div', { class: 'row', style: { marginBottom: '8px' } }, slider('每月份數', 1000, 100000, 1000, () => docs, v => docs = v, draw, v => v.toLocaleString()), slider('每份字數（原文＋摘要）', 500, 10000, 100, () => chars, v => chars = v, draw, v => v.toLocaleString()), h('label', { class: 'ctl' }, '自訂 $/百萬 token', ci)),
        h('div', { class: 'note', style: { fontSize: '14px', fontFamily: 'var(--mono)' } }, `${chars.toLocaleString()} 字 × 1.5 ≈ ${(chars * 1.5).toLocaleString()} token／份 × ${docs.toLocaleString()} 份 ≈ ${fmt(M, 1)} 百萬 token／月`),
        h('div', { class: 'kpi' }, P.map(([l, p]) => h('div', null, h('div', { class: 'k' }, l + `　$${p}/M`), h('div', { class: 'v' }, '$' + fmt(M * p, M * p < 10 ? 2 : 0)), h('div', { class: 'k' }, '每月')))),
        h('p', { class: 'ai' }, '資料：Stanford AI Index 2025（達 GPT-3.5 水準之最便宜模型價格下降約 280 倍）；試算為課程估算。錢不是問題之後，剩下的是：資料能不能出院、答案能不能信。'));
    }
    $('#w-cost').append(out); draw();
  })();

  // ================= P04 四層堆疊 =================
  (function () {
    const L = [['應用層', 'Application', 'Chatbot、RAG 問答、AI Agent、儀表板、流程自動化', 'Phase C（M8）', 46], ['建模層', 'Model', '迴歸／分類、分群、集成、深度學習、LLM 微調、提示詞工程', 'Phase A–B（M2–M7）', 64], ['資料層', 'Data', '資料清理、特徵工程、資料倉儲、向量資料庫、知識庫', 'M1', 82], ['治理層', 'Governance', '偏誤檢核、可解釋性、來源追溯、去識別化、人在迴路', 'M9（貫穿全程）', 100]];
    let sel = 3; const out = h('div');
    function draw() { out.innerHTML = '';
      const col = h('div', { style: { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px' } });
      L.forEach(([t, en, , , w], i) => { const b = h('div', { style: { width: w + '%', padding: '10px', textAlign: 'center', borderRadius: '6px', cursor: 'pointer', background: i === sel ? C.accent : ['#dceeea', '#cfe6e2', '#bfddd8', '#f3e2c7'][i], color: i === sel ? '#fff' : 'var(--ink)', fontWeight: 600 } }, `${t}　${en}`); b.onclick = () => { sel = i; draw(); }; col.append(b); });
      const [t, , d, wk] = L[sel];
      out.append(h('div', { class: 'grid2' }, col, h('div', null, h('div', { class: 'note', style: { fontSize: '14px' } }, h('b', null, t), h('div', null, d), h('div', { style: { marginTop: '4px' } }, h('span', { class: 'tag' }, '本課：' + wk))), h('p', { class: 'ai' }, '越下面越基礎、影響範圍越廣。治理層畫在最底下，因為它是所有層的前提。常見的錯誤順序：先做應用層（做個 Chatbot 給人看），再回頭補資料層——介面漂亮但答案不可信。')))); }
    $('#w-stack').append(out); draw();
  })();

  // ================= P04 漏斗 =================
  (function () {
    const L = [['原始資料', '機構裡實際存在的所有資料', null], ['可取得', '權限審查、法規限制、系統無法互通——擋掉最多', .4], ['可用', '遺失、錯誤值、單位不一致、重複', .7], ['有訊號', '多數欄位沒有預測力；還要扣掉洩漏欄位', .6], ['模型輸出', '指標選錯、門檻未校準', .85], ['實際決策', '不信任、看不懂、與流程不相容——流失往往最嚴重', .35]];
    const out = h('div');
    function draw() { out.innerHTML = ''; let v = 1; const rows = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px' } });
      L.forEach((l, i) => { if (i) v *= l[2]; const w = Math.max(4, v * 100); rows.append(h('div', { style: { display: 'grid', gridTemplateColumns: '90px 1fr 210px', gap: '10px', alignItems: 'center' } }, h('b', { style: { fontSize: '14px' } }, l[0]), h('div', { style: { display: 'flex', justifyContent: 'center' } }, h('div', { style: { width: w + '%', background: i === 5 ? C.bad : C.accent, color: '#fff', borderRadius: '4px', padding: '4px 0', textAlign: 'center', fontFamily: 'var(--mono)', fontSize: '13px', transition: 'width .3s' } }, (v * 100).toFixed(v < .1 ? 1 : 0) + '%')), i ? slider('保留', .1, 1, .05, () => l[2], x => l[2] = x, draw, x => Math.round(x * 100) + '%') : h('span', { style: { fontSize: '12px', color: 'var(--muted)' } }, l[1]))); });
      out.append(rows, h('div', { class: 'note warn', style: { fontSize: '14px' } }, `最後真正改變第一線行動的只剩 ${(v * 100).toFixed(1)}%。多數 AI 專案的失敗不在「模型不準」，而在最上面兩層（拿不到可用資料）與最下面一層（做出來沒人用）。技術只佔中間三層，而那正是最容易的部分。`), h('p', { class: 'ai' }, '各層比例為示意，請試著調整看看哪一層的改善最有效。')); }
    $('#w-funnel').append(out); draw();
  })();

  // ================= P04 法規 =================
  (function () {
    const E = [['2024/8', 'EU', 'AI Act 生效'], ['2025/2', 'EU', '禁止性條款適用'], ['2025/8', 'EU', '通用模型義務'], ['2025/12–2026/1', '台灣', '《人工智慧基本法》三讀、公布施行'], ['2026/7', 'EU', '修正案生效：高風險規定延後'], ['2026/7', '台灣', '公部門完成風險評估'], ['2027 春', '本課', '你在這裡'], ['2027/12', 'EU', '獨立高風險系統適用'], ['2028/1', '台灣', '各主管機關（含衛福部）訂定規範'], ['2028/8', 'EU', '醫療器材等產品內嵌 AI 適用']];
    const box = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '0', borderLeft: '2px solid var(--line2)', marginLeft: '8px' } });
    E.forEach(([d, w, t]) => box.append(h('div', { style: { display: 'flex', gap: '10px', alignItems: 'center', padding: '5px 0 5px 14px', position: 'relative' } }, h('span', { style: { position: 'absolute', left: '-7px', width: '12px', height: '12px', borderRadius: '50%', background: w === '本課' ? C.amber : w === 'EU' ? C.blue : C.accent } }), h('span', { class: 'mono', style: { width: '120px', fontSize: '13px', color: 'var(--muted)' } }, d), h('span', { class: 'tag ' + (w === 'EU' ? 'blue' : w === '本課' ? 'amber' : '') }, w), h('span', { style: { fontSize: '14px', fontWeight: w === '本課' ? 700 : 400 } }, t))));
    $('#w-law').append(box, h('p', { class: 'ai' }, '延後 ≠ 不用管：Digital Omnibus 只延後時間，風險管理、資料治理、人為監督等要求不變。M9 的偏誤檢核、可解釋性、人在迴路，就是這些要求的具體做法。資料：EU AI Act、Regulation (EU) 2026/1744；行政院公告。'));
  })();

  // ================= P05 四象限 =================
  (function () {
    let dt = 'str', pt = 'pred', topic = ''; const out = h('div');
    const Q = { 'str-pred': ['檢驗值預測住院天數、風險分層與再入院預測', '傳統機器學習的主場', 'Phase A–B（M2–M4）'], 'uns-pred': ['影像判讀、病理切片、語音轉文字後分類', '深度學習的主場', 'M5（W9）、M6（W11）'], 'str-gen': ['依評估結果產生照護計畫、自動生成報表與摘要', '規則＋LLM 混合', 'M8（W14 CMS 案例）'], 'uns-gen': ['衛教文案、病歷摘要、多步驟決策支援 Agent', '生成式 AI 的主場', 'Phase C 與期末專題'] };
    function draw() { out.innerHTML = '';
      const ti = h('input', { type: 'text', placeholder: '輸入你的題目（例：預測長照個案三個月內需求上升）', value: topic, style: { width: '100%', maxWidth: '520px' } }); ti.oninput = () => { topic = ti.value; lbl.textContent = topic || '你的題目'; };
      const grid = h('div', { style: { display: 'grid', gridTemplateColumns: '90px 1fr 1fr', gap: '6px', marginTop: '10px' } }, h('div'), h('div', { style: { textAlign: 'center', fontSize: '13px', color: 'var(--muted)' } }, '結構化（表格）'), h('div', { style: { textAlign: 'center', fontSize: '13px', color: 'var(--muted)' } }, '非結構化（文字、影像、訊號）'));
      let lbl;
      [['pred', '預測值或類別'], ['gen', '生成內容或決策']].forEach(([p, pl]) => { grid.append(h('div', { style: { fontSize: '13px', color: 'var(--muted)', display: 'flex', alignItems: 'center' } }, pl)); ['str', 'uns'].forEach(d => { const k = d + '-' + p, on = d === dt && p === pt; const c = h('div', { style: { border: '1.5px solid ' + (on ? 'var(--accent)' : 'var(--line)'), background: on ? 'var(--accent-soft)' : '#fff', borderRadius: '10px', padding: '10px', cursor: 'pointer', minHeight: '108px' } }, h('div', { style: { fontSize: '13.5px' } }, Q[k][0]), h('div', { style: { fontSize: '12.5px', color: 'var(--muted)', marginTop: '4px' } }, Q[k][1]), h('span', { class: 'tag', style: { marginTop: '6px' } }, Q[k][2])); if (on) { lbl = h('div', { class: 'tag amber', style: { marginTop: '6px', display: 'inline-block' } }, topic || '你的題目'); c.append(h('div', null, '📍 ', lbl)); } c.onclick = () => { dt = d; pt = p; draw(); }; grid.append(c); }); });
      out.append(ti, h('div', { class: 'row', style: { marginTop: '8px' } }, seg([['str', '結構化'], ['uns', '非結構化']], () => dt, v => dt = v, draw), seg([['pred', '預測'], ['gen', '生成／決策']], () => pt, v => pt = v, draw)), grid, h('p', { class: 'ai' }, '第一週就把你的貫穿主線放進這張圖，就知道整學期哪幾週對你最關鍵。')); }
    $('#w-quad').append(out); draw();
  })();

  // ================= P05 場景×技術矩陣 =================
  (function () {
    const T = ['迴歸', '分類', '分群', '集成學習', '異常偵測', '時間序列', '深度學習', 'NLP', 'RAG／Agent'];
    const R = [['再入院風險預測', '○●.●..○○.', '二元分類：邏輯斯迴歸、決策樹、集成、不平衡處理、門檻調整', 'W5、W7'], ['住院天數／費用預測', '●..●..○.○', '迴歸、集成學習', 'W4、W7'], ['病人分群與照護路徑', '..●......○', 'K-Means、階層式分群、PCA 降維、群組詮釋', 'W6'], ['生理訊號異常監測', '....●●○.', '異常偵測、時間序列', 'W7'], ['醫學影像輔助判讀', '.○....●..', 'CNN、遷移學習、Fine-tune', 'W9'], ['病歷文本摘要與分類', '.○....○●○', 'TF-IDF、情感分析、LLM 摘要、提示詞工程', 'W11、W12'], ['長照給付與決策支援', '.○.....○●', 'RAG 知識庫、Workflow、Agent 工具調用、人在迴路', 'W14、W15'], ['衛教內容生成', '.......●●', 'LLM 生成＋RAG 依據', 'W12、W14']];
    // 9 欄字串：●主要 ○次要 .無
    const fix = { '再入院風險預測': '.●○●..○○.', '住院天數／費用預測': '●..●.○○..', '病人分群與照護路徑': '..●.○....', '生理訊號異常監測': '.○..●●○..', '醫學影像輔助判讀': '.○....●..', '病歷文本摘要與分類': '.○○...○●○', '長照給付與決策支援': '.○.....○●', '衛教內容生成': '.......○●' };
    let sel = 0; const out = h('div');
    function draw() { out.innerHTML = '';
      const t = h('table', { class: 'dt' }, h('tr', null, h('th', null, '應用場景'), T.map(x => h('th', { style: { textAlign: 'center' } }, x))), R.map(([n], i) => { const s = fix[n]; const tr = h('tr', { style: { cursor: 'pointer' } }, h('td', { class: i === sel ? 'hl' : '', style: { fontWeight: 600 } }, n), [...s].map(c => h('td', { class: i === sel ? 'hl' : '', style: { textAlign: 'center', color: c === '●' ? C.accent : C.gray, fontSize: '15px' } }, c === '.' ? '' : c))); tr.onclick = () => { sel = i; draw(); }; return tr; }));
      const [n, , d, wk] = R[sel];
      out.append(h('div', { class: 'tscroll' }, t), h('div', { class: 'note', style: { fontSize: '14px' } }, h('b', null, n + '：'), d, '　', h('span', { class: 'tag' }, '本課 ' + wk)), h('p', { class: 'ai' }, '● 主要使用　○ 次要／輔助使用')); }
    $('#w-matrix').append(out); draw();
  })();

  // ================= P05 混淆因子 =================
  (function () {
    const r = rng(13), P = [];
    [[0, 3, 4], [1, 7, 9], [2, 11, 15]].forEach(([g, mx, my]) => { for (let i = 0; i < 50; i++) P.push({ x: mx + 1.3 * randn(r), y: my + 1.6 * randn(r), g }); });
    let color = false; const out = h('div'); const COL = [C.good, C.amber, C.bad], NM = ['輕症', '中度', '重症'];
    function draw() { out.innerHTML = '';
      const rAll = S.r(P.map(p => p.x), P.map(p => p.y)), rIn = [0, 1, 2].map(g => { const q = P.filter(p => p.g === g); return S.r(q.map(p => p.x), q.map(p => p.y)); });
      const ch = h('div'); U.scatter(ch, P.map(p => ({ x: p.x, y: p.y, c: color ? COL[p.g] : C.gray })), { w: 400, h: 290, xmin: 0, xmax: 15, ymin: 0, ymax: 21, xlabel: '用藥項目數', ylabel: '住院天數' });
      out.append(h('div', { class: 'row', style: { marginBottom: '6px' } }, check('依「疾病嚴重度」上色', () => color, v => color = v, draw)),
        h('div', { class: 'grid2' }, cap(ch, 430), h('div', null, h('div', { class: 'kpi' }, h('div', null, h('div', { class: 'k' }, '整體 r'), h('div', { class: 'v bad' }, rAll.toFixed(2))), color ? NM.map((n, i) => h('div', null, h('div', { class: 'k' }, n + '組內 r'), h('div', { class: 'v' }, rIn[i].toFixed(2)))) : ''),
          h('div', { class: 'note ' + (color ? '' : 'warn'), style: { fontSize: '14px' } }, color ? '每一群內部幾乎沒有斜率。用藥與住院天數都被「疾病嚴重度」推高——這叫混淆因子（Confounder）。依此設計「減少用藥」的介入，不會縮短住院，還可能傷害病人。' : '只看兩個變數：「用藥越多住院越久」。看起來減少用藥就能縮短住院……真的嗎？')))); }
    $('#w-conf').append(out); draw();
  })();

  // ================= P05 失敗教訓 =================
  (function () {
    const F = [['整體很準，對某些人很不準', '以「醫療花費」作為健康需求的代理指標，相同病況下黑人病患被系統性低估（Obermeyer et al., Science 2019）。問題在標籤定義——花費少可能反映的是就醫障礙。', 'M9：把評估指標拆到子群體去看'], ['在一家醫院很準，換一家就失效', '影像模型學到與疾病無關的線索，如影像上的醫院標記（Zech et al., PLOS Med 2018）。', 'W5：用「不同來源」的資料做外部驗證'], ['模型沒錯，但沒有人採用', '臨床人員看不懂就不採信；警示過多造成警示疲勞（如 Epic 敗血症模型，Wong et al., JAMA IM 2021）。', 'M9：可解釋性與警示設計']];
    const g = h('div', { class: 'grid3' }); F.forEach(([t, d, m], i) => g.append(h('div', { style: { border: '1px solid var(--line)', borderRadius: '10px', padding: '10px 12px', background: '#fff' } }, h('div', { class: 'mono', style: { color: 'var(--bad)', fontWeight: 700 } }, '教訓 ' + (i + 1)), h('b', null, t), h('div', { style: { fontSize: '13.5px', color: 'var(--muted)', margin: '4px 0' } }, d), h('span', { class: 'tag' }, m))));
    $('#w-fail').append(g, h('div', { class: 'concept', style: { marginTop: '12px' } }, h('div', null, h('b', null, '健康照護的資料條件'), '縱貫性強、多模態、標籤相對好取得、介入可行、價值密度高'), h('div', null, h('b', null, '但也有這些困難'), '少數族群樣本稀少；標籤可能反映「誰有能力就醫」；漏診比誤報嚴重；可解釋性要求高；法規與倫理限制多')));
  })();

  // ================= P06 包含關係 =================
  (function () {
    const sv = U.svgBox(h('div'), 360, 250);
    [[175, 125, 170, 115, '#eef3f2', '人工智慧 AI'], [200, 140, 125, 85, '#d9ebe8', '機器學習 ML'], [222, 152, 82, 58, '#bfddd8', '深度學習 DL'], [240, 160, 42, 30, C.accent, '生成式 AI']].forEach(([cx, cy, rx, ry, f, t], i) => { U.s('ellipse', { cx, cy, rx, ry, fill: f, stroke: '#9ab', 'stroke-width': 1 }, sv); U.s('text', { x: i === 3 ? cx : cx - rx + 14, y: i === 3 ? cy + 4 : cy - ry + 20, 'text-anchor': i === 3 ? 'middle' : 'start', text: t, style: `font-size:${i === 3 ? 11 : 12}px;font-weight:600;fill:${i === 3 ? '#fff' : '#1c2430'}` }, sv); });
    const box = $('#w-nest'); const wrap = h('div', { class: 'grid2', style: { alignItems: 'center' } }, cap(sv.parentNode, 340), h('div', { id: 'w-nest-q' })); box.append(wrap);
    sorter('#w-nest-q', [
      ['規則式專家系統（if-then 規則寫死）', 'AI', '不需要從資料學習，但仍屬人工智慧'],
      ['A* 路徑搜尋演算法', 'AI', '搜尋演算法屬 AI 但不是 ML'],
      ['決策樹', 'ML', '從資料學出規則，但不是神經網路'],
      ['K-Means 分群', 'ML', '非監督式機器學習'],
      ['線性迴歸', 'ML', '最基本的監督式機器學習'],
      ['CNN 影像分類', 'DL', '多層神經網路，但輸出的是類別而非新內容'],
      ['BERT 文字分類', 'DL', 'Transformer 編碼器，做分類不做生成'],
      ['GPT 類大型語言模型', '生成式', '能產生新文字內容'],
      ['擴散模型（Diffusion）影像生成', '生成式', '能產生新影像'],
    ], ['AI', 'ML', 'DL', '生成式'], '選「最小」的那一圈。生成式 AI 擅長的是不同的事，不是最好的事。');
  })();

  // ================= P06 NLP =================
  (function () {
    const E = [['1950s–80s', '規則式 Early NLP', '文法規則、樣式比對；1954 喬治城-IBM 翻譯實驗；1966 ELIZA。發現語言的複雜度被嚴重低估。', '可解釋，但成果遠低於預期'], ['1980s–2000s', '統計與機器學習', '機率模型取代人工規則；1993 Penn Treebank 逾 450 萬標註詞；統計式機器翻譯。', '算力與演算法同時到位'], ['2010s', '循環神經網路', 'RNN、LSTM 處理序列；Word2Vec、GloVe 詞嵌入。', '長距離依賴仍是瓶頸'], ['2017–今', 'Transformer', 'Attention Is All You Need；BERT、GPT 等大型語言模型。', '效能極佳，但可解釋性極差']];
    let sel = 3; const out = h('div');
    function draw() { out.innerHTML = '';
      const g = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '6px' } }); E.forEach(([d, t], i) => { const c = h('div', { style: { padding: '8px', borderRadius: '8px', cursor: 'pointer', textAlign: 'center', background: i === sel ? C.accent : '#fff', color: i === sel ? '#fff' : 'var(--ink)', border: '1px solid var(--line)' } }, h('div', { class: 'mono', style: { fontSize: '12px', opacity: .8 } }, d), h('b', { style: { fontSize: '14px' } }, t)); c.onclick = () => { sel = i; draw(); }; g.append(c); });
      const [, t, d, k] = E[sel];
      out.append(g, h('div', { class: 'note', style: { fontSize: '14px' } }, h('b', null, t + '：'), d, h('div', { style: { marginTop: '4px', color: 'var(--amber)' } }, '關鍵：' + k)),
        h('div', { class: 'grid2' }, h('div', { class: 'concept' }, h('div', null, h('b', null, '傳統 NLP 的心態'), '理解每一步在做什麼；特徵是人設計的；資料需求較低。M6 走這條路。')), h('div', { class: 'concept' }, h('div', null, h('b', null, '現代 NLP 的心態'), '效能最重要，即使是黑箱；需要大量資料與算力。M7、M8 走這條路。'))),
        h('p', { class: 'ai' }, '不是「新的比較好」，而是兩者目標不同。醫療場域常必須為了可解釋性選擇前者。')); }
    $('#w-nlp').append(out); draw();
  })();
})();
