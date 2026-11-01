/* M7 互動頁 B：PART 09–18 */
(function () {
  'use strict';
  const { h, $, S, C, rng, seg, slider, check, lc, Store } = U;
  const { cap, row, lbl, nt, ttl, kpi, tok, tbl } = window.M7;
  const dl = (name, csv) => { const a = h('a', { href: URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })), download: name }); document.body.append(a); a.click(); a.remove(); };
  const bars = (items, o = {}) => h('div', null, items.map(([n, p, hi, dim]) => h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0', opacity: dim ? .35 : 1 } }, h('div', { style: { width: o.lw || '56px', fontWeight: 600, fontSize: '14px' } }, n), h('div', { style: { flex: 1, height: '16px', background: 'var(--line)', borderRadius: '8px', overflow: 'hidden' } }, h('div', { style: { width: p * 100 + '%', height: '100%', background: hi ? C.bad : C.accent } })), h('span', { class: 'mono', style: { width: '48px' } }, p.toFixed(2)))));
  const softT = (z, T) => { if (T <= 0.001) { const m = Math.max(...z); return z.map(v => v === m ? 1 : 0); } const e = z.map(v => Math.exp(v / T)), s = S.sum(e); return e.map(v => v / s); };
  const samp = (p, r) => { let u = r(), c = 0; for (let i = 0; i < p.length; i++) { c += p[i]; if (u <= c) return i; } return p.length - 1; };

  // ================= P09 Temperature =================
  (function () {
    const W = ['穩定', '良好', '改善', '惡化', '波動', '起伏'], Z = [2.0, 1.5, 1.4, .8, .6, .5]; let T = .7, P = 1, seed = 1; const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; const p = softT(Z, T), ord = p.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]); let c = 0; const nuc = new Set(); ord.forEach(([v, i]) => { if (c < P - 1e-9) { nuc.add(i); c += v; } }); const pn = p.map((v, i) => nuc.has(i) ? v : 0), sn = S.sum(pn), pf = pn.map(v => v / sn);
      const r = rng(seed * 97 + Math.round(T * 100)), draws = Array.from({ length: 20 }, () => W[samp(pf, r)]), uniq = new Set(draws).size;
      out.append(h('div', { class: 'grid2', style: { alignItems: 'center' } }, h('div', null, ttl(`Temperature ${T.toFixed(1)}、Top-p ${P.toFixed(2)} 之下的機率`), bars(W.map((w, i) => [w, p[i], i === 0, !nuc.has(i)]))), h('div', null, ttl('「這位病人的病情 ___」抽樣 20 次'), h('div', { style: { margin: '6px 0' } }, draws.map(d => tok(d, { bg: d === '穩定' ? '#d7ece9' : d === '惡化' ? '#fbe3df' : undefined }))), kpi(['出現幾種不同的詞', String(uniq), uniq > 3 ? 'bad' : 'good'], ['候選池（Top-p 內）', nuc.size + ' 個']))),
        nt(T <= .3 ? '低溫：分布尖銳，幾乎總選「穩定」——可重現、適合結構化輸出。★ 醫療應用一律用這一段（0–0.3）。' : T < 1 ? '中溫：仍偏好「穩定」，但偶爾換詞——一般對話的預設值。' : `高溫：分布被拉平，連「惡化」都可能被選到——同一位病人，報告可能寫成相反的意思。醫療場域不要用。${P < 1 ? 'Top-p 把冷僻的候選（灰色）排除在外，是另一道保險。' : '試著調低 Top-p。'}`, T >= 1 ? 'bad' : ''),
        h('div', { class: 'note warn', style: { fontSize: '14px' } }, h('b', null, '★ 重要限制：'), 'Temperature 只影響「從候選中怎麼挑」，不影響「候選本身對不對」。設 0 只是讓它每次都挑同一個最高機率的答案；那個答案本來就錯的話，它會穩定地錯下去。擋內容編造要靠 RAG。')); }
    ctl.append(row(slider('Temperature', 0, 2, .1, () => T, v => T = +v.toFixed(1), draw, v => (+v).toFixed(1)), slider('Top-p', .1, 1, .05, () => P, v => P = +v.toFixed(2), draw, v => (+v).toFixed(2)), h('button', { class: 'btn sm', onclick: () => { seed++; draw(); } }, '再抽 20 次')));
    $('#w-temp').append(ctl, out, tbl(['參數', '作用', '醫療應用建議值', '調錯會怎樣'], [['Temperature', '控制隨機性', '0 – 0.3', '太高 → 用詞飄移、格式不穩'], ['Top-p（核採樣）', '只從累積機率前 p 的候選中挑', '0.1 – 0.5', '太高 → 冷僻詞被選中的機會上升'], ['Max tokens', '限制輸出長度', '依格式估算，留 20% 餘裕', '太小 → 答案被截斷'], ['Frequency penalty', '抑制重複用詞', '0 – 0.3', '太高 → 該重複的術語被迫換詞'], ['Seed', '固定隨機種子以求可重現', '測試時固定', '不設 → 兩次答案不同，難以除錯']]), h('p', { class: 'ai' }, '本頁的候選詞機率為示意。課堂練習：把 Temperature 設 0 與 1.2，同一個問題各跑五次，比較答案的差異程度。')); draw();
  })();

  // ================= P10 幻覺 =================
  (function () {
    const BASE = [['128', .31], ['正常', .22], ['偏高', .18], ['140', .11], ['其他', .18]], RAG = [['182', .86], ['偏高', .08], ['128', .02], ['正常', .02], ['其他', .02]];
    let rag = false, T = 1, seed = 1; const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; const C0 = rag ? RAG : BASE, z = C0.map(c => Math.log(c[1])), p = softT(z, T), r = rng(seed * 31 + (rag ? 7 : 0)), d = Array.from({ length: 10 }, () => C0[samp(p, r)][0]), fab = d.filter(x => /^\d+$/.test(x) && (!rag || x !== '182')).length;
      out.append(h('div', { style: { padding: '10px', background: '#fff', border: '1px solid var(--line)', borderRadius: '8px', fontSize: '15px', marginBottom: '8px' } }, rag ? h('div', { style: { fontSize: '13px', color: C.accent, marginBottom: '4px' } }, '〔知識庫召回〕檢驗報告：飯前血糖 182 mg/dL') : '', '病人的血糖值為 ', h('b', { style: { borderBottom: '2px dashed ' + C.bad } }, '＿＿＿')),
        h('div', { class: 'grid2', style: { alignItems: 'center' } }, h('div', null, ttl('下一個 token 的候選機率（示意）'), bars(C0.map(([w], i) => [w, p[i], /^\d+$/.test(w) && w !== '182']))), h('div', null, ttl('同一個問題問 10 次'), h('div', null, d.map(x => tok(x, { bg: /^\d+$/.test(x) && (!rag || x !== '182') ? '#fbe3df' : x === '182' ? '#d7ece9' : undefined, b: /^\d+$/.test(x) }))), kpi(['編造出來的數值', `${fab} / 10`, fab ? 'bad' : 'good']))),
        nt(rag ? '有了 RAG：事實由知識庫提供，「182」的機率壓倒性最高——模型照抄輸入裡的數字就好。但如果知識庫沒有這份報告，它還是會回到左邊那個狀態，所以系統還要能回答「查無資料」。' : '沒有任何人量過這位病人的血糖，但「128」機率最高就寫 128——這不是故障，是機制本身：它挑的是「最像下一個字的東西」。三個來源：① 訓練資料的空白處（不會說不知道）② 機率取樣（抽到錯的字整句就歪）③ 沒有事實查核機制。', rag ? '' : 'bad')); }
    ctl.append(row(check('加上 RAG：把檢驗報告放進上下文', () => rag, v => rag = v, draw), slider('Temperature', .1, 1.5, .1, () => T, v => T = +v.toFixed(1), draw, v => (+v).toFixed(1)), h('button', { class: 'btn sm', onclick: () => { seed++; draw(); } }, '再問 10 次')));
    $('#w-hall').append(ctl, out); draw();
  })();
  U.sorter('#w-htype', [['說出一個沒人量過的檢驗值或給付金額', '編造數值', '數值一律交給程式碼或知識庫。'], ['把 A 疾病的處置說成 B 疾病的', '拼接不同來源', '召回段落要精，並標註來源。'], ['引用已經修訂的舊版給付標準', '過時資訊', 'RAG 知識庫要跟著法規更新。'], ['從「有這些症狀」跳到「你可能得了某某病」', '過度推論', '明文禁止提供診斷，導向就醫。']], ['編造數值', '拼接不同來源', '過時資訊', '過度推論'], '錯誤的醫療資訊看起來跟正確的一模一樣，而模型的語氣永遠自信。課程鐵則：所有醫療 AI 輸出一律加上「僅供參考，最終應由專業人員判斷」，且不得提供診斷與處方。');

  // ================= P11 選型 =================
  (function () {
    const A = { out: null, zh: null, n: 500, lock: null }; const out = h('div');
    function draw() { out.innerHTML = ''; const Q = [['out', '① 資料能不能出機構？', '真實病歷、個案紀錄一律不得送進雲端 API；去識別化後仍要確認機構資安規範', ['可以（公開或去識別化資料）', '不可以']], ['zh', '② 用你自己領域的 20 題測過中文表現了嗎？', '國際排行榜多以英文測試；這 20 題就是你的專屬基準', ['測過了', '還沒']], ['lock', '④ 系統有沒有綁死在某家的獨有功能？', 'Dify 換模型只是換下拉選單，但 Prompt 可能要重調；把 Prompt 存成獨立檔案', ['沒有，好換', '有']]];
      Q.forEach(([k, q, d, o]) => out.append(h('div', { style: { padding: '7px 4px', borderBottom: '1px solid var(--line)' } }, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('div', null, h('b', null, q), h('div', { style: { fontSize: '13px', color: 'var(--muted)' } }, d)), seg(o.map((t, i) => [i, t]), () => A[k], v => A[k] = v, draw)))));
      out.append(h('div', { style: { padding: '7px 4px' } }, h('b', null, '③ 成本結構撐得住嗎？'), slider('預期每天問答次數', 50, 20000, 50, () => A.n, v => A.n = v, draw), h('span', { style: { fontSize: '13px', color: 'var(--muted)', marginLeft: '8px' } }, `以 P04 的單次 US$0.000627 估算：雲端月成本 ≈ US$${(A.n * 30 * .000627).toFixed(0)}；Agent 輪數不固定要另設上限`)));
      const cand = [['雲端 API', A.out !== 1, '能力最強、上手最快；按 token 計費'], ['本地 Ollama（7B–8B）', true, '資料不出機房；能力中等，繁中醫療術語較弱'], ['私有雲／地端企業版', true, '合約內不外流；成本高、要採購']];
      out.append(h('div', { class: 'grid3', style: { marginTop: '8px' } }, cand.map(([n, ok, d]) => h('div', { style: { border: '2px solid ' + (ok ? C.accent : C.bad), borderRadius: '10px', padding: '8px 10px', background: ok ? '#fff' : 'var(--bad-soft)', opacity: ok ? 1 : .7 } }, h('b', null, (ok ? '✓ ' : '✗ ') + n), h('div', { style: { fontSize: '13px', color: 'var(--muted)' } }, ok ? d : '資料不能出機構 → 直接排除')))),
        nt(A.out === 1 ? '第一題答「不可以」：所有雲端 API 直接出局，不管它多強。實務折衷：敏感資料的前處理（去識別化、抽取）用本地模型，去識別化後的推理再用雲端。' : A.zh === 1 ? '還沒測中文表現就先別決定——拿 20 題自己的問題各跑一次人工比對，比任何排行榜都有用（作業任務一就是做這件事）。' : A.lock === 1 ? '綁死單一供應商：日後換模型代價很高。' : '注意這四個問題裡，沒有一個是「哪個模型在排行榜上最強」。具體模型與數字變動極快，上課時請以各家官方文件為準。', A.out === 1 ? 'bad' : A.zh === 1 || A.lock === 1 ? 'warn' : '')); }
    $('#w-pick').append(out); draw();
  })();
  U.sorter('#w-reason', [['查今天的門診時間', '不值得', '單步查詢，推理只是白花錢。'], ['把散文改寫成 SOAP', '不值得', '規則明確，一般模型就做得好。'], ['依量表判定長照等級', '值得', '要對照多個條件並權衡；思考過程可稽核。'], ['Agent 拆解模糊任務、規劃步驟', '值得', 'M8 的 Agent 品質很吃這個能力。'], ['寫程式與除錯', '值得', 'M10 Vibe Coding 明顯受益。'], ['情緒支持與陪伴對話', '不值得', '需要的是自然，不是推理；反而顯得生硬。']], ['值得', '不值得'], '成本差距可能達 5–20 倍（思考過程也算 token）。思考過程「看起來合理」不代表它真的是這樣算的——那段文字同樣是生成的。');

  // ================= P12 部署 =================
  (function () {
    const PS = [1, 2, 3, 7, 8, 14, 32, 70]; let pi = 4, bits = 4, ram = 16; const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; const p = PS[pi], need = p * bits / 8 * 1.15 + 1, ok = need <= ram * .75;
      const b = h('div'); U.hbars(b, PS.map(q => ({ label: q + 'B', value: q * bits / 8 * 1.15 + 1, color: q === p ? (ok ? C.accent : C.bad) : q * bits / 8 * 1.15 + 1 <= ram * .75 ? '#8fc4bf' : '#d8b3ad' })), { w: 400, rowH: 22, lw: 44, fmt: v => v.toFixed(1) + ' GB', max: Math.max(ram, 70 * bits / 8 * 1.15 + 1) });
      out.append(h('div', { class: 'grid2', style: { alignItems: 'center' } }, h('div', null, ttl(`${bits} 位元量化時各尺寸需要的記憶體（約略）`), cap(b, 420)), h('div', null, kpi([`${p}B 模型（${bits} 位元）`, '≈ ' + need.toFixed(1) + ' GB'], ['你的記憶體', ram + ' GB'], ['跑得動嗎', ok ? '可以' : '不建議', ok ? 'good' : 'bad']),
        nt(bits === 16 ? '16 位元（未量化）：7B 模型就要 16 GB 以上。量化把權重精度降低（16 → 4 位元），檔案變小、記憶體需求降低，代價是能力略降——多數任務感受不明顯。Ollama 下載的就是量化（GGUF）版本。' : ok ? `可以跑。7B–8B 模型約需 8 GB 可用 RAM；有獨立顯卡會快很多，沒有顯卡也能跑，只是慢（每秒數個 token）。` : '記憶體不夠：換小一點的模型（gemma2:2b 約 1.6 GB），或改用私有雲／雲端（但要先確認資料能不能出機構）。', ok ? '' : 'warn')))); }
    ctl.append(row(slider('模型參數量', 0, PS.length - 1, 1, () => pi, v => pi = v, draw, v => PS[v] + 'B'), lbl('量化'), seg([[16, '16 位元'], [8, '8 位元'], [4, '4 位元（GGUF 常見）']], () => bits, v => bits = v, draw), lbl('電腦記憶體'), seg([[8, '8 GB'], [16, '16 GB'], [32, '32 GB'], [64, '64 GB']], () => ram, v => ram = v, draw)));
    $('#w-ram').append(ctl, out, tbl(['', '雲端 API', '本地（Ollama）', '私有雲／地端企業版'], [['代表', 'OpenAI、Anthropic、Google', 'Ollama＋開源權重模型', 'Azure OpenAI、院內 GPU 叢集'], ['能力', '最強', '中等（8B–70B）', '強'], ['成本', '按 token 計費', '電費＋一次性硬體', '高（授權＋維運）'], ['資料', h('b', { style: { color: C.bad } }, '★ 送出機構外'), h('b', { style: { color: C.good } }, '★ 完全不出機房'), '合約內不外流'], ['適合', '一般應用、課堂練習', '★ 病歷等敏感資料', '醫院正式導入']])); draw();
  })();
  (function () {
    const CMD = [['① 安裝', '到 https://ollama.com 下載對應作業系統的安裝檔（Windows／macOS／Linux）'], ['② 下載並執行模型', 'ollama run qwen2.5:7b      # 中文表現較佳，約 4.4 GB\nollama run llama3.1:8b     # 通用，約 4.7 GB\nollama run gemma2:2b       # 最輕量，約 1.6 GB'], ['③ 直接對話', '>>> 請用三點說明高血壓的飲食注意事項'], ['④ 用 API 呼叫（Dify 本地部署時就是接這個）', 'curl http://localhost:11434/api/generate -d \'{\n  "model": "qwen2.5:7b",\n  "prompt": "請用三點說明高血壓的飲食注意事項",\n  "stream": false\n}\''], ['⑤ 常用指令', 'ollama list   # 看已下載的模型\nollama ps     # 看目前載入記憶體的模型\nollama rm gemma2:2b   # 刪除模型釋放空間']];
    $('#w-ollama').append(...CMD.map(([t, c]) => { const pre = h('pre', { class: 'mono', style: { background: '#1c2430', color: '#e8eef0', padding: '10px 12px', borderRadius: '8px', fontSize: '13px', overflowX: 'auto', margin: '4px 0 10px', whiteSpace: 'pre' } }, c); const b = h('button', { class: 'btn sm', onclick: () => { try { navigator.clipboard.writeText(c); b.textContent = '已複製'; } catch (e) { } } }, '複製'); return h('div', null, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('b', null, t), b), pre); }), nt('型號更新快，以 ollama.com/library 為準。本地 8B 模型做得好：格式轉換、摘要既有文本、分類與抽取，搭配 RAG 明顯提升；做不好：廣泛世界知識、多步推理、長文一致性、繁體中文醫療術語。'));
  })();

  // ================= P13 =================
  (function () {
    const steps = ['開啟「Basic LLMs.rmp」，觀察它接的是哪個 Hugging Face 模型', '執行「1 Generating Text with GPT2」，改變 temperature 各跑三次', '比較同一個提示詞在不同溫度下的輸出差異', '開啟「Generative Models -T5 Base」，注意這是 Encoder-Decoder', '★ 執行「RAG - restaurant suggestion」——M8 的預告', '把 new data.csv 換成自己的資料，觀察召回結果變化', '記錄：同一個問題，有無 RAG 的回答差在哪'];
    const st = Store.get('m7:labs', {}); const out = h('div');
    function draw() { out.innerHTML = ''; steps.forEach((s, i) => { const c = h('input', { type: 'checkbox' }); c.checked = !!st[i]; c.onchange = () => { st[i] = c.checked; Store.set('m7:labs', st); draw(); }; out.append(h('label', { style: { display: 'flex', gap: '8px', padding: '4px 0', fontSize: '14px', cursor: 'pointer' } }, c, h('span', { style: { textDecoration: c.checked ? 'line-through' : 'none' } }, `${i + 1}. ${s}`))); });
      out.append(h('div', { class: 'mono', style: { fontSize: '12px', color: 'var(--muted)' } }, 'Repository ▸ Generative Model/（需安裝 Generative Models 擴充）'), nt('預期：溫度越高，同一提示詞的輸出差異越大；T5 適合轉換任務、GPT2 適合續寫；RAG 範例能引用 csv 裡的實際資料，無 RAG 時模型會「編」出不存在的餐廳。'), h('div', { class: 'concept' }, h('div', null, h('b', null, '挑模型：看任務標籤'), 'text-generation、text-classification、sentence-similarity'), h('div', null, h('b', null, '看模型卡'), '訓練資料、預期用途、已知限制'), h('div', null, h('b', null, '★ 看授權條款'), '有些禁止商用，有些要求標註來源'), h('div', null, h('b', null, '量化版本 GGUF'), '16 → 4 位元，檔案小、能力略降'))); }
    $('#w-labs').append(out); draw();
  })();

  // ================= P14 提示詞 =================
  (function () {
    const L = [['直接提問', '什麼是高血壓的飲食注意事項？', '高血壓患者應注意鈉的攝取，建議每日鈉攝取量低於 2300 毫克……（續 400 字）', '太長、有數字（來源不明）、用詞偏學術、每次結果都不一樣', '不能放進系統'], ['＋角色與對象', '你是衛教護理師，請向 70 歲的高血壓長者說明飲食注意事項。', '阿公阿嬤您好，我來跟您說說吃東西要注意的地方……（續 300 字）', '語氣親切、用詞淺白；但長度不定、沒有結構', '還是不夠穩'], ['＋結構與限制', '你是衛教護理師，請向 70 歲的高血壓長者說明飲食注意事項。\n分三點，每點 50 字以內，不提任何藥物名稱。', '1. 少放鹽：煮菜時鹽巴減半，可以用蔥薑蒜提味。\n2. 少吃醃漬品：醬瓜、豆腐乳、香腸這類要盡量避免。\n3. 多吃蔬果：每餐半碗青菜，水果一天兩份。', '★ 格式穩定、長度可控、危險內容被擋掉', '可以放進系統'], ['＋範例與替代動作', '你是衛教護理師，請向 70 歲的高血壓長者說明飲食注意事項。\n分三點，每點 50 字以內，不提任何藥物名稱。格式如下範例：\n1. 少放鹽：……\n若問題超出飲食範圍，回答「這部分建議詢問您的主治醫師」。\n結尾固定加上「本說明僅供參考，請依醫囑調整」。', '（格式與層次 3 相同）\n……\n本說明僅供參考，請依醫囑調整。', '★ 知識邊界外有明確行為', '可以交付']];
    let lv = 1, test = false; const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; const [n, p, o, c, tag] = L[lv - 1];
      const ans = test ? (lv === 4 ? '這部分建議詢問您的主治醫師。\n本說明僅供參考，請依醫囑調整。' : lv === 3 ? '（沒有規定超出範圍怎麼辦）→ 可能開始談停藥的利弊……' : '（沒有任何限制）→ 可能直接給出停藥建議或劑量資訊……') : o;
      out.append(h('div', { class: 'grid2' }, h('div', null, ttl(`層次 ${lv}：${n}`), h('pre', { class: 'mono', style: { background: '#fff', border: '1px solid var(--line)', borderRadius: '8px', padding: '10px', fontSize: '13px', whiteSpace: 'pre-wrap', minHeight: '120px' } }, p + (test ? '\n\n使用者：我可以停藥嗎？' : ''))), h('div', null, ttl('輸出（節錄）'), h('pre', { style: { background: test && lv < 4 ? 'var(--bad-soft)' : 'var(--accent-soft)', borderRadius: '8px', padding: '10px', fontSize: '14px', whiteSpace: 'pre-wrap', minHeight: '120px', fontFamily: 'inherit' } }, ans))),
        kpi(['評語', test ? (lv === 4 ? '正確拒答' : '越界風險') : c, test ? (lv === 4 ? 'good' : 'bad') : ''], ['能不能用', tag, lv >= 3 ? 'good' : 'bad']),
        nt(lv < 3 ? '多數人停在這裡，然後抱怨「AI 不好用」。差別不在模型，在你給了多少約束。' : lv === 3 ? '層次 3 是「可以放進系統」與「不行」的分界線。勾選「測試超出範圍的問題」看看它會怎樣。' : '★ 這就是 M8 的四段式 System Prompt：角色 → 步驟 → 限制 → 格式。三個原則：① 給替代動作，不要只給禁令 ② 範例比規則有效 ③ 把「要什麼」寫清楚比「不要什麼」重要——好的提示詞讀起來像一份給新人的工作指示。', lv < 3 ? 'warn' : '')); }
    ctl.append(row(seg([[1, '層次 1'], [2, '層次 2'], [3, '層次 3'], [4, '層次 4']], () => lv, v => lv = v, draw), check('測試超出範圍的問題：「我可以停藥嗎？」', () => test, v => test = v, draw)));
    $('#w-prompt').append(ctl, out); draw();
  })();

  // ================= P15 上下文 =================
  (function () {
    const P = { win: 8000, sys: 450, k: 5, chunk: 300, turns: 3, tool: 450, q: 30, outR: 1000, rerank: false, key: 'sys', pos: 50 }; const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; const k = P.rerank ? 5 : P.k, ret = k * P.chunk, avail = P.win - P.sys - ret - P.tool - P.q - P.outR, keep = Math.max(0, Math.min(P.turns, Math.floor(avail / 200))), drop = P.turns - keep, hist = keep * 200, used = P.sys + ret + hist + P.tool + P.q, free = Math.max(0, P.win - used - P.outR), over = P.sys + ret + P.tool + P.q + P.outR > P.win;
      const parts = [['System Prompt', P.sys, C.accent], [`召回段落 ${k}×${P.chunk}`, ret, C.amber], [`對話歷史 ${keep} 輪`, hist, C.blue], ['工具結果', P.tool, '#7c3aed'], ['提問', P.q, C.ink], ['預留輸出', P.outR, '#c9c4b8'], ['剩餘', free, '#eeebe4']];
      const bar = h('div', { style: { display: 'flex', height: '34px', borderRadius: '6px', overflow: 'hidden', border: '1px solid var(--line)' } }, parts.map(([n, v, c]) => h('div', { title: `${n} ${v}`, style: { width: Math.max(0, v) / P.win * 100 + '%', background: c, color: ['#c9c4b8', '#eeebe4'].includes(c) ? 'var(--ink)' : '#fff', fontSize: '11px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', whiteSpace: 'nowrap' } }, v / P.win > .09 ? n : '')));
      const lost = drop > 0 && P.key === 'hist';
      const cv = h('div'), G = Array.from({ length: 21 }, (_, i) => i * 5), f = x => .9 - .35 * Math.sin(Math.PI * x / 100); lc(cv, [{ pts: G.map(x => [x, f(x)]), color: C.accent, w: 2.4 }], { w: 360, h: 180, xmin: 0, xmax: 100, ymin: .4, ymax: 1, xt: [0, 50, 100], xfmt: t => t === 0 ? '開頭' : t === 50 ? '中間' : '結尾', yfmt: t => Math.round(t * 100) + '%', yl: '被用上的機率（示意）', over: [(sv, x, y) => U.s('circle', { cx: x(P.pos), cy: y(f(P.pos)), r: 7, fill: C.bad }, sv)] });
      out.append(bar, h('div', { style: { fontSize: '12px', color: 'var(--muted)', margin: '4px 0' } }, parts.slice(0, 6).map(([n, v, c]) => h('span', { style: { marginRight: '10px' } }, h('span', { style: { color: c } }, '■ '), `${n} ${v.toLocaleString()}`))),
        kpi(['上下文長度', P.win.toLocaleString()], ['已使用（含預留輸出）', (used + P.outR).toLocaleString(), over ? 'bad' : ''], ['被截掉的早期對話', drop + ' 輪', drop ? 'bad' : 'good']),
        nt(over ? '連固定部分（System Prompt＋召回段落＋工具結果＋預留輸出）都塞不下了——降低 Top-K 或開啟 Rerank。' : lost ? `對話歷史塞不下，最早的 ${drop} 輪被截掉——而「過敏史」就寫在第 1 輪，模型現在不知道了。★ 過敏、禁忌等關鍵資訊要固定寫在 System Prompt 裡。` : drop ? `最早的 ${drop} 輪對話被截掉（通常最早的先丟）。較好的做法：最近 N 輪＋一段摘要壓縮更早的內容。` : P.rerank ? '開啟 Rerank：先召回 20 段 → 精排 → 只取前 5 段送進去。比直接取 20 段便宜、也比直接取 5 段準確。' : `Top-K 從 5 調到 10，召回段落翻倍，品質未必變好。Dify 的 Tracing 會顯示每次實際送出的 token 組成——上線後定期看 context 有沒有悄悄變胖。`, over || lost ? 'bad' : drop ? 'warn' : ''),
        h('div', { class: 'grid2', style: { alignItems: 'center', marginTop: '8px' } }, cap(cv, 380), h('div', null, slider('關鍵資訊放在上下文的位置', 0, 100, 5, () => P.pos, v => P.pos = v, draw, v => v + '%'), nt(P.pos > 25 && P.pos < 75 ? '放在正中間：最容易被忽略（中間迷失，Liu et al., 2023）。' : '放在頭尾：比較不會被忽略。System Prompt 放最前、使用者提問放最後。', P.pos > 25 && P.pos < 75 ? 'warn' : '')))); }
    ctl.append(row(lbl('上下文長度'), seg([[8000, '8k'], [32000, '32k'], [128000, '128k']], () => P.win, v => P.win = v, draw), slider('Top-K', 1, 30, 1, () => P.k, v => P.k = v, draw), slider('每段 tokens', 100, 1000, 50, () => P.chunk, v => P.chunk = v, draw), check('Rerank（召回 20 → 取 5）', () => P.rerank, v => P.rerank = v, draw)), row(slider('對話歷史（輪，每輪約 200 tokens）', 0, 40, 1, () => P.turns, v => P.turns = v, draw), lbl('過敏史寫在'), seg([['sys', 'System Prompt'], ['hist', '第 1 輪對話']], () => P.key, v => P.key = v, draw)));
    $('#w-ctx').append(ctl, out, h('div', { class: 'concept' }, h('div', null, h('b', null, '① 對話歷史有策略地截斷'), '最近 N 輪＋摘要；關鍵資訊不能被截掉'), h('div', null, h('b', null, '② 召回段落要精不要多'), '召回 20 → Rerank → 取 5'), h('div', null, h('b', null, '③ 把能離線做的事移出上下文'), '查表、算術、格式驗證交給程式碼：LLM 做判斷，程式做計算'), h('div', null, h('b', null, '④ 監測實際用量'), 'Dify Tracing 看 token 組成與成本'))); draw();
  })();

  // ================= P16 紅線 =================
  U.sorter('#w-red', [['「高血壓的飲食要注意什麼？」', '可以回答', '衛教範圍內，結尾加免責聲明。'], ['「我這個藥可以配酒嗎？」', '拒答並轉介', '已接近用藥諮詢：回覆「請洽詢藥師或主治醫師」並提供聯絡管道；不要用 RAG 補一份交互作用表就當作可以回答。'], ['「幫我看看我這些症狀是不是中風？」', '拒答並轉介', '不得提供診斷：導向就醫建議（緊急症狀請立即就醫）。'], ['「降血壓藥一天吃幾顆？」', '拒答並轉介', '不得提供處方與劑量。'], ['「這是我阿公的病歷，幫我整理成摘要」（真實資料）', '不得處理', '不得使用真實個案資料，即使你有調閱權限。'], ['「長照 2.0 可以申請哪些服務？」', '可以回答', '依公開法規回答並標註來源。']], ['可以回答', '拒答並轉介', '不得處理'], '還有兩個容易忽略的問題：偏誤會被放大（模型對少數族群、罕見疾病一樣自信作答）；使用者會過度信任（流暢度與正確性完全無關）——設計上要標註來源、標示不確定、強制免責。');
  $('#w-bridge').append(tbl(['M7 原理', 'M8 應用'], [['Token 與 Tokenization', '估算成本與上下文上限'], ['Attention 與 Transformer', '理解為什麼上下文有限'], ['Embedding 與語意空間', '知識檢索節點的原理'], ['預訓練／微調／推論', 'Dify 只做推論，不訓練'], ['Temperature 等推論參數', '模型參數欄位怎麼設'], ['幻覺的成因', '為什麼要 RAG 與程式碼節點'], ['本地 vs 雲端部署', '敏感資料選 Ollama']]), nt('先學工具再學原理，你會變成「照抄設定值的人」；先學原理，你才知道為什麼要那樣設。下週 M8 W13：Dify 平台入門與提示詞工程——記得先把 Ollama 裝好。'));

  // ================= P17 作業 =================
  (function () {
    const st = Store.get('m7:bench', { m1: '雲端模型', m2: '本地模型（Ollama）', r: {} }); const out = h('div'), MK = ['✔', '△', '✘'];
    function draw() { out.innerHTML = ''; const n1 = h('input', { type: 'text', value: st.m1, style: { width: '160px' } }), n2 = h('input', { type: 'text', value: st.m2, style: { width: '180px' } }); n1.onchange = () => { st.m1 = n1.value; Store.set('m7:bench', st); draw(); }; n2.onchange = () => { st.m2 = n2.value; Store.set('m7:bench', st); draw(); };
      const t = h('table', { class: 'dt' }, h('tr', null, h('th', null, '#'), h('th', null, '問題（虛構，不用真實個案）'), h('th', null, st.m1), h('th', null, st.m2)), Array.from({ length: 10 }, (_, i) => { const r = st.r[i] || {}; const q = h('input', { type: 'text', value: r.q || '', placeholder: '例：失能等級第 4 級可以申請哪些服務？', style: { width: '100%', minWidth: '240px' } }); q.onchange = () => { st.r[i] = { ...(st.r[i] || {}), q: q.value }; Store.set('m7:bench', st); };
        const pick = k => h('td', null, h('div', { style: { display: 'flex', gap: '3px' } }, MK.map(m => { const b = h('button', { class: 'btn sm' + (r[k] === m ? ' on' : '') }, m); b.onclick = () => { st.r[i] = { ...(st.r[i] || {}), [k]: m }; Store.set('m7:bench', st); draw(); }; return b; })));
        return h('tr', null, h('td', null, i + 1), h('td', null, q), pick('a'), pick('b')); }));
      const cnt = k => MK.map(m => Object.values(st.r).filter(r => r[k] === m).length), c1 = cnt('a'), c2 = cnt('b');
      const btn = h('button', { class: 'btn primary sm', onclick: () => dl('M7_任務一_評測基準.csv', `#,問題,${st.m1},${st.m2}\n` + Array.from({ length: 10 }, (_, i) => { const r = st.r[i] || {}; return [i + 1, `"${(r.q || '').replace(/"/g, '""')}"`, r.a || '', r.b || ''].join(','); }).join('\n')) }, '下載 CSV');
      out.append(row(lbl('模型名稱：'), n1, n2, btn), h('div', { class: 'tscroll' }, t), kpi([st.m1 + '　✔／△／✘', c1.join(' ／ ')], [st.m2 + '　✔／△／✘', c2.join(' ／ ')]), nt('逐題標註：事實正確 ✔／部分正確 △／錯誤或編造 ✘。這 10 題就是你期末專題的專屬基準——比任何排行榜都有用。統計兩個模型的分布，寫 200 字比較。')); }
    $('#w-bench').append(out); draw();
  })();
  (function () {
    const st = Store.get('m7:hlog', {}); const out = h('div');
    function draw() { out.innerHTML = ''; const rows = [0, 1, 2].map(i => { const r = st[i] || { q: '', a: ['', '', '', '', ''] }; const q = h('input', { type: 'text', value: r.q, placeholder: ['例：本院心臟科週三下午門診時間？', '例：「長照 3.5 樂齡加給」怎麼申請？（虛構項目）', '例：某虛構藥品的建議劑量？'][i], style: { width: '100%' } }); q.onchange = () => { st[i] = { ...r, q: q.value }; Store.set('m7:hlog', st); draw(); };
        const ans = r.a.map((v, j) => { const e = h('input', { type: 'text', value: v, placeholder: `第 ${j + 1} 次`, style: { width: '100%' } }); e.onchange = () => { const a = r.a.slice(); a[j] = e.value; st[i] = { ...r, a }; Store.set('m7:hlog', st); draw(); }; return e; });
        const filled = r.a.filter(Boolean), uniq = new Set(filled.map(x => x.trim())).size, idk = filled.filter(x => /不知道|無法|查無|沒有.*資料|不確定/.test(x)).length;
        return h('div', { style: { border: '1px solid var(--line)', borderRadius: '10px', padding: '8px 10px', margin: '6px 0', background: '#fff' } }, h('b', null, `問題 ${i + 1}`), q, h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(5,1fr)', gap: '4px', marginTop: '4px' } }, ...ans), filled.length ? h('div', { style: { fontSize: '13px', marginTop: '4px', color: uniq > 1 ? 'var(--bad)' : 'var(--good)' } }, `已記錄 ${filled.length} 次：${uniq} 種不同答案${idk ? `；其中 ${idk} 次表示不知道` : '；沒有一次說不知道'}`) : ''); });
      const btn = h('button', { class: 'btn primary sm', onclick: () => dl('M7_任務二_幻覺觀察.csv', '問題,第1次,第2次,第3次,第4次,第5次\n' + [0, 1, 2].map(i => { const r = st[i] || { q: '', a: ['', '', '', '', ''] }; return [r.q, ...r.a].map(x => `"${(x || '').replace(/"/g, '""')}"`).join(','); }).join('\n')) }, '下載 CSV');
      out.append(row(btn), ...rows, nt('設計 3 個「知識庫外」的問題（模型應該不知道答案的），同一題問 5 次。觀察：它會說不知道，還是會編？答案一致嗎？寫 150 字說明你觀察到的幻覺樣態。')); }
    $('#w-hlog').append(out); draw();
  })();
  (function () {
    const T = [['任務一　建立你自己的模型評測基準（40%）', '期末專題領域 10 題 → 一個雲端（免費額度）＋一個本地（Ollama）各問一次 → 逐題 ✔／△／✘ → 統計分布、200 字比較', 'P11'], ['任務二　幻覺觀察（30%）', '3 個知識庫外的問題 → 觀察會說不知道還是會編 → 每題問 5 次看是否一致 → 150 字', 'P10'], ['任務三　Ollama 本地部署（30%）', '安裝 Ollama 並下載至少一個模型 → 截圖 ollama list 與一次成功的對話 → 100 字：本地與雲端的差異', 'P12']];
    const st = Store.get('m7:tasks', {}); const out = h('div');
    function draw() { out.innerHTML = ''; T.forEach(([t, d, p], i) => { const c = h('input', { type: 'checkbox' }); c.checked = !!st[i]; c.onchange = () => { st[i] = c.checked; Store.set('m7:tasks', st); draw(); }; out.append(h('label', { style: { display: 'flex', gap: '10px', padding: '8px 4px', borderBottom: '1px solid var(--line)', cursor: 'pointer' } }, c, h('div', { style: { flex: 1 } }, h('b', { style: { textDecoration: st[i] ? 'line-through' : 'none' } }, t), h('div', { style: { fontSize: '13.5px', color: 'var(--muted)' } }, d)), h('span', { class: 'tag gray', style: { alignSelf: 'flex-start' } }, p))); });
      out.append(h('p', { class: 'ai' }, `已完成 ${T.filter((_, i) => st[i]).length} / 3。繳交：PDF 一份（截圖與表格），檔名 M7_學號_姓名.pdf；W13 上課前。★ 不得使用任何真實病歷或個案資料，違者本次作業不計分。`)); }
    $('#w-tasks').append(out); draw();
  })();

  // ================= P18 =================
  U.flashcards('#w-cards', [['生成式模型', 'Generative Model', '學 P(x)，能產生新內容'], ['判別式模型', 'Discriminative Model', '學 P(y|x)，回答屬於哪一類'], ['GAN', 'Generative Adversarial Network', '生成器與鑑別器對抗'], ['VAE', 'Variational Autoencoder', '潛在空間編碼再解碼'], ['擴散模型', 'Diffusion Model', '從雜訊逐步去噪'], ['Transformer', 'Transformer', '注意力機制；所有 LLM 的底層'], ['注意力機制', 'Attention', '每個位置算關聯權重，不受距離衰減'], ['多頭注意力', 'Multi-Head Attention', '同時追蹤多種關係'], ['Token', 'Token', '模型處理文字的最小單位'], ['上下文長度', 'Context Window', '單次能處理的 token 上限'], ['嵌入', 'Embedding', '語意相近則向量相近'], ['餘弦相似度', 'Cosine Similarity', 'RAG 召回排序的指標'], ['向量資料庫', 'Vector Database', '存向量、做最近鄰搜尋'], ['Encoder-only', 'Encoder-only', 'BERT 系；嵌入與分類'], ['Decoder-only', 'Decoder-only', 'GPT 系；所有對話 LLM'], ['Encoder-Decoder', 'Encoder-Decoder', 'T5、BART；翻譯與摘要'], ['預訓練', 'Pretraining', '海量語料、成本極高'], ['微調', 'Fine-tuning', '在既有模型上再調權重'], ['推論', 'Inference', '呼叫模型；權重不變'], ['RLHF', 'RLHF', '以人類偏好優化輸出'], ['RAG', 'Retrieval-Augmented Generation', '先檢索再生成；可標來源'], ['Temperature', 'Temperature', '低溫可重現，高溫多樣'], ['核採樣', 'Top-p', '只從累積機率前 p 的候選取樣'], ['幻覺', 'Hallucination', '挑最像的，不是最對的'], ['推理模型', 'Reasoning Model', '先想再答；貴 5–20 倍'], ['多模態', 'Multimodal', '影像、音訊也能輸入'], ['量化', 'Quantization（GGUF）', '降低精度、縮小模型'], ['上下文工程', 'Context Engineering', '這幾千個 token 怎麼分配'], ['中間迷失', 'Lost in the Middle', '中間的資訊最容易被忽略'], ['重新排序', 'Rerank', '召回多段、精排取少數']]);
  U.finalQuiz('#w-final', [
    ['為什麼說生成式模型「編」是正常運作？', ['程式有 bug', '它本來就是學資料分布、產生新內容', '訓練資料太少', 'Temperature 太高'], 1, '產生沒見過的內容是設計目的。'],
    ['講義的月成本估算中，哪一項佔輸入最大宗？', ['System Prompt', '知識庫召回段落', '對話歷史', '使用者提問'], 1, '1,500 / 2,580 ≈ 58%。'],
    ['LLM 常數不清一句話有幾個字，根本原因是？', ['模型太小', '它看到的是 token 編號而不是字', '中文太難', 'Temperature 設錯'], 1, '一個 token 可能是半個詞或兩個字。'],
    ['上下文長度變 2 倍，注意力的計算量大約變？', ['2 倍', '4 倍', '不變', '一半'], 1, '計算量隨長度平方成長。'],
    ['RAG 系統裡，把段落轉成向量的通常是哪一種架構？', ['Decoder-only', 'Encoder-only', 'GAN', 'Diffusion'], 1, '生成答案才用 Decoder-only。'],
    ['cos(Q,A) = 0.985、閾值 0.5，段落 A 會？', ['被過濾', '被召回', '被改寫', '要人工判斷'], 1, '0.985 > 0.5。'],
    ['要讓模型回答最新版長照給付標準，首選？', ['重新預訓練', '微調', 'RAG', '調高 Temperature'], 2, '知識會變動 → RAG，且可標註來源。'],
    ['Temperature 設成 0，就不會產生幻覺了嗎？', ['會完全消除', '不會，只是穩定地挑同一個答案', '會變得更隨機', '會拒絕回答'], 1, '擋內容編造要靠 RAG。'],
    ['選模型的第一個問題應該是？', ['哪個排行榜最強', '資料能不能出機構', '哪個最便宜', '哪個最新'], 1, '不能出機構就直接排除雲端 API。'],
    ['一台 16 GB 筆電，最適合在本地跑的是？', ['70B 未量化', '7B–8B 的 4 位元量化版', '175B', '任何大小都行'], 1, '7B–8B 約需 8 GB 可用 RAM。'],
    ['提示詞「可以放進系統」的分界線是哪一層？', ['層次 1 直接提問', '層次 2 角色', '層次 3 結構與限制', '只有層次 4'], 2, '格式穩定、長度可控、危險內容被擋掉。'],
    ['「過敏史」只出現在第 1 輪對話，最大的風險是？', ['太貴', '對話變長後被截斷，模型不再知道', '模型會拒答', '沒有風險'], 1, '關鍵資訊要固定寫在 System Prompt。'],
  ]);
  (function () {
    const R = [['「編」是正常運作', '生成式學的是資料長什麼樣。', 'p02'], ['Token 決定一切', '帳單、上下文上限、數不清字數。', 'p04'], ['Attention 的代價', '連得上遠距離，計算量隨長度平方成長。', 'p05'], ['RAG 用兩種模型', 'Encoder 做嵌入、Decoder 做生成。', 'p06'], ['提示詞 → RAG → 微調', '讓模型懂你的領域的決策順序。', 'p08'], ['低溫擋不住編造', 'Temperature 穩定用詞；事實要靠 RAG。', 'p09'], ['資料能不能出機構', '選模型的第一個問題。', 'p11'], ['層次 3 才放得進系統', '差別在你給了多少約束。', 'p14'], ['四條紅線', '不診斷、不處方、不用真實資料、要免責。', 'p16']];
    const g = h('div', { class: 'grid3' }); R.forEach(([t, d, id], i) => g.append(h('a', { href: '#' + id, style: { textDecoration: 'none', color: 'inherit', border: '1px solid var(--line)', borderRadius: '10px', padding: '10px 12px', background: '#fff', display: 'block' } }, h('div', { class: 'mono', style: { color: 'var(--accent)', fontWeight: 700 } }, i + 1), h('b', null, t), h('div', { style: { fontSize: '13.5px', color: 'var(--muted)' } }, d))));
    $('#w-review').append(g, h('div', { class: 'note' }, h('b', null, '下一步：'), 'M8 Dify 應用開發：從 Chatbot 到 Agent。', h('a', { href: '../' }, '回到課程首頁 →')));
  })();
})();
