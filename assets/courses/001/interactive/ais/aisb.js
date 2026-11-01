/* 補充教材 AI Studio × Python 互動頁 B：PART 10–18 */
(function () {
  'use strict';
  const { h, $, s, svgBox, rng, S, seg, slider, check, Store } = U;
  const { cap, row, lbl, nt, ttl, kpi, tok, tbl, pre, box, code, DATA, X } = window.AIS;

  // ================= P10 =================
  (function () {
    const P = { k: 10, depth: 3, seed: 1 }; const ctl = h('div'), out = h('div');
    ctl.append(row(slider('折數 k', 3, 10, 1, () => P.k, v => P.k = v, draw), slider('Decision Tree 最大深度', 1, 8, 1, () => P.depth, v => P.depth = v, draw), h('button', { class: 'btn sm', onclick: () => { P.seed++; draw(); } }, '重新洗牌')));
    const fit = (tr, te) => { const t = ML.cart(tr.map(d => ({ x: X(d), y: d.y })), P.depth, { minLeaf: 5 }); return te.filter(d => (ML.treeP(t, X(d)) >= .5 ? 1 : 0) === d.y).length / te.length; };
    function draw() {
      out.innerHTML = ''; const R = rng(P.seed * 31), idx = DATA.map((_, i) => i).sort(() => R() - .5), k = P.k, acc = [];
      for (let f = 0; f < k; f++) { const te = idx.filter((_, i) => i % k === f).map(i => DATA[i]), tr = idx.filter((_, i) => i % k !== f).map(i => DATA[i]); acc.push(fit(tr, te)); }
      const singles = [1, 2, 3, 4, 5].map(sd => { const r2 = rng(sd * 977 + P.seed), id2 = DATA.map((_, i) => i).sort(() => r2() - .5), n = Math.round(DATA.length * .7); return fit(id2.slice(0, n).map(i => DATA[i]), id2.slice(n).map(i => DATA[i])); });
      // 巢狀容器示意
      const W = 720, H = Math.max(120, 44 + k * 16), sv = svgBox(h('div'), W, H);
      s('rect', { x: 6, y: 6, width: 330, height: 104, rx: 10, fill: '#fdf7ec', stroke: '#b45309', 'stroke-width': 1.8 }, sv); s('text', { x: 18, y: 26, 'font-size': 13, 'font-weight': 700, text: `Cross Validation（k = ${k}）雙擊進入 ▾` }, sv);
      s('rect', { x: 16, y: 38, width: 120, height: 62, rx: 8, fill: '#fff', stroke: '#2a7f78' }, sv); s('text', { x: 76, y: 56, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, text: 'Training' }, sv); s('text', { x: 76, y: 78, 'text-anchor': 'middle', 'font-size': 11.5, text: 'Decision Tree' }, sv);
      s('rect', { x: 156, y: 38, width: 170, height: 62, rx: 8, fill: '#fff', stroke: '#2a7f78' }, sv); s('text', { x: 241, y: 56, 'text-anchor': 'middle', 'font-size': 12, 'font-weight': 700, text: 'Testing' }, sv); s('text', { x: 241, y: 78, 'text-anchor': 'middle', 'font-size': 11.5, text: 'Apply Model → Performance' }, sv);
      s('line', { x1: 136, x2: 156, y1: 69, y2: 69, stroke: '#2a7f78', 'stroke-width': 2 }, sv);
      const gx = 360, gw = 250, cw = gw / k;
      s('text', { x: gx, y: 22, 'font-size': 12, style: 'fill:#6b675e', text: '每一折：深色＝測試、淺色＝訓練' }, sv);
      acc.forEach((a, f) => { const y = 32 + f * 16; for (let j = 0; j < k; j++) s('rect', { x: gx + j * cw + 1, y, width: cw - 2, height: 12, rx: 2, fill: j === f ? '#2a7f78' : '#cfe3df' }, sv); s('text', { x: gx + gw + 8, y: y + 10, 'font-size': 11.5, style: 'font-family:var(--mono)', text: `第 ${f + 1} 折 ${(a * 100).toFixed(1)}%` }, sv); });
      const m = S.mean(acc), sd = S.sd(acc);
      out.append(sv.parentNode, h('div', { class: 'grid2', style: { alignItems: 'start' } }, h('div', null, kpi([`${k} 折平均準確率`, (m * 100).toFixed(1) + '%', 'good'], ['各折標準差', (sd * 100).toFixed(1) + ' 點']), h('div', { style: { height: '8px' } }), lbl('只切一次 70/30（換 5 種亂數）：'), h('div', null, singles.map(a => tok((a * 100).toFixed(1) + '%', { mono: true }))), lbl(`單次切分的結果在 ${(Math.min(...singles) * 100).toFixed(1)}%–${(Math.max(...singles) * 100).toFixed(1)}% 之間跳動。`)),
        h('div', null, ttl('等價的 Python'), pre(`scores = cross_val_score(\n    DecisionTreeClassifier(max_depth=${P.depth}),\n    X, y, cv=${k})\nprint(scores.mean(), scores.std())`))),
        nt('每一筆資料都輪流當過一次測試，平均起來比只切一次穩定。AI Studio 把「每一折裡做什麼」畫成內層畫布：Training 放模型、Testing 放 Apply Model 與 Performance——巢狀關係是畫出來的。'));
    }
    $('#w-cv').append(ctl, out); draw();
  })();
  (function () {
    const OPS = [['Decision Tree', true, true], ['Naive Bayes', true, true], ['Linear Regression', false, false], ['Logistic Regression', false, false], ['SVM', false, false], ['k-Means', false, false], ['PCA', false, false]];
    const P = { op: 'Linear Regression', n2n: false, rmv: false }; const ctl = h('div'), out = h('div');
    ctl.append(row(lbl('接到：'), seg(OPS.map(o => [o[0], o[0]]), () => P.op, v => P.op = v, draw)), row(check('前面加 Nominal to Numerical', () => P.n2n, v => P.n2n = v, draw), check('前面加 Replace Missing Values', () => P.rmv, v => P.rmv = v, draw)));
    function draw() { out.innerHTML = ''; const [, nomOK, misOK] = OPS.find(o => o[0] === P.op);
      const cols = [['Sex', P.n2n ? 'numerical（Sex = female → 0/1）' : 'nominal'], ['Pclass', 'numerical'], ['Age', P.rmv ? 'numerical（缺值已補）' : 'numerical（含缺值）'], ['Survived', 'binominal・label']];
      const e1 = !nomOK && !P.n2n, e2 = !misOK && !P.rmv;
      out.append(h('div', null, cols.map(([c, t]) => tok(`${c}：${t}`, { bg: (c === 'Sex' && e1) || (c === 'Age' && e2) ? 'var(--bad-soft)' : '#eef3f2' }))),
        e1 || e2 ? nt(h('span', null, e1 ? h('div', null, h('b', null, `✗ ${P.op}：Operator cannot handle nominal attributes`), '　→ 加 Nominal to Numerical 轉換') : '', e2 ? h('div', null, h('b', null, `✗ ${P.op}：Missing values are not allowed`), '　→ 加 Replace Missing Values 或 Filter Examples') : ''), 'bad') : nt(`✓ ${P.op} 可以接上。${nomOK && !P.n2n ? '它吃得下類別型資料，不一定要先轉數值。' : ''}`),
        lbl('很多「運算子灰掉不能連」的問題，都是型別不對。常用轉換：Nominal to Numerical、Numerical to Polynominal、Nominal to Text。（各運算子能力為教學示意，以 Help 面板為準）')); }
    $('#w-type').append(ctl, out); draw();
  })();

  // ================= P11 =================
  (function () {
    const F = [
      ['監督式－分類', [['Decision Tree', 1, 'DecisionTreeClassifier()', 'M2-2'], ['Random Forest', 1, 'RandomForestClassifier()', 'M2-2'], ['Naive Bayes', 1, 'GaussianNB() / MultinomialNB()', 'M2-2'], ['k-NN', 1, 'KNeighborsClassifier()', 'M2-2'], ['Logistic Regression', 0, 'LogisticRegression()', ''], ['SVM (LibSVM)', 0, 'SVC()', ''], ['Rule Induction', 0, 'scikit-learn 無內建', ''], ['Gradient Boosted Trees', 0, 'GradientBoostingClassifier()', ''], ['Neural Net', 0, 'MLPClassifier()', '']]],
      ['監督式－迴歸', [['Linear Regression', 1, 'LinearRegression()', 'M2-1'], ['Polynomial Regression', 0, 'PolynomialFeatures() ＋ LinearRegression()', 'M2-1'], ['Generalized Linear Model', 0, 'statsmodels GLM', ''], ['Regression Tree', 0, 'DecisionTreeRegressor()', ''], ['SVM Regression', 0, 'SVR()', ''], ['Deep Learning (H2O)', 0, 'MLPRegressor() 或深度學習框架', 'M5'], ['kNN Regression', 0, 'KNeighborsRegressor()', '']]],
      ['非監督式', [['k-Means', 1, 'KMeans()', 'M3'], ['X-Means', 1, 'scikit-learn 無內建', 'M3'], ['DBSCAN', 0, 'DBSCAN()', ''], ['Agglomerative', 0, 'AgglomerativeClustering()', ''], ['Support Vector Clustering', 0, 'scikit-learn 無內建', ''], ['PCA / SVD', 1, 'PCA() / TruncatedSVD()', 'M3'], ['Self-Organizing Map', 0, 'scikit-learn 無內建', '']]],
      ['其他任務', [['FP-Growth（關聯規則）', 1, 'mlxtend 的 fpgrowth()', 'M4'], ['Association Rules', 1, 'mlxtend 的 association_rules()', 'M4'], ['LOF（離群偵測）', 1, 'LocalOutlierFactor()', 'M4'], ['One-Class SVM', 0, 'OneClassSVM()', ''], ['Anomaly Detection', 0, 'IsolationForest() 等', 'M4'], ['時間序列（擴充套件）', 0, 'statsmodels 等', 'M4']]],
    ];
    let only = false, sel = 'Decision Tree'; const ctl = h('div'), out = h('div');
    ctl.append(row(check('只看本課程使用的 ★', () => only, v => only = v, draw)));
    function draw() { out.innerHTML = ''; const g = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(160px,1fr))', gap: '8px' } }); let pick = null;
      F.forEach(([fam, L]) => g.append(box(fam, h('div', null, L.filter(a => !only || a[1]).map(a => { if (a[0] === sel) pick = [fam, ...a]; const b = h('button', { class: 'btn sm' + (a[0] === sel ? ' on' : ''), style: { display: 'block', width: '100%', textAlign: 'left', margin: '3px 0' } }, (a[1] ? '★ ' : '') + a[0]); b.onclick = () => { sel = a[0]; draw(); }; return b; })))));
      out.append(g); if (pick) out.append(nt(h('span', null, h('b', null, `${pick[1]}（${pick[0]}）`), '　Python：', code(pick[3]), pick[4] ? `　課程：${pick[4]}` : '　本課程範例未使用')));
      out.append(tbl(['模組', '主要運算子', '週次'], [['M1 資料工程', 'Replace Missing Values、Normalize、Detect Outlier、Nominal to Numerical、Generate Attributes', 'W2–W3'], ['M2-1 迴歸', 'Linear Regression、Polynomial Regression、Performance (Regression)', 'W4'], ['M2-2 分類', '★ Decision Tree、Naive Bayes、k-NN、Random Forest、Compare ROCs、Optimize Threshold', 'W5'], ['M3 非監督式', 'k-Means、X-Means、PCA、SVD、Cluster Model Visualizer', 'W6'], ['M4 進階監督式', 'Bagging、AdaBoost、Vote、Stacking、★ FP-Growth、LOF、Anomaly Detection', 'W7'], ['M5 深度學習', '★ DL4J 各層（Dense／Conv／Pooling／LSTM／Dropout）、H2O Deep Learning、Import Zoo Model', 'W8–W9'], ['M6 文字探勘', '★ Process Documents、Tokenize、Filter Stopwords、Generate n-Grams、TF-IDF', 'W11'], ['M7 生成式 AI', '★ Generative Models：Hugging Face 模型、Text2Text、Finetune、Embeddings', 'W12']]),
        lbl('想複習某個演算法時，直接到對應模組的範例資料夾找 .rmp 檔，開起來看流程怎麼組。')); }
    $('#w-algo').append(ctl, out); draw();
  })();

  // ================= P12 =================
  (function () {
    const E = [['core（核心）', 2774, '內建運算子'], ['Concurrency', 285, '平行處理、迴圈'], ['Text Processing', 236, '★ 必裝：斷詞、停用詞、TF-IDF、n-gram → M6'], ['Blending', 219, '資料混合、轉換'], ['Deep Learning', 210, '★ 必裝：逐層堆疊、CNN、LSTM、遷移學習 → M5'], ['Model Simulator', 97, '模型模擬與解釋'], ['H2O', 52, '★ 必裝：另一套深度學習與 GBM → M5 表格資料'], ['Image Handling', 42, '讀取影像、抽取影像特徵 → M5 前處理'], ['Web Mining', 38, '抓網頁、解析 HTML'], ['Generative Models', 38, '★ 必裝：Hugging Face 模型、微調、嵌入 → M7'], ['Operator Toolbox', 36, '補足核心缺少的實用運算子'], ['Time Series', 14, '滯後特徵、分解、預測 → M4 延伸'], ['Python Scripting', 12, '★ 在流程中插入 Python——兩個世界的橋樑（P14）']];
    let sel = 2; const out = h('div');
    function draw() { out.innerHTML = ''; const W = 720, rh = 22, H = E.length * rh + 30, sv = svgBox(h('div'), W, H), x0 = 150, xw = 470, L = v => Math.log10(v) / Math.log10(3000) * xw;
      [10, 100, 1000].forEach(t => { s('line', { x1: x0 + L(t), x2: x0 + L(t), y1: 4, y2: H - 22, class: 'grid' }, sv); s('text', { x: x0 + L(t), y: H - 6, 'text-anchor': 'middle', 'font-size': 11, text: t.toLocaleString() }, sv); });
      E.forEach(([n, v, d], i) => { const y = 6 + i * rh, must = d.startsWith('★ 必裝'), g = s('g', { style: 'cursor:pointer' }, sv);
        s('text', { x: x0 - 8, y: y + 14, 'text-anchor': 'end', 'font-size': 12.5, 'font-weight': must ? 700 : 400, text: n }, g);
        s('rect', { x: x0, y: y + 2, width: L(v), height: rh - 6, rx: 3, fill: i === sel ? 'var(--accent)' : must ? '#e0a34a' : '#cfcac0' }, g);
        s('text', { x: x0 + L(v) + 6, y: y + 14, 'font-size': 12, style: 'font-family:var(--mono)', text: v.toLocaleString() }, g); g.addEventListener('click', () => { sel = i; draw(); }); });
      out.append(cap(sv.parentNode, 720), nt(h('span', null, h('b', null, E[sel][0] + '：'), E[sel][2], `（出現 ${E[sel][1].toLocaleString()} 次）`), E[sel][2].startsWith('★ 必裝') ? 'warn' : ''), lbl('對數刻度；橘色＝本課程必裝的四個。點長條看用途。')); }
    $('#w-ext').append(out); draw();
  })();
  U.sorter('#w-extq', [
    ['Tokenize', 'Text Processing', 'M6 斷詞。'], ['Process Documents from Data', 'Text Processing', 'M6 文字轉向量（TF-IDF）。'], ['Add Convolutional Layer', 'Deep Learning', 'M5 的 DL4J 各層。'], ['LSTM 層', 'Deep Learning', 'M5 的 DL4J 各層。'], ['H2O Deep Learning', 'H2O', 'M5 表格資料主力。'], ['Hugging Face Text2Text', 'Generative Models', 'M7 生成式 AI。'], ['Execute Python', 'Python Scripting', '兩個世界的橋樑。'],
  ], ['Text Processing', 'Deep Learning', 'H2O', 'Generative Models', 'Python Scripting'], '裝完必須重開軟體才會生效。');

  // ================= P13 =================
  U.sorter('#w-tools3', [
    ['拿到新資料，想像 Excel 一樣先看看、試著清一清', 'Turbo Prep', '探索期快速試；改完記得一鍵轉成 Process。'],
    ['想先知道「大概什麼模型、準確率多少」當基準線', 'Auto Model', '自動試多種演算法並比較，產出模型比較表。'],
    ['專題要 Demo，讓別人用 REST API 呼叫你的模型', 'Deployments', '發佈成服務、排程、REST API；免費版有功能限制。'],
    ['M4 作業：比較 Bagging 與 AdaBoost', '自己拉流程', '作業與專題必須自己拉流程——要學的是「為什麼這樣做」。'],
    ['用 Turbo Prep 清好資料，但換台電腦要重現', '自己拉流程', 'Turbo Prep 改完要轉成 Process，否則換一台電腦就重現不了。'],
  ], ['Turbo Prep', 'Auto Model', 'Deployments', '自己拉流程']);

  // ================= P14 =================
  (function () {
    const IN = [{ id: 1, w: 62, h: 1.58, age: 81, note: 'BP 142/88，步態不穩' }, { id: 2, w: 75, h: 1.70, age: 67, note: '血壓 128/80，精神佳' }, { id: 3, w: 48, h: 1.52, age: 88, note: 'BP 165/95，夜間跌倒一次' }, { id: 4, w: 90, h: 1.75, age: 59, note: '今日未量血壓' }];
    const SN = {
      bp: { t: '複雜字串處理：從紀錄文字抽出收縮壓', ok: true, code: "import re\ndef rm_main(data):\n    # data = 上游 ExampleSet，已自動轉成 DataFrame\n    data['sbp'] = data['note'].str.extract(r'(\\d{2,3})/\\d{2,3}')[0].astype(float)\n    return data          # 回傳後再轉回 ExampleSet", add: ['sbp'], f: r => { const m = /(\d{2,3})\/\d{2,3}/.exec(r.note); return { sbp: m ? +m[1] : '?' }; }, why: '✓ 值得寫：正規表示式抽數字是現成運算子不好做的字串處理。抽不到的列會是缺值（?），下游要記得補。' },
      risk: { t: '特殊計算邏輯：自訂跌倒風險分數', ok: true, code: "def rm_main(data):\n    score = (data['age'] >= 80).astype(int) * 2\n    score += data['note'].str.contains('跌倒|步態不穩').astype(int) * 3\n    data['fall_risk'] = score\n    return data", add: ['fall_risk'], f: r => ({ fall_risk: (r.age >= 80 ? 2 : 0) + (/跌倒|步態不穩/.test(r.note) ? 3 : 0) }), why: '✓ 值得寫：多條件、混合文字比對的特殊邏輯。（分數規則為示意）' },
      bmi: { t: '計算 BMI（講義示範語法）', ok: false, code: "def rm_main(data):\n    data['bmi'] = data['w'] / data['h']**2\n    return data", add: ['bmi'], f: r => ({ bmi: +(r.w / r.h ** 2).toFixed(1) }), why: '△ 語法示範用；實務上 Generate Attributes 就做得到——有現成運算子就別寫，寫了就失去「流程看得見」的好處。' },
      z: { t: '把 age 標準化', ok: false, code: "def rm_main(data):\n    data['age'] = (data['age'] - data['age'].mean()) / data['age'].std()\n    return data", add: ['age'], f: (r, all) => { const m = S.mean(all.map(x => x.age)), sd = S.sd(all.map(x => x.age)); return { age: +((r.age - m) / sd).toFixed(2) }; }, why: '✗ 不該寫：Normalize 運算子就是做這件事。' },
    };
    let k = 'bp'; const ctl = h('div'), out = h('div');
    ctl.append(row(seg(Object.keys(SN).map(x => [x, SN[x].t]), () => k, v => k = v, draw)));
    function draw() { out.innerHTML = ''; const sn = SN[k], OUT = IN.map(r => ({ ...r, ...sn.f(r, IN) }));
      const strip = h('div', { style: { display: 'flex', gap: '4px', alignItems: 'center', flexWrap: 'wrap', margin: '4px 0 8px' } }, ['Retrieve', '前處理運算子', '★ Execute Python', 'Decision Tree', 'Performance'].map((t, i) => [i ? h('span', { style: { color: 'var(--muted)' } }, '→') : '', tok(t, { bg: i === 2 ? 'var(--amber-soft)' : '#eef3f2', b: i === 2 })]).flat());
      const T = (rows, hl) => h('div', { class: 'tscroll' }, h('table', { class: 'dt' }, h('tr', null, Object.keys(rows[0]).map(c => h('th', { style: hl.includes(c) ? { background: 'var(--amber)', color: '#fff' } : {} }, c))), rows.map(r => h('tr', null, Object.entries(r).map(([c, v]) => h('td', { class: hl.includes(c) ? 'hl' : '', style: { fontSize: '13px' } }, v))))));
      out.append(strip, h('div', { class: 'grid2', style: { alignItems: 'start' } }, h('div', null, ttl('Execute Python 裡面'), pre(sn.code)), h('div', null, ttl('上游 ExampleSet → DataFrame'), T(IN, []), ttl('回傳 → ExampleSet 接給下游'), T(OUT, sn.add))), nt(sn.why, sn.ok ? '' : k === 'z' ? 'bad' : 'warn'),
        lbl('ExampleSet ⇄ DataFrame 的轉換，Execute Python 幫你做掉了。先在熟悉的流程裡插一小段 Python，比一開始就整個換成程式碼溫和得多。（資料為虛構）')); }
    $('#w-pyop').append(ctl, out); draw();
  })();

  // ================= P15 =================
  U.sorter('#w-which', [
    ['學習與教學：想讓同學看見每一步資料怎麼流', 'AI Studio', '概念看得見。'],
    ['標準專案：讀檔 → 清理 → 建模 → 評估', 'AI Studio', '標準流程專案正是它的強項。'],
    ['要用上個月論文剛發表的新方法', 'Python', '最新演算法在 Python 生態永遠更快。'],
    ['資料有五千萬列，需要分散式運算', 'Python', '單機工具，千萬列以上會明顯變慢。'],
    ['團隊裡有非工程背景的護理師要一起看流程', 'AI Studio', '★ 流程要交給別人接手維護時也適合。'],
    ['需要版本控制與自動化測試（CI/CD）', 'Python', '.rmp 是 XML，diff 幾乎不可讀。'],
    ['先快速比較多種演算法建立基準線，確定方向後再正式部署', '兩者並用', '實務最常見：AI Studio 探索，Python 做正式實作。'],
  ], ['AI Studio', 'Python', '兩者並用'], '工具會換，流程不會。');

  // ================= P16 =================
  $('#w-keys').append(tbl(['操作', '方式', '為什麼有用'], [['執行流程', 'Ctrl + Enter（或 F11）', '★ 最常用'], ['看中間結果', '★ 對著任一條連線點按滑鼠中鍵', '等同 print(df.head())，但不用改任何東西'], ['快速找運算子', 'Operators 搜尋框直接打名稱', '比在分類樹裡翻快得多'], ['加入運算子', '拖到「現有連線」上會自動插入', '不用手動重接線'], ['暫時停用運算子', '右鍵 → Disable Operator', '除錯時比刪掉再加回來方便'], ['加註解', '右鍵 → Add Comment', '★ 交作業與給別人看時很重要'], ['整理版面', '右鍵空白處 → Auto-Layout / Rearrange', '流程亂掉時一鍵整齊'], ['看運算子說明', '選中它，看右下角 Help 面板', '★ 比 Google 快'], ['匯出流程', 'File → Export Process', '交作業用；含所有參數設定']]));
  U.sorter('#w-errmsg', [
    ['Input ExampleSet has no label attribute', '加 Set Role', '沒有指定目標欄——把目標欄設成 label。'],
    ['Operator cannot handle nominal attributes', '加 Nominal to Numerical', '運算子吃不下類別型資料。'],
    ['Missing values are not allowed', '加 Replace Missing Values', '資料還有缺值（或用 Filter Examples 濾掉）。'],
    ['Operator not found／紅色驚嘆號', '補裝擴充套件', 'Extensions → Marketplace 補裝，重開軟體。'],
    ['Cannot connect ports (type mismatch)', '檢查埠型別', '模型接模型埠、資料接資料埠。'],
    ['Java heap space / OutOfMemory', '先抽樣或調記憶體', '先 Sample；或調高 JVM 記憶體上限。'],
    ['Repository entry not found', '重新指定 Retrieve', '資料被搬走或改名。'],
  ], ['加 Set Role', '加 Nominal to Numerical', '加 Replace Missing Values', '補裝擴充套件', '檢查埠型別', '先抽樣或調記憶體', '重新指定 Retrieve'], '前三個佔新手九成：資料還沒準備好就接到建模運算子。');

  // ================= P17 =================
  (function () {
    const T = [['RapidMiner Academy 微課程 1', '每個約 10–20 分鐘，適合課後補強'], ['RapidMiner Academy 微課程 2', ''], ['RapidMiner Academy 微課程 3', '課程建議：學期中至少完成三門'], ['考一張 Professional 認證', '通過可得數位徽章，可放進履歷與 LinkedIn'], ['作業流程加 Comment、檔名有意義', '例：M4_集成比較_v2.rmp，不要叫 process(3).rmp'], ['資料放 Repository、流程用 Retrieve', '不寫死絕對路徑；資料夾用純英文'], ['每加一個運算子就用滑鼠中鍵看一次', '跟 Python「每寫幾行就 print 一次」是同一個習慣'], ['看一個 Goldmine 真實案例', '看別人怎麼組流程，比看教學更有感']];
    const st = Store.get('ais:todo', {}); const out = h('div');
    function draw() { out.innerHTML = ''; T.forEach(([t, d], i) => { const c = h('input', { type: 'checkbox' }); c.checked = !!st[i]; c.onchange = () => { st[i] = c.checked; Store.set('ais:todo', st); draw(); }; out.append(h('label', { style: { display: 'flex', gap: '10px', padding: '6px 2px', borderBottom: '1px solid var(--line)', fontSize: '14.5px', alignItems: 'baseline' } }, c, h('span', null, h('b', null, t), d ? h('span', null, '　', lbl(d)) : ''))); });
      const n = T.filter((_, i) => st[i]).length; out.append(row(h('span', { class: 'tag ' + (n === T.length ? 'good' : 'gray') }, `完成 ${n} / ${T.length}`), lbl('遇到錯誤先看訊息本身，再搜 Community 論壇。'))); }
    $('#w-todo').append(out); draw();
  })();
  $('#w-limits').append(h('div', { class: 'grid2' }, box('① 最新的演算法會慢一拍', '新方法要等一段時間才有運算子；★ PyTorch、Hugging Face 永遠更快。折衷：Execute Python 或 Generative Models 擴充。'), box('② 大規模資料會吃力', '★ 單機工具，千萬列以上明顯變慢，沒有原生分散式運算。折衷：先抽樣建模，確定方向再跑全量。'), box('③ 版本控制與協作較弱', '★ .rmp 是 XML，可放 Git 但 diff 幾乎不可讀；多人同改易衝突。折衷：拆小流程、重要版本檔名加日期。'), box('④ 產業採用度不如 Python', '★ 職缺多半寫 Python／R。但不影響它作為學習工具的價值——把它當「學概念的鷹架」。')), nt('前兩點是能力邊界，多數課堂與研究專案不會踩到。說得出限制才表示你真的了解它——這也呼應 M9 的立場。'));

  // ================= P18 =================
  U.flashcards('#w-cards', [['流程', 'Process', '整個分析流程，存成 .rmp'], ['運算子', 'Operator', '流程中的一個步驟＝一個函式呼叫'], ['埠', 'Port', '輸入輸出接點；連線＝變數傳遞'], ['資料集', 'ExampleSet', '≈ pandas DataFrame'], ['列', 'Example', '≈ row'], ['欄', 'Attribute', '≈ column'], ['角色', 'Role', 'regular／label／id／weight／prediction'], ['目標欄', 'label', "＝ Python 的 y = df['label']"], ['套用模型', 'Apply Model', '＝ model.predict()；兩個輸入'], ['交叉驗證', 'Cross Validation', '巢狀子流程＝cross_val_score()'], ['子流程', 'Subprocess', '運算子裡面還有運算子'], ['儲存庫', 'Repository', '受管理的資料夾；用 Retrieve 取用'], ['擴充套件', 'Extension', 'Marketplace 安裝，裝完重開'], ['互動資料準備', 'Turbo Prep', '改完要轉成 Process'], ['自動建模', 'Auto Model', '建立基準線，別直接交作業'], ['執行 Python', 'Execute Python', 'rm_main(data)：ExampleSet ⇄ DataFrame']]);
  U.finalQuiz('#w-final', [
    ['AI Studio 的 Set Role（label）對應到 Python 的哪一行？', ["model.fit(X, y)", "y = df['label']", 'train_test_split()', 'df.dropna()'], 1, '指定哪一欄是要預測的目標。'],
    ['Apply Model 對應到？', ['model.fit()', 'model.predict()', 'cross_val_score()', 'pd.read_csv()'], 1, '把訓練好的模型套到新資料上。'],
    ['Decision Tree 運算子的輸出是什麼？', ['預測值', '一個模型', '準確率', '混淆矩陣'], 1, '預測值要等 Apply Model 之後才出現。'],
    ['Apply Model 的兩個輸入應該接？', ['兩條都接 Split Data', '模型（Decision Tree）＋測試資料（Split Data）', '訓練資料＋測試資料', 'Retrieve＋Performance'], 1, '第 ⑤ 步最容易接錯。'],
    ['出現「Input ExampleSet has no label attribute」，最可能的原因？', ['擴充套件沒裝', '忘了 Set Role', '記憶體不足', '路徑含中文'], 1, '忘了 Set Role 是初學者最常見的錯誤。'],
    ['開範例檔出現紅色驚嘆號、訊息寫 operator not found，該怎麼辦？', ['重灌作業系統', 'Extensions → Marketplace 補裝擴充套件並重開', '改用 Python', '刪掉那個運算子'], 1, '必裝四個：Text Processing、Deep Learning、H2O、Generative Models。'],
    ['ExampleSet 裡「一列」叫什麼？', ['Attribute', 'Example', 'Port', 'Role'], 1, '一列叫 Example、一欄叫 Attribute。'],
    ['本課程建議的免費授權路徑是？', ['用私人信箱註冊個人版', '用學校 email 走學生版', '購買商業授權', '只用 30 天試用版'], 1, '12 個月可續約至畢業、無功能限制。'],
    ['什麼情況最適合插一段 Execute Python？', ['標準化一個欄位', '從紀錄文字用正規表示式抽出數字', '切分訓練測試', '讀取 CSV'], 1, '有現成運算子就別寫；值得寫的是特殊邏輯與複雜字串處理。'],
    ['關於 Auto Model，課程的立場是？', ['可以直接交作業', '可以建立基準線，但作業與專題必須自己拉流程', '禁止使用', '比自己拉流程更準所以優先'], 1, '要學的是「為什麼這樣做」。'],
  ]);
  (function () {
    const R = [['九步驟 1:1', '換到 Python 一步都不會少。', 'p01'], ["Set Role ＝ y = df['label']", 'pandas 沒有 Role，AI Studio 有。', 'p08'], ['Apply Model ＝ predict()', '兩個輸入：模型＋測試資料。', 'p09'], ['CV 子流程＝cross_val_score()', '而且結構更看得見。', 'p10'], ['學校 email 走學生版', '12 個月可續約至畢業。', 'p05'], ['四個擴充套件', 'Text Processing、Deep Learning、H2O、Generative Models。', 'p12'], ['四個核心概念', 'Process、Operator、Port、ExampleSet。', 'p08'], ['滑鼠中鍵', '最被低估的功能＝print(df.head())。', 'p16'], ['鷹架不是終點', 'AI Studio 探索，Python 正式實作。', 'p15']];
    const g = h('div', { class: 'grid3' }); R.forEach(([t, d, id], i) => g.append(h('a', { href: '#' + id, style: { textDecoration: 'none', color: 'inherit', border: '1px solid var(--line)', borderRadius: '10px', padding: '10px 12px', background: '#fff', display: 'block' } }, h('div', { class: 'mono', style: { color: 'var(--accent)', fontWeight: 700 } }, i + 1), h('b', null, t), h('div', { style: { fontSize: '13.5px', color: 'var(--muted)' } }, d))));
    $('#w-review').append(g, h('div', { class: 'note' }, h('b', null, '下一步：'), '拿這一頁的對照表，回到各模組的 .rmp 範例逐步對照。', h('a', { href: '../' }, '回到課程首頁 →')));
  })();
})();
