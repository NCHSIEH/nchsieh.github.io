/* B8 AdaBoost */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = LAB.data.columns('clinic', ['glu', 'bmi', 'dm'], { dm: 'y' });
  const FEATS = ['glu', 'bmi'];
  const FLAB = { glu: '空腹血糖', bmi: 'BMI' };
  const AX = { x: { label: '空腹血糖（mg/dL）', min: 60, max: 220 }, y: { label: 'BMI (kg/m²)', min: 15, max: 40 } };
  const pick = r => ({ id: r.id, glu: r.glu, bmi: r.bmi, dm: r.dm });

  function makeRows(seed) {
    const rs = LAB.data.clinic(seed, 10).map(pick);
    const negs = rs.filter(r => r.dm === 0).sort((a, b) => a.bmi - b.bmi);
    const poss = rs.filter(r => r.dm === 1).sort((a, b) => b.bmi - a.bmi);
    if (negs[0] && poss[0]) {
      negs[0].glu = 148; negs[0].bmi = 21.5;
      poss[0].glu = 96; poss[0].bmi = 33.5;
    }
    if (negs[1]) {
      negs[1].glu = 82; negs[1].bmi = 34.0;
    }
    return rs;
  }
  const cls = dm => dm ? 'c1' : 'c0';

  function fitAdaBoost(rows, rounds) {
    const n = rows.length;
    const ys = rows.map(r => r.dm === 1 ? 1 : -1);
    let w = M.range(n, () => 1 / n);
    const T = Math.max(1, Math.min(6, Math.round(rounds || 3)));
    const history = [];

    // 預先建立所有候選樹樁
    const stumps = [];
    FEATS.forEach((ft, fIdx) => {
      const vals = Array.from(new Set(rows.map(r => r[ft]))).sort((a, b) => a - b);
      for (let i = 0; i < vals.length - 1; i++) {
        const th = (vals[i] + vals[i + 1]) / 2;
        [1, -1].forEach(pol => {
          stumps.push({ ft, fIdx, th, pol });
        });
      }
    });

    for (let t = 0; t < T; t++) {
      let best = null;
      const candErrors = [];
      stumps.forEach(st => {
        let err = 0;
        const preds = rows.map((r, i) => {
          const pr = (r[st.ft] <= st.th ? st.pol : -st.pol);
          if (pr !== ys[i]) err += w[i];
          return pr;
        });
        candErrors.push({ ft: st.ft, fIdx: st.fIdx, th: st.th, pol: st.pol, err, preds });
        if (!best || err < best.err - 1e-12) {
          best = { ft: st.ft, fIdx: st.fIdx, th: st.th, pol: st.pol, err, preds };
        }
      });
      const eps = M.clamp(best.err, 1e-12, 1 - 1e-12);
      const alpha = 0.5 * Math.log((1 - eps) / eps);
      const wBefore = w.slice();
      const rawW = w.map((wi, i) => wi * Math.exp(-alpha * ys[i] * best.preds[i]));
      const zSum = M.sum(rawW) || 1;
      w = rawW.map(v => v / zSum);
      history.push({
        round: t + 1,
        stump: best,
        eps: best.err,
        alpha,
        wBefore,
        wAfter: w.slice(),
        topCands: candErrors.slice().sort((a, b) => a.err - b.err).slice(0, 6)
      });
    }

    const finalScores = rows.map((r, i) => M.sum(history.map(h => h.alpha * h.stump.preds[i])));
    const finalPreds = finalScores.map(s => s > 0 ? 1 : 0);
    const acc = finalPreds.filter((pr, i) => pr === rows[i].dm).length / n;
    return { history, finalScores, finalPreds, acc };
  }

  LAB.register({
    id: 'B8', group: 'B', title: 'AdaBoost',
    module: { name: 'M4 第 05 節', url: '../m4/#p05' },
    goal: '看懂 AdaBoost 如何在每一輪找出加權錯誤率最小的決策樹樁，放大答錯病人的權重，最後把多棵樹樁加權投票。',
    data: {
      name: 'clinic_ada',
      scenario: '門診健檢：10 位病人的血糖與 BMI，用單一切點樹樁逐輪強化分類',
      columns: COLS,
      editable: ['glu', 'bmi', 'dm'],
      small: makeRows
    },
    params: [
      { key: 'rounds', label: '訓練輪數 T', type: 'int', min: 1, max: 6, step: 1, value: 3 }
    ],
    pseudo: [
      '初始化每筆資料權重 wᵢ = 1 ÷ n',
      '重複 T 輪：',
      '  列舉單一切點樹樁，算加權錯誤率 ε',
      '  選 ε 最小的樹樁',
      '  算樹樁權重 α = ½ ln((1−ε)÷ε)',
      '  答錯權重乘 e^α、答對乘 e^(−α)',
      '  正規化使所有 wᵢ 總和為 1',
      '最後依 Σ αₜ hₜ(x) 正負號投票'
    ],
    build(rows, p) {
      const R = fitAdaBoost(rows, p.rounds), steps = [];
      const n = rows.length;

      function views(st) {
        const points = rows.map((r, i) => ({
          id: 'p' + r.id,
          x: r.glu, y: r.bmi,
          cls: cls(r.dm),
          r: Math.round(M.clamp(4 + st.w[i] * n * 4, 4, 15)),
          ring: st.miss && st.miss[i],
          label: String(r.id)
        }));
        const lines = st.stumps.map((sm, idx) => {
          const isCur = idx === st.stumps.length - 1;
          if (sm.ft === 'glu') return { id: 'st' + idx, x1: sm.th, y1: AX.y.min, x2: sm.th, y2: AX.y.max, cls: isCur ? 'hl' : 'dim', dash: !isCur, w: isCur ? 2.5 : 1.5, label: isCur ? 'R' + (idx + 1) : null };
          return { id: 'st' + idx, x1: AX.x.min, y1: sm.th, x2: AX.x.max, y2: sm.th, cls: isCur ? 'hl' : 'dim', dash: !isCur, w: isCur ? 2.5 : 1.5, label: isCur ? 'R' + (idx + 1) : null };
        });
        const regions = st.showReg ? LAB.grid((x, y) => {
          let sc = 0;
          R.history.forEach(h => {
            const v = h.stump.ft === 'glu' ? x : y;
            sc += h.alpha * (v <= h.stump.th ? h.stump.pol : -h.stump.pol);
          });
          return sc >= 0 ? 'c1' : 'c0';
        }, AX.x.min, AX.x.max, AX.y.min, AX.y.max, 30, 20) : null;
        const main = {
          type: 'scatter', slot: 'main',
          title: '病人權重大小與樹樁切線（圓越大權重越高）',
          axes: AX, points, lines, circles: [], regions,
          legend: [{ cls: 'c1', label: '糖尿病：是' }, { cls: 'c0', label: '糖尿病：否' }, { cls: 'hl', shape: 'line', label: '本輪樹樁' }]
        };
        const side = {
          type: 'table', slot: 'side',
          title: '各筆樣本權重表',
          cols: [
            { key: 'id', label: '#' },
            { key: 'y', label: '實際' },
            { key: 'w', label: '權重 wᵢ', num: true, digits: 3 },
            { key: 'sc', label: '累計分數', num: true, digits: 2 }
          ],
          rows: rows.map((r, i) => ({
            id: r.id,
            cells: [r.id, { v: r.dm ? '是' : '否', cls: cls(r.dm) }, st.w[i], st.scores[i]],
            hl: st.miss && st.miss[i]
          }))
        };
        const bars = {
          type: 'bars', slot: 'bottom',
          title: '各輪樹樁的話語權 αₜ',
          max: Math.max(2, M.max(R.history.map(h => h.alpha))),
          digits: 3,
          items: R.history.map((h, i) => ({
            id: 'a' + h.round,
            label: '第 ' + h.round + ' 輪 (' + FLAB[h.stump.ft] + '≤' + f(h.stump.th, 1) + ')',
            value: i < st.alphasShown ? h.alpha : 0,
            cls: i < st.alphasShown ? 'c' + (i % 5) : 'c5'
          }))
        };
        return [main, side, bars];
      }

      const st = {
        w: M.range(n, () => 1 / n),
        scores: M.range(n, () => 0),
        miss: null,
        stumps: [],
        alphasShown: 0,
        showReg: false
      };
      const add = (line, title, say, calc, extra) => steps.push(Object.assign({ line, title, say, calc: calc || [], views: views(st), focus: [] }, extra));

      add(0, '題目', '10 位門診病人一開始權重相同。我們要用單一切點的決策樹樁，連續訓練 ' + R.history.length + ' 輪並加權投票。', [
        '起始每筆權重 wᵢ = 1 ÷ ' + n + ' = ' + f(1 / n, 3)
      ]);

      R.history.forEach(h => {
        st.stumps = st.stumps.concat([h.stump]);
        st.miss = rows.map((r, i) => h.stump.preds[i] !== (r.dm ? 1 : -1));
        const nMiss = st.miss.filter(Boolean).length;
        add(4, '第 ' + h.round + ' 輪：選樹樁', '在所有候選切點中，挑出加權錯誤率最小的樹樁（黃圈為本輪答錯的 ' + nMiss + ' 位病人）。', [
          '最佳樹樁：' + FLAB[h.stump.ft] + ' ≤ ' + f(h.stump.th, 1) + '（左判 ' + (h.stump.pol > 0 ? '是' : '否') + '）',
          '加權錯誤率 ε = ' + f(h.eps, 3)
        ], { phase: '第 ' + h.round + ' 輪' });

        st.alphasShown = h.round;
        st.scores = st.scores.map((s, i) => s + h.alpha * h.stump.preds[i]);
        add(5, '第 ' + h.round + ' 輪：算話語權 α', '錯誤率越低，這棵樹樁在最終投票的話語權 α 就越大。', [
          'α = 0.5 × ln((1 − ' + f(h.eps, 3) + ') ÷ ' + f(h.eps, 3) + ') = ' + f(h.alpha, 3)
        ], { phase: '第 ' + h.round + ' 輪' });

        st.w = h.wAfter.slice();
        add(7, '第 ' + h.round + ' 輪：更新權重', '答錯病人的權重乘 e^α 變大（圓點放大），答對的乘 e^(−α) 縮小，再正規化總和為 1。', [
          'e^α = ' + f(Math.exp(h.alpha), 2) + '，e^(−α) = ' + f(Math.exp(-h.alpha), 2),
          '最大權重 = ' + f(M.max(st.w), 3) + '｜最小權重 = ' + f(M.min(st.w), 3)
        ], { phase: '第 ' + h.round + ' 輪' });
      });

      st.miss = rows.map((r, i) => R.finalPreds[i] !== r.dm);
      st.showReg = true;
      add(8, '最終加權投票結果', '把所有輪的 αₜ × hₜ(x) 相加，大於 0 判為「是」，否則為「否」。', [
        '集成訓練準確率 = ' + LAB.pct(R.acc, 1) + '（答對 ' + rows.filter((r, i) => R.finalPreds[i] === r.dm).length + ' / ' + n + ' 人）'
      ]);

      while (steps.length < 10) {
        add(8, '權重演化與極限', '透過逐輪把難分類的病人放大權重，弱分類器（單一切點樹樁）合起來就能畫出非線性的階梯邊界。', [
          '訓練輪數 T = ' + R.history.length + '，總話語權 Σ αₜ = ' + f(M.sum(R.history.map(h => h.alpha)), 2)
        ]);
        if (steps.length < 10) {
          add(8, '離散 AdaBoost 註記', '本實驗採用教科書離散 AdaBoost（α = ½ ln((1−ε)/ε)），與舊版 SAMME.R 機率版本公式不同。', [
            '最終分數正負號即為預測類別'
          ]);
        }
      }
      return steps;
    },

    keys(steps, rows, p) {
      const R = fitAdaBoost(rows, p.rounds);
      const k = { final_acc: R.acc };
      R.history.forEach((h, t) => {
        k['r' + t + '_feat'] = h.stump.fIdx;
        k['r' + t + '_th'] = h.stump.th;
        k['r' + t + '_eps'] = h.eps;
        k['r' + t + '_alpha'] = h.alpha;
        h.wAfter.forEach((wi, i) => { k['r' + t + '_w_' + rows[i].id] = wi; });
      });
      R.finalScores.forEach((s, i) => { k['score_' + rows[i].id] = s; });
      return k;
    },

    explain(steps, rows, p) {
      const R = fitAdaBoost(rows, p.rounds);
      return [
        '經過 ' + R.history.length + ' 輪離散 AdaBoost，第 1 輪挑出「' + FLAB[R.history[0].stump.ft] + ' ≤ ' + f(R.history[0].stump.th, 1) + '」（ε = ' + f(R.history[0].eps, 3) + '、α = ' + f(R.history[0].alpha, 3) + '）。',
        '每輪答錯的病人權重會被放大，迫使下一棵樹樁專心修正這些難例。',
        '最終將 ' + R.history.length + ' 棵樹樁依 α 加權投票，訓練準確率達到 ' + LAB.pct(R.acc, 1) + '。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Set Role', 'AdaBoost', 'Decision Stump'],
      params: [
        ['Set Role › dm', 'label'],
        ['AdaBoost › iterations', p => String(p.rounds)]
      ],
      note: 'AI Studio 的 AdaBoost 內放入 Decision Stump 即可實作。注意不同軟體版本（SAMME vs SAMME.R）的話語權 α 公式可能略有差異，本實驗採用教科書離散 AdaBoost 公式。',
      expect: (steps, rows, p) => {
        const R = fitAdaBoost(rows, p.rounds);
        return ['訓練準確率 = ' + LAB.pct(R.acc, 1)];
      },
      python: `from sklearn.ensemble import AdaBoostClassifier\nfrom sklearn.tree import DecisionTreeClassifier\n# 本實驗採用教科書離散 AdaBoost 公式（α = 0.5 * ln((1-ε)/ε)）`,
      confirmed: false
    }
  });
})();
