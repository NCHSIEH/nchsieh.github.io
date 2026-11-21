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
    const isSeq = p.algo === 'prefixspan';
    /* 真的跑一次 Apriori：逐層找 support ≥ minSup 的項目集，再拆成規則 A→B 算 confidence、lift */
    const minSup = 0.25, minConf = 0.6, n = rows.length;
    const tx = rows.map(r => r.items.split('、'));
    const sup = set => tx.filter(t => set.every(x => t.includes(x))).length / n;
    let level = [...new Set(tx.flat())].sort().map(x => [x]).filter(s0 => sup(s0) >= minSup), freq = level.slice();
    while (level.length) {
      const next = [], seen = new Set();
      level.forEach(a => level.forEach(b => {
        const u = [...new Set([...a, ...b])].sort();
        if (u.length === a.length + 1 && !seen.has(u.join('|')) && sup(u) >= minSup) { seen.add(u.join('|')); next.push(u); }
      }));
      freq = freq.concat(next); level = next;
    }
    const rules = [];
    freq.filter(s0 => s0.length >= 2).forEach(s0 => {
      for (let mask = 1; mask < (1 << s0.length) - 1; mask++) {
        const A = s0.filter((_, i) => mask & (1 << i)), B = s0.filter((_, i) => !(mask & (1 << i)));
        const conf = sup(s0) / sup(A), lift = conf / sup(B);
        if (conf >= minConf) rules.push({ A, B, sup: sup(s0), conf, lift });
      }
    });
    rules.sort((a, b) => b.lift - a.lift || b.conf - a.conf || b.sup - a.sup);
    const top = rules[0] || null;
    return { isFp, isSeq, nTx: n, minSup, minConf, nFreq: freq.length, nRules: rules.length, top, topLift: top ? top.lift : 0, topConf: top ? top.conf : 0 };
  }

  LAB.register({
    id: 'S7', group: 'S', title: '關聯規則探勘流程',
    module: { name: 'M4 關聯規則', url: '../m4/#p12' },
    goal: '透過全寬動畫流程圖比較「Apriori 逐層剪枝 (D1)」、「FP-Growth 前綴樹 (D2)」與「PrefixSpan 序列探勘 (D3)」3 條管線，並結合 D4 零不變指標 Kulczynski 與負關聯規則過濾假關聯。',
    data: {
      name: 'assoc_flow',
      scenario: '8 張門診處方籃交易資料，示範從交易籃／序列整理到 Lift、Kulczynski 與負關聯篩選的全流程',
      columns: COLS,
      small: makeRows
    },
    params: [
      { key: 'algo', label: '探勘演算法管線', type: 'choice', value: 'apriori', options: [{ v: 'apriori', label: 'Apriori 逐層剪枝 (D1)' }, { v: 'fpgrowth', label: 'FP-Growth 前綴樹 (D2)' }, { v: 'prefixspan', label: 'PrefixSpan 序列探勘 (D3)' }] }
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
        { id: 's0', st: '1. 交易籃整理', alg: '無序處方籃 (D1/D2) / 有序門診序列 (D3)', use: '同一處方看共現用籃子；跨次就醫看先後順序用 D3 PrefixSpan' },
        { id: 's1', st: '2. 過濾單項支持度', alg: 'Support(A) ≥ min_sup', use: '太罕見的項目先刪掉，縮小搜尋空間' },
        { id: 's2', st: '3. 找頻繁項目集', alg: R.isFp ? 'D2 FP-Growth 建前綴樹 / D3 前綴投影' : 'D1 Apriori 逐層剪枝', use: R.isFp ? '只掃資料 2 次，免產生大量候選集' : '子集不頻繁則超集必剪除' },
        { id: 's3', st: '4. 產生規則算信賴度', alg: 'Confidence = P(B | A)', use: '保留超過 min_conf 的正向規則 A → B 或負關聯 A → ¬B (D4)' },
        { id: 's4', st: '5. 多指標過濾假關聯', alg: 'Lift / Kulczynski / Zhang (D4)', use: 'Lift > 1 為正相關；大資料庫加看零不變指標 Kulczynski (D4)' }
      ];

      function views(st) {
        const done = k => st.stage > k;
        const act = k => st.stage === k;
        const clsOf = k => act(k) ? 'hl' : (done(k) ? 'good' : 'c5');
        const layers = [
          [
            { id: 'tx', label: '1a. 處方交易籃', value: R.nTx + ' 張處方', shape: 'box', w: 142, cls: clsOf(0), hl: act(0), sub: 'Basket 集合格式' },
            { id: 'cln', label: '1b. 項目去重正規', value: '無目標 y', shape: 'box', w: 142, cls: clsOf(0), hl: act(0), sub: '同處方藥品不重複計' }
          ],
          [
            { id: 'sup', label: '2a. 保留頻繁單項', value: 'sup ≥ 0.25', shape: 'box', w: 142, cls: clsOf(1), hl: act(1), sub: '滿足最小支持度 L₁' },
            { id: 'flt', label: '2b. 剪除罕見單項', value: 'sup < 0.25', shape: 'box', w: 142, cls: st.stage >= 1 ? 'c4' : 'c5', hl: act(1), sub: '防後續組合指數爆炸' }
          ],
          [
            { id: 'ap', label: '3a. Apriori 逐層', value: !R.isFp && !R.isSeq && st.stage >= 2 ? 'C₂→L₂→L₃' : '候選剪枝', shape: 'box', w: 142, cls: !R.isFp && !R.isSeq ? clsOf(2) : 'c5', hl: !R.isFp && !R.isSeq && act(2), dim: R.isFp || R.isSeq, sub: 'D1 子集不頻繁即剪' },
            { id: 'fp', label: '3b. FP-Growth 樹', value: R.isFp && st.stage >= 2 ? '只掃 2 次' : '前綴樹壓縮', shape: 'box', w: 142, cls: R.isFp ? clsOf(2) : 'c5', hl: R.isFp && act(2), dim: !R.isFp, sub: 'D2 免生龐大候選集' },
            { id: 'ps', label: '3c. PrefixSpan 投影', value: R.isSeq && st.stage >= 2 ? '有序 A→B→C' : '後綴投影庫', shape: 'box', w: 142, cls: R.isSeq ? clsOf(2) : 'c5', hl: R.isSeq && act(2), dim: !R.isSeq, sub: 'D3 保留跨次門診時序' }
          ],
          [
            { id: 'freq', label: R.isSeq ? '4a. 頻繁時序樣式' : '4a. 頻繁項目集 Lk', value: R.isSeq ? '〈A → B → C〉' : '共現藥品組', shape: 'box', w: 142, cls: clsOf(2), hl: act(2), sub: R.isSeq ? '區分先 A 後 B 順序' : 'D1/D2 結果完全相同' },
            { id: 'rule', label: '4b. 拆解規則 A→B', value: '枚舉前提/結果', shape: 'box', w: 142, cls: clsOf(3), hl: act(3), sub: '含負關聯 A→¬B (D4)' }
          ],
          [
            { id: 'conf', label: '5a. 信賴度達標', value: 'conf ≥ 0.60', shape: 'box', w: 142, cls: clsOf(3), hl: act(3), sub: 'P(B|A) = Sup(AB)/Sup(A)' },
            { id: 'wkr', label: '5b. 剔除低信賴規則', value: 'conf < 0.60', shape: 'box', w: 142, cls: st.stage >= 3 ? 'c4' : 'c5', hl: act(3), sub: '條件機率過低不採納' }
          ],
          [
            { id: 'lift', label: '6a. Lift / Kulc 驗收', value: st.stage >= 4 ? (R.top ? 'Lift=' + f(R.topLift, 2) : '無規則') : '抗零交易', shape: 'box', w: 142, cls: clsOf(4), hl: act(4), sub: 'D4 Kulczynski / Zhang' },
            { id: 'drop', label: '6b. 負關聯 / 假關聯', value: 'A→¬B 互斥', shape: 'box', w: 142, cls: st.stage >= 4 ? 'bad' : 'c5', hl: act(4), sub: 'D4 區分假關聯與禁忌' }
          ]
        ];
        const activeMine = R.isSeq ? 'ps' : R.isFp ? 'fp' : 'ap';
        const edges = [
          { from: 'tx', to: 'sup', active: st.stage === 1, cls: done(0) ? 'good' : 'c5' },
          { from: 'cln', to: 'flt', active: st.stage === 1, cls: done(0) ? 'c4' : 'c5' },
          { from: 'sup', to: activeMine, active: st.stage === 2, cls: done(1) ? 'good' : 'c5' },
          { from: activeMine, to: 'freq', active: st.stage === 2, cls: done(1) ? 'good' : 'c5' },
          { from: activeMine, to: 'rule', active: st.stage === 3, cls: done(2) ? 'good' : 'c5' },
          { from: 'freq', to: 'conf', active: st.stage === 3, cls: done(2) ? 'good' : 'c5' },
          { from: 'rule', to: 'conf', active: st.stage === 3, cls: done(2) ? 'good' : 'c5' },
          { from: 'rule', to: 'wkr', active: st.stage === 3, cls: done(2) ? 'c4' : 'c5' },
          { from: 'conf', to: 'lift', active: st.stage === 4, cls: done(3) ? 'good' : 'c5' },
          { from: 'conf', to: 'drop', active: st.stage === 4, cls: st.stage >= 4 ? 'bad' : 'c5' }
        ];
        const main = {
          type: 'network', slot: 'main', w: 1480, h: 250,
          title: '關聯與序列探勘全流程圖（' + (R.isSeq ? 'PrefixSpan 序列管線' : R.isFp ? 'FP-Growth 管線' : 'Apriori 管線') + '）',
          layerLabels: ['1. 交易籃/序列', '2. 支持度剪枝', '3. 探勘演算法', '4. 規則拆解', '5. 信賴度過濾', '6. 多指標驗收'],
          layers, edges
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
          type: 'table', slot: 'bottom',
          title: '步驟與可用演算法對照（' + (R.isFp ? 'FP-Growth 管線' : 'Apriori 管線') + '）',
          cols: [{ key: 'st', label: '步驟' }, { key: 'alg', label: '可用演算法 / 指標' }, { key: 'use', label: '實務重點' }],
          rows: ALGO_ROWS.map((ar, idx) => ({
            id: ar.id,
            cells: [ar.st, { v: ar.alg, cls: idx === Math.min(st.stage, 4) ? 'hl' : (idx < st.stage ? 'good' : 'c0') }, ar.use],
            hl: idx === Math.min(st.stage, 4)
          }))
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
        R.top ? ('最強規則 ' + R.top.A.join('+') + ' → ' + R.top.B.join('+') + '：Conf ' + f(R.top.conf, 2) + '、Lift ' + f(R.top.lift, 2) + (R.top.lift > 1 ? '（> 1，正關聯）' : '（≤ 1，沒有關聯）')) : '這 ' + R.nTx + ' 張處方沒有規則達到門檻，可調低 min_sup 或 min_conf'
      ]);
      st.stage = 5;
      add(5, '6. 臨床檢核部署', '高 Lift 規則還要經藥師／醫師檢核（區分「標準併用療法」與「潛在交互作用提醒」）。', [
        '共現 ≠ 因果，部署前務必做領域專家審查'
      ]);
      add(5, '時序進化：D3 序列探勘', 'Apriori 與 FP-Growth 不分先後順序；若要挖跨次門診的「先開 A 後開 B」病程軌跡，必用 D3 PrefixSpan 前綴投影！', [
        '切換上方管線至「PrefixSpan 序列探勘 (D3)」即可查看完整流程'
      ]);
      add(5, '常見踩雷：零交易膨脹', '大型醫院跨科資料庫有大量「兩藥皆無」的零交易，會讓傳統 Lift 嚴重暴漲失真；務必加看 D4 零不變指標 Kulczynski！', [
        '對應實驗：D4 進階評估指標與負關聯規則 A → ¬B'
      ]);
      add(5, '三條探勘管線選型', '教學理解用 D1 Apriori；大數據無序處方籃用 D2 FP-Growth；跨次門診時序用 D3 PrefixSpan；防假關聯與禁忌看 D4。', [
        '目前管線：' + (R.isSeq ? 'PrefixSpan 序列' : R.isFp ? 'FP-Growth' : 'Apriori')
      ]);
      add(5, '點擊編號直達實驗', '點擊下方對照表的 D1–D4 編號即可直接開啟互動實驗，體驗零交易如何讓 Lift 膨脹而 Kulczynski 恆定不變！', [
        '建議路線：D1 Apriori → D2 FP-Growth → D3 PrefixSpan → D4 進階指標'
      ]);
      return steps;
    },
    keys(steps, rows, p) {
      const R = simulate(rows, p);
      return {
        n_tx: R.nTx, min_sup: R.minSup, min_conf: R.minConf,
        top_lift: R.topLift, top_conf: R.topConf, n_freq: R.nFreq, n_rules: R.nRules, mean_items: M.mean(rows.map(r => r.n_items))
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
