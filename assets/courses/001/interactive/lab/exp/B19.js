/* B19 機率校準與 Brier 分數 */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = [
    { key: 'raw_p', label: '原始預測機率', type: 'num', min: 0.01, max: 0.99, step: 0.01, role: 'x' },
    { key: 'y', label: '實際發病', type: 'cat', levels: ['否', '是'], codes: ['no', 'yes'], role: 'y' }
  ];

  function makeRows(seed) {
    const r = LAB.rng(2919 + seed);
    // 模擬過度自信模型（例如 Naive Bayes / 未校準 Boosting）：
    // 低風險端過度壓低（如 0.02–0.12 卻有 20–25% 發病）、高風險端過度膨脹（如 0.90–0.98 卻僅 65–75% 發病）
    const base = [
      [0.03, 0], [0.05, 0], [0.07, 1], [0.09, 0], [0.12, 0],
      [0.16, 1], [0.22, 0], [0.31, 0], [0.38, 1], [0.46, 0],
      [0.54, 1], [0.62, 0], [0.71, 1], [0.79, 0], [0.86, 1],
      [0.91, 1], [0.94, 0], [0.96, 1], [0.97, 1], [0.98, 1]
    ];
    return base.map((pt, i) => ({
      id: i + 1,
      raw_p: Math.round(M.clamp(pt[0] + (r() - 0.5) * 0.02, 0.02, 0.98) * 100) / 100,
      y: pt[1]
    }));
  }

  function logit(p) {
    const c = M.clamp(p, 1e-4, 1 - 1e-4);
    return Math.log(c / (1 - c));
  }

  function fitPlatt(rawPs, ys) {
    const n = rawPs.length;
    const xs = rawPs.map(logit);
    let a = 1.0, b = 0.0;
    for (let ep = 0; ep < 300; ep++) {
      let ga = 0, gb = 0;
      for (let i = 0; i < n; i++) {
        const pr = M.sigmoid(a * xs[i] + b);
        const e = pr - ys[i];
        ga += e * xs[i] / n;
        gb += e / n;
      }
      a -= 0.4 * ga;
      b -= 0.4 * gb;
    }
    return { a, b, probs: xs.map(x => M.sigmoid(a * x + b)) };
  }

  // 保序迴歸 PAVA (Pool Adjacent Violators Algorithm)
  function fitIsotonic(rawPs, ys) {
    const idx = M.range(rawPs.length).sort((i, j) => rawPs[i] - rawPs[j] || i - j);
    const blocks = idx.map(i => ({ ids: [i], sum: ys[i], cnt: 1, val: ys[i] }));
    let k = 0;
    while (k < blocks.length - 1) {
      if (blocks[k].val > blocks[k + 1].val + 1e-12) {
        blocks[k].ids = blocks[k].ids.concat(blocks[k + 1].ids);
        blocks[k].sum += blocks[k + 1].sum;
        blocks[k].cnt += blocks[k + 1].cnt;
        blocks[k].val = blocks[k].sum / blocks[k].cnt;
        blocks.splice(k + 1, 1);
        if (k > 0) k--;
      } else {
        k++;
      }
    }
    const probs = new Array(rawPs.length);
    blocks.forEach(bl => bl.ids.forEach(i => { probs[i] = bl.val; }));
    return { probs, nBlocks: blocks.length };
  }

  function brierScore(ps, ys) {
    return M.mean(ps.map((p, i) => (p - ys[i]) ** 2));
  }

  function reliabilityBins(ps, ys, nBins) {
    const n = ps.length;
    const bins = [];
    let ece = 0;
    for (let b = 0; b < nBins; b++) {
      const lo = b / nBins, hi = (b + 1) / nBins;
      const items = [];
      for (let i = 0; i < n; i++) {
        if ((b === nBins - 1) ? (ps[i] >= lo && ps[i] <= hi + 1e-9) : (ps[i] >= lo && ps[i] < hi)) {
          items.push({ p: ps[i], y: ys[i] });
        }
      }
      if (!items.length) {
        bins.push({ b, label: f(lo, 2) + '–' + f(hi, 2), n: 0, conf: null, acc: null, gap: 0 });
      } else {
        const conf = M.mean(items.map(x => x.p));
        const acc = M.mean(items.map(x => x.y));
        const gap = Math.abs(acc - conf);
        ece += (items.length / n) * gap;
        bins.push({ b, label: f(lo, 2) + '–' + f(hi, 2), n: items.length, conf, acc, gap });
      }
    }
    return { bins, ece };
  }

  function rocAuc(ps, ys) {
    const pos = [], neg = [];
    for (let i = 0; i < ps.length; i++) (ys[i] === 1 ? pos : neg).push(ps[i]);
    if (!pos.length || !neg.length) return 0.5;
    let wins = 0;
    pos.forEach(pp => neg.forEach(np => {
      if (pp > np + 1e-12) wins += 1;
      else if (Math.abs(pp - np) <= 1e-12) wins += 0.5;
    }));
    return wins / (pos.length * neg.length);
  }

  function analyze(rows, p) {
    const nBins = Math.max(3, Math.min(5, Math.round(p.bins || 4)));
    const method = p.method || 'platt';
    const rawPs = rows.map(r => r.raw_p);
    const ys = rows.map(r => r.y);

    const platt = fitPlatt(rawPs, ys);
    const iso = fitIsotonic(rawPs, ys);

    const bsRaw = brierScore(rawPs, ys);
    const bsPlatt = brierScore(platt.probs, ys);
    const bsIso = brierScore(iso.probs, ys);

    const relRaw = reliabilityBins(rawPs, ys, nBins);
    const relPlatt = reliabilityBins(platt.probs, ys, nBins);
    const relIso = reliabilityBins(iso.probs, ys, nBins);

    const aucRaw = rocAuc(rawPs, ys);
    const aucPlatt = rocAuc(platt.probs, ys);
    const aucIso = rocAuc(iso.probs, ys);

    return {
      nBins, method, rawPs, ys, platt, iso,
      bsRaw, bsPlatt, bsIso,
      relRaw, relPlatt, relIso,
      aucRaw, aucPlatt, aucIso
    };
  }

  LAB.register({
    id: 'B19', group: 'B', title: '機率校準與 Brier 分數',
    module: { name: 'M2-2 機率校準', url: '../m2-2/#p10' },
    goal: '檢驗模型輸出的風險機率是否「說 70% 就真的有 70% 發病」：以可靠性曲線、Brier 分數與預期校準誤差 (ECE) 診斷過度自信模型，並比較 Platt Scaling 與保序迴歸 (Isotonic) 的校準效果。',
    data: {
      name: 'clinic_calib',
      scenario: '門診風險模型輸出：20 位病人的原始機率呈過度自信 S 型失真，需做機率校準供臨床決策',
      columns: COLS,
      editable: ['raw_p', 'y'],
      small: makeRows
    },
    params: [
      { key: 'method', label: '校準方法', type: 'choice', value: 'platt', options: [
        { v: 'raw', label: '未校準原始機率' },
        { v: 'platt', label: 'Platt Scaling (Sigmoid)' },
        { v: 'iso', label: '保序迴歸 (Isotonic)' }
      ] },
      { key: 'bins', label: '可靠性分箱數', type: 'int', min: 3, max: 5, step: 1, value: 4 }
    ],
    pseudo: [
      '將預測機率切分為 B 個等寬區間',
      '算每箱的平均預測機率與實際發病率',
      '繪製可靠性曲線對照完美對角線 y=x',
      '算 Brier Score = mean((p − y)²)',
      '算預期校準誤差 ECE 加權平均差',
      '依選擇套用校準器：',
      '  Platt：Sigmoid 壓縮過度自信',
      '  Isotonic：PAVA 單調階梯校正',
      '驗證校準後 Brier/ECE 下降且 AUC 不掉'
    ],
    build(rows, p) {
      const R = analyze(rows, p), steps = [];
      const curRel = R.method === 'raw' ? R.relRaw : (R.method === 'platt' ? R.relPlatt : R.relIso);
      const curBs = R.method === 'raw' ? R.bsRaw : (R.method === 'platt' ? R.bsPlatt : R.bsIso);
      const mName = R.method === 'raw' ? '未校準原始機率' : (R.method === 'platt' ? 'Platt Scaling' : 'Isotonic 保序迴歸');

      function toCurvePts(rel) {
        return rel.bins.filter(b => b.n > 0).map(b => [b.conf, b.acc]);
      }

      function views(st) {
        const series = [
          { id: 'perf', label: '完美校準線 (y = x)', pts: [[0, 0], [1, 1]], cls: 'c5', dash: true, dots: false }
        ];
        if (st.showRaw) {
          series.push({ id: 'raw', label: '未校準原始 (BS=' + f(R.bsRaw, 3) + ')', pts: toCurvePts(R.relRaw), cls: 'c4', dots: true });
        }
        if (st.showCal && R.method !== 'raw') {
          series.push({ id: 'cal', label: mName + ' (BS=' + f(curBs, 3) + ')', pts: toCurvePts(curRel), cls: 'good', dots: true });
        }
        const activeRel = (st.showCal && R.method !== 'raw') ? curRel : R.relRaw;
        const main = {
          type: 'line', slot: 'main',
          title: '可靠性曲線 Reliability Diagram（越貼近虛線對角線越準確）',
          axes: { x: { label: '區間平均預測機率 (Confidence)', min: 0, max: 1 }, y: { label: '實際發病比例 (Fraction of Positives)', min: 0, max: 1 } },
          series
        };
        const side = {
          type: 'table', slot: 'side',
          title: (st.showCal && R.method !== 'raw' ? (mName + ' 校準後') : '未校準原始機率') + '各區間校準誤差',
          cols: [
            { key: 'bin', label: '機率區間' },
            { key: 'n', label: '人數', num: true, digits: 0 },
            { key: 'cf', label: '平均預測', num: true, digits: 2 },
            { key: 'ac', label: '實際發病', num: true, digits: 2 },
            { key: 'gp', label: '|誤差|', num: true, digits: 2 }
          ],
          rows: activeRel.bins.map((b, bi) => ({
            id: 'b' + bi,
            cells: [
              b.label, b.n,
              b.n ? b.conf : null,
              b.n ? b.acc : null,
              b.n ? { v: f(b.gap, 2), cls: b.gap > 0.15 ? 'bad' : 'good' } : null
            ],
            hl: st.hlBin === bi
          }))
        };
        const bottom = {
          type: 'bars', slot: 'bottom',
          title: 'Brier Score 與 ECE 校準誤差比較（兩者皆越低越好）',
          max: Math.max(0.30, R.bsRaw * 1.25, R.relRaw.ece * 1.25),
          digits: 3,
          items: [
            { id: 'bsr', label: '原始 Brier Score', value: st.showMetrics ? R.bsRaw : 0, cls: 'c4' },
            { id: 'bsp', label: 'Platt Brier Score', value: st.showCal ? R.bsPlatt : 0, cls: 'c0', hl: R.method === 'platt' && st.showCal },
            { id: 'bsi', label: 'Isotonic Brier Score', value: st.showCal ? R.bsIso : 0, cls: 'good', hl: R.method === 'iso' && st.showCal },
            { id: 'ecr', label: '原始 ECE 誤差', value: st.showMetrics ? R.relRaw.ece : 0, cls: 'c1' },
            { id: 'ecc', label: '校準後 ECE (' + mName + ')', value: st.showCal ? curRel.ece : 0, cls: 'c2', hl: st.showCal }
          ]
        };
        return [main, side, bottom];
      }

      const st = { showRaw: false, showMetrics: false, showCal: false, hlBin: -1 };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '1. 為什麼要機率校準？', 'ROC-AUC 高只代表「排序對」，不代表「機率準」！若模型說病人有 95% 發病率卻只有 70% 發病，醫師就會過度處置。', [
        '20 位門診病人：原始 ROC-AUC = ' + f(R.aucRaw, 3) + '（排序不差，但機率可靠嗎？）'
      ]);

      st.showRaw = true;
      add(1, '2. 切分機率區間分箱', '把 0–1 切成 ' + R.nBins + ' 個區間，分別計算每箱的「平均預測機率」與「實際發病比例」。', [
        R.relRaw.bins.filter(b => b.n > 0).map(b => b.label + '(' + b.n + '人)').join('｜')
      ]);

      const lastBin = R.relRaw.bins.length - 1;
      st.hlBin = lastBin;
      add(2, '3. 診斷過度自信 S 曲線', '看主圖紅線：高機率區間落在對角線「下方」（過度高估風險），低機率區間落在「上方」（低估風險），呈現典型過度自信！', [
        '最高箱：預測 ' + f(R.relRaw.bins[lastBin].conf, 2) + ' vs 實際 ' + f(R.relRaw.bins[lastBin].acc, 2)
      ]);

      st.hlBin = -1; st.showMetrics = true;
      add(3, '4. 算 Brier 分數', 'Brier Score = mean((p − y)²) 類似機率的 MSE，同時衡量校準度與區分度，越接近 0 越好（全猜 0.5 時為 0.25）。', [
        '原始未校準 Brier Score = ' + f(R.bsRaw, 4)
      ]);

      add(4, '5. 計算預期校準誤差', 'ECE 將每箱的 |實際發病率 − 平均預測| 依人數加權平均，直接告訴你模型機率平均偏離真相多少個百分點。', [
        '原始未校準 ECE = ' + f(R.relRaw.ece, 4) + '（平均偏誤約 ' + LAB.pct(R.relRaw.ece, 1) + '）'
      ]);

      st.showCal = true;
      if (R.method === 'platt') {
        add(6, '6. Platt 校準', '對原始機率的 log-odds 再擬合一層 1D Logistic 迴歸 p′ = σ(a·logit(p) + b)，斜率 a < 1 把過度極端的機率溫和拉回中間！', [
          '學得參數：a = ' + f(R.platt.a, 3) + '，b = ' + f(R.platt.b, 3),
          'Platt Brier = ' + f(R.bsPlatt, 4) + '｜ECE = ' + f(R.relPlatt.ece, 4)
        ]);
      } else if (R.method === 'iso') {
        add(7, '6. Isotonic 保序校準', '保序迴歸用 PAVA 演算法將違反單調性的相鄰樣本合併取平均，不假設 S 型形狀，自由貼合任意非線性失真！', [
          '合併為 ' + R.iso.nBlocks + ' 個單調階梯區塊',
          'Isotonic Brier = ' + f(R.bsIso, 4) + '｜ECE = ' + f(R.relIso.ece, 4)
        ]);
      } else {
        add(5, '6. 保持未校準對照', '目前選在「未校準原始機率」；切換上方「Platt Scaling」或「保序迴歸」即可看到曲線瞬間貼近完美對角線！', [
          '未校準：BS=' + f(R.bsRaw, 4) + '｜Platt BS=' + f(R.bsPlatt, 4) + '｜Iso BS=' + f(R.bsIso, 4)
        ]);
      }

      add(8, '7. 校準不傷 ROC-AUC', 'Platt Scaling 屬嚴格單調遞增轉換，因此完全保留原本的 ROC-AUC 排序力（' + f(R.aucRaw, 3) + ' → ' + f(R.aucPlatt, 3) + '），卻讓風險數字變得可信！', [
        'ROC-AUC：原 ' + f(R.aucRaw, 3) + '｜Platt ' + f(R.aucPlatt, 3) + '｜Isotonic ' + f(R.aucIso, 3)
      ]);

      add(8, '8. 兩種校準法選用', '樣本少（<1000 筆）優先用 Platt Scaling（僅 2 個參數不易過擬合）；樣本充足且失真非對稱時，Isotonic 保序迴歸更靈活。', [
        'Brier 降幅：Platt ' + f(R.bsRaw - R.bsPlatt, 4) + '｜Isotonic ' + f(R.bsRaw - R.bsIso, 4)
      ]);

      add(8, '9. 哪些模型最需要校準？', 'Logistic 迴歸天然校準良好；但 Naive Bayes、SVM、隨機森林與未校準的深度網路／Boosting 常需額外校準！', [
        'sklearn：CalibratedClassifierCV(method="sigmoid" / "isotonic")'
      ]);

      add(8, '10. 切記防洩漏原則', '校準器不可在模型自己的訓練集上擬合（否則會再過擬合一次），必須用獨立驗證集或 CV 折外預測（見 A10 與 B13）！', [
        '流程：訓練集訓模型 → 驗證折 fit 校準器 → 測試集驗收 BS/ECE'
      ]);
      return steps;
    },

    keys(steps, rows, p) {
      const R = analyze(rows, p);
      return {
        bs_raw: R.bsRaw,
        bs_platt: R.bsPlatt,
        bs_iso: R.bsIso,
        ece_raw: R.relRaw.ece,
        ece_platt: R.relPlatt.ece,
        ece_iso: R.relIso.ece,
        auc_raw: R.aucRaw,
        auc_platt: R.aucPlatt
      };
    },

    explain(steps, rows, p) {
      const R = analyze(rows, p);
      return [
        '原始模型雖有不錯的排序能力（ROC-AUC = ' + f(R.aucRaw, 3) + '），但預測機率呈現過度自信失真，Brier Score = ' + f(R.bsRaw, 4) + '、ECE = ' + f(R.relRaw.ece, 4) + '。',
        '經 Platt Scaling 校準後，ROC-AUC 維持不變（' + f(R.aucPlatt, 3) + '），但 Brier Score 降至 ' + f(R.bsPlatt, 4) + '、ECE 降至 ' + f(R.relPlatt.ece, 4) + '；保序迴歸進一步降至 BS = ' + f(R.bsIso, 4) + '。',
        '在臨床風險溝通與醫療成本決策（如 B16 門檻設定）中，務必先透過獨立驗證集或 CalibratedClassifierCV 完成機率校準。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Set Role', 'Platt Scaling', 'Apply Model', 'Performance (Binominal)'],
      params: [
        ['Platt Scaling', '接在 SVM / Naive Bayes 後方，於獨立驗證集校準信心值'],
        ['Performance (Binominal) › squared_error', '檢視 Brier Score（機率平方誤差）']
      ],
      note: 'AI Studio 內建 Platt Scaling（以及 Isotonic Regression 擴充）可直接校準分類器輸出的 confidence；務必在獨立校準集或 Cross Validation 內進行。',
      expect: (steps, rows, p) => {
        const R = analyze(rows, p);
        return [
          '原始 Brier = ' + f(R.bsRaw, 4) + ' → Platt = ' + f(R.bsPlatt, 4) + ' / Isotonic = ' + f(R.bsIso, 4)
        ];
      },
      python: `from sklearn.calibration import CalibratedClassifierCV, calibration_curve\nfrom sklearn.metrics import brier_score_loss\ncal = CalibratedClassifierCV(base_clf, method='sigmoid', cv=5).fit(X_train, y_train)\nbs = brier_score_loss(y_test, cal.predict_proba(X_test)[:, 1])`,
      confirmed: false
    }
  });
})();
