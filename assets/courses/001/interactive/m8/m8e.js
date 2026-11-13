/* M8 互動站強化（2026-11-13）：講義第 18、83、94、96 頁的互動版；Air Canada 案來源連結 */
(function () {
  'use strict';
  const $ = U.$;
  CaseW($('#w-newagent'), { tabs: [
    { id: 'a', label: '多了什麼／風險', cards: [
      ['多了什麼', 'Dify 1.16（Beta）起有獨立的 Dify Agent：在 Linux 沙盒執行，可上傳技能與檔案、連接工具與知識庫，可發布成網頁應用，也能在 Workflow 裡當可重複使用的資源；1.17 起有工作區層級技能與迴圈內人工輸入。', '功能'],
      ['風險一：權限變大', '能在沙盒裡執行程式與指令，權限比「查資料」大得多；官方提醒只提供給可信任的使用者。', '風險'],
      ['風險二：技能來源', '技能是可重複使用的指令與檔案，來源與內容要先審。', '風險'],
      ['風險三：版本更新快', '升級前先看發布說明（1.17 早期問題集中在模型外掛、技能上傳、權限與 Agent 儲存）。', '風險'],
      ['對你的專題', '課程範例仍是「Agent 節點＋工具」，概念相同；介面以你安裝的版本為準。不論哪一版，最大迭代次數、失敗分支與人工確認都要自己設。', '提醒']],
      note: '查核時點 2026/11；新版 Agent 仍是 Beta，以你安裝的版本與官方發布說明為準。' },
    { id: 'q', label: '判斷', quiz: [
      { t: '新版 Dify Agent 能在沙盒執行程式與指令。對期末專題最合理的做法是？', o: ['直接開放給所有使用者，反正是沙盒', '只給可信任的使用者，並審查技能來源、設最大迭代次數與人工確認'], a: 1, w: '權限比查資料大得多，官方提醒只提供給可信任的使用者；技能來源要先審。' }] }
  ], src: '講義 M8 第 18 頁。' });

  CaseW($('#w-topics'), { tabs: [
    { id: 'c', label: '臨床照護', cards: [
      ['化療副作用照護決策支援', 'RAG 來源引用、CTCAE 分級、多重症狀平行處理。', ''],
      ['EMT 救護處置助理', '屬地法規強制約束、線上醫療指導授權、ePCR 草案生成。', ''],
      ['智慧復健姿勢回饋', 'Patient-aware 判斷、VAS 疼痛量表閾值、安全中止流程。', '']] },
    { id: 'l', label: '長照與社區', cards: [
      ['高齡運動處方生成', 'ICOPE + FITT；風險自動降級、緊急停止指標前置。', ''],
      ['居服員 ISBAR 通報', '三位一體權責分工、人為核實、督導回饋回流。', ''],
      ['聽損輔具補助導航', '縣市政策動態權重、Fallback 透明標示、一鍵產出申請清單。', '']] },
    { id: 'e', label: '教育與公衛', cards: [
      ['校園心理危機守門員', '保護因子權重、對家長談話劇本、客觀事實與專業評估分離。', '']],
      note: '共同特徵：都是第一線人員每天遇到、目前靠經驗與紙本處理的問題。你的貫穿主線題目應該在第 1 週就選定，這裡只是把它做成 Agent。' }
  ], src: '講義 M8 第 83 頁。' });

  CaseW($('#w-pickwhich'), { tabs: [
    { id: 't', label: '五種需求', cards: [
      ['衛教問答機器人＋知識庫', '用 Dify：內建 RAG，半天完成；n8n 要自己接向量庫，兩三天。', '★ Dify'],
      ['每天 08:00 抓資料寄報表', '用 n8n：排程節點拉一下就好；Dify 1.10 起有排程觸發，但串接較費工。', '★ n8n'],
      ['表單提交後 AI 摘要並存檔', '用 n8n：Webhook＋Sheets 節點現成；Dify 要自己寫 webhook 與寫回。', '★ n8n'],
      ['多輪對話的個案評估助理', '用 Dify：Chatflow 直接支援對話歷史；n8n 要自己管 session 狀態。', '★ Dify'],
      ['兼具 AI 與整合的完整系統', 'Dify 單用 AI 強但整合弱，n8n 單用整合強但 AI 弱。', '★ 兩者串接']],
      note: '這張表可當期末專題選型參考。多數專題落在第一列與第四列，所以課程主軸放 Dify。' },
    { id: 'q', label: '判斷', quiz: [
      { t: '「表單提交後，AI 摘要並寫回試算表」主要工作是整合與寫回。較合適的起點？', o: ['n8n（Webhook＋Sheets 節點現成）', 'Dify（要自己寫 webhook 與寫回）'], a: 0, w: '整合為主的需求用 n8n；AI 推理再交給 Dify 呼叫即可。' }] }
  ], src: '講義 M8 第 94 頁。' });

  CaseW($('#w-n8ntips'), { tabs: [
    { id: 'e', label: '環境', cards: [
      ['比 Dify 輕', '單一 Docker 容器、2 GB RAM 即可；Dify 要 docker-compose 起 8 個服務、4 GB 起跳。', ''],
      ['雲端版', '可直接註冊試用，不想自架也行。', '']] },
    { id: 'n', label: '節點＋憑證', cards: [
      ['節點', '一個動作（讀試算表、發訊息）。', ''],
      ['憑證 Credentials', '存放各服務的授權。★ 憑證絕不寫在節點參數裡，匯出流程時才不會外洩。', '★'],
      ['AI Agent 節點', '基於 LangChain，可掛工具與記憶。', '']] },
    { id: 'p', label: '課程定位', cards: [
      ['不列入必修', '也不列入期末專題評分項目，屬於【自學】層級。', ''],
      ['補充教材', '《n8n 入門與 AI Agent 實作》含兩個完整範例，供自學。', '']],
      note: '本節為 2026 年 7 月查證之工具現況；此領域變動快，以官方文件為準。' }
  ], src: '講義 M8 第 96 頁。' });

  CaseW($('#w-nogen'), { tabs: [
    { id: 'w', label: '為什麼／怎麼做／怎麼驗證', cards: [
      ['為什麼', '給付金額、藥物劑量、風險分數這類數字，是幻覺傷害最大的地方：看起來就像正確答案，沒有徵兆告訴你是編的；使用者不會去查證每個數字，尤其在急迫的臨床情境。', '規則'],
      ['怎麼做', '數字一律來自「檢索」或「工具計算」，不可由 LLM 生成。Dify：知識庫召回原文、Code 節點計算、或串查表 API；Prompt 明確禁止「自行計算或推估任何金額與劑量」。', '做法'],
      ['怎麼驗證', '同一個問題問五次，看數字會不會變，會變的就是生成的；輸出強制標註來源段落讓使用者核對。這是專題驗收檢查項目之一。', '驗收']],
      note: '課程範例：CMS Workflow - case assessment-01.yml 示範如何把「判定」與「查表」分開處理。' },
    { id: 'q', label: '判斷', quiz: [
      { t: '同一個問題問五次，LLM 給的金額每次略有不同。這代表什麼？', o: ['數字是生成的，應改由檢索或程式計算', '再把 Temperature 調低就解決了'], a: 0, w: '會變的數字就是生成的；規則是數字不由 LLM 生成。' }] }
  ], src: '講義 M8 第 48 頁。' });

  CaseW($('#w-tracefive'), { tabs: [
    { id: 't', label: '五個欄位', cards: [
      ['節點執行順序', '看流程實際走了哪條路。走了沒預期的分支 → 條件設錯。', ''],
      ['各節點輸入／輸出', '看變數有沒有正確傳遞。下游收到空值 → 變數綁定錯誤。', ''],
      ['召回結果', '看召回了哪幾段、分數多少。正確段落沒被召回 → 調切塊或閾值。', ''],
      ['Agent 的思考過程', 'Thought → Call Tool → Observation。沒有調用工具 → 工具描述太模糊。', ''],
      ['Token 消耗與耗時', '看哪個節點最貴、最慢。單一節點暴增 → 檢查 Top-K 或 Prompt 長度。', '']],
      note: '期末專題要求附上 Tracing 截圖，展示 Agent 某次測試的完整軌跡（Thought → Call Tool → Output → Final Answer）。' },
    { id: 'q', label: '判斷', quiz: [
      { t: 'Tracing 顯示下游節點收到空值。最先該懷疑什麼？', o: ['變數綁定錯誤', '切塊大小太大'], a: 0, w: '下游收到空值是變數綁定錯誤的典型徵兆。' }] }
  ], src: '講義 M8 第 72 頁。' });

  CaseLinks('w-aircan', [
    ['裁決全文（BC Civil Resolution Tribunal）', 'https://decisions.civilresolutionbc.ca/crt/crtd/en/525448/1/document.do'],
    ['McCarthy Tétrault 案例評析', 'https://www.mccarthy.ca/en/insights/blogs/techlex/moffatt-v-air-canada-misrepresentation-ai-chatbot']
  ], '案號 Moffatt v. Air Canada, 2024 BCCRT 149；2024/2/14 裁決。');
  CaseLinks('w-updoc', [
    ['Innolitics：UpDoc 清了什麼（2026/6/25）', 'https://innolitics.com/articles/updoc-fda-cleared-ai-agent/'],
    ['HLTH：UpDoc 發表首件 FDA 核准的病人端 LLM（2026/7/2）', 'https://hlth.com/insights/news/updoc-debuts-first-fda-cleared-patient-facing-clinical-llm-for-insulin-management']
  ], 'FDA 510(k) K253281，2025/12/23 核准；公開報導指出劑量決定仍在確定性演算法內，LLM 只負責對話介面。');
})();
