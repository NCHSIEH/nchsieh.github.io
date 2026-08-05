/* ==========================================================================
   Firebase 初始化與資料存取層
   所有 Firestore / Auth 呼叫集中在這裡，其他模組不直接碰 SDK
   ========================================================================== */

import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {
  getAuth, onAuthStateChanged, createUserWithEmailAndPassword,
  signInWithEmailAndPassword, signOut, sendEmailVerification,
  sendPasswordResetEmail, reload,
  EmailAuthProvider, reauthenticateWithCredential, updatePassword
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import {
  getFirestore, doc, getDoc, setDoc, updateDoc, deleteDoc,
  collection, getDocs, addDoc, query, where, orderBy, limit,
  serverTimestamp, writeBatch, Timestamp
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

import { firebaseConfig, ADMIN_EMAILS, DELETE_USER_API_URL } from './config.js';

/* ---------- 初始化 ---------- */

let app, auth, db;
export let firebaseReady = false;
export let firebaseError = null;

try {
  app  = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db   = getFirestore(app);
  firebaseReady = true;
} catch (err) {
  firebaseError = err;
  console.error('[Firebase] 初始化失敗：', err);
}

export { auth, db };

/* ---------- 錯誤訊息中文化 ---------- */

const AUTH_ERRORS = {
  'auth/email-already-in-use':  '這個 Email 已經註冊過了，請直接登入，或使用「忘記密碼」重設。',
  'auth/invalid-email':         'Email 格式不正確。',
  'auth/weak-password':         '密碼強度不足，請至少使用 6 個字元。',
  'auth/user-not-found':        '查無此帳號，請先註冊。',
  'auth/wrong-password':        '目前密碼輸入錯誤。',
  'auth/invalid-credential':    'Email 或密碼錯誤。',
  'auth/too-many-requests':     '嘗試次數過多，請稍候幾分鐘再試。',
  'auth/network-request-failed': '網路連線失敗，請檢查網路後再試。',
  'auth/unauthorized-domain':   '目前網域未被授權。請至 Firebase Console → Authentication → Settings → Authorized domains 加入本站網域。',
  'auth/operation-not-allowed': 'Firebase 尚未啟用「電子郵件／密碼」登入方式，請至 Console 開啟。',
  'auth/requires-recent-login': '這項操作需要重新驗證身分，請重新登入後再試一次。',
  'permission-denied':          '權限不足。若你是修課學生，請確認帳號已通過審核。'
};

export function friendlyError(err) {
  if (!err) return '發生未知錯誤。';
  const code = err.code || '';
  if (AUTH_ERRORS[code]) return AUTH_ERRORS[code];
  if (code.includes('permission-denied')) return AUTH_ERRORS['permission-denied'];
  if (code === 'unavailable') return '無法連線至資料庫，請確認網路，或稍後再試。';
  if (code === 'failed-precondition') return '資料庫尚未建立索引或未啟用，請參閱 FIREBASE_SETUP.md。';
  return err.message || String(err);
}

/* ---------- 帳號 ---------- */

export function watchAuth(callback) {
  if (!firebaseReady) { callback(null); return () => {}; }
  return onAuthStateChanged(auth, callback);
}

export async function registerStudent({ email, password, name, studentId, className, note }) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  // Email 驗證信盡量寄，但不是必要條件（見 isApprovedStudent() 的說明）——
  // 寄送失敗（例如免費額度或網路問題）不該連帶讓整個註冊失敗，帳號畢竟已經建立成功了。
  try { await sendEmailVerification(cred.user); } catch (err) { console.warn('[驗證信寄送失敗]', err); }
  // 建立待審核紀錄。status 只能是 'pending'，這是 Security Rules 強制的。
  await setDoc(doc(db, 'students', cred.user.uid), {
    email: cred.user.email,
    name: (name || '').trim(),
    studentId: (studentId || '').trim(),
    className: (className || '').trim(),
    note: (note || '').trim(),
    status: 'pending',
    createdAt: serverTimestamp()
  });
  return cred.user;
}

export async function loginStudent(email, password) {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), password);
  return cred.user;
}

export async function logout() {
  await signOut(auth);
}

export async function resendVerification() {
  if (!auth.currentUser) throw new Error('尚未登入。');
  await sendEmailVerification(auth.currentUser);
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email.trim());
}

