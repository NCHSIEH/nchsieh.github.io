/* A4 類別編碼 */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const DEPTS = ['內科', '外科', '急診'];
  const D_CODES = ['med', 'surg', 'er'];
  const COLS = [
    { key: 'age', label: '年齡', unit: '歲', type: 'num', min: 20, max: 95, step: 1, role: 'x' },
    { key: 'los', label: '住院天數', unit: '天', type: 'num', min: 1, max: 30, step: 1, role: 'x' },
    { key: 'dept', label: '入院科別', type: 'cat', levels: DEPTS, codes: D_CODES, role: 'x' },
    { key: 'readmit', label: '30 天再入院', type: 'cat', levels: ['否', '是'], codes: ['no', 'yes'], role: 'y' }
  ];

  function makeRows(seed) {
    const r = LAB.rng(8100 + seed);
    const base = LAB.data.readmit(seed, 12);
    const depts = LAB.shuffle(r, [0, 0, 0, 0, 1, 1, 1, 1, 2, 2, 2, 2]);
    const out = base.map((o, i) => ({ id: o.id, age: o.age, los: o.los, dept: depts[i], readmit: o.readmit }));
    const ensurePos = (deptIdx, minPos) => {
      const grp = out.filter(x => x.dept === deptIdx).sort((a, b) => (b.los * 3 + b.age) - (a.los * 3 + a.age));
      let cur = grp.filter(x => x.readmit === 1).length;
      for (let i = 0; i < grp.length && cur < minPos; i++) {
        if (grp[i].readmit === 0) { grp[i].readmit = 1; cur++; }
      }
    };
    ensurePos(2, 3);
    ensurePos(0, 1);
    return out;
  }

  function encode(rows, p) {
    const prior = M.mean(rows.map(r => r.readmit));
    const m = p.smoothing || 0;
    const stats = DEPTS.map((name, idx) => {
      const sub = rows.filter(r => r.dept === idx);
      const n = sub.length, pos = sub.filter(r => r.readmit === 1).length;
      const rawMean = n ? pos / n : prior;
      const smooth = (n * rawMean + m * prior) / (n + m);
      return { idx, name, code: D_CODES[idx], n, pos, rawMean, smooth };
    });
    const encoded = rows.map(r => ({
      id: r.id,
      age: r.age,
      los: r.los,
      dept: r.dept,
      oh_med: r.dept === 0 ? 1 : 0,
      oh_surg: r.dept === 1 ? 1 : 0,
      oh_er: r.dept === 2 ? 1 : 0,
      tgt: stats[r.dept].smooth,
      readmit: r.readmit
    }));
    return { prior, m, stats, encoded };
  }

  LAB.register({
    id: 'A4', group: 'A', title: '類別編碼',
    module: { name: 'M1 第 11 節', url: '../m1/#p11' },
    goal: '看懂 One-hot、Dummy 與目標編碼如何把文字類別轉成數字欄位，並理解共線性與資料洩漏的差異。',
    data: {
      name: 'readmit_dept',
      scenario: '出院再入院：將三類別的「入院科別」（內科／外科／急診）轉換成模型可讀取的數值欄位',
      columns: COLS,
      small: seed => makeRows(seed),
      exports: (rows, p) => {
        const E = encode(rows, p);
        const cols = [
          { key: 'id', label: '#' },
          { key: 'age', label: '年齡' },
          { key: 'los', label: '住院天數' },
          { key: 'oh_med', label: 'dept_med' },
          { key: 'oh_surg', label: 'dept_surg' },
          { key: 'oh_er', label: 'dept_er' },
          { key: 'tgt', label: 'dept_target' },
          { key: 'readmit', label: 'readmit' }
        ];
        return [{ name: 'lab_A4_encoded.csv', rows: E.encoded, columns: cols }];
      }
    },
    params: [
      { key: 'method', label: '編碼方式', type: 'choice', value: 'onehot', options: [{ v: 'onehot', label: 'One-hot' }, { v: 'dummy', label: 'Dummy (去一欄)' }, { v: 'target', label: '目標編碼' }] },
      { key: 'smoothing', label: '平滑強度 m', type: 'int', min: 0, max: 10, step: 1, value: 2 }
    ],
    pseudo: [
      '盤點類別欄的所有不重複類別',
      '統計每個類別的筆數與陽性數',
      '依選擇的方式產生新欄位：',
      '  One-hot：每個類別各長一欄 0/1',
      '  Dummy：去掉基準欄避免共線性',
      '  目標編碼：以平滑後陽性率取代',
      '檢查新欄位並留意洩漏風險'
    ],
    build(rows, p) {
      const R = encode(rows, p), steps = [];

      function views(st) {
        const cols = [{ key: 'id', label: '#' }, { key: 'dept', label: '入院科別' }, { key: 'y', label: '再入院' }];
        if (p.method === 'onehot') {
          if (st.c >= 1) cols.push({ key: 'c0', label: '內科', num: true, digits: 0 });
          if (st.c >= 2) cols.push({ key: 'c1', label: '外科', num: true, digits: 0 });
          if (st.c >= 3) cols.push({ key: 'c2', label: '急診', num: true, digits: 0 });
        } else if (p.method === 'dummy') {
          if (st.c >= 1) cols.push({ key: 'c1', label: '外科', num: true, digits: 0 });
          if (st.c >= 2) cols.push({ key: 'c2', label: '急診', num: true, digits: 0 });
        } else {
          if (st.c >= 1) cols.push({ key: 'tgt', label: '目標編碼', num: true, digits: 3 });
        }

        const trs = R.encoded.map(r => {
          const cells = [r.id, DEPTS[r.dept], { v: r.readmit ? '是' : '否', cls: r.readmit ? 'c1' : 'c0' }];
          if (p.method === 'onehot') {
            if (st.c >= 1) cells.push({ v: r.oh_med, cls: r.oh_med ? 'new' : null });
            if (st.c >= 2) cells.push({ v: r.oh_surg, cls: r.oh_surg ? 'new' : null });
            if (st.c >= 3) cells.push({ v: r.oh_er, cls: r.oh_er ? 'new' : null });
          } else if (p.method === 'dummy') {
            if (st.c >= 1) cells.push({ v: r.oh_surg, cls: r.oh_surg ? 'new' : null });
            if (st.c >= 2) cells.push({ v: r.oh_er, cls: r.oh_er ? 'new' : null });
          } else {
            if (st.c >= 1) cells.push({ v: r.tgt, cls: st.done ? 'new' : null });
          }
          return { id: r.id, cells, hl: st.hlDept === r.dept };
        });

        const main = {
          type: 'table', slot: 'main',
          title: '類別編碼轉換表',
          cols, rows: trs
        };
        const sideItems = R.stats.map(s => ({
          id: s.code,
          label: s.name + ' (' + s.pos + '/' + s.n + '陽)',
          value: p.method === 'target' ? s.smooth : s.n,
          cls: 'c' + s.idx,
          hl: st.hlDept === s.idx
        }));
        if (p.method === 'target') {
          sideItems.push({ id: 'prior', label: '整體平均 (先驗)', value: R.prior, cls: 'c5' });
        }
        const side = {
          type: 'bars', slot: 'side',
          title: p.method === 'target' ? '各科別目標編碼值（向先驗收縮）' : '各科別病人數',
          max: p.method === 'target' ? 1 : Math.max(4, rows.length / 2),
          digits: p.method === 'target' ? 3 : 0,
          items: sideItems
        };
        const bottom = {
          type: 'table', slot: 'bottom',
          title: '三種類別編碼策略全維度對照（共線性 vs 維度爆炸 vs 資料洩漏）',
          cols: [
            { key: 'm', label: '編碼法' },
            { key: 'dim', label: '新增欄數 (k=3)' },
            { key: 'col', label: '完全共線性' },
            { key: 'leak', label: '標籤洩漏風險' },
            { key: 'fit', label: '最適合模型與防呆重點' }
          ],
          rows: [
            { id: 'oh', cells: ['One-hot', 'k = 3 欄', { v: '有 (Σ欄=1)', cls: 'bad' }, { v: '無 (不用 y)', cls: 'good' }, '決策樹／隨機森林／有 L2 正則之模型'], hl: p.method === 'onehot' },
            { id: 'dm', cells: ['Dummy (去一欄)', 'k − 1 = 2 欄', { v: '無 (內科作基準)', cls: 'good' }, { v: '無 (不用 y)', cls: 'good' }, 'OLS 線性迴歸／Logistic 迴歸（可解讀相對於基準組之勝算比）'], hl: p.method === 'dummy' },
            { id: 'tg', cells: ['目標編碼 (m=' + R.m + ')', '1 欄 (連續值)', { v: '無 (單一欄)', cls: 'good' }, { v: '高 (必折內算)', cls: 'bad' }, '高基數類別（如數百個診斷碼 ICD）；嚴禁切分前用全資料計算'], hl: p.method === 'target' }
          ]
        };
        return [main, side, bottom];
      }

      const st = { c: 0, hlDept: -1, done: false };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '題目', '「入院科別」是文字類別（內科、外科、急診），機器學習模型無法直接做乘法，必須先轉成數字。', [
        '共有 ' + DEPTS.length + ' 種科別，整體再入院率 = ' + f(R.prior, 3)
      ]);

      R.stats.forEach(s => {
        st.hlDept = s.idx;
        add(2, '盤點：' + s.name, '統計「' + s.name + '」的病人數與 30 天再入院陽性數。', [
          s.name + '：共 ' + s.n + ' 人，再入院 ' + s.pos + ' 人（原始陽性率 ' + f(s.rawMean, 3) + '）'
        ]);
      });
      st.hlDept = -1;

      if (p.method === 'onehot') {
        R.stats.forEach((s, i) => {
          st.c = i + 1; st.hlDept = s.idx;
          add(4, '長出欄位：' + s.name, '為「' + s.name + '」新增一個 0/1 欄位：屬於該科別填 1，其餘填 0。', [
            '新增「' + s.name + '」欄（有 ' + s.n + ' 筆填 1）'
          ]);
        });
        st.hlDept = -1; st.done = true;
        add(7, 'One-hot 編碼完成', '三個類別共展開成 3 個 0/1 欄位，任何一列都恰好有一個 1、兩個 0。', [
          '共新增 3 欄：內科、外科、急診'
        ]);
      } else if (p.method === 'dummy') {
        add(5, '選定基準類別：內科', '若保留全部 3 欄，三欄相加永遠等於 1，會造成線性模型矩陣不可逆，所以把「內科」設為基準不建欄。', [
          '基準類別 = 內科（當外科=0 且急診=0 即代表內科）'
        ]);
        st.c = 1; st.hlDept = 1;
        add(5, '長出欄位：外科', '建立「外科」0/1 欄位，係數代表外科相對於內科的差異。', ['外科 = 1 共 ' + R.stats[1].n + ' 筆']);
        st.c = 2; st.hlDept = 2;
        add(5, '長出欄位：急診', '建立「急診」0/1 欄位，係數代表急診相對於內科的差異。', ['急診 = 1 共 ' + R.stats[2].n + ' 筆']);
        st.hlDept = -1; st.done = true;
        add(7, 'Dummy 編碼完成', 'k 個類別只展開成 k − 1 = 2 個欄位，既保留完整資訊又避開共線性。', [
          '共新增 2 欄：外科、急診'
        ]);
      } else {
        st.c = 1;
        R.stats.forEach(s => {
          st.hlDept = s.idx;
          add(6, '平滑計算：' + s.name, '用平滑參數 m = ' + R.m + ' 把樣本數少的類別往整體平均 ' + f(R.prior, 3) + ' 拉回一點。', [
            '(' + s.n + '×' + f(s.rawMean, 3) + ' + ' + R.m + '×' + f(R.prior, 3) + ') ÷ (' + s.n + '+' + R.m + ') = ' + f(s.smooth, 3)
          ]);
        });
        st.hlDept = -1; st.done = true;
        add(7, '目標編碼完成', '只用 1 個數值欄位就代表整個類別，但務必只在訓練集內計算，避免標籤洩漏。', [
          R.stats.map(s => s.name + '=' + f(s.smooth, 3)).join('｜')
        ]);
      }

      add(7, '無序 vs 有序編碼', '科別屬「無序類別」，絕不可隨意編成 1/2/3；若為 CKD 1–5 期或疼痛分級等「有序類別」，則適用有序編碼保留大小順序。', [
        '無序類別（科別／血型）→ One-hot / Dummy / Target',
        '有序類別（分期／疼痛 1–5）→ Ordinal Encoding'
      ]);
      add(7, '防洩漏與匯出應用', '目標編碼動用了標籤 y，務必在訓練折內計算（見 A10 實證）。可點上方「匯出 CSV」下載編碼表到 AI Studio 測試。', [
        '編碼完成：共 ' + rows.length + ' 筆（lab_A4_encoded.csv）'
      ]);
      return steps;
    },

    keys(steps, rows, p) {
      const R = encode(rows, p);
      const k = { prior: R.prior };
      R.stats.forEach(s => {
        k['n_' + s.code] = s.n;
        k['pos_' + s.code] = s.pos;
        k['tgt_' + s.code] = s.smooth;
      });
      return k;
    },

    explain(steps, rows, p) {
      const R = encode(rows, p);
      return [
        '12 位病人中，內科 ' + R.stats[0].n + ' 人、外科 ' + R.stats[1].n + ' 人、急診 ' + R.stats[2].n + ' 人，整體 30 天再入院率為 ' + f(R.prior, 3) + '。',
        'One-hot 產生 3 個欄位；Dummy 去掉基準類別「內科」產生 2 個欄位以避開完全共線性。',
        '目標編碼（平滑 m = ' + R.m + '）將三科別轉為數值 ' + R.stats.map(s => s.name + ' ' + f(s.smooth, 3)).join('、') + '，實務上須在訓練折內計算以防止資料洩漏。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Nominal to Numerical'],
      params: [
        ['Nominal to Numerical › coding type', p => p.method === 'dummy' ? 'dummy coding (with reference)' : 'dummy coding']
      ],
      note: 'AI Studio 的 Nominal to Numerical 支援 dummy coding / effect coding / unique integers；若要做目標編碼（Target Encoding），需自行聚合或使用 Execute Python。',
      expect: (steps, rows, p) => {
        const R = encode(rows, p);
        return ['各科別目標編碼：' + R.stats.map(s => s.name + '=' + f(s.smooth, 3)).join(', ')];
      },
      python: `import pandas as pd\npd.get_dummies(df['dept'], drop_first=(method=='dummy'))`,
      confirmed: false
    }
  });
})();
