/* D1 Apriori */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const ITEMS = LAB.data.rxItems.map(x => x[0]);
  const COLS = LAB.data.columns('rx', ITEMS);

  function subsets(arr) {
    const res = [[]];
    arr.forEach(x => {
      const len = res.length;
      for (let i = 0; i < len; i++) res.push(res[i].concat([x]));
    });
    return res;
  }

  function runApriori(rows, p) {
    const n = rows.length;
    const minSup = p.min_sup || 0.3;
    const minConf = p.min_conf || 0.6;
    const txSets = rows.map(r => new Set(r.items));
    const supOf = setArr => txSets.filter(s => setArr.every(it => s.has(it))).length / n;
    const keyOf = setArr => setArr.slice().sort().join('+');
    const nameOf = setArr => setArr.map(LAB.data.rxLabel).join(' ＋ ');

    // L1
    const c1 = ITEMS.map(it => ({ items: [it], key: it, label: LAB.data.rxLabel(it), sup: supOf([it]) }));
    const l1 = c1.filter(x => x.sup >= minSup - 1e-12);

    // L2
    const c2 = [];
    for (let i = 0; i < l1.length; i++) {
      for (let j = i + 1; j < l1.length; j++) {
        const pair = [l1[i].items[0], l1[j].items[0]].sort();
        c2.push({ items: pair, key: keyOf(pair), label: nameOf(pair), sup: supOf(pair) });
      }
    }
    const l2 = c2.filter(x => x.sup >= minSup - 1e-12);
    const l2Set = new Set(l2.map(x => x.key));

    // C3 via Apriori join + prune
    const c3Map = new Map();
    for (let i = 0; i < l2.length; i++) {
      for (let j = i + 1; j < l2.length; j++) {
        const merged = Array.from(new Set(l2[i].items.concat(l2[j].items))).sort();
        if (merged.length !== 3) continue;
        const k = keyOf(merged);
        if (c3Map.has(k)) continue;
        // Apriori property: all 2-subsets must be in L2
        const s1 = keyOf([merged[0], merged[1]]);
        const s2 = keyOf([merged[0], merged[2]]);
        const s3 = keyOf([merged[1], merged[2]]);
        if (l2Set.has(s1) && l2Set.has(s2) && l2Set.has(s3)) {
          c3Map.set(k, { items: merged, key: k, label: nameOf(merged), sup: supOf(merged) });
        }
      }
    }
    const c3 = Array.from(c3Map.values());
    const l3 = c3.filter(x => x.sup >= minSup - 1e-12);

    const freqMap = new Map();
    l1.concat(l2).concat(l3).forEach(x => freqMap.set(x.key, x.sup));

    // Association rules from L2 & L3
    const allRules = [];
    l2.concat(l3).forEach(fset => {
      const subs = subsets(fset.items).filter(s => s.length >= 1 && s.length < fset.items.length);
      subs.forEach(ant => {
        const antSet = new Set(ant);
        const con = fset.items.filter(x => !antSet.has(x));
        const supAB = fset.sup;
        const supA = freqMap.get(keyOf(ant));
        const supB = freqMap.get(keyOf(con));
        const conf = supAB / supA;
        const lift = conf / supB;
        allRules.push({
          id: keyOf(ant) + '=>' + keyOf(con),
          ant, con,
          text: nameOf(ant) + ' → ' + nameOf(con),
          sup: supAB, conf, lift
        });
      });
    });

    const rules = allRules.filter(r => r.conf >= minConf - 1e-12).sort((a, b) => b.lift - a.lift || b.conf - a.conf);
    const trap = rules.find(r => r.lift < 1 - 1e-9) || allRules.find(r => r.lift < 1 - 1e-9);

    return { c1, l1, c2, l2, c3, l3, freqMap, rules, trap };
  }

  LAB.register({
    id: 'D1', group: 'D', title: 'Apriori',
    module: { name: 'M4 第 12 節', url: '../m4/#p12' },
    goal: '看懂 Apriori 如何從單項開始逐層產生候選、利用「子集不頻繁就剪枝」減少搜尋，並算出支持度、信賴度與增益度（lift）。',
    data: {
      name: 'rx_apriori',
      scenario: '門診處方籃：12 張處方籤包含 9 類常見藥品，挖掘常一起開立的用藥組合',
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
      { key: 'min_sup', label: '最小支持度 min_sup', type: 'num', min: 0.2, max: 0.6, step: 0.05, value: 0.25 },
      { key: 'min_conf', label: '最小信賴度 min_conf', type: 'num', min: 0.5, max: 0.9, step: 0.05, value: 0.6 }
    ],
    pseudo: [
      '掃描處方算每個單項的支持度 (C1)',
      '剪掉低於 min_sup 的項目得 L1',
      '由 L1 兩兩組合成候選兩項 (C2)',
      '算 C2 支持度並剪枝得 L2',
      '依 Apriori 性質產生候選三項 (C3)',
      '算 C3 支持度並剪枝得 L3',
      '從頻繁項目集產生關聯規則',
      '算 confidence 與 lift（防陷阱）'
    ],
    build(rows, p) {
      const R = runApriori(rows, p), steps = [];
      const minSup = p.min_sup || 0.25;

      function views(st) {
        const groups = [];
        if (st.stage >= 1) {
          groups.push({
            id: 'c1', title: 'C1 / L1 單項',
            items: R.c1.map(x => ({
              id: '1_' + x.key, text: x.label, value: f(x.sup, 2),
              state: st.prune1 ? (x.sup >= minSup - 1e-12 ? 'keep' : 'cut') : undefined
            }))
          });
        }
        if (st.stage >= 2) {
          groups.push({
            id: 'c2', title: 'C2 / L2 兩項組合',
            items: R.c2.slice(0, 12).map(x => ({
              id: '2_' + x.key, text: x.label, value: f(x.sup, 2),
              state: st.prune2 ? (x.sup >= minSup - 1e-12 ? 'keep' : 'cut') : undefined
            }))
          });
        }
        if (st.stage >= 3) {
          groups.push({
            id: 'c3', title: 'C3 / L3 三項組合',
            items: R.c3.length
              ? R.c3.slice(0, 10).map(x => ({ id: '3_' + x.key, text: x.label, value: f(x.sup, 2), state: st.prune3 ? (x.sup >= minSup - 1e-12 ? 'keep' : 'cut') : undefined }))
              : [{ id: 'none3', text: '無候選三項通過', state: 'cut' }]
          });
        }
        const main = { type: 'sets', slot: 'main', title: '逐層候選與剪枝（綠＝保留、紅＝剪除）', groups };
        const side = {
          type: 'table', slot: 'side',
          title: '關聯規則（依 lift 排序）',
          cols: [
            { key: 'rule', label: '規則' },
            { key: 'sup', label: 'Sup', num: true, digits: 2 },
            { key: 'conf', label: 'Conf', num: true, digits: 2 },
            { key: 'lift', label: 'Lift', num: true, digits: 2 }
          ],
          rows: st.showRules ? R.rules.slice(0, 10).map(r => ({
            id: r.id,
            cells: [r.text, r.sup, r.conf, { v: f(r.lift, 2), cls: r.lift < 1 ? 'bad' : 'good' }],
            hl: r.lift < 1
          })) : []
        };
        const bottom = (st.showRules && !st.warnTrap && R.rules.length) ? {
          type: 'bars', slot: 'bottom',
          title: '前 5 名關聯規則提升度 Lift（>1 正相關，越高越強）',
          max: Math.max(2, Math.ceil(M.max(R.rules.slice(0, 5).map(r => r.lift)) * 1.1)),
          digits: 2,
          items: R.rules.slice(0, 5).map(r => ({
            id: r.id,
            label: r.text,
            value: r.lift,
            cls: r.lift < 1 ? 'bad' : 'good'
          }))
        } : {
          type: 'note', slot: 'bottom',
          tone: st.warnTrap ? 'warn' : 'info',
          text: st.warnTrap && R.trap
            ? 'Lift 陷阱！規則「' + R.trap.text + '」信賴度達 ' + LAB.pct(R.trap.conf, 1) + '，但 Lift = ' + f(R.trap.lift, 2) + ' < 1，代表兩藥其實比隨機碰巧還更少一起開（因為後項本身太常見）。'
            : 'Apriori 性質：若一個項目集本身不頻繁，它的任何超集也絕不可能頻繁，因此可直接跳過不計數。'
        };
        return [main, side, bottom];
      }

      const st = { stage: 0, prune1: false, prune2: false, prune3: false, showRules: false, warnTrap: false };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '題目', '12 張門診處方包含 9 類藥品。設定 min_sup = ' + f(minSup, 2) + '、min_conf = ' + f(p.min_conf, 2) + '，找出常一起開的藥品規則。', [
        '門檻筆數 = ' + Math.ceil(minSup * rows.length - 1e-12) + ' / ' + rows.length + ' 張處方'
      ]);

      st.stage = 1;
      add(1, '掃描單項 C1', '第一次掃描所有處方，數出 9 類藥品各自出現的比例（支持度）。', [
        '最高單項：' + R.c1.slice().sort((a, b) => b.sup - a.sup)[0].label + ' (' + f(R.c1.slice().sort((a, b) => b.sup - a.sup)[0].sup, 2) + ')'
      ]);

      st.prune1 = true;
      add(2, '剪枝得 L1', '把支持度低於 ' + f(minSup, 2) + ' 的單項剪掉，留下 ' + R.l1.length + ' 個頻繁單項。', [
        '保留 L1：' + R.l1.map(x => x.label).join('、')
      ]);

      st.stage = 2;
      add(3, '組合候選兩項 C2', '把 L1 裡保留的 ' + R.l1.length + ' 個藥品兩兩配對，共產生 ' + R.c2.length + ' 個候選兩項。', [
        '不頻繁單項的組合根本不需產生！'
      ]);

      st.prune2 = true;
      add(4, '掃描並剪枝得 L2', '掃描處方算 C2 支持度，留下 ' + R.l2.length + ' 個頻繁兩項組合。', [
        R.l2.length ? 'L2 前三：' + R.l2.slice(0, 3).map(x => x.label + '(' + f(x.sup, 2) + ')').join('、') : '無兩項通過'
      ]);

      st.stage = 3;
      add(5, '產生候選三項 C3', '由 L2 合併產生候選三項，並檢查所有 2-子集是否都在 L2 裡（Apriori 性質）。', [
        '通過剪枝檢查的 C3 共 ' + R.c3.length + ' 個'
      ]);

      st.prune3 = true;
      add(6, '掃描並剪枝得 L3', '計算 C3 支持度，留下 ' + R.l3.length + ' 個頻繁三項組合。', [
        '全部頻繁項目集共 ' + (R.l1.length + R.l2.length + R.l3.length) + ' 個'
      ]);

      st.showRules = true;
      add(7, '產生關聯規則', '把頻繁項目集拆成「前項 → 後項」，篩出信賴度 ≥ ' + f(p.min_conf, 2) + ' 的規則（共 ' + R.rules.length + ' 條）。', [
        R.rules.length ? '最強規則：' + R.rules[0].text + ' (Lift=' + f(R.rules[0].lift, 2) + ')' : '無規則通過門檻'
      ]);

      st.warnTrap = true;
      add(8, '檢查 Lift < 1 陷阱', '高信賴度不代表正相關！若後項本來就幾乎每張處方都有，Lift 可能小於 1（負相關或無關）。', [
        R.trap ? '陷阱範例：' + R.trap.text + '（Conf=' + f(R.trap.conf, 2) + ', Lift=' + f(R.trap.lift, 2) + '）' : '本次規則的 Lift 皆 ≥ 1'
      ]);

      while (steps.length < 10) {
        add(8, 'Apriori 的缺點', '每往下一層都要重新掃描整份交易資料，交易筆數一多就會很慢——下一個實驗 FP-Growth 會解決這個問題。', [
          '頻繁項目集共 ' + (R.l1.length + R.l2.length + R.l3.length) + ' 個，規則 ' + R.rules.length + ' 條'
        ]);
      }
      return steps;
    },

    keys(steps, rows, p) {
      const R = runApriori(rows, p);
      const k = {
        n_l1: R.l1.length, n_l2: R.l2.length, n_l3: R.l3.length,
        n_freq: R.l1.length + R.l2.length + R.l3.length,
        n_rules: R.rules.length
      };
      R.freqMap.forEach((sup, key) => { k['sup_' + key] = sup; });
      R.rules.forEach((r, idx) => {
        if (idx < 10) {
          k['rule_' + idx + '_conf'] = r.conf;
          k['rule_' + idx + '_lift'] = r.lift;
        }
      });
      return k;
    },

    explain(steps, rows, p) {
      const R = runApriori(rows, p);
      return [
        '在最小支持度 ' + f(p.min_sup, 2) + ' 下，Apriori 共找出 ' + (R.l1.length + R.l2.length + R.l3.length) + ' 個頻繁項目集（L1=' + R.l1.length + '、L2=' + R.l2.length + '、L3=' + R.l3.length + '）。',
        '以最小信賴度 ' + f(p.min_conf, 2) + ' 篩選出 ' + R.rules.length + ' 條關聯規則。',
        '實務上必須同時看 Lift（增益度）：Lift > 1 才是真正的正向共現；Lift < 1 即使信賴度高也只是假象。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Numerical to Polynominal', 'FP-Growth', 'Create Association Rules'],
      params: [
        ['FP-Growth › min support', p => String(p.min_sup)],
        ['Create Association Rules › min confidence', p => String(p.min_conf)]
      ],
      note: 'AI Studio 沒有獨立的 Apriori 運算子，需以 FP-Growth 找出頻繁項目集，再接 Create Association Rules（兩者頻繁項目集完全相同）。',
      expect: (steps, rows, p) => {
        const R = runApriori(rows, p);
        return ['頻繁項目集共 ' + (R.l1.length + R.l2.length + R.l3.length) + ' 個，規則 ' + R.rules.length + ' 條'];
      },
      python: `from mlxtend.frequent_patterns import apriori, association_rules\nfreq = apriori(df_bool, min_support=0.25, use_colnames=True)\nrules = association_rules(freq, metric='confidence', min_threshold=0.6)`,
      confirmed: false
    }
  });
})();