export async function refreshUser() {
  if (!auth.currentUser) return null;
  await reload(auth.currentUser);
  // 強制換發 ID Token，讓 email_verified 立即反映到 Security Rules
  await auth.currentUser.getIdToken(true);
  return auth.currentUser;
}

/**
 * 修改目前登入帳號的密碼。
 * Firebase 要求「最近登入過」才能改密碼，所以必須先用舊密碼重新驗證一次，
 * 否則會丟出 auth/requires-recent-login。這裡把兩步包成一個函式，
 * 呼叫端只需要提供舊密碼與新密碼。
 */
export async function changePassword(oldPassword, newPassword) {
  const user = auth.currentUser;
  if (!user) throw new Error('尚未登入。');

  const credential = EmailAuthProvider.credential(user.email, oldPassword);
  await reauthenticateWithCredential(user, credential);
  await updatePassword(user, newPassword);
}

/* ---------- 身分判定 ---------- */

/** 這份名單只決定前端顯示什麼；實際權限由 firestore.rules 把關 */
export function isAdminEmail(email) {
  if (!email) return false;
  return ADMIN_EMAILS.some(e => e.toLowerCase() === email.toLowerCase());
}

/**
 * 回傳目前使用者的完整身分狀態。
 * 這是前端的顯示依據；真正的權限仍由 Security Rules 把關。
 */
export async function resolveIdentity(user) {
  if (!user) return { role: 'guest', verified: false, status: null, profile: null };

  // 管理者：Email 在名單中且已完成驗證
  if (isAdminEmail(user.email) && user.emailVerified) {
    return {
      role: 'admin', verified: true, status: 'approved',
      profile: { email: user.email }
    };
  }

  // 學生審核狀態
  let status = null, profile = null;
  try {
    const snap = await getDoc(doc(db, 'students', user.uid));
    if (snap.exists()) { profile = snap.data(); status = profile.status; }
  } catch { /* 忽略 */ }

  // 學生角色不要求 email 已驗證——見 firestore.rules 的 isApprovedStudent() 說明。
  // verified 欄位仍然回傳，純粹用來在介面上顯示一句友善提醒，不作為存取門檻。
  return {
    role: status === 'approved' ? 'student' : 'applicant',
    verified: user.emailVerified,
    status,
    profile
  };
}

/* ---------- 學生審核 ---------- */

/**
 * 學生排序：預設依申請時間新到舊。
 * 只要有任何一筆學生被管理者手動拖拉過（存在 order 欄位），
 * 就整批改用手動順序，邏輯與課程排序一致。
 */
export async function listStudents(status) {
  const base = collection(db, 'students');
  const q = status && status !== 'all'
    ? query(base, where('status', '==', status))
    : query(base);
  const snap = await getDocs(q);
  const rows = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const byCreated = (a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0);
  const hasManualOrder = rows.some(r => typeof r.order === 'number');
  if (!hasManualOrder) return rows.sort(byCreated);

  return rows.sort((a, b) => {
    const ao = typeof a.order === 'number' ? a.order : Infinity;
    const bo = typeof b.order === 'number' ? b.order : Infinity;
    return ao !== bo ? ao - bo : byCreated(a, b);
  });
}

/** 依 uid 陣列的先後順序，把新的 order 值寫回 Firestore */
export async function saveStudentOrder(orderedUids) {
  await Promise.all(orderedUids.map((uid, i) => updateDoc(doc(db, 'students', uid), { order: i })));
}

/**
 * status 可為 'approved' | 'rejected' | 'suspended'。
 * suspended 用來「暫停」一個原本已核准的學生，不影響他原始的申請紀錄，
 * 之後可以再次 decideStudent(uid, 'approved', ...) 恢復存取。
 */
export async function decideStudent(uid, status, adminEmail) {
  await updateDoc(doc(db, 'students', uid), {
    status,
    decidedAt: serverTimestamp(),
    decidedBy: adminEmail || null
  });
}

/**
 * 設定某位學生可以看到哪些課程。
 * courseIds 為空陣列表示「不限制，可看全部課程」（沿用既有預設行為）。
 */
export async function setStudentAccess(uid, courseIds) {
  await updateDoc(doc(db, 'students', uid), { allowedCourses: courseIds });
}

