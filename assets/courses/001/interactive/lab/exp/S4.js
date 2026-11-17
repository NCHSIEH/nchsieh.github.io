/* S4 深度學習標準流程（MLP／CNN／LSTM／Autoencoder 4 條真實差異化管線） */
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
    const archName = arch === 'cnn' ? 'CNN 影像卷積' : arch === 'lstm' ? 'LSTM 序列記憶' : arch === 'ae' ? 'Autoencoder 無監督' : 'MLP 全連接網路';
    const bestRow = rows.slice().sort((a, b) => a.val_loss - b.val_loss)[0];
    return { arch, archName, bestEp: bestRow.epoch, bestVal: bestRow.val_loss };
  }

  LAB.register({
    id: 'S4', group: 'S', title: '深度學習流程',
    module: { name: 'M5 深度學習', url: '../m5/' },
    goal: '透過全寬動畫流程圖比較 MLP（表格）、CNN（影像卷積池化）、LSTM（序列時間展開）與 Autoencoder（無監督重建異常）4 條真正不同的深度學習管線。',
    data: {
      name: 'dl_flow',
      scenario: '6 個訓練檢查點的 Train / Val Loss，對照 4 種不同深度學習架構管線',
      columns: COLS,
      small: makeRows
    },
    params: [
      { key: 'arch', label: '深度學習管線', type: 'choice', value: 'mlp', options: [
        { v: 'mlp', label: 'MLP 表格監督管線' },
        { v: 'cnn', label: 'CNN 影像空間管線' },
        { v: 'lstm', label: 'LSTM 時間序列管線' },
        { v: 'ae', label: 'Autoencoder 異常管線' }
      ] }
    ],
    pseudo: [
      '1. 依資料型態準備張量／切窗／增強',
      '2. 設計對應骨幹（Dense/Conv/LSTM/AE）',
      '3. 前向傳播算出預測或重建結果',
      '4. 依任務算 Loss 並反向傳播梯度',
      '5. 優化器更新權重（含早停監控）',
      '6. 依任務做分類推論或設誤差門檻'
    ],
    build(rows, p) {
      const R = simulate(rows, p), steps = [];
      const isCnn = R.arch === 'cnn', isLstm = R.arch === 'lstm', isAe = R.arch === 'ae';

      const ALGO_ROWS = isCnn ? [
        { id: 's0', st: '1. 影像增強', alg: '縮放 [0,1] + 翻轉/旋轉', use: '擴大醫療影像樣本多樣性、防過擬合' },
        { id: 's1', st: '2. 卷積＋池化', alg: 'F3 3×3 Conv + ReLU + MaxPool', use: '逐層擷取邊緣、紋理與病灶局部特徵' },
        { id: 's2', st: '3. 攤平分類頭', alg: 'Flatten / GAP → Dense', use: '把 2D 特徵圖轉 1D 向量進行分類' },
        { id: 's3', st: '4. 反向更新卷積核', alg: 'F1 反向傳播 + F2 Adam', use: '自動學會哪種 3×3 濾波器最能抓病灶' },
        { id: 's4', st: '5. 早停＋視覺檢核', alg: 'Early Stop · Grad-CAM 熱圖', use: '確認模型真的看病灶而非影像角落文字' }
      ] : isLstm ? [
        { id: 's0', st: '1. 時序切窗', alg: 'A2 標準化 + 滑動視窗 (不打亂)', use: '將過去 W 期組成 (Batch, Time, Feat) 張量' },
        { id: 's1', st: '2. 時間展開三閘門', alg: 'F4 遺忘閘/輸入閘/輸出閘', use: '細胞狀態 cₜ 加法高速公路保留長期記憶' },
        { id: 's2', st: '3. 序列損失計算', alg: 'Last-step / Seq MSE', use: '用最後一步 hₜ 預測下一期門診或病況' },
        { id: 's3', st: '4. BPTT＋梯度裁剪', alg: '沿時間反向 + Clip + F2 Adam', use: '防止長序列反向傳播時梯度爆炸或消失' },
        { id: 's4', st: '5. 滾動推論早停', alg: 'G3 時序驗證 + Early Stop', use: '在未來保留段 Val Loss 最低點存檔' }
      ] : isAe ? [
        { id: 's0', st: '1. 僅取正常樣本', alg: '無監督篩選（不需異常標籤）', use: '只讓網路看過正常病人，學正常資料流形' },
        { id: 's1', st: '2. 編碼器壓縮', alg: 'F5 編碼層 → 低維瓶頸 z', use: '強迫丟掉細節，只保留多數人的主要規律' },
        { id: 's2', st: '3. 解碼器還原', alg: 'F5 瓶頸 z → 重建 x̂', use: '嘗試把壓縮後的 z 還原回原始維度' },
        { id: 's3', st: '4. 最小化重建誤差', alg: 'Loss = ‖x − x̂‖² + F2 Adam', use: '反向更新讓正常病人的重建誤差越小越好' },
        { id: 's4', st: '5. 設門檻抓異常', alg: 'F5 重建誤差 > 門檻＝異常', use: '沒見過的異常病人會還原失敗、誤差飆高' }
      ] : [
        { id: 's0', st: '1. 表格標準化', alg: 'A2 Z 分數 + Train/Val/Test', use: '表格特徵尺度不一，進網路前必做標準化' },
        { id: 's1', st: '2. 全連接層堆疊', alg: 'F1 Dense + ReLU/Sigmoid', use: '學習特徵間的非線性交叉組合' },
        { id: 's2', st: '3. 前向計算 Loss', alg: '交叉熵 (分類) / MSE (迴歸)', use: '衡量網路輸出與標籤 y 的誤差' },
        { id: 's3', st: '4. 反向＋Adam 更新', alg: 'F1 連鎖律 + F2 Adam', use: '克服梯度方向震盪，穩定更新權重' },
        { id: 's4', st: '5. 早停與 Dropout', alg: 'Val Loss 最低點存檔', use: '防止過度背誦訓練集雜訊' }
      ];

      function views(st) {
        const done = k => st.stage > k;
        const act = k => st.stage === k;
        const clsOf = k => act(k) ? 'hl' : (done(k) ? 'good' : 'c5');
        const layers = isCnn ? [
          [{ id: 'n0', label: '1. 影像增強', value: '6×6 像素', shape: 'box', w: 156, cls: clsOf(0), hl: act(0), sub: '正規化+翻轉裁剪' }],
          [{ id: 'n1', label: '2. 卷積＋池化', value: st.stage >= 1 ? '抽取紋理' : '待卷積', shape: 'box', w: 156, cls: clsOf(1), hl: act(1), sub: 'F3 Conv+ReLU+Pool' }],
          [{ id: 'n2', label: '3. 攤平分類頭', value: st.stage >= 2 ? '算交叉熵' : '待分類', shape: 'box', w: 156, cls: clsOf(2), hl: act(2), sub: 'Flatten → Dense' }],
          [{ id: 'n3', label: '4. 反向更新核', value: st.stage >= 3 ? '更新 3×3 核' : '待更新', shape: 'box', w: 156, cls: act(3) ? 'c3' : clsOf(3), hl: act(3), sub: 'F1 反向 · F2 Adam' }],
          [{ id: 'n4', label: '5. 早停＋熱圖', value: st.stage >= 5 ? 'Ep=' + R.bestEp : '監控中', shape: 'box', w: 156, cls: clsOf(5), hl: act(5), sub: 'Val 最低 · Grad-CAM' }]
        ] : isLstm ? [
          [{ id: 'n0', label: '1. 滑動切窗', value: '序列表格', shape: 'box', w: 156, cls: clsOf(0), hl: act(0), sub: 'A2 縮放 (不打亂)' }],
          [{ id: 'n1', label: '2. 閘門展開', value: st.stage >= 1 ? 'fₜ · iₜ · oₜ' : '待展開', shape: 'box', w: 156, cls: clsOf(1), hl: act(1), sub: 'F4 LSTM 長期記憶' }],
          [{ id: 'n2', label: '3. 序列預測 Loss', value: st.stage >= 2 ? '算 ŷₜ 誤差' : '待計算', shape: 'box', w: 156, cls: clsOf(2), hl: act(2), sub: 'MSE / 交叉熵' }],
          [{ id: 'n3', label: '4. BPTT＋裁剪', value: st.stage >= 3 ? '防梯度消失' : '待更新', shape: 'box', w: 156, cls: act(3) ? 'c3' : clsOf(3), hl: act(3), sub: '時間反向 · F2 Adam' }],
          [{ id: 'n4', label: '5. 滾動早停', value: st.stage >= 5 ? 'Ep=' + R.bestEp : '監控中', shape: 'box', w: 156, cls: clsOf(5), hl: act(5), sub: 'G3 時序驗證存檔' }]
        ] : isAe ? [
          [{ id: 'n0', label: '1. 僅正常樣本', value: '無異常標籤', shape: 'box', w: 156, cls: clsOf(0), hl: act(0), sub: '無監督 A2 標準化' }],
          [{ id: 'n1', label: '2. 編碼瓶頸 z', value: st.stage >= 1 ? '3 → 1 維' : '待壓縮', shape: 'box', w: 156, cls: clsOf(1), hl: act(1), sub: 'F5 壓出主要規律' }],
          [{ id: 'n2', label: '3. 解碼還原 x̂', value: st.stage >= 2 ? '1 → 3 維' : '待還原', shape: 'box', w: 156, cls: clsOf(2), hl: act(2), sub: '重建誤差 ‖x−x̂‖²' }],
          [{ id: 'n3', label: '4. 最小化重建', value: st.stage >= 3 ? '更新編解碼' : '待更新', shape: 'box', w: 156, cls: act(3) ? 'c3' : clsOf(3), hl: act(3), sub: 'F2 Adam 壓低正常誤差' }],
          [{ id: 'n4', label: '5. 門檻抓異常', value: st.stage >= 5 ? '誤差>門檻' : '待設定', shape: 'box', w: 156, cls: clsOf(5), hl: act(5), sub: 'F5 高誤差＝異常' }]
        ] : [
          [{ id: 'n0', label: '1. 表格標準化', value: 'Train/Val/Test', shape: 'box', w: 156, cls: clsOf(0), hl: act(0), sub: 'A2 Z 分數 + 分批' }],
          [{ id: 'n1', label: '2. 全連接 Dense', value: st.stage >= 1 ? '2-2-1 MLP' : '待建構', shape: 'box', w: 156, cls: clsOf(1), hl: act(1), sub: 'F1 線性＋ReLU' }],
          [{ id: 'n2', label: '3. 前向算 Loss', value: st.stage >= 2 ? '算交叉熵' : '待計算', shape: 'box', w: 156, cls: clsOf(2), hl: act(2), sub: '預測 ŷ vs 標籤 y' }],
          [{ id: 'n3', label: '4. 反向＋Adam', value: st.stage >= 3 ? '∂L/∂W' : '待更新', shape: 'box', w: 156, cls: act(3) ? 'c3' : clsOf(3), hl: act(3), sub: 'F1 連鎖律 · F2 Adam' }],
          [{ id: 'n4', label: '5. 早停部署', value: st.stage >= 5 ? 'Ep=' + R.bestEp : '監控中', shape: 'box', w: 156, cls: clsOf(5), hl: act(5), sub: 'Val 最低存檔' }]
        ];
        const edges = [
          { from: 'n0', to: 'n1', active: st.stage === 1, cls: done(0) ? 'good' : 'c5' },
          { from: 'n1', to: 'n2', active: st.stage === 2, cls: done(1) ? 'good' : 'c5' },
          { from: 'n2', to: 'n3', active: st.stage === 3, cls: done(2) ? 'good' : 'c5' },
          { from: 'n3', to: 'n1', active: st.stage === 3 || st.stage === 4, back: true, cls: 'c3', label: isAe ? '壓低重建誤差' : '梯度更新' },
          { from: 'n2', to: 'n4', active: st.stage === 5, cls: done(4) ? 'good' : 'c5' }
        ];
        const shown = st.stage >= 4 ? rows.length : st.stage >= 2 ? Math.min(3, rows.length) : 0;
        const main = {
          type: 'network', slot: 'main', w: 1520, h: 150,
          title: '深度學習專屬流程圖（' + R.archName + '｜橙色回流＝反向更新）',
          layerLabels: isCnn ? ['1. 增強', '2. 卷積池化', '3. 攤平分類', '4. 更新核', '5. 檢核']
            : isLstm ? ['1. 切窗', '2. 閘門展開', '3. 序列Loss', '4. BPTT', '5. 早停']
            : isAe ? ['1. 正常樣本', '2. 編碼瓶頸', '3. 解碼還原', '4. 最小化MSE', '5. 異常門檻']
            : ['1. 張量', '2. Dense網路', '3. 前向Loss', '4. 反向更新', '5. 早停'],
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

      add(0, '1. 準備張量資料', isCnn ? '影像先縮放至 [0,1] 並做翻轉／平移資料增強。' : isLstm ? '時間序列標準化後切滑動視窗（嚴禁隨機打亂順序）。' : isAe ? 'Autoencoder 只需收集「正常樣本」訓練，不需事先標記各種異常！' : '表格資料先標準化再切分 Train / Val / Test。', [
        '目前管線：' + R.archName
      ]);
      st.stage = 1;
      add(1, '2. 建構對應骨幹', isCnn ? 'CNN 用 3×3 卷積核抓邊緣紋理，經 ReLU 與 2×2 池化濃縮空間特徵（F3）。' : isLstm ? 'LSTM 透過遺忘閘、輸入閘與輸出閘保留長期序列記憶（F4）。' : isAe ? '編碼器將 3 維指標強迫壓進 1 維瓶頸 z，丟棄雜訊（F5）。' : 'MLP 堆疊全連接層與 ReLU 捕捉非線性特徵組合（F1）。', [
        '對應實驗：' + (isCnn ? 'F3 CNN' : isLstm ? 'F4 RNN/LSTM' : isAe ? 'F5 Autoencoder' : 'F1 神經網路')
      ]);
      st.stage = 2;
      add(2, '3. 前向計算與損失', isCnn ? '特徵圖攤平接分類頭，算出影像分類交叉熵損失。' : isLstm ? '用最後一步隱藏狀態 hₜ 預測下一期並算誤差。' : isAe ? '解碼器由瓶頸 z 還原 x̂，計算與原始輸入的重建 MSE ‖x−x̂‖²。' : '資料從左向右流過每層算出預測 ŷ 與損失。', [
        '第 5 輪 Train Loss = ' + f(rows[0].train_loss, 3)
      ]);
      st.stage = 3;
      add(3, '4. 反向傳播梯度', isLstm ? '沿時間軸反向展開（BPTT）並做梯度裁剪防爆炸。' : isCnn ? '梯度往回傳，同時更新分類頭與 3×3 卷積核權重。' : '從損失往回（橙色回流）套用連鎖律算每層權重梯度。', [
        '對應實驗：F1 反向傳播'
      ]);
      st.stage = 3;
      add(4, '5. Adam 更新權重', '結合一階動量與自適應步幅更新權重，避開損失曲面震盪（F2）。', [
        '學習率 η = 0.001（優化器比較見 F2）'
      ]);
      st.stage = 4;
      add(5, '6. 監控 Val Loss', '觀察右表：Train Loss 持續下降，但 Epoch ' + R.bestEp + ' 之後 Val Loss 開始反彈過擬合！', [
        'Val Loss 反彈＝模型開始背誦訓練集雜訊'
      ]);
      st.stage = 5;
      add(5, '7. 早停機制保存最佳', '在驗證損失最低點（Epoch ' + R.bestEp + '，Val=' + f(R.bestVal, 3) + '）自動存檔停止。', [
        '最佳檢查點：Epoch = ' + R.bestEp + '，Val Loss = ' + f(R.bestVal, 3)
      ]);
      st.stage = 6;
      add(6, '8. 推論或抓異常', isAe ? '新病人重建誤差超過門檻即標為異常（F5）。' : isCnn ? '推論時可用 Grad-CAM 熱圖確認模型關注病灶位置。' : '凍結權重與 Dropout，以 Val Loss 最低權重上線。', [
        '切記：永遠部署 Val Loss 最低的那一版權重！'
      ]);
      while (steps.length < 10) {
        add(6, '四大架構管線差異', 'CNN 靠卷積池化抓空間、LSTM 靠閘門記時間、AE 靠瓶頸重建抓異常、MLP 處理一般表格。', [
          '目前管線：' + R.archName
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
        '深度學習並非所有任務都走同一條線：MLP（表格）、CNN（影像增強+卷積池化）、LSTM（切窗+BPTT）、Autoencoder（正常樣本+瓶頸重建）各自有專屬步驟。',
        '所有架構共用反向傳播與優化器（F2）更新權重，並透過監控 Val Loss 早停防止過擬合。',
        '本例在 Epoch ' + R.bestEp + ' 達到最低驗證損失 ' + f(R.bestVal, 3) + '。'
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
