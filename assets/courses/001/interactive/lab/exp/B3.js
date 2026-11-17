/* B3 Logistic 迴歸 */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = LAB.data.columns('clinic', ['bmi', 'glu', 'dm'], { dm: 'y' });
  const AX = { x: { label: 'BMI (kg/m²)', min: 15, max: 40 }, y: { label: '空腹血糖（mg/dL）', min: 60, max: 220 } };
  const pick = r => ({ id: r.id, bmi: r.bmi, glu: r.glu, dm: r.dm });

  function makeRows(seed) {
    const rs = LAB.data.clinic(seed, 12).map(pick);
    const negs = rs.filter(r => r.dm === 0).sort((a, b) => (b.glu + b.bmi * 2) - (a.glu + a.bmi * 2));
    const poss = rs.filter(r => r.dm === 1).sort((a, b) => (a.glu + a.bmi * 2) - (b.glu + b.bmi * 2));
    if (negs[0] && poss[0]) {
      negs[0].glu = Math.max(negs[0].glu, 126);
      negs[0].bmi = Math.max(negs[0].bmi, 28.2);
      poss[0].glu = Math.min(poss[0].glu, 108);
      poss[0].bmi = Math.min(poss[0].bmi, 25.4);
    }
    return rs;
  }
  const cls = dm => dm ? 'c1' : 'c0';

  function train(rows, p) {
    const bmis = LAB.col(rows, 'bmi'), glus = LAB.col(rows, 'glu'), n = rows.length;
    const mB = M.mean(bmis), sB = M.sd(bmis) || 1;
    const mG = M.mean(glus), sG = M.sd(glus) || 1;
    const Z = rows.map(r => [(r.bmi - mB) / sB, (r.glu - mG) / sG]);
    const Y = rows.map(r => r.dm);

    const logloss = (w1, w2, b) => {
      let s = 0;
      for (let i = 0; i < n; i++) {
        const pr = M.clamp(M.sigmoid(w1 * Z[i][0] + w2 * Z[i][1] + b), 1e-12, 1 - 1e-12);
        s -= Y[i] * Math.log(pr) + (1 - Y[i]) * Math.log(1 - pr);
      }
      return s / n;
    };

    const lr = p.lr || 0.5, epochs = Math.max(20, Math.round(p.epochs || 100));
    let w1 = 0, w2 = 0, b = 0;
    const hist = [{ epoch: 0, w1, w2, b, loss: logloss(w1, w2, b), gw1: 0, gw2: 0, gb: 0, ps: M.range(n, () => 0.5), zs: M.range(n, () => 0) }];
    for (let ep = 1; ep <= epochs; ep++) {
      let gw1 = 0, gw2 = 0, gb = 0;
      const ps = [], zs = [];
      for (let i = 0; i < n; i++) {
        const z = w1 * Z[i][0] + w2 * Z[i][1] + b;
        const pr = M.sigmoid(z);
        zs.push(z); ps.push(pr);
        const err = pr - Y[i];
        gw1 += err * Z[i][0] / n;
        gw2 += err * Z[i][1] / n;
        gb += err / n;
      }
      w1 -= lr * gw1;
      w2 -= lr * gw2;
      b -= lr * gb;
      const ps2 = [], zs2 = [];
      for (let i = 0; i < n; i++) {
        const z2 = w1 * Z[i][0] + w2 * Z[i][1] + b;
        zs2.push(z2); ps2.push(M.sigmoid(z2));
      }
      hist.push({ epoch: ep, w1, w2, b, loss: logloss(w1, w2, b), gw1, gw2, gb, ps: ps2, zs: zs2 });
    }
    const last = hist[hist.length - 1];
    const th = p.threshold || 0.5;
    let tp = 0, fp = 0, tn = 0, fn = 0;
    for (let i = 0; i < n; i++) {
      const pred = last.ps[i] >= th ? 1 : 0;
      if (pred === 1 && Y[i] === 1) tp++;
      else if (pred === 1 && Y[i] === 0) fp++;
      else if (pred === 0 && Y[i] === 0) tn++;
      else fn++;
    }
    return { mB, sB, mG, sG, Z, Y, hist, last, tp, fp, tn, fn, acc: (tp + tn) / n };
  }

  LAB.register({
    id: 'B3', group: 'B', title: 'Logistic 迴歸',
    module: { name: 'M2-2 第 04 節', url: '../m2-2/#p04' },
    goal: '看懂 Logistic 迴歸如何把線性組合 z 透過 Sigmoid 壓成機率，並用梯度下降旋轉決策邊界、調整機率門檻。',
    data: {
      name: 'clinic',
      scenario: '門診健檢：用標準化後的 BMI 與空腹血糖，預測病人是否有糖尿病',
      columns: COLS,
      editable: ['bmi', 'glu', 'dm'],
      small: makeRows
    },
    params: [
      { key: 'lr', label: '學習率 η', type: 'num', min: 0.1, max: 2, step: 0.1, value: 0.5 },
      { key: 'epochs', label: '迭代次數', type: 'int', min: 20, max: 300, step: 20, value: 100 },
      { key: 'threshold', label: '判定門檻', type: 'num', min: 0.1, max: 0.9, step: 0.05, value: 0.5 }
    ],
    pseudo: [
      '把 BMI 與空腹血糖標準化',
      '初始化 w₁ = 0, w₂ = 0, b = 0',
      '重複以下更新直到指定輪數：',
      '  算 z = w₁z₁ + w₂z₂ + b',
      '  算機率 p = sigmoid(z)',
      '  算誤差 (p − y) 與平均梯度',
      '  依學習率更新 w₁, w₂, b',
      '依門檻判定類別並看混淆矩陣'
    ],
    build(rows, p) {
      const R = train(rows, p), steps = [];
      const thLogit = Math.log(p.threshold / (1 - p.threshold));

      function boundaryLine(w1, w2, b) {
        if (Math.abs(w1) < 1e-6 && Math.abs(w2) < 1e-6) return [];
        const rhs = thLogit - b;
        if (Math.abs(w2) >= 1e-6) {
          const z1a = (AX.x.min - R.mB) / R.sB, z1b = (AX.x.max - R.mB) / R.sB;
          const gA = ((rhs - w1 * z1a) / w2) * R.sG + R.mG;
          const gB = ((rhs - w1 * z1b) / w2) * R.sG + R.mG;
          return [{ id: 'db', x1: AX.x.min, y1: gA, x2: AX.x.max, y2: gB, cls: 'hl', w: 2.5, label: 'p=' + f(p.threshold, 2) }];
        }
        const bx = (rhs / w1) * R.sB + R.mB;
        return [{ id: 'db', x1: bx, y1: AX.y.min, x2: bx, y2: AX.y.max, cls: 'hl', w: 2.5, label: 'p=' + f(p.threshold, 2) }];
      }

      function views(st) {
        const h = R.hist[st.ep];
        const points = rows.map((r, i) => {
          const isErr = st.ep > 0 && (h.ps[i] >= p.threshold ? 1 : 0) !== r.dm;
          return {
            id: 'p' + r.id, x: r.bmi, y: r.glu, cls: cls(r.dm),
            hl: st.cur === r.id, ring: isErr,
            label: String(r.id), r: (st.cur === r.id || isErr) ? 7 : 5.5
          };
        });
        const regions = st.showReg ? LAB.grid((x, y) => {
          const z1 = (x - R.mB) / R.sB, z2 = (y - R.mG) / R.sG;
          return M.sigmoid(h.w1 * z1 + h.w2 * z2 + h.b) >= p.threshold ? 'c1' : 'c0';
        }, AX.x.min, AX.x.max, AX.y.min, AX.y.max, 30, 20) : null;
        const main = {
          type: 'scatter', slot: 'main',
          title: 'BMI × 血糖與決策邊界',
          axes: AX, points, lines: st.ep > 0 ? boundaryLine(h.w1, h.w2, h.b) : [], circles: [], regions,
          legend: [{ cls: 'c1', label: '糖尿病：是' }, { cls: 'c0', label: '糖尿病：否' }, { cls: 'hl', shape: 'line', label: '決策邊界' }, { cls: 'hl', shape: 'ring', label: '誤判樣本' }]
        };
        const trs = rows.map((r, i) => ({
          id: r.id,
          cells: [r.id, h.zs[i], { v: f(h.ps[i], 3), cls: st.ep > 0 ? (h.ps[i] >= p.threshold ? 'c1' : 'c0') : null }, { v: r.dm ? '是' : '否', cls: cls(r.dm) }],
          hl: st.cur === r.id
        }));
        const side = {
          type: 'table', slot: 'side', title: '每筆預測機率（第 ' + st.ep + ' 輪）',
          cols: [{ key: 'id', label: '#' }, { key: 'z', label: 'z', num: true, digits: 2 }, { key: 'p', label: 'p', num: true, digits: 3 }, { key: 'y', label: '實際' }],
          rows: trs
        };
        const maxLoss = Math.max(1, R.hist[0].loss * 1.15);
        const line = {
          type: 'line', slot: 'bottom', title: '對數損失（Log Loss）變化',
          axes: { x: { label: 'Epoch', min: 0, max: R.hist.length - 1 }, y: { label: 'Log Loss', min: 0, max: maxLoss } },
          series: [{ id: 'll', label: 'Log Loss', pts: R.hist.slice(0, st.ep + 1).map(x => [x.epoch, x.loss]), cls: 'c1', dots: false }],
          marker: { x: st.ep, y: h.loss, label: '第 ' + st.ep + ' 輪' }
        };
        return [main, side, line];
      }

      const st = { ep: 0, cur: null, showReg: false };
      const add = (line, title, say, calc, extra) => steps.push(Object.assign({ line, title, say, calc: calc || [], views: views(st), focus: st.cur ? [st.cur] : [] }, extra));

      add(0, '題目', '用標準化後的 BMI 與空腹血糖預測糖尿病。Logistic 迴歸輸出機率 p，看決策邊界怎麼從無到有轉到合適位置。', [
        '病人共 ' + rows.length + ' 位，糖尿病陽性 ' + M.sum(R.Y) + ' 位'
      ]);

      add(2, '起始權重全為 0', '一開始 w₁ = 0, w₂ = 0, b = 0，所有人 z = 0、機率 p = sigmoid(0) = 0.500，還沒辦法區分兩群。', [
        '起始 Log Loss = ' + f(R.hist[0].loss, 3)
      ]);

      for (let ep = 1; ep <= 2; ep++) {
        const prev = R.hist[ep - 1], h = R.hist[ep];
        st.ep = ep - 1;
        for (let i = 0; i < Math.min(2, rows.length); i++) {
          st.cur = rows[i].id;
          add(5, '第 ' + ep + ' 輪：算 ' + rows[i].id + ' 號', '對 ' + rows[i].id + ' 號算 z 與機率 p，誤差 (p − y) 決定權重該往哪邊修。', [
            'z = ' + f(prev.zs[i], 3) + ' → p = ' + f(prev.ps[i], 3) + '（實際 y = ' + rows[i].dm + '）',
            '誤差 (p − y) = ' + f(prev.ps[i] - rows[i].dm, 3)
          ], { phase: '第 ' + ep + ' 輪' });
        }
        st.cur = null; st.ep = ep;
        add(7, '第 ' + ep + ' 輪更新權重', '把所有人的誤差乘上特徵取平均得到梯度，更新 w₁, w₂, b，決策邊界開始出現。', [
          '梯度 (gw₁, gw₂, gb) = (' + f(h.gw1, 3) + ', ' + f(h.gw2, 3) + ', ' + f(h.gb, 3) + ')',
          '更新後 w = (' + f(h.w1, 3) + ', ' + f(h.w2, 3) + ')，b = ' + f(h.b, 3) + '，Loss = ' + f(h.loss, 3)
        ], { phase: '第 ' + ep + ' 輪' });
      }

      const epochs = R.hist.length - 1;
      const marks = [];
      for (let k = 1; k <= 8; k++) {
        const ep = Math.max(3, Math.round(3 + (epochs - 3) * k / 8));
        if (!marks.includes(ep)) marks.push(ep);
      }
      marks.forEach((ep, idx) => {
        st.ep = ep;
        if (idx === 0) st.showReg = true;
        const h = R.hist[ep];
        add(7, '第 ' + ep + ' 輪', idx === 0 ? '之後每段固定輪數顯示一次快照，觀察決策邊界慢慢轉正並推開兩群。' : '權重持續調整，Log Loss 穩定下降，圖上黃圈為目前誤判的病人。', [
          'w₁ = ' + f(h.w1, 3) + '，w₂ = ' + f(h.w2, 3) + '，b = ' + f(h.b, 3),
          'Log Loss = ' + f(h.loss, 3)
        ], { phase: ep + ' / ' + epochs });
      });

      st.ep = epochs; st.showReg = true;
      add(8, '勝算比與混淆矩陣', '依門檻 p ≥ ' + f(p.threshold, 2) + ' 判定，得出混淆矩陣；exp(w) 就是該特徵每增加 1 個標準差時的勝算比。', [
        'OR(BMI) = ' + f(Math.exp(R.last.w1), 2) + '｜OR(血糖) = ' + f(Math.exp(R.last.w2), 2),
        'TP=' + R.tp + ' FP=' + R.fp + ' TN=' + R.tn + ' FN=' + R.fn + '（準確率 ' + LAB.pct(R.acc, 1) + '）'
      ]);
      return steps;
    },

    keys(steps, rows, p) {
      const R = train(rows, p);
      return {
        mean_bmi: R.mB, sd_bmi: R.sB, mean_glu: R.mG, sd_glu: R.sG,
        g1_w1: R.hist[1].gw1, g1_w2: R.hist[1].gw2, g1_b: R.hist[1].gb,
        w1_1: R.hist[1].w1, w2_1: R.hist[1].w2, b_1: R.hist[1].b, loss_1: R.hist[1].loss,
        g2_w1: R.hist[2].gw1, g2_w2: R.hist[2].gw2, g2_b: R.hist[2].gb,
        w1_2: R.hist[2].w1, w2_2: R.hist[2].w2, b_2: R.hist[2].b, loss_2: R.hist[2].loss,
        w1_final: R.last.w1, w2_final: R.last.w2, b_final: R.last.b, loss_final: R.last.loss,
        tp: R.tp, fp: R.fp, tn: R.tn, fn: R.fn, acc: R.acc
      };
    },

    explain(steps, rows, p) {
      const R = train(rows, p);
      return [
        '經 ' + p.epochs + ' 輪批次梯度下降（學習率 ' + f(p.lr, 1) + '），標準化係數收斂到 w₁(BMI) = ' + f(R.last.w1, 3) + '、w₂(血糖) = ' + f(R.last.w2, 3) + '、截距 b = ' + f(R.last.b, 3) + '。',
        '換算勝算比：BMI 每增加 1 個標準差，糖尿病勝算變為 ' + f(Math.exp(R.last.w1), 2) + ' 倍；血糖每增加 1 個標準差變為 ' + f(Math.exp(R.last.w2), 2) + ' 倍。',
        '以門檻 ' + f(p.threshold, 2) + ' 判定時，TP=' + R.tp + '、FP=' + R.fp + '、TN=' + R.tn + '、FN=' + R.fn + '，準確率 ' + LAB.pct(R.acc, 1) + '。',
        '注意：若資料完全線性可分且不加正則化，係數會一直放大；真實套件（如 scikit-learn 預設 L2）會透過正則化或收斂門檻停下來。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Set Role', 'Normalize', 'Logistic Regression'],
      params: [
        ['Set Role › dm', 'label'],
        ['Normalize › method', 'Z-transformation'],
        ['Logistic Regression › standardize / regularization', '需實機確認預設 solver 與正則化參數']
      ],
      note: 'AI Studio 的 Logistic Regression 預設會做收斂到極值的最佳化（且可能含正則化），而本實驗示範固定輪數的批次梯度下降，兩者係數方向一致但數值幅度會隨輪數不同。',
      expect: (steps, rows, p) => {
        const R = train(rows, p);
        return [
          'BMI 與血糖係數皆為正方向（較高者糖尿病機率較高）',
          '訓練準確率約 ' + LAB.pct(R.acc, 1)
        ];
      },
      python: `from sklearn.preprocessing import StandardScaler\nfrom sklearn.linear_model import LogisticRegression\nZ = StandardScaler().fit_transform(X)\nclf = LogisticRegression(penalty=None).fit(Z, y)`,
      confirmed: false
    }
  });
})();
