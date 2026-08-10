/* ==========================================================================
   課程專區前台
   課程大綱公開；講義與作業只有通過審核的學生讀得到（由 Security Rules 決定）
   ========================================================================== */

import { $, el, esc, openModal, closeModal, dueState, fmtDateTime, cleanText } from './ui.js';
import { identity, onIdentity } from './auth.js';
import { MATERIALS_ROOT, DEFAULT_MATERIALS_DISPLAY } from './config.js';
import { listCourses, loadCourseDetail, listAnnouncements, friendlyError, firebaseReady, getSiteSettings, studentMatchesAnnouncement } from './data.js';

let allCourses = [];
const detailCache = new Map();

/** 課程講義清單一多時要怎麼呈現，由後台「外觀」統一設定；載入前先用預設值 */
let materialsDisplay = DEFAULT_MATERIALS_DISPLAY;

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

/**
 * 課程摘要過長時（超過一個門檻字數）以 3 行截斷＋「顯示更多」按鈕呈現，
 * 避免單一課程摘要把整張卡片拉得比其他卡片高出一大截。
 */
function buildSummaryBlock(text) {
  const clean = cleanText(text);
  if (!clean) return null;

  const isLong = clean.length > 130;
  const p = el('p', { class: `course-summary${isLong ? ' clamped' : ''}`, text: clean });
  if (!isLong) return p;

  const btn = el('button', {
    class: 'summary-toggle', type: 'button',
    onclick: () => {
      const stillClamped = p.classList.toggle('clamped');
      btn.textContent = stillClamped ? '顯示更多' : '收合摘要';
    }
  }, '顯示更多');

  return el('div', { class: 'summary-wrap' }, [p, btn]);
}

/**
 * 一份講義一列，若有填「單元」則在檔名前顯示成小標籤。
 * 不再依單元分組成手風琴——實際資料常常每份講義的單元都不一樣，
 * 分組後等於一份一個摺疊區塊，反而比不分組還要長。
 */
function buildFlatFileList(files) {
  return el('ul', { class: 'file-list' }, files.map(f => el('li', { class: 'file-item' }, [
    el('span', {}, [
      cleanText(f.unit) ? el('span', { class: 'file-unit', text: cleanText(f.unit) }) : null,
      el('a', {
        class: 'file-name',
        href: /^https?:\/\//.test(f.path) ? f.path : MATERIALS_ROOT + f.path,
        target: '_blank', rel: 'noopener'
      }, f.name || f.path)
    ].filter(Boolean)),
    f.size ? el('span', { class: 'file-size', text: f.size }) : null
  ])));
}

/** 「按鈕開彈窗」模式共用同一個彈窗，每次開啟時換內容，不必每門課各建一個 */
let materialsModalOverlay = null;

function ensureMaterialsModal() {
  if (materialsModalOverlay) return materialsModalOverlay;
  const overlay = el('div', {
    class: 'modal-overlay', id: 'modalCourseMaterials',
    role: 'dialog', 'aria-modal': 'true', 'aria-hidden': 'true',
    'aria-labelledby': 'courseMaterialsModalTitle'
  });
  overlay.addEventListener('mousedown', e => { if (e.target === overlay) closeModal(overlay); });
  overlay.append(el('div', { class: 'modal-card' }, [
    el('button', {
      class: 'modal-close', type: 'button', 'aria-label': '關閉',
      onclick: () => closeModal(overlay)
    }, '×'),
    el('h2', { class: 'modal-title', id: 'courseMaterialsModalTitle' }),
    el('div', { id: 'courseMaterialsModalBody' })
  ]));
  document.body.append(overlay);
  materialsModalOverlay = overlay;
  return overlay;
}

function openMaterialsModal(course, files) {
  const overlay = ensureMaterialsModal();
  $('#courseMaterialsModalTitle', overlay).textContent = `${course.titleZh || course.code || ''}　課程講義`;
  $('#courseMaterialsModalBody', overlay).replaceChildren(buildFlatFileList(files));
  openModal(overlay);
}

