/* ==========================================================================
   管理後台 admin.html

   進入條件：Firebase Auth 登入 + Firestore 中存在 admins/{uid} 文件。
   前端的顯示判斷只是方便性，真正擋下未授權讀寫的是 firestore.rules。
   ========================================================================== */

import {
  $, $$, el, esc, banner, openModal, closeModal, fmtDateTime,
  renderThemePicker, renderLayoutPicker
} from './ui.js';
import { MATERIALS_ROOT, firebaseConfig } from './config.js';
import {
  auth, watchAuth, loginStudent, logout, friendlyError, firebaseReady, firebaseError,
  resolveIdentity, isAdminEmail, resendVerification, refreshUser,
  listStudents, decideStudent, removeStudent,
  listCourses, saveCourse, deleteCourse, loadCourseDetail,
  saveMaterial, deleteMaterial, saveAssignment, deleteAssignment,
  listAnnouncements, publishAnnouncement, deleteAnnouncement,
  exportBackup
} from './data.js';
import {
  uploadFile, isPowerPoint, humanSize, extOf, safeName,
  getToken, setToken, getRepo, setRepo, hasToken, verifyAccess,
  PPTX_GUIDE, SIZE_LIMIT
} from './upload.js';

let me = null;              // { user, role }
let mounted = false;
let editingCourseId = null;
let editorCourse = null;

const VIEW_TITLES = {
  viewDash: '總覽', viewCourses: '課程管理', viewStudents: '學生審核',
  viewAnn: '公告', viewLook: '外觀', viewSystem: '系統'
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
  $('#cfCode').value      = c?.code || '';
  $('#cfTitleZh').value   = c?.titleZh || '';
  $('#cfTitleEn').value   = c?.titleEn || '';
  $('#cfSemester').value  = c?.semester || '';
  $('#cfLevel').value     = c?.level || 'graduate';
  $('#cfCredits').value   = c?.credits ?? 3;
  $('#cfSummaryZh').value = c?.summaryZh || '';
  $('#cfTags').value      = (c?.tags || []).join('、');

  editingCourseId = c?.id || null;
  $('#cfHeading').textContent     = c ? `編輯課程：${c.code || ''}` : '新增課程';
  $('#btnSaveCourse').textContent = c ? '儲存變更' : '建立課程';
  $('#btnCancelEdit').hidden      = !c;
}

async function refreshCourses() {
  const tbody = $('#adminCourseTbody');
  tbody.replaceChildren(emptyRow(4, '讀取中…'));

  const courses = await listCourses();
  if (!courses.length) { tbody.replaceChildren(emptyRow(4, '尚未建立任何課程。')); return; }

  tbody.replaceChildren(...courses.map(c => el('tr', {}, [
    el('td', {}, [
      el('div', { style: 'font-weight:600', text: c.titleZh || '(未命名)' }),
      el('div', { class: 'mono', style: 'font-size:12px;color:var(--faint)', text: c.code || '' })
    ]),
    el('td', { style: 'white-space:nowrap', text: c.semester || '—' }),
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
  ])));
}

/* ---------- 講義與作業 ---------- */

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

