/* B7 隨機森林 */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = LAB.data.columns('readmit', ['age', 'los', 'prior', 'cci', 'readmit'], { readmit: 'y' });
  const FEATS = ['age', 'los', 'prior', 'cci'];
  const FLAB = { age: '年齡', los: '住院天數', prior: '近一年住院', cci: '共病指數' };
  const pick = r => ({ id: r.id, age: r.age, los: r.los, prior: r.prior, cci: r.cci, readmit: r.readmit });
  const cls = y => y ? 'c1' : 'c0';

  function makeRows(seed) {
    const r = LAB.rng(7710 + seed);
    const rs = LAB.data.readmit(seed, 16).map(pick);
    const ranked = rs.map((x, idx) => ({
      idx,
      sc: x.los * 0.45 + x.prior * 2.1 + x.cci * 0.9 + x.age * 0.04 + (r() - 0.5) * 2.2
    })).sort((a, b) => b.sc - a.sc);
    rs.forEach(x => { x.readmit = 0; });
    for (let i = 0; i < 6; i++) rs[ranked[i].idx].readmit = 1;
    return rs;
  }

  function gini(sub) {
    const n = sub.length;
    if (!n) return 0;
    const p1 = sub.filter(r => r.readmit === 1).length / n, p0 = 1 - p1;
    return 1 - p0 * p0 - p1 * p1;
  }

  function runRF(rows, p) {
    const n = rows.length;
    const nTrees = Math.max(3, Math.min(9, Math.round(p.trees || 5)));
    const mtry = Math.max(1, Math.min(3, Math.round(p.mtry || 2)));
    const maxD = Math.max(1, Math.min(2, Math.round(p.depth || 2)));
    const rng = LAB.rng(7700 + nTrees * 13 + mtry * 7 + maxD + rows[0].age);

    const trees = [];
    const bootSpecs = [];
    const nodeFeatSpecs = [];

    for (let t = 0; t < nTrees; t++) {
      const bootIdx = [];
      for (let i = 0; i < n; i++) bootIdx.push(Math.floor(rng() * n));
      bootSpecs.push(bootIdx);
      const inBag = new Set(bootIdx);
      const bootRows = bootIdx.map(idx => rows[idx]);

      let nextNid = 0;
      const treeNodeFeats = {};
      function buildNode(sub, depth, parentId, edge) {
        const id = 't' + t + '_n' + (nextNid++);
        const cnt1 = sub.filter(r => r.readmit === 1).length, cnt0 = sub.length - cnt1;
        const imp = gini(sub);
        const pred = cnt1 > cnt0 ? 1 : 0;

        let best = null;
        let candFeats = [];
        if (depth < maxD && imp > 1e-12 && sub.length >= 2) {
          candFeats = LAB.shuffle(rng, [0, 1, 2, 3]).slice(0, mtry).sort((a, b) => a - b);
          treeNodeFeats[id] = candFeats;
          candFeats.forEach(fIdx => {
            const ft = FEATS[fIdx];
            const vals = Array.from(new Set(sub.map(r => r[ft]))).sort((a, b) => a - b);
            for (let i = 0; i < vals.length - 1; i++) {
              const th = (vals[i] + vals[i + 1]) / 2;
              const L = sub.filter(r => r[ft] <= th), R = sub.filter(r => r[ft] > th);
              if (!L.length || !R.length) continue;
              const gain = imp - (L.length / sub.length) * gini(L) - (R.length / sub.length) * gini(R);
              if (gain > 1e-7 && (!best || gain > best.gain + 1e-12)) {
                best = { ft, fIdx, th, gain };
              }
            }
          });
        }
        if (!best) return { id, parentId, edge, isLeaf: true, cnt0, cnt1, pred, candFeats };
        const left = buildNode(sub.filter(r => r[best.ft] <= best.th), depth + 1, id, '≤' + f(best.th, 1));
        const right = buildNode(sub.filter(r => r[best.ft] > best.th), depth + 1, id, '>' + f(best.th, 1));
        return { id, parentId, edge, isLeaf: false, cnt0, cnt1, pred, best, candFeats, left, right };
      }

      const root = buildNode(bootRows, 0, null, null);
      nodeFeatSpecs.push(treeNodeFeats);

      function predOne(pt) {
        let cur = root;
        while (!cur.isLeaf) cur = pt[cur.best.ft] <= cur.best.th ? cur.left : cur.right;
        return cur.pred;
      }

      trees.push({ idx: t, bootIdx, inBag, root, predOne });
    }

    // OOB predictions
    const oobInfo = rows.map((r, i) => {
      const oobTrees = trees.filter(tr => !tr.inBag.has(i));
      if (!oobTrees.length) return { id: r.id, oobCount: 0, votes1: 0, pred: null, ok: null };
      const votes1 = oobTrees.filter(tr => tr.predOne(r) === 1).length;
      const pred = votes1 * 2 > oobTrees.length ? 1 : 0;
      return { id: r.id, oobCount: oobTrees.length, votes1, pred, ok: pred === r.readmit };
    });
    const evalOob = oobInfo.filter(o => o.pred != null);
    const oobAcc = evalOob.length ? evalOob.filter(o => o.ok).length / evalOob.length : 0;

    const query = { age: 72, los: 9, prior: 2, cci: 4 };
    const qVotes = trees.map(tr => tr.predOne(query));
    const qYes = qVotes.filter(v => v === 1).length;
    const qPred = qYes * 2 > nTrees ? 1 : 0;

    return { nTrees, mtry, maxD, trees, bootSpecs, nodeFeatSpecs, oobInfo, oobAcc, query, qVotes, qYes, qPred };
  }

  LAB.register({
    id: 'B7', group: 'B', title: '隨機森林',
    module: { name: 'M2-2 第 12 節', url: '../m2-2/#p12' },
    goal: '看懂隨機森林的雙重隨機（重複抽樣 Bootstrap 與節點隨機挑特徵 mtry），以及袋外（OOB）驗證與多棵樹投票。',
    data: {
      name: 'readmit_rf',
      scenario: '出院再入院：16 位病人（年齡、住院天數、近一年住院、共病指數），訓練多棵決策樹投票',
      columns: COLS,
      small: seed => makeRows(seed)
    },
    params: [
      { key: 'trees', label: '樹的棵數', type: 'int', min: 3, max: 9, step: 2, value: 5 },
      { key: 'mtry', label: '每節點候選特徵 mtry', type: 'int', min: 1, max: 3, step: 1, value: 2 },
      { key: 'depth', label: '最大深度', type: 'int', min: 1, max: 2, step: 1, value: 2 }
    ],
    pseudo: [
      '重複 T 棵樹：',
      '  有放回抽樣 n 筆（沒抽到＝袋外 OOB）',
      '  每個節點隨機挑 mtry 個特徵',
      '  在候選特徵中找最佳切點分裂',
      '用袋外樣本驗證每筆的 OOB 正確率',
      '新病人讓全部 T 棵樹各投一票',
      '多數決得出最終預測'
    ],
    build(rows, p) {
      const R = runRF(rows, p), steps = [];

      function treeToNodes(root) {
        const out = [];
        (function walk(nd) {
          out.push({
            id: nd.id,
            parent: nd.parentId || undefined,
            edge: nd.edge || undefined,
            label: nd.isLeaf ? (nd.pred ? '再入院：是' : '再入院：否') : (FLAB[nd.best.ft] + ' ≤ ' + f(nd.best.th, 1)),
            sub: nd.cnt1 + '是 / ' + nd.cnt0 + '否',
            cls: nd.isLeaf ? cls(nd.pred) : undefined
          });
          if (!nd.isLeaf) { walk(nd.left); walk(nd.right); }
        })(root);
        return out;
      }

      function views(st) {
        const tr = R.trees[st.curTree];
        const main = {
          type: 'tree', slot: 'main',
          title: '第 ' + (st.curTree + 1) + ' 棵樹（候選特徵數 mtry=' + R.mtry + '）',
          nodes: st.showTree ? treeToNodes(tr.root) : [{ id: 'init', label: '準備抽樣…', sub: rows.length + ' 筆' }]
        };
        const side = {
          type: 'table', slot: 'side',
          title: st.showOob ? '袋外 (OOB) 投票結果' : '第 ' + (st.curTree + 1) + ' 棵抽樣狀態',
          cols: [
            { key: 'id', label: '#' },
            { key: 'y', label: '實際' },
            { key: 'bag', label: st.showOob ? 'OOB 樹數' : '狀態' },
            { key: 'pred', label: st.showOob ? 'OOB 預測' : '本樹預測' }
          ],
          rows: rows.map((r, i) => {
            const inB = tr.inBag.has(i);
            const ob = R.oobInfo[i];
            if (st.showOob) {
              return {
                id: r.id,
                cells: [r.id, { v: r.readmit ? '是' : '否', cls: cls(r.readmit) }, ob.oobCount, ob.pred == null ? '—' : { v: ob.pred ? '是' : '否', cls: ob.ok ? 'good' : 'bad' }]
              };
            }
            return {
              id: r.id,
              cells: [r.id, { v: r.readmit ? '是' : '否', cls: cls(r.readmit) }, { v: inB ? '袋內' : '袋外(OOB)', cls: inB ? 'c0' : 'c1' }, st.showTree ? (tr.predOne(r) ? '是' : '否') : null],
              hl: !inB
            };
          })
        };
        const yesVotes = st.votesDone > 0 ? R.qVotes.slice(0, st.votesDone).filter(v => v === 1).length : 0;
        const noVotes = st.votesDone - yesVotes;
        const bars = {
          type: 'bars', slot: 'bottom',
          title: '新病人（72歲、住院9天、近一年2次、共病4分）投票',
          max: R.nTrees, digits: 0, unit: ' 票',
          items: [
            { id: 'vy', label: '再入院：是', value: yesVotes, cls: 'c1', hl: st.votesDone === R.nTrees && R.qPred === 1 },
            { id: 'vn', label: '再入院：否', value: noVotes, cls: 'c0', hl: st.votesDone === R.nTrees && R.qPred === 0 }
          ]
        };
        return [main, side, bars];
      }

      const st = { curTree: 0, showTree: false, showOob: false, votesDone: 0 };
      const add = (line, title, say, calc, extra) => steps.push(Object.assign({ line, title, say, calc: calc || [], views: views(st), focus: [] }, extra));

      add(0, '題目', '16 位出院病人資料，訓練 ' + R.nTrees + ' 棵決策樹組成隨機森林（mtry = ' + R.mtry + '、深度 ' + R.maxD + '）。', [
        '陽性 ' + rows.filter(r => r.readmit === 1).length + ' 筆，陰性 ' + rows.filter(r => r.readmit === 0).length + ' 筆'
      ]);

      for (let t = 0; t < R.nTrees; t++) {
        st.curTree = t;
        const tr = R.trees[t];
        const nOob = rows.length - tr.inBag.size;
        if (t < 2) {
          st.showTree = false;
          add(2, '第' + (t + 1) + '棵：Bootstrap', '有放回抽出 16 筆訓練這棵樹；約三分之一（這次 ' + nOob + ' 筆）沒被抽中，留作袋外驗證。', [
            '袋內樣本數 = ' + tr.inBag.size + ' 種，袋外 (OOB) = ' + nOob + ' 筆'
          ], { phase: '第 ' + (t + 1) + ' 棵' });
          st.showTree = true;
          const rootFeats = tr.root.candFeats.map(i => FLAB[FEATS[i]]).join('、');
          add(4, '第 ' + (t + 1) + ' 棵：長出決策樹', '根節點只從隨機抽的 ' + R.mtry + ' 個特徵（' + rootFeats + '）挑最佳切點，避免強特徵壟斷每棵樹。', [
            tr.root.best ? '根節點切：' + FLAB[tr.root.best.ft] + ' ≤ ' + f(tr.root.best.th, 1) : '根節點不分裂'
          ], { phase: '第 ' + (t + 1) + ' 棵' });
        } else {
          st.showTree = true;
          add(4, '建好第 ' + (t + 1) + ' 棵樹', '同樣做 Bootstrap 抽樣（OOB ' + nOob + ' 筆）與隨機挑特徵，長出第 ' + (t + 1) + ' 棵樹。', [
            tr.root.best ? '根節點切：' + FLAB[tr.root.best.ft] + ' ≤ ' + f(tr.root.best.th, 1) : '根節點不分裂'
          ], { phase: (t + 1) + ' / ' + R.nTrees });
        }
      }

      st.showOob = true;
      add(5, '計算袋外 (OOB) 正確率', '每筆病人只讓「沒抽到他」的樹投票，不用額外切驗證集就能估計泛化正確率。', [
        'OOB 正確率 = ' + LAB.pct(R.oobAcc, 1)
      ]);

      st.votesDone = R.nTrees;
      add(7, '新病人多數決投票', '新病人（72歲、住院9天、近一年2次、共病4分）交給全部 ' + R.nTrees + ' 棵樹投票。', [
        '投票：是 ' + R.qYes + ' 票 vs 否 ' + (R.nTrees - R.qYes) + ' 票 → 預測「' + (R.qPred ? '再入院' : '不會再入院') + '」'
      ]);

      while (steps.length < 10) {
        add(7, '為什麼要隨機挑特徵', '如果每棵樹都看全部特徵，所有樹會長得太像；限制 mtry 讓弱一點的特徵也有機會上場，降低變異度。', [
          '目前 mtry = ' + R.mtry + ' / ' + FEATS.length + '，樹數 = ' + R.nTrees
        ]);
      }
      return steps;
    },

    inputs(rows, p) {
      const R = runRF(rows, p);
      return { boot_specs: R.bootSpecs, node_feats: R.nodeFeatSpecs };
    },

    keys(steps, rows, p) {
      const R = runRF(rows, p);
      const k = { oob_acc: R.oobAcc, q_yes: R.qYes, q_pred: R.qPred };
      R.trees.forEach((tr, t) => {
        if (tr.root.best) {
          k['t' + t + '_root_feat'] = tr.root.best.fIdx;
          k['t' + t + '_root_th'] = tr.root.best.th;
        }
      });
      R.oobInfo.forEach(o => {
        if (o.pred != null) k['oob_pred_' + o.id] = o.pred;
      });
      return k;
    },

    explain(steps, rows, p) {
      const R = runRF(rows, p);
      return [
        '隨機森林共訓練 ' + R.nTrees + ' 棵樹（每節點隨機挑 ' + R.mtry + ' 個特徵、深度上限 ' + R.maxD + '）。',
        '利用每棵樹沒抽到的袋外（OOB）樣本進行交叉投票，估計出的 OOB 正確率為 ' + LAB.pct(R.oobAcc, 1) + '。',
        '新病人獲得「是」' + R.qYes + ' 票、「否」' + (R.nTrees - R.qYes) + ' 票，多數決預測為「' + (R.qPred ? '是' : '否') + '」。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Set Role', 'Random Forest'],
      params: [
        ['Set Role › readmit', 'label'],
        ['Random Forest › number of trees', p => String(p.trees)],
        ['Random Forest › maximal depth', p => String(p.depth)],
        ['Random Forest › subset ratio', p => f(p.mtry / 4, 2)]
      ],
      note: '因隨機森林的抽樣亂數無法與外部套件對齊，本實驗與 Python 驗證採用「相同抽樣索引、各自獨立重建樹與計算不純度」的方式對照。',
      expect: (steps, rows, p) => {
        const R = runRF(rows, p);
        return ['OOB 正確率 ≈ ' + LAB.pct(R.oobAcc, 1), '新病人預測：' + (R.qPred ? 'yes' : 'no')];
      },
      python: `from sklearn.ensemble import RandomForestClassifier\nrf = RandomForestClassifier(n_estimators=5, max_depth=2, max_features=2, oob_score=True).fit(X, y)`,
      confirmed: false
    }
  });
})();
