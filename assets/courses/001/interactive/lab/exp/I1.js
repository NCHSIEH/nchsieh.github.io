/* I1 SHAP 與排列重要度 */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = LAB.data.columns('clinic', ['age', 'bmi', 'glu', 'dm'], { dm: 'y' });
  const FEATS = ['age', 'bmi', 'glu'];
  const FLAB = ['年齡', 'BMI', '血糖'];
  const pick = r => ({ id: r.id, age: r.age, bmi: r.bmi, glu: r.glu, dm: r.dm });
  const PERMS = [[0, 1, 2], [0, 2, 1], [1, 0, 2], [1, 2, 0], [2, 0, 1], [2, 1, 0]];

  // L2 正則化 (C=1.0) Logistic Regression：Newton-Raphson 對齊 sklearn LogisticRegression(C=1.0)
  function fitLogReg(Z, Y) {
    const n = Z.length;
    let w = [0, 0, 0, 0]; // [w0, w1, w2, b]
    for (let it = 0; it < 20; it++) {
      const g = [w[0], w[1], w[2], 0]; // L2 penalty on w0..w2 only
      const H = [[1, 0, 0, 0], [0, 1, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1e-12]];
      for (let i = 0; i < n; i++) {
        const x = [Z[i][0], Z[i][1], Z[i][2], 1];
        const pr = M.sigmoid(x[0] * w[0] + x[1] * w[1] + x[2] * w[2] + w[3]);
        const wt = pr * (1 - pr);
        for (let a = 0; a < 4; a++) {
          g[a] += (pr - Y[i]) * x[a];
          for (let b = 0; b < 4; b++) H[a][b] += wt * x[a] * x[b];
        }
      }
      // Solve 4x4 H * step = g
      const A = H.map((r, i) => r.slice().concat([g[i]]));
      for (let i = 0; i < 4; i++) {
        let piv = i;
        for (let r = i + 1; r < 4; r++) if (Math.abs(A[r][i]) > Math.abs(A[piv][i])) piv = r;
        const tmp = A[i]; A[i] = A[piv]; A[piv] = tmp;
        const div = A[i][i] || 1e-12;
        for (let j = i; j < 5; j++) A[i][j] /= div;
        for (let r = 0; r < 4; r++) {
          if (r === i) continue;
          const fac = A[r][i];
          for (let j = i; j < 5; j++) A[r][j] -= fac * A[i][j];
        }
      }
      const step = A.map(r => r[4]);
      for (let i = 0; i < 4; i++) w[i] -= step[i];
      if (M.max(step.map(Math.abs)) < 1e-11) break;
    }
    return w;
  }

  function runSHAP(rows, p) {
    const n = rows.length;
    const Z = rows.map(() => [0, 0, 0]);
    FEATS.forEach((ft, j) => {
      const xs = LAB.col(rows, ft), mx = M.mean(xs), sx = M.sd(xs) || 1;
      for (let i = 0; i < n; i++) Z[i][j] = (xs[i] - mx) / sx;
    });
    const Y = rows.map(r => r.dm);
    const coef = fitLogReg(Z, Y); // [w0, w1, w2, b]
    const predFn = z => M.sigmoid(z[0] * coef[0] + z[1] * coef[1] + z[2] * coef[2] + coef[3]);

    const tId = Math.min(n, Math.max(1, Math.round(p.target || 1)));
    const ti = Math.max(0, rows.findIndex(r => r.id === tId));
    const zTarget = Z[ti];
    const bg = [0, 0, 0]; // 全體平均（標準化後為 0）
    const baseVal = predFn(bg);
    const targetPred = predFn(zTarget);

    const permRows = PERMS.map(order => {
      let cur = bg.slice();
      let prevP = predFn(cur);
      const contribs = [0, 0, 0];
      order.forEach(fj => {
        cur[fj] = zTarget[fj];
        const nextP = predFn(cur);
        contribs[fj] = nextP - prevP;
        prevP = nextP;
      });
      return { order, label: order.map(j => FLAB[j]).join('→'), contribs };
    });

    const shap = [0, 1, 2].map(j => M.mean(permRows.map(pr => pr.contribs[j])));
    const sumCheck = baseVal + M.sum(shap);

    // 排列重要度（Permutation Importance）
    const baseAcc = Z.filter((z, i) => (predFn(z) >= 0.5 ? 1 : 0) === Y[i]).length / n;
    const rng = LAB.rng(9100 + n);
    const permImp = [0, 1, 2].map(j => {
      const shuf = LAB.shuffle(rng, M.range(n, i => i));
      const acc = Z.filter((z, i) => {
        const zMod = z.slice();
        zMod[j] = Z[shuf[i]][j];
        return (predFn(zMod) >= 0.5 ? 1 : 0) === Y[i];
      }).length / n;
      return baseAcc - acc;
    });

    return { coef, ti, tid: rows[ti].id, baseVal, targetPred, permRows, shap, sumCheck, baseAcc, permImp };
  }

  LAB.register({
    id: 'I1', group: 'I', title: 'SHAP 與排列重要度',
    module: { name: 'M9 第 11 節', url: '../m9/#p11' },
    goal: '看懂 SHAP 如何枚舉三個特徵的所有 6 種加入順序，把每個特徵對「單一病人預測機率」的貢獻公平切分出來，並對比全域的排列重要度。',
    data: {
      name: 'clinic_shap',
      scenario: '門診健檢：14 位病人訓練 Logistic 迴歸，對指定病人精確計算 3 特徵的 SHAP 值',
      columns: COLS,
      editable: ['age', 'bmi', 'glu', 'dm'],
      small: seed => LAB.data.clinic(seed, 14).map(pick)
    },
    params: [
      { key: 'target', label: '解釋病人 (#)', type: 'int', min: 1, max: 14, step: 1, value: 1 }
    ],
    pseudo: [
      '訓練標準化 Logistic 迴歸模型',
      '以全體平均為背景，算基準機率 φ₀',
      '枚舉 3 個特徵的所有 6 種加入順序：',
      '  依序將特徵從平均換成病人實際值',
      '  記錄每次預測機率的邊際變化',
      '對 6 種順序取平均得各特徵 SHAP',
      '檢查 φ₀ + Σ SHAP = 該病人預測',
      '對照全域排列重要度（打亂欄位掉分）'
    ],
    build(rows, p) {
      const R = runSHAP(rows, p), steps = [];

      function views(st) {
        const main = {
          type: 'table', slot: 'main',
          title: '6 種加入順序的邊際貢獻（病人 #' + R.tid + '）',
          cols: [
            { key: 'ord', label: '加入順序' },
            { key: 'c0', label: '年齡', num: true, digits: 3 },
            { key: 'c1', label: 'BMI', num: true, digits: 3 },
            { key: 'c2', label: '血糖', num: true, digits: 3 }
          ],
          rows: R.permRows.map((pr, idx) => ({
            id: 'p' + idx,
            cells: [
              pr.label,
              idx < st.permUpto ? pr.contribs[0] : null,
              idx < st.permUpto ? pr.contribs[1] : null,
              idx < st.permUpto ? pr.contribs[2] : null
            ],
            hl: idx === st.permUpto - 1
          }))
        };
        const side = {
          type: 'bars', slot: 'side',
          title: st.showPermImp ? '全域排列重要度（打亂後準確率下降）' : '各特徵 SHAP 值（相對於基準 ' + f(R.baseVal, 3) + '）',
          digits: 3,
          items: st.showPermImp
            ? [0, 1, 2].map(j => ({ id: 'pi' + j, label: FLAB[j], value: R.permImp[j], cls: 'c' + j }))
            : [0, 1, 2].map(j => ({
                id: 'sh' + j,
                label: FLAB[j] + ' (' + f(R.shap[j], 3) + ')',
                value: st.showShap ? R.shap[j] : 0,
                cls: R.shap[j] >= 0 ? 'c1' : 'c0'
              }))
        };
        const wf = [
          { id: 'base', label: '基準 φ₀', value: R.baseVal, cls: 'c5' },
          { id: 's0', label: '+年齡', value: st.showShap ? R.baseVal + R.shap[0] : R.baseVal, cls: R.shap[0] >= 0 ? 'c1' : 'c0' },
          { id: 's1', label: '+BMI', value: st.showShap ? R.baseVal + R.shap[0] + R.shap[1] : R.baseVal, cls: R.shap[1] >= 0 ? 'c1' : 'c0' },
          { id: 's2', label: '預測 p̂', value: st.showShap ? R.targetPred : R.baseVal, cls: 'hl' }
        ];
        const bottom = {
          type: 'bars', slot: 'bottom',
          title: '瀑布累積：從基準機率推到 #' + R.tid + ' 預測機率',
          max: 1, digits: 3, items: wf
        };
        return [main, side, bottom];
      }

      const st = { permUpto: 0, showShap: false, showPermImp: false };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [R.tid] });

      add(0, '題目', '模型預測 #' + R.tid + ' 號病人的糖尿病風險為 ' + f(R.targetPred, 3) + '。年齡、BMI、血糖各貢獻了多少？', [
        '模型係數 w = (' + R.coef.slice(0, 3).map(v => f(v, 2)).join(', ') + ')，b = ' + f(R.coef[3], 2)
      ]);

      add(2, '基準值 φ₀（全體平均）', '當三個特徵都取全體平均值（標準化後為 0）時，模型給出的基準機率為 φ₀。', [
        '基準值 φ₀ = sigmoid(' + f(R.coef[3], 3) + ') = ' + f(R.baseVal, 3)
      ]);

      for (let i = 0; i < 6; i++) {
        st.permUpto = i + 1;
        const pr = R.permRows[i];
        add(5, '順序 ' + (i + 1) + '：' + pr.label, '依「' + pr.label + '」順序把平均值換成 #' + R.tid + ' 的實際數值，記下每換一格時機率的跳動量。', [
          '邊際貢獻：年齡 ' + f(pr.contribs[0], 3) + '｜BMI ' + f(pr.contribs[1], 3) + '｜血糖 ' + f(pr.contribs[2], 3)
        ]);
      }

      st.showShap = true;
      add(6, '取平均得 SHAP 值', '因為加入順序會影響邊際變化，把 6 種順序平均起來，就得到公平且唯一滿足加法公理的 SHAP 值。', [
        'SHAP = (' + R.shap.map(v => f(v, 3)).join(', ') + ')'
      ]);

      add(7, '加總檢查', '驗證「基準值 + 三個 SHAP」是否剛好等於這位病人的預測機率！', [
        f(R.baseVal, 3) + ' + (' + R.shap.map(v => f(v, 3)).join(' + ') + ') = ' + f(R.sumCheck, 4),
        '#' + R.tid + ' 實際預測 = ' + f(R.targetPred, 4) + '（完全相等！）'
      ]);

      st.showPermImp = true;
      add(8, '對照全域排列重要度', 'SHAP 解釋「單一病人」；排列重要度則是把整欄打亂，看全體準確率掉多少（全域模型依賴度）。', [
        '原準確率 ' + LAB.pct(R.baseAcc, 1) + '｜打亂掉分：' + FLAB.map((lb, j) => lb + ' ' + f(R.permImp[j], 3)).join('、')
      ]);

      return steps;
    },

    keys(steps, rows, p) {
      const R = runSHAP(rows, p);
      const k = {
        w0: R.coef[0], w1: R.coef[1], w2: R.coef[2], b: R.coef[3],
        base_val: R.baseVal, target_pred: R.targetPred, sum_check: R.sumCheck
      };
      R.shap.forEach((v, j) => { k['shap_' + j] = v; });
      R.permRows.forEach((pr, idx) => {
        [0, 1, 2].forEach(j => { k['perm_' + idx + '_' + j] = pr.contribs[j]; });
      });
      return k;
    },

    explain(steps, rows, p) {
      const R = runSHAP(rows, p);
      return [
        '以全體平均為基準機率 φ₀ = ' + f(R.baseVal, 3) + '，#' + R.tid + ' 號病人的預測機率為 ' + f(R.targetPred, 3) + '。',
        '平均 6 種加入順序後，年齡、BMI、血糖的 SHAP 貢獻分別為 ' + R.shap.map(v => f(v, 3)).join('、') + '，加回基準值恰好等於預測值。',
        '注意：AI Studio 的 Explain Predictions 採用類似 LIME 的局部線性近似，概念相近但數學定義與精確 Shapley 值不同。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Set Role', 'Normalize', 'Logistic Regression', 'Explain Predictions'],
      params: [
        ['Set Role › dm', 'label']
      ],
      note: 'AI Studio 的 Explain Predictions 採用類 LIME 局部代理模型，並非精確 Shapley 值，數值不會完全相同。',
      expect: (steps, rows, p) => {
        const R = runSHAP(rows, p);
        return ['#' + R.tid + ' 預測 = ' + f(R.targetPred, 3) + '，SHAP = (' + R.shap.map(v => f(v, 3)).join(', ') + ')'];
      },
      python: `from sklearn.linear_model import LogisticRegression\n# 3 特徵直接枚舉 3!=6 種排列即可得精確 Shapley 值`,
      confirmed: false
    }
  });
})();
