# MyAssets 交接說明

網址：https://nchsieh.github.io/myassets/ （股票頁）、https://nchsieh.github.io/myassets/signals/ （體檢詳解）
程式位置：GitHub `NCHSIEH/nchsieh.github.io` 的 `myassets/` 資料夾。推到 `main` 後約 1 分鐘由 GitHub Pages 自動上線。

## 這個網站做什麼

個人用的台股／ETF「持股體檢」：登入 Google 後看自己的清單，每檔顯示體檢結論（條件佳／正常／參半／留意）和各項檢查。純前端，沒有後端伺服器。

## 檔案

- `index.html`：股票頁（清單、體檢小標籤、管理標的、配息行事曆）。
- `signals/index.html`：體檢詳解頁（總表、單檔詳解、短期技術面預測、說明文字）。
- `assets/core.js`：全部邏輯。主要區塊依序為：
  - `CONFIG`：示範清單、大盤參考（0050）、擁有者 Email。
  - `finmind()`：抓 FinMind 開放資料，結果暫存在瀏覽器 localStorage（每天分三個時段）。
  - 清單讀取與加入／刪除（`loadList`、`addTicker` 等）。
  - 評估引擎 v2（`prep`、`buildFeatures`、`fit`、`analyze`、`assess`）：9 項技術指標、以回測決定占比、樣本外命中率。屬於「短期預測，僅供參考」。
  - 持股體檢（`health`）：營收、獲利、本益比、殖利率、配息、法人、趨勢。門檻都寫在這個函式裡。
  - `fetchOne`、`loadAll`：抓資料、還原權息、整批分析。
  - 說明小視窗（`TIPS`、`initTips`）、資料來源文字（`SOURCES_HTML`）。
- `assets/auth.js`：Firebase Google 登入與 Firestore 讀寫。
- `assets/style.css`：樣式。
- 改 `core.js`、`auth.js` 或 `style.css` 後，要把兩個 HTML 裡的 `?v=數字` 加一，瀏覽器才會抓新版。

## 資料來源

- FinMind 開放 API（`https://api.finmindtrade.com/api/v4/data`，未使用 token，每小時約 300 次上限）。用到的資料集：`TaiwanStockPrice`、`TaiwanStockDividend`、`TaiwanStockInstitutionalInvestorsBuySell`、`TaiwanStockMonthRevenue`、`TaiwanStockPER`、`TaiwanStockFinancialStatements`、`TaiwanStockInfo`。
- 都是每日收盤後的資料，不是盤中即時。

## 登入與個人清單

- Firebase 專案 `nchsieh-lms`（與個人網站共用），已啟用 Google 登入。
- 每位使用者一份文件：Firestore `myassets_users/{uid}`，欄位 `list`（自選）、`hide`（隱藏）、`sheetCsv`（自己試算表的發布網址）。規則限定只有本人能讀寫（見 repo 根目錄 `firestore.rules` 的 MyAssets 區塊；線上規則需在 Firebase Console 另行發布）。
- 擁有者帳號的 `sheetCsv` 指向 Google 試算表「2026_月配息試算表」的「看盤清單」分頁（已發布為 CSV，只含代號、名稱、類別、是否持有）。這個網址只存在 Firestore，不要寫進程式碼。

## 設計上的決定

- 顏色採台灣習慣：紅＝有利／漲，綠＝不利／跌。
- 價格一律還原權息後才計算指標。
- ETF 的法人只計外資與投信（自營商多為造市避險）。
- 技術指標回測結果：對這批標的多數與亂猜差不多，所以主畫面改用基本面體檢，短期預測收在詳解頁並標示僅供參考。
- 網站文字要白話，不要對使用者用術語；不提供買賣建議的保證用語。
