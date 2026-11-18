/* H2 詞嵌入與位置編碼 */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = [{ key: 'pos', label: '位置', type: 'num', role: 'x' }, { key: 'tok', label: '詞', type: 'text', role: 'x' }];
  const SENTS = [
    ['病人', '夜間', '下床', '步態不穩', '跌倒', '風險'],
    ['傷口', '紅腫', '滲液', '更換', '敷料', '照護']
  ];

  function runPE(rows, p) {
    const tokens = rows.map(r => r.tok);
    const n = tokens.length;
    const d = 4;
    const rng = LAB.rng(2200 + parseInt(p.sentence || '0', 10) * 53);
    const E = tokens.map(() => M.range(d, () => Math.round((rng() - 0.5) * 160) / 100));

    // 正弦位置編碼（Attention Is All You Need）
    const PE = M.range(n, pos => M.range(d, j => {
      const i = Math.floor(j / 2);
      const angle = pos / Math.pow(10000, (2 * i) / d);
      return j % 2 === 0 ? Math.sin(angle) : Math.cos(angle);
    }));

    const X = M.range(n, pos => M.range(d, j => E[pos][j] + PE[pos][j]));
    // 對調第 1 與第 2 個詞後的輸入矩陣
    const swapped = X.slice();
    const tmp = E[1].map((v, j) => v + PE[2][j]);
    const tmp2 = E[2].map((v, j) => v + PE[1][j]);
    swapped[1] = tmp2; swapped[2] = tmp;

    return { tokens, n, d, E, PE, X, swapped };
  }

  LAB.register({
    id: 'H2', group: 'H', title: '詞嵌入與位置編碼',
    module: { name: 'M7 第 07 節', url: '../m7/#p07' },
    goal: '看懂 Transformer 如何把每個詞查表變成詞向量，再加上正弦／餘弦位置編碼，讓「詞序對調」時輸入矩陣能分辨差異。',
    data: {
      name: 'llm_pe',
      scenario: '護理紀錄短句（6 個詞，d_model = 4）：查嵌入表並加上正弦位置編碼',
      columns: COLS,
      small: (seed, p) => SENTS[parseInt((p && p.sentence) || '0', 10)].map((tok, i) => ({ id: i + 1, pos: i, tok }))
    },
    params: [
      { key: 'sentence', label: '句子', type: 'choice', value: '0', options: [{ v: '0', label: '病人夜間下床…' }, { v: '1', label: '傷口紅腫滲液…' }] }
    ],
    pseudo: [
      '讀取斷好詞的句子（6 個詞）',
      '每個詞查嵌入表得 4 維向量 E',
      '依位置 pos 與維度 i 算位置編碼 PE：',
      '  偶數維 sin(pos / 10000^(2i/d))',
      '  奇數維 cos(pos / 10000^(2i/d))',
      '將 E + PE 相加得輸入矩陣 X',
      '對調兩個詞驗證位置編碼的作用'
    ],
    build(rows, p) {
      const R = runPE(rows, p), steps = [];
      const colLabs = ['d₀', 'd₁', 'd₂', 'd₃'];

      function views(st) {
        const mainMat = st.swapped ? R.swapped : st.mode === 'sum' ? R.X : R.E;
        const main = {
          type: 'matrix', slot: 'main',
          title: st.swapped ? '對調第 1、2 詞後的輸入矩陣' : st.mode === 'sum' ? '相加後輸入矩陣 X = E + PE' : '詞嵌入矩陣 E（逐詞查表）',
          rowLabels: st.swapped ? [R.tokens[0], R.tokens[2], R.tokens[1], R.tokens[3], R.tokens[4], R.tokens[5]] : R.tokens,
          colLabels: colLabs,
          values: mainMat.map((row, idx) => idx < st.embUpto ? row : [0, 0, 0, 0]),
          digits: 2, heat: 'div',
          hl: st.curPos >= 0 ? [[st.curPos, 0], [st.curPos, 1], [st.curPos, 2], [st.curPos, 3]] : []
        };
        const side = {
          type: 'matrix', slot: 'side',
          title: '正弦位置編碼矩陣 PE',
          rowLabels: R.tokens.map((_, i) => 'pos=' + i),
          colLabels: colLabs,
          values: R.PE.map((row, idx) => idx < st.peUpto ? row : [0, 0, 0, 0]),
          digits: 2, heat: 'div'
        };
        const tokens = {
          type: 'tokens', slot: 'bottom',
          title: '輸入句子',
          items: R.tokens.map((t, idx) => ({ id: 't' + idx, text: idx + ':' + t, cls: st.curPos === idx ? 'hl' : 'c0', hl: st.curPos === idx }))
        };
        return [main, side, tokens];
      }

      const st = { mode: 'emb', embUpto: 0, peUpto: 0, curPos: -1, swapped: false };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '題目', '「病人跌倒」和「跌倒病人」詞完全一樣但意思不同。看看 Transformer 怎麼用位置編碼記住詞的順序。', [
        '句子：' + R.tokens.join(' / ') + '（d_model = 4）'
      ]);

      for (let i = 0; i < 3; i++) {
        st.curPos = i; st.embUpto = i + 1;
        add(2, '查嵌入表：' + R.tokens[i], '從詞嵌入表查出「' + R.tokens[i] + '」的 4 維語意向量。', [
          'E[' + i + '] = (' + R.E[i].map(v => f(v, 2)).join(', ') + ')'
        ]);
      }
      st.curPos = -1; st.embUpto = R.n;
      add(2, '完成所有詞查表', '注意：如果只做查表，把第 1、2 個詞對調時兩個向量內容完全一樣，注意力機制分不出誰在前誰在後。', [
        '全部 6 個詞的詞向量已填入'
      ]);

      st.curPos = 0; st.peUpto = 1;
      add(4, 'pos = 0 位置編碼', '代進正弦／餘弦公式：pos=0 時 sin(0)=0、cos(0)=1。', [
        'PE[0] = (' + R.PE[0].map(v => f(v, 2)).join(', ') + ')'
      ]);

      st.curPos = 1; st.peUpto = 2;
      add(5, 'pos = 1 位置編碼', 'pos=1 時，低維度波長短（sin(1)=0.84, cos(1)=0.54）、高維度波長長（10000^(2/4)=100）。', [
        'PE[1] = (sin(1), cos(1), sin(0.01), cos(0.01)) = (' + R.PE[1].map(v => f(v, 2)).join(', ') + ')'
      ]);

      st.curPos = -1; st.peUpto = R.n;
      add(5, '完成全部位置編碼', '每個位置都有一組獨一無二的正弦／餘弦指紋。', [
        'pos=5：PE[5] = (' + R.PE[5].map(v => f(v, 2)).join(', ') + ')'
      ]);

      st.mode = 'sum';
      add(6, '相加得輸入矩陣 X', '把詞嵌入 E 與位置編碼 PE 逐格相加，同時攜帶「是什麼詞」與「在哪個位置」的資訊！', [
        'X[1] = E[1] + PE[1] = (' + R.X[1].map(v => f(v, 2)).join(', ') + ')'
      ]);

      st.swapped = true;
      add(7, '詞序對調測試', '把第 1 詞與第 2 詞對調後，因為加上的位置編碼不同，送進模型的向量也不同了！', [
        '原 X[1,0] = ' + f(R.X[1][0], 2) + ' → 對調後 = ' + f(R.swapped[1][0], 2)
      ]);
      return steps;
    },

    inputs(rows, p) {
      const R = runPE(rows, p);
      return { E: R.E };
    },

    keys(steps, rows, p) {
      const R = runPE(rows, p);
      const k = {};
      for (let i = 0; i < R.n; i++) {
        for (let j = 0; j < R.d; j++) {
          k['pe_' + i + '_' + j] = R.PE[i][j];
          k['x_' + i + '_' + j] = R.X[i][j];
        }
      }
      return k;
    },

    explain(steps, rows, p) {
      const R = runPE(rows, p);
      return [
        '每個詞先查嵌入表轉成 4 維向量 E，再加上對應位置的正弦／餘弦位置編碼 PE，得到輸入矩陣 X = E + PE。',
        '低維度正弦波頻率高（分辨相鄰詞序），高維度波長長（捕捉長距離位置）。',
        '現代 LLM（如 LLaMA）常進一步改用旋轉位置編碼（RoPE），在計算注意力內積時直接編碼相對距離。'
      ];
    },

    aistudio: {
      operators: ['Execute Python'],
      params: [['d_model', '4']],
      note: 'AI Studio 無原生位置編碼運算子；可對照 M7 第 07 節講義。',
      expect: (steps, rows, p) => {
        const R = runPE(rows, p);
        return ['pos=1 位置編碼：(' + R.PE[1].map(v => f(v, 2)).join(', ') + ')'];
      },
      python: `import numpy as np\n# 依 Vaswani et al. (2017) Attention Is All You Need 公式計算 PE`,
      confirmed: false
    }
  });
})();
