/* n8n 加強版（2026-11）：500 筆個案批次送 Dify——Batch Size、Wait、Retry On Fail 與模型速率上限的事件模擬 */
(function () {
  'use strict';
  const { h, $, S, seg, C } = U;
  const kpi = (k, v, cls) => h('div', null, h('div', { class: 'k' }, k), h('div', { class: 'v' + (cls ? ' ' + cls : '') }, v));
  const sub = t => h('div', { style: { fontSize: '13px', color: 'var(--muted)', marginBottom: '4px' } }, t);
  const lab = t => h('span', { style: { fontSize: '13px', color: 'var(--muted)' } }, t);
  const note = (msg, cls) => h('div', { class: 'note' + (cls ? ' ' + cls : ''), style: { marginTop: '10px' } }, h('b', null, '看懂了什麼：'), msg);
  const dur = s => s < 90 ? Math.round(s) + ' 秒' : s < 5400 ? Math.round(s / 60) + ' 分鐘' : (s / 3600).toFixed(1) + ' 小時';

  (function rate() {
    const box = $('#w-rate'); if (!box) return;
    const TIER = { free: { n: '免費額度（每分鐘 8,000 tokens、30 次）', tpm: 8000, rpm: 30 }, paid: { n: '付費方案（示意：每分鐘 200,000 tokens、500 次）', tpm: 200000, rpm: 500 } };
    let N = 500, B = 10, W = 0, tries = 3, gap = 1, tier = 'free';
    function sim() {
      const T = TIER[tier], r = U.rng(500 + N), need = Array.from({ length: N }, () => Math.round(4500 + r() * 3000)), lat = Array.from({ length: N }, () => 4 + r() * 5);
      let bucket = T.tpm, last = 0, reqTimes = [], t = 0, ok = 0, fail = 0, e429 = 0; const curve = [[0, 0]], failIds = [];
      const take = (now, k) => { bucket = Math.min(T.tpm, bucket + (now - last) * T.tpm / 60); last = now; reqTimes = reqTimes.filter(x => x > now - 60); if (bucket >= need[k] && reqTimes.length < T.rpm) { bucket -= need[k]; reqTimes.push(now); return true; } return false; };
      for (let s0 = 0; s0 < N && t < 86400; s0 += B) {
        const ids = []; for (let k = s0; k < Math.min(N, s0 + B); k++) ids.push(k);
        // 同一批的請求幾乎同時送出；被拒的依 Retry 設定稍後重送
        let q = ids.map(k => ({ k, at: t, left: tries })), end = t;
        while (q.length) { q.sort((a, b) => a.at - b.at); const x = q.shift();
          if (take(x.at, x.k)) { ok++; end = Math.max(end, x.at + lat[x.k]); curve.push([x.at + lat[x.k], ok]); }
          else { e429++; if (x.left > 0) q.push({ k: x.k, at: x.at + gap, left: x.left - 1 }); else { fail++; failIds.push(x.k + 1); end = Math.max(end, x.at); } } }
        t = end + W;
      }
      curve.sort((a, b) => a[0] - b[0]);
      return { t, ok, fail, e429, curve, failIds, tpmCap: Math.floor(T.tpm / 6000) };
    }
    const out = h('div');
    function draw() {
      out.innerHTML = '';
      out.append(h('div', { class: 'row', style: { gap: '8px 14px', flexWrap: 'wrap', marginBottom: '6px' } }, lab('個案數'), seg([[50, '50'], [500, '500']], () => N, v => N = v, draw), lab('Loop Over Items 的 Batch Size'), seg([[1, '1'], [5, '5'], [10, '10'], [50, '50']], () => B, v => B = v, draw), lab('每批之後 Wait'), seg([[0, '0 秒'], [10, '10 秒'], [60, '60 秒']], () => W, v => W = v, draw)));
      out.append(h('div', { class: 'row', style: { gap: '8px 14px', flexWrap: 'wrap', marginBottom: '10px' } }, lab('HTTP Request 的 Retry On Fail'), seg([[0, '關閉'], [3, '重試 3 次']], () => tries, v => tries = v, draw), lab('重試間隔'), seg([[1, '1 秒（預設）'], [20, '20 秒'], [60, '60 秒']], () => gap, v => gap = v, draw), lab('模型方案'), seg([['free', '免費'], ['paid', '付費']], () => tier, v => tier = v, draw)));
      const R = sim();
      out.append(h('div', { class: 'kpi', style: { marginBottom: '10px' } }, kpi('成功', `${R.ok} / ${N}`, R.ok === N ? 'good' : 'bad'), kpi('最後仍失敗（沒寫回）', R.fail + ' 筆', R.fail ? 'bad' : 'good'), kpi('收到 429（太頻繁）', R.e429 + ' 次', R.e429 > N ? 'bad' : ''), kpi('全部跑完', dur(R.t)), kpi('額度上限：每分鐘約可跑', R.tpmCap + ' 份')));
      const ch = h('div'); out.append(sub(`累計成功筆數（每份評估約 4,500–7,500 tokens；${TIER[tier].n}）`), ch);
      const tm = Math.max(R.t, 60), unit = tm > 5400 ? 3600 : 60;
      U.lc(ch, [{ pts: R.curve.map(([x, y]) => [x / unit, y]), color: C.accent, w: 2.4 }, { pts: [[0, N], [tm / unit, N]], color: C.gray, w: 1.2, dash: '4 4' }], { w: 660, h: 220, xmin: 0, xmax: tm / unit, ymin: 0, ymax: N * 1.05, xl: unit === 3600 ? '經過時間（小時）' : '經過時間（分鐘）', yl: '累計成功' });
      if (R.failIds.length) out.append(h('div', { style: { fontSize: '12.5px', color: C.bad, marginTop: '4px' } }, `失敗的個案編號（Google Sheet 上這幾列會是空的）：${R.failIds.slice(0, 30).join('、')}${R.failIds.length > 30 ? `…等 ${R.failIds.length} 筆` : ''}`));
      let msg;
      if (tier === 'free' && R.fail) msg = `免費額度每分鐘只有 8,000 tokens，一份評估就要約 6,000——一分鐘大概只能跑 1 份。Batch Size ${B}、間隔 ${W} 秒時，同一批的請求幾乎同時送出，除了第一筆，其餘都拿到 429；${tries ? `重試間隔 ${gap} 秒太短，額度還沒回補就又被拒，重試 3 次後` : '沒開重試，'}有 ${R.fail} 筆直接失敗，Sheet 上留下空白。`;
      else if (tier === 'free') msg = `全部成功了，但花了 ${dur(R.t)}：免費額度一分鐘只夠約 1 份，${N} 份就是 ${N} 分鐘起跳。批次本身沒有錯，錯在用免費額度跑批次。實務做法：①排程在夜間跑（Schedule Trigger）②改付費方案 ③降低每份的 token（縮短逐字稿、Top-K 調小）。`;
      else msg = R.fail ? `付費方案的額度大很多，但 Batch Size ${B} 一次送太多仍會撞到每分鐘次數上限，有 ${R.fail} 筆失敗。` : `付費方案下 ${N} 份在 ${dur(R.t)} 內跑完、沒有失敗。即使如此，仍建議保留 Retry On Fail（間隔拉長到 20–60 秒）並把失敗的列標記出來，讓督導知道哪些個案要重跑。`;
      msg += ' 這三個設定（Batch Size、Wait、Retry 間隔）都是在跟模型的速率上限配合：先算出「每分鐘最多幾份」，再回推要怎麼設。';
      out.append(note(msg, R.fail ? 'warn' : ''));
    }
    box.append(out); draw();
  })();
})();
