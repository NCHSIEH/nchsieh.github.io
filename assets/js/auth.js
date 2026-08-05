/* ==========================================================================
   身分狀態與學生入口
   ========================================================================== */

import { $, $$, el, esc, openModal, closeModal, banner } from './ui.js';
import {
  watchAuth, resolveIdentity, registerStudent, loginStudent, logout,
  resendVerification, resetPassword, refreshUser, friendlyError,
  firebaseReady, firebaseError
} from './data.js';

/** 目前身分：{ user, role, verified, status, profile } */
export const identity = {
  user: null, role: 'guest', verified: false, status: null, profile: null, ready: false
};

const listeners = new Set();
export function onIdentity(fn) {
  listeners.add(fn);
  if (identity.ready) fn(identity);
  return () => listeners.delete(fn);
}
function emit() { listeners.forEach(fn => fn(identity)); }

/* ---------- 狀態文字 ---------- */

const STATUS_TEXT = {
  admin:     { cls: 'approved', label: '管理者' },
  approved:  { cls: 'approved', label: '已核准・可存取講義' },
  pending:   { cls: 'pending',  label: '審核中' },
  rejected:  { cls: 'rejected', label: '申請未通過' },
  suspended: { cls: 'rejected', label: '存取已暫停' },
  guest:     { cls: 'guest',    label: '訪客・僅顯示公開課程大綱' }
};

// Email 是否驗證不再是存取門檻（驗證信常被學校信箱擋掉），
// 這裡直接依審核狀態顯示，不會因為尚未驗證就卡住畫面。
export function statusDescriptor() {
  if (identity.role === 'admin') return STATUS_TEXT.admin;
  if (!identity.user) return STATUS_TEXT.guest;
  return STATUS_TEXT[identity.status] || STATUS_TEXT.pending;
}

/* ---------- 頂欄 / 存取狀態列 ---------- */

