/* J2 多臂吃角子老虎機：ε-Greedy 與 UCB */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = [
    { key: 'arm', label: '治療方案', type: 'text' },
    { key: 'true_p', label: '真實有效率', type: 'num' },
    { key: 'desc', label: '臨床特性', type: 'text' }
  ];

  const ARMS = [
    { id: 1, arm: '方案 A (標準藥)', true_p: 0.45, desc: '溫和穩定，中等有效率' },
    { id: 2, arm: '方案 B (新標靶)', true_p: 0.75, desc: '潛在最佳療法（待探索發現）' },
    { id: 3, arm: '方案 C (舊處方)', true_p: 0.25, desc: '療效偏低，應儘早停止分派' }
  ];

  function makeRows() {
    const res = [];
    for (let i = 0; i < 6; i++) {
      const a = ARMS[i % 3];
      res.push({ id: i + 1, arm: '病患#' + (i + 1) + ' 候選 ' + a.arm.slice(0, 4), true_p: a.true_p, desc: a.desc });
    }
    return res;
  }

  function simStrategy(strat, T, eps, cVal, uSelect, uReward) {
    const counts = [0, 0, 0];
    const wins = [0, 0, 0];
    const qHat = [0, 0, 0];
    const pStar = 0.75;
    let cumRegret = 0;
    let cumReward = 0;
    const history = [];

    for (let t = 1; t <= T; t++) {
      let chosen = 0;
      let ucbScores = [0, 0, 0];

      // 前 3 步先各試 1 次初始化
      if (t <= 3) {
        chosen = t - 1;
        ucbScores = qHat.slice();
      } else if (strat === 'ucb') {
        ucbScores = [0, 1, 2].map(k => {
          const bonus = cVal * Math.sqrt(Math.log(t) / counts[k]);
          return qHat[k] + bonus;
        });
        chosen = M.argmax(ucbScores);
      } else {
        // eps-greedy
        if (uSelect[t - 1] < eps) {
          chosen = Math.floor(uSelect[t - 1] / Math.max(1e-9, eps) * 3) % 3;
        } else {
          chosen = M.argmax(qHat);
        }
        ucbScores = qHat.slice();
      }

      const trueP = ARMS[chosen].true_p;
      const rew = uReward[t - 1] < trueP ? 1 : 0;
      counts[chosen]++;
      wins[chosen] += rew;
      qHat[chosen] = wins[chosen] / counts[chosen];

      cumReward += rew;
      cumRegret += (pStar - trueP);

      const bonuses = [0, 1, 2].map(k => counts[k] > 0 ? cVal * Math.sqrt(Math.log(Math.max(1, t)) / counts[k]) : 1.0);
      history.push({
        t,
        chosen,
        rew,
        counts: counts.slice(),
        wins: wins.slice(),
        qHat: qHat.slice(),
        bonuses,
        ucbScores: ucbScores.slice(),
        cumReward,
        cumRegret
      });
    }

    return { counts, wins, qHat, cumReward, cumRegret, history };
  }

  function runBandit(rows, p) {
    const T = Math.max(15, Math.min(60, Math.round(p.rounds || 30)));
    const cVal = p.ucb_c || 1.2;
    const eps = p.epsilon != null ? p.epsilon : 0.2;
    const strat = p.strategy || 'ucb';

    const rng = LAB.rng(9850 + T * 7);
    const uSelect = M.range(T, () => rng());
    const uReward = M.range(T, () => rng());

    const resUcb = simStrategy('ucb', T, eps, cVal, uSelect, uReward);
    const resEps = simStrategy('eps', T, eps, cVal, uSelect, uReward);
    const resPure = simStrategy('eps', T, 0.0, cVal, uSelect, uReward);
    const active = strat === 'ucb' ? resUcb : resEps;

    return { T, cVal, eps, strat, uSelect, uReward, resUcb, resEps, resPure, active };
  }

  LAB.register({
    id: 'J2', group: 'J', title: '多臂老虎機：UCB 與適應性試驗',
    module: { name: '延伸參考', url: '' },
    goal: '（延伸參考）看懂不具狀態轉移的單步強化學習「多臂吃角子老虎機（Multi-Armed Bandit）」：比較 ε-Greedy 與 UCB（信賴上界 Upper Confidence Bound）如何在臨床適應性試驗中平衡「探索未知新藥」與「利用最佳療法」，最小化病患累積遺憾（Regret）。',
    data: {
      name: 'bandit_trial',
      scenario: '臨床適應性試驗：3 種真實有效率未知的治療方案（A=45%, B=75%, C=25%），逐位分派病人並即時更新估計',
      columns: COLS,
      small: makeRows
    },
    params: [
      { key: 'strategy', label: '分派策略', type: 'choice', value: 'ucb', options: [{ v: 'ucb', label: 'UCB 信賴上界' }, { v: 'eps', label: 'ε-Greedy 隨機探索' }] },
      { key: 'ucb_c', label: 'UCB 探索係數 c', type: 'num', min: 0.5, max: 2.0, step: 0.25, value: 1.25 },
      { key: 'epsilon', label: 'ε 探索率', type: 'num', min: 0.0, max: 0.5, step: 0.1, value: 0.2 },
      { key: 'rounds', label: '試驗人數 T', type: 'int', min: 15, max: 60, step: 15, value: 30 }
    ],
    pseudo: [
      '前 3 位病人先各試一次方案 A,B,C',
      '對每位新病人 t = 4…T：',
      '  算經驗勝率 Q̂ₜ(a) = 成功/次數',
      '  UCB 加不確定項 c·√(ln t/N)',
      '  挑最高分方案治療並觀察療效',
      '比較累積遺憾 Σ(p* − p_chosen)'
    ],
    build(rows, p) {
      const R = runBandit(rows, p), steps = [];

      function views(st) {
        const snap = R.active.history[Math.min(st.tIdx, R.T - 1)];
        const main = {
          type: 'line', slot: 'main',
          title: '累積遺憾曲線 Cumulative Regret（越低代表越少病人被分派到次佳療法）',
          axes: { x: { label: '試驗病人序號 t', min: 1, max: R.T }, y: { label: '累積遺憾 Regret', min: 0, max: Math.max(4, Math.ceil(M.max([R.resUcb.cumRegret, R.resEps.cumRegret, R.resPure.cumRegret]) * 1.15)) } },
          series: [
            { id: 'ucb', label: 'UCB 信賴上界', pts: R.resUcb.history.slice(0, st.tIdx + 1).map(h => [h.t, h.cumRegret]), cls: 'good', dots: false },
            { id: 'eps', label: 'ε-Greedy (ε=' + f(R.eps, 1) + ')', pts: R.resEps.history.slice(0, st.tIdx + 1).map(h => [h.t, h.cumRegret]), cls: 'c0', dots: false },
            { id: 'pure', label: '純貪婪 (ε=0 易鎖死)', pts: R.resPure.history.slice(0, st.tIdx + 1).map(h => [h.t, h.cumRegret]), cls: 'c4', dash: true, dots: false }
          ],
          marker: { x: snap.t, y: snap.cumRegret, label: 't=' + snap.t }
        };

        const side = {
          type: 'table', slot: 'side',
          title: '第 ' + snap.t + ' 位病人分派後各方案統計',
          cols: [
            { key: 'arm', label: '方案' },
            { key: 'n', label: '次數N', num: true, digits: 0 },
            { key: 'q', label: '經驗Q̂', num: true, digits: 2 },
            { key: 'b', label: '不確定項', num: true, digits: 2 },
            { key: 'u', label: 'UCB總分', num: true, digits: 2 }
          ],
          rows: [0, 1, 2].map(k => ({
            id: 'a' + k,
            cells: [
              ARMS[k].arm.slice(0, 4),
              snap.counts[k],
              snap.qHat[k],
              snap.bonuses[k],
              { v: f(snap.qHat[k] + snap.bonuses[k], 2), cls: k === snap.chosen ? 'good' : undefined }
            ],
            hl: k === snap.chosen
          }))
        };

        const bottom = {
          type: 'bars', slot: 'bottom',
          title: st.showCounts
            ? '最終 ' + R.T + ' 位病人分派給各方案的總次數（大部分資源自動集中到最佳方案 B！）'
            : '第 ' + snap.t + ' 步各方案 UCB 評分（經驗勝率 Q̂ + 探索獎勵 c√(ln t/N)）',
          max: st.showCounts ? R.T : 1.8,
          digits: st.showCounts ? 0 : 2,
          items: [0, 1, 2].map(k => ({
            id: 'bar' + k,
            label: ARMS[k].arm + ' (真=' + LAB.pct(ARMS[k].true_p, 0) + ')',
            value: st.showCounts ? snap.counts[k] : (R.strat === 'ucb' ? snap.qHat[k] + snap.bonuses[k] : snap.qHat[k]),
            cls: k === 1 ? 'good' : (k === 2 ? 'bad' : 'c0'),
            hl: k === snap.chosen
          }))
        };

        return [main, side, bottom];
      }

      const st = { tIdx: 2, showCounts: false };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, 'A/B 測試 vs 老虎機', '傳統臨床試驗（A/B Test）把病人死板平分給三組，導致整整 1/3 的病人被迫吃最差的 C 藥！多臂老虎機則「邊試驗邊把病人轉向好藥」。', [
        '上帝視角真實有效率：A = 45%、B = 75%（最佳）、C = 25%（演算法事先不知道）'
      ]);

      add(1, '前 3 步：初始輪流試探', '前 3 位病人先各試一次方案 A、B、C，建立初始經驗勝率 Q̂ 與分母 N=1。', [
        't=3 後各方案試驗次數 N = (' + R.active.history[2].counts.join(', ') + ')'
      ]);

      st.tIdx = 3;
      const s4 = R.active.history[3];
      add(3, '第 4 步：UCB 樂觀公式', 'UCB 不靠盲目丟銅板，而是給每個方案加上「不確定性紅利 c·√(ln t / N)」：越少被試過的藥紅利越大，遵循「面對不確定性保持樂觀」！', [
        '第 4 步選出：' + ARMS[s4.chosen].arm + '｜療效 r = ' + s4.rew
      ]);

      [6, 10, 13].forEach(idx => {
        if (idx < R.T) {
          st.tIdx = idx;
          const sn = R.active.history[idx];
          add(4, '第 ' + sn.t + ' 位病人分派', '隨著方案 C 多次失敗且被試過幾次後，它的 Q̂ 與不確定紅利雙雙下降，演算法自動停止把病人分給 C！', [
            '目前分派次數 N = (' + sn.counts.join(', ') + ')｜經驗勝率 Q̂ = (' + sn.qHat.map(v => f(v, 2)).join(', ') + ')'
          ]);
        }
      });

      st.tIdx = R.T - 1;
      const fin = R.active.history[R.T - 1];
      add(5, '完成全部 ' + R.T + ' 人分派', '到達第 ' + R.T + ' 位病人時，經驗勝率 Q̂ 已收斂接近真實值，且絕大多數病人都享受到最佳方案 B！', [
        '最終分派次數：A=' + fin.counts[0] + ' 人, B=' + fin.counts[1] + ' 人, C=' + fin.counts[2] + ' 人',
        '總治癒人數 = ' + fin.cumReward + ' / ' + R.T + ' 人'
      ]);

      st.showCounts = true;
      add(5, '比較三種策略遺憾', '看主圖三條線：純貪婪（紅虛線）若前兩次最佳藥剛好沒效就會永遠鎖死在次佳藥；ε-Greedy（藍線）後期仍會固定比例亂試差藥；UCB（綠線）遺憾成長最平緩！', [
        '累積遺憾 Regret：UCB = ' + f(R.resUcb.cumRegret, 2) + '｜ε-Greedy = ' + f(R.resEps.cumRegret, 2) + '｜純貪婪 = ' + f(R.resPure.cumRegret, 2)
      ]);

      add(5, '老虎機 vs Q學習', 'J1 Q-learning 有「狀態轉移（走一步換一格）」；J2 多臂老虎機則是「單一狀態下的探索與利用」，也是推薦系統、動態定價與適應性臨床試驗的核心！', [
        '最佳方案 B 獲分派比例 = ' + LAB.pct(fin.counts[1] / R.T, 1)
      ]);

      add(5, '實驗總結', '透過 UCB 信賴上界，我們不必再陷入「盲目隨機探索」與「過早鎖死」的兩難，而是用統計信賴區間優雅解決探索與利用困境。', [
        '當前策略最終累積遺憾 = ' + f(fin.cumRegret, 2)
      ]);

      return steps;
    },

    inputs(rows, p) {
      const R = runBandit(rows, p);
      return { u_select: R.uSelect, u_reward: R.uReward };
    },

    keys(steps, rows, p) {
      const R = runBandit(rows, p);
      return {
        ucb_regret: R.resUcb.cumRegret,
        eps_regret: R.resEps.cumRegret,
        act_reward: R.active.cumReward,
        cnt_0: R.active.counts[0],
        cnt_1: R.active.counts[1],
        cnt_2: R.active.counts[2],
        q_1: R.active.qHat[1]
      };
    },

    explain(steps, rows, p) {
      const R = runBandit(rows, p);
      return [
        '在 ' + R.T + ' 位病人的適應性臨床試驗中，' + (R.strat === 'ucb' ? 'UCB 信賴上界法' : 'ε-Greedy 策略') + '將病人分派給方案 A、B、C 的次數分別為 ' + R.active.counts.join('、') + ' 次。',
        'UCB 透過 c·√(ln t / N) 自動在初期探索未知方案、後期集中於最佳方案 B（真勝率 75%），累積遺憾為 ' + f(R.resUcb.cumRegret, 2) + '（ε-Greedy 為 ' + f(R.resEps.cumRegret, 2) + '）。',
        '相較於傳統固定比例 A/B 測試，多臂老虎機能顯著減少試驗期間接受劣等療法的受試者人數。'
      ];
    },

    aistudio: {
      operators: ['Execute Python'],
      params: [
        ['strategy', p => p.strategy],
        ['ucb_c / epsilon', p => p.strategy === 'ucb' ? String(p.ucb_c) : String(p.epsilon)]
      ],
      note: '多臂老虎機（Multi-Armed Bandit）常透過 Python 實作線上分派迴圈，廣泛用於醫療適應性試驗與醫療衛教推播個人化。',
      expect: (steps, rows, p) => {
        const R = runBandit(rows, p);
        return ['方案 B 分派 ' + R.active.counts[1] + ' 次，累積遺憾 = ' + f(R.active.cumRegret, 2)];
      },
      python: 'import numpy as np\n# UCB1 選擇公式: a_t = argmax_a [ Q(a) + c * sqrt(ln(t) / N(a)) ]',
      confirmed: false
    }
  });
})();
