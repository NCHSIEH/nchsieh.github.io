/* M6 互動頁 B：PART 11–20 */
(function () {
  'use strict';
  const { h, $, S, C, rng, seg, slider, check, lc, Store } = U;
  const { cap, row, lbl, nt, ttl, kpi, tok, tbl, BASE, MED, PUNC, segment, tfidf, cos } = window.M6;
  const dl = (name, csv) => { const a = h('a', { href: URL.createObjectURL(new Blob(['﻿' + csv], { type: 'text/csv' })), download: name }); document.body.append(a); a.click(); a.remove(); };
  const COL = ['#0d6b67', '#b45309', '#2b6cb0', '#7c3aed', '#c0392b', '#2f7d4f'];

  // ================= P11 NMF =================
  (function () {
    const TOP = { 疼痛管理: '疼痛 止痛 不適 部位 加劇 止痛藥 評分 夜間'.split(' '), 飲食衛教: '飲食 鹽分 血壓 控制 蔬果 少油 體重 菜單'.split(' '), 照顧者支持: '家屬 照顧 負擔 喘息 服務 長照 申請 壓力'.split(' '), 傷口照護: '傷口 換藥 引流 癒合 感染 滲液 敷料 紅腫'.split(' ') };
    const TN = Object.keys(TOP), GEN = '病人 護理 衛教 說明 詢問'.split(' '), STOPW = '的 了 是 有 在 和 也'.split(' ');
    const r = rng(1111), RAW = Array.from({ length: 80 }, (_, i) => { const t = TN[i % 4], t2 = r() < .2 ? TN[(i + 1 + Math.floor(r() * 3)) % 4] : null, d = []; for (let k = 0; k < 6; k++) d.push(TOP[t][Math.floor(r() * 8)]); if (t2) for (let k = 0; k < 2; k++) d.push(TOP[t2][Math.floor(r() * 8)]); for (let k = 0; k < 2; k++) d.push(GEN[Math.floor(r() * 5)]); for (let k = 0; k < 4; k++) d.push(STOPW[Math.floor(r() * 7)]); return { d: d.sort(() => r() - .5), t }; });
    let K = 4, rmStop = true, useTfidf = true, seed = 1; const names = {}, ctl = h('div'), out = h('div');
    function nmf(V, K, it = 250) { const n = V.length, m = V[0].length, rr = rng(seed * 13); let W = Array.from({ length: n }, () => Array.from({ length: K }, () => rr() + .1)), H = Array.from({ length: K }, () => Array.from({ length: m }, () => rr() + .1)), e = 1e-9;
      for (let t = 0; t < it; t++) { const WtV = Array.from({ length: K }, (_, a) => Array.from({ length: m }, (_, j) => { let s = 0; for (let i = 0; i < n; i++) s += W[i][a] * V[i][j]; return s; })), WtW = Array.from({ length: K }, (_, a) => Array.from({ length: K }, (_, b) => { let s = 0; for (let i = 0; i < n; i++) s += W[i][a] * W[i][b]; return s; }));
        H = H.map((rw, a) => rw.map((v, j) => { let d = 0; for (let b = 0; b < K; b++) d += WtW[a][b] * H[b][j]; return v * WtV[a][j] / (d + e); }));
        const VHt = Array.from({ length: n }, (_, i) => Array.from({ length: K }, (_, a) => { let s = 0; for (let j = 0; j < m; j++) s += V[i][j] * H[a][j]; return s; })), HHt = Array.from({ length: K }, (_, a) => Array.from({ length: K }, (_, b) => { let s = 0; for (let j = 0; j < m; j++) s += H[a][j] * H[b][j]; return s; }));
        W = W.map((rw, i) => rw.map((v, a) => { let d = 0; for (let b = 0; b < K; b++) d += W[i][b] * HHt[b][a]; return v * VHt[i][a] / (d + e); })); } return { W, H }; }
    function draw() { out.innerHTML = ''; const docs = RAW.map(o => o.d.filter(t => !rmStop || !STOPW.includes(t))), T = tfidf(docs), V = useTfidf ? T.M : docs.map(d => T.V.map(t => d.filter(x => x === t).length)), R = nmf(V, K);
      const tops = R.H.map(hw => hw.map((v, j) => [T.V[j], v]).sort((a, b) => b[1] - a[1]).slice(0, 6)), asg = R.W.map(w => w.indexOf(Math.max(...w)));
      const purity = (() => { let s = 0; for (let k = 0; k < K; k++) { const c = {}; RAW.forEach((o, i) => { if (asg[i] === k) c[o.t] = (c[o.t] || 0) + 1; }); s += Math.max(0, ...Object.values(c)); } return s / RAW.length; })();
      const g = h('div', { class: 'grid2' }); tops.forEach((tw, k) => { const key = `${K}-${rmStop}-${useTfidf}-${k}`, inp = h('input', { type: 'text', value: names[key] || '', placeholder: '替這個主題命名', style: { width: '150px' } }); inp.oninput = () => names[key] = inp.value;
        const junk = tw.filter(([w]) => STOPW.includes(w) || GEN.includes(w)).length;
        g.append(h('div', { style: { border: '1px solid var(--line)', borderLeft: `4px solid ${COL[k % 6]}`, borderRadius: '8px', padding: '8px 10px', background: '#fff' } }, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('b', null, `主題 ${k + 1}（${asg.filter(a => a === k).length} 篇）`), inp), h('div', null, tw.map(([w]) => tok(w, { bg: STOPW.includes(w) ? '#f3f1ec' : GEN.includes(w) ? '#ece9e2' : undefined, c: STOPW.includes(w) ? 'var(--muted)' : undefined }))), junk >= 3 ? h('div', { style: { fontSize: '12px', color: 'var(--bad)' } }, '多半是停用詞或通用詞——說不出這是什麼主題') : '')); });
      out.append(h('div', { style: { fontSize: '13px', color: 'var(--muted)', marginBottom: '6px' } }, '例：', RAW.slice(0, 2).map(o => h('span', { class: 'mono', style: { marginRight: '12px' } }, '「' + o.d.join(' ') + '」'))), g,
        nt(!rmStop ? '停用詞沒去乾淨：主題裡塞滿「的、了、是」，每個主題都長得差不多。主題模型的結果品質，幾乎完全取決於前處理。' : K < 4 ? `主題數 ${K}：有些主題被併在一起了（看一個主題裡是否混了兩種東西）。` : K > 4 ? `主題數 ${K}：有主題被硬拆開，或出現由通用詞組成、說不出名字的主題。跟 M3 的 K 一樣沒有標準答案——跑 3～10 個，人工看哪一組最說得通。` : `主題數 4：看第一個主題的詞「${tops[0].slice(0, 4).map(t => t[0]).join('、')}」——你知道那是什麼，演算法不知道。命名需要領域知識，這正是護理背景的優勢。`, !rmStop ? 'bad' : K !== 4 ? 'warn' : ''),
        h('p', { class: 'ai' }, `這份虛構語料其實由 4 個主題產生；目前分群與真實主題的一致度 ${Math.round(purity * 100)}%（真實情況下你不會知道這個數字）。主題是統計模式，不是客觀事實：換主題數、換演算法結果就會變——當成探索的起點，不是結論。`)); }
    ctl.append(row(slider('主題數 K', 2, 6, 1, () => K, v => K = v, draw), check('去停用詞', () => rmStop, v => rmStop = v, draw), check('輸入用 TF-IDF（NMF 建議）', () => useTfidf, v => useTfidf = v, draw), h('button', { class: 'btn sm', onclick: () => { seed++; draw(); } }, '換起始值重跑')));
    $('#w-nmf').append(ctl, out, tbl(['演算法', '適合資料量', '特點', '注意'], [['NMF 非負矩陣分解', '< 1 萬篇', '★ 結果穩定、可重現；輸入用 TF-IDF', '主題數要自己指定'], ['LDA', '< 10 萬篇', '機率模型，一篇可屬於多個主題', '每次結果可能略有不同；輸入用詞頻'], ['BERTopic', '> 10 萬篇或短文本', '★ 用嵌入向量，能處理語意相近的表達', '需要算力；解釋性較弱']]), nt('三個常見誤用：① 資料量太小就跑（少於 200 篇多半是雜訊；50 份開放題直接人工讀完）② 沒做好前處理就跑 ③ 把主題當成客觀事實。', 'warn')); draw();
  })();

  // ================= P12 情感分析 =================
  (function () {
    const LEX = { 細心: 1, 親切: 1, 專業: 1, 乾淨: 1, 滿意: 1, 合理: 1, 清楚: 1, 久: -1, 太: -1, 吵: -1, 慢: -1, 混亂: -1, 貴: -1, 不耐煩: -1 };
    const ASP = [['護理人員', '護理態度'], ['護理師', '護理態度'], ['等待時間', '等待時間'], ['病房', '環境'], ['晚上', '環境'], ['醫師', '醫師說明'], ['批價', '行政流程'], ['費用', '費用']];
    const SEN = ['這次 住院 的 護理人員 很 細心 ， 不過 等待時間 實在 太 久 了 。', '病房 很 乾淨 ， 但是 晚上 很 吵 。', '醫師 說明 很 專業 ， 批價 櫃台 動線 混亂 。', '護理師 很 親切 ， 費用 也 合理 。'];
    let si = 0; const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; const T = SEN[si].split(' '), tot = S.sum(T.map(t => LEX[t] || 0));
      const clauses = []; let cur = []; T.forEach(t => { if (['，', '。', '不過', '但是', '但'].includes(t)) { if (cur.length) clauses.push(cur); cur = []; } else cur.push(t); }); if (cur.length) clauses.push(cur);
      const asp = clauses.map(c => { const a = ASP.find(([k]) => c.includes(k)); return { a: a ? a[1] : '（未指明）', sc: S.sum(c.map(t => LEX[t] || 0)), c }; });
      out.append(h('div', { style: { padding: '8px', background: '#fff', border: '1px solid var(--line)', borderRadius: '8px', marginBottom: '8px' } }, T.map(t => tok(t, LEX[t] > 0 ? { bg: '#d7ece9', b: true } : LEX[t] < 0 ? { bg: '#fbe3df', b: true } : ASP.some(([k]) => k === t) ? { bd: C.blue } : {}))),
        h('div', { class: 'grid3' }, h('div', { style: { border: '1px solid var(--line)', borderRadius: '10px', padding: '10px', background: '#fff' } }, h('b', null, '① 字典法：整句加總'), h('div', { class: 'mono', style: { fontSize: '13px', margin: '6px 0' } }, T.filter(t => LEX[t]).map(t => `${t} ${LEX[t] > 0 ? '+' : ''}${LEX[t]}`).join('　') || '（沒有情感詞）'), h('div', null, `總分 ${tot} → `, h('span', { class: 'tag ' + (tot > 0 ? 'good' : tot < 0 ? 'bad' : 'gray') }, tot > 0 ? '正面' : tot < 0 ? '負面' : '中性')), h('div', { style: { fontSize: '12.5px', color: 'var(--muted)', marginTop: '4px' } }, '看不出「對什麼」正負')),
          h('div', { style: { border: '1px solid var(--line)', borderRadius: '10px', padding: '10px', background: '#fff' } }, h('b', null, '② 傳統 ML：TF-IDF＋分類器'), h('div', { style: { fontSize: '13px', margin: '6px 0' } }, '需要幾百筆已標註的評論訓練；輸出整句一個正負機率。'), h('div', { style: { fontSize: '12.5px', color: 'var(--muted)' } }, '△ 看得出整體偏向，同樣分不出「對什麼」')),
          h('div', { style: { border: '2px solid ' + C.accent, borderRadius: '10px', padding: '10px', background: '#fff' } }, h('b', null, '③ 面向情感分析'), ...asp.map(o => h('div', { style: { display: 'flex', justifyContent: 'space-between', margin: '4px 0', fontSize: '14px' } }, h('span', null, o.a), h('span', { class: 'tag ' + (o.sc > 0 ? 'good' : o.sc < 0 ? 'bad' : 'gray') }, o.sc > 0 ? '正面' : o.sc < 0 ? '負面' : '中性'))), h('div', { style: { fontSize: '12.5px', color: 'var(--muted)' } }, '★ 知道哪個環節好、哪個該改'))),
        nt(`${tot <= 0 && asp.some(o => o.sc > 0) ? '字典法給整句「' + (tot < 0 ? '負面' : '中性') + '」——錯了：' : ''}這句話對「${asp.filter(o => o.sc > 0).map(o => o.a).join('、') || '—'}」是正面、對「${asp.filter(o => o.sc < 0).map(o => o.a).join('、') || '—'}」是負面。一句話裡通常同時誇跟罵，所以滿意度開放題要做面向情感分析。`), h('p', { class: 'ai' }, '本頁的面向分析是示意：以逗號與轉折詞切成子句、子句內找面向詞與情感詞。實務上用現代模型＋指定面向（M7），能處理更複雜的句子。')); }
    ctl.append(row(lbl('句子'), seg(SEN.map((s, i) => [i, s.replace(/ /g, '').slice(0, 12) + '…']), () => si, v => si = v, draw)));
    $('#w-senti').append(ctl, out); draw();
  })();

  // ================= P13 NER =================
  (function () {
    const DEF = '王小明先生於2027年3月5日至臺北護理健康大學附設醫院就診，診斷為第二型糖尿病，處方Metformin 500mg每日兩次。病歷號A123456，聯絡電話0912-345-678。家屬陳美華女士陪同，主訴口渴、多尿。';
    const DIAG = ['第二型糖尿病', '高血壓', '慢性腎臟病', '心房顫動', '慢性阻塞性肺病', '肺炎'], SUR = ['林志強', '張雅婷', '黃建宏', '吳淑芬'];
    const RULES = [['PER', '姓名', /([王陳林張李黃吳劉蔡楊許鄭謝郭洪][一-鿿]{1,2})(?=先生|女士|小姐)/g, C.bad], ['DATE', '日期', /\d{4}年\d{1,2}月\d{1,2}日/g, C.amber], ['ORG', '機構', /[一-鿿]{2,14}(?:醫院|診所)/g, C.blue], ['ID', '病歷號', /[A-Z]\d{6}/g, C.bad], ['TEL', '電話', /09\d{2}-\d{3}-\d{3}/g, C.bad], ['DRUG', '藥物', /[A-Z][a-z]+ ?\d+ ?mg/g, '#7c3aed'], ['DIAG', '診斷', new RegExp(DIAG.join('|'), 'g'), C.accent]];
    let text = DEF, mode = 'tag'; const ctl = h('div'), out = h('div'), ta = h('textarea', { rows: 3, style: { width: '100%', padding: '8px', fontSize: '14px' } }); ta.value = DEF; ta.oninput = () => { text = ta.value; draw(); };
    function draw() { out.innerHTML = ''; const ents = []; RULES.forEach(([k, n, re, c]) => { re.lastIndex = 0; let m; while ((m = re.exec(text))) { const s = m[1] || m[0], st = m.index; if (!ents.some(e => st < e.st + e.s.length && e.st < st + s.length)) ents.push({ k, n, s, st, c }); } }); ents.sort((a, b) => a.st - b.st);
      const pmap = {}; let pi = 0; const sur = e => { if (e.k === 'PER') { if (!pmap[e.s]) pmap[e.s] = SUR[pi++ % SUR.length]; return pmap[e.s]; } if (e.k === 'DATE') { const m = e.s.match(/(\d{4})年/); return `${m[1]}年[日期]`; } if (e.k === 'ID') return 'Z' + String(100000 + (e.s.charCodeAt(1) * 7919) % 900000); if (e.k === 'TEL') return '09XX-XXX-XXX'; if (e.k === 'ORG') return '[某醫院]'; return e.s; };
      const sens = ['PER', 'DATE', 'ID', 'TEL', 'ORG'], parts = []; let p = 0; ents.forEach(e => { parts.push(text.slice(p, e.st)); const isS = sens.includes(e.k); const show = mode === 'tag' ? e.s : mode === 'redact' && isS ? `[${e.n}]` : mode === 'sur' && isS ? sur(e) : e.s; parts.push(h('span', { style: { background: mode === 'tag' || !isS ? e.c + '22' : '#e9e6df', borderBottom: `2px solid ${e.c}`, padding: '0 2px', borderRadius: '3px' } }, show, mode === 'tag' ? h('sub', { style: { fontSize: '10px', color: e.c, marginLeft: '2px' } }, e.k) : '')); p = e.st + e.s.length; }); parts.push(text.slice(p));
      out.append(h('div', { style: { padding: '10px', background: '#fff', border: '1px solid var(--line)', borderRadius: '8px', lineHeight: '2', fontSize: '15px' } }, ...parts), h('div', { class: 'grid2', style: { marginTop: '8px' } }, tbl(['欄位', '值', '類型'], ents.map(e => [e.n, e.s, h('span', { style: { color: e.c, fontWeight: 700 } }, e.k)])),
        nt(mode === 'tag' ? '通用 NER 認得人名、日期、機構；診斷、藥物、劑量要用醫療專用模型或自訂規則。抽出來的欄位就能統計、查詢——這是病歷結構化。' : mode === 'redact' ? '遮蔽：直接換成 [姓名]、[日期]。簡單安全，但失去「同一個人」的關聯。' : '代換：換成假的但格式一致的值；同一個人在全文中換成同一個假名（研究用途多半選代換，以保留關聯）。日期只保留年；89 歲以上年齡要合併。', mode === 'tag' ? '' : 'warn'))); }
    ctl.append(ta, row(seg([['tag', '① 標記實體'], ['redact', '② 遮蔽 Redaction'], ['sur', '③ 代換 Surrogate']], () => mode, v => mode = v, draw), h('button', { class: 'btn sm', onclick: () => { ta.value = DEF; text = DEF; draw(); } }, '↺ 範例文字')));
    $('#w-ner').append(ctl, out, h('p', { class: 'ai' }, '本頁為規則式（正規表示式＋詞典）示範，範例為虛構。實務可用 ckiplab/bert-base-chinese-ner 等模型。HIPAA Safe Harbor 列出 18 類識別資訊；台灣另依個資法、人體研究法與 IRB。')); draw();
  })();

  // ================= P14 任務地圖 =================
  U.sorter('#w-taskmap', [['有 800 筆已標註的異常通報，要自動分類，且要能說明依據', '傳統（TF-IDF＋ML）', '有標註、要解釋、不用 GPU。'], ['沒有任何標註，想先把諮詢紀錄分成「醫療品質／行政流程／環境」', '現代（零樣本）', '只要想出類別名稱就能開始。'], ['把長篇交班紀錄濃縮成三句摘要', '現代（生成）', '傳統做不到；摘要可能加入原文沒有的內容，必須人工覆核。'], ['3,000 則問卷開放題，想知道大家在講什麼', '兩者皆可', '小資料 NMF；大資料或短句 BERTopic。'], ['從病歷抽出藥名與診斷', '兩者皆可', '規則＋詞典可起步；醫療 NER 模型更完整。'], ['判斷「否認胸痛」「疑似肺炎」這類否定與不確定語句', '現代（懂語序）', '詞袋處理不了；或先用否定規則補強。']], ['傳統（TF-IDF＋ML）', '現代（零樣本）', '現代（生成）', '現代（懂語序）', '兩者皆可'], '不要預設新的比較好：醫療場域要能解釋判斷依據時，傳統方法反而是正解。');

  // ================= P15 相似度 =================
  (function () {
    const N = ['傷口滲液增加，予以換藥', '傷口乾淨無滲液，換藥後覆蓋', '主訴傷口疼痛，給予止痛藥', '家屬詢問出院後照顧方式', '已完成出院衛教，家屬了解'], SW = new Set(['後', '已', '無', '予以', '給予', '的']);
    const prep = t => segment(t, BASE).filter(w => !PUNC.has(w) && !SW.has(w));
    let q = '病人出院前家屬想了解怎麼照顧', th = .3; const ctl = h('div'), out = h('div'), inp = h('input', { type: 'text', style: { width: '100%', maxWidth: '420px', padding: '6px 8px' } }); inp.value = q; inp.oninput = () => { q = inp.value; draw(); };
    function draw() { out.innerHTML = ''; const docs = N.map(prep), T = tfidf(docs), M = T.M, Sm = M.map(a => M.map(b => cos(a, b)));
      const qt = prep(q), qv = T.V.map((w, j) => qt.filter(x => x === w).length * T.idf[j]), qs = M.map(v => cos(qv, v)), rank = qs.map((v, i) => [v, i]).sort((a, b) => b[0] - a[0]);
      const grp = N.map((_, i) => i); for (let i = 0; i < 5; i++) for (let j = i + 1; j < 5; j++) if (Sm[i][j] >= th) { const a = grp[i], b = grp[j]; grp.forEach((g, k) => { if (g === b) grp[k] = a; }); }
      const gids = [...new Set(grp)];
      const t = h('table', { class: 'dt' }, h('tr', null, h('th', null, ''), N.map((_, i) => h('th', { style: { textAlign: 'center' } }, 'N' + (i + 1)))), Sm.map((r, i) => h('tr', null, h('td', { style: { fontWeight: 700, whiteSpace: 'nowrap' } }, `N${i + 1}`), r.map((v, j) => h('td', { style: { textAlign: 'center', fontFamily: 'var(--mono)', background: `rgba(13,107,103,${i === j ? .1 : v * .85})`, color: v > .5 && i !== j ? '#fff' : 'var(--ink)', outline: i !== j && v >= th ? '2px solid ' + C.amber : '', outlineOffset: '-2px' } }, v.toFixed(2))))));
      out.append(h('div', { class: 'grid2' }, h('div', null, N.map((n, i) => h('div', { style: { fontSize: '14px', padding: '3px 0' } }, h('b', { style: { color: COL[gids.indexOf(grp[i]) % 6] } }, `N${i + 1}　`), n, h('span', { class: 'mono', style: { fontSize: '12px', color: 'var(--muted)', marginLeft: '6px' } }, prep(n).join('｜')))), h('div', { style: { marginTop: '6px', fontSize: '13px' } }, `相似度 ≥ ${th} 就併成一群 → ${gids.length} 群：`, gids.map((g, k) => h('span', { class: 'tag', style: { marginRight: '4px', background: COL[k % 6] + '22', color: COL[k % 6] } }, N.map((_, i) => grp[i] === g ? 'N' + (i + 1) : null).filter(Boolean).join('、'))))), h('div', { class: 'tscroll' }, t)),
        h('div', { style: { marginTop: '10px' } }, ttl('檢索：輸入一個問題，找最相近的紀錄'), h('div', null, inp), h('div', { style: { fontSize: '12.5px', color: 'var(--muted)', margin: '4px 0' } }, '斷詞後：' + (qt.join('｜') || '—')), ...rank.slice(0, 3).map(([v, i], k) => h('div', { style: { fontSize: '14px', padding: '2px 0' } }, `${k + 1}. N${i + 1}「${N[i]}」　`, h('b', { class: 'mono' }, v.toFixed(3))))),
        nt(rank[0][0] === 0 ? '查詢裡沒有任何詞出現在這五筆紀錄中——TF-IDF 只認得「一模一樣的詞」，不懂「醫生」和「醫師」是同一件事。M7 的嵌入向量解決的就是這個。' : '整個過程只用到 TF-IDF 向量之間的距離，不需要任何標籤。把問題與文件都變成向量、找最近的——這就是 M8「知識檢索」的原型，只是那裡改用嵌入向量。', rank[0][0] === 0 ? 'warn' : '')); }
    ctl.append(row(slider('分群門檻', .1, .8, .05, () => th, v => th = v, draw, v => (+v).toFixed(2))));
    $('#w-sim').append(ctl, out, h('p', { class: 'ai' }, '本頁用迷你斷詞器即時計算，數值會與講義圖略有不同；實務用途：找重複（複製貼上）的紀錄、把幾千筆通報自動分群、找相似個案。')); draw();
  })();

  // ================= P16 Kappa =================
  (function () {
    const V = [35, 10, 5, 50]; const ctl = h('div'), out = h('div');
    function draw() { out.innerHTML = ''; const [a, b, c, d] = V, n = a + b + c + d || 1, po = (a + d) / n, pe = ((a + b) * (a + c) + (c + d) * (b + d)) / (n * n), k = pe < 1 ? (po - pe) / (1 - pe) : 1;
      const lv = k < .2 ? ['極差', C.bad] : k <= .4 ? ['尚可', C.amber] : k <= .6 ? ['中等', C.amber] : k <= .8 ? ['良好', C.good] : ['極佳', C.accent];
      const cell = (i, bg) => { const e = h('input', { type: 'number', min: 0, value: V[i], style: { width: '64px', textAlign: 'center', background: bg } }); e.onchange = () => { V[i] = Math.max(0, +e.value || 0); draw(); }; return h('td', null, e); };
      const t = h('table', { class: 'dt', style: { maxWidth: '360px' } }, h('tr', null, h('th', null, ''), h('th', null, 'B：是'), h('th', null, 'B：否'), h('th', null, '合計')), h('tr', null, h('th', null, 'A：是'), cell(0, '#e1f1e6'), cell(1, '#fbe3df'), h('td', { class: 'num' }, a + b)), h('tr', null, h('th', null, 'A：否'), cell(2, '#fbe3df'), cell(3, '#e1f1e6'), h('td', { class: 'num' }, c + d)), h('tr', null, h('th', null, '合計'), h('td', { class: 'num' }, a + c), h('td', { class: 'num' }, b + d), h('td', { class: 'num' }, n)));
      const bar = h('div'), sv = U.svgBox(bar, 420, 54), x = U.scale(0, 1, 10, 410); [[0, .2, '極差'], [.2, .4, '尚可'], [.4, .6, '中等'], [.6, .8, '良好'], [.8, 1, '極佳']].forEach(([s, e, l], i) => { U.s('rect', { x: x(s), y: 10, width: x(e) - x(s) - 1, height: 18, fill: ['#e8b4ab', '#f1d3a9', '#f6e3c8', '#bfe0c9', '#9fd0c9'][i] }, sv); U.s('text', { x: (x(s) + x(e)) / 2, y: 44, 'text-anchor': 'middle', text: l, style: 'font-size:11px' }, sv); }); U.s('path', { d: `M${x(Math.max(0, k))},6 l-6,-6 h12 z`, fill: C.ink }, sv);
      out.append(h('div', { class: 'grid2', style: { alignItems: 'center' } }, t, h('div', { class: 'note', style: { fontFamily: 'var(--mono)', fontSize: '13.5px' } }, h('div', null, `觀察一致率 Po = (${a}+${d}) / ${n} = ${po.toFixed(3)}`), h('div', null, `期望一致率 Pe = (${a + b}×${a + c} + ${c + d}×${b + d}) / ${n}² = ${pe.toFixed(3)}`), h('div', { style: { fontWeight: 700, fontSize: '15px' } }, `κ = (${po.toFixed(3)} − ${pe.toFixed(3)}) / (1 − ${pe.toFixed(3)}) = ${k.toFixed(3)}`))),
        kpi(['Cohen\'s κ', k.toFixed(3), k > .6 ? 'good' : 'bad'], ['等級（Landis & Koch, 1977）', lv[0]]), cap(bar, 440), nt(k < .6 ? `κ = ${k.toFixed(2)}，低於 0.60：先別急著訓練模型，回頭修標註手冊（每個類別的定義、正例、反例、模稜兩可時怎麼辦），兩人再標一輪。` : `一致率 ${Math.round(po * 100)}% 聽起來很高，但兩人各依自己的比例隨機標也會有 ${Math.round(pe * 100)}% 一致；扣掉之後 κ = ${k.toFixed(3)}。`, k < .6 ? 'warn' : '')); }
    ctl.append(row(h('button', { class: 'btn sm', onclick: () => { V.splice(0, 4, 35, 10, 5, 50); draw(); } }, '講義例子'), h('button', { class: 'btn sm', onclick: () => { V.splice(0, 4, 18, 27, 22, 33); draw(); } }, '兩人各自隨機標'), h('button', { class: 'btn sm', onclick: () => { V.splice(0, 4, 8, 4, 6, 82); draw(); } }, '陽性很少時')));
    $('#w-kappa').append(ctl, out, h('div', { class: 'concept' }, h('div', null, h('b', null, '① 先寫標註手冊'), '定義、正例、反例、邊界案例怎麼辦'), h('div', null, h('b', null, '② 兩人先標 50–100 筆算 κ'), '低於 0.6 先停下來修手冊'), h('div', null, h('b', null, '③ 不一致找第三人仲裁'), '結果回饋進手冊；爭議清單最有研究價值'), h('div', null, h('b', null, '④ 記錄誰標、何時標'), '疲勞影響品質：每 50 筆一批、中間休息'))); draw();
  })();

  // ================= P17 =================
  U.sorter('#w-chal', [['「否認胸痛」與「胸痛」在向量上幾乎一樣', '否定與不確定', '否定偵測規則（NegEx）或懂上下文的模型。'], ['「疑似肺炎」被當成確診', '否定與不確定', '不確定語氣也要標記。'], ['BP、血壓、Blood Pressure 被當成三個詞', '縮寫與同義詞', '建同義詞對照表，前處理時歸一。'], ['「二尖瓣脫垂」被切成二／尖／瓣／脫垂', '專有名詞被切碎', '★ 自訂詞典。'], ['紀錄裡有病人姓名與病歷號', '個資與去識別化', '先用 NER 找出來遮蔽或代換，再做任何分析。'], ['HTN 和高血壓分開計數', '縮寫與同義詞', '同義詞歸一。']], ['否定與不確定', '縮寫與同義詞', '專有名詞被切碎', '個資與去識別化']);

  // ================= P18 =================
  $('#w-apps').append(tbl(['應用', '用到的技術', '資料來源', '難度'], [['病人滿意度開放題分析', '★ 面向情感分析＋主題模型', '院內調查（需去識別化）或公開評論', '中'], ['異常事件通報自動分類', '斷詞＋TF-IDF＋分類器（或零樣本）', '通報敘述欄；可先用虛構資料建模', '中'], ['★ 衛教需求盤點', '主題模型＋詞頻分析', '線上問答平台的公開提問', '低'], ['護理紀錄品質稽核', '文件相似度（找複製貼上）＋規則檢查', '護理紀錄（需去識別化）', '中'], ['★ 文獻回顧輔助', '關鍵詞抽取＋文件分群＋摘要', 'PubMed 等公開資料庫', '低'], ['★ 長照個案需求分析', 'NER＋分群', '長照公開問答與法規文件', '中']]), nt('標星號的三項資料完全公開，沒有個資問題，最適合當作期末專題或第一個練手的題目。完整案例：星等只告訴你「4.2 分、比上月降 0.3」；加上主題模型與面向情感分析，就能說出「等待時間的負面比例從 12% 升到 31%，問題在動線與排程，不在人員態度」。'));
  (function () {
    const Q = [['① 資料拿得到嗎？合法嗎？', 'IRB、資料使用同意、去識別化通常比分析更花時間；先用公開資料把方法跑通', true], ['② 資料量夠嗎？', '分類要幾百筆有標註；主題模型要幾百篇；少於 100 筆人工讀完比較快', true], ['③ 我要的答案真的需要文字分析嗎？', '有時一個結構化欄位就能回答；先問「這個答案會改變什麼決策」', false], ['④ 結果要給誰看？看得懂嗎？', '給臨床看的要能解釋為什麼——會影響你選哪一代方法', false], ['⑤ 錯了會怎樣？', '高風險場景要留人工覆核；設計時就想好判錯的那幾筆誰會發現', false]];
    const A = {}; const out = h('div');
    function draw() { out.innerHTML = ''; Q.forEach(([q, d, gate], i) => out.append(h('div', { style: { display: 'flex', gap: '10px', alignItems: 'center', padding: '7px 4px', borderBottom: '1px solid var(--line)' } }, h('div', { style: { flex: 1 } }, h('b', null, q), gate ? h('span', { class: 'tag amber', style: { marginLeft: '6px' } }, '門檻題') : '', h('div', { style: { fontSize: '13px', color: 'var(--muted)' } }, d)), ...['是', '否'].map(v => { const b = h('button', { class: 'btn sm' + (A[i] === v ? ' on' : '') }, v); if (A[i] === v && v === '否') b.style.cssText = 'background:var(--bad);color:#fff;border-color:var(--bad)'; b.onclick = () => { A[i] = v; draw(); }; return b; }))));
      const fail = [0, 1].filter(i => A[i] === '否'), done = Object.keys(A).length === 5;
      out.append(nt(fail.length ? `${fail.map(i => Q[i][0].slice(0, 1)).join('、')} 沒過——這兩題決定「做不做得成」，過不了就換題目，不要硬做。這不是失敗，是務實。` : done ? (A[2] === '否' ? '第 ③ 題答「否」：也許不需要文字分析——先確認一個結構化欄位能不能回答。' : '五題都想過了，可以開始。這五題不只適用於文字探勘，任何資料科學專案開始前都值得問一遍。') : '逐題回答。', fail.length ? 'bad' : done ? '' : 'warn')); }
    $('#w-five').append(out); draw();
  })();

  // ================= P19 =================
  (function () {
    const steps = ['開啟「1 Creating Text objects」，看 Text 物件怎麼建立', '執行「7 Processing Text and Document Objects」', '★ 逐一開關 Tokenize／Filter Stopwords／Stem，觀察詞表變化', '執行 Case Study 1：讀檔 → 前處理 → 向量化 → 分類', 'Process Documents 的向量化從 TF-IDF 改成 Term Occurrences，比較準確率', '★ 檢查混淆矩陣：正負評論數量是否平衡？Recall 各是多少？', 'Case Study 3 加了 Lemmatizer，比較提升多少（對英文有效、對中文無效）'];
    const st = Store.get('m6:labs', {}); const out = h('div');
    function draw() { out.innerHTML = ''; steps.forEach((s, i) => { const c = h('input', { type: 'checkbox' }); c.checked = !!st[i]; c.onchange = () => { st[i] = c.checked; Store.set('m6:labs', st); draw(); }; out.append(h('label', { style: { display: 'flex', gap: '8px', padding: '4px 0', fontSize: '14px', cursor: 'pointer' } }, c, h('span', { style: { textDecoration: c.checked ? 'line-through' : 'none' } }, `${i + 1}. ${s}`))); });
      out.append(h('div', { class: 'mono', style: { fontSize: '12px', color: 'var(--muted)' } }, 'Repository ▸ 7. Text Mining/ 1 Creating Text objects.rmp、1.2 amazon_alexa.csv、7 Processing Text and Document Objects.rmp、Case Study 1／3；另有 Spam Email Classification.rmp（4. Case Studies，對應 P09 手算）、3 Document Similarity and Clustering.rmp（對應 P15）'), nt('預期：前處理每開一個運算子，詞表會明顯變小；TF-IDF 通常略優於單純詞頻；類別若不平衡，準確率會虛高。')); }
    $('#w-labs').append(out); draw();
  })();
  (function () {
    const M = ['(a) 完全不做前處理', '(b) 只斷詞', '(c) 斷詞＋去停用詞', '(d) 斷詞＋去停用詞＋詞形還原'], st = Store.get('m6:t1', {}); const out = h('div');
    function draw() { out.innerHTML = ''; const v = (i, k) => { const x = (st[i] || {})[k]; return x === '' || x == null ? null : +x; };
      const t = h('table', { class: 'dt' }, h('tr', null, ['設定', '準確率', 'Recall', 'F1', '與前一組相比（F1）'].map(c => h('th', null, c))), M.map((m, i) => { const inp = k => { const e = h('input', { type: 'number', step: 'any', value: (st[i] || {})[k] ?? '', style: { width: '84px' } }); e.onchange = () => { st[i] = { ...(st[i] || {}), [k]: e.value }; Store.set('m6:t1', st); draw(); }; return h('td', null, e); }; const d = i && v(i, 'f1') != null && v(i - 1, 'f1') != null ? v(i, 'f1') - v(i - 1, 'f1') : null;
        return h('tr', null, h('td', { style: { fontWeight: 600 } }, m), inp('acc'), inp('rec'), inp('f1'), h('td', { class: 'num ' + (d == null ? '' : d < 0 ? 'hl' : '') }, d == null ? '—' : (d > 0 ? '+' : '') + d.toFixed(3))); }));
      const ds = [1, 2, 3].map(i => v(i, 'f1') != null && v(i - 1, 'f1') != null ? [i, v(i, 'f1') - v(i - 1, 'f1')] : null).filter(Boolean);
      const msg = ds.length ? (() => { const b = ds.reduce((a, c) => c[1] > a[1] ? c : a), w = ds.filter(c => c[1] < 0); return `提升最大的一步：${M[b[0]]}（F1 ${b[1] >= 0 ? '+' : ''}${b[1].toFixed(3)}）。${w.length ? `反而變差的：${w.map(c => M[c[0]]).join('、')}——想想為什麼（例如停用詞表刪掉了否定詞？）。` : ''}寫進那 200 字。`; })() : '填入四組實驗的結果（0–1）。其他條件固定，只改前處理。';
      const btn = h('button', { class: 'btn primary sm', onclick: () => dl('M6_任務一_前處理實驗.csv', '設定,準確率,Recall,F1\n' + M.map((m, i) => { const r = st[i] || {}; return [`"${m}"`, r.acc ?? '', r.rec ?? '', r.f1 ?? ''].join(','); }).join('\n')) }, '下載 CSV');
      out.append(row(btn, h('button', { class: 'btn sm', onclick: () => { M.forEach((_, i) => delete st[i]); Store.set('m6:t1', st); draw(); } }, '清除')), h('div', { class: 'tscroll' }, t), nt(msg)); }
    $('#w-t1').append(out); draw();
  })();
  (function () {
    const st = Store.get('m6:t2', { s: '病人主訴二尖瓣脫垂合併心房顫動\n病人有壓力性損傷需要換藥', d: '二尖瓣脫垂\n心房顫動\n壓力性損傷' }); const out = h('div');
    const ts = h('textarea', { rows: 6, style: { width: '100%', padding: '6px', fontSize: '14px' } }), td = h('textarea', { rows: 6, style: { width: '100%', padding: '6px', fontSize: '14px' } }); ts.value = st.s; td.value = st.d;
    const save = () => { st.s = ts.value; st.d = td.value; Store.set('m6:t2', st); draw(); }; ts.oninput = save; td.oninput = save;
    function draw() { out.innerHTML = ''; const S1 = st.s.split('\n').map(x => x.trim()).filter(Boolean), D = st.d.split('\n').map(x => x.trim()).filter(Boolean), R = S1.map(s => [s, segment(s, BASE).join('／'), segment(s, [...BASE, ...D]).join('／')]);
      const btn = h('button', { class: 'btn primary sm', onclick: () => dl('M6_任務二_斷詞前後對照.csv', '句子,預設詞典,加入自訂詞典\n' + R.map(r => r.map(x => `"${x}"`).join(',')).join('\n')) }, '下載 CSV');
      out.append(row(btn, h('span', { style: { fontSize: '13px', color: 'var(--muted)' } }, `${S1.length} 句（作業要 10 句）；自訂詞典 ${D.length} 個詞（作業至少 15 個）`)), tbl(['句子', '只用基本詞典', '加入自訂詞典'], R)); }
    $('#w-t2').append(h('div', { class: 'grid2' }, h('label', { style: { fontSize: '13px' } }, '句子（一行一句，虛構）', ts), h('label', { style: { fontSize: '13px' } }, '自訂詞典（一行一詞）', td)), out); draw();
  })();
  (function () {
    const T = [['任務一　前處理的影響實驗（40%）', 'amazon_alexa.csv（或公開中文評論）：讀檔 → 前處理 → TF-IDF → Naive Bayes；四組只改前處理；記錄準確率、Recall、F1；200 字', 'P02、P09'], ['任務二　中文斷詞與自訂詞典（35%）', '自寫 10 句含醫護術語的虛構句子 → jieba 預設斷詞 → 自訂詞典至少 15 個詞重新斷詞 → 前後對照表＋150 字', 'P03'], ['任務三　主題模型探索（25%）', '公開中文評論或問卷開放題（≥ 300 筆）→ NMF（Python）或 AI Studio LDA，主題數 3、5、8 → 人工命名並說明依據 → 150 字', 'P11']];
    const st = Store.get('m6:tasks', {}); const out = h('div');
    function draw() { out.innerHTML = ''; T.forEach(([t, d, p], i) => { const c = h('input', { type: 'checkbox' }); c.checked = !!st[i]; c.onchange = () => { st[i] = c.checked; Store.set('m6:tasks', st); draw(); }; out.append(h('label', { style: { display: 'flex', gap: '10px', padding: '8px 4px', borderBottom: '1px solid var(--line)', cursor: 'pointer' } }, c, h('div', { style: { flex: 1 } }, h('b', { style: { textDecoration: st[i] ? 'line-through' : 'none' } }, t), h('div', { style: { fontSize: '13.5px', color: 'var(--muted)' } }, d)), h('span', { class: 'tag gray', style: { alignSelf: 'flex-start' } }, p))); });
      out.append(h('p', { class: 'ai' }, `已完成 ${T.filter((_, i) => st[i]).length} / 3。繳交：PDF 一份（流程截圖與結果表），檔名 M6_學號_姓名.pdf；W12 上課前。★ 一律使用公開資料集或虛構資料。`)); }
    $('#w-tasks').append(out); draw();
  })();

  // ================= P20 =================
  $('#w-repr').append(tbl(['面向', '詞頻／TF-IDF（M6）', '詞向量 Word2Vec', '上下文向量 BERT（M7）'], [['維度', '幾千～幾萬（稀疏）', '300 左右（稠密）', '768 以上（稠密）'], ['同義詞', '★ 視為完全無關', '位置相近', '位置相近'], ['一詞多義', '無法區分', '★ 無法區分', '★ 可區分（依上下文）'], ['語序', '丟失（N-gram 可部分補救）', '丟失', '★ 完整保留'], ['可解釋性', '★ 高：每一維就是一個詞', '中', '低'], ['算力需求', '★ 極低', '低', '高']]), nt('M6 → M7 → M8 是同一條線：Tokenization 是斷詞的進階版、Embedding 是 TF-IDF 的進階版；M8 的 RAG 就是文件檢索、切塊就是文本前處理、召回就是相似度計算。不是越新越好，是看你的限制條件在哪。'));
  U.flashcards('#w-cards', [['自然語言處理', 'NLP', '讓電腦處理人類語言'], ['文字探勘', 'Text Mining', '從文字萃取資訊與模式'], ['語料庫', 'Corpus', '分析用的文本集合'], ['斷詞', 'Word Segmentation', '中文無空格而特別困難'], ['自訂詞典', 'User Dictionary', '補上斷詞器沒收錄的術語'], ['停用詞', 'Stop Words', '注意否定詞常誤列其中'], ['詞形還原', 'Lemmatization', 'running → run；英文用'], ['詞性標註', 'POS Tagging', '標記名詞、動詞'], ['向量化', 'Vectorization', '文字變數值'], ['詞袋模型', 'Bag of Words', '只計次數、不管語序'], ['文件—詞矩陣', 'DTM', '列＝文件、欄＝詞'], ['TF-IDF', 'TF-IDF', '詞頻 × 逆文件頻率'], ['稀疏矩陣', 'Sparse Matrix', '絕大多數是 0'], ['N-gram', 'N-gram', '連續 N 個詞，部分保留語序'], ['否定偵測', 'Negation Detection', 'NegEx：NEG_ 前綴'], ['樸素貝氏', 'Naive Bayes', '假設詞彼此獨立'], ['Laplace 平滑', 'Laplace Smoothing', '分子加 1，避免機率為 0'], ['主題模型', 'Topic Modeling', '沒有標籤的文字找主題'], ['非負矩陣分解', 'NMF', '文件—主題 × 主題—詞'], ['LDA', 'Latent Dirichlet Allocation', '機率式主題模型'], ['情感分析', 'Sentiment Analysis', '判斷正負面'], ['面向情感分析', 'Aspect-based Sentiment', '分別看每個面向'], ['命名實體辨識', 'NER', '抽人名、日期、藥名'], ['去識別化', 'De-identification', '遮蔽或代換個資'], ['零樣本分類', 'Zero-shot Classification', '想出類別名稱就能分類'], ['餘弦相似度', 'Cosine Similarity', '向量夾角；文件相似度'], ['Cohen\'s Kappa', 'Cohen\'s Kappa', '扣掉碰巧一致後的一致率'], ['詞向量', 'Word Embedding', '語意相近則向量相近']]);
  U.finalQuiz('#w-final', [
    ['醫療場域今天仍大量使用規則式與 TF-IDF，主要原因是？', ['比較準', '可解釋、可稽核、不用算力', '比較新', '法規規定'], 1, '新的沒有淘汰舊的。'],
    ['預設中文停用詞表最容易在醫療文本造成什麼問題？', ['詞太多', '把否定詞刪掉，分不出「有」與「沒有」', '斷詞變慢', '數字被刪'], 1, '先做否定標記，再去停用詞。'],
    ['「二尖瓣脫垂」被切成四個字，最划算的解法是？', ['換深度模型', '加入自訂詞典', '改用英文', '去停用詞'], 1, '效果通常大於換更厲害的模型。'],
    ['四篇病歷中「病人」出現在 3 篇，用 sklearn 公式 idf = ?', ['ln(5/4)+1 = 1.223', 'ln(4/3) = 0.288', '3/4', '1.916'], 0, '出現越多篇，權重越低。'],
    ['詞袋模型最大的限制是？', ['太慢', '丟失語序', '不能用中文', '需要 GPU'], 1, '「否認胸痛」的「否認」只是袋子裡的一顆球。'],
    ['否定範圍標記沒有設邊界，「否認胸痛，主訴頭痛」會？', ['正確', '把頭痛也標成否定', '把否認刪掉', '無法執行'], 1, '標點與轉折詞是天然邊界。'],
    ['Naive Bayes 例子中 P(spam)=0.4，P(免費|spam)=0.667，P(會議|spam)=0.167，不含會議時 spam 分數 = ?', ['0.0445', '0.2222', '0.2668', '0.798'], 1, '0.4 × 0.667 × (1 − 0.167) = 0.2222。'],
    ['異常事件分類準確率 93.7%，但全猜「否」也有 92%，應優先看？', ['準確率', 'Recall', '訓練時間', '詞彙量'], 1, '漏掉的才是風險所在。'],
    ['主題模型跑出「疼痛 止痛 不適 部位 加劇」，主題名稱由誰決定？', ['演算法', '你（領域知識）', 'TF-IDF', '隨機'], 1, '演算法只給詞的組合。'],
    ['病人滿意度開放題最適合哪種情感分析？', ['整句字典法', '面向情感分析', '不用分析', '只看星等'], 1, '一句話裡通常同時誇跟罵。'],
    ['研究用途的去識別化多半選「代換」而非「遮蔽」，因為？', ['比較快', '保留「同一個人」的關聯', '比較安全', '法規要求'], 1, '同一個人換成同一個假名。'],
    ['兩人標註一致率 85%、期望一致率 51%，κ ≈ ?', ['0.34', '0.69', '0.85', '0.51'], 1, '(0.85 − 0.51) / (1 − 0.51) = 0.694。'],
  ]);
  (function () {
    const R = [['你看得懂文字', '醫護最有價值的資料多半是文字。', 'p01'], ['三個時代並存', '規則式與 TF-IDF 可稽核。', 'p01'], ['大部分時間花在前處理', '中文斷詞做不好，後面全白做。', 'p03'], ['自訂詞典最划算', '效果通常大於換模型。', 'p03'], ['TF-IDF 讓稀有詞浮出來', '「病人」權重最低。', 'p05'], ['先否定標記、再去停用詞', 'bigram → 否定標記 → 才換模型。', 'p07'], ['Naive Bayes 天真但好用', '小資料文本分類首選。', 'p09'], ['主題名字是你取的', '主題是探索起點，不是結論。', 'p11'], ['κ < 0.6 先修手冊', '標註品質是模型的天花板。', 'p16']];
    const g = h('div', { class: 'grid3' }); R.forEach(([t, d, id], i) => g.append(h('a', { href: '#' + id, style: { textDecoration: 'none', color: 'inherit', border: '1px solid var(--line)', borderRadius: '10px', padding: '10px 12px', background: '#fff', display: 'block' } }, h('div', { class: 'mono', style: { color: 'var(--accent)', fontWeight: 700 } }, i + 1), h('b', null, t), h('div', { style: { fontSize: '13.5px', color: 'var(--muted)' } }, d))));
    $('#w-review').append(g, h('div', { class: 'note' }, h('b', null, '下一步：'), 'M7 生成式 AI 基礎：從 Transformer 到 LLM。', h('a', { href: '../' }, '回到課程首頁 →')));
  })();
})();
