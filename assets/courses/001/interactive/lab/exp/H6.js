/* H6 RAG 檢索 */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = [{ key: 'chunk_id', label: '段落', type: 'text', role: 'x' }, { key: 'text', label: '衛教內容', type: 'text', role: 'x' }];

  const SENTS = [
    '長照 3.0 提供居家服務、日間照顧與喘息服務，減輕家庭照顧者壓力。',
    '申請長照服務可撥打 1966 長照專線，由照管專員到宅評估失能等級。',
    '失能等級分為第 2 級至第 8 級，等級越高每月給付額度越高。',
    '家中若有外籍看護工，仍可申請專業服務、輔具及居家無障礙改善。',
    '但有外籍看護工的家庭，不可重複申請居家照顧及日間照顧服務。',
    '預防長輩跌倒應保持走道淨空、浴室加裝防滑墊與安全扶手。',
    '若長輩出現夜間頻繁起床上廁所，建議床邊放置夜燈並評估用藥。',
    '輔具購買與居家無障礙環境改善每三年最高補助四萬元。'
  ];
  const PARAS = [
    SENTS[0] + SENTS[1],
    SENTS[2],
    SENTS[3] + SENTS[4],
    SENTS[5],
    SENTS[6],
    SENTS[7]
  ];
  const QUERY = '請外籍看護可以申請居家照顧或輔具嗎？';
  const LTC_DICT = ['長照', '居家服務', '日間照顧', '喘息服務', '家庭', '照顧者', '申請', '1966', '照管專員', '評估', '失能等級', '給付額度', '外籍看護', '專業服務', '輔具', '無障礙', '改善', '居家照顧', '預防', '跌倒', '防滑墊', '扶手', '夜間', '夜燈', '用藥', '補助'];

  function tokZh(text) {
    const out = [];
    let i = 0;
    while (i < text.length) {
      if (/[，。、？！\s]/.test(text[i])) { i++; continue; }
      let m = null;
      for (let len = Math.min(5, text.length - i); len >= 2; len--) {
        const sub = text.slice(i, i + len);
        if (LTC_DICT.includes(sub)) { m = sub; break; }
      }
      if (m) { out.push(m); i += m.length; }
      else { out.push(text[i]); i++; }
    }
    return out;
  }

  function runRAG(rows, p) {
    const texts = p.chunk === 'para' ? PARAS : SENTS;
    const docs = texts.map(tokZh);
    const qToks = tokZh(QUERY);
    const N = docs.length;
    const avgdl = M.mean(docs.map(d => d.length)) || 1;
    const k1 = 1.5, b = 0.75;

    // BM25
    const qUnique = Array.from(new Set(qToks));
    const bm25Scores = docs.map(d => {
      let s = 0;
      qUnique.forEach(qt => {
        const df = docs.filter(doc => doc.includes(qt)).length;
        if (!df) return;
        const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1);
        const tf = d.filter(t => t === qt).length;
        if (tf > 0) s += idf * (tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (d.length / avgdl)));
      });
      return s;
    });

    // TF-IDF 餘弦相似度（近似向量嵌入，頁面明說）
    const vocab = Array.from(new Set(docs.reduce((a, d) => a.concat(d), []))).sort();
    const idfVec = vocab.map(w => Math.log(N / (docs.filter(d => d.includes(w)).length || 1)) + 1);
    const vecOf = toks => {
      const raw = vocab.map((w, j) => toks.filter(t => t === w).length * idfVec[j]);
      const nrm = Math.sqrt(M.sum(raw.map(v => v * v))) || 1;
      return raw.map(v => v / nrm);
    };
    const qV = vecOf(qToks);
    const vecScores = docs.map(d => {
      const dv = vecOf(d);
      return M.sum(dv.map((v, j) => v * qV[j]));
    });

    // Ranks (1-based)
    const rankOf = scores => {
      const ord = scores.map((sc, i) => ({ i, sc })).sort((a, b2) => b2.sc - a.sc || a.i - b2.i);
      const rk = M.range(N, () => 0);
      ord.forEach((o, r) => { rk[o.i] = r + 1; });
      return rk;
    };
    const bmRk = rankOf(bm25Scores);
    const vecRk = rankOf(vecScores);
    const rrfScores = M.range(N, i => 1 / (60 + bmRk[i]) + 1 / (60 + vecRk[i]));

    const method = p.method || 'hybrid';
    const activeScores = method === 'bm25' ? bm25Scores : method === 'vec' ? vecScores : rrfScores;
    const topK = Math.max(1, Math.min(4, Math.round(p.top_k || 2)));
    const topOrder = activeScores.map((sc, i) => ({ i, sc, text: texts[i] }))
      .sort((a, b2) => b2.sc - a.sc || a.i - b2.i)
      .slice(0, topK);

    return { texts, docs, qToks, bm25Scores, vecScores, bmRk, vecRk, rrfScores, activeScores, topK, topOrder };
  }

  LAB.register({
    id: 'H6', group: 'H', title: 'RAG 檢索',
    module: { name: 'M8 第 07 節', url: '../m8/#p07' },
    goal: '看懂 RAG 知識庫如何先切塊，再用關鍵字 BM25、向量相似度或 RRF 混合檢索挑出前 K 段，組裝成提示詞交給 LLM 回答。',
    data: {
      name: 'rag_ltc',
      scenario: '長照 3.0 衛教短文：對問題「請外籍看護可以申請居家照顧或輔具嗎？」做檢索（以 TF-IDF 代替嵌入模型）',
      columns: COLS,
      small: (seed, p) => {
        const arr = (p && p.chunk === 'para') ? PARAS : SENTS;
        return arr.map((text, i) => ({ id: i + 1, chunk_id: 'C' + (i + 1), text }));
      }
    },
    params: [
      { key: 'chunk', label: '切塊方式', type: 'choice', value: 'sent', options: [{ v: 'sent', label: '依句 (8段)' }, { v: 'para', label: '依段 (6段)' }] },
      { key: 'top_k', label: '取前 K 段', type: 'int', min: 1, max: 4, step: 1, value: 2 },
      { key: 'method', label: '檢索方式', type: 'choice', value: 'hybrid', options: [{ v: 'bm25', label: 'BM25' }, { v: 'vec', label: '向量 (TF-IDF)' }, { v: 'hybrid', label: '混合 (RRF)' }] }
    ],
    pseudo: [
      '把長照衛教文章切塊 (依句／依段)',
      '對問題與每段斷詞',
      '計算 BM25 關鍵字分數與名次',
      '計算 TF-IDF 向量餘弦相似度',
      '混合檢索：用 RRF 合併兩種名次',
      '取分數最高的前 K 段',
      '組裝成提示詞交給 LLM 生成答案'
    ],
    build(rows, p) {
      const R = runRAG(rows, p), steps = [];
      const pickedSet = new Set(R.topOrder.map(x => x.i));

      function views(st) {
        const main = {
          type: 'table', slot: 'main',
          title: '各段落檢索分數與名次（取前 ' + R.topK + ' 段）',
          cols: [
            { key: 'id', label: '#' },
            { key: 'txt', label: '段落內容' },
            { key: 'bm', label: 'BM25', num: true, digits: 2 },
            { key: 'vc', label: '向量', num: true, digits: 2 },
            { key: 'rrf', label: 'RRF', num: true, digits: 3 }
          ],
          rows: R.texts.map((txt, i) => ({
            id: 'c' + i,
            cells: [
              'C' + (i + 1),
              txt.slice(0, 18) + '…',
              st.showBM ? R.bm25Scores[i] : null,
              st.showVec ? R.vecScores[i] : null,
              st.showRRF ? R.rrfScores[i] : null
            ],
            hl: st.showPick && pickedSet.has(i)
          }))
        };
        const scShow = st.showRRF ? R.activeScores : st.showVec ? R.vecScores : st.showBM ? R.bm25Scores : R.texts.map(() => 0);
        const side = {
          type: 'bars', slot: 'side',
          title: '檢索分數比較',
          max: M.max(scShow) * 1.1 || 0.05, digits: 3,
          items: R.texts.map((_, i) => ({
            id: 'b' + i, label: 'C' + (i + 1),
            value: scShow[i],
            cls: st.showPick && pickedSet.has(i) ? 'c1' : 'c0',
            hl: st.showPick && pickedSet.has(i)
          }))
        };
        const note = {
          type: 'note', slot: 'bottom',
          tone: st.showPrompt ? 'good' : 'info',
          text: st.showPrompt
            ? '【組好的提示詞】系統：請只依以下資料回答。資料：' + R.topOrder.map(x => '[C' + (x.i + 1) + '] ' + x.text).join(' ') + ' 問題：' + QUERY
            : '說明：真實系統會用嵌入模型（如 text-embedding-3）算語意向量；本實驗用 TF-IDF 代替以便完整手算。'
        };
        return [main, side, note];
      }

      const st = { showBM: false, showVec: false, showRRF: false, showPick: false, showPrompt: false };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '題目', 'LLM 沒有內建機構最新「長照 3.0 外籍看護排他條款」。RAG 先把正確段落檢索出來塞進提示詞。', [
        '問題：' + QUERY
      ]);

      add(1, '文件切塊', '將衛教短文切成 ' + R.texts.length + ' 段，切太碎會斷章取義、切太長會混入無關雜訊。', [
        '切塊數 = ' + R.texts.length + ' 段，取回上限 Top-K = ' + R.topK
      ]);

      add(2, '問題斷詞', '把使用者的問題切出關鍵醫療／長照詞彙，準備比對知識庫。', [
        '問題關鍵詞：' + R.qToks.join(' / ')
      ]);

      st.showBM = true;
      add(3, 'BM25 關鍵字檢索', '依詞頻飽和與文件長度正規化算出 BM25 分數，精準命中關鍵字「外籍看護」「居家照顧」「輔具」。', [
        'BM25 第 1 名：C' + (R.bmRk.indexOf(1) + 1) + '（分數 ' + f(M.max(R.bm25Scores), 2) + '）'
      ]);

      st.showVec = true;
      add(4, '向量相似度檢索', '計算問題與各段 TF-IDF 向量的餘弦相似度（真實系統使用神經網路 Embedding）。', [
        '向量第 1 名：C' + (R.vecRk.indexOf(1) + 1) + '（相似度 ' + f(M.max(R.vecScores), 3) + '）'
      ]);

      st.showRRF = true;
      add(5, 'RRF 混合排序合併', '用倒數名次融合 RRF = 1/(60+BM25名次) + 1/(60+向量名次)，同時兼顧精準詞與語意。', [
        'RRF 最高：C' + (M.argmax(R.rrfScores) + 1) + '（' + f(M.max(R.rrfScores), 4) + '）'
      ]);

      st.showPick = true;
      add(6, '取前 ' + R.topK + ' 段', '依選定的「' + p.method + '」方式挑出分數最高的 ' + R.topK + ' 段（已標亮）。', [
        '取回段落：' + R.topOrder.map(x => 'C' + (x.i + 1)).join('、')
      ]);

      st.showPrompt = true;
      add(7, '組裝提示詞交給 LLM', '把「系統指示＋檢索到的段落＋原問題」拼成提示詞。若漏掉 C5（排他條款），LLM 就會給錯答案！', [
        '已組裝 ' + R.topK + ' 段進提示詞（請見下方）'
      ]);

      while (steps.length < 10) {
        add(7, 'Top-K 與切塊的實務提醒', '調整上方「依句／依段」或「Top-K」，看漏掉排他條款 C5 時回答會怎麼出錯（對應 M8 長照 3.0 案例）。', [
          '目前取回：' + R.topOrder.map(x => 'C' + (x.i + 1)).join('、')
        ]);
      }
      return steps;
    },

    inputs(rows, p) {
      const R = runRAG(rows, p);
      return { docs_tok: R.docs.map(d => d.join(' ')), query_tok: R.qToks.join(' ') };
    },

    keys(steps, rows, p) {
      const R = runRAG(rows, p);
      const k = { n_chunks: R.texts.length };
      for (let i = 0; i < R.texts.length; i++) {
        k['bm25_' + i] = R.bm25Scores[i];
        k['vec_' + i] = R.vecScores[i];
        k['rrf_' + i] = R.rrfScores[i];
      }
      R.topOrder.forEach((x, idx) => { k['top_' + idx] = x.i; });
      return k;
    },

    explain(steps, rows, p) {
      const R = runRAG(rows, p);
      return [
        '將長照衛教短文切成 ' + R.texts.length + ' 段，以「' + p.method + '」檢索取前 ' + R.topK + ' 段，挑出 ' + R.topOrder.map(x => 'C' + (x.i + 1)).join('、') + '。',
        'BM25 擅長精準比對專有名詞（如「外籍看護」）；向量檢索能捕捉同義語意；RRF 混合則結合兩者優點。',
        '若 Top-K 太小或切塊不當，導致否定／排他條款沒被取回，LLM 就會產生看似合理卻錯誤的幻覺回答。'
      ];
    },

    aistudio: {
      operators: ['Execute Python'],
      params: [['chunk', p => p.chunk], ['top_k', p => String(p.top_k)], ['method', p => p.method]],
      note: '可對照 M8 第 07 節與 Dify 知識庫的混合檢索、Top K 設定。',
      expect: (steps, rows, p) => {
        const R = runRAG(rows, p);
        return ['取回段落：' + R.topOrder.map(x => 'C' + (x.i + 1)).join(', ')];
      },
      python: `from sklearn.feature_extraction.text import TfidfVectorizer\n# BM25 (k1=1.5, b=0.75) + TF-IDF 餘弦相似度 + RRF 合併`,
      confirmed: false
    }
  });
})();
