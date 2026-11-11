// EarFlow 智慧教材截取與連音弱讀分析引擎 (Smart Material Auto-Slicer & Phonetic Decoder)
// 1. 支援從「預先找好的精選語料庫」一鍵載入 3 分鐘標準訓練單元（8 句完整交鋒對話）
// 2. 自動清理 YouTube / SRT / Podcast 字幕時間軸，切分為 3 分鐘單元
// 3. 自動標註母語者連音 (Linking)、弱讀縮讀 (Reductions)、彈舌 T (Flap T) 與聽寫挖空詞

(function () {
  const REDUCTION_RULES = [
    { regex: /\bshould have\b/gi, sound: "shoulda /ˈʃʊdə/", tip: "should + have 弱讀為 shoulda" },
    { regex: /\bcould have\b/gi, sound: "coulda /ˈkʊdə/", tip: "could + have 弱讀為 coulda" },
    { regex: /\bwould have\b/gi, sound: "woulda /ˈwʊdə/", tip: "would + have 弱讀為 woulda" },
    { regex: /\bmust have\b/gi, sound: "musta /ˈmʌstə/", tip: "must + have 弱讀為 musta" },
    { regex: /\bmight have\b/gi, sound: "mighta /ˈmaɪɾə/", tip: "might + have 弱讀為 mighta" },
    { regex: /\bgoing to\b/gi, sound: "gonna /ˈɡʌnə/", tip: "going to 口語高頻縮讀為 gonna" },
    { regex: /\bwant to\b/gi, sound: "wanna /ˈwɑnə/", tip: "want to 口語高頻縮讀為 wanna" },
    { regex: /\bhave to\b/gi, sound: "hafta /ˈhæftə/", tip: "have to 無聲化縮讀為 hafta" },
    { regex: /\bhas to\b/gi, sound: "hasta /ˈhæstə/", tip: "has to 無聲化縮讀為 hasta" },
    { regex: /\bused to\b/gi, sound: "usta /ˈjuːstə/", tip: "used to 的 d 不發音，連讀為 usta" },
    { regex: /\bsupposed to\b/gi, sound: "sposta /səˈpoʊstə/", tip: "supposed to 的 d 與 p 常簡化" },
    { regex: /\bgot to\b/gi, sound: "gotta /ˈɡɑɾə/", tip: "have got to 縮讀為 gotta" },
    { regex: /\bout of\b/gi, sound: "outta /ˈaʊɾə/", tip: "out of 彈舌連讀為 outta" },
    { regex: /\bkind of\b/gi, sound: "kinda /ˈkaɪndə/", tip: "kind of 弱讀為 kinda" },
    { regex: /\bsort of\b/gi, sound: "sorta /ˈsɔrɾə/", tip: "sort of 弱讀為 sorta" },
    { regex: /\ba lot of\b/gi, sound: "a-lotta /əˈlɑɾə/", tip: "a lot of 連讀為 a-lotta" },
    { regex: /\blots of\b/gi, sound: "lotsa /ˈlɑtsə/", tip: "lots of 連讀為 lotsa" },
    { regex: /\bcouple of\b/gi, sound: "coupla /ˈkʌplə/", tip: "couple of 弱讀為 coupla" },
    { regex: /\bwhat are you\b/gi, sound: "whatcha / wha-der-yü", tip: "what are you 常縮讀為 whatcha 或 whader-ya" },
    { regex: /\bwhat do you\b/gi, sound: "whaddya /ˈwʌdəjə/", tip: "what do you 連讀為 whaddya" },
    { regex: /\bdid you\b/gi, sound: "di-jü /ˈdɪdʒə/", tip: "d + y 同化為 /dʒ/ (dijü)" },
    { regex: /\bdon't you\b/gi, sound: "don-chü /ˈdoʊntʃə/", tip: "t + y 同化為 /tʃ/ (donchü)" },
    { regex: /\bcan't you\b/gi, sound: "can-chü /ˈkæntʃə/", tip: "t + y 同化為 /tʃ/" },
    { regex: /\bwould you\b/gi, sound: "wʊ-jü /ˈwʊdʒə/", tip: "d + y 同化為 /dʒ/" },
    { regex: /\bcould you\b/gi, sound: "kʊ-jü /ˈkʊdʒə/", tip: "d + y 同化為 /dʒ/" },
    { regex: /\blet me\b/gi, sound: "lemme /ˈlɛmi/", tip: "let me 縮讀為 lemme" },
    { regex: /\bgive me\b/gi, sound: "gimme /ˈɡɪmi/", tip: "give me 縮讀為 gimme" },
    { regex: /\btell them\b/gi, sound: "tell-'em /ˈtɛləm/", tip: "them 的 th 消失，連讀為 tell'em" },
    { regex: /\blet them\b/gi, sound: "le-dəm (let 'em)", tip: "t 彈舌連 'em" },
    { regex: /\bask him\b/gi, sound: "a-skim", tip: "him 的 h 脫落，k 連 im" },
    { regex: /\btold her\b/gi, sound: "tol-der", tip: "her 的 h 脫落，d 連 er" },
    { regex: /\bwith him\b/gi, sound: "wi-thim", tip: "him 的 h 脫落" },
    { regex: /\bwith her\b/gi, sound: "wi-ther", tip: "her 的 h 脫落" },
    { regex: /\bwalk us through\b/gi, sound: "waw-kʌs-through", tip: "會議高頻：逐步帶我們看過一遍" },
    { regex: /\bwalk you through\b/gi, sound: "waw-kyü-through", tip: "會議高頻：逐步帶你看過一遍" },
    { regex: /\btouch base\b/gi, sound: "tʌch-base", tip: "會議高頻：聯繫、對一下進度" },
    { regex: /\bsign off on\b/gi, sound: "sai-noff-on", tip: "會議高頻：正式簽核批准" },
    { regex: /\bon the same page\b/gi, sound: "on-the-same-page", tip: "會議高頻：達成共識、資訊同步" },
    { regex: /\bfigure out\b/gi, sound: "fi-gyer-out", tip: "搞清楚、想出辦法" },
    { regex: /\bfiguring out\b/gi, sound: "fi-gyer-ing-out", tip: "設法釐清" },
    { regex: /\bsort it out\b/gi, sound: "sor-di-dout", tip: "把問題處理好" },
    { regex: /\bcheck it out\b/gi, sound: "che-ki-dout", tip: "三詞連音 + 彈舌 t" },
    { regex: /\bpick it up\b/gi, sound: "pi-ki-dʌp", tip: "pick + it + up 連音" },
    { regex: /\bput it on\b/gi, sound: "pʊ-di-don", tip: "兩個 t 皆變彈舌 d 連音" },
    { regex: /\bthink about\b/gi, sound: "thin-kə-bout", tip: "k 直接與 about 連音" },
    { regex: /\btalk about\b/gi, sound: "taw-kə-bout", tip: "k 直接與 about 連音" },
    { regex: /\blook at\b/gi, sound: "lʊ-kat", tip: "k 與 at 連音" },
    { regex: /\bhold on\b/gi, sound: "hol-don", tip: "d 與 on 連音" },
    { regex: /\bcome in\b/gi, sound: "cʌ-min", tip: "m 與 in 連音" },
    { regex: /\bright now\b/gi, sound: "righ'-now", tip: "right 字尾 t 為喉塞音停頓" },
    { regex: /\bat all\b/gi, sound: "ə-dall", tip: "at 的 t 遇母音 all 變彈舌 d" },
    { regex: /\bfirst of all\b/gi, sound: "firs-tə-vall", tip: "first + of + all 三詞連讀" },
    { regex: /\bat the end of the day\b/gi, sound: "at-the-en-dəv-the-day", tip: "說到底、歸根結底" }
  ];

  // 內建 3 分鐘（8 句）情境快速生成模板庫
  const INSTANT_TEMPLATES = {
    meeting_brainstorm: {
      title: "會議實戰｜跨部門專案腦力激盪與資源協調 (Cross-Team Brainstorming)",
      category: "meeting",
      categoryName: "💼 會議英語專區",
      focus: "會議中拋出構想、評估可行性（Feasibility）與敲定試點方案的 8 句完整對話",
      lines: [
        { speaker: "A", en: "Thanks for making time today, we need to figure out how to boost user engagement this quarter.", zh: "感謝大家今天抽空，我們需要想辦法提升本季的使用者參與度。" },
        { speaker: "B", en: "To kick things off, I was thinking we could roll out a weekly progress report for users.", zh: "先拋磚引玉一下，我在想我們或許可以為使用者推出每週進度報告。" },
        { speaker: "A", en: "I like where your head is at, how much engineering effort would that take to build?", zh: "我喜歡你的思路，這需要投入多少工程開發人力才做得出來？" },
        { speaker: "B", en: "If we keep the design simple, we could probably have a prototype ready in two weeks.", zh: "如果我們保持設計精簡，大概兩週內就能做出一個原型。" },
        { speaker: "A", en: "Wait a second, don't we have to get the data privacy team to sign off on automated emails?", zh: "等一下，我們不是必須先讓資料隱私團隊簽核批准自動發信功能嗎？" },
        { speaker: "B", en: "Good catch! I can touch base with their lead this afternoon to see what is required.", zh: "抓得好（提醒得好）！我今天下午可以跟他們的主管聯繫，看看需要哪些程序。" },
        { speaker: "A", en: "Awesome, let's put together a one-page spec before we bring it to the Friday review.", zh: "太棒了，我們在拿去週五審查會之前，先整理出一頁式的規格書。" },
        { speaker: "B", en: "Sounds like a plan, I'll share the Google Doc link with everyone by the end of the day.", zh: "聽起來很棒，我會在今天下班前把 Google 文件連結分享給大家。" }
      ]
    },
    hotel: {
      title: "差旅實戰｜飯店入住、押金說明與延遲退房 (Hotel Check-in & Late Checkout)",
      category: "dining",
      categoryName: "✈️ 商務差旅與餐飲",
      focus: "櫃檯人員快語速說明押金、Wi-Fi、早餐時段與行李寄放（約 3 分鐘 · 8 句）",
      lines: [
        { speaker: "A", en: "Hi there, I have a reservation under Hsieh, checking in for four nights.", zh: "您好，我有以 Hsieh 的名字訂房，入住四晚。" },
        { speaker: "B", en: "Welcome! Could I just see your passport and a credit card for incidentals?", zh: "歡迎光臨！可以請您出示護照，以及一張用來刷雜費押金的信用卡嗎？" },
        { speaker: "A", en: "Here you go. By the way, is breakfast included with my room rate?", zh: "給您。順帶一提，我的房價有包含早餐嗎？" },
        { speaker: "B", en: "Yes it is! Breakfast is served from six-thirty to ten on the second floor.", zh: "有的！早餐供應時間是六點半到十點，地點在二樓。" },
        { speaker: "A", en: "Great! Also, would it be possible to get a late checkout on Friday afternoon?", zh: "太好了！另外，週五下午有可能申請延遲退房嗎？" },
        { speaker: "B", en: "Let me check our occupancy, we can push it back to one o'clock at no extra charge.", zh: "讓我查一下住房率，我們可以免費幫您延後到下午一點退房。" },
        { speaker: "A", en: "That helps a lot, my flight doesn't leave until six in the evening.", zh: "那幫了大忙，我的班機要到傍晚六點才起飛。" },
        { speaker: "B", en: "You can also leave your bags with the bell desk after you check out.", zh: "您退房之後，也可以把行李寄放在行李服務櫃檯。" }
      ]
    },
    clinic: {
      title: "醫療科研｜智慧醫療與臨床決策模型會議 (Clinical AI & Nursing Workflow)",
      category: "academic",
      categoryName: "🎓 學術與國際研討會",
      focus: "醫療資訊與臨床團隊針對模型偽陽性、閾值微調與臨床導入的 8 句深度討論",
      lines: [
        { speaker: "A", en: "Did everyone get a chance to look over the latest patient cohort results?", zh: "大家都有空看過最新的病患世代研究結果了嗎？" },
        { speaker: "B", en: "Yeah, the sensitivity went up, but we still have too many false alarms on the night shift.", zh: "有，敏感度提升了，但在夜班時段的假警報（偽陽性）還是太多。" },
        { speaker: "A", en: "If the alert goes off every ten minutes, the nurses are going to tune it out.", zh: "如果警報每十分鐘就響一次，護理師很快就會因為警報疲勞而忽略它。" },
        { speaker: "B", en: "Spot on, we should probably tweak the risk threshold before we roll it out.", zh: "完全正確，在我們正式上線前，應該先微調一下風險閾值。" },
        { speaker: "A", en: "What if we combine the vital signs with the latest lab results to filter out noise?", zh: "如果我們把生命徵象與最新的檢驗結果結合起來過濾雜訊呢？" },
        { speaker: "B", en: "We tried that on the validation set, and it cut false positives almost in half.", zh: "我們在驗證集上試過這個做法，幾乎把偽陽性砍了一半。" },
        { speaker: "A", en: "That is impressive! Let's run a shadow test in two wards starting next Monday.", zh: "太令人驚豔了！我們下週一起先在兩個病房進行不影響臨床的平行測試。" },
        { speaker: "B", en: "Agreed, I'll set up a quick briefing with the head nurses to walk them through it.", zh: "同意，我會安排一場與護理長的簡短說明會，帶她們看過一遍流程。" }
      ]
    },
    uber: {
      title: "生活實戰｜Uber 機場接送、塞車改道與車內寒暄 (Airport Rideshare Chat)",
      category: "smalltalk",
      categoryName: "☕ 日常寒暄與社交",
      focus: "車內背景噪音下的母語快語速短句：確認航廈、塞車改走隧道、旅遊寒暄",
      lines: [
        { speaker: "A", en: "Hey! Heading to the convention center on Fifth Avenue, right?", zh: "嗨！是要去第五大道上的會展中心，對吧？" },
        { speaker: "B", en: "Yep, that's the one. Let me just put my suitcase in the trunk real quick.", zh: "對，就是那裡。讓我快速把行李箱放進後車廂。" },
        { speaker: "A", en: "Take your time! Are you in town for the medical tech conference?", zh: "慢慢來！你是來參加那個醫療科技研討會的嗎？" },
        { speaker: "B", en: "Yes I am, it seems like half the city is here for the same event.", zh: "是啊，感覺好像半個城市的人都是為了同一個活動來的。" },
        { speaker: "A", en: "Tell me about it, traffic around downtown has been crazy all morning.", zh: "可不是嗎，市中心周圍的交通整個早上都塞爆了。" },
        { speaker: "B", en: "Are we going to hit a lot of traffic on the bridge right now?", zh: "我們現在在橋上會遇到大塞車嗎？" },
        { speaker: "A", en: "It is a little backed up, so I'm going to take the tunnel instead to save time.", zh: "那裡有點回堵，所以我會改走隧道來節省時間。" },
        { speaker: "B", en: "Sounds good to me, you can just drop me off right by the main entrance.", zh: "聽起來很棒，到時候直接讓我在正門口下車就可以了。" }
      ]
    }
  };

  function cleanTranscriptText(raw) {
    if (!raw) return "";
    return raw
      .replace(/^\d+\s*$/gm, "")
      .replace(/\d{1,2}:\d{2}(:\d{2})?([.,]\d{1,3})?\s*-->\s*\d{1,2}:\d{2}(:\d{2})?([.,]\d{1,3})?/g, " ")
      .replace(/\[\d{1,2}:\d{2}(:\d{2})?\]/g, " ")
      .replace(/^\s*\d{1,2}:\d{2}\s+/gm, "")
      .trim();
  }

  function analyzeSentence(enText, zhText, index) {
    const cleanEn = enText.trim();
    const matchedChunks = [];
    const clozeCandidates = [];
    let earPreview = cleanEn;

    for (const rule of REDUCTION_RULES) {
      const match = cleanEn.match(rule.regex);
      if (match && match[0]) {
        const origPhrase = match[0];
        matchedChunks.push({
          orig: origPhrase,
          sound: rule.sound,
          tip: rule.tip
        });
        clozeCandidates.push(origPhrase);
        const shortSound = rule.sound.split("/")[0].trim();
        earPreview = earPreview.replace(rule.regex, `[${shortSound}]`);
      }
    }

    // Automatically detect consonant-to-vowel linking (Catenation)
    if (matchedChunks.length < 2) {
      const words = cleanEn.replace(/[.,?!]/g, "").split(/\s+/);
      for (let i = 0; i < words.length - 1; i++) {
        const w1 = words[i];
        const w2 = words[i + 1];
        if (/[bdfgklmnprstvz]$/i.test(w1) && /^[aeiou]/i.test(w2) && w1.length > 2) {
          const pair = `${w1} ${w2}`;
          if (!clozeCandidates.some((c) => c.toLowerCase() === pair.toLowerCase())) {
            matchedChunks.push({
              orig: pair,
              sound: `${w1}-${w2}`,
              tip: "前字尾子音與後字首母音自然連音 (Catenation)"
            });
            clozeCandidates.push(pair);
          }
          if (matchedChunks.length >= 3) break;
        }
      }
    }

    // Fallback cloze candidate if none found
    if (clozeCandidates.length === 0) {
      const tokens = cleanEn.replace(/[.,?!"]/g, "").split(/\s+/);
      if (tokens.length >= 4) {
        const mid = Math.floor(tokens.length / 2) - 1;
        clozeCandidates.push(`${tokens[mid]} ${tokens[mid + 1]}`);
      } else if (tokens.length >= 2) {
        clozeCandidates.push(tokens[1]);
      }
    }

    return {
      speaker: index % 2 === 0 ? "A" : "B",
      en: cleanEn,
      zh: zhText || "（自選/截取句子 — 點擊單字或語塊可單獨慢速發音）",
      ear: earPreview,
      cloze: clozeCandidates.slice(0, 2),
      chunks: matchedChunks.slice(0, 3)
    };
  }

  // Split raw text into ~3-minute units (default 8 sentences per unit)
  function sliceTextIntoMicroUnits(rawText, customTitlePrefix, sentencesPerUnit = 8, category = "custom", categoryName = "⭐ 自選來源 / 收藏") {
    const cleaned = cleanTranscriptText(rawText);
    if (!cleaned) return [];

    // Check if input is line-by-line bilingual ("English | 中文")
    const rawLines = cleaned.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
    let sentencePairs = [];

    if (rawLines.some((l) => l.includes("|"))) {
      sentencePairs = rawLines.map((line) => {
        const parts = line.split(/\s*\|\|\s*|\s*\|\s*/);
        return {
          en: parts[0].replace(/^(Speaker\s*[A-Z0-9]+|[A-Z]):\s*/i, "").trim(),
          zh: parts[1] ? parts[1].trim() : ""
        };
      }).filter((p) => p.en.length >= 5);
    } else {
      const joined = rawLines.join(" ");
      const rawSentences = joined
        .match(/[^.!?]+[.!?]+(\s|$)|[^.!?]+$/g)
        ?.map((s) => s.trim())
        .filter((s) => s.length >= 8 && /[a-zA-Z]/.test(s)) || [];
      sentencePairs = rawSentences.map((s) => ({
        en: s.replace(/^(Speaker\s*[A-Z0-9]+|[A-Z]):\s*/i, "").trim(),
        zh: ""
      }));
    }

    if (sentencePairs.length === 0) return [];

    const units = [];
    const totalChunks = Math.ceil(sentencePairs.length / sentencesPerUnit);

    for (let u = 0; u < totalChunks; u++) {
      const slice = sentencePairs.slice(u * sentencesPerUnit, (u + 1) * sentencesPerUnit);
      const analyzedLines = slice.map((pair, idx) => analyzeSentence(pair.en, pair.zh, idx));
      const estMins = Math.max(1, Math.round((analyzedLines.length / 8) * 3));
      const suffix = totalChunks > 1 ? ` (Part ${u + 1}/${totalChunks})` : "";

      units.push({
        id: `custom-${Date.now()}-${u}`,
        category,
        categoryName,
        title: `${customTitlePrefix || "自選 3 分鐘單元"}${suffix}`,
        focus: "自動標註連音、弱讀語塊與關鍵克漏字（3分鐘精聽與跟讀訓練）",
        duration: `約 ${estMins} 分鐘 · ${analyzedLines.length} 句`,
        lines: analyzedLines
      });
    }

    return units;
  }

  function buildScenarioUnit(templateKey) {
    const tpl = INSTANT_TEMPLATES[templateKey] || INSTANT_TEMPLATES.meeting_brainstorm;
    const lines = tpl.lines.map((item, idx) => {
      const analyzed = analyzeSentence(item.en, item.zh, idx);
      analyzed.speaker = item.speaker || (idx % 2 === 0 ? "A" : "B");
      return analyzed;
    });
    return {
      id: `custom-tpl-${templateKey}-${Date.now()}`,
      category: tpl.category || "custom",
      categoryName: tpl.categoryName || "⭐ 自選來源 / 收藏",
      title: tpl.title,
      focus: tpl.focus,
      duration: `約 3 分鐘 · ${lines.length} 句`,
      lines
    };
  }

  function buildUnitFromPrecuratedSource(sourceObj, sentencesPerUnit = 8) {
    if (!sourceObj) return null;
    const units = sliceTextIntoMicroUnits(
      sourceObj.rawScript,
      sourceObj.title,
      sentencesPerUnit,
      sourceObj.category || "custom",
      sourceObj.badge ? `📚 ${sourceObj.badge}` : "⭐ 自選來源 / 收藏"
    );
    if (units.length > 0) {
      units[0].focus = sourceObj.description || units[0].focus;
      return units[0];
    }
    return null;
  }

  function buildAIPromptForTopic(topic, sentenceCount = 8) {
    const targetTopic = topic?.trim() || "主持跨國研究會議並討論專案時程與分工";
    return `請幫我設計一組約 3 分鐘訓練量（共 ${sentenceCount} 句來回交鋒對話）的英語聽力單元，專為「能讀能講、但聽不懂母語者正常快語速（連音與弱讀）」的學習者設計。
情境主題：「${targetTopic}」
請嚴格以「每行一句，英文與繁體中文之間用 | 分隔」的格式輸出（共 ${sentenceCount} 行，不要加編號或其他說明文字），且英文必須大量包含母語者真實會議/日常口語（如 walk us through, on the same page, touch base, sign off on, should have, going to, did you, out of 等），範例格式如下：
Good morning everyone, let's dive right in since we have a packed agenda today. | 大家早安，因為今天議程很滿，我們就直接切入正題吧。
Before we start, did everyone get a chance to look over the proposal I sent out? | 在開始之前，大家都有空看過我發出的提案了嗎？`;
  }

  window.EarFlowAnalyzer = {
    analyzeSentence,
    sliceTextIntoMicroUnits,
    buildScenarioUnit,
    buildUnitFromPrecuratedSource,
    buildAIPromptForTopic
  };
})();
