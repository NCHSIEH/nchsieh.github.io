/* 演算法實驗室 · CSV 匯出（英文欄名、UTF-8 含 BOM，供 AI Studio 匯入比對）　凍結檔，請勿修改 */
(function (G) {
  'use strict';
  const LAB = G.LAB;
  const esc = v => { const s = v == null ? '' : String(v); return /[",\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s; };

  /* columns：實驗的 data.columns；類別欄輸出 codes[索引]（沒有 codes 就輸出索引數字） */
  LAB.toCSV = function (rows, columns, withId = true) {
    const head = (withId ? ['id'] : []).concat(columns.map(c => c.key));
    const lines = [head.map(esc).join(',')];
    rows.forEach(r => {
      const cells = withId ? [r.id] : [];
      columns.forEach(c => {
        const v = r[c.key];
        if (v == null || (typeof v === 'number' && Number.isNaN(v))) cells.push('');
        else if (c.type === 'cat') cells.push(c.codes ? c.codes[v] : v);
        else cells.push(v);
      });
      lines.push(cells.map(esc).join(','));
    });
    return lines.join('\r\n') + '\r\n';
  };

  LAB.csvName = (id, dataset) => 'lab_' + id + '_' + (dataset || 'data') + '.csv';

  LAB.download = function (name, text) {
    const blob = new Blob(['﻿' + text], { type: 'text/csv;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name;
    document.body.appendChild(a); a.click(); setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 200);
  };
})(typeof window !== 'undefined' ? window : globalThis);
