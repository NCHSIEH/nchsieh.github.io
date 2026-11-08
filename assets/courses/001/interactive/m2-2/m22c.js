/* M2-2 加強版（2026-11）：2,000 次出院的再入院資料集，分類模型真的訓練、真的比較 */
(function () {
  'use strict';
  const { h, $, S, fmt, seg, C } = U;

  /* ---------- 教學用模擬資料：2,000 次出院（數值為教學設計，非真實病人） ---------- */
  const R = U.rng(3030), N = 2000;
  const DEST = ['回家（自理）', '回家（家人照顧）', '護理之家'];
  const D = [];
  for (let i = 0; i < N; i++) {
    const age = Math.round(Math.min(98, Math.max(25, 70 + 13 * U.randn(R))));
    const prior = Math.min(8, Math.max(0, Math.round(Math.abs(0.4 + (age - 60) / 40 + 1.1 * U.randn(R)) * (R() < .55 ? 0.6 : 1.3))));
    const los = Math.max(1, Math.round(Math.exp(1.5 + 0.012 * (age - 70) + 0.45 * U.randn(R))));
    const comorb = Math.min(7, Math.max(0, Math.round(1 + (age - 55) / 20 + 1.1 * U.randn(R))));
    const meds = Math.min(18, Math.max(0, Math.round(3 + comorb * 1.4 + 2 * U.randn(R))));
    const alb = +(Math.min(5, Math.max(2, 3.7 - 0.05 * comorb + 0.42 * U.randn(R)))).toFixed(1);
    const u = R(); const dest = age > 82 && u < .3 ? 2 : u < .58 ? 0 : u < .9 ? 1 : 2;
    const alone = R() < (age > 75 ? .28 : .14) ? 1 : 0;
    const z = -3.05 + 0.022 * (age - 70) + 0.42 * prior + 0.05 * (los - 5) + 0.16 * comorb + 0.04 * (meds - 7) - 0.55 * (alb - 3.7) + (dest === 2 ? .65 : dest === 1 ? .2 : 0) + 0.35 * alone + 0.45 * U.randn(R);
    const y = R() < 1 / (1 + Math.exp(-z)) ? 1 : 0;
    D.push({ id: 'D' + String(i + 1).padStart(4, '0'), age, prior, los, comorb, meds, alb, dest, alone, y });
  }
  const F = [['年齡', d => d.age], ['前一年住院次數', d => d.prior], ['住院天數', d => d.los], ['共病數', d => d.comorb], ['用藥數', d => d.meds], ['白蛋白', d => d.alb], ['出院去向：家人照顧', d => +(d.dest === 1)], ['出院去向：護理之家', d => +(d.dest === 2)], ['獨居', d => d.alone]];
  const ord = D.map((d, i) => [U.rng(i + 11)(), i]).sort((a, b) => a[0] - b[0]).map(x => x[1]);
  const TR = ord.slice(0, 1400).map(i => D[i]), TE = ord.slice(1400).map(i => D[i]);
  const prev = S.mean(D.map(d => d.y));
  const raw = d => F.map(f => f[1](d));
  const st = ML.standardize(TR.map(raw));
  const zf = d => raw(d).map((v, j) => (v - st.m[j]) / st.s[j]);
  const XTR = TR.map(zf), XTE = TE.map(zf), YTR = TR.map(d => d.y), YTE = TE.map(d => d.y);

  /* ---------- 四個模型 ---------- */
  const MODELS = {
    lr: { name: 'Logistic 迴歸', color: C.accent, train() { const b = ML.logistic(XTR, YTR, null, { lr: .8, iters: 500 }); this.b = b; return XTE.map(x => ML.sigmoid(ML.predict(b, x))); } },
    tree: { name: '決策樹（深度 4）', color: C.amber, train() { const t = ML.cart(XTR.map((x, i) => ({ x, y: YTR[i] })), 4, { minLeaf: 25 }); return XTE.map(x => ML.treeP(t, x)); } },
    knn: { name: 'k-NN（k = 25）', color: '#7b3fa8', train() { return XTE.map(x => { const d = XTR.map((t, i) => [ML.d2(x, t), YTR[i]]).sort((a, b) => a[0] - b[0]).slice(0, 25); return S.mean(d.map(v => v[1])); }); } },
    rf: { name: '隨機森林（40 棵）', color: C.blue, train() { const r = U.rng(5), pts = XTR.map((x, i) => ({ x, y: YTR[i] })), T = []; for (let k = 0; k < 40; k++) { const bs = pts.map(() => pts[Math.floor(r() * pts.length)]); T.push(ML.cart(bs, 6, { rng: r, mtry: 3, minLeaf: 10 })); } return XTE.map(x => S.mean(T.map(t => ML.treeP(t, x)))); } },
  };
  function roc(p, y) { const o = p.map((v, i) => [v, y[i]]).sort((a, b) => b[0] - a[0]); const P = S.sum(y), Nn = y.length - P; let tp = 0, fp = 0, auc = 0, prevF = 0; const pts = [[0, 0]];
    o.forEach(([, t], i) => { if (t) tp++; else { fp++; auc += tp; } if (i === o.length - 1 || o[i + 1][0] !== o[i][0]) pts.push([fp / Nn, tp / P]); }); return { pts, auc: auc / (P * Nn) }; }
  const kpi = (k, v, cls) => h('div', null, h('div', { class: 'k' }, k), h('div', { class: 'v' + (cls ? ' ' + cls : '') }, v));
  const CACHE = {};
  const MS = {};
  const scores = k => { if (!CACHE[k]) { const t0 = performance.now(); CACHE[k] = MODELS[k].train(); MS[k] = performance.now() - t0; } return CACHE[k]; };

  /* ====================================================================
     ① 第 4 節：模型為什麼說這位病人高風險？（Logistic 的貢獻分解）
     ==================================================================== */
  (function why() {
    const box = $('#w-why'); if (!box) return;
    const p = scores('lr'), b = MODELS.lr.b;
    const top = TE.map((d, i) => ({ d, p: p[i], x: XTE[i] })).sort((a, b2) => b2.p - a.p);
    let sel = 0, mode = 'top';
    const out = h('div');
    function draw() {
      out.innerHTML = '';
      const list = mode === 'top' ? top.slice(0, 10) : top.slice(-10).reverse();
      out.append(h('div', { class: 'row', style: { gap: '10px', marginBottom: '10px', flexWrap: 'wrap' } }, seg([['top', '風險最高的 10 位'], ['low', '風險最低的 10 位']], () => mode, v => { mode = v; sel = 0; }, draw),
        h('span', { class: 'tag gray' }, `測試集 600 次出院 · 實際再入院率 ${fmt(S.mean(YTE) * 100, 1)}%`)));
      const g = h('div', { class: 'grid2', style: { gap: '18px', alignItems: 'start' } });
      const tb = h('table', { class: 'dt', style: { fontSize: '13px' } }, h('tr', null, ['出院', '年齡', '前一年住院', '去向', '預測機率', '實際'].map(t => h('th', null, t))));
      list.forEach((r, i) => { const tr = h('tr', { style: { cursor: 'pointer', background: i === sel ? 'var(--accent-soft)' : null } }, h('td', null, r.d.id), h('td', null, r.d.age), h('td', null, r.d.prior + ' 次'), h('td', null, DEST[r.d.dest].replace('回家', '').replace(/[（）]/g, '') || '自理'), h('td', { style: { fontFamily: 'var(--mono)', fontWeight: 700, color: r.p > .3 ? C.bad : C.ink } }, fmt(r.p * 100, 0) + '%'), h('td', null, r.d.y ? h('span', { class: 'tag bad' }, '再入院') : h('span', { class: 'tag gray' }, '沒有'))); tr.onclick = () => { sel = i; draw(); }; tb.append(tr); });
      const left = h('div', null, h('div', { class: 'tscroll' }, tb), h('div', { class: 'ai' }, '點任一列，看右邊的拆解。'));
      const r = list[sel];
      const contrib = F.map((f, j) => ({ name: f[0], v: b[j + 1] * r.x[j], raw: f[1](r.d) })).sort((a, b2) => Math.abs(b2.v) - Math.abs(a.v)).slice(0, 7);
      const right = h('div');
      right.append(h('div', { style: { fontSize: '14px', marginBottom: '6px' } }, h('b', null, r.d.id), `：預測再入院機率 ${fmt(r.p * 100, 1)}%（平均病人約 ${fmt(ML.sigmoid(b[0]) * 100, 1)}%）`));
      const max = Math.max(...contrib.map(c => Math.abs(c.v)), .1), W = 440, rh = 28, Hh = contrib.length * rh + 26, sv = U.svgBox(right, W, Hh), x = U.scale(-max, max, 150, W - 60);
      U.s('line', { x1: x(0), x2: x(0), y1: 2, y2: Hh - 20, stroke: C.ink, 'stroke-dasharray': '3 3' }, sv);
      contrib.forEach((c, i) => { const y = 6 + i * rh; U.s('text', { x: 144, y: y + 14, 'text-anchor': 'end', text: `${c.name} = ${c.raw}`, style: 'font-size:12px;fill:#1c2430' }, sv);
        U.s('rect', { x: Math.min(x(0), x(c.v)), y: y + 3, width: Math.abs(x(c.v) - x(0)), height: rh - 10, fill: c.v > 0 ? C.bad : C.blue, rx: 3 }, sv);
        U.s('text', { x: c.v > 0 ? x(c.v) + 4 : x(c.v) - 4, y: y + 15, 'text-anchor': c.v > 0 ? 'start' : 'end', text: (c.v > 0 ? '+' : '') + fmt(c.v, 2), style: 'font-size:11.5px;font-family:var(--mono);fill:#5d6774' }, sv); });
      U.s('text', { x: x(0), y: Hh - 4, 'text-anchor': 'middle', text: '← 拉低風險　｜　推高風險 →', style: 'font-size:11px;fill:#8a929c' }, sv);
      right.append(h('div', { class: 'ai' }, '長條＝係數 × 這位病人與平均的差距（標準化後），加總起來就是 log-odds。'));
      g.append(left, right); out.append(g);
      const hits = list.filter(z => z.d.y).length;
      out.append(h('div', { class: 'note' }, h('b', null, '看懂了什麼：'), mode === 'top' ? `風險最高的 10 位裡，實際有 ${hits} 位再入院——不是全部。機率 ${fmt(list[0].p * 100, 0)}% 的意思是「100 位這樣的病人約 ${fmt(list[0].p * 100, 0)} 位會再入院」，不是預言。右邊的拆解讓個管師看得懂：這位是因為前一年住院多、出院去護理之家，還是白蛋白低？` : `風險最低的 10 位，實際再入院 ${hits} 位。低風險不等於零風險——門檻要怎麼設，第 8 節會用成本來決定。`));
    }
    box.append(out); draw();
  })();

  /* ====================================================================
     ② 第 8 節：追蹤名額有限——前 X% 能抓到幾成？
     ==================================================================== */
  (function cap() {
    const box = $('#w-cap'); if (!box) return;
    const p = scores('lr'); const o = p.map((v, i) => [v, YTE[i]]).sort((a, b) => b[0] - a[0]); const P = S.sum(YTE);
    let pct = 20;
    const out = h('div');
    function draw() {
      out.innerHTML = '';
      const k = Math.round(o.length * pct / 100), caught = S.sum(o.slice(0, k).map(z => z[1]));
      out.append(h('div', { class: 'row', style: { gap: '14px', flexWrap: 'wrap', marginBottom: '10px' } }, U.slider('個管師追蹤名額（風險最高的前…）', 5, 60, 5, () => pct, v => pct = v, draw, v => v + '%'), h('span', { class: 'tag gray' }, `${o.length} 次出院中有 ${P} 次再入院`)));
      out.append(h('div', { class: 'kpi', style: { marginBottom: '12px' } }, kpi('要追蹤的人數', k + ' 人'), kpi('抓到的再入院', `${caught} / ${P}`, 'good'), kpi('抓到比例（Recall）', Math.round(caught / P * 100) + '%', 'good'), kpi('追蹤的人裡真的會再入院（PPV）', Math.round(caught / Math.max(1, k) * 100) + '%'), kpi('比隨機抽同樣人數好', fmt((caught / Math.max(1, k)) / (P / o.length), 1) + ' 倍')));
      const g = h('div', { class: 'grid2', style: { gap: '18px', alignItems: 'start' } });
      // 累積增益曲線
      const gc = h('div'); gc.append(h('div', { style: { fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' } }, '累積增益曲線：追蹤前 x% 的人，能抓到 y% 的再入院'));
      const pts = [[0, 0]]; let c = 0; o.forEach((z, i) => { c += z[1]; if ((i + 1) % 6 === 0 || i === o.length - 1) pts.push([(i + 1) / o.length * 100, c / P * 100]); });
      U.lc(gc, [{ pts, color: C.accent, w: 2.6 }, { pts: [[0, 0], [100, 100]], color: C.gray, w: 1.5, dash: '4 3' }], { w: 460, h: 280, xmin: 0, xmax: 100, ymin: 0, ymax: 100, xl: '追蹤名額（% 的出院病人）', yl: '抓到的再入院（%）', marks: [{ x: pct, color: C.bad, label: pct + '%' }],
        legend: [['模型排序', C.accent], ['隨機抽', C.gray, '4 3']], legW: 90, over: [(sv, x, y) => U.s('circle', { cx: x(pct), cy: y(caught / P * 100), r: 6, fill: C.bad }, sv)] });
      // 十分位實際再入院率
      const dec = h('div'); dec.append(h('div', { style: { fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' } }, '依預測風險分成 10 組（每組 60 人），每組實際再入院率'));
      const items = []; for (let d = 0; d < 10; d++) { const g2 = o.slice(d * 60, (d + 1) * 60); items.push({ label: `第 ${d + 1} 組${d === 0 ? '（最高）' : d === 9 ? '（最低）' : ''}`, value: S.mean(g2.map(z => z[1])) * 100, text: fmt(S.mean(g2.map(z => z[1])) * 100, 0) + '%', color: (d + 1) * 10 <= pct ? C.bad : '#9fc7c2' }); }
      const box2 = h('div', { style: { display: 'grid', gridTemplateColumns: '110px 1fr 46px', gap: '5px 8px', alignItems: 'center', fontSize: '12.5px' } });
      const mx = Math.max(...items.map(i => i.value));
      items.forEach(it => box2.append(h('div', { style: { textAlign: 'right' } }, it.label), h('div', { style: { background: '#efece5', borderRadius: '4px' } }, h('i', { style: { display: 'block', height: '15px', borderRadius: '4px', background: it.color, width: (it.value / mx * 100) + '%', transition: 'width .3s' } })), h('div', { style: { fontFamily: 'var(--mono)' } }, it.text)));
      dec.append(box2, h('div', { class: 'ai' }, `整體再入院率 ${fmt(P / o.length * 100, 1)}%；紅色＝在追蹤名額內的組。`));
      g.append(gc, dec); out.append(g);
      out.append(h('div', { class: 'note' }, h('b', null, '看懂了什麼：'), `臨床現場問的通常不是「門檻設多少」，而是「我們只追得動 ${k} 個人，該追誰？」。依模型排序追前 ${pct}%，可以抓到 ${Math.round(caught / P * 100)}% 的再入院，是隨機抽的 ${fmt((caught / Math.max(1, k)) / (P / o.length), 1)} 倍效率。名額加倍，抓到的不會加倍——曲線越往右越平，這就是取捨。`));
    }
    box.append(out); draw();
  })();

  /* ====================================================================
     ③ 第 13 節：四個模型同場比較
     ==================================================================== */
  (function arena() {
    const box = $('#w-arena'); if (!box) return;
    const on = new Set(['lr']); const res = {}; let busy = false, msg = '';
    const out = h('div');
    function run() {
      const todo = [...on].filter(k => !res[k]); if (!todo.length) { draw(); return; }
      busy = true; let i = 0;
      const step = () => { if (i >= todo.length) { busy = false; draw(); return; } const k = todo[i]; msg = `訓練 ${MODELS[k].name} 中…（1,400 筆、9 個欄位）`; draw();
        setTimeout(() => { const p = scores(k); const r = roc(p, YTE); res[k] = { ...r, ms: MS[k], p }; i++; step(); }, 30); };
      step();
    }
    function draw() {
      out.innerHTML = '';
      const chips = h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '10px' } });
      Object.entries(MODELS).forEach(([k, m]) => { const b = h('button', { class: 'btn sm' + (on.has(k) ? ' on' : ''), style: on.has(k) ? { background: m.color, borderColor: m.color } : {} }, (on.has(k) ? '✓ ' : '＋ ') + m.name); b.disabled = busy; b.onclick = () => { on.has(k) ? on.delete(k) : on.add(k); run(); }; chips.append(b); });
      out.append(h('div', { class: 'row', style: { gap: '8px', marginBottom: '4px' } }, h('span', { style: { fontSize: '14px', color: 'var(--muted)' } }, '選擇要比較的模型（在你的瀏覽器裡真的訓練）：')), chips);
      if (busy) { out.append(h('div', { class: 'note' }, '⏳ ' + msg)); }
      const ks = [...on].filter(k => res[k]);
      const g = h('div', { class: 'grid2', style: { gap: '18px', alignItems: 'start' } });
      const rc = h('div'); rc.append(h('div', { style: { fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' } }, '測試集 ROC 曲線（越靠左上越好）'));
      U.lc(rc, [{ pts: [[0, 0], [1, 1]], color: C.gray, w: 1.2, dash: '4 3' }, ...ks.map(k => ({ pts: res[k].pts, color: MODELS[k].color, w: 2.4 }))], { w: 440, h: 320, xmin: 0, xmax: 1, ymin: 0, ymax: 1, xl: '1 − 特異度（誤報率）', yl: '敏感度（Recall）' });
      const tb = h('table', { class: 'dt', style: { fontSize: '13.5px' } }, h('tr', null, ['模型', 'AUC', '前 20% 抓到', '訓練＋預測時間', '能不能解釋'].map(t => h('th', null, t))));
      const ex = { lr: '係數＝勝算比', tree: '印出來就看得懂', knn: '只能說「像誰」', rf: '要靠特徵重要性' };
      const best = ks.length ? Math.max(...ks.map(k => res[k].auc)) : 0;
      ks.forEach(k => { const p = res[k].p, o = p.map((v, i) => [v, YTE[i]]).sort((a, b) => b[0] - a[0]); const c20 = S.sum(o.slice(0, 120).map(z => z[1])) / S.sum(YTE);
        tb.append(h('tr', null, h('td', null, h('span', { style: { display: 'inline-block', width: '10px', height: '10px', borderRadius: '2px', background: MODELS[k].color, marginRight: '6px' } }), MODELS[k].name), h('td', { class: res[k].auc === best && ks.length > 1 ? 'ok' : null, style: { fontFamily: 'var(--mono)', fontWeight: 700 } }, res[k].auc.toFixed(3)), h('td', { style: { fontFamily: 'var(--mono)' } }, Math.round(c20 * 100) + '%'), h('td', { style: { fontFamily: 'var(--mono)' } }, Math.round(res[k].ms) + ' ms'), h('td', null, ex[k]))); });
      const side = h('div', null, h('div', { class: 'tscroll' }, tb));
      if (ks.length) {
        const spread = Math.max(...ks.map(k => res[k].auc)) - Math.min(...ks.map(k => res[k].auc));
        side.append(h('div', { class: 'note', style: { marginTop: '12px' } }, h('b', null, '看懂了什麼：'), ks.length === 1 ? '再加一兩個模型進來比較。注意：每次「抽樣」會讓 AUC 有 ±0.02 左右的起伏，差距小於這個就不算真的贏。'
          : spread < 0.03 ? `這幾個模型的 AUC 只差 ${spread.toFixed(3)}——在這份資料上幾乎打平。這時候該選最好解釋、最容易部署的那一個（通常是 Logistic），而不是最潮的。`
          : `AUC 差了 ${spread.toFixed(3)}。${res.lr && res.lr.auc === best ? '最簡單的 Logistic 反而最好——當風險大致隨各因素「加總」上升時，複雜模型沒有優勢，k-NN 還會被不重要的欄位干擾。' : ''}先確認差距不是抽樣造成的（用交叉驗證多跑幾次），再拿「能不能解釋、能不能維護」一起決定。`));
      }
      g.append(rc, side); out.append(g);
    }
    box.append(out); draw(); run();
  })();
})();
