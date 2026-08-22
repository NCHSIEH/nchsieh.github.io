/* ==========================================================================
   管理後台 admin.html

   進入條件：Firebase Auth 登入 + Firestore 中存在 admins/{uid} 文件。
   前端的顯示判斷只是方便性，真正擋下未授權讀寫的是 firestore.rules。
   ========================================================================== */

import {
  $, $$, el, esc, banner, openModal, closeModal, fmtDateTime, initTabs, cleanText,
  renderThemePicker, renderLayoutPicker, currentTheme, currentLayout
} from './ui.js';
import {
  MATERIALS_ROOT, firebaseConfig, THEMES, LAYOUTS,
  MATERIALS_DISPLAY_MODES, DEFAULT_MATERIALS_DISPLAY,
  EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, EMAILJS_PUBLIC_KEY,
  DELETE_USER_API_URL
} from './config.js';
import {
  auth, watchAuth, loginStudent, logout, friendlyError, firebaseReady, firebaseError,
  resolveIdentity, isAdminEmail, resendVerification, refreshUser, changePassword,
  listStudents, decideStudent, removeStudent, deleteAuthAccount, saveStudentOrder, setStudentAccess,
  listCourses, saveCourse, deleteCourse, loadCourseDetail,
  saveMaterial, deleteMaterial, saveAssignment, deleteAssignment,
  listAnnouncements, publishAnnouncement, deleteAnnouncement, markAnnouncementReminderSent,
  studentMatchesAnnouncement, courseAllowedForStudent,
  getSiteSettings, saveSiteSettings,
  listPageviews, dayKey,
  exportBackup
} from './data.js';
import {
  uploadFile, deleteRepoFile, isPowerPoint, humanSize, extOf, safeName,
  getToken, setToken, getRepo, setRepo, hasToken, verifyAccess,
  PPTX_GUIDE, SIZE_LIMIT
} from './upload.js';

let me = null;              // { user, role }
let mounted = false;
let editingCourseId = null;
let editorCourse = null;

const VIEW_TITLES = {
  viewDash: '總覽', viewCourses: '課程管理', viewStudents: '學生管理',
  viewAnn: '公告', viewAnalytics: '訪客統計', viewLook: '外觀', viewSystem: '系統'
};

/* ---------- 共用 ---------- */

function emptyRow(cols, text) {
  return el('tr', { class: 'muted-row' }, [el('td', { colspan: cols, text })]);
}

async function guard(fn, target = '#adminOpBanner') {
  try { await fn(); }
  catch (err) { banner(target, esc(friendlyError(err)), 'error'); console.error(err); }
}

function confirmThen(message, fn) {
  if (window.confirm(message)) fn();
}

/* ---------- 登入 ---------- */

async function handleLogin() {
  const email = $('#adminEmail').value.trim();
  const pass  = $('#adminPassword').value;
  if (!email || !pass) { banner('#adminBanner', '請輸入 Email 與密碼。', 'error'); return; }

  $('#btnAdminLogin').disabled = true;
  banner('#adminBanner', '驗證中…', 'info');
  try {
    await loginStudent(email, pass);
    // 後續由 watchAuth 接手判定是否為管理者
  } catch (err) {
    banner('#adminBanner', esc(friendlyError(err)), 'error');
    $('#btnAdminLogin').disabled = false;
  }
}

async function onAuthChanged(user) {
  const gate  = $('#adminGate');
  const shell = $('#adminShell');
  $('#btnAdminLogin').disabled = false;

  if (!user) {
    gate.hidden = false; shell.hidden = true;
    return;
  }

  // Firebase Console 手動建立的帳號預設「未驗證」，而管理者權限要求 Email 已驗證。
  // 這裡不直接踢掉，改成提供一鍵寄驗證信，否則會卡死在門外。
  if (isAdminEmail(user.email) && !user.emailVerified) {
    gate.hidden = false; shell.hidden = true;
    banner('#adminBanner',
      `<strong>只差一步：請完成 Email 驗證</strong><br>` +
      `<code>${esc(user.email)}</code> 在管理者名單中，但這個信箱還沒完成驗證。<br>` +
      `為確認信箱確實由你本人持有，管理權限需要驗證通過。`, 'warn');
    showVerifyHelper();
    return;
  }

  const info = await resolveIdentity(user);
  if (info.role !== 'admin') {
    gate.hidden = false; shell.hidden = true;
    banner('#adminBanner',
      '這個帳號不在管理者名單中。<br>' +
      `目前登入的是 <code>${esc(user.email || '')}</code>。<br>` +
      '請改用管理者信箱登入，或把這個 Email 加入 <code>assets/js/config.js</code> 的 ' +
      '<code>ADMIN_EMAILS</code> 與 <code>firestore.rules</code> 的 <code>adminEmails()</code>。', 'error');
    await logout();
    return;
  }

  me = { user, role: 'admin' };
  gate.hidden = true; shell.hidden = false;
  banner('#adminBanner', '');

  $('#adminWho').textContent = user.email || '';
  $('#adminAvatar').textContent = (user.email || '?').charAt(0);

  if (!mounted) { mount(); mounted = true; }
  refreshAll();
}

/** 管理者信箱未驗證時，在登入卡片下方長出兩顆協助按鈕 */
function showVerifyHelper() {
  if ($('#verifyHelper')) return;

  const box = el('div', { id: 'verifyHelper', style: 'display:flex;gap:8px;flex-wrap:wrap;margin-top:14px' }, [
    el('button', {
      class: 'btn btn-primary btn-sm btn-rect', type: 'button',
      onclick: async (e) => {
        e.target.disabled = true;
        try {
          await resendVerification();
          banner('#adminBanner',
            '驗證信已寄出，請到信箱點開連結（記得看垃圾郵件匣），<br>回來後按「我驗證好了」。', 'success');
        } catch (err) {
          banner('#adminBanner', esc(friendlyError(err)), 'error');
        } finally { e.target.disabled = false; }
      }
    }, '寄送驗證信'),
    el('button', {
      class: 'btn btn-ghost btn-sm btn-rect', type: 'button',
      onclick: async (e) => {
        e.target.disabled = true;
        try {
          await refreshUser();
          if (auth.currentUser?.emailVerified) {
            $('#verifyHelper')?.remove();
            await onAuthChanged(auth.currentUser);
          } else {
            banner('#adminBanner', '還沒偵測到驗證完成，請先點開信件中的連結。', 'warn');
          }
        } finally { e.target.disabled = false; }
      }
    }, '我驗證好了'),
    el('button', {
      class: 'btn btn-quiet btn-sm btn-rect', type: 'button',
      onclick: async () => { $('#verifyHelper')?.remove(); await logout(); banner('#adminBanner', ''); }
    }, '換帳號登入')
  ]);

  $('#adminLoginForm').after(box);
}

/* ---------- 側邊選單切換 ---------- */

function showView(id) {
  $$('.admin-view').forEach(v => v.hidden = v.id !== id);
  $$('.admin-menu-item').forEach(b => b.classList.toggle('is-active', b.dataset.view === id));
  $('#viewTitle').textContent = VIEW_TITLES[id] || '';
  banner('#adminOpBanner', '');
  try { localStorage.setItem('admin.view', id); } catch {}
}

/* ==========================================================================
   總覽
   ========================================================================== */

async function refreshDash() {
  const [courses, pending, approved, anns] = await Promise.all([
    listCourses(),
    listStudents('pending'),
    listStudents('approved'),
    listAnnouncements(50)
  ]);

  $('#statCourses').textContent  = courses.length;
  $('#statPending').textContent  = pending.length;
  $('#statApproved').textContent = approved.length;
  $('#statAnn').textContent      = anns.length;

  const badge = $('#pendingBadge');
  badge.textContent = pending.length;
  badge.hidden = pending.length === 0;

  const todo = $('#dashTodo');
  const items = [];

  if (pending.length) {
    items.push(el('div', { class: 'todo-item' }, [
      el('span', { class: 'state-badge pending', text: `${pending.length} 筆待審核` }),
      el('span', { text: '有學生正在等待核准' }),
      el('button', {
        class: 'btn btn-ghost btn-sm btn-rect', type: 'button',
        style: 'margin-left:auto', onclick: () => showView('viewStudents')
      }, '前往處理')
    ]));
  }
  if (!courses.length) {
    items.push(el('div', { class: 'todo-item' }, [
      el('span', { class: 'state-badge guest', text: '尚無課程' }),
      el('span', { text: '課程專區目前是空的，建立第一門課程後才會顯示內容' }),
      el('button', {
        class: 'btn btn-ghost btn-sm btn-rect', type: 'button',
        style: 'margin-left:auto', onclick: () => showView('viewCourses')
      }, '建立課程')
    ]));
  }
  if (!items.length) {
    items.push(el('div', { class: 'todo-item', text: '目前沒有待處理事項。' }));
  }
  todo.replaceChildren(...items);
}

/* ==========================================================================
   課程管理
   ========================================================================== */

function courseFormValues() {
  return {
    code:      $('#cfCode').value.trim(),
    titleZh:   $('#cfTitleZh').value.trim(),
    titleEn:   $('#cfTitleEn').value.trim(),
    semester:  $('#cfSemester').value.trim(),
    level:     $('#cfLevel').value,
    credits:   Number($('#cfCredits').value) || 0,
    summaryZh: $('#cfSummaryZh').value.trim(),
    tags:      $('#cfTags').value.split(/[,，、]/).map(s => s.trim()).filter(Boolean)
  };
}

