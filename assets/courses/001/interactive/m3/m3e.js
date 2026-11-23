/* M3 互動站強化（2026-11-15）：講義第 7、10、13、18、24、29、32、40、41、42、48、49、51、56、73 頁實證數據與文獻連結同步 */
(function () {
  'use strict';
  const $ = U.$;
  const U_SEPSIS = 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6547137/';
  const U_AHL    = 'https://portal.research.lu.se/en/publications/novel-subgroups-of-adult-onset-diabetes-and-their-association-wit';
  const U_DENNIS = 'https://pmc.ncbi.nlm.nih.gov/articles/PMC6527883/';
  const U_DBSCAN = 'https://cdn.aaai.org/KDD/1996/KDD96-037.pdf';
  const U_IF     = 'https://cs.nju.edu.cn/zhouzh/zhouzh.files/publication/icdm08b.pdf';
  const U_SK     = 'https://scikit-learn.org/stable/modules/clustering.html#clustering-performance-evaluation';

  CaseW($('#w-apps'), { tabs: [
    { id: 'a', label: '四大應用與實證', cards: [
      ['① 分群 Clustering（橫列找群）', 'n 筆樣本 → K 個群組編號（組內相似、組間相異）。例：乳癌細胞 569 例（WDBC）分出 3 群；糖尿病五型、敗血症四型。', 'M3 主軸 (Part 4–9)'],
      ['② 降維 Dim. Reduction（直欄壓縮）', 'p 個欄位 → k 個正交主成分（k << p）。例：乳癌 30 項影像特徵壓成 7 個 PC，保留 91.0% 變異；糖尿病 10 項臨床欄位前 4 個 PC 保留 76.8%。', 'M3 主軸 (Part 11)'],
      ['③ 異常偵測 Anomaly Detection', 'n 筆樣本 → 異常分數／標籤。例：ICU 生理訊號突變、健保異常申報；Isolation Forest 以短路徑孤立怪點。', 'M3 概念＋M4 實作'],
      ['④ 關聯規則 Association Rules', '交易紀錄 → 頻繁項目集（Support / Confidence / Lift）。例：高齡多重共病組合、處方交互作用分析。', 'M4 專章']],
      note: '實務標準 Pipeline：先用「異常偵測」揪出極端離群點 → 再用「PCA 降維」消除共線性並畫 2D 視覺化 → 最後跑「分群」命名病人亞群並設計差異化處置。' },
    { id: 'q', label: '判斷', quiz: [
      { t: '想找出「常和糖尿病一起出現的共病組合」，屬於哪一類？', o: ['分群', '降維', '關聯規則'], a: 2, w: '找「常一起出現」的組合是關聯規則，M4 專章實作。' },
      { t: '想把 30 項腫瘤細胞影像特徵濃縮成 2 個正交座標軸畫散布圖，屬於哪一類？', o: ['降維（PCA）', '異常偵測'], a: 0, w: '把很多欄位線性組合成少數幾個主成分是降維。' }] }
  ], src: '講義 M3 第 7 頁（原講義 ML 3.4 p14）。' });

  CaseW($('#w-prep3'), { tabs: [
    { id: 'p', label: '三個決策', cards: [
      ['① 哪些欄位要納入', 'ID 類欄位（如病歷號）一律移除；與目的無關的欄位也移除；高度相關（|r|>0.8）的欄位會讓同一資訊被重複加權，應擇一或先做 PCA。', ''],
      ['② 類別欄位怎麼處理', 'K-Means 只吃數值。二元類別用 0/1，多類別用 One-Hot（會拉高維度）。混合型態可設 MixedMeasures；k-Modes、Gower 需外掛或 Python。', 'M1 型態轉換'],
      ['③ 用哪一種縮放', 'Z-Score 是預設，但離群值會拉動平均與標準差；Min-Max 離群值會壓縮其他點。有極端離群值時先處理離群值再縮放。', '第 02 節互動']],
      note: '三個決策都在建模前做，且都會直接改變分群結果。' },
    { id: 'q', label: '判斷', quiz: [
      { t: '資料裡有病歷號欄位，要拿去分群。你會？', o: ['保留，它是獨特的識別', '移除，它只會引入雜訊'], a: 1, w: 'ID 類欄位沒有分群意義，一律移除。' }] }
  ], src: '講義 M3 第 10、13 頁（原講義 ML 3.4 pp16–17、45–49）。' });

  CaseW($('#w-four'), { tabs: [
    { id: 's', label: '四步驟與乳癌實戰', cards: [
      ['① 看群大小（警戒 <5% 碎群）', '乳癌 WDBC 569 例跑 K=3：群 0 佔 63.1%（359 例）、群 2 佔 19.3%（110 例）、群 1 佔 17.6%（100 例）。若有小於 5% 的群，要檢查是離群值還是真實的罕見亞型。', ''],
      ['② 做群組剖析（比對全體平均）', '跑分群用 Z-Score，報告時要同時看「Z-Score 相對高低」與「原始單位平均」：如群 2 平均半徑 19.8（全體 14.1）、凹陷度 0.19（全體 0.09）；群 1 半徑接近全體（13.5），凹陷度卻是 1.7 倍。', '本節剖析工作台'],
      ['③ 為每群命名（2–6 字）', '取代冰冷的 cluster_0..2：群 0「小而規則型」（惡性 10.6%）、群 2「大型不規則型」（惡性 100%）、群 1「中型凹陷型（灰色地帶）」（惡性 64.0%）。診斷標籤只用來事後對答案，分群時沒用到。', ''],
      ['④ 對應差異化行動 ★終極判準', '小而規則型→常規追蹤；大型不規則型→優先病理覆核與轉診；灰色地帶型→雙人判讀並追加影像，不單靠模型決定。', '作業一任務 6']],
      note: '第 ④ 步是檢驗分群有沒有價值的最終標準：若兩群設計出的處置一模一樣，代表臨床上根本不需要拆成兩群！' },
    { id: 'q', label: '判斷', quiz: [
      { t: '分成 4 群，但其中兩群的照護或行銷處置完全一樣。你該怎麼想？', o: ['分得越細越好', '這兩群的區分沒有實際價值，考慮合併'], a: 1, w: '處置相同，分群就沒有行動意義。' }] }
  ], src: '講義 M3 第 40 頁（Wisconsin Diagnostic Breast Cancer，scikit-learn 內建，N=569，Z-Score 與 K=3 實測剖析）。' });

  CaseW($('#w-anom3'), { tabs: [
    { id: 't', label: '三個提醒與四種方法', cards: [
      ['異常 ≠ 錯誤（Domain Check 先行）', '被標記的個案可能是輸入錯誤（血壓 0），也可能是真實重症（血壓 210）。先用單欄規則清掉不可能的錯誤，再用多維方法抓高危組合。', ''],
      ['單欄 Z-Score vs 多維 Isolation Forest', 'WDBC 30 欄實測：單一欄位 |Z|>3 最多只抓出 12 人（2.1%），但 30 欄任一 |Z|>3 的聯集達 74 人（13.0%）；Isolation Forest（污染率 5%）標出 29 人，其中 86% 為惡性（全體僅 37%）。', '講義第 48 頁'],
      ['污染率配額與專家命中率驗證', 'contamination 設 5% 就標出 5%，必須由領域知識設定；驗證時把前 20 名最異常個案交給臨床／稽核人員判讀，計算真實命中率（Precision@20）。', '']],
      note: '異常偵測的結果是「請專家優先檢視」的預警名單，不是自動刪除或自動處置。' },
    { id: 'q', label: '判斷', quiz: [
      { t: '高齡患者「心跳 105、體溫 35.8°C、血壓微降」，單看每一欄都沒超過 3 個標準差，卻是早期休克訊號。哪種方法抓得到？', o: ['單欄 Z-Score / IQR', '多維異常偵測（LOF / Isolation Forest）'], a: 1, w: '單欄各自正常但組合反常，屬於多維交互異常，需靠 LOF 或 Isolation Forest。' }] }
  ], src: '講義 M3 第 48–49 頁。' });

  CaseW($('#w-pcalim'), { tabs: [
    { id: 'l', label: '三個限制與實證對策', cards: [
      ['限制 ①：極度怕未標準化尺度', 'PCA 找變異數最大方向。WDBC 30 欄未縮放直接跑 PCA 時，數值上千的 worst area 與 mean area 讓 PC1 假性獨佔 98.2% 變異（平滑度等欄權重趨近 0）；Z-Score 後 PC1 降至合理的 44.3%。', '前置鐵律'],
      ['限制 ②：主成分是線性組合難解釋', 'PC1 = 0.26×平均凹點數 + 0.26×平均凹陷度 + 0.25×最差凹點數 + ... 並非單一現實欄位。對策：看載荷表（Loadings）為軸命名，或在 AI Studio 改用 Weights by PCA 挑出原始欄位。', '載荷與雙標圖'],
      ['限制 ③：只抓線性平坦結構', 'PCA 只做座標軸旋轉與正交投影；遇到彎曲流形或環狀結構會壓扁重疊。視覺化改用 t-SNE 或 UMAP（注意：t-SNE 僅供畫圖，不可當預測模型特徵）。', 'PCA vs t-SNE']],
      note: '進 PCA 前一律先做 Z-Score 標準化！不要被未標準化時虛高的「解釋變異比例」騙了。' },
    { id: 'q', label: '判斷', quiz: [
      { t: '「腫瘤面積（數百至上千）」和「平滑度（0.05–0.16）」不標準化直接丟進 PCA，PC1 解釋變異高達 98.2%。這代表？', o: ['PCA 壓縮效果超好', '假象！PC1 只是把面積欄位複製一遍，平滑度等小尺度欄被完全忽略'], a: 1, w: '未標準化時大尺度欄位主導共變異數矩陣，必須先做 Z-Score。' }] }
  ], src: '講義 M3 第 51、56 頁（WDBC 與 scikit-learn diabetes 實測；商業資料 Marketing_data 補充：未縮放 PCA 的 PC1 為 47.5%、Z-Score 後 27.3%）。' });

  function addDetails(id, title, bullets) {
    const b = document.getElementById(id); if (!b || !b.parentNode) return;
    const ul = U.h('ul', null, bullets.map(([k, v]) => U.h('li', null, U.h('b', null, k + '：'), v)));
    b.parentNode.append(U.h('details', { class: 'details-note' }, U.h('summary', null, title), U.h('div', { class: 'dn-body' }, ul)));
  }

  addDetails('w-scale', '延伸閱讀：課程資料集實測（乳癌 WDBC，N = 569、30 欄，講義第 10、18 頁）', [
    ['未縮放陷阱', 'worst area 與 mean area 合計佔全表 99.1% 變異，K=2 與診斷一致率僅 85.4%（Silhouette 卻高達 0.70，內部指標被尺度騙了）。'],
    ['Z-Score 之後', 'K=4 未縮放切出 268 / 181 / 101 / 19 人；Z-Score 後均衡切出 225 / 153 / 109 / 82 人，K=2 一致率升到 90.5%。'],
    ['商業資料補充', 'Marketing_data（N=8,950）未縮放時 CREDIT_LIMIT 單欄佔 30.1% 變異、PAYMENTS 佔 19.1%。']
  ]);

  addDetails('w-elbow', '延伸閱讀：乳癌 WDBC 569 例 K = 2..6 三判準實測對照（講義第 24 頁）', [
    ['K = 2', 'Inertia 11,596｜Silhouette 0.343（★最高）｜DBI 1.32（★最低），與良性／惡性診斷一致 90.5%。'],
    ['K = 3（肘點）', 'Inertia 10,062｜Silhouette 0.314｜DBI 1.53；惡性群再拆出「中型凹陷、64% 惡性」的灰色地帶。'],
    ['K = 4..6', 'Silhouette 腰斬到 0.159–0.163（K=6 出現 17 人小群）。統計指標用來縮小候選範圍，最終由臨床可解釋性拍板！']
  ]);
  CaseLinks('w-elbow', [['Scikit-learn 官方指南：Clustering Performance Evaluation（Silhouette / DBI 數學定義）', U_SK]],
    '對應講義 M3 第 24、73 頁參考文獻 [6]。');

  addDetails('w-dendro', '延伸閱讀：四種連結法（Linkage）與 O(n²) 記憶體瓶頸（講義第 29 頁）', [
    ['四種連結法', '① Single（最近點：易鏈鎖效應）② Complete（最遠點：緊湊但怕離群值）③ Average（平均距離：AI Studio 常用）④ Ward 華德法（組內變異增量最小，最推薦）。'],
    ['WDBC 569 例實測', 'Single／Complete 只切下 2 個離群點（一致率 63%）；Ward 切出 184 / 385（一致率 88%）。'],
    ['大資料二階段組合技', '距離矩陣 569 例約 16 萬對、n=8,950 需 4,005 萬對。實務採「小樣本 Ward 看樹狀圖定 K → 全量跑 K-Means」。']
  ]);

  addDetails('w-db', '延伸閱讀：如何系統化設定 eps 與 minPts？（講義第 32 頁）', [
    ['Step 1 鎖定 minPts', '依維度 D 先鎖定 minPts = 2×D（Sander 1998 法則，2D 資料設 4–6），不讓兩參數同時亂動。'],
    ['Step 2 畫 k-距離圖', '務必先做 Z-Score，再算每點到第 k 近鄰距離並排序——平坦段為密集核心、急遽上揚的「膝蓋轉折點（Knee）」即最佳 eps。']
  ]);
  CaseLinks('w-db', [['Ester et al. (KDD 1996)：DBSCAN 密度分群原始論文 PDF', U_DBSCAN]],
    '對應講義 M3 第 32、34、73 頁參考文獻 [4]。');

  CaseLinks('w-ahl', [
    ['Ahlqvist et al. Lancet Diabetes Endocrinol 2018（隆德大學官方論文頁）', U_AHL],
    ['Dennis et al. Lancet Diabetes Endocrinol 2019（PMC 全文：連續變數模型 vs 五群外部驗證）', U_DENNIS]
  ], '對應講義 M3 第 41、73 頁參考文獻 [2][3]。');

  CaseLinks('w-sepsis', [['Seymour et al. JAMA 2019（PMC 官方免費全文：敗血症四型 α/β/γ/δ）', U_SEPSIS]],
    '對應講義 M3 第 7、42、73 頁參考文獻 [1]。');

  CaseLinks('w-iso', [['Liu, Ting & Zhou (IEEE ICDM 2008)：Isolation Forest 原始論文 PDF', U_IF]],
    'O(n·log n) 時間複雜度、不需算距離矩陣，高維資料異常偵測首選。對應講義 M3 第 47、48、73 頁參考文獻 [5]。');

  addDetails('w-scree', '延伸閱讀：兩個醫療資料集 PCA 實測（講義第 51、56 頁）', [
    ['乳癌 WDBC（30 欄 Z-Score）', 'PC1 (44.3%) + PC2 (19.0%) = 63.2%（2D 可視覺化）；前 7 個主成分累積保留 91.0% 變異（維度減少 77%），10 個保留 95.2%。'],
    ['糖尿病進展資料（N=442，10 欄）', 'PC1 單軸濃縮 40.2% 變異，前 4 個主成分保留 76.8%，消除血脂欄位共線性。商業資料 Marketing_data（17 欄）7 個 PC 保留 80.8%。']
  ]);

  addDetails('w-prep3', '延伸閱讀：用一份病人資料走一遍前處理順序（講義第 13 頁）', [
    ['去留與編碼', '病歷號 → 移除；總膽固醇與 LDL（r ≈ 0.9）→ 擇一保留；性別 → 0／1；居住地區 5 類 → One-Hot 成 5 欄。'],
    ['極端值與縮放', '年齡 → Z-Score；血清肌酸酐（右偏）→ 先處理極端值再 Z-Score。順序：去留 → 編碼 → 處理極端值 → 縮放。']
  ]);
})();
