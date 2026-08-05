# nchsieh-admin-api

一支只有一個功能的 Vercel serverless function：讓後台「刪除學生」時，可以真的把
Firebase Authentication 裡的帳號也刪掉（不然預設只會刪 Firestore 紀錄）。

跟主網站（`nchsieh.github.io`，GitHub Pages）完全分開部署，這裡才是唯一存放
Firebase Admin SDK 金鑰的地方，主網站的前端程式碼永遠碰不到這把金鑰。

完整設定步驟見專案根目錄的 `FIREBASE_SETUP.md` →「刪除學生時一併刪除 Firebase 帳號」章節。

## 本機測試（選用）

```bash
npm install
vercel dev
```

## 部署

```bash
npm install -g vercel   # 只需要裝一次
vercel login            # 只需要登入一次
vercel --prod
```

部署前記得先在 Vercel 專案設定裡加好這兩個環境變數：

- `FIREBASE_SERVICE_ACCOUNT_KEY`：Firebase Console 下載的服務帳戶金鑰 JSON，整包貼進去（一行）
- `ADMIN_EMAILS`：管理者信箱，多筆用逗號分隔，例如 `nchsieh@gmail.com`

部署完成後會拿到一個網址（例如 `https://xxxx.vercel.app`），把它加上
`/api/delete-student`，貼到 `assets/js/config.js` 的 `DELETE_USER_API_URL`。
