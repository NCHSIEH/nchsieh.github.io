/* C3 DBSCAN */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = LAB.data.columns('clinic', ['bmi', 'glu']);
  const AX = { x: { label: 'Z(BMI)', min: -3.2, max: 3.4 }, y: { label: 'Z(空腹血糖)', min: -3.2, max: 3.4 } };
  const pick = r => ({ id: r.id, bmi: r.bmi, glu: r.glu });

  function makeRows(seed) {
    const base = LAB.data.clinic(seed, 14).map(pick);
    const bmis = LAB.col(base, 'bmi'), glus = LAB.col(base, 'glu');
    const mB = M.mean(bmis), sB = M.sd(bmis) || 1;
    const mG = M.mean(glus), sG = M.sd(glus) || 1;
    const r = LAB.rng(8800 + seed);
    const out1 = { id: 15, bmi: Math.round((mB + (2.2 + r() * 0.4) * sB) * 10) / 10, glu: Math.round(mG + (2.0 + r() * 0.4) * sG) };
    const out2 = { id: 16, bmi: Math.round((mB - (2.1 + r() * 0.4) * sB) * 10) / 10, glu: Math.round(mG + (1.9 + r() * 0.4) * sG) };
    return base.concat([out1, out2]);
  }

  function runDBSCAN(rows, p) {
    const n = rows.length;
    const bmis = LAB.col(rows, 'bmi'), glus = LAB.col(rows, 'glu');
    const mB = M.mean(bmis), sB = M.sd(bmis) || 1;
    const mG = M.mean(glus), sG = M.sd(glus) || 1;
    const Z = rows.map(r => [(r.bmi - mB) / sB, (r.glu - mG) / sG]);
    const eps = p.eps || 0.8;
    const minPts = Math.max(2, Math.round(p.min_pts || 3));

    const nbrs = M.range(n, i => {
      const list = [];
      for (let j = 0; j < n; j++) {
        if (Math.hypot(Z[i][0] - Z[j][0], Z[i][1] - Z[j][1]) <= eps + 1e-12) list.push(j);
      }
      return list;
    });
    const isCore = nbrs.map(list => list.length >= minPts);

    const labels = M.range(n, () => -2); // -2 unvisited, -1 noise, >=0 cluster
    const expandEvents = [];
    let cid = 0;

    for (let i = 0; i < n; i++) {
      if (labels[i] !== -2) continue;
      if (!isCore[i]) { labels[i] = -1; continue; }
      labels[i] = cid;
      const queue = nbrs[i].slice();
      const inQueue = new Set(queue);
      expandEvents.push({ type: 'start', cid, seed: i, queue: queue.slice(), labels: labels.slice() });
      let head = 0;
      while (head < queue.length) {
        const q = queue[head++];
        if (labels[q] === -1) labels[q] = cid;
        if (labels[q] !== -2) continue;
        labels[q] = cid;
        if (isCore[q]) {
          nbrs[q].forEach(nb => {
            if (!inQueue.has(nb) && (labels[nb] === -2 || labels[nb] === -1)) {
              queue.push(nb);
              inQueue.add(nb);
            }
          });
        }
        expandEvents.push({ type: 'visit', cid, cur: q, queue: queue.slice(head), labels: labels.slice() });
      }
      cid++;
    }

    const roles = rows.map((_, i) => isCore[i] ? 'core' : (labels[i] >= 0 ? 'border' : 'noise'));
    return { Z, eps, minPts, nbrs, isCore, labels, roles, expandEvents, nClusters: cid };
  }

  LAB.register({
    id: 'C3', group: 'C', title: 'DBSCAN',
    module: { name: 'M3 第 06 節', url: '../m3/#p06' },
    goal: '看懂 DBSCAN 如何依半徑 ε 與門檻 minPts 區分核心點、邊界點與雜訊，並從核心點逐一擴張成任意形狀的群。',
    data: {
      name: 'clinic_dbscan',
      scenario: '門診健檢：14 位病人加上 2 個刻意加入的極端離群點，觀察 DBSCAN 怎麼自動抓出雜訊',
      columns: COLS,
      editable: ['bmi', 'glu'],
      small: seed => makeRows(seed)
    },
    params: [
      { key: 'eps', label: '鄰域半徑 ε', type: 'num', min: 0.3, max: 1.5, step: 0.1, value: 0.8 },
      { key: 'min_pts', label: '核心門檻 minPts', type: 'int', min: 2, max: 5, step: 1, value: 3 }
    ],
    pseudo: [
      '把 BMI 與血糖標準化',
      '對每點算半徑 ε 內的鄰居數（含自己）',
      '鄰居數 ≥ minPts 者標為核心點',
      '依序找未訪問的核心點開新群：',
      '  把 ε 內鄰居加入擴張佇列',
      '  鄰居若是核心點，再把其鄰居入列',
      '沒被任何群觸及的點標為雜訊 (−1)'
    ],
    build(rows, p) {
      const R = runDBSCAN(rows, p), steps = [];
      const n = rows.length;

      function views(st) {
        const points = rows.map((r, i) => {
          const lb = st.labels[i];
          const isNoise = lb === -1;
          const isUnv = lb === -2;
          const cName = isUnv ? 'c5' : (isNoise ? 'c5' : 'c' + (lb % 5));
          return {
            id: 'p' + r.id,
            x: R.Z[i][0], y: R.Z[i][1],
            cls: st.cur === i ? 'hl' : cName,
            hollow: st.rolesKnown && !R.isCore[i],
            hl: st.cur === i,
            ring: st.cur === i || (st.done && isNoise),
            label: String(r.id),
            r: 6
          };
        });
        const circles = st.cur != null ? [{ id: 'eps', x: R.Z[st.cur][0], y: R.Z[st.cur][1], r: R.eps, ry: R.eps, cls: 'hl' }] : [];
        const main = {
          type: 'scatter', slot: 'main',
          title: 'DBSCAN 密度分群（實心＝核心、空心＝邊界/雜訊）',
          axes: AX, points, lines: [], circles,
          legend: [{ cls: 'c0', label: '群 0' }, { cls: 'c1', label: '群 1' }, { cls: 'c5', label: '未分/雜訊' }, { cls: 'hl', shape: 'ring', label: '目前點 / 雜訊' }]
        };
        const side = {
          type: 'table', slot: 'side',
          title: '各點鄰居數、角色與群',
          cols: [
            { key: 'id', label: '#' },
            { key: 'nb', label: '鄰居數', num: true, digits: 0 },
            { key: 'role', label: '角色' },
            { key: 'cl', label: '群' }
          ],
          rows: rows.map((r, i) => {
            const known = i < st.checkedUpto;
            const lb = st.labels[i];
            const roleTxt = !known ? null : (R.isCore[i] ? '核心' : (lb >= 0 ? '邊界' : (st.done ? '雜訊' : '非核心')));
            const roleCls = !known ? null : (R.isCore[i] ? 'good' : (lb === -1 && st.done ? 'bad' : 'c2'));
            return {
              id: r.id,
              cells: [
                r.id,
                known ? R.nbrs[i].length : null,
                roleTxt ? { v: roleTxt, cls: roleCls } : null,
                lb >= 0 ? '群 ' + lb : (lb === -1 && st.done ? '雜訊' : '—')
              ],
              hl: st.cur === i
            };
          })
        };
        const tokens = {
          type: 'tokens', slot: 'bottom',
          title: '擴張佇列（待檢查鄰居）',
          items: st.queue.length
            ? st.queue.slice(0, 10).map((qi, idx) => ({ id: 'q' + qi, text: '#' + rows[qi].id, cls: R.isCore[qi] ? 'c1' : 'c0', hl: idx === 0 }))
            : [{ id: 'empty', text: st.done ? '擴張結束' : '（佇列空白）', cls: 'c5' }]
        };
        return [main, side, tokens];
      }

      const st = { cur: null, checkedUpto: 0, rolesKnown: false, labels: M.range(n, () => -2), queue: [], done: false };
      const add = (line, title, say, calc, extra) => steps.push(Object.assign({ line, title, say, calc: calc || [], views: views(st), focus: st.cur != null ? [rows[st.cur].id] : [] }, extra));

      add(0, '題目', '16 位病人（含 2 個離群點）。DBSCAN 不用指定群數 K，而是靠半徑 ε = ' + f(R.eps, 1) + ' 與門檻 minPts = ' + R.minPts + ' 找高密度區域。', [
        '標準化後計數：含自己共有 ≥ ' + R.minPts + ' 個鄰居即為核心點'
      ]);

      // 逐點檢查前 4 筆，其餘一次完成
      for (let i = 0; i < Math.min(4, n); i++) {
        st.cur = i; st.checkedUpto = i + 1;
        add(3, '檢查 #' + rows[i].id + ' 鄰居數', '以 #' + rows[i].id + ' 為圓心畫半徑 ε = ' + f(R.eps, 1) + ' 的圓，數圓內共有幾個點（含自己）。', [
          '鄰居數 = ' + R.nbrs[i].length + '（門檻 ' + R.minPts + '）→ ' + (R.isCore[i] ? '核心點！' : '非核心點')
        ], { phase: (i + 1) + ' / ' + n });
      }
      st.cur = null; st.checkedUpto = n; st.rolesKnown = true;
      const nCore = R.isCore.filter(Boolean).length;
      add(3, '標出所有核心點', '全部 16 點檢查完畢：共找到 ' + nCore + ' 個核心點（實心），其餘為空心。', [
        '核心點 ' + nCore + ' 個｜非核心點 ' + (n - nCore) + ' 個'
      ]);

      // 顯示前 10 個擴張事件
      const evShow = R.expandEvents.slice(0, 10);
      evShow.forEach((ev, idx) => {
        st.labels = ev.labels.slice();
        st.queue = ev.queue.slice();
        st.cur = ev.type === 'start' ? ev.seed : ev.cur;
        add(ev.type === 'start' ? 5 : 6,
          ev.type === 'start' ? '開啟群 ' + ev.cid + ' (#' + rows[ev.seed].id + ')' : '擴張檢查 #' + rows[ev.cur].id,
          ev.type === 'start' ? '從未訪問的核心點 #' + rows[ev.seed].id + ' 成立群 ' + ev.cid + '，把鄰居放入佇列。' : '從佇列取出 #' + rows[ev.cur].id + ' 納入群 ' + ev.cid + (R.isCore[ev.cur] ? '，它是核心點所以繼續擴張！' : '，它是邊界點不再擴張。'),
          ['佇列剩餘 ' + ev.queue.length + ' 筆'],
          { phase: '群 ' + ev.cid }
        );
      });

      st.cur = null; st.queue = []; st.labels = R.labels.slice(); st.done = true;
      const nNoise = R.labels.filter(l => l === -1).length;
      add(7, '分群完成與雜訊標記', '所有核心點擴張完畢！共形成 ' + R.nClusters + ' 個群，沒被任何群觸及的 ' + nNoise + ' 點標為雜訊 (−1)。', [
        '群數 = ' + R.nClusters + '，雜訊點數 = ' + nNoise + '（' + rows.filter((_, i) => R.labels[i] === -1).map(r => '#' + r.id).join('、') + '）'
      ]);

      while (steps.length < 10) {
        add(7, 'DBSCAN 特性總結', 'DBSCAN 能自動排除離群點並找出非球狀群，但若各群密度差異很大，單一 ε 就很難同時抓準。', [
          'ε = ' + f(R.eps, 1) + '，minPts = ' + R.minPts + '，群數 = ' + R.nClusters
        ]);
      }
      return steps;
    },

    keys(steps, rows, p) {
      const R = runDBSCAN(rows, p);
      const k = { n_clusters: R.nClusters, n_noise: R.labels.filter(l => l === -1).length };
      rows.forEach((r, i) => {
        k['nb_' + r.id] = R.nbrs[i].length;
        k['core_' + r.id] = R.isCore[i] ? 1 : 0;
        k['label_' + r.id] = R.labels[i];
      });
      return k;
    },

    explain(steps, rows, p) {
      const R = runDBSCAN(rows, p);
      const nNoise = R.labels.filter(l => l === -1).length;
      return [
        '在 ε = ' + f(R.eps, 1) + '、minPts = ' + R.minPts + ' 設定下，共找出 ' + R.isCore.filter(Boolean).length + ' 個核心點，擴張形成 ' + R.nClusters + ' 個群。',
        '共有 ' + nNoise + ' 個點因密度不足且不在任何核心點半徑內，被標記為雜訊（−1）。',
        '與 K-Means 不同，DBSCAN 不需事先指定群數，且對離群點非常穩健；邊界點則會歸屬於先訪問到它的核心群。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Normalize', 'DBSCAN'],
      params: [
        ['DBSCAN › epsilon', p => String(p.eps)],
        ['DBSCAN › min points', p => String(p.min_pts)]
      ],
      note: '確認 min points 在 AI Studio 與 sklearn DBSCAN(min_samples) 一樣包含點本身；邊界點若同時落在兩個核心點半徑內，歸屬依資料順序決定。',
      expect: (steps, rows, p) => {
        const R = runDBSCAN(rows, p);
        return ['群數 = ' + R.nClusters + '，雜訊點 = ' + R.labels.filter(l => l === -1).length];
      },
      python: `from sklearn.cluster import DBSCAN\ndb = DBSCAN(eps=0.8, min_samples=3).fit(Z)`,
      confirmed: false
    }
  });
})();