function fillCourseForm(c) {
  $('#cfCode').value      = cleanText(c?.code);
  $('#cfTitleZh').value   = cleanText(c?.titleZh);
  $('#cfTitleEn').value   = cleanText(c?.titleEn);
  $('#cfSemester').value  = cleanText(c?.semester);
  $('#cfLevel').value     = c?.level || 'graduate';
  $('#cfCredits').value   = c?.credits ?? 3;
  $('#cfSummaryZh').value = cleanText(c?.summaryZh);
  $('#cfTags').value      = (c?.tags || []).join('、');

  editingCourseId = c?.id || null;
  $('#cfHeading').textContent     = c ? `編輯課程：${c.code || ''}` : '新增課程';
  $('#btnSaveCourse').textContent = c ? '儲存變更' : '建立課程';
  $('#btnCancelEdit').hidden      = !c;
}

/** 目前顯示中的課程清單，供拖曳排序時計算新順序 */
let currentCourses = [];

function courseRow(c, index) {
  return el('tr', { draggable: 'true', 'data-id': c.id, 'data-order': String(index) }, [
    el('td', { class: 'col-drag' }, [
      el('input', { type: 'checkbox', class: 'row-select-cb', 'aria-label': `選取「${c.titleZh || c.code}」，可多選後一起拖曳` }),
      el('span', { class: 'drag-handle', title: '拖曳調整順序', 'aria-hidden': 'true', text: '⠿' }),
      el('span', { class: 'reorder-btns' }, [
        el('button', {
          type: 'button', class: 'reorder-btn', title: '上移', 'aria-label': `將「${c.titleZh || c.code}」上移`,
          onclick: () => guard(() => moveCourse(c.id, -1))
        }, '▲'),
        el('button', {
          type: 'button', class: 'reorder-btn', title: '下移', 'aria-label': `將「${c.titleZh || c.code}」下移`,
          onclick: () => guard(() => moveCourse(c.id, 1))
        }, '▼')
      ])
    ]),
    el('td', {}, [
      el('div', { style: 'font-weight:600', text: cleanText(c.titleZh) || '(未命名)' }),
      el('div', { class: 'mono', style: 'font-size:12px;color:var(--faint)', text: cleanText(c.code) })
    ]),
    el('td', { style: 'white-space:nowrap', text: cleanText(c.semester) || '—' }),
    el('td', { style: 'white-space:nowrap', text: c.level === 'undergraduate' ? '大學部' : '碩博士班' }),
    el('td', {}, [el('div', { class: 'actions' }, [
      el('button', { class: 'btn btn-ghost btn-sm btn-rect', type: 'button',
        onclick: () => { fillCourseForm(c); $('#cfCode').focus(); } }, '編輯'),
      el('button', { class: 'btn btn-ghost btn-sm btn-rect', type: 'button',
        onclick: () => openMaterials(c) }, '講義與作業'),
      el('button', { class: 'btn btn-danger btn-sm btn-rect', type: 'button',
        onclick: () => confirmThen(
          `確定刪除課程「${c.titleZh}」？\n講義與作業紀錄會一併移除，無法復原。`,
          () => guard(async () => {
            await deleteCourse(c.id);
            if (editingCourseId === c.id) fillCourseForm(null);
            await refreshCourses(); await refreshDash();
            banner('#adminOpBanner', '課程已刪除。', 'success');
          })) }, '刪除')
    ])])
  ]);
}

async function refreshCourses() {
  const tbody = $('#adminCourseTbody');
  tbody.replaceChildren(emptyRow(5, '讀取中…'));

  const courses = await listCourses();
  currentCourses = courses;
  if (!courses.length) { tbody.replaceChildren(emptyRow(5, '尚未建立任何課程。')); return; }

  tbody.replaceChildren(...courses.map((c, i) => courseRow(c, i)));
}

/** 依 id 陣列的先後順序，把新的 order 值寫回 Firestore */
async function persistCourseOrder(orderedIds) {
  await Promise.all(orderedIds.map((id, i) => saveCourse(id, { order: i })));
}