async function refreshMaterials() {
  const detail = await loadCourseDetail(editorCourse.id);

  $('#matTbody').replaceChildren(...(detail.materials.length
    ? detail.materials.map(m => el('tr', {}, [
        el('td', { text: m.unit || '—' }),
        el('td', {}, [
          el('div', { style: 'font-weight:600', text: m.name || '' }),
          el('div', { class: 'mono', style: 'font-size:11.5px;color:var(--faint)', text: m.path || '' })
        ]),
        el('td', { text: m.size || '—' }),
        el('td', {}, [el('button', {
          class: 'btn btn-danger btn-sm btn-rect', type: 'button',
          onclick: () => confirmThen(`移除「${m.name}」？`, () => guard(async () => {
            await deleteMaterial(editorCourse.id, m.id); await refreshMaterials();
          }, '#matBanner'))
        }, '移除')])
      ]))
    : [emptyRow(4, '尚未加入講義。')]));

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

  for (const file of files) {
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
        order: Number($('#mfOrder')?.value) || 0
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
    const repo = $('#ghRepo').value.trim();
    const token = $('#ghToken').value.trim();
    if (!repo.includes('/')) { banner('#upBanner', 'repo 格式應為「帳號/儲存庫」。', 'error'); return; }
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
   學生審核
   ========================================================================== */

const STATUS_BADGE = {
  pending:  ['pending',  '審核中'],
  approved: ['approved', '已核准'],
  rejected: ['rejected', '已駁回']
};

async function refreshStudents() {
  const filter = $('#studentFilter').value;
  const tbody = $('#studentTbody');
  tbody.replaceChildren(emptyRow(5, '讀取中…'));

  const rows = await listStudents(filter);
  $('#studentCount').textContent = `${rows.length} 筆`;

  if (!rows.length) {
    tbody.replaceChildren(emptyRow(5,
      filter === 'pending' ? '目前沒有待審核的申請。' : '沒有符合條件的紀錄。'));
    return;
  }

  tbody.replaceChildren(...rows.map(r => {
    const [cls, label] = STATUS_BADGE[r.status] || ['guest', r.status || '—'];
    return el('tr', {}, [
      el('td', {}, [
        el('div', { style: 'font-weight:600', text: r.name || '(未填姓名)' }),
        el('div', { style: 'font-size:12px;color:var(--faint)', text: r.email || '' })
      ]),
      el('td', { class: 'mono', style: 'font-size:12.5px', text: r.studentId || '—' }),
      el('td', { style: 'font-size:12.5px;white-space:nowrap', text: fmtDateTime(r.createdAt) }),
      el('td', {}, [el('span', { class: `state-badge ${cls}`, text: label })]),
      el('td', {}, [el('div', { class: 'actions' }, [
        r.status !== 'approved' && el('button', {
          class: 'btn btn-ok btn-sm btn-rect', type: 'button',
          onclick: () => guard(async () => {
            await decideStudent(r.id, 'approved', me.user.email);
            await refreshStudents(); await refreshDash();
            banner('#adminOpBanner', `已核准 ${r.email}。`, 'success');
          })
        }, '核准'),
        r.status !== 'rejected' && el('button', {
          class: 'btn btn-danger btn-sm btn-rect', type: 'button',
          onclick: () => confirmThen(`駁回 ${r.email} 的申請？`, () => guard(async () => {
            await decideStudent(r.id, 'rejected', me.user.email);
            await refreshStudents(); await refreshDash();
          }))
        }, '駁回'),
        el('button', {
          class: 'btn btn-quiet btn-sm btn-rect', type: 'button',
          onclick: () => confirmThen(
            `刪除 ${r.email} 的申請紀錄？\n\n注意：這只會移除 Firestore 紀錄。` +
            `Firebase Authentication 中的帳號仍然存在，需另行至 Console 刪除。`,
            () => guard(async () => {
              await removeStudent(r.id); await refreshStudents(); await refreshDash();
            }))
        }, '刪除')
      ].filter(Boolean))])
    ]);
  }));
}

/* ==========================================================================
   公告
   ========================================================================== */

async function refreshAnnouncements() {
  const tbody = $('#annTbody');
  tbody.replaceChildren(emptyRow(3, '讀取中…'));
  const rows = await listAnnouncements(50);
  if (!rows.length) { tbody.replaceChildren(emptyRow(3, '尚無公告。')); return; }

  tbody.replaceChildren(...rows.map(a => el('tr', {}, [
    el('td', {}, [
      el('div', { style: 'font-weight:600', text: a.title || '' }),
      el('div', { style: 'font-size:12.5px;color:var(--muted)', text: a.body || '' })
    ]),
    el('td', { style: 'font-size:12.5px;white-space:nowrap', text: fmtDateTime(a.publishedAt) }),
    el('td', {}, [el('button', {
      class: 'btn btn-danger btn-sm btn-rect', type: 'button',
      onclick: () => confirmThen(`刪除公告「${a.title}」？`, () => guard(async () => {
        await deleteAnnouncement(a.id); await refreshAnnouncements(); await refreshDash();
      }))
    }, '刪除')])
  ])));
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

  // 上傳
  initDropzone();
  initUploadSettings();

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
  $('#studentFilter').addEventListener('change', () => guard(refreshStudents));
  $('#btnReloadStudents').addEventListener('click', () => guard(refreshStudents));

  // 公告
  $('#btnPublishAnn').addEventListener('click', () => guard(async () => {
    const title = $('#annTitle').value.trim();
    if (!title) { banner('#adminOpBanner', '請輸入公告標題。', 'error'); return; }
    await publishAnnouncement({ title, body: $('#annBody').value });
    $('#annTitle').value = ''; $('#annBody').value = '';
    banner('#adminOpBanner', '公告已發布。', 'success');
    await refreshAnnouncements(); await refreshDash();
  }));

  // 外觀
  renderLayoutPicker($('#layoutPicker'));
  renderThemePicker($('#themePicker'));

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
      密碼變更與帳號管理請至 Firebase Console 的 Authentication 頁面操作。本站不保存任何密碼。
    </p>`;
  $('#matRoot').textContent = MATERIALS_ROOT;
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
