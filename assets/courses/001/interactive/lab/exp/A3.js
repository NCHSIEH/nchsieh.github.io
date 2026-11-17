/* A3 離散化 */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = LAB.data.columns('clinic', ['glu', 'dm'], { dm: 'y' });
  const AX = { x: { label: '空腹血糖（mg/dL）', min: 60, max: 220 }, y: { label: '糖尿病（0=否，1=是）', min: -0.35, max: 1.35 } };
  const pick = r => ({ id: r.id, glu: r.glu, dm: r.dm });
  const cls = dm => dm ? 'c1' : 'c0';

  function entropyOf(sub) {
    const n = sub.length;
    if (!n) return 0;
    const c1 = sub.filter(r => r.dm === 1).length, p1 = c1 / n, p0 = 1 - p1;
    let h = 0;
    if (p0 > 0) h -= p0 * Math.log2(p0);
    if (p1 > 0) h -= p1 * Math.log2(p1);
    return h;
  }

  function quantileLinear(sorted, q) {
    const n = sorted.length;
    const pos = q * (n - 1), lo = Math.floor(pos), hi = Math.ceil(pos);
    return sorted[lo] + (pos - lo) * (sorted[hi] - sorted[lo]);
  }

  function runDisc(rows, p) {
    const glus = LAB.col(rows, 'glu');
    const mn = M.min(glus), mx = M.max(glus);
    const k = Math.max(2, Math.round(p.bins || 3));
    let cuts = [];
    let entCands = [];

    if (p.method === 'width') {
      const w = (mx - mn) / k;
      for (let i = 1; i < k; i++) cuts.push(mn + i * w);
    } else if (p.method === 'freq') {
      const s = glus.slice().sort((a, b) => a - b);
      const rawEdges = [];
      for (let i = 0; i <= k; i++) rawEdges.push(quantileLinear(s, i / k));
      const uniqEdges = [];
      rawEdges.forEach(v => { if (!uniqEdges.length || Math.abs(v - uniqEdges[uniqEdges.length - 1]) > 1e-9) uniqEdges.push(v); });
      cuts = uniqEdges.slice(1, uniqEdges.length - 1);
    } else {
      // 依熵遞迴二分直到 k 個區間（最多 k-1 刀）
      const segs = [rows.slice()];
      for (let sp = 0; sp < k - 1; sp++) {
        let best = null;
        segs.forEach((seg, sIdx) => {
          if (seg.length < 2) return;
          const hPar = entropyOf(seg);
          if (hPar <= 1e-12) return;
          const vals = Array.from(new Set(seg.map(r => r.glu))).sort((a, b) => a - b);
          for (let i = 0; i < vals.length - 1; i++) {
            const th = (vals[i] + vals[i + 1]) / 2;
            const L = seg.filter(r => r.glu <= th), R = seg.filter(r => r.glu > th);
            const gain = hPar - (L.length / seg.length) * entropyOf(L) - (R.length / seg.length) * entropyOf(R);
            if (sp === 0) entCands.push({ th, gain, nL: L.length, nR: R.length });
            if (gain > 1e-7 && (!best || gain > best.gain + 1e-12)) {
              best = { sIdx, th, gain, L, R };
            }
          }
        });
        if (!best) break;
        cuts.push(best.th);
        segs.splice(best.sIdx, 1, best.L, best.R);
      }
      cuts.sort((a, b) => a - b);
    }

    const edges = [mn].concat(cuts).concat([mx]);
    const bins = [];
    for (let i = 0; i < edges.length - 1; i++) {
      const lo = edges[i], hi = edges[i + 1];
      const sub = rows.filter(r => i === 0 ? (r.glu <= hi + 1e-12) : i === edges.length - 2 ? (r.glu > lo + 1e-12) : (r.glu > lo + 1e-12 && r.glu <= hi + 1e-12));
      const pos = sub.filter(r => r.dm === 1).length;
      bins.push({
        idx: i + 1, lo, hi,
        label: (i === 0 ? '[' : '(') + f(lo, 1) + ', ' + f(hi, 1) + ']',
        n: sub.length, pos, rate: sub.length ? pos / sub.length : 0
      });
    }
    return { mn, mx, k, cuts, edges, bins, entCands };
  }

  LAB.register({
    id: 'A3', group: 'A', title: '離散化',
    module: { name: 'M1 第 11 節', url: '../m1/#p11' },
    goal: '看懂等寬、等頻與依熵三種離散化如何決定切點，並比較切出來的各區間筆數與陽性比例。',
    data: {
      name: 'clinic',
      scenario: '門診健檢：把連續的空腹血糖切成幾個區間，觀察各區間的糖尿病比例',
      columns: COLS,
      editable: ['glu', 'dm'],
      small: seed => {
        const rs = LAB.data.clinic(seed, 14).map(pick);
        const hi = rs.reduce((best, r) => r.glu > best.glu ? r : best, rs[0]);
        if (hi.glu < 190) hi.glu = 198;
        return rs;
      }
    },
    params: [
      { key: 'method', label: '切分方法', type: 'choice', value: 'width', options: [{ v: 'width', label: '等寬' }, { v: 'freq', label: '等頻' }, { v: 'entropy', label: '依熵' }] },
      { key: 'bins', label: '區間數', type: 'int', min: 2, max: 5, step: 1, value: 3 }
    ],
    pseudo: [
      '把空腹血糖由小到大排列',
      '依選擇的方法找切點：',
      '  等寬：區間寬度 = (max−min) ÷ k',
      '  等頻：依分位數讓每組筆數相近',
      '  依熵：挑資訊增益最大的切點',
      '把病人分進各區間',
      '統計每個區間的筆數與陽性比例'
    ],
    build(rows, p) {
      const R = runDisc(rows, p), steps = [];
      const mName = p.method === 'width' ? '等寬' : p.method === 'freq' ? '等頻' : '依熵';

      function views(st) {
        const points = rows.map((r, i) => ({
          id: 'p' + r.id,
          x: r.glu,
          y: r.dm + ((i % 3) - 1) * 0.08,
          cls: cls(r.dm),
          label: String(r.id),
          r: 6
        }));
        const lines = [{ id: 'sep', x1: AX.x.min, y1: 0.5, x2: AX.x.max, y2: 0.5, cls: 'c5', dash: true, w: 1 }].concat(st.cuts.map((c, i) => {
          const isNew = i === st.cuts.length - 1;
          return { id: 'cut' + i, x1: c, y1: AX.y.min, x2: c, y2: AX.y.max, cls: isNew ? 'hl' : 'c2', w: isNew ? 2.5 : 1.6, dash: true, label: f(c, 1) };
        }));
        const regions = st.cuts.length ? LAB.grid(x => {
          let b = 0;
          st.cuts.forEach(c => { if (x > c) b++; });
          return 'c' + (b % 5);
        }, AX.x.min, AX.x.max, AX.y.min, AX.y.max, 36, 10) : null;
        const main = {
          type: 'scatter', slot: 'main',
          title: '血糖分布與切點（' + mName + '）',
          axes: AX, points, lines, circles: [], regions,
          legend: [{ cls: 'c1', label: '糖尿病：是' }, { cls: 'c0', label: '糖尿病：否' }, { cls: 'hl', shape: 'line', label: '切點' }]
        };
        let side;
        if (st.showCands && R.entCands.length) {
          const topC = R.entCands.slice().sort((a, b) => b.gain - a.gain).slice(0, 8);
          side = {
            type: 'table', slot: 'side', title: '候選切點資訊增益（前 8 名）',
            cols: [{ key: 'th', label: '切點 ≤', num: true, digits: 1 }, { key: 'nl', label: '左', num: true, digits: 0 }, { key: 'nr', label: '右', num: true, digits: 0 }, { key: 'g', label: '資訊增益', num: true, digits: 3 }],
            rows: topC.map((c, i) => ({ id: 'c' + i, cells: [c.th, c.nL, c.nR, c.gain], hl: i === 0 }))
          };
        } else {
          side = {
            type: 'table', slot: 'side', title: '各區間統計',
            cols: [{ key: 'rng', label: '區間' }, { key: 'n', label: '筆數', num: true, digits: 0 }, { key: 'pos', label: '陽性', num: true, digits: 0 }, { key: 'rt', label: '陽性率', num: true, digits: 2 }],
            rows: st.showBins ? R.bins.map(b => ({ id: 'b' + b.idx, cells: [b.label, b.n, b.pos, b.rate] })) : []
          };
        }
        const bars = {
          type: 'bars', slot: 'bottom',
          title: '各區間糖尿病陽性比例',
          max: 1, digits: 2,
          items: st.showBins ? R.bins.map(b => ({
            id: 'bb' + b.idx,
            label: '區間' + b.idx + ' [' + b.label + '] (' + b.n + '人)',
            value: b.rate,
            cls: b.n === 0 ? 'c5' : (b.rate >= 0.5 ? 'c1' : 'good')
          })) : [{ id: 'empty', label: '尚未切分', value: 0, cls: 'c5' }]
        };
        return [main, side, bars];
      }

      const st = { cuts: [], showCands: false, showBins: false };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '題目', '14 位病人的空腹血糖介於 ' + R.mn + ' 到 ' + R.mx + ' mg/dL。用「' + mName + '」切成 ' + R.k + ' 個區間。', [
        '最小值 = ' + R.mn + '，最大值 = ' + R.mx + '，目標區間數 = ' + R.k
      ]);

      add(1, '排序血糖數值', '先把 14 個血糖值由小到大排好，準備尋找切點。', [
        '排序前 5 筆：' + LAB.col(rows, 'glu').sort((a, b) => a - b).slice(0, 5).join(', ') + '…'
      ]);

      if (p.method === 'width') {
        const w = (R.mx - R.mn) / R.k;
        add(3, '計算區間寬度', '等寬法把全距除以區間數，每個區間寬度相同。', [
          '寬度 = (' + R.mx + ' − ' + R.mn + ') ÷ ' + R.k + ' = ' + f(w, 2)
        ]);
        R.cuts.forEach((c, i) => {
          st.cuts = R.cuts.slice(0, i + 1);
          add(3, '加入第 ' + (i + 1) + ' 個切點', '從最小值加上 ' + (i + 1) + ' 倍寬度，得到第 ' + (i + 1) + ' 個切點。', [
            '切點 ' + (i + 1) + ' = ' + R.mn + ' + ' + (i + 1) + ' × ' + f(w, 2) + ' = ' + f(c, 2)
          ]);
        });
      } else if (p.method === 'freq') {
        add(4, '計算分位數切點', '等頻法取 1/k、2/k… 分位數，讓每個區間包含盡量一樣多的病人。', [
          '目標每組約 ' + f(rows.length / R.k, 1) + ' 筆'
        ]);
        R.cuts.forEach((c, i) => {
          st.cuts = R.cuts.slice(0, i + 1);
          add(4, '加入第 ' + (i + 1) + ' 個切點', '依線性內插分位數（與 pandas qcut 一致）算出第 ' + (i + 1) + ' 個切點。', [
            '第 ' + (i + 1) + ' 切點 = ' + f(c, 2)
          ]);
        });
      } else {
        st.showCands = true;
        add(5, '計算候選切點資訊增益', '依熵法在相鄰兩個血糖值中點試切，算出每個切點的資訊增益（右表列前 8 名）。', [
          '共評估 ' + R.entCands.length + ' 個候選切點'
        ]);
        st.showCands = false;
        R.cuts.forEach((c, i) => {
          st.cuts = R.cuts.slice(0, i + 1);
          add(5, '選出切點 ' + (i + 1), '挑選資訊增益最大、能把「是」與「否」分得最乾淨的切點。', [
            '切點 ' + (i + 1) + ' = ' + f(c, 1)
          ]);
        });
      }

      st.showBins = true;
      add(6, '統計各區間筆數', '所有病人依切點分入對應區間，檢查每組各有幾人。', [
        R.bins.map(b => '區間' + b.idx + ': ' + b.n + '人').join('｜')
      ]);

      add(7, '比較各區間陽性率', '比較每個血糖區間的糖尿病陽性比例，確認切分是否保留了預測訊號。', [
        R.bins.map(b => '區間' + b.idx + ': ' + LAB.pct(b.rate, 1)).join('｜')
      ]);

      while (steps.length < 10) {
        add(7, '不同方法的小結', '等寬簡單但不均勻；等頻每組人數相近但可能把同值切開；依熵最能對齊目標標籤，但有過擬合風險。', [
          '目前切點：' + R.cuts.map(c => f(c, 1)).join('、')
        ]);
        if (steps.length < 10) {
          add(7, '血糖臨床切點對照', '實務上空腹血糖常用 100、126 mg/dL 作為臨床切點，也可以對照演算法自動切出的位置。', [
            '區間數 = ' + R.bins.length + '，切點數 = ' + R.cuts.length
          ]);
        }
        if (steps.length < 10) {
          add(7, '模型選擇提醒', '離散化會損失區間內的細微差異，但能讓線性模型捕捉非線性門檻效應。', [
            '總樣本數 = ' + rows.length
          ]);
        }
      }
      return steps;
    },

    keys(steps, rows, p) {
      const R = runDisc(rows, p);
      const k = { n_bins: R.bins.length, n_cuts: R.cuts.length };
      R.cuts.forEach((c, i) => { k['cut_' + i] = c; });
      R.bins.forEach((b, i) => { k['bin_n_' + i] = b.n; k['bin_pos_' + i] = b.pos; });
      if (p.method === 'entropy') {
        R.entCands.forEach((c, i) => { k['cand_gain_' + i] = c.gain; });
      }
      return k;
    },

    explain(steps, rows, p) {
      const R = runDisc(rows, p);
      return [
        '將 14 筆空腹血糖（' + R.mn + '–' + R.mx + ' mg/dL）以「' + (p.method === 'width' ? '等寬' : p.method === 'freq' ? '等頻' : '依熵') + '」切成 ' + R.bins.length + ' 個區間。',
        '切點為 ' + R.cuts.map(c => f(c, 2)).join('、') + '；各區間筆數分別為 ' + R.bins.map(b => b.n).join('、') + '。',
        '等寬法受極端值影響大，某些區間可能幾乎沒人；等頻法讓每組樣本數相近；依熵法則是監督式離散化，會優先在陽性比例劇變處下刀。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Discretize by Binning', 'Discretize by Frequency', 'Discretize by Entropy'],
      params: [
        ['Discretize › number of bins', p => String(p.bins)]
      ],
      note: 'AI Studio 將三種離散化拆成三個獨立運算子（Discretize by Binning / Frequency / Entropy），其中依熵法需先用 Set Role 指定 label。',
      expect: (steps, rows, p) => {
        const R = runDisc(rows, p);
        return ['產生 ' + R.bins.length + ' 個血糖區間，切點：' + R.cuts.map(c => f(c, 1)).join(', ')];
      },
      python: `import pandas as pd\npd.cut(glu, bins=3)\npd.qcut(glu, q=3, duplicates='drop')`,
      confirmed: false
    }
  });
})();
