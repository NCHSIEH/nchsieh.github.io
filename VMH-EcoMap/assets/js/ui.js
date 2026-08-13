/* ==========================================================================
   ui.js — 共用的畫面零件
   純函式：吃資料、吐 HTML 字串。不碰 DOM、不管路由。
   ========================================================================== */

import { puzzleMeta } from './store.js';

/** 一律經過這裡輸出，避免資料裡的角括號破壞版面 */
export function esc(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function dash(value) {
  return value === null || value === undefined || value === '' ? '<span style="color:var(--faint)">—</span>' : esc(value);
}

/** 拼圖狀態標籤：● ◆ ◐ ○ */
export function puzzleTag(name) {
  const meta = puzzleMeta(name);
  return `<span class="tag tag--${meta.key}" title="${esc(meta.note)}">${meta.symbol} ${esc(meta.label)}</span>`;
}

/** 商業判斷標籤 */
export function decisionTag(decision) {
  const map = {
    '立即推進 Go':      'ok',
    '快速小案 Quick-win': 'info',
    '先補條件 Prepare': 'warn',
    '儲備觀察 Backlog': 'neutral',
    '暫緩 Hold':        'danger'
  };
  const kind = map[decision] || 'neutral';
  return decision ? `<span class="tag tag--${kind}">${esc(decision)}</span>` : '';
}

/** 風險等級 / 法規狀態之類的通用狀態標籤 */
export function statusTag(text, kind = 'neutral') {
  return text ? `<span class="tag tag--${kind}">${esc(text)}</span>` : '';
}

export function riskTag(level) {
  const map = { '極高': 'danger', '高': 'warn', '中': 'info', '低': 'ok' };
  return statusTag(level, map[level] || 'neutral');
}

export function gateTag(status) {
  const map = { '待確認': 'warn', '通過': 'ok', '不適用': 'neutral', '未通過': 'danger' };
  return statusTag(status, map[status] || 'neutral');
}

export function levelTag(level) {
  const map = { '強制': 'danger', '契約': 'warn', '設計': 'info', '參考': 'neutral', '供應商': 'info', '依用途': 'neutral' };
  return statusTag(level, map[level] || 'neutral');
}

/** 越南現況：③ 尚未出現＝主動出擊的空間 */
export function maturityTag(text) {
  if (!text) return '';
  const kind = text.startsWith('③') ? 'ok' : text.startsWith('②') ? 'info' : 'neutral';
  return `<span class="tag tag--${kind}">${esc(text)}</span>`;
}

/** 0–5 分的橫條，價值用主色、準備用強調色 */
export function scoreBar(value, variant = '') {
  if (value === null || value === undefined) return '<span style="color:var(--faint)">—</span>';
  const pct = Math.max(0, Math.min(100, (Number(value) / 5) * 100));
  const cls = variant === 'ready' ? ' scorebar__fill--ready' : '';
  return `<span class="scorebar">
    <span class="scorebar__track"><span class="scorebar__fill${cls}" style="width:${pct}%"></span></span>
    <b>${Number(value).toFixed(1)}</b>
  </span>`;
}

/** 統計磚 */
export function stat({ label, value, note, variant }) {
  return `<div class="stat${variant ? ` stat--${variant}` : ''}">
    <span class="stat__label">${esc(label)}</span>
    <div class="stat__value">${esc(value)}</div>
    ${note ? `<div class="stat__note">${note}</div>` : ''}
  </div>`;
}

/** 卡片外框 */
export function card({ title, note, body, actions = '', flush = false }) {
  return `<section class="card">
    ${title ? `<div class="card__head">
      <h2>${esc(title)}</h2>
      ${note ? `<p>${esc(note)}</p>` : ''}
      ${actions ? `<div style="margin-left:auto">${actions}</div>` : ''}
    </div>` : ''}
    <div class="card__body${flush ? ' card__body--flush' : ''}">${body}</div>
  </section>`;
}

/** 排行條圖 */
export function barList(items, { max } = {}) {
  const top = max || Math.max(1, ...items.map(i => i.value));
  return `<div class="bars">${items.map(item => `
    <div class="bar">
      <span>${item.href ? `<a href="${item.href}">${esc(item.label)}</a>` : esc(item.label)}</span>
      <span class="bar__track"><span class="bar__fill" style="width:${(item.value / top) * 100}%${item.color ? `;background:${item.color}` : ''}"></span></span>
      <span class="bar__val">${esc(item.value)}</span>
    </div>`).join('')}</div>`;
}

/** 麵包屑 */
export function crumb(trail) {
  return `<nav class="crumb">${trail.map((t, i) =>
    (i ? ' › ' : '') + (t.href ? `<a href="${t.href}">${esc(t.label)}</a>` : esc(t.label))
  ).join('')}</nav>`;
}

/** 空狀態 */
export function empty(message) {
  return `<div class="empty">${esc(message)}</div>`;
}

/** 表格：columns = [{ key, label, className, render }] */
export function table(rows, columns, { emptyText = '沒有符合條件的資料' } = {}) {
  if (!rows.length) return empty(emptyText);
  const head = columns.map(c => `<th${c.className ? ` class="${c.className}"` : ''}>${esc(c.label)}</th>`).join('');
  const body = rows.map(row => `<tr>${columns.map(c => {
    const value = c.render ? c.render(row) : dash(row[c.key]);
    return `<td${c.className ? ` class="${c.className}"` : ''}>${value}</td>`;
  }).join('')}</tr>`).join('');
  return `<div class="tablewrap"><table class="data">
    <thead><tr>${head}</tr></thead><tbody>${body}</tbody>
  </table></div>`;
}

/** 定義清單 — 明細頁的體檢表 */
export function defList(pairs) {
  const rows = pairs.filter(Boolean).map(([term, value]) =>
    `<dt>${esc(term)}</dt><dd>${value === '' || value === null || value === undefined ? dash(null) : value}</dd>`
  ).join('');
  return `<dl class="deflist">${rows}</dl>`;
}

/** 側欄的關聯清單 */
export function linkList(items) {
  if (!items.length) return `<p style="color:var(--faint);font-size:13px;margin:0">目前沒有關聯項目。</p>`;
  return `<ul class="linklist">${items.map(i => `<li>
    <a href="${i.href}">${esc(i.label)}${i.note ? `<small>${esc(i.note)}</small>` : ''}</a>
  </li>`).join('')}</ul>`;
}

/** 能力卡連結（列表與矩陣共用） */
export function capLink(cap) {
  return `<a href="#/cap/${cap.id}" class="rowlink">${esc(cap.name)}</a>`;
}

export function fmtMoney(value) {
  if (value === null || value === undefined || value === '') return dash(null);
  const n = Number(value);
  if (Number.isNaN(n)) return esc(value);
  return `US$ ${n.toLocaleString('en-US')}`;
}
