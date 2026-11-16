/* 演算法實驗室 · 共用模擬資料集（全部為模擬資料，固定種子可重現）　凍結檔，請勿修改
   clinic 門診健檢｜readmit 出院再入院｜rx 處方籃｜notes 護理紀錄短句｜img 6×6 灰階小圖｜opd 月門診量 */
(function (G) {
  'use strict';
  const LAB = G.LAB, R = LAB.rng, N = LAB.randn, M = LAB.M;
  const D = LAB.data = {};
  const r1 = v => Math.round(v * 10) / 10;

  /* 欄位定義：label 中文顯示、key 為 CSV 英文欄名 */
  D.defs = {
    clinic: {
      age: { key: 'age', label: '年齡', unit: '歲', type: 'num', min: 20, max: 90, step: 1 },
      bmi: { key: 'bmi', label: 'BMI', unit: 'kg/m²', type: 'num', min: 15, max: 40, step: 0.1 },
      glu: { key: 'glu', label: '空腹血糖', unit: 'mg/dL', type: 'num', min: 60, max: 220, step: 1 },
      sbp: { key: 'sbp', label: '收縮壓', unit: 'mmHg', type: 'num', min: 90, max: 190, step: 1 },
      dm: { key: 'dm', label: '糖尿病', type: 'cat', levels: ['否', '是'], codes: ['no', 'yes'] }
    },
    readmit: {
      age: { key: 'age', label: '年齡', unit: '歲', type: 'num', min: 20, max: 95, step: 1 },
      los: { key: 'los', label: '住院天數', unit: '天', type: 'num', min: 1, max: 30, step: 1 },
      prior: { key: 'prior', label: '近一年住院次數', unit: '次', type: 'num', min: 0, max: 6, step: 1 },
      cci: { key: 'cci', label: '共病指數', unit: '分', type: 'num', min: 0, max: 8, step: 1 },
      follow: { key: 'follow', label: '出院後追蹤', type: 'cat', levels: ['無', '有'], codes: ['no', 'yes'] },
      readmit: { key: 'readmit', label: '30 天再入院', type: 'cat', levels: ['否', '是'], codes: ['no', 'yes'] }
    },
    rx: {},
    notes: {
      text: { key: 'text', label: '護理紀錄', type: 'text' },
      label: { key: 'label', label: '類別', type: 'cat', levels: ['跌倒風險', '疼痛', '傷口照護'], codes: ['fall', 'pain', 'wound'] }
    },
    opd: {
      t: { key: 't', label: '期數', type: 'num' },
      month: { key: 'month', label: '月份', type: 'text' },
      visits: { key: 'visits', label: '門診人次', unit: '人次', type: 'num', min: 0, max: 5000, step: 1 }
    }
  };
  D.rxItems = [['antidiabetic', '降血糖藥'], ['antihypertensive', '降血壓藥'], ['statin', '降血脂藥'], ['antiplatelet', '抗血小板藥'], ['ppi', '胃藥'], ['nsaid', '止痛藥'], ['hypnotic', '安眠藥'], ['antibiotic', '抗生素'], ['vitamin', '維生素']];
  D.rxItems.forEach(([k, l]) => { D.defs.rx[k] = { key: k, label: l, type: 'cat', levels: ['', '✓'], codes: ['false', 'true'] }; });

  /* 取欄位定義：columns('clinic', ['age','glu','dm'], {dm:'y'})，未指定的欄 role 為 'x' */
  D.columns = function (set, keys, roles) {
    return keys.map(k => Object.assign({}, D.defs[set][k], { role: (roles && roles[k]) || 'x' }));
  };

  /* 門診健檢：陽性約四成，兩群有重疊 */
  D.clinic = function (seed, n) {
    const r = R(1000 + seed), nPos = Math.max(1, Math.round(n * 0.42));
    const lab = LAB.shuffle(r, M.range(n, i => i < nPos ? 1 : 0));
    return lab.map((dm, i) => ({
      id: i + 1,
      age: Math.round(M.clamp((dm ? 60 : 44) + N(r) * (dm ? 9 : 11), 22, 88)),
      bmi: r1(M.clamp((dm ? 28.4 : 23.6) + N(r) * 2.9, 16.5, 39)),
      glu: Math.round(M.clamp((dm ? 136 : 97) + N(r) * (dm ? 19 : 10), 68, 215)),
      sbp: Math.round(M.clamp((dm ? 141 : 123) + N(r) * 12, 95, 185)),
      dm
    }));
  };

  /* 出院再入院：陽性約一成五（不平衡） */
  D.readmit = function (seed, n) {
    const r = R(2000 + seed), out = [];
    for (let i = 0; i < n; i++) {
      const age = Math.round(M.clamp(66 + N(r) * 13, 22, 95)), los = Math.max(1, Math.round(5 + Math.abs(N(r)) * 5));
      const prior = Math.min(6, Math.floor(-Math.log(1 - r() * 0.98) * 1.1)), cci = Math.min(8, Math.max(0, Math.round(2 + N(r) * 1.7)));
      const follow = r() < 0.55 ? 1 : 0;
      const z = -4.6 + 0.022 * (age - 60) + 0.07 * los + 0.75 * prior + 0.32 * cci - 0.9 * follow;
      out.push({ id: i + 1, age, los, prior, cci, follow, readmit: r() < M.sigmoid(z) ? 1 : 0 });
    }
    if (!out.some(o => o.readmit)) out[0].readmit = 1;
    return out;
  };

  /* 處方籃：每筆 2–6 類藥品；代謝症候群三類常一起出現，止痛藥常配胃藥 */
  D.rx = function (seed, n) {
    const r = R(3000 + seed), keys = D.rxItems.map(x => x[0]), out = [];
    for (let i = 0; i < n; i++) {
      const s = {}; const u = r();
      if (u < 0.45) { s.antidiabetic = r() < 0.8; s.antihypertensive = r() < 0.85; s.statin = r() < 0.7; s.antiplatelet = r() < 0.4; }
      else if (u < 0.75) { s.nsaid = r() < 0.9; s.ppi = r() < 0.75; s.hypnotic = r() < 0.25; }
      else { s.antibiotic = r() < 0.7; s.nsaid = r() < 0.45; s.ppi = r() < 0.3; }
      if (r() < 0.22) s.vitamin = true; if (r() < 0.15) s.hypnotic = true; if (r() < 0.2) s.antihypertensive = true;
      let items = keys.filter(k => s[k]); if (items.length < 2) items = Array.from(new Set(items.concat(['ppi', 'vitamin']))).slice(0, 2);
      const row = { id: i + 1, items }; keys.forEach(k => { row[k] = items.includes(k) ? 1 : 0; }); out.push(row);
    }
    return out;
  };
  D.rxLabel = k => (D.rxItems.find(x => x[0] === k) || [k, k])[1];

  /* 護理紀錄短句（人工撰寫的模擬語料）與斷詞用小字典 */
  const NOTES = [
    [0, '病人夜間自行下床如廁步態不穩'], [0, '病人使用助行器行走仍步態不穩'], [0, '夜間下床未按叫人鈴有跌倒風險'], [0, '病人頭暈下床需協助已拉起床欄'],
    [0, '服用安眠藥後夜間下床步態不穩'], [0, '病人意識混亂自行下床有跌倒風險'], [0, '已教導下床前按叫人鈴並拉起床欄'], [0, '病人頭暈無力行走需協助'],
    [1, '病人主訴傷口疼痛疼痛指數七分'], [1, '給予止痛藥後疼痛指數降為三分'], [1, '病人主訴頭痛給予止痛藥'], [1, '夜間主訴腹部疼痛無法入睡'],
    [1, '疼痛指數八分已通知醫師'], [1, '病人主訴下背疼痛給予熱敷'], [1, '給予止痛藥後病人表示疼痛緩解'], [1, '病人主訴腹部疼痛疼痛指數六分'],
    [2, '傷口有滲液已更換敷料'], [2, '傷口紅腫有滲液已通知醫師'], [2, '傷口乾燥無紅腫已更換敷料'], [2, '壓傷傷口換藥後覆蓋敷料'],
    [2, '手術傷口乾燥無滲液'], [2, '傷口換藥時病人主訴疼痛'], [2, '壓傷傷口紅腫給予換藥並協助翻身'], [2, '手術傷口有滲液已更換敷料並通知醫師']
  ];
  D.dict = ['病人', '夜間', '自行', '下床', '如廁', '步態不穩', '使用', '助行器', '行走', '仍', '未', '按', '叫人鈴', '有', '跌倒風險', '頭暈', '需', '協助', '已', '拉起', '床欄', '服用', '安眠藥', '後', '意識混亂', '教導', '前', '並', '無力',
    '主訴', '傷口', '疼痛', '疼痛指數', '七分', '給予', '止痛藥', '降為', '三分', '頭痛', '腹部', '無法', '入睡', '八分', '通知', '醫師', '下背', '熱敷', '表示', '緩解', '六分',
    '滲液', '更換', '敷料', '紅腫', '乾燥', '無', '壓傷', '換藥', '覆蓋', '手術', '時', '翻身'];
  D.stop = ['病人', '已', '有', '後', '並', '仍', '時', '前', '需', '未', '按'];
  D.notes = function (seed, n) {
    const r = R(4000 + seed), per = Math.max(1, Math.floor((n || 12) / 3)), out = [];
    [0, 1, 2].forEach(c => { LAB.shuffle(r, NOTES.filter(x => x[0] === c)).slice(0, per).forEach(x => out.push(x)); });
    return LAB.shuffle(r, out).map((x, i) => ({ id: i + 1, text: x[1], label: x[0] }));
  };

  /* 6×6 灰階小圖（0–9）：直線、橫線、斜線、十字、方塊，加少量雜訊 */
  D.img = function (seed) {
    const r = R(5000 + seed), S = 6;
    const mk = (name, f) => ({ name, px: M.range(S * S, i => { const y = Math.floor(i / S), x = i % S; return M.clamp((f(x, y) ? 8 : 1) + Math.round(N(r) * 0.6), 0, 9); }) });
    return [mk('直線', (x) => x === 2 || x === 3), mk('橫線', (x, y) => y === 2 || y === 3), mk('斜線', (x, y) => Math.abs(x - y) <= 0), mk('十字', (x, y) => x === 2 || y === 3), mk('方塊', (x, y) => x >= 1 && x <= 4 && y >= 1 && y <= 4 && (x === 1 || x === 4 || y === 1 || y === 4))]
      .map((o, i) => Object.assign({ id: i + 1, size: S }, o));
  };

  /* 月門診量：趨勢＋12 個月季節性＋雜訊 */
  D.opd = function (seed, n) {
    const r = R(6000 + seed), season = [1.12, 0.86, 1.02, 0.98, 0.97, 0.93, 0.95, 0.94, 0.99, 1.03, 1.07, 1.14], out = [];
    for (let t = 0; t < (n || 36); t++) {
      const y = 2024 + Math.floor(t / 12), m = t % 12 + 1;
      out.push({ id: t + 1, t: t + 1, month: y + '-' + String(m).padStart(2, '0'), visits: Math.round((2400 + 14 * t) * season[m - 1] + N(r) * 60) });
    }
    return out;
  };

  /* 挖掉部分數值（補值實驗用）：回傳新陣列，缺值為 null */
  D.withMissing = function (rows, keys, rate, seed) {
    const r = R(7000 + seed), out = rows.map(o => Object.assign({}, o)); let cnt = 0;
    out.forEach(o => keys.forEach(k => { if (r() < rate) { o[k] = null; cnt++; } }));
    if (!cnt && out.length) out[Math.min(2, out.length - 1)][keys[0]] = null;
    return out;
  };
})(typeof window !== 'undefined' ? window : globalThis);
