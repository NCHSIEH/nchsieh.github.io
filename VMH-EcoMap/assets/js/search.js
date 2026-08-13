/* ==========================================================================
   search.js — 全站搜尋（⌘K / Ctrl+K）
   知識管理系統與試算表最大的差別之一：一個搜尋框打穿所有分頁。
   ========================================================================== */

import { db } from './store.js';
import { esc } from './ui.js';

let corpus = [];

/** 把所有實體攤平成一份可搜尋的索引 */
export function buildCorpus() {
  corpus = [];

  db.capabilities.forEach(c => corpus.push({
    kind: '能力', href: `#/cap/${c.id}`,
    title: `${c.id} ${c.name}`,
    sub: `${c.domain || ''}｜${c.stage || ''}｜${c.puzzle || ''}`,
    text: [c.id, c.name, c.nameEn, c.outcome, c.gapNext, c.deliverable, c.lead,
           c.candidate, c.domain, c.stage, c.puzzle, c.decision, c.bizLine].join(' ')
  }));

  db.opportunities.forEach(o => corpus.push({
    kind: '商機', href: `#/opp/${o.id}`,
    title: `${o.id} ${o.name}`,
    sub: `${o.family || ''}｜${o.vnMaturity || ''}`,
    text: [o.id, o.name, o.nameEn, o.family, o.whatWeSell, o.vnNotes,
           o.competitors, o.ourAngle, o.payer, o.txnMode, o.amountTier].join(' ')
  }));

  db.partners.forEach(p => corpus.push({
    kind: '夥伴', href: `#/partner/${p.id}`,
    title: `${p.id} ${p.name}`,
    sub: `${p.type || ''}｜${p.country || ''}｜${p.status || ''}`,
    text: [p.id, p.name, p.nameEn, p.type, p.country, p.role, p.nextAction, p.status].join(' ')
  }));

  db.gates.forEach(g => corpus.push({
    kind: '門檻', href: `#/gates`,
    title: `${g.id} ${g.title}`,
    sub: `${g.level || ''}｜${g.status || ''}｜${g.authority || ''}`,
    text: [g.id, g.title, g.authority, g.category, g.note, g.owner].join(' ')
  }));

  db.workpackages.forEach(w => corpus.push({
    kind: '工作包', href: `#/wp/${w.id}`,
    title: `${w.id} ${w.name}`,
    sub: `${w.stage || ''}｜M${w.startMonth}–M${w.endMonth}｜${w.lead || ''}`,
    text: [w.id, w.name, w.lead, w.acceptance, w.caps, (w.partners || []).join(' ')].join(' ')
  }));

  db.risks.forEach(r => corpus.push({
    kind: '風險', href: `#/risks`,
    title: `${r.id} ${r.statement || ''}`,
    sub: `${r.level || ''}｜${r.category || ''}｜${r.owner || ''}`,
    text: [r.id, r.statement, r.category, r.mitigation, r.owner, r.trigger].join(' ')
  }));

  db.kpis.forEach(k => corpus.push({
    kind: 'KPI', href: `#/kpis`,
    title: `${k.id} ${k.name || ''}`,
    sub: `${k.perspective || ''}｜${k.owner || ''}`,
    text: [k.id, k.name, k.perspective, k.formula, k.owner, k.dataSource].join(' ')
  }));

  db.decisions.forEach(d => corpus.push({
    kind: '決策', href: `#/history`,
    title: `${d.id} ${d.topic || ''}`,
    sub: `${d.date || ''}｜${d.by || ''}`,
    text: [d.id, d.topic, d.decision, d.by].join(' ')
  }));

  db.sources.forEach(s => corpus.push({
    kind: '來源', href: `#/history`,
    title: `${s.id} ${s.title || ''}`,
    sub: `${s.org || ''}｜${s.checked || ''}`,
    text: [s.id, s.title, s.org, s.purpose, s.note].join(' ')
  }));

  corpus.forEach(entry => { entry.haystack = entry.text.toLowerCase(); });
  return corpus;
}

/** 逐字比對；標題命中的排前面 */
export function query(term, limit = 24) {
  const needle = term.trim().toLowerCase();
  if (!needle) return [];
  const words = needle.split(/\s+/);

  return corpus
    .map(entry => {
      if (!words.every(w => entry.haystack.includes(w))) return null;
      const inTitle = entry.title.toLowerCase().includes(needle);
      const atStart = entry.title.toLowerCase().startsWith(needle);
      return { entry, score: (atStart ? 100 : 0) + (inTitle ? 50 : 0) };
    })
    .filter(Boolean)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map(r => r.entry);
}

/* --------------------------------------------------------------------------
   搜尋面板
   -------------------------------------------------------------------------- */
export function initPalette() {
  const panel = document.getElementById('palette');
  const input = document.getElementById('paletteInput');
  const results = document.getElementById('paletteResults');
  let selected = 0;

  function open() {
    panel.classList.add('is-open');
    input.value = '';
    render([]);
    input.focus();
  }

  function close() {
    panel.classList.remove('is-open');
  }

  function render(items) {
    selected = 0;
    if (!items.length) {
      results.innerHTML = input.value.trim()
        ? `<div class="empty">沒有找到符合的項目</div>`
        : `<div class="empty">輸入關鍵字搜尋能力、商機、夥伴、法規、風險、工作包、決策與來源</div>`;
      return;
    }
    results.innerHTML = items.map((item, i) => `
      <a href="${item.href}" class="${i === 0 ? 'is-sel' : ''}" data-i="${i}">
        <span class="kind">${esc(item.kind)}</span>
        <span class="hit"><b>${esc(item.title)}</b><small>${esc(item.sub)}</small></span>
      </a>`).join('');
  }

  function move(step) {
    const links = [...results.querySelectorAll('a')];
    if (!links.length) return;
    links[selected]?.classList.remove('is-sel');
    selected = (selected + step + links.length) % links.length;
    links[selected].classList.add('is-sel');
    links[selected].scrollIntoView({ block: 'nearest' });
  }

  input.addEventListener('input', () => render(query(input.value)));

  input.addEventListener('keydown', event => {
    if (event.key === 'ArrowDown') { event.preventDefault(); move(1); }
    else if (event.key === 'ArrowUp') { event.preventDefault(); move(-1); }
    else if (event.key === 'Enter') {
      event.preventDefault();
      results.querySelectorAll('a')[selected]?.click();
    } else if (event.key === 'Escape') close();
  });

  results.addEventListener('click', event => {
    if (event.target.closest('a')) close();
  });

  panel.addEventListener('click', event => {
    if (event.target === panel) close();
  });

  document.getElementById('searchBtn').addEventListener('click', open);

  document.addEventListener('keydown', event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
      event.preventDefault();
      panel.classList.contains('is-open') ? close() : open();
    } else if (event.key === '/' && !/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName)) {
      event.preventDefault();
      open();
    }
  });
}