/** 上／下移一步，供無法拖曳的裝置（觸控螢幕、鍵盤操作）使用 */
async function moveCourse(id, delta) {
  const ids = currentCourses.map(c => c.id);
  const i = ids.indexOf(id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  await persistCourseOrder(ids);
  await refreshCourses();
}

/**
 * 通用的表格拖曳排序：一次只拖一列是預設行為，但如果先勾選了多筆（`.row-select-cb`），
 * 拖曳其中任一筆時會把「所有勾選中的列」一起搬到放開的位置，維持彼此的相對順序不變。
 * 課程管理、講義列表、學生名單三處排序邏輯完全相同，統一用這個函式避免各寫一份、行為卻慢慢兜不起來。
 *
 * @param {string} tbodySelector
 * @param {(orderedIds: string[]) => Promise<void>} persistAndSync 依目前 DOM 順序寫回資料庫，並更新對應的本地快取／提示訊息
 * @param {string} [bannerTarget] 失敗時要顯示錯誤訊息的 banner 選擇器
 */
function initDragReorder(tbodySelector, persistAndSync, bannerTarget = '#adminOpBanner') {
  const tbody = $(tbodySelector);
  if (!tbody) return;

  const selected = new Set();  // 目前勾選中的 data-id
  let draggingIds = [];

  const rowFor = id => tbody.querySelector(`tr[data-id="${CSS.escape(id)}"]`);

  tbody.addEventListener('change', e => {
    const cb = e.target.closest('.row-select-cb');
    if (!cb) return;
    const tr = cb.closest('tr[data-id]');
    if (!tr) return;
    if (cb.checked) selected.add(tr.dataset.id); else selected.delete(tr.dataset.id);
    tr.classList.toggle('is-selected', cb.checked);
  });

  tbody.addEventListener('dragstart', e => {
    const tr = e.target.closest('tr[draggable="true"]');
    if (!tr) return;

    // 拖曳的這一列本來就在勾選清單裡、且勾了不只一筆 → 整批一起搬；
    // 否則維持原本的行為，只搬這一列（不論勾選狀態如何）。
    draggingIds = (selected.has(tr.dataset.id) && selected.size > 1)
      ? [...tbody.querySelectorAll('tr[data-id]')].map(r => r.dataset.id).filter(id => selected.has(id))
      : [tr.dataset.id];

    draggingIds.map(rowFor).filter(Boolean).forEach(r => r.classList.add('is-dragging'));
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', tr.dataset.id || '');
  });

  tbody.addEventListener('dragover', e => {
    if (!draggingIds.length) return;
    e.preventDefault();
    const tr = e.target.closest('tr[draggable="true"]');
    if (!tr || draggingIds.includes(tr.dataset.id)) return;
    const rect = tr.getBoundingClientRect();
    const anchor = (e.clientY - rect.top) < rect.height / 2 ? tr : tr.nextSibling;
    // 依原本的相對順序逐一插到 anchor 前面：每插一筆，前面插好的都會被推到更前面，
    // 所以最後這批列會緊貼在一起、順序跟拖曳前彼此的相對順序完全一致。
    draggingIds.map(rowFor).filter(Boolean).forEach(r => tbody.insertBefore(r, anchor));
  });

  tbody.addEventListener('dragend', () => guard(async () => {
    if (!draggingIds.length) return;
    draggingIds.map(rowFor).filter(Boolean).forEach(r => r.classList.remove('is-dragging'));
    draggingIds = [];

    const ids = [...tbody.querySelectorAll('tr[data-id]')].map(tr => tr.dataset.id);
    if (!ids.length) return;
    await persistAndSync(ids);
  }, bannerTarget));
}

async function persistAndSyncCourses(ids) {
  await persistCourseOrder(ids);
  currentCourses = ids.map(id => currentCourses.find(c => c.id === id)).filter(Boolean);
  banner('#adminOpBanner', '課程順序已更新。', 'success');
}

/* ---------- 講義與作業 ---------- */

/** 講義的公開下載網址，邏輯與前台 courses.js 的 buildFlatFileList 一致 */
function materialUrl(m) {
  const path = m.path || '';
  return /^https?:\/\//.test(path) ? path : MATERIALS_ROOT + path;
}

async function openMaterials(course) {
  editorCourse = course;
  $('#matModalTitle').textContent = `${course.code || ''}　${course.titleZh || ''}`;
  banner('#matBanner', '');
  $('#uploadList').replaceChildren();
  if (!hasToken()) {
    banner('#matBanner',
      '首次上傳需先完成一次性設定：點右上角「上傳設定」貼入 GitHub 存取金鑰。', 'info');
  }
  openModal('modalMaterials');
  await guard(refreshMaterials, '#matBanner');
}

function materialRow(m, index) {
  return el('tr', { draggable: 'true', 'data-id': m.id, 'data-order': String(index) }, [
    el('td', { class: 'col-drag' }, [
      el('input', { type: 'checkbox', class: 'row-select-cb', 'aria-label': `選取「${m.name}」，可多選後一起拖曳` }),
      el('span', { class: 'drag-handle', title: '拖曳調整順序', 'aria-hidden': 'true', text: '⠿' }),
      el('span', { class: 'reorder-btns' }, [
        el('button', {
          type: 'button', class: 'reorder-btn', title: '上移', 'aria-label': `將「${m.name}」上移`,
          onclick: () => guard(() => moveMaterial(m.id, -1), '#matBanner')
        }, '▲'),
        el('button', {
          type: 'button', class: 'reorder-btn', title: '下移', 'aria-label': `將「${m.name}」下移`,
          onclick: () => guard(() => moveMaterial(m.id, 1), '#matBanner')
        }, '▼')
      ])
    ]),
    el('td', { text: m.unit || '—' }),
    el('td', {}, [
      el('div', { style: 'font-weight:600', text: m.name || '' }),
      el('div', { class: 'mono', style: 'font-size:11.5px;color:var(--faint)', text: m.path || '' })
    ]),
    el('td', { text: m.size || '—' }),
    el('td', {}, [el('div', { class: 'actions' }, [
      el('button', {
        class: 'btn btn-ghost btn-sm btn-rect', type: 'button',
        onclick: () => triggerMaterialUpdate(m)
      }, '更新'),
      el('button', {
        class: 'btn btn-danger btn-sm btn-rect', type: 'button',
        onclick: () => confirmThen(`移除「${m.name}」？`, () => guard(async () => {
          await deleteMaterial(editorCourse.id, m.id); await refreshMaterials();
        }, '#matBanner'))
      }, '移除')
    ])])
  ]);
}

/** 點「更新檔案」：現開一個一次性的隱藏檔案選擇器，選好檔案後才真正開始上傳 */
function triggerMaterialUpdate(m) {
  if (!hasToken()) {
    banner('#matBanner', '尚未設定 GitHub 存取金鑰，無法上傳。請點右上角「上傳設定」完成一次性設定。', 'warn');
    openModal('modalUpload');
    return;
  }
  const input = el('input', {
    type: 'file', hidden: true,
    accept: '.pdf,.docx,.doc,.xlsx,.csv,.zip,.py,.ipynb,.ppt,.pptx'
  });
  input.addEventListener('change', () => {
    const file = input.files[0];
    input.remove();
    if (file) guard(() => replaceMaterialFile(m, file), '#matBanner');
  });
  document.body.append(input);
  input.click();
}

/**
 * 用新檔取代既有講義：上傳到原本同一個單元子資料夾（維持原本的分類結構），
 * 更新 Firestore 紀錄的檔名／路徑／大小，但保留原本的 id、單元、排序不變。
 * 新檔名跟舊檔不同時，舊檔會變成沒人參照的孤兒檔案，這裡會嘗試順手清掉，
 * 清不掉（例如金鑰權限不足）也不影響這次更新本身是否成功。
 */
async function replaceMaterialFile(m, file) {
  if (isPowerPoint(file.name)) {
    banner('#matBanner', '請先把簡報轉成 PDF，再選擇新檔更新。', 'warn');
    return;
  }

  banner('#matBanner', `正在更新「${m.name}」…`, 'info');

  const oldPath = m.path || '';
  const subdir = oldPath.includes('/') ? oldPath.slice(0, oldPath.lastIndexOf('/')) : safeName(editorCourse.code || editorCourse.id);

  const result = await uploadFile(file, subdir, () => {});
  await saveMaterial(editorCourse.id, m.id, {
    name: result.name,
    path: result.path,
    size: result.size
  });

  if (result.path !== oldPath && oldPath && !/^https?:\/\//.test(oldPath)) {
    try { await deleteRepoFile(oldPath); } catch (err) { console.warn('[講義更新] 舊檔清理失敗（不影響更新結果）：', err); }
  }

  banner('#matBanner', `已更新為「${result.name}」。`, 'success');
  await refreshMaterials();
}

/** 目前顯示中的講義清單，供拖曳排序時計算新順序 */
let currentMaterials = [];

/** 新講義預設要放的順序值：接在目前清單最後面，而不是永遠回到最前面 */
function nextMaterialOrder() {
  return currentMaterials.length
    ? Math.max(...currentMaterials.map(m => Number(m.order) || 0)) + 1
    : 0;
}

async function refreshMaterials() {
  const detail = await loadCourseDetail(editorCourse.id);
  currentMaterials = detail.materials;

  // 「手動加入」表單的排序欄位預設值同步成「目前最後面」，
  // 使用者若正在該欄位打字中就不要打斷他（避免游標跳動、值被蓋掉）。
  const orderInput = $('#mfOrder');
  if (orderInput && document.activeElement !== orderInput) {
    orderInput.value = String(nextMaterialOrder());
  }

  $('#matTbody').replaceChildren(...(detail.materials.length
    ? detail.materials.map((m, i) => materialRow(m, i))
    : [emptyRow(5, '尚未加入講義。')]));

  $('#asgTbody').replaceChildren(...(detail.assignments.length
    ? detail.assignments.map(a => el('tr', {}, [
        el('td', { text: a.title || '' }),
        el('td', { style: 'white-space:nowrap', text: a.dueAt ? fmtDateTime(a.dueAt) : '未設定' }),
        el('td', {}, [el('button', {
          class: 'btn btn-danger btn-sm btn-rect', type: 'button',
          onclick: () => confirmThen(`移除作業「${a.title}」？`, () => guard(async () => {
            await deleteAssignment(editorCourse.id, a.id); await refreshMaterials();
          }, '#matBanner'))
        }, '移除')])
      ]))
    : [emptyRow(3, '尚未設定作業。')]));
}

/* ---------- 下載全部講義（ZIP，供離線編輯組織後再整批上傳） ---------- */

let jsZipLoading = null;

/** 動態載入 JSZip，只在真的按下下載時才拉這個 library，不拖慢一般後台載入速度 */
function loadJSZip() {
  if (window.JSZip) return Promise.resolve(window.JSZip);
  if (jsZipLoading) return jsZipLoading;
  jsZipLoading = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdnjs.cloudflare.com/ajax/libs/jszip/3.10.1/jszip.min.js';
    s.onload = () => resolve(window.JSZip);
    s.onerror = () => { jsZipLoading = null; reject(new Error('JSZip 載入失敗，請檢查網路連線後再試一次。')); };
    document.head.append(s);
  });
  return jsZipLoading;
}

async function downloadAllMaterials() {
  if (!currentMaterials.length) {
    banner('#matBanner', '目前沒有講義可以下載。', 'warn');
    return;
  }

  banner('#matBanner', `正在打包 ${currentMaterials.length} 份檔案…`, 'info');
  const JSZip = await loadJSZip();
  const zip = new JSZip();
  let ok = 0, fail = 0;

  for (const m of currentMaterials) {
    try {
      const res = await fetch(materialUrl(m));
      if (!res.ok) throw new Error(String(res.status));
      const blob = await res.blob();
      // 外部連結（https 開頭的 path）沒有實際的 repo 內路徑可以還原資料夾結構，
      // 只好退回用檔名；其餘一律用 path，這樣 ZIP 裡的資料夾結構會跟目前的單元分類一致。
      const zipPath = /^https?:\/\//.test(m.path || '') ? (m.name || 'file') : (m.path || m.name || 'file');
      zip.file(zipPath, blob);
      ok++;
    } catch (err) {
      fail++;
      console.error('下載失敗：', m.name || m.path, err);
    }
  }

  if (!ok) {
    banner('#matBanner',
      '全部檔案下載失敗，請確認網站已發布到 GitHub Pages（本機預覽或尚未 push 的檔案抓不到內容）。', 'error');
    return;
  }

  const blob = await zip.generateAsync({ type: 'blob' });
  const url = URL.createObjectURL(blob);
  const a = el('a', {
    href: url,
    download: `${safeName(editorCourse.code || editorCourse.id || 'course')}-講義.zip`
  });
  document.body.append(a); a.click(); a.remove();
  URL.revokeObjectURL(url);

  banner('#matBanner',
    `已下載 ${ok} 份檔案${fail ? `，${fail} 份下載失敗（詳見瀏覽器主控台）` : ''}。`,
    fail ? 'warn' : 'success');
}

/** 依 id 陣列的先後順序，把新的 order 值寫回 Firestore */
async function persistMaterialOrder(orderedIds) {
  await Promise.all(orderedIds.map((id, i) => saveMaterial(editorCourse.id, id, { order: i })));
}

