/* 演算法實驗室 · 步驟引擎與實驗頁介面　凍結檔，請勿修改
   依網址 ?id=B4 載入 exp/B4.js；實驗檔呼叫 LAB.register 後由這裡建立整個頁面。 */
(function () {
  'use strict';
  const LAB = window.LAB;
  function h(tag, attrs) {
    const e = document.createElement(tag);
    if (attrs) for (const k in attrs) { const v = attrs[k]; if (v == null || v === false) continue; if (k === 'class') e.className = v; else if (k === 'text') e.textContent = v; else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), v); else e.setAttribute(k, v === true ? '' : v); }
    const add = c => { if (c == null || c === false) return; if (Array.isArray(c)) c.forEach(add); else e.append(c); };
    for (let i = 2; i < arguments.length; i++) add(arguments[i]);
    return e;
  }
  const root = document.getElementById('lab');
  const ID = (new URLSearchParams(location.search).get('id') || '').toUpperCase();
  const entry = LAB.entry(ID);
  const order = LAB.registry.map(e => e.id);

  function navRow() {
    const i = order.indexOf(ID), p = LAB.entry(order[i - 1]), n = LAB.entry(order[i + 1]);
    const link = (e, txt) => !e ? h('span') : e.status === 'live' ? h('a', { class: 'btn', href: 'exp.html?id=' + e.id }, txt(e)) : h('button', { class: 'btn', disabled: true }, txt(e) + '（建置中）');
    return h('div', { class: 'lab-nav' }, link(p, e => '← ' + e.id + ' ' + e.title), h('a', { class: 'btn', href: './' }, '回實驗室目錄'), link(n, e => e.id + ' ' + e.title + ' →'));
  }
  if (!entry) { root.append(h('div', { class: 'lab-err' }, '找不到這個實驗。'), h('p', null, h('a', { class: 'btn primary', href: './' }, '回實驗室目錄'))); return; }
  document.title = entry.id + ' ' + entry.title + ' · 演算法實驗室';
  const crumb = document.getElementById('crumb'); if (crumb) crumb.textContent = '/ ' + entry.id + ' ' + entry.title;
  if (entry.status !== 'live') { root.append(h('div', { class: 'lab-hero' }, h('div', { class: 'badge' }, entry.id), h('div', null, h('h1', null, entry.title), h('p', { class: 'goal' }, entry.brief), h('span', { class: 'tag gray' }, '建置中'))), navRow()); return; }

  LAB.onRegister = function (def) { if (def.id === ID) init(def); };
  const sc = document.createElement('script'); sc.src = 'exp/' + ID + '.js?v=' + LAB.version;
  sc.onerror = () => root.append(h('div', { class: 'lab-err' }, '實驗檔載入失敗：exp/' + ID + '.js'));
  document.body.appendChild(sc);

  function init(def) {
    const S = { seed: 1, size: 'small', params: {}, rows: [], edited: false, steps: [], idx: 0, playing: false, speed: 1, reached: false, timer: 0, err: null };
    def.params = def.params || [];
    def.params.forEach(p => { S.params[p.key] = p.value; });
    /* 網址狀態 */
    (function readHash() {
      const q = new URLSearchParams(location.hash.slice(1));
      if (q.get('seed')) S.seed = Math.max(1, parseInt(q.get('seed'), 10) || 1);
      if (q.get('size') === 'large' && def.data.large) S.size = 'large';
      def.params.forEach(p => { if (!q.has(p.key)) return; const v = q.get(p.key); S.params[p.key] = p.type === 'bool' ? v === '1' : p.type === 'choice' ? (p.options.some(o => String(o.v) === v) ? p.options.find(o => String(o.v) === v).v : p.value) : LAB.M.clamp(parseFloat(v), p.min, p.max); if (typeof S.params[p.key] === 'number' && Number.isNaN(S.params[p.key])) S.params[p.key] = p.value; });
      S._step = parseInt(q.get('step'), 10) || 1;
    })();
    function writeHash() {
      const q = new URLSearchParams(); def.params.forEach(p => q.set(p.key, p.type === 'bool' ? (S.params[p.key] ? '1' : '0') : S.params[p.key]));
      q.set('seed', S.seed); if (S.size === 'large') q.set('size', 'large'); q.set('step', S.idx + 1);
      try { history.replaceState(null, '', location.pathname + location.search + '#' + q.toString()); } catch (e) { /* 本機檔案開啟時略過 */ }
    }

    /* ---------- 版面 ---------- */
    const cols = def.data.columns || [];
    const elParams = h('div', { class: 'lab-params' });
    const elData = h('div'), elDataCnt = h('span', { class: 'cnt' }), elDataNote = h('div', { class: 'dnote' });
    const elPseudoBar = h('div', { class: 'bar' }), elPseudo = h('div', { class: 'pseudo' }, elPseudoBar);
    const lnEls = (def.pseudo || []).map(t => { const m = /^(\s*)/.exec(t)[1].length; const e = h('div', { class: 'ln' + (m >= 4 ? ' in2' : m >= 2 ? ' in1' : '') }, h('span', null, t.trim())); elPseudo.append(e); return e; });
    const vMain = h('div'), vSide = h('div'), vBottom = h('div');
    const pMain = h('div', { class: 'pane' }, vMain), pSide = h('div', { class: 'pane' }, vSide), pBottom = h('div', { class: 'pane' }, vBottom);
    const viz = { main: LAB.viz.mount(vMain), side: LAB.viz.mount(vSide), bottom: LAB.viz.mount(vBottom) };
    const sNo = h('div', { class: 'no' }), sTt = h('div', { class: 'tt' }), sPh = h('span', { class: 'tag blue ph' }), sSay = h('p', { class: 'say' }), sCalc = h('div', { class: 'calc' });
    const stepBox = h('div', { class: 'pane stepbox' }, h('h3', null, '這一步在做什麼'), h('div', { class: 'hd' }, sNo, sTt, sPh), sSay, sCalc);
    const elErr = h('div', { class: 'lab-err', style: 'display:none' });

    const bReset = h('button', { class: 'btn x', title: '重置（R）', onclick: () => go(0, false) }, '⏮ 重置');
    const bPrev = h('button', { class: 'btn', title: '上一步（←）', onclick: () => go(S.idx - 1, true) }, '◀ 上一步');
    const bPlay = h('button', { class: 'btn primary play', title: '播放／暫停（空白鍵）', onclick: () => play(!S.playing) }, '▶ 播放');
    const bNext = h('button', { class: 'btn', title: '下一步（→）', onclick: () => go(S.idx + 1, true) }, '下一步 ▶');
    const bEnd = h('button', { class: 'btn x', title: '跳到結束（End）', onclick: () => go(S.steps.length - 1, false) }, '結束 ⏭');
    const rng = h('input', { type: 'range', min: 0, max: 0, step: 1, value: 0, 'aria-label': '步驟進度', oninput: e => { play(false); const t = +e.target.value; go(t, Math.abs(t - S.idx) === 1); } });
    const pos = h('span', { class: 'pos' });
    const spd = h('div', { class: 'seg spd' }); [0.5, 1, 2].forEach(v => spd.append(h('button', { 'data-v': v, onclick: () => { S.speed = v; drawSpeed(); if (S.playing) { play(false); play(true); } } }, v + '×')));
    function drawSpeed() { spd.querySelectorAll('button').forEach(b => b.classList.toggle('on', +b.dataset.v === S.speed)); }
    const ctl = h('div', { class: 'lab-ctl' }, bReset, bPrev, bPlay, bNext, bEnd, rng, pos, spd, h('span', { class: 'keys' }, h('kbd', null, '←'), ' ', h('kbd', null, '→'), ' ', h('kbd', null, '空白鍵')));

    const exBody = h('div', { class: 'body' }), exSec = h('section', { class: 'lab-sec lock' }, h('h2', null, '看懂了什麼'), exBody);
    const aisSec = h('section', { class: 'lab-sec' });

    root.append(
      h('header', { class: 'lab-hero' }, h('div', { class: 'badge' }, def.id), h('div', null, h('h1', null, def.title), h('p', { class: 'goal' }, def.goal || ''),
        h('div', { class: 'chips' }, def.module && def.module.url ? h('a', { class: 'tag', href: def.module.url }, '對應講義：' + def.module.name + ' →') : null, h('span', { class: 'tag gray' }, '模擬資料'), h('span', { class: 'tag blue' }, def.data.scenario || '')))),
      elParams, ctl, elErr,
      h('div', { class: 'lab-work' },
        h('div', { class: 'col l' }, h('div', { class: 'pane' }, h('h3', null, '資料', elDataCnt), elData, elDataNote), h('div', { class: 'pane' }, h('h3', null, '演算法步驟'), elPseudo)),
        h('div', { class: 'col c' }, pMain, pBottom),
        h('div', { class: 'col r' }, stepBox, pSide)),
      exSec, aisSec, navRow());

    /* ---------- 參數列 ---------- */
    const pctl = {};
    function buildParams() {
      elParams.textContent = ''; let lastG = null;
      def.params.forEach(p => {
        if (p.group && p.group !== lastG) elParams.append(h('span', { class: 'tag amber' }, p.group)); lastG = p.group || null;
        const box = h('label', { class: 'p' }, p.label);
        if (p.type === 'bool') { const b = h('button', { class: 'btn sm', type: 'button', onclick: () => { S.params[p.key] = !S.params[p.key]; syncParams(); recompute(); } }); box.append(b); pctl[p.key] = () => { b.textContent = S.params[p.key] ? '開' : '關'; b.classList.toggle('on', !!S.params[p.key]); }; }
        else if (p.type === 'choice') { const sg = h('div', { class: 'seg' }); p.options.forEach(o => sg.append(h('button', { type: 'button', 'data-v': String(o.v), onclick: () => { S.params[p.key] = o.v; syncParams(); recompute(); } }, o.label))); box.append(sg); pctl[p.key] = () => sg.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === String(S.params[p.key]))); }
        else { const d = p.digits != null ? p.digits : (String(p.step || 1).split('.')[1] || '').length; const val = h('b'); const inp = h('input', { type: 'range', min: p.min, max: p.max, step: p.step || 1, oninput: e => { S.params[p.key] = +e.target.value; val.textContent = LAB.f(S.params[p.key], d) + (p.unit ? ' ' + p.unit : ''); recompute(); } }); box.append(inp, val); pctl[p.key] = () => { inp.value = S.params[p.key]; val.textContent = LAB.f(S.params[p.key], d) + (p.unit ? ' ' + p.unit : ''); }; }
        elParams.append(box);
      });
      elParams.append(h('span', { class: 'sp' }));
      const g = h('div', { class: 'grp' });
      if (def.data.large) { const sg = h('div', { class: 'seg' }); [['small', '小資料（逐筆看）'], ['large', '放大版']].forEach(o => sg.append(h('button', { type: 'button', 'data-v': o[0], onclick: () => { S.size = o[0]; newData(); } }, o[1]))); g.append(sg); pctl._size = () => sg.querySelectorAll('button').forEach(b => b.classList.toggle('on', b.dataset.v === S.size)); }
      const seedTxt = h('span', { class: 'tag gray' }); pctl._seed = () => { seedTxt.textContent = '第 ' + S.seed + ' 組'; };
      const bRestore = h('button', { class: 'btn sm', type: 'button', onclick: () => newData() }, '還原資料'); pctl._ed = () => { bRestore.style.display = S.edited ? '' : 'none'; };
      g.append(h('button', { class: 'btn sm', type: 'button', title: '用下一個亂數種子重新產生資料', onclick: () => { S.seed++; newData(); } }, '換一組資料'), seedTxt, bRestore, h('button', { class: 'btn sm', type: 'button', onclick: exportCSV }, '匯出 CSV'));
      elParams.append(g); syncParams();
    }
    function syncParams() { for (const k in pctl) pctl[k](); }
    function exportCSV() {
      LAB.download(LAB.csvName(def.id, def.data.name), LAB.toCSV(S.rows, cols));
      if (def.data.exports) def.data.exports(S.rows, S.params).forEach((x, i) => setTimeout(() => LAB.download(x.name, LAB.toCSV(x.rows, x.columns || cols, x.withId !== false)), 350 * (i + 1)));
    }

    /* ---------- 資料表 ---------- */
    const dataViz = LAB.viz.mount(elData); let rowEls = {};
    function drawData() {
      rowEls = {};
      elDataCnt.textContent = '共 ' + S.rows.length + ' 筆';
      if (def.data.view) { dataViz.update(Object.assign({ slot: 'side' }, def.data.view(S.rows, S.params)), false); elDataNote.textContent = def.data.note || ''; return; }
      dataViz.clear();
      const show = S.rows.length > 20 ? S.rows.slice(0, 12) : S.rows, ed = S.size === 'small' ? (def.data.editable || []) : [];
      const tb = h('table', { class: 'dtab' }, h('thead', null, h('tr', null, h('th', null, '#'), cols.map(c => h('th', null, c.label, c.unit ? h('small', null, c.unit) : null)))));
      const bd = h('tbody'); tb.append(bd);
      show.forEach(r => {
        const tr = h('tr', null, h('td', null, String(r.id))); rowEls[r.id] = tr;
        cols.forEach(c => {
          const v = r[c.key], can = ed.indexOf(c.key) >= 0;
          if (c.type === 'cat') { const td = h('td', { class: 'cat' + (can ? ' ed' : '') }); const sp = h('span'); const paint = () => { sp.textContent = r[c.key] == null ? '—' : c.levels[r[c.key]]; sp.className = c.role === 'y' ? (r[c.key] ? 'k-c1' : 'k-c0') : ''; }; paint(); td.append(sp); if (can) { td.title = '點一下切換'; td.addEventListener('click', () => { r[c.key] = (r[c.key] + 1) % c.levels.length; paint(); td.classList.add('edited'); S.edited = true; syncParams(); recompute(); }); } tr.append(td); }
          else if (c.type === 'text') tr.append(h('td', { class: 'txt' }, v == null ? '' : String(v)));
          else if (can) { const inp = h('input', { type: 'number', value: v == null ? '' : v, min: c.min, max: c.max, step: c.step || 1, 'aria-label': c.label + ' 第 ' + r.id + ' 筆' }); const td = h('td', null, inp); inp.addEventListener('change', () => { let x = parseFloat(inp.value); if (Number.isNaN(x)) { inp.value = r[c.key]; return; } if (c.min != null) x = Math.max(c.min, x); if (c.max != null) x = Math.min(c.max, x); inp.value = x; r[c.key] = x; td.classList.add('edited'); S.edited = true; syncParams(); recompute(); }); tr.append(td); }
          else tr.append(h('td', null, v == null ? '—' : String(v)));
        });
        bd.append(tr);
      });
      elData.append(h('div', { class: 'dtab-s' }, tb));
      elDataNote.textContent = (S.rows.length > show.length ? '只列出前 ' + show.length + ' 筆，完整資料請匯出 CSV。' : ed.length ? '可以直接改表格裡的數值，演算法會立刻重算。' : '') + (def.data.note ? ' ' + def.data.note : '');
    }
    function newData() { play(false); S.rows = def.data[S.size](S.seed); S.edited = false; syncParams(); drawData(); recompute(); }

    /* ---------- 計算與畫面 ---------- */
    function recompute(keep) {
      play(false); S.err = null;
      try { S.steps = def.build(LAB.clone(S.rows), Object.assign({}, S.params)) || []; if (!S.steps.length) throw new Error('build() 沒有回傳任何步驟'); }
      catch (e) { S.err = e; S.steps = []; }
      elErr.style.display = S.err ? '' : 'none'; if (S.err) { elErr.textContent = '計算發生錯誤：' + S.err.message; if (window.console) console.error(S.err); }
      S.reached = false; exSec.classList.add('lock'); exBody.textContent = '走到最後一步後，這裡會依照你這次的資料與參數整理出重點。';
      rng.max = Math.max(0, S.steps.length - 1);
      S.idx = keep ? LAB.M.clamp(keep, 0, Math.max(0, S.steps.length - 1)) : 0;
      draw(false); drawAIS();
    }
    function go(i, animate) { if (!S.steps.length) return; const t = LAB.M.clamp(i, 0, S.steps.length - 1); if (t === S.idx) { if (S.playing && t === S.steps.length - 1) play(false); return; } S.idx = t; draw(animate); }
    function play(on) {
      clearTimeout(S.timer); S.playing = !!on && S.steps.length > 1;
      if (S.playing && S.idx >= S.steps.length - 1) { S.idx = 0; draw(false); }
      bPlay.textContent = S.playing ? '❚❚ 暫停' : '▶ 播放';
      if (S.playing) { const tick = () => { if (S.idx >= S.steps.length - 1) { play(false); return; } go(S.idx + 1, true); S.timer = setTimeout(tick, 1250 / S.speed); }; S.timer = setTimeout(tick, 700 / S.speed); }
    }
    function draw(animate) {
      const st = S.steps[S.idx], n = S.steps.length;
      pos.textContent = n ? (S.idx + 1) + ' / ' + n : '—'; rng.value = S.idx;
      bPrev.disabled = bReset.disabled = S.idx <= 0; bNext.disabled = bEnd.disabled = S.idx >= n - 1; bPlay.disabled = n < 2;
      if (!st) { ['main', 'side', 'bottom'].forEach(k => viz[k].clear()); sTt.textContent = ''; sSay.textContent = ''; sCalc.textContent = ''; return; }
      sNo.textContent = S.idx + 1; sTt.textContent = st.title || ''; sPh.textContent = st.phase || ''; sPh.style.display = st.phase ? '' : 'none'; sSay.textContent = st.say || '';
      sCalc.textContent = ''; (st.calc || []).forEach((t, i) => { const d = h('div', null, t); if (animate) d.style.animationDelay = (i * 0.13) + 's'; else d.style.animation = 'none', d.style.opacity = 1; sCalc.append(d); });
      if (animate) { stepBox.classList.remove('swap'); void stepBox.offsetWidth; stepBox.classList.add('swap'); }
      lnEls.forEach((e, i) => e.classList.toggle('on', i + 1 === st.line));
      const ln = lnEls[(st.line || 0) - 1]; if (ln) { elPseudoBar.style.transform = 'translateY(' + ln.offsetTop + 'px)'; elPseudoBar.style.height = ln.offsetHeight + 'px'; elPseudoBar.style.opacity = 1; } else elPseudoBar.style.opacity = 0;
      const fc = new Set((st.focus || []).map(String)); let first = null;
      for (const id in rowEls) { const on = fc.has(String(id)); rowEls[id].classList.toggle('focus', on); if (on && !first) first = rowEls[id]; }
      if (first) { const sc2 = first.closest('.dtab-s'); if (sc2) { const top = first.offsetTop - 30, bot = first.offsetTop + first.offsetHeight; if (top < sc2.scrollTop) sc2.scrollTop = Math.max(0, top); else if (bot > sc2.scrollTop + sc2.clientHeight) sc2.scrollTop = bot - sc2.clientHeight + 4; } }
      const by = {}; (st.views || []).forEach(v => { by[v.slot || 'main'] = v; });
      [['main', pMain], ['side', pSide], ['bottom', pBottom]].forEach(([k, pane]) => { pane.style.display = by[k] ? '' : 'none'; if (by[k]) viz[k].update(Object.assign({ slot: k }, by[k]), animate); });
      if (S.idx === n - 1 && !S.reached) { S.reached = true; drawExplain(); try { const k = 'lab:done', a = JSON.parse(localStorage.getItem(k) || '[]'); if (a.indexOf(def.id) < 0) { a.push(def.id); localStorage.setItem(k, JSON.stringify(a)); } } catch (e) { /* 無法儲存時略過 */ } }
      writeHash();
    }
    function drawExplain() {
      let items = []; try { items = def.explain ? def.explain(S.steps, S.rows, S.params) : []; } catch (e) { items = ['（解讀產生失敗：' + e.message + '）']; }
      exSec.classList.remove('lock'); exBody.textContent = ''; exBody.append(h('ul', { class: 'explain' }, items.map(t => h('li', null, t))));
    }
    function drawAIS() {
      const a = def.aistudio || {}; aisSec.textContent = '';
      let exp = []; try { exp = a.expect && S.steps.length ? a.expect(S.steps, S.rows, S.params) : []; } catch (e) { exp = []; }
      aisSec.append(
        h('h2', null, '到 AI Studio 驗證', a.confirmed ? h('span', { class: 'tag good' }, '已實機確認') : h('span', { class: 'tag amber' }, '運算子與參數名稱待實機確認'), h('button', { class: 'btn sm', type: 'button', onclick: exportCSV }, '匯出 CSV')),
        h('div', { class: 'ais-flow' }, (a.operators || []).map((o, i) => [i ? h('span', { class: 'ar' }, '→') : null, h('span', { class: 'op' }, o)])),
        h('div', { class: 'ais-grid' },
          h('div', null, h('h4', null, '參數設定'), h('table', { class: 'kv' }, h('tr', null, h('th', null, '運算子 › 參數'), h('th', null, '設定值')), (a.params || []).map(p => h('tr', null, h('td', null, p[0]), h('td', { class: 'm' }, typeof p[1] === 'function' ? p[1](S.params) : p[1])))),
            a.note ? h('p', { class: 'dnote' }, a.note) : null),
          h('div', null, h('h4', null, '跑完應該看到'), h('ul', null, exp.map(t => h('li', null, t))), h('h4', { style: 'margin-top:10px' }, 'Python 對照'), h('pre', null, a.python || ''))),
        h('h4', { style: 'margin:14px 0 6px;font-size:14px;color:var(--muted)' }, 'CSV 欄位對照'),
        h('table', { class: 'kv' }, h('tr', null, h('th', null, 'CSV 欄名'), h('th', null, '意義'), h('th', null, '角色'), h('th', null, '值')),
          cols.map(c => h('tr', null, h('td', { class: 'm' }, c.key), h('td', null, c.label + (c.unit ? '（' + c.unit + '）' : '')), h('td', null, c.role === 'y' ? '標籤 label' : c.role === 'id' ? '識別 id' : '特徵'), h('td', { class: 'm' }, c.type === 'cat' ? c.levels.map((l, i) => (c.codes ? c.codes[i] : i) + '＝' + (l || '無')).join('、') : c.type === 'text' ? '文字' : '數值')))));
    }

    /* ---------- 鍵盤 ---------- */
    document.addEventListener('keydown', e => {
      const t = e.target, tag = t && t.tagName; if (tag === 'INPUT' && t.type !== 'range' || tag === 'SELECT' || tag === 'TEXTAREA' || e.metaKey || e.ctrlKey || e.altKey) return;
      if (e.key === 'ArrowRight') { play(false); go(S.idx + 1, true); } else if (e.key === 'ArrowLeft') { play(false); go(S.idx - 1, true); }
      else if (e.key === ' ') { if (tag === 'BUTTON') return; play(!S.playing); } else if (e.key === 'Home' || e.key === 'r' || e.key === 'R') { play(false); go(0, false); } else if (e.key === 'End') { play(false); go(S.steps.length - 1, false); } else return;
      e.preventDefault();
    });
    window.addEventListener('resize', () => { if (S.steps.length) draw(false); });

    buildParams(); drawSpeed();
    S.rows = def.data[S.size](S.seed); drawData(); recompute(S._step - 1);
    LAB._state = S; LAB._go = go;
  }
})();
