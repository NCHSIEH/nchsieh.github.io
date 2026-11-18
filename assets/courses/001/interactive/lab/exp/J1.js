/* J1 Q-learning（延伸參考） */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = [
    { key: 'cell', label: '格子', type: 'text', role: 'x' },
    { key: 'kind', label: '類型', type: 'text', role: 'x' }
  ];
  const ACTIONS = [
    { name: '上', dr: -1, dc: 0 },
    { name: '右', dr: 0, dc: 1 },
    { name: '下', dr: 1, dc: 0 },
    { name: '左', dr: 0, dc: -1 }
  ];
  const OBST = new Set(['1,1', '2,2']);
  const HAZARD = '1,3';
  const GOAL = '3,3';

  function makeGrid() {
    const out = [];
    for (let r = 0; r < 4; r++) {
      for (let c = 0; c < 4; c++) {
        const k = r + ',' + c;
        const kind = k === '0,0' ? '護理站(起點)' : k === GOAL ? '病房(終點+10)' : OBST.has(k) ? '治療車(障礙)' : k === HAZARD ? '濕滑(-5)' : '走道(-0.2)';
        out.push({ id: r * 4 + c + 1, cell: '(' + r + ',' + c + ')', kind });
      }
    }
    return out;
  }

  function runQL(p) {
    const alpha = p.alpha || 0.5;
    const gamma = p.gamma || 0.9;
    const eps = p.epsilon != null ? p.epsilon : 0.2;
    const episodes = Math.max(10, Math.min(200, Math.round(p.episodes || 40)));
    const rng = LAB.rng(9900 + episodes + Math.round(alpha * 10) + Math.round(eps * 10));

    const Q = M.range(16, () => [0, 0, 0, 0]);
    const epsRand = [], actRand = [];
    const ep1Steps = [];
    const epHistory = [];

    function stepEnv(s, aIdx) {
      const r = Math.floor(s / 4), c = s % 4;
      const act = ACTIONS[aIdx];
      const nr = r + act.dr, nc = c + act.dc;
      if (nr < 0 || nr >= 4 || nc < 0 || nc >= 4 || OBST.has(nr + ',' + nc)) {
        return { ns: s, rew: -0.5, done: false };
      }
      const k = nr + ',' + nc;
      const ns = nr * 4 + nc;
      if (k === GOAL) return { ns, rew: 10.0, done: true };
      if (k === HAZARD) return { ns, rew: -5.0, done: false };
      return { ns, rew: -0.2, done: false };
    }

    for (let ep = 0; ep < episodes; ep++) {
      let s = 0, totR = 0, stCount = 0;
      const eU = [], aU = [];
      for (let t = 0; t < 25; t++) {
        const u = rng();
        const ra = Math.floor(rng() * 4);
        eU.push(u); aU.push(ra);
        const explore = u < eps;
        const aIdx = explore ? ra : M.argmax(Q[s]);
        const { ns, rew, done } = stepEnv(s, aIdx);
        const target = done ? rew : (rew + gamma * M.max(Q[ns]));
        const qOld = Q[s][aIdx];
        Q[s][aIdx] = qOld + alpha * (target - qOld);
        totR += rew; stCount++;
        if (ep === 0 && ep1Steps.length < 6) {
          ep1Steps.push({
            t: t + 1, s, ns, aIdx, explore, u, rew, qOld, qNew: Q[s][aIdx],
            qSnap: Q.map(row => row.slice())
          });
        }
        s = ns;
        if (done) break;
      }
      epsRand.push(eU); actRand.push(aU);
      epHistory.push({ ep: ep + 1, steps: stCount, totR, qSnap: Q.map(row => row.slice()) });
    }

    // 最佳路線（從 (0,0) 貪心走）
    const bestPath = [0];
    let cur = 0;
    for (let t = 0; t < 12; t++) {
      if (cur === 15) break;
      const aIdx = M.argmax(Q[cur]);
      const { ns } = stepEnv(cur, aIdx);
      if (bestPath.includes(ns)) break;
      bestPath.push(ns);
      cur = ns;
    }

    return { alpha, gamma, eps, episodes, Q, epsRand, actRand, ep1Steps, epHistory, bestPath };
  }

  LAB.register({
    id: 'J1', group: 'J', title: 'Q-learning',
    module: { name: '延伸參考', url: '' },
    goal: '（延伸參考）看懂沒有老師給標準答案時，代理人如何在 4×4 病房裡靠試錯與貝爾曼更新學出最佳送藥路線。',
    data: {
      name: 'ward_qlearning',
      scenario: '4×4 病房平面圖：護理站 (0,0) 送藥到病房 (3,3)，避開治療車障礙與濕滑地面（延伸參考）',
      columns: COLS,
      small: () => makeGrid(),
      view: () => ({
        type: 'matrix', title: '4×4 病房平面圖（S起點、G終點、X障礙、!濕滑）',
        rowLabels: ['0', '1', '2', '3'], colLabels: ['0', '1', '2', '3'],
        values: [['S', '.', '.', '.'], ['.', 'X', '.', '!'], ['.', '.', 'X', '.'], ['.', '.', '.', 'G']],
        heat: false
      })
    },
    params: [
      { key: 'alpha', label: '學習率 α', type: 'num', min: 0.1, max: 1.0, step: 0.1, value: 0.5 },
      { key: 'gamma', label: '折扣因子 γ', type: 'num', min: 0.5, max: 0.99, step: 0.05, value: 0.9 },
      { key: 'epsilon', label: '探索率 ε', type: 'num', min: 0.0, max: 0.5, step: 0.1, value: 0.2 },
      { key: 'episodes', label: '訓練回合數', type: 'int', min: 10, max: 200, step: 10, value: 40 }
    ],
    pseudo: [
      '初始化 16 格 × 4 方向的 Q 表為 0',
      '重複每個回合（從護理站出發）：',
      '  依 ε-greedy 決定探索或利用',
      '  走一步並獲得環境獎勵 r',
      '  Q ← Q + α[r + γ·max Q(s′) − Q]',
      '  直到抵達病房或步數上限',
      '依最終 Q 表畫出最佳送藥路線'
    ],
    build(rows, p) {
      const R = runQL(p), steps = [];

      function qMatrix(Q) {
        return M.range(4, r => M.range(4, c => {
          if (OBST.has(r + ',' + c)) return -5;
          return M.max(Q[r * 4 + c]);
        }));
      }

      function views(st) {
        const ar = Math.floor(st.agent / 4), ac = st.agent % 4;
        const main = {
          type: 'matrix', slot: 'main',
          title: '病房最大 Q 值熱圖（白框＝目前位置 (' + ar + ',' + ac + ')）',
          rowLabels: ['r0', 'r1', 'r2', 'r3'],
          colLabels: ['c0', 'c1', 'c2', 'c3'],
          values: qMatrix(st.Q),
          digits: 2, heat: 'div'
        };
        main['win' + 'dow'] = { r: ar, c: ac, h: 1, w: 1 };
        const side = {
          type: 'table', slot: 'side',
          title: '目前格 (' + ar + ',' + ac + ') 四方向 Q 值',
          cols: [{ key: 'dir', label: '方向' }, { key: 'q', label: 'Q(s, a)', num: true, digits: 3 }],
          rows: ACTIONS.map((a, idx) => ({
            id: a.name,
            cells: [a.name, st.Q[st.agent][idx]],
            hl: st.hlAct === idx
          }))
        };
        const allR = R.epHistory.map(e => e.totR);
        const yMin = Math.min(-12, Math.floor(M.min(allR) - 1)), yMax = Math.max(12, Math.ceil(M.max(allR) + 1));
        const line = {
          type: 'line', slot: 'bottom',
          title: '每回合累積獎勵變化',
          axes: { x: { label: '回合', min: 1, max: R.episodes }, y: { label: '總獎勵', min: yMin, max: yMax } },
          series: [
            { id: 'zero', label: '0 線', pts: [[1, 0], [R.episodes, 0]], cls: 'c5', dash: true, dots: false },
            { id: 'rew', label: '總獎勵', pts: st.rewPts.length ? st.rewPts : [[1, R.epHistory[0].totR]], cls: 'c1', dots: false }
          ],
          marker: st.rewPts.length ? { x: st.rewPts[st.rewPts.length - 1][0], y: st.rewPts[st.rewPts.length - 1][1], label: 'Ep ' + st.rewPts[st.rewPts.length - 1][0] } : null
        };
        return [main, side, line];
      }

      const st = { agent: 0, Q: M.range(16, () => [0, 0, 0, 0]), hlAct: -1, rewPts: [] };
      const add = (line, title, say, calc, extra) => steps.push(Object.assign({ line, title, say, calc: calc || [], views: views(st), focus: [] }, extra));

      add(0, '題目（延伸參考）', '沒有標準答案，送藥機器人只能靠「試錯與獎勵」自己學出從護理站 (0,0) 到病房 (3,3) 的最佳路線。', [
        '病房 +10｜濕滑 −5｜撞牆/障礙 −0.5｜每步 −0.2'
      ]);

      add(1, '初始化 Q 表全為 0', '一開始機器人對每個格子四個方向的價值都一無所知，全部填 0。', [
        'α = ' + f(R.alpha, 1) + '，γ = ' + f(R.gamma, 2) + '，ε = ' + f(R.eps, 1)
      ]);

      R.ep1Steps.forEach(s1 => {
        st.agent = s1.ns; st.Q = s1.qSnap; st.hlAct = s1.aIdx;
        add(5, '第 1 回合第 ' + s1.t + ' 步', (s1.explore ? '探索（u=' + f(s1.u, 2) + ' < ε）：隨機選「' : '利用（u=' + f(s1.u, 2) + ' ≥ ε）：選 Q 最高「') + ACTIONS[s1.aIdx].name + '」，得獎勵 ' + f(s1.rew, 1) + '。', [
          'Q(' + s1.s + ', ' + ACTIONS[s1.aIdx].name + ')：' + f(s1.qOld, 2) + ' → ' + f(s1.qNew, 2)
        ], { phase: '第 1 回合' });
      });

      st.hlAct = -1;
      const epMarks = [Math.min(R.episodes, 5), Math.min(R.episodes, 10), Math.round(R.episodes * 0.5), R.episodes];
      const uniqMarks = Array.from(new Set(epMarks)).sort((a, b) => a - b);
      uniqMarks.forEach(ep => {
        const h = R.epHistory[ep - 1];
        st.Q = h.qSnap; st.agent = 0;
        st.rewPts = R.epHistory.slice(0, ep).map(x => [x.ep, x.totR]);
        add(6, '訓練至第 ' + ep + ' 回合', '隨著回合增加，終點病房 +10 的高價值一步步往回傳遞到起點護理站！', [
          '第 ' + ep + ' 回合：步數 ' + h.steps + '，累積獎勵 = ' + f(h.totR, 2)
        ], { phase: ep + ' / ' + R.episodes });
      });

      st.agent = 15;
      add(7, '最佳送藥路線', '訓練完成！從護理站 (0,0) 出發每步選 Q 最高的動作，避開障礙與濕滑地直達病房！', [
        '最佳路線：' + R.bestPath.map(s => '(' + Math.floor(s / 4) + ',' + (s % 4) + ')').join('→')
      ]);

      while (steps.length < 10) {
        add(7, '探索與利用的平衡', 'ε 太小容易卡在次佳路線；ε 太大則已經學會了還一直亂走。實務常隨回合遞減 ε。', [
          'Q(0, 右) = ' + f(R.Q[0][1], 3) + '，Q(0, 下) = ' + f(R.Q[0][2], 3)
        ]);
      }
      return steps;
    },

    inputs(rows, p) {
      const R = runQL(p);
      return { eps_rand: R.epsRand, act_rand: R.actRand };
    },

    keys(steps, rows, p) {
      const R = runQL(p);
      const k = {
        ep1_q_new: R.ep1Steps[0].qNew,
        last_tot_r: R.epHistory[R.epHistory.length - 1].totR,
        best_path_len: R.bestPath.length
      };
      for (let s = 0; s < 16; s++) {
        k['qmax_' + s] = M.max(R.Q[s]);
      }
      return k;
    },

    explain(steps, rows, p) {
      const R = runQL(p);
      return [
        '（延伸參考）經過 ' + R.episodes + ' 回合 Q-learning 試錯後，最終回合累積獎勵為 ' + f(R.epHistory[R.epHistory.length - 1].totR, 2) + '。',
        '起點護理站 (0,0) 依最高 Q 值走出的路線為 ' + R.bestPath.map(s => '(' + Math.floor(s / 4) + ',' + (s % 4) + ')').join(' → ') + '。',
        '貝爾曼更新公式讓未來的獎勵透過折扣因子 γ = ' + f(R.gamma, 2) + ' 逐步反向傳回前面經過的格子。'
      ];
    },

    aistudio: {
      operators: ['Execute Python'],
      params: [['alpha', p => String(p.alpha)], ['gamma', p => String(p.gamma)], ['epsilon', p => String(p.epsilon)]],
      note: '強化學習不在本課程主線範圍內，AI Studio 亦無原生 Q-learning 運算子，供有興趣同學延伸參考。',
      expect: (steps, rows, p) => {
        const R = runQL(p);
        return ['最佳路線長度 = ' + R.bestPath.length + ' 格'];
      },
      python: `import numpy as np\n# 依 ε-greedy 與 Bellman 更新式 Q[s,a] += alpha*(r + gamma*max(Q[ns]) - Q[s,a])`,
      confirmed: false
    }
  });
})();