/** 上／下移一步，供無法拖曳的裝置（觸控螢幕、鍵盤操作）使用 */
async function moveMaterial(id, delta) {
  const ids = currentMaterials.map(m => m.id);
  const i = ids.indexOf(id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  await persistMaterialOrder(ids);
  await refreshMaterials();
}

/** 講義列表的拖曳排序：拖曳中即時移動 DOM，放開後才寫回資料庫 */
async function persistAndSyncMaterials(ids) {
  await persistMaterialOrder(ids);
  // 不整批重繪，避免拖曳完成的瞬間畫面閃動；只更新本地順序快取
  currentMaterials = ids.map(id => currentMaterials.find(m => m.id === id)).filter(Boolean);
  banner('#matBanner', '順序已更新。', 'success');
}

/* ==========================================================================
   拖拉上傳
   ========================================================================== */

/** PPTX 擋下時，在上傳清單裡長出一張說明卡，而不是丟一句錯誤了事 */
function pptxCard(file) {
  return el('div', { class: 'up-item is-block' }, [
    el('div', { class: 'up-head' }, [
      el('span', { class: 'up-name', text: file.name }),
      el('span', { class: 'up-tag warn', text: '需先轉檔' })
    ]),
    el('div', { class: 'up-guide' }, [
      el('strong', { text: PPTX_GUIDE.title }),
      el('p', { text: PPTX_GUIDE.why }),
      el('ol', {}, PPTX_GUIDE.steps.map(s => el('li', { text: s }))),
      el('p', { class: 'up-guide-alt', text: PPTX_GUIDE.mac }),
      el('p', { class: 'up-guide-alt', text: PPTX_GUIDE.gslides })
    ])
  ]);
}

function uploadRow(file) {
  const bar = el('i');
  const msg = el('span', { class: 'up-msg', text: '等待中…' });
  const row = el('div', { class: 'up-item' }, [
    el('div', { class: 'up-head' }, [
      el('span', { class: 'up-name', text: file.name }),
      el('span', { class: 'up-size', text: humanSize(file.size) })
    ]),
    el('div', { class: 'up-bar' }, [bar]),
    msg
  ]);
  return {
    row,
    progress(pct, text) { bar.style.width = `${pct}%`; msg.textContent = text; },
    done(text) { row.classList.add('is-ok'); bar.style.width = '100%'; msg.textContent = text; },
    fail(text) { row.classList.add('is-bad'); bar.style.width = '100%'; msg.textContent = text; }
  };
}

async function handleFiles(files) {
  const list = $('#uploadList');
  const unit = $('#mfUnit').value.trim();

  if (!hasToken()) {
    banner('#matBanner',
      '尚未設定 GitHub 存取金鑰，無法上傳。請點右上角「上傳設定」完成一次性設定。', 'warn');
    openModal('modalUpload');
    return;
  }

  // 檔案放在「課程代碼/單元」底下，路徑才好辨認
  const subdir = [
    safeName(editorCourse.code || editorCourse.id),
    unit ? safeName(unit) : ''
  ].filter(Boolean).join('/');

  // 拖拉上傳一律放到目前清單最後面（不讀「手動加入」表單裡的排序欄位——
  // 那是另一個表單的欄位，用同一個 id 只是巧合，用在這裡會讓新檔案永遠洗到最前面）。
  // 同一批拖拉多個檔案時依序遞增，維持上傳順序。
  let nextOrder = nextMaterialOrder();

  // 整批上傳時依檔名自然排序（數字照大小比較，例如 Lecture2 排在 Lecture10 前面），
  // 而不是依瀏覽器選取／拖放當下的任意順序——這樣離線重新整理過檔名後，
  // 整批拖回來就能自動照正確順序排好，不必再逐一手動調整。
  const sortedFiles = [...files].sort((a, b) =>
    a.name.localeCompare(b.name, 'zh-Hant-TW', { numeric: true, sensitivity: 'base' }));

  for (const file of sortedFiles) {
    if (isPowerPoint(file.name)) {
      list.append(pptxCard(file));
      continue;
    }

    const ui = uploadRow(file);
    list.append(ui.row);

    try {
      const result = await uploadFile(file, subdir, ui.progress);
      // 上傳成功後才寫入 Firestore，避免資料庫出現指向不存在檔案的紀錄
      await saveMaterial(editorCourse.id, null, {
        unit: unit || '課程講義',
        name: result.name,
        path: result.path,
        size: result.size,
        order: nextOrder++
      });
      ui.done(result.replaced ? '已覆寫既有檔案並更新紀錄' : '上傳完成');
      await refreshMaterials();
    } catch (err) {
      ui.fail(err.message === 'PPTX_NEEDS_CONVERT' ? '請先轉成 PDF' : err.message);
    }
  }

  $('#fileInput').value = '';
}

function initDropzone() {
  const dz = $('#dropzone');
  const input = $('#fileInput');
  if (!dz || !input) return;

  dz.addEventListener('click', () => input.click());
  dz.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); input.click(); }
  });
  input.addEventListener('change', () => {
    if (input.files.length) handleFiles([...input.files]);
  });

  ['dragenter', 'dragover'].forEach(ev =>
    dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.add('is-over'); }));
  ['dragleave', 'drop'].forEach(ev =>
    dz.addEventListener(ev, e => { e.preventDefault(); dz.classList.remove('is-over'); }));

  dz.addEventListener('drop', e => {
    const files = [...(e.dataTransfer?.files || [])];
    if (files.length) handleFiles(files);
  });

  // 避免拖到視窗其他地方時瀏覽器直接開啟檔案
  ['dragover', 'drop'].forEach(ev =>
    window.addEventListener(ev, e => { if (e.target !== dz && !dz.contains(e.target)) e.preventDefault(); }));
}

/* ---------- 上傳設定 ---------- */

function initUploadSettings() {
  $('#btnUploadSettings').addEventListener('click', () => {
    $('#ghRepo').value = getRepo();
    $('#ghToken').value = getToken();
    banner('#upBanner', hasToken() ? '目前已設定金鑰。' : '尚未設定金鑰。', hasToken() ? 'success' : 'info');
    openModal('modalUpload');
  });

  $('#btnSaveToken').addEventListener('click', async () => {
    // 欄位留空時採用預設值，不要因此擋下使用者
    let repo = $('#ghRepo').value.trim() || getRepo();
    $('#ghRepo').value = repo;

    const token = $('#ghToken').value.trim();
    if (!repo.includes('/')) {
      banner('#upBanner',
        'repo 格式應為「帳號/儲存庫」，例如 <code>NCHSIEH/nchsieh.github.io</code>。', 'error');
      return;
    }
    if (!token) { banner('#upBanner', '請貼上存取金鑰。', 'error'); return; }

    setRepo(repo); setToken(token);
    banner('#upBanner', '測試連線中…', 'info');
    try {
      const info = await verifyAccess();
      if (!info.canPush) {
        banner('#upBanner',
          `連上了 <code>${esc(info.fullName)}</code>，但這組金鑰沒有寫入權限。<br>` +
          '請確認 Permissions 中的 <code>Contents</code> 設為 <strong>Read and write</strong>。', 'error');
        return;
      }
      banner('#upBanner',
        `連線成功：<code>${esc(info.fullName)}</code>（分支 <code>${esc(info.branch)}</code>）<br>現在可以拖拉上傳了。`,
        'success');
    } catch (err) {
      banner('#upBanner', esc(err.message), 'error');
    }
  });

  $('#btnClearToken').addEventListener('click', () => {
    setToken('');
    $('#ghToken').value = '';
    banner('#upBanner', '金鑰已從這台裝置清除。', 'info');
  });
}

/* ==========================================================================
   學生管理（審核佇列 + 學生名單兩個子分頁）
   ========================================================================== */

const STATUS_BADGE = {
  pending:   ['pending',  '審核中'],
  approved:  ['approved', '已核准'],
  rejected:  ['rejected', '已駁回'],
  suspended: ['rejected', '已暫停']
};

/** 目前顯示中的學生清單，供拖曳排序與課程權限彈窗查找資料 */
let currentStudents = [];

/**
 * 統一的「刪除學生」流程：先刪 Firestore 紀錄，再嘗試刪除 Firebase Auth 帳號
 * （只有設定過 DELETE_USER_API_URL 才會真的呼叫；沒設定就維持舊行為，只刪 Firestore）。
 * Auth 帳號刪除失敗不會讓整個操作報錯中斷——Firestore 紀錄畢竟已經刪掉了，
 * 只用警告訊息提醒管理者自行到 Console 補刪。
 */
async function deleteStudentEverywhere(r) {
  await removeStudent(r.id);
  try {
    const result = await deleteAuthAccount(r.id);
    banner('#adminOpBanner',
      result.skipped
        ? `已刪除 ${r.email} 的申請紀錄。`
        : `已刪除 ${r.email} 的申請紀錄與登入帳號。`,
      'success');
  } catch (err) {
    banner('#adminOpBanner',
      `Firestore 紀錄已刪除，但登入帳號刪除失敗：${esc(err.message || String(err))}。請至 Firebase Console 手動刪除。`,
      'warn');
  }
  await refreshBoth();
  await refreshDash();
}

function deleteConfirmMessage(r) {
  return DELETE_USER_API_URL
    ? `刪除 ${r.email} 的申請紀錄？\n\n這會同時刪除 Firestore 紀錄與 Firebase 登入帳號，動作無法復原。`
    : `刪除 ${r.email} 的申請紀錄？\n\n注意：這只會移除 Firestore 紀錄。` +
      `Firebase Authentication 中的帳號仍然存在，需另行至 Console 刪除。`;
}

