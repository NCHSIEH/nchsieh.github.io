/* M2-1 第二輪內容強化（2026-11-23）：Riley 樣本數準則（講義第 56 頁） */
(function () {
  'use strict';
  const { h, $ } = U;
  const box = $('#w-riley'); if (!box) return;
  let p = 30, prev = 5, r2 = 0.05; const S = 0.9;
  const out = h('div'); box.append(out);
  function row(label, min, max, step, get, set, fmt) {
    const v = h('b', null, fmt(get()));
    const inp = h('input', { type: 'range', min, max, step, value: get(), style: { width: '260px' } });
    inp.oninput = () => { set(+inp.value); v.textContent = fmt(get()); calc(); };
    return h('div', { class: 'row', style: { alignItems: 'center', gap: '10px', margin: '6px 0' } }, h('span', { style: { width: '170px' } }, label), inp, v);
  }
  const res = h('div');
  function calc() {
    // Riley 準則 B3（二元結果）：n = p / ((S − 1) · ln(1 − R²cs / S))
    const n = Math.ceil(p / ((S - 1) * Math.log(1 - r2 / S)));
    const evRaw = n * prev / 100, ev = Math.ceil(evRaw), epp = evRaw / p;
    res.innerHTML = '';
    res.append(h('div', { class: 'kpi', style: { margin: '10px 0' } },
      h('div', null, h('div', { class: 'k' }, '至少需要（人）'), h('div', { class: 'v' }, n.toLocaleString())),
      h('div', null, h('div', { class: 'k' }, '其中事件數'), h('div', { class: 'v' }, ev.toLocaleString())),
      h('div', null, h('div', { class: 'k' }, '每參數事件數 EPP'), h('div', { class: 'v' }, epp.toFixed(2)))),
      h('div', { class: 'note' }, h('b', null, '看懂了什麼：'), `收縮因子要達 0.9、${p} 個參數、預期 R²(CS) ${r2.toFixed(2)} 時，至少要 ${n.toLocaleString()} 人。` +
        (epp < 10 ? `每參數只有 ${epp.toFixed(2)} 個事件，比「10 個事件」的經驗法則還少——經驗法則不是保證。` : `每參數有 ${epp.toFixed(2)} 個事件。`) +
        '預期 R² 越低（模型越弱），需要的人越多。'));
  }
  out.append(h('p', { class: 'hint' }, '二元結果（如再入院、子癲前症）的準則 B3：收縮因子 ≥ 0.9。預設值是 Riley 等人原文的子癲前症例，應算出 5,249 人；把參數改成 20 應得 3,500 人。'),
    row('預測參數個數', 5, 60, 1, () => p, v => p = v, v => v + ' 個'),
    row('盛行率（事件比例）', 1, 40, 1, () => prev, v => prev = v, v => v + '%'),
    row('預期 R²(Cox-Snell)', 0.01, 0.3, 0.01, () => r2, v => r2 = v, v => v.toFixed(2)),
    res,
    h('p', { class: 'ai' }, '只計算四條準則中的「收縮因子」一條；完整計算請用 R 套件 pmsampsize。資料：Riley et al., BMJ 2020;368:m441。講義 M2-1 第 56 頁。　',
      h('a', { href: 'https://doi.org/10.1136/bmj.m441', target: '_blank', rel: 'noopener' }, 'Riley et al., BMJ 2020')));
  calc();
})();
