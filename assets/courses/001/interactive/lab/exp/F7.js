/* F7 殘差連接與遷移學習（ResNet & Transfer Learning） */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f, sig = M.sigmoid;
  const COLS = LAB.data.columns('clinic', ['bmi', 'glu', 'dm'], { dm: 'y' });
  const pick = r => ({ id: r.id, bmi: r.bmi, glu: r.glu, dm: r.dm });

  const W_BLK = [0.32, 0.28, 0.35, 0.30];
  const A_BLK = [0.80, 0.75, 0.85, 0.70];
  const W_PRE = [[0.75, 0.95], [-0.45, 0.85]];
  const B_PRE = [0.10, -0.10];
  const W_SCR = [[-0.90, 0.15], [0.85, -0.80]];
  const B_SCR = [0.65, -0.70];

  const bce = (y, yh) => {
    const e = 1e-12;
    return -(y * Math.log(Math.max(e, yh)) + (1 - y) * Math.log(Math.max(e, 1 - yh)));
  };

  function evalNet(X, Y, W, b, v, bo, skip) {
    let loss = 0, ok = 0;
    for (let i = 0; i < X.length; i++) {
      const x = X[i];
      const f1 = Math.tanh(W[0][0] * x[0] + W[0][1] * x[1] + b[0]);
      const f2 = Math.tanh(W[1][0] * x[0] + W[1][1] * x[1] + b[1]);
      const h1 = skip ? f1 + x[0] : f1;
      const h2 = skip ? f2 + x[1] : f2;
      const yh = sig(v[0] * h1 + v[1] * h2 + bo);
      loss += bce(Y[i], yh);
      if ((yh >= 0.5 ? 1 : 0) === Y[i]) ok += 1;
    }
    return { loss: loss / X.length, acc: ok / X.length };
  }

  function trainStrategy(Xtr, Ytr, Xva, Yva, mode, epochs, skip) {
    const isPre = mode !== 'scratch';
    const W = (isPre ? W_PRE : W_SCR).map(r => r.slice());
    const b = (isPre ? B_PRE : B_SCR).slice();
    const v = [0.10, -0.10];
    let bo = 0.0;
    const lrHead = mode === 'scratch' ? 0.80 : 0.50;
    const lrBb = mode === 'scratch' ? 0.80 : (mode === 'finetune' ? 0.10 : 0.0);
    const nTr = Xtr.length;

    const hist = [];
    const e0tr = evalNet(Xtr, Ytr, W, b, v, bo, skip);
    const e0va = evalNet(Xva, Yva, W, b, v, bo, skip);
    hist.push({ ep: 0, trLoss: e0tr.loss, vaLoss: e0va.loss, vaAcc: e0va.acc });

    for (let ep = 1; ep <= epochs; ep++) {
      const gW = [[0, 0], [0, 0]], gb = [0, 0], gv = [0, 0];
      let gbo = 0;
      for (let i = 0; i < nTr; i++) {
        const x = Xtr[i];
        const f1 = Math.tanh(W[0][0] * x[0] + W[0][1] * x[1] + b[0]);
        const f2 = Math.tanh(W[1][0] * x[0] + W[1][1] * x[1] + b[1]);
        const h1 = skip ? f1 + x[0] : f1;
        const h2 = skip ? f2 + x[1] : f2;
        const yh = sig(v[0] * h1 + v[1] * h2 + bo);
        const dzo = (yh - Ytr[i]) / nTr;
        gv[0] += dzo * h1;
        gv[1] += dzo * h2;
        gbo += dzo;
        if (lrBb > 0) {
          const dz1 = dzo * v[0] * (1 - f1 * f1);
          const dz2 = dzo * v[1] * (1 - f2 * f2);
          gW[0][0] += dz1 * x[0];
          gW[0][1] += dz1 * x[1];
          gb[0] += dz1;
          gW[1][0] += dz2 * x[0];
          gW[1][1] += dz2 * x[1];
          gb[1] += dz2;
        }
      }
      v[0] -= lrHead * gv[0];
      v[1] -= lrHead * gv[1];
      bo -= lrHead * gbo;
      if (lrBb > 0) {
        for (let r = 0; r < 2; r++) {
          for (let c = 0; c < 2; c++) W[r][c] -= lrBb * gW[r][c];
          b[r] -= lrBb * gb[r];
        }
      }
      const etr = evalNet(Xtr, Ytr, W, b, v, bo, skip);
      const eva = evalNet(Xva, Yva, W, b, v, bo, skip);
      hist.push({ ep, trLoss: etr.loss, vaLoss: eva.loss, vaAcc: eva.acc });
    }
    const last = hist[hist.length - 1];
    return {
      mode,
      trainable: mode === 'freeze' ? 3 : 9,
      W, b, v, bo, hist,
      trLoss: last.trLoss,
      vaLoss: last.vaLoss,
      vaAcc: last.vaAcc
    };
  }

  function runResTransfer(rows, p) {
    const skip = p.skip !== false;
    const strategy = p.strategy || 'freeze';
    const epochs = Math.max(10, Math.min(60, Math.round(p.epochs || 30)));
    const nTr = Math.max(4, Math.floor(rows.length / 2));
    const trRows = rows.slice(0, nTr);
    const vaRows = rows.slice(nTr);

    const bmis = LAB.col(trRows, 'bmi'), glus = LAB.col(trRows, 'glu');
    const mB = M.mean(bmis), sB = M.sd(bmis) || 1;
    const mG = M.mean(glus), sG = M.sd(glus) || 1;
    const norm = arr => arr.map(r => [(r.bmi - mB) / sB, (r.glu - mG) / sG]);
    const Xtr = norm(trRows), Ytr = trRows.map(r => r.dm);
    const Xva = norm(vaRows), Yva = vaRows.map(r => r.dm);

    // 4 層深層網路梯度流對比（Plain vs ResNet y = F(x) + x）
    let hP = Xtr[0][1], hR = Xtr[0][1];
    let prodP = 1.0, prodR = 1.0;
    const gradRows = [];
    for (let k = 0; k < 4; k++) {
      const tP = Math.tanh(A_BLK[k] * hP);
      const jP = W_BLK[k] * A_BLK[k] * (1 - tP * tP);
      hP = W_BLK[k] * tP;
      prodP *= Math.abs(jP);

      const tR = Math.tanh(A_BLK[k] * hR);
      const jR = 1 + W_BLK[k] * A_BLK[k] * (1 - tR * tR);
      hR = hR + W_BLK[k] * tR;
      prodR *= Math.abs(jR);

      gradRows.push({ layer: k + 1, jP, prodP, jR, prodR });
    }

    const resScratch = trainStrategy(Xtr, Ytr, Xva, Yva, 'scratch', epochs, skip);
    const resFreeze = trainStrategy(Xtr, Ytr, Xva, Yva, 'freeze', epochs, skip);
    const resFinetune = trainStrategy(Xtr, Ytr, Xva, Yva, 'finetune', epochs, skip);
    const cur = strategy === 'scratch' ? resScratch : (strategy === 'finetune' ? resFinetune : resFreeze);

    return {
      skip, strategy, epochs, nTr, nVa: vaRows.length,
      Xtr, Ytr, Xva, Yva, gradRows,
      plainGrad4: gradRows[3].prodP,
      resGrad4: gradRows[3].prodR,
      gradRatio: gradRows[3].prodR / Math.max(1e-9, gradRows[3].prodP),
      resScratch, resFreeze, resFinetune, cur
    };
  }

  LAB.register({
    id: 'F7', group: 'F', title: '殘差連接與遷移學習',
    module: { name: 'M5 深度架構與遷移', url: '../m5/#p13' },
    goal: '看懂 ResNet 殘差捷徑 y = F(x) + x 如何靠恆等路徑「+1」打通深層反向梯度，以及在醫療小樣本下如何透過遷移學習（凍結骨幹／小學習率微調）超越從零訓練。',
    data: {
      name: 'clinic_resnet',
      scenario: '醫院小樣本健檢（6 筆訓練＋6 筆驗證）：對照 Plain vs ResNet 梯度流與三種遷移學習策略',
      columns: COLS,
      editable: ['bmi', 'glu', 'dm'],
      small: seed => LAB.data.clinic(seed, 12).map(pick)
    },
    params: [
      { key: 'skip', label: '殘差捷徑 (y = F(x)+x)', type: 'bool', value: true },
      { key: 'strategy', label: '遷移學習策略', type: 'choice', value: 'freeze', options: [
        { v: 'scratch', label: '從零訓練 (Scratch)' },
        { v: 'freeze', label: '凍結骨幹訓分類頭 (Freeze)' },
        { v: 'finetune', label: '預訓練＋小步微調 (Fine-Tune)' }
      ] },
      { key: 'epochs', label: '訓練輪數', type: 'int', min: 10, max: 60, step: 10, value: 30 }
    ],
    pseudo: [
      '切分醫院小樣本：6 筆訓練＋6 筆驗證',
      '對照 4 層 Plain 與 ResNet 梯度流',
      '  Plain：每層連乘 ∂F/∂x 迅速衰減',
      '  ResNet：捷徑多出 +1 保住梯度',
      '載入外部大醫院預訓練骨幹權重',
      '比較 Scratch、Freeze 與 Fine-Tune',
      '檢核驗證集 Val Loss 與泛化準確率'
    ],
    build(rows, p) {
      const R = runResTransfer(rows, p), steps = [];
      const curName = R.strategy === 'scratch' ? '從零訓練' : (R.strategy === 'finetune' ? '小步微調 Fine-Tune' : '凍結骨幹 Freeze');

      function views(st) {
        const bbFrozen = R.strategy === 'freeze' && st.stage >= 3;
        const bbTrain = R.strategy !== 'freeze' && st.stage >= 3;
        const headTrain = st.stage >= 4;
        const layers = [
          [
            { id: 'x1', label: 'x₁ BMI(Z)', value: R.Xtr[0][0], cls: 'c0' },
            { id: 'x2', label: 'x₂ 血糖(Z)', value: R.Xtr[0][1], cls: 'c0' }
          ],
          [
            { id: 'f1', label: '殘差塊 F₁', value: bbFrozen ? '已凍結' : (R.strategy === 'scratch' ? '隨機初值' : '預訓練'), shape: 'box', w: 120, cls: bbFrozen ? 'c5' : (bbTrain ? 'hl' : 'c1'), hl: st.stage === 1 || st.stage === 3 },
            { id: 'f2', label: '殘差塊 F₂', value: bbFrozen ? '已凍結' : (R.strategy === 'scratch' ? '隨機初值' : '預訓練'), shape: 'box', w: 120, cls: bbFrozen ? 'c5' : (bbTrain ? 'hl' : 'c1'), hl: st.stage === 1 || st.stage === 3 }
          ],
          [
            { id: 'h1', label: R.skip ? 'h₁ = F₁+x₁' : 'h₁ = F₁', value: R.skip ? '+x 捷徑' : '無捷徑', shape: 'box', w: 118, cls: R.skip ? 'good' : 'c4', hl: st.stage === 2 },
            { id: 'h2', label: R.skip ? 'h₂ = F₂+x₂' : 'h₂ = F₂', value: R.skip ? '+x 捷徑' : '無捷徑', shape: 'box', w: 118, cls: R.skip ? 'good' : 'c4', hl: st.stage === 2 }
          ],
          [
            { id: 'o', label: '分類頭 ŷ', value: headTrain ? 'Val ' + f(R.cur.vaAcc * 100, 0) + '%' : '3 參數', shape: 'box', w: 118, cls: headTrain ? 'good' : 'hl', hl: headTrain }
          ]
        ];
        const edges = [
          { from: 'x1', to: 'f1', active: st.stage <= 2 || bbTrain, cls: bbFrozen ? 'c5' : 'c0' },
          { from: 'x2', to: 'f1', active: st.stage <= 2 || bbTrain, cls: bbFrozen ? 'c5' : 'c0' },
          { from: 'x1', to: 'f2', active: st.stage <= 2 || bbTrain, cls: bbFrozen ? 'c5' : 'c0' },
          { from: 'x2', to: 'f2', active: st.stage <= 2 || bbTrain, cls: bbFrozen ? 'c5' : 'c0' },
          { from: 'f1', to: 'h1', active: st.stage >= 1, cls: 'c1' },
          { from: 'f2', to: 'h2', active: st.stage >= 1, cls: 'c1' },
          { from: 'h1', to: 'o', active: headTrain, cls: 'good' },
          { from: 'h2', to: 'o', active: headTrain, cls: 'good' }
        ];
        if (R.skip) {
          edges.push({ from: 'x1', to: 'h1', active: st.stage === 2 || st.stage === 6, back: st.stage === 2, cls: 'good', label: '+x₁' });
          edges.push({ from: 'x2', to: 'h2', active: st.stage === 2 || st.stage === 6, back: st.stage === 2, cls: 'good', label: '+x₂' });
        }
        const main = {
          type: 'network', slot: 'main', h: 330,
          title: (R.skip ? 'ResNet 殘差架構' : 'Plain 一般深層架構') + '｜策略：' + curName,
          layerLabels: ['輸入層', '特徵骨幹 (6參數)', '殘差匯流層', '分類頭 (3參數)'],
          layers, edges
        };

        const side = st.showTransfer ? {
          type: 'table', slot: 'side',
          title: '小樣本遷移學習三策略對照（第 ' + R.epochs + ' 輪）',
          cols: [
            { key: 'm', label: '策略' },
            { key: 'p', label: '可調參', num: true, digits: 0 },
            { key: 'tr', label: 'Train', num: true, digits: 3 },
            { key: 'va', label: 'Val Loss', num: true, digits: 3 },
            { key: 'ac', label: 'Val Acc' }
          ],
          rows: [
            { id: 'sc', cells: ['Scratch', R.resScratch.trainable, R.resScratch.trLoss, { v: f(R.resScratch.vaLoss, 3), cls: R.resScratch.vaLoss > R.resFreeze.vaLoss ? 'bad' : 'c0' }, f(R.resScratch.vaAcc * 100, 0) + '%'], hl: R.strategy === 'scratch' },
            { id: 'fr', cells: ['Freeze', R.resFreeze.trainable, R.resFreeze.trLoss, { v: f(R.resFreeze.vaLoss, 3), cls: 'c0' }, f(R.resFreeze.vaAcc * 100, 0) + '%'], hl: R.strategy === 'freeze' },
            { id: 'ft', cells: ['Fine-Tune', R.resFinetune.trainable, R.resFinetune.trLoss, { v: f(R.resFinetune.vaLoss, 3), cls: 'good' }, f(R.resFinetune.vaAcc * 100, 0) + '%'], hl: R.strategy === 'finetune' }
          ]
        } : {
          type: 'table', slot: 'side',
          title: '跨 4 層反向梯度流：Plain vs ResNet',
          cols: [
            { key: 'l', label: '深度', num: true, digits: 0 },
            { key: 'jp', label: 'Plain 單層', num: true, digits: 3 },
            { key: 'pp', label: 'Plain 連乘', num: true, digits: 4 },
            { key: 'pr', label: 'ResNet 連乘', num: true, digits: 3 }
          ],
          rows: R.gradRows.map((g, idx) => ({
            id: 'g' + g.layer,
            cells: [
              'L=' + g.layer,
              g.jP,
              { v: f(g.prodP, 4), cls: g.prodP < 0.05 ? 'bad' : 'c4' },
              { v: f(g.prodR, 3), cls: 'good' }
            ],
            hl: idx === st.gLayer
          }))
        };

        const epMax = st.epCap != null ? st.epCap : R.epochs;
        const maxY = Math.max(0.9, R.resScratch.hist[0].vaLoss * 1.15);
        const series = st.showTransfer ? [
          { id: 's_sc', label: 'Scratch Val Loss', pts: R.resScratch.hist.filter(h => h.ep <= epMax).map(h => [h.ep, Math.min(maxY, h.vaLoss)]), cls: 'c4', dash: true, dots: false },
          { id: 's_fr', label: 'Freeze Val Loss', pts: R.resFreeze.hist.filter(h => h.ep <= epMax).map(h => [h.ep, Math.min(maxY, h.vaLoss)]), cls: 'c0', dots: false },
          { id: 's_ft', label: 'Fine-Tune Val Loss', pts: R.resFinetune.hist.filter(h => h.ep <= epMax).map(h => [h.ep, Math.min(maxY, h.vaLoss)]), cls: 'good', dots: false }
        ] : [
          { id: 'g_pl', label: 'Plain 梯度連乘', pts: R.gradRows.map(g => [g.layer, g.prodP]), cls: 'c4', dots: true },
          { id: 'g_rs', label: 'ResNet 梯度 (縮放/3)', pts: R.gradRows.map(g => [g.layer, Math.min(1.0, g.prodR / 3)]), cls: 'good', dots: true }
        ];
        const bottom = {
          type: 'line', slot: 'bottom',
          title: st.showTransfer ? '驗證集 Val Loss 下降曲線（越低泛化越好）' : '反向傳播深度 L 與殘餘梯度比較（ResNet 不消失）',
          axes: st.showTransfer
            ? { x: { label: '訓練輪數 Epoch', min: 0, max: R.epochs }, y: { label: 'Val Loss', min: 0, max: maxY } }
            : { x: { label: '跨越層數 L', min: 1, max: 4 }, y: { label: '相對梯度強度', min: 0, max: 1.05 } },
          series
        };
        return [main, side, bottom];
      }

      const st = { stage: 0, gLayer: -1, showTransfer: false, epCap: 0 };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '題目與醫院痛點', '醫院常只有數十筆標註資料卻想訓深層網路。本實驗同時拆解兩大解方：ResNet 殘差捷徑與預訓練遷移學習。', [
        '資料切分：訓練 ' + R.nTr + ' 筆、驗證 ' + R.nVa + ' 筆（僅用訓練集標準化防洩漏）'
      ]);

      st.stage = 1; st.gLayer = 3;
      add(2, 'Plain 深層退化危機', '沒有捷徑時，每層反向梯度連乘 ∂F/∂x ≈ 0.25；才過 4 層就衰減至 ' + f(R.plainGrad4, 4) + '，前層權重幾乎停擺！', [
        'Plain 4 層梯度連乘 = ' + f(R.plainGrad4, 4) + '（極易退化）'
      ]);

      st.stage = 2; st.gLayer = 3;
      add(3, 'ResNet 恆等捷徑 +1', '加上跳接 y = F(x) + x 後，微分變為 ∂y/∂x = 1 + ∂F/∂x！即使殘差塊梯度趨近 0，仍有「+1」高速公路直達前層。', [
        'ResNet 4 層梯度 = ' + f(R.resGrad4, 3) + '（比 Plain 強 ' + f(R.gradRatio, 0) + ' 倍！）',
        '網路只需學習「微調殘差 F(x) = y − x」，比直接學完整映射容易得多'
      ]);

      st.stage = 3; st.showTransfer = true; st.epCap = 0;
      add(4, '載入預訓練骨幹', '實務上不會在 6 筆醫院資料從零訓練：先載入外部大醫院（或 ImageNet）學好的特徵骨幹 W_pre，直接站在巨人肩膀上。', [
        '起始 Val Loss：Scratch = ' + f(R.resScratch.hist[0].vaLoss, 3) + ' vs 預訓練 = ' + f(R.resFreeze.hist[0].vaLoss, 3)
      ]);

      st.stage = 4; st.epCap = Math.round(R.epochs / 3);
      add(5, '策略一：從零訓練', 'Scratch 把 9 個參數全從亂數重訓，在小樣本上很容易記住雜訊、起跑慢且驗證集表現不穩。', [
        '第 ' + st.epCap + ' 輪 Val Loss：Scratch = ' + f(R.resScratch.hist[st.epCap].vaLoss, 3)
      ]);

      st.epCap = Math.round(R.epochs * 2 / 3);
      add(5, '策略二：凍結骨幹', 'Freeze 鎖住預訓練骨幹（0 更新），只訓練最後 3 個分類頭參數；參數量大減 67%，最不易過擬合！', [
        '第 ' + st.epCap + ' 輪 Val Loss：Freeze = ' + f(R.resFreeze.hist[st.epCap].vaLoss, 3) + '（僅調 3 參數）'
      ]);

      st.stage = 5; st.epCap = R.epochs;
      add(5, '策略三：小步微調', 'Fine-Tune 以較小學習率（0.1 vs 分類頭 0.5）微調骨幹，既保留通用特徵又適應本院病患分佈。' + (R.resFinetune.vaLoss <= Math.min(R.resScratch.vaLoss, R.resFreeze.vaLoss) ? '本例它拿到最低 Val Loss。' : '但本例它不是 Val Loss 最低的策略。'), [
        '第 ' + R.epochs + ' 輪 Val Loss：Fine-Tune = ' + f(R.resFinetune.vaLoss, 3) + '｜Val Acc = ' + f(R.resFinetune.vaAcc * 100, 0) + '%'
      ]);

      st.stage = 6;
      add(6, '三策略驗證集總結', (function () { const s = R.resScratch.vaLoss, b = Math.min(R.resFreeze.vaLoss, R.resFinetune.vaLoss); return b < s - 1e-3 ? '看右表與曲線：預訓練遷移（Freeze / Fine-Tune）的 Val Loss 低於從零訓練，小樣本時預訓練特徵是醫療影像 AI 的關鍵。' : '看右表與曲線：本例從零訓練的 Val Loss 不比遷移學習差。這裡的「預訓練」只是示意用的小網路；真實的預訓練來自大量資料，在小樣本時優勢才明顯。'; })(), [
        'Val Loss：Scratch ' + f(R.resScratch.vaLoss, 3) + '｜Freeze ' + f(R.resFreeze.vaLoss, 3) + '｜Fine-Tune ' + f(R.resFinetune.vaLoss, 3)
      ]);

      add(6, '實務兩階段微調 SOP', '標準流程：先 Freeze 骨幹訓分類頭 5–10 輪（避免隨機分類頭的大梯度破壞預訓練權重），再解凍頂層以 1/10 學習率 Fine-Tune！', [
        '目前選擇策略：' + curName + '（可調參數 ' + R.cur.trainable + ' 個）'
      ]);

      add(6, '銜接 H4 殘差與 LoRA', 'ResNet 的殘差思想直接演進為 Transformer 的 Add & Norm (H4)；大語言模型的低秩微調 LoRA (H7) 更是凍結骨幹＋旁路微調的極致延伸！', [
        '核心公式：y = x + F(x)（殘差）｜W = W₀ + ΔW（遷移／LoRA）'
      ]);

      return steps;
    },

    keys(steps, rows, p) {
      const R = runResTransfer(rows, p);
      return {
        plain_grad4: R.plainGrad4,
        res_grad4: R.resGrad4,
        grad_ratio: R.gradRatio,
        scratch_val_loss: R.resScratch.vaLoss,
        freeze_val_loss: R.resFreeze.vaLoss,
        finetune_val_loss: R.resFinetune.vaLoss,
        freeze_val_acc: R.resFreeze.vaAcc,
        finetune_val_acc: R.resFinetune.vaAcc,
        trainable_params: R.cur.trainable
      };
    },

    explain(steps, rows, p) {
      const R = runResTransfer(rows, p);
      return [
        '4 層深層網路反向傳播時，Plain 連乘梯度衰減至 ' + f(R.plainGrad4, 4) + '，而 ResNet 藉助 y = F(x)+x 的「+1」恆等捷徑保持梯度為 ' + f(R.resGrad4, 3) + '（強 ' + f(R.gradRatio, 0) + ' 倍）。',
        '在僅有 ' + R.nTr + ' 筆訓練資料的小樣本上跑 ' + R.epochs + ' 輪：Scratch 驗證損失 ' + f(R.resScratch.vaLoss, 3) + '，凍結骨幹 Freeze 為 ' + f(R.resFreeze.vaLoss, 3) + '，小學習率微調 Fine-Tune 為 ' + f(R.resFinetune.vaLoss, 3) + '。',
        '實務醫療影像（X 光、眼底鏡、病理切片）幾乎全面採用「兩階段遷移學習」：先凍結預訓練 ResNet/ViT 骨幹訓分類頭，再以 1/10 學習率解凍頂層微調。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Execute Python'],
      params: [
        ['skip', p => String(p.skip)],
        ['strategy', p => p.strategy],
        ['epochs', p => String(p.epochs)]
      ],
      note: 'AI Studio 核心版未內建預訓練影像骨幹遷移學習；實務建議以 PyTorch torchvision.models.resnet18(weights="DEFAULT") 凍結 param.requires_grad = False 後再微調。',
      expect: (steps, rows, p) => {
        const R = runResTransfer(rows, p);
        return [
          '4 層梯度：Plain = ' + f(R.plainGrad4, 4) + ' vs ResNet = ' + f(R.resGrad4, 3),
          'Val Loss：Scratch ' + f(R.resScratch.vaLoss, 3) + ' vs Fine-Tune ' + f(R.resFinetune.vaLoss, 3)
        ];
      },
      python: 'import torchvision.models as models\nimport torch.nn as nn\nmodel = models.resnet18(weights="DEFAULT")\nfor p in model.parameters(): p.requires_grad = False  # 1. Freeze 骨幹\nmodel.fc = nn.Linear(model.fc.in_features, 2)        # 2. 換上本院分類頭',
      confirmed: false
    }
  });
})();