function studentRow(r, index) {
  const [cls, label] = STATUS_BADGE[r.status] || ['guest', r.status || '—'];
  const canScope = r.status === 'approved' || r.status === 'suspended';

  return el('tr', { draggable: 'true', 'data-id': r.id, 'data-order': String(index) }, [
    el('td', { class: 'col-drag' }, [
      el('input', { type: 'checkbox', class: 'row-select-cb', 'aria-label': `選取「${r.name || r.email}」，可多選後一起拖曳` }),
      el('span', { class: 'drag-handle', title: '拖曳調整順序', 'aria-hidden': 'true', text: '⠿' }),
      el('span', { class: 'reorder-btns' }, [
        el('button', {
          type: 'button', class: 'reorder-btn', title: '上移', 'aria-label': `將「${r.name || r.email}」上移`,
          onclick: () => guard(() => moveStudent(r.id, -1))
        }, '▲'),
        el('button', {
          type: 'button', class: 'reorder-btn', title: '下移', 'aria-label': `將「${r.name || r.email}」下移`,
          onclick: () => guard(() => moveStudent(r.id, 1))
        }, '▼')
      ])
    ]),
    el('td', {}, [
      el('div', { style: 'font-weight:600', text: r.name || '(未填姓名)' }),
      el('div', { style: 'font-size:12px;color:var(--faint)', text: r.email || '' }),
      el('div', { class: 'mono', style: 'font-size:11.5px;color:var(--faint);margin-top:2px',
        text: [r.studentId && `學號 ${r.studentId}`, r.className && `班級 ${r.className}`].filter(Boolean).join('　') || '—' })
    ]),
    el('td', { style: 'font-size:12.5px;white-space:nowrap', text: fmtDateTime(r.createdAt) }),
    el('td', {}, [el('span', { class: `state-badge ${cls}`, text: label })]),
    el('td', {}, [
      canScope
        ? el('button', {
            class: 'btn btn-ghost btn-sm btn-rect', type: 'button',
            title: r.allowedCourses?.length ? `限定 ${r.allowedCourses.length} 門課程` : '不限制，可看全部課程',
            onclick: () => openAccessModal(r)
          }, r.allowedCourses?.length ? `已限定 ${r.allowedCourses.length} 門` : '全部課程')
        : el('span', { style: 'color:var(--faint);font-size:12.5px', text: '—' })
    ]),
    el('td', {}, [el('div', { class: 'actions' }, [
      r.status !== 'approved' && el('button', {
        class: 'btn btn-ok btn-sm btn-rect', type: 'button',
        onclick: () => guard(async () => {
          await decideStudent(r.id, 'approved', me.user.email);
          await refreshBoth(); await refreshDash();
          banner('#adminOpBanner', `已核准 ${r.email}。`, 'success');
        })
      }, r.status === 'suspended' ? '恢復存取' : '核准'),
      r.status === 'approved' && el('button', {
        class: 'btn btn-quiet btn-sm btn-rect', type: 'button',
        onclick: () => confirmThen(`暫停 ${r.email} 的講義存取權？\n可隨時再按「恢復存取」還原，原始申請資料不會被清除。`, () => guard(async () => {
          await decideStudent(r.id, 'suspended', me.user.email);
          await refreshBoth(); await refreshDash();
          banner('#adminOpBanner', `已暫停 ${r.email} 的存取權。`, 'success');
        }))
      }, '暫停存取'),
      r.status !== 'rejected' && el('button', {
        class: 'btn btn-danger btn-sm btn-rect', type: 'button',
        onclick: () => confirmThen(`駁回 ${r.email} 的申請？`, () => guard(async () => {
          await decideStudent(r.id, 'rejected', me.user.email);
          await refreshBoth(); await refreshDash();
        }))
      }, '駁回'),
      el('button', {
        class: 'btn btn-quiet btn-sm btn-rect', type: 'button',
        onclick: () => confirmThen(deleteConfirmMessage(r), () => guard(() => deleteStudentEverywhere(r)))
      }, '刪除')
    ].filter(Boolean))])
  ]);
}

/** 審核佇列：只列待審核申請，動作精簡為核准／駁回／刪除 */
function queueRow(r) {
  return el('tr', {}, [
    el('td', {}, [
      el('div', { style: 'font-weight:600', text: r.name || '(未填姓名)' }),
      el('div', { style: 'font-size:12px;color:var(--faint)', text: r.email || '' }),
      el('div', { class: 'mono', style: 'font-size:11.5px;color:var(--faint);margin-top:2px',
        text: [r.studentId && `學號 ${r.studentId}`, r.className && `班級 ${r.className}`].filter(Boolean).join('　') || '—' })
    ]),
    el('td', { style: 'font-size:12.5px;white-space:nowrap', text: fmtDateTime(r.createdAt) }),
    el('td', {}, [el('div', { class: 'actions' }, [
      el('button', {
        class: 'btn btn-ok btn-sm btn-rect', type: 'button',
        onclick: () => guard(async () => {
          await decideStudent(r.id, 'approved', me.user.email);
          await refreshBoth(); await refreshDash();
          banner('#adminOpBanner', `已核准 ${r.email}，可到「學生名單」查看與管理。`, 'success');
        })
      }, '核准'),
      el('button', {
        class: 'btn btn-danger btn-sm btn-rect', type: 'button',
        onclick: () => confirmThen(`駁回 ${r.email} 的申請？`, () => guard(async () => {
          await decideStudent(r.id, 'rejected', me.user.email);
          await refreshBoth(); await refreshDash();
        }))
      }, '駁回'),
      el('button', {
        class: 'btn btn-quiet btn-sm btn-rect', type: 'button',
        onclick: () => confirmThen(deleteConfirmMessage(r), () => guard(() => deleteStudentEverywhere(r)))
      }, '刪除')
    ])])
  ]);
}

async function refreshQueue() {
  const tbody = $('#queueTbody');
  tbody.replaceChildren(emptyRow(3, '讀取中…'));

  const rows = await listStudents('pending');
  $('#queueCount').textContent = `${rows.length} 筆`;
  const badge = $('#queueBadge');
  badge.textContent = rows.length;
  badge.hidden = rows.length === 0;

  if (!rows.length) { tbody.replaceChildren(emptyRow(3, '目前沒有待審核的申請。')); return; }
  tbody.replaceChildren(...rows.map(queueRow));
}

async function refreshRoster() {
  const filter = $('#studentFilter').value;
  const tbody = $('#studentTbody');
  tbody.replaceChildren(emptyRow(6, '讀取中…'));

  const rows = await listStudents(filter);
  currentStudents = rows;
  $('#studentCount').textContent = `${rows.length} 筆`;

  if (!rows.length) {
    tbody.replaceChildren(emptyRow(6, '沒有符合條件的紀錄。'));
    return;
  }

  tbody.replaceChildren(...rows.map((r, i) => studentRow(r, i)));
}

/** 兩個子分頁的資料互相牽動（核准／駁回／刪除都會讓學生在兩邊清單間移動），統一一起刷新 */
async function refreshBoth() {
  await Promise.all([refreshQueue(), refreshRoster()]);
}

/** 沿用舊名稱，讓其他呼叫端（refreshAll、密碼變更後的整批刷新等）不用跟著改 */
async function refreshStudents() {
  await refreshBoth();
}

/** 依 uid 陣列的先後順序，把新的 order 值寫回 Firestore */
async function persistStudentOrder(orderedIds) {
  await saveStudentOrder(orderedIds);
}

/** 上／下移一步，供無法拖曳的裝置（觸控螢幕、鍵盤操作）使用 */
async function moveStudent(id, delta) {
  const ids = currentStudents.map(r => r.id);
  const i = ids.indexOf(id);
  const j = i + delta;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  await persistStudentOrder(ids);
  await refreshRoster();
}

/** 學生列表的拖曳排序：拖曳中即時移動 DOM，放開後才寫回資料庫 */
async function persistAndSyncStudents(ids) {
  await persistStudentOrder(ids);
  currentStudents = ids.map(id => currentStudents.find(r => r.id === id)).filter(Boolean);
  banner('#adminOpBanner', '學生順序已更新。', 'success');
}

/* ---------- 課程存取權限彈窗 ---------- */

let accessStudent = null;

function setAccessListDisabled(disabled) {
  $('#accessCourseList').classList.toggle('is-disabled', disabled);
  $$('.access-course-cb').forEach(cb => { cb.disabled = disabled; });
}

function renderAccessCourseList(student) {
  const box = $('#accessCourseList');
  const allowed = new Set(student.allowedCourses || []);
  if (!currentCourses.length) {
    box.replaceChildren(el('p', { style: 'color:var(--faint);font-size:13px', text: '目前尚未建立任何課程。' }));
    return;
  }
  box.replaceChildren(...currentCourses.map(c => el('label', {
    style: 'display:flex;align-items:center;gap:8px;font-size:13.5px'
  }, [
    el('input', { type: 'checkbox', class: 'access-course-cb', value: c.id, checked: allowed.has(c.id) }),
    el('span', { text: `${cleanText(c.titleZh) || cleanText(c.code) || '(未命名)'}${cleanText(c.semester) ? `（${cleanText(c.semester)}）` : ''}` })
  ])));
}

async function openAccessModal(student) {
  accessStudent = student;
  $('#accessModalSub').textContent = `${student.name || student.email} — 設定可讀取的課程範圍`;
  banner('#accessBanner', '');

  if (!currentCourses.length) currentCourses = await listCourses();
  renderAccessCourseList(student);

  const noRestriction = !student.allowedCourses || student.allowedCourses.length === 0;
  $('#accessAll').checked = noRestriction;
  setAccessListDisabled(noRestriction);

  openModal('modalAccess');
}

/* ==========================================================================
   公告
   ========================================================================== */

function emailjsConfigured() {
  return !!(EMAILJS_SERVICE_ID && EMAILJS_TEMPLATE_ID && EMAILJS_PUBLIC_KEY);
}

/** 發布公告表單的「指定班級／課程／學生」三層篩選——用真實資料做成下拉選單與
    勾選清單，取代原本要手動打字、必須跟學生填的班級完全相符的做法。 */
