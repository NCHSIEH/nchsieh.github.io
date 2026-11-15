/* M10 互動站強化（2026-11-15）：對應講義第 5、10、15、17、30、32–33、37–38、41、46–47、51、53、58、60 頁與實測 HTTP 200 一級文獻連結 */
(function () {
  'use strict';
  const $ = U.$;
  CaseW($('#w-ai3'), { tabs: [
    { id: 'a', label: '三件事', cards: [
      ['① 先複述它的理解', '好的工具會先說「我理解你要做的是⋯，我打算這樣實作⋯」。請認真讀，理解錯了在這裡糾正，比做完再改省事十倍。沒主動複述就要求：「開始前，請先說明你的實作計畫」。', '分水嶺'],
      ['② 產出程式碼', '單一 HTML 檔會直接給完整一份；用框架則建立整個專案資料夾。', ''],
      ['③ 說明怎麼執行', '單一 HTML 檔直接雙擊開啟；沒說就問：「我要怎麼在本機執行看看？」', '']],
      note: '多數失敗的 vibe coding，問題都出在「AI 理解錯了但你沒發現，等它做完一大堆才知道」。' },
    { id: 'q', label: '判斷', quiz: [
      { t: 'AI 收到第一個指令就開始大量產出程式碼，沒有複述理解。你應該？', o: ['等它做完再整份檢查', '要求它先說明實作計畫，確認理解無誤再繼續'], a: 1, w: '第一步是分水嶺；理解錯了越早糾正越省事。' }] }
  ], src: '講義 M10 第 33 頁。' });

  CaseW($('#w-five10'), { tabs: [
    { id: 'f', label: '五個情境', cards: [
      ['① 邊界值', 'CMS 最低第 2 級、最高第 8 級。很多錯誤只在邊界出現（例如查表用 < 而不是 <=）。', ''],
      ['② 每種組合都試一次', '7 個等級 × 3 種身分別 = 21 種組合；點一點只要三分鐘，會抓到大部分錯誤。', ''],
      ['③ 手機畫面', '瀏覽器開發者工具切換手機尺寸（F12 → 裝置模擬），或直接用手機開本機檔案。', ''],
      ['④ 用不會用電腦的人的方式測', '什麼都不選就按送出會怎樣？重複點很多次會怎樣？', ''],
      ['⑤ 免責聲明有沒有真的顯示', '這是課程要求，別漏了。', '']] },
    { id: 'q', label: '判斷', quiz: [
      { t: '試算器查表程式用 < 而不是 <=。哪一種測試最容易抓到？', o: ['邊界值測試（最低與最高級別）', '手機畫面測試'], a: 0, w: '很多錯誤只在邊界出現。' }] }
  ], src: '講義 M10 第 38 頁。' });

  CaseLinks('w-metr', [
    ['METR 2025 RCT 原始論文（arXiv:2507.09089）', 'https://arxiv.org/abs/2507.09089']
  ], '16 位資深開源開發者、246 個任務隨機對照實驗：預期快 24%、自評快 20%，實際量測慢 19%。');
  CaseLinks('w-mcp', [
    ['Model Context Protocol (MCP) Official Spec', 'https://modelcontextprotocol.io/']
  ]);
  CaseLinks('w-git', [
    ['GitHub Pages Official Docs', 'https://docs.github.com/en/pages']
  ]);
  CaseLinks('w-routes', [
    ['OpenAI Agents SDK', 'https://openai.github.io/openai-agents-python/'],
    ['LangGraph (LangChain)', 'https://langchain-ai.github.io/langgraph/'],
    ['PydanticAI', 'https://ai.pydantic.dev/']
  ], '四個主流 Python Agent 框架；核心永遠是「@tool 確定性查表 ＋ System Prompt ＋ max_turns 護欄」。');

  function addNote(id, title, body) {
    const b = document.getElementById(id); if (!b || !b.parentNode) return;
    b.parentNode.append(U.h('div', { class: 'note', style: { marginTop: '10px' } }, U.h('b', null, title), body));
  }
  addNote('w-stuck', '升級順序：', '① 給足證據（先用這招）→ 證據給齊仍改錯，② 要它先解釋再動手 → 連改三次還是壞，③ git 退回上一個可運行的 commit、換說法重述 → 仍卡住，④ 換模型或工具。（講義 M10 第 25 頁）');
  addNote('w-spec', '五行規格＋查表缺一不可（講義 p30、p32）：', '① 做什麼 ② 給誰用（必寫手機也能正常顯示）③ 輸入什麼 ④ 輸出什麼 ⑤ 技術限制（純前端單一 HTML、不接 DB）；並附上完整給付額度查表與「先複述實作計畫」護欄。');
  addNote('w-calc', '標準答案要自己先算：', '用滿額度時的自負額＝額度 × 比率。例：第 5 級一般戶 24,100 × 16%＝3,856、中低收 1,205。注意 28,070 × 5%＝1,403.5、32,090 × 5%＝1,604.5——四捨五入是 1,404、1,605，無條件捨去是 1,403、1,604；進位規則要寫進指令再驗算。（講義 M10 第 38 頁有 21 格完整答案）');
  addNote('w-git', '空庫＋存檔點心法（講義 p41）：', 'GitHub 建新庫切記不要勾選 README / .gitignore，否則首次 push 會衝突；每次改完小功能就 git add . && git commit，讓 Git 成為你放手讓 AI 改程式的時光機存檔點。');
  addNote('w-seven', '30 分鐘端到端節奏（講義 p47）：', '① 想清楚 5m → ② 第一指令 1m → ③ 看懂資料夾 3m → ④ 三輪小步迭代 10m → ⑤ 本機 21 格驗算 3m → ⑥ GitHub 3m → ⑦ 手機實測公開網址 5m。');
  addNote('w-dfail', '先看哪裡：', '一片空白 → 瀏覽器 F12 的 Console（常見主程式檔 404，多半是 publish directory 沒填 dist）；圖片讀不到 → Network（404 代表路徑錯，改相對路徑或放 public/）；推了沒更新 → 平台 Deploys 頁的建置記錄，或用無痕視窗排除快取。（講義 M10 第 46 頁）');
  addNote('w-replit', '時間軸：', '12 天公開實驗的第 9 天，宣告凍結後代理仍對正式資料庫下指令，刪除 1,206 位主管、1,196+ 家公司資料；代理宣稱無法還原（錯的）；7/19 使用者自己用回溯救回；7/20 執行長道歉，承諾開發與正式資料庫分開。（講義 M10 第 51 頁）');
  addNote('w-when', '綠燈 vs 紅燈（講義 p53）：', '✔ 綠燈：衛教試算器、教學原型、單一 HTML、無個資腳本；✘ 紅燈：醫院正式掛號/開藥、含真實 PHI 個資、直接連正式資料庫寫入權限。');
  addNote('w-guard', 'Python 版必補護欄（講義 p60、p63）：', '@tool 鎖住確定性查表（對應 M8 Code 節點）＋ instructions 寫明不推算金額與附免責聲明 ＋ max_turns=5 防止錯誤工具呼叫無限迴圈燒錢。');
})();
