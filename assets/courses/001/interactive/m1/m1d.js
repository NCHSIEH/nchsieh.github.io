/* M1 加強版（2026-11）：用整份貫穿資料（765 筆就診、397 筆檢驗）做的動態範例 */
(function () {
  'use strict';
  const { h, $, S, fmt, seg, C } = U;
  const RAW = U.parseCSV(M1DATA.main).filter(r => r.length > 1), H = RAW[0], B = RAW.slice(1);
  const LABR = U.parseCSV(M1DATA.lab).filter(r => r.length > 1), LB = LABR.slice(1);
  const ix = n => H.indexOf(n);
  const I = { id: ix('就診序號'), pid: ix('病歷號'), date: ix('就診日'), dept: ix('科別'), sex: ix('性別'), by: ix('出生年'), ht: ix('身高cm'), wt: ix('體重kg'), sbp: ix('收縮壓'), dbp: ix('舒張壓'), fee: ix('就診費用'), city: ix('縣市'), leak1: ix('出院後30天門診次數'), leak2: ix('結案註記') };

  /* ---------- 清理函式（與第 13 節實驗室同一套規則） ---------- */
  const SEX = { '男': '男', 'M': '男', '1': '男', '女': '女', 'F': '女', '0': '女' };
  const CITY = { '台北市': '臺北市', '臺北市': '臺北市', 'TAIPEI': '臺北市', '新北市': '新北市', '桃園市': '桃園市', '基隆市': '基隆市' };
  function isoDate(v) {
    v = v.trim(); let m;
    if ((m = v.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})$/))) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
    if ((m = v.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/))) return `${m[3]}-${m[1].padStart(2, '0')}-${m[2].padStart(2, '0')}`;
    return null;
  }
  const seen = new Set();
  const CLEAN = B.filter(r => { const k = r.join('|'); if (seen.has(k)) return false; seen.add(k); return true; }).map(r => {
    const ht = +r[I.ht], by = +r[I.by];
    return {
      pid: r[I.pid].trim(), date: isoDate(r[I.date]), dept: r[I.dept].trim(), sex: SEX[r[I.sex].trim()] || '?',
      city: CITY[r[I.city].trim()] || r[I.city].trim(), fee: +r[I.fee].replace(/,/g, ''),
      age: (by >= 1900 && by <= 2026) ? 2026 - by : null, ht: ht === 0 ? null : (ht < 3 ? ht * 100 : ht)
    };
  });
  const LAB = LB.map(r => ({ pid: r[0].trim(), date: r[1], item: r[2], val: +r[3], unit: r[4] }));

  /* 共用：會動的 HTML 長條（寬度用 CSS transition） */
  function bars(items, o = {}) {
    const max = o.max || Math.max(1, ...items.map(i => i.value));
    const box = h('div', { style: { display: 'grid', gridTemplateColumns: `${o.lw || 110}px 1fr ${o.vw || 70}px`, gap: '6px 10px', alignItems: 'center', fontSize: '13.5px' } });
    items.forEach(it => {
      const bar = h('i', { style: { display: 'block', height: (o.bh || 16) + 'px', width: '0%', background: it.color || C.accent, borderRadius: '4px', transition: 'width .7s cubic-bezier(.2,.8,.2,1)' } });
      const lab = h('div', { style: { textAlign: 'right', color: 'var(--ink)', cursor: it.onclick ? 'pointer' : null, fontWeight: it.on ? 700 : 400 } }, it.label);
      if (it.onclick) lab.onclick = it.onclick;
      const track = h('div', { style: { background: '#efece5', borderRadius: '4px', cursor: it.onclick ? 'pointer' : null, outline: it.on ? '2px solid ' + (it.color || C.accent) : null } }, bar);
      if (it.onclick) track.onclick = it.onclick;
      box.append(lab, track, h('div', { style: { fontFamily: 'var(--mono)', fontSize: '13px' } }, it.text ?? fmt(it.value, 0)));
      requestAnimationFrame(() => requestAnimationFrame(() => { bar.style.width = Math.max(it.value > 0 ? 1.5 : 0, it.value / max * 100) + '%'; }));
    });
    return box;
  }
  const kpi = (k, v, cls) => h('div', null, h('div', { class: 'k' }, k), h('div', { class: 'v' + (cls ? ' ' + cls : '') }, v));
  function countUp(el, to, ms = 900, d = 0) { const t0 = performance.now(); const step = t => { const p = Math.min(1, (t - t0) / ms); el.textContent = fmt(to * (1 - Math.pow(1 - p, 3)), d); if (p < 1) requestAnimationFrame(step); }; requestAnimationFrame(step); }

  /* ====================================================================
     ① 第 1 節：整份資料健檢掃描（765 列）
     ==================================================================== */
  (function scan() {
    const box = $('#w-scan'); if (!box) return;
    const dupSet = new Set(), dupRows = new Set();
    B.forEach((r, i) => { const k = r.join('|'); if (dupSet.has(k)) dupRows.add(i); dupSet.add(k); });
    // 每一列標出問題：[維度, 欄位, 說明]
    const issues = B.map((r, i) => {
      const out = [];
      if (+r[I.by] < 1900 || +r[I.by] > 2026) out.push(['有效性', I.by, `出生年 ${r[I.by]}——不可能的值`]);
      [[I.ht, '身高'], [I.wt, '體重'], [I.sbp, '收縮壓'], [I.dbp, '舒張壓']].forEach(([c, n]) => { if (+r[c] === 0) out.push(['完整性', c, `${n} = 0——其實是「沒量」`]); });
      if (dupRows.has(i)) out.push(['唯一性', I.id, '與前面某一列完全相同']);
      if (!/^(男|女)$/.test(r[I.sex])) out.push(['一致性', I.sex, `性別寫成「${r[I.sex]}」`]);
      if (r[I.city] !== r[I.city].trim() || r[I.city] === '台北市' || r[I.city] === 'TAIPEI') out.push(['一致性', I.city, `縣市寫成「${r[I.city]}」`]);
      if (r[I.dept] !== r[I.dept].trim()) out.push(['一致性', I.dept, `科別「${r[I.dept]}」尾端多了空白`]);
      if (!/^\d{4}-\d{2}-\d{2}$/.test(r[I.date])) out.push(['一致性', I.date, `日期格式「${r[I.date]}」`]);
      if (+r[I.ht] > 0 && +r[I.ht] < 3) out.push(['正確性', I.ht, `身高 ${r[I.ht]}——誤填成公尺`]);
      if (/,/.test(r[I.fee])) out.push(['正確性', I.fee, `費用「${r[I.fee]}」含千分位，會被讀成文字`]);
      return out;
    });
    const DIMS = [['有效性', C.bad], ['完整性', C.amber], ['唯一性', '#7b3fa8'], ['一致性', C.blue], ['正確性', C.accent], ['時效性', C.gray]];
    let n = 0, pick = null, timer = null;
    const out = h('div');
    function counts(upto) {
      const c = Object.fromEntries(DIMS.map(d => [d[0], 0])), rows = Object.fromEntries(DIMS.map(d => [d[0], new Set()]));
      for (let i = 0; i < upto; i++) issues[i].forEach(([d]) => { c[d]++; rows[d].add(i); });
      return { c, rows };
    }
    function draw() {
      out.innerHTML = '';
      const { c, rows } = counts(n);
      const bad = issues.slice(0, n).filter(x => x.length).length;
      const play = h('button', { class: 'btn primary' }, n === 0 ? '▶ 開始掃描 765 列' : n < B.length ? '掃描中…' : '↻ 重新掃描');
      play.disabled = n > 0 && n < B.length;
      play.onclick = () => { n = 0; pick = null; clearInterval(timer); timer = setInterval(() => { n = Math.min(B.length, n + 19); draw(); if (n >= B.length) clearInterval(timer); }, 45); };
      const prog = h('div', { style: { flex: 1, minWidth: '180px', height: '10px', background: '#efece5', borderRadius: '5px', overflow: 'hidden' } }, h('i', { style: { display: 'block', height: '100%', width: (n / B.length * 100) + '%', background: C.accent } }));
      out.append(h('div', { class: 'row', style: { gap: '12px', alignItems: 'center', marginBottom: '10px' } }, play, prog, h('span', { style: { fontFamily: 'var(--mono)', fontSize: '13px' } }, `${n} / ${B.length} 列`)));
      out.append(h('div', { class: 'kpi', style: { marginBottom: '12px' } }, kpi('已掃描', fmt(n, 0)), kpi('有問題的列', fmt(bad, 0), bad ? 'bad' : ''), kpi('問題格子數', fmt(Object.values(c).reduce((a, b) => a + b, 0), 0), 'bad'), kpi('乾淨的列', n ? Math.round((n - bad) / n * 100) + '%' : '—')));
      const items = DIMS.map(([d, col]) => ({ label: d, value: d === '時效性' ? 0 : c[d], color: col, text: d === '時效性' ? '看不出來' : `${c[d]} 格`, on: pick === d, onclick: n >= B.length && d !== '時效性' ? () => { pick = d; draw(); } : null }));
      // 不用動畫重繪：直接設定寬度
      const max = Math.max(1, ...items.map(i => i.value));
      const g = h('div', { style: { display: 'grid', gridTemplateColumns: '70px 1fr 90px', gap: '6px 10px', alignItems: 'center', fontSize: '13.5px' } });
      items.forEach(it => { const tr = h('div', { style: { background: '#efece5', borderRadius: '4px', cursor: it.onclick ? 'pointer' : 'default', outline: it.on ? '2px solid ' + it.color : null } }, h('i', { style: { display: 'block', height: '18px', width: (it.value / max * 100) + '%', background: it.color, borderRadius: '4px', transition: 'width .2s' } })); if (it.onclick) tr.onclick = it.onclick; const lb = h('div', { style: { textAlign: 'right', fontWeight: it.on ? 700 : 400, cursor: it.onclick ? 'pointer' : 'default' } }, it.label); if (it.onclick) lb.onclick = it.onclick; g.append(lb, tr, h('div', { style: { fontFamily: 'var(--mono)', fontSize: '13px' } }, it.text)); });
      out.append(g);
      if (n >= B.length) {
        out.append(h('div', { class: 'hint', style: { marginTop: '8px' } }, '點任一條看實際的列。時效性沒辦法從資料本身看出來——要問「這份資料是哪一天擷取的、多久更新一次」。'));
        if (pick) {
          const list = [...rows[pick]].slice(0, 6);
          const tb = h('table', { class: 'dt', style: { marginTop: '8px', fontSize: '13px' } });
          const showCols = [I.id, I.pid, I.date, I.dept, I.sex, I.by, I.ht, I.wt, I.sbp, I.fee, I.city];
          tb.append(h('tr', null, showCols.map(c => h('th', null, H[c])), h('th', null, '問題')));
          list.forEach(i => { const iss = issues[i].filter(x => x[0] === pick); const cols = new Set(iss.map(x => x[1])); tb.append(h('tr', null, showCols.map(c => h('td', { class: cols.has(c) ? 'miss' : null, style: { whiteSpace: 'pre' } }, B[i][c].replace(/ $/, '␣'))), h('td', { style: { fontSize: '12.5px' } }, iss.map(x => x[2]).join('；')))); });
          out.append(h('div', { class: 'tscroll' }, tb), h('div', { class: 'ai' }, `共 ${rows[pick].size} 列有「${pick}」問題，這裡列出前 ${list.length} 列；␣ 代表看不見的尾端空白。`));
        }
        out.append(h('div', { class: 'note' }, h('b', null, '看懂了什麼：'), `五列的找碴題，放大到 765 列後，${Math.round(bad / B.length * 100)}% 的列至少有一個問題——但程式不會報錯。這就是為什麼匯入後第一件事永遠是接 Statistics。`));
      }
    }
    box.append(out); draw();
  })();

  /* ====================================================================
     ② 第 4 節：用整份資料做 Aggregate
     ==================================================================== */
  (function agg() {
    const box = $('#w-aggbig'); if (!box) return;
    let key = 'pid', met = 'n';
    const KEYS = [['pid', '病歷號'], ['dept', '科別'], ['city', '縣市（已統一寫法）'], ['month', '就診月份'], ['ageg', '年齡層']];
    const MET = [['n', '就診次數'], ['avg', '平均費用'], ['sum', '總費用'], ['pat', '不重複病人數']];
    const ageg = a => a == null ? '年齡不明' : a < 40 ? '39 歲以下' : a < 65 ? '40–64 歲' : a < 80 ? '65–79 歲' : '80 歲以上';
    const kf = { pid: r => r.pid, dept: r => r.dept, city: r => r.city, month: r => r.date ? r.date.slice(0, 7) : '日期錯誤', ageg: r => ageg(r.age) };
    const out = h('div');
    function draw() {
      out.innerHTML = '';
      const g = new Map(); CLEAN.forEach(r => { const k = kf[key](r); if (!g.has(k)) g.set(k, []); g.get(k).push(r); });
      const val = rs => met === 'n' ? rs.length : met === 'avg' ? S.mean(rs.map(r => r.fee)) : met === 'sum' ? S.sum(rs.map(r => r.fee)) : new Set(rs.map(r => r.pid)).size;
      let rows = [...g.entries()].map(([k, rs]) => ({ k, v: val(rs), n: rs.length }));
      if (key === 'month' || key === 'ageg') rows.sort((a, b) => a.k < b.k ? -1 : 1); else rows.sort((a, b) => b.v - a.v);
      out.append(h('div', { class: 'row', style: { gap: '10px', flexWrap: 'wrap', marginBottom: '10px' } },
        h('span', { style: { fontSize: '14px', color: 'var(--muted)' } }, 'group by'), seg(KEYS, () => key, v => key = v, draw)),
        h('div', { class: 'row', style: { gap: '10px', flexWrap: 'wrap', marginBottom: '12px' } }, h('span', { style: { fontSize: '14px', color: 'var(--muted)' } }, '聚合'), seg(MET, () => met, v => met = v, draw)));
      // 列數變化
      const big = h('div', { style: { display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap', margin: '4px 0 14px' } },
        h('div', { class: 'kpi' }, kpi('Aggregate 前', '751 列'), kpi('Aggregate 後', '0 列', 'good')), h('div', { style: { fontSize: '14px', color: 'var(--muted)' } }, `一列 = 一個「${KEYS.find(k => k[0] === key)[1]}」`));
      out.append(big); countUp(big.querySelectorAll('.v')[1], rows.length, 700); setTimeout(() => { big.querySelectorAll('.v')[1].textContent = rows.length + ' 列'; }, 760);
      const isMoney = met === 'avg' || met === 'sum';
      if (key === 'pid') {
        // 病人太多，改畫「每位病人的值」分布
        const vals = rows.map(r => r.v);
        const wrap = h('div', { class: 'grid2', style: { gap: '18px', alignItems: 'start' } });
        const hb = h('div'); const top = h('div');
        const vmax = met === 'n' ? Math.max(...vals) : null;
        if (met === 'n' || met === 'pat') {
          const cnt = {}; vals.forEach(v => cnt[v] = (cnt[v] || 0) + 1);
          hb.append(h('div', { style: { fontSize: '13px', color: 'var(--muted)', marginBottom: '6px' } }, met === 'n' ? '每位病人來了幾次？（300 位病人）' : '每列都只有 1 位病人——這個組合沒有意義'));
          hb.append(bars(Object.keys(cnt).map(Number).sort((a, b) => a - b).map(k => ({ label: `${k} 次`, value: cnt[k], text: `${cnt[k]} 人`, color: k >= 5 ? C.amber : C.accent })), { lw: 60 }));
        } else {
          U.hist(hb, [{ values: vals, color: C.accent }], { bins: 24, w: 460, h: 220, xlabel: met === 'avg' ? '每位病人的平均費用（元）' : '每位病人的總費用（元）' });
        }
        top.append(h('div', { style: { fontSize: '13px', color: 'var(--muted)', marginBottom: '6px' } }, `${MET.find(m => m[0] === met)[1]}最高的 8 位病人`));
        top.append(bars(rows.slice(0, 8).map(r => ({ label: r.k, value: r.v, text: isMoney ? fmt(r.v, 0) + ' 元' : fmt(r.v, 0), color: C.blue })), { lw: 60, vw: 90 }));
        wrap.append(hb, top); out.append(wrap);
        if (met === 'n') out.append(h('div', { class: 'note' }, h('b', null, '看懂了什麼：'), `751 次就診其實只來自 300 位病人，平均每人 ${fmt(751 / 300, 1)} 次，最多 ${vmax} 次。若沒有先 Aggregate 就預測「病人會不會再來」，常來的人會被重複計算好幾次，模型會偏向他們。`));
        if (met === 'pat') out.append(h('div', { class: 'note warn' }, '以病歷號分組，再算「不重複病人數」，每組永遠是 1——聚合函數要配合分組鍵選，不是每一種都有意義。'));
      } else {
        out.append(bars(rows.map(r => ({ label: r.k, value: r.v, text: isMoney ? fmt(r.v, 0) + ' 元' : fmt(r.v, 0), color: key === 'month' && r.k === '日期錯誤' ? C.bad : C.accent })), { lw: 110, vw: 100 }));
        const msg = {
          dept: '各科就診量差很多：之後切訓練／測試集時要用分層抽樣，否則小科（急診）可能整科不見。',
          city: '如果沒先統一「台北市／臺北市／TAIPEI」，臺北市會被拆成三組，看起來比新北市少很多——這就是第 8 節的一致性問題。',
          month: '先把三種日期格式統一成 YYYY-MM-DD，才能依月份分組；格式混用時，月份會分錯組。',
          ageg: '「年齡不明」那組來自出生年 0／999／1899——它們不能當成真的年齡，要先轉成遺失。'
        }[key];
        out.append(h('div', { class: 'note' }, h('b', null, '看懂了什麼：'), msg));
      }
    }
    box.append(out); draw();
  })();

  /* ====================================================================
     ③ 第 5 節：整份資料 Join——誰被複製了？
     ==================================================================== */
  (function joinBig() {
    const box = $('#w-joinbig'); if (!box) return;
    let mode = 'left', pre = 'none';
    const labBy = new Map(); LAB.forEach(l => { if (!labBy.has(l.pid)) labBy.set(l.pid, []); labBy.get(l.pid).push(l); });
    const visits = CLEAN; // 751
    const out = h('div');
    function draw() {
      out.innerHTML = '';
      const per = p => { const k = labBy.has(p) ? labBy.get(p).length : 0; return pre === 'none' ? k : (k ? 1 : 0); };
      let rows = 0, unmatched = 0, matched = 0; const mult = {};
      visits.forEach(v => { const k = per(v.pid); if (k) { matched++; rows += k; } else { unmatched++; if (mode === 'left') rows += 1; } const key = pre === 'none' ? Math.min(k, 6) : k; mult[key] = (mult[key] || 0) + 1; });
      const pats = new Set(visits.filter(v => mode === 'left' || per(v.pid)).map(v => v.pid)).size;
      out.append(h('div', { class: 'row', style: { gap: '10px', flexWrap: 'wrap', marginBottom: '10px' } },
        seg([['inner', 'Inner Join'], ['left', 'Left Join']], () => mode, v => mode = v, draw),
        seg([['none', '直接 Join 檢驗長表'], ['agg', '先 Aggregate（每人一列）再 Join']], () => pre, v => pre = v, draw)));
      // 視覺：751 列的主檔，每一格代表 1 列，顏色＝被複製幾次
      const grid = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill, 9px)', gap: '2px', margin: '8px 0 6px', maxWidth: '100%' } });
      const colorOf = k => k === 0 ? (mode === 'left' ? '#d9d4c8' : 'transparent') : k === 1 ? C.accent : k === 2 ? '#e0a33a' : k === 3 ? C.amber : C.bad;
      visits.forEach(v => { const k = per(v.pid); grid.append(h('i', { title: `${v.pid}：主檔這一列 → Join 後 ${k || (mode === 'left' ? 1 : 0)} 列`, style: { width: '9px', height: '9px', borderRadius: '2px', background: colorOf(k), border: k === 0 && mode !== 'left' ? '1px dashed #c9c3b6' : null } })); });
      const legend = h('div', { class: 'row', style: { gap: '14px', fontSize: '12.5px', color: 'var(--muted)', flexWrap: 'wrap' } },
        ...[[mode === 'left' ? '#d9d4c8' : 'transparent', mode === 'left' ? '沒有檢驗 → 保留 1 列（檢驗欄為 ?）' : '沒有檢驗 → 被丟掉'], [C.accent, '變 1 列'], ['#e0a33a', '被複製成 2 列'], [C.amber, '3 列'], [C.bad, '4 列以上']].map(([c, t]) => h('span', { style: { display: 'inline-flex', alignItems: 'center', gap: '5px' } }, h('i', { style: { width: '10px', height: '10px', borderRadius: '2px', background: c, border: c === 'transparent' ? '1px dashed #c9c3b6' : null, display: 'inline-block' } }), t)));
      out.append(h('div', { style: { fontSize: '13px', color: 'var(--muted)' } }, '每一格＝主檔的 1 次就診（751 格）。滑鼠移到格子上看細節。'), grid, legend);
      const k = h('div', { class: 'kpi', style: { margin: '14px 0 6px' } }, kpi('Join 前（主檔）', '751'), kpi('Join 後列數', '0', rows === 751 ? 'good' : 'bad'), kpi('不重複病人', fmt(pats, 0)), kpi('列數 ÷ 原本', '—'));
      out.append(k); const vs = k.querySelectorAll('.v'); countUp(vs[1], rows, 800); vs[3].textContent = (rows / 751).toFixed(2) + ' 倍';
      let msg;
      if (pre === 'agg') msg = mode === 'left' ? '先把檢驗表壓成「每位病人一列」（例如取最新一筆），再 Left Join：列數維持 751，每次就診都還在，檢驗欄位多數有值、沒驗的人是 ?。這才是能拿去建模的形狀。' : `先 Aggregate 再 Inner Join：沒有任何檢驗的病人（${300 - 160} 位）整個消失，只剩 ${fmt(rows, 0)} 列。如果模型要用在所有病人身上，這等於從一開始就排除了沒做檢驗的人。`;
      else msg = mode === 'left' ? `直接 Left Join 長表：有檢驗的就診被複製成好幾列，751 變成 ${fmt(rows, 0)} 列（×${(rows / 751).toFixed(2)}）。程式不會報錯，但接下來任何 count、平均、建模都會被重複的列灌水。` : `直接 Inner Join：一邊複製、一邊丟掉——沒檢驗的就診消失，有檢驗的被複製，最後 ${fmt(rows, 0)} 列，數字「看起來差不多」反而更難發現錯。`;
      out.append(h('div', { class: 'note' + (pre === 'agg' && mode === 'left' ? '' : ' warn') }, h('b', null, '看懂了什麼：'), msg));
    }
    box.append(out); draw();
  })();

  /* ====================================================================
     ④ 第 13 節：一鍵播放整條前處理鏈
     ==================================================================== */
  (function pipeline() {
    const box = $('#w-pipe'); if (!box) return;
    // 每一步之後的狀態，用真實資料逐步計算
    const STEPS = [
      ['原始資料', r => r, null],
      ['去除完全重複列', null, 'dedupe'],
      ['費用去千分位', r => { r[I.fee] = r[I.fee].replace(/,/g, ''); return r; }],
      ['文字欄位 Trim', r => { [I.dept, I.sex, I.city].forEach(c => r[c] = r[c].trim()); return r; }],
      ['性別對照表 → 男／女', r => { r[I.sex] = SEX[r[I.sex]] || r[I.sex]; return r; }],
      ['縣市統一寫法', r => { r[I.city] = CITY[r[I.city]] || r[I.city]; return r; }],
      ['日期統一 YYYY-MM-DD', r => { r[I.date] = isoDate(r[I.date]) || r[I.date]; return r; }],
      ['身高公尺 → 公分', r => { if (+r[I.ht] > 0 && +r[I.ht] < 3) r[I.ht] = String(+r[I.ht] * 100); return r; }],
      ['0 與不可能值 → 遺失', r => { [I.ht, I.wt, I.sbp, I.dbp].forEach(c => { if (+r[c] === 0) r[c] = ''; }); if (+r[I.by] < 1900 || +r[I.by] > 2026) r[I.by] = ''; return r; }],
    ];
    function measure(rows) {
      const uniq = c => new Set(rows.map(r => r[c])).size;
      let probs = 0;
      rows.forEach(r => {
        if (/,/.test(r[I.fee])) probs++;
        if (!/^(男|女)$/.test(r[I.sex])) probs++;
        if (!/^(臺北市|新北市|桃園市|基隆市)$/.test(r[I.city])) probs++;
        if (r[I.dept] !== r[I.dept].trim()) probs++;
        if (!/^\d{4}-\d{2}-\d{2}$/.test(r[I.date])) probs++;
        if (+r[I.ht] > 0 && +r[I.ht] < 3) probs++;
        [I.ht, I.wt, I.sbp, I.dbp].forEach(c => { if (r[c] !== '' && +r[c] === 0) probs++; });
        if (r[I.by] !== '' && (+r[I.by] < 1900 || +r[I.by] > 2026)) probs++;
      });
      const dup = rows.length - new Set(rows.map(r => r.join('|'))).size;
      const miss = rows.reduce((a, r) => a + [I.ht, I.wt, I.sbp, I.dbp, I.by].filter(c => r[c] === '').length, 0);
      return { n: rows.length, sex: uniq(I.sex), city: uniq(I.city), dept: uniq(I.dept), probs: probs + dup, miss };
    }
    const states = []; let cur = B.map(r => r.slice());
    STEPS.forEach(([name, f, special]) => {
      if (special === 'dedupe') { const s = new Set(); cur = cur.filter(r => { const k = r.join('|'); if (s.has(k)) return false; s.add(k); return true; }); }
      else if (f) cur = cur.map(r => f(r.slice()));
      states.push({ name, ...measure(cur) });
    });
    let at = 0, timer = null;
    const out = h('div');
    function draw() {
      out.innerHTML = '';
      const st = states[at];
      const play = h('button', { class: 'btn primary' }, timer ? '播放中…' : at === states.length - 1 ? '↻ 重播' : '▶ 播放整條前處理鏈');
      play.disabled = !!timer;
      play.onclick = () => { at = 0; draw(); timer = setInterval(() => { at++; if (at >= states.length - 1) { at = states.length - 1; clearInterval(timer); timer = null; } draw(); }, 900); draw(); };
      const prev = h('button', { class: 'btn sm' }, '← 上一步'), next = h('button', { class: 'btn sm' }, '下一步 →');
      prev.disabled = at === 0 || !!timer; next.disabled = at === states.length - 1 || !!timer;
      prev.onclick = () => { at--; draw(); }; next.onclick = () => { at++; draw(); };
      out.append(h('div', { class: 'row', style: { gap: '10px', marginBottom: '12px', flexWrap: 'wrap' } }, play, prev, next, h('span', { class: 'tag' }, `步驟 ${at} / ${states.length - 1}：${st.name}`)));
      // 步驟條
      const rail = h('div', { style: { display: 'flex', gap: '4px', marginBottom: '14px', flexWrap: 'wrap' } });
      states.forEach((s2, i) => { const b = h('button', { class: 'btn sm' + (i === at ? ' on' : ''), style: { opacity: i <= at ? 1 : .55 } }, `${i}. ${s2.name}`); b.onclick = () => { if (!timer) { at = i; draw(); } }; rail.append(b); });
      out.append(rail);
      out.append(h('div', { class: 'kpi', style: { marginBottom: '12px' } }, kpi('列數', fmt(st.n, 0), st.n < 765 ? 'good' : ''), kpi('性別寫法', st.sex + ' 種', st.sex === 2 ? 'good' : 'bad'), kpi('縣市寫法', st.city + ' 種', st.city === 4 ? 'good' : 'bad'), kpi('科別寫法', st.dept + ' 種', st.dept === 5 ? 'good' : 'bad'), kpi('還沒處理的問題', fmt(st.probs, 0), st.probs ? 'bad' : 'good'), kpi('明確標成遺失', fmt(st.miss, 0))));
      // 問題數逐步下降（瀑布）
      const maxP = states[0].probs;
      out.append(h('div', { style: { fontSize: '13px', color: 'var(--muted)', margin: '4px 0 6px' } }, '每一步之後「還沒處理的問題格子」剩多少'));
      out.append(bars(states.map((s2, i) => ({ label: `${i}. ${s2.name}`, value: i <= at ? s2.probs : 0, text: i <= at ? fmt(s2.probs, 0) : '', color: i === at ? C.accent : '#9fc7c2' })), { lw: 170, max: maxP, bh: 14 }));
      const tips = ['765 列裡藏著上千個問題格子，程式完全不會報錯。', '先去重：14 列完全重複，765 → 751。', '費用的千分位逗號移除，才能當數字算平均。', 'Trim 掉看不見的尾端空白：「內科␣」和「內科」終於變成同一類。', '性別 6 種寫法 → 2 種。這一步要有對照表，而且要記錄下來。', '縣市 4 種寫法收斂；臺北市不再被拆成三組。', '三種日期格式統一後，才能算「距上次就診幾天」這類時間特徵。', '身高 1.62 這種公尺誤填，乘以 100 修正——修正前先確認不是別的單位。', '0 與不可能的出生年不再假裝成有效值，而是誠實地標成遺失，交給第 6 節的方法處理。'];
      out.append(h('div', { class: 'note' }, h('b', null, `步驟 ${at}：`), tips[at]));
    }
    box.append(out); draw();
  })();
  /* ====================================================================
     第 02 節：民國年日期（2026-11-09 新增，對應講義 M1 第 13 頁）
     ==================================================================== */
  (function roc() {
    const box = $('#w-roc'); if (!box) return;
    const lab = t => h('span', { style: { fontSize: '13px', color: 'var(--muted)' } }, t);
    const note = msg => h('div', { class: 'note', style: { marginTop: '10px' } }, h('b', null, '看懂了什麼：'), msg);
    let val = '1150301', mode = 'text'; const out = h('div');
    const SAMPLES = ['1150301', '990215', '1131225', '1000101', '1141007', '980630'];
    function parseROC(raw) {
      const s = String(raw).trim(); let m;
      if ((m = s.match(/^(\d{2,3})[\/\-.](\d{1,2})[\/\-.](\d{1,2})$/)) || (m = s.match(/^(\d{2,3})年(\d{1,2})月(\d{1,2})日?$/))) return { y: +m[1] + 1911, mo: +m[2], d: +m[3], how: '分隔符號切開：年 ' + m[1] + ' ＋ 1911' };
      if (/^\d{7}$/.test(s)) return { y: +s.slice(0, 3) + 1911, mo: +s.slice(3, 5), d: +s.slice(5, 7), how: '7 碼：前 3 碼 ' + s.slice(0, 3) + ' ＋ 1911' };
      if (/^\d{6}$/.test(s)) return { y: +s.slice(0, 2) + 1911, mo: +s.slice(2, 4), d: +s.slice(4, 6), how: '6 碼：前 2 碼 ' + s.slice(0, 2) + ' ＋ 1911' };
      if (/^\d{5}$/.test(s)) return { y: +s.slice(0, 3) + 1911, mo: +s.slice(3, 5), d: null, how: '5 碼年月：前 3 碼 ' + s.slice(0, 3) + ' ＋ 1911' };
      if (/^\d{4}$/.test(s)) return { y: +s.slice(0, 2) + 1911, mo: +s.slice(2, 4), d: null, how: '4 碼年月：前 2 碼 ' + s.slice(0, 2) + ' ＋ 1911' };
      return null;
    }
    const ok = r => r && r.mo >= 1 && r.mo <= 12 && (r.d === null || (r.d >= 1 && r.d <= new Date(r.y, r.mo, 0).getDate()));
    const iso = r => r.y + '-' + String(r.mo).padStart(2, '0') + (r.d === null ? '' : '-' + String(r.d).padStart(2, '0'));
    function naive(s) {
      s = String(s).trim();
      if (/^\d+$/.test(s)) return ['integer', fmt(+s, 0), '一個很大的整數，不是日期；拿來相減會得到沒有意義的數字'];
      if (/^\d{2,3}[\/\-.]\d{1,2}[\/\-.]\d{1,2}$/.test(s)) { const p = s.split(/[\/\-.]/); return ['date（誤判）', String(+p[0]).padStart(4, '0') + '-' + p[1].padStart(2, '0') + '-' + p[2].padStart(2, '0'), '被當成西元 ' + (+p[0]) + ' 年——算年齡會多出一千九百多歲'] }
      return ['polynominal', s, '純文字，不能排序、不能算天數'];
    }
    function draw() {
      out.innerHTML = '';
      const inp = h('input', { type: 'text', value: val, style: { width: '220px', fontFamily: 'var(--mono)' } });
      inp.oninput = () => { val = inp.value; res(); };
      const r1 = h('div'); out.append(h('div', { class: 'row' }, lab('民國年日期'), inp), r1);
      function res() {
        r1.innerHTML = ''; const nv = naive(val), r = parseROC(val), good = ok(r);
        r1.append(h('div', { class: 'grid2', style: { marginTop: '10px' } },
          h('div', { style: { border: '1px solid var(--line)', borderRadius: '10px', padding: '10px 12px', background: '#fff' } }, h('div', { class: 'mono', style: { color: 'var(--bad)', fontWeight: 700 } }, '✗ 直接讀進來'), h('div', null, '型態：', h('b', null, nv[0])), h('div', { class: 'mono', style: { fontSize: '18px', margin: '4px 0' } }, nv[1]), h('div', { style: { fontSize: '13.5px', color: 'var(--muted)' } }, nv[2])),
          h('div', { style: { border: '1px solid var(--line)', borderRadius: '10px', padding: '10px 12px', background: '#fff' } }, h('div', { class: 'mono', style: { color: 'var(--good)', fontWeight: 700 } }, '✓ 正確轉換'), good ? [h('div', null, '型態：', h('b', null, 'date')), h('div', { class: 'mono', style: { fontSize: '18px', margin: '4px 0' } }, iso(r)), h('div', { style: { fontSize: '13.5px', color: 'var(--muted)' } }, r.how + (r.d === null ? '；只有年月，日要另外決定（通常補 01 或只做月層級分析）' : ''))] : h('div', { style: { fontSize: '13.5px', color: 'var(--bad)', marginTop: '6px' } }, '無法轉成合理日期——這筆要標記出來人工檢查，不能硬轉'))));
      }
      res();
      const list = h('div', { style: { marginTop: '14px' } });
      out.append(h('div', { class: 'row', style: { marginTop: '14px' } }, lab('六筆就診日排序方式'), seg([['text', '當文字排序'], ['date', '轉成日期再排序']], () => mode, v => mode = v, draw)), list);
      const rows = SAMPLES.map(s => ({ s, r: parseROC(s) }));
      rows.sort((a, b) => mode === 'text' ? (a.s < b.s ? -1 : 1) : (iso(a.r) < iso(b.r) ? -1 : 1));
      const inv = rows.some((x, i) => i && iso(x.r) < iso(rows[i - 1].r));
      list.append(h('div', { style: { display: 'flex', gap: '6px', flexWrap: 'wrap' } }, ...rows.map((x, i) => h('div', { style: { border: '1px solid var(--line)', borderRadius: '8px', padding: '6px 10px', background: (i && iso(x.r) < iso(rows[i - 1].r)) ? 'var(--bad-soft)' : '#fff', fontFamily: 'var(--mono)', fontSize: '13px' } }, (i + 1) + '. ' + x.s, h('div', { style: { color: 'var(--muted)' } }, iso(x.r))))));
      const firstOld = rows.findIndex(x => x.r.y < 2011);
      out.append(note(mode === 'text'
        ? `當文字排序時，比的是第一個字元：「1」排在「9」前面，所以 7 碼的民國 100 年以後（${rows.filter(x => x.s.length === 7).length} 筆）全排在 6 碼的民國 9x 年（${rows.filter(x => x.s.length === 6).length} 筆）前面——紅底那筆開始，時間順序就倒了。依「最近一次就診」或「前一次就診」做特徵時，會整個抓錯。`
        : `轉成日期後才是真正的時間順序：最早 ${iso(rows[0].r)}、最晚 ${iso(rows[rows.length - 1].r)}。在 AI Studio 是 Generate Attributes 算出西元年月日字串，再用 Nominal to Date（格式 yyyyMMdd）轉型；轉完一定接 Statistics 看最早、最晚日期合不合理。`));
    }
    box.append(out); draw();
  })();
})();
