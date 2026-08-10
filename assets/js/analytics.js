/* ==========================================================================
   訪客瀏覽紀錄 — 供後台「訪客統計」使用

   設計原則：
   1. 絕對不能因為這支程式出錯或被廣告攔截器擋掉而影響網站本身，
      所以所有動作都包在 try/catch 裡靜默失敗。
   2. 每次頁面載入只記一筆，不追蹤停留時間、滑鼠移動等細節——
      這是小型課程網站的流量統計，不是行為分析工具。
   3. 訪客身分用瀏覽器 localStorage 存一組隨機 ID 長期識別「同一台裝置／瀏覽器」，
      並非個人身分；已登入的學生／管理者則會一併記下姓名、Email，方便判讀。
   ========================================================================== */

import { db, firebaseReady } from './data.js';
import {
  collection, addDoc, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const VISITOR_KEY = 'nchsieh.visitorId';

function getVisitorId() {
  try {
    let id = localStorage.getItem(VISITOR_KEY);
    if (!id) {
      id = (crypto.randomUUID ? crypto.randomUUID() : `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`);
      localStorage.setItem(VISITOR_KEY, id);
    }
    return id;
  } catch {
    // 無痕模式或封鎖儲存空間時，退回單次隨機值——這次瀏覽仍會被計入總數，
    // 只是無法跟這位訪客下次造訪串起來，屬於可接受的降級行為。
    return `v-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
  }
}

let logged = false;

/**
 * 記錄一次頁面瀏覽。同一次頁面載入只會真正寫入一次（即使被呼叫多次），
 * 避免例如 auth 狀態變化觸發多次呼叫時重複計數。
 * @param {{ role?: string, name?: string, email?: string }} viewer 目前已知的身分（可留空＝訪客）
 */
export async function logPageview(viewer = {}) {
  if (logged || !firebaseReady) return;
  logged = true;
  try {
    const day = new Date().toISOString().slice(0, 10);
    await addDoc(collection(db, 'pageviews'), {
      path: (location.pathname.replace(/\/+$/, '') || '/'),
      visitorId: getVisitorId(),
      role: viewer.role || 'guest',
      viewerName: (viewer.name || '').slice(0, 100),
      viewerEmail: (viewer.email || '').slice(0, 200),
      ref: (document.referrer || '').slice(0, 300),
      ua: (navigator.userAgent || '').slice(0, 300),
      day,
      ts: serverTimestamp()
    });
  } catch (err) {
    // 靜默失敗：訪客關掉第三方 cookie／被攔截器擋掉都不該影響網站其他功能
    console.warn('[analytics] 瀏覽紀錄寫入失敗（不影響網站功能）：', err?.message || err);
  }
}
