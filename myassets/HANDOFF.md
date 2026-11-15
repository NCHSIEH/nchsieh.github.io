# MyAssets 交接說明

網址：https://nchsieh.github.io/myassets/ （股票頁）、https://nchsieh.github.io/myassets/signals/ （燈號與體檢詳解）
程式位置：GitHub `NCHSIEH/nchsieh.github.io` 的 `myassets/` 資料夾。推到 `main` 後約 1 分鐘由 GitHub Pages 自動上線。

## 這個網站做什麼

個人用的台股／ETF「**短期預測燈號＋持股體檢**」雙軌看盤系統：
1. **未來 1日、3日、7日、14日、30日 預測燈號**：結合 12 項技術、量價（RVOL 量比）、K線型態、布林通道與籌碼（三大法人連買賣＋散戶融資沉澱）及主流媒體情緒，每日收盤隨價量即時更新。
2. **持股體檢（含主流媒體消息面与量能）**：結合基本面（營收、獲利、本益比／殖利率、配息穩定度）與每日動態（法人、成交量能、季線趨勢、主流財經媒體報導情緒）。
3. 純前端，沒有後端伺服器。

## 檔案

- `index.html`：股票清單頁（雙軌並排顯示「預測燈號」與「體檢結論」、1/3/7/14/30日預判膠囊、體檢小標籤、最新主流媒體標題摘要、管理標的、配息行事曆）。
- `signals/index.html`：燈號與體檢詳解頁（預測總表／體檢總表／12項指標總表、單檔 1/3/7/14/30日預測詳解、主流財經媒體報導列表、體檢與 12 項指標詳解）。
- `assets/core.js`：全部核心邏輯。主要區塊依序為：
  - `CONFIG`：示範清單、大盤參考（0050）、擁有者 Email。
  - `finmind()`：抓 FinMind 開放資料，結果暫存在瀏覽器 localStorage（每天分三個時段）。
  - 清單讀取與加入／刪除（`loadList`、`addTicker` 等）。
  - 主流財經媒體白名單與消息面分析（`TIER1_MEDIA`、`TIER2_MEDIA`、`NEWSMAP`、`analyzeNews`）：排除爆料同學會、PTT、Dcard、個人網誌，只保留經濟日報、工商時報、鉅亨網、中央社、財訊、今周刊、UDN、自由財經等主流媒體並判讀利多／利空。
  - 評估引擎 v3（`prep`、`buildFeatures`、`fit`、`analyze`、`assess`）：12 項技術／量價／籌碼指標，針對 1日、3日、7日、14日、30日 結合先驗專業權重與三年滾動式樣本外回測 IC 動態加權。
  - 持股體檢（`health`）：營收、獲利、本益比、殖利率、配息、法人、量能（每日更新）、趨勢（每日更新）、主流媒體消息（每日更新）。
  - `fetchOne`、`loadAll`：抓資料、還原權息、整批分析。
  - 說明小視窗（`TIPS`、`initTips`）、資料來源文字（`SOURCES_HTML`）。
- `assets/auth.js`：Firebase Google 登入與 Firestore 讀寫。
- `assets/style.css`：樣式。
- 改 `core.js`、`auth.js` 或 `style.css` 後，要把兩個 HTML 裡的 `?v=數字` 加一（目前為 `?v=15`），瀏覽器才會抓新版。

## 資料來源

- FinMind 開放 API（`https://api.finmindtrade.com/api/v4/data`，未使用 token，每小時約 300 次上限）。用到的資料集：`TaiwanStockPrice`、`TaiwanStockDividend`、`TaiwanStockInstitutionalInvestorsBuySell`、`TaiwanStockMarginPurchaseShortSale`、`TaiwanStockNews`、`TaiwanStockMonthRevenue`、`TaiwanStockPER`、`TaiwanStockFinancialStatements`、`TaiwanStockInfo`。
- 都是每日收盤後的資料（新聞為盤中至盤後持續更新）。
