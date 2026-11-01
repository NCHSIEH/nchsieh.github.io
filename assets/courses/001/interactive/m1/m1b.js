/* M1 互動頁 B：PART 06–09 */
(function () {
  'use strict';
  const { h, $, S, fmt, C, rng, randn, quiz } = U;
  const seg = (opts, get, set, redraw) => { const s = h('div', { class: 'seg' }); opts.forEach(([v, l]) => { const b = h('button', { class: get() === v ? 'on' : '' }, l); b.onclick = () => { set(v); redraw(); }; s.append(b); }); return s; };
  const slider = (label, min, max, step, get, set, redraw, f = v => v) => { const i = h('input', { type: 'range', min, max, step }); i.value = get(); const v = h('span', { class: 'val' }, f(get())); i.oninput = () => { set(+i.value); v.textContent = f(+i.value); redraw(); }; return h('label', { class: 'ctl' }, label, i, v); };
  const pickTop = (scores, n) => { const idx = scores.map((s, i) => [s, i]).sort((a, b) => b[0] - a[0]).slice(0, n).map(x => x[1]); const m = new Array(scores.length).fill(false); idx.forEach(i => m[i] = true); return m; };

  // ================= P06 遺失機制模擬器 =================
  (function () {
    const N = 600, r = rng(42);
    const age = [], glu = [], noise = [];
    for (let i = 0; i < N; i++) { age.push(20 + r() * 65); glu.push(70 + 30 * Math.exp(.45 * randn(r))); noise.push(randn(r)); }
    let mech = 'MNAR', rate = .58; const out = h('div');
    function miss() {
      const n = Math.round(N * rate);
      if (mech === 'MCAR') return pickTop(noise, n);
      if (mech === 'MAR') return pickTop(age.map((a, i) => -(a - 52) / 19 + noise[i] * .6), n);
      return pickTop(glu.map((g, i) => -(Math.log(g - 60) - 3.6) / .4 + noise[i] * .6), n);
    }
    function draw() {
      out.innerHTML = '';
      const m = miss(), obs = glu.filter((_, i) => !m[i]), all = glu;
      const mA = S.mean(all), mO = S.mean(obs), bias = (mO - mA) / mA * 100;
      const chart = h('div');
      U.hist(chart, [{ values: all, color: C.gray, opacity: .35 }, { values: obs, color: C.blue, opacity: .85 }], { min: 60, max: 260, bins: 40, w: 560, h: 230, xlabel: '空腹血糖 mg/dL', marks: [{ x: mA, label: `全體 ${fmt(mA, 0)}`, color: '#6b7280' }, { x: mO, label: `有驗者 ${fmt(mO, 0)}`, color: C.blue, dy: 26 }] });
      const ageM = S.mean(age.filter((_, i) => m[i])), ageO = S.mean(age.filter((_, i) => !m[i]));
      const diag = h('div');
      U.hbars(diag, [{ label: '缺失組', value: ageM, color: C.bad }, { label: '有值組', value: ageO, color: C.blue }], { w: 320, max: 70, lw: 60, fmt: v => fmt(v, 1) + ' 歲' });
      const diff = Math.abs(ageM - ageO);
      const txt = {
        MCAR: '缺不缺純粹是運氣。兩組年齡相近 → 傾向 MCAR；有驗者的平均幾乎不偏，刪除只損失樣本數。',
        MAR: '年輕人較少驗。兩組年齡明顯不同 → 「是否缺失」可由看得到的年齡預測 → 傾向 MAR，可用年齡建模填補。（本例血糖與年齡無關，所以平均幾乎不偏；若兩者相關就會偏。）',
        MNAR: '血糖正常的人根本沒去驗——缺失取決於看不到的值。注意：兩組年齡卻很接近，步驟 1 看起來跟 MCAR 一樣！MNAR 無法用觀測資料證明，只能靠領域知識。',
      }[mech];
      out.append(
        h('div', { class: 'row', style: { marginBottom: '10px' } }, seg([['MCAR', 'MCAR 完全隨機'], ['MAR', 'MAR 依年齡'], ['MNAR', 'MNAR 依血糖本身']], () => mech, v => mech = v, draw), slider('缺失比例', .1, .7, .01, () => rate, v => rate = v, draw, v => Math.round(v * 100) + '%')),
        h('div', { class: 'kpi', style: { marginBottom: '10px' } },
          h('div', null, h('div', { class: 'k' }, '全體平均（看不到的真相）'), h('div', { class: 'v' }, fmt(mA, 1))),
          h('div', null, h('div', { class: 'k' }, `有驗者平均（n=${obs.length}）`), h('div', { class: 'v' }, fmt(mO, 1))),
          h('div', null, h('div', { class: 'k' }, '偏差'), h('div', { class: 'v ' + (Math.abs(bias) > 3 ? 'bad' : 'good') }, (bias > 0 ? '+' : '') + fmt(bias, 1) + '%')),
          h('div', null, h('div', { class: 'k' }, '平均填補後的平均'), h('div', { class: 'v' }, fmt(mO, 1)), h('div', { class: 'k' }, '偏誤原封不動'))),
        h('div', { class: 'grid2' }, h('div', null, chart, h('div', { class: 'legend' }, h('span', null, h('i', { style: { background: C.gray, opacity: .5 } }), '全體（含沒驗的人）'), h('span', null, h('i', { style: { background: C.blue } }), '有驗、留在資料裡的人'))),
          h('div', null, h('div', { style: { fontWeight: 600, fontSize: '14px', marginBottom: '4px' } }, '判別步驟 1：比較兩組的其他欄位（年齡）'), diag, h('div', { class: 'mono', style: { fontSize: '13px', color: diff > 4 ? 'var(--bad)' : 'var(--good)' } }, `差 ${fmt(diff, 1)} 歲 → ${diff > 4 ? '分布不同' : '分布相近'}`), h('div', { class: 'note ' + (mech === 'MNAR' ? 'warn' : ''), style: { fontSize: '14px' } }, txt))));
    }
    $('#w-mech').append(out); draw();
  })();

  // ================= P06 情境分類 =================
  (function () {
    const Q = [
      ['骨密度：儀器當機那半天的病人都沒做', 'MCAR', '缺失原因與病人的任何特質都無關'],
      ['骨密度：年輕族群依規定不需常規檢查', 'MAR', '缺失與看得到的「年齡」有關 → 可用年齡建模填補'],
      ['骨密度：骨密度極差的人痛到做不完檢查', 'MNAR', '缺失與骨密度值本身有關；刪掉他們，模型會以為沒有人那麼差'],
      ['貫穿資料：收縮壓以 0 代表未量測，與任何欄位都無關', 'MCAR', '約 8% 的列，分組看不出差異'],
      ['貫穿資料：體重未量測——急診 39%、其他科 2–5%', 'MAR', '可由看得到的「科別」解釋'],
      ['貫穿資料：血糖正常的人根本沒去驗', 'MNAR', '只看有驗的人，平均血糖高估約 12%'],
      ['問卷：高收入者較常拒答收入題', 'MNAR', '缺失取決於收入本身'],
      ['紙本表單掃描時隨機掉頁', 'MCAR', '純粹是運氣'],
    ];
    const ans = {}; const out = h('div');
    function draw() {
      out.innerHTML = ''; let ok = 0;
      Q.forEach(([t, a, why], i) => {
        const row = h('div', { style: { display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 0', borderBottom: '1px solid var(--line)', flexWrap: 'wrap' } }, h('div', { style: { flex: '1 1 300px', fontSize: '14.5px' } }, t));
        ['MCAR', 'MAR', 'MNAR'].forEach(m => { const b = h('button', { class: 'btn sm' }, m); if (ans[i] === m) b.classList.add(m === a ? 'on' : 'wrong'); if (ans[i] === m && m !== a) b.style.cssText = 'background:var(--bad-soft);border-color:var(--bad)'; b.onclick = () => { ans[i] = m; draw(); }; row.append(b); });
        if (ans[i]) { if (ans[i] === a) ok++; row.append(h('div', { style: { flexBasis: '100%', fontSize: '13px', color: ans[i] === a ? 'var(--good)' : 'var(--bad)' } }, (ans[i] === a ? '✓ ' : `✗ 應為 ${a}：`) + why)); }
        out.append(row);
      });
      out.append(h('div', { class: 'row', style: { marginTop: '10px' } }, h('span', { class: 'tag ' + (ok === Q.length ? 'good' : 'gray') }, `答對 ${ok} / ${Q.length}`), h('span', { style: { fontSize: '13px', color: 'var(--muted)' } }, '醫療資料多屬 MAR 與 MNAR——新增 is_missing 指示欄位，讓「有沒有做這項檢查」本身成為特徵。')));
    }
    $('#w-sort').append(out); draw();
  })();

  // ================= P06 遺失模式圖 =================
  (function () {
    const r = rng(7), N = 30, cols = ['懷孕次數', '血糖', '血壓', '皮脂厚度', '胰島素', 'BMI', '糖化血色素'], rates = [0, .1, .07, .3, .47, .03, null];
    const P = []; for (let i = 0; i < N; i++) P.push({ age: Math.round(25 + r() * 60), u: cols.map(() => r()) });
    // 依目標比例決定缺失（以排序確保比例），糖化血色素依年齡：65 歲以下大量缺
    const M = P.map(() => new Array(cols.length).fill(false));
    cols.forEach((c, j) => { if (rates[j] == null) return; const n = Math.round(N * rates[j]); P.map((p, i) => [p.u[j], i]).sort((a, b) => a[0] - b[0]).slice(0, n).forEach(([, i]) => M[i][j] = true); });
    P.forEach((p, i) => { M[i][6] = p.age < 65 ? p.u[6] < .62 : p.u[6] < .05; });
    let sorted = false; const out = h('div');
    function draw() {
      out.innerHTML = '';
      const order = P.map((p, i) => i); if (sorted) order.sort((a, b) => P[b].age - P[a].age);
      const W = 560, cw = 62, ch = 9, lx = 90, top = 34, H = top + N * ch + 30;
      const sv = U.svgBox(h('div'), W, H);
      cols.forEach((c, j) => { U.s('text', { x: lx + j * cw + cw / 2, y: 14, 'text-anchor': 'middle', text: c, style: 'font-size:11px;fill:#1c2430' }, sv); const rate = M.filter(m => m[j]).length / N; U.s('text', { x: lx + j * cw + cw / 2, y: 27, 'text-anchor': 'middle', text: Math.round(rate * 100) + '%', style: `font-size:11px;font-family:var(--mono);fill:${rate > .25 ? C.bad : '#5d6774'}` }, sv); });
      order.forEach((i, k) => { cols.forEach((c, j) => U.s('rect', { x: lx + j * cw + 2, y: top + k * ch, width: cw - 4, height: ch - 1, fill: M[i][j] ? C.bad : '#d9e6e4' }, sv)); if (sorted && (k === 0 || (P[order[k - 1]].age >= 65) !== (P[i].age >= 65))) { U.s('text', { x: lx - 8, y: top + k * ch + 8, 'text-anchor': 'end', text: P[i].age >= 65 ? '65 歲以上 ↓' : '65 歲以下 ↓', style: 'font-size:11px;fill:#b45309;font-weight:600' }, sv); if (k) U.s('line', { x1: lx - 4, x2: lx + cols.length * cw, y1: top + k * ch - .5, y2: top + k * ch - .5, stroke: C.amber, 'stroke-width': 1.5, 'stroke-dasharray': '4 3' }, sv); } });
      if (!sorted) U.s('text', { x: lx - 8, y: top + 8, 'text-anchor': 'end', text: '病人（隨機順序）', style: 'font-size:11px;fill:#5d6774' }, sv);
      const b = h('button', { class: 'btn sm' + (sorted ? ' on' : '') }, sorted ? '✓ 已依年齡排序' : '依年齡排序'); b.onclick = () => { sorted = !sorted; draw(); };
      out.append(h('div', { class: 'row', style: { marginBottom: '8px' } }, b, h('span', { class: 'legend' }, h('span', null, h('i', { style: { background: C.bad } }), '缺失'), h('span', null, h('i', { style: { background: '#d9e6e4' } }), '有值'))), sv.parentNode,
        h('div', { class: 'note ' + (sorted ? '' : 'warn'), style: { fontSize: '14px' } }, sorted ? '糖化血色素：上半（65 歲以上）幾乎都有，下半大量缺——這是 MAR，不是隨機。若直接刪除有缺失的列，剩下的資料會嚴重偏向年長者。胰島素缺近一半：先決定整欄捨棄，還是保留並標記。' : '隨機順序下看不出規律。試著依年齡排序。'));
    }
    $('#w-pattern').append(out); draw();
  })();

  // ================= P06 偽裝成 0 =================
  (function () {
    const head = ['懷孕次數', '血糖', '血壓', '皮脂厚度', '胰島素', 'BMI'];
    const D = [[6, 148, 72, 35, 0, 33.6], [1, 85, 66, 29, 0, 26.6], [8, 183, 64, 0, 0, 23.3], [1, 89, 66, 23, 94, 28.1], [0, 137, 40, 35, 168, 43.1]];
    const truth = [false, true, true, true, true, true]; const pick = new Set(); let checked = false; const out = h('div');
    function draw() {
      out.innerHTML = '';
      const t = h('table', { class: 'dt' }, h('tr', null, h('th', null, 'ID'), head.map((c, j) => { const th = h('th', { style: { cursor: 'pointer', background: pick.has(j) ? 'var(--amber-soft)' : '' } }, (pick.has(j) ? '☑ ' : '☐ ') + c); th.onclick = () => { pick.has(j) ? pick.delete(j) : pick.add(j); checked = false; draw(); }; return th; })),
        D.map((r, i) => h('tr', null, h('td', null, i + 1), r.map((v, j) => h('td', { class: (checked && v === 0 && truth[j]) ? 'miss' : (v === 0 && pick.has(j) ? 'hl num' : 'num') }, (checked && v === 0 && truth[j]) ? '?' : v)))));
      const ok = head.every((_, j) => pick.has(j) === truth[j]);
      const b = h('button', { class: 'btn primary sm' }, 'Declare Missing Value（把 0 宣告為遺失）'); b.onclick = () => { checked = true; draw(); };
      out.append(h('p', { class: 'hint', style: { margin: '0 0 8px' } }, '點欄位名稱，勾選「0 在生理上不可能」的欄位，再按宣告。'), h('div', { class: 'row', style: { marginBottom: '8px' } }, b), h('div', { class: 'tscroll' }, t),
        checked ? h('div', { class: 'note ' + (ok ? '' : 'warn'), style: { fontSize: '14px' } }, ok ? '✓ 正確。懷孕次數 0 是有效值；血糖、血壓、皮脂厚度、胰島素、BMI 為 0 生理上不可能。接 Statistics 看每欄最小值，逐欄問「這個值可能嗎」。' : '再想想：哪一欄的 0 是真實可能的值？（提示：懷孕次數）其他欄位為 0 在生理上可能嗎？') : '',
        h('p', { class: 'ai' }, h('b', null, 'AI Studio：'), 'Declare Missing Value → Replace Missing Values 或 Impute Missing Values。Pima Indians Diabetes 是作業二（W8 發布）的指定資料。'));
    }
    $('#w-zero').append(out); draw();
  })();

  // ================= P06 填補比較 =================
  (function () {
    const N = 600, r = rng(11), X = [], u = [];
    for (let i = 0; i < N; i++) { X.push(Math.min(318, Math.exp(4.4 + .55 * randn(r)))); u.push(r()); }
    let rate = .45, meth = 'mean'; const out = h('div');
    function draw() {
      out.innerHTML = '';
      const miss = u.map(x => x < rate), obs = X.filter((_, i) => !miss[i]);
      const mean = S.mean(obs), med = S.median(obs);
      const res = { del: obs, mean: X.map((x, i) => miss[i] ? mean : x), med: X.map((x, i) => miss[i] ? med : x) };
      const ymax = Math.max(...['mean', 'med'].map(k => { const c = new Array(32).fill(0); res[k].forEach(v => c[Math.min(31, Math.floor(v / 10))]++); return Math.max(...c); })) * 1.05;
      const ch = h('div'); const fill = meth === 'mean' ? mean : meth === 'med' ? med : null;
      U.hist(ch, [{ values: X, color: '#6b7280', outline: true, dash: true }, { values: res[meth], color: C.accent, opacity: .8, highlight: fill == null ? null : (a, b) => fill >= a && fill < b, hcolor: C.amber }], { min: 0, max: 320, bins: 32, ymax, w: 560, h: 230, xlabel: '胰島素值', marks: fill == null ? [] : [{ x: fill, label: `填補值 ${fmt(fill, 0)}`, color: C.amber }] });
      const row = (name, a) => h('tr', null, h('td', null, name), h('td', { class: 'num' }, a.length), h('td', { class: 'num' }, fmt(S.mean(a), 1)), h('td', { class: 'num' }, fmt(S.median(a), 1)), h('td', { class: 'num' }, fmt(S.sd(a), 1)), h('td', { class: 'num' }, fmt(S.q(a, .75) - S.q(a, .25), 1)));
      const t = h('table', { class: 'dt' }, h('tr', null, ['', 'n', '平均', '中位數', '標準差', 'IQR'].map(x => h('th', null, x))), row('真實（看不到）', X), row('① 刪除', res.del), row('② 平均填補', res.mean), row('③ 中位數填補', res.med));
      const sdT = S.sd(X), sdM = S.sd(res.mean);
      out.append(h('div', { class: 'row', style: { marginBottom: '10px' } }, seg([['del', '① 刪除'], ['mean', '② 平均填補'], ['med', '③ 中位數填補']], () => meth, v => meth = v, draw), slider('缺失比例', .05, .65, .01, () => rate, v => rate = v, draw, v => Math.round(v * 100) + '%')),
        h('div', { class: 'grid2' }, h('div', null, ch, h('div', { class: 'legend' }, h('span', null, h('i', { style: { border: '1.5px dashed #6b7280', background: 'transparent' } }), '真實分布'), h('span', null, h('i', { style: { background: C.accent } }), '處理後'), h('span', null, h('i', { style: { background: C.amber } }), '被灌入的填補值'))),
          h('div', null, h('div', { class: 'tscroll' }, t), h('div', { class: 'note warn', style: { fontSize: '14px' } }, `平均填補讓標準差從 ${fmt(sdT, 1)} 降到 ${fmt(sdM, 1)}（低估 ${fmt((1 - sdM / sdT) * 100, 0)}%）——中間長出一根不存在的尖峰。偏態資料（平均 ${fmt(mean, 0)} ≫ 中位數 ${fmt(med, 0)}）用中位數較貼近多數人。`))));
    }
    $('#w-impute').append(out); draw();
  })();

  // ================= P07 離群值 =================
  (function () {
    const r = rng(5), base = []; for (let i = 0; i < 300; i++) base.push(Math.round(79 + 8 * randn(r)));
    const ext = [138, 132, 145, 128, 150, 141, 135, 147, 129, 152];
    let k = 3, zero = false, zt = 3, ik = 1.5; const out = h('div');
    function draw() {
      out.innerHTML = '';
      const D = base.concat(ext.slice(0, k), zero ? [0, 0, 0] : []);
      const m = S.mean(D), sd = S.sd(D), zl = m - zt * sd, zh = m + zt * sd;
      const q1 = S.q(D, .25), q3 = S.q(D, .75), iqr = q3 - q1, il = q1 - ik * iqr, ih = q3 + ik * iqr;
      const zF = D.filter(v => v < zl || v > zh), iF = D.filter(v => v < il || v > ih);
      const ch = h('div');
      const g = U.hist(ch, [{ values: D, color: C.accent, opacity: .8 }], { min: -5, max: 160, bins: 55, w: 600, h: 190, xlabel: '舒張壓 mmHg', marks: [{ x: zl, label: `z=−${zt}`, color: C.bad }, { x: zh, label: `z=+${zt}`, color: C.bad, anchor: 'end' }] });
      const bx = h('div'); const sv = U.svgBox(bx, 600, 70); const x = U.scale(-5, 160, 40, 588);
      U.s('text', { x: 4, y: 30, text: '盒鬚圖', style: 'font-size:11px;fill:#5d6774' }, sv);
      U.boxplot(sv, D, x, 26, 22, ik);
      [il, ih].forEach(v => U.s('line', { x1: x(v), x2: x(v), y1: 6, y2: 46, stroke: C.amber, 'stroke-dasharray': '3 3' }, sv));
      U.s('text', { x: x(ih) + 4, y: 60, text: `Q3+${ik}×IQR = ${fmt(ih, 0)}`, style: 'font-size:11px;fill:#b45309' }, sv);
      U.s('text', { x: x(il) - 4, y: 60, 'text-anchor': 'end', text: `Q1−${ik}×IQR = ${fmt(il, 0)}`, style: 'font-size:11px;fill:#b45309' }, sv);
      const zc = h('input', { type: 'checkbox' }); zc.checked = zero; zc.onchange = () => { zero = zc.checked; draw(); };
      out.append(h('div', { class: 'row', style: { marginBottom: '8px' } }, slider('加入極端高值', 0, 10, 1, () => k, v => k = v, draw, v => v + ' 個'), h('label', { class: 'ctl' }, zc, '加入 3 筆「0（未量測）」'), slider('z 門檻', 2, 4, .1, () => zt, v => zt = v, draw, v => (+v).toFixed(1)), h('label', { class: 'ctl' }, 'IQR 倍數', seg([[1.5, '1.5'], [3, '3']], () => ik, v => ik = v, draw))),
        ch, bx,
        h('div', { class: 'kpi', style: { marginTop: '6px' } },
          h('div', null, h('div', { class: 'k' }, '平均 / 標準差'), h('div', { class: 'v' }, `${fmt(m, 1)} / ${fmt(sd, 1)}`)),
          h('div', null, h('div', { class: 'k' }, `標準差法門檻 (|z|>${zt})`), h('div', { class: 'v' }, `${fmt(zl, 0)} ～ ${fmt(zh, 0)}`), h('div', { class: 'k' }, `標記 ${zF.length} 筆`)),
          h('div', null, h('div', { class: 'k' }, `IQR 法門檻 (${ik} 倍)`), h('div', { class: 'v' }, `${fmt(il, 0)} ～ ${fmt(ih, 0)}`), h('div', { class: 'k' }, `標記 ${iF.length} 筆`))),
        h('div', { class: 'note warn', style: { fontSize: '14px' } }, '觀察：極端值與「0」越多，標準差被撐得越大，z 門檻越寬，反而抓不到它們（遮蔽效應）。四分位數幾乎不動，所以 IQR 法較穩健。血壓 0 是遺失，不是離群值——應先轉成遺失再偵測。'),
        h('p', { class: 'ai' }, h('b', null, '另外兩種方法：'), '距離法（第 k 個最近鄰居有多遠，須先縮放）與密度法 LOF（周圍密度比鄰居稀疏多少，LOF 明顯 > 1）。W7 異常偵測會深入。AI Studio：Detect Outlier 系列會新增 outlier 欄位。'));
    }
    $('#w-out').append(out); draw();
  })();

  // ================= P07 逐筆判斷 =================
  (function () {
    const A = ['保留', '標記', '修正', '轉為遺失', '移除'];
    const CASES = [
      ['舒張壓 = 0', ['轉為遺失'], '生理上不可能 → 視為遺失，不是離群值。'],
      ['舒張壓 = 138（高血壓急症病人）', ['保留', '標記'], '可能但罕見——這可能就是你要找的重症個案。預設標記而非刪除。'],
      ['身高 = 1.62', ['修正'], '確認是誤填公尺 → ×100 修正為 162 公分（貫穿資料約 5.5%）。'],
      ['出生年 = 1899', ['轉為遺失'], '127 歲不合理且無法得知正確值 → 轉為遺失。'],
      ['住院費用 = 85 萬（器官移植）', ['保留', '標記'], '真實的極端值；若用途是找高花費者，刪掉會毀掉目標。可另做對數轉換。'],
      ['體重 = 6.2（同一人前後次皆約 62）', ['修正'], '小數點錯位，有前後紀錄可佐證 → 修正。'],
    ];
    const ans = {}; const out = h('div');
    function draw() {
      out.innerHTML = '';
      CASES.forEach(([t, ok, why], i) => {
        const row = h('div', { style: { padding: '8px 0', borderBottom: '1px solid var(--line)' } }, h('div', { class: 'row' }, h('div', { style: { flex: '1 1 260px', fontWeight: 600, fontSize: '14.5px' } }, t), ...A.map(a => { const b = h('button', { class: 'btn sm' }, a); if (ans[i] === a) { if (ok.includes(a)) b.classList.add('on'); else b.style.cssText = 'background:var(--bad-soft);border-color:var(--bad)'; } b.onclick = () => { ans[i] = a; draw(); }; return b; })));
        if (ans[i]) row.append(h('div', { style: { fontSize: '13px', marginTop: '4px', color: ok.includes(ans[i]) ? 'var(--good)' : 'var(--bad)' } }, (ok.includes(ans[i]) ? '✓ ' : `✗ 建議：${ok.join(' 或 ')}。`) + why));
        out.append(row);
      });
      out.append(h('p', { class: 'ai' }, '報告中務必說明處理方式與理由。若模型用途是「找出高風險者」，刪掉極端值會直接毀掉目標；建模後要單獨檢視被標記者的預測結果。'));
    }
    $('#w-outdec').append(out); draw();
  })();

  // ================= P08 標準化工作台（真實資料） =================
  (function () {
    const rows = U.parseCSV(M1DATA.main), head = rows[0], body = rows.slice(1);
    const col = n => body.map(r => r[head.indexOf(n)]);
    const raw = { 性別: col('性別'), 縣市: col('縣市'), 科別: col('科別') };
    const st = { trim: false, tai: false, en: false, sex: false };
    const STEPS = [['trim', 'Trim 去前後空白'], ['tai', 'Replace：台 → 臺'], ['en', '對照表：TAIPEI → 臺北市'], ['sex', '對照表：男/M/1 → M；女/F/0 → F']];
    const out = h('div');
    function clean(c, v) { if (st.trim) v = v.trim(); if (c === '縣市') { if (st.tai) v = v.replace(/台/g, '臺'); if (st.en && v.trim().toUpperCase() === 'TAIPEI') v = '臺北市'; } if (c === '性別' && st.sex) { const t = v.trim(); if (['男', 'M', '1'].includes(t)) v = 'M'; else if (['女', 'F', '0'].includes(t)) v = 'F'; } return v; }
    function draw() {
      out.innerHTML = '';
      const cbs = STEPS.map(([k, l]) => { const c = h('input', { type: 'checkbox' }); c.checked = st[k]; c.onchange = () => { st[k] = c.checked; draw(); }; return h('label', { class: 'ctl', style: { color: 'var(--ink)' } }, c, l); });
      const target = { 性別: 2, 縣市: 4, 科別: 5 };
      const grid = h('div', { class: 'grid3' });
      Object.keys(raw).forEach(c => {
        const cnt = {}; raw[c].forEach(v => { const k = clean(c, v); cnt[k] = (cnt[k] || 0) + 1; });
        const items = Object.entries(cnt).sort((a, b) => b[1] - a[1]).map(([k, v]) => ({ label: '「' + k.replace(/ $/, '␣') + '」', value: v, color: /\s$/.test(k) ? C.amber : C.accent }));
        const n = items.length, ok = n === target[c];
        const ch = h('div'); U.hbars(ch, items, { w: 300, lw: 80, rowH: 20, max: 760 });
        grid.append(h('div', { style: { background: '#fff', border: '1px solid ' + (ok ? 'var(--good)' : 'var(--line)'), borderRadius: '10px', padding: '10px' } }, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('b', null, c), h('span', { class: 'tag ' + (ok ? 'good' : 'amber') }, `${n} 類 ${ok ? '✓' : '→ 目標 ' + target[c]}`)), ch));
      });
      out.append(h('div', { class: 'row', style: { marginBottom: '10px', gap: '16px' } }, ...cbs), grid,
        h('p', { class: 'ai' }, h('b', null, 'AI Studio：'), 'Trim（2026.1 起另有 Trim/Strip）；Replace（正規表示式）；Map 或 Replace Dictionary。Transform Cases 屬 Text Processing 擴充、對象是文件，一般欄位請用 Generate Attributes 的 lower()／upper()。「內 科」這種中間空白要用 Replace。'));
    }
    $('#w-norm').append(out); draw();
  })();

  // ================= P08 LLM 對照表 =================
  (function () {
    const R = [['台北市', '臺北市', 1], ['臺北市', '臺北市', 1], ['TAIPEI', '臺北市', 1], ['台北 市', '臺北市', 1], ['北市', '臺北市', 1], ['台北縣', '臺北市', 0], ['新北', '新北市', 1]];
    const mk = {}; let checked = false; const out = h('div');
    function draw() {
      out.innerHTML = '';
      const flow = h('div', { class: 'row', style: { gap: '6px', marginBottom: '10px', fontSize: '13px' } }, ['① 取出不重複值（Statistics）', '② 本地 LLM 提對照（Ollama）', '③ 人工逐列確認', '④ 套用（Replace Dictionary）'].map((t, i) => h('span', { class: 'tag ' + (i === 2 ? 'amber' : 'gray') }, t)));
      const t = h('table', { class: 'dt' }, h('tr', null, h('th', null, '原始寫法'), h('th', null, 'LLM 建議'), h('th', null, '人工確認')), R.map(([a, b, ok], i) => { const s = h('div', { class: 'seg' }, ['✓', '✗'].map(x => { const bt = h('button', { class: mk[i] === x ? 'on' : '' }, x); bt.onclick = () => { mk[i] = x; checked = false; draw(); }; return bt; })); const td = h('td', null, s); if (checked) td.className = ((mk[i] === '✓') === !!ok) ? 'ok' : 'hl'; return h('tr', null, h('td', null, a), h('td', null, b), td); }));
      const b = h('button', { class: 'btn primary sm' }, '檢查'); b.onclick = () => { checked = true; draw(); };
      const all = R.every((r, i) => (mk[i] === '✓') === !!r[2]);
      out.append(flow, h('div', { class: 'grid2' }, h('div', null, h('div', { class: 'tscroll' }, t), h('div', { class: 'row', style: { marginTop: '8px' } }, b)),
        h('div', { style: { fontSize: '14px' } }, checked ? h('div', { class: 'note ' + (all ? '' : 'warn') }, all ? '✓ 抓到了：台北縣 2010 年已改制為新北市。LLM 依字面相似度猜，行政區改制這類「時間性知識」最容易出錯。' : '還有沒抓到或誤判的列。提示：想想行政區改制。') : null,
          h('ul', { style: { paddingLeft: '1.2em', color: 'var(--muted)', margin: '6px 0' } }, h('li', null, '只送不重複值：送 7 種寫法，不送 765 筆病歷——量小，也不交出個資'), h('li', null, '對照表要存檔：確認後就是清理規則，下次直接重跑，結果可重現'), h('li', null, '用本地模型：即使只是欄位值也可能敏感，用 M0 裝的 Ollama 跑'), h('li', null, '分工：LLM 負責「列出可能」，人負責「決定」')))));
    }
    $('#w-llm').append(out); draw();
  })();

  // ================= P08 三種重複 =================
  (function () {
    const box = $('#w-dup');
    box.append(h('div', { class: 'concept' }, h('div', null, h('b', null, '完全重複'), '所有欄位都一樣。Remove Duplicates（不指定欄位）直接去重。貫穿資料：14 筆（765 → 751）。'), h('div', null, h('b', null, '鍵值重複 ★ 最危險'), '主鍵重複但其他欄位不同。以主鍵 Aggregate 看 count > 1；要判斷是錯誤，還是本來就一對多。'), h('div', null, h('b', null, '語意重複'), '不同紀錄其實指同一個對象。姓名＋生日＋性別組合比對；跨院整合常見。')));
    quiz(box, { q: '門診主檔中，病歷號 P0088 出現 3 次，就診日與科別都不同。這是？', opts: ['完全重複，應直接刪掉兩筆', '鍵值重複，但可能本來就是一對多（一位病人多次就診）', '語意重複，需要模糊比對', '資料錯誤，整個病人刪除'], a: 1, ex: '先確認「一列到底代表什麼」。主檔一列是一次就診，所以同一病歷號多列是正常的粒度；真正的主鍵是就診序號。' });
  })();

  // ================= P09 r 滑桿 =================
  (function () {
    const n = 80, r0 = rng(21), ex = [], en = []; for (let i = 0; i < n; i++) { ex.push(randn(r0)); en.push(randn(r0)); }
    let target = .8, ushape = false; const out = h('div');
    const LV = [[.9, '極強', '幾乎是同一變數的兩種寫法', '必須移除其一'], [.8, '強', '共線性警戒區', '移除、合成或 Ridge'], [.7, '中強', '需留意，視樣本數而定', '可保留但檢查 VIF'], [.4, '中等', '一般可接受', '通常不必處理'], [0, '弱', '無共線性疑慮', '不必處理']];
    function draw() {
      out.innerHTML = '';
      const ys = ushape ? ex.map((x, i) => x * x + en[i] * .25) : ex.map((x, i) => target * x + Math.sqrt(Math.max(0, 1 - target * target)) * en[i]);
      const rr = S.r(ex, ys), a = Math.abs(rr), lv = LV.find(l => a >= l[0]);
      const ch = h('div', { style: { border: a >= .8 ? '2px solid var(--bad)' : '2px solid transparent', borderRadius: '10px' } });
      U.scatter(ch, ex.map((x, i) => ({ x, y: ys[i] })), { w: 360, h: 280, xmin: -3, xmax: 3, ymin: ushape ? -1 : -3.5, ymax: ushape ? 9 : 3.5, noGrid: true, xlabel: '變數 X', ylabel: '變數 Y' });
      const uc = h('input', { type: 'checkbox' }); uc.checked = ushape; uc.onchange = () => { ushape = uc.checked; draw(); };
      const tbl = h('table', { class: 'dt' }, h('tr', null, ['|r|', '強度', '共線性意義', '建議'].map(x => h('th', null, x))), LV.map((l, i) => h('tr', null, h('td', { class: l === lv ? 'hl mono' : 'mono' }, i === 0 ? '0.9–1.0' : `${l[0].toFixed(1)}–${LV[i - 1][0].toFixed(1)}`), h('td', { class: l === lv ? 'hl' : '' }, l[1]), h('td', { class: l === lv ? 'hl' : '' }, l[2]), h('td', { class: l === lv ? 'hl' : '' }, l[3]))));
      out.append(h('div', { class: 'row', style: { marginBottom: '8px' } }, slider('目標 r', -1, 1, .01, () => target, v => target = v, draw, v => (+v).toFixed(2)), h('label', { class: 'ctl' }, uc, '改成 U 型關係')),
        h('div', { class: 'grid2' }, ch, h('div', null,
          h('div', { class: 'kpi', style: { marginBottom: '10px' } }, h('div', null, h('div', { class: 'k' }, '實際 r'), h('div', { class: 'v ' + (a >= .8 ? 'bad' : '') }, rr.toFixed(2))), h('div', null, h('div', { class: 'k' }, 'r²（共享變異）'), h('div', { class: 'v' }, Math.round(rr * rr * 100) + '%'))),
          h('div', { style: { height: '10px', background: 'var(--line)', borderRadius: '5px', overflow: 'hidden', marginBottom: '10px' } }, h('div', { style: { width: (rr * rr * 100) + '%', height: '100%', background: a >= .8 ? C.bad : C.accent } })),
          tbl,
          h('div', { class: 'note ' + (ushape ? 'warn' : ''), style: { fontSize: '14px' } }, ushape ? `U 型關係：r = ${rr.toFixed(2)}，接近 0，但兩者其實有很強的非線性關係。Pearson r 只抓線性——所以一定要搭配散布圖看。` : '|r| 只看強度不看方向：−0.88 與 +0.88 一樣強。切點是慣例而非鐵律；要做因素解釋時應更嚴格。'))));
    }
    $('#w-rslider').append(out); draw();
  })();

  // ================= P09 手算 r =================
  (function () {
    const D = [[120, 78], [132, 85], [118, 74], [145, 94], [138, 90], [126, 82]];
    const out = h('div'); const res = h('div');
    function calc() {
      res.innerHTML = '';
      const x = D.map(d => d[0]), y = D.map(d => d[1]), mx = S.mean(x), my = S.mean(y);
      const dx = x.map(v => v - mx), dy = y.map(v => v - my), p = dx.map((v, i) => v * dy[i]);
      const sp = S.sum(p), sx = S.sum(dx.map(v => v * v)), sy = S.sum(dy.map(v => v * v)), den = Math.sqrt(sx * sy), r = sp / den;
      const t = h('table', { class: 'dt' }, h('tr', null, ['病人', '收縮壓 x', '舒張壓 y', 'x−x̄', 'y−ȳ', '(x−x̄)(y−ȳ)', '(x−x̄)²', '(y−ȳ)²'].map(c => h('th', null, c))),
        D.map((d, i) => h('tr', null, h('td', null, 'P' + (i + 1)), [0, 1].map(j => { const inp = h('input', { type: 'number', value: d[j], style: { width: '64px' } }); inp.oninput = () => { const v = parseFloat(inp.value); if (!isNaN(v)) { D[i][j] = v; calc(); inp2focus(i, j); } }; return h('td', { 'data-c': i + '-' + j }, inp); }), [dx[i], dy[i], p[i], dx[i] ** 2, dy[i] ** 2].map((v, k) => h('td', { class: 'num' + (k === 2 ? ' hl' : '') }, fmt(v, 2)))),),
        h('tr', null, h('td', { style: { fontWeight: 700 } }, '合計'), h('td', { class: 'num' }, 'x̄=' + fmt(mx, 2)), h('td', { class: 'num' }, 'ȳ=' + fmt(my, 2)), h('td'), h('td'), h('td', { class: 'num hl', style: { fontWeight: 700 } }, fmt(sp, 2)), h('td', { class: 'num', style: { fontWeight: 700 } }, fmt(sx, 2)), h('td', { class: 'num', style: { fontWeight: 700 } }, fmt(sy, 2))));
      res.append(h('div', { class: 'tscroll' }, t), h('div', { class: 'note', style: { fontSize: '15px', fontFamily: 'var(--mono)' } },
        h('div', null, 'r = Σ(x−x̄)(y−ȳ) ÷ √( Σ(x−x̄)² × Σ(y−ȳ)² )'),
        h('div', null, `分子 = ${fmt(sp, 2)}`), h('div', null, `分母 = √(${fmt(sx, 2)} × ${fmt(sy, 2)}) = ${fmt(den, 2)}`),
        h('div', { style: { fontSize: '18px', fontWeight: 700, color: Math.abs(r) >= .8 ? 'var(--bad)' : 'var(--ink)' } }, `r = ${fmt(sp, 2)} ÷ ${fmt(den, 2)} = ${isNaN(r) ? '—' : r.toFixed(4)}`)),
        h('p', { class: 'ai' }, '分子：x 與 y 是否一起偏離各自的平均（同方向 → 正）。分母：把單位除掉，所以 r 無單位、落在 −1 到 +1。★ 本例為教學用數字；真實族群收縮壓與舒張壓 r 約 0.6–0.75。AI Studio：Correlation Matrix 一次算完。'));
    }
    let focusKey = null; function inp2focus(i, j) { const el = res.querySelector(`td[data-c="${i}-${j}"] input`); if (el) { el.focus(); const v = el.value; el.value = ''; el.value = v; } }
    const reset = h('button', { class: 'btn sm' }, '還原講義數字'); reset.onclick = () => { [[120, 78], [132, 85], [118, 74], [145, 94], [138, 90], [126, 82]].forEach((d, i) => D[i] = d); calc(); };
    out.append(h('div', { class: 'row', style: { marginBottom: '8px' } }, reset, h('span', { style: { fontSize: '13px', color: 'var(--muted)' } }, '試試：把 P4 的舒張壓改成 70，r 會掉多少？')), res);
    $('#w-hand').append(out); calc();
  })();

  // ================= P09 相關矩陣 =================
  (function () {
    const V = ['年齡', '身高', '體重', 'BMI', '收縮壓', '舒張壓'];
    const M = [[1, -.11, .06, .13, .34, .18], [-.11, 1, .7, -.09, -.04, -.02], [.06, .7, 1, .85, .21, .16], [.13, -.09, .85, 1, .26, .2], [.34, -.04, .21, .26, 1, .63], [.18, -.02, .16, .2, .63, 1]];
    const NOTE = { '2-3': 'BMI 由體重計算而來（體重 ÷ 身高²），高度共線。迴歸只放其一，或用 Ridge。', '1-2': '個子高通常較重。可合成成 BMI 取代兩者。', '4-5': '同一次量測的兩個面向。可合成「脈壓＝收縮壓−舒張壓」。', '0-4': '年齡增加收縮壓上升，屬中低相關，通常不必處理。' };
    let sel = [2, 3]; const out = h('div');
    function draw() {
      out.innerHTML = '';
      const cs = 52, lx = 60, ty = 26, W = lx + cs * 6 + 10, H = ty + cs * 6 + 10;
      const sv = U.svgBox(h('div'), W, H);
      V.forEach((v, i) => { U.s('text', { x: lx + i * cs + cs / 2, y: 16, 'text-anchor': 'middle', text: v, style: 'font-size:11px;fill:#1c2430' }, sv); U.s('text', { x: lx - 6, y: ty + i * cs + cs / 2 + 4, 'text-anchor': 'end', text: v, style: 'font-size:11px;fill:#1c2430' }, sv); });
      M.forEach((row, i) => row.forEach((r, j) => { const a = Math.abs(r); const g = U.s('g', { style: 'cursor:pointer' }, sv); U.s('rect', { x: lx + j * cs + 1, y: ty + i * cs + 1, width: cs - 2, height: cs - 2, rx: 4, fill: i === j ? '#eceae4' : `rgba(13,107,103,${Math.min(1, a * 1.05)})`, stroke: (sel[0] === i && sel[1] === j) || (sel[0] === j && sel[1] === i) ? C.amber : (a >= .8 && i !== j ? C.bad : 'none'), 'stroke-width': 2.5 }, g); U.s('text', { x: lx + j * cs + cs / 2, y: ty + i * cs + cs / 2 + 4, 'text-anchor': 'middle', text: r.toFixed(2), style: `font-size:12px;font-family:var(--mono);fill:${a > .5 && i !== j ? '#fff' : '#1c2430'}` }, g); g.addEventListener('click', () => { if (i !== j) { sel = [i, j]; draw(); } }); }));
      const [i, j] = sel, r = M[i][j], key = [Math.min(i, j), Math.max(i, j)].join('-');
      const rr = rng(99 + i * 7 + j), pts = []; for (let k = 0; k < 70; k++) { const x = randn(rr), e = randn(rr); pts.push({ x, y: r * x + Math.sqrt(1 - r * r) * e }); }
      const sc = h('div'); U.scatter(sc, pts, { w: 280, h: 200, xmin: -3, xmax: 3, ymin: -3.5, ymax: 3.5, noGrid: true, xlabel: V[j] + '（標準化）', ylabel: V[i] });
      const a = Math.abs(r);
      out.append(h('div', { class: 'grid2' }, sv.parentNode, h('div', null, h('div', { style: { fontWeight: 700, fontSize: '16px' } }, `${V[i]} × ${V[j]}`), h('div', { class: 'kpi', style: { margin: '6px 0' } }, h('div', null, h('div', { class: 'k' }, 'r'), h('div', { class: 'v ' + (a >= .8 ? 'bad' : '') }, r.toFixed(2))), h('div', null, h('div', { class: 'k' }, 'r²'), h('div', { class: 'v' }, Math.round(r * r * 100) + '%'))), sc,
        h('div', { class: 'note ' + (a >= .8 ? 'bad' : a >= .6 ? 'warn' : ''), style: { fontSize: '14px' } }, NOTE[key] || (a < .4 ? '弱相關，無共線性疑慮。' : '中等相關，一般可接受。')))),
        h('p', { class: 'ai' }, '三種處理：移除其一、合成新變數（BMI、脈壓）、或改用 Ridge 正則化。只做預測時影響有限；要回答「哪個因素重要」就必須處理。（模擬資料 300 筆）'));
    }
    $('#w-matrix').append(out); draw();
  })();
})();
