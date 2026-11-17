/* S4 深度學習標準流程（MLP／CNN／LSTM／Autoencoder 4 大主流架構管線＋可用演算法） */
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
    const arch = p.arch || 'mlp';
    const archName = arch === 'cnn' ? 'CNN 影像卷積' : arch === 'lstm' ? 'LSTM 序列記憶' : arch === 'ae' ? 'Autoencoder 自編碼' : 'MLP 全連接網路';
    const bestRow = rows.slice().sort((a, b) => a.val_loss - b.val_loss)[0];
    return { arch, archName, bestEp: bestRow.epoch, bestVal: bestRow.val_loss };
  }

  LAB.register({
    id: 'S4', group: 'S', title: '深度學習流程',
    module: { name: 'M5 深度學習', url: '../m5/' },
    goal: '透過全寬動畫流程圖對照深度學習 4 大主流架構管線（MLP 表格、CNN 影像、LSTM 序列、Autoencoder 無監督異常），標註各步對應 F1–F5 演算法。',
    data: {
      name: 'dl_flow',
      scenario: '6 個訓練檢查點的 Train / Val Loss，示範 4 種深度學習架構的訓練與早停流程',
      columns: COLS,
      small: makeRows
    },
    params: [
      { key: 'arch', label: '深度學習架構', type: 'choice', value: 'mlp', options: [{ v: 'mlp', label: 'MLP 全連接 (表格)' }, { v: 'cnn', label: 'CNN 卷積 (影像)' }, { v: 'lstm', label: 'LSTM 循環 (序列)' }, { v: 'ae', label: 'Autoencoder (異常)' }] }
    ],
    pseudo: [
      '1. 資料正規化並切分 Train / Val / Test',
      '2. 依資料型態建構網路層架構',
      '3. 前向傳播算出預測與 Loss',
      '4. 反向傳播計算每層權重梯度',
      '5. 優化器 (SGD/Momentum/Adam) 更新',
      '6. 監控 Val Loss 觸發早停',
      '7. 載入最佳權重推論或抓異常'
    ],
    build(rows, p) {
      const R = simulate(rows, p), steps = [];
      const isCnn = R.arch === 'cnn', isLstm = R.arch === 'lstm', isAe = R.arch === 'ae';

      const ALGO_ROWS = [
        { id: 's0', st: '1. 張量準備', alg: isCnn ? '像素 [0,1] + 資料增強' : isLstm ? '滑動視窗切序列' : isAe ? '僅取正常樣本訓練' : 'A2 Z 分數標準化', use: 'Mini-batch 分批送入 GPU 加速' },
        { id: 's1', st: '2. 網路骨幹', alg: isCnn ? 'F3 卷積 + ReLU + 池化' : isLstm ? 'F4 遺忘/輸入/輸出閘' : isAe ? 'F5 編碼器→瓶頸 z→解碼' : 'F1 全連接層 + ReLU/Sigmoid', use: '依資料結構選擇對應網路層' },
        { id: 's2', st: '3. 前向與 Loss', alg: isAe ? '重建誤差 MSE(x, x̂)' : '交叉熵 / MSE 損失', use: '衡量預測與目標的差距' },
        { id: 's3', st: '4. 反向＋優化器', alg: isLstm ? 'BPTT + F2 Adam' : 'F1 反向傳播 + F2 Adam', use: '梯度裁剪防爆炸，Adam 自動調步幅' },
        { id: 's4', st: '5. 早停與部署', alg: isAe ? '設重建誤差門檻抓異常' : 'Early Stopping + Dropout', use: 'Val Loss 最低點存檔，不取最後一輪' }
      ];

      function views(st) {
        const done = k => st.stage > k;
        const act = k => st.stage === k;
        const clsOf = k => act(k) ? 'hl' : (done(k) ? 'good' : 'c5');
        const layers = [
          [{ id: 'ten', label: isCnn ? '1. 影像張量' : isLstm ? '1. 序列視窗' : isAe ? '1. 正常樣本' : '1. 表格張量', value: 'Train/Val/Test', shape: 'box', w: 156, cls: clsOf(0), hl: act(0), sub: isCnn ? '正規化+資料增強' : isLstm ? 't−k … t 切片' : isAe ? '無監督訓練' : 'A2 標準化' }],
          [{ id: 'arch', label: '2. ' + R.archName, value: R.arch.toUpperCase(), shape: 'box', w: 156, cls: clsOf(1), hl: act(1), sub: isCnn ? 'F3 Conv+Pool' : isLstm ? 'F4 閘門記憶' : isAe ? 'F5 3-1-3 瓶頸' : 'F1 Dense 網路' }],
          [{ id: 'fwd', label: '3. 前向與 Loss', value: st.stage >= 2 ? (isAe ? '重建 MSE' : '算損失') : '待計算', shape: 'box', w: 156, cls: clsOf(2), hl: act(2), sub: isAe ? '‖x − x̂‖²' : '交叉熵 / MSE' }],
          [{ id: 'bwd', label: '4. 反向＋Adam', value: st.stage >= 3 ? '∂L/∂W' : '待更新', shape: 'box', w: 156, cls: act(3) ? 'c3' : clsOf(3), hl: act(3), sub: 'F1 連鎖律 · F2 Adam' }],
          [{ id: 'stop', label: isAe ? '5. 異常判定' : '5. 早停部署', value: st.stage >= 5 ? (isAe ? '誤差>門檻' : 'Ep=' + R.bestEp) : '監控中', shape: 'box', w: 156, cls: clsOf(5), hl: act(5), sub: isAe ? '高誤差＝異常' : 'Val 最低存檔' }]
        ];
        const edges = [
          { from: 'ten', to: 'arch', active: st.stage === 1, cls: done(0) ? 'good' : 'c5' },
          { from: 'arch', to: 'fwd', active: st.stage === 2, cls: done(1) ? 'good' : 'c5' },
          { from: 'fwd', to: 'bwd', active: st.stage === 3, cls: done(2) ? 'good' : 'c5' },
          { from: 'bwd', to: 'arch', active: st.stage === 3 || st.stage === 4, back: true, cls: 'c3', label: '梯度更新' },
          { from: 'fwd', to: 'stop', active: st.stage === 5, cls: done(4) ? 'good' : 'c5' }
        ];
        const shown = st.stage >= 4 ? rows.length : st.stage >= 2 ? Math.min(3, rows.length) : 0;
        const main = {
          type: 'network', slot: 'main', w: 1120, h: 240,
          title: '深度學習訓練迴圈流程圖（' + R.archName + '｜橙色回流＝反向傳播更新）',
          layerLabels: ['1. 張量', '2. 網路架構', '3. 前向', '4. 反向更新', '5. 驗收'],
          layers, edges
        };
        const side = {
          type: 'table', slot: 'side',
          title: '訓練 vs 驗證損失監控（Epoch）',
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
          type: 'table', slot: 'bottom',
          title: '步驟與可用演算法對照（' + R.archName + '）',
          cols: [{ key: 'st', label: '步驟' }, { key: 'alg', label: '可用演算法 / 模組' }, { key: 'use', label: '實務重點' }],
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

      add(0, '1. 張量正規化與切批', isCnn ? '影像像素縮放到 [0,1] 並做翻轉／平移資料增強，切成 Mini-batch 送入網路。' : isLstm ? '時間序列先標準化再切滑動視窗（不能打亂時間順序！）。' : isAe ? 'Autoencoder 只用正常樣本學壓縮還原，讓不合群的異常點還原失敗。' : '表格資料先標準化再切分 Train / Val / Test。', [
        '目前管線：' + R.archName
      ]);
      st.stage = 1;
      add(1, '2. 建構網路骨幹', isCnn ? 'CNN 用 3×3 卷積核抓空間邊緣紋理，經 ReLU 去負值再用 2×2 池化濃縮（F3）。' : isLstm ? 'LSTM 透過遺忘閘、輸入閘與細胞狀態高速公路保留長期記憶（F4）。' : isAe ? '設計沙漏形 3-1-3 瓶頸層，強迫網路只記住多數人的主要變化（F5）。' : 'MLP 堆疊全連接層與非線性激活函數（F1）。', [
        '對應實驗：' + (isCnn ? 'F3 CNN' : isLstm ? 'F4 RNN/LSTM' : isAe ? 'F5 Autoencoder' : 'F1 前向與反向傳播')
      ]);
      st.stage = 2;
      add(2, '3. 前向傳播與 Loss', '資料從左向右流過各層算出預測 ŷ，再用交叉熵（分類）或 MSE（迴歸／重建）算損失。', [
        '第 5 輪 Train Loss = ' + f(rows[0].train_loss, 3)
      ]);
      st.stage = 3;
      add(3, '4. 反向傳播算梯度', '從輸出損失往回（橙色回流箭頭）套用連鎖律，算出每一層權重的梯度 ∂L/∂W。', [
        'LSTM 需沿時間反向傳播（BPTT），靠細胞加法避免梯度消失'
      ]);
      st.stage = 3;
      add(4, '5. 優化器更新 (F2)', '用 Adam 結合一階動量與二階自適應學習率更新權重，穩定走下損失曲面（F2）。', [
        '學習率 η = 0.001（優化器比較見 F2）'
      ]);
      st.stage = 4;
      add(5, '6. 監控 Val Loss', '觀察右表：Train Loss 持續下降，但 Epoch ' + R.bestEp + ' 之後 Val Loss 開始反彈過擬合！', [
        'Val Loss 反彈＝模型開始背誦訓練集雜訊'
      ]);
      st.stage = 5;
      add(5, '7. 早停機制保存最佳', '在驗證損失最低點（Epoch ' + R.bestEp + '，Val=' + f(R.bestVal, 3) + '）自動存檔並停止訓練。', [
        '最佳檢查點：Epoch = ' + R.bestEp + '，Val Loss = ' + f(R.bestVal, 3)
      ]);
      st.stage = 6;
      add(6, '8. 部署推論或抓異常', isAe ? '計算新病人重建誤差，超過門檻即標為異常（F5）。' : '推論時凍結權重並關閉 Dropout，以「Val Loss 最低」的權重上線。', [
        '切記：永遠部署 Val Loss 最低的那一版權重！'
      ]);
      while (steps.length < 10) {
        add(6, '四大架構選用指南', '表格用 MLP（或 GBDT）；影像空間用 CNN；序列用 LSTM/Transformer；無標籤異常壓縮用 Autoencoder。', [
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
        '深度學習包含 MLP（表格）、CNN（影像空間）、LSTM（時間序列）與 Autoencoder（無監督異常壓縮）四大主流架構管線。',
        '所有架構共用「前向算損失 → 反向算梯度 → Adam 更新 → 監控 Val Loss 早停」的訓練迴圈。',
        '本例在 Epoch ' + R.bestEp + ' 達到最低驗證損失 ' + f(R.bestVal, 3) + '，超過後即出現過擬合跡象。'
      ];
    },
    aistudio: {
      operators: ['Read CSV', 'Normalize', 'Split Data', 'Deep Learning (TensorFlow/Keras)', 'Apply Model'],
      params: [['Deep Learning › epochs', '30'], ['early stopping', 'true']],
      note: 'AI Studio 內建 Deep Learning 運算子；若要建 CNN/LSTM 或 Autoencoder，可透過 Execute Python 呼叫 PyTorch/Keras。',
      expect: (steps, rows, p) => {
        const R = simulate(rows, p);
        return ['最佳驗證點 Epoch = ' + R.bestEp + '，Val Loss = ' + f(R.bestVal, 3)];
      },
      python: 'model.compile(optimizer="adam", loss="binary_crossentropy")\nmodel.fit(X_tr, y_tr, validation_data=(X_va, y_va), callbacks=[EarlyStopping(patience=3)])',
      confirmed: false
    }
  });
})();
