/* B5 Naive Bayes */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = [
    { key: 'age_hi', label: '年齡 ≥ 55', type: 'cat', levels: ['正常', '高'], codes: ['normal', 'high'], role: 'x' },
    { key: 'bmi_hi', label: 'BMI ≥ 26', type: 'cat', levels: ['正常', '高'], codes: ['normal', 'high'], role: 'x' },
    { key: 'glu_hi', label: '血糖 ≥ 110', type: 'cat', levels: ['正常', '高'], codes: ['normal', 'high'], role: 'x' },
    { key: 'dm', label: '糖尿病', type: 'cat', levels: ['否', '是'], codes: ['no', 'yes'], role: 'y' }
  ];
  const FEATS = [
    { key: 'age_hi', name: '年齡 ≥ 55', qKey: 'qAgeHigh' },
    { key: 'bmi_hi', name: 'BMI ≥ 26', qKey: 'qBmiHigh' },
    { key: 'glu_hi', name: '血糖 ≥ 110', qKey: 'qGluHigh' }
  ];

  function toDiscrete(seed) {
    return LAB.data.clinic(seed, 14).map(r => ({
      id: r.id,
      age_hi: r.age >= 55 ? 1 : 0,
      bmi_hi: r.bmi >= 26 ? 1 : 0,
      glu_hi: r.glu >= 110 ? 1 : 0,
      dm: r.dm
    }));
  }

  function runNB(rows, p) {
    const n = rows.length;
    const nYes = rows.filter(r => r.dm === 1).length;
    const nNo = n - nYes;
    const priorYes = nYes / n, priorNo = nNo / n;
    const alpha = p.laplace || 0;

    const cond = FEATS.map(ft => {
      const c11 = rows.filter(r => r.dm === 1 && r[ft.key] === 1).length;
      const c10 = nYes - c11;
      const c01 = rows.filter(r => r.dm === 0 && r[ft.key] === 1).length;
      const c00 = nNo - c01;
      const p11 = (c11 + alpha) / (nYes + 2 * alpha);
      const p10 = (c10 + alpha) / (nYes + 2 * alpha);
      const p01 = (c01 + alpha) / (nNo + 2 * alpha);
      const p00 = (c00 + alpha) / (nNo + 2 * alpha);
      const qVal = p[ft.qKey] ? 1 : 0;
      return {
        key: ft.key, name: ft.name, qVal,
        c11, c10, c01, c00,
        p11, p10, p01, p00,
        qYes: qVal ? p11 : p10,
        qNo: qVal ? p01 : p00
      };
    });

    let scoreYes = priorYes, scoreNo = priorNo;
    cond.forEach(c => { scoreYes *= c.qYes; scoreNo *= c.qNo; });
    const denom = scoreYes + scoreNo;
    const postYes = denom > 0 ? scoreYes / denom : 0.5;
    const postNo = denom > 0 ? scoreNo / denom : 0.5;
    const pred = postYes > postNo ? 1 : 0;

    return { n, nYes, nNo, priorYes, priorNo, alpha, cond, scoreYes, scoreNo, postYes, postNo, pred };
  }

  LAB.register({
    id: 'B5', group: 'B', title: 'Naive Bayes',
    module: { name: 'M2-2 第 05 節', url: '../m2-2/#p05' },
    goal: '看懂 Naive Bayes 如何從先驗機率與各特徵條件機率（含 Laplace 平滑）連乘並正規化，得出後驗機率。',
    data: {
      name: 'clinic_nb',
      scenario: '門診健檢：將年齡、BMI、血糖二分成「高／正常」，預測新病人是否有糖尿病',
      columns: COLS,
      small: seed => toDiscrete(seed)
    },
    params: [
      { key: 'laplace', label: 'Laplace 平滑 α', type: 'int', min: 0, max: 2, step: 1, value: 1 },
      { key: 'qAgeHigh', label: '年齡 ≥ 55', group: '新病人', type: 'bool', value: true },
      { key: 'qBmiHigh', label: 'BMI ≥ 26', group: '新病人', type: 'bool', value: true },
      { key: 'qGluHigh', label: '血糖 ≥ 110', group: '新病人', type: 'bool', value: false }
    ],
    pseudo: [
      '計算先驗機率 P(是) 與 P(否)',
      '對每個特徵與每個類別：',
      '  統計該特徵值的出現次數',
      '  套用 Laplace 平滑算條件機率',
      '依新病人的三個特徵取對應機率',
      '兩類別各自連乘得未正規化分數',
      '正規化成後驗機率並決定類別'
    ],
    build(rows, p) {
      const R = runNB(rows, p), steps = [];

      function views(st) {
        const trs = R.cond.map((c, idx) => {
          const filled = idx < st.filledCond;
          const isCur = st.curIdx === idx;
          const useHigh = c.qVal === 1;
          return {
            id: c.key,
            cells: [
              c.name,
              filled ? { v: f(c.p11, 3), cls: st.pick && useHigh ? 'c1' : null, hl: isCur || (st.pick && useHigh) } : null,
              filled ? { v: f(c.p10, 3), cls: st.pick && !useHigh ? 'c1' : null, hl: isCur || (st.pick && !useHigh) } : null,
              filled ? { v: f(c.p01, 3), cls: st.pick && useHigh ? 'c0' : null, hl: isCur || (st.pick && useHigh) } : null,
              filled ? { v: f(c.p00, 3), cls: st.pick && !useHigh ? 'c0' : null, hl: isCur || (st.pick && !useHigh) } : null
            ],
            hl: isCur
          };
        });
        const main = {
          type: 'table', slot: 'main',
          title: '條件機率表（α = ' + R.alpha + '）',
          cols: [
            { key: 'feat', label: '特徵' },
            { key: 'p11', label: 'P(高|是)', num: true },
            { key: 'p10', label: 'P(正常|是)', num: true },
            { key: 'p01', label: 'P(高|否)', num: true },
            { key: 'p00', label: 'P(正常|否)', num: true }
          ],
          rows: trs
        };
        const side = {
          type: 'bars', slot: 'side',
          title: st.norm ? '後驗機率 P(類別 | 新病人)' : '未正規化連乘分數',
          max: st.norm ? 1 : Math.max(0.05, R.priorYes, R.priorNo),
          digits: 3,
          items: [
            { id: 'yes', label: '糖尿病：是', value: st.norm ? R.postYes : (st.mult ? R.scoreYes : st.prior ? R.priorYes : 0), cls: 'c1', hl: st.norm && R.pred === 1 },
            { id: 'no', label: '糖尿病：否', value: st.norm ? R.postNo : (st.mult ? R.scoreNo : st.prior ? R.priorNo : 0), cls: 'c0', hl: st.norm && R.pred === 0 }
          ]
        };
        const tokens = {
          type: 'tokens', slot: 'bottom',
          title: '新病人特徵值',
          items: R.cond.map((c, idx) => ({
            id: c.key,
            text: c.name + '：' + (c.qVal ? '高' : '正常'),
            cls: st.curIdx === idx || st.pick ? (c.qVal ? 'c1' : 'c0') : 'c5',
            hl: st.curIdx === idx
          }))
        };
        return [main, side, tokens];
      }

      const st = { prior: false, filledCond: 0, curIdx: -1, pick: false, mult: false, norm: false };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '題目', '14 位門診病人的年齡、BMI、血糖已二分成「高／正常」。來了一位新病人，用 Naive Bayes 算他有糖尿病的機率。', [
        '新病人：' + R.cond.map(c => c.name + '=' + (c.qVal ? '高' : '正常')).join('，')
      ]);

      st.prior = true;
      add(1, '計算先驗機率', '先不看任何特徵，單看 14 位病人中有幾位是糖尿病。', [
        'P(是) = ' + R.nYes + ' ÷ ' + R.n + ' = ' + f(R.priorYes, 3),
        'P(否) = ' + R.nNo + ' ÷ ' + R.n + ' = ' + f(R.priorNo, 3)
      ]);

      R.cond.forEach((c, idx) => {
        st.curIdx = idx;
        add(3, '統計：' + c.name, '分別在「是」與「否」兩組中，數出 ' + c.name + ' 為高與正常的次數。', [
          '是組(' + R.nYes + '人)：高 ' + c.c11 + ' 次、正常 ' + c.c10 + ' 次',
          '否組(' + R.nNo + '人)：高 ' + c.c01 + ' 次、正常 ' + c.c00 + ' 次'
        ]);
        st.filledCond = idx + 1;
        add(4, '平滑機率：' + c.name, '套用 Laplace 平滑（分子 + α、分母 + 2α），避免某項出現 0 次讓整個乘積歸零。', [
          'P(高|是)=(' + c.c11 + '+' + R.alpha + ')÷(' + R.nYes + '+' + (2 * R.alpha) + ')=' + f(c.p11, 3) + '；P(正常|是)=' + f(c.p10, 3),
          'P(高|否)=(' + c.c01 + '+' + R.alpha + ')÷(' + R.nNo + '+' + (2 * R.alpha) + ')=' + f(c.p01, 3) + '；P(正常|否)=' + f(c.p00, 3)
        ]);
      });

      st.curIdx = -1; st.pick = true;
      add(5, '查表對應新病人', '依新病人的三個特徵值，從表格挑出對應的條件機率（已標亮）。', [
        '是組：' + R.cond.map(c => f(c.qYes, 3)).join(' × '),
        '否組：' + R.cond.map(c => f(c.qNo, 3)).join(' × ')
      ]);

      st.mult = true;
      add(6, '連乘未正規化分數', '假設各特徵條件獨立，把先驗機率與三個條件機率直接相乘。', [
        'S(是) = ' + f(R.priorYes, 3) + ' × ' + R.cond.map(c => f(c.qYes, 3)).join(' × ') + ' = ' + f(R.scoreYes, 4),
        'S(否) = ' + f(R.priorNo, 3) + ' × ' + R.cond.map(c => f(c.qNo, 3)).join(' × ') + ' = ' + f(R.scoreNo, 4)
      ]);

      st.norm = true;
      add(7, '正規化與預測結果', '把兩邊分數除以總和，得到總和為 1 的後驗機率，取較大者作為預測。', [
        'P(是|x) = ' + f(R.scoreYes, 4) + ' ÷ ' + f(R.scoreYes + R.scoreNo, 4) + ' = ' + f(R.postYes, 3),
        'P(否|x) = ' + f(R.postNo, 3) + ' → 預測「' + (R.pred ? '有' : '沒有') + '糖尿病」'
      ]);
      return steps;
    },

    keys(steps, rows, p) {
      const R = runNB(rows, p);
      const k = {
        prior_yes: R.priorYes, prior_no: R.priorNo,
        score_yes: R.scoreYes, score_no: R.scoreNo,
        post_yes: R.postYes, post_no: R.postNo,
        pred: R.pred
      };
      R.cond.forEach(c => {
        k['p_' + c.key + '_hi_yes'] = c.p11;
        k['p_' + c.key + '_lo_yes'] = c.p10;
        k['p_' + c.key + '_hi_no'] = c.p01;
        k['p_' + c.key + '_lo_no'] = c.p00;
      });
      return k;
    },

    explain(steps, rows, p) {
      const R = runNB(rows, p);
      return [
        '14 位病人中糖尿病先驗機率 P(是) = ' + f(R.priorYes, 3) + '、P(否) = ' + f(R.priorNo, 3) + '。',
        '套用 Laplace 平滑 α = ' + R.alpha + ' 後，連乘新病人三個特徵的條件機率，得到未正規化分數 S(是) = ' + f(R.scoreYes, 4) + '、S(否) = ' + f(R.scoreNo, 4) + '。',
        '正規化後後驗機率 P(是|x) = ' + f(R.postYes, 3) + '，因此預測新病人「' + (R.pred ? '有' : '沒有') + '糖尿病」。',
        '若設 α = 0 且某特徵組合在訓練資料沒出現過，該條件機率為 0 會直接讓整條連乘歸零；這就是 Laplace 平滑的意義。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Set Role', 'Naive Bayes'],
      params: [
        ['Set Role › dm', 'label'],
        ['Naive Bayes › laplace correction', p => p.laplace > 0 ? 'true' : 'false']
      ],
      note: 'AI Studio 的 Naive Bayes 只有「laplace correction」勾選開關（沒有連續調整 α=0/1/2 的欄位），且實際平滑公式與 scikit-learn CategoricalNB(alpha=1) 需實機對照確認。',
      expect: (steps, rows, p) => {
        const R = runNB(rows, p);
        return [
          '新病人預測類別：' + (R.pred ? 'yes' : 'no'),
          'confidence(yes) = ' + f(R.postYes, 3)
        ];
      },
      python: `from sklearn.naive_bayes import CategoricalNB\nnb = CategoricalNB(alpha=1, fit_prior=True).fit(X_cat, y)\nprint(nb.predict_proba(q_cat))`,
      confirmed: false
    }
  });
})();
