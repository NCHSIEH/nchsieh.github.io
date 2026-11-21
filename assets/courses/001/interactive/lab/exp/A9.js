/* A9 衍生特徵與共線性 VIF */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = [
    { key: 'ht', label: '身高', unit: 'cm', type: 'num', min: 145, max: 190, step: 1, role: 'x' },
    { key: 'wt', label: '體重', unit: 'kg', type: 'num', min: 42, max: 115, step: 1, role: 'x' },
    { key: 'waist', label: '腰圍', unit: 'cm', type: 'num', min: 62, max: 118, step: 1, role: 'x' },
    { key: 'age', label: '年齡', unit: '歲', type: 'num', min: 25, max: 85, step: 1, role: 'x' },
    { key: 'dm', label: '糖尿病', type: 'cat', levels: ['否', '是'], codes: ['no', 'yes'], role: 'y' }
  ];

  function makeRows(seed) {
    const r = LAB.rng(8901 + seed);
    const hts = [156, 162, 168, 172, 158, 165, 175, 160, 170, 164, 178, 166];
    const bmis = [20.2, 21.8, 23.1, 24.5, 25.8, 27.2, 28.4, 29.6, 31.0, 32.5, 22.4, 30.2];
    return hts.map((ht, i) => {
      const bmiTrue = bmis[i] + (r() - 0.5) * 0.6;
      const wt = Math.round(bmiTrue * ((ht / 100) ** 2) * 10) / 10;
      const waist = Math.round((42 + 1.65 * bmiTrue + (r() - 0.5) * 2.2) * 10) / 10;
      const age = Math.round(34 + i * 3.8 + (r() - 0.5) * 4);
      const dm = (bmiTrue * 1.2 + age * 0.35 > 52) ? 1 : 0;
      return { id: i + 1, ht, wt, waist, age, dm };
    });
  }

  function corr(xs, ys) {
    const mx = M.mean(xs), my = M.mean(ys);
    let num = 0, dx2 = 0, dy2 = 0;
    for (let i = 0; i < xs.length; i++) {
      const dx = xs[i] - mx, dy = ys[i] - my;
      num += dx * dy; dx2 += dx * dx; dy2 += dy * dy;
    }
    return (dx2 > 0 && dy2 > 0) ? num / Math.sqrt(dx2 * dy2) : 0;
  }

  // 解小維度線性方程組求 R² 與 VIF = 1 / (1 - R²)
  function solveLinear(A, b) {
    const m = A.length;
    const Maug = A.map((row, i) => row.slice().concat([b[i]]));
    for (let k = 0; k < m; k++) {
      let piv = k;
      for (let i = k + 1; i < m; i++) if (Math.abs(Maug[i][k]) > Math.abs(Maug[piv][k])) piv = i;
      const tmp = Maug[k]; Maug[k] = Maug[piv]; Maug[piv] = tmp;
      const div = Maug[k][k] || 1e-9;
      for (let j = k; j <= m; j++) Maug[k][j] /= div;
      for (let i = 0; i < m; i++) {
        if (i === k) continue;
        const fac = Maug[i][k];
        for (let j = k; j <= m; j++) Maug[i][j] -= fac * Maug[k][j];
      }
    }
    return Maug.map(row => row[m]);
  }

  /* VIF_j = 相關矩陣反矩陣的第 j 個對角元（等同「第 j 欄對其他欄做迴歸的 1/(1−R²)」），不設上限 */
  function computeVifs(featMap, keys) {
    const k = keys.length;
    if (k <= 1) return keys.map(fk => ({ key: fk, r2: 0, vif: 1 }));
    const Z = {};
    keys.forEach(fk => {
      const xs = featMap[fk], m = M.mean(xs), s = M.sd(xs) || 1;
      Z[fk] = xs.map(v => (v - m) / s);
    });
    const C = M.range(k, i => M.range(k, j => corr(Z[keys[i]], Z[keys[j]])));
    const cols = M.range(k, j => solveLinear(C, M.range(k, i => (i === j ? 1 : 0))));
    return keys.map((key, i) => { const v = Math.max(1, cols[i][i]); return { key, r2: 1 - 1 / v, vif: v }; });
  }

  function analyze(rows, p) {
    const maxVif = p.vif_th || 5;
    const ys = rows.map(r => r.dm);
    const enriched = rows.map(r => {
      const bmi = r.wt / ((r.ht / 100) ** 2);
      const interact = (r.age * bmi) / 100;
      return Object.assign({ bmi, interact }, r);
    });

    const ALL_FEATS = [
      { key: 'ht', label: '身高', kind: '原始' },
      { key: 'wt', label: '體重', kind: '原始' },
      { key: 'waist', label: '腰圍', kind: '原始' },
      { key: 'age', label: '年齡', kind: '原始' },
      { key: 'bmi', label: '衍生 BMI', kind: '比率 wt/ht²' },
      { key: 'interact', label: '年齡×BMI', kind: '交互作用項' }
    ];
    const featMap = {};
    ALL_FEATS.forEach(fObj => { featMap[fObj.key] = enriched.map(r => r[fObj.key]); });

    const corY = {};
    ALL_FEATS.forEach(fObj => { corY[fObj.key] = Math.abs(corr(featMap[fObj.key], ys)); });

    const corrMat = ALL_FEATS.map(a => ALL_FEATS.map(b => corr(featMap[a.key], featMap[b.key])));

    // 計算全特徵 VIF，接著逐步剔除與 BMI 共線且超過 maxVif 的冗餘原始欄位（優先保留衍生 BMI 與年齡）
    const fullKeys = ALL_FEATS.map(fObj => fObj.key);
    const vifsFull = computeVifs(featMap, fullKeys);

    let activeKeys = fullKeys.slice();
    const dropOrder = ['wt', 'waist', 'interact', 'ht'];
    const rounds = [{ step: 0, dropped: null, vifs: vifsFull, keys: activeKeys.slice() }];

    for (const cand of dropOrder) {
      const curVifs = computeVifs(featMap, activeKeys);
      const maxNow = Math.max.apply(null, curVifs.map(v => v.vif));
      if (maxNow <= maxVif || activeKeys.length <= 2) break;
      const candV = curVifs.find(v => v.key === cand);
      if (candV && candV.vif > maxVif) {
        activeKeys = activeKeys.filter(k => k !== cand);
        rounds.push({ step: rounds.length, dropped: cand, vifs: computeVifs(featMap, activeKeys), keys: activeKeys.slice() });
      }
    }

    const finVifs = rounds[rounds.length - 1].vifs;
    return { maxVif, enriched, ALL_FEATS, featMap, corY, corrMat, vifsFull, rounds, finVifs, activeKeys };
  }

  LAB.register({
    id: 'A9', group: 'A', title: '衍生特徵與共線性 VIF',
    module: { name: 'M1 第 09 節', url: '../m1/#p09' },
    goal: '看懂如何從身高、體重建構非線性衍生特徵（BMI 與交互項）提升預測力，並用變異數膨脹因子 VIF = 1/(1−R²) 診斷與剔除多重共線性欄位。',
    data: {
      name: 'clinic_vif',
      scenario: '門診代謝篩檢：由身高、體重衍生 BMI 與交互項後，與腰圍產生高度共線性，需用 VIF 篩除冗餘欄位',
      columns: COLS,
      editable: ['ht', 'wt', 'waist', 'age'],
      small: makeRows
    },
    params: [
      { key: 'vif_th', label: 'VIF 警戒門檻', type: 'choice', value: 5, options: [
        { v: 5, label: '嚴格門檻 (VIF ≤ 5)' },
        { v: 10, label: '一般門檻 (VIF ≤ 10)' }
      ] }
    ],
    pseudo: [
      '建構領域衍生特徵：',
      '  比率：BMI = 體重÷(身高/100)²',
      '  交互：年齡 × BMI ÷ 100',
      '計算成對相關矩陣檢查重疊',
      '對各特徵用其餘欄迴歸求 R_j²',
      '算 VIF_j = 1 ÷ (1 − R_j²)',
      '迭代剔除 VIF 超標之共線欄位'
    ],
    build(rows, p) {
      const R = analyze(rows, p), steps = [];

      function views(st) {
        const rd = R.rounds[Math.min(st.roundIdx, R.rounds.length - 1)];
        const vifMap = {};
        rd.vifs.forEach(v => { vifMap[v.key] = v; });

        const main = {
          type: 'bars', slot: 'main',
          title: st.showVif
            ? ('各特徵變異數膨脹因子 VIF（門檻 ≤ ' + R.maxVif + '，淘汰後即時下降）')
            : '各特徵與糖尿病的相關係數 |r|（建構衍生特徵前後對照）',
          max: st.showVif ? Math.max(15, Math.min(40, Math.max.apply(null, R.vifsFull.map(v => v.vif)))) : 1,
          digits: st.showVif ? 2 : 3,
          items: R.ALL_FEATS.map(fObj => {
            const vObj = vifMap[fObj.key];
            const val = st.showVif ? (vObj ? Math.min(40, vObj.vif) : 0) : R.corY[fObj.key];
            return {
              id: fObj.key,
              label: fObj.label + (st.showVif && !vObj ? ' (已剔除)' : ''),
              value: val,
              note: st.showVif ? (vObj ? 'VIF=' + f(vObj.vif, 1) : '已剔除') : '|r|=' + f(R.corY[fObj.key], 3),
              cls: !st.showVif ? 'c0' : (!vObj ? 'c5' : (vObj.vif > R.maxVif ? 'bad' : 'good')),
              hl: st.hlKey === fObj.key,
              dim: st.showVif && !vObj
            };
          })
        };
        const side = {
          type: 'matrix', slot: 'side',
          title: '6 個特徵成對相關係數矩陣 R',
          rowLabels: R.ALL_FEATS.map(x => x.label),
          colLabels: ['高', '重', '腰', '齡', 'BMI', '交'],
          values: R.corrMat,
          digits: 2, heat: 'div'
        };
        const bottom = {
          type: 'table', slot: 'bottom',
          title: '衍生特徵預測力 |r| 與共線性 VIF 診斷表',
          cols: [
            { key: 'ft', label: '特徵名稱' },
            { key: 'kd', label: '特徵類型' },
            { key: 'ry', label: '對糖尿病 |r|', num: true, digits: 3 },
            { key: 'r2', label: '共線 R_j²', num: true, digits: 3 },
            { key: 'vif', label: 'VIF = 1/(1−R²)', num: true, digits: 2 },
            { key: 'st', label: '診斷狀態' }
          ],
          rows: R.ALL_FEATS.map(fObj => {
            const vObj = vifMap[fObj.key];
            return {
              id: 'r_' + fObj.key,
              cells: [
                fObj.label,
                fObj.kind,
                R.corY[fObj.key],
                st.showVif && vObj ? vObj.r2 : null,
                st.showVif && vObj ? vObj.vif : null,
                !st.showVif ? '待檢驗' : (!vObj ? { v: '已剔除冗餘', cls: 'cut' } : (vObj.vif > R.maxVif ? { v: '共線過高 (> ' + R.maxVif + ')', cls: 'bad' } : { v: '安全保留', cls: 'good' }))
              ],
              hl: st.hlKey === fObj.key,
              dim: st.showVif && !vObj
            };
          })
        };
        return [main, side, bottom];
      }

      const st = { showVif: false, roundIdx: 0, hlKey: null };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '1. 原始特徵預測力受限', '單看「身高」(|r|=' + f(R.corY.ht, 3) + ') 與「體重」(|r|=' + f(R.corY.wt, 3) + ')，無法直接反映肥胖程度，因為同樣 75 kg 在 155 cm 與 185 cm 意義完全不同。', [
        '身高與糖尿病 |r| = ' + f(R.corY.ht, 3) + '｜體重 |r| = ' + f(R.corY.wt, 3)
      ]);

      st.hlKey = 'bmi';
      add(2, '2. 建構比率特徵：BMI', '引入醫學領域知識，用非線性公式 BMI = 體重 ÷ (身高/100)² 組合兩欄，對糖尿病的相關性立刻躍升！', [
        '衍生 BMI 與糖尿病 |r| = ' + f(R.corY.bmi, 3) + '（顯著高於單看身高或體重）'
      ]);

      st.hlKey = 'interact';
      add(3, '3. 建構交互項：齡×BMI', '高齡合併高 BMI 的風險往往大於兩者單獨相加，乘積交互項 (Age × BMI) 與目標相關達 ' + f(R.corY.interact, 3) + '。', [
        '年齡×BMI 與糖尿病 |r| = ' + f(R.corY.interact, 3)
      ]);

      st.hlKey = 'waist';
      const rWb = R.corrMat[1][4], rWaistB = R.corrMat[2][4];
      add(4, '4. 檢視成對相關矩陣', '看右側相關矩陣熱圖：體重、腰圍與衍生 BMI 彼此高度正相關，代表它們攜帶高度重疊的資訊！', [
        'r(體重, BMI) = ' + f(rWb, 2) + '｜r(腰圍, BMI) = ' + f(rWaistB, 2)
      ]);

      st.hlKey = null; st.showVif = true; st.roundIdx = 0;
      const maxInit = Math.max.apply(null, R.vifsFull.map(v => v.vif));
      add(6, '5. 計算全特徵 VIF', '把原始欄與衍生欄全部放進模型後，因為 BMI 與體重、腰圍高度重疊（R² 接近 1），導致 VIF = 1/(1−R²) 暴衝至 ' + f(maxInit, 1) + '！', [
        '全放進迴歸時最大 VIF = ' + f(maxInit, 2) + ' ≫ 警戒門檻 ' + R.maxVif,
        '後果：線性／Logistic 迴歸係數標準誤膨脹、正負號可能反轉'
      ]);

      for (let ri = 1; ri < R.rounds.length; ri++) {
        const rd = R.rounds[ri];
        st.roundIdx = ri; st.hlKey = rd.dropped;
        const fLabel = R.ALL_FEATS.find(x => x.key === rd.dropped).label;
        const maxAfter = Math.max.apply(null, rd.vifs.map(v => v.vif));
        add(7, '剔除共線：' + fLabel, '因為資訊已被衍生特徵涵蓋，剔除「' + fLabel + '」後重新計算其餘欄位的 VIF，最大 VIF 降至 ' + f(maxAfter, 2) + '。', [
          '剔除：' + fLabel + ' → 剩餘 ' + rd.keys.length + ' 欄最大 VIF = ' + f(maxAfter, 2)
        ]);
      }

      st.hlKey = null;
      add(7, '完成無共線特徵集', '所有保留特徵的 VIF 皆 ≤ ' + R.maxVif + '，兼具衍生特徵的高預測力與迴歸係數的穩定可解釋性！', [
        '最終保留特徵：' + R.activeKeys.map(k => R.ALL_FEATS.find(x => x.key === k).label).join('、')
      ]);

      add(7, '線性 vs 樹模型差異', '線性／Logistic 迴歸受共線性影響極大（係數與 p 值失真）；隨機森林與 GBDT 預測不受影響，但特徵重要度會被瓜分。', [
        '需解釋勝算比 OR 時 → 必控 VIF ≤ 5'
      ]);

      add(7, '替代解：Ridge 與 PCA', '若不願手動刪欄位，也可用 Ridge L2 正則化（B2）平滑分攤共線係數，或用主成分分析 PCA（C5）壓成正交軸。', [
        '保留欄數 = ' + R.activeKeys.length + '｜門檻 VIF ≤ ' + R.maxVif
      ]);

      add(7, '先衍生、後篩選守則', '「先衍生、後篩選」：先用領域知識建構比率與交互項，再用 VIF（線性模型）或排列重要度（樹模型）刪除重疊原始欄。', [
        '最終最高 VIF = ' + f(Math.max.apply(null, R.finVifs.map(v => v.vif)), 2) + '（安全過關）'
      ]);
      return steps;
    },
    keys(steps, rows, p) {
      const R = analyze(rows, p);
      return {
        corr_ht: R.corY.ht, corr_wt: R.corY.wt, corr_bmi: R.corY.bmi, corr_interact: R.corY.interact,
        vif_bmi_full: R.vifsFull.find(v => v.key === 'bmi').vif,
        n_kept: R.activeKeys.length,
        max_vif_final: Math.max.apply(null, R.finVifs.map(v => v.vif))
      };
    },
    explain(steps, rows, p) {
      const R = analyze(rows, p);
      return [
        '單看身高（|r|=' + f(R.corY.ht, 3) + '）效果有限，但建構非線性比率特徵 BMI = wt/ht² 後，與糖尿病相關係數提升至 ' + f(R.corY.bmi, 3) + '。',
        '若同時保留身高、體重、腰圍、BMI 與年齡×BMI，特徵間高度共線使 BMI 的初始 VIF 達 ' + f(R.vifsFull.find(v => v.key === 'bmi').vif, 2) + '。',
        '依門檻 VIF ≤ ' + R.maxVif + ' 逐步剔除重疊欄位後，最終保留 ' + R.activeKeys.length + ' 個特徵，最高 VIF 降至 ' + f(Math.max.apply(null, R.finVifs.map(v => v.vif)), 2) + '。'
      ];
    },
    aistudio: {
      operators: ['Read CSV', 'Generate Attributes', 'Remove Correlated Attributes'],
      params: [
        ['Generate Attributes › bmi', 'wt / pow(ht / 100, 2)'],
        ['Remove Correlated Attributes › correlation', '0.85 (或於 Python 計算 VIF ≤ 5)']
      ],
      note: '線性迴歸與 Logistic 迴歸對多重共線性極度敏感，建模前務必檢查相關矩陣與 VIF < 5（或 < 10）。',
      expect: (steps, rows, p) => {
        const R = analyze(rows, p);
        return ['衍生 BMI 相關係數 = ' + f(R.corY.bmi, 3) + '，共線篩選後保留 ' + R.activeKeys.length + ' 欄'];
      },
      python: 'from statsmodels.stats.outliers_influence import variance_inflation_factor\nvif = [variance_inflation_factor(X.values, i) for i in range(X.shape[1])]',
      confirmed: false
    }
  });
})();
