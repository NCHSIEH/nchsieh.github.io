/* D4 關聯評估指標與負關聯規則 */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const ITEMS = LAB.data.rxItems.map(x => x[0]);
  const COLS = LAB.data.columns('rx', ITEMS);

  function runMetrics(rows, p) {
    const n = rows.length;
    const minSup = p.min_sup || 0.2;
    const nullAdd = Math.round(p.null_tx || 0);
    const totalN = n + nullAdd;

    const supBase = {};
    ITEMS.forEach(it => {
      supBase[it] = rows.filter(r => r[it]).length;
    });

    const posRules = [];
    const negRules = [];

    for (let i = 0; i < ITEMS.length; i++) {
      for (let j = 0; j < ITEMS.length; j++) {
        if (i === j) continue;
        const a = ITEMS[i], b = ITEMS[j];
        const cntA = supBase[a], cntB = supBase[b];
        if (!cntA || !cntB) continue;
        const cntAB = rows.filter(r => r[a] && r[b]).length;
        const cntAnotB = cntA - cntAB;

        const pA = cntA / totalN;
        const pB = cntB / totalN;
        const pAB = cntAB / totalN;

        if (cntAB / n >= minSup - 1e-12) {
          const conf = cntAB / cntA; // P(B|A) — null-invariant!
          const confBA = cntAB / cntB; // P(A|B) — null-invariant!
          const lift = conf / pB; // depends on totalN!
          const lev = pAB - pA * pB;
          const conv = (1 - conf) < 1e-9 ? 9.99 : Math.min(9.99, (1 - pB) / (1 - conf));
          const kulc = 0.5 * (conf + confBA);
          const denomZ = Math.max(pAB * (1 - pA), pA * (pB - pAB));
          const zhang = denomZ < 1e-12 ? 0 : (pAB - pA * pB) / denomZ;

          posRules.push({
            id: a + '=>' + b,
            a, b,
            text: LAB.data.rxLabel(a) + ' → ' + LAB.data.rxLabel(b),
            cntAB, cntA, cntB,
            sup: pAB, conf, lift, lev, conv, kulc, zhang
          });
        }

        // 負關聯規則 A -> ¬B（當 A 出現且 B 顯著不出現，即 Lift(A,B) < 0.75 且 P(¬B|A) 高）
        if (cntA >= 3 && cntB >= 3) {
          const pNotB = (totalN - cntB) / totalN;
          const confNeg = cntAnotB / cntA; // P(¬B | A)
          const liftAB = (cntAB / cntA) / (cntB / n);
          const liftNeg = confNeg / pNotB;
          if (liftAB < 0.85) {
            negRules.push({
              id: a + '=>!' + b,
              a, b,
              text: LAB.data.rxLabel(a) + ' → ¬' + LAB.data.rxLabel(b),
              cntAnotB, cntA, cntB,
              sup: cntAnotB / totalN,
              conf: confNeg,
              liftAB,
              liftNeg,
              kulc: 0.5 * (confNeg + cntAnotB / Math.max(1, totalN - cntB))
            });
          }
        }
      }
    }

    posRules.sort((x, y) => y.kulc - x.kulc || y.lift - x.lift);
    negRules.sort((x, y) => x.liftAB - y.liftAB || y.conf - x.conf);

    return { n, nullAdd, totalN, minSup, posRules, negRules };
  }

  LAB.register({
    id: 'D4', group: 'D', title: '進階評估指標與負關聯',
    module: { name: 'M4 第 12 節', url: '../m4/#p12' },
    goal: '看懂為什麼光看 Support、Confidence 與 Lift 會在「零交易膨脹（Null Transactions）」時失真，並認識零不變性指標 Kulczynski、方向性指標 Conviction 與臨床互斥的「負關聯規則 A → ¬B」。',
    data: {
      name: 'rx_metrics',
      scenario: '門診處方籃：12 張處方籤，測試加入大量不含目標藥品的「零交易」時 Lift 與 Kulczynski 的變化，並找出互斥處方',
      columns: COLS,
      small: seed => LAB.data.rx(seed, 12),
      view: rows => ({
        type: 'tokens',
        groups: rows.map(r => ({
          id: 'tx' + r.id,
          label: '處方 #' + r.id,
          items: r.items.map(k => ({ id: r.id + '_' + k, text: LAB.data.rxLabel(k) }))
        }))
      })
    },
    params: [
      { key: 'min_sup', label: '基準支持度 min_sup', type: 'num', min: 0.15, max: 0.45, step: 0.05, value: 0.25 },
      { key: 'null_tx', label: '外加零交易筆數 Null Tx', type: 'num', min: 0, max: 36, step: 6, value: 12 }
    ],
    pseudo: [
      '建立 2×2 共現列聯表四格計數',
      '算傳統 Support、Conf 與 Lift',
      '加零交易觀察 Lift 隨母數暴漲',
      '算零不變指標 Kulczynski',
      '算方向性 Conviction 與 Zhang',
      '探勘負關聯規則 A → ¬B（互斥）'
    ],
    build(rows, p) {
      const R0 = runMetrics(rows, { min_sup: p.min_sup, null_tx: 0 });
      const R = runMetrics(rows, p);
      const steps = [];
      const top0 = R0.posRules[0] || { text: '無', lift: 1, kulc: 0.5, conf: 0.5, conv: 1 };
      const topAfter = R.posRules.find(r => r.id === top0.id) || top0;

      function views(st) {
        const list = st.mode === 'neg' ? R.negRules : (st.useNull ? R.posRules : R0.posRules);
        const main = {
          type: 'bars', slot: 'main',
          title: st.mode === 'neg'
            ? '負關聯規則 A → ¬B（兩藥同時出現機率遠低於預期，P(¬B|A) 越高越互斥）'
            : (st.metric === 'kulc'
              ? '前 6 條規則 Kulczynski 零不變指標（不受 Null Tx=' + (st.useNull ? R.nullAdd : 0) + ' 影響）'
              : '前 6 條規則 Lift 增益度（總處方數 N=' + (st.useNull ? R.totalN : R.n) + ' 時的變化）'),
          max: st.mode === 'neg' ? 1 : (st.metric === 'kulc' ? 1 : Math.max(4, Math.ceil(M.max(list.slice(0, 6).map(r => r.lift || 1)) * 1.1))),
          digits: 2,
          items: list.slice(0, 6).map(r => ({
            id: 'm_' + r.id,
            label: r.text,
            value: st.mode === 'neg' ? r.conf : (st.metric === 'kulc' ? r.kulc : r.lift),
            cls: st.mode === 'neg' ? 'bad' : (st.metric === 'kulc' ? 'good' : 'c0')
          }))
        };

        const side = {
          type: 'table', slot: 'side',
          title: st.mode === 'neg' ? '負關聯／互斥用藥清單' : '多指標對照表（N=' + (st.useNull ? R.totalN : R.n) + '）',
          cols: st.mode === 'neg' ? [
            { key: 'rule', label: '負關聯 A → ¬B' },
            { key: 'conf', label: 'P(¬B|A)', num: true, digits: 2 },
            { key: 'liftAB', label: '正向Lift', num: true, digits: 2 },
            { key: 'liftNeg', label: '互斥Lift', num: true, digits: 2 }
          ] : [
            { key: 'rule', label: '規則 A → B' },
            { key: 'lift', label: 'Lift', num: true, digits: 2 },
            { key: 'kulc', label: 'Kulc', num: true, digits: 2 },
            { key: 'conv', label: 'Conv', num: true, digits: 2 },
            { key: 'zhang', label: 'Zhang', num: true, digits: 2 }
          ],
          rows: list.slice(0, 8).map((r, idx) => ({
            id: r.id,
            cells: st.mode === 'neg'
              ? [r.text, r.conf, { v: f(r.liftAB, 2), cls: 'bad' }, { v: f(r.liftNeg, 2), cls: 'good' }]
              : [r.text, { v: f(r.lift, 2), cls: st.useNull ? 'hl' : undefined }, { v: f(r.kulc, 2), cls: 'good' }, r.conv, r.zhang],
            hl: idx === 0
          }))
        };

        const bottom = {
          type: 'note', slot: 'bottom',
          tone: st.mode === 'neg' ? 'warn' : (st.useNull && st.metric === 'lift' ? 'warn' : 'info'),
          text: st.mode === 'neg'
            ? '負關聯規則（Negative Rule A → ¬B）：當開立 A 時幾乎不開 B（正向 Lift ≪ 1），在臨床上常對應「同類藥品不重複開立」或「配伍禁忌」。'
            : (st.useNull && st.metric === 'lift'
              ? '零交易失真警告！加入 ' + R.nullAdd + ' 張無關門診處方後，A 與 B 一起出現的次數完全沒變，但「' + top0.text + '」的 Lift 卻從 ' + f(top0.lift, 2) + ' 暴漲到 ' + f(topAfter.lift, 2) + '！'
              : '零不變性（Null-Invariance）：Kulczynski 只依賴條件機率 P(B|A) 與 P(A|B)，不管門診資料庫多塞入幾萬張無關處方，數值永遠恆定為 ' + f(top0.kulc, 2) + '。')
        };
        return [main, side, bottom];
      }

      const st = { useNull: false, metric: 'lift', mode: 'pos' };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '2×2 共現列聯表', '評估兩藥 A 與 B 的關聯時，處方籃可分成四格：兩藥皆有 n(AB)、只有 A、只有 B，以及「兩藥皆無 n(¬A¬B，零交易）」。', [
        '原始處方數 N = ' + R.n + ' 張，外加零交易 Null Tx = ' + R.nullAdd + ' 張'
      ]);

      add(1, '原始資料的 Lift', '在原始 ' + R.n + ' 張處方中，計算每條規則的 Confidence 與 Lift = P(AB) / (P(A)P(B))。', [
        '榜首規則：' + top0.text + '｜Conf = ' + f(top0.conf, 2) + ', Lift = ' + f(top0.lift, 2)
      ]);

      st.useNull = true;
      add(2, '加入零交易：Lift 暴漲', '假設把全院另外 ' + R.nullAdd + ' 張無關處方（兩藥皆無）併入資料庫，A 與 B 共現次數沒變，但 Lift 卻因分母 N 變大而暴漲！', [
        top0.text + '：原始 Lift = ' + f(top0.lift, 2) + ' → 併入零交易後 Lift = ' + f(topAfter.lift, 2) + '（放大 ' + f(R.totalN / R.n, 2) + ' 倍）'
      ]);

      st.metric = 'kulc';
      add(3, '零不變指標 Kulczynski', '改用 Kulczynski = ½ [P(B|A) + P(A|B)]：因為只看 A、B 各自出現時的條件機率，完全不受零交易 n(¬A¬B) 影響！', [
        top0.text + '：原始 Kulc = ' + f(top0.kulc, 2) + ' → 併入零交易後 Kulc = ' + f(topAfter.kulc, 2) + '（100% 恆定不變）'
      ]);

      st.useNull = false;
      add(3, '為什麼大型醫院需要 Kulc', '全院資料庫有上百種科別，對任何兩種特定專科用藥而言，99% 處方都是「兩藥皆無」的零交易，若只看 Lift 會使冷門藥組合全部破表。', [
        'Kulczynski 範圍 [0, 1]：0.5 為獨立，越接近 1 代表雙向共現越緊密'
      ]);

      add(4, '方向性指標 Conviction', 'Lift 與 Kulczynski 都是對稱的（A→B 等於 B→A）；Conviction = (1 − P(B)) / (1 − Conf(A→B)) 則能區分誰是因、誰是果。', [
        top0.text + '：Conviction = ' + f(top0.conv, 2) + '（數值越大代表「有 A 卻沒有 B」的反例越少）'
      ]);

      add(4, '有界對稱指標 Zhang', 'Zhang 指標將關聯強度正規化到 [-1, +1]：+1 為完美正相關、0 為獨立、-1 為完美互斥，方便跨資料集比較。', [
        top0.text + '：Zhang = ' + f(top0.zhang, 2)
      ]);

      st.mode = 'neg';
      const topNeg = R.negRules[0];
      add(5, '探勘負關聯規則 A → ¬B', '除了找「常一起開的藥」，臨床上更關心「開了 A 就不會開 B」的負關聯（如抗生素與慢性降脂藥分屬急慢性病程，或同類互斥藥）。', [
        topNeg ? '最強互斥：' + topNeg.text + '｜P(¬B|A) = ' + f(topNeg.conf, 2) + ', 正向 Lift = ' + f(topNeg.liftAB, 2) : '無顯著互斥規則'
      ]);

      add(5, '正向關聯 vs 負向關聯', '正向關聯（Lift > 1, Kulc > 0.6）用於套餐推薦與合併處方提示；負向關聯（A → ¬B）則用於處方衝突稽核與替代藥品分析。', [
        '正向規則共 ' + R.posRules.length + ' 條，負向互斥規則共 ' + R.negRules.length + ' 條'
      ]);

      add(5, '指標選用總結', '實務口訣：常規篩選看 Support + Confidence + Lift；跨科別大資料庫必加看 Kulczynski（抗零交易）與 Zhang 指標。', [
        '榜首 Kulc = ' + f(top0.kulc, 2) + '｜零交易膨脹倍數 = ' + f(topAfter.lift / Math.max(1e-9, top0.lift), 2) + 'x'
      ]);

      return steps;
    },

    keys(steps, rows, p) {
      const R0 = runMetrics(rows, { min_sup: p.min_sup, null_tx: 0 });
      const R = runMetrics(rows, p);
      const top0 = R0.posRules[0] || { lift: 0, kulc: 0, conv: 0, zhang: 0 };
      const topAfter = R.posRules.find(r => r.id === top0.id) || top0;
      return {
        n_pos: R.posRules.length,
        n_neg: R.negRules.length,
        lift_base: top0.lift,
        lift_null: topAfter.lift,
        kulc_base: top0.kulc,
        kulc_null: topAfter.kulc,
        top_zhang: top0.zhang
      };
    },

    explain(steps, rows, p) {
      const R0 = runMetrics(rows, { min_sup: p.min_sup, null_tx: 0 });
      const R = runMetrics(rows, p);
      const top0 = R0.posRules[0] || { text: '無', lift: 1, kulc: 0.5 };
      const topAfter = R.posRules.find(r => r.id === top0.id) || top0;
      return [
        '在加入 ' + R.nullAdd + ' 筆零交易（Null Transactions）後，規則「' + top0.text + '」的 Lift 由 ' + f(top0.lift, 2) + ' 膨脹至 ' + f(topAfter.lift, 2) + '，證明 Lift 不具備零不變性。',
        '反觀零不變性指標 Kulczynski 在加入零交易前後皆維持 ' + f(top0.kulc, 2) + '，適合稀疏的大型醫療與電商資料庫。',
        '同時挖出 ' + R.negRules.length + ' 條負關聯規則（A → ¬B），可識別臨床互斥用藥或不同病程之處方分流。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'FP-Growth', 'Create Association Rules'],
      params: [
        ['Create Association Rules › criterion', 'lift / conviction / leverage']
      ],
      note: 'AI Studio 的 Create Association Rules 輸出表內建 Support、Confidence、Lift、LaPlace、Gain 與 Conviction；Python 的 mlxtend 則原生支援 lift、leverage、conviction 與 zhangs_metric。',
      expect: (steps, rows, p) => {
        const R = runMetrics(rows, p);
        return ['正向規則 ' + R.posRules.length + ' 條、負向互斥規則 ' + R.negRules.length + ' 條'];
      },
      python: 'from mlxtend.frequent_patterns import association_rules\nrules = association_rules(freq, metric="lift", min_threshold=1.0)\n# mlxtend 自動計算 leverage, conviction, zhangs_metric, kulczynski',
      confirmed: false
    }
  });
})();
