/* Dify 手冊加強版（2026-11）：程式碼節點的 200 筆回歸測試——原 PDF 寫法 vs 修正版 */
(function () {
  'use strict';
  const { h, $, S, seg, C } = U;
  const DF = window.DIFY; if (!DF) return;
  const { CAPS, codeOriginal, codeFixed } = DF;
  const kpi = (k, v, cls) => h('div', null, h('div', { class: 'k' }, k), h('div', { class: 'v' + (cls ? ' ' + cls : '') }, v));
  const sub = t => h('div', { style: { fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' } }, t);
  const lab = t => h('span', { style: { fontSize: '13px', color: 'var(--muted)' } }, t);
  const note = (msg, cls) => h('div', { class: 'note' + (cls ? ' ' + cls : ''), style: { marginTop: '10px' } }, h('b', null, '看懂了什麼：'), msg);
  const fmt = n => Math.round(n).toLocaleString('en-US');

  (function regress() {
    const box = $('#w-regress'); if (!box) return;
    // LLM 1 的輸出型態（比例依手冊測試時常見的狀況編寫，教學用）
    const TYPES = [
      ['正常 JSON（整數）', .6, lv => JSON.stringify({ cms_level: lv, adl_score: 60, is_dementia: false })],
      ['包在 ```json 區塊裡', .08, lv => '```json\n' + JSON.stringify({ cms_level: lv, adl_score: 60 }) + '\n```'],
      ['等級是字串 "4"', .07, lv => JSON.stringify({ cms_level: String(lv) })],
      ['等級是「第 4 級」', .06, lv => JSON.stringify({ cms_level: `第 ${lv} 級` })],
      ['輸出被截斷（Max Tokens 太小）', .05, lv => JSON.stringify({ cms_level: lv, adl_score: 60, major_problems: ['行動不便', '夜間'] }).slice(0, 38)],
      ['漏了 cms_level 欄位', .05, () => JSON.stringify({ adl_score: 55, is_dementia: true })],
      ['等級寫成區間 "4-5"', .04, lv => JSON.stringify({ cms_level: `${lv}-${Math.min(8, lv + 1)}` })],
      ['等級超出範圍（1 或 9）', .03, lv => JSON.stringify({ cms_level: lv >= 5 ? 9 : 1 })],
      ['前面多了一句說明文字', .02, lv => '以下是評估結果：' + JSON.stringify({ cms_level: lv })]
    ];
    const INC = ['一般戶', '中低收', '低收'];
    let N = 200, seed = 1;
    function gen() {
      const r = U.rng(seed * 17 + N), cases = [];
      for (let i = 0; i < N; i++) { let u = r(), k = 0; while (k < TYPES.length - 1 && u > TYPES[k][1]) { u -= TYPES[k][1]; k++; } const lv = 2 + Math.floor(r() * 7); cases.push({ id: i + 1, k, lv, inc: INC[Math.floor(r() * 3)], str: TYPES[k][2](lv) }); }
      return cases.map(c => {
        const a = codeOriginal(c.str, c.inc), b = codeFixed(c.str, c.inc);
        // 能不能從輸出確定真實等級：正常、```、"4"、「第 4 級」、前面多一句話可以；其餘不行（應轉人工）
        const recoverable = [0, 1, 2, 3, 8].includes(c.k), truth = CAPS[c.lv];
        const judge = res => res.monthly_budget == null ? (recoverable ? 'over' : 'safe') : res.monthly_budget === truth ? 'ok' : 'wrong';
        return { ...c, a, b, ja: judge(a), jb: judge(b) };
      });
    }
    let cases = gen(), sel = null;
    const out = h('div');
    const LBL = { ok: ['金額正確', C.good], safe: ['正確轉人工', C.blue], over: ['不必要轉人工', C.amber], wrong: ['給了錯的金額', C.bad] };
    function draw() {
      out.innerHTML = '';
      const re = h('button', { class: 'btn sm' }, '↻ 換一批測試案例'); re.onclick = () => { seed++; cases = gen(); sel = null; draw(); };
      out.append(h('div', { class: 'row', style: { gap: '10px', flexWrap: 'wrap', marginBottom: '10px' } }, lab('測試筆數'), seg([[50, '50'], [200, '200'], [1000, '1,000']], () => N, v => { N = v; cases = gen(); sel = null; }, draw), re));
      const cnt = (key, j) => cases.filter(c => c[key] === j).length;
      out.append(h('div', { class: 'kpi', style: { marginBottom: '10px' } }, kpi('原 PDF 寫法：給了錯的金額', cnt('ja', 'wrong') + ' 筆', 'bad'), kpi('原 PDF 寫法：金額正確', cnt('ja', 'ok') + ' 筆'), kpi('修正版：給了錯的金額', cnt('jb', 'wrong') + ' 筆', cnt('jb', 'wrong') ? 'bad' : 'good'), kpi('修正版：轉人工覆核', (cnt('jb', 'safe') + cnt('jb', 'over')) + ' 筆')));
      const tb = h('div', { style: { display: 'grid', gridTemplateColumns: '1.6fr 50px 1fr 1fr', gap: '3px 8px', fontSize: '13px', alignItems: 'center' } });
      tb.append(h('b', null, 'LLM 1 輸出的樣子'), h('b', null, '筆數'), h('b', null, '原 PDF 寫法'), h('b', null, '修正版'));
      const cell = (arr, key) => { const g = {}; arr.forEach(c => g[c[key]] = (g[c[key]] || 0) + 1); return h('div', { style: { display: 'flex', gap: '4px', flexWrap: 'wrap' } }, ...Object.entries(g).map(([j, n]) => h('span', { style: { padding: '1px 7px', borderRadius: '5px', fontSize: '12px', background: LBL[j][1] + '22', color: LBL[j][1], fontWeight: 600 } }, `${LBL[j][0]} ${n}`))); };
      TYPES.forEach((t, k) => { const arr = cases.filter(c => c.k === k); if (!arr.length) return; const row = [h('div', { style: { cursor: 'pointer', textDecoration: sel === k ? 'underline' : 'none' }, onclick: () => { sel = k; draw(); } }, t[0]), h('div', { style: { fontFamily: 'var(--mono)' } }, arr.length), cell(arr, 'ja'), cell(arr, 'jb')]; row.forEach(x => { x.style.padding = '4px 0'; x.style.borderTop = '1px dashed var(--line)'; tb.append(x); }); });
      out.append(sub('依 LLM 輸出型態分組（點左欄看實際案例）'), tb);
      if (sel != null) { const ex = cases.find(c => c.k === sel); if (ex) out.append(h('div', { style: { marginTop: '10px', border: '1px solid var(--line)', borderRadius: '8px', padding: '8px 10px', fontSize: '13px' } }, h('div', null, h('b', null, `案例 #${ex.id}`), `　真實等級 CMS ${ex.lv}（${ex.inc}）→ 正確額度 ${fmt(CAPS[ex.lv])} 元`), h('pre', { style: { fontSize: '12px', background: '#f4f2ed', padding: '6px 8px', borderRadius: '5px', margin: '6px 0', whiteSpace: 'pre-wrap' } }, ex.str), h('div', null, `原 PDF 寫法 → CMS ${ex.a.cms_level}、額度 ${fmt(ex.a.monthly_budget)} 元${ex.a.err ? '（' + ex.a.err.slice(0, 40) + '…）' : ''}`, h('b', { style: { color: LBL[ex.ja][1] } }, `　${LBL[ex.ja][0]}`)), h('div', null, `修正版 → ${ex.b.monthly_budget == null ? `${ex.b.status}：${ex.b.reason}` : `CMS ${ex.b.estimated_cms_level}、額度 ${fmt(ex.b.monthly_budget)} 元`}`, h('b', { style: { color: LBL[ex.jb][1] } }, `　${LBL[ex.jb][0]}`)))); }
      const wa = cnt('ja', 'wrong'), wb = cnt('jb', 'wrong'), ov = cnt('jb', 'over');
      let msg = `原 PDF 的寫法遇到任何問題都「預設成第 2 級、10,020 元」繼續往下走，${cases.length} 筆裡有 ${wa} 筆（${Math.round(wa / cases.length * 100)}%）給了錯的金額——而且從輸出完全看不出來有錯，家屬拿到的就是一個確定的數字（少數幾筆標「金額正確」，只是真實等級剛好就是第 2 級）。修正版遇到截斷、漏欄位、區間、超出範圍都回「無法判定」並轉人工，錯誤金額 ${wb} 筆。`;
      msg += ov ? ` 代價是有 ${ov} 筆其實可以判讀、卻被轉人工（例如前面多了一句說明文字）——可以再加一道「從文字中抓出 JSON」的清理，但寧可多轉人工，也不要靜靜地給錯。` : ' 這批案例沒有不必要的轉人工。';
      msg += ' 這就是 M9 說的原則：系統不確定時要說不確定。上線前用一批涵蓋各種怪輸出的測試案例跑過一遍，比用手測三個情境可靠得多。';
      out.append(note(msg, wa ? 'warn' : ''));
    }
    box.append(out); draw();
  })();
  /* ====================================================================
     第 12 節：自架 Dify 的版本與安全更新（2026-11-09 新增）
     ==================================================================== */
  (function difyver() {
    const box = $('#w-difyver'); if (!box) return;
    const lab = t => h('span', { style: { fontSize: '13px', color: 'var(--muted)' } }, t);
    const note = msg => h('div', { class: 'note', style: { marginTop: '10px' } }, h('b', null, '看懂了什麼：'), msg);
    const kpi = (k, v, cls) => h('div', null, h('div', { class: 'k' }, k), h('div', { class: 'v' + (cls ? ' ' + cls : '') }, v));
    const R = [[13, '1.13', '2026/2', '新功能', 'Human Input 節點：流程可以停下來等人確認（人在迴路）'],
      [14, '1.14', '2026/4', '安全', '修補 IDOR 等權限問題（能存取不屬於自己的資源）'],
      [15, '1.15', '2026/6', '安全', '修補外掛服務路徑穿越漏洞 CVE-2026-41948；docker-compose 設定檔有變，自訂過的要重新套用'],
      [16, '1.16', '2026/7', '新功能', '支援新版 MCP 協定（2025-06-18）；1.16.1 另有多項安全強化'],
      [17, '1.17', '2026/9', '要處理', '1.17.1 修正匯入時文件內容被悄悄改動——只對新匯入有效，舊文件要重新匯入；API 金鑰可限定單一知識庫'],
      [18, '1.18', '2026/10', '行為改變', 'Agent 輸出路由、Agent 知識庫（Beta）；移除舊 Agent 的 AskHuman 工具，舊表單不能續跑']];
    const TC = { '安全': C.bad, '要處理': '#b7791f', '行為改變': '#b7791f', '新功能': 'var(--muted)' };
    let v = 12; const res = h('div');
    function draw() {
      res.innerHTML = '';
      const L = R.filter(r => r[0] > v), sec = L.filter(r => r[3] === '安全').length, act = L.filter(r => r[3] === '要處理' || r[3] === '行為改變').length;
      res.append(h('div', { class: 'kpi', style: { margin: '10px 0' } }, kpi('落後的版本', L.length + ' 個', L.length > 2 ? 'bad' : L.length ? '' : 'good'), kpi('錯過的安全修補', sec + ' 個', sec ? 'bad' : 'good'), kpi('升級後要手動處理', act + ' 項', act ? 'bad' : 'good')));
      if (!L.length) { res.append(note('已是這個工具涵蓋的最新版 v1.18；官方已出到 v1.19 以上，升級前仍要讀 Release Notes：每一兩個月一個新版本，中間還有多次修補版。')); return; }
      const tb = h('table', { class: 'dt' }, h('tr', null, h('th', null, '版本'), h('th', null, '時間'), h('th', null, '類型'), h('th', null, '內容')));
      L.forEach(r => tb.append(h('tr', null, h('td', { class: 'mono' }, 'v' + r[1]), h('td', null, r[2]), h('td', null, h('b', { style: { color: TC[r[3]] } }, r[3])), h('td', null, r[4]))));
      res.append(tb, note('升級前讀每一版的 Upgrade 段落、備份 .env 與 volumes；用 git checkout 指定版本再 docker compose pull，不要追 main。升完用第 46 頁的三個測試指令重跑' + (L.some(r => r[0] === 17) ? '，並把知識庫文件重新匯入。' : '。') + ' 放病歷或長照評估資料的自架系統，錯過安全修補就是帶著已公開的漏洞上線。'));
    }
    box.append(h('div', { class: 'row' }, lab('你目前的版本：'), seg([[12, 'v1.12 以前'], [13, '1.13'], [14, '1.14'], [15, '1.15'], [16, '1.16'], [17, '1.17'], [18, '1.18']], () => v, x => v = x, draw)), res); draw();
  })();
})();
