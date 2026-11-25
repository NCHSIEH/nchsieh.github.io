/* M4 互動站強化（2026-11-25）：講義第 4、5、15、18、19、22、25、27、28、34、41、48、49、54、55、58、59、63、66、69、70、87–88 頁實證數據與文獻連結同步 */
(function () {
  'use strict';
  const $ = U.$;
  const U_GFT     = 'https://doi.org/10.1126/science.1248506';
  const U_TABULAR = 'https://arxiv.org/abs/2207.08815';
  const U_TABPFN  = 'https://www.nature.com/articles/s41586-024-08328-6';
  const U_XGB     = 'https://arxiv.org/abs/1603.02754';
  const U_IF      = 'https://cs.nju.edu.cn/zhouzh/zhouzh.files/publication/icdm08b.pdf';
  const U_CAL     = 'https://scikit-learn.org/stable/modules/calibration.html';

  CaseW($('#w-ceil'), { tabs: [
    { id: 'c', label: '四個天花板與破局', cards: [
      ['① 結構與穩定度極限（高變異 vs 高偏誤）', '深決策樹換批資料就改寫、邏輯斯迴歸畫不出高階交互邊界。乳癌 WDBC（N=569）10-fold 實測：單棵深樹準確率 92.3%，改用 Bagging 25 棵樹立即提升至 96.3%！', 'PART 01–02：集成學習'],
      ['② 標籤稀缺或無標籤（罕見故障／新異常）', 'ICU 生理訊號突變、鍋爐感測器故障、新型異常申報往往只有 10 萬筆正常紀錄與極少數確診標籤。改抓「偏離正常分佈／短路徑孤立」的前 N 名交專家覆核。', 'PART 03：異常偵測'],
      ['③ 是「發現共現組合」而非預測單一 Y', '「哪些慢性病常同時出現？」「哪些藥常一起開？」沒有特定目標欄 Y，改用 FP-Growth 以 Support、Confidence、Lift (>1.2) 挖出高價值組合。', 'PART 04：關聯規則'],
      ['④ 資料具時間順序，嚴禁隨機洗牌切分', '急診每日人次、耗用量前後高度自相關；隨機切分等於「偷看明天猜昨天」。必須造出滯後特徵（Lag / MA / 連假）並採 Walk-Forward 滾動驗證。', 'PART 05：時間序列']],
      note: '加上 PART 06（Platt / Isotonic 機率校準＋代價敏感門檻 p*），完成監督式學習從分數到臨床決策的最後一哩路。' },
    { id: 'q', label: '判斷', quiz: [
      { t: '想知道「哪些診斷常同時出現」。沒有要預測的欄位。用哪一支？', o: ['集成', '關聯規則', '時間序列'], a: 1, w: '沒有 Y、要找「常一起出現」，是關聯規則。' },
      { t: '手上只有 12 筆已確認的設備故障，和 10 萬筆正常紀錄。第一個想到的做法？', o: ['監督式分類，直接訓練', '異常偵測，把異常當作少見的點篩出前 N 名覆核'], a: 1, w: '標註稀少時，先用異常偵測縮小專家檢視範圍並累積未來標籤。' }] }
  ], src: '講義 M4 第 4、5 頁。' });

  CaseW($('#w-adprinc'), { tabs: [
    { id: 'p', label: '三個原則', cards: [
      ['① 縮小範圍的工具，不是自動判定', '從 10 萬筆縮到 200 筆讓專家看，價值就很大。不必追求取代人，責任上也不該這樣設計；在醫療場域這個定位還能降低法規與責任風險。', ''],
      ['② 門檻由人力可負荷量決定', '專家一天能看 50 筆，門檻就設在每天約 50 筆（Precision@50）。太嚴會漏掉問題，太鬆沒人看、系統形同虛設。', '第 11 節互動'],
      ['③ 留回饋迴路（異常偵測 → 監督分類）', '專家覆核結果回寫成標註，半年累積上千筆真實標籤後，就能升級為監督式 GBDT 分類模型。', '']],
      note: '異常偵測的價值在於讓人把有限的注意力放對地方。' },
    { id: 'q', label: '判斷', quiz: [
      { t: '覆核專家一天只看得完 40 筆，但演算法一天標出 400 筆。你怎麼辦？', o: ['維持現狀，全部標出', '把門檻調到每天約 40 筆，或分級處理'], a: 1, w: '門檻由人力可負荷量決定。' }] }
  ], src: '講義 M4 第 39、41 頁。' });

  CaseW($('#w-armis'), { tabs: [
    { id: 'a', label: '六個醫護應用', cards: [
      ['處方組合分析', '交易＝一次就診／一張處方；品項＝開立的藥品。發現常見用藥組合與潛在交互作用風險。', ''],
      ['共病分析', '交易＝一位病人（跨就診歸戶）；品項＝診斷碼（ICD）。注意是「一位病人」而非「一次就診」，單位定義錯了整個分析就沒意義。', ''],
      ['檢驗開單模式', '交易＝一次就診；品項＝檢驗項目。看是否有不必要的重複開單。', ''],
      ['衛材耗用', '交易＝一台手術；品項＝使用的衛材。備料組合最佳化。', ''],
      ['症狀組合', '交易＝一次諮詢；品項＝主訴症狀。作為分診規則參考。', ''],
      ['照護活動', '交易＝一個班別；品項＝執行的護理活動。看工作流程的實際樣態。', '']],
      note: '先決定「一筆交易」是什麼，再開始算。' },
    { id: 'm', label: '三個常見誤用', cards: [
      ['① 把關聯當成因果（Confounding）', '「開 NSAIDs 止痛藥 → 開胃藥 PPI」（Lift = 3.2）不代表吃止痛藥吃出胃病，實情常是醫師「預防性順手開胃藥」的處方習慣，或高齡共病驅動。', ''],
      ['② 支持度門檻設太低（雜訊爆炸）', '設 0.0005 會跑出幾萬條只出現 2 次的巧合規則。起手準則：Support >= 0.01（1% 交易）且 Lift >= 1.2，把規則控制在專家讀得完的 30–100 條。', ''],
      ['③ 忽略品項粒度與交易單位', '用藥品商品名太細碎（跑不出規則）、用大科別太粗（全是廢話）。實務折衷：藥品改用「學名／成分」或「ATC 第 3–4 階層」。', '']],
      note: '複習第 45 頁 Lift 陷阱：85% 住院病人都開生理食鹽水（B），任何 A → B 的 Confidence 都超過 80%，但 Lift < 1！永遠先篩 Lift > 1.2。' },
    { id: 'q', label: '判斷', quiz: [
      { t: '共病分析的「一筆交易」應該是？', o: ['一次就診', '一位病人（跨就診歸戶）'], a: 1, w: '共病要看同一個人身上同時有哪些慢性診斷，交易單位必須是病人。' }] }
  ], src: '講義 M4 第 48、49 頁。' });

  CaseW($('#w-tsfive'), { tabs: [
    { id: 'd', label: '五個差異', cards: [
      ['① 切分方式', '一般監督式：隨機切分。時間序列：嚴格依時間切（訓練在過去、測試在未來），否則驗證分數虛高、上線即崩。', ''],
      ['② 交叉驗證', '一般：K-Fold。時間序列：Walk-forward 滾動視窗（測試集永遠在訓練集之後）。', '第 14 節互動'],
      ['③ 樣本獨立性', '一般假設各筆獨立；時間序列前後高度相關（自相關 Autocorrelation），標準誤估計會錯。', ''],
      ['④ 特徵來源（主戰場）', '一般用現有欄位；時間序列必須自己造：滯後項（lag_1 昨天、lag_7 上週同日）、移動平均（ma_3）、星期幾（dow）與連假（is_holiday）。', '第 15 節互動'],
      ['⑤ 評估重點', '一般看整體準確率；時間序列還要看「往未來預測多遠（Horizon）」仍準，且必須先贏過簡單基準線。', '']],
      note: '時間序列的特徵工程比模型選擇重要得多（講義第 54、55 頁）。' },
    { id: 'r', label: '三個實務提醒與防洩漏', cards: [
      ['① 先問真的需要預測嗎', '很多時候管理者要的是「解釋過去」。趨勢＋季節分解圖加同期比較往往比單一預測值有用；誤差 ±15% 的模型在排班上可能用不上。', ''],
      ['② 基準線一定要先建立', '最簡單：「明天＝今天（Naive）」；季節性：「這週三＝上週三（lag_7）」。複雜模型贏不過這兩個就別上線！', ''],
      ['③ 外部事件與三大防洩漏鐵律', '台灣春節與連假急診量常暴增至平日 2 倍，必放 is_holiday！防洩漏鐵律：刪前段空值列、禁放當日才結算的欄位（如當日住院數）、移動平均不可含今日 y_t。', '']],
      note: '完整方法（ARIMA、Prophet、LSTM）超出本課程，目標是不犯時間穿越與洩漏的致命錯誤。' },
    { id: 'q', label: '判斷', quiz: [
      { t: '你的深度學習模型預測急診人次的誤差，比「這週三＝上週三」還大。你該？', o: ['繼續調神經網路，它比較先進', '先用季節性基準線；複雜模型沒贏過基準就不要上線'], a: 1, w: '贏不過簡單基準線的複雜模型沒有部署價值。' }] }
  ], src: '講義 M4 第 54、55、58 頁。' });

  function addNote(id, title, bullets) {
    const b = document.getElementById(id); if (!b || !b.parentNode) return;
    const list = Array.isArray(bullets)
      ? U.h('ul', { style: { margin: '6px 0 0', paddingLeft: '18px', fontSize: '13.5px', lineHeight: 1.6 } }, bullets.map(t => U.h('li', null, t)))
      : U.h('div', { style: { marginTop: '6px', fontSize: '13.5px', lineHeight: 1.6 } }, bullets);
    b.parentNode.append(U.h('details', { class: 'details-note' }, U.h('summary', null, title), list));
  }

  addNote('w-div', '實算：每個成員 65% 準，多數決能到多少？（講義 M4 第 11 頁）', [
    '彼此獨立時：1 個 65.0%、5 個 76.5%、11 個 85.1%、25 個 94.0%（二項分布實算）。',
    '完全相關時：再多成員都還是 65%——集成的增益全部來自「錯得不一樣」。'
  ]);

  addNote('w-boot', '實際抽一次：10 筆有放回抽 10 次（講義 M4 第 16 頁）', [
    '範例結果：抽到 #4、#10、#9、#3、#6、#10、#8、#10、#2、#10。',
    '其中 #1、#5、#7 一次都沒抽到（30%，成為這棵樹的 OOB 袋外樣本），#10 被抽 4 次。',
    '理論值：n=10 時約 34.9%；n→∞ 時收斂至 1/e ≈ 36.8%。'
  ]);

  addNote('w-bag', 'Bagging 家族三姊妹與乳癌 WDBC (N=569) 10-Fold 實測（講義 M4 第 15 頁）', [
    '① Bagging：僅 Bootstrap 抽樣本，強特徵（如醫療的 APACHE 評分）在每棵樹頂端都會被重複選中。',
    '② Random Forest：抽樣本＋每次分裂只抽 √p 個特徵，打破強特徵壟斷、大幅降低樹間相關 ρ。',
    '③ Extra Trees：連分裂切點都隨機切一刀，訓練速度最快。',
    'WDBC 10-fold 實測（準確率 ± 標準差）：單棵深樹 92.3% ± 4.0% → Bagging 25 棵 96.3% ± 2.9% → 隨機森林 96.1% ± 2.0% → Extra Trees 97.4% ± 2.1%。'
  ]);

  addNote('w-ada', 'AdaBoost 三輪手算關鍵公式與雜訊弱點（講義 M4 第 18 頁）', [
    '第 1 輪：ε₁=0.300 → α₁=0.424（錯者權重放大 1.67 倍至 0.167）。',
    '第 2 輪：ε₂=0.214 → α₂=0.650（錯者放大 2.33 倍）。',
    '第 3 輪：ε₃=0.091 → α₃=1.151（錯者權重暴增 5.50 倍至 0.250），最終 H(x) = sign(0.424·h₁ + 0.650·h₂ + 1.151·h₃)。',
    '弱點：若資料有人工標錯的髒標籤（Label Noise），每輪分錯會被指數級放大，導致整座森林崩潰。'
  ]);

  addNote('w-tabsel', 'Boosting 五代演進與表格王座實證（講義 M4 第 19、22 頁）', [
    'AdaBoost (1997)：調整樣本權重，對雜訊敏感。',
    'Gradient Boosting (2001)：逐棵擬合負梯度殘差。',
    'XGBoost (2016)：二階泰勒展開＋葉權重正則化。',
    'LightGBM (2017)：直方圖 256 分箱＋逐葉生長，快 10 倍但小樣本易過擬合。',
    'CatBoost (2018)：原生處理高基數類別碼，醫療 ICD／ATC 編碼首選。'
  ]);
  CaseLinks('w-tabsel', [
    ['Grinsztajn et al. (NeurIPS 2022)：為何樹模型在表格資料仍勝過深度學習（45 資料集基準）', U_TABULAR],
    ['Hollmann et al. (Nature 2025)：TabPFN 表格基礎模型（2.8 秒免調參 In-Context 預測）', U_TABPFN],
    ['Chen & Guestrin (KDD 2016)：XGBoost 二階梯度提升原始論文', U_XGB]
  ], '對應講義 M4 第 19、22、87 頁參考文獻 [2][3][4]。');

  addNote('w-vote', '異質集成實務順序（講義 M4 第 25 頁）', [
    '先試軟投票（Soft Voting）：保留各模型預測機率把握度（如 [48%, 48%, 96%] 平均 64% 翻轉硬投票誤判），但各模型機率需先校準。',
    '再考慮 Stacking：僅在軟投票明顯不夠、且能嚴格用 K-Fold Out-of-Fold 預測餵給第二層 Meta 模型時才使用。'
  ]);

  addNote('w-worth', 'Netflix 百萬美金大賽教訓與 Data-Centric AI（講義 M4 第 27、28 頁）', [
    '2009 年 Netflix 奪冠團隊疊了上百個模型贏得百萬美金，但官方最終未部署上線——工程維運與推論延遲成本遠超邊際收益。',
    '實務投報率排序：修補標籤與防洩漏 ＞ 領域特徵工程（如滯後特徵）＞ 機率校準與代價門檻 ＞ 疊更複雜的集成。'
  ]);

  addNote('w-stat', '三種統計門檻的崩潰點與「遮蔽效應 Masking Effect」（講義 M4 第 34 頁）', [
    '3σ 區間 [29.0, 67.4]（崩潰點 0%）：若混入 1 筆誤記 250 次，σ 暴衝至 36.5、上界拉高到 164，把 72 次的真異常完全掩護漏報。',
    'IQR 箱形圖區間 [30.75, 64.75]（崩潰點 25%）：最安全的預設門檻。',
    '穩健 Z 分數 MAD 區間 [23.7, 70.3]（崩潰點 50%）：小樣本偏態資料的王牌。'
  ]);

  CaseLinks('w-cap', [['Liu, Ting & Zhou (IEEE ICDM 2008)：Isolation Forest 孤立森林原始論文 PDF', U_IF]],
    '對應講義 M4 第 4、36、37、87 頁參考文獻 [5]。');

  CaseLinks('w-gft', [
    ['Lazer et al. Science 2014（DOI 原文：The Parable of Google Flu）', U_GFT],
    ['BigDATAwire 報導', 'https://bigdatawire.com/2014/03/14/google_s_flu_analytics_fail_highlights_big_data_s_shortcomings'],
    ['TIME 報導', 'https://time.com/23782/google-flu-trends-big-data-problems']]);

  addNote('w-cal', 'Platt Scaling vs Isotonic 保序迴歸與三切分鐵律（講義 M4 第 63 頁）', [
    'Platt Scaling（Sigmoid 兩參數映射）：適合校準集較小（N < 1,000）或 S 形失準（如隨機森林、SVM）。',
    'Isotonic Regression（無母數階梯函數）：適合校準集充足（N > 1,000）且失準形狀不規則（少於 500 筆易過擬合）。',
    '三切分鐵律：絕不可在原訓練集擬合校準器，必切「訓練集 60% → 校準集 20% → 測試集 20%（算 Brier Score）」。'
  ]);
  CaseLinks('w-cal', [['Scikit-learn 官方指南：Probability Calibration（可靠性圖與 Brier Score）', U_CAL]],
    '對應講義 M4 第 62–64、87 頁參考文獻 [6]。');

  addNote('w-ask', '臨床落地黃金三部曲與最佳門檻公式（講義 M4 第 66、67 頁）', [
    '公式實例：敗血症漏報代價 C_FN = 200、誤報代價 C_FP = 3 → 理論最佳門檻 p* = 3 ÷ (3 + 200) ≈ 1.5%。',
    '落地三部曲：① 訓練模型（排風險高低）→ ② 獨立校準集做機率校準（對準真實發病率）→ ③ 套用 p* 調低門檻（免重訓模型，總代價由 2,445 大砍 67% 至 819；AI Studio 亦可用 MetaCost 嵌入代價矩陣）。'
  ]);

  addNote('w-labs', '實戰接線：AI Studio 四大主題與校準代價標準管線（講義 M4 第 69 頁）', [
    '管線 ① 集成比較：Retrieve → Set Role (label) → Cross Validation (10-Fold Stratified)，訓練子流程內嵌 Bagging / AdaBoost / Vote / Stacking（Stacking 內建 K-Fold 折外預測防洩漏）。',
    '管線 ② 異常偵測：Select Attributes（純特徵、移除 ID）→ Normalize（Z-Score，距離法必做）→ Detect Outlier (LOF) 或 Isolation Forest → Sort (outlier 降冪) → Filter Example Range (1..50 依每日覆核人力截斷)。',
    '管線 ③ 關聯規則：Aggregate / Pivot（轉購物籃寬表）→ Numerical to Binominal（0/1 轉 true/false，FP-Growth 必備前置！）→ FP-Growth (min_support = 0.01) → Create Association Rules → Filter (Lift ≥ 1.2)。',
    '管線 ④ 時間序列與代價門檻：Sort (日期升冪) → Windowing / Lag（造滯後特徵）→ Sliding Window Validation（嚴禁隨機 K-Fold！）；代價敏感可用 MetaCost 包住分類器，或 Create Threshold (p*) → Apply Threshold。'
  ]);

  addNote('w-t1', '實證對照：顧客流失、門診異常與 1,200 張處方實算基準（講義 M4 第 70 頁）', [
    '表 A｜顧客流失（customer-churn-data，N = 900）分層 10-Fold CV：單一決策樁 66.6% ± 3.9% → 深決策樹 78.4% ± 3.8% → Bagging 80.6% ± 3.4% → 隨機森林 80.9% ± 2.8%（標準差最小）→ AdaBoost 78.9% ± 3.2% → GBDT 81.3% ± 3.4% → Soft Voting 81.8% ± 3.1% → OOF Stacking 82.0% ± 3.0%（反觀未做折外預測的 Leaky Stacking 訓練 99.8%、測試崩跌至 74.2%！）。',
    '表 B｜門診主檔乾淨版（N = 751，5 項生理指標）Isolation Forest：contamination 設 0.01 / 0.05 / 0.10 分別抓出 8 / 38 / 75 筆；5 組亂數種子重跑 Top-5% 重疊率 86.2%，與單欄 IQR 交集 26 筆（68%），多抓出 12 筆「單欄正常但組合異常」個案。',
    '表 C｜1,200 張處方關聯規則：按 Confidence 排名前段全被「→ 制酸劑（Lift ≈ 1.00）」霸榜；改篩 Lift ≥ 1.2 後，止咳藥 → 抗組織胺（Lift = 5.10）、Metformin → Statin（Lift = 2.02）與出血交互作用警示 Warfarin → NSAID（Lift = 1.48）才浮現。'
  ]);

  CaseLinks('w-bag', [['Breiman (Machine Learning 2001)：Random Forests 隨機森林與 OOB 原始論文', 'https://doi.org/10.1023/A:1010933404324']],
    '對應講義 M4 第 15、16、88 頁參考文獻 [9]。');
  CaseLinks('w-ada', [['Freund & Schapire (JCSS 1997)：AdaBoost 權重更新定理原始論文', 'https://doi.org/10.1006/jcss.1997.1504']],
    '對應講義 M4 第 17、18、88 頁參考文獻 [10]。');
  CaseLinks('w-apriori', [['Han, Pei & Yin (SIGMOD 2000)：FP-Growth 不產生候選集之前綴樹原始論文', 'https://doi.org/10.1145/335191.335372']],
    '對應講義 M4 第 47、88 頁參考文獻 [11]。');
  CaseLinks('w-lag', [
    ['Das et al. (ICML 2024)：TimesFM 時間序列基礎模型（Zero-Shot 預測）', 'https://arxiv.org/abs/2310.10688'],
    ['Ansari et al. (TMLR 2024)：Chronos 時間序列語言化預訓練模型', 'https://arxiv.org/abs/2403.07815']
  ], '延伸視野：2024–2026 時間序列基礎模型仍須通過季節性基準線與 Walk-forward 檢驗。對應講義 M4 第 58、88 頁參考文獻 [7][8]。');
  CaseLinks('w-cal', [['Niculescu-Mizil & Caruana (ICML 2005)：Predicting Good Probabilities with Supervised Learning', 'https://doi.org/10.1145/1102351.1102430']],
    '實證解析為何隨機森林分數擠向中間、Naive Bayes 推向極端，以及 Platt vs Isotonic 的樣本數分界。對應講義 M4 第 62–63、88 頁參考文獻 [12]。');
})();
