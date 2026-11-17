/* A6 特徵選擇 */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = LAB.data.columns('clinic', ['age', 'bmi', 'glu', 'sbp', 'dm'], { dm: 'y' });
  const FEATS = ['age', 'bmi', 'glu', 'sbp'];
  const FLAB = { age: '年齡', bmi: 'BMI', glu: '空腹血糖', sbp: '收縮壓' };
  const pick = r => ({ id: r.id, age: r.age, bmi: r.bmi, glu: r.glu, sbp: r.sbp, dm: r.dm });

  function pearsonAbs(xs, ys) {
    const mx = M.mean(xs), my = M.mean(ys);
    let num = 0, dx2 = 0, dy2 = 0;
    for (let i = 0; i < xs.length; i++) {
      const dx = xs[i] - mx, dy = ys[i] - my;
      num += dx * dy; dx2 += dx * dx; dy2 += dy * dy;
    }
    return (dx2 > 0 && dy2 > 0) ? Math.abs(num / Math.sqrt(dx2 * dy2)) : 0;
  }

  function entropyBin(arr) {
    if (!arr.length) return 0;
    const p1 = M.mean(arr), p0 = 1 - p1;
    let h = 0;
    if (p0 > 0) h -= p0 * Math.log2(p0);
    if (p1 > 0) h -= p1 * Math.log2(p1);
    return h;
  }

  function igAndChi2(xs, ys) {
    const med = M.median(xs), n = xs.length;
    const xb = xs.map(x => x >= med ? 1 : 0);
    const y0 = [], y1 = [];
    let c00 = 0, c01 = 0, c10 = 0, c11 = 0;
    for (let i = 0; i < n; i++) {
      if (xb[i] === 0) { y0.push(ys[i]); if (ys[i] === 0) c00++; else c01++; }
      else { y1.push(ys[i]); if (ys[i] === 0) c10++; else c11++; }
    }
    const ig = entropyBin(ys) - (y0.length / n) * entropyBin(y0) - (y1.length / n) * entropyBin(y1);
    const r0 = c00 + c01, r1 = c10 + c11, k0 = c00 + c10, k1 = c01 + c11;
    let chi2 = 0;
    [[c00, r0 * k0 / n], [c01, r0 * k1 / n], [c10, r1 * k0 / n], [c11, r1 * k1 / n]].forEach(([o, e]) => {
      if (e > 0) chi2 += (o - e) * (o - e) / e;
    });
    return { ig, chi2 };
  }

  function looKnn3(rows, featList) {
    const n = rows.length;
    let ok = 0;
    for (let i = 0; i < n; i++) {
      const ds = [];
      for (let j = 0; j < n; j++) {
        if (i === j) continue;
        let s = 0;
        featList.forEach(ft => { const d = rows[i][ft] - rows[j][ft]; s += d * d; });
        ds.push({ d: Math.sqrt(s), dm: rows[j].dm, idx: j });
      }
      ds.sort((a, b) => a.d - b.d || a.idx - b.idx);
      const yes = ds.slice(0, 3).filter(x => x.dm === 1).length;
      const pred = yes * 2 > 3 ? 1 : 0;
      if (pred === rows[i].dm) ok++;
    }
    return ok / n;
  }

  function analyze(rows, p) {
    const ys = rows.map(r => r.dm);
    const stats = FEATS.map((ft, idx) => {
      const xs = LAB.col(rows, ft);
      const corr = pearsonAbs(xs, ys);
      const { ig, chi2 } = igAndChi2(xs, ys);
      return { ft, idx, label: FLAB[ft], corr, ig, chi2 };
    });

    // Forward selection up to top features (or until no strict improvement)
    const selected = [];
    const rounds = [];
    let bestAcc = -1;
    const maxK = Math.max(1, Math.min(4, Math.round(p.top || 2)));
    for (let rd = 0; rd < maxK; rd++) {
      const cands = [];
      let bestCand = null;
      FEATS.forEach((ft, idx) => {
        if (selected.includes(ft)) return;
        const trial = selected.concat([ft]);
        const acc = looKnn3(rows, trial);
        const c = { ft, idx, label: FLAB[ft], acc };
        cands.push(c);
        if (!bestCand || acc > bestCand.acc + 1e-12) bestCand = c;
      });
      if (!bestCand || bestCand.acc <= bestAcc + 1e-12) break;
      bestAcc = bestCand.acc;
      selected.push(bestCand.ft);
      rounds.push({ round: rd + 1, cands, picked: bestCand, acc: bestAcc, subset: selected.slice() });
    }
    return { stats, rounds, selected, bestAcc };
  }

  function makeRows(seed) {
    const rs = LAB.data.clinic(seed, 14).map(pick);
    const negs = rs.filter(r => r.dm === 0).sort((a, b) => b.glu - a.glu);
    const poss = rs.filter(r => r.dm === 1).sort((a, b) => a.glu - b.glu);
    if (negs[0] && poss[0]) {
      negs[0].glu = Math.max(negs[0].glu, 134);
      negs[0].bmi = Math.min(negs[0].bmi, 22.5);
      poss[0].glu = Math.min(poss[0].glu, 112);
      poss[0].bmi = Math.max(poss[0].bmi, 29.8);
      poss[0].age = Math.max(poss[0].age, 64);
    }
    return rs;
  }

  LAB.register({
    id: 'A6', group: 'A', title: '特徵選擇',
    module: { name: 'M1 第 09 節', url: '../m1/#p09' },
    goal: '比較過濾法（相關係數、資訊增益）與包裹法（向前選擇＋LOO 驗證）如何挑出最有用的特徵子集。',
    data: {
      name: 'clinic_fs',
      scenario: '門診健檢：從年齡、BMI、空腹血糖、收縮壓 4 個特徵中，挑出預測糖尿病最關鍵的組合',
      columns: COLS,
      editable: ['age', 'bmi', 'glu', 'sbp', 'dm'],
      small: makeRows
    },
    params: [
      { key: 'method', label: '選擇方法', type: 'choice', value: 'corr', options: [{ v: 'corr', label: '相關係數' }, { v: 'ig', label: '資訊增益' }, { v: 'forward', label: '向前選擇' }] },
      { key: 'top', label: '目標特徵數', type: 'int', min: 1, max: 4, step: 1, value: 2 }
    ],
    pseudo: [
      '過濾法（Filter）：',
      '  逐特徵算與標籤的相關或資訊增益',
      '  依分數高低排序，取前 K 名',
      '向前選擇（Wrapper）：',
      '  從空集合出發，每輪試加一個特徵',
      '  用留一法 3-NN 算交叉驗證正確率',
      '  加入表現最好者，直到不再進步'
    ],
    build(rows, p) {
      const R = analyze(rows, p), steps = [];
      const topK = Math.max(1, Math.min(4, Math.round(p.top || 2)));

      function views(st) {
        const keyScore = p.method === 'ig' ? 'ig' : 'corr';
        let items = R.stats.map((s, i) => ({
          id: s.ft,
          label: s.label,
          value: i < st.shown ? s[keyScore] : 0,
          cls: st.pickedSet.has(s.ft) ? 'good' : (i < st.shown ? 'c0' : 'c5'),
          hl: st.curFt === s.ft
        }));
        if (st.sorted) items = items.slice().sort((a, b) => b.value - a.value);
        const main = {
          type: 'bars', slot: 'main',
          title: p.method === 'ig' ? '各特徵資訊增益 (以中位數二分)' : (p.method === 'forward' ? '各特徵單變量參考 |r|（綠＝向前選擇已選入）' : '各特徵與糖尿病的相關係數 |r|'),
          max: 1, digits: 3, items
        };
        const side = {
          type: 'table', slot: 'side',
          title: st.tblTitle || '向前選擇每輪候選正確率',
          cols: [
            { key: 'ft', label: '候選特徵' },
            { key: 'acc', label: 'LOO 正確率', num: true, digits: 3 }
          ],
          rows: (st.tblRows || []).map(c => ({ id: c.ft, cells: [c.label, c.acc], hl: st.bestFt === c.ft }))
        };
        const line = {
          type: 'line', slot: 'bottom',
          title: '向前選擇：特徵數 vs LOO 正確率',
          axes: { x: { label: '選入特徵數', min: 1, max: 4 }, y: { label: 'LOO 正確率', min: 0.4, max: 1.0 } },
          series: [
            { id: 'base', label: '隨機基準', pts: [[1, 0.5], [4, 0.5]], cls: 'c5', dash: true, dots: false },
            { id: 'acc', label: 'LOO 正確率', pts: st.curve.length ? st.curve : [[1, R.rounds[0] ? R.rounds[0].acc : 0.5]], cls: 'c1', dots: true }
          ],
          marker: st.curve.length ? { x: st.curve[st.curve.length - 1][0], y: st.curve[st.curve.length - 1][1], label: '目前' } : null
        };
        return [main, side, line];
      }

      const st = { shown: 0, sorted: false, curFt: null, pickedSet: new Set(), tblTitle: '向前選擇每輪候選正確率', tblRows: [], bestFt: null, curve: [] };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '題目', '門診資料有年齡、BMI、空腹血糖、收縮壓 4 個特徵。用過濾法或向前選擇，找出最值得留下的特徵。', [
        '病人數 = ' + rows.length + '，目標選取上限 = ' + topK + ' 個特徵'
      ]);

      R.stats.forEach((s, i) => {
        st.shown = i + 1; st.curFt = s.ft;
        add(2, '計算：' + s.label, '計算「' + s.label + '」與糖尿病標籤的點二列相關 |r| 與中位數二分資訊增益。', [
          FLAB[s.ft] + '：|r| = ' + f(s.corr, 3) + '，資訊增益 = ' + f(s.ig, 3) + '，卡方 = ' + f(s.chi2, 2)
        ]);
      });

      st.curFt = null; st.sorted = true;
      const filterRanked = R.stats.slice().sort((a, b) => (p.method === 'ig' ? b.ig - a.ig : b.corr - a.corr));
      if (p.method !== 'forward') {
        st.pickedSet = new Set(filterRanked.slice(0, topK).map(s => s.ft));
      }
      add(3, '過濾法排名完成', '依分數由高到低排好。過濾法計算極快，但只單獨看每個特徵，不知道兩個特徵搭在一起會不會重複。', [
        '前 ' + topK + ' 名：' + filterRanked.slice(0, topK).map(s => s.label).join('、')
      ]);

      // 顯示向前選擇過程
      R.rounds.forEach((rd, idx) => {
        st.tblTitle = '第 ' + rd.round + ' 輪向前選擇候選';
        st.tblRows = rd.cands;
        st.bestFt = rd.picked.ft;
        if (p.method === 'forward') st.pickedSet = new Set(rd.subset);
        st.curve = R.rounds.slice(0, idx + 1).map(x => [x.round, x.acc]);
        add(6, '向前選擇第 ' + rd.round + ' 輪', '試著把每個還沒選入的特徵加進來跑留一法 3-NN，挑選正確率提升最多的。', [
          '選入「' + rd.picked.label + '」，目前組合：' + rd.subset.map(x => FLAB[x]).join('＋'),
          'LOO 正確率 = ' + LAB.pct(rd.acc, 1)
        ]);
      });

      if (R.rounds.length < topK) {
        add(7, '提前停止', '再多加任何剩餘特徵都無法讓 LOO 正確率嚴格提高，向前選擇提前結束。', [
          '最終子集：' + R.selected.map(x => FLAB[x]).join('、') + '（正確率 ' + LAB.pct(R.bestAcc, 1) + '）'
        ]);
      }

      while (steps.length < 10) {
        add(7, '過濾法 vs 包裹法', '過濾法速度快、與模型無關；向前選擇直接用目標模型評估組合效果，較能避開冗餘特徵，但計算量隨特徵數平方成長。', [
          '過濾法前 ' + topK + '：' + filterRanked.slice(0, topK).map(s => s.label).join('、'),
          '向前選擇：' + R.selected.map(x => FLAB[x]).join('、') + '（' + LAB.pct(R.bestAcc, 1) + '）'
        ]);
      }
      return steps;
    },

    keys(steps, rows, p) {
      const R = analyze(rows, p);
      const k = {
        n_fwd_selected: R.selected.length,
        fwd_best_acc: R.bestAcc
      };
      R.stats.forEach(s => {
        k['corr_' + s.ft] = s.corr;
        k['ig_' + s.ft] = s.ig;
        k['chi2_' + s.ft] = s.chi2;
      });
      R.rounds.forEach((rd, idx) => {
        k['fwd_r' + (idx + 1) + '_feat'] = rd.picked.idx;
        k['fwd_r' + (idx + 1) + '_acc'] = rd.acc;
      });
      return k;
    },

    explain(steps, rows, p) {
      const R = analyze(rows, p);
      const topCorr = R.stats.slice().sort((a, b) => b.corr - a.corr)[0];
      return [
        '單變數過濾法中，與糖尿病相關性最高的是「' + topCorr.label + '」（|r| = ' + f(topCorr.corr, 3) + '、資訊增益 = ' + f(topCorr.ig, 3) + '）。',
        '改用向前選擇（留一法 3-NN）依序挑出「' + R.selected.map(x => FLAB[x]).join(' → ') + '」，最高 LOO 正確率達 ' + LAB.pct(R.bestAcc, 1) + '。',
        '過濾法不會偵測特徵之間的共線性與冗餘；包裹法能考慮特徵互補，但必須小心在有限樣本上過度挑選導致過擬合。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Set Role', 'Weight by Correlation', 'Weight by Information Gain', 'Forward Selection'],
      params: [
        ['Set Role › dm', 'label'],
        ['Select by Weights › k', p => String(p.top)]
      ],
      note: 'AI Studio 的 Weight by Information Gain / Chi Squared 離散化方式與本實驗（中位數二分）可能不同；Forward Selection 內可放 Cross Validation + k-NN。',
      expect: (steps, rows, p) => {
        const R = analyze(rows, p);
        return ['向前選擇子集：' + R.selected.join(', ') + '（LOO 正確率 ' + LAB.pct(R.bestAcc, 1) + '）'];
      },
      python: `from sklearn.model_selection import LeaveOneOut\nfrom sklearn.neighbors import KNeighborsClassifier`,
      confirmed: false
    }
  });
})();
