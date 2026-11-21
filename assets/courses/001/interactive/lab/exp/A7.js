/* A7 IQR 離群值偵測與 Winsorizing */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = LAB.data.columns('clinic', ['bmi', 'sbp'], { sbp: 'y' });
  const AX = { x: { label: 'BMI (kg/m²)', min: 17, max: 39 }, y: { label: '收縮壓 (mmHg)', min: 90, max: 225 } };

  function makeRows(seed) {
    const r = LAB.rng(1700 + seed);
    const bmis = [20.5, 22.0, 23.4, 24.8, 26.1, 27.3, 28.5, 29.8, 31.0, 32.4, 34.0, 35.5];
    const rows = bmis.map((b, i) => ({
      id: i + 1,
      bmi: Math.round((b + (r() - 0.5) * 0.6) * 10) / 10,
      sbp: Math.round(70 + 2.15 * b + (r() - 0.5) * 10)
    }));
    // 加入一個離群高血壓個案（量測異常或急性高血壓危機）
    rows[1].sbp = Math.round(206 + r() * 10);
    return rows;
  }

  function quantile(sorted, q) {
    const pos = (sorted.length - 1) * q;
    const lo = Math.floor(pos), hi = Math.ceil(pos);
    return sorted[lo] + (sorted[hi] - sorted[lo]) * (pos - lo);
  }

  function fitOLS(rows) {
    const xs = rows.map(r => r.bmi), ys = rows.map(r => r.sbp);
    const mx = M.mean(xs), my = M.mean(ys);
    const sxx = M.sum(xs.map(x => (x - mx) ** 2));
    const sxy = M.sum(xs.map((x, i) => (x - mx) * (ys[i] - my)));
    const w = sxx > 0 ? sxy / sxx : 0;
    const b = my - w * mx;
    return { w, b };
  }

  function analyze(rows, p) {
    const k = p.iqr_k || 1.5;
    const sorted = rows.map(r => r.sbp).slice().sort((a, b) => a - b);
    const q1 = quantile(sorted, 0.25);
    const q3 = quantile(sorted, 0.75);
    const iqr = q3 - q1;
    const lo = q1 - k * iqr;
    const hi = q3 + k * iqr;

    const flags = rows.map(r => r.sbp < lo || r.sbp > hi);
    const sbps = rows.map(r => r.sbp);
    const meanSbp = M.mean(sbps), sdSbp = M.sd(sbps) || 1;
    const zHi = meanSbp + 3 * sdSbp;
    const zFlags = rows.map(r => Math.abs((r.sbp - meanSbp) / sdSbp) > 3);
    const olsOrig = fitOLS(rows);

    const rowsDrop = rows.filter((_, i) => !flags[i]);
    const olsDrop = rowsDrop.length >= 2 ? fitOLS(rowsDrop) : olsOrig;

    const rowsCap = rows.map((r, i) => ({
      id: r.id, bmi: r.bmi,
      sbp: r.sbp > hi ? hi : (r.sbp < lo ? lo : r.sbp)
    }));
    const olsCap = fitOLS(rowsCap);

    return { k, sorted, q1, q3, iqr, lo, hi, flags, meanSbp, sdSbp, zHi, zFlags, olsOrig, rowsDrop, olsDrop, rowsCap, olsCap };
  }

  LAB.register({
    id: 'A7', group: 'A', title: 'IQR 離群值與縮尾',
    module: { name: 'M1 第 07 節', url: '../m1/#p07' },
    goal: '用四分位距 (Q1, Q3, IQR) 找出超過上下圍籬 (Fence) 的極端血壓，比較「直接刪除 (Drop)」與「縮尾截斷 (Winsorizing)」對迴歸斜率的搶救效果。',
    data: {
      name: 'clinic_outlier',
      scenario: '門診健檢：12 位病人（含 1 位收縮壓 > 200 的極端值），觀察離群值處理前後變化',
      columns: COLS,
      editable: ['bmi', 'sbp'],
      small: makeRows
    },
    params: [
      { key: 'method', label: '處理方式', type: 'choice', value: 'winsor', options: [{ v: 'drop', label: '直接刪除 (Drop)' }, { v: 'winsor', label: '縮尾截斷 (Winsorize)' }] },
      { key: 'iqr_k', label: 'IQR 倍數 k', type: 'num', min: 1.0, max: 2.5, step: 0.25, value: 1.5 }
    ],
    pseudo: [
      '將收縮壓排序並算 Q1、Q3',
      '計算四分位距 IQR = Q3 − Q1',
      '上下圍籬 = Q1−k·IQR 與 Q3+k·IQR',
      '標出超出圍籬的離群病人',
      '處理離群值（刪除 或 縮尾截斷）',
      '比較處理前後線性迴歸斜率變化'
    ],
    build(rows, p) {
      const R = analyze(rows, p), steps = [];
      const isWin = p.method === 'winsor';
      const olsAfter = isWin ? R.olsCap : R.olsDrop;

      function views(st) {
        const curRows = st.applied ? (isWin ? R.rowsCap : R.rowsDrop) : rows;
        const points = rows.map((r, i) => {
          const isOut = R.flags[i];
          const yShow = st.applied && isWin && isOut ? R.rowsCap[i].sbp : r.sbp;
          return {
            id: 'p' + r.id, x: r.bmi, y: yShow,
            cls: isOut ? 'c1' : 'c0',
            dim: st.applied && !isWin && isOut,
            ring: st.showFence && isOut,
            label: String(r.id), r: 6
          };
        });
        const lines = [];
        if (st.showQuartiles) {
          lines.push({ id: 'q1', x1: AX.x.min, y1: R.q1, x2: AX.x.max, y2: R.q1, cls: 'c2', dash: true, w: 1.4, label: 'Q1=' + f(R.q1, 1) });
          lines.push({ id: 'q3', x1: AX.x.min, y1: R.q3, x2: AX.x.max, y2: R.q3, cls: 'c2', dash: true, w: 1.4, label: 'Q3=' + f(R.q3, 1) });
        }
        if (st.showFence) {
          lines.push({ id: 'fhi', x1: AX.x.min, y1: R.hi, x2: AX.x.max, y2: R.hi, cls: 'hl', dash: true, w: 1.8, label: '上圍籬=' + f(R.hi, 1) });
          if (R.lo >= AX.y.min) lines.push({ id: 'flo', x1: AX.x.min, y1: R.lo, x2: AX.x.max, y2: R.lo, cls: 'hl', dash: true, w: 1.5, label: '下圍籬=' + f(R.lo, 1) });
        }
        if (st.showOrigLine) {
          lines.push({ id: 'lo', x1: AX.x.min, y1: R.olsOrig.w * AX.x.min + R.olsOrig.b, x2: AX.x.max, y2: R.olsOrig.w * AX.x.max + R.olsOrig.b, cls: 'c4', dash: st.applied, w: 2, label: '處理前斜率=' + f(R.olsOrig.w, 2) });
        }
        if (st.showZMask) {
          const zy = Math.min(AX.y.max - 2, R.zHi);
          lines.push({ id: 'zhi', x1: AX.x.min, y1: zy, x2: AX.x.max, y2: zy, cls: 'c5', dash: true, w: 1.8, label: 'μ+3σ=' + f(R.zHi, 1) });
        }
        if (st.applied) {
          lines.push({ id: 'la', x1: AX.x.min, y1: olsAfter.w * AX.x.min + olsAfter.b, x2: AX.x.max, y2: olsAfter.w * AX.x.max + olsAfter.b, cls: 'good', w: 2.5, label: '處理後斜率=' + f(olsAfter.w, 2) });
          if (isWin) {
            rows.forEach((r, i) => {
              if (R.flags[i]) lines.push({ id: 'cap' + r.id, x1: r.bmi, y1: r.sbp, x2: r.bmi, y2: R.rowsCap[i].sbp, cls: 'hl', dash: true, w: 1.8 });
            });
          }
        }
        const regions = st.showFence ? LAB.grid((_, y) => (y >= R.lo && y <= R.hi ? 'good' : 'c4'), AX.x.min, AX.x.max, AX.y.min, AX.y.max, 18, 22) : null;
        const main = {
          type: 'scatter', slot: 'main',
          title: 'BMI × 收縮壓（安全區間與迴歸斜率對比）',
          axes: AX, points, lines, circles: [], regions,
          legend: [{ cls: 'c0', label: '正常病人' }, { cls: 'c1', label: '離群病人' }, { cls: 'c4', shape: 'line', label: '處理前直線' }, { cls: 'good', shape: 'line', label: '處理後直線' }]
        };
        const side = {
          type: 'table', slot: 'side',
          title: '離群值判定與處理對照表',
          cols: [
            { key: 'id', label: '#' },
            { key: 'orig', label: '原血壓', num: true, digits: 0 },
            { key: 'stat', label: '狀態' },
            { key: 'aft', label: '處理後', num: true, digits: 1 }
          ],
          rows: rows.map((r, i) => ({
            id: r.id,
            cells: [
              r.id, r.sbp,
              st.showFence ? { v: R.flags[i] ? '離群' : '正常', cls: R.flags[i] ? 'bad' : 'good' } : null,
              st.applied ? (R.flags[i] ? (isWin ? R.rowsCap[i].sbp : null) : r.sbp) : null
            ],
            hl: st.showFence && R.flags[i],
            dim: st.applied && !isWin && R.flags[i]
          }))
        };
        const bottom = {
          type: 'bars', slot: 'bottom',
          title: 'BMI → 收縮壓迴歸斜率比較（正常應為正斜率 ≈ +2.1）',
          max: Math.max(3, Math.abs(R.olsOrig.w) * 1.2, Math.abs(olsAfter.w) * 1.2),
          digits: 2,
          items: [
            { id: 'orig', label: '處理前斜率 (' + f(R.olsOrig.w, 2) + ')', value: Math.abs(R.olsOrig.w), cls: 'c4' },
            { id: 'drop', label: '刪除法 (' + f(R.olsDrop.w, 2) + ')', value: st.applied ? Math.abs(R.olsDrop.w) : 0, cls: 'c0' },
            { id: 'win', label: '縮尾法 (' + f(R.olsCap.w, 2) + ')', value: st.applied ? Math.abs(R.olsCap.w) : 0, cls: 'good' }
          ]
        };
        return [main, side, bottom];
      }

      const st = { showQuartiles: false, showFence: false, showOrigLine: false, showZMask: false, applied: false };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '題目', '12 位門診病人中有一位血壓高達 ' + M.max(rows.map(r => r.sbp)) + ' mmHg 的極端值，看看它如何嚴重扭曲資料規律。', [
        '將收縮壓由小到大排序共 ' + rows.length + ' 筆'
      ]);
      st.showQuartiles = true;
      add(0, '計算四分位數 Q1 與 Q3', '取第 25 百分位 Q1 與第 75 百分位 Q3（圖中藍虛線），中間 50% 病人的血壓落在此盒狀區間。', [
        'Q1 = ' + f(R.q1, 2) + '，Q3 = ' + f(R.q3, 2)
      ]);
      add(1, '計算四分位距 IQR', 'IQR = Q3 − Q1，用來衡量中間一半資料的分散寬度（不受極端值影響）。', [
        'IQR = ' + f(R.q3, 2) + ' − ' + f(R.q1, 2) + ' = ' + f(R.iqr, 2)
      ]);

      st.showFence = true;
      const nOut = R.flags.filter(Boolean).length;
      add(2, '畫出上下圍籬', '設定倍數 k = ' + f(R.k, 2) + '，上下圍籬為 Q1 − k·IQR 與 Q3 + k·IQR。', [
        '下圍籬 = ' + f(R.lo, 2) + '｜上圍籬 = ' + f(R.hi, 2)
      ]);
      add(3, '標記離群值', '共有 ' + nOut + ' 位病人超出圍籬（黃圈標記），屬於統計離群值。', [
        '離群病人：' + (rows.filter((_, i) => R.flags[i]).map(r => '#' + r.id).join('、') || '無')
      ]);

      st.showOrigLine = true;
      add(5, '處理前的迴歸線（被拉偏）', '如果不處理離群值直接算線性迴歸，單一極端點就把整條直線的斜率拉偏了！', [
        '處理前斜率 w = ' + f(R.olsOrig.w, 3) + '（含極端值；處理後再比較）'
      ]);

      st.applied = true;
      add(4, isWin ? '套用縮尾截斷' : '套用刪除法', isWin ? '縮尾法不丟掉病人，而是把超出上圍籬的血壓壓回上圍籬 ' + f(R.hi, 1) + '，保留樣本數。' : '刪除法直接把離群病人移出資料集，樣本數減少為 ' + R.rowsDrop.length + ' 筆。', [
        '處理後斜率 w = ' + f(olsAfter.w, 3) + '（處理前 ' + f(R.olsOrig.w, 3) + '，差 ' + f(Math.abs(olsAfter.w - R.olsOrig.w), 3) + '）'
      ]);

      st.showZMask = true;
      const nZOut = R.zFlags.filter(Boolean).length;
      const maxSbp = M.max(rows.map(r => r.sbp));
      add(3, 'Z 分數 ±3σ 遮蔽效應', (nZOut < nOut ? '改用「平均 ± 3σ」檢驗時，極端值把 μ 與 σ 撐大到 μ+3σ=' + f(R.zHi, 1) + '，只抓出 ' + nZOut + ' 筆（遮蔽效應）！' : '改用「平均 ± 3σ」時，極端值也把 μ+3σ 撐高到 ' + f(R.zHi, 1) + '；本例兩法都抓到 ' + nZOut + ' 筆，但極端值再多一個就可能被遮蔽。'), [
        'μ = ' + f(R.meanSbp, 1) + '，σ = ' + f(R.sdSbp, 1) + ' → μ+3σ = ' + f(R.zHi, 1),
        '最大血壓 ' + maxSbp + '：IQR 抓 ' + nOut + ' 筆 vs |Z|>3 抓 ' + nZOut + ' 筆'
      ]);

      add(5, '刪除 vs 縮尾取捨', '若確認是儀器打錯字應「刪除」；若是真實重症個案且樣本數珍貴，實務常優先用「縮尾截斷」保留其他欄位資訊。', [
        '刪除後斜率 = ' + f(R.olsDrop.w, 3) + '（剩 ' + R.rowsDrop.length + ' 筆）',
        '縮尾後斜率 = ' + f(R.olsCap.w, 3) + '（保留全部 ' + rows.length + ' 筆）'
      ]);

      add(5, '臨床判讀與防洩漏', '切記：Q1、Q3 與上下圍籬只能用「訓練集」計算，再套用至測試集截斷，不可在切分前用全資料算（見 A10）。', [
        '上圍籬 = ' + f(R.hi, 1) + ' mmHg（訓練集 fit → 測試集 clip）'
      ]);
      return steps;
    },

    keys(steps, rows, p) {
      const R = analyze(rows, p);
      return {
        q1: R.q1, q3: R.q3, iqr: R.iqr, lo: R.lo, hi: R.hi,
        n_outliers: R.flags.filter(Boolean).length,
        w_orig: R.olsOrig.w, w_drop: R.olsDrop.w, w_winsor: R.olsCap.w
      };
    },

    explain(steps, rows, p) {
      const R = analyze(rows, p);
      return [
        '四分位距 IQR = ' + f(R.iqr, 2) + '（Q1=' + f(R.q1, 1) + '、Q3=' + f(R.q3, 1) + '），在 k=' + f(R.k, 2) + ' 倍下上圍籬為 ' + f(R.hi, 1) + ' mmHg，共有 ' + R.flags.filter(Boolean).length + ' 筆超出。',
        '處理前極端值將 BMI→收縮壓斜率拉偏為 ' + f(R.olsOrig.w, 2) + '；經刪除法後恢復為 ' + f(R.olsDrop.w, 2) + '，縮尾法後為 ' + f(R.olsCap.w, 2) + '。',
        'IQR 與中位數一樣對極端值具有高度穩健性，不會像「平均數 ± 3 倍標準差」那樣被離群值本身拉寬界線而漏抓（Masking Effect）。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Detect Outlier (Distances)', 'Filter Examples', 'Generate Attributes'],
      params: [
        ['Detect Outlier / Filter Examples', '過濾或以 Generate Attributes 做 min/max 截斷 (Winsorizing)']
      ],
      note: 'AI Studio 內建 Detect Outlier (Distances / Densities) 可標記離群值，搭配 Filter Examples（刪除）或 Generate Attributes（縮尾截斷）即可完成前處理。',
      expect: (steps, rows, p) => {
        const R = analyze(rows, p);
        return ['偵測到 ' + R.flags.filter(Boolean).length + ' 筆離群值，縮尾後斜率 = ' + f(R.olsCap.w, 3)];
      },
      python: 'q1, q3 = np.percentile(y, [25, 75])\niqr = q3 - q1\nhi = q3 + 1.5 * iqr\ny_winsor = np.clip(y, q1 - 1.5 * iqr, hi)',
      confirmed: false
    }
  });
})();
