/* C5 主成分分析 PCA */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = LAB.data.columns('clinic', ['age', 'bmi', 'glu', 'sbp']);
  const AX = { x: { label: 'Z₁ (BMI / PC1)', min: -3.0, max: 3.0 }, y: { label: 'Z₂ (空腹血糖 / PC2)', min: -3.0, max: 3.0 } };
  const pick = r => ({ id: r.id, age: r.age, bmi: r.bmi, glu: r.glu, sbp: r.sbp });

  function jacobiSym(A) {
    const d = A.length;
    const S = A.map(r => r.slice());
    const V = M.range(d, i => M.range(d, j => i === j ? 1 : 0));
    for (let it = 0; it < 60; it++) {
      let p = 0, q = 1, maxOff = 0;
      for (let i = 0; i < d; i++) {
        for (let j = i + 1; j < d; j++) {
          if (Math.abs(S[i][j]) > maxOff) { maxOff = Math.abs(S[i][j]); p = i; q = j; }
        }
      }
      if (maxOff < 1e-12) break;
      const app = S[p][p], aqq = S[q][q], apq = S[p][q];
      const phi = 0.5 * Math.atan2(2 * apq, aqq - app);
      const c = Math.cos(phi), s = Math.sin(phi);
      for (let k = 0; k < d; k++) {
        if (k !== p && k !== q) {
          const skp = S[k][p], skq = S[k][q];
          S[k][p] = S[p][k] = c * skp - s * skq;
          S[k][q] = S[q][k] = s * skp + c * skq;
        }
      }
      S[p][p] = c * c * app - 2 * s * c * apq + s * s * aqq;
      S[q][q] = s * s * app + 2 * s * c * apq + c * c * aqq;
      S[p][q] = S[q][p] = 0;
      for (let k = 0; k < d; k++) {
        const vkp = V[k][p], vkq = V[k][q];
        V[k][p] = c * vkp - s * vkq;
        V[k][q] = s * vkp + c * vkq;
      }
    }
    const pairs = M.range(d, j => ({ val: S[j][j], vec: M.range(d, i => V[i][j]) }))
      .sort((a, b) => b.val - a.val);
    // 符號約定：第一個分量為正
    pairs.forEach(pr => {
      if (pr.vec[0] < 0) pr.vec = pr.vec.map(v => -v);
    });
    return pairs;
  }

  function runPCA(rows, p) {
    const n = rows.length;
    const use4 = p.features === '4';
    const feats = use4 ? ['age', 'bmi', 'glu', 'sbp'] : ['bmi', 'glu'];
    const flabs = use4 ? ['年齡', 'BMI', '血糖', '收縮壓'] : ['BMI', '血糖'];
    const d = feats.length;

    const Z = rows.map(() => M.range(d, () => 0));
    feats.forEach((ft, j) => {
      const xs = LAB.col(rows, ft), mx = M.mean(xs), sx = M.sd(xs) || 1;
      for (let i = 0; i < n; i++) Z[i][j] = (xs[i] - mx) / sx;
    });

    // 共變異矩陣 (除以 n - 1，與 sklearn PCA 一致)
    const cov = M.range(d, i => M.range(d, j => {
      let s = 0;
      for (let r = 0; r < n; r++) s += Z[r][i] * Z[r][j];
      return s / (n - 1);
    }));

    const eigs = jacobiSym(cov);
    const totalVar = M.sum(eigs.map(e => e.val)) || 1;
    const ratios = eigs.map(e => e.val / totalVar);

    const scores = Z.map(zi => eigs.map(e => M.sum(zi.map((v, j) => v * e.vec[j]))));
    const keep = Math.min(d, Math.max(1, Math.round(p.keep || 1)));
    const recon = Z.map((zi, i) => M.range(d, j => {
      let s = 0;
      for (let k = 0; k < keep; k++) s += scores[i][k] * eigs[k].vec[j];
      return s;
    }));
    const reconErr = M.mean(Z.map((zi, i) => M.sum(zi.map((v, j) => (v - recon[i][j]) ** 2))));

    return { feats, flabs, d, use4, Z, cov, eigs, ratios, scores, keep, recon, reconErr };
  }

  LAB.register({
    id: 'C5', group: 'C', title: '主成分分析 PCA',
    module: { name: 'M3 第 10 節', url: '../m3/#p10' },
    goal: '看懂 PCA 如何從標準化資料計算共變異矩陣、求特徵向量當主成分新軸，並把資料投影降維與衡量重建誤差。',
    data: {
      name: 'clinic_pca',
      scenario: '門診健檢：用標準化 BMI 與血糖（或全部 4 個生理指標）做 PCA 降維',
      columns: COLS,
      editable: ['age', 'bmi', 'glu', 'sbp'],
      small: seed => LAB.data.clinic(seed, 12).map(pick)
    },
    params: [
      { key: 'features', label: '特徵數', type: 'choice', value: '2', options: [{ v: '2', label: '兩特徵 (BMI, 血糖)' }, { v: '4', label: '四特徵 (全部)' }] },
      { key: 'keep', label: '保留主成分數', type: 'int', min: 1, max: 2, step: 1, value: 1 }
    ],
    pseudo: [
      '把所有特徵標準化成 Z 分數',
      '計算共變異矩陣 Σ = ZᵀZ ÷ (n − 1)',
      '求 Σ 的特徵值 λ 與特徵向量 v',
      '依 λ 由大到小排為 PC1, PC2…',
      '畫出主成分新軸並投影各點',
      '計算各主成分的解釋變異比例',
      '保留前 K 個主成分並算重建誤差'
    ],
    build(rows, p) {
      const R = runPCA(rows, p), steps = [];
      const xIdx = R.use4 ? 1 : 0, yIdx = R.use4 ? 2 : 1; // 散佈圖顯示 BMI vs 血糖 或 PC1 vs PC2

      function views(st) {
        const usePcPlane = R.use4 && st.showProj;
        const points = rows.map((r, i) => {
          const x = usePcPlane ? R.scores[i][0] : (st.showRecon ? R.recon[i][xIdx] : R.Z[i][xIdx]);
          const y = usePcPlane ? (R.keep >= 2 || !st.showRecon ? R.scores[i][1] : 0) : (st.showRecon ? R.recon[i][yIdx] : R.Z[i][yIdx]);
          return { id: 'p' + r.id, x, y, cls: st.showRecon ? 'c1' : 'c0', label: String(r.id), r: 6 };
        });
        const lines = [];
        if (st.showAxes && !R.use4) {
          const v1 = R.eigs[0].vec, v2 = R.eigs[1].vec;
          lines.push({ id: 'pc1', x1: -2.8 * v1[0], y1: -2.8 * v1[1], x2: 2.8 * v1[0], y2: 2.8 * v1[1], cls: 'c1', w: 3, label: 'PC1' });
          lines.push({ id: 'pc2', x1: -2.2 * v2[0], y1: -2.2 * v2[1], x2: 2.2 * v2[0], y2: 2.2 * v2[1], cls: 'c2', dash: true, w: 1.6, label: 'PC2' });
        }
        if (st.showProj && !R.use4) {
          rows.forEach((r, i) => {
            lines.push({ id: 'pr' + r.id, x1: R.Z[i][0], y1: R.Z[i][1], x2: R.recon[i][0], y2: R.recon[i][1], cls: 'c4', dash: true, w: 1.2 });
          });
        }
        if (usePcPlane && st.showRecon && R.keep === 1) {
          rows.forEach((r, i) => {
            lines.push({ id: 'pr4_' + r.id, x1: R.scores[i][0], y1: R.scores[i][1], x2: R.scores[i][0], y2: 0, cls: 'c4', dash: true, w: 1.2 });
          });
        }
        const leg = [{ cls: 'c0', label: '原始點' }, { cls: 'c1', label: 'PC1 / 重建點' }];
        if (!R.use4) leg.push({ cls: 'c2', shape: 'line', label: 'PC2' }, { cls: 'c4', shape: 'line', label: '投影誤差' });
        else if (usePcPlane && st.showRecon && R.keep === 1) leg.push({ cls: 'c4', shape: 'line', label: '丟棄 PC2 誤差' });
        const axUse = usePcPlane
          ? { x: { label: 'PC1 主成分分數', min: -3.2, max: 3.2 }, y: { label: 'PC2 主成分分數', min: -3.2, max: 3.2 } }
          : AX;
        const main = {
          type: 'scatter', slot: 'main',
          title: usePcPlane ? '4 維投影至 PC1 × PC2 主成分空間' : (R.use4 ? '原始標準化空間（BMI × 血糖切片）' : '標準化空間與主成分軸 (PC1 / PC2)'),
          axes: axUse, points, lines, circles: [],
          legend: leg
        };
        const side = st.showVec ? {
          type: 'matrix', slot: 'side',
          title: '主成分負荷向量（每欄＝一個 PC）',
          rowLabels: R.flabs,
          colLabels: R.eigs.map((_, j) => 'PC' + (j + 1)),
          values: R.flabs.map((_, i) => R.eigs.map(e => e.vec[i])),
          digits: 3, heat: 'div'
        } : {
          type: 'matrix', slot: 'side',
          title: '共變異矩陣 Σ（除數 n−1）',
          rowLabels: R.flabs,
          colLabels: R.flabs,
          values: R.cov,
          digits: 3, heat: 'div'
        };
        const bars = {
          type: 'bars', slot: 'bottom',
          title: '各主成分解釋變異比例',
          max: 1, digits: 3,
          items: R.ratios.map((rt, j) => ({
            id: 'pc' + j,
            label: 'PC' + (j + 1) + ' (' + LAB.pct(rt, 1) + ')',
            value: st.showVar ? rt : 0,
            cls: j < R.keep ? 'good' : 'c5',
            hl: st.showVar && j < R.keep
          }))
        };
        return [main, side, bars];
      }

      const st = { showVec: false, showAxes: false, showProj: false, showRecon: false, showVar: false };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '題目', '把 ' + R.d + ' 個標準化後的門診指標透過 PCA 轉到互相正交的主成分新軸，只保留前 ' + R.keep + ' 個主成分。', [
        '特徵：' + R.flabs.join('、')
      ]);

      add(1, '標準化特徵', '先把每個特徵減平均、除以標準差，讓共變異矩陣等同於相關係數矩陣（除 n/(n−1)）。', [
        '標準化後每個特徵平均為 0、母體標準差為 1'
      ]);

      add(2, '計算共變異矩陣 Σ', '計算任兩個特徵之間的共變異數，對角線是各特徵變異數（約 ' + f(rows.length / (rows.length - 1), 3) + '）。', [
        'Σ[0,1] = ' + f(R.cov[0][1], 3) + '（正值代表兩特徵同向變動）'
      ]);

      st.showVec = true; st.showVar = true;
      add(3, '解特徵值與特徵向量', R.use4 ? '4×4 共變異矩陣求解 4 組正交特徵向量與對應特徵值。' : '2×2 矩陣直接解二次方程，得出最大變異方向 PC1 與正交方向 PC2。', [
        '特徵值 λ = (' + R.eigs.map(e => f(e.val, 3)).join(', ') + ')',
        'PC1 方向 = (' + R.eigs[0].vec.map(v => f(v, 3)).join(', ') + ')'
      ]);

      st.showAxes = true;
      add(5, '畫出主成分新軸', 'PC1 指向資料延伸最長的方向，PC2 與 PC1 垂直（內積為 0）。', [
        'PC1 方向向量長度 = 1'
      ]);

      st.showProj = true;
      add(5, '各點投影到主成分軸', '每個點乘上 PC1 向量得到新的 PC1 分數，紅虛線就是丟掉 PC2 後的垂直距離。', [
        '1 號病人 PC1 分數 = ' + f(R.scores[0][0], 3)
      ]);

      st.showVar = true;
      const cumVar = M.sum(R.ratios.slice(0, R.keep));
      add(6, '解釋變異比例', '特徵值除以總特徵值和，就得到每個主成分保留了多少原本的資訊量。', [
        R.ratios.map((rt, j) => 'PC' + (j + 1) + ': ' + LAB.pct(rt, 1)).join('｜'),
        '前 ' + R.keep + ' 個累計解釋 ' + LAB.pct(cumVar, 1)
      ]);

      st.showRecon = true;
      add(7, '降維與重建誤差', '只留前 ' + R.keep + ' 個主成分再反推回原空間，橘點全落在保留的子空間上。', [
        '平均平方重建誤差 = ' + f(R.reconErr, 3)
      ]);

      add(7, '陡坡圖與 80% 法則', '實務決定保留幾個主成分常看「累計解釋變異 ≥ 80%–90%」，或挑選特徵值 λ > 1（Kaiser 準則）的成分。', [
        '保留 ' + R.keep + ' / ' + R.d + ' 維，累計變異 = ' + LAB.pct(cumVar, 1)
      ]);
      add(7, 'PCA 適用與防洩漏', 'PCA 適合壓縮共線特徵與加速建模，但新軸是線性組合可解釋性較低；且須僅用訓練集 fit 再 transform 測試集（A10）。', [
        '非線性流形視覺化則可改用 t-SNE (C6) 或 UMAP (C13)'
      ]);
      return steps;
    },

    keys(steps, rows, p) {
      const R = runPCA(rows, p);
      const k = { recon_err: R.reconErr };
      for (let i = 0; i < R.d; i++) {
        k['eigval_' + i] = R.eigs[i].val;
        k['var_ratio_' + i] = R.ratios[i];
        for (let j = 0; j < R.d; j++) {
          k['cov_' + i + '_' + j] = R.cov[i][j];
          k['pc' + i + '_v' + j] = R.eigs[i].vec[j];
        }
      }
      rows.forEach((r, i) => { k['pc0_score_' + r.id] = R.scores[i][0]; });
      return k;
    },

    explain(steps, rows, p) {
      const R = runPCA(rows, p);
      const cum = M.sum(R.ratios.slice(0, R.keep));
      return [
        '對 ' + R.d + ' 個標準化特徵計算共變異矩陣（除數 n−1）後，第一主成分 PC1 解釋了 ' + LAB.pct(R.ratios[0], 1) + ' 的變異。',
        '保留前 ' + R.keep + ' 個主成分累計保留 ' + LAB.pct(cum, 1) + ' 變異，平均平方重建誤差為 ' + f(R.reconErr, 3) + '。',
        '注意：特徵縮放（除以母體 sd 或樣本 sd）與共變異除數（n−1）必須前後一致，否則特徵值會差 n/(n−1) 倍。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Normalize', 'PCA'],
      params: [
        ['PCA › dimensionality reduction', 'fixed number'],
        ['PCA › number of components', p => String(p.keep)]
      ],
      note: 'AI Studio 的 PCA 預設會自動標準化或沿用前置 Normalize；留意小樣本下母體標準差（n）與樣本標準差（n−1）的差異。',
      expect: (steps, rows, p) => {
        const R = runPCA(rows, p);
        return ['PC1 解釋變異比例 = ' + LAB.pct(R.ratios[0], 1)];
      },
      python: `from sklearn.preprocessing import StandardScaler\nfrom sklearn.decomposition import PCA\nZ = StandardScaler().fit_transform(X)\npca = PCA(n_components=1).fit(Z)`,
      confirmed: false
    }
  });
})();
