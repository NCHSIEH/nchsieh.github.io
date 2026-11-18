/* F6 激活函數、BatchNorm 與 Dropout 正則化 */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = LAB.data.columns('clinic', ['bmi', 'glu', 'dm'], { dm: 'y' });
  const pick = r => ({ id: r.id, bmi: r.bmi, glu: r.glu, dm: r.dm });

  function actFn(z, type) {
    if (type === 'sigmoid') {
      const a = M.sigmoid(z);
      return { a, d: a * (1 - a) };
    }
    if (type === 'leaky') {
      return { a: z >= 0 ? z : 0.1 * z, d: z >= 0 ? 1 : 0.1 };
    }
    // relu
    return { a: Math.max(0, z), d: z > 0 ? 1 : 0 };
  }

  function runRegNN(rows, p) {
    const n = rows.length;
    const actType = p.act || 'relu';
    const dropRate = p.drop != null ? p.drop : 0.25;
    const useBN = p.bn !== false;

    const bmis = LAB.col(rows, 'bmi'), glus = LAB.col(rows, 'glu');
    const mB = M.mean(bmis), sB = M.sd(bmis) || 1;
    const mG = M.mean(glus), sG = M.sd(glus) || 1;
    const X = rows.map(r => [(r.bmi - mB) / sB, (r.glu - mG) / sG]);

    // 4 個隱藏神經元的固定線性權重（刻意設計一個偏正、一個偏負、兩個中間，以展示 Dead ReLU 與 Sigmoid 飽和）
    const W1 = [
      [1.2, 0.9, 0.5],
      [0.8, -1.1, 0.1],
      [-0.9, -1.2, -1.8], // 容易為負，觸發 Dead ReLU
      [1.5, 1.4, 2.2]     // 容易很大，觸發 Sigmoid 飽和
    ];
    const W2 = [0.7, -0.5, 0.4, 0.8];

    // 計算全批次 8 筆在 4 個隱藏元上的原始未標準化 pre-activation z
    const Zraw = X.map(x => W1.map(w => w[0] * x[0] + w[1] * x[1] + w[2]));

    // BatchNorm：對每個神經元 j = 0..3 跨 batch 求 mean 與 std
    const bnMean = [0, 1, 2, 3].map(j => M.mean(Zraw.map(r => r[j])));
    const bnStd = [0, 1, 2, 3].map(j => M.sd(Zraw.map(r => r[j])) || 1);
    const Zbn = Zraw.map(r => r.map((v, j) => (v - bnMean[j]) / bnStd[j]));

    const Zuse = useBN ? Zbn : Zraw;

    // 對第 1 位病人 (#1) 進行詳細追蹤
    const z0 = Zuse[0];
    const act0 = z0.map(v => actFn(v, actType));

    // Inverted Dropout mask（依 dropRate 決定遮罩幾個神經元）
    const nDrop = Math.round(dropRate * 4);
    const mask = [0, 1, 2, 3].map(j => (j === 1 && nDrop >= 1) || (j === 3 && nDrop >= 2) ? 0 : 1);
    const scale = dropRate < 0.99 ? 1 / (1 - dropRate) : 1;
    const hDrop = act0.map((o, j) => mask[j] ? o.a * scale : 0);

    const outTrain = M.sigmoid(M.sum(hDrop.map((h, j) => h * W2[j])));
    const outInfer = M.sigmoid(M.sum(act0.map((o, j) => o.a * W2[j])));

    // 深層 5 層連乘梯度模擬（展示 Sigmoid 梯度消失 vs ReLU 恆定傳遞）
    const depthGrads = [1, 2, 3, 4, 5].map(layer => ({
      layer,
      sigGrad: Math.pow(0.22, layer),
      reluGrad: Math.pow(0.95, layer),
      leakyGrad: Math.pow(0.98, layer)
    }));

    // 模擬 50 輪 Train Loss vs Val Loss（有無 Dropout + BN 的過擬合差距）
    const curvePts = [5, 10, 15, 20, 25, 30, 35, 40, 45, 50].map(ep => {
      const t = ep / 50;
      const trNoReg = 0.55 * Math.exp(-2.6 * t) + 0.06;
      const vaNoReg = 0.56 * Math.exp(-1.8 * t) + 0.18 * t * t + 0.14;
      const regStrength = (useBN ? 0.5 : 0) + dropRate;
      const trReg = trNoReg + 0.08 * regStrength * t;
      const vaReg = 0.55 * Math.exp(-2.1 * t) + 0.11 + Math.max(0, 0.12 - 0.18 * regStrength) * t * t;
      return { ep, trNoReg, vaNoReg, trReg, vaReg };
    });

    return {
      n, actType, dropRate, useBN,
      Zraw, bnMean, bnStd, Zbn, Zuse,
      z0, act0, mask, scale, hDrop, outTrain, outInfer,
      depthGrads, curvePts
    };
  }

  LAB.register({
    id: 'F6', group: 'F', title: '激活函數、BN 與 Dropout',
    module: { name: 'M5 第 08 節', url: '../m5/#p08' },
    goal: '看懂深度神經網路三大核心組件：ReLU / Leaky ReLU 如何解決 Sigmoid 梯度消失、Batch Normalization 如何把每層輸入拉回標準常態，以及 Inverted Dropout 如何隨機遮罩神經元防止過擬合。',
    data: {
      name: 'clinic_regnn',
      scenario: '門診健檢：8 位病人的 BMI 與血糖通過 2-4-1 神經網路，觀察批次正規化、激活導數與隨機丟棄遮罩',
      columns: COLS,
      editable: ['bmi', 'glu'],
      small: seed => LAB.data.clinic(seed, 8).map(pick)
    },
    params: [
      { key: 'act', label: '激活函數', type: 'choice', value: 'relu', options: [{ v: 'sigmoid', label: 'Sigmoid' }, { v: 'relu', label: 'ReLU' }, { v: 'leaky', label: 'Leaky ReLU' }] },
      { key: 'bn', label: '批次正規化 BatchNorm', type: 'bool', value: true },
      { key: 'drop', label: 'Dropout 丟棄率 p', type: 'num', min: 0.0, max: 0.5, step: 0.25, value: 0.25 }
    ],
    pseudo: [
      '計算隱藏層線性加權 z = Wx + b',
      'BatchNorm 跨批次標準化 z̃',
      '通過激活函數 a = f(z̃) 與求導',
      '比較 Sigmoid 與 ReLU 深層梯度',
      '訓練期 Dropout 遮罩與期望放大',
      '推論期關閉遮罩並抑制驗證過擬合'
    ],
    build(rows, p) {
      const R = runRegNN(rows, p), steps = [];

      function views(st) {
        const layers = [
          [
            { id: 'x1', label: 'x₁ BMI', value: rows[0].bmi, cls: 'c0' },
            { id: 'x2', label: 'x₂ 血糖', value: rows[0].glu, cls: 'c0' }
          ],
          [0, 1, 2, 3].map(j => {
            const dropped = st.stage >= 4 && !st.infer && R.mask[j] === 0;
            const dead = st.stage >= 2 && R.actType === 'relu' && R.act0[j].a === 0;
            const val = st.stage === 0 ? R.Zraw[0][j]
              : st.stage === 1 ? R.z0[j]
              : (st.stage >= 4 && !st.infer) ? R.hDrop[j]
              : R.act0[j].a;
            return {
              id: 'h' + (j + 1),
              label: 'h' + (j + 1) + (dropped ? ' (遮罩×0)' : (dead ? ' (Dead)' : '')),
              value: val,
              sub: st.stage >= 2 ? "f'=" + f(R.act0[j].d, 2) : (R.useBN && st.stage === 1 ? 'BN μ=0' : 'raw z'),
              cls: dropped ? 'cut' : (dead ? 'c4' : (st.stage >= 4 ? 'good' : 'c1')),
              hl: st.stage === 4 && !dropped
            };
          }),
          [
            { id: 'o', label: st.infer ? '推論 ŷ' : '訓練 ŷ', value: st.infer ? R.outInfer : R.outTrain, cls: 'hl', hl: st.stage >= 4 }
          ]
        ];

        const edges = [];
        ['x1', 'x2'].forEach(xId => {
          [1, 2, 3, 4].forEach(j => {
            edges.push({ from: xId, to: 'h' + j, active: st.stage <= 2 });
          });
        });
        [1, 2, 3, 4].forEach(j => {
          const dropped = st.stage >= 4 && !st.infer && R.mask[j - 1] === 0;
          edges.push({ from: 'h' + j, to: 'o', active: st.stage >= 4 && !dropped, cls: dropped ? 'c5' : undefined });
        });

        const main = {
          type: 'network', slot: 'main', h: 340,
          title: '2-4-1 網路正則化透視（' + R.actType.toUpperCase() + (R.useBN ? ' + BN' : '') + ' + Dropout p=' + f(R.dropRate, 2) + '）',
          layerLabels: ['輸入層', st.stage <= 1 ? '隱藏層線性 z / BN' : '激活 a 與 Dropout 遮罩', '輸出層 ŷ'],
          layers, edges, digits: 2
        };

        const side = {
          type: 'table', slot: 'side',
          title: '4 個隱藏神經元狀態明細（病人 #1）',
          cols: [
            { key: 'h', label: '神經元' },
            { key: 'zr', label: '原始 z', num: true, digits: 2 },
            { key: 'zb', label: R.useBN ? 'BN後 z̃' : '未開BN', num: true, digits: 2 },
            { key: 'a', label: '激活 a', num: true, digits: 2 },
            { key: 'd', label: "導數 f'", num: true, digits: 2 },
            { key: 'dp', label: 'Drop後', num: true, digits: 2 }
          ],
          rows: [0, 1, 2, 3].map(j => ({
            id: 'r' + j,
            cells: [
              'h' + (j + 1),
              R.Zraw[0][j],
              R.z0[j],
              st.stage >= 2 ? R.act0[j].a : null,
              st.stage >= 2 ? { v: f(R.act0[j].d, 2), cls: R.act0[j].d < 0.05 ? 'bad' : 'good' } : null,
              st.stage >= 4 ? (R.mask[j] === 0 && !st.infer ? { v: '0 (遮罩)', cls: 'bad' } : R.hDrop[j]) : null
            ],
            hl: st.stage === 4 && R.mask[j] === 0
          }))
        };

        const bottom = st.showLossCurve ? {
          type: 'line', slot: 'bottom',
          title: '訓練 vs 驗證損失曲線（對照無正則化過擬合 vs 加入 BN+Dropout）',
          axes: { x: { label: '訓練輪數 Epoch', min: 5, max: 50 }, y: { label: 'Loss', min: 0, max: 0.65 } },
          series: [
            { id: 'vn', label: '無正則 Val Loss (過擬合)', pts: R.curvePts.map(c => [c.ep, c.vaNoReg]), cls: 'c4', dash: true, dots: false },
            { id: 'vr', label: 'BN+Dropout Val Loss', pts: R.curvePts.map(c => [c.ep, c.vaReg]), cls: 'good', dots: true },
            { id: 'tr', label: 'Train Loss', pts: R.curvePts.map(c => [c.ep, c.trReg]), cls: 'c0', dots: false }
          ]
        } : {
          type: 'line', slot: 'bottom',
          title: '往回傳遞 L 層後的殘餘梯度比例（為什麼 Sigmoid 在深層網路會梯度消失）',
          axes: { x: { label: '反向傳播跨越層數 L', min: 1, max: 5 }, y: { label: '梯度保留比例', min: 0, max: 1.05 } },
          series: [
            { id: 'gs', label: 'Sigmoid (≤0.25^L 迅速歸零)', pts: R.depthGrads.map(g => [g.layer, g.sigGrad]), cls: 'c4', dots: true },
            { id: 'gr', label: 'ReLU / Leaky ReLU', pts: R.depthGrads.map(g => [g.layer, R.actType === 'leaky' ? g.leakyGrad : g.reluGrad]), cls: 'good', dots: true }
          ]
        };

        return [main, side, bottom];
      }

      const st = { stage: 0, infer: false, showLossCurve: false };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [rows[0].id] });

      add(0, '原始線性加權 z', '先看 #1 號病人在 4 個隱藏神經元算出的原始線性總和 z：有的偏負（h₃=' + f(R.Zraw[0][2], 2) + '），有的極大（h₄=' + f(R.Zraw[0][3], 2) + '）。', [
        '原始 z = (' + R.Zraw[0].map(v => f(v, 2)).join(', ') + ')'
      ]);

      st.stage = 1;
      add(1, 'BatchNorm 正規化', R.useBN
        ? 'BatchNorm 在進入激活函數前，把每個神經元跨 8 位病人的輸出強制拉回平均 0、標準差 1，防止數值衝進飽和區！'
        : '目前關閉 BatchNorm，原始 z 直接進入激活函數（容易在極大或極小值處飽和）。', [
        '批次均值 μ_B = (' + R.bnMean.map(v => f(v, 2)).join(', ') + ')',
        '正規化後 z̃ = (' + R.z0.map(v => f(v, 2)).join(', ') + ')'
      ]);

      st.stage = 2;
      add(2, '通過激活函數與求導', R.actType === 'sigmoid'
        ? 'Sigmoid 把數值壓進 (0,1)，但導數 a(1−a) 最大只有 0.25，在兩端更趨近 0！'
        : (R.actType === 'relu'
          ? 'ReLU 正數直接通過（導數恆為 1）、負數歸零（導數為 0，若長期為負會變 Dead ReLU）。'
          : 'Leaky ReLU 讓負數保留 0.1 斜率，既解決梯度消失又避免神經元永久死亡！'), [
        '激活輸出 a = (' + R.act0.map(o => f(o.a, 2)).join(', ') + ')',
        "局部導數 f'(z̃) = (" + R.act0.map(o => f(o.d, 2)).join(', ') + ')'
      ]);

      st.stage = 3;
      add(3, '深層連乘梯度消失對比', '看下方折線圖：反向傳播每往回傳 1 層就要乘一次局部導數。Sigmoid 連乘 5 層後只剩 0.22⁵ = 0.0005，前幾層完全學不到東西！', [
        '5 層後梯度保留率：Sigmoid = ' + f(R.depthGrads[4].sigGrad, 4) + ' vs ReLU = ' + f(R.depthGrads[4].reluGrad, 3)
      ]);

      st.stage = 4;
      add(4, '訓練期 Dropout 遮罩', R.dropRate > 0
        ? '為了防止神經元彼此過度依賴（Co-adaptation），訓練時隨機把 p=' + f(R.dropRate, 2) + ' 的神經元歸零，並將存活神經元放大 1/(1−p) = ' + f(R.scale, 2) + ' 倍！'
        : '目前設定 Dropout p = 0（不遮罩任何神經元）。', [
        '遮罩 mask = [' + R.mask.join(', ') + ']｜放大倍率 1/(1−p) = ' + f(R.scale, 2),
        'Dropout 後輸出 = (' + R.hDrop.map(v => f(v, 2)).join(', ') + ')'
      ]);

      add(4, '為何放大 1/(1−p)', '訓練時若丟掉 25% 神經元，總和期望值會縮水成 75%；預先除以 (1−p) 放大，推論測試時就不必再改動任何權重（Inverted Dropout）！', [
        '訓練期單次前向預測 ŷ_train = ' + f(R.outTrain, 3)
      ]);

      st.infer = true;
      add(5, '推論期關閉 Dropout', '模型上線預測新病人（model.eval()）時，關閉隨機遮罩、讓全部 4 個神經元共同上場投票，等同於指數個子網路的集成（Ensemble）！', [
        '推論期全開預測 ŷ_eval = ' + f(R.outInfer, 3)
      ]);

      st.showLossCurve = true;
      add(5, '抑制驗證集過擬合', '看下方損失曲線：不加正則化時 Val Loss（紅虛線）在 20 輪後反彈飆高；加入 BatchNorm + Dropout 後（綠線）穩定收斂！', [
        'Epoch 50 Val Loss：無正則 = ' + f(R.curvePts[9].vaNoReg, 3) + ' vs 有正則 = ' + f(R.curvePts[9].vaReg, 3)
      ]);

      add(5, 'BN 與 Dropout 順序', '現代實務標準順序為「Linear / Conv → BatchNorm → ReLU → Dropout」，先穩定分布再激活，最後做隨機遮罩。', [
        '正則化強度 p = ' + f(R.dropRate, 2) + '，BatchNorm = ' + (R.useBN ? '開啟' : '關閉')
      ]);

      add(5, '現代神經網路標配總結', '從 F1 的基礎反向傳播到現代深度網路，正是靠 ReLU（保梯度）、BatchNorm（穩分布）與 Dropout（抗過擬合）三大支柱才得以訓練百層模型。', [
        '最終驗證損失 Val Loss = ' + f(R.curvePts[9].vaReg, 3)
      ]);

      return steps;
    },

    keys(steps, rows, p) {
      const R = runRegNN(rows, p);
      return {
        z0_0: R.z0[0],
        z0_2: R.z0[2],
        a0_0: R.act0[0].a,
        d0_0: R.act0[0].d,
        scale: R.scale,
        out_train: R.outTrain,
        out_infer: R.outInfer
      };
    },

    explain(steps, rows, p) {
      const R = runRegNN(rows, p);
      return [
        '切換激活函數可見：Sigmoid 最大導數僅 0.25，連乘 5 層衰減至 0.0005；ReLU 與 Leaky ReLU 在正區間導數恆為 1，徹底解決深層梯度消失。',
        R.useBN ? '開啟 BatchNorm 後，每個隱藏神經元跨批次平均值固定為 0、標準差為 1，避免權重更新時各層輸入分布劇烈飄移（Internal Covariate Shift）。' : '關閉 BatchNorm 時，隱藏層輸入易落入極端正負區間。',
        'Inverted Dropout 在訓練期以機率 p = ' + f(R.dropRate, 2) + ' 遮罩神經元並將存活者放大 ' + f(R.scale, 2) + ' 倍，推論期全開預測 ŷ = ' + f(R.outInfer, 3) + '，有效抑制過擬合。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Normalize', 'Deep Learning (H2O / Keras)'],
      params: [
        ['Deep Learning › activation', p => p.act === 'sigmoid' ? 'Tanh / Sigmoid' : 'RectifierWithDropout (ReLU)'],
        ['Deep Learning › hidden_dropout_ratios', p => String(p.drop)]
      ],
      note: 'AI Studio 的 Deep Learning 運算子支援選擇 RectifierWithDropout 並設定 hidden_dropout_ratios；PyTorch 則以 nn.BatchNorm1d、nn.ReLU 與 nn.Dropout 串接，且務必在推論時呼叫 model.eval()。',
      expect: (steps, rows, p) => {
        const R = runRegNN(rows, p);
        return ['推論期輸出 ŷ = ' + f(R.outInfer, 3) + '，驗證集 Val Loss = ' + f(R.curvePts[9].vaReg, 3)];
      },
      python: 'import torch.nn as nn\nmodel = nn.Sequential(\n    nn.Linear(2, 4),\n    nn.BatchNorm1d(4),\n    nn.ReLU(),\n    nn.Dropout(p=0.25),\n    nn.Linear(4, 1),\n    nn.Sigmoid()\n)',
      confirmed: false
    }
  });
})();
