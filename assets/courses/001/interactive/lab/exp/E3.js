/* E3 Word2Vec */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = LAB.data.columns('notes', ['text', 'label'], { label: 'y' });
  const STOP_SET = new Set(LAB.data.stop);
  const DICT_SET = new Set(LAB.data.dict);

  function fmmTokenize(text) {
    const tokens = [];
    let i = 0;
    while (i < text.length) {
      let matched = null;
      for (let len = Math.min(4, text.length - i); len >= 2; len--) {
        const sub = text.slice(i, i + len);
        if (DICT_SET.has(sub)) { matched = sub; break; }
      }
      if (matched) { tokens.push(matched); i += matched.length; }
      else { tokens.push(text[i]); i += 1; }
    }
    return tokens.filter(t => !STOP_SET.has(t));
  }

  function runW2V(rows, p) {
    const docs = rows.map(r => fmmTokenize(r.text));
    const vocabSet = new Set();
    docs.forEach(d => d.forEach(t => vocabSet.add(t)));
    const vocab = Array.from(vocabSet).sort();
    const V = vocab.length;
    const idxOf = {};
    vocab.forEach((w, i) => { idxOf[w] = i; });

    const win = Math.max(1, Math.min(3, Math.round(p.win || 2)));
    const pairs = [];
    docs.forEach(d => {
      for (let i = 0; i < d.length; i++) {
        for (let off = -win; off <= win; off++) {
          if (off === 0 || i + off < 0 || i + off >= d.length) continue;
          pairs.push([idxOf[d[i]], idxOf[d[i + off]]]);
        }
      }
    });

    const rng = LAB.rng(3300 + win * 17 + Math.round((p.lr || 0.08) * 100));
    const Win0 = M.range(V, () => [(rng() - 0.5) * 0.8, (rng() - 0.5) * 0.8]);
    const Wout0 = M.range(V, () => [(rng() - 0.5) * 0.8, (rng() - 0.5) * 0.8]);

    const epochs = Math.max(20, Math.min(200, Math.round(p.epochs || 60)));
    const lr = p.lr || 0.08;
    const negK = 2;

    // 預先產生全部負樣本序列（deterministic）
    const negSamples = [];
    for (let ep = 0; ep < epochs; ep++) {
      const epNegs = [];
      for (let pi = 0; pi < pairs.length; pi++) {
        const [, o] = pairs[pi];
        const ns = [];
        for (let k = 0; k < negK; k++) {
          let nk = Math.floor(rng() * V);
          if (nk === o) nk = (nk + 1) % V;
          ns.push(nk);
        }
        epNegs.push(ns);
      }
      negSamples.push(epNegs);
    }

    const Win = Win0.map(v => v.slice());
    const Wout = Wout0.map(v => v.slice());
    let firstWin = null;
    const snaps = [{ ep: 0, Win: Win.map(v => v.slice()), loss: 0 }];

    for (let ep = 0; ep < epochs; ep++) {
      let totLoss = 0;
      for (let pi = 0; pi < pairs.length; pi++) {
        const [c, o] = pairs[pi];
        const ns = negSamples[ep][pi];
        const vc = Win[c].slice();
        const gIn = [0, 0];

        // 正樣本
        const vo = Wout[o];
        const sPos = vc[0] * vo[0] + vc[1] * vo[1];
        const pPos = M.sigmoid(sPos);
        totLoss -= Math.log(Math.max(pPos, 1e-12));
        const gPos = pPos - 1;
        gIn[0] += gPos * vo[0]; gIn[1] += gPos * vo[1];
        vo[0] -= lr * gPos * vc[0]; vo[1] -= lr * gPos * vc[1];

        // 負樣本
        ns.forEach(nk => {
          const vn = Wout[nk];
          const sNeg = vc[0] * vn[0] + vc[1] * vn[1];
          const pNeg = M.sigmoid(sNeg);
          totLoss -= Math.log(Math.max(1 - pNeg, 1e-12));
          const gNeg = pNeg;
          gIn[0] += gNeg * vn[0]; gIn[1] += gNeg * vn[1];
          vn[0] -= lr * gNeg * vc[0]; vn[1] -= lr * gNeg * vc[1];
        });

        Win[c][0] -= lr * gIn[0];
        Win[c][1] -= lr * gIn[1];

        if (ep === 0 && pi === 0) firstWin = Win.map(v => v.slice());
      }
      const avgLoss = totLoss / (pairs.length || 1);
      if (ep === 0) snaps[0].loss = avgLoss;
      if (ep === 0 || (ep + 1) % Math.max(1, Math.floor(epochs / 8)) === 0 || ep === epochs - 1) {
        snaps.push({ ep: ep + 1, Win: Win.map(v => v.slice()), loss: avgLoss });
      }
    }

    // 找目標詞（「疼痛」或詞表第 0 個）的餘弦相似度排名
    const targetIdx = idxOf['疼痛'] != null ? idxOf['疼痛'] : 0;
    const tv = Win[targetIdx];
    const tNorm = Math.hypot(tv[0], tv[1]) || 1;
    const sims = vocab.map((w, i) => {
      const v = Win[i], nrm = Math.hypot(v[0], v[1]) || 1;
      return { w, i, sim: (tv[0] * v[0] + tv[1] * v[1]) / (tNorm * nrm) };
    }).filter(x => x.i !== targetIdx).sort((a, b) => b.sim - a.sim);

    return { docs, vocab, V, pairs, Win0, Wout0, negSamples, firstWin, Win, snaps, targetIdx, targetWord: vocab[targetIdx], sims };
  }

  LAB.register({
    id: 'E3', group: 'E', title: 'Word2Vec',
    module: { name: 'M6 第 20 節', url: '../m6/#p20' },
    goal: '看懂 Skip-gram＋負抽樣如何從語料滑動視窗產生詞對，透過「拉近共現詞、推開隨機負樣本」學出二維詞向量。',
    data: {
      name: 'notes_w2v',
      scenario: '護理紀錄：12 句斷詞後用滑動視窗訓練 2D Skip-gram 詞向量（小語料僅示意）',
      columns: COLS,
      small: seed => LAB.data.notes(seed, 12)
    },
    params: [
      { key: 'win', label: '視窗大小', type: 'int', min: 1, max: 3, step: 1, value: 2 },
      { key: 'epochs', label: '訓練輪數', type: 'int', min: 20, max: 200, step: 20, value: 60 },
      { key: 'lr', label: '學習率 η', type: 'num', min: 0.02, max: 0.2, step: 0.02, value: 0.08 }
    ],
    pseudo: [
      '斷詞並建立詞表',
      '以滑動視窗產生 (中心詞, 上下文) 配對',
      '每個詞隨機初始化 2D 向量',
      '對每組配對做 Skip-gram＋負抽樣：',
      '  算內積與 sigmoid，更新向量',
      '  正樣本拉近、負樣本推開',
      '查詢指定詞的餘弦相似詞'
    ],
    build(rows, p) {
      const R = runW2V(rows, p), steps = [];
      const showWords = R.vocab.slice(0, 14);
      const allX = R.snaps.reduce((a, s) => a.concat(showWords.map((_, i) => s.Win[i][0])), []);
      const allY = R.snaps.reduce((a, s) => a.concat(showWords.map((_, i) => s.Win[i][1])), []);
      const bnd = Math.max(1.5, Math.ceil(Math.max(M.max(allX.map(Math.abs)), M.max(allY.map(Math.abs))) * 1.15));
      const AX = { x: { label: '維度 1', min: -bnd, max: bnd }, y: { label: '維度 2', min: -bnd, max: bnd } };

      function views(st) {
        const points = showWords.map((w, i) => ({
          id: 'w' + i, x: st.Win[i][0], y: st.Win[i][1],
          cls: i === st.hlA ? 'hl' : (i === st.hlB ? 'c1' : (i === R.targetIdx && st.done ? 'c1' : 'c0')),
          hl: i === st.hlA || i === st.hlB,
          label: w, r: 6
        }));
        const lines = [];
        if (st.hlA >= 0 && st.hlB >= 0 && st.hlA < showWords.length && st.hlB < showWords.length) {
          lines.push({ id: 'pair', x1: st.Win[st.hlA][0], y1: st.Win[st.hlA][1], x2: st.Win[st.hlB][0], y2: st.Win[st.hlB][1], cls: 'hl', dash: true, w: 2 });
        } else if (st.done && R.targetIdx < showWords.length) {
          R.sims.slice(0, 2).forEach((s, idx) => {
            if (s.i < showWords.length) {
              lines.push({ id: 'sim' + idx, x1: st.Win[R.targetIdx][0], y1: st.Win[R.targetIdx][1], x2: st.Win[s.i][0], y2: st.Win[s.i][1], cls: 'c1', dash: true, w: 1.8 });
            }
          });
        }
        const main = {
          type: 'scatter', slot: 'main',
          title: '2D 詞向量空間（前 14 個詞）',
          axes: AX, points, lines, circles: [],
          legend: [{ cls: 'hl', label: '目前中心詞' }, { cls: 'c1', label: '上下文／目標詞' }]
        };
        const side = st.done ? {
          type: 'table', slot: 'side',
          title: '與「' + R.targetWord + '」最相近的詞',
          cols: [{ key: 'w', label: '詞彙' }, { key: 'sim', label: '餘弦相似度', num: true, digits: 3 }],
          rows: R.sims.slice(0, 6).map((x, idx) => ({ id: 's' + idx, cells: [x.w, x.sim], hl: idx < 2 }))
        } : {
          type: 'table', slot: 'side',
          title: '滑動視窗配對預覽',
          cols: [{ key: 'idx', label: '#' }, { key: 'c', label: '中心詞' }, { key: 'o', label: '上下文詞' }],
          rows: R.pairs.slice(0, 6).map((pr, idx) => ({
            id: 'p' + idx, cells: [idx + 1, R.vocab[pr[0]], R.vocab[pr[1]]], hl: idx === st.pairIdx
          }))
        };
        const line = {
          type: 'line', slot: 'bottom',
          title: '負抽樣平均損失',
          axes: { x: { label: 'Epoch', min: 0, max: p.epochs }, y: { label: 'Loss', min: 0, max: Math.max(2.5, R.snaps[0].loss * 1.1) } },
          series: [{ id: 'loss', label: 'Loss', pts: st.lossPts, cls: 'c1', dots: true }],
          marker: st.lossPts.length ? { x: st.lossPts[st.lossPts.length - 1][0], y: st.lossPts[st.lossPts.length - 1][1], label: '目前' } : null
        };
        return [main, side, line];
      }

      const st = { Win: R.Win0, hlA: -1, hlB: -1, pairIdx: -1, lossPts: [[0, R.snaps[0].loss]], done: false };
      const add = (line, title, say, calc, extra) => steps.push(Object.assign({ line, title, say, calc: calc || [], views: views(st), focus: [] }, extra));

      add(0, '題目', '「語意相近的詞常出現在相似的上下文」。用 12 句護理紀錄訓練 2D Word2Vec（小語料僅供示意）。', [
        '詞表共 ' + R.V + ' 詞，視窗 ±' + p.win + ' 共產生 ' + R.pairs.length + ' 組配對'
      ]);

      for (let i = 0; i < Math.min(3, R.pairs.length); i++) {
        st.pairIdx = i; st.hlA = R.pairs[i][0]; st.hlB = R.pairs[i][1];
        add(2, '滑動視窗配對 #' + (i + 1), '中心詞「' + R.vocab[st.hlA] + '」在視窗內看到上下文「' + R.vocab[st.hlB] + '」，組成一筆正樣本。', [
          '配對 #' + (i + 1) + '：(' + R.vocab[st.hlA] + ', ' + R.vocab[st.hlB] + ')'
        ]);
      }

      st.pairIdx = 0; st.Win = R.firstWin; st.hlA = R.pairs[0][0]; st.hlB = R.pairs[0][1];
      add(5, '第 1 組配對向量更新', '對第一組正樣本與 2 個隨機負樣本算 sigmoid 梯度，把正樣本拉近、負樣本推開。', [
        R.vocab[st.hlA] + ' 向量更新為 (' + f(st.Win[st.hlA][0], 3) + ', ' + f(st.Win[st.hlA][1], 3) + ')'
      ]);

      st.hlA = -1; st.hlB = -1; st.pairIdx = -1;
      for (let k = 1; k < R.snaps.length; k++) {
        const sn = R.snaps[k];
        st.Win = sn.Win;
        st.lossPts = R.snaps.slice(0, k + 1).map(x => [x.ep, x.loss]);
        add(6, '訓練至第 ' + sn.ep + ' 輪', '反覆掃描全部配對更新向量，損失逐步下降，共現詞在平面上慢慢靠近。', [
          'Epoch ' + sn.ep + ' / ' + p.epochs + '｜平均 Loss = ' + f(sn.loss, 3)
        ], { phase: sn.ep + ' / ' + p.epochs });
      }

      st.done = true; st.Win = R.Win;
      add(7, '查詢最相近的詞', '訓練完成！計算「' + R.targetWord + '」與其他詞向量的餘弦相似度，列出最相近的前幾名。', [
        '「' + R.targetWord + '」最相近：' + R.sims.slice(0, 3).map(x => x.w + '(' + f(x.sim, 2) + ')').join('、')
      ]);

      while (steps.length < 10) {
        add(7, '小語料與真實嵌入', '真實 Word2Vec 需要數百萬句語料與 100–300 維向量；這裡用 12 句與 2D 讓你看懂它的訓練機制。', [
          '配對數 = ' + R.pairs.length + '，最終 Loss = ' + f(R.snaps[R.snaps.length - 1].loss, 3)
        ]);
      }
      return steps;
    },

    inputs(rows, p) {
      const R = runW2V(rows, p);
      return { vocab: R.vocab, pairs: R.pairs, win0: R.Win0, wout0: R.Wout0, neg_samples: R.negSamples };
    },

    keys(steps, rows, p) {
      const R = runW2V(rows, p);
      const k = {
        n_pairs: R.pairs.length,
        first_w0_x: R.firstWin[R.pairs[0][0]][0],
        first_w0_y: R.firstWin[R.pairs[0][0]][1],
        final_loss: R.snaps[R.snaps.length - 1].loss
      };
      for (let i = 0; i < Math.min(5, R.V); i++) {
        k['vec_' + i + '_x'] = R.Win[i][0];
        k['vec_' + i + '_y'] = R.Win[i][1];
      }
      R.sims.slice(0, 3).forEach((s, idx) => { k['top_sim_' + idx] = s.sim; });
      return k;
    },

    explain(steps, rows, p) {
      const R = runW2V(rows, p);
      return [
        '12 句護理紀錄在視窗 ±' + p.win + ' 下共產生 ' + R.pairs.length + ' 組 (中心詞, 上下文) 配對。',
        '經 ' + p.epochs + ' 輪 Skip-gram＋負抽樣訓練後，平均損失收斂至 ' + f(R.snaps[R.snaps.length - 1].loss, 3) + '。',
        '與「' + R.targetWord + '」餘弦最相近的詞為 ' + R.sims.slice(0, 3).map(x => x.w + ' (' + f(x.sim, 2) + ')').join('、') + '。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Word2Vec'],
      params: [
        ['Word2Vec › 視窗大小', p => String(p.win)],
        ['Word2Vec › layer size (dim)', '2']
      ],
      note: 'AI Studio 的 Word2Vec 來自 Word2Vec 擴充套件；Python 驗證依 inputs() 提供的起始向量與負樣本序列以 numpy 獨立重算 SGNS。',
      expect: (steps, rows, p) => {
        const R = runW2V(rows, p);
        return ['產生 ' + R.pairs.length + ' 組訓練配對，最終 Loss = ' + f(R.snaps[R.snaps.length - 1].loss, 3)];
      },
      python: `from gensim.models import Word2Vec\n# 小語料不具統計代表性，Python 驗證以 numpy 依相同 SGNS 負抽樣序列獨立重算`,
      confirmed: false
    }
  });
})();
