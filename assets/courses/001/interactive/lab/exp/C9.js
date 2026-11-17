/* C9 手肘法與輪廓係數 */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = LAB.data.columns('clinic', ['bmi', 'glu']);
  const AX = { x: { label: 'Z(BMI)', min: -3, max: 3 }, y: { label: 'Z(空腹血糖)', min: -3, max: 3 } };
  const CL = ['c0', 'c1', 'c2', 'c3', 'c4'];
  const KS = [2, 3, 4, 5];

  function kmeansForK(Z, K, seed) {
    const n = Z.length;
    const rng = LAB.rng(4900 + seed * 31 + K * 17);
    const idxs = LAB.shuffle(rng, M.range(n)).slice(0, K);
    let cent = idxs.map(i => Z[i].slice());
    let a = M.range(n, () => 0);
    for (let it = 0; it < 20; it++) {
      let changed = 0;
      const na = Z.map((z, i) => {
        const best = M.argmin(cent.map(c => Math.hypot(z[0] - c[0], z[1] - c[1])));
        if (best !== a[i]) changed++;
        return best;
      });
      a = na;
      cent = M.range(K, k => {
        const mem = Z.filter((_, i) => a[i] === k);
        if (!mem.length) return cent[k];
        return [M.mean(mem.map(z => z[0])), M.mean(mem.map(z => z[1]))];
      });
      if (changed === 0 && it > 0) break;
    }
    const sse = M.sum(Z.map((z, i) => (z[0] - cent[a[i]][0]) ** 2 + (z[1] - cent[a[i]][1]) ** 2));

    const sils = Z.map((z, i) => {
      const own = a[i];
      const same = Z.filter((_, j) => j !== i && a[j] === own);
      const ai = same.length ? M.mean(same.map(q => Math.hypot(z[0] - q[0], z[1] - q[1]))) : 0;
      let bi = Infinity, bestOther = own;
      for (let k = 0; k < K; k++) {
        if (k === own) continue;
        const oth = Z.filter((_, j) => a[j] === k);
        if (!oth.length) continue;
        const dMean = M.mean(oth.map(q => Math.hypot(z[0] - q[0], z[1] - q[1])));
        if (dMean < bi) { bi = dMean; bestOther = k; }
      }
      if (!same.length || !Number.isFinite(bi)) return { a: 0, b: 0, s: 0, bestOther };
      const s = (bi - ai) / Math.max(ai, bi);
      return { a: ai, b: bi, s, bestOther };
    });
    const meanSil = M.mean(sils.map(x => x.s));
    return { K, cent, a, sse, sils, meanSil };
  }

  function analyze(rows, p) {
    const bmis = LAB.col(rows, 'bmi'), glus = LAB.col(rows, 'glu');
    const mB = M.mean(bmis), sB = M.sd(bmis) || 1;
    const mG = M.mean(glus), sG = M.sd(glus) || 1;
    const Z = rows.map(r => [(r.bmi - mB) / sB, (r.glu - mG) / sG]);
    const results = KS.map(k => kmeansForK(Z, k, p.init || 1));
    let best = results[0];
    results.forEach(r => { if (r.meanSil > best.meanSil) best = r; });
    return { Z, results, best };
  }

  LAB.register({
    id: 'C9', group: 'C', title: '手肘法與輪廓係數',
    module: { name: 'M3 第 04 節', url: '../m3/#p04' },
    goal: '對 K = 2 到 5 的分群結果計算群內誤差平方和 (SSE) 與每個點的輪廓係數 (Silhouette Score)，回答「K-Means 該選幾群」這個最核心的問題。',
    data: {
      name: 'clinic_kselect',
      scenario: '門診健檢：12 位病人標準化 BMI × 血糖，比較 K = 2..5 的群集品質指標',
      columns: COLS,
      editable: ['bmi', 'glu'],
      small: seed => LAB.data.clinic(seed, 12).map(r => ({ id: r.id, bmi: r.bmi, glu: r.glu }))
    },
    params: [
      { key: 'k', label: '觀察群數 K', type: 'int', min: 2, max: 5, step: 1, value: 2 },
      { key: 'init', label: '起始種子', type: 'int', min: 1, max: 3, step: 1, value: 1 }
    ],
    pseudo: [
      '依序以 K = 2, 3, 4, 5 執行 K-Means',
      '記錄每個 K 的群內平方誤差 SSE（手肘圖）',
      '對每個點 i 算同群平均距離 a(i)',
      '算到最近鄰群的平均距離 b(i)',
      's(i) = (b − a) ÷ max(a, b)',
      '挑選平均 Silhouette 最高的 K*'
    ],
    build(rows, p) {
      const R = analyze(rows, p), steps = [];
      const curK = Math.max(2, Math.min(5, Math.round(p.k || 2)));

      function views(st) {
        const res = R.results[st.kIdx];
        const points = rows.map((r, i) => ({
          id: 'p' + r.id, x: R.Z[i][0], y: R.Z[i][1],
          cls: CL[res.a[i]], hl: st.hlPt === i, ring: st.hlPt === i,
          label: String(r.id), r: st.hlPt === i ? 8 : 5.5
        }));
        res.cent.forEach((c, k) => points.push({ id: 'c' + k, x: c[0], y: c[1], cls: CL[k], shape: 'diamond', r: 9 }));
        const lines = [];
        if (st.hlPt != null) {
          const i = st.hlPt, own = res.a[i], oth = res.sils[i].bestOther;
          rows.forEach((_, j) => {
            if (j !== i && res.a[j] === own) lines.push({ id: 'a' + j, x1: R.Z[i][0], y1: R.Z[i][1], x2: R.Z[j][0], y2: R.Z[j][1], cls: 'good', w: 1.8 });
            if (st.showB && res.a[j] === oth) lines.push({ id: 'b' + j, x1: R.Z[i][0], y1: R.Z[i][1], x2: R.Z[j][0], y2: R.Z[j][1], cls: 'bad', dash: true, w: 1.5 });
          });
        }
        const main = {
          type: 'scatter', slot: 'main',
          title: 'K = ' + res.K + ' 分群（綠線＝同群 a(i)，紅虛線＝鄰群 b(i)）',
          axes: AX, points, lines, circles: [],
          legend: [{ cls: 'good', shape: 'line', label: 'a(i) 群內距離' }, { cls: 'bad', shape: 'line', label: 'b(i) 鄰群距離' }]
        };
        const side = {
          type: 'table', slot: 'side',
          title: '各點 a(i)、b(i) 與輪廓係數 (K=' + res.K + ')',
          cols: [
            { key: 'id', label: '#' },
            { key: 'a', label: 'a(i)', num: true, digits: 2 },
            { key: 'b', label: 'b(i)', num: true, digits: 2 },
            { key: 's', label: 's(i)', num: true, digits: 3 }
          ],
          rows: rows.map((r, i) => ({
            id: r.id,
            cells: [r.id, res.sils[i].a, res.sils[i].b, { v: f(res.sils[i].s, 3), cls: res.sils[i].s < 0 ? 'bad' : 'good' }],
            hl: st.hlPt === i
          }))
        };
        const sub = R.results.slice(0, st.shownK);
        const maxSse = Math.max(1, R.results[0].sse);
        const bottom = {
          type: 'line', slot: 'bottom',
          title: 'K = 2..5 平均 Silhouette (紅) vs 正規化 SSE 手肘線 (藍)',
          axes: { x: { label: '群數 K', min: 2, max: 5 }, y: { label: '指標值 (0–1)', min: 0, max: 1 } },
          series: [
            { id: 'sil', label: '平均 Silhouette', pts: sub.map(x => [x.K, Math.max(0, x.meanSil)]), cls: 'c1', dots: true },
            { id: 'sse', label: 'SSE / SSE(2)', pts: sub.map(x => [x.K, x.sse / maxSse]), cls: 'c0', dash: true, dots: true }
          ],
          marker: { x: res.K, y: Math.max(0, res.meanSil), label: 'K=' + res.K }
        };
        return [main, side, bottom];
      }

      const st = { kIdx: 0, hlPt: null, showB: false, shownK: 1 };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: st.hlPt != null ? [rows[st.hlPt].id] : [] });

      add(0, '題目', 'K-Means 必須事先指定 K。怎麼知道分 2 群還是 5 群最好？我們同時看「手肘法 (SSE)」與「輪廓係數 (Silhouette)」。', [
        '將測試 K = 2, 3, 4, 5 四種設定'
      ]);

      st.hlPt = 0;
      const r0 = R.results[0];
      add(2, '算群內距離 a(1)', '綠線連到與 #1 同群的其他病人，平均距離就是群內緊密度 a(1)（越小越好）。', [
        'a(1) = ' + f(r0.sils[0].a, 3)
      ]);
      st.showB = true;
      add(3, '算鄰群距離 b(1)', '紅虛線連到「最近的那個外群」所有病人，平均距離就是分離度 b(1)（越大越好）。', [
        'b(1) = ' + f(r0.sils[0].b, 3)
      ]);
      add(4, '算輪廓係數 s(1)', 's = (b − a) ÷ max(a, b)，範圍 [−1, +1]，越接近 +1 代表分得越清楚。', [
        's(1) = (' + f(r0.sils[0].b, 3) + ' − ' + f(r0.sils[0].a, 3) + ') ÷ ' + f(Math.max(r0.sils[0].a, r0.sils[0].b), 3) + ' = ' + f(r0.sils[0].s, 3)
      ]);

      st.hlPt = null; st.showB = false;
      KS.forEach((k, idx) => {
        st.kIdx = idx; st.shownK = Math.max(st.shownK, idx + 1);
        const res = R.results[idx];
        add(idx === 0 ? 1 : 5, '測試 K = ' + k, 'K = ' + k + ' 時，SSE = ' + f(res.sse, 2) + '，全體平均輪廓係數 = ' + f(res.meanSil, 3) + '。', [
          'K = ' + k + '：SSE = ' + f(res.sse, 2) + '｜平均 Silhouette = ' + f(res.meanSil, 3)
        ]);
      });

      st.kIdx = KS.indexOf(curK);
      const curRes = R.results[st.kIdx];
      add(5, '目前選擇 K = ' + curK, '目前滑桿設在 K = ' + curK + '；依平均 Silhouette 最高原則，建議選 K* = ' + R.best.K + '。', [
        '目前 K = ' + curK + '：Silhouette = ' + f(curRes.meanSil, 3),
        '最佳 K* = ' + R.best.K + '（Silhouette = ' + f(R.best.meanSil, 3) + '）'
      ]);

      while (steps.length < 10) {
        add(5, '手肘 vs 輪廓法', 'SSE 隨 K 變大永遠下降（只能找折彎手肘）；Silhouette 同時懲罰群間太近，因此會有明確峰值。', [
          '最佳 K* = ' + R.best.K
        ]);
      }
      return steps;
    },

    keys(steps, rows, p) {
      const R = analyze(rows, p);
      const k = { best_k: R.best.K, best_sil: R.best.meanSil };
      R.results.forEach(r => {
        k['sse_' + r.K] = r.sse;
        k['sil_' + r.K] = r.meanSil;
      });
      return k;
    },

    explain(steps, rows, p) {
      const R = analyze(rows, p);
      return [
        'K 從 2 增加到 5，SSE 從 ' + f(R.results[0].sse, 2) + ' 一路降到 ' + f(R.results[3].sse, 2) + '，但群數過多會把同一群硬拆開，導致 Silhouette 下降。',
        '綜合各群緊密度與分離度，最高平均輪廓係數落在 K = ' + R.best.K + '（' + f(R.best.meanSil, 3) + '）。',
        '實務上常同時畫出 Elbow SSE 圖與 Silhouette 折線圖，挑選兩者達成共識的 K。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Normalize', 'Loop Parameters', 'k-Means', 'Cluster Distance Performance'],
      params: [
        ['Loop Parameters › k-Means.k', '2 to 5'],
        ['Cluster Distance Performance', '記錄 Avg. within centroid distance (SSE)']
      ],
      note: 'AI Studio 用 Loop Parameters 掃描 k=2..5 並接上 Cluster Distance Performance 取得 SSE 手肘曲線；若要算 Silhouette 則可接 Python Execute 或依公式計算。',
      expect: (steps, rows, p) => {
        const R = analyze(rows, p);
        return ['最高平均 Silhouette 落在 K = ' + R.best.K + '（' + f(R.best.meanSil, 3) + '）'];
      },
      python: 'from sklearn.cluster import KMeans\nfrom sklearn.metrics import silhouette_score\n# 對 k = 2..5 計算 kmeans.inertia_ 與 silhouette_score(Z, labels)',
      confirmed: false
    }
  });
})();
