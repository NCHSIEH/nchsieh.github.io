/* ==========================================================================
   store.js — 知識庫載入與索引
   資料一律來自 data/*.json（由 tools/xlsx_to_json.py 從主工具 Excel 產出）。
   本檔只做兩件事：把 JSON 讀進來、把彼此的關聯先算好。
   ========================================================================== */

/** 醫院生態 10 大領域（C 軸） */
export const DOMAINS = [
  { id: 'D01', short: '治理與投資',   full: 'D01 治理與投資' },
  { id: 'D02', short: '臨床服務模式', full: 'D02 臨床服務模式' },
  { id: 'D03', short: '設施與機電',   full: 'D03 醫院設施與機電' },
  { id: 'D04', short: '數位基建IoT',  full: 'D04 數位基建與物聯網' },
  { id: 'D05', short: '醫材與診斷',   full: 'D05 醫材與診斷' },
  { id: 'D06', short: '醫療資訊資料', full: 'D06 醫療資訊與資料' },
  { id: 'D07', short: '品質與病安',   full: 'D07 品質與病安' },
  { id: 'D08', short: '人才與技轉',   full: 'D08 人才與技轉' },
  { id: 'D09', short: '供應鏈與維運', full: 'D09 供應鏈與維運' },
  { id: 'D10', short: '商模與生態',   full: 'D10 商模與病人生態' }
];

/** Stage-Gate 七個階段（A 軸），月份為工具內建示意值 */
export const STAGES = [
  { id: 'G0', name: '授權啟動', months: 'M1–2'   },
  { id: 'G1', name: '評估定義', months: 'M2–6'   },
  { id: 'G2', name: '規劃設計', months: 'M6–14'  },
  { id: 'G3', name: '深化採購', months: 'M12–20' },
  { id: 'G4', name: '建置整合', months: 'M20–42' },
  { id: 'G5', name: '驗證開院', months: 'M39–48' },
  { id: 'G6', name: '營運複製', months: 'M49–60' }
];

/** 四種拼圖狀態＝聯盟的共同語言，沒有第五種，也不允許空白 */
export const PUZZLE = {
  '群晶主導':     { key: 'lead', symbol: '●', label: '群晶主導',     note: '群晶科技為主責交付者' },
  '夥伴已確認':   { key: 'conf', symbol: '◆', label: '夥伴已確認',   note: '已簽約或正式承諾' },
  '夥伴洽談中':   { key: 'talk', symbol: '◐', label: '夥伴洽談中',   note: '有候選夥伴，資格審查中' },
  '缺口-待尋找':  { key: 'gap',  symbol: '○', label: '缺口-待尋找',  note: '尚無候選＝今天要找的人' }
};

export const PUZZLE_ORDER = ['群晶主導', '夥伴已確認', '夥伴洽談中', '缺口-待尋找'];

const FILES = [
  'meta', 'capabilities', 'partners', 'gates', 'workpackages', 'risks',
  'kpis', 'opportunities', 'pipeline', 'cap-opp', 'sources', 'decisions',
  'versions', 'portfolio'
];

/** 全域資料庫，載入後不再變動 */
export const db = {};

/** 讀取所有 JSON 並建立交叉索引 */
export async function load() {
  const results = await Promise.all(
    FILES.map(async name => {
      const res = await fetch(`data/${name}.json`, { cache: 'no-cache' });
      if (!res.ok) throw new Error(`讀取 data/${name}.json 失敗（HTTP ${res.status}）`);
      return [name, await res.json()];
    })
  );
  results.forEach(([name, payload]) => { db[camel(name)] = payload; });
  buildIndexes();
  return db;
}

function camel(name) {
  return name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
}

/* --------------------------------------------------------------------------
   交叉索引 — 知識管理的價值在「連得起來」，不在「存得下來」
   -------------------------------------------------------------------------- */
