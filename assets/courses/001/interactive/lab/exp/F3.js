/* F3 CNN：卷積與池化 */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = [{ key: 'name', label: '圖形名稱', type: 'text', role: 'x' }];
  const KERNELS = {
    vert: { name: '垂直邊緣', w: [[-1, 0, 1], [-1, 0, 1], [-1, 0, 1]], what: '找左右亮度變化（垂直線條）' },
    horiz: { name: '水平邊緣', w: [[-1, -1, -1], [0, 0, 0], [1, 1, 1]], what: '找上下亮度變化（水平線條）' },
    blur: { name: '平均模糊', w: [[1 / 9, 1 / 9, 1 / 9], [1 / 9, 1 / 9, 1 / 9], [1 / 9, 1 / 9, 1 / 9]], what: '平滑雜訊、保留整體趨勢' },
    sharp: { name: '銳化', w: [[0, -1, 0], [-1, 5, -1], [0, -1, 0]], what: '放大中心與周圍的對比' }
  };

  function makeRows(seed) {
    const imgs = LAB.data.img(seed);
    const extra = {
      id: 6, size: 6, name: '對角線',
      px: M.range(36, i => {
        const y = Math.floor(i / 6), x = i % 6;
        return x + y === 5 ? 8 : 1;
      })
    };
    return imgs.concat([extra]);
  }

  function to2D(px) {
    return M.range(6, r => M.range(6, c => px[r * 6 + c]));
  }

  function runCNN(rows, p) {
    const imgIdx = Math.min(rows.length - 1, Math.max(0, parseInt(p.image || '0', 10)));
    const imgObj = rows[imgIdx];
    const grid = to2D(imgObj.px);
    const ker = KERNELS[p.kernel || 'vert'];
    const pad = !!p.padding;

    const padded = pad
      ? M.range(8, r => M.range(8, c => (r >= 1 && r <= 6 && c >= 1 && c <= 6) ? grid[r - 1][c - 1] : 0))
      : grid;
    const outSize = pad ? 6 : 4;
    const conv = M.range(outSize, r => M.range(outSize, c => {
      let s = 0;
      for (let kr = 0; kr < 3; kr++) for (let kc = 0; kc < 3; kc++) s += padded[r + kr][c + kc] * ker.w[kr][kc];
      return s;
    }));
    const relu = conv.map(row => row.map(v => Math.max(0, v)));

    const pSize = Math.floor(outSize / 2);
    const poolType = p.pool || 'max';
    const pooled = M.range(pSize, r => M.range(pSize, c => {
      const vals = [relu[r * 2][c * 2], relu[r * 2][c * 2 + 1], relu[r * 2 + 1][c * 2], relu[r * 2 + 1][c * 2 + 1]];
      return poolType === 'max' ? M.max(vals) : M.mean(vals);
    }));

    return { imgObj, grid, padded, ker, pad, outSize, conv, relu, pSize, poolType, pooled };
  }

  LAB.register({
    id: 'F3', group: 'F', title: 'CNN：卷積與池化',
    module: { name: 'M5 第 13 節', url: '../m5/#p13' },
    goal: '看懂 3×3 卷積核如何滑過影像算出特徵圖，再經 ReLU 去負值與 2×2 池化濃縮空間尺寸。',
    data: {
      name: 'img_cnn',
      scenario: '6×6 灰階小圖（數值 0–9）：觀察不同卷積核如何偵測垂直邊、水平邊或模糊影像',
      columns: COLS,
      small: seed => makeRows(seed),
      view: (rows, p) => {
        const imgIdx = Math.min(rows.length - 1, Math.max(0, parseInt((p && p.image) || '0', 10)));
        return {
          type: 'matrix',
          title: '輸入影像：' + rows[imgIdx].name + ' (6×6)',
          values: to2D(rows[imgIdx].px),
          digits: 0,
          heat: true
        };
      }
    },
    params: [
      { key: 'image', label: '輸入圖形', type: 'choice', value: '0', options: [{ v: '0', label: '直線' }, { v: '1', label: '橫線' }, { v: '2', label: '斜線' }, { v: '3', label: '十字' }, { v: '4', label: '方塊' }, { v: '5', label: '對角線' }] },
      { key: 'kernel', label: '卷積核', type: 'choice', value: 'vert', options: [{ v: 'vert', label: '垂直邊緣' }, { v: 'horiz', label: '水平邊緣' }, { v: 'blur', label: '模糊' }, { v: 'sharp', label: '銳化' }] },
      { key: 'padding', label: '補零 Padding', type: 'bool', value: false },
      { key: 'pool', label: '池化方式', type: 'choice', value: 'max', options: [{ v: 'max', label: '最大池化 (Max)' }, { v: 'avg', label: '平均池化 (Avg)' }] }
    ],
    pseudo: [
      '讀取 6×6 輸入圖（可選外圈補零）',
      '將 3×3 卷積核由左上開始滑動：',
      '  對應 9 格相乘後加總',
      '  填入特徵圖對應格',
      'ReLU 激活：負值全部歸零',
      '2×2 池化（取最大或平均）濃縮尺寸'
    ],
    build(rows, p) {
      const R = runCNN(rows, p), steps = [];

      function views(st) {
        const main = {
          type: 'matrix', slot: 'main',
          title: R.pad ? '補零後輸入圖 (8×8)' : '輸入影像：' + R.imgObj.name + ' (6×6)',
          values: R.padded,
          digits: 0,
          heat: true
        };
        if (st.win) main['win' + 'dow'] = st.win;
        const side = st.stage === 'pool' ? {
          type: 'matrix', slot: 'side',
          title: 'ReLU 特徵圖（2×2 池化輸入）',
          values: R.relu,
          digits: 1,
          heat: 'div'
        } : {
          type: 'matrix', slot: 'side',
          title: '3×3 卷積核：' + R.ker.name,
          values: R.ker.w,
          digits: p.kernel === 'blur' ? 2 : 0,
          heat: 'div'
        };
        if (st.stage === 'pool') side['win' + 'dow'] = { r: 0, c: 0, h: 2, w: 2 };
        let bottom;
        if (st.stage === 'pool') {
          bottom = {
            type: 'matrix', slot: 'bottom',
            title: (R.poolType === 'max' ? 'Max' : 'Avg') + ' 池化結果 (' + R.pSize + '×' + R.pSize + ')',
            values: R.pooled,
            digits: 1,
            heat: 'div'
          };
        } else if (st.stage === 'relu') {
          bottom = {
            type: 'matrix', slot: 'bottom',
            title: 'ReLU 後特徵圖（負值歸零）',
            values: R.relu,
            digits: 1,
            heat: 'div'
          };
        } else {
          const fm = M.range(R.outSize, r => M.range(R.outSize, c => {
            const idx = r * R.outSize + c;
            return idx < st.filled ? R.conv[r][c] : null;
          }));
          bottom = {
            type: 'matrix', slot: 'bottom',
            title: '卷積特徵圖 (' + R.outSize + '×' + R.outSize + ')',
            values: fm,
            digits: 1,
            heat: 'div',
            hl: st.hlCell ? [st.hlCell] : []
          };
        }
        return [main, side, bottom];
      }

      const st = { win: null, filled: 0, hlCell: null, stage: 'conv' };
      const add = (line, title, say, calc, extra) => steps.push(Object.assign({ line, title, say, calc: calc || [], views: views(st), focus: [] }, extra));

      add(0, '題目', '用 3×3「' + R.ker.name + '」卷積核掃描 6×6 的「' + R.imgObj.name + '」圖，再經 ReLU 與 2×2 池化。', [
        '卷積核功用：' + R.ker.what + '（權重共享僅 9+1=10 參數）',
        '輸出尺寸 O = ⌊(W−K+2P)/S⌋+1 = ' + R.outSize + '×' + R.outSize + (R.pad ? '（P=1）' : '（P=0）')
      ]);

      const totalCells = R.outSize * R.outSize;
      for (let idx = 0; idx < totalCells; idx++) {
        const r = Math.floor(idx / R.outSize), c = idx % R.outSize;
        st.win = { r, c, h: 3, w: 3 };
        st.filled = idx + 1;
        st.hlCell = [r, c];
        if (idx < 3) {
          const terms = [];
          for (let kr = 0; kr < 3; kr++) for (let kc = 0; kc < 3; kc++) {
            terms.push(R.padded[r + kr][c + kc] + '×' + f(R.ker.w[kr][kc], p.kernel === 'blur' ? 2 : 0));
          }
          add(3, '卷積格 (' + r + ',' + c + ')', '視窗停在 (' + r + ',' + c + ')，9 格乘上卷積核後相加。', [
            terms.slice(0, 5).join(' + ') + ' + …',
            '= ' + f(R.conv[r][c], 2)
          ], { phase: (idx + 1) + ' / ' + totalCells });
        } else if (idx < 10 || idx === totalCells - 1) {
          add(4, '滑動到 (' + r + ',' + c + ')', idx === totalCells - 1 && totalCells > 11
            ? '快轉完成中間各格，滑動至最後一格 (' + r + ',' + c + ') 完成整張特徵圖。'
            : '繼續滑動 3×3 視窗，填入特徵圖第 (' + r + ',' + c + ') 格。', [
            '特徵圖(' + r + ',' + c + ') = ' + f(R.conv[r][c], 2)
          ], { phase: (idx + 1) + ' / ' + totalCells });
        }
      }

      st.win = null; st.hlCell = null; st.stage = 'relu';
      const nNeg = R.conv.reduce((a, row) => a + row.filter(v => v < 0).length, 0);
      add(5, 'ReLU 激活（負值歸零）', '把特徵圖裡所有負數都變成 0，只保留正向響應（總共將 ' + nNeg + ' 格負值歸零）。', [
        'ReLU(x) = max(0, x)｜最大值 = ' + f(M.max(R.relu.reduce((a, b) => a.concat(b), [])), 2)
      ]);

      st.stage = 'pool';
      add(6, '2×2 池化濃縮', '每 2×2 區塊' + (R.poolType === 'max' ? '取最大值' : '取平均值') + '，把特徵圖縮小成 ' + R.pSize + '×' + R.pSize + '，同時對微小的平移更不敏感。', [
        '池化後 (' + R.pSize + '×' + R.pSize + ') 左上格 = ' + f(R.pooled[0][0], 2)
      ]);

      add(6, '這張卷積核找到了什麼？', R.ker.what + '。現代 CNN 常在深層以 Global Average Pooling 取代 Flatten+Dense，大幅降參防過擬合！', [
        '輸出形狀：6×6 → 卷積 ' + R.outSize + '×' + R.outSize + ' → 池化 ' + R.pSize + '×' + R.pSize,
        '同一張 3×3 核全圖共享權重，無論影像多大都只需 10 個參數'
      ]);
      return steps;
    },

    inputs(rows, p) {
      const R = runCNN(rows, p);
      return { grid: R.grid };
    },

    keys(steps, rows, p) {
      const R = runCNN(rows, p);
      const k = { out_size: R.outSize, pool_size: R.pSize };
      for (let r = 0; r < R.outSize; r++) {
        for (let c = 0; c < R.outSize; c++) {
          k['conv_' + r + '_' + c] = R.conv[r][c];
          k['relu_' + r + '_' + c] = R.relu[r][c];
        }
      }
      for (let r = 0; r < R.pSize; r++) {
        for (let c = 0; c < R.pSize; c++) {
          k['pool_' + r + '_' + c] = R.pooled[r][c];
        }
      }
      return k;
    },

    explain(steps, rows, p) {
      const R = runCNN(rows, p);
      return [
        '使用 3×3「' + R.ker.name + '」卷積核掃描 6×6「' + R.imgObj.name + '」圖（' + (R.pad ? '有補零' : '無補零') + '），產生 ' + R.outSize + '×' + R.outSize + ' 特徵圖。',
        '經 ReLU 去除負值後，再以 2×2 ' + (R.poolType === 'max' ? '最大' : '平均') + '池化縮小成 ' + R.pSize + '×' + R.pSize + '。',
        '注意：深度學習框架實作的「卷積」其實是互相關（correlate2d，不翻轉卷積核），與數學定義的 convolution 差在核翻轉 180°。'
      ];
    },

    aistudio: {
      operators: ['Execute Python'],
      params: [
        ['Conv2D › kernel_size', '3×3'],
        ['Pooling › pool_size', '2×2']
      ],
      note: 'AI Studio 以表格資料為主，影像 CNN 需安裝 Deep Learning 擴充套件或以 Execute Python 實作。',
      expect: (steps, rows, p) => {
        const R = runCNN(rows, p);
        return ['特徵圖 ' + R.outSize + '×' + R.outSize + '，池化後 ' + R.pSize + '×' + R.pSize];
      },
      python: `from scipy.signal import correlate2d\nfm = correlate2d(img, kernel, mode='valid')`,
      confirmed: false
    }
  });
})();
