/* 實例互動框（2026-11-13）：分頁＋卡片＋判斷題。用法：CaseW(box, {tabs:[{id,label,kpis,bars,cards,quiz,note}], src}) */
(function () {
  'use strict';
  const { h, seg } = U, C = U.C || {};
  const kpi = (k, v, cls) => h('div', null, h('div', { class: 'k' }, k), h('div', { class: 'v' + (cls ? ' ' + cls : '') }, v));
  const sub = t => h('div', { style: { fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' } }, t);
  const note = m => h('div', { class: 'note', style: { marginTop: '10px' } }, h('b', null, '看懂了什麼：'), m);
  const card = (...c) => h('div', { style: { border: '1px solid var(--line)', borderRadius: '10px', padding: '10px 14px', marginTop: '10px', background: 'var(--paper)' } }, ...c);
  window.CaseW = function (box, cfg) {
    if (!box) return;
    const out = h('div'); let view = cfg.tabs[0].id; const st = {};
    function draw() {
      out.innerHTML = '';
      out.append(h('div', { class: 'row' }, seg(cfg.tabs.map(t => [t.id, t.label]), () => view, v => view = v, draw)));
      const t = cfg.tabs.find(x => x.id === view), s = st[view] = st[view] || { sel: 0, ans: {} };
      if (t.kpis) out.append(h('div', { class: 'kpi', style: { margin: '10px 0' } }, ...t.kpis.map(a => kpi(...a))));
      (t.bars || []).forEach(b => {
        const d = h('div'); out.append(sub(b.title), d);
        U.hbars(d, b.items.map(([l, v, c]) => ({ label: l, value: v, color: c || C.accent })), { w: 820, lw: b.lw || 260, rowH: 30, max: b.max || 100, fmt: b.fmt });
      });
      if (t.cards) {
        const row = h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '10px' } });
        t.cards.forEach(([k], i) => { const b = h('button', { class: 'btn' + (i === s.sel ? ' primary' : '') }, k); b.onclick = () => { s.sel = i; draw(); }; row.append(b); });
        const [k, d, m] = t.cards[s.sel];
        out.append(row, card(h('b', null, k), h('div', { style: { fontSize: '14px', margin: '4px 0 6px' } }, d), m ? h('span', { class: 'tag' }, '本課對應：' + m) : ''));
      }
      if (t.quiz) {
        t.quiz.forEach((q, i) => {
          const r = card(h('div', { style: { fontSize: '14.5px', marginBottom: '6px' } }, q.t));
          if (s.ans[i] === undefined) q.o.forEach((o, j) => { const b = h('button', { class: 'btn', style: { marginRight: '6px', marginBottom: '4px' } }, o); b.onclick = () => { s.ans[i] = j; draw(); }; r.append(b); });
          else { const ok = s.ans[i] === q.a; r.append(h('div', { style: { fontSize: '14px' } }, h('b', { style: { color: ok ? 'var(--accent-ink)' : '#b42318' } }, (ok ? '對。' : '再想想。') + '你選的是「' + q.o[s.ans[i]] + '」。'), ok ? '' : '較合適的是「' + q.o[q.a] + '」。', q.w)); }
          out.append(r);
        });
        if (t.after && Object.keys(s.ans).length === t.quiz.length) out.append(note(t.after));
      }
      if (t.note) out.append(note(t.note));
      out.append(h('p', { class: 'ai' }, cfg.src));
    }
    box.append(out); draw();
  };
})();

/* 來源連結列：CaseLinks('w-xxx', [[文字, 網址],...], 備註)（2026-11-13）；只放確認連得到的網址 */
window.CaseLinks = function (id, links, extra) {
  const b = document.getElementById(id); if (!b || !b.parentNode) return;
  const p = U.h('p', { class: 'ai' }, U.h('b', null, '來源連結（2026/11/13 查核可開啟）：'),
    ...links.flatMap(([t, u], i) => [i ? '　' : '', U.h('a', { href: u, target: '_blank', rel: 'noopener' }, t)]));
  b.parentNode.append(p);
  if (extra) b.parentNode.append(U.h('p', { class: 'ai' }, extra));
};
