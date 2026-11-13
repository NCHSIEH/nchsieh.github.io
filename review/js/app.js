// GovIT Review Studio - Main Application Controller

(function () {
  const STORAGE_KEY = "GOV_IT_REVIEW_CASES_V2";
  const THEME_KEY = "GOV_IT_REVIEW_THEME";

  const state = {
    cases: [],
    activeCaseId: null,
    activeView: "setup",
    selectedFindingIdsForMerge: new Set(),
    lastTrapResults: [],
    lastBudgetReport: null
  };

  function showToast(msg) {
    const el = document.getElementById("toastMsg");
    if (!el) return;
    el.textContent = msg;
    el.style.opacity = "1";
    clearTimeout(el._timer);
    el._timer = setTimeout(() => {
      el.style.opacity = "0";
    }, 2600);
  }

  function cloneDeep(obj) {
    return JSON.parse(JSON.stringify(obj));
  }

  function loadCasesFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          state.cases = parsed;
          state.activeCaseId = parsed[0].id;
          return;
        }
      }
    } catch (e) {
      console.warn("Failed to read storage:", e);
    }
    state.cases = cloneDeep(window.GOV_REVIEW_DATA.sampleCases);
    state.activeCaseId = state.cases[0].id;
    saveCasesToStorage();
  }

  function saveCasesToStorage() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state.cases));
    } catch (e) {
      console.warn("Failed to save storage:", e);
    }
  }

  function getActiveCase() {
    return state.cases.find((c) => c.id === state.activeCaseId) || state.cases[0];
  }

  // Create a new blank case
  function createNewCase(mode = "proposal") {
    const modeInfo = window.GOV_REVIEW_DATA.reviewModes[mode] || window.GOV_REVIEW_DATA.reviewModes.proposal;
    const today = new Date().toISOString().slice(0, 10);
    const newCase = {
      id: "case_" + Date.now(),
      mode,
      outputFormat: modeInfo.defaultOutputFormat,
      agencyName: "",
      projectName: "新專案審查案件（請輸入標案或計畫名稱）",
      caseNumber: "",
      reviewDate: today,
      reviewerName: "",
      budgetAmount: 0,
      targetVendor: "",
      pageRange: "",
      conclusion: "conditional",
      conclusionNote: "",
      overallPositive: "",
      docText: "",
      budgetItems: [],
      checkedPrinciples: [],
      checkedProposalItems: [],
      checkedQuick12: [],
      findings: [
        {
          id: "f_" + Date.now(),
          title: "",
          rootCategory: "1. 需求對齊",
          pages: "",
          opinion: "",
          note: "",
          questions: [""]
        }
      ],
      rfpDiffs: [
        {
          id: "diff_" + Date.now(),
          title: "",
          location: "",
          beforeText: "",
          afterText: "",
          reason: ""
        }
      ],
      vendors: [
        { id: "v_1", name: "投標廠商 A", scores: { sc1: 25, sc2: 8, sc3: 16, sc4: 16, sc5: 12, sc6: 4 } }
      ]
    };
    state.cases.unshift(newCase);
    state.activeCaseId = newCase.id;
    saveCasesToStorage();
    renderAll();
    showToast("已建立空白審查案件");
  }

  // Render Sidebar Case List & Stats
  function renderSidebar() {
    const activeCase = getActiveCase();
    const listEl = document.getElementById("caseList");
    const countEl = document.getElementById("caseTotalCount");
    if (countEl) countEl.textContent = String(state.cases.length);

    if (listEl) {
      listEl.innerHTML = state.cases
        .map((c) => {
          const m = window.GOV_REVIEW_DATA.reviewModes[c.mode] || window.GOV_REVIEW_DATA.reviewModes.proposal;
          const isAct = c.id === activeCase.id;
          const itemCount = c.mode === "rfp" ? (c.rfpDiffs || []).length : (c.findings || []).length;
          return `
            <div class="case-item ${isAct ? "active" : ""}" data-case-id="${c.id}">
              <div class="case-item-top">
                <span class="mode-badge ${m.badgeClass}">${m.icon} ${m.shortName}</span>
                <span style="font-size:0.7rem; color:var(--text-muted);">${c.reviewDate || ""}</span>
              </div>
              <div class="case-item-title">${escapeHtml(c.projectName || "未命名案件")}</div>
              <div class="case-item-meta">
                <span>${escapeHtml((c.agencyName || "未填機關").slice(0, 12))}</span>
                <span>${itemCount} 項意見</span>
              </div>
            </div>
          `;
        })
        .join("");

      listEl.querySelectorAll(".case-item").forEach((el) => {
        el.addEventListener("click", () => {
          state.activeCaseId = el.getAttribute("data-case-id");
          state.selectedFindingIdsForMerge.clear();
          renderAll();
          closeMobileSidebar();
        });
      });
    }

    // Update top & sidebar stats
    const itemLen = activeCase.mode === "rfp"
      ? (activeCase.rfpDiffs || []).length
      : (activeCase.findings || []).length;

    state.lastTrapResults = window.GovScanner.scanDocumentTraps(activeCase.docText || "");
    state.lastBudgetReport = window.GovScanner.verifyBudgetTable(activeCase.budgetItems || [], activeCase.budgetAmount);

    const trapCount = state.lastTrapResults.length + (state.lastBudgetReport.summaryAlerts || []).length;
    const q12Count = (activeCase.checkedQuick12 || []).length;

    setText("statFindingsCount", `${itemLen} 項`);
    setText("statTrapsCount", `${trapCount} 處`);
    setText("statChecklistRate", `${q12Count}/12`);
    setText("tabBadgeTraps", String(trapCount));
    setText("tabBadgeFindings", String(itemLen));

    const modeInfo = window.GOV_REVIEW_DATA.reviewModes[activeCase.mode] || window.GOV_REVIEW_DATA.reviewModes.proposal;
    const pill = document.getElementById("activeModePill");
    if (pill) {
      pill.className = `mode-badge ${modeInfo.badgeClass}`;
      pill.textContent = `${modeInfo.icon} ${modeInfo.name}`;
    }
  }

  // Render View 1: Case Setup & Checklists
  function renderSetupView() {
    const c = getActiveCase();
    const data = window.GOV_REVIEW_DATA;

    // Role selector grid
    const roleGrid = document.getElementById("roleSelectorGrid");
    if (roleGrid) {
      roleGrid.innerHTML = Object.values(data.reviewModes)
        .map((m) => {
          const active = c.mode === m.id;
          return `
            <div class="role-card ${active ? "active" : ""}" data-mode="${m.id}">
              <div class="role-card-title">
                <span>${m.icon} ${m.shortName}</span>
                ${active ? `<span style="color:var(--accent); font-size:0.75rem;">● 目前模式</span>` : ""}
              </div>
              <div class="role-card-desc">${m.desc}</div>
            </div>
          `;
        })
        .join("");

      roleGrid.querySelectorAll(".role-card").forEach((card) => {
        card.addEventListener("click", () => {
          const newMode = card.getAttribute("data-mode");
          c.mode = newMode;
          c.outputFormat = data.reviewModes[newMode].defaultOutputFormat;
          saveCasesToStorage();
          renderAll();
          showToast(`已切換為「${data.reviewModes[newMode].name}」模式`);
        });
      });
    }

    // Bind form inputs
    setVal("inpAgencyName", c.agencyName);
    setVal("inpProjectName", c.projectName);
    setVal("inpCaseNumber", c.caseNumber);
    setVal("inpTargetVendor", c.targetVendor);
    setVal("inpBudgetAmount", c.budgetAmount || "");
    setVal("inpPageRange", c.pageRange);
    setVal("inpReviewDate", c.reviewDate);
    setVal("inpReviewerName", c.reviewerName);
    setVal("selOutputFormat", c.outputFormat || "oral");

    // Render 10 Principles
    const pContainer = document.getElementById("principlesChecklist");
    if (pContainer) {
      pContainer.innerHTML = data.tenPrinciples
        .map((p) => {
          const flagged = (c.checkedPrinciples || []).includes(p.id);
          return `
            <div class="check-item ${flagged ? "flagged" : ""}">
              <input type="checkbox" data-principle-id="${p.id}" ${flagged ? "checked" : ""} style="margin-top:4px; transform:scale(1.15); cursor:pointer;">
              <div class="check-item-body">
                <div class="check-item-title">
                  <span>原則 ${p.num}：${p.title}</span>
                  <span style="font-size:0.7rem; color:var(--text-muted);">（${p.category}）</span>
                </div>
                <div class="check-item-desc">${p.desc}</div>
              </div>
              <div class="check-item-controls">
                <button class="btn btn-secondary btn-sm" data-add-principle="${p.id}" title="將此原則轉為審查意見卡片">＋轉意見</button>
              </div>
            </div>
          `;
        })
        .join("");

      pContainer.querySelectorAll("input[data-principle-id]").forEach((chk) => {
        chk.addEventListener("change", () => {
          const pid = chk.getAttribute("data-principle-id");
          c.checkedPrinciples = c.checkedPrinciples || [];
          if (chk.checked) {
            if (!c.checkedPrinciples.includes(pid)) c.checkedPrinciples.push(pid);
          } else {
            c.checkedPrinciples = c.checkedPrinciples.filter((x) => x !== pid);
          }
          saveCasesToStorage();
          renderSetupView();
        });
      });

      pContainer.querySelectorAll("button[data-add-principle]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const pid = btn.getAttribute("data-add-principle");
          const p = data.tenPrinciples.find((x) => x.id === pid);
          if (!p) return;
          addFindingFromTemplate({
            title: `${p.category}存有邏輯斷點與執行疑慮，建請補充具體機制`,
            rootCategory: `${p.num}. ${p.title}`,
            opinion: `檢視計畫書關於「${p.title}」之規劃（P.待補），${p.desc} 目前內文僅作原則性敘述，未具體交代實質執行細節與風險控管方式。`,
            note: `判斷依據為十大審查原則之「${p.title}」。建請補充具體可驗收之執行規劃、量化佐證或標準作業程序（SOP）。`,
            questions: [`針對「${p.title}」之具體落地方式與驗收基準，請補充說明。`]
          });
        });
      });
    }

    // Render Proposal Deep Checks A~E
    const propContainer = document.getElementById("proposalDeepChecklist");
    if (propContainer) {
      propContainer.innerHTML = data.proposalDeepChecks
        .map((grp) => {
          const itemsHtml = grp.items
            .map((it) => {
              const flagged = (c.checkedProposalItems || []).includes(it.id);
              return `
                <div class="check-item ${flagged ? "flagged" : ""}" style="margin-top:6px;">
                  <input type="checkbox" data-prop-id="${it.id}" ${flagged ? "checked" : ""} style="margin-top:4px; transform:scale(1.15); cursor:pointer;">
                  <div class="check-item-body">
                    <div class="check-item-title">${it.label}</div>
                    <div class="check-item-desc">${it.detail}</div>
                  </div>
                  <div class="check-item-controls">
                    <button class="btn btn-secondary btn-sm" data-add-prop="${it.id}" data-root-theme="${grp.rootTheme}">＋轉意見</button>
                  </div>
                </div>
              `;
            })
            .join("");

          return `
            <div style="margin-bottom:10px;">
              <div style="font-size:0.82rem; font-weight:800; color:var(--accent); margin-bottom:4px;">${grp.groupTitle}</div>
              ${itemsHtml}
            </div>
          `;
        })
        .join("");

      propContainer.querySelectorAll("input[data-prop-id]").forEach((chk) => {
        chk.addEventListener("change", () => {
          const id = chk.getAttribute("data-prop-id");
          c.checkedProposalItems = c.checkedProposalItems || [];
          if (chk.checked) {
            if (!c.checkedProposalItems.includes(id)) c.checkedProposalItems.push(id);
          } else {
            c.checkedProposalItems = c.checkedProposalItems.filter((x) => x !== id);
          }
          saveCasesToStorage();
          renderSetupView();
        });
      });

      propContainer.querySelectorAll("button[data-add-prop]").forEach((btn) => {
        btn.addEventListener("click", () => {
          const id = btn.getAttribute("data-add-prop");
          const theme = btn.getAttribute("data-root-theme");
          let foundItem = null;
          data.proposalDeepChecks.forEach((g) => {
            g.items.forEach((i) => {
              if (i.id === id) foundItem = i;
            });
          });
          if (!foundItem) return;
          addFindingFromTemplate({
            title: `${theme}：${foundItem.label}與招標規範存有落差`,
            rootCategory: theme,
            opinion: `對照招標文件與服務建議書（P.待補）關於「${foundItem.label}」之規劃：${foundItem.detail}`,
            note: `判斷依據為服務建議書與招標文件需求說明書之交叉比對。建議列為決標或議約前應書面確認之必要承諾事項。`,
            questions: [`針對「${foundItem.label}」，是否同意完全依招標文件規定標準辦理？`]
          });
        });
      });
    }

    // Render 12-Item Pre-Review Quick Checklist
    const q12Container = document.getElementById("quick12Checklist");
    if (q12Container) {
      q12Container.innerHTML = data.quickChecklist12
        .map((q, idx) => {
          const passed = (c.checkedQuick12 || []).includes(q.id);
          return `
            <label class="check-item ${passed ? "passed" : ""}" style="cursor:pointer;">
              <input type="checkbox" data-q12-id="${q.id}" ${passed ? "checked" : ""} style="margin-top:3px; transform:scale(1.15);">
              <div class="check-item-body">
                <div class="check-item-title" style="font-weight:600;">${idx + 1}. ${q.text}</div>
              </div>
            </label>
          `;
        })
        .join("");

      q12Container.querySelectorAll("input[data-q12-id]").forEach((chk) => {
        chk.addEventListener("change", () => {
          const qid = chk.getAttribute("data-q12-id");
          c.checkedQuick12 = c.checkedQuick12 || [];
          if (chk.checked) {
            if (!c.checkedQuick12.includes(qid)) c.checkedQuick12.push(qid);
          } else {
            c.checkedQuick12 = c.checkedQuick12.filter((x) => x !== qid);
          }
          saveCasesToStorage();
          renderSidebar();
          renderSetupView();
        });
      });
    }
  }

  // Render View 2: Document Trap Scanner & Budget Arithmetic Verifier
  function renderScannerView() {
    const c = getActiveCase();
    setVal("inpDocText", c.docText || "");

    const traps = window.GovScanner.scanDocumentTraps(c.docText || "");
    state.lastTrapResults = traps;
    setText("trapResultCount", String(traps.length));

    const trapContainer = document.getElementById("trapResultsContainer");
    if (trapContainer) {
      if (traps.length === 0) {
        trapContainer.innerHTML = `
          <div style="padding:16px; border:1px dashed var(--border); border-radius:8px; color:var(--text-muted); font-size:0.82rem; text-align:center;">
            目前文字尚未觸發自動陷阱規則。請在上方貼入計畫書／建議書／招標文件內容，或點擊「立即深層掃描」。
          </div>
        `;
      } else {
        trapContainer.innerHTML = traps
          .map(
            (t, idx) => `
            <div class="trap-card ${t.severity === "high" ? "severity-high" : ""}">
              <div class="trap-card-header">
                <div>
                  <span class="mode-badge mode-rfp" style="margin-bottom:4px;">${escapeHtml(t.category)}</span>
                  <div style="font-weight:700; font-size:0.88rem;">${escapeHtml(t.title)}</div>
                </div>
                <button class="btn btn-primary btn-sm" data-trap-idx="${idx}">＋轉為審查意見</button>
              </div>
              <div style="font-size:0.78rem; color:var(--text-secondary);">${escapeHtml(t.explanation)}</div>
              ${t.matches
                .map((m) => `<div class="trap-snippet">原文摘錄：${escapeHtml(m.snippet)}</div>`)
                .join("")}
            </div>
          `
          )
          .join("");

        trapContainer.querySelectorAll("button[data-trap-idx]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const idx = Number(btn.getAttribute("data-trap-idx"));
            const trap = traps[idx];
            if (!trap) return;
            const snippetText = trap.matches.map((m) => m.snippet).join("；");
            addFindingFromTemplate({
              title: trap.suggestedTitle,
              rootCategory: trap.category,
              pages: "詳內文摘錄",
              opinion: `${trap.explanation}（原文摘錄：「${snippetText}」）。`,
              note: `判斷依據為文件內文邏輯與招標／法規基準檢核。建請補充具體修正方案或可驗收之佐證文件。`,
              questions: [trap.suggestedQuestion]
            });
          });
        });
      }
    }

    // Render Budget Arithmetic Verifier Table
    renderBudgetTable();
  }

  function renderBudgetTable() {
    const c = getActiveCase();
    c.budgetItems = c.budgetItems || [];
    const report = window.GovScanner.verifyBudgetTable(c.budgetItems, c.budgetAmount);
    state.lastBudgetReport = report;

    const alertsEl = document.getElementById("budgetSummaryAlerts");
    if (alertsEl) {
      const totalsBanner = `
        <div style="display:flex; justify-content:space-between; flex-wrap:wrap; gap:8px; padding:8px 12px; background:var(--bg-elevated); border-radius:8px; font-size:0.8rem; margin-bottom:8px;">
          <span>表列小計加總：<strong>${report.quotedTotal.toLocaleString()} 元</strong></span>
          <span>實際算術驗算 (單價×數量)：<strong style="color:${report.calcTotal !== report.quotedTotal ? "var(--rose)" : "var(--emerald)"};">${report.calcTotal.toLocaleString()} 元</strong></span>
          <span>本案預算上限：<strong>${(Number(c.budgetAmount) || 0).toLocaleString()} 元</strong></span>
        </div>
      `;
      const alertItems = (report.summaryAlerts || [])
        .map(
          (a) => `
          <div style="padding:8px 12px; border-radius:6px; font-size:0.78rem; margin-bottom:6px; background:${
            a.type === "error" ? "var(--rose-soft)" : "var(--amber-soft)"
          }; color:${a.type === "error" ? "var(--rose)" : "var(--amber)"}; font-weight:600;">
            ⚠️ ${escapeHtml(a.text)}
          </div>
        `
        )
        .join("");
      alertsEl.innerHTML = totalsBanner + alertItems;
    }

    const tbody = document.getElementById("budgetTableBody");
    if (!tbody) return;

    if (report.rowReports.length === 0) {
      tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:var(--text-muted); padding:16px;">尚無報價明細，請點「＋新增項目」或從下方批次貼入報價表。</td></tr>`;
      return;
    }

    tbody.innerHTML = report.rowReports
      .map((r, idx) => {
        const it = r.item;
        const rowClass = r.status === "error" ? "row-error" : r.status === "warn" ? "row-warn" : "";
        return `
          <tr class="${rowClass}">
            <td><input class="studio-input" style="min-width:130px; padding:4px 7px; font-size:0.78rem;" data-b-idx="${idx}" data-b-field="name" value="${escapeAttr(it.name)}"></td>
            <td><input class="studio-input" style="min-width:95px; padding:4px 7px; font-size:0.78rem;" data-b-idx="${idx}" data-b-field="category" value="${escapeAttr(it.category)}"></td>
            <td><input class="studio-input" type="number" style="width:92px; padding:4px 7px; font-size:0.78rem;" data-b-idx="${idx}" data-b-field="unitPrice" value="${it.unitPrice}"></td>
            <td><input class="studio-input" type="number" style="width:62px; padding:4px 7px; font-size:0.78rem;" data-b-idx="${idx}" data-b-field="qty" value="${it.qty}"></td>
            <td><input class="studio-input" style="width:56px; padding:4px 7px; font-size:0.78rem;" data-b-idx="${idx}" data-b-field="unit" value="${escapeAttr(it.unit)}"></td>
            <td><input class="studio-input" type="number" style="width:96px; padding:4px 7px; font-size:0.78rem;" data-b-idx="${idx}" data-b-field="quotedSubtotal" value="${it.quotedSubtotal}"></td>
            <td style="font-weight:700; white-space:nowrap; color:${r.diff !== 0 ? "var(--rose)" : "var(--emerald)"};">
              ${r.expected.toLocaleString()}
              ${r.warnings.length ? `<div style="font-size:0.68rem; font-weight:400; color:var(--amber); max-width:160px;">${escapeHtml(r.warnings.join("；"))}</div>` : ""}
            </td>
            <td><input class="studio-input" style="min-width:110px; padding:4px 7px; font-size:0.76rem;" data-b-idx="${idx}" data-b-field="paymentStage" value="${escapeAttr(it.paymentStage || "")}"></td>
            <td><button class="btn btn-rose btn-sm" data-b-del="${idx}" style="padding:3px 7px;">✕</button></td>
          </tr>
        `;
      })
      .join("");

    tbody.querySelectorAll("input[data-b-idx]").forEach((inp) => {
      inp.addEventListener("change", () => {
        const idx = Number(inp.getAttribute("data-b-idx"));
        const field = inp.getAttribute("data-b-field");
        if (!c.budgetItems[idx]) return;
        if (field === "unitPrice" || field === "qty" || field === "quotedSubtotal") {
          c.budgetItems[idx][field] = Number(inp.value) || 0;
        } else {
          c.budgetItems[idx][field] = inp.value;
        }
        saveCasesToStorage();
        renderBudgetTable();
        renderSidebar();
      });
    });

    tbody.querySelectorAll("button[data-b-del]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const idx = Number(btn.getAttribute("data-b-del"));
        c.budgetItems.splice(idx, 1);
        saveCasesToStorage();
        renderBudgetTable();
        renderSidebar();
      });
    });
  }

  // Render View 3: Findings Workbench & RFP Diff Workbench
  function renderWorkbenchView() {
    const c = getActiveCase();
    setVal("inpOverallPositive", c.overallPositive || "");
    setVal("selConclusion", c.conclusion || "conditional");
    setVal("inpConclusionNote", c.conclusionNote || "");

    const findingsContainer = document.getElementById("findingsListContainer");
    if (findingsContainer) {
      c.findings = c.findings || [];
      if (c.findings.length === 0) {
        findingsContainer.innerHTML = `<div style="padding:18px; text-align:center; color:var(--text-muted); border:1px dashed var(--border); border-radius:8px;">尚無審查意見，請點右上角「＋新增審查意見主題」或由步驟 2 掃描器轉入。</div>`;
      } else {
        findingsContainer.innerHTML = c.findings
          .map((f, idx) => {
            const lintBadges = window.GovScanner.lintFindingCard(f);
            const checkedForMerge = state.selectedFindingIdsForMerge.has(f.id);
            const questionsText = (f.questions || []).join("\n");
            return `
              <div class="finding-card">
                <div class="finding-card-top">
                  <div style="display:flex; align-items:center; gap:10px; flex-wrap:wrap;">
                    <label style="display:inline-flex; align-items:center; gap:5px; font-size:0.76rem; color:var(--text-secondary); cursor:pointer;">
                      <input type="checkbox" data-merge-id="${f.id}" ${checkedForMerge ? "checked" : ""}>
                      勾選合併
                    </label>
                    <span class="finding-num-badge">主題 ${idx + 1}</span>
                    <input class="studio-input" style="width:220px; padding:4px 8px; font-size:0.76rem;" data-f-idx="${idx}" data-f-field="rootCategory" value="${escapeAttr(f.rootCategory || "")}" placeholder="根本問題分類">
                    <input class="studio-input" style="width:130px; padding:4px 8px; font-size:0.76rem;" data-f-idx="${idx}" data-f-field="pages" value="${escapeAttr(f.pages || "")}" placeholder="參考頁碼 (如P.45)">
                  </div>
                  <div style="display:flex; gap:6px;">
                    ${idx > 0 ? `<button class="btn btn-secondary btn-sm" data-f-up="${idx}" title="上移">↑</button>` : ""}
                    <button class="btn btn-rose btn-sm" data-f-del="${idx}" title="刪除此項">刪除</button>
                  </div>
                </div>

                <div class="form-group" style="margin-bottom:10px;">
                  <label class="form-label">【具體標題——標題本身就是結論，不要寫「待改善事項」空話】</label>
                  <input class="studio-input" style="font-weight:700;" data-f-idx="${idx}" data-f-field="title" value="${escapeAttr(f.title || "")}" placeholder="例：資料遷移缺乏平行驗證機制，上線中斷風險偏高">
                </div>

                <div class="form-grid">
                  <div class="form-group">
                    <label class="form-label">審查意見（問題現象→技術或邏輯疑慮→可能後果＋頁碼）</label>
                    <textarea class="studio-textarea" data-f-idx="${idx}" data-f-field="opinion" placeholder="敘述招標要求是什麼→建議書寫什麼→為什麼這是問題...">${escapeHtml(f.opinion || "")}</textarea>
                  </div>
                  <div class="form-group">
                    <label class="form-label">備註（格式一：判斷依據＋具體可驗收建議）</label>
                    <textarea class="studio-textarea" data-f-idx="${idx}" data-f-field="note" placeholder="說明對照了哪些頁碼/數據/慣例，並提出具體到可驗收的建議（如附測試案例、SOP）...">${escapeHtml(f.note || "")}</textarea>
                  </div>
                  <div class="form-group full">
                    <label class="form-label">請廠商說明（格式二宣讀版專用：每行一題，建議收斂為具體可回答之是非／承諾題）</label>
                    <textarea class="studio-textarea" style="min-height:64px;" data-f-idx="${idx}" data-f-field="questions" placeholder="1. 是否同意全部依招標文件規定辦理？&#10;2. 請說明具體回復（Rollback）所需時間？">${escapeHtml(questionsText)}</textarea>
                  </div>
                </div>

                <div class="linter-pills">
                  ${lintBadges
                    .map(
                      (b) => `<span class="linter-pill linter-${b.level}">${b.level === "ok" ? "✓ " : "⚠ "}${escapeHtml(b.text)}</span>`
                    )
                    .join("")}
                </div>
              </div>
            `;
          })
          .join("");

        findingsContainer.querySelectorAll("input[data-merge-id]").forEach((chk) => {
          chk.addEventListener("change", () => {
            const fid = chk.getAttribute("data-merge-id");
            if (chk.checked) state.selectedFindingIdsForMerge.add(fid);
            else state.selectedFindingIdsForMerge.delete(fid);
          });
        });

        findingsContainer.querySelectorAll("[data-f-idx]").forEach((el) => {
          el.addEventListener("input", () => {
            const idx = Number(el.getAttribute("data-f-idx"));
            const field = el.getAttribute("data-f-field");
            if (!c.findings[idx]) return;
            if (field === "questions") {
              c.findings[idx].questions = el.value
                .split(/\r?\n/)
                .map((s) => s.replace(/^\s*\d+[.、)\s]+/, "").trim())
                .filter(Boolean);
            } else {
              c.findings[idx][field] = el.value;
            }
            saveCasesToStorage();
          });
          el.addEventListener("blur", () => {
            renderWorkbenchView();
            renderSidebar();
          });
        });

        findingsContainer.querySelectorAll("button[data-f-up]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const idx = Number(btn.getAttribute("data-f-up"));
            if (idx > 0) {
              const tmp = c.findings[idx - 1];
              c.findings[idx - 1] = c.findings[idx];
              c.findings[idx] = tmp;
              saveCasesToStorage();
              renderWorkbenchView();
            }
          });
        });

        findingsContainer.querySelectorAll("button[data-f-del]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const idx = Number(btn.getAttribute("data-f-del"));
            c.findings.splice(idx, 1);
            saveCasesToStorage();
            renderWorkbenchView();
            renderSidebar();
          });
        });
      }
    }

    // Render RFP Diffs Container
    const rfpContainer = document.getElementById("rfpDiffListContainer");
    if (rfpContainer) {
      c.rfpDiffs = c.rfpDiffs || [];
      if (c.rfpDiffs.length === 0) {
        rfpContainer.innerHTML = `<div style="padding:14px; text-align:center; color:var(--text-muted); border:1px dashed var(--border); border-radius:8px;">尚無招標文件修正條文，若需優化需求說明書或評選須知，請點「＋新增條文修正對照」。</div>`;
      } else {
        rfpContainer.innerHTML = c.rfpDiffs
          .map(
            (d, idx) => `
            <div class="finding-card">
              <div class="finding-card-top">
                <div style="display:flex; align-items:center; gap:8px; flex-wrap:wrap; flex:1;">
                  <span class="finding-num-badge">條文修正 ${idx + 1}</span>
                  <input class="studio-input" style="flex:1; min-width:220px; font-weight:700;" data-d-idx="${idx}" data-d-field="title" value="${escapeAttr(d.title || "")}" placeholder="修正標題（例：特定廠牌未加註或同等品）">
                  <input class="studio-input" style="width:210px;" data-d-idx="${idx}" data-d-field="location" value="${escapeAttr(d.location || "")}" placeholder="位置與頁碼（如 P.19 第肆章）">
                </div>
                <button class="btn btn-rose btn-sm" data-d-del="${idx}">刪除</button>
              </div>
              <div class="form-grid">
                <div class="form-group">
                  <label class="form-label">修正前（原條文）</label>
                  <textarea class="studio-textarea" data-d-idx="${idx}" data-d-field="beforeText" placeholder="貼上原招標文件條文...">${escapeHtml(d.beforeText || "")}</textarea>
                </div>
                <div class="form-group">
                  <label class="form-label">
                    <span>修正後（增修處請用 **粗體** 包圍）</span>
                    <button type="button" class="btn btn-secondary btn-sm" style="padding:1px 6px; font-size:0.68rem;" data-bold-helper="${idx}">將選取文字標為 **粗體**</button>
                  </label>
                  <textarea class="studio-textarea" id="rfpAfter_${idx}" data-d-idx="${idx}" data-d-field="afterText" placeholder="盡量保留原條文，增修處以 **粗體文字** 標出...">${escapeHtml(d.afterText || "")}</textarea>
                </div>
                <div class="form-group full">
                  <label class="form-label">一句修正理由（精簡扼要）</label>
                  <input class="studio-input" data-d-idx="${idx}" data-d-field="reason" value="${escapeAttr(d.reason || "")}" placeholder="例：符合政府採購法第26條規定並消除履約工期起算日爭議。">
                </div>
              </div>
            </div>
          `
          )
          .join("");

        rfpContainer.querySelectorAll("[data-d-idx]").forEach((el) => {
          el.addEventListener("input", () => {
            const idx = Number(el.getAttribute("data-d-idx"));
            const field = el.getAttribute("data-d-field");
            if (!c.rfpDiffs[idx]) return;
            c.rfpDiffs[idx][field] = el.value;
            saveCasesToStorage();
          });
        });

        rfpContainer.querySelectorAll("button[data-bold-helper]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const idx = Number(btn.getAttribute("data-bold-helper"));
            const ta = document.getElementById(`rfpAfter_${idx}`);
            if (!ta) return;
            const start = ta.selectionStart;
            const end = ta.selectionEnd;
            if (start === end) {
              showToast("請先在「修正後」文字框反白選取要加粗的增修文字");
              return;
            }
            const val = ta.value;
            const selected = val.slice(start, end);
            ta.value = val.slice(0, start) + `**${selected}**` + val.slice(end);
            c.rfpDiffs[idx].afterText = ta.value;
            saveCasesToStorage();
            showToast("已標示為粗體增修處");
          });
        });

        rfpContainer.querySelectorAll("button[data-d-del]").forEach((btn) => {
          btn.addEventListener("click", () => {
            const idx = Number(btn.getAttribute("data-d-del"));
            c.rfpDiffs.splice(idx, 1);
            saveCasesToStorage();
            renderWorkbenchView();
            renderSidebar();
          });
        });
      }
    }
  }

  // Render View 4: AI Prompt Generator
  function renderPromptView() {
    const c = getActiveCase();
    const traps = window.GovScanner.scanDocumentTraps(c.docText || "");
    const budgetReport = window.GovScanner.verifyBudgetTable(c.budgetItems || [], c.budgetAmount);
    const promptText = window.GovExporter.buildSkillPrompt(c, traps, budgetReport);
    setVal("generatedPromptTextarea", promptText);
  }

  // Render View 5: Report Preview, Vendor Scoring & Export
  function renderExportView() {
    const c = getActiveCase();
    setVal("exportFormatQuickSwitch", c.outputFormat || "oral");

    // Render Vendor Scoring Table
    renderVendorScoringTable();

    // Render Consulting Paper Preview
    const container = document.getElementById("reportPreviewContainer");
    if (container) {
      container.innerHTML = window.GovExporter.renderReportHtml(c);
    }
  }

  function renderVendorScoringTable() {
    const c = getActiveCase();
    const table = document.getElementById("vendorScoringTable");
    if (!table) return;
    c.vendors = c.vendors || [];
    const crits = window.GOV_REVIEW_DATA.defaultScoringCriteria;
    const ranked = window.GovExporter.computeVendorRankings(c.vendors, crits);

    const rankMap = {};
    ranked.forEach((r) => {
      rankMap[r.id] = r;
    });

    table.innerHTML = `
      <thead>
        <tr>
          <th>投標廠商名稱</th>
          ${crits.map((cr) => `<th>${cr.name}<br><small>(配分上限 ${cr.maxScore})</small></th>`).join("")}
          <th>總分</th>
          <th>自動序位</th>
          <th></th>
        </tr>
      </thead>
      <tbody>
        ${c.vendors
          .map((v, vIdx) => {
            const rInfo = rankMap[v.id] || { total: 0, rank: "-" };
            return `
              <tr>
                <td><input class="studio-input" style="min-width:150px; padding:4px 8px; font-size:0.8rem;" data-v-idx="${vIdx}" data-v-name="1" value="${escapeAttr(v.name)}"></td>
                ${crits
                  .map(
                    (cr) => `
                  <td>
                    <input class="studio-input" type="number" min="0" max="${cr.maxScore}" style="width:68px; padding:4px 6px; text-align:center;" data-v-idx="${vIdx}" data-v-crit="${cr.id}" value="${(v.scores && v.scores[cr.id]) || 0}">
                  </td>
                `
                  )
                  .join("")}
                <td style="font-weight:800; font-size:0.92rem; color:${rInfo.total >= 70 ? "var(--emerald)" : "var(--rose)"};">${rInfo.total}</td>
                <td style="font-weight:800; color:var(--accent);">第 ${rInfo.rank} 序位</td>
                <td><button class="btn btn-rose btn-sm" data-v-del="${vIdx}" style="padding:3px 7px;">✕</button></td>
              </tr>
            `;
          })
          .join("")}
      </tbody>
    `;

    table.querySelectorAll("input[data-v-name]").forEach((inp) => {
      inp.addEventListener("change", () => {
        const vIdx = Number(inp.getAttribute("data-v-idx"));
        c.vendors[vIdx].name = inp.value;
        saveCasesToStorage();
        renderExportView();
      });
    });

    table.querySelectorAll("input[data-v-crit]").forEach((inp) => {
      inp.addEventListener("change", () => {
        const vIdx = Number(inp.getAttribute("data-v-idx"));
        const cid = inp.getAttribute("data-v-crit");
        c.vendors[vIdx].scores = c.vendors[vIdx].scores || {};
        c.vendors[vIdx].scores[cid] = Number(inp.value) || 0;
        saveCasesToStorage();
        renderExportView();
      });
    });

    table.querySelectorAll("button[data-v-del]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const vIdx = Number(btn.getAttribute("data-v-del"));
        c.vendors.splice(vIdx, 1);
        saveCasesToStorage();
        renderExportView();
      });
    });
  }

  // Helper: Add a finding card and notify user
  function addFindingFromTemplate(tpl) {
    const c = getActiveCase();
    c.findings = c.findings || [];
    c.findings.push({
      id: "f_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6),
      title: tpl.title || "",
      rootCategory: tpl.rootCategory || "深層邏輯檢核",
      pages: tpl.pages || "",
      opinion: tpl.opinion || "",
      note: tpl.note || "",
      questions: tpl.questions || [""]
    });
    saveCasesToStorage();
    renderAll();
    showToast("已加入審查意見工作台！");
  }

  // Merge selected findings into a single Root-Cause Theme (SKILL.md core rule)
  function mergeSelectedFindings() {
    const c = getActiveCase();
    const ids = Array.from(state.selectedFindingIdsForMerge);
    if (ids.length < 2) {
      showToast("請先在下方卡片勾選至少 2 項欲合併歸納的審查意見");
      return;
    }
    const selected = c.findings.filter((f) => ids.includes(f.id));
    const remaining = c.findings.filter((f) => !ids.includes(f.id));

    const mergedTitle = selected.map((f) => f.title).filter(Boolean).join("，且");
    const mergedPages = Array.from(new Set(selected.map((f) => f.pages).filter(Boolean))).join("、");
    const mergedOpinion = selected
      .map((f, i) => `(${i + 1}) ${f.opinion}`)
      .filter(Boolean)
      .join("；");
    const mergedNote = selected.map((f) => f.note).filter(Boolean).join("；另");
    const mergedQuestions = [];
    selected.forEach((f) => {
      (f.questions || []).forEach((q) => {
        if (q && !mergedQuestions.includes(q)) mergedQuestions.push(q);
      });
    });

    remaining.unshift({
      id: "f_merged_" + Date.now(),
      title: mergedTitle.slice(0, 75),
      rootCategory: selected[0].rootCategory || "歸納後之根本問題",
      pages: mergedPages,
      opinion: mergedOpinion,
      note: mergedNote,
      questions: mergedQuestions.length ? mergedQuestions : [""]
    });

    c.findings = remaining;
    state.selectedFindingIdsForMerge.clear();
    saveCasesToStorage();
    renderAll();
    showToast(`已將 ${selected.length} 項零散發現歸納合併為 1 項根本問題主題！`);
  }

  // Extract text from uploaded .txt/.md/.csv/.docx file
  async function handleDocFileUpload(file) {
    if (!file) return;
    const c = getActiveCase();
    const name = file.name.toLowerCase();

    if (name.endsWith(".docx")) {
      try {
        const arrayBuf = await file.arrayBuffer();
        const extracted = await extractDocxTextOffline(arrayBuf);
        if (extracted) {
          c.docText = (c.docText ? c.docText + "\n\n" : "") + `【匯入檔案：${file.name}】\n` + extracted;
          saveCasesToStorage();
          renderAll();
          showToast(`已解析 Word 檔 (${file.name}) 並完成陷阱掃描`);
          return;
        }
      } catch (e) {
        console.warn("Docx parse error:", e);
      }
      showToast("此 Word 檔格式較複雜，建議直接全選複製文字貼入下方文字框");
      return;
    }

    const reader = new FileReader();
    reader.onload = function (e) {
      const content = String(e.target.result || "");
      c.docText = (c.docText ? c.docText + "\n\n" : "") + `【匯入檔案：${file.name}】\n` + content;
      saveCasesToStorage();
      renderAll();
      showToast(`已匯入 ${file.name} 並完成自動掃描`);
    };
    reader.readAsText(file, "utf-8");
  }

  // Lightweight browser-native .docx XML text extractor using DecompressionStream
  async function extractDocxTextOffline(arrayBuffer) {
    const bytes = new Uint8Array(arrayBuffer);
    // Locate "word/document.xml" local file header in ZIP
    const targetName = "word/document.xml";
    const enc = new TextEncoder().encode(targetName);

    for (let i = 0; i < bytes.length - 30; i++) {
      // ZIP local file header signature 0x04034b50
      if (bytes[i] === 0x50 && bytes[i + 1] === 0x4b && bytes[i + 2] === 0x03 && bytes[i + 3] === 0x04) {
        const compression = bytes[i + 8] | (bytes[i + 9] << 8);
        const compSize = bytes[i + 18] | (bytes[i + 19] << 8) | (bytes[i + 20] << 16) | (bytes[i + 21] << 24);
        const fileNameLen = bytes[i + 26] | (bytes[i + 27] << 8);
        const extraLen = bytes[i + 28] | (bytes[i + 29] << 8);

        if (fileNameLen === enc.length) {
          let match = true;
          for (let k = 0; k < enc.length; k++) {
            if (bytes[i + 30 + k] !== enc[k]) {
              match = false;
              break;
            }
          }
          if (match) {
            const dataStart = i + 30 + fileNameLen + extraLen;
            const compData = bytes.slice(dataStart, dataStart + compSize);
            let xmlText = "";
            if (compression === 0) {
              xmlText = new TextDecoder("utf-8").decode(compData);
            } else if (compression === 8 && typeof DecompressionStream !== "undefined") {
              const ds = new DecompressionStream("deflate-raw");
              const writer = ds.writable.getWriter();
              writer.write(compData);
              writer.close();
              const resp = new Response(ds.readable);
              xmlText = await resp.text();
            }
            if (xmlText) {
              return xmlText
                .replace(/<\/w:p>/g, "\n")
                .replace(/<[^>]+>/g, "")
                .replace(/&amp;/g, "&")
                .replace(/&lt;/g, "<")
                .replace(/&gt;/g, ">")
                .trim();
            }
          }
        }
      }
    }
    return "";
  }

  function switchView(viewName) {
    state.activeView = viewName;
    document.querySelectorAll(".view-tab").forEach((t) => {
      t.classList.toggle("active", t.getAttribute("data-view") === viewName);
    });
    document.querySelectorAll(".workspace-view").forEach((sec) => {
      sec.classList.toggle("active", sec.id === `view-${viewName}`);
    });
    renderAll();
  }

  function renderAll() {
    renderSidebar();
    renderSetupView();
    renderScannerView();
    renderWorkbenchView();
    renderPromptView();
    renderExportView();
  }

  function closeMobileSidebar() {
    document.getElementById("sidebar")?.classList.remove("open");
    document.getElementById("sidebarBackdrop")?.classList.remove("open");
  }

  function setVal(id, val) {
    const el = document.getElementById(id);
    if (el && document.activeElement !== el) el.value = val ?? "";
  }

  function setText(id, txt) {
    const el = document.getElementById(id);
    if (el) el.textContent = txt;
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function escapeAttr(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/"/g, "&quot;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  // Initialize Event Listeners
  function initEvents() {
    // Theme toggle
    const savedTheme = localStorage.getItem(THEME_KEY);
    if (savedTheme === "light") document.body.classList.add("theme-light");

    document.getElementById("themeToggleBtn")?.addEventListener("click", () => {
      document.body.classList.toggle("theme-light");
      localStorage.setItem(THEME_KEY, document.body.classList.contains("theme-light") ? "light" : "dark");
    });

    // Mobile drawer
    document.getElementById("mobileMenuBtn")?.addEventListener("click", () => {
      document.getElementById("sidebar")?.classList.toggle("open");
      document.getElementById("sidebarBackdrop")?.classList.toggle("open");
    });
    document.getElementById("sidebarBackdrop")?.addEventListener("click", closeMobileSidebar);

    // Top view tabs
    document.querySelectorAll(".view-tab").forEach((tab) => {
      tab.addEventListener("click", () => {
        switchView(tab.getAttribute("data-view"));
      });
    });

    // Sidebar Case Actions
    document.getElementById("newCaseBtn")?.addEventListener("click", () => createNewCase("proposal"));
    document.getElementById("resetDemoBtn")?.addEventListener("click", () => {
      if (confirm("確定要重新載入內建的 4 個完整示範案件嗎？（您新增的其他案件仍會保留）")) {
        const demos = cloneDeep(window.GOV_REVIEW_DATA.sampleCases);
        const demoIds = new Set(demos.map((d) => d.id));
        state.cases = [...demos, ...state.cases.filter((c) => !demoIds.has(c.id))];
        state.activeCaseId = state.cases[0].id;
        saveCasesToStorage();
        renderAll();
        showToast("已載入 4 大模式完整示範案件");
      }
    });

    document.getElementById("deleteCaseBtn")?.addEventListener("click", () => {
      if (state.cases.length <= 1) {
        showToast("至少需保留一個案件");
        return;
      }
      const c = getActiveCase();
      if (confirm(`確定要刪除「${c.projectName}」嗎？`)) {
        state.cases = state.cases.filter((x) => x.id !== c.id);
        state.activeCaseId = state.cases[0].id;
        saveCasesToStorage();
        renderAll();
        showToast("案件已刪除");
      }
    });

    // JSON Backup Export & Import
    document.getElementById("exportJsonBtn")?.addEventListener("click", () => {
      const blob = new Blob([JSON.stringify(state.cases, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `GovIT_Review_Cases_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("已匯出全部案件 JSON 備份");
    });

    document.getElementById("importJsonInput")?.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const imported = JSON.parse(String(ev.target.result));
          if (Array.isArray(imported) && imported.length > 0) {
            state.cases = imported;
            state.activeCaseId = imported[0].id;
            saveCasesToStorage();
            renderAll();
            showToast(`成功匯入 ${imported.length} 筆審查案件`);
          }
        } catch (err) {
          showToast("JSON 格式無效");
        }
      };
      reader.readAsText(file);
    });

    // Bind Setup Form Fields
    const fieldMap = [
      ["inpAgencyName", "agencyName"],
      ["inpProjectName", "projectName"],
      ["inpCaseNumber", "caseNumber"],
      ["inpTargetVendor", "targetVendor"],
      ["inpBudgetAmount", "budgetAmount"],
      ["inpPageRange", "pageRange"],
      ["inpReviewDate", "reviewDate"],
      ["inpReviewerName", "reviewerName"],
      ["selOutputFormat", "outputFormat"],
      ["inpOverallPositive", "overallPositive"],
      ["selConclusion", "conclusion"],
      ["inpConclusionNote", "conclusionNote"]
    ];

    fieldMap.forEach(([domId, key]) => {
      const el = document.getElementById(domId);
      if (!el) return;
      el.addEventListener("input", () => {
        const c = getActiveCase();
        c[key] = key === "budgetAmount" ? Number(el.value) || 0 : el.value;
        saveCasesToStorage();
        renderSidebar();
      });
    });

    document.getElementById("checkAllQuick12Btn")?.addEventListener("click", () => {
      const c = getActiveCase();
      const allIds = window.GOV_REVIEW_DATA.quickChecklist12.map((q) => q.id);
      if ((c.checkedQuick12 || []).length === allIds.length) {
        c.checkedQuick12 = [];
      } else {
        c.checkedQuick12 = allIds;
      }
      saveCasesToStorage();
      renderAll();
    });

    // Scanner & File Upload
    document.getElementById("inpDocText")?.addEventListener("input", (e) => {
      const c = getActiveCase();
      c.docText = e.target.value;
      saveCasesToStorage();
    });

    document.getElementById("runTrapScanBtn")?.addEventListener("click", () => {
      renderScannerView();
      renderSidebar();
      showToast(`掃描完成：共偵測到 ${state.lastTrapResults.length} 處潛在邏輯與合規陷阱`);
    });

    document.getElementById("docFileInput")?.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (file) handleDocFileUpload(file);
    });

    // Budget Table Actions
    document.getElementById("addBudgetRowBtn")?.addEventListener("click", () => {
      const c = getActiveCase();
      c.budgetItems = c.budgetItems || [];
      c.budgetItems.push({
        id: "b_" + Date.now(),
        name: "新報價項目",
        category: "資訊服務費",
        unitPrice: 100000,
        qty: 1,
        unit: "1式",
        quotedSubtotal: 100000,
        paymentStage: ""
      });
      saveCasesToStorage();
      renderBudgetTable();
      renderSidebar();
    });

    document.getElementById("parseBatchBudgetBtn")?.addEventListener("click", () => {
      const raw = document.getElementById("batchBudgetTextarea")?.value || "";
      const items = window.GovScanner.parseBudgetLines(raw);
      if (items.length === 0) {
        showToast("無法解析報價行，請確認每行包含「項目名稱、單價、數量、小計」");
        return;
      }
      const c = getActiveCase();
      c.budgetItems = [...(c.budgetItems || []), ...items];
      saveCasesToStorage();
      renderBudgetTable();
      renderSidebar();
      showToast(`成功匯入 ${items.length} 筆報價明細並完成驗算`);
    });

    document.getElementById("budgetAnomalyToFindingBtn")?.addEventListener("click", () => {
      const c = getActiveCase();
      const report = window.GovScanner.verifyBudgetTable(c.budgetItems || [], c.budgetAmount);
      if (!report.summaryAlerts.length) {
        showToast("目前報價表無算術差額或結構異常");
        return;
      }
      const details = report.summaryAlerts.map((a) => a.text).join("；");
      addFindingFromTemplate({
        title: "經費報價明細存在算術驗算不符、科目錯置或「一式」籠統編列問題",
        rootCategory: "3. 經費合理性 ＆ C. 價格與綁定",
        pages: "經費報價明細表",
        opinion: `實際核算本案經費報價表發現：${details}`,
        note: "判斷依據為報價表逐項單價×數量驗算及預算科目核對。建議要求修正算術差額，並將「一式」項目拆列子系統功能模組與各級人力人月單價。",
        questions: ["請說明報價表單價×數量與小計不符之原因，並提供「一式」報價項目之功能模組與人月拆解表。"]
      });
    });

    // Scanned Photo Loupe Controls
    const scanCanvas = document.getElementById("scanCanvas");
    const scanStatus = document.getElementById("scanStatusText");
    const scanHint = document.getElementById("scanEmptyHint");

    document.getElementById("scanImageInput")?.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;
      if (scanHint) scanHint.style.display = "none";
      if (scanCanvas) scanCanvas.style.display = "block";
      window.GovScanner.loadScanImage(file, scanCanvas, scanStatus);
      showToast("已載入掃描頁，可旋轉、切左右頁或放大核對數字");
    });

    document.getElementById("scanRotLeftBtn")?.addEventListener("click", () => {
      window.GovScanner.scanState.rotation -= 90;
      window.GovScanner.renderScanCanvas(scanCanvas, scanStatus);
    });
    document.getElementById("scanRotRightBtn")?.addEventListener("click", () => {
      window.GovScanner.scanState.rotation += 90;
      window.GovScanner.renderScanCanvas(scanCanvas, scanStatus);
    });
    document.getElementById("scanSplitFullBtn")?.addEventListener("click", () => {
      window.GovScanner.scanState.splitMode = "full";
      window.GovScanner.renderScanCanvas(scanCanvas, scanStatus);
    });
    document.getElementById("scanSplitLeftBtn")?.addEventListener("click", () => {
      window.GovScanner.scanState.splitMode = "left";
      window.GovScanner.renderScanCanvas(scanCanvas, scanStatus);
    });
    document.getElementById("scanSplitRightBtn")?.addEventListener("click", () => {
      window.GovScanner.scanState.splitMode = "right";
      window.GovScanner.renderScanCanvas(scanCanvas, scanStatus);
    });
    document.getElementById("scanZoomInBtn")?.addEventListener("click", () => {
      window.GovScanner.scanState.zoom = Math.min(350, window.GovScanner.scanState.zoom + 50);
      window.GovScanner.renderScanCanvas(scanCanvas, scanStatus);
    });
    document.getElementById("scanZoomOutBtn")?.addEventListener("click", () => {
      window.GovScanner.scanState.zoom = Math.max(50, window.GovScanner.scanState.zoom - 50);
      window.GovScanner.renderScanCanvas(scanCanvas, scanStatus);
    });
    document.getElementById("scanContrastBtn")?.addEventListener("click", () => {
      window.GovScanner.scanState.highContrast = !window.GovScanner.scanState.highContrast;
      window.GovScanner.renderScanCanvas(scanCanvas, scanStatus);
    });

    document.getElementById("insertScanNoteBtn")?.addEventListener("click", () => {
      const c = getActiveCase();
      if (c.findings && c.findings.length > 0) {
        const last = c.findings[c.findings.length - 1];
        last.note = (last.note ? last.note + " " : "") + "（註：本項引文與關鍵數據係依掃描原圖放大判讀核對為準。）";
        saveCasesToStorage();
        renderAll();
        showToast("已於最新一筆審查意見備註加上「以掃描原圖判讀為準」");
      }
    });

    document.getElementById("insertMissingPageBtn")?.addEventListener("click", () => {
      addFindingFromTemplate({
        title: "掃描文件存在缺頁且關鍵佐證附件漏未拍齊，影響實績與規格查證",
        rootCategory: "7. 文件內部一致性（掃描缺頁核對）",
        pages: "詳掃描檔缺頁處",
        opinion: "經逐頁檢視本次提供之掃描照片型文件，部分跨頁表格與目錄所列之佐證附件（如實績驗收證明、認證證書或規格對照表）漏未拍入或頁面截斷（註：以掃描原圖判讀為準），致無從核對實質內容。",
        note: "判斷依據為掃描原圖逐頁核對結果。建請補齊完整清晰之缺頁與附件佐證後再行複核。",
        questions: ["掃描文件存在漏拍缺頁，請現場提示正本或補交完整佐證附件以供查驗。"]
      });
    });

    // Workbench Buttons
    document.getElementById("addFindingBtn")?.addEventListener("click", () => {
      addFindingFromTemplate({
        title: "",
        rootCategory: "深層邏輯與可行性檢核",
        pages: "",
        opinion: "",
        note: "",
        questions: [""]
      });
    });

    document.getElementById("mergeSelectedFindingsBtn")?.addEventListener("click", mergeSelectedFindings);

    document.getElementById("addRfpDiffBtn")?.addEventListener("click", () => {
      const c = getActiveCase();
      c.rfpDiffs = c.rfpDiffs || [];
      c.rfpDiffs.push({
        id: "diff_" + Date.now(),
        title: "",
        location: "",
        beforeText: "",
        afterText: "",
        reason: ""
      });
      saveCasesToStorage();
      renderWorkbenchView();
      renderSidebar();
      showToast("已新增一筆招標文件條文修正對照");
    });

    // Prompt Center Buttons
    document.getElementById("refreshPromptBtn")?.addEventListener("click", () => {
      renderPromptView();
      showToast("已更新最新審查 Prompt");
    });

    document.getElementById("copyPromptBtn")?.addEventListener("click", () => {
      const txt = document.getElementById("generatedPromptTextarea")?.value || "";
      navigator.clipboard.writeText(txt).then(() => {
        showToast("已複製專業審查 Prompt！可直接貼至 Claude / ChatGPT / Gemini");
      });
    });

    const handleParseAi = (replaceMode) => {
      const raw = document.getElementById("aiResponseInput")?.value || "";
      if (!raw.trim()) {
        showToast("請先將 AI 回傳的審查意見貼入右側文字框");
        return;
      }
      const c = getActiveCase();
      const parsed = window.GovExporter.parseAiResponseToCase(raw, c.mode);
      if (parsed.overallPositive) c.overallPositive = parsed.overallPositive;

      if (c.mode === "rfp" && parsed.rfpDiffs.length > 0) {
        c.rfpDiffs = replaceMode ? parsed.rfpDiffs : [...(c.rfpDiffs || []), ...parsed.rfpDiffs];
        saveCasesToStorage();
        switchView("workbench");
        showToast(`成功解析並匯入 ${parsed.rfpDiffs.length} 條招標文件修正對照！`);
      } else if (parsed.findings.length > 0) {
        c.findings = replaceMode ? parsed.findings : [...(c.findings || []), ...parsed.findings];
        saveCasesToStorage();
        switchView("workbench");
        showToast(`成功解析並匯入 ${parsed.findings.length} 項結構化審查意見！`);
      } else {
        showToast("未偵測到標準編號標題（如 1. 【標題】 或 一、【標題】），請確認貼入格式");
      }
    };

    document.getElementById("parseAiAppendBtn")?.addEventListener("click", () => handleParseAi(false));
    document.getElementById("parseAiReplaceBtn")?.addEventListener("click", () => handleParseAi(true));

    // Export View Controls
    document.getElementById("exportFormatQuickSwitch")?.addEventListener("change", (e) => {
      const c = getActiveCase();
      c.outputFormat = e.target.value;
      saveCasesToStorage();
      renderExportView();
      renderSetupView();
    });

    document.getElementById("addVendorBtn")?.addEventListener("click", () => {
      const c = getActiveCase();
      c.vendors = c.vendors || [];
      c.vendors.push({
        id: "v_" + Date.now(),
        name: `投標廠商 ${String.fromCharCode(65 + c.vendors.length)}`,
        scores: { sc1: 24, sc2: 8, sc3: 16, sc4: 16, sc5: 12, sc6: 4 }
      });
      saveCasesToStorage();
      renderExportView();
    });

    document.getElementById("copyReportTextBtn")?.addEventListener("click", () => {
      const txt = window.GovExporter.renderPlainText(getActiveCase());
      navigator.clipboard.writeText(txt).then(() => {
        showToast("已複製完整審查報告純文字！");
      });
    });

    const triggerWordDownload = () => {
      window.GovExporter.exportWordDocument(getActiveCase());
      showToast("已下載無段落框線規範之 Word 審查報告 (.doc)");
    };

    const triggerPdfPrint = () => {
      switchView("export");
      setTimeout(() => {
        window.print();
      }, 180);
    };

    document.getElementById("downloadWordBtn")?.addEventListener("click", triggerWordDownload);
    document.getElementById("quickWordExportBtn")?.addEventListener("click", triggerWordDownload);
    document.getElementById("printPdfBtn")?.addEventListener("click", triggerPdfPrint);
    document.getElementById("quickPrintPdfBtn")?.addEventListener("click", triggerPdfPrint);
  }

  // Boot
  document.addEventListener("DOMContentLoaded", () => {
    loadCasesFromStorage();
    initEvents();
    renderAll();
  });
})();
