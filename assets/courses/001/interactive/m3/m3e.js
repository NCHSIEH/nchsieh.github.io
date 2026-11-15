/* M3 互動站強化（2026-11-15）：講義第 7、10、13、18、24、29、32、40、41、42、47、48、50、55、72 頁實證數據與文獻連結同步 */
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
      ['① 分群 Clustering（橫列找群）', 'n 筆樣本 → K 個群組編號（組內相似、組間相異）。例：信用卡 8,950 人切出 4 客群；糖尿病五型、敗血症四型。', 'M3 主軸 (Part 4–9)'],
      ['② 降維 Dim. Reduction（直欄壓縮）', 'p 個欄位 → k 個正交主成分（k << p）。例：信用卡 17 欄壓成 7 個 PC 保留 80.8% 變異；啤酒 12 題壓成 2 軸。', 'M3 主軸 (Part 11)'],
      ['③ 異常偵測 Anomaly Detection', 'n 筆樣本 → 異常分數／標籤。例：ICU 生理訊號突變、健保異常申報；Isolation Forest 以短路徑孤立怪點。', 'M3 概念＋M4 實作'],
      ['④ 關聯規則 Association Rules', '交易紀錄 → 頻繁項目集（Support / Confidence / Lift）。例：高齡多重共病組合、處方交互作用分析。', 'M4 專章']],
      note: '實務標準 Pipeline：先用「異常偵測」揪出極端離群點 → 再用「PCA 降維」消除共線性並畫 2D 視覺化 → 最後跑「分群」命名客群並設計差異化處置。' },
    { id: 'q', label: '判斷', quiz: [
      { t: '想找出「常和糖尿病一起出現的共病組合」，屬於哪一類？', o: ['分群', '降維', '關聯規則'], a: 2, w: '找「常一起出現」的組合是關聯規則，M4 專章實作。' },
      { t: '想把 17 項信用卡行為指標濃縮成 2 個正交座標軸畫散布圖，屬於哪一類？', o: ['降維（PCA）', '異常偵測'], a: 0, w: '把很多欄位線性組合成少數幾個主成分是降維。' }] }
  ], src: '講義 M3 第 7 頁（原講義 ML 3.4 p14）。' });

  CaseW($('#w-prep3'), { tabs: [
    { id: 'p', label: '三個決策', cards: [
      ['① 哪些欄位要納入', 'ID 類欄位（如 CUST_ID）一律移除；與目的無關的欄位也移除；高度相關（|r|>0.8）的欄位會讓同一資訊被重複加權，應擇一或先做 PCA。', ''],
      ['② 類別欄位怎麼處理', 'K-Means 只吃數值。二元類別用 0/1，多類別用 One-Hot（會拉高維度）。混合型態可設 MixedMeasures；k-Modes、Gower 需外掛或 Python。', 'M1 型態轉換'],
      ['③ 用哪一種縮放', 'Z-Score 是預設，但離群值會拉動平均與標準差；Min-Max 離群值會壓縮其他點。有極端離群值時先處理離群值再縮放。', '第 02 節互動']],
      note: '三個決策都在建模前做，且都會直接改變分群結果。' },
    { id: 'q', label: '判斷', quiz: [
      { t: '資料裡有 CustomerID 欄位，要拿去分群。你會？', o: ['保留，它是獨特的識別', '移除，它只會引入雜訊'], a: 1, w: 'ID 類欄位沒有分群意義，一律移除。' }] }
  ], src: '講義 M3 第 10、13 頁（原講義 ML 3.4 pp16–17、45–49）。' });

  CaseW($('#w-four'), { tabs: [
    { id: 's', label: '四步驟與信用卡實戰', cards: [
      ['① 看群大小（警戒 <5% 碎群）', 'Marketing 8,950 人跑 K=4：群 0 佔 44.7%（4,003 人）、群 2 佔 37.7%（3,374 人）、群 3 佔 13.5%（1,209 人）、群 1 佔 4.1%（364 人）。小於 5% 要檢查是離群值還是真實 VIP。', ''],
      ['② 做群組剖析（比對全體平均）', '跑分群用 Z-Score，報告時要同時看「Z-Score 相對高低」與「原始金額平均」：如群 1 年刷卡 $8,151（全體 $1,003 的 8.1 倍）、群 3 預借現金 $4,484（全體 4.6 倍）。', '本節剖析工作台'],
      ['③ 為每群命名（2–6 字）', '取代冰冷的 cluster_0..3：群 0「低度使用沉睡族」、群 2「穩健刷卡全額繳清族」、群 3「預借現金高險循環族」、群 1「VIP 高消頂級大戶」。', ''],
      ['④ 對應差異化行動 ★終極判準', '沉睡族→首刷喚醒；穩健族→免年費留存與分期；高險循環族→凍結額度調升與低利代償協商；VIP 大戶→專屬理專與財管跨售。', '作業一任務 6']],
      note: '第 ④ 步是檢驗分群有沒有價值的最終標準：若兩群設計出的行動一模一樣，代表業務上根本不需要拆成兩群！' },
    { id: 'q', label: '判斷', quiz: [
      { t: '分成 4 群，但其中兩群的照護或行銷處置完全一樣。你該怎麼想？', o: ['分得越細越好', '這兩群的區分沒有實際價值，考慮合併'], a: 1, w: '處置相同，分群就沒有行動意義。' }] }
  ], src: '講義 M3 第 40 頁（1.3 Marketing_data.csv N=8,950 實測剖析）。' });

  CaseW($('#w-anom3'), { tabs: [
    { id: 't', label: '三個提醒與四種方法', cards: [
      ['異常 ≠ 錯誤（Domain Check 先行）', '被標記的個案可能是輸入錯誤（血壓 0），也可能是真實重症（血壓 210）。先用單欄規則清掉不可能的錯誤，再用多維方法抓高危組合。', ''],
      ['單欄 Z-Score vs 多維 Isolation Forest', 'Marketing 17 欄實測：單看 BALANCE |Z|>3 僅 196 人（2.2%），但 17 欄任一 |Z|>3 聯集卻暴增至 1,516 人（16.9%）！高維組合異常必須靠 LOF 或 Isolation Forest。', '講義第 47 頁'],
      ['污染率配額與專家命中率驗證', 'contamination 設 5% 就標出 5%，必須由領域知識設定；驗證時把前 20 名最異常個案交給臨床／稽核人員判讀，計算真實命中率（Precision@20）。', '']],
      note: '異常偵測的結果是「請專家優先檢視」的預警名單，不是自動刪除或自動處置。' },
    { id: 'q', label: '判斷', quiz: [
      { t: '高齡患者「心跳 105、體溫 35.8°C、血壓微降」，單看每一欄都沒超過 3 個標準差，卻是早期休克訊號。哪種方法抓得到？', o: ['單欄 Z-Score / IQR', '多維異常偵測（LOF / Isolation Forest）'], a: 1, w: '單欄各自正常但組合反常，屬於多維交互異常，需靠 LOF 或 Isolation Forest。' }] }
  ], src: '講義 M3 第 47–48 頁。' });

  CaseW($('#w-pcalim'), { tabs: [
    { id: 'l', label: '三個限制與實證對策', cards: [
      ['限制 ①：極度怕未標準化尺度', 'PCA 找變異數最大方向。Marketing 17 欄未縮放直接跑 PCA 時，萬元級 CREDIT_LIMIT 與 PAYMENTS 讓 PC1 假性獨佔 47.5% 變異（頻率欄權重變 0）；Z-Score 後 PC1 降至合理的 27.3%。', '前置鐵律'],
      ['限制 ②：主成分是線性組合難解釋', 'PC1 = 0.41×刷卡額 + 0.39×單筆額 + ... 並非單一現實概念。對策：看載荷表（Loadings）為軸命名，或在 AI Studio 改用 Weights by PCA 挑出原始欄位。', '載荷與雙標圖'],
      ['限制 ③：只抓線性平坦結構', 'PCA 只做座標軸旋轉與正交投影；遇到彎曲流形或環狀結構會壓扁重疊。視覺化改用 t-SNE 或 UMAP（注意：t-SNE 僅供畫圖，不可當預測模型特徵）。', 'PCA vs t-SNE']],
      note: '進 PCA 前一律先做 Z-Score 標準化！不要被未標準化時虛高的「解釋變異比例」騙了。' },
    { id: 'q', label: '判斷', quiz: [
      { t: '「信用額度（萬元）」和「刷卡頻率（0–1）」不標準化直接丟進 PCA，PC1 解釋變異高達 47.5%。這代表？', o: ['PCA 壓縮效果超好', '假象！PC1 只是把萬元級欄位複製一遍，0–1 頻率欄被完全忽略'], a: 1, w: '未標準化時大尺度欄位主導共變異數矩陣，必須先做 Z-Score。' }] }
  ], src: '講義 M3 第 50、55 頁（Marketing_data 與 CraftBeer 實測）。' });

  function addNote(id, title, body) {
    const b = document.getElementById(id); if (!b || !b.parentNode) return;
    b.parentNode.append(U.h('div', { class: 'note', style: { marginTop: '10px' } }, U.h('b', null, title), body));
  }

  addNote('w-scale', '課程資料集實測（Marketing_data，N = 8,950、17 欄）：',
    '未縮放時 CREDIT_LIMIT 單欄獨佔全表 30.1% 變異、PAYMENTS 佔 19.1%，跑 K-Means (K=4) 切出 5,709 / 2,568 / 649 / 24 人（24 位極端大戶自成一格）；經 Z-Score 標準化與 k-means++（max runs=10）後，穩定切出 4,003 / 3,374 / 1,209 / 364 人四類清晰行為客群。（講義 M3 第 10、18 頁）');

  addNote('w-elbow', '信用卡 8,950 人（17 欄 Z-Score）K = 2..6 三判準實測對照：',
    'K=2（Inertia 127,784｜Silhouette 0.216｜DBI 1.91）→ K=3（Inertia 111,973｜Silhouette 0.235★最高｜DBI 1.60）→ K=4（Inertia 99,062｜Silhouette 0.199｜DBI 1.57★業務最佳：把 1,209 人預借現金高險族與 364 人 VIP 刷卡大戶乾淨拆開）→ K=5（DBI 1.46★最低，但兩群處置重疊）。統計指標用來縮小候選範圍，最終由業務可行動性拍板！（講義 M3 第 24 頁）');
  CaseLinks('w-elbow', [['Scikit-learn 官方指南：Clustering Performance Evaluation（Silhouette / DBI 數學定義）', U_SK]],
    '對應講義 M3 第 24、72 頁參考文獻 [6]。');

  addNote('w-dendro', '四種連結法（Linkage）與 O(n²) 記憶體瓶頸：',
    '① Single（最近點：易產生鏈鎖效應 Chaining） ② Complete（最遠點：群緊湊怕離群值） ③ Average（平均距離：AI Studio 常用） ④ Ward 華德法（組內平方和增量最小，與 K-Means 同目標，最推薦）。注意：CraftBeer (n=300) 僅算 4.5 萬對距離瞬間完成；Marketing (n=8,950) 需算 4,005 萬對距離！大資料實務採「小樣本 Ward 看樹狀圖定 K → 全量跑 K-Means」二階段組合技。（講義 M3 第 29 頁）');

  addNote('w-db', '如何系統化設定 eps 與 minPts？（講義 M3 第 32 頁）：',
    'Step 1：依維度 D 先鎖定 minPts = 2×D（Sander 1998 法則，2D 資料設 4–6），不讓兩參數同時亂動。 Step 2：務必先做 Z-Score，再算每點到「第 k 近鄰（k=minPts）」距離並由小到大排序畫 k-距離圖（k-distance plot）——平坦段為密集核心、急遽上揚的「膝蓋轉折點（Knee）」即為最佳 eps！');
  CaseLinks('w-db', [['Ester et al. (KDD 1996)：DBSCAN 密度分群原始論文 PDF', U_DBSCAN]],
    '對應講義 M3 第 32、34、72 頁參考文獻 [4]。');

  addNote('w-ahl', '五群各有多少人（瑞典 ANDIS 世代 8,980 人）：',
    'SAID 自體免疫 577、SIDD 胰島素嚴重不足 1,575（視網膜病變風險最高）、SIRD 胰島素嚴重阻抗 1,373（腎臟病變風險最高）、MOD 輕度肥胖相關 1,942、MARD 輕度年齡相關 3,513（約 39%）。演算法只給編號，名字是研究者看完剖析後取的。（講義 M3 第 41 頁）');
  CaseLinks('w-ahl', [
    ['Ahlqvist et al. Lancet Diabetes Endocrinol 2018（隆德大學官方論文頁）', U_AHL],
    ['Dennis et al. Lancet Diabetes Endocrinol 2019（PMC 全文：連續變數模型 vs 五群外部驗證）', U_DENNIS]
  ], '對應講義 M3 第 41、72 頁參考文獻 [2][3]。');

  CaseLinks('w-sepsis', [['Seymour et al. JAMA 2019（PMC 官方免費全文：敗血症四型 α/β/γ/δ）', U_SEPSIS]],
    '對應講義 M3 第 7、42、72 頁參考文獻 [1]。');

  CaseLinks('w-iso', [['Liu, Ting & Zhou (IEEE ICDM 2008)：Isolation Forest 原始論文 PDF', U_IF]],
    'O(n·log n) 時間複雜度、不需算距離矩陣，高維資料異常偵測首選。對應講義 M3 第 46、47、72 頁參考文獻 [5]。');

  addNote('w-scree', '本單元兩大資料集 PCA 實測（講義 M3 第 50、55 頁）：',
    '① Marketing_data（17 欄 Z-Score）：PC1 (27.3%) + PC2 (20.3%) = 47.6%（2 維即可畫散布圖），前 7 個主成分累積保留 80.8% 變異（維度減半 59%）。 ② CraftBeer 精釀啤酒（12 題偏好量表）：PC1 單軸即濃縮 37.1% 變異，前 5 個主成分保留 70.1% 變異，完美消除問卷題項間的多重共線性。');

  addNote('w-prep3', '用一份顧客資料走一遍（講義 M3 第 13 頁）：',
    'CustomerID → 移除；年齡 → Z-Score；年收入（右偏）→ 先處理極端值再 Z-Score；刷卡金額與刷卡次數 r = 0.9 → 擇一保留；性別 → 0／1；居住地區 5 類 → One-Hot 成 5 欄。順序：去留 → 編碼 → 處理極端值 → 縮放。');
})();
