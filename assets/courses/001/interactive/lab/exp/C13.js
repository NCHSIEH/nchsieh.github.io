/* C13 UMAP 流形降維（與 PCA／t-SNE 對照） */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = LAB.data.columns('clinic', ['age', 'bmi', 'glu', 'sbp', 'dm'], { dm: 'y' });
  const FEATS = ['age', 'bmi', 'glu', 'sbp'];
  const pick = r => ({ id: r.id, age: r.age, bmi: r.bmi, glu: r.glu, sbp: r.sbp, dm: r.dm });
  const cls = dm => dm ? 'c1' : 'c0';

  function runUMAP(rows, p) {
    const n = rows.length;
    const k = Math.max(3, Math.min(6, Math.round(p.n_neighbors || 4)));
    const minDist = Math.max(0.1, Math.min(0.6, Number(p.min_dist || 0.2)));

    const Z = rows.map(() => [0, 0, 0, 0]);
    FEATS.forEach((ft, j) => {
      const xs = LAB.col(rows, ft), mx = M.mean(xs), sx = M.sd(xs) || 1;
      for (let i = 0; i < n; i++) Z[i][j] = (xs[i] - mx) / sx;
    });

    const D = M.range(n, i => M.range(n, j => {
      let s = 0;
      for (let d = 0; d < 4; d++) s += (Z[i][d] - Z[j][d]) ** 2;
      return Math.sqrt(s);
    }));

    // 1. 局部連通距離 rho_i 與平滑尺度 sigma_i（滿足 Σ exp(-(d-rho)/sigma) = log2(k)）
    const target = Math.log2(k);
    const rhos = [], sigmas = [], knnIdx = [];
    const Pdir = M.range(n, () => M.range(n, () => 0));

    for (let i = 0; i < n; i++) {
      const ord = M.range(n).filter(j => j !== i).sort((a, b) => D[i][a] - D[i][b] || a - b);
      const nbs = ord.slice(0, k);
      knnIdx.push(nbs);
      const rho = D[i][nbs[0]];
      rhos.push(rho);

      let lo = 1e-4, hi = 20.0, mid = 1.0;
      for (let it = 0; it < 40; it++) {
        mid = 0.5 * (lo + hi);
        let s = 0;
        for (let m = 0; m < nbs.length; m++) {
          const d = D[i][nbs[m]];
          s += Math.exp(-Math.max(0, d - rho) / mid);
        }
        if (s > target) hi = mid; else lo = mid;
      }
      sigmas.push(mid);
      nbs.forEach(j => {
        Pdir[i][j] = Math.exp(-Math.max(0, D[i][j] - rho) / mid);
      });
    }

    // 2. 模糊單純形聯集：W_ij = p(j|i) + p(i|j) - p(j|i)*p(i|j)
    const W = M.range(n, i => M.range(n, j => {
      if (i === j) return 0;
      return Pdir[i][j] + Pdir[j][i] - Pdir[i][j] * Pdir[j][i];
    }));

    // 3. 低維初始化（模擬譜初始化，保留全域骨架）與模糊交叉熵梯度下降
    const rng = LAB.rng(6130 + k * 17 + Math.round(minDist * 100));
    let Y = rows.map((_, i) => [
      Z[i][1] * 0.75 + Z[i][2] * 0.45 + (rng() - 0.5) * 0.15,
      Z[i][0] * 0.55 - Z[i][3] * 0.45 + (rng() - 0.5) * 0.15
    ]);
    const aParam = 1.6 / (0.3 + minDist);

    const evalCE = curY => {
      let ce = 0;
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const d2 = (curY[i][0] - curY[j][0]) ** 2 + (curY[i][1] - curY[j][1]) ** 2;
          const q = M.clamp(1 / (1 + aParam * d2), 1e-6, 1 - 1e-6);
          const w = W[i][j];
          ce += -(w * Math.log(q) + (1 - w) * Math.log(1 - q));
        }
      }
      return ce / (n * (n - 1) / 2);
    };

    const snaps = [{ iter: 0, Y: Y.map(pt => pt.slice()), ce: evalCE(Y) }];
    const totalIters = 120;
    const lr = 0.08;

    for (let it = 1; it <= totalIters; it++) {
      const grad = M.range(n, () => [0, 0]);
      for (let i = 0; i < n; i++) {
        for (let j = i + 1; j < n; j++) {
          const dx = Y[i][0] - Y[j][0], dy = Y[i][1] - Y[j][1];
          const d2 = dx * dx + dy * dy + 1e-4;
          const w = W[i][j];
          // 引力（對 W_ij > 0 的鄰居拉近）＋ 斥力（對非鄰居推開）
          const attr = (2 * aParam * w) / (1 + aParam * d2);
          const rep = (2 * (1 - w)) / ((0.05 + d2) * (1 + aParam * d2));
          const coeff = M.clamp(attr - rep, -4, 4);
          grad[i][0] += coeff * dx;
          grad[i][1] += coeff * dy;
          grad[j][0] -= coeff * dx;
          grad[j][1] -= coeff * dy;
        }
      }
      const stepLr = lr * (1 - 0.6 * it / totalIters);
      for (let i = 0; i < n; i++) {
        Y[i][0] -= stepLr * grad[i][0];
        Y[i][1] -= stepLr * grad[i][1];
      }
      if (it === 10 || it === 30 || it === 60 || it === totalIters) {
        snaps.push({ iter: it, Y: Y.map(pt => pt.slice()), ce: evalCE(Y) });
      }
    }

    const fin = snaps[snaps.length - 1];
    // 計算高維 k-NN 局部保留率與全域距離相關係數
    let kept = 0;
    for (let i = 0; i < n; i++) {
      const d2s = M.range(n).filter(j => j !== i).sort((a, b) => {
        const da = (fin.Y[i][0] - fin.Y[a][0]) ** 2 + (fin.Y[i][1] - fin.Y[a][1]) ** 2;
        const db = (fin.Y[i][0] - fin.Y[b][0]) ** 2 + (fin.Y[i][1] - fin.Y[b][1]) ** 2;
        return da - db;
      }).slice(0, k);
      const set2 = new Set(d2s);
      knnIdx[i].forEach(nb => { if (set2.has(nb)) kept++; });
    }
    const localPres = kept / (n * k);

    const dHi = [], dLo = [];
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        dHi.push(D[i][j]);
        dLo.push(Math.hypot(fin.Y[i][0] - fin.Y[j][0], fin.Y[i][1] - fin.Y[j][1]));
      }
    }
    const mH = M.mean(dHi), mL = M.mean(dLo);
    let num = 0, vH = 0, vL = 0;
    for (let t = 0; t < dHi.length; t++) {
      const a0 = dHi[t] - mH, b0 = dLo[t] - mL;
      num += a0 * b0; vH += a0 * a0; vL += b0 * b0;
    }
    const globalCorr = (vH > 0 && vL > 0) ? num / Math.sqrt(vH * vL) : 0;

    return { k, minDist, rhos, sigmas, W, snaps, fin, localPres, globalCorr };
  }

  LAB.register({
    id: 'C13', group: 'C', title: 'UMAP 流形降維',
    module: { name: 'M3 非線性降維', url: '../m3/#p11' },
    goal: '看懂現代生醫高維視覺化首選 UMAP 如何建構局部模糊鄰域圖、以模糊聯集計算對稱連邊權重，並透過引力／斥力交叉熵在保留局部群聚的同時兼顧全域結構。',
    data: {
      name: 'clinic_umap',
      scenario: '門診健檢：將 4 維生理指標（年齡、BMI、血糖、血壓）以 UMAP 降維至 2D 觀察亞型結構',
      columns: COLS,
      editable: ['age', 'bmi', 'glu', 'sbp', 'dm'],
      small: seed => LAB.data.clinic(seed, 14).map(pick)
    },
    params: [
      { key: 'n_neighbors', label: '鄰居數 n_neighbors', type: 'int', min: 3, max: 6, step: 1, value: 4 },
      { key: 'min_dist', label: '最小間距 min_dist', type: 'num', min: 0.1, max: 0.6, step: 0.1, value: 0.2 }
    ],
    pseudo: [
      '把 4 個生理指標標準化',
      '對每點找 n_neighbors 個最近鄰',
      '算局部連通距離 ρᵢ 與尺度 σᵢ',
      '模糊聯集 W = P + Pᵀ − P⊙Pᵀ',
      '譜初始化 2D 骨架座標 Y⁽⁰⁾',
      '迭代最小化模糊交叉熵損失：',
      '  引力拉近高權重鄰居、斥力推開',
      '評估局部鄰居保留率與全域相關'
    ],
    build(rows, p) {
      const R = runUMAP(rows, p), steps = [];
      const allX = R.snaps.reduce((a, s) => a.concat(s.Y.map(pt => pt[0])), []);
      const allY = R.snaps.reduce((a, s) => a.concat(s.Y.map(pt => pt[1])), []);
      const bnd = Math.max(2.0, Math.ceil(Math.max(M.max(allX.map(Math.abs)), M.max(allY.map(Math.abs))) * 1.15));
      const AX = { x: { label: 'UMAP 維度 1', min: -bnd, max: bnd }, y: { label: 'UMAP 維度 2', min: -bnd, max: bnd } };

      function views(st) {
        const sn = R.snaps[st.snapIdx];
        const points = rows.map((r, i) => ({
          id: 'p' + r.id, x: sn.Y[i][0], y: sn.Y[i][1],
          cls: cls(r.dm), label: String(r.id), r: 6
        }));
        const lines = [];
        if (st.showGraph) {
          for (let i = 0; i < rows.length; i++) {
            for (let j = i + 1; j < rows.length; j++) {
              if (R.W[i][j] >= 0.35) {
                lines.push({
                  id: 'e_' + i + '_' + j,
                  x1: sn.Y[i][0], y1: sn.Y[i][1],
                  x2: sn.Y[j][0], y2: sn.Y[j][1],
                  cls: R.W[i][j] > 0.7 ? 'c2' : 'c5',
                  dash: R.W[i][j] <= 0.7,
                  w: R.W[i][j] > 0.7 ? 1.8 : 1.0
                });
              }
            }
          }
        }
        const main = {
          type: 'scatter', slot: 'main',
          title: 'UMAP 2D 流形嵌入（第 ' + sn.iter + ' 步｜連線＝高權重模糊鄰居）',
          axes: AX, points, lines, circles: [],
          legend: [{ cls: 'c1', label: '糖尿病：是' }, { cls: 'c0', label: '糖尿病：否' }, { cls: 'c2', shape: 'line', label: '強鄰居邊 W>0.7' }]
        };
        const side = st.showComp ? {
          type: 'table', slot: 'side',
          title: '三大降維法對照：PCA vs t-SNE vs UMAP',
          cols: [
            { key: 'm', label: '方法' },
            { key: 'loc', label: '局部/全域' },
            { key: 'nw', label: '新病人投影' }
          ],
          rows: [
            { id: 'pca', cells: ['PCA (C5)', '線性全域', { v: '支援', cls: 'good' }] },
            { id: 'tsne', cells: ['t-SNE (C6)', '局部極強', { v: '不支援', cls: 'bad' }] },
            { id: 'umap', cells: ['UMAP (C13)', '局部＋全域', { v: '支援', cls: 'good' }], hl: true }
          ]
        } : {
          type: 'matrix', slot: 'side',
          title: '前 8 位病人對稱模糊鄰域權重矩陣 W',
          rowLabels: rows.slice(0, 8).map(r => '#' + r.id),
          colLabels: rows.slice(0, 8).map(r => '#' + r.id),
          values: R.W.slice(0, 8).map(row => row.slice(0, 8)),
          digits: 2, heat: true
        };
        const ceMax = Math.max(0.5, R.snaps[0].ce * 1.15);
        const bottom = {
          type: 'line', slot: 'bottom',
          title: '模糊交叉熵損失收斂曲線（引力拉近鄰居、斥力推開遠點）',
          axes: { x: { label: '優化迭代步數', min: 0, max: 120 }, y: { label: 'Fuzzy Cross-Entropy', min: 0, max: ceMax } },
          series: [{ id: 'ce', label: '交叉熵損失', pts: R.snaps.slice(0, st.snapIdx + 1).map(s => [s.iter, s.ce]), cls: 'c1', dots: true }],
          marker: { x: sn.iter, y: sn.ce, label: 'It=' + sn.iter }
        };
        return [main, side, bottom];
      }

      const st = { snapIdx: 0, showGraph: false, showComp: false };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '1. 題目與 UMAP 定位', '要把 4 維門診資料畫成 2D 圖：PCA (C5) 只能線性投影，t-SNE (C6) 速度慢且易斷全域距離；UMAP 兼顧局部與全域！', [
        'n_neighbors = ' + R.k + '｜min_dist = ' + f(R.minDist, 1)
      ]);

      add(2, '2. 局部尺度 ρᵢ 與 σᵢ', 'UMAP 先減去每人最近鄰距離 ρᵢ（確保流形局部連通不斷裂），再搜尋 σᵢ 使每點有效鄰居權重總和 = log₂(k)。', [
        '#1 最近鄰 ρ₁ = ' + f(R.rhos[0], 3) + '，尺度 σ₁ = ' + f(R.sigmas[0], 3)
      ]);

      st.showGraph = true;
      add(3, '3. 模糊單純形聯集 W', '用機率聯集公式 Wᵢⱼ = p(j|i) + p(i|j) − p(j|i)p(i|j) 把有向鄰居合成對稱模糊圖（見右圖權重矩陣與主圖連線）。', [
        'W[0,1] = ' + f(R.W[0][1], 3) + '（越接近 1 代表高維流形連結越強）'
      ]);

      add(4, '4. 譜初始化 2D 骨架', '不同於 t-SNE 隨機撒點容易亂跳，UMAP 先用圖譜骨架初始化 Y⁽⁰⁾，從第 0 步就保住大部分全域相對位置！', [
        '起始模糊交叉熵 = ' + f(R.snaps[0].ce, 3)
      ]);

      [1, 2, 3, 4].forEach(idx => {
        st.snapIdx = idx;
        const sn = R.snaps[idx];
        add(6, '5. 第 ' + sn.iter + ' 步引力斥力優化', idx < 4 ? '高權重鄰居彼此吸引靠攏、非鄰居互相排斥推開，讓相同臨床特徵的病人形成緊密島嶼。' : '完成 120 步優化！模糊交叉熵穩定收斂，高低風險亞型清晰分離且保留全域拓撲順序。', [
          '第 ' + sn.iter + ' 步交叉熵 = ' + f(sn.ce, 4)
        ]);
      });

      st.showComp = true;
      add(7, '6. 局部與全域保留評估', '檢驗降維品質：高維 ' + R.k + '-NN 在 2D 保留率達 ' + LAB.pct(R.localPres, 1) + '，成對全域距離相關達 r = ' + f(R.globalCorr, 2) + '！', [
        '局部鄰居保留率 = ' + LAB.pct(R.localPres, 1) + '｜全域距離相關 r = ' + f(R.globalCorr, 3)
      ]);

      add(7, '7. 兩大關鍵超參數口訣', 'n_neighbors 越小越看微觀局部細節、越大越看全域輪廓；min_dist 越小點群縮得越緊密（利分群），越大越鬆散（利看流形）。', [
        '且 UMAP 支援 mapper.transform(X_new) 直接投影新病人！'
      ]);
      return steps;
    },

    keys(steps, rows, p) {
      const R = runUMAP(rows, p);
      return {
        rho_0: R.rhos[0],
        rho_1: R.rhos[1],
        sigma_0: R.sigmas[0],
        sigma_1: R.sigmas[1],
        w_0_1: R.W[0][1],
        w_0_2: R.W[0][2],
        ce_init: R.snaps[0].ce,
        ce_final: R.fin.ce,
        local_pres: R.localPres,
        global_corr: R.globalCorr
      };
    },

    explain(steps, rows, p) {
      const R = runUMAP(rows, p);
      return [
        'UMAP 透過局部連通距離 ρᵢ 與模糊單純形聯集 Wᵢⱼ 建構高維流形圖（n_neighbors = ' + R.k + '、min_dist = ' + f(R.minDist, 1) + '）。',
        '經 120 步引力／斥力交叉熵優化後，損失由 ' + f(R.snaps[0].ce, 3) + ' 降至 ' + f(R.fin.ce, 3) + '，局部鄰居保留率 ' + LAB.pct(R.localPres, 1) + '、全域距離相關 r = ' + f(R.globalCorr, 2) + '。',
        '相較 t-SNE (C6)，UMAP 計算更快、更能兼顧全域結構，且支援對未見過的新病人執行 transform()，已成為單細胞基因體與臨床高維資料視覺化標準。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Normalize', 'Execute Python'],
      params: [
        ['UMAP › n_neighbors', p => String(p.n_neighbors)],
        ['UMAP › min_dist', p => String(p.min_dist)]
      ],
      note: 'AI Studio 核心版無原生 UMAP 運算子，實務透過 Execute Python 呼叫 umap-learn 套件執行。',
      expect: (steps, rows, p) => {
        const R = runUMAP(rows, p);
        return ['局部鄰居保留率 = ' + LAB.pct(R.localPres, 1) + '，全域距離相關 r = ' + f(R.globalCorr, 2)];
      },
      python: `import umap\nreducer = umap.UMAP(n_neighbors=4, min_dist=0.2, random_state=42)\nY_train = reducer.fit_transform(Z_train)\nY_new = reducer.transform(Z_new)  # 支援新病人投影`,
      confirmed: false
    }
  });
})();
