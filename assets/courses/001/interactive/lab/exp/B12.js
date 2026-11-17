/* B12 Voting 與 Stacking 集成 */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = LAB.data.columns('clinic', ['bmi', 'glu', 'dm'], { dm: 'y' });
  const AX = { x: { label: 'BMI (kg/m²)', min: 15, max: 40 }, y: { label: '空腹血糖（mg/dL）', min: 60, max: 220 } };
  const pick = r => ({ id: r.id, bmi: r.bmi, glu: r.glu, dm: r.dm });
  const cls = y => y ? 'c1' : 'c0';

  function makeRows(seed) {
    const rs = LAB.data.clinic(seed, 14).map(pick);
    const negs = rs.filter(r => r.dm === 0);
    const poss = rs.filter(r => r.dm === 1);
    if (negs[0] && poss[0]) {
      negs[0].bmi = 33.0; negs[0].glu = 92;
      poss[0].bmi = 22.5; poss[0].glu = 146;
    }
    if (negs[1]) {
      negs[1].bmi = 24.5; negs[1].glu = 126;
    }
    return rs;
  }

  function fitModels(rows) {
    const n = rows.length;
    const mB = M.mean(rows.map(r => r.bmi)), sB = M.sd(rows.map(r => r.bmi)) || 1;
    const mG = M.mean(rows.map(r => r.glu)), sG = M.sd(rows.map(r => r.glu)) || 1;
    const Z = rows.map(r => [(r.bmi - mB) / sB, (r.glu - mG) / sG]);
    const Y = rows.map(r => r.dm);

    // 模型 1：Logistic 迴歸
    let w1 = 0, w2 = 0, b = 0;
    for (let ep = 0; ep < 120; ep++) {
      let g1 = 0, g2 = 0, gb = 0;
      for (let i = 0; i < n; i++) {
        const pr = M.sigmoid(w1 * Z[i][0] + w2 * Z[i][1] + b);
        const e = pr - Y[i];
        g1 += e * Z[i][0]; g2 += e * Z[i][1]; gb += e;
      }
      w1 -= 0.4 * g1 / n; w2 -= 0.4 * g2 / n; b -= 0.4 * gb / n;
    }
    const probLog = (bmi, glu) => M.sigmoid(w1 * ((bmi - mB) / sB) + w2 * ((glu - mG) / sG) + b);

    // 模型 2：單層決策樹樁（最佳 Gini 切點）
    let bestSt = { ft: 'glu', th: 115, pL: 0.1, pR: 0.9, gini: 99 };
    ['bmi', 'glu'].forEach(ft => {
      const vals = Array.from(new Set(rows.map(r => r[ft]))).sort((a, b) => a - b);
      for (let i = 0; i < vals.length - 1; i++) {
        const th = (vals[i] + vals[i + 1]) / 2;
        const L = rows.filter(r => r[ft] <= th), R = rows.filter(r => r[ft] > th);
        const gFn = sub => { const p1 = sub.filter(x => x.dm === 1).length / sub.length; return 1 - p1 * p1 - (1 - p1) * (1 - p1); };
        const wg = (L.length * gFn(L) + R.length * gFn(R)) / n;
        if (wg < bestSt.gini) {
          bestSt = {
            ft, th, gini: wg,
            pL: L.filter(x => x.dm === 1).length / L.length,
            pR: R.filter(x => x.dm === 1).length / R.length
          };
        }
      }
    });
    const probTree = (bmi, glu) => ((bestSt.ft === 'bmi' ? bmi : glu) <= bestSt.th ? bestSt.pL : bestSt.pR);

    // 模型 3：3-NN（標準化歐氏距離，含平滑機率）
    const probKnn = (bmi, glu) => {
      const zb = (bmi - mB) / sB, zg = (glu - mG) / sG;
      const ds = rows.map((r, i) => ({ d: Math.hypot(Z[i][0] - zb, Z[i][1] - zg), dm: r.dm }))
        .sort((a, b) => a.d - b.d).slice(0, 3);
      return M.mean(ds.map(x => x.dm));
    };

    const p1 = rows.map(r => probLog(r.bmi, r.glu));
    const p2 = rows.map(r => probTree(r.bmi, r.glu));
    const p3 = rows.map(r => probKnn(r.bmi, r.glu));

    // Meta-Learner（Stacking：用三個基模型機率訓練 Logistic 迴歸）
    let mw = [0, 0, 0], mb = 0;
    for (let ep = 0; ep < 200; ep++) {
      let gm = [0, 0, 0], gmb = 0;
      for (let i = 0; i < n; i++) {
        const pr = M.sigmoid(mw[0] * p1[i] + mw[1] * p2[i] + mw[2] * p3[i] + mb);
        const e = pr - Y[i];
        gm[0] += e * p1[i]; gm[1] += e * p2[i]; gm[2] += e * p3[i]; gmb += e;
      }
      for (let j = 0; j < 3; j++) mw[j] -= 0.5 * gm[j] / n;
      mb -= 0.5 * gmb / n;
    }

    const predOne = (bmi, glu, method, soft) => {
      const a = probLog(bmi, glu), b0 = probTree(bmi, glu), c = probKnn(bmi, glu);
      if (method === 'stack') {
        const pr = M.sigmoid(mw[0] * a + mw[1] * b0 + mw[2] * c + mb);
        return { p: pr, pred: pr >= 0.5 ? 1 : 0 };
      }
      if (soft) {
        const pr = (a + b0 + c) / 3;
        return { p: pr, pred: pr >= 0.5 ? 1 : 0 };
      }
      const votes = (a >= 0.5 ? 1 : 0) + (b0 >= 0.5 ? 1 : 0) + (c >= 0.5 ? 1 : 0);
      return { p: votes / 3, pred: votes >= 2 ? 1 : 0 };
    };

    const accOf = fn => rows.filter(r => fn(r.bmi, r.glu) === r.dm).length / n;
    const accLog = accOf((x, y) => probLog(x, y) >= 0.5 ? 1 : 0);
    const accTree = accOf((x, y) => probTree(x, y) >= 0.5 ? 1 : 0);
    const accKnn = accOf((x, y) => probKnn(x, y) >= 0.5 ? 1 : 0);
    const accHard = accOf((x, y) => predOne(x, y, 'vote', false).pred);
    const accSoft = accOf((x, y) => predOne(x, y, 'vote', true).pred);
    const accStack = accOf((x, y) => predOne(x, y, 'stack', true).pred);

    return {
      p1, p2, p3, mw, mb, bestSt, predOne,
      accLog, accTree, accKnn, accHard, accSoft, accStack
    };
  }

  LAB.register({
    id: 'B12', group: 'B', title: 'Voting 與 Stacking 集成',
    module: { name: 'M4 第 04 節', url: '../m4/#p04' },
    goal: '結合 Logistic 迴歸、決策樹與 k-NN 三種不同原理的模型，比較多數決 Voting 與再用第二層 Meta-Learner 學習權重的 Stacking 集成效果。',
    data: {
      name: 'clinic_ensemble',
      scenario: '門診健檢：14 位病人（含邊界重疊個案），以三種異質基模型做集成學習',
      columns: COLS,
      editable: ['bmi', 'glu', 'dm'],
      small: makeRows
    },
    params: [
      { key: 'method', label: '集成方式', type: 'choice', value: 'stack', options: [{ v: 'vote', label: 'Voting 投票' }, { v: 'stack', label: 'Stacking 堆疊' }] },
      { key: 'soft', label: '軟機率投票', type: 'bool', value: true }
    ],
    pseudo: [
      '訓練基模型 1：Logistic 迴歸（直線）',
      '訓練基模型 2：決策樹樁（水平／垂直）',
      '訓練基模型 3：3-NN（局部距離）',
      '方法一 Voting：三者直接多數決或平均機率',
      '方法二 Stacking：以三者輸出當新特徵',
      '  訓練第二層 Meta-Learner 學習最佳權重',
      '比較各單模與集成後的準確率'
    ],
    build(rows, p) {
      const R = fitModels(rows), steps = [];
      const isStack = p.method === 'stack';

      function views(st) {
        const preds = rows.map(r => R.predOne(r.bmi, r.glu, p.method, p.soft).pred);
        const points = rows.map((r, i) => ({
          id: 'p' + r.id, x: r.bmi, y: r.glu, cls: cls(r.dm),
          ring: st.showEns && preds[i] !== r.dm,
          label: String(r.id), r: 6
        }));
        const regions = st.showReg ? LAB.grid((x, y) => cls(R.predOne(x, y, p.method, p.soft).pred), AX.x.min, AX.x.max, AX.y.min, AX.y.max, 28, 18) : null;
        const main = {
          type: 'scatter', slot: 'main',
          title: isStack ? 'Stacking 元學習器決策邊界（黃圈＝誤判）' : 'Voting 投票決策邊界（黃圈＝誤判）',
          axes: AX, points, lines: [], circles: [], regions,
          legend: [{ cls: 'c1', label: '糖尿病：是' }, { cls: 'c0', label: '糖尿病：否' }, { cls: 'hl', shape: 'ring', label: '誤判個案' }]
        };
        const side = {
          type: 'table', slot: 'side',
          title: '各模型對每位病人的預測機率',
          cols: [
            { key: 'id', label: '#' },
            { key: 'm1', label: 'Log', num: true, digits: 2 },
            { key: 'm2', label: '樹', num: true, digits: 2 },
            { key: 'm3', label: 'kNN', num: true, digits: 2 },
            { key: 'ens', label: '集成', num: true, digits: 2 }
          ],
          rows: rows.map((r, i) => {
            const ep = R.predOne(r.bmi, r.glu, p.method, p.soft);
            return {
              id: r.id,
              cells: [
                r.id,
                st.s1 ? R.p1[i] : null,
                st.s2 ? R.p2[i] : null,
                st.s3 ? R.p3[i] : null,
                st.showEns ? { v: f(ep.p, 2), cls: ep.pred !== r.dm ? 'bad' : 'good' } : null
              ]
            };
          })
        };
        const ensAcc = isStack ? R.accStack : (p.soft ? R.accSoft : R.accHard);
        const bottom = {
          type: 'bars', slot: 'bottom',
          title: '單一模型 vs 集成準確率比較',
          max: 1, digits: 3,
          items: [
            { id: 'l', label: 'Logistic', value: st.s1 ? R.accLog : 0, cls: 'c0' },
            { id: 't', label: '決策樹樁', value: st.s2 ? R.accTree : 0, cls: 'c2' },
            { id: 'k', label: '3-NN', value: st.s3 ? R.accKnn : 0, cls: 'c3' },
            { id: 'e', label: isStack ? 'Stacking' : 'Voting', value: st.showEns ? ensAcc : 0, cls: st.showEns && ensAcc >= Math.max(R.accLog, R.accTree, R.accKnn) ? 'good' : 'c1', hl: st.showEns }
          ]
        };
        return [main, side, bottom];
      }

      const st = { s1: false, s2: false, s3: false, showEns: false, showReg: false };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '題目', '三個風格截然不同的模型：直線（Logistic）、垂直/水平切線（樹）、局部鄰居（k-NN），看看合起來會不會更準。', [
        '病人共 ' + rows.length + ' 位，先各自訓練三個基模型'
      ]);
      st.s1 = true;
      add(0, '基模型 1：Logistic', 'Logistic 用斜直線切分 BMI 與血糖，先算出每位病人的預測機率。', [
        'Logistic 準確率 = ' + LAB.pct(R.accLog, 1)
      ]);
      st.s2 = true;
      add(1, '基模型 2：決策樹樁', '單層決策樹在 ' + R.bestSt.ft + ' ≤ ' + f(R.bestSt.th, 1) + ' 切一刀。', [
        '決策樹準確率 = ' + LAB.pct(R.accTree, 1)
      ]);
      st.s3 = true;
      add(2, '基模型 3：3-NN', '3-NN 只看最近 3 位鄰居的糖尿病比例，能捕捉局部彎曲。', [
        '3-NN 準確率 = ' + LAB.pct(R.accKnn, 1)
      ]);

      st.showEns = true;
      if (isStack) {
        add(4, '建立 Stacking 特徵', '把三個基模型輸出的機率 [p₁, p₂, p₃] 當成第二層的新特徵，交給 Meta-Learner。', [
          '第二層學到權重：w = (' + R.mw.map(v => f(v, 2)).join(', ') + ')'
        ]);
        add(5, 'Stacking 加權整合', '表現越好的基模型會獲得越高的 Meta 權重，比單純平均更聰明。', [
          'Stacking 準確率 = ' + LAB.pct(R.accStack, 1)
        ]);
      } else {
        add(3, p.soft ? 'Voting 軟投票' : 'Voting 硬投票', p.soft ? '把三個模型的預測機率直接取平均，≥ 0.5 判為是。' : '三個模型各投 1 票（0 或 1），多數決（≥ 2 票）勝出。', [
          'Voting 準確率 = ' + LAB.pct(p.soft ? R.accSoft : R.accHard, 1)
        ]);
      }

      st.showReg = true;
      add(6, '繪製集成決策區域', '看右側背景底色：集成結合了直線、軸切與局部鄰居，形成更穩健的非線性邊界。', [
        '單模最高 = ' + LAB.pct(Math.max(R.accLog, R.accTree, R.accKnn), 1) + '｜集成 = ' + LAB.pct(isStack ? R.accStack : (p.soft ? R.accSoft : R.accHard), 1)
      ]);

      while (steps.length < 10) {
        add(6, '實務提醒', 'Stacking 實務上一定要用交叉驗證（Out-of-Fold）產生第一層預測，才不會讓 Meta-Learner 過度相信訓練集過擬合的基模型。', [
          'Hard Voting = ' + LAB.pct(R.accHard, 1) + '｜Soft = ' + LAB.pct(R.accSoft, 1) + '｜Stack = ' + LAB.pct(R.accStack, 1)
        ]);
      }
      return steps;
    },

    keys(steps, rows) {
      const R = fitModels(rows);
      return {
        acc_log: R.accLog, acc_tree: R.accTree, acc_knn: R.accKnn,
        acc_hard: R.accHard, acc_soft: R.accSoft, acc_stack: R.accStack,
        meta_w0: R.mw[0], meta_w1: R.mw[1], meta_w2: R.mw[2]
      };
    },

    explain(steps, rows) {
      const R = fitModels(rows);
      return [
        '三個單一基模型準確率分別為 Logistic ' + LAB.pct(R.accLog, 1) + '、決策樹 ' + LAB.pct(R.accTree, 1) + '、3-NN ' + LAB.pct(R.accKnn, 1) + '。',
        'Voting 軟投票達 ' + LAB.pct(R.accSoft, 1) + '，而 Stacking 透過第二層 Meta-Learner 自動給較準的模型更高權重（' + R.mw.map(v => f(v, 2)).join(', ') + '），準確率達 ' + LAB.pct(R.accStack, 1) + '。',
        '集成要有效，關鍵在於基模型「準度不能太差」且「犯錯位置互補（多樣性）」。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Set Role', 'Vote / Stacking', 'Logistic Regression', 'Decision Tree', 'k-NN'],
      params: [
        ['Vote / Stacking', '將三個基模型拖進 Vote 或 Stacking 子流程']
      ],
      note: 'AI Studio 內建 Vote（多數決／平均機率）與 Stacking（需再指定一個 Meta-Learner，如 Logistic Regression）運算子，可直接把異質模型接在一起。',
      expect: (steps, rows) => {
        const R = fitModels(rows);
        return ['Stacking 訓練準確率 = ' + LAB.pct(R.accStack, 1)];
      },
      python: 'from sklearn.ensemble import VotingClassifier, StackingClassifier\n# VotingClassifier / StackingClassifier 結合 LogisticRegression, DecisionTreeClassifier, KNeighborsClassifier',
      confirmed: false
    }
  });
})();
