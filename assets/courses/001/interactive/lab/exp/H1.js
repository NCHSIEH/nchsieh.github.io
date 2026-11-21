/* H1 BPE 斷詞 */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = [
    { key: 'word', label: '醫療詞', type: 'text', role: 'x' },
    { key: 'freq', label: '出現次數', type: 'num', role: 'x' }
  ];
  const CORPUS = [
    { id: 1, word: 'lower', freq: 5 },
    { id: 2, word: 'lowest', freq: 2 },
    { id: 3, word: 'newer', freq: 6 },
    { id: 4, word: 'wider', freq: 3 },
    { id: 5, word: 'fever', freq: 5 },
    { id: 6, word: 'severe', freq: 4 },
    { id: 7, word: 'care', freq: 4 }
  ];

  function runBPE(rows, p) {
    const nMerges = Math.max(1, Math.min(12, Math.round(p.merges || 6)));
    let words = rows.map(r => ({
      id: r.id,
      word: r.word,
      freq: r.freq,
      syms: r.word.split('').concat(['</w>'])
    }));

    const vocabSet = new Set();
    words.forEach(w => w.syms.forEach(s => vocabSet.add(s)));

    const mergeHistory = [];
    const rules = [];

    for (let m = 0; m < nMerges; m++) {
      const pairCounts = new Map();
      const pairOrder = [];
      words.forEach(w => {
        for (let i = 0; i < w.syms.length - 1; i++) {
          const key = w.syms[i] + '\t' + w.syms[i + 1];
          if (!pairCounts.has(key)) { pairCounts.set(key, 0); pairOrder.push(key); }
          pairCounts.set(key, pairCounts.get(key) + w.freq);
        }
      });
      if (!pairOrder.length) break;

      let bestKey = pairOrder[0], bestCnt = pairCounts.get(bestKey);
      pairOrder.forEach(k => {
        const c = pairCounts.get(k);
        if (c > bestCnt) { bestCnt = c; bestKey = k; }
      });

      const [a, b] = bestKey.split('\t');
      const mergedSym = a + b;
      rules.push([a, b, mergedSym]);
      vocabSet.add(mergedSym);

      words = words.map(w => {
        const next = [];
        let i = 0;
        while (i < w.syms.length) {
          if (i < w.syms.length - 1 && w.syms[i] === a && w.syms[i + 1] === b) {
            next.push(mergedSym);
            i += 2;
          } else {
            next.push(w.syms[i]);
            i += 1;
          }
        }
        return Object.assign({}, w, { syms: next });
      });

      const topPairs = pairOrder.map(k => ({ pair: k.replace('\t', ' + '), count: pairCounts.get(k), key: k }))
        .sort((x, y) => y.count - x.count).slice(0, 6);

      mergeHistory.push({
        step: m + 1,
        a, b, mergedSym, count: bestCnt,
        topPairs,
        wordsSnap: words.map(w => ({ id: w.id, word: w.word, freq: w.freq, syms: w.syms.slice() })),
        vocabSnap: Array.from(vocabSet)
      });
    }

    // 用學到的規則切一個沒看過的新詞 'newest'
    let newWordSyms = 'newest'.split('').concat(['</w>']);
    rules.forEach(([a, b, ab]) => {
      const next = [];
      let i = 0;
      while (i < newWordSyms.length) {
        if (i < newWordSyms.length - 1 && newWordSyms[i] === a && newWordSyms[i + 1] === b) {
          next.push(ab); i += 2;
        } else { next.push(newWordSyms[i]); i += 1; }
      }
      newWordSyms = next;
    });

    return { mergeHistory, rules, finalVocab: Array.from(vocabSet), newWordSyms };
  }

  LAB.register({
    id: 'H1', group: 'H', title: 'BPE 斷詞',
    module: { name: 'M7 第 04 節', url: '../m7/#p04' },
    goal: '看懂 LLM 如何從單一字元出發，反覆合併最常相鄰出現的符號對，自動長出子詞（subword）詞表來切分未見過的新詞。',
    data: {
      name: 'bpe_corpus',
      scenario: '7 個英文詞與出現次數，從字元級開始執行 Byte Pair Encoding 合併',
      columns: COLS,
      small: () => CORPUS.map(r => Object.assign({}, r))
    },
    params: [
      { key: 'merges', label: '合併次數', type: 'int', min: 1, max: 12, step: 1, value: 6 }
    ],
    pseudo: [
      '把每個詞拆成單一字元與結尾 </w>',
      '重複指定的合併次數：',
      '  統計所有相鄰符號對的總次數',
      '  挑次數最多的一對 (A, B)',
      '  合併成新符號 AB 並加入詞表',
      '用學到的合併規則切分新詞 newest'
    ],
    build(rows, p) {
      const R = runBPE(rows, p), steps = [];
      const initWords = rows.map(r => ({ id: r.id, word: r.word, freq: r.freq, syms: r.word.split('').concat(['</w>']) }));
      const initVocab = [];
      initWords.forEach(w => w.syms.forEach(s => { if (!initVocab.includes(s)) initVocab.push(s); }));

      function views(st) {
        const groups = st.words.map(w => ({
          id: 'w' + w.id,
          label: w.word + ' (×' + w.freq + ')',
          items: w.syms.map((s, idx) => ({
            id: w.id + '_' + idx,
            text: s,
            state: s === st.newSym ? 'new' : undefined,
            cls: s === st.newSym ? 'new' : 'c0'
          }))
        }));
        if (st.showNewWord) {
          groups.push({
            id: 'nw', label: '新詞 newest',
            items: R.newWordSyms.map((s, idx) => ({ id: 'nw_' + idx, text: s, cls: 'c1' }))
          });
        }
        const main = { type: 'tokens', slot: 'main', title: '語料子詞切分狀態', groups };
        const side = {
          type: 'table', slot: 'side',
          title: '相鄰符號對次數排名',
          cols: [{ key: 'pair', label: '符號對' }, { key: 'cnt', label: '次數', num: true, digits: 0 }],
          rows: st.topPairs.map((tp, idx) => ({ id: 'tp' + idx, cells: [tp.pair, tp.count], hl: idx === 0 }))
        };
        const bottom = {
          type: 'tokens', slot: 'bottom',
          title: '詞表（共 ' + st.vocab.length + ' 個符號）',
          items: st.vocab.slice(-16).map((s, idx) => ({
            id: 'v_' + s, text: s, cls: s === st.newSym ? 'new' : 'c0'
          }))
        };
        return [main, side, bottom];
      }

      const initPairs = R.mergeHistory.length ? R.mergeHistory[0].topPairs : [];
      const st = { words: initWords, topPairs: initPairs, vocab: initVocab, newSym: null, showNewWord: false };
      const add = (line, title, say, calc, extra) => steps.push(Object.assign({ line, title, say, calc: calc || [], views: views(st), focus: [] }, extra));

      add(0, '題目', 'LLM 不把每個英文單字都背起來，也不只看單一字母，而是用 BPE 找出最常見的字根／字尾片段。', [
        '初始字元詞表大小 = ' + initVocab.length
      ]);

      add(1, '拆成字元與 </w>', '把 7 個詞全部拆成單字元，詞尾加上 </w> 標記，避免跨詞誤合併。', [
        '例：lower → l o w e r </w>'
      ]);

      add(3, '統計初始相鄰符號對', '掃描全部詞彙並乘上詞頻，統計出最常相鄰的符號對，準備執行第一次合併。', [
        '最高頻符號對：' + (initPairs[0] ? initPairs[0].pair + '（' + initPairs[0].count + ' 次）' : '無')
      ]);

      R.mergeHistory.forEach((mh, idx) => {
        st.words = mh.wordsSnap;
        st.topPairs = mh.topPairs;
        st.vocab = mh.vocabSnap;
        st.newSym = mh.mergedSym;
        if (idx < 5 || idx === R.mergeHistory.length - 1) {
          add(4, '第 ' + mh.step + ' 次合併：' + mh.mergedSym, '相鄰符號對「' + mh.a + ' + ' + mh.b + '」出現 ' + mh.count + ' 次最多，合併成「' + mh.mergedSym + '」加入詞表。', [
            '合併規則 #' + mh.step + '：' + mh.a + ' + ' + mh.b + ' → ' + mh.mergedSym + '（' + mh.count + ' 次）',
            '詞表大小 = ' + mh.vocabSnap.length
          ], { phase: mh.step + ' / ' + R.mergeHistory.length });
        }
      });

      add(6, '遇見未見新詞 newest', '訓練語料裡只有 newer 與 lowest，沒有 newest；先將它拆成字元序列，依序套用學到的合併規則。', [
        '初始字元：n | e | w | e | s | t | </w>（7 片段）'
      ]);

      st.showNewWord = true; st.newSym = null;
      add(6, '套用規則切分新詞', '依序套用 ' + R.rules.length + ' 條合併規則後，未見新詞「newest」被切成 ' + R.newWordSyms.length + ' 個片段。' + (R.newWordSyms.length < 7 ? '已合併出較長的子詞，不會變成無法辨識的 <UNK>。' : '一條規則都沒套用到，只能退回單字元，所以仍不會出現 <UNK>；加大合併次數或換含 est 的語料才會學到詞根。'), [
        'newest → ' + R.newWordSyms.join(' | ') + '（共 ' + R.newWordSyms.length + ' 個 token）'
      ]);

      add(6, '詞表大小與 OOV 權衡', 'BPE 讓詞表維持在數萬～十幾萬大小，卻幾乎不會遇到無法辨識的 <UNK>，醫療專有名詞也能拆字根理解。', [
        '最終詞表共 ' + R.finalVocab.length + ' 個符號'
      ]);

      add(6, '中文與位元組 BPE', '現代 LLM（如 GPT/Claude）採 UTF-8 Byte-level BPE：英文常 1 詞 ≈ 1.3 token，中文 1 字則常占 1–2 token。', [
        '實務提醒：Token 數直接決定 API 費用與上下文視窗上限'
      ]);

      add(6, 'BPE vs WordPiece', 'BPE 依頻率貪心合併；BERT 的 WordPiece 改依似然增益合併；SentencePiece Unigram 則從大詞表往下刪減。', [
        '三者皆屬子詞斷詞（Subword Tokenization）家族'
      ]);

      add(6, '實驗總結', '斷詞是進入 LLM 的第一關；切好的 Token ID 接下來會送進 H2 查詞嵌入表與加位置編碼。', [
        '合併次數 = ' + R.rules.length + '｜最終詞表 = ' + R.finalVocab.length
      ]);
      return steps;
    },

    keys(steps, rows, p) {
      const R = runBPE(rows, p);
      const k = {
        vocab_size: R.finalVocab.length,
        new_word_len: R.newWordSyms.length
      };
      R.mergeHistory.forEach((mh, i) => { k['merge_cnt_' + i] = mh.count; });
      return k;
    },

    explain(steps, rows, p) {
      const R = runBPE(rows, p);
      return [
        '經過 ' + R.mergeHistory.length + ' 次 BPE 合併後，詞表從字元擴增到 ' + R.finalVocab.length + ' 個子詞符號。',
        '新詞「newest」套用學到的合併規則後，被切分成「' + R.newWordSyms.join(' / ') + '」（共 ' + R.newWordSyms.length + ' 個 token）。',
        'BPE 讓模型既能控制詞表大小，又不會遇到沒看過的詞就變成 <UNK>。'
      ];
    },

    aistudio: {
      operators: ['Execute Python'],
      params: [['merges', p => String(p.merges)]],
      note: 'AI Studio 無原生 BPE 斷詞運算子；可對照 M7 第 04 節的 Token 與成本試算。',
      expect: (steps, rows, p) => {
        const R = runBPE(rows, p);
        return ['詞表大小 = ' + R.finalVocab.length + '，newest 切分：' + R.newWordSyms.join(' ')];
      },
      python: `# 依 Sennrich et al. (2016) BPE 演算法實作`,
      confirmed: false
    }
  });
})();
