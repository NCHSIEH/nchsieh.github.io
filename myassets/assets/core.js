/* MyAssets 共用核心：清單讀取、行情抓取、技術指標、漸進燈號 */
(function (global) {
  'use strict';

  const CONFIG = {
    ownerEmail: 'nchsieh@gmail.com',
    sheetLink: 'https://docs.google.com/spreadsheets/d/13_apEylQGyscoaEjRDtF5MZo64GXJ5pz6MsODNfLcYo/edit',
    market: { code: '0050', name: '元大台灣50', type: 'ETF' },   // 大盤參考
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

  let cleaned = false;
  function cleanOld() { if (cleaned) return; cleaned = true; const keep = 'ma:' + cacheBucket() + ':'; try { Object.keys(localStorage).filter(k => k.startsWith('ma:') && !k.startsWith(keep)).forEach(k => localStorage.removeItem(k)); } catch (e) { } }
  async function finmind(dataset, id, start, mapper) {
    cleanOld();
    const key = 'ma:' + cacheBucket() + ':' + dataset + ':' + id + ':' + (mapper ? 'm' : 'r') + start.slice(0, 7);
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

  /* ================= 評估引擎 v2：用回測決定每項指標的權重 =================
     1. 9 項指標各算出 -1～+1 的分數（全部為因果計算：第 i 天只用第 i 天以前的資料）
     2. 對每個預測期間，量測「指標分數」與「之後實際漲跌」的相關性（IC），無效的指標權重歸零
     3. 滾動式樣本外回測（每 20 個交易日重估一次權重），算出各期間燈號的實際命中率與可信度
     4. 燈號強度依可信度打折，沒有被驗證有效的訊號不會顯示成深色 */
  const FEATS = ['ma', 'macd', 'kd', 'rsi', 'mom', 'rs', 'vol', 'inst', 'yld'];
  const IND_NAMES = { ma: '均線趨勢', macd: 'MACD 動能', kd: 'KD 轉折', rsi: 'RSI 冷熱', mom: '中期動能', rs: '相對大盤', vol: '量價配合', inst: '法人籌碼', yld: '殖利率位階' };
  const HORIZONS = [
    { k: 1, label: '隔日', long: '隔日（1 個交易日）' },
    { k: 3, label: '3日', long: '3 日（3 個交易日）' },
    { k: 5, label: '1週', long: '1 週（7 天，約 5 個交易日）' },
    { k: 10, label: '2週', long: '2 週（約 10 個交易日）' },
    { k: 20, label: '1個月', long: '1 個月（約 20 個交易日）' }
  ];
  const TH = { weak: 0.15, strong: 0.45, call: 0.15 };
  const MAIN_H = [2, 3, 4];   // 綜合燈號採用 1 週、2 週、1 個月
  const REL = { hi: 1, mid: 0.75, lo: 0.45, na: 0.45 };
  const STARS = { hi: '★★★', mid: '★★☆', lo: '★☆☆', na: '樣本不足' };

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
    const n = px.length, c = px.map(x => x.close), h = px.map(x => x.max), l = px.map(x => x.min), v = px.map(x => x.Trading_Volume);
    const e12 = ema(c, 12), e26 = ema(c, 26), dif = c.map((_, i) => e12[i] - e26[i]), dea = ema(dif, 9);
    const hist = dif.map((x, i) => x - dea[i]);
    let K = 50, D = 50; const Ks = [], Ds = [];
    for (let i = 0; i < n; i++) {
      const s = Math.max(0, i - 8); let hi = -Infinity, lo = Infinity;
      for (let k = s; k <= i; k++) { if (h[k] > hi) hi = h[k]; if (l[k] < lo) lo = l[k]; }
      const rsv = hi === lo ? 50 : (c[i] - lo) / (hi - lo) * 100;
      K = K * 2 / 3 + rsv / 3; D = D * 2 / 3 + K / 3; Ks.push(K); Ds.push(D);
    }
    // 60 日波動度（日報酬標準差）：讓股票與債券 ETF 用同一把尺
    const ret = c.map((x, i) => i ? x / c[i - 1] - 1 : 0), sd = new Array(n).fill(null);
    let s1 = 0, s2 = 0;
    for (let i = 1; i < n; i++) {
      s1 += ret[i]; s2 += ret[i] * ret[i];
      if (i > 60) { s1 -= ret[i - 60]; s2 -= ret[i - 60] * ret[i - 60]; }
      if (i >= 60) { const m = s1 / 60; sd[i] = Math.max(0.002, Math.sqrt(Math.max(0, s2 / 60 - m * m))); }
    }
    return { c, h, l, v, ret, sd, ma20: rollMean(c, 20), ma60: rollMean(c, 60), hist, K: Ks, D: Ds, rsi: rsiArr(c) };
  }

  const addYear = (d, y) => (parseInt(d.slice(0, 4), 10) + y) + d.slice(4);
  // 近 12 個月現金配息 ÷ 當日實際股價，以及它在過去約兩年的位階（百分位）
  function yieldSeries(st) {
    const n = st.n, y = new Float64Array(n).fill(NaN), p = new Float64Array(n).fill(NaN), dv = st.divs;
    if (!dv.length) return { y, p };
    const ok = addYear(dv[0].ex, 1);
    for (let i = 0; i < n; i++) {
      const d = st.dates[i]; if (d < ok) continue;
      const lo = addYear(d, -1); let s = 0;
      for (const x of dv) if (x.ex > lo && x.ex <= d) s += x.cash;
      if (s > 0) y[i] = s / st.raw[i];
    }
    for (let i = 0; i < n; i++) {
      if (y[i] !== y[i]) continue;
      let cnt = 0, below = 0;
      for (let j = Math.max(0, i - 500); j < i; j++) { if (y[j] !== y[j]) continue; cnt++; if (y[j] < y[i]) below++; }
      if (cnt >= 120) p[i] = below / cnt;
    }
    return { y, p };
  }

  function buildFeatures(st, mkt) {
    const A = st.A, n = st.n, c = A.c, v = A.v, F = {};
    FEATS.forEach(f => { F[f] = new Float64Array(n).fill(NaN); });
    st.mIdx = null;
    if (mkt && mkt !== st && st.cls === 'eq') { const map = new Map(mkt.dates.map((d, i) => [d, i])); st.mIdx = st.dates.map(d => map.has(d) ? map.get(d) : -1); }
    st.yl = yieldSeries(st);
    const col = st.isETF ? 0 : 1;
    for (let i = 65; i < n; i++) {
      const last = c[i], sd = A.sd[i], ma20 = A.ma20[i], ma60 = A.ma60[i], ma20p = A.ma20[i - 5];
      F.ma[i] = clamp(clamp((last - ma20) / ma20 / (sd * 2.5)) * 0.4 + clamp((ma20 - ma60) / ma60 / (sd * 2.5)) * 0.3 + clamp((ma20 - ma20p) / ma20p / (sd * 0.8)) * 0.3);
      const hs = A.hist[i], hp = A.hist[i - 1];
      F.macd[i] = clamp(clamp(hs / last / (sd * 0.33)) * 0.7 + Math.sign(hs - hp) * 0.3);
      const K = A.K[i], D = A.D[i], pK = A.K[i - 1], pD = A.D[i - 1];
      let kd = clamp((K - D) / 10) * 0.65 + clamp((50 - K) / 50) * 0.35;
      if (pK <= pD && K > D) kd += K < 30 ? 0.3 : 0.15;
      if (pK >= pD && K < D) kd -= K > 70 ? 0.3 : 0.15;
      F.kd[i] = clamp(kd);
      F.rsi[i] = clamp((50 - A.rsi[i]) / 22);
      F.mom[i] = clamp((c[i - 5] / c[i - 65] - 1) / (sd * Math.sqrt(60)));
      if (st.mIdx) {
        const a = st.mIdx[i], b = st.mIdx[i - 20];
        if (a >= 0 && b >= 0) F.rs[i] = clamp(((c[i] / c[i - 20] - 1) - (mkt.A.c[a] / mkt.A.c[b] - 1)) / (sd * Math.sqrt(20) * 1.2));
      }
      let num = 0, den = 0;
      for (let j = i - 9; j <= i; j++) { num += Math.sign(c[j] - c[j - 1]) * v[j]; den += v[j]; }
      if (den > 0) F.vol[i] = clamp(num / den * 1.5);
      if (st.inst) {
        let net = 0, have = 0, vol = 0;
        for (let j = i - 4; j <= i; j++) { vol += v[j]; const r = st.inst[st.dates[j]]; if (r) { net += r[col]; have++; } }
        if (have >= 3 && vol > 0) F.inst[i] = clamp(net / vol / 0.05);
      }
      const p = st.yl.p[i]; if (p === p) F.yld[i] = clamp((p - 0.5) * 2);
    }
    st.F = F;
    // 未來 k 日報酬（還原權息），極端值截斷
    let s = 0, ss = 0; for (let i = 1; i < n; i++) { s += A.ret[i]; ss += A.ret[i] * A.ret[i]; }
    const sdAll = Math.sqrt(Math.max(1e-10, ss / (n - 1) - (s / (n - 1)) ** 2));
    st.fwd = HORIZONS.map(H => { const a = new Float64Array(n).fill(NaN), cap = 4 * sdAll * Math.sqrt(H.k); for (let t = 0; t + H.k < n; t++) a[t] = Math.max(-cap, Math.min(cap, c[t + H.k] / c[t] - 1)); return a; });
  }

  // 量測各指標的預測力（IC：指標分數與之後報酬的相關係數），cutoff 之前的資料才可使用
  function fit(group, hi, cutoff) {
    const k = HORIZONS[hi].k, nf = FEATS.length, m = group.length;
    const z6 = () => [0, 0, 0, 0, 0, 0];
    const pool = FEATS.map(z6), own = group.map(() => FEATS.map(z6));
    const add = (a, x, y) => { a[0]++; a[1] += x; a[2] += y; a[3] += x * x; a[4] += y * y; a[5] += x * y; };
    group.forEach((st, si) => {
      const y = st.fwd[hi], end = st.n - 1 - k;
      for (let t = 65; t <= end; t++) {
        if (cutoff && st.dates[t + k] >= cutoff) break;
        const yy = y[t];
        for (let fi = 0; fi < nf; fi++) { const x = st.F[FEATS[fi]][t]; if (x !== x) continue; add(pool[fi], x, yy); add(own[si][fi], x, yy); }
      }
    });
    const corr = a => { const n = a[0]; if (n < 40) return 0; const mx = a[1] / n, my = a[2] / n, vx = a[3] / n - mx * mx, vy = a[4] / n - my * my; return vx > 1e-9 && vy > 1e-12 ? (a[5] / n - mx * my) / Math.sqrt(vx * vy) : 0; };
    const gate = t => Math.max(0, Math.min(1, (Math.abs(t) - 0.5) / 1.5));   // 不顯著的相關性視為 0
    const w = group.map((st, si) => FEATS.map((f, fi) => {
      const icP = corr(pool[fi]), icO = corr(own[si][fi]);
      const tP = icP * Math.sqrt(pool[fi][0] / (k * Math.sqrt(m))), tO = icO * Math.sqrt(own[si][fi][0] / k);
      const x = 0.6 * icP * gate(tP) + 0.4 * icO * gate(tO);
      return x >= 0.008 ? x : 0;   // 傳統解讀方向無效或相反的指標：不計入
    }));
    return { w };
  }
  function sig(st, t, w) {
    let sw = 0, ss = 0;
    for (let fi = 0; fi < w.length; fi++) { if (!w[fi]) continue; const x = st.F[FEATS[fi]][t]; if (x !== x) continue; sw += w[fi]; ss += w[fi] * x; }
    return sw > 0 ? ss / sw : NaN;
  }
  const newBt = () => ({ bull: 0, bullHit: 0, bear: 0, bearHit: 0, tot: 0, up: 0 });
  function zstat(b, div) {
    const calls = b.bull + b.bear; if (!calls || !b.tot) return { z: 0, edge: 0, ne: 0 };
    const baseUp = b.up / b.tot, acc = (b.bullHit + b.bearHit) / calls, bl = (b.bull * baseUp + b.bear * (1 - baseUp)) / calls, ne = calls / div;
    return { z: (acc - bl) / Math.sqrt(0.25 / Math.max(ne, 1)), edge: acc - bl, ne };
  }
  function gradeOf(own, pooled, k, m) {
    const a = zstat(own, k), b = zstat(pooled, k * Math.sqrt(m));
    if (a.ne < 3 && b.ne < 6) return 'na';
    const zc = (a.z + b.z) / 2, ec = (a.edge + b.edge) / 2;
    return zc >= 1.5 && ec >= 0.04 ? 'hi' : zc >= 0.5 && ec >= 0.015 ? 'mid' : 'lo';
  }
  const pct = (a, q) => { const s = a.slice().sort((x, y) => x - y); const p = (s.length - 1) * q, f = Math.floor(p); return s[f] + (s[Math.min(f + 1, s.length - 1)] - s[f]) * (p - f); };

  function analyze(stocks, mkt) {
    stocks.forEach(st => { st.A = prep(st.px); buildFeatures(st, mkt); });
    const cal = (mkt || stocks.slice().sort((a, b) => b.n - a.n)[0]).dates, nCal = cal.length;
    const refits = []; for (let i = Math.max(200, nCal - 480); i < nCal; i += 20) refits.push(cal[i]);
    ['eq', 'bd'].forEach(cls => {
      const group = stocks.filter(s => s.cls === cls); if (!group.length) return;
      const m = group.length;
      group.forEach(st => { st.bt = []; st.poolBt = []; st.grade = []; st.w = []; st.S = []; });
      HORIZONS.forEach((H, hi) => {
        const k = H.k, W = refits.map(d => fit(group, hi, d).w), fin = fit(group, hi, null).w, pooled = newBt();
        group.forEach((st, si) => {
          const b = newBt(), y = st.fwd[hi]; let r = 0;
          for (let t = 65; t + k < st.n; t++) {
            const d = st.dates[t]; if (d < refits[0]) continue;
            while (r + 1 < refits.length && refits[r + 1] <= d) r++;
            const up = y[t] > 0; b.tot++; if (up) b.up++;
            const s = sig(st, t, W[r][si]); if (s !== s) continue;
            if (s >= TH.call) { b.bull++; if (up) b.bullHit++; } else if (s <= -TH.call) { b.bear++; if (y[t] < 0) b.bearHit++; }
          }
          st.bt[hi] = b; Object.keys(b).forEach(q => { pooled[q] += b[q]; });
          st.w[hi] = fin[si];
          const S = new Float64Array(st.n).fill(NaN); for (let t = 65; t < st.n; t++) S[t] = sig(st, t, fin[si]); st.S[hi] = S;
        });
        group.forEach(st => { st.poolBt[hi] = pooled; st.grade[hi] = gradeOf(st.bt[hi], pooled, k, m); });
      });
    });
    stocks.forEach(st => { st.now = assess(st, st.n - 1, mkt, true); st.yest = assess(st, st.n - 2, mkt, false); });
  }

  function assess(st, i, mkt, full) {
    const A = st.A, c = A.c;
    const fc = HORIZONS.map((H, hi) => {
      const k = H.k, g = st.grade[hi], rel = REL[g], S = st.S[hi][i];
      const base = { H, grade: g, stars: STARS[g], rel, bt: st.bt[hi], poolBt: st.poolBt[hi] };
      if (S !== S) return { ...base, score: 0, S: 0, n: 0, noSignal: true };
      const samp = [];
      for (let t = 65; t + k <= i; t++) { const s = st.S[hi][t]; if (s === s) samp.push({ d: Math.abs(s - S), r: c[t + k] / c[t] - 1 }); }
      if (samp.length < 60) return { ...base, score: rel * S * 0.5, S, n: 0 };
      const baseUp = samp.filter(x => x.r > 0).length / samp.length;
      samp.sort((a, b) => a.d - b.d);
      const nb = samp.slice(0, Math.max(40, Math.round(samp.length * 0.15))).map(x => x.r);
      const up = nb.filter(x => x > 0).length / nb.length;
      return { ...base, score: rel * clamp(0.5 * S + 0.5 * clamp((up - 0.5) / 0.2)), S, up, base: baseUp, med: pct(nb, 0.5) * 100, p25: pct(nb, 0.25) * 100, p75: pct(nb, 0.75) * 100, n: nb.length };
    });
    const score = MAIN_H.reduce((a, hi) => a + fc[hi].score, 0) / MAIN_H.length;
    const out = { date: st.dates[i], score, fc, noSignal: MAIN_H.every(hi => fc[hi].noSignal) };
    if (!full) return out;
    const raw = st.raw;
    Object.assign(out, { close: raw[i], prev: raw[i - 1], change: raw[i] - raw[i - 1], pct: (raw[i] - raw[i - 1]) / raw[i - 1] * 100,
      ma20: A.ma20[i], ma60: A.ma60[i], lo20: Math.min(...A.l.slice(i - 19, i + 1)), hi20: Math.max(...A.h.slice(i - 19, i + 1)),
      sdWeek: A.sd[i] * Math.sqrt(5) * 100, ind: describe(st, i, mkt) });
    // 各指標在綜合燈號（1 週～1 個月）中的實際占比
    FEATS.forEach((f, fi) => {
      let e = 0; MAIN_H.forEach(hi => { const w = st.w[hi], sw = w.reduce((a, b) => a + b, 0); if (sw > 0) e += w[fi] / sw; });
      out.ind[f].eff = e / MAIN_H.length;
    });
    return out;
  }

  function describe(st, i, mkt) {
    const A = st.A, c = A.c, F = st.F, ind = {}, sc = f => F[f][i];
    const put = (f, value, text) => { const s = sc(f); ind[f] = s === s ? { score: s, value, text } : { score: 0, value: '無資料', text, skip: true }; };
    const last = c[i], ma20 = A.ma20[i], ma60 = A.ma60[i];
    put('ma', '月線 ' + fmt(ma20) + '／季線 ' + fmt(ma60),
      last > ma20 && ma20 > ma60 ? '股價站上月線，月線在季線之上（多頭排列）' : last < ma20 && ma20 < ma60 ? '股價跌破月線，月線在季線之下（空頭排列）' : last > ma20 ? '股價站上月線，但月線仍在季線之下（整理偏多）' : '股價跌破月線，但月線仍在季線之上（整理偏弱）');
    const hs = A.hist[i], hp = A.hist[i - 1]; let cross = '';
    for (let k = 0; k < 3; k++) { if (A.hist[i - k] > 0 && A.hist[i - k - 1] <= 0) cross = '，近 3 日出現黃金交叉'; if (A.hist[i - k] < 0 && A.hist[i - k - 1] >= 0) cross = '，近 3 日出現死亡交叉'; }
    put('macd', '柱狀體 ' + fmt(hs, 3), (hs > 0 ? (hs >= hp ? '多方動能增強' : '多方動能減弱') : (hs <= hp ? '空方動能增強' : '空方動能減弱')) + cross);
    const K = A.K[i], D = A.D[i], pK = A.K[i - 1], pD = A.D[i - 1];
    let t = K > D ? 'K 值在 D 值之上，短線偏多' : 'K 值在 D 值之下，短線偏弱';
    if (pK <= pD && K > D) t = (K < 30 ? '低檔' : '') + '黃金交叉，短線轉強';
    if (pK >= pD && K < D) t = (K > 70 ? '高檔' : '') + '死亡交叉，短線轉弱';
    if (K >= 80 && K >= D) t = '高檔鈍化，強勢但追高風險大';
    if (K <= 20 && K <= D) t = '低檔鈍化，弱勢但跌幅已深';
    put('kd', 'K ' + fmt(K, 0) + '／D ' + fmt(D, 0), t);
    const r = A.rsi[i];
    put('rsi', 'RSI ' + fmt(r, 0), r >= 70 ? '過熱區，容易拉回' : r >= 60 ? '偏熱，漲多留意' : r <= 30 ? '超賣區，容易反彈' : r <= 40 ? '偏冷，跌多可留意' : '中性區');
    const m3 = (c[i - 5] / c[i - 65] - 1) * 100, sg = x => (x >= 0 ? '+' : '') + fmt(x, 1) + '%';
    put('mom', '近 3 個月 ' + sg(m3), sc('mom') > 0.3 ? '中期漲勢仍在' : sc('mom') < -0.3 ? '中期走勢偏弱' : '中期走勢持平');
    if (st.mIdx && st.mIdx[i] >= 0 && st.mIdx[i - 20] >= 0) {
      const d = ((c[i] / c[i - 20] - 1) - (mkt.A.c[st.mIdx[i]] / mkt.A.c[st.mIdx[i - 20]] - 1)) * 100;
      put('rs', '近 20 日比大盤 ' + sg(d), d > 1 ? '表現比大盤（0050）強' : d < -1 ? '表現比大盤（0050）弱' : '與大盤相當');
    } else put('rs', '', '債券 ETF 或大盤本身不適用');
    let num = 0, den = 0; for (let j = i - 9; j <= i; j++) { num += Math.sign(c[j] - c[j - 1]) * A.v[j]; den += A.v[j]; }
    put('vol', '上漲日成交量占 ' + fmt(den ? (1 + num / den) * 50 : 50, 0) + '%', sc('vol') > 0.3 ? '上漲有量，買盤較積極' : sc('vol') < -0.3 ? '下跌有量，賣壓較重' : '量價沒有明顯方向');
    if (sc('inst') === sc('inst')) {
      let net = 0; for (let j = i - 4; j <= i; j++) { const q = st.inst[st.dates[j]]; if (q) net += q[st.isETF ? 0 : 1]; }
      const lots = Math.round(net / 1000), s = sc('inst');
      put('inst', '5日' + (lots >= 0 ? '買超 ' : '賣超 ') + Math.abs(lots).toLocaleString() + ' 張', (st.isETF ? '外資與投信' : '三大法人') + (s > 0.2 ? '近 5 日偏買' : s < -0.2 ? '近 5 日偏賣' : '進出不明顯'));
    } else put('inst', '', '無法人資料，不計入');
    const y = st.yl.y[i], p = st.yl.p[i];
    if (p === p) put('yld', '殖利率 ' + fmt(y * 100, 1) + '%（位階 ' + fmt(p * 100, 0) + '%）', p > 0.7 ? '殖利率在近兩年偏高，價格相對便宜' : p < 0.3 ? '殖利率在近兩年偏低，價格相對貴' : '殖利率位階中等');
    else put('yld', '', '無配息紀錄或資料不足，不計入');
    return ind;
  }

  /* ---------- 燈號顏色與文字 ---------- */
  function color(s) { // 台灣習慣：+1 紅（漲）→ 0 黃 → -1 綠（跌），連續漸變
    const x = clamp(s); const hue = 60 * (1 - x);
    const light = 47 - Math.abs(x) * 6 + (Math.abs(x) < 0.3 ? 3 : 0);
    return 'hsl(' + hue.toFixed(0) + ',78%,' + light.toFixed(0) + '%)';
  }
  function ink(s) { return Math.abs(s) < 0.35 ? '#1f2937' : '#fff'; }
  function bin(s) { return s >= TH.strong ? 4 : s >= TH.weak ? 3 : s > -TH.weak ? 2 : s > -TH.strong ? 1 : 0; }
  function level(s) {
    return [{ label: '強烈會跌', short: '強跌' }, { label: '偏向會跌', short: '偏跌' }, { label: '維持盤整', short: '維持' }, { label: '偏向會漲', short: '偏漲' }, { label: '強烈會漲', short: '強漲' }][bin(s)];
  }
  const arrow = s => s >= TH.weak ? '▲' : s <= -TH.weak ? '▼' : '－';
  function strength(s) { return Math.round(Math.abs(s) * 100); }
  function advice(item, s) {
    const m = lastMarket && lastMarket.item.code !== item.code && !item.type.includes('債') ? lastMarket.now.score : 0;
    const t = advice0(item, s);
    return s >= TH.weak && m <= -TH.weak ? t + '（大盤偏弱，宜分批）' : t;
  }
  function advice0(item, s) {
    const etf = item.type.includes('ETF'), bond = item.type.includes('債');
    if (!item.held) {
      if (s >= TH.strong) return '訊號強，可留意進場點';
      if (s >= TH.weak) return '偏多，可列入觀察、等拉回再買';
      if (s > -TH.weak) return '方向不明，先觀望';
      return '偏弱，先不進場';
    }
    if (etf) {
      if (s >= TH.strong) return bond ? '債券 ETF 走強，可分批加碼' : '技術面強，可分批加碼';
      if (s >= TH.weak) return '偏多，可小量加碼或續抱領息';
      if (s > -TH.weak) return '持續領息，維持不動';
      if (s > -TH.strong) return '短線偏弱，暫緩加碼（領息部位不必急賣）';
      return '明顯轉弱，暫停加碼，等止跌訊號';
    }
    if (s >= TH.strong) return '趨勢強，續抱；有空手可分批買';
    if (s >= TH.weak) return '偏多，續抱觀察';
    if (s > -TH.weak) return '盤整，維持觀察';
    if (s > -TH.strong) return '偏弱，設好停損點';
    return '明顯轉弱，考慮減碼或停損';
  }

  /* ---------- 整合：抓資料、還原權息、整批分析 ---------- */
  // 還原權息：除息日之前的價格乘上 (前一日收盤 − 現金股利) ÷ 前一日收盤，避免除息缺口被當成下跌
  function adjustForDividends(px, divs) {
    const out = px.map(x => ({ ...x }));
    const last = out.length ? out[out.length - 1].date : '';
    divs.filter(d => d.ex <= last && d.ex > out[0].date).forEach(d => {
      const i = out.findIndex(x => x.date >= d.ex); if (i < 1) return;
      const prev = px[i - 1].close; if (!(prev > d.cash)) return;
      const f = (prev - d.cash) / prev;
      for (let k = 0; k < i; k++) { out[k].close *= f; out[k].max *= f; out[k].min *= f; }
    });
    return out;
  }
  const PXMAP = d => d.filter(x => x.close > 0).map(x => ({ date: x.date, max: x.max, min: x.min, close: x.close, Trading_Volume: x.Trading_Volume }));
  const DIVMAP = d => d.filter(x => x.CashExDividendTradingDate && (x.CashEarningsDistribution + (x.CashStatutorySurplus || 0)) > 0)
    .map(x => ({ ex: x.CashExDividendTradingDate, pay: x.CashDividendPaymentDate, cash: x.CashEarningsDistribution + (x.CashStatutorySurplus || 0) }));
  // 每日法人淨買賣：[外資＋投信, 三大法人合計]
  const INSTMAP = d => { const o = {}; d.forEach(r => { const a = o[r.date] || (o[r.date] = [0, 0]); const net = r.buy - r.sell; a[1] += net; if (r.name === 'Foreign_Investor' || r.name === 'Investment_Trust') a[0] += net; }); return o; };
  const getDivs = async code => (await finmind('TaiwanStockDividend', code, daysAgo(1500), DIVMAP)).slice().sort((a, b) => a.ex < b.ex ? -1 : 1);

  async function fetchOne(item) {
    const rawPx = (await finmind('TaiwanStockPrice', item.code, daysAgo(1100), PXMAP)).slice().sort((a, b) => a.date < b.date ? -1 : 1);
    let divs = []; try { divs = await getDivs(item.code); } catch (e) { }
    let inst = null; try { const q = await finmind('TaiwanStockInstitutionalInvestorsBuySell', item.code, daysAgo(1100), INSTMAP); if (q && Object.keys(q).length) inst = q; } catch (e) { }
    const px = divs.length ? adjustForDividends(rawPx, divs) : rawPx;
    const isETF = !!(item.type && item.type.includes('ETF'));
    return { item, px, raw: rawPx.map(x => x.close), dates: px.map(x => x.date), n: px.length, divs, inst, isETF, cls: item.type && item.type.includes('債') ? 'bd' : 'eq' };
  }
  let lastMarket = null;
  async function loadAll(items, onProgress) {
    const M = CONFIG.market, hasM = items.some(x => x.code === M.code);
    const all = hasM ? items : items.concat([M]);
    let done = 0;
    const data = await pool(all, 4, async it => { const r = await fetchOne(it); onProgress && onProgress(Math.min(++done, items.length), items.length); return r; });
    const good = data.filter(d => d && d.px && d.n >= 200);
    const mkt = good.find(d => d.item.code === M.code) || null;
    if (good.length) analyze(good, mkt);
    lastMarket = mkt && mkt.now ? { item: mkt.item, now: mkt.now } : null;
    return items.map((it, i) => {
      const d = data[i];
      if (d && d.now) return { item: it, px: d.px, now: d.now, yest: d.yest };
      return { item: it, error: d && d.error ? d.error : d && d.px ? '上市未滿約 10 個月，資料不足以回測' : '抓取失敗' };
    });
  }
  async function loadOne(item) { return (await loadAll([item]))[0]; }
  async function loadDividends(item) { return getDivs(item.code); }

  /* ---------- 說明小視窗：電腦滑鼠移上去、手機點一下 ---------- */
  const TIPS = {
    score: ['綜合燈號', '1 週、2 週、1 個月三個期間預測的平均。每個期間只採用「回測證明有效」的指標，並依回測可信度打折。', '紅色越深越偏向會漲，綠色越深越偏向會跌，黃色＝方向不明或訊號未被驗證。百分比是訊號強度。'],
    ma: ['均線趨勢', '看中期方向。月線＝近 20 個交易日平均價，季線＝近 60 日。', '股價在月線上、月線在季線上且往上走＝偏紅；三者反過來＝偏綠；交錯＝黃。'],
    macd: ['MACD 動能', '看漲跌的力道有沒有變強。', '柱狀體大於 0 且變長＝多方增強（紅）；小於 0 且變長＝空方增強（綠）。由負轉正叫黃金交叉。'],
    kd: ['KD 轉折', '看短線轉折點，反應最快。', 'K 在 D 之上偏紅、之下偏綠。低檔（K<20）黃金交叉是常見買點；高檔（K>80）死亡交叉是常見賣點。'],
    rsi: ['RSI 冷熱', '看漲過頭或跌過頭，是反向指標。', '70 以上過熱、容易拉回（偏綠）；30 以下超賣、容易反彈（偏紅）。'],
    mom: ['中期動能', '近 3 個月（不含最近一週）的漲跌幅，依這檔的波動度換算。', '漲勢延續＝偏紅，走弱＝偏綠。學術上最常被驗證的「強者恆強」效應。'],
    rs: ['相對大盤', '近 20 日漲跌幅與大盤（元大台灣50）相比。', '比大盤強＝偏紅，比大盤弱＝偏綠。債券 ETF 不適用。'],
    vol: ['量價配合', '近 10 日中，上漲日與下跌日的成交量比重。', '上漲日量大＝買盤積極（紅）；下跌日量大＝賣壓重（綠）。'],
    inst: ['法人籌碼', '外資、投信、自營商近 5 個交易日的買賣超，除以同期成交量。ETF 只計外資與投信（自營商多為造市避險）。', '買超偏紅、賣超偏綠，達成交量 5% 為最深色。'],
    yld: ['殖利率位階', '近 12 個月現金配息 ÷ 股價，和這檔過去約兩年相比的高低位置。', '殖利率在高檔＝價格相對便宜（偏紅）；在低檔＝價格相對貴（偏綠）。適合高股息 ETF 判斷加碼時機。'],
    yest: ['昨日燈號', '前一交易日的綜合燈號。', '和今天比較：由綠轉紅代表轉強，由紅轉綠代表轉弱。'],
    hz: ['期間預測', '只用「回測有效」的指標加權（50%）＋過去訊號相似的日子之後實際上漲的機率（50%），再依可信度打折。', '可信度來自近兩年的樣本外回測：★★★ 命中率明顯高於亂猜，★☆☆ 與亂猜差不多（燈號會偏黃）。'],
    eff: ['指標占比', '這項指標在這檔的綜合燈號中實際占的比重，由回測決定。', '「不計入」代表過去約三年這項指標對這檔（及同類標的）沒有預測力，所以不採用；它的燈號只供參考。']
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
    '<li><b>三大法人買賣超</b>：證交所／櫃買中心每日公布的外資、投信、自營商買賣超，經 FinMind 取得，約下午 4～5 點後更新，取約三年。</li>' +
    '<li><b>還原權息</b>：用證交所／櫃買中心的除息公告，把除息日之前的價格往下調整，讓除息缺口不會被當成下跌。圖表與指標用還原後的價格，收盤價顯示實際價格。</li>' +
    '<li><b>指標權重與回測</b>：同一份每日股價、法人、配息資料，取約三年（1,100 天）在瀏覽器即時計算；回測為滾動式樣本外（每 20 個交易日只用當時已知的資料重估權重）。大盤參考為元大台灣50（0050）。</li>' +
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

  global.MA = { SOURCES_HTML, TIPS, initTips, CONFIG, FEATS, IND_NAMES, HORIZONS, TH, bin, arrow, loadList, loadAll, loadOne, loadDividends, market: () => lastMarket, _analyze: analyze, color, ink, level, strength, advice, sparkline, fmt, clearCache, ymd, addTicker, removeTicker, restoreTicker, toggleHeld, setSheet, ensureUserDoc };
})(window);
