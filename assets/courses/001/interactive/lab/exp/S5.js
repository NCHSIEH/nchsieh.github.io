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

  /* 正向最大匹配斷詞：依 LAB.data.dict 由長到短比對，查無詞條就以單字切出，標點略過 */
  function segment(text) {
    const dict = LAB.data.dict, maxLen = Math.max(...dict.map(w => w.length)), out = [];
    let i = 0;
    while (i < text.length) {
      let hit = null;
      for (let L = Math.min(maxLen, text.length - i); L >= 1; L--) { const w = text.substr(i, L); if (dict.includes(w)) { hit = w; break; } }
      if (hit) { out.push(hit); i += hit.length; }
      else { const ch = text[i]; if (!/[，。、；！？,.\s]/.test(ch)) out.push(ch); i += 1; }
    }
    return out;
  }

  function simulate(rows, p) {
    const era = p.era || 'classic';
    const isLLM = era === 'llm';
    const isEmb = era === 'embed';
    const sample = rows[0].text;
    const toks = segment(sample), cleanToks = toks.filter(t => !LAB.data.stop.includes(t));
    return { era, isLLM, isEmb, sample, toks, cleanToks };
  }

  LAB.register({
    id: 'S5', group: 'S', title: 'NLP 與 LLM 處理流程',
    module: { name: 'M6 文字探勘', url: '../m6/' },
    goal: '透過全寬動畫流程圖對照「傳統 TF-IDF／BM25」、「Word2Vec 詞向量」與「現代 LLM＋RAG＋Rerank」3 條文字處理管線，標註 E1–E5 與 H1–H9 演算法。',
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
        { id: 's2', st: '3. 過濾 / 編碼', alg: R.isLLM ? 'H2 詞嵌入＋位置編碼' : 'E1 停用詞過濾 · E5 N-gram', use: R.isLLM ? '同時保留詞義與詞序' : '刪掉虛詞並用 E5 Bigram 保留相鄰詞組' },
        { id: 's3', st: '4. 表示與運算', alg: R.isLLM ? 'H3 Self-Attention / H4' : R.isEmb ? 'E3 Word2Vec 負抽樣' : 'E1 TF-IDF · E5 BM25 飽和', use: R.isLLM ? '長距離上下文融合' : R.isEmb ? '學出詞與詞的語意距離' : '凸顯罕見詞並用 E5 BM25 抑制贅詞與長文偏誤' },
        { id: 's4', st: '5. 下游應用', alg: R.isLLM ? 'H6 RAG · H9 Rerank/DPO · H7 LoRA' : R.isEmb ? '詞向量平均＋分類器' : 'E2 Naive Bayes · E4 LDA', use: R.isLLM ? '二階段精排與偏好對齊降低幻覺，KV Cache 加速推論' : '快且省資源的分類與主題歸納' }
      ];

      function views(st) {
        const done = k => st.stage > k;
        const act = k => st.stage === k;
        const clsOf = k => act(k) ? 'hl' : (done(k) ? 'good' : 'c5');
        const layers = R.isLLM ? [
          [
            { id: 'q', label: '1a. 使用者提問', value: 'Query 文本', shape: 'box', w: 140, cls: clsOf(0), hl: act(0), sub: '門診/照護問題' },
            { id: 'kb', label: '1b. 知識庫切塊', value: '衛教文件', shape: 'box', w: 140, cls: clsOf(0), hl: act(0), sub: 'H6 依句/依段切分' }
          ],
          [
            { id: 'tok', label: '2a. BPE 子詞切分', value: st.stage >= 1 ? 'Subwords' : '切子詞', shape: 'box', w: 140, cls: clsOf(1), hl: act(1), sub: 'H1 處理罕見醫療詞' },
            { id: 'vdb', label: '2b. 離線向量建庫', value: 'Chunk 索引', shape: 'box', w: 140, cls: clsOf(1), hl: act(1), sub: 'BM25 + 向量庫' }
          ],
          [
            { id: 'emb', label: '3a. 詞嵌入+位置', value: st.stage >= 2 ? 'E + PE' : '查表編碼', shape: 'box', w: 140, cls: clsOf(2), hl: act(2), sub: 'H2 正餘弦位置波' },
            { id: 'qemb', label: '3b. Query 向量化', value: '檢索嵌入', shape: 'box', w: 140, cls: clsOf(2), hl: act(2), sub: '對齊知識庫空間' }
          ],
          [
            { id: 'vec', label: '4a. Self-Attention', value: st.stage >= 3 ? 'Q·Kᵀ/√d' : '待運算', shape: 'box', w: 142, cls: clsOf(3), hl: act(3), sub: 'H3/H4 因果遮罩+FFN' },
            { id: 'rag', label: '4b. RRF 混合檢索', value: st.stage >= 4 ? 'Top-K 段落' : '待檢索', shape: 'box', w: 142, cls: clsOf(4), hl: act(4), sub: 'H6 字面+語意融合' }
          ],
          [
            { id: 'aug', label: '5a. 提示詞組裝', value: '注入證據', shape: 'box', w: 142, cls: clsOf(4), hl: act(4), sub: '防幻覺 Grounding' },
            { id: 'lora', label: '5b. LoRA 低秩旁路', value: 'ΔW = B·A', shape: 'box', w: 142, cls: clsOf(4), hl: act(4), sub: 'H7 凍結主幹省顯存' }
          ],
          [
            { id: 'dec', label: '6a. 抽樣解碼策略', value: 'Temp / Top-p', shape: 'box', w: 142, cls: clsOf(5), hl: act(5), sub: 'H5 控制隨機與創意' },
            { id: 'gen', label: '6b. 附引據回覆', value: st.stage >= 5 ? '完成回答' : '待生成', shape: 'box', w: 142, cls: clsOf(5), hl: act(5), sub: '標註衛教段落來源' }
          ]
        ] : [
          [
            { id: 'txt', label: '1a. 原始護理文字', value: rows.length + ' 句', shape: 'box', w: 140, cls: clsOf(0), hl: act(0), sub: '非結構化自由書寫' },
            { id: 'pii', label: '1b. 去識別與清理', value: '遮蔽個資', shape: 'box', w: 140, cls: clsOf(0), hl: act(0), sub: '移除姓名/標點雜訊' }
          ],
          [
            { id: 'tok', label: '2a. 中文正向斷詞', value: st.stage >= 1 ? '切詞完成' : '字串', shape: 'box', w: 140, cls: clsOf(1), hl: act(1), sub: 'E1 最大匹配演算法' },
            { id: 'lex', label: '2b. 醫療領域詞典', value: '保留專有名詞', shape: 'box', w: 140, cls: clsOf(1), hl: act(1), sub: '防拆碎「糖化血色素」' }
          ],
          [
            { id: 'flt', label: '3a. 停用詞過濾', value: st.stage >= 2 ? '刪虛詞' : '含虛詞', shape: 'box', w: 140, cls: clsOf(2), hl: act(2), sub: 'E1 刪除「的/了/病人」' },
            { id: 'kw', label: '3b. 臨床關鍵詞集', value: '建立詞表 V', shape: 'box', w: 140, cls: clsOf(2), hl: act(2), sub: '保留高資訊量症狀詞' }
          ],
          R.isEmb
            ? [
                { id: 'win', label: '4a. 滑動上下文窗', value: '視窗 C=2', shape: 'box', w: 140, cls: clsOf(3), hl: act(3), sub: '收集鄰近共現詞對' },
                { id: 'neg', label: '4b. 負採樣配對', value: '對比非鄰居', shape: 'box', w: 140, cls: clsOf(3), hl: act(3), sub: '大幅降低訓練計算量' }
              ]
            : [
                { id: 'tf', label: '4a. TF 詞頻統計', value: '單句出現次數', shape: 'box', w: 140, cls: clsOf(3), hl: act(3), sub: '衡量句內重要度' },
                { id: 'idf', label: '4b. IDF 逆文件權重', value: 'log(N / df)', shape: 'box', w: 140, cls: clsOf(3), hl: act(3), sub: '壓低跨篇常見詞' }
              ],
          R.isEmb
            ? [
                { id: 'vec', label: '5a. Skip-gram 預測', value: st.stage >= 3 ? '中心猜上下文' : '待訓練', shape: 'box', w: 142, cls: clsOf(3), hl: act(3), sub: 'E3 學習語意鄰近性' },
                { id: 'dns', label: '5b. 稠密詞向量表', value: '低維連續空間', shape: 'box', w: 142, cls: clsOf(3), hl: act(3), sub: '同義詞餘弦距離近' }
              ]
            : [
                { id: 'vec', label: '5a. TF-IDF 矩陣', value: st.stage >= 3 ? 'TF × IDF' : '待轉換', shape: 'box', w: 142, cls: clsOf(3), hl: act(3), sub: 'E1 高維稀疏權重' },
                { id: 'nrm', label: '5b. L2 長度正規化', value: '消除長短句偏誤', shape: 'box', w: 142, cls: clsOf(3), hl: act(3), sub: '便於算餘弦相似度' }
              ],
          R.isEmb
            ? [
                { id: 'app', label: '6a. 同義語意檢索', value: st.stage >= 4 ? '餘弦相似詞' : '待推論', shape: 'box', w: 142, cls: clsOf(4), hl: act(4), sub: '頭暈 ↔ 眩暈自動關聯' },
                { id: 'clf', label: '6b. 句向量分類', value: '平均池化送分類', shape: 'box', w: 142, cls: clsOf(4), hl: act(4), sub: '支援下游風險預測' }
              ]
            : [
                { id: 'app1', label: '6a. 文本事件分類', value: '跌倒/痛/傷口', shape: 'box', w: 142, cls: clsOf(4), hl: act(4), sub: 'E2 單純貝氏 + 拉普拉斯' },
                { id: 'app2', label: '6b. 無監督主題探勘', value: '挖掘潛在主題', shape: 'box', w: 142, cls: clsOf(4), hl: act(4), sub: 'E4 LDA 文件-主題分布' }
              ]
        ];
        const edges = R.isLLM ? [
          { from: 'q', to: 'tok', active: st.stage === 1, cls: done(0) ? 'good' : 'c5' },
          { from: 'kb', to: 'vdb', active: st.stage === 1, cls: done(0) ? 'c2' : 'c5' },
          { from: 'tok', to: 'emb', active: st.stage === 2, cls: done(1) ? 'good' : 'c5' },
          { from: 'vdb', to: 'qemb', active: st.stage === 2, cls: done(1) ? 'c2' : 'c5' },
          { from: 'emb', to: 'vec', active: st.stage === 3, cls: done(2) ? 'good' : 'c5' },
          { from: 'qemb', to: 'rag', active: st.stage === 4, cls: done(2) ? 'c2' : 'c5', label: '混合檢索' },
          { from: 'vec', to: 'aug', active: st.stage === 4, cls: done(3) ? 'good' : 'c5' },
          { from: 'rag', to: 'aug', active: st.stage === 4, cls: done(3) ? 'good' : 'c5' },
          { from: 'vec', to: 'lora', active: st.stage === 4, cls: done(3) ? 'good' : 'c5' },
          { from: 'aug', to: 'dec', active: st.stage === 5, cls: done(4) ? 'good' : 'c5' },
          { from: 'aug', to: 'gen', active: st.stage === 5, cls: done(4) ? 'good' : 'c5' },
          { from: 'lora', to: 'gen', active: st.stage === 5, cls: done(4) ? 'good' : 'c5' }
        ] : [
          { from: 'txt', to: 'tok', active: st.stage === 1, cls: done(0) ? 'good' : 'c5' },
          { from: 'pii', to: 'lex', active: st.stage === 1, cls: done(0) ? 'good' : 'c5' },
          { from: 'tok', to: 'flt', active: st.stage === 2, cls: done(1) ? 'good' : 'c5' },
          { from: 'lex', to: 'kw', active: st.stage === 2, cls: done(1) ? 'good' : 'c5' },
          ...(R.isEmb
            ? [
                { from: 'flt', to: 'win', active: st.stage === 3, cls: done(2) ? 'good' : 'c5' },
                { from: 'kw', to: 'neg', active: st.stage === 3, cls: done(2) ? 'good' : 'c5' },
                { from: 'win', to: 'vec', active: st.stage === 3, cls: done(2) ? 'good' : 'c5' },
                { from: 'neg', to: 'dns', active: st.stage === 3, cls: done(2) ? 'good' : 'c5' },
                { from: 'vec', to: 'app', active: st.stage === 4, cls: done(3) ? 'good' : 'c5' },
                { from: 'dns', to: 'clf', active: st.stage === 4, cls: done(3) ? 'good' : 'c5' }
              ]
            : [
                { from: 'flt', to: 'tf', active: st.stage === 3, cls: done(2) ? 'good' : 'c5' },
                { from: 'kw', to: 'idf', active: st.stage === 3, cls: done(2) ? 'good' : 'c5' },
                { from: 'tf', to: 'vec', active: st.stage === 3, cls: done(2) ? 'good' : 'c5' },
                { from: 'idf', to: 'vec', active: st.stage === 3, cls: done(2) ? 'good' : 'c5' },
                { from: 'idf', to: 'nrm', active: st.stage === 3, cls: done(2) ? 'good' : 'c5' },
                { from: 'vec', to: 'app1', active: st.stage === 4, cls: done(3) ? 'good' : 'c5' },
                { from: 'nrm', to: 'app2', active: st.stage === 4, cls: done(3) ? 'good' : 'c5' }
              ])
        ];
        const main = {
          type: 'network', slot: 'main', w: 1500, h: 230,
          title: 'NLP 文字處理全流程圖（' + (R.isLLM ? '現代 LLM＋RAG' : R.isEmb ? 'Word2Vec 詞向量' : '傳統 TF-IDF') + '）',
          layerLabels: R.isLLM
            ? ['1. 提問與知識庫', '2. 子詞與索引', '3. 嵌入與位置', '4. 注意力與檢索', '5. 組裝與微調', '6. 解碼與生成']
            : ['1. 清理去識別', '2. 斷詞與詞典', '3. 停用詞過濾', '4. 詞頻/視窗統計', '5. 向量表徵', '6. 下游任務應用'],
          layers, edges
        };
        const toksShow = st.stage === 0
          ? [{ id: 'raw', text: R.sample, cls: 'c5' }]
          : R.toks.map((t, idx) => {
              const isStop = LAB.data.stop.includes(t);
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
      add(2, R.isLLM ? '3. 嵌入與位置編碼' : '3. 過濾停用詞', R.isLLM ? '查表得語意向量 E 並加上正弦位置編碼 PE（H2），讓模型分出詞序前後。' : '去掉高頻功能詞（本句：' + (R.toks.filter(t => !R.cleanToks.includes(t)).join('、') || '無') + '，標紅刪除），保留診斷關鍵詞。', [
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
        '建議：先建立 TF-IDF / BM25 基線，再依需求升級 Word2Vec 或 LLM'
      ]);
      add(5, '檢索升級：E5 N-gram', '傳統單詞袋會遺失詞序搭配；加入 Bigram 雙連詞與 Okapi BM25 飽和評分（E5）可防止贅詞洗版與長文偏誤。', [
        '對應實驗：E5 N-gram 詞組與 BM25 檢索'
      ]);
      add(5, 'LLM 落地：H9 三關鍵', '現代 LLM 上線必配 H9：KV Cache 把生成加速至 O(T²)、Cross-Encoder 二階段精排救回排他條款、DPO 壓低幻覺！', [
        '對應實驗：H8 ReAct Agent · H9 KV Cache / Rerank / DPO'
      ]);
      add(5, '三條管線選用速查', '固定分類與關鍵字比對用 E1/E2/E5；近義詞語意泛化用 E3 詞向量；複雜問答與多步推理用 LLM＋RAG＋Agent（H1–H9）。', [
        '目前選擇：' + (R.isLLM ? '現代 LLM＋RAG' : R.isEmb ? 'Word2Vec 詞向量' : '傳統 TF-IDF')
      ]);
      add(5, '點擊編號直達實驗', '下方對照表的 E1–E5 與 H1–H9 編號皆可直接點擊開啟互動實驗，親眼看斷詞、Attention 與 RAG 檢索！', [
        '建議路線：E1 TF-IDF → E5 BM25 → H3 Attention → H6 RAG → H9 Rerank'
      ]);
      return steps;
    },
    inputs(rows, p) { return { dict: LAB.data.dict, stop: LAB.data.stop }; },
    keys(steps, rows, p) {
      const R = simulate(rows, p);
      return { n_docs: rows.length, n_toks: R.toks.length, n_clean_toks: R.cleanToks.length, sample_len: R.sample.length, is_llm: R.isLLM ? 1 : 0 };
    },
    explain(steps, rows, p) {
      return [
        'NLP 管線依技術演進分為「傳統 TF-IDF／BM25」、「Word2Vec 詞向量」與「現代 LLM＋RAG」三條路線。',
        '傳統路線對應 E1–E5（斷詞、TF-IDF、Naive Bayes、Word2Vec、LDA、N-gram/BM25）；現代路線對應 H1–H9（BPE、位置編碼、Attention、解碼、RAG、LoRA、Agent、KV Cache/Rerank/DPO）。',
        '實務建議先用 TF-IDF / BM25 建立快速基準，若需跨詞彙語意理解或生成問答再升級至 LLM＋RAG＋Reranker。'
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
