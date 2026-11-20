/* B10 支持向量機 SVM */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = LAB.data.columns('clinic', ['bmi', 'glu', 'dm'], { dm: 'y' });
  const AX = { x: { label: 'BMI (kg/m²)', min: 15, max: 40 }, y: { label: '空腹血糖（mg/dL）', min: 60, max: 220 } };
  const pick = r => ({ id: r.id, bmi: r.bmi, glu: r.glu, dm: r.dm });
  const cls = dm => dm ? 'c1' : 'c0';

  function fitSVM(rows, p) {
    const n = rows.length;
    const bmis = LAB.col(rows, 'bmi'), glus = LAB.col(rows, 'glu');
    const mB = M.mean(bmis), sB = M.sd(bmis) || 1;
    const mG = M.mean(glus), sG = M.sd(glus) || 1;
    const Z = rows.map(r => [(r.bmi - mB) / sB, (r.glu - mG) / sG]);
    const Y = rows.map(r => r.dm === 1 ? 1 : -1);
    const C = parseFloat(p.C || '1');
    const isRbf = p.kernel === 'rbf';
    const gamma = 0.5;

    const K = M.range(n, i => M.range(n, j => {
      if (!isRbf) return Z[i][0] * Z[j][0] + Z[i][1] * Z[j][1];
      const d0 = Z[i][0] - Z[j][0], d1 = Z[i][1] - Z[j][1];
      return Math.exp(-gamma * (d0 * d0 + d1 * d1));
    }));

    const alpha = M.range(n, () => 0);
    let b = 0;

    const fAt = i => {
      let s = b;
      for (let j = 0; j < n; j++) s += alpha[j] * Y[j] * K[j][i];
      return s;
    };
    const dualObj = () => {
      let s1 = 0, s2 = 0;
      for (let i = 0; i < n; i++) {
        s1 += alpha[i];
        for (let j = 0; j < n; j++) s2 += alpha[i] * alpha[j] * Y[i] * Y[j] * K[i][j];
      }
      return s1 - 0.5 * s2;
    };
    const wVec = () => {
      let w1 = 0, w2 = 0;
      for (let i = 0; i < n; i++) { w1 += alpha[i] * Y[i] * Z[i][0]; w2 += alpha[i] * Y[i] * Z[i][1]; }
      return [w1, w2];
    };

    const snap = (tag, iIdx, jIdx) => {
      const w = wVec();
      const fVals = M.range(n, i => fAt(i));
      return { tag, iIdx, jIdx, alpha: alpha.slice(), b, w1: w[0], w2: w[1], obj: dualObj(), fVals };
    };

    const snaps = [snap('初始 α=0', -1, -1)];
    const tol = 1e-7, eps = 1e-9;
    let passes = 0, totalUpdates = 0;

    function tryPair(i, j, Ei) {
      if (i === j) return false;
      const Ej = fAt(j) - Y[j];
      const aiOld = alpha[i], ajOld = alpha[j];
      let L, H;
      if (Y[i] !== Y[j]) { L = Math.max(0, ajOld - aiOld); H = Math.min(C, C + ajOld - aiOld); }
      else { L = Math.max(0, aiOld + ajOld - C); H = Math.min(C, aiOld + ajOld); }
      if (L >= H - 1e-12) return false;
      const eta = 2 * K[i][j] - K[i][i] - K[j][j];
      if (eta >= -1e-12) return false;
      let ajNew = ajOld - Y[j] * (Ei - Ej) / eta;
      ajNew = M.clamp(ajNew, L, H);
      if (Math.abs(ajNew - ajOld) < eps * (ajNew + ajOld + eps)) return false;
      const aiNew = aiOld + Y[i] * Y[j] * (ajOld - ajNew);
      const b1 = b - Ei - Y[i] * (aiNew - aiOld) * K[i][i] - Y[j] * (ajNew - ajOld) * K[i][j];
      const b2 = b - Ej - Y[i] * (aiNew - aiOld) * K[i][j] - Y[j] * (ajNew - ajOld) * K[j][j];
      alpha[i] = aiNew;
      alpha[j] = ajNew;
      if (aiNew > 1e-8 && aiNew < C - 1e-8) b = b1;
      else if (ajNew > 1e-8 && ajNew < C - 1e-8) b = b2;
      else b = 0.5 * (b1 + b2);
      totalUpdates++;
      if (totalUpdates <= 4) snaps.push(snap('SMO 第 ' + totalUpdates + ' 次配對更新', i, j));
      return true;
    }

    while (passes < 400) {
      let numChanged = 0;
      for (let i = 0; i < n; i++) {
        const Ei = fAt(i) - Y[i];
        if ((Y[i] * Ei < -tol && alpha[i] < C - 1e-12) || (Y[i] * Ei > tol && alpha[i] > 1e-12)) {
          let bestJ = -1, bestDiff = -1;
          for (let k = 0; k < n; k++) {
            if (k === i) continue;
            const diff = Math.abs(Ei - (fAt(k) - Y[k]));
            if (diff > bestDiff) { bestDiff = diff; bestJ = k; }
          }
          let ok = bestJ >= 0 && tryPair(i, bestJ, Ei);
          if (!ok) {
            for (let k = 0; k < n; k++) {
              if (k !== i && alpha[k] > 1e-8 && alpha[k] < C - 1e-8 && tryPair(i, k, Ei)) { ok = true; break; }
            }
          }
          if (!ok) {
            for (let k = 0; k < n; k++) {
              if (k !== i && tryPair(i, k, Ei)) { ok = true; break; }
            }
          }
          if (ok) numChanged++;
        }
      }
      if (numChanged === 0) passes++; else passes = 0;
      if (passes >= 3 && totalUpdates > 0) break;
      if (totalUpdates > 50000) break;
    }

    // 精算 b（自由支持向量平均，否則 KKT 區間中點）
    const freeBs = [];
    for (let i = 0; i < n; i++) {
      if (alpha[i] > 1e-5 && alpha[i] < C - 1e-5) {
        let s = 0;
        for (let j = 0; j < n; j++) s += alpha[j] * Y[j] * K[j][i];
        freeBs.push(Y[i] - s);
      }
    }
    if (freeBs.length) b = M.mean(freeBs);

    const w = wVec();
    const wNorm = Math.hypot(w[0], w[1]);
    const marginWidth = wNorm > 1e-9 ? 2 / wNorm : 0;
    const svIds = rows.filter((_, i) => alpha[i] > 1e-4).map(r => r.id);
    const fin = snap('收斂完成', -1, -1);

    function predictXY(x, y) {
      const z1 = (x - mB) / sB, z2 = (y - mG) / sG;
      let s = b;
      for (let i = 0; i < n; i++) {
        if (alpha[i] <= 1e-9) continue;
        const kij = isRbf
          ? Math.exp(-gamma * ((Z[i][0] - z1) ** 2 + (Z[i][1] - z2) ** 2))
          : (Z[i][0] * z1 + Z[i][1] * z2);
        s += alpha[i] * Y[i] * kij;
      }
      return s;
    }

    return { mB, sB, mG, sG, C, isRbf, alpha, b, w1: w[0], w2: w[1], marginWidth, svIds, snaps, fin, Y, predictXY };
  }

  LAB.register({
    id: 'B10', group: 'B', title: '支持向量機 SVM',
    module: { name: 'M2-2 第 13 節', url: '../m2-2/#p13' },
    goal: '看懂支持向量機如何透過 SMO 最佳化找出間隔最寬的決策邊界，並觀察支持向量與懲罰參數 C、核函數的影響。',
    data: {
      name: 'clinic_svm',
      scenario: '門診健檢：用標準化後的 BMI 與空腹血糖區分糖尿病，尋找最大間隔分類線',
      columns: COLS,
      editable: ['bmi', 'glu', 'dm'],
      small: seed => LAB.data.clinic(seed, 12).map(pick)
    },
    params: [
      { key: 'C', label: '懲罰參數 C', type: 'choice', value: '1', options: [{ v: '0.1', label: '0.1' }, { v: '1', label: '1' }, { v: '10', label: '10' }, { v: '100', label: '100' }] },
      { key: 'kernel', label: '核函數 Kernel', type: 'choice', value: 'linear', options: [{ v: 'linear', label: '線性 (Linear)' }, { v: 'rbf', label: 'RBF (高斯)' }] }
    ],
    pseudo: [
      '把 BMI 與空腹血糖標準化',
      '初始化所有對偶乘數 αᵢ = 0',
      'SMO 座標上升反覆更新：',
      '  挑違反 KKT 條件的樣本 i',
      '  配對樣本 j 同步調整 αᵢ, αⱼ',
      '  更新截距 b',
      '找出 αᵢ > 0 的支持向量',
      '畫出最大間隔邊界或 RBF 區域'
    ],
    build(rows, p) {
      const R = fitSVM(rows, p), steps = [];

      function linLines(w1, w2, b) {
        if (R.isRbf || (Math.abs(w1) < 1e-6 && Math.abs(w2) < 1e-6)) return [];
        const makeL = (rhs, id, dash, label) => {
          if (Math.abs(w2) >= 1e-6) {
            const z1a = (AX.x.min - R.mB) / R.sB, z1b = (AX.x.max - R.mB) / R.sB;
            const gA = ((rhs - w1 * z1a) / w2) * R.sG + R.mG;
            const gB = ((rhs - w1 * z1b) / w2) * R.sG + R.mG;
            return { id, x1: AX.x.min, y1: gA, x2: AX.x.max, y2: gB, cls: dash ? 'c2' : 'hl', dash, w: dash ? 1.5 : 2.5, label };
          }
          const bx = (rhs / w1) * R.sB + R.mB;
          return { id, x1: bx, y1: AX.y.min, x2: bx, y2: AX.y.max, cls: dash ? 'c2' : 'hl', dash, w: dash ? 1.5 : 2.5, label };
        };
        return [makeL(-b, 'db', false, '決策邊界'), makeL(1 - b, 'm1', true, '+1'), makeL(-1 - b, 'm2', true, '−1')];
      }

      function views(st) {
        const sn = st.snap;
        const points = rows.map((r, i) => {
          const isSv = st.showSV && sn.alpha[i] > 1e-4;
          return {
            id: 'p' + r.id, x: r.bmi, y: r.glu, cls: cls(r.dm),
            hl: sn.iIdx === i || sn.jIdx === i,
            ring: isSv,
            label: String(r.id), r: (isSv || sn.iIdx === i || sn.jIdx === i) ? 7.5 : 5.5
          };
        });
        const regions = st.showReg ? LAB.grid((x, y) => R.predictXY(x, y) >= 0 ? 'c1' : 'c0', AX.x.min, AX.x.max, AX.y.min, AX.y.max, 30, 20) : null;
        const leg = [{ cls: 'c1', label: '是' }, { cls: 'c0', label: '否' }, { cls: 'hl', shape: 'ring', label: '支持向量' }];
        if (!R.isRbf) leg.push({ cls: 'c2', shape: 'line', label: '±1 間隔帶' });
        const baseLines = st.showLines ? linLines(sn.w1, sn.w2, sn.b) : [];
        if (st.showLines && sn.iIdx >= 0 && sn.jIdx >= 0) {
          const pi = rows[sn.iIdx], pj = rows[sn.jIdx];
          baseLines.push({ id: 'smo_pair', x1: pi.bmi, y1: pi.glu, x2: pj.bmi, y2: pj.glu, cls: 'hl', dash: true, w: 2, label: 'SMO 配對' });
        }
        const main = {
          type: 'scatter', slot: 'main',
          title: (R.isRbf ? 'RBF 核函數' : '線性') + ' SVM（C = ' + R.C + '）',
          axes: AX, points, lines: baseLines, circles: [], regions,
          legend: leg
        };
        const side = {
          type: 'table', slot: 'side',
          title: '樣本間隔 y·f(x) 與支持向量',
          cols: [
            { key: 'id', label: '#' },
            { key: 'a', label: 'αᵢ', num: true, digits: 2 },
            { key: 'yf', label: 'y·f(x)', num: true, digits: 2 },
            { key: 'sv', label: '支持向量' }
          ],
          rows: rows.map((r, i) => ({
            id: r.id,
            cells: [r.id, sn.alpha[i], R.Y[i] * sn.fVals[i], sn.alpha[i] > 1e-4 ? { v: 'SV', cls: 'hl' } : '—'],
            hl: sn.iIdx === i || sn.jIdx === i
          }))
        };
        const line = {
          type: 'line', slot: 'bottom',
          title: '對偶目標函式值（越大越接近最佳解）',
          axes: { x: { label: 'SMO 階段', min: 0, max: Math.max(4, st.objs.length) }, y: { label: '對偶目標值', min: 0, max: Math.max(1, R.fin.obj * 1.15) } },
          series: [{ id: 'obj', label: '對偶目標', pts: st.objs.map((v, i) => [i, v]), cls: 'c1', dots: true }],
          marker: { x: st.objs.length - 1, y: sn.obj, label: '目前' }
        };
        return [main, side, line];
      }

      const st = { snap: R.snaps[0], showLines: false, showSV: false, showReg: false, objs: [R.snaps[0].obj] };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '題目', '有很多條線都能分開這兩群，SVM 要找離兩邊最近點都最遠的那條最大間隔邊界（C = ' + R.C + '）。', [
        '核函數：' + (R.isRbf ? 'RBF (γ = 0.5)' : '線性') + '，懲罰參數 C = ' + R.C
      ]);

      add(2, '初始化對偶乘數 α = 0', '透過 SMO 演算法求解對偶問題，從全部 αᵢ = 0 出發，尋找違反間隔（y·f(x) < 1）的樣本。', [
        '初始對偶目標值 = 0'
      ]);

      st.showLines = true;
      for (let k = 1; k < R.snaps.length; k++) {
        const sn = R.snaps[k];
        st.snap = sn;
        st.objs = st.objs.concat([sn.obj]);
        add(5, sn.tag, '挑選 #' + rows[sn.iIdx].id + ' 與 #' + rows[sn.jIdx].id + ' 成對調整 αᵢ、αⱼ，維持 Σ αᵢyᵢ = 0 並推高對偶目標。', [
          'α_' + rows[sn.iIdx].id + ' = ' + f(sn.alpha[sn.iIdx], 3) + '，α_' + rows[sn.jIdx].id + ' = ' + f(sn.alpha[sn.jIdx], 3),
          '對偶目標值 = ' + f(sn.obj, 3)
        ]);
      }

      st.snap = R.fin; st.showSV = true; st.objs = st.objs.concat([R.fin.obj]);
      add(7, 'SMO 收斂與支持向量', '完成最佳化！只有貼在間隔邊界或違規的點會有 αᵢ > 0，這些點稱為「支持向量」（黃圈）。', [
        '支持向量（共 ' + R.svIds.length + ' 個）：#' + R.svIds.join(', #'),
        R.isRbf ? '對偶目標值 = ' + f(R.fin.obj, 3) : '間隔寬度 2/‖w‖ = ' + f(R.marginWidth, 3)
      ]);

      st.showReg = true;
      add(8, '決策邊界與判定區域', R.isRbf ? 'RBF 核函數透過高斯相似度映射到高維空間，畫出彎曲的非線性判定區域。' : '線性 SVM 畫出直線邊界與 ±1 間隔帶。C 越小越容許犯錯、間隔越寬；C 越大越嚴格。', [
        R.isRbf ? '核函數 RBF：K(x, z) = exp(−0.5‖x−z‖²)' : 'w = (' + f(R.w1, 3) + ', ' + f(R.w2, 3) + ')，b = ' + f(R.b, 3)
      ]);

      add(8, '支持向量的關鍵角色', '把非支持向量的點拿掉重算，決策邊界完全不會變！這就是為什麼稱為「支持向量」機。', [
        '支持向量數 = ' + R.svIds.length + ' / ' + rows.length
      ]);
      add(8, '懲罰參數 C 的權衡', 'C 越小代表軟間隔越寬鬆，容許少數點越界以換取更寬間隔；C 越大則嚴懲違規點，邊界緊縮但易過擬合。', [
        '目前 C = ' + R.C + '（可切換 0.1 ↔ 100 比較支持向量數變化）'
      ]);
      add(8, 'RBF 核技巧與 γ 參數', 'RBF 核函數 exp(−γ‖x−z‖²) 不用真的展開高維座標就能算內積；γ 越大每個支持向量影響範圍越窄，容易包出孤島過擬合。', [
        '線性可分用 Linear；複雜彎曲邊界用 RBF (調 C 與 γ)'
      ]);
      add(8, 'SVM 實務前處理鐵律', 'SVM 高度依賴特徵內積與歐氏距離，建模前必先標準化（A2）；若要輸出校準機率需再搭 Platt Scaling（B19）。', [
        '大樣本（>數萬筆）可改用 LinearSVC 或樹模型加速'
      ]);
      return steps;
    },

    keys(steps, rows, p) {
      const R = fitSVM(rows, p);
      const k = {
        b: R.b,
        n_sv: R.svIds.length,
        dual_obj: R.fin.obj
      };
      if (!R.isRbf) {
        k.w1 = R.w1;
        k.w2 = R.w2;
        k.margin_width = R.marginWidth;
      }
      R.alpha.forEach((a, i) => { k['alpha_' + rows[i].id] = a; });
      return k;
    },

    explain(steps, rows, p) {
      const R = fitSVM(rows, p);
      return [
        '以 C = ' + R.C + '、' + (R.isRbf ? 'RBF 核函數' : '線性核函數') + ' 求解 SVM，共找出 ' + R.svIds.length + ' 個支持向量（#' + R.svIds.join(', #') + '）。',
        R.isRbf ? 'RBF 核函數利用高斯相似度建立彎曲邊界，不需顯式計算高維座標。' : '線性邊界係數 w = (' + f(R.w1, 3) + ', ' + f(R.w2, 3) + ')、b = ' + f(R.b, 3) + '，間隔寬度 = ' + f(R.marginWidth, 3) + '。',
        '參數 C 控制「間隔寬度」與「容錯程度」的權衡：C 越大越不願容忍誤判，C 越小則允許少數點越界換取更寬的間隔。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Set Role', 'Normalize', 'SVM'],
      params: [
        ['Set Role › dm', 'label'],
        ['SVM › kernel type', p => p.kernel === 'rbf' ? 'radial' : 'dot'],
        ['SVM › C', p => String(p.C)]
      ],
      note: 'AI Studio 的 SVM 運算子內建自動縮放選項，且 RBF 的 gamma 參數名稱為 kernel gamma，需實機確認與 sklearn gamma="scale" 的對齊設定。',
      expect: (steps, rows, p) => {
        const R = fitSVM(rows, p);
        return ['支持向量數 = ' + R.svIds.length + ' 個'];
      },
      python: `from sklearn.svm import SVC\nsvc = SVC(kernel='linear', C=1.0, tol=1e-7).fit(Z, y)`,
      confirmed: false
    }
  });
})();
