/* E2 文本分類：詞袋 Naive Bayes */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = LAB.data.columns('notes', ['text', 'label'], { label: 'y' });
  const CLAB = ['跌倒風險', '疼痛', '傷口照護'];
  const QUERIES = [
    { v: '0', label: '病人夜間下床步態不穩' },
    { v: '1', label: '主訴傷口疼痛給予止痛藥' },
    { v: '2', label: '壓傷傷口紅腫有滲液' }
  ];
  const STOP_SET = new Set(LAB.data.stop);
  const DICT_SET = new Set(LAB.data.dict);

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

  function runMNB(rows, p) {
    const qText = QUERIES[parseInt(p.query || '0', 10)].label;
    const docs = rows.map(r => fmmTokenize(r.text));
    const qToks = fmmTokenize(qText);

    const vocabSet = new Set();
    docs.forEach(d => d.forEach(t => vocabSet.add(t)));
    const vocab = Array.from(vocabSet).sort();
    const V = vocab.length;
    const alpha = p.laplace || 0;
    const n = rows.length;

    const cCounts = [0, 1, 2].map(c => rows.filter(r => r.label === c).length);
    const priors = cCounts.map(cnt => cnt / n);

    const wordCounts = [0, 1, 2].map(c => {
      const m = {};
      vocab.forEach(w => { m[w] = 0; });
      docs.forEach((d, i) => { if (rows[i].label === c) d.forEach(w => { m[w]++; }); });
      return m;
    });
    const totalWords = [0, 1, 2].map(c => M.sum(vocab.map(w => wordCounts[c][w])));

    const wordProbs = [0, 1, 2].map(c => {
      const m = {};
      const denom = totalWords[c] + alpha * V;
      vocab.forEach(w => {
        m[w] = denom > 0 ? (wordCounts[c][w] + alpha) / denom : 0;
      });
      return m;
    });

    const knownQ = qToks.filter(w => vocabSet.has(w));
    const logScores = [0, 1, 2].map(c => {
      let s = Math.log(priors[c]);
      knownQ.forEach(w => {
        const pr = wordProbs[c][w];
        s += pr > 0 ? Math.log(pr) : -50;
      });
      return s;
    });

    const maxLog = M.max(logScores);
    const exps = logScores.map(s => Math.exp(s - maxLog));
    const sumE = M.sum(exps) || 1;
    const post = exps.map(e => e / sumE);
    const pred = M.argmax(post);

    return { qText, docs, qToks, knownQ, vocab, V, alpha, cCounts, priors, wordCounts, totalWords, wordProbs, logScores, post, pred };
  }

  LAB.register({
    id: 'E2', group: 'E', title: '文本分類：詞袋 Naive Bayes',
    module: { name: 'M6 第 09 節', url: '../m6/#p09' },
    goal: '看懂多項式 Naive Bayes 如何統計各類詞頻並做 Laplace 平滑，把測試句每個詞的條件機率取對數累加來分類護理紀錄。',
    data: {
      name: 'notes_nb',
      scenario: '護理紀錄分類：12 句分為「跌倒風險／疼痛／傷口照護」三類，預測測試句類別',
      columns: COLS,
      small: seed => LAB.data.notes(seed, 12)
    },
    params: [
      { key: 'laplace', label: 'Laplace 平滑 α', type: 'int', min: 0, max: 2, step: 1, value: 1 },
      { key: 'query', label: '測試句', type: 'choice', value: '0', options: QUERIES }
    ],
    pseudo: [
      '把 12 句紀錄斷詞並去停用詞',
      '計算三類先驗機率 P(類別)',
      '統計各類別中每個詞的出現次數',
      '套用 Laplace 平滑算條件機率',
      '對測試句的每個詞：',
      '  查各類條件機率並取 log 累加',
      '比較三類總分並正規化為後驗'
    ],
    build(rows, p) {
      const R = runMNB(rows, p), steps = [];
      const showWords = Array.from(new Set(R.knownQ.concat(R.vocab.slice(0, 8)))).slice(0, 8);

      function views(st) {
        const main = {
          type: 'table', slot: 'main',
          title: '詞 × 類別條件機率表（α = ' + R.alpha + '）',
          cols: [
            { key: 'w', label: '詞彙' },
            { key: 'p0', label: 'P(w|跌倒)', num: true, digits: 3 },
            { key: 'p1', label: 'P(w|疼痛)', num: true, digits: 3 },
            { key: 'p2', label: 'P(w|傷口)', num: true, digits: 3 }
          ],
          rows: showWords.map(w => ({
            id: w,
            cells: [
              w,
              st.probReady ? R.wordProbs[0][w] : null,
              st.probReady ? R.wordProbs[1][w] : null,
              st.probReady ? R.wordProbs[2][w] : null
            ],
            hl: st.curWord === w
          }))
        };
        const minL = Math.min(-5, M.min(st.scores) - 2);
        const barVals = [0, 1, 2].map(c => st.norm ? R.post[c] : Math.max(0, st.scores[c] - minL));
        const side = {
          type: 'bars', slot: 'side',
          title: st.norm ? '三類後驗機率' : '三類累計對數分數 ln P(c) + Σ ln P(w|c)',
          max: st.norm ? 1 : Math.max(5, Math.ceil(M.max(barVals) * 1.15)),
          digits: 3,
          items: [0, 1, 2].map(c => ({
            id: 'c' + c,
            label: CLAB[c] + (st.norm ? '' : ' (' + f(st.scores[c], 2) + ')'),
            value: barVals[c],
            cls: st.norm && R.pred === c ? 'good' : 'c' + c,
            hl: st.norm && R.pred === c
          }))
        };
        const tokens = {
          type: 'tokens', slot: 'bottom',
          title: '測試句斷詞：「' + R.qText + '」',
          items: R.knownQ.map((w, idx) => ({
            id: 'qt_' + idx, text: w,
            cls: st.curIdx === idx ? 'hl' : (idx < st.curIdx ? 'c1' : 'c5'),
            hl: st.curIdx === idx
          }))
        };
        return [main, side, tokens];
      }

      const st = { probReady: false, curWord: null, curIdx: -1, scores: [0, 0, 0], norm: false };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '題目', '把 12 句護理紀錄分成「跌倒風險、疼痛、傷口照護」三類，預測測試句「' + R.qText + '」屬於哪一類。', [
        '測試句斷詞：' + R.knownQ.join(' / ')
      ]);

      add(1, '斷詞與建詞表', '沿用 E1 的正向最大匹配斷詞並去掉停用詞，從 12 句建立共 ' + R.V + ' 個詞的詞表。', [
        '詞表大小 |V| = ' + R.V + '，各類總詞數 = (' + R.totalWords.join(', ') + ')'
      ]);

      st.scores = R.priors.map(pr => Math.log(pr));
      add(2, '計算三類先驗機率', '先統計三類各有幾句，取對數作為分數的起點（連乘改相加可避免浮點數下溢）。', [
        'P(跌倒)=P(疼痛)=P(傷口)=' + R.cCounts[0] + '÷' + rows.length + '=' + f(R.priors[0], 3),
        '起始對數分數 ln P(c) = ' + f(st.scores[0], 3)
      ]);

      st.probReady = true;
      add(4, '建詞頻表與平滑機率', '每個詞的機率為 (該類出現次數 + α) ÷ (該類總詞數 + α·|V|)。', [
        'α = ' + R.alpha + '，分母 = (' + R.totalWords.map(tw => tw + R.alpha * R.V).join(', ') + ')'
      ]);

      R.knownQ.forEach((w, idx) => {
        st.curWord = w; st.curIdx = idx;
        st.scores = st.scores.map((s, c) => s + (R.wordProbs[c][w] > 0 ? Math.log(R.wordProbs[c][w]) : -50));
        add(6, '查詞：「' + w + '」', '從機率表查出「' + w + '」在三類的機率，取對數後加到各類分數。', [
          'P(' + w + '|三類) = (' + [0, 1, 2].map(c => f(R.wordProbs[c][w], 3)).join(', ') + ')',
          '累計 log 分數 = (' + st.scores.map(v => f(v, 2)).join(', ') + ')'
        ]);
      });

      st.curWord = null; st.curIdx = -1; st.norm = true;
      add(7, '正規化與預測結果', '把三類對數分數透過 softmax 轉成總和為 1 的後驗機率，最高者為預測類別！', [
        '後驗機率 = (' + R.post.map(v => f(v, 3)).join(', ') + ')',
        '預測類別：「' + CLAB[R.pred] + '」'
      ]);

      while (steps.length < 10) {
        add(7, '為什麼要用 log 相加', '一句話若有 20 個詞，20 個小機率連乘會小到 10⁻³⁰ 造成下溢；取對數改成加法數值就非常穩定。', [
          '預測：「' + CLAB[R.pred] + '」（信心 ' + LAB.pct(R.post[R.pred], 1) + '）'
        ]);
      }
      return steps;
    },

    inputs(rows, p) {
      const R = runMNB(rows, p);
      return {
        docs_tok: R.docs.map(d => d.join(' ')),
        query_tok: R.knownQ.join(' ')
      };
    },

    keys(steps, rows, p) {
      const R = runMNB(rows, p);
      const k = { pred: R.pred };
      [0, 1, 2].forEach(c => {
        k['prior_' + c] = R.priors[c];
        k['log_score_' + c] = R.logScores[c];
        k['post_' + c] = R.post[c];
      });
      R.knownQ.forEach((w, idx) => {
        [0, 1, 2].forEach(c => { k['pw_' + idx + '_c' + c] = R.wordProbs[c][w]; });
      });
      return k;
    },

    explain(steps, rows, p) {
      const R = runMNB(rows, p);
      return [
        '12 句護理紀錄斷詞後共 ' + R.V + ' 個詞，三類先驗機率均為 ' + f(R.priors[0], 3) + '。',
        '測試句「' + R.qText + '」在 α = ' + R.alpha + ' 下，三類對數分數為 (' + R.logScores.map(v => f(v, 2)).join(', ') + ')。',
        '正規化後後驗機率最高為「' + CLAB[R.pred] + '」（' + LAB.pct(R.post[R.pred], 1) + '）。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Set Role', 'Process Documents from Data', 'Naive Bayes'],
      params: [
        ['Set Role › label', 'label'],
        ['Naive Bayes › laplace correction', p => p.laplace > 0 ? 'true' : 'false']
      ],
      note: 'AI Studio 需先用 Process Documents 產生詞袋向量，再接 Naive Bayes 進行多類別文本分類。',
      expect: (steps, rows, p) => {
        const R = runMNB(rows, p);
        return ['測試句預測類別：' + CLAB[R.pred] + '（' + LAB.pct(R.post[R.pred], 1) + '）'];
      },
      python: `from sklearn.feature_extraction.text import CountVectorizer\nfrom sklearn.naive_bayes import MultinomialNB\nX = CountVectorizer(tokenizer=str.split, token_pattern=None).fit_transform(docs_tok)\nnb = MultinomialNB(alpha=1).fit(X, y)`,
      confirmed: false
    }
  });
})();
