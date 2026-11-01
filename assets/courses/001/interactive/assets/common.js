/* 共用工具：亂數、統計、SVG 繪圖、測驗、進度儲存 */
(function (G) {
  'use strict';
  // ---------- random ----------
  function rng(seed) { let a = seed >>> 0 || 1; return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
  function randn(r) { let u = 0, v = 0; while (u === 0) u = r(); v = r(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }

  // ---------- stats ----------
  const S = {
    sum: a => a.reduce((s, x) => s + x, 0),
    mean: a => a.length ? S.sum(a) / a.length : NaN,
    sd(a) { if (a.length < 2) return NaN; const m = S.mean(a); return Math.sqrt(S.sum(a.map(x => (x - m) ** 2)) / (a.length - 1)); },
    sorted: a => a.slice().sort((x, y) => x - y),
    q(a, p) { const s = S.sorted(a); if (!s.length) return NaN; const i = (s.length - 1) * p, lo = Math.floor(i), hi = Math.ceil(i); return s[lo] + (s[hi] - s[lo]) * (i - lo); },
    median: a => S.q(a, .5),
    skew(a) { const m = S.mean(a), sd = Math.sqrt(S.mean(a.map(x => (x - m) ** 2))); return S.mean(a.map(x => ((x - m) / sd) ** 3)); },
    r(x, y) { const mx = S.mean(x), my = S.mean(y); let n = 0, dx = 0, dy = 0; for (let i = 0; i < x.length; i++) { n += (x[i] - mx) * (y[i] - my); dx += (x[i] - mx) ** 2; dy += (y[i] - my) ** 2; } return n / Math.sqrt(dx * dy); },
    min: a => a.reduce((m, x) => x < m ? x : m, Infinity),
    max: a => a.reduce((m, x) => x > m ? x : m, -Infinity),
  };
  const fmt = (x, d = 1) => (x == null || isNaN(x)) ? '—' : Number(x).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });

  // ---------- DOM ----------
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));
  function h(tag, attrs, ...kids) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) { const v = attrs[k]; if (v == null || v === false) continue; if (k === 'class') e.className = v; else if (k === 'html') e.innerHTML = v; else if (k.startsWith('on')) e.addEventListener(k.slice(2), v); else if (k === 'style' && typeof v === 'object') Object.assign(e.style, v); else e.setAttribute(k, v === true ? '' : v); }
    for (const c of kids.flat()) if (c != null && c !== false) e.append(c.nodeType ? c : document.createTextNode(c));
    return e;
  }
  const NS = 'http://www.w3.org/2000/svg';
  function s(tag, attrs, parent) { const e = document.createElementNS(NS, tag); if (attrs) for (const k in attrs) { if (attrs[k] == null) continue; if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); } if (parent) parent.appendChild(e); return e; }
  function svgBox(container, w, hgt) { container.innerHTML = ''; const sv = s('svg', { viewBox: `0 0 ${w} ${hgt}`, class: 'chart', role: 'img' }); container.appendChild(sv); return sv; }
  const C = { accent: '#0d6b67', amber: '#b45309', bad: '#c0392b', good: '#2f7d4f', blue: '#2b6cb0', gray: '#a3abb4', ink: '#1c2430', line: '#e2ddd2', soft: '#e3f1ef' };

  // linear scale
  function scale(d0, d1, r0, r1) { const f = x => r0 + (x - d0) / (d1 - d0 || 1) * (r1 - r0); f.inv = y => d0 + (y - r0) / (r1 - r0) * (d1 - d0); return f; }
  function ticks(a, b, n = 5) { const span = b - a, step0 = span / n, mag = Math.pow(10, Math.floor(Math.log10(step0))), err = step0 / mag; const step = (err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1) * mag; const out = []; for (let v = Math.ceil(a / step) * step; v <= b + 1e-9; v += step) out.push(+v.toFixed(10)); return out; }

  /* histogram: sets=[{values,color,opacity,outline}] */
  function hist(container, sets, o = {}) {
    const W = o.w || 520, H = o.h || 220, m = { l: 40, r: 12, t: 14, b: 34 };
    const sv = svgBox(container, W, H);
    const all = sets.flatMap(d => d.values);
    const lo = o.min ?? S.min(all), hi = o.max ?? S.max(all), nb = o.bins || 30, bw = (hi - lo) / nb;
    const counts = sets.map(d => { const c = new Array(nb).fill(0); d.values.forEach(v => { let i = Math.floor((v - lo) / bw); if (i === nb) i--; if (i >= 0 && i < nb) c[i]++; }); return c; });
    const ymax = o.ymax || Math.max(1, ...counts.flat()) * 1.08;
    const x = scale(lo, hi, m.l, W - m.r), y = scale(0, ymax, H - m.b, m.t);
    ticks(0, ymax, 4).forEach(t => { s('line', { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: 'grid' }, sv); s('text', { x: m.l - 6, y: y(t) + 4, 'text-anchor': 'end', text: t }, sv); });
    counts.forEach((c, k) => { const d = sets[k]; c.forEach((n, i) => { if (!n) return; const r = s('rect', { x: x(lo + i * bw) + .5, y: y(n), width: Math.max(0, x(lo + bw) - x(lo) - 1), height: y(0) - y(n), fill: d.outline ? 'none' : (d.color || C.accent), 'fill-opacity': d.opacity ?? 1, stroke: d.outline ? d.color : null, 'stroke-width': d.outline ? 1.4 : null, 'stroke-dasharray': d.dash ? '3 2' : null }, sv); if (d.highlight && d.highlight(lo + i * bw, lo + (i + 1) * bw)) r.setAttribute('fill', d.hcolor || C.amber); }); });
    s('line', { x1: m.l, x2: W - m.r, y1: y(0), y2: y(0), class: 'axis' }, sv);
    (o.xt || ticks(lo, hi, 6)).forEach(t => s('text', { x: x(t), y: H - m.b + 16, 'text-anchor': 'middle', text: o.xfmt ? o.xfmt(t) : t }, sv));
    if (o.xlabel) s('text', { x: (m.l + W - m.r) / 2, y: H - 3, 'text-anchor': 'middle', text: o.xlabel, style: 'font-size:12px;fill:#5d6774' }, sv);
    (o.marks || []).forEach((mk, i) => { const X = x(mk.x); s('line', { x1: X, x2: X, y1: m.t - 4, y2: H - m.b, stroke: mk.color || C.ink, 'stroke-width': 1.6, 'stroke-dasharray': mk.dash === false ? null : '4 3' }, sv); if (mk.label) s('text', { x: X + (mk.anchor === 'end' ? -4 : 4), y: m.t + 8 + (mk.dy ?? i * 13), 'text-anchor': mk.anchor || 'start', text: mk.label, style: `fill:${mk.color || C.ink};font-weight:600` }, sv); });
    return { sv, x, y, m, W, H };
  }

  /* scatter: pts=[{x,y,c,r,stroke}] */
  function scatter(container, pts, o = {}) {
    const W = o.w || 420, H = o.h || 320, m = { l: 44, r: 12, t: 12, b: 36 };
    const sv = svgBox(container, W, H);
    const xs = pts.map(p => p.x), ys = pts.map(p => p.y);
    const x0 = o.xmin ?? S.min(xs), x1 = o.xmax ?? S.max(xs), y0 = o.ymin ?? S.min(ys), y1 = o.ymax ?? S.max(ys);
    const x = scale(x0, x1, m.l, W - m.r), y = scale(y0, y1, H - m.b, m.t);
    if (!o.noGrid) { (o.yt || ticks(y0, y1, 4)).forEach(t => { s('line', { x1: m.l, x2: W - m.r, y1: y(t), y2: y(t), class: 'grid' }, sv); s('text', { x: m.l - 6, y: y(t) + 4, 'text-anchor': 'end', text: o.yfmt ? o.yfmt(t) : t }, sv); });
      (o.xt || ticks(x0, x1, 5)).forEach(t => s('text', { x: x(t), y: H - m.b + 16, 'text-anchor': 'middle', text: o.xfmt ? o.xfmt(t) : t }, sv)); }
    s('line', { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, class: 'axis' }, sv); s('line', { x1: m.l, x2: m.l, y1: m.t, y2: H - m.b, class: 'axis' }, sv);
    (o.under || []).forEach(f => f(sv, x, y));
    const g = s('g', null, sv);
    pts.forEach(p => { const c = s('circle', { cx: x(p.x), cy: y(p.y), r: p.r || 3.2, fill: p.c || C.accent, 'fill-opacity': p.op ?? .75, stroke: p.stroke || null, 'stroke-width': p.stroke ? 2 : null }, g); if (p.title) s('title', { text: p.title }, c); if (p.onclick) { c.style.cursor = 'pointer'; c.addEventListener('click', p.onclick); } });
    if (o.xlabel) s('text', { x: (m.l + W - m.r) / 2, y: H - 3, 'text-anchor': 'middle', text: o.xlabel, style: 'font-size:12px;fill:#5d6774' }, sv);
    if (o.ylabel) s('text', { x: 12, y: (m.t + H - m.b) / 2, 'text-anchor': 'middle', transform: `rotate(-90 12 ${(m.t + H - m.b) / 2})`, text: o.ylabel, style: 'font-size:12px;fill:#5d6774' }, sv);
    (o.over || []).forEach(f => f(sv, x, y));
    return { sv, x, y, m, W, H };
  }

  /* horizontal bars: items=[{label,value,color}] */
  function hbars(container, items, o = {}) {
    const W = o.w || 420, rowH = o.rowH || 24, lw = o.lw || 90, H = items.length * rowH + 8;
    const sv = svgBox(container, W, H); const max = o.max || Math.max(...items.map(i => i.value), 1);
    const x = scale(0, max, lw, W - 50);
    items.forEach((it, i) => { const Y = 4 + i * rowH; s('text', { x: lw - 8, y: Y + rowH / 2 + 4, 'text-anchor': 'end', text: it.label, style: 'font-size:12px;fill:#1c2430' }, sv); s('rect', { x: lw, y: Y + 3, width: Math.max(1, x(it.value) - lw), height: rowH - 8, rx: 3, fill: it.color || C.accent }, sv); s('text', { x: x(it.value) + 5, y: Y + rowH / 2 + 4, text: o.fmt ? o.fmt(it.value) : it.value, style: 'font-size:12px;font-family:var(--mono);fill:#1c2430' }, sv); });
    return sv;
  }

  /* boxplot (horizontal) on an existing svg */
  function boxplot(sv, vals, x, yc, hgt, k = 1.5, color = C.accent) {
    const q1 = S.q(vals, .25), q3 = S.q(vals, .75), md = S.median(vals), iqr = q3 - q1, lo = q1 - k * iqr, hi = q3 + k * iqr;
    const inside = vals.filter(v => v >= lo && v <= hi), wl = S.min(inside), wh = S.max(inside);
    s('line', { x1: x(wl), x2: x(q1), y1: yc, y2: yc, stroke: color }, sv); s('line', { x1: x(q3), x2: x(wh), y1: yc, y2: yc, stroke: color }, sv);
    [wl, wh].forEach(v => s('line', { x1: x(v), x2: x(v), y1: yc - hgt / 3, y2: yc + hgt / 3, stroke: color }, sv));
    s('rect', { x: x(q1), y: yc - hgt / 2, width: x(q3) - x(q1), height: hgt, fill: C.soft, stroke: color }, sv);
    s('line', { x1: x(md), x2: x(md), y1: yc - hgt / 2, y2: yc + hgt / 2, stroke: color, 'stroke-width': 2.2 }, sv);
    vals.filter(v => v < lo || v > hi).forEach(v => s('circle', { cx: x(v), cy: yc, r: 3.5, fill: C.bad, 'fill-opacity': .8 }, sv));
    return { q1, q3, md, iqr, lo, hi };
  }

  // ---------- storage (best-effort) ----------
  const Store = {
    key: 'ds2027',
    all() { try { return JSON.parse(localStorage.getItem(this.key) || '{}'); } catch (e) { return this._mem || (this._mem = {}); } },
    get(k, d) { const a = this.all(); return k in a ? a[k] : d; },
    set(k, v) { const a = this.all(); a[k] = v; try { localStorage.setItem(this.key, JSON.stringify(a)); } catch (e) { this._mem = a; } },
  };

  // ---------- quiz ----------
  function quiz(container, q) {
    const box = h('div', { class: 'quiz' }, h('div', { class: 'qh' }, q.head || '隨堂小測'), h('div', { class: 'qq', html: q.q }));
    const opts = h('div', { class: 'opts' }); const ex = h('div', { class: 'ex', html: q.ex || '' });
    q.opts.forEach((t, i) => { const b = h('button', { class: 'opt', html: t }); b.onclick = () => { if (box.classList.contains('done')) return; if (i === q.a) { b.classList.add('right'); box.classList.add('done'); q.onRight && q.onRight(); } else { b.classList.add('wrong', 'shake'); setTimeout(() => b.classList.remove('shake'), 400); box.dataset.miss = (+box.dataset.miss || 0) + 1; if (+box.dataset.miss >= 2) { opts.children[q.a].classList.add('right'); box.classList.add('done'); } } }; opts.append(b); });
    box.append(opts, ex); (typeof container === 'string' ? $(container) : container).append(box); return box;
  }

  function parseCSV(text) { const rows = []; let row = [], f = '', q = false; for (let i = 0; i < text.length; i++) { const c = text[i]; if (q) { if (c === '"') { if (text[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += c; } else if (c === '"') q = true; else if (c === ',') { row.push(f); f = ''; } else if (c === '\n' || c === '\r') { if (c === '\r' && text[i + 1] === '\n') i++; row.push(f); rows.push(row); row = []; f = ''; } else f += c; } if (f !== '' || row.length) { row.push(f); rows.push(row); } return rows.filter(r => r.length > 1 || r[0] !== ''); }


  // ---------- 單元頁共用：側欄導覽、完成標記、進度條 ----------
  function initModule(KEY) {
    const parts = $$('section.part'); Store.set(KEY + ':total', parts.length);
    const side = $('#side'); const done = new Set(Store.get(KEY + ':done', []));
    const prog = () => { $('#ptxt').textContent = `完成 ${done.size} / ${parts.length}`; $('#pbar').style.width = (done.size / parts.length * 100) + '%'; };
    parts.forEach((p, i) => {
      const a = h('a', { href: '#' + p.id, 'data-id': p.id }, h('span', { class: 'n' }, String(i + 1).padStart(2, '0')), h('span', null, p.dataset.t), h('span', { class: 'ck' }, '✓'));
      side.append(a);
      const b = h('button', { class: 'btn sm mark-done' });
      const sync = () => { b.textContent = done.has(p.id) ? '✓ 已完成這一節（點擊取消）' : '標記這一節為已完成'; b.classList.toggle('on', done.has(p.id)); a.classList.toggle('done', done.has(p.id)); };
      b.onclick = () => { done.has(p.id) ? done.delete(p.id) : done.add(p.id); Store.set(KEY + ':done', [...done]); sync(); prog(); };
      p.append(h('div', { class: 'row', style: { justifyContent: 'flex-end', marginTop: '14px' } }, b)); sync();
    });
    prog();
    const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) $$('#side a').forEach(a => a.classList.toggle('cur', a.dataset.id === e.target.id)); }), { rootMargin: '-40% 0px -55% 0px' });
    parts.forEach(p => io.observe(p));
  }
  const seg = (opts, get, set, redraw) => { const sg = h('div', { class: 'seg' }); opts.forEach(([v, l]) => { const b = h('button', { class: get() === v ? 'on' : '' }, l); b.onclick = () => { set(v); redraw(); }; sg.append(b); }); return sg; };
  const slider = (label, min, max, step, get, set, redraw, f = v => v) => { const i = h('input', { type: 'range', min, max, step }); i.value = get(); const v = h('span', { class: 'val' }, f(get())); i.oninput = () => { set(+i.value); v.textContent = f(+i.value); redraw(); }; return h('label', { class: 'ctl' }, label, i, v); };
  const check = (label, get, set, redraw) => { const c = h('input', { type: 'checkbox' }); c.checked = get(); c.onchange = () => { set(c.checked); redraw(); }; return h('label', { class: 'ctl' }, c, label); };
  /* 選擇題分類卡：items=[[text, answer, why]], choices=[...] */
  function sorter(container, items, choices, foot) {
    const ans = {}; const out = h('div');
    function draw() { out.innerHTML = ''; let ok = 0;
      items.forEach(([t, a, why], i) => { const row = h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', padding: '7px 0', borderBottom: '1px solid var(--line)', flexWrap: 'wrap' } }, h('div', { style: { flex: '1 1 280px', fontSize: '14.5px' } }, t));
        choices.forEach(m => { const b = h('button', { class: 'btn sm' }, m); if (ans[i] === m) { if (m === a) b.classList.add('on'); else b.style.cssText = 'background:var(--bad-soft);border-color:var(--bad)'; } b.onclick = () => { ans[i] = m; draw(); }; row.append(b); });
        if (ans[i]) { if (ans[i] === a) ok++; row.append(h('div', { style: { flexBasis: '100%', fontSize: '13px', color: ans[i] === a ? 'var(--good)' : 'var(--bad)' } }, (ans[i] === a ? '✓ ' : `✗ 應為 ${a}：`) + why)); }
        out.append(row); });
      out.append(h('div', { class: 'row', style: { marginTop: '10px' } }, h('span', { class: 'tag ' + (ok === items.length ? 'good' : 'gray') }, `答對 ${ok} / ${items.length}`), foot ? h('span', { style: { fontSize: '13px', color: 'var(--muted)' } }, foot) : ''));
    }
    (typeof container === 'string' ? $(container) : container).append(out); draw();
  }
  function flashcards(container, G) {
    let front = 'zh'; const out = h('div');
    function draw() { out.innerHTML = ''; const g = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(190px,1fr))', gap: '8px' } });
      G.forEach(([zh, en, d]) => { const c = h('div', { style: { border: '1px solid var(--line)', borderRadius: '10px', padding: '10px 12px', minHeight: '86px', background: '#fff', cursor: 'pointer', display: 'flex', flexDirection: 'column', justifyContent: 'center' } }); let f = false; const paint = () => { c.innerHTML = ''; c.style.background = f ? 'var(--accent-soft)' : '#fff'; if (!f) c.append(h('div', { style: { fontWeight: 700, fontSize: '15.5px' } }, front === 'zh' ? zh : en)); else c.append(h('div', { style: { fontWeight: 600, fontSize: '13.5px', color: 'var(--accent-ink)' } }, front === 'zh' ? en : zh), h('div', { style: { fontSize: '13px', color: 'var(--muted)' } }, d)); }; c.onclick = () => { f = !f; paint(); }; paint(); g.append(c); });
      out.append(h('div', { class: 'row', style: { marginBottom: '8px' } }, seg([['zh', '正面：中文'], ['en', '正面：英文']], () => front, v => front = v, draw)), g); }
    (typeof container === 'string' ? $(container) : container).append(out); draw();
  }
  function finalQuiz(box, Q) {
    box = typeof box === 'string' ? $(box) : box; let score = 0; const sc = h('div', { class: 'note', style: { display: 'none' } });
    Q.forEach(([q, o, a, ex], i) => quiz(box, { head: `第 ${i + 1} 題`, q, opts: o, a, ex, onRight: () => { if (!box.children[i].dataset.miss) score++; } }));
    box.addEventListener('click', () => { if (box.querySelectorAll('.quiz.done').length === Q.length) { sc.style.display = 'block'; sc.textContent = `完成！一次答對 ${score} / ${Q.length} 題。${score >= Q.length * .8 ? '觀念扎實，可以進入下一個單元。' : '建議回頭看看答錯題目對應的段落。'}`; } });
    box.append(sc);
  }

  G.U = { initModule, seg, slider, check, sorter, flashcards, finalQuiz, rng, randn, S, fmt, $, $$, h, s, svgBox, C, scale, ticks, hist, scatter, hbars, boxplot, Store, quiz, parseCSV };
})(window);
