/* ==========================================================================
   views.js — 每一個畫面
   每個 view 回傳 { title, html, mount? }；mount 只用來掛互動（篩選、搜尋）。
   ========================================================================== */

import {
  db, stats, blueprintCell, gatesForStage, puzzleMeta, domainMeta,
  DOMAINS, STAGES, PUZZLE_ORDER
} from './store.js';
import {
  esc, dash, card, stat, table, defList, linkList, crumb, empty, barList,
  puzzleTag, decisionTag, riskTag, gateTag, levelTag, maturityTag, scoreBar,
  statusTag, fmtMoney
} from './ui.js';

/* --------------------------------------------------------------------------
   共用：可篩選的清單
   -------------------------------------------------------------------------- */
function filterBar(controls) {
  return `<div class="filters">
    ${controls.map(c => {
      if (c.type === 'search') {
        return `<input type="search" id="${c.id}" placeholder="${esc(c.placeholder)}" aria-label="${esc(c.placeholder)}">`;
      }
      return `<select id="${c.id}" aria-label="${esc(c.label)}">
        <option value="">${esc(c.label)}：全部</option>
        ${c.options.map(o => `<option value="${esc(o)}">${esc(o)}</option>`).join('')}
      </select>`;
    }).join('')}
    <span class="filters__count" id="filterCount"></span>
  </div>`;
}

/** 把篩選列接起來：每次變動就重新畫表格 */
function wireFilters(controlIds, render) {
  const inputs = controlIds.map(id => document.getElementById(id)).filter(Boolean);
  const target = document.getElementById('filterTarget');
  const counter = document.getElementById('filterCount');

  const apply = () => {
    const values = {};
    inputs.forEach(el => { values[el.id] = el.value.trim(); });
    const { html, count, total } = render(values);
    target.innerHTML = html;
    if (counter) counter.textContent = count === total ? `共 ${total} 筆` : `${count} / ${total} 筆`;
  };

  inputs.forEach(el => {
    el.addEventListener(el.type === 'search' ? 'input' : 'change', apply);
  });
  apply();
}

function uniq(list) {
  return [...new Set(list.filter(Boolean))].sort();
}

function matches(haystack, needle) {
  if (!needle) return true;
  return haystack.toLowerCase().includes(needle.toLowerCase());
}

/* --------------------------------------------------------------------------
   總覽
   -------------------------------------------------------------------------- */
export function dashboard() {
  const s = stats();
  const meta = db.meta;

  const puzzleCards = PUZZLE_ORDER.map(name => {
    const m = puzzleMeta(name);
    return stat({
      label: `${m.symbol} ${m.label}`,
      value: s.byPuzzle[name],
      note: m.note,
      variant: m.key === 'gap' ? 'gap' : m.key === 'lead' ? 'lead' : ''
    });
  }).join('');

  const decisionBars = barList([
    { label: '立即推進 Go',       value: s.go },
    { label: '快速小案 Quick-win', value: s.quickWin },
    { label: '先補條件 Prepare',   value: s.prepare },
    { label: '儲備觀察 Backlog',   value: s.backlog }
  ]);

  const stageBars = barList(STAGES.map(st => ({
    label: `${st.id} ${st.name}`,
    value: db.capabilities.filter(c => c.stage === st.id).length,
    href: `#/caps?stage=${st.id}`
  })));

  const domainGaps = barList(
    DOMAINS.map(d => ({
      label: d.short,
      value: db.capabilities.filter(c => (c.domain || '').startsWith(d.id) && c.puzzle === '缺口-待尋找').length,
      href: `#/caps?domain=${d.id}`
    })).filter(i => i.value > 0),
    { max: 4 }
  );

  const topOpps = db.opportunities
    .filter(o => o.rank)
    .sort((a, b) => a.rank - b.rank)
    .slice(0, 10);

  const gapRows = s.gaps.map(c => ({ ...c }));

  return {
    title: '總覽',
    html: `
      <div class="page-head">
        <h1>VMH-EcoMap 知識管理系統</h1>
        <p>越南現代醫院生態導入盤點器。三軸式顧問工具的線上版：<strong>能做什麼</strong>（能力模組）·
        <strong>誰能做</strong>（夥伴拼圖）· <strong>何時做</strong>（階段路徑）· <strong>做到什麼程度才算合格</strong>（法規門檻）。
        所有數字來自主工具 ${esc(meta.sourceFile || '')}，於 ${esc(meta.generatedAt || '')} 產出。</p>
      </div>

      <div class="grid grid--stats" style="margin-bottom:16px">${puzzleCards}</div>

      <div class="grid grid--stats" style="margin-bottom:16px">
        ${stat({ label: '能力項總數', value: s.capTotal, note: `10 大領域 × 7 個階段` })}
        ${stat({ label: '可談的生意', value: s.oppTotal, note: `其中 ${s.oppWhitespace} 門在越南幾乎空白` })}
        ${stat({ label: '未確認強制法規', value: s.mandatoryOpen, note: `共 ${s.mandatory} 條強制法規`, variant: 'warn' })}
        ${stat({ label: '極高＋高風險', value: s.highRisks.length, note: '機率 × 衝擊 ≥ 12', variant: 'warn' })}
        ${stat({ label: '夥伴角色', value: s.partnerTotal, note: `其中 ${s.partnerGaps} 個是待尋找的缺口` })}
        ${stat({ label: '正在談的商機', value: s.pipelineTotal, note: '見「商機清單」' })}
      </div>

      ${s.gaps.length ? `<div class="callout callout--gap" style="margin-bottom:16px">
        <strong>今天最重要的一件事：${s.gaps.length} 個位置目前完全沒有人。</strong>
        這不是「還沒討論」，是工具判定沒有候選夥伴。誰能補，誰就有位置 —
        <a href="#/gaps" style="color:inherit;text-decoration:underline">開啟缺口招募清單</a>。
      </div>` : ''}

      <div class="grid grid--2" style="margin-bottom:16px">
        ${card({
          title: '商業判斷分佈',
          note: '先過硬門檻，再看價值與準備度兩個分數',
          body: decisionBars
        })}
        ${card({
          title: '工作量落在哪個階段',
          note: '一半以上的可交付工作落在 G4 建置整合',
          body: stageBars
        })}
      </div>

      <div class="grid grid--2" style="margin-bottom:16px">
        ${card({
          title: '哪些領域有缺口',
          note: '缺口集中的地方＝聯盟最薄的地方',
          body: domainGaps || empty('目前沒有缺口')
        })}
        ${card({
          title: '攻擊順位 Top 10',
          note: '優先分＝0.45×價值＋0.35×準備＋0.2×越南空白程度－缺口扣分',
          body: table(topOpps, [
            { key: 'rank', label: '#', className: 'num', render: o => `<b>${o.rank}</b>` },
            { key: 'name', label: '商機', render: o => `<a href="#/opp/${o.id}" class="rowlink">${esc(o.name)}</a><span class="sub">${esc(o.family)}</span>` },
            { key: 'vnMaturity', label: '越南現況', render: o => maturityTag(o.vnMaturity) },
            { key: 'priority', label: '優先分', className: 'num', render: o => o.priority ? o.priority.toFixed(2) : '—' }
          ])
        })}
      </div>

      ${card({
        title: `缺口清單：${gapRows.length} 個沒有人的位置`,
        note: '價值分高、準備分低＝越南很需要，但我們還沒有人',
        flush: true,
        body: table(gapRows, [
          { key: 'id', label: '能力', render: c => `<a href="#/cap/${c.id}" class="rowlink">${esc(c.name)}</a><span class="sub">${esc(c.id)}</span>` },
          { key: 'domain', label: '領域／階段', render: c => `${esc(domainMeta(c.domain).short)}<span class="sub">${esc(c.stage)}</span>` },
          { key: 'gapNext', label: '我們缺的是什麼' },
          { key: 'value', label: '價值', className: 'num', render: c => scoreBar(c.value) },
          { key: 'ready', label: '準備', className: 'num', render: c => scoreBar(c.ready, 'ready') }
        ])
      })}
    `
  };
}

/* --------------------------------------------------------------------------
   總藍圖
   -------------------------------------------------------------------------- */
