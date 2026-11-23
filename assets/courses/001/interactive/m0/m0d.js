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
    const D = [['GPT-1（2018）', 0.117], ['GPT-2（2019）', 1.5], ['GPT-3（2020）', 175], ['PaLM（2022）', 540], ['開源 MoE 前沿（2026，總參數）', 1600]];
    let view = 'lin'; const out = h('div');
    function draw() {
      out.innerHTML = '';
      out.append(h('div', { class: 'row' }, seg([['lin', '一般刻度（線性）'], ['log', '對數刻度（每格 10 倍）']], () => view, v => view = v, draw)));
      const d = h('div'); out.append(sub('參數量（單位：十億 B）；注意背景垂直格線的間距'), d);
      const W = 660, lw = 215, rpad = 64, rowH = 30, top = 8, bot = 26, H = top + D.length * rowH + bot;
      const sv = U.svgBox(d, W, H);
      const x = view === 'lin' ? U.scale(0, 1650, lw, W - rpad) : U.scale(-1.2, 3.3, lw, W - rpad);
      const grid = view === 'lin' ? [[0, '0'], [400, '400B'], [800, '800B'], [1200, '1,200B'], [1600, '1,600B']] : [[-1, '0.1B'], [0, '1B'], [1, '10B'], [2, '100B'], [3, '1,000B']];
      grid.forEach(([v, lbl]) => {
        const X = x(v);
        U.s('line', { x1: X, x2: X, y1: top, y2: H - bot, class: 'grid', 'stroke-dasharray': view === 'log' ? '3 3' : null }, sv);
        U.s('text', { x: X, y: H - 8, 'text-anchor': 'middle', text: lbl, style: 'font-size:11px;font-family:var(--mono)' }, sv);
      });
      D.forEach(([l, v], i) => {
        const Y = top + i * rowH, xVal = view === 'lin' ? x(v) : x(Math.log10(v)), barW = Math.max(2, xVal - lw);
        const col = i === D.length - 1 ? (C.amber || '#b7791f') : C.accent;
        U.s('text', { x: lw - 8, y: Y + rowH / 2 + 4, 'text-anchor': 'end', text: l, style: 'font-size:12px;fill:#1c2430' }, sv);
        U.s('rect', { x: lw, y: Y + 5, width: barW, height: rowH - 10, rx: 3, fill: col }, sv);
        U.s('text', { x: lw + barW + 6, y: Y + rowH / 2 + 4, text: v.toLocaleString('en-US') + ' B', style: 'font-size:11.5px;font-family:var(--mono);fill:#1c2430;font-weight:600' }, sv);
      });
      U.s('line', { x1: lw, x2: W - rpad, y1: H - bot, y2: H - bot, class: 'axis' }, sv);
      out.append(note(view === 'lin' ? '一般刻度下，2018–2020 年的模型幾乎縮成一條細線——不是它們不重要，是量級差了超過一萬倍。' : '對數刻度下，每一條虛線格線代表「放大 10 倍」（0.1B → 1B → 10B → 100B → 1,000B），五個模型才排得進同一張圖。代價是：視覺上差不多長，實際可能差 10 倍。'));
      out.append(h('p', { class: 'ai' }, '資料：代表性量級，非完整統計。GPT-1 約 1.17 億、GPT-2 15 億、GPT-3 1,750 億、PaLM 5,400 億參數（各模型論文）；2026 年開源 MoE 前沿模型以講義所引 DeepSeek-V4-Pro 總參數 1.6 兆為例（每次只啟用約 49B；2026/4 預覽版；講義查核 2026/11）。講義 M0 第 26–27 頁。'));
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
    ], '講義 M0 第 47 頁。');
    CaseLinks('w-law', [
      ['衛福部：醫療機構應用生成式人工智慧指引（2026/5/29）', 'https://www.mohw.gov.tw/cp-18-86695-1.html']
    ], '衛部醫字第 1151663164 號函。講義 M0 第 33 頁。');
    CaseLinks('w-clinic', [
      ['U.S. FDA：AI-Enabled Medical Devices List（官方清單）', 'https://www.fda.gov/medical-devices/software-medical-device-samd/artificial-intelligence-enabled-medical-devices'],
      ['衛福部：三大 AI 中心啟動記者會（2024/10/7）', 'https://www.mohw.gov.tw/cp-16-80155-1.html'],
      ['衛福部：臨床 AI 取證驗證中心聯合啟動大會（2025/7/24）', 'https://www.mohw.gov.tw/cp-16-83193-1.html'],
      ['臺灣智慧醫療三大中心官網', 'https://aicenter.mohw.gov.tw/']
    ], '講義 M0 第 42、44 頁。');
    CaseLinks('w-paradigm', [
      ['Grinsztajn et al., NeurIPS 2022：Why do tree-based models still outperform deep learning on typical tabular data?', 'https://arxiv.org/abs/2207.08815']
    ], '45 個結構化表格資料集實證比較。講義 M0 第 25、29 頁。');
  }

  /* ⑤ 講義補充：可折疊條列（消除長文字牆）＋兩組視覺化升級（NLP 病歷管線、AI Studio 畫面配置） */
  function addDetails(id, title, bullets, ref) {
    const b = document.getElementById(id); if (!b || !b.parentNode) return;
    const ul = h('ul', null, bullets.map(([k, v]) => h('li', null, h('b', null, k + '：'), v)));
    const det = h('details', { class: 'details-note' }, h('summary', null, title), h('div', { class: 'dn-body' }, ul, ref ? h('div', { class: 'ai' }, ref) : ''));
    b.parentNode.append(det);
  }
  addDetails('w-terms', '延伸閱讀：健康照護的四種模態與三道高牆（講義第 14 頁）', [
    ['四種模態', '同一位心衰竭合併糖尿病個案同時擁有結構化檢驗（eGFR、HbA1c）、文字病歷、醫學影像與穿戴連續訊號，縱貫性強且介入價值密度高。'],
    ['高牆 ① 標籤與樣本偏誤', '「有就醫紀錄」≠「真的生病」，沒就醫的弱勢族群可能直接缺席。'],
    ['高牆 ② 錯誤代價不對稱', '漏診放回家惡化遠大於誤報多打一通電話，評估不能只看 Accuracy，必須看 Recall。'],
    ['高牆 ③ 可解釋與法規門檻', '臨床端需要說得出依據，且受個資與醫材法規約束。']
  ]);
  addDetails('w-timeline', '延伸閱讀：演進背後的三個推力（講義第 25 頁）', [
    ['① 資料變多', '醫療資料約 80% 為文字、影像、訊號等非結構化紀錄，「量多」不等於「可用」，品質與清理才是瓶頸。'],
    ['② 算力變便宜', '大模型預訓練需雲端數千張 GPU，但 7B–12B 小模型在單張消費級顯卡或筆電即可用 Ollama 本地推論。'],
    ['③ 演算法突破', '非結構化資料由深度學習與 Transformer 勝出；但結構化表格上決策樹與梯度提升樹仍常勝過深度學習（Grinsztajn et al., NeurIPS 2022）。']
  ]);
  addDetails('w-nest', '延伸閱讀：三種學習方式的「答案」從哪裡來？（講義第 51 頁）', [
    ['監督式學習', '歷史資料自帶人工或制度標好的標準答案 y（分類預測再入院、迴歸預測住院天數）。'],
    ['非監督式學習', '只有特徵 X 沒有答案 y，改找資料本身的分群、降維主軸或異常點。'],
    ['自監督學習', '把句子遮住一部分讓模型自己猜被遮住的字，不靠人工逐筆標註就能讀巨量文本學會語言規律（BERT 與 GPT 預訓練核心）。']
  ]);
  addDetails('w-scope', '延伸閱讀：專案界定實例（再入院預測 vs 居家退案，講義第 76–80 頁）', [
    ['步驟一（使用者角度）', '從技術出發丟進 80 欄、混入出院結帳欄位（時間洩漏）、只給「高風險 0.84」→ 上線即閒置；改從出院準備個管師早交班限制出發，每天 8 點產出「優先訪視前 5 床＋前 3 大原因」。'],
    ['步驟二與三（先比解法）', '居家個案無預警退案，先比較 ① 電話訪談 10 位家屬（1 週・極低）、② 結案表單加填退出原因（1 個月・低）、③ 滿 14 天未派案自動提醒（2 週・低）、④ 資料科學預測模型（2–3 月・高）。'],
    ['步驟五（資料需求三面向）', '先把「一列＝一次就診」Aggregate 彙總成「一列＝一位病人」防洩漏；盤點現成／衍生／難拿欄位，先用單一系統近 2 年 5 個核心欄位做 MVP。']
  ]);
  addDetails('w-thread', '延伸閱讀：同一個貫穿題目走完三個階段（長照新收個案為例，講義第 83–84 頁）', [
    ['Phase A（W1–W6，AI Studio）', '用年齡、CMS 等級、ADL 分數預測三個月內服務時數是否增加逾 30%，建立邏輯斯迴歸／決策樹基準線。'],
    ['Phase B（W7–W10，AI Studio）', '同一份資料公平比較隨機森林、梯度提升與深度學習（小樣本表格簡單模型贏是正常的，說出原因就是好答案）。'],
    ['Phase C（W11–W16，Dify）', '放進長照 3.0 給付基準與照護指引，個管師輸入高風險情境 → RAG 檢索法規條文＋Code 節點查表試算額度。'],
    ['資料倫理提醒', '選用公開資料集、政府開放資料或自建模擬資料，嚴禁使用實習或工作場域真實病歷個資。']
  ]);

  /* 視覺化升級 A：第 06 節「同一句病歷，兩套 NLP 管線」 */
  (function nlpPipe() {
    const b = document.getElementById('w-nlp'); if (!b || !b.parentNode) return;
    let mode = 'trad'; const out = h('div', { style: { marginTop: '12px', borderTop: '1px dashed var(--line2)', paddingTop: '12px' } });
    const PIPES = {
      trad: {
        tag: '白箱 · M6 路線', col: C.accent,
        steps: [
          ['① 斷詞與詞性', '病患 / 否認 / 胸痛 / ， / 但 / 訴 / 呼吸喘 / 三日'],
          ['② 否定詞規則', '偵測到「否認」→ 將「胸痛」標記為陰性 (-)，保留「呼吸喘 (+)」'],
          ['③ TF-IDF 詞頻矩陣', '轉成可讀欄位：[胸痛_陰性: 1, 呼吸喘: 1, 三日: 1, …]'],
          ['④ 分類器判讀', '每個詞的權重都查得到；出錯時能追出是斷詞錯還是漏抓否定詞']
        ],
        summary: '每一步中間結果都看得懂、改得了規則，適合需要高度可解釋性的臨床規則檢核。'
      },
      mod: {
        tag: '黑箱 · M7–M8 路線', col: C.blue,
        steps: [
          ['① Tokenizer 子詞切分', '將整句切成子詞編號序列 [3812, 9045, 2219, …]'],
          ['② Transformer 多層自注意力', '跨詞捕捉「否認…但…」長距離語意，壓成 768–4096 維稠密向量 [0.14, −0.62, …]'],
          ['③ 直接分類或生成交班摘要', '一次輸出風險判斷與流暢摘要，但中間向量難以直接解釋，須搭配 RAG 引註與人工覆核']
        ],
        summary: '語意理解與生成能力極強，但內部是數千維數值向量，上線必須加上來源追溯與人在迴路。'
      }
    };
    function draw() {
      out.innerHTML = '';
      const p = PIPES[mode];
      const flow = h('div', { class: 'concept', style: { marginTop: '8px' } }, p.steps.map(([t, d]) => h('div', { style: { borderTop: '3px solid ' + p.col } }, h('b', null, t), h('div', { style: { fontSize: '13.5px', color: 'var(--muted)' } }, d))));
      out.append(
        h('div', { class: 'row', style: { justifyContent: 'space-between', marginBottom: '6px' } },
          h('div', null, h('b', { style: { fontSize: '14.5px' } }, '同一句病歷，兩套 NLP 管線怎麼處理？'), '　', h('code', null, '「病患否認胸痛，但訴呼吸喘三日」')),
          seg([['trad', '傳統 NLP（白箱）'], ['mod', '現代 NLP（黑箱）']], () => mode, v => mode = v, draw)),
        flow,
        h('div', { class: 'ai' }, h('span', { class: 'tag ' + (mode === 'mod' ? 'blue' : '') }, p.tag), '　', p.summary, '（講義 M0 第 55 頁）')
      );
    }
    b.parentNode.append(out); draw();
  })();

  /* 視覺化升級 B：第 08 節「AI Studio 畫面四區塊與連接埠縮寫」 */
  (function studioMap() {
    const b = document.getElementById('w-studio'); if (!b || !b.parentNode) return;
    const PORTS = [['exa', 'ExampleSet 資料表'], ['mod', '訓練好的模型'], ['unl', '待預測資料'], ['lab', '預測結果（Labeled）'], ['per', '評估指標（Performance）'], ['res', '結果輸出埠（必接！）']];
    const box = h('div', { style: { marginTop: '12px', borderTop: '1px dashed var(--line2)', paddingTop: '12px' } },
      h('div', { style: { fontWeight: 700, fontSize: '14.5px', marginBottom: '6px' } }, 'AI Studio 畫面配置與連接埠速查（講義第 66 頁）'),
      h('div', { class: 'grid3', style: { gap: '8px' } },
        h('div', { style: { border: '1px solid var(--line)', borderRadius: '8px', padding: '8px 10px', background: '#fff', fontSize: '13px' } }, h('b', { style: { color: 'var(--accent-ink)' } }, '左側面板'), h('div', null, '左上 Repository（拖資料自動變 Retrieve）'), h('div', null, '左下 Operators（關鍵字搜尋節點）')),
        h('div', { style: { border: '1.5px solid var(--accent)', borderRadius: '8px', padding: '8px 10px', background: 'var(--accent-soft)', fontSize: '13px' } }, h('b', { style: { color: 'var(--accent-ink)' } }, '中央 Process 畫布 ＋ 上方切換'), h('div', null, '上方切換 Design / Results；最後節點務必連到右側 res 埠，Split Data 上下輸出別接反。')),
        h('div', { style: { border: '1px solid var(--line)', borderRadius: '8px', padding: '8px 10px', background: '#fff', fontSize: '13px' } }, h('b', { style: { color: 'var(--accent-ink)' } }, '右側 Parameters'), h('div', null, '先點選畫布上的節點才會顯示參數（如 Set Role 設 label、Split Data 設 0.8 / 0.2）。'))),
      h('div', { class: 'row', style: { marginTop: '8px', gap: '6px' } }, h('span', { style: { fontSize: '12.5px', color: 'var(--muted)' } }, '常見連接埠縮寫：'), ...PORTS.map(([k, v]) => h('span', { class: 'tag ' + (k === 'res' ? 'amber' : 'gray') }, h('code', { style: { background: 'transparent', padding: 0, fontWeight: 700 } }, k), '＝' + v))));
    b.parentNode.append(box);
  })();
})();
