/* S4 深度學習標準流程 */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = [
    { key: 'epoch', label: 'Epoch', type: 'int' },
    { key: 'train_loss', label: 'Train Loss', type: 'num' },
    { key: 'val_loss', label: 'Val Loss', type: 'num' },
    { key: 'lr', label: '學習率', type: 'num' }
  ];

  function makeRows(seed) {
    const r = LAB.rng(9400 + seed);
    return [1, 2, 3, 4, 5, 6].map(ep => {
      const tr = Number((0.95 * Math.exp(-0.32 * ep) + 0.06 + r() * 0.02).toFixed(3));
      const va = Number((tr + 0.03 + (ep > 4 ? (ep - 4) * 0.035 : 0)).toFixed(3));
      return { id: ep, epoch: ep * 5, train_loss: tr, val_loss: va, lr: 0.001 };
    });
  }

  function simulate(rows, p) {
    const archName = p.arch === 'cnn' ? 'CNN 卷積網路' : p.arch === 'lstm' ? 'LSTM 序列網路' : 'MLP 全連接網路';
    const bestRow = rows.slice().sort((a, b) => a.val_loss - b.val_loss)[0];
    return { archName, bestEp: bestRow.epoch, bestVal: bestRow.val_loss };
  }

  LAB.register({
    id: 'S4', group: 'S', title: '深度學習流程',
    module: { name: 'M5 深度學習', url: '../m5/' },
    goal: '透過動畫走過深度學習訓練迴圈：張量正規化 → 定義網路層 → 前向算損失 → 反向傳播算梯度 → 優化器更新權重 → 驗證早停。',
    data: {
      name: 'dl_flow',
      scenario: '6 個訓練檢查點的 Train / Val Loss，示範深度學習完整訓練與早停流程',
      columns: COLS,
      small: makeRows
    },
    params: [
      { key: 'arch', label: '神經網路架構', type: 'choice', value: 'mlp', options: [{ v: 'mlp', label: 'MLP 表格資料' }, { v: 'cnn', label: 'CNN 影像特徵' }, { v: 'lstm', label: 'LSTM 時間序列' }] }
    ],
    pseudo: [
      '1. 資料正規化並切分 Train / Val / Test',
      '2. 依資料型態設計神經網路架構',
      '3. 前向傳播算出預測值與 Loss',
      '4. 反向傳播計算每層權重梯度',
      '5. 優化器 (Adam) 依梯度更新權重',
      '6. 監控 Val Loss 觸發早停',
      '7. 載入最佳權重並在測試集推論'
    ],
    build(rows, p) {
      const R = simulate(rows, p), steps = [];

      function views(st) {
        const done = k => st.stage > k;
        const act = k => st.stage === k;
        const clsOf = k => act(k) ? 'hl' : (done(k) ? 'good' : 'c5');
        const layers = [
          [{ id: 'ten', label: '1. 張量正規化', value: 'Train/Val/Test', shape: 'box', cls: clsOf(0), hl: act(0), sub: '分批 Mini-batch' }],
          [{ id: 'arch', label: '2. ' + R.archName, value: p.arch.toUpperCase(), shape: 'box', cls: clsOf(1), hl: act(1), sub: 'F1 / F3 / F4' }],
          [{ id: 'fwd', label: '3. 前向與 Loss', value: st.stage >= 2 ? '算誤差' : '待計算', shape: 'box', cls: clsOf(2), hl: act(2), sub: '預測 ŷ 與交叉熵' }],
          [{ id: 'bwd', label: '4. 反向＋Adam', value: st.stage >= 3 ? '∂L/∂W' : '待更新', shape: 'box', cls: act(3) ? 'c3' : clsOf(3), hl: act(3), sub: 'F2 優化器' }],
          [{ id: 'stop', label: '5. 早停與部署', value: st.stage >= 5 ? 'Ep=' + R.bestEp : '監控中', shape: 'box', cls: clsOf(5), hl: act(5), sub: 'Val 最低點存檔' }]
        ];
        const edges = [
          { from: 'ten', to: 'arch', active: st.stage === 1, cls: done(0) ? 'good' : 'c5' },
          { from: 'arch', to: 'fwd', active: st.stage === 2, cls: done(1) ? 'good' : 'c5' },
          { from: 'fwd', to: 'bwd', active: st.stage === 3, cls: done(2) ? 'good' : 'c5' },
          { from: 'bwd', to: 'arch', active: st.stage === 3 || st.stage === 4, back: true, cls: 'c3', label: '梯度更新' },
          { from: 'fwd', to: 'stop', active: st.stage === 5, cls: done(4) ? 'good' : 'c5' }
        ];
        const main = {
          type: 'network', slot: 'main',
          title: '深度學習訓練迴圈（橙色回流＝反向傳播更新）',
          layerLabels: ['準備', '架構', '前向', '反向更新', '驗收'],
          layers, edges
        };
        const shown = st.stage >= 4 ? rows.length : st.stage >= 2 ? Math.min(3, rows.length) : 0;
        const side = {
          type: 'table', slot: 'side',
          title: '訓練 vs 驗證損失變化（Epoch 監控）',
          cols: [{ key: 'ep', label: 'Ep', num: true, digits: 0 }, { key: 'tr', label: 'Train', num: true, digits: 3 }, { key: 'va', label: 'Val', num: true, digits: 3 }],
          rows: rows.map((r, i) => ({
            id: r.id,
            cells: [
              r.epoch,
              i < shown ? r.train_loss : null,
              i < shown ? { v: f(r.val_loss, 3), cls: r.epoch === R.bestEp ? 'good' : (r.epoch > R.bestEp ? 'bad' : null) } : null
            ],
            hl: st.stage >= 5 && r.epoch === R.bestEp
          }))
        };
        const bottom = {
          type: 'line', slot: 'bottom',
          title: 'Train Loss (藍) vs Val Loss (紅) 監控曲線',
          axes: { x: { label: 'Epoch', min: 5, max: 30 }, y: { label: 'Loss', min: 0, max: 1.0 } },
          series: [
            { id: 'tr', label: 'Train Loss', pts: rows.slice(0, Math.max(1, shown)).map(r => [r.epoch, r.train_loss]), cls: 'c0', dots: true },
            { id: 'va', label: 'Val Loss', pts: rows.slice(0, Math.max(1, shown)).map(r => [r.epoch, r.val_loss]), cls: 'c1', dots: true }
          ],
          marker: st.stage >= 5 ? { x: R.bestEp, y: R.bestVal, label: '早停 Ep=' + R.bestEp } : null
        };
        return [main, side, bottom];
      }

      const st = { stage: 0 };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '1. 張量正規化與切批', '深度學習對輸入尺度敏感，需先把數值縮放到接近 [0,1] 或 Z 分數，並切成 Mini-batch 訓練。', [
        '切分：Train（學權重）/ Val（決定何時停）/ Test（最後驗收）'
      ]);
      st.stage = 1;
      add(1, '2. 定義網路架構', '依資料型態選架構：表格用 MLP、影像空間用 CNN（F3）、時間序列用 LSTM（F4）。', [
        '目前架構：' + R.archName
      ]);
      st.stage = 2;
      add(2, '3. 前向傳播與 Loss', '資料由左向右流過每一層乘上權重與激活函數，算出預測 ŷ 與實際值 y 的損失函數。', [
        '第 5 輪 Train Loss = ' + f(rows[0].train_loss, 3)
      ]);
      st.stage = 3;
      add(3, '4. 反向傳播算梯度', '從輸出損失往回（橙色箭頭）套用連鎖律，算出每個權重該往哪個方向微調。', [
        '對應實驗：F1 反向傳播'
      ]);
      st.stage = 3;
      add(4, '5. Adam 優化器更新', '利用一階動量與自適應步幅更新權重，避開狹長山谷的劇烈震盪（F2）。', [
        '學習率 η = 0.001，穩定往低損失移動'
      ]);
      st.stage = 4;
      add(5, '6. 持續迭代並監控', '觀察右表與下方曲線：Train Loss 一路下降，但 Epoch ' + R.bestEp + ' 之後 Val Loss 開始反彈！', [
        'Val Loss 反彈代表模型開始背誦訓練雜訊（過擬合）'
      ]);
      st.stage = 5;
      add(5, '7. 早停機制保存最佳', '在驗證損失最低點（Epoch ' + R.bestEp + '，Val=' + f(R.bestVal, 3) + '）自動存檔並停止訓練。', [
        '最佳檢查點：Epoch = ' + R.bestEp + '，Val Loss = ' + f(R.bestVal, 3)
      ]);
      st.stage = 6;
      add(6, '8. 載入最佳權重部署', '推論時凍結權重並關閉 Dropout，以「驗證表現最好」的那一版模型上線服務。', [
        '切記：永遠部署 Val Loss 最低的權重，而不是最後一輪！'
      ]);
      while (steps.length < 10) {
        add(6, '防止深度學習過擬合', '除了早停，實務還會搭配 Dropout、Weight Decay (L2) 與資料增強（Data Augmentation）。', [
          '最佳 Epoch = ' + R.bestEp
        ]);
      }
      return steps;
    },
    keys(steps, rows, p) {
      const R = simulate(rows, p);
      const last = rows[rows.length - 1];
      return {
        best_ep: R.bestEp, best_val: R.bestVal,
        ep0_tr: rows[0].train_loss, ep0_va: rows[0].val_loss,
        last_tr: last.train_loss, last_va: last.val_loss
      };
    },
    explain(steps, rows, p) {
      const R = simulate(rows, p);
      return [
        '深度學習的核心是一個反覆執行的迴圈：前向傳播算損失 → 反向傳播算梯度 → 優化器更新權重。',
        '因為神經網路參數量大、容易過擬合，必須持續監控驗證集損失，在 Val Loss 最低點（本例 Epoch ' + R.bestEp + '）觸發早停存檔。',
        '不同資料選不同骨幹：表格用 MLP、影像用 CNN、序列用 LSTM 或 Transformer。'
      ];
    },
    aistudio: {
      operators: ['Read CSV', 'Normalize', 'Split Data', 'Deep Learning (TensorFlow/Keras)', 'Apply Model'],
      params: [['Deep Learning › epochs', '30'], ['early stopping', 'true']],
      note: 'AI Studio 內建 Deep Learning 運算子（H2O 多層感知器）；若要建 CNN/LSTM 或早停控制，常使用 Execute Python 呼叫 PyTorch/Keras。',
      expect: (steps, rows, p) => {
        const R = simulate(rows, p);
        return ['最佳驗證點 Epoch = ' + R.bestEp + '，Val Loss = ' + f(R.bestVal, 3)];
      },
      python: 'model.compile(optimizer="adam", loss="binary_crossentropy")\nmodel.fit(X_tr, y_tr, validation_data=(X_va, y_va), callbacks=[EarlyStopping(patience=3)])',
      confirmed: false
    }
  });
})();
