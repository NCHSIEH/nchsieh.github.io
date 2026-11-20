/* C12 馬氏距離與橢圓異常偵測 */
(function () {
  'use strict';
  const M = LAB.M, f = LAB.f;
  const COLS = LAB.data.columns('clinic', ['bmi', 'glu']);
  const AX = { x: { label: 'BMI（Z 分數）', min: -2.8, max: 2.8 }, y: { label: '空腹血糖（Z 分數）', min: -2.8, max: 2.8 } };

  function makeRows(seed) {
    const r = LAB.rng(9120 + seed);
    const bmis = [19.5, 20.8, 22.0, 23.2, 24.5, 25.8, 27.0, 28.4, 29.8, 31.2, 32.8];
    const rows = bmis.map((b, i) => ({
      id: i + 1,
      bmi: Number((b + (r() - 0.5) * 0.6).toFixed(1)),
      glu: Math.round(52 + 2.85 * b + (r() - 0.5) * 8)
    }));
    // #12：單看 BMI(21.2) 正常、單看血糖(152) 不算最高，但嚴重違背「低 BMI 應低血糖」的正相關規律！
    rows.push({ id: 12, bmi: 21.0, glu: 152 });
    return rows;
  }

  function analyze(rows, p) {
    const n = rows.length;
    const th = Number(p.th || 2.1);
    const mB = M.mean(rows.map(r => r.bmi)), sB = M.sd(rows.map(r => r.bmi)) || 1;
    const mG = M.mean(rows.map(r => r.glu)), sG = M.sd(rows.map(r => r.glu)) || 1;
    const Z = rows.map(r => [(r.bmi - mB) / sB, (r.glu - mG) / sG]);

    // 以正常主群（前 n-1 筆或穩健估計）計算共變異數矩陣，避免單一離群點扭曲橢圓方向
    const coreZ = Z.slice(0, n - 1);
    const mc0 = M.mean(coreZ.map(z => z[0])), mc1 = M.mean(coreZ.map(z => z[1]));
    let c00 = 0, c01 = 0, c11 = 0;
    coreZ.forEach(z => {
      const dx = z[0] - mc0, dy = z[1] - mc1;
      c00 += dx * dx; c01 += dx * dy; c11 += dy * dy;
    });
    c00 /= coreZ.length; c01 /= coreZ.length; c11 /= coreZ.length;
    const det = (c00 * c11 - c01 * c01) || 1e-6;
    const inv00 = c11 / det, inv01 = -c01 / det, inv11 = c00 / det;

    const mahalOf = (z0, z1) => {
      const dx = z0 - mc0, dy = z1 - mc1;
      const d2 = dx * (inv00 * dx + inv01 * dy) + dy * (inv01 * dx + inv11 * dy);
      return Math.sqrt(Math.max(0, d2));
    };
    const euclidOf = (z0, z1) => Math.hypot(z0 - mc0, z1 - mc1);

    const pts = rows.map((r, i) => {
      const dEuc = euclidOf(Z[i][0], Z[i][1]);
      const dMah = mahalOf(Z[i][0], Z[i][1]);
      return { id: r.id, z0: Z[i][0], z1: Z[i][1], dEuc, dMah, isOutMah: dMah > th, isOutEuc: dEuc > th };
    });

    const ranked = pts.slice().sort((a, b) => b.dMah - a.dMah);
    return { th, Z, mc0, mc1, c00, c01, c11, inv00, inv01, inv11, mahalOf, euclidOf, pts, ranked };
  }

  LAB.register({
    id: 'C12', group: 'C', title: '馬氏距離與橢圓異常偵測',
    module: { name: 'M4 第 10 節', url: '../m4/#p10' },
    goal: '看懂為什麼當兩個特徵正相關時，歐氏距離圓圈會漏抓「違背相關規律」的異常點 (#12)，而考慮共變異數逆矩陣 Σ⁻¹ 的馬氏距離（橢圓包絡）能精準揪出它。',
    data: {
      name: 'clinic_mahal',
      scenario: '門診健檢：BMI 與血糖高度正相關，但 #12 病人 BMI 偏低 (21.0) 血糖卻高達 152',
      columns: COLS,
      editable: ['bmi', 'glu'],
      small: makeRows
    },
    params: [
      { key: 'metric', label: '距離度量', type: 'choice', value: 'mahal', options: [
        { v: 'mahal', label: '馬氏距離 (斜橢圓)' },
        { v: 'euclid', label: '歐氏距離 (正圓圈)' }
      ] },
      { key: 'th', label: '異常門檻距離', type: 'num', min: 1.6, max: 2.8, step: 0.1, value: 2.1 }
    ],
    pseudo: [
      '把 BMI 與空腹血糖標準化為 Z 分數',
      '計算特徵間共變異數矩陣 Σ 與逆矩陣 Σ⁻¹',
      '對每筆樣本計算兩種距離：',
      '  歐氏距離：d_E = √((z−μ)ᵀ(z−μ))',
      '  馬氏距離：d_M = √((z−μ)ᵀ Σ⁻¹ (z−μ))',
      '畫出門檻等距包絡線（正圓 vs 斜橢圓）',
      '標出超出橢圓包絡的多變量異常點'
    ],
    build(rows, p) {
      const R = analyze(rows, p), steps = [];
      const isMah = p.metric === 'mahal';

      function views(st) {
        const points = R.pts.map(pt => {
          const isOut = st.showOut && (isMah ? pt.isOutMah : pt.isOutEuc);
          return {
            id: 'p' + pt.id, x: pt.z0, y: pt.z1,
            cls: isOut ? 'c1' : (pt.id === 12 && st.hl12 ? 'hl' : 'c0'),
            ring: isOut || (pt.id === 12 && st.hl12),
            hl: pt.id === 12 && st.hl12,
            label: String(pt.id), r: (isOut || pt.id === 12) ? 7.5 : 5.5
          };
        });
        const regions = st.showEnv ? LAB.grid((x, y) => {
          const d = isMah ? R.mahalOf(x, y) : R.euclidOf(x, y);
          return d <= R.th ? 'good' : 'c4';
        }, AX.x.min, AX.x.max, AX.y.min, AX.y.max, 34, 24) : null;
        const main = {
          type: 'scatter', slot: 'main',
          title: (isMah ? '馬氏距離斜橢圓包絡 (Elliptic Envelope)' : '歐氏距離正圓包絡 (忽略相關性)') + '｜門檻 = ' + f(R.th, 1),
          axes: AX, points, lines: [], circles: [], regions,
          legend: [{ cls: 'c0', label: '一般病人' }, { cls: 'c1', label: '判定異常' }, { cls: 'good', shape: 'area', label: '正常包絡區' }]
        };
        const side = {
          type: 'table', slot: 'side',
          title: '各病人歐氏距離 vs 馬氏距離對照',
          cols: [
            { key: 'id', label: '#' },
            { key: 'de', label: '歐氏 d_E', num: true, digits: 2 },
            { key: 'dm', label: '馬氏 d_M', num: true, digits: 2 },
            { key: 'st', label: isMah ? '馬氏判定' : '歐氏判定' }
          ],
          rows: R.pts.map(pt => {
            const flag = isMah ? pt.isOutMah : pt.isOutEuc;
            return {
              id: pt.id,
              cells: [
                pt.id,
                st.showEuc ? pt.dEuc : null,
                st.showMah ? pt.dMah : null,
                st.showOut ? { v: flag ? '異常' : '正常', cls: flag ? 'bad' : 'good' } : null
              ],
              hl: pt.id === 12
            };
          })
        };
        const barList = isMah ? R.ranked.slice(0, 6) : R.pts.slice().sort((a, b) => b.dEuc - a.dEuc).slice(0, 6);
        const bottom = {
          type: 'bars', slot: 'bottom',
          title: isMah
            ? ('馬氏距離異常排名 Top 6（門檻 = ' + f(R.th, 1) + '，#12 因偏離正相關軸而暴衝第一）')
            : ('歐氏距離排名 Top 6（門檻 = ' + f(R.th, 1) + '，忽略相關性易誤抓右上正常點）'),
          max: Math.max(3.5, (isMah ? R.ranked[0].dMah : barList[0].dEuc) * 1.15), digits: 2,
          items: barList.map(pt => {
            const vShow = isMah ? (st.showMah ? pt.dMah : (st.showEuc ? pt.dEuc : 0)) : (st.showEuc ? pt.dEuc : 0);
            const over = isMah ? pt.dMah > R.th : pt.dEuc > R.th;
            return {
              id: 'b' + pt.id,
              label: '#' + pt.id + (isMah ? (' (歐氏=' + f(pt.dEuc, 2) + ')') : (' (馬氏=' + f(pt.dMah, 2) + ')')),
              value: vShow,
              cls: over ? 'c1' : 'c0',
              hl: pt.id === 12
            };
          })
        };
        return [main, side, bottom];
      }

      const st = { hl12: false, showEuc: false, showMah: false, showEnv: false, showOut: false };
      const add = (line, title, say, calc) => steps.push({ line, title, say, calc: calc || [], views: views(st), focus: [] });

      add(0, '1. 單變量為何漏抓 #12？', '前 11 位病人的 BMI 與血糖呈強烈正相關（斜對角排列）。#12 的 BMI=21、血糖=152，單看任一欄都不算最極端，但組合起來卻嚴重偏離對角線！', [
        '主群相關係數 r = ' + f(R.c01 / Math.sqrt(R.c00 * R.c11), 3) + '（高度正相關）'
      ]);

      st.hl12 = true; st.showEuc = true;
      const p12 = R.pts[11], p11 = R.pts[10];
      add(4, '2. 歐氏距離的盲點', '歐氏距離把所有方向一視同仁（畫正圓）。#12 的歐氏距離 d_E = ' + f(p12.dEuc, 2) + '，甚至比右上角正常高值 #11 (d_E = ' + f(p11.dEuc, 2) + ') 還小！', [
        '#12 歐氏距離 d_E = ' + f(p12.dEuc, 2) + ' vs #11 歐氏距離 d_E = ' + f(p11.dEuc, 2)
      ]);

      st.showMah = true;
      add(5, '3. 計算共變異逆矩陣與馬氏距離', '馬氏距離乘上共變異逆矩陣 Σ⁻¹：順著相關軸方向寬容、垂直於相關軸方向嚴格懲罰！#12 的馬氏距離立刻暴增至 ' + f(p12.dMah, 2) + '。', [
        'Σ⁻¹ = [[' + f(R.inv00, 2) + ', ' + f(R.inv01, 2) + '], [' + f(R.inv01, 2) + ', ' + f(R.inv11, 2) + ']]',
        '#12 馬氏距離 d_M = ' + f(p12.dMah, 2) + ' ≫ #11 馬氏距離 d_M = ' + f(p11.dMah, 2)
      ]);

      st.showEnv = true; st.showOut = true;
      add(6, '4. 畫出橢圓包絡線', isMah
        ? '以門檻 ' + f(R.th, 1) + ' 畫出馬氏等距包絡線（綠色斜橢圓），順著對角線把 #1～#11 全包進正常區，唯獨把偏離對角線的 #12 排除在外！'
        : '若切換為歐氏距離正圓包絡，不是漏抓 #12 就是誤把右上角正常高值 #11 當成異常。', [
        '馬氏異常點：' + (R.pts.filter(x => x.isOutMah).map(x => '#' + x.id).join('、') || '無'),
        '歐氏異常點：' + (R.pts.filter(x => x.isOutEuc).map(x => '#' + x.id).join('、') || '無')
      ]);

      add(7, '5. 馬氏與 PCA 白化等價', '幾何上，馬氏距離就等同於「先把資料轉到 PCA 主成分軸、再除以各軸標準差（白化）後的歐氏距離」，因此能校正斜向相關！', [
        '當 Σ = I（特徵完全不相關且同尺度）時，馬氏退化為歐氏'
      ]);
      add(7, '6. 卡方 χ² 統計門檻', '若資料服從 p 維常態分布，馬氏距離平方 d_M² 服從自由度 p 的 χ² 分布！p=2 時 95% 信賴橢圓門檻為 √5.99 ≈ 2.45。', [
        'p=2：95% 門檻 ≈ 2.45｜99% 門檻 ≈ 3.03（目前設 ' + f(R.th, 1) + '）'
      ]);
      add(7, '7. 穩健估計 MCD 防污染', '若直接用含離群值的全資料算 Σ，極端點會把橢圓撐大造成遮蔽；sklearn 的 EllipticEnvelope 用最小協方差行列式 (MCD) 穩健估計 Σ！', [
        'EllipticEnvelope(contamination=0.1) 自動排除極端值估計 Σ'
      ]);
      add(7, '8. 適用前提與非線性限制', '馬氏距離假設正常群呈單峰橢球（常態分布）；若正常群有多個子群或呈月牙彎曲，斜橢圓會失效，應改用 LOF (C7) 或 IForest (C8)。', [
        '單峰相關常態 → 馬氏｜多群局部密度 → LOF｜高維大表 → IForest'
      ]);
      add(7, '9. 臨床檢驗多變量異常', '血壓（收縮壓×舒張壓）、腎功能（肌酸酐×eGFR）、BMI×血糖都高度相關，單欄正常但組合異常的個案最靠馬氏距離揪出！', [
        '#12：歐氏 d_E = ' + f(p12.dEuc, 2) + ' → 馬氏 d_M = ' + f(p12.dMah, 2)
      ]);
      add(7, '10. 多變量異常偵測總結', '試切換上方「馬氏距離 ↔ 歐氏距離」並調整門檻滑桿，比較正圓與斜橢圓包絡對 #11 與 #12 的判定差異。', [
        '馬氏異常：' + (R.pts.filter(x => x.isOutMah).map(x => '#' + x.id).join('、') || '無')
      ]);
      return steps;
    },
    keys(steps, rows, p) {
      const R = analyze(rows, p);
      return {
        c00: R.c00, c01: R.c01, c11: R.c11,
        euc_11: R.pts[10].dEuc, mah_11: R.pts[10].dMah,
        euc_12: R.pts[11].dEuc, mah_12: R.pts[11].dMah,
        n_out_mah: R.pts.filter(x => x.isOutMah).length
      };
    },
    explain(steps, rows, p) {
      const R = analyze(rows, p);
      return [
        '#12 病人（BMI=21.0、血糖=152）在歐氏距離下 d_E = ' + f(R.pts[11].dEuc, 2) + '，看似比 #11（d_E = ' + f(R.pts[10].dEuc, 2) + '）更靠近中心。',
        '納入共變異逆矩陣 Σ⁻¹ 後，#12 因違背正相關規律，馬氏距離飆升至 d_M = ' + f(R.pts[11].dMah, 2) + '（全場最高），而順著對角線的 #11 僅 ' + f(R.pts[10].dMah, 2) + '。',
        '馬氏距離相當於「先轉到 PCA 主成分軸並除以各軸標準差後的歐氏距離」，是多變量常態異常偵測（EllipticEnvelope）的核心。'
      ];
    },
    aistudio: {
      operators: ['Read CSV', 'Normalize', 'Detect Outlier (Distances / Mahalanobis)'],
      params: [
        ['Detect Outlier › distance measure', 'Mahalanobis Distance / EllipticEnvelope'],
        ['threshold', p => String(p.th)]
      ],
      note: 'scikit-learn 的 covariance.EllipticEnvelope 即基於穩健共變異數矩陣與馬氏距離建立橢圓異常邊界。',
      expect: (steps, rows, p) => {
        const R = analyze(rows, p);
        return ['#12 馬氏距離 = ' + f(R.pts[11].dMah, 2) + '（排名第 1 異常）'];
      },
      python: 'from sklearn.covariance import EllipticEnvelope\nenv = EllipticEnvelope(contamination=0.1).fit(Z)\npred = env.predict(Z)',
      confirmed: false
    }
  });
})();