export async function removeStudent(uid) {
  // 只刪除 Firestore 紀錄；Auth 帳號另外由 deleteAuthAccount() 處理（若有設定）
  await deleteDoc(doc(db, 'students', uid));
}

/**
 * 呼叫獨立部署的 Vercel serverless function，把 Firebase Authentication 帳號也刪掉。
 * DELETE_USER_API_URL 沒設定時直接跳過（回傳 skipped: true），維持「只刪 Firestore
 * 紀錄」的舊行為，不會噴錯——這是刻意設計成漸進增強，沒接這支 API 也完全不影響其他功能。
 */
export async function deleteAuthAccount(uid) {
  if (!DELETE_USER_API_URL) return { skipped: true };
  if (!auth.currentUser) throw new Error('尚未登入，無法驗證管理者身分。');

  const idToken = await auth.currentUser.getIdToken();
  const res = await fetch(DELETE_USER_API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, idToken })
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error || `刪除失敗（HTTP ${res.status}）`);
  }
  return { skipped: false };
}

/* ---------- 課程 ---------- */

/**
 * 課程排序：初設依開課學期新到舊排序。
 * 只要有任何一筆課程被管理者手動拖拉過（存在 order 欄位），
 * 就整批改用手動順序；沒有設定過 order 的課程排在最後，
 * 避免新建課程「插隊」到手動排序中間。
 */
export async function listCourses() {
  const snap = await getDocs(collection(db, 'courses'));
  const courses = snap.docs.map(d => ({ id: d.id, ...d.data() }));

  const bySemester = (a, b) => {
    const s = String(b.semester || '').localeCompare(String(a.semester || ''));
    return s !== 0 ? s : String(a.code || '').localeCompare(String(b.code || ''));
  };

  const hasManualOrder = courses.some(c => typeof c.order === 'number');
  if (!hasManualOrder) return courses.sort(bySemester);

  return courses.sort((a, b) => {
    const ao = typeof a.order === 'number' ? a.order : Infinity;
    const bo = typeof b.order === 'number' ? b.order : Infinity;
    return ao !== bo ? ao - bo : bySemester(a, b);
  });
}

export async function saveCourse(id, data) {
  const payload = { ...data, updatedAt: serverTimestamp() };
  if (id) {
    await updateDoc(doc(db, 'courses', id), payload);
    return id;
  }
  const ref = await addDoc(collection(db, 'courses'), { ...payload, createdAt: serverTimestamp() });
  return ref.id;
}

export async function deleteCourse(id) {
  // 先清掉子集合，避免留下孤兒文件
  const batch = writeBatch(db);
  for (const sub of ['materials', 'assignments']) {
    const snap = await getDocs(collection(db, 'courses', id, sub));
    snap.docs.forEach(d => batch.delete(d.ref));
  }
  batch.delete(doc(db, 'courses', id));
  await batch.commit();
}

/**
 * 讀取課程的講義與作業。
 * 未核准的使用者會收到 permission-denied，這是預期行為，
 * 前端據此顯示「需通過審核」而非錯誤訊息。
 */
export async function loadCourseDetail(courseId) {
  try {
    const [mats, asgs] = await Promise.all([
      getDocs(collection(db, 'courses', courseId, 'materials')),
      getDocs(collection(db, 'courses', courseId, 'assignments'))
    ]);
    return {
      allowed: true,
      materials: mats.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.order ?? 999) - (b.order ?? 999)),
      assignments: asgs.docs.map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => (a.dueAt?.seconds || 0) - (b.dueAt?.seconds || 0))
    };
  } catch (err) {
    if (String(err.code || '').includes('permission-denied')) {
      return { allowed: false, materials: [], assignments: [] };
    }
    throw err;
  }
}

export async function saveMaterial(courseId, id, data) {
  if (id) { await updateDoc(doc(db, 'courses', courseId, 'materials', id), data); return id; }
  const ref = await addDoc(collection(db, 'courses', courseId, 'materials'), data);
  return ref.id;
}

export async function deleteMaterial(courseId, id) {
  await deleteDoc(doc(db, 'courses', courseId, 'materials', id));
}

export async function saveAssignment(courseId, id, data) {
  if (id) { await updateDoc(doc(db, 'courses', courseId, 'assignments', id), data); return id; }
  const ref = await addDoc(collection(db, 'courses', courseId, 'assignments'), data);
  return ref.id;
}

