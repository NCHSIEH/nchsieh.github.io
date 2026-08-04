/* ==========================================================================
   課程專區前台
   課程大綱公開；講義與作業只有通過審核的學生讀得到（由 Security Rules 決定）
   ========================================================================== */

import { $, el, esc, openModal, dueState, fmtDateTime } from './ui.js';
import { identity, onIdentity } from './auth.js';
import { MATERIALS_ROOT } from './config.js';
import { listCourses, loadCourseDetail, listAnnouncements, friendlyError, firebaseReady } from './data.js';

let allCourses = [];
const detailCache = new Map();

/* ---------- 篩選器 ---------- */

function populateFilters() {
  const semesters = [...new Set(allCourses.map(c => c.semester).filter(Boolean))]
    .sort((a, b) => String(b).localeCompare(String(a)));
  const sel = $('#filterSemester');
  const keep = sel.value;
  sel.replaceChildren(
    el('option', { value: 'all', text: '全部學期' }),
    ...semesters.map(s => el('option', { value: s, text: `${s} 學期` }))
  );
  if ([...sel.options].some(o => o.value === keep)) sel.value = keep;
}

function filtered() {
  const sem   = $('#filterSemester').value;
  const level = $('#filterLevel').value;
  const kw    = $('#filterSearch').value.trim().toLowerCase();

  return allCourses.filter(c => {
    if (sem !== 'all' && c.semester !== sem) return false;
    if (level !== 'all' && c.level !== level) return false;
    if (!kw) return true;
    // 搜尋範圍涵蓋課號、中英文名稱、摘要與標籤
    const hay = [c.code, c.titleZh, c.titleEn, c.summaryZh, ...(c.tags || [])]
      .filter(Boolean).join(' ').toLowerCase();
    return hay.includes(kw);
  });
}

/* ---------- 課程卡片 ---------- */

function levelLabel(level) {
  return level === 'undergraduate' ? '大學部' : '碩博士班';
}

function buildCard(c) {
  const card = el('article', { class: 'course-card' });
  const grow = el('div', { class: 'grow' });

  grow.append(
    el('div', { class: 'course-head' }, [
      el('span', { class: 'badge-sem', text: c.semester || '—' }),
      el('span', { class: 'badge-level', text: `${levelLabel(c.level)}${c.credits ? `・${c.credits} 學分` : ''}` })
    ]),
    el('div', { class: 'course-code mono', text: c.code || '' }),
    el('h3', { class: 'course-title', text: c.titleZh || '(未命名課程)' }),
    c.titleEn ? el('div', { style: 'font-family:var(--font-latin);font-size:14px;color:var(--faint);margin:-6px 0 10px', text: c.titleEn }) : null,
    c.summaryZh ? el('p', { class: 'course-summary', text: c.summaryZh }) : null
  );

  if (c.tags?.length) {
    grow.append(el('div', { class: 'course-tags' }, c.tags.map(t => el('span', { text: t }))));
  }

  const slot = el('div', { class: 'detail-slot' });
  grow.append(slot);
  card.append(grow);
  renderDetail(c, slot);
  return card;
}

/** 講義與作業區塊：依權限顯示內容或說明 */
async function renderDetail(course, slot) {
  slot.replaceChildren(el('div', { class: 'skeleton', style: 'height:56px;margin-top:14px' }));

  let detail = detailCache.get(course.id);
  if (!detail) {
    try {
      detail = await loadCourseDetail(course.id);
      detailCache.set(course.id, detail);
    } catch (err) {
      slot.replaceChildren(el('div', { class: 'locked-hint', text: friendlyError(err) }));
      return;
    }
  }

  if (!detail.allowed) {
    const guest = !identity.user;
    const pending = identity.user && identity.status === 'pending';
    const unverified = identity.user && !identity.verified;

    let msg = '講義與作業僅開放給通過審核的修課學生。';
    if (unverified) msg = '你的 Email 尚未完成驗證，請先點開驗證信中的連結。';
    else if (pending) msg = '你的申請正在等待任課教師核准，核准後即可看到講義。';
    else if (identity.status === 'rejected') msg = '你的申請未通過，如有疑問請來信聯繫。';

    const box = el('div', { class: 'locked-hint' }, [el('p', { text: msg })]);
    if (guest) {
      box.append(el('button', {
        class: 'btn btn-primary btn-sm', type: 'button',
        onclick: () => openModal('modalStudent')
      }, '登入 / 申請修課帳號'));
    }
    slot.replaceChildren(box);
    return;
  }

  const frag = document.createDocumentFragment();

  // 講義
  if (detail.materials.length) {
    const tree = el('div', { class: 'dir-tree' }, [
      el('div', { class: 'dir-header', text: `課程講義（${detail.materials.length} 份）` })
    ]);
    const byUnit = new Map();
    detail.materials.forEach(m => {
      const key = m.unit || '課程講義';
      if (!byUnit.has(key)) byUnit.set(key, []);
      byUnit.get(key).push(m);
    });
    byUnit.forEach((files, unit) => {
      const list = el('ul', { class: 'file-list' }, files.map(f => el('li', { class: 'file-item' }, [
        el('a', {
          class: 'file-name',
          href: /^https?:\/\//.test(f.path) ? f.path : MATERIALS_ROOT + f.path,
          target: '_blank', rel: 'noopener'
        }, f.name || f.path),
        f.size ? el('span', { class: 'file-size', text: f.size }) : null
      ])));
      tree.append(el('div', { class: 'dir-folder' }, [
        el('div', { class: 'folder-title', text: unit }), list
      ]));
    });
    frag.append(tree);
  } else {
    frag.append(el('div', { class: 'dir-tree' }, [
      el('div', { class: 'dir-header', text: '課程講義' }),
      el('p', { style: 'font-size:13px;color:var(--faint)', text: '本課程尚未上傳講義。' })
    ]));
  }

  // 作業
  if (detail.assignments.length) {
    const box = el('div', { class: 'asg-box' });
    detail.assignments.forEach(a => {
      const st = dueState(a.dueAt);
      box.append(el('div', { class: 'asg-row' }, [
        el('span', { class: 'asg-title', text: a.title || '' }),
        el('span', { class: `due ${st.cls}`, text: st.label })
      ]));
    });
    frag.append(box);
  }

  slot.replaceChildren(frag);
}

