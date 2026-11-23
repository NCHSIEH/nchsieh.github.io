/* M1 互動站強化（2026-11-13）：講義第 7、43、77 頁的互動版；實例來源連結 */
(function () {
  'use strict';
  const $ = U.$;
  CaseW($('#w-facts'), { tabs: [
    { id: 'f', label: '三個事實', cards: [
      ['資料準備佔 37.8%，模型相關佔 26.4%', 'Anaconda 2022 調查；2025/1 第 7 屆調查：67% 已用 AI 輔助清理、視覺化與分析。演算法已被封裝好，難的是把資料變成它吃得下的樣子。', '所以 W2–W3 兩整週都給資料工程'],
      ['模型的上限由資料決定', '同樣的演算法，餵乾淨資料與髒資料，結果可能差一倍以上。與其花時間調參數，不如回頭檢查資料。', '對你的意義：先檢查資料'],
      ['資料處理的錯誤最難發現', '程式不會報錯，模型照樣訓練完成，指標甚至可能更好看。', '本模組每一節都列「這一步做錯會怎樣」']],
      note: '三個事實連起來：時間花在資料、上限由資料決定、而資料的錯不會自己跳出來。' },
    { id: 'q', label: '判斷', quiz: [
      { t: '模型 AUC 一直上不去。第一步最該做什麼？', o: ['換更複雜的演算法', '回頭檢查資料品質', '加大調參數的範圍'], a: 1, w: '上限由資料決定，先確認資料有沒有問題。' },
      { t: '資料處理出錯時，最常見的徵兆是？', o: ['程式報錯停止', '一切正常，甚至指標更好', '模型訓練不出來'], a: 1, w: '錯誤不會報錯，這正是它最危險的地方。' }] }
  ], src: '資料：Anaconda State of Data Science 2022；第 7 屆（2025/1）。講義 M1 第 7 頁。' });

  CaseW($('#w-impfix'), { tabs: [
    { id: 'e', label: '三個錯', cards: [
      ['錯誤一：先填補再切分', '用整份資料算平均值去填補，等於把測試集的資訊帶進訓練。正確：先切分，用訓練集的統計量填補訓練集與測試集。AI Studio：把 Replace Missing Values 放進 Cross Validation 的訓練子流程，再以其 preprocessing model 套用到測試子流程。', '互動：本節「填補方式比較」；M0 第 07 節「先補值再切分」'],
      ['錯誤二：偏態分布用平均數填補', '胰島素、醫療費用這類欄位通常右偏，少數極大值會把平均拉高，用平均填補會把大量原本偏低的個案灌成中高值。看 Statistics 的平均與中位數，差很多就用中位數。貫穿資料的就診費用：平均 880 元、中位數 654 元，63% 的就診低於平均——用平均填補會把多數人灌高。', '互動：本節「填補方式比較」'],
      ['錯誤三：填補後不留紀錄', '填補是你替資料做的決定，必須可追溯。同時新增 is_missing 指示欄位，並在報告寫清楚：哪些欄位補了、補多少比例、用什麼方法、為什麼。', '作業任務的報告要求']],
      note: '三個錯對應三個習慣：先切分、看分布選方法、留下紀錄。' },
    { id: 'q', label: '判斷', quiz: [
      { t: '「胰島素」欄位平均 140、中位數 30，缺值要補。你選？', o: ['平均數 140', '中位數 30'], a: 1, w: '平均與中位數差很多代表右偏，用中位數較合理。' },
      { t: '補完值的資料表沒有留下哪些格是補的。最大的問題是？', o: ['模型跑得比較慢', '之後無法追溯與檢討這個決定', '準確率一定下降'], a: 1, w: '填補是你做的決定，要能被檢查。is_missing 欄位就是紀錄。' }] }
  ], src: '講義 M1 第 43 頁。' });

  CaseW($('#w-redflags'), { tabs: [
    { id: 'f', label: '三個警訊', cards: [
      ['Accuracy 或 AUC 超過 0.98', '真實的醫療預測問題上幾乎不存在這種數字。先假設是洩漏，逐項排查五種來源，不要先高興。例外：問題本身很簡單（如以體溫判斷發燒），但那通常不需要機器學習。本模組洩漏誘餌實驗：只用「科別」一欄 Accuracy 89.7%，只用「結案註記」一欄就是 100%。', '檢查：五種洩漏來源'],
      ['某個特徵的重要性遠高於其他', '第一名的權重是第二名的好幾倍就要警覺。常見：那欄其實是目標的另一種寫法。把它拿掉重跑，若指標暴跌，代表模型完全靠它。', '檢查：拿掉重跑'],
      ['訓練與測試分數幾乎一樣好', '正常情況測試集會略差。完全沒有落差才可疑，可能是測試集資料早已出現在訓練集（重複樣本洩漏）。貫穿資料 765 筆就診來自 300 位病人；照就診筆數隨機切 7:3，測試集約 81% 的就診，同一位病人也在訓練集。以病歷號比對兩個集合，並改成依病人切分。', '檢查：病歷號比對']],
      note: '每次做完模型後拿這三個警訊對一遍。Task 1 與兩份作業的評分都會檢查。' },
    { id: 'q', label: '判斷', quiz: [
      { t: '模型 AUC 0.99，第一個反應應該是？', o: ['慶祝並直接上線', '先假設有洩漏，逐項排查', '再加幾個特徵'], a: 1, w: '醫療預測難有這麼高，先查洩漏。' },
      { t: '特徵重要性第一名是「出院後 30 天內是否回診」，要預測的是再入院。你怎麼做？', o: ['保留，它最有用', '拿掉重跑，它是目標的另一種寫法'], a: 1, w: '那一欄預測當下拿不到，或本身就是目標，屬於洩漏。' }] }
  ], src: '講義 M1 第 77 頁。' });

  CaseLinks('w-cascade', [
    ['Sambasivan et al. 論文頁（Google Research）', 'https://research.google/pubs/pub49953/'],
    ['Google Research 部落格：Data Cascades', 'https://research.google/blog/data-cascades-in-machine-learning/']],
    '用本模組資料想一次（情境示意）：身高欄位約 5.5% 填成公尺（1.62）→ 清理時沒人檢查單位 → 算 BMI 時 65 公斤變成約 25 萬 → 模型把怪 BMI 當訊號。每一步都看起來正常，問題到上線才現形。講義 M1 第 8 頁。');

  if (window.CaseLinks) {
    CaseLinks('w-fhir', [
      ['衛福部資訊處：臺灣核心實作指引（TW Core IG，FHIR R4）', 'https://twcore.mohw.gov.tw/ig/twcore/'],
      ['衛福部資訊處：建立全臺 5,050 項國家級常用 LOINC 對照表（2026/6）', 'https://dep.mohw.gov.tw/DOIM/cp-936-87211-114.html']
    ], '講義 M1 第 15 頁。');
    CaseLinks('w-bmi', [
      ['衛福部國民健康署：成人健康體位標準（BMI 切點 18.5 / 24 / 27）', 'https://www.hpa.gov.tw/Pages/Detail.aspx?nodeid=542&pid=9737']
    ], '講義 M1 第 68 頁。');
    CaseLinks('w-leakdemo', [
      ['Kapoor & Narayanan, Patterns 2023：Leakage and the Reproducibility Crisis in ML-Based Science', 'https://arxiv.org/abs/2207.07048']
    ], '盤點 17 個科學領域近 300 篇因資料洩漏導致結果無法重現的論文。講義 M1 第 73 頁。');
  }

  function addDetails(id, title, bullets) {
    const b = document.getElementById(id); if (!b || !b.parentNode) return;
    const ul = U.h('ul', null, bullets.map(([k, v]) => U.h('li', null, U.h('b', null, k + '：'), v)));
    b.parentNode.append(U.h('details', { class: 'details-note' }, U.h('summary', null, title), U.h('div', { class: 'dn-body' }, ul)));
  }
  // 動態計算貫穿資料真實 Join 筆數，避免說明文字與互動結果矛盾
  const joinStats = (() => {
    try {
      const mRows = U.parseCSV(M1DATA.main).filter(r => r.length > 1), mh = mRows[0], pidI = mh.indexOf('病歷號');
      const seen = new Set(), uniqM = mRows.slice(1).filter(r => { const k = r.join('|'); if (seen.has(k)) return false; seen.add(k); return true; });
      const lRows = U.parseCSV(M1DATA.lab).filter(r => r.length > 1).slice(1);
      const lCnt = {}; lRows.forEach(r => { const p = r[0].trim(); lCnt[p] = (lCnt[p] || 0) + 1; });
      let leftN = 0, innerN = 0;
      uniqM.forEach(r => { const k = lCnt[r[pidI].trim()] || 0; if (k) { leftN += k; innerN += k; } else leftN += 1; });
      return { base: uniqM.length, leftN, innerN, labPats: Object.keys(lCnt).length };
    } catch (e) { return { base: 751, leftN: 1383, innerN: 1039, labPats: 160 }; }
  })();
  addDetails('w-type', '延伸閱讀：貫穿資料 765 筆的三個匯入坑（實算數字，講義第 12 頁）', [
    ['① 編碼', 'Big5 檔用 UTF-8 硬讀，縣市與科別變亂碼。'],
    ['② 型態誤判', '病歷號 P0007 讀成整數變 7（前導零消失）；就診費用有 27 筆 ≥ 1,000 元含千分位逗號，害整欄 765 筆變成 polynominal 文字；就診日混用三種日期格式。'],
    ['③ 尾端空白', '科別「內科」（237 筆）與「內科 」（24 筆）、縣市「新北市」（229 筆）與「新北市 」（29 筆），未做 Trim 前在分組與 Join 會被拆成不同類別。']
  ]);
  addDetails('w-roles', '延伸閱讀：角色（Role）分工與兩個必刪洩漏欄（講義第 19 頁）', [
    ['label（唯一答案 y）', '「再就診30天」。'],
    ['id（追溯與群組切分）', '「就診序號 V00211、病歷號 P0088」留著對帳與按病人切分，絕不進模型訓練，否則模型會硬背流水號。'],
    ['必刪洩漏誘餌', '「出院後30天門診次數、結案註記」是預測當下拿不到的欄位，必須用 Select Attributes 移除。']
  ]);
  addDetails('w-joinbig', `延伸閱讀：Join 前後四項檢查（${joinStats.base} 筆就診 × 397 筆檢驗實測，講義第 30 頁）`, [
    ['Join 前先檢查 ② ③', '先對病歷號做 Trim 去空白（檢查 ②），並確認兩表鍵值型態皆為 polynominal（檢查 ③）。'],
    ['直接 Left Join → 膨脹成 ' + joinStats.leftN.toLocaleString() + ' 筆', `160 位有檢驗的病人多數有多筆檢驗，一對多直接膨脹多出 ${(joinStats.leftN - joinStats.base).toLocaleString()} 列。`],
    ['直接 Inner Join → 變 ' + joinStats.innerN.toLocaleString() + ' 筆', `一邊丟掉 140 位沒檢驗的病人、一邊複製有檢驗的列，筆數「看似不誇張」反而更難察覺錯誤。`],
    ['正確做法（維持 ' + joinStats.base + ' 筆）', `先把檢驗表依病歷號 Aggregate／Pivot 成 ${joinStats.labPats} 人一列，再 Left Join 回主檔，140 位未檢驗者留 ?（檢查 ① ④）。`]
  ]);
  addDetails('w-mech', '延伸閱讀：三種遺失機制的因果方向與處理（講義第 35 頁）', [
    ['① MCAR（完全隨機）', '如血壓計當機半天：缺失與 X、Y 皆無關，缺失少時直接刪列不偏。'],
    ['② MAR（隨機遺失）', '如年輕人較少常規驗骨密度：缺失受「年齡 X」影響，直接刪除會讓樣本偏向年長者，可用年齡等已觀測欄位建模填補。'],
    ['③ MNAR（非隨機遺失）', '如病情輕微者不排檢驗：缺失受「看不到的值本身 Y」影響，只看有驗者平均會高估，「有沒有做這項檢查」本身就是強訊號，必加 is_missing 指示欄。']
  ]);
  addDetails('w-dup', '延伸閱讀：貫穿資料的三種重複（765 筆實算，講義第 52 頁）', [
    ['① 完全重複', '765 筆中有 14 筆整列完全相同（重送），用 Remove Duplicates（all）降為 751 筆。'],
    ['② 鍵值重複', '751 筆就診來自 300 位病人（232 人就診 ≥ 2 次），這是一對多粒度而非錯誤，病人層級建模前要依病歷號 Aggregate 成 300 列。'],
    ['③ 語意重複', '臺北市(161)、台北市(113)、台北市 (26)、TAIPEI(13) 四種寫法指同一縣市，需用 Trim＋Replace/Map 合併為 313 筆。']
  ]);
  addDetails('w-order', '延伸閱讀：五種常見洩漏來源與切分防火牆（講義第 73 頁）', [
    ['① 前處理洩漏', '切分前做 Normalize／填補／篩特徵。'],
    ['② 時間洩漏', '放入出院後30天門診次數 → Accuracy 100%。'],
    ['③ 目標洩漏', '放入結案註記 → Accuracy 100%。'],
    ['④ 重複樣本洩漏', '751 筆隨機切 7:3，測試集約 81% 就診的病人已在訓練集出現過。'],
    ['⑤ 過取樣洩漏', '切分前做 SMOTE。黃金律：把 Split / Cross Validation 當成防火牆，所有跨列算統計量或合成樣本的動作只能在訓練集做。']
  ]);
  addDetails('w-tasks', '延伸閱讀：繳交前三大自我檢查（講義第 90 頁）', [
    ['① 方法面', '填補與縮放都在切分之後、病歷號設 id、洩漏欄已移除、Join 前後對過 Statistics 筆數。'],
    ['② 報告面', '列出偽裝成 0 的遺失欄清單、附上填補前後平均／中位數／標準差對照、寫出離群值處理的臨床理由。'],
    ['③ 檔案面', '關掉 AI Studio 重開 .rmp 確認無斷線與絕對路徑錯誤、嚴禁使用真實病歷個資。']
  ]);
})();
