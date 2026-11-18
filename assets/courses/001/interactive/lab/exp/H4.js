/* H4 Transformer 一層 */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = [{ key: 'pos', label: '位置', type: 'num', role: 'x' }, { key: 'tok', label: '詞', type: 'text', role: 'x' }];
  const TOKENS = ['病人', '夜間', '下床', '步態不穩', '跌倒', '風險'];

  function matMul(A, B) {
    return A.map(r => M.range(B[0].length, j => M.sum(r.map((v, k) => v * B[k][j]))));
  }

  function layerNorm(mat) {
    const eps = 1e-5;
    return mat.map(row => {
      const mu = M.mean(row);
      const va = M.mean(row.map(v => (v - mu) * (v - mu)));
      const sd = Math.sqrt(va + eps);
      return row.map(v => (v - mu) / sd);
    });
  }

  function runBlock(rows, p) {
    const tokens = rows.map(r => r.tok);
    const n = tokens.length, d = 4;
    const rng = LAB.rng(4400 + rows[0].id);
    const randMat = (r, c) => M.range(r, () => M.range(c, () => Math.round((rng() - 0.5) * 100) / 100));

    const X = randMat(n, d);
    const Wq = randMat(d, d), Wk = randMat(d, d), Wv = randMat(d, d), Wo = randMat(d, d);
    const W1 = randMat(d, 8), b1 = M.range(8, () => 0);
    const W2 = randMat(8, d), b2 = M.range(d, () => 0);

    // 1. Self-Attention
    const Q = matMul(X, Wq), K = matMul(X, Wk), V = matMul(X, Wv);
    const scale = Math.sqrt(d);
    const S = M.range(n, i => M.range(n, j => M.sum(Q[i].map((v, k) => v * K[j][k])) / scale));
    const A = S.map(row => {
      const mx = M.max(row), ex = row.map(v => Math.exp(v - mx)), sm = M.sum(ex) || 1;
      return ex.map(v => v / sm);
    });
    const Attn = matMul(matMul(A, V), Wo);

    // 2. Add & Norm 1
    const Res1 = X.map((row, i) => row.map((v, j) => v + Attn[i][j]));
    const Norm1 = layerNorm(Res1);

    // 3. FFN: Linear -> ReLU -> Linear
    const H1 = matMul(Norm1, W1).map(row => row.map((v, j) => Math.max(0, v + b1[j])));
    const FFN = matMul(H1, W2).map(row => row.map((v, j) => v + b2[j]));

    // 4. Add & Norm 2
    const Res2 = Norm1.map((row, i) => row.map((v, j) => v + FFN[i][j]));
    const Out = layerNorm(Res2);

    const qi = Math.min(n - 1, Math.max(0, Math.round(p.queryIdx || 2)));
    return { tokens, n, d, X, Wq, Wk, Wv, Wo, W1, b1, W2, b2, Attn, Res1, Norm1, FFN, Res2, Out, qi };
  }

  LAB.register({
    id: 'H4', group: 'H', title: 'Transformer 一層',
    module: { name: 'M7 第 06 節', url: '../m7/#p06' },
    goal: '看懂完整一層 Transformer Encoder 如何串起「Self-Attention → 殘差與 LayerNorm → 前饋網路 FFN → 殘差與 LayerNorm」。',
    data: {
      name: 'llm_block',
      scenario: '6 個詞（d_model = 4）：走完一層完整的 Transformer 編碼器模組',
      columns: COLS,
      small: () => TOKENS.map((tok, i) => ({ id: i + 1, pos: i, tok }))
    },
    params: [
      { key: 'queryIdx', label: '追蹤詞位置', type: 'int', min: 0, max: 5, step: 1, value: 2 }
    ],
    pseudo: [
      '輸入矩陣 X (6 × 4)',
      '1. Self-Attention 融合上下文',
      '2. 殘差 X + Attn，再做 LayerNorm',
      '3. 前饋網路：線性 → ReLU → 線性',
      '4. 再做一次殘差與 LayerNorm',
      '輸出同形狀矩陣 (6 × 4) 給下一層'
    ],
    build(rows, p) {
      const R = runBlock(rows, p), steps = [];
      const qi = R.qi, qTok = R.tokens[qi];

      function views(st) {
        const layers = [
          [{ id: 'in', label: '輸入 X', shape: 'box', cls: st.stage === 0 ? 'hl' : 'c0', hl: st.stage === 0 }],
          [{ id: 'attn', label: 'Self-Attn', shape: 'box', cls: st.stage === 1 ? 'hl' : 'c1', hl: st.stage === 1 }],
          [{ id: 'ln1', label: 'Add & Norm 1', shape: 'box', cls: st.stage === 2 ? 'hl' : 'c2', hl: st.stage === 2 }],
          [{ id: 'ffn', label: 'FFN (ReLU)', shape: 'box', cls: st.stage === 3 ? 'hl' : 'c1', hl: st.stage === 3 }],
          [{ id: 'ln2', label: 'Add & Norm 2', shape: 'box', cls: st.stage === 4 ? 'hl' : 'c2', hl: st.stage === 4 }],
          [{ id: 'out', label: '輸出 Out', shape: 'box', cls: st.stage === 5 ? 'hl' : 'c0', hl: st.stage === 5 }]
        ];
        const edges = [
          { from: 'in', to: 'attn', active: st.stage >= 1 },
          { from: 'in', to: 'ln1', active: st.stage >= 2, cls: 'c2', label: '+殘差 X' },
          { from: 'attn', to: 'ln1', active: st.stage >= 2 },
          { from: 'ln1', to: 'ffn', active: st.stage >= 3 },
          { from: 'ln1', to: 'ln2', active: st.stage >= 4, cls: 'c2', label: '+殘差 Norm1' },
          { from: 'ffn', to: 'ln2', active: st.stage >= 4 },
          { from: 'ln2', to: 'out', active: st.stage >= 5 }
        ];
        const main = {
          type: 'network', slot: 'main',
          title: 'Transformer 一層資料流（追蹤「' + qTok + '」）',
          layers, edges
        };
        const matMap = [R.X, R.Attn, R.Norm1, R.FFN, R.Out, R.Out];
        const titleMap = ['輸入 X', '注意力輸出 Attn', 'Add & Norm 1', '前饋網路 FFN', 'Add & Norm 2', '本層最終輸出'];
        const side = {
          type: 'matrix', slot: 'side',
          title: titleMap[st.stage] + ' (6 × 4)',
          rowLabels: R.tokens,
          colLabels: ['d₀', 'd₁', 'd₂', 'd₃'],
          values: matMap[st.stage],
          digits: 2, heat: 'div',
          hl: [[qi, 0], [qi, 1], [qi, 2], [qi, 3]]
        };
        const bottom = {
          type: 'table', slot: 'bottom',
          title: '「' + qTok + '」的 4 維向量在各站變化',
          cols: [{ key: 'st', label: '站別' }, { key: 'd0', label: 'd₀', num: true, digits: 2 }, { key: 'd1', label: 'd₁', num: true, digits: 2 }, { key: 'd2', label: 'd₂', num: true, digits: 2 }, { key: 'd3', label: 'd₃', num: true, digits: 2 }],
          rows: [
            { id: 's0', cells: ['輸入 X'].concat(R.X[qi]), hl: st.stage === 0 },
            { id: 's1', cells: ['Attn'].concat(st.stage >= 1 ? R.Attn[qi] : [null, null, null, null]), hl: st.stage === 1 },
            { id: 's2', cells: ['Norm1'].concat(st.stage >= 2 ? R.Norm1[qi] : [null, null, null, null]), hl: st.stage === 2 },
            { id: 's3', cells: ['FFN'].concat(st.stage >= 3 ? R.FFN[qi] : [null, null, null, null]), hl: st.stage === 3 },
            { id: 's4', cells: ['輸出 Out'].concat(st.stage >= 4 ? R.Out[qi] : [null, null, null, null]), hl: st.stage >= 4 }
          ]
        };
        return [main, side, bottom];
      }

      const st = { stage: 0 };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '題目', '一個 Transformer 區塊由「注意力＋前饋」組成，各自包了一層殘差連接與 LayerNorm。', [
        '追蹤詞：「' + qTok + '」（位置 ' + qi + '），形狀維持 6 × 4'
      ]);

      add(1, '起點：輸入矩陣 X', '輸入是詞嵌入與位置編碼相加後的 6 × 4 矩陣。', [
        'X[' + qTok + '] = (' + R.X[qi].map(v => f(v, 2)).join(', ') + ')'
      ]);

      st.stage = 1;
      add(2, '1. 注意力層', '計算全部詞對全部詞的注意力並乘上輸出投影 W_O，讓每個詞吸收上下文資訊。', [
        'Attn[' + qTok + '] = (' + R.Attn[qi].map(v => f(v, 2)).join(', ') + ')'
      ]);

      add(3, '2a. 殘差 X + Attn', '把注意力輸出直接加回原輸入 X，保留原本的詞義與位置訊號、避免深層梯度消失。', [
        'Res1[' + qTok + '] = (' + R.Res1[qi].map(v => f(v, 2)).join(', ') + ')'
      ]);

      st.stage = 2;
      const mu1 = M.mean(R.Res1[qi]), sd1 = M.sd(R.Res1[qi]);
      add(3, '2b. LayerNorm', '對每個詞自己的 4 個維度減平均、除以標準差，把數值拉回均 0 變異 1 的穩定區間。', [
        '平均 = ' + f(mu1, 3) + '，標準差 = ' + f(sd1, 3),
        'Norm1[' + qTok + '] = (' + R.Norm1[qi].map(v => f(v, 2)).join(', ') + ')'
      ]);

      st.stage = 3;
      add(4, '3. 前饋網路 FFN', '每個詞獨立通過「線性(4→8) → ReLU → 線性(8→4)」兩層小網路，進一步提煉非線性特徵。', [
        'FFN[' + qTok + '] = (' + R.FFN[qi].map(v => f(v, 2)).join(', ') + ')'
      ]);

      add(5, '4a. 第二次殘差連接', '把 FFN 的輸出加回 Norm1，一樣保護梯度流過整層網路。', [
        'Res2[' + qTok + '] = (' + R.Res2[qi].map(v => f(v, 2)).join(', ') + ')'
      ]);

      st.stage = 4;
      add(5, '4b. LayerNorm 2', '再做一次 LayerNorm，完成這一層 Transformer 的轉換。', [
        'Out[' + qTok + '] = (' + R.Out[qi].map(v => f(v, 2)).join(', ') + ')'
      ]);

      st.stage = 5;
      add(6, '輸出與堆疊成 LLM', '輸出的形狀一樣是 6 × 4，可直接接給下一層！GPT / Claude 就是把這樣的區塊疊 32 到 100 層。', [
        '輸入 (6×4) → 輸出 (6×4)'
      ]);

      while (steps.length < 10) {
        add(6, '注意力與 FFN 分工', 'Attention 負責「詞與詞之間交換資訊」；FFN 負責「每個詞自己消化並儲存知識」。', [
          '最終 Norm2 平均 ≈ 0，標準差 ≈ 1'
        ]);
      }
      return steps;
    },

    inputs(rows, p) {
      const R = runBlock(rows, p);
      return { X: R.X, Wq: R.Wq, Wk: R.Wk, Wv: R.Wv, Wo: R.Wo, W1: R.W1, b1: R.b1, W2: R.W2, b2: R.b2 };
    },

    keys(steps, rows, p) {
      const R = runBlock(rows, p);
      const k = {};
      for (let i = 0; i < R.n; i++) {
        for (let j = 0; j < R.d; j++) {
          k['attn_' + i + '_' + j] = R.Attn[i][j];
          k['norm1_' + i + '_' + j] = R.Norm1[i][j];
          k['ffn_' + i + '_' + j] = R.FFN[i][j];
          k['out_' + i + '_' + j] = R.Out[i][j];
        }
      }
      return k;
    },

    explain(steps, rows, p) {
      const R = runBlock(rows, p);
      const qi = R.qi;
      return [
        '單層 Transformer 依序執行「Self-Attention → Add & Norm 1 → 前饋網路 FFN → Add & Norm 2」，輸入與輸出皆維持 6 × 4。',
        '詞「' + R.tokens[qi] + '」經此層轉換後的最終向量為 (' + R.Out[qi].map(v => f(v, 2)).join(', ') + ')。',
        '殘差連接與 LayerNorm 讓幾十層甚至上百層的 LLM 也能穩定訓練。'
      ];
    },

    aistudio: {
      operators: ['Execute Python'],
      params: [['d_model', '4'], ['dim_feedforward', '8']],
      note: 'AI Studio 無原生 Transformer 層運算子；可對照 M7 第 06 節互動圖解。',
      expect: (steps, rows, p) => {
        const R = runBlock(rows, p);
        return ['輸出形狀 6×4，詞「' + R.tokens[R.qi] + '」首維 = ' + f(R.Out[R.qi][0], 3)];
      },
      python: `import torch.nn as nn\n# 等價於 TransformerEncoderLayer(d_model=4, nhead=1, dim_feedforward=8, norm_first=False)`,
      confirmed: false
    }
  });
})();
