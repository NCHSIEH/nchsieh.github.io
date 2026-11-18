/* S3 非監督式學習標準流程（分群／異常偵測／降維壓縮 3 條管線＋可用演算法） */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = [
    { key: 'id', label: '#', type: 'int' },
    { key: 'bmi', label: 'BMI', type: 'num' },
    { key: 'glu', label: '血糖', type: 'num' },
    { key: 'cluster', label: '分群', type: 'int' }
  ];

  function makeRows(seed) {
    return LAB.data.clinic(seed, 8).map((o, i) => ({
      id: o.id, bmi: o.bmi, glu: o.glu, cluster: i % 3
    }));
  }

  function simulate(rows, p) {
    const goal = p.goal || 'cluster';
    const isAnom = goal === 'anomaly';
    const isDim = goal === 'dimred';
    const pcaVar = 0.84;
    const sils = [0.41, 0.56, 0.48, 0.39];
    return { goal, isAnom, isDim, pcaVar, sils, bestK: 3, topAnomaly: rows[rows.length - 1].id };
  }

  LAB.register({
    id: 'S3', group: 'S', title: '非監督式學習流程',
    module: { name: 'M3 非監督式學習', url: '../m3/' },
    goal: '透過全寬動畫流程圖對照「分群探索」、「異常偵測」與「高維降維壓縮」3 條無標籤管線，標註各步可用的 C1–C10 演算法。',
    data: {
      name: 'unsup_flow',
      scenario: '8 位無標籤門診病人，示範標準化 → 降維 → 分群／異常偵測 → 評估與臨床解讀流程',
      columns: COLS,
      small: makeRows
    },
    params: [
      { key: 'goal', label: '非監督管線', type: 'choice', value: 'cluster', options: [{ v: 'cluster', label: '病人分群 (找亞型)' }, { v: 'anomaly', label: '異常偵測 (抓極端)' }, { v: 'dimred', label: '降維視覺與壓縮 (PCA/t-SNE)' }] }
    ],
    pseudo: [
      '1. 載入無標籤特徵矩陣 X（沒有 y）',
      '2. 特徵標準化（距離計算前必做！）',
      '3. 降維探索（PCA / t-SNE）',
      '4. 依目標執行分群或異常偵測',
      '5. 用內部指標（Silhouette/LOF）評估',
      '6. 臨床特徵摘要命名或接續下游任務'
    ],
    build(rows, p) {
      const R = simulate(rows, p), steps = [];

      const ALGO_ROWS = [
        { id: 's0', st: '1. 無標籤資料 X', alg: '探索性統計 EDA', use: '沒有標準答案 y，先看各欄分布與共線性' },
        { id: 's1', st: '2. 必做標準化', alg: 'A2 Z 分數標準化', use: '距離與共變異數高度受尺度影響，必做！' },
        { id: 's2', st: '3. 降維與壓縮', alg: 'C5 PCA / C6 t-SNE', use: R.isDim ? '主軸保留最大變異，t-SNE 看局部鄰居' : '先壓到 2D 檢查是否有明顯群聚' },
        { id: 's3', st: '4. 核心探勘模型', alg: R.isAnom ? 'C7 LOF / C8 IF / F5 AE' : (R.isDim ? 'C5 挑前 K 個主成分' : 'C1 K-Means / C2 階層 / C3 DBSCAN / C4 GMM'), use: R.isAnom ? '密度比對或隨機切割找離群點' : (R.isDim ? '降維後可接 B 區分類器減少共線' : '球狀用 K-Means、不規則用 DBSCAN') },
        { id: 's4', st: '5. 內部評估解讀', alg: R.isAnom ? '分數排序＋專家複核' : (R.isDim ? '累積解釋變異 ≥ 80%' : 'C9 手肘法＋輪廓係數'), use: '將結果翻譯成臨床風險亞型或異常原因' }
      ];

      function views(st) {
        const done = k => st.stage > k;
        const act = k => st.stage === k;
        const clsOf = k => act(k) ? 'hl' : (done(k) ? 'good' : 'c5');
        const layers = R.isAnom ? [
          [{ id: 'x', label: '1. 無標籤 X', value: rows.length + ' 筆', shape: 'box', w: 145, cls: clsOf(0), hl: act(0), sub: '沒有答案 y' }],
          [{ id: 'scl', label: '2. 標準化', value: st.stage >= 1 ? 'Z 分數' : '待縮放', shape: 'box', w: 145, cls: clsOf(1), hl: act(1), sub: 'A2 防大尺主導' }],
          [
            { id: 'd1', label: '3a. LOF 密度', value: '局部稀疏', shape: 'box', w: 145, cls: clsOf(3), hl: act(3), sub: 'C7 鄰居密度比' },
            { id: 'd2', label: '3b. Isolation', value: '隨機孤立', shape: 'box', w: 145, cls: clsOf(3), hl: act(3), sub: 'C8 幾刀被切出' },
            { id: 'd3', label: '3c. Autoencoder', value: '重建誤差', shape: 'box', w: 145, cls: clsOf(3), hl: act(3), sub: 'F5 還原失敗度' }
          ],
          [{ id: 'rank', label: '4. 異常排序', value: 'Top #' + R.topAnomaly, shape: 'box', w: 145, cls: clsOf(4), hl: act(4), sub: '由高到低抽檢' }],
          [{ id: 'int', label: '5. 醫師複核', value: st.stage >= 4 ? '錯誤 vs 罕病' : '待確認', shape: 'box', w: 145, cls: clsOf(4), hl: act(4), sub: '不可盲目刪除' }]
        ] : R.isDim ? [
          [{ id: 'x', label: '1. 高維 X', value: '4+ 維特徵', shape: 'box', w: 145, cls: clsOf(0), hl: act(0), sub: '含共線性' }],
          [{ id: 'scl', label: '2. 標準化', value: 'Z 分數', shape: 'box', w: 145, cls: clsOf(1), hl: act(1), sub: 'A2 必做' }],
          [
            { id: 'dim', label: '3a. PCA 主成分', value: '84% 變異', shape: 'box', w: 148, cls: clsOf(2), hl: act(2), sub: 'C5 線性最大變異' },
            { id: 'tsn', label: '3b. t-SNE 流形', value: '局部鄰居', shape: 'box', w: 148, cls: clsOf(2), hl: act(2), sub: 'C6 非線性視覺化' }
          ],
          [
            { id: 'pc1', label: '4a. PC1 主軸', value: '最大變異', shape: 'box', w: 145, cls: clsOf(3), hl: act(3), sub: '保留 62%' },
            { id: 'pc2', label: '4b. PC2 正交軸', value: '次大變異', shape: 'box', w: 145, cls: clsOf(3), hl: act(3), sub: '保留 22%' }
          ],
          [{ id: 'int', label: '5. 視覺/下游', value: '去共線新特徵', shape: 'box', w: 145, cls: clsOf(4), hl: act(4), sub: '累積變異 ≥80%' }]
        ] : [
          [{ id: 'x', label: '1. 無標籤 X', value: rows.length + ' 筆', shape: 'box', w: 145, cls: clsOf(0), hl: act(0), sub: '沒有答案 y' }],
          [{ id: 'scl', label: '2. 標準化', value: st.stage >= 1 ? 'Z 分數' : '單位不同', shape: 'box', w: 145, cls: clsOf(1), hl: act(1), sub: 'A2 防大尺主導' }],
          [{ id: 'dim', label: '3. 降維探索', value: st.stage >= 2 ? '84% 變異' : '高維', shape: 'box', w: 145, cls: clsOf(2), hl: act(2), sub: 'C5 PCA · C6 t-SNE' }],
          [
            { id: 'c1', label: '群 1 亞型', value: '低風險', shape: 'box', w: 145, cls: clsOf(3), hl: act(3), sub: 'C1 K-Means / C3' },
            { id: 'c2', label: '群 2 亞型', value: '中風險', shape: 'box', w: 145, cls: clsOf(3), hl: act(3), sub: 'C2 階層 / C4 GMM' },
            { id: 'c3', label: '群 3 亞型', value: '高風險', shape: 'box', w: 145, cls: clsOf(3), hl: act(3), sub: 'C10 K-Medoids' }
          ],
          [{ id: 'int', label: '5. 評估命名', value: st.stage >= 4 ? 'Sil=0.56' : '待評估', shape: 'box', w: 145, cls: clsOf(4), hl: act(4), sub: 'C9 輪廓係數挑 K' }]
        ];
        const edges = R.isAnom ? [
          { from: 'x', to: 'scl', active: st.stage === 1, cls: done(0) ? 'good' : 'c5' },
          { from: 'scl', to: 'd1', active: st.stage === 3, cls: done(1) ? 'good' : 'c5' },
          { from: 'scl', to: 'd2', active: st.stage === 3, cls: done(1) ? 'good' : 'c5' },
          { from: 'scl', to: 'd3', active: st.stage === 3, cls: done(1) ? 'good' : 'c5' },
          { from: 'd1', to: 'rank', active: st.stage === 4, cls: done(3) ? 'good' : 'c5' },
          { from: 'd2', to: 'rank', active: st.stage === 4, cls: done(3) ? 'good' : 'c5' },
          { from: 'd3', to: 'rank', active: st.stage === 4, cls: done(3) ? 'good' : 'c5' },
          { from: 'rank', to: 'int', active: st.stage === 4 || st.stage === 5, cls: done(3) ? 'good' : 'c5' }
        ] : R.isDim ? [
          { from: 'x', to: 'scl', active: st.stage === 1, cls: done(0) ? 'good' : 'c5' },
          { from: 'scl', to: 'dim', active: st.stage === 2, cls: done(1) ? 'good' : 'c5' },
          { from: 'scl', to: 'tsn', active: st.stage === 2, cls: done(1) ? 'good' : 'c5' },
          { from: 'dim', to: 'pc1', active: st.stage === 3, cls: done(2) ? 'good' : 'c5' },
          { from: 'dim', to: 'pc2', active: st.stage === 3, cls: done(2) ? 'good' : 'c5' },
          { from: 'pc1', to: 'int', active: st.stage === 4, cls: done(3) ? 'good' : 'c5' },
          { from: 'pc2', to: 'int', active: st.stage === 4, cls: done(3) ? 'good' : 'c5' },
          { from: 'tsn', to: 'int', active: st.stage === 4, cls: done(2) ? 'good' : 'c5', label: '2D 散佈圖' }
        ] : [
          { from: 'x', to: 'scl', active: st.stage === 1, cls: done(0) ? 'good' : 'c5' },
          { from: 'scl', to: 'dim', active: st.stage === 2, cls: done(1) ? 'good' : 'c5' },
          { from: 'dim', to: 'c1', active: st.stage === 3, cls: done(2) ? 'good' : 'c5' },
          { from: 'dim', to: 'c2', active: st.stage === 3, cls: done(2) ? 'good' : 'c5' },
          { from: 'dim', to: 'c3', active: st.stage === 3, cls: done(2) ? 'good' : 'c5' },
          { from: 'c1', to: 'int', active: st.stage === 4, cls: done(3) ? 'good' : 'c5' },
          { from: 'c2', to: 'int', active: st.stage === 4, cls: done(3) ? 'good' : 'c5' },
          { from: 'c3', to: 'int', active: st.stage === 4, cls: done(3) ? 'good' : 'c5' }
        ];
        const main = {
          type: 'network', slot: 'main', w: 1480, h: R.isDim ? 230 : 250,
          title: '非監督式學習全流程圖（' + (R.isAnom ? '異常偵測路徑' : R.isDim ? '降維壓縮路徑' : '分群探索路徑') + '）',
          layerLabels: R.isAnom
            ? ['1. 無標籤', '2. 標準化', '3. 異常偵測演算法', '4. 分數排序', '5. 專家複核']
            : R.isDim
              ? ['1. 高維資料', '2. 標準化', '3. 特徵分解', '4. 主軸萃取', '5. 視覺/下游']
              : ['1. 無標籤', '2. 標準化', '3. 降維探索', '4. 分群演算法', '5. 評估命名'],
          layers, edges
        };
        const side = {
          type: 'table', slot: 'side',
          title: '病人特徵與探勘結果',
          cols: [{ key: 'id', label: '#' }, { key: 'bmi', label: 'BMI', num: true, digits: 1 }, { key: 'glu', label: '血糖', num: true, digits: 0 }, { key: 'res', label: R.isAnom ? '異常判定' : (R.isDim ? 'PC1/PC2' : '亞型群組') }],
          rows: rows.map((r, i) => ({
            id: r.id,
            cells: [
              r.id, r.bmi, r.glu,
              st.stage >= 3 ? (R.isAnom ? (r.id === R.topAnomaly ? { v: '異常', cls: 'bad' } : { v: '正常', cls: 'good' }) : (R.isDim ? { v: '已投影', cls: 'c2' } : { v: '群 ' + (i % 3 + 1), cls: 'c' + (i % 3) })) : null
            ],
            hl: st.stage >= 3 && R.isAnom && r.id === R.topAnomaly
          }))
        };
        const bottom = {
          type: 'table', slot: 'bottom',
          title: '步驟與可用演算法對照（' + (R.isAnom ? '異常偵測管線' : R.isDim ? '降維壓縮管線' : '病人分群管線') + '）',
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

      add(0, '1. 載入無標籤資料 X', '非監督式學習沒有標準答案 y，目標是找出「病人亞型分群」、「異常極端個案」或「低維主軸結構」。', [
        '病人數 = ' + rows.length + '，沒有目標標籤 y'
      ]);
      st.stage = 1;
      add(1, '2. 必做特徵標準化 (A2)', '幾乎所有非監督演算法都算歐氏距離或共變異數，不標準化會讓血糖完全壓過 BMI。', [
        '轉為平均 0、標準差 1 的 Z 分數（A2）'
      ]);
      st.stage = 2;
      add(2, '3. 降維探索 (C5/C6)', '用 PCA（C5，保留線性最大變異）或 t-SNE（C6，保留局部鄰居關係）把高維資料壓到 2D 檢查結構。', [
        '前兩個主成分保留變異 = ' + LAB.pct(R.pcaVar, 0)
      ]);
      st.stage = 3;
      add(3, R.isAnom ? '4. 異常偵測 (C7/C8)' : R.isDim ? '4. 挑選主成分維度' : '4. 分群演算法 (C1–C4)', R.isAnom ? '局部密度稀疏用 LOF（C7）、隨機切割孤立用 Isolation Forest（C8）、重建誤差用 Autoencoder（F5）。' : R.isDim ? '依累積解釋變異（如 ≥ 80%）決定保留前 K 個主成分，可再送入下游模型訓練。' : '球狀群用 K-Means（C1/C10）、要層次看樹狀圖用階層（C2）、任意形狀用 DBSCAN（C3）、軟機率用 GMM（C4）。', [
        R.isAnom ? '標出最異常候選 #' + R.topAnomaly : (R.isDim ? '保留 2 維主成分（84% 變異）' : '分出 3 個潛在病人亞型')
      ]);
      st.stage = 4;
      add(4, '5. 內部指標評估 (C9)', R.isAnom ? '依異常分數由高到低排序抽檢，交給臨床專家判斷是輸入錯誤還是罕見病例。' : R.isDim ? '注意：PCA 主成分是線性組合，能壓縮去共線但較難對病人直接解釋單一欄位。' : '用 C9 手肘法（SSE）與輪廓係數（Silhouette）選出最佳群數 K=3。', [
        R.isAnom ? '異常點不可盲目刪除，須查明來源' : (R.isDim ? '累積解釋變異 = 84%' : 'K = 3 輪廓係數 = 0.56（最高）')
      ]);
      st.stage = 5;
      add(5, '6. 臨床命名與落地', '回頭比較各群的平均年齡、BMI、血糖，將群組編號命名為有臨床意義的風險族群！', [
        '常作為精準衛教分眾或下游特徵工程的起點'
      ]);
      while (steps.length < 10) {
        add(5, '演算法挑選總結', '有離群值干擾用 K-Medoids (C10) 或 DBSCAN (C3)；想知道「多像某群」用 GMM 軟分群 (C4)。', [
          '目前管線：' + (R.isAnom ? '異常偵測' : R.isDim ? '降維壓縮' : '病人分群')
        ]);
      }
      return steps;
    },
    keys(steps, rows, p) {
      const R = simulate(rows, p);
      return {
        pca_var: R.pcaVar, best_k: R.bestK, best_sil: R.sils[1],
        n_rows: rows.length, mean_bmi: M.mean(rows.map(r => r.bmi)), mean_glu: M.mean(rows.map(r => r.glu))
      };
    },
    explain(steps, rows, p) {
      return [
        '非監督式學習依目標分為「病人分群」、「異常偵測」與「降維壓縮」三條管線，共同前置條件都是標準化（A2）。',
        '分群可用 C1 K-Means、C2 階層、C3 DBSCAN、C4 GMM、C10 K-Medoids，並用 C9 輪廓係數挑 K。',
        '異常偵測可用 C7 LOF、C8 Isolation Forest 或 F5 Autoencoder，找出異常後須人工複核原因。'
      ];
    },
    aistudio: {
      operators: ['Read CSV', 'Normalize', 'PCA', 'k-Means', 'Cluster Distance Performance'],
      params: [['Normalize', 'Z-transformation'], ['k-Means › k', '3']],
      note: 'AI Studio 的 Cluster Distance Performance 可計算群內平均距離協助挑選群數 K。',
      expect: () => ['前 2 主成分約保留 84% 變異；K=3 輪廓係數最佳'],
      python: 'from sklearn.preprocessing import StandardScaler\nfrom sklearn.decomposition import PCA\nfrom sklearn.cluster import KMeans',
      confirmed: false
    }
  });
})();
