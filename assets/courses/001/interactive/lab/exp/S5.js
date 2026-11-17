/* S5 NLP 自然語言處理標準流程 */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = [
    { key: 'id', label: '#', type: 'int' },
    { key: 'text', label: '護理紀錄', type: 'text' },
    { key: 'label', label: '類別', type: 'cat', levels: ['跌倒風險', '疼痛', '傷口照護'] }
  ];

  function makeRows(seed) {
    return LAB.data.notes(seed, 6);
  }

  function simulate(rows, p) {
    const isLLM = p.era === 'llm';
    const sample = rows[0].text;
    const toks = isLLM
      ? ['病人', '主訴', '傷口', '紅腫', '疼痛']
      : ['病人', '主訴', '傷口', '紅腫', '疼痛'];
    const cleanToks = ['主訴', '傷口', '紅腫', '疼痛'];
    return { isLLM, sample, toks, cleanToks };
  }

  LAB.register({
    id: 'S5', group: 'S', title: 'NLP 文字處理流程',
    module: { name: 'M6 文字探勘', url: '../m6/' },
    goal: '透過動畫看懂非結構化醫療文字如何一步步變成模型能懂的向量：清理與斷詞 → 去停用詞／BPE → 向量化（TF-IDF/詞嵌入）→ 建模與 RAG 應用。',
    data: {
      name: 'nlp_flow',
      scenario: '6 筆中文門診／護理紀錄，比較傳統文字探勘與現代 LLM/RAG 處理管線',
      columns: COLS,
      small: makeRows
    },
    params: [
      { key: 'era', label: '處理範式', type: 'choice', value: 'classic', options: [{ v: 'classic', label: '傳統 NLP (TF-IDF + 分類)' }, { v: 'llm', label: '現代 LLM (BPE + 注意力/RAG)' }] }
    ],
    pseudo: [
      '1. 文本清理（去空白、標點與隱私遮罩）',
      '2. 斷詞或子詞切分 (Word / BPE)',
      '3. 過濾停用詞或查詞嵌入＋位置編碼',
      '4. 轉為數值向量（TF-IDF / 語意向量）',
      '5. 送入分類器、主題模型或注意力層',
      '6. 輸出分類、相似檢索 (RAG) 或生成'
    ],
    build(rows, p) {
      const R = simulate(rows, p), steps = [];

      function views(st) {
        const done = k => st.stage > k;
        const act = k => st.stage === k;
        const clsOf = k => act(k) ? 'hl' : (done(k) ? 'good' : 'c5');
        const layers = [
          [{ id: 'txt', label: '1. 原始文字', value: rows.length + ' 句', shape: 'box', cls: clsOf(0), hl: act(0), sub: '非結構化' }],
          [{ id: 'tok', label: R.isLLM ? '2. BPE 子詞' : '2. 中文斷詞', value: st.stage >= 1 ? '切詞完成' : '整串字串', shape: 'box', cls: clsOf(1), hl: act(1), sub: R.isLLM ? 'H1 BPE' : 'E1 最大匹配' }],
          [{ id: 'flt', label: R.isLLM ? '3. 嵌入+位置' : '3. 去停用詞', value: st.stage >= 2 ? (R.isLLM ? 'E + PE' : '留關鍵詞') : '含虛詞', shape: 'box', cls: clsOf(2), hl: act(2), sub: R.isLLM ? 'H2' : '刪「病人、已」' }],
          [{ id: 'vec', label: R.isLLM ? '4. 注意力層' : '4. TF-IDF 向量', value: st.stage >= 3 ? '數值矩陣' : '待轉換', shape: 'box', cls: clsOf(3), hl: act(3), sub: R.isLLM ? 'H3 Self-Attn' : 'E1 / E3' }],
          [{ id: 'app', label: R.isLLM ? '5. RAG / 生成' : '5. 分類 / 主題', value: st.stage >= 4 ? '輸出結果' : '待推論', shape: 'box', cls: clsOf(4), hl: act(4), sub: R.isLLM ? 'H5 / H6' : 'E2 / E4' }]
        ];
        const edges = [
          { from: 'txt', to: 'tok', active: st.stage === 1, cls: done(0) ? 'good' : 'c5' },
          { from: 'tok', to: 'flt', active: st.stage === 2, cls: done(1) ? 'good' : 'c5' },
          { from: 'flt', to: 'vec', active: st.stage === 3, cls: done(2) ? 'good' : 'c5' },
          { from: 'vec', to: 'app', active: st.stage === 4, cls: done(3) ? 'good' : 'c5' }
        ];
        const main = {
          type: 'network', slot: 'main',
          title: 'NLP 文字處理標準流程（' + (R.isLLM ? '現代 LLM / RAG' : '傳統文字探勘') + '）',
          layerLabels: ['原文', '切分', '精煉', '表示/運算', '應用'],
          layers, edges
        };
        const side = {
          type: 'table', slot: 'side',
          title: '範例護理紀錄隨階段轉換',
          cols: [{ key: 'id', label: '#' }, { key: 'txt', label: '內容 / 狀態' }, { key: 'y', label: '類別' }],
          rows: rows.map((r, i) => ({
            id: r.id,
            cells: [
              r.id,
              st.stage >= 3 ? { v: '[0.42, 0.00, 0.78, …]', cls: 'c2' } : r.text.slice(0, 14) + '…',
              { v: r.label, cls: 'c' + (i % 3) }
            ],
            hl: i === 0 && st.stage >= 1 && st.stage <= 2
          }))
        };
        const toksShow = st.stage === 0
          ? [{ id: 'raw', text: R.sample, cls: 'c5' }]
          : R.toks.map((t, idx) => {
              const isStop = t === '病人';
              const cut = !R.isLLM && st.stage >= 2 && isStop;
              return {
                id: 't' + idx, text: t,
                state: cut ? 'cut' : undefined,
                cls: cut ? 'cut' : (st.stage >= 3 ? 'good' : 'c0'),
                hl: st.stage === 1
              };
            });
        const bottom = {
          type: 'tokens', slot: 'bottom',
          title: '第 1 句處理即時預覽',
          items: toksShow
        };
        return [main, side, bottom];
      }

      const st = { stage: 0 };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '1. 文本清理與去識別', '電腦看不懂整段文字。先清理多餘符號、統一全半形，醫療文本還要先做個資去識別化。', [
        '範例句：' + R.sample
      ]);
      st.stage = 1;
      add(1, R.isLLM ? '2. BPE 子詞切分' : '2. 中文斷詞', R.isLLM ? 'LLM 用 BPE 切出高頻子詞（H1），既能控制詞表大小又能處理沒見過的新詞。' : '中文詞與詞之間沒有空白，需先用字典或分詞器切出有意義的詞彙（E1）。', [
        '切分結果：' + R.toks.join(' / ')
      ]);
      st.stage = 2;
      add(2, R.isLLM ? '3. 詞嵌入與位置編碼' : '3. 過濾停用詞', R.isLLM ? '每個 token 查表轉為稠密語意向量 E，並加上位置編碼 PE 記住詞序（H2）。' : '去掉「病人、已、有」等高頻功能詞（標紅刪除），留下真正有診斷區辨力的關鍵詞。', [
        R.isLLM ? 'X = E + PE（同時含詞義與位置）' : '保留關鍵詞：' + R.cleanToks.join('、')
      ]);
      st.stage = 3;
      add(3, R.isLLM ? '4. 注意力機制融合' : '4. 轉為 TF-IDF 向量', R.isLLM ? '透過 Q·K·V 注意力機制讓每個詞參考上下文（H3），理解「不痛」與「劇痛」的差異。' : '把關鍵詞轉成 TF-IDF 權重向量（E1）或訓練 Word2Vec 詞向量（E3）。', [
        R.isLLM ? '平行捕捉長距離上下文語意' : '完成「文件 × 詞彙」數值矩陣'
      ]);
      st.stage = 4;
      add(4, R.isLLM ? '5. RAG 檢索與生成' : '5. 分類與主題探勘', R.isLLM ? '結合 RAG 檢索最相關衛教段落（H6），再以 Temperature / Top-p 解碼逐字生成回答（H5）。' : '將數值向量送入 Naive Bayes 文本分類（E2）或 LDA 主題模型（E4），自動歸納紀錄重點。', [
        R.isLLM ? '有憑有據回答，降低幻覺風險' : '輸出分類標籤與核心關鍵詞'
      ]);
      st.stage = 5;
      add(5, '6. 評估與實務檢核', '分類看 F1 / AUC，檢索看 Recall@K，生成式任務則需人工或 LLM-as-a-Judge 檢查事實正確性。', [
        '醫療 NLP 必須特別留意否定詞（「無發燒」≠「發燒」）'
      ]);
      while (steps.length < 10) {
        add(5, '傳統 NLP vs LLM 選擇', '大量固定分類、預算有限時，TF-IDF＋線性分類器又快又準；需要複雜語意理解與問答才上 LLM＋RAG。', [
          '先從簡單基準（TF-IDF）做起，再視需求升級！'
        ]);
      }
      return steps;
    },
    keys(steps, rows, p) {
      const R = simulate(rows, p);
      return { n_docs: rows.length, n_toks: R.toks.length, n_clean_toks: R.cleanToks.length, sample_len: R.sample.length, is_llm: R.isLLM ? 1 : 0 };
    },
    explain(steps, rows, p) {
      return [
        'NLP 管線的核心是「把非結構化文字逐步轉為保留語意的數值向量」，再交給下游分類、分群或生成模型。',
        '傳統流程：文本清理 → 斷詞 → 去停用詞 → TF-IDF → Naive Bayes／LDA；現代 LLM：BPE → 嵌入＋位置編碼 → Self-Attention → RAG／生成解碼。',
        '臨床文本處理務必留意去識別化與否定語氣詞，避免把「無糖尿病史」誤判為陽性。'
      ];
    },
    aistudio: {
      operators: ['Read CSV', 'Process Documents from Data', 'Tokenize', 'Filter Stopwords', 'Naive Bayes'],
      params: [['Tokenize', 'non-letters / language'], ['TF-IDF', 'vector creation']],
      note: 'AI Studio 需安裝 Text Processing 擴充套件；中文斷詞建議先在 Python（如 jieba）切好再用空白分隔讀入。',
      expect: () => ['文字紀錄成功轉為 TF-IDF 詞頻向量並完成分類'],
      python: 'from sklearn.feature_extraction.text import TfidfVectorizer\nfrom sklearn.naive_bayes import MultinomialNB',
      confirmed: false
    }
  });
})();
