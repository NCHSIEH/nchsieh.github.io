/* S8 模型可解釋性與上線監控流程（XAI 歸因校正 vs MLOps 飄移監控 2 條管線） */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = [
    { key: 'id', label: '#', type: 'int' },
    { key: 'bmi', label: 'BMI', type: 'num' },
    { key: 'glu', label: '血糖', type: 'num' },
    { key: 'prob', label: '預測機率', type: 'num' }
  ];

  function makeRows(seed) {
    return LAB.data.clinic(seed, 8).map(o => ({
      id: o.id, bmi: o.bmi, glu: o.glu,
      prob: Number(M.clamp((o.glu - 85) / 80, 0.08, 0.95).toFixed(2))
    }));
  }

  function simulate(rows, p) {
    const isOps = p.focus_mode === 'mlops';
    return { isOps, baseVal: 0.38, topShap: 0.29, optTh: 0.40, driftScore: 0.18 };
  }

  LAB.register({
    id: 'S8', group: 'S', title: '可解釋性與上線監控',
    module: { name: 'M9 可解釋性', url: '../m9/#p11' },
    goal: '透過全寬動畫流程圖展示模型訓練完後的最後一哩路：「XAI 臨床可解釋與門檻校正 (I1 + B16)」以及「上線飄移監控與重訓 (MLOps)」。',
    data: {
      name: 'xai_mlops_flow',
      scenario: '8 位門診病人模型預測機率，示範訓練完成後如何解釋、校準門檻並監控上線表現',
      columns: COLS,
      small: makeRows
    },
    params: [
      { key: 'focus_mode', label: '落地管線類型', type: 'choice', value: 'xai', options: [{ v: 'xai', label: 'XAI 解釋＋門檻校正 (I1+B16)' }, { v: 'mlops', label: '上線監控＋飄移重訓 (MLOps)' }] }
    ],
    pseudo: [
      '1. 取得通過測試集驗收的最終模型',
      '2. 計算全域排列重要度 (整體看誰重要)',
      '3. 計算單筆 SHAP 歸因 (對個別病人解釋)',
      '4. 依醫療誤診代價校正判定門檻',
      '5. 上線推論並監控資料／概念飄移',
      '6. 觸發警報時以新資料重訓並 A/B 驗證'
    ],
    build(rows, p) {
      const R = simulate(rows, p), steps = [];

      const ALGO_ROWS = [
        { id: 's0', st: '1. 驗收後模型', alg: 'B7 / B9 / B12 / NN', use: '先通過 S2 測試集驗收才能進入落地階段' },
        { id: 's1', st: '2. 全域重要度', alg: 'I1 排列重要度 (Permutation)', use: '打亂欄位看掉分，確認模型沒學到假線索' },
        { id: 's2', st: '3. 單筆解釋歸因', alg: 'I1 SHAP 瀑布圖', use: '向醫師與病人說明「為什麼這筆判高風險」' },
        { id: 's3', st: '4. 決策門檻校正', alg: 'B16 ROC / PR 曲線找切點', use: '篩檢重 Recall 調低門檻；確診重 Precision' },
        { id: 's4', st: '5. 上線監控重訓', alg: R.isOps ? 'PSI 分布飄移 + G3 滾動重訓' : '定期稽核＋醫師回饋閉環', use: R.isOps ? '發現季節／群體變化即回流重訓' : '結合人機協作確保臨床安全' }
      ];

      function views(st) {
        const done = k => st.stage > k;
        const act = k => st.stage === k;
        const clsOf = k => act(k) ? 'hl' : (done(k) ? 'good' : 'c5');
        const layers = [
          [{ id: 'mod', label: '1. 驗收模型', value: '已通過測試', shape: 'box', w: 156, cls: clsOf(0), hl: act(0), sub: 'S2 產出模型' }],
          [{ id: 'glb', label: '2. 全域重要度', value: st.stage >= 1 ? '血糖最關鍵' : '待分析', shape: 'box', w: 156, cls: clsOf(1), hl: act(1), sub: 'I1 Permutation' }],
          [{ id: 'loc', label: '3. 單筆 SHAP', value: st.stage >= 2 ? 'φ=+0.29' : '待歸因', shape: 'box', w: 156, cls: clsOf(2), hl: act(2), sub: 'I1 個別病人解釋' }],
          [{ id: 'thr', label: '4. 門檻校正', value: st.stage >= 3 ? 'p ≥ 0.40' : '預設 0.50', shape: 'box', w: 156, cls: clsOf(3), hl: act(3), sub: 'B16 醫療成本權衡' }],
          [{ id: 'mon', label: '5. 監控與重訓', value: st.stage >= 4 ? (R.isOps ? '飄移監控中' : '臨床上線') : '待部署', shape: 'box', w: 156, cls: clsOf(4), hl: act(4), sub: R.isOps ? 'G3 飄移回流重訓' : '醫師稽核閉環' }]
        ];
        const edges = [
          { from: 'mod', to: 'glb', active: st.stage === 1, cls: done(0) ? 'good' : 'c5' },
          { from: 'glb', to: 'loc', active: st.stage === 2, cls: done(1) ? 'good' : 'c5' },
          { from: 'loc', to: 'thr', active: st.stage === 3, cls: done(2) ? 'good' : 'c5' },
          { from: 'thr', to: 'mon', active: st.stage === 4, cls: done(3) ? 'good' : 'c5' },
          { from: 'mon', to: 'mod', active: st.stage === 4 && R.isOps, back: true, cls: 'c3', label: '飄移重訓' }
        ];
        const main = {
          type: 'network', slot: 'main', w: 1520, h: 150,
          title: '模型落地與監控全流程圖（' + (R.isOps ? 'MLOps 監控重訓' : 'XAI 解釋與校正') + '）',
          layerLabels: ['1. 模型', '2. 全域解釋', '3. 單筆歸因', '4. 門檻校正', '5. 監控閉環'],
          layers, edges
        };
        const th = st.stage >= 3 ? R.optTh : 0.50;
        const side = {
          type: 'table', slot: 'side',
          title: '病人預測機率與門檻判定 (p ≥ ' + f(th, 2) + ')',
          cols: [{ key: 'id', label: '#' }, { key: 'glu', label: '血糖', num: true, digits: 0 }, { key: 'p', label: '機率', num: true, digits: 2 }, { key: 'tag', label: '判定' }],
          rows: rows.slice(0, 6).map(r => {
            const pos = r.prob >= th;
            return {
              id: r.id,
              cells: [r.id, r.glu, r.prob, { v: pos ? '高風險' : '低風險', cls: pos ? 'c1' : 'c0' }],
              hl: st.stage === 3 && Math.abs(r.prob - th) < 0.08
            };
          })
        };
        const bottom = {
          type: 'table', slot: 'bottom',
          title: '步驟與可用演算法對照（' + (R.isOps ? 'MLOps 監控重訓管線' : 'XAI 解釋與校正管線') + '）',
          cols: [{ key: 'st', label: '步驟' }, { key: 'alg', label: '可用演算法 / 方法' }, { key: 'use', label: '臨床落地意義' }],
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

      add(0, '1. 取得驗收模型', '模型準確率高還不夠！臨床上線前必須能解釋「為什麼這樣猜」、設定合理門檻並持續監控。', [
        '起點：通過 S2 測試集驗收的模型'
      ]);
      st.stage = 1;
      add(1, '2. 全域排列重要度 (I1)', '打亂各欄位看模型掉分多少，確認模型真的學到「血糖、BMI」等醫學合理特徵，而非病歷編號等假線索。', [
        '對應實驗：I1 排列重要度'
      ]);
      st.stage = 2;
      add(2, '3. 單筆 SHAP 歸因', '面對個別病人，用 SHAP 把預測機率拆成基準 φ₀ 加上每個特徵的貢獻，讓醫師知道風險來源。', [
        '例：基準 ' + f(R.baseVal, 2) + ' + 血糖貢獻 +' + f(R.topShap, 2)
      ]);
      st.stage = 3;
      add(3, '4. 醫療門檻校正 (B16)', '不盲從預設 p ≥ 0.50！篩檢任務漏診代價高，依 B16 PR/ROC 曲線把門檻調降至 0.40 提高 Recall。', [
        '門檻 0.50 → 0.40，及時攔截邊緣高風險病人'
      ]);
      st.stage = 4;
      add(4, '5. 上線監控資料飄移', '上線後定期監控新進病人的特徵分布是否偏移（Data Drift）或效能是否下降（Concept Drift）。', [
        R.isOps ? '橙色回流：偵測到飄移即收集新標籤觸發重訓' : '搭配醫師人工稽核形成人機安全閉環'
      ]);
      st.stage = 5;
      add(5, '6. 安全重訓與 A/B 驗證', '重訓後的新版本模型需先經過與舊版對照（Shadow / A/B 測試），確認更穩定才正式切換。', [
        '完整閉環：前處理(S1) → 訓練(S2) → 解釋與監控(S8)'
      ]);
      while (steps.length < 10) {
        add(5, '臨床 AI 落地三原則', '可解釋（I1 SHAP）、可校準（B16 門檻）、可監控（G3 飄移追蹤），缺一不可。', [
          '目前管線：' + (R.isOps ? 'MLOps 飄移監控' : 'XAI 解釋與門檻校正')
        ]);
      }
      return steps;
    },
    keys(steps, rows, p) {
      const R = simulate(rows, p);
      return {
        n_rows: rows.length, base_val: R.baseVal, top_shap: R.topShap,
        opt_th: R.optTh, mean_prob: M.mean(rows.map(r => r.prob))
      };
    },
    explain(steps, rows, p) {
      return [
        '模型通過測試集只是起點，落地前需做全域排列重要度與單筆 SHAP 歸因（I1），避免模型學到資料洩漏或假相關。',
        '臨床決策門檻必須依漏診與誤報的醫療成本調整（B16），而非固定用 0.50。',
        '上線後應持續監控特徵分布與預測誤差飄移，必要時回流新資料安全重訓（MLOps）。'
      ];
    },
    aistudio: {
      operators: ['Apply Model', 'Explain Predictions', 'Find Threshold', 'Performance'],
      params: [['Explain Predictions', 'Global & Local weights'], ['Find Threshold', 'Cost-sensitive']],
      note: 'AI Studio 的 Explain Predictions 運算子可直接產出每筆預測的特徵權重解釋，搭配 Find Threshold 設定成本最佳切點。',
      expect: () => ['產出 SHAP/局部解釋並完成門檻校正'],
      python: 'import shap\nexplainer = shap.Explainer(model, X_train)\nshap_values = explainer(X_test)',
      confirmed: false
    }
  });
})();
