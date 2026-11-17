/* S1 資料前處理標準流程（3 條管線對照＋可用演算法標註） */
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
    const mode = p.model || 'linear';
    const isLinear = mode !== 'tree';
    const isStrict = mode === 'leak_safe';
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
    return { mode, isLinear, isStrict, medAge, hi, mA, sA, mG, sG, cleaned, ready, nPos };
  }

  LAB.register({
    id: 'S1', group: 'S', title: '資料前處理流程',
    module: { name: 'M1 資料準備', url: '../m1/' },
    goal: '透過全寬動畫流程圖對照「線性／距離管線」、「樹模型管線」與「防洩漏嚴格管線」，並標註每步對應的 A1–A7 演算法。',
    data: {
      name: 'clinic_prep_flow',
      scenario: '門診健檢原始資料（含缺值、極端血糖 320、文字科別），示範 3 種前處理標準管線',
      columns: COLS,
      small: makeRows
    },
    params: [
      { key: 'model', label: '前處理管線', type: 'choice', value: 'linear', options: [{ v: 'linear', label: '線性／距離模型 (需縮放)' }, { v: 'tree', label: '樹模型 (免縮放)' }, { v: 'leak_safe', label: '防洩漏嚴格管線 (Pipeline)' }] }
    ],
    pseudo: [
      '1. 先切分訓練集／測試集（防洩漏）',
      '2. 遺失值補值（平均/中位/k-NN）',
      '3. 離群值偵測與縮尾／刪除',
      '4. 類別編碼（One-hot / 目標編碼）',
      '5. 特徵縮放（Z 分數 / Min-Max）',
      '6. 特徵選擇與 SMOTE 類別平衡',
      '7. 輸出乾淨特徵矩陣交給模型'
    ],
    build(rows, p) {
      const R = simulate(rows, p), steps = [];

      const ALGO_ROWS = [
        { id: 's0', st: '1. 切分與盤點', alg: 'Train/Test Split', use: R.isStrict ? '必先切分再學任何統計量' : '檢查缺值、極端與文字欄' },
        { id: 's1', st: '2a. 遺失值補值', alg: 'A1 平均/中位/k-NN', use: '偏態用中位數，線性關聯用 k-NN' },
        { id: 's2', st: '2b. 離群值處理', alg: 'A7 IQR 圍籬/縮尾', use: R.isLinear ? '線性模型必處理，防斜率被拉偏' : '樹模型對單調極端較穩健' },
        { id: 's3', st: '3a. 類別編碼', alg: 'A4 One-hot/Dummy/目標', use: '線性用 Dummy；高基數用目標編碼' },
        { id: 's4', st: '3b. 特徵縮放', alg: 'A2 Z分數 / Min-Max', use: R.isLinear ? '距離/梯度模型必做' : '樹模型可略過，保留原尺度' },
        { id: 's5', st: '4. 篩選與平衡', alg: 'A5 SMOTE / A6 選擇', use: '只對訓練集做；樹常用 A3 離散' },
        { id: 's6', st: '5. 乾淨特徵矩陣', alg: 'Pipeline 封裝套用', use: '同組參數 transform 驗證與測試集' }
      ];

      function views(st) {
        const done = k => st.stage > k;
        const act = k => st.stage === k;
        const clsOf = k => act(k) ? 'hl' : (done(k) ? 'good' : 'c5');
        const layers = [
          [
            { id: 'raw', label: R.isStrict ? '1. 切分訓練集' : '1. 原始資料', value: rows.length + ' 筆', shape: 'box', w: 168, cls: clsOf(0), hl: act(0), sub: R.isStrict ? '只用 Train fit' : '含缺值/極端/文字' },
            { id: 'imp', label: '2. 補值與離群', value: st.stage >= 2 ? '上界=' + f(R.hi, 0) : (st.stage >= 1 ? '中位=' + f(R.medAge, 0) : '待處理'), shape: 'box', w: 168, cls: act(1) || act(2) ? 'hl' : (done(2) ? 'good' : 'c5'), hl: act(1) || act(2), sub: 'A1 補值 · A7 縮尾' }
          ],
          [
            { id: 'enc', label: '3. 編碼與縮放', value: st.stage >= 4 ? (R.isLinear ? 'Z 分數' : '免縮放') : (st.stage >= 3 ? '0/1 數值' : '待轉換'), shape: 'box', w: 168, cls: act(3) || act(4) ? 'hl' : (done(4) ? 'good' : 'c5'), hl: act(3) || act(4), sub: 'A4 編碼 · A2 縮放' },
            { id: 'sel', label: '4. 篩選與平衡', value: '陽性 ' + R.nPos + '/' + rows.length, shape: 'box', w: 168, cls: clsOf(5), hl: act(5), sub: 'A5 SMOTE · A6 選特徵' }
          ],
          [
            { id: 'mat', label: '5. 乾淨特徵矩陣', value: st.stage >= 6 ? '就緒' : '準備中', shape: 'box', w: 168, cls: clsOf(6), hl: act(6), sub: R.isStrict ? '套用至 Val/Test' : '送入 B/C 區模型' }
          ]
        ];
        const edges = [
          { from: 'raw', to: 'imp', active: st.stage === 1 || st.stage === 2, cls: done(0) ? 'good' : 'c5', label: '清理' },
          { from: 'imp', to: 'enc', active: st.stage === 3 || st.stage === 4, cls: done(2) ? 'good' : 'c5', label: '轉換' },
          { from: 'enc', to: 'sel', active: st.stage === 5, cls: done(4) ? 'good' : 'c5', label: '優化' },
          { from: 'sel', to: 'mat', active: st.stage === 6, cls: done(5) ? 'good' : 'c5', label: '輸出' }
        ];
        const main = {
          type: 'network', slot: 'main', h: 440,
          title: '資料前處理全流程圖（第 ' + Math.min(st.stage + 1, 7) + ' / 7 階段）',
          layerLabels: ['輸入與清理', '轉換與優化', '特徵輸出'],
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
          type: 'table', slot: 'bottom',
          title: '步驟與可用演算法對照（' + (R.mode === 'tree' ? '樹模型管線' : R.isStrict ? '防洩漏嚴格管線' : '線性／距離管線') + '）',
          cols: [{ key: 'st', label: '步驟' }, { key: 'alg', label: '可用演算法' }, { key: 'use', label: '何時用／關鍵提醒' }],
          rows: ALGO_ROWS.map((ar, idx) => ({
            id: ar.id,
            cells: [ar.st, { v: ar.alg, cls: idx === st.stage ? 'hl' : (idx < st.stage ? 'good' : 'c0') }, ar.use],
            hl: idx === st.stage
          }))
        };
        return [main, side, bottom];
      }

      const st = { stage: 0 };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '1. 切分與盤點資料', R.isStrict ? '嚴格管線第一條鐵律：先切出測試集封存，接下來的補值、縮放與編碼全都在訓練集內 fit！' : '先看資料問題：#3 年齡缺值、#6 血糖高達 320、科別是文字。', [
        '共 ' + rows.length + ' 筆｜缺值 1 格｜極端離群 1 筆｜文字欄 1 欄'
      ]);
      st.stage = 1;
      add(1, '2a. 遺失值補值 (A1)', '用訓練集年齡中位數 ' + f(R.medAge, 0) + ' 填補 #3 的缺格；線性關係強時也可改用 k-NN 補值。', [
        '可用演算法：A1（平均數／中位數／k-NN 補值）'
      ]);
      st.stage = 2;
      add(2, '2b. 離群值縮尾 (A7)', '依 IQR 圍籬算出血糖上界 ' + f(R.hi, 1) + '，將 #6 的 320 縮尾截斷，避免拉偏線性迴歸斜率。', [
        '可用演算法：A7（IQR 圍籬＋刪除法／縮尾法）'
      ]);
      st.stage = 3;
      add(3, '3a. 類別編碼 (A4)', '將文字「科別」轉為數值：樹模型用 One-hot、線性模型用 Dummy 減一欄、高基數用目標編碼。', [
        '可用演算法：A4（One-hot／Dummy／目標編碼）'
      ]);
      st.stage = 4;
      add(4, '3b. 特徵縮放 (A2)', R.isLinear ? '線性／距離／神經網路必做標準化（Z 分數或 Min-Max），避免血糖大尺度主導距離計算。' : '樹模型（決策樹／隨機森林／GBDT）只看大小排序切點，可跳過特徵縮放！', [
        R.isLinear ? '可用演算法：A2（Z 分數／Min-Max）' : '樹模型可改用 A3 離散化分箱或維持原尺度'
      ]);
      st.stage = 5;
      add(5, '4. 篩選與平衡 (A5/A6)', '用 Filter/Wrapper 刪除冗餘特徵（A6）；若類別極度不平衡，只在訓練集做 SMOTE 合成（A5）。', [
        '可用演算法：A5（SMOTE／欠抽樣）＋ A6（相關/IG/向前選擇）'
      ]);
      st.stage = 6;
      add(6, '5. 輸出乾淨矩陣', '所有欄位皆完整、無極端扭曲、全數值化且尺度一致，可封裝進 Pipeline 套用到測試集與新病人！', [
        '原則：fit on train → transform on val/test'
      ]);
      while (steps.length < 10) {
        add(6, '管線設計總結', '線性／k-NN／SVM／NN 務必完整走完補值＋縮尾＋編碼＋縮放；樹模型則可省去縮放步驟。', [
          '目前選擇：' + (R.mode === 'tree' ? '樹模型管線' : R.isStrict ? '防洩漏嚴格管線' : '線性／距離管線')
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
        '資料前處理有三種常見實務考量：線性／距離模型必須縮放（A2）與處理離群（A7）；樹模型可免縮放；嚴格防洩漏管線必須先切分再 fit。',
        '每一步都有對應的交互實驗：A1 補值、A2 縮放、A3 離散化、A4 編碼、A5 平衡、A6 選特徵、A7 離群值。',
        '務必把前處理步驟打包成 Pipeline，確保測試集與未來線上新資料使用完全相同的平均、標準差與編碼字典。'
      ];
    },
    aistudio: {
      operators: ['Read CSV', 'Split Data', 'Replace Missing Values', 'Nominal to Numerical', 'Normalize'],
      params: [['Split Data', '0.8 / 0.2'], ['Normalize', 'Z-transformation (樹模型可略)']],
      note: '在 AI Studio 中建議用 Group Models 把前處理與模型打包，再用一個 Apply Model 同時套用到測試集，徹底防止資料洩漏。',
      expect: () => ['產出無缺值、純數值、尺度一致的特徵表'],
      python: 'from sklearn.pipeline import make_pipeline\nfrom sklearn.impute import SimpleImputer\nfrom sklearn.preprocessing import StandardScaler',
      confirmed: false
    }
  });
})();
