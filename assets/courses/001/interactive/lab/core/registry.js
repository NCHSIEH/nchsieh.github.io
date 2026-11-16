/* 演算法實驗室 · 實驗清單　接手製作時只准把自己那一列的 status 由 'todo' 改成 'live'，其餘請勿修改 */
(function (G) {
  'use strict';
  const LAB = G.LAB;
  LAB.groups = [
    { key: 'A', name: '資料前處理', desc: '模型看到資料之前要先做的事：補值、縮放、編碼、抽樣、選特徵。' },
    { key: 'B', name: '監督式學習', desc: '有標準答案的學習：從一條直線到一整片森林。' },
    { key: 'C', name: '非監督式學習', desc: '沒有標準答案：分群、降維、找出異常。' },
    { key: 'D', name: '關聯規則', desc: '哪些項目常常一起出現。' },
    { key: 'E', name: '文字探勘 NLP', desc: '把文字變成數字，再讓演算法處理。' },
    { key: 'F', name: '深度學習', desc: '神經網路怎麼前向計算、怎麼靠梯度學習。' },
    { key: 'G', name: '時間序列', desc: '依時間排列的資料怎麼預測下一期。' },
    { key: 'H', name: '大型語言模型 LLM', desc: '從斷詞、注意力到逐字生成與檢索增強。' },
    { key: 'I', name: '可解釋性', desc: '模型為什麼這樣預測。' },
    { key: 'J', name: '強化學習（延伸參考）', desc: '課程未教，供有興趣的同學延伸。' }
  ];
  const m = (name, url) => ({ name, url });
  LAB.registry = [
    { id: 'A1', group: 'A', title: '遺失值補值', brief: '平均數、中位數、k-NN 三種補法，逐格算給你看。', module: m('M1 第 06 節', '../m1/#p06'), status: 'live' },
    { id: 'A2', group: 'A', title: '標準化與正規化', brief: 'Z 分數與 Min-Max 逐欄計算，看距離怎麼被單位左右。', module: m('M1 第 10 節', '../m1/#p10'), status: 'live' },
    { id: 'A3', group: 'A', title: '離散化', brief: '等寬、等頻、依熵找切點，把連續數值切成區間。', module: m('M1 第 11 節', '../m1/#p11'), status: 'live' },
    { id: 'A4', group: 'A', title: '類別編碼', brief: 'One-hot、Dummy、目標編碼各產生哪些欄位。', module: m('M1 第 11 節', '../m1/#p11'), status: 'live' },
    { id: 'A5', group: 'A', title: '不平衡資料與 SMOTE', brief: '過抽樣、欠抽樣，以及 SMOTE 如何在兩點之間合成新樣本。', module: m('M2-2 第 09 節', '../m2-2/#p09'), status: 'live' },
    { id: 'A6', group: 'A', title: '特徵選擇', brief: '相關係數、卡方、資訊增益排名，再用向前選擇逐步加變數。', module: m('M1 第 09 節', '../m1/#p09'), status: 'live' },

    { id: 'B1', group: 'B', title: '線性迴歸', brief: '最小平方法一次解出，對照梯度下降一步步走下損失曲面。', module: m('M2-1 第 03 節', '../m2-1/#p03'), status: 'live' },
    { id: 'B2', group: 'B', title: '正則化迴歸 Ridge／Lasso', brief: '懲罰係數變大時，係數如何收縮、Lasso 如何歸零。', module: m('M2-1 第 11 節', '../m2-1/#p11'), status: 'live' },
    { id: 'B3', group: 'B', title: 'Logistic 迴歸', brief: '梯度下降讓決策邊界一步步移到對的位置。', module: m('M2-2 第 04 節', '../m2-2/#p04'), status: 'live' },
    { id: 'B4', group: 'B', title: 'k-NN：找最像的 K 位病人投票', brief: '算距離、排序、取前 K 名、投票，四個動作看完。', module: m('M2-2 第 03 節', '../m2-2/#p03'), status: 'live' },
    { id: 'B5', group: 'B', title: 'Naive Bayes', brief: '先驗機率、條件機率、Laplace 平滑，最後連乘比大小。', module: m('M2-2 第 05 節', '../m2-2/#p05'), status: 'live' },
    { id: 'B6', group: 'B', title: '決策樹', brief: '每個節點列出所有候選切點的不純度，樹一層層長出來。', module: m('M2-2 第 11 節', '../m2-2/#p11'), status: 'live' },
    { id: 'B7', group: 'B', title: '隨機森林', brief: '重複抽樣、隨機挑特徵、多棵樹投票，以及袋外誤差。', module: m('M2-2 第 12 節', '../m2-2/#p12'), status: 'live' },
    { id: 'B8', group: 'B', title: 'AdaBoost', brief: '答錯的樣本權重變大，下一棵樹專心處理它們。', module: m('M4 第 05 節', '../m4/#p05'), status: 'live' },
    { id: 'B9', group: 'B', title: '梯度提升 GBDT', brief: '每棵新樹都去擬合上一輪剩下的殘差。', module: m('M4 第 06 節', '../m4/#p06'), status: 'live' },
    { id: 'B10', group: 'B', title: '支持向量機 SVM', brief: '找出間隔最寬的那條線，誰是支持向量。', module: m('M2-2 第 13 節', '../m2-2/#p13'), status: 'live' },

    { id: 'C1', group: 'C', title: 'K-Means 分群', brief: '指派、移動質心、再指派，直到沒有人換群。', module: m('M3 第 03 節', '../m3/#p03'), status: 'live' },
    { id: 'C2', group: 'C', title: '階層式分群', brief: '最近的兩群先合併，樹狀圖一層層往上長。', module: m('M3 第 05 節', '../m3/#p05'), status: 'live' },
    { id: 'C3', group: 'C', title: 'DBSCAN', brief: '逐點判定核心點、邊界點、雜訊，群從密集處擴張。', module: m('M3 第 06 節', '../m3/#p06'), status: 'live' },
    { id: 'C4', group: 'C', title: '高斯混合模型 GMM', brief: 'EM 演算法：先算每點屬於各群的機率，再更新各群參數。', module: m('M3 第 07 節', '../m3/#p07'), status: 'live' },
    { id: 'C5', group: 'C', title: '主成分分析 PCA', brief: '共變異矩陣、特徵值、投影，看變異被保留多少。', module: m('M3 第 10 節', '../m3/#p10'), status: 'live' },
    { id: 'C6', group: 'C', title: 't-SNE', brief: '高維的鄰居關係，如何在平面上一步步被拉近。', module: m('M3 第 11 節', '../m3/#p11'), status: 'live' },
    { id: 'C7', group: 'C', title: 'LOF 局部離群因子', brief: '跟鄰居比密度：比鄰居稀疏很多的就是異常。', module: m('M4 第 10 節', '../m4/#p10'), status: 'live' },
    { id: 'C8', group: 'C', title: 'Isolation Forest', brief: '隨機切幾刀就被孤立的點，就是異常。', module: m('M4 第 11 節', '../m4/#p11'), status: 'live' },

    { id: 'D1', group: 'D', title: 'Apriori', brief: '一層層產生候選項目集、剪枝，再算 support、confidence、lift。', module: m('M4 第 12 節', '../m4/#p12'), status: 'live' },
    { id: 'D2', group: 'D', title: 'FP-Growth', brief: '把交易壓成一棵 FP-tree，不產生候選就找出頻繁項目集。', module: m('M4 第 13 節', '../m4/#p13'), status: 'live' },

    { id: 'E1', group: 'E', title: '斷詞與 TF-IDF', brief: '最大匹配斷詞、詞頻、逆文件頻率，到文件之間的餘弦相似度。', module: m('M6 第 05 節', '../m6/#p05'), status: 'todo' },
    { id: 'E2', group: 'E', title: '文本分類：詞袋 Naive Bayes', brief: '一句護理紀錄，逐詞乘上機率判斷類別。', module: m('M6 第 09 節', '../m6/#p09'), status: 'todo' },
    { id: 'E3', group: 'E', title: 'Word2Vec', brief: '滑動視窗產生詞對，詞向量一步步靠近它的鄰居。', module: m('M6 第 20 節', '../m6/#p20'), status: 'todo' },
    { id: 'E4', group: 'E', title: '主題模型 LDA', brief: '每個詞反覆重抽主題，主題慢慢成形。', module: m('M6 第 11 節', '../m6/#p11'), status: 'todo' },

    { id: 'F1', group: 'F', title: '神經網路：前向與反向傳播', brief: '2-2-1 網路，每個權重的梯度怎麼算、怎麼更新。', module: m('M5 第 03 節', '../m5/#p03'), status: 'live' },
    { id: 'F2', group: 'F', title: '優化器比較', brief: 'SGD、Momentum、Adam 在同一個損失曲面上各走出什麼路線。', module: m('M5 第 05 節', '../m5/#p05'), status: 'todo' },
    { id: 'F3', group: 'F', title: 'CNN：卷積與池化', brief: '卷積核一格一格滑過影像，再經 ReLU 與池化。', module: m('M5 第 13 節', '../m5/#p13'), status: 'todo' },
    { id: 'F4', group: 'F', title: 'RNN 與 LSTM', brief: '沿時間展開，遺忘閘、輸入閘、輸出閘各算出什麼。', module: m('M5 深度學習', '../m5/'), status: 'todo' },
    { id: 'F5', group: 'F', title: 'Autoencoder', brief: '壓縮再還原，還原不回來的就是異常。', module: m('M5 第 17 節', '../m5/#p17'), status: 'todo' },

    { id: 'G1', group: 'G', title: '指數平滑', brief: '簡單、Holt、Holt-Winters 逐期更新水準、趨勢與季節。', module: m('M4 第 15 節', '../m4/#p15'), status: 'todo' },
    { id: 'G2', group: 'G', title: 'ARIMA', brief: '差分、自相關，到用過去幾期預測下一期。', module: m('M4 第 15 節', '../m4/#p15'), status: 'todo' },

    { id: 'H1', group: 'H', title: 'BPE 斷詞', brief: '最常相鄰的兩個符號合併成一個，詞表就這樣長出來。', module: m('M7 第 04 節', '../m7/#p04'), status: 'todo' },
    { id: 'H2', group: 'H', title: '詞嵌入與位置編碼', brief: '查表得到向量，再加上位置資訊。', module: m('M7 第 07 節', '../m7/#p07'), status: 'todo' },
    { id: 'H3', group: 'H', title: 'Self-Attention', brief: 'Query、Key、Value、分數、softmax、加權和，逐格算。', module: m('M7 第 05 節', '../m7/#p05'), status: 'todo' },
    { id: 'H4', group: 'H', title: 'Transformer 一層', brief: '注意力、殘差連接、層正規化、前饋網路，完整走一遍。', module: m('M7 第 06 節', '../m7/#p06'), status: 'todo' },
    { id: 'H5', group: 'H', title: '生成解碼', brief: 'Greedy、Temperature、Top-k、Top-p 如何決定下一個字。', module: m('M7 第 09 節', '../m7/#p09'), status: 'todo' },
    { id: 'H6', group: 'H', title: 'RAG 檢索', brief: '切塊、關鍵字與向量檢索取前 K 段，再組成提示詞。', module: m('M8 第 07 節', '../m8/#p07'), status: 'todo' },
    { id: 'H7', group: 'H', title: 'LoRA 微調', brief: '不動原權重，只學兩個小矩陣的乘積。', module: m('M7 生成式 AI', '../m7/'), status: 'todo' },

    { id: 'I1', group: 'I', title: 'SHAP 與排列重要度', brief: '三個特徵的所有加入順序，精確算出每個特徵的貢獻。', module: m('M9 第 11 節', '../m9/#p11'), status: 'todo' },
    { id: 'J1', group: 'J', title: 'Q-learning', brief: '病房送藥路線：走一步、拿獎勵、更新 Q 表。', module: m('延伸參考', ''), status: 'todo' }
  ];
  LAB.entry = id => LAB.registry.find(e => e.id === id);
})(typeof window !== 'undefined' ? window : globalThis);