function buildIndexes() {
  const idx = db.index = {
    capById:     new Map(),
    oppById:     new Map(),
    partnerById: new Map(),
    gateById:    new Map(),
    wpById:      new Map(),
    capsByOpp:   new Map(),   // OPP-xx → [能力]
    capsByPartner: new Map(), // P-xx   → [能力]
    capsByGate:  new Map(),   // 標準ID → [能力]
    risksByCap:  new Map(),   // CAP-xx → [風險]
    wpsByCap:    new Map(),   // CAP-xx → [工作包]
    dependents:  new Map()    // CAP-xx → [反向依賴的能力]
  };

  db.capabilities.forEach(c => idx.capById.set(c.id, c));
  db.opportunities.forEach(o => idx.oppById.set(o.id, o));
  db.partners.forEach(p => idx.partnerById.set(p.id, p));
  db.gates.forEach(g => idx.gateById.set(g.id, g));
  db.workpackages.forEach(w => idx.wpById.set(w.id, w));

  // 能力 ↔ 商機（多對多，來源是 16 能力商機矩陣）
  db.capabilities.forEach(cap => {
    const opps = db.capOpp[cap.id] || cap.opportunities || [];
    cap.opportunityIds = opps;
    opps.forEach(oid => push(idx.capsByOpp, oid, cap));
  });

  // 能力 ↔ 夥伴（候選夥伴欄的 "P-019 影像設備與PACS整合商"）
  db.capabilities.forEach(cap => {
    const pid = (cap.candidate || '').match(/P-\d+/);
    cap.partnerId = pid ? pid[0] : null;
    if (cap.partnerId) push(idx.capsByPartner, cap.partnerId, cap);
  });

  // 能力 ↔ 法規門檻
  db.capabilities.forEach(cap => {
    (cap.gates || []).forEach(gid => push(idx.capsByGate, gid, cap));
  });

  // 能力 ↔ 風險（08 的「關聯項目」欄）
  db.risks.forEach(risk => {
    (risk.links || []).forEach(link => {
      const m = String(link).match(/CAP-\d+/);
      if (m) push(idx.risksByCap, m[0], risk);
    });
  });

  // 能力 ↔ 工作包（06 的「對應能力 CAPs」可能寫成 "CAP-027 to CAP-032"）
  db.workpackages.forEach(wp => {
    wp.capIds = expandCapRange(wp.caps);
    wp.capIds.forEach(cid => push(idx.wpsByCap, cid, wp));
  });

  // 反向依賴：誰在等我
  db.capabilities.forEach(cap => {
    (cap.depends || []).forEach(dep => push(idx.dependents, dep, cap));
  });

  // 夥伴補上「被指名幾項能力」
  db.partners.forEach(p => {
    const caps = idx.capsByPartner.get(p.id) || [];
    p.capCount = caps.length;
    p.gapCount = caps.filter(c => c.puzzle === '缺口-待尋找').length;
    p.goCount  = caps.filter(c => c.decision === '立即推進 Go').length;
  });

  // 商機補上實際對應的能力統計（以矩陣為準，不依賴 Excel 的快照值）
  db.opportunities.forEach(o => {
    const caps = idx.capsByOpp.get(o.id) || [];
    o.caps = caps;
    o.gapCaps = caps.filter(c => c.puzzle === '缺口-待尋找');
  });

  // 商機清單補回完整商機物件
  db.pipeline.forEach(row => { row.opp = idx.oppById.get(row.oppId) || null; });
}

function push(map, key, value) {
  if (!map.has(key)) map.set(key, []);
  map.get(key).push(value);
}

/** 把 "CAP-027 to CAP-032" / "CAP-001; CAP-002" 展開成完整清單 */
function expandCapRange(text) {
  if (!text) return [];
  const out = new Set();
  String(text).split(/[;；]/).forEach(part => {
    const range = part.match(/CAP-(\d+)\s*(?:to|–|-|~|至)\s*CAP-(\d+)/i);
    if (range) {
      const [from, to] = [Number(range[1]), Number(range[2])];
      for (let n = from; n <= to; n++) out.add(`CAP-${String(n).padStart(3, '0')}`);
      return;
    }
    (part.match(/CAP-\d+/g) || []).forEach(id => out.add(id));
  });
  return [...out].filter(id => db.index.capById.has(id));
}

/* --------------------------------------------------------------------------
   統計 — 儀表板與總藍圖共用
   -------------------------------------------------------------------------- */
export function stats() {
  const caps = db.capabilities;
  const byPuzzle = {};
  PUZZLE_ORDER.forEach(k => { byPuzzle[k] = caps.filter(c => c.puzzle === k).length; });

  const mandatoryGates = db.gates.filter(g => g.level === '強制');
  const highRisks = db.risks.filter(r => (r.score || 0) >= 12);

  return {
    capTotal:      caps.length,
    byPuzzle,
    gaps:          caps.filter(c => c.puzzle === '缺口-待尋找'),
    go:            caps.filter(c => c.decision === '立即推進 Go').length,
    prepare:       caps.filter(c => c.decision === '先補條件 Prepare').length,
    quickWin:      caps.filter(c => c.decision === '快速小案 Quick-win').length,
    backlog:       caps.filter(c => c.decision === '儲備觀察 Backlog').length,
    mandatory:     mandatoryGates.length,
    mandatoryOpen: mandatoryGates.filter(g => g.status === '待確認').length,
    highRisks,
    oppTotal:      db.opportunities.length,
    oppWhitespace: db.opportunities.filter(o => (o.vnMaturity || '').startsWith('③')).length,
    oppBlank:      db.opportunities.filter(o => (o.position || '').startsWith('★')).length,
    partnerTotal:  db.partners.length,
    partnerGaps:   db.partners.filter(p => (p.status || '').includes('缺口')).length,
    pipelineTotal: db.pipeline.length
  };
}

/** 總藍圖：領域 × 階段的每一格 */
export function blueprintCell(domainId, stageId) {
  return db.capabilities.filter(
    c => (c.domain || '').startsWith(domainId) && c.stage === stageId
  );
}

/** 某階段適用、且尚未確認的強制法規 */
export function gatesForStage(stageId) {
  return db.gates.filter(g => (g.stages || []).includes(stageId));
}

/** 拼圖狀態的顯示資訊，找不到就給中性樣式 */
export function puzzleMeta(name) {
  return PUZZLE[name] || { key: 'none', symbol: '·', label: name || '未標記', note: '' };
}

export function domainMeta(domainText) {
  const id = (domainText || '').slice(0, 3);
  return DOMAINS.find(d => d.id === id) || { id, short: domainText || '—', full: domainText || '—' };
}
