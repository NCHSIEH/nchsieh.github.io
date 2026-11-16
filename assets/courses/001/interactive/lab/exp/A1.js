/* A1 遺失值補值 */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = LAB.data.columns('clinic', ['age', 'bmi', 'glu']);
  const FEATS = ['age', 'bmi', 'glu'];
  const FLAB = { age: '年齡', bmi: 'BMI', glu: '空腹血糖' };
  const AX = { x: { label: '年齡（歲）', min: 20, max: 90 }, y: { label: '空腹血糖（mg/dL）', min: 60, max: 220 } };
  const pick = r => ({ id: r.id, age: r.age, bmi: r.bmi, glu: r.glu });

  function makeRows(seed) {
    const raw = LAB.data.clinic(seed, 12).map(pick);
    const out = LAB.data.withMissing(raw, FEATS, 0.16, seed);
    // 確保三個欄位各有至少 2 個缺格，且沒有整列全空
    FEATS.forEach((k, fi) => {
      let cnt = out.filter(r => r[k] == null).length;
      for (let idx = fi; cnt < 2 && idx < out.length; idx += 3) {
        if (out[idx][k] != null && FEATS.filter(f2 => out[idx][f2] == null).length < 2) {
          out[idx][k] = null;
          cnt++;
        }
      }
      if (out.every(r => r[k] == null)) out[0][k] = raw[0][k];
    });
    out.forEach((r, i) => { if (FEATS.every(k => r[k] == null)) r.age = raw[i].age; });
    return out;
  }

  function colStats(rows, k) {
    const vals = rows.map(r => r[k]).filter(v => v != null);
    return { vals, mean: M.mean(vals), median: M.median(vals), sd: M.sd(vals) };
  }

  function nanDist(a, b) {
    let s = 0, cnt = 0;
    FEATS.forEach(k => { if (a[k] != null && b[k] != null) { s += (a[k] - b[k]) * (a[k] - b[k]); cnt++; } });
    return cnt > 0 ? Math.sqrt((FEATS.length / cnt) * s) : Infinity;
  }

  function runMethod(rows, method, kVal) {
    const out = rows.map(r => Object.assign({}, r));
    const blanks = [];
    rows.forEach((r, idx) => FEATS.forEach(k => { if (r[k] == null) blanks.push({ idx, id: r.id, col: k }); }));
    const stats = {};
    FEATS.forEach(k => { stats[k] = colStats(rows, k); });
    const kUse = Math.max(1, Math.round(kVal || 3));
    const details = blanks.map(b => {
      const r = rows[b.idx];
      if (method === 'mean') {
        const st = stats[b.col], val = st.mean;
        out[b.idx][b.col] = val;
        return Object.assign({ val, st, nbs: [] }, b);
      }
      if (method === 'median') {
        const st = stats[b.col], val = st.median;
        out[b.idx][b.col] = val;
        return Object.assign({ val, sorted: st.vals.slice().sort((a, b2) => a - b2), nbs: [] }, b);
      }
      const cands = rows.filter(x => x.id !== r.id && x[b.col] != null)
        .map(x => ({ id: x.id, val: x[b.col], d: nanDist(r, x) }))
        .filter(x => Number.isFinite(x.d))
        .sort((a, b2) => a.d - b2.d || a.id - b2.id);
      const nbs = cands.slice(0, Math.min(kUse, cands.length));
      const val = nbs.length ? M.mean(nbs.map(n => n.val)) : stats[b.col].mean;
      out[b.idx][b.col] = val;
      return Object.assign({ val, nbs }, b);
    });
    const after = {};
    FEATS.forEach(k => { after[k] = colStats(out, k); });
    return { blanks, details, out, before: stats, after };
  }

  LAB.register({
    id: 'A1', group: 'A', title: '遺失值補值',
    module: { name: 'M1 第 06 節', url: '../m1/#p06' },
    goal: '看懂平均數、中位數與 k-NN 三種補值法如何算出缺格數值，並比較它們對欄位平均與標準差的影響。',
    data: {
      name: 'clinic',
      scenario: '門診健檢：部分病人的年齡、BMI 或空腹血糖漏填，建模前需要先補齊',
      columns: COLS,
      editable: ['age', 'bmi', 'glu'],
      small: seed => makeRows(seed)
    },
    params: [
      { key: 'method', label: '補值方法', type: 'choice', value: 'mean', options: [{ v: 'mean', label: '平均數' }, { v: 'median', label: '中位數' }, { v: 'knn', label: 'k-NN' }] },
      { key: 'k', label: 'K（k-NN 鄰居數）', type: 'int', min: 1, max: 5, step: 1, value: 3 }
    ],
    pseudo: [
      '掃描資料表，標出所有缺格',
      '依選擇的方法準備統計量：',
      '  平均數：算各欄現有值的平均',
      '  中位數：現有值排序後取中間',
      '  k-NN：依共有欄位算距離找鄰居',
      '逐個缺格填入補值',
      '比較補值前後各欄的平均與標準差'
    ],
    build(rows, p) {
      const R = runMethod(rows, p.method, p.k);
      const Rmean = runMethod(rows, 'mean', p.k);
      const Rmed = runMethod(rows, 'median', p.k);
      const Rknn = runMethod(rows, 'knn', p.k);
      const steps = [];

      function views(st) {
        const trs = rows.map((r, ri) => {
          const cells = [r.id];
          FEATS.forEach(col => {
            const orig = r[col];
            const det = R.details.find(d => d.idx === ri && d.col === col);
            const filled = det && st.filled.has(ri + '_' + col);
            const cur = st.cur && st.cur.idx === ri && st.cur.col === col;
            if (orig != null) {
              cells.push(orig);
            } else if (filled) {
              cells.push({ v: f(det.val, col === 'bmi' ? 1 : 2), cls: 'new', hl: cur });
            } else {
              cells.push({ v: '缺值', cls: cur ? 'hl' : 'cut', hl: cur });
            }
          });
          return { id: r.id, cells, hl: st.cur && st.cur.id === r.id };
        });
        const side = {
          type: 'table', slot: 'side',
          title: '門診健檢補值表（共 ' + R.blanks.length + ' 個缺格）',
          cols: [{ key: 'id', label: '#' }, { key: 'age', label: '年齡' }, { key: 'bmi', label: 'BMI' }, { key: 'glu', label: '空腹血糖' }],
          rows: trs,
          hlCol: st.cur ? st.cur.col : null
        };
        const points = rows.map((r, ri) => {
          const ageF = st.filled.has(ri + '_age') ? R.out[ri].age : r.age;
          const gluF = st.filled.has(ri + '_glu') ? R.out[ri].glu : r.glu;
          const x = ageF != null ? ageF : R.before.age.mean;
          const y = gluF != null ? gluF : R.before.glu.mean;
          const hasMiss = r.age == null || r.glu == null;
          const isCur = st.cur && st.cur.id === r.id;
          return {
            id: 'p' + r.id, x, y,
            cls: isCur ? 'hl' : hasMiss ? 'c1' : 'c0',
            hollow: hasMiss && !(st.filled.has(ri + '_age') || st.filled.has(ri + '_glu')),
            ring: hasMiss, hl: isCur, label: String(r.id), r: 6
          };
        });
        const lines = [];
        if (st.cur && p.method === 'knn') {
          const det = R.details.find(d => d.idx === st.cur.idx && d.col === st.cur.col);
          const curPt = points.find(pt => pt.id === 'p' + st.cur.id);
          if (det && curPt) {
            det.nbs.forEach((nb, ni) => {
              const nbPt = points.find(pt => pt.id === 'p' + nb.id);
              if (nbPt) lines.push({ id: 'kn' + ni, x1: curPt.x, y1: curPt.y, x2: nbPt.x, y2: nbPt.y, cls: 'hl', dash: true, w: 1.8 });
            });
          }
        }
        const main = {
          type: 'scatter', slot: 'main', title: '年齡 × 血糖位置（空心＝待補）',
          axes: AX, points, lines, circles: [],
          legend: [{ cls: 'c0', label: '完整資料' }, { cls: 'c1', label: '含缺值／已補' }]
        };
        const colShow = st.barCol || 'glu';
        const bef = R.before[colShow], aft = st.done ? R.after[colShow] : bef;
        const bars = st.done ? {
          type: 'bars', slot: 'bottom',
          title: FLAB[colShow] + ' 標準差比較：補前 vs 三種補值法',
          digits: 2,
          items: [
            { id: 'bs', label: '補前標準差', value: bef.sd, cls: 'c0' },
            { id: 'sm', label: '平均數法', value: Rmean.after[colShow].sd, cls: 'c1' },
            { id: 'sd', label: '中位數法', value: Rmed.after[colShow].sd, cls: 'c2' },
            { id: 'sk', label: 'k-NN 法', value: Rknn.after[colShow].sd, cls: 'c3' }
          ]
        } : {
          type: 'bars', slot: 'bottom',
          title: FLAB[colShow] + '：補值前後平均與標準差',
          digits: 2,
          items: [
            { id: 'bm', label: '補前平均', value: bef.mean, cls: 'c0' },
            { id: 'am', label: '補後平均', value: aft.mean, cls: st.done ? 'c2' : 'c5' },
            { id: 'bs', label: '補前標準差', value: bef.sd, cls: 'c1' },
            { id: 'as', label: '補後標準差', value: aft.sd, cls: st.done ? 'c3' : 'c5' }
          ]
        };
        return [main, side, bars];
      }

      const st = { filled: new Set(), cur: null, barCol: 'glu', done: false };
      const add = (line, title, say, calc, extra) => steps.push(Object.assign({ line, title, say, calc: calc || [], views: views(st), focus: st.cur ? [st.cur.id] : [] }, extra));

      const missLines = FEATS.map(k => {
        const ids = R.blanks.filter(b => b.col === k).map(b => b.id + '號').join('、');
        return FLAB[k] + '缺：' + (ids || '無');
      });
      add(0, '題目', '這份 12 位病人的資料共缺少 ' + R.blanks.length + ' 格。請觀察如何用「' + (p.method === 'mean' ? '平均數' : p.method === 'median' ? '中位數' : 'k-NN') + '」把缺格補齊。', missLines);

      FEATS.forEach(k => {
        const b = R.before[k];
        st.barCol = k;
        add(p.method === 'mean' ? 3 : p.method === 'median' ? 4 : 5,
          '統計：' + FLAB[k],
          FLAB[k] + '共有 ' + b.vals.length + ' 筆有效值，先記下補值前的平均、中位數與標準差。',
          ['平均 = ' + f(b.mean, 2) + '，中位數 = ' + f(b.median, 2), '標準差 = ' + f(b.sd, 2)]
        );
      });

      R.details.forEach((d, idx) => {
        st.cur = { idx: d.idx, id: d.id, col: d.col };
        st.barCol = d.col;
        if (p.method === 'mean') {
          add(3, '計算：' + d.id + '號' + FLAB[d.col], '將' + FLAB[d.col] + '現有 ' + d.st.vals.length + ' 筆數值相加除以筆數。', [
            '總和 ÷ ' + d.st.vals.length + ' = ' + f(M.sum(d.st.vals), 1) + ' ÷ ' + d.st.vals.length,
            '補值 = ' + f(d.val, 2)
          ], { phase: (idx + 1) + ' / ' + R.details.length });
        } else if (p.method === 'median') {
          const mid = d.sorted.length % 2 === 1 ? '正中間第 ' + ((d.sorted.length + 1) / 2) + ' 筆' : '中間兩筆平均';
          add(4, '排序：' + d.id + '號' + FLAB[d.col], '將' + FLAB[d.col] + '現有值由小到大排序，取' + mid + '。', [
            '排序：' + d.sorted.slice(0, 6).map(v => f(v, d.col === 'bmi' ? 1 : 0)).join(', ') + (d.sorted.length > 6 ? '…' : ''),
            '中位數 = ' + f(d.val, 2)
          ], { phase: (idx + 1) + ' / ' + R.details.length });
        } else {
          add(5, '找鄰居：' + d.id + '號' + FLAB[d.col], '用兩筆共有非空欄位的縮放歐氏距離（nan_euclidean），挑最近的 ' + d.nbs.length + ' 位。', [
            '最近 ' + d.nbs.length + ' 位：' + d.nbs.map(n => n.id + '號(' + f(n.val, 1) + ', d=' + f(n.d, 1) + ')').join('、'),
            '平均補值 = ' + f(d.val, 2)
          ], { phase: (idx + 1) + ' / ' + R.details.length });
        }
        st.filled.add(d.idx + '_' + d.col);
        add(6, '填入：' + d.id + '號' + FLAB[d.col], '將算出的 ' + f(d.val, 2) + ' 填入 ' + d.id + ' 號病人的' + FLAB[d.col] + '欄。', [
          d.id + '號 ' + FLAB[d.col] + ' ← ' + f(d.val, 2)
        ], { phase: (idx + 1) + ' / ' + R.details.length });
      });

      st.cur = null; st.done = true; st.barCol = 'glu';
      add(7, '三法比較', '補完所有缺格！平均數與中位數會把分布往中心拉、使標準差縮小；k-NN 依鄰居差異保留較多變異。', [
        '血糖平均：原 ' + f(R.before.glu.mean, 2) + ' → 均 ' + f(Rmean.after.glu.mean, 2) + '｜中 ' + f(Rmed.after.glu.mean, 2) + '｜kNN ' + f(Rknn.after.glu.mean, 2),
        '血糖標準差：原 ' + f(R.before.glu.sd, 2) + ' → 均 ' + f(Rmean.after.glu.sd, 2) + '｜中 ' + f(Rmed.after.glu.sd, 2) + '｜kNN ' + f(Rknn.after.glu.sd, 2)
      ]);
      return steps;
    },

    keys(steps, rows, p) {
      const k = {};
      const Rm = runMethod(rows, 'mean', p.k);
      const Rd = runMethod(rows, 'median', p.k);
      const Rk = runMethod(rows, 'knn', p.k);
      Rm.details.forEach((d, i) => {
        k['imp_mean_r' + d.id + '_' + d.col] = d.val;
        k['imp_median_r' + d.id + '_' + d.col] = Rd.details[i].val;
        k['imp_knn_r' + d.id + '_' + d.col] = Rk.details[i].val;
      });
      FEATS.forEach(c => {
        k['mean_after_mean_' + c] = Rm.after[c].mean;
        k['sd_after_mean_' + c] = Rm.after[c].sd;
        k['mean_after_median_' + c] = Rd.after[c].mean;
        k['sd_after_median_' + c] = Rd.after[c].sd;
        k['mean_after_knn_' + c] = Rk.after[c].mean;
        k['sd_after_knn_' + c] = Rk.after[c].sd;
      });
      return k;
    },

    explain(steps, rows, p) {
      const R = runMethod(rows, p.method, p.k);
      const c = R.details[0] ? R.details[0].col : 'glu';
      return [
        '這份資料共缺少 ' + R.blanks.length + ' 格，採用「' + (p.method === 'mean' ? '平均數' : p.method === 'median' ? '中位數' : 'k-NN') + '」補齊。',
        '以' + FLAB[c] + '為例，補值前平均為 ' + f(R.before[c].mean, 2) + '、標準差為 ' + f(R.before[c].sd, 2) + '；補值後變為平均 ' + f(R.after[c].mean, 2) + '、標準差 ' + f(R.after[c].sd, 2) + '。',
        '單一常數補值（平均數／中位數）容易低估變異度；若欄位受極端值影響大，中位數比平均數更穩健。',
        'k-NN 補值（採用與 scikit-learn KNNImputer 相同的 nan_euclidean 距離）會參考相似病人的數值，較能維持原本的變異結構。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Replace Missing Values', 'Impute Missing Values'],
      params: [
        ['Replace Missing Values › default', p => p.method === 'median' ? 'median' : 'average'],
        ['Impute Missing Values › k (inner k-NN)', p => String(p.k)]
      ],
      note: 'AI Studio 的 Replace Missing Values 可直接選 average（平均數）或 median；若要用 k-NN 補值，需使用 Impute Missing Values 並在子流程放入 k-NN 運算子。',
      expect: (steps, rows, p) => {
        const R = runMethod(rows, p.method, p.k);
        return [
          '所有缺格補齊後共 ' + rows.length + ' 筆完整資料',
          '血糖補後平均 = ' + f(R.after.glu.mean, 2) + '，標準差 = ' + f(R.after.glu.sd, 2)
        ];
      },
      python: `from sklearn.impute import SimpleImputer, KNNImputer\nX_mean = SimpleImputer(strategy='mean').fit_transform(X)\nX_med = SimpleImputer(strategy='median').fit_transform(X)\nX_knn = KNNImputer(n_neighbors=3).fit_transform(X)`,
      confirmed: false
    }
  });
})();
