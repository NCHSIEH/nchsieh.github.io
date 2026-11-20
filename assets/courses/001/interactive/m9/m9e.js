/* M9 互動站強化（2026-11-15）：對應講義第 4、6、8–9、21、23、26、35、37、39–40、45–46、49、52–53、59 頁與實測 HTTP 200 一級文獻連結 */
(function () {
  'use strict';
  const $ = U.$;
  CaseW($('#w-diff'), { tabs: [
    { id: 'd', label: '三個不一樣', cards: [
      ['① 沒有「正確答案」', '前八個模組每題都有技術上較好的解；本模組核心是價值選擇：你要優先保障誰、願意犧牲什麼。所以以討論為主。', ''],
      ['② 不是「做完再想」', '倫理反思不是專題最後補一頁投影片；偏誤在「問題定義」那一刻就已進來。檢核清單應在選題時就拿出來對照。', ''],
      ['③ 是 W10 與 W16 的評分項目', 'W10 案例研究須明列「限制與倫理反思」；W16 期末發表中醫療場域四條紅線「不符即扣分」。', '評分']],
      note: 'W10 於發表前先講前半（偏誤與公平性），W16 於發表前講後半（責任與檢核清單）。' },
    { id: 'q', label: '判斷', quiz: [
      { t: '倫理與偏誤檢查最適合在專案的哪個時間點開始？', o: ['專案最後一週補一頁投影片', '選定題目、定義問題的時候'], a: 1, w: '偏誤在問題定義那一刻就已進來，檢核清單應在選題時對照。' }] }
  ], src: '講義 M9 第 4 頁。' });

  CaseW($('#w-beyond'), { tabs: [
    { id: 'b', label: '三個作法', cards: [
      ['① 回去補資料', '最根本、也最少人做。不必補到平衡，只要讓弱勢群體樣本數達到可靠的最低量：跨機構合作、延長蒐集期間、針對性補樣。', '最根本'],
      ['② 對表現差的群體加強人工覆核', '不改模型、改流程：這兩群的預測一律加註「建議人工覆核」。成本低、立即可行、責任歸屬清楚，實務上往往比任何演算法調整有效。', '成本低'],
      ['③ 明訂適用範圍並誠實揭露', '例：「本模型在 80 歲以上族群表現顯著較差，不建議單獨依賴」。寫進模型卡、交付文件、發表投影片。這不是承認失敗，這是專業。', '專業']] },
    { id: 'q', label: '判斷', quiz: [
      { t: '模型對 80 歲以上族群明顯較差，下週就要交付，來不及補資料。最合適的做法是？', o: ['對該族群預測加註「建議人工覆核」，並在模型卡寫明適用範圍', '不提這件事，整體準確率夠高即可'], a: 0, w: '改流程加人工覆核、誠實揭露適用範圍，成本低且責任清楚。' }] }
  ], src: '講義 M9 第 37 頁。' });

  CaseW($('#w-thread'), { tabs: [
    { id: 't', label: '八個模組', cards: [
      ['M1 資料工程', '缺值、離群值、正規化 → 缺值不是隨機的（MNAR）：誰的資料常缺？刪掉他們等於排除他們。', ''],
      ['M2 監督式學習', '分類、評估指標、類別不平衡 → 選哪個指標＝選擇「哪一種錯誤比較能接受」，是價值判斷。', ''],
      ['M3 非監督式', '分群、降維 → 分群結果的命名會固化刻板印象（如稱某群為「高風險族群」）。', ''],
      ['M4 進階監督式', '集成、異常偵測、代價敏感 → 集成的可解釋性代價；異常偵測的門檻＝決定誰被盯上。', ''],
      ['M5 深度學習', 'CNN、遷移學習 → 捷徑學習、外部驗證、黑箱的可解釋性難題。', ''],
      ['M6 NLP', '文字探勘、去識別化 → 去識別化不等於安全；標註品質決定模型天花板。', ''],
      ['M7 生成式 AI', 'LLM 原理、幻覺、部署 → 幻覺無法根除；資料能不能出機構是第一個問題。', ''],
      ['M8 Dify', 'RAG、Agent、HITL → 責任邊界、人在迴路、四條紅線。', '']],
      note: '倫理不是最後一個模組的內容，而是每個模組都埋著的線；這一週只是把它們串起來講清楚。' }
  ], src: '講義 M9 第 46 頁。' });

  CaseW($('#w-three'), { tabs: [
    { id: 'c', label: '三件事', cards: [
      ['① 工具會過時，判斷不會', 'AI Studio、Dify、某某模型五年後可能都換了；但「該用什麼方法」「結果可不可信」「這樣用對不對」不會過時。', ''],
      ['② 你的領域知識是稀缺的', '會寫程式的人很多，看得懂護理紀錄又會分析的人很少。「這個標籤實際上怎麼產生的」只有你問得出來。', ''],
      ['③ 誠實比聰明重要', '主動揭露限制、承認不確定、說得出模型對誰不準。被過度宣稱的模型，傷害遠大於一個誠實的爛模型。', '']] }
  ], src: '講義 M9 第 49 頁。' });

  CaseLinks('w-label', [
    ['Obermeyer et al., Science 2019 摘要（UC Berkeley CHMI）', 'https://chmi.berkeley.edu/news/dissecting-racial-bias-in-an-algorithm-used-to-manage-the-health-of-populations']
  ], 'Obermeyer et al., Science 366:447–453（2019）；改用生理健康指標而非醫療花費後，應納入照護的黑人病患比例從 17.7% 升至 46.5%。');
  CaseLinks('w-watson', [
    ['Healthcare Dive 報導（STAT 調查摘要）', 'https://www.healthcaredive.com/news/stat-ibms-watson-gave-unsafe-and-incorrect-cancer-treatment-advice/528666/'],
    ['STAT News：Watson 建議不安全且不正確的治療（2018/7/25，STAT+ 訂閱）', 'https://www.statnews.com/2018/07/25/ibm-watson-recommended-unsafe-incorrect-treatments/']
  ], '報導指出問題主要來自以少量「合成」個案訓練；STAT 稱無病人因此死亡。');
  CaseLinks('w-fair', [
    ['Kleinberg et al., ITCS 2017：公平性三大定義不可能定理（arXiv）', 'https://arxiv.org/abs/1609.05807']
  ]);
  CaseLinks('w-card', [
    ['Mitchell et al., FAT* 2019：Model Cards for Model Reporting（arXiv）', 'https://arxiv.org/abs/1810.03993']
  ]);
  CaseLinks('w-cam', [
    ['Selvaraju et al., ICCV 2017：Grad-CAM 原始論文（arXiv）', 'https://arxiv.org/abs/1610.02391']
  ]);
  CaseLinks('w-shap', [
    ['Lundberg & Lee, NeurIPS 2017：SHAP 統一可解釋性框架（arXiv）', 'https://arxiv.org/abs/1705.07874']
  ]);

  function addNote(id, title, bullets) {
    const b = document.getElementById(id); if (!b || !b.parentNode) return;
    const list = Array.isArray(bullets)
      ? U.h('ul', { style: { margin: '6px 0 0', paddingLeft: '18px', fontSize: '13.5px', lineHeight: 1.6 } }, bullets.map(t => U.h('li', null, t)))
      : U.h('div', { style: { marginTop: '6px', fontSize: '13.5px', lineHeight: 1.6 } }, bullets);
    b.parentNode.append(U.h('details', { class: 'details-note' }, U.h('summary', null, title), list));
  }
  addNote('w-shortcut', '跨院驗證與表格洩漏（講義 p8）', [
    '影像捷徑：肺部 X 光模型單院 AUC > 90%，Grad-CAM 卻顯示模型在看角落的攜帶式 X 光機標記。',
    '表格洩漏：若把「已開立會診單」等事後欄位放進特徵，模型就靠 Target Leakage 作弊。'
  ]);
  addNote('w-alloc', '支持性 vs 懲罰性使用（講義 p9）', [
    '模型回答的是「30 天再入院機率」，不是「資源該給誰」。',
    '同樣的分數用來加派個管訪視是支持；用來抽走高風險病患資源（Cream-Skimming）則造成系統性傷害。'
  ]);
  addNote('w-spo2', '血氧計偏誤的數字與傳遞鏈（講義 p16）', [
    '血氧計顯示 92–96% 時，動脈血氧實際 < 88% 的比例：黑人 11.7%、白人 3.6%（約 3 倍；NEJM 2020，PMID: 33326721）；2024 統合分析約 1.7 倍。',
    '傳遞鏈：量測工具偏高 → 輸入特徵歪 → 「需要給氧」標籤也歪 → 模型在同一群人一起歪。'
  ]);
  addNote('w-proxy', '代理變數：欄位悄悄攜帶的敏感資訊（講義 p18）', [
    '郵遞區號 → 族群、社經、居住區域；保險別 → 經濟狀況；院所層級 → 城鄉與可近性。',
    '過去醫療花費 → 就醫可近性（非健康需求）；教育與職業 → 社經地位；手機型號與上網時間 → 消費能力。'
  ]);
  addNote('w-subaudit', '子群體稽核表必看指標（講義 p26）', [
    '整體 AUC 0.842 看似漂亮，拆開卻發現 80 歲以上僅 0.771（差距 0.090 > 0.07 警戒線）、非都會區 0.782。',
    '實務對策：對這兩群預測加註「建議人工覆核」，並將稽核表完整放進 Model Card 與發表簡報。'
  ]);
  addNote('w-auto', '介面設計對照：放大偏誤 vs 減緩偏誤（講義 p34）', [
    '放大偏誤：只顯示紅色分數「高風險 0.87」、預設按鈕就是採納、「不採納」藏在角落。',
    '減緩偏誤：先填自己的判斷，再看 AI 建議與區間（0.71–0.93）、依據與「資料不完整」提示，「採納」與「不採納（寫理由）」同等好按。'
  ]);
  addNote('w-myth', '破除四大法規誤解（講義 p45）', [
    '① 只刪姓名不是不可逆匿名（PDPA）。',
    '② 「僅供參考」不免除機構合理注意義務。',
    '③ 不收費也可能落入 TFDA SaMD 判定（看預期醫療用途）。',
    '④ 用雲端 LLM API 時，提問與 RAG 段落仍會送到境外伺服器。'
  ]);
  addNote('w-check', 'W10 與 W16 發表前最後確認（講義 p52–53）', [
    '資料來源與標籤審查 → Baseline 與子群體表現 → SHAP / Grad-CAM 捷徑檢查。',
    '醫療四條紅線＋數字不生成（同題問 5 次一致）＋ Model Card 誠實揭露未竟事項。'
  ]);
})();
