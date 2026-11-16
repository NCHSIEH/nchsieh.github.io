/* 演算法實驗室 · 步驟引擎與實驗頁介面　凍結檔，請勿修改
   依網址 ?id=B4 載入 exp/B4.js；實驗檔呼叫 LAB.register 後由這裡建立整個頁面。 */
(function () {
  'use strict';
  const LAB = window.LAB;
  function h(tag, attrs) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) { const v = attrs[k]; if (v == null || v === false) continue; if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v); }
    const add = c => { if (c == null || c === false) return; if (Array.isArray(c)) c.forEach(add); else e.append(c); };
    for (let i = 2; i < arguments.length; i++) add(arguments[i]);
    return e;
  }
  const root = document.getElementById('lab');
  const ID = (new URLSearchParams(location.search).get('id') || '').toUpperCase();
  const entry = LAB.entry(ID);
  const order = LAB.registry.map(e => e.id);

  function navRow() {
    const i = order.indexOf(ID), p = LAB.entry(order[i - 1]), n = LAB.entry(order[i + 1]);
    const link = (e, txt) => !e ? h('span') : e.status === 'live' ? h('a', { class: 'btn', href: 'exp.html?id=' + e.id }, txt(e)) : h('button', { class: 'btn', disabled: true }, txt(e) + '（建置中）');
    return h('div', { class: 'lab-nav' }, link(p, e => '← ' + e.id + ' ' + e.title), h('a', { class: 'btn', href: './' }, '回實驗室目錄'), link(n, e => e.id + ' ' + e.title + ' →'));
  }
  if (!entry) { root.append(h('div', { class: 'lab-err' }, '找不到這個實驗。'), h('p', null, h('a', { class: 'btn primary', href: './' }, '回實驗室目錄'))); return; }
  document.title = entry.id + ' ' + entry.title + ' · 演算法實驗室';
  const crumb = document.getElementById('crumb'); if (crumb) crumb.textContent = '/ ' + entry.id + ' ' + entry.title;
  if (entry.status !== 'live') { root.append(h('div', { class: 'lab-hero' }, h('div', { class: 'badge' }, entry.id), h('div', null, h('h1', null, entry.title), h('p', { class: 'goal' }, entry.brief), h('span', { class: 'tag gray' }, '建置中'))), navRow()); return; }

  LAB.onRegister = function (def) { if (def.id === ID) init(def); };
  const sc = document.createElement('script'); sc.src = 'exp/' + ID + '.js?v=' + LAB.version;
  sc.onerror = () => root.append(h('div', { class: 'lab-err' }, '實驗檔載入失敗：exp/' + ID + '.js'));
  document.body.appendChild(sc);

  function init(def) {
    const S = { seed: 1, size: 'small', params: {}, rows: [], edited: false, steps: [], idx: 0, playing: false, speed: 1, reached: false, timer: 0, err: null };
    def.params = def.params || [];
    def.params.forEach(p => { S.params[p.key] = p.value; });
    /* 網址狀態 */
    (function readHash() {
      const q = new URLSearchParams(location.hash.slice(1));
      if (q.get('seed')) S.seed = Math.max(1, parseInt(q.get('seed'), 10) || 1);
      if (q.get('size') === 'large' && def.data.large) S.size = 'large';
      def.params.forEach(p => { if (!q.has(p.key)) return; const v = q.get(p.key); S.params[p.key] = p.type === 'bool' ? v === '1' : p.type === 'choice' ? (p.options.some(o => String(o.v) === v) ? p.options.find(o => String(o.v) === v).v : p.value) : LAB.M.clamp(parseFloat(v), p.min, p.max); if (typeof S.params[p.key] === 'number' && Number.isNaN(S.params[p.key])) S.params[p.key] = p.value; });
      S._step = parseInt(q.get('step'), 10) || 1;
    })();
    function writeHash() {
      const q = new URLSearchParams(); def.params.forEach(p => q.set(p.key, p.type === 'bool' ? (S.params[p.key] ? '1' : '0') : S.params[p.key]));
      q.set('seed', S.seed); if (S.size === 'large') q.set('size', 'large'); q.set('step', S.idx + 1);
      try { history.replaceState(null, '', location.pathname + location.search + '#' + q.toString()); } catch (e) { /* 本機檔案開啟時略過 */ }
    }

    /* ---------- 版面 ---------- */
    const cols = def.data.columns || [];
    const elParams = h('div', { class: 'lab-params' });
    const elData = h('div'), elDataCnt = h('span', { class: 'cnt' }), elDataNote = h('div', { class: 'dnote' });
    const elPseudoBar = h('div', { class: 'bar' }), elPseudo = h('div', { class: 'pseudo' }, elPseudoBar);
    const lnEls = (def.pseudo || []).map(t => { const m = /^(\s*)/.exec(t)[1].length; const e = h('div', { class: 'ln' + (m >= 4 ? ' in2' : m >= 2 ? ' in1' : '') }, h('span', null, t.trim())); elPseudo.append(e); return e; });
    const vMain = h('div'), vSide = h('div'), vBottom = h('div');
    const pMain = h('div', { class: 'pane' }, vMain), pSide = h('div', { class: 'pane' }, vSide), pBottom = h('div', { class: 'pane' }, vBottom);
    const viz = { main: LAB.viz.mount(vMain), side: LAB.viz.mount(vSide), bottom: LAB.viz.mount(vBottom) };
    const sNo = h('div', { class: 'no' }), sTt = h('div', { class: 'tt' }), sPh = h('span', { class: 'tag blue ph' }), sSay = h('p', { class: 'say' }), sCalc = h('div', { class: 'calc' });
    const stepBox = h('div', { class: 'pane stepbox' }, h('h3', null, '這一步在做什麼'), h('div', { class: 'hd' }, sNo, sTt, sPh), sSay, sCalc);
    const elErr = h('div', { class: 'lab-err', style: 'display:none' });

    const bReset = h('button', { class: 'btn x', 'data-tip': '回到第 1 步（快速鍵 R 或 Home）', onclick: () => go(0, false) }, '⏮ 重置');
    const bPrev = h('button', { class: 'btn', 'data-tip': '退回上一步（快速鍵 ←）', onclick: () => go(S.idx - 1, true) }, '◀ 上一步');
    const bPlay = h('button', { class: 'btn primary play', 'data-tip': '自動播放／暫停步驟（快速鍵 空白鍵）', onclick: () => play(!S.playing) }, '▶ 播放');
    const bNext = h('button', { class: 'btn', 'data-tip': '前進到下一步（快速鍵 →）', onclick: () => go(S.idx + 1, true) }, '下一步 ▶');
    const bEnd = h('button', { class: 'btn x', 'data-tip': '直接跳到最後一步看完整結果（快速鍵 End）', onclick: () => go(S.steps.length - 1, false) }, '結束 ⏭');
    const rng = h('input', { type: 'range', min: 0, max: 0, step: 1, value: 0, 'aria-label': '步驟進度', 'data-tip': '拖曳滑桿可快速跳到任意步驟', oninput: e => { play(false); const t = +e.target.value; go(t, Math.abs(t - S.idx) === 1); } });
    const pos = h('span', { class: 'pos' });
    const spd = h('div', { class: 'seg spd' }); [0.5, 1, 2].forEach(v => spd.append(h('button', { 'data-v': v, 'data-tip': '自動播放速度：' + v + ' 倍速', onclick: () => { S.speed = v; drawSpeed(); if (S.playing) { play(false); play(true); } } }, v + '×')));
    function drawSpeed() { spd.querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.v === S.speed)); }
    const ctl = h('div', { class: 'lab-ctl' }, bReset, bPrev, bPlay, bNext, bEnd, rng, pos, spd, h('span', { class: 'keys' }, h('kbd', null, '←'), ' ', h('kbd', null, '→'), ' ', h('kbd', null, '空白鍵')));

    const exBody = h('div', { class: 'body' }), exSec = h('section', { class: 'lab-sec lock' }, h('h2', null, '看懂了什麼'), exBody);
    const aisSec = h('section', { class: 'lab-sec' });
    const canEdit = !!(def.data.editable && def.data.editable.length);

    root.append(
      h('header', { class: 'lab-hero' }, h('div', { class: 'badge' }, def.id), h('div', null, h('h1', null, def.title), h('p', { class: 'goal' }, def.goal || ''),
        h('div', { class: 'chips' }, def.module && def.module.url ? h('a', { class: 'tag', href: def.module.url, 'data-tip': '前往對應講義章節閱讀完整觀念推導' }, '對應講義：' + def.module.name + ' →') : null, h('span', { class: 'tag gray', 'data-tip': '本實驗使用固定亂數種子產生的教學模擬資料，可點「換一組資料」或直接修改表格數值' }, '模擬資料'), h('span', { class: 'tag blue' }, def.data.scenario || '')))),
      elParams, ctl, elErr,
      h('div', { class: 'lab-work' },
        h('div', { class: 'col l' }, h('div', { class: 'pane' }, h('h3', null, '資料', canEdit ? h('span', { class: 'tag gray', style: 'margin-left:6px;font-weight:500', 'data-tip': '點擊表格內的數值即可直接修改，即時測試極端值或邊界個案對結果的影響' }, '可改值') : null, elDataCnt), elData, elDataNote), h('div', { class: 'pane' }, h('h3', null, '演算法步驟'), elPseudo)),
        h('div', { class: 'col c' }, pMain, pBottom),
        h('div', { class: 'col r' }, stepBox, pSide)),
      exSec, aisSec, navRow());

    /* ---------- 參數列 ---------- */
    /* ---------- 參數與選項提示字典 ---------- */
    const TIPS = {
      A1: {
        method: '選擇用來填補遺失值的演算法，觀察不同方法對欄位平均與標準差的影響。',
        'method:mean': '【平均數補值】\n用途：以該欄有效值的算術平均填補缺格。\n適用：數值接近常態分佈、沒有極端離群值時；缺點是會人為壓低變異數。',
        'method:median': '【中位數補值】\n用途：以排序中間值填補缺格。\n適用：資料右偏或含極端離群值（如高血糖／高費用）時，比平均數更穩健。',
        'method:knn': '【k-NN 補值】\n用途：依其他欄位找出最相似的 K 位病人，取其該欄平均填補。\n適用：欄位間具關聯性時，最能保留資料原始分佈與變異度。',
        k: '【k-NN 鄰居數 K】\n用法：決定參考幾位最相似病人。\nK 較小（1–2）較貼近局部但易受雜訊干擾；K 較大（4–5）較平滑但可能失去局部差異。'
      },
      A2: {
        method: '比較兩種最常用的特徵縮放方式對距離計算的影響。',
        'method:z': '【Z 分數標準化】\n用途：轉為平均 0、標準差 1（(x−μ)/σ）。\n適用：k-NN、SVM、PCA、線性/Logistic 迴歸等對尺度敏感或常態假設模型，抗離群值能力較佳。',
        'method:minmax': '【Min-Max 正規化】\n用途：線性壓縮到 [0, 1] 區間。\n適用：神經網路輸入或影像像素縮放；缺點是極端離群值會把正常資料擠在窄區間。',
        a: '【病人 A (#)】\n用法：選擇要計算距離與尋找最近鄰居的基準病人編號。',
        b: '【病人 B (#)】\n用法：選擇要與病人 A 對照距離拆解（年齡差 vs 血糖差）的對象編號。'
      },
      A3: {
        method: '選擇將連續數值切成離散區間（分箱）的策略。',
        'method:width': '【等寬分箱 (Equal-Width)】\n用途：將最小到最大值均分為相同寬度。\n適用：均勻分佈資料；若有右偏離群值，多數樣本會擠在少數箱內。',
        'method:freq': '【等頻分箱 (Equal-Frequency)】\n用途：依分位數切分，使每箱樣本數相近。\n適用：偏態分佈資料，能避免空箱並讓各區間人數均衡。',
        'method:entropy': '【依熵分箱 (Entropy / 監督式)】\n用途：參考標籤 y（糖尿病），挑出資訊增益最大的切點。\n適用：分類任務的特徵離散化，最能保留對目標變數的區辨力。',
        bins: '【區間數 (Bins)】\n用法：設定要切成幾箱（2–5 箱）。箱數越多細節越細，但每箱樣本越少、越容易過擬合。'
      },
      A4: {
        method: '選擇將文字類別（內科／外科／急診）轉換為數值特徵的編碼法。',
        'method:onehot': '【One-hot 獨熱編碼】\n用途：每個類別展開成一個 0/1 欄位。\n適用：決策樹、隨機森林、神經網路等無共線性限制的模型。',
        'method:dummy': '【Dummy 虛擬編碼（去一欄）】\n用途：省略基準類別（內科），只保留 k−1 欄。\n適用：線性／Logistic 迴歸，避免欄位總和恆為 1 造成完全共線性。',
        'method:target': '【目標編碼 (Target Encoding)】\n用途：以該類別的目標陽性率代替文字。\n適用：高基數類別（如數十種科別或郵遞區號）；注意須在訓練折內計算以防資料洩漏。',
        smoothing: '【平滑強度 m】\n用法：僅用於目標編碼。m 越大，小樣本類別越會被拉向整體平均率（先驗），防止少數幾筆極端值誤導編碼。'
      },
      A5: {
        method: '選擇處理少數類樣本過少（類別不平衡）的重抽樣策略。',
        'method:over': '【隨機過抽樣 (Oversampling)】\n用途：隨機重複複製少數類樣本。\n適用：資料量極少時；缺點是原點完全重疊，模型容易死背（過擬合）。',
        'method:under': '【隨機欠抽樣 (Undersampling)】\n用途：隨機丟棄多數類樣本。\n適用：資料量非常大、訓練太慢時；缺點是可能丟失多數類的重要邊界資訊。',
        'method:smote': '【SMOTE 合成少數類】\n用途：在少數類與其 K 鄰居的連線上內插產生新樣本。\n適用：表格型不平衡分類的常用首選，能擴充決策區域又比單純複製不易過擬合。',
        k: '【SMOTE 鄰居數 K】\n用法：決定每個陽性樣本從幾個最近陽性鄰居中挑選內插對象。',
        ratio: '【目標陽性比例】\n用法：設定重抽樣後陽性佔總樣本的目標比例（0.3–0.5）。實務上不一定要補到 50%，常視模型校正與成本調整。'
      },
      A6: {
        method: '比較過濾法（不看模型）與包裹法（直接用模型驗證）如何挑選關鍵特徵。',
        'method:corr': '【相關係數 |r|（Filter）】\n用途：計算每個特徵與目標 y 的線性相關強度。\n適用：快速初篩線性關係，運算極快但無法捕捉非線性或特徵交互作用。',
        'method:ig': '【資訊增益（Filter）】\n用途：衡量特徵能降低多少目標熵（不確定性）。\n適用：能捕捉非線性切分能力，常作為樹模型或特徵初篩指標。',
        'method:forward': '【向前選擇（Wrapper）】\n用途：從空集合出發，每輪試加一個特徵並以留一法 3-NN 驗證正確率。\n適用：直接對齊下游模型表現並考慮特徵互補性，但計算量較大。',
        top: '【目標特徵數 K】\n用法：過濾法取分數最高的前 K 個特徵；向前選擇則最多選到 K 個特徵。'
      },
      B1: {
        method: '比較「解析解直接算出」與「梯度下降逐步逼近」兩種求解方式。',
        'method:ols': '【最小平方法直接解 (OLS)】\n用途：利用公式 w = Sxy / Sxx 一步算出全域最佳解。\n適用：特徵數不多（< 萬維）且能一次載入記憶體的線性迴歸，不需調學習率。',
        'method:gd': '【梯度下降 (Gradient Descent)】\n用途：從 (0, 0) 出發，沿負梯度方向逐步更新 w 與 b。\n適用：超高維特徵、巨量資料或神經網路等無封閉公式可解的最佳化問題。',
        lr: '【學習率 η】\n用法：控制每步跨出的大小。太小收斂慢；太大可能跨過谷底造成震盪甚至發散。',
        epochs: '【迭代次數 (Epochs)】\n用法：梯度下降總共更新幾輪。太少還沒走到谷底；足夠多則會逼近 OLS 直接解。'
      },
      B2: {
        method: '比較 L2 (Ridge) 與 L1 (Lasso) 懲罰項如何抑制係數過度膨脹。',
        'method:ridge': '【Ridge 迴歸 (L2)】\n用途：懲罰係數平方和 λΣw²，讓所有係數平滑縮小趨近 0。\n適用：特徵間存在多重共線性、且希望保留全部特徵資訊時。',
        'method:lasso': '【Lasso 迴歸 (L1)】\n用途：懲罰係數絕對值和 λΣ|w|，透過軟閾值把不重要係數直接壓成 0。\n適用：高維資料同時需要「自動特徵選擇」與稀疏模型時。',
        lamIdx: '【正則化強度 λ 刻度】\n用法：右移（λ 變大）懲罰越重，係數縮得越小、Bias 增加但 Variance 降低；左移（λ 變小）趨近無正則化 OLS。'
      },
      B3: {
        lr: '【學習率 η】\n用法：控制每輪梯度下降旋轉與平移決策邊界的幅度。太小收斂慢，太大會震盪。',
        epochs: '【迭代次數 (Epochs)】\n用法：總更新輪數。輪數越多，邊界越陡峭、Log Loss 越低（但也可能過擬合）。',
        threshold: '【判定門檻 (Threshold)】\n用法：預設 0.50。醫療篩檢怕漏診（降低 FN）可調低門檻（如 0.35）；怕過度檢查（降低 FP）可調高門檻。'
      },
      B4: {
        k: '【鄰居數 K】\n用法：取最近幾位病人多數決。建議選奇數避免平手；K 太小易受雜訊影響，K 太大邊界過度平滑。',
        scale: '【先標準化】\n用法：開啟後將年齡與血糖轉為 Z 分數。若關閉，血糖數字尺度大，距離幾乎全由血糖主導。',
        qAge: '【新病人年齡】\n用法：拖曳調整要預測的新病人（星號）年齡，觀察最近 K 位鄰居與投票結果變化。',
        qGlu: '【新病人空腹血糖】\n用法：拖曳調整新病人空腹血糖（mg/dL），測試跨越決策邊界時的預測翻轉。'
      },
      B5: {
        laplace: '【Laplace 平滑 α】\n用法：在每個條件次數加上 α（預設 1）。若設為 0，一旦某特徵組合在訓練集出現 0 次，連乘機率會直接歸零。',
        qAgeHigh: '【新病人：年齡 ≥ 55】\n用法：切換新病人的年齡狀態（高／正常），觀察條件機率與後驗機率如何重算。',
        qBmiHigh: '【新病人：BMI ≥ 26】\n用法：切換新病人的 BMI 狀態，測試各特徵獨立相乘的貝氏推論。',
        qGluHigh: '【新病人：血糖 ≥ 110】\n用法：切換新病人的血糖狀態（此特徵對糖尿病區辨力最強）。'
      },
      B6: {
        criterion: '【不純度指標】\n決定樹分裂時如何衡量節點混亂程度。',
        'criterion:gini': '【Gini 不純度】\n用途：計算隨機抽兩筆不同類的機率（1−Σp²）。\n適用：CART 決策樹預設，計算無對數、速度快，實務與資訊增益結果相近。',
        'criterion:entropy': '【資訊增益 (Entropy)】\n用途：計算資訊熵 −Σp log₂p 的下降量。\n適用：ID3/C4.5 常用，對極端純度變化略更敏感。',
        max_depth: '【最大深度】\n用法：限制樹最多長幾層。深度越大規則越細、訓練準確率越高，但也越容易過擬合。',
        min_leaf: '【葉節點最少筆數】\n用法：預剪枝門檻。若分裂後子節點樣本數小於此值則不切分，可防止為少數特例長出過細分支。'
      },
      B7: {
        trees: '【樹的棵數 T】\n用法：森林裡訓練幾棵獨立決策樹。棵數越多，袋外投票越穩定且不易過擬合。',
        mtry: '【每節點候選特徵 mtry】\n用法：每次分裂只從隨機抽出的 mtry 個特徵中挑最佳切點。\nmtry 越小各樹越不相關（多樣性高），太大則每棵樹容易長得差不多。',
        depth: '【最大深度】\n用法：限制每棵單樹的深度（1–2 層）。隨機森林通常讓單樹保持一定深度再靠多樹平均降變異。'
      },
      B8: {
        rounds: '【訓練輪數 T】\n用法：依序串接幾棵單一切點樹樁。每多一輪會針對前一輪答錯的高權重樣本補強，但過多輪可能過擬合雜訊。'
      },
      B9: {
        trees: '【樹的棵數 T】\n用法：依序接力擬合殘差的小樹樁數量。樹越多，階梯預測線越貼近訓練點、MSE 越低。',
        lr: '【學習率 η (Shrinkage)】\n用法：每棵新樹乘上的縮小係數。較小學習率搭配較多棵樹，泛化能力通常比少樹大步長更佳。'
      },
      B10: {
        C: '【懲罰參數 C（軟間隔）】\n控制「允許少數點違規」與「嚴格分對所有點」之間的取捨。',
        'C:0.1': '【C = 0.1（寬鬆間隔）】\n用途：高度容忍邊界誤差，換取最寬的安全間隔與較多支持向量，抗雜訊強但可能欠擬合。',
        'C:1': '【C = 1（標準平衡）】\n用途：兼顧間隔寬度與分類正確率的常用預設值。',
        'C:10': '【C = 10（嚴格分類）】\n用途：大幅提高誤分類懲罰，間隔變窄、決策邊界更貼近邊界樣本。',
        'C:100': '【C = 100（極嚴格／硬間隔近似）】\n用途：幾乎不容許誤分類，邊界極貼近極端點，容易受離群點牽引而過擬合。',
        kernel: '【核函數 Kernel】\n決定邊界是直線還是曲面。',
        'kernel:linear': '【線性核 (Linear)】\n用途：在原空間找一條超平面。\n適用：特徵數多、線性可分或追求可解釋性時。',
        'kernel:rbf': '【RBF 高斯核】\n用途：隱式映射到高維空間，切出彎曲或包圍狀的非線性邊界。\n適用：兩群呈非線性交錯分佈時。'
      },
      C1: {
        k: '【分群數 K】\n用法：預先指定要切成幾群。可觀察 K 變大時 SSE 必下降，但群數過多會失去分群意義。',
        init: '【起始中心（種子）】\n用法：切換不同的隨機起始中心點。K-Means 易受初值影響而落入局部最佳解，實務常跑多次取最低 SSE。'
      },
      C2: {
        linkage: '【連結法 Linkage】\n決定兩群合併時如何定義「群與群的距離」。',
        'linkage:single': '【單一連結 (Single / 最近點)】\n用途：取兩群最近兩點的距離。\n適用：長條或非球狀分佈；缺點是容易產生「鏈狀效應」把鬆散點串在一起。',
        'linkage:complete': '【完全連結 (Complete / 最遠點)】\n用途：取兩群最遠兩點的距離。\n適用：希望各群緊實、直徑相近時，對離群值較敏感。',
        'linkage:average': '【平均連結 (Average / UPGMA)】\n用途：取兩群所有點對的平均距離。\n適用：折衷單一與完全連結，最穩健且常用的階層分群預設法。',
        cut: '【切分群數 K】\n用法：決定在樹狀圖哪個高度剪斷，得到 K 個群聚。'
      },
      C3: {
        eps: '【鄰域半徑 ε】\n用法：判定兩點是否為鄰居的最大距離。太小會讓大量正常點變成雜訊（-1）；太大會把不同群黏在一起。',
        min_pts: '【核心點門檻 minPts】\n用法：半徑 ε 內至少要有幾點（含自己）才算核心點。越大對密度要求越嚴格，越多邊緣點會被歸為雜訊。'
      },
      C4: {
        k: '【高斯成分數 K】\n用法：假設資料由幾個常態分佈混合而成，可觀察軟分群機率（責任值）如何隨 K 改變。',
        init: '【起始種子】\n用法：切換不同的 EM 初始均值與變異數設定，觀察是否收斂到相同對數似然值。'
      },
      C5: {
        features: '【輸入特徵維度】\n切換 2D（視覺化投影幾何）或 4D（觀察高維壓縮）。',
        'features:2': '【兩特徵 (BMI, 血糖)】\n用途：在 2D 平面直接畫出 PC1/PC2 正交軸與各點垂直投影線，直觀理解降維與重建誤差。',
        'features:4': '【四特徵 (全部)】\n用途：將年齡、BMI、血糖、收縮壓 4 維資料壓縮到前 K 個主成分，觀察變異保留比例。',
        keep: '【保留主成分數】\n用法：決定留下前幾個主成分。保留越多重建誤差越小，但壓縮率越低。'
      },
      C6: {
        perplexity: '【Perplexity（困惑度）】\n用法：可視為每個點關注的有效鄰居數（約 2–6）。太小只看極近點導致碎片化；太大會把全域拉平。',
        iters: '【迭代次數】\n用法：梯度下降調整 2D 嵌入座標的步數，需足夠多步才能讓 KL 散度收斂並拉開群間距。',
        init: '【起始種子】\n用法：切換初始 2D 座標位置。t-SNE 為非凸最佳化，不同種子會得到旋轉或鏡像後的不同佈局。'
      },
      C7: {
        k: '【鄰居數 K】\n用法：計算 k-distance 與局部可達密度（lrd）的鄰居人數。K 太小易受微群波動影響；K 太大會抹平局部異常。',
        target: '【觀察病人 (#)】\n用法：指定要逐步追蹤計算 k-距離、可達距離、lrd 與 LOF 分數的病人編號（#13 為預設離群點）。'
      },
      C8: {
        trees: '【孤立樹數量 T】\n用法：隨機切分森林的樹數。樹數越多，平均路徑長度 E(h) 與異常分數越穩定。',
        target: '【觀察病人 (#)】\n用法：指定要追蹤首棵樹隨機切割過程的病人編號，對比離群點（少刀即孤立）與正常點的差異。'
      },
      D1: {
        min_sup: '【最小支持度 min_sup】\n用法：項目集至少要在幾成處方箋中同時出現。調高可大幅減少候選組合、加快探勘；調低能挖出較罕見的用藥組合。',
        min_conf: '【最小信賴度 min_conf】\n用法：要求「開了 A 也開 B」的條件機率門檻（0.5–0.9）。越高代表篩出的關聯規則越可靠。'
      },
      D2: {
        min_sup: '【最小支持度 min_sup】\n用法：篩選頻繁項目並決定 FP-Tree 需保留哪些項目與排序，低於門檻的藥品會被剪除。'
      },
      E1: {
        query: '【查詢句】\n選擇一句新的護理紀錄，計算它與 6 篇既有紀錄的 TF-IDF 餘弦相似度排名。',
        'query:0': '【查詢：夜間下床步態不穩】\n用途：測試跌倒風險相關詞彙的檢索匹配。',
        'query:1': '【查詢：傷口紅腫有滲液】\n用途：測試傷口／感染照護相關紀錄的匹配。',
        'query:2': '【查詢：主訴疼痛給予止痛藥】\n用途：測試疼痛評估與給藥紀錄的匹配。',
        stop: '【去除停用詞】\n用法：開啟後過濾「病人、有、給予」等高頻低區辨詞，避免無關紀錄因共用常見字而得分虛高。'
      },
      E2: {
        laplace: '【Laplace 平滑 α】\n用法：避免測試句出現訓練集某類別沒見過的詞時，條件機率變 0 而整條分數歸零。',
        query: '【測試句】\n選擇要交給詞袋 Naive Bayes 判斷類別（跌倒／疼痛／壓傷）的護理短句。',
        'query:0': '【測試句：跌倒風險語境】\n用途：包含「夜間、下床、步態、不穩」等詞，觀察模型是否正確歸類為跌倒風險。',
        'query:1': '【測試句：疼痛處置語境】\n用途：包含「主訴、傷口、疼痛、止痛藥」，觀察詞彙跨類別重疊時如何靠機率勝出。',
        'query:2': '【測試句：壓傷感染語境】\n用途：包含「壓傷、紅腫、滲液」，觀察專有特徵詞的高似然度貢獻。'
      },
      E3: {
        win: '【視窗大小 (±win)】\n用法：中心詞左右各看幾個詞來組成共現配對。視窗小偏重語法鄰接詞；視窗大偏重主題語意相關詞。',
        epochs: '【訓練輪數】\n用法：重複掃描語料配對更新詞向量的次數，輪數越多相似詞越能聚攏。',
        lr: '【學習率 η】\n用法：每次正負樣本更新詞向量的步長。'
      },
      E4: {
        topics: '【主題數 K】\n用法：設定文件集由幾個潛在主題組成（2 或 3），觀察每個詞被 Gibbs 抽樣分配到哪個主題。',
        iters: '【Gibbs 迭代輪數】\n用法：馬可夫鏈蒙地卡羅抽樣輪數。輪數越多，文件-主題與主題-詞分佈越收斂穩定。'
      },
      F1: {
        lr: '【學習率 η】\n用法：控制反向傳播更新 9 個權重與偏差的步長。因小資料僅 8 筆，設 0.5–1.0 可在 50 輪內清楚看到收斂。',
        epochs: '【訓練輪數】\n用法：整個訓練集前向＋反向傳播的總輪數。',
        init: '【起始權重（第幾組）】\n用法：切換不同的隨機初始權重。神經網路為非凸優化，不同起點可能走不同路徑或收斂速度不同。'
      },
      F2: {
        optimizer: '【目前觀察優化器】\n切換要在左側表格與單線軌跡追蹤的優化器（最後一步會把三者疊圖比較）。',
        'optimizer:sgd': '【SGD 隨機梯度下降】\n用途：固定乘以學習率往負梯度走。\n適用：簡單凸問題；在狹長山谷容易沿陡峭方向劇烈震盪。',
        'optimizer:momentum': '【Momentum 動量法】\n用途：累積過去梯度速度 v，抵消震盪並加速平緩方向。\n適用：有狹長山谷的損失面，但慣性大時可能衝過谷底。',
        'optimizer:adam': '【Adam 自適應動量】\n用途：同時估計一階動量 m 與二階平方梯度 s，為每個參數自動縮放步長。\n適用：深度學習最常用預設優化器，在各方向曲率差異大時仍能平滑前進。',
        lr: '【學習率 η】\n用法：所有優化器的基礎步長。調大可明顯看見 SGD 在 w₂ 方向來回震盪。',
        steps: '【步數】\n用法：共執行幾步參數更新，觀察三條軌跡何時抵達谷底 (0, 0)。',
        start: '【起點 (w₁, w₂)】\n選擇損失曲面上不同的出發座標。',
        'start:0': '【(-3.5, 1.2) 左上斜坡】\n用途：同時距離谷底遠且位於陡峭坡壁，最能對比三種優化器的抗震與加速能力。',
        'start:1': '【(-3.0, -1.0) 左下斜坡】\n用途：對稱象限的起點，觀察方向反轉後的軌跡對稱性。',
        'start:2': '【(3.2, 1.1) 右上斜坡】\n用途：從正半軸出發，測試不同象限下的收斂行為。'
      },
      F3: {
        image: '【輸入圖形 (6×6)】\n選擇不同幾何線條或形狀，測試卷積核對空間特徵的反應。',
        'image:0': '【直線】\n用途：垂直明暗交界，適合測試「垂直邊緣」卷積核的強烈響應。',
        'image:1': '【橫線】\n用途：水平明暗交界，適合測試「水平邊緣」卷積核。',
        'image:2': '【斜線】\n用途：對角線邊緣，觀察水平與垂直邊緣核各自抓到的部分訊號。',
        'image:3': '【十字】\n用途：同時含水平與垂直筆畫，對比不同卷積核如何分別萃取其中一個方向。',
        'image:4': '【方塊】\n用途：封閉矩形邊框，觀察邊緣檢測與模糊／銳化濾波後的輪廓變化。',
        kernel: '【卷積核 (3×3 Filter)】\n選擇要滑動掃描影像的濾波器權重矩陣。',
        'kernel:vert': '【垂直邊緣 (Sobel-X)】\n用途：左負右正權重，專門偵測左右明暗變化（垂直邊界）。',
        'kernel:horiz': '【水平邊緣 (Sobel-Y)】\n用途：上正下負權重，專門偵測上下明暗變化（水平邊界）。',
        'kernel:blur': '【模糊 (均值濾波)】\n用途：取 3×3 平均，能平滑雜訊並降低局部銳利度。',
        'kernel:sharp': '【銳化 (Laplacian)】\n用途：中心高正權重、四周負權重，強化像素與周圍的對比輪廓。',
        padding: '【補零 Padding】\n用法：開啟後在 6×6 周圍補一圈 0（變 8×8），使卷積輸出維持 6×6 不縮小，並保留邊角資訊。',
        pool: '【池化方式 (2×2)】\n決定如何對特徵圖做降採樣（縮小一半）。',
        'pool:max': '【最大池化 (Max Pooling)】\n用途：取 2×2 區塊內最大值，最能保留強烈邊緣特徵並具微幅平移不變性，CNN 最常用。',
        'pool:avg': '【平均池化 (Average Pooling)】\n用途：取 2×2 區塊平均，保留整體背景強度但容易稀釋尖銳邊緣訊號。'
      },
      F4: {
        cell: '【循環單元類型】\n切換傳統 RNN 與含記憶閘門的 LSTM。',
        'cell:rnn': '【標準 RNN】\n用途：每步直接 tanh(W·x + U·h)，結構簡單。\n適用：短序列任務；序列變長時梯度容易連乘消失或爆炸。',
        'cell:lstm': '【LSTM 長短期記憶】\n用途：加入遺忘閘 f、輸入閘 i、輸出閘 o 與細胞狀態 C，可選擇性保留長期記憶。\n適用：長序列預測或需跨多步記憶關鍵訊號的任務。',
        init: '【權重種子】\n用法：切換不同預置隨機權重，觀察門控值與最終預測的變化。'
      },
      F5: {
        epochs: '【訓練輪數】\n用法：自編碼器重建資料的訓練次數。輪數足夠時，正常點誤差極低、離群點因不符合主流壓縮規律而誤差顯著偏高。',
        lr: '【學習率 η】\n用法：編碼器與解碼器權重更新步長。',
        init: '【起始種子】\n用法：切換初始瓶頸權重方向，觀察是否穩定將 #13 辨識為最大異常點。'
      },
      G1: {
        method: '依時間序列是否具「趨勢」與「週期性」選擇對應的指數平滑模型。',
        'method:ses': '【簡單指數平滑 (SES)】\n用途：只追蹤水準 (Level) Lₜ。\n適用：沒有明顯長期趨勢、也沒有固定季節波動的平穩序列。',
        'method:holt': '【Holt 線性趨勢法】\n用途：同時追蹤水準 Lₜ 與趨勢 (Trend) bₜ。\n適用：有持續上升或下降趨勢、但無明顯季節波動的序列。',
        'method:hw': '【Holt-Winters 三重指數平滑】\n用途：同時追蹤水準、趨勢與季節性 (Seasonality) sₜ。\n適用：具固定週期（如每週七天／每月）且伴隨趨勢的時間序列。',
        alpha: '【水準平滑係數 α】\n用法：越接近 1 越重視最新一期觀測值，反應快但易受短期雜訊波動；越小越平滑。',
        beta: '【趨勢平滑係數 β】\n用法：控制斜率趨勢更新的靈敏度（僅 Holt / HW 使用）。',
        gamma: '【季節平滑係數 γ】\n用法：控制週期因子更新的速度（僅 Holt-Winters 使用）。',
        horizon: '【預測期數 (Horizon)】\n用法：設定要往未來多預測幾期，觀察點預測隨期數拉長的延伸方式。'
      },
      G2: {
        d: '【差分階數 d】\n用法：0＝直接對原序列建模；1＝先做一階差分（yₜ − yₜ₋₁）消除趨勢使序列平穩。',
        p: '【自迴歸階數 p】\n用法：用過去幾期的自身數值來預測下一期（AR(1) 看前 1 期，AR(2) 看前 2 期）。',
        horizon: '【預測期數 (Horizon)】\n用法：設定往未來遞迴預測幾期（若有差分會自動累加還原回原始尺度）。'
      },
      H1: {
        merges: '【合併次數 (Merges)】\n用法：設定 BPE 從字元出發要執行幾輪「最常相鄰配對合併」。次數越多詞表越大、常見字根越完整。'
      },
      H2: {
        sentence: '【輸入句子】\n選擇不同的醫療短句，觀察每個詞如何查表取得詞嵌入並加上弦波位置編碼。',
        'sentence:0': '【句子 1：病人夜間下床…】\n用途：觀察「下床、步態、不穩」等 6 個連續詞彙的位置向量與相加結果。',
        'sentence:1': '【句子 2：傷口紅腫滲液…】\n用途：觀察不同語意詞彙查表後與同一組位置編碼的疊加效果。'
      },
      H3: {
        queryIdx: '【觀察詞位置】\n用法：指定要以哪一個詞當 Query，查看它對句中所有詞的注意力權重分佈。',
        mask: '【因果遮罩 (Causal Mask)】\n用法：開啟後把未來位置分數設為 −∞（權重變 0），模擬 GPT 等自回歸模型生成時不能偷看後面的字。',
        heads: '【顯示頭數 (Head)】\n切換不同投影頭（W_Q, W_K, W_V 權重不同），觀察多頭注意力如何關注不同詞組關係。',
        'heads:1': '【第 1 注意力頭】\n用途：展示第 1 組 Q/K/V 投影矩陣所學到的詞間關注焦點。',
        'heads:2': '【第 2 注意力頭】\n用途：展示第 2 組投影矩陣，對比不同頭可同時捕捉不同面向的語意關聯。'
      },
      H4: {
        queryIdx: '【追蹤詞位置】\n用法：選擇要追蹤通過「Self-Attention → 殘差＋LayerNorm → FFN → 殘差＋LayerNorm」完整張量數值的詞彙位置。'
      },
      H5: {
        strategy: '選擇 LLM 根據下一個詞的機率分佈決定輸出字詞的方式。',
        'strategy:greedy': '【Greedy 貪婪解碼】\n用途：永遠只選機率最高的詞。\n適用：摘要、事實問答、程式碼補全等要求穩定一致的任務；缺點是容易重複呆板。',
        'strategy:sample': '【抽樣解碼 (Sampling)】\n用途：依 Temperature / Top-k / Top-p 過濾重正規化後的機率隨機抽取。\n適用：創意寫作、對話生成等需要多樣性的場景。',
        temperature: '【Temperature 溫度】\n用法：< 1 讓高機率詞更突出（較保守）；= 1 維持原分佈；> 1 拉平機率增加隨機與創意度。',
        top_k: '【Top-k】\n用法：每步只保留機率前 K 高的候選詞，其餘歸零。可避免抽到極低機率的離譜字詞。',
        top_p: '【Top-p (Nucleus 核抽樣)】\n用法：依機率由高到低累加，只保留累積機率達 p 的最小詞集合，比固定 K 更能適應分佈陡峭或平緩的語境。',
        seed: '【抽樣種子】\n用法：切換亂數種子，觀察相同機率設定下抽樣解碼會產出不同的句子變化。'
      },
      H6: {
        chunk: '【切塊方式 (Chunking)】\n決定知識庫文件如何切分成檢索段落。',
        'chunk:sent': '【依句切塊 (8 段)】\n用途：粒度較細，精準命中單句關鍵條款但可能缺少上下文背景。',
        'chunk:para': '【依段切塊 (6 段)】\n用途：保留較完整前後文脈，但若段落含多個主題可能稀釋單句相似度。',
        top_k: '【取前 K 段】\n用法：決定最後要塞入 LLM 提示詞的段落數量。太少可能漏掉關鍵條件；太多會增加提示詞長度與雜訊。',
        method: '選擇檢索知識庫段落的比對演算法。',
        'method:bm25': '【BM25 關鍵字檢索】\n用途：依詞頻與逆文件頻率精準比對字面。\n適用：專有名詞、法規條號或精確關鍵字查詢；無法處理同義詞。',
        'method:vec': '【向量檢索 (本例以 TF-IDF 示意)】\n用途：比對詞空間向量餘弦相似度（實務上會用語意 Embedding 模型）。\n適用：捕捉語意與多詞重疊關係。',
        'method:hybrid': '【混合檢索 (RRF 倒數名次融合)】\n用途：結合 BM25 與向量檢索的排名（1/(60+rank)）取長補短。\n適用：實務 RAG 系統最推薦的穩健方案。'
      },
      H7: {
        rank: '【低秩矩陣秩 r (Rank)】\n用法：將 4×4 的 ΔW 分解為 4×r 與 r×4（A×B）。r 越小省越多參數（r=1 省 50%），r 越大微調表達力越強。',
        epochs: '【訓練輪數】\n用法：凍結原始預訓練權重 W₀，只更新低秩配接器 A 與 B 的訓練次數。',
        lr: '【學習率 η】\n用法：調整低秩矩陣 A、B 梯度下降的更新步長。'
      },
      I1: {
        target: '【解釋病人 (#)】\n用法：指定要拆解個別預測歸因（Base value + 各特徵 SHAP 貢獻 = 預測機率）與排列重要度的病人編號。'
      },
      J1: {
        alpha: '【學習率 α】\n用法：新經驗覆寫舊 Q 值的比例。α=1 完全採用最新觀察；較小 α 更新較平緩抗隨機波動。',
        gamma: '【折扣因子 γ】\n用法：衡量未來獎勵相對於眼前獎勵的重要性。接近 1 代表更有遠見，會繞路避開陷阱追求終點大獎。',
        epsilon: '【探索率 ε (ε-greedy)】\n用法：每步有多大機率放棄目前已知最佳動作、改為隨機探索新路徑，避免卡在次佳策略。',
        episodes: '【訓練回合數 (Episodes)】\n用法：智能體從起點走到終點（或踩陷阱）重玩的總回合數，回合越多 Q 表越收斂至最優路徑。'
      }
    };
    const pctl = {};
    const expTips = TIPS[def.id] || {};
    function buildParams() {
      elParams.textContent = ''; let lastG = null;
      def.params.forEach(p => {
        if (p.group && p.group !== lastG) elParams.append(h('span', { class: 'tag amber' }, p.group)); lastG = p.group || null;
        const pTip = p.tip || expTips[p.key] || null;
        const lbl = h('span', { class: 'p-lbl', 'data-tip': pTip }, p.label);
        const box = h('label', { class: 'p' }, lbl);
        if (p.type === 'bool') { const b = h('button', { class: 'btn sm', type: 'button', 'data-tip': pTip, onclick: () => { S.params[p.key] = !S.params[p.key]; syncParams(); recompute(); } }); box.append(b); pctl[p.key] = () => { b.textContent = S.params[p.key] ? '開' : '關'; b.classList.toggle('on', !!S.params[p.key]); }; }
        else if (p.type === 'choice') { const sg = h('div', { class: 'seg' }); p.options.forEach(o => sg.append(h('button', { type: 'button', 'data-v': String(o.v), 'data-tip': o.tip || expTips[p.key + ':' + o.v] || pTip, onclick: () => { S.params[p.key] = o.v; syncParams(); recompute(); } }, o.label))); box.append(sg); pctl[p.key] = () => sg.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === String(S.params[p.key]))); }
        else { const d = p.digits != null ? p.digits : (String(p.step || 1).split('.')[1] || '').length; const val = h('b'); const inp = h('input', { type: 'range', min: p.min, max: p.max, step: p.step || 1, 'data-tip': pTip, oninput: e => { S.params[p.key] = +e.target.value; val.textContent = LAB.f(S.params[p.key], d) + (p.unit ? ' ' + p.unit : ''); recompute(); } }); box.append(inp, val); pctl[p.key] = () => { inp.value = S.params[p.key]; val.textContent = LAB.f(S.params[p.key], d) + (p.unit ? ' ' + p.unit : ''); }; }
        elParams.append(box);
      });
      elParams.append(h('span', { class: 'sp' }));
      const g = h('div', { class: 'grp' });
      if (def.data.large) { const sg = h('div', { class: 'seg' }); [['small', '小資料（逐筆看）', '少量樣本，方便逐筆追蹤演算法計算細節'], ['large', '放大版', '較多樣本，觀察整體分佈與收斂趨勢']].forEach(o => sg.append(h('button', { type: 'button', 'data-v': o[0], 'data-tip': o[2], onclick: () => { S.size = o[0]; newData(); } }, o[1]))); g.append(sg); pctl._size = () => sg.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === S.size)); }
      const seedTxt = h('span', { class: 'tag gray', 'data-tip': '目前使用的隨機種子編號，相同編號會產生完全一樣的資料' }); pctl._seed = () => { seedTxt.textContent = '第 ' + S.seed + ' 組'; };
      const bRestore = h('button', { class: 'btn sm', type: 'button', 'data-tip': '放棄手動修改的數值，還原為目前種子的原始資料', onclick: () => newData() }, '還原資料'); pctl._ed = () => { bRestore.style.display = S.edited ? '' : 'none'; };
      g.append(h('button', { class: 'btn sm', type: 'button', 'data-tip': '切換下一個隨機種子產生新樣本，測試演算法在不同資料下的表現', onclick: () => { S.seed++; newData(); } }, '換一組資料'), seedTxt, bRestore, h('button', { class: 'btn sm', type: 'button', 'data-tip': '將目前左側資料（含手動修改）匯出成 CSV 檔，可用於 Excel、Python 或 AI Studio', onclick: exportCSV }, '匯出 CSV'));
      elParams.append(g); syncParams();
    }
    function syncParams() { for (const k in pctl) pctl[k](); }
    function exportCSV() {
      LAB.download(LAB.csvName(def.id, def.data.name), LAB.toCSV(S.rows, cols));
      if (def.data.exports) def.data.exports(S.rows, S.params).forEach((x, i) => setTimeout(() => LAB.download(x.name, LAB.toCSV(x.rows, x.columns || cols, x.withId !== false)), 350 * (i + 1)));
    }

    /* ---------- 資料表 ---------- */
    const dataViz = LAB.viz.mount(elData); let rowEls = {};
    function drawData() {
      rowEls = {};
      elDataCnt.textContent = '共 ' + S.rows.length + ' 筆';
      if (def.data.view) { dataViz.update(Object.assign({ slot: 'side' }, def.data.view(S.rows, S.params)), false); elDataNote.textContent = def.data.note || ''; return; }
      dataViz.clear();
      const show = S.rows.length > 20 ? S.rows.slice(0, 12) : S.rows, ed = S.size === 'small' ? (def.data.editable || []) : [];
      const tb = h('table', { class: 'dtab' }, h('thead', null, h('tr', null, h('th', null, '#'), cols.map(c => h('th', null, c.label, c.unit ? h('small', null, c.unit) : null)))));
      const bd = h('tbody'); tb.append(bd);
      show.forEach(r => {
        const tr = h('tr', null, h('td', null, String(r.id))); rowEls[r.id] = tr;
        cols.forEach(c => {
          const v = r[c.key], can = ed.indexOf(c.key) >= 0;
          if (c.type === 'cat') { const td = h('td', { class: 'cat' + (can ? ' ed' : '') }); const sp = h('span'); const paint = () => { sp.textContent = r[c.key] == null ? '—' : c.levels[r[c.key]]; sp.className = c.role === 'y' ? (r[c.key] ? 'k-c1' : 'k-c0') : ''; }; paint(); td.append(sp); if (can) { td.title = '點一下切換'; td.addEventListener('click', () => { r[c.key] = (r[c.key] + 1) % c.levels.length; paint(); td.classList.add('edited'); S.edited = true; syncParams(); recompute(); }); } tr.append(td); }
          else if (c.type === 'text') tr.append(h('td', { class: 'txt' }, v == null ? '' : String(v)));
          else if (can) { const inp = h('input', { type: 'number', value: v == null ? '' : v, min: c.min, max: c.max, step: c.step || 1, 'aria-label': c.label + ' 第 ' + r.id + ' 筆' }); const td = h('td', null, inp); inp.addEventListener('change', () => { let x = parseFloat(inp.value); if (Number.isNaN(x)) { inp.value = r[c.key]; return; } if (c.min != null) x = Math.max(c.min, x); if (c.max != null) x = Math.min(c.max, x); inp.value = x; r[c.key] = x; td.classList.add('edited'); S.edited = true; syncParams(); recompute(); }); tr.append(td); }
          else tr.append(h('td', null, v == null ? '—' : String(v)));
        });
        bd.append(tr);
      });
      elData.append(h('div', { class: 'dtab-s' }, tb));
      elDataNote.textContent = (S.rows.length > show.length ? '只列出前 ' + show.length + ' 筆，完整資料請匯出 CSV。' : ed.length ? '可以直接改表格裡的數值，演算法會立刻重算。' : '') + (def.data.note ? ' ' + def.data.note : '');
    }
    function newData() { play(false); S.rows = def.data[S.size](S.seed); S.edited = false; syncParams(); drawData(); recompute(); }

    /* ---------- 計算與畫面 ---------- */
    function recompute(keep) {
      play(false); S.err = null;
      try { S.steps = def.build(LAB.clone(S.rows), Object.assign({}, S.params)) || []; if (!S.steps.length) throw new Error('build() 沒有回傳任何步驟'); }
      catch (e) { S.err = e; S.steps = []; }
      elErr.style.display = S.err ? '' : 'none'; if (S.err) { elErr.textContent = '計算發生錯誤：' + S.err.message; if (window.console) console.error(S.err); }
      S.reached = false; exSec.classList.add('lock'); exBody.textContent = '走到最後一步後，這裡會依照你這次的資料與參數整理出重點。';
      rng.max = Math.max(0, S.steps.length - 1);
      S.idx = keep ? LAB.M.clamp(keep, 0, Math.max(0, S.steps.length - 1)) : 0;
      draw(false); drawAIS();
    }
    function go(i, animate) { if (!S.steps.length) return; const t = LAB.M.clamp(i, 0, S.steps.length - 1); if (t === S.idx) { if (S.playing && t === S.steps.length - 1) play(false); return; } S.idx = t; draw(animate); }
    function play(on) {
      clearTimeout(S.timer); S.playing = !!on && S.steps.length > 1;
      if (S.playing && S.idx >= S.steps.length - 1) { S.idx = 0; draw(false); }
      bPlay.textContent = S.playing ? '❚❚ 暫停' : '▶ 播放';
      if (S.playing) { const tick = () => { if (S.idx >= S.steps.length - 1) { play(false); return; } go(S.idx + 1, true); S.timer = setTimeout(tick, 1250 / S.speed); }; S.timer = setTimeout(tick, 700 / S.speed); }
    }
    function draw(animate) {
      const st = S.steps[S.idx], n = S.steps.length;
      pos.textContent = n ? (S.idx + 1) + ' / ' + n : '—'; rng.value = S.idx;
      bPrev.disabled = bReset.disabled = S.idx <= 0; bNext.disabled = bEnd.disabled = S.idx >= n - 1; bPlay.disabled = n < 2;
      if (!st) { ['main', 'side', 'bottom'].forEach(k => viz[k].clear()); sTt.textContent = ''; sSay.textContent = ''; sCalc.textContent = ''; return; }
      sNo.textContent = S.idx + 1; sTt.textContent = st.title || ''; sPh.textContent = st.phase || ''; sPh.style.display = st.phase ? '' : 'none'; sSay.textContent = st.say || '';
      sCalc.textContent = ''; (st.calc || []).forEach((t, i) => { const d = h('div', null, t); if (animate) d.style.animationDelay = (i * 0.13) + 's'; else d.style.animation = 'none', d.style.opacity = 1; sCalc.append(d); });
      if (animate) { stepBox.classList.remove('swap'); void stepBox.offsetWidth; stepBox.classList.add('swap'); }
      lnEls.forEach((e, i) => e.classList.toggle('on', i + 1 === st.line));
      const ln = lnEls[(st.line || 0) - 1]; if (ln) { elPseudoBar.style.transform = 'translateY(' + ln.offsetTop + 'px)'; elPseudoBar.style.height = ln.offsetHeight + 'px'; elPseudoBar.style.opacity = 1; } else elPseudoBar.style.opacity = 0;
      const fc = new Set((st.focus || []).map(String)); let first = null;
      for (const id in rowEls) { const on = fc.has(String(id)); rowEls[id].classList.toggle('focus', on); if (on && !first) first = rowEls[id]; }
      if (first) { const sc2 = first.closest('.dtab-s'); if (sc2) { const top = first.offsetTop - 30, bot = first.offsetTop + first.offsetHeight; if (top < sc2.scrollTop) sc2.scrollTop = Math.max(0, top); else if (bot > sc2.scrollTop + sc2.clientHeight) sc2.scrollTop = bot - sc2.clientHeight + 4; } }
      const by = {}; (st.views || []).forEach(v => { by[v.slot || 'main'] = v; });
      [['main', pMain], ['side', pSide], ['bottom', pBottom]].forEach(([k, pane]) => { pane.style.display = by[k] ? '' : 'none'; if (by[k]) viz[k].update(Object.assign({ slot: k }, by[k]), animate); });
      if (S.idx === n - 1 && !S.reached) { S.reached = true; drawExplain(); try { const k = 'lab:done', a = JSON.parse(localStorage.getItem(k) || '[]'); if (a.indexOf(def.id) < 0) { a.push(def.id); localStorage.setItem(k, JSON.stringify(a)); } } catch (e) { /* 無法儲存時略過 */ } }
      writeHash();
    }
    function drawExplain() {
      let items = []; try { items = def.explain ? def.explain(S.steps, S.rows, S.params) : []; } catch (e) { items = ['（解讀產生失敗：' + e.message + '）']; }
      exSec.classList.remove('lock'); exBody.textContent = ''; exBody.append(h('ul', { class: 'explain' }, items.map(t => h('li', null, t))));
    }
    function drawAIS() {
      const a = def.aistudio || {}; aisSec.textContent = '';
      let exp = []; try { exp = a.expect && S.steps.length ? a.expect(S.steps, S.rows, S.params) : []; } catch (e) { exp = []; }
      aisSec.append(
        h('h2', null, '到 AI Studio 驗證', a.confirmed ? h('span', { class: 'tag good' }, '已實機確認') : h('span', { class: 'tag amber' }, '運算子與參數名稱待實機確認'), h('button', { class: 'btn sm', type: 'button', onclick: exportCSV }, '匯出 CSV')),
        h('div', { class: 'ais-flow' }, (a.operators || []).map((o, i) => [i ? h('span', { class: 'ar' }, '→') : null, h('span', { class: 'op' }, o)])),
        h('div', { class: 'ais-grid' },
          h('div', null, h('h4', null, '參數設定'), h('table', { class: 'kv' }, h('tr', null, h('th', null, '運算子 › 參數'), h('th', null, '設定值')), (a.params || []).map(p => h('tr', null, h('td', null, p[0]), h('td', { class: 'm' }, typeof p[1] === 'function' ? p[1](S.params) : p[1])))),
            a.note ? h('p', { class: 'dnote' }, a.note) : null),
          h('div', null, h('h4', null, '跑完應該看到'), h('ul', null, exp.map(t => h('li', null, t))), h('h4', { style: 'margin-top:10px' }, 'Python 對照'), h('pre', null, a.python || ''))),
        h('h4', { style: 'margin:14px 0 6px;font-size:14px;color:var(--muted)' }, 'CSV 欄位對照'),
        h('table', { class: 'kv' }, h('tr', null, h('th', null, 'CSV 欄名'), h('th', null, '意義'), h('th', null, '角色'), h('th', null, '值')),
          cols.map(c => h('tr', null, h('td', { class: 'm' }, c.key), h('td', null, c.label + (c.unit ? '（' + c.unit + '）' : '')), h('td', null, c.role === 'y' ? '標籤 label' : c.role === 'id' ? '識別 id' : '特徵'), h('td', { class: 'm' }, c.type === 'cat' ? c.levels.map((l, i) => (c.codes ? c.codes[i] : i) + '＝' + (l || '無')).join('、') : c.type === 'text' ? '文字' : '數值')))));
    }

    /* ---------- 鍵盤 ---------- */
    document.addEventListener('keydown', e => {
      const t = e.target, tag = t && t.tagName; if (tag === 'INPUT' && t.type !== 'range' || tag === 'SELECT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowRight') { play(false); go(S.idx + 1, true); } else if (e.key === 'ArrowLeft') { play(false); go(S.idx - 1, true); }
      else if (e.key === ' ') { if (tag === 'BUTTON') return; play(!S.playing); } else if (e.key === 'Home' || e.key === 'r' || e.key === 'R') { play(false); go(0, false); } else if (e.key === 'End') { play(false); go(S.steps.length - 1, false); } else return;
      e.preventDefault();
    });
    window.addEventListener('resize', () => { if (S.steps.length) draw(false); });

    buildParams(); drawSpeed();
    S.rows = def.data[S.size](S.seed); drawData(); recompute(S._step - 1);
    LAB._state = S; LAB._go = go;

    if (!window._labTipInit) {
      window._labTipInit = true;
      const tipEl = h('div', { class: 'lab-tip', role: 'tooltip' });
      document.body.appendChild(tipEl);
      let curTarget = null;
      const showTip = el => {
        const txt = el && el.getAttribute('data-tip');
        if (!txt) { hideTip(); return; }
        curTarget = el;
        tipEl.textContent = txt;
        tipEl.classList.add('show');
        const r = el.getBoundingClientRect();
        const tw = tipEl.offsetWidth || 240, th = tipEl.offsetHeight || 48;
        let left = r.left + r.width / 2 - tw / 2;
        left = Math.max(8, Math.min(window.innerWidth - tw - 8, left));
        let top = r.top - th - 8;
        if (top < 8) top = r.bottom + 8;
        tipEl.style.left = Math.round(left) + 'px';
        tipEl.style.top = Math.round(top) + 'px';
      };
      const hideTip = () => { curTarget = null; tipEl.classList.remove('show'); };
      document.addEventListener('mouseover', e => { const t = e.target && e.target.closest ? e.target.closest('[data-tip]') : null; if (t) showTip(t); else if (curTarget) hideTip(); });
      document.addEventListener('mouseout', e => { if (curTarget && (!e.relatedTarget || !curTarget.contains(e.relatedTarget))) hideTip(); });
      document.addEventListener('focusin', e => { const t = e.target && e.target.closest ? e.target.closest('[data-tip]') : null; if (t) showTip(t); });
      document.addEventListener('focusout', hideTip);
      document.addEventListener('pointerdown', hideTip);
      window.addEventListener('scroll', hideTip, { passive: true });
    }
  }
})();
