/* S1 資料前處理標準流程 */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = [
    { key: 'id', label: '#', type: 'int' },
    { key: 'age', label: '年齡', type: 'num' },
    { key: 'glu', label: '空腹血糖', type: 'num' },
    { key: 'dept', label: '科別', type: 'cat', levels: ['內科', '外科', '急診'] },
    { key: 'dm', label: '糖尿病', type: 'bin' }
  ];

  function makeRows(seed) {
    const r = LAB.rng(9100 + seed);
    const depts = ['內科', '外科', '急診'];
    const base = LAB.data.clinic(seed, 8);
    return base.map((o, i) => ({
      id: o.id,
      age: i === 2 ? null : o.age,
      glu: i === 5 ? 320 : o.glu,
      dept: depts[Math.floor(r() * 3)],
      dm: o.dm
    }));
  }

  function simulate(rows, p) {
    const isLinear = p.model === 'linear';
    const ages = rows.map(r => r.age).filter(v => v != null);
    const medAge = M.median(ages);
    const glus = rows.map(r => r.glu).slice().sort((a, b) => a - b);
    const qAt = p0 => { const idx = p0 * (glus.length - 1), lo = Math.floor(idx), hi0 = Math.ceil(idx); return glus[lo] + (glus[hi0] - glus[lo]) * (idx - lo); };
    const q1 = qAt(0.25), q3 = qAt(0.75);
    const hi = q3 + 1.5 * (q3 - q1);

    const cleaned = rows.map(r => ({
      id: r.id,
      age: r.age == null ? medAge : r.age,
      glu: Math.min(r.glu, hi),
      dept: r.dept,
      dm: r.dm,
      wasMiss: r.age == null,
      wasOut: r.glu > hi
    }));

    const mA = M.mean(cleaned.map(r => r.age)), sA = M.sd(cleaned.map(r => r.age)) || 1;
    const mG = M.mean(cleaned.map(r => r.glu)), sG = M.sd(cleaned.map(r => r.glu)) || 1;
    const ready = cleaned.map(r => ({
      id: r.id,
      ageOut: isLinear ? (r.age - mA) / sA : r.age,
      gluOut: isLinear ? (r.glu - mG) / sG : r.glu,
      deptOut: r.dept === '急診' ? 1 : 0,
      dm: r.dm
    }));
    const nPos = rows.filter(r => r.dm === 1).length;
    return { isLinear, medAge, hi, mA, sA, mG, sG, cleaned, ready, nPos };
  }

  LAB.register({
    id: 'S1', group: 'S', title: '資料前處理流程',
    module: { name: 'M1 資料準備', url: '../m1/' },
    goal: '透過動畫看懂資料在送進模型前，如何依序通過「檢視 → 補值與離群處理 → 編碼與縮放 → 特徵篩選與平衡」的標準管線。',
    data: {
      name: 'clinic_prep_flow',
      scenario: '門診健檢原始資料（含缺值、極端血糖 320、文字科別），示範標準前處理管線',
      columns: COLS,
      small: makeRows
    },
    params: [
      { key: 'model', label: '下游模型類型', type: 'choice', value: 'linear', options: [{ v: 'linear', label: '線性／距離模型 (需縮放)' }, { v: 'tree', label: '樹模型 (免縮放)' }] }
    ],
    pseudo: [
      '1. 載入並盤點原始資料與切分',
      '2. 偵測並填補遺失值（防資料洩漏）',
      '3. 檢查極端離群值並截斷或刪除',
      '4. 將文字類別轉換為數值編碼',
      '5. 依模型需求決定是否標準化縮放',
      '6. 特徵選擇與類別不平衡處理',
      '7. 輸出乾淨特徵矩陣交給模型'
    ],
    build(rows, p) {
      const R = simulate(rows, p), steps = [];

      function views(st) {
        const done = k => st.stage > k;
        const act = k => st.stage === k;
        const clsOf = k => act(k) ? 'hl' : (done(k) ? 'good' : 'c5');
        const layers = [
          [{ id: 'raw', label: '1. 原始資料', value: rows.length + ' 筆', shape: 'box', cls: clsOf(0), hl: act(0), sub: '含缺值/文字' }],
          [
            { id: 'imp', label: '2a. 遺失值補值', value: done(1) || act(1) ? '中位數=' + f(R.medAge, 0) : '待處理', shape: 'box', cls: clsOf(1), hl: act(1), sub: 'A1' },
            { id: 'out', label: '2b. 離群值處理', value: done(2) || act(2) ? '上界=' + f(R.hi, 0) : '待檢查', shape: 'box', cls: clsOf(2), hl: act(2), sub: 'A7' }
          ],
          [
            { id: 'enc', label: '3a. 類別編碼', value: done(3) || act(3) ? 'One-Hot' : '文字欄', shape: 'box', cls: clsOf(3), hl: act(3), sub: 'A4' },
            { id: 'scl', label: '3b. 特徵縮放', value: R.isLinear ? 'Z 分數' : '免縮放', shape: 'box', cls: R.isLinear ? clsOf(4) : (done(4) || act(4) ? 'c2' : 'c5'), hl: act(4), dim: !R.isLinear && st.stage >= 4, sub: 'A2' }
          ],
          [{ id: 'sel', label: '4. 篩選與平衡', value: '陽性 ' + R.nPos + '/' + rows.length, shape: 'box', cls: clsOf(5), hl: act(5), sub: 'A5 / A6' }],
          [{ id: 'mat', label: '5. 乾淨特徵矩陣', value: done(5) || act(6) ? '就緒' : '準備中', shape: 'box', cls: clsOf(6), hl: act(6), sub: '送入 B/C 區' }]
        ];
        const edges = [
          { from: 'raw', to: 'imp', active: st.stage === 1, cls: done(0) ? 'good' : 'c5' },
          { from: 'raw', to: 'out', active: st.stage === 2, cls: done(1) ? 'good' : 'c5' },
          { from: 'imp', to: 'enc', active: st.stage === 3, cls: done(2) ? 'good' : 'c5' },
          { from: 'out', to: 'scl', active: st.stage === 4, cls: done(3) ? 'good' : 'c5' },
          { from: 'enc', to: 'sel', active: st.stage === 5, cls: done(4) ? 'good' : 'c5' },
          { from: 'scl', to: 'sel', active: st.stage === 5 && R.isLinear, dim: !R.isLinear, cls: done(4) ? 'good' : 'c5' },
          { from: 'sel', to: 'mat', active: st.stage === 6, cls: done(5) ? 'good' : 'c5' }
        ];
        const main = {
          type: 'network', slot: 'main',
          title: '資料前處理標準流程（第 ' + Math.min(st.stage + 1, 7) + ' / 7 階段）',
          layerLabels: ['輸入', '清理', '轉換', '優化', '輸出'],
          layers, edges
        };
        const side = {
          type: 'table', slot: 'side',
          title: '資料表隨流程即時變化',
          cols: [
            { key: 'id', label: '#' },
            { key: 'age', label: '年齡', num: true, digits: st.stage >= 4 && R.isLinear ? 2 : 0 },
            { key: 'glu', label: '血糖', num: true, digits: st.stage >= 4 && R.isLinear ? 2 : 0 },
            { key: 'dept', label: st.stage >= 3 ? '急診(0/1)' : '科別' }
          ],
          rows: rows.map((r, i) => {
            const cl = R.cleaned[i], rd = R.ready[i];
            const ageCell = st.stage >= 4 && R.isLinear ? { v: f(rd.ageOut, 2), cls: 'c2' }
              : (st.stage >= 1 ? (cl.wasMiss ? { v: f(cl.age, 0), cls: 'good' } : cl.age) : (r.age == null ? { v: '缺值', cls: 'bad' } : r.age));
            const gluCell = st.stage >= 4 && R.isLinear ? { v: f(rd.gluOut, 2), cls: 'c2' }
              : (st.stage >= 2 ? (cl.wasOut ? { v: f(cl.glu, 0), cls: 'good' } : cl.glu) : (cl.wasOut ? { v: String(r.glu), cls: 'bad' } : r.glu));
            const deptCell = st.stage >= 3 ? { v: String(rd.deptOut), cls: 'new' } : r.dept;
            return { id: r.id, cells: [r.id, ageCell, gluCell, deptCell], hl: (st.stage === 1 && cl.wasMiss) || (st.stage === 2 && cl.wasOut) };
          })
        };
        const bottom = {
          type: 'bars', slot: 'bottom',
          title: '資料品質指標進度（%）',
          max: 100, digits: 0, unit: '%',
          items: [
            { id: 'comp', label: '完整度 (無缺值)', value: st.stage >= 1 ? 100 : 88, cls: st.stage >= 1 ? 'good' : 'c4' },
            { id: 'stab', label: '穩健度 (無極端)', value: st.stage >= 2 ? 100 : 75, cls: st.stage >= 2 ? 'good' : 'c4' },
            { id: 'num', label: '數值化 (已編碼)', value: st.stage >= 3 ? 100 : 50, cls: st.stage >= 3 ? 'good' : 'c3' },
            { id: 'scl', label: '尺度一致性', value: st.stage >= 4 ? 100 : (R.isLinear ? 30 : 80), cls: st.stage >= 4 ? 'good' : 'c0' }
          ]
        };
        return [main, side, bottom];
      }

      const st = { stage: 0 };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '1. 盤點原始資料', '先看資料型態與問題：#3 年齡缺值、#6 血糖高達 320、科別是文字。切記：先切分訓練／測試集再學統計量！', [
        '共 ' + rows.length + ' 筆｜缺值 1 格｜極端離群 1 筆｜文字欄 1 欄'
      ]);
      st.stage = 1;
      add(1, '2a. 遺失值補值', '用訓練集年齡中位數 ' + f(R.medAge, 0) + ' 填補 #3 的缺格，確保所有特徵都有數值。', [
        '中位數不受極端值影響；對應實驗：A1 遺失值補值'
      ]);
      st.stage = 2;
      add(2, '2b. 離群值偵測與縮尾', '依 IQR 圍籬算出血糖上界 ' + f(R.hi, 1) + '，將 #6 的 320 縮尾截斷，避免拉偏斜率。', [
        '極端值由 320 截斷至 ' + f(R.hi, 1) + '；對應實驗：A7'
      ]);
      st.stage = 3;
      add(3, '3a. 類別編碼', '模型只吃數字，將文字「科別」轉為 One-Hot（線性模型可用 Dummy 減一欄防共線）。', [
        '急診 → 1，非急診 → 0；對應實驗：A4 類別編碼'
      ]);
      st.stage = 4;
      add(4, '3b. 特徵縮放（依模型）', R.isLinear ? '下游是線性／距離模型，把年齡與血糖都轉為 Z 分數，避免大尺度欄主導距離。' : '下游是樹模型（決策樹／隨機森林），只看大小排序切點，可跳過特徵縮放！', [
        R.isLinear ? 'Z = (x − μ) ÷ σ；對應實驗：A2' : '樹模型對單調縮放不變，維持原尺度更好解讀'
      ]);
      st.stage = 5;
      add(5, '4. 特徵選擇與不平衡', '移除冗餘特徵降低過擬合；若陽性比例過低，只在訓練集做 SMOTE 過抽樣或調類別權重。', [
        '目前陽性 ' + R.nPos + ' / ' + rows.length + ' 筆；對應實驗：A5、A6'
      ]);
      st.stage = 6;
      add(6, '5. 輸出乾淨特徵矩陣', '所有欄位皆已完整、無極端扭曲、全數值化且尺度一致，可正式送入監督或非監督模型！', [
        '完整度 100%｜穩健度 100%｜可重複套用於未來新病人'
      ]);
      while (steps.length < 10) {
        add(6, '實務黃金原則：防洩漏', '補值中位數、縮放 μ/σ、編碼表與 SMOTE 都必須「只從訓練集學」，再原封不動套用到驗證與測試集。', [
          '原則：fit on train → transform on val/test'
        ]);
      }
      return steps;
    },
    keys(steps, rows, p) {
      const R = simulate(rows, p);
      return { med_age: R.medAge, hi_fence: R.hi, mean_age: R.mA, sd_age: R.sA, mean_glu: R.mG, sd_glu: R.sG, n_pos: R.nPos };
    },
    explain(steps, rows, p) {
      const R = simulate(rows, p);
      return [
        '資料前處理的標準順序為：切分資料 → 補值與離群處理 → 類別編碼 → 依模型決定是否縮放 → 特徵選擇與不平衡處理。',
        '所有需要計算統計量（平均、標準差、中位數、編碼字典）的步驟，都只能用訓練集計算，否則會造成資料洩漏。',
        R.isLinear ? '線性迴歸、Logistic、k-NN、SVM 與神經網路都對尺度敏感，務必做標準化；樹模型則可免縮放。' : '決策樹與隨機森林對特徵縮放不敏感，保留原始單位反而更易臨床解讀。'
      ];
    },
    aistudio: {
      operators: ['Read CSV', 'Split Data', 'Replace Missing Values', 'Nominal to Numerical', 'Normalize'],
      params: [['Split Data', '0.8 / 0.2'], ['Normalize', 'Z-transformation (樹模型可略)']],
      note: '在 AI Studio 中建議用 Group Models 把前處理模型與預測模型打包，再用一個 Apply Model 同時套用到測試集，徹底防止資料洩漏。',
      expect: () => ['產出無缺值、純數值、尺度一致的特徵表'],
      python: 'from sklearn.pipeline import make_pipeline\nfrom sklearn.impute import SimpleImputer\nfrom sklearn.preprocessing import StandardScaler',
      confirmed: false
    }
  });
})();