let annAllStudents = [];

function courseLabel(c) {
  return `${cleanText(c.titleZh) || cleanText(c.code) || '(未命名)'}${cleanText(c.semester) ? `（${cleanText(c.semester)}）` : ''}`;
}

/** 公告列表顯示用：課程可能後來被刪除，找不到時給個清楚的說明而不是空白 */
function targetCourseLabel(a) {
  if (!a.targetCourseId) return '';
  const c = currentCourses.find(c => c.id === a.targetCourseId);
  return c ? courseLabel(c) : '（課程已刪除）';
}

/** 依目前選擇的班級／課程即時過濾學生勾選清單，只列出可能符合條件的人 */
function renderAnnTargetStudents() {
  const box = $('#annTargetStudents');
  if (!box) return;
  const cls = $('#annTargetClass').value;
  const courseId = $('#annTargetCourse').value;

  // 已勾選的人即使因為改班級／課程篩選而被過濾掉，也保留勾選狀態，避免使用者
  // 選了幾個人之後又調整上面條件，結果選擇被悄悄清空。
  const kept = new Set($$('.ann-student-cb').filter(cb => cb.checked).map(cb => cb.value));

  const visible = annAllStudents.filter(s =>
    (!cls || (s.className || '') === cls) &&
    (!courseId || courseAllowedForStudent(s, courseId))
  );

  if (!visible.length) {
    box.replaceChildren(el('p', { style: 'color:var(--faint);font-size:13px;margin:0', text: '目前沒有符合班級／課程條件的學生。' }));
    return;
  }

  box.replaceChildren(...visible.map(s => el('label', {
    style: 'display:flex;align-items:center;gap:8px;font-size:13.5px'
  }, [
    el('input', { type: 'checkbox', class: 'ann-student-cb', value: s.id, checked: kept.has(s.id) }),
    el('span', { text: `${s.name || s.email}${s.className ? `　${s.className}` : ''}` })
  ])));
}

async function initAnnouncementTargeting() {
  annAllStudents = await listStudents('all');
  if (!currentCourses.length) currentCourses = await listCourses();

  const classes = [...new Set(annAllStudents.map(s => s.className).filter(Boolean))].sort();
  $('#annTargetClass').replaceChildren(
    el('option', { value: '', text: '全部班級' }),
    ...classes.map(c => el('option', { value: c, text: c }))
  );
  $('#annTargetCourse').replaceChildren(
    el('option', { value: '', text: '全部課程' }),
    ...currentCourses.map(c => el('option', { value: c.id, text: courseLabel(c) }))
  );

  renderAnnTargetStudents();
  $('#annTargetClass').addEventListener('change', renderAnnTargetStudents);
  $('#annTargetCourse').addEventListener('change', renderAnnTargetStudents);
}

function resetAnnouncementTargeting() {
  $('#annTargetClass').value = '';
  $('#annTargetCourse').value = '';
  renderAnnTargetStudents();
}

/** 依公告的班級／課程／指定學生條件，找出應該收提醒信的已核准學生 */
async function reminderTargets(a) {
  const approved = await listStudents('approved');
  if (!a.targetClass && !a.targetCourseId && !a.targetStudentIds?.length) return approved;
  return approved.filter(s => studentMatchesAnnouncement(s, s.id, a));
}

async function sendAnnouncementReminder(a) {
  if (!emailjsConfigured()) {
    banner('#adminOpBanner',
      '尚未設定 EmailJS，請至「系統」分頁查看設定方式（需編輯 assets/js/config.js）。', 'warn');
    return;
  }
  if (typeof window.emailjs === 'undefined') {
    banner('#adminOpBanner', 'EmailJS 程式庫尚未載入，請確認網路連線後重新整理頁面。', 'error');
    return;
  }

  const targets = await reminderTargets(a);
  if (!targets.length) {
    const restricted = a.targetClass || a.targetCourseId || a.targetStudentIds?.length;
    banner('#adminOpBanner',
      restricted ? '符合這則公告篩選條件的已核准學生目前沒有人，沒有寄出任何信件。' : '目前沒有已核准的學生。', 'warn');
    return;
  }

  banner('#adminOpBanner', `正在寄送給 ${targets.length} 位學生…`, 'info');
  window.emailjs.init({ publicKey: EMAILJS_PUBLIC_KEY });

  let ok = 0, fail = 0;
  for (const s of targets) {
    try {
      await window.emailjs.send(EMAILJS_SERVICE_ID, EMAILJS_TEMPLATE_ID, {
        to_email: s.email, to_name: s.name || s.email,
        subject: a.title || '', message: a.body || ''
      });
      ok++;
    } catch { fail++; }
    // 免費方案有寄送頻率限制，逐封間隔一下避免被擋
    await new Promise(r => setTimeout(r, 350));
  }

  await markAnnouncementReminderSent(a.id);
  banner('#adminOpBanner',
    `Email 提醒已處理完成：成功 ${ok} 封${fail ? `，失敗 ${fail} 封` : ''}。`,
    fail ? 'warn' : 'success');
  await refreshAnnouncements();
}

function fmtAnnPeriod(a) {
  if (!a.startAt && !a.endAt) return '即時生效・不過期';
  const from = a.startAt ? fmtDateTime(a.startAt).split(' ')[0] : '即時';
  const to = a.endAt ? fmtDateTime(a.endAt).split(' ')[0] : '不過期';
  return `${from} ～ ${to}`;
}

async function refreshAnnouncements() {
  const tbody = $('#annTbody');
  tbody.replaceChildren(emptyRow(4, '讀取中…'));
  if (!currentCourses.length) currentCourses = await listCourses();
  const rows = await listAnnouncements(50);
  if (!rows.length) { tbody.replaceChildren(emptyRow(4, '尚無公告。')); return; }

  tbody.replaceChildren(...rows.map(a => el('tr', {}, [
    el('td', {}, [
      el('div', { style: 'font-weight:600', text: a.title || '' }),
      el('div', { style: 'font-size:12.5px;color:var(--muted)', text: a.body || '' }),
      el('div', { style: 'font-size:11.5px;color:var(--faint);margin-top:2px', text: fmtDateTime(a.publishedAt) })
    ]),
    el('td', { style: 'font-size:12.5px;white-space:nowrap' }, [
      el('div', { text: a.targetClass ? `班級：${a.targetClass}` : '全部班級' }),
      a.targetCourseId
        ? el('div', { style: 'color:var(--faint)', text: `課程：${targetCourseLabel(a)}` })
        : null,
      a.targetStudentIds?.length
        ? el('div', { style: 'color:var(--faint)', text: `另外限縮到 ${a.targetStudentIds.length} 位指定學生` })
        : null,
      el('div', { style: 'color:var(--faint);margin-top:2px', text: fmtAnnPeriod(a) })
    ].filter(Boolean)),
    el('td', {}, [
      a.reminderSentAt
        ? el('span', { class: 'state-badge approved', text: `已寄送 ${fmtDateTime(a.reminderSentAt)}` })
        : el('button', {
            class: 'btn btn-ghost btn-sm btn-rect', type: 'button',
            onclick: () => guard(() => sendAnnouncementReminder(a))
          }, '寄送提醒')
    ]),
    el('td', {}, [el('button', {
      class: 'btn btn-danger btn-sm btn-rect', type: 'button',
      onclick: () => confirmThen(`刪除公告「${a.title}」？`, () => guard(async () => {
        await deleteAnnouncement(a.id); await refreshAnnouncements(); await refreshDash();
      }))
    }, '刪除')])
  ])));
}

/* ==========================================================================
   訪客統計
   ========================================================================== */

let anaPeriod = 'today';

/** 目前選擇的期間換算成 [start, end]（含頭尾）的 day 字串，與 analytics.js 記錄格式一致 */
function anaPeriodRange(period) {
  const today = new Date();
  if (period === 'today') { const t = dayKey(today); return { start: t, end: t }; }
  if (period === 'custom') {
    const start = $('#anaStart').value;
    const end = $('#anaEnd').value;
    return { start, end };
  }
  const days = Number(period) || 7;
  const start = new Date(today);
  start.setDate(start.getDate() - (days - 1));
  return { start: dayKey(start), end: dayKey(today) };
}

