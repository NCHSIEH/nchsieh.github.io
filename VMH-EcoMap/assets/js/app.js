/* ==========================================================================
   app.js — 啟動、路由、導覽
   路由用 hash：#/cap/CAP-028 這種網址可以直接貼給夥伴，
   對方打開看到的永遠是最新版——這就是它取代「LINE 傳檔」的地方。
   ========================================================================== */

import { db, load, stats } from './store.js';
import { esc } from './ui.js';
import * as views from './views.js';
import { buildCorpus, initPalette } from './search.js';

/* --------------------------------------------------------------------------
   主題（跟隨系統，可手動切換並記住）
   -------------------------------------------------------------------------- */
const THEME_KEY = 'vmh-theme';

function applyTheme(theme) {
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.setAttribute('data-theme', theme);
  } else {
    document.documentElement.removeAttribute('data-theme');
  }
  const btn = document.getElementById('themeBtn');
  if (btn) {
    const isDark = theme === 'dark' ||
      (!theme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    btn.textContent = isDark ? '☀' : '☾';
    btn.title = isDark ? '切換為淺色' : '切換為深色';
  }
}

function initTheme() {
  applyTheme(localStorage.getItem(THEME_KEY) || '');
  document.getElementById('themeBtn').addEventListener('click', () => {
    const current = document.documentElement.getAttribute('data-theme');
    const isDark = current === 'dark' ||
      (!current && window.matchMedia('(prefers-color-scheme: dark)').matches);
    const next = isDark ? 'light' : 'dark';
    localStorage.setItem(THEME_KEY, next);
    applyTheme(next);
  });
}

/* --------------------------------------------------------------------------
   導覽
   -------------------------------------------------------------------------- */
const NAV = [
  { group: '決策視圖' },
  { href: '#/',          label: '總覽',       key: 'dashboard' },
  { href: '#/blueprint', label: '01 總藍圖',  key: 'blueprint' },
  { href: '#/gaps',      label: '11 缺口招募', key: 'gaps', count: () => stats().gaps.length, alert: true },

  { group: '知識庫' },
  { href: '#/caps',      label: '03 能力總表', key: 'caps',      count: () => db.capabilities.length },
  { href: '#/opps',      label: '15 商機字典', key: 'opps',      count: () => db.opportunities.length },
  { href: '#/partners',  label: '04 夥伴拼圖', key: 'partners',  count: () => db.partners.length },
  { href: '#/gates',     label: '05 法規門檻', key: 'gates',     count: () => db.gates.length },

  { group: '執行視圖' },
  { href: '#/roadmap',   label: '06 行動路線', key: 'roadmap',   count: () => db.workpackages.length },
  { href: '#/pipeline',  label: '14 商機清單', key: 'pipeline',  count: () => db.pipeline.length },
  { href: '#/portfolio', label: '07 整案量級', key: 'portfolio' },
  { href: '#/risks',     label: '08 風險清冊', key: 'risks',     count: () => db.risks.length },
  { href: '#/kpis',      label: '09 KPI 計分卡', key: 'kpis',    count: () => db.kpis.length },

  { group: '稽核與說明' },
  { href: '#/history',   label: '10 歷程',    key: 'history' },
  { href: '#/about',     label: '系統說明',   key: 'about' }
];

function renderNav() {
  document.getElementById('nav').innerHTML = NAV.map(item => {
    if (item.group) return `<div class="nav__group">${esc(item.group)}</div>`;
    const count = item.count ? item.count() : null;
    return `<a href="${item.href}" data-key="${item.key}">
      <span>${esc(item.label)}</span>
      ${count !== null ? `<span class="nav__count"${item.alert && count ? ' style="background:var(--gap-bg);color:var(--gap-fg)"' : ''}>${count}</span>` : ''}
    </a>`;
  }).join('');
}

function markActive(key) {
  document.querySelectorAll('#nav a').forEach(a => {
    a.classList.toggle('is-active', a.dataset.key === key);
  });
}

/* --------------------------------------------------------------------------
   路由表
   -------------------------------------------------------------------------- */
