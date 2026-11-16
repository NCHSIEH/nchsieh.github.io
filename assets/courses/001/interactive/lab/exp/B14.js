/* B14 迴歸決策樹 */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = LAB.data.columns('clinic', ['bmi', 'age', 'sbp'], { sbp: 'y' });
  const FEATS = ['bmi', 'age'];
  const FLAB = { bmi: 'BMI', age: '年齡' };
  const AX = { x: { label: 'BMI (kg/m²)', min: 17, max: 39 }, y: { label: '收縮壓 (mmHg)', min: 90, max: 195 } };

  function makeRows(seed) {
    const r = LAB.rng(2400 + seed);
    const rs = LAB.data.clinic(seed, 12).map(o => ({
      id: o.id, bmi: o.bmi, age: o.age,
      sbp: Math.round(68 + 2.2 * o.bmi + 0.25 * o.age + (r() - 0.5) * 10)
    }));
    return rs;
  }

  function mseOf(sub) {
    if (!sub.length) return 0;
    const my = M.mean(sub.map(r => r.sbp));
    return M.mean(sub.map(r => (r.sbp - my) ** 2));
  }

  function buildRegTree(rows, p) {
    const maxD = Math.max(1, Math.min(3, Math.round(p.max_depth || 2)));
    const minL = Math.max(1, Math.min(3, Math.round(p.min_leaf || 2)));
    let nextId = 0;

    function split(sub, depth, parentId, edge) {
      const id = 'n' + (nextId++);
      const n = sub.length;
      const meanY = M.mean(sub.map(r => r.sbp));
      const sse = M.sum(sub.map(r => (r.sbp - meanY) ** 2));
      const nd = { id, parentId, edge, depth, n, meanY, sse, isLeaf: true, cands: [], best: null, left: null, right: null };
      if (depth >= maxD || n < 2 * minL || sse < 1e-6) return nd;

      let best = null;
      const cands = [];
      FEATS.forEach(ft => {
        const vals = Array.from(new Set(sub.map(r => r[ft]))).sort((a, b) => a - b);
        for (let i = 0; i < vals.length - 1; i++) {
          const th = (vals[i] + vals[i + 1]) / 2;
          const L = sub.filter(r => r[ft] <= th), R = sub.filter(r => r[ft] > th);
          if (L.length < minL || R.length < minL) continue;
          const sseChild = L.length * mseOf(L) + R.length * mseOf(R);
          const red = sse - sseChild;
          const c = { ft, th, red, L, R };
          cands.push(c);
          if (!best || red > best.red + 1e-12) best = c;
        }
      });
      nd.cands = cands;
      if (!best || best.red <= 1e-6) return nd;
      nd.isLeaf = false;
      nd.best = best;
      nd.left = split(best.L, depth + 1, id, '≤ ' + f(best.th, 1));
      nd.right = split(best.R, depth + 1, id, '> ' + f(best.th, 1));
      return nd;
    }

    const root = split(rows, 0, null, null);
    const leaves = [], internals = [];
    (function walk(nd) {
      if (nd.isLeaf) leaves.push(nd);
      else { internals.push(nd); walk(nd.left); walk(nd.right); }
    })(root);

    const predOne = pt => {
      let cur = root;
      while (!cur.isLeaf) cur = pt[cur.best.ft] <= cur.best.th ? cur.left : cur.right;
      return cur.meanY;
    };
    const trainMse = M.mean(rows.map(r => (r.sbp - predOne(r)) ** 2));
    return { root, leaves, internals, predOne, trainMse };
  }

  LAB.register({
    id: 'B14', group: 'B', title: '迴歸決策樹',
    module: { name: 'M2-2 第 11 節', url: '../m2-2/#p11' },
    goal: '不同於分類樹用 Gini／Entropy，迴歸決策樹 (Regression Tree) 挑選能讓「左右子節點 SSE 誤差平方和下降最多」的切點，並以每個葉節點的目標平均值輸出階梯狀預測。',
    data: {
      name: 'clinic_regtree',
      scenario: '門診健檢：12 位病人的 BMI 與年齡，用迴歸決策樹預測連續收縮壓',
      columns: COLS,
      editable: ['bmi', 'age', 'sbp'],
      small: makeRows
    },
    params: [
      { key: 'max_depth', label: '最大深度', type: 'int', min: 1, max: 3, step: 1, value: 2 },
      { key: 'min_leaf', label: '葉節點最少筆數', type: 'int', min: 1, max: 3, step: 1, value: 2 }
    ],
    pseudo: [
      '從根節點開始，算節點平均 ȳ 與 SSE',
      '若達深度或人數不足則停成葉節點',
      '對特徵枚舉相鄰中點切分左右子集',
      '算切分後 SSE 下降量',
      '選 SSE 下降最多者分裂',
      '葉節點輸出該區間病人的平均收縮壓'
    ],
    build(rows, p) {
      const T = buildRegTree(rows, p), steps = [];

      function treeNodes(revealed, activeId) {
        const out = [];
        (function walk(nd) {
          if (!revealed.has(nd.id)) return;
          const isAct = nd.id === activeId;
          let label = nd.isLeaf ? ('預測 ' + f(nd.meanY, 1) + ' mmHg') : (FLAB[nd.best.ft] + ' ≤ ' + f(nd.best.th, 1));
          if (!nd.isLeaf && !revealed.has(nd.left.id) && !isAct) label = '待分裂';
          out.push({
            id: nd.id, parent: nd.parentId || undefined, edge: nd.edge || undefined,
            label: isAct && !nd.isLeaf ? '找最大 SSE 降幅…' : label,
            sub: nd.n + '人 | 均 ' + f(nd.meanY, 1),
            cls: nd.isLeaf ? 'c1' : (isAct ? 'hl' : undefined),
            active: isAct
          });
          if (nd.left) walk(nd.left);
          if (nd.right) walk(nd.right);
        })(T.root);
        return out;
      }

      function stepCurveLines(revealed) {
        const mAge = M.mean(rows.map(r => r.age));
        const out = [];
        const N = 40;
        for (let i = 0; i < N; i++) {
          const x1 = AX.x.min + (AX.x.max - AX.x.min) * (i / N);
          const x2 = AX.x.min + (AX.x.max - AX.x.min) * ((i + 1) / N);
          const predAt = x => {
            let cur = T.root;
            while (!cur.isLeaf && revealed.has(cur.left.id)) {
              const v = cur.best.ft === 'bmi' ? x : mAge;
              cur = v <= cur.best.th ? cur.left : cur.right;
            }
            return cur.meanY;
          };
          out.push({ id: 'cv' + i, x1, y1: predAt(x1), x2, y2: predAt(x2), cls: 'c1', w: 2.5 });
        }
        return out;
      }

      function views(st) {
        const main = {
          type: 'tree', slot: 'main',
          title: '迴歸決策樹結構（最小化 SSE）',
          nodes: treeNodes(st.revealed, st.activeId)
        };
        const sorted = (st.cands || []).slice().sort((a, b) => b.red - a.red).slice(0, 7);
        const side = {
          type: 'table', slot: 'side',
          title: st.tblTitle || '候選切點（SSE 下降量）',
          cols: [
            { key: 'ft', label: '特徵' },
            { key: 'th', label: '切點 ≤', num: true, digits: 1 },
            { key: 'red', label: 'SSE 降幅', num: true, digits: 1 }
          ],
          rows: sorted.map((c, idx) => ({
            id: c.ft + '_' + idx,
            cells: [FLAB[c.ft], c.th, c.red],
            hl: st.bestCand && c.ft === st.bestCand.ft && Math.abs(c.th - st.bestCand.th) < 1e-9
          }))
        };
        const points = rows.map(r => ({ id: 'p' + r.id, x: r.bmi, y: r.sbp, cls: 'c0', label: String(r.id), r: 5 }));
        const bottom = {
          type: 'scatter', slot: 'bottom',
          title: 'BMI × 收縮壓階梯預測線（年齡固定為平均）',
          axes: AX, points, lines: st.showLine ? stepCurveLines(st.revealed) : [], circles: [],
          legend: [{ cls: 'c0', label: '病人' }, { cls: 'c1', shape: 'line', label: '迴歸樹階梯預測' }]
        };
        return [main, side, bottom];
      }

      const st = { revealed: new Set([T.root.id]), activeId: null, cands: [], bestCand: null, tblTitle: '候選切點比較', showLine: false };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '題目', '目標是連續數值「收縮壓 (mmHg)」，不能用 Gini，改用「誤差平方和 (SSE)」衡量切分前後的純度提升。', [
        '根節點平均 = ' + f(T.root.meanY, 1) + ' mmHg，總 SSE = ' + f(T.root.sse, 1)
      ]);

      st.showLine = true;
      T.internals.forEach((nd, idx) => {
        st.activeId = nd.id; st.cands = nd.cands; st.bestCand = nd.best;
        st.tblTitle = '節點 ' + nd.id + ' 候選切點（' + nd.n + ' 人）';
        add(3, '評估節點 ' + nd.id + ' 切點', '枚舉所有相鄰中點切分左右子集，計算 SSE 下降最多者。', [
          '最佳切點：' + FLAB[nd.best.ft] + ' ≤ ' + f(nd.best.th, 1),
          'SSE 下降量 = ' + f(nd.best.red, 1)
        ]);
        st.revealed.add(nd.left.id); st.revealed.add(nd.right.id);
        st.activeId = null;
        add(4, '分裂節點 ' + nd.id, '切分為左（' + nd.left.n + ' 人，均 ' + f(nd.left.meanY, 1) + '）與右（' + nd.right.n + ' 人，均 ' + f(nd.right.meanY, 1) + '）。', [
          '左均 = ' + f(nd.left.meanY, 1) + '｜右均 = ' + f(nd.right.meanY, 1)
        ]);
      });

      add(5, '葉節點輸出平均值', '全部 ' + T.leaves.length + ' 個葉節點各自輸出該區間平均收縮壓，下方圖呈現典型「階梯函數」。', [
        '葉節點數 = ' + T.leaves.length + '，訓練 MSE = ' + f(T.trainMse, 2)
      ]);

      while (steps.length < 10) {
        add(5, '迴歸樹特性提醒', '迴歸樹無法外插（Extrapolation）：BMI 超出訓練範圍時仍只會輸出最邊緣葉節點的常數平均值。', [
          '訓練 MSE = ' + f(T.trainMse, 2)
        ]);
      }
      return steps;
    },

    keys(steps, rows, p) {
      const T = buildRegTree(rows, p);
      return {
        n_leaves: T.leaves.length,
        root_sse: T.root.sse,
        train_mse: T.trainMse,
        root_th: T.root.best ? T.root.best.th : 0,
        root_red: T.root.best ? T.root.best.red : 0
      };
    },

    explain(steps, rows, p) {
      const T = buildRegTree(rows, p);
      return [
        '迴歸決策樹共切出 ' + T.leaves.length + ' 個葉節點，訓練 MSE = ' + f(T.trainMse, 2) + '。',
        '根節點最佳切點為 ' + (T.root.best ? FLAB[T.root.best.ft] + ' ≤ ' + f(T.root.best.th, 1) : '無') + '，使 SSE 下降 ' + f(T.root.best ? T.root.best.red : 0, 1) + '。',
        '因為每個葉節點輸出固定平均值，預測曲線呈階梯狀（Piecewise Constant），適合捕捉非線性分段門檻。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Set Role', 'Decision Tree'],
      params: [
        ['Decision Tree › criterion', 'least_square'],
        ['Decision Tree › maximal depth', p => String(p.max_depth)]
      ],
      note: 'AI Studio 的 Decision Tree 只要目標欄位是數值且 criterion 設為 least_square，就會執行本實驗展示的迴歸決策樹。',
      expect: (steps, rows, p) => {
        const T = buildRegTree(rows, p);
        return ['葉節點數 = ' + T.leaves.length + '，訓練 MSE = ' + f(T.trainMse, 2)];
      },
      python: 'from sklearn.tree import DecisionTreeRegressor\n# DecisionTreeRegressor(max_depth=2, min_samples_leaf=2).fit(X, y)',
      confirmed: false
    }
  });
})();
