/* 補充教材 AI Studio × Python 互動頁 A：PART 01–09 */
(function () {
  'use strict';
  const { h, $, s, svgBox, rng, randn, seg, slider, check, Store } = U;
  U.initModule('ais');
  const cap = (el, px) => { el.style.maxWidth = px + 'px'; el.style.width = '100%'; el.style.margin = '0 auto'; return el; };
  const row = (...a) => h('div', { class: 'row', style: { marginBottom: '6px' } }, ...a);
  const lbl = t => h('span', { style: { fontSize: '14px', color: 'var(--muted)' } }, t);
  const nt = (t, cls = '') => h('div', { class: 'note ' + cls, style: { fontSize: '14px' } }, t);
  const ttl = t => h('b', { style: { fontSize: '13.5px' } }, t);
  const kpi = (...a) => h('div', { class: 'kpi' }, ...a.map(([k, v, c]) => h('div', null, h('div', { class: 'k' }, k), h('div', { class: 'v ' + (c || '') }, v))));
  const tok = (t, o = {}) => h('span', { title: o.title || '', style: { display: 'inline-block', margin: '2px', padding: '3px 7px', borderRadius: '6px', fontSize: '14px', background: o.bg || '#eef3f2', border: '1px solid ' + (o.bd || 'transparent'), fontWeight: o.b ? 700 : 400, color: o.c || 'inherit', fontFamily: o.mono ? 'var(--mono)' : 'inherit' } }, t);
  const tbl = (head, rows, o = {}) => h('div', { class: 'tscroll' }, h('table', { class: 'dt' }, h('tr', null, head.map(c => h('th', null, c))), rows.map(r => h('tr', null, r.map((v, j) => v instanceof Node ? h('td', null, v) : h('td', { class: typeof v === 'number' ? 'num' : '', style: { fontWeight: j || o.plain ? 400 : 600, fontFamily: o.monoCol === j ? 'var(--mono)' : '' } }, v))))));
  const pre = (t, o = {}) => h('pre', { style: { whiteSpace: 'pre-wrap', background: o.bg || '#f6f5f1', border: '1px solid var(--line)', borderRadius: '8px', padding: '10px 12px', fontSize: '13px', lineHeight: '1.6', margin: '6px 0', fontFamily: 'var(--mono)' } }, t);
  const box = (title, body, o = {}) => h('div', { style: { border: '1px solid ' + (o.bd || 'var(--line)'), background: o.bg || '#fff', borderRadius: '10px', padding: '10px 12px', fontSize: '14px', ...(o.st || {}) } }, title ? h('div', { style: { fontWeight: 700, marginBottom: '4px', color: o.tc || 'inherit' } }, title) : '', body);
  const code = t => h('code', { style: { fontFamily: 'var(--mono)', fontSize: '13px', background: '#f1efe9', padding: '1px 5px', borderRadius: '4px' } }, t);

  /* 仿 Titanic 結構的模擬乘客（非真實資料） */
  const DATA = (function () { const R = rng(2027), D = [];
    for (let i = 0; i < 300; i++) { const sex = R() < .35 ? 1 : 0, u = R(), pc = u < .25 ? 1 : u < .46 ? 2 : 3, age = Math.round(Math.min(75, Math.max(1, 30 + 13 * randn(R))));
      const z = -.9 + 2.4 * sex - .9 * (pc - 2) - .02 * (age - 30) + (age < 10 ? 1 : 0); D.push({ id: i + 1, sex, pclass: pc, age, y: R() < 1 / (1 + Math.exp(-z)) ? 1 : 0 }); }
    return D; })();
  const FEAT = ['Sex', 'Pclass', 'Age'], X = d => [d.sex, d.pclass, d.age];
  const treeTxt = (t, ind = '') => t.leaf ? `${ind}→ ${t.p >= .5 ? 'yes' : 'no'}（存活率 ${(t.p * 100).toFixed(0)}%，n=${t.n}）\n` : `${ind}${FEAT[t.j]} ${t.j === 0 ? '= male' : '≤ ' + t.t}\n${treeTxt(t.l, ind + '│  ')}${ind}${FEAT[t.j]} ${t.j === 0 ? '= female' : '> ' + t.t}\n${treeTxt(t.r, ind + '│  ')}`;
  const AIS = window.AIS = { cap, row, lbl, nt, ttl, kpi, tok, tbl, pre, box, code, DATA, FEAT, X, treeTxt };

  // ================= P01 =================
  (function () {
    const ST = [['讀取資料', 'Read CSV / Retrieve', 'pd.read_csv()', '從 Repository 拉出資料，或讀外部 CSV。'], ['檢視與清理', 'Statistics / Replace Missing Values', 'df.describe()　df.dropna()', '先看分布與缺值，再決定怎麼補。'], ['特徵工程', 'Nominal to Numerical / Normalize', 'pd.get_dummies()　StandardScaler()', '類別轉數值、縮放。'], ['設定目標欄', '★ Set Role（label）', "y = df['label']", '★ 指定哪一欄是要預測的目標。概念完全相同，只是一個用拖拉、一個用程式碼。'], ['切分資料', 'Split Data', 'train_test_split()', '拉出兩條線：上面訓練、下面測試。'], ['訓練模型', 'Decision Tree / Naive Bayes ⋯', 'model.fit(X_train, y_train)', '輸入訓練資料，輸出一個「模型」（不是預測值）。'], ['套用模型', '★ Apply Model', 'model.predict(X_test)', '★ 把訓練好的模型套到新資料上；Apply Model ＝ model.predict()。'], ['評估', 'Performance (Classification)', 'classification_report()', '輸入帶預測的資料，輸出準確率、混淆矩陣。'], ['交叉驗證', '★ Cross Validation（巢狀子流程）', 'cross_val_score()', '★ AI Studio 把它做成可放進其他運算子的巢狀容器——反而比程式碼更看得見結構。']];
    const CODE = [[null, 'import pandas as pd'], [null, 'from sklearn.model_selection import train_test_split, cross_val_score'], [null, 'from sklearn.tree import DecisionTreeClassifier'], [null, 'from sklearn.metrics import classification_report'], [null, ''], [0, "df = pd.read_csv('titanic.csv')"], [1, 'print(df.describe()); df = df.dropna()'], [2, "X = pd.get_dummies(df.drop(columns=['Survived']))"], [3, "y = df['Survived']"], [4, 'X_tr, X_te, y_tr, y_te = train_test_split(X, y, test_size=0.3)'], [5, 'model = DecisionTreeClassifier().fit(X_tr, y_tr)'], [6, 'pred = model.predict(X_te)'], [7, 'print(classification_report(y_te, pred))'], [8, 'print(cross_val_score(DecisionTreeClassifier(), X, y, cv=10).mean())']];
    const N = '①②③④⑤⑥⑦⑧⑨'; let k = 3; const out = h('div');
    function draw() { out.innerHTML = ''; const left = h('div', { style: { display: 'grid', gap: '4px' } });
      ST.forEach(([n, op, py], i) => { const on = i === k, b = h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 92px 1fr', gap: '6px', alignItems: 'center', cursor: 'pointer', border: '1.5px solid ' + (on ? 'var(--accent)' : 'var(--line)'), background: on ? 'var(--accent-soft)' : '#fff', borderRadius: '8px', padding: '5px 8px', fontSize: '13px' } }, h('span', { style: { fontFamily: 'var(--mono)', textAlign: 'right' } }, py), h('b', { style: { textAlign: 'center', color: 'var(--accent)' } }, `${N[i]} ${n}`), h('span', null, op)); b.onclick = () => { k = i; draw(); }; left.append(b); });
      const cd = h('pre', { style: { background: '#1f2a2b', color: '#d9e4e2', borderRadius: '8px', padding: '10px 12px', fontSize: '12.5px', lineHeight: '1.7', margin: 0, fontFamily: 'var(--mono)', whiteSpace: 'pre-wrap' } }, CODE.map(([st, t]) => h('div', { style: st === k ? { background: '#3d5a57', color: '#fff', borderRadius: '3px', fontWeight: 700 } : { opacity: st == null ? .6 : 1 } }, st != null ? t + `    # ${N[st]}` : (t || ' '))));
      out.append(h('div', { style: { display: 'grid', gridTemplateColumns: 'minmax(0,1.15fr) minmax(0,1fr)', gap: '12px' } }, h('div', null, h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 92px 1fr', gap: '6px', fontSize: '12px', color: 'var(--muted)', padding: '0 8px 4px' } }, h('span', { style: { textAlign: 'right' } }, 'Python（pandas＋scikit-learn）'), h('span', { style: { textAlign: 'center' } }, '九個步驟'), h('span', null, 'AI Studio（拖拉運算子）')), left), h('div', null, ttl('完整 Python 程式'), cd)),
        nt(h('span', null, h('b', null, `${N[k]} ${ST[k][0]}：`), ST[k][3]), k === 3 || k === 6 || k === 8 ? 'warn' : ''));
    }
    $('#w-nine').append(out); draw();
  })();

  // ================= P02 =================
  const OPS = [
    ['資料處理', '讀取資料', 'Retrieve / Read CSV / Read Excel', 'pd.read_csv() / pd.read_excel()'], ['資料處理', '查看統計', 'Statistics（結果頁）', 'df.describe() / df.info()'], ['資料處理', '篩選列', 'Filter Examples', "df[df['age'] > 65]"], ['資料處理', '選擇欄', 'Select Attributes', "df[['age','bmi','sex']]"], ['資料處理', '新增計算欄', 'Generate Attributes', "df['bmi'] = df['w'] / df['h']**2"], ['資料處理', '缺值處理', 'Replace Missing Values', 'df.fillna() / SimpleImputer()'],
    ['特徵與切分', '類別轉數值', 'Nominal to Numerical', 'pd.get_dummies() / OneHotEncoder()'], ['特徵與切分', '標準化', 'Normalize', 'StandardScaler()'], ['特徵與切分', '★ 指定目標欄', '★ Set Role（label）', "★ y = df['label']"], ['特徵與切分', '合併資料', 'Join', 'pd.merge()'], ['特徵與切分', '群組彙總', 'Aggregate', 'df.groupby().agg()'], ['特徵與切分', '切分訓練測試', 'Split Data', 'train_test_split()'],
    ['建模', '決策樹', 'Decision Tree', 'DecisionTreeClassifier()'], ['建模', '隨機森林', 'Random Forest', 'RandomForestClassifier()'], ['建模', '樸素貝氏', 'Naive Bayes', 'GaussianNB() / MultinomialNB()'], ['建模', 'k 近鄰', 'k-NN', 'KNeighborsClassifier()'], ['建模', '線性迴歸', 'Linear Regression', 'LinearRegression()'], ['建模', '邏輯斯迴歸', 'Logistic Regression（H2O）', 'LogisticRegression()'], ['建模', 'k-Means 分群', 'k-Means', 'KMeans()'], ['建模', '主成分分析', 'PCA', 'PCA()'],
    ['套用與評估', '★ 套用模型', '★ Apply Model', '★ model.predict()'], ['套用與評估', '評估分類', 'Performance (Classification)', 'classification_report()'], ['套用與評估', '評估迴歸', 'Performance (Regression)', 'mean_squared_error() / r2_score()'], ['套用與評估', '★ 交叉驗證', '★ Cross Validation（子流程）', '★ cross_val_score()'], ['套用與評估', '參數最佳化', 'Optimize Parameters (Grid)', 'GridSearchCV()'], ['套用與評估', '特徵重要性', 'Weight by ⋯ / 模型輸出', 'model.feature_importances_'],
  ];
  AIS.OPS = OPS;
  (function () {
    let cat = '全部', q = ''; const out = h('div'), ctl = h('div');
    const inp = h('input', { type: 'text', placeholder: '搜尋：例如 predict、缺值、Join…', style: { width: '260px', padding: '5px 8px' } }); inp.oninput = () => { q = inp.value.trim().toLowerCase(); draw(); };
    ctl.append(row(seg(['全部', '資料處理', '特徵與切分', '建模', '套用與評估'].map(c => [c, c]), () => cat, v => cat = v, draw), inp));
    const NOTE = { '資料處理': '★ 這幾張對照表建議印出來放在旁邊。', '特徵與切分': '★ Set Role 是 AI Studio 特有的：把「哪一欄是 y」變成欄位的屬性，而不是另外開一個變數。', '建模': '★ 名字幾乎一樣——因為兩邊用的是同一套演算法，只是包裝不同。', '套用與評估': '★ 交叉驗證在 AI Studio 是一個「容器」，訓練與測試流程放在它裡面——這個巢狀結構比 cross_val_score() 更看得見在做什麼。' };
    function draw() { out.innerHTML = ''; const R = OPS.filter(r => (cat === '全部' || r[0] === cat) && (!q || r.join(' ').toLowerCase().includes(q)));
      out.append(R.length ? tbl(['類別', '任務', 'AI Studio 運算子', 'Python（pandas／scikit-learn）'], R.map(r => [r[0], r[1], r[2], h('span', { style: { fontFamily: 'var(--mono)', fontSize: '13px' } }, r[3])])) : nt('找不到——換個關鍵字試試。'), cat !== '全部' ? nt(NOTE[cat]) : lbl(`共 ${R.length} 列`)); }
    $('#w-lookup').append(ctl, out); draw();
  })();
  (function () {
    let seed = 1, i = 0, score = 0, ans = null; const out = h('div'); let Q = [];
    function make() { const R = rng(seed), pool = OPS.slice().sort(() => R() - .5).slice(0, 8); Q = pool.map(r => { const others = OPS.filter(o => o !== r && o[0] === r[0]).sort(() => R() - .5).slice(0, 3); const opts = [r, ...others].sort(() => R() - .5); return { r, opts }; }); i = 0; score = 0; ans = null; }
    function draw() { out.innerHTML = ''; if (i >= Q.length) { out.append(kpi(['得分', `${score} / ${Q.length}`, score >= 7 ? 'good' : '']), nt(score >= 7 ? '左邊那一欄已經很熟了，右邊只是語法。' : '再回去看一次對照表，特別是標 ★ 的三列。', score >= 7 ? '' : 'warn'), h('button', { class: 'btn', onclick: () => { seed++; make(); draw(); } }, '換一組題目')); return; }
      const { r, opts } = Q[i];
      out.append(lbl(`第 ${i + 1} / ${Q.length} 題　`), h('div', { style: { fontSize: '16px', margin: '6px 0' } }, 'AI Studio 運算子 ', h('b', null, r[2].replace('★ ', '')), ' 對應到 Python 的？'),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(230px,1fr))', gap: '6px' } }, opts.map(o => { const b = h('button', { class: 'btn', style: { fontFamily: 'var(--mono)', justifyContent: 'flex-start', textAlign: 'left' } }, o[3].replace('★ ', '')); if (ans) { if (o === r) b.style.cssText += 'background:var(--good-soft);border-color:var(--good)'; else if (o === ans) b.style.cssText += 'background:var(--bad-soft);border-color:var(--bad)'; } b.onclick = () => { if (ans) return; ans = o; if (o === r) score++; draw(); }; return b; })),
        ans ? row(h('span', { style: { color: ans === r ? 'var(--good)' : 'var(--bad)', fontWeight: 700 } }, ans === r ? '✓ 答對' : `✗ 正解：${r[3].replace('★ ', '')}`), h('button', { class: 'btn sm', onclick: () => { i++; ans = null; draw(); } }, '下一題 →')) : '');
    }
    make(); $('#w-match').append(out); draw();
  })();

  // ================= P03 =================
  U.sorter('#w-learnpy', [
    ['你已經能獨立完成一個完整專案（本課程結束時應該可以）', '該開始學 Python', '這時候拿對照表一列一列把語法補上去，會快非常多。'],
    ['你要寫論文、要用最新的方法', '該開始學 Python', '最新演算法在 Python 生態永遠更快。'],
    ['你要跟工程團隊協作，把模型整合進既有系統', '該開始學 Python', '需要版本控制與自動化測試時，Python 比較合適。'],
    ['才第三週，九個步驟還在摸索', '先把概念弄懂', '先學語法再學概念的人，常常寫得出程式卻說不出為什麼。'],
    ['想用 Python 交作業，但說不出每一步在做什麼', '先把概念弄懂', '課程不禁止用 Python 交作業，但評分重點是你說得出每一步在做什麼。'],
    ['遇到 AI Studio 真的做不到的事', '該開始學 Python', '先用 Execute Python 在熟悉的流程裡插一小段——這是溫和的起點。'],
  ], ['該開始學 Python', '先把概念弄懂'], 'M10 的 Vibe Coding 也是一條路：請 AI 幫你把流程翻成程式碼。');

  // ================= P04 =================
  (function () {
    const Y = [['2001–2007', 'YALE', '德國多特蒙德工業大學的研究專案（Yet Another Learning Environment）。'], ['2007–2022', 'RapidMiner Studio', '★ 最廣為人知的名字。大量教材、書籍、影片仍用這個名稱。'], ['2022–2024', 'RapidMiner（Altair 收購）', 'Altair 併購 RapidMiner。'], ['2024–2025', 'Altair AI Studio', 'Altair 時期的名稱。市面上多數教材、影片停在這個名字。'], ['2025–', '★ RapidMiner AI Studio', 'Siemens 併購 Altair 後，官方文件已改回這個名稱。最新版 2026.1.1（2026/04）。']];
    let yi = 4; const out = h('div');
    function draw() { out.innerHTML = ''; out.append(h('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap', marginBottom: '10px' } }, Y.map(([y, t], i) => { const b = h('button', { class: 'btn' + (i === yi ? ' on' : ''), style: { flex: '1 0 120px', flexDirection: 'column', alignItems: 'flex-start', display: 'flex' } }, h('b', null, y), h('span', { style: { fontSize: '12px' } }, t)); b.onclick = () => { yi = i; draw(); }; return b; })),
      nt(h('span', null, h('b', null, `${Y[yi][0]}　${Y[yi][1]}：`), Y[yi][2])), nt('實務上：安裝檔、授權頁與社群仍大量並用兩個名字；本頁一律簡稱「AI Studio」。搜尋時用「RapidMiner」往往找到更多內容。', 'warn')); }
    $('#w-name').append(out); draw();
  })();
  $('#w-peers').append(h('div', { class: 'grid2' }, box('同類型的工具', h('ul', { style: { margin: '4px 0', paddingLeft: '18px' } }, h('li', null, 'KNIME——最接近的競品，也是視覺化流程'), h('li', null, 'Orange——教學導向，更輕量'), h('li', null, 'SAS Enterprise Miner——商業老牌，昂貴'), h('li', null, 'Azure ML Designer／SageMaker Canvas——雲端版'), h('li', null, '★ 共同點：視覺化流程＋低程式碼'))), box('AI Studio 的相對優勢', h('ul', { style: { margin: '4px 0', paddingLeft: '18px' } }, h('li', null, '★ 免費版功能完整'), h('li', null, '運算子數量多、每個都有說明與範例'), h('li', null, '★ 免費線上課程＋認證'), h('li', null, '全球逾 4,000 所大學使用'), h('li', null, '可與 Python／R 混用，不是封閉系統'))), { bg: 'var(--accent-soft)' }));

  // ================= P05 =================
  (function () {
    let who = 'stu', mail = 'school'; const ctl = h('div'), out = h('div');
    ctl.append(row(lbl('我是：'), seg([['stu', '學生'], ['tea', '教師'], ['ind', '一般使用者']], () => who, v => who = v, draw), lbl('　註冊用：'), seg([['school', '學校 email'], ['private', '私人信箱']], () => mail, v => mail = v, draw)));
    const P = { stu: ['★ 路徑 A　學生版（Altair Student Edition）', ['搜尋 Altair Student Edition 頁面', '用學校 email（@ntunhs.edu.tw）註冊', '完成 email 驗證與學籍填寫', '以 Altair One 帳號啟用'], '12 個月、可續約至畢業、無功能限制——本課程建議走這條。'], tea: ['路徑 C　教師（Academic Hub）', ['到 Academic Hub 教師頁面', '申請課程用授權', '取得 8 模組 Course Kit', '可申請課堂批次授權'], '全球逾 4,000 所大學使用，含現成教材與認證。'], ind: ['路徑 B　個人版（RapidMiner Personal Edition）', ['到 my.rapidminer.com 註冊', '免費取得 Educational／Personal 授權', '下載 AI Studio 安裝', '於軟體內輸入授權'], '一年期可續；不含互動分析；過期未續會降為 1 萬列上限的免費版。走的是 RapidMiner 那套授權系統。'] };
    function draw() { out.innerHTML = ''; const [t, st, d] = P[who], bad = mail === 'private' && who !== 'ind';
      out.append(box(t, h('div', null, h('ol', { style: { margin: '4px 0', paddingLeft: '20px' } }, st.map(x => h('li', null, x))), h('div', null, d)), { bg: bad ? 'var(--bad-soft)' : 'var(--accent-soft)', bd: bad ? 'var(--bad)' : 'var(--accent)' }),
        bad ? nt('✗ 用私人信箱註冊會被導向付費頁面——一定要用學校 email。', 'bad') : nt('兩套授權系統（Altair One 與 RapidMiner）並存中，啟用出問題多半是選錯授權類型。顯示「找不到授權」時：Help → Manage Licenses → 手動貼上授權碼。', 'warn')); }
    $('#w-license').append(ctl, out); draw();
  })();
  (function () {
    const G = [['步驟一　註冊帳號', ['用學校 email 註冊 Altair 學生方案', '完成 email 驗證與學籍資訊填寫']], ['步驟二　下載安裝檔', ['在下載區找 RapidMiner AI Studio（舊頁面可能寫 Altair AI Studio）', '選對作業系統；檔案約 1–2 GB，安裝後約佔 3–4 GB']], ['步驟三　安裝與啟用', ['安裝路徑用預設值（★ 路徑含中文或空白可能啟動失敗）', '用 Altair One 帳號登入啟用']], ['步驟四　★ 四個擴充套件（Extensions → Marketplace）', ['Text Processing（M6 文字探勘）', 'Deep Learning（M5 深度學習：DL4J、CNN、LSTM）', 'H2O（M5 表格資料的深度學習與 GBM）', 'Generative Models（M7 生成式 AI）', '★ 裝完重新啟動軟體']], ['步驟五　驗證安裝', ['開啟課程範例中任一個 .rmp 檔', '按 Ctrl+Enter 能跑完並跳到 Results 頁', '對著 M0 範例的每一條連線點滑鼠中鍵，看資料在每一步長什麼樣']]];
    const st = Store.get('ais:install', {}); const out = h('div'); const total = G.reduce((a, g) => a + g[1].length, 0);
    function draw() { out.innerHTML = ''; let n = 0; const g = h('div', { class: 'grid2' });
      G.forEach(([t, items], gi) => g.append(box(t, h('div', null, items.map((x, i) => { const k = gi + '-' + i, c = h('input', { type: 'checkbox' }); c.checked = !!st[k]; if (st[k]) n++; c.onchange = () => { st[k] = c.checked; Store.set('ais:install', st); draw(); }; return h('label', { style: { display: 'block', fontSize: '14px', padding: '2px 0' } }, c, ' ' + x); })), { bd: gi === 3 ? 'var(--amber)' : 'var(--line)' })));
      out.append(g, row(h('span', { class: 'tag ' + (n === total ? 'good' : 'gray') }, `完成 ${n} / ${total}`), lbl('硬體建議：RAM 8 GB 起跳，16 GB 較舒適；獨立顯卡非必要。'))); }
    $('#w-install').append(out); draw();
  })();

  // ================= P06 =================
  U.sorter('#w-setupfix', [
    ['註冊時被導向付費頁面', '改用學校 email', '★ 一定要用學校 email 註冊。'],
    ['啟動後顯示「授權過期」', '重新登入續約', '一年期授權到期；學生身分可續到畢業。'],
    ['找不到授權／啟用失敗', '手動貼授權碼', '兩套授權系統選錯：Help → Manage Licenses 手動貼授權碼。'],
    ['開啟範例檔出現紅色驚嘆號', '補裝擴充套件', '★ Extensions → Marketplace 補裝，重開軟體。最常見！'],
    ['軟體啟動很慢或當掉', '調高記憶體', '關掉其他程式；或在設定中調整 JVM 記憶體上限。'],
    ['讀檔失敗，資料放在「D:\\課程資料\\第一週\\」', '改純英文路徑', '★ 把資料放到純英文路徑（如 D:\\data\\）。'],
  ], ['改用學校 email', '重新登入續約', '手動貼授權碼', '補裝擴充套件', '調高記憶體', '改純英文路徑']);

  // ================= P07 =================
  (function () {
    const A = [
      [1, '① 上方功能列', 10, 8, 700, 34, 'Design（設計）／Results（結果）／Turbo Prep／Auto Model／Deployments。執行完自動跳到 Results 頁。'],
      [2, '② Repository', 10, 50, 150, 130, '資料與流程的檔案總管。★ 資料放這裡、流程用 Retrieve 取用——換電腦不會壞。'],
      [3, '③ Operators', 10, 188, 150, 172, '運算子清單，依 Data Access／Blending／Modeling／Validation／Scoring 分層。★ 搜尋框直接打名稱最快。'],
      [4, '④ Process 畫布', 168, 50, 384, 310, '★ 核心工作區：拖拉運算子、拉線連接輸入輸出埠。每條線＝資料的流向；Ctrl+Enter 執行；對著連線點按滑鼠中鍵看中間結果；亂掉時右鍵空白處 → Auto-Layout。'],
      [5, '⑤ Parameters', 560, 50, 150, 170, '選中的運算子有哪些參數可調（例如 Split Data 的比例、Decision Tree 的最大深度）。'],
      [6, '⑥ Help', 560, 228, 150, 132, '★ 每個運算子都有完整說明、參數解釋與範例流程。看不懂就點它——比 Google 快。'],
    ];
    let sel = 4; const out = h('div');
    function draw() { out.innerHTML = ''; const sv = svgBox(h('div'), 720, 370);
      A.forEach(([id, t, x, y, w, hh]) => { const daily = id === 4 || id === 6, on = id === sel, g = s('g', { style: 'cursor:pointer' }, sv);
        s('rect', { x, y, width: w, height: hh, rx: 8, fill: on ? 'var(--accent-soft)' : daily ? '#fdf7ec' : '#fff', stroke: on ? 'var(--accent)' : '#b9b4a8', 'stroke-width': on ? 2.5 : 1.2 }, g);
        s('text', { x: x + 10, y: y + 22, 'font-size': 13.5, 'font-weight': 700, text: t }, g);
        if (daily) s('text', { x: x + w - 8, y: y + 22, 'text-anchor': 'end', 'font-size': 11.5, style: 'fill:#b45309', text: '★ 每天用' }, g);
        g.addEventListener('click', () => { sel = id; draw(); }); });
      ['Retrieve', 'Set Role', 'Split Data', 'Decision Tree'].forEach((t, i) => { const x = 184 + i * 92; s('rect', { x, y: 170, width: 80, height: 34, rx: 6, fill: '#fff', stroke: '#2a7f78' }, sv); s('text', { x: x + 40, y: 191, 'text-anchor': 'middle', 'font-size': 11.5, text: t }, sv); if (i < 3) s('line', { x1: x + 80, x2: x + 92, y1: 187, y2: 187, stroke: '#2a7f78', 'stroke-width': 2 }, sv); });
      ['Data Access', 'Blending', 'Modeling', 'Validation', 'Scoring'].forEach((t, i) => s('text', { x: 24, y: 222 + i * 26, 'font-size': 12, style: 'fill:#6b675e', text: '▸ ' + t }, sv));
      const a = A.find(r => r[0] === sel);
      out.append(cap(sv.parentNode, 720), nt(h('span', null, h('b', null, a[1] + '：'), a[6]), sel === 4 || sel === 6 ? 'warn' : '')); }
    $('#w-ui').append(out); draw();
  })();

  // ================= P08 =================
  $('#w-concepts').append(tbl(['概念', '是什麼', '對應到 Python 的什麼'], [['Process 流程', '整個分析流程，存成一個 .rmp 檔', '一個 .py 檔或 .ipynb notebook'], ['Operator 運算子', '流程中的一個處理步驟（一個方塊）', '一個函式呼叫，如 pd.read_csv() 或 model.fit()'], ['Port 埠', '運算子的輸入與輸出接點；連線就是資料的流向', '★ 函式的參數與回傳值。連線＝變數傳遞'], ['ExampleSet 資料集', 'AI Studio 的資料表格型別', '★ pandas DataFrame。列＝Example、欄＝Attribute']]),
    h('div', { class: 'grid3', style: { marginTop: '10px' } }, box('.rmp', '★ 流程檔，本質是 XML。可放進 Git 但 diff 難讀。'), box('.rmhdf5table', 'Repository 裡的資料檔（HDF5）。★ 只能用 AI Studio 開；要給別人請另存 CSV。'), box('Repository', '受管理的資料夾結構。★ 用 Retrieve 取用，比寫死絕對路徑穩定。')));
  (function () {
    const COLS = [['id', '整數'], ['age', 'numerical'], ['sex', 'nominal'], ['bmi', 'numerical'], ['readmit', 'binominal']];
    const ROWS = [[1, 72, '男', 24.8, 'yes'], [2, 65, '女', 31.2, 'no'], [3, 81, '男', 22.1, 'yes'], [4, 58, '女', 27.5, 'no']];
    const role = { id: 'regular', age: 'regular', sex: 'regular', bmi: 'regular', readmit: 'regular' }; const out = h('div');
    const RC = { regular: '#6b675e', label: '#c0392b', id: '#2a7f78', weight: '#7a6fb0' };
    function draw() { out.innerHTML = '';
      const t = h('table', { class: 'dt' }, h('tr', null, h('th', null, '角色 Role'), COLS.map(([c]) => { const sel = h('select', { style: { fontSize: '13px', color: RC[role[c]], fontWeight: 700 } }, ['regular', 'label', 'id', 'weight'].map(r => h('option', { value: r }, r))); sel.value = role[c]; sel.onchange = () => { role[c] = sel.value; draw(); }; return h('th', null, sel); })), h('tr', null, h('td', { style: { color: 'var(--muted)' } }, '型別'), COLS.map(([, ty]) => h('td', { style: { color: 'var(--muted)', fontSize: '13px' } }, ty))), h('tr', null, h('td', { style: { color: 'var(--muted)' } }, '欄名 Attribute'), COLS.map(([c]) => h('td', { style: { fontWeight: 700 } }, c))), ROWS.map((r, i) => h('tr', null, h('td', { style: { color: 'var(--muted)' } }, `Example ${i + 1}`), r.map((v, j) => h('td', { style: role[COLS[j][0]] === 'label' ? { background: 'var(--bad-soft)', fontWeight: 700 } : role[COLS[j][0]] === 'id' ? { color: 'var(--muted)' } : {} }, v)))));
      const labels = COLS.filter(([c]) => role[c] === 'label').map(([c]) => c), feats = COLS.filter(([c]) => role[c] === 'regular').map(([c]) => c), drop = COLS.filter(([c]) => role[c] !== 'regular').map(([c]) => `'${c}'`);
      let msg, cls;
      if (!labels.length) { msg = '✗ Decision Tree：Input ExampleSet has no label attribute——找不到 label。加一個 Set Role，把目標欄設成 label。'; cls = 'bad'; }
      else if (labels.length > 1) { msg = `✗ 一次只能有一個 label，現在有 ${labels.length} 個（${labels.join('、')}）。`; cls = 'bad'; }
      else if (labels[0] !== 'readmit') { msg = `⚠ 可以跑，但你現在是在預測「${labels[0]}」——要預測的是再入院（readmit）嗎？`; cls = 'warn'; }
      else if (role.id === 'regular') { msg = '⚠ 可以跑，但 id 被當成一般特徵：模型可能從流水號裡「學到」東西。把 id 設成 id 角色，它就不會參與建模。'; cls = 'warn'; }
      else { msg = '✓ 執行成功：readmit 是 label、id 不參與建模，其餘是特徵。這就是 Python 的 X 與 y。'; cls = ''; }
      const py = labels.length === 1 ? `y = df['${labels[0]}']\nX = df.drop(columns=[${drop.join(', ')}])   # 特徵：${feats.join(', ') || '（無）'}` : '# pandas 沒有內建方式標記「哪一欄是 y」\n# y 要另外開一個變數：y = df[...]';
      out.append(h('div', { class: 'tscroll' }, t), h('div', { class: 'grid2', style: { alignItems: 'start' } }, h('div', null, ttl('等價的 Python'), pre(py)), h('div', null, ttl('接到 Decision Tree 執行'), nt(msg, cls))),
        lbl('五種常見 Role：regular（預設特徵）、★ label（目標）、id（識別碼）、weight（樣本權重）、prediction／confidence（模型輸出時自動加上）。')); }
    $('#w-role').append(out); draw();
  })();

  // ================= P09 =================
  (function () {
    const P = { role: true, ratio: 70, depth: 3, mod: 'tree', unl: 'test', edge: null }; const ctl = h('div'), out = h('div');
    function build() { ctl.innerHTML = ''; const sel = (opts, k) => { const e = h('select', { style: { fontSize: '13.5px' } }, opts.map(([v, t]) => h('option', { value: v }, t))); e.value = P[k]; e.onchange = () => { P[k] = e.value; P.edge = null; draw(); }; return e; };
      ctl.append(row(check('流程中有 ② Set Role（Survived → label）', () => P.role, v => { P.role = v; P.edge = null; }, draw), slider('Split Data 訓練比例', 50, 90, 5, () => P.ratio, v => P.ratio = v, draw, v => v + '%'), slider('Decision Tree 最大深度', 1, 8, 1, () => P.depth, v => P.depth = v, draw)),
        row(lbl('⑤ Apply Model 的 mod 輸入接：'), sel([['tree', '④ Decision Tree 的模型'], ['train', '③ Split Data 的訓練資料']], 'mod'), lbl('　unl 輸入接：'), sel([['test', '③ Split Data 的測試資料'], ['train', '③ Split Data 的訓練資料'], ['all', '① Retrieve 的全部資料']], 'unl'), h('button', { class: 'btn sm', onclick: () => { Object.assign(P, { role: true, ratio: 70, depth: 3, mod: 'tree', unl: 'test', edge: null }); build(); draw(); } }, '重設'))); }
    function run() {
      const n = Math.round(DATA.length * P.ratio / 100), R = rng(7), idx = DATA.map((_, i) => i).sort(() => R() - .5), tr = idx.slice(0, n).map(i => DATA[i]), te = idx.slice(n).map(i => DATA[i]);
      if (!P.role) return { err: 'Input ExampleSet has no label attribute', at: 4, fix: '把 ② Set Role 加回來，指定 Survived 為 label。', tr, te };
      if (P.mod !== 'tree') return { err: 'Cannot connect ports (type mismatch)', at: 5, fix: 'mod 埠要接「模型」，資料接資料埠——模型從 ④ Decision Tree 來。', tr, te };
      const tree = ML.cart(tr.map(d => ({ x: X(d), y: d.y })), P.depth, { minLeaf: 5 }), ev = P.unl === 'test' ? te : P.unl === 'train' ? tr : DATA;
      const pr = ev.map(d => { const p = ML.treeP(tree, X(d)); return { d, p, yh: p >= .5 ? 1 : 0 }; });
      const cm = [[0, 0], [0, 0]]; pr.forEach(r => cm[r.d.y][r.yh]++); const acc = (cm[0][0] + cm[1][1]) / pr.length;
      const prT = te.map(d => (ML.treeP(tree, X(d)) >= .5 ? 1 : 0) === d.y).filter(Boolean).length / te.length;
      return { tree, tr, te, ev, pr, cm, acc, accTest: prT };
    }
    function draw() {
      out.innerHTML = ''; const r = run();
      const W = 720, H = 175, sv = svgBox(h('div'), W, H), bw = 96, Y0 = 46, xs = [8, 128, 248, 374, 498, 616];
      const NODES = [['① Retrieve', 'Titanic（模擬）'], ['② Set Role', 'Survived → label'], ['③ Split Data', `${P.ratio}% / ${100 - P.ratio}%`], ['④ Decision Tree', `深度 ≤ ${P.depth}`], ['⑤ Apply Model', 'mod ＋ unl'], ['⑥ Performance', '準確率・混淆矩陣']];
      const EDGES = [['e1', 0, 1, 'out', '資料'], ['e2', 1, 2, 'out', '帶 label 的資料'], ['e3', 2, 3, 'tra', '訓練資料'], ['e4', 3, 4, 'mod', '模型'], ['e5', 2, 4, 'tes', '測試資料'], ['e6', 4, 5, 'lab', '帶預測的資料']];
      const ok = i => !(r.err && ((i === 1 && !P.role) || (r.at === 4 && i === 3) || (r.at === 5 && i === 4)));
      EDGES.forEach(([id, a, b, , t]) => { if (!P.role && (id === 'e1' || id === 'e2')) { if (id === 'e2') return; }
        let x1 = xs[a] + bw, y1 = Y0 + 22, x2 = xs[b], y2 = Y0 + 22, d;
        if (!P.role && id === 'e1') { x2 = xs[2]; }
        if (id === 'e5') { y1 = Y0 + 40; y2 = Y0 + 34; d = `M${x1} ${y1} C ${x1 + 60} ${y1 + 70}, ${x2 - 60} ${y2 + 70}, ${x2} ${y2}`; }
        else if (id === 'e4') { y2 = Y0 + 14; d = `M${x1} ${y1} L${x2} ${y2}`; }
        else d = `M${x1} ${y1} L${x2} ${y2}`;
        const wrong = (id === 'e4' && P.mod !== 'tree') || (id === 'e5' && P.unl !== 'test');
        s('path', { d, fill: 'none', stroke: P.edge === id ? 'var(--accent)' : wrong ? 'var(--bad)' : '#7d9b97', 'stroke-width': P.edge === id ? 4 : 2.2, 'stroke-dasharray': wrong ? '6 4' : '' }, sv);
        const hit = s('path', { d, fill: 'none', stroke: 'transparent', 'stroke-width': 16, style: 'cursor:pointer' }, sv); hit.addEventListener('click', () => { P.edge = id; draw(); });
        if (id === 'e5') s('text', { x: (x1 + x2) / 2, y: Y0 + 112, 'text-anchor': 'middle', 'font-size': 11.5, style: 'fill:' + (wrong ? '#c0392b' : '#5b7a76'), text: P.unl === 'test' ? '測試那條線 → Apply Model 第二個輸入' : P.unl === 'train' ? '⚠ 接到訓練那條線了' : '⚠ 接到全部資料了' }, sv); });
      NODES.forEach(([t, sub], i) => { if (i === 1 && !P.role) { s('rect', { x: xs[i], y: Y0, width: bw, height: 50, rx: 8, fill: '#f4f2ec', stroke: '#ccc', 'stroke-dasharray': '4 3' }, sv); s('text', { x: xs[i] + bw / 2, y: Y0 + 30, 'text-anchor': 'middle', 'font-size': 12, style: 'fill:#aaa', text: '（沒有 Set Role）' }, sv); return; }
        const bad = r.err && r.at === i + 1 - 0 && false; const er = r.err && ((r.at === 4 && i === 3) || (r.at === 5 && i === 4));
        s('rect', { x: xs[i], y: Y0, width: bw, height: 50, rx: 8, fill: er ? 'var(--bad-soft)' : '#fff', stroke: er ? 'var(--bad)' : '#2a7f78', 'stroke-width': er ? 2.2 : 1.5 }, sv);
        s('text', { x: xs[i] + bw / 2, y: Y0 + 21, 'text-anchor': 'middle', 'font-size': 12.5, 'font-weight': 700, text: t }, sv); s('text', { x: xs[i] + bw / 2, y: Y0 + 39, 'text-anchor': 'middle', 'font-size': 11, style: 'fill:#6b675e', text: sub }, sv);
        if (er) s('text', { x: xs[i] + bw - 4, y: Y0 - 6, 'text-anchor': 'end', 'font-size': 16, style: 'fill:#c0392b', text: '⚠' }, sv); });
      s('text', { x: 8, y: 22, 'font-size': 12.5, style: 'fill:#6b675e', text: '點任一條連線＝滑鼠中鍵看中間結果' }, sv);
      out.append(sv.parentNode);
      // 中間結果
      if (P.edge) { const roleNote = P.edge === 'e1' ? '（Survived 還只是一般欄位）' : '（Survived 的角色是 label）'; const sample = rows => tbl(['id', 'Sex', 'Pclass', 'Age', 'Survived'].concat(rows[0] && rows[0].p != null ? ['prediction', 'confidence(yes)'] : []), rows.slice(0, 5).map(x => { const d = x.d || x; return [d.id, d.sex ? 'female' : 'male', d.pclass, d.age, d.y ? 'yes' : 'no'].concat(x.p != null ? [x.yh ? 'yes' : 'no', x.p.toFixed(2)] : []); }), { plain: true });
        let body;
        if (P.edge === 'e1' || P.edge === 'e2') body = h('div', null, lbl(`ExampleSet：${DATA.length} 個 Example × 5 個 Attribute ${roleNote}`), sample(DATA));
        else if (P.edge === 'e3') body = h('div', null, lbl(`訓練資料：${r.tr.length} 列`), sample(r.tr));
        else if (P.edge === 'e5') body = h('div', null, lbl(`測試資料：${r.te.length} 列`), sample(r.te));
        else if (P.edge === 'e4') body = r.tree ? h('div', null, lbl('④ 輸出的是「模型」不是預測值：'), pre(treeTxt(r.tree))) : nt('上游出錯，沒有模型。', 'bad');
        else body = r.pr ? h('div', null, lbl('Apply Model 之後才出現 prediction 與 confidence 兩欄：'), sample(r.pr)) : nt('上游出錯，還沒有預測值。', 'bad');
        out.append(box('🔍 中間結果：' + EDGES.find(e => e[0] === P.edge)[4], body, { bg: '#f7fbfa', st: { margin: '6px 0' } })); }
      // 結果
      if (r.err) out.append(nt(h('span', null, h('b', null, `✗ ${NODES[r.at - 1][0]}：${r.err}`), h('br'), '解法：' + r.fix), 'bad'));
      else { const [[tn, fp], [fn, tp]] = r.cm;
        out.append(h('div', { class: 'grid2', style: { alignItems: 'center' } }, kpi(['⑥ 準確率', (r.acc * 100).toFixed(1) + '%', P.unl === 'test' ? 'good' : 'bad'], ['評估列數', r.ev.length], ['真正的測試準確率', (r.accTest * 100).toFixed(1) + '%']), tbl(['', '預測 no', '預測 yes'], [['實際 no', tn, fp], ['實際 yes', fn, tp]])),
          nt(P.unl === 'test' ? (P.depth >= 7 ? '深度很大：樹開始記住訓練資料的細節，測試準確率不一定更好——到 P10 用交叉驗證比較更可靠。' : '接對了：模型從 ④ 來、資料從 ③ 的測試那條線來。第一次上課就自己拉一遍這六個，拉完你就懂了一半。') : `⚠ 用${P.unl === 'train' ? '訓練資料' : '包含訓練資料的全部資料'}評估＝自己考自己：準確率 ${(r.acc * 100).toFixed(1)}% 比真正的測試準確率 ${(r.accTest * 100).toFixed(1)}% 樂觀。`, P.unl === 'test' ? '' : 'warn')); }
      out.append(h('details', { style: { marginTop: '6px' } }, h('summary', { style: { cursor: 'pointer', fontSize: '14px' } }, '看等價的 Python'), pre(`df = pd.read_csv('titanic.csv')                       # ① Retrieve\ny = df['Survived']; X = df[['Sex','Pclass','Age']]    # ② Set Role\nX_tr, X_te, y_tr, y_te = train_test_split(X, y, train_size=${(P.ratio / 100).toFixed(2)})  # ③\nmodel = DecisionTreeClassifier(max_depth=${P.depth}).fit(X_tr, y_tr)   # ④ 輸出模型\npred = model.predict(${P.unl === 'test' ? 'X_te' : P.unl === 'train' ? 'X_tr' : 'X'})                          # ⑤ Apply Model\nprint(accuracy_score(${P.unl === 'test' ? 'y_te' : P.unl === 'train' ? 'y_tr' : 'y'}, pred))                    # ⑥ Performance`)));
    }
    build(); $('#w-flow').append(ctl, out); draw();
  })();
})();
