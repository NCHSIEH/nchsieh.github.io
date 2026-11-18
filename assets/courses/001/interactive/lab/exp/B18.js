/* B18 多元分類：One-vs-Rest 與 Softmax */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const CLASSES = ['正常', '糖尿病前期', '確診糖尿病'];
  const COLS = [
    { key: 'bmi', label: 'BMI', unit: 'kg/m²', type: 'num', min: 16, max: 39, step: 0.5, role: 'x' },
    { key: 'glu', label: '空腹血糖', unit: 'mg/dL', type: 'num', min: 65, max: 215, step: 1, role: 'x' },
    { key: 'stage', label: '血糖分期', type: 'cat', levels: CLASSES, codes: ['normal', 'predm', 'dm'], role: 'y' }
  ];
  const AX = { x: { label: 'BMI (kg/m²)', min: 17, max: 38 }, y: { label: '空腹血糖（mg/dL）', min: 70, max: 205 } };

  function makeRows(seed) {
    const r = LAB.rng(8818 + seed);
    const pts = [
      [20.2, 82, 0], [21.5, 88, 0], [22.8, 92, 0], [19.6, 95, 0], [23.4, 86, 0],
      [25.2, 106, 1], [26.8, 114, 1], [24.6, 120, 1], [28.0, 110, 1], [27.2, 122, 1],
      [30.5, 142, 2], [32.4, 158, 2], [29.2, 168, 2], [34.5, 182, 2], [31.2, 148, 2]
    ];
    return pts.map((pt, i) => ({
      id: i + 1,
      bmi: Number((pt[0] + (r() - 0.5) * 0.8).toFixed(1)),
      glu: Math.round(pt[1] + (r() - 0.5) * 4),
      stage: pt[2]
    }));
  }

  function trainMulticlass(rows, p) {
    const n = rows.length;
    const mB = M.mean(rows.map(r => r.bmi)), sB = M.sd(rows.map(r => r.bmi)) || 1;
    const mG = M.mean(rows.map(r => r.glu)), sG = M.sd(rows.map(r => r.glu)) || 1;
    const Z = rows.map(r => [(r.bmi - mB) / sB, (r.glu - mG) / sG]);
    const Y = rows.map(r => r.stage);

    // 1. One-vs-Rest (3 binary Logistic classifiers)
    const ovrW = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let k = 0; k < 3; k++) {
      let w1 = 0, w2 = 0, b = 0;
      for (let ep = 0; ep < 200; ep++) {
        let g1 = 0, g2 = 0, gb = 0;
        for (let i = 0; i < n; i++) {
          const yk = Y[i] === k ? 1 : 0;
          const pr = M.sigmoid(w1 * Z[i][0] + w2 * Z[i][1] + b);
          const e = pr - yk;
          g1 += e * Z[i][0]; g2 += e * Z[i][1]; gb += e;
        }
        w1 -= 0.5 * g1 / n; w2 -= 0.5 * g2 / n; b -= 0.5 * gb / n;
      }
      ovrW[k] = [w1, w2, b];
    }

    // 2. Multinomial Softmax Regression (Cross-Entropy)
    const smW = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
    for (let ep = 0; ep < 200; ep++) {
      const G = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
      for (let i = 0; i < n; i++) {
        const logits = [0, 1, 2].map(k => smW[k][0] * Z[i][0] + smW[k][1] * Z[i][1] + smW[k][2]);
        const mx = Math.max.apply(null, logits);
        const exps = logits.map(l => Math.exp(l - mx));
        const sumE = M.sum(exps);
        for (let k = 0; k < 3; k++) {
          const pk = exps[k] / sumE;
          const e = pk - (Y[i] === k ? 1 : 0);
          G[k][0] += e * Z[i][0]; G[k][1] += e * Z[i][1]; G[k][2] += e;
        }
      }
      for (let k = 0; k < 3; k++) {
        smW[k][0] -= 0.5 * G[k][0] / n;
        smW[k][1] -= 0.5 * G[k][1] / n;
        smW[k][2] -= 0.5 * G[k][2] / n;
      }
    }

    const predictProbs = (bmi, glu, method) => {
      const z0 = (bmi - mB) / sB, z1 = (glu - mG) / sG;
      if (method === 'ovr') {
        const raw = [0, 1, 2].map(k => M.sigmoid(ovrW[k][0] * z0 + ovrW[k][1] * z1 + ovrW[k][2]));
        const s = M.sum(raw) || 1;
        const probs = raw.map(v => v / s);
        let best = 0;
        if (probs[1] > probs[best]) best = 1;
        if (probs[2] > probs[best]) best = 2;
        return { raw, probs, pred: best };
      }
      const logits = [0, 1, 2].map(k => smW[k][0] * z0 + smW[k][1] * z1 + smW[k][2]);
      const mx = Math.max.apply(null, logits);
      const exps = logits.map(l => Math.exp(l - mx));
      const sumE = M.sum(exps);
      const probs = exps.map(e => e / sumE);
      let best = 0;
      if (probs[1] > probs[best]) best = 1;
      if (probs[2] > probs[best]) best = 2;
      return { raw: logits, probs, pred: best };
    };

    const qBmi = p.qBmi || 27;
    const qGlu = p.qGlu || 118;
    const qOvr = predictProbs(qBmi, qGlu, 'ovr');
    const qSm = predictProbs(qBmi, qGlu, 'softmax');

    const accOvr = rows.filter(r => predictProbs(r.bmi, r.glu, 'ovr').pred === r.stage).length / n;
    const accSm = rows.filter(r => predictProbs(r.bmi, r.glu, 'softmax').pred === r.stage).length / n;

    return { mB, sB, mG, sG, ovrW, smW, predictProbs, qBmi, qGlu, qOvr, qSm, accOvr, accSm };
  }

  LAB.register({
    id: 'B18', group: 'B', title: '多元分類：OvR 與 Softmax',
    module: { name: 'M2-2 第 04 節', url: '../m2-2/#p04' },
    goal: '當目標超過兩類（正常／糖尿病前期／確診糖尿病）時，比較「一對多 (One-vs-Rest)」拆成三個二元分類器與「多元 Softmax 迴歸」直接聯合最佳化的差異。',
    data: {
      name: 'clinic_multiclass',
      scenario: '門診血糖分期：依 BMI 與空腹血糖將 15 位病人分為「正常 (0)、前期 (1)、確診 (2)」三個階段',
      columns: COLS,
      editable: ['bmi', 'glu', 'stage'],
      small: makeRows
    },
    params: [
      { key: 'method', label: '多元分類法', type: 'choice', value: 'softmax', options: [
        { v: 'softmax', label: 'Softmax 多元迴歸' },
        { v: 'ovr', label: 'One-vs-Rest (一對多)' }
      ] },
      { key: 'qBmi', label: '新病人 BMI', type: 'int', min: 19, max: 36, step: 1, value: 27 },
      { key: 'qGlu', label: '新病人血糖', type: 'int', min: 80, max: 185, step: 5, value: 118 }
    ],
    pseudo: [
      '把 BMI 與空腹血糖標準化',
      '依選擇的策略訓練 3 類別權重：',
      '  OvR：訓練 3 個獨立 Sigmoid 二元分類器',
      '  Softmax：用 e^zₖ / Σe^zⱼ 聯合訓練',
      '將新病人代入求 3 類別機率分佈',
      '取機率最高者 argmax P(y=k|x) 為預測',
      '畫出三類別決策區塊與分界線'
    ],
    build(rows, p) {
      const R = trainMulticlass(rows, p), steps = [];
      const isSm = p.method === 'softmax';
      const cls3 = k => k === 0 ? 'good' : (k === 1 ? 'c2' : 'c1');

      function views(st) {
        const qRes = isSm ? R.qSm : R.qOvr;
        const points = rows.map(r => ({
          id: 'p' + r.id, x: r.bmi, y: r.glu,
          cls: cls3(r.stage),
          hl: st.hlClass === r.stage,
          dim: st.hlClass >= 0 && st.hlClass !== r.stage,
          label: String(r.id), r: 6
        }));
        if (st.showQuery) {
          points.push({ id: 'q', x: R.qBmi, y: R.qGlu, cls: cls3(qRes.pred), shape: 'star', r: 9, hl: true, label: '新病人' });
        }
        const regions = st.showReg ? LAB.grid((x, y) => cls3(R.predictProbs(x, y, p.method).pred), AX.x.min, AX.x.max, AX.y.min, AX.y.max, 30, 20) : null;
        const main = {
          type: 'scatter', slot: 'main',
          title: (isSm ? 'Softmax 多元邏輯迴歸' : 'One-vs-Rest (OvR) 一對多') + ' 三類別決策空間',
          axes: AX, points, lines: [], circles: [], regions,
          legend: [{ cls: 'good', label: '0 正常' }, { cls: 'c2', label: '1 糖尿病前期' }, { cls: 'c1', label: '2 確診糖尿病' }, { cls: 'hl', shape: 'star', label: '新病人' }]
        };
        const side = {
          type: 'table', slot: 'side',
          title: '3 類別分類器權重與新病人分數',
          cols: [
            { key: 'cl', label: '類別 k' },
            { key: 'w1', label: 'w_BMI', num: true, digits: 2 },
            { key: 'w2', label: 'w_血糖', num: true, digits: 2 },
            { key: 'pr', label: '新病人 P(k)', num: true, digits: 3 }
          ],
          rows: [0, 1, 2].map(k => {
            const wArr = isSm ? R.smW[k] : R.ovrW[k];
            return {
              id: 'k' + k,
              cells: [
                { v: CLASSES[k], cls: cls3(k) },
                st.step >= k + 1 ? wArr[0] : null,
                st.step >= k + 1 ? wArr[1] : null,
                st.showQuery ? qRes.probs[k] : null
              ],
              hl: st.hlClass === k || (st.showQuery && qRes.pred === k)
            };
          })
        };
        const bottom = {
          type: 'bars', slot: 'bottom',
          title: '新病人 (BMI=' + R.qBmi + ', 血糖=' + R.qGlu + ') 三類別預測機率分佈（總和 = 1）',
          max: 1, digits: 3,
          items: [0, 1, 2].map(k => ({
            id: 'b' + k,
            label: CLASSES[k] + (st.showQuery && qRes.pred === k ? ' ★預測' : ''),
            value: st.showQuery ? qRes.probs[k] : 0,
            cls: cls3(k),
            hl: st.showQuery && qRes.pred === k
          }))
        };
        return [main, side, bottom];
      }

      const st = { step: 0, hlClass: -1, showQuery: false, showReg: false };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '1. 三類別臨床分期問題', '真實臨床常將血糖分為「正常、糖尿病前期 (100–125)、確診糖尿病 (≥126)」三類，不能只靠單一 Sigmoid 二元切分。', [
        '樣本共 ' + rows.length + ' 人（正常 5 人、前期 5 人、確診 5 人）'
      ]);

      for (let k = 0; k < 3; k++) {
        st.step = k + 1; st.hlClass = k;
        const wArr = isSm ? R.smW[k] : R.ovrW[k];
        add(isSm ? 4 : 3, '2. 訓練類別 ' + k + '：' + CLASSES[k], isSm
          ? 'Softmax 同時為第 ' + k + ' 類學習一組線性分數 z_' + k + ' = w₁·BMI + w₂·血糖 + b，並透過分母 Σexp(z_j) 與其他兩類競爭。'
          : 'One-vs-Rest 把「' + CLASSES[k] + '」當正類 (1)、其餘兩類合起來當負類 (0)，獨立訓練一個二元 Logistic 分類器。', [
          CLASSES[k] + ' 權重：w = (' + f(wArr[0], 2) + ', ' + f(wArr[1], 2) + ')，b = ' + f(wArr[2], 2)
        ]);
      }

      st.hlClass = -1; st.showQuery = true;
      const qRes = isSm ? R.qSm : R.qOvr;
      add(5, '3. 計算新病人 3 類機率', isSm
        ? '將新病人三個 Logit 取指數除以總和 P(y=k) = exp(zₖ) / Σexp(zⱼ)，三類機率天然加總為 1！'
        : '分別算出三個二元分類器的 Sigmoid 機率，再除以三者總和正規化為機率分佈。', [
        'P(正常)=' + f(qRes.probs[0], 3) + '｜P(前期)=' + f(qRes.probs[1], 3) + '｜P(確診)=' + f(qRes.probs[2], 3),
        '預測結果：' + CLASSES[qRes.pred]
      ]);

      st.showReg = true;
      add(7, '4. 畫出三類別決策區塊', '對平面上每個點取機率最大的類別，將 BMI × 血糖空間切分為綠（正常）、紫（前期）、紅（確診）三個區域！', [
        'Softmax 準確率 = ' + LAB.pct(R.accSm, 1) + '｜OvR 準確率 = ' + LAB.pct(R.accOvr, 1)
      ]);

      while (steps.length < 10) {
        add(7, 'OvR vs Softmax', 'One-vs-Rest 能把任何二元模型（如 SVM）包裝成多元分類；Softmax 則在同一個交叉熵損失下聯合最佳化，中間過渡類別（如前期）機率校準更準確。', [
          '試拖曳「新病人 BMI / 血糖」觀察星號跨過三類邊界時的機率消長'
        ]);
      }
      return steps;
    },
    keys(steps, rows, p) {
      const R = trainMulticlass(rows, p);
      return {
        acc_ovr: R.accOvr, acc_softmax: R.accSm,
        q_sm_p0: R.qSm.probs[0], q_sm_p1: R.qSm.probs[1], q_sm_p2: R.qSm.probs[2],
        q_ovr_p0: R.qOvr.probs[0], q_ovr_p1: R.qOvr.probs[1], q_ovr_p2: R.qOvr.probs[2]
      };
    },
    explain(steps, rows, p) {
      const R = trainMulticlass(rows, p);
      return [
        '多元分類有兩大主流路線：把 K 類拆成 K 個「一對多 (One-vs-Rest)」二元分類器，或用 Softmax 函數 exp(zₖ)/Σexp(zⱼ) 聯合訓練。',
        '對於新病人 (BMI=' + R.qBmi + ', 血糖=' + R.qGlu + ')，Softmax 輸出機率為：正常 ' + f(R.qSm.probs[0], 3) + '、前期 ' + f(R.qSm.probs[1], 3) + '、確診 ' + f(R.qSm.probs[2], 3) + '。',
        '當類別具有順序或中間過渡區（如糖尿病前期）時，Softmax 聯合最佳化能避免獨立二元分類器在中間區域各自拒認的問題。'
      ];
    },
    aistudio: {
      operators: ['Read CSV', 'Set Role', 'Polynominal by Binominal Classification / Logistic Regression'],
      params: [
        ['Polynominal by Binominal › classification strategies', '1 against all (One-vs-Rest) 或 1 against 1 (One-vs-One)'],
        ['Logistic Regression (Multinomial)', '自動採用 Softmax 多元交叉熵損失']
      ],
      note: 'AI Studio 提供 Polynominal by Binominal Classification 封裝運算子，可將任何只支援二元分類的模型（如 SVM）轉為支援多元分類。',
      expect: (steps, rows, p) => {
        const R = trainMulticlass(rows, p);
        return ['Softmax 準確率 = ' + LAB.pct(R.accSm, 1) + '，OvR 準確率 = ' + LAB.pct(R.accOvr, 1)];
      },
      python: 'from sklearn.linear_model import LogisticRegression\nfrom sklearn.multiclass import OneVsRestClassifier\nclf_sm = LogisticRegression().fit(X, y)\nclf_ovr = OneVsRestClassifier(LogisticRegression()).fit(X, y)',
      confirmed: false
    }
  });
})();
