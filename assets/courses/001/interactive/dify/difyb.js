/* 補充：Dify 實作手冊 互動頁 B */
(function () {
  'use strict';
  const { h, $, s, svgBox, seg, slider, check, Store } = U;
  const { cap, row, lbl, nt, ttl, kpi, tok, tbl, pre, box, ul, fmt, CAPS, COPAY, codeFixed } = window.DIFY;

  // ================= 分隔符切塊 =================
  (function () {
    const DOC = '《CMS 評估標準》（示範文字）\n### CMS 第 4 級\n（第 4 級判定條件，示範用文字從略，約一段的長度。）\n### CMS 第 5 級\nADL 40–60 分／大小便偶有失禁／判定應參照 SPMSQ 錯 3 題以內\n### CMS 第 6 級\n（第 6 級判定條件，示範用文字從略，約一段的長度。）\n### CMS 第 7 級\n（第 7 級判定條件，示範用文字從略。）';
    const P = { mode: 'fixed', size: 60 }; const ctl = h('div'), out = h('div');
    function build() { ctl.innerHTML = ''; ctl.append(row(seg([['fixed', '預設：固定字數切分'], ['sep', '★ 自定義：用分隔符 ### 切']], () => P.mode, v => P.mode = v, () => { build(); draw(); }), P.mode === 'fixed' ? slider('每段字數（縮小比例）', 30, 160, 5, () => P.size, v => P.size = v, draw) : '')); }
    function draw() { out.innerHTML = ''; let C;
      if (P.mode === 'sep') C = DOC.split(/(?=### )/).map(x => x.trim()).filter(Boolean);
      else { C = []; for (let i = 0; i < DOC.length; i += P.size) C.push(DOC.slice(i, i + P.size)); }
      const L5 = C.findIndex(c => c.includes('ADL 40–60')), intact = L5 >= 0 && C[L5].includes('SPMSQ') && C[L5].includes('第 5 級');
      const list = h('div', { style: { display: 'grid', gap: '6px', margin: '8px 0' } }, C.map((c, i) => { const has = c.includes('第 5 級') || c.includes('ADL 40–60') || c.includes('SPMSQ'); return h('div', { style: { border: '1.5px solid ' + (has ? (intact ? 'var(--good)' : 'var(--bad)') : '#d8d4ca'), background: has ? (intact ? 'var(--good-soft)' : 'var(--bad-soft)') : '#fff', borderRadius: '8px', padding: '6px 10px', fontSize: '13px', whiteSpace: 'pre-wrap' } }, h('div', { class: 'mono', style: { fontSize: '11px', color: 'var(--muted)' } }, `區塊 ${i + 1}`), c); }));
      out.append(kpi(['切出區塊', C.length], ['第 5 級判定條件', intact ? '完整在同一塊' : '被切開', intact ? 'good' : 'bad']), list,
        nt(intact ? (P.mode === 'sep' ? '一個評估項目＝一個區塊：語義完整，檢索到就是完整的判定條件。' : '這個切法剛好沒切到——但換一份文件、改一個字數，就可能切斷。用分隔符才是可靠的做法。') : '判定條件被切成兩半：檢索到前一塊時，看不到「SPMSQ 錯 3 題以內」那一條，AI 無法把兩者關聯起來。', intact ? '' : 'bad'),
        tbl(['設定', '手冊建議（長照 CMS 知識庫）', '說明'], [['分段', 'Custom，分隔符 ###', '一條判定標準＝一個區塊'], ['分段最大長度', '1024 字元', '一條標準不超過這個長度即可'], ['重疊', '50 字元', '用 ### 分段時，每塊本來就是完整一條，重疊影響小；固定字數切分時才需要 M8 建議的 10–20%'], ['索引方式', '★ 高品質 High Quality', '經濟模式只做關鍵字比對，搜「無法走路」找不到「平地走動 0 分」'], ['檢索模式', '★ 混合檢索', '見下一節']])); }
    build(); $('#w-sep').append(ctl, out); draw();
  })();

  // ================= 混合檢索 =================
  (function () {
    const Q = [['「林陳阿公的 CMS 等級是多少？」', '人名', .41, .95, '向量檢索對人名不敏感；全文檢索精確命中。'], ['「BA07 可以用嗎？」', '代碼', .38, .97, '代碼只有全文檢索抓得準——不開混合檢索，AI 容易產生幻覺。'], ['「阿公沒辦法走路」', '近義詞', .78, 0, '文件寫的是「平地走動 0 分」：關鍵字完全對不上，只有向量檢索懂語意。']];
    let w = .7, th = .5; const ctl = h('div'), out = h('div');
    ctl.append(row(slider('混合檢索的語意權重（關鍵字權重＝1－此值）', 0, 1, .05, () => w, v => w = +v.toFixed(2), draw, v => (+v).toFixed(2)), slider('閾值', .2, .8, .05, () => th, v => th = +v.toFixed(2), draw, v => (+v).toFixed(2))));
    function draw() { out.innerHTML = ''; const hit = v => v >= th;
      out.append(h('div', { class: 'tscroll' }, h('table', { class: 'dt' }, h('tr', null, ['問題', '類型', '向量', '全文', `混合（${w.toFixed(2)}／${(1 - w).toFixed(2)}）`].map(c => h('th', null, c))), Q.map(([q, t, v, k]) => { const m = w * v + (1 - w) * k; return h('tr', null, h('td', { style: { fontWeight: 600 } }, q), h('td', null, t), ...[v, k, m].map(x => h('td', { class: hit(x) ? 'ok' : 'miss', style: { textAlign: 'left', fontWeight: 400 } }, `${x.toFixed(2)} ${hit(x) ? '✓ 命中' : '✗'}`))); }))),
        h('div', null, Q.map(([q, , , , why]) => h('div', { style: { fontSize: '13.5px', margin: '2px 0' } }, h('b', null, q + '：'), why))),
        nt(`手冊的例子「向量 0.62＋全文 0.91 → 混合 0.79」：以目前權重算是 ${(w * .62 + (1 - w) * .91).toFixed(2)}。用 0.7／0.3 算是 0.71、0.5／0.5 算是 0.77；要得到 0.79，權重得偏向關鍵字（約 0.41／0.59）。原圖沒寫權重——寫分數時一定要連權重一起寫。`, 'warn'),
        lbl('分數為示意；Dify 的混合檢索權重可在知識庫檢索設定中調整，以你使用的版本為準。若已達成「一個區塊＝一份完整文件」，Top-K 可以設很小以省 Token——但三個知識庫同掛時，仍建議依 M8 用 Top-K 5＋Rerank。')); }
    $('#w-hybrid').append(ctl, out); draw();
  })();

  // ================= 四層架構 =================
  (function () {
    const L = [['① Input Layer 輸入層', ['transcript：訪視錄音轉文字（段落 Paragraph）', 'has_foreign_caregiver：外籍看護 Yes／No（下拉選項）', 'income_status：一般戶／中低收／低收（下拉選項）', '★ 會改變規則的變數做成表單，不讓 AI 從逐字稿裡猜']], ['② Data Layer 知識庫層', ['KB1 CMS 評估標準：Custom ### 分段＋高品質＋混合檢索', 'KB2 給付及支付基準（CSV，含 A~F 碼、價格、AI 邏輯引導欄）：通用或自動分段（讀 Header）；預覽確認「AI 邏輯引導」欄有被包含', 'KB3 額度上限表：Custom ### 分段＋高品質', '★ 本頁統一採 M8 的召回設定：Top-K 5、閾值 0.5、開啟 Rerank（原 PDF 為 Top-K 6–8）']], ['③ Logic Layer 推理層', ['LLM 1 評估：訪視文字 → 結構化 JSON（預估等級、ADL、認知功能疑慮）', 'Code 精算：清洗＋驗證＋查表算額度；無法判定時不給金額、轉人工覆核', 'LLM 2 規劃：媒合服務代碼、檢查外籍看護排他條款與預算分包']], ['④ Output Layer 呈現層', ['節點 6 模板：組合各節點結果，固定段落＋資料來源＋免責聲明', '節點 7 ★ 人為確認：照管專員／個管師核對後才送出（本頁補上）', '節點 8 回答：結構化 Markdown 報告']]];
    let k = 2; const out = h('div');
    function draw() { out.innerHTML = ''; const sv = svgBox(h('div'), 720, 210);
      L.forEach(([t], i) => { const y = 8 + i * 50, on = i === k, g = s('g', { style: 'cursor:pointer' }, sv); s('rect', { x: 10, y, width: 700, height: 42, rx: 8, fill: on ? 'var(--accent)' : i === 2 ? '#f1ecf9' : '#fff', stroke: '#2a7f78', 'stroke-width': 1.5 }, g); s('text', { x: 24, y: y + 26, 'font-size': 14, 'font-weight': 700, style: 'fill:' + (on ? '#fff' : '#222'), text: t }, g);
        if (i === 2) ['LLM 1 判斷', 'Code 計算', 'LLM 2 媒合'].forEach((n, j) => { s('rect', { x: 300 + j * 135, y: y + 8, width: 120, height: 26, rx: 6, fill: '#fff', stroke: '#7a6fb0' }, g); s('text', { x: 360 + j * 135, y: y + 26, 'text-anchor': 'middle', 'font-size': 12.5, text: n }, g); });
        g.addEventListener('click', () => { k = i; draw(); }); });
      out.append(cap(sv.parentNode, 720), box(L[k][0], ul(L[k][1]), { bg: 'var(--accent-soft)' }), nt('第 ③ 層把任務拆開：「評估病況」與「計算預算」的邏輯差異很大，強迫同一個 AI 一次做完很容易出錯——拆給不同節點，精準度大幅提升。')); }
    $('#w-arch').append(out); draw();
  })();

  // ================= 七節點模擬 =================
  (function () {
    const SC = {
      A: ['A 標準：重度失能＋外籍看護', '「今天是幾號？」「過年了嗎？」插鼻胃管灌牛奶；連翻身都沒辦法自己翻；Wati 力氣太小只能擦澡；大小便都是尿布。女兒問：「可不可以申請居服員來幫阿公洗澡？」', '請根據訪視紀錄，產出符合預算的計畫。', 'full', ['bath']],
      B: ['B 壓力測試：堅持排 BA05', '（同 A 的訪視內容）', '家屬堅持要有居服員來家裡煮飯（BA05 餐食照顧），請盡量排進去。', 'full', ['bath', 'cook']],
      C: ['C 極簡指令', '（同 A 的訪視內容）', '開始評估。', 'full', ['bath']],
      D: ['D 資訊不足', '老人家最近比較沒力氣。', '請評估。', 'short', []],
      E: ['E 知識庫外', '請問我可以申請國民年金嗎？', '請回答。', 'out', []],
    };
    const P = { sc: 'A', fc: 'Yes', inc: '一般戶', variant: 'ok', confirmed: false, ran: false }; const ctl = h('div'), out = h('div');
    function build() { ctl.innerHTML = ''; ctl.append(row(seg(Object.keys(SC).map(k => [k, SC[k][0]]), () => P.sc, v => { P.sc = v; P.ran = false; P.confirmed = false; }, () => { build(); draw(); })),
      row(lbl('外籍看護：'), seg([['Yes', 'Yes'], ['No', 'No']], () => P.fc, v => { P.fc = v; P.ran = false; P.confirmed = false; }, draw), lbl('　身分別：'), seg([['一般戶', '一般戶'], ['中低收', '中低收'], ['低收', '低收']], () => P.inc, v => { P.inc = v; P.ran = false; P.confirmed = false; }, draw)),
      row(lbl('LLM 1 這次的輸出：'), seg([['ok', '正常 JSON'], ['fence', '加了 ```json'], ['trunc', '被截斷']], () => P.variant, v => { P.variant = v; P.ran = false; P.confirmed = false; }, draw), h('button', { class: 'btn primary', onclick: () => { P.ran = true; P.confirmed = false; draw(); } }, '▶ 執行'))); }
    function draw() { out.innerHTML = ''; const [name, tr, q, kind, req] = SC[P.sc];
      out.append(box('節點 1 開始：表單與輸入', h('div', null, h('div', null, h('b', null, 'transcript：'), tr), h('div', null, h('b', null, 'has_foreign_caregiver：'), P.fc, '　', h('b', null, 'income_status：'), P.inc), h('div', null, h('b', null, 'sys.query：'), q)), { bg: '#fbfaf6' }));
      if (!P.ran) { out.append(lbl('按「執行」看每個節點的輸出。')); return; }
      const T = []; const add = (n, d, st) => T.push([n, d, st]);
      if (kind === 'out') add('節點 2 知識庫檢索', '三個知識庫召回 0 段（最高分 0.28 < 閾值 0.5）', 'warn');
      else add('節點 2 知識庫檢索', kind === 'short' ? 'KB1 召回 1 段（CMS 評估流程總說明，0.55）' : 'KB1 召回 3 段（ADL／SPMSQ 判定）、KB2 召回 4 段（BA／CA／CD／GA 碼與 AI 邏輯引導欄）、KB3 召回 1 段（額度上限表）', 'ok');
      let llm1;
      if (kind === 'out') llm1 = '{"out_of_scope": true, "message": "查無相關資料，建議洽詢當地照管中心"}';
      else if (kind === 'short') llm1 = '{"cms_level": null, "missing_info": ["進食、移位、如廁、沐浴各需要多少協助", "是否有失智或認知問題", "行走與跌倒狀況", "目前主要照顧者"]}';
      else llm1 = '{"cms_level": 8, "adl_score": 5, "cognitive_concern": "時間定向感錯誤，建議專業評估", "major_problems": ["完全臥床", "鼻胃管灌食", "壓瘡風險"], "suggested_needs": ["復能", "護理指導", "喘息", "沐浴"]}';
      if (kind === 'full' && P.variant === 'fence') llm1 = '```json\n' + llm1 + '\n```';
      if (kind === 'full' && P.variant === 'trunc') llm1 = llm1.slice(0, 60);
      add('節點 3 LLM 1 評估', llm1, kind === 'full' && P.variant !== 'ok' ? 'warn' : 'ok');
      const oos = kind === 'out';
      const code = oos ? { status: '範圍外', monthly_budget: null, needs_review: false } : codeFixed(llm1, P.inc);
      add('節點 4 Code 精算', JSON.stringify(code), code.status === 'ok' ? 'ok' : 'warn');
      let plan = [], refused = [];
      if (code.status === 'ok') {
        plan.push(['CA07 IADLs 復能、ADLs 復能照護', '第一包（照顧及專業服務）', '★ 依政策取向優先安排復能']);
        plan.push(['CD02 居家護理指導與諮詢', '第一包（照顧及專業服務）', '壓瘡風險、管路照護']);
        if (req.includes('bath')) { if (P.fc === 'Yes') { refused.push('BA07 協助沐浴及洗頭：有外籍看護 → 依排他條款禁用'); plan.push(['BA09／BA09a 到宅沐浴車服務', '第一包（照顧及專業服務）', '★ 替代 BA07，滿足洗澡需求（依手冊規則）']); } else plan.push(['BA07 協助沐浴及洗頭', '第一包（照顧及專業服務）', '家屬要求的洗澡協助']); }
        if (req.includes('cook')) { if (P.fc === 'Yes') refused.push('BA05 餐食照顧：有外籍看護 → 依排他條款不予安排，並向家屬說明原因'); else plan.push(['BA05 餐食照顧', '第一包（照顧及專業服務）', '家屬要求；需在第一包額度內']); }
        plan.push(['GA09 居家喘息服務', '第四包（喘息服務）', '外籍看護休假時的替代照顧；不計入第一包月額度']);
      }
      add('節點 5 LLM 2 規劃', code.status === 'ok' ? `媒合 ${plan.length} 項服務${refused.length ? `；拒絕 ${refused.length} 項並說明` : ''}（只用節點 4 算好的額度，不自行產生任何金額）` : code.status === '範圍外' ? '不規劃' : '等級無法判定 → 不排計畫，列出需要補充的資訊', code.status === 'ok' ? 'ok' : 'warn');
      add('節點 6 模板', '固定段落：預估等級／額度與自負額／建議服務（含包別）／未能安排的項目／資料來源／免責聲明', 'ok');
      add('節點 7 人為確認', P.confirmed ? '照管專員已核對 → 送出' : '等待照管專員／個管師核對（草稿）', P.confirmed ? 'ok' : 'warn');
      const C = { ok: ['var(--good-soft)', 'var(--good)', '✓'], warn: ['var(--amber-soft)', 'var(--amber)', '!'] };
      out.append(h('div', { style: { display: 'grid', gap: '4px', margin: '8px 0' } }, T.map(([n, d, st]) => h('div', { style: { display: 'flex', gap: '8px', background: C[st][0], borderLeft: '4px solid ' + C[st][1], borderRadius: '6px', padding: '5px 8px', fontSize: '13px' } }, h('b', { style: { minWidth: '128px', color: C[st][1] } }, `${C[st][2]} ${n}`), h('span', { style: { wordBreak: 'break-all', fontFamily: n.includes('LLM 1') || n.includes('Code') ? 'var(--mono)' : 'inherit' } }, d)))));
      // 報告
      const rep = h('div');
      if (code.status === '範圍外') rep.append(h('div', null, '查無相關資料，建議洽詢當地照管中心。'));
      else if (code.status !== 'ok') rep.append(h('div', { style: { color: 'var(--amber)', fontWeight: 700 } }, '【預估等級】無法判定，請洽照管專員評估'), h('div', null, '【需要補充的資訊】'), ul(kind === 'short' ? ['進食、移位、如廁、沐浴各需要多少協助', '是否有失智或認知問題', '行走與跌倒狀況', '目前主要照顧者'] : ['系統未能取得完整的評估結果（' + (code.reason || '') + '），已轉人工覆核']));
      else { const budget = code.monthly_budget, cp = Math.round(budget * code.copay_rate / 100);
        rep.append(h('div', null, h('b', null, '【預估等級】'), `CMS 第 ${code.estimated_cms_level} 級（預估，正式等級以照管專員評估為準）`), h('div', null, h('b', null, '【照顧及專業服務月額度上限】'), `${fmt(budget)} 元；自負額比率 ${code.copay_rate}%（額度用滿時民眾自付上限約 ${fmt(cp)} 元）`), h('div', null, h('b', null, '【建議服務】')), tbl(['服務', '包別', '理由'], plan),
          refused.length ? h('div', { style: { color: 'var(--bad)', marginTop: '4px' } }, h('b', null, '【未能安排】'), ul(refused)) : '', h('div', { style: { fontSize: '12.5px', color: 'var(--muted)' } }, '【資料來源】KB1 CMS 評估標準、KB2 給付及支付基準、KB3 額度上限表；各碼支付價格依 KB2 查表。'));
      }
      rep.append(h('div', { style: { fontSize: '12.5px', color: 'var(--muted)', marginTop: '6px' } }, '本建議僅供參考，實際等級與給付以照管專員評估及核定結果為準。'));
      const cb = h('input', { type: 'checkbox' }); cb.checked = P.confirmed; cb.onchange = () => { P.confirmed = cb.checked; draw(); };
      out.append(box(P.confirmed ? '節點 8 回答（已送出）' : '節點 8 回答（草稿，尚未送出）', rep, { bg: P.confirmed ? '#fff' : '#fbfaf6', bd: P.confirmed ? 'var(--good)' : 'var(--amber)' }), h('label', { style: { display: 'block', margin: '6px 0', fontSize: '14px' } }, cb, ' 我是照管專員／個管師，已逐項核對，確認送出'),
        nt(P.sc === 'B' && P.fc === 'Yes' ? '壓力測試通過：系統拒絕了不合理的要求並說明理由，而不是照單全收。' : P.sc === 'D' ? '資訊不足時追問，而不是硬猜等級。' : P.sc === 'E' ? '知識庫外：回覆「查無相關資料」，沒有回答國民年金。' : kind === 'full' && P.variant === 'trunc' ? 'LLM 1 的 JSON 被截斷：修正版程式碼不給預設等級，轉人工覆核——原 PDF 的寫法會默默給第 2 級、10,020 元。' : kind === 'full' && P.variant === 'fence' ? '模型加了 ```json：程式碼節點清洗後照常解析。' : '額度上限這個數字，從頭到尾沒有經過任何一個 LLM。', P.variant === 'trunc' && kind === 'full' ? 'warn' : ''));
    }
    build(); $('#w-flow').append(ctl, out); draw();
  })();

  // ================= 外籍看護排他條款 =================
  (function () {
    const R = [['bath', '「居服員來幫阿公洗澡」', 'BA07 協助沐浴及洗頭', false, '改推 BA09／BA09a 到宅沐浴車服務，或 CA07 復能、CD02 護理指導（依手冊規則）'], ['cook', '「居服員來家裡煮飯」', 'BA05 餐食照顧', false, '依排他條款不予安排，並向家屬說明原因'], ['rehab', '「有人教我們怎麼抱他下床」', 'CA07 IADLs 復能、ADLs 復能照護', true, ''], ['nurse', '「怎麼照顧鼻胃管、預防壓瘡」', 'CD02 居家護理指導與諮詢', true, ''], ['respite', '「外勞休假那幾天怎麼辦」', 'GA09 居家喘息服務', true, '']];
    let fc = 'Yes', k = 'bath'; const ctl = h('div'), out = h('div');
    ctl.append(row(lbl('has_foreign_caregiver ='), seg([['Yes', 'Yes（有外籍看護）'], ['No', 'No']], () => fc, v => fc = v, draw)), row(lbl('家屬說：'), seg(R.map(r => [r[0], r[1]]), () => k, v => k = v, draw)));
    function draw() { out.innerHTML = ''; const [, said, code, okWithFc, alt] = R.find(r => r[0] === k), ok = fc === 'No' || okWithFc;
      out.append(box(`${code}：${ok ? '○ 可用' : '× 禁用'}`, h('div', null, fc === 'Yes' && !okWithFc ? h('div', null, '檢查 CSV 的 Foreign_Caregiver_Allowed 欄 = No → 剔除。', h('br'), h('b', null, '但需求還是要被滿足：'), alt) : fc === 'Yes' ? 'Foreign_Caregiver_Allowed = Yes → 可以媒合。' : '無外籍看護：不必檢查排他欄位，依需求媒合即可（照顧服務 B 碼計入第一包月額度）。'), { bg: ok ? 'var(--good-soft)' : 'var(--bad-soft)', bd: ok ? 'var(--good)' : 'var(--bad)' }),
        pre('# LLM 2 System Prompt 片段（The Iron Rule）\n若 has_foreign_caregiver = Yes：\n  1. 檢查【給付基準】中每個服務的 Foreign_Caregiver_Allowed 欄位。\n  2. 標示 No 者一律不得排入計畫（手冊所列例外：BA09 到宅沐浴車）。\n  3. 被剔除的需求，必須改推替代服務；沒有替代時，向使用者說明原因。\n  4. 不得自行寫出任何價格；金額只使用節點 4 提供的數值。'),
        nt('規則要看得見、可稽核，而不是期待模型自己記得。這條規則寫在 LLM 2 的 System Prompt 裡；判斷依據來自 KB2 的 CSV 欄位。')); }
    $('#w-iron').append(ctl, out); draw();
  })();

  // ================= 找出真實的失敗 =================
  (function () {
    const SP = [['t1', 'CMS 等級：8', 1], ['t2', '個案無法自行吃飯、移位、如廁', 0], ['t3', '訪視中提到時間定向感錯誤', 2], ['t4', '因為有外籍看護（Wati），不能用 BA07', 0], ['t5', '居服員幫阿公洗澡：費用約 500–1000 台幣／次', 3], ['t6', '復健師教如何抱他下床坐輪椅：費用約 1000–2000 台幣／次', 3], ['j1', '"cms_level": 6', 1], ['j2', '"adl_score": 60', 0], ['j3', '"is_dementia": false', 2]];
    const EX = { 1: '① 文字與 JSON 不一致：文字說第 8 級，同一次執行的 JSON 卻寫 6。處方：只信 JSON，用程式碼節點解析，不要讓人去讀文字那段；兩者不合就標示「需人工覆核」。', 2: '② 欄位互相矛盾：文字提到定向感錯誤，JSON 卻寫 is_dementia: false。處方：加一致性檢查。更根本的是——不該讓 LLM 輸出「是否失智」這種診斷欄位，本頁改成「認知功能疑慮（需專業評估）」。', 3: '③ 自行編造價格：這些數字知識庫裡沒有，是模型生成出來的——正是 M7「數字是生成的，不是算的」。處方：金額一律由程式碼節點查表，Prompt 明令禁止生成數字。' };
    const sel = new Set(); let show = false; const out = h('div');
    function draw() { out.innerHTML = ''; const span = ([id, t, e]) => { const on = sel.has(id), b = h('span', { style: { cursor: 'pointer', padding: '1px 4px', borderRadius: '4px', background: show ? (e ? 'var(--bad-soft)' : on ? '#eee' : 'transparent') : on ? '#ffe08a' : 'transparent', border: '1px dashed ' + (show && e ? 'var(--bad)' : '#bbb') } }, t); b.onclick = () => { on ? sel.delete(id) : sel.add(id); draw(); }; return b; };
      const g = id => SP.find(x => x[0] === id);
      out.append(h('div', { class: 'grid2', style: { alignItems: 'start' } },
        box('AI 的文字輸出', h('div', { style: { lineHeight: 2 } }, span(g('t1')), h('br'), '・', span(g('t2')), h('br'), '・需要長期照護，有多個照護需求', h('br'), '・', span(g('t3')), h('br'), '・', span(g('t4')), h('br'), '・', span(g('t5')), h('br'), '・', span(g('t6')))),
        box('同一次執行的 JSON 輸出', h('div', { style: { fontFamily: 'var(--mono)', fontSize: '13px', lineHeight: 2 } }, '{', h('br'), '  ', span(g('j1')), ',', h('br'), '  ', span(g('j2')), ',', h('br'), '  ', span(g('j3')), ',', h('br'), '  "major_problems": [ … ]', h('br'), '}'))),
        row(h('button', { class: 'btn', onclick: () => { show = !show; draw(); } }, show ? '隱藏答案' : '顯示答案'), lbl(`你標了 ${sel.size} 處。點文字標記你覺得有問題的地方。`)));
      if (show) { const errIds = SP.filter(x => x[2]).map(x => x[0]), hit = errIds.filter(id => sel.has(id)).length, fp = [...sel].filter(id => !errIds.includes(id)).length;
        out.append(kpi(['標中的錯誤片段', `${hit} / ${errIds.length}`, hit === errIds.length ? 'good' : ''], ['誤標（其實沒錯）', fp, fp ? 'bad' : 'good']), ...[1, 2, 3].map(i => nt(EX[i], 'bad')), nt('「因為有外籍看護，不能用 BA07」與「無法自行吃飯、移位、如廁」是對的。另外 adl_score: 60 也跟「完全依賴」的描述不搭——你看出來了嗎？這就是「逐項檢查」的意思。')); }
      out.append(nt('原教材沒有把這次失敗藏起來，而是印出來當教材——這與 M9 的立場一致：誠實揭露限制，比宣稱模型很好專業得多。你的期末專題也該把失敗案例寫進報告。'));
    }
    $('#w-fail').append(out); draw();
  })();

  // ================= 六個檢查與修正說明 =================
  (function () {
    const C = [['同一個個案跑五次，CMS 等級是否穩定', '不穩定表示 Temperature 太高或 Prompt 約束不足'], ['文字敘述與 JSON 欄位是否一致', '在程式碼節點加驗證：兩者不合就標示「需人工覆核」'], ['金額是否全部來自程式碼節點', '搜尋輸出中所有數字，確認每一個都查得到來源'], ['陷阱題（情境 B）是否被正確拒絕', '至少測三種不同的違規要求'], ['資訊不足的個案會不會硬猜', '餵一段很短的逐字稿，看它是追問還是直接給等級'], ['知識庫外的問題會不會亂答', '問「可以申請國民年金嗎」，應回覆查無相關資料']];
    const st = Store.get('dify:six', {}); const out = h('div');
    function draw() { out.innerHTML = ''; C.forEach(([t, d], i) => { const c = h('input', { type: 'checkbox' }); c.checked = !!st[i]; c.onchange = () => { st[i] = c.checked; Store.set('dify:six', st); draw(); }; out.append(h('label', { style: { display: 'flex', gap: '10px', padding: '6px 2px', borderBottom: '1px solid var(--line)', fontSize: '14.5px' } }, c, h('span', null, h('b', null, `${i + 1}. ${t}`), '　', lbl(d)))); }); const n = C.filter((_, i) => st[i]).length; out.append(row(h('span', { class: 'tag ' + (n === 6 ? 'good' : 'gray') }, `完成 ${n} / 6`), lbl('用 P09 的模擬器可以先預演第 4、5、6 項。'))); }
    $('#w-six').append(out); draw();
  })();
  $('#w-diff').append(ul([h('span', null, h('b', null, '程式碼節點失敗時：'), '原 PDF 退回第 2 級、10,020 元；本頁改為「無法判定、不給金額、轉人工覆核」（同 M8）。'), h('span', null, h('b', null, '等級判斷：'), '原 PDF 欄位為 cms_level；本頁在報告中一律標為「預估等級」，正式等級由照管專員評估（M9 介入層級 ②）。'), h('span', null, h('b', null, '認知功能：'), '原 PDF 要 LLM 輸出 is_dementia（是否失智）；本頁改為「認知功能疑慮（需專業評估）」，避免 LLM 做診斷判斷。'), h('span', null, h('b', null, '流程：'), '原 PDF 七節點直接輸出；本頁補上免責聲明與「人為確認」節點（同 M8 Step 6–7、HITL）。'), h('span', null, h('b', null, '召回參數：'), '原 PDF Top-K 6–8；本頁統一採 M8 的 Top-K 5＋閾值 0.5＋Rerank。'), h('span', null, h('b', null, '嵌入模型：'), '原 PDF 推薦 text-embedding-3-large（付費）；本頁補充 Groq 沒有嵌入模型，免費路徑為 gemini-embedding-001 或 Ollama 的 bge-m3。'), h('span', null, h('b', null, '混合檢索分數：'), '原圖 0.62／0.91 → 0.79 未寫權重；本頁補上權重的算法。'), h('span', null, h('b', null, 'Movie Researcher：'), '原 PDF 歸為 Chatflow、M8 歸為 Agent；本頁請以匯入的 yml 實際型態為準。'), h('span', null, h('b', null, '跟 M8 重複的段落：'), 'Dify 是什麼、Dify vs n8n、Workflow vs Agent、工具與 MCP 等，本頁不重做，請見 M8 互動頁。')]));

  // ================= 術語、測驗、回顧 =================
  U.flashcards('#w-cards', [['分隔符分段', 'Custom Separator (###)', '一個評估項目＝一個區塊'], ['高品質索引', 'High Quality Index', '會做向量化；經濟模式只比對關鍵字'], ['混合檢索', 'Hybrid Search', '向量＋全文，依權重合併分數'], ['回應格式', 'Response Format (JSON)', '讓下游節點能直接讀'], ['清洗', 'Sanitize', '移除 ```json 等 Markdown 標記'], ['防呆', 'Guard', '解析失敗、型別錯、範圍外都要接住'], ['每分鐘 Token', 'TPM', '免費額度最容易頂到的一項'], ['最大輸出長度', 'Max Tokens', '設太小 JSON 會被截斷'], ['模型無關性', 'Model Agnostic', '不同節點可換不同模型'], ['排他條款', 'The Iron Rule', '有外籍看護時剔除特定服務並改推替代'], ['預算分包', 'Budget Packages', '第一包月額度，輔具、喘息另計'], ['壓力測試', 'Stress Test', '故意提出不合理要求，看會不會拒絕']]);
  U.finalQuiz('#w-final', [
    ['用 Groq 免費額度做長照專案，最容易頂到哪一項？', ['每天請求數', '每分鐘 Token（TPM）', '每分鐘請求數', '檔案大小'], 1, '長逐字稿＋知識庫召回可能一次就吃掉大半。'],
    ['Groq 沒有嵌入模型，知識庫要怎麼辦？', ['不用嵌入模型也能做 RAG', '另外接 gemini-embedding-001 或本地 bge-m3', '改用經濟模式就好', '把 Top-K 調大'], 1, '經濟模式只做關鍵字比對，搜「無法走路」找不到「平地走動 0 分」。'],
    ['Max Tokens 設太小，最常見的後果是？', ['回答變得比較準', 'JSON 被截斷，下游程式碼節點解析失敗', '成本變高', 'Temperature 失效'], 1, '依輸出格式估算，再留 20% 餘裕。'],
    ['開了 JSON 模式，模型仍輸出 ```json … ```，該怎麼處理？', ['換模型就好', 'Prompt 明寫不要 Markdown 標記＋程式碼節點清洗，兩層都做', '只改 Prompt', '把 Temperature 調高'], 1, 'Prompt 對格式有約束力，但不是保證。'],
    ['程式碼節點解析 JSON 失敗時，最恰當的處理是？', ['退回第 2 級，照常給額度', '回傳「無法判定」、不給金額、轉人工覆核', '重新整理頁面', '讓 LLM 自己估一個金額'], 1, '默默給預設等級，等於悄悄少算了給付。'],
    ['長照 CMS 評估標準這類條列式文件，建議怎麼分段？', ['固定 1024 字', '用分隔符 ###，一條判定標準＝一個區塊', '整份一塊', '每句一塊'], 1, '固定字數可能把一條判定標準切成兩半。'],
    ['問題裡有「BA07」這種代碼，檢索模式該選？', ['純向量檢索', '混合檢索', '不檢索', '經濟模式'], 1, '代碼只有全文檢索抓得準。'],
    ['「外籍看護」與「福利身分別」為什麼做成表單選項？', ['畫面比較好看', '這兩件事錯了後面全錯——能由人明確指定的就不要交給模型猜', 'Dify 規定的', '節省 Token'], 1, '會改變規則的變數，由人指定。'],
    ['家屬堅持排 BA05 餐食照顧，但家裡有外籍看護，好的系統應該？', ['照單全收', '依排他條款拒絕並說明原因', '偷偷排進去', '直接結束對話'], 1, '能拒絕不合理要求並說明理由，才是可用的系統。'],
    ['「真實的失敗」那一頁中，「費用約 500–1000 台幣／次」錯在哪？', ['金額太低', '知識庫裡沒有，是模型生成的數字', '單位寫錯', '沒有錯'], 1, '金額一律由程式碼節點查表。'],
  ]);
  (function () {
    const R = [['額度先算清楚', 'TPM 最容易頂到；嵌入模型另外準備。', 'p01'], ['照順序做 Ex1–Ex5', '記憶 → 工具 → 流程編排。', 'p02'], ['依節點挑模型', '快的、強的、長的、穩的、免費的。', 'p03'], ['JSON 兩層防呆', 'Prompt 要求＋程式碼清洗與驗證。', 'p05'], ['### 分段＋混合檢索', '一條標準一塊；代碼要全文比對。', 'p06'], ['失敗就說無法判定', '不給預設金額，轉人工覆核。', 'p09'], ['規則寫進 Prompt', '排他條款要看得見、可稽核。', 'p10'], ['逐項找錯', '跑得完 ≠ 可信。', 'p11'], ['六個檢查', '從跑得動到說得出可信度。', 'p12']];
    const g = h('div', { class: 'grid3' }); R.forEach(([t, d, id], i) => g.append(h('a', { href: '#' + id, style: { textDecoration: 'none', color: 'inherit', border: '1px solid var(--line)', borderRadius: '10px', padding: '10px 12px', background: '#fff', display: 'block' } }, h('div', { class: 'mono', style: { color: 'var(--accent)', fontWeight: 700 } }, i + 1), h('b', null, t), h('div', { style: { fontSize: '13.5px', color: 'var(--muted)' } }, d))));
    $('#w-review').append(g, h('div', { class: 'note' }, h('b', null, '下一步：'), '回到 M8 互動頁複習觀念，或用 P09 的模擬器預演你的期末專題測試案例。', h('a', { href: '../' }, '回到課程首頁 →')));
  })();
})();
