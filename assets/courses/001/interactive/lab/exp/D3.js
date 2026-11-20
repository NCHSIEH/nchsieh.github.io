/* D3 序列樣式探勘 PrefixSpan */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const ITEMS = ['antihypertensive', 'antidiabetic', 'statin', 'nsaid', 'ppi', 'antiplatelet'];
  const COLS = LAB.data.columns('rx', ITEMS);

  function toSeq(r) {
    const base = ITEMS.filter(k => r[k]);
    return base.length >= 2 ? base : ['antihypertensive', 'ppi'];
  }

  function isSubseq(pat, seq) {
    let pi = 0;
    for (let si = 0; si < seq.length && pi < pat.length; si++) {
      if (seq[si] === pat[pi]) pi++;
    }
    return pi === pat.length;
  }

  function runPrefixSpan(rows, p) {
    const n = rows.length;
    const minSup = p.min_sup || 0.3;
    const minCnt = Math.ceil(minSup * n - 1e-12);
    const seqs = rows.map(r => ({ id: r.id, seq: toSeq(r) }));

    const supCntOf = pat => seqs.filter(s => isSubseq(pat, s.seq)).length;
    const keyOf = pat => pat.join('>');
    const nameOf = pat => pat.map(LAB.data.rxLabel).join(' → ');

    // 1-序列
    const s1All = ITEMS.map(it => {
      const cnt = supCntOf([it]);
      return { pat: [it], key: it, label: LAB.data.rxLabel(it), cnt, sup: cnt / n };
    });
    const l1 = s1All.filter(x => x.cnt >= minCnt).sort((a, b) => b.cnt - a.cnt);

    // 對每個頻繁前缀建立投影資料庫（Suffix Database）並挖 2-序列與 3-序列
    const projDBs = [];
    const l2 = [];
    const l3 = [];

    l1.forEach(p1 => {
      const pref = p1.pat[0];
      const suffixes = [];
      seqs.forEach(s => {
        const idx = s.seq.indexOf(pref);
        if (idx >= 0 && idx + 1 < s.seq.length) {
          suffixes.push({ id: s.id, suf: s.seq.slice(idx + 1) });
        }
      });

      const cand2 = [];
      l1.forEach(next1 => {
        const it2 = next1.pat[0];
        if (it2 === pref) return;
        const cnt2 = suffixes.filter(sf => sf.suf.includes(it2)).length;
        const pat2 = [pref, it2];
        cand2.push({ pat: pat2, key: keyOf(pat2), label: nameOf(pat2), cnt: cnt2, sup: cnt2 / n });
        if (cnt2 >= minCnt) {
          l2.push({ pat: pat2, key: keyOf(pat2), label: nameOf(pat2), cnt: cnt2, sup: cnt2 / n, supP1: p1.sup, conf: cnt2 / p1.cnt });
          // 繼續往第 3 層投影
          const suf2 = [];
          suffixes.forEach(sf => {
            const idx2 = sf.suf.indexOf(it2);
            if (idx2 >= 0 && idx2 + 1 < sf.suf.length) {
              suf2.push(sf.suf.slice(idx2 + 1));
            }
          });
          l1.forEach(next2 => {
            const it3 = next2.pat[0];
            if (it3 === pref || it3 === it2) return;
            const cnt3 = suf2.filter(s3 => s3.includes(it3)).length;
            if (cnt3 >= minCnt) {
              const pat3 = [pref, it2, it3];
              l3.push({ pat: pat3, key: keyOf(pat3), label: nameOf(pat3), cnt: cnt3, sup: cnt3 / n, conf: cnt3 / cnt2 });
            }
          });
        }
      });

      projDBs.push({
        prefix: pref,
        prefixLabel: p1.label,
        cnt: p1.cnt,
        suffixes,
        cand2
      });
    });

    l2.sort((a, b) => b.sup - a.sup || b.conf - a.conf);
    l3.sort((a, b) => b.sup - a.sup || b.conf - a.conf);

    // 建構前綴序列樹節點供視覺化
    const treeNodes = [{ id: 'root', label: '起點 Root' }];
    l1.slice(0, 4).forEach(p1 => {
      const id1 = 'p1_' + p1.key;
      treeNodes.push({ id: id1, parent: 'root', label: p1.label, sub: 'n=' + p1.cnt });
      l2.filter(p2 => p2.pat[0] === p1.pat[0]).slice(0, 3).forEach(p2 => {
        const id2 = 'p2_' + p2.key;
        treeNodes.push({ id: id2, parent: id1, label: '→ ' + LAB.data.rxLabel(p2.pat[1]), sub: 'n=' + p2.cnt });
        l3.filter(p3 => p3.pat[0] === p2.pat[0] && p3.pat[1] === p2.pat[1]).slice(0, 2).forEach(p3 => {
          treeNodes.push({ id: 'p3_' + p3.key, parent: id2, label: '→ ' + LAB.data.rxLabel(p3.pat[2]), sub: 'n=' + p3.cnt });
        });
      });
    });

    return { n, minSup, minCnt, seqs, s1All, l1, projDBs, l2, l3, treeNodes };
  }

  LAB.register({
    id: 'D3', group: 'D', title: '序列樣式探勘 PrefixSpan',
    module: { name: 'M4 第 13 節', url: '../m4/#p13' },
    goal: '看懂當資料有時間先後順序（第 1 次門診 → 第 2 次門診 → 第 3 次門診）時，PrefixSpan 如何透過「前綴投影（Prefix Projection）」挖出有序的臨床用藥軌跡。',
    data: {
      name: 'rx_seq',
      scenario: '門診慢性病序列：12 位病人的歷次門診依時間先後開立藥品軌跡（〈A → B → C〉代表先開 A 後開 B 再開 C）',
      columns: COLS,
      small: seed => LAB.data.rx(seed, 12),
      view: rows => ({
        type: 'tokens',
        groups: rows.map(r => {
          const seq = toSeq(r);
          return {
            id: 'sq' + r.id,
            label: '病人 #' + r.id,
            items: seq.map((k, idx) => ({ id: r.id + '_' + idx, text: (idx + 1) + '.' + LAB.data.rxLabel(k) }))
          };
        })
      })
    },
    params: [
      { key: 'min_sup', label: '最小序列支持度 min_sup', type: 'num', min: 0.2, max: 0.5, step: 0.05, value: 0.25 }
    ],
    pseudo: [
      '將每位病人的門診紀錄排成時間序列',
      '掃描單一事件支持度，保留頻繁 1-序列 L1',
      '對每個頻繁前綴 α 建立後綴投影資料庫 S|α',
      '在投影庫 S|α 內統計後接事件得頻繁 2-序列',
      '遞迴向後投影挖出頻繁 3-序列 〈A→B→C〉',
      '計算序列轉移信賴度 P(B 在 A 之後 | A)'
    ],
    build(rows, p) {
      const R = runPrefixSpan(rows, p), steps = [];
      const topProj = R.projDBs[0] || { prefixLabel: '無', suffixes: [], cand2: [] };

      function views(st) {
        const treeShown = R.treeNodes.filter(nd => {
          if (nd.id === 'root') return true;
          if (nd.id.startsWith('p1_')) return st.stage >= 2;
          if (nd.id.startsWith('p2_')) return st.stage >= 4;
          if (nd.id.startsWith('p3_')) return st.showTree;
          return false;
        }).map(nd => Object.assign({}, nd, {
          active: (st.hlPrefix && (nd.id === 'p1_' + st.hlPrefix || nd.parent === 'p1_' + st.hlPrefix)) ||
            (st.hlKey && (nd.id === 'p2_' + st.hlKey || nd.id === 'p3_' + st.hlKey))
        }));
        const main = {
          type: 'tree', slot: 'main',
          title: 'PrefixSpan 前綴序列樹（由上而下＝門診時間順序）',
          nodes: treeShown
        };

        const allSeqPats = R.l2.concat(R.l3);
        const side = {
          type: 'table', slot: 'side',
          title: '頻繁時序樣式（有序 A → B）',
          cols: [
            { key: 'pat', label: '用藥先後序列' },
            { key: 'len', label: '長度', num: true, digits: 0 },
            { key: 'sup', label: 'Sup', num: true, digits: 2 },
            { key: 'conf', label: '轉移率', num: true, digits: 2 }
          ],
          rows: st.stage >= 4 ? allSeqPats.slice(0, 10).map(x => ({
            id: x.key,
            cells: [x.label, x.pat.length, x.sup, { v: f(x.conf, 2), cls: x.conf >= 0.65 ? 'good' : undefined }],
            hl: st.hlKey === x.key
          })) : R.l1.map(x => ({
            id: x.key,
            cells: ['〈' + x.label + '〉', 1, x.sup, 1]
          }))
        };

        const bottom = st.stage >= 4 && allSeqPats.length ? {
          type: 'bars', slot: 'bottom',
          title: '前 6 強臨床用藥序列支持度 Support',
          max: 1, digits: 2,
          items: allSeqPats.slice(0, 6).map(x => ({
            id: 'b_' + x.key, label: x.label, value: x.sup, cls: x.pat.length >= 3 ? 'hl' : 'c0'
          }))
        } : {
          type: 'note', slot: 'bottom', tone: 'info',
          text: '關聯規則（Apriori / FP-Growth）把同一張處方視為無序集合 {A, B}；序列樣式探勘（PrefixSpan）則保留時間順序，區分「先 A 後 B」與「先 B 後 A」。'
        };
        return [main, side, bottom];
      }

      const st = { stage: 1, showTree: false, hlPrefix: null, hlKey: null };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '序列 vs 處方籃', '12 位慢性病人的歷次門診用藥按時間排成序列。我們想找出「先開某藥、後續門診又加開某藥」的典型臨床病程。', [
        '病人 #1 序列：' + R.seqs[0].seq.map(LAB.data.rxLabel).join(' → '),
        '最小支持度門檻 min_sup = ' + f(R.minSup, 2) + '（至少 ' + R.minCnt + ' 位病人出現該順序）'
      ]);

      add(1, '掃描 1-序列支持度', '先計算每種藥品在多少位病人的序列中出現過（每位病人同一藥品只計一次）。', [
        '最高頻起點：' + (R.l1[0] ? R.l1[0].label + ' (' + R.l1[0].cnt + '/' + R.n + ')' : '無')
      ]);

      st.stage = 2;
      add(1, '保留頻繁 1-序列 L1', '剪除支持度低於 ' + f(R.minSup, 2) + ' 的項目，留下 ' + R.l1.length + ' 個頻繁單項作為「前綴（Prefix）」。', [
        '頻繁前綴 L1：' + R.l1.map(x => x.label).join('、')
      ]);

      st.stage = 3;
      add(2, '建立後綴投影資料庫', 'PrefixSpan 的核心：鎖定前綴〈' + topProj.prefixLabel + '〉，只截取每位病人在該藥「之後」才開立的後綴序列（Suffix Database）。', [
        '含前綴〈' + topProj.prefixLabel + '〉共 ' + topProj.cnt + ' 人，具有後續用藥者 ' + topProj.suffixes.length + ' 人',
        '不需像 GSP 演算法產生龐大的候選序列！'
      ]);

      st.stage = 4;
      if (R.l2.length) st.hlKey = R.l2[0].key;
      add(3, '在投影庫內挖 2-序列', '直接在每個前綴的後綴投影庫裡數次數，立即得到所有頻繁 2-序列〈A → B〉，共 ' + R.l2.length + ' 條。', [
        R.l2[0] ? '最強 2-序列：' + R.l2[0].label + '（Sup=' + f(R.l2[0].sup, 2) + ', 轉移率=' + f(R.l2[0].conf, 2) + '）' : '無 2-序列通過'
      ]);

      st.showTree = true;
      st.hlPrefix = R.l1[0] ? R.l1[0].key : null;
      add(3, '展開前綴序列樹', '將所有頻繁前綴與其後接藥品畫成前綴樹：從 Root 往右每走一層，代表時間往後推進一次門診。', [
        '2-序列共 ' + R.l2.length + ' 條'
      ]);

      st.hlPrefix = null;
      if (R.l3.length) st.hlKey = R.l3[0].key;
      add(4, '遞迴投影挖 3-序列', '對頻繁 2-序列再做一次後綴投影，挖出長度為 3 的臨床軌跡〈A → B → C〉，共 ' + R.l3.length + ' 條。', [
        R.l3[0] ? '典型 3-序列：' + R.l3[0].label + '（Sup=' + f(R.l3[0].sup, 2) + '）' : '在此門檻下無 3-序列'
      ]);

      st.hlKey = null;
      add(5, '計算序列轉移信賴度', '計算條件機率 P(後接 B | 已開立 A) = Sup(A → B) / Sup(A)，量化病程往下一階段發展的機率。', [
        R.l2[0] ? R.l2[0].label + ' 轉移信賴度 = ' + f(R.l2[0].conf, 2) : '已完成轉移率計算'
      ]);

      add(5, '免除候選序列爆炸', '若把時間順序納入 Apriori（即 GSP 演算法），k 個項目會產生 k! 種排列候選；PrefixSpan 只縮小投影資料庫，速度快上數十倍。', [
        '總頻繁序列（長度 ≥ 2）= ' + (R.l2.length + R.l3.length) + ' 條'
      ]);

      add(5, '臨床序列探勘應用', '在健保資料庫或電子病歷中，PrefixSpan 常再結合疾病診斷碼（ICD）與處方，找出「疾病惡化路徑」或「換藥軌跡」。', [
        '頻繁 1-序列 ' + R.l1.length + ' 個、2-序列 ' + R.l2.length + ' 個、3-序列 ' + R.l3.length + ' 個'
      ]);

      return steps;
    },

    keys(steps, rows, p) {
      const R = runPrefixSpan(rows, p);
      return {
        n_l1: R.l1.length,
        n_l2: R.l2.length,
        n_l3: R.l3.length,
        top2_sup: R.l2[0] ? R.l2[0].sup : 0,
        top2_conf: R.l2[0] ? R.l2[0].conf : 0
      };
    },

    explain(steps, rows, p) {
      const R = runPrefixSpan(rows, p);
      return [
        '在最小支持度 ' + f(R.minSup, 2) + ' 下，PrefixSpan 從 12 位病人的就醫序列中找出 ' + R.l1.length + ' 個頻繁 1-序列、' + R.l2.length + ' 個頻繁 2-序列與 ' + R.l3.length + ' 個頻繁 3-序列。',
        R.l2[0] ? '最常出現的二階段用藥軌跡為「' + R.l2[0].label + '」，支持度 ' + f(R.l2[0].sup, 2) + '、順向轉移信賴度 ' + f(R.l2[0].conf, 2) + '。' : '可調低 min_sup 觀察更多跨期序列。',
        'PrefixSpan 透過「前綴投影（Prefix Projection）」只檢查後綴子序列，完全免去產生候選序列的組合爆炸。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Generalized Sequential Patterns (GSP) / Execute Python'],
      params: [
        ['min support', p => String(p.min_sup)]
      ],
      note: 'AI Studio 內建 Generalized Sequential Patterns (GSP) 運算子處理序列樣式；Python 則可使用 prefixspan 套件直接進行前綴投影探勘。',
      expect: (steps, rows, p) => {
        const R = runPrefixSpan(rows, p);
        return ['頻繁 2-序列 ' + R.l2.length + ' 條、3-序列 ' + R.l3.length + ' 條'];
      },
      python: 'from prefixspan import PrefixSpan\nps = PrefixSpan(sequences)\nfreq_seqs = ps.frequent(min_cnt)',
      confirmed: false
    }
  });
})();
