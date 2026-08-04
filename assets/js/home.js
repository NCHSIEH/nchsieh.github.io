/* ==========================================================================
   首頁強化層

   重要原則：這支檔案不得 import data.js 或任何依賴外部 CDN 的模組。
   47 筆經歷已經是 index.html 裡的實體 HTML，即使這支 JS 完全沒執行，
   履歷內容仍然完整可讀，搜尋引擎也抓得到。
   這裡做的只有「加值」：分類篩選、版型切換、照片與 CV 連結。
   ========================================================================== */

import { $, $$, el } from './ui.js';
import { SCHOLAR_LINKS, PROFILE_ASSETS } from './config.js';

const CATEGORIES = [
  { id: 'all',        zh: '全部',           en: 'All' },
  { id: 'academic',   zh: '學術機構',       en: 'Academic' },
  { id: 'gov',        zh: '政府機關',       en: 'Government' },
  { id: 'foundation', zh: '財團法人・評鑑', en: 'Foundations' },
  { id: 'society',    zh: '學會協會',       en: 'Societies' },
  { id: 'health',     zh: '醫療機構',       en: 'Healthcare' }
];

/* ---------- 經歷分類篩選 ---------- */

let activeCat = 'all';

function applyFilter() {
  const rows = $$('.svc tbody tr[data-cat]');
  let shown = 0;
  rows.forEach(tr => {
    const on = activeCat === 'all' || tr.dataset.cat === activeCat;
    tr.hidden = !on;
    if (on) shown++;
  });

  const label = $('#expCount');
  if (label) label.textContent = activeCat === 'all' ? `共 ${rows.length} 筆` : `${shown} / ${rows.length} 筆`;

  // 篩選後若歷年區有符合項目，自動展開，否則使用者會以為沒資料
  const past = $('#expPast');
  if (past && activeCat !== 'all') {
    if ($('#expPastBody tr[data-cat]:not([hidden])')) past.open = true;
  }

  // 現職區若整區被篩掉，隱藏標題避免留下空標題
  const curBar = $('.exp-groupbar');
  const curTable = $('#expCurrentBody')?.closest('table');
  const curAny = !!$('#expCurrentBody tr[data-cat]:not([hidden])');
  if (curBar) curBar.hidden = !curAny;
  if (curTable) curTable.hidden = !curAny;
}

function buildFilters() {
  const bar = $('#expFilters');
  if (!bar) return;

  const counts = {};
  $$('.svc tbody tr[data-cat]').forEach(tr => {
    counts[tr.dataset.cat] = (counts[tr.dataset.cat] || 0) + 1;
  });
  const total = $$('.svc tbody tr[data-cat]').length;

  bar.replaceChildren(...CATEGORIES.map(c => {
    const n = c.id === 'all' ? total : (counts[c.id] || 0);
    const btn = el('button', {
      type: 'button',
      'data-cat': c.id,
      'aria-pressed': String(c.id === activeCat),
      onclick: () => {
        activeCat = c.id;
        $$('#expFilters button').forEach(b =>
          b.setAttribute('aria-pressed', String(b.dataset.cat === activeCat)));
        applyFilter();
      }
    }, [
      el('span', { 'data-lang': 'zh', text: `${c.zh}（${n}）` }),
      el('span', { 'data-lang': 'en', text: `${c.en} (${n})` })
    ]);
    return btn;
  }));

  applyFilter();
}

/* ---------- 照片、CV、學術連結 ---------- */

function renderProfileAssets() {
  const slot = $('#portraitSlot');
  if (slot) {
    slot.replaceChildren(PROFILE_ASSETS.portrait
      ? el('img', {
          class: 'portrait', src: PROFILE_ASSETS.portrait,
          alt: '謝楠楨教授', loading: 'lazy', decoding: 'async'
        })
      : el('div', { class: 'portrait-fallback', 'aria-hidden': 'true', text: 'NH' }));
  }

  const cv = $('#btnCV');
  if (cv) {
    if (PROFILE_ASSETS.cv) { cv.href = PROFILE_ASSETS.cv; cv.hidden = false; }
    else cv.hidden = true;
  }

  const box = $('#scholarLinks');
  if (box) {
    const links = SCHOLAR_LINKS.filter(l => l.url);
    box.hidden = links.length === 0;
    box.replaceChildren(...links.map(l =>
      el('a', { href: l.url, target: '_blank', rel: 'noopener me', text: l.label })));
  }
}

/* ---------- 啟動 ---------- */

export function initHome() {
  renderProfileAssets();
  buildFilters();
}