const ROUTES = [
  { pattern: /^\/?$/,                 key: 'dashboard', view: () => views.dashboard() },
  { pattern: /^\/blueprint$/,         key: 'blueprint', view: () => views.blueprint() },
  { pattern: /^\/caps$/,              key: 'caps',      view: (_, q) => views.capabilities(q) },
  { pattern: /^\/cap\/(.+)$/,         key: 'caps',      view: m => views.capability(m[1]) },
  { pattern: /^\/opps$/,              key: 'opps',      view: (_, q) => views.opportunities(q) },
  { pattern: /^\/opp\/(.+)$/,         key: 'opps',      view: m => views.opportunity(m[1]) },
  { pattern: /^\/partners$/,          key: 'partners',  view: () => views.partners() },
  { pattern: /^\/partner\/(.+)$/,     key: 'partners',  view: m => views.partner(m[1]) },
  { pattern: /^\/gates$/,             key: 'gates',     view: () => views.gates() },
  { pattern: /^\/roadmap$/,           key: 'roadmap',   view: () => views.roadmap() },
  { pattern: /^\/wp\/(.+)$/,          key: 'roadmap',   view: m => views.workpackage(m[1]) },
  { pattern: /^\/gaps$/,              key: 'gaps',      view: () => views.gaps() },
  { pattern: /^\/risks$/,             key: 'risks',     view: () => views.risks() },
  { pattern: /^\/kpis$/,              key: 'kpis',      view: () => views.kpis() },
  { pattern: /^\/pipeline$/,          key: 'pipeline',  view: () => views.pipeline() },
  { pattern: /^\/portfolio$/,         key: 'portfolio', view: () => views.portfolio() },
  { pattern: /^\/history$/,           key: 'history',   view: () => views.history() },
  { pattern: /^\/about$/,             key: 'about',     view: () => views.about() }
];

/** 解析 #/caps?domain=D05 這種網址 */
function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, search = ''] = raw.split('?');
  const params = {};
  new URLSearchParams(search).forEach((value, key) => { params[key] = value; });
  return { path, params };
}

function route() {
  const { path, params } = parseHash();
  const match = ROUTES.find(r => r.pattern.test(path));

  const result = match
    ? match.view(path.match(match.pattern), params)
    : views.notFound('頁面', path, '#/');

  document.getElementById('content').innerHTML = result.html;
  document.getElementById('topbarTitle').textContent = result.title;
  document.title = `${result.title}｜VMH-EcoMap 知識管理系統`;
  markActive(match ? match.key : '');

  if (typeof result.mount === 'function') result.mount();
  window.scrollTo({ top: 0 });
}

/* --------------------------------------------------------------------------
   啟動
   -------------------------------------------------------------------------- */
async function boot() {
  initTheme();
  try {
    await load();
  } catch (error) {
    document.getElementById('content').innerHTML = `
      <div class="page-head"><h1>知識庫載入失敗</h1>
      <p>${esc(error.message)}</p></div>
      <div class="card"><div class="card__body">
        <p style="margin-top:0">本站以 <code>fetch()</code> 讀取 <code>data/*.json</code>，
        直接用 <code>file://</code> 開啟時瀏覽器會擋下這類請求。請改用本機伺服器：</p>
        <p><code>cd VMH-EcoMap &amp;&amp; python3 -m http.server 8000</code>，
        然後開啟 <code>http://localhost:8000/</code>。</p>
        <p style="margin-bottom:0">部署到 GitHub Pages 後不會有這個問題。</p>
      </div></div>`;
    return;
  }

  renderNav();
  buildCorpus();
  initPalette();

  window.addEventListener('hashchange', route);
  route();

  const foot = document.getElementById('sidebarFoot');
  if (foot) {
    foot.innerHTML = `主工具 v${esc(db.meta.toolVersion || '—')}<br>
      資料產出 ${esc(db.meta.generatedAt || '')}<br>
      <a href="../">← 回主網站</a>`;
  }
}

boot();
