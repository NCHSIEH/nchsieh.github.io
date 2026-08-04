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
  serverTimestamp, writeBatch
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

import { firebaseConfig, ADMIN_EMAILS } from './config.js';

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

export async function registerStudent({ email, password, name, studentId, note }) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  await sendEmailVerification(cred.user);
  // 建立待審核紀錄。status 只能是 'pending'，這是 Security Rules 強制的。
  await setDoc(doc(db, 'students', cred.user.uid), {
    email: cred.user.email,
    name: (name || '').trim(),
    studentId: (studentId || '').trim(),
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

  return {
    role: status === 'approved' && user.emailVerified ? 'student' : 'applicant',
    verified: user.emailVerified,
    status,
    profile
  };
}

/* ---------- 學生審核 ---------- */

export async function listStudents(status) {
  const base = collection(db, 'students');
  const q = status && status !== 'all'
    ? query(base, where('status', '==', status))
    : query(base);
  const snap = await getDocs(q);
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
}

export async function decideStudent(uid, status, adminEmail) {
  await updateDoc(doc(db, 'students', uid), {
    status,
    decidedAt: serverTimestamp(),
    decidedBy: adminEmail || null
  });
}

export async function removeStudent(uid) {
  // 只刪除 Firestore 紀錄；Auth 帳號需在 Console 移除
  await deleteDoc(doc(db, 'students', uid));
}

/* ---------- 課程 ---------- */

export async function listCourses() {
  const snap = await getDocs(collection(db, 'courses'));
  return snap.docs
    .map(d => ({ id: d.id, ...d.data() }))
    .sort((a, b) => {
      const s = String(b.semester || '').localeCompare(String(a.semester || ''));
      return s !== 0 ? s : String(a.code || '').localeCompare(String(b.code || ''));
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

export async function publishAnnouncement({ title, body }) {
  const ref = await addDoc(collection(db, 'announcements'), {
    title: title.trim(),
    body: (body || '').trim(),
    publishedAt: serverTimestamp()
  });
  return ref.id;
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
