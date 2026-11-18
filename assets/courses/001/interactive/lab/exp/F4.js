/* F4 RNN 與 LSTM */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = LAB.data.columns('opd', ['t', 'month', 'visits']);
  const pick = r => ({ id: r.id, t: r.t, month: r.month, visits: r.visits });

  function runSeq(rows, p) {
    const vs = LAB.col(rows, 'visits');
    const mv = M.mean(vs), sv = M.sd(vs) || 1;
    const xs = vs.map(v => (v - mv) / sv);
    const rng = LAB.rng(4400 + Math.round(p.init || 1) * 37);
    const rw = () => Math.round((rng() - 0.5) * 160) / 100;

    const weights = {
      rnn: { wx: rw() || 0.5, wh: rw() || 0.4, bh: rw() * 0.3 },
      lstm: {
        wxf: rw() || 0.4, whf: rw() || 0.3, bf: 0.5,
        wxi: rw() || 0.5, whi: rw() || 0.3, bi: 0.0,
        wxc: rw() || 0.6, whc: rw() || 0.3, bc: 0.0,
        wxo: rw() || 0.4, who: rw() || 0.3, bo: 0.0
      },
      wy: rw() || 0.8, by: 0.0
    };

    const rnnSteps = [];
    let hR = 0;
    let gradProd = 1;
    xs.forEach((x, t) => {
      const pre = weights.rnn.wx * x + weights.rnn.wh * hR + weights.rnn.bh;
      const hNew = Math.tanh(pre);
      const jac = weights.rnn.wh * (1 - hNew * hNew);
      gradProd *= Math.abs(jac);
      rnnSteps.push({ t: t + 1, x, hPrev: hR, pre, h: hNew, jac, gradProd });
      hR = hNew;
    });

    const lstmSteps = [];
    let hL = 0, cL = 0;
    xs.forEach((x, t) => {
      const w = weights.lstm;
      const fg = M.sigmoid(w.wxf * x + w.whf * hL + w.bf);
      const ig = M.sigmoid(w.wxi * x + w.whi * hL + w.bi);
      const cand = Math.tanh(w.wxc * x + w.whc * hL + w.bc);
      const cNew = fg * cL + ig * cand;
      const og = M.sigmoid(w.wxo * x + w.who * hL + w.bo);
      const hNew = og * Math.tanh(cNew);
      lstmSteps.push({ t: t + 1, x, hPrev: hL, cPrev: cL, f: fg, i: ig, cand, c: cNew, o: og, h: hNew });
      hL = hNew; cL = cNew;
    });

    const isLstm = p.cell === 'lstm';
    const lastH = isLstm ? hL : hR;
    const yPredZ = weights.wy * lastH + weights.by;
    const yPred = mv + yPredZ * sv;

    return { mv, sv, xs, weights, rnnSteps, lstmSteps, isLstm, lastH, yPredZ, yPred };
  }

  LAB.register({
    id: 'F4', group: 'F', title: 'RNN 與 LSTM',
    module: { name: 'M5 深度學習', url: '../m5/' },
    goal: '看懂循環神經網路如何逐月傳遞隱藏狀態 h_t，並對比 RNN 的梯度連乘消失與 LSTM 透過遺忘閘、輸入閘、細胞狀態維持長期記憶。',
    data: {
      name: 'opd_seq',
      scenario: '月門診量：取前 8 個月門診人次標準化成序列，前向推算各時間步狀態並預測第 9 個月',
      columns: COLS,
      small: seed => LAB.data.opd(seed, 8).map(pick),
      view: rows => ({
        type: 'line', title: '8 個月門診量序列',
        series: [{ id: 'v', label: '門診人次', pts: rows.map(r => [r.t, r.visits]), cls: 'c0', dots: true }]
      })
    },
    params: [
      { key: 'cell', label: '循環單元', type: 'choice', value: 'lstm', options: [{ v: 'rnn', label: 'RNN' }, { v: 'lstm', label: 'LSTM' }] },
      { key: 'init', label: '權重種子', type: 'int', min: 1, max: 5, step: 1, value: 1 }
    ],
    pseudo: [
      '把 8 個月門診量標準化為 x₁…x₈',
      '初始化隱藏狀態 h₀ = 0（LSTM 另設 c₀ = 0）',
      '逐時間步 t = 1…8 前向計算：',
      '  RNN：hₜ = tanh(wx+uh+b)',
      '  LSTM：算遺忘閘 fₜ、輸入閘 iₜ、候選 c̃ₜ',
      '        更新細胞 cₜ = fₜcₜ₋₁ + iₜc̃ₜ',
      '        算輸出閘 oₜ 與 hₜ = oₜtanh(cₜ)',
      '由最終 h₈ 輸出第 9 個月預測'
    ],
    build(rows, p) {
      const R = runSeq(rows, p), steps = [];

      function views(st) {
        let layers, edges;
        if (R.isLstm) {
          const cur = R.lstmSteps[Math.max(0, st.tIdx)];
          const act = st.activeGate;
          layers = [
            [{ id: 'xt', label: 'xₜ', value: st.tIdx >= 0 ? cur.x : 0, shape: 'box', cls: 'c0' },
             { id: 'hp', label: 'hₜ₋₁', value: st.tIdx >= 0 ? cur.hPrev : 0, shape: 'box', cls: 'c5' },
             { id: 'cp', label: 'cₜ₋₁', value: st.tIdx >= 0 ? cur.cPrev : 0, shape: 'box', cls: 'c5' }],
            [{ id: 'fg', label: '遺忘閘 f', value: st.tIdx >= 0 ? cur.f : 0, shape: 'box', cls: act === 'f' ? 'hl' : 'c4', hl: act === 'f' },
             { id: 'ig', label: '輸入閘 i', value: st.tIdx >= 0 ? cur.i : 0, shape: 'box', cls: act === 'i' ? 'hl' : 'c2', hl: act === 'i' },
             { id: 'cg', label: '候選 c̃', value: st.tIdx >= 0 ? cur.cand : 0, shape: 'box', cls: act === 'c' ? 'hl' : 'c0', hl: act === 'c' },
             { id: 'og', label: '輸出閘 o', value: st.tIdx >= 0 ? cur.o : 0, shape: 'box', cls: act === 'o' ? 'hl' : 'c3', hl: act === 'o' }],
            [{ id: 'ct', label: '細胞 cₜ', value: st.tIdx >= 0 ? cur.c : 0, shape: 'box', cls: act === 'ct' ? 'hl' : 'c1', hl: act === 'ct' },
             { id: 'ht', label: '隱藏 hₜ', value: st.tIdx >= 0 ? cur.h : 0, shape: 'box', cls: act === 'ht' ? 'hl' : 'c1', hl: act === 'ht' }]
          ];
          edges = [
            { from: 'xt', to: 'fg', active: act === 'f' }, { from: 'hp', to: 'fg', active: act === 'f' },
            { from: 'xt', to: 'ig', active: act === 'i' }, { from: 'hp', to: 'ig', active: act === 'i' },
            { from: 'xt', to: 'cg', active: act === 'c' }, { from: 'hp', to: 'cg', active: act === 'c' },
            { from: 'xt', to: 'og', active: act === 'o' }, { from: 'hp', to: 'og', active: act === 'o' },
            { from: 'cp', to: 'ct', active: act === 'ct' }, { from: 'fg', to: 'ct', active: act === 'ct' },
            { from: 'ig', to: 'ct', active: act === 'ct' }, { from: 'cg', to: 'ct', active: act === 'ct' },
            { from: 'ct', to: 'ht', active: act === 'ht' }, { from: 'og', to: 'ht', active: act === 'ht' }
          ];
        } else {
          const cur = R.rnnSteps[Math.max(0, st.tIdx)];
          layers = [
            [{ id: 'xt', label: 'xₜ', value: st.tIdx >= 0 ? cur.x : 0, shape: 'box', cls: 'c0' },
             { id: 'hp', label: 'hₜ₋₁', value: st.tIdx >= 0 ? cur.hPrev : 0, shape: 'box', cls: 'c5' }],
            [{ id: 'ht', label: 'hₜ = tanh', value: st.tIdx >= 0 ? cur.h : 0, shape: 'box', cls: 'c1', hl: st.tIdx >= 0 }],
            [{ id: 'yp', label: '預測 ŷ', value: st.showPred ? R.yPredZ : 0, shape: 'box', cls: st.showPred ? 'c2' : 'c5' }]
          ];
          edges = [{ from: 'xt', to: 'ht', active: st.tIdx >= 0 }, { from: 'hp', to: 'ht', active: st.tIdx >= 0 }, { from: 'ht', to: 'yp', active: st.showPred }];
        }
        const main = {
          type: 'network', slot: 'main',
          title: (R.isLstm ? 'LSTM' : 'RNN') + ' 單步展開（第 ' + Math.max(0, st.tIdx + 1) + ' 月）',
          layers, edges, digits: 2
        };
        const side = R.isLstm ? {
          type: 'table', slot: 'side', title: '各月 LSTM 閘門與狀態',
          cols: [{ key: 't', label: '月', num: true, digits: 0 }, { key: 'f', label: 'fₜ', num: true, digits: 2 }, { key: 'i', label: 'iₜ', num: true, digits: 2 }, { key: 'c', label: 'cₜ', num: true, digits: 2 }, { key: 'h', label: 'hₜ', num: true, digits: 2 }],
          rows: R.lstmSteps.map((s, idx) => ({
            id: s.t,
            cells: [s.t, idx <= st.tIdx ? s.f : null, idx <= st.tIdx ? s.i : null, idx <= st.tIdx ? s.c : null, idx <= st.tIdx ? s.h : null],
            hl: idx === st.tIdx
          }))
        } : {
          type: 'table', slot: 'side', title: '各月 RNN 狀態與梯度因子',
          cols: [{ key: 't', label: '月', num: true, digits: 0 }, { key: 'x', label: 'xₜ', num: true, digits: 2 }, { key: 'h', label: 'hₜ', num: true, digits: 2 }, { key: 'gp', label: '連乘梯度', num: true, digits: 3 }],
          rows: R.rnnSteps.map((s, idx) => ({
            id: s.t,
            cells: [s.t, s.x, idx <= st.tIdx ? s.h : null, idx <= st.tIdx ? { v: f(s.gradProd, 3), cls: s.gradProd < 0.05 ? 'bad' : (s.gradProd < 0.2 ? 'c3' : 'good') } : null],
            hl: idx === st.tIdx
          }))
        };
        const line = {
          type: 'line', slot: 'bottom', title: '標準化門診量序列',
          axes: { x: { label: '月份 t', min: 1, max: 9 }, y: { label: 'Z(門診量)', min: -2.5, max: 2.5 } },
          series: [
            { id: 'zero', label: '0 線', pts: [[1, 0], [9, 0]], cls: 'c5', dash: true, dots: false },
            { id: 'seq', label: 'Z(門診量)', pts: R.xs.map((x, i) => [i + 1, x]), cls: 'c0', dots: true }
          ],
          marker: st.tIdx >= 0 ? { x: st.tIdx + 1, y: R.xs[st.tIdx], label: 't=' + (st.tIdx + 1) } : null
        };
        return [main, side, line];
      }

      const st = { tIdx: -1, activeGate: null, showPred: false };
      const add = (line, title, say, calc, extra) => steps.push(Object.assign({ line, title, say, calc: calc || [], views: views(st), focus: [] }, extra));

      add(0, '題目', '門診人次有時間先後順序。用 ' + (R.isLstm ? 'LSTM' : 'RNN') + ' 依序讀入 8 個月資料（h₀=0），最後預測第 9 個月。', [
        '標準化基準：平均 = ' + f(R.mv, 1) + '，標準差 = ' + f(R.sv, 1)
      ]);

      if (!R.isLstm) {
        R.rnnSteps.forEach((s, idx) => {
          st.tIdx = idx;
          add(4, '第 ' + s.t + ' 月：計算 h' + s.t, idx < 3 ? '把當月 x' + s.t + ' 與上月記憶 h' + (s.t - 1) + ' 加權相加再過 tanh。' : '繼續將記憶傳遞到第 ' + s.t + ' 月，觀察連乘梯度因子不斷縮小。', [
            'h' + s.t + ' = tanh(' + f(R.weights.rnn.wx, 2) + '×' + f(s.x, 2) + ' + ' + f(R.weights.rnn.wh, 2) + '×' + f(s.hPrev, 2) + ' + ' + f(R.weights.rnn.bh, 2) + ') = ' + f(s.h, 3),
            '單步導數 = ' + f(s.jac, 3) + '｜累積連乘 = ' + f(s.gradProd, 4)
          ], { phase: 't = ' + s.t });
        });
        add(4, 'RNN 梯度消失說明', '經過 8 個月連乘 wₕ(1−h²)，早期月份對第 8 月的影響已衰減到 ' + f(R.rnnSteps[7].gradProd, 4) + '，這就是梯度消失。', [
          '第 1 月傳到第 8 月的殘餘比例 ≈ ' + f(R.rnnSteps[7].gradProd, 4)
        ]);
      } else {
        const s0 = R.lstmSteps[0];
        st.tIdx = 0;
        st.activeGate = 'f';
        add(5, '第 1 月：遺忘閘 f₁', '遺忘閘決定上一月細胞記憶 c₀ 要保留多少（0=全忘、1=全留）。', ['f₁ = sigmoid(…) = ' + f(s0.f, 3)]);
        st.activeGate = 'i';
        add(5, '第 1 月：輸入閘 i₁', '輸入閘決定這個月的新資訊有多少比例要寫進細胞狀態。', ['i₁ = sigmoid(…) = ' + f(s0.i, 3)]);
        st.activeGate = 'c';
        add(5, '第 1 月：候選記憶 c̃₁', '用 tanh 把當月輸入與上月隱藏狀態壓成 [−1, 1] 的候選記憶。', ['c̃₁ = tanh(…) = ' + f(s0.cand, 3)]);
        st.activeGate = 'ct';
        add(6, '第 1 月：更新細胞 c₁', '舊記憶乘上遺忘閘，加上新記憶乘上輸入閘——這條加法高速公路讓梯度不易消失！', [
          'c₁ = ' + f(s0.f, 2) + '×0 + ' + f(s0.i, 2) + '×' + f(s0.cand, 2) + ' = ' + f(s0.c, 3)
        ]);
        st.activeGate = 'o';
        add(7, '第 1 月：輸出閘 o₁', '輸出閘決定細胞狀態有多少比例要對外輸出為隱藏狀態。', ['o₁ = sigmoid(…) = ' + f(s0.o, 3)]);
        st.activeGate = 'ht';
        add(7, '第 1 月：隱藏狀態 h₁', '細胞狀態經過 tanh 再乘上輸出閘，得到第 1 月的隱藏狀態 h₁。', [
          'h₁ = ' + f(s0.o, 2) + '×tanh(' + f(s0.c, 2) + ') = ' + f(s0.h, 3)
        ]);
        st.activeGate = null;
        for (let idx = 1; idx < R.lstmSteps.length; idx++) {
          st.tIdx = idx;
          const s = R.lstmSteps[idx];
          add(7, '第 ' + s.t + ' 月完整推算', '對第 ' + s.t + ' 月依序算出四個閘與細胞／隱藏狀態。', [
            'f=' + f(s.f, 2) + ' i=' + f(s.i, 2) + ' o=' + f(s.o, 2) + ' → c=' + f(s.c, 2) + ', h=' + f(s.h, 2)
          ], { phase: 't = ' + s.t });
        }
      }

      st.showPred = true;
      add(8, '輸出第 9 個月預測', '把第 8 月的隱藏狀態 h₈ 乘上輸出層權重並反標準化，得到第 9 個月預測門診人次。', [
        '標準化預測 ẑ = ' + f(R.weights.wy, 2) + '×' + f(R.lastH, 3) + ' = ' + f(R.yPredZ, 3),
        '反標準化預測 = ' + f(R.yPred, 0) + ' 人次'
      ]);
      return steps;
    },

    inputs(rows, p) {
      const R = runSeq(rows, p);
      return { xs: R.xs, weights: R.weights };
    },

    keys(steps, rows, p) {
      const R = runSeq(rows, p);
      const k = { last_h: R.lastH, y_pred_z: R.yPredZ, y_pred: R.yPred };
      if (!R.isLstm) {
        R.rnnSteps.forEach((s, i) => { k['rnn_h_' + i] = s.h; k['rnn_gp_' + i] = s.gradProd; });
      } else {
        R.lstmSteps.forEach((s, i) => {
          k['lstm_f_' + i] = s.f;
          k['lstm_i_' + i] = s.i;
          k['lstm_o_' + i] = s.o;
          k['lstm_c_' + i] = s.c;
          k['lstm_h_' + i] = s.h;
        });
      }
      return k;
    },

    explain(steps, rows, p) {
      const R = runSeq(rows, p);
      return [
        '將 8 個月門診量標準化後依序送入 ' + (R.isLstm ? 'LSTM' : 'RNN') + '（僅示範前向推算），最終隱藏狀態 h₈ = ' + f(R.lastH, 3) + '。',
        R.isLstm ? 'LSTM 透過「遺忘閘×舊細胞 + 輸入閘×新記憶」的加法路徑，讓長期記憶不易因連乘而消失。' : 'RNN 因每步導數連乘，早期輸入到第 8 步的影響已衰減為 ' + f(R.rnnSteps[7].gradProd, 4) + '。',
        '由最終狀態推算第 9 個月預測門診量為 ' + f(R.yPred, 0) + ' 人次。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Execute Python'],
      params: [
        ['cell', p => p.cell]
      ],
      note: 'AI Studio 核心版無原生 RNN/LSTM 層，需安裝 Deep Learning 擴充或用 Execute Python；本實驗與 Python 驗證依相同權重做前向對照。',
      expect: (steps, rows, p) => {
        const R = runSeq(rows, p);
        return ['第 8 步 h₈ = ' + f(R.lastH, 3) + '，第 9 月預測 = ' + f(R.yPred, 0)];
      },
      python: `import torch.nn as nn\n# 可將 weights 載入 nn.RNNCell(1, 1) 或 nn.LSTMCell(1, 1) 逐月前向驗證`,
      confirmed: false
    }
  });
})();
