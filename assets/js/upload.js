/* ==========================================================================
   講義上傳 — 透過 GitHub Contents API 直接 commit 進 repo

   為什麼是這個做法：
   GitHub Pages 是純靜態託管，沒有伺服器可以接收檔案。
   這裡改由瀏覽器直接呼叫 GitHub API 把檔案寫進 repo，
   等於用 GitHub 當儲存空間，不必額外付費或升級 Firebase 方案。

   關於金鑰安全：
   金鑰由使用者在後台自行貼上，只存在該瀏覽器的 localStorage，
   不會出現在原始碼、也不會被 commit。任何其他訪客都拿不到。
   建議使用「細粒度存取金鑰」並只授予這一個 repo 的 Contents 寫入權限，
   這樣即使外洩，影響範圍也僅限於這個公開網站的內容。
   ========================================================================== */

import { MATERIALS_ROOT, GITHUB_REPO } from './config.js';

const KEY_STORE = 'github.token';
const REPO_STORE = 'github.repo';

/**
 * 依序取用：使用者自訂 → config.js 的預設 → 從網址推斷。
 * 先前只靠網址推斷，在本機或 localhost 開啟時會得到空字串，
 * 導致「上傳設定」的欄位空白且無法儲存。
 */
function guessRepo() {
  const host = location.hostname || '';
  if (host.endsWith('.github.io')) {
    return `${host.replace('.github.io', '')}/${host}`;
  }
  return '';
}

export function getRepo() {
  let saved = '';
  try { saved = localStorage.getItem(REPO_STORE) || ''; } catch {}
  return saved || GITHUB_REPO || guessRepo();
}

export function setRepo(v) {
  try { localStorage.setItem(REPO_STORE, (v || '').trim()); } catch {}
}

export function getToken() {
  try { return localStorage.getItem(KEY_STORE) || ''; } catch { return ''; }
}
export function setToken(v) {
  try {
    if (v) localStorage.setItem(KEY_STORE, v.trim());
    else localStorage.removeItem(KEY_STORE);
  } catch {}
}
export function hasToken() { return !!getToken(); }

/* ---------- 檔案類型判斷 ---------- */

export const FILE_KINDS = {
  pdf:   { ok: true,  label: 'PDF' },
  pptx:  { ok: false, label: 'PowerPoint 簡報' },
  ppt:   { ok: false, label: 'PowerPoint 簡報（舊版）' },
  docx:  { ok: true,  label: 'Word 文件' },
  doc:   { ok: true,  label: 'Word 文件（舊版）' },
  xlsx:  { ok: true,  label: 'Excel 試算表' },
  zip:   { ok: true,  label: '壓縮檔' },
  py:    { ok: true,  label: 'Python 程式' },
  ipynb: { ok: true,  label: 'Jupyter Notebook' },
  csv:   { ok: true,  label: 'CSV 資料' }
};

export function extOf(name) {
  const m = String(name).toLowerCase().match(/\.([a-z0-9]+)$/);
  return m ? m[1] : '';
}

export function isPowerPoint(name) {
  const e = extOf(name);
  return e === 'pptx' || e === 'ppt';
}

