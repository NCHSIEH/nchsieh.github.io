/* C4 高斯混合模型 GMM */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = LAB.data.columns('clinic', ['glu']);
  const pick = r => ({ id: r.id, glu: r.glu });
  const REG = 1e-6;
  const MAX_ITER = 15;

  function gaussPdf(x, mu, v) {
    return Math.exp(-0.5 * (x - mu) * (x - mu) / v) / Math.sqrt(2 * Math.PI * v);
  }

  function runGMM(rows, p) {
    const n = rows.length;
    const glus = LAB.col(rows, 'glu'), mG = M.mean(glus), sG = M.sd(glus) || 1;
    const Z = glus.map(g => (g - mG) / sG);
    const k = Math.max(2, Math.min(3, Math.round(p.k || 2)));
    const rng = LAB.rng(4400 + Math.round(p.init || 1) * 31 + k);

    // 起始平均：由標準化後資料挑 k 個不同點，起始變異數 = 1，起始權重 = 1/k
    const sortedZ = Z.slice().sort((a, b) => a - b);
    const meansInit = [];
    for (let c = 0; c < k; c++) {
      const idx = Math.min(n - 1, Math.max(0, Math.round((c + 0.5) * n / k + (rng() - 0.5) * 2)));
      meansInit.push(sortedZ[idx] + (rng() - 0.5) * 0.15);
    }
    const weightsInit = M.range(k, () => 1 / k);
    const varsInit = M.range(k, () => 1.0);

    let means = meansInit.slice();
    let weights = weightsInit.slice();
    let vars = varsInit.slice();

    const evalLL = (ms, ws, vs) => {
      let s = 0;
      for (let i = 0; i < n; i++) {
        let mix = 0;
        for (let c = 0; c < k; c++) mix += ws[c] * gaussPdf(Z[i], ms[c], vs[c]);
        s += Math.log(Math.max(mix, 1e-300));
      }
      return s / n;
    };

    const eStep = (ms, ws, vs) => Z.map(x => {
      const ps = M.range(k, c => ws[c] * gaussPdf(x, ms[c], vs[c]));
      const tot = M.sum(ps) || 1e-300;
      return ps.map(v => v / tot);
    });

    const hist = [{ iter: 0, means: means.slice(), weights: weights.slice(), vars: vars.slice(), resp: eStep(means, weights, vars), ll: evalLL(means, weights, vars) }];

    for (let it = 1; it <= MAX_ITER; it++) {
      const resp = eStep(means, weights, vars);
      const nk = M.range(k, c => M.sum(resp.map(r => r[c])));
      const newW = nk.map(v => v / n);
      const newM = M.range(k, c => M.sum(resp.map((r, i) => r[c] * Z[i])) / (nk[c] || 1e-12));
      const newV = M.range(k, c => M.sum(resp.map((r, i) => r[c] * (Z[i] - newM[c]) * (Z[i] - newM[c]))) / (nk[c] || 1e-12) + REG);
      means = newM; weights = newW; vars = newV;
      const respAfter = eStep(means, weights, vars);
      hist.push({ iter: it, means: means.slice(), weights: weights.slice(), vars: vars.slice(), resp: respAfter, ll: evalLL(means, weights, vars) });
    }

    return { Z, k, meansInit, weightsInit, varsInit, hist, fin: hist[hist.length - 1] };
  }

  LAB.register({
    id: 'C4', group: 'C', title: '高斯混合模型 GMM',
    module: { name: 'M3 第 07 節', url: '../m3/#p07' },
    goal: '看懂 GMM 如何用多個常態分布混合描述資料，透過 E 步算歸屬機率（責任值）與 M 步加權更新參數，讓對數概似逐步上升。',
    data: {
      name: 'clinic_gmm',
      scenario: '門診健檢：將空腹血糖標準化為一維數值，用 K 個高斯分布做軟分群',
      columns: COLS,
      editable: ['glu'],
      small: seed => LAB.data.clinic(seed, 12).map(pick),
      large: seed => LAB.data.clinic(seed, 300).map(pick)
    },
    params: [
      { key: 'k', label: '群數 K', type: 'int', min: 2, max: 3, step: 1, value: 2 },
      { key: 'init', label: '起始種子', type: 'int', min: 1, max: 5, step: 1, value: 1 }
    ],
    pseudo: [
      '把空腹血糖標準化',
      '初始化各群平均 μ、變異數 σ²、權重 π',
      '重複 E 步與 M 步直到收斂：',
      '  E 步：算每點屬於各群的責任值 γ',
      '  M 步：以 γ 加權更新 μ、σ²、π',
      '計算平均對數概似，檢視軟分群結果'
    ],
    build(rows, p) {
      const R = runGMM(rows, p), big = rows.length > 20, steps = [];
      const xsGrid = M.range(41, i => -3.0 + i * 0.15);

      function views(st) {
        const h = R.hist[st.iter];
        const series = M.range(R.k, c => ({
          id: 'g' + c,
          label: '群 ' + (c + 1) + ' (π=' + f(h.weights[c], 2) + ')',
          pts: xsGrid.map(x => [x, h.weights[c] * gaussPdf(x, h.means[c], h.vars[c])]),
          cls: 'c' + c,
          dots: false
        }));
        series.push({
          id: 'mix',
          label: '總混合分布',
          pts: xsGrid.map(x => [x, M.sum(M.range(R.k, c => h.weights[c] * gaussPdf(x, h.means[c], h.vars[c])))]),
          cls: 'hl',
          dash: true,
          dots: false
        });
        series.push({
          id: 'pts',
          label: '病人血糖 Z',
          pts: (big ? R.Z.slice(0, 30) : R.Z).map(z => [z, 0.01]),
          cls: 'c5',
          dots: true
        });
        const main = {
          type: 'line', slot: 'main',
          title: '各群高斯分布曲線（第 ' + st.iter + ' 輪）',
          axes: { x: { label: 'Z(空腹血糖)', min: -3.0, max: 3.0 }, y: { label: '加權密度', min: 0, max: 0.7 } },
          series,
          marker: st.hlPt != null ? { x: R.Z[st.hlPt], y: 0.02, label: '#' + rows[st.hlPt].id } : null
        };

        const cols = [{ key: 'id', label: '#' }, { key: 'z', label: 'Z血糖', num: true, digits: 2 }];
        for (let c = 0; c < R.k; c++) cols.push({ key: 'r' + c, label: 'P(群' + (c + 1) + ')', num: true, digits: 2 });
        const showRows = big ? rows.slice(0, 12) : rows;
        const side = {
          type: 'table', slot: 'side',
          title: '各筆責任值（軟分群機率）',
          cols,
          rows: showRows.map((r, i) => {
            const bestC = M.argmax(h.resp[i]);
            return {
              id: r.id,
              cells: [r.id, R.Z[i]].concat(M.range(R.k, c => st.showResp ? { v: f(h.resp[i][c], 2), cls: c === bestC ? 'c' + c : null } : null)),
              hl: st.hlPt === i
            };
          }),
          caption: big ? '只列出前 12 位' : null
        };

        const llMin = Math.min(-2.5, R.hist[0].ll - 0.3);
        const llMax = Math.max(-0.5, R.fin.ll + 0.2);
        const line = {
          type: 'line', slot: 'bottom',
          title: '平均對數概似（越大擬合越好）',
          axes: { x: { label: 'EM 輪次', min: 0, max: MAX_ITER }, y: { label: 'Log-Likelihood', min: llMin, max: llMax } },
          series: [{ id: 'll', label: 'Log-Likelihood', pts: R.hist.slice(0, st.iter + 1).map(x => [x.iter, x.ll]), cls: 'c1', dots: true }],
          marker: { x: st.iter, y: h.ll, label: '第 ' + st.iter + ' 輪' }
        };
        return [main, side, line];
      }

      const st = { iter: 0, showResp: false, hlPt: null };
      const add = (line, title, say, calc, extra) => steps.push(Object.assign({ line, title, say, calc: calc || [], views: views(st), focus: st.hlPt != null ? [rows[st.hlPt].id] : [] }, extra));

      add(0, '題目', 'K-Means 只給「屬於哪一群」，GMM 用 ' + R.k + ' 個常態分布算每筆資料屬於各群的機率（軟分群）。', [
        '標準化血糖共 ' + rows.length + ' 筆，固定執行 ' + MAX_ITER + ' 輪 EM'
      ]);

      add(2, '起始常態分布參數', '先放上 ' + R.k + ' 個起始常態分布（權重均為 ' + f(1 / R.k, 2) + '、變異數均為 1.00）。', [
        '起始 μ = (' + R.meansInit.map(v => f(v, 2)).join(', ') + ')',
        '起始對數概似 = ' + f(R.hist[0].ll, 3)
      ]);

      st.showResp = true;
      for (let i = 0; i < Math.min(3, rows.length); i++) {
        st.hlPt = i;
        add(4, 'E 步：算 #' + rows[i].id + ' 責任值', '代入目前各群的常態密度與權重，正規化得到 #' + rows[i].id + ' 屬於各群的機率。', [
          'Z = ' + f(R.Z[i], 2) + ' → 責任值 γ = (' + R.hist[0].resp[i].map(v => f(v, 3)).join(', ') + ')'
        ], { phase: '第 1 輪 E 步' });
      }

      st.hlPt = null; st.iter = 1;
      add(5, '第 1 輪 M 步更新', '用全部病人的責任值 γ 當權重，重新計算每群的新平均 μ、新變異數 σ² 與新權重 π。', [
        '新 μ = (' + R.hist[1].means.map(v => f(v, 2)).join(', ') + ')',
        '對數概似升至 ' + f(R.hist[1].ll, 3)
      ], { phase: '第 1 輪' });

      [2, 4, 7, 11, 15].forEach(it => {
        st.iter = it;
        const h = R.hist[it];
        add(5, '第 ' + it + ' 輪 EM', it === 15 ? '經過 15 輪 EM 迭代，對數概似收斂，各群高斯曲線貼合資料分布。' : '繼續交替 E 步與 M 步，曲線逐步移往資料密集處。', [
          'μ = (' + h.means.map(v => f(v, 2)).join(', ') + ')｜π = (' + h.weights.map(v => f(v, 2)).join(', ') + ')',
          'Log-Likelihood = ' + f(h.ll, 3)
        ], { phase: it + ' / ' + MAX_ITER });
      });

      while (steps.length < 10) {
        add(6, '軟分群結果解讀', '靠近兩群交界處的病人責任值會接近 0.5 / 0.5，提醒我們他處於邊界地帶。', [
          '最終 Log-Likelihood = ' + f(R.fin.ll, 3)
        ]);
      }
      return steps;
    },

    inputs(rows, p) {
      const R = runGMM(rows, p);
      return { means_init: R.meansInit, weights_init: R.weightsInit, vars_init: R.varsInit };
    },

    keys(steps, rows, p) {
      const R = runGMM(rows, p);
      const k = { ll_0: R.hist[0].ll, ll_final: R.fin.ll };
      for (let c = 0; c < R.k; c++) {
        k['mean_' + c] = R.fin.means[c];
        k['var_' + c] = R.fin.vars[c];
        k['weight_' + c] = R.fin.weights[c];
      }
      rows.forEach((r, i) => { k['resp0_' + r.id] = R.fin.resp[i][0]; });
      return k;
    },

    explain(steps, rows, p) {
      const R = runGMM(rows, p);
      return [
        '將標準化血糖以 ' + R.k + ' 個高斯分布做 EM 擬合 15 輪後，平均對數概似從 ' + f(R.hist[0].ll, 3) + ' 上升至 ' + f(R.fin.ll, 3) + '。',
        '最終各群中心為 ' + R.fin.means.map(v => f(v, 2)).join('、') + '，權重分別為 ' + R.fin.weights.map(v => f(v, 2)).join('、') + '。',
        'GMM 保留了每筆資料屬於各群的不確定性（機率），適合群組大小不同或有重疊的資料。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Normalize', 'Expectation Maximization Clustering'],
      params: [
        ['EM Clustering › k', p => String(p.k)],
        ['EM Clustering › max runs / optimization steps', String(MAX_ITER)]
      ],
      note: 'AI Studio 的 Expectation Maximization Clustering 參數與 reg_covar 預設值（sklearn 預設 1e-6）需實機確認。',
      expect: (steps, rows, p) => {
        const R = runGMM(rows, p);
        return ['最終平均對數概似 = ' + f(R.fin.ll, 3)];
      },
      python: `from sklearn.mixture import GaussianMixture\ngm = GaussianMixture(n_components=2, tol=0, max_iter=15, reg_covar=1e-6).fit(Z)`,
      confirmed: false
    }
  });
})();
