/* M10 加強版（2026-11）：METR 2025 開發者實驗（真實數字）、AI 寫的 eGFR 函式五個版本 × 一萬組隨機測試、推上 GitHub 前的金鑰掃描 */
(function () {
  'use strict';
  const { h, $, S, fmt, seg, check, slider, C } = U;
  const kpi = (k, v, cls) => h('div', null, h('div', { class: 'k' }, k), h('div', { class: 'v' + (cls ? ' ' + cls : '') }, v));
  const sub = t => h('div', { style: { fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' } }, t);
  const lab = t => h('span', { style: { fontSize: '13px', color: 'var(--muted)' } }, t);
  const note = (msg, cls) => h('div', { class: 'note' + (cls ? ' ' + cls : ''), style: { marginTop: '10px' } }, h('b', null, '看懂了什麼：'), msg);
  const span = (t, st) => h('span', { style: st }, t);
  const pc = v => (v * 100).toFixed(1) + '%';

  /* ====================================================================
     ① 第 03 節：覺得變快，實際變慢——METR 2025 隨機對照實驗
     ==================================================================== */
  (function metr() {
    const box = $('#w-metr'); if (!box) return;
    const BARS = [['經濟學專家的預測', -39], ['機器學習專家的預測', -38], ['開發者事前預測', -24], ['開發者做完後的自評', -20], ['實際測量結果', 19]];
    let guess = -20, shown = false;
    const out = h('div');
    function draw() {
      out.innerHTML = '';
      const btn = h('button', { class: 'btn primary' }, shown ? '再猜一次' : '揭曉結果'); btn.onclick = () => { shown = !shown; draw(); };
      out.append(h('div', { class: 'row', style: { gap: '18px', flexWrap: 'wrap', marginBottom: '10px', alignItems: 'center' } }, slider('先猜：允許用 AI 後，完成任務的時間會變多少？', -60, 40, 1, () => guess, v => { guess = v; }, () => { if (shown) draw(); }, v => (v > 0 ? '+' : '') + v + '%'), btn));
      if (!shown) { out.append(h('div', { style: { fontSize: '14px', color: 'var(--muted)', padding: '10px 0' } }, '實驗設計：16 位有經驗的開源軟體開發者，在自己長期維護的大型專案上完成 246 個真實任務；每個任務隨機分成「可以用 AI」或「不能用 AI」，記錄實際花費的時間。用的是 2025 年初的工具（Cursor Pro 搭配 Claude 3.5／3.7 Sonnet）。拖動上面的滑桿，按「揭曉結果」。')); return; }
      const all = BARS.concat([['你的猜測', guess]]), W = 640, rowH = 34, H = all.length * rowH + 30, lw = 170;
      const ch = h('div'); out.append(sub('負值＝AI 讓任務變快（時間縮短）、正值＝變慢'), ch);
      const sv = U.svgBox(ch, W, H), x = U.scale(-60, 40, lw, W - 50);
      [-60, -40, -20, 0, 20, 40].forEach(t => { U.s('line', { x1: x(t), x2: x(t), y1: 6, y2: H - 22, class: t === 0 ? 'axis' : 'grid' }, sv); U.s('text', { x: x(t), y: H - 6, 'text-anchor': 'middle', text: (t > 0 ? '+' : '') + t + '%' }, sv); });
      all.forEach(([n, v], i) => { const y = 10 + i * rowH, col = i === 4 ? C.bad : i === 5 ? C.amber : C.gray;
        U.s('text', { x: lw - 8, y: y + 15, 'text-anchor': 'end', text: n, style: `font-size:12.5px;fill:#1c2430;font-weight:${i >= 4 ? 700 : 400}` }, sv);
        U.s('rect', { x: Math.min(x(0), x(v)), y: y + 3, width: Math.abs(x(v) - x(0)), height: rowH - 12, rx: 3, fill: col }, sv);
        U.s('text', { x: v >= 0 ? x(v) + 6 : x(v) - 6, y: y + 18, 'text-anchor': v >= 0 ? 'start' : 'end', text: (v > 0 ? '+' : '') + v + '%', style: 'font-size:12px;font-family:var(--mono);fill:#1c2430' }, sv); });
      out.append(note(`所有人都預測 AI 會讓任務變快 20–39%，連開發者自己做完後都覺得快了 20%——實際測量卻是慢了 19%。主觀感受和客觀測量差了將近 40 個百分點。${guess > 0 ? '你猜對了方向，很少人猜對。' : `你猜 ${guess}%，和大多數專家一樣。`}這不代表 AI 沒用：研究對象是在自己非常熟悉的大型專案上工作的資深開發者，工具也是 2025 年初的版本；對不熟悉的程式語言、小型新專案，結果可能完全不同。這門課要你學的正是這件事：用測量取代感覺——寫自學紀錄時，記下實際花的時間。`, 'warn'));
    }
    box.append(out); draw();
  })();

  /* ====================================================================
     ② 第 11 節：AI 改了五版的 eGFR 函式——手寫測試 vs 一萬組隨機測試
     ==================================================================== */
  (function egfr() {
    const box = $('#w-egfr'); if (!box) return;
    // 參考實作：CKD-EPI 2021（不含種族係數）
    const ref = (sex, age, scr) => { const F = sex === 'F', k = F ? .7 : .9, a = F ? -.241 : -.302; return 142 * Math.pow(Math.min(scr / k, 1), a) * Math.pow(Math.max(scr / k, 1), -1.2) * Math.pow(.9938, age) * (F ? 1.012 : 1); };
    const V = [
      { n: '第 1 版', code: "const k = sex === 'F' ? 0.9 : 0.7;   // ← 男女常數寫反", f: (sex, age, scr) => { const F = sex === 'F', k = F ? .9 : .7, a = F ? -.241 : -.302; return 142 * Math.pow(Math.min(scr / k, 1), a) * Math.pow(Math.max(scr / k, 1), -1.2) * Math.pow(.9938, age) * (F ? 1.012 : 1); }, fix: '「女性算出來的 eGFR 好像偏高」→ AI 把常數改回來，但重寫時……' },
      { n: '第 2 版', code: 'Math.pow(Math.min(scr / k, 1), -1.2)   // ← max 寫成 min', f: (sex, age, scr) => { const F = sex === 'F', k = F ? .7 : .9, a = F ? -.241 : -.302; return 142 * Math.pow(Math.min(scr / k, 1), a) * Math.pow(Math.min(scr / k, 1), -1.2) * Math.pow(.9938, age) * (F ? 1.012 : 1); }, fix: '「肌酸酐 3.0 的病人怎麼是 G2？」→ AI 修好 max，但順手「整理」了常數……' },
      { n: '第 3 版', code: 'Math.pow(0.993, age)   // ← 0.9938 被打成 0.993', f: (sex, age, scr) => { const F = sex === 'F', k = F ? .7 : .9, a = F ? -.241 : -.302; return 142 * Math.pow(Math.min(scr / k, 1), a) * Math.pow(Math.max(scr / k, 1), -1.2) * Math.pow(.993, age) * (F ? 1.012 : 1); }, fix: '「老人家的分期好像偏重」→ AI 改回 0.9938，並加上表單輸入處理……' },
      { n: '第 4 版', code: 'const scr = parseInt(input.value);   // ← 小數被截掉', f: (sex, age, scr) => ref(sex, age, Math.max(.1, parseInt(scr))), fix: '「輸入 1.3 和 1.9 結果一樣」→ AI 改用 parseFloat。' },
      { n: '第 5 版', code: 'const scr = parseFloat(input.value);   // 與參考實作一致', f: ref, fix: '' }
    ];
    const stage = e => e >= 90 ? 'G1' : e >= 60 ? 'G2' : e >= 45 ? 'G3a' : e >= 30 ? 'G3b' : e >= 15 ? 'G4' : 'G5';
    const HAND = [['M', 45, 1.0], ['F', 62, .9], ['M', 70, 1.4], ['F', 80, 1.1], ['M', 30, .8], ['F', 55, .6], ['M', 85, 2.5], ['F', 40, 3.0]];
    const R = U.rng(2021), RAND = Array.from({ length: 10000 }, () => [R() < .5 ? 'F' : 'M', Math.round(18 + R() * 77), +(Math.exp(Math.log(.4) + R() * Math.log(6 / .4))).toFixed(2)]);
    const RES = V.map(v => { let bad = 0, mis = 0, maxE = 0, dang = 0; RAND.forEach(([s0, a, c]) => { const r0 = ref(s0, a, c), e = v.f(s0, a, c), d = (e - r0) / r0; if (Math.abs(e - r0) > 1) bad++; if (stage(e) !== stage(r0)) { mis++; if (e > r0) dang++; } maxE = Math.max(maxE, Math.abs(d)); }); return { bad: bad / RAND.length, mis: mis / RAND.length, dang: dang / RAND.length, maxE, hand: HAND.map(([s0, a, c]) => stage(v.f(s0, a, c)) === stage(ref(s0, a, c))) }; });
    let vi = 2, sex = 'F';
    const out = h('div');
    function draw() {
      out.innerHTML = '';
      out.append(h('div', { class: 'row', style: { gap: '10px', flexWrap: 'wrap', marginBottom: '10px' } }, lab('版本'), seg(V.map((v, i) => [i, v.n]), () => vi, v => vi = v, draw), lab('熱圖顯示'), seg([['F', '女性'], ['M', '男性']], () => sex, v => sex = v, draw)));
      const r = RES[vi], v = V[vi];
      out.append(h('div', { style: { fontFamily: 'var(--mono)', fontSize: '13px', background: '#f4f2ed', borderRadius: '6px', padding: '6px 10px', marginBottom: '10px' } }, v.code));
      out.append(h('div', { class: 'kpi', style: { marginBottom: '10px' } }, kpi('手寫 8 個測試（看分期）', `${r.hand.filter(Boolean).length} / 8 通過`, r.hand.every(Boolean) ? 'good' : 'bad'), kpi('一萬組隨機輸入：誤差 > 1', pc(r.bad), r.bad > .01 ? 'bad' : 'good'), kpi('分期判錯', pc(r.mis), r.mis > .005 ? 'bad' : 'good'), kpi('其中「判得比實際輕」', pc(r.dang), r.dang > .005 ? 'bad' : ''), kpi('最大相對誤差', (r.maxE * 100).toFixed(0) + '%')));
      const g = h('div', { class: 'grid2', style: { gap: '18px', alignItems: 'start' } });
      const mx = h('div'); mx.append(sub('手寫測試 × 五個版本（✓＝分期和參考實作一樣）'));
      const tb = h('div', { style: { display: 'grid', gridTemplateColumns: '120px repeat(5,1fr)', gap: '3px', fontSize: '12.5px' } });
      tb.append(h('b', null, '性別・年齡・肌酸酐'), ...V.map((x, i) => h('b', { style: { textAlign: 'center', color: i === vi ? C.accent : 'inherit' } }, x.n.replace('第 ', 'v').replace(' 版', ''))));
      HAND.forEach(([s0, a, c], t) => { tb.append(h('div', { style: { fontFamily: 'var(--mono)' } }, `${s0 === 'F' ? '女' : '男'} ${a} 歲 ${c}`)); RES.forEach((rr, i) => tb.append(h('div', { style: { textAlign: 'center', borderRadius: '4px', background: rr.hand[t] ? '#e3f1e8' : '#fbe3df', color: rr.hand[t] ? C.good : C.bad, fontWeight: 700, outline: i === vi ? '1.5px solid #1c2430' : 'none' } }, rr.hand[t] ? '✓' : '✗'))); });
      tb.append(h('b', null, '一萬組分期錯'), ...RES.map((rr, i) => h('div', { style: { textAlign: 'center', fontFamily: 'var(--mono)', fontSize: '11.5px', color: rr.mis > .005 ? C.bad : C.good, fontWeight: i === vi ? 700 : 400 } }, pc(rr.mis))));
      mx.append(tb);
      const hm = h('div'); hm.append(sub(`${v.n}的誤差熱圖（${sex === 'F' ? '女性' : '男性'}）：橫軸年齡、縱軸肌酸酐；紅＝高估、藍＝低估（誤差 10% 以上為最深色）`));
      const W = 420, H = 260, ml = 40, mb = 30, nx = 39, ny = 30, sv = U.svgBox(hm.appendChild(h('div')), W, H);
      const cw = (W - ml - 8) / nx, chh = (H - mb - 8) / ny;
      for (let i = 0; i < nx; i++) for (let j = 0; j < ny; j++) { const age = 18 + i * 2, scr = Math.exp(Math.log(.4) + (j + .5) / ny * Math.log(10)), r0 = ref(sex, age, scr), d = (v.f(sex, age, scr) - r0) / r0, t = Math.min(1, Math.abs(d) / .1);
        U.s('rect', { x: ml + i * cw, y: 8 + (ny - 1 - j) * chh, width: cw + .3, height: chh + .3, fill: Math.abs(d) < .005 ? '#f1efe9' : d > 0 ? `rgba(192,57,43,${.15 + .85 * t})` : `rgba(43,108,176,${.15 + .85 * t})` }, sv); }
      [20, 40, 60, 80].forEach(a => U.s('text', { x: ml + (a - 18) / 2 * cw, y: H - 12, 'text-anchor': 'middle', text: a + ' 歲' }, sv));
      [.5, 1, 2, 4].forEach(c => U.s('text', { x: ml - 4, y: 8 + (ny - Math.log(c / .4) / Math.log(10) * ny) * chh + 4, 'text-anchor': 'end', text: c }, sv));
      g.append(mx, hm); out.append(g);
      if (v.fix) out.append(h('div', { style: { fontSize: '13px', color: 'var(--muted)', marginTop: '6px' } }, '使用者回報 → ' + v.fix));
      let msg;
      if (vi === 2) msg = `第 3 版最陰險：8 個手寫測試全部通過（只看分期），一萬組隨機輸入卻有 ${pc(r.mis)} 分期判錯——0.9938 被打成 0.993，誤差隨年齡越來越大（熱圖越往右越藍），只在接近分期邊界的病人身上才會改變分期。手動挑幾個數字試，很難剛好挑到。`;
      else if (vi === 1) msg = `第 2 版：肌酸酐高於 ${sex === 'F' ? '0.7' : '0.9'} 時本來該往下修正的項完全失效（熱圖上半部全紅），高估最多 ${(r.maxE * 100).toFixed(0)}%；${pc(r.dang)} 的病人被判得比實際輕——腎功能不好卻看起來正常，這是最危險的錯。注意它是在「修第 1 版」時引入的：AI 改 A 壞 B，所以每次修改後都要重跑全部測試（回歸測試）。`;
      else if (vi === 3) msg = `第 4 版：parseInt 把 1.9 變成 1、0.8 變成 0（程式再補成 0.1），熱圖出現一條條色帶。手寫測試有 ${8 - r.hand.filter(Boolean).length} 個沒過，算是容易抓的錯；但如果你的手寫測試剛好都用整數肌酸酐，就會全部通過。`;
      else if (vi === 0) msg = `第 1 版：男女常數寫反。女性高估、男性低估（切換熱圖看兩邊顏色相反），手寫測試抓到 ${8 - r.hand.filter(Boolean).length} 個。`;
      else msg = '第 5 版與參考實作一致：手寫測試與一萬組隨機輸入全部通過。做法要點：①先寫一個你信得過的參考版本（或用公開計算器的結果）②請 AI 寫函式時也寫測試 ③每改一次就重跑全部測試 ④隨機輸入 + 邊界值（分期切點、男女、極端年齡）一起測。';
      out.append(note(msg, vi < 4 ? 'warn' : ''));
    }
    box.append(out); draw();
  })();

  /* ====================================================================
     ③ 第 13 節：推上 GitHub 之前——掃描 120 個檔案裡的金鑰
     ==================================================================== */
  (function secrets() {
    const box = $('#w-secret'); if (!box) return;
    const R = U.rng(1313), pick = a => a[Math.floor(R() * a.length)], rs = (n, al) => Array.from({ length: n }, () => al[Math.floor(R() * al.length)]).join('');
    const AN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789', UP = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    const FILES = [];
    const add = (path, lines, secretLines = []) => FILES.push({ path, lines, secret: new Set(secretLines) });
    // 正常檔案
    const comps = ['TaskList', 'TaskItem', 'Header', 'Footer', 'Calculator', 'Chart', 'Form', 'Modal', 'Button', 'Sidebar', 'Login', 'Settings', 'Report', 'Table', 'Filter', 'Search'];
    comps.forEach(c => add(`src/components/${c}.jsx`, [`import React from 'react';`, `export default function ${c}(props) {`, `  const [state, setState] = React.useState(null);`, `  return <div className="${c.toLowerCase()}">{props.children}</div>;`, '}']));
    ['utils', 'format', 'date', 'api', 'storage', 'validate', 'calc', 'i18n'].forEach(u => add(`src/lib/${u}.js`, [`export function ${u}Helper(x) {`, `  // commit ${rs(40, '0123456789abcdef')}`, `  return x;`, '}']));
    for (let i = 0; i < 40; i++) add(`src/pages/page${i + 1}.jsx`, [`import Layout from '../components/Header';`, `export default function Page${i + 1}() { return <Layout title="第 ${i + 1} 頁" />; }`]);
    for (let i = 0; i < 30; i++) add(`public/img/icon${i + 1}.svg`, [`<svg viewBox="0 0 24 24"><path d="M${rs(6, '0123456789')} L${rs(6, '0123456789')}"/></svg>`]);
    add('package.json', ['{', '  "name": "taskflow",', '  "dependencies": { "react": "^18.3.1", "next": "^14.2.0" }', '}']);
    add('README.md', ['# TaskFlow', '把 .env.example 複製成 .env，填入你自己的 OPENAI_API_KEY。']);
    add('.env.example', ['OPENAI_API_KEY=your-key-here', 'DATABASE_URL=postgres://user:password@localhost:5432/db']);
    add('package-lock.json', [`"integrity": "sha512-${rs(64, AN)}"`, `"integrity": "sha512-${rs(64, AN)}"`]);
    // 真正的金鑰（被 AI 或人寫進去的）
    add('.env', [`OPENAI_API_KEY=sk-proj-${rs(48, AN)}`, `DATABASE_URL=postgres://admin:${rs(12, AN)}@db.example.com:5432/prod`], [0, 1]);
    add('src/lib/ai.js', ['// AI 幫你「先寫死方便測試」', `const client = new OpenAI({ apiKey: "sk-proj-${rs(48, AN)}" });`, 'export default client;'], [1]);
    add('scripts/deploy.sh', ['#!/bin/bash', `export AWS_ACCESS_KEY_ID=AKIA${rs(16, UP)}`, `export AWS_SECRET_ACCESS_KEY=${rs(40, AN + '/+')}`, 'aws s3 sync ./out s3://taskflow-site'], [1, 2]);
    add('src/config.js', ['export const config = {', `  firebaseKey: "AIza${rs(35, AN + '-_')}",`, "  region: 'asia-east1'", '};'], [1]);
    add('tests/fixtures/mock.js', ['// 測試用的假金鑰', 'export const FAKE_KEY = "sk-proj-EXAMPLE-NOT-A-REAL-KEY-0000000000";', 'export const password = "test1234";']);
    add('notebooks/analysis.ipynb', ['{"cells":[{"source":["import openai\\n",', `"openai.api_key = 'sk-${rs(48, AN)}'\\n"]}]}`], [1]);
    const RULES = [
      { id: 'openai', n: 'OpenAI 金鑰（sk-…）', re: /sk-(proj-)?[A-Za-z0-9-]{20,}/ },
      { id: 'aws', n: 'AWS 存取金鑰（AKIA…）', re: /AKIA[A-Z0-9]{16}|AWS_SECRET_ACCESS_KEY=\S{30,}/ },
      { id: 'google', n: 'Google API 金鑰（AIza…）', re: /AIza[0-9A-Za-z\-_]{35}/ },
      { id: 'pwd', n: '密碼或連線字串', re: /password\s*=\s*["'][^"']+["']|:\/\/[^:\s]+:[^@\s]+@/i },
      { id: 'ent', n: '高亂度長字串（熵 > 4.5）', re: null }
    ];
    const entropy = t => { const m = {}; [...t].forEach(c => m[c] = (m[c] || 0) + 1); return -Object.values(m).reduce((a, n) => a + n / t.length * Math.log2(n / t.length), 0); };
    let on = new Set(['openai']), ign = new Set(), sel = null;
    const IGN = [['.env', '.env'], ['notebooks/', 'notebooks/'], ['node_modules/', 'node_modules/']];
    const ignored = p => [...ign].some(g => g.endsWith('/') ? p.startsWith(g) : p === g);
    function scan() {
      const hits = [];
      FILES.forEach((f, fi) => f.lines.forEach((ln, li) => { const why = RULES.filter(r => on.has(r.id) && (r.re ? r.re.test(ln) : (ln.match(/[A-Za-z0-9+\/_\-]{32,}/g) || []).some(t => entropy(t) > 4.5))).map(r => r.n); if (why.length) hits.push({ fi, li, why, real: f.secret.has(li) }); }));
      return hits;
    }
    const out = h('div');
    function draw() {
      out.innerHTML = '';
      out.append(h('div', { class: 'row', style: { gap: '6px 14px', flexWrap: 'wrap', marginBottom: '6px' } }, lab('掃描規則：'), ...RULES.map(r => check(r.n, () => on.has(r.id), v => { v ? on.add(r.id) : on.delete(r.id); }, draw))));
      out.append(h('div', { class: 'row', style: { gap: '6px 14px', flexWrap: 'wrap', marginBottom: '10px' } }, lab('.gitignore 內容：'), ...IGN.map(([k, n]) => check(n, () => ign.has(k), v => { v ? ign.add(k) : ign.delete(k); }, draw))));
      const hits = scan(), realAll = FILES.reduce((a, f) => a + f.secret.size, 0), found = new Set(hits.filter(x => x.real).map(x => x.fi + ':' + x.li)), fp = hits.filter(x => !x.real);
      const pushed = []; FILES.forEach((f, fi) => { if (ignored(f.path)) return; f.secret.forEach(li => pushed.push({ fi, li, caught: found.has(fi + ':' + li) })); });
      const leak = pushed.filter(p => !p.caught);
      out.append(h('div', { class: 'kpi', style: { marginBottom: '10px' } }, kpi('專案檔案', FILES.length + ' 個'), kpi('真正的金鑰', realAll + ' 組'), kpi('掃描抓到', `${found.size} / ${realAll}`, found.size === realAll ? 'good' : 'bad'), kpi('誤報', fp.length + ' 處', fp.length > 3 ? 'bad' : ''), kpi('會被推上 GitHub 且沒被抓到', leak.length + ' 組', leak.length ? 'bad' : 'good')));
      const g = h('div', { class: 'grid2', style: { gap: '18px', alignItems: 'start' } });
      const fl = h('div'); fl.append(sub(`${FILES.length} 個檔案（紅＝含真正金鑰、黃＝只有誤報、灰框＝被 .gitignore 排除不會推上去）。點方塊看內容。`));
      const grid = h('div', { style: { display: 'grid', gridTemplateColumns: 'repeat(15,1fr)', gap: '3px' } });
      FILES.forEach((f, fi) => { const fh = hits.filter(x => x.fi === fi), hasReal = f.secret.size > 0, caught = [...f.secret].every(li => found.has(fi + ':' + li)), ig = ignored(f.path);
        const b = h('div', { title: f.path, style: { height: '20px', borderRadius: '3px', cursor: 'pointer', background: hasReal ? (caught ? '#e8a397' : C.bad) : fh.length ? '#f2d58a' : '#e5e1d8', outline: sel === fi ? '2px solid #1c2430' : ig ? '2px dashed #8a949f' : 'none', outlineOffset: '-2px', opacity: ig ? .5 : 1 } });
        b.onclick = () => { sel = fi; draw(); }; grid.append(b); });
      fl.append(grid, h('div', { style: { fontSize: '12px', color: 'var(--muted)', marginTop: '4px' } }, '深紅＝真金鑰且掃描沒抓到；淺紅＝真金鑰、已抓到'));
      const rt = h('div');
      const showF = sel != null ? sel : FILES.findIndex(f => f.secret.size);
      const f = FILES[showF]; rt.append(sub(`${f.path}${ignored(f.path) ? '（已被 .gitignore 排除）' : ''}`));
      f.lines.forEach((ln, li) => { const hh = hits.find(x => x.fi === showF && x.li === li), real = f.secret.has(li);
        rt.append(h('div', { style: { fontFamily: 'var(--mono)', fontSize: '11.5px', padding: '3px 6px', borderRadius: '4px', marginBottom: '2px', background: real ? (hh ? '#fbe3df' : '#f6c9c1') : hh ? '#fdf3d6' : '#f6f4ef', wordBreak: 'break-all' } }, ln, hh ? h('div', { style: { fontFamily: 'var(--sans)', fontSize: '11px', color: real ? C.bad : C.amber } }, (real ? '✓ 抓到真金鑰：' : '⚠ 誤報：') + hh.why.join('、')) : real ? h('div', { style: { fontFamily: 'var(--sans)', fontSize: '11px', color: C.bad, fontWeight: 700 } }, '✗ 真金鑰，但沒有任何規則抓到') : null)); });
      g.append(fl, rt); out.append(g);
      const miss = [...Array(FILES.length).keys()].flatMap(fi => [...FILES[fi].secret].filter(li => !found.has(fi + ':' + li)).map(li => FILES[fi].path));
      let msg = '';
      if (leak.length) msg = `目前有 ${leak.length} 組真金鑰會被推上 GitHub 而且沒被抓到（${[...new Set(leak.map(p => FILES[p.fi].path))].join('、')}）。`;
      else msg = `目前沒有漏網的金鑰會被推上去。`;
      if (on.size === 1) msg += ' 只掃 OpenAI 金鑰是最常見的做法，但 AWS、Google、資料庫密碼都有自己的格式——把其他規則一個一個打開。';
      else if (!on.has('ent')) msg += ' 試著打開「高亂度長字串」規則：它能抓到格式沒有被特別列出的金鑰（例如 AWS 的 Secret），但也會把 package-lock.json 的雜湊值、git commit 編號誤報出來——規則越寬，誤報越多。';
      else msg += ` 高亂度規則多抓到了一些格式不固定的金鑰，誤報也增加到 ${fp.length} 處（雜湊值、commit 編號、測試用假金鑰）。`;
      if (!ign.has('.env')) msg += ' .gitignore 沒有排除 .env——這是最常見的外洩方式。';
      msg += ' 真實世界：GitGuardian 統計 2024 年 GitHub 公開儲存庫新增外洩 2,380 萬組金鑰（年增 25%），2022 年外洩的金鑰有 70% 到現在仍然有效；開了 Copilot 的儲存庫外洩率比沒開的高 40%。AI 很愛「先寫死方便測試」，推上去之前一定要掃描（gitleaks、GitHub secret scanning），金鑰一旦推上去，就算刪掉 commit 也要立刻作廢重發。';
      out.append(note(msg, leak.length ? 'warn' : ''));
    }
    box.append(out); draw();
  })();
  /* ====================================================================
     第 15 節：Replit 刪庫事件（2025/7）——權限設計才是護欄（2026-11-09 新增）
     ==================================================================== */
  (function replit() {
    const box = $('#w-replit'); if (!box) return;
    const lab = t => h('span', { style: { fontSize: '13px', color: 'var(--muted)' } }, t);
    const note = msg => h('div', { class: 'note', style: { marginTop: '10px' } }, h('b', null, '看懂了什麼：'), msg);
    const kpi = (k, v, cls) => h('div', null, h('div', { class: 'k' }, k), h('div', { class: 'v' + (cls ? ' ' + cls : '') }, v));    const ck = (label, get, set) => { const i = h('input', { type: 'checkbox' }); i.checked = get(); i.onchange = () => { set(i.checked); draw(); }; return h('label', { style: { display: 'flex', gap: '8px', alignItems: 'flex-start', fontSize: '14px', margin: '4px 0', cursor: 'pointer' } }, i, h('span', null, label)); };
    const G = { text: true, sep: false, ro: false, backup: false, verify: false }; const res = h('div'), opts = h('div');
    const L = { text: '在對話裡用大寫寫「凍結！不准再改！」（事件當事人做了這個）', sep: '開發用資料庫與正式資料庫分開，AI 只碰得到開發用的', ro: 'AI 對正式資料庫只有唯讀權限', backup: '每天自動備份，並且實際試過還原', verify: '不相信 AI 的回報：它說「無法還原」時，自己去看備份與回溯功能' };
    function draw() {
      res.innerHTML = '';
      const blocked = G.sep || G.ro, recover = G.backup || G.verify;
      let out, cls;
      if (blocked) { out = 'AI 的刪除指令根本碰不到正式資料：最多弄壞開發用的那份，重建就好。'; cls = 'good'; }
      else if (recover) { out = '資料還是被刪了，但你能在幾分鐘內救回來' + (G.verify ? '——事件當事人後來就是自己用回溯功能救回的，AI 先前說「無法還原」是錯的。' : '。'); cls = 'amber'; }
      else { out = '正式資料被刪除，AI 還告訴你無法還原。這就是 2025 年 7 月事件的樣子：上千筆主管與公司資料一度消失。'; cls = 'bad'; }
      res.append(h('div', { class: 'kpi', style: { margin: '10px 0' } }, kpi('正式資料', blocked ? '安全' : recover ? '可救回' : '遺失', cls === 'good' ? 'good' : cls === 'bad' ? 'bad' : '')));
      res.append(note(out + (G.text && !blocked ? ' 注意：只在對話裡寫「不准改」並不是權限控制——AI 讀到了、也答應了，仍然照做。' : '') + ' 護欄要做在系統權限上（分開環境、唯讀、備份），不是做在提示詞裡；這和 M8 Agent 的工具權限是同一件事。'));
    }
    Object.keys(L).forEach(k => opts.append(ck(L[k], () => G[k], v => G[k] = v)));
    box.append(opts, res); draw();
  })();
})();
