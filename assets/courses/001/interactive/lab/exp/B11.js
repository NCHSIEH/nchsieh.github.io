/* B11 多項式迴歸與過擬合 */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = [
    { key: 'bmi', label: 'BMI', unit: 'kg/m²', type: 'num', min: 18, max: 38, step: 0.1, role: 'x' },
    { key: 'split', label: '切分', type: 'cat', levels: ['訓練', '驗證'], codes: ['train', 'val'], role: 'x' },
    { key: 'sbp', label: '收縮壓', unit: 'mmHg', type: 'num', min: 90, max: 200, step: 1, role: 'y' }
  ];
  const AX = { x: { label: 'BMI (kg/m²)', min: 17, max: 39 }, y: { label: '收縮壓 (mmHg)', min: 90, max: 195 } };

  function makeRows(seed) {
    const r = LAB.rng(3100 + seed);
    const bmis = [19.2, 20.8, 22.1, 23.6, 25.0, 26.5, 28.0, 29.6, 31.2, 32.8, 34.4, 36.1];
    const valIdx = new Set([2, 5, 8, 10]);
    return bmis.map((b, i) => {
      const z = (b - 27.5) / 5.0;
      const trueY = 122 + 16 * z + 7 * z * z;
      const noise = (r() - 0.5) * 9;
      return {
        id: i + 1,
        bmi: Math.round((b + (r() - 0.5) * 0.4) * 10) / 10,
        split: valIdx.has(i) ? 1 : 0,
        sbp: Math.round(trueY + noise)
      };
    });
  }

  function solveLinear(A, b) {
    const d = A.length;
    const mat = A.map((row, i) => row.slice().concat([b[i]]));
    for (let i = 0; i < d; i++) {
      let piv = i;
      for (let r = i + 1; r < d; r++) if (Math.abs(mat[r][i]) > Math.abs(mat[piv][i])) piv = r;
      const tmp = mat[i]; mat[i] = mat[piv]; mat[piv] = tmp;
      const div = Math.abs(mat[i][i]) > 1e-12 ? mat[i][i] : 1e-12;
      for (let j = i; j <= d; j++) mat[i][j] /= div;
      for (let r = 0; r < d; r++) {
        if (r === i) continue;
        const fac = mat[r][i];
        for (let j = i; j <= d; j++) mat[r][j] -= fac * mat[i][j];
      }
    }
    return mat.map(row => row[d]);
  }

  function fitDegree(train, val, deg, mx, sx) {
    const feat = x => {
      const z = (x - mx) / sx;
      const v = [1];
      for (let k = 1; k <= deg; k++) v.push(Math.pow(z, k));
      return v;
    };
    const d = deg + 1;
    const X = train.map(r => feat(r.bmi));
    const XtX = M.range(d, () => M.range(d, () => 0));
    const Xty = M.range(d, () => 0);
    for (let i = 0; i < train.length; i++) {
      for (let j = 0; j < d; j++) {
        Xty[j] += X[i][j] * train[i].sbp;
        for (let k = 0; k < d; k++) XtX[j][k] += X[i][j] * X[i][k];
      }
    }
    for (let j = 0; j < d; j++) XtX[j][j] += 1e-9;
    const w = solveLinear(XtX, Xty);
    const pred = x => {
      const fx = feat(x);
      let s = 0;
      for (let j = 0; j < d; j++) s += w[j] * fx[j];
      return s;
    };
    const trainMse = M.mean(train.map(r => (r.sbp - pred(r.bmi)) ** 2));
    const valMse = M.mean(val.map(r => (r.sbp - pred(r.bmi)) ** 2));
    return { deg, w, pred, trainMse, valMse };
  }

  function analyze(rows) {
    const train = rows.filter(r => r.split === 0);
    const val = rows.filter(r => r.split === 1);
    const mx = M.mean(train.map(r => r.bmi));
    const sx = M.sd(train.map(r => r.bmi)) || 1;
    const models = M.range(7, i => fitDegree(train, val, i + 1, mx, sx));
    let best = models[0];
    models.forEach(m => { if (m.valMse < best.valMse) best = m; });
    return { train, val, mx, sx, models, best };
  }

  LAB.register({
    id: 'B11', group: 'B', title: '多項式迴歸與過擬合',
    module: { name: 'M2-1 第 09 節', url: '../m2-1/#p09' },
    goal: '調整多項式階數（degree 1–7），觀察曲線如何從欠擬合直線到過度彎曲貼合訓練點，並比較訓練 MSE 與驗證 MSE 的 U 型反轉。',
    data: {
      name: 'clinic_poly',
      scenario: '門診健檢：12 位病人（8 筆訓練＋4 筆驗證），用 BMI 預測非線性上升的收縮壓',
      columns: COLS,
      editable: ['bmi', 'sbp'],
      small: makeRows
    },
    params: [
      { key: 'degree', label: '多項式階數 d', type: 'int', min: 1, max: 7, step: 1, value: 2 },
      { key: 'showVal', label: '顯示驗證點', type: 'bool', value: true }
    ],
    pseudo: [
      '將資料切為訓練集與驗證集',
      '對 BMI 標準化並展開次方項 z¹, …, zᵈ',
      '用訓練集解最小平方法求係數 w',
      '計算訓練集誤差 (Train MSE)',
      '在未見過的驗證集算誤差 (Val MSE)',
      '比較各階數尋找最低 Val MSE'
    ],
    build(rows, p) {
      const R = analyze(rows), steps = [];
      const curDeg = Math.max(1, Math.min(7, Math.round(p.degree || 2)));
      const curM = R.models[curDeg - 1];

      function curveLines(m) {
        const out = [];
        const N = 36;
        for (let i = 0; i < N; i++) {
          const x1 = AX.x.min + (AX.x.max - AX.x.min) * (i / N);
          const x2 = AX.x.min + (AX.x.max - AX.x.min) * ((i + 1) / N);
          const y1 = M.clamp(m.pred(x1), AX.y.min, AX.y.max);
          const y2 = M.clamp(m.pred(x2), AX.y.min, AX.y.max);
          out.push({ id: 'cv' + i, x1, y1, x2, y2, cls: 'c1', w: 3 });
        }
        return out;
      }

      function views(st) {
        const m = R.models[st.deg - 1];
        const points = rows
          .filter(r => r.split === 0 || p.showVal)
          .map(r => ({
            id: 'p' + r.id, x: r.bmi, y: r.sbp,
            cls: r.split === 1 ? 'hl' : 'c0',
            shape: r.split === 1 ? 'diamond' : 'circle',
            r: r.split === 1 ? 7 : 6,
            label: String(r.id)
          }));
        let lines = st.showCurve ? curveLines(m) : [];
        if (st.showRes) {
          rows.filter(r => r.split === 0 || p.showVal).forEach(r => {
            const py = M.clamp(m.pred(r.bmi), AX.y.min, AX.y.max);
            lines.push({ id: 'res' + r.id, x1: r.bmi, y1: r.sbp, x2: r.bmi, y2: py, cls: r.split === 1 ? 'hl' : 'c4', dash: true, w: 1.4 });
          });
        }
        const main = {
          type: 'scatter', slot: 'main',
          title: 'BMI × 收縮壓與 ' + st.deg + ' 次多項式擬合線',
          axes: AX, points, lines, circles: [],
          legend: [{ cls: 'c0', label: '訓練集 (8人)' }, { cls: 'hl', shape: 'diamond', label: '驗證集 (4人)' }, { cls: 'c1', shape: 'line', label: '預測曲線' }]
        };
        const side = {
          type: 'table', slot: 'side',
          title: '各階數訓練 vs 驗證誤差',
          cols: [
            { key: 'd', label: '階數', num: true, digits: 0 },
            { key: 'tr', label: '訓練 MSE', num: true, digits: 1 },
            { key: 'va', label: '驗證 MSE', num: true, digits: 1 }
          ],
          rows: R.models.slice(0, st.shownDegs).map(md => ({
            id: 'd' + md.deg,
            cells: [
              md.deg,
              md.trainMse,
              st.shownDegs >= 7 ? { v: f(md.valMse, 1), cls: md.deg === R.bestDeg ? 'good' : (md.valMse > 100 ? 'bad' : null) } : md.valMse
            ],
            hl: md.deg === st.deg
          }))
        };
        const sub = R.models.slice(0, st.shownDegs);
        const maxE = Math.max(40, Math.min(400, M.max(sub.map(x => Math.min(400, x.valMse))) * 1.1));
        const bottom = {
          type: 'line', slot: 'bottom',
          title: 'Bias–Variance 權衡：階數 vs 誤差',
          axes: { x: { label: '多項式階數 d', min: 1, max: 7 }, y: { label: 'MSE (截頂 400)', min: 0, max: maxE } },
          series: [
            { id: 'tr', label: '訓練 MSE', pts: sub.map(x => [x.deg, Math.min(400, x.trainMse)]), cls: 'c0', dots: true },
            { id: 'va', label: '驗證 MSE', pts: sub.map(x => [x.deg, Math.min(400, x.valMse)]), cls: 'c1', dots: true }
          ],
          marker: { x: st.deg, y: Math.min(400, m.valMse), label: 'd=' + st.deg }
        };
        return [main, side, bottom];
      }

      const st = { deg: 1, showCurve: false, showRes: false, shownDegs: 1 };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '題目', '12 位病人分成 8 筆訓練集與 4 筆驗證集，觀察多項式階數如何影響直線／曲線的擬合能力。', [
        '訓練集 ' + R.train.length + ' 筆，驗證集 ' + R.val.length + ' 筆'
      ]);

      st.showCurve = true; st.showRes = true;
      for (let d = 1; d <= 7; d++) {
        st.deg = d; st.shownDegs = Math.max(st.shownDegs, d);
        const md = R.models[d - 1];
        const status = d === 1 ? '欠擬合 (Underfitting)：直線跟不上彎曲趨勢'
          : d <= 3 ? '適度擬合：兼顧訓練與驗證表現'
          : '過擬合 (Overfitting)：訓練誤差極低但驗證曲線開始亂甩';
        add(d <= 3 ? 2 : 4, '試算 d = ' + d + ' 階', status + '。', [
          'd = ' + d + '：Train MSE = ' + f(md.trainMse, 2) + '｜Val MSE = ' + f(md.valMse, 2)
        ]);
      }

      st.deg = curDeg;
      add(5, '目前選擇 d = ' + curDeg, '目前滑桿選在 d = ' + curDeg + '；全體最低驗證 MSE 落在 d = ' + R.best.deg + '。', [
        'd = ' + curDeg + '：Train MSE = ' + f(curM.trainMse, 2) + '，Val MSE = ' + f(curM.valMse, 2),
        '最佳驗證階數：d* = ' + R.best.deg + '（Val MSE = ' + f(R.best.valMse, 2) + '）'
      ]);

      while (steps.length < 10) {
        add(5, '實務提醒', '訓練誤差隨階數只降不升，不能用來選模型；必須用未看過的驗證誤差挑 U 型谷底。', [
          'd* = ' + R.best.deg
        ]);
      }
      return steps;
    },

    keys(steps, rows, p) {
      const R = analyze(rows);
      const curDeg = Math.max(1, Math.min(7, Math.round(p.degree || 2)));
      const k = { best_deg: R.best.deg, cur_train_mse: R.models[curDeg - 1].trainMse, cur_val_mse: R.models[curDeg - 1].valMse };
      R.models.forEach(m => {
        k['tr_mse_' + m.deg] = m.trainMse;
        k['va_mse_' + m.deg] = m.valMse;
      });
      return k;
    },

    explain(steps, rows, p) {
      const R = analyze(rows);
      const curDeg = Math.max(1, Math.min(7, Math.round(p.degree || 2)));
      const cur = R.models[curDeg - 1];
      return [
        '將階數從 d=1 拉高到 d=7，訓練 MSE 一路從 ' + f(R.models[0].trainMse, 1) + ' 降到 ' + f(R.models[6].trainMse, 1) + '，但驗證 MSE 在 d=' + R.best.deg + ' 達到最低（' + f(R.best.valMse, 1) + '）後反而急劇飆升。',
        '目前 d=' + curDeg + ' 的訓練 MSE 為 ' + f(cur.trainMse, 2) + '、驗證 MSE 為 ' + f(cur.valMse, 2) + '。',
        '這正是 Bias–Variance 權衡：太簡單欠擬合（高 Bias），太複雜過擬合（高 Variance）。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Split Data', 'Polynomial Regression', 'Apply Model', 'Performance (Regression)'],
      params: [
        ['Split Data › ratio', '0.67 / 0.33'],
        ['Polynomial Regression › degree', p => String(p.degree)]
      ],
      note: 'AI Studio 的 Polynomial Regression 可直接設定 max degree，搭配 Split Data 或 Cross Validation 觀察驗證集的 RMSE / MSE 找出最佳階數。',
      expect: (steps, rows) => {
        const R = analyze(rows);
        return ['最低驗證 MSE 出現在 degree = ' + R.best.deg + '（Val MSE = ' + f(R.best.valMse, 2) + '）'];
      },
      python: 'from sklearn.preprocessing import PolynomialFeatures, StandardScaler\nfrom sklearn.linear_model import LinearRegression\n# 對標準化後 z 展開多項式特徵再以 LinearRegression 擬合',
      confirmed: false
    }
  });
})();
