// EarFlow 核心互動訓練系統 (iPad / iPhone 觸控與語音最佳化 · 3分鐘單元與預選教材庫)

(function () {
  const STORAGE_KEYS = {
    CUSTOM_UNITS: "earflow_custom_units_v2",
    SAVED_LINES: "earflow_saved_lines_v2",
    STATS: "earflow_stats_v2",
    THEME: "earflow_theme_v1",
    GEMINI_KEY: "earflow_gemini_key_v1"
  };

  const state = {
    units: [],
    currentCategory: "all",
    currentUnitId: "meet-01",
    currentStage: 1, // 1: 盲聽, 2: 聽音補洞, 3: 連音解剖, 4: 跟讀錄音
    playbackRate: 1.0,
    accentPref: "en-US",
    selectedVoiceURI: "",
    availableVoices: [],
    isPlaying: false,
    loopMode: "unit", // "off" | "sentence" | "unit" | "trispeed"
    activeLineIndex: 0,
    abSelection: new Set(),
    clozeState: {}, // { "lineIdx-slotIdx": { filled: string, correct: boolean } }
    activeClozeSlot: null, // { lineIdx, slotIdx }
    savedLines: [], // starred difficult sentences
    stats: {
      todayMinutes: 0,
      completedUnits: 0,
      streakDays: 1,
      lastDate: new Date().toISOString().slice(0, 10),
      compScores: {}
    },
    mediaRecorder: null,
    recordingLineIdx: null,
    recordedBlobs: {},
    speechScores: {}
  };

  let synthTimer = null;
  let playSessionId = 0;

  function init() {
    loadPersistedState();
    rebuildUnitsList();
    initTheme();
    initSpeechSynthesis();
    bindGlobalEvents();
    renderCategories();
    renderUnitList();
    renderCurrentUnit();
    renderPrecuratedSources();
    updateStatsUI();
    initAudioABPlayer();
  }

  function loadPersistedState() {
    try {
      const savedStats = JSON.parse(localStorage.getItem(STORAGE_KEYS.STATS) || "null");
      if (savedStats) {
        const today = new Date().toISOString().slice(0, 10);
        if (savedStats.lastDate !== today) {
          const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
          savedStats.streakDays = savedStats.lastDate === yesterday ? (savedStats.streakDays || 1) + 1 : 1;
          savedStats.todayMinutes = 0;
          savedStats.lastDate = today;
        }
        state.stats = Object.assign(state.stats, savedStats);
      }
      const savedLines = JSON.parse(localStorage.getItem(STORAGE_KEYS.SAVED_LINES) || "[]");
      if (Array.isArray(savedLines)) state.savedLines = savedLines;
    } catch (e) {
      console.warn("Load state error:", e);
    }
  }

  function saveStats() {
    try {
      localStorage.setItem(STORAGE_KEYS.STATS, JSON.stringify(state.stats));
    } catch (e) {}
  }

  function getCustomUnits() {
    try {
      return JSON.parse(localStorage.getItem(STORAGE_KEYS.CUSTOM_UNITS) || "[]");
    } catch (e) {
      return [];
    }
  }

  function saveCustomUnits(customUnits) {
    try {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_UNITS, JSON.stringify(customUnits));
    } catch (e) {}
  }

  function rebuildUnitsList() {
    const customUnits = getCustomUnits();
    const baseUnits = window.EARFLOW_DEFAULT_UNITS || [];
    const list = [...customUnits, ...baseUnits];

    if (state.savedLines.length > 0) {
      const estMins = Math.max(1, Math.round((state.savedLines.length / 8) * 3));
      list.unshift({
        id: "starred-review",
        category: "custom",
        categoryName: "⭐ 自選來源 / 收藏",
        title: `★ 聽力弱點收藏特訓 (${state.savedLines.length} 句)`,
        focus: "集中循環您標記「聽不清楚」的會議與日常連音句子",
        duration: `約 ${estMins} 分鐘 · ${state.savedLines.length} 句`,
        lines: state.savedLines
      });
    }

    state.units = list;
    if (!state.units.some((u) => u.id === state.currentUnitId) && state.units.length > 0) {
      state.currentUnitId = state.units[0].id;
    }
  }

  function initTheme() {
    const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME) || "dark";
    if (savedTheme === "light") {
      document.body.classList.add("theme-light");
    }
  }

  function toggleTheme() {
    const isLight = document.body.classList.toggle("theme-light");
    localStorage.setItem(STORAGE_KEYS.THEME, isLight ? "light" : "dark");
  }

  function initSpeechSynthesis() {
    if (!("speechSynthesis" in window)) return;

    function populateVoices() {
      const allVoices = window.speechSynthesis.getVoices() || [];
      const enVoices = allVoices.filter((v) => /^en(-|_|$)/i.test(v.lang));
      enVoices.sort((a, b) => {
        const score = (v) => {
          let s = 0;
          if (/enhanced|premium|natural|neural|siri/i.test(v.name)) s += 50;
          if (/Ava|Samantha|Alex|Allison|Aaron|Nicky|Daniel|Karen|Moira|Google US/i.test(v.name)) s += 30;
          if (v.lang.includes("US")) s += 10;
          return s;
        };
        return score(b) - score(a);
      });
      state.availableVoices = enVoices;
      renderVoiceSelector();
    }

    populateVoices();
    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = populateVoices;
    }
  }

  function renderVoiceSelector() {
    const select = document.getElementById("voiceSelect");
    if (!select) return;
    select.innerHTML = `<option value="">系統最佳母語發音 (自動雙人對話)</option>`;
    state.availableVoices.slice(0, 18).forEach((v) => {
      const opt = document.createElement("option");
      opt.value = v.voiceURI;
      opt.textContent = `${v.name} (${v.lang})`;
      if (state.selectedVoiceURI === v.voiceURI) opt.selected = true;
      select.appendChild(opt);
    });
  }

  function pickVoiceForSpeaker(speaker) {
    if (!state.availableVoices.length) return null;
    if (state.selectedVoiceURI) {
      const chosen = state.availableVoices.find((v) => v.voiceURI === state.selectedVoiceURI);
      if (chosen) return chosen;
    }
    const matchingAccent = state.availableVoices.filter((v) =>
      v.lang.toLowerCase().includes(state.accentPref.toLowerCase().slice(3))
    );
    const pool = matchingAccent.length > 0 ? matchingAccent : state.availableVoices;
    if (speaker === "B" && pool.length > 1) {
      return pool[1];
    }
    return pool[0];
  }

  function stopPlayback() {
    playSessionId++;
    state.isPlaying = false;
    if (synthTimer) {
      clearTimeout(synthTimer);
      synthTimer = null;
    }
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
    updatePlaybackUI();
  }

  function speakText(text, options = {}) {
    if (!("speechSynthesis" in window)) {
      alert("您的瀏覽器不支援內建語音合成，請使用 Safari 或 Chrome 開啟。");
      return;
    }
    window.speechSynthesis.cancel();
    const utter = new SpeechSynthesisUtterance(text);
    const voice = pickVoiceForSpeaker(options.speaker || "A");
    if (voice) {
      utter.voice = voice;
      utter.lang = voice.lang;
    } else {
      utter.lang = state.accentPref || "en-US";
    }
    utter.rate = options.rate || state.playbackRate;
    utter.pitch = options.speaker === "B" ? 0.94 : 1.03;

    utter.onend = () => {
      if (typeof options.onEnd === "function") options.onEnd();
    };
    utter.onerror = () => {
      if (typeof options.onEnd === "function") options.onEnd();
    };

    window.speechSynthesis.speak(utter);
  }

  function playLineAt(index, customRate, onComplete) {
    const unit = getCurrentUnit();
    if (!unit || !unit.lines[index]) return;
    state.activeLineIndex = index;
    highlightActiveSentenceCard();

    const line = unit.lines[index];
    speakText(line.en, {
      speaker: line.speaker,
      rate: customRate || state.playbackRate,
      onEnd: () => {
        if (typeof onComplete === "function") onComplete();
      }
    });
  }

  function startPlaybackSequence(startIdx = state.activeLineIndex) {
    const unit = getCurrentUnit();
    if (!unit || !unit.lines.length) return;

    stopPlayback();
    const mySession = ++playSessionId;
    state.isPlaying = true;
    state.activeLineIndex = startIdx;
    updatePlaybackUI();

    const abIndices = state.abSelection.size > 0
      ? Array.from(state.abSelection).sort((a, b) => a - b)
      : unit.lines.map((_, i) => i);

    let pointer = abIndices.indexOf(startIdx);
    if (pointer === -1) pointer = 0;

    function stepNext() {
      if (mySession !== playSessionId || !state.isPlaying) return;
      const lineIdx = abIndices[pointer];

      if (state.loopMode === "trispeed") {
        playLineAt(lineIdx, 1.0, () => {
          if (mySession !== playSessionId || !state.isPlaying) return;
          synthTimer = setTimeout(() => {
            playLineAt(lineIdx, 0.75, () => {
              if (mySession !== playSessionId || !state.isPlaying) return;
              synthTimer = setTimeout(() => {
                playLineAt(lineIdx, 1.0, () => {
                  advancePointer();
                });
              }, 450);
            });
          }, 400);
        });
      } else {
        playLineAt(lineIdx, state.playbackRate, () => {
          advancePointer();
        });
      }
    }

    function advancePointer() {
      if (mySession !== playSessionId || !state.isPlaying) return;

      if (state.loopMode === "sentence") {
        synthTimer = setTimeout(stepNext, 550);
        return;
      }

      pointer++;
      if (pointer < abIndices.length) {
        synthTimer = setTimeout(stepNext, 450);
      } else if (state.loopMode === "unit" || state.loopMode === "trispeed" || state.abSelection.size > 0) {
        addStudyMinuteCredit(1.0);
        pointer = 0;
        synthTimer = setTimeout(stepNext, 900);
      } else {
        addStudyMinuteCredit(1.0);
        state.isPlaying = false;
        updatePlaybackUI();
      }
    }

    stepNext();
  }

  function addStudyMinuteCredit(mins) {
    state.stats.todayMinutes = Math.round((state.stats.todayMinutes + mins) * 10) / 10;
    saveStats();
    updateStatsUI();
  }

  // --- Pre-Curated Authentic Sources Rendering ---
  function renderPrecuratedSources() {
    const grid = document.getElementById("precuratedSourcesGrid");
    if (!grid) return;
    const sources = window.EARFLOW_PRECURATED_SOURCES || [];
    grid.innerHTML = "";

    sources.forEach((src) => {
      const card = document.createElement("div");
      card.className = "source-item-card";
      card.innerHTML = `
        <div>
          <div class="source-brand-row">
            <span class="source-brand-tag">${escapeHtml(src.sourceBrand)}</span>
            <span class="source-badge">${escapeHtml(src.badge)}</span>
          </div>
          <h4 class="source-item-title">${escapeHtml(src.title)}</h4>
          <p class="source-item-desc">${escapeHtml(src.description)}</p>
        </div>
        <div class="source-item-footer">
          <button class="primary-btn" style="height:38px; padding:0 14px; font-size:0.82rem;" data-action="load-source" data-id="${escapeHtml(src.id)}">
            🎧 一鍵截取為訓練單元
          </button>
          <button class="secondary-btn" style="height:38px; padding:0 12px; font-size:0.78rem;" data-action="edit-source" data-id="${escapeHtml(src.id)}">
            ✏️ 檢視/編輯原文
          </button>
        </div>
      `;
      grid.appendChild(card);
    });

    grid.onclick = (e) => {
      const btn = e.target.closest("[data-action]");
      if (!btn) return;
      const srcId = btn.dataset.id;
      const srcObj = (window.EARFLOW_PRECURATED_SOURCES || []).find((s) => s.id === srcId);
      if (!srcObj) return;

      const sliceLen = Number(document.getElementById("sourceSliceLengthSelect")?.value || 8);

      if (btn.dataset.action === "load-source") {
        const units = window.EarFlowAnalyzer.sliceTextIntoMicroUnits(
          srcObj.rawScript,
          srcObj.title,
          sliceLen,
          srcObj.category || "custom",
          `📚 ${srcObj.sourceBrand}`
        );
        if (!units.length) return;
        units.forEach((u) => {
          u.focus = srcObj.description || u.focus;
        });
        const existingCustom = getCustomUnits();
        saveCustomUnits([...units, ...existingCustom]);
        rebuildUnitsList();
        state.currentCategory = "all";
        selectUnit(units[0].id);
        renderCategories();
        switchTopView("trainer");
      } else if (btn.dataset.action === "edit-source") {
        document.getElementById("customUnitTitleInput").value = srcObj.title;
        document.getElementById("rawMaterialInput").value = srcObj.rawScript;
        switchTopView("studio");
      }
    };
  }

  function switchTopView(viewName) {
    document.querySelectorAll(".view-tab").forEach((t) => {
      t.classList.toggle("active", t.dataset.view === viewName);
    });
    document.getElementById("trainerView").style.display = viewName === "trainer" ? "block" : "none";
    document.getElementById("sourcesView").classList.toggle("active", viewName === "sources");
    document.getElementById("studioView").classList.toggle("active", viewName === "studio");
  }

  function getCurrentUnit() {
    return state.units.find((u) => u.id === state.currentUnitId) || state.units[0];
  }

  function renderCategories() {
    const container = document.getElementById("categoryScroll");
    if (!container) return;
    container.innerHTML = "";
    (window.EARFLOW_CATEGORIES || []).forEach((cat) => {
      const btn = document.createElement("button");
      btn.className = `cat-pill ${state.currentCategory === cat.id ? "active" : ""}`;
      btn.textContent = cat.name;
      btn.onclick = () => {
        state.currentCategory = cat.id;
        renderCategories();
        renderUnitList();
      };
      container.appendChild(btn);
    });
  }

  function renderUnitList() {
    const container = document.getElementById("unitList");
    if (!container) return;
    container.innerHTML = "";

    const filtered = state.units.filter(
      (u) => state.currentCategory === "all" || u.category === state.currentCategory
    );

    filtered.forEach((unit) => {
      const card = document.createElement("div");
      card.className = `unit-card ${unit.id === state.currentUnitId ? "active" : ""}`;
      card.innerHTML = `
        <div class="unit-card-top">
          <span class="unit-tag">${escapeHtml(unit.categoryName)}</span>
          <span class="unit-duration">${escapeHtml(unit.duration)}</span>
        </div>
        <h4 class="unit-title">${escapeHtml(unit.title)}</h4>
        <p class="unit-desc">${escapeHtml(unit.focus)}</p>
      `;
      card.onclick = () => {
        selectUnit(unit.id);
        switchTopView("trainer");
        closeMobileSidebar();
      };
      container.appendChild(card);
    });
  }

  function selectUnit(unitId) {
    stopPlayback();
    state.currentUnitId = unitId;
    state.activeLineIndex = 0;
    state.abSelection.clear();
    state.clozeState = {};
    state.activeClozeSlot = null;
    renderUnitList();
    renderCurrentUnit();
  }

  function renderCurrentUnit() {
    const unit = getCurrentUnit();
    if (!unit) return;

    document.getElementById("unitCategoryBadge").textContent = unit.categoryName;
    document.getElementById("unitTitle").textContent = unit.title;
    document.getElementById("unitFocus").textContent = `🎯 破壁焦點（${unit.duration}）：${unit.focus}`;

    document.querySelectorAll(".step-btn").forEach((btn) => {
      const stg = Number(btn.dataset.stage);
      btn.classList.toggle("active", stg === state.currentStage);
    });

    const blindCard = document.getElementById("blindGuideCard");
    if (blindCard) {
      blindCard.style.display = state.currentStage === 1 ? "flex" : "none";
      const savedScore = state.stats.compScores[unit.id];
      blindCard.querySelectorAll(".comp-btn").forEach((b) => {
        b.classList.toggle("selected", b.dataset.score === savedScore);
      });
    }

    renderSentences(unit);
    updatePlaybackUI();
  }

  function renderSentences(unit) {
    const container = document.getElementById("sentencesContainer");
    if (!container) return;
    container.innerHTML = "";

    unit.lines.forEach((line, idx) => {
      const card = document.createElement("div");
      const isPlayingThis = state.activeLineIndex === idx;
      const isAB = state.abSelection.has(idx);
      const isSaved = state.savedLines.some((s) => s.en === line.en);

      card.className = `sentence-card ${isPlayingThis ? "playing" : ""} ${isAB ? "ab-selected" : ""}`;
      card.dataset.index = idx;

      const enHtml = buildSentenceEnHtml(line, idx);
      const clozeBankHtml = state.currentStage === 2 ? buildClozeBankHtml(line, idx) : "";
      const xrayHtml = state.currentStage >= 3 ? buildXrayHtml(line, idx) : "";
      const shadowHtml = state.currentStage === 4 ? buildShadowHtml(line, idx) : "";

      const zhHtml = state.currentStage >= 2
        ? `<p class="sentence-zh">${escapeHtml(line.zh)}</p>`
        : `<p class="sentence-zh" style="opacity:0.55">💡 盲聽階段：先不看文字聽過一遍，點擊上方模糊英文可暫時顯示單句</p>`;

      card.innerHTML = `
        <div class="sentence-header">
          <div class="speaker-badge">
            <span class="speaker-index">${idx + 1}</span>
            <span>Speaker ${escapeHtml(line.speaker || "A")}</span>
          </div>
          <div class="sentence-actions">
            <button class="mini-btn" data-action="play-once" data-idx="${idx}" title="單句播放">▶ 聽此句</button>
            <button class="mini-btn" data-action="play-slow" data-idx="${idx}" title="0.75x 慢速聽連音">🐢 0.75x</button>
            <button class="mini-btn ${state.loopMode === "sentence" && state.activeLineIndex === idx && state.isPlaying ? "active" : ""}" data-action="loop-line" data-idx="${idx}" title="單句無限循環">🔁 單句循環</button>
            <button class="mini-btn ${isAB ? "active" : ""}" data-action="toggle-ab" data-idx="${idx}" title="加入 AB 區間循環">AB</button>
            <button class="mini-btn ${isSaved ? "saved" : ""}" data-action="toggle-star" data-idx="${idx}" title="加入弱點收藏本">${isSaved ? "★ 已收藏" : "☆ 弱點"}</button>
          </div>
        </div>
        ${enHtml}
        ${zhHtml}
        ${clozeBankHtml}
        ${xrayHtml}
        ${shadowHtml}
      `;

      container.appendChild(card);
    });

    bindSentenceCardEvents(container, unit);
  }

  function buildSentenceEnHtml(line, lineIdx) {
    if (state.currentStage === 1) {
      return `<div class="sentence-en blind-blur" data-action="peek-blind" title="點擊暫時顯示原文">${escapeHtml(line.en)}</div>`;
    }

    if (state.currentStage === 2 && Array.isArray(line.cloze) && line.cloze.length > 0) {
      let html = escapeHtml(line.en);
      line.cloze.forEach((targetPhrase, slotIdx) => {
        const key = `${lineIdx}-${slotIdx}`;
        const slotData = state.clozeState[key];
        let slotClass = "cloze-slot";
        let label = "🔊 點聽填入語塊";
        if (slotData) {
          slotClass += slotData.correct ? " filled-correct" : " filled-wrong";
          label = escapeHtml(slotData.filled);
        }
        const safeRegex = new RegExp(`(${escapeRegExp(escapeHtml(targetPhrase))})`, "i");
        html = html.replace(
          safeRegex,
          `<span class="${slotClass}" data-action="cloze-slot" data-line="${lineIdx}" data-slot="${slotIdx}" data-answer="${escapeHtml(targetPhrase)}">${label}</span>`
        );
      });
      return `<div class="sentence-en">${html}</div>`;
    }

    const words = line.en.split(/\s+/).map((w) => {
      const cleanW = w.replace(/^[^a-zA-Z0-9']+|[^a-zA-Z0-9']+$/g, "");
      return `<span class="word-token" data-action="speak-word" data-word="${escapeHtml(cleanW)}">${escapeHtml(w)}</span>`;
    });
    return `<div class="sentence-en">${words.join(" ")}</div>`;
  }

  function buildClozeBankHtml(line, lineIdx) {
    const targets = Array.isArray(line.cloze) && line.cloze.length ? line.cloze : [];
    if (!targets.length) return "";

    const distractors = [
      "going to", "should have", "walk us through", "on the same page", "touch base",
      "sign off on", "right now", "at all", "sort it out", "look over"
    ].filter((d) => !targets.some((t) => t.toLowerCase() === d.toLowerCase()));

    const options = [...targets, distractors[lineIdx % distractors.length], distractors[(lineIdx + 3) % distractors.length]];
    const sortedOpts = options.sort((a, b) => a.localeCompare(b));

    const pills = sortedOpts.map((opt) => {
      const isUsedCorrectly = targets.some((t, sIdx) => {
        const st = state.clozeState[`${lineIdx}-${sIdx}`];
        return st && st.correct && st.filled.toLowerCase() === opt.toLowerCase();
      });
      return `<button class="cloze-pill-btn ${isUsedCorrectly ? "used" : ""}" data-action="pick-cloze-pill" data-line="${lineIdx}" data-val="${escapeHtml(opt)}">${escapeHtml(opt)}</button>`;
    }).join("");

    return `
      <div class="cloze-bank">
        <span class="cloze-bank-label">👆 聽音點選連音詞塊：</span>
        ${pills}
      </div>
    `;
  }

  function buildXrayHtml(line) {
    const chunksHtml = (line.chunks || []).map((c) => `
      <div class="chunk-pill" data-action="speak-chunk" data-phrase="${escapeHtml(c.orig)}" title="點擊單獨聽此連音語塊">
        <span class="chunk-orig">🔊 ${escapeHtml(c.orig)}</span>
        <span class="chunk-arrow">➔</span>
        <span class="chunk-sound">${escapeHtml(c.sound)}</span>
        <span class="chunk-tip">（${escapeHtml(c.tip)}）</span>
      </div>
    `).join("");

    return `
      <div class="xray-panel">
        <div class="xray-sound-row">
          <span class="xray-badge">👂 母語真實耳感</span>
          <span class="xray-ear-text">${escapeHtml(line.ear || line.en)}</span>
        </div>
        <div class="chunks-grid">${chunksHtml}</div>
      </div>
    `;
  }

  function buildShadowHtml(line, lineIdx) {
    const isRec = state.recordingLineIdx === lineIdx;
    const hasBlob = Boolean(state.recordedBlobs[lineIdx]);
    const scoreInfo = state.speechScores[lineIdx];

    return `
      <div class="shadow-box">
        <div class="shadow-controls">
          <button class="mini-btn" data-action="shadow-guide" data-idx="${lineIdx}">🎧 領讀跟讀 (原音➔留白)</button>
          <button class="rec-btn ${isRec ? "recording" : ""}" data-action="toggle-record" data-idx="${lineIdx}">
            ${isRec ? "⏹ 停止錄音" : "🎙️ 按下跟讀錄音"}
          </button>
          ${hasBlob ? `
            <button class="compare-btn" data-action="compare-voice" data-idx="${lineIdx}">
              🔄 原音 ➔ 我的錄音 連續比對
            </button>
          ` : ""}
        </div>
        <div class="speech-match-score">
          ${scoreInfo
            ? `語音辨識流暢度：<strong>${scoreInfo.score}%</strong>（聽到："${escapeHtml(scoreInfo.text)}"）`
            : "💡 在 iPad/iPhone 錄下自己的跟讀，一鍵與母語連音節奏直接比對"}
        </div>
      </div>
    `;
  }

  function bindSentenceCardEvents(container, unit) {
    container.onclick = (e) => {
      const target = e.target.closest("[data-action]");
      if (!target) return;
      const action = target.dataset.action;
      const idx = Number(target.dataset.idx);

      switch (action) {
        case "peek-blind":
          target.classList.toggle("peek");
          break;

        case "play-once":
          stopPlayback();
          playLineAt(idx, state.playbackRate);
          break;

        case "play-slow":
          stopPlayback();
          playLineAt(idx, 0.72);
          break;

        case "loop-line":
          if (state.isPlaying && state.loopMode === "sentence" && state.activeLineIndex === idx) {
            stopPlayback();
          } else {
            state.loopMode = "sentence";
            startPlaybackSequence(idx);
          }
          renderSentences(unit);
          break;

        case "toggle-ab":
          if (state.abSelection.has(idx)) {
            state.abSelection.delete(idx);
          } else {
            state.abSelection.add(idx);
          }
          renderSentences(unit);
          break;

        case "toggle-star":
          toggleStarSentence(unit.lines[idx]);
          renderSentences(unit);
          break;

        case "speak-word":
          if (target.dataset.word) {
            stopPlayback();
            speakText(target.dataset.word, { rate: 0.85 });
          }
          break;

        case "speak-chunk":
          if (target.dataset.phrase) {
            stopPlayback();
            speakText(target.dataset.phrase, { rate: 0.82 });
          }
          break;

        case "cloze-slot": {
          const lIdx = Number(target.dataset.line);
          const sIdx = Number(target.dataset.slot);
          state.activeClozeSlot = { lineIdx: lIdx, slotIdx: sIdx };
          stopPlayback();
          playLineAt(lIdx, 0.9);
          break;
        }

        case "pick-cloze-pill": {
          const lIdx = Number(target.dataset.line);
          const val = target.dataset.val;
          handleClozePillPick(unit, lIdx, val);
          break;
        }

        case "shadow-guide":
          runShadowGuide(idx);
          break;

        case "toggle-record":
          toggleMicrophoneRecording(unit, idx);
          break;

        case "compare-voice":
          compareNativeAndUserAudio(idx);
          break;
      }
    };
  }

  function handleClozePillPick(unit, lineIdx, pickedVal) {
    const line = unit.lines[lineIdx];
    if (!line || !Array.isArray(line.cloze)) return;

    let targetSlotIdx = 0;
    if (state.activeClozeSlot && state.activeClozeSlot.lineIdx === lineIdx) {
      targetSlotIdx = state.activeClozeSlot.slotIdx;
    } else {
      for (let i = 0; i < line.cloze.length; i++) {
        const st = state.clozeState[`${lineIdx}-${i}`];
        if (!st || !st.correct) {
          targetSlotIdx = i;
          break;
        }
      }
    }

    const answer = line.cloze[targetSlotIdx] || "";
    const isCorrect = answer.toLowerCase() === pickedVal.toLowerCase();
    state.clozeState[`${lineIdx}-${targetSlotIdx}`] = {
      filled: pickedVal,
      correct: isCorrect
    };

    speakText(pickedVal, { rate: 0.92 });
    renderSentences(unit);
  }

  function toggleStarSentence(lineObj) {
    const existingIdx = state.savedLines.findIndex((s) => s.en === lineObj.en);
    if (existingIdx >= 0) {
      state.savedLines.splice(existingIdx, 1);
    } else {
      state.savedLines.push(lineObj);
    }
    try {
      localStorage.setItem(STORAGE_KEYS.SAVED_LINES, JSON.stringify(state.savedLines));
    } catch (e) {}
    rebuildUnitsList();
    renderUnitList();
    updateStatsUI();
  }

  function runShadowGuide(lineIdx) {
    const unit = getCurrentUnit();
    if (!unit || !unit.lines[lineIdx]) return;
    stopPlayback();
    state.isPlaying = true;
    updatePlaybackUI();

    playLineAt(lineIdx, 0.92, () => {
      synthTimer = setTimeout(() => {
        playLineAt(lineIdx, 1.0, () => {
          state.isPlaying = false;
          updatePlaybackUI();
        });
      }, 3200);
    });
  }

  async function toggleMicrophoneRecording(unit, lineIdx) {
    if (state.recordingLineIdx === lineIdx && state.mediaRecorder) {
      state.mediaRecorder.stop();
      state.recordingLineIdx = null;
      renderSentences(unit);
      return;
    }

    stopPlayback();
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/mp4")
        ? "audio/mp4"
        : MediaRecorder.isTypeSupported("audio/webm")
        ? "audio/webm"
        : "";

      const recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream);
      const chunks = [];

      recorder.ondataavailable = (ev) => {
        if (ev.data && ev.data.size > 0) chunks.push(ev.data);
      };

      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunks, { type: recorder.mimeType || "audio/mp4" });
        if (state.recordedBlobs[lineIdx]) {
          URL.revokeObjectURL(state.recordedBlobs[lineIdx]);
        }
        state.recordedBlobs[lineIdx] = URL.createObjectURL(blob);
        state.recordingLineIdx = null;
        renderSentences(unit);
      };

      state.mediaRecorder = recorder;
      state.recordingLineIdx = lineIdx;
      recorder.start();
      startSpeechRecognitionCheck(unit.lines[lineIdx].en, lineIdx, unit);
      renderSentences(unit);
    } catch (err) {
      alert("無法啟動麥克風錄音。請確認 iPad / iPhone Safari 已允許此網頁使用麥克風權限。");
    }
  }

  function startSpeechRecognitionCheck(targetEn, lineIdx, unit) {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec) return;
    try {
      const rec = new SpeechRec();
      rec.lang = "en-US";
      rec.interimResults = false;
      rec.maxAlternatives = 1;
      rec.onresult = (ev) => {
        const transcript = ev.results[0][0].transcript || "";
        const score = computeWordOverlapScore(targetEn, transcript);
        state.speechScores[lineIdx] = { text: transcript, score };
        renderSentences(unit);
      };
      rec.start();
    } catch (e) {}
  }

  function computeWordOverlapScore(expected, actual) {
    const norm = (s) => s.toLowerCase().replace(/[^a-z0-9\s]/g, "").split(/\s+/).filter(Boolean);
    const expWords = norm(expected);
    const actSet = new Set(norm(actual));
    if (!expWords.length) return 100;
    let hits = 0;
    expWords.forEach((w) => {
      if (actSet.has(w)) hits++;
    });
    return Math.min(100, Math.round((hits / expWords.length) * 100));
  }

  function compareNativeAndUserAudio(lineIdx) {
    const blobUrl = state.recordedBlobs[lineIdx];
    if (!blobUrl) return;
    stopPlayback();
    playLineAt(lineIdx, 1.0, () => {
      const audio = new Audio(blobUrl);
      audio.play().catch(() => {});
    });
  }

  function highlightActiveSentenceCard() {
    document.querySelectorAll(".sentence-card").forEach((card) => {
      const idx = Number(card.dataset.index);
      card.classList.toggle("playing", idx === state.activeLineIndex);
    });
  }

  function updatePlaybackUI() {
    const mainBtn = document.getElementById("playMainBtn");
    if (mainBtn) {
      mainBtn.innerHTML = state.isPlaying ? "⏸ 暫停循環" : "▶ 播放單元循環";
    }
    const loopBtn = document.getElementById("loopModeBtn");
    if (loopBtn) {
      const labels = {
        unit: "🔁 整單元循環",
        sentence: "🔂 單句無限循環",
        trispeed: "⚡ 三速洗腦 (1x➔0.75x➔1x)",
        off: "➡️ 單次播放"
      };
      loopBtn.textContent = labels[state.loopMode] || labels.unit;
      loopBtn.classList.toggle("active", state.loopMode !== "off");
    }
    const speedBtn = document.getElementById("speedCycleBtn");
    if (speedBtn) {
      speedBtn.textContent = `語速 ${state.playbackRate}x`;
    }
  }

  function updateStatsUI() {
    const minEl = document.getElementById("statMinutes");
    const savedEl = document.getElementById("statSaved");
    const streakEl = document.getElementById("statStreak");
    if (minEl) minEl.textContent = `${state.stats.todayMinutes} 分`;
    if (savedEl) savedEl.textContent = `${state.savedLines.length} 句`;
    if (streakEl) streakEl.textContent = `${state.stats.streakDays} 天`;
  }

  function initAudioABPlayer() {
    const fileInput = document.getElementById("localAudioInput");
    const audioEl = document.getElementById("abAudioElement");
    const setABtn = document.getElementById("setPointABtn");
    const setBBtn = document.getElementById("setPointBBtn");
    const clearABBtn = document.getElementById("clearABBtn");
    const rewind2Btn = document.getElementById("rewind2SecBtn");
    const statusLabel = document.getElementById("abStatusLabel");

    if (!fileInput || !audioEl) return;

    let pointA = null;
    let pointB = null;

    fileInput.onchange = (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      audioEl.src = URL.createObjectURL(file);
      pointA = null;
      pointB = null;
      statusLabel.textContent = `已載入：${file.name}（尚未設定 AB 點）`;
    };

    audioEl.ontimeupdate = () => {
      if (pointA !== null && pointB !== null && audioEl.currentTime >= pointB) {
        audioEl.currentTime = pointA;
        audioEl.play().catch(() => {});
      }
    };

    if (setABtn) {
      setABtn.onclick = () => {
        pointA = audioEl.currentTime;
        updateABText();
      };
    }
    if (setBBtn) {
      setBBtn.onclick = () => {
        if (pointA === null) pointA = 0;
        pointB = Math.max(pointA + 0.8, audioEl.currentTime);
        audioEl.currentTime = pointA;
        audioEl.play().catch(() => {});
        updateABText();
      };
    }
    if (clearABBtn) {
      clearABBtn.onclick = () => {
        pointA = null;
        pointB = null;
        updateABText();
      };
    }
    if (rewind2Btn) {
      rewind2Btn.onclick = () => {
        audioEl.currentTime = Math.max(0, audioEl.currentTime - 2.2);
        audioEl.play().catch(() => {});
      };
    }

    function updateABText() {
      const fmt = (s) => (s === null ? "--:--" : `${Math.floor(s / 60)}:${(s % 60).toFixed(1).padStart(4, "0")}`);
      statusLabel.textContent = `AB 循環區間：A [${fmt(pointA)}] ➔ B [${fmt(pointB)}]`;
    }
  }

  function bindGlobalEvents() {
    // 3-Tab View Switching (Trainer / Pre-curated Sources / Studio)
    document.querySelectorAll(".view-tab").forEach((tab) => {
      tab.onclick = () => {
        switchTopView(tab.dataset.view);
      };
    });

    document.querySelectorAll(".step-btn").forEach((btn) => {
      btn.onclick = () => {
        state.currentStage = Number(btn.dataset.stage);
        renderCurrentUnit();
      };
    });

    document.querySelectorAll(".comp-btn").forEach((btn) => {
      btn.onclick = () => {
        const unit = getCurrentUnit();
        if (!unit) return;
        state.stats.compScores[unit.id] = btn.dataset.score;
        saveStats();
        state.currentStage = 2;
        renderCurrentUnit();
      };
    });

    const playMainBtn = document.getElementById("playMainBtn");
    if (playMainBtn) {
      playMainBtn.onclick = () => {
        if (state.isPlaying) {
          stopPlayback();
        } else {
          startPlaybackSequence(state.activeLineIndex);
        }
      };
    }

    const prevLineBtn = document.getElementById("prevLineBtn");
    if (prevLineBtn) {
      prevLineBtn.onclick = () => {
        const unit = getCurrentUnit();
        if (!unit) return;
        state.activeLineIndex = Math.max(0, state.activeLineIndex - 1);
        stopPlayback();
        playLineAt(state.activeLineIndex);
      };
    }

    const nextLineBtn = document.getElementById("nextLineBtn");
    if (nextLineBtn) {
      nextLineBtn.onclick = () => {
        const unit = getCurrentUnit();
        if (!unit) return;
        state.activeLineIndex = Math.min(unit.lines.length - 1, state.activeLineIndex + 1);
        stopPlayback();
        playLineAt(state.activeLineIndex);
      };
    }

    const loopModeBtn = document.getElementById("loopModeBtn");
    if (loopModeBtn) {
      const modes = ["unit", "sentence", "trispeed", "off"];
      loopModeBtn.onclick = () => {
        const nextIdx = (modes.indexOf(state.loopMode) + 1) % modes.length;
        state.loopMode = modes[nextIdx];
        updatePlaybackUI();
      };
    }

    const speedCycleBtn = document.getElementById("speedCycleBtn");
    if (speedCycleBtn) {
      const speeds = [1.0, 0.85, 0.72, 1.15];
      speedCycleBtn.onclick = () => {
        const idx = speeds.indexOf(state.playbackRate);
        state.playbackRate = speeds[(idx + 1) % speeds.length];
        updatePlaybackUI();
      };
    }

    const voiceSelect = document.getElementById("voiceSelect");
    if (voiceSelect) {
      voiceSelect.onchange = () => {
        state.selectedVoiceURI = voiceSelect.value;
      };
    }

    const themeBtn = document.getElementById("themeToggleBtn");
    if (themeBtn) themeBtn.onclick = toggleTheme;

    const mobileMenuBtn = document.getElementById("mobileMenuBtn");
    const backdrop = document.getElementById("sidebarBackdrop");
    if (mobileMenuBtn) {
      mobileMenuBtn.onclick = () => {
        document.getElementById("sidebar").classList.add("open");
        backdrop.classList.add("open");
      };
    }
    if (backdrop) {
      backdrop.onclick = closeMobileSidebar;
    }

    // Studio: Auto-Slice Text Button (with configurable 3-minute / 8-sentence default)
    const sliceBtn = document.getElementById("sliceMaterialBtn");
    if (sliceBtn) {
      sliceBtn.onclick = () => {
        const rawText = document.getElementById("rawMaterialInput").value;
        const customTitle = document.getElementById("customUnitTitleInput").value.trim() || "自訂 3 分鐘截取教材";
        const sentencesPerUnit = Number(document.getElementById("sliceLengthSelect")?.value || 8);
        const newUnits = window.EarFlowAnalyzer.sliceTextIntoMicroUnits(rawText, customTitle, sentencesPerUnit);
        if (!newUnits.length) {
          alert("請先貼上至少一句英文句子或對話字幕！");
          return;
        }
        const existingCustom = getCustomUnits();
        const merged = [...newUnits, ...existingCustom];
        saveCustomUnits(merged);
        rebuildUnitsList();
        state.currentCategory = "all";
        selectUnit(newUnits[0].id);
        renderCategories();
        switchTopView("trainer");
      };
    }

    // Instant Scenario Generator Buttons
    document.querySelectorAll("[data-scenario]").forEach((btn) => {
      btn.onclick = () => {
        const key = btn.dataset.scenario;
        const unit = window.EarFlowAnalyzer.buildScenarioUnit(key);
        const existingCustom = getCustomUnits();
        saveCustomUnits([unit, ...existingCustom]);
        rebuildUnitsList();
        state.currentCategory = "all";
        selectUnit(unit.id);
        renderCategories();
        switchTopView("trainer");
      };
    });

    // Copy AI Prompt Button
    const copyPromptBtn = document.getElementById("copyAiPromptBtn");
    if (copyPromptBtn) {
      copyPromptBtn.onclick = async () => {
        const topic = document.getElementById("aiTopicInput").value;
        const promptText = window.EarFlowAnalyzer.buildAIPromptForTopic(topic, 8);
        try {
          await navigator.clipboard.writeText(promptText);
          copyPromptBtn.textContent = "✅ 已複製 3 分鐘指令！請貼至 ChatGPT / Gemini 後貼回上方框";
          setTimeout(() => {
            copyPromptBtn.textContent = "📋 一鍵複製 3 分鐘教材 AI 指令 (免 API Key)";
          }, 3500);
        } catch (e) {
          document.getElementById("rawMaterialInput").value = promptText;
        }
      };
    }

    // Direct Gemini API Generation (Optional)
    const geminiGenBtn = document.getElementById("geminiGenerateBtn");
    if (geminiGenBtn) {
      const savedKey = localStorage.getItem(STORAGE_KEYS.GEMINI_KEY) || "";
      const keyInput = document.getElementById("geminiApiKeyInput");
      if (keyInput && savedKey) keyInput.value = savedKey;

      geminiGenBtn.onclick = async () => {
        const apiKey = keyInput ? keyInput.value.trim() : "";
        const topic = document.getElementById("aiTopicInput").value.trim() || "主持跨國醫療 AI 研究會議，討論進度與臨床驗證分工";
        if (!apiKey) {
          alert("若要直接連線生成，請輸入 Gemini API Key；或者直接點擊旁邊的「一鍵複製 3 分鐘教材 AI 指令」免費搭配 ChatGPT/Gemini App 使用！");
          return;
        }
        localStorage.setItem(STORAGE_KEYS.GEMINI_KEY, apiKey);
        geminiGenBtn.disabled = true;
        geminiGenBtn.textContent = "⏳ 正在生成 3 分鐘母語會議單元...";
        try {
          const promptText = window.EarFlowAnalyzer.buildAIPromptForTopic(topic, 8);
          const resp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(apiKey)}`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                contents: [{ parts: [{ text: promptText }] }]
              })
            }
          );
          const data = await resp.json();
          const output = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
          if (!output) throw new Error("API 未回傳內容");
          document.getElementById("rawMaterialInput").value = output.trim();
          document.getElementById("customUnitTitleInput").value = `AI 會議｜${topic.slice(0, 18)}`;
          document.getElementById("sliceMaterialBtn").click();
        } catch (err) {
          alert("API 呼叫失敗，請檢查 API Key 或改用「一鍵複製指令」：" + err.message);
        } finally {
          geminiGenBtn.disabled = false;
          geminiGenBtn.textContent = "✨ Gemini API 一鍵生成並載入";
        }
      };
    }
  }

  function closeMobileSidebar() {
    document.getElementById("sidebar")?.classList.remove("open");
    document.getElementById("sidebarBackdrop")?.classList.remove("open");
  }

  function escapeHtml(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function escapeRegExp(str) {
    return str.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
