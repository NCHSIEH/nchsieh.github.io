/* M0 第二輪內容強化與進階優化同步（2026-11-25）：醫院導入生成式 AI 五關（講義第 34 頁）、Auto MPG 實證對照（第 73 頁）、健康資料來源地圖與「一列是什麼」（第 83、89 頁） */
(function () {
  'use strict';
  const { h, seg, $ } = U;

  /* ① 衛福部醫療生成式 AI 指引：五關 */
  CaseW($('#w-gai5'), {
    tabs: [
      { id: 'gate', label: '五道關卡', kpis: [['函頒日期', '2026/5/29'], ['核心原則', '5 項'], ['點名風險', '6 類'], ['AI Agent', '本版排除', 'warn']],
        cards: [
          ['① 主責與風險辨識', '指派主責單位或人員；導入前建立院內 AI 產品與系統清冊，依「系統可靠性」與「臨床影響」分級。例：AI 草擬出院摘要由醫務部主責，列為病歷撰寫輔助、中度影響。', 'M0 第 34 頁'],
          ['② 資安與資料保護', '盤點資料流向與存取權限；委外合約寫明病人資料不得外洩或轉作他用。例：病歷留在院內，廠商不得拿去訓練模型。', 'M1 資料治理、M9'],
          ['③ 系統整合與作業持續', '接進既有系統；事先規劃系統失效或緊急停用時的替代流程。例：AI 當機時退回醫師自行撰寫。', 'M8 部署'],
          ['④ 負責任的組織文化', '人工監督與專業確認；告知病人與家屬 AI 的參與範圍、用途與限制。例：醫師逐句核對後才簽章。', 'M8 人在迴路'],
          ['⑤ 持續監控與改進', '定期稽核正確性、偏誤與臨床適用性；監測指標可含錯誤類型與發生率、醫師手動修改頻率；出事可暫停、限縮、回復或停用。', 'M9 監測與停用']] },
      { id: 'risk', label: '6 類風險',
        cards: [
          ['基礎模型', '模型本身的偏差與限制；換版後行為可能改變，所以要問廠商用的是哪個模型、哪一版。', 'M7'],
          ['資料來源', '來源越複雜，輸出越難保證可靠；要看來源的多元性、時效性與可靠性。', 'M1'],
          ['輸出結果', '幻覺、捏造文獻、漏掉關鍵資訊；資料來源複雜的系統要讓使用者查得到原始出處。', 'M8 RAG 引註'],
          ['資安攻擊', '提示詞注入、資料外洩；廠商要說明資安防護與事件通報機制。', 'M9'],
          ['使用者依賴', '用久了不再核對；監測「醫師手動修改的頻率」可以看出是否過度依賴。', 'M9'],
          ['服務中斷', '雲端服務停擺時病房怎麼辦；導入前就要有替代流程與復原程序。', 'M8']] },
      { id: 'quiz', label: '判斷題：卡在哪一關？',
        quiz: [
          { t: '院長問「院內到底有幾套生成式 AI 在用？」，沒人答得出來。', o: ['① 主責與風險辨識', '③ 系統整合', '⑤ 持續監控'], a: 0, w: '指引要求導入前先建清冊並分級，第一關就沒做。' },
          { t: '廠商合約沒寫病歷能不能拿去訓練他們的模型。', o: ['② 資安與資料保護', '④ 組織文化', '⑤ 持續監控'], a: 0, w: '資料流向與用途限制要寫進委外合約。' },
          { t: 'AI 摘要系統當機一整個上午，病房不知道出院摘要該怎麼寫。', o: ['① 主責與風險辨識', '③ 系統整合與作業持續', '⑤ 持續監控'], a: 1, w: '失效時的替代流程要在導入前就規劃好。' },
          { t: '住院醫師把 AI 草稿直接簽出，沒有逐句核對。', o: ['② 資安', '④ 負責任的組織文化', '⑤ 持續監控'], a: 1, w: '人工監督與專業確認屬第④關。' },
          { t: '上線半年，沒人統計過錯誤率，也不知道醫師改了多少。', o: ['③ 系統整合', '④ 組織文化', '⑤ 持續監控與改進'], a: 2, w: '錯誤率、醫師修改頻率都是指引列的監測指標。' },
          { t: '新系統會自己幫病人改掛號、開檢查單，醫院想照這份指引導入。', o: ['照五關走就好', '本指引不適用，AI Agent 已排除'], a: 1, w: '會自主決定並採取行動的 AI 代理，本版指引先排除；醫事司 2026/10 表示下一階段要回應。M8 做 Agent 時要自己補上護欄。' }],
        after: '五關裡有三關（③④⑤）在模型上線之後才開始——和第 35 頁「從資料到決策每一層都在流失」是同一件事：準確率只是開始。' }],
    src: '資料：衛福部「醫療機構應用生成式人工智慧指引」（2026/5/29 衛部醫字第 1151663164 號函）；iThome 2026/11 報導醫事司說明。例子為情境示意。講義 M0 第 34 頁。'
  });
  (function () {
    const g = $('#w-gai5'); if (!g || !g.parentNode) return;
    const L = [['衛福部：醫療機構應用生成式人工智慧指引（2026/5/29）', 'https://www.mohw.gov.tw/cp-18-86695-1.html'],
      ['iThome：醫事司談指引下一階段與 AI Agent', 'https://www.ithome.com.tw/news/180379']];
    g.parentNode.append(h('p', { class: 'ai' }, h('b', null, '來源連結（2026/11/23 查核）：'), ...L.flatMap(([t, u], i) => [i ? '　' : '', h('a', { href: u, target: '_blank', rel: 'noopener' }, t)])));
  })();

  /* ② 健康資料來源地圖＋「一列是什麼」 */
  const box = $('#w-datamap'); if (!box) return;
  const SRC = {
    open: ['今天就能下載', [
      ['UCI Diabetes 130-US Hospitals', '美國 130 家醫院 1999–2008 糖尿病住院紀錄；101,766 筆、47 欄，可做 30 天再入院分類。', 'https://doi.org/10.24432/C5230J'],
      ['MIMIC-IV Demo（PhysioNet）', '100 位加護病人，表格結構與完整版相同；開放授權，不含病歷文字。', 'https://physionet.org/content/mimic-iv-demo/'],
      ['Kaggle 健康資料集', '先看授權與原始出處；二手整理版常缺欄位說明。', '']]],
    agg: ['只有彙總統計', [
      ['政府資料開放平臺', 'data.gov.tw；多為縣市、年齡層的彙總數字，不是一人一列。', 'https://data.gov.tw/'],
      ['衛福部統計處、國健署健康監測', '盛行率、就醫率、死因等統計表。', ''],
      ['怎麼用', '寫 Phase A 的現況背景；替模擬資料找合理的分布。', '']]],
    apply: ['要申請（本課不用）', [
      ['MIMIC-IV 完整版', '需 PhysioNet 認證、人體研究訓練、簽資料使用協議。', ''],
      ['衛福部衛生福利資料科學中心', '健保申報、癌登、死因等假名化資料；限機關申請、需 IRB，只能在安全作業環境分析，只攜出審查過的統計結果。', '']]]
  };
  let cat = 'open', mode = 'adm';
  const out = h('div'); box.append(out);
  // 模擬：300 位病人，每人住院 1–4 次（平均約 1.4 次，接近 Diabetes 130 的 101,766／約 7.15 萬）
  const r = U.rng(20261123), N = 300, pts = [];
  for (let i = 0; i < N; i++) { const u = r(); pts.push(u < 0.72 ? 1 : u < 0.9 ? 2 : u < 0.97 ? 3 : 4); }
  const adm = []; pts.forEach((k, i) => { for (let j = 0; j < k; j++) adm.push(i); });
  const admTest = adm.map(() => r() < 0.2), patTest = pts.map(() => r() < 0.2);
  function stats() {
    const isTest = (a, i) => mode === 'adm' ? admTest[i] : patTest[a];
    const trainP = new Set(), testRows = [];
    adm.forEach((p, i) => { if (isTest(p, i)) testRows.push(p); else trainP.add(p); });
    const seen = testRows.filter(p => trainP.has(p)).length;
    return { isTest, nTest: testRows.length, seen, pct: testRows.length ? seen / testRows.length * 100 : 0 };
  }
  function strip(st) {
    const NS = 'http://www.w3.org/2000/svg', W = 840, cols = 60, cw = W / cols, svg = document.createElementNS(NS, 'svg');
    svg.setAttribute('viewBox', `0 0 ${W} 120`); svg.setAttribute('width', '100%');
    let idx = 0;
    for (let p = 0; p < cols; p++) {
      const rows = []; for (let j = 0; j < pts[p]; j++) rows.push(idx++);
      const sides = rows.map(i => st.isTest(p, i)); const mixed = sides.some(x => x) && sides.some(x => !x);
      if (mixed) { const bg = document.createElementNS(NS, 'rect'); Object.entries({ x: p * cw + 1, y: 4, width: cw - 2, height: 112, rx: 4, fill: '#fde8e6' }).forEach(([k, v]) => bg.setAttribute(k, v)); svg.append(bg); }
      rows.forEach((i, j) => { const c = document.createElementNS(NS, 'circle'); Object.entries({ cx: p * cw + cw / 2, cy: 100 - j * 22, r: 7, fill: sides[j] ? '#d97706' : '#2b6cb0' }).forEach(([k, v]) => c.setAttribute(k, v)); svg.append(c); });
    }
    return svg;
  }
  function draw() {
    out.innerHTML = '';
    out.append(h('div', { class: 'row' }, seg([['open', '✓ 今天就能下載'], ['agg', '◐ 只有彙總統計'], ['apply', '✗ 要申請（本課不用）']], () => cat, v => cat = v, draw)));
    const [, list] = SRC[cat];
    list.forEach(([t, d, u]) => out.append(h('div', { style: { border: '1px solid var(--line)', borderRadius: '10px', padding: '8px 14px', marginTop: '8px', background: 'var(--paper)' } },
      h('b', null, t), u ? h('a', { href: u, target: '_blank', rel: 'noopener', style: { marginLeft: '8px', fontSize: '13px' } }, '開啟') : '', h('div', { style: { fontSize: '14px', marginTop: '2px' } }, d))));
    out.append(h('h4', { style: { margin: '18px 0 4px' } }, '下載之後第一件事：一列是什麼？'));
    out.append(h('p', { class: 'hint' }, '模擬 300 位病人、每人住院 1–4 次。藍點＝訓練集、橙點＝測試集；一欄是一位病人（只畫前 60 位），粉紅底＝同一人同時出現在訓練與測試。'));
    out.append(h('div', { class: 'row' }, seg([['adm', '依「住院」隨機切分 80／20'], ['pat', '依「病人」切分 80／20']], () => mode, v => mode = v, draw)));
    const st = stats();
    out.append(h('div', { class: 'kpi', style: { margin: '10px 0' } },
      h('div', null, h('div', { class: 'k' }, '住院筆數／病人數'), h('div', { class: 'v' }, adm.length + '／' + N)),
      h('div', null, h('div', { class: 'k' }, '測試集筆數'), h('div', { class: 'v' }, String(st.nTest))),
      h('div', null, h('div', { class: 'k' }, '測試集中「訓練時見過的病人」'), h('div', { class: 'v' + (st.pct > 0 ? ' warn' : '') }, st.pct.toFixed(1) + '%'))));
    out.append(strip(st));
    out.append(h('div', { class: 'note', style: { marginTop: '10px' } }, h('b', null, '看懂了什麼：'),
      mode === 'adm' ? `依住院切分時，測試集 ${st.nTest} 筆裡有 ${st.seen} 筆（${st.pct.toFixed(1)}%）屬於訓練時已經見過的病人——模型可能是「認得這個人」而不是學會規律，測試分數會偏樂觀。`
        : `改依病人切分後，同一人的所有住院都在同一邊，測試集「見過的病人」是 0%，分數才代表面對新病人的表現。Diabetes 130 實際上 101,766 筆住院只來自約 7.15 萬位病人，切分前要先決定「一列＝一次住院還是一位病人」（講義第 83 頁）。`));
    out.append(h('p', { class: 'ai' }, '資料來源說明見講義 M0 第 89 頁。病人與住院次數為模擬資料（固定亂數種子）；Diabetes 130 筆數取自 UCI 資料頁，病人數取自使用該資料集的論文描述。'));
  }
  draw();

  /* ③ Auto MPG 實證對照與經典文獻連結（講義第 53、61、73、100–101 頁） */
  function addDetails(id, title, bullets) {
    const b = document.getElementById(id); if (!b || !b.parentNode) return;
    const ul = h('ul', null, bullets.map(([k, v]) => h('li', null, h('b', null, k + '：'), v)));
    b.parentNode.append(h('details', { class: 'details-note' }, h('summary', null, title), h('div', { class: 'dn-body' }, ul)));
  }
  addDetails('w-mpgreal', '延伸閱讀：UCI Auto MPG（392 輛車）進 AI Studio 的三個關鍵發現（講義第 73 頁）', [
    ['① 永遠要報基準線', '80/20 切分下，全部瞎猜訓練集平均（23.4 mpg）的基準線 RMSE = 7.8；只放車重降為 RMSE = 4.3（R² = 0.69）；6 數值欄＋產地虛擬變數降為 RMSE = 3.3（R² = 0.82，誤差減半）。'],
    ['② 非線性彎曲與對數轉換', '車重 1,613–5,140 磅對油耗呈曲線下降，直線在極輕與極重兩端皆低估；對目標取 log(mpg) 後彎曲拉直，測試集 R² 再升至 0.87（預告 M2 特徵轉換）。'],
    ['③ 代理變數陷阱（相關 ≠ 因果）', 'model year 係數約 +0.75（每晚一年多跑 0.75 mpg），背後真因是 1973、1979 石油危機與美國 CAFE 燃油法規迫使車廠造輕型小車，而非時間本身讓引擎省油。'],
    ['④ 真實欄位預告 W2–W3 資料工程', '原始 398 筆中馬力有 6 筆缺值、車名 name 為純文字識別碼應排除、產地 origin 為類別需轉虛擬變數——完成版 .rmp 已把完整前處理與 10 折 CV 接好。']
  ]);
  if (window.CaseLinks) {
    CaseLinks('w-simpson', [
      ['Charig et al., BMJ 1986：腎結石開放手術 vs 經皮取石辛普森悖論原始論文（PMC 全文）', 'https://pmc.ncbi.nlm.nih.gov/articles/PMC1339981/']
    ], '對應講義 M0 第 47、101 頁參考文獻 [28]。');
    CaseLinks('w-mpgreal', [
      ['Quinlan (1993)：UCI Auto MPG Dataset 官方資料集頁（DOI）', 'https://doi.org/10.24432/C5859H']
    ], '對應講義 M0 第 73、101 頁參考文獻 [30]。');
  }
})();
