/* D2 FP-Growth */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const ITEMS = LAB.data.rxItems.map(x => x[0]);
  const COLS = LAB.data.columns('rx', ITEMS);

  function runFPGrowth(rows, p) {
    const n = rows.length;
    const minSup = p.min_sup || 0.3;
    const minCnt = Math.ceil(minSup * n - 1e-12);

    // 第一次掃描：統計單項次數，保留 >= minCnt，依次數降冪（平手依字母序）
    const counts = {};
    ITEMS.forEach(it => { counts[it] = 0; });
    rows.forEach(r => r.items.forEach(it => { counts[it]++; }));
    const freq1 = ITEMS.filter(it => counts[it] >= minCnt)
      .sort((a, b) => counts[b] - counts[a] || (a < b ? -1 : 1));
    const rankMap = {};
    freq1.forEach((it, idx) => { rankMap[it] = idx; });

    // 第二次掃描：每筆交易依 freq1 順序排序
    const sortedTx = rows.map(r => ({
      id: r.id,
      items: r.items.filter(it => rankMap[it] != null).sort((a, b) => rankMap[a] - rankMap[b])
    }));

    // 建 FP-tree（同時記錄每筆插入後的樹快照）
    let nextNid = 1;
    const root = { id: 'root', item: null, count: 0, parent: null, children: {}, pathStr: 'root' };
    const allNodes = [root];

    function insertTx(treeRoot, txItems, mult, nodeList) {
      let cur = treeRoot;
      const touched = ['root'];
      txItems.forEach(it => {
        if (!cur.children[it]) {
          const pStr = cur.pathStr === 'root' ? it : cur.pathStr + '>' + it;
          const nd = { id: 'n' + (nextNid++), item: it, count: 0, parent: cur.id, children: {}, pathStr: pStr };
          cur.children[it] = nd;
          nodeList.push(nd);
        }
        cur = cur.children[it];
        cur.count += mult;
        touched.push(cur.id);
      });
      return touched;
    }

    const txSnaps = [];
    sortedTx.forEach(tx => {
      const touched = insertTx(root, tx.items, 1, allNodes);
      txSnaps.push({
        txId: tx.id,
        items: tx.items,
        touched: new Set(touched),
        nodesSnap: allNodes.map(nd => ({ id: nd.id, item: nd.item, count: nd.count, parent: nd.parent, pathStr: nd.pathStr }))
      });
    });

    // FP-Growth 遞迴挖掘（以獨立函式從條件模式基建條件樹）
    function mineTree(headerOrder, treeNodes, prefix, outMap) {
      for (let i = headerOrder.length - 1; i >= 0; i--) {
        const it = headerOrder[i];
        const matching = treeNodes.filter(nd => nd.item === it);
        const supCnt = M.sum(matching.map(nd => nd.count));
        if (supCnt < minCnt) continue;
        const newPat = prefix.concat([it]).sort();
        outMap.set(newPat.join('+'), supCnt / n);

        // 找條件模式基（每條祖先路徑與計數）
        const condPaths = [];
        const nodeById = {};
        treeNodes.forEach(nd => { nodeById[nd.id] = nd; });
        matching.forEach(nd => {
          const path = [];
          let cur = nodeById[nd.parent];
          while (cur && cur.item != null) { path.push(cur.item); cur = nodeById[cur.parent]; }
          path.reverse();
          if (path.length) condPaths.push({ path, count: nd.count });
        });

        // 建條件樹
        const cCounts = {};
        condPaths.forEach(cp => cp.path.forEach(x => { cCounts[x] = (cCounts[x] || 0) + cp.count; }));
        const cOrder = Object.keys(cCounts).filter(x => cCounts[x] >= minCnt)
          .sort((a, b) => cCounts[b] - cCounts[a] || (a < b ? -1 : 1));
        if (cOrder.length) {
          const cRank = {}; cOrder.forEach((x, idx) => { cRank[x] = idx; });
          const cRoot = { id: 'croot_' + nextNid++, item: null, count: 0, parent: null, children: {}, pathStr: 'root' };
          const cNodes = [cRoot];
          condPaths.forEach(cp => {
            const filt = cp.path.filter(x => cRank[x] != null).sort((a, b) => cRank[a] - cRank[b]);
            if (filt.length) insertTx(cRoot, filt, cp.count, cNodes);
          });
          mineTree(cOrder, cNodes, newPat, outMap);
        }
      }
    }

    const freqMap = new Map();
    mineTree(freq1, allNodes, [], freqMap);

    // 記錄每個頻繁單項的條件模式基（供教學展示）
    const nodeById = {};
    allNodes.forEach(nd => { nodeById[nd.id] = nd; });
    const condBases = freq1.slice().reverse().map(it => {
      const matching = allNodes.filter(nd => nd.item === it);
      const paths = [];
      matching.forEach(nd => {
        const path = [];
        let cur = nodeById[nd.parent];
        while (cur && cur.item != null) { path.push(cur.item); cur = nodeById[cur.parent]; }
        path.reverse();
        paths.push({ items: path, count: nd.count });
      });
      return { item: it, label: LAB.data.rxLabel(it), paths };
    });

    return { counts, freq1, sortedTx, allNodes, txSnaps, condBases, freqMap };
  }

  LAB.register({
    id: 'D2', group: 'D', title: 'FP-Growth',
    module: { name: 'M4 第 13 節', url: '../m4/#p13' },
    goal: '看懂 FP-Growth 如何只掃描資料兩次，把全部處方壓縮進一棵前綴樹（FP-tree），不產生候選集就直接挖出頻繁項目集。',
    data: {
      name: 'rx_fp',
      scenario: '門診處方籃：10 張處方籤壓縮成 FP-tree，與 Apriori 得出完全相同的頻繁項目集',
      columns: COLS,
      small: seed => LAB.data.rx(seed, 10),
      view: rows => ({
        type: 'tokens',
        groups: rows.map(r => ({
          id: 'tx' + r.id,
          label: '處方 #' + r.id,
          items: r.items.map(k => ({ id: r.id + '_' + k, text: LAB.data.rxLabel(k) }))
        }))
      })
    },
    params: [
      { key: 'min_sup', label: '最小支持度 min_sup', type: 'num', min: 0.2, max: 0.6, step: 0.05, value: 0.3 }
    ],
    pseudo: [
      '第 1 次掃描：數單項次數並降冪排序',
      '過濾掉低於 min_sup 的項目',
      '第 2 次掃描：交易依頻繁序重排',
      '逐筆插入 FP-tree（共用前綴計數+1）',
      '從次數最少的項目往上追溯前綴：',
      '  取出條件模式基、建條件 FP-tree',
      '  不產生候選直接輸出頻繁項目集'
    ],
    build(rows, p) {
      const R = runFPGrowth(rows, p), steps = [];

      function views(st) {
        const nodes = st.nodesSnap.map(nd => ({
          id: nd.id,
          parent: nd.parent || undefined,
          label: nd.item ? LAB.data.rxLabel(nd.item) : 'Root',
          sub: nd.item ? String(nd.count) : undefined,
          active: st.touched && st.touched.has(nd.id),
          cls: st.touched && st.touched.has(nd.id) ? 'hl' : undefined
        }));
        const main = {
          type: 'tree', slot: 'main',
          title: 'FP-tree 前綴樹（節點數字＝累積次數）',
          nodes: nodes.length ? nodes : [{ id: 'root', label: 'Root' }]
        };
        const side = {
          type: 'table', slot: 'side',
          title: '依頻繁序重排後的處方',
          cols: [{ key: 'id', label: '#' }, { key: 'items', label: '排序後藥品' }],
          rows: R.sortedTx.map((tx, i) => ({
            id: tx.id,
            cells: [tx.id, st.sortedShown ? (tx.items.map(LAB.data.rxLabel).join('、') || '（無）') : '待排序'],
            hl: st.curTx === i
          }))
        };
        const groups = [];
        if (st.showCond) {
          groups.push({
            id: 'cb', title: '條件模式基（由少到多）',
            items: R.condBases.slice(0, 6).map(cb => ({
              id: 'cb_' + cb.item,
              text: cb.label + ' ← ' + (cb.paths.map(x => (x.items.map(LAB.data.rxLabel).join('+') || '∅') + ':' + x.count).join('｜') || '∅')
            }))
          });
          groups.push({
            id: 'fp', title: '挖出的頻繁項目集（前 8 個）',
            items: Array.from(R.freqMap.entries()).slice(0, 8).map(([k, sup]) => ({
              id: 'fp_' + k,
              text: k.split('+').map(LAB.data.rxLabel).join('＋'),
              value: f(sup, 2),
              state: 'keep'
            }))
          });
        }
        const sets = {
          type: 'sets', slot: 'bottom',
          title: '條件模式基與頻繁項目集',
          groups: groups.length ? groups : [{ id: 'wait', title: '建樹中', items: [{ id: 'w', text: '先完成兩次掃描建出 FP-tree' }] }]
        };
        return [main, side, sets];
      }

      const st = { nodesSnap: [{ id: 'root', item: null, count: 0, parent: null }], touched: null, sortedShown: false, curTx: -1, showCond: false };
      const add = (line, title, say, calc, extra) => steps.push(Object.assign({ line, title, say, calc: calc || [], views: views(st), focus: [] }, extra));

      add(0, '題目', 'Apriori 每層都要重掃資料很慢。FP-Growth 只要掃描 10 張處方兩次，把交易壓成一棵樹（min_sup = ' + f(p.min_sup, 2) + '）。', [
        '門檻次數 = ' + Math.ceil(p.min_sup * rows.length - 1e-12) + ' / ' + rows.length
      ]);

      add(1, '第 1 次掃描：統計單項', '數出每類藥品出現次數、去掉低於門檻的項目，剩下的依出現次數由大到小排好。', [
        '頻繁單項序：' + R.freq1.map(x => LAB.data.rxLabel(x) + '(' + R.counts[x] + ')').join(' > ')
      ]);

      st.sortedShown = true;
      add(3, '第 2 次掃描：重排每筆交易', '把每張處方的藥品照剛剛排好的頻繁順序重排，這樣越常見的藥品越靠近樹根、越容易共用節點！', [
        '範例 #1：' + (R.sortedTx[0].items.map(LAB.data.rxLabel).join(' → ') || '（無）')
      ]);

      R.txSnaps.forEach((sn, idx) => {
        st.curTx = idx;
        st.nodesSnap = sn.nodesSnap;
        st.touched = sn.touched;
        if (idx < 5 || idx === R.txSnaps.length - 1) {
          add(4, '插入處方 #' + sn.txId, '沿樹根往下走：路徑已存在就把節點計數 +1，沒有才長新分支。', [
            '#' + sn.txId + '：' + (sn.items.map(LAB.data.rxLabel).join(' → ') || '（無）')
          ], { phase: (idx + 1) + ' / ' + R.txSnaps.length });
        }
      });
      st.curTx = -1; st.touched = null;
      add(4, '完成全部處方建樹', '全部 10 張處方都壓縮進這棵 FP-tree 裡（共 ' + (R.allNodes.length - 1) + ' 個藥品節點），之後不再看原始資料表！', [
        '樹節點數 = ' + (R.allNodes.length - 1)
      ]);

      st.showCond = true;
      if (R.condBases.length) {
        const cb0 = R.condBases[0];
        add(5, '由下往上：追溯 ' + cb0.label, '從出現次數最少的頻繁單項「' + cb0.label + '」開始，沿父節點往上收集它的前綴路徑（條件模式基）。', [
          cb0.label + ' 前綴路徑：' + (cb0.paths.map(x => (x.items.map(LAB.data.rxLabel).join('+') || '∅') + ':' + x.count).join('｜') || '∅')
        ]);
      }
      add(6, '取條件模式基與建條件樹', '對每個頻繁單項建立條件 FP-tree，遞迴挖出所有包含該項目的頻繁組合。', [
        '共挖出 ' + R.freqMap.size + ' 個頻繁項目集（與 Apriori 完全相同）'
      ]);

      add(7, 'FP-Growth 完成', '不需產生龐大的候選集 C2、C3，就直接在樹上挖出全部頻繁項目集。', [
        '頻繁項目集數量 = ' + R.freqMap.size
      ]);

      add(7, '共用前綴與壓縮效率', '把出現次數最多的藥品排在最前面，整棵樹的共用前綴比例最高、節點數最少，記憶體佔用遠低於 Apriori 候選集！', [
        '頻繁單項 ' + R.freq1.length + ' 種，壓縮為 ' + (R.allNodes.length - 1) + ' 個樹節點'
      ]);
      add(7, '兩大演算法比較', '兩者挖出的頻繁項目集 100% 一致，但 FP-Growth 只掃描資料庫 2 次、免產生 C2/C3 候選，是實務預設首選（若含時間順序看 D3）。', [
        '掃描次數：Apriori k 次 vs FP-Growth 固定 2 次'
      ]);
      return steps;
    },

    keys(steps, rows, p) {
      const R = runFPGrowth(rows, p);
      const k = {
        n_tree_nodes: R.allNodes.length - 1,
        n_freq: R.freqMap.size
      };
      R.allNodes.forEach(nd => {
        if (nd.item) k['node_' + nd.pathStr] = nd.count;
      });
      R.freqMap.forEach((sup, key) => { k['sup_' + key] = sup; });
      return k;
    },

    explain(steps, rows, p) {
      const R = runFPGrowth(rows, p);
      return [
        'FP-Growth 只掃描 10 張處方兩次：第一次找出 ' + R.freq1.length + ' 個頻繁單項並降冪排序，第二次將交易壓成 ' + (R.allNodes.length - 1) + ' 個節點的 FP-tree。',
        '接著從次數最少的項目往上追溯前綴路徑（條件模式基），共挖出 ' + R.freqMap.size + ' 個頻繁項目集。',
        '最終找出的頻繁項目集與支持度和 Apriori 100% 相同，但完全省去了產生候選集與反覆掃描資料的成本。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Numerical to Polynominal', 'FP-Growth'],
      params: [
        ['FP-Growth › min support', p => String(p.min_sup)]
      ],
      note: 'AI Studio 的關聯規則核心正是 FP-Growth；輸入需為布林或 nominal/binominal 欄位。',
      expect: (steps, rows, p) => {
        const R = runFPGrowth(rows, p);
        return ['挖出頻繁項目集共 ' + R.freqMap.size + ' 個'];
      },
      python: `from mlxtend.frequent_patterns import fpgrowth\nfreq = fpgrowth(df_bool, min_support=0.3, use_colnames=True)`,
      confirmed: false
    }
  });
})();
