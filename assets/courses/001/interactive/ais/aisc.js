/* AI Studio 補充教材加強版（2026-11）：真實 Titanic 891 位乘客——完整流程＋對應 Python、單次切分 vs 交叉驗證 */
(function () {
  'use strict';
  const { h, $, S, fmt, seg, check, slider, C } = U;
  const kpi = (k, v, cls) => h('div', null, h('div', { class: 'k' }, k), h('div', { class: 'v' + (cls ? ' ' + cls : '') }, v));
  const sub = t => h('div', { style: { fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' } }, t);
  const lab = t => h('span', { style: { fontSize: '13px', color: 'var(--muted)' } }, t);
  const note = (msg, cls) => h('div', { class: 'note' + (cls ? ' ' + cls : ''), style: { marginTop: '10px' } }, h('b', null, '看懂了什麼：'), msg);
  const pc = v => (v * 100).toFixed(1) + '%';
  const D = window.TITANIC; if (!D || !window.ML) return;
  const F = [['pclass', '艙等', 1], ['sex', '性別（女=1）', 2], ['age', '年齡', 3], ['sibsp', '兄弟姊妹配偶數', 4], ['parch', '父母子女數', 5], ['fare', '票價', 6], ['embarked', '登船港', 7]];
  const medAge = (() => { const a = D.filter(r => r[3] >= 0).map(r => r[3]).sort((x, y) => x - y); return a[Math.floor(a.length / 2)]; })();
  function prep(use, miss) {
    let rows = D.map((r, i) => ({ r, i }));
    if (miss === 'drop' && use.includes(2)) rows = rows.filter(z => z.r[3] >= 0);
    return rows.map(({ r, i }) => ({ i, y: r[0], x: use.map(k => { const c = F[k][2]; let v = r[c]; if (c === 3 && v < 0) v = medAge; if (c === 7 && v < 0) v = 0; return v; }) }));
  }
  const shuffle = (a, r) => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const acc = (t, P) => P.filter(p => (ML.treeP(t, p.x) >= .5 ? 1 : 0) === p.y).length / P.length;

  /* ====================================================================
     ① 第 09 節：真實 Titanic——同一個流程，兩種寫法
     ==================================================================== */
  (function titanic() {
    const box = $('#w-titanic'); if (!box) return;
    let use = [0, 1, 2], miss = 'median', depth = 3, ratio = .7, seed = 1992;
    const out = h('div');
    function rules(t, names, pre = '', outArr = []) {
      if (t.leaf) { outArr.push([pre || '（全部）', t.p, t.n]); return outArr; }
      const nm = names[t.j], tt = nm === '性別（女=1）' ? (t.t < 1 ? ['男性', '女性'] : null) : null;
      const L = tt ? tt[0] : `${nm} ≤ ${+t.t.toFixed(1)}`, Rr = tt ? tt[1] : `${nm} > ${+t.t.toFixed(1)}`;
      rules(t.l, names, pre ? pre + ' 且 ' + L : L, outArr); rules(t.r, names, pre ? pre + ' 且 ' + Rr : Rr, outArr); return outArr;
    }
    function draw() {
      out.innerHTML = '';
      out.append(h('div', { class: 'row', style: { gap: '6px 14px', flexWrap: 'wrap', marginBottom: '6px' } }, lab('Select Attributes：'), ...F.map((f, k) => check(f[1], () => use.includes(k), v => { use = v ? [...use, k].sort() : use.filter(z => z !== k); if (!use.length) use = [1]; }, draw))));
      out.append(h('div', { class: 'row', style: { gap: '10px 18px', flexWrap: 'wrap', marginBottom: '10px' } }, lab('年齡缺值（177 筆）'), seg([['median', 'Replace Missing（中位數）'], ['drop', 'Filter Examples（刪掉）']], () => miss, v => miss = v, draw), slider('Decision Tree 最大深度', 1, 8, 1, () => depth, v => depth = v, draw), slider('Split Data 訓練比例', .5, .9, .05, () => ratio, v => ratio = v, draw, v => Math.round(v * 100) + '%')));
      const P = prep(use, miss), r = U.rng(seed), sh = shuffle(P, r), ntr = Math.round(sh.length * ratio), tr = sh.slice(0, ntr), te = sh.slice(ntr);
      const t = ML.cart(tr, depth, { minLeaf: 5 }), aTr = acc(t, tr), aTe = acc(t, te), base = Math.max(S.mean(te.map(p => p.y)), 1 - S.mean(te.map(p => p.y)));
      const cm = [[0, 0], [0, 0]]; te.forEach(p => cm[p.y][ML.treeP(t, p.x) >= .5 ? 1 : 0]++);
      out.append(h('div', { class: 'kpi', style: { marginBottom: '10px' } }, kpi('使用筆數', `${P.length}（訓練 ${tr.length}／測試 ${te.length}）`), kpi('訓練集準確率', pc(aTr)), kpi('測試集準確率', pc(aTe), aTe - base > .1 ? 'good' : ''), kpi('全猜「死亡」的基準線', pc(base)), kpi('Recall（真的存活被找到）', pc(cm[1][1] / (cm[1][0] + cm[1][1])))));
      const g = h('div', { class: 'grid2', style: { gap: '18px', alignItems: 'start' } });
      const lt = h('div'); lt.append(sub('決策樹學到的規則（存活率＝這一群在訓練集裡活下來的比例）'));
      const names = use.map(k => F[k][1]), rs = rules(t, names).sort((a, b) => b[2] - a[2]).slice(0, 10);
      rs.forEach(([cond, p, n]) => lt.append(h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 64px 44px', gap: '6px', alignItems: 'center', fontSize: '12.5px', padding: '3px 0', borderTop: '1px dashed var(--line)' } }, h('div', null, cond), h('div', { style: { background: '#efece5', borderRadius: '3px' } }, h('i', { style: { display: 'block', height: '10px', borderRadius: '3px', background: p >= .5 ? C.good : C.bad, width: p * 100 + '%' } })), h('div', { style: { fontFamily: 'var(--mono)' } }, Math.round(p * 100) + '%'))));
      lt.append(h('div', { style: { fontSize: '12.5px', marginTop: '8px' } }, `混淆矩陣（測試集）：真死亡→判死亡 ${cm[0][0]}、判存活 ${cm[0][1]}；真存活→判死亡 ${cm[1][0]}、判存活 ${cm[1][1]}`));
      const py = h('div'); py.append(sub('同一個流程的 Python（scikit-learn）'));
      const cols = use.map(k => F[k][0]);
      py.append(h('pre', { style: { fontSize: '12px', background: '#1c2430', color: '#e8e4da', padding: '10px 12px', borderRadius: '8px', overflowX: 'auto', margin: 0, lineHeight: 1.55 } },
        `import seaborn as sns\nfrom sklearn.model_selection import train_test_split\nfrom sklearn.tree import DecisionTreeClassifier\n\ndf = sns.load_dataset("titanic")              # Retrieve\ndf["sex"] = (df["sex"] == "female").astype(int)\n` +
        (use.includes(6) ? 'df["embarked"] = df["embarked"].map({"S":0,"C":1,"Q":2}).fillna(0)\n' : '') +
        (use.includes(2) ? (miss === 'median' ? 'df["age"] = df["age"].fillna(df["age"].median())   # Replace Missing Values\n' : 'df = df.dropna(subset=["age"])                 # Filter Examples\n') : '') +
        `X = df[${JSON.stringify(cols)}]   # Select Attributes\ny = df["survived"]                            # Set Role → label\nX_tr, X_te, y_tr, y_te = train_test_split(\n    X, y, train_size=${ratio.toFixed(2)})            # Split Data\nmodel = DecisionTreeClassifier(max_depth=${depth},\n    min_samples_leaf=5).fit(X_tr, y_tr)        # Decision Tree\nprint(model.score(X_te, y_te))                # Apply Model + Performance`));
      g.append(lt, py); out.append(g);
      let msg = `這是真實的鐵達尼號乘客資料（891 人、存活 342 人）。`;
      if (!use.includes(1)) msg += `拿掉性別後，測試準確率只剩 ${pc(aTe)}——「婦女與小孩優先」讓性別成為最強的單一特徵。`;
      else msg += `樹的第一刀幾乎一定切在性別：女性存活率約 74%、男性約 19%。`;
      if (depth >= 6 && aTr - aTe > .05) msg += ` 深度 ${depth}：訓練集 ${pc(aTr)}、測試集 ${pc(aTe)}，差距 ${((aTr - aTe) * 100).toFixed(1)} 個百分點，開始在背訓練資料（過擬合）。`;
      if (miss === 'drop' && use.includes(2)) msg += ` 刪掉年齡缺值會丟掉 177 人（20%），而且缺值不是隨機的——三等艙乘客的年齡缺得最多，刪掉後資料就偏向富人。`;
      msg += ' 右邊的 Python 跟著你的設定即時改變：每一個運算子都對應一兩行程式碼。注意測試準確率只來自一次隨機切分——下一節會看到它有多不穩定。';
      out.append(note(msg));
    }
    box.append(out); draw();
  })();

  /* ====================================================================
     ② 第 10 節：一次切分 vs 10 折交叉驗證
     ==================================================================== */
  (function cvreal() {
    const box = $('#w-cvreal'); if (!box) return;
    let depth = 4; const cache = {};
    function run(dp) {
      if (cache[dp]) return cache[dp];
      const P = prep([0, 1, 2, 3, 4, 5], 'median'), r = U.rng(7);
      const splits = Array.from({ length: 60 }, () => { const sh = shuffle(P, r), n = Math.round(sh.length * .7); return acc(ML.cart(sh.slice(0, n), dp, { minLeaf: 5 }), sh.slice(n)); });
      const sh = shuffle(P, U.rng(11)), folds = Array.from({ length: 10 }, (_, f) => { const te = sh.filter((_, i) => i % 10 === f), tr = sh.filter((_, i) => i % 10 !== f); return acc(ML.cart(tr, dp, { minLeaf: 5 }), te); });
      return (cache[dp] = { splits, folds });
    }
    const out = h('div');
    function draw() {
      out.innerHTML = '';
      out.append(h('div', { class: 'row', style: { gap: '10px', marginBottom: '10px' } }, slider('決策樹深度', 1, 10, 1, () => depth, v => depth = v, draw)));
      const R0 = run(depth), sp = R0.splits, fd = R0.folds;
      const curve = Array.from({ length: 10 }, (_, i) => { const z = run(i + 1); return [i + 1, S.mean(z.folds), S.sd(z.folds)]; });
      out.append(h('div', { class: 'kpi', style: { marginBottom: '10px' } }, kpi('60 次隨機 70/30 切分：最低～最高', `${pc(Math.min(...sp))} ～ ${pc(Math.max(...sp))}`, 'bad'), kpi('10 折交叉驗證', `${pc(S.mean(fd))} ± ${(S.sd(fd) * 100).toFixed(1)}`, 'good'), kpi('最佳深度（交叉驗證平均最高）', curve.reduce((a, b) => b[1] > a[1] ? b : a)[0] + ' 層')));
      const g = h('div', { class: 'grid2', style: { gap: '18px', alignItems: 'start' } });
      const hb = h('div'); g.append(h('div', null, sub(`深度 ${depth}：60 次不同的隨機切分，測試準確率的分布（虛線＝10 折交叉驗證平均）`), hb));
      U.hist(hb, [{ values: sp, color: C.gray }], { w: 440, h: 220, bins: 18, min: .7, max: .9, xfmt: v => Math.round(v * 100) + '%', marks: [{ x: S.mean(fd), color: C.accent, label: 'CV 平均' }] });
      const lc = h('div'); g.append(h('div', null, sub('10 折交叉驗證：不同深度的平均準確率（陰影＝±1 標準差）'), lc));
      U.lc(lc, [{ pts: curve.map(z => [z[0], z[1]]), color: C.accent, w: 2.4, dots: true }], { w: 420, h: 220, xmin: 1, xmax: 10, ymin: .74, ymax: .86, xt: [1, 2, 4, 6, 8, 10], xl: '深度', yl: '準確率', yfmt: v => Math.round(v * 100) + '%', marks: [{ x: depth, color: C.bad }],
        under: [(sv, x, y) => U.s('polygon', { points: curve.map(z => `${x(z[0])},${y(Math.min(.86, z[1] + z[2]))}`).concat(curve.slice().reverse().map(z => `${x(z[0])},${y(Math.max(.74, z[1] - z[2]))}`)).join(' '), fill: C.accent, 'fill-opacity': .12 }, sv)] });
      out.append(g);
      out.append(note(`同一個模型、同一份資料，只是隨機切分不同，測試準確率就能從 ${pc(Math.min(...sp))} 跳到 ${pc(Math.max(...sp))}——如果你只切一次，剛好切到 ${pc(Math.max(...sp))}，就會以為模型很好。10 折交叉驗證讓每一筆資料都當過一次測試資料，給出平均 ${pc(S.mean(fd))} 和它的波動（± ${(S.sd(fd) * 100).toFixed(1)}）。用它來挑深度，才不會被運氣騙到。AI Studio 的 Cross Validation 運算子＝scikit-learn 的 cross_val_score(model, X, y, cv=10)。`));
    }
    box.append(out); draw();
  })();
})();
