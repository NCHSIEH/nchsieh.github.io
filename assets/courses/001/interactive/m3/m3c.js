/* M3 加強版（2026-11）：600 位社區長者、9 個健康欄位——群與群會重疊的「真實感」資料 */
(function () {
  'use strict';
  const { h, $, S, fmt, seg, C } = U;

  /* ---------- 教學用模擬資料：600 位社區長者（四種潛在型態彼此重疊；數值為教學設計） ---------- */
  const R = U.rng(4040), N = 600;
  const TYPES = [
    // 名稱, 比例, 年齡, BMI, 步速, 握力, 門診/月, 用藥, ADL, GDS, 社交/週
    ['健康活躍', .40, [72, 23.5, 1.10, 28, 0.8, 2, 98, 2.5, 4.0]],
    ['慢病多藥', .25, [76, 27.5, 0.90, 24, 3.2, 9, 92, 4.0, 2.5]],
    ['衰弱失能', .20, [84, 20.5, 0.55, 15, 2.0, 7, 62, 6.0, 1.2]],
    ['孤立憂鬱', .15, [75, 22.5, 0.95, 23, 1.2, 4, 90, 10.5, 0.4]]];
  const SD = [6, 3, .17, 5, 1.0, 2.2, 9, 2.4, 1.2];
  const FEATS = [['年齡', '歲', '身體'], ['BMI', '', '身體'], ['步行速度', 'm/s', '身體'], ['握力', 'kg', '身體'], ['每月門診', '次', '醫療使用'], ['用藥數', '種', '醫療使用'], ['ADL', '分', '身體'], ['憂鬱量表 GDS', '分', '心理社會'], ['社交活動', '次/週', '心理社會']];
  const P = []; const TRUE = [];
  for (let i = 0; i < N; i++) {
    let u = R(), t = 0; while (u > TYPES[t][1] && t < 3) { u -= TYPES[t][1]; t++; }
    const m = TYPES[t][2];
    const v = m.map((mu, j) => mu + SD[j] * U.randn(R));
    v[0] = Math.round(Math.min(98, Math.max(65, v[0]))); v[1] = +Math.max(15, v[1]).toFixed(1); v[2] = +Math.min(1.6, Math.max(.2, v[2])).toFixed(2);
    v[3] = Math.round(Math.max(6, v[3])); v[4] = Math.max(0, Math.round(v[4])); v[5] = Math.max(0, Math.round(v[5]));
    v[6] = Math.round(Math.min(100, Math.max(20, v[6]))); v[7] = Math.round(Math.min(15, Math.max(0, v[7]))); v[8] = Math.max(0, Math.round(v[8]));
    P.push(v); TRUE.push(t);
  }
  const st = ML.standardize(P), Z = st.Z;
  const PAL = [C.accent, C.amber, C.blue, '#7b3fa8', C.bad, '#2f7d4f'];
  const kpi = (k, v, cls) => h('div', null, h('div', { class: 'k' }, k), h('div', { class: 'v' + (cls ? ' ' + cls : '') }, v));
  /* PCA（9 維） */
  const E = ML.eigSym(ML.covMatrix(Z)); const totVar = S.sum(E.values);
  const proj = Z.map(z => [0, 1].map(k => z.reduce((s, v, j) => s + v * E.vectors[k][j], 0)));
  // 讓 PC1 的方向＝「身體功能越差越大」，PC2＝「心理社會越差越大」，方便解讀
  const sgn = [E.vectors[0][2] > 0 ? -1 : 1, E.vectors[1][7] < 0 ? -1 : 1];
  const PJ = proj.map(p => [p[0] * sgn[0], p[1] * sgn[1]]);
  const LOAD = [0, 1].map(k => E.vectors[k].map(v => v * sgn[k]));

  /* ====================================================================
     ① 第 4 節：真實資料的手肘沒那麼明顯
     ==================================================================== */
  (function elbow() {
    const box = $('#w-elbow'); if (!box) return;
    const res = []; let k = 1, timer = null;
    const out = h('div');
    function draw() {
      out.innerHTML = '';
      const go = h('button', { class: 'btn primary' }, timer ? `計算 K = ${k} 中…` : res.length ? '↻ 重新計算' : '▶ 從 K = 2 算到 K = 8'); go.disabled = !!timer;
      go.onclick = () => { res.length = 0; k = 1; timer = setInterval(() => { k++; const km = ML.kmeans(Z, k, { seed: 9, runs: 4 }); res.push({ k, inertia: km.inertia, sil: S.mean(ML.silhouette(Z, km.lab)) }); if (k >= 8) { clearInterval(timer); timer = null; } draw(); }, 350); draw(); };
      out.append(h('div', { class: 'row', style: { gap: '10px', marginBottom: '10px' } }, go, h('span', { class: 'tag gray' }, '600 位長者 × 9 個欄位（已 Z-Score）')));
      const g = h('div', { class: 'grid2', style: { gap: '18px' } });
      const a = h('div'), b = h('div');
      a.append(h('div', { style: { fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' } }, '手肘法：Inertia（群內距離平方和）'));
      b.append(h('div', { style: { fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' } }, '平均 Silhouette（越高越好）'));
      if (res.length) {
        U.lc(a, [{ pts: res.map(r => [r.k, r.inertia]), color: C.accent, w: 2.4 }], { w: 440, h: 240, xmin: 2, xmax: 8, ymin: 0, ymax: Math.max(...res.map(r => r.inertia)) * 1.1, xt: [2, 3, 4, 5, 6, 7, 8], xl: 'K', yl: 'Inertia', yfmt: t => fmt(t, 0) });
        const bestS = res.reduce((m, r) => r.sil > m.sil ? r : m, res[0]);
        U.lc(b, [{ pts: res.map(r => [r.k, r.sil]), color: C.blue, w: 2.4 }], { w: 440, h: 240, xmin: 2, xmax: 8, ymin: 0, ymax: .4, xt: [2, 3, 4, 5, 6, 7, 8], xl: 'K', yl: 'Silhouette', marks: [{ x: bestS.k, color: C.bad, label: '最高' }] });
      } else { a.append(h('div', { class: 'note' }, '按上面的按鈕開始。')); }
      g.append(a, b); out.append(g);
      if (res.length >= 7) {
        const bestS = res.reduce((m, r) => r.sil > m.sil ? r : m, res[0]);
        out.append(h('div', { class: 'note' }, h('b', null, '看懂了什麼：'), `前面練習的資料三團分得清清楚楚；真實資料的群會重疊——這裡的手肘是一條緩彎，看不出明確的折點，Silhouette 最高也只有 ${bestS.sil.toFixed(2)}（K = ${bestS.k}），遠低於教科書範例的 0.6 以上。這很正常。這時 K 的選擇要回到「每一群能不能說出是誰、能不能對應到不同的照護行動」——下面第 8 節的工作台就是在做這件事。`));
      }
    }
    box.append(out); draw();
  })();

  /* ====================================================================
     ② 第 8 節：長者健康分群工作台
     ==================================================================== */
  (function bench() {
    const box = $('#w-elder'); if (!box) return;
    let K = 4; const on = new Set(FEATS.map((_, j) => j));
    const out = h('div');
    const ACT = {
      '步行速度-': '轉介運動處方／防跌', '握力-': '肌力訓練與營養評估', 'ADL-': '居家照護需求評估', '年齡+': '',
      '用藥數+': '藥師整合用藥', '每月門診+': '個管協調、減少重複就醫', 'BMI+': '體重與代謝管理', 'BMI-': '營養不良篩檢',
      '憂鬱量表 GDS+': '心理健康轉介', '社交活動-': '社區據點、共餐與關懷訪視', '社交活動+': '可擔任志工或同儕帶領'
    };
    function name(c) {
      const top = c.map((v, j) => ({ j, v })).filter(x => on.has(x.j)).sort((a, b) => Math.abs(b.v) - Math.abs(a.v)).slice(0, 2);
      if (top.every(t => Math.abs(t.v) < .35)) return { label: '一般平均型', acts: ['常規追蹤'] };
      const word = t => FEATS[t.j][0].replace(' GDS', '') + (t.v > 0 ? '高' : '低');
      const acts = top.map(t => ACT[FEATS[t.j][0] + (t.v > 0 ? '+' : '-')]).filter(Boolean);
      return { label: top.map(word).join('、'), acts: acts.length ? acts : ['再看其他特徵'] };
    }
    function draw() {
      out.innerHTML = '';
      const cols = [...on].sort((a, b) => a - b);
      const X = Z.map(z => cols.map(j => z[j]));
      const km = ML.kmeans(X, K, { seed: 4, runs: 6 });
      // 依群大小排序
      const sizes = Array.from({ length: K }, (_, i) => km.lab.filter(l => l === i).length);
      const order = sizes.map((s, i) => i).sort((a, b) => sizes[b] - sizes[a]); const remap = {}; order.forEach((o, i) => remap[o] = i);
      const lab = km.lab.map(l => remap[l]);
      const cen = order.map(o => { const m = Z.filter((_, n) => km.lab[n] === o); return FEATS.map((_, j) => S.mean(m.map(r => r[j]))); });
      const raw = order.map(o => { const m = P.filter((_, n) => km.lab[n] === o); return FEATS.map((_, j) => S.mean(m.map(r => r[j]))); });
      // 控制列
      const chips = h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } });
      FEATS.forEach(([n, u, grp], j) => { const b = h('button', { class: 'btn sm' + (on.has(j) ? ' on' : '') }, n); b.onclick = () => { if (on.has(j) && on.size <= 2) return; on.has(j) ? on.delete(j) : on.add(j); draw(); }; chips.append(b); });
      const presets = h('div', { class: 'row', style: { gap: '6px', flexWrap: 'wrap' } }, h('span', { style: { fontSize: '13px', color: 'var(--muted)' } }, '快速組合：'),
        ...[['全部 9 個', FEATS.map((_, j) => j)], ['只看身體功能', [0, 1, 2, 3, 6]], ['只看醫療使用', [4, 5]], ['只看心理社會', [7, 8]]].map(([t, s]) => { const b = h('button', { class: 'btn sm' }, t); b.onclick = () => { on.clear(); s.forEach(j => on.add(j)); draw(); }; return b; }));
      out.append(h('div', { class: 'row', style: { gap: '10px', flexWrap: 'wrap', marginBottom: '8px' } }, h('span', { style: { fontSize: '14px', color: 'var(--muted)' } }, 'K'), seg([[2, 'K = 2'], [3, 'K = 3'], [4, 'K = 4'], [5, 'K = 5'], [6, 'K = 6']], () => K, v => K = v, draw)), presets, h('div', { style: { margin: '6px 0 12px' } }, chips));
      const sil = S.mean(ML.silhouette(X, km.lab));
      // 熱圖
      const g = h('div', { class: 'grid2', style: { gap: '18px', alignItems: 'start' } });
      const hm = h('div');
      hm.append(h('div', { style: { fontSize: '13px', color: 'var(--muted)', marginBottom: '6px' } }, '群組剖析熱圖：每格＝該群平均與全體平均的差（Z-Score）；紅＝高、藍＝低'));
      const cw = 46, rh = 34, lw = 90, W = lw + FEATS.length * cw + 10, Hh = 70 + K * rh, sv = U.svgBox(hm, W, Hh);
      FEATS.forEach(([n], j) => U.s('text', { x: lw + j * cw + cw / 2, y: 60, 'text-anchor': 'start', transform: `rotate(-40 ${lw + j * cw + cw / 2} 60)`, text: n.replace(' GDS', ''), style: `font-size:11.5px;fill:${on.has(j) ? '#1c2430' : '#b5bcc4'}` }, sv));
      cen.forEach((c, i) => { U.s('circle', { cx: 12, cy: 70 + i * rh + rh / 2, r: 6, fill: PAL[i] }, sv); U.s('text', { x: 24, y: 70 + i * rh + rh / 2 + 4, text: `群 ${i + 1}（${Math.round(sizes[order[i]] / N * 100)}%）`, style: 'font-size:12px;fill:#1c2430' }, sv);
        c.forEach((v, j) => { const a = Math.min(1, Math.abs(v) / 1.5); const col = v > 0 ? `rgba(192,57,43,${a})` : `rgba(43,108,176,${a})`;
          U.s('rect', { x: lw + j * cw + 1, y: 70 + i * rh + 1, width: cw - 2, height: rh - 2, fill: col, rx: 3, opacity: on.has(j) ? 1 : .25 }, sv);
          U.s('text', { x: lw + j * cw + cw / 2, y: 70 + i * rh + rh / 2 + 4, 'text-anchor': 'middle', text: (v > 0 ? '+' : '') + v.toFixed(1), style: `font-size:11px;font-family:var(--mono);fill:${Math.abs(v) > .9 ? '#fff' : '#1c2430'}` }, sv); }); });
      hm.append(h('div', { class: 'ai' }, '淡色欄＝沒有放進分群的欄位（仍顯示，方便事後解讀）。'));
      // PCA 投影
      const pc = h('div'); pc.append(h('div', { style: { fontSize: '13px', color: 'var(--muted)', marginBottom: '6px' } }, `PCA 投影（只用來「看」）：橫軸≈身體功能越差；縱軸上方偏憂鬱孤立、下方偏用藥與門診多`));
      U.scatter(pc, PJ.map((p, n) => ({ x: p[0], y: p[1], c: PAL[lab[n]], r: 2.8, op: .65 })), { w: 420, h: 300, xlabel: 'PC1', ylabel: 'PC2', noGrid: true });
      g.append(hm, pc); out.append(g);
      out.append(h('div', { class: 'kpi', style: { margin: '12px 0' } }, kpi('平均 Silhouette', sil.toFixed(2), sil > .25 ? 'good' : ''), kpi('最小的群', Math.round(Math.min(...sizes) / N * 100) + '%', Math.min(...sizes) / N < .05 ? 'bad' : ''), kpi('使用欄位', cols.length + ' / 9')));
      // 命名與行動
      const tb = h('table', { class: 'dt', style: { fontSize: '13px' } }, h('tr', null, ['群', '人數', '自動建議的描述', '平均年齡', '步速', 'GDS', '社交/週', '可能的照護行動'].map(t => h('th', null, t))));
      cen.forEach((c, i) => { const nm = name(c); tb.append(h('tr', null, h('td', null, h('span', { style: { color: PAL[i], fontWeight: 700 } }, '● ' + (i + 1))), h('td', null, sizes[order[i]]), h('td', null, nm.label), h('td', null, fmt(raw[i][0], 0)), h('td', null, fmt(raw[i][2], 2)), h('td', null, fmt(raw[i][7], 1)), h('td', null, fmt(raw[i][8], 1)), h('td', null, nm.acts.join('；')))); });
      out.append(h('div', { class: 'tscroll' }, tb));
      let msg;
      if (on.size <= 2 && on.has(7)) msg = '只用心理社會兩欄分群：Silhouette 反而更高（欄位少、比較好切），但衰弱失能的人被打散到各群——你選哪些欄位，就決定了「群」是用什麼角度切出來的。Silhouette 高不代表分群有用。';
      else if (K === 2) msg = 'K = 2 通常只切出「好／不好」兩群，太粗：衰弱的人和憂鬱孤立的人被放在同一群，但他們需要的服務完全不同。';
      else if (K >= 6) msg = 'K 太大時，會出現兩群的建議行動幾乎一樣——那就沒有分開的必要。也要留意太小的群（< 5%）是真的次族群還是雜訊。';
      else msg = '看熱圖找每一群「最突出的兩格」來命名，再問：這幾群需要的照護行動真的不同嗎？自動描述只是起點，命名要用你的專業判斷（例如「步速低、握力低」→ 衰弱前期）。';
      out.append(h('div', { class: 'note', style: { marginTop: '10px' } }, h('b', null, '看懂了什麼：'), msg));
    }
    box.append(out); draw();
  })();

  /* ====================================================================
     ③ 第 10 節：讀懂主成分——載荷與雙標圖
     ==================================================================== */
  (function loading() {
    const box = $('#w-loading'); if (!box) return;
    let pc = 0, colorBy = 'none';
    const out = h('div');
    function draw() {
      out.innerHTML = '';
      const ev = E.values.map(v => v / totVar);
      out.append(h('div', { class: 'row', style: { gap: '10px', flexWrap: 'wrap', marginBottom: '10px' } }, seg([[0, `PC1（${Math.round(ev[0] * 100)}%）`], [1, `PC2（${Math.round(ev[1] * 100)}%）`]], () => pc, v => pc = v, draw),
        h('span', { style: { fontSize: '13px', color: 'var(--muted)' } }, '雙標圖上色：'), seg([['none', '不上色'], ['true', '用潛在型態（對答案）']], () => colorBy, v => colorBy = v, draw)));
      const g = h('div', { class: 'grid2', style: { gap: '18px', alignItems: 'start' } });
      const lb = h('div'); lb.append(h('div', { style: { fontSize: '13px', color: 'var(--muted)', marginBottom: '6px' } }, `PC${pc + 1} 的載荷：每個欄位對這個方向的貢獻（正負代表方向）`));
      const L = LOAD[pc].map((v, j) => ({ n: FEATS[j][0], v, grp: FEATS[j][2] })).sort((a, b) => b.v - a.v);
      const W = 440, rh = 26, lw = 110, Hh = L.length * rh + 10, sv = U.svgBox(lb, W, Hh), x = U.scale(-.7, .7, lw, W - 50);
      U.s('line', { x1: x(0), x2: x(0), y1: 0, y2: Hh, stroke: C.ink, 'stroke-dasharray': '3 3' }, sv);
      const GC = { '身體': C.accent, '醫療使用': C.amber, '心理社會': '#7b3fa8' };
      L.forEach((r, i) => { const y = 4 + i * rh; U.s('text', { x: lw - 8, y: y + 15, 'text-anchor': 'end', text: r.n, style: 'font-size:12px;fill:#1c2430' }, sv);
        U.s('rect', { x: Math.min(x(0), x(r.v)), y: y + 4, width: Math.abs(x(r.v) - x(0)), height: rh - 10, fill: GC[r.grp], rx: 3, opacity: Math.abs(r.v) > .25 ? 1 : .35 }, sv);
        U.s('text', { x: r.v > 0 ? x(r.v) + 4 : x(r.v) - 4, y: y + 15, 'text-anchor': r.v > 0 ? 'start' : 'end', text: r.v.toFixed(2), style: 'font-size:11px;font-family:var(--mono);fill:#5d6774' }, sv); });
      lb.append(h('div', { class: 'row', style: { gap: '12px', fontSize: '12px', color: 'var(--muted)' } }, ...Object.entries(GC).map(([k, c]) => h('span', null, h('i', { style: { display: 'inline-block', width: '10px', height: '10px', background: c, borderRadius: '2px', marginRight: '4px' } }), k))));
      // 雙標圖
      const bp = h('div'); bp.append(h('div', { style: { fontSize: '13px', color: 'var(--muted)', marginBottom: '6px' } }, '雙標圖：點＝長者，箭頭＝欄位的方向'));
      const pts = PJ.map((p, n) => ({ x: p[0], y: p[1], c: colorBy === 'true' ? PAL[TRUE[n]] : '#a3abb4', r: 2.4, op: .5 }));
      U.scatter(bp, pts, { w: 420, h: 340, xmin: -5, xmax: 5, ymin: -4, ymax: 5, xlabel: 'PC1', ylabel: 'PC2', noGrid: true,
        over: [(sv2, x2, y2) => { FEATS.forEach(([n], j) => { const ax = LOAD[0][j] * 6, ay = LOAD[1][j] * 6; if (Math.hypot(ax, ay) < 1.2) return;
          U.s('line', { x1: x2(0), y1: y2(0), x2: x2(ax), y2: y2(ay), stroke: GC[FEATS[j][2]], 'stroke-width': 2 }, sv2);
          U.s('text', { x: x2(ax * 1.08), y: y2(ay * 1.08) + 4, 'text-anchor': ax >= 0 ? 'start' : 'end', text: n.replace(' GDS', ''), style: `font-size:11px;font-weight:600;fill:${GC[FEATS[j][2]]}` }, sv2); }); }] });
      if (colorBy === 'true') bp.append(h('div', { class: 'row', style: { gap: '10px', fontSize: '12px', flexWrap: 'wrap' } }, ...TYPES.map((t, i) => h('span', null, h('i', { style: { display: 'inline-block', width: '9px', height: '9px', borderRadius: '50%', background: PAL[i], marginRight: '4px' } }), t[0]))));
      g.append(lb, bp); out.append(g);
      const top3 = LOAD[pc].map((v, j) => [Math.abs(v), FEATS[j][0], v]).sort((a, b) => b[0] - a[0]).slice(0, 3).map(t => `${t[1]}（${t[2] > 0 ? '+' : '−'}）`).join('、');
      out.append(h('div', { class: 'note', style: { marginTop: '10px' } }, h('b', null, '看懂了什麼：'), pc === 0
        ? `PC1 解釋 ${Math.round(ev[0] * 100)}% 的變異，載荷最大的是 ${top3}——步速、握力、ADL 往同一邊，年齡往另一邊。可以把它讀成「身體功能衰退」這條軸。主成分本身沒有名字，名字是你看完載荷後取的。`
        : (() => { const L2 = LOAD[1].map((v, j) => [v, FEATS[j][0].replace(' GDS', '')]); const pos = L2.filter(t => t[0] > .25).sort((a, b) => b[0] - a[0]).map(t => t[1]).join('、'), neg = L2.filter(t => t[0] < -.25).sort((a, b) => a[0] - b[0]).map(t => t[1]).join('、');
          return `PC2 解釋 ${Math.round(ev[1] * 100)}% 的變異。它的一端是 ${pos || '—'}，另一端是 ${neg || '—'}——等於把「孤立憂鬱」和「慢病多藥」這兩種身體功能差不多的人分開。兩軸合起來 ${Math.round((ev[0] + ev[1]) * 100)}%，剩下的變異還在其他主成分裡，所以 2 維圖上重疊的點，在 9 維空間不一定重疊。`; })()));
    }
    box.append(out); draw();
  })();
})();
