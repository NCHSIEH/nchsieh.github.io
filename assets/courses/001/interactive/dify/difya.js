/* 補充：Dify 實作手冊 互動頁 A：PART 01–08 */
(function () {
  'use strict';
  const { h, $, s, svgBox, rng, seg, slider, check, Store } = U;
  U.initModule('dify');
  const cap = (el, px) => { el.style.maxWidth = px + 'px'; el.style.width = '100%'; el.style.margin = '0 auto'; return el; };
  const row = (...a) => h('div', { class: 'row', style: { marginBottom: '6px' } }, ...a);
  const lbl = t => h('span', { style: { fontSize: '14px', color: 'var(--muted)' } }, t);
  const nt = (t, cls = '') => h('div', { class: 'note ' + cls, style: { fontSize: '14px' } }, t);
  const ttl = t => h('b', { style: { fontSize: '13.5px' } }, t);
  const kpi = (...a) => h('div', { class: 'kpi' }, ...a.map(([k, v, c]) => h('div', null, h('div', { class: 'k' }, k), h('div', { class: 'v ' + (c || '') }, v))));
  const tok = (t, o = {}) => h('span', { style: { display: 'inline-block', margin: '2px', padding: '3px 7px', borderRadius: '6px', fontSize: '14px', background: o.bg || '#eef3f2', fontWeight: o.b ? 700 : 400, color: o.c || 'inherit', fontFamily: o.mono ? 'var(--mono)' : 'inherit' } }, t);
  const tbl = (head, rows) => h('div', { class: 'tscroll' }, h('table', { class: 'dt' }, h('tr', null, head.map(c => h('th', null, c))), rows.map(r => h('tr', null, r.map((v, j) => v instanceof Node ? h('td', null, v) : h('td', { class: typeof v === 'number' ? 'num' : '', style: { fontWeight: j ? 400 : 600 } }, v))))));
  const pre = (t, o = {}) => h('pre', { style: { whiteSpace: 'pre-wrap', background: o.dark ? '#1f2a2b' : '#f6f5f1', color: o.dark ? '#d9e4e2' : 'inherit', border: '1px solid var(--line)', borderRadius: '8px', padding: '10px 12px', fontSize: '12.8px', lineHeight: '1.6', margin: '6px 0', fontFamily: 'var(--mono)' } }, t);
  const box = (title, body, o = {}) => h('div', { style: { border: '1px solid ' + (o.bd || 'var(--line)'), background: o.bg || '#fff', borderRadius: '10px', padding: '10px 12px', fontSize: '14px', ...(o.st || {}) } }, title ? h('div', { style: { fontWeight: 700, marginBottom: '4px', color: o.tc || 'inherit' } }, title) : '', body);
  const ul = items => h('ul', { style: { margin: '4px 0', paddingLeft: '18px' } }, items.map(x => h('li', null, x)));
  const fmt = n => Math.round(n).toLocaleString('en-US');
  const CAPS = { 2: 10020, 3: 15460, 4: 18580, 5: 24100, 6: 28070, 7: 32090, 8: 36180 }, COPAY = { '一般戶': 16, '中低收': 5, '低收': 0 };
  /* 兩種程式碼節點：原 PDF 寫法 vs 修正版 */
  function codeOriginal(str, inc) { let lv = 2, err = ''; try { const d = JSON.parse(str.replace(/```json/g, '').replace(/```/g, '').trim()); lv = d.cms_level === undefined ? 2 : d.cms_level; if (typeof lv === 'string' && /^\d+$/.test(lv)) lv = parseInt(lv, 10); } catch (e) { err = 'JSON Parse Error: ' + e.message; lv = 2; } const b = CAPS[lv] === undefined ? 10020 : CAPS[lv]; return { cms_level: lv, monthly_budget: b, copay_rate: COPAY[inc] ?? 16, err }; }
  function codeFixed(str, inc) { let d; try { d = JSON.parse(str.replace(/```json/g, '').replace(/```/g, '').trim()); } catch (e) { return { status: '無法判定', monthly_budget: null, needs_review: true, reason: 'JSON 解析失敗（可能被截斷）' }; }
    let lv = d.cms_level; if (typeof lv === 'string') { const m = /第\s*([2-8])\s*級|^\s*([2-8])\s*$/.exec(lv); lv = m ? +(m[1] || m[2]) : NaN; }
    if (!Number.isInteger(lv) || lv < 2 || lv > 8) return { status: '無法判定', monthly_budget: null, needs_review: true, reason: `等級值不合法：${JSON.stringify(d.cms_level)}` };
    return { status: 'ok', estimated_cms_level: lv, monthly_budget: CAPS[lv], copay_rate: COPAY[inc] ?? 16, needs_review: false }; }
  const D = window.DIFY = { cap, row, lbl, nt, ttl, kpi, tok, tbl, pre, box, ul, fmt, CAPS, COPAY, codeOriginal, codeFixed };

  // ================= P03 =================
  (function () {
    const G = [['① Docker Desktop', ['Windows 已啟用 WSL2', 'docker version 同時看到 Client 與 Server 版本']], ['② Dify', ['docker compose up -d 後，localhost 進得去、能建應用', '或直接用 dify.ai 雲端版']], ['③ LLM API 金鑰', ['至少一個：Gemini 或 GroqCloud（免費）', '金鑰不寫進任何會交出去的檔案；截圖時注意別拍到']], ['④ 嵌入模型（RAG 必需）', ['★ Groq 沒有嵌入模型——要另外準備一個', '免費路徑：gemini-embedding-001，或 Ollama 本地跑 bge-m3', '付費：text-embedding-3-large（OpenAI）', '上傳一份 txt，知識庫索引完成、檢索得到內容']]];
    const st = Store.get('dify:env', {}); const out = h('div'), total = G.reduce((a, g) => a + g[1].length, 0);
    function draw() { out.innerHTML = ''; let n = 0; const g = h('div', { class: 'grid2' });
      G.forEach(([t, items], gi) => g.append(box(t, h('div', null, items.map((x, i) => { const k = gi + '-' + i, c = h('input', { type: 'checkbox' }); c.checked = !!st[k]; if (st[k]) n++; c.onchange = () => { st[k] = c.checked; Store.set('dify:env', st); draw(); }; return h('label', { style: { display: 'block', fontSize: '14px', padding: '2px 0' } }, c, ' ' + x); })), { bd: gi === 3 ? 'var(--amber)' : 'var(--line)' })));
      out.append(g, row(h('span', { class: 'tag ' + (n === total ? 'good' : 'gray') }, `完成 ${n} / ${total}`), lbl('中文知識庫要選支援多語的嵌入模型。'))); }
    $('#w-env').append(out); draw();
  })();
  (function () {
    const P = { tr: 3000, k: 5, chunk: 600, sp: 700, out: 600 }; const ctl = h('div'), out = h('div');
    ctl.append(row(slider('訪視逐字稿字數', 300, 8000, 100, () => P.tr, v => P.tr = v, draw, fmt), slider('Top-K', 1, 10, 1, () => P.k, v => P.k = v, draw)), row(slider('每段字數', 200, 1200, 50, () => P.chunk, v => P.chunk = v, draw, fmt), slider('每個 LLM 節點輸出 tokens', 200, 1500, 50, () => P.out, v => P.out = v, draw, fmt)));
    function draw() { out.innerHTML = ''; const ret = P.k * P.chunk, llm1 = P.sp + P.tr + ret + P.out, llm2 = P.sp + 400 + ret + P.out, run = llm1 + llm2;
      const perMin = Math.min(30 / 2, 8000 / run), perDay = Math.min(1000 / 2, 200000 / run), over = llm1 > 8000;
      out.append(kpi(['LLM 1 單次（逐字稿＋召回＋提示＋輸出）', fmt(llm1) + ' tokens', over ? 'bad' : ''], ['一次完整評估（兩個 LLM 節點）', fmt(run) + ' tokens'], ['每天約可跑', over ? '0（單次就超限）' : Math.floor(perDay) + ' 份', over ? 'bad' : ''], ['每分鐘約可跑', over ? '0' : perMin.toFixed(1) + ' 份']),
        nt(over ? `LLM 1 單次就要 ${fmt(llm1)} tokens，超過每分鐘 8,000 的上限——請求會被拒。解法：降低 Top-K、縮短逐字稿，或改用付費模型。` : run > 6000 ? '接近每分鐘上限：同一分鐘內只能跑一份，多人同時測會排隊。' : '在免費額度內。手冊估算「一天約 25 份完整訪視評估」，用的是每份約 8,000 tokens 的假設。', over ? 'bad' : run > 6000 ? 'warn' : ''), lbl('試算為粗估：Token 數依模型與文字內容而異；額度會變動，以 Groq 帳號頁面為準。')); }
    $('#w-quota').append(ctl, out); draw();
  })();

  // ================= P04 =================
  (function () {
    const E = [['Ex1', 'Slogan Generator', '文字生成器', 'Prompt＋變數＋Temperature', '同一組變數按兩次，看 Temperature 高低時產出差多少', 'Slogan Generator-1 / -2.yml'], ['Ex2', 'AI Chatbot (healthcare)', 'Chatbot', '★ 對話記憶、開場白、{{Tone}} 變數、掛知識庫', '問一句，再問「我剛才說什麼」——記得才算成功；掛知識庫後回答能標註來源', 'AI Chatbot (healthcare).yml'], ['Ex3', 'Agent', 'Agent', '★ 工具（Tools）與自主性', '跑兩次比較 Tracing：調用的工具與輪數可能不同', 'Component-Agent-01 / -02.yml'], ['Ex4', 'Marketing Plan', 'Workflow', 'Start → LLM → End 的節點串接', '跑兩次比較 Tracing：應該一模一樣', 'Marketing Plan Generator.yml'], ['Ex5', 'Movie Researcher', 'Chatflow（原 PDF）／Agent（M8）', '★ 對話＋工具＋開啟記憶', '匯入後看它實際是哪一種應用型態——以你匯入的 yml 為準', 'Movie Researcher (Wiki) / (Tavily).yml']];
    const st = Store.get('dify:ex', {}); const out = h('div');
    function draw() { out.innerHTML = ''; E.forEach(([c, n, t, k, v, f], i) => { const cb = h('input', { type: 'checkbox' }); cb.checked = !!st[i]; cb.onchange = () => { st[i] = cb.checked; Store.set('dify:ex', st); draw(); }; out.append(h('label', { style: { display: 'grid', gridTemplateColumns: '24px 150px 1fr 1fr', gap: '8px', padding: '8px 2px', borderBottom: '1px solid var(--line)', fontSize: '14px', alignItems: 'start' } }, cb, h('div', null, h('b', null, `${c}　${n}`), h('div', null, tok(t))), h('div', null, k, h('div', { style: { fontSize: '12.5px', color: 'var(--muted)', fontFamily: 'var(--mono)' } }, f)), h('div', { style: { color: 'var(--accent)' } }, '驗證：' + v))); });
      const n = E.filter((_, i) => st[i]).length; out.append(row(h('span', { class: 'tag ' + (n === 5 ? 'good' : 'gray') }, `完成 ${n} / 5`), lbl('範例檔位於「範例/Dify/M8. Dify 應用開發/」（依 M8 講義）。'))); }
    $('#w-ex15').append(out); draw();
  })();

  // ================= P05 =================
  (function () {
    const N = [['入口意圖判斷', 'fast', '只需要判斷「這是哪一類問題」——快、便宜就好'], ['專業法規分析', 'reason', '需要分析深度與邏輯嚴謹性'], ['多份 PDF 報告對比', 'long', '要一次讀入超長文本'], ['產出標準化 JSON 報表', 'stable', '指令遵循最穩、格式最不會跑掉']];
    const O = [['fast', '快速小模型'], ['reason', '推理強的模型'], ['long', '長上下文模型'], ['stable', '指令遵循穩定的模型'], ['free', '免費開源模型（練習）']];
    const pick = N.map(() => 'free'); const ctl = h('div'), out = h('div');
    N.forEach(([n], i) => ctl.append(row(h('b', { style: { width: '150px', fontSize: '14px' } }, n), seg(O, () => pick[i], v => pick[i] = v, draw))));
    function draw() { out.innerHTML = ''; const ok = N.map(([, r], i) => pick[i] === r), n = ok.filter(Boolean).length, waste = pick[0] === 'reason';
      out.append(h('div', null, N.map(([nm, r, why], i) => tok((ok[i] ? '✓ ' : pick[i] === 'free' ? '◎ ' : '△ ') + nm + '：' + (ok[i] ? why : pick[i] === 'free' ? '練習階段可以，正式版再換' : '可以跑，但不是最適合'), { bg: ok[i] ? 'var(--good-soft)' : pick[i] === 'free' ? '#eef3f2' : 'var(--amber-soft)' }))),
        nt(waste ? '入口分流節點用推理強的模型是浪費——它只需要判斷「這是哪一類問題」。' : n === 4 ? '依節點任務挑模型：意圖判斷用快的、法規分析用強的、長文用長上下文、格式輸出用穩的。' : '課堂練習可以全部用免費模型把流程跑通；確認邏輯正確後，再依節點任務換模型。', waste ? 'warn' : ''), lbl('具體型號變動很快，本頁刻意只寫類型。')); }
    $('#w-model').append(ctl, out); draw();
  })();

  // ================= P06 =================
  (function () {
    const P = { t: .2, mt: 400, seed: 1 }; const ctl = h('div'), out = h('div');
    ctl.append(row(slider('Temperature', 0, 1.5, .1, () => P.t, v => P.t = +v.toFixed(1), draw, v => (+v).toFixed(1)), slider('Max Tokens', 50, 600, 10, () => P.mt, v => P.mt = v, draw), h('button', { class: 'btn sm', onclick: () => { P.seed++; draw(); } }, '再跑 5 次')));
    const FULL = '{"cms_level": 8, "adl_score": 5, "cognitive_concern": "時間定向感錯誤，建議專業評估", "major_problems": ["完全臥床", "鼻胃管灌食", "壓瘡風險"], "suggested_needs": ["CA07 復能", "CD02 護理指導", "GA09 居家喘息"]}';
    const NEED = 170;
    function draw() { out.innerHTML = ''; const R = rng(P.seed * 13 + Math.round(P.t * 10)), runs = Array.from({ length: 5 }, () => { const d = Math.round((R() - .5) * 2 * P.t * 2.2); return Math.max(2, Math.min(8, 8 + Math.min(0, d) - (d > 0 ? d : 0))); });
      const kinds = new Set(runs).size, trunc = P.mt < NEED, shown = trunc ? FULL.slice(0, Math.round(FULL.length * P.mt / NEED)) : FULL;
      let ok = true; try { JSON.parse(shown); } catch (e) { ok = false; }
      out.append(h('div', { class: 'grid2', style: { alignItems: 'start' } }, h('div', null, ttl('5 次判定的等級'), h('div', null, runs.map(v => tok(`第 ${v} 級`, { b: true, bg: kinds > 1 ? 'var(--amber-soft)' : 'var(--good-soft)' }))), nt(P.t <= .3 ? (kinds > 1 ? '低溫仍有變動——Prompt 的判斷準則可能寫得不夠清楚。' : '低溫：5 次都一樣，可重現。評估與判定類一律 0–0.3。') : `Temperature ${P.t}：5 次出現 ${kinds} 種等級。同一個個案每次結果不同，就沒辦法稽核。`, P.t <= .3 ? '' : 'warn')),
        h('div', null, ttl(`LLM 1 輸出（需要約 ${NEED} tokens）`), pre(shown + (trunc ? '…（被截斷）' : '')), nt(ok ? '✓ JSON 完整，下游程式碼節點可以解析。' : `✗ Max Tokens ${P.mt} 不夠：JSON 被截斷成不合法的字串，下游程式碼節點解析失敗。建議依輸出格式估算，再留 20% 餘裕（約 ${Math.ceil(NEED * 1.2)}）。`, ok ? '' : 'bad')))); }
    $('#w-temp').append(ctl, out); draw();
  })();

  // ================= P07 =================
  (function () {
    const PRE = [['乾淨的 JSON', '{"cms_level": 8, "adl_score": 5}'], ['加了 ```json 標記', '```json\n{"cms_level": 8, "adl_score": 5}\n```'], ['等級是字串 "8"', '{"cms_level": "8", "adl_score": 5}'], ['被截斷', '{"cms_level": 8, "adl_sc'], ['等級超出範圍 9', '{"cms_level": 9, "adl_score": 5}'], ['等級寫成「第 8 級」', '{"cms_level": "第 8 級", "adl_score": 5}'], ['沒有等級欄位', '{"level": 8, "adl_score": 5}']];
    let txt = PRE[1][1], inc = '低收'; const ctl = h('div'), out = h('div');
    const ta = h('textarea', { rows: 3, style: { width: '100%', fontFamily: 'var(--mono)', fontSize: '13.5px', padding: '6px 8px', borderRadius: '8px', border: '1px solid var(--line)' } }); ta.value = txt; ta.oninput = () => { txt = ta.value; draw(); };
    ctl.append(row(...PRE.map(([n, t]) => h('button', { class: 'btn sm', onclick: () => { ta.value = txt = t; draw(); } }, n))), ta, row(lbl('身分別：'), seg([['一般戶', '一般戶'], ['中低收', '中低收'], ['低收', '低收']], () => inc, v => inc = v, draw)));
    const FIX = `import json, re
CAPS = {2: 10020, 3: 15460, 4: 18580, 5: 24100,
        6: 28070, 7: 32090, 8: 36180}
COPAY = {"低收": 0, "中低收": 5, "一般戶": 16}

def main(llm_result_str: str, income_status: str) -> dict:
    fail = lambda why: {"status": "無法判定", "monthly_budget": None,
                        "needs_review": True, "reason": why}
    s = (llm_result_str or "").replace("\`\`\`json", "").replace("\`\`\`", "").strip()
    try:
        data = json.loads(s)                       # 防呆一：清洗後解析
    except Exception as e:
        return fail(f"JSON 解析失敗：{e}")          # 不給預設等級
    lv = data.get("cms_level")
    if isinstance(lv, str):                        # 防呆二：字串轉整數
        m = re.search(r"第\\s*([2-8])\\s*級|^\\s*([2-8])\\s*$", lv)
        lv = int(m.group(1) or m.group(2)) if m else None
    if not isinstance(lv, int) or not 2 <= lv <= 8: # 防呆三：範圍驗證
        return fail(f"等級值不合法：{data.get('cms_level')!r}")
    return {"status": "ok", "estimated_cms_level": lv,
            "monthly_budget": CAPS[lv],
            "copay_rate": COPAY.get(income_status, 16),
            "needs_review": False}`;
    function draw() { out.innerHTML = ''; const a = codeOriginal(txt, inc), b = codeFixed(txt, inc);
      const silent = !a.err && a.cms_level === 2 && !/"cms_level":\s*2\b/.test(txt) || a.err || CAPS[a.cms_level] === undefined;
      out.append(h('div', { class: 'grid2', style: { alignItems: 'start' } },
        box('原 PDF 寫法的結果', h('div', null, pre(JSON.stringify({ cms_level: a.cms_level, monthly_budget: a.monthly_budget, copay_rate: a.copay_rate }, null, 2)), a.err ? lbl('Tracing 裡只多一行：' + a.err) : '', silent ? nt(`使用者看到的是「每月額度 ${fmt(a.monthly_budget)} 元」，看不出這是退回預設值的結果——等於悄悄少算了給付。`, 'bad') : nt('正常。')), { bd: silent ? 'var(--bad)' : 'var(--line)' }),
        box('修正版的結果', h('div', null, pre(JSON.stringify(b, null, 2)), b.status === 'ok' ? nt(`查表：第 ${b.estimated_cms_level} 級 → ${fmt(b.monthly_budget)} 元；自負額比率 ${b.copay_rate}%。`) : nt('不給金額，標記需人工覆核；下游模板會顯示「無法判定，請洽照管專員」。', 'warn')), { bd: b.status === 'ok' ? 'var(--good)' : 'var(--amber)' })),
        h('details', null, h('summary', { style: { cursor: 'pointer', fontSize: '14px' } }, '看修正版的 Python（可直接貼進 Dify 程式碼節點）'), pre(FIX, { dark: true })),
        nt('兩層都要做：Prompt 明寫「僅輸出 JSON，不要 Markdown 標記」＋程式碼清洗與驗證。只靠 Prompt 不夠——這正是 M8 說的「Prompt 對格式有約束力，但不是保證」。'));
    }
    $('#w-json').append(ctl, out); draw();
  })();

})();
