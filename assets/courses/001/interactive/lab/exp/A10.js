/* A10 資料洩漏實證（切分前 vs 切分後前處理對照） */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const GROUPS = ['心內', '胸腔', '腎臟', '代謝', '神內', '感染'];
  const G_CODES = ['cv', 'pulm', 'neph', 'meta', 'neuro', 'inf'];
  const COLS = [
    { key: 'age', label: '年齡', unit: '歲', type: 'num', min: 25, max: 90, step: 1, role: 'x' },
    { key: 'glu', label: '空腹血糖', unit: 'mg/dL', type: 'num', min: 70, max: 280, step: 1, role: 'x' },
    { key: 'grp', label: '次科別', type: 'cat', levels: GROUPS, codes: G_CODES, role: 'x' },
    { key: 'dm', label: '陽性事件', type: 'cat', levels: ['否', '是'], codes: ['no', 'yes'], role: 'y' }
  ];

  function makeRows(seed) {
    const r = LAB.rng(10100 + seed);
    const base = LAB.data.clinic(seed, 20);
    // 20 筆資料：前 14 筆為訓練集，後 6 筆為測試集（70/30 切分）
    // 設計讓部分稀有次科別在訓練與測試分布不同，且測試集含 1 筆極端高血糖，以便三種洩漏情境都能清楚呈現
    const grpPattern = [0, 0, 0, 1, 1, 1, 2, 2, 3, 3, 4, 4, 5, 0, 2, 3, 4, 5, 1, 5];
    const rows = base.map((o, i) => ({
      id: i + 1,
      age: o.age,
      glu: o.glu,
      grp: grpPattern[i],
      dm: o.dm
    }));
    // 確保不平衡情境：約 5-6 位陽性
    const posIdx = [2, 5, 7, 10, 14, 17];
    rows.forEach((row, i) => {
      row.dm = posIdx.includes(i) ? 1 : 0;
      if (row.dm === 1) {
        row.glu = Math.max(122, Math.round(130 + (r() - 0.3) * 32));
        row.age = Math.max(52, Math.round(58 + (r() - 0.3) * 20));
      } else {
        row.glu = Math.min(126, Math.round(92 + (r() - 0.4) * 28));
        row.age = Math.min(72, Math.round(44 + (r() - 0.4) * 26));
      }
    });
    // 在測試集 (#19) 放一筆極端高血糖，展現縮放統計量洩漏
    rows[18].glu = 258;
    rows[18].dm = 1;
    // 讓測試集 #15 (grp=2 腎臟, dm=1) 與 #18 (grp=5 感染, dm=1) 在訓練集同組樣本少，突顯目標編碼洩漏
    rows[6].dm = 0; rows[7].dm = 0; // 訓練集腎臟 0/2 陽性，但測試集 #15 是陽性
    rows[12].dm = 0;                // 訓練集感染 0/1 陽性，但測試集 #18, #20 為 1/2 陽性
    rows[15].dm = 0;                // 測試集 #16 代謝陰性，訓練集代謝 #9,#10 改為 1/2
    rows[8].dm = 1; rows[9].dm = 1;
    return rows;
  }

  function knnPred(trainPts, queryPt, k) {
    const ds = trainPts.map((t, idx) => ({
      d: Math.hypot(t.x - queryPt.x, t.y - queryPt.y),
      dm: t.dm,
      idx
    })).sort((a, b) => a.d - b.d || a.idx - b.idx);
    const yes = ds.slice(0, Math.min(k, ds.length)).filter(z => z.dm === 1).length;
    return yes * 2 >= Math.min(k, ds.length) ? 1 : 0;
  }

  function analyzeTarget(rows) {
    const train = rows.slice(0, 14), test = rows.slice(14);
    const priorAll = M.mean(rows.map(r => r.dm));
    const priorTr = M.mean(train.map(r => r.dm));
    const m = 1;
    const stats = GROUPS.map((name, gi) => {
      const allG = rows.filter(r => r.grp === gi);
      const trG = train.filter(r => r.grp === gi);
      const leakEnc = allG.length ? (M.sum(allG.map(r => r.dm)) + m * priorAll) / (allG.length + m) : priorAll;
      const cleanEnc = trG.length ? (M.sum(trG.map(r => r.dm)) + m * priorTr) / (trG.length + m) : priorTr;
      return { gi, name, nAll: allG.length, nTr: trG.length, leakEnc, cleanEnc, diff: leakEnc - cleanEnc };
    });
    const testEval = test.map(r => {
      const s = stats[r.grp];
      const predLeak = s.leakEnc >= 0.45 ? 1 : 0;
      const predClean = s.cleanEnc >= 0.45 ? 1 : 0;
      return {
        id: r.id, grpName: GROUPS[r.grp], dm: r.dm,
        vLeak: s.leakEnc, vClean: s.cleanEnc,
        okLeak: predLeak === r.dm, okClean: predClean === r.dm
      };
    });
    const accLeak = M.mean(testEval.map(e => e.okLeak ? 1 : 0));
    const accClean = M.mean(testEval.map(e => e.okClean ? 1 : 0));
    return { stats, testEval, accLeak, accClean, bias: accLeak - accClean, priorAll, priorTr };
  }

  function analyzeSmote(rows) {
    const r = LAB.rng(10200 + rows.length);
    const posAll = rows.filter(x => x.dm === 1);
    const negAll = rows.filter(x => x.dm === 0);
    // 錯誤流程：先全資料 SMOTE 補到與陰性同數，再切 70/30（相鄰合成雙胞胎會分落訓練與測試集）
    const synthAll = [];
    const nAddAll = Math.max(4, negAll.length - posAll.length);
    for (let i = 0; i < nAddAll; i++) {
      const src = posAll[i % posAll.length];
      const nbs = posAll.filter(x => x.id !== src.id)
        .map(x => ({ x, d: Math.hypot((src.age - x.age) / 15, (src.glu - x.glu) / 40) }))
        .sort((a, b) => a.d - b.d);
      const nb = nbs.length ? nbs[0].x : src;
      const lam = 0.25 + 0.5 * r();
      synthAll.push({
        id: 'S' + (i + 1),
        age: Math.round((src.age + lam * (nb.age - src.age)) * 10) / 10,
        glu: Math.round((src.glu + lam * (nb.glu - src.glu)) * 10) / 10,
        dm: 1, isSynth: true, srcId: src.id, nbId: nb.id
      });
    }
    const leakPool = rows.concat(synthAll);
    // 取 30% 當洩漏測試集（包含 4 筆合成點 + 原測試陰性點，真實模擬隨機切分）
    const leakTest = synthAll.slice(0, 4).concat(rows.slice(14).filter(x => x.dm === 0));
    const leakTestIds = new Set(leakTest.map(x => x.id));
    const leakTrain = leakPool.filter(x => !leakTestIds.has(x.id));

    const trAgeM = M.mean(leakTrain.map(x => x.age)), trAgeS = M.sd(leakTrain.map(x => x.age)) || 1;
    const trGluM = M.mean(leakTrain.map(x => x.glu)), trGluS = M.sd(leakTrain.map(x => x.glu)) || 1;
    const normL = p => ({ x: (p.age - trAgeM) / trAgeS, y: (p.glu - trGluM) / trGluS, dm: p.dm });
    const lTrPts = leakTrain.map(normL);
    const leakEval = leakTest.map(t => {
      const pr = knnPred(lTrPts, normL(t), 3);
      return { id: String(t.id), isSynth: !!t.isSynth, dm: t.dm, pred: pr, ok: pr === t.dm };
    });
    const accLeak = M.mean(leakEval.map(e => e.ok ? 1 : 0));

    // 正確流程：先切 14 訓練 / 6 測試，僅對訓練集做 SMOTE，測試集保持純淨原始資料
    const cleanTrainRaw = rows.slice(0, 14), cleanTest = rows.slice(14);
    const posTr = cleanTrainRaw.filter(x => x.dm === 1);
    const negTr = cleanTrainRaw.filter(x => x.dm === 0);
    const synthTr = [];
    const nAddTr = Math.max(2, negTr.length - posTr.length);
    for (let i = 0; i < nAddTr; i++) {
      const src = posTr[i % posTr.length];
      const nb = posTr[(i + 1) % posTr.length] || src;
      const lam = 0.25 + 0.5 * r();
      synthTr.push({
        id: 'T' + (i + 1),
        age: Math.round((src.age + lam * (nb.age - src.age)) * 10) / 10,
        glu: Math.round((src.glu + lam * (nb.glu - src.glu)) * 10) / 10,
        dm: 1, isSynth: true
      });
    }
    const cleanTrain = cleanTrainRaw.concat(synthTr);
    const cAgeM = M.mean(cleanTrain.map(x => x.age)), cAgeS = M.sd(cleanTrain.map(x => x.age)) || 1;
    const cGluM = M.mean(cleanTrain.map(x => x.glu)), cGluS = M.sd(cleanTrain.map(x => x.glu)) || 1;
    const normC = p => ({ x: (p.age - cAgeM) / cAgeS, y: (p.glu - cGluM) / cGluS, dm: p.dm });
    const cTrPts = cleanTrain.map(normC);
    const cleanEval = cleanTest.map(t => {
      const pr = knnPred(cTrPts, normC(t), 3);
      return { id: '#' + t.id, isSynth: false, dm: t.dm, pred: pr, ok: pr === t.dm };
    });
    const accClean = M.mean(cleanEval.map(e => e.ok ? 1 : 0));
    return { synthAll, synthTr, leakEval, cleanEval, accLeak, accClean, bias: accLeak - accClean };
  }

  function analyzeScale(rows) {
    const train = rows.slice(0, 14), test = rows.slice(14);
    const mAll = M.mean(rows.map(r => r.glu)), sAll = M.sd(rows.map(r => r.glu)) || 1;
    const mTr = M.mean(train.map(r => r.glu)), sTr = M.sd(train.map(r => r.glu)) || 1;
    const maAll = M.mean(rows.map(r => r.age)), saAll = M.sd(rows.map(r => r.age)) || 1;
    const maTr = M.mean(train.map(r => r.age)), saTr = M.sd(train.map(r => r.age)) || 1;

    const zDiffTest = test.map(r => {
      const zLeak = (r.glu - mAll) / sAll;
      const zClean = (r.glu - mTr) / sTr;
      return { id: r.id, glu: r.glu, dm: r.dm, zLeak, zClean, dz: Math.abs(zClean - zLeak) };
    });
    const avgShift = M.mean(zDiffTest.map(x => x.dz));

    const trLeak = train.map(r => ({ x: (r.age - maAll) / saAll, y: (r.glu - mAll) / sAll, dm: r.dm }));
    const trClean = train.map(r => ({ x: (r.age - maTr) / saTr, y: (r.glu - mTr) / sTr, dm: r.dm }));
    const accLeak = M.mean(test.map(r => knnPred(trLeak, { x: (r.age - maAll) / saAll, y: (r.glu - mAll) / sAll }, 3) === r.dm ? 1 : 0));
    const accClean = M.mean(test.map(r => knnPred(trClean, { x: (r.age - maTr) / saTr, y: (r.glu - mTr) / sTr }, 3) === r.dm ? 1 : 0));
    return { mAll, sAll, mTr, sTr, dMean: mAll - mTr, dSd: sAll - sTr, avgShift, zDiffTest, accLeak, accClean };
  }

  LAB.register({
    id: 'A10', group: 'A', title: '資料洩漏實證對照',
    module: { name: 'M1 資料防洩漏', url: '../m1/#p10' },
    goal: '定量對照「切分前就做前處理（資料洩漏）」與「先切 70/30、僅在訓練集 fit 再 transform 測試集」的差異，親眼看懂目標編碼、SMOTE 與標準化洩漏如何灌水測試分數。',
    data: {
      name: 'clinic_leakage',
      scenario: '門診健檢 20 筆（#1–#14 訓練集、#15–#20 封存測試集），實證前處理順序錯誤造成的資料洩漏',
      columns: COLS,
      editable: ['age', 'glu', 'dm'],
      small: makeRows
    },
    params: [
      { key: 'mode', label: '洩漏情境', type: 'choice', value: 'target', options: [
        { v: 'target', label: '目標編碼洩漏 (Target)' },
        { v: 'smote', label: 'SMOTE 過採樣洩漏' },
        { v: 'scale', label: '標準化統計量洩漏' }
      ] }
    ],
    pseudo: [
      '❌ 錯誤：全資料一起算統計／編碼',
      '  再切 70% 訓練 / 30% 測試集',
      '  → 測試集資訊已混入訓練過程！',
      '✅ 正確：第一步先封存 30% 測試集',
      '  僅用 70% 訓練集 fit 前處理參數',
      '  單向 transform 套用至測試集',
      '比對兩者測試分數與樂觀灌水偏差'
    ],
    build(rows, p) {
      const mode = p.mode || 'target';
      const RT = analyzeTarget(rows);
      const RS = analyzeSmote(rows);
      const RZ = analyzeScale(rows);
      const steps = [];

      function views(st) {
        let main, side, bottom;

        if (mode === 'target') {
          main = {
            type: 'bars', slot: 'main',
            title: st.phase === 'leak'
              ? '❌ 錯誤：全資料目標編碼（偷看了測試集標籤 y！）'
              : st.phase === 'clean'
                ? '✅ 正確：僅用訓練集 14 筆計算目標編碼'
                : '各次科別目標編碼值：❌ 全資料洩漏 vs ✅ 訓練集乾淨',
            max: 1, digits: 2,
            items: RT.stats.map(s => ({
              id: 'g_' + s.gi,
              label: s.name + ' (全' + s.nAll + '/訓' + s.nTr + ')',
              value: st.phase === 'clean' ? s.cleanEnc : s.leakEnc,
              note: '洩' + f(s.leakEnc, 2) + ' / 淨' + f(s.cleanEnc, 2),
              cls: st.phase === 'clean' ? 'good' : (Math.abs(s.diff) > 0.12 ? 'bad' : 'c1'),
              hl: Math.abs(s.diff) > 0.12
            }))
          };
          side = {
            type: 'table', slot: 'side',
            title: '6 位封存測試病人 (#15–#20)：洩漏 vs 正確預測對照',
            cols: [
              { key: 'id', label: '#' },
              { key: 'grp', label: '次科別' },
              { key: 'y', label: '真實 y' },
              { key: 'lk', label: '❌洩漏編碼', num: true, digits: 2 },
              { key: 'cl', label: '✅乾淨編碼', num: true, digits: 2 }
            ],
            rows: RT.testEval.map(e => ({
              id: 't' + e.id,
              cells: [
                '#' + e.id, e.grpName,
                { v: e.dm ? '陽性' : '陰性', cls: e.dm ? 'c1' : 'c0' },
                st.showLeak ? { v: e.vLeak, cls: e.okLeak ? 'bad' : 'c5' } : null,
                st.showClean ? { v: e.vClean, cls: e.okClean ? 'good' : 'c4' } : null
              ],
              hl: e.okLeak && !e.okClean
            }))
          };
          bottom = {
            type: 'bars', slot: 'bottom',
            title: '測試集準確率對比（揭露資料洩漏造成的樂觀灌水偏差）',
            max: 1, digits: 2,
            items: [
              { id: 'lk', label: '❌ 切分前編碼 (洩漏虛高)', value: st.showLeak ? RT.accLeak : 0, cls: 'bad', hl: st.phase === 'leak' },
              { id: 'cl', label: '✅ 切分後編碼 (真實泛化)', value: st.showClean ? RT.accClean : 0, cls: 'good', hl: st.phase === 'clean' },
              { id: 'bs', label: '灌水偏差 Δ (虛假進步)', value: st.showDiff ? Math.max(0, RT.bias) : 0, cls: 'c4', hl: st.showDiff }
            ]
          };
        } else if (mode === 'smote') {
          const ax = { x: { label: '年齡（歲）', min: 20, max: 90 }, y: { label: '空腹血糖（mg/dL）', min: 65, max: 270 } };
          const pts = rows.map((r, i) => ({
            id: 'p' + r.id, x: r.age, y: r.glu,
            cls: r.dm ? 'c1' : 'c0',
            hollow: i >= 14,
            ring: i >= 14,
            label: i >= 14 ? ('T' + r.id) : String(r.id),
            r: i >= 14 ? 6.5 : 5.5
          }));
          if (st.phase === 'leak' || st.showLeak) {
            RS.synthAll.slice(0, 6).forEach((s, si) => {
              pts.push({
                id: s.id, x: s.age, y: s.glu,
                cls: si < 4 ? 'bad' : 'new', shape: 'diamond', r: 7,
                hl: si < 4 && st.phase === 'leak',
                label: si < 4 ? (s.id + '(洩入測試)') : s.id
              });
            });
          } else if (st.phase === 'clean') {
            RS.synthTr.slice(0, 6).forEach(s => {
              pts.push({ id: s.id, x: s.age, y: s.glu, cls: 'good', shape: 'diamond', r: 6.5, label: s.id });
            });
          }
          main = {
            type: 'scatter', slot: 'main',
            title: st.phase === 'leak'
              ? '❌ 錯誤：全資料先 SMOTE → 合成雙胞胎點洩漏進測試集！'
              : '✅ 正確：先切 70/30，僅在訓練集內合成（空心點＝純淨測試集）',
            axes: ax, points: pts, lines: [], circles: [],
            legend: [
              { cls: 'c1', label: '陽性原點' }, { cls: 'c0', label: '陰性原點' },
              { cls: 'bad', shape: 'diamond', label: '洩漏合成雙胞胎' }, { cls: 'good', shape: 'diamond', label: '訓練折內合成點' }
            ]
          };
          side = {
            type: 'table', slot: 'side',
            title: st.phase === 'clean' ? '✅ 純淨測試集 (#15–#20) 3-NN 預測' : '❌ 洩漏測試集（混入合成雙胞胎 S1–S4）',
            cols: [
              { key: 'id', label: '樣本' },
              { key: 'src', label: '來源' },
              { key: 'y', label: '真實' },
              { key: 'ok', label: '3-NN 結果' }
            ],
            rows: (st.phase === 'clean' ? RS.cleanEval : RS.leakEval).slice(0, 8).map(e => ({
              id: 'sm_' + e.id,
              cells: [
                e.id,
                e.isSynth ? { v: '合成雙胞胎', cls: 'bad' } : '真實病人',
                e.dm ? '陽性' : '陰性',
                { v: e.ok ? '答對' : '答錯', cls: e.ok ? (e.isSynth ? 'bad' : 'good') : 'c4' }
              ],
              hl: e.isSynth
            }))
          };
          bottom = {
            type: 'bars', slot: 'bottom',
            title: '測試集 3-NN 準確率對比（SMOTE-before-Split 灌水實證）',
            max: 1, digits: 2,
            items: [
              { id: 'lk', label: '❌ 先 SMOTE 再切 (洩漏虛高)', value: st.showLeak ? RS.accLeak : 0, cls: 'bad', hl: st.phase === 'leak' },
              { id: 'cl', label: '✅ 先切再訓集 SMOTE (真實)', value: st.showClean ? RS.accClean : 0, cls: 'good', hl: st.phase === 'clean' },
              { id: 'bs', label: '灌水偏差 Δ', value: st.showDiff ? Math.max(0, RS.bias) : 0, cls: 'c4', hl: st.showDiff }
            ]
          };
        } else {
          const ax = { x: { label: '年齡（歲）', min: 20, max: 90 }, y: { label: '空腹血糖（mg/dL）', min: 65, max: 270 } };
          const pts = rows.map((r, i) => ({
            id: 'p' + r.id, x: r.age, y: r.glu,
            cls: r.id === 19 ? 'bad' : (r.dm ? 'c1' : 'c0'),
            hollow: i >= 14,
            ring: i >= 14 || r.id === 19,
            hl: r.id === 19,
            label: r.id === 19 ? '#19(測試極端值)' : (i >= 14 ? ('T' + r.id) : String(r.id)),
            r: r.id === 19 ? 8 : 5.5
          }));
          const lines = [];
          if (st.showLeak) lines.push({ id: 'mall', x1: 20, y1: RZ.mAll, x2: 90, y2: RZ.mAll, cls: 'bad', dash: true, w: 2, label: '❌全資料 μ=' + f(RZ.mAll, 1) });
          if (st.showClean) lines.push({ id: 'mtr', x1: 20, y1: RZ.mTr, x2: 90, y2: RZ.mTr, cls: 'good', w: 2, label: '✅訓練集 μ=' + f(RZ.mTr, 1) });
          main = {
            type: 'scatter', slot: 'main',
            title: '測試集極端值 (#19, 血糖=258) 如何拉偏全資料標準化平均 μ 與標準差 σ',
            axes: ax, points: pts, lines, circles: [],
            legend: [
              { cls: 'c0', label: '訓練集' }, { cls: 'bad', label: '測試集極端值 #19' },
              { cls: 'bad', shape: 'line', label: '❌ 全資料平均 μ_all' }, { cls: 'good', shape: 'line', label: '✅ 訓練集平均 μ_tr' }
            ]
          };
          side = {
            type: 'table', slot: 'side',
            title: '測試集 (#15–#20) 血糖 Z 分數偏移對照',
            cols: [
              { key: 'id', label: '#' },
              { key: 'glu', label: '血糖', num: true, digits: 0 },
              { key: 'zl', label: '❌洩漏 Z', num: true, digits: 2 },
              { key: 'zc', label: '✅正確 Z', num: true, digits: 2 },
              { key: 'dz', label: '|ΔZ|', num: true, digits: 2 }
            ],
            rows: RZ.zDiffTest.map(z => ({
              id: 'z' + z.id,
              cells: ['#' + z.id, z.glu, st.showLeak ? z.zLeak : null, st.showClean ? z.zClean : null, st.showDiff ? z.dz : null],
              hl: z.id === 19
            }))
          };
          bottom = {
            type: 'bars', slot: 'bottom',
            title: '標準差 σ 遭測試極端值撐大程度（σ_all vs σ_train）',
            max: Math.max(45, RZ.sAll * 1.15), digits: 1,
            items: [
              { id: 'sall', label: '❌ 全資料標準差 σ_all (被 #19 撐大)', value: st.showLeak ? RZ.sAll : 0, cls: 'bad', hl: st.phase === 'leak' },
              { id: 'str', label: '✅ 僅訓練集標準差 σ_train', value: st.showClean ? RZ.sTr : 0, cls: 'good', hl: st.phase === 'clean' },
              { id: 'ds', label: '標準差偷跑膨脹量 Δσ', value: st.showDiff ? Math.abs(RZ.dSd) : 0, cls: 'c4', hl: st.showDiff }
            ]
          };
        }
        return [main, side, bottom];
      }

      const st = { phase: 'init', showLeak: false, showClean: false, showDiff: false };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '1. 檢視 20 筆資料', '這份 20 筆門診資料將按 70/30 切為 14 筆訓練集 (#1–#14) 與 6 筆封存測試集 (#15–#20)，實測前處理順序錯誤的後果！', [
        '訓練集：#1–#14（14 筆）｜封存測試集：#15–#20（6 筆）'
      ]);

      if (mode === 'target') {
        st.phase = 'leak'; st.showLeak = true;
        add(0, '2. ❌ 全資料算目標編碼', '錯誤作法：在切分前就用全部 20 筆的標籤 y 算各次科別陽性率。腎臟科與感染科的編碼值直接偷看了測試集病人的答案！', [
          '全資料先驗 = ' + f(RT.priorAll, 3) + '（含測試集標籤 y）'
        ]);
        add(1, '3. ❌ 洩漏後切分測試', '把已偷看答案的編碼欄位拿去切 70/30 並評估測試集 #15–#20：模型彷彿提前背過考卷！', [
          '❌ 洩漏管線測試準確率 = ' + LAB.pct(RT.accLeak, 1)
        ]);
        add(2, '4. 剖析為何失真', '對稀有次科別（樣本僅 2–3 人），單一測試病人自己的標籤就能把該組編碼值拉過門檻 0.45，造成嚴重作弊效應。', [
          '腎臟科：全資料編碼 ' + f(RT.stats[2].leakEnc, 2) + ' vs 僅訓練集 ' + f(RT.stats[2].cleanEnc, 2)
        ]);

        st.phase = 'clean'; st.showClean = true;
        add(3, '5. ✅ 先封存 30% 測試集', '正確作法：第一步就把 #15–#20 鎖進保險箱！任何統計量與編碼都絕不能碰到這 6 筆資料。', [
          '僅開放訓練集 #1–#14（先驗 = ' + f(RT.priorTr, 3) + '）'
        ]);
        add(4, '6. ✅ 僅訓練集 fit 編碼', '只用訓練集 14 筆計算 6 個次科別的平滑陽性率；若某組在訓練集樣本少，就乖乖向訓練先驗收縮。', [
          '感染科訓練集編碼 = ' + f(RT.stats[5].cleanEnc, 2) + '（完全未見測試 y）'
        ]);
        add(5, '7. ✅ 單向套用至測試集', '把訓練集學到的對照表單向 map 到測試集 #15–#20，誠實測出模型面對未見新病人的真實表現！', [
          '✅ 正確管線測試準確率 = ' + LAB.pct(RT.accClean, 1)
        ]);

        st.phase = 'compare'; st.showDiff = true;
        add(6, '8. 量化樂觀灌水偏差', '比較兩條管線：錯誤作法讓測試分數虛高了 ' + LAB.pct(Math.max(0, RT.bias), 1) + '！上線後準確率會瞬間雪崩。', [
          '❌ 洩漏 ' + LAB.pct(RT.accLeak, 1) + ' vs ✅ 真實 ' + LAB.pct(RT.accClean, 1) + '（灌水 +' + LAB.pct(Math.max(0, RT.bias), 1) + '）'
        ]);
      } else if (mode === 'smote') {
        st.phase = 'leak'; st.showLeak = true;
        add(0, '2. ❌ 全資料先做 SMOTE', '錯誤作法：切分前就對全資料跑 SMOTE，在原陽性點連線上合成多個極為相近的「雙胞胎陽性點」S1–S6！', [
          '全資料先合成 ' + RS.synthAll.length + ' 筆陽性點後再隨機切分'
        ]);
        add(1, '3. ❌ 雙胞胎分落訓練測試', '隨機切 70/30 後，S1–S4 落入測試集，但製造它們的「親生父母點」留在訓練集，距離近到 3-NN 閉著眼都猜對！', [
          '❌ 洩漏管線測試準確率 = ' + LAB.pct(RS.accLeak, 1)
        ]);
        add(2, '4. 剖析測試集已受污染', '真實醫院上線時，門診不會先幫你把新病人 SMOTE 成 1:1 平衡，這種測試分數毫無臨床參考價值。', [
          '測試集混入 4 筆合成點 → 嚴重高估陽性辨識能力'
        ]);

        st.phase = 'clean'; st.showClean = true;
        add(3, '5. ✅ 先封存純淨測試集', '正確作法：先切出 #15–#20 保持原始真實不平衡分布，完全不做任何過抽樣或合成！', [
          '測試集維持 6 筆真實病人（絕不加入合成點）'
        ]);
        add(4, '6. ✅ 僅訓練集 SMOTE', '只在 14 筆訓練集內合成新陽性點 T1–T6，擴大訓練集的少數類決策區域。', [
          '訓練集由 14 筆擴增至 ' + (14 + RS.synthTr.length) + ' 筆'
        ]);
        add(5, '7. ✅ 測試純淨未見病人', '用訓練好的 3-NN 預測純淨測試集 #15–#20，得到誠實的泛化準確率。', [
          '✅ 正確管線測試準確率 = ' + LAB.pct(RS.accClean, 1)
        ]);

        st.phase = 'compare'; st.showDiff = true;
        add(6, '8. 量化 SMOTE 灌水偏差', '先 SMOTE 再切分讓測試準確率虛高 ' + LAB.pct(Math.max(0, RS.bias), 1) + '！在 K-Fold 中同樣必須每折內單獨做 SMOTE。', [
          '❌ 洩漏 ' + LAB.pct(RS.accLeak, 1) + ' vs ✅ 真實 ' + LAB.pct(RS.accClean, 1) + '（灌水 +' + LAB.pct(Math.max(0, RS.bias), 1) + '）'
        ]);
      } else {
        st.phase = 'leak'; st.showLeak = true;
        add(0, '2. ❌ 全資料算標準化 μ/σ', '錯誤作法：切分前就用全部 20 筆算血糖平均 μ 與標準差 σ。測試集的極端個案 #19 (258) 偷偷拉高了全域統計量！', [
          '❌ 全資料 μ_all = ' + f(RZ.mAll, 2) + '，σ_all = ' + f(RZ.sAll, 2)
        ]);
        add(1, '3. ❌ 訓練特徵已被污染', '雖然沒動到標籤 y，但訓練集每筆病人的 Z 分數都混入了「未來測試集極端值」的訊息，違反獨立測試原則！', [
          '全資料標準差被 #19 撐大了 ' + f(Math.abs(RZ.dSd), 2) + ' mg/dL'
        ]);
        add(2, '4. 剖析線上部署斷層', '模型上線面對單一新病人時，根本不可能「重算全院含未來病人的 μ 與 σ」，這會導致推論刻度不一致。', [
          '測試集 #19 洩漏 Z = ' + f(RZ.zDiffTest[4].zLeak, 2)
        ]);

        st.phase = 'clean'; st.showClean = true;
        add(3, '5. ✅ 先封存 30% 測試集', '正確作法：先切出 14 筆訓練集與 6 筆測試集，只允許 StandardScaler 讀取訓練集。', [
          '✅ 訓練集 μ_tr = ' + f(RZ.mTr, 2) + '，σ_tr = ' + f(RZ.sTr, 2)
        ]);
        add(4, '6. ✅ 僅訓練集 fit 參數', '只用訓練集記住 (μ_tr, σ_tr) 兩個數字，完全不受 #19 極端高血糖影響！', [
          'μ 偏移 = ' + f(RZ.dMean, 2) + '｜σ 偏移 = ' + f(RZ.dSd, 2)
        ]);
        add(5, '7. ✅ 單向套用至測試集', '將訓練集的 (μ_tr, σ_tr) 單向套用到測試集：#19 的真實極端程度立刻以高達 ' + f(RZ.zDiffTest[4].zClean, 2) + 'σ 浮現！', [
          '測試集平均 Z 分數偏移 |ΔZ| = ' + f(RZ.avgShift, 2)
        ]);

        st.phase = 'compare'; st.showDiff = true;
        add(6, '8. 量化標準化偏移影響', '漏算切分順序讓極端值 #19 的 Z 分數被低估（' + f(RZ.zDiffTest[4].zLeak, 2) + ' vs 真實 ' + f(RZ.zDiffTest[4].zClean, 2) + '），連帶影響離群偵測與距離模型。', [
          'σ_all=' + f(RZ.sAll, 1) + ' vs σ_tr=' + f(RZ.sTr, 1) + '（3-NN 測試：洩 ' + LAB.pct(RZ.accLeak, 0) + ' / 淨 ' + LAB.pct(RZ.accClean, 0) + '）'
        ]);
      }

      add(6, '9. Pipeline 防呆寫法', '在 Python 用 sklearn.pipeline.Pipeline（或 imblearn Pipeline）打包前處理與模型，交叉驗證每折自動只對訓練折 fit！', [
        'pipe = make_pipeline(StandardScaler(), KNeighborsClassifier(3))'
      ]);

      add(6, '10. AI Studio 防呆', '在 AI Studio 必須把 Normalize / Replace Missing / SMOTE 放進 Cross Validation 的「Training 子流程」內，再接 Apply Model 給測試折。', [
        '黃金鐵律：先切分 → 訓練集 fit → 測試集 transform'
      ]);
      return steps;
    },

    keys(steps, rows) {
      const RT = analyzeTarget(rows), RS = analyzeSmote(rows), RZ = analyzeScale(rows);
      return {
        target_acc_leak: RT.accLeak,
        target_acc_clean: RT.accClean,
        smote_acc_leak: RS.accLeak,
        smote_acc_clean: RS.accClean,
        scale_sd_all: RZ.sAll,
        scale_sd_train: RZ.sTr,
        scale_avg_z_shift: RZ.avgShift
      };
    },

    explain(steps, rows, p) {
      const RT = analyzeTarget(rows), RS = analyzeSmote(rows), RZ = analyzeScale(rows);
      return [
        '資料洩漏（Data Leakage）是指測試集資訊透過切分前的前處理偷跑進訓練流程，造成測試分數虛高（Optimistic Bias），上線後表現驟降。',
        '目標編碼若在切分前用全資料標籤計算，測試準確率由真實 ' + LAB.pct(RT.accClean, 1) + ' 被灌水至 ' + LAB.pct(RT.accLeak, 1) + '；SMOTE 先做再切分則由 ' + LAB.pct(RS.accClean, 1) + ' 虛高至 ' + LAB.pct(RS.accLeak, 1) + '。',
        '即使未用到標籤的標準化，切分前先算也會讓測試極端值撐大標準差（σ 由 ' + f(RZ.sTr, 1) + ' 膨脹為 ' + f(RZ.sAll, 1) + '）；實務一律以 Pipeline 確保「先切分、訓練 fit、測試 transform」。'
      ];
    },

    aistudio: {
      operators: ['Split Data / Cross Validation', 'Normalize', 'SMOTE Upsampling', 'Apply Model'],
      params: [
        ['Cross Validation › Training subprocess', '放入前處理（Normalize / Impute / SMOTE）並輸出 pre-model'],
        ['Cross Validation › Testing subprocess', '用 Apply Model 套用訓練折的 pre-model，禁止重算']
      ],
      note: 'AI Studio 最常見新手錯誤是把 Normalize 或 SMOTE 接在 Cross Validation 外面！正確做法是放進 Training 子流程，並把預處理模型 (pre) 接到 Testing 子流程的 Apply Model。',
      expect: (steps, rows) => {
        const RT = analyzeTarget(rows), RS = analyzeSmote(rows);
        return [
          '目標編碼洩漏：' + LAB.pct(RT.accLeak, 1) + ' → 乾淨真實：' + LAB.pct(RT.accClean, 1),
          'SMOTE 洩漏：' + LAB.pct(RS.accLeak, 1) + ' → 乾淨真實：' + LAB.pct(RS.accClean, 1)
        ];
      },
      python: `from sklearn.model_selection import train_test_split, cross_val_score\nfrom sklearn.preprocessing import StandardScaler\nfrom imblearn.pipeline import make_pipeline\nfrom imblearn.over_sampling import SMOTE\nfrom sklearn.neighbors import KNeighborsClassifier\npipe = make_pipeline(StandardScaler(), SMOTE(random_state=42), KNeighborsClassifier(3))\nscores = cross_val_score(pipe, X, y, cv=5)  # 每折自動先切再 fit，零洩漏！`,
      confirmed: false
    }
  });
})();
