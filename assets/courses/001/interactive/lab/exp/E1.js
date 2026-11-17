/* E1 斷詞與 TF-IDF */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = LAB.data.columns('notes', ['text', 'label'], { label: 'y' });
  const QUERIES = [
    { v: '0', label: '夜間下床步態不穩' },
    { v: '1', label: '傷口紅腫有滲液' },
    { v: '2', label: '主訴疼痛給予止痛藥' }
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
    return tokens;
  }

  function runTFIDF(rows, p) {
    const qText = QUERIES[parseInt(p.query || '0', 10)].label;
    const rawDocs = rows.map(r => fmmTokenize(r.text));
    const rawQuery = fmmTokenize(qText);

    const filt = toks => p.stop ? toks.filter(t => !STOP_SET.has(t)) : toks.slice();
    const docs = rawDocs.map(filt);
    const query = filt(rawQuery);

    const vocabSet = new Set();
    docs.forEach(d => d.forEach(t => vocabSet.add(t)));
    const vocab = Array.from(vocabSet).sort();
    const N = docs.length;

    const tf = docs.map(d => vocab.map(w => d.filter(t => t === w).length));
    const df = vocab.map(w => docs.filter(d => d.includes(w)).length);
    // 對齊 sklearn TfidfVectorizer(smooth_idf=False): idf = ln(N / df) + 1
    const idf = df.map(d => Math.log(N / d) + 1);

    const normRows = mat => mat.map(row => {
      const nrm = Math.sqrt(M.sum(row.map(v => v * v))) || 1;
      return row.map(v => v / nrm);
    });
    const tfidfRaw = tf.map(row => row.map((c, j) => c * idf[j]));
    const tfidf = normRows(tfidfRaw);

    const qTf = vocab.map(w => query.filter(t => t === w).length);
    const qRaw = qTf.map((c, j) => c * idf[j]);
    const qNorm = Math.sqrt(M.sum(qRaw.map(v => v * v))) || 1;
    const qVec = qRaw.map(v => v / qNorm);

    const sims = tfidf.map((dVec, i) => ({
      id: rows[i].id,
      text: rows[i].text,
      sim: M.sum(dVec.map((v, j) => v * qVec[j]))
    }));
    const ranked = sims.slice().sort((a, b) => b.sim - a.sim || a.id - b.id);

    return { qText, rawDocs, rawQuery, docs, query, vocab, tf, df, idf, tfidfRaw, tfidf, qVec, sims, ranked };
  }

  LAB.register({
    id: 'E1', group: 'E', title: '斷詞與 TF-IDF',
    module: { name: 'M6 第 05 節', url: '../m6/#p05' },
    goal: '看懂中文正向最大匹配斷詞、去停用詞，以及如何透過 TF、IDF 與 L2 正規化算出文件與查詢句的餘弦相似度。',
    data: {
      name: 'notes_tfidf',
      scenario: '護理紀錄：6 句模擬護理紀錄，斷詞後計算 TF-IDF 並檢索最相關的句子',
      columns: COLS,
      small: seed => LAB.data.notes(seed, 6)
    },
    params: [
      { key: 'query', label: '查詢句', type: 'choice', value: '0', options: QUERIES },
      { key: 'stop', label: '去除停用詞', type: 'bool', value: true }
    ],
    pseudo: [
      '用字典做正向最大匹配斷詞',
      '過濾停用詞（可關閉）',
      '統計每句的詞頻 (TF)',
      '算各詞的文件頻率與 IDF',
      '計算 TF × IDF 權重矩陣',
      '每列做 L2 長度正規化',
      '與查詢句向量算餘弦相似度'
    ],
    build(rows, p) {
      const R = runTFIDF(rows, p), steps = [];
      const showVocab = R.vocab.slice(0, 8);

      function views(st) {
        const groups = rows.map((r, i) => {
          const toks = st.useRaw ? R.rawDocs[i] : R.docs[i];
          const isDone = i < st.tokUpto;
          return {
            id: 'd' + r.id,
            label: '#' + r.id,
            items: isDone
              ? toks.map((t, j) => ({
                  id: r.id + '_' + j, text: t,
                  state: st.showStop && STOP_SET.has(t) ? 'cut' : undefined,
                  cls: st.showStop && STOP_SET.has(t) ? 'cut' : 'c0'
                }))
              : [{ id: 'raw' + r.id, text: r.text, cls: 'c5' }]
          };
        });
        groups.push({
          id: 'q', label: '查詢',
          items: (st.useRaw ? R.rawQuery : R.query).map((t, j) => ({ id: 'q_' + j, text: t, cls: 'c1' }))
        });
        const main = { type: 'tokens', slot: 'main', title: '護理紀錄斷詞結果', groups };

        const matSrc = st.matMode === 'tfidf' ? R.tfidf : st.matMode === 'raw' ? R.tfidfRaw : R.tf;
        const side = {
          type: 'matrix', slot: 'side',
          title: st.matMode === 'tfidf' ? '正規化 TF-IDF 矩陣' : st.matMode === 'raw' ? '未正規化 TF×IDF' : '詞頻矩陣 (TF)',
          rowLabels: rows.map(r => '#' + r.id),
          colLabels: showVocab,
          values: st.matShown ? matSrc.map(row => row.slice(0, showVocab.length)) : rows.map(() => showVocab.map(() => 0)),
          digits: st.matMode === 'tf' ? 0 : 2,
          heat: true
        };

        const bars = {
          type: 'bars', slot: 'bottom',
          title: '與查詢句「' + R.qText + '」的餘弦相似度',
          max: 1, digits: 3,
          items: st.showSim
            ? R.sims.map(s => ({ id: 's' + s.id, label: '#' + s.id + ' ' + s.text.slice(0, 8) + '…', value: s.sim, cls: s.id === R.ranked[0].id ? 'good' : 'c0', hl: s.id === R.ranked[0].id }))
            : [{ id: 'w', label: '尚未計算相似度', value: 0, cls: 'c5' }]
        };
        return [main, side, bars];
      }

      const st = { tokUpto: 0, useRaw: true, showStop: false, matShown: false, matMode: 'tf', showSim: false };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '題目', '電腦看不懂整串中文字，要先斷詞再轉成數字向量，才能找出哪筆護理紀錄最符合查詢「' + R.qText + '」。', [
        '語料共 ' + rows.length + ' 句，查詢句：' + R.qText
      ]);

      st.tokUpto = 1;
      add(1, '第 1 句正向最大匹配', '從第 1 句字首開最長 4 字視窗比對字典，比到就切下並往後移，沒比到就縮短視窗。', [
        '原句：' + rows[0].text,
        '切出：' + R.rawDocs[0].join(' / ')
      ]);

      st.tokUpto = rows.length;
      add(1, '其餘句子斷詞完成', '用同一本字典將全部 6 句護理紀錄與查詢句切出詞彙。', [
        '各句詞數：' + R.rawDocs.map((d, i) => '#' + rows[i].id + '=' + d.length).join('、')
      ]);

      if (p.stop) {
        st.showStop = true;
        add(2, '標出並去除停用詞', '「病人、已、有、後」等高頻功能詞沒有區辨力，標紅後移除。', [
          '詞表大小（去停用詞後）= ' + R.vocab.length + ' 個詞'
        ]);
        st.useRaw = false; st.showStop = false;
      } else {
        st.useRaw = false;
        add(2, '保留全部詞彙', '目前關閉去除停用詞，保留所有切出的詞進行統計。', [
          '詞表大小 = ' + R.vocab.length + ' 個詞'
        ]);
      }

      st.matShown = true; st.matMode = 'tf';
      add(3, '建立詞頻矩陣 (TF)', '數每個詞在每一句出現幾次，排成文件—詞矩陣。', [
        '範例詞「' + R.vocab[0] + '」出現次數：' + R.tf.map(r => r[0]).join(', ')
      ]);

      add(4, '計算文件頻率與 IDF', '詞越常在各句出現（df 越大），IDF = ln(N/df) + 1 就越小，代表越不稀有。', [
        R.vocab.slice(0, 3).map((w, j) => w + '(df=' + R.df[j] + ', idf=' + f(R.idf[j], 2) + ')').join('｜')
      ]);

      st.matMode = 'raw';
      add(5, '乘上 IDF 得 TF×IDF', '把每個詞頻乘上該詞的 IDF，讓稀有且關鍵的醫療詞獲得較高權重。', [
        '「' + R.vocab[0] + '」IDF = ' + f(R.idf[0], 3)
      ]);

      st.matMode = 'tfidf';
      add(6, 'L2 向量長度正規化', '把每句向量除以其歐氏長度，避免長句子因為詞多就佔便宜。', [
        '每句 TF-IDF 向量平方和 = 1.000'
      ]);

      st.showSim = true;
      add(7, '計算餘弦相似度並排名', '將查詢句也轉成正規化 TF-IDF 向量後做內積，分數最高者最相關！', [
        '最相關：#' + R.ranked[0].id + '（相似度 ' + f(R.ranked[0].sim, 3) + '）',
        '次高：#' + R.ranked[1].id + '（相似度 ' + f(R.ranked[1].sim, 3) + '）'
      ]);

      while (steps.length < 10) {
        add(7, 'TF-IDF 的限制', 'TF-IDF 只比對字面完全相同的詞，若寫「跌倒」與「摔倒」不會視為相關；語意相似需要靠 Word2Vec 或 Embedding。', [
          '詞表共 ' + R.vocab.length + ' 詞'
        ]);
      }
      return steps;
    },

    inputs(rows, p) {
      const R = runTFIDF(rows, p);
      return {
        docs_tok: R.docs.map(d => d.join(' ')),
        query_tok: R.query.join(' ')
      };
    },

    keys(steps, rows, p) {
      const R = runTFIDF(rows, p);
      const k = { vocab_size: R.vocab.length };
      R.docs.forEach((d, i) => { k['len_' + rows[i].id] = d.length; });
      R.vocab.slice(0, 6).forEach((w, j) => {
        k['df_' + j] = R.df[j];
        k['idf_' + j] = R.idf[j];
        k['tfidf_0_' + j] = R.tfidf[0][j];
      });
      R.sims.forEach(s => { k['sim_' + s.id] = s.sim; });
      return k;
    },

    explain(steps, rows, p) {
      const R = runTFIDF(rows, p);
      return [
        '以正向最大匹配斷詞' + (p.stop ? '並去除停用詞' : '') + '後，共建立 ' + R.vocab.length + ' 個不重複詞彙的詞表。',
        '套用 IDF = ln(N/df) + 1（對齊 scikit-learn smooth_idf=False）與 L2 正規化後，與查詢「' + R.qText + '」最相關的是 #' + R.ranked[0].id + '（餘弦相似度 ' + f(R.ranked[0].sim, 3) + '）。',
        'TF-IDF 能自動壓低每句都出現的常見詞、凸顯少數句子特有的關鍵症狀詞。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Process Documents from Data', 'Tokenize'],
      params: [
        ['Process Documents › vector creation', 'TF-IDF']
      ],
      note: 'AI Studio 內建斷詞預設以空白與標點切分英文，中文須先斷詞（以空白分隔）或安裝中文斷詞擴充套件。',
      expect: (steps, rows, p) => {
        const R = runTFIDF(rows, p);
        return ['最相關紀錄：#' + R.ranked[0].id + '（餘弦相似度 ' + f(R.ranked[0].sim, 3) + '）'];
      },
      python: `from sklearn.feature_extraction.text import TfidfVectorizer\nvec = TfidfVectorizer(tokenizer=str.split, token_pattern=None, smooth_idf=False, norm='l2')\nX = vec.fit_transform(docs_tok)`,
      confirmed: false
    }
  });
})();
