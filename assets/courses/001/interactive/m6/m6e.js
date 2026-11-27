/* M6 互動站強化（2026-11-26）：與 85 頁進階優化版講義（新增第 56–57 頁 AI Studio 接線與 Alexa/垃圾信實證、第 83–84 頁雙頁文獻）同步 */
(function () {
  'use strict';
  const $ = U.$;
  CaseW($('#w-prep6'), { tabs: [
    { id: 't', label: '六個技巧與禁用反例', cards: [
      ['① 轉小寫 Lowercasing', '統一英文大小寫，避免 Fever 與 fever 被當成兩欄。★ 千萬別做：需區分縮寫與一般字（US 超音波/美國 vs us 我們）、或藥名／基因名大小寫具意義時（如 HER2）。', ''],
      ['② 去標點 Punctuation', '移除非文字標點。★ 千萬別做：做情感分析時（「等超久！！！」驚嘆號是情緒）；或還沒做否定偵測前（逗號「，」是截斷否定範圍的防火牆！）。', '先標否定再去標點'],
      ['③ 斷詞 Tokenization', '把連續字串切成詞彙單元（唯一從不跳過的一步）。★ 醫療關鍵：必須先掛載醫療自訂詞典（如 ICD-10／健保藥品檔）或改用中研院 CKIP [2]，否則「二尖瓣脫垂」必被切碎。', ''],
      ['④ 去停用詞 Stop Words', '移除「的、了、是」等虛詞。★ 醫療頭號地雷：開源中文停用詞表（百度／哈工大）幾乎都含「不、無、未、沒、否認」——照抄會讓「無胸痛 ＝ 胸痛」！醫療應移除的是「病人、患者、主訴、予」等醫院套語。', '最容易踩的坑'],
      ['⑤ 詞形還原 Lemmatization', '將英文詞尾還原（running / ran → run）。中文沒有時態與單複數詞尾變化，此步僅用於英文病歷。', ''],
      ['⑥ 詞性標註 POS Tagging', '標出名詞 (n)、動詞 (v)、形容詞 (a)。一般分類不需過濾詞性；僅在「只想抽純名詞做症狀統計或主題分析」時才用。', '']],
      note: '黃金前處理順序：原始病歷 → ① 抽離數值（防數字搶走最高 IDF）→ ② 載入醫療詞典斷詞 → ③ 同義詞歸一 → ④ NegEx 標記否定範圍（NEG_）→ ⑤ 最後才去標點與安全停用詞！' },
    { id: 'q', label: '判斷', quiz: [
      { t: '要判斷病歷裡「有沒有胸痛」。停用詞表與前處理順序該怎麼設？', o: ['直接套用網路停用詞表並先去標點', '從停用詞表刪掉否定詞，且務必先標完 NegEx 否定範圍後才去標點與停用詞'], a: 1, w: '否定詞與標點邊界一旦先被刪掉，「否認胸痛，主訴頭痛」就會完全失去否定與斷句資訊（講義 p13, p29）。' },
      { t: '做病人滿意度情感分析時，「批價等超久！！！」的標點你會？', o: ['去除，統一格式', '保留，連續驚嘆號帶有強烈負向情緒訊息'], a: 1, w: '情感分析時標點與表情符號具高度區辨力，不要去除。' }] }
  ], src: '講義 M6 第 13 頁。' });

  CaseW($('#w-neg3'), { tabs: [
    { id: 'n', label: 'NegEx 原理與三個陷阱', cards: [
      ['① 否定詞被停用詞表偷刪', '中文預設停用詞表幾乎都含「不、無、沒、未」。務必遵守鐵律：先執行 mark_negation() 標上 NEG_ 前綴，最後才去停用詞！', '管線順序鐵律'],
      ['② 否定範圍必須設 STOP_MARK 邊界', '「病人否認胸痛、心悸，主訴頭痛」：若只開 Bigram 會漏掉第三個詞「心悸」；若用 NegEx 視窗（window=5）搭配邊界詞（，、。、但、然而），就能把胸痛與心悸標為 NEG_，並在逗號處歸零保住「頭痛」！', '本節 NegEx 互動'],
      ['③ 臨床否定、疑似與家族史表達多樣', '除了明確否定（「否認、無、未見、排除、查無」），ConText 演算法 [4] 還能標記不確定性（「R/O、疑似、待排」→ UNC_）與經歷者（「母親有乳癌」→ FAM_ 家族史），以及隱含緩解（「已退燒、已改善」）。', 'Harkema 2009 [4]']],
      note: '十行 NegEx 規則讓「胸痛」與「NEG_胸痛」在特徵矩陣徹底分家，是醫療文本投資報酬率最高的一步（講義 p28–31）。' },
    { id: 'q', label: '判斷', quiz: [
      { t: '「否認胸痛、心悸及呼吸困難，但主訴頭痛」。為什麼只開 Bigram 不夠，需要 NegEx 視窗？', o: ['因為 Bigram 無法處理中文', '因為 Bigram 只能綁定緊鄰的「否認_胸痛」，後面的「心悸、呼吸困難」隔超過 2 個詞仍會被當成陽性症狀'], a: 1, w: 'NegEx 視窗可一路將否定狀態傳遞至逗號或轉折詞「但」為止（講義 p28–29）。' }] }
  ], src: '講義 M6 第 28–31 頁。' });

  CaseW($('#w-textpit'), { tabs: [
    { id: 'c', label: '文本分類選型與兩大提醒', cards: [
      ['為什麼高維稀疏 TF-IDF 首選線性模型？', 'TF-IDF 動輒 5,000 維且 99.7% 為 0：決策樹每次只能挑 1 個詞切一刀，效率極差；而 Naive Bayes（<1萬筆首選）與 L2 邏輯斯迴歸／線性 SVM（1萬–100萬筆首選）能一次加總整篇所有出現詞的權重！', '講義第 36 頁'],
      ['提醒 ①：類別極端不平衡（陽性 < 2%）', '異常事件、跌倒、自殺意念皆為少數類，無腦全猜正常也有 98% Accuracy。必開 class_weight="balanced"、依代價下調門檻 p*，並以 Recall 與 PR-AUC / F1 驗收。', '講義第 39 頁'],
      ['提醒 ②：白盒權重＋原文關鍵詞螢光筆反白', '臨床人員不接受只給「高風險 0.86」。用邏輯斯迴歸印出 Top-10 正負權重詞（還可抓出如「病房代號 8A」的捷徑學習），並在畫面上把單筆乘積 w_k×tfidf_k 最大的詞反白標出，護理師 1 秒即可覆核！', '人機協作介面']],
      note: '交付文本分類報告必附五項：混淆矩陣、Precision/Recall/F1、類別分布、前十名正負權重詞、假陽性與假陰性原文案例（講義 p38）。' },
    { id: 'm', label: '主題模型三演算法與三誤用', cards: [
      ['三代演算法：NMF vs LDA [5] vs BERTopic [6]', '• NMF（<1萬篇首選）：分解 TF-IDF 矩陣 V≈W×H，穩定快速、主題詞銳利。\n• LDA [5]：貝氏機率模型，注意「必須餵整數詞頻 Count，不可餵 TF-IDF」！\n• BERTopic [6]：結合 Sentence-BERT 向量＋M3 的 UMAP/HDBSCAN 分群＋c-TF-IDF，短文本最強。', '講義第 42 頁'],
      ['誤用 ①：資料量太小（< 200 篇）硬跑', '少於 200 篇文件跑主題模型多半是統計雜訊；問卷開放題若只有 50 份，人工直接讀完並歸納比較快也比較準。', '講義第 43 頁'],
      ['誤用 ②③：前處理沒清乾淨、把主題當絕對真理', '未加自訂詞典與醫院套語停用詞，跑出來全是碎字與「病人、覺得」；且主題只是統計共現線索（探索起點），換個 K 值就會變，不可直接當成客觀定論。', '講義第 43 頁']],
      note: '主題模型的產出是「請領域專家看看並命名」的探索線索，而不是終點。' },
    { id: 'q', label: '判斷', quiz: [
      { t: '在 AI Studio 或 Python 跑 LDA 機率主題模型時，應該輸入哪一種矩陣？', o: ['TF-IDF 浮點數矩陣', '整數詞頻矩陣（Count / Bag-of-Words）；而 NMF 才是輸入 TF-IDF'], a: 1, w: 'LDA 假設詞彙由多項式分佈抽樣產生，必須輸入整數詞頻 Count；NMF 則搭配 TF-IDF 效果最佳（講義 p24, p42）。' },
      { t: '跌倒通報分類器 Accuracy 98%，但陽性只佔 2%。第一個該看什麼？', o: ['Recall（敏感度：有沒有漏掉真正的跌倒通報）與 PR-AUC / F1', 'Accuracy 已經夠高'], a: 0, w: '全部判正常也能有 98% Accuracy；高風險篩檢優先看 Recall 與 F1（講義 p36, p39）。' }] }
  ], src: '講義 M6 第 36、38、39、42、43 頁。' });

  CaseW($('#w-line'), { tabs: [
    { id: 'l', label: '三個階段與混合檢索', cards: [
      ['M6（本週）：詞袋與 TF-IDF [3]', '每一維對應一個真實詞彙，100% 白盒可解釋、可稽核、不用 GPU；搭配自訂詞典與 NegEx [4] 是醫療文本最穩固的基準線。', '表示法：高維稀疏詞袋'],
      ['M7（下週）：詞向量與 Transformer', 'Subword Tokenization 是斷詞進階版，稠密 Embedding（384–1536 維）讓同義詞（「心梗」與「AMI」）在空間自然靠近，懂上下文但失去單維可解釋性。', '表示法：低維稠密語意向量'],
      ['M8（第 13 週）：RAG 檢索增強生成', '切塊（Chunking）就是文本前處理，召回（Retrieval）就是餘弦相似度計算！現代醫療知識庫常採「TF-IDF/BM25 精確字面匹配 ＋ Embedding 語意檢索」混合搜尋（Hybrid Search）。', '表示法：字面＋語意雙路檢索']],
      note: '三週是同一條主線：M6 學的前處理、TF-IDF、餘弦相似度與 Kappa 標註品質，是 M7 與 M8 RAG 系統不可或缺的地基。' },
    { id: 'q', label: '判斷', quiz: [
      { t: '為什麼現代醫療 RAG 知識庫（M8）常同時保留 M6 的 TF-IDF/BM25 與 M7 的 Embedding（Hybrid Search）？', o: ['只是為了耗費更多算力', 'Embedding 懂模糊同義語意，但面對精確藥品批號、基因型（如 EGFR L858R）或法條編號時，TF-IDF/BM25 字面匹配反而更精準'], a: 1, w: '字面精確匹配與稠密語意檢索互補，是工業界標準架構（講義第 24、70–71 頁）。' }] }
  ], src: '講義 M6 第 24、69–71 頁。' });

  CaseLinks('w-nursing', [
    ['[1] 工商時報：高雄榮總導入生成式 AI 輔助護理交班與病歷文書報導（2025/05/14）', 'https://www.ctee.com.tw/news/20250514701484-431207'],
    ['[8] 衛生福利部（2026/05/29）：醫療機構應用生成式人工智慧指引', 'https://www.mohw.gov.tw/cp-18-86695-1.html']],
    '三家醫院共同原則：「AI 寫草稿、護理師確認修改並簽名後才寫回 HIS」；評估時必問遺漏率、幻覺錯誤率與去識別化部署位置。');
  CaseLinks('w-seg', [
    ['[2] 中研院資訊所詞庫小組 CKIP Transformers 繁體中文斷詞／POS／NER 官方開源專案', 'https://github.com/ckiplab/ckip-transformers']]);
  CaseLinks('w-tfidf', [
    ['[3] Scikit-learn User Guide：Text Feature Extraction（TF-IDF 平滑公式與 L2 正規化官方指南）', 'https://scikit-learn.org/stable/modules/feature_extraction.html'],
    ['[12] Manning, Raghavan & Schütze (2008) Introduction to Information Retrieval（TF-IDF 與 Naive Bayes 經典教材）', 'https://nlp.stanford.edu/IR-book/']]);
  CaseLinks('w-neg', [
    ['[4] Harkema & Chapman et al. (J. Biomed. Inform. 2009) ConText 臨床病歷否定與時態演算法論文', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC2757457/'],
    ['[9] Chapman et al. (J. Biomed. Inform. 2001) NegEx 臨床出院病摘否定偵測原始論文', 'https://doi.org/10.1006/jbin.2001.1029']]);
  CaseLinks('w-nmf', [
    ['[5] Blei, Ng & Jordan (JMLR 2003) Latent Dirichlet Allocation (LDA) 主題模型開山論文', 'https://www.jmlr.org/papers/v3/blei03a.html'],
    ['[6] Grootendorst (2022) BERTopic：結合語意嵌入、UMAP/HDBSCAN 與 c-TF-IDF 之現代主題模型論文', 'https://arxiv.org/abs/2203.05794']]);
  CaseLinks('w-ner', [
    ['[7] U.S. HHS HIPAA Safe Harbor 18 類個人健康識別資訊去識別化官方規範', 'https://www.hhs.gov/hipaa/for-professionals/privacy/special-topics/de-identification/index.html']]);
  CaseLinks('w-kappa', [
    ['[10] Landis & Koch (Biometrics 1977) Cohen\'s Kappa 標註一致性係數分級標準原始論文', 'https://doi.org/10.2307/2529310']]);

  function addNote(id, title, bullets) {
    const b = document.getElementById(id); if (!b || !b.parentNode) return;
    const list = Array.isArray(bullets)
      ? U.h('ul', { style: { margin: '6px 0 0', paddingLeft: '18px', fontSize: '13.5px', lineHeight: 1.6 } }, bullets.map(t => U.h('li', null, t)))
      : U.h('div', { style: { marginTop: '6px', fontSize: '13.5px', lineHeight: 1.6 } }, bullets);
    b.parentNode.append(U.h('details', { class: 'details-note' }, U.h('summary', null, title), list));
  }
  addNote('w-rule', '高風險臨床篩檢標準架構——三層縱深防禦（講義 p8）', [
    '第一層（規則安全網）：明確字眼（「不想活、輕生」）配否定排除 100% 觸發，保證零漏判。',
    '第二層（統計 TF-IDF+LR 或語意模型）：攔截未寫出關鍵字的委婉表達（「把寵物託付好、想永遠睡著」）。',
    '第三層（個管師／護理師人工覆核）：做最終臨床決策與關懷介入。'
  ]);
  addNote('w-tpr', '病安通報數字與一則虛構通報拆解（講義 p5）', [
    '2024 Q2 共 18,152 件、Q3 共 19,500 件；Q3 藥物事件 7,495 件（38%）、跌倒事件 4,540 件（23%）。',
    '範例：「夜間 2 時病人自行下床如廁，於床旁滑倒，否認頭部撞擊，右膝擦傷，未使用助行器。」',
    '拆解：文本分類歸「跌倒」→ 主題模型找「夜間／如廁／未用輔具」→ 否定偵測排除「頭部外傷」。'
  ]);
  addNote('w-seg', '建立醫療自訂詞典與同義詞表的四大來源（講義 p18–19）', [
    '官方標準表：健保署 ICD-10 中文診斷名、健保用藥品項檔、LOINC 檢驗表。',
    '語料統計挖新詞：用點互資訊（PMI，內部凝結度）與左右鄰字熵（邊界自由度）抓漏網複合詞。',
    '科內縮寫與同義詞歸一：建立 synonyms.csv 將「HTN／hypertension／血壓高」統一替換為「高血壓」。',
    '持續迭代維護為科內活資產。'
  ]);
  addNote('w-tfidf', '手算啟示：為什麼 D1 權重最高的是「三 (0.553)」？（講義 p23）', [
    '「三」只在 D1 出現一次（df=1，idf 最高），經 L2 正規化後直接搶走第一名。',
    '同理，病歷裡的體溫「38.7°C」、血壓「142/88」若不先抽離，會霸佔最高 TF-IDF 權重——跑前務必先用 Regex 抽成結構化欄位或替換為 <NUM>。'
  ]);
  addNote('w-kw', '進階技巧：分類別 c-TF-IDF 與四大抽取法分工（講義 p33）', [
    'c-TF-IDF：把所有 1 星差評併成一篇大文件、5 星好評併成另一篇，瞬間拉開 1 星痛點詞（「批價排隊、冷淡」）與 5 星讚美詞。',
    '單篇長病摘（無語料庫可算 IDF）：可選圖論共現 TextRank 或語意向量 KeyBERT。'
  ]);
  addNote('w-taskmap', 'Hugging Face 免標註三超能力與中文模型鐵律（講義 p47）', [
    '三大管線：① zero-shot-classification（無標籤問卷分類） ② summarization（長紀錄濃縮交班草稿，必人工覆核防幻覺） ③ ner（去識別化第一步）。',
    '中文鐵律：不填 model 參數預設載入英文模型！繁中務必指定 joeddav/xlm-roberta-large-xnli 或中研院 ckiplab/bert-base-chinese-ner [2]。'
  ]);
  addNote('w-chal', '醫療 NLP 標準前處理五步防線（講義第 59 頁）', [
    'Step 0 去識別化（Regex 抓號碼 ＋ NER 抓人名地址遮蔽或代換）→ Step 1 抽離數值與檢驗值。',
    'Step 2 掛載醫療自訂詞典斷詞 → Step 3 科內縮寫歸一（留意跨科撞名，如 MS 在神經科＝多發性硬化症、心臟科＝二尖瓣狹窄）。',
    'Step 4 NegEx / ConText 否定（NEG_）與疑似（UNC_）範圍標記 [4] [9]。'
  ]);
  addNote('w-labs', 'AI Studio 接線防呆與 Alexa（N=3,150）／垃圾信（N=5,728）5-Fold 實證對照（講義第 56–57 頁）', [
    '頭號卡關：Read CSV 讀入預設為 Nominal，務必先接 Nominal to Text，否則 Process Documents 會直接跳過不處理！',
    '致命漏接：對新文件推論時，務必把訓練端 Process Documents 輸出的 wor（詞表埠）連進測試端 wor 輸入埠，確保欄位對齊。',
    'Alexa 任務一實測（正評 91.8% / 差評 8.2%，TF-IDF＋平衡 L2 邏輯斯迴歸）：(a) 原字串差評 Recall 66.9%（F1=0.567）→ (b) 斷詞轉小寫躍升至 78.2%（F1=0.598，提升最大 ★）→ (c) 套用預設停用詞因刪掉 not 倒退至 73.6%（F1=0.556）→ 加掛 NegEx＋Bigram 創最高 F1=0.605（AUC=0.950）；若未開平衡權重，準確率雖有 91.9%，差評 Recall 卻僅 1.2%！',
    'emails.csv 垃圾信（98.5% 稀疏 TF-IDF）：Linear SVM（F1=0.984）、L2 邏輯斯（0.978）、Naive Bayes（0.974）全面領先單棵決策樹（0.912）。'
  ]);
})();
