/* ==========================================================================
   UI 基礎層 — 主題、語言、導覽、Modal、Toast
   不依賴 Firebase，兩個頁面共用
   ========================================================================== */

import { THEMES, DEFAULT_THEME, LAYOUTS, DEFAULT_LAYOUT } from './config.js';

/* ---------- 小工具 ---------- */

export const $  = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

/** 一律用這個插入使用者資料，杜絕 innerHTML 注入 */
export function esc(str) {
  return String(str ?? '').replace(/[&<>"']/g, c => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v === null || v === undefined || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of [].concat(children)) {
    if (c) node.append(c.nodeType ? c : document.createTextNode(c));
  }
  return node;
}

/* ---------- 主題 ---------- */

const THEME_IDS = THEMES.map(t => t.id);

export function applyTheme(id) {
  const theme = THEME_IDS.includes(id) ? id : DEFAULT_THEME;
  document.body.classList.remove(...THEME_IDS);
  document.body.classList.add(theme);
  try { localStorage.setItem('site.theme', theme); } catch {}
  document.dispatchEvent(new CustomEvent('themechange', { detail: theme }));
  return theme;
}

export function currentTheme() {
  let saved = null;
  try { saved = localStorage.getItem('site.theme'); } catch {}
  return THEME_IDS.includes(saved) ? saved : DEFAULT_THEME;
}

export function renderThemePicker(container) {
  if (!container) return;
  const active = currentTheme();
  container.replaceChildren(...THEMES.map(t => {
    const btn = el('button', {
      type: 'button',
      class: 'theme-card',
      'aria-pressed': String(t.id === active),
      title: t.note,
      onclick: () => { applyTheme(t.id); renderThemePicker(container); }
    });
    const sw = el('span', { class: 'theme-swatch' });
    t.sw.forEach(c => sw.append(el('i', { style: `background:${c}` })));
    btn.append(sw, el('span', { class: 'theme-name', text: t.name }));
    return btn;
  }));
}

/* ---------- 版型 ---------- */

const LAYOUT_IDS = LAYOUTS.map(l => l.id);

export function applyLayout(id) {
  const layout = LAYOUT_IDS.includes(id) ? id : DEFAULT_LAYOUT;
  document.body.classList.remove(...LAYOUT_IDS);
  document.body.classList.add(layout);
  try { localStorage.setItem('site.layout', layout); } catch {}
  return layout;
}

export function currentLayout() {
  let saved = null;
  try { saved = localStorage.getItem('site.layout'); } catch {}
  return LAYOUT_IDS.includes(saved) ? saved : DEFAULT_LAYOUT;
}

export function renderLayoutPicker(container) {
  if (!container) return;
  const active = currentLayout();
  container.replaceChildren(...LAYOUTS.map(l => {
    const thumb = el('span', { class: `look-thumb ${l.thumb}` });
    for (let i = 0; i < l.bars; i++) thumb.append(el('i'));
    return el('button', {
      type: 'button',
      class: 'look-card',
      'aria-pressed': String(l.id === active),
      title: l.note,
      onclick: () => { applyLayout(l.id); renderLayoutPicker(container); }
    }, [thumb, el('span', { class: 'name', text: l.name })]);
  }));
}

/* ---------- 外觀面板 ---------- */

function initLooks() {
  const btn = $('#btnLooks');
  const panel = $('#looksPanel');
  if (!btn || !panel) return;

  renderLayoutPicker($('#layoutPicker'));
  renderThemePicker($('#themePicker'));

  const close = () => { panel.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
  const open  = () => { panel.hidden = false; btn.setAttribute('aria-expanded', 'true'); };

  btn.addEventListener('click', e => {
    e.stopPropagation();
    panel.hidden ? open() : close();
  });
  panel.addEventListener('click', e => e.stopPropagation());
  document.addEventListener('click', close);
  document.addEventListener('keydown', e => { if (e.key === 'Escape' && !panel.hidden) close(); });
}

/* ---------- 語言 ---------- */

export function applyLang(lang) {
  const en = lang === 'en';
  document.body.classList.toggle('lang-en', en);
  document.body.classList.toggle('lang-zh', !en);
  document.documentElement.lang = en ? 'en' : 'zh-Hant';
  $$('.langtoggle .seg').forEach(seg => {
    seg.setAttribute('aria-pressed', String(seg.dataset.setLang === (en ? 'en' : 'zh')));
  });
  try { localStorage.setItem('site.lang', en ? 'en' : 'zh'); } catch {}
}

export function currentLang() {
  try { return localStorage.getItem('site.lang') === 'en' ? 'en' : 'zh'; } catch { return 'zh'; }
}

/* ---------- Modal（含焦點鎖定與 ESC） ---------- */

const FOCUSABLE = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
let lastFocused = null;
let openOverlay = null;

export function openModal(id) {
  const overlay = typeof id === 'string' ? document.getElementById(id) : id;
  if (!overlay) return;
  lastFocused = document.activeElement;
  overlay.classList.add('active');
  overlay.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
  openOverlay = overlay;
  const first = overlay.querySelector(FOCUSABLE);
  if (first) setTimeout(() => first.focus(), 30);
}

export function closeModal(id) {
  const overlay = id
    ? (typeof id === 'string' ? document.getElementById(id) : id)
    : openOverlay;
  if (!overlay) return;
  overlay.classList.remove('active');
  overlay.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
  if (openOverlay === overlay) openOverlay = null;
  if (lastFocused && document.contains(lastFocused)) lastFocused.focus();
}

function initModals() {
  document.addEventListener('keydown', e => {
    if (!openOverlay) return;
    if (e.key === 'Escape') { e.preventDefault(); closeModal(); return; }
    if (e.key !== 'Tab') return;
    const items = $$(FOCUSABLE, openOverlay).filter(n => n.offsetParent !== null);
    if (!items.length) return;
    const first = items[0], last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  $$('.modal-overlay').forEach(ov => {
    ov.setAttribute('role', 'dialog');
    ov.setAttribute('aria-modal', 'true');
    ov.setAttribute('aria-hidden', 'true');
    ov.addEventListener('mousedown', e => { if (e.target === ov) closeModal(ov); });
  });

  $$('[data-close-modal]').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.closest('.modal-overlay')));
  });
  $$('[data-open-modal]').forEach(btn => {
    btn.addEventListener('click', () => openModal(btn.dataset.openModal));
  });
}

