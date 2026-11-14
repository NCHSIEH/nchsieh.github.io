/* MyAssets 共用核心：清單讀取、行情抓取、技術指標、漸進燈號 */
(function (global) {
  'use strict';

  const CONFIG = {
    ownerEmail: 'nchsieh@gmail.com',
    sheetLink: 'https://docs.google.com/spreadsheets/d/13_apEylQGyscoaEjRDtF5MZo64GXJ5pz6MsODNfLcYo/edit',
    // 未登入時的示範清單（也是新使用者的預設清單）
    demo: [
      ['0050', '元大台灣50', 'ETF'],
      ['0056', '元大高股息', 'ETF'],
      ['00878', '國泰永續高股息', 'ETF'],
      ['2330', '台積電', '個股'],
      ['2317', '鴻海', '個股'],
      ['2454', '聯發科', '個股']
    ]
  };


  const FM = 'https://api.finmindtrade.com/api/v4/data';

  /* ---------- 小工具 ---------- */
  const pad = n => String(n).padStart(2, '0');
  const ymd = d => d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  const daysAgo = n => { const d = new Date(); d.setDate(d.getDate() - n); return ymd(d); };
  const clamp = (x, a = -1, b = 1) => Math.max(a, Math.min(b, x));
  const fmt = (x, d = 2) => (x == null || isNaN(x)) ? '—' : Number(x).toLocaleString('zh-TW', { minimumFractionDigits: d, maximumFractionDigits: d });

  function cacheBucket() {
    // 收盤資料約 14:30 後陸續更新：上午、下午、晚上分三段快取
    const d = new Date(); const h = d.getHours();
    return ymd(d) + (h < 14 ? 'a' : h < 18 ? 'b' : 'c');
  }
  function lsGet(k) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 容量滿或無痕模式 */ } }
  function clearCache() {
    try { Object.keys(localStorage).filter(k => k.startsWith('ma:')).forEach(k => localStorage.removeItem(k)); } catch (e) { }
  }

  async function finmind(dataset, id, start, mapper) {
    const key = 'ma:' + cacheBucket() + ':' + dataset + ':' + id;
    const hit = lsGet(key);
    if (hit) return hit;
    const url = FM + '?dataset=' + dataset + '&data_id=' + encodeURIComponent(id) + '&start_date=' + start;
    const r = await fetch(url);
    if (!r.ok) throw new Error('FinMind ' + r.status);
    const j = await r.json();
    if (j.status !== 200) throw new Error(j.msg || 'FinMind error');
    const data = mapper ? mapper(j.data) : j.data;
    lsSet(key, data);
    return data;
  }

  async function pool(items, n, fn) {
    const out = new Array(items.length); let i = 0;
    const workers = Array.from({ length: Math.min(n, items.length) }, async () => {
      while (i < items.length) { const k = i++; try { out[k] = await fn(items[k], k); } catch (e) { out[k] = { error: e.message }; } }
    });
    await Promise.all(workers); return out;
  }

  /* ---------- 清單 ---------- */
  function parseCSV(t) {
    const rows = []; let row = [], cur = '', q = false;
    for (let i = 0; i < t.length; i++) {
      const c = t[i];
      if (q) { if (c === '"') { if (t[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += c; }
      else if (c === '"') q = true;
      else if (c === ',') { row.push(cur); cur = ''; }
      else if (c === '\n' || c === '\r') { if (c === '\r' && t[i + 1] === '\n') i++; row.push(cur); rows.push(row); row = []; cur = ''; }
      else cur += c;
    }
    if (cur !== '' || row.length) { row.push(cur); rows.push(row); }
    return rows;
  }

  async function fetchSheet(url) {
    const r = await fetch(url + (url.includes('?') ? '&' : '?') + 't=' + Date.now());
    if (!r.ok) throw new Error('sheet ' + r.status);
    const out = [];
    parseCSV(await r.text()).slice(1).forEach(c => {
      if ((c[0] || '').trim()) out.push({ code: c[0].trim().toUpperCase(), name: (c[1] || '').trim(), type: (c[2] || '個股').trim(), held: (c[3] || '是').trim() !== '否', origin: 'sheet' });
      if ((c[5] || '').trim()) out.push({ code: c[5].trim().toUpperCase(), name: (c[6] || '').trim(), type: (c[7] || '個股').trim(), held: false, origin: 'sheet' });
    });
    return out;
  }

  // userDoc：登入者的 Firestore 文件；null＝未登入，顯示示範清單
  async function loadList(userDoc) {
    if (!userDoc) return { src: 'demo', items: CONFIG.demo.map(r => ({ code: r[0], name: r[1], type: r[2], held: false, origin: 'demo' })), hidden: [] };
    let src = 'custom', base = [];
    if (userDoc.sheetCsv) {
      try { base = await fetchSheet(userDoc.sheetCsv); src = 'sheet'; } catch (e) { src = 'sheet-error'; }
    }
    const hide = new Set(userDoc.hide || []);
    const hidden = base.filter(x => hide.has(x.code));
    const seen = new Set();
    const items = base.filter(x => !hide.has(x.code))
      .concat((userDoc.list || []).map(a => ({ code: a.code, name: a.name, type: a.type, held: !!a.held, origin: 'custom' })))
      .filter(x => !seen.has(x.code) && seen.add(x.code));
    return { src, items, hidden };
  }

  /* ---------- 加入／刪除（寫回登入者的雲端清單） ---------- */
  function legacyLocal() { const c = lsGet('myassets-custom') || {}; return { add: c.add || [], hide: c.hide || [] }; }
  async function lookup(code) {
    code = code.trim().toUpperCase();
    if (!/^\d{4,6}[A-Z]?$/.test(code)) throw new Error('代號格式不對（例：2317、00878、00937B）');
    const r = await fetch(FM + '?dataset=TaiwanStockInfo&data_id=' + code);
    const j = await r.json();
    const row = (j.data || []).find(x => x.stock_id === code);
    if (!row) throw new Error('查不到 ' + code + '，請確認代號');
    const cat = row.industry_category || '';
    const type = /ETF|受益/.test(cat) || /^00/.test(code) ? (/B$/.test(code) ? '債券ETF' : 'ETF') : '個股';
    return { code, name: row.stock_name, type };
  }
  async function addTicker(userDoc, code, held) {
    const t = await lookup(code);
    userDoc.list = userDoc.list || []; userDoc.hide = userDoc.hide || [];
    if (userDoc.hide.includes(t.code)) userDoc.hide = userDoc.hide.filter(x => x !== t.code);
    else if (!userDoc.list.some(a => a.code === t.code)) userDoc.list.push({ ...t, held: !!held });
    await global.MAAuth.save(userDoc); return t;
  }
  async function removeTicker(userDoc, code, origin) {
    if (origin === 'custom') userDoc.list = (userDoc.list || []).filter(a => a.code !== code);
    else { userDoc.hide = userDoc.hide || []; if (!userDoc.hide.includes(code)) userDoc.hide.push(code); }
    await global.MAAuth.save(userDoc);
  }
  async function restoreTicker(userDoc, code) { userDoc.hide = (userDoc.hide || []).filter(x => x !== code); await global.MAAuth.save(userDoc); }
  async function toggleHeld(userDoc, code) { (userDoc.list || []).forEach(a => { if (a.code === code) a.held = !a.held; }); await global.MAAuth.save(userDoc); }
  async function setSheet(userDoc, url) { userDoc.sheetCsv = (url || '').trim(); await global.MAAuth.save(userDoc); }

  // 第一次登入：建立個人文件（擁有者自動連結試算表，並帶入先前存在瀏覽器的自選）
  async function ensureUserDoc(user) {
    let d = await global.MAAuth.load();
    if (!d) {
      const old = legacyLocal();
      d = { list: old.add.map(a => ({ ...a, held: false })), hide: old.hide, sheetCsv: '' };
      if (!d.sheetCsv && !d.list.length) d.list = CONFIG.demo.map(r => ({ code: r[0], name: r[1], type: r[2], held: false }));
      await global.MAAuth.save(d);
    }
    d.list = d.list || []; d.hide = d.hide || [];
    return d;
  }

  /* ---------- 指標計算（全部為因果計算：第 i 天只用到第 i 天以前的資料） ---------- */
  function rollMean(a, n) { const o = new Array(a.length).fill(null); let s = 0; for (let i = 0; i < a.length; i++) { s += a[i]; if (i >= n) s -= a[i - n]; if (i >= n - 1) o[i] = s / n; } return o; }
  function ema(a, n) { const k = 2 / (n + 1); const o = []; a.forEach((v, i) => o.push(i ? v * k + o[i - 1] * (1 - k) : v)); return o; }
  function rsiArr(c, n = 14) {
    const o = new Array(c.length).fill(null); if (c.length <= n) return o;
    let g = 0, l = 0;
    for (let i = 1; i <= n; i++) { const d = c[i] - c[i - 1]; if (d > 0) g += d; else l -= d; }
    g /= n; l /= n; o[n] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
    for (let i = n + 1; i < c.length; i++) {
      const d = c[i] - c[i - 1];
      g = (g * (n - 1) + Math.max(d, 0)) / n; l = (l * (n - 1) + Math.max(-d, 0)) / n;
      o[i] = l === 0 ? 100 : 100 - 100 / (1 + g / l);
    }
    return o;
  }
  function prep(px) {
    const c = px.map(x => x.close), h = px.map(x => x.max), l = px.map(x => x.min), v = px.map(x => x.Trading_Volume);
    const e12 = ema(c, 12), e26 = ema(c, 26), dif = c.map((_, i) => e12[i] - e26[i]), dea = ema(dif, 9);
    const hist = dif.map((x, i) => x - dea[i]);
    let K = 50, D = 50; const Ks = [], Ds = [];
    for (let i = 0; i < c.length; i++) {
      const s = Math.max(0, i - 8); let hi = -Infinity, lo = Infinity;
      for (let k = s; k <= i; k++) { if (h[k] > hi) hi = h[k]; if (l[k] < lo) lo = l[k]; }
      const rsv = hi === lo ? 50 : (c[i] - lo) / (hi - lo) * 100;
      K = K * 2 / 3 + rsv / 3; D = D * 2 / 3 + K / 3; Ks.push(K); Ds.push(D);
    }
    return { px, c, h, l, v, ma20: rollMean(c, 20), ma60: rollMean(c, 60), ma40: rollMean(c, 40), hist, K: Ks, D: Ds, rsi: rsiArr(c) };
  }

  const WEIGHTS = { ma: 1.2, macd: 1.0, kd: 0.8, rsi: 0.6, inst: 0.8 };
  const IND_NAMES = { ma: '均線趨勢', macd: 'MACD 動能', kd: 'KD 轉折', rsi: 'RSI 冷熱', inst: '法人籌碼' };
  // 各預測期間的權重：短期看 KD／RSI，長期看均線趨勢
  const HORIZONS = [
    { k: 1, label: '隔日', long: '隔日（1 個交易日）', w: { kd: 1.2, rsi: 1.0, macd: 0.8, ma: 0.4, inst: 0.8 } },
    { k: 3, label: '3日', long: '3 日（3 個交易日）', w: { kd: 1.0, rsi: 0.8, macd: 1.0, ma: 0.6, inst: 0.8 } },
    { k: 5, label: '1週', long: '1 週（7 天，約 5 個交易日）', w: { kd: 0.8, rsi: 0.6, macd: 1.0, ma: 1.0, inst: 0.8 } },
    { k: 10, label: '2週', long: '2 週（約 10 個交易日）', w: { kd: 0.5, rsi: 0.5, macd: 1.0, ma: 1.2, inst: 0.6 } },
    { k: 20, label: '1個月', long: '1 個月（約 20 個交易日）', w: { kd: 0.3, rsi: 0.4, macd: 0.8, ma: 1.5, inst: 0.5 } }
  ];

  // 第 i 天的 5 項指標
  function indAt(A, i, instByDate) {
    const { c, h, l, v, px } = A; const last = c[i];
    const ma20 = A.ma20[i], ma60 = A.ma60[i] || A.ma40[i] || ma20, ma20p = A.ma20[i - 5];
    const ind = {};
    {
      const a = clamp((last - ma20) / ma20 / 0.03), b = clamp((ma20 - ma60) / ma60 / 0.03), s = clamp((ma20 - ma20p) / ma20p / 0.01);
      let t;
      if (last > ma20 && ma20 > ma60) t = '股價站上月線，月線在季線之上（多頭排列）';
      else if (last < ma20 && ma20 < ma60) t = '股價跌破月線，月線在季線之下（空頭排列）';
      else if (last > ma20) t = '股價站上月線，但月線仍在季線之下（整理偏多）';
      else t = '股價跌破月線，但月線仍在季線之上（整理偏弱）';
      ind.ma = { score: clamp(a * 0.4 + b * 0.3 + s * 0.3), value: '月線 ' + fmt(ma20) + '／季線 ' + fmt(ma60), text: t };
    }
    {
      const hs = A.hist[i], hp = A.hist[i - 1];
      const sc = clamp(clamp(hs / last / 0.004) * 0.7 + Math.sign(hs - hp) * 0.3);
      let cross = '';
      for (let k = 0; k < 3; k++) {
        if (A.hist[i - k] > 0 && A.hist[i - k - 1] <= 0) cross = '，近 3 日出現黃金交叉';
        if (A.hist[i - k] < 0 && A.hist[i - k - 1] >= 0) cross = '，近 3 日出現死亡交叉';
      }
      ind.macd = { score: sc, value: '柱狀體 ' + fmt(hs, 3), text: (hs > 0 ? (hs >= hp ? '多方動能增強' : '多方動能減弱') : (hs <= hp ? '空方動能增強' : '空方動能減弱')) + cross };
    }
    {
      const K = A.K[i], D = A.D[i], pK = A.K[i - 1], pD = A.D[i - 1];
      let sc = clamp((K - D) / 10) * 0.65 + clamp((50 - K) / 50) * 0.35;
      let t = K > D ? 'K 值在 D 值之上，短線偏多' : 'K 值在 D 值之下，短線偏弱';
      if (pK <= pD && K > D) { t = (K < 30 ? '低檔' : '') + '黃金交叉，短線轉強'; sc += K < 30 ? 0.3 : 0.15; }
      if (pK >= pD && K < D) { t = (K > 70 ? '高檔' : '') + '死亡交叉，短線轉弱'; sc -= K > 70 ? 0.3 : 0.15; }
      if (K >= 80 && K >= D) t = '高檔鈍化，強勢但追高風險大';
      if (K <= 20 && K <= D) t = '低檔鈍化，弱勢但跌幅已深';
      ind.kd = { score: clamp(sc), value: 'K ' + fmt(K, 0) + '／D ' + fmt(D, 0), text: t };
    }
    {
      const r = A.rsi[i];
      ind.rsi = { score: clamp((50 - r) / 22), value: 'RSI ' + fmt(r, 0), text: r >= 70 ? '過熱區，容易拉回' : r >= 60 ? '偏熱，漲多留意' : r <= 30 ? '超賣區，容易反彈' : r <= 40 ? '偏冷，跌多可留意' : '中性區' };
    }
    {
      let net = 0, have = 0, vol = 0;
      for (let k = Math.max(0, i - 4); k <= i; k++) { vol += v[k]; const d = px[k].date; if (instByDate && d in instByDate) { net += instByDate[d]; have++; } }
      if (have >= 3 && vol > 0) {
        const ratio = net / vol, lots = Math.round(net / 1000);
        ind.inst = { score: clamp(ratio / 0.05), value: '5日' + (lots >= 0 ? '買超 ' : '賣超 ') + Math.abs(lots).toLocaleString() + ' 張', text: ratio > 0.01 ? '三大法人近 5 日偏買' : ratio < -0.01 ? '三大法人近 5 日偏賣' : '三大法人進出不明顯' };
      } else ind.inst = { score: 0, value: '無資料', text: '無法人資料，不計入', skip: true };
    }
    return ind;
  }
  function wscore(ind, w, noInst) {
    let sw = 0, ss = 0;
    Object.keys(ind).forEach(k => { if (ind[k].skip || (noInst && k === 'inst')) return; sw += w[k]; ss += w[k] * ind[k].score; });
    return sw ? ss / sw : 0;
  }
  const pct = (a, q) => { const s = a.slice().sort((x, y) => x - y); const p = (s.length - 1) * q, f = Math.floor(p); return s[f] + (s[Math.min(f + 1, s.length - 1)] - s[f]) * (p - f); };

  // 各期間預測：本身的加權分數＋過去「技術面分數相近」的日子，之後 N 日實際漲跌統計
  function forecast(A, i, indNow, histInd) {
    return HORIZONS.map(H => {
      const sNow = wscore(indNow, H.w), sTech = wscore(indNow, H.w, true);
      const samp = [];
      for (let t = 65; t + H.k <= i; t++) samp.push({ d: Math.abs(wscore(histInd[t], H.w, true) - sTech), r: A.c[t + H.k] / A.c[t] - 1 });
      if (samp.length < 40) return { H, score: sNow, n: 0 };
      samp.sort((a, b) => a.d - b.d);
      const k = Math.max(40, Math.round(samp.length * 0.15));
      const nb = samp.slice(0, k).map(x => x.r);
      const up = nb.filter(x => x > 0).length / nb.length;
      const base = samp.filter(x => x.r > 0).length / samp.length;
      const score = clamp(0.5 * sNow + 0.5 * clamp((up - 0.5) / 0.2));
      return { H, score, rule: sNow, up, base, med: pct(nb, 0.5) * 100, p25: pct(nb, 0.25) * 100, p75: pct(nb, 0.75) * 100, n: nb.length };
    });
  }

  function evaluateAll(px, instByDate) {
    const n = px.length; if (n < 70) return { now: null, yest: null };
    const A = prep(px);
    const histInd = new Array(n);
    for (let t = 30; t < n; t++) histInd[t] = indAt(A, t, null);
    const build = i => {
      const ind = indAt(A, i, instByDate);
      const c = A.c, lo20 = Math.min(...A.l.slice(i - 19, i + 1)), hi20 = Math.max(...A.h.slice(i - 19, i + 1));
      return { date: px[i].date, close: c[i], prev: c[i - 1], change: c[i] - c[i - 1], pct: (c[i] - c[i - 1]) / c[i - 1] * 100,
        ma20: A.ma20[i], ma60: A.ma60[i], lo20, hi20, ind, score: wscore(ind, WEIGHTS), fc: forecast(A, i, ind, histInd) };
    };
    return { now: build(n - 1), yest: build(n - 2) };
  }

  /* ---------- 燈號顏色與文字 ---------- */
  function color(s) { // 台灣習慣：+1 紅（漲）→ 0 黃 → -1 綠（跌），連續漸變
    const x = clamp(s); const hue = 60 * (1 - x);
    const light = 47 - Math.abs(x) * 6 + (Math.abs(x) < 0.3 ? 3 : 0);
    return 'hsl(' + hue.toFixed(0) + ',78%,' + light.toFixed(0) + '%)';
  }
  function ink(s) { return Math.abs(s) < 0.35 ? '#1f2937' : '#fff'; }
  function level(s) {
    if (s >= 0.55) return { label: '強烈會漲', short: '強漲' };
    if (s >= 0.2) return { label: '偏向會漲', short: '偏漲' };
    if (s > -0.2) return { label: '維持盤整', short: '維持' };
    if (s > -0.55) return { label: '偏向會跌', short: '偏跌' };
    return { label: '強烈會跌', short: '強跌' };
  }
  function strength(s) { return Math.round(Math.abs(s) * 100); }
  function advice(item, s) {
    const etf = item.type.includes('ETF'), bond = item.type.includes('債');
    if (!item.held) {
      if (s >= 0.55) return '訊號強，可留意進場點';
      if (s >= 0.2) return '偏多，可列入觀察、等拉回再買';
      if (s > -0.2) return '方向不明，先觀望';
      return '偏弱，先不進場';
    }
    if (etf) {
      if (s >= 0.55) return bond ? '債券 ETF 走強，可分批加碼' : '技術面強，可分批加碼';
      if (s >= 0.2) return '偏多，可小量加碼或續抱領息';
      if (s > -0.2) return '持續領息，維持不動';
      if (s > -0.55) return '短線偏弱，暫緩加碼（領息部位不必急賣）';
      return '明顯轉弱，暫停加碼，等止跌訊號';
    }
    if (s >= 0.55) return '趨勢強，續抱；有空手可分批買';
    if (s >= 0.2) return '偏多，續抱觀察';
    if (s > -0.2) return '盤整，維持觀察';
    if (s > -0.55) return '偏弱，設好停損點';
    return '明顯轉弱，考慮減碼或停損';
  }

  /* ---------- 整合：抓一檔的全部資料 ---------- */
  async function loadOne(item) {
    const raw = await finmind('TaiwanStockPrice', item.code, daysAgo(1100), d => d.filter(x => x.close > 0).map(x => ({ date: x.date, max: x.max, min: x.min, close: x.close, Trading_Volume: x.Trading_Volume })));
    const px = raw.slice().sort((a, b) => a.date < b.date ? -1 : 1);
    let instByDate = null;
    try {
      const inst = await finmind('TaiwanStockInstitutionalInvestorsBuySell', item.code, daysAgo(30));
      if (inst && inst.length) { instByDate = {}; inst.forEach(r => { instByDate[r.date] = (instByDate[r.date] || 0) + (r.buy - r.sell); }); }
    } catch (e) { }
    const ev = evaluateAll(px, instByDate);
    return { item, px, now: ev.now, yest: ev.yest };
  }
  async function loadAll(items, onProgress) {
    let done = 0;
    return pool(items, 4, async it => { const r = await loadOne(it); onProgress && onProgress(++done, items.length); return r; });
  }
  async function loadDividends(item) {
    const d = await finmind('TaiwanStockDividend', item.code, daysAgo(400));
    return (d || []).filter(x => x.CashEarningsDistribution > 0 && x.CashExDividendTradingDate)
      .map(x => ({ ex: x.CashExDividendTradingDate, pay: x.CashDividendPaymentDate, cash: x.CashEarningsDistribution + (x.CashStatutorySurplus || 0) }))
      .sort((a, b) => a.ex < b.ex ? -1 : 1);
  }

  /* ---------- 說明小視窗：電腦滑鼠移上去、手機點一下 ---------- */
  const TIPS = {
    score: ['綜合燈號', '5 項指標的加權平均（均線 1.2、MACD 1.0、KD 0.8、法人 0.8、RSI 0.6）。', '紅色越深越偏向會漲，綠色越深越偏向會跌，黃色＝盤整維持。百分比是訊號強度。'],
    ma: ['均線趨勢', '看中期方向。月線＝近 20 個交易日平均價，季線＝近 60 日。', '股價在月線上、月線在季線上且往上走＝偏紅（偏漲）；三者反過來＝偏綠（偏跌）；交錯＝黃（整理）。'],
    macd: ['MACD 動能', '看漲跌的力道有沒有變強。', '柱狀體大於 0 而且變長＝多方增強（紅）；小於 0 而且變長＝空方增強（綠）；柱狀體縮短＝力道減弱（偏黃）。由負轉正叫黃金交叉。'],
    kd: ['KD 轉折', '看短線轉折點，反應最快。', 'K 在 D 之上偏紅、之下偏綠。K 低於 20 時往上穿過 D（低檔黃金交叉）是常見買點；高於 80 時往下穿過 D（高檔死亡交叉）是常見賣點。'],
    rsi: ['RSI 冷熱', '看漲過頭或跌過頭，是反向指標。', '70 以上＝過熱、容易拉回（偏綠）；30 以下＝超賣、容易反彈（偏紅）。強勢股常見黃到偏綠，只是提醒別追高，不代表會大跌。'],
    inst: ['法人籌碼', '外資、投信、自營商近 5 個交易日的買賣超，除以同期成交量。', '買超偏紅、賣超偏綠，買賣超達成交量 5% 為最深色。沒有法人資料的標的不計入。'],
    yest: ['昨日燈號', '前一交易日的綜合燈號。', '和今天比較：顏色由綠轉紅代表轉強，由紅轉綠代表轉弱。'],
    hz: ['期間預測', '該期間專屬的指標權重分數（50%）＋這檔股票過去三年「指標狀況相似的日子」之後實際上漲的機率（50%）。', '短期看 KD、RSI，長期看均線趨勢。紅＝偏漲、綠＝偏跌、黃＝方向不明。']
  };
  function initTips() {
    if (document.querySelector('.tip-pop')) return;
    const pop = document.createElement('div'); pop.className = 'tip-pop'; pop.hidden = true; document.body.appendChild(pop);
    const hover = () => global.matchMedia && global.matchMedia('(hover: hover) and (pointer: fine)').matches;
    let cur = null;
    function show(el) {
      const t = TIPS[el.dataset.tip]; if (!t) return;
      cur = el;
      const title = el.dataset.tipTitle || t[0];
      pop.innerHTML = '<b>' + title + '</b><div>' + t[1] + '</div><div class="tip-how">' + t[2] + '</div>' +
        (el.dataset.tipExtra ? '<div class="tip-x">' + el.dataset.tipExtra + '</div>' : '') +
        '<div class="tip-leg"><span>偏跌</span><i></i><span>偏漲</span></div>';
      pop.hidden = false;
      const r = el.getBoundingClientRect(), w = pop.offsetWidth, h = pop.offsetHeight;
      let left = Math.max(8, Math.min(r.left + r.width / 2 - w / 2, innerWidth - w - 8));
      let top = r.bottom + 8; if (top + h > innerHeight - 8 && r.top - h - 8 > 8) top = r.top - h - 8;
      pop.style.left = left + 'px'; pop.style.top = top + 'px';
    }
    function hide() { pop.hidden = true; cur = null; }
    document.addEventListener('mouseover', e => {
      if (!hover()) return;
      const el = e.target.closest('[data-tip]');
      if (el) { if (el !== cur) show(el); } else if (!e.target.closest('.tip-pop')) hide();
    });
    document.addEventListener('click', e => {
      const el = e.target.closest('[data-tip]');
      if (el) { e.preventDefault(); e.stopPropagation(); if (cur === el && !hover()) hide(); else show(el); }
      else if (!e.target.closest('.tip-pop')) hide();
    }, true);
    global.addEventListener('scroll', hide, { passive: true });
    global.addEventListener('resize', hide);
  }

  /* ---------- 資料來源說明 ---------- */
  const SOURCES_HTML = '<div class="box src"><h2>資料來源</h2><ul>' +
    '<li><b>股價（開高低收、成交量）</b>：每日收盤資料，原始來源為<a href="https://www.twse.com.tw/" target="_blank" rel="noopener">臺灣證券交易所</a>（上市）與<a href="https://www.tpex.org.tw/" target="_blank" rel="noopener">證券櫃檯買賣中心</a>（上櫃，例如 00933B、00937B），經 <a href="https://finmindtrade.com/" target="_blank" rel="noopener">FinMind</a> 開放資料 API 取得。約下午 2:30～3:30 收盤資料公布後更新；盤中看到的是前一交易日。均線、MACD、KD、RSI 都由這份資料計算。</li>' +
    '<li><b>三大法人買賣超</b>：證交所／櫃買中心每日公布的外資、投信、自營商買賣超，經 FinMind 取得，約下午 4～5 點後更新，取近 30 天。</li>' +
    '<li><b>各期間預測的歷史統計</b>：同一份每日股價，取約三年（1,100 天）在瀏覽器即時計算，不另外抓資料。</li>' +
    '<li><b>配息行事曆</b>：證交所／櫃買中心的除權息公告，經 FinMind 取得。</li>' +
    '<li><b>股票名稱與類別</b>：FinMind 台股總覽（TaiwanStockInfo）。</li>' +
    '<li><b>看盤清單</b>：登入者自己的清單（存於 Google Firebase）；擁有者另連結 Google 試算表「看盤清單」分頁。</li>' +
    '</ul><p style="font-size:12px;color:#64748b;margin:6px 0 0">FinMind 為第三方整理的開放資料，若與交易所公告不一致，以交易所為準。資料抓取後在您的瀏覽器暫存（同一時段不重抓），按「重新整理」可強制更新。</p></div>';

  const sma = (a, n, i) => { if (i < n - 1) return null; let s = 0; for (let k = i - n + 1; k <= i; k++) s += a[k]; return s / n; };
  /* ---------- 迷你走勢圖 ---------- */
  function sparkline(px, opt = {}) {
    const N = opt.days || 60, W = opt.w || 120, H = opt.h || 36;
    const P = px.slice(-N); if (P.length < 2) return '';
    const c = px.map(x => x.close);
    const off = px.length - P.length;
    const ma = P.map((_, j) => sma(c, 20, off + j));
    const ma60 = opt.ma60 ? P.map((_, j) => sma(c, 60, off + j)) : [];
    const vals = P.map(x => x.close).concat(ma.filter(x => x), ma60.filter(x => x));
    const lo = Math.min(...vals), hi = Math.max(...vals), rg = hi - lo || 1;
    const X = j => (j / (P.length - 1) * (W - 2) + 1).toFixed(1), Y = y => (H - 2 - (y - lo) / rg * (H - 4)).toFixed(1);
    const path = arr => arr.map((y, j) => y == null ? null : X(j) + ',' + Y(y)).filter(Boolean).join(' ');
    const sw = opt.stroke || 1.6;
    return '<svg class="spark" viewBox="0 0 ' + W + ' ' + H + '" width="' + W + '" height="' + H + '" aria-hidden="true">' +
      (opt.ma60 ? '<polyline fill="none" stroke="#a78bfa" stroke-width="1" stroke-dasharray="3 2" points="' + path(ma60) + '"/>' : '') +
      '<polyline fill="none" stroke="#94a3b8" stroke-width="1" stroke-dasharray="3 2" points="' + path(ma) + '"/>' +
      '<polyline fill="none" stroke="#1e293b" stroke-width="' + sw + '" points="' + path(P.map(x => x.close)) + '"/></svg>';
  }

  global.MA = { SOURCES_HTML, TIPS, initTips, CONFIG, IND_NAMES, WEIGHTS, HORIZONS, loadList, loadAll, loadOne, loadDividends, evaluateAll, color, ink, level, strength, advice, sparkline, fmt, clearCache, ymd, addTicker, removeTicker, restoreTicker, toggleHeld, setSheet, ensureUserDoc };
})(window);
