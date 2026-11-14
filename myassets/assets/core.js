/* MyAssets 共用核心：清單讀取、行情抓取、技術指標、漸進燈號 */
(function (global) {
  'use strict';

  const CONFIG = {
    // Google 試算表「看盤清單」分頁「發布到網路」的 CSV 網址；空白時使用下方備援清單
    sheetCsv: '',
    sheetLink: 'https://docs.google.com/spreadsheets/d/13_apEylQGyscoaEjRDtF5MZo64GXJ5pz6MsODNfLcYo/edit',
    fallback: [
      ['0056', '元大高股息', 'ETF', '是'],
      ['00919', '群益台灣精選高息', 'ETF', '是'],
      ['00929', '復華台灣科技優息', 'ETF', '是'],
      ['00878', '國泰永續高股息', 'ETF', '是'],
      ['00922', '國泰台灣領袖50', 'ETF', '是'],
      ['00933B', '國泰10Y+金融債', '債券ETF', '是'],
      ['00937B', '群益ESG投等債20+', '債券ETF', '是'],
      ['1504', '東元', '個股', '是'],
      ['2330', '台積電', '個股', '否'],
      ['3231', '緯創', '個股', '是'],
      ['3346', '麗清', '個股', '是']
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

  async function finmind(dataset, id, start) {
    const key = 'ma:' + cacheBucket() + ':' + dataset + ':' + id;
    const hit = lsGet(key);
    if (hit) return hit;
    const url = FM + '?dataset=' + dataset + '&data_id=' + encodeURIComponent(id) + '&start_date=' + start;
    const r = await fetch(url);
    if (!r.ok) throw new Error('FinMind ' + r.status);
    const j = await r.json();
    if (j.status !== 200) throw new Error(j.msg || 'FinMind error');
    lsSet(key, j.data);
    return j.data;
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

  async function loadList() {
    let src = 'fallback', rows = CONFIG.fallback;
    if (CONFIG.sheetCsv) {
      try {
        const r = await fetch(CONFIG.sheetCsv + (CONFIG.sheetCsv.includes('?') ? '&' : '?') + 't=' + Date.now());
        if (r.ok) {
          const all = parseCSV(await r.text()).slice(1);
          const list = [];
          all.forEach(c => {
            if ((c[0] || '').trim()) list.push([c[0].trim(), (c[1] || '').trim(), (c[2] || '個股').trim(), (c[3] || '是').trim()]);
            if ((c[5] || '').trim()) list.push([c[5].trim(), (c[6] || '').trim(), (c[7] || '個股').trim(), '否']);
          });
          if (list.length) { rows = list; src = 'sheet'; }
        }
      } catch (e) { /* 退回備援清單 */ }
    }
    const seen = new Set();
    const items = rows.filter(r => !seen.has(r[0]) && seen.add(r[0])).map(r => ({ code: r[0].toUpperCase(), name: r[1], type: r[2], held: r[3] !== '否' }));
    return { src, items };
  }

  /* ---------- 指標計算 ---------- */
  const sma = (a, n, i) => { if (i < n - 1) return null; let s = 0; for (let k = i - n + 1; k <= i; k++) s += a[k]; return s / n; };
  function ema(a, n) { const k = 2 / (n + 1); const o = []; a.forEach((v, i) => o.push(i ? v * k + o[i - 1] * (1 - k) : v)); return o; }
  function macd(c) {
    const e12 = ema(c, 12), e26 = ema(c, 26);
    const dif = c.map((_, i) => e12[i] - e26[i]); const dea = ema(dif, 9);
    return { dif, dea, hist: dif.map((v, i) => v - dea[i]) };
  }
  function kd(h, l, c, n = 9) {
    let K = 50, D = 50; const Ks = [], Ds = [];
    for (let i = 0; i < c.length; i++) {
      const s = Math.max(0, i - n + 1); let hi = -Infinity, lo = Infinity;
      for (let k = s; k <= i; k++) { if (h[k] > hi) hi = h[k]; if (l[k] < lo) lo = l[k]; }
      const rsv = hi === lo ? 50 : (c[i] - lo) / (hi - lo) * 100;
      K = K * 2 / 3 + rsv / 3; D = D * 2 / 3 + K / 3; Ks.push(K); Ds.push(D);
    }
    return { K: Ks, D: Ds };
  }
  function rsi(c, n = 14) {
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

  const WEIGHTS = { ma: 1.2, macd: 1.0, kd: 0.8, rsi: 0.6, inst: 0.8 };
  const IND_NAMES = { ma: '均線趨勢', macd: 'MACD 動能', kd: 'KD 轉折', rsi: 'RSI 冷熱', inst: '法人籌碼' };

  // px: 依日期排序的日K；instByDate: {date: 淨買賣股數}；end: 計算到第幾根（含），用來算「昨日燈號」
  function evaluate(px, instByDate, end) {
    const P = px.slice(0, end + 1);
    const n = P.length; if (n < 30) return null;
    const c = P.map(x => x.close), h = P.map(x => x.max), l = P.map(x => x.min), v = P.map(x => x.Trading_Volume);
    const i = n - 1, last = c[i];
    const ind = {};

    // 1 均線趨勢
    const ma20 = sma(c, 20, i), ma60 = sma(c, 60, i) || sma(c, Math.min(n, 40), i), ma20p = sma(c, 20, i - 5);
    {
      const a = clamp((last - ma20) / ma20 / 0.03), b = clamp((ma20 - ma60) / ma60 / 0.03), s = clamp((ma20 - ma20p) / ma20p / 0.01);
      const sc = clamp(a * 0.4 + b * 0.3 + s * 0.3);
      let t;
      if (last > ma20 && ma20 > ma60) t = '股價站上月線，月線在季線之上（多頭排列）';
      else if (last < ma20 && ma20 < ma60) t = '股價跌破月線，月線在季線之下（空頭排列）';
      else if (last > ma20) t = '股價站上月線，但月線仍在季線之下（整理偏多）';
      else t = '股價跌破月線，但月線仍在季線之上（整理偏弱）';
      ind.ma = { score: sc, value: '月線 ' + fmt(ma20) + '／季線 ' + fmt(ma60), text: t };
    }
    // 2 MACD
    {
      const m = macd(c), hs = m.hist[i], hp = m.hist[i - 1];
      const a = clamp(hs / last / 0.004), b = Math.sign(hs - hp);
      const sc = clamp(a * 0.7 + b * 0.3);
      let cross = '';
      for (let k = 0; k < 3; k++) {
        if (m.hist[i - k] > 0 && m.hist[i - k - 1] <= 0) cross = '，近 3 日出現黃金交叉';
        if (m.hist[i - k] < 0 && m.hist[i - k - 1] >= 0) cross = '，近 3 日出現死亡交叉';
      }
      const t = (hs > 0 ? (hs >= hp ? '多方動能增強' : '多方動能減弱') : (hs <= hp ? '空方動能增強' : '空方動能減弱')) + cross;
      ind.macd = { score: sc, value: '柱狀體 ' + fmt(hs, 3), text: t };
    }
    // 3 KD
    {
      const k = kd(h, l, c), K = k.K[i], D = k.D[i], pK = k.K[i - 1], pD = k.D[i - 1];
      let sc = clamp((K - D) / 10) * 0.65 + clamp((50 - K) / 50) * 0.35;
      let t = K > D ? 'K 值在 D 值之上，短線偏多' : 'K 值在 D 值之下，短線偏弱';
      if (pK <= pD && K > D) { t = (K < 30 ? '低檔' : '') + '黃金交叉，短線轉強'; sc += K < 30 ? 0.3 : 0.15; }
      if (pK >= pD && K < D) { t = (K > 70 ? '高檔' : '') + '死亡交叉，短線轉弱'; sc -= K > 70 ? 0.3 : 0.15; }
      if (K >= 80 && K >= D) t = '高檔鈍化，強勢但追高風險大';
      if (K <= 20 && K <= D) t = '低檔鈍化，弱勢但跌幅已深';
      ind.kd = { score: clamp(sc), value: 'K ' + fmt(K, 0) + '／D ' + fmt(D, 0), text: t };
    }
    // 4 RSI
    {
      const r = rsi(c)[i];
      const sc = clamp((50 - r) / 22);
      let t = r >= 70 ? '過熱區，容易拉回' : r >= 60 ? '偏熱，漲多留意' : r <= 30 ? '超賣區，容易反彈' : r <= 40 ? '偏冷，跌多可留意' : '中性區';
      ind.rsi = { score: sc, value: 'RSI ' + fmt(r, 0), text: t };
    }
    // 5 法人籌碼（近 5 日三大法人淨買賣 ÷ 成交量）
    {
      const dates = P.slice(-5).map(x => x.date);
      let net = 0, have = 0; dates.forEach(d => { if (instByDate && d in instByDate) { net += instByDate[d]; have++; } });
      const vol = v.slice(-5).reduce((a, b) => a + b, 0);
      if (have >= 3 && vol > 0) {
        const ratio = net / vol;
        const lots = Math.round(net / 1000);
        ind.inst = { score: clamp(ratio / 0.05), value: '5日' + (lots >= 0 ? '買超 ' : '賣超 ') + Math.abs(lots).toLocaleString() + ' 張', text: ratio > 0.01 ? '三大法人近 5 日偏買' : ratio < -0.01 ? '三大法人近 5 日偏賣' : '三大法人進出不明顯' };
      } else ind.inst = { score: 0, value: '無資料', text: '無法人資料，不計入', skip: true };
    }

    let sw = 0, ss = 0;
    Object.keys(ind).forEach(k => { if (!ind[k].skip) { sw += WEIGHTS[k]; ss += WEIGHTS[k] * ind[k].score; } });
    const score = sw ? ss / sw : 0;

    const lo20 = Math.min(...l.slice(-20)), hi20 = Math.max(...h.slice(-20));
    return {
      date: P[i].date, close: last, prev: c[i - 1], change: last - c[i - 1], pct: (last - c[i - 1]) / c[i - 1] * 100,
      ma20, ma60, lo20, hi20, ind, score
    };
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
    const px = (await finmind('TaiwanStockPrice', item.code, daysAgo(420))).filter(x => x.close > 0);
    px.sort((a, b) => a.date < b.date ? -1 : 1);
    let instByDate = null;
    try {
      const inst = await finmind('TaiwanStockInstitutionalInvestorsBuySell', item.code, daysAgo(30));
      if (inst && inst.length) { instByDate = {}; inst.forEach(r => { instByDate[r.date] = (instByDate[r.date] || 0) + (r.buy - r.sell); }); }
    } catch (e) { }
    const now = evaluate(px, instByDate, px.length - 1);
    const yest = evaluate(px, instByDate, px.length - 2);
    return { item, px, now, yest };
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

  global.MA = { CONFIG, IND_NAMES, WEIGHTS, loadList, loadAll, loadOne, loadDividends, evaluate, color, ink, level, strength, advice, sparkline, fmt, clearCache, ymd };
})(window);
