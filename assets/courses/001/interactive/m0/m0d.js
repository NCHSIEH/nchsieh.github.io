/* M0 互動站強化（2026-11-13）：Agent 流程、對數尺度、典範轉移三個互動框；實例來源連結 */
(function () {
  'use strict';
  const { h, $, seg, C } = U;
  const note = m => h('div', { class: 'note', style: { marginTop: '10px' } }, h('b', null, '看懂了什麼：'), m);
  const sub = t => h('div', { style: { fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' } }, t);

  /* ① 講義第 24 頁：Agent 怎麼完成一件事 */
  CaseW($('#w-agent'), {
    tabs: [
      { id: 'flow', label: '五步流程', cards: [
        ['① 查評估紀錄', '個管師問：「王伯伯下週需要加派居服時數嗎？」推理模型先想「我需要哪些資料」，第一個工具是長照系統：ADL 由 60 降到 45。', '工具（MCP）：資料來源接進來'],
        ['② 算風險分數', '呼叫 M2 的分類模型，輸出「需求上升機率 0.78」。這一步是傳統機器學習，不是語言模型在猜。', 'M2-2：分類與門檻'],
        ['③ 查給付規定', '用 RAG 知識庫查該等級的每月額度，結果是尚餘 6 小時。規定來自文件，不是模型記憶。', 'M8：RAG 與知識庫'],
        ['④ 草擬建議', '把前三步的結果合成一則建議：風險高，建議下週加派 6 小時，並附上依據。', 'M8：數字不生成，只引用'],
        ['⑤ 人在迴路', '個管師確認、修改後才送出。最後一步一定是人，責任也在人。', 'M9：責任邊界']] ,
        note: '同一個問題，Agent 自己決定查什麼、依結果決定下一步。五步裡有三步不是語言模型：評估紀錄、分類模型、規定文件。LLM 負責規劃與整理。' },
      { id: 'cmp', label: '聊天機器人 vs Agent', cards: [
        ['聊天機器人', '只回答。它沒有王伯伯的紀錄，只能給一般性的說法，或憑印象編一個數字。', '風險：幻覺'],
        ['Agent', '自己決定要查什麼、呼叫哪個工具，再依結果決定下一步；每一步的來源都留得下來。', '風險：多一層就多一個要抽查的環節'],
        ['MCP：工具的 USB-C', '2024 年底提出的工具連接標準，2025 年底移交 Linux 基金會。工具接一次，各家模型都能用。', 'M8、M10'],
        ['推理模型', 'o1、DeepSeek-R1 這類模型會先「想」再答，適合多步驟規劃，但更慢、更貴。', '成本與延遲']],
        note: 'Agent 的能力來自「模型＋工具＋流程」，不是模型單獨變聰明。接上工具之後，錯誤也會跟著進到你的資料與決策裡。' },
      { id: 'q', label: '判斷：拿掉哪一步最危險？', quiz: [
        { t: '把第 5 步「人確認」拿掉，建議直接送給居服單位。最大的問題是什麼？', o: ['速度變慢', '錯誤的建議會直接變成行動，沒人負責', '風險分數變低'], a: 1, w: '第 5 步不是為了更準，是把責任留在人手上。拿掉之後，模型的任何錯誤都會直接變成行動。' },
        { t: '第 2 步改成讓語言模型「直接猜」需求上升機率。要擔心什麼？', o: ['數字沒有驗證過，可能只是看起來合理', '會變得太準', '呼叫次數變多'], a: 0, w: '語言模型會產生像樣的數字，但沒有經過外部驗證。要用分數，就用驗證過的分類模型。' }],
        after: 'Agent 的設計原則：能用工具算的不要讓模型猜，最後一步留給人。M8 會實際做一個，M9 談責任邊界。' }
    ],
    src: '圖：課程自製（情境示意，非真實個案）。MCP 資料：Anthropic 2024/11 提出、2025/12 移交 Linux 基金會 Agentic AI Foundation。講義 M0 第 24 頁。'
  });

  /* ② 講義第 26–27 頁：對數尺度，語言模型參數量 */
  (function logscale() {
    const box = $('#w-logscale'); if (!box) return;
    const D = [['GPT-1（2018）', 0.117], ['GPT-2（2019）', 1.5], ['GPT-3（2020）', 175], ['PaLM（2022）', 540], ['開源 MoE 前沿模型（2026，總參數）', 1600]];
    let view = 'lin'; const out = h('div');
    function draw() {
      out.innerHTML = '';
      out.append(h('div', { class: 'row' }, seg([['lin', '一般刻度（線性）'], ['log', '對數刻度（每格 10 倍）']], () => view, v => view = v, draw)));
      const d = h('div'); out.append(sub('參數量（單位：十億），顯示在標籤上；長條長度依所選刻度'), d);
      const items = D.map(([l, v], i) => ({ label: l + '　' + v.toLocaleString('en-US') + ' B', value: view === 'lin' ? v : Math.log10(v * 1000) - 1.5, color: i === D.length - 1 ? (C.amber || '#b7791f') : C.accent }));
      U.hbars(d, items, { w: 820, lw: 330, rowH: 30, fmt: () => '', max: view === 'lin' ? 1600 : Math.log10(1600 * 1000) - 1.5 });
      out.append(note(view === 'lin' ? '一般刻度下，2018–2022 年的模型幾乎看不見——不是它們不重要，是量級差了上千倍。' : '對數刻度下，每一格是 10 倍，五個模型的差距才排得進同一張圖。代價是：看起來差不多長的兩條，實際可能差 10 倍。'));
      out.append(h('p', { class: 'ai' }, '資料：代表性量級，非完整統計。GPT-1 約 1.17 億、GPT-2 15 億、GPT-3 1,750 億、PaLM 5,400 億參數（各模型論文）；2026 年開源 MoE 前沿模型以講義所引 DeepSeek-V4-Pro 總參數 1.6 兆為例（每次只啟用約 49B；2026/4 預覽版；講義查核 2026/11）。對數長條的零點為示意。講義 M0 第 26–27 頁。'));
    }
    box.append(out); draw();
  })();

  /* ③ 講義第 29 頁：典範改變了什麼 */
  CaseW($('#w-paradigm'), {
    tabs: [
      { id: 'diff', label: '四個差異', cards: [
        ['誰決定特徵', '傳統機器學習：人靠領域知識手工設計特徵，特徵工程是最耗人力的環節。深度學習：模型從原始輸入自己學出表徵，但需要大量資料才餵得飽。', 'M1 資料工程、M5'],
        ['需要多少標註', '傳統：每個任務都要重新標註，標註成本是主要瓶頸。深度學習與生成式 AI：預訓練加微調，少量標註即可到可用水準。', 'M5 遷移學習'],
        ['如何解釋結果', '傳統：係數、決策路徑、特徵重要性，可以印出來給臨床人員看。深度學習：中間層難以直接解讀，需要額外的解釋方法。', 'M9 可解釋性'],
        ['部署形式', '傳統：算出一個分數或類別，交給人去判讀。生成式 AI：直接產生語言、建議與行動，人的角色變成審核者。', 'M8、M9 責任邊界']],
        note: '最後一列是 Phase C 的核心：當系統開始「建議行動」而不只是「給分數」，責任邊界就要重新界定。' },
      { id: 'q', label: '判斷：該選哪一邊？', quiz: [
        { t: '只有 300 筆有標註的門診資料，而且要把每個變數的係數印給臨床人員看。', o: ['傳統機器學習', '深度學習'], a: 0, w: '資料少、需要可讀的係數，正是傳統方法的場景。' },
        { t: '有大量未標註的影像，只有幾百張標註好的，想快速做出可用的分類。', o: ['傳統機器學習', '預訓練加微調'], a: 1, w: '預訓練模型已經學過表徵，少量標註微調即可。這是 M5 遷移學習的場景。' },
        { t: '系統要直接向個案提出「建議加派居服 6 小時」。哪一個問題變得最重要？', o: ['特徵怎麼選', '誰核可、誰負責', '標註多少筆'], a: 1, w: '輸出從分數變成建議行動後，核可流程與責任歸屬才是關鍵。' }],
        after: '選方法先看資料量、可解釋性需求、輸出形式；不是誰比較新就用誰。' }
    ],
    src: '圖：課程自製（典範比較）。講義 M0 第 29 頁。'
  });

  /* ④ 實例來源連結（只放確認連得到者；2026/11/13 查核） */
  const LINKS = [
    ['AMA 新聞稿：醫師 AI 使用率倍增', 'https://ama-assn.org/press-center/ama-press-releases/ama-ai-usage-among-doctors-doubles-confidence-technology-grows'],
    ['AMA：八成以上醫師專業上使用 AI', 'https://ama-assn.org/practice-management/digital-health/more-80-physicians-use-ai-professionally-ama-survey'],
    ['聯合國大學 C3：AI Index 摘要', 'https://c3.unu.edu/?p=2760'],
    ['R&D World：AI Index 報導', 'https://www.rdworldonline.com/?p=81467'],
    ['科技新報：Google 與台灣公衛 AI 藍圖', 'https://cdn.technews.tw/2026/03/04/how-google-and-taiwan-are-building-an-ai-blueprint-for-public-health/'],
    ['CIO Taiwan：健保署糖尿病 AI', 'https://www.cio.com.tw/107956/'],
    ['GeneOnline：衛福部與 Google 台灣 AI', 'https://geneonline.news/mohw-googletw-ai-026news/']];
  const ad = $('#w-adopt');
  if (ad && ad.parentNode) {
    ad.parentNode.append(h('p', { class: 'ai' }, h('b', null, '來源連結（2026/11/13 查核可開啟）：'), ...LINKS.flatMap(([t, u], i) => [i ? '　' : '', h('a', { href: u, target: '_blank', rel: 'noopener' }, t)])));
    ad.parentNode.append(h('p', { class: 'ai' }, 'STAT 等付費牆與無法開啟的報導未列。報導為第三方整理，數字以 AMA 與 AI Index 原始報告為準。'));
  }
  if (window.CaseLinks) {
    CaseLinks('w-fail', [
      ['Obermeyer et al., Science 2019（全文 PDF）', 'https://www.ftc.gov/system/files/documents/public_events/1548288/privacycon-2020-ziad_obermeyer.pdf'],
      ['Zech et al., PLOS Med 2018（arXiv 全文）', 'https://arxiv.org/pdf/1807.00431v2.pdf'],
      ['Wong et al., JAMA Intern Med 2021', 'https://jamanetwork.com/journals/jamainternalmedicine/fullarticle/2781307']
    ], '講義 M0 第 46 頁。');
    CaseLinks('w-law', [
      ['衛福部：醫療機構應用生成式人工智慧指引（2026/5/29）', 'https://www.mohw.gov.tw/cp-18-86695-1.html']
    ], '衛部醫字第 1151663164 號函。講義 M0 第 33 頁。');
    CaseLinks('w-clinic', [
      ['U.S. FDA：AI-Enabled Medical Devices List（官方清單）', 'https://www.fda.gov/medical-devices/software-medical-device-samd/artificial-intelligence-enabled-medical-devices'],
      ['衛福部：三大 AI 中心啟動記者會（2024/10/7）', 'https://www.mohw.gov.tw/cp-16-80155-1.html'],
      ['衛福部：臨床 AI 取證驗證中心聯合啟動大會（2025/7/24）', 'https://www.mohw.gov.tw/cp-16-83193-1.html']
    ], '講義 M0 第 41、43 頁。');
    CaseLinks('w-paradigm', [
      ['Grinsztajn et al., NeurIPS 2022：Why do tree-based models still outperform deep learning on typical tabular data?', 'https://arxiv.org/abs/2207.08815']
    ], '45 個結構化表格資料集實證比較。講義 M0 第 25、29 頁。');
  }
  function addNote(id, title, body) {
    const b = document.getElementById(id); if (!b || !b.parentNode) return;
    b.parentNode.append(U.h('div', { class: 'note', style: { marginTop: '10px' } }, U.h('b', null, title), body));
  }
  addNote('w-terms', '健康照護的四種模態與三道高牆：', '同一位心衰竭合併糖尿病個案同時擁有結構化檢驗（eGFR、HbA1c）、文字病歷、醫學影像與穿戴連續訊號，跨時間軸縱貫性強且介入價值密度高；但落地必須跨過三道高牆：① 標籤與樣本偏誤（「有就醫紀錄」≠「真的生病」）、② 錯誤代價不對稱（漏診放回家惡化遠大於誤報多打一通電話，必須看 Recall）、③ 可解釋與法規門檻。（講義 M0 第 14 頁）');
  addNote('w-timeline', '演進背後的三個推力：', '① 資料變多了（但醫療資料約 80% 為文字、影像、訊號等非結構化紀錄，品質與清理才是瓶頸）；② 算力變便宜了（大模型預訓練需雲端數千張 GPU，但 7B–12B 小模型在單張消費級顯卡或筆電即可用 Ollama 本地推論）；③ 演算法有突破（非結構化資料由深度學習與 Transformer 勝出，但結構化表格上決策樹與梯度提升樹仍常勝過深度學習；Grinsztajn et al., NeurIPS 2022）。（講義 M0 第 25 頁）');
  addNote('w-nest', '三種學習方式的答案從哪裡來：', '監督式學習＝歷史資料自帶人工或制度標好的標準答案 y（分類預測是否再入院、迴歸預測住院天數）；非監督式學習＝只有特徵 X 沒有答案 y，找資料本身的分群、降維主軸或異常點；自監督學習＝把句子遮住一部分讓模型自己猜被遮住的字，不靠人工逐筆標註就能讀巨量文本學會語言規律（BERT 與 GPT 預訓練的核心）。（講義 M0 第 50 頁）');
  addNote('w-nlp', '同一句病歷，兩套 NLP 管線怎麼處理（示意）：', '病歷寫「病患否認胸痛，但訴呼吸喘三日」。傳統 NLP（白箱，M6）：斷詞與詞性 → 否定詞規則看到「否認」把胸痛標為陰性 (-) → TF-IDF 詞頻矩陣（每欄權重可查）→ 分類器判讀，出錯時看得出是斷詞錯還是漏抓否定詞。現代 NLP（黑箱，M7–M8）：Tokenizer 子詞切分 → Transformer 多層自注意力直接將整句轉為 768/4096 維稠密向量 [0.14, −0.62, …] 並跨詞捕捉「否認…但…」語意 → 直接分類或生成交班摘要，效能強但需搭配 RAG 引註與人工覆核。（講義 M0 第 54 頁）');
  addNote('w-studio', 'AI Studio 畫面四個區塊與連接埠縮寫：', '① 左上 Repository 儲存庫（資料拖進畫布自動變成 Retrieve）、左下 Operators 搜尋節點；② 中央 Process 流程畫布（最後一個節點務必連到右側 res 埠，Split Data 上下兩個訓練／測試輸出別接反）；③ 右側 Parameters 參數面板（先點節點才會顯示，如 Set Role 設 label、Split Data 新增 0.8 與 0.2）；④ 上方切換 Design／Results 結果頁。節點連接埠縮寫：exa＝ExampleSet 資料表、mod＝訓練好的模型、unl＝待預測資料、lab / per / res＝預測結果／評估指標／輸出埠。（講義 M0 第 65 頁）');
  addNote('w-scope', '專案界定實例（再入院預測 vs 居家退案）：', '步驟一（使用者角度）：從技術出發把 80 個欄位全丟、用到出院結帳欄位（時間洩漏）、只給「高風險 0.84」，上線即閒置；從病房出院準備個管師出發，配合「出院前 24 小時早交班、每天最多訪視 5 床」的限制，每天早上 8 點產出「優先訪視前 5 床＋前 3 大原因」。步驟二與三（先想問題再比解法）：居家個案無預警退案，先比較 ① 電話訪談 10 位家屬（1 週・極低）、② 結案表單加填退出原因（1 個月・低）、③ 滿 14 天未派案自動提醒（2 週・低）、④ 資料科學預測模型（2–3 月・高）。步驟五（資料需求三面向）：先把「一列＝一次就診」Aggregate 彙總成「一列＝一位病人」防洩漏，盤點現成／衍生／難拿欄位，先用單一系統近 2 年 5 個核心欄位做出 MVP。（講義 M0 第 75、76、79 頁）');
  addNote('w-thread', '同一個貫穿題目走完三個階段（長照新收個案為例）：', '條件一至三：題目要小而具體、資料選公開資料集／政府開放資料／自建模擬資料（嚴禁使用實習或工作場域真實病歷個資）、寫出明確使用者職稱。條件四（三階段演進）：Phase A（W1–W6，AI Studio）用年齡、CMS 等級、ADL 分數預測三個月內服務時數是否增加逾 30%，建立邏輯斯迴歸／決策樹基準線；Phase B（W7–W10，AI Studio）同一份資料公平比較隨機森林、梯度提升與深度學習（小樣本表格簡單模型贏是正常的，說出原因就是好答案）；Phase C（W11–W16，Dify）放進長照 3.0 給付基準與照護指引，個管師輸入高風險個案情境 → RAG 檢索法規條文＋Code 節點查表試算額度。（講義 M0 第 82、83 頁）');
})();
