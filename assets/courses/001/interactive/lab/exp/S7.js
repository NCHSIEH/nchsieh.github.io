/* S7 關聯規則與共現探勘流程（Apriori 逐層剪枝 vs FP-Growth 前綴樹 2 條管線） */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = [
    { key: 'id', label: '處方#', type: 'int' },
    { key: 'items', label: '藥品組合', type: 'text' },
    { key: 'n_items', label: '項數', type: 'int' }
  ];

  function makeRows(seed) {
    return LAB.data.rx(seed, 8).map(r => ({
      id: r.id,
      items: r.items.map(k => LAB.data.rxLabel(k)).join('、'),
      n_items: r.items.length
    }));
  }

  function simulate(rows, p) {
    const isFp = p.algo === 'fpgrowth';
    return { isFp, nTx: rows.length, minSup: 0.25, minConf: 0.6, topLift: 1.85 };
  }

  LAB.register({
    id: 'S7', group: 'S', title: '關聯規則探勘流程',
    module: { name: 'M4 關聯規則', url: '../m4/#p12' },
    goal: '透過全寬動畫流程圖比較「Apriori 逐層候選剪枝 (D1)」與「FP-Growth 前綴樹壓縮 (D2)」2 條關聯探勘管線，並強調用 Lift 過濾假關聯。',
    data: {
      name: 'assoc_flow',
      scenario: '8 張門診處方籃交易資料，示範從交易籃整理到 Lift 篩選高價值用藥規則的全流程',
      columns: COLS,
      small: makeRows
    },
    params: [
      { key: 'algo', label: '探勘演算法管線', type: 'choice', value: 'apriori', options: [{ v: 'apriori', label: 'Apriori 逐層剪枝 (D1)' }, { v: 'fpgrowth', label: 'FP-Growth 前綴樹 (D2)' }] }
    ],
    pseudo: [
      '1. 整理交易籃 / 處方籃資料格式',
      '2. 設定最小支持度 min_sup 門檻',
      '3. 找出頻繁項目集 (Apriori/FP)',
      '4. 依 min_conf 產生候選關聯規則 A → B',
      '5. 計算 Lift 增益度踢除假關聯 (Lift ≤ 1)',
      '6. 臨床檢核合理性並部署推薦提示'
    ],
    build(rows, p) {
      const R = simulate(rows, p), steps = [];

      const ALGO_ROWS = [
        { id: 's0', st: '1. 交易籃整理', alg: '處方清單 / 購物籃格式', use: '每筆是一組不重複項目，無目標標籤 y' },
        { id: 's1', st: '2. 過濾單項支持度', alg: 'Support(A) ≥ min_sup', use: '太罕見的項目先刪掉，縮小搜尋空間' },
        { id: 's2', st: '3. 找頻繁項目集', alg: R.isFp ? 'D2 FP-Growth 建前綴樹' : 'D1 Apriori 逐層剪枝', use: R.isFp ? '只掃資料 2 次，免產生大量候選集' : '子集不頻繁則超集必剪除' },
        { id: 's3', st: '4. 產生規則算信賴度', alg: 'Confidence = P(B | A)', use: '保留超過 min_conf 的規則 A → B' },
        { id: 's4', st: '5. Lift 過濾假關聯', alg: 'Lift = Conf ÷ Support(B)', use: '必須 Lift > 1 才代表真正正相關！' }
      ];

      function views(st) {
        const done = k => st.stage > k;
        const act = k => st.stage === k;
        const clsOf = k => act(k) ? 'hl' : (done(k) ? 'good' : 'c5');
        const layers = [
          [{ id: 'tx', label: '1. 處方交易籃', value: R.nTx + ' 張處方', shape: 'box', cls: clsOf(0), hl: act(0), sub: 'Basket 格式' }],
          [{ id: 'sup', label: '2. 門檻過濾', value: 'sup ≥ 0.25', shape: 'box', cls: clsOf(1), hl: act(1), sub: '保留頻繁單項' }],
          [{ id: 'mine', label: R.isFp ? '3. 建 FP-tree' : '3. 逐層 Ck→Lk', value: st.stage >= 2 ? (R.isFp ? '掃描 2 次' : '逐層剪枝') : '待探勘', shape: 'box', cls: clsOf(2), hl: act(2), sub: R.isFp ? 'D2 FP-Growth' : 'D1 Apriori' }],
          [{ id: 'rule', label: '4. 產生規則', value: 'conf ≥ 0.60', shape: 'box', cls: clsOf(3), hl: act(3), sub: 'A → B 信賴度' }],
          [{ id: 'lift', label: '5. Lift 驗收', value: st.stage >= 4 ? 'Lift=' + R.topLift : '防陷阱', shape: 'box', cls: clsOf(4), hl: act(4), sub: '剔除 Lift ≤ 1' }]
        ];
        const edges = [
          { from: 'tx', to: 'sup', active: st.stage === 1, cls: done(0) ? 'good' : 'c5' },
          { from: 'sup', to: 'mine', active: st.stage === 2, cls: done(1) ? 'good' : 'c5' },
          { from: 'mine', to: 'rule', active: st.stage === 3, cls: done(2) ? 'good' : 'c5' },
          { from: 'rule', to: 'lift', active: st.stage === 4, cls: done(3) ? 'good' : 'c5' }
        ];
        const main = {
          type: 'table', slot: 'main',
          title: '步驟與可用演算法對照（' + (R.isFp ? 'FP-Growth 管線' : 'Apriori 管線') + '）',
          cols: [{ key: 'st', label: '步驟' }, { key: 'alg', label: '可用演算法 / 指標' }, { key: 'use', label: '實務重點' }],
          rows: ALGO_ROWS.map((ar, idx) => ({
            id: ar.id,
            cells: [ar.st, { v: ar.alg, cls: idx === Math.min(st.stage, 4) ? 'hl' : (idx < st.stage ? 'good' : 'c0') }, ar.use],
            hl: idx === Math.min(st.stage, 4)
          }))
        };
        const side = {
          type: 'table', slot: 'side',
          title: '處方籃樣本與項目數',
          cols: [{ key: 'id', label: '#' }, { key: 'it', label: '藥品組合' }, { key: 'n', label: '項數', num: true, digits: 0 }],
          rows: rows.slice(0, 6).map(r => ({
            id: r.id,
            cells: ['#' + r.id, r.items, r.n_items]
          }))
        };
        const bottom = {
          type: 'network', slot: 'bottom', h: 340,
          title: '關聯規則探勘全流程圖（下方標註 D1 / D2 演算法）',
          layerLabels: ['1. 交易籃', '2. 支持度', '3. 頻繁集', '4. 信賴度', '5. Lift 篩選'],
          layers, edges
        };
        return [main, side, bottom];
      }

      const st = { stage: 0 };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '1. 整理處方交易籃', '關聯規則不預測單一標籤，而是找出「哪些藥品或症狀常在同一張處方裡一起出現」。', [
        '共 ' + R.nTx + ' 張門診處方籃'
      ]);
      st.stage = 1;
      add(1, '2. 過濾最小支持度', '先數每個單項藥品的出現比例（Support），刪掉低於 min_sup = 0.25 的罕見項目。', [
        '若項目太少可調降 min_sup；資料太大則調高防組合爆炸'
      ]);
      st.stage = 2;
      add(2, R.isFp ? '3. 建 FP-tree' : '3. Apriori 剪枝', R.isFp ? 'FP-Growth 依頻繁序重排交易並壓縮進前綴樹，不產生龐大候選集就直接挖頻繁集（D2）。' : 'Apriori 利用「不頻繁項目的超集必不頻繁」逐層剪枝，從 L1→C2→L2→L3（D1）。', [
        '兩者找出的頻繁項目集完全相同，FP-Growth 在大資料上快很多'
      ]);
      st.stage = 3;
      add(3, '4. 算規則信賴度', '對每個頻繁項目集拆成「前提 A → 結果 B」，保留條件機率 P(B|A) ≥ 0.60 的規則。', [
        'Confidence 高不代表真的有關聯！可能是 B 本身就超常開'
      ]);
      st.stage = 4;
      add(4, '5. Lift 過濾陷阱', '計算增益度 Lift = Confidence ÷ Support(B)。只有 Lift > 1 才代表開 A 真的會提高開 B 的機率！', [
        '範例強規則 Lift = ' + R.topLift + '（> 1，具正關聯）'
      ]);
      st.stage = 5;
      add(5, '6. 臨床檢核部署', '高 Lift 規則還要經藥師／醫師檢核（區分「標準併用療法」與「潛在交互作用提醒」）。', [
        '共現 ≠ 因果，部署前務必做領域專家審查'
      ]);
      while (steps.length < 10) {
        add(5, '演算法選用比較', '教學或小資料看懂剪枝原理用 D1 Apriori；實務大數據探勘一律選 D2 FP-Growth。', [
          '目前管線：' + (R.isFp ? 'FP-Growth' : 'Apriori')
        ]);
      }
      return steps;
    },
    keys(steps, rows, p) {
      const R = simulate(rows, p);
      return {
        n_tx: R.nTx, min_sup: R.minSup, min_conf: R.minConf,
        top_lift: R.topLift, mean_items: M.mean(rows.map(r => r.n_items))
      };
    },
    explain(steps, rows, p) {
      return [
        '關聯規則探勘提供 Apriori（逐層候選剪枝）與 FP-Growth（前綴樹壓縮）兩條管線，產出結果相同但 FP-Growth 效率更高。',
        '務必同時檢查 Support、Confidence 與 Lift：只有 Lift > 1 的規則才不是「因為 B 本身太常見」造成的假關聯。',
        '實務可應用於處方併用提醒、檢查套餐推薦或症狀共病組合分析。'
      ];
    },
    aistudio: {
      operators: ['Read CSV', 'Numerical to Binominal', 'FP-Growth', 'Create Association Rules'],
      params: [['FP-Growth › min support', '0.25'], ['Create Association Rules › min confidence', '0.6']],
      note: 'AI Studio 建議直接用 FP-Growth 接 Create Association Rules，並依 Lift 欄位排序檢視結果。',
      expect: () => ['產出高 Lift (>1) 的有效併用規則'],
      python: 'from mlxtend.frequent_patterns import fpgrowth, association_rules',
      confirmed: false
    }
  });
})();
