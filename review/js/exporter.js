// GovIT Review Studio - Prompt Generator, AI Response Parser, Report Formatter & Word/PDF Exporter

window.GovExporter = (function () {
  const CH_NUMS = ["一", "二", "三", "四", "五", "六", "七", "八", "九", "十"];

  function formatCurrency(num) {
    const n = Number(num);
    if (!n) return "未填列";
    return "新臺幣 " + n.toLocaleString("zh-TW") + " 元";
  }

  function formatBoldMarkup(str) {
    if (!str) return "";
    const escaped = String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
    return escaped.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>");
  }

  // Compute Vendor Scores & Rank Method (序位法)
  function computeVendorRankings(vendors, criteria) {
    if (!vendors || !vendors.length) return [];
    const crits = criteria || window.GOV_REVIEW_DATA.defaultScoringCriteria;
    const rows = vendors.map((v) => {
      let total = 0;
      crits.forEach((c) => {
        total += Number((v.scores && v.scores[c.id]) || 0);
      });
      return {
        id: v.id,
        name: v.name,
        scores: v.scores || {},
        total
      };
    });

    // Calculate rank (1 = highest total, ties share rank)
    const sortedTotals = [...rows].sort((a, b) => b.total - a.total);
    rows.forEach((r) => {
      const rankIdx = sortedTotals.findIndex((s) => s.total === r.total);
      r.rank = rankIdx + 1;
      r.qualified = r.total >= 70;
    });

    return rows.sort((a, b) => a.rank - b.rank);
  }

  // 1. Build Full Skill-Aligned Prompt for AI
  function buildSkillPrompt(caseObj, trapResults, budgetReport) {
    const data = window.GOV_REVIEW_DATA;
    const modeInfo = data.reviewModes[caseObj.mode] || data.reviewModes.proposal;

    const checkedPrinciplesText = data.tenPrinciples
      .filter((p) => (caseObj.checkedPrinciples || []).includes(p.id))
      .map((p) => `- 原則${p.num}【${p.title}】：${p.desc}`)
      .join("\n");

    const checkedProposalText = [];
    data.proposalDeepChecks.forEach((g) => {
      g.items.forEach((it) => {
        if ((caseObj.checkedProposalItems || []).includes(it.id)) {
          checkedProposalText.push(`- [${g.groupTitle}] ${it.label}：${it.detail}`);
        }
      });
    });

    const trapSummary = (trapResults || [])
      .map((t, i) => `${i + 1}. 【${t.title}】(${t.category})：${t.explanation}\n   摘錄：${t.matches.map((m) => m.snippet).join(" / ")}`)
      .join("\n");

    const budgetSummary =
      budgetReport && budgetReport.summaryAlerts && budgetReport.summaryAlerts.length > 0
        ? budgetReport.summaryAlerts.map((a) => `- [${a.type.toUpperCase()}] ${a.text}`).join("\n")
        : "（尚未發現算術差異或未輸入報價表）";

    let formatInstruction = "";
    if (caseObj.mode === "rfp" || caseObj.outputFormat === "rfp_diff") {
      formatInstruction = `## 指定輸出格式：招標文件修正前後對照
- 盡量保留原條文，只修正文字敘述、補實語意、消除前後矛盾，不要大幅增加文字
- 修正後文字中的增修處務必用 **粗體** 標出
- 每條結構固定如下（請勿使用表格切割，便於直接貼回工作台解析）：
1. 【具體標題】
位置：頁碼與章節
修正前：原條文內容
修正後：修正後條文內容（增修處以 **粗體** 標示）
理由：一句話說明修正理由`;
    } else if (caseObj.outputFormat === "oral") {
      formatInstruction = `## 指定輸出格式：格式二【評選會議宣讀版】（不要用表格切割審查意見）
- 開頭先寫一段「整體意見」：先具體肯定對齊需求的亮點，再寫「以下N項請廠商說明」
- 將所有零散發現歸納為 **3～5個根本問題主題**（例如：期程不足＋實績規模偏小＝「執行可行性」一項；SLA、訓練、保固起算各自寬鬆＝「契約承諾低於招標規範」一項）
- 次要問題（錯字、範本痕跡、算術小錯）併入相關主題提問，不單獨成項
- 每項結構固定如下：
一、【主題標題——標題本身就是結論】
審查意見：可直接宣讀的敘述，交代「招標要求是什麼→建議書寫什麼→為什麼這是問題（推論）」，標註頁碼（如 P.45-52）。
請廠商說明：
1. 具體、可回答的問題（能收斂成是非承諾題更好，例如「是否同意全部依招標文件辦理？」）
2. ……
- 結尾：給出審查結論（□可行 / □修正後可行 / □不可行），並說明哪些項目應於議約前承諾。`;
    } else {
      formatInstruction = `## 指定輸出格式：格式一【書面審查意見（逐條）】（不要用表格切割審查意見）
- 開頭先寫一段「整體意見」：正反並陳，先具體肯定對齊需求的亮點
- 每一條審查意見獨立成項，將零散發現歸納為深層根本問題，固定三段式結構：
1. 【具體標題——標題本身就是結論，不要寫「待改善事項」這類空話】
審查意見：以敘述方式完整說明問題現象、技術或邏輯上的疑慮、可能後果，並在文中標註參考頁碼（如 P.45-52）。
備註：說明判斷依據（對照了哪些頁碼／數據／業界慣例），並提出具體到「可驗收」程度的建議（例如要求附測試案例、Mapping表、SOP），避免空泛的「請再加強」。`;
    }

    return `# 角色與任務指令（依據 it-procurement-review v2 專業審查技能）
${modeInfo.rolePrompt}

## 審查心態（最重要的一條）
${data.coreMindset}
- 語氣要求：專業中立，用「建請補充」「請說明」「請廠商承諾」取代主觀評價式語句；正反並陳。
- 數字（單價×數量、小計、總價、日期換算）一律實際驗算。

## 本案基本資料
- 機關名稱：${caseObj.agencyName || "未填"}
- 計畫／採購案名稱：${caseObj.projectName || "未填"}
- 案號：${caseObj.caseNumber || "未填"}
- 審查對象／廠商：${caseObj.targetVendor || "未填"}
- 預算金額：${formatCurrency(caseObj.budgetAmount)}
- 頁碼範圍：${caseObj.pageRange || "未註明"}

## 審查委員重點關注之檢核維度
${checkedPrinciplesText || "（依十大審查原則全面檢視）"}
${checkedProposalText.length ? "\n### 服務建議書必查重點\n" + checkedProposalText.join("\n") : ""}

## 工作台自動預掃描發現之疑慮（請納入深層邏輯推演與歸納）
### 1. 邏輯與合規陷阱預掃描
${trapSummary || "（無自動觸發項目，請直接針對下方文件內容深度推演）"}

### 2. 經費與算術驗算結果
${budgetSummary}

${formatInstruction}

---
## 待審查文件內容／摘錄
${caseObj.docText || "（請在此貼上計畫書、服務建議書或招標文件全文／章節內容）"}
`;
  }

  // 2. Parse AI Response Back into Structured Findings / RFP Diffs
  function parseAiResponseToCase(rawText, mode) {
    if (!rawText || !rawText.trim()) return { findings: [], rfpDiffs: [], overallPositive: "" };
    const text = rawText.trim();
    let overallPositive = "";

    const overallMatch = text.match(/整體意見[：:]\s*([^\n]+(?:\n(?!(?:[一二三四五六七八九十\d]+[、.]\s*【))[^\n]+)*)/);
    if (overallMatch) {
      overallPositive = overallMatch[1].trim();
    }

    if (mode === "rfp") {
      const rfpDiffs = [];
      const blocks = text.split(/(?=(?:^|\n)\s*(?:\d+|[一二三四五六七八九十]+)[、.]\s*【)/g);
      blocks.forEach((b, idx) => {
        const titleMatch = b.match(/【([^】]+)】/);
        if (!titleMatch) return;
        const locMatch = b.match(/位置[：:]\s*(.+)/);
        const beforeMatch = b.match(/修正前[：:]\s*([\s\S]+?)(?=\n\s*修正後[：:]|$)/);
        const afterMatch = b.match(/修正後[：:]\s*([\s\S]+?)(?=\n\s*理由[：:]|$)/);
        const reasonMatch = b.match(/理由[：:]\s*([\s\S]+?)$/);
        rfpDiffs.push({
          id: "diff_ai_" + Date.now() + "_" + idx,
          title: titleMatch[1].trim(),
          location: locMatch ? locMatch[1].trim() : "詳內文",
          beforeText: beforeMatch ? beforeMatch[1].trim() : "",
          afterText: afterMatch ? afterMatch[1].trim() : "",
          reason: reasonMatch ? reasonMatch[1].trim() : ""
        });
      });
      return { findings: [], rfpDiffs, overallPositive };
    }

    // Parse Written (Format 1) or Oral (Format 2) blocks
    const findings = [];
    const blocks = text.split(/(?=(?:^|\n)\s*(?:\d+|[一二三四五六七八九十]+)[、.]\s*【)/g);
    blocks.forEach((b, idx) => {
      const titleMatch = b.match(/【([^】]+)】/);
      if (!titleMatch) return;
      const title = titleMatch[1].trim();

      const opinionMatch = b.match(/審查意見[：:]\s*([\s\S]+?)(?=\n\s*(?:備註|請廠商說明)[：:]|$)/);
      const noteMatch = b.match(/備註[：:]\s*([\s\S]+?)(?=\n\s*請廠商說明[：:]|$)/);
      const qBlockMatch = b.match(/請廠商說明[：:]\s*([\s\S]+?)$/);

      const opinion = opinionMatch ? opinionMatch[1].trim() : b.replace(/^[\s\S]*?【[^】]+】/, "").trim();
      const note = noteMatch ? noteMatch[1].trim() : "依計畫書上下文與招標規範交叉比對，建請補充具體可驗收之佐證文件。";
      const pageMatch = (opinion + " " + note).match(/P\.\s*\d+(?:\s*[-~～]\s*(?:P\.)?\d+)?/i);

      const questions = [];
      if (qBlockMatch) {
        const qLines = qBlockMatch[1]
          .split(/\r?\n/)
          .map((l) => l.replace(/^\s*\d+[.、)\s]+/, "").trim())
          .filter(Boolean);
        questions.push(...qLines);
      }

      findings.push({
        id: "f_ai_" + Date.now() + "_" + idx,
        title,
        rootCategory: "AI 深度歸納主題",
        pages: pageMatch ? pageMatch[0] : "",
        opinion,
        note,
        questions
      });
    });

    return { findings, rfpDiffs: [], overallPositive };
  }

  // 3. Render HTML Report Preview (Supports Written Format 1, Oral Format 2, RFP Diff Format)
  function renderReportHtml(caseObj) {
    const modeInfo = window.GOV_REVIEW_DATA.reviewModes[caseObj.mode] || window.GOV_REVIEW_DATA.reviewModes.proposal;
    const fmt = caseObj.outputFormat || modeInfo.defaultOutputFormat;

    const conclusionCheck = {
      feasible: "■ 可行　　□ 修正後可行　　□ 不可行",
      conditional: "□ 可行　　■ 修正後可行　　□ 不可行",
      infeasible: "□ 可行　　□ 修正後可行　　■ 不可行"
    }[caseObj.conclusion || "conditional"];

    let bodyHtml = "";

    if (fmt === "rfp_diff" || caseObj.mode === "rfp") {
      const diffs = caseObj.rfpDiffs || [];
      bodyHtml += `<div class="report-section-heading">壹、整體檢視意見</div>`;
      bodyHtml += `<p class="report-finding-text">${formatBoldMarkup(caseObj.overallPositive || "本案招標文件架構完整，惟為避免後續履約與評選爭議，針對關鍵條文提出修正前後對照建議如下：")}</p>`;
      bodyHtml += `<div class="report-section-heading">貳、招標文件關鍵條文修正前後對照（增修處以粗體標示）</div>`;

      diffs.forEach((d, idx) => {
        bodyHtml += `
          <div class="report-finding-block">
            <div class="report-finding-title">${idx + 1}. 【${formatBoldMarkup(d.title)}】（位置：${formatBoldMarkup(d.location || "詳內文")}）</div>
            <p class="report-finding-text"><strong>修正前：</strong>${formatBoldMarkup(d.beforeText)}</p>
            <p class="report-finding-text"><strong>修正後：</strong>${formatBoldMarkup(d.afterText)}</p>
            <p class="report-finding-note"><strong>修正理由：</strong>${formatBoldMarkup(d.reason)}</p>
          </div>
        `;
      });
    } else if (fmt === "oral") {
      // 格式二：評選會議宣讀版
      const findings = caseObj.findings || [];
      bodyHtml += `<div class="report-section-heading">壹、整體意見</div>`;
      bodyHtml += `<p class="report-finding-text">${formatBoldMarkup(caseObj.overallPositive || "肯定廠商對本案需求之投入，整體規劃涵蓋招標文件主要項目。")}<br><strong>以下歸納 ${findings.length} 項核心問題，請廠商於簡報詢答時具體說明並承諾：</strong></p>`;
      bodyHtml += `<div class="report-section-heading">貳、評選委員詢問與待澄清事項（宣讀版）</div>`;

      findings.forEach((f, idx) => {
        const chNum = CH_NUMS[idx] || idx + 1;
        const qs = (f.questions && f.questions.length > 0)
          ? f.questions
          : [`針對上述疑慮（${f.pages || "詳計畫書"}），請具體說明解決方案，並確認是否同意完全依招標文件規範辦理？`];
        bodyHtml += `
          <div class="report-finding-block">
            <div class="report-finding-title">${chNum}、【${formatBoldMarkup(f.title)}】</div>
            <p class="report-finding-text"><strong>審查意見：</strong>${formatBoldMarkup(f.opinion)}</p>
            <div class="report-finding-note">
              <strong>請廠商說明：</strong>
              <ol style="margin:4px 0 0 20px; padding:0;">
                ${qs.map((q) => `<li style="margin-bottom:3px;">${formatBoldMarkup(q)}</li>`).join("")}
              </ol>
            </div>
          </div>
        `;
      });
    } else {
      // 格式一：書面審查意見（逐條）
      const findings = caseObj.findings || [];
      bodyHtml += `<div class="report-section-heading">壹、整體審查意見</div>`;
      bodyHtml += `<p class="report-finding-text">${formatBoldMarkup(caseObj.overallPositive || "本案規劃方向符合機關業務推動目標，惟部分執行細節、風險應變與經費結構尚有待補強之處，逐項說明如下：")}</p>`;
      bodyHtml += `<div class="report-section-heading">貳、逐項書面審查意見</div>`;

      findings.forEach((f, idx) => {
        bodyHtml += `
          <div class="report-finding-block">
            <div class="report-finding-title">${idx + 1}. 【${formatBoldMarkup(f.title)}】</div>
            <p class="report-finding-text"><strong>審查意見：</strong>${formatBoldMarkup(f.opinion)}</p>
            <p class="report-finding-note"><strong>備註：</strong>${formatBoldMarkup(f.note)}</p>
          </div>
        `;
      });
    }

    // Optional Vendor Scoring & Rank Summary if Proposal mode has vendors
    let scoringHtml = "";
    if (caseObj.mode === "proposal" && caseObj.vendors && caseObj.vendors.length > 0) {
      const crits = window.GOV_REVIEW_DATA.defaultScoringCriteria;
      const ranked = computeVendorRankings(caseObj.vendors, crits);
      scoringHtml = `
        <div class="report-section-heading">參、評選評分與序位試算參考表</div>
        <table style="width:100%; border-collapse:collapse; font-size:0.84rem; margin-bottom:18px;">
          <thead>
            <tr style="background:#e2e8f0; color:#0f172a;">
              <th style="padding:7px 8px; text-align:left;">投標廠商</th>
              ${crits.map((c) => `<th style="padding:7px 6px; text-align:center;">${c.name.slice(0, 6)}<br><small>(${c.maxScore}%)</small></th>`).join("")}
              <th style="padding:7px 8px; text-align:center;">加總分數</th>
              <th style="padding:7px 8px; text-align:center;">序位</th>
            </tr>
          </thead>
          <tbody>
            ${ranked
              .map(
                (r) => `
              <tr style="border-bottom:1px solid #cbd5e1;">
                <td style="padding:7px 8px; font-weight:700;">${r.name}</td>
                ${crits.map((c) => `<td style="padding:7px 6px; text-align:center;">${r.scores[c.id] || 0}</td>`).join("")}
                <td style="padding:7px 8px; text-align:center; font-weight:800;">${r.total}</td>
                <td style="padding:7px 8px; text-align:center; font-weight:800; color:#0284c7;">第 ${r.rank} 序位</td>
              </tr>
            `
              )
              .join("")}
          </tbody>
        </table>
      `;
    }

    return `
      <div class="report-paper-preview" id="reportPaperRoot">
        <h1>${formatBoldMarkup(caseObj.agencyName || "政府機關")}　${modeInfo.shortName}意見表</h1>
        <div class="report-doc-sub">${formatBoldMarkup(caseObj.projectName || "未命名專案")}（案號：${formatBoldMarkup(caseObj.caseNumber || "—")}）</div>

        <div class="report-meta-grid">
          <div><strong>審查對象：</strong>${formatBoldMarkup(caseObj.targetVendor || "—")}</div>
          <div><strong>審查日期：</strong>${formatBoldMarkup(caseObj.reviewDate || "—")}</div>
          <div><strong>預算金額：</strong>${formatCurrency(caseObj.budgetAmount)}</div>
          <div><strong>審查頁碼範圍：</strong>${formatBoldMarkup(caseObj.pageRange || "全文")}</div>
        </div>

        ${bodyHtml}
        ${scoringHtml}

        <div class="report-conclusion-box">
          <div style="font-weight:800; font-size:0.96rem; margin-bottom:6px;">審查結論標記：${conclusionCheck}</div>
          <div style="font-size:0.88rem; color:#1e293b;"><strong>修正方向／議約前應承諾事項：</strong>${formatBoldMarkup(caseObj.conclusionNote || "請依上述審查意見補充具體佐證並列入契約附件或議約承諾事項。")}</div>
        </div>

        <div class="report-sign-row">
          <div>審查委員簽名：${caseObj.reviewerName ? formatBoldMarkup(caseObj.reviewerName) : "＿＿＿＿＿＿＿＿＿＿＿＿"}</div>
          <div>日期：${formatBoldMarkup(caseObj.reviewDate || "＿＿＿＿年＿＿月＿＿日")}</div>
        </div>
      </div>
    `;
  }

  // 4. Plain Text / Markdown Export
  function renderPlainText(caseObj) {
    const modeInfo = window.GOV_REVIEW_DATA.reviewModes[caseObj.mode] || window.GOV_REVIEW_DATA.reviewModes.proposal;
    const fmt = caseObj.outputFormat || modeInfo.defaultOutputFormat;
    const conclusionCheck = {
      feasible: "■可行　□修正後可行　□不可行",
      conditional: "□可行　■修正後可行　□不可行",
      infeasible: "□可行　□修正後可行　■不可行"
    }[caseObj.conclusion || "conditional"];

    const lines = [];
    lines.push(`${caseObj.agencyName || "政府機關"} ${modeInfo.shortName}意見表`);
    lines.push(`計畫／採購案名稱：${caseObj.projectName || ""}`);
    lines.push(`案號：${caseObj.caseNumber || ""}　　審查日期：${caseObj.reviewDate || ""}`);
    lines.push(`審查對象：${caseObj.targetVendor || ""}　　預算金額：${formatCurrency(caseObj.budgetAmount)}　　頁碼範圍：${caseObj.pageRange || "全文"}`);
    lines.push("");

    if (fmt === "rfp_diff" || caseObj.mode === "rfp") {
      lines.push("壹、整體意見");
      lines.push(caseObj.overallPositive || "");
      lines.push("");
      lines.push("貳、招標文件修正前後對照");
      (caseObj.rfpDiffs || []).forEach((d, idx) => {
        lines.push(`${idx + 1}. 【${d.title}】（位置：${d.location}）`);
        lines.push(`修正前：${d.beforeText}`);
        lines.push(`修正後：${d.afterText}`);
        lines.push(`理由：${d.reason}`);
        lines.push("");
      });
    } else if (fmt === "oral") {
      lines.push("壹、整體意見");
      lines.push(`${caseObj.overallPositive || ""}`);
      lines.push(`以下 ${(caseObj.findings || []).length} 項請廠商說明：`);
      lines.push("");
      (caseObj.findings || []).forEach((f, idx) => {
        const chNum = CH_NUMS[idx] || idx + 1;
        lines.push(`${chNum}、【${f.title}】`);
        lines.push(`審查意見：${f.opinion}`);
        lines.push(`請廠商說明：`);
        (f.questions || []).forEach((q, qi) => {
          lines.push(`${qi + 1}. ${q}`);
        });
        lines.push("");
      });
    } else {
      lines.push("壹、整體意見");
      lines.push(caseObj.overallPositive || "");
      lines.push("");
      lines.push("貳、逐項審查意見");
      (caseObj.findings || []).forEach((f, idx) => {
        lines.push(`${idx + 1}. 【${f.title}】`);
        lines.push(`審查意見：${f.opinion}`);
        lines.push(`備註：${f.note}`);
        lines.push("");
      });
    }

    lines.push(`審查結論：${conclusionCheck}`);
    lines.push(`修正方向或議約承諾事項：${caseObj.conclusionNote || ""}`);
    lines.push("");
    lines.push(`審查委員簽名：${caseObj.reviewerName || "＿＿＿＿＿＿＿＿"}　　日期：${caseObj.reviewDate || ""}`);
    return lines.join("\n");
  }

  // 5. Export Word Document (.doc / Word HTML compatible without ANY paragraph border lines per SKILL.md)
  // SKILL.md rule: "不要用段落框線做分隔線（Word中難編輯、刪不掉），改用字級、粗細、留白分層"
  function exportWordDocument(caseObj) {
    const modeInfo = window.GOV_REVIEW_DATA.reviewModes[caseObj.mode] || window.GOV_REVIEW_DATA.reviewModes.proposal;
    const fmt = caseObj.outputFormat || modeInfo.defaultOutputFormat;
    const conclusionCheck = {
      feasible: "■可行　　□修正後可行　　□不可行",
      conditional: "□可行　　■修正後可行　　□不可行",
      infeasible: "□可行　　□修正後可行　　■不可行"
    }[caseObj.conclusion || "conditional"];

    let itemsHtml = "";
    if (fmt === "rfp_diff" || caseObj.mode === "rfp") {
      (caseObj.rfpDiffs || []).forEach((d, idx) => {
        itemsHtml += `
          <p style="font-size:12pt; font-weight:bold; margin-top:14pt; margin-bottom:4pt;">${idx + 1}. 【${formatBoldMarkup(d.title)}】（${formatBoldMarkup(d.location)}）</p>
          <p style="font-size:11pt; margin-top:0; margin-bottom:4pt;"><b>修正前：</b>${formatBoldMarkup(d.beforeText)}</p>
          <p style="font-size:11pt; margin-top:0; margin-bottom:4pt;"><b>修正後：</b>${formatBoldMarkup(d.afterText)}</p>
          <p style="font-size:10.5pt; color:#333333; margin-top:0; margin-bottom:10pt;"><b>理由：</b>${formatBoldMarkup(d.reason)}</p>
        `;
      });
    } else if (fmt === "oral") {
      (caseObj.findings || []).forEach((f, idx) => {
        const chNum = CH_NUMS[idx] || idx + 1;
        const qs = (f.questions || []).map((q, qi) => `<p style="font-size:11pt; margin:2pt 0 2pt 18pt;">${qi + 1}. ${formatBoldMarkup(q)}</p>`).join("");
        itemsHtml += `
          <p style="font-size:12pt; font-weight:bold; margin-top:14pt; margin-bottom:4pt;">${chNum}、【${formatBoldMarkup(f.title)}】</p>
          <p style="font-size:11pt; margin-top:0; margin-bottom:4pt;"><b>審查意見：</b>${formatBoldMarkup(f.opinion)}</p>
          <p style="font-size:11pt; font-weight:bold; margin-top:2pt; margin-bottom:2pt;">請廠商說明：</p>
          ${qs}
        `;
      });
    } else {
      (caseObj.findings || []).forEach((f, idx) => {
        itemsHtml += `
          <p style="font-size:12pt; font-weight:bold; margin-top:14pt; margin-bottom:4pt;">${idx + 1}. 【${formatBoldMarkup(f.title)}】</p>
          <p style="font-size:11pt; margin-top:0; margin-bottom:4pt;"><b>審查意見：</b>${formatBoldMarkup(f.opinion)}</p>
          <p style="font-size:10.5pt; color:#222222; margin-top:0; margin-bottom:10pt;"><b>備註：</b>${formatBoldMarkup(f.note)}</p>
        `;
      });
    }

    // Notice: Zero border attributes on any <p> or <div> elements! Strictly hierarchy via font-size, bold, and margin spacing.
    const wordHtml = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
<head>
<meta charset="utf-8">
<title>${caseObj.projectName || "審查意見表"}</title>
<style>
  @page { size: A4; margin: 2.2cm 2.2cm 2.2cm 2.2cm; }
  body { font-family: "標楷體", "DFKai-SB", "PMingLiU", "Microsoft JhengHei", serif; line-height: 1.55; color: #000000; }
  p { border: none; }
</style>
</head>
<body>
  <p style="font-size:16pt; font-weight:bold; text-align:center; margin-bottom:4pt;">${formatBoldMarkup(caseObj.agencyName || "政府機關")}　${modeInfo.shortName}意見表</p>
  <p style="font-size:13pt; font-weight:bold; text-align:center; margin-top:0; margin-bottom:16pt;">${formatBoldMarkup(caseObj.projectName || "")}</p>

  <p style="font-size:11pt; margin:2pt 0;"><b>案號：</b>${formatBoldMarkup(caseObj.caseNumber || "—")}　　<b>審查日期：</b>${formatBoldMarkup(caseObj.reviewDate || "—")}</p>
  <p style="font-size:11pt; margin:2pt 0 16pt 0;"><b>審查對象：</b>${formatBoldMarkup(caseObj.targetVendor || "—")}　　<b>預算金額：</b>${formatCurrency(caseObj.budgetAmount)}　　<b>頁碼範圍：</b>${formatBoldMarkup(caseObj.pageRange || "全文")}</p>

  <p style="font-size:13pt; font-weight:bold; margin-top:16pt; margin-bottom:6pt;">壹、整體審查意見</p>
  <p style="font-size:11pt; margin-top:0; margin-bottom:14pt;">${formatBoldMarkup(caseObj.overallPositive || "")}${fmt === "oral" ? `<br><b>以下歸納 ${(caseObj.findings || []).length} 項核心問題，請廠商說明：</b>` : ""}</p>

  <p style="font-size:13pt; font-weight:bold; margin-top:16pt; margin-bottom:6pt;">貳、審查意見明細</p>
  ${itemsHtml}

  <p style="font-size:13pt; font-weight:bold; margin-top:20pt; margin-bottom:6pt;">參、審查結論</p>
  <p style="font-size:11.5pt; font-weight:bold; margin-top:0; margin-bottom:6pt;">${conclusionCheck}</p>
  <p style="font-size:11pt; margin-top:0; margin-bottom:24pt;"><b>修正方向或議約前應承諾事項：</b>${formatBoldMarkup(caseObj.conclusionNote || "")}</p>

  <p style="font-size:12pt; font-weight:bold; margin-top:28pt;">審查委員簽名：${caseObj.reviewerName || "＿＿＿＿＿＿＿＿＿＿＿＿"}　　　　日期：${caseObj.reviewDate || "＿＿＿＿年＿＿月＿＿日"}</p>
</body>
</html>`;

    const blob = new Blob(["\ufeff", wordHtml], { type: "application/msword;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const safeName = (caseObj.projectName || "審查意見表").replace(/[\\/:*?"<>|]/g, "_").slice(0, 40);
    a.href = url;
    a.download = `${safeName}_審查意見.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return {
    formatCurrency,
    computeVendorRankings,
    buildSkillPrompt,
    parseAiResponseToCase,
    renderReportHtml,
    renderPlainText,
    exportWordDocument
  };
})();
