/* E6 臨床實體辨識 NER 與否定偵測 */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = [
    { key: 'text', label: '病歷主訴句', type: 'text', role: 'x' },
    { key: 'has_pos_sym', label: '含肯定症狀', type: 'cat', levels: ['否', '是'], codes: ['no', 'yes'], role: 'y' }
  ];

  // 模擬 6 筆含肯定、否定與轉折終止詞的急診／門診病歷主訴
  const RAW_NOTES = [
    { id: 1, text: '病人否認胸痛、無呼吸困難，但主訴頭暈。', has_pos_sym: 1, toks: ['病人', '否認', '胸痛', '、', '無', '呼吸', '困難', '，', '但', '主訴', '頭暈', '。'] },
    { id: 2, text: '傷口未見滲液與紅腫，續用止痛藥 500mg。', has_pos_sym: 0, toks: ['傷口', '未見', '滲液', '與', '紅腫', '，', '續用', '止痛藥', '500mg', '。'] },
    { id: 3, text: '主訴發燒與咳嗽，無胸痛，給予退燒藥 1000mg。', has_pos_sym: 1, toks: ['主訴', '發燒', '與', '咳嗽', '，', '無', '胸痛', '，', '給予', '退燒藥', '1000mg', '。'] },
    { id: 4, text: '否認發燒，排除肺炎，開立降壓藥 5mg。', has_pos_sym: 0, toks: ['否認', '發燒', '，', '排除', '肺炎', '，', '開立', '降壓藥', '5mg', '。'] },
    { id: 5, text: '夜間步態不穩但無跌倒，續服降糖藥 500mg。', has_pos_sym: 1, toks: ['夜間', '步態', '不穩', '但', '無', '跌倒', '，', '續服', '降糖藥', '500mg', '。'] },
    { id: 6, text: '無頭暈亦未見出血，停用抗凝血藥 100mg。', has_pos_sym: 0, toks: ['無', '頭暈', '亦', '未見', '出血', '，', '停用', '抗凝血藥', '100mg', '。'] }
  ];

  const SYM_B = new Set(['胸痛', '呼吸', '頭暈', '滲液', '紅腫', '發燒', '咳嗽', '肺炎', '步態', '跌倒', '出血']);
  const SYM_I = new Set(['困難', '不穩']);
  const DRUG_SET = new Set(['止痛藥', '退燒藥', '降壓藥', '降糖藥', '抗凝血藥']);
  const DOSE_SET = new Set(['500mg', '1000mg', '5mg', '100mg']);
  const NEG_SET = new Set(['否認', '無', '未見', '排除']);
  const TERM_SET = new Set(['，', '。', '但', '惟']);

  function tagToken(tok) {
    if (SYM_B.has(tok)) return 'B-SYM';
    if (SYM_I.has(tok)) return 'I-SYM';
    if (DRUG_SET.has(tok)) return 'B-DRUG';
    if (DOSE_SET.has(tok)) return 'B-DOSE';
    if (NEG_SET.has(tok)) return 'NEG';
    if (TERM_SET.has(tok)) return 'TERM';
    return 'O';
  }

  function runNER(rows, p) {
    const scope = Math.max(1, Math.min(5, Math.round(p.neg_scope || 3)));
    const useNegex = p.use_negex !== false;

    const parsed = rows.map(r => {
      const ref = RAW_NOTES.find(x => x.id === r.id) || RAW_NOTES[0];
      const toks = ref.toks;
      const tags = toks.map(tagToken);

      // 合併 BIO 為實體列表並套用 NegEx 視窗偵測
      const entities = [];
      let negRemain = 0;
      let i = 0;
      while (i < toks.length) {
        const tg = tags[i];
        if (tg === 'NEG') {
          negRemain = scope;
          i++;
          continue;
        }
        if (tg === 'TERM') {
          negRemain = 0;
          i++;
          continue;
        }
        if (tg === 'B-SYM' || tg === 'B-DRUG' || tg === 'B-DOSE') {
          const kind = tg.slice(2);
          let text = toks[i];
          const span = [i];
          let j = i + 1;
          while (j < toks.length && tags[j] === 'I-' + kind) {
            text += toks[j];
            span.push(j);
            j++;
          }
          const negated = (kind === 'SYM') && useNegex && (negRemain > 0);
          const trueNeg = (kind === 'SYM') && (negRemain > 0);
          entities.push({ docId: r.id, text, kind, span, negated, trueNeg });
          if (negRemain > 0) negRemain = Math.max(0, negRemain - (j - i));
          i = j;
        } else {
          if (negRemain > 0) negRemain--;
          i++;
        }
      }

      const syms = entities.filter(e => e.kind === 'SYM');
      const predNaive = syms.length > 0 ? 1 : 0;
      const predNegex = syms.some(e => !e.trueNeg) ? 1 : 0;
      const predCur = useNegex ? predNegex : predNaive;
      return { id: r.id, text: r.text, y: r.has_pos_sym, toks, tags, entities, predNaive, predNegex, predCur };
    });

    const allEnts = parsed.reduce((a, d) => a.concat(d.entities), []);
    const nSym = allEnts.filter(e => e.kind === 'SYM').length;
    const nDrug = allEnts.filter(e => e.kind === 'DRUG').length;
    const nDose = allEnts.filter(e => e.kind === 'DOSE').length;
    const nNegSym = allEnts.filter(e => e.kind === 'SYM' && e.trueNeg).length;

    const accNaive = parsed.filter(d => d.predNaive === d.y).length / parsed.length;
    const accNegex = parsed.filter(d => d.predNegex === d.y).length / parsed.length;
    const fpNaive = parsed.filter(d => d.predNaive === 1 && d.y === 0).length;
    const fpNegex = parsed.filter(d => d.predNegex === 1 && d.y === 0).length;

    return { scope, useNegex, parsed, allEnts, nSym, nDrug, nDose, nNegSym, accNaive, accNegex, fpNaive, fpNegex };
  }

  LAB.register({
    id: 'E6', group: 'E', title: '臨床實體 NER 與否定偵測',
    module: { name: 'M6 臨床資訊抽取', url: '../m6/#p09' },
    goal: '解決醫療病歷最致命的 NLP 陷阱（「否認胸痛、無發燒」）：示範 BIO 序列標註如何抽取症狀／藥物／劑量，並以 NegEx 否定視窗與轉折終止詞消除關鍵字誤報。',
    data: {
      name: 'notes_ner',
      scenario: '急診與門診主訴：6 筆同時包含肯定症狀、否定症狀與用藥劑量的中文臨床紀錄',
      columns: COLS,
      small: () => RAW_NOTES.map(r => ({ id: r.id, text: r.text, has_pos_sym: r.has_pos_sym }))
    },
    params: [
      { key: 'neg_scope', label: 'NegEx 否定視窗', type: 'int', min: 1, max: 5, step: 1, value: 3 },
      { key: 'use_negex', label: '開啟 NegEx 否定偵測', type: 'bool', value: true }
    ],
    pseudo: [
      '將中文病歷切詞為 Token 序列',
      'BIO 序列標註抽取三類實體：',
      '  B-SYM / I-SYM（症狀）',
      '  B-DRUG（藥物）、B-DOSE（劑量）',
      '掃描否定觸發詞（否認／無／未見）',
      '標記作用視窗內的症狀為「否定」',
      '遇轉折或標點（但／，／。）終止',
      '對照開關 NegEx 的病歷誤報率'
    ],
    build(rows, p) {
      const R = runNER(rows, p), steps = [];

      function views(st) {
        const groups = R.parsed.map(d => {
          const negIdx = new Set();
          d.entities.forEach(e => { if (e.negated) e.span.forEach(idx => negIdx.add(idx)); });
          return {
            id: 'd' + d.id,
            label: '#' + d.id,
            items: d.toks.map((tk, ti) => {
              const tg = d.tags[ti];
              let cls = 'c5';
              let label = tk;
              if (st.showBio) {
                if (tg === 'B-SYM' || tg === 'I-SYM') {
                  cls = (st.showNeg && negIdx.has(ti)) ? 'cut' : 'c1';
                  label = tk + (st.showNeg && negIdx.has(ti) ? '[否]' : '[' + tg + ']');
                } else if (tg === 'B-DRUG') {
                  cls = 'c0'; label = tk + '[DRUG]';
                } else if (tg === 'B-DOSE') {
                  cls = 'c2'; label = tk + '[DOSE]';
                } else if (tg === 'NEG' && st.showNeg) {
                  cls = 'hl'; label = tk + '[NEG]';
                }
              }
              return { id: d.id + '_' + ti, text: label, cls, hl: st.hlDoc === d.id && (tg === 'NEG' || tg === 'B-SYM') };
            })
          };
        });
        const main = {
          type: 'tokens', slot: 'main',
          title: st.showNeg ? 'BIO 實體標註 ＋ NegEx 否定範圍判定（[否]＝已排除症狀）' : (st.showBio ? 'BIO 序列標註結果（紅＝症狀、藍＝藥物、紫＝劑量）' : '原始病歷切詞序列'),
          groups
        };

        const side = {
          type: 'table', slot: 'side',
          title: '抽取出的臨床症狀實體與否定狀態',
          cols: [
            { key: 'id', label: '#' },
            { key: 'ent', label: '症狀實體' },
            { key: 'st', label: '狀態' },
            { key: 'nv', label: '無NegEx' }
          ],
          rows: R.allEnts.filter(e => e.kind === 'SYM').slice(0, 12).map((e, idx) => ({
            id: 'e' + idx,
            cells: [
              '#' + e.docId,
              e.text,
              st.showNeg ? { v: e.negated ? '否定(無)' : '肯定(有)', cls: e.negated ? 'c5' : 'c1' } : '待判定',
              st.showEval ? { v: e.trueNeg ? '誤報FP' : '正確', cls: e.trueNeg ? 'bad' : 'good' } : '—'
            ],
            hl: st.hlDoc === e.docId
          }))
        };

        const bottom = {
          type: 'bars', slot: 'bottom',
          title: '「是否含肯定症狀」病歷判定準確率（對比傳統關鍵字 vs NegEx）',
          max: 1, digits: 2,
          items: [
            { id: 'nv', label: '❌ 傳統關鍵字 (無否定偵測，誤報 ' + R.fpNaive + ' 筆)', value: st.showEval ? R.accNaive : 0, cls: 'bad' },
            { id: 'nx', label: '✅ BIO + NegEx (視窗=' + R.scope + '，誤報 ' + R.fpNegex + ' 筆)', value: st.showEval ? R.accNegex : 0, cls: 'good', hl: st.showEval }
          ]
        };
        return [main, side, bottom];
      }

      const st = { showBio: false, showNeg: false, showEval: false, hlDoc: -1 };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '1. 病歷的否定詞陷阱', '詞袋與 TF-IDF (E1/E2) 看到「胸痛」「滲液」就一律當成陽性！但臨床病歷充滿「否認胸痛、未見滲液」的陰性記載。', [
        '6 筆病歷中，僅 3 筆含真正肯定症狀（#1, #3, #5），另 3 筆全為否定記載'
      ]);

      st.showBio = true;
      add(1, '2. BIO 序列標註規則', '命名實體辨識 (NER) 用 B-（實體開頭）、I-（實體延續）、O（非實體）標記每個詞，完整切出多字醫學專有名詞！', [
        '例：「呼吸[B-SYM] ＋ 困難[I-SYM]」→ 合併為單一症狀實體「呼吸困難」'
      ]);

      add(2, '3. 抽取三類結構化實體', '從 6 筆非結構化文字中一次抽取出症狀 (SYM)、藥物 (DRUG) 與劑量 (DOSE)，轉為可直接寫入資料庫的欄位。', [
        '共抽出：症狀 ' + R.nSym + ' 個、藥物 ' + R.nDrug + ' 個、劑量 ' + R.nDose + ' 個'
      ]);

      st.showNeg = true; st.hlDoc = 1;
      add(4, '4. 掃描否定觸發詞', '看 #1：「否認[NEG]」與「無[NEG]」啟動否定視窗（長度 = ' + R.scope + ' 詞），把後方的「胸痛」與「呼吸困難」標記為否定！', [
        '常見中文否定觸發詞：否認、無、未見、排除、沒有'
      ]);

      add(6, '5. 轉折詞與標點終止', '關鍵細節！#1 後半出現「，但主訴頭暈」：遇到「，」與轉折詞「但」必須立刻清空否定視窗，避免錯把「頭暈」也否定掉！', [
        '#1 結果：胸痛[否]、呼吸困難[否]、頭暈[肯定]'
      ]);

      st.hlDoc = 2;
      add(5, '6. 檢視純陰性病歷 #2', '看 #2「傷口未見滲液與紅腫」：若否定視窗 ≥ 3，就能跨過「與」同時將「滲液」與「紅腫」兩症狀正確標為否定！', [
        '若將上方視窗調小至 1，「紅腫」就會漏掉否定而被誤報為陽性！'
      ]);

      st.hlDoc = -1; st.showEval = true;
      add(7, '7. 關鍵字對照 NegEx', '傳統關鍵字看到病歷有症狀詞就全判陽性（6 筆全中 100% 誤報陰性病歷）；搭 NegEx 後偽陽性由 ' + R.fpNaive + ' 筆降至 ' + R.fpNegex + ' 筆！', [
        '準確率：❌ 無否定 ' + LAB.pct(R.accNaive, 1) + ' → ✅ BIO+NegEx ' + LAB.pct(R.accNegex, 1)
      ]);

      add(7, '8. 醫療延伸：三態屬性', '完整臨床 NLP（如 medspaCy / ClinicalBERT）會將每個實體標上三種狀態：Affirm（肯定）、Negated（否定）、Historical（過去病史／家族史）。', [
        '例：「父親有糖尿病史」≠ 病人本人確診糖尿病！'
      ]);

      add(7, '9. 從規則到 LLM 抽取', '早期用規則字典 + CRF + NegEx；現代實務可用 BioBERT 序列標註，或用 LLM 搭 JSON Schema 護欄（S9）一次抽取實體與否定狀態。', [
        '本次共識別 ' + R.nNegSym + ' 個被否定排除的症狀實體'
      ]);

      add(7, '10. 實務落地檢核重點', '凡是從中文病歷抽取疾病標籤（Cohort Phenotyping）建立監督式訓練集前，務必先過否定偵測，否則標籤本身就會嚴重污染！', [
        '試切換上方「NegEx 視窗 1–5」觀察 #2「紅腫」是否被正確涵蓋'
      ]);
      return steps;
    },

    keys(steps, rows, p) {
      const R = runNER(rows, p);
      return {
        n_sym: R.nSym,
        n_drug: R.nDrug,
        n_dose: R.nDose,
        n_neg_sym: R.nNegSym,
        acc_naive: R.accNaive,
        acc_negex: R.accNegex,
        fp_naive: R.fpNaive,
        fp_negex: R.fpNegex
      };
    },

    explain(steps, rows, p) {
      const R = runNER(rows, p);
      return [
        '透過 BIO 序列標註從 6 筆病歷中抽取出 ' + R.nSym + ' 個症狀、' + R.nDrug + ' 個藥物與 ' + R.nDose + ' 個劑量實體。',
        '傳統關鍵字比對因忽略「否認／無／未見」，將純陰性病歷全數誤報為陽性（準確率僅 ' + LAB.pct(R.accNaive, 1) + '，偽陽性 ' + R.fpNaive + ' 筆）。',
        '開啟 NegEx（視窗 ' + R.scope + ' 詞且遇標點／轉折詞終止）後，正確排除 ' + R.nNegSym + ' 個否定症狀，病歷判定準確率提升至 ' + LAB.pct(R.accNegex, 1) + '。'
      ];
    },

    aistudio: {
      operators: ['Read CSV', 'Process Documents from Data', 'Execute Python'],
      params: [
        ['NegEx › scope length', p => String(p.neg_scope)],
        ['BIO NER', '使用 medspaCy / spaCy EntityRuler + ConText 或微調 BioBERT']
      ],
      note: 'AI Studio 核心版未內建中文醫療 NER 與 NegEx，實務透過 Execute Python 呼叫 spaCy + medspaCy (ConText) 或 HuggingFace Token Classification 模型。',
      expect: (steps, rows, p) => {
        const R = runNER(rows, p);
        return ['抽出症狀 ' + R.nSym + ' 個（否定 ' + R.nNegSym + ' 個），病歷準確率 ' + LAB.pct(R.accNaive, 0) + ' → ' + LAB.pct(R.accNegex, 0)];
      },
      python: `import medspacy\nnlp = medspacy.load()  # 內建 TargetRule (NER) + ConText (NegEx 否定與家族史偵測)\ndoc = nlp("Patient denies chest pain, but reports dizziness.")\nfor ent in doc.ents: print(ent.text, ent.label_, ent._.is_negated)`,
      confirmed: false
    }
  });
})();
