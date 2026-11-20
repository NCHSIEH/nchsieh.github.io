/* H3 Self-Attention */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = [{ key: 'pos', label: '位置', type: 'num', role: 'x' }, { key: 'tok', label: '詞', type: 'text', role: 'x' }];
  const TOKENS = ['病人', '夜間', '下床', '步態不穩', '跌倒', '風險'];

  function matMul(A, B) {
    return A.map(r => M.range(B[0].length, j => M.sum(r.map((v, k) => v * B[k][j]))));
  }

  function runHead(X, Wq, Wk, Wv, mask) {
    const n = X.length, dk = Wq[0].length;
    const Q = matMul(X, Wq), K = matMul(X, Wk), V = matMul(X, Wv);
    const scale = Math.sqrt(dk);
    const S = M.range(n, i => M.range(n, j => {
      if (mask && j > i) return -1e9;
      return M.sum(Q[i].map((v, k) => v * K[j][k])) / scale;
    }));
    const A = S.map(row => {
      const mx = M.max(row);
      const ex = row.map(v => Math.exp(v - mx));
      const sm = M.sum(ex) || 1;
      return ex.map(v => v / sm);
    });
    const O = matMul(A, V);
    return { Q, K, V, S, A, O };
  }

  function runSA(rows, p) {
    const tokens = rows.map(r => r.tok);
    const n = tokens.length;
    const rng = LAB.rng(3300 + rows[0].id);
    const randMat = (r, c) => M.range(r, () => M.range(c, () => Math.round((rng() - 0.5) * 140) / 100));
    const X = randMat(n, 4);
    const Wq0 = randMat(4, 2), Wk0 = randMat(4, 2), Wv0 = randMat(4, 2);
    const Wq1 = randMat(4, 2), Wk1 = randMat(4, 2), Wv1 = randMat(4, 2);

    const h0 = runHead(X, Wq0, Wk0, Wv0, !!p.mask);
    const h1 = runHead(X, Wq1, Wk1, Wv1, !!p.mask);
    const qIdx = Math.min(n - 1, Math.max(0, Math.round(p.queryIdx || 2)));
    const useH1 = p.heads === '2';

    return { tokens, n, X, Wq0, Wk0, Wv0, Wq1, Wk1, Wv1, h0, h1, qIdx, useH1 };
  }

  LAB.register({
    id: 'H3', group: 'H', title: 'Self-Attention',
    module: { name: 'M7 第 05 節', url: '../m7/#p05' },
    goal: '看懂 Self-Attention 如何為每個詞算出 Query、Key、Value，計算縮放點積相似度並經 Softmax 轉為權重來加權融合句中資訊。',
    data: {
      name: 'llm_attn',
      scenario: '6 個詞的護理紀錄，計算 d_k = 2 的縮放點積注意力與多頭（1/2 頭）對照',
      columns: COLS,
      small: () => TOKENS.map((tok, i) => ({ id: i + 1, pos: i, tok }))
    },
    params: [
      { key: 'queryIdx', label: '觀察詞位置', type: 'int', min: 0, max: 5, step: 1, value: 2 },
      { key: 'mask', label: '因果遮罩', type: 'bool', value: false },
      { key: 'heads', label: '顯示頭數', type: 'choice', value: '1', options: [{ v: '1', label: '第 1 頭' }, { v: '2', label: '第 2 頭' }] }
    ],
    pseudo: [
      'X 乘 W_Q, W_K, W_V 得 Q, K, V',
      '對指定詞 i：算 Qᵢ · Kⱼᵀ',
      '除以 √d_k 縮放分數',
      '（若開啟遮罩：未來位置設 −∞）',
      'Softmax 轉成總和為 1 的權重',
      '用權重對所有 Value 加權求和'
    ],
    build(rows, p) {
      const R = runSA(rows, p), steps = [];
      const curH = R.useH1 ? R.h1 : R.h0;
      const qi = R.qIdx, qTok = R.tokens[qi];

      function views(st) {
        const mat = st.allRows
          ? curH.A
          : R.tokens.map((_, i) => i === qi ? (st.showSoft ? curH.A[qi] : M.range(R.n, j => j <= st.colUpto ? curH.A[qi][j] : 0)) : M.range(R.n, () => 0));
        const main = {
          type: 'matrix', slot: 'main',
          title: '注意力權重矩陣（第 ' + (R.useH1 ? 2 : 1) + ' 頭，列＝Query）',
          rowLabels: R.tokens,
          colLabels: R.tokens,
          values: mat,
          digits: 2, heat: true,
          hl: st.hlCell ? [st.hlCell] : []
        };
        const maxW = st.showSoft ? Math.max(0.3, M.max(curH.A[qi]) * 1.2) : 1;
        const side = {
          type: 'bars', slot: 'side',
          title: '「' + qTok + '」對句中各詞的注意力權重',
          max: maxW, digits: 3,
          items: R.tokens.map((t, j) => ({
            id: 'b' + j, label: t,
            value: st.showSoft ? curH.A[qi][j] : 0,
            cls: j === qi ? 'c1' : 'c0'
          }))
        };
        const tokens = {
          type: 'tokens', slot: 'bottom',
          title: '「' + qTok + '」正在看哪些詞',
          items: R.tokens.map((t, j) => ({
            id: 'tk' + j, text: t,
            score: st.showSoft ? curH.A[qi][j] : undefined,
            cls: j === qi ? 'hl' : (p.mask && j > qi ? 'cut' : 'c0'),
            hl: j === qi
          }))
        };
        return [main, side, tokens];
      }

      const st = { colUpto: -1, showSoft: false, allRows: false, hlCell: null };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '題目', '「' + qTok + '」這個詞要看懂整句話，需要去參考句中其他詞的線索。用 Self-Attention 算出注意力分配。', [
        'd_model = 4，d_k = 2，' + (p.mask ? '開啟因果遮罩（只能看過去）' : '無遮罩（可看整句）')
      ]);

      add(1, '算出 Q, K, V 矩陣', '輸入矩陣 X 分別乘上 W_Q、W_K、W_V，得到每個詞的「查詢 Q」、「鑰匙 K」與「內容 V」。', [
        'Q[' + qTok + '] = (' + curH.Q[qi].map(v => f(v, 2)).join(', ') + ')'
      ]);

      for (let j = 0; j < 3; j++) {
        st.colUpto = j; st.hlCell = [qi, j];
        const rawDot = M.sum(curH.Q[qi].map((v, k) => v * curH.K[j][k]));
        add(3, '內積：' + qTok + ' × ' + R.tokens[j], '把「' + qTok + '」的 Query 和「' + R.tokens[j] + '」的 Key 做內積並除以 √2。', [
          'Q·K = ' + f(rawDot, 3) + ' → 除以 √2 = ' + f(rawDot / Math.sqrt(2), 3)
        ]);
      }

      st.hlCell = null; st.colUpto = R.n - 1;
      if (p.mask) {
        add(4, '套用因果遮罩', '生成式模型預測下一個字時不能偷看未來，把位置 > ' + qi + ' 的分數設成 −∞。', [
          '遮罩後未來位置的權重將歸零'
        ]);
      } else {
        add(4, '未開啟遮罩', '雙向編碼器（如 BERT）不設遮罩，允許每個詞同時看前後文。', [
          '所有 ' + R.n + ' 個位置皆參與競爭'
        ]);
      }

      st.showSoft = true;
      const topJ = M.argmax(curH.A[qi]);
      add(5, 'Softmax 轉為權重', '把分數做 Softmax，得到總和為 1 的注意力分配。「' + qTok + '」最關注「' + R.tokens[topJ] + '」。', [
        '權重 = (' + curH.A[qi].map(v => f(v, 2)).join(', ') + ')'
      ]);

      add(6, '對 Value 加權求和', '把每個詞的 Value 向量乘上對應權重相加，得到融合上下文的新向量！', [
        '輸出 O[' + qTok + '] = (' + curH.O[qi].map(v => f(v, 3)).join(', ') + ')'
      ]);

      st.allRows = true;
      add(6, '一次算完所有詞', '矩陣運算一次就算出全部 6×6 注意力矩陣，不需像 RNN 一樣等前一詞算完。', [
        '6×6 注意力矩陣已填滿'
      ]);

      add(6, '多頭注意力差異', '切換上方「第 1 頭／第 2 頭」，會看到兩組不同的 W_Q, W_K, W_V 各自關注句中不同關係。', [
        '第 1 頭焦點：' + R.tokens[M.argmax(R.h0.A[qi])] + '｜第 2 頭焦點：' + R.tokens[M.argmax(R.h1.A[qi])]
      ]);

      add(6, '為什麼要除以 √d_k', '當維度 d_k 很大時內積方差會等比例膨脹，除以 √d_k 可避免 Softmax 進入梯度極小的飽和區；另注意全詞注意力有 O(T²) 成本（見 H9）。', [
        '目前 d_k = 2，縮放因子 = ' + f(Math.sqrt(2), 3)
      ]);
      return steps;
    },

    inputs(rows, p) {
      const R = runSA(rows, p);
      return { X: R.X, Wq0: R.Wq0, Wk0: R.Wk0, Wv0: R.Wv0, Wq1: R.Wq1, Wk1: R.Wk1, Wv1: R.Wv1 };
    },

    keys(steps, rows, p) {
      const R = runSA(rows, p);
      const curH = R.useH1 ? R.h1 : R.h0;
      const k = {};
      for (let i = 0; i < R.n; i++) {
        k['q_' + i + '_0'] = curH.Q[i][0];
        k['o_' + i + '_0'] = curH.O[i][0];
        for (let j = 0; j < R.n; j++) {
          k['a_' + i + '_' + j] = curH.A[i][j];
        }
      }
      return k;
    },

    explain(steps, rows, p) {
      const R = runSA(rows, p);
      const curH = R.useH1 ? R.h1 : R.h0;
      const qi = R.qIdx, topJ = M.argmax(curH.A[qi]);
      return [
        '詞「' + R.tokens[qi] + '」透過 Q·Kᵀ / √2 與 Softmax 計算注意力權重，最關注「' + R.tokens[topJ] + '」（權重 ' + f(curH.A[qi][topJ], 3) + '）。',
        p.mask ? '已開啟因果遮罩（Causal Mask），位置在它之後的詞權重皆為 0。' : '未開啟因果遮罩，該詞可同時參考前後所有詞。',
        '多頭注意力讓模型同時從不同子空間捕捉語法與語意關聯。'
      ];
    },

    aistudio: {
      operators: ['Execute Python'],
      params: [['mask', p => String(p.mask)], ['heads', p => p.heads]],
      note: 'AI Studio 無原生 Self-Attention 運算子；可對照 M7 第 05 節互動圖解。',
      expect: (steps, rows, p) => {
        const R = runSA(rows, p);
        const curH = R.useH1 ? R.h1 : R.h0;
        return ['詞「' + R.tokens[R.qIdx] + '」最高注意力：' + R.tokens[M.argmax(curH.A[R.qIdx])]];
      },
      python: `import numpy as np\n# 依 scaled dot-product attention 公式獨立驗證`,
      confirmed: false
    }
  });
})();
