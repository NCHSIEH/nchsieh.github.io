/* E5 N-gram 詞組與 BM25 飽和檢索 */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = LAB.data.columns('notes', ['text', 'label'], { label: 'y' });
  const QUERIES = [
    { v: '0', label: '夜間下床步態不穩' },
    { v: '1', label: '給予止痛藥疼痛緩解' },
    { v: '2', label: '傷口有滲液更換敷料' }
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

  function makeNgrams(toks, useBigram) {
    if (!useBigram) return toks.slice();
    const bi = [];
    for (let i = 0; i < toks.length - 1; i++) {
      bi.push(toks[i] + '+' + toks[i + 1]);
    }
    return toks.concat(bi);
  }

  function runBM25(rows, p) {
    const qText = QUERIES[parseInt(p.query || '0', 10)].label;
    const useBi = p.ngram === 'bi';
    const k1 = p.k1 != null ? p.k1 : 1.5;
    const b = p.b != null ? p.b : 0.75;

    const uniDocs = rows.map(r => fmmTokenize(r.text));
    const uniQ = fmmTokenize(qText);
    const docs = uniDocs.map(d => makeNgrams(d, useBi));
    const query = makeNgrams(uniQ, useBi);

    const N = docs.length;
    const docLens = docs.map(d => d.length);
    const avgdl = M.mean(docLens) || 1;

    const vocabSet = new Set();
    docs.forEach(d => d.forEach(t => vocabSet.add(t)));
    const vocab = Array.from(vocabSet).sort();

    // BM25 IDF: ln(1 + (N - df + 0.5) / (df + 0.5))
    const dfMap = {};
    const idfMap = {};
    vocab.forEach(w => {
      const df = docs.filter(d => d.includes(w)).length;
      dfMap[w] = df;
      idfMap[w] = Math.log(1 + (N - df + 0.5) / (df + 0.5));
    });

    const qTerms = Array.from(new Set(query)).filter(w => vocabSet.has(w));

    const docScores = docs.map((d, i) => {
      const dl = docLens[i];
      const normFactor = 1 - b + b * (dl / avgdl);
      let bm25 = 0;
      let rawTfIdf = 0;
      const termBreak = [];
      qTerms.forEach(w => {
        const tf = d.filter(t => t === w).length;
        const idf = idfMap[w];
        const satTf = tf > 0 ? (tf * (k1 + 1)) / (tf + k1 * normFactor) : 0;
        const sc = idf * satTf;
        bm25 += sc;
        rawTfIdf += tf * idf;
        termBreak.push({ w, tf, satTf, idf, sc });
      });
      return {
        id: rows[i].id,
        text: rows[i].text,
        dl,
        normFactor,
        bm25,
        rawTfIdf,
        termBreak
      };
    });

    const ranked = docScores.slice().sort((a, b2) => b2.bm25 - a.bm25 || a.id - b2.id);

    // 詞頻飽和曲線比較 (tf = 1..6)
    const satCurve = M.range(6, idx => {
      const tf = idx + 1;
      return {
        tf,
        linear: tf,
        bm25Sat: (tf * (k1 + 1)) / (tf + k1)
      };
    });

    return { qText, useBi, k1, b, uniDocs, docs, query, qTerms, N, docLens, avgdl, vocab, dfMap, idfMap, docScores, ranked, satCurve };
  }

  LAB.register({
    id: 'E5', group: 'E', title: 'N-gram 詞組與 BM25 檢索',
    module: { name: 'M6 第 05 節', url: '../m6/#p05' },
    goal: '看懂 Unigram 單詞袋為何會遺失詞序搭配，學會建立 Bigram 雙連詞特徵，並理解現代搜尋引擎核心 BM25 如何透過「詞頻飽和 k₁」與「文件長度懲罰 b」超越傳統 TF-IDF。',
    data: {
      name: 'notes_bm25',
      scenario: '護理紀錄檢索：8 句臨床護理紀錄，比較 Unigram vs Bigram 以及 TF-IDF vs BM25 飽和評分',
      columns: COLS,
      small: seed => LAB.data.notes(seed, 8)
    },
    params: [
      { key: 'ngram', label: 'N-gram 範圍', type: 'choice', value: 'bi', options: [{ v: 'uni', label: '1-gram (單詞)' }, { v: 'bi', label: '1+2-gram (含雙連詞)' }] },
      { key: 'k1', label: '飽和參數 k₁', type: 'num', min: 0.5, max: 3.0, step: 0.5, value: 1.5 },
      { key: 'b', label: '長度正規化 b', type: 'num', min: 0.0, max: 1.0, step: 0.25, value: 0.75 },
      { key: 'query', label: '查詢句', type: 'choice', value: '0', options: QUERIES }
    ],
    pseudo: [
      '將護理紀錄斷詞並去除停用詞',
      '產生相鄰雙連詞 Bigram (wᵢ+wᵢ₊₁)',
      '算平均文件長度 avgdl 與各詞 IDF',
      '算 BM25 飽和詞頻與長度懲罰項',
      '對查詢句命中詞加總 BM25 並排序',
      '對照傳統線性 TF 與 BM25 飽和曲線'
    ],
    build(rows, p) {
      const R = runBM25(rows, p), steps = [];

      function views(st) {
        const groups = rows.slice(0, 6).map((r, i) => {
          const toks = st.showBi ? R.docs[i] : R.uniDocs[i];
          return {
            id: 'd' + r.id,
            label: '#' + r.id + ' (L=' + toks.length + ')',
            items: toks.slice(0, 8).map((t, j) => {
              const isBi = t.includes('+');
              const hit = R.qTerms.includes(t);
              return {
                id: r.id + '_' + j,
                text: t,
                cls: hit ? 'hl' : (isBi ? 'c3' : 'c0'),
                hl: hit
              };
            })
          };
        });
        groups.push({
          id: 'q', label: '查詢',
          items: (st.showBi ? R.query : fmmTokenize(R.qText)).map((t, j) => ({
            id: 'q_' + j, text: t, cls: t.includes('+') ? 'c3' : 'c1'
          }))
        });
        const main = {
          type: 'tokens', slot: 'main',
          title: R.useBi && st.showBi ? '1-gram 單詞 ＋ 2-gram 雙連詞特徵（紫框＝Bigram，粉紅＝命中查詢）' : '1-gram 單詞切分結果（粉紅＝命中查詢）',
          groups
        };

        const side = {
          type: 'table', slot: 'side',
          title: 'BM25 檢索計分表（avgdl = ' + f(R.avgdl, 1) + '）',
          cols: [
            { key: 'id', label: '#' },
            { key: 'dl', label: '詞數', num: true, digits: 0 },
            { key: 'nf', label: '長度比L', num: true, digits: 2 },
            { key: 'tf', label: '線性TF·IDF', num: true, digits: 2 },
            { key: 'bm', label: 'BM25', num: true, digits: 2 }
          ],
          rows: R.docScores.map(d => ({
            id: d.id,
            cells: [
              '#' + d.id,
              d.dl,
              d.normFactor,
              st.showScore ? d.rawTfIdf : null,
              st.showScore ? { v: f(d.bm25, 2), cls: d.id === R.ranked[0].id ? 'good' : undefined } : null
            ],
            hl: st.showScore && d.id === R.ranked[0].id
          }))
        };

        const bottom = st.showCurve ? {
          type: 'line', slot: 'bottom',
          title: '為什麼需要 BM25？詞頻飽和曲線（線性 TF 無上限 vs BM25 漸近飽和 k₁+1 = ' + f(R.k1 + 1, 1) + '）',
          axes: { x: { label: '詞彙在單篇出現次數 tf', min: 1, max: 6 }, y: { label: '有效詞頻權重', min: 0, max: 6.2 } },
          series: [
            { id: 'lin', label: '傳統 TF (線性無上限)', pts: R.satCurve.map(c => [c.tf, c.linear]), cls: 'c4', dash: true, dots: true },
            { id: 'sat', label: 'BM25 飽和權重', pts: R.satCurve.map(c => [c.tf, c.bm25Sat]), cls: 'good', dots: true }
          ]
        } : {
          type: 'bars', slot: 'bottom',
          title: '各篇護理紀錄 BM25 檢索總分排名',
          max: Math.max(2, M.max(R.docScores.map(d => d.bm25)) * 1.15),
          digits: 2,
          items: R.docScores.map(d => ({
            id: 'b' + d.id,
            label: '#' + d.id + ' ' + d.text.slice(0, 7) + '…',
            value: st.showScore ? d.bm25 : 0,
            cls: d.id === R.ranked[0].id ? 'good' : 'c0',
            hl: st.showScore && d.id === R.ranked[0].id
          }))
        };
        return [main, side, bottom];
      }

      const st = { showBi: false, showScore: false, showCurve: false };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '單詞袋的盲點', '傳統詞袋（1-gram）把句子拆成獨立單詞，「無＋滲液」與「有＋滲液」若去停用詞後都只剩「滲液」，詞序搭配資訊就遺失了。', [
        '查詢句：「' + R.qText + '」',
        '1-gram 詞數 = ' + R.uniDocs[0].length + ' 個'
      ]);

      st.showBi = true;
      add(2, '建立 Bigram 雙連詞', R.useBi
        ? '將相鄰兩個詞綁成「wᵢ+wᵢ₊₁」雙連詞（如「夜間+下床」、「步態+不穩」），精準鎖定連續片語！'
        : '目前設定僅使用 1-gram 單詞；可切換上方參數為「1+2-gram」觀察雙連詞特徵。', [
        '第 1 句特徵數：' + R.uniDocs[0].length + ' (1-gram) → ' + R.docs[0].length + ' (含 Bigram)',
        '總詞表大小 |V| = ' + R.vocab.length
      ]);

      add(3, '計算平均長度與 IDF', '統計全體平均長度 avgdl = ' + f(R.avgdl, 2) + '，並用 BM25 平滑公式計算每個詞的逆文件頻率 IDF。', [
        R.qTerms.slice(0, 3).map(w => w + '(df=' + R.dfMap[w] + ', IDF=' + f(R.idfMap[w], 2) + ')').join('｜')
      ]);

      add(3, '文件長度懲罰因子 b', '長篇病歷天然容易命中更多字。BM25 用 L = 1 − b + b·(dl / avgdl) 對長文件打折（b = ' + f(R.b, 2) + '）。', [
        '#1 長度比 L = ' + f(R.docScores[0].normFactor, 2) + '（b=0 不懲罰長度，b=1 完全依長度比例縮放）'
      ]);

      st.showScore = true;
      add(4, '計算 BM25 飽和詞頻', '將每個命中詞的 tf 代入 tf·(k₁+1) / (tf + k₁·L)，乘上 IDF 後加總得出每篇的 BM25 分數。', [
        '最高分紀錄：#' + R.ranked[0].id + '（BM25 = ' + f(R.ranked[0].bm25, 2) + '）',
        '次高分紀錄：#' + R.ranked[1].id + '（BM25 = ' + f(R.ranked[1].bm25, 2) + '）'
      ]);

      add(5, '檢索排序結果', '比較右側表格：同時命中單詞與 Bigram 連續詞組的護理紀錄 #' + R.ranked[0].id + ' 穩居第一名！', [
        '榜首 #' + R.ranked[0].id + '：「' + R.ranked[0].text + '」'
      ]);

      st.showCurve = true;
      add(6, 'BM25 詞頻飽和曲線', '傳統 TF 中一個詞重複 5 次就給 5 倍分數；BM25 則有漸近上限 k₁+1 = ' + f(R.k1 + 1, 1) + '，避免單一贅詞洗版主導排名！', [
        'tf=1 時權重 1.00 → tf=5 時傳統 TF=5.00，但 BM25 飽和於 ' + f(R.satCurve[4].bm25Sat, 2)
      ]);

      add(6, '參數 k₁ 的物理意義', 'k₁ 控制「多快達到飽和」：k₁ 越小（如 0.5）只要出現 1 次就接近滿分；k₁ 越大越接近傳統線性 TF。', [
        '目前 k₁ = ' + f(R.k1, 1) + '，理論飽和上限 = k₁ + 1 = ' + f(R.k1 + 1, 1)
      ]);

      st.showCurve = false;
      add(6, '現代 RAG 檢索的基石', '即使到了大型語言模型時代，H6 RAG 混合檢索的第一路仍是 BM25 + N-gram，負責精準抓出藥名、診斷碼與劑量！', [
        'BM25 榜首 #' + R.ranked[0].id + ' 分數 = ' + f(R.ranked[0].bm25, 3)
      ]);

      add(6, '實驗總結', '透過 N-gram 補足詞序搭配、透過 BM25 解決長文件偏誤與詞頻灌水，是醫療文本檢索最穩健的基線方法。', [
        '詞表大小 = ' + R.vocab.length + '，最高分 BM25 = ' + f(R.ranked[0].bm25, 3)
      ]);

      return steps;
    },

    keys(steps, rows, p) {
      const R = runBM25(rows, p);
      return {
        vocab_size: R.vocab.length,
        avgdl: R.avgdl,
        top_id: R.ranked[0].id,
        top_bm25: R.ranked[0].bm25,
        bm25_0: R.docScores[0].bm25,
        sat_tf5: R.satCurve[4].bm25Sat
      };
    },

    explain(steps, rows, p) {
      const R = runBM25(rows, p);
      return [
        '在 ' + (R.useBi ? '1+2-gram（含相鄰雙連詞）' : '1-gram（僅單詞）') + ' 下，共建立 ' + R.vocab.length + ' 個詞彙特徵，平均文件長度 avgdl = ' + f(R.avgdl, 2) + '。',
        '以 BM25（k₁ = ' + f(R.k1, 1) + ', b = ' + f(R.b, 2) + '）檢索查詢「' + R.qText + '」，第一名為 #' + R.ranked[0].id + '（分數 ' + f(R.ranked[0].bm25, 2) + '）。',
        'BM25 透過非線性飽和上限 k₁ + 1 = ' + f(R.k1 + 1, 1) + ' 防止單一重複詞主導分數，是現代搜尋引擎（Elasticsearch）與 LLM RAG 系統的標準檢索演算法。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Process Documents from Data', 'Tokenize', 'Generate n-Grams (Terms)'],
      params: [
        ['Generate n-Grams › max length', p => p.ngram === 'bi' ? '2' : '1']
      ],
      note: 'AI Studio 的 Text Processing 擴充內建 Generate n-Grams (Terms) 運算子，可在 Tokenize 後直接串接產生 Bigram 特徵；Python 則可用 CountVectorizer(ngram_range=(1,2)) 與 rank_bm25。',
      expect: (steps, rows, p) => {
        const R = runBM25(rows, p);
        return ['最高分紀錄：#' + R.ranked[0].id + '（BM25 = ' + f(R.ranked[0].bm25, 2) + '）'];
      },
      python: 'from sklearn.feature_extraction.text import CountVectorizer\nfrom rank_bm25 import BM25Okapi\nvec = CountVectorizer(ngram_range=(1, 2))\nbm25 = BM25Okapi(tokenized_corpus, k1=1.5, b=0.75)',
      confirmed: false
    }
  });
})();
