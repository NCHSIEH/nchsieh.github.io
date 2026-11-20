/* B15 Rule Induction 規則歸納 */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = LAB.data.columns('clinic', ['glu', 'bmi', 'dm'], { dm: 'y' });
  const AX = { x: { label: '空腹血糖 (mg/dL)', min: 65, max: 210 }, y: { label: 'BMI (kg/m²)', min: 17, max: 39 } };
  const cls = y => y ? 'c1' : 'c0';

  function makeRows(seed) {
    const rs = LAB.data.clinic(seed, 14).map(r => ({ id: r.id, glu: r.glu, bmi: r.bmi, dm: r.dm }));
    const negs = rs.filter(r => r.dm === 0);
    const poss = rs.filter(r => r.dm === 1);
    if (negs[0] && poss[0]) {
      negs[0].glu = 126; negs[0].bmi = 22.0;
      poss[0].glu = 108; poss[0].bmi = 32.5;
    }
    return rs;
  }

  function learnRules(rows, p) {
    const maxRules = Math.max(1, Math.min(4, Math.round(p.max_rules || 2)));
    const minCov = Math.max(1, Math.min(3, Math.round(p.min_cov || 2)));
    let rem = rows.slice();
    const rules = [];

    for (let ri = 0; ri < maxRules; ri++) {
      const posRem = rem.filter(r => r.dm === 1);
      if (posRem.length < minCov) break;

      // 候選單條件或雙條件矩形規則（針對未覆蓋正樣本）
      const gluThs = Array.from(new Set(rem.map(r => r.glu))).sort((a, b) => a - b);
      const bmiThs = Array.from(new Set(rem.map(r => r.bmi))).sort((a, b) => a - b);
      const cands = [];
      gluThs.forEach(g => cands.push({ gMin: g, bMin: -Infinity, text: '血糖 ≥ ' + g }));
      bmiThs.forEach(b => cands.push({ gMin: -Infinity, bMin: b, text: 'BMI ≥ ' + b }));
      gluThs.forEach(g => bmiThs.forEach(b => {
        cands.push({ gMin: g, bMin: b, text: '血糖 ≥ ' + g + ' 且 BMI ≥ ' + b });
      }));

      let best = null;
      cands.forEach(c => {
        const cov = rem.filter(r => r.glu >= c.gMin && r.bmi >= c.bMin);
        const tp = cov.filter(r => r.dm === 1).length;
        const fp = cov.length - tp;
        if (tp < minCov) return;
        const prec = tp / cov.length;
        // FOIL / Laplace precision heuristic favoring high precision & coverage
        const score = (tp + 1) / (cov.length + 2) + tp * 0.02;
        if (!best || score > best.score + 1e-12 || (Math.abs(score - best.score) < 1e-12 && tp > best.tp)) {
          best = Object.assign({}, c, { tp, fp, cov: cov.length, prec, score, covIds: cov.map(x => x.id) });
        }
      });

      if (!best || best.prec < 0.6) break;
      rules.push(best);
      const covSet = new Set(best.covIds);
      rem = rem.filter(r => !covSet.has(r.id));
    }

    const predOne = pt => {
      for (let i = 0; i < rules.length; i++) {
        if (pt.glu >= rules[i].gMin && pt.bmi >= rules[i].bMin) return { pred: 1, ruleIdx: i };
      }
      return { pred: 0, ruleIdx: -1 };
    };
    const preds = rows.map(r => predOne(r).pred);
    const acc = rows.filter((r, i) => preds[i] === r.dm).length / rows.length;
    return { rules, rem, predOne, preds, acc };
  }

  LAB.register({
    id: 'B15', group: 'B', title: 'Rule Induction 規則歸納',
    module: { name: 'M2-2 第 11 節', url: '../m2-2/#p11' },
    goal: '透過「循序覆蓋 (Sequential Covering / RIPPER)」學出條列式 IF–THEN 臨床規則：每學出一條高精確率規則就移除被覆蓋的病人，重複直到涵蓋正樣本，其餘走預設類別。',
    data: {
      name: 'clinic_rules',
      scenario: '門診健檢：14 位病人，歸納可讀性最高的「IF … THEN 糖尿病」臨床規則清單',
      columns: COLS,
      editable: ['glu', 'bmi', 'dm'],
      small: makeRows
    },
    params: [
      { key: 'max_rules', label: '最多規則數', type: 'int', min: 1, max: 4, step: 1, value: 2 },
      { key: 'min_cov', label: '單條最少涵蓋數', type: 'int', min: 1, max: 3, step: 1, value: 2 }
    ],
    pseudo: [
      '重複直到正樣本蓋完或達上限：',
      '  在剩餘病人中搜尋最佳 IF 條件',
      '  挑精確率與涵蓋數最高的新規則',
      '  從資料中移除已被該規則覆蓋者',
      '剩餘未命中者走 ELSE 預設（否）',
      '評估整份規則清單的準確率'
    ],
    build(rows, p) {
      const R = learnRules(rows, p), steps = [];

      function views(st) {
        const covered = new Set();
        for (let i = 0; i < st.shownRules; i++) R.rules[i].covIds.forEach(id => covered.add(id));
        const points = rows.map(r => ({
          id: 'p' + r.id, x: r.glu, y: r.bmi, cls: cls(r.dm),
          dim: st.dimCov && covered.has(r.id),
          ring: st.hlRule >= 0 && R.rules[st.hlRule] && R.rules[st.hlRule].covIds.includes(r.id),
          label: String(r.id), r: 6
        }));
        const lines = [];
        for (let i = 0; i < st.shownRules; i++) {
          const rl = R.rules[i];
          const isCur = i === st.hlRule;
          const x0 = Math.max(AX.x.min, rl.gMin), y0 = Math.max(AX.y.min, rl.bMin);
          if (rl.gMin > -Infinity) lines.push({ id: 'rg' + i, x1: x0, y1: y0, x2: x0, y2: AX.y.max, cls: isCur ? 'hl' : 'c1', w: isCur ? 3 : 1.4, dash: !isCur });
          if (rl.bMin > -Infinity) lines.push({ id: 'rb' + i, x1: x0, y1: y0, x2: AX.x.max, y2: y0, cls: isCur ? 'hl' : 'c1', w: isCur ? 3 : 1.4, dash: !isCur });
        }
        const regions = st.showReg ? LAB.grid((x, y) => cls(R.predOne({ glu: x, bmi: y }).pred), AX.x.min, AX.x.max, AX.y.min, AX.y.max, 28, 18) : null;
        const leg = [{ cls: 'c1', label: '糖尿病：是' }, { cls: 'c0', label: '糖尿病：否' }, { cls: 'hl', shape: 'line', label: '目前規則邊界' }];
        if (st.dimCov) leg.push({ cls: 'c5', label: '已覆蓋（變淡）' });
        const main = {
          type: 'scatter', slot: 'main',
          title: '循序覆蓋規則區域（已覆蓋樣本變淡）',
          axes: AX, points, lines, circles: [], regions,
          legend: leg
        };
        const sideRows = R.rules.slice(0, st.shownRules).map((rl, i) => ({
          id: 'r' + i,
          cells: ['R' + (i + 1), 'IF ' + rl.text + ' → 是', rl.tp + '/' + rl.cov, LAB.pct(rl.prec, 0)],
          hl: i === st.hlRule
        }));
        if (st.showElse) sideRows.push({ id: 'else', cells: ['ELSE', '其餘一律 → 否', R.rem.length + '人', '—'] });
        const side = {
          type: 'table', slot: 'side',
          title: '歸納出的 IF–THEN 規則清單',
          cols: [{ key: 'id', label: '序' }, { key: 'txt', label: '臨床規則' }, { key: 'cov', label: '命中' }, { key: 'pr', label: '精確率' }],
          rows: sideRows
        };
        const bottom = {
          type: 'bars', slot: 'bottom',
          title: '各條規則命中人數與整體準確率 (' + LAB.pct(R.acc, 1) + ')',
          max: Math.max(rows.length, 10), digits: 0,
          items: R.rules.slice(0, st.shownRules).map((rl, i) => ({
            id: 'b' + i, label: 'R' + (i + 1) + ' 命中正例', value: rl.tp, cls: 'c1'
          })).concat([{ id: 'tot', label: '總答對人數', value: st.showElse ? rows.filter((r, i) => R.preds[i] === r.dm).length : 0, cls: 'good' }])
        };
        return [main, side, bottom];
      }

      const st = { shownRules: 0, hlRule: -1, dimCov: true, showElse: false, showReg: false };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '題目', '醫師喜歡條列式規則勝過黑箱分數。用循序覆蓋 (Sequential Covering) 從 14 位病人直接歸納 IF–THEN 規則。', [
        '陽性 ' + rows.filter(r => r.dm === 1).length + ' 人、陰性 ' + rows.filter(r => r.dm === 0).length + ' 人'
      ]);
      add(1, '盤點陽性集中區', '先觀察散佈圖中紅色陽性病人的分布位置，演算法將從右上高風險區開始，逐條撈出高精確率的矩形條件。', [
        '條件格式：血糖 ≥ g 且/或 BMI ≥ b（最少涵蓋 ' + p.min_cov + ' 人）'
      ]);

      R.rules.forEach((rl, idx) => {
        st.shownRules = idx + 1; st.hlRule = idx;
        add(2, '學出第 ' + (idx + 1) + ' 條規則', '在未覆蓋病人中找到高純度區域：IF ' + rl.text + ' THEN 糖尿病＝是。', [
          '命中 ' + rl.cov + ' 人（其中陽性 ' + rl.tp + ' 人，精確率 ' + LAB.pct(rl.prec, 1) + '）'
        ]);
        add(3, '移除已覆蓋樣本', '把這 ' + rl.cov + ' 位病人從資料中標記移除（圖上變淡），讓下一條規則專心對付剩下的陽性個案。', [
          '覆蓋病人：' + rl.covIds.map(id => '#' + id).join('、')
        ]);
      });

      st.hlRule = -1; st.dimCov = false; st.showElse = true; st.showReg = true;
      add(4, '加上 ELSE 預設規則', '所有未命中上述規則的病人一律歸為「否」，形成完整可讀的有序規則集 (Ordered Rule List)。', [
        '規則數 = ' + R.rules.length + ' 條，整體準確率 = ' + LAB.pct(R.acc, 1)
      ]);

      add(5, '有序規則的判定順序', '本清單屬「有序規則集 (Ordered List)」：病人由 R1 往下逐條比對，命中第一條即定案，不會發生兩條規則互相打架的衝突。', [
        '判定順序：R1 → R2 → … → ELSE 預設（否）'
      ]);
      add(5, 'RIPPER 規則剪枝防呆', '若規則條件加太多（過度特化），會背下訓練集雜訊；實務 RIPPER 會用驗證集做 IREP 剪枝，刪去讓錯誤率上升的尾端條件。', [
        '單條最少涵蓋數 min_cov = ' + p.min_cov + '（越大越防過擬合）'
      ]);
      add(5, '精確率 vs 覆蓋率權衡', '提高精確率門檻會讓規則變窄、漏掉部分陽性；放寬則覆蓋率高但誤報變多，評分函式需在兩者間取平衡。', [
        '目前規則數 = ' + R.rules.length + ' 條，整體準確率 = ' + LAB.pct(R.acc, 1)
      ]);
      add(5, '規則歸納 vs 決策樹', '決策樹是把空間切成互不重疊的樹枝；Rule Induction 則一條一條單獨把高風險正例撈出來，通常規則更精簡直覺。', [
        '決策樹（全空間分割）vs 規則歸納（逐塊覆蓋正例）'
      ]);
      add(5, '臨床白箱稽核價值', '每條 IF–THEN 規則都對應明確的生理切點，可直接與臨床指引（如空腹血糖 ≥ 126）對照審查，適合醫療風控與法規稽核！', [
        '可讀性極高：適合臨床初篩與決策支援清單'
      ]);
      return steps;
    },

    keys(steps, rows, p) {
      const R = learnRules(rows, p);
      return {
        n_rules: R.rules.length,
        acc: R.acc,
        r0_tp: R.rules[0] ? R.rules[0].tp : 0,
        r0_cov: R.rules[0] ? R.rules[0].cov : 0,
        r0_prec: R.rules[0] ? R.rules[0].prec : 0
      };
    },

    explain(steps, rows, p) {
      const R = learnRules(rows, p);
      return [
        '循序覆蓋共學出 ' + R.rules.length + ' 條規則：' + R.rules.map((rl, i) => 'R' + (i + 1) + ' (' + rl.text + ')').join('、') + '。',
        '有序規則清單加上預設 ELSE 否，在 14 位病人上達到 ' + LAB.pct(R.acc, 1) + ' 準確率。',
        '規則歸納特別適合臨床指引制定與稽核審查，因為每一條規則都對應明確的生理檢查門檻。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Set Role', 'Rule Induction'],
      params: [
        ['Rule Induction › criterion', 'information_gain'],
        ['Rule Induction › pureness', '0.9']
      ],
      note: 'AI Studio 內建 Rule Induction (RIPPER) 運算子，直接輸出條列式 if-then 規則模型，非常適合需要白箱規則的醫療風控場域。',
      expect: (steps, rows, p) => {
        const R = learnRules(rows, p);
        return ['學出 ' + R.rules.length + ' 條規則，準確率 = ' + LAB.pct(R.acc, 1)];
      },
      python: '# RIPPER / Rule Induction 可使用 wittgenstein (RIPPERk) 或自行實作 Sequential Covering',
      confirmed: false
    }
  });
})();
