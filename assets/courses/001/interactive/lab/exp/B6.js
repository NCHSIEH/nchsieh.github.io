/* B6 決策樹 */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = LAB.data.columns('clinic', ['age', 'bmi', 'glu', 'dm'], { dm: 'y' });
  const FEATS = ['age', 'bmi', 'glu'];
  const FLAB = { age: '年齡', bmi: 'BMI', glu: '空腹血糖' };
  const AX = { x: { label: '年齡（歲）', min: 20, max: 90 }, y: { label: '空腹血糖（mg/dL）', min: 60, max: 220 } };
  const pick = r => ({ id: r.id, age: r.age, bmi: r.bmi, glu: r.glu, dm: r.dm });

  function makeRows(seed) {
    const rs = LAB.data.clinic(seed, 14).map(pick);
    const negs = rs.filter(r => r.dm === 0).sort((a, b) => a.age - b.age);
    const poss = rs.filter(r => r.dm === 1).sort((a, b) => b.age - a.age);
    if (negs[0] && poss[0]) {
      negs[0].glu = 128; negs[0].age = 31; negs[0].bmi = 22.0;
      poss[0].glu = 104; poss[0].age = 68; poss[0].bmi = 30.5;
    }
    return rs;
  }
  const cls = dm => dm ? 'c1' : 'c0';

  function impurity(sub, crit) {
    const n = sub.length;
    if (!n) return 0;
    const c1 = sub.filter(r => r.dm === 1).length;
    const p1 = c1 / n, p0 = 1 - p1;
    if (crit === 'gini') return 1 - p0 * p0 - p1 * p1;
    let h = 0;
    if (p0 > 0) h -= p0 * Math.log2(p0);
    if (p1 > 0) h -= p1 * Math.log2(p1);
    return h;
  }

  function buildTree(rows, p) {
    const crit = p.criterion || 'gini';
    const maxD = p.max_depth || 2;
    const minL = p.min_leaf || 1;
    let nextId = 0;

    function splitNode(sub, depth, parentId, edge) {
      const id = 'n' + (nextId++);
      const n = sub.length;
      const c1 = sub.filter(r => r.dm === 1).length, c0 = n - c1;
      const imp = impurity(sub, crit);
      const pred = c1 > c0 ? 1 : 0;

      const cands = [];
      let best = null;
      if (depth < maxD && imp > 1e-12 && n >= 2 * minL) {
        FEATS.forEach((ft, fIdx) => {
          const vals = Array.from(new Set(sub.map(r => r[ft]))).sort((a, b) => a - b);
          for (let i = 0; i < vals.length - 1; i++) {
            const th = (vals[i] + vals[i + 1]) / 2;
            const L = sub.filter(r => r[ft] <= th), R = sub.filter(r => r[ft] > th);
            if (L.length < minL || R.length < minL) continue;
            const iL = impurity(L, crit), iR = impurity(R, crit);
            const wImp = (L.length / n) * iL + (R.length / n) * iR;
            const gain = imp - wImp;
            const cand = { ft, fIdx, th, nL: L.length, nR: R.length, wImp, gain };
            cands.push(cand);
            if (gain > 1e-7 && (!best || gain > best.gain + 1e-12)) {
              best = cand;
            }
          }
        });
      }

      if (!best) {
        return { id, parentId, edge, depth, n, c0, c1, imp, pred, isLeaf: true, cands, best: null, left: null, right: null, sub };
      }
      const leftSub = sub.filter(r => r[best.ft] <= best.th);
      const rightSub = sub.filter(r => r[best.ft] > best.th);
      const node = { id, parentId, edge, depth, n, c0, c1, imp, pred, isLeaf: false, cands, best, sub };
      node.left = splitNode(leftSub, depth + 1, id, '≤ ' + f(best.th, best.ft === 'bmi' ? 1 : 1));
      node.right = splitNode(rightSub, depth + 1, id, '> ' + f(best.th, best.ft === 'bmi' ? 1 : 1));
      return node;
    }

    const root = splitNode(rows, 0, null, null);
    const leaves = [];
    const internals = [];
    (function walk(nd) {
      if (nd.isLeaf) leaves.push(nd);
      else { internals.push(nd); walk(nd.left); walk(nd.right); }
    })(root);

    function predictOne(pt) {
      let cur = root;
      const path = [cur.id];
      while (!cur.isLeaf) {
        cur = pt[cur.best.ft] <= cur.best.th ? cur.left : cur.right;
        path.push(cur.id);
      }
      return { pred: cur.pred, leaf: cur, path };
    }

    return { root, leaves, internals, predictOne };
  }

  LAB.register({
    id: 'B6', group: 'B', title: '決策樹',
    module: { name: 'M2-2 第 11 節', url: '../m2-2/#p11' },
    goal: '看懂決策樹如何把相鄰數值中點當候選切點，計算加權不純度下降，挑出最佳分裂逐層長出樹與矩形判定區。',
    data: {
      name: 'clinic',
      scenario: '門診健檢：用年齡、BMI 與空腹血糖建立決策樹，判斷是否有糖尿病',
      columns: COLS,
      editable: ['age', 'bmi', 'glu', 'dm'],
      small: makeRows
    },
    params: [
      { key: 'criterion', label: '不純度指標', type: 'choice', value: 'gini', options: [{ v: 'gini', label: 'Gini' }, { v: 'entropy', label: '資訊增益' }] },
      { key: 'max_depth', label: '最大深度', type: 'int', min: 1, max: 3, step: 1, value: 2 },
      { key: 'min_leaf', label: '葉節點最少筆數', type: 'int', min: 1, max: 3, step: 1, value: 1 }
    ],
    pseudo: [
      '從根節點（全部資料）開始：',
      '  若已達深度或節點夠純則停',
      '  對每個特徵找相鄰值中點當切點',
      '  算每個切點的加權不純度與下降量',
      '  選下降量最大的特徵與切點分裂',
      '對左右子節點重複上述步驟',
      '葉節點以多數決決定預測類別'
    ],
    build(rows, p) {
      const T = buildTree(rows, p), steps = [];
      const critName = p.criterion === 'gini' ? 'Gini' : 'Entropy';

      function treeNodes(revealed, activeId, pathSet) {
        const out = [];
        (function walk(nd) {
          if (!revealed.has(nd.id)) return;
          const isAct = nd.id === activeId;
          const inPath = pathSet && pathSet.has(nd.id);
          let label = nd.isLeaf ? (nd.pred ? '糖尿病：是' : '糖尿病：否') : (FLAB[nd.best.ft] + ' ≤ ' + f(nd.best.th, 1));
          if (!nd.isLeaf && !revealed.has(nd.left.id) && !isAct) label = '待分裂';
          out.push({
            id: nd.id,
            parent: nd.parentId || undefined,
            edge: nd.edge || undefined,
            label: isAct && !nd.isLeaf ? '找最佳切點…' : label,
            sub: nd.c1 + '是 / ' + nd.c0 + '否',
            cls: nd.isLeaf ? cls(nd.pred) : (inPath ? 'hl' : undefined),
            active: isAct || inPath
          });
          if (nd.left) walk(nd.left);
          if (nd.right) walk(nd.right);
        })(T.root);
        return out;
      }

      function views(st) {
        const main = {
          type: 'tree', slot: 'main',
          title: '決策樹結構（' + critName + '）',
          nodes: treeNodes(st.revealed, st.activeId, st.pathSet)
        };
        const cands = (st.cands && st.cands.length) ? st.cands : (T.root.cands || []);
        const sorted = cands.slice().sort((a, b) => b.gain - a.gain).slice(0, 8);
        const side = {
          type: 'table', slot: 'side',
          title: st.tblTitle || '候選切點比較（前 8 名）',
          cols: [
            { key: 'ft', label: '特徵' },
            { key: 'th', label: '切點 ≤', num: true, digits: 1 },
            { key: 'gain', label: '下降量', num: true, digits: 3 }
          ],
          rows: sorted.map((c, idx) => ({
            id: c.ft + '_' + f(c.th, 2),
            cells: [FLAB[c.ft], c.th, c.gain],
            hl: st.bestCand && c.ft === st.bestCand.ft && Math.abs(c.th - st.bestCand.th) < 1e-9
          }))
        };
        const points = rows.map(r => ({
          id: 'p' + r.id, x: r.age, y: r.glu, cls: cls(r.dm), label: String(r.id), r: 5
        }));
        if (st.queryPt) {
          points.push({ id: 'q', x: st.queryPt.age, y: st.queryPt.glu, cls: cls(st.queryPred), shape: 'star', r: 9, hl: true, label: '新病人' });
        }
        const lines = [];
        st.splitLines.forEach((nd, i) => {
          const isNew = i === st.splitLines.length - 1;
          const lc = isNew ? 'hl' : 'c2', lw = isNew ? 2.5 : 1.5, ld = !isNew;
          if (nd.best.ft === 'age') lines.push({ id: 'sl' + i, x1: nd.best.th, y1: AX.y.min, x2: nd.best.th, y2: AX.y.max, cls: lc, dash: ld, w: lw });
          if (nd.best.ft === 'glu') lines.push({ id: 'sl' + i, x1: AX.x.min, y1: nd.best.th, x2: AX.x.max, y2: nd.best.th, cls: lc, dash: ld, w: lw });
        });
        const regions = st.showReg ? LAB.grid((x, y) => cls(T.predictOne({ age: x, bmi: M.mean(LAB.col(rows, 'bmi')), glu: y }).pred), AX.x.min, AX.x.max, AX.y.min, AX.y.max, 28, 18) : null;
        const bottom = {
          type: 'scatter', slot: 'bottom',
          title: '年齡 × 空腹血糖切割面（BMI 固定為平均）',
          axes: AX, points, lines, circles: [], regions,
          legend: [{ cls: 'c1', label: '是' }, { cls: 'c0', label: '否' }]
        };
        return [main, side, bottom];
      }

      const st = { revealed: new Set([T.root.id]), activeId: null, pathSet: null, cands: [], bestCand: null, tblTitle: '候選切點比較', splitLines: [], showReg: false, queryPt: null, queryPred: 0 };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '題目', '用 14 位門診病人的年齡、BMI、空腹血糖建決策樹（' + critName + '，深度上限 ' + p.max_depth + '）。', [
        '根節點：共 ' + T.root.n + ' 筆（是 ' + T.root.c1 + '、否 ' + T.root.c0 + '），不純度 = ' + f(T.root.imp, 3)
      ]);

      // 根節點：逐特徵顯示候選切點
      if (!T.root.isLeaf) {
        st.activeId = T.root.id;
        FEATS.forEach(ft => {
          const fc = T.root.cands.filter(c => c.ft === ft);
          if (!fc.length) return;
          const b = fc.slice().sort((a, b2) => b2.gain - a.gain)[0];
          st.cands = fc; st.bestCand = b; st.tblTitle = '根節點：' + FLAB[ft] + ' 候選切點';
          add(4, '根節點檢視：' + FLAB[ft], '將 ' + FLAB[ft] + ' 排序取相鄰中點當切點，算出各切點的 ' + critName + ' 下降量。', [
            FLAB[ft] + ' 共有 ' + fc.length + ' 個合法切點',
            '最佳：' + FLAB[ft] + ' ≤ ' + f(b.th, 1) + '，下降量 = ' + f(b.gain, 3)
          ]);
        });
        st.cands = T.root.cands; st.bestCand = T.root.best; st.tblTitle = '根節點：所有特徵切點比較';
        st.revealed.add(T.root.left.id); st.revealed.add(T.root.right.id);
        st.splitLines.push(T.root);
        add(5, '根節點分裂', '比較三個特徵所有切點後，挑出下降量最大的切點把資料分成左右兩支。', [
          '最佳分裂：' + FLAB[T.root.best.ft] + ' ≤ ' + f(T.root.best.th, 1) + '（下降量 ' + f(T.root.best.gain, 3) + '）',
          '左支 ' + T.root.left.n + ' 筆｜右支 ' + T.root.right.n + ' 筆'
        ]);
      }

      // 其餘內部節點
      const restInternals = T.internals.filter(nd => nd.id !== T.root.id);
      restInternals.forEach((nd, idx) => {
        st.activeId = nd.id;
        if (idx === 0) {
          st.cands = nd.cands; st.bestCand = nd.best; st.tblTitle = '子節點 ' + nd.id + ' 候選切點';
          add(4, '子節點評估切點', '進到下一個待分裂節點（' + nd.n + ' 筆，不純度 ' + f(nd.imp, 3) + '），重算候選切點。', [
            '最佳切點：' + FLAB[nd.best.ft] + ' ≤ ' + f(nd.best.th, 1) + '，下降量 = ' + f(nd.best.gain, 3)
          ]);
        }
        st.revealed.add(nd.left.id); st.revealed.add(nd.right.id);
        st.splitLines.push(nd);
        add(6, '子節點分裂', '在 ' + FLAB[nd.best.ft] + ' ≤ ' + f(nd.best.th, 1) + ' 切開，產生 ' + nd.left.n + ' 筆與 ' + nd.right.n + ' 筆。', [
          FLAB[nd.best.ft] + ' ≤ ' + f(nd.best.th, 1) + '（左 ' + nd.left.n + ' 筆、右 ' + nd.right.n + ' 筆）'
        ]);
      });

      st.activeId = null; st.showReg = true;
      add(7, '葉節點多數決', '所有分支停止分裂，共形成 ' + T.leaves.length + ' 個葉節點，各以多數決給出預測類別。', [
        T.leaves.map(lf => lf.id + '(' + (lf.pred ? '是' : '否') + ':' + lf.c1 + '/' + lf.c0 + ')').join('、')
      ]);

      // 用一位新病人走一次樹
      const q = { age: 58, bmi: 27.5, glu: 132 };
      const res = T.predictOne(q);
      st.pathSet = new Set(res.path);
      st.queryPt = q; st.queryPred = res.pred;
      add(7, '新病人走一次決策樹', '來了一位 58 歲、BMI 27.5、血糖 132 的新病人，從根節點一路依條件往下走到葉節點。', [
        '路徑：' + res.path.join(' → '),
        '落入葉節點：是 ' + res.leaf.c1 + ' / 否 ' + res.leaf.c0 + ' → 預測「' + (res.pred ? '有' : '沒有') + '糖尿病」'
      ]);

      if (steps.length < 10) {
        const correct = rows.filter(r => T.predictOne(r).pred === r.dm).length;
        add(7, '訓練準確率總結', '整棵樹對這 14 位病人的訓練集共答對 ' + correct + ' 位。', [
          '訓練準確率 = ' + correct + ' ÷ ' + rows.length + ' = ' + LAB.pct(correct / rows.length, 1)
        ]);
      }
      if (steps.length < 10) {
        add(7, '淺樹與深樹差異', '深度越大能切出越多矩形區域，但也越容易在少數幾筆樣本上過擬合。', [
          '目前葉節點數 = ' + T.leaves.length + '，最大深度 = ' + p.max_depth
        ]);
      }
      if (steps.length < 10) {
        add(7, '矩形判定區說明', '每個葉節點都對應特徵空間中的一個矩形區塊，同一區塊內的新病人都會得到相同預測。', [
          '共切出 ' + T.leaves.length + ' 個互不重疊的矩形區域'
        ]);
      }
      return steps;
    },

    keys(steps, rows, p) {
      const T = buildTree(rows, p);
      const k = {
        n_leaves: T.leaves.length,
        n_internals: T.internals.length,
        train_acc: rows.filter(r => T.predictOne(r).pred === r.dm).length / rows.length
      };
      T.internals.forEach((nd, i) => {
        k['node_' + i + '_feat'] = nd.best.fIdx;
        k['node_' + i + '_th'] = nd.best.th;
        k['node_' + i + '_gain'] = nd.best.gain;
      });
      T.leaves.forEach((lf, i) => {
        k['leaf_' + i + '_n'] = lf.n;
        k['leaf_' + i + '_pred'] = lf.pred;
      });
      return k;
    },

    explain(steps, rows, p) {
      const T = buildTree(rows, p);
      const acc = rows.filter(r => T.predictOne(r).pred === r.dm).length / rows.length;
      return [
        '以 ' + (p.criterion === 'gini' ? 'Gini' : '資訊增益') + ' 為準則、最大深度 ' + p.max_depth + '、葉節點最少 ' + p.min_leaf + ' 筆，長出 ' + T.leaves.length + ' 個葉節點的決策樹。',
        T.root.best ? '根節點選擇「' + FLAB[T.root.best.ft] + ' ≤ ' + f(T.root.best.th, 1) + '」作為第一刀，不純度下降 ' + f(T.root.best.gain, 3) + '。' : '根節點未分裂。',
        '整棵樹在訓練集準確率為 ' + LAB.pct(acc, 1) + '；圖上可以看到每個分裂都在特徵空間畫出垂直或水平的矩形邊界。',
        '若不限制深度（max_depth）或葉節點最少筆數，決策樹會切到每個葉子只剩 1–2 筆而嚴重過擬合。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Set Role', 'Decision Tree'],
      params: [
        ['Set Role › dm', 'label'],
        ['Decision Tree › criterion', p => p.criterion === 'gini' ? 'gini_index' : 'information_gain'],
        ['Decision Tree › maximal depth', p => String(p.max_depth)],
        ['Decision Tree › apply pruning / prepruning', 'false（關閉）']
      ],
      note: 'AI Studio 的 Decision Tree 預設使用 gain_ratio 且開啟 pruning 與 prepruning；需改為 gini_index 或 information_gain 並關閉剪枝，才會與本實驗及 scikit-learn 對齊。',
      expect: (steps, rows, p) => {
        const T = buildTree(rows, p);
        return [
          T.root.best ? '根節點分裂：' + T.root.best.ft + ' ≤ ' + f(T.root.best.th, 1) : '未分裂',
          '葉節點數 = ' + T.leaves.length
        ];
      },
      python: `from sklearn.tree import DecisionTreeClassifier\ndt = DecisionTreeClassifier(criterion='gini', max_depth=2, min_samples_leaf=1, random_state=0).fit(X, y)`,
      confirmed: false
    }
  });
})();