export function humanSize(bytes) {
  if (!bytes && bytes !== 0) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

/**
 * GitHub Contents API 單檔上限 100 MB，但 base64 編碼會膨脹約 33%，
 * 實務上超過 25 MB 就容易失敗或極慢，這裡先擋下並給明確訊息。
 */
export const SIZE_LIMIT = 25 * 1024 * 1024;

/** 清掉會讓網址難用的字元，但保留中文 */
export function safeName(name) {
  return name
    .replace(/\s+/g, '_')
    .replace(/[#?%&+:\\]/g, '-')
    .replace(/_{2,}/g, '_');
}

/* ---------- 編碼 ---------- */

function toBase64(arrayBuffer) {
  const bytes = new Uint8Array(arrayBuffer);
  let binary = '';
  const CHUNK = 0x8000;   // 分段處理，避免大檔造成呼叫堆疊溢位
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

/* ---------- GitHub API ---------- */

async function gh(path, options = {}) {
  const token = getToken();
  if (!token) throw new Error('尚未設定 GitHub 存取金鑰。');

  const res = await fetch(`https://api.github.com${path}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Accept': 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...options.headers
    }
  });

  if (res.status === 401) throw new Error('金鑰無效或已過期，請重新產生並貼上。');
  if (res.status === 403) throw new Error('金鑰權限不足。請確認已授予這個 repo 的「Contents：讀取與寫入」權限。');
  if (res.status === 404 && options.method !== 'GET') {
    throw new Error('找不到 repo。請確認後台設定的 repo 名稱正確（格式：帳號/儲存庫）。');
  }
  if (!res.ok && res.status !== 404) {
    let detail = '';
    try { detail = (await res.json()).message || ''; } catch {}
    throw new Error(`GitHub API 錯誤 ${res.status}${detail ? `：${detail}` : ''}`);
  }
  return res;
}

/** 驗證金鑰是否可用，回傳 repo 資訊 */
export async function verifyAccess() {
  const repo = getRepo();
  if (!repo || !repo.includes('/')) throw new Error('請先填寫 repo 名稱，格式為「帳號/儲存庫」。');
  const res = await gh(`/repos/${repo}`, { method: 'GET' });
  if (res.status === 404) throw new Error(`找不到 repo「${repo}」，或金鑰沒有存取權限。`);
  const data = await res.json();
  return {
    fullName: data.full_name,
    branch: data.default_branch,
    canPush: !!data.permissions?.push
  };
}

/** 檔案已存在時要取得 sha 才能覆寫 */
async function existingSha(repo, path, branch) {
  const res = await gh(`/repos/${repo}/contents/${encodeURI(path)}?ref=${branch}`, { method: 'GET' });
  if (res.status === 404) return null;
  const data = await res.json();
  return Array.isArray(data) ? null : data.sha;
}

/**
 * 上傳單一檔案。
 * @param {File} file
 * @param {string} subdir  例如 'HI7001/Unit1'
 * @param {(pct:number, msg:string)=>void} onProgress
 * @returns {{path:string, url:string, size:string, name:string}}
 */
export async function uploadFile(file, subdir, onProgress = () => {}) {
  if (isPowerPoint(file.name)) {
    throw new Error('PPTX_NEEDS_CONVERT');
  }
  if (file.size > SIZE_LIMIT) {
    throw new Error(`檔案 ${humanSize(file.size)} 超過 ${humanSize(SIZE_LIMIT)} 上限。請壓縮後再上傳，或改放雲端硬碟並填入連結。`);
  }

  const repo = getRepo();
  const info = await verifyAccess();
  const branch = info.branch;

  onProgress(15, '讀取檔案…');
  const buf = await file.arrayBuffer();

  onProgress(35, '編碼中…');
  const content = toBase64(buf);

  const clean = safeName(file.name);
  const rel = [subdir.replace(/^\/+|\/+$/g, ''), clean].filter(Boolean).join('/');
  const fullPath = MATERIALS_ROOT + rel;

  onProgress(55, '檢查是否已存在…');
  const sha = await existingSha(repo, fullPath, branch);

  onProgress(70, sha ? '覆寫既有檔案…' : '上傳中…');
  const res = await gh(`/repos/${repo}/contents/${encodeURI(fullPath)}`, {
    method: 'PUT',
    body: JSON.stringify({
      message: `${sha ? 'Update' : 'Add'} course material: ${rel}`,
      content,
      branch,
      ...(sha ? { sha } : {})
    })
  });

  const data = await res.json();
  onProgress(100, '完成');

  return {
    name: clean,
    path: rel,                       // 存進 Firestore 的相對路徑
    fullPath,
    size: humanSize(file.size),
    url: data.content?.html_url || '',
    replaced: !!sha
  };
}

/**
 * 刪除 repo 裡的單一檔案。用於「更新講義」時清掉被取代、換了檔名的舊檔，
 * 避免 repo 裡留下沒人參照的孤兒檔案。找不到檔案就靜默略過，不當成錯誤。
 * @param {string} relPath 相對於 MATERIALS_ROOT 的路徑
 */
export async function deleteRepoFile(relPath) {
  const repo = getRepo();
  const info = await verifyAccess();
  const branch = info.branch;
  const fullPath = MATERIALS_ROOT + relPath;

  const sha = await existingSha(repo, fullPath, branch);
  if (!sha) return; // 檔案已經不存在，不用刪

  await gh(`/repos/${repo}/contents/${encodeURI(fullPath)}`, {
    method: 'DELETE',
    body: JSON.stringify({ message: `Remove replaced course material: ${relPath}`, sha, branch })
  });
}

/** PowerPoint 匯出 PDF 的操作指引，畫面上直接顯示 */
export const PPTX_GUIDE = {
  title: '請先把簡報匯出成 PDF',
  why: 'PPTX 需要學生自備 PowerPoint 才能開啟，手機上幾乎無法閱讀，且不同版本的字型與版面容易跑掉。PDF 任何裝置都打得開，版面也不會變。',
  steps: [
    'PowerPoint 開啟簡報',
    '檔案 → 另存新檔（或「匯出」）',
    '檔案類型選「PDF (*.pdf)」',
    '儲存後，把產生的 PDF 拖進這裡'
  ],
  mac: 'Mac 版：檔案 → 匯出 → 檔案格式選 PDF。',
  gslides: 'Google 簡報：檔案 → 下載 → PDF 文件。'
};
