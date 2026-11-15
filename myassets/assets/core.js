/* MyAssets 共用核心：清單讀取、行情抓取、12項技術與籌碼指標、1/3/7/14/30日預測燈號、主流媒體消息面、持股體檢 */
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
      ['3231', '緯創', '個股'],
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
  async function finmind(dataset, id, start, mapper, tag = '') {
    cleanOld();
    const dateKey = dataset === 'TaiwanStockNews' ? start : start.slice(0, 7);
    const key = 'ma:' + cacheBucket() + ':' + dataset + ':' + id + ':' + (mapper ? 'm' : 'r') + tag + dateKey;
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

  /* ================= 主流財經媒體白名單與消息面分析 ================= */
  // 一線權威財經媒體（同日優先排序並標註深藍專業標籤）
  const TIER1_MEDIA = new Set([
    '經濟日報', '工商時報', '鉅亨網', '中央社', 'CNA', '財訊', '今周刊', 'MoneyDJ',
    '先探', '商業周刊', '商周', '天下雜誌', '自由財經', 'UDN', '聯合新聞網', '優分析UAnalyze', '永豐金證券'
  ]);
  // 具公信力之主流新聞／財經頻道
  const TIER2_MEDIA = new Set([
    '自由時報', 'Yahoo股市', 'Yahoo 財經', 'Yahoo新聞', 'Yahoo', '理財周刊', '富聯網', '旺得富理財網',
    'ETtoday財經雲', '中時新聞網', '風傳媒', 'FTNN 新聞網', 'FTNN', 'LINE TODAY', 'PChome Online 新聞',
    'TVBS新聞網', 'TVBS', '民視財經網', '東森電視', '東森新聞', '三立新聞網SETN.com', 'NOWnews今日新聞',
    '太報 TaiSounds', '鏡週刊', '鏡週刊Mirror Media', '數位時代', '科技新報', 'CTWANT'
  ]);
  // 明確排除的論壇、爆料同學會、個人部落格與社群
  const BLOCK_RE = /爆料同學會|股市爆料|forum|網誌|部落格|Dcard|PTT|vocus|方格子|Facebook|臉書|社團|討論區/i;
  const POS_RE = /創高|新高|大增|成長|飆|看好|買超|調升|喊買|優於預期|大漲|強漲|突破|旺|滿載|報喜|轉盈|配息|高殖利率|大單|受惠|強勢|雙增|齊揚|利多|回溫|加碼|護盤|連買|超預期|翻倍|動能強|看旺|吃補/;
  const NEG_RE = /重挫|暴跌|大跌|衰退|虧損|下修|賣超|砍|利空|跌破|疲軟|裁員|跳水|殺|悲觀|不如預期|警戒|連賣|棄守|腰斬|破底|重摔|大砍|降評|轉虧|承壓|套牢|出貨|熄火|探底/;

  function cleanNewsTitle(title, source) {
    let t = (title || '').trim();
    if (source) {
      const esc = source.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      t = t.replace(new RegExp('\\s*[-｜|—]\\s*' + esc + '.*$'), '');
    }
    t = t.replace(/\s*[-｜|—]\s*(股市爆料同學會|CMoney|Yahoo奇摩股市|Yahoo股市|UDN|經濟日報|工商時報|鉅亨網|自由財經|ETtoday財經雲).*$/i, '');
    return t.trim();
  }

  function scoreHeadline(title) {
    let s = 0;
    const posHits = (title.match(new RegExp(POS_RE.source, 'g')) || []).length;
    const negHits = (title.match(new RegExp(NEG_RE.source, 'g')) || []).length;
    if (posHits > 0 || negHits > 0) s = clamp((posHits - negHits) * 0.55);
    return s;
  }

  const NEWSMAP = d => {
    if (!Array.isArray(d)) return [];
    const seen = new Set();
    const out = [];
    // 由新到舊排序
    const sorted = d.slice().sort((a, b) => (a.date < b.date ? 1 : -1));
    for (const r of sorted) {
      const src = (r.source || '').trim();
      const rawTitle = (r.title || '').trim();
      const link = (r.link || '').trim();
      if (!rawTitle || !link) continue;
      if (BLOCK_RE.test(rawTitle) || BLOCK_RE.test(src) || BLOCK_RE.test(link)) continue;
      const tier = TIER1_MEDIA.has(src) ? 1 : TIER2_MEDIA.has(src) ? 2 : 0;
      if (tier === 0) continue; // 只保留白名單主流媒體
      const title = cleanNewsTitle(rawTitle, src);
      if (title.length < 6) continue;
      // 去除重複轉載新聞（取前 12 個中文字元比對）
      const sigKey = title.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '').slice(0, 12);
      if (sigKey && seen.has(sigKey)) continue;
      if (sigKey) seen.add(sigKey);
      const sent = scoreHeadline(title);
      out.push({
        date: (r.date || '').slice(0, 16),
        day: (r.date || '').slice(0, 10),
        source: src,
        tier,
        title,
        link,
        sent
      });
      if (out.length >= 24) break;
    }
    // 同日優先呈現一線權威財經媒體（經濟日報、工商時報、鉅亨網、財訊、今周刊等）
    out.sort((a, b) => (a.day !== b.day ? (a.day < b.day ? 1 : -1) : a.tier !== b.tier ? a.tier - b.tier : (a.date < b.date ? 1 : -1)));
    return out.slice(0, 16);
  };

  function analyzeNews(newsList, refDate) {
    const items = newsList || [];
    const d7 = daysAgo(8), d3 = daysAgo(4);
    const recent7 = items.filter(x => x.day >= d7);
    const recent3 = items.filter(x => x.day >= d3);
    let pos = 0, neg = 0, wSum = 0, wCnt = 0;
    recent7.forEach(x => {
      const w = (x.tier === 1 ? 1.35 : 1.0) * (x.day >= d3 ? 1.3 : 0.85);
      if (x.sent > 0.1) pos++;
      else if (x.sent < -0.1) neg++;
      wSum += x.sent * w;
      wCnt += w;
    });
    const rawScore = wCnt > 0 ? clamp(wSum / Math.max(2, wCnt) * 1.4) : 0;
    const s = recent7.length === 0 ? null : rawScore >= 0.18 ? 1 : rawScore <= -0.18 ? -1 : 0;
    let summary = '近 7 日無主流財經媒體特別報導';
    if (recent7.length > 0) {
      const tone = s > 0 ? '偏多（利多較多）' : s < 0 ? '偏空（利空較多）' : '中性';
      summary = '近 7 日主流媒體 ' + recent7.length + ' 則報導（利多 ' + pos + '、利空 ' + neg + '，氣氛' + tone + '）';
      if (recent3.length >= 5) summary += '；近 3 日新聞熱度明顯升溫';
    }
    return {
      items: items.slice(0, 10),
      recent7Count: recent7.length,
      recent3Count: recent3.length,
      pos,
      neg,
      score: rawScore,
      s,
      latest: items[0] || null,
      summary
    };
  }

  /* ================= 評估引擎 v3：12 項技術／量價／籌碼指標 ＋ 1/3/7/14/30日預測 =================
     1. 涵蓋 12 項指標：均線(ma)、MACD(macd)、KD(kd)、RSI(rsi)、布林與ATR突破(bb)、K線型態(kbar)、
        量價與爆量(rvol)、法人連買賣(inst)、融資籌碼(margin)、中期動能(mom)、相對大盤(rs)、殖利率位階(yld)
     2. 每個預測期間（1日、3日、7日、14日、30日）結合「先驗專業權重（短線重K線/量價/KD/布林，波段重均線/MACD/法人/融資/動能）」
        與「3年歷史樣本外回測 IC 實證加權」：回測有效的指標自動放大權重，方向相反的指標降權或歸零
     3. 結合 KNN 歷史相似訊號搜尋（過去訊號最接近的日子實際漲跌分布）與近期主流媒體消息面微調 */
  const FEATS = ['ma', 'macd', 'kd', 'rsi', 'bb', 'kbar', 'rvol', 'inst', 'margin', 'mom', 'rs', 'yld'];
  const IND_NAMES = {
    ma: '均線趨勢',
    macd: 'MACD 動能',
    kd: 'KD 轉折',
    rsi: 'RSI 冷熱',
    bb: '布林與波動',
    kbar: 'K線型態',
    rvol: '量價與爆量',
    inst: '法人連買賣',
    margin: '融資籌碼',
    mom: '中期動能',
    rs: '相對大盤',
    yld: '殖利率位階'
  };
  const HORIZONS = [
    { k: 1, label: '1日', long: '未來 1 日（隔日，1 個交易日）' },
    { k: 3, label: '3日', long: '未來 3 日（3 個交易日）' },
    { k: 5, label: '7日', long: '未來 7 日（約 5 個交易日）' },
    { k: 10, label: '14日', long: '未來 14 日（約 10 個交易日）' },
    { k: 20, label: '30日', long: '未來 30 日（約 20 個交易日）' }
  ];
  // 各期間先驗基礎權重：確保 1日、3日、7日、14日、30日 各有最適合的指標組合，再由回測 IC 動態強化或淘汰
  // 順序對應 FEATS: [ma, macd, kd, rsi, bb, kbar, rvol, inst, margin, mom, rs, yld]
  const PRIOR_W = [
    [0.06, 0.07, 0.14, 0.10, 0.13, 0.16, 0.14, 0.10, 0.05, 0.02, 0.02, 0.01], // 1日：重 K線、量價、KD、布林、法人、RSI
    [0.08, 0.10, 0.13, 0.09, 0.12, 0.11, 0.13, 0.11, 0.06, 0.03, 0.03, 0.01], // 3日：重 量價、KD、布林、K線、法人、MACD
    [0.12, 0.12, 0.09, 0.07, 0.09, 0.06, 0.12, 0.13, 0.08, 0.05, 0.05, 0.02], // 7日：重 法人、均線、MACD、量價、布林、融資
    [0.14, 0.12, 0.06, 0.05, 0.07, 0.03, 0.10, 0.14, 0.09, 0.08, 0.07, 0.05], // 14日：重 均線、法人、MACD、量價、融資、動能
    [0.16, 0.10, 0.04, 0.04, 0.05, 0.02, 0.08, 0.13, 0.09, 0.11, 0.09, 0.09]  // 30日：重 均線、法人、動能、MACD、融資、相對大盤、殖利率
  ];

  const TH = { weak: 0.13, strong: 0.40, call: 0.13 };
  const H_WEIGHTS = [0.15, 0.25, 0.25, 0.20, 0.15]; // 綜合燈號涵蓋 1日、3日、7日、14日、30日（加重 3日與7日）
  const REL = { hi: 1.0, mid: 0.86, lo: 0.72, na: 0.68 };
  const STARS = { hi: '★★★', mid: '★★☆', lo: '★☆☆', na: '樣本不足' };

  function rollMean(a, n) { const o = new Array(a.length).fill(null); let s = 0; for (let i = 0; i < a.length; i++) { s += a[i]; if (i >= n) s -= a[i - n]; if (i >= n - 1) o[i] = s / n; } return o; }
  function rollStd(a, meanArr, n) {
    const o = new Array(a.length).fill(null);
    for (let i = n - 1; i < a.length; i++) {
      const m = meanArr[i]; if (m == null) continue;
      let s2 = 0; for (let k = i - n + 1; k <= i; k++) { const d = a[k] - m; s2 += d * d; }
      o[i] = Math.sqrt(s2 / n);
    }
    return o;
  }
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
    const n = px.length;
    const o = px.map(x => x.open || x.close), c = px.map(x => x.close), h = px.map(x => x.max), l = px.map(x => x.min), v = px.map(x => x.Trading_Volume);
    const e12 = ema(c, 12), e26 = ema(c, 26), dif = c.map((_, i) => e12[i] - e26[i]), dea = ema(dif, 9);
    const hist = dif.map((x, i) => x - dea[i]);
    let K = 50, D = 50; const Ks = [], Ds = [];
    for (let i = 0; i < n; i++) {
      const s = Math.max(0, i - 8); let hi = -Infinity, lo = Infinity;
      for (let k = s; k <= i; k++) { if (h[k] > hi) hi = h[k]; if (l[k] < lo) lo = l[k]; }
      const rsv = hi === lo ? 50 : (c[i] - lo) / (hi - lo) * 100;
      K = K * 2 / 3 + rsv / 3; D = D * 2 / 3 + K / 3; Ks.push(K); Ds.push(D);
    }
    // 60 日波動度（日報酬標準差）
    const ret = c.map((x, i) => i ? x / c[i - 1] - 1 : 0), sd = new Array(n).fill(null);
    let s1 = 0, s2 = 0;
    for (let i = 1; i < n; i++) {
      s1 += ret[i]; s2 += ret[i] * ret[i];
      if (i > 60) { s1 -= ret[i - 60]; s2 -= ret[i - 60] * ret[i - 60]; }
      if (i >= 60) { const m = s1 / 60; sd[i] = Math.max(0.002, Math.sqrt(Math.max(0, s2 / 60 - m * m))); }
    }
    const ma5 = rollMean(c, 5), ma20 = rollMean(c, 20), ma60 = rollMean(c, 60);
    const bbStd = rollStd(c, ma20, 20);
    const vma5 = rollMean(v, 5), vma20 = rollMean(v, 20);
    // 14 日 ATR (Average True Range)
    const tr = c.map((_, i) => i === 0 ? h[0] - l[0] : Math.max(h[i] - l[i], Math.abs(h[i] - c[i - 1]), Math.abs(l[i] - c[i - 1])));
    const atr = rollMean(tr, 14);
    return {
      o, c, h, l, v, ret, sd,
      ma5, ma20, ma60, bbStd, vma5, vma20, atr,
      hist, dif, dea, K: Ks, D: Ds,
      rsi: rsiArr(c, 14), rsi6: rsiArr(c, 6)
    };
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
    const A = st.A, n = st.n, o = A.o, c = A.c, h = A.h, l = A.l, v = A.v, F = {};
    FEATS.forEach(f => { F[f] = new Float64Array(n).fill(NaN); });
    st.mIdx = null;
    if (mkt && mkt !== st && st.cls === 'eq') { const map = new Map(mkt.dates.map((d, i) => [d, i])); st.mIdx = st.dates.map(d => map.has(d) ? map.get(d) : -1); }
    st.yl = yieldSeries(st);
    const col = st.isETF ? 0 : 1;
    for (let i = 65; i < n; i++) {
      const last = c[i], sd = A.sd[i], ma5 = A.ma5[i], ma20 = A.ma20[i], ma60 = A.ma60[i], ma20p = A.ma20[i - 5];
      // 1. 均線趨勢（含 5日週線、20日月線、60日季線與斜率）
      F.ma[i] = clamp(
        clamp((last - ma5) / ma5 / (sd * 1.4)) * 0.25 +
        clamp((last - ma20) / ma20 / (sd * 2.5)) * 0.30 +
        clamp((ma20 - ma60) / ma60 / (sd * 2.5)) * 0.25 +
        clamp((ma20 - ma20p) / ma20p / (sd * 0.8)) * 0.20
      );
      // 2. MACD 動能
      const hs = A.hist[i], hp = A.hist[i - 1], hp2 = A.hist[i - 2];
      let macdCross = 0;
      if (hs > 0 && hp <= 0) macdCross = 0.35;
      else if (hs < 0 && hp >= 0) macdCross = -0.35;
      F.macd[i] = clamp(clamp(hs / last / (sd * 0.33)) * 0.55 + clamp((hs - hp) / last / (sd * 0.12)) * 0.25 + macdCross + Math.sign((hs - hp) - (hp - hp2)) * 0.08);
      // 3. KD 轉折（含 J 值與高低檔交叉）
      const K = A.K[i], D = A.D[i], pK = A.K[i - 1], pD = A.D[i - 1], J = 3 * K - 2 * D;
      let kd = clamp((K - D) / 10) * 0.55 + clamp((50 - K) / 50) * 0.25 + clamp((50 - J) / 65) * 0.20;
      if (pK <= pD && K > D) kd += K < 35 ? 0.35 : 0.18;
      if (pK >= pD && K < D) kd -= K > 65 ? 0.35 : 0.18;
      F.kd[i] = clamp(kd);
      // 4. RSI 冷熱（結合 RSI6 短線乖離與 RSI14）
      const r14 = A.rsi[i], r6 = A.rsi6[i] != null ? A.rsi6[i] : r14;
      let rsiScore = clamp((50 - r14) / 22) * 0.6 + clamp((50 - r6) / 28) * 0.4;
      // 若在多頭趨勢（季線之上）且 RSI 介於 50~68 溫和偏強，給予順勢微幅正分
      if (last > ma60 && r14 >= 50 && r14 <= 66) rsiScore = Math.max(rsiScore, 0.18);
      F.rsi[i] = clamp(rsiScore);
      // 5. 布林通道 (%B) 與 ATR 波動突破
      const bstd = A.bbStd[i], atr = A.atr[i] || (last * sd);
      if (bstd && bstd > 0) {
        const upB = ma20 + 2 * bstd, loB = ma20 - 2 * bstd;
        const pctB = (last - loB) / (4 * bstd); // 0 = 下軌, 0.5 = 中軌, 1 = 上軌
        const vr = A.vma20[i] > 0 ? v[i] / A.vma20[i] : 1;
        let bbScore = 0;
        if (pctB < 0.15) {
          // 接近或跌破下軌：若收紅或留長下影線＝超跌反彈訊號；若出量長黑＝破底風險
          bbScore = c[i] >= o[i] ? 0.55 : vr > 1.5 ? -0.45 : 0.25;
        } else if (pctB > 0.88) {
          // 接近或突破上軌：若帶量收紅＝強勢突破；若爆量收黑或量縮滯漲＝短線拉回
          bbScore = (c[i] >= o[i] && vr >= 1.2) ? 0.45 : (c[i] < o[i] && vr >= 1.4) ? -0.55 : -0.20;
        } else {
          // 通道內：中軌之上順勢偏多，中軌之下偏弱，並加上 ATR 日內突破力道
          bbScore = (pctB - 0.5) * 0.8 + clamp((c[i] - c[i - 1]) / (atr * 1.5)) * 0.3;
        }
        F.bb[i] = clamp(bbScore);
      }
      // 6. K 線高低檔型態（上下影線、實體吞噬、跳空缺口）
      {
        const rng = Math.max(h[i] - l[i], atr * 0.25, 1e-6);
        const body = c[i] - o[i];
        const upWick = h[i] - Math.max(c[i], o[i]);
        const dnWick = Math.min(c[i], o[i]) - l[i];
        const pos20 = (last - Math.min(...l.slice(i - 19, i + 1))) / Math.max(1e-6, Math.max(...h.slice(i - 19, i + 1)) - Math.min(...l.slice(i - 19, i + 1)));
        let kb = clamp(body / (atr * 1.2)) * 0.45;
        // 向上跳空不補 / 向下跳空不補
        if (l[i] > h[i - 1]) kb += 0.35;
        else if (h[i] < l[i - 1]) kb -= 0.35;
        // 低檔長下影線（探底支撐） vs 高檔長上影線（遇壓）
        if (dnWick / rng >= 0.45 && pos20 <= 0.45) kb += 0.35;
        if (upWick / rng >= 0.45 && pos20 >= 0.55) kb -= 0.35;
        // 紅K吞噬 / 黑K吞噬
        if (body > 0 && c[i - 1] < o[i - 1] && c[i] >= o[i - 1] && o[i] <= c[i - 1]) kb += 0.30;
        if (body < 0 && c[i - 1] > o[i - 1] && c[i] <= o[i - 1] && o[i] >= c[i - 1]) kb -= 0.30;
        F.kbar[i] = clamp(kb);
      }
      // 7. 量價異常與爆量配合（RVOL 當日量比 + 5/20日均量比 + 10日漲跌量能比）
      {
        let num = 0, den = 0;
        for (let j = i - 9; j <= i; j++) { num += Math.sign(c[j] - c[j - 1]) * v[j]; den += v[j]; }
        const obv10 = den > 0 ? clamp(num / den * 1.4) : 0;
        const vr = A.vma20[i] > 0 ? v[i] / A.vma20[i] : 1;
        const vr5 = A.vma20[i] > 0 && A.vma5[i] ? A.vma5[i] / A.vma20[i] : 1;
        const chg = c[i] - c[i - 1];
        let rv = obv10 * 0.55;
        if (vr >= 1.35) {
          // 明顯出量：收紅上漲＝帶量突破買盤積極；高檔開高走低收黑＝爆量出貨警訊；收跌＝出量下殺
          if (chg > 0 && c[i] >= o[i]) rv += clamp((vr - 1) * 0.45, 0, 0.5);
          else if (c[i] < o[i] && (h[i] - c[i]) > (c[i] - l[i])) rv -= clamp((vr - 1) * 0.5, 0, 0.55);
          else if (chg < 0) rv -= clamp((vr - 1) * 0.45, 0, 0.5);
        } else if (vr <= 0.72 && chg < 0 && last >= ma60) {
          // 多頭架構下價跌量縮（惜售整理）
          rv += 0.15;
        }
        if (vr5 > 1.15 && last > ma20) rv += 0.12;
        F.rvol[i] = clamp(rv);
      }
      // 8. 法人籌碼與連續買賣超轉折
      if (st.inst) {
        let net5 = 0, have = 0, vol5 = 0, streak = 0;
        for (let j = i - 4; j <= i; j++) { vol5 += v[j]; const r = st.inst[st.dates[j]]; if (r) { net5 += r[col]; have++; } }
        for (let j = i; j >= Math.max(0, i - 12); j--) {
          const r = st.inst[st.dates[j]]; if (!r || r[col] === 0) break;
          const sgn = r[col] > 0 ? 1 : -1;
          if (streak === 0) streak = sgn;
          else if (Math.sign(streak) === sgn) streak += sgn;
          else break;
        }
        if (have >= 3 && vol5 > 0) {
          let is = clamp(net5 / vol5 / 0.045) * 0.70 + clamp(streak / 5) * 0.30;
          // 連賣後首日轉買 / 連買後首日轉賣
          const rToday = st.inst[st.dates[i]], rYest = st.inst[st.dates[i - 1]];
          if (rToday && rYest && rToday[col] > 0 && rYest[col] < 0) is += 0.12;
          if (rToday && rYest && rToday[col] < 0 && rYest[col] > 0) is -= 0.12;
          F.inst[i] = clamp(is);
        }
      }
      // 9. 融資融券籌碼沉澱（散戶融資減＋法人買＝籌碼安定偏多；散戶融資暴增＋股價跌＝偏空）
      if (st.margin) {
        let mChg5 = 0, sChg5 = 0, mBal = 0, sBal = 0, mHave = 0, volLots5 = 0;
        for (let j = i - 4; j <= i; j++) {
          volLots5 += v[j] / 1000;
          const mr = st.margin[st.dates[j]];
          if (mr) { mChg5 += mr[0]; mBal = mr[1]; sBal = mr[2]; sChg5 += mr[3]; mHave++; }
        }
        if (mHave >= 3 && mBal > 50 && volLots5 > 0) {
          const mRate = mChg5 / Math.max(volLots5 * 0.08, mBal * 0.04); // 融資增減相對強度
          const instScore = F.inst[i] === F.inst[i] ? F.inst[i] : 0;
          // 散戶融資減少 (-mRate > 0) 代表籌碼流向安定；若同時法人買超，訊號更強
          let ms = clamp(-mRate) * 0.65 + instScore * 0.35;
          // 券資比偏高（>15%）且股價在月線之上：軋空動能加分
          const srRatio = mBal > 0 ? sBal / mBal : 0;
          if (srRatio >= 0.15 && last > ma20) ms += 0.20;
          F.margin[i] = clamp(ms);
        }
      }
      // 10. 中期動能
      F.mom[i] = clamp((c[i - 5] / c[i - 65] - 1) / (sd * Math.sqrt(60)));
      // 11. 相對大盤
      if (st.mIdx) {
        const a = st.mIdx[i], b = st.mIdx[i - 20];
        if (a >= 0 && b >= 0) F.rs[i] = clamp(((c[i] / c[i - 20] - 1) - (mkt.A.c[a] / mkt.A.c[b] - 1)) / (sd * Math.sqrt(20) * 1.2));
      }
      // 12. 殖利率位階
      const p = st.yl.p[i]; if (p === p) F.yld[i] = clamp((p - 0.5) * 2);
    }
    st.F = F;
    // 未來 k 日報酬（還原權息），極端值截斷
    let s = 0, ss = 0; for (let i = 1; i < n; i++) { s += A.ret[i]; ss += A.ret[i] * A.ret[i]; }
    const sdAll = Math.sqrt(Math.max(1e-10, ss / (n - 1) - (s / (n - 1)) ** 2));
    st.fwd = HORIZONS.map(H => { const a = new Float64Array(n).fill(NaN), cap = 4 * sdAll * Math.sqrt(H.k); for (let t = 0; t + H.k < n; t++) a[t] = Math.max(-cap, Math.min(cap, c[t + H.k] / c[t] - 1)); return a; });
  }

  // 結合先驗專業權重 (PRIOR_W) 與回測實證 IC：回測表現好的指標放大權重，回測反向的指標自動壓低或歸零
  function fit(group, hi, cutoff) {
    const k = HORIZONS[hi].k, nf = FEATS.length, m = group.length, prior = PRIOR_W[hi];
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
    const corr = a => { const n = a[0]; if (n < 35) return 0; const mx = a[1] / n, my = a[2] / n, vx = a[3] / n - mx * mx, vy = a[4] / n - my * my; return vx > 1e-9 && vy > 1e-12 ? (a[5] / n - mx * my) / Math.sqrt(vx * vy) : 0; };
    const w = group.map((st, si) => FEATS.map((f, fi) => {
      const icP = corr(pool[fi]), icO = corr(own[si][fi]);
      const combIC = 0.55 * icP + 0.45 * icO;
      // 若該指標在歷史回測明顯反向（combIC < -0.025），權重歸零；若明顯正向則最高放大至 3 倍
      if (combIC < -0.025) return 0;
      const mult = combIC >= 0 ? (1 + Math.min(2.2, combIC * 28)) : Math.max(0.25, 1 + combIC * 30);
      return prior[fi] * mult;
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
    return zc >= 1.2 && ec >= 0.03 ? 'hi' : zc >= 0.35 && ec >= 0.01 ? 'mid' : 'lo';
  }
  const pct = (a, q) => { const s = a.slice().sort((x, y) => x - y); const p = (s.length - 1) * q, f = Math.floor(p); return s[f] + (s[Math.min(f + 1, s.length - 1)] - s[f]) * (p - f); };

  function analyze(stocks, mkt) {
    stocks.forEach(st => { st.A = prep(st.px); });
    stocks.forEach(st => buildFeatures(st, mkt));
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
    stocks.forEach(st => {
      st.newsInfo = analyzeNews(st.news, st.dates[st.n - 1]);
      st.now = assess(st, st.n - 1, mkt, true);
      st.yest = assess(st, st.n - 2, mkt, false);
      st.health = health(st);
    });
  }

  function assess(st, i, mkt, full) {
    const A = st.A, c = A.c;
    // 若為當日評估且有近期主流媒體新聞，將消息面情緒適度納入短線（1日、3日、7日）輔助調整
    const newsBoost = (full && st.newsInfo && st.newsInfo.recent7Count > 0) ? st.newsInfo.score : 0;
    const newsW = [0.14, 0.12, 0.08, 0.04, 0.02];

    const fc = HORIZONS.map((H, hi) => {
      const k = H.k, g = st.grade[hi], rel = REL[g], S = st.S[hi][i];
      const base = { H, grade: g, stars: STARS[g], rel, bt: st.bt[hi], poolBt: st.poolBt[hi] };
      if (S !== S) return { ...base, score: 0, S: 0, n: 0, noSignal: true };
      const samp = [];
      for (let t = 65; t + k <= i; t++) { const s = st.S[hi][t]; if (s === s) samp.push({ d: Math.abs(s - S), r: c[t + k] / c[t] - 1 }); }
      if (samp.length < 60) return { ...base, score: rel * clamp(S * 0.75 + newsBoost * newsW[hi]), S, n: 0 };
      const baseUp = samp.filter(x => x.r > 0).length / samp.length;
      samp.sort((a, b) => a.d - b.d);
      const nb = samp.slice(0, Math.max(40, Math.round(samp.length * 0.15))).map(x => x.r);
      const up = nb.filter(x => x > 0).length / nb.length;
      const techScore = 0.62 * S + 0.38 * clamp((up - 0.5) / 0.18);
      const combined = clamp(techScore * (1 - newsW[hi]) + newsBoost * newsW[hi]);
      return { ...base, score: rel * combined, S, up, base: baseUp, med: pct(nb, 0.5) * 100, p25: pct(nb, 0.25) * 100, p75: pct(nb, 0.75) * 100, n: nb.length };
    });
    const score = fc.reduce((acc, f, hi) => acc + f.score * H_WEIGHTS[hi], 0);
    const out = { date: st.dates[i], score, fc, noSignal: fc.every(f => f.noSignal) };
    if (!full) return out;
    const raw = st.raw;
    const vr = A.vma20[i] > 0 ? A.v[i] / A.vma20[i] : 1;
    Object.assign(out, {
      close: raw[i], prev: raw[i - 1], change: raw[i] - raw[i - 1], pct: (raw[i] - raw[i - 1]) / raw[i - 1] * 100,
      volLots: Math.round(A.v[i] / 1000), vma20Lots: Math.round((A.vma20[i] || 0) / 1000), volRatio: vr,
      ma5: A.ma5[i], ma20: A.ma20[i], ma60: A.ma60[i],
      lo20: Math.min(...A.l.slice(i - 19, i + 1)), hi20: Math.max(...A.h.slice(i - 19, i + 1)),
      sdWeek: A.sd[i] * Math.sqrt(5) * 100, ind: describe(st, i, mkt)
    });
    // 各指標在綜合燈號中的實際占比
    FEATS.forEach((f, fi) => {
      let e = 0;
      HORIZONS.forEach((_, hi) => {
        const w = st.w[hi], sw = w.reduce((a, b) => a + b, 0);
        if (sw > 0 && st.F[f][i] === st.F[f][i]) e += (w[fi] / sw) * H_WEIGHTS[hi];
      });
      out.ind[f].eff = e;
    });
    return out;
  }

  function describe(st, i, mkt) {
    const A = st.A, o = A.o, c = A.c, h = A.h, l = A.l, v = A.v, F = st.F, ind = {}, sc = f => F[f][i];
    const put = (f, value, text) => { const s = sc(f); ind[f] = s === s ? { score: s, value, text } : { score: 0, value: '無資料', text, skip: true }; };
    const last = c[i], ma5 = A.ma5[i], ma20 = A.ma20[i], ma60 = A.ma60[i];
    // 1. 均線趨勢
    put('ma', '週線 ' + fmt(ma5) + '／月線 ' + fmt(ma20) + '／季線 ' + fmt(ma60),
      last > ma5 && ma5 > ma20 && ma20 > ma60 ? '股價站上週、月、季線（標準多頭排列）' :
      last < ma5 && ma5 < ma20 && ma20 < ma60 ? '股價跌破週、月、季線（空頭排列）' :
      last > ma20 && ma20 > ma60 ? '月線在季線之上，短線於週線附近整理偏多' :
      last > ma20 ? '股價站上月線，但月線仍在季線之下（反彈整理）' : '股價跌破月線，短線偏弱整理');
    // 2. MACD 動能
    const hs = A.hist[i], hp = A.hist[i - 1]; let cross = '';
    for (let k = 0; k < 3; k++) { if (A.hist[i - k] > 0 && A.hist[i - k - 1] <= 0) cross = '，近 3 日黃金交叉'; if (A.hist[i - k] < 0 && A.hist[i - k - 1] >= 0) cross = '，近 3 日死亡交叉'; }
    put('macd', '柱狀體 ' + fmt(hs, 3), (hs > 0 ? (hs >= hp ? '多方動能增強' : '多方動能減弱') : (hs <= hp ? '空方動能增強' : '空方動能收斂')) + cross);
    // 3. KD 轉折
    const K = A.K[i], D = A.D[i], pK = A.K[i - 1], pD = A.D[i - 1];
    let t = K > D ? 'K 值在 D 值之上，短線偏多' : 'K 值在 D 值之下，短線偏弱';
    if (pK <= pD && K > D) t = (K < 35 ? '低檔' : '') + '黃金交叉，短線轉強訊號';
    if (pK >= pD && K < D) t = (K > 65 ? '高檔' : '') + '死亡交叉，短線轉弱訊號';
    if (K >= 80 && K >= D) t = '高檔鈍化強勢，但須留意短線追高風險';
    if (K <= 20 && K <= D) t = '低檔鈍化弱勢，但短線跌幅已深';
    put('kd', 'K ' + fmt(K, 0) + '／D ' + fmt(D, 0), t);
    // 4. RSI 冷熱
    const r = A.rsi[i], r6 = A.rsi6[i] != null ? A.rsi6[i] : r;
    put('rsi', '6日 ' + fmt(r6, 0) + '／14日 ' + fmt(r, 0),
      r6 >= 78 || r >= 70 ? '短線進入過熱區，1～3日容易拉回震盪' :
      r6 <= 22 || r <= 30 ? '短線進入超賣區，1～3日容易出現技術反彈' :
      r >= 55 ? '買盤動能溫和偏強' : r <= 45 ? '動能偏冷，觀望氣氛較濃' : '冷熱適中（中性區）');
    // 5. 布林與波動
    const bstd = A.bbStd[i], atr = A.atr[i] || 0;
    if (bstd && bstd > 0) {
      const upB = ma20 + 2 * bstd, loB = ma20 - 2 * bstd, pctB = (last - loB) / (4 * bstd) * 100;
      const bTxt = pctB > 90 ? '觸及布林上軌（' + fmt(upB) + '），' + (sc('bb') > 0 ? '帶量強勢突破' : '高檔遇壓留意拉回') :
        pctB < 10 ? '觸及布林下軌（' + fmt(loB) + '），' + (sc('bb') > 0 ? '下軌支撐出現反彈訊號' : '跌破下軌賣壓仍重') :
        pctB >= 50 ? '位於布林中軌之上（通道偏多區），日均真實波幅 ' + fmt(atr) : '位於布林中軌之下（通道偏弱區），日均真實波幅 ' + fmt(atr);
      put('bb', '%B 位階 ' + fmt(pctB, 0) + '%', bTxt);
    } else put('bb', '', '資料不足');
    // 6. K線型態
    {
      const body = c[i] - o[i], rng = Math.max(h[i] - l[i], 1e-6);
      const upW = h[i] - Math.max(c[i], o[i]), dnW = Math.min(c[i], o[i]) - l[i];
      const pats = [];
      if (l[i] > h[i - 1]) pats.push('向上跳空缺口');
      else if (h[i] < l[i - 1]) pats.push('向下跳空缺口');
      if (body > 0 && c[i - 1] < o[i - 1] && c[i] >= o[i - 1] && o[i] <= c[i - 1]) pats.push('紅K吞噬轉強');
      else if (body < 0 && c[i - 1] > o[i - 1] && c[i] <= o[i - 1] && o[i] >= c[i - 1]) pats.push('黑K吞噬轉弱');
      if (dnW / rng >= 0.45) pats.push('留長下影線（低檔有承接買盤）');
      if (upW / rng >= 0.45) pats.push('留長上影線（高檔有解套賣壓）');
      if (!pats.length) pats.push(body > 0 ? '實體紅K收漲（收盤高於開盤）' : body < 0 ? '實體黑K收跌（收盤低於開盤）' : '十字線（多空拉鋸）');
      put('kbar', (body > 0 ? '紅K +' : body < 0 ? '黑K ' : '平盤 ') + fmt((body / o[i]) * 100, 1) + '%', pats.join('；'));
    }
    // 7. 量價與爆量
    {
      const vr = A.vma20[i] > 0 ? v[i] / A.vma20[i] : 1;
      const lots = Math.round(v[i] / 1000);
      let num = 0, den = 0; for (let j = i - 9; j <= i; j++) { num += Math.sign(c[j] - c[j - 1]) * v[j]; den += v[j]; }
      const upVolPct = den ? (1 + num / den) * 50 : 50;
      const vDesc = vr >= 1.8 ? (c[i] >= o[i] && c[i] >= c[i - 1] ? '爆量長紅上攻，買盤強勁' : '爆量卻未能收高，留意短線主力調節') :
        vr >= 1.3 ? (c[i] >= c[i - 1] ? '價漲量增（溫和放量），有利短線續攻' : '帶量下跌，短線賣壓較重') :
        vr <= 0.7 ? '量縮整理（低於月均量 7 成），市場觀望' : '成交量接近 20 日均量，量價平穩';
      put('rvol', lots.toLocaleString() + ' 張（量比 ' + fmt(vr, 2) + 'x）', vDesc + '；近 10 日上漲量占 ' + fmt(upVolPct, 0) + '%');
    }
    // 8. 法人連買賣
    if (sc('inst') === sc('inst')) {
      let net = 0, streak = 0;
      for (let j = i - 4; j <= i; j++) { const q = st.inst[st.dates[j]]; if (q) net += q[st.isETF ? 0 : 1]; }
      for (let j = i; j >= Math.max(0, i - 15); j--) {
        const q = st.inst[st.dates[j]]; if (!q || q[st.isETF ? 0 : 1] === 0) break;
        const sgn = q[st.isETF ? 0 : 1] > 0 ? 1 : -1;
        if (streak === 0) streak = sgn; else if (Math.sign(streak) === sgn) streak += sgn; else break;
      }
      const lots = Math.round(net / 1000);
      const stTxt = Math.abs(streak) >= 2 ? '（連續 ' + Math.abs(streak) + ' 日' + (streak > 0 ? '買超' : '賣超') + '）' : '';
      put('inst', '5日' + (lots >= 0 ? '買超 ' : '賣超 ') + Math.abs(lots).toLocaleString() + ' 張',
        (st.isETF ? '外資與投信' : '三大法人') + (lots >= 0 ? '近 5 日偏買' : '近 5 日偏賣') + stTxt);
    } else put('inst', '', '無法人資料，不計入');
    // 9. 融資籌碼
    if (sc('margin') === sc('margin')) {
      let mChg5 = 0, mBal = 0, sBal = 0;
      for (let j = i - 4; j <= i; j++) { const mr = st.margin[st.dates[j]]; if (mr) { mChg5 += mr[0]; mBal = mr[1]; sBal = mr[2]; } }
      const sr = mBal > 0 ? (sBal / mBal * 100) : 0;
      const instBuy = sc('inst') > 0.1;
      const mTxt = mChg5 < 0 && instBuy ? '近 5 日散戶融資減少、法人買進（籌碼沉澱，有利後市）' :
        mChg5 > 0 && sc('inst') < -0.1 ? '近 5 日散戶融資增加、法人賣出（籌碼趨於凌亂，宜留意）' :
        mChg5 < 0 ? '近 5 日融資減少 ' + Math.abs(Math.round(mChg5)).toLocaleString() + ' 張，浮額減輕' :
        '近 5 日融資增加 ' + Math.round(mChg5).toLocaleString() + ' 張；券資比 ' + fmt(sr, 1) + '%';
      put('margin', '5日融資 ' + (mChg5 >= 0 ? '+' : '') + Math.round(mChg5).toLocaleString() + ' 張', mTxt);
    } else put('margin', '', '無信用交易或資料不足，不計入');
    // 10. 中期動能
    const m3 = (c[i - 5] / c[i - 65] - 1) * 100, sg = x => (x >= 0 ? '+' : '') + fmt(x, 1) + '%';
    put('mom', '近 3 個月 ' + sg(m3), sc('mom') > 0.3 ? '中期漲勢延續（強者恆強）' : sc('mom') < -0.3 ? '中期走勢偏弱' : '中期走勢持平');
    // 11. 相對大盤
    if (st.mIdx && st.mIdx[i] >= 0 && st.mIdx[i - 20] >= 0) {
      const d = ((c[i] / c[i - 20] - 1) - (mkt.A.c[st.mIdx[i]] / mkt.A.c[st.mIdx[i - 20]] - 1)) * 100;
      put('rs', '近 20 日比大盤 ' + sg(d), d > 1 ? '表現比大盤（0050）強勢' : d < -1 ? '表現比大盤（0050）弱勢' : '表現與大盤相當');
    } else put('rs', '', '債券 ETF 或大盤本身不適用');
    // 12. 殖利率位階
    const y = st.yl.y[i], p = st.yl.p[i];
    if (p === p) put('yld', '殖利率 ' + fmt(y * 100, 1) + '%（位階 ' + fmt(p * 100, 0) + '%）', p > 0.7 ? '殖利率在近兩年偏高，具下檔保護（價格相對便宜）' : p < 0.3 ? '殖利率在近兩年偏低（價格相對貴）' : '殖利率位階中等');
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
    return [{ label: '強烈看跌', short: '強跌' }, { label: '偏向看跌', short: '偏跌' }, { label: '維持盤整', short: '盤整' }, { label: '偏向看漲', short: '偏漲' }, { label: '強烈看漲', short: '強漲' }][bin(s)];
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
      if (s >= TH.strong) return '短中期訊號強，可留意進場點';
      if (s >= TH.weak) return '技術面偏多，可觀察或等拉回布局';
      if (s > -TH.weak) return '短線方向盤整，先觀望';
      return '技術面偏弱，先不急進場';
    }
    if (etf) {
      if (s >= TH.strong) return bond ? '債券 ETF 走強，可分批加碼' : '技術面強，可分批加碼或續抱';
      if (s >= TH.weak) return '偏多，可小量加碼或續抱領息';
      if (s > -TH.weak) return '持續領息，維持不動';
      if (s > -TH.strong) return '短線偏弱，暫緩加碼（領息部位不必急賣）';
      return '明顯轉弱，暫停加碼，等止跌訊號';
    }
    if (s >= TH.strong) return '趨勢與動能強，續抱；有空手可分批買';
    if (s >= TH.weak) return '偏多格局，續抱觀察';
    if (s > -TH.weak) return '區間盤整，維持觀察';
    if (s > -TH.strong) return '短線偏弱，留意支撐或設好停損點';
    return '明顯轉弱，考慮減碼或停損保護獲利';
  }

  /* ================= 持股體檢：結合基本面／評價／籌碼／量能／趨勢／消息面 ================= */
  const CHECKS = {
    rev: { short: '營收', q: '公司營收有沒有成長？' },
    eps: { short: '獲利', q: '公司獲利有沒有成長？' },
    val: { short: '價格', q: '現在股價算便宜還是貴？' },
    yld: { short: '殖利率', q: '現在殖利率算高還是低？' },
    div: { short: '配息', q: '配息穩不穩定？' },
    inst: { short: '法人', q: '外資、投信在買還是賣？' },
    vol: { short: '量能', q: '成交量與買賣力道如何？' },
    trend: { short: '趨勢', q: '中期趨勢往上還是往下？' },
    news: { short: '消息', q: '近期主流財經媒體報導偏多還是偏空？' }
  };
  const VERDICTS = [
    { short: '留意', label: '不利項目偏多' }, { short: '參半', label: '好壞參半' }, { short: '正常', label: '大致正常' }, { short: '條件佳', label: '多數條件有利' }
  ];
  const sgn = (x, d = 1) => (x >= 0 ? '+' : '') + fmt(x, d) + '%';
  function health(st) {
    const i = st.n - 1, A = st.A, c = A.c, out = [];
    const add = (key, s, text) => out.push({ key, ...CHECKS[key], s, text });   // s: 1 有利／0 普通／-1 不利／null 無資料
    if (!st.isETF) {
      // 營收：近 3 個月合計與去年同期比
      const R = st.rev || [], m = new Map(R.map(x => [x.y * 12 + x.m, x.v]));
      if (R.length) {
        const L = Math.max(...m.keys()), g = k => m.get(k);
        const have = [0, 1, 2, 12, 13, 14].every(d => g(L - d) > 0);
        if (have) {
          const y3 = ((g(L) + g(L - 1) + g(L - 2)) / (g(L - 12) + g(L - 13) + g(L - 14)) - 1) * 100, y1 = (g(L) / g(L - 12) - 1) * 100;
          add('rev', y3 >= 10 ? 1 : y3 <= -5 ? -1 : 0, '近 3 個月營收比去年同期 ' + sgn(y3) + '（' + ((L - 1) % 12 + 1) + ' 月單月 ' + sgn(y1) + '）');
        } else add('rev', null, '營收資料不足');
      } else add('rev', null, '無營收資料');
      // 獲利：最新一季 EPS 與去年同季比、近四季合計
      const E = (st.eps || []).slice().sort((a, b) => a.date < b.date ? -1 : 1);
      if (E.length >= 5) {
        const cur = E[E.length - 1], ly = E.find(x => x.date === addYear(cur.date, -1)), ttm = E.slice(-4).reduce((a, b) => a + b.v, 0);
        const qn = 'Q' + Math.ceil(parseInt(cur.date.slice(5, 7), 10) / 3);
        let s = 0, t = '近四季每股盈餘（EPS）合計 ' + fmt(ttm) + ' 元';
        if (ly) {
          if (ly.v > 0) { const y = (cur.v / ly.v - 1) * 100; s = cur.v <= 0 ? -1 : y >= 10 ? 1 : y <= -10 ? -1 : 0; t += '；最新一季（' + qn + '）' + fmt(cur.v) + ' 元，' + (cur.v <= 0 ? '由盈轉虧（去年同季 ' + fmt(ly.v) + ' 元）' : '比去年同季 ' + sgn(y, 0)); }
          else { s = cur.v > 0 ? 1 : -1; t += '；最新一季（' + qn + '）' + fmt(cur.v) + ' 元，' + (cur.v > 0 ? '去年同季虧損，已轉盈' : '仍在虧損'); }
        }
        if (ttm <= 0) s = -1;
        add('eps', s, t);
      } else add('eps', null, '無獲利資料');
      // 評價：本益比在自己近三年的位階
      const P = (st.per || []).filter(x => x.per > 0);
      const lastP = st.per && st.per.length ? st.per[st.per.length - 1] : null;
      if (lastP && lastP.per > 0 && P.length >= 200) {
        const p = P.filter(x => x.per < lastP.per).length / P.length * 100;
        add('val', p <= 30 ? 1 : p >= 70 ? -1 : 0, '本益比 ' + fmt(lastP.per, 1) + ' 倍，在近三年' + (p <= 30 ? '偏低（相對便宜）' : p >= 70 ? '偏高（相對貴）' : '中等') + '；比過去 ' + fmt(p, 0) + '% 的日子高');
      } else add('val', null, lastP && !(lastP.per > 0) ? '目前沒有本益比（近四季虧損）' : '無本益比資料');
    } else {
      const y = st.yl.y[i], p = st.yl.p[i];
      if (p === p) add('yld', p >= 0.7 ? 1 : p <= 0.3 ? -1 : 0, '近 12 個月殖利率 ' + fmt(y * 100, 1) + '%，在近兩年' + (p >= 0.7 ? '偏高（價格相對便宜）' : p <= 0.3 ? '偏低（價格相對貴）' : '中等') + '；比過去 ' + fmt(p * 100, 0) + '% 的日子高');
      else add('yld', null, '配息紀錄不足，無法比較');
      const dv = st.divs;
      if (dv.length >= 3) {
        const last = dv[dv.length - 1], prev = dv.slice(-5, -1), avg = prev.reduce((a, b) => a + b.cash, 0) / prev.length, ch = (last.cash / avg - 1) * 100;
        add('div', ch >= -10 ? 1 : ch >= -25 ? 0 : -1, '最近一次配 ' + fmt(last.cash, 3) + ' 元（' + last.ex.slice(5).replace('-', '/') + ' 除息），' + (Math.abs(ch) < 3 ? '與前幾次持平' : '比前 ' + prev.length + ' 次平均 ' + sgn(ch, 0)));
      } else add('div', null, '配息次數不足');
    }
    // 法人：外資＋投信近 20 日買賣超 ÷ 成交量
    if (st.inst) {
      let net = 0, vol = 0, have = 0;
      for (let j = i - 19; j <= i; j++) { vol += A.v[j]; const r = st.inst[st.dates[j]]; if (r) { net += r[0]; have++; } }
      if (have >= 10 && vol > 0) { const r = net / vol * 100, lots = Math.round(net / 1000); add('inst', r >= 3 ? 1 : r <= -3 ? -1 : 0, '外資＋投信近 20 日' + (lots >= 0 ? '買超 ' : '賣超 ') + Math.abs(lots).toLocaleString() + ' 張（占成交量 ' + fmt(Math.abs(r), 1) + '%）'); }
      else add('inst', null, '無法人資料');
    } else add('inst', null, '無法人資料');
    // 量能：每日成交量與 20 日均量比（RVOL）＋近 10 日量價配合（每日更新！）
    {
      const vr = A.vma20[i] > 0 ? A.v[i] / A.vma20[i] : 1;
      const lots = Math.round(A.v[i] / 1000), maLots = Math.round((A.vma20[i] || 0) / 1000);
      const rvScore = st.F.rvol[i];
      const vs = rvScore >= 0.22 ? 1 : rvScore <= -0.22 ? -1 : 0;
      add('vol', vs, '今日成交 ' + lots.toLocaleString() + ' 張，為月均量（' + maLots.toLocaleString() + ' 張）的 ' + fmt(vr, 2) + ' 倍；' + (vs > 0 ? '上漲有量、買盤積極' : vs < 0 ? '下跌出量或高檔遇壓、賣壓偏重' : '量價關係平穩'));
    }
    // 趨勢：股價與季線
    const ma60 = A.ma60[i], ma60p = A.ma60[i - 20], above = c[i] >= ma60, rising = ma60 >= ma60p;
    add('trend', above && rising ? 1 : !above && !rising ? -1 : 0, '股價在季線（60 日均價 ' + fmt(ma60) + '）之' + (above ? '上' : '下') + '，季線' + (rising ? '上揚' : '下彎') + '；離季線 ' + sgn((c[i] / ma60 - 1) * 100));
    // 消息：近 7 日具公信力財經媒體報導情緒與熱度（每日更新！）
    if (st.newsInfo) {
      add('news', st.newsInfo.s, st.newsInfo.summary);
    } else {
      add('news', null, '無近期主流媒體報導');
    }

    const ok = out.filter(x => x.s !== null), good = ok.filter(x => x.s > 0).length, bad = ok.filter(x => x.s < 0).length;
    const score = ok.length ? (good - bad) / ok.length : 0;
    const vi = !ok.length ? 2 : score >= 0.45 ? 3 : score > 0 ? 2 : score >= -0.35 ? 1 : 0;
    const it = st.item, bond = st.cls === 'bd';
    let advice;
    if (!it.held) advice = ['不利項目偏多，先觀望', '好壞參半，先觀望', '大致正常，可列入觀察', '多數條件有利，可留意進場點'][vi];
    else if (st.isETF) advice = ['不利項目偏多，暫緩加碼（領息部位不必急賣）', '好壞參半，持續領息、暫不加碼', '大致正常，持續領息', '多數條件有利，想加碼可分批'][vi];
    else advice = ['不利項目偏多，留意是否減碼', '好壞參半，續抱但暫不加碼', '大致正常，續抱觀察', '多數條件有利，可續抱'][vi];
    if (bond) advice += '；債券 ETF 價格主要看利率走向';
    return { checks: out, score, good, bad, vi, verdict: VERDICTS[vi], advice };
  }
  const CHK_COLOR = s => s === null ? '#cbd5e1' : color(s * 0.8);
  const CHK_WORD = s => s === null ? '無資料' : s > 0 ? '有利' : s < 0 ? '不利' : '普通';

  /* ---------- 整合：抓資料、還原權息、整批分析 ---------- */
  // 還原權息：除息日之前的開高低收價格乘上 (前一日收盤 − 現金股利) ÷ 前一日收盤
  function adjustForDividends(px, divs) {
    const out = px.map(x => ({ ...x }));
    const last = out.length ? out[out.length - 1].date : '';
    divs.filter(d => d.ex <= last && d.ex > out[0].date).forEach(d => {
      const i = out.findIndex(x => x.date >= d.ex); if (i < 1) return;
      const prev = px[i - 1].close; if (!(prev > d.cash)) return;
      const f = (prev - d.cash) / prev;
      for (let k = 0; k < i; k++) { out[k].open *= f; out[k].close *= f; out[k].max *= f; out[k].min *= f; }
    });
    return out;
  }
  const PXMAP = d => d.filter(x => x.close > 0).map(x => ({ date: x.date, open: x.open || x.close, max: x.max, min: x.min, close: x.close, Trading_Volume: x.Trading_Volume }));
  const DIVMAP = d => d.filter(x => x.CashExDividendTradingDate && (x.CashEarningsDistribution + (x.CashStatutorySurplus || 0)) > 0)
    .map(x => ({ ex: x.CashExDividendTradingDate, pay: x.CashDividendPaymentDate, cash: x.CashEarningsDistribution + (x.CashStatutorySurplus || 0) }));
  // 每日法人淨買賣：[外資＋投信, 三大法人合計]
  const INSTMAP = d => { const o = {}; d.forEach(r => { const a = o[r.date] || (o[r.date] = [0, 0]); const net = r.buy - r.sell; a[1] += net; if (r.name === 'Foreign_Investor' || r.name === 'Investment_Trust') a[0] += net; }); return o; };
  // 每日融資融券：[融資今日增減(張), 融資今日餘額(張), 融券今日餘額(張), 融券今日增減(張)]
  const MARGINMAP = d => {
    const o = {};
    d.forEach(r => {
      const mb = r.MarginPurchaseTodayBalance || 0, my = r.MarginPurchaseYesterdayBalance || 0;
      const sb = r.ShortSaleTodayBalance || 0, sy = r.ShortSaleYesterdayBalance || 0;
      if (mb > 0 || sb > 0) o[r.date] = [mb - my, mb, sb, sb - sy];
    });
    return o;
  };
  const getDivs = async code => (await finmind('TaiwanStockDividend', code, daysAgo(1500), DIVMAP)).slice().sort((a, b) => a.ex < b.ex ? -1 : 1);

  async function fetchOne(item) {
    const rawPx = (await finmind('TaiwanStockPrice', item.code, daysAgo(1100), PXMAP, 'v2')).slice().sort((a, b) => a.date < b.date ? -1 : 1);
    let divs = []; try { divs = await getDivs(item.code); } catch (e) { }
    let inst = null; try { const q = await finmind('TaiwanStockInstitutionalInvestorsBuySell', item.code, daysAgo(1100), INSTMAP); if (q && Object.keys(q).length) inst = q; } catch (e) { }
    const isBond = !!(item.type && item.type.includes('債'));
    let margin = null;
    if (!isBond) {
      try { const m = await finmind('TaiwanStockMarginPurchaseShortSale', item.code, daysAgo(1100), MARGINMAP); if (m && Object.keys(m).length) margin = m; } catch (e) { }
    }
    let news = [];
    if (rawPx.length) {
      const lastD = rawPx[rawPx.length - 1].date;
      try { news = await finmind('TaiwanStockNews', item.code, lastD, NEWSMAP, 'v2'); } catch (e) { }
      if (news.length < 4 && rawPx.length >= 2) {
        const prevD = rawPx[rawPx.length - 2].date;
        try {
          const prevNews = await finmind('TaiwanStockNews', item.code, prevD, NEWSMAP, 'v2');
          const seen = new Set(news.map(x => x.title.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '').slice(0, 12)));
          prevNews.forEach(x => {
            const k = x.title.replace(/[^\u4e00-\u9fa5a-zA-Z0-9]/g, '').slice(0, 12);
            if (!seen.has(k)) { seen.add(k); news.push(x); }
          });
        } catch (e) { }
      }
    }

    const px = divs.length ? adjustForDividends(rawPx, divs) : rawPx;
    const isETF = !!(item.type && item.type.includes('ETF'));
    // 個股另抓基本面：月營收、本益比、每季 EPS
    let rev = null, per = null, eps = null;
    if (!isETF) {
      try { rev = await finmind('TaiwanStockMonthRevenue', item.code, daysAgo(900), d => d.map(x => ({ y: x.revenue_year, m: x.revenue_month, v: x.revenue }))); } catch (e) { }
      try { per = await finmind('TaiwanStockPER', item.code, daysAgo(1100), d => d.map(x => ({ date: x.date, per: x.PER, pbr: x.PBR }))); } catch (e) { }
      try { eps = await finmind('TaiwanStockFinancialStatements', item.code, daysAgo(1100), d => d.filter(x => x.type === 'EPS').map(x => ({ date: x.date, v: x.value }))); } catch (e) { }
    }
    return { item, rev, per, eps, px, raw: rawPx.map(x => x.close), dates: px.map(x => x.date), n: px.length, divs, inst, margin, news, isETF, cls: isBond ? 'bd' : 'eq' };
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
    lastMarket = mkt && mkt.now ? { item: mkt.item, now: mkt.now, health: mkt.health, newsInfo: mkt.newsInfo } : null;
    return items.map((it, i) => {
      const d = data[i];
      if (d && d.now) return { item: it, px: d.px, now: d.now, yest: d.yest, health: d.health, newsInfo: d.newsInfo };
      return { item: it, error: d && d.error ? d.error : d && d.px ? '上市未滿約 10 個月，資料不足以回測' : '抓取失敗' };
    });
  }
  async function loadOne(item) { return (await loadAll([item]))[0]; }
  async function loadDividends(item) { return getDivs(item.code); }

  /* ---------- 說明小視窗：電腦滑鼠移上去、手機點一下 ---------- */
  const TIPS = {
    score: ['預測綜合燈號', '綜合未來 1日、3日、7日、14日、30日 五個期間的技術、量價、籌碼與消息面預判（加重 3日與 7日比重）。', '紅色越深越偏向看漲，綠色越深越偏向看跌，黃色＝盤整。百分比為訊號強度，每日收盤隨價量更新。'],
    ma: ['均線趨勢', '看短中期方向。週線＝5日均價、月線＝20日均價、季線＝60日均價。', '股價站上週線、月線、季線且均線上揚＝偏紅（多頭排列）；反過來＝偏綠；交錯＝黃。'],
    macd: ['MACD 動能', '看漲跌的力道有沒有變強或出現轉折。', '柱狀體大於 0 且變長＝多方增強（紅）；小於 0 且變長＝空方增強（綠）。由負轉正為黃金交叉。'],
    kd: ['KD 轉折', '看短線（1～5日）轉折點，結合 K、D 與 J 值乖離。', '低檔（K<35）黃金交叉是常見短線買點（紅）；高檔（K>65）死亡交叉是常見短線賣點（綠）。'],
    rsi: ['RSI 冷熱', '結合 6 日短線 RSI 與 14 日中期 RSI，偵測短線漲過頭或跌過頭。', '70～78 以上過熱、容易拉回（偏綠）；22～30 以下超賣、容易出現 1～3 日反彈（偏紅）。'],
    bb: ['布林與波動', '20 日布林通道（月線 ± 2 倍標準差）位階 %B，結合 14 日真實波幅（ATR）。', '帶量突破上軌或觸及下軌收紅反彈＝偏紅；觸及上軌卻爆量收黑或跌破下軌＝偏綠。對 1～3 日預判特別有效。'],
    kbar: ['K線型態', '分析近 3 日開高低收 K 線：跳空缺口、長上下影線、紅黑 K 吞噬。', '向上跳空、低檔長下影線承接、紅 K 吞噬＝偏紅；向下跳空、高檔長上影線遇壓、黑 K 吞噬＝偏綠。'],
    rvol: ['量價與爆量', '當日成交量 ÷ 20日均量（量比 RVOL），搭配近 10 日上漲／下跌量能比重。', '價漲量增（量比 > 1.3 倍）＝買盤積極（紅）；高檔爆量收黑或帶量下殺＝賣壓湧現（綠）；價跌量縮＝惜售整理。'],
    inst: ['法人連買賣', '外資、投信、自營商（ETF 只計外資與投信）近 5 日買賣超占比＋連續買賣超天數。', '連續買超或由連賣轉買＝偏紅；連續賣超或由連買轉賣＝偏綠。'],
    margin: ['融資籌碼', '散戶融資餘額近 5 日增減、券資比，對照三大法人買賣動向。', '「法人買＋融資減」代表籌碼流向主力（沉澱偏紅）；「法人賣＋融資大增」代表散戶接刀（凌亂偏綠）。'],
    mom: ['中期動能', '近 3 個月（不含最近一週）的漲跌幅，依這檔的波動度換算。', '漲勢延續＝偏紅，走弱＝偏綠。學術與實務上常驗證的「強者恆強」效應。'],
    rs: ['相對大盤', '近 20 日漲跌幅與大盤（元大台灣50）相比。', '比大盤抗跌領漲＝偏紅，比大盤弱勢＝偏綠。債券 ETF 不適用。'],
    yld: ['殖利率位階', '近 12 個月現金配息 ÷ 股價，和這檔過去約兩年相比的高低位置。', '殖利率在高檔＝價格相對便宜、具下檔保護（偏紅）；在低檔＝價格相對貴（偏綠）。'],
    yest: ['昨日燈號', '前一交易日的綜合預測燈號。', '和今天比較：由綠轉紅代表短線轉強，由紅轉綠代表短線轉弱。'],
    hz: ['各期間預測燈號', '針對未來 1日、3日、7日、14日、30日 量身配置指標權重（短線重 K 線、量價、KD、布林；波段重均線、MACD、法人、融資），再由 3 年回測修正並納入近期主流媒體情緒。', '同時搜尋過去 3 年訊號最相似的日子，統計之後實際上漲比率與常見漲跌區間。'],
    c_rev: ['營收', '公司每月公布的營業收入。', '近 3 個月合計比去年同期成長 10% 以上＝有利；衰退 5% 以上＝不利。'],
    c_eps: ['獲利（EPS）', '每股盈餘：公司每一股賺多少錢，每季公布一次。', '最新一季比去年同季成長 10% 以上＝有利；衰退 10% 以上或虧損＝不利。'],
    c_val: ['價格（本益比）', '本益比＝股價 ÷ 每股盈餘，代表用幾倍的獲利在買這家公司。', '和這檔自己近三年相比：落在最低的三成＝相對便宜（有利）；最高的三成＝相對貴（不利）。'],
    c_yld: ['殖利率', '近 12 個月現金配息 ÷ 目前股價。', '和這檔自己近兩年相比：殖利率偏高代表價格相對便宜（有利）；偏低代表價格相對貴（不利）。'],
    c_div: ['配息', '最近一次配息金額和前幾次平均相比。', '持平或增加＝有利；減少一到兩成半＝普通；減少超過兩成半＝不利。'],
    c_inst: ['法人', '外資和投信近 20 個交易日的買賣超，除以同期成交量。', '買超達成交量 3% 以上＝有利；賣超 3% 以上＝不利。'],
    c_vol: ['量能（每日更新）', '今日成交量與 20 日均量比值（量比），以及近 10 日上漲／下跌量能結構。', '帶量上攻或上漲日量能明顯占優＝有利；爆量收黑或帶量下殺＝不利；量縮整理＝普通。'],
    c_trend: ['趨勢（每日更新）', '股價和季線（近 60 個交易日的平均價）的關係。', '股價在季線之上、季線上揚＝有利；股價在季線之下、季線下彎＝不利；其餘＝普通。'],
    c_news: ['消息面（每日更新）', '自動過濾散戶論壇（如爆料同學會），只保留經濟日報、工商時報、鉅亨網、中央社、財訊、今周刊、UDN、自由財經等主流媒體近 7 日報導。', '利多報導明顯多於利空＝有利；利空報導明顯較多＝不利；無特別報導或正負相當＝普通。'],
    verdict: ['體檢結論', '把基本面、籌碼、量能、趨勢與主流媒體消息面的「有利」減「不利」加總。', '條件佳＝多數有利；正常＝有利略多；參半＝好壞相當；留意＝不利偏多。量能、趨勢、法人、消息每日更新！'],
    eff: ['指標占比', '這項指標在這檔的綜合預測燈號中實際占的比重（結合期間特性與三年回測表現）。', '回測表現越準確的指標占比越高；若過去三年該指標在此標的表現反向則不計入。']
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
        '<div class="tip-leg"><span>不利／偏跌</span><i></i><span>有利／偏漲</span></div>';
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
  const SOURCES_HTML = '<div class="box src"><h2>資料來源與更新頻率</h2><ul>' +
    '<li><b>股價與成交量（每日更新）</b>：開盤、最高、最低、收盤、成交量，原始來源為<a href="https://www.twse.com.tw/" target="_blank" rel="noopener">臺灣證券交易所</a>與<a href="https://www.tpex.org.tw/" target="_blank" rel="noopener">證券櫃檯買賣中心</a>，經 <a href="https://finmindtrade.com/" target="_blank" rel="noopener">FinMind</a> 開放 API 取得（約下午 2:30～3:30 更新）。均線、MACD、KD、RSI、布林通道、ATR、K線型態、量比（RVOL）皆由此計算。</li>' +
    '<li><b>三大法人與融資融券籌碼（每日更新）</b>：外資、投信、自營商買賣超及信用交易融資融券餘額（約下午 4～5 點後更新）。</li>' +
    '<li><b>主流財經媒體新聞（每日即時／盤後更新）</b>：經 FinMind 新聞資料集取得，並<b>自動執行媒體白名單過濾</b>——僅保留經濟日報、工商時報、鉅亨網、中央社、財訊、今周刊、MoneyDJ、UDN、自由財經、Yahoo財經、ETtoday財經雲等主流媒體，<b>自動排除股市爆料同學會、討論區與個人網誌</b>。</li>' +
    '<li><b>基本面（個股定期更新）</b>：月營收（每月 10 日前公布）、每季每股盈餘 EPS（每季財報公布）、本益比（每日隨股價更新），原始來源為公開資訊觀測站與證交所／櫃買中心。</li>' +
    '<li><b>還原權息</b>：用證交所／櫃買中心的除息公告，把除息日之前的開高低收價格同步調整，避免除息缺口被誤判為下跌。</li>' +
    '<li><b>1日／3日／7日／14日／30日預測燈號</b>：取約三年（1,100 天）資料在瀏覽器即時運算，結合各期間專業指標配置與滾動式樣本外回測修正，並整合近期主流媒體消息面情緒。</li>' +
    '</ul><p style="font-size:12px;color:#64748b;margin:6px 0 0">本站將公開市場資料與歷史統計整理為視覺化燈號，供個人研究參考，不保證未來獲利，亦非投資買賣建議。</p></div>';

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

  global.MA = {
    CHECKS, VERDICTS, chkColor: CHK_COLOR, chkWord: CHK_WORD,
    SOURCES_HTML, TIPS, initTips, CONFIG, FEATS, IND_NAMES, HORIZONS, TH,
    bin, arrow, loadList, loadAll, loadOne, loadDividends, market: () => lastMarket, _analyze: analyze,
    color, ink, level, strength, advice, sparkline, fmt, clearCache, ymd,
    addTicker, removeTicker, restoreTicker, toggleHeld, setSheet, ensureUserDoc
  };
})(window);
