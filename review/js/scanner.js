// GovIT Review Studio - Document Trap Scanner, Arithmetic Verifier, Scan Loupe & Linter

window.GovScanner = (function () {
  // 1. Deep Logic & Compliance Trap Scanner
  function scanDocumentTraps(text) {
    if (!text || !text.trim()) return [];
    const results = [];
    const rules = (window.GOV_REVIEW_DATA && window.GOV_REVIEW_DATA.trapRules) || [];

    rules.forEach((rule) => {
      const regex = new RegExp(rule.regex.source, rule.regex.flags);
      const matches = [];
      let m;
      while ((m = regex.exec(text)) !== null) {
        const idx = m.index;
        const start = Math.max(0, idx - 28);
        const end = Math.min(text.length, idx + m[0].length + 36);
        const snippet = text.slice(start, end).replace(/\s+/g, " ");
        matches.push({ matchText: m[0], snippet: (start > 0 ? "…" : "") + snippet + (end < text.length ? "…" : "") });
        if (matches.length >= 4) break;
      }
      if (matches.length > 0) {
        results.push({
          id: rule.id,
          title: rule.title,
          category: rule.category,
          severity: rule.severity,
          explanation: rule.explanation,
          suggestedTitle: rule.suggestedTitle,
          suggestedQuestion: rule.suggestedQuestion,
          matches
        });
      }
    });

    // Dynamic Check: End-of-Support (EOS/EOL) Operating Systems / Databases / Kernels
    const eosRegex = /(Windows\s*Server\s*(2003|2008|2012)|CentOS\s*[678]|Kernel\s*[234]\.\d+|SQL\s*Server\s*(2008|2012|2014)|PHP\s*[57]\.\d|Ubuntu\s*(14|16|18)\.04)/gi;
    const eosMatches = [];
    let em;
    while ((em = eosRegex.exec(text)) !== null) {
      const start = Math.max(0, em.index - 24);
      const end = Math.min(text.length, em.index + em[0].length + 28);
      eosMatches.push({ matchText: em[0], snippet: "…" + text.slice(start, end).replace(/\s+/g, " ") + "…" });
    }
    if (eosMatches.length > 0) {
      results.push({
        id: "trap_eos_version",
        title: "偵測到已停止原廠支援（EOS/EOL）之軟硬體或核心版本",
        category: "D. 端到端資料鏈 / 8. 法規與合規",
        severity: "high",
        explanation: "文件出現已停止原廠安全更新支援（EOS/EOL）之作業系統、核心或資料庫版本，將導致無法取得資安修補，違反資通安全管理法規範。",
        suggestedTitle: "系統環境採用已停止原廠支援（EOS）之軟硬體版本，具嚴重資安合規風險",
        suggestedQuestion: "針對內文所列已停止原廠支援（EOS）之軟硬體版本，是否承諾無償升級至仍在主流支援期內之長期支援版本（LTS）？",
        matches: eosMatches
      });
    }

    // Dynamic Check: Dual calendar unit conflict (日曆天 vs 工作天 / 決標日 vs 簽約日)
    const hasCalendarDay = /日曆天/.test(text);
    const hasWorkDay = /工作天/.test(text);
    const hasAwardDate = /決標(次)?日/.test(text);
    const hasSignDate = /簽約(次)?日/.test(text);
    if ((hasCalendarDay && hasWorkDay) || (hasAwardDate && hasSignDate)) {
      const conflictDesc = [];
      if (hasCalendarDay && hasWorkDay) conflictDesc.push("同時出現「日曆天」與「工作天」");
      if (hasAwardDate && hasSignDate) conflictDesc.push("同時出現「決標日」與「簽約日」作為起算基準");
      results.push({
        id: "trap_date_unit_conflict",
        title: "文件內部工期起算點或計算單位前後不一致（" + conflictDesc.join("、") + "）",
        category: "7. 文件內部一致性",
        severity: "high",
        explanation: "同一份文件混用「日曆天／工作天」或「決標日／簽約日」，極易造成履約期限認定爭議或驗收計罰糾紛。",
        suggestedTitle: "履約期程之起算基準日與工期計算單位前後矛盾",
        suggestedQuestion: "文件內同時出現不同之工期起算點或日數單位，請確認是否統一以招標文件規定之起算日與日曆天為準？",
        matches: [{ matchText: conflictDesc.join(" / "), snippet: "全文交叉檢核發現：" + conflictDesc.join("；") }]
      });
    }

    return results;
  }

  // 2. Arithmetic & Budget Structure Verifier
  function verifyBudgetTable(items, budgetCeiling) {
    const rowReports = [];
    let calcTotal = 0;
    let quotedTotal = 0;
    let lumpSumTotal = 0;
    let mismatchCount = 0;
    let categoryWarnCount = 0;

    (items || []).forEach((item, idx) => {
      const unitPrice = Number(item.unitPrice) || 0;
      const qty = Number(item.qty) || 0;
      const expected = Math.round(unitPrice * qty);
      const quoted = Number(item.quotedSubtotal) || 0;
      const diff = quoted - expected;

      calcTotal += expected;
      quotedTotal += quoted;

      const isLumpSum = /(1\s*式|一式|式)/.test(String(item.unit || "")) && quoted >= 500000;
      if (isLumpSum) lumpSumTotal += quoted;

      const isHardwareInSoftwareCat =
        /(硬體|伺服器|閘道器|主機|平板|攝影機|交換器|邊緣盒|設備)/.test(String(item.name || "")) &&
        /(軟體|維護|資料處理)/.test(String(item.category || ""));

      const warnings = [];
      let status = "ok";

      if (diff !== 0) {
        status = "error";
        mismatchCount++;
        warnings.push(`算術不符：單價(${unitPrice.toLocaleString()}) × 數量(${qty}) 應為 ${expected.toLocaleString()} 元，表列小計為 ${quoted.toLocaleString()} 元（差額 ${diff > 0 ? "+" : ""}${diff.toLocaleString()} 元）`);
      }
      if (isLumpSum) {
        if (status === "ok") status = "warn";
        warnings.push(`籠統報價：金額達 ${quoted.toLocaleString()} 元卻僅列「${item.unit}」，未拆列模組或人月明細`);
      }
      if (isHardwareInSoftwareCat) {
        if (status === "ok") status = "warn";
        categoryWarnCount++;
        warnings.push(`科目不符疑慮：項目含硬體設備卻編列於「${item.category}」科目`);
      }

      rowReports.push({
        index: idx + 1,
        item,
        expected,
        quoted,
        diff,
        status,
        warnings
      });
    });

    const summaryAlerts = [];
    const ceiling = Number(budgetCeiling) || 0;

    if (mismatchCount > 0) {
      summaryAlerts.push({
        type: "error",
        text: `發現 ${mismatchCount} 項「單價 × 數量 ≠ 表列小計」算術錯誤！實際驗算總計應為 ${calcTotal.toLocaleString()} 元，表列加總為 ${quotedTotal.toLocaleString()} 元（總差額 ${(quotedTotal - calcTotal).toLocaleString()} 元）。`
      });
    }

    if (ceiling > 0 && quotedTotal > 0) {
      const ratio = (quotedTotal / ceiling) * 100;
      if (quotedTotal > ceiling) {
        summaryAlerts.push({
          type: "error",
          text: `報價總計（${quotedTotal.toLocaleString()} 元）超出預算上限（${ceiling.toLocaleString()} 元）達 ${(quotedTotal - ceiling).toLocaleString()} 元！`
        });
      } else if (ratio >= 99.0) {
        summaryAlerts.push({
          type: "warn",
          text: `總報價占預算上限高達 ${ratio.toFixed(2)}%（幾乎貼齊預算上限），請檢視是否缺乏議價緩衝或將免費承諾成本轉嫁至其他項目。`
        });
      }
    }

    if (quotedTotal > 0 && lumpSumTotal / quotedTotal >= 0.4) {
      summaryAlerts.push({
        type: "warn",
        text: `以「1式」籠統編列之金額占總報價達 ${Math.round((lumpSumTotal / quotedTotal) * 100)}%（共 ${lumpSumTotal.toLocaleString()} 元），建議要求拆列功能模組與各級人月單價。`
      });
    }

    if (categoryWarnCount > 0) {
      summaryAlerts.push({
        type: "warn",
        text: `發現 ${categoryWarnCount} 項疑似「硬體設備編列於經常門／軟體維護科目」之預算科目錯置問題。`
      });
    }

    return {
      rowReports,
      calcTotal,
      quotedTotal,
      lumpSumTotal,
      mismatchCount,
      summaryAlerts
    };
  }

  // Parse pasted text lines into budget items
  function parseBudgetLines(rawText) {
    if (!rawText || !rawText.trim()) return [];
    const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    const parsed = [];
    lines.forEach((line, idx) => {
      // Support tab, comma, or multi-space separated: 名稱 | 科目 | 單價 | 數量 | 單位 | 小計
      const parts = line.split(/\t|,|\s{2,}/).map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 3) {
        const nums = parts
          .map((p) => ({ raw: p, val: Number(p.replace(/[,$元NT\s]/g, "")) }))
          .filter((x) => !Number.isNaN(x.val) && /\d/.test(x.raw));
        if (nums.length >= 2) {
          const name = parts[0];
          const unitPrice = nums[0].val;
          const qty = nums.length >= 3 ? nums[1].val : 1;
          const quotedSubtotal = nums.length >= 3 ? nums[2].val : unitPrice * qty;
          const unitMatch = line.match(/(1式|一式|式|台|套|場|人月|年|季|項)/);
          parsed.push({
            id: "b_imp_" + Date.now() + "_" + idx,
            name: name || `報價項目 ${idx + 1}`,
            category: parts.length >= 5 ? parts[1] : "資訊服務費",
            unitPrice,
            qty,
            unit: unitMatch ? unitMatch[1] : "項",
            quotedSubtotal,
            paymentStage: ""
          });
        }
      }
    });
    return parsed;
  }

  // 3. Real-time SKILL.md Rule & Tone Linter for Findings
  function lintFindingCard(finding) {
    const badges = [];
    const title = (finding.title || "").trim();
    const opinion = (finding.opinion || "").trim();
    const note = (finding.note || "").trim();
    const pages = (finding.pages || "").trim();

    // Check 1: Title is conclusion, not vague
    if (!title) {
      badges.push({ level: "err", text: "缺少標題" });
    } else if (/^(待改善事項|建議事項|其他意見|系統問題|期程問題|經費問題|請補充)$/.test(title) || title.length < 8) {
      badges.push({ level: "warn", text: "標題宜直接寫出結論（避免空泛標題）" });
    } else {
      badges.push({ level: "ok", text: "標題具結論性" });
    }

    // Check 2: Page Reference
    if (pages || /(P\.\s*\d+|第\s*\d+\s*頁)/i.test(opinion) || /(P\.\s*\d+|第\s*\d+\s*頁)/i.test(note)) {
      badges.push({ level: "ok", text: "已標註頁碼" });
    } else {
      badges.push({ level: "warn", text: "建議標註參考頁碼 (如 P.45-52)" });
    }

    // Check 3: Verifiable Advice in Note
    if (/請再加強|請多注意|請妥善處理/.test(note) && note.length < 25) {
      badges.push({ level: "warn", text: "備註建議宜具體到「可驗收」（如附測試案例/SOP/對照表）" });
    } else if (note.length >= 15) {
      badges.push({ level: "ok", text: "具備判斷依據與具體建議" });
    } else {
      badges.push({ level: "warn", text: "備註請補充判斷依據與可驗收建議" });
    }

    // Check 4: Professional Neutral Tone
    if (/(太爛|敷衍|毫無誠意|亂寫|欺騙|胡扯)/.test(opinion + note + title)) {
      badges.push({ level: "err", text: "偵測到主觀情緒字眼，請改用「建請補充／請說明／請廠商承諾」" });
    }

    return badges;
  }

  // 4. Scanned Photo Loupe & Left/Right Page Splitter Controller
  const scanState = {
    img: null,
    rotation: 0, // 0, 90, 180, 270
    splitMode: "full", // "full" | "left" | "right"
    zoom: 100,
    highContrast: false
  };

  function loadScanImage(file, canvasEl, statusEl) {
    if (!file || !canvasEl) return;
    const reader = new FileReader();
    reader.onload = function (e) {
      const img = new Image();
      img.onload = function () {
        scanState.img = img;
        scanState.rotation = 0;
        scanState.splitMode = "full";
        scanState.zoom = 100;
        renderScanCanvas(canvasEl, statusEl);
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  }

  function renderScanCanvas(canvasEl, statusEl) {
    if (!canvasEl || !scanState.img) return;
    const ctx = canvasEl.getContext("2d");
    const img = scanState.img;

    // First draw rotated full image on an offscreen canvas
    const off = document.createElement("canvas");
    const rot = ((scanState.rotation % 360) + 360) % 360;
    if (rot === 90 || rot === 270) {
      off.width = img.height;
      off.height = img.width;
    } else {
      off.width = img.width;
      off.height = img.height;
    }
    const offCtx = off.getContext("2d");
    offCtx.save();
    offCtx.translate(off.width / 2, off.height / 2);
    offCtx.rotate((rot * Math.PI) / 180);
    offCtx.drawImage(img, -img.width / 2, -img.height / 2);
    offCtx.restore();

    // Now crop based on splitMode (full / left half / right half)
    let sx = 0;
    let sy = 0;
    let sw = off.width;
    let sh = off.height;
    if (scanState.splitMode === "left") {
      sw = Math.floor(off.width / 2);
    } else if (scanState.splitMode === "right") {
      sx = Math.floor(off.width / 2);
      sw = off.width - sx;
    }

    canvasEl.width = sw;
    canvasEl.height = sh;
    ctx.filter = scanState.highContrast ? "grayscale(100%) contrast(185%) brightness(105%)" : "none";
    ctx.drawImage(off, sx, sy, sw, sh, 0, 0, sw, sh);
    canvasEl.style.width = Math.round((sw * scanState.zoom) / 100) + "px";

    if (statusEl) {
      const modeName = scanState.splitMode === "full" ? "全頁檢視" : scanState.splitMode === "left" ? "左半頁切頁" : "右半頁切頁";
      statusEl.textContent = `${modeName}｜旋轉 ${rot}°｜縮放 ${scanState.zoom}%${scanState.highContrast ? "｜高對比強化" : ""}`;
    }
  }

  return {
    scanDocumentTraps,
    verifyBudgetTable,
    parseBudgetLines,
    lintFindingCard,
    scanState,
    loadScanImage,
    renderScanCanvas
  };
})();
