/* M10 互動頁 B：PART 11–19 */
(function () {
  'use strict';
  const { h, $, s, svgBox, seg, check, Store } = U;
  const { cap, row, lbl, nt, ttl, kpi, tok, tbl, pre, box, copyBtn, ul } = window.M10;
  const TABLE = { 2: 10020, 3: 15460, 4: 18580, 5: 24100, 6: 28070, 7: 32090, 8: 36180 }, RATE = { '一般戶': .16, '中低收': .05, '低收': 0 }, IDS = ['一般戶', '中低收', '低收'];
  const SVC = ['照顧及專業服務', '交通接送', '輔具及居家無障礙環境改善', '喘息服務'];

  // ================= P11 =================
  (function () {
    const V = [
      { n: '第一版', d: 'AI 第一次產出', low: 1, svc: 0, fmt: 0, val: 0, l8: 1, rwd: 0 },
      { n: '第一輪後', d: '你：「我選第 5 級、低收，自負額顯示 3,856。但低收的比率是 0%，應該顯示 0 才對。」', low: 0, svc: 0, fmt: 0, val: 0, l8: 1, rwd: 0 },
      { n: '第二輪後', d: '你：「可申請的服務類別沒有顯示出來，請依 CMS 等級顯示四類服務。」', low: 0, svc: 1, fmt: 0, val: 0, l8: 1, rwd: 0 },
      { n: '第三輪後', d: '你：「用手機開數字擠在一起；金額請用千分位。什麼都不選就按試算會出現 NaN。」', low: 0, svc: 1, fmt: 1, val: 1, l8: 1, rwd: 1 },
      { n: '測試後修正', d: '你：「21 種組合測試中，第 8 級三種身分都顯示『查無資料』，預期是 36,180。」', low: 0, svc: 1, fmt: 1, val: 1, l8: 0, rwd: 1 },
    ];
    let vi = 0, lv = '', id = '一般戶', mobile = false, res = null, test = null, showCode = false; const ctl = h('div'), out = h('div');
    const calc = (ver, L, I) => { if (!L) return ver.val ? { msg: '請先選擇 CMS 等級' } : { amount: NaN, copay: NaN }; const n = +L; if (ver.l8 && !(n < 8)) return { msg: '查無資料' }; const r = ver.low && I === '低收' ? .16 : RATE[I]; return { amount: TABLE[n], copay: Math.round(TABLE[n] * r), rate: r }; };
    const money = (ver, x) => Number.isNaN(x) ? 'NaN' : ver.fmt ? x.toLocaleString('en-US') : String(x);
    function build() { ctl.innerHTML = ''; ctl.append(row(lbl('版本：'), ...V.map((v, i) => h('button', { class: 'btn sm' + (i === vi ? ' on' : ''), onclick: () => { vi = i; res = null; test = null; build(); draw(); } }, v.n)), check('手機尺寸', () => mobile, x => mobile = x, draw), check('看 AI 寫的關鍵程式碼', () => showCode, x => showCode = x, draw)), V[vi].d ? nt(V[vi].d) : ''); }
    function draw() {
      out.innerHTML = ''; const ver = V[vi];
      const selL = h('select', { style: { fontSize: '15px', padding: '4px' } }, h('option', { value: '' }, '請選擇'), [2, 3, 4, 5, 6, 7, 8].map(n => h('option', { value: n }, `第 ${n} 級`))); selL.value = lv; selL.onchange = () => { lv = selL.value; };
      const selI = h('select', { style: { fontSize: '15px', padding: '4px' } }, IDS.map(x => h('option', { value: x }, x))); selI.value = id; selI.onchange = () => { id = selI.value; };
      const go = h('button', { class: 'btn primary' }, '試算'); go.onclick = () => { res = calc(ver, lv, id); res.L = lv; res.I = id; draw(); };
      const app = h('div', { style: { border: '2px solid #555', borderRadius: mobile ? '22px' : '10px', padding: mobile ? '18px 12px' : '14px 16px', width: mobile ? '300px' : '100%', margin: '0 auto', background: '#fff', boxSizing: 'border-box', overflow: 'hidden' } },
        h('div', { style: { fontWeight: 700, fontSize: '17px', marginBottom: '8px' } }, '長照給付試算器'), h('div', { style: { display: 'flex', gap: '8px', flexWrap: ver.rwd ? 'wrap' : 'nowrap', alignItems: 'center' } }, lbl('CMS 等級'), selL, lbl('身分別'), selI, go));
      if (res) { const r = res; const box2 = h('div', { style: { marginTop: '10px', display: 'flex', gap: ver.rwd ? '8px' : '2px', flexWrap: ver.rwd ? 'wrap' : 'nowrap', whiteSpace: 'nowrap', fontSize: mobile && !ver.rwd ? '17px' : '15px' } });
        if (r.msg) box2.append(h('div', { style: { color: 'var(--bad)' } }, r.msg));
        else box2.append(h('div', { style: { background: '#eef3f2', padding: '6px 10px', borderRadius: '6px' } }, '每月額度上限 ', h('b', null, money(ver, r.amount) + ' 元')), h('div', { style: { background: '#eef3f2', padding: '6px 10px', borderRadius: '6px' } }, '自負額 ', h('b', null, money(ver, r.copay) + ' 元'), Number.isNaN(r.copay) ? '' : `（${Math.round(r.rate * 100)}%）`));
        app.append(box2); if (ver.svc && !r.msg && !Number.isNaN(r.amount)) app.append(h('div', { style: { marginTop: '8px', fontSize: '14px' } }, '可申請服務：', SVC.map(x => tok(x)))); }
      app.append(h('div', { style: { marginTop: '10px', fontSize: '12px', color: 'var(--muted)' } }, '本試算僅供參考，實際給付以照管專員評估結果為準'));
      const testBtn = h('button', { class: 'btn' }, '▶ 跑 21 種組合（對照講義額度表）'); testBtn.onclick = () => { test = []; [2, 3, 4, 5, 6, 7, 8].forEach(L => IDS.forEach(I => { const g = calc(ver, String(L), I), expA = TABLE[L], expC = Math.round(TABLE[L] * RATE[I]); test.push({ L, I, ok: !g.msg && g.amount === expA && g.copay === expC, got: g.msg || `${money(ver, g.amount)}／${money(ver, g.copay)}`, exp: `${expA.toLocaleString()}／${expC.toLocaleString()}` }); })); draw(); };
      out.append(app, row(testBtn, lbl('邊界值、每一種組合、手機畫面、什麼都不選就按、免責聲明——五個一定要自己試的情境。')));
      if (test) { const bad = test.filter(t => !t.ok);
        out.append(h('div', { class: 'tscroll' }, h('table', { class: 'dt' }, h('tr', null, h('th', null, '等級'), IDS.map(I => h('th', null, I))), [2, 3, 4, 5, 6, 7, 8].map(L => h('tr', null, h('td', { style: { fontWeight: 600 } }, `第 ${L} 級`), IDS.map(I => { const t = test.find(x => x.L === L && x.I === I); return h('td', { class: t.ok ? 'ok' : 'miss', style: { fontSize: '12.5px', textAlign: 'left', fontWeight: 400 } }, t.ok ? '✓ ' + t.got : `✗ ${t.got}（應為 ${t.exp}）`); }))))),
          kpi(['通過', `${21 - bad.length} / 21`, bad.length ? 'bad' : 'good']), nt(bad.length ? `${bad.length} 組錯誤${bad.some(t => t.L === 8) ? '：第 8 級全錯——典型的邊界錯誤（查表用 < 而不是 <=）' : ''}${bad.some(t => t.I === '低收' && t.L !== 8) ? '；低收戶的自負額不是 0' : ''}。把「現象」貼給 AI，不要直接叫它「改成 0」。` : '21 組全部正確。別忘了還有：手機畫面、什麼都不選就按、免責聲明。', bad.length ? 'bad' : '')); }
      if (showCode) out.append(pre(`const TABLE = {2:10020, 3:15460, 4:18580, 5:24100, 6:28070, 7:32090, 8:36180};\nconst RATE = {'一般戶':0.16, '中低收':0.05, '低收':${ver.low ? '0.16' : '0'}};${ver.low ? '   // ← 寫錯了' : ''}\nfunction calc(level, id) {\n${ver.val ? "  if (!level) return '請先選擇 CMS 等級';\n" : ''}  if (${ver.l8 ? 'level < 8' : 'level <= 8'}) {${ver.l8 ? '          // ← 邊界：第 8 級進不來' : ''}\n    const amount = TABLE[level];\n    return { amount, copay: Math.round(amount * RATE[id]) };\n  }\n  return '查無資料';\n}`));
      const ok = !ver.low && ver.svc && ver.fmt && ver.val && !ver.l8;
      if (ok && !test) out.append(nt('這一版看起來都對了——但「看起來」不算數：按一次 21 種組合測試確認。'));
    }
    build(); $('#w-calc').append(ctl, out); draw();
  })();
  U.sorter('#w-phrase', [
    ['「我選第 5 級、低收，自負額顯示 3,856。但低收的比率是 0%，應該顯示 0。」', '好：描述現象', '讓 AI 自己找原因（比率表寫錯），它會修正根源。'],
    ['「把自負額改成 0。」', '不好：只下指令', '只治這一筆；同類問題還會再出現。'],
    ['「金額好像怪怪的，再改一次。」', '不好：沒有證據', 'AI 不知道哪裡不對。'],
    ['「我想加上『可申請服務類別』。動手前請先說明你打算怎麼改、會動到哪些地方。」', '好：描述現象', '要求先計畫再動手——較大改動時用。'],
    ['「第 8 級顯示查無資料，預期是 36,180；第 2–7 級都正常。」', '好：描述現象', '給了範圍與預期，AI 很快就會找到邊界條件。'],
    ['「第 8 級的 if 改成 <=。」', '不好：只下指令', '這次剛好猜對，但你沒有確認是不是還有別的地方用同樣的寫法。'],
  ], ['好：描述現象', '不好：只下指令', '不好：沒有證據'], '每一輪只提一到兩件事；改完都自己跑一遍；改對了就先 commit。');

  // ================= P12 =================
  (function () {
    const F = [['ltc-calculator/', 0, '專案根目錄', ''], ['package.json', 1, '★ 專案的身分證：依賴與指令（npm run dev、npm run build）', '設定'], ['package-lock.json', 1, '鎖定套件的確切版本', ''], ['vite.config.js', 1, '建置工具設定（通常不用動）', ''], ['index.html', 1, '進入點：瀏覽器最先讀的檔案', ''], ['node_modules/', 1, '★ 極大（幾萬個檔案），不要上傳 GitHub；.gitignore 會幫你攔下來', '不要碰'], ['public/', 1, '靜態資源：圖片、icon；部署後用相對路徑讀得到', ''], ['src/', 1, '★ 你的程式碼都在這裡', '改這裡'], ['main.jsx', 2, '把 App 掛到 index.html 上', ''], ['App.jsx', 2, '★ 主要畫面與邏輯——九成的時候改這裡', '改這裡'], ['components/', 2, '拆出來的小元件', ''], ['dist/', 1, '★ 建置後的成品（npm run build 產生），部署上傳這個', '成品'], ['.gitignore', 1, '告訴 Git 哪些不要追蹤（node_modules、dist、.env）', '']];
    const TC = { '改這裡': 'var(--good-soft)', '不要碰': 'var(--bad-soft)', '成品': 'var(--amber-soft)', '設定': '#e8e4f6' };
    let mode = 'fw', sel = 9; const ctl = h('div'), out = h('div');
    ctl.append(row(seg([['one', '單一 HTML 檔（最簡版）'], ['fw', '框架專案（React＋Vite）']], () => mode, v => mode = v, draw)));
    function draw() { out.innerHTML = ''; if (mode === 'one') { out.append(pre('ltc-calculator/\n  └─ index.html      ← 結構＋樣式＋邏輯全在這一個檔案'), nt('優點：雙擊就能開、部署超簡單。缺點：檔案一大就很難維護。')); return; }
      const list = h('div', { style: { fontFamily: 'var(--mono)', fontSize: '14px' } }, F.map(([n, d, , tg], i) => { const e = h('div', { style: { padding: '3px 8px', paddingLeft: (8 + d * 22) + 'px', cursor: 'pointer', borderRadius: '6px', background: i === sel ? 'var(--accent-soft)' : 'transparent', display: 'flex', gap: '8px', alignItems: 'center' } }, (d ? '├─ ' : '') + n, tg ? h('span', { style: { fontFamily: 'inherit', fontSize: '11.5px', padding: '1px 6px', borderRadius: '4px', background: TC[tg] } }, tg) : ''); e.onclick = () => { sel = i; draw(); }; return e; }));
      out.append(h('div', { class: 'grid2', style: { alignItems: 'start' } }, box('', list), h('div', null, box(F[sel][0], F[sel][2], { bg: 'var(--accent-soft)' }), h('div', { style: { height: '8px' } }), box('它們之間的關係', h('div', null, 'src/（你寫的）→ ', h('code', null, 'npm run build'), ' → dist/（成品）→ 上傳 Netlify／Vercel → 網址'))))); }
    $('#w-tree').append(ctl, out); draw();
  })();

  // ================= P13 =================
  (function () {
    const FILES = [['index.html', '', 0], ['src/App.jsx', '', 0], ['package.json', '', 0], ['node_modules/', '35,000 個檔案', 'size'], ['dist/', '建置成品', 'size'], ['.env', 'GEMINI_API_KEY=AIza…（示意）', 'key'], ['data/real_cases.csv', '真實個案資料', 'real']];
    const st = { ign: { 'node_modules/': false, 'dist/': false, '.env': false, 'data/real_cases.csv': false }, staged: [], commits: [], remote: [], leaked: new Set(), msg: '初始版本：長照給付試算器', log: [] };
    const out = h('div');
    const reset = () => { st.staged = []; st.commits = []; st.remote = []; st.leaked = new Set(); st.log = []; Object.keys(st.ign).forEach(k => st.ign[k] = false); };
    function draw() {
      out.innerHTML = '';
      const ign = h('div', null, ttl('.gitignore（勾選＝不追蹤）'), h('div', null, Object.keys(st.ign).map(k => { const c = h('input', { type: 'checkbox' }); c.checked = st.ign[k]; c.onchange = () => { st.ign[k] = c.checked; draw(); }; return h('label', { style: { display: 'inline-block', marginRight: '14px', fontSize: '14px', fontFamily: 'var(--mono)' } }, c, ' ' + k); })));
      const msgIn = h('input', { type: 'text', value: st.msg, style: { width: '260px', padding: '4px 6px' } }); msgIn.oninput = () => { st.msg = msgIn.value; };
      const b1 = h('button', { class: 'btn' }, 'git add .'), b2 = h('button', { class: 'btn' }, 'git commit -m'), b3 = h('button', { class: 'btn' }, 'git push');
      b1.onclick = () => { st.staged = FILES.filter(f => !st.ign[f[0]]).map(f => f[0]); st.log.push(`$ git add .  → 暫存 ${st.staged.length} 項`); draw(); };
      b2.onclick = () => { if (!st.staged.length) { st.log.push('$ git commit → nothing to commit（先 git add）'); draw(); return; } st.commits.push({ m: st.msg, f: st.staged.slice() }); st.log.push(`$ git commit -m "${st.msg}"${/^\s*(update|修改|改)\s*$/i.test(st.msg) ? '  ⚠ 訊息太模糊，之後找問題靠它' : ''}`); st.staged = []; draw(); };
      b3.onclick = () => { if (!st.commits.length) { st.log.push('$ git push → 沒有新的 commit'); draw(); return; } st.commits.forEach(c => { st.remote.push(c); c.f.forEach(f => { const t = FILES.find(x => x[0] === f)[2]; if (t === 'key' || t === 'real') st.leaked.add(f); }); }); st.log.push(`$ git push → 推上 ${st.commits.length} 個 commit`); st.commits = []; draw(); };
      const col = (t, items, o = {}) => box(t, items.length ? h('div', null, items.map(x => tok(x, { mono: true, bg: o.bad && o.bad(x) ? 'var(--bad-soft)' : '#eef3f2' }))) : lbl('（空）'), { st: { minHeight: '90px' } });
      const remoteFiles = [...new Set(st.remote.flatMap(c => c.f))];
      const sizeIssue = remoteFiles.includes('node_modules/');
      const isBad = x => ['.env', 'data/real_cases.csv', 'node_modules/'].includes(x);
      out.append(ign, row(b1, b2, msgIn, b3, h('button', { class: 'btn sm', onclick: () => { reset(); draw(); } }, '重來（新的儲存庫）')),
        h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: '6px' } }, col('你的電腦', FILES.map(f => f[0]), { bad: x => isBad(x) && !st.ign[x] }), col('暫存區（add 之後）', st.staged, { bad: isBad }), col('本機版本庫（未推送 commit）', st.commits.map(c => `"${c.m}"`)), col('GitHub（公開）', remoteFiles, { bad: isBad })),
        st.log.length ? pre(st.log.slice(-6).join('\n'), { dark: true }) : '',
        st.leaked.size ? nt(h('span', null, h('b', null, `✗ 已外洩：${[...st.leaked].join('、')}`), '——推上公開儲存庫就等於公開了；就算現在把檔案刪掉、加進 .gitignore，它還在歷史紀錄裡。金鑰要立刻作廢重發；真實個案資料是課程紅線。'), 'bad') : sizeIssue ? nt('⚠ node_modules 被推上去了：幾萬個檔案，應該在 .gitignore 排除。', 'warn') : remoteFiles.length ? nt('✓ 推上去了，而且沒有夾帶 node_modules、金鑰與真實資料。之後每次改完只要三行：add → commit → push。') : nt('正確做法：金鑰放 .env（只留在本機）→ .gitignore 排除它 → 部署平台的環境變數欄位填入。'));
    }
    $('#w-git').append(out); draw();
  })();

  // ================= P14 =================
  (function () {
    const P = { db: 'no', next: 'no', biz: 'no' }; const ctl = h('div'), out = h('div');
    ctl.append(row(lbl('第一問：需要存資料或使用者登入嗎？'), seg([['no', '否'], ['yes', '是']], () => P.db, v => P.db = v, draw)), row(lbl('第二問：用了 Next.js 嗎？'), seg([['no', '否'], ['yes', '是']], () => P.next, v => P.next = v, draw), lbl('　（補充）要給機構商業使用？'), seg([['no', '否'], ['yes', '是']], () => P.biz, v => P.biz = v, draw)));
    const INFO = { Firebase: ['需要登入、資料庫的應用', 'Hosting＋Auth＋Firestore 同一個平台包辦', 'CLI：npm install -g firebase-tools → firebase login → firebase init hosting → npm run build → firebase deploy', '流量較小；Functions 需付費方案'], Vercel: ['Next.js 與前端專案（Next.js 是 Vercel 做的）', '整合最順、部署最快', '用 GitHub 登入 → Add New → Project → 選儲存庫 → Deploy；之後每次 git push 自動重新部署', '★ Hobby 方案僅限非商業用途'], Netlify: ['靜態網站、文件站、純前端工具', '純前端最省事；也可以直接把 dist/ 拖進網頁', '用 GitHub 登入 → Add new site → Import → 設定 build 指令與輸出資料夾 → Deploy site', '★ 免費版無商業用途限制'] };
    function draw() { out.innerHTML = ''; let p = P.db === 'yes' ? 'Firebase' : P.next === 'yes' ? 'Vercel' : 'Netlify'; const warn = p === 'Vercel' && P.biz === 'yes';
      const path = P.db === 'yes' ? '需要存資料或登入 → Firebase' : P.next === 'yes' ? '不存資料 → 用了 Next.js → Vercel' : '不存資料 → 沒用 Next.js → Netlify';
      out.append(h('div', { style: { fontSize: '13.5px', color: 'var(--muted)', margin: '4px 0' } }, path), box(`★ ${p}`, h('div', null, h('div', null, h('b', null, '最擅長：'), INFO[p][0]), h('div', null, h('b', null, '特色：'), INFO[p][1]), h('div', null, h('b', null, '部署：'), INFO[p][2]), h('div', null, h('b', null, '限制：'), INFO[p][3])), { bg: 'var(--accent-soft)', bd: 'var(--accent)' }),
        warn ? nt('⚠ 要商業使用的話，Vercel 的 Hobby 方案不適用（僅限非商業）；改用 Netlify 免費版或付費方案。', 'warn') : '',
        P.db === 'no' && P.next === 'no' ? nt('本課程的試算器：不存資料、不用登入、沒用 Next.js → Netlify。三個平台其實都能部署它——建議至少試兩個，你才會知道差別在哪。') : '',
        tbl(['', 'Vercel', 'Netlify', 'Firebase Hosting'], [['靜態網站', '○', '○', '○'], ['Serverless／Functions', '○', '○', '△'], ['資料庫＋登入', '×', '×', '○'], ['免費額度', '100 GB 流量／月', '每月 300 點數（流量與部署共用）', '360 MB 流量／日'], ['部署方式', '連 GitHub 自動部署', '連 GitHub 或拖曳資料夾', 'CLI 指令部署']]), lbl('各平台方案與額度變動頻繁（講義整理於 2026 年 9 月）；要商用前務必自行確認最新條款，也要看資料落在哪個國家。')); }
    $('#w-deploy').append(ctl, out); draw();
  })();
  (function () {
    const C = [['用手機打開那個網址', '不是用電腦看縮小的視窗，是真的用手機開'], ['用無痕視窗打開', '確認沒有依賴你本機的任何東西'], ['★ 傳給一個同學打開', '最實在的測試——他打不開就是還沒完成'], ['再測一次所有組合', '部署版本可能與本機版本不同'], ['確認免責聲明有顯示', '課程要求；也是 M7 四條紅線之一'], ['★ 檢查有沒有洩漏東西', '打開網頁原始碼看看有沒有金鑰、真實個案資料']];
    const st = Store.get('m10:post', {}); const out = h('div');
    function draw() { out.innerHTML = ''; C.forEach(([t, d], i) => { const c = h('input', { type: 'checkbox' }); c.checked = !!st[i]; c.onchange = () => { st[i] = c.checked; Store.set('m10:post', st); draw(); }; out.append(h('label', { style: { display: 'flex', gap: '10px', padding: '6px 2px', borderBottom: '1px solid var(--line)', fontSize: '14.5px' } }, c, h('span', null, h('b', null, `${i + 1}. ${t}`), '　', lbl(d)))); }); const n = C.filter((_, i) => st[i]).length; out.append(row(h('span', { class: 'tag ' + (n === 6 ? 'good' : 'gray') }, `完成 ${n} / 6`))); }
    $('#w-post').append(out); draw();
  })();
  U.sorter('#w-dfail', [
    ['本機好好的，部署後一片空白', '輸出資料夾設錯', 'Vite 通常是 dist，舊 CRA 是 build；打開開發者工具看 Console 紅字。'],
    ['圖片讀不到，程式裡寫著 C:\\Users\\me\\logo.png', '路徑寫成絕對路徑', '一律用相對路徑，或把靜態檔放進 public/。'],
    ['推上去了但網站沒更新', '還在建置或建置失敗', '到平台的 Deploys 頁面看記錄；也可能是瀏覽器快取，用無痕或 Ctrl+F5。'],
  ], ['輸出資料夾設錯', '路徑寫成絕對路徑', '還在建置或建置失敗'], '三個問題都可以直接把錯誤訊息貼給 AI 問。');

  // ================= P15 =================
  U.sorter('#w-risk', [
    ['AI 把 API 金鑰直接寫在前端程式碼裡', '資安', '金鑰不寫進程式碼；涉及認證、權限的部分務必人工檢查。'],
    ['自負額公式看起來合理，但低收戶算出來不是 0', '正確性', '以測試驗證；關鍵計算用已知答案的例子驗算。'],
    ['三個月後你自己也看不懂 AI 寫的那 800 行', '可維護性', '定期請 AI 解釋既有程式碼；用專案規則檔統一風格。'],
    ['AI 為了一個日期格式裝了一個已停止維護的套件', '依賴與授權', '檢查它裝了什麼套件；公開發布前確認授權。'],
    ['同學把一段含真實個案姓名的資料貼進對話框請 AI 整理', '資料外洩', '不得貼入真實個案資料；敏感專案改用本地模型。'],
  ], ['資安', '正確性', '可維護性', '依賴與授權', '資料外洩']);
  U.sorter('#w-when', [
    ['做一個概念驗證（MVP）給老師看', '適合', '快速原型正是強項。'],
    ['重複性高的資料整理腳本', '適合', '邏輯明確、算錯看得出來。'],
    ['醫院正式上線的劑量計算模組', '不適合', '會影響真實臨床決策；需要有人完整讀懂並負責。'],
    ['補寫既有程式碼的說明文件', '適合', '解釋與文件補寫是低風險高效益。'],
    ['需要通過稽核的給付申報系統', '不適合', '需要通過法規查核或稽核的產出。'],
    ['你完全無法驗證正確性的專業統計計算', '不適合', '看不出對錯就不要用在會影響別人的地方。'],
  ], ['適合', '不適合'], '如果這段程式碼算錯了，會有人受影響嗎？');

  // ================= P16 =================
  (function () {
    let r = 'B'; const ctl = h('div'), out = h('div');
    const R = { A: ['路線 A　平台', 'Dify、n8n、Coze', '拖拉節點即可完成；數小時出 Demo；★ 受限於平台提供的節點', '本課程 M8 走這條'], B: ['路線 B　Vibe Coding＋框架', 'Claude Agent SDK、LangGraph（另有 OpenAI Agents SDK、CrewAI）', '用自然語言請 AI 寫程式；邏輯完全客製、可版控、可寫單元測試；★ 需要看得懂程式在做什麼；出 Demo 約數天', '本課程 M10 走這條'], C: ['路線 C　全手工', '直接呼叫 LLM API', 'agent loop、重試、記憶全部自己刻；開發成本最高；出 Demo 約數週', '教學上只作原理說明'] };
    ctl.append(row(seg([['A', '路線 A　平台'], ['B', '路線 B　框架'], ['C', '路線 C　全手工']], () => r, v => r = v, draw)));
    function draw() { out.innerHTML = ''; const [t, ex, d, c] = R[r];
      out.append(box(t, h('div', null, h('div', null, h('b', null, '例子：'), ex), h('div', null, d), h('div', { style: { color: 'var(--accent)', fontWeight: 700 } }, c)), { bg: 'var(--accent-soft)' }),
        tbl(['Dify Chatflow（M8）', '程式碼版（M10）'], [['知識檢索節點（Top-K、閾值）', 'search_regulation() 工具函式'], ['LLM 節點：四段式 System Prompt', 'SYSTEM 變數，讀自同一份 .md'], ['程式碼節點：查表算金額', 'lookup_payment() 工具函式（@tool）'], ['模板轉換：固定輸出格式', '輸出格式驗證函式（或 Pydantic 模型）'], ['最大迭代次數：介面欄位', 'max_turns 參數'], ['除錯：右側 Tracing 面板', 'log、breakpoint、單元測試'], ['版本管理：匯出 .yml', 'Git，可 diff、可回溯']]),
        nt('三條路不是取代關係：先用 A 驗證構想，確定要上線再視需要移到 B。多數課程專題停在 A 就夠了。')); }
    $('#w-routes').append(ctl, out); draw();
  })();
  (function () {
    const G = [['turns', '① 最大輪數與逾時', 'max_turns=8, timeout=60', 'Agent 一直覺得「還不夠」，同一個查詢重跑了 40 輪', '第 8 輪停下並回報「未能完成」'], ['white', '② 工具白名單與最小權限', 'tools=[lookup_payment, search_regulation]', 'Agent 判斷「清掉舊檔比較乾淨」，呼叫了刪除檔案工具', '刪除工具不在白名單；寫入／刪除一律要人工確認'], ['cost', '③ 成本上限與用量記錄', 'max_cost_per_run=0.5 USD', '一次對話用掉一整個月的 API 預算', '達單次上限即停止，並記錄 token 用量'], ['valid', '④ 輸出驗證與稽核軌跡', 'output_type=PaymentResult（Pydantic）', '輸出少了「資料來源」欄位，前端直接顯示一半', '格式不符即拒收重試；每輪思考與工具呼叫都記錄'], ['fallback', '⑤ 失敗回退', 'retry=2 → 備援來源 → 明確回報失敗', '法規檢索 API 掛了，Agent 改用記憶自己編', '重試兩次後改用備援並告知使用者'], ['pii', '⑥ 敏感資料過濾', 'deidentify(case) before LLM', '個案姓名與身分證字號原樣送進外部 LLM', '送出前去識別化；最敏感欄位交給本地模型']];
    const on = {}; G.forEach(g => on[g[0]] = true); const ctl = h('div'), out = h('div');
    ctl.append(row(...G.map(g => check(g[1], () => on[g[0]], v => on[g[0]] = v, draw))));
    function draw() { out.innerHTML = ''; const off = G.filter(g => !on[g[0]]);
      out.append(pre(`agent = Agent(\n    system_prompt = SYSTEM,\n${G.map(g => (on[g[0]] ? '    ' : '    # （拿掉了）') + g[2] + ',').join('\n')}\n)`, { dark: true }),
        h('div', { style: { display: 'grid', gap: '6px' } }, G.map(([k, t, , bad, good]) => h('div', { style: { borderLeft: '4px solid ' + (on[k] ? 'var(--good)' : 'var(--bad)'), background: on[k] ? 'var(--good-soft)' : 'var(--bad-soft)', borderRadius: '6px', padding: '6px 10px', fontSize: '14px' } }, h('b', null, t + '：'), on[k] ? '✓ ' + good : '✗ ' + bad))),
        nt(off.length ? `拿掉了 ${off.length} 道護欄。這六件事在 Dify 裡多半是介面上的設定欄位；換到程式碼，每一項都得自己寫——這是換路線的隱藏成本。` : '六道護欄都在。Agent 沒有護欄，就是一台會自己花錢的機器。', off.length ? 'bad' : ''), lbl('框架語法略有差異，參數名稱為示意。')); }
    $('#w-guard').append(ctl, out); draw();
  })();
  U.sorter('#w-switch', [
    ['Dify 的節點表達不出你的邏輯（需要遞迴、複雜狀態機）', '換程式碼', '平台塞不下時才換。'],
    ['需要每次改動都自動跑測試（CI/CD）', '換程式碼', ''],
    ['醫療場域稽核要求嚴格版本控制與 code review', '換程式碼', ''],
    ['只是覺得「寫程式比較厲害」', '留在 Dify', '沒有實質需求，是換錯理由。'],
    ['流程還在頻繁調整', '留在 Dify', '改一個節點 30 秒 vs 改程式再測 30 分鐘。'],
    ['你畢業後團隊裡沒人能維護程式碼', '留在 Dify', '可維護性比技術先進度重要得多。'],
  ], ['換程式碼', '留在 Dify'], '用 Vibe Coding 做 Agent 六步：先在 Dify 走通 → 描述給 AI → 先寫測試 → 逐個工具驗證 → 加護欄 → 要 AI 解釋。');

  // ================= P17 =================
  (function () {
    const L = [['選一個你實際會用到的小需求', '例如把一疊 Excel 合併成一張總表'], ['安裝一套工具並完成設定', 'Cursor、Claude Code 或 Copilot 皆可'], ['寫一份一頁的 PRD.md', '目標、輸入、輸出、不做什麼'], ['建立 Git 儲存庫並完成第一次 commit', ''], ['用三到五個 Prompt 完成核心功能', '每一步都執行確認並 commit'], ['至少經歷一次「AI 卡住 → 你用四個手法之一解決」', '記錄下來'], ['請 AI 逐段解釋你不懂的部分', '直到你能說明整段在做什麼'], ['撰寫自學紀錄並上傳', '見下一節']];
    const st = Store.get('m10:lab', {}); const out = h('div');
    function draw() { out.innerHTML = ''; L.forEach(([t, d], i) => { const c = h('input', { type: 'checkbox' }); c.checked = !!st[i]; c.onchange = () => { st[i] = c.checked; Store.set('m10:lab', st); draw(); }; out.append(h('label', { style: { display: 'flex', gap: '10px', padding: '7px 2px', borderBottom: '1px solid var(--line)', fontSize: '14.5px' } }, c, h('span', null, h('b', null, `${i + 1}. ${t}`), d ? h('span', null, '　', lbl(d)) : ''))); });
      const n = L.filter((_, i) => st[i]).length; out.append(row(h('span', { class: 'tag ' + (n === L.length ? 'good' : 'gray') }, `完成 ${n} / ${L.length}`), lbl('原始教材：Vibe Coding - AI Driven Software Development.pptx（37 頁）與中文精簡版（22 頁），位於課程根目錄。'))); }
    $('#w-lab').append(out); draw();
  })();

  // ================= P18 =================
  (function () {
    const Q = [['你做了什麼', '工具名稱、專案目的、最後完成到什麼程度（有沒有做完都可以）'], ['你用了哪些 Prompt', '貼出三到五個實際使用的 Prompt，標出哪一個效果好、哪一個要重寫'], ['★ 卡關與解決', '描述一次 AI 卡住的情況：它產出了什麼、為什麼不對、你怎麼讓它走回正軌'], ['★ 你看不懂的部分', '誠實寫出哪一段程式碼你還是說不清楚它在做什麼（不扣分，越具體越好）'], ['★ 你的判斷', '這個工具在你未來的工作裡，哪些地方會用、哪些地方不會用？為什麼？']];
    const st = Store.get('m10:log', {}); const out = h('div');
    const md = () => '# M10 自學紀錄\n\n' + Q.map(([t], i) => `## ${i + 1}. ${t.replace('★ ', '')}\n\n${(st[i] || '').trim() || '（待填）'}\n`).join('\n');
    Q.forEach(([t, d], i) => { const ta = h('textarea', { rows: 3, placeholder: d, style: { width: '100%', fontSize: '14px', padding: '6px 8px', borderRadius: '8px', border: '1px solid var(--line)' } }); ta.value = st[i] || ''; ta.oninput = () => { st[i] = ta.value; Store.set('m10:log', st); cnt.textContent = count(); }; out.append(h('div', { style: { margin: '8px 0' } }, h('b', { style: { fontSize: '14.5px' } }, `${i + 1}. ${t}`), ta)); });
    const count = () => `已填 ${Q.filter((_, i) => (st[i] || '').trim()).length} / 5 項`; const cnt = h('span', { class: 'tag gray' }, count());
    out.append(row(cnt, copyBtn(md), lbl('「複製」會產生 Markdown，可貼到 Word 或 Google 文件。')), nt('評分併入課堂參與分（10%）。重點在第 3、4、5 項——過程與判斷比成品重要。'));
    $('#w-log').append(out);
  })();

  // ================= P19 =================
  U.flashcards('#w-cards', [['氛圍編程', 'Vibe Coding', '以自然語言描述需求，由 LLM 生成程式碼'], ['行內補全', 'Inline Completion', 'Level 1：AI 補完當前這一行'], ['代理協作', 'Agentic Coding', 'Level 3：AI 讀懂整個專案、改多個檔案'], ['差異', 'diff', '這次改了哪些行；代理模式審查的對象'], ['產品需求文件', 'PRD', '一頁寫清楚目標、範圍、不做什麼'], ['專案規則檔', 'CLAUDE.md / AGENTS.md', '技術棧、風格、禁止事項'], ['提交', 'commit', '一個可退回的版本點'], ['推送', 'push', '把本機 commit 送上 GitHub'], ['忽略清單', '.gitignore', '不追蹤 node_modules、dist、.env'], ['環境變數', '.env', '金鑰只留在本機，部署平台另外填'], ['建置成品', 'dist/', 'npm run build 產生，部署上傳這個'], ['持續整合', 'CI/CD', '每次推送自動跑測試與部署'], ['模型情境協定', 'MCP', '把外部工具接給 AI 用的開放協定'], ['護欄', 'Guardrails', '最大輪數、白名單、成本上限、逾時'], ['最大輪數', 'max_turns', '程式碼版的「最大迭代次數」']]);
  U.finalQuiz('#w-final', [
    ['真正的 Karpathy 式 vibe coding 指的是光譜的哪一段？', ['Level 0–1', 'Level 1–2', 'Level 3–4', '只有 Level 4'], 2, '實務上多數人在 Level 2–3 游走，依風險調整。'],
    ['對健康照護背景的人，Vibe Coding 的價值是？', ['打字更快', '原本做不到的事現在做得到（質的改變）', '不需要再驗證', '可以取代工程師'], 1, '所以「怎麼驗證」比「怎麼生成」更重要。'],
    ['「不熟 × 高風險」的任務（例如臨床劑量計算邏輯），建議做法是？', ['全交給 Agentic 模式', '先找人審查，或不要用', '用補全型就好', '多問幾次取平均'], 1, '最危險的象限：AI 寫得出來、你看不出對錯。'],
    ['六步工作流中，最常被略過、也是失敗率最高原因的是？', ['規劃與規格', '生成', '審查與迭代', '部署'], 0, '花十分鐘寫規格，省下兩小時來回修正。'],
    ['好的任務 Prompt 三要素是？', ['禮貌、簡短、用英文', '明確參照、單一目標、明確邊界', '越長越好', '附上整個專案'], 1, '例：閱讀 @PRD.md 第 3 節…只改 components/PatientList.tsx。'],
    ['第一個指令裡，哪一項不寫最容易讓 AI 給出 React＋Node.js＋資料庫？', ['給誰用', '輸出什麼', '技術限制', '做什麼'], 2, '不確定就寫「請先用最簡單的方式實作」。'],
    ['發現第 5 級低收自負額顯示 3,856，最好的修正 Prompt 是？', ['「把自負額改成 0」', '描述現象：選第 5 級、低收顯示 3,856，但低收比率是 0%，應顯示 0', '「再改一次」', '「重新做一個」'], 1, '描述現象讓 AI 修正根源。'],
    ['用框架產生的專案，要改功能九成改哪裡？', ['node_modules/', 'dist/', 'src/App.jsx', 'package-lock.json'], 2, 'src/ 是你的程式碼。'],
    ['不小心把含 API 金鑰的 .env 推上公開儲存庫，之後刪掉檔案就沒事了嗎？', ['是，刪掉就好', '不是：歷史紀錄裡還在，金鑰要作廢重發', '改成 Private 就好', '加進 .gitignore 就好'], 1, '推上公開儲存庫就等於公開了。'],
    ['本課程的長照試算器（不存資料、不用登入、沒用 Next.js），決策樹建議？', ['Firebase', 'Vercel', 'Netlify', '一定要自架伺服器'], 2, '純前端最省事，免費版無商業用途限制。'],
    ['部署後六個檢查中，最容易被跳過但最重要的是？', ['用無痕視窗打開', '傳給一個同學打開', '確認免責聲明', '再測一次所有組合'], 1, '「我這邊沒問題」和「別人打得開」是兩件事。'],
    ['用 Vibe Coding 寫 Agent，哪兩步最不能省？', ['選框架與命名', '先寫測試、加護欄', '美化介面、寫 README', '換模型、換工具'], 1, 'Vibe Coding 讓「寫出來」變快，沒有讓「驗證」變快。'],
  ]);
  (function () {
    const T = [['光譜五個層級中，你在課堂 Lab 實際落在哪一級？為什麼停在那裡？', '想想是什麼限制了你——工具能力、你的驗證能力，還是任務的風險。'], ['如果同事用 AI 生成了一段計算長照給付金額的程式碼，你會怎麼驗證？', '想想 M1 的資料檢查與 M8 的「數字不生成、要查表」——再加上這一頁的 21 種組合測試。'], ['AI 生成的程式碼會不會有偏誤？如果會，來自哪裡？', '它學自公開的程式碼庫。那些程式碼裡內建了哪些假設？誰寫的？為誰寫的？']];
    T.forEach(([q, hint], i) => $('#w-think').append(h('details', { style: { border: '1px solid var(--line)', borderRadius: '10px', padding: '8px 12px', margin: '6px 0', background: '#fff' } }, h('summary', { style: { cursor: 'pointer', fontWeight: 600, fontSize: '14.5px' } }, `Q${i + 1}　${q}`), h('div', { style: { fontSize: '14px', color: 'var(--muted)', marginTop: '6px' } }, '提示：' + hint))));
  })();
  (function () {
    const R = [['抽象層級的最新一段', '不是斷裂式的革命。', 'p01'], ['依風險調整強度', '光譜五級，不是永遠全開。', 'p02'], ['質的改變', '原本做不到的事現在做得到。', 'p03'], ['六步工作流', '「描述 → 驗證 → 修正」不會變。', 'p06'], ['卡住時四招', '證據、先解釋、退回、換工具。', 'p09'], ['五行規格', '技術限制最重要；數字給它查表。', 'p10'], ['21 種組合', '看起來對不算數，測過才算。', 'p11'], ['推之前三個檢查', 'node_modules、金鑰、真實資料。', 'p13'], ['說不出就不要用', '不用在會影響別人的地方。', 'p15']];
    const g = h('div', { class: 'grid3' }); R.forEach(([t, d, id], i) => g.append(h('a', { href: '#' + id, style: { textDecoration: 'none', color: 'inherit', border: '1px solid var(--line)', borderRadius: '10px', padding: '10px 12px', background: '#fff', display: 'block' } }, h('div', { class: 'mono', style: { color: 'var(--accent)', fontWeight: 700 } }, i + 1), h('b', null, t), h('div', { style: { fontSize: '13.5px', color: 'var(--muted)' } }, d))));
    $('#w-review').append(g, h('div', { class: 'note' }, h('b', null, '下一步：'), '第 18 週 期末報告繳交與總結評量。', h('a', { href: '../' }, '回到課程首頁 →')));
  })();
})();