/* ---------- 訊息橫幅 ---------- */

export function banner(node, message, type = 'info') {
  // 呼叫端一律傳 '#id' 選擇器，這裡兩種寫法都接受，
  // 避免因為漏了井字號而讓訊息靜默消失。
  const target = typeof node === 'string'
    ? document.querySelector(node.startsWith('#') || node.startsWith('.') ? node : `#${node}`)
    : node;
  if (!target) { console.warn('[banner] 找不到目標元素：', node); return; }
  if (!message) { target.className = 'banner'; target.textContent = ''; return; }
  target.className = `banner show ${type}`;
  target.innerHTML = message;
}

/* ---------- ARIA 分頁 ---------- */

export function initTabs(root) {
  const list = $('[role="tablist"]', root);
  if (!list) return;
  const tabs = $$('[role="tab"]', list);

  const select = tab => {
    tabs.forEach(t => {
      const on = t === tab;
      t.setAttribute('aria-selected', String(on));
      t.tabIndex = on ? 0 : -1;
      const panel = document.getElementById(t.getAttribute('aria-controls'));
      if (panel) panel.hidden = !on;
    });
    tab.focus();
  };

  tabs.forEach(tab => tab.addEventListener('click', () => select(tab)));
  list.addEventListener('keydown', e => {
    const i = tabs.indexOf(document.activeElement);
    if (i < 0) return;
    let next = null;
    if (e.key === 'ArrowRight') next = tabs[(i + 1) % tabs.length];
    if (e.key === 'ArrowLeft')  next = tabs[(i - 1 + tabs.length) % tabs.length];
    if (e.key === 'Home')       next = tabs[0];
    if (e.key === 'End')        next = tabs[tabs.length - 1];
    if (next) { e.preventDefault(); select(next); }
  });
}

/* ---------- 導覽列 ---------- */

