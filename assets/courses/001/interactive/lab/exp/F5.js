/* F5 Autoencoder */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = LAB.data.columns('clinic', ['bmi', 'glu', 'sbp']);
  const FEATS = ['bmi', 'glu', 'sbp'];
  const pick = r => ({ id: r.id, bmi: r.bmi, glu: r.glu, sbp: r.sbp });

  function makeRows(seed) {
    const base = LAB.data.clinic(seed, 12).map(pick);
    const r = LAB.rng(8550 + seed);
    const out = { id: 13, bmi: Math.round((37 + r() * 2) * 10) / 10, glu: Math.round(72 + r() * 6), sbp: Math.round(178 + r() * 10) };
    return base.concat([out]);
  }

  function runAE(rows, p) {
    const n = rows.length;
    const Z = rows.map(() => [0, 0, 0]);
    FEATS.forEach((ft, j) => {
      const xs = LAB.col(rows, ft), mx = M.mean(xs), sx = M.sd(xs) || 1;
      for (let i = 0; i < n; i++) Z[i][j] = (xs[i] - mx) / sx;
    });

    const rng = LAB.rng(5500 + Math.round(p.init || 1) * 43);
    const wEnc0 = [0, 1, 2].map(() => (rng() - 0.5) * 0.8);
    const bEnc0 = 0;
    const wDec0 = [0, 1, 2].map(() => (rng() - 0.5) * 0.8);
    const bDec0 = [0, 0, 0];

    let wEnc = wEnc0.slice(), bEnc = bEnc0;
    let wDec = wDec0.slice(), bDec = bDec0.slice();
    const epochs = Math.max(50, Math.min(500, Math.round(p.epochs || 150)));
    const lr = p.lr || 0.05;

    function forwardAll(we, be, wd, bd) {
      return Z.map(x => {
        const z = we[0] * x[0] + we[1] * x[1] + we[2] * x[2] + be;
        const xh = [wd[0] * z + bd[0], wd[1] * z + bd[1], wd[2] * z + bd[2]];
        const err = ((x[0] - xh[0]) ** 2 + (x[1] - xh[1]) ** 2 + (x[2] - xh[2]) ** 2) / 3;
        return { z, xh, err };
      });
    }

    const f0 = forwardAll(wEnc, bEnc, wDec, bDec);
    const snaps = [{ ep: 0, wEnc: wEnc.slice(), wDec: wDec.slice(), fwd: f0, mse: M.mean(f0.map(o => o.err)) }];

    for (let ep = 1; ep <= epochs; ep++) {
      const gwE = [0, 0, 0];
      let gbE = 0;
      const gwD = [0, 0, 0], gbD = [0, 0, 0];
      for (let i = 0; i < n; i++) {
        const x = Z[i];
        const z = wEnc[0] * x[0] + wEnc[1] * x[1] + wEnc[2] * x[2] + bEnc;
        let dz = 0;
        for (let j = 0; j < 3; j++) {
          const xh = wDec[j] * z + bd_val(bDec, j);
          const dErr = (2 / (3 * n)) * (xh - x[j]);
          gwD[j] += dErr * z;
          gbD[j] += dErr;
          dz += dErr * wDec[j];
        }
        for (let j = 0; j < 3; j++) gwE[j] += dz * x[j];
        gbE += dz;
      }
      for (let j = 0; j < 3; j++) {
        wEnc[j] -= lr * gwE[j];
        wDec[j] -= lr * gwD[j];
        bDec[j] -= lr * gbD[j];
      }
      bEnc -= lr * gbE;

      if (ep === 1 || ep % Math.max(1, Math.floor(epochs / 6)) === 0 || ep === epochs) {
        const fw = forwardAll(wEnc, bEnc, wDec, bDec);
        snaps.push({ ep, wEnc: wEnc.slice(), wDec: wDec.slice(), fwd: fw, mse: M.mean(fw.map(o => o.err)) });
      }
    }

    function bd_val(arr, j) { return arr[j]; }

    const fin = snaps[snaps.length - 1];
    const ranked = rows.map((r, i) => ({ id: r.id, i, err: fin.fwd[i].err })).sort((a, b) => b.err - a.err);

    return { Z, wEnc0, bEnc0, wDec0, bDec0, wEnc, bEnc, wDec, bDec, snaps, fin, ranked };
  }

  LAB.register({
    id: 'F5', group: 'F', title: 'Autoencoder',
    module: { name: 'M5 第 17 節', url: '../m5/#p17' },
    goal: '看懂 3-1-3 自編碼器如何把三個指標壓縮成一維瓶頸再還原，並用「重建誤差」抓出與主群結構不符的異常病人。',
    data: {
      name: 'clinic_ae',
      scenario: '門診健檢：12 位病人＋1 位不合群異常病人 (#13)，用 3-1-3 線性自編碼器壓縮與還原',
      columns: COLS,
      editable: ['bmi', 'glu', 'sbp'],
      small: seed => makeRows(seed)
    },
    params: [
      { key: 'epochs', label: '訓練輪數', type: 'int', min: 50, max: 500, step: 50, value: 150 },
      { key: 'lr', label: '學習率 η', type: 'num', min: 0.01, max: 0.2, step: 0.01, value: 0.05 },
      { key: 'init', label: '起始種子', type: 'int', min: 1, max: 5, step: 1, value: 1 }
    ],
    pseudo: [
      '把 BMI、血糖、血壓標準化',
      '初始化 3-1-3 編碼與解碼權重',
      '對每輪訓練資料：',
      '  編碼：3 維 → 1 維瓶頸 z',
      '  解碼：1 維 z → 重建 3 維 x̂',
      '  計算重建誤差並反向更新權重',
      '依最終重建誤差大小抓出異常'
    ],
    build(rows, p) {
      const R = runAE(rows, p), steps = [];

      function views(st) {
        const sn = st.snap;
        const pt = sn.fwd[st.ptIdx];
        const x = R.Z[st.ptIdx];
        const layers = [
          [{ id: 'x0', label: 'BMI', value: x[0], cls: 'c0' }, { id: 'x1', label: '血糖', value: x[1], cls: 'c0' }, { id: 'x2', label: '血壓', value: x[2], cls: 'c0' }],
          [{ id: 'z', label: '瓶頸 z', value: st.showZ ? pt.z : 0, cls: 'hl', hl: true }],
          [{ id: 'y0', label: 'x̂₀', value: st.showOut ? pt.xh[0] : 0, cls: 'c1' }, { id: 'y1', label: 'x̂₁', value: st.showOut ? pt.xh[1] : 0, cls: 'c1' }, { id: 'y2', label: 'x̂₂', value: st.showOut ? pt.xh[2] : 0, cls: 'c1' }]
        ];
        const edges = [
          { from: 'x0', to: 'z', w: sn.wEnc[0], active: st.showZ },
          { from: 'x1', to: 'z', w: sn.wEnc[1], active: st.showZ },
          { from: 'x2', to: 'z', w: sn.wEnc[2], active: st.showZ },
          { from: 'z', to: 'y0', w: sn.wDec[0], active: st.showOut },
          { from: 'z', to: 'y1', w: sn.wDec[1], active: st.showOut },
          { from: 'z', to: 'y2', w: sn.wDec[2], active: st.showOut }
        ];
        const main = {
          type: 'network', slot: 'main',
          title: '3-1-3 自編碼器（目前看 #' + rows[st.ptIdx].id + '，第 ' + sn.ep + ' 輪）',
          layers, edges, layerLabels: ['輸入 x', '編碼 z', '重建 x̂'], digits: 2
        };
        const side = {
          type: 'table', slot: 'side',
          title: '各筆重建誤差（第 ' + sn.ep + ' 輪）',
          cols: [{ key: 'id', label: '#' }, { key: 'z', label: '編碼 z', num: true, digits: 2 }, { key: 'err', label: '重建誤差', num: true, digits: 3 }],
          rows: rows.map((r, i) => ({
            id: r.id,
            cells: [r.id, st.showZ ? sn.fwd[i].z : null, st.showOut ? (st.done && i === R.ranked[0].i ? { v: f(sn.fwd[i].err, 3), cls: 'bad' } : sn.fwd[i].err) : null],
            hl: i === st.ptIdx || (st.done && i === R.ranked[0].i)
          }))
        };
        const curRanked = rows.map((r, i) => ({ id: r.id, i, err: sn.fwd[i].err })).sort((a, b) => b.err - a.err);
        const bars = {
          type: 'bars', slot: 'bottom',
          title: '重建誤差排名（當輪前 6 名，越大越異常）',
          max: Math.max(1, M.max(R.snaps[0].fwd.map(o => o.err)), M.max(R.fin.fwd.map(o => o.err))), digits: 3,
          items: st.showOut
            ? curRanked.slice(0, 6).map((o, rank) => ({ id: 'rk' + o.id, label: '#' + o.id, value: o.err, cls: (st.done && rank === 0) ? 'bad' : (o.i === st.ptIdx ? 'hl' : (rank === 0 ? 'c4' : 'c0')), hl: (st.done && rank === 0) || o.i === st.ptIdx }))
            : rows.slice(0, 6).map((r, i) => ({ id: 'w' + r.id, label: '#' + r.id, value: 0, cls: i === st.ptIdx ? 'hl' : 'c0' }))
        };
        return [main, side, bars];
      }

      const st = { snap: R.snaps[0], ptIdx: 0, showZ: false, showOut: false, done: false };
      const add = (line, title, say, calc, extra) => steps.push(Object.assign({ line, title, say, calc: calc || [], views: views(st), focus: [rows[st.ptIdx].id] }, extra));

      add(0, '題目', '把 3 個標準化指標強迫壓成 1 個數字 z 再還原。模型只能學到「多數人的主要變化方向」，不合群的人就還原不好。', [
        '架構 3-1-3，輪數 = ' + p.epochs + '，學習率 η = ' + f(p.lr, 2)
      ]);

      st.showZ = true;
      add(4, '第 1 筆編碼壓縮', '把第 1 位病人的 BMI、血糖、血壓乘上編碼權重加總，壓縮成 1 維瓶頸值 z。', [
        'z = ' + f(R.snaps[0].fwd[0].z, 3)
      ]);

      st.showOut = true;
      add(5, '第 1 筆解碼與誤差', '由 z 乘上解碼權重嘗試還原 3 個數字，算出與原本輸入的均方誤差。', [
        '起始第 1 筆誤差 = ' + f(R.snaps[0].fwd[0].err, 3) + '｜全體平均 MSE = ' + f(R.snaps[0].mse, 3)
      ]);

      for (let k = 1; k < R.snaps.length; k++) {
        const sn = R.snaps[k];
        st.snap = sn;
        add(6, '訓練至第 ' + sn.ep + ' 輪', '透過反向傳播調整編碼與解碼權重，全體平均重建誤差持續下降。', [
          'Epoch ' + sn.ep + ' / ' + p.epochs + '｜平均 MSE = ' + f(sn.mse, 4)
        ], { phase: sn.ep + ' / ' + p.epochs });
      }

      st.done = true; st.ptIdx = R.ranked[0].i;
      add(7, '重建誤差最大＝異常', '訓練完成！大部分正常病人都能順利還原，重建誤差最高的是 #' + R.ranked[0].id + '，代表他偏離主群模式。', [
        '最高異常：#' + R.ranked[0].id + '（誤差 = ' + f(R.ranked[0].err, 3) + '）',
        '次高：#' + R.ranked[1].id + '（誤差 = ' + f(R.ranked[1].err, 3) + '）'
      ]);

      add(7, '與 PCA 的關聯', '當編碼器與解碼器都是線性（無激活函數）時，3-1-3 自編碼器學到的子空間與 PCA 第一主成分完全等價！', [
        '編碼權重方向 = (' + R.wEnc.map(v => f(v, 3)).join(', ') + ')'
      ]);

      add(7, '異常門檻與 VAE 延伸', '臨床部署會「只用正常病人訓練」並取驗證集誤差 95%/99% 分位數作告警門檻；加 ReLU 可學非線性流形，進階則為去噪 DAE 與生成式 VAE。', [
        '最終平均 MSE = ' + f(R.fin.mse, 4) + '｜最高異常 #' + R.ranked[0].id + ' = ' + f(R.ranked[0].err, 3)
      ]);
      return steps;
    },

    inputs(rows, p) {
      const R = runAE(rows, p);
      return { wEnc0: R.wEnc0, bEnc0: R.bEnc0, wDec0: R.wDec0, bDec0: R.bDec0 };
    },

    keys(steps, rows, p) {
      const R = runAE(rows, p);
      const k = { final_mse: R.fin.mse, top_outlier_id: R.ranked[0].id };
      for (let j = 0; j < 3; j++) {
        k['w_enc_' + j] = R.wEnc[j];
        k['w_dec_' + j] = R.wDec[j];
      }
      rows.forEach((r, i) => { k['err_' + r.id] = R.fin.fwd[i].err; });
      return k;
    },

    explain(steps, rows, p) {
      const R = runAE(rows, p);
      return [
        '經 ' + p.epochs + ' 輪訓練後，3-1-3 線性自編碼器的平均重建誤差降至 ' + f(R.fin.mse, 4) + '。',
        '全體重建誤差最高者為 #' + R.ranked[0].id + '（誤差 ' + f(R.ranked[0].err, 3) + '），代表他最不符合多數病人的線性關聯結構。',
        '線性 3-1-3 自編碼器學到的編碼方向，在數學上會收斂到與 PCA 第一主成分相同的子空間。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Normalize', 'Deep Learning'],
      params: [
        ['Deep Learning › autoencoder', 'true'],
        ['Deep Learning › hidden layer sizes', '1']
      ],
      note: 'AI Studio 的 Deep Learning (H2O) 勾選 autoencoder 可建立自編碼器，但預設含非線性激活與正則化；本實驗以線性 3-1-3 展示與 PCA 第一主成分之對照。',
      expect: (steps, rows, p) => {
        const R = runAE(rows, p);
        return ['最高重建誤差病人：#' + R.ranked[0].id + '（誤差 ' + f(R.ranked[0].err, 3) + '）'];
      },
      python: `from sklearn.decomposition import PCA\n# 線性 3-1-3 Autoencoder 學到的子空間等價於 PCA(n_components=1)`,
      confirmed: false
    }
  });
})();