export async function deleteAssignment(courseId, id) {
  await deleteDoc(doc(db, 'courses', courseId, 'assignments', id));
}

/* ---------- 公告 ---------- */

export async function listAnnouncements(max = 5) {
  try {
    const snap = await getDocs(query(collection(db, 'announcements'), orderBy('publishedAt', 'desc'), limit(max)));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch {
    const snap = await getDocs(collection(db, 'announcements'));
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.publishedAt?.seconds || 0) - (a.publishedAt?.seconds || 0))
      .slice(0, max);
  }
}

/**
 * targetClass 留空表示全班級可見。
 * startAt / endAt 是 <input type="date"> 的字串值（如 '2026-09-01'）或 null，
 * 用來限制公告只在特定期間對公開頁顯示；兩者都留空＝立即生效、永不過期。
 */
export async function publishAnnouncement({ title, body, targetClass, startAt, endAt }) {
  const ref = await addDoc(collection(db, 'announcements'), {
    title: title.trim(),
    body: (body || '').trim(),
    targetClass: (targetClass || '').trim(),
    startAt: startAt ? Timestamp.fromDate(new Date(startAt)) : null,
    endAt: endAt ? Timestamp.fromDate(new Date(endAt + 'T23:59:59')) : null,
    reminderSentAt: null,
    publishedAt: serverTimestamp()
  });
  return ref.id;
}

/** Email 提醒寄送完成後呼叫，記錄時間避免重複顯示「尚未寄送」 */
export async function markAnnouncementReminderSent(id) {
  await updateDoc(doc(db, 'announcements', id), { reminderSentAt: serverTimestamp() });
}

export async function deleteAnnouncement(id) {
  await deleteDoc(doc(db, 'announcements', id));
}

/* ---------- 著作 ---------- */

export async function listPublications() {
  const snap = await getDocs(collection(db, 'publications'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (Number(b.year) || 0) - (Number(a.year) || 0));
}

export async function savePublication(id, data) {
  if (id) { await updateDoc(doc(db, 'publications', id), data); return id; }
  const ref = await addDoc(collection(db, 'publications'), data);
  return ref.id;
}

export async function deletePublication(id) {
  await deleteDoc(doc(db, 'publications', id));
}

/* ---------- 研究計畫與獲獎 ---------- */

export async function listProjects() {
  const snap = await getDocs(collection(db, 'projects'));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => String(b.year || '').localeCompare(String(a.year || '')));
}

export async function saveProject(id, data) {
  if (id) { await updateDoc(doc(db, 'projects', id), data); return id; }
  const ref = await addDoc(collection(db, 'projects'), data);
  return ref.id;
}

export async function deleteProject(id) {
  await deleteDoc(doc(db, 'projects', id));
}

/* ---------- 全站設定（版型／配色預設） ----------
   公開頁用這裡的值決定「所有訪客第一次造訪」看到的版型與主題。
   讀取刻意包一層 try/catch、找不到就回傳 null——呼叫端必須把這當成
   「還沒設定，請用 config.js 的預設值」，絕不能讓這次讀取擋住首頁渲染。 */

export async function getSiteSettings() {
  try {
    const snap = await getDoc(doc(db, 'settings', 'site'));
    return snap.exists() ? snap.data() : null;
  } catch {
    return null;
  }
}

/** 只有管理者能寫入，由 firestore.rules 強制；前端這層檢查只是省一次白跑的請求 */
export async function saveSiteSettings({ theme, layout, materialsDisplay }) {
  await setDoc(doc(db, 'settings', 'site'), {
    theme, layout, materialsDisplay, updatedAt: serverTimestamp()
  }, { merge: true });
}

/* ---------- 備份 ---------- */

export async function exportBackup() {
  const data = { exportedAt: new Date().toISOString(), courses: [], announcements: [], publications: [], projects: [], students: [] };

  const courses = await listCourses();
  for (const c of courses) {
    const detail = await loadCourseDetail(c.id);
    data.courses.push({ ...c, materials: detail.materials, assignments: detail.assignments });
  }
  data.announcements = await listAnnouncements(200);
  data.publications  = await listPublications();
  data.projects      = await listProjects();
  try { data.students = await listStudents('all'); } catch {}

  return data;
}
