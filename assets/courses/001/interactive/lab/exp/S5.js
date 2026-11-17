/* S5 NLP 與 LLM 文字處理標準流程（傳統 TF-IDF／詞向量／現代 LLM+RAG 3 條管線） */
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
    const era = p.era || 'classic';
    const isLLM = era === 'llm';
    const isEmb = era === 'embed';
    const sample = rows[0].text;
    const toks = ['病人', '主訴', '傷口', '紅腫', '疼痛'];
    const cleanToks = ['主訴', '傷口', '紅腫', '疼痛'];
    return { era, isLLM, isEmb, sample, toks, cleanToks };
  }

  LAB.register({
    id: 'S5', group: 'S', title: 'NLP 與 LLM 處理流程',
    module: { name: 'M6 文字探勘', url: '../m6/' },
    goal: '透過全寬動畫流程圖對照「傳統 TF-IDF」、「Word2Vec 詞向量」與「現代 LLM＋RAG」3 條文字處理管線，標註 E1–E4 與 H1–H7 演算法。',
    data: {
      name: 'nlp_flow',
      scenario: '6 筆中文門診／護理紀錄，比較傳統文字探勘、詞向量與現代 LLM/RAG 處理管線',
      columns: COLS,
      small: makeRows
    },
    params: [
      { key: 'era', label: 'NLP 處理管線', type: 'choice', value: 'classic', options: [{ v: 'classic', label: '傳統 TF-IDF + 分類/主題' }, { v: 'embed', label: '詞向量 Word2Vec' }, { v: 'llm', label: '現代 LLM + RAG + LoRA' }] }
    ],
    pseudo: [
      '1. 文本清理（去空白與個資去識別）',
      '2. 斷詞或子詞切分 (Word / BPE)',
      '3. 去停用詞或詞嵌入＋位置編碼',
      '4. 轉數值向量或 Self-Attention',
      '5. 分類、主題探勘或 RAG 檢索',
      '6. 評估指標與實務否定詞檢核'
    ],
    build(rows, p) {
      const R = simulate(rows, p), steps = [];

      const ALGO_ROWS = [
        { id: 's0', st: '1. 文本清理', alg: '正規表達式＋去識別', use: '醫療文本必先移除姓名／病歷號' },
        { id: 's1', st: '2. 切詞 / 子詞', alg: R.isLLM ? 'H1 BPE 子詞切分' : 'E1 正向最大匹配', use: R.isLLM ? '控制詞表大小並處理新詞' : '中文無空白，需先斷詞' },
        { id: 's2', st: '3. 過濾 / 編碼', alg: R.isLLM ? 'H2 詞嵌入＋位置編碼' : 'E1 停用詞過濾', use: R.isLLM ? '同時保留詞義與詞序' : '刪掉「病人、已」等功能詞' },
        { id: 's3', st: '4. 表示與運算', alg: R.isLLM ? 'H3 Self-Attention / H4' : R.isEmb ? 'E3 Word2Vec 負抽樣' : 'E1 TF-IDF 加權矩陣', use: R.isLLM ? '長距離上下文融合' : R.isEmb ? '學出詞與詞的語意距離' : '凸顯罕見關鍵詞權重' },
        { id: 's4', st: '5. 下游應用', alg: R.isLLM ? 'H6 RAG · H5 解碼 · H7 LoRA' : R.isEmb ? '詞向量平均＋分類器' : 'E2 Naive Bayes · E4 LDA', use: R.isLLM ? '有憑據回答降低幻覺' : '快且省資源的分類與主題歸納' }
      ];

      function views(st) {
        const done = k => st.stage > k;
        const act = k => st.stage === k;
        const clsOf = k => act(k) ? 'hl' : (done(k) ? 'good' : 'c5');
        const layers = [
          [{ id: 'txt', label: '1. 原始文字', value: rows.length + ' 句', shape: 'box', w: 156, cls: clsOf(0), hl: act(0), sub: '清理＋去識別' }],
          [{ id: 'tok', label: R.isLLM ? '2. BPE 子詞' : '2. 中文斷詞', value: st.stage >= 1 ? '切詞完成' : '字串', shape: 'box', w: 156, cls: clsOf(1), hl: act(1), sub: R.isLLM ? 'H1 BPE' : 'E1 最大匹配' }],
          [{ id: 'flt', label: R.isLLM ? '3. 嵌入+位置' : '3. 去停用詞', value: st.stage >= 2 ? (R.isLLM ? 'E + PE' : '留關鍵詞') : '含虛詞', shape: 'box', w: 156, cls: clsOf(2), hl: act(2), sub: R.isLLM ? 'H2 位置編碼' : 'E1 刪功能詞' }],
          [{ id: 'vec', label: R.isLLM ? '4. 注意力層' : R.isEmb ? '4. Word2Vec' : '4. TF-IDF', value: st.stage >= 3 ? '向量化' : '待轉換', shape: 'box', w: 156, cls: clsOf(3), hl: act(3), sub: R.isLLM ? 'H3/H4 Attn' : R.isEmb ? 'E3 Skip-gram' : 'E1 詞頻加權' }],
          [{ id: 'app', label: R.isLLM ? '5. RAG / 生成' : R.isEmb ? '5. 語意檢索' : '5. 分類 / 主題', value: st.stage >= 4 ? '完成' : '待推論', shape: 'box', w: 156, cls: clsOf(4), hl: act(4), sub: R.isLLM ? 'H5/H6/H7' : R.isEmb ? '餘弦相似詞' : 'E2 NB · E4 LDA' }]
        ];
        const edges = [
          { from: 'txt', to: 'tok', active: st.stage === 1, cls: done(0) ? 'good' : 'c5' },
          { from: 'tok', to: 'flt', active: st.stage === 2, cls: done(1) ? 'good' : 'c5' },
          { from: 'flt', to: 'vec', active: st.stage === 3, cls: done(2) ? 'good' : 'c5' },
          { from: 'vec', to: 'app', active: st.stage === 4, cls: done(3) ? 'good' : 'c5' }
        ];
        const main = {
          type: 'network', slot: 'main', w: 1520, h: 150,
          title: 'NLP 文字處理全流程圖（' + (R.isLLM ? '現代 LLM＋RAG' : R.isEmb ? 'Word2Vec 詞向量' : '傳統 TF-IDF') + '）',
          layerLabels: ['1. 原文', '2. 切分', '3. 精煉', '4. 表示/運算', '5. 應用'],
          layers, edges
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
        const side = {
          type: 'tokens', slot: 'side',
          title: '第 1 句處理即時預覽',
          items: toksShow
        };
        const bottom = {
          type: 'table', slot: 'bottom',
          title: '步驟與可用演算法對照（' + (R.isLLM ? '現代 LLM＋RAG' : R.isEmb ? 'Word2Vec 詞向量' : '傳統 TF-IDF') + '）',
          cols: [{ key: 'st', label: '步驟' }, { key: 'alg', label: '可用演算法' }, { key: 'use', label: '何時用／關鍵提醒' }],
          rows: ALGO_ROWS.map((ar, idx) => ({
            id: ar.id,
            cells: [ar.st, { v: ar.alg, cls: idx === Math.min(st.stage, 4) ? 'hl' : (idx < st.stage ? 'good' : 'c0') }, ar.use],
            hl: idx === Math.min(st.stage, 4)
          }))
        };
        return [main, side, bottom];
      }

      const st = { stage: 0 };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '1. 文本清理與去識別', '電腦看不懂整段文字。先清理標點符號與空白，醫療紀錄還要做個資去識別化。', [
        '範例句：' + R.sample
      ]);
      st.stage = 1;
      add(1, R.isLLM ? '2. BPE 子詞切分 (H1)' : '2. 中文斷詞 (E1)', R.isLLM ? 'LLM 用 BPE 反覆合併高頻相鄰字元（H1），平衡詞表大小與罕見詞切分。' : '中文詞間沒有空白，需先透過字典匹配切出有意義的詞彙（E1）。', [
        '切分結果：' + R.toks.join(' / ')
      ]);
      st.stage = 2;
      add(2, R.isLLM ? '3. 嵌入與位置編碼' : '3. 過濾停用詞', R.isLLM ? '查表得語意向量 E 並加上正弦位置編碼 PE（H2），讓模型分出詞序前後。' : '去掉「病人、已、有」等高頻功能詞（標紅刪除），保留診斷關鍵詞。', [
        R.isLLM ? 'X = E + PE（詞義＋位置）' : '保留關鍵詞：' + R.cleanToks.join('、')
      ]);
      st.stage = 3;
      add(3, R.isLLM ? '4. 注意力機制融合' : R.isEmb ? '4. Word2Vec 學習' : '4. 轉為 TF-IDF 向量', R.isLLM ? '透過 Q·K·V 注意力讓每個詞看上下文（H3/H4），區分「無發燒」與「高燒」。' : R.isEmb ? '用滑動視窗 Skip-gram＋負抽樣拉近共現詞（E3），讓同義詞在空間中靠近。' : '計算詞頻與逆文件頻率，轉為「文件 × 詞彙」權重矩陣（E1）。', [
        R.isLLM ? '平行捕捉長距離上下文' : R.isEmb ? '學出 2D/高維語意詞向量' : '完成 TF-IDF 數值矩陣'
      ]);
      st.stage = 4;
      add(4, R.isLLM ? '5. RAG 檢索與生成' : R.isEmb ? '5. 語意檢索與分類' : '5. 分類與主題探勘', R.isLLM ? '用 RAG 混合檢索挑出衛教段落（H6），以 Top-p 解碼生成回答（H5），或用 LoRA 微調（H7）。' : R.isEmb ? '可對詞向量算餘弦相似度找同義詞，或平均句內詞向量送分類器。' : '送入 Naive Bayes 文本分類（E2）或 LDA 主題模型（E4）自動歸納紀錄重點。', [
        R.isLLM ? '有憑據生成，大幅降低幻覺' : '輸出分類標籤或主題關鍵詞'
      ]);
      st.stage = 5;
      add(5, '6. 評估與否定詞檢核', '分類看 F1 / AUC，檢索看 Recall@K；醫療 NLP 務必檢查否定詞（「無疼痛」≠「疼痛」）。', [
        '建議：先建立 TF-IDF 基線，再依需求升級 Word2Vec 或 LLM'
      ]);
      while (steps.length < 10) {
        add(5, '三條管線選用建議', '固定分類與關鍵字比對用 TF-IDF；需要近義詞泛化用詞向量；複雜問答與摘要再用 LLM＋RAG。', [
          '目前選擇：' + (R.isLLM ? '現代 LLM＋RAG' : R.isEmb ? 'Word2Vec 詞向量' : '傳統 TF-IDF')
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
        'NLP 管線依技術演進分為「傳統 TF-IDF」、「Word2Vec 詞向量」與「現代 LLM＋RAG」三條路線。',
        '傳統路線對應 E1–E4（斷詞、TF-IDF、Naive Bayes、Word2Vec、LDA）；現代路線對應 H1–H7（BPE、位置編碼、Attention、解碼、RAG、LoRA）。',
        '實務建議先用 TF-IDF 建立快速基準，若需跨詞彙語意理解或生成問答再升級至 LLM＋RAG。'
      ];
    },
    aistudio: {
      operators: ['Read CSV', 'Process Documents from Data', 'Tokenize', 'Filter Stopwords', 'Naive Bayes'],
      params: [['Tokenize', 'non-letters / language'], ['TF-IDF', 'vector creation']],
      note: 'AI Studio 需安裝 Text Processing 擴充套件；中文斷詞建議先在 Python（如 jieba）切好再讀入。',
      expect: () => ['文字紀錄成功轉為 TF-IDF 向量並完成分類'],
      python: 'from sklearn.feature_extraction.text import TfidfVectorizer\nfrom sklearn.naive_bayes import MultinomialNB',
      confirmed: false
    }
  });
})();
