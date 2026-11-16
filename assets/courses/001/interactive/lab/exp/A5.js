/* A5 不平衡資料與 SMOTE */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = LAB.data.columns('readmit', ['los', 'cci', 'readmit'], { readmit: 'y' });
  const AX = { x: { label: '住院天數 (天)', min: 0, max: 25 }, y: { label: '共病指數 (分)', min: 0, max: 8 } };
  const pick = r => ({ id: r.id, los: r.los, cci: r.cci, readmit: r.readmit });
  const cls = y => y ? 'c1' : 'c0';

  function makeRows(seed) {
    for (let off = 0; off < 40; off++) {
      const rs = LAB.data.readmit(seed + off * 17, 20).map(pick);
      const pos = rs.filter(r => r.readmit === 1).length;
      if (pos >= 4 && pos <= 5) return rs;
    }
    const rs = LAB.data.readmit(seed, 20).map(pick);
    rs[0].readmit = 1; rs[1].readmit = 1; rs[2].readmit = 1; rs[3].readmit = 1;
    return rs;
  }

  function resample(rows, p) {
    const r = LAB.rng(9200 + rows.length + Math.round((p.ratio || 0.5) * 100) + (p.k || 2));
    const pos = rows.filter(x => x.readmit === 1);
    const neg = rows.filter(x => x.readmit === 0);
    const nPos = pos.length, nNeg = neg.length;
    const ratio = p.ratio || 0.5;
    const kUse = Math.min(Math.max(1, Math.round(p.k || 2)), Math.max(1, pos.length - 1));

    const targetPos = Math.max(nPos, Math.round((ratio * nNeg) / (1 - ratio)));
    const nAdd = Math.max(0, targetPos - nPos);

    // 過抽樣：隨機挑陽性點複製
    const overPicks = [];
    for (let i = 0; i < nAdd; i++) {
      const src = pos[Math.floor(r() * pos.length)];
      overPicks.push({ newId: 'ov' + (i + 1), srcId: src.id, los: src.los, cci: src.cci });
    }

    // 欠抽樣：隨機刪多數類使陽性比例接近 ratio
    const targetNeg = Math.max(nPos, Math.round(nPos * (1 - ratio) / ratio));
    const nDrop = Math.max(0, nNeg - targetNeg);
    const shuffledNeg = LAB.shuffle(r, neg);
    const underDrops = shuffledNeg.slice(0, nDrop).map(x => x.id);

    // SMOTE：逐個合成點
    const smoteSpecs = [];
    for (let i = 0; i < nAdd; i++) {
      const src = pos[i % pos.length];
      const nbs = pos.filter(x => x.id !== src.id)
        .map(x => ({ id: x.id, los: x.los, cci: x.cci, d: Math.hypot(src.los - x.los, src.cci - x.cci) }))
        .sort((a, b) => a.d - b.d || a.id - b.id)
        .slice(0, kUse);
      const nb = nbs.length ? nbs[Math.floor(r() * nbs.length)] : src;
      const lam = Math.round(r() * 1000) / 1000;
      smoteSpecs.push({
        newId: 'sm' + (i + 1),
        srcId: src.id,
        nbId: nb.id,
        lam,
        los: src.los + lam * (nb.los - src.los),
        cci: src.cci + lam * (nb.cci - src.cci)
      });
    }

    const finalPos = p.method === 'under' ? nPos : (nPos + nAdd);
    const finalNeg = p.method === 'under' ? (nNeg - nDrop) : nNeg;

    return { pos, neg, nPos, nNeg, nAdd, nDrop, kUse, overPicks, underDrops, smoteSpecs, finalPos, finalNeg };
  }

  LAB.register({
    id: 'A5', group: 'A', title: '不平衡資料與 SMOTE',
    module: { name: 'M2-2 第 09 節', url: '../m2-2/#p09' },
    goal: '看懂不平衡資料的三種重抽樣做法：過抽樣複製、欠抽樣丟棄，以及 SMOTE 如何在陽性鄰居連線上合成新樣本。',
    data: {
      name: 'readmit_imb',
      scenario: '出院再入院：20 位病人中僅 3–5 位再入院（陽性少數類），示範如何平衡類別比例',
      columns: COLS,
      small: seed => makeRows(seed)
    },
    params: [
      { key: 'method', label: '平衡方法', type: 'choice', value: 'smote', options: [{ v: 'over', label: '隨機過抽樣' }, { v: 'under', label: '隨機欠抽樣' }, { v: 'smote', label: 'SMOTE' }] },
      { key: 'k', label: 'SMOTE 鄰居數 K', type: 'int', min: 1, max: 3, step: 1, value: 2 },
      { key: 'ratio', label: '目標陽性比例', type: 'num', min: 0.3, max: 0.5, step: 0.1, value: 0.5 }
    ],
    pseudo: [
      '統計多數類與少數類的筆數',
      '依目標比例計算要增減的筆數',
      '依選擇的方法處理：',
      '  過抽樣：隨機挑陽性點複製',
      '  欠抽樣：隨機丟棄多數類樣本',
      '  SMOTE：找陽性點的 K 鄰居',
      '    在兩人連線上取比例 λ 合成',
      '比較處理前後的類別比例'
    ],
    build(rows, p) {
      const R = resample(rows, p), steps = [];

      function views(st) {
        const dropSet = new Set(st.dropped);
        const points = rows.map(r => ({
          id: 'p' + r.id,
          x: r.los, y: r.cci,
          cls: cls(r.readmit),
          dim: dropSet.has(r.id),
          ring: st.hlIds.has(r.id),
          hl: st.curSrc === r.id,
          label: String(r.id),
          r: 6
        }));
        st.added.forEach(pt => {
          points.push({
            id: pt.newId, x: pt.los, y: pt.cci,
            cls: 'new', shape: 'diamond', r: 7, hl: st.curNew === pt.newId, label: pt.newId
          });
        });
        const main = {
          type: 'scatter', slot: 'main',
          title: '住院天數 × 共病指數（重抽樣過程）',
          axes: AX, points, lines: st.lines, circles: [],
          legend: [{ cls: 'c1', label: '再入院：是' }, { cls: 'c0', label: '再入院：否' }, { cls: 'new', shape: 'diamond', label: '合成／複製點' }]
        };

        let side;
        if (p.method === 'smote') {
          side = {
            type: 'table', slot: 'side', title: 'SMOTE 合成紀錄',
            cols: [{ key: 'id', label: '新點' }, { key: 'src', label: '起點' }, { key: 'nb', label: '鄰居' }, { key: 'lam', label: 'λ', num: true, digits: 2 }],
            rows: st.added.slice(0, 10).map(s => ({ id: s.newId, cells: [s.newId, '#' + s.srcId, '#' + s.nbId, s.lam], hl: st.curNew === s.newId }))
          };
        } else if (p.method === 'over') {
          side = {
            type: 'table', slot: 'side', title: '複製樣本紀錄',
            cols: [{ key: 'id', label: '新點' }, { key: 'src', label: '複製來源' }, { key: 'los', label: '天數', num: true, digits: 0 }, { key: 'cci', label: '共病', num: true, digits: 0 }],
            rows: st.added.slice(0, 10).map(s => ({ id: s.newId, cells: [s.newId, '#' + s.srcId, s.los, s.cci], hl: st.curNew === s.newId }))
          };
        } else {
          side = {
            type: 'table', slot: 'side', title: '被丟棄的多數類樣本',
            cols: [{ key: 'id', label: '#' }, { key: 'los', label: '天數', num: true, digits: 0 }, { key: 'cci', label: '共病', num: true, digits: 0 }],
            rows: st.dropped.slice(0, 10).map(did => {
              const r = rows.find(x => x.id === did);
              return { id: 'd' + did, cells: ['#' + did, r.los, r.cci] };
            })
          };
        }

        const nCurPos = R.nPos + st.added.length;
        const nCurNeg = R.nNeg - st.dropped.length;
        const bars = {
          type: 'bars', slot: 'bottom',
          title: '類別筆數變化（目前陽性率 ' + LAB.pct(nCurPos / (nCurPos + nCurNeg), 1) + '）',
          max: Math.max(20, nCurPos, nCurNeg), digits: 0, unit: ' 筆',
          items: [
            { id: 'pos', label: '再入院：是', value: nCurPos, cls: 'c1' },
            { id: 'neg', label: '再入院：否', value: nCurNeg, cls: 'c0' }
          ]
        };
        return [main, side, bars];
      }

      const st = { added: [], dropped: [], lines: [], hlIds: new Set(), curSrc: null, curNew: null };
      const add = (line, title, say, calc, extra) => steps.push(Object.assign({ line, title, say, calc: calc || [], views: views(st), focus: st.curSrc ? [st.curSrc] : [] }, extra));

      add(0, '題目', '20 位病人中只有 ' + R.nPos + ' 位再入院（' + LAB.pct(R.nPos / rows.length, 1) + '），模型容易全部猜「否」。目標是把陽性比例調到 ' + LAB.pct(p.ratio, 0) + '。', [
        '陽性 ' + R.nPos + ' 筆，陰性 ' + R.nNeg + ' 筆'
      ]);

      if (p.method === 'over') {
        add(2, '計算需複製筆數', '維持陰性 ' + R.nNeg + ' 筆不變，需把陽性補到 ' + (R.nPos + R.nAdd) + ' 筆。', [
          '需複製 ' + R.nAdd + ' 筆陽性樣本'
        ]);
        const nShow = Math.min(6, R.overPicks.length);
        for (let i = 0; i < nShow; i++) {
          const ov = R.overPicks[i];
          st.curSrc = ov.srcId; st.curNew = ov.newId; st.hlIds = new Set([ov.srcId]);
          st.added.push(ov);
          add(4, '複製：#' + ov.srcId, '隨機挑出陽性病人 #' + ov.srcId + ' 原封不動複製一筆（與原點重疊）。', [
            ov.newId + ' ← #' + ov.srcId + '（天數=' + ov.los + ', 共病=' + ov.cci + '）'
          ], { phase: (i + 1) + ' / ' + R.nAdd });
        }
        if (R.overPicks.length > nShow) {
          st.curSrc = null; st.curNew = null; st.hlIds = new Set();
          st.added = R.overPicks.slice();
          add(4, '完成其餘複製', '依同樣方式複製其餘 ' + (R.overPicks.length - nShow) + ' 筆陽性樣本。', [
            '合計新增 ' + R.nAdd + ' 筆複製點'
          ]);
        }
      } else if (p.method === 'under') {
        add(2, '計算需丟棄筆數', '維持陽性 ' + R.nPos + ' 筆不變，把陰性減少到 ' + (R.nNeg - R.nDrop) + ' 筆。', [
          '需隨機丟棄 ' + R.nDrop + ' 筆陰性樣本'
        ]);
        const nShow = Math.min(6, R.underDrops.length);
        for (let i = 0; i < nShow; i++) {
          const did = R.underDrops[i];
          st.curSrc = did; st.hlIds = new Set([did]);
          st.dropped.push(did);
          add(5, '丟棄：#' + did, '隨機挑選陰性病人 #' + did + ' 移出訓練集（圖上變淡）。', [
            '移出 #' + did + '，剩餘陰性 ' + (R.nNeg - st.dropped.length) + ' 筆'
          ], { phase: (i + 1) + ' / ' + R.nDrop });
        }
        if (R.underDrops.length > nShow) {
          st.curSrc = null; st.hlIds = new Set();
          st.dropped = R.underDrops.slice();
          add(5, '完成其餘丟棄', '隨機移出其餘 ' + (R.underDrops.length - nShow) + ' 筆陰性樣本，代價是可能損失有用資訊。', [
            '共移出 ' + R.nDrop + ' 筆，剩餘陰性 ' + R.finalNeg + ' 筆'
          ]);
        }
      } else {
        add(2, '計算需合成筆數', 'SMOTE 不直接複製原點，而是合成 ' + R.nAdd + ' 筆新的陽性樣本。', [
          '目標陽性 ' + R.finalPos + ' 筆，需合成 ' + R.nAdd + ' 筆（K = ' + R.kUse + '）'
        ]);
        const nShow = Math.min(6, R.smoteSpecs.length);
        const histLines = [];
        const segLine = (sm, idx, isCur) => {
          const src = rows.find(x => x.id === sm.srcId), nb = rows.find(x => x.id === sm.nbId);
          return isCur
            ? { id: 'seg_cur', x1: src.los, y1: src.cci, x2: nb.los, y2: nb.cci, cls: 'hl', dash: true, w: 2, label: 'λ=' + f(sm.lam, 2) }
            : { id: 'seg_' + idx, x1: src.los, y1: src.cci, x2: nb.los, y2: nb.cci, cls: 'c5', dash: true, w: 1 };
        };
        for (let i = 0; i < nShow; i++) {
          const sm = R.smoteSpecs[i];
          st.curSrc = sm.srcId; st.curNew = sm.newId; st.hlIds = new Set([sm.srcId, sm.nbId]);
          st.lines = histLines.concat([segLine(sm, i, true)]);
          st.added.push(sm);
          add(7, '合成：' + sm.newId, '從陽性 #' + sm.srcId + ' 找最近鄰居 #' + sm.nbId + '，在連線上取比例 λ=' + f(sm.lam, 2) + ' 產生新點。', [
            'x_new = #' + sm.srcId + ' + ' + f(sm.lam, 2) + '×(#' + sm.nbId + ' − #' + sm.srcId + ')',
            '座標 = (' + f(sm.los, 2) + ', ' + f(sm.cci, 2) + ')'
          ], { phase: (i + 1) + ' / ' + R.nAdd });
          histLines.push(segLine(sm, i, false));
        }
        if (R.smoteSpecs.length > nShow) {
          st.curSrc = null; st.curNew = null; st.hlIds = new Set();
          st.lines = R.smoteSpecs.map((sm, idx) => segLine(sm, idx, false));
          st.added = R.smoteSpecs.slice();
          add(7, '完成其餘合成點', '依同樣方式合成其餘 ' + (R.smoteSpecs.length - nShow) + ' 個新陽性點，擴充少數類的涵蓋區域。', [
            '合計合成 ' + R.nAdd + ' 個新樣本'
          ]);
        } else {
          st.lines = histLines;
        }
      }

      st.curSrc = null; st.curNew = null; st.hlIds = new Set();
      if (p.method !== 'smote') st.lines = [];
      add(8, '比較前後類別比例', '重抽樣只應套用在「訓練集」，絕對不能在切分前對測試集做，否則會造成資料洩漏。', [
        '原比例：陽性 ' + R.nPos + ' / 陰性 ' + R.nNeg + '（' + LAB.pct(R.nPos / rows.length, 1) + '）',
        '處理後：陽性 ' + R.finalPos + ' / 陰性 ' + R.finalNeg + '（' + LAB.pct(R.finalPos / (R.finalPos + R.finalNeg), 1) + '）'
      ]);
      while (steps.length < 10) {
        add(8, '實務提醒', '過抽樣容易讓模型死背少數類；欠抽樣會丟掉多數類資料；SMOTE 則可能在不相連的區域間誤畫橋樑。', [
          '最終總筆數 = ' + (R.finalPos + R.finalNeg)
        ]);
      }
      return steps;
    },

    inputs(rows, p) {
      const R = resample(rows, p);
      return {
        smote_specs: R.smoteSpecs.map(s => ({ srcId: s.srcId, nbId: s.nbId, lam: s.lam })),
        n_add: R.nAdd,
        n_drop: R.nDrop
      };
    },

    keys(steps, rows, p) {
      const R = resample(rows, p);
      const k = {
        orig_pos: R.nPos, orig_neg: R.nNeg,
        final_pos: R.finalPos, final_neg: R.finalNeg
      };
      R.smoteSpecs.forEach((s, i) => {
        k['sm_los_' + i] = s.los;
        k['sm_cci_' + i] = s.cci;
      });
      return k;
    },

    explain(steps, rows, p) {
      const R = resample(rows, p);
      return [
        '原始 20 筆資料中陽性只有 ' + R.nPos + ' 筆（' + LAB.pct(R.nPos / rows.length, 1) + '），屬於不平衡資料。',
        '經「' + (p.method === 'over' ? '隨機過抽樣' : p.method === 'under' ? '隨機欠抽樣' : 'SMOTE') + '」處理後，變成陽性 ' + R.finalPos + ' 筆、陰性 ' + R.finalNeg + ' 筆（陽性率 ' + LAB.pct(R.finalPos / (R.finalPos + R.finalNeg), 1) + '）。',
        'SMOTE 透過在少數類與其 K 鄰居的連線上內插產生新樣本，比單純複製更不容易過擬合，但只應在訓練折內進行。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Set Role', 'Sample', 'SMOTE Upsampling'],
      params: [
        ['Set Role › readmit', 'label'],
        ['Sample › balance data', 'true（依類別指定比例）'],
        ['SMOTE Upsampling › number of neighbors', p => String(p.k)]
      ],
      note: 'AI Studio 內建 Sample 可做欠／過抽樣（勾選 balance data）；SMOTE Upsampling 需安裝 Operator Toolbox 擴充套件，且應放在 Cross Validation 的訓練子流程內。',
      expect: (steps, rows, p) => {
        const R = resample(rows, p);
        return ['重抽樣後：陽性 ' + R.finalPos + ' 筆、陰性 ' + R.finalNeg + ' 筆'];
      },
      python: `from imblearn.over_sampling import SMOTE\nX_res, y_res = SMOTE(k_neighbors=2).fit_resample(X, y)`,
      confirmed: false
    }
  });
})();
