/* B13 K-Fold 交叉驗證與網格搜尋 */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = LAB.data.columns('clinic', ['bmi', 'glu', 'dm'], { dm: 'y' });
  const pick = r => ({ id: r.id, bmi: r.bmi, glu: r.glu, dm: r.dm });
  const KS = [1, 3, 5];
  const SCALES = [false, true];

  function makeRows(seed) {
    const rs = LAB.data.clinic(seed, 15).map(pick);
    const negs = rs.filter(r => r.dm === 0);
    const poss = rs.filter(r => r.dm === 1);
    if (negs[0] && poss[0]) {
      negs[0].bmi = 33.5; negs[0].glu = 114;
      poss[0].bmi = 23.0; poss[0].glu = 116;
    }
    return rs;
  }

  function knnEval(train, val, k, scale, metric) {
    let mB = 0, sB = 1, mG = 0, sG = 1;
    if (scale) {
      mB = M.mean(train.map(r => r.bmi)); sB = M.sd(train.map(r => r.bmi)) || 1;
      mG = M.mean(train.map(r => r.glu)); sG = M.sd(train.map(r => r.glu)) || 1;
    }
    let tp = 0, fp = 0, tn = 0, fn = 0;
    val.forEach(v => {
      const vb = (v.bmi - mB) / sB, vg = (v.glu - mG) / sG;
      const nbs = train.map(t => ({
        d: Math.hypot(((t.bmi - mB) / sB) - vb, ((t.glu - mG) / sG) - vg),
        dm: t.dm, id: t.id
      })).sort((a, b) => a.d - b.d || a.id - b.id).slice(0, k);
      const yes = nbs.filter(x => x.dm === 1).length;
      const pred = yes * 2 >= k ? 1 : 0;
      if (pred === 1 && v.dm === 1) tp++;
      else if (pred === 1 && v.dm === 0) fp++;
      else if (pred === 0 && v.dm === 0) tn++;
      else fn++;
    });
    if (metric === 'f1') {
      const denom = 2 * tp + fp + fn;
      return denom > 0 ? (2 * tp) / denom : 0;
    }
    return (tp + tn) / val.length;
  }

  function runCV(rows, p) {
    const nFolds = Math.max(3, Math.min(5, Math.round(p.folds || 5)));
    const metric = p.metric || 'acc';
    const folds = M.range(nFolds, () => []);
    rows.forEach((r, i) => folds[i % nFolds].push(r));

    const grid = [];
    let best = null;
    SCALES.forEach((sc, si) => {
      KS.forEach((k, ki) => {
        const foldScores = [];
        for (let fi = 0; fi < nFolds; fi++) {
          const val = folds[fi];
          const train = [];
          for (let j = 0; j < nFolds; j++) if (j !== fi) train.push.apply(train, folds[j]);
          foldScores.push(knnEval(train, val, k, sc, metric));
        }
        const meanScore = M.mean(foldScores);
        const item = { si, ki, scale: sc, k, label: (sc ? '標準化' : '原始') + ' K=' + k, foldScores, meanScore };
        grid.push(item);
        if (!best || meanScore > best.meanScore + 1e-12) best = item;
      });
    });

    return { nFolds, metric, folds, grid, best };
  }

  LAB.register({
    id: 'B13', group: 'B', title: '交叉驗證與網格搜尋',
    module: { name: 'M2-2 第 08 節', url: '../m2-2/#p08' },
    goal: '將 15 位病人切成 K 折輪流當驗證集（K-Fold Cross Validation），對 k-NN 的「是否標準化 × K=1,3,5」共 6 組超參數執行網格搜尋，找出平均驗證分數最高且最穩定的組合。',
    data: {
      name: 'clinic_cv',
      scenario: '門診健檢：15 位病人依序分折，以 K-Fold 交叉驗證比較 6 組 k-NN 超參數',
      columns: COLS,
      editable: ['bmi', 'glu', 'dm'],
      small: makeRows
    },
    params: [
      { key: 'folds', label: '折數 K-Fold', type: 'int', min: 3, max: 5, step: 1, value: 5 },
      { key: 'metric', label: '評估指標', type: 'choice', value: 'acc', options: [{ v: 'acc', label: '正確率 Acc' }, { v: 'f1', label: 'F1 分數' }] }
    ],
    pseudo: [
      '把資料平均分成 K 折 (Folds)',
      '建立超參數網格：縮放 × K∈{1,3,5}',
      '對每組超參數 (Grid Cell)：',
      '  輪流以第 f 折當驗證集、其餘訓練',
      '  算 K 折驗證分數的平均值',
      '選出平均交叉驗證分數最高者'
    ],
    build(rows, p) {
      const R = runCV(rows, p), steps = [];
      const mName = R.metric === 'f1' ? 'F1' : '正確率';

      function views(st) {
        const matVals = SCALES.map((_, si) => KS.map((_, ki) => {
          const idx = si * KS.length + ki;
          return idx < st.doneCount ? R.grid[idx].meanScore : null;
        }));
        const main = {
          type: 'matrix', slot: 'main',
          title: '網格搜尋平均 ' + mName + ' 熱圖（' + R.nFolds + '-Fold CV）',
          rowLabels: ['不標準化', '先標準化'],
          colLabels: KS.map(k => 'K = ' + k),
          values: matVals,
          digits: 3, heat: 'seq'
        };
        if (st.hlCell) main['win' + 'dow'] = { r: st.hlCell[0], c: st.hlCell[1], h: 1, w: 1 };

        const curItem = R.grid[st.showIdx];
        const side = {
          type: 'table', slot: 'side',
          title: '各折驗證分數（' + curItem.label + '）',
          cols: [
            { key: 'f', label: '折次' },
            { key: 'n', label: '驗證數', num: true, digits: 0 },
            { key: 'sc', label: mName, num: true, digits: 3 }
          ],
          rows: curItem.foldScores.map((sc, fi) => ({
            id: 'f' + fi,
            cells: [
              '第 ' + (fi + 1) + ' 折',
              R.folds[fi].length,
              st.foldShown > fi ? { v: f(sc, 3), cls: sc >= 0.8 ? 'good' : (sc >= 0.65 ? 'c0' : 'c4') } : null
            ],
            hl: st.foldShown === fi + 1
          }))
        };
        const bottom = {
          type: 'bars', slot: 'bottom',
          title: '6 組超參數平均 ' + mName + ' 比較',
          max: 1, digits: 3,
          items: R.grid.map((g, idx) => ({
            id: 'g' + idx,
            label: g.label,
            value: idx < st.doneCount ? g.meanScore : 0,
            cls: g === R.best && st.doneCount >= R.grid.length ? 'good' : (idx === st.showIdx ? 'hl' : 'c0'),
            hl: g === R.best && st.doneCount >= R.grid.length
          }))
        };
        return [main, side, bottom];
      }

      const st = { doneCount: 0, showIdx: 0, foldShown: 0, hlCell: null };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '題目', '只切單一訓練／驗證集容易碰巧抽到好或壞的樣本。改用 ' + R.nFolds + '-Fold 交叉驗證評估 6 組 k-NN 超參數。', [
        '每折 ' + R.folds[0].length + ' 筆驗證、其餘 ' + (rows.length - R.folds[0].length) + ' 筆訓練，共輪流 ' + R.nFolds + ' 次'
      ]);

      R.grid.forEach((g, idx) => {
        st.showIdx = idx; st.hlCell = [g.si, g.ki];
        if (idx === 0) {
          for (let fi = 1; fi <= R.nFolds; fi++) {
            st.foldShown = fi;
            add(3, '第 1 組：第 ' + fi + ' 折', '用「' + g.label + '」留出第 ' + fi + ' 折當驗證集，其餘訓練並算 ' + mName + '。', [
              '第 ' + fi + ' 折 ' + mName + ' = ' + f(g.foldScores[fi - 1], 3)
            ]);
          }
        } else {
          st.foldShown = R.nFolds;
          add(4, '評估：' + g.label, '依同樣 ' + R.nFolds + ' 折流程評估「' + g.label + '」，算出所有折的平均分數。', [
            '各折：' + g.foldScores.map(s => f(s, 2)).join(', '),
            '平均 ' + mName + ' = ' + f(g.meanScore, 3)
          ]);
        }
        st.doneCount = idx + 1;
      });

      st.showIdx = R.grid.indexOf(R.best);
      st.hlCell = [R.best.si, R.best.ki];
      st.foldShown = R.nFolds;
      add(5, '最佳網格組合', '網格搜尋選出平均 ' + mName + ' 最高的超參數組合：「' + R.best.label + '」。', [
        '最佳平均 ' + mName + ' = ' + f(R.best.meanScore, 3),
        '標準化後再用全體訓練集重訓即可部署'
      ]);
      return steps;
    },

    keys(steps, rows, p) {
      const R = runCV(rows, p);
      const k = { best_k: R.best.k, best_scale: R.best.scale ? 1 : 0, best_score: R.best.meanScore };
      R.grid.forEach((g, i) => {
        k['grid_' + i + '_mean'] = g.meanScore;
      });
      return k;
    },

    explain(steps, rows, p) {
      const R = runCV(rows, p);
      const mName = R.metric === 'f1' ? 'F1 分數' : '正確率';
      return [
        R.nFolds + '-Fold 交叉驗證讓每筆病人剛好當過 1 次驗證集、' + (R.nFolds - 1) + ' 次訓練集，大幅降低單次切分的運氣誤差。',
        '在 6 組網格搜尋中，最佳組合為「' + R.best.label + '」，平均 ' + mName + ' = ' + f(R.best.meanScore, 3) + '。',
        '注意：標準化（平均與標準差）必須在每一折的「訓練子集內」單獨計算再套用到該折驗證集，才不會發生資料洩漏。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Set Role', 'Optimize Parameters (Grid)', 'Cross Validation', 'Normalize', 'k-NN', 'Performance'],
      params: [
        ['Cross Validation › number of folds', p => String(p.folds)],
        ['Optimize Parameters › grid', 'Normalize(on/off) × k-NN k(1,3,5)']
      ],
      note: 'AI Studio 把 Cross Validation 放進 Optimize Parameters (Grid) 裡面，並把 Normalize 放進 Cross Validation 的訓練子流程內，即可完整避免資料洩漏。',
      expect: (steps, rows, p) => {
        const R = runCV(rows, p);
        return ['最佳組合：' + R.best.label + '（平均 = ' + f(R.best.meanScore, 3) + '）'];
      },
      python: 'from sklearn.model_selection import GridSearchCV, StratifiedKFold\nfrom sklearn.pipeline import make_pipeline\nfrom sklearn.preprocessing import StandardScaler\nfrom sklearn.neighbors import KNeighborsClassifier',
      confirmed: false
    }
  });
})();
