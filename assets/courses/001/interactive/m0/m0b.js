/* M0 互動頁 B：PART 07–12 */
(function () {
  'use strict';
  const { h, $, S, fmt, C, rng, randn, Store, seg, slider, check, sorter } = U;

  // ================= P07 六步驟 =================
  (function () {
    const T = [['界定問題', 'Scoping', '一句話說清楚：為誰、預測什麼、預測出來要做什麼', '做了一個沒有人會用的預測；準確率很高但沒有對應的行動'], ['蒐集資料', 'Gathering', '資料來源清單、時間範圍、納入排除條件', '沒有問「誰不在這份資料裡」，樣本偏誤從這一步就注定'], ['清理資料', 'Cleaning', '可重現的清理流程與決策紀錄', '把偽裝成 0 的遺失值當有效值；刪掉離群值卻沒發現那正是目標族群'], ['探索分析', 'Exploring', '分布圖、相關矩陣、初步假設清單', '跳過這一步直接建模，結果模型學到什麼你完全無法解釋'], ['建立模型', 'Modeling', '模型、評估指標、與基準線的比較', '只報告最好的結果；沒有基準線，不知道到底有沒有進步'], ['溝通部署', 'Sharing', '決策者看得懂的結論、限制說明、後續行動建議', '只講技術指標，對方聽完不知道自己該做什麼']];
    let sel = 0; const out = h('div');
    function draw() { out.innerHTML = '';
      const g = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: '6px' } }); T.forEach(([t, en], i) => { const c = h('div', { style: { padding: '8px 4px', textAlign: 'center', borderRadius: '8px', cursor: 'pointer', background: i === sel ? C.accent : '#fff', color: i === sel ? '#fff' : 'var(--ink)', border: '1px solid var(--line)' } }, h('div', { class: 'mono', style: { fontSize: '16px', fontWeight: 700 } }, i + 1), h('b', { style: { fontSize: '13.5px' } }, t), h('div', { style: { fontSize: '11px', opacity: .75 } }, en)); c.onclick = () => { sel = i; draw(); }; g.append(c); });
      const [t, , o, e] = T[sel];
      out.append(g, h('div', { class: 'grid2', style: { marginTop: '10px' } }, h('div', { class: 'note' }, h('b', null, '應該產出：'), o), h('div', { class: 'note bad' }, h('b', null, '最常見的錯誤：'), e)), h('p', { class: 'ai' }, '六步是 CRISP-DM 的簡化版：①＝業務理解，②–④＝資料理解與準備，⑤＝建模與評估，⑥＝部署。第 10 週期中發表要完整走一遍並說明每一步的判斷理由。')); }
    $('#w-six').append(out); draw();
  })();

  // ================= P07 補值與切分 =================
  (function () {
    const D = [['P01', 98, '訓練'], ['P02', 105, '訓練'], ['P03', 112, '訓練'], ['P04', null, '訓練'], ['P05', 120, '訓練'], ['P06', 101, '訓練'], ['P07', 130, '訓練'], ['P08', 180, '測試'], ['P09', null, '測試'], ['P10', 165, '測試']];
    const orig = JSON.parse(JSON.stringify(D)); const out = h('div');
    function draw() { out.innerHTML = '';
      const known = D.filter(d => d[1] != null), tr = known.filter(d => d[2] === '訓練');
      const wrong = S.mean(known.map(d => d[1])), right = S.mean(tr.map(d => d[1]));
      const t = h('table', { class: 'dt' }, h('tr', null, ['病人', '血糖', '分組', '✗ 先補再切', '✓ 先切再補'].map(c => h('th', null, c))), D.map((d, i) => { const inp = h('input', { type: 'text', value: d[1] == null ? '' : d[1], placeholder: '?', style: { width: '60px' } }); inp.onchange = () => { const v = inp.value.trim(); D[i][1] = v === '' || isNaN(+v) ? null : +v; draw(); }; const gb = h('button', { class: 'btn sm' + (d[2] === '測試' ? ' on' : '') }, d[2]); gb.onclick = () => { D[i][2] = d[2] === '訓練' ? '測試' : '訓練'; draw(); }; return h('tr', null, h('td', null, d[0]), h('td', null, inp), h('td', null, gb), h('td', { class: d[1] == null ? 'hl num' : 'num' }, d[1] == null ? fmt(wrong, 1) : ''), h('td', { class: d[1] == null ? 'ok num' : 'num' }, d[1] == null ? fmt(right, 1) : '')); }));
      const rs = h('button', { class: 'btn sm' }, '還原講義數字'); rs.onclick = () => { orig.forEach((o, i) => D[i] = o.slice()); draw(); };
      out.append(h('div', { class: 'row', style: { marginBottom: '8px' } }, rs), h('div', { class: 'grid2' }, h('div', { class: 'tscroll' }, t), h('div', null,
        h('div', { class: 'note bad', style: { fontSize: '14px' } }, h('b', null, '✗ 先補值、再切分：'), `用全部 ${known.length} 筆有值的平均 ${S.sum(known.map(d => d[1]))} ÷ ${known.length} = ${fmt(wrong, 1)}——偷用了測試集的資訊。`),
        h('div', { class: 'note', style: { fontSize: '14px' } }, h('b', null, '✓ 先切分、再補值：'), `只用訓練集 ${tr.length} 筆：${S.sum(tr.map(d => d[1]))} ÷ ${tr.length} = ${fmt(right, 1)}；測試集的缺值也補這個數字。`),
        h('div', { class: 'kpi' }, h('div', null, h('div', { class: 'k' }, '模型「偷看」到的量'), h('div', { class: 'v bad' }, fmt(Math.abs(wrong - right), 1) + ' mg/dL'))),
        h('p', { class: 'ai' }, 'AI Studio：Replace Missing Values 的 pre 埠輸出補值模型，用 Apply Model 套到測試集（M1 實作）。'))));
    }
    $('#w-impute').append(out); draw();
  })();

  // ================= P07 時間分配 =================
  (function () {
    const Y = [['2020', 45, 34], ['2022', 37.8, 26.4]]; const box = $('#w-time');
    Y.forEach(([y, a, b]) => box.append(h('div', { style: { display: 'grid', gridTemplateColumns: '50px 1fr', gap: '10px', alignItems: 'center', margin: '6px 0' } }, h('b', null, y), h('div', { style: { display: 'flex', height: '28px', borderRadius: '6px', overflow: 'hidden', fontSize: '12.5px', color: '#fff' } }, h('div', { style: { width: a + '%', background: C.amber, display: 'flex', alignItems: 'center', paddingLeft: '8px' } }, `資料準備 ${a}%`), h('div', { style: { width: b + '%', background: C.accent, display: 'flex', alignItems: 'center', paddingLeft: '8px' } }, `模型相關 ${b}%`), h('div', { style: { flex: 1, background: '#c9cfd6', color: '#1c2430', display: 'flex', alignItems: 'center', paddingLeft: '8px' } }, `其他 ${fmt(100 - a - b, 1)}%`)))));
    box.append(h('p', { class: 'ai' }, 'Anaconda State of Data Science 2020／2022 調查，資料工作者自述的時間分配。資料準備（載入＋清理）是單一最大宗——所以本課把 W2–W3 兩整週給資料工程（M1）。'));
  })();

  // ================= P08 工具 =================
  (function () {
    const T = [['AI Studio（RapidMiner）', '主軸工具', 'W1–W11', '視覺化流程、不需程式基礎；課程既有流程檔最完整。原名 Altair AI Studio，Altair 併入 Siemens 後正式名稱為 RapidMiner AI Studio。', 'must'], ['Ollama', '輔助', 'W12 起', '本地端執行 LLM，資料不出你的機器（勿選 -cloud 雲端模型）。處理健康資料時是必要條件。', 'try'], ['Dify', 'Phase C 專屬', 'W13–W15、期末', '把模型變成可部署、可分享的應用；支援多家模型供應商。', 'later'], ['Anaconda／Jupyter', '延伸自學', '選讀', 'Python 延伸自學的配套教材；不列入評量。', 'opt'], ['n8n', '延伸自學', '補充教材', '把 Dify 應用接進排程與批次自動化。Dify 管知識與對話，n8n 管流程與整合。', 'opt']];
    const TAG = { must: ['今天必裝', 'good'], try: ['今天可試裝', 'amber'], later: ['W13 前準備', 'blue'], opt: ['選讀', 'gray'] };
    const g = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(300px,1fr))', gap: '10px' } });
    T.forEach(([n, r, w, d, k]) => g.append(h('div', { style: { border: '1px solid var(--line)', borderRadius: '10px', padding: '10px 12px', background: '#fff' } }, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('b', null, n), h('span', { class: 'tag ' + TAG[k][1] }, TAG[k][0])), h('div', { style: { fontSize: '12.5px', color: 'var(--accent)', margin: '2px 0' } }, `${r}　·　${w}`), h('div', { style: { fontSize: '13.5px', color: 'var(--muted)' } }, d))));
    $('#w-tools').append(g);
  })();

  // ================= P08 安裝檢核 =================
  (function () {
    const I = [['AI Studio', '能開啟並在左側 Repository 面板看到課程資料夾', null, '確認教育版授權已啟用；課堂現場協助排除'], ['課程 Repository', '能展開「Data Sciences Course Materials」並看到各模組資料夾', null, '用 File → Import Process 匯入，或匯入整個 Repository 資料夾'], ['Ollama（選用）', '終端機輸入指令有版本號回應', 'ollama --version', 'W12 前裝好即可；今天先試裝'], ['Anaconda（選用）', '終端機輸入指令有版本號回應', 'conda --version', '非必要，只有 Python 延伸自學會用到']];
    const st = Store.get('m0:install', {}); const out = h('div');
    function draw() { out.innerHTML = ''; const n = I.filter((_, i) => st[i]).length;
      out.append(h('div', { class: 'row', style: { marginBottom: '6px' } }, h('div', { class: 'pbar', style: { width: '200px' } }, h('i', { style: { width: (n / I.length * 100) + '%' } })), h('span', { style: { fontSize: '13px', color: 'var(--muted)' } }, `${n} / ${I.length}（前兩項為今天的重點）`)));
      I.forEach(([t, how, cmd, fix], i) => { const c = h('input', { type: 'checkbox' }); c.checked = !!st[i]; c.onchange = () => { st[i] = c.checked; Store.set('m0:install', st); draw(); };
        const cp = cmd ? h('button', { class: 'btn sm' }, '複製指令') : null; if (cp) cp.onclick = () => { try { navigator.clipboard.writeText(cmd); cp.textContent = '已複製'; } catch (e) { cp.textContent = cmd; } };
        out.append(h('label', { style: { display: 'flex', gap: '10px', padding: '8px 4px', borderBottom: '1px solid var(--line)', alignItems: 'flex-start', cursor: 'pointer' } }, c, h('div', { style: { flex: 1 } }, h('b', { style: { textDecoration: st[i] ? 'line-through' : 'none' } }, t), h('div', { style: { fontSize: '13.5px', color: 'var(--muted)' } }, how, cmd ? h('code', { style: { marginLeft: '6px' } }, cmd) : ''), h('div', { style: { fontSize: '12.5px', color: 'var(--faint)' } }, '裝不起來：' + fix)), cp)); });
    }
    $('#w-install').append(out); draw();
  })();

  // ================= P08 AI Studio 概念 =================
  $('#w-studio').append(h('div', { class: 'concept' },
    h('div', null, h('b', null, 'Repository 儲存庫'), '資料集、流程、模型的集中存放處。資料集拖進編輯區會自動變成 Retrieve。修改既有流程前先「另存新檔」。'),
    h('div', null, h('b', null, 'Process 與 Operator'), 'Process 是一張流程圖，Operator 是節點，資料沿著線流動。連錯線不會報錯，但結果會錯。左下角可用關鍵字搜尋 Operator。'),
    h('div', null, h('b', null, 'Results 結果頁'), '執行後自動切換。重要檢視：Statistics、Charts、模型內容。'),
    h('div', null, h('b', null, '沒有輸出？'), '通常是最後一個節點沒有連到右側的 res 埠。')));

  // ================= P09 MPG 資料 =================
  const MPG = (function () { const r = rng(2027), P = []; for (let i = 0; i < 200; i++) { const w = 1.5 + r() * 3.7; P.push({ w, y: Math.max(8, 46.5 - 6.4 * w + 2.9 * randn(r)) }); } return P; })();
  function ols(P) { const mx = S.mean(P.map(p => p.w)), my = S.mean(P.map(p => p.y)); let n = 0, d = 0; P.forEach(p => { n += (p.w - mx) * (p.y - my); d += (p.w - mx) ** 2; }); const b = n / d; return { a: my - b * mx, b }; }
  const rmse = (P, a, b) => Math.sqrt(S.mean(P.map(p => (p.y - (a + b * p.w)) ** 2)));
  const r2 = (P, a, b) => { const my = S.mean(P.map(p => p.y)); return 1 - S.sum(P.map(p => (p.y - (a + b * p.w)) ** 2)) / S.sum(P.map(p => (p.y - my) ** 2)); };

  // ================= P09 畫線 =================
  (function () {
    let a = 38, b = -4, showRes = false, showBest = false; const best = ols(MPG); const out = h('div');
    function draw() { out.innerHTML = '';
      const ch = h('div'); U.scatter(ch, MPG.map(p => ({ x: p.w, y: p.y, c: C.gray, r: 2.8 })), { w: 460, h: 320, xmin: 1.4, xmax: 5.3, ymin: 0, ymax: 45, xlabel: '車重（千磅）', ylabel: '每加侖里程 mpg',
        under: [(sv, x, y) => { if (showRes) MPG.forEach(p => U.s('line', { x1: x(p.w), x2: x(p.w), y1: y(p.y), y2: y(a + b * p.w), stroke: C.amber, 'stroke-opacity': .5 }, sv)); }],
        over: [(sv, x, y) => { U.s('line', { x1: x(1.4), y1: y(a + b * 1.4), x2: x(5.3), y2: y(a + b * 5.3), stroke: C.bad, 'stroke-width': 2.5 }, sv); if (showBest) U.s('line', { x1: x(1.4), y1: y(best.a + best.b * 1.4), x2: x(5.3), y2: y(best.a + best.b * 5.3), stroke: C.accent, 'stroke-width': 2, 'stroke-dasharray': '6 4' }, sv); }] });
      const my = rmse(MPG, a, b), bb = rmse(MPG, best.a, best.b);
      const fit = h('button', { class: 'btn sm primary' }, '最小平方法'); fit.onclick = () => { showBest = true; draw(); };
      const snap = h('button', { class: 'btn sm' }, '把我的線移到最佳解'); snap.onclick = () => { a = +best.a.toFixed(1); b = +best.b.toFixed(2); draw(); };
      out.append(h('div', { class: 'row', style: { marginBottom: '6px' } }, slider('截距', 25, 60, .1, () => a, v => a = v, draw, v => (+v).toFixed(1)), slider('斜率', -12, 0, .05, () => b, v => b = v, draw, v => (+v).toFixed(2)), check('顯示殘差', () => showRes, v => showRes = v, draw), fit, showBest ? snap : ''),
        h('div', { class: 'grid2' }, ch, h('div', null,
          h('div', { class: 'note', style: { fontSize: '15px', fontFamily: 'var(--mono)' } }, `我的模型：mpg = ${a.toFixed(1)} ${b < 0 ? '−' : '+'} ${Math.abs(b).toFixed(2)} × 車重`),
          h('div', { class: 'kpi' }, h('div', null, h('div', { class: 'k' }, '我的 RMSE'), h('div', { class: 'v ' + (my - bb < .15 ? 'good' : '') }, fmt(my, 2))), h('div', null, h('div', { class: 'k' }, '我的 R²'), h('div', { class: 'v' }, fmt(r2(MPG, a, b), 3))), showBest ? h('div', null, h('div', { class: 'k' }, '最佳解 RMSE'), h('div', { class: 'v good' }, fmt(bb, 2))) : ''),
          showBest ? h('div', { class: 'note', style: { fontSize: '14px' } }, `最小平方法：mpg = ${best.a.toFixed(1)} − ${Math.abs(best.b).toFixed(2)} × 車重，R² = ${fmt(r2(MPG, best.a, best.b), 2)}。斜率的意思：車重每多 1 千磅，每加侖少跑約 ${Math.abs(best.b).toFixed(1)} 英里。Linear Regression 就是在找「殘差平方和最小」的那條線。`) : h('div', { class: 'note warn', style: { fontSize: '14px' } }, 'RMSE＝預測誤差的典型大小（單位同 mpg）。R²＝模型解釋了多少變異。試著把 RMSE 壓到 3 左右。'),
          h('p', { class: 'ai' }, '模擬 MPG 型態資料 200 筆。本週先看懂 RMSE 與 R²，M2 才深入。')))); }
    $('#w-fit').append(out); draw();
  })();

  // ================= P09 切分評估 =================
  (function () {
    let ratio = .8, seed = 1, swap = false; const out = h('div');
    function draw() { out.innerHTML = '';
      const r = rng(seed * 97 + 5), idx = MPG.map((_, i) => [r(), i]).sort((x, y) => x[0] - y[0]).map(x => x[1]), n = Math.round(MPG.length * ratio);
      let tr = idx.slice(0, n).map(i => MPG[i]), te = idx.slice(n).map(i => MPG[i]); if (swap) [tr, te] = [te, tr];
      const m = ols(tr), pred = te.map(p => m.a + m.b * p.w), sc = S.r(pred, te.map(p => p.y)) ** 2, e = rmse(te, m.a, m.b);
      const ch = h('div'); U.scatter(ch, te.map((p, i) => ({ x: p.y, y: pred[i], c: C.blue, r: 3 })), { w: 360, h: 280, xmin: 5, xmax: 45, ymin: 5, ymax: 45, xlabel: '實際 mpg', ylabel: '預測 mpg', under: [(sv, x, y) => U.s('line', { x1: x(5), y1: y(5), x2: x(45), y2: y(45), stroke: C.ink, 'stroke-dasharray': '4 3' }, sv)] });
      const bt = h('button', { class: 'btn sm' }, '換一組隨機切分'); bt.onclick = () => { seed++; draw(); };
      out.append(h('div', { class: 'row', style: { marginBottom: '6px' } }, slider('訓練比例', .5, .9, .05, () => ratio, v => ratio = v, draw, v => Math.round(v * 100) + '%'), bt, check('Split Data 兩個輸出接反', () => swap, v => swap = v, draw)),
        h('div', { class: 'grid2' }, ch, h('div', null, h('div', { class: 'kpi' }, h('div', null, h('div', { class: 'k' }, '訓練筆數'), h('div', { class: 'v' }, tr.length)), h('div', null, h('div', { class: 'k' }, '測試筆數'), h('div', { class: 'v' }, te.length)), h('div', null, h('div', { class: 'k' }, '測試 RMSE'), h('div', { class: 'v' }, fmt(e, 2))), h('div', null, h('div', { class: 'k' }, 'squared correlation'), h('div', { class: 'v' }, fmt(sc, 3)))),
          h('div', { class: 'note ' + (swap ? 'warn' : ''), style: { fontSize: '14px' } }, swap ? `接反了：模型只用 ${tr.length} 筆訓練，卻在 ${te.length} 筆上測試。這組資料很單純所以影響不大，但在複雜資料上 RMSE 會明顯變差——RMSE 異常偏高時先檢查這裡。` : '理想狀態是所有點落在對角線上；偏離越遠預測越不準。換幾次隨機切分，看 RMSE 跳動多少——這就是為什麼 W5 會改用交叉驗證。'),
          h('p', { class: 'ai' }, '講義預期：RMSE 約 2.5–4、squared correlation 約 0.7–0.85（測試集上不完全等於 R²）。')))); }
    $('#w-split').append(out); draw();
  })();

  // ================= P09 流程組裝 =================
  (function () {
    const R = ['Retrieve：MPG dataset', 'Set Role：mpg → label', 'Split Data：0.8 / 0.2', 'Linear Regression（接訓練集）', 'Apply Model（model＋unl 測試集）', 'Performance (Regression)：RMSE、squared correlation', '接到 res 埠並執行'];
    const STEP = ['2 蒐集資料', '3 清理資料', '5 建立模型', '5 建立模型', '5 建立模型', '5 建立模型', '6 溝通部署（看結果）'];
    let order = null, checked = false; const out = h('div');
    const shuffle = () => { const r = rng(Date.now() % 1e6), b = R.slice(); for (let i = b.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1));[b[i], b[j]] = [b[j], b[i]]; } return b.join() === R.join() ? shuffle() : b; };
    order = shuffle();
    function draw() { out.innerHTML = ''; const list = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '6px', maxWidth: '640px' } });
      order.forEach((s, i) => { const ok = checked && s === R[i], bad = checked && s !== R[i]; list.append(h('div', { class: 'row', style: { border: '1px solid ' + (ok ? 'var(--good)' : bad ? 'var(--bad)' : 'var(--line2)'), background: ok ? 'var(--good-soft)' : bad ? 'var(--bad-soft)' : '#fff', borderRadius: '8px', padding: '6px 10px', gap: '8px' } }, h('span', { class: 'mono', style: { color: 'var(--faint)', width: '18px' } }, i + 1), h('span', { style: { flex: 1, fontSize: '14.5px' } }, s), checked && ok ? h('span', { class: 'tag gray' }, '工作流程 ' + STEP[i]) : '', h('button', { class: 'btn sm', disabled: i === 0, onclick: () => { [order[i - 1], order[i]] = [order[i], order[i - 1]]; checked = false; draw(); } }, '↑'), h('button', { class: 'btn sm', disabled: i === order.length - 1, onclick: () => { [order[i + 1], order[i]] = [order[i], order[i + 1]]; checked = false; draw(); } }, '↓'))); });
      const all = order.join() === R.join(); const b1 = h('button', { class: 'btn primary sm' }, '檢查順序'); b1.onclick = () => { checked = true; draw(); }; const b2 = h('button', { class: 'btn sm' }, '重新打亂'); b2.onclick = () => { order = shuffle(); checked = false; draw(); };
      out.append(h('div', { class: 'row', style: { marginBottom: '8px' } }, b1, b2), list, checked ? h('div', { class: 'note ' + (all ? '' : 'warn'), style: { fontSize: '14px' } }, all ? '✓ 正確！這條流程刻意省略了工作流程的第 1（界定問題）、4（探索分析）、6（溝通部署）步——整學期就是把這三步逐一補回來。' : '還不對。提示：要先告訴 AI Studio 哪一欄是答案，才能切分與訓練；Apply Model 需要先有模型。') : '',
        h('p', { class: 'ai' }, '檔案：範例/ML (AI Studio)/M0. 導論與工具鏈/ 的 (empty).rmp 為課堂填空版、無後綴者為完成版；資料 MPG dataset.rmhdf5table。')); }
    $('#w-proc').append(out); draw();
  })();

  // ================= P10 技術選擇 =================
  (function () {
    const TREE = { q: '你的資料裡，有沒有一欄是想預測的「答案」？', o: [['有', { q: '那一欄是數值還是類別？', o: [['數值（住院天數、費用）', { r: ['監督式　迴歸', 'M2-1', '有明確的數值答案可以學'] }], ['類別（是否再入院、風險等級）', { r: ['監督式　分類', 'M2-2', '有明確的類別答案可以學'] }]] }], ['沒有', { q: '你想做的是？', o: [['把對象分成幾個群體', { r: ['非監督式　分群', 'M3', '沒有預先定義的群體'] }], ['找出資料中的異常', { r: ['非監督式　異常偵測', 'M4', '異常的定義本身不明確'] }], ['理解文字內容在說什麼', { r: ['NLP 文字探勘', 'M6', '輸入是非結構化文字'] }], ['把知識與規則組成決策支援', { r: ['生成式 AI ＋ RAG', 'M7、M8', '需要語言理解與知識檢索'] }], ['一張交叉分析表就能回答', { r: ['其實不需要模型', '—', '統計描述或流程改善就夠了'] }]] }]] };
    let path = []; const out = h('div');
    function draw() { out.innerHTML = ''; let node = TREE; const crumbs = [];
      path.forEach(i => { crumbs.push(node.o[i][0]); node = node.o[i][1]; });
      if (crumbs.length) out.append(h('div', { style: { fontSize: '13px', color: 'var(--muted)', marginBottom: '6px' } }, crumbs.join(' → ')));
      if (node.r) { const [t, m, w] = node.r; out.append(h('div', { class: 'kpi' }, h('div', null, h('div', { class: 'k' }, '建議技術'), h('div', { class: 'v' }, t)), h('div', null, h('div', { class: 'k' }, '本課模組'), h('div', { class: 'v' }, m))), h('div', { class: 'note', style: { fontSize: '14px' } }, '為什麼：' + w + (t === '其實不需要模型' ? '。如果一張交叉分析表就能回答，就不要建模型。' : '')));
      } else { out.append(h('div', { style: { fontWeight: 600, marginBottom: '6px' } }, node.q), h('div', { class: 'row' }, node.o.map(([l], i) => { const b = h('button', { class: 'btn' }, l); b.onclick = () => { path.push(i); draw(); }; return b; }))); }
      if (path.length) { const b = h('button', { class: 'btn sm', style: { marginTop: '8px' } }, '↺ 重新開始'); b.onclick = () => { path = []; draw(); }; out.append(b); } }
    $('#w-tech').append(out); draw();
  })();

  // ================= P10 一頁範圍表 =================
  (function () {
    const F = [['who', '使用者', '誰會看到這個系統的輸出？'], ['predict', '預測什麼', '例：新收個案三個月內的照護需求變化'], ['action', '預測出來後他可以做什麼', '例：提前調整服務計畫，避免臨時加派'], ['now', '現況', '目前怎麼處理？靠什麼判斷？花多少時間？'], ['tech', '技術', ''], ['target', '目標變數（y）', '例：三個月內服務時數是否增加逾 30%'], ['unit', '分析單位：一列 = ？', '例：一位新收個案'], ['feat', '候選特徵', '例：CMS 等級、共病數、主要照顧者有無、ADL 分數'], ['src', '資料來源', '公開資料集、政府開放資料或自建模擬資料（附連結）'], ['scope', '範圍', '例：近三年、65 歲以上新收個案'], ['success', '成功定義', '例：Recall ≥ 0.7 且個管師願意採用'], ['err', '模型判斷錯了會怎樣？誰承擔？', '決定之後看 Precision 還是 Recall']];
    const EX = { who: '長照個管師', predict: '新收個案三個月內的照護需求變化', action: '提前調整服務計畫，避免臨時加派', now: '靠個管師經驗判斷，無系統性預警；常在個案出狀況後才臨時加派', tech: '監督式　分類', target: '三個月內服務時數是否增加逾 30%', unit: '一位新收個案', feat: 'CMS 等級、共病數、主要照顧者有無、居住型態、初次評估的 ADL 分數', src: '自建模擬資料（參考長照評估欄位）', scope: '近三年、65 歲以上新收個案', success: 'Recall ≥ 0.7 且個管師願意採用', err: '漏判（需求上升卻沒被標記）→ 個案照顧中斷，個管師與家屬承擔；誤報 → 浪費排班，成本較低' };
    const TECH = ['監督式　迴歸', '監督式　分類', '非監督式　分群', '非監督式　異常偵測', 'NLP', '生成式 AI ＋ RAG', '不需要模型'];
    const st = Store.get('m0:scope', {}); const out = h('div'); const prev = h('div');
    function checks() { const c = []; const t = st.tech || '';
      c.push([!!(st.who && st.predict && st.action), '一句話說清楚：為誰、預測什麼、可以做什麼']);
      c.push([!!st.unit, '寫下「一列 = 一個什麼」']);
      c.push([t.startsWith('監督式') ? !!st.target : t ? !st.target || /無|不適用/.test(st.target) : false, t.startsWith('監督式') ? '監督式需要目標變數 y' : '非監督式不需要目標變數 y']);
      c.push([/\d|採用|願意/.test(st.success || ''), '成功定義有可檢驗的門檻（數字或採用條件）']);
      c.push([!!st.src && !/實習|病歷號|真實個案/.test(st.src), '資料為公開或模擬資料，不使用實習或工作場域的真實個案']);
      c.push([!!st.err, '想過錯誤的代價與承擔者']); return c; }
    function render() { prev.innerHTML = ''; const v = k => st[k] ? st[k] : h('span', { style: { color: 'var(--faint)' } }, '（未填）');
      prev.append(h('div', { style: { border: '1px solid var(--line)', borderRadius: '10px', padding: '12px 14px', background: '#fff', fontSize: '14px' } }, h('div', { style: { fontWeight: 700, marginBottom: '6px' } }, '問題陳述'), h('p', null, '我想為【', v('who'), '】預測【', v('predict'), '】，預測出來之後他可以【', v('action'), '】。'),
        ...F.filter(f => !['who', 'predict', 'action'].includes(f[0])).map(([k, l]) => h('div', { style: { display: 'grid', gridTemplateColumns: '130px 1fr', gap: '8px', padding: '3px 0', borderTop: '1px solid var(--line)' } }, h('span', { style: { color: 'var(--muted)' } }, l), h('span', null, v(k))))));
      const ck = checks(); prev.append(h('div', { style: { marginTop: '8px', fontSize: '13.5px' } }, ck.map(([ok, t]) => h('div', { style: { color: ok ? 'var(--good)' : 'var(--muted)' } }, (ok ? '● ' : '○ ') + t)))); }
    function draw() { out.innerHTML = ''; const form = h('div', { style: { display: 'flex', flexDirection: 'column', gap: '8px' } });
      F.forEach(([k, l, ph]) => { let inp; if (k === 'tech') { inp = h('select', null, h('option', { value: '' }, '— 選擇 —'), TECH.map(t => h('option', null, t))); inp.value = st[k] || ''; inp.onchange = () => { st[k] = inp.value; Store.set('m0:scope', st); render(); }; } else { inp = h(k === 'now' || k === 'feat' || k === 'err' ? 'textarea' : 'input', { type: 'text', placeholder: ph, rows: 2, style: { width: '100%', font: 'inherit', fontSize: '14px', padding: '5px 7px', border: '1px solid var(--line2)', borderRadius: '6px' } }); inp.value = st[k] || ''; inp.oninput = () => { st[k] = inp.value; Store.set('m0:scope', st); render(); }; } form.append(h('label', { style: { fontSize: '13px', color: 'var(--muted)' } }, l, h('div', null, inp))); });
      const ex = h('button', { class: 'btn sm' }, '載入範例'); ex.onclick = () => { Object.assign(st, EX); Store.set('m0:scope', st); draw(); };
      const cl = h('button', { class: 'btn sm' }, '清空'); cl.onclick = () => { Object.keys(st).forEach(k => delete st[k]); Store.set('m0:scope', st); draw(); };
      const dl = h('button', { class: 'btn primary sm' }, '下載（Markdown）'); dl.onclick = () => { const md = `# 問題陳述與專案範圍\n\n我想為【${st.who || ''}】預測【${st.predict || ''}】，預測出來之後他可以【${st.action || ''}】。\n\n` + F.filter(f => !['who', 'predict', 'action'].includes(f[0])).map(([k, l]) => `- **${l}**：${st[k] || ''}`).join('\n') + '\n'; const a = h('a', { href: URL.createObjectURL(new Blob([md], { type: 'text/markdown' })), download: 'M0_問題陳述.md' }); document.body.append(a); a.click(); a.remove(); };
      out.append(h('div', { class: 'row', style: { marginBottom: '8px' } }, ex, cl, dl), h('div', { class: 'grid2' }, form, prev)); render(); }
    $('#w-scope').append(out); draw();
  })();

  // ================= P11 題目健檢 =================
  (function () {
    const Q = [['你真的在意', ['是你實務上遇過的痛點，或未來想投入的領域？', '題目小而具體，而不是「重要的大問題」？']], ['資料取得可行', ['已找到公開資料集、政府開放資料，或能自建模擬資料？', '沒有使用實習或工作場域的真實個案資料？']], ['有明確的使用者', ['說得出誰會看到輸出（護理師、個管師、家屬…）？', '說得出錯誤的代價由誰承擔？']], ['三種解法都說得通', ['Phase A：有可預測的目標和一組結構化特徵？', 'Phase B：能問「更複雜的模型有沒有比較好」？', 'Phase C：算出結果後，有可放進知識庫的文件（法規、指引、衛教手冊）？']]];
    const st = Store.get('m0:thread', {}); const out = h('div');
    function draw() { out.innerHTML = ''; let tot = 0, yes = 0; const g = h('div', { class: 'grid2' });
      Q.forEach(([t, qs], i) => { const n = qs.filter((_, j) => st[i + '-' + j]).length; tot += qs.length; yes += n; g.append(h('div', { style: { border: '1px solid ' + (n === qs.length ? 'var(--good)' : 'var(--line)'), borderRadius: '10px', padding: '10px 12px', background: '#fff' } }, h('div', { class: 'row', style: { justifyContent: 'space-between' } }, h('b', null, `${i + 1}　${t}`), h('span', { class: 'tag ' + (n === qs.length ? 'good' : 'gray') }, `${n}/${qs.length}`)), ...qs.map((q, j) => check(q, () => !!st[i + '-' + j], v => { st[i + '-' + j] = v; Store.set('m0:thread', st); }, draw)))); });
      const weak = Q.map((q, i) => [q[0], q[1].every((_, j) => st[i + '-' + j])]).filter(x => !x[1]).map(x => x[0]);
      out.append(g, h('div', { class: 'note ' + (yes === tot ? '' : 'warn'), style: { fontSize: '14px' } }, yes === tot ? '四個條件都滿足——這個題目可以帶進第 4 週的 Task 1 題目確認。' : `還需加強：${weak.join('、')}。四個條件不必一次滿足，第 4 週題目確認前都可以調整。找不到資料時，換一個相近的代理問題。`)); }
    $('#w-thread').append(out); draw();
  })();

  // ================= P11 選題示例 =================
  (function () {
    const E = [['化療副作用照護決策支援', '腫瘤科護理師', 'RAG 來源引用、CTCAE 分級標準納入知識庫、多重症狀平行處理'], ['高齡運動處方生成', '社區據點人員', 'ICOPE 結合 FITT 原則、偵測風險自動降級為坐姿、緊急停止指標前置'], ['居服員 ISBAR 通報', '居服員與督導', '權責分工、人為核實後才送出、督導回饋回流優化'], ['校園心理危機守門員', '高中導師與專輔', '客觀事實與專業評估分離、對家長談話劇本、法規條號標註'], ['聽損輔具補助導航', '聽力師與家屬', '縣市政策動態權重、備援資料源透明標示、一鍵產出申請清單'], ['EMT 救護處置助理', '救護技術員', '屬地法規強制約束、線上醫療指導授權、ePCR 草案自動生成']];
    const g = h('div', { class: 'grid3' }); E.forEach(([t, u, d]) => g.append(h('div', { style: { border: '1px solid var(--line)', borderRadius: '10px', padding: '10px 12px', background: '#fff' } }, h('b', null, t), h('div', { style: { margin: '3px 0' } }, h('span', { class: 'tag' }, u)), h('div', { style: { fontSize: '13px', color: 'var(--muted)' } }, 'Phase C 設計：' + d))));
    $('#w-examples').append(g, h('p', { class: 'ai' }, '共同特徵：都是第一線人員每天實際遇到、目前靠經驗與紙本處理的問題。'));
  })();

  // ================= P12 =================
  U.flashcards('#w-cards', [['資料科學', 'Data Science', '用資料回答「接下來會怎樣、該怎麼做」'], ['資料探勘', 'Data Mining', '從大量資料中找出先前未知的模式'], ['知識發現', 'KDD', '資料 → 知識的完整流程（Fayyad 等人，1996）'], ['商業智慧', 'Business Intelligence, BI', '回答「過去發生了什麼」的報表與儀表板'], ['描述性分析', 'Descriptive Analytics', '發生了什麼事'], ['預測性分析', 'Predictive Analytics', '接下來會發生什麼'], ['指示性分析', 'Prescriptive Analytics', '我們該怎麼做'], ['監督式學習', 'Supervised Learning', '資料有標準答案，學輸入到答案的對應'], ['非監督式學習', 'Unsupervised Learning', '沒有答案，只找資料本身的結構'], ['強化學習', 'Reinforcement Learning', '從互動與回饋中學策略（本課程不含）'], ['標籤', 'Label / Target / y', '你想預測的那一欄'], ['特徵', 'Feature / Input / x', '餵給模型的欄位'], ['人工智慧', 'AI', '讓機器展現智慧行為的所有方法'], ['機器學習', 'Machine Learning', '從資料自動學規律，不寫死規則'], ['深度學習', 'Deep Learning', '以多層神經網路自動學特徵表示'], ['生成式 AI', 'Generative AI', '能產生新內容的深度學習模型'], ['自然語言處理', 'NLP', '讓電腦處理人類語言'], ['電腦視覺', 'Computer Vision', '讓電腦「看懂」影像'], ['基礎模型', 'Foundation Model', '大規模預訓練、可適應多種任務的通用模型'], ['檢索增強生成', 'RAG', '先檢索文件再生成，可標註來源'], ['提示詞工程', 'Prompt Engineering', '以指令設計引導模型行為'], ['專案界定', 'Scoping', '動手前先定義問題、使用者與資料需求'], ['最小可行產品', 'MVP', '先做出最小可用版本再擴充'], ['混淆因子', 'Confounder', '同時影響兩個變數，造成假性相關的第三者'], ['推理模型', 'Reasoning Model', '先產生思考步驟再作答'], ['模型上下文協定', 'MCP', '讓 AI 以統一方式連接外部工具與資料的開放標準'], ['資料洩漏', 'Data Leakage', '測試資料的資訊混進訓練過程，使評估過度樂觀']]);
  U.finalQuiz('#w-final', [
    ['會寫程式又懂領域、卻缺統計，落在文氏圖的哪一區？', ['機器學習', '傳統研究', '危險區', '資料科學'], 2, '做得出東西，卻可能誤讀結果。'],
    ['「依預測結果建議下週護理人力配置」屬於哪種分析？', ['描述性', '診斷性', '預測性', '指示性'], 3, '指示性回答「我們該怎麼做」。'],
    ['「把病人依生活型態與共病分成幾個族群」是？', ['監督式分類', '監督式迴歸', '非監督式分群', '強化學習'], 2, '沒有預先定義的族群 → 沒有 y。'],
    ['1990 年代 KDD 的核心主張是？', ['人提出假設、電腦驗證', '電腦從資料中找出假設', '以神經網路取代統計', '把資料存進資料倉儲'], 1, '這是從統計推論走向資料探勘的轉折。'],
    ['推動 AI 演進的三個力量不包含？', ['資料變多', '算力變便宜', '演算法突破', '法規放寬'], 3, '三個推力：資料、算力、演算法。'],
    ['多數 AI 專案失敗最常卡在哪裡？', ['演算法不夠新', '拿不到可用資料、做出來沒人用', '模型參數太少', 'GPU 不夠'], 1, '技術只佔漏斗中間三層，而那正是最容易的部分。'],
    ['用藥項目數與住院天數 r=0.87，最合理的解讀是？', ['減少用藥可縮短住院', '兩者可能都被疾病嚴重度推高', '住院越久導致用藥越多', 'r 太高代表資料錯誤'], 1, '相關不等於因果——混淆因子。'],
    ['要預測住院天數，下列哪個最合適？', ['GPT 類 LLM', '擴散模型', '迴歸或決策樹', 'A* 搜尋'], 2, '生成式 AI 擅長的是不同的事。'],
    ['補值的正確順序是？', ['先用全部資料算平均補值，再切分', '先切分，只用訓練集算平均，同一數字補測試集', '訓練集與測試集各自算平均補', '直接刪掉所有缺值'], 1, '否則測試集的資訊會滲入訓練。'],
    ['專案範圍表中最容易漏掉、卻最關鍵的是？', ['演算法名稱', '成功定義', '軟體版本', '資料筆數'], 1, '不是「模型很準」，而是「達到什麼程度才算有用」。'],
  ]);
  (function () {
    const R = [['三個支柱', '統計、工具、領域知識三者兼備，你們的優勢在第三項。', 'p01'], ['三個推力', '資料變多、算力變便宜、演算法有突破。', 'p03'], ['多了一個選項', '新技術很少取代舊技術——決策樹在 2026 年仍然好用。', 'p06'], ['能用、能信、能負責', '2026 年的重點不是更準的演算法。', 'p04'], ['時間分配', '資料準備約佔四成五，是單一最大宗；建模相關約三成。', 'p07'], ['今天最重要的事', '選定貫穿主線，完成一頁問題陳述作業。', 'p10']];
    const g = h('div', { class: 'grid3' }); R.forEach(([t, d, id], i) => g.append(h('a', { href: '#' + id, style: { textDecoration: 'none', color: 'inherit', border: '1px solid var(--line)', borderRadius: '10px', padding: '10px 12px', background: '#fff', display: 'block' } }, h('div', { class: 'mono', style: { color: 'var(--accent)', fontWeight: 700 } }, i + 1), h('b', null, t), h('div', { style: { fontSize: '13.5px', color: 'var(--muted)' } }, d))));
    $('#w-review').append(g, h('div', { class: 'note' }, h('b', null, '下一步：'), '第 2 週 M1 資料工程。', h('a', { href: '../m1/' }, '前往 M1 互動版 →')));
  })();
})();
