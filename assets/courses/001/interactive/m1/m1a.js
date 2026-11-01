/* M1 互動頁 A：導覽、進度、PART 01–05 */
(function () {
  'use strict';
  const { h, $, $$, S, fmt, C, Store, quiz } = U;
  const KEY = 'm1';

  // ================= 導覽與進度 =================
  const parts = $$('section.part');
  Store.set(KEY + ':total', parts.length);
  const side = $('#side');
  const done = new Set(Store.get(KEY + ':done', []));
  parts.forEach((p, i) => {
    const a = h('a', { href: '#' + p.id, 'data-id': p.id }, h('span', { class: 'n' }, String(i + 1).padStart(2, '0')), h('span', null, p.dataset.t), h('span', { class: 'ck' }, '✓'));
    side.append(a);
    const b = h('button', { class: 'btn sm mark-done' });
    const sync = () => { b.textContent = done.has(p.id) ? '✓ 已完成這一節（點擊取消）' : '標記這一節為已完成'; b.classList.toggle('on', done.has(p.id)); a.classList.toggle('done', done.has(p.id)); };
    b.onclick = () => { done.has(p.id) ? done.delete(p.id) : done.add(p.id); Store.set(KEY + ':done', [...done]); sync(); prog(); };
    p.append(h('div', { class: 'row', style: { justifyContent: 'flex-end', marginTop: '14px' } }, b)); sync();
  });
  function prog() { $('#ptxt').textContent = `完成 ${done.size} / ${parts.length}`; $('#pbar').style.width = (done.size / parts.length * 100) + '%'; }
  prog();
  const io = new IntersectionObserver(es => { es.forEach(e => { if (e.isIntersecting) { $$('#side a').forEach(a => a.classList.toggle('cur', a.dataset.id === e.target.id)); } }); }, { rootMargin: '-40% 0px -55% 0px' });
  parts.forEach(p => io.observe(p));

  // ================= P01 六維度 =================
  const DIMS = [
    ['VALIDITY', '有效性', ['值有沒有落在合理範圍內', '血壓 0、年齡 999、BMI 0', '生理上不可能的值幾乎都是遺失']],
    ['COMPLETENESS', '完整性', ['該有的欄位與紀錄有沒有缺', '缺失是隨機的還是有系統的？', '醫療資料常見：檢驗未做 ≠ 檢驗正常']],
    ['UNIQUENESS', '唯一性', ['同一筆資料有沒有重複出現', '完全重複、鍵值重複、語意重複', 'Join 之後筆數暴增通常源於此']],
    ['CONSISTENCY', '一致性', ['同一件事在不同地方寫法一致嗎', '「男/M/1」「臺北/台北」並存', '跨系統整合時最常爆發']],
    ['ACCURACY', '正確性', ['值本身對不對、單位有沒有搞混', '身高 175 與 1.75 同時出現在一欄', '輸入錯誤、儀器校正、抄寫誤差']],
    ['TIMELINESS', '時效性', ['資料反映的是哪個時間點的狀態', '資料夠不夠新、需要時拿不拿得到', '法規、給付標準會逐年更新']],
  ];
  (function () {
    const box = h('div', { class: 'grid3' });
    DIMS.forEach(([en, zh, pts], i) => {
      const body = h('ul', { style: { margin: '6px 0 0', paddingLeft: '1.2em', fontSize: '14px', color: 'var(--muted)', display: 'none' } }, pts.map(t => h('li', null, t)));
      const c = h('div', { style: { border: '1px solid var(--line)', borderRadius: '10px', padding: '10px 12px', background: '#fff', cursor: 'pointer' } },
        h('div', { style: { display: 'flex', alignItems: 'baseline', gap: '8px' } }, h('span', { class: 'mono', style: { fontSize: '11px', color: 'var(--faint)' } }, (i + 1) + ' · ' + en), h('span', { style: { marginLeft: 'auto', fontSize: '12px', color: 'var(--accent)' } }, '＋')),
        h('div', { style: { fontWeight: 700, fontSize: '17px' } }, zh), body);
      c.onclick = () => { const o = body.style.display === 'none'; body.style.display = o ? 'block' : 'none'; c.querySelector('span:last-child').textContent = o ? '－' : '＋'; c.style.borderColor = o ? 'var(--accent)' : 'var(--line)'; };
      box.append(c);
    });
    $('#w-dims').append(box);
  })();

  // ================= P01 找碴 =================
  (function () {
    const head = ['ID', '性別', '年齡', '血壓', '血糖', '就診日'];
    const raw = [['A001', '男', '45', '120', '98', '2027/03/01'], ['A002', 'M', '52', '0', '0', '2027-03-02'], ['A003', '女', '999', '135', '110', '03/03/2027'], ['A001', '男', '45', '120', '98', '2027/03/01'], ['A004', '女', '38', '118', '', '2027/03/04']];
    const clean = [['A001', '1', '45', '120', '98', '2027-03-01'], ['A002', '1', '52', '?', '?', '2027-03-02'], ['A003', '0', '?', '135', '110', '2027-03-03'], ['A004', '0', '38', '118', '?', '2027-03-04']];
    const ISS = [
      { cells: ['1,1'], dim: '一致性', msg: '性別同時有「男」與「M」，需統一編碼' },
      { cells: ['1,3'], dim: '有效性', msg: '血壓 0 生理上不可能 → 應視為遺失' },
      { cells: ['1,4'], dim: '有效性', msg: '血糖 0 生理上不可能 → 應視為遺失' },
      { cells: ['2,2'], dim: '有效性', msg: '年齡 999 → 偽裝成有效值的遺失' },
      { cells: ['1,5', '2,5'], dim: '一致性', msg: '日期有 2027/03/01、2027-03-02、03/03/2027 三種格式' },
      { cells: ['3,0', '3,1', '3,2', '3,3', '3,4', '3,5'], dim: '唯一性', msg: 'A001 完全重複出現兩次，需去重' },
      { cells: ['4,4'], dim: '完整性', msg: 'A004 血糖空白——與 A002 的「0」是同一件事，但長得不一樣' },
    ];
    const found = new Set();
    const wrap = h('div'); const log = h('div', { style: { marginTop: '10px', display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '14px' } });
    const score = h('span', { class: 'val' }); const tw = h('div', { class: 'tscroll' });
    let showClean = false;
    function draw() {
      tw.innerHTML = '';
      const rows = showClean ? clean : raw;
      const t = h('table', { class: 'dt' }, h('tr', null, head.map(x => h('th', null, x))));
      rows.forEach((r, i) => {
        const tr = h('tr'); r.forEach((v, j) => {
          const td = h('td', { class: /^\d+(\.\d+)?$/.test(v) ? 'num' : '' }, v === '' ? '　' : v);
          if (showClean) { if (v === '?') td.className = 'miss'; }
          else {
            const k = i + ',' + j, iss = ISS.findIndex(x => x.cells.includes(k));
            if (iss >= 0 && found.has(iss)) td.className = 'hl';
            td.style.cursor = 'pointer';
            td.onclick = () => { if (iss < 0) { td.classList.add('shake'); setTimeout(() => td.classList.remove('shake'), 400); return; } if (!found.has(iss)) { found.add(iss); log.prepend(h('div', { class: 'fade-in' }, h('span', { class: 'tag ' + (ISS[iss].dim === '有效性' ? 'bad' : ISS[iss].dim === '唯一性' ? 'amber' : ISS[iss].dim === '完整性' ? 'blue' : '') }, ISS[iss].dim), ' ', ISS[iss].msg)); } draw(); };
          }
          tr.append(td);
        }); t.append(tr);
      });
      tw.append(t);
      score.textContent = `${found.size} / ${ISS.length}`;
      if (found.size === ISS.length && !wrap.dataset.ok) { wrap.dataset.ok = 1; log.prepend(h('div', { class: 'note fade-in', style: { margin: '4px 0' } }, '全部找到！這張表只有五列；真實資料有數萬列時，這些問題不會自己跳出來——你必須主動去找。')); }
    }
    const bShow = h('button', { class: 'btn sm' }, '顯示全部答案'); bShow.onclick = () => { ISS.forEach((x, i) => { if (!found.has(i)) { found.add(i); log.prepend(h('div', null, h('span', { class: 'tag gray' }, x.dim), ' ', x.msg)); } }); draw(); };
    const bClean = h('button', { class: 'btn sm' }, '看清理後'); bClean.onclick = () => { showClean = !showClean; bClean.textContent = showClean ? '回到原始資料' : '看清理後'; bClean.classList.toggle('on', showClean); draw(); };
    wrap.append(h('div', { class: 'row', style: { marginBottom: '8px' } }, h('span', null, '已找到 ', score), bShow, bClean), tw, log);
    $('#w-spot').append(wrap); draw();
  })();
  quiz('#q01', { q: 'Join 之後資料筆數暴增，最常是哪一個品質維度出了問題？', opts: ['完整性', '唯一性', '時效性', '正確性'], a: 1, ex: '右表同一鍵值有多筆（一對多或鍵值重複），左表那列就被複製。PART 5 會親手驗證。' });

  // ================= P02 編碼 =================
  (function () {
    const BYTES = { 'UTF-8': [232, 135, 186, 229, 140, 151, 229, 184, 130, 44, 229, 133, 167, 231, 167, 145, 44, 229, 165, 179], 'Big5': [187, 79, 165, 95, 165, 171, 44, 164, 186, 172, 236, 44, 164, 107] };
    let fileEnc = 'Big5', readEnc = 'UTF-8';
    const out = h('div');
    function seg(opts, get, set) { const s = h('div', { class: 'seg' }); opts.forEach(o => { const b = h('button', { class: get() === o ? 'on' : '' }, o); b.onclick = () => { set(o); draw(); }; s.append(b); }); return s; }
    function decode(bytes, enc) { try { return new TextDecoder(enc === 'Big5' ? 'big5' : 'utf-8').decode(new Uint8Array(bytes)); } catch (e) { return '（此瀏覽器不支援 ' + enc + ' 解碼）'; } }
    function draw() {
      out.innerHTML = '';
      const b = BYTES[fileEnc], txt = decode(b, readEnc), ok = fileEnc === readEnc;
      out.append(
        h('div', { class: 'row', style: { marginBottom: '8px' } }, h('span', { style: { fontSize: '14px', color: 'var(--muted)' } }, '檔案實際編碼'), seg(['UTF-8', 'Big5'], () => fileEnc, v => fileEnc = v)),
        h('div', { class: 'row', style: { marginBottom: '10px' } }, h('span', { style: { fontSize: '14px', color: 'var(--muted)' } }, 'Read CSV 的 encoding'), seg(['UTF-8', 'Big5'], () => readEnc, v => readEnc = v)),
        h('div', { class: 'mono', style: { fontSize: '12px', color: 'var(--faint)', wordBreak: 'break-all', marginBottom: '6px' } }, '位元組：' + b.map(x => x.toString(16).toUpperCase().padStart(2, '0')).join(' ')),
        h('div', { style: { fontSize: '22px', padding: '10px 14px', borderRadius: '8px', background: ok ? 'var(--good-soft)' : 'var(--bad-soft)', fontFamily: 'var(--sans)' } }, txt),
        h('p', { style: { fontSize: '14px', marginTop: '8px', color: ok ? 'var(--good)' : 'var(--bad)' } }, ok ? '✓ 編碼一致，中文正常。' : '✗ 編碼不一致：欄位名稱也許正常，但內容變亂碼或問號。先用純文字編輯器開檔確認編碼。'));
    }
    $('#w-enc').append(out); draw();
  })();

  // ================= P02 型態誤判 =================
  (function () {
    const raw = [['0007', '850'], ['0012', '"1,234"'], ['0103', '620'], ['0458', '2,980']];
    let fixed = false; const out = h('div');
    function draw() {
      out.innerHTML = '';
      const t = h('table', { class: 'dt' }, h('tr', null, h('th', null, '代碼（原始）'), h('th', null, '費用（原始）'), h('th', null, '→ 代碼讀入'), h('th', null, '→ 費用讀入')));
      raw.forEach(([c, f]) => { const fv = f.replace(/"/g, ''); t.append(h('tr', null, h('td', { class: 'mono' }, c), h('td', { class: 'mono' }, f), h('td', { class: fixed ? 'ok mono' : 'hl mono' }, fixed ? c : String(+c)), h('td', { class: fixed ? 'ok num' : 'hl mono' }, fixed ? fv.replace(',', '') : fv))); });
      const nums = raw.map(r => +r[1].replace(/[",]/g, ''));
      const st = fixed ? `代碼：polynominal（保留 0007）　費用：integer，min ${S.min(nums)}、max ${S.max(nums)}、平均 ${fmt(S.mean(nums), 0)}` : `代碼：integer（0007 → 7，前導零被吃掉）　費用：polynominal（因為有「1,234」，整欄變文字，算不出平均）`;
      const b = h('button', { class: 'btn sm' + (fixed ? ' on' : '') }, fixed ? '✓ 已在 data set meta data 逐欄設定' : '在 meta data 逐欄設定型態'); b.onclick = () => { fixed = !fixed; draw(); };
      out.append(h('div', { class: 'row', style: { marginBottom: '8px' } }, b), t, h('div', { class: 'note ' + (fixed ? '' : 'warn'), style: { fontSize: '14px' } }, h('b', null, 'Statistics：'), st),
        h('p', { class: 'ai' }, h('b', null, '貫穿資料：'), '就診費用約 3.5% 的列（≥1,000 元者）含千分位逗號 → 整欄 765 筆都會被讀成文字。身分證字號、病歷號應為文字而非數字。'));
    }
    $('#w-type').append(out); draw();
  })();

  // ================= P02 FHIR =================
  (function () {
    const json = `{
  "resourceType": "Observation",
  "subject": { "reference": "Patient/A001" },
  "code": { "coding": [{
      "system": "http://loinc.org",
      "code": "2345-7",
      "display": "Glucose" }] },
  "valueQuantity": { "value": 98, "unit": "mg/dL" },
  "effectiveDateTime": "2027-03-01"
}`;
    let flat = false, drop = false; const out = h('div');
    function draw() {
      out.innerHTML = '';
      const pre = h('pre', { class: 'mono', style: { background: '#1f2933', color: '#e6edf3', padding: '12px 14px', borderRadius: '8px', fontSize: '12.5px', margin: 0, overflow: 'auto', lineHeight: 1.55 } });
      pre.innerHTML = json.replace(/("(?:subject|code|valueQuantity|effectiveDateTime|value|unit|reference|display|system)")/g, '<span style="color:#7dd3c0">$1</span>').replace(/("2345-7"|"mg\/dL")/g, '<span style="background:#7a5a10;color:#ffe08a">$1</span>');
      const cols = [['病歷號', 'A001'], ['LOINC', '2345-7'], ['檢驗項目', 'Glucose'], ['值', '98'], ['單位', 'mg/dL'], ['日期', '2027-03-01']].filter(c => !(drop && (c[0] === 'LOINC' || c[0] === '單位')));
      const tbl = flat ? h('table', { class: 'dt fade-in' }, h('tr', null, cols.map(c => h('th', null, c[0]))), h('tr', null, cols.map(c => h('td', { class: (c[0] === 'LOINC' || c[0] === '單位') ? 'hl mono' : 'mono' }, c[1])))) : h('div', { style: { color: 'var(--faint)', fontSize: '14px', padding: '20px 0' } }, '← 按「攤平」');
      const b1 = h('button', { class: 'btn sm primary' }, flat ? '↺ 還原' : '攤平 flatten →'); b1.onclick = () => { flat = !flat; draw(); };
      const cb = h('input', { type: 'checkbox' }); cb.checked = drop; cb.onchange = () => { drop = cb.checked; draw(); };
      // 跨院合併示範
      const H = [['A 院', 98, 'mg/dL'], ['B 院', 5.4, 'mmol/L'], ['C 院', 110, 'mg/dL']];
      const conv = H.map(x => x[2] === 'mmol/L' ? x[1] * 18 : x[1]);
      const meanOK = S.mean(conv), meanBad = S.mean(H.map(x => x[1]));
      const merge = h('div', { style: { marginTop: '10px' } },
        h('div', { style: { fontSize: '14px', fontWeight: 600, marginBottom: '4px' } }, '三家醫院的同一項檢驗合在一起：'),
        h('table', { class: 'dt' }, h('tr', null, h('th', null, '醫院'), h('th', null, '值'), h('th', null, '單位'), h('th', null, '統一成 mg/dL')), H.map((x, i) => h('tr', null, h('td', null, x[0]), h('td', { class: 'num' }, x[1]), h('td', { class: drop ? 'miss' : '' }, drop ? '?' : x[2]), h('td', { class: 'num' }, drop ? '無法換算' : fmt(conv[i], 1))))),
        h('div', { class: 'note ' + (drop ? 'bad' : ''), style: { fontSize: '14px' } }, drop ? `平均 = ${fmt(meanBad, 1)}——看起來像低血糖。mg/dL 與 mmol/L 差 18 倍，沒有單位就合不起來。` : `平均 = ${fmt(meanOK, 1)} mg/dL（B 院 5.4 mmol/L × 18 = 97.2）。用 LOINC 代碼而不是名稱對齊檢驗項目。`));
      out.append(h('div', { class: 'grid2' }, pre, h('div', null, h('div', { class: 'row', style: { marginBottom: '8px' } }, b1, h('label', { class: 'ctl' }, cb, '攤平時丟掉單位與 LOINC')), h('div', { class: 'tscroll' }, tbl), merge)));
    }
    $('#w-fhir').append(out); draw();
  })();
  quiz('#q02', { q: '資料匯入 AI Studio 後，最先該做的一件事是？', opts: ['直接接模型看效果', '接一個 Statistics，看筆數、欄位數、每欄型態與極值', '先做 Normalize', '先把有缺失的列刪掉'], a: 1, ex: '三十秒就能擋掉大部分問題：筆數不對、型態誤判（費用變文字）、極值不合理（血壓 0）都一眼可見。' });

  // ================= P03 型態與角色 =================
  (function () {
    const TYPES = ['integer', 'real', 'binominal', 'polynominal', 'date', 'text'];
    const ROLES = ['regular', 'label', 'id', '不進模型'];
    const COLS = [
      ['就診序號', 'V00211', ['polynominal', 'text'], 'id', '一次就診的唯一序號，只用來追溯，不可進模型'],
      ['病歷號', 'P0088', ['polynominal', 'text'], 'id', '有前導零必須是文字；PART 12 會再設成 batch 做群組切分'],
      ['就診日', '2026-01-25', ['date'], '不進模型', '原始日期留成 regular，模型會學到「時間越晚風險越高」；改衍生星期、間隔等特徵'],
      ['科別', '內科', ['polynominal'], 'regular', '五個科別，無大小順序'],
      ['性別', '女', ['binominal'], 'regular', '統一寫法後只剩兩類'],
      ['出生年', '1945', ['integer'], 'regular', '建議再衍生「年齡」'],
      ['身高cm', '161.9', ['real'], 'regular', '可運算的小數'],
      ['體重kg', '74.0', ['real'], 'regular', '可運算的小數'],
      ['收縮壓', '130.0', ['real'], 'regular', '可運算的小數'],
      ['舒張壓', '75.0', ['real'], 'regular', '可運算的小數'],
      ['就診費用', '"1,646"', ['integer', 'real'], 'regular', '去掉千分位後是數值；匯入時常被誤判成文字'],
      ['縣市', '新北市', ['polynominal'], 'regular', '多元類別'],
      ['出院後30天門診次數', '0', ['integer'], '不進模型', '洩漏誘餌：預測當下還沒發生'],
      ['結案註記', '結案', ['binominal', 'polynominal'], '不進模型', '洩漏誘餌：由目標變數推導而來'],
      ['再就診30天', '0', ['binominal'], 'label', '目標變數：30 天內是否再就診'],
    ];
    const sel = {}; const out = h('div'); let checked = false;
    function draw() {
      out.innerHTML = '';
      const t = h('table', { class: 'dt' }, h('tr', null, ['欄位', '範例值', '型態 Type', '角色 Role', checked ? '說明' : ''].map(x => h('th', null, x))));
      let ok = 0;
      COLS.forEach(([n, v, ts, r, why]) => {
        const s1 = h('select', null, h('option', { value: '' }, '—'), TYPES.map(x => h('option', { value: x }, x))); s1.value = (sel[n] || {}).t || '';
        const s2 = h('select', null, h('option', { value: '' }, '—'), ROLES.map(x => h('option', { value: x }, x))); s2.value = (sel[n] || {}).r || '';
        s1.onchange = () => { sel[n] = { ...(sel[n] || {}), t: s1.value }; }; s2.onchange = () => { sel[n] = { ...(sel[n] || {}), r: s2.value }; };
        const tOK = ts.includes(s1.value), rOK = s2.value === r; if (tOK && rOK) ok++;
        const c1 = h('td', null, s1), c2 = h('td', null, s2);
        if (checked) { c1.className = tOK ? 'ok' : 'hl'; c2.className = rOK ? 'ok' : 'hl'; }
        t.append(h('tr', null, h('td', { style: { fontWeight: 600 } }, n), h('td', { class: 'mono' }, v), c1, c2, h('td', { style: { whiteSpace: 'normal', fontSize: '13px', color: 'var(--muted)', minWidth: '220px' } }, checked ? `答：${ts.join(' / ')}・${r}。${why}` : '')));
      });
      const bc = h('button', { class: 'btn primary sm' }, '檢查'); bc.onclick = () => { checked = true; draw(); };
      const ba = h('button', { class: 'btn sm' }, '填入答案'); ba.onclick = () => { COLS.forEach(c => sel[c[0]] = { t: c[2][0], r: c[3] }); checked = true; draw(); };
      const br = h('button', { class: 'btn sm' }, '重設'); br.onclick = () => { for (const k in sel) delete sel[k]; checked = false; draw(); };
      out.append(h('div', { class: 'row', style: { marginBottom: '8px' } }, bc, ba, br, checked ? h('span', { class: 'tag ' + (ok === COLS.length ? 'good' : 'amber') }, `全對 ${ok} / ${COLS.length} 欄`) : null), h('div', { class: 'tscroll' }, t),
        h('p', { class: 'ai' }, h('b', null, '常見錯誤：'), '把「CMS 等級 1–8」當一般數值運算。它是有序類別：順序可保留，但間距不等——等級 8 不等於等級 4 的兩倍。設錯角色的檢查方式：看特徵重要性，ID 類欄位排前面就是警訊。'));
    }
    $('#w-roles').append(out); draw();
  })();

  // ================= P03 編碼 =================
  (function () {
    const D = [[1, '內科', '高'], [2, '外科', '中'], [3, '內科', '低'], [4, '急診', '高']];
    const CATS = { 科別: ['內科', '外科', '急診'], 滿意度: ['低', '中', '高'] };
    let col = '科別', enc = 'onehot'; const out = h('div');
    function seg(opts, get, set) { const s = h('div', { class: 'seg' }); opts.forEach(([v, l]) => { const b = h('button', { class: get() === v ? 'on' : '' }, l); b.onclick = () => { set(v); draw(); }; s.append(b); }); return s; }
    function vec(v) { const cats = CATS[col]; if (enc === 'ord') return [cats.indexOf(v) + 1]; const oh = cats.map(c => c === v ? 1 : 0); return enc === 'onehot1' ? oh.slice(1) : oh; }
    function draw() {
      out.innerHTML = '';
      const cats = CATS[col], ci = col === '科別' ? 1 : 2;
      const names = enc === 'ord' ? [col + '（編碼）'] : (enc === 'onehot1' ? cats.slice(1) : cats).map(c => col + '=' + c);
      const t = h('table', { class: 'dt' }, h('tr', null, h('th', null, 'ID'), h('th', null, col), names.map(n => h('th', null, n))));
      D.forEach(r => t.append(h('tr', null, h('td', null, r[0]), h('td', null, r[ci]), vec(r[ci]).map(v => h('td', { class: 'num' }, v)))));
      const dist = (a, b) => Math.sqrt(vec(a).reduce((s, x, i) => s + (x - vec(b)[i]) ** 2, 0));
      const pairs = [[cats[0], cats[1]], [cats[0], cats[2]], [cats[1], cats[2]]];
      const dl = h('div', { style: { fontSize: '14px' } }, h('div', { style: { fontWeight: 600, marginBottom: '4px' } }, '兩兩之間的歐氏距離'), pairs.map(([a, b]) => h('div', { class: 'mono' }, `d(${a}, ${b}) = ${fmt(dist(a, b), 2)}`)));
      let msg, cls;
      if (col === '科別' && enc === 'ord') { msg = '✗ 科別沒有大小順序，但編成 1/2/3 後，模型會以為「外科介於內科與急診之間」、「急診 = 內科的三倍」。'; cls = 'bad'; }
      else if (col === '科別') { msg = '✓ One-Hot 讓每個科別彼此等距，沒有虛構的順序。'; cls = ''; }
      else if (enc === 'ord') { msg = '✓ 低 < 中 < 高 有順序，序數編碼保留次序資訊。AI Studio 用 Map 手動對照；unique integers 依字母編號，不保證順序。'; cls = ''; }
      else { msg = '△ One-Hot 可以用，但丟掉了「低 < 中 < 高」的順序資訊。'; cls = 'warn'; }
      if (enc === 'onehot1') msg += '　k−1 欄：第一類（' + cats[0] + '）當參照組；k 欄加總永遠 = 1，與迴歸截距完全共線（dummy trap），M2-1 會回到這點。';
      out.append(h('div', { class: 'row', style: { marginBottom: '10px' } }, h('span', { style: { fontSize: '14px', color: 'var(--muted)' } }, '欄位'), seg([['科別', '科別（無序）'], ['滿意度', '滿意度（有序）']], () => col, v => col = v),
        h('span', { style: { fontSize: '14px', color: 'var(--muted)', marginLeft: '8px' } }, '編碼'), seg([['ord', '序數 1/2/3'], ['onehot', 'One-Hot（k 欄）'], ['onehot1', 'One-Hot（k−1 欄）']], () => enc, v => enc = v)),
        h('div', { class: 'grid2' }, h('div', { class: 'tscroll' }, t), dl), h('div', { class: 'note ' + cls, style: { fontSize: '14px' } }, msg));
    }
    $('#w-encode').append(out); draw();
  })();

  // ================= P04 Aggregate =================
  (function () {
    const V = [['A001', '03/01', '內科', 800], ['A001', '03/15', '內科', 650], ['A001', '04/02', '復健', 1200], ['A002', '03/08', '外科', 2400], ['A002', '04/20', '外科', 900]];
    let key = '病歷號'; const fn = { count: true, sum: true, avg: true, max: false, cd: true };
    const out = h('div');
    function draw() {
      out.innerHTML = '';
      const ki = key === '病歷號' ? 0 : 2, other = key === '病歷號' ? '科別' : '病歷號', oi = key === '病歷號' ? 2 : 0;
      const groups = {}; V.forEach(r => (groups[r[ki]] = groups[r[ki]] || []).push(r));
      const L = h('table', { class: 'dt' }, h('tr', null, ['病歷號', '就診日', '科別', '費用'].map(x => h('th', null, x))), V.map(r => h('tr', null, r.map((v, j) => h('td', { class: j === 3 ? 'num' : (j === ki ? 'hl' : '') }, v)))));
      const cols = [['count', '就診次數', g => g.length], ['sum', '總費用', g => S.sum(g.map(r => r[3]))], ['avg', '平均費用', g => Math.round(S.mean(g.map(r => r[3])))], ['max', '最高費用', g => S.max(g.map(r => r[3]))], ['cd', other + '數 (distinct)', g => new Set(g.map(r => r[oi])).size]].filter(c => fn[c[0]]);
      const R = h('table', { class: 'dt fade-in' }, h('tr', null, h('th', null, key), cols.map(c => h('th', null, c[1]))), Object.entries(groups).map(([k, g]) => h('tr', null, h('td', { class: 'hl' }, k), cols.map(c => h('td', { class: 'num' }, c[2](g))))));
      const ks = h('select', null, h('option', null, '病歷號'), h('option', null, '科別')); ks.value = key; ks.onchange = () => { key = ks.value; draw(); };
      const cbs = [['count', 'count'], ['sum', 'sum'], ['avg', 'average'], ['max', 'maximum'], ['cd', 'count (distinct)']].map(([k, l]) => { const c = h('input', { type: 'checkbox' }); c.checked = fn[k]; c.onchange = () => { fn[k] = c.checked; draw(); }; return h('label', { class: 'ctl' }, c, l); });
      out.append(h('div', { class: 'row', style: { marginBottom: '10px' } }, h('label', { class: 'ctl' }, 'group by', ks), ...cbs),
        h('div', { class: 'grid2' }, h('div', null, h('div', { style: { fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' } }, `一列 = 一次就診（${V.length} 列）`), h('div', { class: 'tscroll' }, L)), h('div', null, h('div', { style: { fontSize: '13px', color: 'var(--accent)', fontWeight: 600, marginBottom: '4px' } }, `一列 = 一個${key === '病歷號' ? '病人' : '科別'}（${Object.keys(groups).length} 列）`), h('div', { class: 'tscroll' }, R))),
        h('p', { class: 'ai' }, h('b', null, '實務提醒：'), '聚合會遺失細節。同時保留總和、平均、最大、次數等多個統計量，讓模型自己挑。原課程範例：Module 3 - Merging & Grouping.rmp'));
    }
    $('#w-agg').append(out); draw();
  })();

  // ================= P04 Pivot =================
  (function () {
    const base = [['A001', '血糖', 98], ['A001', 'HbA1c', 5.8], ['A001', 'LDL', 130], ['A002', '血糖', 145], ['A002', 'HbA1c', 7.2], ['A003', 'LDL', 160]];
    let wide = false, twice = false, pol = '最新'; const out = h('div');
    function draw() {
      out.innerHTML = '';
      const L = base.slice(); if (twice) L.splice(1, 0, ['A001', '血糖', 110]);
      const items = ['血糖', 'HbA1c', 'LDL'], ids = [...new Set(L.map(r => r[0]))];
      const longT = h('table', { class: 'dt' }, h('tr', null, h('th', null, '病歷號'), h('th', null, '檢驗'), h('th', null, '值')), L.map((r, i) => h('tr', null, h('td', null, r[0]), h('td', null, r[1]), h('td', { class: 'num' + (twice && r[0] === 'A001' && r[1] === '血糖' ? ' hl' : '') }, r[2]))));
      const pick = vs => !vs.length ? null : pol === '最新' ? vs[vs.length - 1] : pol === '平均' ? +S.mean(vs).toFixed(1) : S.max(vs);
      const wideT = h('table', { class: 'dt fade-in' }, h('tr', null, h('th', null, '病歷號'), items.map(x => h('th', null, x))), ids.map(id => h('tr', null, h('td', null, id), items.map(it => { const v = pick(L.filter(r => r[0] === id && r[1] === it).map(r => r[2])); return h('td', { class: v == null ? 'miss' : 'num' + (twice && id === 'A001' && it === '血糖' ? ' hl' : '') }, v == null ? '?' : v); }))));
      const bt = h('button', { class: 'btn primary sm' }, wide ? '← De-Pivot 回長表' : 'Pivot 成寬表 →'); bt.onclick = () => { wide = !wide; draw(); };
      const cb = h('input', { type: 'checkbox' }); cb.checked = twice; cb.onchange = () => { twice = cb.checked; draw(); };
      const ps = h('select', null, ['最新', '平均', '最大'].map(x => h('option', null, x))); ps.value = pol; ps.onchange = () => { pol = ps.value; draw(); };
      out.append(h('div', { class: 'row', style: { marginBottom: '10px' } }, bt, h('label', { class: 'ctl' }, cb, 'A001 同一天再驗一次血糖（110）'), twice ? h('label', { class: 'ctl' }, '彙總取', ps) : null),
        h('div', { class: 'grid2' }, h('div', { style: { opacity: wide ? .45 : 1 } }, h('div', { style: { fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' } }, `長表 Long：一列＝一筆檢驗（${L.length} 列）`), h('div', { class: 'tscroll' }, longT)),
          h('div', { style: { opacity: wide ? 1 : .45 } }, h('div', { style: { fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' } }, `寬表 Wide：一列＝一位病人（${ids.length} 列 × ${items.length + 1} 欄）`), h('div', { class: 'tscroll' }, wideT))),
        h('div', { class: 'note', style: { fontSize: '14px' } }, h('b', null, '檢查方式：'), `Pivot 後列數應等於不重複病歷號數（${ids.length}），欄位數＝檢驗項目數＋1（${items.length + 1}）。「?」是真的沒驗，不是錯誤——回到 PART 6 判斷遺失機制。貫穿資料：397 筆檢驗屬 160 位病人 → 寬表應為 160 列。`));
    }
    $('#w-pivot').append(out); draw();
  })();

  // ================= P05 Join =================
  (function () {
    const LEFT = [['A001', '王〇〇'], ['A002', '李〇〇'], ['A003', '陳〇〇'], ['A004', '林〇〇'], ['A005', '張〇〇']];
    const RIGHT0 = [['A001', '血糖 98'], ['A001', '血壓 120'], ['A001', '膽固醇 210'], ['A002', '血糖 145'], ['A004', '血糖 102'], ['A006', '血糖 130']];
    let type = 'left', dirty = false, trim = false, agg = false; const out = h('div');
    const TYPES = [['inner', 'Inner'], ['left', 'Left'], ['right', 'Right'], ['outer', 'Outer']];
    function right() { let R = RIGHT0.map(r => r.slice()); if (dirty) R = R.map(r => r[0] === 'A004' ? ['A004 ', r[1]] : r[0] === 'A002' ? ['a002', r[1]] : r); if (trim) R = R.map(r => [r[0].trim().toUpperCase(), r[1]]); if (agg) { const g = {}; R.forEach(r => (g[r[0]] = g[r[0]] || []).push(r[1])); R = Object.entries(g).map(([k, v]) => [k, `檢驗 ${v.length} 筆`]); } return R; }
    function join(t) {
      const R = right(), res = [];
      LEFT.forEach(l => { const m = R.filter(r => r[0] === l[0]); if (m.length) m.forEach(r => res.push([l[0], l[1], r[1]])); else if (t === 'left' || t === 'outer') res.push([l[0], l[1], null]); });
      if (t === 'right' || t === 'outer') R.forEach(r => { if (!LEFT.some(l => l[0] === r[0])) res.push([r[0], null, r[1]]); });
      if (t === 'right') { return res.filter(x => x[2] != null); }
      return res;
    }
    function venn(t) {
      const sv = U.svgBox(h('div'), 200, 110); const W = sv.parentNode;
      const on = { inner: [0, 1, 0], left: [1, 1, 0], right: [0, 1, 1], outer: [1, 1, 1] }[t];
      const defs = U.s('defs', null, sv);
      const cpL = U.s('clipPath', { id: 'cl' + t }, defs); U.s('circle', { cx: 75, cy: 55, r: 45 }, cpL);
      const cpR = U.s('clipPath', { id: 'cr' + t }, defs); U.s('circle', { cx: 125, cy: 55, r: 45 }, cpR);
      if (on[0]) U.s('circle', { cx: 75, cy: 55, r: 45, fill: C.accent, 'fill-opacity': .55 }, sv);
      if (on[2]) U.s('circle', { cx: 125, cy: 55, r: 45, fill: C.accent, 'fill-opacity': .55 }, sv);
      if (on[1]) { const g = U.s('g', { 'clip-path': `url(#cl${t})` }, sv); U.s('circle', { cx: 125, cy: 55, r: 45, fill: C.accent, 'fill-opacity': on[0] || on[2] ? .35 : .8 }, g); }
      U.s('circle', { cx: 75, cy: 55, r: 45, fill: 'none', stroke: C.ink, 'stroke-width': 1.2 }, sv); U.s('circle', { cx: 125, cy: 55, r: 45, fill: 'none', stroke: C.ink, 'stroke-width': 1.2 }, sv);
      U.s('text', { x: 50, y: 58, text: '左表', 'text-anchor': 'middle', style: 'fill:#1c2430;font-size:12px' }, sv); U.s('text', { x: 150, y: 58, text: '右表', 'text-anchor': 'middle', style: 'fill:#1c2430;font-size:12px' }, sv);
      return W;
    }
    function draw() {
      out.innerHTML = '';
      const R = right(), res = join(type), uniq = new Set(res.map(r => r[0])).size;
      const sel = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '8px', marginBottom: '12px' } });
      TYPES.forEach(([t, l]) => { const c = h('div', { style: { border: '1.5px solid ' + (t === type ? 'var(--accent)' : 'var(--line)'), borderRadius: '10px', padding: '6px', textAlign: 'center', cursor: 'pointer', background: t === type ? 'var(--accent-soft)' : '#fff' } }, venn(t), h('div', { style: { fontWeight: 600, fontSize: '14px' } }, l + ' Join'), h('div', { class: 'mono', style: { fontSize: '12px', color: 'var(--muted)' } }, join(t).length + ' 列')); c.onclick = () => { type = t; draw(); }; sel.append(c); });
      const tg = (label, get, set) => { const c = h('input', { type: 'checkbox' }); c.checked = get(); c.onchange = () => { set(c.checked); draw(); }; return h('label', { class: 'ctl' }, c, label); };
      const lt = h('table', { class: 'dt' }, h('tr', null, h('th', null, '病歷號'), h('th', null, '姓名')), LEFT.map(r => h('tr', null, h('td', { class: 'mono' }, r[0]), h('td', null, r[1]))));
      const rt = h('table', { class: 'dt' }, h('tr', null, h('th', null, '病歷號'), h('th', null, '檢驗')), R.map(r => h('tr', null, h('td', { class: 'mono' + (r[0] !== r[0].trim() || /[a-z]/.test(r[0]) ? ' hl' : '') }, r[0].replace(/ $/, '␣')), h('td', null, r[1]))));
      const ot = h('table', { class: 'dt fade-in' }, h('tr', null, h('th', null, '病歷號'), h('th', null, '姓名'), h('th', null, '檢驗')), res.map(r => h('tr', null, h('td', { class: 'mono' }, r[0].replace(/ $/, '␣')), r[1] == null ? h('td', { class: 'miss' }, '?') : h('td', null, r[1]), r[2] == null ? h('td', { class: 'miss' }, '?') : h('td', null, r[2]))));
      const warn = [];
      if (res.length > uniq) warn.push(`筆數 ${res.length} ≠ 不重複病人 ${uniq}：一對多讓主檔列被複製。若之後直接 count，會誤以為有 ${res.length} 位病人。→ Join 前先對右表 Aggregate。`);
      if (dirty && !trim) warn.push('鍵值「A004␣」有尾空白、「a002」大小寫不同——對不上，而且不會報錯。→ Join 前先 Trim 與 lower()/upper()。');
      if (type === 'left' && res.some(r => r[2] == null)) warn.push('右表沒有資料的病人（如 A003）出現「?」——這是 Left Join 保留下來的正常資訊，不要當成錯誤刪掉。');
      out.append(sel,
        h('div', { class: 'row', style: { marginBottom: '10px' } }, tg('右表鍵值有空白／大小寫不一致', () => dirty, v => dirty = v), tg('Join 前先 Trim＋轉大寫', () => trim, v => trim = v), tg('Join 前先對右表 Aggregate（一列一病人）', () => agg, v => agg = v)),
        h('div', { style: { display: 'grid', gridTemplateColumns: '1fr 1fr 1.4fr', gap: '14px' } },
          h('div', null, h('div', { style: { fontSize: '13px', color: 'var(--muted)' } }, `左表 主檔（${LEFT.length}）`), h('div', { class: 'tscroll' }, lt)),
          h('div', null, h('div', { style: { fontSize: '13px', color: 'var(--muted)' } }, `右表 檢驗（${R.length}）`), h('div', { class: 'tscroll' }, rt)),
          h('div', null, h('div', { style: { fontSize: '13px', color: 'var(--accent)', fontWeight: 600 } }, `結果：${res.length} 列 · ${uniq} 位不重複病人`), h('div', { class: 'tscroll' }, ot))),
        warn.length ? h('div', { class: 'note warn', style: { fontSize: '14px' } }, warn.map(w => h('div', null, '⚠ ' + w))) : h('div', { class: 'note', style: { fontSize: '14px' } }, '✓ 筆數與不重複病人數一致。'),
        h('div', { class: 'kpi', style: { marginTop: '8px' } }, h('div', null, h('div', { class: 'k' }, '貫穿資料 主檔（去重後）'), h('div', { class: 'v' }, '751')), h('div', null, h('div', { class: 'k' }, '檢驗結果'), h('div', { class: 'v' }, '397')), h('div', null, h('div', { class: 'k' }, 'Left Join 後'), h('div', { class: 'v bad' }, '1,383')), h('div', null, h('div', { class: 'k' }, '先 Aggregate 再 Join'), h('div', { class: 'v good' }, '751'))));
    }
    $('#w-join').append(out); draw();
  })();
  quiz('#q05', { q: '做完 Inner Join，筆數從 1,200 掉到 942。最先該懷疑什麼？', opts: ['右表是一對多', '鍵值對不上：空白、大小寫或型態不一致', '左表有重複列', '這是正常現象，不用處理'], a: 1, ex: 'Inner 只留兩邊都有的鍵值；筆數大減通常是鍵值清理沒做。一對多則會讓 Left Join 筆數「變多」。四項檢查：筆數比對、鍵值清理、鍵值型態一致、Join 後遺失比例。' });
})();
