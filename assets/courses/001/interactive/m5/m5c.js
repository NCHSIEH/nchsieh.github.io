/* M5 加強版（2026-11）：嵌入層真的學出來（3,000 次住院 × 24 個診斷碼）、2,000 次出院的 MLP 實驗、畫圖看卷積核 */
(function () {
  'use strict';
  const { h, $, S, fmt, seg, C } = U;
  const kpi = (k, v, cls) => h('div', null, h('div', { class: 'k' }, k), h('div', { class: 'v' + (cls ? ' ' + cls : '') }, v));
  const sub = t => h('div', { style: { fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' } }, t);
  const note = (msg, cls) => h('div', { class: 'note' + (cls ? ' ' + cls : ''), style: { marginTop: '10px' } }, h('b', null, '看懂了什麼：'), msg);
  const sig = z => 1 / (1 + Math.exp(-z));

  /* ====================================================================
     ① 第 08 節：嵌入層真的學出來——3,000 次住院、24 個主診斷碼
     ==================================================================== */
  (function emb() {
    const box = $('#w-embreal'); if (!box) return;
    const SYS = [['心腦血管', '#c0392b', .4, -.2], ['呼吸', '#2b6cb0', 1.0, .3], ['腸胃外科', '#b45309', -.7, -.8], ['骨科', '#6b46c1', -1.0, 1.2], ['腫瘤', '#0d6b67', 1.3, 1.3], ['代謝腎臟', '#7a8794', .1, -1.1]];
    const CODES = [['I21', '急性心肌梗塞', 0], ['I50', '心衰竭', 0], ['I48', '心房顫動', 0], ['I63', '腦梗塞', 0], ['J18', '肺炎', 1], ['J44', '慢性阻塞性肺病', 1], ['J96', '呼吸衰竭', 1], ['J69', '吸入性肺炎', 1], ['K35', '闌尾炎', 2], ['K80', '膽結石', 2], ['K92', '消化道出血', 2], ['K56', '腸阻塞', 2], ['S72', '股骨骨折', 3], ['S32', '腰椎骨折', 3], ['M17', '膝關節炎（置換）', 3], ['M48', '脊椎狹窄', 3], ['C34', '肺癌', 4], ['C18', '大腸癌', 4], ['C22', '肝癌', 4], ['C50', '乳癌', 4], ['E11', '第二型糖尿病', 5], ['E87', '電解質失衡', 5], ['N18', '慢性腎臟病', 5], ['N39', '泌尿道感染', 5]];
    const K = CODES.length, R = U.rng(5150), NP = 3000;
    const eff = CODES.map(c => [SYS[c[2]][2] + .15 * U.randn(R), SYS[c[2]][3] + .15 * U.randn(R)]);
    const wt = CODES.map((_, i) => 1 / Math.pow(1 + ((i * 7) % K), .55)), wsum = S.sum(wt);   // 頻率不均：有常見碼也有罕見碼
    const n = new Array(K).fill(0), k1 = new Array(K).fill(0), k2 = new Array(K).fill(0);
    for (let p = 0; p < NP; p++) {
      let u = R() * wsum, c = 0; while (u > wt[c]) { u -= wt[c]; c++; }
      n[c]++; if (R() < sig(-1.9 + eff[c][0])) k1[c]++; if (R() < sig(-1.6 + eff[c][1])) k2[c]++;
    }
    // 模型：每個碼一個 2 維嵌入 e_c；兩個輸出（30 天再入院、住院 > 14 天）＝ w_k·e_c + b_k。模型不知道「系統」是什麼。
    let E, W, B, step, mE, vE, mW, vW, mB, vB, losses, timer = null, sel = 12;
    function reset() {
      const r = U.rng(77); E = CODES.map(() => [.15 * U.randn(r), .15 * U.randn(r)]); W = [[.3 * U.randn(r), .3 * U.randn(r)], [.3 * U.randn(r), .3 * U.randn(r)]]; B = [-1.8, -1.5]; step = 0;
      mE = E.map(() => [0, 0]); vE = E.map(() => [0, 0]); mW = [[0, 0], [0, 0]]; vW = [[0, 0], [0, 0]]; mB = [0, 0]; vB = [0, 0]; losses = [[0, loss()]];
    }
    function loss() { let L = 0; for (let c = 0; c < K; c++) { [k1[c], k2[c]].forEach((kk, t) => { const p = Math.min(1 - 1e-9, Math.max(1e-9, sig(W[t][0] * E[c][0] + W[t][1] * E[c][1] + B[t]))); L -= kk * Math.log(p) + (n[c] - kk) * Math.log(1 - p); }); } return L / (2 * NP); }
    const lr = .03, b1 = .9, b2 = .999;
    function adam(m, v, i, j, g, arr) { m[i][j] = b1 * m[i][j] + (1 - b1) * g; v[i][j] = b2 * v[i][j] + (1 - b2) * g * g; arr[i][j] -= lr * (m[i][j] / (1 - b1 ** step)) / (Math.sqrt(v[i][j] / (1 - b2 ** step)) + 1e-8); }
    function train1() {
      step++; const gE = E.map(() => [0, 0]), gW = [[0, 0], [0, 0]], gB = [0, 0];
      for (let c = 0; c < K; c++) [k1[c], k2[c]].forEach((kk, t) => { const d = (n[c] * sig(W[t][0] * E[c][0] + W[t][1] * E[c][1] + B[t]) - kk) / NP; gB[t] += d; for (let j = 0; j < 2; j++) { gW[t][j] += d * E[c][j]; gE[c][j] += d * W[t][j] + 1e-4 * E[c][j]; } });
      for (let c = 0; c < K; c++) for (let j = 0; j < 2; j++) adam(mE, vE, c, j, gE[c][j] * K, E);
      for (let t = 0; t < 2; t++) { for (let j = 0; j < 2; j++) adam(mW, vW, t, j, gW[t][j], W); const g = gB[t]; mB[t] = b1 * mB[t] + (1 - b1) * g; vB[t] = b2 * vB[t] + (1 - b2) * g * g; B[t] -= lr * (mB[t] / (1 - b1 ** step)) / (Math.sqrt(vB[t] / (1 - b2 ** step)) + 1e-8); }
    }
    const dist = (a, b) => Math.hypot(E[a][0] - E[b][0], E[a][1] - E[b][1]);
    const nn = c => CODES.map((_, j) => j).filter(j => j !== c).sort((a, b) => dist(c, a) - dist(c, b));
    const sameRate = () => S.mean(CODES.map((cd, c) => CODES[nn(c)[0]][2] === cd[2] ? 1 : 0));
    reset();
    const out = h('div');
    function draw() {
      out.innerHTML = '';
      const go = h('button', { class: 'btn primary' }, timer ? `訓練中… 第 ${step} 步` : step ? '▶ 再訓練 300 步' : '▶ 開始訓練（300 步）'); go.disabled = !!timer;
      go.onclick = () => { let k = 0; timer = setInterval(() => { for (let q = 0; q < 3; q++) { train1(); k++; } losses.push([step, loss()]); if (k >= 300) { clearInterval(timer); timer = null; } draw(); }, 30); draw(); };
      const rs = h('button', { class: 'btn sm' }, '重設成隨機起點'); rs.disabled = !!timer; rs.onclick = () => { reset(); draw(); };
      out.append(h('div', { class: 'row', style: { gap: '10px', flexWrap: 'wrap', marginBottom: '10px' } }, go, rs));
      const sr = sameRate();
      out.append(h('div', { class: 'kpi', style: { marginBottom: '10px' } }, kpi('訓練步數', step), kpi('損失（每筆平均 log loss）', losses[losses.length - 1][1].toFixed(4)), kpi('最近鄰是同系統的比例', Math.round(sr * 100) + '%', step > 100 && sr > .6 ? 'good' : ''), kpi('瞎猜的期望值', '13%')));
      const g = h('div', { class: 'grid2', style: { gap: '18px', alignItems: 'start' } });
      const left = h('div'); left.append(sub('每個點是一個診斷碼的 2 維嵌入（點越大＝病例越多）。顏色是我們事後上的，模型從頭到尾不知道。'));
      const chart = h('div'); left.append(chart);
      const xs = E.map(e => e[0]), ys = E.map(e => e[1]), pad = .25;
      const x0 = Math.min(...xs) - pad, x1 = Math.max(...xs) + pad, y0 = Math.min(...ys) - pad, y1 = Math.max(...ys) + pad;
      const near = nn(sel).slice(0, 3);
      U.scatter(chart, CODES.map((cd, c) => ({ x: E[c][0], y: E[c][1], c: SYS[cd[2]][1], r: 3 + Math.sqrt(n[c]) / 3.2, op: c === sel || near.includes(c) ? .95 : .7, stroke: c === sel ? '#1c2430' : null, title: `${cd[0]} ${cd[1]}（${n[c]} 例）`, onclick: () => { sel = c; draw(); } })), {
        w: 460, h: 360, xmin: x0, xmax: x1, ymin: y0, ymax: y1, noGrid: true, xlabel: '嵌入維度 1', ylabel: '嵌入維度 2',
        over: [(sv, x, y) => { near.forEach(j => U.s('line', { x1: x(E[sel][0]), y1: y(E[sel][1]), x2: x(E[j][0]), y2: y(E[j][1]), stroke: '#1c2430', 'stroke-dasharray': '3 3', 'stroke-width': 1 }, sv)); CODES.forEach((cd, c) => U.s('text', { x: x(E[c][0]) + 7, y: y(E[c][1]) - 5, text: cd[0], style: `font-size:${c === sel ? 12.5 : 10.5}px;font-weight:${c === sel ? 700 : 400};fill:#1c2430` }, sv)); }]
      });
      left.append(h('div', { style: { display: 'flex', gap: '10px', flexWrap: 'wrap', fontSize: '12px', marginTop: '4px' } }, ...SYS.map(s0 => h('span', null, h('i', { style: { display: 'inline-block', width: '10px', height: '10px', borderRadius: '50%', background: s0[1], marginRight: '4px' } }), s0[0]))));
      const right = h('div');
      const cd = CODES[sel];
      right.append(sub('點左圖任一個碼，看它的鄰居'), h('div', { style: { fontSize: '15px', marginBottom: '6px' } }, h('b', null, `${cd[0]} ${cd[1]}`), `　${n[sel]} 例，再入院 ${Math.round(k1[sel] / n[sel] * 100)}%、住院 > 14 天 ${Math.round(k2[sel] / n[sel] * 100)}%`));
      const tb = h('div', { style: { display: 'grid', gridTemplateColumns: 'auto 1fr auto', gap: '4px 10px', fontSize: '13px', marginBottom: '10px' } });
      tb.append(h('b', null, '最近的碼'), h('b', null, '系統'), h('b', null, '距離'));
      near.forEach(j => tb.append(h('div', null, `${CODES[j][0]} ${CODES[j][1]}`), h('div', { style: { color: SYS[CODES[j][2]][1] } }, SYS[CODES[j][2]][0]), h('div', { style: { fontFamily: 'var(--mono)' } }, dist(sel, j).toFixed(2))));
      right.append(tb);
      const lcb = h('div'); right.append(sub('損失曲線'), lcb);
      const lv = losses.map(z => z[1]);
      U.lc(lcb, [{ pts: losses, color: C.accent, w: 2.2 }], { w: 400, h: 170, xmin: 0, xmax: Math.max(300, step), ymin: Math.min(...lv) * .995, ymax: Math.max(...lv) * 1.005, xl: '訓練步數', yl: 'log loss' });
      g.append(left, right); out.append(g);
      let msg;
      if (!step) msg = '起點是隨機的：24 個點亂成一團，最近鄰是不是同系統，跟瞎猜差不多。按「開始訓練」，模型只看「這個碼的病人有沒有 30 天再入院、有沒有住超過 14 天」。';
      else if (step < 150) msg = '點開始移動了：對兩個結果影響相似的碼，被梯度推往同一個方向。';
      else {
        const rare = CODES.map((_, c) => c).filter(c => n[c] < 40);
        msg = `訓練 ${step} 步後，${Math.round(sr * 100)}% 的碼最近的鄰居是同一系統——模型從沒被告知 ICD 章節，卻自己把腫瘤碼、骨科碼各自聚在一起，因為它們對再入院與住院天數的影響相似。這就是嵌入的價值：One-Hot 下所有碼彼此等距，嵌入讓「相似」變成可計算的距離。` + (rare.length ? `但注意 ${rare.map(c => CODES[c][0]).join('、')} 只有不到 40 例，位置不太可靠；換個隨機起點重訓，它們跑得最遠。` : '');
      }
      out.append(note(msg));
    }
    box.append(out); draw();
  })();

  /* ====================================================================
     ② 第 11 節：2,000 次出院——MLP 會不會贏 Logistic？
     ==================================================================== */
  (function mlp2k() {
    const box = $('#w-mlp2k'); if (!box) return;
    const R = U.rng(6060), N = 2000;   // 與 M4 梯度提升同一份資料
    const X = [], Y = [];
    for (let i = 0; i < N; i++) {
      const age = 70 + 13 * U.randn(R), prior = Math.max(0, Math.round(Math.abs(.5 + 1.2 * U.randn(R)))), los = Math.max(1, Math.round(Math.exp(1.5 + .45 * U.randn(R)))), com = Math.max(0, Math.round(1.5 + 1.2 * U.randn(R)));
      const meds = Math.max(0, Math.round(3 + com * 1.4 + 2 * U.randn(R))), alb = 3.7 + .42 * U.randn(R), nh = R() < .14 ? 1 : 0, alone = R() < .2 ? 1 : 0, egfr = Math.max(8, 75 - .5 * (age - 70) + 18 * U.randn(R));
      const z = -2.9 + .015 * (age - 70) + .45 * Math.min(prior, 4) + .05 * (los - 5) + .15 * com + (alb < 3.2 ? 1.0 : 0) + (egfr < 30 ? .8 : 0) + .6 * nh + (alone && age > 80 ? .9 : 0) + .4 * U.randn(R);
      X.push([age, prior, los, com, meds, alb, nh, alone, egfr]); Y.push(R() < sig(z) ? 1 : 0);
    }
    const TRI = [], VAI = []; X.forEach((_, i) => (i % 10 < 7 ? TRI : VAI).push(i));
    const D = 9, EPOCHS = 120;
    function auc(idx, p) { const o = idx.map(i => [p[i], Y[i]]).sort((a, b) => b[0] - a[0]); let t = 0, a = 0; const P = S.sum(o.map(z => z[1])), Nn = o.length - P; o.forEach(([, y]) => { if (y) t++; else a += t; }); return a / (P * Nn); }
    function ll(idx, p) { return S.mean(idx.map(i => { const q = Math.min(1 - 1e-7, Math.max(1e-7, p[i])); return -(Y[i] * Math.log(q) + (1 - Y[i]) * Math.log(1 - q)); })); }
    function stdz(tr) { const m = [], s = []; for (let j = 0; j < D; j++) { const c = tr.map(i => X[i][j]); m.push(S.mean(c)); s.push(S.sd(c) || 1); } return X.map(r => r.map((v, j) => (v - m[j]) / s[j])); }
    const logitCache = {};
    function logit(nTr) {
      if (logitCache[nTr]) return logitCache[nTr];
      const tr = TRI.slice(0, nTr), Z = stdz(tr), w = new Array(D + 1).fill(0);
      for (let it = 0; it < 800; it++) { const g = new Array(D + 1).fill(0); tr.forEach(i => { let o = w[D]; for (let j = 0; j < D; j++) o += w[j] * Z[i][j]; const d = sig(o) - Y[i]; for (let j = 0; j < D; j++) g[j] += d * Z[i][j]; g[D] += d; }); for (let j = 0; j <= D; j++) w[j] -= .5 * g[j] / tr.length; }
      const p = X.map((_, i) => { let o = w[D]; for (let j = 0; j < D; j++) o += w[j] * Z[i][j]; return sig(o); });
      return (logitCache[nTr] = { auc: auc(VAI, p), va: ll(VAI, p) });
    }
    let nTr = 1400, H = 32, reg = 'none', run = null, timer = null; const log = [];
    function makeRun() {
      const tr = TRI.slice(0, nTr), Z = stdz(tr), r = U.rng(7);
      const W1 = [], b1 = new Array(H).fill(0), W2 = []; let b2 = 0;
      for (let k = 0; k < H; k++) { W1.push(Array.from({ length: D }, () => U.randn(r) * Math.sqrt(2 / D))); W2.push(U.randn(r) * Math.sqrt(1 / H)); }
      const NP = H * D + H + H + 1, m = new Float64Array(NP), v = new Float64Array(NP), lr = .003, l2 = reg === 'l2' ? 3e-3 : 0, drop = reg === 'drop' ? .5 : 0;
      let step = 0;
      function fwd(i, train) { const z = Z[i], hh = new Array(H); let o = b2; for (let k = 0; k < H; k++) { let a = b1[k]; for (let j = 0; j < D; j++) a += W1[k][j] * z[j]; a = a > 0 ? a : 0; if (train && drop) a = r() < drop ? 0 : a / (1 - drop); hh[k] = a; o += W2[k] * a; } return [hh, sig(o)]; }
      function upd(q, g) { m[q] = .9 * m[q] + .1 * g; v[q] = .999 * v[q] + .001 * g * g; return lr * (m[q] / (1 - .9 ** step)) / (Math.sqrt(v[q] / (1 - .999 ** step)) + 1e-8); }
      function epoch() {
        const ord = tr.slice(); for (let i = ord.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [ord[i], ord[j]] = [ord[j], ord[i]]; }
        for (let bs = 0; bs < ord.length; bs += 32) {
          const Bt = ord.slice(bs, bs + 32), nb = Bt.length, gW1 = W1.map(w => new Array(D).fill(0)), gb1 = new Array(H).fill(0), gW2 = new Array(H).fill(0); let gb2 = 0;
          Bt.forEach(i => { const [hh, p] = fwd(i, true), d = p - Y[i]; gb2 += d; for (let k = 0; k < H; k++) { gW2[k] += d * hh[k]; if (hh[k] > 0) { const dk = d * W2[k] * (drop ? 1 / (1 - drop) : 1); gb1[k] += dk; for (let j = 0; j < D; j++) gW1[k][j] += dk * Z[i][j]; } } });
          step++; let q = 0;
          for (let k = 0; k < H; k++) for (let j = 0; j < D; j++) W1[k][j] -= upd(q++, gW1[k][j] / nb + l2 * W1[k][j]);
          for (let k = 0; k < H; k++) b1[k] -= upd(q++, gb1[k] / nb);
          for (let k = 0; k < H; k++) W2[k] -= upd(q++, gW2[k] / nb + l2 * W2[k]);
          b2 -= upd(q++, gb2 / nb);
        }
        const p = X.map((_, i) => fwd(i, false)[1]); return { tr: ll(tr, p), va: ll(VAI, p), auc: auc(VAI, p) };
      }
      return { ep: 0, hist: [], epoch, params: H * D + H + H + 1, cfg: { nTr, H, reg } };
    }
    const REGN = { none: '無', l2: 'L2', drop: 'Dropout 0.5' };
    const out = h('div');
    function draw() {
      out.innerHTML = '';
      const busy = !!timer, lock = fn => v => { if (!busy) { fn(v); run = null; } };
      const go = h('button', { class: 'btn primary' }, busy ? `訓練中… epoch ${run.ep}/${EPOCHS}` : '▶ 訓練 120 個 epoch'); go.disabled = busy;
      go.onclick = () => {
        run = makeRun(); logit(nTr);
        timer = setInterval(() => { for (let q = 0; q < 3 && run.ep < EPOCHS; q++) { run.hist.push(run.epoch()); run.ep++; } if (run.ep >= EPOCHS) { clearInterval(timer); timer = null; const b = run.hist.reduce((a, z, i) => z.va < a.z.va ? { z, i } : a, { z: run.hist[0], i: 0 }); log.unshift({ ...run.cfg, best: b.i + 1, auc: b.z.auc, gap: run.hist[EPOCHS - 1].va - run.hist[EPOCHS - 1].tr, lg: logit(run.cfg.nTr).auc }); if (log.length > 8) log.pop(); } draw(); }, 16);
        draw();
      };
      const lab = t => h('span', { style: { fontSize: '13px', color: 'var(--muted)' } }, t);
      out.append(h('div', { class: 'row', style: { gap: '10px', flexWrap: 'wrap', marginBottom: '10px' } }, go,
        lab('訓練筆數'), seg([[200, '200'], [600, '600'], [1400, '1,400']], () => nTr, lock(v => nTr = v), draw),
        lab('隱藏神經元'), seg([[4, '4'], [32, '32'], [64, '64']], () => H, lock(v => H = v), draw),
        lab('正則化'), seg([['none', '無'], ['l2', 'L2'], ['drop', 'Dropout']], () => reg, lock(v => reg = v), draw)));
      const L = logit(nTr), hs = run ? run.hist : [];
      const best = hs.length ? hs.reduce((a, z, i) => z.va < a.z.va ? { z, i } : a, { z: hs[0], i: 0 }) : null, last = hs[hs.length - 1];
      out.append(h('div', { class: 'kpi', style: { marginBottom: '10px' } },
        kpi('網路參數量', fmt(H * D + H + H + 1, 0) + ' 個'), kpi('參數 ÷ 訓練筆數', ((H * D + 2 * H + 1) / nTr).toFixed(2), (H * D + 2 * H + 1) / nTr > 1 ? 'bad' : ''),
        kpi('MLP 驗證 AUC（早停點）', best ? best.z.auc.toFixed(3) : '—', best && best.z.auc > L.auc + .01 ? 'good' : ''), kpi(`Logistic 驗證 AUC（同樣 ${fmt(nTr, 0)} 筆）`, L.auc.toFixed(3))));
      const g = h('div', { class: 'grid2', style: { gap: '18px', alignItems: 'start' } });
      const lcb = h('div'); lcb.append(sub('損失曲線：灰＝訓練、綠＝驗證、虛線＝Logistic 的驗證損失'));
      const ys = hs.flatMap(z => [z.tr, z.va]).concat([L.va]);
      U.lc(lcb, hs.length ? [{ pts: hs.map((z, i) => [i + 1, z.tr]), color: C.gray, w: 2 }, { pts: hs.map((z, i) => [i + 1, z.va]), color: C.accent, w: 2.4 }, { pts: [[1, L.va], [EPOCHS, L.va]], color: C.amber, w: 1.6, dash: '5 4' }] : [{ pts: [[1, L.va], [EPOCHS, L.va]], color: C.amber, w: 1.6, dash: '5 4' }],
        { w: 460, h: 260, xmin: 1, xmax: EPOCHS, ymin: Math.max(0, Math.min(...ys) - .02), ymax: Math.min(.7, Math.max(...ys) + .02), xl: 'Epoch', yl: 'log loss', legend: [['訓練', C.gray], ['驗證', C.accent], ['Logistic', C.amber, '5 4']], marks: best && hs.length === EPOCHS ? [{ x: best.i + 1, color: C.bad, label: '早停點' }] : [] });
      const rt = h('div'); rt.append(sub('你跑過的實驗（最新在上）'));
      if (!log.length) rt.append(h('div', { style: { fontSize: '13px', color: 'var(--muted)', padding: '8px 0' } }, '還沒有紀錄。建議依序試：①1,400 筆＋32 個＋無 ②200 筆＋64 個＋無 ③200 筆＋64 個＋Dropout ④1,400 筆＋4 個。'));
      else {
        const tb = h('div', { style: { display: 'grid', gridTemplateColumns: 'auto auto auto auto auto', gap: '4px 10px', fontSize: '12.5px' } });
        ['設定', '早停於', 'MLP AUC', 'Logistic', '差'].forEach(t => tb.append(h('b', null, t)));
        log.forEach(z => { const d = z.auc - z.lg; tb.append(h('div', null, `${fmt(z.nTr, 0)} 筆・${z.H} 個・${REGN[z.reg]}`), h('div', null, `第 ${z.best} 輪`), h('div', { style: { fontFamily: 'var(--mono)' } }, z.auc.toFixed(3)), h('div', { style: { fontFamily: 'var(--mono)' } }, z.lg.toFixed(3)), h('div', { style: { fontFamily: 'var(--mono)', color: d > .01 ? C.good : d < -.01 ? C.bad : C.ink } }, (d >= 0 ? '+' : '') + d.toFixed(3))); });
        rt.append(tb);
      }
      g.append(lcb, rt); out.append(g);
      let msg = '這是 M4 梯度提升用的同一份 2,000 次出院資料（9 個欄位、再入院率 14%）。按訓練，網路在你的瀏覽器裡用 Adam、batch 32 真的跑 120 個 epoch。';
      if (last && hs.length === EPOCHS) {
        const gap = last.va - last.tr, d = best.z.auc - L.auc;
        if (gap > .1) msg = `訓練損失一路降到 ${last.tr.toFixed(2)}，驗證損失卻在第 ${best.i + 1} 輪之後回升到 ${last.va.toFixed(2)}——典型的過擬合：${fmt(H * D + 2 * H + 1, 0)} 個參數對 ${fmt(nTr, 0)} 筆資料，網路在記答案。${reg === 'none' ? '試試切到 Dropout 或 L2，或乾脆減少神經元。' : '正則化有幫忙，但資料太少時救不了多少——早停仍然必要。'}`;
        else if (nTr <= 200) msg = `只有 200 筆訓練資料時，MLP 的驗證 AUC ${best.z.auc.toFixed(3)}，Logistic ${L.auc.toFixed(3)}——兩者都很弱，而且 MLP 不穩定。小樣本表格資料，先用簡單模型。`;
        else msg = `早停點的 MLP 驗證 AUC ${best.z.auc.toFixed(3)}，Logistic ${L.auc.toFixed(3)}，${Math.abs(d) <= .02 ? '差距在 0.02 以內' : d > 0 ? `MLP 多 ${d.toFixed(3)}` : `Logistic 反而多 ${(-d).toFixed(3)}`}；M4 的梯度提升在同一份資料上約 0.63。表格資料上三者差不多，但 Logistic 可以直接讀係數、GBDT 訓練幾秒就好——這就是第 18 節「什麼時候不該用深度學習」的第一道關卡。`;
      }
      out.append(note(msg, last && hs.length === EPOCHS && last.va - last.tr > .1 ? 'warn' : ''));
    }
    box.append(out); draw();
  })();

  /* ====================================================================
     ③ 第 14 節：自己畫一張圖，看 6 個卷積核各自看到什麼
     ==================================================================== */
  (function feat() {
    const box = $('#w-featmap'); if (!box) return;
    const N = 28, img = new Float32Array(N * N);
    const KER = [
      ['水平邊（筆畫上緣）', [[-1, -1, -1], [0, 0, 0], [1, 1, 1]]],
      ['垂直邊（筆畫左緣）', [[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]]],
      ['斜線 ↘', [[2, -1, -1], [-1, 2, -1], [-1, -1, 2]]],
      ['斜線 ↗', [[-1, -1, 2], [-1, 2, -1], [2, -1, -1]]],
      ['模糊（平均）', [[1, 1, 1], [1, 1, 1], [1, 1, 1]].map(r => r.map(v => v / 9))],
      ['輪廓（拉普拉斯）', [[-1, -1, -1], [-1, 8, -1], [-1, -1, -1]]]
    ];
    const put = (x, y, v) => { const xi = Math.round(x), yi = Math.round(y); for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { const X0 = xi + dx, Y0 = yi + dy; if (X0 < 0 || Y0 < 0 || X0 >= N || Y0 >= N) continue; const d = Math.hypot(X0 - x, Y0 - y), a = Math.max(0, 1 - d / 1.5) * v; img[Y0 * N + X0] = Math.min(1, Math.max(img[Y0 * N + X0], a)); } };
    const line = (x0, y0, x1, y1, v = 1) => { const st = Math.ceil(Math.hypot(x1 - x0, y1 - y0) * 2); for (let i = 0; i <= st; i++) put(x0 + (x1 - x0) * i / st, y0 + (y1 - y0) * i / st, v); };
    const PRE = {
      seven: ['數字 7', () => { line(7, 6, 21, 6); line(21, 6, 12, 22); }],
      zero: ['數字 0', () => { for (let a = 0; a < 6.3; a += .05) put(14 + 6 * Math.cos(a), 14 + 8.5 * Math.sin(a), 1); }],
      cross: ['X 字', () => { line(7, 7, 21, 21); line(21, 7, 7, 21); }],
      lung: ['模擬胸片結節', () => { [6, 11, 16, 21].forEach(y => { for (let x = 3; x <= 25; x += .5) put(x, y + .012 * (x - 14) ** 2, .45); }); for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) { const d = Math.hypot(x - 18, y - 13); img[y * N + x] = Math.min(1, Math.max(img[y * N + x], d < 3.6 ? 1 - .2 * d / 3.6 : 0)); } }]
    };
    let preset = 'seven';
    function load(k) { img.fill(0); preset = k; if (k) PRE[k][1](); }
    load('seven');
    function conv(K) { const M = N - 2, o = new Float32Array(M * M); for (let y = 0; y < M; y++) for (let x = 0; x < M; x++) { let s0 = 0; for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) s0 += K[i][j] * img[(y + i) * N + x + j]; o[y * M + x] = Math.max(0, s0); } return o; }
    function pool(a, M) { const P = M >> 1, o = new Float32Array(P * P); for (let y = 0; y < P; y++) for (let x = 0; x < P; x++) o[y * P + x] = Math.max(a[2 * y * M + 2 * x], a[2 * y * M + 2 * x + 1], a[(2 * y + 1) * M + 2 * x], a[(2 * y + 1) * M + 2 * x + 1]); return o; }
    function paint(cv, a, M, ink) {
      const ctx = cv.getContext('2d'), sc = cv.width / M, mx = Math.max(1e-6, ...a);
      for (let i = 0; i < M * M; i++) { const v = ink ? a[i] : a[i] / mx; const r0 = ink ? Math.round(250 - 222 * v) : Math.round(250 - 237 * v), g0 = ink ? Math.round(248 - 212 * v) : Math.round(248 - 141 * v), b0 = ink ? Math.round(244 - 196 * v) : Math.round(244 - 141 * v); ctx.fillStyle = `rgb(${r0},${g0},${b0})`; ctx.fillRect((i % M) * sc, Math.floor(i / M) * sc, Math.ceil(sc), Math.ceil(sc)); }
    }
    const out = h('div');
    const canvas = h('canvas', { width: 224, height: 224, style: { width: '224px', height: '224px', border: '1px solid var(--line)', borderRadius: '6px', touchAction: 'none', cursor: 'crosshair', imageRendering: 'pixelated' } });
    let down = false, last = null;
    const pos = e => { const r = canvas.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * N - .5, (e.clientY - r.top) / r.height * N - .5]; };
    canvas.addEventListener('pointerdown', e => { down = true; preset = null; canvas.setPointerCapture(e.pointerId); last = pos(e); put(...last, 1); refresh(); });
    canvas.addEventListener('pointermove', e => { if (!down) return; const p = pos(e); line(last[0], last[1], p[0], p[1]); last = p; refresh(); });
    canvas.addEventListener('pointerup', () => { down = false; refresh(true); });
    const ctl = h('div', { class: 'row', style: { gap: '8px', flexWrap: 'wrap', marginBottom: '10px' } });
    const presetBtns = Object.entries(PRE).map(([k, [lb]]) => { const b = h('button', { class: 'btn sm' }, lb); b.onclick = () => { load(k); refresh(true); }; return b; });
    const clr = h('button', { class: 'btn sm' }, '清空，自己畫'); clr.onclick = () => { load(null); refresh(true); };
    ctl.append(h('span', { style: { fontSize: '13px', color: 'var(--muted)' } }, '範例：'), ...presetBtns, clr);
    const maps = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(228px,1fr))', gap: '10px' } });
    const cells = KER.map(([nm, K]) => {
      const c1 = h('canvas', { width: 104, height: 104, style: { width: '72px', height: '72px', imageRendering: 'pixelated', borderRadius: '4px', flex: 'none' } });
      const c2 = h('canvas', { width: 104, height: 104, style: { width: '72px', height: '72px', imageRendering: 'pixelated', borderRadius: '4px', flex: 'none' } });
      const share = h('div', { style: { fontSize: '12px', fontFamily: 'var(--mono)', color: 'var(--muted)' } });
      const kg = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(3,16px)', gap: '1px', fontSize: '9px', fontFamily: 'var(--mono)', textAlign: 'center' } }, ...K.flat().map(v => h('span', { style: { background: v > 0 ? '#d5ebe8' : v < 0 ? '#f6dcd8' : '#f1efe9' } }, Number.isInteger(v) ? v : '⅑')));
      const el = h('div', { style: { border: '1px solid var(--line)', borderRadius: '8px', padding: '8px' } }, h('div', { style: { fontSize: '12.5px', fontWeight: 600, marginBottom: '4px' } }, nm), h('div', { style: { display: 'flex', gap: '6px', alignItems: 'center' } }, kg, c1, c2), h('div', { style: { marginTop: '3px', fontSize: '11px', color: 'var(--muted)' } }, '核 → 卷積＋ReLU（26×26）→ 池化（13×13）'), share);
      maps.append(el); return { nm, K, c1, c2, share };
    });
    const msgBox = h('div');
    function refresh(final) {
      paint(canvas, img, N, true);
      const tot = cells.map(c => { const a = conv(c.K); paint(c.c1, a, 26); paint(c.c2, pool(a, 26), 13); return S.sum(Array.from(a)); });
      const T = S.sum(tot) || 1, ink = S.sum(Array.from(img));
      cells.forEach((c, i) => { c.share.textContent = `反應總量占 ${Math.round(tot[i] / T * 100)}%`; });
      if (!final && down) return;
      msgBox.innerHTML = '';
      if (ink < 3) { msgBox.append(note('畫布是空的：所有核的輸出都是 0。在左邊用滑鼠或手指畫幾筆。')); return; }
      const edgeIdx = [0, 1, 2, 3], top = edgeIdx.slice().sort((a, b) => tot[b] - tot[a])[0];
      const diag = (tot[2] + tot[3]) / ((tot[0] + tot[1]) || 1);
      let msg = `四個方向核裡，你的圖在「${KER[top][0]}」反應最強。`;
      if (preset === 'lung') msg = '模擬胸片：水平邊核主要點亮四條肋骨的上緣，模糊核讓結節變成最亮的一團、細肋骨被淡化，拉普拉斯核則把結節輪廓描出來。每個核只負責一種局部圖案——CNN 第一層學到的就是這種東西，只是核是訓練出來的，不是人設計的。';
      else if (preset === 'cross') msg = `X 字：兩個斜線核各點亮一條筆畫（↘ 與 ↗ 互不干擾），水平／垂直邊核只剩零碎反應。斜線反應是水平＋垂直的 ${diag.toFixed(1)} 倍。`;
      else msg += '注意三件事：①ReLU 把負值砍掉，所以「水平邊」只抓筆畫上緣，下緣要靠另一個方向相反的核；②池化後只剩 1/4 的數字（13×13），形狀還認得出來——CNN 就是這樣一邊縮小、一邊保留「哪裡有什麼特徵」；③真實 CNN 第一層有 32–64 個這樣的核，第二層再把它們組合成角落、圓弧、紋理。';
      msgBox.append(note(msg));
    }
    const left = h('div', null, sub('畫布 28×28（與 MNIST 同大小）'), canvas);
    out.append(ctl, h('div', { style: { display: 'grid', gridTemplateColumns: '240px 1fr', gap: '16px', alignItems: 'start' }, class: 'featgrid' }, left, maps), msgBox);
    const st = h('style', null, '@media (max-width:700px){.featgrid{grid-template-columns:1fr !important}}');
    box.append(st, out); refresh(true);
  })();
  /* ====================================================================
     第 19 節：糖尿病視網膜病變 AI 從論文到診間（Gulshan 2016；IDx-DR 2018；Beede 2020）（2026-11-09 新增）
     ==================================================================== */
  (function dr() {
    const box = $('#w-dr'); if (!box) return;
    const lab = t => h('span', { style: { fontSize: '13px', color: 'var(--muted)' } }, t);
    const note = msg => h('div', { class: 'note', style: { marginTop: '10px' } }, h('b', null, '看懂了什麼：'), msg);
    const kpi = (k, v, cls) => h('div', null, h('div', { class: 'k' }, k), h('div', { class: 'v' + (cls ? ' ' + cls : '') }, v));
    const ST = { paper: ['論文回溯資料（Gulshan, JAMA 2016，EyePACS‑1）', 0.903, 0.981], fda: ['FDA 前瞻性試驗（IDx‑DR 2018，900 人）', 0.872, 0.907] };
    let st = 'fda', prev = 15, ung = 21; const res = h('div');
    function draw() {
      res.innerHTML = '';
      const [name, se, sp] = ST[st], N = 1000, UG = Math.round(N * ung / 100), G = N - UG, P = Math.round(G * prev / 100), Ng = G - P;
      const TP = Math.round(P * se), FN = P - TP, TN = Math.round(Ng * sp), FP = Ng - TN;
      res.append(h('div', { class: 'kpi', style: { margin: '10px 0' } }, kpi('照片不能判讀（要另外安排）', fmt(UG, 0), UG > 100 ? 'bad' : ''), kpi('抓到的病變', fmt(TP, 0), 'good'), kpi('漏掉的病變', fmt(FN, 0), 'bad'), kpi('誤報（多轉診）', fmt(FP, 0)), kpi('轉診中真的有病變', (TP / Math.max(1, TP + FP) * 100).toFixed(0) + '%')));
      const bars = h('div'); res.append(bars);
      U.hbars(bars, [{ label: '不能判讀', value: UG, color: C.amber }, { label: '真陽性', value: TP, color: C.good }, { label: '偽陰性', value: FN, color: C.bad }, { label: '偽陽性', value: FP, color: '#9aa3ad' }, { label: '真陰性', value: TN, color: '#c9d3dc' }], { w: 760, lw: 80, rowH: 26, max: N * 1.1 });
      res.append(note(`採用「${name}」的敏感度 ${(se * 100).toFixed(1)}%、特異度 ${(sp * 100).toFixed(1)}%。1,000 人裡有 ${UG} 人的照片${ung ? '品質不足' : ''}——泰國 11 家診所的實地研究中，這個比例超過五分之一，原因多是光線與瞳孔，和模型本身無關。這 ${UG} 人沒有得到 AI 的答案，仍要轉給眼科或重拍。${st === 'paper' ? '把階段切到 FDA 前瞻性試驗，特異度從 98% 掉到 91%，誤報會明顯增加——前瞻性、在基層實拍的數字才接近你上線後會看到的樣子。' : '切到論文回溯資料，數字會好看很多；但那是在整理好的資料集上，不是在你的診所。'}`));
    }
    box.append(h('div', { class: 'row' }, seg([['paper', '論文回溯'], ['fda', 'FDA 前瞻試驗']], () => st, v => st = v, draw), U.slider('病變盛行率', 2, 40, 1, () => prev, v => prev = v, draw, v => v + '%'), U.slider('照片不能判讀', 0, 40, 1, () => ung, v => ung = v, draw, v => v + '%')), res); draw();
  })();
})();
