/* A8 偏態轉換與穩健縮放 */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = [
    { key: 'age', label: '年齡', unit: '歲', type: 'num', min: 20, max: 90, step: 1, role: 'x' },
    { key: 'crp', label: '發炎指數 CRP', unit: 'mg/L', type: 'num', min: 0.2, max: 180, step: 0.5, role: 'x' }
  ];

  function makeRows(seed) {
    const r = LAB.rng(8801 + seed);
    const baseCrp = [1.2, 1.8, 2.4, 3.1, 3.9, 4.8, 6.2, 8.5, 14.0, 28.5, 68.0, 142.0];
    return baseCrp.map((c, i) => ({
      id: i + 1,
      age: Math.round(32 + i * 4.2 + (r() - 0.5) * 4),
      crp: Number(Math.max(0.5, c + (r() - 0.5) * (i < 8 ? 0.6 : 4)).toFixed(1))
    }));
  }

  function quantile(sorted, q) {
    const pos = (sorted.length - 1) * q;
    const lo = Math.floor(pos), hi = Math.ceil(pos);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  }

  function skewness(vals) {
    const n = vals.length;
    if (!n) return 0;
    const m = M.mean(vals), s = M.sd(vals) || 1;
    return M.sum(vals.map(v => ((v - m) / s) ** 3)) / n;
  }

  function analyze(rows, p) {
    const method = p.method || 'log1p';
    const raw = rows.map(r => r.crp);
    const sorted = raw.slice().sort((a, b) => a - b);
    const meanRaw = M.mean(raw), sdRaw = M.sd(raw) || 1;
    const q1 = quantile(sorted, 0.25), med = quantile(sorted, 0.5), q3 = quantile(sorted, 0.75);
    const iqr = (q3 - q1) || 1;

    const logVals = raw.map(x => Math.log(1 + x));
    const sqrtVals = raw.map(x => Math.sqrt(Math.max(0, x)));
    const robVals = raw.map(x => (x - med) / iqr);
    const zVals = raw.map(x => (x - meanRaw) / sdRaw);

    const curVals = method === 'log1p' ? logVals : method === 'sqrt' ? sqrtVals : robVals;
    const mCur = M.mean(curVals), medCur = quantile(curVals.slice().sort((a, b) => a - b), 0.5);

    const skRaw = skewness(raw);
    const skSqrt = skewness(sqrtVals);
    const skLog = skewness(logVals);
    const skRob = skewness(robVals);

    return {
      method, raw, logVals, sqrtVals, robVals, zVals, curVals,
      meanRaw, sdRaw, q1, med, q3, iqr, mCur, medCur,
      skRaw, skSqrt, skLog, skRob
    };
  }

  LAB.register({
    id: 'A8', group: 'A', title: '偏態轉換與穩健縮放',
    module: { name: 'M1 第 10 節', url: '../m1/#p10' },
    goal: '看懂右偏臨床數據（如發炎指數 CRP、醫療費用）為何會拉偏平均數與 Z 分數，並比較對數轉換 ln(1+x)、平方根 √x 與 RobustScaler 如何校正偏態或抵抗離群值。',
    data: {
      name: 'clinic_skew',
      scenario: '門診抽血：多數病人 CRP < 10 mg/L，少數急性發炎病人高達 68–142 mg/L，形成嚴重右偏長尾分布',
      columns: COLS,
      editable: ['age', 'crp'],
      small: makeRows
    },
    params: [
      { key: 'method', label: '轉換方法', type: 'choice', value: 'log1p', options: [
        { v: 'log1p', label: '對數轉換 ln(1+x)' },
        { v: 'sqrt', label: '平方根轉換 √x' },
        { v: 'robust', label: '穩健縮放 RobustScaler' }
      ] }
    ],
    pseudo: [
      '檢查原始分布：比較平均與中位數',
      '計算三階動差偏態係數 γ₁',
      '依選擇的方法轉換數值：',
      '  對數轉換：y = ln(1 + x)',
      '  平方根轉換：y = √x',
      '  穩健縮放：(x − Q2) ÷ IQR',
      '比較轉換前後偏態與對稱度'
    ],
    build(rows, p) {
      const R = analyze(rows, p), steps = [];
      const mName = R.method === 'log1p' ? 'ln(1+x) 對數轉換' : R.method === 'sqrt' ? '√x 平方根轉換' : 'RobustScaler 穩健縮放';

      function views(st) {
        const useTrans = st.transformed;
        const ys = useTrans ? R.curVals : R.raw;
        const yMin = Math.min.apply(null, ys), yMax = Math.max.apply(null, ys);
        const pad = Math.max(0.5, (yMax - yMin) * 0.12);
        const ax = {
          x: { label: '病人編號 (#)', min: 0.5, max: rows.length + 0.5 },
          y: { label: useTrans ? mName + ' 後數值' : '原始 CRP (mg/L)', min: Math.floor((yMin - pad) * 10) / 10, max: Math.ceil((yMax + pad) * 10) / 10 }
        };
        const points = rows.map((r, i) => ({
          id: 'p' + r.id,
          x: r.id,
          y: ys[i],
          cls: i >= rows.length - 2 ? 'c1' : (useTrans ? 'good' : 'c0'),
          ring: i >= rows.length - 2,
          hl: st.curIdx === i,
          label: '#' + r.id,
          r: i >= rows.length - 2 ? 7 : 5.5
        }));
        const curMean = useTrans ? R.mCur : R.meanRaw;
        const curMed = useTrans ? R.medCur : R.med;
        const lines = [
          { id: 'l_mean', x1: 0.5, y1: curMean, x2: rows.length + 0.5, y2: curMean, cls: 'c4', dash: true, w: 1.8, label: '平均=' + f(curMean, 2) },
          { id: 'l_med', x1: 0.5, y1: curMed, x2: rows.length + 0.5, y2: curMed, cls: 'c2', dash: true, w: 1.8, label: '中位=' + f(curMed, 2) }
        ];
        const main = {
          type: 'scatter', slot: 'main',
          title: useTrans ? ('轉換後分布（' + mName + '）：觀察平均與中位數距離') : '原始 CRP 右偏分布（少數高值把平均數大幅拉高）',
          axes: ax, points, lines, circles: [],
          legend: [{ cls: 'c0', label: '一般病人' }, { cls: 'c1', label: '長尾高值 (#11,#12)' }, { cls: 'c4', shape: 'line', label: '平均數 μ' }, { cls: 'c2', shape: 'line', label: '中位數 Q2' }]
        };
        const side = {
          type: 'table', slot: 'side',
          title: '原始 CRP vs 各轉換法數值對照',
          cols: [
            { key: 'id', label: '#' },
            { key: 'raw', label: '原 CRP', num: true, digits: 1 },
            { key: 'z', label: '一般 Z', num: true, digits: 2 },
            { key: 'sq', label: '√x', num: true, digits: 2 },
            { key: 'ln', label: 'ln(1+x)', num: true, digits: 2 },
            { key: 'rob', label: 'Robust', num: true, digits: 2 }
          ],
          hlCol: R.method === 'log1p' ? 'ln' : (R.method === 'sqrt' ? 'sq' : 'rob'),
          rows: rows.map((r, i) => ({
            id: r.id,
            cells: [
              r.id, r.crp,
              st.stepStage >= 1 ? R.zVals[i] : null,
              st.stepStage >= 2 ? R.sqrtVals[i] : null,
              st.stepStage >= 2 ? R.logVals[i] : null,
              st.stepStage >= 2 ? R.robVals[i] : null
            ],
            hl: st.curIdx === i || i >= rows.length - 2
          }))
        };
        const bottom = {
          type: 'bars', slot: 'bottom',
          title: '偏態係數 Skewness |γ₁| 比較（越接近 0 越對稱常態，>1 為高度右偏）',
          max: Math.max(2.5, Math.abs(R.skRaw) * 1.15), digits: 2,
          items: [
            { id: 'raw', label: '原始 CRP (γ₁=' + f(R.skRaw, 2) + ')', value: Math.abs(R.skRaw), cls: 'c4' },
            { id: 'rob', label: 'RobustScaler (僅縮放不改形狀)', value: Math.abs(R.skRob), cls: 'c2', hl: R.method === 'robust' },
            { id: 'sqrt', label: '平方根 √x (γ₁=' + f(R.skSqrt, 2) + ')', value: Math.abs(R.skSqrt), cls: 'c0', hl: R.method === 'sqrt' },
            { id: 'log', label: '對數 ln(1+x) (γ₁=' + f(R.skLog, 2) + ')', value: Math.abs(R.skLog), cls: 'good', hl: R.method === 'log1p' }
          ]
        };
        return [main, side, bottom];
      }

      const st = { transformed: false, stepStage: 0, curIdx: -1 };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '1. 觀察右偏長尾現象', '12 位病人中前 8 位 CRP 都在 10 以下，但 #11 與 #12 高達 ' + rows[10].crp + ' 與 ' + rows[11].crp + '，使平均數遠大於中位數！', [
        '原始平均 μ = ' + f(R.meanRaw, 2) + ' ≫ 中位數 Q2 = ' + f(R.med, 2),
        '四分位距 IQR = Q3(' + f(R.q3, 1) + ') − Q1(' + f(R.q1, 1) + ') = ' + f(R.iqr, 2)
      ]);

      st.stepStage = 1;
      add(1, '2. 偏態與 Z 分數陷阱', '原始偏態係數 γ₁ = ' + f(R.skRaw, 2) + '（遠大於 1）。若直接算一般 Z 分數，標準差 σ 被極端值撐大到 ' + f(R.sdRaw, 2) + '，正常病人全被擠在負值窄區間。', [
        '原始偏態 γ₁ = ' + f(R.skRaw, 2) + '（高度正偏態）',
        '#1 一般 Z = ' + f(R.zVals[0], 2) + '，#12 一般 Z = +' + f(R.zVals[11], 2)
      ]);

      st.stepStage = 2; st.transformed = true;
      for (let i of [0, 5, 10, 11]) {
        st.curIdx = i;
        const x = rows[i].crp;
        const formula = R.method === 'log1p'
          ? 'ln(1 + ' + x + ') = ' + f(R.logVals[i], 3)
          : R.method === 'sqrt'
            ? '√(' + x + ') = ' + f(R.sqrtVals[i], 3)
            : '(' + x + ' − ' + f(R.med, 2) + ') ÷ ' + f(R.iqr, 2) + ' = ' + f(R.robVals[i], 3);
        add(R.method === 'log1p' ? 3 : R.method === 'sqrt' ? 4 : 5,
          '3. 轉換個案 #' + rows[i].id,
          R.method === 'robust'
            ? 'RobustScaler 改減去中位數 Q2、除以 IQR，正常病人的刻度不再被 #11、#12 壓扁。'
            : '非線性單調壓縮大數值：數值越大壓縮幅度越大，把長尾巴溫和拉回主群體。',
          ['#' + rows[i].id + '：' + formula]
        );
      }

      st.curIdx = -1;
      add(6, '4. 比較偏態係數與對稱性', R.method === 'robust'
        ? '注意：RobustScaler 屬於線性平移縮放，能抗離群值定中心（中位數=0），但偏態係數 γ₁ 不變；若要改變分布形狀請搭 ln(1+x)。'
        : '轉換後偏態係數從 ' + f(R.skRaw, 2) + ' 降至 ' + f(R.method === 'log1p' ? R.skLog : R.skSqrt, 2) + '，平均數與中位數兩條虛線大幅靠攏！', [
        '轉換後平均 = ' + f(R.mCur, 2) + '｜轉換後中位數 = ' + f(R.medCur, 2),
        '偏態係數：原 ' + f(R.skRaw, 2) + ' → √x ' + f(R.skSqrt, 2) + ' → ln(1+x) ' + f(R.skLog, 2)
      ]);

      add(6, 'Yeo-Johnson 轉換', 'ln(1+x) 僅適用非負數；若欄位含負值（如檢驗變化量 Δ），sklearn 的 PowerTransformer(yeo-johnson) 可自動求最佳次方 λ！', [
        'Box-Cox：僅限 x > 0｜Yeo-Johnson：支援正、零、負數'
      ]);

      add(6, '預測目標 y 的逆轉換', '若對迴歸目標 y（如醫療費用）做了 y′=ln(1+y)，模型預測完後務必做逆轉換 ŷ = exp(ŷ′) − 1（np.expm1）還原單位。', [
        '正轉換：np.log1p(y) ↔ 逆轉換：np.expm1(y_pred)'
      ]);

      add(6, '實務選用指南', '金額／住院天數／濃度右偏時，線性迴歸與神經網路先做 ln(1+x) 或 Yeo-Johnson；含離群值但不需改變形狀時用 RobustScaler。', [
        '目前方法：' + mName + '（所有轉換參數限訓練集 fit）'
      ]);
      return steps;
    },
    keys(steps, rows, p) {
      const R = analyze(rows, p);
      return {
        mean_raw: R.meanRaw, med_raw: R.med, iqr_raw: R.iqr,
        skew_raw: R.skRaw, skew_sqrt: R.skSqrt, skew_log: R.skLog,
        last_log: R.logVals[R.logVals.length - 1],
        last_rob: R.robVals[R.robVals.length - 1]
      };
    },
    explain(steps, rows, p) {
      const R = analyze(rows, p);
      return [
        '原始 CRP 呈高度右偏（Skewness γ₁ = ' + f(R.skRaw, 2) + '），平均數 ' + f(R.meanRaw, 2) + ' 遠高於中位數 ' + f(R.med, 2) + '。',
        '經平方根 √x 與對數 ln(1+x) 非線性壓縮後，偏態係數分別降為 ' + f(R.skSqrt, 2) + ' 與 ' + f(R.skLog, 2) + '，讓分布接近常態對稱。',
        'RobustScaler = (x − Median) / IQR 使用中位數與四分位距定刻度，避免一般 Z 分數被極端值拉大標準差而壓扁正常樣本。'
      ];
    },
    aistudio: {
      operators: ['Read CSV', 'Generate Attributes', 'Normalize (Robust)'],
      params: [
        ['Generate Attributes › function', 'ln(1 + crp) 或 sqrt(crp)'],
        ['Normalize › method', 'Robust transformation (Median & IQR)']
      ],
      note: '當特徵含有 0 時不可直接取 ln(x)，務必使用 ln(1 + x)（即 numpy.log1p）。',
      expect: (steps, rows, p) => {
        const R = analyze(rows, p);
        return ['偏態係數由 ' + f(R.skRaw, 2) + ' 降至 ' + f(R.skLog, 2) + '（ln(1+x)）'];
      },
      python: 'import numpy as np\nfrom sklearn.preprocessing import RobustScaler, PowerTransformer\nx_log = np.log1p(df[["crp"]])\nx_rob = RobustScaler().fit_transform(df[["crp"]])\nx_yj = PowerTransformer(method="yeo-johnson").fit_transform(df[["crp"]])',
      confirmed: false
    }
  });
})();