/** 列出 start～end（含頭尾）之間每一天的字串，讓每日統計表就算沒有資料的那天也會顯示成 0，而不是悄悄跳過 */
function anaDaysInRange(startDay, endDay) {
  const out = [];
  const d = new Date(`${startDay}T00:00:00Z`);
  const end = new Date(`${endDay}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || Number.isNaN(end.getTime()) || d > end) return out;
  while (d <= end) {
    out.push(dayKey(d));
    d.setUTCDate(d.getUTCDate() + 1);
  }
  return out;
}

function anaTsMillis(ts) { return ts?.seconds ? ts.seconds * 1000 : 0; }

const ANA_ROLE_LABEL = { guest: '訪客', applicant: '申請中學生', student: '學生', admin: '管理者' };

/**
 * 把一段期間內的原始瀏覽紀錄彙整成三種統計角度：
 *   byDay     — 逐日的瀏覽次數與不重複訪客數
 *   byVisitor — 逐訪客的瀏覽次數、首次／最後造訪、目前已知身分（取時間最新的一筆為準）
 *   byPage    — 逐頁面的瀏覽次數
 */
function aggregatePageviews(rows) {
  const byDay = new Map();
  const byVisitor = new Map();
  const byPage = new Map();
  let knownViews = 0;

  for (const r of rows) {
    const t = anaTsMillis(r.ts);

    const d = byDay.get(r.day) || { count: 0, visitors: new Set() };
    d.count++; d.visitors.add(r.visitorId);
    byDay.set(r.day, d);

    const prev = byVisitor.get(r.visitorId);
    if (!prev) {
      byVisitor.set(r.visitorId, {
        count: 1, firstTs: t, lastTs: t, role: r.role, name: r.viewerName, email: r.viewerEmail
      });
    } else {
      prev.count++;
      if (t && (!prev.firstTs || t < prev.firstTs)) prev.firstTs = t;
      // 身分／姓名以時間最新的一筆為準：同一裝置可能先以訪客身分瀏覽、後來才登入
      if (t && t >= prev.lastTs) {
        prev.lastTs = t; prev.role = r.role; prev.name = r.viewerName; prev.email = r.viewerEmail;
      }
    }

    byPage.set(r.path, (byPage.get(r.path) || 0) + 1);
    if (r.role === 'student' || r.role === 'admin') knownViews++;
  }

  return { byDay, byVisitor, byPage, knownViews };
}

async function refreshAnalytics() {
  const { start, end } = anaPeriodRange(anaPeriod);
  if (!start || !end || start > end) {
    banner('#analyticsBanner', '請選擇正確的日期區間（起始日不能晚於結束日）。', 'error');
    return;
  }

  banner('#analyticsBanner', '讀取中…', 'info');
  const rows = await listPageviews(start, end);
  const { byDay, byVisitor, byPage, knownViews } = aggregatePageviews(rows);
  const dayList = anaDaysInRange(start, end);

  $('#anaTotalViews').textContent = String(rows.length);
  $('#anaUniqueVisitors').textContent = String(byVisitor.size);
  $('#anaAvgPerDay').textContent = dayList.length ? (rows.length / dayList.length).toFixed(1) : '0';
  $('#anaKnownViews').textContent = String(knownViews);

  // 每日統計：新到舊排列，長條圖依這段期間內的最高值等比例呈現
  const maxDayCount = Math.max(1, ...dayList.map(d => byDay.get(d)?.count || 0));
  $('#anaDayTbody').replaceChildren(...(dayList.length
    ? [...dayList].reverse().map(day => {
        const info = byDay.get(day);
        const count = info?.count || 0;
        const uniq = info?.visitors.size || 0;
        const pct = count ? Math.max(Math.round((count / maxDayCount) * 100), 4) : 0;
        return el('tr', {}, [
          el('td', { text: day }),
          el('td', { text: String(count) }),
          el('td', { text: String(uniq) }),
          el('td', { class: 'ana-bar-cell' }, [
            el('div', { class: 'ana-bar-track' }, [el('div', { class: 'ana-bar-fill', style: `width:${pct}%` })])
          ])
        ]);
      })
    : [emptyRow(4, '請先選擇期間。')]));

  // 依訪客統計：瀏覽次數多到少，最多顯示前 50 位（訪客規模夠小的個人課程網站，不需要分頁）
  const visitorRows = [...byVisitor.entries()].sort((a, b) => b[1].count - a[1].count).slice(0, 50);
  $('#anaVisitorTbody').replaceChildren(...(visitorRows.length
    ? visitorRows.map(([id, v]) => el('tr', {}, [
        el('td', {}, [
          (v.name || v.email)
            ? el('div', {}, [
                el('div', { style: 'font-weight:600', text: v.name || v.email }),
                (v.name && v.email) ? el('div', { class: 'ana-visitor-id', text: v.email }) : null
              ].filter(Boolean))
            : el('span', { class: 'ana-visitor-id', text: `${id.slice(0, 10)}…` })
        ]),
        el('td', { text: ANA_ROLE_LABEL[v.role] || '訪客' }),
        el('td', { text: String(v.count) }),
        el('td', { style: 'white-space:nowrap;font-size:12.5px', text: v.firstTs ? fmtDateTime(new Date(v.firstTs)) : '—' }),
        el('td', { style: 'white-space:nowrap;font-size:12.5px', text: v.lastTs ? fmtDateTime(new Date(v.lastTs)) : '—' })
      ]))
    : [emptyRow(5, '這段期間沒有訪客紀錄。')]));

  // 依頁面統計：瀏覽次數多到少
  const pageRows = [...byPage.entries()].sort((a, b) => b[1] - a[1]);
  $('#anaPageTbody').replaceChildren(...(pageRows.length
    ? pageRows.map(([path, count]) => el('tr', {}, [el('td', { class: 'mono', text: path }), el('td', { text: String(count) })]))
    : [emptyRow(2, '這段期間沒有資料。')]));

  banner('#analyticsBanner', '');
}

function initAnalyticsControls() {
  const tabs = $$('#anaPeriodTabs [role="tab"]');
  tabs.forEach(tab => tab.addEventListener('click', () => {
    tabs.forEach(t => { t.setAttribute('aria-selected', String(t === tab)); t.tabIndex = t === tab ? 0 : -1; });
    anaPeriod = tab.dataset.period;
    $('#anaCustomRange').hidden = anaPeriod !== 'custom';
    if (anaPeriod !== 'custom') guard(refreshAnalytics, '#analyticsBanner');
  }));

  const today = dayKey(new Date());
  if ($('#anaEnd') && !$('#anaEnd').value) $('#anaEnd').value = today;

  $('#btnApplyAnaRange')?.addEventListener('click', () => guard(refreshAnalytics, '#analyticsBanner'));
  $('#btnReloadAnalytics')?.addEventListener('click', () => guard(refreshAnalytics, '#analyticsBanner'));
}

/* ==========================================================================
   外觀 — 全站預設
   ========================================================================== */

/** 「課程講義呈現方式」目前選擇；初值等 refreshSiteDefault() 讀到現有設定後才會校正 */
let selectedMaterialsDisplay = DEFAULT_MATERIALS_DISPLAY;

function renderMaterialsDisplayPicker(container) {
  if (!container) return;
  container.replaceChildren(...MATERIALS_DISPLAY_MODES.map(m => el('button', {
    type: 'button',
    class: 'look-card',
    'aria-pressed': String(m.id === selectedMaterialsDisplay),
    onclick: () => { selectedMaterialsDisplay = m.id; renderMaterialsDisplayPicker(container); }
  }, [
    el('span', { class: 'name', text: m.name }),
    el('span', { style: 'font-size:11.5px;color:var(--faint);line-height:1.5', text: m.note })
  ])));
}

async function refreshSiteDefault() {
  const box = $('#siteDefaultInfo');
  box.innerHTML = '<p><span class="dot"></span>讀取中…</p>';
  const settings = await getSiteSettings();
  selectedMaterialsDisplay = settings?.materialsDisplay || DEFAULT_MATERIALS_DISPLAY;
  renderMaterialsDisplayPicker($('#materialsDisplayPicker'));

  if (!settings) {
    box.innerHTML = `<p><span class="dot wait"></span>尚未設定過，目前訪客看到的是程式內建預設值。</p>`;
    return;
  }
  const themeName  = THEMES.find(t => t.id === settings.theme)?.name || settings.theme || '（未知）';
  const layoutName = LAYOUTS.find(l => l.id === settings.layout)?.name || settings.layout || '（未知）';
  const materialsName = MATERIALS_DISPLAY_MODES.find(m => m.id === selectedMaterialsDisplay)?.name || selectedMaterialsDisplay;
  box.innerHTML = `
    <p><span class="dot ok"></span>版型：<code>${esc(layoutName)}</code></p>
    <p><span class="dot ok"></span>配色：<code>${esc(themeName)}</code></p>
    <p><span class="dot ok"></span>課程講義呈現：<code>${esc(materialsName)}</code></p>
    <p style="margin-top:6px;color:var(--faint);font-size:12.5px">${esc(fmtDateTime(settings.updatedAt))} 更新</p>`;
}

/* ==========================================================================
   備份
   ========================================================================== */

async function doBackup() {
  banner('#adminOpBanner', '正在彙整資料…', 'info');
  const data = await exportBackup();
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = el('a', { href: url, download: `nchsieh-backup-${new Date().toISOString().slice(0, 10)}.json` });
  document.body.append(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
  banner('#adminOpBanner', '備份檔已下載。', 'success');
}

/* ==========================================================================
   組裝
   ========================================================================== */

function refreshAll() {
  guard(refreshDash);
  guard(refreshCourses);
  guard(refreshStudents);
  guard(refreshAnnouncements);
  if (mounted) guard(refreshAnalytics, '#analyticsBanner');
}

function mount() {
  // 選單
  $$('.admin-menu-item').forEach(b =>
    b.addEventListener('click', () => showView(b.dataset.view)));
  let last = 'viewDash';
  try { last = localStorage.getItem('admin.view') || 'viewDash'; } catch {}
  showView(VIEW_TITLES[last] ? last : 'viewDash');

  // 課程
  $('#btnSaveCourse').addEventListener('click', () => guard(async () => {
    const v = courseFormValues();
    if (!v.code || !v.titleZh) { banner('#adminOpBanner', '課程代碼與中文名稱為必填。', 'error'); return; }
    await saveCourse(editingCourseId, v);
    banner('#adminOpBanner', editingCourseId ? '課程已更新。' : '課程已建立。', 'success');
    fillCourseForm(null);
    await refreshCourses(); await refreshDash();
  }));
  $('#btnCancelEdit').addEventListener('click', () => {
    fillCourseForm(null); banner('#adminOpBanner', '');
  });

  // 上傳與排序
  initDropzone();
  initUploadSettings();
  initDragReorder('#matTbody', persistAndSyncMaterials, '#matBanner');
  initDragReorder('#adminCourseTbody', persistAndSyncCourses, '#adminOpBanner');
  $('#btnDownloadAllMaterials')?.addEventListener('click', () => guard(downloadAllMaterials, '#matBanner'));

  // 講義（手動填寫）
  $('#btnAddMaterial').addEventListener('click', () => guard(async () => {
    const name = $('#mfName').value.trim();
    const path = $('#mfPath').value.trim();
    if (!name || !path) { banner('#matBanner', '請填寫顯示名稱與檔案路徑。', 'error'); return; }
    await saveMaterial(editorCourse.id, null, {
      unit: $('#mfUnit').value.trim() || '課程講義',
      name, path,
      size: $('#mfSize').value.trim(),
      order: Number($('#mfOrder').value) || 0
    });
    ['#mfName', '#mfPath', '#mfSize'].forEach(s => $(s).value = '');
    banner('#matBanner', '已加入講義。', 'success');
    await refreshMaterials();
  }, '#matBanner'));

  $('#btnAddAssignment').addEventListener('click', () => guard(async () => {
    const title = $('#afTitle').value.trim();
    if (!title) { banner('#matBanner', '請填寫作業名稱。', 'error'); return; }
    const due = $('#afDue').value;
    await saveAssignment(editorCourse.id, null, {
      title,
      description: $('#afDesc').value.trim(),
      dueAt: due ? new Date(due) : null
    });
    ['#afTitle', '#afDesc', '#afDue'].forEach(s => $(s).value = '');
    banner('#matBanner', '已加入作業。', 'success');
    await refreshMaterials();
  }, '#matBanner'));

  // 學生
  initTabs($('#viewStudents'));
  $('#btnReloadQueue').addEventListener('click', () => guard(refreshQueue));
  $('#studentFilter').addEventListener('change', () => guard(refreshRoster));
  $('#btnReloadStudents').addEventListener('click', () => guard(refreshRoster));
  initDragReorder('#studentTbody', persistAndSyncStudents, '#adminOpBanner');

  // 課程存取權限彈窗
  $('#accessAll').addEventListener('change', e => setAccessListDisabled(e.target.checked));
  $('#btnSaveAccess').addEventListener('click', () => guard(async () => {
    if (!accessStudent) return;
    const noRestriction = $('#accessAll').checked;
    const courseIds = noRestriction
      ? []
      : $$('.access-course-cb').filter(cb => cb.checked).map(cb => cb.value);
    await setStudentAccess(accessStudent.id, courseIds);
    banner('#accessBanner', '已儲存。', 'success');
    await refreshRoster();
    setTimeout(() => closeModal('modalAccess'), 500);
  }, '#accessBanner'));

  // 公告
  $('#emailjsHint').textContent = emailjsConfigured()
    ? '會寄給所有已核准、且符合班級／課程／指定學生條件的學生。'
    : '尚未設定 EmailJS，勾選也不會真的寄出，請先至「系統」分頁完成設定。';
  guard(initAnnouncementTargeting);
  $('#btnPublishAnn').addEventListener('click', () => guard(async () => {
    const title = $('#annTitle').value.trim();
    if (!title) { banner('#adminOpBanner', '請輸入公告標題。', 'error'); return; }
    const startAt = $('#annStart').value || null;
    const endAt = $('#annEnd').value || null;
    const targetClass = $('#annTargetClass').value;
    const targetCourseId = $('#annTargetCourse').value;
    const targetStudentIds = $$('.ann-student-cb').filter(cb => cb.checked).map(cb => cb.value);
    const sendEmail = $('#annSendEmail').checked;

    const id = await publishAnnouncement({
      title, body: $('#annBody').value, targetClass, targetCourseId, targetStudentIds, startAt, endAt
    });
    $('#annTitle').value = ''; $('#annBody').value = '';
    $('#annStart').value = ''; $('#annEnd').value = ''; $('#annSendEmail').checked = false;
    resetAnnouncementTargeting();
    banner('#adminOpBanner', '公告已發布。', 'success');
    await refreshAnnouncements(); await refreshDash();

    if (sendEmail) {
      const rows = await listAnnouncements(50);
      const a = rows.find(r => r.id === id) || { id, title, body: $('#annBody').value, targetClass, targetCourseId, targetStudentIds };
      await sendAnnouncementReminder(a);
    }
  }));

  // 訪客統計（實際資料讀取交給 refreshAll() 統一處理，這裡只掛控制項事件）
  initAnalyticsControls();

  // 外觀
  renderLayoutPicker($('#layoutPicker'));
  renderThemePicker($('#themePicker'));
  refreshSiteDefault();
  $('#btnSetSiteDefault').addEventListener('click', () => guard(async () => {
    const theme = currentTheme();
    const layout = currentLayout();
    await saveSiteSettings({ theme, layout, materialsDisplay: selectedMaterialsDisplay });
    banner('#siteDefaultBanner', '已套用到全站，所有訪客下次載入即可看到。', 'success');
    await refreshSiteDefault();
  }, '#siteDefaultBanner'));

  // 工具列
  $('#btnRefreshAll').addEventListener('click', refreshAll);
  $('#btnBackup').addEventListener('click', () => guard(doBackup));
  $('#btnBackup2').addEventListener('click', () => guard(doBackup));
  $('#btnAdminLogout').addEventListener('click', async () => {
    await logout();
    location.reload();
  });

  // 系統資訊
  $('#sysInfo').innerHTML = `
    <p><span class="dot ok"></span>專案 ID：<code>${esc(firebaseConfig.projectId)}</code></p>
    <p><span class="dot ok"></span>Auth 網域：<code>${esc(firebaseConfig.authDomain)}</code></p>
    <p><span class="dot ok"></span>目前網域：<code>${esc(location.hostname || '(本機檔案)')}</code></p>
    <p><span class="dot ok"></span>管理者：<code>${esc(me.user.email || '')}</code></p>
    <p><span class="dot ok"></span>UID：<code>${esc(me.user.uid)}</code></p>
    <p style="margin-top:10px;color:var(--faint);font-size:12.5px">
      密碼可在下方「修改登入密碼」直接更新，本站僅在瀏覽器與 Firebase 之間傳遞，不會保存任何密碼。
    </p>`;
  $('#matRoot').textContent = MATERIALS_ROOT;

  $('#emailjsInfo').innerHTML = emailjsConfigured()
    ? `<p><span class="dot ok"></span>已設定，公告的「寄送提醒」按鈕可以使用。</p>
       <p><span class="dot ok"></span>Service ID：<code>${esc(EMAILJS_SERVICE_ID)}</code></p>`
    : `<p><span class="dot wait"></span>尚未設定，公告的「寄送提醒」目前會顯示提示但不會真的寄出。</p>`;

  $('#deleteApiInfo').innerHTML = DELETE_USER_API_URL
    ? `<p><span class="dot ok"></span>已設定，「學生管理」的刪除按鈕會一併刪除 Firebase 登入帳號。</p>
       <p><span class="dot ok"></span>API：<code>${esc(DELETE_USER_API_URL)}</code></p>`
    : `<p><span class="dot wait"></span>尚未設定，「刪除」目前只會移除 Firestore 紀錄，Auth 帳號需自行到 Console 刪除。</p>`;

  // 修改密碼
  $('#pwForm').addEventListener('submit', e => {
    e.preventDefault();
    guard(async () => {
      const oldP = $('#pwOld').value;
      const newP = $('#pwNew').value;
      const newP2 = $('#pwNew2').value;

      if (!oldP) { banner('#pwBanner', '請輸入目前密碼。', 'error'); return; }
      if (newP.length < 6) { banner('#pwBanner', '新密碼請至少 6 個字元。', 'error'); return; }
      if (newP !== newP2) { banner('#pwBanner', '兩次輸入的新密碼不一致。', 'error'); return; }
      if (newP === oldP) { banner('#pwBanner', '新密碼不能與目前密碼相同。', 'error'); return; }

      $('#btnChangePassword').disabled = true;
      try {
        await changePassword(oldP, newP);
        banner('#pwBanner', '密碼已更新，下次登入請使用新密碼。', 'success');
        $('#pwForm').reset();
      } finally {
        $('#btnChangePassword').disabled = false;
      }
    }, '#pwBanner');
  });
}

/* ---------- 啟動 ---------- */

export function initAdmin() {
  if (!$('#adminGate')) return;

  if (!firebaseReady) {
    banner('#adminBanner',
      'Firebase 尚未正確初始化，管理功能無法使用。<br>' +
      esc(friendlyError(firebaseError)), 'error');
    $('#btnAdminLogin').disabled = true;
    return;
  }

  $('#adminLoginForm').addEventListener('submit', e => { e.preventDefault(); handleLogin(); });
  watchAuth(user => { onAuthChanged(user); });
}
