/* ==========================================================================
   db.js — Firebase 連線、身分、資料存取

   設計重點
   ---------
   1. 檔案存 Firebase Storage，不是 GitHub。
      這個網站的 repo 是公開的，講義那套「上傳到 GitHub」的做法會讓
      業主的檔案變成全世界可下載。Storage 有存取規則，只有登入且經核准
      的成員拿得到下載網址。

   2. 版本控制是「明確的版本」，不是「覆蓋檔案」。
      一份文件 = vmh_docs/{docId}，底下掛 versions 子集合。
      每上傳一次就新增一個版本，舊版永遠留著、隨時可下載。
      每個版本都要填「這一版改了什麼」——沒有說明的版本紀錄等於沒有歷程。

   3. 安全防線在 firestore.rules 與 storage.rules，不在這支檔案。
      前端 JS 任何人都能改，真正擋人的是伺服器端規則。
   ========================================================================== */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import {
  getFirestore, collection, doc, getDoc, getDocs, setDoc, addDoc,
  updateDoc, deleteDoc, query, orderBy, where, limit, serverTimestamp,
  onSnapshot, increment
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';
import {
  getStorage, ref as storageRef, uploadBytesResumable,
  getDownloadURL, deleteObject
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js';

// 沿用主網站的設定，Firebase 專案與管理者名單只維護一份。
// 路徑：workspace/assets/js/ → 上四層才是 repo 根目錄。
import { firebaseConfig, ADMIN_EMAILS } from '../../../../assets/js/config.js';

/* --------------------------------------------------------------------------
   初始化
   -------------------------------------------------------------------------- */
export let firebaseError = '';
let app, auth, fs, storage;

try {
  app = initializeApp(firebaseConfig, 'vmh-workspace');
  auth = getAuth(app);
  fs = getFirestore(app);
  storage = getStorage(app);
} catch (error) {
  firebaseError = error.message || String(error);
}

export const firebaseReady = () => !!auth && !!fs && !!storage;

/* --------------------------------------------------------------------------
   身分
   -------------------------------------------------------------------------- */

/** 目前登入者。role：admin / member / pending / guest */
export const me = {
  user: null, role: 'guest', profile: null, ready: false
};

const listeners = new Set();
export function onIdentity(fn) {
  listeners.add(fn);
  if (me.ready) fn(me);
  return () => listeners.delete(fn);
}
const emit = () => listeners.forEach(fn => fn(me));

export function isAdminEmail(email) {
  return ADMIN_EMAILS.includes((email || '').toLowerCase());
}

/**
 * 註冊進行中的 Promise。
 *
 * 建立帳號的當下 onAuthStateChanged 就會觸發，那時成員資料還沒寫進 Firestore。
 * 若不等它寫完就去讀，會讀到空的，姓名與單位就被 Email 前綴蓋掉。
 * 這裡讓身分監聽器先等註冊流程結束再讀。
 */
let registering = null;

export function watchAuth() {
  if (!firebaseReady()) { me.ready = true; emit(); return; }

  onAuthStateChanged(auth, async user => {
    if (registering) { try { await registering; } catch { /* 註冊失敗時照常往下走 */ } }

    me.user = user || null;
    me.profile = null;
    me.role = 'guest';

    if (user) {
      if (isAdminEmail(user.email)) {
        me.role = 'admin';
        // 顧問本人也要有成員資料，訊息與版本紀錄才顯示得出名字
        me.profile = await ensureMemberDoc(user, { role: 'consultant', status: 'approved' });
      } else {
        const snap = await getDoc(doc(fs, 'vmh_members', user.uid));
        me.profile = snap.exists() ? { id: snap.id, ...snap.data() } : null;
        me.role = me.profile?.status === 'approved' ? 'member' : 'pending';
      }
    }

    me.ready = true;
    emit();
  });
}

async function ensureMemberDoc(user, extra = {}) {
  const refDoc = doc(fs, 'vmh_members', user.uid);
  const snap = await getDoc(refDoc);
  if (snap.exists()) return { id: snap.id, ...snap.data() };

  const payload = {
    email: user.email,
    name: user.displayName || (user.email || '').split('@')[0],
    org: '',
    role: 'owner',
    status: 'pending',
    createdAt: serverTimestamp(),
    ...extra
  };
  await setDoc(refDoc, payload);
  return { id: user.uid, ...payload };
}

export const displayName = () =>
  me.profile?.name || me.user?.email || '未具名';

/* --------------------------------------------------------------------------
   註冊 / 登入
   -------------------------------------------------------------------------- */

export function register({ email, password, name, org }) {
  // 旗標必須在任何非同步工作開始「之前」就同步立起來——
  // 否則建立帳號一觸發 onAuthStateChanged，旗標都還沒賦值，等於沒擋到。
  let markDone;
  registering = new Promise(resolve => { markDone = resolve; });

  const work = (async () => {
    const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
    await setDoc(doc(fs, 'vmh_members', cred.user.uid), {
      email: cred.user.email,
      name: name.trim(),
      org: (org || '').trim(),
      role: 'owner',
      status: isAdminEmail(cred.user.email) ? 'approved' : 'pending',
      createdAt: serverTimestamp()
    });
    return cred.user;
  })();

  // 成功或失敗都要放行，否則身分監聽器會一直卡在等待
  work.catch(() => {}).then(() => { markDone(); registering = null; });

  return work;
}

export const login  = (email, password) => signInWithEmailAndPassword(auth, email.trim(), password);
export const logout = () => signOut(auth);
export const resetPassword = email => sendPasswordResetEmail(auth, email.trim());

/** Firebase 的英文錯誤訊息換成看得懂的中文 */
export function friendlyError(error) {
  const code = error?.code || '';
  const map = {
    'auth/invalid-email':          'Email 格式不正確。',
    'auth/user-not-found':         '找不到這個帳號，請確認 Email 或先註冊。',
    'auth/wrong-password':         '密碼錯誤。',
    'auth/invalid-credential':     'Email 或密碼錯誤。',
    'auth/email-already-in-use':   '這個 Email 已經註冊過了，請直接登入。',
    'auth/weak-password':          '密碼至少要 6 個字元。',
    'auth/too-many-requests':      '嘗試次數過多，請稍後再試。',
    'auth/network-request-failed': '網路連線失敗，請檢查網路後再試。',
    'permission-denied':           '權限不足。你的帳號可能尚未核准，或已被暫停。',
    'storage/unauthorized':        '沒有檔案存取權限。請確認帳號已核准。',
    'storage/retry-limit-exceeded':'上傳逾時，請檢查網路後重試。',
    'storage/quota-exceeded':      '儲存空間已滿，請聯絡管理者。'
  };
  return map[code] || error?.message || '發生未預期的錯誤。';
}

/* --------------------------------------------------------------------------
   成員
   -------------------------------------------------------------------------- */

export async function listMembers() {
  const snap = await getDocs(query(collection(fs, 'vmh_members'), orderBy('createdAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export const setMemberStatus = (uid, status) =>
  updateDoc(doc(fs, 'vmh_members', uid), { status });

export const updateMember = (uid, patch) =>
  updateDoc(doc(fs, 'vmh_members', uid), patch);

/* --------------------------------------------------------------------------
   文件與版本
   -------------------------------------------------------------------------- */

export const DOC_CATEGORIES = [
  '盤點工具', '會議紀錄', '簡報', '合約與法務', '財務與商模',
  '法規文件', '夥伴資料', '其他'
];

export async function listDocs() {
  const snap = await getDocs(query(collection(fs, 'vmh_docs'), orderBy('updatedAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getDocument(docId) {
  const snap = await getDoc(doc(fs, 'vmh_docs', docId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function listVersions(docId) {
  const snap = await getDocs(
    query(collection(fs, 'vmh_docs', docId, 'versions'), orderBy('version', 'desc'))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** 建立一份新文件（還沒有任何版本） */
export async function createDocument({ title, category, description }) {
  const refDoc = await addDoc(collection(fs, 'vmh_docs'), {
    title: title.trim(),
    category: category || '其他',
    description: (description || '').trim(),
    latestVersion: 0,
    latestNote: '',
    latestAt: null,
    createdBy: me.user.uid,
    createdByName: displayName(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return refDoc.id;
}

export const updateDocument = (docId, patch) =>
  updateDoc(doc(fs, 'vmh_docs', docId), { ...patch, updatedAt: serverTimestamp() });

/** Storage 單檔上限，超過就先擋下並給明確訊息 */
export const SIZE_LIMIT = 100 * 1024 * 1024;

/**
 * 上傳一個新版本。
 * 舊版不會被覆蓋——每一版都有自己的 Storage 路徑，永遠可以下載回去。
 *
 * @param {string} docId
 * @param {File}   file
 * @param {string} note      這一版改了什麼（必填，歷程的價值全在這裡）
 * @param {(pct:number)=>void} onProgress
 */
export async function uploadVersion(docId, file, note, onProgress = () => {}) {
  if (file.size > SIZE_LIMIT) {
    throw new Error(`檔案 ${humanSize(file.size)} 超過 ${humanSize(SIZE_LIMIT)} 上限。請壓縮後再上傳。`);
  }

  const versions = await listVersions(docId);
  const nextVersion = (versions[0]?.version || 0) + 1;

  // 路徑帶版號，所以同名檔案的不同版本不會互相覆蓋
  const safe = file.name.replace(/[#?%&+:\\]/g, '-').replace(/\s+/g, '_');
  const path = `vmh/${docId}/v${nextVersion}/${safe}`;
  const task = uploadBytesResumable(storageRef(storage, path), file, {
    contentType: file.type || 'application/octet-stream'
  });

  await new Promise((resolve, reject) => {
    task.on('state_changed',
      snap => onProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
      reject,
      resolve
    );
  });

  const url = await getDownloadURL(task.snapshot.ref);

  await addDoc(collection(fs, 'vmh_docs', docId, 'versions'), {
    version: nextVersion,
    fileName: file.name,
    storagePath: path,
    url,
    size: file.size,
    contentType: file.type || '',
    note: note.trim(),
    uploadedBy: me.user.uid,
    uploadedByName: displayName(),
    uploadedAt: serverTimestamp()
  });

  await updateDoc(doc(fs, 'vmh_docs', docId), {
    latestVersion: nextVersion,
    latestNote: note.trim(),
    latestFileName: file.name,
    latestAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });

  await logActivity({
    kind: 'version',
    docId,
    title: `${(await getDocument(docId))?.title || ''} v${nextVersion}`,
    note: note.trim()
  });

  return nextVersion;
}

/**
 * 刪除整份文件與所有版本檔案。
 * 這個動作不可復原，呼叫端必須先向使用者確認。
 */
export async function deleteDocument(docId) {
  const versions = await listVersions(docId);
  for (const v of versions) {
    try { await deleteObject(storageRef(storage, v.storagePath)); }
    catch { /* 檔案可能已不存在，繼續刪紀錄 */ }
    await deleteDoc(doc(fs, 'vmh_docs', docId, 'versions', v.id));
  }
  await deleteDoc(doc(fs, 'vmh_docs', docId));
}

/* --------------------------------------------------------------------------
   訊息
   -------------------------------------------------------------------------- */

export async function listMessages() {
  const snap = await getDocs(query(collection(fs, 'vmh_messages'), orderBy('createdAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getMessage(msgId) {
  const snap = await getDoc(doc(fs, 'vmh_messages', msgId));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

export async function postMessage({ title, body, important }) {
  const refDoc = await addDoc(collection(fs, 'vmh_messages'), {
    title: title.trim(),
    body: body.trim(),
    important: !!important,
    replyCount: 0,
    createdBy: me.user.uid,
    createdByName: displayName(),
    createdByEmail: me.user.email,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  await logActivity({ kind: 'message', msgId: refDoc.id, title: title.trim(), note: '' });
  return refDoc.id;
}

export async function listReplies(msgId) {
  const snap = await getDocs(
    query(collection(fs, 'vmh_messages', msgId, 'replies'), orderBy('createdAt', 'asc'))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function postReply(msgId, body) {
  await addDoc(collection(fs, 'vmh_messages', msgId, 'replies'), {
    body: body.trim(),
    createdBy: me.user.uid,
    createdByName: displayName(),
    createdAt: serverTimestamp()
  });
  await updateDoc(doc(fs, 'vmh_messages', msgId), {
    replyCount: increment(1),
    updatedAt: serverTimestamp()
  });
}

export const deleteMessage = msgId => deleteDoc(doc(fs, 'vmh_messages', msgId));

/* --------------------------------------------------------------------------
   動態時間軸 — 「看得到進步與修改的歷程」就靠這裡
   -------------------------------------------------------------------------- */

async function logActivity(entry) {
  try {
    await addDoc(collection(fs, 'vmh_activity'), {
      ...entry,
      byName: displayName(),
      by: me.user.uid,
      at: serverTimestamp()
    });
  } catch { /* 動態紀錄失敗不該擋住主要操作 */ }
}

export async function listActivity(max = 60) {
  const snap = await getDocs(
    query(collection(fs, 'vmh_activity'), orderBy('at', 'desc'), limit(max))
  );
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/** 有新東西時即時更新畫面上的數字 */
export function watchCounts(onChange) {
  if (!firebaseReady() || me.role === 'guest' || me.role === 'pending') return () => {};
  const stops = [
    onSnapshot(collection(fs, 'vmh_docs'), s => onChange('docs', s.size), () => {}),
    onSnapshot(collection(fs, 'vmh_messages'), s => onChange('messages', s.size), () => {})
  ];
  return () => stops.forEach(stop => stop());
}

/* --------------------------------------------------------------------------
   小工具
   -------------------------------------------------------------------------- */

export function humanSize(bytes) {
  if (bytes === null || bytes === undefined) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / 1048576).toFixed(1)} MB`;
}

/** Firestore Timestamp → 「8月13日 14:32」這種好讀的字串 */
export function fmtTime(ts) {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const now = new Date();
  const sameYear = date.getFullYear() === now.getFullYear();
  const pad = n => String(n).padStart(2, '0');
  const ymd = sameYear
    ? `${date.getMonth() + 1}月${date.getDate()}日`
    : `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`;
  return `${ymd} ${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

/** 相對時間，動態列表用 */
export function fmtAgo(ts) {
  if (!ts) return '';
  const date = ts.toDate ? ts.toDate() : new Date(ts);
  const mins = Math.floor((Date.now() - date.getTime()) / 60000);
  if (mins < 1) return '剛剛';
  if (mins < 60) return `${mins} 分鐘前`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} 小時前`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} 天前`;
  return fmtTime(ts);
}
