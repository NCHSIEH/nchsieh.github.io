/* 演算法實驗室 · 圖形元件庫（11 種元件＋補間動畫）　凍結檔，請勿修改
   用法：const v = LAB.viz.mount(容器); v.update(viewSpec, 是否動畫);
   實驗檔只需宣告每一步的 viewSpec（純資料），前後兩步相同 id 的元素由這裡自動補間。 */
(function (G) {
  'use strict';
  const LAB = G.LAB, NS = 'http://www.w3.org/2000/svg';
  const DUR = 450;
  const SIZE = { main: [640, 430], side: [440, 300], bottom: [920, 220] };
  const reduce = () => G.matchMedia && G.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- 小工具 ---------- */
  function S(tag, attrs, parent) { const e = document.createElementNS(NS, tag); if (attrs) for (const k in attrs) { if (attrs[k] == null) continue; if (k === 'text') e.textContent = attrs[k]; else e.setAttribute(k, attrs[k]); } if (parent) parent.appendChild(e); return e; }
  function H(tag, cls, text, parent) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; if (parent) parent.appendChild(e); return e; }
  const kc = c => c ? ' k-' + c : '';
  function setCls(el, base, o) { const c = base + kc(o.cls) + (o.hl ? ' is-hl' : '') + (o.dim ? ' is-dim' : '') + (o.state ? ' is-' + o.state : '') + (o.active ? ' is-active' : ''); if (el.getAttribute('class') !== c) el.setAttribute('class', c); }
  function ticks(a, b, n) { const span = b - a || 1, step0 = span / (n || 5), mag = Math.pow(10, Math.floor(Math.log10(step0))), err = step0 / mag; const step = (err >= 7.5 ? 10 : err >= 3.5 ? 5 : err >= 1.5 ? 2 : 1) * mag; const out = []; for (let v = Math.ceil(a / step - 1e-9) * step; v <= b + 1e-9; v += step) out.push(+v.toFixed(10)); return out; }
  const tickTxt = v => (Math.abs(v) >= 1000 ? String(Math.round(v)) : String(+v.toFixed(2))).replace('-', '−');
  const txt = v => v == null ? '' : (typeof v === 'number' ? String(v).replace('-', '−') : String(v));

  /* ---------- 補間引擎 ---------- */
  const live = new Map(); let raf = 0;
  const ease = t => 1 - Math.pow(1 - t, 3);
  function apply(el, v) {
    let tr = false;
    for (const k in v) {
      if (k === 'tx' || k === 'ty' || k === 'sc') tr = true;
      else if (k === '#') el.textContent = (el.__pre || '') + LAB.f(v[k], el.__d == null ? 2 : el.__d) + (el.__suf || '');
      else el.setAttribute(k, Math.round(v[k] * 100) / 100);
    }
    if (tr) el.setAttribute('transform', 'translate(' + (Math.round((v.tx || 0) * 100) / 100) + ',' + (Math.round((v.ty || 0) * 100) / 100) + ')' + (v.sc != null && v.sc !== 1 ? ' scale(' + v.sc + ')' : ''));
  }
  function frame(now) {
    raf = 0;
    live.forEach((a, el) => {
      const p = Math.min(1, (now - a.t0) / DUR), e = ease(p), v = el.__v;
      for (const k in a.to) v[k] = a.from[k] == null ? a.to[k] : a.from[k] + (a.to[k] - a.from[k]) * e;
      apply(el, v); if (p >= 1) live.delete(el);
    });
    if (live.size) raf = requestAnimationFrame(frame);
  }
  /* 數值屬性補間：tw(元素, {cx:10, cy:20}, 是否動畫) */
  function tw(el, to, animate) {
    if (!el.__v || !animate) { el.__v = Object.assign(el.__v || {}, to); live.delete(el); apply(el, el.__v); return; }
    let diff = false; for (const k in to) if (el.__v[k] !== to[k]) { diff = true; break; }
    if (!diff) return;
    const from = {}; for (const k in to) from[k] = el.__v[k];
    live.set(el, { from, to: Object.assign({}, to), t0: performance.now() });
    if (!raf) raf = requestAnimationFrame(frame);
  }
  /* 依 id 對應新舊元素：新增、更新、移除 */
  function join(parent, store, items, make, upd, animate) {
    const seen = new Set();
    (items || []).forEach((it, i) => {
      const id = String(it.id == null ? i : it.id); seen.add(id);
      let el = store.get(id), isNew = false;
      if (!el) { el = make(it, i); el.__id = id; store.set(id, el); parent.appendChild(el); isNew = true; if (animate) { el.classList.add('lv-enter'); setTimeout(() => el.classList.remove('lv-enter'), DUR + 80); } }
      upd(el, it, isNew ? false : animate, i, isNew);
    });
    store.forEach((el, id) => { if (!seen.has(id)) { store.delete(id); live.delete(el); if (animate) { el.classList.add('lv-exit'); setTimeout(() => el.remove(), 320); } else el.remove(); } });
  }
  /* FLIP：HTML 元素換位置時滑過去 */
  function flip(els, mutate, animate) {
    if (!animate) { mutate(); return; }
    const before = new Map(); els().forEach(e => before.set(e, e.getBoundingClientRect()));
    mutate();
    els().forEach(e => {
      const b = before.get(e); if (!b) return; const a = e.getBoundingClientRect(), dx = b.left - a.left, dy = b.top - a.top;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) return;
      e.style.transition = 'none'; e.style.transform = 'translate(' + dx + 'px,' + dy + 'px)';
      requestAnimationFrame(() => { e.style.transition = 'transform ' + DUR + 'ms cubic-bezier(.2,.7,.2,1)'; e.style.transform = ''; setTimeout(() => { e.style.transition = ''; }, DUR + 30); });
    });
  }
  function flash(el, animate) { if (!animate) return; el.classList.remove('lv-flash'); void el.offsetWidth; el.classList.add('lv-flash'); }
  function legend(box, items) {
    let lg = box.querySelector(':scope > .lv-legend'); if (!items || !items.length) { if (lg) lg.remove(); return; }
    const sig = JSON.stringify(items); if (lg && lg.__sig === sig) return; if (lg) lg.remove();
    lg = H('div', 'lv-legend', null, box); lg.__sig = sig;
    items.forEach(it => { const s = H('span', null, null, lg); H('i', 'sw' + kc(it.cls) + (it.shape ? ' sh-' + it.shape : ''), null, s); s.appendChild(document.createTextNode(it.label)); });
  }
  function svgIn(box, spec, w, h) {
    const sz = SIZE[spec.slot] || SIZE.main, W = w || sz[0], Hh = h || spec.h || sz[1];
    const sv = S('svg', { viewBox: '0 0 ' + W + ' ' + Hh, class: 'lv-svg', role: 'img' }, box); sv.__W = W; sv.__H = Hh; return sv;
  }
  function axes(g, st, ax, P, W, Hh) {
    const sig = JSON.stringify(ax); if (st.axSig === sig) return; st.axSig = sig; g.textContent = '';
    const sx = st.sx, sy = st.sy;
    ticks(ax.x.min, ax.x.max, 6).forEach(v => { S('line', { x1: sx(v), x2: sx(v), y1: P.t, y2: Hh - P.b, class: 'lv-grid' }, g); S('text', { x: sx(v), y: Hh - P.b + 16, 'text-anchor': 'middle', class: 'lv-tick', text: tickTxt(v) }, g); });
    ticks(ax.y.min, ax.y.max, 5).forEach(v => { S('line', { x1: P.l, x2: W - P.r, y1: sy(v), y2: sy(v), class: 'lv-grid' }, g); S('text', { x: P.l - 7, y: sy(v) + 4, 'text-anchor': 'end', class: 'lv-tick', text: tickTxt(v) }, g); });
    S('line', { x1: P.l, x2: W - P.r, y1: Hh - P.b, y2: Hh - P.b, class: 'lv-axis' }, g); S('line', { x1: P.l, x2: P.l, y1: P.t, y2: Hh - P.b, class: 'lv-axis' }, g);
    if (ax.x.label) S('text', { x: (P.l + W - P.r) / 2, y: Hh - 6, 'text-anchor': 'middle', class: 'lv-axl', text: ax.x.label }, g);
    if (ax.y.label) S('text', { x: 14, y: (P.t + Hh - P.b) / 2, 'text-anchor': 'middle', class: 'lv-axl', transform: 'rotate(-90 14 ' + (P.t + Hh - P.b) / 2 + ')', text: ax.y.label }, g);
  }
  function scales(st, ax, P, W, Hh) {
    st.sx = v => P.l + (v - ax.x.min) / ((ax.x.max - ax.x.min) || 1) * (W - P.l - P.r);
    st.sy = v => Hh - P.b - (v - ax.y.min) / ((ax.y.max - ax.y.min) || 1) * (Hh - P.t - P.b);
  }
  const SHAPES = {
    circle: r => 'M' + (-r) + ',0a' + r + ',' + r + ' 0 1,0 ' + (2 * r) + ',0a' + r + ',' + r + ' 0 1,0 ' + (-2 * r) + ',0',
    square: r => 'M' + (-r) + ',' + (-r) + 'h' + (2 * r) + 'v' + (2 * r) + 'h' + (-2 * r) + 'z',
    diamond: r => { const q = r * 1.35; return 'M0,' + (-q) + 'L' + q + ',0L0,' + q + 'L' + (-q) + ',0z'; },
    triangle: r => { const q = r * 1.25; return 'M0,' + (-q) + 'L' + q + ',' + (q * 0.85) + 'L' + (-q) + ',' + (q * 0.85) + 'z'; },
    cross: r => { const a = r * 1.25, b = r * 0.42; return 'M' + (-b) + ',' + (-a) + 'h' + (2 * b) + 'v' + (a - b) + 'h' + (a - b) + 'v' + (2 * b) + 'h' + (-(a - b)) + 'v' + (a - b) + 'h' + (-2 * b) + 'v' + (-(a - b)) + 'h' + (-(a - b)) + 'v' + (-2 * b) + 'h' + (a - b) + 'z'; },
    star: r => { let d = ''; for (let i = 0; i < 10; i++) { const rr = i % 2 ? r * 0.6 : r * 1.45, a = -Math.PI / 2 + i * Math.PI / 5; d += (i ? 'L' : 'M') + (rr * Math.cos(a)).toFixed(2) + ',' + (rr * Math.sin(a)).toFixed(2); } return d + 'z'; }
  };

  const R = {};

  /* ---------- scatter 散布圖 ---------- */
  R.scatter = function (box, spec) {
    const sv = svgIn(box, spec), W = sv.__W, Hh = sv.__H, P = { l: 54, r: 16, t: 14, b: 44 }, st = {};
    const gReg = S('g', null, sv), gAx = S('g', null, sv), gCir = S('g', null, sv), gLn = S('g', null, sv), gPt = S('g', null, sv);
    const mReg = new Map(), mCir = new Map(), mLn = new Map(), mPt = new Map();
    return function (sp, an) {
      scales(st, sp.axes, P, W, Hh); axes(gAx, st, sp.axes, P, W, Hh); const sx = st.sx, sy = st.sy;
      /* 區域（決策區域、Voronoi）：格點著色 */
      const rg = sp.regions;
      if (!rg) { if (mReg.size) { gReg.textContent = ''; mReg.clear(); st.rgSig = ''; } }
      else {
        const sig = [rg.nx, rg.ny, rg.x0, rg.x1, rg.y0, rg.y1].join(); if (st.rgSig !== sig) { gReg.textContent = ''; mReg.clear(); st.rgSig = sig; }
        const cw = (sx(rg.x1) - sx(rg.x0)) / rg.nx, ch = (sy(rg.y0) - sy(rg.y1)) / rg.ny;
        for (let i = 0; i < rg.z.length; i++) {
          let c = mReg.get(i); if (!c) { c = S('rect', { x: sx(rg.x0) + (i % rg.nx) * cw, y: sy(rg.y1) + Math.floor(i / rg.nx) * ch, width: cw + 0.6, height: ch + 0.6 }, gReg); mReg.set(i, c); }
          const cl = 'lv-reg' + kc(rg.z[i]); if (c.getAttribute('class') !== cl) c.setAttribute('class', cl);
        }
      }
      join(gCir, mCir, sp.circles, () => S('ellipse'), (el, c, a) => { setCls(el, 'lv-circ', c); tw(el, { cx: sx(c.x), cy: sy(c.y), rx: Math.abs(sx(c.x + c.r) - sx(c.x)), ry: Math.abs(sy(c.y + (c.ry == null ? c.r : c.ry)) - sy(c.y)) }, a); }, an);
      join(gLn, mLn, sp.lines, () => { const g = S('g'); g.__l = S('line', null, g); g.__t = S('text', { class: 'lv-lnl', 'text-anchor': 'middle' }, g); return g; }, (g, l, a) => {
        setCls(g, 'lv-ln' + (l.dash ? ' dash' : '') + (l.w ? ' w' + l.w : ''), l);
        const x1 = sx(l.x1), y1 = sy(l.y1), x2 = sx(l.x2), y2 = sy(l.y2);
        tw(g.__l, { x1, y1, x2, y2 }, a); g.__t.textContent = txt(l.label); tw(g.__t, { x: (x1 + x2) / 2 + (Math.abs(x2 - x1) < Math.abs(y2 - y1) ? 20 : 0), y: (y1 + y2) / 2 - (Math.abs(x2 - x1) < Math.abs(y2 - y1) ? -4 : 8) }, a);
      }, an);
      join(gPt, mPt, sp.points, () => { const g = S('g'); g.__ring = S('circle', { class: 'ring', r: 0 }, g); g.__in = S('g', { class: 'in' }, g); g.__s = S('path', null, g.__in); g.__t = S('text', { class: 'lv-ptl' }, g); return g; }, (g, p, a) => {
        setCls(g, 'lv-pt' + (p.ring ? ' has-ring' : '') + (p.hollow ? ' hollow' : ''), p);
        const r = p.r || 6, sh = p.shape || 'circle', key = sh + r; if (g.__k !== key) { g.__k = key; g.__s.setAttribute('d', (SHAPES[sh] || SHAPES.circle)(r)); g.__ring.setAttribute('r', r + 7); }
        g.__t.textContent = txt(p.label); g.__t.setAttribute('x', r + 4); g.__t.setAttribute('y', 4);
        tw(g, { tx: sx(p.x), ty: sy(p.y) }, a);
      }, an);
      legend(box, sp.legend);
    };
  };

  /* ---------- line 折線圖 ---------- */
  R.line = function (box, spec) {
    const sv = svgIn(box, spec), W = sv.__W, Hh = sv.__H, P = { l: 58, r: 18, t: 14, b: 42 }, st = {};
    const gAx = S('g', null, sv), gS = S('g', null, sv), gM = S('g', { class: 'lv-marker' }, sv), mS = new Map();
    const mLine = S('line', null, gM), mDot = S('circle', { r: 5 }, gM), mTxt = S('text', { 'text-anchor': 'middle' }, gM);
    return function (sp, an) {
      let ax = sp.axes || {}; const all = [].concat.apply([], (sp.series || []).map(s => s.pts));
      const xs = all.map(p => p[0]), ys = all.map(p => p[1]);
      const ax2 = { x: Object.assign({ min: xs.length ? Math.min.apply(null, xs) : 0, max: xs.length ? Math.max.apply(null, xs) : 1 }, ax.x), y: Object.assign({ min: ys.length ? Math.min(0, Math.min.apply(null, ys)) : 0, max: ys.length ? Math.max.apply(null, ys) * 1.08 || 1 : 1 }, ax.y) };
      if (ax2.x.max === ax2.x.min) ax2.x.max = ax2.x.min + 1; if (ax2.y.max === ax2.y.min) ax2.y.max = ax2.y.min + 1;
      scales(st, ax2, P, W, Hh); axes(gAx, st, ax2, P, W, Hh); const sx = st.sx, sy = st.sy;
      join(gS, mS, sp.series, () => { const g = S('g'); g.__p = S('polyline', { fill: 'none' }, g); g.__d = S('g', null, g); g.__e = S('circle', { r: 4.5, class: 'end' }, g); return g; }, (g, s, a, i, isNew) => {
        setCls(g, 'lv-ser' + (s.dash ? ' dash' : ''), s);
        g.__p.setAttribute('points', s.pts.map(p => sx(p[0]).toFixed(1) + ',' + sy(p[1]).toFixed(1)).join(' '));
        g.__d.textContent = ''; if (s.dots) s.pts.forEach(p => S('circle', { cx: sx(p[0]), cy: sy(p[1]), r: 2.6 }, g.__d));
        const last = s.pts[s.pts.length - 1]; g.__e.style.display = last ? '' : 'none'; if (last) tw(g.__e, { cx: sx(last[0]), cy: sy(last[1]) }, a);
      }, an);
      const m = sp.marker; gM.style.display = m ? '' : 'none';
      if (m) { const x = sx(m.x); tw(mLine, { x1: x, x2: x, y1: P.t, y2: Hh - P.b }, an); mDot.style.display = m.y == null ? 'none' : ''; if (m.y != null) tw(mDot, { cx: x, cy: sy(m.y) }, an); mTxt.textContent = txt(m.label); tw(mTxt, { x: Math.max(P.l + 30, Math.min(W - P.r - 30, x)), y: P.t + 10 }, an); }
      legend(box, sp.legend || ((sp.series || []).length > 1 ? sp.series.map(s => ({ cls: s.cls, label: s.label })) : null));
    };
  };

  /* ---------- surface 損失曲面（等高色塊）＋軌跡 ---------- */
  R.surface = function (box, spec) {
    const sv = svgIn(box, spec), W = sv.__W, Hh = sv.__H, P = { l: 54, r: 16, t: 14, b: 44 }, st = {};
    const gC = S('g', null, sv), gAx = S('g', null, sv), path = S('polyline', { class: 'lv-path', fill: 'none' }, sv), gT = S('g', { class: 'lv-target' }, sv), gP = S('g', { class: 'lv-pt k-hl has-ring' }, sv);
    S('path', { d: SHAPES.star(6) }, gT); S('circle', { class: 'ring', r: 13 }, gP); S('path', { d: SHAPES.circle(6) }, gP); const lab = S('text', { class: 'lv-ptl', x: 11, y: 4 }, gP);
    return function (sp, an) {
      const g = sp.grid, ax = { x: Object.assign({ min: g.x0, max: g.x1 }, sp.x), y: Object.assign({ min: g.y0, max: g.y1 }, sp.y) };
      scales(st, ax, P, W, Hh); const sx = st.sx, sy = st.sy;
      const sig = [g.nx, g.ny, g.x0, g.x1, g.y0, g.y1, g.z[0], g.z[g.z.length - 1]].join();
      if (st.gSig !== sig) {
        st.gSig = sig; gC.textContent = ''; const zs = g.z.slice().sort((a, b) => a - b), L = sp.levels || 9;
        const q = k => zs[Math.min(zs.length - 1, Math.floor(k / L * zs.length))];
        const cw = (sx(g.x1) - sx(g.x0)) / g.nx, ch = (sy(g.y0) - sy(g.y1)) / g.ny;
        g.z.forEach((z, i) => { let lv = 0; while (lv < L - 1 && z >= q(lv + 1)) lv++; S('rect', { x: sx(g.x0) + (i % g.nx) * cw, y: sy(g.y1) + Math.floor(i / g.nx) * ch, width: cw + 0.6, height: ch + 0.6, class: 'lv-lvl', 'fill-opacity': (0.06 + 0.62 * lv / (L - 1)).toFixed(3) }, gC); });
      }
      axes(gAx, st, ax, P, W, Hh);
      const pts = sp.path || []; path.setAttribute('points', pts.map(p => sx(p.x).toFixed(1) + ',' + sy(p.y).toFixed(1)).join(' '));
      const cur = pts[pts.length - 1]; gP.style.display = cur ? '' : 'none'; if (cur) { tw(gP, { tx: sx(cur.x), ty: sy(cur.y) }, an); lab.textContent = txt(sp.label); }
      gT.style.display = sp.target ? '' : 'none'; if (sp.target) tw(gT, { tx: sx(sp.target.x), ty: sy(sp.target.y) }, an);
      legend(box, sp.legend);
    };
  };

  /* ---------- matrix 矩陣 ---------- */
  R.matrix = function (box, spec) {
    let sv = null, sig = '', cells = [], win = null, hlSet = new Set();
    return function (sp, an) {
      const v = sp.values, nr = v.length, nc = nr ? v[0].length : 0, rl = sp.rowLabels, cl = sp.colLabels;
      const sz = SIZE[sp.slot] || SIZE.main, lw = rl ? (sp.labelW || 64) : 6, lh = cl ? 26 : 6;
      const cs = Math.min(sp.cell || 58, (sz[0] - lw - 8) / nc, 64), W = lw + cs * nc + 8, Hh = lh + cs * nr + 8;
      const s2 = [nr, nc, !!rl, !!cl, cs].join();
      if (s2 !== sig) {
        sig = s2; box.querySelectorAll(':scope > svg').forEach(e => e.remove()); sv = S('svg', { viewBox: '0 0 ' + W + ' ' + Hh, class: 'lv-svg lv-mx', role: 'img', style: 'max-width:' + Math.round(W * 1.15) + 'px' }); box.insertBefore(sv, box.querySelector(':scope > .lv-legend'));
        cells = [];
        if (cl) cl.forEach((t, c) => S('text', { x: lw + cs * (c + 0.5), y: 18, 'text-anchor': 'middle', class: 'lv-mxl', text: t }, sv));
        if (rl) rl.forEach((t, r) => S('text', { x: lw - 8, y: lh + cs * (r + 0.5) + 4, 'text-anchor': 'end', class: 'lv-mxl', text: t }, sv));
        for (let r = 0; r < nr; r++) { cells.push([]); for (let c = 0; c < nc; c++) { const g = S('g', { transform: 'translate(' + (lw + cs * c) + ',' + (lh + cs * r) + ')' }, sv); g.__bg = S('rect', { width: cs - 2, height: cs - 2, x: 1, y: 1, rx: 4, class: 'bg' }, g); g.__h = S('rect', { width: cs - 2, height: cs - 2, x: 1, y: 1, rx: 4, class: 'heat' }, g); g.__t = S('text', { x: cs / 2, y: cs / 2 + 5, 'text-anchor': 'middle', 'font-size': Math.max(11, Math.min(15, cs * 0.3)) }, g); cells[r].push(g); } }
        win = S('rect', { class: 'lv-win', rx: 6 }, sv);
      }
      const flat = [].concat.apply([], v).filter(x => typeof x === 'number'); const mx = Math.max.apply(null, flat.map(Math.abs).concat([1e-9])), mn = Math.min.apply(null, flat.concat([0])), mxp = Math.max.apply(null, flat.concat([1e-9]));
      hlSet = new Set((sp.hl || []).map(p => p[0] + ',' + p[1])); const dimSet = new Set((sp.dimCells || []).map(p => p[0] + ',' + p[1]));
      for (let r = 0; r < nr; r++) for (let c = 0; c < nc; c++) {
        const g = cells[r][c], x = v[r][c], t = x == null ? '' : typeof x === 'number' ? LAB.f(x, sp.digits == null ? 2 : sp.digits) : String(x);
        if (g.__t.textContent !== t) { g.__t.textContent = t; if (g.__seen) flash(g, an); } g.__seen = true;
        let op = 0, k = 'c0';
        if (sp.heat && typeof x === 'number') { if (sp.heat === 'div') { op = Math.abs(x) / mx * 0.7; k = x < 0 ? 'c4' : 'c0'; } else op = (x - mn) / ((mxp - mn) || 1) * 0.72; }
        g.__h.style.opacity = op.toFixed(3);
        const cl2 = 'lv-cell k-' + k + (hlSet.has(r + ',' + c) ? ' is-hl' : '') + (dimSet.has(r + ',' + c) || x == null ? ' is-dim' : ''); if (g.getAttribute('class') !== cl2) g.setAttribute('class', cl2);
      }
      const w = sp.window; win.style.display = w ? '' : 'none';
      if (w) tw(win, { x: lw + cs * w.c, y: lh + cs * w.r, width: cs * (w.w || 1), height: cs * (w.h || 1) }, an);
      legend(box, sp.legend);
    };
  };

  /* ---------- tree 樹（決策樹、FP-tree；mode:'dendro' 為樹狀圖） ---------- */
  R.tree = function (box, spec) {
    const sv = svgIn(box, spec), W = sv.__W, Hh = sv.__H, gE = S('g', null, sv), gN = S('g', null, sv), mE = new Map(), mN = new Map();
    const gAx = S('g', null, sv);
    return function (sp, an) {
      const nodes = sp.nodes || [], by = {}, kids = {}; nodes.forEach(n => { by[n.id] = n; kids[n.id] = []; });
      const roots = []; nodes.forEach(n => { if (n.parent != null && by[n.parent]) kids[n.parent].push(n); else roots.push(n); });
      const pos = {}, leaves = []; let maxD = 0;
      (function walk(list, d) { list.forEach(n => { maxD = Math.max(maxD, d); pos[n.id] = { d }; if (!kids[n.id].length) leaves.push(n); walk(kids[n.id], d + 1); }); })(roots, 0);
      const dendro = sp.mode === 'dendro', P = dendro ? { l: 46, r: 16, t: 16, b: 34 } : { l: 10, r: 10, t: 26, b: 26 };
      leaves.forEach((n, i) => { pos[n.id].x = P.l + (W - P.l - P.r) * (i + 0.5) / leaves.length; });
      (function up(list) { list.forEach(n => { up(kids[n.id]); if (kids[n.id].length) pos[n.id].x = kids[n.id].reduce((s, k) => s + pos[k.id].x, 0) / kids[n.id].length; }); })(roots);
      const hMax = dendro ? (sp.hMax || Math.max.apply(null, nodes.map(n => n.h || 0).concat([1e-9])) * 1.08) : 0;
      nodes.forEach(n => { pos[n.id].y = dendro ? Hh - P.b - (n.h || 0) / hMax * (Hh - P.t - P.b) : P.t + (maxD ? (Hh - P.t - P.b) * pos[n.id].d / maxD : (Hh - P.t - P.b) / 2); });
      const nw = n => Math.max(54, Math.min(170, Math.max(String(n.label || '').length, String(n.sub || '').length * 0.86) * 14 + 18));
      const edges = [];
      nodes.forEach(n => {
        if (dendro) { if (kids[n.id].length) { const xs = kids[n.id].map(k => pos[k.id].x); edges.push({ id: 'h' + n.id, x1: Math.min.apply(null, xs), x2: Math.max.apply(null, xs), y1: pos[n.id].y, y2: pos[n.id].y, o: n }); kids[n.id].forEach(k => edges.push({ id: 'v' + k.id, x1: pos[k.id].x, x2: pos[k.id].x, y1: pos[k.id].y, y2: pos[n.id].y, o: n })); } }
        else if (n.parent != null && by[n.parent]) edges.push({ id: 'e' + n.id, x1: pos[n.parent].x, y1: pos[n.parent].y + 19, x2: pos[n.id].x, y2: pos[n.id].y - 19, o: n, label: n.edge });
      });
      join(gE, mE, edges, () => { const g = S('g'); g.__l = S('line', null, g); g.__t = S('text', { class: 'lv-lnl', 'text-anchor': 'middle' }, g); return g; }, (g, e, a) => {
        setCls(g, 'lv-edge', { cls: dendro ? e.o.cls : null, hl: e.o.active, dim: e.o.dim });
        tw(g.__l, { x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2 }, a); g.__t.textContent = txt(e.label); tw(g.__t, { x: (e.x1 + e.x2) / 2 + (e.x2 < e.x1 ? -14 : 14), y: (e.y1 + e.y2) / 2 + 4 }, a);
      }, an);
      join(gN, mN, nodes, () => { const g = S('g'); g.__r = S('rect', { rx: 8 }, g); g.__c = S('circle', { r: 4 }, g); g.__t = S('text', { 'text-anchor': 'middle', class: 't1' }, g); g.__s = S('text', { 'text-anchor': 'middle', class: 't2' }, g); return g; }, (g, n, a) => {
        setCls(g, 'lv-node' + (dendro ? ' dn' : ''), { cls: n.cls, hl: n.active, dim: n.dim, state: n.state });
        const leaf = !kids[n.id].length;
        if (dendro) { g.__r.style.display = 'none'; g.__c.style.display = leaf ? 'none' : ''; g.__t.textContent = leaf ? txt(n.label) : ''; g.__t.setAttribute('y', 18); g.__s.textContent = leaf ? '' : txt(n.sub); g.__s.setAttribute('y', -7); g.__s.setAttribute('x', 22); }
        else { const w = nw(n), two = n.sub != null && n.sub !== ''; g.__c.style.display = 'none'; g.__r.setAttribute('x', -w / 2); g.__r.setAttribute('width', w); g.__r.setAttribute('y', -19); g.__r.setAttribute('height', 38); g.__t.textContent = txt(n.label); g.__t.setAttribute('y', two ? -2 : 5); g.__s.textContent = txt(n.sub); g.__s.setAttribute('y', 13); }
        tw(g, { tx: pos[n.id].x, ty: pos[n.id].y }, a);
      }, an);
      if (dendro) { const sg = 'd' + hMax; if (gAx.__sig !== sg) { gAx.__sig = sg; gAx.textContent = ''; ticks(0, hMax, 4).forEach(v => { const y = Hh - P.b - v / hMax * (Hh - P.t - P.b); S('line', { x1: P.l, x2: W - P.r, y1: y, y2: y, class: 'lv-grid' }, gAx); S('text', { x: P.l - 6, y: y + 4, 'text-anchor': 'end', class: 'lv-tick', text: tickTxt(v) }, gAx); }); } const cut = sp.cut; let cl = gAx.__cut; if (cut != null) { if (!cl) cl = gAx.__cut = S('line', { class: 'lv-cut', x1: P.l, x2: W - P.r }, sv); const y = Hh - P.b - cut / hMax * (Hh - P.t - P.b); tw(cl, { y1: y, y2: y }, an); cl.style.display = ''; } else if (cl) cl.style.display = 'none'; }
      legend(box, sp.legend);
    };
  };

  /* ---------- network 網路圖（神經網路、方塊流程） ---------- */
  R.network = function (box, spec) {
    const sv = svgIn(box, spec), W = sv.__W, Hh = sv.__H, gL = S('g', null, sv), gE = S('g', null, sv), gN = S('g', null, sv), mE = new Map(), mN = new Map();
    return function (sp, an) {
      const layers = sp.layers || [], pos = {}, rad = sp.r || 25, hwOf = n => n.shape === 'box' ? (n.w || Math.max(90, String(n.label || '').length * 15 + 22)) / 2 : rad;
      const edgeW = l => l && l.length ? Math.max.apply(null, l.map(hwOf)) + 12 : 70, P = { l: Math.max(70, edgeW(layers[0])), r: Math.max(70, edgeW(layers[layers.length - 1])), t: sp.layerLabels ? 44 : 26, b: 26 };
      layers.forEach((ly, i) => { const x = layers.length > 1 ? P.l + (W - P.l - P.r) * i / (layers.length - 1) : W / 2; ly.forEach((n, j) => { pos[n.id] = { x, y: P.t + (Hh - P.t - P.b) * (j + 0.5) / ly.length, n }; }); });
      const sg = JSON.stringify(sp.layerLabels || []); if (gL.__sig !== sg) { gL.__sig = sg; gL.textContent = ''; (sp.layerLabels || []).forEach((t, i) => S('text', { x: layers.length > 1 ? P.l + (W - P.l - P.r) * i / (layers.length - 1) : W / 2, y: 18, 'text-anchor': 'middle', class: 'lv-axl', text: t }, gL)); }
      const wmax = Math.max.apply(null, (sp.edges || []).map(e => Math.abs(e.w || 0)).concat([1e-9]));
      join(gE, mE, (sp.edges || []).map(e => Object.assign({ id: e.from + '>' + e.to }, e)), () => { const g = S('g'); g.__l = S('line', null, g); g.__f = S('line', { class: 'flow' }, g); g.__bw = S('rect', { class: 'lb', rx: 4 }, g); g.__w = S('text', { class: 'wl', 'text-anchor': 'middle' }, g); g.__bg = S('rect', { class: 'lb gb', rx: 4 }, g); g.__g = S('text', { class: 'gl', 'text-anchor': 'middle' }, g); return g; }, (g, e, a, i) => {
        const p = pos[e.from], q = pos[e.to]; if (!p || !q) return;
        setCls(g, 'lv-wire' + (e.back ? ' back' : '') + (e.w != null && e.w < 0 ? ' neg' : ''), { cls: e.cls, hl: e.hl, dim: e.dim, active: e.active });
        const dx = q.x - p.x, dy = q.y - p.y, len = Math.sqrt(dx * dx + dy * dy) || 1, ra = hwOf(p.n), rb = hwOf(q.n), x1 = p.x + dx / len * ra, y1 = p.y + dy / len * (p.n.shape === 'box' ? 21 : ra), x2 = q.x - dx / len * rb, y2 = q.y - dy / len * (q.n.shape === 'box' ? 21 : rb);
        const c = { x1, y1, x2, y2 }; tw(g.__l, c, a); tw(g.__f, c, a); g.__l.style.strokeWidth = (e.w == null ? 1.6 : 1.2 + 3.6 * Math.abs(e.w) / wmax).toFixed(2);
        const place = (t, bg, s, f) => { t.textContent = s; const show = s !== ''; t.style.display = bg.style.display = show ? '' : 'none'; if (!show) return; const x = x1 + (x2 - x1) * f, y = y1 + (y2 - y1) * f, w = s.length * 7.4 + 10; tw(t, { x, y: y + 4.5 }, a); tw(bg, { x: x - w / 2, y: y - 9, width: w, height: 18 }, a); };
        place(g.__w, g.__bw, e.label != null ? txt(e.label) : e.w != null ? LAB.f(e.w, sp.digits == null ? 2 : sp.digits) : '', e.at || 0.3);
        place(g.__g, g.__bg, e.grad == null ? '' : (typeof e.grad === 'number' ? '∂ ' + LAB.f(e.grad, 3) : txt(e.grad)), e.gat || 0.68);
      }, an);
      const all = [].concat.apply([], layers);
      join(gN, mN, all, () => { const g = S('g'); g.__ring = S('circle', { class: 'ring', r: rad + 7 }, g); g.__c = S('circle', { r: rad }, g); g.__r = S('rect', { rx: 9 }, g); g.__val = S('text', { 'text-anchor': 'middle', class: 'nv' }, g); g.__t = S('text', { 'text-anchor': 'middle', class: 'nl' }, g); g.__s = S('text', { 'text-anchor': 'middle', class: 'ns' }, g); return g; }, (g, n, a) => {
        setCls(g, 'lv-neuron' + (n.ring ? ' has-ring' : ''), { cls: n.cls, hl: n.hl, dim: n.dim });
        const bx = n.shape === 'box'; g.__c.style.display = bx ? 'none' : ''; g.__r.style.display = bx ? '' : 'none';
        if (bx) { const w = n.w || Math.max(90, String(n.label || '').length * 15 + 22); g.__r.setAttribute('x', -w / 2); g.__r.setAttribute('width', w); g.__r.setAttribute('y', -21); g.__r.setAttribute('height', 42); g.__t.setAttribute('y', n.value == null ? 5 : -3); g.__val.setAttribute('y', 14); g.__val.setAttribute('class', 'nv small'); }
        else { g.__t.setAttribute('y', -rad - 8); g.__val.setAttribute('y', 5); g.__val.setAttribute('class', 'nv'); }
        g.__t.textContent = txt(n.label); g.__s.textContent = txt(n.sub); g.__s.setAttribute('y', (bx ? 21 : rad) + 16);
        const val = n.value == null ? '' : typeof n.value === 'number' ? LAB.f(n.value, sp.digits == null ? 2 : sp.digits) : String(n.value);
        if (g.__val.textContent !== val) { g.__val.textContent = val; if (g.__seen) flash(g, a); } g.__seen = true;
        tw(g, { tx: pos[n.id].x, ty: pos[n.id].y }, a);
      }, an);
      legend(box, sp.legend);
    };
  };

  /* ---------- bars 橫條圖 ---------- */
  R.bars = function (box, spec) {
    const wrap = H('div', 'lv-bars', null, box), m = new Map();
    return function (sp, an) {
      const mx = sp.max || Math.max.apply(null, (sp.items || []).map(i => Math.abs(i.value)).concat([1e-9]));
      flip(() => Array.from(wrap.children), () => {
        join(wrap, m, sp.items, () => { const r = H('div', 'lv-bar'); r.__l = H('span', 'bl', null, r); const t = H('span', 'bt', null, r); r.__b = H('i', null, null, t); r.__v = H('span', 'bv', null, r); r.__v.__d = sp.digits == null ? 2 : sp.digits; return r; }, (r, it, a, i, isNew) => {
          setCls(r, 'lv-bar', it); r.__l.textContent = txt(it.label); r.__b.style.width = Math.max(0, Math.min(100, Math.abs(it.value) / mx * 100)).toFixed(2) + '%';
          r.__v.__suf = it.note ? '　' + it.note : (sp.unit || ''); tw(r.__v, { '#': it.value }, a && !isNew);
        }, an);
        (sp.items || []).forEach(it => wrap.appendChild(m.get(String(it.id))));
      }, an);
      legend(box, sp.legend);
    };
  };

  /* ---------- table 表格 ---------- */
  R.table = function (box, spec) {
    const sc = H('div', 'lv-tscroll' + (spec.slot ? ' s-' + spec.slot : ''), null, box), tb = H('table', 'lv-table', null, sc), th = H('thead', null, null, tb), bd = H('tbody', null, null, tb), m = new Map(); let hsig = '';
    return function (sp, an) {
      const cols = sp.cols || [], hs = JSON.stringify(cols) + '|' + (sp.hlCol || '');
      if (hs !== hsig) { hsig = hs; th.textContent = ''; const tr = H('tr', null, null, th); cols.forEach(c => { const e = H('th', (c.num ? 'num' : '') + (sp.hlCol === c.key ? ' hc' : ''), c.label, tr); if (c.sub) H('small', null, c.sub, e); }); }
      const hc = new Set((sp.hlCells || []).map(p => p[0] + '|' + p[1]));
      flip(() => Array.from(bd.children), () => {
        join(bd, m, sp.rows, () => { const tr = H('tr'); tr.__c = []; return tr; }, (tr, r, a, i, isNew) => {
          setCls(tr, '', { cls: r.cls, hl: r.hl, dim: r.dim, state: r.state });
          cols.forEach((c, j) => {
            let td = tr.__c[j]; if (!td) { td = tr.__c[j] = H('td', null, null, tr); }
            let v = r.cells[j], o = null; if (v && typeof v === 'object') { o = v; v = o.v; }
            const t = v == null ? '' : typeof v === 'number' ? LAB.f(v, c.digits == null ? (c.num ? 2 : 0) : c.digits) : String(v);
            if (td.textContent !== t) { td.textContent = t; if (!isNew) flash(td, a); }
            const cl = (c.num ? 'num' : '') + (sp.hlCol === c.key ? ' hc' : '') + (hc.has(r.id + '|' + c.key) || (o && o.hl) ? ' is-hl' : '') + (o && o.cls ? ' k-' + o.cls + ' tint' : '') + (o && o.tag ? ' tagc' : ''); if (td.className !== cl) td.className = cl;
          });
          while (tr.__c.length > cols.length) tr.__c.pop().remove();
        }, an);
        (sp.rows || []).forEach(r => bd.appendChild(m.get(String(r.id))));
      }, an);
      const hl = bd.querySelector('tr.is-hl'); if (hl) { const top = hl.offsetTop - th.offsetHeight, bot = top + hl.offsetHeight + th.offsetHeight; if (top < sc.scrollTop) sc.scrollTop = Math.max(0, top - 6); else if (bot > sc.scrollTop + sc.clientHeight) sc.scrollTop = bot - sc.clientHeight + 6; }
      let cap = box.querySelector(':scope > .lv-cap'); if (sp.caption) { if (!cap) cap = H('div', 'lv-cap', null, box); cap.textContent = sp.caption; } else if (cap) cap.remove();
      legend(box, sp.legend);
    };
  };

  /* ---------- tokens 詞塊 ---------- */
  R.tokens = function (box, spec) {
    const wrap = H('div', 'lv-tokens', null, box), m = new Map(), gm = new Map();
    return function (sp, an) {
      const groups = sp.groups || [{ id: '_', items: sp.items || [] }];
      flip(() => Array.from(wrap.querySelectorAll('.lv-tok')), () => {
        join(wrap, gm, groups, () => { const g = H('div', 'lv-tokrow'); g.__l = H('span', 'gl', null, g); g.__b = H('div', 'gb', null, g); return g; }, (g, gr) => { g.__l.textContent = txt(gr.label); g.__l.style.display = gr.label ? '' : 'none'; }, an);
        groups.forEach((gr, i) => wrap.appendChild(gm.get(String(gr.id == null ? i : gr.id))));
        const all = []; groups.forEach((gr, i) => gr.items.forEach(it => all.push(Object.assign({ __g: String(gr.id == null ? i : gr.id) }, it))));
        const host = document.createDocumentFragment();
        join(host, m, all, () => { const t = H('span', 'lv-tok'); t.__t = H('b', null, null, t); t.__s = H('small', null, null, t); return t; }, (t, it) => {
          setCls(t, 'lv-tok', it); t.__t.textContent = it.text === ' ' ? '␣' : txt(it.text);
          const s = it.sub != null ? txt(it.sub) : it.score != null ? LAB.f(it.score, sp.digits == null ? 2 : sp.digits) : ''; t.__s.textContent = s; t.__s.style.display = s === '' ? 'none' : '';
        }, an);
        all.forEach(it => gm.get(it.__g).__b.appendChild(m.get(String(it.id))));
      }, an);
      legend(box, sp.legend);
    };
  };

  /* ---------- sets 項目集（候選、保留、剔除） ---------- */
  R.sets = function (box, spec) {
    const wrap = H('div', 'lv-sets', null, box), m = new Map(), gm = new Map();
    return function (sp, an) {
      const groups = sp.groups || [];
      flip(() => Array.from(wrap.querySelectorAll('.lv-set')), () => {
        join(wrap, gm, groups, () => { const g = H('div', 'lv-setcol'); g.__h = H('div', 'sh', null, g); g.__n = H('div', 'sn', null, g); g.__b = H('div', 'sb', null, g); return g; }, (g, gr) => { setCls(g, 'lv-setcol', { hl: gr.hl, dim: gr.dim }); g.__h.textContent = txt(gr.title); g.__n.textContent = txt(gr.note); g.__n.style.display = gr.note ? '' : 'none'; }, an);
        groups.forEach((gr, i) => wrap.appendChild(gm.get(String(gr.id == null ? i : gr.id))));
        const all = []; groups.forEach((gr, i) => (gr.items || []).forEach(it => all.push(Object.assign({ __g: String(gr.id == null ? i : gr.id) }, it))));
        const host = document.createDocumentFragment();
        join(host, m, all, () => { const t = H('div', 'lv-set'); t.__t = H('span', 'st', null, t); t.__v = H('span', 'sv', null, t); return t; }, (t, it) => {
          setCls(t, 'lv-set', it); t.__t.textContent = txt(it.text); const v = it.value == null ? '' : typeof it.value === 'number' ? LAB.f(it.value, sp.digits == null ? 2 : sp.digits) : String(it.value);
          if (t.__v.textContent !== v) { t.__v.textContent = v; } t.__v.style.display = v === '' ? 'none' : '';
        }, an);
        all.forEach(it => gm.get(it.__g).__b.appendChild(m.get(String(it.id))));
      }, an);
      legend(box, sp.legend);
    };
  };

  /* ---------- note 重點框 ---------- */
  R.note = function (box) {
    const n = H('div', 'lv-note', null, box);
    return function (sp, an) { const c = 'lv-note t-' + (sp.tone || 'info'); if (n.className !== c) n.className = c; if (n.textContent !== sp.text) { n.textContent = sp.text; flash(n, an); } };
  };

  /* ---------- 對外介面 ---------- */
  LAB.viz = {
    types: Object.keys(R), DUR,
    mount: function (container) {
      let type = null, upd = null, box = null, ttl = null;
      return {
        update: function (spec, animate) {
          if (!spec) { container.textContent = ''; type = null; return; }
          if (!R[spec.type]) throw new Error('未知的圖形元件：' + spec.type);
          const an = !!animate && !reduce();
          if (spec.type !== type) { container.textContent = ''; type = spec.type; ttl = H('div', 'lv-title', null, container); box = H('div', 'lv lvb-' + type, null, container); upd = R[type](box, spec); }
          ttl.textContent = spec.title || ''; ttl.style.display = spec.title ? '' : 'none';
          upd(spec, an);
        },
        clear: function () { container.textContent = ''; type = null; }
      };
    }
  };
})(window);