function initNav() {
  const toggle = $('.navtoggle');
  const nav = $('.sitenav');
  if (toggle && nav) {
    toggle.addEventListener('click', () => {
      const open = nav.classList.toggle('open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    nav.addEventListener('click', e => {
      if (e.target.tagName === 'A') { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }
    });
  }

  $$('.langtoggle .seg').forEach(seg => {
    seg.addEventListener('click', () => applyLang(seg.dataset.setLang));
  });

  const backTop = $('#backTop');
  if (backTop) {
    window.addEventListener('scroll', () => {
      backTop.classList.toggle('show', window.scrollY > 500);
    }, { passive: true });
    backTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  }

  // 列印時展開所有收合區塊。瀏覽器對 details 收合狀態的處理無法單靠 CSS 覆寫，
  // 否則「歷年完整經歷」在列印的 CV 上會整段消失。
  window.addEventListener('beforeprint', () => {
    $$('details').forEach(d => { d.dataset.printPrev = String(d.open); d.open = true; });
  });
  window.addEventListener('afterprint', () => {
    $$('details').forEach(d => {
      if (d.dataset.printPrev !== undefined) {
        d.open = d.dataset.printPrev === 'true';
        delete d.dataset.printPrev;
      }
    });
  });

  // 捲動時高亮當前區段
  const links = $$('.sitenav a[href^="#"]');
  if (links.length && 'IntersectionObserver' in window) {
    const map = new Map();
    links.forEach(a => {
      const sec = document.querySelector(a.getAttribute('href'));
      if (sec) map.set(sec, a);
    });
    const io = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          links.forEach(a => a.removeAttribute('aria-current'));
          map.get(entry.target)?.setAttribute('aria-current', 'true');
        }
      });
    }, { rootMargin: '-84px 0px -70% 0px' });
    map.forEach((_, sec) => io.observe(sec));
  }
}

/* ---------- 日期 ---------- */

export function fmtDateTime(value) {
  if (!value) return '—';
  const d = value.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  const p = n => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`;
}

/** 依截止時間回傳狀態，供作業徽章上色 */
export function dueState(value) {
  if (!value) return { cls: 'normal', label: '未設定截止' };
  const d = value.toDate ? value.toDate() : new Date(value);
  if (Number.isNaN(d.getTime())) return { cls: 'normal', label: '未設定截止' };
  const days = (d - Date.now()) / 86400000;
  const stamp = fmtDateTime(d);
  if (days < 0)  return { cls: 'over', label: `已截止 ${stamp}` };
  if (days <= 3) return { cls: 'soon', label: `即將截止 ${stamp}` };
  return { cls: 'normal', label: `截止 ${stamp}` };
}

/* ---------- 全站版型／配色設定（非阻塞） ----------
   公開頁已移除切換器，一律套用管理者在後台設定的全站預設。
   刻意用動態 import 讀 data.js（才會牽動 Firebase），
   這樣就算 Firebase 完全載入失敗，也絕不會擋住頁面其餘部分的渲染或互動——
   失敗就靜默維持目前（config.js 預設或上次快取）的版型與配色。 */

export function applySiteSettingsAsync() {
  import('./data.js')
    .then(({ getSiteSettings }) => getSiteSettings())
    .then(settings => {
      if (!settings) return;
      if (settings.theme)  applyTheme(settings.theme);
      if (settings.layout) applyLayout(settings.layout);
    })
    .catch(() => { /* 靜默失敗 */ });
}

/* ---------- 啟動 ---------- */

/**
 * @param {{ applySiteDefault?: boolean }} opts
 *   applySiteDefault: 公開頁（index.html / courses.html）傳 true，
 *   會在初始渲染完成後非同步套用全站預設版型／配色。
 *   admin.html 不傳，後台的版型／配色卡片是「這台裝置的預覽」，
 *   不應該被全站設定悄悄蓋掉。
 */
export function initUI({ applySiteDefault = false } = {}) {
  applyTheme(currentTheme());
  applyLayout(currentLayout());
  applyLang(currentLang());
  initNav();
  initModals();
  initLooks();
  if (applySiteDefault) applySiteSettingsAsync();
}