/* ---------- 渲染 ---------- */

function render() {
  const grid = $('#courseGrid');
  const rows = filtered();
  $('#filterCount').textContent = `顯示 ${rows.length} / ${allCourses.length} 門課程`;

  if (!allCourses.length) {
    grid.replaceChildren(el('div', { class: 'empty-state', style: 'grid-column:1/-1' }, [
      el('h3', { text: '目前尚未發布課程' }),
      el('p', { text: '課程建立後會即時出現在這裡。' })
    ]));
    return;
  }
  if (!rows.length) {
    grid.replaceChildren(el('div', { class: 'empty-state', style: 'grid-column:1/-1' }, [
      el('h3', { text: '找不到符合條件的課程' }),
      el('p', { text: '試著放寬學期或班別條件，或清除搜尋關鍵字。' }),
      el('button', {
        class: 'btn btn-ghost', type: 'button', onclick: () => {
          $('#filterSemester').value = 'all';
          $('#filterLevel').value = 'all';
          $('#filterSearch').value = '';
          render();
        }
      }, '清除所有篩選')
    ]));
    return;
  }
  grid.replaceChildren(...rows.map(buildCard));
}

/* ---------- 公告 ---------- */

/** 公告是否在有效期間內；兩個欄位都留空＝一律視為有效 */
function isAnnouncementActive(a) {
  const now = Date.now() / 1000;
  const startOk = !a.startAt || (a.startAt.seconds ?? 0) <= now;
  const endOk = !a.endAt || (a.endAt.seconds ?? 0) >= now;
  return startOk && endOk;
}

/** 公告是否該顯示給目前這位訪客；沒有指定班級就是給所有人看 */
function isAnnouncementForViewer(a) {
  if (!a.targetClass) return true;
  return identity.profile?.className === a.targetClass;
}

async function renderAnnouncements() {
  const box = $('#announcementBox');
  if (!box) return;
  try {
    const rows = (await listAnnouncements(20))
      .filter(isAnnouncementActive)
      .filter(isAnnouncementForViewer)
      .slice(0, 3);
    if (!rows.length) { box.hidden = true; return; }
    box.hidden = false;
    box.replaceChildren(...rows.map(a => el('div', { class: 'notice' }, [
      el('h4', { text: a.title || '' }),
      a.body ? el('p', { text: a.body }) : null,
      a.targetClass ? el('div', { class: 'when', text: `班級：${a.targetClass}` }) : null,
      el('div', { class: 'when', text: fmtDateTime(a.publishedAt) })
    ])));
  } catch { box.hidden = true; }
}

/* ---------- 啟動 ---------- */

export async function initCourses() {
  const grid = $('#courseGrid');
  if (!grid) return;

  if (!firebaseReady) {
    grid.replaceChildren(el('div', { class: 'empty-state', style: 'grid-column:1/-1' }, [
      el('h3', { text: '無法連線至課程資料庫' }),
      el('p', { text: '請檢查 assets/js/config.js 中的 Firebase 設定。' })
    ]));
    return;
  }

  grid.replaceChildren(...[0, 1].map(() =>
    el('div', { class: 'skeleton', style: 'height:260px;border-radius:18px' })));

  ['#filterSemester', '#filterLevel'].forEach(s => $(s).addEventListener('change', render));
  $('#filterSearch').addEventListener('input', render);

  try {
    allCourses = await listCourses();
    populateFilters();
    render();
  } catch (err) {
    grid.replaceChildren(el('div', { class: 'empty-state', style: 'grid-column:1/-1' }, [
      el('h3', { text: '課程讀取失敗' }),
      el('p', { text: friendlyError(err) })
    ]));
  }

  renderAnnouncements();

  // 登入狀態改變時，清掉權限快取重新判定；公告也要重新套用班級篩選
  let lastRole = identity.role;
  onIdentity(id => {
    renderAnnouncements();
    if (id.role === lastRole) return;
    lastRole = id.role;
    detailCache.clear();
    render();
  });
}
