/* C1 K-Means 分群　（樣板實驗：迭代型） */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = LAB.data.columns('clinic', ['bmi', 'glu']);
  const CL = ['c0', 'c1', 'c2', 'c3', 'c4'];
  const AX = { x: { label: 'BMI（Z 分數）', min: -3, max: 3 }, y: { label: '空腹血糖（Z 分數）', min: -3, max: 3 } };
  const pick = r => ({ id: r.id, bmi: r.bmi, glu: r.glu });

  /* 完整跑一次 Lloyd 演算法，回傳每一輪的中心、指派、距離與 SSE */
  function run(rows, p) {
    const mB = M.mean(LAB.col(rows, 'bmi')), sB = M.sd(LAB.col(rows, 'bmi')) || 1, mG = M.mean(LAB.col(rows, 'glu')), sG = M.sd(LAB.col(rows, 'glu')) || 1;
    const Z = rows.map(r => [(r.bmi - mB) / sB, (r.glu - mG) / sG]);
    const K = Math.min(p.k, rows.length), r0 = LAB.rng(100 + p.init);
    const start = LAB.shuffle(r0, M.range(rows.length)).slice(0, K);
    let cent = start.map(i => Z[i].slice()), prev = null; const iters = [];
    for (let t = 0; t < 30; t++) {
      const d = Z.map(z => cent.map(c => M.dist(z, c))), a = d.map(x => M.argmin(x));
      const sse = M.sum(a.map((k, i) => d[i][k] * d[i][k]));
      const next = cent.map((c, k) => { const mem = Z.filter((z, i) => a[i] === k); return mem.length ? [M.mean(mem.map(z => z[0])), M.mean(mem.map(z => z[1]))] : c.slice(); });
      const changed = prev ? a.filter((k, i) => k !== prev[i]).length : a.length;
      iters.push({ cent, d, a, sse, next, changed, sizes: cent.map((c, k) => a.filter(x => x === k).length) });
      if (prev && changed === 0) break;
      prev = a; cent = next;
    }
    return { mB, sB, mG, sG, Z, K, start, iters, last: iters[iters.length - 1] };
  }

  LAB.register({
    id: 'C1', group: 'C', title: 'K-Means 分群',
    module: { name: 'M3 第 03 節', url: '../m3/#p03' },
    goal: '看懂 K-Means 只有兩個動作反覆做：每個點找最近的中心、每個中心移到成員的平均位置；並看到起始中心不同，結果可能不同。',
    data: {
      name: 'clinic', scenario: '門診健檢：依 BMI 與空腹血糖把病人分成 K 群（沒有標準答案）',
      columns: COLS, editable: ['bmi', 'glu'],
      small: seed => LAB.data.clinic(seed, 12).map(pick),
      large: seed => LAB.data.clinic(seed, 300).map(pick)
    },
    params: [
      { key: 'k', label: 'K（群數）', type: 'int', min: 2, max: 5, step: 1, value: 2 },
      { key: 'init', label: '起始中心（第幾組）', type: 'int', min: 1, max: 9, step: 1, value: 1 }
    ],
    pseudo: [
      '把每個特徵標準化成 Z 分數',
      '挑 K 個點當起始中心',
      '重複，直到沒有人換群：',
      '  每個點指派給最近的中心',
      '  每個中心移到成員的平均位置',
      '輸出各群成員與中心'
    ],

    build(rows, p) {
      const R = run(rows, p), big = rows.length > 20, steps = [], K = R.K, n = rows.length;
      const sseHist = [];
      const name = k => '中心 ' + (k + 1);

      /* s：{cent 目前中心, a 指派（null＝尚未指派）, d 各點距離（null＝本輪尚未算）, cur 目前處理的點, regions 是否畫勢力範圍, moved 中心剛移動} */
      function views(s) {
        const points = rows.map((r, i) => ({ id: 'p' + r.id, x: R.Z[i][0], y: R.Z[i][1], cls: s.a && s.a[i] != null ? CL[s.a[i]] : 'c5', label: big ? null : String(r.id), r: big ? 3.5 : 6, hl: s.cur === i }));
        (s.cent || []).forEach((c, k) => points.push({ id: 'c' + k, x: c[0], y: c[1], cls: CL[k], shape: 'diamond', r: 9, hl: true, ring: !!s.moved, label: name(k) }));
        let lines = [];
        if (s.cur != null && s.cent) { const best = M.argmin(R.iters[s.it].d[s.cur]); lines = s.cent.map((c, k) => ({ id: 'l' + k, x1: R.Z[s.cur][0], y1: R.Z[s.cur][1], x2: c[0], y2: c[1], cls: CL[k], dash: k !== best, w: k === best ? 3 : null, label: f(R.iters[s.it].d[s.cur][k], 2) })); }
        const regions = s.regions && s.cent ? LAB.grid((x, y) => CL[M.argmin(s.cent.map(c => M.dist([x, y], c)))], -3, 3, -3, 3, 36, 24) : null;
        const leg = M.range(K, k => ({ cls: CL[k], label: '第 ' + (k + 1) + ' 群' })).concat([{ cls: 'c5', shape: 'diamond', label: '菱形＝群中心' }]);
        const out = [{ type: 'scatter', slot: 'main', axes: AX, points, lines, regions, legend: s.cent ? leg : [{ cls: 'c5', label: '尚未分群的病人' }] }];

        if (big) {
          out.push({ type: 'table', slot: 'side', title: '各群現況', cols: [{ key: 'g', label: '群' }, { key: 'n', label: '人數', num: true, digits: 0 }, { key: 'x', label: '中心 Z_BMI', num: true }, { key: 'y', label: '中心 Z血糖', num: true }],
            rows: (s.cent || []).map((c, k) => ({ id: k, cls: CL[k], cells: [{ v: '第 ' + (k + 1) + ' 群', cls: CL[k] }, s.a ? s.a.filter(x => x === k).length : null, c[0], c[1]] })) });
        } else {
          const cols = [{ key: 'id', label: '#' }].concat(M.range(K, k => ({ key: 'd' + k, label: '到' + name(k), num: true }))).concat([{ key: 'g', label: '指派' }]);
          out.push({ type: 'table', slot: 'side', title: '距離與指派', cols, rows: rows.map((r, i) => {
            const d = s.d && s.d[i], a = s.a && s.a[i] != null ? s.a[i] : null;
            return { id: r.id, hl: s.cur === i, cells: [r.id].concat(M.range(K, k => d ? { v: d[k], hl: s.cur === i && a === k } : null)).concat([a == null ? null : { v: '第 ' + (a + 1) + ' 群', cls: CL[a] }]) };
          }) });
        }
        out.push({ type: 'line', slot: 'bottom', title: '群內誤差平方和 SSE（越小表示點離自己的中心越近）', h: 190, axes: { x: { label: '第幾輪', min: 1, max: Math.max(3, R.iters.length) }, y: { label: 'SSE', min: 0, max: R.iters[0].sse * 1.1 } }, series: [{ id: 'sse', label: 'SSE', pts: sseHist.map((v, i) => [i + 1, v]), dots: true, cls: 'hl' }] });
        return out;
      }
      const add = (line, title, say, calc, s, phase) => steps.push({ line, title, say, calc: calc || [], phase, views: views(s), focus: s.cur != null ? [rows[s.cur].id] : [] });

      const st = { cent: null, a: null, d: null, cur: null, it: 0 };
      add(0, '題目', '有 ' + n + ' 位病人的 BMI 與空腹血糖，沒有任何標籤。K-Means 要把他們分成 ' + K + ' 群，讓同群的人盡量靠近。', [], st);
      add(1, '標準化', 'BMI 和血糖單位不同、數字大小差很多，先換成 Z 分數，兩個特徵才會一樣重要。圖上已經是標準化後的位置。', [
        'BMI：平均 ' + f(R.mB, 2) + '，標準差 ' + f(R.sB, 2), '血糖：平均 ' + f(R.mG, 2) + '，標準差 ' + f(R.sG, 2)], st);
      st.cent = R.iters[0].cent; st.moved = true;
      add(2, '挑起始中心', '隨機挑 ' + K + ' 位病人的位置當起始中心（菱形）。起始位置會影響結果，可用上方「起始中心」換一組試試。', R.start.map((i, k) => name(k) + ' ＝ ' + rows[i].id + ' 號的位置 (' + f(R.Z[i][0], 2) + ', ' + f(R.Z[i][1], 2) + ')'), st);
      st.moved = false; st.regions = true;

      R.iters.forEach((it, t) => {
        const ph = '第 ' + (t + 1) + ' 輪'; st.it = t; st.cent = it.cent;
        const prevA = t ? R.iters[t - 1].a : null;
        if (!big && t < 2) {
          st.d = rows.map(() => null); st.a = prevA ? prevA.slice() : rows.map(() => null);
          rows.forEach((r, i) => {
            st.cur = i; st.d[i] = it.d[i]; st.a[i] = it.a[i]; const moved = prevA && prevA[i] !== it.a[i];
            add(4, '指派：' + r.id + ' 號', r.id + ' 號到各中心的距離，最近的是' + name(it.a[i]) + '，所以歸到第 ' + (it.a[i] + 1) + ' 群' + (prevA ? (moved ? '（換群了）。' : '（沒換）。') : '。'),
              it.d[i].map((d, k) => '到' + name(k) + '：√( (' + f(R.Z[i][0], 2) + ' − ' + f(it.cent[k][0], 2) + ')² + (' + f(R.Z[i][1], 2) + ' − ' + f(it.cent[k][1], 2) + ')² ) = ' + f(d, 2) + (k === it.a[i] ? '  ← 最近' : '')), st, ph);
          });
          st.cur = null;
        } else {
          st.cur = null; st.d = it.d; st.a = it.a.slice();
          add(4, '指派所有點', (big ? '' : '做法和前兩輪相同，之後每輪只用一步顯示。') + '每個點重新找最近的中心，這一輪有 ' + it.changed + ' 位換群。', it.sizes.map((m, k) => '第 ' + (k + 1) + ' 群：' + m + ' 人'), st, ph);
        }
        sseHist.push(it.sse);
        if (it.changed === 0 && t > 0) {
          add(3, '收斂', '這一輪沒有任何人換群，中心也就不會再動，演算法停止。', ['SSE = ' + f(it.sse, 3)], st, ph);
        } else {
          add(4, '算這一輪的 SSE', '把每個點到自己中心的距離平方加總，用來衡量這一輪分得多緊密。', ['SSE = ' + f(it.sse, 3)].concat(t ? ['比上一輪減少 ' + f(R.iters[t - 1].sse - it.sse, 3)] : []), st, ph);
          st.cent = it.next; st.moved = true;
          add(5, '移動中心', '每個中心移到自己成員的平均位置。中心一動，勢力範圍（底色）跟著改變，下一輪有人可能換群。',
            it.next.map((c, k) => name(k) + '：' + it.sizes[k] + ' 人的平均 = (' + f(c[0], 2) + ', ' + f(c[1], 2) + ')' + (it.sizes[k] ? '' : '（沒有成員，留在原地）')), st, ph);
          st.moved = false;
        }
      });
      const L = R.last; st.cent = L.cent; st.a = L.a.slice(); st.d = L.d; st.cur = null;
      add(6, '分群結果', '共跑了 ' + R.iters.length + ' 輪。把中心換回原始單位，就能替每一群命名。', L.cent.map((c, k) => '第 ' + (k + 1) + ' 群 ' + L.sizes[k] + ' 人：BMI ' + f(c[0] * R.sB + R.mB, 1) + '、血糖 ' + f(c[1] * R.sG + R.mG, 0)), st);
      return steps;
    },

    /* 由亂數決定、Python 無法重現的起始條件：交給驗證程式當輸入 */
    inputs(rows, p) { return { start: run(rows, p).start.map(i => rows[i].id) }; },

    keys(steps, rows, p) {
      const R = run(rows, p), L = R.last, o = { mean_bmi: R.mB, sd_bmi: R.sB, mean_glu: R.mG, sd_glu: R.sG, sse_first: R.iters[0].sse, sse_final: L.sse };
      R.start.forEach((i, k) => { o['start_' + (k + 1)] = rows[i].id; });
      L.cent.forEach((c, k) => { o['c' + (k + 1) + '_x'] = c[0]; o['c' + (k + 1) + '_y'] = c[1]; o['n_' + (k + 1)] = L.sizes[k]; });
      rows.forEach((r, i) => { o['lab_' + r.id] = L.a[i] + 1; });
      return o;
    },

    explain(steps, rows, p) {
      const R = run(rows, p), L = R.last;
      const all = M.range(9, i => run(rows, Object.assign({}, p, { init: i + 1 })).last.sse), uniq = Array.from(new Set(all.map(v => v.toFixed(4)))).length;
      return [
        '跑了 ' + R.iters.length + ' 輪就收斂：SSE 從 ' + f(R.iters[0].sse, 2) + ' 降到 ' + f(L.sse, 2) + '。每一輪 SSE 只會下降或持平，所以一定會停。',
        '各群人數為 ' + L.sizes.join('、') + ' 人。' + L.cent.map((c, k) => '第 ' + (k + 1) + ' 群平均 BMI ' + f(c[0] * R.sB + R.mB, 1) + '、血糖 ' + f(c[1] * R.sG + R.mG, 0)).join('；') + '。群的意義要由人依這些數字來命名。',
        '9 組起始中心共得到 ' + uniq + ' 種不同的結果' + (uniq > 1 ? '，SSE 介於 ' + f(M.min(all), 2) + ' 到 ' + f(M.max(all), 2) + '。K-Means 只保證找到「附近最好」的解，所以實務上會多跑幾次、取 SSE 最小的那次。' : '，表示這份資料的分群相當穩定。'),
        'K 是你給的，演算法不會告訴你該分幾群。把 K 調大，SSE 一定變小，但不代表分得更有意義（怎麼選 K 見 M3 第 04 節）。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Set Role', 'Normalize', 'Clustering (k-Means)'],
      params: [
        ['Set Role › id', 'id'], ['Normalize › method', 'Z-transformation'],
        ['k-Means › k', p => String(p.k)], ['k-Means › max runs', '10'], ['k-Means › measure types', 'NumericalMeasures › EuclideanDistance']
      ],
      note: 'AI Studio 的起始中心由它自己隨機決定，無法指定成這裡的那一組，所以群的編號（cluster_0、cluster_1…）可能和這裡不同；請比對「各群人數」與「中心位置」。max runs 設 10 表示跑 10 次取最好的一次，結果通常等於這裡 9 組起始中心裡 SSE 最小的那一種。',
      expect: (steps, rows, p) => { const L = run(rows, p).last; return ['各群人數（不看編號）：' + L.sizes.slice().sort((a, b) => b - a).join('、'), 'Centroid Table 的中心（Z 分數）：' + L.cent.map(c => '(' + f(c[0], 2) + ', ' + f(c[1], 2) + ')').join('、')]; },
      python: 'from sklearn.preprocessing import StandardScaler\nfrom sklearn.cluster import KMeans\nZ = StandardScaler().fit_transform(df[["bmi", "glu"]])\nkm = KMeans(n_clusters=2, n_init=10, random_state=0).fit(Z)\nkm.cluster_centers_, km.labels_, km.inertia_',
      confirmed: false
    }
  });
})();
