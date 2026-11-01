/* M8 互動頁 B：PART 11–20 */
(function () {
  'use strict';
  const { h, $, s, svgBox, rng, seg, slider, check, Store } = U;
  const { cap, row, lbl, nt, ttl, kpi, tok, tbl, pre, box, fmt } = window.M8;
  const TABLE = { 2: 10020, 3: 15460, 4: 18580, 5: 24100, 6: 28070, 7: 32090, 8: 36180 };
  const RE = /第\s*([2-8])\s*級|CMS[^0-9]{0,4}([2-8])|^\s*([2-8])\s*$/;
  const parseLv = t => { const m = RE.exec(t || ''); if (!m) return { amount: 0, level: '無法判定', note: '個案資訊不足，無法判定等級，請洽照管專員' }; const lv = m[1] || m[2] || m[3]; return { amount: TABLE[lv], level: `第 ${lv} 級`, note: '本金額為每月給付上限，實際核定以照管中心評估為準' }; };
  const SP = `# 角色
你是長照服務諮詢助理，服務對象為長照個案家屬與照顧服務員。
# 步驟
1. 先閱讀【參考資料】中召回的段落。
2. 判斷個案描述對應的 CMS 等級（第 2 級至第 8 級）。
3. 說明該等級可申請的服務類別。
4. 給付金額由後續程式節點計算，你「不要」自行寫出任何金額數字。
# 限制
- 【參考資料】沒有提到的內容，一律回答「查無相關資料，建議洽詢當地照管中心」。
- 不得提供醫療診斷、用藥建議。
- 不得自行推估任何金額、比例或天數。
- 個案描述不足以判定等級時，明確列出「還需要知道哪些資訊」，不要猜。
# 格式
依序輸出四段，每段加粗標題：
【判定等級】 【判定理由】 【可申請服務】 【資料來源】
結尾固定加上：本回覆僅供參考，實際給付以照管專員評估結果為準。
【參考資料】
{{#context#}}`;

  // ================= P11 =================
  (function () {
    const CASES = { A: '78 歲女性，中風後右側偏癱，無法自行如廁與沐浴，家屬白天需上班。', B: '老人家最近比較沒力氣。', C: '請問我可以申請國民年金嗎？' };
    const ADL = [['偏癱', '肢體功能'], ['如廁', '如廁'], ['沐浴', '沐浴'], ['臥床', '移位'], ['進食', '進食'], ['輪椅', '行走'], ['失智', '認知'], ['走路', '行走'], ['穿衣', '穿脫衣物']];
    const RED = ['跌倒', '昏倒', '意識', '胸痛', '呼吸困難', '褥瘡'];
    const P = { txt: CASES.A, code: true, bind: true, tpl: true, run: 0 }; const ctl = h('div'), out = h('div'), hist = [];
    const ta = h('textarea', { rows: 2, style: { width: '100%', fontSize: '14.5px', padding: '6px 8px', borderRadius: '8px', border: '1px solid var(--line)' } }); ta.value = P.txt; ta.oninput = () => { P.txt = ta.value; hist.length = 0; };
    ctl.append(row(lbl('測試個案：'), ...Object.keys(CASES).map(k => h('button', { class: 'btn sm', onclick: () => { ta.value = P.txt = CASES[k]; hist.length = 0; go(1); } }, `個案 ${k}`)), h('button', { class: 'btn sm', onclick: () => { ta.value = P.txt = '82 歲男性，失智，長期臥床，需協助進食與穿衣，上週跌倒一次。'; hist.length = 0; go(1); } }, '自訂：含警訊')), ta,
      row(check('程式碼節點有接上', () => P.code, v => { P.code = v; hist.length = 0; }, () => go(1)), check('LLM 上下文綁定「知識檢索/result」', () => P.bind, v => { P.bind = v; hist.length = 0; }, () => go(1)), check('模板引用 code.amount（不是 LLM 的 text）', () => P.tpl, v => { P.tpl = v; hist.length = 0; }, () => go(1))),
      row(h('button', { class: 'btn', onclick: () => go(1) }, '▶ 執行'), h('button', { class: 'btn', onclick: () => go(5) }, '▶ 重複執行 5 次（比對金額）'), h('button', { class: 'btn sm', onclick: () => { hist.length = 0; draw(); } }, '清除紀錄')));
    function sim(txt, seed) {
      const R = rng(seed), hits = ADL.filter(([k]) => txt.includes(k)), red = RED.filter(k => txt.includes(k)), offTopic = /國民年金|勞保|健保卡|退休金/.test(txt);
      const nodes = [];
      nodes.push(['開始', `case_desc = "${txt.slice(0, 28)}${txt.length > 28 ? '…' : ''}"`, 'ok']);
      let ret = [];
      if (!offTopic && hits.length) ret = [['KB1 CMS 量表・ADL 評估項目', .78], ['KB3 給付額度・各等級', .71], ['KB1 失能程度判定說明', .64]].slice(0, Math.min(3, 1 + hits.length));
      else if (!offTopic) ret = [['KB1 CMS 評估流程總說明', .55]];
      nodes.push(['知識檢索', ret.length ? `召回 ${ret.length} 段：` + ret.map(([t, v]) => `${t}（${v}）`).join('；') : '召回 0 段（最高 0.31 < 閾值 0.5）', ret.length ? 'ok' : 'warn']);
      const ctx = P.bind ? ret : [];
      let lv = null, llm;
      if (!ctx.length) {
        if (!P.bind) { lv = 3 + Math.floor(R() * 4); const amt = [18580, 18850, 19580, 21000, 24100][Math.floor(R() * 5)]; llm = `【判定等級】第 ${lv} 級　【判定理由】依描述長者需要相當程度的協助…　【可申請服務】居家服務、日間照顧、喘息服務等，每月約可補助 ${fmt(amt)} 元。（語氣流暢，沒有引用任何來源）`; nodes.push(['LLM', `context 長度 = 0（變數沒綁）→ 自由發揮`, 'bad']); nodes.llmAmt = amt; }
        else { llm = '查無相關資料，建議洽詢當地照管中心。'; nodes.push(['LLM', 'context 長度 = 0 → 依限制回覆「查無相關資料」', 'ok']); }
      } else if (!hits.length) { llm = '【判定等級】無法判定　【還需要知道哪些資訊】① 日常活動（進食、如廁、沐浴、移位）哪些需要協助？② 是否有失智或認知問題？③ 行走與跌倒狀況？④ 目前照顧者是誰？'; nodes.push(['LLM', `context ${fmt(ctx.length * 290)} tokens → 資訊不足，列出缺少項目`, 'ok']); }
      else { lv = Math.min(8, 1 + hits.length + (txt.includes('臥床') ? 1 : 0)); const amt = [TABLE[lv], TABLE[lv] + 270, TABLE[lv] - 80, TABLE[lv] + 1000][Math.floor(R() * 4)]; nodes.llmAmt = amt; llm = `【判定等級】第 ${lv} 級　【判定理由】${hits.map(x => x[1] + '需協助').join('、')}　【可申請服務】居家服務、日間照顧、喘息服務　【資料來源】${ctx.map(x => x[0]).join('、')}`; nodes.push(['LLM', `context ${fmt(ctx.length * 290)} tokens → 判定第 ${lv} 級`, 'ok']); }
      nodes.push(['IF/ELSE', red.length ? `含警訊「${red.join('、')}」→ 高風險分支：最前段紅字＋通報督導` : '不含警訊 → 一般流程', red.length ? 'warn' : 'ok']);
      const code = P.code ? parseLv(llm.match(/【判定等級】([^　]*)/)?.[1] || '') : null;
      nodes.push(['程式碼', P.code ? `cms_level = "${(llm.match(/【判定等級】([^　]*)/)?.[1] || '').trim()}" → return ${JSON.stringify(code)}` : '（節點沒接上，未執行）', P.code ? 'ok' : 'bad']);
      let amount = null, from = '';
      if (P.code && P.tpl) { amount = code.amount || null; from = 'code.amount（查表）'; }
      else if (nodes.llmAmt) { amount = nodes.llmAmt; from = 'LLM 生成的數字'; }
      nodes.push(['模板轉換', P.tpl && P.code ? '引用 {{#程式碼.amount#}}' : '引用 LLM 的 text（數字由 LLM 寫）', P.tpl && P.code ? 'ok' : 'bad']);
      nodes.push(['直接回覆', '輸出給使用者', 'ok']);
      const ans = h('div', null, red.length && lv ? h('div', { style: { color: 'var(--bad)', fontWeight: 700 } }, `⚠ 偵測到警訊（${red.join('、')}）：請立即通知護理師／個管師。`) : '', h('div', null, llm.replace(/，每月約可補助 [\d,]+ 元/, P.tpl && P.code ? '' : '$&')), amount && (P.tpl && P.code || !P.bind || !P.code || !P.tpl) && lv ? h('div', { style: { marginTop: '4px' } }, h('b', null, '【每月給付上限】'), `${fmt(amount)} 元`, lbl(`　← 來源：${from}`)) : '', h('div', { style: { fontSize: '12.5px', color: 'var(--muted)', marginTop: '4px' } }, '本回覆僅供參考，實際給付以照管專員評估結果為準。'));
      return { nodes, ans, amount, lv };
    }
    function go(n) { for (let i = 0; i < n; i++) { P.run++; hist.push(sim(P.txt, P.run * 131 + 7)); } draw(); }
    function draw() {
      out.innerHTML = ''; if (!hist.length) { out.append(nt('按「執行」開始。')); return; }
      const last = hist[hist.length - 1], C = { ok: ['var(--good-soft)', 'var(--good)', '✓'], warn: ['var(--amber-soft)', 'var(--amber)', '!'], bad: ['var(--bad-soft)', 'var(--bad)', '✗'] };
      const tr = h('div', { style: { display: 'grid', gap: '4px' } }, last.nodes.map(([n, d, st], i) => h('div', { style: { display: 'flex', gap: '8px', alignItems: 'flex-start', background: C[st][0], borderLeft: '4px solid ' + C[st][1], borderRadius: '6px', padding: '5px 8px', fontSize: '13.5px' } }, h('b', { style: { minWidth: '92px', color: C[st][1] } }, `${C[st][2]} ${i + 1}. ${n}`), h('span', { style: { wordBreak: 'break-all' } }, d))));
      const amts = hist.slice(-5).map(r => r.amount).filter(v => v != null), kinds = new Set(amts).size;
      out.append(h('div', { class: 'grid2' }, h('div', null, ttl('Tracing（最近一次）'), tr), h('div', null, ttl('使用者看到的回覆'), box('', last.ans, { st: { marginTop: '4px' } }))),
        hist.length > 1 ? h('div', { style: { marginTop: '8px' } }, lbl('最近 5 次的給付金額：'), hist.slice(-5).map(r => tok(r.amount != null ? fmt(r.amount) : '—', { b: true, bg: kinds > 1 ? 'var(--bad-soft)' : 'var(--good-soft)' }))) : '',
        nt(!P.bind ? '變數沒綁 → LLM 收到空 context → 開始自由發揮：答案特別流暢、完全沒引用知識庫內容——看起來像幻覺，其實是接線問題。' : kinds > 1 ? `5 次金額有 ${kinds} 種答案：表示金額仍由 LLM 生成，程式碼節點沒接上或模板沒引用 code.amount。錯的數字看起來跟對的一模一樣。` : last.amount ? `判定${last.lv ? ` 第 ${last.lv} 級` : '等級'}後，金額由程式碼節點查表產出——同樣的等級永遠得到同樣的金額，可稽核、可測試。${hist.length < 5 ? '試試「重複執行 5 次」。' : ''}` : last.nodes[1][2] === 'warn' ? '個案 C：知識庫外 → 回覆「查無相關資料」，沒有回答國民年金。✓' : '個案 B：資訊不足 → 明確列出缺少的評估項目，不給等級。✓', !P.bind || kinds > 1 ? 'bad' : ''));
    }
    $('#w-flow').append(ctl, out); go(1);
  })();
  $('#w-steps').append(tbl(['設定欄位', '本例填入的值', '為什麼'], [['知識庫', 'KB1_CMS 評估標準、KB3_給付額度', '兩份文件性質不同，各自建庫避免互相干擾'], ['檢索模式', '多路召回（Multi-path Retrieval）', '同時查兩個庫，再統一排序'], ['Top K', '5', '太小漏資訊；太大塞爆 context 又拉高成本'], ['Score 閾值', '0.5', '低於此分數的段落不回傳'], ['Rerank 模型', '開啟（bge-reranker-v2-m3）', '召回 20 段再精排取 5 段'], ['查詢變數', '{{#start.case_desc#}}', '綁定開始節點的輸入變數']]),
    nt('常見錯誤：Top K 設成 20 想「保險一點」，結果無關段落淹沒正確段落，答案反而變差。', 'warn'), ttl('Step 3 System Prompt（可直接複製）'), pre(SP),
    tbl(['寫法', '輸出樣態', '問題'], [['只寫「你是長照助理，請回答問題」', '流暢但夾雜舊制資訊，且會自己編金額', '無約束 → 幻覺率最高（教學 01）'], ['加上「# 限制：不要編造」', '編造變少，知識庫沒有的仍會「合理推論」', '否定式指令效力弱，要給替代動作'], ['★ 四段式＋明確替代動作', '知識庫沒有的穩定回覆「查無相關資料」', '格式一致、可稽核（教學 02）']]));

  // ================= P12 =================
  (function () {
    const PY = `def main(cms_level: str) -> dict:
    TABLE = {"2": 10020, "3": 15460, "4": 18580, "5": 24100,
             "6": 28070, "7": 32090, "8": 36180}
    import re
    m = re.search(r"第\\s*([2-8])\\s*級|CMS[^0-9]{0,4}([2-8])|^\\s*([2-8])\\s*$",
                  cms_level or "")
    if not m:
        return {"amount": 0, "level": "無法判定",
                "note": "個案資訊不足，無法判定等級，請洽照管專員"}
    lv = m.group(1) or m.group(2) or m.group(3)
    return {"amount": TABLE[lv], "level": f"第 {lv} 級",
            "note": "本金額為每月給付上限，實際核定以照管中心評估為準"}`;
    let v = '【判定等級】第 4 級'; const out = h('div');
    const inp = h('input', { type: 'text', value: v, style: { width: '100%', fontSize: '14.5px', padding: '6px 8px' } }); inp.oninput = () => { v = inp.value; draw(); };
    const EX = ['【判定等級】第 4 級', 'CMS 4', '4', '依描述約需 3 種協助，屬第 5 級', '應屬四級', '第 9 級', '年齡 78 歲，等級待評估'];
    function draw() { out.innerHTML = ''; const r = parseLv(v), m = RE.exec(v || '');
      out.append(pre('return ' + JSON.stringify(r, null, 2)), nt(!m ? (/[四五六七八二三]級/.test(v) ? '國字「四級」不符合規則 → 無法判定。這就是為什麼 System Prompt 要固定「第 N 級」的格式，或先在程式碼裡做轉換。' : /9/.test(v) ? '第 9 級不在 2–8 範圍 → 無法判定，回傳 amount 0 而不是亂給數字。' : '沒有符合的等級寫法 → 回傳「無法判定」，下游會提示洽照管專員。') : `比對到「${m[0].trim()}」→ 查表 ${fmt(r.amount)} 元。${v.includes('3 種') ? '句中的「3 種」沒有被誤抓——規則只接受「第 N 級」「CMS N」或單獨的數字。' : ''}`, m ? '' : 'warn')); }
    $('#w-code').append(h('div', { class: 'grid2' }, h('div', null, ttl('Python（Dify 程式碼節點）'), pre(PY)), h('div', null, ttl('LLM 輸出的等級文字（cms_level）'), inp, h('div', { style: { margin: '6px 0' } }, EX.map(e => h('button', { class: 'btn sm', style: { margin: '2px' }, onclick: () => { inp.value = v = e; draw(); } }, e))), out)),
      nt('法規調整時只要改 TABLE 這幾行，不用重寫 Prompt 也不用重測全流程。任何「不能算錯」的數值（劑量、金額、天數、分數）都應該離開 LLM。'));
    draw();
  })();
  (function () {
    const B = [['知識檢索', '查詢變數', '開始／case_desc', '知識檢索拿到空字串 → 召回 0 段 → LLM 只能回「查無資料」或自由發揮'], ['LLM', '上下文 Context', '知識檢索／result', 'LLM 收到的 context 長度 = 0 → 答案流暢但完全沒引用知識庫（最常見）'], ['程式碼', '輸入變數 cms_level', 'LLM／text', 'Python 收到空值 → 永遠回傳「無法判定」、amount 0'], ['模板轉換', '引用', '{{#程式碼.amount#}}', '金額改由 LLM 的 text 提供 → 同一題問五次，金額不同']];
    const st = B.map(() => true); const out = h('div');
    function draw() { out.innerHTML = ''; const br = st.indexOf(false);
      out.append(h('div', { class: 'tscroll' }, h('table', { class: 'dt' }, h('tr', null, ['已綁', '節點', '要填的欄位', '綁定來源'].map(c => h('th', null, c))), B.map((b, i) => { const c = h('input', { type: 'checkbox' }); c.checked = st[i]; c.onchange = () => { st[i] = c.checked; draw(); }; return h('tr', null, h('td', null, c), h('td', { style: { fontWeight: 600 } }, b[0]), h('td', null, b[1]), h('td', { class: st[i] ? 'ok' : 'miss', style: { textAlign: 'left' } }, st[i] ? b[2] : '（沒綁）')); }))),
        nt(br < 0 ? '四個綁定都接好：連線決定「順序」，綁定決定「內容」。程式碼 return 的 dict 鍵名就是下游可以引用的變數名——名字打錯就等於沒接。' : `第一個斷點在「${B[br][0]}」：${B[br][3]}。`, br < 0 ? '' : 'bad')); }
    $('#w-bind').append(out); draw();
  })();

  // ================= P13 =================
  (function () {
    const Q = [['① 有召回嗎？', '召回段落數 = 0？'], ['② 召回的對嗎？', '分數是不是都很低？段落對不對？'], ['③ 拿到 context 了嗎？', 'LLM 收到的長度 = 0？'], ['④ 格式／數字', '四段結構亂了？數字從哪來？']];
    const SY = [
      ['回答「查無資料」，但文件裡明明有', [0, '—', '—'], 0, '降低 Score 閾值、加大 Top-K；檢查切塊有沒有把規定切散；確認知識庫已完成索引。'],
      ['答得很篤定，但引用的段落不相關', [5, '0.28–0.34', '1,450'], 1, '開啟 Rerank、提高 Score 閾值；清理知識庫裡的無關文件；法規條號改用混合檢索。'],
      ['召回的段落把答案切成兩半', [5, '0.62–0.71', '1,450'], 1, '調整切塊：改用分隔符切塊、加大重疊字元數（overlap）。'],
      ['回答跟知識庫無關，但講得很順、沒有任何來源', [5, '0.66–0.78', '0'], 2, '★ 變數沒綁定（最常見）：知識檢索／result 要綁到 LLM 的「上下文」欄位，不是貼進 Prompt 文字。'],
      ['回答正確，但格式每次都不同', [5, '0.66–0.78', '1,450'], 3, '加模板轉換節點固定格式，或補 Few-shot 範例——把格式從 LLM 手上拿走。'],
      ['每次問同一題，金額都不一樣', [5, '0.66–0.78', '1,450'], 3, '程式碼節點沒被執行，或輸出沒被下游引用：模板要引用 code.amount，而非 LLM 的 text。'],
    ];
    let si = 3, step = 0; const ctl = h('div'), out = h('div');
    function build() { ctl.innerHTML = ''; ctl.append(h('div', { style: { display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: '8px' } }, SY.map((x, i) => h('button', { class: 'btn sm' + (i === si ? ' on' : ''), onclick: () => { si = i; step = 0; build(); draw(); } }, x[0])))); }
    function draw() {
      out.innerHTML = ''; const [name, [n, sc, cl], fail, rx] = SY[si];
      out.append(kpi(['① 召回段落數', n, n === 0 ? 'bad' : ''], ['② 各段相似度', sc, fail === 1 && si === 1 ? 'bad' : ''], ['③ context 長度', cl, cl === '0' ? 'bad' : '']));
      const g = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '6px', margin: '10px 0' } });
      Q.forEach(([a, b], i) => { const seen = i <= step, bad = seen && i === fail, ok = seen && i < fail;
        g.append(h('div', { style: { border: '2px solid ' + (bad ? 'var(--bad)' : ok ? 'var(--good)' : 'var(--line)'), background: bad ? 'var(--bad-soft)' : ok ? 'var(--good-soft)' : '#fff', borderRadius: '10px', padding: '8px', fontSize: '13.5px', opacity: seen ? 1 : .55 } }, h('b', null, a), h('div', { style: { color: 'var(--muted)' } }, b), seen ? h('div', { style: { marginTop: '4px', fontWeight: 700, color: bad ? 'var(--bad)' : 'var(--good)' } }, bad ? '✗ 問題在這裡' : ok ? '✓ 沒問題，往下' : '') : '')); });
      out.append(g, step < fail ? row(h('button', { class: 'btn', onclick: () => { step++; draw(); } }, '下一格 →'), lbl('一格一格往下問——不要跳過前面直接去改 Prompt。')) : nt(h('span', null, h('b', null, '處方：'), rx), 'warn'));
    }
    build(); $('#w-debug').append(ctl, out); draw();
  })();

  // ================= P14 =================
  (function () {
    const P = { max: 5, desc: true, fail: false, fb: true, seed: 1 }; const ctl = h('div'), out = h('div');
    ctl.append(row(slider('最大迭代次數', 1, 8, 1, () => P.max, v => P.max = v, draw), h('button', { class: 'btn sm', onclick: () => { P.seed++; draw(); } }, '再跑一次')),
      row(check('工具描述寫清楚', () => P.desc, v => P.desc = v, draw), check('Tavily 回傳 503', () => P.fail, v => P.fail = v, draw), check('工具節點有失敗分支', () => P.fb, v => P.fb = v, draw)));
    function draw() {
      out.innerHTML = ''; const R = rng(P.seed * 53), need = 2 + Math.floor(R() * 3), rounds = [], src = []; let stopped = false, silent = false, note = '';
      if (!P.desc) { rounds.push(['我知道肌少症是什麼，直接回答即可。', '（沒有調用任何工具）', '—']); }
      else {
        const PLAN = [['先弄清楚定義', 'Wikipedia', '「肌少症」條目', '定義：與年齡相關的肌肉量與肌力流失'], ['缺台灣本地盛行率', 'Tavily 搜尋', '肌少症 台灣 盛行率', '國健署調查報告摘要'], ['缺診斷常用指標', '知識庫', '衛教手冊・肌少症篩檢', '握力、步行速度、小腿圍'], ['缺運動建議', '知識庫', '衛教手冊・阻力運動', '漸進式阻力運動建議']];
        for (let i = 0; i < Math.min(need, P.max); i++) { const [th, tool, arg, obs] = PLAN[i];
          if (tool === 'Tavily 搜尋' && P.fail) { if (P.fb) { rounds.push([th, `${tool}（${arg}）`, '503 Service Unavailable → 失敗分支：改查內建知識庫', 'warn']); src.push('內建知識庫（非即時）'); note = '⚠ 網路搜尋暫時無法使用，以下盛行率來自內建知識庫，非即時資訊。'; } else { rounds.push([th, `${tool}（${arg}）`, '503 → 沒有失敗分支：流程靜默中斷／用記憶補', 'bad']); silent = true; break; } }
          else { rounds.push([th, `${tool}（${arg}）`, obs]); src.push(tool === 'Wikipedia' ? 'Wikipedia' : tool === '知識庫' ? '衛教手冊' : '國健署調查報告'); } }
        stopped = need > P.max && !silent;
      }
      const list = h('div', { style: { display: 'grid', gap: '6px' } }, rounds.map(([t, c, o, st], i) => h('div', { style: { border: '1px solid ' + (st === 'bad' ? 'var(--bad)' : st === 'warn' ? 'var(--amber)' : 'var(--line)'), borderRadius: '10px', padding: '8px 10px', fontSize: '13.5px', background: st === 'bad' ? 'var(--bad-soft)' : st === 'warn' ? 'var(--amber-soft)' : '#fff' } }, h('b', { class: 'mono' }, `第 ${i + 1} 輪　`), h('span', null, h('b', null, '① Thought：'), t), h('br'), h('span', null, h('b', null, '② Call Tool：'), c), h('br'), h('span', null, h('b', null, '③ Observation：'), o))));
      const fin = !P.desc ? '肌少症是老化導致肌肉流失的疾病，建議多運動、多吃蛋白質。（無來源——全部來自模型內建知識）' : silent ? '（流程中斷，或給出沒有依據的盛行率數字）' : stopped ? '⚠ 已達最大迭代次數，資訊不完整：' + src.join('、') + '。建議洽詢專業人員。' : `${note}肌少症為與年齡相關的肌肉量與肌力流失；篩檢常用握力、步行速度與小腿圍。【資料來源】${src.join('、')}`;
      out.append(list, box('④ 夠了 → Final Answer', fin, { bg: !P.desc || silent ? 'var(--bad-soft)' : stopped ? 'var(--amber-soft)' : 'var(--good-soft)', st: { marginTop: '6px' } }),
        kpi(['迭代輪數', rounds.length], ['Token（約）', fmt(600 + rounds.length * 1300)], ['來源數', P.desc ? src.length : 0, !P.desc || silent ? 'bad' : '']),
        nt(!P.desc ? '工具描述被刪掉或寫得模糊：Agent 完全不調用工具，直接用內建知識回答——這是 Agent 最常見的失敗原因。' : silent ? '429/503 沒有失敗分支：流程會靜默中斷或給出錯誤答案——「邏輯穩定性」20% 的檢查點。' : stopped ? `這次需要 ${need} 輪，但上限只有 ${P.max}——任務未完成時要明確告知使用者。` : `這次跑了 ${rounds.length} 輪；按「再跑一次」，同樣的問題可能是 2 輪也可能是 4 輪。看 Tracing 時每一輪都要讀：它想了什麼、調了哪個工具、拿回什麼。`, !P.desc || silent ? 'bad' : stopped || P.fail ? 'warn' : ''));
    }
    $('#w-loop').append(ctl, out); draw();
  })();
  (function () {
    let t = 'node'; const ctl = h('div'), out = h('div');
    const T = {
      node: [['節點', '做什麼', '什麼時候用'], [['開始 Start', '定義輸入變數', '所有流程的起點'], ['LLM', '呼叫模型生成內容', '判斷、分類、摘要、生成'], ['知識檢索', '從知識庫召回相關段落', 'RAG 的核心節點'], ['條件分支 IF/ELSE', '依變數值走不同路徑', '★ 風險分流、資料完整性檢查'], ['程式碼 Code', '執行 Python／JavaScript', '★ 數值計算、格式驗證、字串處理'], ['Agent', '讓 LLM 自主決定下一步', '任務模糊、需組合多工具時'], ['變數賦值／聚合', '儲存中間結果、合併多分支', '多輪對話的狀態管理'], ['結束／直接回覆', '輸出最終結果', '流程終點']]],
      type: [['Agent 類型', '特徵', '對應 Dify'], [['反射式 Simple Reflex', '只看當下輸入、依規則反應，沒有記憶', '純 Prompt 的 Chatbot'], ['模型式 Model-based', '維護內部狀態，記得發生過什麼', 'Chatflow＋變數記憶'], ['目標式 Goal-based', '有明確目標，會規劃路徑（為了 X 先做 Y）', '多輪對話中收集資訊'], ['效用式 Utility-based', '多個方案時比較效用高低', 'Agent 節點接近「目標＋效用」'], ['學習式 Learning', '從回饋中調整判斷', '需外部回饋機制，Dify 需自建']]],
      tool: [['工具類型', '例子', '注意'], [['搜尋類', 'Google Search、Tavily、DuckDuckGo', '結果品質不穩；需要驗證'], ['知識類', 'Wikipedia、Arxiv', '不含最新或在地資訊'], ['處理類', 'WebScraper、Code Interpreter', '★ 涉及數值計算一律用它'], ['外部 API', '以 OpenAPI 規格接 REST API', '需處理認證與速率限制'], ['MCP 連接器', '檔案系統、資料庫、瀏覽器', 'Dify v1.6（2025.7）起支援雙向 MCP']]],
      mcp: null,
    };
    ctl.append(row(seg([['node', 'Workflow 節點'], ['type', '五種 Agent 類型'], ['tool', '工具類型'], ['mcp', 'MCP']], () => t, v => t = v, draw)));
    function draw() { out.innerHTML = ''; if (t === 'mcp') { out.append(h('div', { class: 'grid3' }, box('MCP 是什麼', 'Model Context Protocol：Anthropic 2024 年提出的開放標準，讓 AI 以統一方式連接資料庫、檔案系統、API、瀏覽器——像 USB 之於周邊裝置。'), box('2025 年起', 'Dify v1.6（2025 年 7 月）起支援雙向 MCP：可當 client 連外部 MCP 伺服器，也可把自己的應用開放為 MCP 服務。生態成熟度不一，導入前先確認維護狀態。'), box('你已經懂它了', '跟本模組的「工具調用」是同一個概念，只是標準化接法。M10 還會再遇到。共同原則：工具描述要寫清楚。')), nt('本課程只要求理解概念，不要求實作 MCP 伺服器；實際可用的連接器以官方文件為準。')); return; } out.append(tbl(T[t][0], T[t][1])); if (t === 'node') out.append(nt('設計原則：能用 Code 節點做的計算就不要交給 LLM。')); if (t === 'tool') out.append(nt('工具描述要寫清楚——LLM 是靠「描述」決定何時調用它。', 'warn')); }
    $('#w-tools').append(ctl, out); draw();
  })();

  // ================= P15 =================
  U.sorter('#w-fallback', [
    ['主模型回傳 429（API 額度用盡）', '失敗分支＋備援', '自動切換供應商——歷屆專題用 Groq 解 429/503。'],
    ['外部 API 改版，回傳格式解析失敗', '失敗分支＋備援', '每個工具節點都配一條失敗分支，不讓流程靜默中斷。'],
    ['網路搜尋工具失效', '退回內建庫並告知', '★ 前端明確標示「目前使用內建法規庫，非即時資訊」。'],
    ['使用者只輸入「老人家最近比較沒力氣」', '反向提問', '附上具引導性的問題清單，不要硬猜。'],
    ['Agent 一直換關鍵詞重查，繞不出來', '最大迭代次數', '設上限（5–10 次），避免無限循環燒 Token。'],
    ['模型拒絕回覆（內容被安全機制攔截）', '轉真人', '加入異常回報節點，引導使用者聯繫真人。'],
    ['知識庫回傳空結果，問題又涉及個案權益', '轉真人', '誠實回「查無相關資料」，並提供照管中心等聯絡管道。'],
  ], ['失敗分支＋備援', '退回內建庫並告知', '反向提問', '最大迭代次數', '轉真人'], '每個會失敗的節點都要有一條失敗分支。');

  // ================= P16 =================
  (function () {
    const OBS = { n: '王奶奶今天午餐吃了半碗，下午在客廳看電視，精神還可以，血壓 128/82。', r: '王奶奶下午從床邊跌倒，叫她時反應比平常慢，右手腕腫，血壓 168/96。' };
    let k = 'n', step = 0; const ck = {}; const ctl = h('div'), out = h('div');
    ctl.append(row(seg([['n', '一般觀察'], ['r', '含高風險徵象']], () => k, v => { k = v; step = 0; for (const x in ck) delete ck[x]; }, draw), h('button', { class: 'btn sm', onclick: () => { step = 0; for (const x in ck) delete ck[x]; draw(); } }, '重來')));
    function isbar() { return k === 'n' ? [['S 現況', '精神可，午餐進食約一半'], ['B 背景', '（依個案檔）'], ['A 評估', '生命徵象在常規範圍；進食量略少'], ['R 建議', '持續觀察進食量，下次訪視追蹤']] : [['S 現況', '下午自床邊跌倒，反應較平常遲緩，右手腕腫脹'], ['B 背景', '（依個案檔）'], ['A 評估', '血壓 168/96 偏高；疑似頭部或腕部受傷'], ['R 建議', '請護理師立即評估；必要時送醫']]; }
    function draw() {
      out.innerHTML = ''; const red = k === 'r', I = isbar(), all = I.every((_, i) => ck[i]);
      const col = (n, who, body, on) => h('div', { style: { border: '2px solid ' + (on ? 'var(--accent)' : 'var(--line)'), borderRadius: '10px', padding: '10px', background: on ? 'var(--accent-soft)' : '#fff', fontSize: '14px' } }, h('div', { class: 'mono', style: { fontSize: '12px', color: 'var(--accent)' } }, n), h('b', null, who), h('div', { style: { marginTop: '6px' } }, body));
      const c1 = h('div', null, h('div', { style: { fontStyle: 'italic' } }, '「' + OBS[k] + '」'), step === 0 ? h('button', { class: 'btn sm', style: { marginTop: '6px' }, onclick: () => { step = 1; draw(); } }, '送給 AI 整理 →') : '', step >= 1 ? h('div', { style: { marginTop: '8px' } }, lbl('逐項核實 AI 草案：'), I.map(([a], i) => { const c = h('input', { type: 'checkbox' }); c.checked = !!ck[i]; c.disabled = step > 1; c.onchange = () => { ck[i] = c.checked; draw(); }; return h('label', { style: { display: 'block', fontSize: '13.5px' } }, c, ' ' + a); }), step === 1 ? h('button', { class: 'btn sm' + (all ? ' on' : ''), disabled: !all, style: { marginTop: '6px' }, onclick: () => { step = 2; draw(); } }, all ? '確認送出 →' : '全部核實後才能送出') : '') : '');
      const c2 = step >= 1 ? h('div', null, red ? h('div', { style: { color: 'var(--bad)', fontWeight: 700 } }, '【即刻處置 Red Flags】跌倒＋意識改變 → 強制保守路徑：立即通報督導') : '', I.map(([a, b]) => h('div', { style: { fontSize: '13.5px' } }, h('b', null, a + '：'), b)), h('div', { style: { fontSize: '12px', color: 'var(--muted)', marginTop: '4px' } }, '僅供參考，最終應由專業人員判斷。')) : lbl('等待輸入…');
      const c3 = step >= 2 ? h('div', null, red ? h('div', { style: { color: 'var(--bad)', fontWeight: 700 } }, '🔴 高風險通報已置頂') : '', '收到預篩後的結構化報告。', h('br'), h('b', null, red ? '決策：立即到宅評估／安排送醫' : '決策：列入例行追蹤'), h('div', { style: { fontSize: '12.5px', color: 'var(--muted)', marginTop: '4px' } }, '回饋分流準確度 → 用於調整閾值與 Prompt')) : lbl('等待送出…');
      out.append(h('div', { class: 'grid3' }, col('前段・第一線人員', '居服員・照服員', c1, step <= 1), col('中段・AI 系統', 'Dify Workflow', c2, step === 1), col('後段・專業督導', '護理師・個管師', c3, step === 2)),
        tbl(['HITL 做法', '怎麼實作', '在這個例子'], [['確認節點', '高風險輸出必須經使用者點擊確認', step >= 1 ? (all || step === 2 ? '✓ 居服員逐項核實後才送出' : '（尚未全部核實）') : '—'], ['強制紅旗欄位', '「即刻處置 Red Flags」置於最前段', red ? '✓ 跌倒＋意識改變置頂' : '本例無警訊'], ['安全降級', '偵測到風險指標，強制走最保守路徑', red ? '✓ 直接通報督導、建議送醫' : '—'], ['固定免責標註', '結尾標註「僅供參考，最終應由專業人員判斷」', '✓']]),
        nt('三個一定要有人的地方：送出前（第一線人員逐項核實）、高風險時（強制紅字並通報督導）、最終決策（必須是有執照的專業人員）。法律與專業責任無法轉嫁給系統。'));
    }
    $('#w-hitl').append(ctl, out); draw();
  })();

  // ================= P17 =================
  (function () {
    const I = [['問題定義與目標對象', '設定一個「複雜任務」情境，不只是回答定義'], ['為何選擇 Agent 模式', '★ 論述為何需要自主行動與工具調用，而不是 Chatbot 或固定 Workflow'], ['系統架構藍圖', 'LLM 選擇與理由、工具清單、System Prompt 草稿、流程圖'], ['風險與限制預想', '失敗模式、Fallback 設計；醫療場域須說明 HITL']];
    const BP = ['節點', '工具', '知識庫', '分支', 'Fallback', '人為確認點'];
    const st = Store.get('m8:prop', {}); const out = h('div');
    function draw() { out.innerHTML = ''; I.forEach(([t, d], i) => { const c = h('input', { type: 'checkbox' }); c.checked = !!st['i' + i]; c.onchange = () => { st['i' + i] = c.checked; Store.set('m8:prop', st); draw(); }; out.append(h('label', { style: { display: 'flex', gap: '10px', padding: '6px 2px', borderBottom: '1px solid var(--line)', fontSize: '14.5px' } }, c, h('span', null, h('b', null, `${i + 1}. ${t}　`), lbl(d)))); });
      const nb = BP.filter((_, i) => st['b' + i]).length;
      out.append(h('div', { style: { marginTop: '8px' } }, lbl('藍圖上標出來了嗎：'), BP.map((b, i) => { const on = !!st['b' + i]; return h('button', { class: 'btn sm' + (on ? ' on' : ''), style: { margin: '2px' }, onclick: () => { st['b' + i] = !on; Store.set('m8:prop', st); draw(); } }, (on ? '✓ ' : '') + b); })),
        nt(nb === 6 ? '六樣都在圖上。最後一個節點永遠是「人為確認」：系統可以擬稿，但送出的責任在人。' : `藍圖還缺 ${6 - nb} 樣——缺一項就會被要求補件。`, nb === 6 ? '' : 'warn')); }
    $('#w-proposal').append(out); draw();
  })();
  (function () {
    const G = [['自主規劃', 30, ['有一個「複雜情境」測試案例', 'Agent 能拆解模糊指令', 'Tracing 顯示多輪 Thought → Call Tool']], ['工具調用', 30, ['實際調用外部工具取得即時資訊', '工具描述寫得具體', '數字來自查表或工具計算，非 LLM 生成']], ['邏輯穩定', 20, ['每個工具節點都有失敗分支', '有 Fallback 且告知使用者', '設了最大迭代次數', '資訊不足時會反向提問']], ['解說完整', 20, ['Tracing 截圖完整', '說明 Prompt 中設了哪些限制', '說明遇到什麼報錯與如何解決', '有實作反思']]];
    const MED = ['有免責標註', '有來源標註', '有人為確認節點', '高風險徵象有強制前置提示'];
    const st = Store.get('m8:rubric', {}); const out = h('div');
    function draw() { out.innerHTML = ''; let tot = 0; const g = h('div', { class: 'grid2' });
      G.forEach(([n, w, items], gi) => { const done = items.filter((_, i) => st[gi + '-' + i]).length, sc = w * done / items.length; tot += sc;
        g.append(box(`${n}（${w}%）　${sc.toFixed(1)} 分`, h('div', null, items.map((t, i) => { const c = h('input', { type: 'checkbox' }); c.checked = !!st[gi + '-' + i]; c.onchange = () => { st[gi + '-' + i] = c.checked; Store.set('m8:rubric', st); draw(); }; return h('label', { style: { display: 'block', fontSize: '14px', padding: '2px 0' } }, c, ' ' + t); })), { bd: done === items.length ? 'var(--good)' : 'var(--line)' })); });
      const md = MED.filter((_, i) => st['m' + i]).length;
      out.append(g, box('醫療／教育場域必要項（不符即扣分）', h('div', null, MED.map((t, i) => { const c = h('input', { type: 'checkbox' }); c.checked = !!st['m' + i]; c.onchange = () => { st['m' + i] = c.checked; Store.set('m8:rubric', st); draw(); }; return h('label', { style: { display: 'inline-block', marginRight: '14px', fontSize: '14px' } }, c, ' ' + t); })), { bd: md === 4 ? 'var(--good)' : 'var(--bad)', st: { marginTop: '10px' } }),
        kpi(['Demo 估分（滿分 100）', tot.toFixed(0), tot >= 80 ? 'good' : tot < 60 ? 'bad' : ''], ['換算學期成績（Demo 20%）', (tot * .2).toFixed(1) + ' / 20'], ['醫療必要項', `${md} / 4`, md === 4 ? 'good' : 'bad']),
        nt('這只是依自我檢核的粗估，實際以老師評分為準。用 Agent 卻說不出「為何非用 Agent 不可」，「自主規劃」那 30% 會被扣。', 'warn')); }
    $('#w-rubric').append(out); draw();
  })();

  // ================= P18 =================
  (function () {
    const E = [['System Prompt 只寫一句「你是助理」', '行為漂移、超出範圍、格式不一致', 'p05'], ['知識庫直接用預設切塊就上線', '表格被切散，關鍵數字召回不到', 'p07'], ['沒做召回測試就開始調 Prompt', '調錯地方——問題在檢索不在生成', 'p13'], ['讓 LLM 計算金額或劑量', '數字幻覺，且看不出來', 'p12'], ['工具節點沒有失敗分支', 'API 掛掉時靜默給出錯誤答案', 'p15'], ['Agent 沒設最大迭代次數', '極端情況下無限循環燒 Token', 'p14'], ['備援啟動時沒告知使用者', '使用者以為是即時資訊，實際是舊的內建知識', 'p15'], ['醫療輸出沒有免責與來源標註', '無法核對、無法究責，臨床不會採用', 'p16']];
    const st = Store.get('m8:err', {}); const out = h('div');
    function draw() { out.innerHTML = ''; E.forEach(([t, d, p], i) => { const c = h('input', { type: 'checkbox' }); c.checked = !!st[i]; c.onchange = () => { st[i] = c.checked; Store.set('m8:err', st); draw(); }; out.append(h('label', { style: { display: 'flex', gap: '10px', padding: '7px 2px', borderBottom: '1px solid var(--line)', fontSize: '14.5px', alignItems: 'baseline' } }, c, h('span', { class: 'mono', style: { color: 'var(--accent)', fontWeight: 700 } }, i + 1), h('span', { style: { flex: 1 } }, h('b', null, t), h('br'), lbl('後果：' + d)), h('a', { href: '#' + p, style: { fontSize: '13px' } }, '回看 →'))); });
      const n = E.filter((_, i) => st[i]).length; out.append(h('div', { class: 'row', style: { marginTop: '8px' } }, h('span', { class: 'tag ' + (n === 8 ? 'good' : 'gray') }, `已避開 ${n} / 8`))); }
    $('#w-err').append(out); draw();
  })();
  (function () {
    const L = [['W13', '教學 01（無約束）／教學 02（四段式）衛教問答', '★ 同一問題、兩種 Prompt 對照'], ['W13', 'AI Chatbot (healthcare)', '基礎 Chatbot＋知識庫'], ['W13', 'Slogan Generator-1 / -2', '變數、輸入欄位與輸出約束對照'], ['W13', 'Company Research', '結構化輸出'], ['W14', 'LTC3.0 Accessment：三個 Chatflow', '★ 同一應用三種模型版本'], ['W14', 'CMS Workflow - case assessment-01', '結構化判定＋知識庫檢索'], ['W14', '自建：長照給付試算 Chatflow（Step 1–7）', '三個測試個案 A/B/C＋重複 5 次'], ['W15', 'Marketing Plan Generator', 'Workflow 對照組：跑兩次比較 Tracing'], ['W15', 'Component-Agent-01 / -02', 'Agent 基礎元件：跑兩次比較 Tracing'], ['W15', '教學 03 健康主題查證 Agent', '★ 工具失敗處理與來源標註；最大迭代改 2'], ['W15', 'Movie Researcher (Wiki) / (Tavily)', '單工具 vs 多工具對照']];
    const st = Store.get('m8:labs', {}); const out = h('div');
    function draw() { out.innerHTML = ''; L.forEach(([w, t, d], i) => { const c = h('input', { type: 'checkbox' }); c.checked = !!st[i]; c.onchange = () => { st[i] = c.checked; Store.set('m8:labs', st); draw(); }; out.append(h('label', { style: { display: 'flex', gap: '10px', padding: '5px 2px', borderBottom: '1px solid var(--line)', fontSize: '14px', alignItems: 'baseline' } }, c, h('span', { class: 'tag gray' }, w), h('span', null, h('b', null, t), '　', lbl(d)))); });
      const n = L.filter((_, i) => st[i]).length; out.append(h('div', { class: 'row', style: { marginTop: '8px' } }, h('span', { class: 'tag ' + (n === L.length ? 'good' : 'gray') }, `完成 ${n} / ${L.length}`), lbl('全部位於「範例/Dify/M8. Dify 應用開發/」。'))); }
    $('#w-labs').append(out); draw();
  })();

  // ================= P19 =================
  (function () {
    const PL = [['Dify', 30, 88, 'LLM 應用平台', 'RAG 知識庫、Prompt 管理、Agent 編排', '外部服務要自己寫 HTTP 節點', 'AI 就是整個應用'], ['n8n', 80, 50, '工作流自動化', '400+ 現成節點、排程與 webhook、自架簡單', 'RAG 要自己組，AI 部分較陽春', 'AI 只是流程中一步'], ['Flowise', 26, 66, 'LangChain 視覺化', '貼近 LangChain 生態、彈性高', '介面較陽春，偏開發者', '已在用 LangChain 想視覺化'], ['Coze／扣子', 45, 42, 'C 端 Bot 平台', '模板與外掛多、上手極快', '客製與資料落地受限', '做面向大眾的聊天機器人'], ['Make／Zapier', 92, 18, 'SaaS 整合', '整合數量最多、幾乎不用學', 'AI 能力最淺、不可自架', '純串接、AI 只做一句摘要'], ['純 LLM API', 10, 14, '自己寫程式', '完全客製', '什麼都要自己刻', 'M10 程式碼路線']];
    let sel = 0; const out = h('div');
    function draw() { out.innerHTML = ''; const W = 560, H = 330, m = { l: 50, r: 16, t: 16, b: 44 }, sv = svgBox(h('div'), W, H), X = v => m.l + v / 100 * (W - m.l - m.r), Y = v => H - m.b - v / 100 * (H - m.t - m.b);
      s('rect', { x: X(60), y: Y(100), width: X(100) - X(60), height: Y(60) - Y(100), fill: 'none', stroke: 'var(--bad)', 'stroke-dasharray': '6 4' }, sv); s('text', { x: X(80), y: Y(80), 'text-anchor': 'middle', 'font-size': 13, style: 'fill:var(--bad)', text: '★ 右上角是空的' }, sv); s('text', { x: X(80), y: Y(80) + 18, 'text-anchor': 'middle', 'font-size': 11.5, style: 'fill:var(--bad)', text: '→ 實務解法：n8n＋Dify' }, sv);
      s('line', { x1: m.l, x2: W - m.r, y1: H - m.b, y2: H - m.b, stroke: '#888' }, sv); s('line', { x1: m.l, x2: m.l, y1: m.t, y2: H - m.b, stroke: '#888' }, sv);
      s('text', { x: (W + m.l) / 2, y: H - 12, 'text-anchor': 'middle', 'font-size': 12, text: '系統整合廣度（連得到多少外部服務）→' }, sv); const yl = s('text', { x: 16, y: (H - m.b + m.t) / 2, 'text-anchor': 'middle', 'font-size': 12, transform: `rotate(-90 16 ${(H - m.b + m.t) / 2})`, text: 'AI 能力深度（RAG・Prompt・Agent）→' }, sv);
      PL.forEach(([n, x, y], i) => { const g = s('g', { style: 'cursor:pointer' }, sv); s('circle', { cx: X(x), cy: Y(y), r: i === sel ? 11 : 8, fill: i === sel ? 'var(--accent)' : '#fff', stroke: 'var(--accent)', 'stroke-width': 2 }, g); s('text', { x: X(x) + 14, y: Y(y) + 4, 'font-size': 13, 'font-weight': i === sel ? 700 : 400, text: n }, g); g.addEventListener('click', () => { sel = i; draw(); }); });
      const p = PL[sel];
      out.append(h('div', { class: 'grid2', style: { alignItems: 'center' } }, cap(sv.parentNode, 560), box(p[0], h('div', null, h('div', null, h('b', null, '出身：'), p[3]), h('div', null, h('b', null, '最強：'), p[4]), h('div', null, h('b', null, '最弱：'), p[5]), h('div', null, h('b', null, '什麼時候選：'), p[6])), { bg: 'var(--accent-soft)' })), lbl('點圖上的平台看定位（位置為示意）。'),
        nt('給期末專題的建議：一律先用 Dify 把流程走通——Debug 與 Tracing 對初學者最友善。Dify 的節點真的表達不出你的邏輯時，才進 M10 的程式碼路線。')); }
    $('#w-land').append(out); draw();
  })();
  U.sorter('#w-role', [
    ['衛教問答機器人＋知識庫', 'Dify', '內建 RAG，半天完成；n8n 要自己接向量庫，兩三天。'],
    ['每天 08:00 抓資料寄報表', 'n8n', '排程節點拉一下就好；AI 只是其中一步。'],
    ['表單提交後 AI 摘要並存檔', 'n8n', 'Webhook＋Sheets 節點現成。'],
    ['多輪對話的個案評估助理', 'Dify', 'Chatflow 直接支援對話歷史；n8n 要自己管 session 狀態。'],
    ['每日讀試算表待處理個案 → 依長照法規判定 → 精確算金額 → 寫回並發 Slack', 'n8n＋Dify', 'n8n 負責觸發、取資料、寫回、通知；Dify 負責檢索、推理與精確計算，中間用 HTTP 呼叫 /v1/workflows/run 連起來。'],
  ], ['Dify', 'n8n', 'n8n＋Dify'], 'Dify 的 API 金鑰存在 n8n 的 Credentials，不要寫死在流程節點裡。');

  // ================= P20 =================
  U.flashcards('#w-cards', [['系統提示詞', 'System Prompt', '設定角色、步驟、限制與輸出格式的底層指令'], ['少樣本提示', 'Few-shot Prompting', '提示中給 2–3 個範例引導輸出格式'], ['幻覺', 'Hallucination', '看似合理但不正確的內容'], ['檢索增強生成', 'RAG', '先檢索文件再生成，可標註來源'], ['切塊', 'Chunking', '把長文件切成可檢索的小段落'], ['重疊', 'Overlap', '相鄰切塊重複的比例，避免切斷語意'], ['嵌入', 'Embedding', '把文字轉成向量'], ['Top-K', 'Top-K', '召回段落的數量上限'], ['相似度閾值', 'Score Threshold', '低於此分數不予召回'], ['重排序', 'Rerank', '對召回結果再精細排序'], ['混合檢索', 'Hybrid Search', '向量檢索＋全文檢索'], ['代理式檢索', 'Agentic RAG', 'Agent 自行判斷是否改寫查詢並重試'], ['代理', 'Agent', '自主規劃並調用工具完成任務'], ['工具調用', 'Tool Calling', '模型依需求呼叫外部功能'], ['最大迭代次數', 'Max Iterations', '限制 Agent 迴圈次數'], ['模型情境協定', 'MCP', '連接 AI 與外部工具的開放標準'], ['對話流', 'Chatflow', '含對話與條件分支的流程'], ['DSL 匯出檔', 'DSL (.yml)', 'Dify 應用的可攜設定檔，不含金鑰'], ['追蹤日誌', 'Tracing', '記錄每一步思考、調用與輸出'], ['備援', 'Fallback', '主要路徑失效時的替代方案'], ['人在迴路', 'Human-in-the-Loop', '關鍵決策點保留人為確認'], ['安全降級', 'Safe Degradation', '偵測到風險時走最保守路徑'], ['來源標註', 'Source Citation', '標明引用段落，供人核對']]);
  U.finalQuiz('#w-final', [
    ['要做「把 200 份出院病摘轉成結構化表格」的工具，選哪種模式？', ['Chatbot', 'Workflow', 'Chatflow', 'Agent'], 1, '不需要對話、路徑固定、要能批次跑。'],
    ['一次 RAG 對話中，哪個部分會隨 Top-K 線性放大？', ['System Prompt', '對話歷史', '召回的知識庫段落', '模型回答'], 2, '講義例子中召回段落佔 53%；Top-K 3 → 10 單次 Token 幾乎翻倍。'],
    ['System Prompt 只寫「不要編造」為什麼效果有限？', ['模型看不懂中文', '否定式指令效力弱，要給明確替代動作', 'Dify 會忽略限制段', '必須寫成英文'], 1, '要寫「查無資料時回答『查無相關資料，建議洽詢…』」這類替代動作。'],
    ['下列哪一項 Prompt 的約束力最弱、必須交給工具？', ['輸出格式', '語氣角色', '數值計算', '拒絕範圍'], 2, 'LLM 心算不可靠——一律用工具查表或計算。'],
    ['切塊 200 字時，「CMS 第 4 級每月給付」與「額度 18,580 元」被切開，最直接的處方是？', ['把 Top-K 開到 20', '改用分隔符切塊或加大重疊', '換更大的模型', '把 Temperature 調低'], 1, '問題在切塊，不在生成。'],
    ['召回測試中，正確段落排在第 9 名（Top-K=5）。先調哪裡？', ['把 Top-K 改 20', '先看切塊，再考慮 Rerank 或閾值', '改 System Prompt', '換嵌入模型以外的 LLM'], 1, 'Top-K 開太大會讓雜訊淹沒正確段落。'],
    ['Top-K 與相似度閾值的關係是？', ['「或」：滿足其一就進 Prompt', '「且」：必須同時過閾值、又排進前 K', '只看 Top-K', '只看閾值'], 1, '兩個參數一起決定哪些段落進 Prompt。'],
    ['答案流暢、完全沒引用知識庫、沒有任何來源。最可能是？', ['模型太強', 'LLM 的上下文變數沒綁定，context 是空的', '閾值太低', '切塊太大'], 1, '看起來像幻覺，其實是接線問題。'],
    ['同一個個案跑 5 次，給付金額有三種答案。代表什麼？', ['模型溫度太高而已', '金額仍由 LLM 生成，程式碼節點沒接上或沒被引用', '知識庫切塊太小', '這是正常現象'], 1, '模板要引用 code.amount，金額才會來自查表。'],
    ['Agent 完全不調用工具，直接用內建知識回答。最可能原因？', ['最大迭代次數太大', '工具描述寫得太模糊，或 Prompt 沒要求必須查證', '知識庫太大', '使用了 Chatflow'], 1, 'LLM 是靠「描述」決定何時調用工具。'],
    ['網路搜尋工具失效、改用內建知識庫時，最重要的是？', ['默默切換，不要打擾使用者', '明確告知使用者「目前使用內建資料，非即時資訊」', '直接報錯結束', '重試 100 次'], 1, '使用者的決策必須建立在知道限制的前提上。'],
    ['期末專題評分中，「為何非用 Agent 不可」說不出理由，會影響哪一項？', ['解說完整度 20%', '邏輯穩定性 20%', '自主規劃能力 30%', '不影響'], 2, '能用 Workflow 解決的就不要用 Agent。'],
  ]);
  (function () {
    const R = [['組裝平台，不是模型', 'Dify 不會讓爛 Prompt 變好。', 'p01'], ['流程由誰決定', '能用 Workflow 就別用 Agent。', 'p02'], ['召回段落最燒錢', '唯一會隨 Top-K 放大的部分。', 'p04'], ['四段式缺一就漂移', '角色、步驟、限制、格式。', 'p05'], ['Prompt 管不住數字', '結構強、數值很弱 → 工具。', 'p06'], ['瓶頸在檢索', 'LLM 只看得到被召回的那幾段。', 'p07'], ['數字不生成', 'LLM 做判斷，程式做計算。', 'p11'], ['先看 Tracing', '召回段數、分數、context 長度。', 'p13'], ['人在迴路', '送出與拍板都在人手上。', 'p16']];
    const g = h('div', { class: 'grid3' }); R.forEach(([t, d, id], i) => g.append(h('a', { href: '#' + id, style: { textDecoration: 'none', color: 'inherit', border: '1px solid var(--line)', borderRadius: '10px', padding: '10px 12px', background: '#fff', display: 'block' } }, h('div', { class: 'mono', style: { color: 'var(--accent)', fontWeight: 700 } }, i + 1), h('b', null, t), h('div', { style: { fontSize: '13.5px', color: 'var(--muted)' } }, d))));
    $('#w-review').append(g, h('div', { class: 'note' }, h('b', null, '下一步：'), '第 16 週期末發表（Dify Agent 專題 Demo）＋ M9 醫療 AI 的責任邊界。', h('a', { href: '../' }, '回到課程首頁 →')));
  })();
})();
