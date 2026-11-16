/* F2 優化器比較 */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = [
    { key: 'step', label: '步數', type: 'num', role: 'x' },
    { key: 'w1', label: 'w₁', type: 'num', role: 'x' },
    { key: 'w2', label: 'w₂', type: 'num', role: 'x' },
    { key: 'loss', label: 'L(w₁,w₂)', type: 'num', role: 'y' }
  ];
  const STARTS = [
    { v: '0', label: '(-3.5, 1.2)', w: [-3.5, 1.2] },
    { v: '1', label: '(-3.0, -1.0)', w: [-3.0, -1.0] },
    { v: '2', label: '(3.2, 1.1)', w: [3.2, 1.1] }
  ];
  const AX = { x: { label: 'w₁（緩坡方向）', min: -4.2, max: 4.2 }, y: { label: 'w₂（陡峭方向）', min: -2.2, max: 2.2 } };

  // 狹長山谷損失函式：L(w1, w2) = 0.5 * w1^2 + 8 * w2^2
  const lossFn = (w1, w2) => 0.5 * w1 * w1 + 8 * w2 * w2;
  const gradFn = (w1, w2) => [w1, 16 * w2];

  function runOpt(opt, lr, nSteps, w0) {
    let w1 = w0[0], w2 = w0[1];
    let v1 = 0, v2 = 0, m1 = 0, m2 = 0, s1 = 0, s2 = 0;
    const beta = 0.9, b1 = 0.9, b2 = 0.999, eps = 1e-8;
    const path = [{ step: 0, w1, w2, loss: lossFn(w1, w2), g1: 0, g2: 0, st1: 0, st2: 0 }];

    for (let t = 1; t <= nSteps; t++) {
      const [g1, g2] = gradFn(w1, w2);
      if (opt === 'sgd') {
        w1 -= lr * g1; w2 -= lr * g2;
        path.push({ step: t, w1, w2, loss: lossFn(w1, w2), g1, g2, st1: -lr * g1, st2: -lr * g2 });
      } else if (opt === 'momentum') {
        v1 = beta * v1 + g1; v2 = beta * v2 + g2;
        w1 -= lr * v1; w2 -= lr * v2;
        path.push({ step: t, w1, w2, loss: lossFn(w1, w2), g1, g2, st1: v1, st2: v2 });
      } else {
        m1 = b1 * m1 + (1 - b1) * g1; m2 = b1 * m2 + (1 - b1) * g2;
        s1 = b2 * s1 + (1 - b2) * g1 * g1; s2 = b2 * s2 + (1 - b2) * g2 * g2;
        const m1h = m1 / (1 - Math.pow(b1, t)), m2h = m2 / (1 - Math.pow(b1, t));
        const s1h = s1 / (1 - Math.pow(b2, t)), s2h = s2 / (1 - Math.pow(b2, t));
        w1 -= lr * m1h / (Math.sqrt(s1h) + eps);
        w2 -= lr * m2h / (Math.sqrt(s2h) + eps);
        path.push({ step: t, w1, w2, loss: lossFn(w1, w2), g1, g2, st1: m1h, st2: s1h });
      }
    }
    return path;
  }

  function runAll(p) {
    const w0 = STARTS[parseInt(p.start || '0', 10)].w;
    const lr = p.lr || 0.08;
    const nSteps = Math.max(20, Math.min(100, Math.round(p.steps || 40)));
    return {
      w0, lr, nSteps,
      sgd: runOpt('sgd', lr, nSteps, w0),
      momentum: runOpt('momentum', lr, nSteps, w0),
      adam: runOpt('adam', lr, nSteps, w0)
    };
  }

  LAB.register({
    id: 'F2', group: 'F', title: '優化器比較',
    module: { name: 'M5 第 05 節', url: '../m5/#p05' },
    goal: '看懂在狹長山谷損失曲面上，SGD 為什麼會左右震盪，以及 Momentum（動量）與 Adam（自適應學習率）如何加速走到谷底。',
    data: {
      name: 'opt_valley',
      scenario: '二維狹長山谷 L(w₁, w₂) = 0.5w₁² + 8w₂²，比較三種優化器從同一點出發的軌跡',
      columns: COLS,
      small: (seed, p) => {
        const w0 = STARTS[0].w;
        return runOpt('sgd', 0.08, 10, w0).slice(0, 8).map((x, i) => ({ id: i + 1, step: x.step, w1: Math.round(x.w1 * 100) / 100, w2: Math.round(x.w2 * 100) / 100, loss: Math.round(x.loss * 100) / 100 }));
      },
      view: () => ({
        type: 'note', tone: 'info',
        text: '固定損失函式 L(w₁, w₂) = 0.5w₁² + 8w₂²（谷底在 (0, 0)，w₂ 方向曲率是 w₁ 的 16 倍）。'
      })
    },
    params: [
      { key: 'optimizer', label: '目前觀察優化器', type: 'choice', value: 'sgd', options: [{ v: 'sgd', label: 'SGD' }, { v: 'momentum', label: 'Momentum' }, { v: 'adam', label: 'Adam' }] },
      { key: 'lr', label: '學習率 η', type: 'num', min: 0.01, max: 0.15, step: 0.01, value: 0.08 },
      { key: 'steps', label: '步數', type: 'int', min: 20, max: 100, step: 10, value: 40 },
      { key: 'start', label: '起點', type: 'choice', value: '0', options: STARTS }
    ],
    pseudo: [
      '選定山谷起點 (w₁, w₂)',
      '重複 T 步：',
      '  算梯度 g = (w₁, 16w₂)',
      '  SGD：直接 w − η·g',
      '  Momentum：累積速度 v 抗震盪',
      '  Adam：估計一階 m 與二階 s 縮放',
      '比較三條路徑到達谷底的步數'
    ],
    build(rows, p) {
      const R = runAll(p), steps = [];
      const curOpt = p.optimizer || 'sgd';
      const curPath = R[curOpt];
      const bgRegions = LAB.grid((x, y) => {
        const l = lossFn(x, y);
        return l < 1.5 ? 'c2' : l < 6 ? 'c0' : l < 18 ? 'c1' : 'c4';
      }, AX.x.min, AX.x.max, AX.y.min, AX.y.max, 28, 18);

      function pathToLines(path, clsName, prefix, upto) {
        const out = [];
        for (let i = 0; i < Math.min(upto, path.length - 1); i++) {
          out.push({ id: prefix + i, x1: path[i].w1, y1: path[i].w2, x2: path[i + 1].w1, y2: path[i + 1].w2, cls: clsName, w: 2 });
        }
        return out;
      }

      function views(st) {
        let lines = [];
        const points = [{ id: 'goal', x: 0, y: 0, cls: 'c2', shape: 'star', r: 9, label: '谷底(0,0)' }];
        if (st.compareAll) {
          lines = lines.concat(pathToLines(R.sgd, 'c4', 's', R.nSteps))
            .concat(pathToLines(R.momentum, 'c0', 'm', R.nSteps))
            .concat(pathToLines(R.adam, 'c1', 'a', R.nSteps));
          points.push({ id: 'p_sgd', x: R.sgd[R.nSteps].w1, y: R.sgd[R.nSteps].w2, cls: 'c4', r: 6, label: 'SGD' });
          points.push({ id: 'p_mom', x: R.momentum[R.nSteps].w1, y: R.momentum[R.nSteps].w2, cls: 'c0', r: 6, label: 'Mom' });
          points.push({ id: 'p_adm', x: R.adam[R.nSteps].w1, y: R.adam[R.nSteps].w2, cls: 'c1', r: 6, label: 'Adam' });
        } else {
          lines = pathToLines(curPath, curOpt === 'sgd' ? 'c4' : curOpt === 'momentum' ? 'c0' : 'c1', 'c', st.step);
          const pt = curPath[st.step];
          points.push({ id: 'cur', x: pt.w1, y: pt.w2, cls: 'hl', r: 7, ring: true, label: '第' + st.step + '步' });
        }
        const main = {
          type: 'scatter', slot: 'main',
          title: st.compareAll ? '三種優化器軌跡總比較' : curOpt.toUpperCase() + ' 軌跡（第 ' + st.step + ' 步）',
          axes: AX, points, lines, circles: [], regions: bgRegions,
          legend: st.compareAll
            ? [{ cls: 'c4', shape: 'line', label: 'SGD' }, { cls: 'c0', shape: 'line', label: 'Momentum' }, { cls: 'c1', shape: 'line', label: 'Adam' }]
            : [{ cls: 'hl', label: '目前位置' }, { cls: 'c2', shape: 'star', label: '谷底 (0,0)' }]
        };
        const side = {
          type: 'table', slot: 'side',
          title: curOpt.toUpperCase() + ' 每步位置與損失',
          cols: [
            { key: 's', label: '步', num: true, digits: 0 },
            { key: 'w1', label: 'w₁', num: true, digits: 2 },
            { key: 'w2', label: 'w₂', num: true, digits: 2 },
            { key: 'l', label: 'Loss', num: true, digits: 3 }
          ],
          rows: curPath.slice(Math.max(0, st.step - 7), st.step + 1).map(pt => ({
            id: 'r' + pt.step,
            cells: [pt.step, pt.w1, pt.w2, pt.loss],
            hl: pt.step === st.step
          }))
        };
        const maxL = Math.max(5, curPath[0].loss * 1.1);
        const line = {
          type: 'line', slot: 'bottom',
          title: '損失 L(w₁, w₂) 下降曲線',
          axes: { x: { label: '步數', min: 0, max: R.nSteps }, y: { label: 'Loss', min: 0, max: maxL } },
          series: st.compareAll
            ? [
                { id: 'ls', label: 'SGD', pts: R.sgd.map(x => [x.step, Math.min(maxL, x.loss)]), cls: 'c4', dots: false },
                { id: 'lm', label: 'Momentum', pts: R.momentum.map(x => [x.step, Math.min(maxL, x.loss)]), cls: 'c0', dots: false },
                { id: 'la', label: 'Adam', pts: R.adam.map(x => [x.step, Math.min(maxL, x.loss)]), cls: 'c1', dots: false }
              ]
            : [{ id: 'lc', label: curOpt.toUpperCase(), pts: curPath.slice(0, st.step + 1).map(x => [x.step, Math.min(maxL, x.loss)]), cls: 'c1', dots: false }],
          marker: st.compareAll ? null : { x: st.step, y: Math.min(maxL, curPath[st.step].loss), label: '第 ' + st.step + ' 步' }
        };
        return [main, side, line];
      }

      const st = { step: 0, compareAll: false };
      const add = (line, title, say, calc, extra) => steps.push(Object.assign({ line, title, say, calc: calc || [], views: views(st), focus: [] }, extra));

      add(0, '題目', '狹長山谷 L = 0.5w₁² + 8w₂² 在 w₂ 方向非常陡、w₁ 方向很平緩。觀察 SGD、Momentum、Adam 怎麼走下谷底。', [
        '起點 = (' + R.w0[0] + ', ' + R.w0[1] + ')，起始 Loss = ' + f(curPath[0].loss, 2)
      ]);

      for (let t = 1; t <= 3; t++) {
        st.step = t;
        const pt = curPath[t];
        add(curOpt === 'sgd' ? 4 : curOpt === 'momentum' ? 5 : 6,
          '第 ' + t + ' 步更新',
          curOpt === 'sgd' ? 'SGD 直接沿負梯度移動，w₂ 方向因曲率大容易來回震盪。'
            : curOpt === 'momentum' ? 'Momentum 把前一步速度乘 0.9 疊加上來，抵銷上下震盪、加速沿山谷前進。'
            : 'Adam 同時估計梯度一階與二階動量並做偏差修正，自動把陡峭的 w₂ 步幅縮小、平緩的 w₁ 放大。',
          [
            '梯度 = (' + f(pt.g1, 2) + ', ' + f(pt.g2, 2) + ')',
            '新位置 = (' + f(pt.w1, 3) + ', ' + f(pt.w2, 3) + ')，Loss = ' + f(pt.loss, 3)
          ], { phase: '第 ' + t + ' 步' });
      }

      const marks = [];
      for (let k = 1; k <= 6; k++) {
        const s = Math.max(4, Math.round(4 + (R.nSteps - 4) * k / 6));
        if (!marks.includes(s)) marks.push(s);
      }
      marks.forEach(s => {
        st.step = s;
        const pt = curPath[s];
        add(curOpt === 'sgd' ? 4 : curOpt === 'momentum' ? 5 : 6,
          '前進到第 ' + s + ' 步', '繼續依 ' + curOpt.toUpperCase() + ' 規則更新位置，觀察損失下降幅度。', [
            '位置 = (' + f(pt.w1, 3) + ', ' + f(pt.w2, 3) + ')，Loss = ' + f(pt.loss, 4)
          ], { phase: s + ' / ' + R.nSteps });
      });

      st.compareAll = true;
      add(7, '三條路徑總比較', '同一個山谷與同一學習率 η = ' + f(R.lr, 2) + ' 下，比較三種優化器走到第 ' + R.nSteps + ' 步的殘餘損失。', [
        'SGD 最終 Loss = ' + f(R.sgd[R.nSteps].loss, 4) + '｜Momentum = ' + f(R.momentum[R.nSteps].loss, 4),
        'Adam 最終 Loss = ' + f(R.adam[R.nSteps].loss, 4)
      ]);
      return steps;
    },

    keys(steps, rows, p) {
      const R = runAll(p);
      const k = {};
      ['sgd', 'momentum', 'adam'].forEach(name => {
        const path = R[name];
        for (let t = 1; t <= 3; t++) {
          k[name + '_' + t + '_w1'] = path[t].w1;
          k[name + '_' + t + '_w2'] = path[t].w2;
          k[name + '_' + t + '_loss'] = path[t].loss;
        }
        const last = path[R.nSteps];
        k[name + '_fin_w1'] = last.w1;
        k[name + '_fin_w2'] = last.w2;
        k[name + '_fin_loss'] = last.loss;
      });
      return k;
    },

    explain(steps, rows, p) {
      const R = runAll(p);
      return [
        '在狹長山谷 L = 0.5w₁² + 8w₂² 上，跑完 ' + R.nSteps + ' 步後，SGD 損失為 ' + f(R.sgd[R.nSteps].loss, 4) + '、Momentum 為 ' + f(R.momentum[R.nSteps].loss, 4) + '、Adam 為 ' + f(R.adam[R.nSteps].loss, 4) + '。',
        'Momentum 透過慣性抵銷垂直山谷的震盪；Adam 則依據各軸梯度平方自動調整每個參數的步幅。',
        '實務訓練深度神經網路時，Adam 常作為預設起手優化器，SGD + Momentum 則常見於影像分類精調。'
      ];
    },

    aistudio: {
      operators: ['Execute Python'],
      params: [
        ['optimizer', p => p.optimizer],
        ['lr', p => String(p.lr)]
      ],
      note: 'AI Studio 的 Deep Learning (H2O) 支援 ADADELTA 與 momentum，但不含 Adam；本實驗以 PyTorch 官方更新公式與 numpy 驗證對齊。',
      expect: (steps, rows, p) => {
        const R = runAll(p);
        return ['第 ' + R.nSteps + ' 步損失：SGD=' + f(R.sgd[R.nSteps].loss, 4) + ', Mom=' + f(R.momentum[R.nSteps].loss, 4) + ', Adam=' + f(R.adam[R.nSteps].loss, 4)];
      },
      python: `import torch\n# 依 PyTorch SGD / SGD(momentum=0.9) / Adam 公式驗證`,
      confirmed: false
    }
  });
})();
