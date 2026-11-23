(function () {
  'use strict';
  const box = document.getElementById('w-ards'); if (!box || typeof CaseW !== 'function') return;
  CaseW(box, {
    tabs: [
      { id: 'a', label: '兩型與預後', kpis: [['HARP-2 試驗病人', '539 位'], ['分群方法', '潛在類別分析（LCA）'], ['原試驗結論', '整體無差異']],
        bars: [{ title: '各型 28 天死亡率（%）', items: [['低發炎型（65%）', 17, '#1f5fa8'], ['高發炎型（35%）', 39, '#b42318']], lw: 130, max: 50 }],
        note: '兩型在 5 個 ARDS 試驗世代中重現；高發炎型的發炎指標高、休克多、無呼吸器天數少。' },
      { id: 'b', label: '加藥之後', bars: [{ title: '28 天死亡率：simvastatin 對 安慰劑（%）', items: [['高發炎・simvastatin', 32, '#b42318'], ['高發炎・安慰劑', 45, '#9aa5b4'], ['低發炎・simvastatin', 16, '#1f5fa8'], ['低發炎・安慰劑', 17, '#9aa5b4']], lw: 150, max: 50 }],
        note: '高發炎型 84 人用藥、102 人安慰劑。這是事後分析：分群是試驗結束後才做的，所以只能當「假說」。' },
      { id: 'c', label: '前瞻試驗', cards: [
          ['PANTHER 怎麼做', '先驗血判型，再隨機分到 simvastatin、baricitinib 或常規照護；主要結果是 28 天內不需器官支持的天數。', '平台試驗：可以中途加入或停止藥物'],
          ['進度', '英國 2025/11/20 收第一位病人，預計 2029/5 完成；美國 UCSF 等 10 院 2026/11 起收約 300 人。', 'ISRCTN81435672'],
          ['和敗血症四型比', '敗血症四型（JAMA 2019）用 k-means、仍停在模擬；ARDS 兩型已重現多次，所以先走到前瞻試驗。', '講義 M3 第 42–43 頁']] },
      { id: 'd', label: '判斷題', quiz: [
        { t: 'HARP-2 原本是陰性試驗，分型後高發炎型用藥死亡率較低。可以直接建議高發炎型都用 simvastatin 嗎？', o: ['可以', '還不行，要等前瞻試驗確認'], a: 1, w: '事後分群找到的差異是假說，PANTHER 就是為了確認它。' },
        { t: '為什麼 PANTHER 要「先判型、再分派」？', o: ['讓兩型各自有對照組，直接檢驗「藥效因型而異」', '為了減少病人數'], a: 0, w: '每一型裡都有常規照護組，才能看出藥效是否只在某一型出現。' },
        { t: '你的專題分出 3 群，目前最可能走到哪一步？', o: ['已前瞻驗證', '能描述、或許能重現，尚未驗證處置'], a: 1, w: '報告裡寫清楚走到哪一步，比誇大分群的臨床價值更可信。' }],
        after: '分群 → 重現 → 對應處置 → 前瞻驗證，ARDS 是少數走到最後一步的例子。' }],
    src: '資料：Calfee et al., Lancet Respir Med 2018;6:691–698（Table 2）；ISRCTN81435672 登錄；UCSF 2026/11 新聞。三題為本課設計。講義 M3 第 43 頁。'
  });
  const s = document.createElement('p'); s.className = 'ai';
  s.innerHTML = '來源連結（2026/11/23 查核）：<a href="https://doi.org/10.1016/S2213-2600(18)30177-2" target="_blank" rel="noopener">Calfee 2018</a>、<a href="https://doi.org/10.1186/ISRCTN81435672" target="_blank" rel="noopener">PANTHER 登錄</a>';
  box.appendChild(s);
})();
