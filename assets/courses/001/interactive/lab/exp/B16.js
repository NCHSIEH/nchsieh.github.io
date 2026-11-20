/* B16 ROC / PR 曲線與門檻 */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = [
    { key: 'prob', label: '預測機率 p', type: 'num', min: 0.01, max: 0.99, step: 0.01, role: 'x' },
    { key: 'y', label: '實際結果', type: 'cat', levels: ['否', '是'], codes: ['no', 'yes'], role: 'y' }
  ];

  function makeRows(seed) {
    const r = LAB.rng(2600 + seed);
    const baseProbs = [0.94, 0.87, 0.78, 0.68, 0.59, 0.52, 0.44, 0.36, 0.27, 0.19, 0.12, 0.06];
    const baseY =     [   1,    1,    0,    1,    1,    0,    1,    0,    0,    0,    0,    0];
    return baseProbs.map((p, i) => ({
      id: i + 1,
      prob: Math.round(M.clamp(p + (r() - 0.5) * 0.04, 0.02, 0.98) * 100) / 100,
      y: baseY[i]
    }));
  }

  function evalAt(rows, th) {
    let tp = 0, fp = 0, tn = 0, fn = 0;
    rows.forEach(r => {
      const pred = r.prob >= th ? 1 : 0;
      if (pred === 1 && r.y === 1) tp++;
      else if (pred === 1 && r.y === 0) fp++;
      else if (pred === 0 && r.y === 0) tn++;
      else fn++;
    });
    const pos = tp + fn, neg = tn + fp;
    const tpr = pos ? tp / pos : 0;
    const fpr = neg ? fp / neg : 0;
    const prec = (tp + fp) ? tp / (tp + fp) : 1;
    const f1 = (2 * tp + fp + fn) ? (2 * tp) / (2 * tp + fp + fn) : 0;
    return { th, tp, fp, tn, fn, tpr, fpr, prec, rec: tpr, f1 };
  }

  function buildCurves(rows, p) {
    const sorted = rows.slice().sort((a, b) => b.prob - a.prob);
    const ths = [1.01].concat(Array.from(new Set(sorted.map(r => r.prob))).sort((a, b) => b - a)).concat([0.0]);
    const pts = ths.map(th => evalAt(rows, th));

    // ROC-AUC（梯形法則）
    const rocPts = pts.map(x => [x.fpr, x.tpr]);
    let rocAuc = 0;
    for (let i = 1; i < rocPts.length; i++) {
      rocAuc += (rocPts[i][0] - rocPts[i - 1][0]) * (rocPts[i][1] + rocPts[i - 1][1]) / 2;
    }

    // PR-AUC（步階平均精確率 AP / 梯形）
    const prPts = pts.slice(1).map(x => [x.rec, x.prec]);
    let prAuc = 0;
    for (let i = 1; i < prPts.length; i++) {
      prAuc += (prPts[i][0] - prPts[i - 1][0]) * (prPts[i][1] + prPts[i - 1][1]) / 2;
    }

    const cur = evalAt(rows, p.threshold || 0.5);
    return { sorted, pts, rocPts, prPts, rocAuc, prAuc, cur };
  }

  LAB.register({
    id: 'B16', group: 'B', title: 'ROC 與 PR 曲線',
    module: { name: 'M2-2 第 10 節', url: '../m2-2/#p10' },
    goal: '把分類門檻從 1.0 逐步放寬到 0.0，追蹤每跨過一位病人時真陽性率 (TPR)、偽陽性率 (FPR) 與精確率 (Precision) 如何移動，並比較 ROC-AUC 與 PR-AUC。',
    data: {
      name: 'clinic_roc',
      scenario: '門診模型輸出：12 位病人依預測機率排序，掃描門檻繪出 ROC 與 PR 曲線',
      columns: COLS,
      editable: ['prob', 'y'],
      small: makeRows
    },
    params: [
      { key: 'curve', label: '曲線類型', type: 'choice', value: 'roc', options: [{ v: 'roc', label: 'ROC 曲線' }, { v: 'pr', label: 'PR 曲線' }] },
      { key: 'threshold', label: '判定門檻', type: 'num', min: 0.05, max: 0.95, step: 0.05, value: 0.5 }
    ],
    pseudo: [
      '將病人依模型預測機率由高到低排序',
      '門檻由 1.00 逐步往下放寬到 0.00：',
      '  統計該門檻下的 TP, FP, TN, FN',
      '  算 FPR 與 TPR',
      '  算 Precision = TP/(TP+FP)',
      '將各門檻點連成曲線並算曲線下面積 AUC'
    ],
    build(rows, p) {
      const R = buildCurves(rows, p), steps = [];
      const isPR = p.curve === 'pr';

      function views(st) {
        const sub = R.pts.slice(0, st.upto);
        const curPt = R.pts[Math.min(st.curIdx, R.pts.length - 1)];
        const posRate = rows.filter(r => r.y === 1).length / rows.length;
        const series = isPR
          ? [
              { id: 'base', label: '隨機基準 (' + f(posRate, 2) + ')', pts: [[0, posRate], [1, posRate]], cls: 'c5', dash: true, dots: false },
              { id: 'pr', label: 'PR 曲線 (AUC=' + f(R.prAuc, 3) + ')', pts: sub.slice(1).map(x => [x.rec, x.prec]), cls: 'c1', dots: true }
            ]
          : [
              { id: 'diag', label: '隨機猜測線', pts: [[0, 0], [1, 1]], cls: 'c5', dash: true, dots: false },
              { id: 'roc', label: 'ROC 曲線 (AUC=' + f(R.rocAuc, 3) + ')', pts: sub.map(x => [x.fpr, x.tpr]), cls: 'c1', dots: true }
            ];
        const marker = st.showCur
          ? { x: isPR ? R.cur.rec : R.cur.fpr, y: isPR ? R.cur.prec : R.cur.tpr, label: '門檻=' + f(p.threshold, 2) }
          : (curPt && !(isPR && st.curIdx === 0) ? { x: isPR ? curPt.rec : curPt.fpr, y: isPR ? curPt.prec : curPt.tpr, label: 't=' + f(curPt.th, 2) } : null);
        const main = {
          type: 'line', slot: 'main',
          title: isPR ? 'Precision–Recall (PR) 曲線（AUC = ' + f(R.prAuc, 3) + '）' : 'ROC 曲線（AUC = ' + f(R.rocAuc, 3) + '）',
          axes: { x: { label: isPR ? '召回率 Recall (TPR)' : '偽陽性率 FPR', min: 0, max: 1 }, y: { label: isPR ? '精確率 Precision' : '真陽性率 TPR', min: 0, max: 1 } },
          series, marker
        };
        const thShow = st.showCur ? p.threshold : (curPt ? curPt.th : 1.01);
        const side = {
          type: 'table', slot: 'side',
          title: '病人機率排序表（目前門檻 ≥ ' + f(thShow, 2) + '）',
          cols: [
            { key: 'id', label: '#' },
            { key: 'pr', label: '機率 p', num: true, digits: 2 },
            { key: 'y', label: '實際' },
            { key: 'res', label: '判定' }
          ],
          rows: R.sorted.map((r, idx) => {
            const pred = r.prob >= thShow ? 1 : 0;
            const nextProb = idx + 1 < R.sorted.length ? R.sorted[idx + 1].prob : -1;
            const atCut = pred === 1 && nextProb < thShow;
            const tag = pred === 1 ? (r.y === 1 ? 'TP' : 'FP') : (r.y === 0 ? 'TN' : 'FN');
            const clsTag = (tag === 'TP' || tag === 'TN') ? 'good' : 'bad';
            return { id: r.id, cells: [r.id, r.prob, { v: r.y ? '是' : '否', cls: r.y ? 'c1' : 'c0' }, { v: tag, cls: clsTag }], hl: atCut };
          })
        };
        const ev = st.showCur ? R.cur : curPt;
        const bottom = {
          type: 'bars', slot: 'bottom',
          title: '目前門檻指標（F1 = ' + f(ev.f1, 3) + '）',
          max: 1, digits: 3,
          items: [
            { id: 'tpr', label: 'TPR / Recall', value: ev.tpr, cls: 'c1' },
            { id: 'fpr', label: 'FPR (誤報率)', value: ev.fpr, cls: 'c4' },
            { id: 'pre', label: 'Precision (準度)', value: ev.prec, cls: 'c0' },
            { id: 'f1', label: 'F1 分數', value: ev.f1, cls: 'good', hl: true }
          ]
        };
        return [main, side, bottom];
      }

      const st = { upto: 1, curIdx: 0, showCur: false };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '題目', '分類模型輸出的是 0–1 機率。不同門檻會切出不同的 TP/FP/TN/FN，把全部門檻連起來就是 ROC 與 PR 曲線。', [
        '將 12 位病人依預測機率由高到低排好（陽性 ' + rows.filter(r => r.y === 1).length + ' 人）'
      ]);

      const stepPicks = [1, 2, 3, 5, 7, 9, R.pts.length - 1];
      const uniqPicks = Array.from(new Set(stepPicks.filter(i => i < R.pts.length)));
      uniqPicks.forEach((idx, si) => {
        st.upto = idx + 1; st.curIdx = idx;
        const pt = R.pts[idx];
        add(si < 3 ? 3 : 4, '放寬門檻至 ' + f(pt.th, 2), '門檻降到 ' + f(pt.th, 2) + '，目前抓到 TP=' + pt.tp + ' 位陽性、誤報 FP=' + pt.fp + ' 位。', [
          'TPR = ' + f(pt.tpr, 3) + '，FPR = ' + f(pt.fpr, 3) + '，Precision = ' + f(pt.prec, 3)
        ]);
      });

      st.upto = R.pts.length; st.showCur = true;
      add(5, '目前門檻 ' + f(p.threshold, 2) + ' 與 AUC', 'ROC-AUC = ' + f(R.rocAuc, 3) + '，PR-AUC = ' + f(R.prAuc, 3) + '。拖曳「判定門檻」滑桿觀察星號在曲線上的移動。', [
        '目前 (FPR=' + f(R.cur.fpr, 2) + ', TPR=' + f(R.cur.tpr, 2) + ', Prec=' + f(R.cur.prec, 2) + ')',
        'ROC-AUC = ' + f(R.rocAuc, 3) + '｜PR-AUC = ' + f(R.prAuc, 3)
      ]);

      let bestJ = R.pts[0], bestF1 = R.pts[0];
      R.pts.forEach(pt => {
        if ((pt.tpr - pt.fpr) > (bestJ.tpr - bestJ.fpr) + 1e-12) bestJ = pt;
        if (pt.f1 > bestF1.f1 + 1e-12) bestF1 = pt;
      });
      add(5, '最佳門檻：Youden J', '實務挑門檻常用 Youden J = max(TPR − FPR) 找離對角線最遠點，或找最高 F1；篩檢重症怕漏診則會再把門檻往下調。', [
        '最佳 Youden J 門檻 = ' + f(bestJ.th, 2) + '（J = ' + f(bestJ.tpr - bestJ.fpr, 3) + '）',
        '最高 F1 門檻 = ' + f(bestF1.th, 2) + '（F1 = ' + f(bestF1.f1, 3) + '）'
      ]);
      add(5, 'ROC vs PR 選擇時機', '罕病篩檢（嚴重不平衡）時負樣本會稀釋 FPR，看 PR 曲線比 ROC 更誠實；註：sklearn 的 AP 用階梯右端點，與梯形 PR-AUC 略有微差。', [
        'ROC-AUC = ' + f(R.rocAuc, 3) + '｜PR-AUC = ' + f(R.prAuc, 3) + '｜機率準度看 B19'
      ]);
      return steps;
    },

    keys(steps, rows, p) {
      const R = buildCurves(rows, p);
      return {
        roc_auc: R.rocAuc, pr_auc: R.prAuc,
        cur_tpr: R.cur.tpr, cur_fpr: R.cur.fpr, cur_prec: R.cur.prec, cur_f1: R.cur.f1
      };
    },

    explain(steps, rows, p) {
      const R = buildCurves(rows, p);
      return [
        '這個模型的 ROC-AUC = ' + f(R.rocAuc, 3) + '（越接近 1 排序能力越強，0.5 等同亂猜），PR-AUC = ' + f(R.prAuc, 3) + '。',
        '在目前門檻 ' + f(p.threshold, 2) + ' 下，Recall = ' + LAB.pct(R.cur.tpr, 1) + '、Precision = ' + LAB.pct(R.cur.prec, 1) + '、FPR = ' + LAB.pct(R.cur.fpr, 1) + '。',
        'AUC 衡量的是「所有門檻的整體排序能力」，實際上線仍需依誤診／誤報醫療成本挑選單一最佳門檻。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Logistic Regression', 'Apply Model', 'Performance (Binominal Classification)', 'Find Threshold'],
      params: [
        ['Performance (Binominal) › AUC', '自動繪製 ROC 曲線與計算 AUC'],
        ['Find Threshold', '依成本矩陣尋找最佳機率切點']
      ],
      note: 'AI Studio 的 Performance (Binominal Classification) 勾選 AUC 即可檢視 ROC 曲線；若要依誤報／漏診不同代價找門檻，可接 Find Threshold。',
      expect: (steps, rows, p) => {
        const R = buildCurves(rows, p);
        return ['ROC-AUC = ' + f(R.rocAuc, 3) + '，PR-AUC = ' + f(R.prAuc, 3)];
      },
      python: 'from sklearn.metrics import roc_auc_score, average_precision_score, roc_curve, precision_recall_curve',
      confirmed: false
    }
  });
})();
