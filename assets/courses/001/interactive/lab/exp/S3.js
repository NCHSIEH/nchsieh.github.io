/* S3 非監督式學習標準流程 */
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
    const isAnom = p.goal === 'anomaly';
    const pcaVar = 0.84;
    const sils = [0.41, 0.56, 0.48, 0.39];
    return { isAnom, pcaVar, sils, bestK: 3, topAnomaly: rows[rows.length - 1].id };
  }

  LAB.register({
    id: 'S3', group: 'S', title: '非監督式學習流程',
    module: { name: 'M3 非監督式學習', url: '../m3/' },
    goal: '透過動畫看懂在沒有標準答案 y 的情況下，如何從必做的特徵標準化出發，進行降維視覺化、分群或異常偵測，並用內部指標評估。',
    data: {
      name: 'unsup_flow',
      scenario: '8 位無標籤門診病人，示範標準化 → PCA 降維 → 分群／異常偵測 → 臨床解讀流程',
      columns: COLS,
      small: makeRows
    },
    params: [
      { key: 'goal', label: '分析目標', type: 'choice', value: 'cluster', options: [{ v: 'cluster', label: '病人分群 (找亞型)' }, { v: 'anomaly', label: '異常偵測 (抓極端)' }] }
    ],
    pseudo: [
      '1. 載入無標籤特徵矩陣 X（沒有 y）',
      '2. 特徵標準化（距離計算前必做！）',
      '3. 降維（PCA / t-SNE）探索高維結構',
      '4. 執行分群或異常偵測演算法',
      '5. 用內部指標（Silhouette/LOF）評估',
      '6. 檢視各群特徵統計做臨床命名'
    ],
    build(rows, p) {
      const R = simulate(rows, p), steps = [];

      function views(st) {
        const done = k => st.stage > k;
        const act = k => st.stage === k;
        const clsOf = k => act(k) ? 'hl' : (done(k) ? 'good' : 'c5');
        const layers = [
          [{ id: 'x', label: '1. 無標籤資料 X', value: rows.length + ' 筆', shape: 'box', cls: clsOf(0), hl: act(0), sub: '沒有答案 y' }],
          [{ id: 'scl', label: '2. 必做標準化', value: st.stage >= 1 ? 'Z 分數' : '單位不同', shape: 'box', cls: clsOf(1), hl: act(1), sub: 'A2 防大尺主導' }],
          [{ id: 'dim', label: '3. 降維視覺化', value: st.stage >= 2 ? '保留 84% 變異' : '高維難看', shape: 'box', cls: clsOf(2), hl: act(2), sub: 'C5 PCA / C6 t-SNE' }],
          [
            { id: 'clu', label: '4a. 分群探勘', value: R.isAnom ? '略過' : 'K=3 亞型', shape: 'box', cls: R.isAnom ? 'c5' : clsOf(3), hl: !R.isAnom && act(3), dim: R.isAnom, sub: 'C1 / C2 / C3' },
            { id: 'ano', label: '4b. 異常偵測', value: R.isAnom ? '抓離群點' : '略過', shape: 'box', cls: !R.isAnom ? 'c5' : clsOf(3), hl: R.isAnom && act(3), dim: !R.isAnom, sub: 'C7 LOF / C8 IF' }
          ],
          [{ id: 'int', label: '5. 內部評估與解讀', value: st.stage >= 4 ? (R.isAnom ? '複核 #' + R.topAnomaly : 'Sil=0.56') : '待評估', shape: 'box', cls: clsOf(4), hl: act(4), sub: 'C9 輪廓係數' }]
        ];
        const edges = [
          { from: 'x', to: 'scl', active: st.stage === 1, cls: done(0) ? 'good' : 'c5' },
          { from: 'scl', to: 'dim', active: st.stage === 2, cls: done(1) ? 'good' : 'c5' },
          { from: 'dim', to: 'clu', active: st.stage === 3 && !R.isAnom, dim: R.isAnom, cls: done(2) && !R.isAnom ? 'good' : 'c5' },
          { from: 'dim', to: 'ano', active: st.stage === 3 && R.isAnom, dim: !R.isAnom, cls: done(2) && R.isAnom ? 'good' : 'c5' },
          { from: 'clu', to: 'int', active: st.stage === 4 && !R.isAnom, dim: R.isAnom, cls: done(3) && !R.isAnom ? 'good' : 'c5' },
          { from: 'ano', to: 'int', active: st.stage === 4 && R.isAnom, dim: !R.isAnom, cls: done(3) && R.isAnom ? 'good' : 'c5' }
        ];
        const main = {
          type: 'network', slot: 'main',
          title: '非監督式學習標準流程（' + (R.isAnom ? '異常偵測路徑' : '分群探索路徑') + '）',
          layerLabels: ['輸入', '標準化', '降維', '探勘模型', '評估解讀'],
          layers, edges
        };
        const side = {
          type: 'table', slot: 'side',
          title: '病人特徵與探勘結果',
          cols: [{ key: 'id', label: '#' }, { key: 'bmi', label: 'BMI', num: true, digits: 1 }, { key: 'glu', label: '血糖', num: true, digits: 0 }, { key: 'res', label: R.isAnom ? '異常判定' : '亞型群組' }],
          rows: rows.map((r, i) => ({
            id: r.id,
            cells: [
              r.id, r.bmi, r.glu,
              st.stage >= 3 ? (R.isAnom ? (r.id === R.topAnomaly ? { v: '異常', cls: 'bad' } : { v: '正常', cls: 'good' }) : { v: '群 ' + (i % 3 + 1), cls: 'c' + (i % 3) }) : null
            ],
            hl: st.stage >= 3 && R.isAnom && r.id === R.topAnomaly
          }))
        };
        const bottom = {
          type: 'bars', slot: 'bottom',
          title: R.isAnom ? '各階段完成度' : 'K = 2..5 輪廓係數 (Silhouette) 比較',
          max: R.isAnom ? 100 : 1, digits: R.isAnom ? 0 : 2,
          items: R.isAnom
            ? [
                { id: 's1', label: '標準化', value: st.stage >= 1 ? 100 : 0, cls: 'c0' },
                { id: 's2', label: '降維檢查', value: st.stage >= 2 ? 100 : 0, cls: 'c2' },
                { id: 's3', label: '異常評分', value: st.stage >= 3 ? 100 : 0, cls: 'c1' },
                { id: 's4', label: '人工複核', value: st.stage >= 4 ? 100 : 0, cls: 'good' }
              ]
            : [2, 3, 4, 5].map((k, idx) => ({
                id: 'k' + k, label: 'K = ' + k, value: st.stage >= 4 ? R.sils[idx] : 0,
                cls: k === R.bestK ? 'good' : 'c0', hl: st.stage >= 4 && k === R.bestK
              }))
        };
        return [main, side, bottom];
      }

      const st = { stage: 0 };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '1. 載入無標籤資料 X', '非監督式學習沒有標準答案 y，目標是從資料本身的結構找出「隱藏群聚」或「不合群的異常點」。', [
        '病人數 = ' + rows.length + '，欄位 = BMI、空腹血糖'
      ]);
      st.stage = 1;
      add(1, '2. 必做特徵標準化', '分群與降維高度依賴距離與變異數。若不先標準化，血糖（60–200）會完全壓過 BMI（18–35）。', [
        '轉為平均 0、標準差 1 的 Z 分數（A2）'
      ]);
      st.stage = 2;
      add(2, '3. 降維與結構探索', '特徵很多時先做 PCA（線性保留最大變異）或 t-SNE（非線性看局部鄰居），把資料畫到 2D 平面檢查。', [
        '前兩個主成分保留變異 = ' + LAB.pct(R.pcaVar, 0)
      ]);
      st.stage = 3;
      add(3, R.isAnom ? '4. 異常偵測評分' : '4. 分群演算法探勘', R.isAnom ? '用 LOF（比較局部密度）或 Isolation Forest（隨機切割孤立深度）給每位病人異常分數。' : '依資料形狀選模型：球狀用 K-Means、不規則密度用 DBSCAN、要層次看樹狀圖用階層分群。', [
        R.isAnom ? '標出最異常候選 #' + R.topAnomaly : '分出 3 個潛在病人亞型'
      ]);
      st.stage = 4;
      add(4, '5. 內部指標評估', R.isAnom ? '沒有標籤時，常依分數排序抽檢前幾名，交給醫師或領域專家確認是「量測錯誤」還是「罕見病例」。' : '沒有標準答案可用準確率，改看組內緊密、組間分離的「輪廓係數 (Silhouette)」，找出 K=3 最高。', [
        R.isAnom ? '異常點不可盲目刪除，須先查明原因' : 'K = 3 輪廓係數 = 0.56（最高）'
      ]);
      st.stage = 5;
      add(5, '6. 臨床命名與應用', '回頭統計各群的平均年齡、BMI、血糖，把「群 1/2/3」翻譯成有意義的風險族群標籤！', [
        '非監督分群常作為後續精準衛教或特徵工程的起點'
      ]);
      while (steps.length < 10) {
        add(5, '降維≠特徵選擇', 'PCA 產生的主成分是原特徵的線性組合，能壓縮維度但較難直接向病人解釋單一指標。', [
          '需要可解釋性時選「特徵選擇 A6」；只需壓縮選 PCA'
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
        '非監督式學習沒有標籤 y，因此「標準化」幾乎是第一步的鐵律，否則數值大的欄位會主導所有距離與共變異數。',
        '實務上常先用 PCA 或 t-SNE 降維觀察資料是否有明顯群聚或離群點，再決定要用 K-Means、DBSCAN 還是異常偵測。',
        '結果好壞沒有標準答案可對，必須結合內部指標（輪廓係數、SSE）與臨床領域知識一起解讀。'
      ];
    },
    aistudio: {
      operators: ['Read CSV', 'Normalize', 'PCA', 'k-Means', 'Cluster Distance Performance'],
      params: [['Normalize', 'Z-transformation'], ['k-Means › k', '3']],
      note: 'AI Studio 的 Cluster Distance Performance 可計算群內平均距離（Davies–Bouldin 指數）來協助挑選最佳群數 K。',
      expect: () => ['前 2 主成分約保留 84% 變異；K=3 輪廓係數最佳'],
      python: 'from sklearn.preprocessing import StandardScaler\nfrom sklearn.decomposition import PCA\nfrom sklearn.cluster import KMeans',
      confirmed: false
    }
  });
})();
