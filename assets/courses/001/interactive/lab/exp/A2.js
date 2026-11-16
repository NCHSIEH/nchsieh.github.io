/* A2 標準化與正規化 */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = LAB.data.columns('clinic', ['age', 'glu']);
  const AX_RAW = { x: { label: '年齡（歲）', min: 20, max: 90 }, y: { label: '空腹血糖（mg/dL）', min: 60, max: 220 } };
  const AX_Z = { x: { label: 'Z 分數（年齡）', min: -3, max: 3 }, y: { label: 'Z 分數（空腹血糖）', min: -3, max: 3 } };
  const AX_MM = { x: { label: 'Min-Max（年齡）', min: -0.1, max: 1.1 }, y: { label: 'Min-Max（空腹血糖）', min: -0.1, max: 1.1 } };
  const pick = r => ({ id: r.id, age: r.age, glu: r.glu });

  function compute(rows, p) {
    const ages = LAB.col(rows, 'age'), glus = LAB.col(rows, 'glu');
    const mA = M.mean(ages), sA = M.sd(ages) || 1, minA = M.min(ages), maxA = M.max(ages), rngA = (maxA - minA) || 1;
    const mG = M.mean(glus), sG = M.sd(glus) || 1, minG = M.min(glus), maxG = M.max(glus), rngG = (maxG - minG) || 1;
    const pts = rows.map(r => ({
      id: r.id, age: r.age, glu: r.glu,
      zA: (r.age - mA) / sA, zG: (r.glu - mG) / sG,
      mmA: (r.age - minA) / rngA, mmG: (r.glu - minG) / rngG
    }));
    const idA = Math.min(rows.length, Math.max(1, Math.round(p.a || 1)));
    const idB = Math.min(rows.length, Math.max(1, Math.round(p.b || 2)));
    const pA = pts.find(x => x.id === idA) || pts[0];
    const pB = pts.find(x => x.id === idB) || pts[Math.min(1, pts.length - 1)];

    const distPair = (x1, y1, x2, y2) => {
      const dx = x1 - x2, dy = y1 - y2, d2 = dx * dx + dy * dy;
      return { dx, dy, d: Math.sqrt(d2), shareX: d2 > 0 ? (dx * dx) / d2 * 100 : 50, shareY: d2 > 0 ? (dy * dy) / d2 * 100 : 50 };
    };
    const rawD = distPair(pA.age, pA.glu, pB.age, pB.glu);
    const zD = distPair(pA.zA, pA.zG, pB.zA, pB.zG);
    const mmD = distPair(pA.mmA, pA.mmG, pB.mmA, pB.mmG);

    const rankOf = (getXY) => {
      const [ax, ay] = getXY(pA);
      const list = pts.filter(x => x.id !== pA.id).map(x => {
        const [bx, by] = getXY(x);
        return { id: x.id, d: Math.hypot(ax - bx, ay - by) };
      }).sort((u, v) => u.d - v.d || u.id - v.id);
      const idx = list.findIndex(x => x.id === pB.id);
      return { nearest: list[0], rankB: idx >= 0 ? idx + 1 : 0 };
    };

    return {
      mA, sA, minA, maxA, rngA, mG, sG, minG, maxG, rngG, pts, pA, pB,
      rawD, zD, mmD,
      rkRaw: rankOf(x => [x.age, x.glu]),
      rkZ: rankOf(x => [x.zA, x.zG]),
      rkMM: rankOf(x => [x.mmA, x.mmG])
    };
  }

  LAB.register({
    id: 'A2', group: 'A', title: '標準化與正規化',
    module: { name: 'M1 第 10 節', url: '../m1/#p10' },
    goal: '看懂 Z 分數標準化與 Min-Max 正規化如何拉平特徵尺度，並觀察換算前後兩位病人的距離與最近鄰是否改變。',
    data: {
      name: 'clinic',
      scenario: '門診健檢：比較年齡（20–90 歲）與空腹血糖（60–220 mg/dL）在縮放前後對距離的影響',
      columns: COLS,
      editable: ['age', 'glu'],
      small: seed => LAB.data.clinic(seed, 12).map(pick)
    },
    params: [
      { key: 'method', label: '縮放方法', type: 'choice', value: 'z', options: [{ v: 'z', label: 'Z 分數' }, { v: 'minmax', label: 'Min-Max' }] },
      { key: 'a', label: '病人 A (#)', type: 'int', min: 1, max: 12, step: 1, value: 2 },
      { key: 'b', label: '病人 B (#)', type: 'int', min: 1, max: 12, step: 1, value: 5 }
    ],
    pseudo: [
      '計算各欄統計量：',
      '  Z 分數：平均數 μ 與標準差 σ',
      '  Min-Max：最小值 min 與最大值 max',
      '逐筆換算每個特徵值：',
      '  Z = (x − μ) ÷ σ',
      '  MinMax = (x−min)÷(max−min)',
      '比較縮放前後的距離與最近鄰排名'
    ],
    build(rows, p) {
      const R = compute(rows, p), isZ = p.method === 'z', steps = [];
      const newLabel = isZ ? 'Z' : 'Min-Max';

      function views(st) {
        const useScaled = st.scaled;
        const ax = !useScaled ? AX_RAW : (isZ ? AX_Z : AX_MM);
        const points = R.pts.map((pt, i) => {
          const scaledPt = useScaled && i < st.upto;
          const x = scaledPt ? (isZ ? pt.zA : pt.mmA) : pt.age;
          const y = scaledPt ? (isZ ? pt.zG : pt.mmG) : pt.glu;
          const isPair = pt.id === R.pA.id || pt.id === R.pB.id;
          const isCur = st.cur === pt.id;
          return {
            id: 'p' + pt.id,
            x: useScaled && !scaledPt ? (isZ ? pt.zA : pt.mmA) : x,
            y: useScaled && !scaledPt ? (isZ ? pt.zG : pt.mmG) : y,
            cls: isCur ? 'hl' : isPair ? 'c1' : 'c0',
            ring: isPair, hl: isCur,
            dim: useScaled && i >= st.upto,
            label: String(pt.id), r: isPair ? 7 : 6
          };
        });
        const ptA = points.find(x => x.id === 'p' + R.pA.id);
        const ptB = points.find(x => x.id === 'p' + R.pB.id);
        const distVal = useScaled ? (isZ ? R.zD.d : R.mmD.d) : R.rawD.d;
        const lines = R.pA.id !== R.pB.id ? [{ id: 'ab', x1: ptA.x, y1: ptA.y, x2: ptB.x, y2: ptB.y, cls: 'c1', w: 2, label: f(distVal, 2) }] : [];
        const nnId = useScaled ? (isZ ? R.rkZ.nearest.id : R.rkMM.nearest.id) : R.rkRaw.nearest.id;
        const ptNN = points.find(x => x.id === 'p' + nnId);
        if (ptNN && nnId !== R.pB.id) {
          lines.push({ id: 'nn', x1: ptA.x, y1: ptA.y, x2: ptNN.x, y2: ptNN.y, cls: 'c2', dash: true, w: 1.8, label: '最近#' + nnId });
        }
        const main = {
          type: 'scatter', slot: 'main',
          title: useScaled ? (isZ ? 'Z 分數空間' : 'Min-Max [0, 1] 空間') : '原始尺度空間',
          axes: ax, points, lines, circles: [],
          legend: [{ cls: 'c1', label: '觀察對象 #' + R.pA.id + ' 與 #' + R.pB.id }, { cls: 'c0', label: '其他病人' }]
        };

        const trs = R.pts.map((pt, i) => {
          const done = i < st.upto;
          const vA = done ? (isZ ? pt.zA : pt.mmA) : null;
          const vG = done ? (isZ ? pt.zG : pt.mmG) : null;
          return {
            id: pt.id,
            cells: [pt.id, pt.age, pt.glu, vA, vG],
            hl: st.cur === pt.id || pt.id === R.pA.id || pt.id === R.pB.id
          };
        });
        const side = {
          type: 'table', slot: 'side', title: '原值與' + newLabel + '對照',
          cols: [
            { key: 'id', label: '#' },
            { key: 'age', label: '年齡', num: true, digits: 0 },
            { key: 'glu', label: '血糖', num: true, digits: 0 },
            { key: 'na', label: newLabel + '年齡', num: true, digits: 2 },
            { key: 'ng', label: newLabel + '血糖', num: true, digits: 2 }
          ],
          rows: trs
        };

        const dInfo = useScaled ? (isZ ? R.zD : R.mmD) : R.rawD;
        const bars = {
          type: 'bars', slot: 'bottom',
          title: '#' + R.pA.id + ' 與 #' + R.pB.id + ' 距離平方的特徵貢獻（%）',
          max: 100, digits: 1, unit: '%',
          items: [
            { id: 'sx', label: '年齡貢獻', value: dInfo.shareX, cls: 'c0' },
            { id: 'sy', label: '空腹血糖貢獻', value: dInfo.shareY, cls: 'c1' }
          ]
        };
        return [main, side, bars];
      }

      const st = { scaled: false, upto: 0, cur: null };
      const add = (line, title, say, calc, extra) => steps.push(Object.assign({ line, title, say, calc: calc || [], views: views(st), focus: st.cur ? [st.cur] : [R.pA.id, R.pB.id] }, extra));

      add(0, '題目', '原始尺度下，血糖範圍（60–220）遠大於年齡（20–90），#' + R.pA.id + ' 與 #' + R.pB.id + ' 的距離幾乎被血糖主導。', [
        '原始距離 d = ' + f(R.rawD.d, 2) + '（年齡貢獻 ' + f(R.rawD.shareX, 1) + '%、血糖貢獻 ' + f(R.rawD.shareY, 1) + '%）'
      ]);

      if (isZ) {
        add(2, '算年齡統計量', '計算年齡的母體平均數與標準差，作為 Z 分數的中心與刻度。', [
          '年齡 μ = ' + f(R.mA, 2) + '，σ = ' + f(R.sA, 2)
        ]);
        add(2, '算血糖統計量', '計算空腹血糖的母體平均數與標準差。', [
          '血糖 μ = ' + f(R.mG, 2) + '，σ = ' + f(R.sG, 2)
        ]);
      } else {
        add(3, '算年齡極值', '找出年齡的最小值與最大值，全距將對應到 [0, 1]。', [
          '年齡 min = ' + f(R.minA, 0) + '，max = ' + f(R.maxA, 0) + '，全距 = ' + f(R.rngA, 0)
        ]);
        add(3, '算血糖極值', '找出空腹血糖的最小值與最大值。', [
          '血糖 min = ' + f(R.minG, 0) + '，max = ' + f(R.maxG, 0) + '，全距 = ' + f(R.rngG, 0)
        ]);
      }

      st.scaled = true;
      for (let i = 0; i < Math.min(4, R.pts.length); i++) {
        const pt = R.pts[i];
        st.upto = i + 1; st.cur = pt.id;
        if (isZ) {
          add(5, '換算：' + pt.id + ' 號', '把 ' + pt.id + ' 號病人的年齡與血糖減去平均、除以標準差，座標移到 Z 分數空間。', [
            'Z年齡 = (' + pt.age + ' − ' + f(R.mA, 2) + ') ÷ ' + f(R.sA, 2) + ' = ' + f(pt.zA, 2),
            'Z血糖 = (' + pt.glu + ' − ' + f(R.mG, 2) + ') ÷ ' + f(R.sG, 2) + ' = ' + f(pt.zG, 2)
          ], { phase: (i + 1) + ' / ' + R.pts.length });
        } else {
          add(6, '換算：' + pt.id + ' 號', '把 ' + pt.id + ' 號病人的年齡與血糖減去最小值、除以全距，壓縮到 [0, 1]。', [
            'MM年齡 = (' + pt.age + ' − ' + f(R.minA, 0) + ') ÷ ' + f(R.rngA, 0) + ' = ' + f(pt.mmA, 2),
            'MM血糖 = (' + pt.glu + ' − ' + f(R.minG, 0) + ') ÷ ' + f(R.rngG, 0) + ' = ' + f(pt.mmG, 2)
          ], { phase: (i + 1) + ' / ' + R.pts.length });
        }
      }

      st.cur = null; st.upto = R.pts.length;
      add(isZ ? 5 : 6, '換算其餘病人', '將其餘 ' + (R.pts.length - 4) + ' 位病人用相同公式一次換算完畢。', [
        '全部 ' + R.pts.length + ' 筆已完成 ' + newLabel + ' 換算'
      ]);

      const curD = isZ ? R.zD : R.mmD;
      const curRk = isZ ? R.rkZ : R.rkMM;
      const nnChanged = R.rkRaw.nearest.id !== curRk.nearest.id;
      add(7, '比較兩位病人距離', '縮放後年齡與血糖站在同一個起跑點！觀察 #' + R.pA.id + ' 與 #' + R.pB.id + ' 的距離與特徵貢獻變化。', [
        '原始距離 = ' + f(R.rawD.d, 2) + '（年齡 ' + f(R.rawD.shareX, 1) + '%、血糖 ' + f(R.rawD.shareY, 1) + '%）',
        newLabel + ' 距離 = ' + f(curD.d, 2) + '（年齡 ' + f(curD.shareX, 1) + '%、血糖 ' + f(curD.shareY, 1) + '%）'
      ]);
      add(7, '最近鄰排名是否改變', '不只是距離數字變了，連誰離 #' + R.pA.id + ' 最近都可能改變，這會直接影響 k-NN 與分群結果。', [
        '#' + R.pA.id + ' 的最近鄰：原 #' + R.rkRaw.nearest.id + ' → 縮放後 #' + curRk.nearest.id + (nnChanged ? '（已改變）' : '（未變）'),
        '#' + R.pB.id + ' 在 #' + R.pA.id + ' 鄰居中排名：原第 ' + R.rkRaw.rankB + ' → 縮放後第 ' + curRk.rankB
      ]);
      return steps;
    },

    keys(steps, rows, p) {
      const R = compute(rows, p);
      const k = {
        mean_age: R.mA, sd_age: R.sA, min_age: R.minA, max_age: R.maxA,
        mean_glu: R.mG, sd_glu: R.sG, min_glu: R.minG, max_glu: R.maxG,
        dist_raw: R.rawD.d, dist_z: R.zD.d, dist_minmax: R.mmD.d
      };
      R.pts.forEach(pt => {
        k['z_age_' + pt.id] = pt.zA;
        k['z_glu_' + pt.id] = pt.zG;
        k['mm_age_' + pt.id] = pt.mmA;
        k['mm_glu_' + pt.id] = pt.mmG;
      });
      return k;
    },

    explain(steps, rows, p) {
      const R = compute(rows, p);
      const curD = p.method === 'z' ? R.zD : R.mmD;
      return [
        '原始尺度下，#' + R.pA.id + ' 與 #' + R.pB.id + ' 的距離為 ' + f(R.rawD.d, 2) + '，其中空腹血糖占了 ' + f(R.rawD.shareY, 1) + '% 的平方貢獻。',
        '改用 ' + (p.method === 'z' ? 'Z 分數' : 'Min-Max') + ' 後，距離變為 ' + f(curD.d, 2) + '，年齡與血糖的貢獻變成 ' + f(curD.shareX, 1) + '% 與 ' + f(curD.shareY, 1) + '%。',
        '依賴距離的模型（如 k-NN、K-Means、SVM、PCA）若不做縮放，結果會被數值範圍大的特徵綁架。',
        'Z 分數適合近似常態且可能有離群值的資料；Min-Max 把數值壓到 [0, 1]，對極端值較敏感。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Normalize'],
      params: [
        ['Normalize › method', p => p.method === 'z' ? 'Z-transformation' : 'range transformation'],
        ['Normalize › min / max (if range)', '0.0 / 1.0']
      ],
      note: '提醒：AI Studio 的 Normalize（Z-transformation）可能使用樣本標準差（除以 n−1），而本實驗室與 scikit-learn StandardScaler 皆採用母體標準差（除以 n），小樣本下 Z 分數會有些微差異。',
      expect: (steps, rows, p) => {
        const R = compute(rows, p);
        return [
          '年齡平均 = ' + f(R.mA, 2) + '，標準差 = ' + f(R.sA, 2),
          '血糖平均 = ' + f(R.mG, 2) + '，標準差 = ' + f(R.sG, 2)
        ];
      },
      python: `from sklearn.preprocessing import StandardScaler, MinMaxScaler\nZ = StandardScaler().fit_transform(X)\nMM = MinMaxScaler().fit_transform(X)`,
      confirmed: false
    }
  });
})();
