/* C8 Isolation Forest */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = LAB.data.columns('clinic', ['bmi', 'glu']);
  const AX = { x: { label: 'BMI (kg/m²)', min: 15, max: 42 }, y: { label: '空腹血糖（mg/dL）', min: 60, max: 240 } };
  const pick = r => ({ id: r.id, bmi: r.bmi, glu: r.glu });

  function makeRows(seed) {
    const base = LAB.data.clinic(seed, 12).map(pick);
    const r = LAB.rng(8850 + seed);
    const out = { id: 13, bmi: Math.round((36 + r() * 3) * 10) / 10, glu: Math.round(205 + r() * 20) };
    return base.concat([out]);
  }

  function cFactor(m) {
    if (m <= 1) return 0;
    if (m === 2) return 1;
    const H = Math.log(m - 1) + 0.5772156649;
    return 2 * H - (2 * (m - 1)) / m;
  }

  function runIF(rows, p) {
    const n = rows.length;
    const T = Math.max(5, Math.min(50, Math.round(p.trees || 10)));
    const maxH = Math.ceil(Math.log2(n));
    const rng = LAB.rng(8800 + T * 23 + Math.round(rows[0].bmi * 10));

    function buildTree(sub, depth) {
      if (depth >= maxH || sub.length <= 1) {
        return { leaf: true, size: sub.length };
      }
      const mnB = M.min(sub.map(r => r.bmi)), mxB = M.max(sub.map(r => r.bmi));
      const mnG = M.min(sub.map(r => r.glu)), mxG = M.max(sub.map(r => r.glu));
      const cands = [];
      if (mxB > mnB) cands.push('bmi');
      if (mxG > mnG) cands.push('glu');
      if (!cands.length) return { leaf: true, size: sub.length };

      const ft = cands[Math.floor(rng() * cands.length)];
      const mn = ft === 'bmi' ? mnB : mnG, mx = ft === 'bmi' ? mxB : mxG;
      const th = mn + rng() * (mx - mn);
      const L = sub.filter(r => r[ft] < th);
      const R = sub.filter(r => r[ft] >= th);
      return {
        leaf: false, ft, th,
        left: buildTree(L, depth + 1),
        right: buildTree(R, depth + 1)
      };
    }

    const trees = [];
    for (let t = 0; t < T; t++) trees.push(buildTree(rows, 0));

    function tracePoint(tree, pt) {
      let cur = tree, edges = 0;
      const pathCuts = [];
      while (!cur.leaf) {
        pathCuts.push({ ft: cur.ft, th: cur.th, dir: pt[cur.ft] < cur.th ? 'L' : 'R' });
        cur = pt[cur.ft] < cur.th ? cur.left : cur.right;
        edges++;
      }
      return { h: edges + cFactor(cur.size), edges, leafSize: cur.size, pathCuts };
    }

    const cn = cFactor(n);
    const paths = rows.map(r => trees.map(tr => tracePoint(tr, r)));
    const meanH = rows.map((_, i) => M.mean(paths[i].map(x => x.h)));
    const scores = meanH.map(eh => Math.pow(2, -eh / cn));

    const tId = Math.min(n, Math.max(1, Math.round(p.target || 13)));
    const tIdx = Math.max(0, rows.findIndex(r => r.id === tId));
    const normIdx = rows.findIndex((_, i) => i !== tIdx);
    const ranked = rows.map((r, i) => ({ id: r.id, i, eh: meanH[i], score: scores[i] })).sort((a, b) => b.score - a.score);

    return { T, maxH, cn, trees, paths, meanH, scores, tIdx, normIdx, ranked };
  }

  LAB.register({
    id: 'C8', group: 'C', title: 'Isolation Forest',
    module: { name: 'M4 第 11 節', url: '../m4/#p11' },
    goal: '看懂 Isolation Forest 為什麼「不建正常模型」，而是隨機挑特徵與切點亂切，越快被單獨切出來的點就是異常。',
    data: {
      name: 'clinic_iforest',
      scenario: '門診健檢：12 位病人加上 1 位極端值病人 (#13)，比較異常點與正常點被孤立所需的刀數',
      columns: COLS,
      editable: ['bmi', 'glu'],
      small: seed => makeRows(seed)
    },
    params: [
      { key: 'trees', label: '孤立樹數量 T', type: 'int', min: 5, max: 50, step: 5, value: 10 },
      { key: 'target', label: '觀察病人 (#)', type: 'int', min: 1, max: 13, step: 1, value: 13 }
    ],
    pseudo: [
      '建 T 棵隨機孤立樹（每棵高度上限 ⌈log₂ n⌉）：',
      '  在目前範圍隨機挑特徵與切點',
      '  一刀切開直到剩 1 點或達上限',
      '記錄每個點在各樹的路徑長度 h(x)',
      '計算平均路徑長度 E(h(x))',
      '換算異常分數 s = 2^(−E(h) ÷ c(n))'
    ],
    build(rows, p) {
      const R = runIF(rows, p), steps = [];
      const ti = R.tIdx, tid = rows[ti].id;
      const ni = R.normIdx, nid = rows[ni].id;

      function views(st) {
        const points = rows.map((r, i) => ({
          id: 'p' + r.id, x: r.bmi, y: r.glu,
          cls: i === st.focusIdx ? 'hl' : (st.allDone && R.scores[i] > 0.6 ? 'c1' : 'c0'),
          dim: st.dimOthers && i !== st.focusIdx,
          ring: i === st.focusIdx,
          hl: i === st.focusIdx,
          label: String(r.id),
          r: st.allDone ? Math.round(M.clamp(4 + R.scores[i] * 7, 5, 12)) : (i === st.focusIdx ? 8 : 5.5)
        }));
        const lines = st.cuts.map((c, idx) => {
          const isNew = idx === st.cuts.length - 1;
          const lc = isNew ? 'hl' : 'c2', lw = isNew ? 3 : 1.3, ld = !isNew;
          if (c.ft === 'bmi') return { id: 'cut' + idx, x1: c.th, y1: AX.y.min, x2: c.th, y2: AX.y.max, cls: lc, dash: ld, w: lw, label: '刀' + (idx + 1) };
          return { id: 'cut' + idx, x1: AX.x.min, y1: c.th, x2: AX.x.max, y2: c.th, cls: lc, dash: ld, w: lw, label: '刀' + (idx + 1) };
        });
        const main = {
          type: 'scatter', slot: 'main',
          title: '隨機切割過程（目前觀察 #' + rows[st.focusIdx].id + '）',
          axes: AX, points, lines, circles: [],
          legend: [{ cls: 'hl', label: '追蹤病人' }, { cls: 'c1', label: '高異常分數' }, { cls: 'c0', label: '一般病人' }]
        };
        const side = {
          type: 'table', slot: 'side',
          title: '各點平均路徑長度與異常分數',
          cols: [
            { key: 'id', label: '#' },
            { key: 't0', label: '樹1刀數', num: true, digits: 1 },
            { key: 'eh', label: '平均 E(h)', num: true, digits: 2 },
            { key: 'sc', label: '異常分數', num: true, digits: 3 }
          ],
          rows: rows.map((r, i) => ({
            id: r.id,
            cells: [
              r.id,
              st.showT0 ? R.paths[i][0].h : null,
              st.allDone ? R.meanH[i] : null,
              st.allDone ? { v: f(R.scores[i], 3), cls: R.scores[i] > 0.6 ? 'bad' : 'good' } : null
            ],
            hl: i === st.focusIdx
          }))
        };
        const bars = {
          type: 'bars', slot: 'bottom',
          title: st.allDone ? '異常分數排名（前 6 名，越接近 1 越容易被孤立）' : '第 1 棵樹切割刀數與理論基準 c(n) 對照（刀數越少越異常）',
          max: st.allDone ? 1 : Math.max(5, R.maxH + 1),
          digits: st.allDone ? 3 : 2,
          items: st.allDone
            ? R.ranked.slice(0, 6).map(x => ({ id: 'rk' + x.id, label: '#' + x.id, value: x.score, cls: x.score > 0.6 ? 'c1' : 'c0', hl: x.id === tid }))
            : [
                { id: 'h_t', label: '觀察點 #' + tid + ' 目前刀數', value: st.showT0 ? R.paths[ti][0].h : st.cuts.length, cls: 'hl', hl: st.focusIdx === ti },
                { id: 'h_n', label: '正常點 #' + nid + ' 樹1刀數', value: st.focusIdx === ni ? R.paths[ni][0].h : 0, cls: 'c0', hl: st.focusIdx === ni },
                { id: 'h_c', label: '理論平均路徑 c(n)', value: R.cn, cls: 'c5' }
              ]
        };
        return [main, side, bars];
      }

      const st = { focusIdx: ti, cuts: [], dimOthers: false, showT0: false, allDone: false };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [rows[st.focusIdx].id] });

      add(0, '題目', 'Isolation Forest 不算距離也不算密度，直接隨機一刀一刀切空間。觀察 #' + tid + ' 需要幾刀就會被單獨切出來。', [
        '樹數 T = ' + R.T + '，高度上限 = ' + R.maxH + '，正規化常數 c(' + rows.length + ') = ' + f(R.cn, 3)
      ]);

      const tCuts = R.paths[ti][0].pathCuts;
      tCuts.forEach((c, idx) => {
        st.cuts = tCuts.slice(0, idx + 1);
        add(3, '第 1 棵樹：第 ' + (idx + 1) + ' 刀', '隨機選「' + (c.ft === 'bmi' ? 'BMI' : '血糖') + '」在範圍內切在 ' + f(c.th, 1) + '，#' + tid + ' 落在' + (c.dir === 'L' ? '左/下' : '右/上') + '半邊。', [
          '目前走了 ' + (idx + 1) + ' 刀'
        ]);
      });

      st.showT0 = true;
      add(4, '第 1 棵樹孤立 #' + tid, '#' + tid + ' 總共走 ' + R.paths[ti][0].edges + ' 刀停止（葉內剩 ' + R.paths[ti][0].leafSize + ' 點），路徑長度 h = ' + f(R.paths[ti][0].h, 2) + '。', [
        'h = ' + R.paths[ti][0].edges + ' + c(' + R.paths[ti][0].leafSize + ') = ' + f(R.paths[ti][0].h, 2)
      ]);

      st.focusIdx = ni; st.cuts = R.paths[ni][0].pathCuts;
      add(4, '對照正常點 #' + nid, '同一棵樹換追蹤人群裡的 #' + nid + '，往往需要切更多刀或直到樹高上限才停。', [
        '#' + nid + ' 在第 1 棵樹路徑長度 h = ' + f(R.paths[ni][0].h, 2) + '（比較 #' + tid + ' 的 ' + f(R.paths[ti][0].h, 2) + '）'
      ]);

      st.focusIdx = ti; st.cuts = []; st.allDone = true;
      add(5, '跑完全部 ' + R.T + ' 棵樹', '單一棵隨機樹可能運氣好或不好，跑完 ' + R.T + ' 棵取平均路徑長度 E(h) 就非常穩定。', [
        '#' + tid + ' 平均路徑 E(h) = ' + f(R.meanH[ti], 2),
        '#' + nid + ' 平均路徑 E(h) = ' + f(R.meanH[ni], 2)
      ]);

      add(6, '換算異常分數', '把平均路徑代進 2^(−E(h)/c(n))：路徑越短分數越接近 1（異常）；路徑越長分數越接近 0.5 或更低（正常）。', [
        '#' + tid + ' 分數 = ' + f(R.scores[ti], 3) + '｜全體最高：#' + R.ranked[0].id + ' (' + f(R.ranked[0].score, 3) + ')'
      ]);

      add(6, '為何無須建正常模型', 'LOF (C7) 需先算兩兩距離矩陣 O(n²)，而 Isolation Forest 直接利用「異常點少且孤立、幾刀就切出」的幾何特性，免算距離！', [
        '#' + tid + ' 異常分數 = ' + f(R.scores[ti], 3)
      ]);
      add(6, '子抽樣防遮蔽效應', '大資料實務每棵樹只隨機抽 max_samples = 256 筆（不必全抽），反而能減少正常點遮住異常點的 Swamping 與 Masking 效應！', [
        '計算複雜度近線性 O(T · ψ log ψ)，極適合百萬筆資料'
      ]);
      add(6, '實務參數設定建議', 'sklearn 中可用 contamination 指定預期異常比例（如 0.05），並注意軸對齊切刀對「斜向相關異常」不如馬氏距離 (C12) 靈敏。', [
        'IsolationForest(n_estimators=100, max_samples=256)'
      ]);
      add(6, '與 LOF 及馬氏對照', '大樣本高維表首選 Isolation Forest；小樣本局部密度異常看 LOF (C7)；高度正相關常態雙變數異常則用馬氏距離 (C12)！', [
        '孤立森林對特徵縮放不敏感，免做標準化也能切分'
      ]);
      return steps;
    },

    inputs(rows, p) {
      const R = runIF(rows, p);
      return { trees: R.trees };
    },

    keys(steps, rows, p) {
      const R = runIF(rows, p);
      const k = { cn: R.cn };
      rows.forEach((r, i) => {
        k['eh_' + r.id] = R.meanH[i];
        k['score_' + r.id] = R.scores[i];
      });
      return k;
    },

    explain(steps, rows, p) {
      const R = runIF(rows, p);
      const ti = R.tIdx;
      return [
        '共建立 ' + R.T + ' 棵隨機孤立樹（正規化常數 c(' + rows.length + ') = ' + f(R.cn, 3) + '）。',
        '#' + rows[ti].id + ' 號病人的平均路徑長度為 ' + f(R.meanH[ti], 2) + '，換算異常分數為 ' + f(R.scores[ti], 3) + '。',
        '全體異常分數最高者為 #' + R.ranked[0].id + '（分數 ' + f(R.ranked[0].score, 3) + '）；分數明顯高於 0.6 時通常代表極容易被孤立的異常點。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Isolation Forest'],
      params: [
        ['Isolation Forest › number of trees', p => String(p.trees)]
      ],
      note: 'AI Studio 的 Isolation Forest 來自 Anomaly Detection 擴充套件；因隨機切割無法與外部套件亂數對齊，Python 驗證以 inputs() 提供的同一組樹結構獨立重算。',
      expect: (steps, rows, p) => {
        const R = runIF(rows, p);
        return ['最高異常分數：#' + R.ranked[0].id + '（' + f(R.ranked[0].score, 3) + '）'];
      },
      python: `from sklearn.ensemble import IsolationForest\niso = IsolationForest(n_estimators=10).fit(X)`,
      confirmed: false
    }
  });
})();