function paintAccessStrip() {
  const strip = $('#accessStrip');
  if (!strip) return;
  const d = statusDescriptor();
  const who = identity.user
    ? (identity.profile?.name || identity.user.email)
    : '尚未登入';

  strip.replaceChildren(
    el('span', { class: `state-badge ${d.cls}` , text: d.label }),
    el('span', { class: 'who', text: who }),
    identity.user
      ? el('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => logout() }, '登出')
      : el('button', { class: 'btn btn-ghost btn-sm', type: 'button', onclick: () => openModal('modalStudent') }, '學生登入 / 註冊')
  );
}

/* ---------- 學生入口表單 ---------- */

let mode = 'login';   // 'login' | 'register'

function setMode(next) {
  mode = next;
  const isReg = mode === 'register';
  $('#studentModalTitle').textContent = isReg ? '申請修課帳號' : '修課學生登入';
  $('#studentModalSub').textContent = isReg
    ? '註冊後會收到驗證信，完成驗證並經任課教師核准後即可下載講義。'
    : '請使用已通過審核的帳號登入。';
  $('#regOnlyFields').hidden = !isReg;
  $('#btnPrimaryAuth').textContent = isReg ? '送出申請' : '登入';
  $('#authSwitchText').textContent = isReg ? '已經有帳號了？' : '還沒有帳號？';
  $('#btnSwitchMode').textContent = isReg ? '改為登入' : '申請新帳號';
  banner('#authBanner', '');
}

function readForm() {
  return {
    email:     $('#stEmail').value.trim(),
    password:  $('#stPassword').value,
    name:      $('#stName')?.value.trim() || '',
    studentId: $('#stStudentId')?.value.trim() || '',
    className: $('#stClass')?.value.trim() || '',
    note:      $('#stNote')?.value.trim() || ''
  };
}

function busy(on) {
  $$('#modalStudent button').forEach(b => b.disabled = on);
}

async function handlePrimary() {
  const f = readForm();
  if (!f.email)    { banner('#authBanner', '請輸入 Email。', 'error'); return; }
  if (!f.password) { banner('#authBanner', '請輸入密碼。', 'error'); return; }

  busy(true);
  try {
    if (mode === 'register') {
      if (f.password.length < 6) { banner('#authBanner', '密碼請至少 6 個字元。', 'error'); return; }
      if (!f.name) { banner('#authBanner', '請填寫姓名，方便老師辨識你的申請。', 'error'); return; }
      await registerStudent(f);
      banner('#authBanner',
        `申請已送出，請等候任課教師核准。<br>
         系統也會寄一封驗證信到 <code>${esc(f.email)}</code>（若沒收到請查看垃圾郵件匣，沒收到也不影響審核）。`, 'success');
      $('#stPassword').value = '';
    } else {
      await loginStudent(f.email, f.password);
      banner('#authBanner', '登入成功。', 'success');
      setTimeout(() => closeModal('modalStudent'), 700);
    }
  } catch (err) {
    banner('#authBanner', esc(friendlyError(err)), 'error');
  } finally {
    busy(false);
  }
}

async function handleReset() {
  const email = $('#stEmail').value.trim();
  if (!email) { banner('#authBanner', '請先在上方填入 Email，再點選重設密碼。', 'warn'); return; }
  busy(true);
  try {
    await resetPassword(email);
    banner('#authBanner', `密碼重設信已寄至 <code>${esc(email)}</code>。`, 'success');
  } catch (err) {
    banner('#authBanner', esc(friendlyError(err)), 'error');
  } finally { busy(false); }
}

async function handleResend() {
  busy(true);
  try {
    await resendVerification();
    banner('#authBanner', '驗證信已重新寄出，請查看信箱（含垃圾郵件匣）。', 'success');
  } catch (err) {
    banner('#authBanner', esc(friendlyError(err)), 'error');
  } finally { busy(false); }
}

/** 「重新檢查狀態」按鈕：主要用來確認審核進度有沒有更新，順便也刷新驗證狀態 */
async function handleRecheck() {
  busy(true);
  try {
    await refreshUser();
    await syncIdentity();
    banner('#authBanner',
      identity.status === 'approved' ? '已核准！重新整理頁面即可看到講義。' : '尚未核准，請耐心等候任課教師審核。',
      identity.status === 'approved' ? 'success' : 'info');
  } catch (err) {
    banner('#authBanner', esc(friendlyError(err)), 'error');
  } finally { busy(false); }
}

/** 依身分顯示對應的輔助按鈕與提示 */
function paintModalState() {
  const box = $('#authSignedInBox');
  const forms = $('#authFormBox');
  if (!box || !forms) return;

  if (!identity.user) {
    box.hidden = true; forms.hidden = false;
    return;
  }

  forms.hidden = true; box.hidden = false;
  const d = statusDescriptor();
  const rows = [
    el('p', { style: 'font-size:14px;margin-bottom:10px' }, [
      el('span', { class: `state-badge ${d.cls}`, text: d.label })
    ]),
    el('p', { class: 'kv', html: `帳號：<code>${esc(identity.user.email)}</code>` })
  ];

  // Email 驗證不再是存取門檻（常被學校信箱擋掉），只用一句不擋路的提醒帶過，
  // 審核狀態才是真正決定看不看得到講義的依據，所以下面直接照 status 分流。
  if (!identity.verified) {
    rows.push(el('p', { class: 'kv', style: 'margin-top:10px;color:var(--faint);font-size:12.5px',
      text: '提醒：你的 Email 還沒完成驗證，不影響審核與使用。若想補驗證，可點下方按鈕重寄驗證信（找不到信請查看垃圾郵件匣）。' }));
    rows.push(el('button', { class: 'btn btn-ghost btn-sm', style: 'margin-top:8px', type: 'button', onclick: handleResend }, '重寄驗證信'));
  }

  if (identity.status === 'pending') {
    rows.push(el('p', { class: 'kv', style: 'margin-top:10px',
      text: '目前等待任課教師核准，核准後重新整理頁面即可看到講義。' }));
    rows.push(el('button', { class: 'btn btn-ghost btn-sm', style: 'margin-top:12px', type: 'button', onclick: handleRecheck }, '重新檢查狀態'));
  } else if (identity.status === 'rejected') {
    rows.push(el('p', { class: 'kv', style: 'margin-top:10px',
      text: '你的申請未通過。若有疑問請直接來信與任課教師聯繫。' }));
  } else if (identity.status === 'suspended') {
    rows.push(el('p', { class: 'kv', style: 'margin-top:10px',
      text: '你的存取權限已被任課教師暫停，講義與作業暫時無法讀取。若有疑問請直接來信與任課教師聯繫。' }));
  } else if (identity.role === 'student' || identity.role === 'admin') {
    rows.push(el('p', { class: 'kv', style: 'margin-top:10px',
      text: '你已可存取全部課程講義與作業資訊。' }));
  }

  rows.push(el('button', {
    class: 'btn btn-quiet btn-sm', style: 'margin-top:16px', type: 'button',
    onclick: async () => { await logout(); closeModal('modalStudent'); }
  }, '登出'));

  box.replaceChildren(...rows);
}

/* ---------- 同步 ---------- */

async function syncIdentity(user = identity.user) {
  const info = await resolveIdentity(user);
  Object.assign(identity, { user, ...info, ready: true });
  // 已有存取權時收起入口卡片，把版面讓給課程內容
  document.body.classList.toggle('has-access',
    identity.role === 'student' || identity.role === 'admin');
  paintAccessStrip();
  paintModalState();
  emit();
}

/* ---------- 啟動 ---------- */

export function initAuth() {
  if (!firebaseReady) {
    identity.ready = true;
    emit();
    const strip = $('#accessStrip');
    if (strip) strip.replaceChildren(
      el('span', { class: 'state-badge rejected', text: '系統未連線' }),
      el('span', { class: 'who', text: friendlyError(firebaseError) })
    );
    return;
  }

  $('#btnPrimaryAuth')?.addEventListener('click', handlePrimary);
  $('#btnSwitchMode')?.addEventListener('click', () => setMode(mode === 'login' ? 'register' : 'login'));
  $('#btnForgotPass')?.addEventListener('click', handleReset);
  $('#authForm')?.addEventListener('submit', e => { e.preventDefault(); handlePrimary(); });
  if ($('#studentModalTitle')) setMode('login');

  watchAuth(user => { syncIdentity(user); });
}
