/* F1 神經網路：前向與反向傳播　（樣板實驗：網路型） */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f, sig = M.sigmoid;
  const COLS = LAB.data.columns('clinic', ['bmi', 'glu', 'dm'], { dm: 'y' });
  const pick = r => ({ id: r.id, bmi: r.bmi, glu: r.glu, dm: r.dm });
  const NAMES = ['w11', 'w21', 'b1', 'w12', 'w22', 'b2', 'v1', 'v2', 'bo'];
  const LABEL = { w11: 'w₁₁（x₁→h₁）', w21: 'w₂₁（x₂→h₁）', b1: 'b₁（h₁ 偏差）', w12: 'w₁₂（x₁→h₂）', w22: 'w₂₂（x₂→h₂）', b2: 'b₂（h₂ 偏差）', v1: 'v₁（h₁→ŷ）', v2: 'v₂（h₂→ŷ）', bo: 'b₀（ŷ 偏差）' };
  const EDGE = { w11: ['x1', 'h1'], w21: ['x2', 'h1'], w12: ['x1', 'h2'], w22: ['x2', 'h2'], v1: ['h1', 'o'], v2: ['h2', 'o'] };

  function forward(W, x) {
    const z1 = W.w11 * x[0] + W.w21 * x[1] + W.b1, h1 = sig(z1), z2 = W.w12 * x[0] + W.w22 * x[1] + W.b2, h2 = sig(z2), zo = W.v1 * h1 + W.v2 * h2 + W.bo, yh = sig(zo);
    return { z1, h1, z2, h2, zo, yh };
  }
  const bce = (y, yh) => { const e = 1e-12; return -(y * Math.log(Math.max(e, yh)) + (1 - y) * Math.log(Math.max(e, 1 - yh))); };
  function grads(W, x, y, F) {
    const dO = F.yh - y, d1 = dO * W.v1 * F.h1 * (1 - F.h1), d2 = dO * W.v2 * F.h2 * (1 - F.h2);
    return { dO, d1, d2, g: { w11: d1 * x[0], w21: d1 * x[1], b1: d1, w12: d2 * x[0], w22: d2 * x[1], b2: d2, v1: dO * F.h1, v2: dO * F.h2, bo: dO } };
  }
  const step = (W, g, lr) => { const o = {}; NAMES.forEach(k => { o[k] = W[k] - lr * g[k]; }); return o; };

  /* 完整訓練：逐筆更新（批次大小 1、不洗牌），記錄第一筆的所有中間值與每一輪的平均損失 */
  function train(rows, p) {
    const mB = M.mean(LAB.col(rows, 'bmi')), sB = M.sd(LAB.col(rows, 'bmi')) || 1, mG = M.mean(LAB.col(rows, 'glu')), sG = M.sd(LAB.col(rows, 'glu')) || 1;
    const X = rows.map(r => [(r.bmi - mB) / sB, (r.glu - mG) / sG]), Y = rows.map(r => r.dm);
    const r0 = LAB.rng(200 + p.init), W0 = {}; NAMES.forEach(k => { W0[k] = Math.round((r0() * 2 - 1) * 10) / 10 || 0.1; });
    let W = Object.assign({}, W0); const epochs = [], first = [];
    for (let e = 0; e < p.epochs; e++) {
      let tot = 0;
      for (let i = 0; i < X.length; i++) {
        const F = forward(W, X[i]), L = bce(Y[i], F.yh), G = grads(W, X[i], Y[i], F), W2 = step(W, G.g, p.lr);
        if (e === 0) first.push({ i, W, F, L, G, W2, after: forward(W2, X[i]) });
        tot += L; W = W2;
      }
      epochs.push({ loss: tot / X.length, W });
    }
    const pred = X.map(x => forward(W, x).yh), acc = pred.filter((v, i) => (v >= 0.5 ? 1 : 0) === Y[i]).length / X.length;
    return { mB, sB, mG, sG, X, Y, W0, W, epochs, first, pred, acc };
  }

  LAB.register({
    id: 'F1', group: 'F', title: '神經網路：前向與反向傳播',
    module: { name: 'M5 第 03 節', url: '../m5/#p03' },
    goal: '看懂一個 2-2-1 的小網路怎麼算出預測（前向），再怎麼把誤差一層層往回傳、算出每個權重該調多少（反向）。',
    data: {
      name: 'clinic', scenario: '門診健檢：用 BMI 與空腹血糖預測是否有糖尿病',
      columns: COLS, editable: ['bmi', 'glu', 'dm'],
      small: seed => LAB.data.clinic(seed, 8).map(pick)
    },
    params: [
      { key: 'lr', label: '學習率 η', type: 'num', min: 0.1, max: 2, step: 0.1, value: 0.5 },
      { key: 'epochs', label: '訓練輪數', type: 'int', min: 10, max: 200, step: 10, value: 50 },
      { key: 'init', label: '起始權重（第幾組）', type: 'int', min: 1, max: 5, step: 1, value: 1 }
    ],
    pseudo: [
      '特徵標準化；權重先設成小的隨機數',
      '重複很多輪，每一輪逐筆處理：',
      '  前向：輸入 → 隱藏層 → 輸出 ŷ',
      '  算損失：ŷ 和正確答案差多少',
      '  反向：從輸出往回算每個權重的梯度',
      '  更新：權重 ← 權重 − η × 梯度',
      '輸出訓練好的權重'
    ],

    build(rows, p) {
      const R = train(rows, p), steps = [], n = rows.length, lossHist = [];
      /* s：{W, x, h, yh 節點要顯示的值（null＝還沒算）, on 作用中的邊, back 是否反向, g 要顯示的梯度, hot 要強調的節點, W2 更新後權重, y 正確答案} */
      function views(s) {
        const W = s.W, on = new Set(s.on || []), hot = new Set(s.hot || []);
        const node = (id, label, value, sub) => ({ id, label, value, sub, hl: hot.has(id), cls: id === 'o' && s.yh != null ? (s.yh >= 0.5 ? 'c1' : 'c0') : null });
        const net = {
          type: 'network', slot: 'main', h: 370, layerLabels: ['輸入層', '隱藏層（sigmoid）', '輸出層（sigmoid）'],
          layers: [[node('x1', 'x₁ BMI', s.x ? s.x[0] : null), node('x2', 'x₂ 血糖', s.x ? s.x[1] : null)],
            [node('h1', 'h₁', s.h ? s.h[0] : null, 'b₁ ' + f(W.b1, 2)), node('h2', 'h₂', s.h && s.h[1] != null ? s.h[1] : null, 'b₂ ' + f(W.b2, 2))],
            [node('o', 'ŷ', s.yh, 'b₀ ' + f(W.bo, 2))]],
          edges: Object.keys(EDGE).map(k => ({ from: EDGE[k][0], to: EDGE[k][1], w: W[k], active: on.has(k), back: !!s.back, grad: s.g && s.g[k] != null ? s.g[k] : null, at: 0.24, gat: 0.66 })),
          legend: [{ cls: 'c0', shape: 'line', label: '正的權重' }, { cls: 'c4', shape: 'line', label: '負的權重' }, { cls: 'c1', shape: 'line', label: '∂＝梯度（反向時出現）' }]
        };
        const tbl = {
          type: 'table', slot: 'side', title: '九個可調的數字（權重與偏差）',
          cols: [{ key: 'n', label: '參數' }, { key: 'w', label: '目前值', num: true, digits: 3 }, { key: 'g', label: '梯度', num: true, digits: 3 }, { key: 'u', label: '更新後', num: true, digits: 3 }],
          rows: NAMES.map(k => ({ id: k, hl: on.has(k) || (s.gHot || []).indexOf(k) >= 0, cells: [LABEL[k], W[k], s.g && s.g[k] != null ? s.g[k] : null, s.W2 ? { v: s.W2[k], cls: 'new' } : null] })), hlCol: s.W2 ? 'u' : s.g ? 'g' : null
        };
        const ymax = Math.max(0.8, R.epochs[0].loss * 1.15);
        const line = { type: 'line', slot: 'bottom', title: '每一輪的平均損失（越低表示預測越接近答案）', h: 190, axes: { x: { label: '第幾輪', min: 1, max: p.epochs }, y: { label: '損失', min: 0, max: ymax } }, series: [{ id: 'loss', label: '損失', pts: lossHist.map(v => [v[0], Math.min(ymax, v[1])]), cls: 'hl' }] };
        return [net, tbl, line];
      }
      const add = (line, title, say, calc, s, phase, focus) => steps.push({ line, title, say, calc: calc || [], phase, views: views(s), focus: focus || [] });

      const A = R.first[0], x = R.X[0], y = R.Y[0], r1 = rows[0], F = A.F, G = A.G, W = R.W0;
      const st = { W };
      add(0, '題目', '用 ' + n + ' 位病人訓練一個很小的神經網路：2 個輸入、2 個隱藏神經元、1 個輸出。它總共只有 9 個可以調的數字。', [], st);
      add(1, '標準化與起始權重', '輸入先換成 Z 分數。9 個權重一開始是隨便給的小數字，所以這時的預測跟亂猜差不多。訓練就是慢慢把它們調對。', ['BMI：平均 ' + f(R.mB, 2) + '，標準差 ' + f(R.sB, 2), '血糖：平均 ' + f(R.mG, 2) + '，標準差 ' + f(R.sG, 2)], st);

      const ph = '第 1 輪 · 第 1 筆';
      st.x = x; st.hot = ['x1', 'x2'];
      add(3, '前向 1：放入輸入', '先看 ' + r1.id + ' 號病人（正確答案：' + (y ? '有' : '沒有') + '糖尿病）。把他的兩個 Z 分數放進輸入層。', ['x₁ = (' + r1.bmi + ' − ' + f(R.mB, 2) + ') ÷ ' + f(R.sB, 2) + ' = ' + f(x[0], 2), 'x₂ = (' + r1.glu + ' − ' + f(R.mG, 2) + ') ÷ ' + f(R.sG, 2) + ' = ' + f(x[1], 2)], st, ph, [r1.id]);
      st.h = [F.h1, null]; st.on = ['w11', 'w21']; st.hot = ['h1'];
      add(3, '前向 2：算 h₁', '每個輸入乘上自己的權重、加總、再加偏差，得到 z₁；通過 sigmoid 壓到 0 到 1 之間，就是 h₁。', ['z₁ = ' + f(W.w11, 2) + '×' + f(x[0], 2) + ' + ' + f(W.w21, 2) + '×' + f(x[1], 2) + ' + ' + f(W.b1, 2) + ' = ' + f(F.z1, 3), 'h₁ = σ(z₁) = 1 ÷ (1 + e^(−z₁)) = ' + f(F.h1, 3)], st, ph, [r1.id]);
      st.h = [F.h1, F.h2]; st.on = ['w12', 'w22']; st.hot = ['h2'];
      add(3, '前向 3：算 h₂', '第二個隱藏神經元做一樣的事，只是用它自己的那組權重。', ['z₂ = ' + f(W.w12, 2) + '×' + f(x[0], 2) + ' + ' + f(W.w22, 2) + '×' + f(x[1], 2) + ' + ' + f(W.b2, 2) + ' = ' + f(F.z2, 3), 'h₂ = σ(z₂) = ' + f(F.h2, 3)], st, ph, [r1.id]);
      st.yh = F.yh; st.on = ['v1', 'v2']; st.hot = ['o'];
      add(3, '前向 4：算輸出 ŷ', '輸出神經元把 h₁、h₂ 再加權一次。ŷ 就是模型認為「有糖尿病」的機率。', ['z = ' + f(W.v1, 2) + '×' + f(F.h1, 3) + ' + ' + f(W.v2, 2) + '×' + f(F.h2, 3) + ' + ' + f(W.bo, 2) + ' = ' + f(F.zo, 3), 'ŷ = σ(z) = ' + f(F.yh, 3)], st, ph, [r1.id]);
      st.on = [];
      add(4, '算損失', '正確答案 y = ' + y + '，模型說 ' + f(F.yh, 3) + '。損失把「差多少」變成一個數字：猜得越離譜，損失越大。', ['L = −[ y·ln ŷ + (1 − y)·ln(1 − ŷ) ]', '  = −ln(' + f(y ? F.yh : 1 - F.yh, 3) + ') = ' + f(A.L, 3)], st, ph, [r1.id]);
      st.back = true; st.hot = ['o'];
      add(5, '反向 1：輸出的誤差', '反向傳播從輸出開始。輸出端的誤差訊號很單純：預測減答案。' + (G.dO > 0 ? '正值表示預測偏高。' : '負值表示預測偏低。'), ['δ₀ = ŷ − y = ' + f(F.yh, 3) + ' − ' + y + ' = ' + f(G.dO, 3)], st, ph, [r1.id]);
      st.g = { v1: G.g.v1, v2: G.g.v2, bo: G.g.bo }; st.on = ['v1', 'v2']; st.gHot = ['bo'];
      add(5, '反向 2：輸出層的梯度', '一條連線的梯度 ＝ 終點的誤差 × 起點送出的值。梯度告訴我們：這個權重往上調一點，損失會增加多少。', ['∂L/∂v₁ = δ₀ × h₁ = ' + f(G.dO, 3) + ' × ' + f(F.h1, 3) + ' = ' + f(G.g.v1, 3), '∂L/∂v₂ = δ₀ × h₂ = ' + f(G.dO, 3) + ' × ' + f(F.h2, 3) + ' = ' + f(G.g.v2, 3), '∂L/∂b₀ = δ₀ = ' + f(G.g.bo, 3)], st, ph, [r1.id]);
      st.hot = ['h1', 'h2']; st.gHot = [];
      add(5, '反向 3：誤差傳回隱藏層', '輸出的誤差沿著 v₁、v₂ 往回傳，再乘上 sigmoid 的斜率 h(1 − h)。這就是連鎖律。', ['δ₁ = δ₀ × v₁ × h₁(1 − h₁) = ' + f(G.dO, 3) + ' × ' + f(W.v1, 2) + ' × ' + f(F.h1 * (1 - F.h1), 3) + ' = ' + f(G.d1, 4), 'δ₂ = δ₀ × v₂ × h₂(1 − h₂) = ' + f(G.dO, 3) + ' × ' + f(W.v2, 2) + ' × ' + f(F.h2 * (1 - F.h2), 3) + ' = ' + f(G.d2, 4)], st, ph, [r1.id]);
      st.g = G.g; st.on = ['w11', 'w21', 'w12', 'w22']; st.gHot = ['b1', 'b2']; st.hot = [];
      add(5, '反向 4：隱藏層的梯度', '規則一樣：終點的誤差 × 起點的值。到這裡，9 個參數的梯度都有了。', ['∂L/∂w₁₁ = δ₁ × x₁ = ' + f(G.d1, 4) + ' × ' + f(x[0], 2) + ' = ' + f(G.g.w11, 4), '∂L/∂w₂₁ = δ₁ × x₂ = ' + f(G.g.w21, 4), '∂L/∂w₁₂ = δ₂ × x₁ = ' + f(G.g.w12, 4), '∂L/∂w₂₂ = δ₂ × x₂ = ' + f(G.g.w22, 4)], st, ph, [r1.id]);
      st.W2 = A.W2; st.on = []; st.gHot = NAMES;
      add(6, '更新權重', '每個參數都往「讓損失變小」的方向走一小步，步伐大小由學習率 η = ' + f(p.lr, 1) + ' 決定。', ['新 v₁ = ' + f(W.v1, 2) + ' − ' + f(p.lr, 1) + ' × ' + f(G.g.v1, 3) + ' = ' + f(A.W2.v1, 3), '新 w₁₁ = ' + f(W.w11, 2) + ' − ' + f(p.lr, 1) + ' × ' + f(G.g.w11, 4) + ' = ' + f(A.W2.w11, 3), '其餘 7 個做法相同（見右表）'], st, ph, [r1.id]);
      const st2 = { W: A.W2, x, h: [A.after.h1, A.after.h2], yh: A.after.yh, hot: ['o'], on: ['v1', 'v2'] };
      add(3, '再算一次看看', '用更新後的權重，把同一位病人再前向算一次：預測往正確答案靠近了一點，損失也變小。', ['ŷ：' + f(F.yh, 3) + ' → ' + f(A.after.yh, 3) + '（答案是 ' + y + '）', '損失：' + f(A.L, 3) + ' → ' + f(bce(y, A.after.yh), 3)], st2, ph, [r1.id]);

      R.first.slice(1).forEach(a => {
        const r = rows[a.i];
        add(6, '第 ' + (a.i + 1) + ' 筆：' + r.id + ' 號', '同樣四個動作：前向、算損失、反向、更新。之後每一筆都這樣做，不再逐步展開。', ['ŷ = ' + f(a.F.yh, 3) + '（答案 ' + R.Y[a.i] + '），損失 ' + f(a.L, 3), '更新後再算：ŷ = ' + f(a.after.yh, 3)],
          { W: a.W2, x: R.X[a.i], h: [a.after.h1, a.after.h2], yh: a.after.yh, g: a.G.g, hot: ['o'] }, '第 1 輪 · 第 ' + (a.i + 1) + ' 筆', [r.id]);
      });
      const E = R.epochs, show = [];
      for (let e = 0; e < E.length; e++) if (e < 5 || (e + 1) % Math.max(5, Math.round(p.epochs / 20 / 5) * 5) === 0 || e === E.length - 1) show.push(e);
      let lastShown = -1;
      show.forEach(e => {
        for (let k = lastShown + 1; k <= e; k++) lossHist.push([k + 1, E[k].loss]); lastShown = e;
        add(2, '第 ' + (e + 1) + ' 輪結束', e === 0 ? '所有病人都看過一次，叫做一輪（epoch）。把這一輪每筆的損失平均，畫在下方的曲線上。' : '再把所有病人看過一遍。損失持續下降，表示權重越調越對。', ['平均損失 = ' + f(E[e].loss, 4)].concat(e ? ['比第 1 輪減少 ' + f(E[0].loss - E[e].loss, 4)] : []), { W: E[e].W }, '第 ' + (e + 1) + ' 輪');
      });
      const wrong = rows.filter((r, i) => (R.pred[i] >= 0.5 ? 1 : 0) !== R.Y[i]).map(r => r.id + ' 號');
      add(7, '訓練完成', '用最後的權重預測這 ' + n + ' 位病人，ŷ ≥ 0.5 判為「是」。' + (wrong.length ? '判錯的是 ' + wrong.join('、') + '。' : '全部判對。'), ['訓練資料正確率 = ' + f(R.acc * 100, 0) + '%', '最後一輪平均損失 = ' + f(E[E.length - 1].loss, 4)].concat(rows.slice(0, 3).map((r, i) => r.id + ' 號：ŷ = ' + f(R.pred[i], 3) + '（答案 ' + R.Y[i] + '）')), { W: R.W });
      return steps;
    },

    /* 由亂數決定、Python 無法重現的起始條件：交給驗證程式當輸入 */
    inputs(rows, p) { return { W0: train(rows, p).W0 }; },

    keys(steps, rows, p) {
      const R = train(rows, p), A = R.first[0], o = { x1: R.X[0][0], x2: R.X[0][1], z1: A.F.z1, h1: A.F.h1, z2: A.F.z2, h2: A.F.h2, zo: A.F.zo, yhat: A.F.yh, loss: A.L, d_o: A.G.dO, d_1: A.G.d1, d_2: A.G.d2, yhat_after: A.after.yh, loss_epoch1: R.epochs[0].loss, loss_final: R.epochs[R.epochs.length - 1].loss, acc: R.acc };
      NAMES.forEach(k => { o['init_' + k] = R.W0[k]; o['g_' + k] = A.G.g[k]; o['new_' + k] = A.W2[k]; o['final_' + k] = R.W[k]; });
      return o;
    },

    explain(steps, rows, p) {
      const R = train(rows, p), E = R.epochs, A = R.first[0];
      const lo = train(rows, Object.assign({}, p, { lr: 0.1 })).epochs, hi = train(rows, Object.assign({}, p, { lr: 2 })).epochs;
      return [
        '前向傳播只是「加權總和 → sigmoid」做三次；第一筆的預測從 ' + f(A.F.yh, 3) + ' 開始，更新一次後變成 ' + f(A.after.yh, 3) + '。',
        '反向傳播的規則只有一條：一條連線的梯度 ＝ 終點的誤差 × 起點的值；誤差再沿著權重往回傳。網路再深，也是同一條規則重複使用。',
        '訓練 ' + p.epochs + ' 輪後，平均損失從 ' + f(E[0].loss, 3) + ' 降到 ' + f(E[E.length - 1].loss, 3) + '，訓練資料正確率 ' + f(R.acc * 100, 0) + '%。',
        '同樣的輪數，學習率 0.1 時最後損失是 ' + f(lo[lo.length - 1].loss, 3) + '，學習率 2 時是 ' + f(hi[hi.length - 1].loss, 3) + '。太小學得慢，太大可能來回震盪。',
        '這裡只有 ' + rows.length + ' 筆資料、而且拿訓練資料算正確率，數字會偏樂觀；真正評估要用沒看過的資料（見 M5 第 10、11 節）。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Set Role', 'Neural Net', 'Apply Model', 'Performance'],
      params: [
        ['Set Role › dm', 'label'], ['Set Role › id', 'id'],
        ['Neural Net › hidden layers', '1 層，size = 2'], ['Neural Net › training cycles', p => String(p.epochs)],
        ['Neural Net › learning rate', p => f(p.lr, 1)], ['Neural Net › momentum', '0'], ['Neural Net › normalize', '勾選']
      ],
      note: 'AI Studio 的起始權重是它自己隨機產生的，而且它的正規化是把數值縮到 −1 到 1（不是 Z 分數），所以權重數值不會和這裡相同。請比對的是：訓練後的預測方向是否一致、正確率是否相近。點開模型可以看到每條連線的權重。',
      expect: (steps, rows, p) => { const R = train(rows, p); return ['訓練資料 accuracy 接近 ' + f(R.acc * 100, 0) + '%（資料很少，可能差一、兩筆）', '模型檢視畫面：2 個輸入節點、2 個隱藏節點、輸出節點，與這裡的結構相同']; },
      python: 'from sklearn.neural_network import MLPClassifier\nfrom sklearn.preprocessing import StandardScaler\nZ = StandardScaler().fit_transform(df[["bmi", "glu"]])\nm = MLPClassifier(hidden_layer_sizes=(2,), activation="logistic",\n                  solver="sgd", learning_rate_init=0.5, batch_size=1,\n                  momentum=0, max_iter=50, shuffle=False).fit(Z, df["dm"])\nm.coefs_, m.intercepts_, m.score(Z, df["dm"])',
      confirmed: false
    }
  });
})();
