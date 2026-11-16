/* B4 k-NN：找最像的 K 位病人投票　（樣板實驗：表格＋散布圖型） */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = LAB.data.columns('clinic', ['age', 'glu', 'dm'], { dm: 'y' });
  const AX = { x: { label: '年齡（歲）', min: 20, max: 90 }, y: { label: '空腹血糖（mg/dL）', min: 60, max: 220 } };
  const pick = r => ({ id: r.id, age: r.age, glu: r.glu, dm: r.dm });
  const cls = dm => dm ? 'c1' : 'c0';
  const LEG = [{ cls: 'c1', label: '糖尿病：是' }, { cls: 'c0', label: '糖尿病：否' }, { cls: 'hl', label: '新病人' }];

  /* 共用計算：回傳標準化參數、每位病人的距離、排序、鄰居與投票結果 */
  function knn(rows, p, qa, qg) {
    const mA = M.mean(LAB.col(rows, 'age')), sA = M.sd(LAB.col(rows, 'age')) || 1, mG = M.mean(LAB.col(rows, 'glu')), sG = M.sd(LAB.col(rows, 'glu')) || 1;
    const z = (a, g) => p.scale ? [(a - mA) / sA, (g - mG) / sG] : [a, g];
    const q = z(qa, qg);
    const d = rows.map(r => ({ id: r.id, dm: r.dm, z: z(r.age, r.glu), d: M.dist(z(r.age, r.glu), q) }));
    const order = d.slice().sort((a, b) => a.d - b.d || a.id - b.id);
    const k = Math.min(p.k, rows.length), nb = order.slice(0, k), yes = nb.filter(n => n.dm === 1).length;
    return { mA, sA, mG, sG, q, d, order, k, nb, yes, pYes: yes / k, pred: yes * 2 > k ? 1 : 0 };
  }

  LAB.register({
    id: 'B4', group: 'B', title: 'k-NN：找最像的 K 位病人投票',
    module: { name: 'M2-2 第 03 節', url: '../m2-2/#p03' },
    goal: '看懂 k-NN 的四個動作：算距離、排序、取前 K 名、投票；並看到「先不先標準化」會不會改變答案。',
    data: {
      name: 'clinic', scenario: '門診健檢：用年齡與空腹血糖，判斷新病人是否有糖尿病',
      columns: COLS, editable: ['age', 'glu', 'dm'],
      small: seed => LAB.data.clinic(seed, 12).map(pick),
      large: seed => LAB.data.clinic(seed, 300).map(pick),
      exports: (rows, p) => [{ name: 'lab_B4_new_patient.csv', rows: [{ id: 'new', age: p.qAge, glu: p.qGlu }], columns: COLS.filter(c => c.role !== 'y') }]
    },
    params: [
      { key: 'k', label: 'K（鄰居數）', type: 'int', min: 1, max: 9, step: 2, value: 3 },
      { key: 'scale', label: '先標準化', type: 'bool', value: true },
      { key: 'qAge', label: '年齡', group: '新病人', type: 'int', min: 25, max: 85, step: 1, value: 52, unit: '歲' },
      { key: 'qGlu', label: '空腹血糖', group: '新病人', type: 'int', min: 70, max: 200, step: 1, value: 118 }
    ],
    pseudo: [
      '把每個特徵標準化成 Z 分數（可關閉）',
      '對每一位已知病人：',
      '  算他和新病人的距離',
      '依距離由近到遠排序',
      '取最近的 K 位當鄰居',
      '鄰居投票，多數決',
      '回報預測類別與票數比例'
    ],

    build(rows, p) {
      const R = knn(rows, p, p.qAge, p.qGlu), big = rows.length > 20, steps = [];
      const dOf = {}; R.d.forEach(o => { dOf[o.id] = o; });
      const rank = {}; R.order.forEach((o, i) => { rank[o.id] = i + 1; });
      const inK = new Set(R.nb.map(n => n.id));
      const dk = R.nb[R.nb.length - 1].d;

      /* 依目前進度產生畫面。s：{z 是否顯示標準化欄, upto 已算到第幾筆, cur 目前這筆, sorted, picked, vote, pred, regions} */
      function views(s) {
        const points = rows.map(r => ({ id: 'p' + r.id, x: r.age, y: r.glu, cls: cls(r.dm), label: big ? null : String(r.id), r: big ? 4 : 6, dim: s.picked && !inK.has(r.id), ring: s.picked && inK.has(r.id) && !big, hl: s.cur === r.id }));
        points.push({ id: 'q', x: p.qAge, y: p.qGlu, cls: s.pred == null ? 'hl' : cls(s.pred), shape: 'star', r: 9, ring: s.pred == null, hl: true, label: '新病人' });
        let lines = [];
        if (s.cur != null) { const r = rows.find(x => x.id === s.cur); lines = [{ id: 'cur', x1: p.qAge, y1: p.qGlu, x2: r.age, y2: r.glu, cls: 'hl', w: 2, label: f(dOf[r.id].d, 2) }]; }
        if (s.picked) lines = R.nb.map(n => { const r = rows.find(x => x.id === n.id); return { id: 'n' + n.id, x1: p.qAge, y1: p.qGlu, x2: r.age, y2: r.glu, cls: cls(n.dm), w: 2 }; });
        const circles = s.picked ? [{ id: 'kr', x: p.qAge, y: p.qGlu, r: dk * (p.scale ? R.sA : 1), ry: dk * (p.scale ? R.sG : 1), cls: 'hl' }] : [];
        const main = { type: 'scatter', slot: 'main', axes: AX, points, lines, circles, regions: s.regions || null, legend: LEG.concat(s.regions ? [{ cls: 'c1', shape: 'area', label: '這一帶會判為「是」' }] : []) };

        const cols = [{ key: 'id', label: '#' }];
        if (p.scale) cols.push({ key: 'za', label: 'Z年齡', num: true }, { key: 'zg', label: 'Z血糖', num: true }); else cols.push({ key: 'age', label: '年齡', num: true, digits: 0 }, { key: 'glu', label: '血糖', num: true, digits: 0 });
        cols.push({ key: 'dm', label: '糖尿病' }, { key: 'd', label: '距離', num: true }, { key: 'rk', label: '名次', num: true, digits: 0 });
        const src = s.sorted ? R.order.map(o => rows.find(r => r.id === o.id)) : rows;
        const show = big ? src.slice(0, 12) : src;
        const trs = show.map((r, i) => {
          const done = s.upto >= rows.indexOf(r) + 1, c = [r.id];
          if (p.scale) c.push(s.z ? dOf[r.id].z[0] : null, s.z ? dOf[r.id].z[1] : null); else c.push(r.age, r.glu);
          c.push({ v: r.dm ? '是' : '否', cls: cls(r.dm) }, done ? dOf[r.id].d : null, s.sorted ? rank[r.id] : null);
          return { id: r.id, cells: c, hl: s.cur === r.id || (s.picked && inK.has(r.id)), dim: s.picked && !inK.has(r.id) };
        });
        const side = { type: 'table', slot: 'side', title: s.sorted ? '距離表（已排序）' : '距離表', cols, rows: trs, hlCol: s.upto > 0 ? 'd' : null, caption: big ? '只列出' + (s.sorted ? '最近的' : '前') + ' 12 位' : null };
        const out = [main, side];
        if (s.vote) out.push({ type: 'bars', slot: 'bottom', title: 'K = ' + R.k + ' 位鄰居的投票', max: R.k, digits: 0, unit: ' 票', items: [{ id: 'yes', label: '糖尿病：是', value: R.yes, cls: 'c1', hl: s.pred === 1 }, { id: 'no', label: '糖尿病：否', value: R.k - R.yes, cls: 'c0', hl: s.pred === 0 }] });
        return out;
      }
      const add = (line, title, say, calc, s, extra) => steps.push(Object.assign({ line, title, say, calc: calc || [], views: views(s), focus: s.cur != null ? [s.cur] : s.picked ? R.nb.map(n => n.id) : [] }, extra));

      const st = { z: false, upto: 0, cur: null };
      add(0, '題目', '來了一位 ' + p.qAge + ' 歲、空腹血糖 ' + p.qGlu + ' 的新病人（星號）。k-NN 不建公式，直接問：資料裡最像他的 ' + R.k + ' 位病人，多數是不是糖尿病？', [], st);

      if (p.scale) {
        add(1, '算平均與標準差', '年齡的數字範圍比血糖小很多。不處理的話，距離幾乎只由血糖決定，所以先把兩欄換成同一把尺。', [
          '年齡：平均 ' + f(R.mA, 2) + '，標準差 ' + f(R.sA, 2), '血糖：平均 ' + f(R.mG, 2) + '，標準差 ' + f(R.sG, 2)], st);
        st.z = true;
        add(1, '換成 Z 分數', '每個數值減平均、除以標準差。新病人也用同一組平均與標準差換算。', [
          'Z = (數值 − 平均) ÷ 標準差', '新病人 Z年齡 = (' + p.qAge + ' − ' + f(R.mA, 2) + ') ÷ ' + f(R.sA, 2) + ' = ' + f(R.q[0], 2), '新病人 Z血糖 = (' + p.qGlu + ' − ' + f(R.mG, 2) + ') ÷ ' + f(R.sG, 2) + ' = ' + f(R.q[1], 2)], st);
      } else {
        add(1, '不標準化', '這次直接用原始數值算距離。留意接下來的距離主要是被哪一欄拉開的。', [], st);
      }

      if (!big) {
        rows.forEach((r, i) => {
          st.upto = i + 1; st.cur = r.id; const o = dOf[r.id], a = p.scale ? f(o.z[0], 2) : String(r.age), g = p.scale ? f(o.z[1], 2) : String(r.glu), qa = p.scale ? f(R.q[0], 2) : String(p.qAge), qg = p.scale ? f(R.q[1], 2) : String(p.qGlu);
          add(3, '算距離：' + r.id + ' 號', '新病人到 ' + r.id + ' 號病人（' + (r.dm ? '有' : '沒有') + '糖尿病）的直線距離。', [
            'd = √( (' + a + ' − ' + qa + ')² + (' + g + ' − ' + qg + ')² )', '  = ' + f(o.d, 2)], st, { phase: i + 1 + ' / ' + rows.length });
        });
      } else {
        st.upto = rows.length;
        add(3, '算出所有距離', '放大版有 ' + rows.length + ' 位病人，做法完全一樣，只是不逐筆顯示。', ['共算了 ' + rows.length + ' 個距離'], st);
      }
      st.cur = null; st.sorted = true;
      add(4, '排序', '把距離由小到大排好。距離最小的排最前面，就是和新病人最像的人。', ['最近：' + R.order[0].id + ' 號，距離 ' + f(R.order[0].d, 2), '最遠：' + R.order[R.order.length - 1].id + ' 號，距離 ' + f(R.order[R.order.length - 1].d, 2)], st);
      st.picked = true;
      add(5, '取前 K 名', '只留最近的 ' + R.k + ' 位當鄰居（圖上有圈的點），其他人不參與。虛線範圍內就是這 ' + R.k + ' 位。', ['鄰居：' + R.nb.map(n => n.id + ' 號').join('、'), '第 ' + R.k + ' 近的距離 = ' + f(dk, 2)], st);
      st.vote = true;
      add(6, '投票', R.k + ' 位鄰居各投一票，票投給自己的類別。', ['是：' + R.yes + ' 票', '否：' + (R.k - R.yes) + ' 票'], st);
      st.pred = R.pred;
      add(7, '預測結果', '多數決：預測新病人「' + (R.pred ? '有' : '沒有') + '糖尿病」。票數比例就是模型給的信心。', ['P(是) = ' + R.yes + ' ÷ ' + R.k + ' = ' + f(R.pYes, 2), 'P(否) = ' + (R.k - R.yes) + ' ÷ ' + R.k + ' = ' + f(1 - R.pYes, 2)], st);
      st.regions = LAB.grid((x, y) => cls(knn(rows, p, x, y).pred), AX.x.min, AX.x.max, AX.y.min, AX.y.max, big ? 28 : 35, big ? 18 : 22);
      add(7, '整張圖的判定', '把圖上每個位置都當成新病人算一次，就得到這個 K 的判定區域。用上方滑桿移動新病人或改 K，看邊界怎麼變。', [], st);
      return steps;
    },

    keys(steps, rows, p) {
      const R = knn(rows, p, p.qAge, p.qGlu), o = { mean_age: R.mA, sd_age: R.sA, mean_glu: R.mG, sd_glu: R.sG, p_yes: R.pYes, pred: R.pred };
      R.d.forEach(d => { o['d_' + d.id] = d.d; }); R.nb.forEach((n, i) => { o['nb_' + (i + 1)] = n.id; });
      return o;
    },

    explain(steps, rows, p) {
      const R = knn(rows, p, p.qAge, p.qGlu), alt = knn(rows, Object.assign({}, p, { scale: !p.scale }), p.qAge, p.qGlu), k1 = knn(rows, Object.assign({}, p, { k: 1 }), p.qAge, p.qGlu);
      const same = alt.nb.map(n => n.id).sort().join() === R.nb.map(n => n.id).sort().join();
      return [
        '最近的 ' + R.k + ' 位鄰居是 ' + R.nb.map(n => n.id + ' 號').join('、') + '，其中 ' + R.yes + ' 位有糖尿病，所以預測「' + (R.pred ? '是' : '否') + '」，P(是) = ' + f(R.pYes, 2) + '。',
        (p.scale ? '如果不標準化' : '如果先標準化') + '，鄰居會' + (same ? '一樣' : '變成 ' + alt.nb.map(n => n.id + ' 號').join('、')) + '，預測' + (alt.pred === R.pred ? '不變' : '改為「' + (alt.pred ? '是' : '否') + '」') + '。原始數值下血糖的標準差（' + f(R.sG, 1) + '）比年齡（' + f(R.sA, 1) + '）大，距離容易被血糖主導。',
        'K 越小，判定區域越零碎，容易受單一病人影響（K = 1 時預測「' + (k1.pred ? '是' : '否') + '」）；K 越大越平滑，但會把比較不像的人也算進來。',
        'k-NN 沒有訓練過程，資料本身就是模型；每預測一位新病人都要和所有人算一次距離。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Set Role', 'Normalize', 'k-NN', 'Apply Model'],
      params: [
        ['Set Role › dm', 'label'], ['Set Role › id', 'id'],
        ['Normalize › method', p => p.scale ? 'Z-transformation' : '（這次不放 Normalize）'],
        ['k-NN › k', p => String(p.k)], ['k-NN › weighted vote', '取消勾選'], ['k-NN › measure', 'EuclideanDistance（數值型）']
      ],
      note: '新病人另存成 lab_B4_new_patient.csv（匯出時會一起下載）。Normalize 產生的前處理模型要先套用到新病人，再接 Apply Model。AI Studio 的 Z-transformation 若用樣本標準差（除以 n − 1），Z 分數會與這裡略有不同，但鄰居與預測相同。',
      expect: (steps, rows, p) => { const R = knn(rows, p, p.qAge, p.qGlu); return ['prediction(dm) = ' + (R.pred ? 'yes' : 'no'), 'confidence(yes) = ' + f(R.pYes, 2) + '，confidence(no) = ' + f(1 - R.pYes, 2)]; },
      python: 'from sklearn.pipeline import make_pipeline\nfrom sklearn.preprocessing import StandardScaler\nfrom sklearn.neighbors import KNeighborsClassifier\nm = make_pipeline(StandardScaler(), KNeighborsClassifier(n_neighbors=3))\nm.fit(df[["age", "glu"]], df["dm"])\nm.predict_proba([[52, 118]])',
      confirmed: false
    }
  });
})();
