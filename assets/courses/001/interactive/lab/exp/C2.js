/* C2 階層式分群 */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = LAB.data.columns('clinic', ['bmi', 'glu']);
  const AX = { x: { label: 'Z(BMI)', min: -2.8, max: 2.8 }, y: { label: 'Z(空腹血糖)', min: -2.8, max: 2.8 } };
  const pick = r => ({ id: r.id, bmi: r.bmi, glu: r.glu });

  function runHClust(rows, p) {
    const n = rows.length;
    const bmis = LAB.col(rows, 'bmi'), glus = LAB.col(rows, 'glu');
    const mB = M.mean(bmis), sB = M.sd(bmis) || 1;
    const mG = M.mean(glus), sG = M.sd(glus) || 1;
    const Z = rows.map(r => [(r.bmi - mB) / sB, (r.glu - mG) / sG]);

    const pairD = (i, j) => Math.hypot(Z[i][0] - Z[j][0], Z[i][1] - Z[j][1]);
    let clusters = rows.map((r, i) => ({ cid: i, label: '#' + r.id, size: 1, members: [i] }));
    const dist = new Map();
    const key = (a, b) => a < b ? a + ',' + b : b + ',' + a;
    for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) dist.set(key(i, j), pairD(i, j));

    const merges = [];
    const method = p.linkage || 'average';

    for (let step = 0; step < n - 1; step++) {
      // snapshot of current matrix before merge
      const curIds = clusters.map(c => c.cid);
      const curLabels = clusters.map(c => c.label);
      const mat = clusters.map((ci, r) => clusters.map((cj, c) => r === c ? 0 : dist.get(key(ci.cid, cj.cid))));

      let best = null;
      for (let i = 0; i < clusters.length; i++) {
        for (let j = i + 1; j < clusters.length; j++) {
          const d = dist.get(key(clusters[i].cid, clusters[j].cid));
          if (!best || d < best.d - 1e-12) best = { i, j, d };
        }
      }
      const cA = clusters[best.i], cB = clusters[best.j];
      const newCid = n + step;
      const newClus = { cid: newCid, label: 'G' + (step + 1), size: cA.size + cB.size, members: cA.members.concat(cB.members) };

      const remaining = clusters.filter((_, idx) => idx !== best.i && idx !== best.j);
      remaining.forEach(cC => {
        const dAC = dist.get(key(cA.cid, cC.cid));
        const dBC = dist.get(key(cB.cid, cC.cid));
        let dNew;
        if (method === 'single') dNew = Math.min(dAC, dBC);
        else if (method === 'complete') dNew = Math.max(dAC, dBC);
        else dNew = (cA.size * dAC + cB.size * dBC) / (cA.size + cB.size);
        dist.set(key(newCid, cC.cid), dNew);
      });

      clusters = remaining.concat([newClus]);
      merges.push({
        step: step + 1,
        a: cA.cid, b: cB.cid, aLabel: cA.label, bLabel: cB.label,
        newCid, newLabel: newClus.label,
        h: best.d, size: newClus.size,
        matLabels: curLabels, mat, bestI: best.i, bestJ: best.j,
        groupsAfter: clusters.map(c => c.members.slice())
      });
    }

    const cutK = Math.max(2, Math.min(4, Math.round(p.cut || 3)));
    const mergeIdxAtCut = n - cutK - 1;
    const cutGroups = mergeIdxAtCut >= 0 ? merges[mergeIdxAtCut].groupsAfter : rows.map((_, i) => [i]);
    const hLo = mergeIdxAtCut >= 0 ? merges[mergeIdxAtCut].h : 0;
    const hHi = merges[mergeIdxAtCut + 1].h;
    const cutH = 0.5 * (hLo + hHi);

    // 依每群最小成員索引排序，給穩定群號 0..cutK-1
    const sortedGroups = cutGroups.slice().sort((g1, g2) => Math.min(...g1) - Math.min(...g2));
    const labels = M.range(n, () => 0);
    sortedGroups.forEach((g, gi) => g.forEach(idx => { labels[idx] = gi; }));

    return { Z, merges, cutK, cutH, labels, hMax: Math.max(2, merges[merges.length - 1].h * 1.15) };
  }

  LAB.register({
    id: 'C2', group: 'C', title: '階層式分群',
    module: { name: 'M3 第 05 節', url: '../m3/#p05' },
    goal: '看懂凝聚式階層分群如何從距離矩陣挑出最近的兩群合併、依連結法更新距離、長出樹狀圖，並在指定群數切開。',
    data: {
      name: 'clinic_hc',
      scenario: '門診健檢：8 位病人的標準化 BMI 與血糖，觀察階層式分群樹狀圖如何一層層合併',
      columns: COLS,
      editable: ['bmi', 'glu'],
      small: seed => LAB.data.clinic(seed, 8).map(pick)
    },
    params: [
      { key: 'linkage', label: '連結法 Linkage', type: 'choice', value: 'average', options: [{ v: 'single', label: '單一 (最近)' }, { v: 'complete', label: '完全 (最遠)' }, { v: 'average', label: '平均 (UPGMA)' }] },
      { key: 'cut', label: '切分群數 K', type: 'int', min: 2, max: 4, step: 1, value: 3 }
    ],
    pseudo: [
      '把 BMI 與血糖標準化，算兩兩距離矩陣',
      '一開始每位病人各自成一群',
      '重複直到全部合成 1 群：',
      '  找距離矩陣中最小的一對 (A, B)',
      '  合併 A 與 B，記錄合併高度',
      '  依連結法更新新群與其他群距離',
      '在指定群數 K 處畫水平線切開'
    ],
    build(rows, p) {
      const R = runHClust(rows, p), steps = [];
      const n = rows.length;
      const mName = p.linkage === 'single' ? '單一連結' : p.linkage === 'complete' ? '完全連結' : '平均連結';

      function dendroNodes(uptoStep, showCut) {
        const nodes = [];
        const parentOf = {};
        for (let s = 0; s < uptoStep; s++) {
          const mg = R.merges[s];
          parentOf[mg.a] = 'm' + mg.newCid;
          parentOf[mg.b] = 'm' + mg.newCid;
          nodes.push({
            id: 'm' + mg.newCid,
            h: mg.h,
            sub: f(mg.h, 2),
            active: s === uptoStep - 1 && !showCut
          });
        }
        nodes.forEach(nd => {
          const cid = parseInt(nd.id.slice(1), 10);
          if (parentOf[cid]) nd.parent = parentOf[cid];
        });
        rows.forEach((r, i) => {
          nodes.push({
            id: r.id,
            parent: parentOf[i] || undefined,
            label: String(r.id),
            cls: showCut ? 'c' + R.labels[i] : 'c5'
          });
        });
        return nodes;
      }

      function views(st) {
        const main = {
          type: 'tree', slot: 'main', mode: 'dendro',
          title: '樹狀圖 Dendrogram（' + mName + '）',
          hMax: R.hMax,
          cut: st.showCut ? R.cutH : undefined,
          nodes: dendroNodes(st.upto, st.showCut)
        };
        const mg = R.merges[Math.min(st.matStep, R.merges.length - 1)];
        const side = {
          type: 'matrix', slot: 'side',
          title: '群間距離矩陣（第 ' + mg.step + ' 輪前）',
          rowLabels: mg.matLabels,
          colLabels: mg.matLabels,
          values: mg.mat,
          digits: 2,
          heat: true,
          hl: st.hlMin ? [[mg.bestI, mg.bestJ], [mg.bestJ, mg.bestI]] : []
        };
        const curGroups = st.upto === 0 ? rows.map((_, i) => [i]) : R.merges[st.upto - 1].groupsAfter;
        const ptCls = M.range(n, () => 'c5');
        if (st.showCut) {
          rows.forEach((_, i) => { ptCls[i] = 'c' + R.labels[i]; });
        } else {
          curGroups.forEach((g, gi) => { if (g.length > 1) g.forEach(idx => { ptCls[idx] = 'c' + (gi % 5); }); });
        }
        const scatter = {
          type: 'scatter', slot: 'bottom',
          title: '標準化 BMI × 血糖（同色＝同一群）',
          axes: AX,
          points: rows.map((r, i) => ({ id: 'p' + r.id, x: R.Z[i][0], y: R.Z[i][1], cls: ptCls[i], label: String(r.id), r: 6 })),
          lines: [], circles: [],
          legend: [{ cls: 'c5', label: '尚未合併' }, { cls: 'c0', label: '群 1' }, { cls: 'c1', label: '群 2' }]
        };
        return [main, side, scatter];
      }

      const st = { upto: 0, matStep: 0, hlMin: false, showCut: false };
      const add = (line, title, say, calc, extra) => steps.push(Object.assign({ line, title, say, calc: calc || [], views: views(st), focus: [] }, extra));

      add(0, '題目', '8 位門診病人一開始各自成一群。用「' + mName + '」一步步把最近的兩群合併，最後切成 ' + R.cutK + ' 群。', [
        '起始群數 = ' + n + '，目標切分 = ' + R.cutK + ' 群'
      ]);

      st.hlMin = true;
      R.merges.forEach((mg, idx) => {
        st.matStep = idx;
        if (idx < 3) {
          add(4, '第 ' + mg.step + ' 輪：找最小距離', '在距離矩陣找出距離最小的一對：' + mg.aLabel + ' 與 ' + mg.bLabel + '。', [
            'd(' + mg.aLabel + ', ' + mg.bLabel + ') = ' + f(mg.h, 3)
          ], { phase: '第 ' + mg.step + ' 輪' });
        }
        st.upto = mg.step;
        add(6, '合併 ' + mg.aLabel + ' ＋ ' + mg.bLabel, '將兩群合併成 ' + mg.newLabel + '（樹狀圖高度 ' + f(mg.h, 2) + '），並依' + mName + '更新與其他群的距離。', [
          '合併高度 = ' + f(mg.h, 3) + '，目前剩 ' + (n - mg.step) + ' 群'
        ], { phase: mg.step + ' / ' + (n - 1) });
      });

      st.showCut = true; st.hlMin = false;
      add(7, '在高度 ' + f(R.cutH, 2) + ' 切開成 ' + R.cutK + ' 群', '畫一條水平切線，線底下有幾條樹枝就分成幾群！', [
        '切線高度 = ' + f(R.cutH, 3) + ' → 分成 ' + R.cutK + ' 群'
      ]);

      return steps;
    },

    keys(steps, rows, p) {
      const R = runHClust(rows, p);
      const k = { cut_h: R.cutH };
      R.merges.forEach((mg, i) => {
        k['m' + i + '_a'] = mg.a;
        k['m' + i + '_b'] = mg.b;
        k['m' + i + '_h'] = mg.h;
      });
      R.labels.forEach((lb, i) => { k['cluster_' + rows[i].id] = lb; });
      return k;
    },

    explain(steps, rows, p) {
      const R = runHClust(rows, p);
      return [
        '凝聚式階層分群從 8 個單點群出發，經歷 7 次合併直到全部合為 1 群，最高合併高度為 ' + f(R.merges[R.merges.length - 1].h, 2) + '。',
        '在高度 ' + f(R.cutH, 2) + ' 水平切開後，剛好分成 ' + R.cutK + ' 群。',
        '單一連結容易拉出長鏈（受噪點串連）；完全連結偏好緊密球狀；平均連結（UPGMA）折衷兩者。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Normalize', 'Agglomerative Clustering', 'Flatten Clustering'],
      params: [
        ['Agglomerative Clustering › mode', p => p.linkage === 'single' ? 'SingleLink' : p.linkage === 'complete' ? 'CompleteLink' : 'AverageLink'],
        ['Flatten Clustering › number of clusters', p => String(p.cut)]
      ],
      note: 'AI Studio 需先用 Agglomerative Clustering 建樹狀圖，再接 Flatten Clustering 指定群數切開。',
      expect: (steps, rows, p) => {
        const R = runHClust(rows, p);
        return ['切分 ' + R.cutK + ' 群（切線高度 ' + f(R.cutH, 2) + '）'];
      },
      python: `from scipy.cluster.hierarchy import linkage, fcluster\nZ_link = linkage(Z, method='average')\nlabels = fcluster(Z_link, t=3, criterion='maxclust')`,
      confirmed: false
    }
  });
})();