export function blueprint() {
  const s = stats();

  const gateCells = STAGES.map(st => {
    const applicable = gatesForStage(st.id);
    const mandatory = applicable.filter(g => g.level === '強制');
    const open = mandatory.filter(g => g.status === '待確認');
    const names = mandatory.slice(0, 5).map(g => g.id.replace(/^VN-/, '')).join('·') || '—';
    return `<td>
      <strong>${esc(names)}</strong>
      ${open.length ? `<span style="color:var(--danger-fg)">未確認 ${open.length} 項</span>` : '<span>強制法規均已確認</span>'}
    </td>`;
  }).join('');

  const bodyRows = DOMAINS.map(d => {
    const gapCount = db.capabilities.filter(c => (c.domain || '').startsWith(d.id) && c.puzzle === '缺口-待尋找').length;
    const cells = STAGES.map(st => {
      const caps = blueprintCell(d.id, st.id);
      if (!caps.length) return `<td><div class="cell cell--empty"></div></td>`;
      const links = caps.map(c => {
        const m = puzzleMeta(c.puzzle);
        return `<a href="#/cap/${c.id}" class="s-${m.key}" title="${esc(c.puzzle)}｜${esc(c.outcome || '')}">
          ${m.symbol} <b>${esc(c.id.replace('CAP-', ''))}</b> ${esc(c.name)}
        </a>`;
      }).join('');
      return `<td><div class="cell">${links}</div></td>`;
    }).join('');
    return `<tr>
      <th class="rowhead">
        <a href="#/caps?domain=${d.id}" style="color:inherit">${esc(d.full)}</a>
        <small>${gapCount ? `○ 缺口 ${gapCount} 項` : '無缺口'}</small>
      </th>
      ${cells}
    </tr>`;
  }).join('');

  const legend = PUZZLE_ORDER.map(name => {
    const m = puzzleMeta(name);
    return `<span class="tag tag--${m.key}">${m.symbol} ${esc(m.label)} ${s.byPuzzle[name]}</span>`;
  }).join(' ');

  return {
    title: '總藍圖',
    html: `
      <div class="page-head">
        <h1>01 總藍圖</h1>
        <p>橫軸走時間（A 軸 Stage-Gate），縱軸看領域（C 軸能力模組），最上面那一列是每個階段的法規門檻（B 軸）。
        三軸交會的每一格＝某個領域在某個階段的具體商機。<strong>紅色就是還沒有人的空白。</strong></p>
      </div>

      <div class="card" style="margin-bottom:16px">
        <div class="card__head"><h2>看圖三步</h2><p>① 找到你的領域列　② 看你在哪個階段有東西　③ ○ 紅色＝目前沒有人，就是機會</p></div>
        <div class="card__body"><div class="chipbar">${legend}</div></div>
      </div>

      <section class="card">
        <div class="card__body card__body--flush">
          <div class="blueprint" style="padding:14px">
            <table class="matrix">
              <thead>
                <tr>
                  <th class="rowhead">Y軸＝C 能力模組 ↓</th>
                  ${STAGES.map(st => `<th>${st.id} ${esc(st.name)}<small>${esc(st.months)}（示意）</small></th>`).join('')}
                </tr>
              </thead>
              <tbody>
                <tr class="gaterow">
                  <th class="rowhead">B軸 法規門檻<small>Gate checklist</small></th>
                  ${gateCells}
                </tr>
                ${bodyRows}
              </tbody>
            </table>
          </div>
        </div>
      </section>
    `
  };
}

/* --------------------------------------------------------------------------
   能力總表
   -------------------------------------------------------------------------- */
export function capabilities(params) {
  const all = db.capabilities;
  const controls = [
    { type: 'search', id: 'fq', placeholder: '搜尋能力、成果、缺什麼…' },
    { type: 'select', id: 'fdomain',   label: '領域',     options: DOMAINS.map(d => d.full) },
    { type: 'select', id: 'fstage',    label: '階段',     options: STAGES.map(s => s.id) },
    { type: 'select', id: 'fpuzzle',   label: '拼圖狀態', options: PUZZLE_ORDER },
    { type: 'select', id: 'fdecision', label: '商業判斷', options: uniq(all.map(c => c.decision)) }
  ];

  const columns = [
    { key: 'id', label: '能力項目', render: c => `<a href="#/cap/${c.id}" class="rowlink">${esc(c.name)}</a><span class="sub">${esc(c.id)}　${esc(c.nameEn || '')}</span>` },
    { key: 'domain', label: '領域', render: c => `${esc(domainMeta(c.domain).short)}` },
    { key: 'stage', label: '階段', render: c => `<span class="tag tag--mono">${esc(c.stage)}</span>` },
    { key: 'puzzle', label: '拼圖狀態', render: c => puzzleTag(c.puzzle) },
    { key: 'candidate', label: '候選夥伴', render: c => c.partnerId
        ? `<a href="#/partner/${c.partnerId}">${esc(c.candidate)}</a>`
        : dash(c.candidate) },
    { key: 'value', label: '價值', className: 'num', render: c => scoreBar(c.value) },
    { key: 'ready', label: '準備', className: 'num', render: c => scoreBar(c.ready, 'ready') },
    { key: 'decision', label: '商業判斷', render: c => decisionTag(c.decision) }
  ];

  return {
    title: '能力總表',
    html: `
      <div class="page-head">
        <h1>03 能力總表</h1>
        <p>C 軸的 ${all.length} 項能力，是整套工具唯一的資料源：能做什麼／缺什麼／誰能做／值多少／多成熟。
        點任一列可以看到它的完整體檢表與所有關聯。</p>
      </div>
      <section class="card">
        ${filterBar(controls)}
        <div class="card__body card__body--flush" id="filterTarget"></div>
      </section>
    `,
    mount() {
      if (params.domain) {
        const d = DOMAINS.find(x => x.id === params.domain);
        if (d) document.getElementById('fdomain').value = d.full;
      }
      if (params.stage)  document.getElementById('fstage').value = params.stage;
      if (params.puzzle) document.getElementById('fpuzzle').value = params.puzzle;

      wireFilters(controls.map(c => c.id), values => {
        const rows = all.filter(c =>
          matches([c.id, c.name, c.nameEn, c.outcome, c.gapNext, c.deliverable, c.lead, c.candidate].join(' '), values.fq) &&
          (!values.fdomain   || c.domain === values.fdomain) &&
          (!values.fstage    || c.stage === values.fstage) &&
          (!values.fpuzzle   || c.puzzle === values.fpuzzle) &&
          (!values.fdecision || c.decision === values.fdecision)
        );
        return { html: table(rows, columns), count: rows.length, total: all.length };
      });
    }
  };
}