/** 依後台設定的呈現方式，組出「課程講義」整個區塊 */
function buildMaterialsBlock(course, materials) {
  const count = materials.length;

  if (!count) {
    return el('div', { class: 'dir-tree' }, [
      el('div', { class: 'dir-header', text: '課程講義' }),
      el('p', { style: 'font-size:13px;color:var(--faint)', text: '本課程尚未上傳講義。' })
    ]);
  }

  if (materialsDisplay === 'modal') {
    return el('div', { class: 'dir-tree' }, [
      el('div', { class: 'dir-header', text: `課程講義（${count} 份）` }),
      el('button', {
        class: 'btn btn-ghost btn-sm btn-block', type: 'button',
        onclick: () => openMaterialsModal(course, materials)
      }, '查看課程講義')
    ]);
  }

  if (materialsDisplay === 'expand') {
    const VISIBLE = 5;
    const head = materials.slice(0, VISIBLE);
    const rest = materials.slice(VISIBLE);
    const tree = el('div', { class: 'dir-tree' }, [
      el('div', { class: 'dir-header', text: `課程講義（${count} 份）` }),
      buildFlatFileList(head)
    ]);
    if (rest.length) {
      const restList = buildFlatFileList(rest);
      restList.hidden = true;
      const btn = el('button', {
        class: 'summary-toggle', type: 'button', style: 'margin-top:6px',
        onclick: () => {
          restList.hidden = !restList.hidden;
          btn.textContent = restList.hidden ? `顯示全部 ${count} 份` : '收合';
        }
      }, `顯示全部 ${count} 份`);
      tree.append(restList, btn);
    }
    return tree;
  }

  // 'scroll'（預設）：固定高度＋內部捲軸，卡片高度不受份數影響
  return el('div', { class: 'dir-tree' }, [
    el('div', { class: 'dir-header', text: `課程講義（${count} 份）` }),
    el('div', { class: 'dir-scroll' }, [buildFlatFileList(materials)])
  ]);
}

function buildCard(c) {
  const card = el('article', { class: 'course-card' });
  const grow = el('div', { class: 'grow' });

  // 注意：Element.append() 遇到 null／undefined 不會略過，會把它字面轉成
  // 文字節點 "null"／"undefined" 塞進畫面裡——這正是課程摘要曾經顯示「null」的真正原因，
  // 不是資料本身壞掉。所以這裡用 .filter(Boolean) 濾掉可能為 null 的可選欄位，
  // 絕不讓 null 直接進到 append() 的參數列表。
  grow.append(...[
    el('div', { class: 'course-head' }, [
      el('span', { class: 'badge-sem', text: c.semester || '—' }),
      el('span', { class: 'badge-level', text: `${levelLabel(c.level)}${c.credits ? `・${c.credits} 學分` : ''}` })
    ]),
    el('div', { class: 'course-code mono', text: c.code || '' }),
    el('h3', { class: 'course-title', text: cleanText(c.titleZh) || '(未命名課程)' }),
    cleanText(c.titleEn) ? el('div', { style: 'font-family:var(--font-latin);font-size:14px;color:var(--faint);margin:-6px 0 10px', text: cleanText(c.titleEn) }) : null,
    buildSummaryBlock(c.summaryZh)
  ].filter(Boolean));

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

    let msg = '講義與作業僅開放給通過審核的修課學生。';
    if (identity.status === 'pending') msg = '你的申請正在等待任課教師核准，核准後即可看到講義。';
    else if (identity.status === 'rejected') msg = '你的申請未通過，如有疑問請來信聯繫。';
    else if (identity.status === 'suspended') msg = '你的存取權限已被暫停，如有疑問請來信聯繫任課教師。';
    else if (identity.user && identity.status === 'approved') msg = '這門課不在你目前的可看課程範圍內，如有疑問請來信聯繫任課教師。';

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

  // 講義：呈現方式（固定高度捲軸／預設展開前 5 筆／按鈕開彈窗）由後台「外觀」統一設定
  frag.append(buildMaterialsBlock(course, detail.materials));

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

/** 公告是否該顯示給目前這位訪客；班級／課程／指定學生都沒設限就是給所有人看 */
function isAnnouncementForViewer(a) {
  if (!a.targetClass && !a.targetCourseId && !a.targetStudentIds?.length) return true;
  return studentMatchesAnnouncement(identity.profile, identity.user?.uid, a);
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

  // 課程講義呈現方式（固定高度捲軸／預設展開前幾筆／按鈕開彈窗）由後台設定；
  // 讀取失敗就靜默維持 config.js 的預設值，不擋住其餘頁面渲染。
  try {
    const settings = await getSiteSettings();
    if (settings?.materialsDisplay) materialsDisplay = settings.materialsDisplay;
  } catch { /* 靜默失敗，維持預設值 */ }

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
