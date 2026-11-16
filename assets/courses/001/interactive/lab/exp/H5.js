/* H5 生成解碼 */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = [
    { key: 'tok', label: '候選詞', type: 'text', role: 'x' },
    { key: 'logit', label: 'Logit', type: 'num', role: 'x' }
  ];
  // 兩組情境的 8 個候選詞與原始 logits，及後續 4 步的示意 logits
  const CANDS = [
    { tok: '建議', l: [3.2, 2.1, 1.5, 0.9, 0.4, -0.2, -0.8, -1.5] },
    { tok: '應立即', l: [2.8, 3.0, 1.8, 1.0, 0.5, 0.0, -0.5, -1.2] },
    { tok: '請', l: [2.2, 2.5, 3.1, 1.2, 0.7, 0.1, -0.6, -1.0] },
    { tok: '協助', l: [1.6, 2.4, 2.6, 3.3, 1.4, 0.3, -0.4, -0.9] },
    { tok: '病人', l: [1.1, 1.9, 2.0, 2.7, 3.4, 0.8, 0.1, -0.7] },
    { tok: '休息', l: [0.5, 1.0, 1.4, 2.1, 2.9, 3.1, 1.0, -0.3] },
    { tok: '觀察', l: [0.2, 0.6, 0.9, 1.5, 2.2, 2.6, 2.9, 0.4] },
    { tok: '記錄', l: [-0.3, 0.1, 0.4, 0.8, 1.3, 1.9, 2.3, 2.7] }
  ];

  function decodeStep(logits, temp, topK, topP, strategy, u) {
    const scaled = logits.map(z => z / temp);
    const mx = M.max(scaled);
    const exps = scaled.map(v => Math.exp(v - mx));
    const sumE = M.sum(exps) || 1;
    const probs = exps.map(e => e / sumE);

    // Top-k
    const order = probs.map((pr, i) => ({ i, pr })).sort((a, b) => b.pr - a.pr || a.i - b.i);
    const keepK = new Set(order.slice(0, topK).map(o => o.i));
    const afterK = probs.map((pr, i) => keepK.has(i) ? pr : 0);
    const sumK = M.sum(afterK) || 1;
    const probsK = afterK.map(v => v / sumK);

    // Top-p (nucleus)
    const orderK = probsK.map((pr, i) => ({ i, pr })).filter(o => o.pr > 0).sort((a, b) => b.pr - a.pr || a.i - b.i);
    const keepP = new Set();
    let accP = 0;
    for (let idx = 0; idx < orderK.length; idx++) {
      keepP.add(orderK[idx].i);
      accP += orderK[idx].pr;
      if (accP >= topP - 1e-12) break;
    }
    const afterP = probsK.map((pr, i) => keepP.has(i) ? pr : 0);
    const sumP = M.sum(afterP) || 1;
    const probsP = afterP.map(v => v / sumP);

    let picked;
    if (strategy === 'greedy') {
      picked = M.argmax(probsP);
    } else {
      let acc = 0;
      picked = orderK.length ? orderK[0].i : 0;
      for (let i = 0; i < probsP.length; i++) {
        acc += probsP[i];
        if (u <= acc) { picked = i; break; }
      }
    }
    return { scaled, probs, probsK, probsP, keepK, keepP, picked };
  }

  function runDecode(rows, p) {
    const temp = p.temperature || 0.8;
    const topK = Math.max(1, Math.min(8, Math.round(p.top_k || 5)));
    const topP = p.top_p || 0.9;
    const strategy = p.strategy || 'sample';
    const rng = LAB.rng(5500 + Math.round(p.seed || 1) * 29);
    const uDraws = M.range(5, () => rng());

    const step0Logits = rows.map(r => r.logit);
    const seq = [];
    for (let t = 0; t < 5; t++) {
      const lg = t === 0 ? step0Logits : CANDS.map(c => c.l[Math.min(7, t)]);
      const res = decodeStep(lg, temp, topK, topP, strategy, uDraws[t]);
      seq.push(Object.assign({ step: t + 1, tok: CANDS[res.picked].tok, u: uDraws[t], logits: lg }, res));
    }
    return { temp, topK, topP, strategy, uDraws, seq };
  }

  LAB.register({
    id: 'H5', group: 'H', title: '生成解碼',
    module: { name: 'M7 第 09 節', url: '../m7/#p09' },
    goal: '看懂 LLM 如何把輸出 logits 經由 Temperature 縮放、Softmax、Top-k 與 Top-p 過濾，決定下一個生成的 token。',
    data: {
      name: 'llm_decode',
      scenario: '提示「病人頭暈下床…」後，示意模型給出 8 個下一個詞的 logits，逐步示範解碼參數的影響',
      columns: COLS,
      small: () => CANDS.map((c, i) => ({ id: i + 1, tok: c.tok, logit: c.l[0] }))
    },
    params: [
      { key: 'strategy', label: '解碼策略', type: 'choice', value: 'sample', options: [{ v: 'greedy', label: 'Greedy (選最大)' }, { v: 'sample', label: '抽樣 (Sampling)' }] },
      { key: 'temperature', label: 'Temperature', type: 'num', min: 0.2, max: 2.0, step: 0.2, value: 0.8 },
      { key: 'top_k', label: 'Top-k', type: 'int', min: 1, max: 8, step: 1, value: 5 },
      { key: 'top_p', label: 'Top-p', type: 'num', min: 0.5, max: 1.0, step: 0.1, value: 0.9 },
      { key: 'seed', label: '抽樣種子', type: 'int', min: 1, max: 5, step: 1, value: 1 }
    ],
    pseudo: [
      '取得 8 個候選詞的原始 logits',
      '除以 Temperature 調整分布陡峭度',
      'Softmax 轉成機率分布',
      'Top-k：只留機率前 K 名',
      'Top-p：由大到小累加至超過 p',
      '依策略選詞（最大或依機率抽樣）',
      '接上詞尾繼續生成下一個 token'
    ],
    build(rows, p) {
      const R = runDecode(rows, p), steps = [];
      const s0 = R.seq[0];

      function views(st) {
        const cur = R.seq[st.seqIdx];
        const probsShow = st.stage === 'p' ? cur.probsP : st.stage === 'k' ? cur.probsK : cur.probs;
        const main = {
          type: 'bars', slot: 'main',
          title: '候選詞機率分布（第 ' + (st.seqIdx + 1) + ' 詞）',
          max: 1, digits: 3,
          items: CANDS.map((c, i) => ({
            id: 'c' + i,
            label: c.tok,
            value: st.showProb ? probsShow[i] : Math.max(0, cur.logits[i] + 2),
            cls: st.pickedIdx === i ? 'hl' : (probsShow[i] <= 0 && st.showProb ? 'dim' : 'c0'),
            dim: st.showProb && probsShow[i] <= 0,
            hl: st.pickedIdx === i
          }))
        };
        const side = {
          type: 'table', slot: 'side',
          title: 'Logit、機率與過濾狀態',
          cols: [
            { key: 'tok', label: '詞' },
            { key: 'lg', label: 'Logit', num: true, digits: 1 },
            { key: 'pr', label: '原機率', num: true, digits: 3 },
            { key: 'pf', label: '過濾後', num: true, digits: 3 }
          ],
          rows: CANDS.map((c, i) => ({
            id: c.tok,
            cells: [c.tok, cur.logits[i], st.showProb ? cur.probs[i] : null, st.stage === 'p' ? cur.probsP[i] : (st.stage === 'k' ? cur.probsK[i] : null)],
            hl: st.pickedIdx === i
          }))
        };
        const tokens = {
          type: 'tokens', slot: 'bottom',
          title: '已生成的句子（示意模型）',
          items: [{ id: 'p0', text: '病人頭暈下床…', cls: 'c5' }].concat(
            R.seq.slice(0, st.genCount).map((x, idx) => ({ id: 'g' + idx, text: x.tok, cls: 'c1', hl: idx === st.genCount - 1 }))
          )
        };
        return [main, side, tokens];
      }

      const st = { seqIdx: 0, showProb: false, stage: 'soft', pickedIdx: -1, genCount: 0 };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '題目', '給定提示「病人頭暈下床…」，模型輸出 8 個候選詞的原始分數（logits）。看解碼參數如何決定下一個詞。', [
        'T = ' + f(R.temp, 1) + '，Top-k = ' + R.topK + '，Top-p = ' + f(R.topP, 1) + '，策略 = ' + R.strategy
      ]);

      add(2, '除以 Temperature', '先將每個 logit 除以 Temperature = ' + f(R.temp, 1) + '。T < 1 會拉大差距、變保守；T > 1 會壓平分布、變有創意。', [
        CANDS[0].tok + '：' + f(s0.logits[0], 1) + ' ÷ ' + f(R.temp, 1) + ' = ' + f(s0.scaled[0], 2)
      ]);

      st.showProb = true;
      add(3, 'Softmax 轉成機率', '透過指數歸一化把縮放後的分數轉成總和為 1 的機率分布。', [
        '最高機率：「' + CANDS[M.argmax(s0.probs)].tok + '」(' + LAB.pct(M.max(s0.probs), 1) + ')'
      ]);

      st.stage = 'k';
      add(4, 'Top-k 過濾 (k=' + R.topK + ')', '只保留機率最高的前 ' + R.topK + ' 個候選詞，其餘歸零並重新正規化。', [
        '保留詞數 = ' + s0.keepK.size + ' / 8'
      ]);

      st.stage = 'p';
      add(5, 'Top-p 過濾 (p=' + f(R.topP, 1) + ')', '由大到小累加機率直到剛超過 ' + f(R.topP, 1) + ' 就截斷，動態決定候選池大小。', [
        '最終候選數 = ' + s0.keepP.size + ' 個'
      ]);

      st.pickedIdx = s0.picked; st.genCount = 1;
      add(6, '決定第 1 個生成詞', R.strategy === 'greedy' ? 'Greedy 直接挑機率最高的「' + s0.tok + '」。' : '依亂數 u = ' + f(s0.u, 3) + ' 落在機率區間，抽中「' + s0.tok + '」。', [
        '選出：「' + s0.tok + '」（過濾後機率 ' + LAB.pct(s0.probsP[s0.picked], 1) + '）'
      ]);

      for (let t = 1; t < 5; t++) {
        st.seqIdx = t; st.pickedIdx = R.seq[t].picked; st.genCount = t + 1;
        add(7, '接續生成第 ' + (t + 1) + ' 詞', '把新產生的詞接回上下文，用同樣規則產生第 ' + (t + 1) + ' 個 token：「' + R.seq[t].tok + '」。', [
          '目前已生成：' + R.seq.slice(0, t + 1).map(x => x.tok).join(' ')
        ]);
      }

      return steps;
    },

    inputs(rows, p) {
      const R = runDecode(rows, p);
      return { u_draws: R.uDraws };
    },

    keys(steps, rows, p) {
      const R = runDecode(rows, p);
      const s0 = R.seq[0];
      const k = { picked_0: s0.picked, n_keep_p: s0.keepP.size };
      for (let i = 0; i < 8; i++) {
        k['p_soft_' + i] = s0.probs[i];
        k['p_topk_' + i] = s0.probsK[i];
        k['p_topp_' + i] = s0.probsP[i];
      }
      R.seq.forEach((s, t) => { k['seq_picked_' + t] = s.picked; });
      return k;
    },

    explain(steps, rows, p) {
      const R = runDecode(rows, p);
      return [
        '在 Temperature = ' + f(R.temp, 1) + '、Top-k = ' + R.topK + '、Top-p = ' + f(R.topP, 1) + ' 下，連續生成的 5 個詞為「' + R.seq.map(x => x.tok).join(' ') + '」。',
        '調低 Temperature 會讓最高分候選詞機率更集中（回答更穩定）；調高則讓冷門詞也有機會被抽中。',
        '注意：本實驗使用預先設計的示意 logits 表展示解碼機制，並非真實大型語言模型。'
      ];
    },

    aistudio: {
      operators: ['Execute Python'],
      params: [
        ['temperature', p => String(p.temperature)],
        ['top_p', p => String(p.top_p)]
      ],
      note: '可對照 M7 第 09 節互動圖解與 Dify LLM 節點的 Temperature / Top P 參數設定。',
      expect: (steps, rows, p) => {
        const R = runDecode(rows, p);
        return ['生成序列：' + R.seq.map(x => x.tok).join(' ')];
      },
      python: `import numpy as np\n# softmax(logits / T) 後依 Top-k / Top-p 過濾並正規化`,
      confirmed: false
    }
  });
})();