export function capability(id) {
  const cap = db.index.capById.get(id);
  if (!cap) return notFound('能力', id, '#/caps');

  const opps = (cap.opportunityIds || []).map(oid => db.index.oppById.get(oid)).filter(Boolean);
  const gates = (cap.gates || []).map(gid => db.index.gateById.get(gid)).filter(Boolean);
  const risks = db.index.risksByCap.get(cap.id) || [];
  const wps = db.index.wpsByCap.get(cap.id) || [];
  const depends = (cap.depends || []).map(d => db.index.capById.get(d)).filter(Boolean);
  const dependents = db.index.dependents.get(cap.id) || [];
  const partner = cap.partnerId ? db.index.partnerById.get(cap.partnerId) : null;

  const isGap = cap.puzzle === '缺口-待尋找';

  return {
    title: cap.name,
    html: `
      ${crumb([{ label: '能力總表', href: '#/caps' }, { label: cap.id }])}
      <div class="page-head">
        <h1>${esc(cap.name)}</h1>
        <p>${esc(cap.nameEn || '')}　·　${esc(cap.domain)}　·　${esc(cap.stage)} 階段</p>
        <div class="chipbar" style="margin-top:9px">
          ${puzzleTag(cap.puzzle)} ${decisionTag(cap.decision)} ${riskTag(cap.risk)}
          <span class="tag tag--mono">${esc(cap.id)}</span>
        </div>
      </div>

      ${isGap ? `<div class="callout callout--gap" style="margin-bottom:16px">
        <strong>這是一個缺口：目前完全沒有候選夥伴。</strong>${esc(cap.gapNext || '')}
      </div>` : ''}

      <div class="detail">
        <div style="display:grid;gap:16px">
          ${card({
            title: '體檢表',
            note: '值不值得做、缺什麼、誰負責',
            body: defList([
              ['預期成果', esc(cap.outcome)],
              ['業務線', dash(cap.bizLine)],
              ['主責角色', dash(cap.lead)],
              ['候選夥伴', partner ? `<a href="#/partner/${partner.id}">${esc(cap.candidate)}</a>` : dash(cap.candidate)],
              ['缺什麼／下一步', dash(cap.gapNext)],
              ['主要交付物', dash(cap.deliverable)],
              ['價值分', `${scoreBar(cap.value)} <span style="color:var(--faint);font-size:12px">政府 ${dash(cap.valueGov)}｜臨床 ${dash(cap.valueClinical)}｜商業 ${dash(cap.valueBusiness)}</span>`],
              ['準備分', `${scoreBar(cap.ready, 'ready')} <span style="color:var(--faint);font-size:12px">法規 ${dash(cap.readyReg)}｜夥伴 ${dash(cap.readyPartner)}｜資金 ${dash(cap.readyFunding)}</span>`],
              ['商業判斷', decisionTag(cap.decision)],
              ['證據／來源', dash(cap.evidence)],
              ['證據成熟度', cap.evidenceLevel
                ? statusTag(cap.evidenceLevel, String(cap.evidenceLevel).includes('推測') ? 'warn' : 'ok')
                : dash(null)],
              ['驗收指標／KPI', dash(cap.acceptanceKpi)],
              ['資料／系統依賴', dash(cap.dataDeps)],
              ['更新日', dash(cap.updated)]
            ])
          })}

          ${card({
            title: `入場券：${gates.length} 條適用的門檻`,
            note: '這些門檻沒過，東西進不了醫院',
            flush: true,
            body: table(gates, [
              { key: 'id', label: '代號', render: g => `<a href="#/gates" class="rowlink">${esc(g.id)}</a>` },
              { key: 'title', label: '要求／標準' },
              { key: 'level', label: '層級', render: g => levelTag(g.level) },
              { key: 'status', label: '狀態', render: g => gateTag(g.status) },
              { key: 'stages', label: '適用階段', render: g => (g.stages || []).map(s => `<span class="tag tag--mono">${esc(s)}</span>`).join(' ') }
            ], { emptyText: '本項未標註適用門檻' })
          })}

          ${risks.length ? card({
            title: '相關風險',
            flush: true,
            body: table(risks, [
              { key: 'id', label: '風險', render: r => `<a href="#/risks" class="rowlink">${esc(r.id)}</a>` },
              { key: 'statement', label: '風險敘述' },
              { key: 'level', label: '等級', render: r => riskTag(r.level) },
              { key: 'owner', label: '負責人' }
            ])
          }) : ''}
        </div>

        <div style="display:grid;gap:16px">
          ${card({
            title: `所屬商機（${opps.length}）`,
            note: '同一項能力可以同時卡進好幾門生意',
            body: linkList(opps.map(o => ({
              href: `#/opp/${o.id}`,
              label: `${o.id} ${o.name}`,
              note: `${o.family}｜${o.vnMaturity || ''}`
            })))
          })}
          ${card({
            title: `對應工作包（${wps.length}）`,
            note: '何時進場、誰主責、怎麼驗收',
            body: linkList(wps.map(w => ({
              href: `#/roadmap`,
              label: `${w.id} ${w.name}`,
              note: `第 ${w.startMonth} 個月起 · 為期 ${w.months} 個月｜主責 ${w.lead}`
            })))
          })}
          ${card({
            title: '依賴關係',
            note: '順序錯了就會白做',
            body: `
              <p style="font-size:12.5px;color:var(--faint);margin:0 0 4px">要先完成</p>
              ${linkList(depends.map(c => ({ href: `#/cap/${c.id}`, label: `${c.id} ${c.name}`, note: c.stage })))}
              <p style="font-size:12.5px;color:var(--faint);margin:14px 0 4px">誰在等這一項</p>
              ${linkList(dependents.map(c => ({ href: `#/cap/${c.id}`, label: `${c.id} ${c.name}`, note: c.stage })))}
            `
          })}
        </div>
      </div>
    `
  };
}

/* --------------------------------------------------------------------------
   商機字典 & 作戰卡
   -------------------------------------------------------------------------- */
export function opportunities(params) {
  const all = db.opportunities;
  const controls = [
    { type: 'search', id: 'fq', placeholder: '搜尋商機、在賣什麼、越南現況…' },
    { type: 'select', id: 'ffamily',   label: '族群',     options: uniq(all.map(o => o.family)) },
    { type: 'select', id: 'fmaturity', label: '越南現況', options: uniq(all.map(o => o.vnMaturity)) },
    { type: 'select', id: 'fposition', label: '能力對應', options: uniq(all.map(o => o.position)) },
    { type: 'select', id: 'ftier',     label: '金額級距', options: uniq(all.map(o => o.amountTier)) }
  ];

  const columns = [
    { key: 'rank', label: '順位', className: 'num', render: o => o.rank ? `<b>${o.rank}</b>` : '<span style="color:var(--faint)">—</span>' },
    { key: 'name', label: '商機', render: o => `<a href="#/opp/${o.id}" class="rowlink">${esc(o.name)}</a><span class="sub">${esc(o.id)}　${esc(o.family)}</span>` },
    { key: 'vnMaturity', label: '越南現況', render: o => maturityTag(o.vnMaturity) },
    { key: 'position', label: '聯盟能力對應', render: o => {
        const p = o.position || '';
        const kind = p.startsWith('★') ? 'danger' : p.startsWith('有缺口') ? 'warn' : 'ok';
        return statusTag(p, kind);
      } },
    { key: 'capCount', label: 'CAP', className: 'num', render: o => o.caps.length },
    { key: 'avgValue', label: '價值', className: 'num', render: o => o.avgValue ? scoreBar(o.avgValue) : '—' },
    { key: 'amountTier', label: '金額級距' },
    { key: 'txnMode', label: '交易模式' }
  ];

  const families = uniq(all.map(o => o.family));
  const familyBars = barList(families.map(f => ({
    label: f, value: all.filter(o => o.family === f).length
  })));

  return {
    title: '商機字典',
    html: `
      <div class="page-head">
        <h1>15 商機字典</h1>
        <p>越南醫院市場被拆成 ${all.length} 門可以獨立談的生意，分成 A~J 十個族群。每一門都寫清楚
        <strong>在賣什麼、誰付錢、大概多少錢、越南現況</strong>。標 ③ 尚未出現的，代表越南目前幾乎沒人在做 —— 先進場的人定規則。</p>
      </div>

      <div class="grid grid--stats" style="margin-bottom:16px">
        ${stat({ label: '商機總數', value: all.length })}
        ${stat({ label: '③ 越南幾乎空白', value: all.filter(o => (o.vnMaturity || '').startsWith('③')).length, note: '主動出擊的空間' })}
        ${stat({ label: '★ 白地商機', value: all.filter(o => (o.position || '').startsWith('★')).length, note: '聯盟目前無對應能力，是招募英雄帖', variant: 'gap' })}
        ${stat({ label: '有缺口可招募', value: all.filter(o => (o.position || '').startsWith('有缺口')).length })}
      </div>

      ${card({ title: '族群分佈', body: familyBars })}

      <section class="card" style="margin-top:16px">
        ${filterBar(controls)}
        <div class="card__body card__body--flush" id="filterTarget"></div>
      </section>
    `,
    mount() {
      if (params.family)   document.getElementById('ffamily').value = params.family;
      if (params.maturity) document.getElementById('fmaturity').value = params.maturity;

      wireFilters(controls.map(c => c.id), values => {
        const rows = all.filter(o =>
          matches([o.id, o.name, o.nameEn, o.whatWeSell, o.vnNotes, o.competitors, o.ourAngle].join(' '), values.fq) &&
          (!values.ffamily   || o.family === values.ffamily) &&
          (!values.fmaturity || o.vnMaturity === values.fmaturity) &&
          (!values.fposition || o.position === values.fposition) &&
          (!values.ftier     || o.amountTier === values.ftier)
        ).sort((a, b) => (a.rank || 999) - (b.rank || 999));
        return { html: table(rows, columns), count: rows.length, total: all.length };
      });
    }
  };
}

export function opportunity(id) {
  const opp = db.index.oppById.get(id);
  if (!opp) return notFound('商機', id, '#/opps');

  const caps = opp.caps || [];
  const gapCaps = opp.gapCaps || [];
  const gateIds = uniq(caps.flatMap(c => c.gates || []));
  const gates = gateIds.map(g => db.index.gateById.get(g)).filter(Boolean);
  const partners = uniq(caps.map(c => c.partnerId).filter(Boolean))
    .map(pid => db.index.partnerById.get(pid)).filter(Boolean);
  const pipelineRow = db.pipeline.find(p => p.oppId === opp.id);

  return {
    title: opp.name,
    html: `
      ${crumb([{ label: '商機字典', href: '#/opps' }, { label: opp.id }])}
      <div class="page-head">
        <h1>${esc(opp.name)}</h1>
        <p>${esc(opp.nameEn || '')}　·　${esc(opp.family)}</p>
        <div class="chipbar" style="margin-top:9px">
          ${maturityTag(opp.vnMaturity)}
          ${opp.rank ? `<span class="tag tag--info">攻擊順位 #${opp.rank}</span>` : ''}
          ${pipelineRow ? `<span class="tag tag--ok">已列入商機清單 · ${esc(pipelineRow.dealStage || '')}</span>` : ''}
          <span class="tag tag--mono">${esc(opp.id)}</span>
        </div>
      </div>

      <div class="callout" style="margin-bottom:16px">
        <strong>這門生意在賣什麼／誰付錢</strong>${esc(opp.whatWeSell || '')}
      </div>

      ${gapCaps.length ? `<div class="callout callout--gap" style="margin-bottom:16px">
        <strong>斷點：這門生意需要的 ${gapCaps.length} 項能力目前沒有人。</strong>
        ${gapCaps.map(c => `<a href="#/cap/${c.id}" style="color:inherit;text-decoration:underline">${esc(c.id)} ${esc(c.name)}</a>`).join('、')}
      </div>` : ''}

      <div class="detail">
        <div style="display:grid;gap:16px">
          ${card({
            title: `需要哪些能力（${caps.length}）`,
            note: '紅色列＝斷點，這門生意卡在這裡',
            flush: true,
            body: table(caps, [
              { key: 'id', label: '能力', render: c => `<a href="#/cap/${c.id}" class="rowlink">${esc(c.name)}</a><span class="sub">${esc(c.id)}</span>` },
              { key: 'domain', label: '領域／階段', render: c => `${esc(domainMeta(c.domain).short)}<span class="sub">${esc(c.stage)}</span>` },
              { key: 'puzzle', label: '誰在做', render: c => puzzleTag(c.puzzle) },
              { key: 'candidate', label: '候選夥伴', render: c => c.partnerId ? `<a href="#/partner/${c.partnerId}">${esc(c.candidate)}</a>` : dash(c.candidate) },
              { key: 'ready', label: '準備', className: 'num', render: c => scoreBar(c.ready, 'ready') }
            ], { emptyText: '★ 白地商機：目前沒有任何能力對得上，需新增能力或找新夥伴。' })
          })}

          ${card({
            title: `卡哪些門檻（${gates.length}）`,
            note: '強制項未過，不承諾時程',
            flush: true,
            body: table(gates, [
              { key: 'id', label: '代號', className: 'mono' },
              { key: 'title', label: '要求／標準' },
              { key: 'level', label: '層級', render: g => levelTag(g.level) },
              { key: 'status', label: '狀態', render: g => gateTag(g.status) }
            ], { emptyText: '未標註適用門檻' })
          })}
        </div>

        <div style="display:grid;gap:16px">
          ${card({
            title: '怎麼打',
            body: defList([
              ['典型切入階段', dash(opp.stage)],
              ['典型付費方', dash(opp.payer)],
              ['交易模式', dash(opp.txnMode)],
              ['金額級距', dash(opp.amountTier)],
              ['可否獨立成案', dash(opp.standalone)],
              ['建議主責', dash(opp.lead)],
              ['平均價值分', opp.avgValue ? scoreBar(opp.avgValue) : dash(null)],
              ['平均準備分', opp.avgReady ? scoreBar(opp.avgReady, 'ready') : dash(null)],
              ['攻擊優先分', opp.priority ? opp.priority.toFixed(2) : dash(null)]
            ])
          })}
          ${card({
            title: '對手是誰、憑什麼贏',
            body: `
              <p style="font-size:12.5px;color:var(--faint);margin:0 0 3px">主要競爭者／在地玩家</p>
              <p style="margin:0 0 14px;font-size:13.5px">${dash(opp.competitors)}</p>
              <p style="font-size:12.5px;color:var(--faint);margin:0 0 3px">我們的切入角度</p>
              <p style="margin:0;font-size:13.5px">${dash(opp.ourAngle)}</p>
            `
          })}
          ${card({
            title: '越南在地重點',
            body: `<p style="margin:0;font-size:13.5px">${dash(opp.vnNotes)}</p>`
          })}
          ${partners.length ? card({
            title: '相關夥伴',
            body: linkList(partners.map(p => ({ href: `#/partner/${p.id}`, label: `${p.id} ${p.name}`, note: p.status })))
          }) : ''}
        </div>
      </div>
    `
  };
}

/* --------------------------------------------------------------------------
   夥伴拼圖
   -------------------------------------------------------------------------- */
export function partners() {
  const all = db.partners;
  const controls = [
    { type: 'search', id: 'fq', placeholder: '搜尋夥伴、角色、聯盟定位…' },
    { type: 'select', id: 'ftype',    label: '類型',   options: uniq(all.map(p => p.type)) },
    { type: 'select', id: 'fcountry', label: '國別',   options: uniq(all.map(p => p.country)) },
    { type: 'select', id: 'fstatus',  label: '狀態',   options: uniq(all.map(p => p.status)) },
    { type: 'select', id: 'fdomain',  label: '涵蓋領域', options: DOMAINS.map(d => d.id) }
  ];

  const columns = [
    { key: 'name', label: '夥伴／角色', render: p => `<a href="#/partner/${p.id}" class="rowlink">${esc(p.name)}</a><span class="sub">${esc(p.id)}　${esc(p.nameEn || '')}</span>` },
    { key: 'type', label: '類型' },
    { key: 'country', label: '國別' },
    { key: 'domains', label: '涵蓋領域', render: p => (p.domains || []).map(d => `<span class="tag tag--mono">${esc(d)}</span>`).join(' ') },
    { key: 'capCount', label: '被指名能力', className: 'num', render: p => `${p.capCount}${p.gapCount ? ` <span class="tag tag--gap">缺 ${p.gapCount}</span>` : ''}` },
    { key: 'fit', label: '適配分', className: 'num', render: p => scoreBar(p.fit) },
    { key: 'sourceRisk', label: '來源風險', render: p => {
        const t = p.sourceRisk || '';
        return statusTag(t, t.includes('High') ? 'danger' : t.includes('Medium') ? 'warn' : 'ok');
      } },
    { key: 'status', label: '狀態', render: p => statusTag(p.status, (p.status || '').includes('缺口') ? 'gap' : 'neutral') }
  ];

  // 夥伴 × 領域 覆蓋矩陣
  const coverage = `<div class="tablewrap"><table class="data">
    <thead><tr><th>夥伴</th>${DOMAINS.map(d => `<th class="num" title="${esc(d.full)}">${esc(d.id)}</th>`).join('')}<th class="num">覆蓋數</th></tr></thead>
    <tbody>${all.map(p => `<tr>
      <td><a href="#/partner/${p.id}" class="rowlink">${esc(p.id)} ${esc(p.name)}</a></td>
      ${DOMAINS.map(d => `<td class="num">${(p.domains || []).includes(d.id) ? '✓' : ''}</td>`).join('')}
      <td class="num"><b>${(p.domains || []).length}</b></td>
    </tr>`).join('')}
    <tr style="background:var(--surface-3)">
      <td><b>覆蓋夥伴數 / 領域</b></td>
      ${DOMAINS.map(d => `<td class="num"><b>${all.filter(p => (p.domains || []).includes(d.id)).length}</b></td>`).join('')}
      <td></td>
    </tr>
    <tr style="background:var(--surface-3)">
      <td><b>○ 能力缺口數 / 領域</b></td>
      ${DOMAINS.map(d => {
        const n = db.capabilities.filter(c => (c.domain || '').startsWith(d.id) && c.puzzle === '缺口-待尋找').length;
        return `<td class="num">${n ? `<b style="color:var(--danger-fg)">${n}</b>` : ''}</td>`;
      }).join('')}
      <td></td>
    </tr>
    </tbody></table></div>`;

  return {
    title: '夥伴拼圖',
    html: `
      <div class="page-head">
        <h1>04 夥伴拼圖</h1>
        <p>誰能做。名冊用七個構面評分——實績、顧問、建置、營運、財務、互通、在地——
        <strong>關係 ≠ 交付能力，工具用實績評分，不用交情評分。</strong>
        另有一欄「來源風險」是內部稽核欄位：軟硬體與韌體來源國、資料存取權、供應鏈替代性。</p>
      </div>

      <section class="card" style="margin-bottom:16px">
        ${filterBar(controls)}
        <div class="card__body card__body--flush" id="filterTarget"></div>
      </section>

      ${card({
        title: '夥伴 × 領域 覆蓋矩陣',
        note: '某領域「覆蓋夥伴數」低且「能力缺口數」> 0 ＝優先補強的拼圖',
        flush: true,
        body: coverage
      })}
    `,
    mount() {
      wireFilters(controls.map(c => c.id), values => {
        const rows = all.filter(p =>
          matches([p.id, p.name, p.nameEn, p.role, p.nextAction].join(' '), values.fq) &&
          (!values.ftype    || p.type === values.ftype) &&
          (!values.fcountry || p.country === values.fcountry) &&
          (!values.fstatus  || p.status === values.fstatus) &&
          (!values.fdomain  || (p.domains || []).includes(values.fdomain))
        );
        return { html: table(rows, columns), count: rows.length, total: all.length };
      });
    }
  };
}

export function partner(id) {
  const p = db.index.partnerById.get(id);
  if (!p) return notFound('夥伴', id, '#/partners');

  const caps = db.index.capsByPartner.get(p.id) || [];
  const opps = uniq(caps.flatMap(c => c.opportunityIds || []))
    .map(oid => db.index.oppById.get(oid)).filter(Boolean);

  const scoreLabels = {
    references: '實績 References', advisory: '顧問 Advisory', build: '建置 Build',
    operate: '營運 Operate', finance: '財務 Finance', interop: '互通 Interop',
    localization: '在地化 Localization'
  };

  return {
    title: p.name,
    html: `
      ${crumb([{ label: '夥伴拼圖', href: '#/partners' }, { label: p.id }])}
      <div class="page-head">
        <h1>${esc(p.name)}</h1>
        <p>${esc(p.nameEn || '')}　·　${esc(p.type || '')}　·　${esc(p.country || '')}</p>
        <div class="chipbar" style="margin-top:9px">
          ${statusTag(p.status, (p.status || '').includes('缺口') ? 'gap' : 'neutral')}
          <span class="tag tag--mono">${esc(p.id)}</span>
          ${(p.domains || []).map(d => `<span class="tag tag--mono">${esc(d)}</span>`).join(' ')}
        </div>
      </div>

      <div class="grid grid--stats" style="margin-bottom:16px">
        ${stat({ label: '被指名能力項數', value: p.capCount })}
        ${stat({ label: '其中缺口', value: p.gapCount, variant: p.gapCount ? 'gap' : '' })}
        ${stat({ label: '其中可立即推進', value: p.goCount, variant: 'lead' })}
        ${stat({ label: '適配分', value: (p.fit ?? 0).toFixed(1), note: '七構面平均' })}
      </div>

      <div class="detail">
        <div style="display:grid;gap:16px">
          ${card({
            title: `被指名的能力項（${caps.length}）`,
            note: '一對一洽談時，直接告訴對方「你可以卡進哪幾門生意」',
            flush: true,
            body: table(caps, [
              { key: 'id', label: '能力', render: c => `<a href="#/cap/${c.id}" class="rowlink">${esc(c.name)}</a><span class="sub">${esc(c.id)}</span>` },
              { key: 'domain', label: '領域／階段', render: c => `${esc(domainMeta(c.domain).short)}<span class="sub">${esc(c.stage)}</span>` },
              { key: 'puzzle', label: '拼圖狀態', render: c => puzzleTag(c.puzzle) },
              { key: 'value', label: '價值', className: 'num', render: c => scoreBar(c.value) },
              { key: 'ready', label: '準備', className: 'num', render: c => scoreBar(c.ready, 'ready') },
              { key: 'decision', label: '商業判斷', render: c => decisionTag(c.decision) }
            ], { emptyText: '目前沒有能力項指名這個夥伴' })
          })}
        </div>

        <div style="display:grid;gap:16px">
          ${card({
            title: '資格評分',
            note: '每項 0–5 分，適配分自動平均',
            body: `<div class="bars">${Object.entries(scoreLabels).map(([key, label]) =>
              `<div class="bar">
                <span>${esc(label)}</span>
                <span class="bar__track"><span class="bar__fill" style="width:${((p.scores?.[key] || 0) / 5) * 100}%"></span></span>
                <span class="bar__val">${p.scores?.[key] ?? 0}</span>
              </div>`).join('')}</div>`
          })}
          ${card({
            title: '基本資料',
            body: defList([
              ['聯盟定位', dash(p.role)],
              ['越南據點', dash(p.vnPresence)],
              ['來源風險', dash(p.sourceRisk)],
              ['下一步', dash(p.nextAction)]
            ])
          })}
          ${card({
            title: `可以卡進的生意（${opps.length}）`,
            body: linkList(opps.map(o => ({ href: `#/opp/${o.id}`, label: `${o.id} ${o.name}`, note: o.family })))
          })}
        </div>
      </div>
    `
  };
}

/* --------------------------------------------------------------------------
   法規門檻
   -------------------------------------------------------------------------- */
export function gates() {
  const all = db.gates;
  const controls = [
    { type: 'search', id: 'fq', placeholder: '搜尋法規、標準、主管機關…' },
    { type: 'select', id: 'fcategory', label: '類別', options: uniq(all.map(g => g.category)) },
    { type: 'select', id: 'flevel',    label: '層級', options: uniq(all.map(g => g.level)) },
    { type: 'select', id: 'fstatus',   label: '狀態', options: uniq(all.map(g => g.status)) },
    { type: 'select', id: 'fstage',    label: '適用階段', options: STAGES.map(s => s.id) }
  ];

  const columns = [
    { key: 'id', label: '代號', render: g => `<span class="tag tag--mono">${esc(g.id)}</span>` },
    { key: 'title', label: '要求／標準', render: g => g.url
        ? `<a href="${esc(g.url)}" target="_blank" rel="noopener" class="rowlink">${esc(g.title)}</a><span class="sub">${esc(g.authority || '')}</span>`
        : `<span class="rowlink">${esc(g.title)}</span><span class="sub">${esc(g.authority || '')}</span>` },
    { key: 'level', label: '層級', render: g => levelTag(g.level) },
    { key: 'status', label: '狀態', render: g => gateTag(g.status) },
    { key: 'stages', label: '適用階段', render: g => STAGES.map(s =>
        `<span class="tag tag--mono" style="opacity:${(g.stages || []).includes(s.id) ? 1 : .18}">${esc(s.id)}</span>`).join(' ') },
    { key: 'owner', label: '負責人' },
    { key: 'note', label: '備註' }
  ];

  const mandatory = all.filter(g => g.level === '強制');
  const open = mandatory.filter(g => g.status === '待確認');

  return {
    title: '法規門檻',
    html: `
      <div class="page-head">
        <h1>05 法規門檻</h1>
        <p>B 軸：不論你賣什麼，這些門檻沒過，你的東西進不了醫院。越南強制法規優先，其後是國際標準與認證。
        提案時請附上：產品在越南的註冊狀態或路徑、資料存放位置、供應鏈與韌體來源國。</p>
      </div>

      <div class="grid grid--stats" style="margin-bottom:16px">
        ${stat({ label: '強制法規', value: mandatory.length, note: '越南法律層級' })}
        ${stat({ label: '尚未確認', value: open.length, note: '過不了關就白做', variant: 'warn' })}
        ${stat({ label: '國際標準與認證', value: all.length - mandatory.length })}
      </div>

      <div class="callout callout--warn" style="margin-bottom:16px">
        <strong>顧問提醒｜雲端</strong>
        越南把健康資料視為敏感個資。境外雲端只能列為候選方案，必須先完成資料分類、在地保存、跨境傳輸與金鑰控制評估，
        才決定地端／越南雲／混合雲。
      </div>

      <section class="card">
        ${filterBar(controls)}
        <div class="card__body card__body--flush" id="filterTarget"></div>
      </section>
    `,
    mount() {
      wireFilters(controls.map(c => c.id), values => {
        const rows = all.filter(g =>
          matches([g.id, g.title, g.authority, g.note].join(' '), values.fq) &&
          (!values.fcategory || g.category === values.fcategory) &&
          (!values.flevel    || g.level === values.flevel) &&
          (!values.fstatus   || g.status === values.fstatus) &&
          (!values.fstage    || (g.stages || []).includes(values.fstage))
        );
        return { html: table(rows, columns), count: rows.length, total: all.length };
      });
    }
  };
}

/* --------------------------------------------------------------------------
   行動路線
   -------------------------------------------------------------------------- */
export function roadmap() {
  const wps = db.workpackages;
  const horizon = Math.max(60, ...wps.map(w => w.endMonth || 0));

  const bars = wps.map(w => {
    const start = ((w.startMonth - 1) / horizon) * 100;
    const width = ((w.months || 1) / horizon) * 100;
    return `
      <div class="gantt__label">
        <b><a href="#/wp/${w.id}" style="color:inherit">${esc(w.id)} ${esc(w.name)}</a></b>
        <span>${esc(w.stage)}｜M${w.startMonth}–M${w.endMonth}｜${esc(w.lead || '')}</span>
      </div>
      <div class="gantt__track">
        <div class="gantt__bar g-${esc(w.stage)}" style="left:${start}%;width:${width}%" title="${esc(w.acceptance || '')}">
          ${w.months} 個月
        </div>
      </div>`;
  }).join('');

  const scale = `<div class="gantt__label"></div><div class="gantt__scale">
    ${[0, 12, 24, 36, 48].map(m => `<span>M${m || 1}</span>`).join('')}
  </div>`;

  return {
    title: '行動路線',
    html: `
      <div class="page-head">
        <h1>06 行動路線</h1>
        <p>A 軸的執行版：${wps.length} 個工作包＝可簽約、可驗收的行動單位，橫跨 60 個月。
        每個工作包都必須通過對應階段的法規門檻才能過關。<strong>時程為工具內建示意值，正式授權後以實際專案起始日重設。</strong></p>
      </div>

      ${card({
        title: '60 個月整合路線圖',
        note: '顏色代表階段：G0–G1 授權評估 · G2–G3 規劃採購 · G4 建置 · G5 開院 · G6 複製',
        body: `<div class="gantt">${scale}${bars}</div>`
      })}

      <div style="margin-top:16px">
        ${card({
          title: '工作包明細',
          flush: true,
          body: table(wps, [
            { key: 'id', label: 'WP', render: w => `<a href="#/wp/${w.id}" class="rowlink">${esc(w.id)}</a>` },
            { key: 'name', label: '工作包', render: w => `<a href="#/wp/${w.id}" class="rowlink">${esc(w.name)}</a><span class="sub">${esc(w.stage)}</span>` },
            { key: 'lead', label: '主責' },
            { key: 'startMonth', label: '起月', className: 'num', render: w => `M${w.startMonth}` },
            { key: 'months', label: '月數', className: 'num' },
            { key: 'acceptance', label: '驗收門檻' },
            { key: 'status', label: '狀態', render: w => statusTag(w.status, w.status === '已完成' ? 'ok' : w.status === '進行中' ? 'info' : 'neutral') },
            { key: 'capIds', label: '對應能力', className: 'num', render: w => w.capIds.length }
          ])
        })}
      </div>
    `
  };
}

export function workpackage(id) {
  const wp = db.index.wpById.get(id);
  if (!wp) return notFound('工作包', id, '#/roadmap');

  const caps = wp.capIds.map(cid => db.index.capById.get(cid)).filter(Boolean);
  const preds = wp.predecessors.map(p => db.index.wpById.get(p)).filter(Boolean);
  const gateList = gatesForStage(wp.stage).filter(g => g.level === '強制');

  return {
    title: wp.name,
    html: `
      ${crumb([{ label: '行動路線', href: '#/roadmap' }, { label: wp.id }])}
      <div class="page-head">
        <h1>${esc(wp.name)}</h1>
        <p>${esc(wp.id)}　·　${esc(wp.stage)} 階段　·　第 ${wp.startMonth} 個月起，為期 ${wp.months} 個月（至 M${wp.endMonth}）</p>
      </div>

      <div class="detail">
        <div style="display:grid;gap:16px">
          ${card({
            title: '工作包規格',
            body: defList([
              ['主責 Lead', dash(wp.lead)],
              ['協作 Partners', (wp.partners || []).map(esc).join('、') || dash(null)],
              ['前置工作包', preds.length ? preds.map(p => `<a href="#/wp/${p.id}">${esc(p.id)} ${esc(p.name)}</a>`).join('、') : dash(null)],
              ['驗收門檻', dash(wp.acceptance)],
              ['狀態', statusTag(wp.status, 'neutral')],
              ['完成度', `${wp.percent ?? 0}%`]
            ])
          })}
          ${card({
            title: `對應能力（${caps.length}）`,
            flush: true,
            body: table(caps, [
              { key: 'id', label: '能力', render: c => `<a href="#/cap/${c.id}" class="rowlink">${esc(c.name)}</a><span class="sub">${esc(c.id)}</span>` },
              { key: 'puzzle', label: '拼圖狀態', render: c => puzzleTag(c.puzzle) },
              { key: 'decision', label: '商業判斷', render: c => decisionTag(c.decision) }
            ])
          })}
        </div>
        <div>
          ${card({
            title: `${wp.stage} 階段的強制法規`,
            note: '沒過就不能過關',
            body: linkList(gateList.map(g => ({
              href: '#/gates', label: `${g.id} ${g.title}`, note: `${g.status}｜${g.authority || ''}`
            })))
          })}
        </div>
      </div>
    `
  };
}

/* --------------------------------------------------------------------------
   缺口招募
   -------------------------------------------------------------------------- */
export function gaps() {
  const rows = db.capabilities
    .filter(c => c.puzzle === '缺口-待尋找')
    .map(c => ({ ...c, oppCount: (c.opportunityIds || []).length }))
    .sort((a, b) => b.oppCount - a.oppCount);

  return {
    title: '缺口招募',
    html: `
      <div class="page-head">
        <h1>11 缺口招募</h1>
        <p>自動列出所有「缺口-待尋找」的能力。要新增或移除，回到能力總表把拼圖狀態改成／改離「缺口-待尋找」即可。
        <strong>招募順序依「牽動幾門生意」排定 —— 先補牽動最多的那一個。</strong></p>
      </div>

      <div class="callout callout--gap" style="margin-bottom:16px">
        <strong>這一頁可以直接複製給候選夥伴當 RFI 需求說明。</strong>
        每一列都寫清楚：要找什麼能力、我們缺什麼、必須符合哪些標準與法規、以及它牽動幾門生意。
      </div>

      ${card({
        title: `目前缺口 ${rows.length} 筆`,
        flush: true,
        body: table(rows, [
          { key: 'id', label: '要找的能力', render: c => `<a href="#/cap/${c.id}" class="rowlink">${esc(c.name)}</a><span class="sub">${esc(c.id)}</span>` },
          { key: 'domain', label: '領域／階段', render: c => `${esc(domainMeta(c.domain).short)}<span class="sub">${esc(c.stage)}</span>` },
          { key: 'gapNext', label: '我們缺什麼' },
          { key: 'gates', label: '必須符合的標準／法規', render: c => (c.gates || []).map(g => `<span class="tag tag--mono">${esc(g)}</span>`).join(' ') },
          { key: 'oppCount', label: '牽動商機', className: 'num', render: c => `<b>${c.oppCount}</b>` },
          { key: 'value', label: '價值', className: 'num', render: c => scoreBar(c.value) },
          { key: 'ready', label: '準備', className: 'num', render: c => scoreBar(c.ready, 'ready') },
          { key: 'candidate', label: '建議對口夥伴', render: c => c.partnerId ? `<a href="#/partner/${c.partnerId}">${esc(c.candidate)}</a>` : dash(c.candidate) }
        ])
      })}

      <div style="margin-top:16px">
        ${card({
          title: '補上一個缺口的四個動作',
          body: `<ol style="margin:0;padding-left:20px;font-size:13.5px;color:var(--muted);line-height:1.9">
            <li><strong>缺口招募</strong>：把該列複製出來，附上要求的資格與標準 → 一份可以直接寄出的 RFI 需求說明。</li>
            <li><strong>夥伴提案回覆表</strong>：請對方填公司資料、能力自評、實績證照、越南落地與來源 → 七構面自評分數與可查證實績。</li>
            <li><strong>夥伴拼圖</strong>：把回覆填進名冊、七構面給分 → 適配分自動算出，覆蓋矩陣自動多一列。</li>
            <li><strong>能力總表</strong>：把該能力的拼圖狀態由「缺口-待尋找」改成「夥伴洽談中」 → 總藍圖紅格轉橘，缺口數減一。</li>
          </ol>
          <p style="margin:12px 0 0;font-size:13px;color:var(--faint)">四步全部有紀錄可查：夥伴回覆表存檔、資格分數留底、狀態變更寫進決策紀錄。</p>`
        })}
      </div>
    `
  };
}

/* --------------------------------------------------------------------------
   風險 / KPI / 商機清單 / 整案量級
   -------------------------------------------------------------------------- */
export function risks() {
  const all = [...db.risks].sort((a, b) => (b.score || 0) - (a.score || 0));
  return {
    title: '風險清冊',
    html: `
      <div class="page-head">
        <h1>08 風險清冊</h1>
        <p>機率 × 衝擊。極高（≥20）須升級治理決策；高（≥12）須有負責人與期限。風險等級同步影響能力總表的商業判斷。</p>
      </div>
      <div class="grid grid--stats" style="margin-bottom:16px">
        ${stat({ label: '極高風險', value: all.filter(r => r.level === '極高').length, variant: 'gap' })}
        ${stat({ label: '高風險', value: all.filter(r => r.level === '高').length, variant: 'warn' })}
        ${stat({ label: '中低風險', value: all.filter(r => ['中', '低'].includes(r.level)).length })}
      </div>
      ${card({
        flush: true,
        title: `全部 ${all.length} 條風險`,
        body: table(all, [
          { key: 'id', label: 'ID', className: 'mono' },
          { key: 'category', label: '類別' },
          { key: 'statement', label: '風險敘述' },
          { key: 'score', label: '分數', className: 'num', render: r => `${r.likelihood}×${r.impact}=<b>${r.score}</b>` },
          { key: 'level', label: '等級', render: r => riskTag(r.level) },
          { key: 'mitigation', label: '因應' },
          { key: 'owner', label: '負責人' },
          { key: 'links', label: '關聯', render: r => (r.links || []).map(l => {
              const m = String(l).match(/CAP-\d+/);
              return m ? `<a href="#/cap/${m[0]}" class="tag tag--mono">${esc(m[0])}</a>` : `<span class="tag tag--mono">${esc(l)}</span>`;
            }).join(' ') }
        ])
      })}
    `
  };
}

export function kpis() {
  const all = db.kpis;
  const groups = uniq(all.map(k => k.perspective));
  return {
    title: 'KPI 計分卡',
    html: `
      <div class="page-head">
        <h1>09 KPI 計分卡</h1>
        <p>怎麼驗收：效益與成熟度指標。基線與目標留白＝待特定醫院確認後填入；
        <strong>標「規劃假設值」者須以現地量測或合約值取代，不可對越南官方引用。</strong></p>
      </div>
      ${groups.map(group => card({
        title: group,
        flush: true,
        body: table(all.filter(k => k.perspective === group), [
          { key: 'id', label: 'ID', className: 'mono' },
          { key: 'name', label: '指標' },
          { key: 'unit', label: '單位' },
          { key: 'direction', label: '方向' },
          { key: 'baseline', label: '基線', className: 'num' },
          { key: 'target', label: '目標', className: 'num' },
          { key: 'frequency', label: '頻率' },
          { key: 'owner', label: '負責人' },
          { key: 'formula', label: '計算公式' }
        ])
      })).join('<div style="height:16px"></div>')}
    `
  };
}

export function pipeline() {
  const rows = db.pipeline;
  return {
    title: '商機清單',
    html: `
      <div class="page-head">
        <h1>14 商機清單</h1>
        <p>業主／老闆視角：現在正在談哪些生意。一列＝一個正在推的商機。
        <strong>對外簡報請用這一頁，不要直接給能力清單。</strong></p>
      </div>
      ${card({
        flush: true,
        title: `${rows.length} 個進行中的商機`,
        body: table(rows, [
          { key: 'oppId', label: '商機', render: r => `<a href="#/opp/${r.oppId}" class="rowlink">${esc(r.name)}</a><span class="sub">${esc(r.oppId)}　${esc(r.family || '')}</span>` },
          { key: 'dealStage', label: '成熟階段', render: r => statusTag(r.dealStage, 'info') },
          { key: 'vnMaturity', label: '越南現況', render: r => maturityTag(r.vnMaturity) },
          { key: 'capCount', label: 'CAP', className: 'num' },
          { key: 'gapCount', label: '缺口', className: 'num', render: r => r.gapCount ? `<span class="tag tag--gap">${r.gapCount}</span>` : '0' },
          { key: 'payer', label: '本案付費方' },
          { key: 'txnMode', label: '交易模式' },
          { key: 'amountTier', label: '金額級距' },
          { key: 'lead', label: '主責' },
          { key: 'nextAction', label: '下一步' }
        ])
      })}
    `
  };
}

export function portfolio() {
  const pf = db.portfolio;
  return {
    title: '整案量級',
    html: `
      <div class="page-head">
        <h1>07 整案量級</h1>
        <p>本頁只回答「整案大約多大、用哪種交易模式」。單一子專案（CT、IDC、HIS…）的詳細商模請用另一個檔案：
        <strong>VMH-EcoMap-2 專案商模試算器</strong>。</p>
      </div>

      <div class="callout callout--warn" style="margin-bottom:16px">
        <strong>顧問立場：不要先選交易模式再找證據。</strong>
        世界銀行越南醫療 PPP 研究提醒，全面整合型醫院 PPP 須謹慎；較務實的路徑是設施／設備、專科服務或部分整合模式，
        並在建置前完成 PPP 治理與長期預算。
      </div>

      <div class="grid grid--2" style="margin-bottom:16px">
        ${card({
          title: '醫院成本驅動',
          note: '示意值，正式評估前須以在地報價取代',
          flush: true,
          body: table(pf.drivers, [
            { key: 'name', label: '驅動' },
            { key: 'value', label: '輸入', className: 'num' },
            { key: 'unit', label: '單位' },
            { key: 'note', label: '說明' }
          ])
        })}
        ${card({
          title: '投資摘要',
          flush: true,
          body: table(pf.summary, [
            { key: 'name', label: '項目' },
            { key: 'value', label: '結果', className: 'num', render: r => typeof r.value === 'number' ? fmtMoney(r.value) : dash(r.value) },
            { key: 'note', label: '計算說明' }
          ])
        })}
      </div>

      ${card({
        title: '交易模式比較',
        note: '1–5 分，越高越有利該面向',
        flush: true,
        body: table(pf.models, [
          { key: 'name', label: '模式' },
          { key: 'overall', label: '綜合分', className: 'num', render: m => `<b>${m.overall}</b>` },
          { key: 'publicControl', label: '公共控制', className: 'num' },
          { key: 'speed', label: '速度', className: 'num' },
          { key: 'privateCapital', label: '民間資本', className: 'num' },
          { key: 'revenueRisk', label: '民間收入風險', className: 'num' },
          { key: 'complexity', label: '整合複雜度', className: 'num' },
          { key: 'nearTermFit', label: '近期適配', className: 'num' },
          { key: 'note', label: '顧問說明' }
        ])
      })}
    `
  };
}

/* --------------------------------------------------------------------------
   歷程：版本、決策、來源
   -------------------------------------------------------------------------- */
export function history() {
  const versions = [...db.versions].reverse();
  const decisions = [...db.decisions].reverse();

  return {
    title: '歷程',
    html: `
      <div class="page-head">
        <h1>10 歷程與稽核</h1>
        <p>顧問工作最怕的不是資料不夠多，是<strong>「不知道這個數字是誰、什麼時候、根據什麼改的」</strong>。
        這一頁把三件事留下來：版本紀錄、決策紀錄、來源清冊。
        <strong>沒有來源的數字，不可以對越南官方引用。</strong></p>
      </div>

      <div class="grid grid--2" style="margin-bottom:16px">
        ${card({
          title: '版本紀錄',
          note: `目前版本 v${esc(db.meta.toolVersion || '—')}`,
          body: `<ul class="timeline">${versions.map(v => `<li>
            <h3>v${esc(v.version)}</h3>
            <time>${esc(v.date || '')}　·　${esc(v.audience || '')}</time>
            <p>${esc(v.scope || '')}</p>
            ${v.note ? `<p style="font-size:12.5px;color:var(--faint)">${esc(v.note)}</p>` : ''}
          </li>`).join('')}</ul>`
        })}
        ${card({
          title: '這個網站本身的修改歷程',
          note: '每一次資料更新都是一次 commit',
          body: `
            <p style="font-size:13.5px;color:var(--muted);margin-top:0">
              知識庫的每一份 JSON 都存在 Git 版本庫裡。任何一次更新——不論是換一個夥伴、補一項法規、
              還是把某個缺口改成洽談中——都會留下<strong>誰在什麼時候改了哪一行</strong>的完整紀錄，永久可回溯、可比對、可還原。
            </p>
            <p style="font-size:13.5px;color:var(--muted)">這就是它取代 LINE 傳檔的地方：
              LINE 只留下最後一個檔案，Git 留下每一個版本之間的差異。</p>
            <ul class="linklist">
              <li><a href="https://github.com/NCHSIEH/nchsieh.github.io/commits/main/VMH-EcoMap/data" target="_blank" rel="noopener">
                知識庫資料的完整修改歷程<small>GitHub · 逐次 commit 的差異比對</small></a></li>
              <li><a href="https://github.com/NCHSIEH/nchsieh.github.io/commits/main/VMH-EcoMap" target="_blank" rel="noopener">
                整個 VMH-EcoMap 專案的歷程<small>含程式、文件與原始 Excel</small></a></li>
            </ul>
            <p style="font-size:12.5px;color:var(--faint);margin-bottom:0">
              本次資料產出時間：${esc(db.meta.generatedAt || '')}　·　來源檔：${esc(db.meta.sourceFile || '')}
            </p>`
        })}
      </div>

      ${card({
        title: `決策紀錄（${decisions.length}）`,
        note: '每一次重大調整都要留下決策列',
        flush: true,
        body: table(decisions, [
          { key: 'id', label: 'ID', className: 'mono' },
          { key: 'date', label: '日期', className: 'mono' },
          { key: 'topic', label: '主題' },
          { key: 'decision', label: '決策' },
          { key: 'by', label: '決策者' },
          { key: 'status', label: '狀態', render: d => statusTag(d.status, d.status === '生效' ? 'ok' : 'neutral') }
        ])
      })}

      <div style="margin-top:16px">
        ${card({
          title: `來源清冊（${db.sources.length}）`,
          note: '沒有來源的數字不可對外引用',
          flush: true,
          body: table(db.sources, [
            { key: 'id', label: 'ID', className: 'mono' },
            { key: 'title', label: '文件', render: s => s.url
                ? `<a href="${esc(s.url)}" target="_blank" rel="noopener" class="rowlink">${esc(s.title)}</a>`
                : esc(s.title) },
            { key: 'org', label: '機構' },
            { key: 'purpose', label: '用途' },
            { key: 'checked', label: '檢核日', className: 'mono' },
            { key: 'status', label: '狀態' },
            { key: 'note', label: '備註' }
          ])
        })}
      </div>
    `
  };
}

/* --------------------------------------------------------------------------
   系統說明（含知識管理系統評估）
   -------------------------------------------------------------------------- */
export function about() {
  const s = stats();
  const meta = db.meta;
  const profile = meta.profile || [];

  const scorecard = [
    ['① 知識擷取 Capture',   4, '60 項能力、85 門商機、37 條法規、29 個夥伴角色，欄位結構完整、定義明確。'],
    ['② 知識組織 Organize',  5, '三軸（能力 × 階段 × 門檻）＋ 能力商機矩陣，是少見地嚴謹的分類骨架。'],
    ['③ 知識連結 Link',      4, '多對多關聯齊備，但在 Excel 裡要靠公式與人眼串；上網後才變成點得動的連結。'],
    ['④ 版本與稽核 Audit',   3, '有決策紀錄與版本紀錄，但欄位層級的「誰改了什麼」仍靠人自律登錄。'],
    ['⑤ 檢索 Retrieval',     2, 'Excel 只有分頁篩選，跨分頁找一個關鍵字要開好幾個視窗。'],
    ['⑥ 散布 Distribution',  1, '靠 LINE 傳檔：收件人拿到的永遠是一份快照，且無法確認是不是最新版。'],
    ['⑦ 協作 Collaboration', 1, '多人各自編輯就會分岔，最後沒有人知道哪一份才算數。'],
    ['⑧ 生命週期 Lifecycle', 3, '有證據成熟度欄位（推測 → 查證），設計良好，但沒有到期與覆核提醒。']
  ];

  const total = scorecard.reduce((sum, r) => sum + r[1], 0);

  return {
    title: '系統說明',
    html: `
      <div class="page-head">
        <h1>關於這套系統</h1>
        <p>它是什麼、解決什麼問題、怎麼更新。</p>
      </div>

      <div class="grid grid--2" style="margin-bottom:16px">
        ${card({
          title: '專案輪廓',
          flush: true,
          body: table(profile, [
            { key: 'field', label: '欄位' },
            { key: 'value', label: '目前設定' },
            { key: 'note', label: '顧問說明' }
          ])
        })}
        ${card({
          title: '知識庫規模',
          body: `<div class="grid grid--stats">
            ${stat({ label: '能力項', value: s.capTotal })}
            ${stat({ label: '商機', value: s.oppTotal })}
            ${stat({ label: '夥伴角色', value: s.partnerTotal })}
            ${stat({ label: '法規門檻', value: db.gates.length })}
            ${stat({ label: '工作包', value: db.workpackages.length })}
            ${stat({ label: '風險', value: db.risks.length })}
            ${stat({ label: 'KPI', value: db.kpis.length })}
            ${stat({ label: '決策紀錄', value: db.decisions.length })}
          </div>`
        })}
      </div>

      <div class="card" style="margin-bottom:16px">
        <div class="card__head"><h2>評估：VMH-EcoMap 主工具算不算一套知識管理系統？</h2></div>
        <div class="card__body">
          <div class="prose" style="max-width:none">
            <blockquote>
              <strong>結論：它是一份極高品質的「結構化知識庫 ＋ 決策模型」，但單靠 Excel 還不是一套知識管理系統。</strong>
              八個構面裡它在「組織」與「擷取」滿分，卡住的是<strong>檢索、散布、協作</strong>這三個——
              而這三個正好就是「用 LINE 傳檔」造成的痛點。這個網站補的就是這三格。
            </blockquote>
            <p>以知識管理的八個構面逐一評分（1＝幾乎沒有，5＝已充分具備），滿分 40 分，Excel 版得 <strong>${total} 分</strong>；
            接上這個網站之後為 <strong>37 分</strong>。完整評估（含逐項判讀、補法與仍須注意的三件事）見
            <a href="https://github.com/NCHSIEH/nchsieh.github.io/blob/main/VMH-EcoMap/docs/%E7%9F%A5%E8%AD%98%E7%AE%A1%E7%90%86%E7%B3%BB%E7%B5%B1%E8%A9%95%E4%BC%B0%E5%A0%B1%E5%91%8A.md" target="_blank" rel="noopener">知識管理系統評估報告</a>。</p>
          </div>
          <div style="margin-top:14px">
            ${table(scorecard.map(([name, score, note]) => ({ name, score, note })), [
              { key: 'name', label: '構面' },
              { key: 'score', label: '評分', className: 'num', render: r => scoreBar(r.score) },
              { key: 'note', label: '判讀' }
            ])}
          </div>
        </div>
      </div>

      <div class="grid grid--2" style="margin-bottom:16px">
        ${card({
          title: '這個網站補上了什麼',
          body: `<ul style="margin:0;padding-left:20px;font-size:13.5px;color:var(--muted);line-height:1.9">
            <li><strong>檢索</strong>：一個搜尋框（按 <code>⌘K</code> 或 <code>Ctrl+K</code>）打穿全部能力、商機、夥伴、法規、風險、工作包。</li>
            <li><strong>散布</strong>：不再傳檔案，傳<strong>網址</strong>。每一項能力、每一門商機、每一個夥伴都有自己的永久連結，
              收件人打開永遠是最新版。</li>
            <li><strong>協作與稽核</strong>：每一次更新都是一次 Git commit，
              <strong>誰在什麼時候改了哪一行</strong>永久留存、可比對、可還原。</li>
            <li><strong>連結</strong>：Excel 裡要用公式串的關聯，在這裡是點得動的連結——
              從一項能力可以直接跳到它的商機、夥伴、法規、風險與工作包。</li>
          </ul>`
        })}
        ${card({
          title: '更新流程：每週只做這四步',
          body: `<ol style="margin:0;padding-left:20px;font-size:13.5px;color:var(--muted);line-height:1.9">
            <li>照舊在<strong>主工具 Excel</strong> 的 03 能力總表改資料（它仍然是唯一的輸入處）。</li>
            <li>把新的 Excel 放進 <code>VMH-EcoMap/source/</code>。</li>
            <li>執行 <code>python3 tools/xlsx_to_json.py</code> —— 21 個分頁自動轉成網站知識庫。</li>
            <li><code>git commit</code> 並推上去。網站即時更新，這一版的差異自動進入歷程。</li>
          </ol>
          <p style="margin:12px 0 0;font-size:13px;color:var(--faint)">
            Excel 負責「輸入與計算」，網站負責「發布與歷程」。兩邊各做自己最擅長的事，不互相取代。</p>`
        })}
      </div>

      ${card({
        title: '這套工具怎麼給出商業判斷',
        body: `<div class="prose" style="max-width:none">
          <p><strong>第一關：硬門檻（Pass／Fail）。</strong>越南合法合規、臨床與病人安全、個資與資安、可互通可攜、
          可持續維運與人才、明確業主與決策責任——任一項 Fail 直接判「暫緩 Hold」，不進入評分。</p>
          <p><strong>第二關：兩個分數決定象限。</strong>價值分（政府與政策 0.35／臨床價值 0.30／商業潛力 0.35）與
          準備分（法規就緒 0.35／夥伴與技術 0.35／資金與依賴 0.30）。
          兩個分數分開看，<strong>絕不把所有東西壓成一個總分</strong>——因為「值得做」和「現在做得到」是兩件事。</p>
          <p>目前 ${s.capTotal} 項能力的分佈：立即推進 ${s.go} 項、快速小案 ${s.quickWin} 項、
          先補條件 ${s.prepare} 項、儲備觀察 ${s.backlog} 項。<strong>沒有任何一項被判暫緩</strong>，
          代表目前沒有先天不可行的項目——問題全在條件與夥伴。</p>
        </div>`
      })}

      <div style="margin-top:16px">
        ${card({
          title: '文件與原始檔',
          body: linkList([
            { href: 'https://github.com/NCHSIEH/nchsieh.github.io/blob/main/VMH-EcoMap/docs/%E7%9F%A5%E8%AD%98%E7%AE%A1%E7%90%86%E7%B3%BB%E7%B5%B1%E8%A9%95%E4%BC%B0%E5%A0%B1%E5%91%8A.md',
              label: '知識管理系統評估報告', note: '八構面評分、缺什麼、怎麼補' },
            { href: 'https://github.com/NCHSIEH/nchsieh.github.io/blob/main/VMH-EcoMap/README.md',
              label: '系統說明與更新流程 README', note: '每週四步：改 Excel → 轉檔 → commit → 推送' },
            { href: 'https://github.com/NCHSIEH/nchsieh.github.io/tree/main/VMH-EcoMap/source',
              label: '原始交付檔', note: '主工具 Excel 與聯盟夥伴說明會簡報' },
            { href: 'https://github.com/NCHSIEH/nchsieh.github.io/commits/main/VMH-EcoMap/data',
              label: '知識庫的完整修改歷程', note: '逐次 commit 的差異比對' }
          ])
        })}
      </div>

      <div style="margin-top:16px">
        ${card({
          title: '免責與適用範圍',
          body: `<p style="margin:0;font-size:13.5px;color:var(--muted)">
            本工具為顧問規劃用途，<strong>不構成法律意見、投資報價或設施設計</strong>。
            工具內的時程、金額與評分多為規劃假設值（示意），正式評估前每一筆都必須以廠商報價、
            在地查證或現地量測取代，並在來源清冊登錄出處。越南法規以官方越南文版本為準，
            英譯僅供參考。</p>`
        })}
      </div>
    `
  };
}

/* --------------------------------------------------------------------------
   找不到
   -------------------------------------------------------------------------- */
export function notFound(kind, id, backHref) {
  return {
    title: '找不到',
    html: `<div class="page-head"><h1>找不到這個${esc(kind)}</h1>
      <p>代號 <code>${esc(id)}</code> 不在目前的知識庫裡。它可能已經改名，或還沒被匯入。</p></div>
      ${card({ body: `<a href="${backHref}">← 回到清單</a>` })}`
  };
}
