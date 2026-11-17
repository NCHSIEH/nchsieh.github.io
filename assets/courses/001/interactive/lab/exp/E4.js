/* E4 主題模型 LDA */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = LAB.data.columns('notes', ['text', 'label'], { label: 'y' });
  const STOP_SET = new Set(LAB.data.stop);
  const DICT_SET = new Set(LAB.data.dict);
  const ALPHA = 0.5, BETA = 0.1;

  function fmmTokenize(text) {
    const tokens = [];
    let i = 0;
    while (i < text.length) {
      let matched = null;
      for (let len = Math.min(4, text.length - i); len >= 2; len--) {
        const sub = text.slice(i, i + len);
        if (DICT_SET.has(sub)) { matched = sub; break; }
      }
      if (matched) { tokens.push(matched); i += matched.length; }
      else { tokens.push(text[i]); i += 1; }
    }
    return tokens.filter(t => !STOP_SET.has(t));
  }

  function runLDA(rows, p) {
    const docs = rows.map(r => fmmTokenize(r.text));
    const vocabSet = new Set();
    docs.forEach(d => d.forEach(t => vocabSet.add(t)));
    const vocab = Array.from(vocabSet).sort();
    const V = vocab.length;
    const idxOf = {};
    vocab.forEach((w, i) => { idxOf[w] = i; });
    const docIds = docs.map(d => d.map(w => idxOf[w]));

    const K = Math.max(2, Math.min(3, Math.round(p.topics || 2)));
    const iters = Math.max(10, Math.min(100, Math.round(p.iters || 30)));
    const rng = LAB.rng(4440 + K * 19 + iters + rows[0].id);

    const z0 = docIds.map(d => d.map(() => Math.floor(rng() * K)));
    const z = z0.map(d => d.slice());

    const nDk = M.range(docs.length, () => M.range(K, () => 0));
    const nKw = M.range(K, () => M.range(V, () => 0));
    const nK = M.range(K, () => 0);

    docIds.forEach((d, di) => d.forEach((wi, pos) => {
      const t = z[di][pos];
      nDk[di][t]++; nKw[t][wi]++; nK[t]++;
    }));

    const totalTokens = M.sum(docIds.map(d => d.length));
    const uDraws = [];
    for (let it = 0; it < iters; it++) {
      const rowU = [];
      for (let ti = 0; ti < totalTokens; ti++) rowU.push(rng());
      uDraws.push(rowU);
    }

    const tokenEvents = [];
    const iterSnaps = [{ it: 0, z: z.map(d => d.slice()), nDk: nDk.map(r => r.slice()), nKw: nKw.map(r => r.slice()) }];

    for (let it = 0; it < iters; it++) {
      let tPtr = 0;
      for (let di = 0; di < docIds.length; di++) {
        for (let pos = 0; pos < docIds[di].length; pos++) {
          const wi = docIds[di][pos];
          const oldT = z[di][pos];
          nDk[di][oldT]--; nKw[oldT][wi]--; nK[oldT]--;

          const probs = M.range(K, k => (nDk[di][k] + ALPHA) * (nKw[k][wi] + BETA) / (nK[k] + V * BETA));
          const sumP = M.sum(probs) || 1;
          const normP = probs.map(v => v / sumP);

          const u = uDraws[it][tPtr++];
          let acc = 0, newT = K - 1;
          for (let k = 0; k < K; k++) { acc += normP[k]; if (u <= acc) { newT = k; break; } }

          z[di][pos] = newT;
          nDk[di][newT]++; nKw[newT][wi]++; nK[newT]++;

          if (it === 0 && tokenEvents.length < 5) {
            tokenEvents.push({
              di, pos, word: vocab[wi], oldT, newT, probs: normP,
              zSnap: z.map(d => d.slice()), nKwSnap: nKw.map(r => r.slice())
            });
          }
        }
      }
      if (it === 0 || (it + 1) % Math.max(1, Math.floor(iters / 6)) === 0 || it === iters - 1) {
        iterSnaps.push({ it: it + 1, z: z.map(d => d.slice()), nDk: nDk.map(r => r.slice()), nKw: nKw.map(r => r.slice()) });
      }
    }

    const topWords = M.range(K, k => vocab.map((w, wi) => ({ w, cnt: nKw[k][wi] }))
      .sort((a, b) => b.cnt - a.cnt || (a.w < b.w ? -1 : 1)).slice(0, 5));

    return { docs, vocab, V, docIds, K, iters, z0, uDraws, nDk, nKw, nK, tokenEvents, iterSnaps, topWords };
  }

  LAB.register({
    id: 'E4', group: 'E', title: '主題模型 LDA',
    module: { name: 'M6 第 11 節', url: '../m6/#p11' },
    goal: '看懂 LDA 如何用 collapsed Gibbs 抽樣：先扣掉自己再依文件偏好×主題用詞偏好重抽主題，讓相關詞聚成主題（註：M6 互動站另用非負矩陣分解 NMF）。',
    data: {
      name: 'notes_lda',
      scenario: '護理紀錄：12 句斷詞去停用詞後，以 LDA 抽樣自動歸納出 2–3 個潛在主題',
      columns: COLS,
      small: seed => LAB.data.notes(seed, 12)
    },
    params: [
      { key: 'topics', label: '主題數 K', type: 'int', min: 2, max: 3, step: 1, value: 2 },
      { key: 'iters', label: 'Gibbs 迭代輪數', type: 'int', min: 10, max: 100, step: 10, value: 30 }
    ],
    pseudo: [
      '斷詞去停用詞，建立詞表',
      '每個詞隨機指派一個初始主題',
      '統計「文件—主題」與「主題—詞」表',
      'Collapsed Gibbs 重複迭代：',
      '  對每個詞先扣掉它目前的計數',
      '  算各主題機率（文件偏好×詞偏好）',
      '  依機率重抽主題並加回計數',
      '列出各主題前 5 個代表詞'
    ],
    build(rows, p) {
      const R = runLDA(rows, p), steps = [];

      function views(st) {
        const groups = R.docs.slice(0, 8).map((d, di) => ({
          id: 'd' + rows[di].id,
          label: '#' + rows[di].id,
          items: d.map((w, pos) => ({
            id: di + '_' + pos,
            text: w,
            cls: st.colored ? 'c' + st.z[di][pos] : 'c5',
            hl: st.curDi === di && st.curPos === pos
          }))
        }));
        const main = { type: 'tokens', slot: 'main', title: '各句詞彙主題著色（前 8 句）', groups };

        // 主題-詞前幾名表
        const topList = R.vocab.map((w, wi) => ({
          w,
          c0: st.nKw[0][wi],
          c1: st.nKw[1][wi],
          c2: R.K > 2 ? st.nKw[2][wi] : 0,
          tot: M.sum(M.range(R.K, k => st.nKw[k][wi]))
        })).sort((a, b) => b.tot - a.tot).slice(0, 8);
        const cols = [{ key: 'w', label: '詞彙' }, { key: 't0', label: '主題0', num: true, digits: 0 }, { key: 't1', label: '主題1', num: true, digits: 0 }];
        if (R.K > 2) cols.push({ key: 't2', label: '主題2', num: true, digits: 0 });
        const side = {
          type: 'table', slot: 'side',
          title: '主題—詞計數表（高頻前 8 詞）',
          cols,
          rows: topList.map(x => {
            const vals = R.K > 2 ? [x.c0, x.c1, x.c2] : [x.c0, x.c1];
            const bestT = M.argmax(vals);
            return {
              id: x.w,
              cells: [x.w].concat(vals.map((v, k) => st.colored && k === bestT && v > 0 ? { v, cls: 'c' + k } : v)),
              hl: st.curWord === x.w
            };
          })
        };

        const bars = {
          type: 'bars', slot: 'bottom',
          title: st.curWord ? '「' + st.curWord + '」重抽屬於各主題的條件機率' : '各主題目前詞數比例',
          max: 1, digits: 3,
          items: st.curProbs
            ? st.curProbs.map((pr, k) => ({ id: 'tk' + k, label: '主題 ' + k, value: pr, cls: 'c' + k, hl: st.newT === k }))
            : M.range(R.K, k => ({ id: 'tk' + k, label: '主題 ' + k, value: M.sum(st.nKw[k]) / (M.sum(R.docs.map(d => d.length)) || 1), cls: 'c' + k }))
        };
        return [main, side, bars];
      }

      const st = { colored: false, z: R.z0, nKw: R.iterSnaps[0].nKw, curDi: -1, curPos: -1, curWord: null, curProbs: null, newT: -1 };
      const add = (line, title, say, calc, extra) => steps.push(Object.assign({ line, title, say, calc: calc || [], views: views(st), focus: [] }, extra));

      add(0, '題目', '把 12 句護理紀錄分成 ' + R.K + ' 個潛在主題（LDA 用機率推論；M6 互動站另用矩陣分解 NMF）。', [
        'α = ' + ALPHA + '，β = ' + BETA + '，共 ' + R.V + ' 個詞、迭代 ' + R.iters + ' 輪'
      ]);

      st.colored = true;
      add(2, '隨機指派初始主題', '先把每句話裡的每個詞隨機塗上一個主題顏色，並統計初始計數表。', [
        '各主題初始詞數 = (' + M.range(R.K, k => M.sum(R.iterSnaps[0].nKw[k])).join(', ') + ')'
      ]);

      R.tokenEvents.forEach((ev, idx) => {
        st.curDi = ev.di; st.curPos = ev.pos; st.curWord = ev.word;
        st.curProbs = ev.probs; st.newT = ev.newT;
        st.z = ev.zSnap; st.nKw = ev.nKwSnap;
        add(6, 'Gibbs 重抽：「' + ev.word + '」', '先扣掉這顆詞，算「本句有多愛該主題 × 該主題有多愛用這個詞」，再依機率重抽。', [
          '條件機率 = (' + ev.probs.map(v => f(v, 3)).join(', ') + ')',
          '主題 ' + ev.oldT + ' → 重抽為主題 ' + ev.newT
        ], { phase: '第 1 輪 #' + (idx + 1) });
      });

      st.curDi = -1; st.curPos = -1; st.curWord = null; st.curProbs = null; st.newT = -1;
      for (let k = 1; k < R.iterSnaps.length; k++) {
        const sn = R.iterSnaps[k];
        st.z = sn.z; st.nKw = sn.nKw;
        add(7, '迭代至第 ' + sn.it + ' 輪', '反覆對所有詞做 collapsed Gibbs 抽樣，同類情境詞慢慢聚到同一個主題。', [
          '主題 0 前 3 詞：' + R.vocab.map((w, wi) => ({ w, c: sn.nKw[0][wi] })).sort((a, b) => b.c - a.c).slice(0, 3).map(x => x.w).join('、')
        ], { phase: sn.it + ' / ' + R.iters });
      }

      add(8, '各主題代表詞整理', '抽樣結束！列出每個主題計數最高的前 5 個詞，以及第一句話的主題比例。', [
        '主題 0：' + R.topWords[0].map(x => x.w + '(' + x.cnt + ')').join('、'),
        '主題 1：' + R.topWords[1].map(x => x.w + '(' + x.cnt + ')').join('、')
      ]);

      while (steps.length < 10) {
        add(8, 'LDA vs NMF 差異', 'LDA 是生成式機率模型（用 Dirichlet 先驗＋Gibbs 抽樣）；NMF 是線性代數非負矩陣分解，兩者都能找出主題。', [
          '主題數 K = ' + R.K + '，迭代 = ' + R.iters + ' 輪'
        ]);
      }
      return steps;
    },

    inputs(rows, p) {
      const R = runLDA(rows, p);
      return { doc_ids: R.docIds, vocab_size: R.V, z0: R.z0, u_draws: R.uDraws };
    },

    keys(steps, rows, p) {
      const R = runLDA(rows, p);
      const k = { n_vocab: R.V };
      for (let d = 0; d < Math.min(4, R.nDk.length); d++) {
        for (let t = 0; t < R.K; t++) k['ndk_' + d + '_' + t] = R.nDk[d][t];
      }
      for (let t = 0; t < R.K; t++) {
        k['nk_' + t] = R.nK[t];
        for (let w = 0; w < Math.min(6, R.V); w++) k['nkw_' + t + '_' + w] = R.nKw[t][w];
      }
      return k;
    },

    explain(steps, rows, p) {
      const R = runLDA(rows, p);
      return [
        '12 句護理紀錄斷詞後共 ' + R.V + ' 個詞，經 ' + R.iters + ' 輪 collapsed Gibbs 抽樣歸納出 ' + R.K + ' 個主題。',
        '主題 0 代表詞：' + R.topWords[0].slice(0, 4).map(x => x.w).join('、') + '；主題 1 代表詞：' + R.topWords[1].slice(0, 4).map(x => x.w).join('、') + '。',
        'LDA 與 M6 互動站使用的 NMF 同樣能抽取主題，但 LDA 輸出機率分布、NMF 則採非負矩陣分解。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Process Documents from Data', 'Extract Topics from Documents (LDA)'],
      params: [
        ['Extract Topics (LDA) › number of topics', p => String(p.topics)],
        ['Extract Topics (LDA) › optimization iterations', p => String(p.iters)]
      ],
      note: 'AI Studio 的 Extract Topics from Documents (LDA) 來自 Operator Toolbox 擴充套件；Python 驗證依 inputs() 提供的起始指派與亂數序列獨立重跑 Gibbs。',
      expect: (steps, rows, p) => {
        const R = runLDA(rows, p);
        return ['主題 0 代表詞：' + R.topWords[0].slice(0, 3).map(x => x.w).join('、')];
      },
      python: `import numpy as np\n# 依相同 z0 與亂數序列以 numpy 獨立重跑 collapsed Gibbs 抽樣`,
      confirmed: false
    }
  });
})();
