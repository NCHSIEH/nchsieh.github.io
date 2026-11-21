/* I2 LIME、PDP 與反事實解釋 */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = LAB.data.columns('clinic', ['age', 'bmi', 'glu', 'dm'], { dm: 'y' });
  const pick = r => ({ id: r.id, age: r.age, bmi: r.bmi, glu: r.glu, dm: r.dm });

  // 黑盒風險模型（含非線性血糖門檻與 BMI×血糖交互作用）
  function blackBoxProb(age, bmi, glu) {
    const z = -6.8
      + 0.032 * (age - 45)
      + 0.14 * (bmi - 23)
      + 0.042 * (glu - 100)
      + (glu > 125 ? 0.035 * (glu - 125) : 0)
      + 0.0025 * Math.max(0, bmi - 24) * Math.max(0, glu - 110);
    return M.sigmoid(z);
  }

  function solveWeightedOLS(X, y, w) {
    const m = X[0].length;
    const XtWX = M.range(m, i => M.range(m, j => M.sum(X.map((r, k) => w[k] * r[i] * r[j]))));
    const XtWy = M.range(m, i => M.sum(X.map((r, k) => w[k] * r[i] * y[k])));
    const A = XtWX.map((r, i) => r.slice().concat([XtWy[i]]));
    for (let i = 0; i < m; i++) {
      let piv = i;
      for (let r = i + 1; r < m; r++) if (Math.abs(A[r][i]) > Math.abs(A[piv][i])) piv = r;
      const tmp = A[i]; A[i] = A[piv]; A[piv] = tmp;
      const div = A[i][i] || 1e-12;
      for (let j = i; j < m + 1; j++) A[i][j] /= div;
      for (let r = 0; r < m; r++) {
        if (r === i) continue;
        const fac = A[r][i];
        for (let j = i; j < m + 1; j++) A[r][j] -= fac * A[i][j];
      }
    }
    return A.map(r => r[m]);
  }

  function runXAI(rows, p) {
    const n = rows.length;
    const tId = Math.min(n, Math.max(1, Math.round(p.target || 2)));
    const ti = Math.max(0, rows.findIndex(r => r.id === tId));
    const pt = rows[ti];
    const sigma = p.kernel_w || 1.2;

    const ages = LAB.col(rows, 'age'), bmis = LAB.col(rows, 'bmi'), glus = LAB.col(rows, 'glu');
    const sdA = M.sd(ages) || 10, sdB = M.sd(bmis) || 4, sdG = M.sd(glus) || 25;

    // 1. LIME：在目標病人周圍產生 8 個微擾樣本，算指數核權重 exp(-d^2 / sigma^2)，擬合局部加權線性代理模型
    const offsets = [
      [0, 0, 0],
      [0.4, -0.3, 0.2], [-0.5, 0.4, -0.3], [0.2, 0.6, -0.4],
      [-0.3, -0.5, 0.5], [0.7, 0.2, 0.6], [-0.6, 0.3, -0.6],
      [0.3, -0.7, -0.2], [-0.4, -0.2, 0.7]
    ];
    const limeSamples = offsets.map((off, idx) => {
      const a = pt.age + off[0] * sdA * 0.6;
      const b = pt.bmi + off[1] * sdB * 0.6;
      const g = pt.glu + off[2] * sdG * 0.6;
      const dist2 = (off[0] * 0.6) ** 2 + (off[1] * 0.6) ** 2 + (off[2] * 0.6) ** 2;
      const wt = Math.exp(-dist2 / (sigma * sigma));
      const pr = blackBoxProb(a, b, g);
      return {
        idx,
        da: off[0] * 0.6, db: off[1] * 0.6, dg: off[2] * 0.6,
        a, b, g, dist: Math.sqrt(dist2), wt, pr
      };
    });

    const Xlime = limeSamples.map(s => [1, s.da, s.db, s.dg]);
    const ylime = limeSamples.map(s => s.pr);
    const wlime = limeSamples.map(s => s.wt);
    const limeCoefs = solveWeightedOLS(Xlime, ylime, wlime); // [intercept, w_age, w_bmi, w_glu]

    // 2. PDP & ICE（針對空腹血糖 glu = 80..180）
    const gluGrid = [80, 95, 110, 125, 140, 155, 170, 185];
    const pdpPts = gluGrid.map(gVal => {
      const avgP = M.mean(rows.map(r => blackBoxProb(r.age, r.bmi, gVal)));
      return [gVal, avgP];
    });
    const iceTargetPts = gluGrid.map(gVal => [gVal, blackBoxProb(pt.age, pt.bmi, gVal)]);
    const iceLowPts = gluGrid.map(gVal => [gVal, blackBoxProb(35, 20.5, gVal)]);

    // 3. 反事實解釋 (Counterfactual Explanation)：找最小改動將高風險 (>0.5) 降到 <0.45，或低風險升到 >0.55
    const origProb = blackBoxProb(pt.age, pt.bmi, pt.glu);
    const isHigh = origProb >= 0.5;
    let cfBmi = pt.bmi, cfGlu = pt.glu, cfProb = origProb;
    for (let step = 1; step <= 25; step++) {
      const tryB = isHigh ? Math.max(18.5, pt.bmi - step * 0.35) : Math.min(36, pt.bmi + step * 0.35);
      const tryG = isHigh ? Math.max(85, pt.glu - step * 2.2) : Math.min(185, pt.glu + step * 2.2);
      const pTry = blackBoxProb(pt.age, tryB, tryG);
      cfBmi = Math.round(tryB * 10) / 10;
      cfGlu = Math.round(tryG);
      cfProb = pTry;
      if ((isHigh && pTry < 0.42) || (!isHigh && pTry >= 0.58)) break;
    }

    return {
      ti, tid: pt.id, pt, sigma, origProb, isHigh,
      limeSamples, limeCoefs,
      gluGrid, pdpPts, iceTargetPts, iceLowPts,
      cfBmi, cfGlu, cfProb
    };
  }

  LAB.register({
    id: 'I2', group: 'I', title: 'LIME、PDP 與反事實解釋',
    module: { name: 'M9 第 11 節', url: '../m9/#p11' },
    goal: '除了 I1 SHAP 之外，掌握臨床可解釋 AI 另外三大支柱：LIME 局部加權線性代理模型、PDP / ICE 部分依賴曲線，以及告訴病人「至少要減多少體重與血糖才能翻轉風險」的反事實解釋（Counterfactuals）。',
    data: {
      name: 'clinic_xai2',
      scenario: '門診健檢：12 位病人與非線性黑盒風險模型，對指定病人執行 LIME 局部解釋、PDP 曲線與反事實處方建議',
      columns: COLS,
      editable: ['age', 'bmi', 'glu'],
      small: seed => LAB.data.clinic(seed, 12).map(pick)
    },
    params: [
      { key: 'target', label: '解釋病人 (#)', type: 'int', min: 1, max: 12, step: 1, value: 2 },
      { key: 'kernel_w', label: 'LIME 核寬度 σ', type: 'num', min: 0.5, max: 2.5, step: 0.5, value: 1.0 }
    ],
    pseudo: [
      '鎖定待解釋病人 x* 並算 f(x*)',
      'LIME：產生微擾樣本並算距離權重',
      '擬合局部加權線性模型得局部斜率',
      'PDP/ICE：掃描血糖繪製邊際曲線',
      '反事實：固定年齡微調可介入因子',
      '輸出跨越決策門檻的最小改變處方'
    ],
    build(rows, p) {
      const R = runXAI(rows, p), steps = [];

      function views(st) {
        const main = {
          type: 'line', slot: 'main',
          title: '部分依賴圖 PDP 與個別條件期望 ICE（掃描血糖 80 → 185 mg/dL 的風險曲線）',
          axes: { x: { label: '空腹血糖 (mg/dL)', min: 75, max: 190 }, y: { label: '預測糖尿病風險機率', min: 0, max: 1.02 } },
          series: [
            { id: 'th', label: '0.5 判定門檻', pts: [[75, 0.5], [190, 0.5]], cls: 'c5', dash: true, dots: false },
            { id: 'pdp', label: '全體平均 PDP 曲線', pts: R.pdpPts, cls: 'c0', dots: true },
            { id: 'ice_t', label: '#' + R.tid + ' 個人 ICE 曲線', pts: R.iceTargetPts, cls: 'hl', dots: true },
            ...(st.showPDP ? [{ id: 'ice_l', label: '低BMI年輕人 ICE', pts: R.iceLowPts, cls: 'good', dash: true, dots: false }] : [])
          ],
          marker: st.showCF
            ? { x: R.cfGlu, y: R.cfProb, label: '反事實目標 (' + R.cfGlu + ')' }
            : { x: R.pt.glu, y: R.origProb, label: '#' + R.tid + ' 現況 (' + R.pt.glu + ')' }
        };

        const side = {
          type: 'table', slot: 'side',
          title: st.showCF ? '反事實處方對照（Counterfactual）' : 'LIME 局部微擾樣本與核權重（σ=' + f(R.sigma, 1) + '）',
          cols: st.showCF ? [
            { key: 'ft', label: '臨床因子' },
            { key: 'cur', label: '目前數值', num: true, digits: 1 },
            { key: 'cf', label: '反事實目標', num: true, digits: 1 },
            { key: 'act', label: '可執行建議' }
          ] : [
            { key: 'id', label: '微擾#' },
            { key: 'd', label: '距離d', num: true, digits: 2 },
            { key: 'w', label: '核權重w', num: true, digits: 2 },
            { key: 'p', label: '黑盒f(z)', num: true, digits: 3 }
          ],
          rows: st.showCF ? [
            { id: 'age', cells: ['年齡 (不可改)', R.pt.age, R.pt.age, '固定不變（不可逆因子）'] },
            { id: 'bmi', cells: ['BMI (kg/m²)', R.pt.bmi, { v: f(R.cfBmi, 1), cls: 'good' }, (R.cfBmi < R.pt.bmi ? '減重 Δ=' : '調整 Δ=') + f(R.cfBmi - R.pt.bmi, 1)], hl: true },
            { id: 'glu', cells: ['空腹血糖', R.pt.glu, { v: String(R.cfGlu), cls: 'good' }, (R.cfGlu < R.pt.glu ? '控糖 Δ=' : '調整 Δ=') + (R.cfGlu - R.pt.glu) + ' mg/dL'], hl: true },
            { id: 'prob', cells: ['預測風險 p̂', { v: f(R.origProb, 3), cls: R.isHigh ? 'bad' : 'good' }, { v: f(R.cfProb, 3), cls: !R.isHigh ? 'bad' : 'good' }, R.isHigh ? '成功翻轉為低風險 (<0.5)' : '跨過陽性門檻 (>0.5)'] }
          ] : R.limeSamples.slice(0, 8).map(s => ({
            id: 's' + s.idx,
            cells: [s.idx === 0 ? '原點 x*' : 'z' + s.idx, s.dist, { v: f(s.wt, 2), cls: s.wt > 0.6 ? 'good' : undefined }, s.pr],
            hl: s.idx === 0
          }))
        };

        const featNames = ['年齡 (+1SD)', 'BMI (+1SD)', '血糖 (+1SD)'];
        const absSlopes = [1, 2, 3].map(j => Math.abs(R.limeCoefs[j]));
        const maxLimeJ = 1 + M.argmax(absSlopes);
        const bottom = {
          type: 'bars', slot: 'bottom',
          title: 'LIME 局部線性代理模型斜率（對 #' + R.tid + ' 附近影響最大的特徵）',
          max: Math.max(0.25, M.max(absSlopes) * 1.2),
          digits: 3,
          items: [1, 2, 3].map(j => ({
            id: 'lc' + j,
            label: featNames[j - 1],
            value: Math.abs(R.limeCoefs[j]),
            cls: j === maxLimeJ ? 'hl' : 'c0',
            hl: j === maxLimeJ
          }))
        };

        return [main, side, bottom];
      }

      const st = { showPDP: false, showCF: false };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [R.tid] });

      add(0, '黑盒模型與三大問題', '針對病人 #' + R.tid + '（年齡 ' + R.pt.age + '、BMI ' + R.pt.bmi + '、血糖 ' + R.pt.glu + '），黑盒模型預測風險為 ' + f(R.origProb, 3) + '。除了 SHAP，還有三種臨床必備解釋工具！', [
        '病人 #' + R.tid + ' 原始預測機率 f(x*) = ' + f(R.origProb, 3) + '（' + (R.isHigh ? '高風險 ≥ 0.5' : '低風險 < 0.5') + '）'
      ]);

      add(1, '1. LIME 局部微擾抽樣', 'LIME 的想法：雖然黑盒全域是非線性彎曲的，但在「#' + R.tid + ' 周圍極小範圍內」一定可以用一條簡單直線來近似！', [
        '在 x* 周圍產生微擾樣本 zᵢ，並用指數核 wᵢ = exp(−dᵢ²/σ²) 給近鄰高權重'
      ]);

      add(2, 'LIME 加權線性代理模型', '用加權最小平方法擬合局部平面 g(z)：立刻看出在 #' + R.tid + ' 當前位置，血糖每上升 1 標準差會推升 ' + f(R.limeCoefs[3], 3) + ' 的風險！', [
        'LIME 局部斜率：年齡 = ' + f(R.limeCoefs[1], 3) + '｜BMI = ' + f(R.limeCoefs[2], 3) + '｜血糖 = ' + f(R.limeCoefs[3], 3),
        '注意：AI Studio 的 Explain Predictions 底層正是這種局部代理模型！'
      ]);

      add(2, 'LIME 核寬度 σ 的影響', '試調上方「LIME 核寬度 σ」：σ 越小越貼近 #' + R.tid + ' 瞬間切線斜率；σ 越大越接近全域平均斜率。', [
        '目前 σ = ' + f(R.sigma, 1) + '，最遠樣本權重 = ' + f(R.limeSamples[5].wt, 3)
      ]);

      st.showPDP = true;
      add(3, '2. 全域部分依賴圖 PDP', '看主圖藍線（PDP）：把全院病人的血糖統一換成 80、95…到 185 算平均風險，清楚照出「血糖超過 125 後斜率陡增」的非線性轉折！', [
        'PDP 平均風險：血糖 95 時 = ' + f(R.pdpPts[1][1], 3) + ' → 血糖 155 時 = ' + f(R.pdpPts[5][1], 3)
      ]);

      add(3, '個別條件期望曲線 ICE', '只看平均線 PDP 會掩蓋交互作用，且特徵高度相關時會混入不合理組合（實務改用 ALE）；個人 ICE 與低 BMI 曲線差距正好呈現 BMI×血糖交互作用。', [
        '在血糖 140 時：#' + R.tid + ' 風險 = ' + f(R.iceTargetPts[4][1], 3) + ' vs 低BMI組 = ' + f(R.iceLowPts[4][1], 3)
      ]);

      st.showCF = true;
      add(4, '3. 臨床反事實解釋', '病人最想問：「我至少要改變多少，預測才會跨過 0.5？」這是反事實解釋。' + (R.isHigh ? '本例找降低風險的最小改變。' : '本例原為低風險，找的是升高風險的最小改變（警示用）。'), [
        '反事實規則：鎖定不可改變的「年齡 = ' + R.pt.age + '」，只搜尋可介入的 BMI 與血糖'
      ]);

      add(5, '輸出最小改變行動處方', '見右側對照表：只要 #' + R.tid + ' 的 BMI 變為 ' + f(R.cfBmi, 1) + '、空腹血糖變為 ' + R.cfGlu + ' mg/dL，預測風險就會從 ' + f(R.origProb, 3) + ' 翻轉至 ' + f(R.cfProb, 3) + '！', [
        '最小可行改變：BMI ' + R.pt.bmi + ' → ' + f(R.cfBmi, 1) + '，血糖 ' + R.pt.glu + ' → ' + R.cfGlu,
        '風險跨越 0.5 門檻：' + f(R.origProb, 3) + ' → ' + f(R.cfProb, 3)
      ]);

      add(5, '可解釋性四大工具分工', '實務口訣：全域排名看排列重要度（I1）、全域曲線看 PDP（I2）、單人公平歸因看 SHAP（I1）、給病人的衛教行動目標看反事實解釋（I2）！', [
        '#' + R.tid + ' LIME 血糖斜率 = ' + f(R.limeCoefs[3], 3) + '｜反事實目標機率 = ' + f(R.cfProb, 3)
      ]);

      add(5, '實驗總結', '結合 I1 與 I2，就能將任何複雜黑盒模型轉化為醫師敢簽核、病人聽得懂且可具體執行的臨床決策支援系統。', [
        'LIME 截距 = ' + f(R.limeCoefs[0], 3) + '，PDP 最大風險 = ' + f(R.pdpPts[7][1], 3)
      ]);

      return steps;
    },

    keys(steps, rows, p) {
      const R = runXAI(rows, p);
      return {
        orig_prob: R.origProb,
        lime_c0: R.limeCoefs[0],
        lime_glu: R.limeCoefs[3],
        pdp_0: R.pdpPts[0][1],
        pdp_last: R.pdpPts[7][1],
        cf_bmi: R.cfBmi,
        cf_glu: R.cfGlu,
        cf_prob: R.cfProb
      };
    },

    explain(steps, rows, p) {
      const R = runXAI(rows, p);
      return [
        'LIME 在病人 #' + R.tid + ' 周圍透過核寬度 σ = ' + f(R.sigma, 1) + ' 建立局部加權線性代理模型，得出局部邊際斜率為年齡 ' + f(R.limeCoefs[1], 3) + '、BMI ' + f(R.limeCoefs[2], 3) + '、血糖 ' + f(R.limeCoefs[3], 3) + '。',
        'PDP 與 ICE 曲線展示了空腹血糖從 80 升至 185 mg/dL 時的非線性風險跳升（平均風險由 ' + f(R.pdpPts[0][1], 3) + ' 升至 ' + f(R.pdpPts[7][1], 3) + '）。',
        '反事實解釋固定不可變的年齡（' + R.pt.age + ' 歲），找出只需將 BMI 調至 ' + f(R.cfBmi, 1) + '、血糖調至 ' + R.cfGlu + '，即可將風險由 ' + f(R.origProb, 3) + ' 翻轉為 ' + f(R.cfProb, 3) + '。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Explain Predictions (LIME)', 'Simulator / Optimize'],
      params: [
        ['Explain Predictions › local sample size', '100'],
        ['Simulator › Counterfactual optimization', 'BMI, glu']
      ],
      note: 'AI Studio 的 Explain Predictions 運算子即採用 LIME 局部代理模型；Model Simulator 則支援固定年齡並拖曳滑桿尋找反事實翻轉點。',
      expect: (steps, rows, p) => {
        const R = runXAI(rows, p);
        return ['#' + R.tid + ' LIME 血糖局部斜率 = ' + f(R.limeCoefs[3], 3) + '，反事實目標血糖 = ' + R.cfGlu];
      },
      python: 'from sklearn.inspection import PartialDependenceDisplay\nimport lime.lime_tabular\nimport dice_ml\n# PartialDependenceDisplay.from_estimator(model, X, features=["glu"], kind="both")',
      confirmed: false
    }
  });
})();
