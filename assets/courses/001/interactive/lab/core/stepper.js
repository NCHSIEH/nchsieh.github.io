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
  const showTitle = e => LAB.displayTitle ? LAB.displayTitle(e.id, e.title) : e.title;
  if (!entry) { root.append(h('div', { class: 'lab-err' }, '找不到這個實驗。'), h('p', null, h('a', { class: 'btn primary', href: './' }, '回實驗室目錄'))); return; }
  document.title = entry.id + ' ' + showTitle(entry) + ' · 演算法實驗室';
  const crumb = document.getElementById('crumb'); if (crumb) crumb.textContent = '/ ' + entry.id + ' ' + showTitle(entry);
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
    const GOALS = {
      A1: '對同一份含遺失值的健檢資料，實測「平均數 (Mean)」、「中位數 (Median)」與「k-NN 鄰居補值 (k-NN Imputation)」如何填補空格；觀察平均數法如何人為壓低標準差 (SD)，而 k-NN 如何在散佈圖上依最近鄰居保留原始分佈。',
      A2: '將年齡（歲）與空腹血糖（mg/dL）換算為 Z 分數 (Z-score) 或 Min-Max [0, 1] 區間；觀察未縮放前血糖如何主導歐氏距離 (Euclidean Distance)，以及縮放後病人 A 的最近鄰居是否翻轉。',
      A3: '以「等寬 (Equal-Width)」、「等頻 (Equal-Frequency)」與「依熵監督式 (Entropy-based)」將連續血糖切成離散區間；對比極端高血糖（198）出現時等寬箱如何擠成一團，而依熵分箱如何精準對齊糖尿病風險轉折點。',
      A4: '將文字類別（內科／外科／急診）轉為 One-Hot（3 欄）、Dummy（去基準欄防完全共線性 Multicollinearity）或目標編碼 (Target Encoding)；調整平滑強度 m 觀察小樣本科別如何向整體平均率收縮並防範資料洩漏 (Data Leakage)。',
      A5: '針對陽性僅佔 20–25% 的不平衡資料，比較隨機過抽樣 (Oversampling)、欠抽樣 (Undersampling) 與 SMOTE（在少數類 K 鄰居連線上依比例 λ 內插合成新點）如何把陽性率拉升至目標比例並擴張少數類涵蓋區域。',
      A6: '比較單變數過濾法（皮爾森相關係數 |r|、資訊增益 Information Gain）與包裹法「向前選擇 (Forward Selection + LOOCV 3-NN)」如何從 4 個生理指標挑出最佳子集，觀察臨床重疊樣本如何讓向前選擇必須多選特徵才提升準確率。',
      B1: '用 BMI 預測收縮壓，對照最小平方法 (OLS) 公式一次算出斜率 w* 與截距 b*，以及梯度下降 (Gradient Descent) 如何從 (0,0) 沿損失曲面 (Loss Surface) 逐步逼近同一組解；試調學習率 η 觀察收斂速度與震盪。',
      B2: '在年齡、BMI、血糖共線迴歸中調大懲罰強度 λ（0.01 → 250），對照 Ridge (L2) 如何平滑壓縮所有係數，而 Lasso (L1) 如何透過軟閾值 (Soft Thresholding) 將次要特徵係數精確歸零以完成自動篩選。',
      B3: '透過梯度下降優化對數損失 (Log Loss / Binary Cross-Entropy)，觀察決策邊界如何從水平線旋轉推開兩群病人；試調判定門檻 (Threshold, 0.1–0.9) 直接看黃圈誤判點（FP 與 FN）如何消長。',
      B4: '追蹤 k-NN 計算距離、排序、取前 K 名與多數決投票的四步流程；切換「先標準化 (Standardize)」開關與調整 K（1–9）及新病人座標，觀察高尺度血糖未標準化時如何主導鄰居選擇與背景判定區域。',
      B5: '從先驗機率 (Prior) 與各特徵條件機率 (Likelihood) 出發，將新病人的年齡、BMI、血糖條件連乘並正規化為後驗機率 (Posterior)；試將 Laplace 平滑 α 設為 0，觀察零次數特徵如何導致機率瞬間歸零。',
      B6: '枚舉所有特徵的相鄰數值中點計算 Gini 不純度或資訊增益 (Information Gain) 下降量，逐步長出 2 層決策樹與 2D 矩形切割區域；調整最大深度與最小葉節點數觀察預剪枝 (Pre-pruning) 效果。',
      B7: '透過有放回抽樣 (Bootstrap) 與節點隨機挑選 mtry 個特徵建立多棵決策樹，用沒被抽到的袋外樣本 (Out-of-Bag, OOB) 估算泛化準確率，並看全部樹如何共同投票預測高風險新病人。',
      B8: '在無法由單一直線切分的 2D 門診資料上，看 AdaBoost 如何逐輪挑選加權錯誤率 ε 最小的決策樹樁 (Decision Stump)，放大答錯病人的權重 wᵢ（圖上圓點變大），最後以話語權 α 加權組合出非線性邊界。',
      B9: '從全體平均 F₀ 出發，讓多棵深度為 1 的回歸樹樁接力擬合前一輪剩下的「殘差 (Residual)」，觀察散佈圖上的紅虛線誤差如何逐步縮短、階梯預測線如何貼近資料；比較不同學習率 η (Shrinkage) 對 MSE 的影響。',
      B10: '以 SMO (Sequential Minimal Optimization) 求解最大間隔超平面與支持向量 (Support Vectors, αᵢ > 0)；切換懲罰參數 C（0.1–100）與核函數（Linear vs RBF），觀察寬鬆軟間隔與彎曲非線性邊界的差異。',
      B11: '在 8 筆訓練＋4 筆驗證的門診資料上調整多項式階數（degree 1–7），直觀對比 d=1 欠擬合 (Underfitting)、d=2–3 適度擬合與高階過擬合 (Overfitting) 曲線，並觀察 Train vs Validation MSE 的 U 型分岔。',
      B12: '結合 Logistic 迴歸、決策樹樁與 3-NN 三種不同幾何邊界的基模型，對照直接投票 (Voting) 與第二層 Meta-Learner 自動分配權重 (Stacking) 如何提升整體準確率並形成互補決策區域。',
      B13: '將 15 位病人切為 K 折輪流驗證 (K-Fold Cross Validation)，在「是否標準化 × K∈{1,3,5}」共 6 組超參數網格中搜尋最高平均驗證分數，並確保標準化只在每折訓練集內計算以防資料洩漏。',
      C1: '在標準化 BMI × 血糖空間反覆執行「指派最近中心」與「移動中心至成員平均」，透過中心輻射連線與勢力範圍底色觀察 SSE 單調下降；切換 9 組起始中心驗證 K-Means 易受初值影響而落入局部最佳解。',
      C9: '對 K=2..5 執行 K-Means，逐點計算同群平均距離 a(i) 與最近外群距離 b(i) 得出輪廓係數 (Silhouette Score)，並同場繪出 SSE 手肘曲線，解答「分幾群最合適」的實務選擇題。',
      C10: '在含極端高血糖離群點 #12 的資料上以 PAM (Partitioning Around Medoids) 挑選真實病人當群中心，並與 K-Means 幾何平均中心（星號）同場對照，直觀見證 Medoid 抗離群值不被拉偏的優勢。',
      C2: '從兩兩距離矩陣挑出最近群對逐步合併並繪製樹狀圖 (Dendrogram)；切換單一 (Single)、完全 (Complete) 與平均 (Average / UPGMA) 連結法，比較「鏈狀效應」與「緊實球狀分群」的結構差異。',
      C3: '依鄰域半徑 ε 與核心門檻 minPts 將病人標記為核心點 (Core)、邊界點 (Border) 與雜訊 (Noise, -1)，從核心點往外密度連通擴張群集；調整 ε 觀察群集分裂或過度合併的臨界點。',
      C4: '以多個高斯分佈混合擬合標準化血糖，交替執行 E 步（計算每點屬於各群的軟歸屬責任值 Responsibility）與 M 步（加權更新均值、變異數與權重），從曲線變化見證對數概似 (Log-Likelihood) 穩步上升。',
      C5: '計算標準化資料的共變異矩陣 (Covariance Matrix) 與特徵向量，將高維資料投影到變異數最大的正交主成分軸 (PC1, PC2)；對比保留 1 維或 2 維時的重建誤差 (Reconstruction Error) 與垂直投影距離。',
      C6: '依 Perplexity 調整高維高斯核寬度 σᵢ 記住鄰居相似度 Pᵢⱼ，再在 2D 平面以重尾 t 分佈 Qᵢⱼ 透過梯度下降最小化 KL 散度 (KL Divergence)；觀察原本交錯的群集如何一步步被推開聚攏。',
      C7: '對目標病人計算 k-距離圓圈、可達距離 (Reachability Distance) 與局部可達密度 (LRD)，並與其 K 位鄰居的密度相除得出 LOF 比值；對比正常密集點（LOF ≈ 1）與孤立點 #13（LOF ≫ 1）的密度落差。',
      C8: '不建正常模型，而是隨機選特徵與切點遞迴切割空間（Isolation Tree），統計將每個點單獨孤立所需的平均路徑長度 E(h)；觀察離群點 #13 如何只需 1–2 刀就被切出而獲得接近 1 的高異常分數。',
      D1: '從 12 張門診處方箋逐層產生候選藥品組合（C1 → C2 → C3），利用 Apriori 反單調性剪除低於 min_sup 的項目集；算出支持度 (Support)、信賴度 (Confidence) 與提升度 (Lift) 長條圖，並辨識「高信賴卻 Lift < 1」的假規則陷阱。',
      D2: '只掃描處方兩次即依頻繁度排序壓縮成前綴樹 (FP-Tree)，透過共有路徑合併省去 Apriori 產生海量候選集的成本，直接從條件模式基 (Conditional Pattern Base) 挖掘全部頻繁用藥組合。',
      E1: '以中文正向最大匹配斷詞並過濾停用詞 (Stopwords)，建立詞彙的詞頻 (TF) 與逆文件頻率 (IDF) 矩陣，再以 L2 正規化向量計算查詢句與 6 篇護理紀錄的餘弦相似度 (Cosine Similarity) 排名。',
      E2: '統計三類護理紀錄的詞頻並套用 Laplace 平滑 (α)，將測試句每個詞的對數條件機率 ln P(w|c) 累加至類別先驗，最後經 Softmax 輸出屬於「跌倒／疼痛／壓傷」的後驗機率分佈。',
      E3: '以滑動視窗 (±win) 從護理紀錄抽出 (中心詞, 上下文) 正樣本並搭配隨機負抽樣 (Negative Sampling)，透過 Skip-gram 梯度更新拉近共現詞、推開無關詞，在 2D 空間收斂出語意相近的詞向量鄰居。',
      E4: '透過 Collapsed Gibbs Sampling 反覆先扣除當前詞的計數，再依「該文件偏好主題 × 該主題偏好此詞」重抽主題標籤；觀察混合主題文件如何逐步分化並收斂出各主題的代表高頻詞。',
      F1: '追蹤 2-2-1 多層感知器 (MLP) 完整一輪：輸入經隱藏層 Sigmoid 算出預測 ŷ（前向傳播 Forward）與 BCE 損失，再依鏈鎖律逐層回推 δ 與 9 個權重梯度（反向傳播 Backpropagation）並驗證誤差下降。',
      F2: '在 w₂ 方向曲率為 w₁ 16 倍的狹長山谷損失曲面上，同場對照 SGD（陡峭方向易劇烈鋸齒震盪）、Momentum（累積速度加速谷底推進）與 Adam（依一、二階動量自適應各軸步長）的軌跡與收斂速度。',
      F3: '選擇直線、橫線、十字或方塊等 6×6 圖形與 3×3 卷積核 (Filter)，逐步觀看滑動內積算出特徵圖、Padding 補零維持尺寸、ReLU 截斷負值，以及 2×2 Max / Avg 池化 (Pooling) 如何濃縮空間特徵。',
      F4: '沿 8 個月門診序列展開隱藏狀態 hₜ 的時間傳遞，對比標準 RNN 的單純雙曲正切覆寫與 LSTM 如何透過遺忘閘 (f)、輸入閘 (i)、輸出閘 (o) 與細胞狀態 (C) 保留長期趨勢來預測下一月人次。',
      F5: '訓練 3-1-3 自編碼器 (Autoencoder) 將 BMI、血糖、收縮壓壓縮至 1 維瓶頸 (Bottleneck) 再還原；利用正常群遵循的相關性，以「重建誤差 (Reconstruction Error)」精準揪出違背生理規律的異常點 #13。',
      G1: '對 24 個月門診人次依序對比簡單指數平滑 (SES, 僅水準)、Holt（加線性趨勢）與 Holt-Winters（加 12 期季節指數）如何逐期更新狀態並往未來延伸預測；調整 α、β、γ 觀察對短期波動的敏感度。',
      G2: '先對含趨勢的月門診序列做一階差分 (d=1) 使其平穩 (Stationary)，透過自相關函數 ACF 辨識滯後關聯，再以 AR(p) 線性迴歸預測未來差分值並累加還原回原始門診人次尺度。',
      H1: '從單一中文字元詞表出發，反覆統計並合併出現頻率最高的相鄰符號對 (Byte Pair Encoding, BPE)，示範詞表如何逐輪長出常用雙字與三字醫療詞根，進而用更少 Token 切分未見詞。',
      H2: '將 6 個護理詞彙查表轉為 4 維詞嵌入 (Word Embedding)，並加上正弦／餘弦位置編碼 (Positional Encoding)；對比相鄰位置的向量波紋差異，理解「詞序對調」時輸入矩陣為何能被 Transformer 分辨。',
      H3: '將詞向量投影為 Query、Key、Value，逐格計算縮放點積相似度 (Q·Kᵀ / √d_k)，測試因果遮罩 (Causal Mask) 如何將未來位置歸零，並經 Softmax 轉為注意力權重對 Value 加權融合上下文。',
      H4: '完整追蹤單一詞向量通過一層 Transformer Encoder：先經 Self-Attention 融合上下文，加上殘差連接 (Residual) 與 LayerNorm，再進入兩層前饋網路 (FFN) 與第二次殘差正規化，觀察每步張量數值變化。',
      H5: '給定「病人頭暈下床…」的 8 個候選詞原始 Logit 分數，對比 Greedy（永遠選最大）與抽樣解碼 (Sampling)；實測 Temperature 縮放、Top-k 截斷與 Top-p (Nucleus) 核抽樣如何重塑機率分佈與生成多樣性。',
      H6: '針對長照 3.0 外籍看護條件問題，比較依句／依段切塊 (Chunking) 與三種檢索法：BM25 精準字面比對、TF-IDF 向量餘弦相似度與混合檢索 RRF (Reciprocal Rank Fusion)，挑出前 K 段組裝成 LLM 提示詞。',
      H7: '凍結 4×4 預訓練權重矩陣 W₀，只在旁側訓練兩個低秩小矩陣 B (4×r) 與 A (r×4)；設定 rank r=1 即可將微調參數量從 16 減半至 8，並在熱圖上觀察 ΔW = B·A 如何逼近目標權重增量。',
      I1: '對單一門診病人的預測機率，枚舉年齡、BMI、血糖全部 3! = 6 種加入順序計算邊際貢獻，精確算出滿足加總公理的 SHAP 值（Base value + ΣSHAP = 預測值），並對照全域排列重要度 (Permutation Importance)。',
      J1: '（延伸參考）在無監督答案的 4×4 病房網格（含障礙牆、−5 陷阱與 +10 終點）中，讓智能體透過 ε-greedy 試錯探索與貝爾曼 (Bellman) 更新累積經驗，觀察 Q 值熱圖如何從終點反推收斂出最佳避障路線。'
    };

    const canEdit = !!(def.data.editable && def.data.editable.length);

    root.append(
      h('header', { class: 'lab-hero' }, h('div', { class: 'badge' }, def.id), h('div', null, h('h1', null, showTitle(def)), h('p', { class: 'goal' }, GOALS[def.id] || def.goal || ''),
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
        method: '遺失值補值法（Missing Value Imputation）：選擇填補空格的策略，觀察欄位平均值與標準差（Standard Deviation）的變化。',
        'method:mean': '【平均數補值 (Mean Imputation)】\n作法：用該欄有效值的算術平均填補所有空格。\n具體效果：補完後欄位平均不變，但標準差會縮小（資料被拉向中心）。\n適用：數值接近常態分佈（Normal Distribution）且無極端離群值時。',
        'method:median': '【中位數補值 (Median Imputation)】\n作法：將有效值由小到大排序後取正中間值填補。\n具體效果：即使出現極端高血糖（如 250 mg/dL）或高醫療費用也不會拉偏補值。\n適用：右偏分佈（Right-Skewed）或含離群值（Outliers）的臨床數值。',
        'method:knn': '【k-NN 補值 (k-Nearest Neighbors Imputation)】\n作法：用其他完整欄位（標準化後算歐氏距離 Euclidean Distance）找最像的 K 位病人，取其該欄平均填補。\n具體效果：例如高齡高 BMI 者會補到較高血糖，最能保留欄位間相關性與原本標準差。',
        k: '【k-NN 鄰居數 K (Number of Neighbors)】\n用法：設定參考幾位最相似病人（1–5）。\nK=1 只看最像的那 1 人，最貼近局部但易受單一雜訊影響；K=5 取 5 人平均較平滑穩定。'
      },
      A2: {
        method: '特徵縮放（Feature Scaling）：將不同單位的特徵（如年齡「歲」與血糖「mg/dL」）換成可比較的尺度。',
        'method:z': '【Z 分數標準化 (Z-score Standardization)】\n公式：z = (x − μ) / σ，轉為平均 0、標準差 1。\n適用：k-NN、SVM、PCA、線性／Logistic 迴歸等依賴距離或梯度下降（Gradient Descent）的模型；較不易被單一極端值壓扁。',
        'method:minmax': '【Min-Max 正規化 (Min-Max Normalization)】\n公式：(x − min) / (max − min)，線性壓縮到 [0, 1]。\n適用：神經網路輸入或影像像素（0–255 → 0–1）；缺點是若出現一個極端離群值，其餘正常點會被擠在很窄的區間。',
        a: '【病人 A (#)】\n用法：選擇要計算歐氏距離與尋找最近鄰居（Nearest Neighbor）的基準病人編號，觀察縮放前後「誰最像 A」是否改變。',
        b: '【病人 B (#)】\n用法：選擇要與病人 A 對照距離拆解（Δ年齡² vs Δ血糖²）的病人編號，看未縮放時大尺度欄位如何主導距離。'
      },
      A3: {
        method: '特徵離散化／分箱（Discretization / Binning）：將連續數值切成離散區間。',
        'method:width': '【等寬分箱 (Equal-Width Binning)】\n作法：把 (max − min) 均分成 K 段相同寬度。\n具體限制：若有一筆右偏極端值（如血糖 198），多數正常人會全擠進低血糖箱，甚至出現空箱（Empty Bin）。',
        'method:freq': '【等頻分箱 (Equal-Frequency / Quantile Binning)】\n作法：依分位數（Quantiles）切分，讓每箱人數盡量相等。\n適用：偏態資料，能確保每個區間都有足夠樣本統計穩定度。',
        'method:entropy': '【依熵分箱 (Entropy-based / Supervised Binning)】\n作法：參考目標標籤 y（糖尿病），挑出資訊增益（Information Gain）最大的切點。\n適用：監督式分類任務，切點會精準落在疾病風險急遽上升的位置。',
        bins: '【區間數 (Number of Bins)】\n用法：設定要切成 2–5 箱。箱數越多保留越多細節，但每箱樣本數變少，容易對小樣本雜訊過擬合（Overfitting）。'
      },
      A4: {
        method: '類別編碼（Categorical Encoding）：將文字類別（內科／外科／急診）轉換成模型可運算的數值特徵。',
        'method:onehot': '【One-hot 獨熱編碼 (One-Hot Encoding)】\n作法：K 個類別展開為 K 個 0/1 二元欄位（如 med, surg, er）。\n適用：決策樹、隨機森林、神經網路等不怕特徵完全共線性的模型。',
        'method:dummy': '【Dummy 虛擬編碼 (Dummy Encoding)】\n作法：以「內科」為基準組（Reference Level），只保留 K−1 欄（surg, er）。\n適用：線性／Logistic 迴歸，避免三欄總和恆等於 1 造成完全共線性（Perfect Multicollinearity）。',
        'method:target': '【目標編碼 (Target Encoding)】\n作法：以該類別在訓練集中的目標陽性率代替文字。\n適用：高基數類別（High-Cardinality，如數十種診斷碼）；實務務必在交叉驗證折內（Out-of-Fold）計算以防資料洩漏（Data Leakage）。',
        smoothing: '【平滑強度 m (Additive Smoothing)】\n公式：(n·p̂ + m·prior) / (n + m)。\n用法：m=0 完全相信該科別樣本率；m 越大（如 10），樣本少的科別越會被拉向整體平均率（Prior），避免少數幾筆極端個案誤導。'
      },
      A5: {
        method: '不平衡資料處理（Imbalanced Learning / Resampling）：解決少數類（如再入院陽性）比例過低導致模型只會猜多數類的問題。',
        'method:over': '【隨機過抽樣 (Random Oversampling)】\n作法：隨機重複複製少數類樣本直到目標比例。\n缺點：複製點與原點座標完全重疊，決策邊界容易對少數幾個點過擬合（Overfitting）。',
        'method:under': '【隨機欠抽樣 (Random Undersampling)】\n作法：隨機刪除多數類樣本。\n適用：百萬筆以上大資料想加速訓練；缺點是小資料集會丟掉重要多數類邊界樣本（Information Loss）。',
        'method:smote': '【SMOTE (Synthetic Minority Over-sampling Technique)】\n作法：在少數類樣本與其 K 個少數類鄰居的連線上，依比例 λ ∈ (0,1) 內插合成新點。\n適用：表格型不平衡分類首選，注意只能對訓練集（Training Set）做，不可碰測試集。',
        k: '【SMOTE 鄰居數 K (k-Nearest Neighbors)】\n用法：決定合成新點時從幾個最近陽性鄰居中挑選（1–3）。K 越大合成連線涵蓋範圍越廣，但也可能跨過多數類區域。',
        ratio: '【目標陽性比例 (Target Minority Ratio)】\n用法：設定重抽樣後陽性佔總樣本的比例（0.3–0.5）。調到 0.50 代表 1:1 平衡；實務上調到 0.30–0.40 常能減少偽陽性（False Positive）。'
      },
      A6: {
        method: '特徵選擇（Feature Selection）：從候選特徵中挑出最有助預測且不冗餘的子集。',
        'method:corr': '【皮爾森相關係數 |r| (Pearson Correlation — Filter Method)】\n作法：不需訓練模型，直接算每個特徵與目標 y 的線性相關絕對值。\n優缺點：計算極快，但抓不到非線性關係或特徵互補性。',
        'method:ig': '【資訊增益 (Information Gain — Filter Method)】\n作法：衡量以該特徵中位數二分後，目標類別熵（Entropy）降低多少。\n適用：能捕捉非線性門檻切分效果，常用於樹模型前處理篩選。',
        'method:forward': '【向前選擇 (Forward Selection — Wrapper Method)】\n作法：從空集合出發，每輪試加一個特徵並用留一法（LOOCV, Leave-One-Out Cross-Validation）3-NN 實測正確率，挑提升最多者直到不再進步。\n優缺點：直接對齊模型表現，但計算成本較高。',
        top: '【目標特徵數 K (Top-K Features)】\n用法：過濾法（Filter）會依分數由高到低取前 K 名；向前選擇（Wrapper）則設定最多選入幾個特徵。'
      },
      B1: {
        method: '線性迴歸求解（Linear Regression Solver）：比較閉式公式解與疊代最佳化。',
        'method:ols': '【最小平方法直接解 (Ordinary Least Squares, OLS)】\n作法：用正規方程式 w = Sxy / Sxx 一次算出全域最佳解（Global Optimum）。\n適用：特徵數在數萬維以內、可一次載入記憶體的線性迴歸，不需調學習率。',
        'method:gd': '【梯度下降 (Gradient Descent, GD)】\n作法：從 (w, b) = (0, 0) 出發，每輪計算 MSE 損失函數的偏微分梯度並沿反方向更新。\n適用：超高維資料或深度學習等無閉式公式可解的模型。',
        lr: '【學習率 η (Learning Rate)】\n用法：決定梯度下降每步跨出的比例（0.01–0.50）。\n調太小（0.01）收斂極慢；調適中（0.10）穩健走到谷底；調太大（0.50）可能跨過谷底來回震盪甚至發散。',
        epochs: '【迭代次數 (Epochs)】\n用法：全體樣本重複更新權重的總輪數（20–200）。輪數太少還沒收斂；足夠多時 GD 解會精準逼近 OLS 直接解。'
      },
      B2: {
        method: '正則化迴歸（Regularized Regression）：在 MSE 損失加上係數懲罰項，防止過擬合（Overfitting）。',
        'method:ridge': '【Ridge 迴歸 (L2 Regularization)】\n目標：min MSE + λΣwⱼ²。\n具體效果：將所有係數平滑縮小趨近於 0 但不為 0，能穩定解決特徵高度相關（多重共線性 Multicollinearity）的問題。',
        'method:lasso': '【Lasso 迴歸 (L1 Regularization)】\n目標：min MSE + λΣ|wⱼ|。\n具體效果：透過軟閾值（Soft Thresholding）將不重要特徵的係數精確壓成 0，同時達成「降變異」與「自動特徵選擇（Feature Selection）」。',
        lamIdx: '【懲罰係數 λ 刻度 (Regularization Strength λ)】\n用法：0.01（第 0 格）幾乎等於無懲罰 OLS；右移增大 λ（最高 250）會壓縮係數，Bias 略升但 Variance 大幅下降。'
      },
      B3: {
        lr: '【學習率 η (Learning Rate)】\n用法：控制每輪更新權重 (w₁, w₂, b) 的步長（0.1–2.0）。調大可讓決策邊界更快轉正並使機率更極端（接近 0 或 1）。',
        epochs: '【迭代次數 (Epochs)】\n用法：訓練總輪數（20–300）。輪數越多 Log Loss（對數損失 / Binary Cross-Entropy）越低，但過多可能對邊界雜訊過度自信。',
        threshold: '【判定門檻 (Decision Threshold)】\n用法：預測 p ≥ threshold 判為陽性（預設 0.50）。\n實務調整：疾病篩檢怕漏診（降低偽陰性 FN）可調低至 0.30–0.40；怕誤報浪費醫療資源（降低偽陽性 FP）可調高至 0.65–0.75。'
      },
      B4: {
        k: '【鄰居數 K (Number of Neighbors)】\n用法：取距離最近的 K 位病人投票（1–9）。\nK=1 邊界極鋸齒、易受單一異常點誤導；K 越大邊界越平滑；二分類建議選奇數避免平手。',
        scale: '【先標準化 (Z-score Standardization)】\n用法：開啟後先將年齡與血糖縮放成平均 0、標準差 1。若關閉，血糖數字跨度（約 70–200）遠大於年齡，距離幾乎全由血糖主導。',
        qAge: '【新病人年齡 (Query Age)】\n用法：拖曳改變待測新病人（星號）的年齡，觀察最近 K 位鄰居與背景判定區域（Decision Regions）的切換。',
        qGlu: '【新病人空腹血糖 (Query Fasting Glucose)】\n用法：拖曳改變待測新病人的血糖值（mg/dL），實測模型在不同血糖水準下的預測信心 P(是)。'
      },
      B5: {
        laplace: '【Laplace 平滑 α (Laplace / Additive Smoothing)】\n公式：(次數 + α) / (類別數 + 2α)。\n用法：設 α=0 時，若某特徵組合在訓練集出現 0 次，會導致機率變 0 而使整條連乘歸零（Zero-Frequency Problem）；預設 α=1 可徹底避免。',
        qAgeHigh: '【新病人：年齡 ≥ 55 (Age ≥ 55)】\n用法：切換新病人的年齡離散條件（高／正常），觀察單一條件改變如何透過貝氏定理（Bayes\' Theorem）更新後驗機率（Posterior Probability）。',
        qBmiHigh: '【新病人：BMI ≥ 26】\n用法：切換新病人的 BMI 條件，對比樸素貝氏（Naive Bayes）假設「各特徵條件獨立（Conditional Independence）」的乘法機制。',
        qGluHigh: '【新病人：血糖 ≥ 110 (Fasting Glucose ≥ 110)】\n用法：切換新病人的血糖條件；在糖尿病資料中血糖似然比（Likelihood Ratio）差異最大，對後驗機率影響最顯著。'
      },
      B6: {
        criterion: '【不純度指標 (Impurity Criterion)】\n決定決策樹挑選分裂特徵與切點的評估標準。',
        'criterion:gini': '【Gini 不純度 (Gini Impurity)】\n公式：1 − (p₀² + p₁²)，代表隨機抽樣猜錯類別的期望機率。\n適用：CART 演算法預設，免算對數、速度快，多數情況結果與 Entropy 幾乎一致。',
        'criterion:entropy': '【資訊增益 (Information Gain / Entropy)】\n公式：H = −Σpᵢ log₂ pᵢ，分裂前後的熵減量。\n適用：ID3 / C4.5 常用，對節點純度極端變化略更敏感。',
        max_depth: '【最大深度 (Max Depth)】\n用法：限制樹最多長幾層（1–3）。深度=1 只有一個決策樹樁（Decision Stump）；深度越大切割矩形越細，越容易過擬合。',
        min_leaf: '【葉節點最少筆數 (Min Samples Leaf)】\n用法：預剪枝（Pre-pruning）參數。若分裂後任一子節點少於此人數則放棄切分，可避免為 1–2 個特例硬切規則。'
      },
      B7: {
        trees: '【樹的棵數 T (Number of Trees, n_estimators)】\n用法：訓練幾棵獨立決策樹進行多數決投票（3–9）。樹越多，整體預測變異數（Variance）越低、袋外（OOB）表現越穩定。',
        mtry: '【每節點候選特徵數 mtry (Max Features)】\n用法：每次分裂只從隨機抽出的 mtry 個特徵中挑最佳切點（分類常用 √p ≈ 2）。\nmtry 越小各樹越不相關（多樣性高）；設太大則每棵樹容易都先挑同一強特徵。',
        depth: '【最大深度 (Max Depth)】\n用法：限制單棵樹深度（1–2）。隨機森林透過「多棵低相關樹平均」抑制過擬合，單樹通常不需過度剪枝。'
      },
      B8: {
        rounds: '【訓練輪數 T (Boosting Rounds)】\n用法：依序串接幾棵單一切點決策樹樁（Decision Stump, 1–6 輪）。\n每多一輪會放大前一輪答錯樣本的權重 wᵢ，迫使下一棵樹樁專心補救難例；輪數過多可能過擬合離群雜訊。'
      },
      B9: {
        trees: '【樹的棵數 T (Number of Boosting Stages)】\n用法：依序接力擬合前輪「殘差（Residual = y − F）」的小樹數量（1–8）。每多一棵樹，階梯預測線就更貼近資料、訓練 MSE 嚴格下降。',
        lr: '【學習率／收縮率 η (Learning Rate / Shrinkage)】\n用法：每棵新樹貢獻只乘上 η（0.1–1.0）。實務常用「較小學習率（如 0.1–0.3）＋較多棵樹」，泛化誤差通常明顯優於 η=1.0。'
      },
      B10: {
        C: '【懲罰參數 C (Regularization / Soft-Margin Parameter)】\n控制「最大化間隔（Margin）」與「懲罰誤分類（Misclassification）」之間的權衡。',
        'C:0.1': '【C = 0.1（寬鬆軟間隔 Soft Margin）】\n效果：容許少數邊界點落在間隔內甚至分錯，換取最寬的安全道路與較多支持向量（Support Vectors），抗雜訊能力最佳。',
        'C:1': '【C = 1（標準預設平衡）】\n效果：在間隔寬度與分類錯誤之間取得均衡，是實務訓練 SVM 最常用的起手基準值。',
        'C:10': '【C = 10（嚴格分類）】\n效果：對誤分類給予 10 倍懲罰，決策邊界會明顯收窄間隔以盡量分對所有訓練點。',
        'C:100': '【C = 100（趨近硬間隔 Hard Margin）】\n效果：極度不容許訓練集誤差，邊界會被少數邊界點強力牽引，容易在含雜訊資料上過擬合。',
        kernel: '【核函數 (Kernel Function)】\n透過 Kernel Trick 決定決策邊界的幾何形狀。',
        'kernel:linear': '【線性核 (Linear Kernel)】\n公式：K(x, x\') = xᵀx\'，直接在原空間切出直線超平面。\n適用：特徵維度高（如文本分類）或資料線性可分時，速度快且不易過擬合。',
        'kernel:rbf': '【RBF 高斯核 (Radial Basis Function Kernel)】\n公式：K(x, x\') = exp(−γ‖x−x\'‖²)，隱式映射到無限維空間。\n適用：兩類別呈非線性包圍或交錯分佈，可切出彎曲封閉邊界。'
      },
      B11: {
        degree: '【多項式階數 d (Polynomial Degree)】\n用法：展開 z¹, z², …, zᵈ（1–7 階）。d=1 為直線（易欠擬合）；d=2–3 貼合真實彎曲趨勢；d≥5 自由度過高開始追逐雜訊而過擬合。',
        showVal: '【顯示驗證點 (Show Validation Set)】\n用法：切換是否顯示 4 筆未參與擬合的驗證點（黃色菱形），直觀對比曲線在未見資料上的誤差。'
      },
      B12: {
        method: '【集成方式 (Ensemble Method)】\n選擇結合 Logistic、決策樹與 3-NN 三個基模型的策略。',
        'method:vote': '【Voting 投票集成】\n作法：三個模型直接多數決（硬投票）或機率平均（軟投票），不需額外訓練第二層模型。',
        'method:stack': '【Stacking 堆疊集成】\n作法：把三個基模型預測機率當新特徵，訓練第二層 Meta-Learner 自動給表現較佳的模型更高權重。',
        soft: '【軟機率投票 (Soft Voting)】\n用法：僅 Voting 使用。開啟後平均三個模型的預測機率；關閉則各投 0/1 票做多數決（Hard Voting）。'
      },
      B13: {
        folds: '【折數 K-Fold (Number of Folds)】\n用法：設定交叉驗證切幾折（3–5）。K=5 代表每次 80% 訓練、20% 驗證，輪流 5 次取平均。',
        metric: '【評估指標 (Evaluation Metric)】\n選擇網格搜尋挑選最佳超參數組合的依據。',
        'metric:acc': '【正確率 (Accuracy)】\n公式：(TP + TN) / 總數。\n適用：類別比例較均衡時最直觀的整體答對率。',
        'metric:f1': '【F1 分數 (F1-Score)】\n公式：2·Precision·Recall / (Precision + Recall)。\n適用：重視陽性樣本抓得準又抓得全時（不平衡醫療資料常用）。'
      },
      C1: {
        k: '【分群數 K (Number of Clusters)】\n用法：預先指定要切成幾群（2–5）。隨著 K 增加，群內平方誤差和（SSE / Inertia）必單調下降；實務常搭配手肘法（Elbow Method）選折衷點。',
        init: '【起始中心種子 (Initialization Seed)】\n用法：切換不同的隨機初始中心。K-Means 屬局部最佳化（Local Optimum），不同初值可能收斂到不同分群結果。'
      },
      C2: {
        linkage: '【連結法 (Linkage Criterion)】\n決定凝聚式階層分群（Agglomerative Clustering）每次合併時如何定義「兩群之間的距離」。',
        'linkage:single': '【單一連結 (Single Linkage / 最近點距離)】\n定義：兩群之間最近那對點的距離。\n優缺點：能抓出彎曲或長條形群集，但極易受中間雜訊橋樑影響產生「鏈狀效應（Chaining Effect）」。',
        'linkage:complete': '【完全連結 (Complete Linkage / 最遠點距離)】\n定義：兩群之間最遠那對點的距離。\n優缺點：傾向切出直徑相近、緊實的球狀群集，但對邊緣離群值較敏感。',
        'linkage:average': '【平均連結 (Average Linkage / UPGMA)】\n定義：兩群所有跨群點對距離的平均值。\n適用：折衷單一與完全連結的極端行為，在多數臨床與生物資料最穩健。',
        cut: '【切分群數 K (Number of Clusters at Cut)】\n用法：決定在樹狀圖（Dendrogram）的哪個距離高度水平剪斷，產生 K 個群聚。'
      },
      C3: {
        eps: '【鄰域半徑 ε (Epsilon Neighborhood Radius)】\n用法：標準化空間中兩點距離 ≤ ε 才互為鄰居（0.3–1.5）。\nε 太小會讓許多點因鄰居不足變成雜訊（Noise, -1）；ε 太大會把原本分離的兩群合併成一群。',
        min_pts: '【核心點門檻 minPts (Minimum Points)】\n用法：半徑 ε 內至少要有幾點（含自己）才算核心點（Core Point, 2–5）。數值越高代表要求群集密度越高，越多邊緣點會被判定為雜訊。'
      },
      C4: {
        k: '【高斯成分數 K (Number of Gaussian Components)】\n用法：假設資料由 K 個常態分佈混合而成（2 或 3）。GMM 會為每個點算出屬於各群的後驗機率（責任值 Responsibility），屬於軟分群（Soft Clustering）。',
        init: '【起始種子 (Initialization Seed)】\n用法：切換 EM 演算法（Expectation-Maximization）的初始均值與變異數，觀察對數似然值（Log-Likelihood）的收斂過程。'
      },
      C5: {
        features: '【輸入特徵維度 (Input Dimensions)】\n選擇要對 2 維或 4 維生理指標計算共變異數矩陣（Covariance Matrix）與特徵向量（Eigenvectors）。',
        'features:2': '【兩特徵 (BMI, 空腹血糖 — 2D 幾何示意)】\n用途：在 2D 平面直接畫出第一、二主成分（PC1, PC2）正交軸與各點的垂直投影線，直觀看見重建誤差（Reconstruction Error）。',
        'features:4': '【四特徵 (年齡, BMI, 血糖, 收縮壓 — 4D 降維)】\n用途：將 4 維資料壓縮到前 K 個主成分，觀察累積解釋變異比例（Explained Variance Ratio）。',
        keep: '【保留主成分數 (n_components)】\n用法：決定留下前幾個主成分（1 或 2）。保留 1 維壓縮率最高但有投影重建誤差；保留 2 維在 2D 資料下誤差為 0。'
      },
      C6: {
        perplexity: '【Perplexity（困惑度）】\n用法：控制高維空間高斯核的局部寬度 σᵢ，可視為每個點關注的有效近鄰數（2–6）。\n太小只看極少數鄰居會讓群集碎片化；太大則失去局部聚攏效果。',
        iters: '【迭代次數 (Iterations)】\n用法：梯度下降最小化高維 Pᵢⱼ 與低維 Qᵢⱼ 之 KL 散度（Kullback-Leibler Divergence）的步數（100–400）。',
        init: '【起始種子 (Random Seed)】\n用法：切換初始 2D 嵌入座標。t-SNE 的距離比例與絕對方向不具固定意義，不同種子常得到旋轉或鏡像後的佈局，重點在「誰和誰聚在一起」。'
      },
      C7: {
        k: '【鄰居數 K (k-Nearest Neighbors)】\n用法：計算 k-距離（k-distance）與局部可達密度（LRD, Local Reachability Density）的鄰居數（2–5）。K 太小易受微群雜訊干擾，K 太大會稀釋局部密度差異。',
        target: '【觀察病人 (#) (Target Sample)】\n用法：指定要逐步追蹤 k-距離圓圈、可達距離（Reachability Distance）與 LOF 比值的病人編號（#13 為預設高 LOF 離群點）。'
      },
      C8: {
        trees: '【孤立樹數量 T (Number of Isolation Trees)】\n用法：隨機超平面切割樹的棵數（5–50）。樹越多，每個點的平均路徑長度 E(h(x)) 與異常分數（Anomaly Score）越穩定收斂。',
        target: '【觀察病人 (#) (Target Sample)】\n用法：指定要追蹤首棵樹隨機切割過程的病人編號；離群點通常只需 1–2 刀就被孤立（路徑短、異常分數接近 1）。'
      },
      C9: {
        k: '【觀察群數 K (Number of Clusters)】\n用法：切換要在散佈圖與表單細看每個點 a(i)、b(i) 與輪廓係數的 K 值（2–5）。',
        init: '【起始種子 (Initialization Seed)】\n用法：切換 K-Means 起始中心種子（1–3），觀察群數選擇指標在不同初值下是否穩定。'
      },
      C10: {
        k: '【分群數 K (Number of Clusters)】\n用法：指定要選出幾位真實病人作為 Medoid 代表中心（2–4）。',
        compare: '【對照 K-Means 平均中心 (Compare Centroids)】\n用法：開啟後在圖上顯示黃色星號（K-Means 幾何平均中心），對比 #12 離群點如何把平均中心拉偏而 Medoid 屹立不動。'
      },
      D1: {
        min_sup: '【最小支持度 (Minimum Support, min_sup)】\n定義：項目集在所有處方箋中同時出現的比例門檻（0.20–0.60）。\n調高會只留下非常常見的用藥組合（Pruning 剪枝多）；調低能挖掘罕見但可能重要的合併用藥。',
        min_conf: '【最小信賴度 (Minimum Confidence, min_conf)】\n定義：條件機率 P(B|A) = sup(A∪B) / sup(A) 的門檻（0.50–0.90）。越高代表規則「開 A 必開 B」越可靠；同時可觀察 Lift（提升度）是否 > 1。'
      },
      D2: {
        min_sup: '【最小支持度 (Minimum Support, min_sup)】\n用法：篩選頻繁單品（Frequent 1-itemsets）並決定 FP-Tree（Frequent Pattern Tree）保留哪些項目與排序，不需像 Apriori 反覆掃描產生大量候選集。'
      },
      E1: {
        query: '【查詢句 (Query Text)】\n選擇一句新護理紀錄，計算其與 6 篇既有紀錄的 TF-IDF 向量餘弦相似度（Cosine Similarity）。',
        'query:0': '【查詢：夜間下床步態不穩 (Fall Risk Query)】\n用途：測試跌倒風險（Fall Risk）詞彙檢索，觀察「夜間、步態、不穩」等高 IDF 詞如何主導相似度。',
        'query:1': '【查詢：傷口紅腫有滲液 (Wound Care Query)】\n用途：測試傷口照護（Wound Care）詞彙檢索與停用詞「有」的影響。',
        'query:2': '【查詢：主訴疼痛給予止痛藥 (Pain Query)】\n用途：測試疼痛處置（Pain Management）紀錄的匹配排名。',
        stop: '【去除停用詞 (Stopword Removal)】\n用法：開啟後移除「病人、有、給予」等在多數紀錄都出現的高頻低資訊詞，避免無關紀錄因共用常見字而得到虛高相似度。'
      },
      E2: {
        laplace: '【Laplace 平滑 α (Additive Smoothing)】\n公式：(詞在該類出現次數 + α) / (該類總詞數 + α·|V|)。\n用法：α=1 可避免測試句出現訓練集該類未見詞（Out-of-Vocabulary / Zero Count）時機率變 0。',
        query: '【測試句 (Test Document)】\n選擇要交給詞袋（Bag-of-Words）Naive Bayes 預測類別（跌倒／疼痛／壓傷）的護理短句。',
        'query:0': '【測試句：跌倒風險語境 (Fall Risk)】\n內容：「病人夜間下床步態不穩」，測試跌倒相關關鍵詞如何累積最高的對數後驗分數（Log Posterior）。',
        'query:1': '【測試句：疼痛處置語境 (Pain Management)】\n內容：「主訴傷口疼痛給予止痛藥」，其中「傷口」跨多類別出現，觀察模型如何依機率加總正確判為疼痛處置。',
        'query:2': '【測試句：壓傷感染語境 (Pressure Injury)】\n內容：「壓傷傷口紅腫有滲液」，觀察「壓傷、紅腫、滲液」對壓傷類別的高似然貢獻。'
      },
      E3: {
        win: '【滑動視窗大小 (Context Window Size ±win)】\n用法：決定中心詞左右各看幾個鄰居詞來產生 (中心詞, 上下文) 配對（1–3）。視窗小偏重局部語法搭配；視窗大偏重同主題語意關聯。',
        epochs: '【訓練輪數 (Epochs)】\n用法：重複訓練 Skip-gram＋負抽樣（Negative Sampling）的輪數（20–200），輪數越多共現詞向量越靠近。',
        lr: '【學習率 η (Learning Rate)】\n用法：每次正樣本拉近、負樣本推開時更新 2D 詞向量的步長。'
      },
      E4: {
        topics: '【主題數 K (Number of Topics)】\n用法：設定語料庫由幾個潛在主題（Latent Topics）混合（2 或 3），觀察「文件-主題」與「主題-詞」分佈的變化。',
        iters: '【Gibbs 抽樣輪數 (Gibbs Sampling Iterations)】\n用法：重複依條件機率重新指派每個詞的主題標籤（10–100 輪）。輪數越多主題聚類越收斂清晰。'
      },
      F1: {
        lr: '【學習率 η (Learning Rate)】\n用法：控制反向傳播（Backpropagation）依梯度更新 9 個參數的步長（0.1–2.0）。在本 8 筆小資料上，設 0.50 可在 50 輪內穩定降至高準確率。',
        epochs: '【訓練輪數 (Epochs)】\n用法：前向傳播（Forward）→ 算二元交叉熵（BCE Loss）→ 反向傳播更新的總輪數（10–200）。',
        init: '【起始權重種子 (Weight Initialization Seed)】\n用法：切換不同的隨機初始權重。因神經網路損失面非凸（Non-convex），不同初值會走出不同的收斂路徑。'
      },
      F2: {
        optimizer: '【目前觀察優化器 (Optimizer)】\n選擇要在左側表格與單線軌跡追蹤的演算法（最後一步會同時疊加比較三者）。',
        'optimizer:sgd': '【SGD (Stochastic Gradient Descent)】\n更新：w ← w − η·g。\n特點：在狹長山谷（w₂ 曲率是 w₁ 的 16 倍）中，若學習率稍大就會沿陡峭的 w₂ 方向劇烈震盪，平緩方向則前進緩慢。',
        'optimizer:momentum': '【Momentum 動量法】\n更新：v ← βv + g, w ← w − η·v。\n特點：累積歷史梯度速度，上下震盪互相抵消而水平方向加速衝刺，但慣性大時可能衝過谷底。',
        'optimizer:adam': '【Adam (Adaptive Moment Estimation)】\n特點：同時估計一階動量 m（方向）與二階平方梯度 s（各軸曲率縮放），為平緩方向放大步長、陡峭方向縮小步長，最能平滑直達谷底。',
        lr: '【學習率 η (Learning Rate)】\n用法：基礎步長（0.01–0.15）。調到 0.11–0.13 可清楚看見 SGD 沿 w₂ 劇烈鋸齒震盪，而 Adam 仍平滑前進。',
        steps: '【更新步數 (Optimization Steps)】\n用法：執行幾步參數更新（20–100），觀察三者誰最快收斂到谷底 (0, 0)。',
        start: '【起點座標 (Starting Point w₁, w₂)】\n選擇損失曲面上的不同出發位置。',
        'start:0': '【(-3.5, 1.2) 左上斜坡 (Top-Left Ravine Wall)】\n用途：兼顧長緩坡（w₁ = -3.5）與陡峭坡壁（w₂ = 1.2），最能對比三種優化器的差異。',
        'start:1': '【(-3.0, -1.0) 左下斜坡 (Bottom-Left Wall)】\n用途：第三象限起點，驗證負梯度方向反轉後的對稱軌跡。',
        'start:2': '【(3.2, 1.1) 右上斜坡 (Top-Right Wall)】\n用途：第一象限起點，觀察從正半軸收斂至 (0, 0) 的路徑。'
      },
      F3: {
        image: '【輸入圖形 (6×6 Input Image)】\n選擇不同幾何圖案，觀察卷積核如何偵測對應方向的空間特徵。',
        'image:0': '【直線 (Vertical Line)】\n用途：垂直明暗交界，最適合測試「垂直邊緣」卷積核產生強烈正負響應。',
        'image:1': '【橫線 (Horizontal Line)】\n用途：水平明暗交界，用來對比「水平邊緣」與「垂直邊緣」卷積核的方向選擇性。',
        'image:2': '【斜線 (Diagonal Line)】\n用途：45° 對角線邊緣，水平與垂直核皆會偵測到部分斜邊訊號。',
        'image:3': '【十字 (Cross)】\n用途：同時含垂直與水平線段，能直觀看到單一方向濾波器如何只萃取出其中一條線。',
        'image:4': '【方塊 (Square)】\n用途：封閉矩形輪廓，適合對比邊緣偵測與「模糊／銳化」濾波器的差異。',
        kernel: '【卷積核 (3×3 Convolution Kernel / Filter)】\n選擇滑動計算內積的 3×3 權重矩陣。',
        'kernel:vert': '【垂直邊緣 (Vertical Edge Filter)】\n權重左正右負，專門偵測水平方向像素突變（即垂直邊界）。',
        'kernel:horiz': '【水平邊緣 (Horizontal Edge Filter)】\n權重上正下負，專門偵測垂直方向像素突變（即水平邊界）。',
        'kernel:blur': '【模糊 (Box Blur / Averaging Filter)】\n取 3×3 區域平均，能平滑高頻雜訊、使輪廓柔和。',
        'kernel:sharp': '【銳化 (Sharpening / Laplacian Kernel)】\n中心高正權重減去四周像素，突顯邊界與細節對比。',
        padding: '【補零 (Zero Padding)】\n用法：開啟後在 6×6 外圍補一圈 0（變 8×8），使卷積輸出維持 6×6（Same Padding）且不遺失邊緣像素資訊。',
        pool: '【池化方式 (2×2 Pooling / Downsampling)】\n決定如何壓縮特徵圖尺寸並保留主要特徵。',
        'pool:max': '【最大池化 (Max Pooling)】\n取 2×2 區塊最大值，最能保留強烈的邊緣與紋理特徵，並提供局部平移不變性（Translation Invariance）。',
        'pool:avg': '【平均池化 (Average Pooling)】\n取 2×2 區塊平均值，保留背景平均強度但會稀釋尖銳邊緣響應。'
      },
      F4: {
        cell: '【循環神經網路單元 (Recurrent Cell Type)】\n比較無記憶閘門與有長期記憶閘門的序列處理機制。',
        'cell:rnn': '【標準 RNN (Vanilla Recurrent Neural Network)】\n公式：hₜ = tanh(W·xₜ + U·hₜ₋₁ + b)。\n限制：每步直接覆寫隱藏狀態，序列較長時容易發生梯度消失（Vanishing Gradient）而忘記早期輸入。',
        'cell:lstm': '【LSTM (Long Short-Term Memory)】\n機制：透過遺忘閘（Forget Gate f）、輸入閘（Input Gate i）、輸出閘（Output Gate o）調控細胞狀態 Cₜ（記憶高速公路）。\n適用：需跨越較多時間步保留關鍵歷史訊號的序列預測。',
        init: '【權重種子 (Weight Seed)】\n用法：切換不同的預設隨機權重矩陣，觀察各時間步的閘門開合比例（0–1）與預測急診人次變化。'
      },
      F5: {
        epochs: '【訓練輪數 (Epochs)】\n用法：自編碼器學習「壓縮成 1 維瓶頸（Bottleneck）再重建回 3 維」的輪數（50–500）。輪數越多，正常樣本重建誤差越低，與離群點 #13 的差距越明顯。',
        lr: '【學習率 η (Learning Rate)】\n用法：編碼器（Encoder）與解碼器（Decoder）權重的梯度下降步長（0.01–0.20）。',
        init: '【起始種子 (Initialization Seed)】\n用法：切換初始瓶頸權重方向，驗證模型在不同初值下是否都能抓出違背生理相關性的 #13 號異常點。'
      },
      G1: {
        method: '指數平滑法（Exponential Smoothing）：依時間序列結構選擇對應平滑模型。',
        'method:ses': '【簡單指數平滑 (Simple Exponential Smoothing, SES)】\n追蹤：僅水準 Lₜ（Level）。\n適用：無長期上升/下降趨勢、無週期波動的平穩序列；未來多期預測皆為水平線。',
        'method:holt': '【Holt 線性趨勢法 (Holt\'s Linear Trend)】\n追蹤：水準 Lₜ + 趨勢 bₜ（Trend）。\n適用：具明顯上升或下降趨勢、但無固定季節波動的序列；預測呈斜直線延伸。',
        'method:hw': '【Holt-Winters 三重指數平滑 (Additive Holt-Winters)】\n追蹤：水準 Lₜ + 趨勢 bₜ + 季節性 sₜ（Seasonality）。\n適用：同時有趨勢與固定週期（如每 7 天急診就診高峰）的時間序列。',
        alpha: '【水準平滑係數 α (Level Smoothing)】\n用法：0.05–0.95。α 越大越信任最新觀測值（反應快但易追隨雜訊）；α 越小越依賴歷史平滑值。',
        beta: '【趨勢平滑係數 β (Trend Smoothing)】\n用法：僅 Holt / Holt-Winters 使用，控制斜率趨勢更新的靈敏度（0.05–0.95）。',
        gamma: '【季節平滑係數 γ (Seasonal Smoothing)】\n用法：僅 Holt-Winters 使用，控制週期起伏因子 sₜ 更新的速度（0.05–0.95）。',
        horizon: '【預測期數 (Forecast Horizon)】\n用法：設定往未來預測幾期（1–12），觀察不同方法在多步預測下的走勢差異。'
      },
      G2: {
        d: '【差分階數 d (Differencing Order)】\n用法：d=0 直接對原始序列建 AR 模型；d=1 先做一階差分（yₜ − yₜ₋₁）去除線性趨勢使序列平穩（Stationary），預測後再累加還原。',
        p: '【自迴歸階數 p (Autoregressive Order AR(p))】\n用法：用過去 p 期的落後值線性組合預測當期（p=1 看前 1 期；p=2 看前 2 期，能捕捉週期震盪）。',
        horizon: '【預測期數 (Forecast Horizon)】\n用法：設定往未來遞迴預測幾期（1–12）；當期預測值會成為下一期的歷史輸入。'
      },
      H1: {
        merges: '【合併次數 (BPE Merge Operations)】\n用法：設定 Byte Pair Encoding 從單一字元出發要執行幾輪「最高頻相鄰配對合併」（1–12）。\n合併越多，詞表（Vocabulary）包含越長的高頻詞根，序列切分出的 Token 數越少。'
      },
      H2: {
        sentence: '【輸入句子 (Input Sentence)】\n選擇不同醫療短句，觀察每個詞彙如何查表取得 4 維詞嵌入（Word Embedding）並加上正餘弦位置編碼（Sinusoidal Positional Encoding）。',
        'sentence:0': '【句子 1：病人夜間下床步態不穩】\n用途：觀察 6 個連續詞彙的位置向量 PE(pos) 如何隨位置變化並與詞嵌入相加。',
        'sentence:1': '【句子 2：傷口紅腫滲液伴隨發燒】\n用途：對比不同語意詞嵌入在相同位置編碼矩陣下的加法結果。'
      },
      H3: {
        queryIdx: '【觀察詞位置 (Query Token Index)】\n用法：指定要以第幾個詞作為 Query（Q），查看它與句中所有 Key（K）計算縮放點積注意力（Scaled Dot-Product Attention）的權重分佈。',
        mask: '【因果遮罩 (Causal / Look-Ahead Mask)】\n用法：開啟後將未來位置（j > i）的分數設為 −∞（Softmax 後變 0），模擬 GPT 等自回歸語言模型（Autoregressive LLM）生成時只能看前面字。',
        heads: '【注意力頭 (Attention Head)】\n切換不同投影權重（W_Q, W_K, W_V）以觀察多頭注意力（Multi-Head Attention）的視角差異。',
        'heads:1': '【第 1 注意力頭 (Head 1)】\n用途：使用第 1 組 Q/K/V 投影矩陣，觀察其學到的詞間關注權重。',
        'heads:2': '【第 2 注意力頭 (Head 2)】\n用途：使用第 2 組 Q/K/V 投影矩陣，對比不同頭可同時捕捉不同層面的語意依賴。'
      },
      H4: {
        queryIdx: '【追蹤詞位置 (Tracked Token Index)】\n用法：指定要追蹤哪一個詞通過完整 Transformer 編碼層（Self-Attention → Residual＋LayerNorm → FFN → Residual＋LayerNorm）的 4 維向量數值變化。'
      },
      H5: {
        strategy: '【解碼策略 (Decoding Strategy)】\n決定大型語言模型（LLM）如何從詞表機率分佈挑選下一個輸出 Token。',
        'strategy:greedy': '【Greedy 貪婪解碼 (Greedy Decoding)】\n作法：每步永遠挑選機率最高的詞（argmax）。\n適用：事實問答、程式碼生成、摘要等追求確定與一致的任務；缺點是容易產生重複單調句。',
        'strategy:sample': '【抽樣解碼 (Stochastic Sampling)】\n作法：依 Temperature 調整並經 Top-k / Top-p 過濾重正規化後隨機抽取。\n適用：創意寫作、開放對話等需要豐富變化與多樣性的生成任務。',
        temperature: '【Temperature 溫度 (T)】\n公式：softmax(logits / T)。\nT < 1（如 0.3）讓高機率詞更集中保守；T = 1 維持原分佈；T > 1（如 1.5）拉平機率、增加隨機創意但也較易離題。',
        top_k: '【Top-k 過濾 (Top-k Filtering)】\n用法：每步只保留機率前 K 高的候選詞，其餘直接歸零，防止抽到極低機率的無關字詞。',
        top_p: '【Top-p 核抽樣 (Nucleus Sampling)】\n用法：依機率由高到低累加，只保留累積機率剛好達 p（如 0.90）的最小詞集合；能依上下文確定度動態調整候選詞數量。',
        seed: '【抽樣種子 (Sampling Seed)】\n用法：切換亂數種子（1–5），在相同參數下實測抽樣解碼產生的不同生成詞序列。'
      },
      H6: {
        chunk: '【切塊方式 (Document Chunking)】\n決定如何將長照衛教文件切成檢索單元（Chunks）。',
        'chunk:sent': '【依句切塊 (Sentence Chunking, 8 段)】\n特點：段落短而精準，單句關鍵詞密度高（BM25 / 向量得分集中），但可能缺少前後句背景說明。',
        'chunk:para': '【依段切塊 (Paragraph Chunking, 6 段)】\n特點：保留完整脈絡與跨句條件，但若段落包含多個議題可能略微稀釋單句匹配分數。',
        top_k: '【取前 K 段 (Top-k Retrieved Chunks)】\n用法：決定最後取出幾段放進 LLM 提示詞（Context Window）。K 太小可能漏掉例外條款；K 太大會增加推論延遲與無關干擾。',
        method: '【檢索方法 (Retrieval Method)】\n選擇比對問題與段落相關性的排序演算法。',
        'method:bm25': '【BM25 關鍵字檢索 (Best Matching 25)】\n作法：基於詞頻飽和與文件長度正規化的字面比對。\n優缺點：精準命中「外籍看護、輔具」等專有名詞，但抓不到同義詞。',
        'method:vec': '【向量檢索 (Dense/TF-IDF Vector Cosine Similarity)】\n作法：計算詞向量空間餘弦相似度（本實驗以 TF-IDF 代替語意 Embedding 以便手算）。\n優點：能捕捉多詞重疊與語意關聯。',
        'method:hybrid': '【混合檢索 (Hybrid Retrieval + RRF 倒數名次融合)】\n公式：RRF = 1/(60+rank_BM25) + 1/(60+rank_Vec)。\n適用：實務 RAG 系統首選，同時保留精確關鍵字與語意相似度優勢。'
      },
      H7: {
        rank: '【低秩秩數 r (LoRA Rank r)】\n作法：將 4×4 微調增量 ΔW 分解為 (4×r) × (r×4)（即 B·A）。\nr=1 參數從 16 降為 8（省 50%）；r 越大可學更複雜任務調整，但參數量與記憶體需求上升。',
        epochs: '【訓練輪數 (Epochs)】\n用法：凍結原始預訓練權重 W₀，只對低秩配接器（Adapter）A 與 B 做梯度下降的輪數（20–200）。',
        lr: '【學習率 η (Learning Rate)】\n用法：更新低秩矩陣 A、B 參數的步長（0.01–0.20）。'
      },
      I1: {
        target: '【解釋病人 (#) (Target Sample)】\n用法：選擇要進行局部解釋（Local Explanation）的病人編號，查看每個特徵如何將預測從基準平均（Base Value）推向最終輸出，並對照全域排列重要度（Permutation Importance）。'
      },
      J1: {
        alpha: '【學習率 α (Learning Rate)】\n公式：Q(s,a) ← Q(s,a) + α·[r + γ·max Q(s\',a\') − Q(s,a)]。\n用法：α 越大越快覆寫舊估計（適合確定性環境）；α 較小更新較平緩抗隨機波動。',
        gamma: '【折扣因子 γ (Discount Factor)】\n用法：衡量未來獎勵相對於眼前獎勵的權重（0.50–0.99）。接近 1 代表重視長期回報，會選擇繞過 −5 陷阱去拿 +10 終點獎勵。',
        epsilon: '【探索率 ε (Epsilon-Greedy Exploration)】\n用法：每步有 ε 機率隨機選動作探索新路徑，(1−ε) 機率選目前最大 Q 值動作（利用 Exploitation）。ε=0 純貪婪易卡在次佳解。',
        episodes: '【訓練回合數 (Episodes)】\n用法：智能體從起點 (0,0) 出發直到抵達終點或觸發陷阱結束的總嘗試回合數（10–200），回合越多 Q-Table 越收斂至最優路徑。'
      }
    };
    const pctl = {};
    const expTips = TIPS[def.id] || {};
    const EN_UI = {
      '補值方法': 'Imputation Method', '平均數': 'Mean', '中位數': 'Median',
      '縮放方法': 'Scaling Method', 'Z 分數': 'Z-score',
      '切分方法': 'Binning Method', '等寬': 'Equal-Width', '等頻': 'Equal-Freq', '依熵': 'Entropy', '區間數': 'Bins',
      '編碼方式': 'Encoding', '目標編碼': 'Target', '平滑強度 m': 'Smoothing m',
      '平衡方法': 'Resampling', '隨機過抽樣': 'Oversample', '隨機欠抽樣': 'Undersample', 'SMOTE 鄰居數 K': 'SMOTE K', '目標陽性比例': 'Target Ratio',
      '選擇方法': 'Selection Method', '相關係數': 'Correlation', '資訊增益': 'Info Gain', '向前選擇': 'Forward', '目標特徵數': 'Top-K',
      '求解方式': 'Solver', '最小平方法直接解': 'OLS', '梯度下降': 'Gradient Descent',
      '學習率 η': 'Learning Rate', '迭代次數': 'Epochs', '正則化方法': 'Regularization', 'λ 刻度 (12 格對數)': 'λ Scale',
      '判定門檻': 'Threshold', '鄰居數': 'Neighbors', '先標準化': 'Standardize',
      '不純度指標': 'Criterion', '最大深度': 'Max Depth', '葉節點最少筆數': 'Min Leaf',
      '樹的棵數': 'Trees', '樹的棵數 T': 'Trees T', '訓練輪數 T': 'Rounds T', '訓練輪數': 'Epochs',
      '懲罰參數 C': 'Penalty C', '核函數 Kernel': 'Kernel', '目標編碼': 'Target',
      '連結法 Linkage': 'Linkage', '單一 (最近)': 'Single', '完全 (最遠)': 'Complete', '平均 (UPGMA)': 'Average', '切分群數 K': 'Clusters K',
      '鄰域半徑 ε': 'Radius ε', '核心門檻 minPts': 'minPts', '群數 K': 'Components K', '起始種子': 'Seed',
      '特徵數': 'Features', '保留主成分數': 'Components', '鄰居數 K': 'Neighbors K', '孤立樹數量 T': 'Trees T',
      '最小支持度 min_sup': 'Min Support', '最小信賴度 min_conf': 'Min Confidence',
      '去除停用詞': 'Stopwords', '視窗大小': 'Window', '主題數 K': 'Topics K', 'Gibbs 迭代輪數': 'Gibbs Iters',
      '輸入圖形': 'Image', '直線': 'Vertical', '橫線': 'Horizontal', '斜線': 'Diagonal', '十字': 'Cross', '方塊': 'Square',
      '卷積核': 'Kernel', '垂直邊緣': 'Vert Edge', '水平邊緣': 'Horiz Edge', '模糊': 'Blur', '銳化': 'Sharpen',
      '循環單元': 'RNN Cell', '平滑方法': 'Smoothing', '簡單 (SES)': 'SES', 'Holt (趨勢)': 'Holt',
      '水準平滑 α': 'Level α', '趨勢平滑 β': 'Trend β', '季節平滑 γ': 'Season γ', '預測期數': 'Horizon',
      '差分階數 d': 'Diff d', '自迴歸階數 p': 'AR Order p', '合併次數': 'Merges',
      '觀察詞位置': 'Query Pos', '因果遮罩': 'Causal Mask', '顯示頭數': 'Head', '追蹤詞位置': 'Track Pos',
      '解碼策略': 'Decoding', '抽樣 (Sampling)': 'Sampling', '切塊方式': 'Chunking', '依句 (8段)': 'Sentence', '依段 (6段)': 'Paragraph',
      '取前 K 段': 'Top-K', '檢索方式': 'Retriever', '向量 (TF-IDF)': 'Vector', '混合 (RRF)': 'Hybrid RRF',
      '學習率 α': 'Alpha α', '折扣因子 γ': 'Gamma γ', '探索率 ε': 'Epsilon ε', '訓練回合數': 'Episodes',
      '多項式階數 d': 'Degree d', '顯示驗證點': 'Validation Set', '集成方式': 'Ensemble', '軟機率投票': 'Soft Voting',
      '折數 K-Fold': 'Folds', '評估指標': 'Metric', '觀察群數 K': 'Clusters K', '分群數 K': 'Clusters K', '對照 K-Means 平均中心': 'Compare K-Means'
    };
    const ACTIVE_IF = {
      'A1.k': ps => ps.method === 'knn',
      'A4.smoothing': ps => ps.method === 'target',
      'A5.k': ps => ps.method === 'smote',
      'B12.soft': ps => ps.method === 'vote',
      'G1.beta': ps => ps.method !== 'ses',
      'G1.gamma': ps => ps.method === 'hw',
      'H5.temperature': ps => ps.strategy === 'sample',
      'H5.top_k': ps => ps.strategy === 'sample',
      'H5.top_p': ps => ps.strategy === 'sample',
      'H5.seed': ps => ps.strategy === 'sample'
    };
    const withEn = s => (EN_UI[s] && !s.includes(EN_UI[s])) ? s + ' (' + EN_UI[s] + ')' : s;
    function buildParams() {
      elParams.textContent = ''; let lastG = null;
      def.params.forEach(p => {
        if (p.group && p.group !== lastG) elParams.append(h('span', { class: 'tag amber' }, p.group)); lastG = p.group || null;
        const pTip = p.tip || expTips[p.key] || null;
        const lbl = h('span', { class: 'p-lbl', 'data-tip': pTip }, withEn(p.label));
        const box = h('label', { class: 'p' }, lbl);
        const cond = ACTIVE_IF[def.id + '.' + p.key];
        const updVis = () => { if (cond) box.classList.toggle('is-off', !cond(S.params)); };
        if (p.type === 'bool') { const b = h('button', { class: 'btn sm', type: 'button', 'data-tip': pTip, onclick: () => { S.params[p.key] = !S.params[p.key]; syncParams(); recompute(); } }); box.append(b); pctl[p.key] = () => { b.textContent = S.params[p.key] ? '開' : '關'; b.classList.toggle('on', !!S.params[p.key]); updVis(); }; }
        else if (p.type === 'choice') { const sg = h('div', { class: 'seg' }); p.options.forEach(o => sg.append(h('button', { type: 'button', 'data-v': String(o.v), 'data-tip': o.tip || expTips[p.key + ':' + o.v] || pTip, onclick: () => { S.params[p.key] = o.v; syncParams(); recompute(); } }, withEn(o.label)))); box.append(sg); pctl[p.key] = () => { sg.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === String(S.params[p.key]))); updVis(); }; }
        else { const d = p.digits != null ? p.digits : (String(p.step || 1).split('.')[1] || '').length; const val = h('b'); const inp = h('input', { type: 'range', min: p.min, max: p.max, step: p.step || 1, 'data-tip': pTip, oninput: e => { S.params[p.key] = +e.target.value; val.textContent = LAB.f(S.params[p.key], d) + (p.unit ? ' ' + p.unit : ''); recompute(); } }); box.append(inp, val); pctl[p.key] = () => { inp.value = S.params[p.key]; val.textContent = LAB.f(S.params[p.key], d) + (p.unit ? ' ' + p.unit : ''); updVis(); }; }
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
