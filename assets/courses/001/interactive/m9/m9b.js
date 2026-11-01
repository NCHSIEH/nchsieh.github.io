/* M9 互動頁 B：PART 11–20 */
(function () {
  'use strict';
  const { h, $, s, svgBox, rng, seg, slider, check, Store } = U;
  const { cap, row, lbl, nt, ttl, kpi, tok, tbl, pre, box, ul, pct, copyBtn } = window.M9;

  // ================= P11 =================
  U.sorter('#w-xlevel', [
    ['邏輯斯迴歸（看係數就知道每個變數的方向與大小）', '① 本質可解釋', '模型本身就看得懂，不需要額外工具。'],
    ['深度 3 的決策樹', '① 本質可解釋', '淺決策樹、規則式系統、GAM 都屬此層。'],
    ['隨機森林的特徵重要性排行', '② 全域解釋', '整體而言模型看重什麼——★ 用來檢查有無捷徑學習。'],
    ['部分依賴圖 PDP', '② 全域解釋', '單一特徵變化對預測的平均影響。'],
    ['SHAP 瀑布圖：這一位病人為什麼被判高風險', '③ 局部解釋', '這一筆為什麼被判成這樣——臨床溝通的關鍵。'],
    ['Grad-CAM 熱區圖', '③ 局部解釋', '影像的局部解釋。'],
    ['大型語言模型的回答', '④ 黑箱', '只能事後近似——高風險場景要三思。'],
  ], ['① 本質可解釋', '② 全域解釋', '③ 局部解釋', '④ 黑箱'], 'SHAP 與 LIME 是事後近似，不是模型真正的推理過程。');

  // ================= P12 =================
  (function () {
    const F = [['年齡 82 歲', .14], ['共病 5 項', .11], ['上次住院 30 天內', .09], ['獨居', .06], ['有規律回診', -.12]], BASE = .18;
    const on = F.map(() => true); const ctl = h('div'), out = h('div');
    ctl.append(row(...F.map((f, i) => check(f[0], () => on[i], v => on[i] = v, draw))));
    function draw() { out.innerHTML = ''; const W = 720, act = F.filter((_, i) => on[i]), H = 60 + (act.length + 1) * 34, sv = svgBox(h('div'), W, H), x0 = 170, xs = v => x0 + v / .65 * 500;
      [0, .2, .4, .6].forEach(t => { s('line', { x1: xs(t), x2: xs(t), y1: 6, y2: H - 30, class: 'grid' }, sv); s('text', { x: xs(t), y: H - 14, 'text-anchor': 'middle', 'font-size': 11, text: t.toFixed(1) }, sv); });
      s('text', { x: x0 - 8, y: 26, 'text-anchor': 'end', 'font-size': 12.5, text: '基準值（族群平均風險）' }, sv); s('rect', { x: xs(0), y: 12, width: xs(BASE) - xs(0), height: 22, fill: '#a7a39a', rx: 3 }, sv); s('text', { x: xs(BASE) + 6, y: 28, 'font-size': 12, text: BASE.toFixed(2) }, sv);
      let cur = BASE; act.forEach(([n, v], i) => { const y = 46 + i * 34, a = Math.min(cur, cur + v), b = Math.max(cur, cur + v); s('text', { x: x0 - 8, y: y + 15, 'text-anchor': 'end', 'font-size': 12.5, text: n }, sv); s('rect', { x: xs(a), y, width: xs(b) - xs(a), height: 22, fill: v > 0 ? '#c0392b' : '#2f7d4f', rx: 3 }, sv); s('text', { x: xs(b) + 6, y: y + 16, 'font-size': 12, style: 'font-family:var(--mono)', text: (v > 0 ? '+' : '') + v.toFixed(2) }, sv); cur += v; });
      s('line', { x1: xs(cur), x2: xs(cur), y1: 10, y2: H - 30, stroke: '#333', 'stroke-width': 2 }, sv); s('text', { x: xs(cur) + 4, y: H - 34, 'font-size': 12.5, 'font-weight': 700, text: `最終預測 ${cur.toFixed(2)}` }, sv);
      const up = act.filter(f => f[1] > 0).map(f => f[0]), dn = act.filter(f => f[1] < 0).map(f => f[0]);
      out.append(cap(sv.parentNode, 720), box('可以這樣跟臨床同仁說', `「系統判定這位個案再入院風險 ${(cur * 100).toFixed(0)}%${up.length ? '，主要因為：' + up.join('、') : ''}。${dn.length ? '保護因子是' + dn.join('、') + '。' : ''}」`, { bg: 'var(--accent-soft)' }),
        h('div', { class: 'grid3', style: { marginTop: '8px' } }, box('限制 ①', 'SHAP 值是「事後近似」，不是模型真正的推理過程'), box('限制 ②', '數值會隨參照資料集改變'), box('限制 ③', '★ 它顯示「相關貢獻」，不是因果')),
        nt(on[3] ? '最重要的一句：不能拿來說「讓他不獨居就會降低風險」——那是把相關當成因果。那需要因果推論或試驗設計。' : '取消「獨居」只是在看這個模型對「沒有這個因素」的反應，不代表真實世界裡改變居住狀況就會降低風險。', 'warn')); }
    $('#w-shap').append(ctl, out); draw();
  })();

  // ================= P13 =================
  (function () {
    let seed = 1, ans = {}; const out = h('div');
    function draw() { out.innerHTML = ''; const R = rng(seed * 41), T = Array.from({ length: 8 }, () => R() < .35 ? 'mark' : 'lung');
      const g = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(160px,1fr))', gap: '8px' } });
      T.forEach((t, i) => { const c = h('div'); const sv = svgBox(c, 150, 150); s('rect', { x: 0, y: 0, width: 150, height: 150, rx: 8, fill: '#1d1d1d' }, sv); s('ellipse', { cx: 48, cy: 80, rx: 28, ry: 54, fill: '#555' }, sv); s('ellipse', { cx: 102, cy: 80, rx: 28, ry: 54, fill: '#555' }, sv); s('text', { x: 118, y: 22, 'font-size': 11, 'font-weight': 700, style: 'fill:#eee', text: 'PORT' }, sv);
        const hx = t === 'lung' ? (R() < .5 ? 48 : 102) + (R() - .5) * 16 : 132, hy = t === 'lung' ? 70 + R() * 40 : 18; s('circle', { cx: hx, cy: hy, r: 22, fill: 'rgba(255,60,30,.55)' }, sv); s('circle', { cx: hx, cy: hy, r: 11, fill: 'rgba(255,220,0,.6)' }, sv);
        const a = ans[i], btn = (v, l) => { const b = h('button', { class: 'btn sm' + (a === v ? ' on' : ''), style: { flex: 1 } }, l); b.onclick = () => { ans[i] = v; draw(); }; return b; };
        g.append(h('div', { style: { border: '1px solid ' + (a ? (a === t ? 'var(--good)' : 'var(--bad)') : 'var(--line)'), borderRadius: '10px', padding: '6px', background: '#fff' } }, lbl(`#${i + 1} 判陽性`), c, h('div', { style: { display: 'flex', gap: '4px', marginTop: '4px' } }, btn('lung', '在看肺野'), btn('mark', '在看標記')))); });
      const done = Object.keys(ans).length, nm = T.filter(t => t === 'mark').length, right = T.filter((t, i) => ans[i] === t).length;
      out.append(g, row(h('button', { class: 'btn sm', onclick: () => { seed++; ans = {}; draw(); } }, '換一批'), done === 8 ? h('span', null, kpi(['你判對', `${right} / 8`, right === 8 ? 'good' : ''], ['熱區落在標記的比例', `${nm} / 8`, nm ? 'bad' : 'good'])) : lbl(`已判讀 ${done} / 8`)),
        done === 8 ? nt(nm ? `8 張判陽性的片子裡有 ${nm} 張，模型其實在看角落的標記——這些案例「答對」靠的是捷徑。這個比例不該是 0 以外的數字；發現了就要回頭處理資料（例如裁切或遮蔽標記），並做外部驗證。` : '這一批熱區都落在肺野。實務上抽 20 筆、請臨床專家一起看會更可靠。', nm ? 'bad' : '') : '');
    }
    $('#w-cam').append(out); draw();
  })();

  // ================= P14 =================
  (function () {
    const A = { clin: ['臨床人員', '這一筆為什麼被判高風險，合不合理', 'SHAP 單筆貢獻＋命中的關鍵欄位', '給一個分數就沒了', '「模型準確率 94%」', '「這個分數主要來自這四個欄位。它對 80 歲以上較不準，那群請務必自行覆核。」'], pat: ['病人與家屬', '這對我意味著什麼、我能做什麼', '★ 白話說明＋可行動的建議＋明確免責', '丟給他們技術圖表', '「系統評估您的風險是 46%」', '「這是一個參考指標，主要因為年齡與最近的住院紀錄。實際情況請與醫師討論。」'], mgr: ['管理者', '整體效益、風險、成本', '整體與子群體表現＋誤判成本估算', '只報準確率', '「這是最先進的深度學習」', '「它能把每天要看的 500 筆縮到 50 筆。誤判會發生，我們建議這樣接住。」'], it: ['資訊／稽核', '模型怎麼建的、資料從哪來、怎麼監測', '★ 完整技術文件＋資料血緣＋監測計畫', '口頭說明', '「細節都在程式碼裡」', '「附上模型卡、資料來源與版本、子群體稽核表與季度監測計畫。」'], irb: ['法規／IRB', '風險等級、個資處理、人為監督機制', '風險評估文件＋去識別化說明', '事後才想到要申請', '「只是課堂作業，應該不用」', '「本專題僅使用公開與虛構資料；定位為資訊提供，最終決定由專業人員做。」'], peer: ['同儕與評審', '方法是否站得住、限制是否誠實', '公平標準＋子群體差距＋處理方式', '宣稱「很公平」', '「我們的模型很公平」', '「我們選擇以機會均等為公平標準，因為漏掉真正需要的人代價最高。各群召回率差距為 0.08，主要落差在高齡族群。」'] };
    let k = 'clin'; const ctl = h('div'), out = h('div');
    ctl.append(row(seg(Object.keys(A).map(x => [x, A[x][0]]), () => k, v => k = v, draw)));
    function draw() { out.innerHTML = ''; const [, need, how, err, bad, good] = A[k];
      out.append(h('div', { class: 'grid3' }, box('他們要知道什麼', need), box('適合的呈現方式', how), box('常見的錯誤', err, { bg: 'var(--bad-soft)' })), h('div', { class: 'grid2', style: { marginTop: '8px' } }, box('✗ 不要這樣說', bad, { bg: '#fff6f4', bd: 'var(--bad)' }), box('✓ 要這樣說', good, { bg: 'var(--good-soft)', bd: 'var(--good)' })), nt('右邊都比左邊長——誠實的說明本來就比較費口舌。')); }
    $('#w-aud').append(ctl, out); draw();
  })();

  // ================= P15 =================
  (function () {
    const L = [['① 資訊提供', '整理資料、呈現數字，不做判斷', '衛教資訊查詢、數據儀表板', '低', 100], ['② 輔助判斷', '提供分數或建議，★ 人做最終決定（醫療場域的主流定位）', '再入院風險分數、異常事件初篩', '中', 80], ['③ 條件式自動', '符合條件即自動執行，但可被推翻', '自動排程提醒、自動分派工單', '高', 40], ['④ 完全自動', '無人介入即生效——★ 醫療場域幾乎不應採用', '課程專題一律不採用', '極高', 5]];
    let lv = 2; const ctl = h('div'), out = h('div');
    ctl.append(row(slider('介入層級', 1, 4, 1, () => lv, v => lv = v, draw, v => L[v - 1][0])));
    function draw() { out.innerHTML = ''; const [n, d, ex, risk, hu] = L[lv - 1];
      out.append(h('div', { style: { display: 'flex', height: '30px', borderRadius: '8px', overflow: 'hidden', fontSize: '13px', fontWeight: 700, margin: '6px 0' } }, h('div', { style: { width: hu + '%', background: '#2a7f78', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' } }, hu > 10 ? `人 ${hu}%` : ''), h('div', { style: { width: (100 - hu) + '%', background: '#c0392b', color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' } }, 100 - hu > 10 ? `系統 ${100 - hu}%` : '')), lbl('誰在做最終決定（示意）'),
        h('div', { class: 'grid3', style: { marginTop: '8px' } }, box(n, d, { bg: 'var(--accent-soft)' }), box('例子', ex), box('責任風險', risk, { bg: lv >= 3 ? 'var(--bad-soft)' : '#fff' })),
        nt(lv <= 2 ? '課程專題停在這裡。介面設計必須讓人「容易推翻它」。' : '越往右，人能推翻的空間越小；設計者要負的責任越大。課程專題一律停在 ① 或 ②。', lv <= 2 ? '' : 'bad')); }
    $('#w-level').append(ctl, out); draw();
  })();

  // ================= P16 =================
  (function () {
    const AMP = [['only', '只給一個分數'], ['red', '權威的紅色警示'], ['def', '預設值就是採納建議']], MIT = [['why', '同時顯示判斷依據'], ['unc', '顯示不確定性'], ['own', '要求先輸入自己的判斷'], ['easy', '「不採納」跟「採納」一樣容易']];
    const on = { only: true, red: true, def: true, why: false, unc: false, own: false, easy: false }; const ctl = h('div'), out = h('div');
    ctl.append(h('div', { class: 'grid2' }, box('放大自動化偏誤', h('div', null, AMP.map(([k, t]) => h('div', null, check(t, () => on[k], v => on[k] = v, draw)))), { bd: 'var(--bad)' }), box('減緩自動化偏誤', h('div', null, MIT.map(([k, t]) => h('div', null, check(t, () => on[k], v => on[k] = v, draw)))), { bd: 'var(--good)' })));
    function draw() { out.innerHTML = ''; const a = AMP.filter(x => on[x[0]]).length, m = MIT.filter(x => on[x[0]]).length;
      const wrong = Math.max(.05, Math.min(.92, .4 + .14 * a - .08 * m)), right = Math.max(.6, Math.min(.99, .9 + .03 * a - .02 * m)), acc = .9, adopt = acc * right + (1 - acc) * wrong;
      out.append(kpi(['整體採納率', pct(adopt), adopt > .95 ? 'bad' : ''], ['AI 錯的時候仍照做', pct(wrong), wrong > .5 ? 'bad' : wrong < .25 ? 'good' : ''], ['假設 AI 準確率', '90%']),
        nt(wrong > .5 ? `AI 錯的時候，仍有 ${pct(wrong)} 的人照做。越忙、越累、越沒把握的時候越容易發生——而臨床正是這種環境。` : `把「AI 建議」與「你的判斷」並列、讓不採納一樣容易，AI 錯時照做的比例降到 ${pct(wrong)}。`, wrong > .5 ? 'bad' : ''),
        nt('實務作法：顯示信心區間或「本次預測不確定性較高」；★ 記錄使用者是否採納，定期檢視採納率；定期做「無 AI 對照」抽樣，比較有無系統的決策品質。做 Dify 專題的同學特別注意：Chatbot 介面怎麼呈現，會直接影響使用者要不要質疑它。'), lbl('百分比為示意模型，用來呈現方向，不是研究數據。')); }
    $('#w-auto').append(ctl, out); draw();
  })();

  // ================= P17 =================
  U.sorter('#w-genai', [
    ['幻覺無法根除（機率生成的必然產物）', 'RAG＋程式碼＋人工覆核', 'RAG 提供事實、程式碼接管數值、人工覆核（M7、M8）。'],
    ['說不出資料來源', 'RAG 標註來源', '用 RAG 才能標註來源（M8）。'],
    ['訓練資料的版權與同意（病歷有無同意用於訓練）', '公開或虛構資料', '課程一律用公開或虛構資料。'],
    ['流暢度 ≠ 正確性：講得越順越容易被相信', '標示不確定性與免責', '介面主動標示不確定性與免責。'],
    ['提示詞注入：使用者誘導模型繞過限制', '輸出端驗證', '輸出端也要驗證，不能只靠 Prompt。'],
    ['使用紀錄外流：對話內容送到雲端就收不回', '本地模型', '敏感資料用本地模型（M7 Ollama）。'],
  ], ['RAG＋程式碼＋人工覆核', 'RAG 標註來源', '公開或虛構資料', '標示不確定性與免責', '輸出端驗證', '本地模型'], '六個問題的處方，全部都在 M7 與 M8 教過了。');
  (function () {
    const L = { pd: ['個人資料保護', '個資法、GDPR', ['蒐集目的特定與告知', '★ 去識別化的程度要求', '跨境傳輸限制', '當事人權利（查詢、刪除）', '告知同意的取得與紀錄']], md: ['醫療器材管理', '醫材法規、SaMD', ['軟體也可能是醫材', '★ 用於診斷／治療決定 → 需查驗登記', '臨床驗證要求', '上市後監督與事件通報']], ai: ['AI 專法', 'EU AI Act、台灣《人工智慧基本法》', ['★ 醫療 AI 屬「高風險」類別', '★ 醫材類高風險義務延至 2028/8（2026 修法）', '要求：資料治理、透明度、人為監督、風險管理', '技術文件與紀錄保存', '台灣《人工智慧基本法》2025 年底三讀']], irb: ['研究倫理', 'IRB／人體研究法', ['★ 使用病歷做研究需 IRB', '知情同意或免除同意', '資料保存與銷毀規範', '利益衝突揭露', '共享決策與病人參與']] };
    let k = 'pd', data = 'pub'; const ctl = h('div'), out = h('div');
    ctl.append(row(seg(Object.keys(L).map(x => [x, L[x][0]]), () => k, v => k = v, draw)), row(lbl('你的專題用什麼資料？'), seg([['pub', '公開資料／完全虛構'], ['real', '真實病歷（即使已去識別化）']], () => data, v => data = v, draw)));
    function draw() { out.innerHTML = ''; const [t, src, items] = L[k];
      out.append(box(`${t}（${src}）`, ul(items), { bg: 'var(--accent-soft)' }), nt(data === 'pub' ? '★ 上述四項多數都不會觸及，可安心練習方法。' : '★ IRB＋去識別化審查＋機構法務——本課程不採用。', data === 'pub' ? '' : 'bad'), lbl('本頁為 2026 年 9 月概況整理，非法律意見。實際導入前務必諮詢機構法務與 IRB。')); }
    $('#w-law').append(ctl, out); draw();
  })();
  U.sorter('#w-myth', [
    ['「資料去識別化了就沒事」', '迷思', '罕見疾病＋特定年齡＋地區的組合仍可能識別出個人（再識別風險）。'],
    ['「只是課堂作業，不用申請 IRB」', '迷思', '只要使用真實病歷（即使去識別化），多數機構都要求 IRB 或免除審查同意。'],
    ['「我只做輔助建議，不算醫材」', '迷思', '用於診斷、治療決定的軟體可能被認定為醫材，與是否稱為「輔助」無關。'],
    ['「用雲端 API 只是傳文字，沒關係」', '迷思', '傳出去的內容就在對方伺服器上了，收不回來。'],
    ['「全部用公開或虛構資料，就能避開絕大多數法規問題」', '事實', '課程的處理方式就是這樣，同時仍能完整練習方法。'],
  ], ['迷思', '事實']);

  // ================= P18 =================
  (function () {
    const F = [['① 基本資訊', '模型名稱、版本、日期、開發者、聯絡窗口', '名稱：長照給付試算助理　版本：v1.0　日期：2027-06-01\n開發者：○○組（4 人）　聯絡窗口：○○○'], ['② 預期用途', '設計來做什麼、給誰用、在什麼場景', '協助長照個管人員與家屬，依個案描述查詢可能適用的給付項目與額度上限。\n定位：資訊提供／輔助判斷。不做等級核定，不取代照管專員評估。'], ['③ 不適用範圍 ★', '明確寫出「不該用在哪裡」——最重要也最常缺', '・不得用於：正式的等級核定、給付金額的最終認定\n・不得用於：任何醫療診斷或用藥建議\n・不適用對象：法規未涵蓋的特殊個案、跨縣市差異性給付\n・時效限制：知識庫為 2027 年版法規，法規修訂後未更新前不應使用'], ['④ 訓練／知識來源', '來源、期間、樣本數、涵蓋的族群與院所', '衛福部公開之長照 3.0 給付及支付基準（2027 年版）、CMS 評估量表說明。\n未使用任何真實個案資料；測試個案為虛構。'], ['⑤ 評估結果', '整體指標＋★ 各子群體指標', '30 題測試集：等級判定正確率 26/30（86.7%）\n金額計算正確率 30/30（由程式碼節點查表，非模型生成）\n子群體：資訊完整的個案 20/20；資訊不足的個案僅 6/10'], ['⑥ 已知限制', '對哪些群體較不準、在什麼情況會失效', '・個案資訊不足時，容易直接給等級而非追問（4 筆失敗案例全屬此類）\n・多重障礙合併的複雜個案未充分測試\n・知識庫外的問題約 8% 未正確回覆「查無相關資料」\n・僅測試 30 題，樣本數不足以支撐統計推論'], ['⑦ 倫理考量', '公平性選擇與理由、去識別化、人為監督；★ 誠實寫出還沒做的事', '・所有輸出附「僅供參考，實際給付以照管專員評估結果為準」\n・不提供醫療建議；用藥與診斷相關提問一律導向專業人員\n・金額由程式碼節點查表計算，不由模型生成\n・API 金鑰未寫入 DSL；未使用真實個案資料\n尚未建立的機制（誠實揭露）：\n・無監測機制；若實際導入，需指定專人季度覆核法規更新\n・無使用紀錄與回饋迴路，無法得知實際採納率\n・未做使用者測試，不知道介面是否會誘導盲目採納']];
    const st = Store.get('m9:card', {}); const out = h('div'), tas = [];
    const md = () => '# 模型卡\n\n' + F.map(([t], i) => `## ${t.replace(' ★', '')}\n\n${(st[i] || '').trim() || '（待填）'}\n`).join('\n');
    const status = h('div');
    function chk() { status.innerHTML = ''; const filled = F.filter((_, i) => (st[i] || '').trim()).length, c3 = (st[2] || '').trim(), c5 = st[4] || '', c7 = st[6] || '';
      const tips = []; if (!c3) tips.push(['bad', '③ 不適用範圍是空的——這是接手的人最需要的一項。']); if (c5 && !/子群|年齡|性別|地區|資訊不足|族群/.test(c5)) tips.push(['warn', '⑤ 只有整體指標？要拆子群體（年齡、性別、地區……）。']); if (c7 && !/尚未|未建立|沒有|還沒/.test(c7)) tips.push(['warn', '⑦ 可以加一段「尚未建立的機制」——寫出還沒做的事，比宣稱完整專業得多。']);
      status.append(row(h('span', { class: 'tag ' + (filled === 7 ? 'good' : 'gray') }, `已填 ${filled} / 7 欄`), copyBtn(md), h('button', { class: 'btn sm', onclick: () => { F.forEach((f, i) => { st[i] = f[2]; tas[i].value = f[2]; }); Store.set('m9:card', st); chk(); } }, '填入講義範例（長照給付試算助理）'), h('button', { class: 'btn sm', onclick: () => { F.forEach((f, i) => { st[i] = ''; tas[i].value = ''; }); Store.set('m9:card', st); chk(); } }, '清空')), ...tips.map(([c, t]) => nt(t, c))); }
    F.forEach(([t, hint], i) => { const ta = h('textarea', { rows: i === 2 || i === 6 ? 4 : 2, placeholder: hint, style: { width: '100%', fontSize: '14px', padding: '6px 8px', borderRadius: '8px', border: '1px solid ' + (i === 2 ? 'var(--amber)' : 'var(--line)') } }); ta.value = st[i] || ''; ta.oninput = () => { st[i] = ta.value; Store.set('m9:card', st); chk(); }; tas.push(ta); out.append(h('div', { style: { margin: '6px 0' } }, h('b', { style: { fontSize: '14.5px' } }, t), '　', lbl(hint), ta)); });
    out.append(status); chk(); $('#w-card').append(out);
  })();

  // ================= P19 =================
  (function () {
    const D = [['再入院預測模型準確率很高，管理者想拿它來決定「哪些病人值得投入出院準備資源」。', '技術上沒問題，但這樣用對嗎？誰被排除了？「會再入院」是否等於「值得投入資源」？'], ['你的衛教 Chatbot 被問到「我可以不吃藥嗎」，它禮貌地回答了一些一般性建議。', '這算不算提供醫療建議？System Prompt 該怎麼改？如果使用者堅持追問，該怎麼設計？'], ['模型對 80 歲以上族群明顯較不準，但那一群只佔資料的 8%，補資料要半年。', '現在上線還是等？如果上線，要怎麼揭露與補救？誰有權做這個決定？'], ['同事說「反正是輔助，錯了也是醫師負責」。', '這句話對嗎？設計者有沒有責任？如果介面設計讓人很難不採納呢？'], ['你發現訓練資料裡有一批標註明顯是錯的，但修正後模型分數會下降。', '要修嗎？如果專題成績跟分數掛鉤呢？這一題其實在問研究誠信。']];
    D.forEach(([q, d], i) => $('#w-disc').append(h('details', { style: { border: '1px solid var(--line)', borderRadius: '10px', padding: '8px 12px', margin: '6px 0', background: '#fff' } }, h('summary', { style: { cursor: 'pointer', fontWeight: 600, fontSize: '14.5px' } }, `情境 ${i + 1}　${q}`), h('div', { style: { fontSize: '14px', color: 'var(--muted)', marginTop: '6px' } }, '要討論：' + d))));
    $('#w-disc').append(nt('建議帶法：分組討論 10 分鐘，每組報告 2 分鐘。重點不是答案，是「有沒有意識到這是個問題」。'));
  })();
  (function () {
    const C = [['一、資料', ['使用的是公開資料集或完全虛構的資料（未使用任何真實病歷）', '說得出資料的來源、蒐集方式、涵蓋期間', '★ 說得出「誰不在這批資料裡」以及那代表什麼', '★ 說得出標籤實際上是怎麼產生的', '標準化／缺值處理的參數只用訓練集計算（無洩漏）', '若為時間序列，切分方式依時間而非隨機']], ['二、模型與評估', ['有建立基準線，並說明模型贏了多少', '不是只報準確率：附混淆矩陣、Recall、F1 或 AUC', '說明為什麼選這個指標（漏報與誤報的代價哪個高）', '★ 附子群體稽核表（至少按年齡、性別、地區拆）', '★ 說得出「模型對哪一群人最不準」', '若為影像任務，做過外部驗證或說明未做的原因']], ['三、可解釋性', ['能說出模型看重哪些特徵，並判斷是否合理', '★ 檢查過有無捷徑學習', '若用黑箱模型，說明為什麼可解釋性在此情境可接受', '沒有把 SHAP 的貢獻度說成因果關係']], ['四、倫理與責任', ['★ 明確標示 AI 介入層級（① 資訊提供 或 ② 輔助判斷）', '醫療相關輸出附「僅供參考，最終應由專業人員判斷」', '不提供診斷、不提供處方與劑量建議', '★ 說得出「這個系統誤判時，誰會發現、怎麼補救」', '★ 說得出「上線後誰維護、多久檢視一次」', '介面設計不會誘導使用者盲目採納', '若用雲端 API，確認送出的內容不含敏感資料', 'API 金鑰未寫入交付檔案']], ['五、公平性', ['★ 說得出「我們選擇以○○為公平標準，因為……」', '檢查過有無代理變數（郵遞區號、保險別、就醫院所等）', '對表現較差的群體，有對應的處理或揭露']], ['六、誠實揭露', ['★ 主動說明限制，而不是等人問', '沒有把相關性說成因果', '沒有誇大效能（例：把驗證分數說成上線表現）', '說得出這個模型「不該用在哪裡」']], ['七、建議產出', ['★ 附一份模型卡（七個欄位，約兩頁 A4）']]];
    const st = Store.get('m9:check', {}); const out = h('div');
    function draw() { out.innerHTML = ''; let tot = 0, all = 0; const miss4 = []; const g = h('div', { class: 'grid2' });
      C.forEach(([t, items], gi) => { const done = items.filter((_, i) => st[gi + '-' + i]).length; tot += done; all += items.length; if (gi < 4 && done < items.length) miss4.push(t);
        g.append(box(`${t}　${done}/${items.length}`, h('div', null, items.map((x, i) => { const c = h('input', { type: 'checkbox' }); c.checked = !!st[gi + '-' + i]; c.onchange = () => { st[gi + '-' + i] = c.checked; Store.set('m9:check', st); draw(); }; return h('label', { style: { display: 'block', fontSize: '13.5px', padding: '2px 0' } }, c, ' ' + x); })), { bd: done === items.length ? 'var(--good)' : 'var(--line)' })); });
      out.append(g, row(h('span', { class: 'tag ' + (tot === all ? 'good' : 'gray') }, `完成 ${tot} / ${all}`)), miss4.length ? nt(`前四大項尚未全勾：${miss4.join('、')}——發表時請主動說明原因。`, 'warn') : nt('前四大項都勾完了。誠實揭露限制，比宣稱模型很好，專業得多。')); }
    $('#w-check').append(out); draw();
  })();

  // ================= P20 =================
  U.flashcards('#w-cards', [['演算法偏誤', 'Algorithmic Bias', '對特定群體產生系統性不利結果'], ['代理變數', 'Proxy Variable', '與受保護屬性高度相關的特徵'], ['受保護屬性', 'Protected Attribute', '不應據以差別待遇的特徵'], ['透過不知情達成公平', 'Fairness Through Unawareness', '刪除敏感欄位即認為公平的謬誤'], ['人口平價', 'Demographic Parity', '各群體被選中的比例相同'], ['機會均等', 'Equal Opportunity', '各群體召回率相同；醫療篩檢最常用'], ['預測平價', 'Predictive Parity', '各群體精確率相同'], ['個體公平', 'Individual Fairness', '相似的個體得到相似的對待'], ['不可能定理', 'Impossibility Theorem', '盛行率不同時多種公平定義無法同時滿足'], ['子群體稽核', 'Subgroup Audit', '把評估指標拆到各子群體計算'], ['本質可解釋模型', 'Intrinsically Interpretable', '結構本身即可讀懂'], ['SHAP', 'SHapley Additive exPlanations', '以賽局理論分配各特徵貢獻'], ['Grad-CAM', 'Gradient-weighted CAM', 'CNN 判斷時注意到影像哪些區域'], ['捷徑學習', 'Shortcut Learning', '學到與任務無關但相關的線索'], ['自動化偏誤', 'Automation Bias', '過度信任自動化系統輸出'], ['再識別風險', 'Re-identification Risk', '多個屬性組合反推出個人身分'], ['模型卡', 'Model Card', '用途、限制、評估結果、適用族群'], ['軟體醫材', 'SaMD', '本身即構成醫療器材的軟體'], ['資料漂移', 'Data Drift', '上線後資料分布偏離訓練時'], ['研究誠信', 'Research Integrity', '誠實呈現，不隱匿不利發現']]);
  U.finalQuiz('#w-final', [
    ['三種真實失敗（捷徑學習、子群體不準、準確但誤用）的共同點是？', ['模型太簡單', '所有評估指標都通過', '資料量太少', '都用了深度學習'], 1, '「準確率高」跟「可以用」是兩件事。'],
    ['用「醫療花費」當「醫療需求」的標籤，造成的是哪一種偏誤？', ['選擇偏誤', '測量偏誤', '標籤偏誤', '部署偏誤'], 2, '模型沒用種族欄位，偏誤來自標籤的定義。'],
    ['模型沒有使用「性別」欄位，是否就不會有性別偏誤？', ['是', '不是：其他欄位可能是代理變數，要用其他特徵預測性別檢查', '只要準確率高就不會', '要看用哪個演算法'], 1, '透過不知情達成公平是謬誤。'],
    ['醫療篩檢最常採用的公平定義是？', ['人口平價', '機會均等（各群召回率相同）', '預測平價', '個體公平'], 1, '漏掉病人的代價最高。'],
    ['A 群盛行率 20%、B 群 10%，強制兩群選出率相同時會發生？', ['三種公平都滿足', 'B 群精確率明顯較低', 'A 群召回率變 1', '沒有影響'], 1, '講義例子：B 群精確率只有 0.450。'],
    ['不可能定理說明了什麼？', ['演算法還不夠好', '盛行率不同時，除非完美預測，三種公平定義無法同時滿足', '公平無法量測', '需要更多資料'], 1, '所以公平是價值選擇。'],
    ['整體 AUC 0.842，80 歲以上 0.771。判讀時要先問哪兩件事？', ['模型名稱與版本', '是不是樣本少造成的、是不是盛行率不同造成的', '用了哪台電腦', '有沒有用 GPU'], 1, '看 n 欄與實際陽性率欄。'],
    ['SHAP 顯示「獨居」推高風險 +0.06，可以說「讓他不獨居就會降低風險」嗎？', ['可以', '不可以：SHAP 顯示相關貢獻，不是因果', '只要數值夠大就可以', '換成 LIME 就可以'], 1, '那需要因果推論或試驗設計。'],
    ['若可解釋性是硬需求，優先怎麼做？', ['先用黑箱再加 SHAP', '選本質可解釋的模型', '不用解釋', '只報準確率'], 1, 'SHAP／LIME 是事後近似。'],
    ['課程專題的 AI 介入層級應停在？', ['① 資訊提供或 ② 輔助判斷', '③ 條件式自動', '④ 完全自動', '看組員決定'], 0, '責任歸屬還沒有明確答案。'],
    ['你的 Chatbot 採納率高達 99%，這代表？', ['模型很準', '很可能是自動化偏誤——沒有人在思考', '介面很漂亮', '可以直接改成完全自動'], 1, '合理的採納率應該有一定比例的不採納。'],
    ['模型卡七個欄位中，最常被省略、但接手的人最需要的是？', ['基本資訊', '預期用途', '不適用範圍', '訓練資料'], 2, '明確寫出「不該用在哪裡」。'],
  ]);
  (function () {
    const R = [['指標全過也會出事', '問題出在別的地方。', 'p01'], ['偏誤在問題定義就進來', '不是最後補一頁投影片。', 'p05'], ['刪欄位不能消除偏誤', '代理變數仍攜帶那個資訊。', 'p07'], ['公平有三種定義', '盛行率不同時數學上無法同時滿足。', 'p08'], ['說出你選了什麼', '「我們選擇以○○為準，因為……」', 'p08'], ['子群體稽核表', '不難做，但很少人做。', 'p09']];
    const g = h('div', { class: 'grid3' }); R.forEach(([t, d, id], i) => g.append(h('a', { href: '#' + id, style: { textDecoration: 'none', color: 'inherit', border: '1px solid var(--line)', borderRadius: '10px', padding: '10px 12px', background: '#fff', display: 'block' } }, h('div', { class: 'mono', style: { color: 'var(--accent)', fontWeight: 700 } }, i + 1), h('b', null, t), h('div', { style: { fontSize: '13.5px', color: 'var(--muted)' } }, d))));
    $('#w-review').append(g, h('div', { class: 'grid3', style: { marginTop: '10px' } }, box('① 工具會過時，判斷不會', '「該用什麼方法」「結果可不可信」「這樣用對不對」——這三個判斷不會過時。', { bg: 'var(--accent-soft)' }), box('② 你的領域知識是稀缺的', '會寫程式的人很多，看得懂護理紀錄又會分析的人很少。「這個標籤實際上是怎麼產生的」——只有你問得出來。', { bg: 'var(--accent-soft)' }), box('③ 誠實比聰明重要', '在醫療場域，一個被過度宣稱的模型造成的傷害，遠大於一個誠實的爛模型。', { bg: 'var(--accent-soft)' })), h('div', { class: 'note' }, h('b', null, '下一步：'), 'W10 案例研究發表、W16 期末專題發表前，回到 P19 逐項打勾。', h('a', { href: '../' }, '回到課程首頁 →')));
  })();
})();
