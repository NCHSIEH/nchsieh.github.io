/* H9 KV Cache 快取加速與 Cross-Encoder 重排序 */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = [
    { key: 'step', label: '生成步 t', type: 'int' },
    { key: 'tok', label: '當前Token', type: 'text' },
    { key: 'no_cache_ops', label: '無快取內積數', type: 'int' },
    { key: 'kv_cache_ops', label: 'KV快取內積數', type: 'int' }
  ];
  const SEQ_TOKS = ['病', '人', '夜', '間', '頭', '暈', '應', '防', '跌', '倒'];

  const RERANK_DOCS = [
    { id: 'C1', text: '家中若有外籍看護工，仍可申請專業服務與輔具補助。', biSim: 0.82, crossLogit: 1.85, tag: '部分相關' },
    { id: 'C2', text: '外籍看護工家庭不可重複申請居家照顧及日間照顧服務。', biSim: 0.76, crossLogit: 3.10, tag: '關鍵排他條款' },
    { id: 'C3', text: '申請外籍看護需經醫療機構巴氏量表評估或符合特定長照等級。', biSim: 0.85, crossLogit: -0.60, tag: '字面重疊但非所問' },
    { id: 'C4', text: '長照 3.0 輔具購買每三年最高補助四萬元。', biSim: 0.71, crossLogit: 1.40, tag: '補充資訊' }
  ];

  function makeRows() {
    return SEQ_TOKS.slice(0, 8).map((tok, idx) => {
      const t = idx + 1;
      return {
        id: t,
        step: t,
        tok,
        no_cache_ops: t * t,
        kv_cache_ops: t
      };
    });
  }

  function runOptLLM(rows, p) {
    const seqLen = Math.max(4, Math.min(10, Math.round(p.seq_len || 8)));
    const beta = p.dpo_beta || 0.5;

    const stepsData = M.range(seqLen, idx => {
      const t = idx + 1;
      const noCache = t * t;
      const kvCache = t;
      return {
        t,
        tok: SEQ_TOKS[idx],
        noCache,
        kvCache
      };
    });

    // 累積到第 t 步的總內積運算量
    let accNo = 0, accKv = 0;
    stepsData.forEach(s => {
      accNo += s.noCache;
      accKv += s.kvCache;
      s.cumNo = accNo;
      s.cumKv = accKv;
    });

    const speedup = accNo / Math.max(1, accKv);

    // Cross-Encoder Reranking
    const reranked = RERANK_DOCS.map(d => ({
      id: d.id,
      text: d.text,
      tag: d.tag,
      biSim: d.biSim,
      crossScore: M.sigmoid(d.crossLogit)
    }));
    const biOrder = reranked.slice().sort((a, b) => b.biSim - a.biSim);
    const crossOrder = reranked.slice().sort((a, b) => b.crossScore - a.crossScore);

    // DPO / RLHF 偏好對齊分數：L_DPO = -ln sigmoid(beta * (delta_win - delta_lose))
    const logRatioWin = 1.8;  // ln(pi_theta(y_w|x) / pi_ref(y_w|x))
    const logRatioLose = -1.4; // ln(pi_theta(y_l|x) / pi_ref(y_l|x))
    const dpoMargin = beta * (logRatioWin - logRatioLose);
    const dpoPrefProb = M.sigmoid(dpoMargin);
    const dpoLoss = -Math.log(Math.max(1e-12, dpoPrefProb));

    return {
      seqLen, beta, stepsData, accNo, accKv, speedup,
      reranked, biOrder, crossOrder,
      logRatioWin, logRatioLose, dpoMargin, dpoPrefProb, dpoLoss
    };
  }

  LAB.register({
    id: 'H9', group: 'H', title: 'KV 快取、Rerank 與偏好對齊',
    module: { name: 'M7 第 09 節', url: '../m7/#p09' },
    goal: '看懂現代 LLM 上線必備三大工程關鍵：KV Cache 如何將自回歸生成複雜度從 O(T³) 降為 O(T²)、Cross-Encoder Reranker 如何精準重排 RAG 段落，以及 DPO 偏好對齊如何拉開安全回答與幻覺回答的機率差距。',
    data: {
      name: 'llm_opt',
      scenario: '逐字生成 8–10 個 Token 的注意力運算量對照表，結合 RAG 重排序與 DPO 臨床偏好對齊',
      columns: COLS,
      small: makeRows
    },
    params: [
      { key: 'seq_len', label: '生成長度 T', type: 'int', min: 4, max: 10, step: 2, value: 8 },
      { key: 'dpo_beta', label: 'DPO 溫度 β', type: 'num', min: 0.1, max: 1.0, step: 0.1, value: 0.5 }
    ],
    pseudo: [
      '生成第 t 詞時檢查歷史 K, V',
      '無快取：每步重算 t×t 矩陣 O(T³)',
      'KV Cache：快取歷史只算新列 O(T²)',
      'RAG：Bi-Encoder 粗篩→Cross 精排',
      'DPO 對齊：拉開優選 y_w 與劣選 y_l',
      '計算隱式獎勵差與 DPO 損失'
    ],
    build(rows, p) {
      const R = runOptLLM(rows, p), steps = [];

      function views(st) {
        const main = {
          type: 'line', slot: 'main',
          title: '自回歸生成累積注意力運算量（無快取 O(T³) vs KV Cache O(T²)，加速 ' + f(R.speedup, 2) + ' 倍）',
          axes: { x: { label: '生成步數 t (Tokens)', min: 1, max: R.seqLen }, y: { label: '累積 Q·K 內積次數', min: 0, max: Math.ceil(R.accNo * 1.1) } },
          series: [
            { id: 'nc', label: '無快取 (每步重算 t²)', pts: R.stepsData.slice(0, st.tUpto).map(s => [s.t, s.cumNo]), cls: 'c4', dash: true, dots: true },
            { id: 'kv', label: 'KV Cache (只算新詞 t)', pts: R.stepsData.slice(0, st.tUpto).map(s => [s.t, s.cumKv]), cls: 'good', dots: true }
          ]
        };

        const side = {
          type: 'table', slot: 'side',
          title: st.mode === 'rerank' ? 'RAG 兩階段重排序（Bi-Encoder vs Cross-Encoder）' : '各步注意力計算量對照',
          cols: st.mode === 'rerank' ? [
            { key: 'id', label: '#' },
            { key: 'tag', label: '段落性質' },
            { key: 'bi', label: '初篩向量', num: true, digits: 2 },
            { key: 'ce', label: 'Cross精排', num: true, digits: 2 }
          ] : [
            { key: 't', label: '步 t', num: true, digits: 0 },
            { key: 'tk', label: '生成詞' },
            { key: 'nc', label: '無快取(t²)', num: true, digits: 0 },
            { key: 'kv', label: 'KV快取(t)', num: true, digits: 0 }
          ],
          rows: st.mode === 'rerank'
            ? R.crossOrder.map((d, idx) => ({
                id: d.id,
                cells: [d.id, d.tag, d.biSim, { v: f(d.crossScore, 2), cls: idx < 2 ? 'good' : 'bad' }],
                hl: idx === 0
              }))
            : R.stepsData.map(s => ({
                id: 's' + s.t,
                cells: [s.t, s.tok, { v: String(s.noCache), cls: 'bad' }, { v: String(s.kvCache), cls: 'good' }],
                hl: s.t === st.tUpto
              }))
        };

        const bottom = st.mode === 'dpo' ? {
          type: 'bars', slot: 'bottom',
          title: 'DPO 臨床偏好對齊（β = ' + f(R.beta, 1) + '，正確回答勝出機率 = ' + LAB.pct(R.dpoPrefProb, 1) + '）',
          max: 1, digits: 3,
          items: [
            { id: 'yw', label: '优选回答 y_w（謹慎附排他條款）勝率', value: R.dpoPrefProb, cls: 'good', hl: true },
            { id: 'yl', label: '劣選回答 y_l（漏看禁忌症幻覺）殘餘率', value: 1 - R.dpoPrefProb, cls: 'bad' },
            { id: 'loss', label: 'DPO 損失 −ln σ(β·Δ)', value: Math.min(1, R.dpoLoss), cls: 'c0' }
          ]
        } : {
          type: 'bars', slot: 'bottom',
          title: st.mode === 'rerank'
            ? 'Cross-Encoder 交叉注意力精排分數（把真正回答問題的 C2 排他條款拉上第 1 名）'
            : '生成 T=' + R.seqLen + ' 詞的總運算次數比較',
          max: st.mode === 'rerank' ? 1 : R.accNo * 1.1,
          digits: st.mode === 'rerank' ? 2 : 0,
          items: st.mode === 'rerank'
            ? R.crossOrder.map(d => ({
                id: 'r_' + d.id, label: d.id + ' ' + d.tag, value: d.crossScore,
                cls: d.id === 'C2' ? 'good' : (d.id === 'C3' ? 'bad' : 'c0'),
                hl: d.id === 'C2'
              }))
            : [
                { id: 'tot_no', label: '無快取總內積數 Σt²', value: R.accNo, cls: 'bad' },
                { id: 'tot_kv', label: 'KV Cache 總內積數 Σt', value: R.accKv, cls: 'good', hl: true }
              ]
        };

        return [main, side, bottom];
      }

      const st = { tUpto: 1, mode: 'kv' };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '自回歸重複計算問題', 'LLM 是一個字一個字生成的。當生成第 t 個字時，因為有因果遮罩（H3），前 t−1 個字的 Key 與 Value 其實完全沒有改變！', [
        '目標生成長度 T = ' + R.seqLen + ' 個 Token'
      ]);

      st.tUpto = Math.min(4, R.seqLen);
      add(1, '無快取：每步重算 t×t', '如果不存快取，生成第 4 個字時要把前 4 個字全部重算一遍 4×4=16 次內積；越往後呈平方暴增！', [
        '第 4 步：無快取需算 4² = 16 次內積，KV Cache 只需算 4 次'
      ]);

      st.tUpto = R.seqLen;
      add(2, 'KV Cache 記憶體加速', '把已算過的 K₁..t₋₁ 與 V₁..t₋₁ 存在 GPU 顯存（KV Cache），每步只需拿最新詞的 qₜ 與快取做 t 次內積！', [
        '生成 ' + R.seqLen + ' 詞總內積：無快取 = ' + R.accNo + ' 次 vs KV Cache = ' + R.accKv + ' 次',
        '運算量縮減為 1 / ' + f(R.speedup, 2) + '（當 T=2048 時可快上千倍！）'
      ]);

      st.mode = 'rerank';
      add(3, 'RAG 雙編碼器盲點', '在 H6 RAG 中，向量檢索（Bi-Encoder）把問題與段落分開壓成單一向量：C3 因為字面多次出現「申請外籍看護」拿到最高分 0.85，卻沒回答「能否申請居服」！', [
        '初篩向量第 1 名：C3 (0.85，答非所問)｜關鍵排他條款 C2 僅排第 3 (0.76)'
      ]);

      add(3, 'Cross-Encoder 精排', '第二階段 Reranker 把「[問題 + 段落]」拼在一起送進 Transformer 做全詞交叉注意力，識破 C3 文不對題（降至 0.35），並把關鍵排他條款 C2 推上第 1 名（0.96）！', [
        'Cross-Encoder 精排後：#1 C2 (0.96) + #2 C1 (0.86) → 完美涵蓋正面與排他規定'
      ]);

      add(3, '為何分兩階段檢索', 'Cross-Encoder 雖準，但面對 10 萬篇病歷每篇都要跟問題重跑一次 Transformer 太慢；因此實務必採「Bi-Encoder 粗篩 Top-50 → Cross-Encoder 精排 Top-3」。', [
        '兩階段架構兼顧毫秒級檢索速度與高精準度'
      ]);

      st.mode = 'dpo';
      add(4, '臨床偏好對齊需求', '即使微調（H7 LoRA）並掛上 RAG，模型有時仍會忽略排他條款給出危險建議 y_l。我們需要用人類／醫師偏好對（y_w 優於 y_l）進行對齊！', [
        '優選回答 y_w：明確告知有外籍看護可申請輔具、但不可重複申請居服',
        '劣選回答 y_l：籠統回答皆可申請（醫療法規幻覺）'
      ]);

      add(5, 'DPO 直接偏好最佳化', '傳統 RLHF 需先訓練獎勵模型再用強化學習 PPO；DPO 直接把模型本身當獎勵函數，最大化 σ(β · [Δln π(y_w) − Δln π(y_l)])！', [
        '溫度 β = ' + f(R.beta, 1) + '｜對數機率比差距 Δ = ' + f(R.logRatioWin - R.logRatioLose, 2),
        '優選回答勝出機率 = ' + LAB.pct(R.dpoPrefProb, 1) + '，DPO Loss = ' + f(R.dpoLoss, 3)
      ]);

      add(5, '參數 β 對齊強度', 'β 控制對齊力道：β 太小模型改動微弱；β 太大雖然強制拉開 y_w 與 y_l，但可能偏離原參考模型 π_ref 導致語句退化。', [
        '目前 β = ' + f(R.beta, 1) + '，隱式獎勵邊界 Margin = ' + f(R.dpoMargin, 2)
      ]);

      add(5, '現代 LLM 落地總結', '結合 H1–H4 架構、H5 解碼、H6 RAG + H9 Reranker、H7 LoRA + H9 DPO 對齊，以及 H9 KV Cache 加速與 H8 Agent，即構成完整的現代醫療級生成式 AI 系統。', [
        'KV 加速比 = ' + f(R.speedup, 2) + 'x｜Rerank 榜首 = C2｜DPO 勝率 = ' + LAB.pct(R.dpoPrefProb, 1)
      ]);

      return steps;
    },

    keys(steps, rows, p) {
      const R = runOptLLM(rows, p);
      return {
        acc_no_cache: R.accNo,
        acc_kv_cache: R.accKv,
        speedup: R.speedup,
        ce_c2: R.reranked[1].crossScore,
        ce_c3: R.reranked[2].crossScore,
        dpo_prob: R.dpoPrefProb,
        dpo_loss: R.dpoLoss
      };
    },

    explain(steps, rows, p) {
      const R = runOptLLM(rows, p);
      return [
        '在生成長度 T = ' + R.seqLen + ' 時，無快取累積需做 ' + R.accNo + ' 次 Q·K 內積，而啟用 KV Cache 僅需 ' + R.accKv + ' 次（加速 ' + f(R.speedup, 2) + ' 倍），將時間複雜度由 O(T³) 降至 O(T²)。',
        'RAG 兩階段檢索透過 Cross-Encoder 交叉注意力精排，將原本被雙編碼器低估的關鍵排他條款 C2 分數提升至 ' + f(R.reranked[1].crossScore, 2) + ' 並排上第 1 名。',
        'DPO（Direct Preference Optimization）在 β = ' + f(R.beta, 1) + ' 下將臨床正確回答相對於幻覺回答的勝出機率拉升至 ' + LAB.pct(R.dpoPrefProb, 1) + '（Loss = ' + f(R.dpoLoss, 3) + '）。'
      ];
    },

    aistudio: {
      operators: ['Execute Python', 'Cross-Encoder Reranker', 'DPO Trainer'],
      params: [
        ['use_cache (KV Cache)', 'True'],
        ['DPOTrainer › beta', p => String(p.dpo_beta)]
      ],
      note: 'HuggingFace Transformers 預設開啟 use_cache=True 啟用 KV Cache；RAG 重排序可使用 sentence-transformers 的 CrossEncoder，偏好對齊則使用 trl.DPOTrainer。',
      expect: (steps, rows, p) => {
        const R = runOptLLM(rows, p);
        return ['KV Cache 運算加速 ' + f(R.speedup, 2) + ' 倍，DPO 偏好勝率 ' + LAB.pct(R.dpoPrefProb, 1)];
      },
      python: 'from sentence_transformers import CrossEncoder\nfrom trl import DPOTrainer\nreranker = CrossEncoder("BAAI/bge-reranker-base")\nscores = reranker.predict([[query, doc] for doc in docs])',
      confirmed: false
    }
  });
})();
