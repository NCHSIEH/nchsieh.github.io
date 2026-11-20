/* B17 高斯貝氏與線性判別 LDA */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = LAB.data.columns('clinic', ['bmi', 'glu', 'dm'], { dm: 'y' });
  const AX = { x: { label: 'BMI (kg/m²)', min: 15, max: 40 }, y: { label: '空腹血糖（mg/dL）', min: 60, max: 220 } };
  const pick = r => ({ id: r.id, bmi: r.bmi, glu: r.glu, dm: r.dm });
  const cls = y => y ? 'c1' : 'c0';

  function fitModels(rows, p) {
    const n = rows.length;
    const g0 = rows.filter(r => r.dm === 0);
    const g1 = rows.filter(r => r.dm === 1);
    const p0 = g0.length / n, p1 = g1.length / n;

    const m0 = [M.mean(g0.map(r => r.bmi)), M.mean(g0.map(r => r.glu))];
    const m1 = [M.mean(g1.map(r => r.bmi)), M.mean(g1.map(r => r.glu))];
    const v0 = [M.sd(g0.map(r => r.bmi)) ** 2 || 1, M.sd(g0.map(r => r.glu)) ** 2 || 1];
    const v1 = [M.sd(g1.map(r => r.bmi)) ** 2 || 1, M.sd(g1.map(r => r.glu)) ** 2 || 1];

    // Gaussian NB log-likelihood
    const gnbProb = (bmi, glu) => {
      const ll0 = Math.log(p0)
        - 0.5 * (Math.log(2 * Math.PI * v0[0]) + ((bmi - m0[0]) ** 2) / v0[0])
        - 0.5 * (Math.log(2 * Math.PI * v0[1]) + ((glu - m0[1]) ** 2) / v0[1]);
      const ll1 = Math.log(p1)
        - 0.5 * (Math.log(2 * Math.PI * v1[0]) + ((bmi - m1[0]) ** 2) / v1[0])
        - 0.5 * (Math.log(2 * Math.PI * v1[1]) + ((glu - m1[1]) ** 2) / v1[1]);
      return M.sigmoid(ll1 - ll0);
    };

    // Pooled covariance matrix for LDA (divided by n - 2)
    let s00 = 0, s01 = 0, s11 = 0;
    g0.forEach(r => {
      const dx = r.bmi - m0[0], dy = r.glu - m0[1];
      s00 += dx * dx; s01 += dx * dy; s11 += dy * dy;
    });
    g1.forEach(r => {
      const dx = r.bmi - m1[0], dy = r.glu - m1[1];
      s00 += dx * dx; s01 += dx * dy; s11 += dy * dy;
    });
    const dof = Math.max(1, n - 2);
    s00 /= dof; s01 /= dof; s11 /= dof;
    const det = s00 * s11 - s01 * s01 || 1e-6;
    const inv00 = s11 / det, inv01 = -s01 / det, inv11 = s00 / det;

    const dm0 = m1[0] - m0[0], dm1 = m1[1] - m0[1];
    const w0 = inv00 * dm0 + inv01 * dm1;
    const w1 = inv01 * dm0 + inv11 * dm1;
    const mid0 = 0.5 * (m1[0] + m0[0]), mid1 = 0.5 * (m1[1] + m0[1]);
    const bLda = -(w0 * mid0 + w1 * mid1) + Math.log(p1 / p0);

    const ldaProb = (bmi, glu) => M.sigmoid(w0 * bmi + w1 * glu + bLda);

    const qBmi = p.qBmi || 27;
    const qGlu = p.qGlu || 128;
    const qGnb = gnbProb(qBmi, qGlu);
    const qLda = ldaProb(qBmi, qGlu);

    const accGnb = rows.filter(r => (gnbProb(r.bmi, r.glu) >= 0.5 ? 1 : 0) === r.dm).length / n;
    const accLda = rows.filter(r => (ldaProb(r.bmi, r.glu) >= 0.5 ? 1 : 0) === r.dm).length / n;

    return {
      p0, p1, m0, m1, v0, v1, s00, s01, s11, w0, w1, bLda,
      gnbProb, ldaProb, qBmi, qGlu, qGnb, qLda, accGnb, accLda
    };
  }

  LAB.register({
    id: 'B17', group: 'B', title: '高斯貝氏與線性判別 LDA',
    module: { name: 'M2-2 第 05 節', url: '../m2-2/#p05' },
    goal: '把單純貝氏推廣到連續數值特徵（Gaussian NB），並對照費雪線性判別分析（Fisher LDA）如何共用共變異數矩陣 Σ 求出直線決策邊界。',
    data: {
      name: 'clinic_lda',
      scenario: '門診健檢：以連續的 BMI 與空腹血糖建立雙類別常態分布模型，比較獨立變異與共用共變異',
      columns: COLS,
      editable: ['bmi', 'glu', 'dm'],
      small: seed => LAB.data.clinic(seed, 14).map(pick)
    },
    params: [
      { key: 'method', label: '生成式模型', type: 'choice', value: 'lda', options: [
        { v: 'gnb', label: '高斯貝氏 (Gaussian NB)' },
        { v: 'lda', label: '線性判別 (Fisher LDA)' }
      ] },
      { key: 'qBmi', label: '新病人 BMI', type: 'int', min: 18, max: 36, step: 1, value: 27 },
      { key: 'qGlu', label: '新病人血糖', type: 'int', min: 80, max: 190, step: 5, value: 125 }
    ],
    pseudo: [
      '估算兩類別先驗機率 P(y=0), P(y=1)',
      '計算兩群各自的平均值向量 μ₀, μ₁',
      '依選擇的模型估計變異結構：',
      '  Gaussian NB：各特徵獨立算變異數',
      '  LDA：兩群共用共變異數矩陣 Σ',
      '計算新病人的後驗機率 P(y=1 | x)',
      '畫出二次曲線 (GNB) 或直線 (LDA) 邊界'
    ],
    build(rows, p) {
      const R = fitModels(rows, p), steps = [];
      const isLda = p.method === 'lda';

      function views(st) {
        const points = rows.map(r => ({
          id: 'p' + r.id, x: r.bmi, y: r.glu, cls: cls(r.dm), label: String(r.id), r: 5.5
        }));
        if (st.showCenters) {
          points.push({ id: 'c0', x: R.m0[0], y: R.m0[1], cls: 'c0', shape: 'diamond', r: 8, hl: true, label: 'μ₀' });
          points.push({ id: 'c1', x: R.m1[0], y: R.m1[1], cls: 'c1', shape: 'diamond', r: 8, hl: true, label: 'μ₁' });
        }
        if (st.showQuery) {
          const qp = isLda ? R.qLda : R.qGnb;
          points.push({ id: 'q', x: R.qBmi, y: R.qGlu, cls: qp >= 0.5 ? 'c1' : 'c0', shape: 'star', r: 9, hl: true, label: '新病人' });
        }
        const circles = st.showEllipses ? [
          { id: 'e0', x: R.m0[0], y: R.m0[1], r: Math.sqrt(R.v0[0]), ry: Math.sqrt(R.v0[1]), cls: 'c0' },
          { id: 'e1', x: R.m1[0], y: R.m1[1], r: Math.sqrt(R.v1[0]), ry: Math.sqrt(R.v1[1]), cls: 'c1' }
        ] : [];
        const lines = [];
        if (st.showCenters) {
          lines.push({ id: 'axis', x1: R.m0[0], y1: R.m0[1], x2: R.m1[0], y2: R.m1[1], cls: 'c2', dash: true, w: 1.8, label: '中心連線' });
        }
        if (st.showBoundary && isLda && Math.abs(R.w1) > 1e-6) {
          const yA = (-R.bLda - R.w0 * AX.x.min) / R.w1;
          const yB = (-R.bLda - R.w0 * AX.x.max) / R.w1;
          lines.push({ id: 'ldb', x1: AX.x.min, y1: yA, x2: AX.x.max, y2: yB, cls: 'hl', w: 2.5, label: 'LDA 直線邊界' });
        }
        const regions = st.showBoundary ? LAB.grid((x, y) => {
          const pr = isLda ? R.ldaProb(x, y) : R.gnbProb(x, y);
          return pr >= 0.5 ? 'c1' : 'c0';
        }, AX.x.min, AX.x.max, AX.y.min, AX.y.max, 30, 20) : null;
        const main = {
          type: 'scatter', slot: 'main',
          title: (isLda ? 'Fisher LDA 線性判別邊界' : 'Gaussian NB 高斯機率邊界') + '（含兩群 1σ 橢圓）',
          axes: AX, points, lines, circles, regions,
          legend: [{ cls: 'c1', label: '糖尿病：是' }, { cls: 'c0', label: '糖尿病：否' }, { cls: 'hl', shape: 'diamond', label: '類別中心 μ' }, { cls: 'hl', shape: 'star', label: '新病人' }]
        };
        const side = {
          type: 'table', slot: 'side',
          title: '兩類別常態分布參數估計表',
          cols: [
            { key: 'grp', label: '類別' },
            { key: 'pr', label: '先驗 P(y)', num: true, digits: 2 },
            { key: 'mb', label: 'BMI 均(SD)', text: true },
            { key: 'mg', label: '血糖 均(SD)', text: true }
          ],
          rows: [
            { id: 'g0', cells: [{ v: '否 (y=0)', cls: 'c0' }, R.p0, f(R.m0[0], 1) + ' (' + f(Math.sqrt(R.v0[0]), 1) + ')', f(R.m0[1], 1) + ' (' + f(Math.sqrt(R.v0[1]), 1) + ')'] },
            { id: 'g1', cells: [{ v: '是 (y=1)', cls: 'c1' }, R.p1, f(R.m1[0], 1) + ' (' + f(Math.sqrt(R.v1[0]), 1) + ')', f(R.m1[1], 1) + ' (' + f(Math.sqrt(R.v1[1]), 1) + ')'] }
          ]
        };
        const qp = isLda ? R.qLda : R.qGnb;
        const bottom = {
          type: 'bars', slot: 'bottom',
          title: '新病人 (BMI=' + R.qBmi + ', 血糖=' + R.qGlu + ') 後驗機率與模型準確率',
          max: 1, digits: 3,
          items: [
            { id: 'pg', label: 'Gaussian NB 預測 P(是)', value: st.showQuery ? R.qGnb : 0, cls: 'c0', hl: !isLda && st.showQuery },
            { id: 'pl', label: 'Fisher LDA 預測 P(是)', value: st.showQuery ? R.qLda : 0, cls: 'c2', hl: isLda && st.showQuery },
            { id: 'ag', label: 'GNB 訓練準確率', value: st.showBoundary ? R.accGnb : 0, cls: 'good' },
            { id: 'al', label: 'LDA 訓練準確率', value: st.showBoundary ? R.accLda : 0, cls: 'good' }
          ]
        };
        return [main, side, bottom];
      }

      const st = { showCenters: false, showEllipses: false, showBoundary: false, showQuery: false };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '1. 題目與連續貝氏', 'B5 的單純貝氏只能算離散「高／正常」；當特徵是連續的 BMI 與血糖時，改用常態分布鐘形曲線算機率密度！', [
        '先驗機率：P(否) = ' + f(R.p0, 3) + '，P(是) = ' + f(R.p1, 3)
      ]);

      st.showCenters = true;
      add(2, '2. 計算兩群中心向量', '分別算出「否」與「是」兩群病人的平均 BMI 與平均血糖（圖上菱形 μ₀ 與 μ₁）。', [
        '否群中心 μ₀ = (' + f(R.m0[0], 1) + ', ' + f(R.m0[1], 1) + ')',
        '是群中心 μ₁ = (' + f(R.m1[0], 1) + ', ' + f(R.m1[1], 1) + ')'
      ]);

      st.showEllipses = true;
      if (isLda) {
        add(5, '3. 共用共變異矩陣 Σ', 'Fisher LDA 假設兩群共用同一個共變異數矩陣 Σ，找出「組間距離最大、組內離散最小」的投影方向 w = Σ⁻¹(μ₁−μ₀)。', [
          'Pooled Σ：Var(BMI)=' + f(R.s00, 1) + ', Cov=' + f(R.s01, 1) + ', Var(血糖)=' + f(R.s11, 1),
          '判別權重 w = (' + f(R.w0, 3) + ', ' + f(R.w1, 3) + ')'
        ]);
      } else {
        add(4, '3. 獨立特徵高斯分布', 'Gaussian NB 假設 BMI 與血糖條件獨立，兩群各自有自己的標準差（圖上橢圓大小不同）。', [
          '否群 SD = (' + f(Math.sqrt(R.v0[0]), 2) + ', ' + f(Math.sqrt(R.v0[1]), 2) + ')',
          '是群 SD = (' + f(Math.sqrt(R.v1[0]), 2) + ', ' + f(Math.sqrt(R.v1[1]), 2) + ')'
        ]);
      }

      st.showQuery = true;
      add(6, '4. 計算新病人後驗機率', '將新病人 (BMI=' + R.qBmi + ', 血糖=' + R.qGlu + ') 代入高斯密度函數與貝氏定理，求出糖尿病機率。', [
        'Gaussian NB P(是|x) = ' + f(R.qGnb, 3),
        'Fisher LDA P(是|x) = ' + f(R.qLda, 3)
      ]);

      st.showBoundary = true;
      add(7, '5. 決策邊界比較', isLda
        ? '因為兩群共用 Σ，二次項剛好相消，LDA 決策邊界必為一條乾淨的直線！'
        : '因為兩群各自的變異數不同，Gaussian NB 的決策邊界會微幅彎曲（二次曲線）。', [
        'GNB 準確率 = ' + LAB.pct(R.accGnb, 1) + '｜LDA 準確率 = ' + LAB.pct(R.accLda, 1)
      ]);

      add(7, 'GNB 條件獨立假設', 'Gaussian NB 假設 BMI 與血糖在各類別內互相獨立（協方差設為 0），只用軸對齊橢圓建模，遇到高度相關特徵容易過度自信！', [
        'GNB 參數極少：只需估每類每欄的均值與變異數'
      ]);
      const corrPool = R.s01 / (Math.sqrt(R.s00 * R.s11) || 1);
      add(7, 'LDA 共用 Σ 的幾何', 'LDA 透過共用共變異矩陣 Σ 捕捉 BMI 與血糖的相關性（組內相關 r = ' + f(corrPool, 2) + '），展開後二次項恰好消去，必成直線邊界。', [
        '判別方向 w = Σ⁻¹(μ₁ − μ₀) = (' + f(R.w0, 3) + ', ' + f(R.w1, 3) + ')'
      ]);
      add(7, '進階延伸：QDA 二次判別', '若兩群病人的變異方向截然不同（Σ₀ ≠ Σ₁），放寬共用假設讓兩群各自算共變異矩陣，即為二次判別分析 QDA（彎曲邊界）。', [
        'GNB (對角 Σₖ)｜LDA (共用 Σ)｜QDA (各自完整 Σₖ)'
      ]);
      add(7, '生成式 vs 判別式比較', 'LDA 與 GNB 先學資料生成分布 P(x|y)，小樣本較穩健；Logistic 迴歸（B3）直接學 P(y|x)，不假設常態分布且抗偏態較強。', [
        'GNB 準確率 = ' + LAB.pct(R.accGnb, 1) + '｜LDA 準確率 = ' + LAB.pct(R.accLda, 1)
      ]);
      add(7, '臨床實務選用指南', '當特徵呈近似常態且樣本少時可優先試 LDA；若特徵高度偏態或含離群值，建議先轉對數（A8）或改用 Logistic／樹模型。', [
        '試拖曳「新病人 BMI / 血糖」觀察星號與後驗機率變化'
      ]);
      return steps;
    },
    keys(steps, rows, p) {
      const R = fitModels(rows, p);
      return {
        p0: R.p0, p1: R.p1,
        m0_bmi: R.m0[0], m0_glu: R.m0[1],
        m1_bmi: R.m1[0], m1_glu: R.m1[1],
        q_gnb: R.qGnb, q_lda: R.qLda,
        acc_gnb: R.accGnb, acc_lda: R.accLda
      };
    },
    explain(steps, rows, p) {
      const R = fitModels(rows, p);
      return [
        'Gaussian NB 對每個類別與特徵分別配適常態分布，對新病人預測 P(是) = ' + f(R.qGnb, 3) + '（整體準確率 ' + LAB.pct(R.accGnb, 1) + '）。',
        'Fisher LDA 共用兩類別的共變異數矩陣 Σ，推導出線性判別邊界 w·x + b = 0，對新病人預測 P(是) = ' + f(R.qLda, 3) + '（準確率 ' + LAB.pct(R.accLda, 1) + '）。',
        '當特徵之間具高度相關性時，考慮共變異數的 LDA 通常優於假設條件獨立的 Gaussian NB。'
      ];
    },
    aistudio: {
      operators: ['Read CSV', 'Set Role', 'Naive Bayes / Linear Discriminant Analysis'],
      params: [
        ['Naive Bayes', '連續特徵預設即為 Gaussian Naive Bayes'],
        ['Linear Discriminant Analysis', '使用共用共變異數矩陣求解線性判別軸']
      ],
      note: 'AI Studio 的 Naive Bayes 運算子遇到數值欄位時，會自動計算各類別的平均值與標準差（即 Gaussian NB）。',
      expect: (steps, rows, p) => {
        const R = fitModels(rows, p);
        return ['GNB 準確率 = ' + LAB.pct(R.accGnb, 1) + '，LDA 準確率 = ' + LAB.pct(R.accLda, 1)];
      },
      python: 'from sklearn.naive_bayes import GaussianNB\nfrom sklearn.discriminant_analysis import LinearDiscriminantAnalysis\ngnb = GaussianNB().fit(X, y)\nlda = LinearDiscriminantAnalysis().fit(X, y)',
      confirmed: false
    }
  });
})();
