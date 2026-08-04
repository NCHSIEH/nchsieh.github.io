/* ==========================================================================
   全站設定 — 唯一需要你手動修改的檔案
   ========================================================================== */

/**
 * Firebase Web 設定。
 * 注意：apiKey 並非機密，Google 官方明確說明它可以公開在前端。
 * 真正的安全防線是 firestore.rules，不是這把金鑰。
 */
export const firebaseConfig = {
  apiKey:            "AIzaSyByzButphIQElqo4E_eZ9Y8yEzRHn4zjHY",
  authDomain:        "nchsieh-lms.firebaseapp.com",
  projectId:         "nchsieh-lms",
  storageBucket:     "nchsieh-lms.firebasestorage.app",
  messagingSenderId: "928315004665",
  appId:             "1:928315004665:web:f58b30b237f836d7c87428"
};

/** 4 款精選主題 */
export const THEMES = [
  { id: 'theme-academy', name: '學院藍',   note: '預設・沉穩學術', sw: ['#1f3a5f', '#9c7538', '#f7f4ed'] },
  { id: 'theme-oxford',  name: '牛津墨',   note: '高對比・銳利',   sw: ['#10192b', '#b4530f', '#f6f7f9'] },
  { id: 'theme-clinic',  name: '智慧醫療', note: '綠松・領域呼應', sw: ['#0b4f45', '#0e7490', '#f2f8f6'] },
  { id: 'theme-night',   name: '深夜',     note: '深色模式',       sw: ['#0d1420', '#7aa7d9', '#d4a960'] }
];

export const DEFAULT_THEME = 'theme-academy';

/**
 * 4 款版型樣板。同一份 HTML，由 CSS 呈現四種版面。
 * thumb / bars 只用來畫切換器上的骨架縮圖。
 */
export const LAYOUTS = [
  { id: 'layout-table',    name: '緊湊表格', note: '資訊密度最高，接近正式履歷表', thumb: 't-table',    bars: 5 },
  { id: 'layout-sidebar',  name: '側邊欄',   note: '左側固定個人資訊，右側捲動內容', thumb: 't-sidebar', bars: 2 },
  { id: 'layout-timeline', name: '時間軸',   note: '職涯以垂直時間軸串連',           thumb: 't-timeline', bars: 5 },
  { id: 'layout-cover',    name: '雜誌封面', note: '大尺度封面，視覺最強',           thumb: 't-cover',    bars: 4 }
];

/** 想更換全站預設版型，改這裡 */
export const DEFAULT_LAYOUT = 'layout-table';

/**
 * 學術檔案連結。填入實際網址後才會顯示，留空會自動隱藏。
 */
export const SCHOLAR_LINKS = [
  { label: 'Google Scholar', url: '' },
  { label: 'ORCID',          url: '' },
  { label: 'ResearchGate',   url: '' },
  { label: 'Scopus',         url: '' }
];

/**
 * 個人照與 CV。把檔案放進對應資料夾後填上路徑即可顯示。
 *   照片 → assets/img/portrait.jpg
 *   CV   → assets/cv/NanChen-Hsieh-CV.pdf
 */
export const PROFILE_ASSETS = {
  portrait: '',   // 例：'assets/img/portrait.jpg'
  cv:       ''    // 例：'assets/cv/NanChen-Hsieh-CV.pdf'
};

/** 講義檔案在 repo 中的根目錄 */
export const MATERIALS_ROOT = 'assets/courses/';

/**
 * 管理者 Email 名單。
 *
 * 這份名單只用來決定前端要不要顯示後台畫面，它「不是」安全防線。
 * 真正的防線是 firestore.rules 裡的同一份名單 —— 那份在 Google 伺服器上執行。
 *
 * 要新增或更換管理者，兩個地方都要改：
 *   1. 這裡
 *   2. firestore.rules 的 isAdmin() 函式
 * 兩邊不一致時，會出現「看得到後台但存不了檔」的狀況。
 */
export const ADMIN_EMAILS = [
  'nchsieh@gmail.com'
];
