/* ==========================================================================
   刪除 Firebase Authentication 帳號（Vercel serverless function）

   為什麼需要這支獨立的小程式：
   瀏覽器端的 Firebase SDK 只能刪除「目前登入中那個人自己的帳號」，沒有辦法
   讓管理者刪除別人的帳號——那需要 Firebase Admin SDK，而 Admin SDK 的金鑰
   權限極高（能刪除/新增任何帳號、讀寫所有 Firestore 資料），絕對不能放進
   瀏覽器程式碼裡。所以金鑰放在這裡（Vercel 的環境變數，只有伺服器端看得到），
   前端網站只呼叫這支函式的網址，不會接觸到金鑰本身。

   安全機制：
   呼叫者必須附上自己目前登入的 Firebase ID Token，這支函式會先跟 Google
   驗證這個 Token 是真的、Email 已驗證、而且在管理者名單內，才會真的執行刪除。
   光知道這支函式的網址沒有用——沒有合法的管理者登入憑證就會被拒絕。
   ========================================================================== */

// 用 firebase-admin 的新式模組化匯入（而非舊式 require('firebase-admin')），
// 避開它在 Vercel 的打包環境下 require() 互通性有問題、導致 admin.apps 讀不到的已知 bug。
const { initializeApp, cert, getApps } = require('firebase-admin/app');
const { getAuth } = require('firebase-admin/auth');

if (!getApps().length) {
  initializeApp({
    credential: cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY))
  });
}

// 跟 assets/js/config.js 的 ADMIN_EMAILS 保持一致；用逗號分隔存在環境變數裡
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '')
  .split(',')
  .map(s => s.trim().toLowerCase())
  .filter(Boolean);

// 只允許從你自己的網站呼叫，擋掉其他網站盜用這支函式
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'https://nchsieh.github.io';

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', ALLOWED_ORIGIN);
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') { res.status(204).end(); return; }
  if (req.method !== 'POST') { res.status(405).json({ error: '不支援的請求方法' }); return; }

  try {
    const { uid, idToken } = req.body || {};
    if (!uid || !idToken) {
      res.status(400).json({ error: '缺少 uid 或 idToken' });
      return;
    }

    // 驗證這個 ID Token 真的是 Google 簽發的，而且沒有過期、沒有被竄改
    const decoded = await getAuth().verifyIdToken(idToken);

    if (!decoded.email || !decoded.email_verified) {
      res.status(403).json({ error: 'Email 尚未驗證，無權限執行此操作' });
      return;
    }
    if (!ADMIN_EMAILS.includes(decoded.email.toLowerCase())) {
      res.status(403).json({ error: '這個帳號不在管理者名單中' });
      return;
    }

    await getAuth().deleteUser(uid);
    res.status(200).json({ ok: true });
  } catch (err) {
    console.error('[delete-student]', err);
    // Firebase 找不到這個 uid 時視為「已經刪除過了」，不當成錯誤
    if (err && err.code === 'auth/user-not-found') {
      res.status(200).json({ ok: true, note: '帳號本來就不存在，視為已刪除' });
      return;
    }
    res.status(500).json({ error: err.message || '刪除失敗，請稍後再試' });
  }
};
