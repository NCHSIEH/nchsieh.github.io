// EarFlow 3分鐘微單元題庫 & 預選真實教材來源庫
// 每單元設計為「約 3 分鐘訓練量」（8 句完整來回交鋒對話：盲聽 45 秒 + 弱讀聽寫 60 秒 + 連音解剖與跟讀 75 秒 ≈ 3 分鐘）

window.EARFLOW_CATEGORIES = [
  { id: "all", name: "全部單元" },
  { id: "meeting", name: "💼 會議英語專區" },
  { id: "academic", name: "🎓 學術與國際研討會" },
  { id: "reduction", name: "⚡ 連音與弱讀急救" },
  { id: "smalltalk", name: "☕ 日常寒暄與社交" },
  { id: "dining", name: "✈️ 商務差旅與餐飲" },
  { id: "custom", name: "⭐ 自選來源 / 收藏" }
];

window.EARFLOW_DEFAULT_UNITS = [
  // ==================== 💼 會議英語專區 (Meeting English) ====================
  {
    id: "meet-01",
    category: "meeting",
    categoryName: "💼 會議英語專區",
    title: "Meeting 01｜主持開場、確認音訊與議程控管 (Chairing & Agenda)",
    focus: "跨國會議開場黃金前兩分鐘：確認連線、寒暄收斂、切入正題與時間分配",
    duration: "約 3 分鐘 · 8 句",
    lines: [
      {
        speaker: "A",
        en: "Good morning everyone, let's give it another minute for the rest of the team to dial in.",
        zh: "大家早安，我們再等一分鐘讓團隊其他成員連進來。",
        ear: "Gʊd morning everyone, lets [gi-vi-də-nʌ-ther] minute fer the [res-təv] the team tə dial-in.",
        cloze: ["give it another", "rest of"],
        chunks: [
          { orig: "give it another", sound: "gi-vi-də-nʌ-ther", tip: "give + it + another 三詞連音，it 的 t 變彈舌 d" },
          { orig: "rest of", sound: "res-təv", tip: "of 弱讀為 /əv/，與前字尾 t 連音" }
        ]
      },
      {
        speaker: "B",
        en: "Hi! Sorry I'm a bit late, I was having trouble getting my mic to work.",
        zh: "嗨！抱歉我稍微晚了一點，我剛才麥克風一直搞不定。",
        ear: "Hi! Sorry I'm ə bi' late, I wəz having trouble [ge-ding] my mic [tə-work].",
        cloze: ["a bit late", "getting my"],
        chunks: [
          { orig: "a bit late", sound: "ə bi' late", tip: "bit 字尾 t 為喉塞音停頓，不噴氣" },
          { orig: "getting my", sound: "ge-ding my", tip: "getting 的 tt 唸作美式彈舌 d" }
        ]
      },
      {
        speaker: "A",
        en: "No worries at all, we can hear you loud and clear now.",
        zh: "完全沒關係，我們現在聽你的聲音非常清楚。",
        ear: "No [wɜr-ree-zə-dall], we kən hear-yü [lou-dən-clear] now.",
        cloze: ["at all", "loud and clear"],
        chunks: [
          { orig: "worries at all", sound: "wɜr-ree-zə-dall", tip: "/z/ + at + all 連成 zə-dall" },
          { orig: "loud and clear", sound: "lou-dən-clear", tip: "and 縮成 /ən/，d 連 ən" }
        ]
      },
      {
        speaker: "A",
        en: "Since we have a packed agenda today, let's go ahead and dive right in.",
        zh: "因為我們今天議程很滿，我們就直接切入正題吧。",
        ear: "Since we [ha-və] pack-tə-genda tə-day, lets [go-ə-head] ən [dai-vraigh-din].",
        cloze: ["packed agenda", "dive right in"],
        chunks: [
          { orig: "packed agenda", sound: "pack-tə-genda", tip: "packed 的 -ed (/t/) 連後面的 agenda" },
          { orig: "dive right in", sound: "dai-vraigh-din", tip: "會議高頻片語：立即切入正題；right in 連成 raigh-din" }
        ]
      },
      {
        speaker: "B",
        en: "Before we start, did everyone get a chance to look over the quarterly report?",
        zh: "在開始之前，大家都有空看過那份季度報告了嗎？",
        ear: "Before we start, [di-deveryone] [ge-də-chance] tə [lʊ-ko-ver] the quarterly report?",
        cloze: ["get a chance", "look over"],
        chunks: [
          { orig: "did everyone", sound: "di-deveryone", tip: "did 的 d 與 everyone 連音" },
          { orig: "get a chance", sound: "ge-də-chance", tip: "get + a 連成 gedə" },
          { orig: "look over", sound: "lʊ-ko-ver", tip: "快速瀏覽、審閱" }
        ]
      },
      {
        speaker: "A",
        en: "Yes, I skimmed through it this morning, and the main takeaways look solid.",
        zh: "有，我今天早上快速瀏覽過了，主要結論看起來很紮實。",
        ear: "Yes, I [skim-dthrough-it] this morning, ən the main takeaways lʊk solid.",
        cloze: ["skimmed through it", "takeaways"],
        chunks: [
          { orig: "skimmed through it", sound: "skim-dthrough-it", tip: "skim through = 快速略讀抓重點" },
          { orig: "main takeaways", sound: "main takeaways", tip: "會議核心詞：關鍵重點、核心收穫" }
        ]
      },
      {
        speaker: "B",
        en: "Great, I'll spend the first ten minutes walking you through the key numbers.",
        zh: "太好了，我前十分鐘會先帶大家看過一遍關鍵數據。",
        ear: "Great, I'll spend the firs' ten minutes [waw-king-yü-through] the key numbers.",
        cloze: ["first ten", "walking you through"],
        chunks: [
          { orig: "walk you through", sound: "waw-kyü through", tip: "會議超高頻：逐步帶某人看過一遍（簡報/數據）" }
        ]
      },
      {
        speaker: "A",
        en: "Sounds like a plan, please feel free to share your screen whenever you're ready.",
        zh: "聽起來很棒，準備好時請隨時分享你的螢幕畫面。",
        ear: "Sounz [lai-kə-plan], please feel free tə share yer screen [whe-ne-ver] yer ready.",
        cloze: ["like a plan", "whenever you're"],
        chunks: [
          { orig: "Sounds like a plan", sound: "Sounz lai-kə plan", tip: "表示同意安排的自然口語" },
          { orig: "your / you're", sound: "yer /jər/", tip: "母語者在句中幾乎都把 your 與 you're 弱讀成 yer" }
        ]
      }
    ]
  },
  {
    id: "meet-02",
    category: "meeting",
    categoryName: "💼 會議英語專區",
    title: "Meeting 02｜禮貌插話、表達異議與拉回焦點 (Interrupting & Pushback)",
    focus: "聽懂母語者在會議中「委婉反對 (Pushback)」、「插話補充」與「防止離題」的弦外之音",
    duration: "約 3 分鐘 · 8 句",
    lines: [
      {
        speaker: "A",
        en: "Sorry to jump in here, but could I just add a quick point on that?",
        zh: "抱歉在這裡插個話，我可以針對那點快速補充一句嗎？",
        ear: "Sorry tə [jʌm-pin] here, bət [kʊ-dI] jəs [a-də-quick] point on that?",
        cloze: ["jump in", "add a quick"],
        chunks: [
          { orig: "jump in", sound: "jʌm-pin", tip: "會議中最禮貌自然的插話起手式" },
          { orig: "add a quick", sound: "a-də-quick", tip: "add + a 連音為 adə" }
        ]
      },
      {
        speaker: "B",
        en: "Sure, go right ahead! What is on your mind?",
        zh: "當然，請說！你有什麼想法？",
        ear: "Sure, go [righ-də-head]! [Wha-tson] yer mind?",
        cloze: ["right ahead", "What is on"],
        chunks: [
          { orig: "go right ahead", sound: "go righ-də-head", tip: "right 的 t 遇 ahead 變彈舌 d" },
          { orig: "What is on", sound: "Wha-tson", tip: "What's on 連成 Whatson" }
        ]
      },
      {
        speaker: "A",
        en: "I see where you're coming from, but I'm a little concerned about the timeline.",
        zh: "我理解你的立場與出發點，但我對這個時程表有點擔心。",
        ear: "I see where yer [cʌ-ming-frəm], bət [I'm-ə-li-dəl] concerned ə-bout the timeline.",
        cloze: ["coming from", "a little concerned"],
        chunks: [
          { orig: "I see where you're coming from", sound: "I see where yer cʌ-ming frəm", tip: "母語者委婉反駁前的必備鋪墊：「我懂你的考量，但是...」" },
          { orig: "a little", sound: "ə-li-dəl", tip: "little 的 tt 變彈舌 d" }
        ]
      },
      {
        speaker: "B",
        en: "Do you think rolling it out by next month is too ambitious?",
        zh: "你覺得在下個月前正式推出太過急迫（太理想化）嗎？",
        ear: "[Djü-think] [ro-ling-i-dout] by nex' month iz too ambitious?",
        cloze: ["rolling it out", "next month"],
        chunks: [
          { orig: "Do you think", sound: "Djü-think", tip: "句首 Do you 常縮成單音節 Djü" },
          { orig: "rolling it out", sound: "ro-ling-i-dout", tip: "roll out = 正式上線、推出新系統/政策" }
        ]
      },
      {
        speaker: "A",
        en: "To be fair, our engineering team is already stretched pretty thin right now.",
        zh: "平心而論，我們的工程團隊現在人力已經非常吃緊了。",
        ear: "[Tə-bee-fair], our engineering team iz already [strech-tpri-dee-thin] righ'-now.",
        cloze: ["To be fair", "stretched pretty thin"],
        chunks: [
          { orig: "To be fair", sound: "Tə-bee-fair", tip: "「平心而論、說句公道話」" },
          { orig: "stretched pretty thin", sound: "strech-tpri-dee-thin", tip: "be stretched thin = 人力或資源極度吃緊、分身乏術" }
        ]
      },
      {
        speaker: "B",
        en: "That is a fair point, we definitely don't want to cut corners on testing.",
        zh: "你說得很有道理，我們絕對不想在測試環節偷工減料。",
        ear: "[Tha-tsə] fair point, we definitely don' [wa-nə] [cʌ'-corners] on testing.",
        cloze: ["fair point", "cut corners"],
        chunks: [
          { orig: "want to", sound: "wanna /ˈwɑnə/", tip: "want to 縮讀為 wanna" },
          { orig: "cut corners", sound: "cʌ'-corners", tip: "cut corners = 為求快而省步驟、便宜行事" }
        ]
      },
      {
        speaker: "A",
        en: "Let's put a pin in the deployment date for now and revisit it on Thursday.",
        zh: "我們先把上線日期這件事暫時擱置，週四再回來討論。",
        ear: "Lets [pʊ-də-pi-nin] the deployment date fer now ən [ree-vi-zi-dit] on Thursday.",
        cloze: ["put a pin in", "revisit it"],
        chunks: [
          { orig: "put a pin in", sound: "pʊ-də-pi-nin", tip: "會議極高頻片語：先把某議題「插根針記著（暫緩討論）」，免得卡住議程" },
          { orig: "revisit it", sound: "ree-vi-zi-dit", tip: "稍後再回頭討論" }
        ]
      },
      {
        speaker: "B",
        en: "Agreed, let's get back on track and look at the budget allocation.",
        zh: "同意，那我們回到正軌，來看一下預算分配吧。",
        ear: "Agreed, lets [ge'-ba-kon-track] ən [lʊ-kat] the budget allocation.",
        cloze: ["back on track", "look at"],
        chunks: [
          { orig: "get back on track", sound: "ge'-ba-kon-track", tip: "把離題的討論拉回正軌" }
        ]
      }
    ]
  },
  {
    id: "meet-03",
    category: "meeting",
    categoryName: "💼 會議英語專區",
    title: "Meeting 03｜進度追蹤、瓶頸排除與責任歸屬 (Stand-up & Bottlenecks)",
    focus: "專案會議追進度必聽詞：bandwidth（心力/時間）、bottleneck（瓶頸）、ballpark（粗估）",
    duration: "約 3 分鐘 · 8 句",
    lines: [
      {
        speaker: "A",
        en: "Where do we stand on the data migration? Are we still on schedule?",
        zh: "我們在資料轉移這塊目前進度到哪了？還在預定時程上嗎？",
        ear: "Where də we [stan-don] the day-də migration? Ar-we [stil-lon] schedule?",
        cloze: ["stand on", "still on schedule"],
        chunks: [
          { orig: "Where do we stand on...", sound: "Where də we stan-don", tip: "詢問某專案目前進度與狀態的最地道問法" },
          { orig: "still on schedule", sound: "stil-lon schedule", tip: "進度如期、未落後" }
        ]
      },
      {
        speaker: "B",
        en: "We hit a minor snag yesterday with the hospital firewall permissions.",
        zh: "我們昨天在醫院防火牆權限那邊遇到了一個小阻礙。",
        ear: "We [hi-də] minor snag yesterday with the hospital firewall permissions.",
        cloze: ["hit a minor snag"],
        chunks: [
          { orig: "hit a minor snag", sound: "hi-də minor snag", tip: "hit a snag = 遇到小麻煩、卡關（會議超常聽見）" }
        ]
      },
      {
        speaker: "A",
        en: "Is that going to push back our pilot test next week?",
        zh: "那會延後我們下週的先導測試嗎？",
        ear: "Iz-tha' [gə-nə] [pʊsh-back] our pilot tes' nex'-week?",
        cloze: ["going to", "push back"],
        chunks: [
          { orig: "push back", sound: "pʊsh-back", tip: "把時程往後延、推遲" }
        ]
      },
      {
        speaker: "B",
        en: "Hopefully not, I already looped in the IT director to help us sort it out.",
        zh: "希望不會，我已經把資訊主任拉進討論串，幫我們解決這個問題了。",
        ear: "Hopefully not, I already [loop-tin] the IT director tə hel-pʌs [sor-di-dout].",
        cloze: ["looped in", "sort it out"],
        chunks: [
          { orig: "looped in", sound: "loop-tin", tip: "loop someone in = 把某人加入信件或會議討論中" },
          { orig: "sort it out", sound: "sor-di-dout", tip: "把問題理清、解決掉" }
        ]
      },
      {
        speaker: "A",
        en: "Can you give me a ballpark figure of how many hours that will take?",
        zh: "你能給我一個大概的估計，那需要花多少小時嗎？",
        ear: "Kə-nyü [giv-mee-ə] [ball-park-figure] əv how many hours that-əl take?",
        cloze: ["ballpark figure", "that will"],
        chunks: [
          { orig: "ballpark figure", sound: "ball-park figure", tip: "粗略估計的數字或範圍" },
          { orig: "that will", sound: "that-əl /ˈðæɾəl/", tip: "will 在代名詞後常縮成 /əl/，t 變彈舌 d (thaddl)" }
        ]
      },
      {
        speaker: "B",
        en: "Off the top of my head, it shouldn't take more than a day or two.",
        zh: "憑我當下粗估，應該不會超過一兩天。",
        ear: "[Off-the-ta-pəv-my-head], it shʊ-dən take more thən [ə-day-er-tü].",
        cloze: ["top of my head", "a day or two"],
        chunks: [
          { orig: "Off the top of my head", sound: "Off-the-ta-pəv-my-head", tip: "不查資料憑直覺/記憶馬上回答" },
          { orig: "a day or two", sound: "ə-day-er-tü", tip: "or 弱化成 /ər/" }
        ]
      },
      {
        speaker: "A",
        en: "Do you have enough bandwidth to handle this, or do you need backup?",
        zh: "你目前手頭的時間與心力夠處理這件事嗎，還是需要支援？",
        ear: "Djü hav i-nʌf [band-width] tə handle this, er djü need backup?",
        cloze: ["enough bandwidth", "need backup"],
        chunks: [
          { orig: "bandwidth", sound: "band-width", tip: "會議口語的 bandwidth 指人的「時間、精力與工作負荷餘裕」" }
        ]
      },
      {
        speaker: "B",
        en: "I'm on top of it, I'll ping you on Slack as soon as it goes through.",
        zh: "這件事都在我掌握中，一旦審核通過我馬上在 Slack 上敲你。",
        ear: "I'm [on-ta-pə-vit], I'll ping-yü on Slack əz [soo-nə-zit] goes through.",
        cloze: ["on top of it", "as soon as it"],
        chunks: [
          { orig: "I'm on top of it", sound: "I'm on-ta-pə-vit", tip: "一切都在掌握中、已經在積極處理了" },
          { orig: "as soon as it", sound: "əz-soo-nə-zit", tip: "四個小詞完全連音" }
        ]
      }
    ]
  },
  {
    id: "meet-04",
    category: "meeting",
    categoryName: "💼 會議英語專區",
    title: "Meeting 04｜會議收尾、決議確認與會後交辦 (Action Items & Wrap-up)",
    focus: "會議結束前 3 分鐘的關鍵交辦：Action items、Deliverables、Sign off、Touch base",
    duration: "約 3 分鐘 · 8 句",
    lines: [
      {
        speaker: "A",
        en: "We are coming up on the top of the hour, so let's start wrapping things up.",
        zh: "我們快接近整點了，所以我們開始做個收尾吧。",
        ear: "We're [cʌ-ming-ʌ-pon] the [ta-pəv-the-hour], so lets start [ra-ping-thing-zʌp].",
        cloze: ["coming up on", "top of the hour"],
        chunks: [
          { orig: "top of the hour", sound: "ta-pəv-the-hour", tip: "美式會議超常用：指「整點」（例如 10:00、11:00 會議結束時間）" },
          { orig: "wrapping things up", sound: "ra-ping-thing-zʌp", tip: "把討論做個總結收尾" }
        ]
      },
      {
        speaker: "B",
        en: "Just to make sure we are all on the same page, what are the next steps?",
        zh: "為了確保大家共識一致，接下來的具體步驟是什麼？",
        ear: "Jəs tə make sure we'r-all [on-the-same-page], [wha-der] the nex'-steps?",
        cloze: ["on the same page", "what are"],
        chunks: [
          { orig: "on the same page", sound: "on-the-same-page", tip: "理解一致、資訊同步" },
          { orig: "what are", sound: "wha-der", tip: "what 的 t 遇 are 變彈舌 d" }
        ]
      },
      {
        speaker: "A",
        en: "First of all, we need to finalize the proposal and get the board to sign off on it.",
        zh: "首先，我們需要把提案定稿，並讓董事會（委員會）正式簽核批准。",
        ear: "[Firs-tə-vall], we need tə finalize the proposal ən get the board tə [sai-noff-o-nit].",
        cloze: ["First of all", "sign off on it"],
        chunks: [
          { orig: "First of all", sound: "Firs-tə-vall", tip: "三字連成一氣" },
          { orig: "sign off on it", sound: "sai-noff-o-nit", tip: "sign off on = 正式批准、簽字放行" }
        ]
      },
      {
        speaker: "B",
        en: "I can take the lead on drafting the budget section by Wednesday.",
        zh: "我可以負責主導在週三前把預算章節草擬出來。",
        ear: "I kən [take-the-leed-on] drafting the budget section by Wenz-day.",
        cloze: ["take the lead on"],
        chunks: [
          { orig: "take the lead on", sound: "take-the-lee-don", tip: "主動扛起、主導某項工作" }
        ]
      },
      {
        speaker: "A",
        en: "That would be a huge help, please loop in Sarah so she can double-check the figures.",
        zh: "那真的幫了大忙，請把 Sarah 也拉進來，讓她能再次核對數字。",
        ear: "That-wʊd-bee ə huge help, please [loo-pin] Sarah so she kən double-check the figures.",
        cloze: ["huge help", "loop in"],
        chunks: [
          { orig: "That would be a", sound: "Tha'-wʊd-bee-ə", tip: "語氣肯定的感謝回應" }
        ]
      },
      {
        speaker: "B",
        en: "Will do! When should we touch base again to review the final draft?",
        zh: "沒問題！我們什麼時候要再碰個面確認最終完稿？",
        ear: "Will do! When shʊd-we [tʌch-base] ə-gain tə review the final draft?",
        cloze: ["Will do", "touch base"],
        chunks: [
          { orig: "touch base", sound: "tʌch-base", tip: "源自棒球「踩壘包」，會議中指「簡短聯繫、碰頭對一下進度」" }
        ]
      },
      {
        speaker: "A",
        en: "Let's pencil in a quick fifteen-minute sync on Friday morning.",
        zh: "我們先暫定在週五早上排一個 15 分鐘的快速同步會議。",
        ear: "Lets [pen-sə-lin] ə quick fifteen-minute sync on Friday morning.",
        cloze: ["pencil in", "quick fifteen-minute"],
        chunks: [
          { orig: "pencil in", sound: "pen-sə-lin", tip: "用鉛筆寫下 = 先暫定某個會議時間（之後可再調整）" }
        ]
      },
      {
        speaker: "B",
        en: "Perfect, I'll send out the calendar invite and the meeting minutes right after this.",
        zh: "太完美了，我會在這之後馬上發出日曆邀請與會議紀錄。",
        ear: "Perfect, I'll [sen-dout] the calendar invite ən the [mee-ding-minutes] [righ-dafter] this.",
        cloze: ["send out", "meeting minutes"],
        chunks: [
          { orig: "meeting minutes", sound: "mee-ding minutes", tip: "minutes 在此指「會議紀錄」，非分鐘" },
          { orig: "right after", sound: "righ-dafter", tip: "t 連 after 變彈舌 d" }
        ]
      }
    ]
  },

  // ==================== 🎓 學術與國際研討會 (Academic & Research Meetings) ====================
  {
    id: "acad-01",
    category: "academic",
    categoryName: "🎓 學術與國際研討會",
    title: "Academic 01｜跨國醫療 AI 研究聯盟會議 (Research Consortium Sync)",
    focus: "跨國研究團隊討論臨床模型驗證、IRB 審查與期刊投稿分工",
    duration: "約 3 分鐘 · 8 句",
    lines: [
      {
        speaker: "A",
        en: "Thanks for joining so late in your time zone, I really appreciate your flexibility.",
        zh: "感謝您在您的時區這麼晚還上線參加，非常感謝您的配合與彈性。",
        ear: "Thanks fer joining so [lay-din] yer time zone, I really appreciate yer flexibility.",
        cloze: ["late in", "time zone"],
        chunks: [
          { orig: "late in your", sound: "lay-din yer", tip: "late 的 t 連 in 變彈舌 d" }
        ]
      },
      {
        speaker: "B",
        en: "My pleasure! We are really excited about how the multi-center validation is shaping up.",
        zh: "別客氣！我們對這項跨中心驗證目前的進展感到非常振奮。",
        ear: "My pleasure! We're really excited ə-bout how the multi-center validation iz [shay-ping-ʌp].",
        cloze: ["excited about", "shaping up"],
        chunks: [
          { orig: "shaping up", sound: "shay-ping-ʌp", tip: "shape up = 逐漸成形、進展順利" }
        ]
      },
      {
        speaker: "A",
        en: "Did your clinical site manage to get the ethics approval sorted out?",
        zh: "你們的臨床院區順利把研究倫理審查（IRB）搞定了嗎？",
        ear: "[Di-jer] clinical site manage tə get the ethics approval [sor-di-dout]?",
        cloze: ["Did your", "sorted out"],
        chunks: [
          { orig: "Did your", sound: "Di-jer /ˈdɪdʒər/", tip: "Did + your 同化成 Dijer" },
          { orig: "sorted out", sound: "sor-di-dout", tip: "妥善解決、辦妥" }
        ]
      },
      {
        speaker: "B",
        en: "Yes, the board signed off on it yesterday, so we can start pulling the de-identified records.",
        zh: "有的，委員會昨天正式批准了，所以我們可以開始調取去識別化的病歷資料了。",
        ear: "Yes, the board [sain-doff] o-nit yesterday, so we kən start pulling the de-identified records.",
        cloze: ["signed off on it", "de-identified"],
        chunks: [
          { orig: "signed off on it", sound: "sain-doff-o-nit", tip: "正式簽核通過" }
        ]
      },
      {
        speaker: "A",
        en: "That is fantastic news! How does the model hold up on your external cohort?",
        zh: "那真是太棒的消息了！模型在你們的外部世代資料集上表現得穩健嗎？",
        ear: "[Tha-ts] fantastic news! How dəz the model [hol-dʌp] on yer external cohort?",
        cloze: ["hold up", "external cohort"],
        chunks: [
          { orig: "hold up", sound: "hol-dʌp", tip: "hold up 在學術/工程口語指「經得起考驗、維持表現」" }
        ]
      },
      {
        speaker: "B",
        en: "Overall it is pretty robust, though we saw a slight drop in recall for older patients.",
        zh: "整體來說相當穩健，不過我們在高齡病患族群中看到召回率稍微下降了一點。",
        ear: "Overall i-ts [pri-dee] robust, though we saw ə slight [dra-pin] recall fer older patients.",
        cloze: ["pretty robust", "drop in"],
        chunks: [
          { orig: "drop in", sound: "dra-pin", tip: "p 與 in 連音" }
        ]
      },
      {
        speaker: "A",
        en: "We ran into the exact same issue here, calibrating the age weights should fix it.",
        zh: "我們這裡也遇到了完全相同的問題，校準年齡權重應該就能修正。",
        ear: "We [ra-nin-tə] the exact same issue here, calibrating the age weights shʊd [fik-sit].",
        cloze: ["ran into", "fix it"],
        chunks: [
          { orig: "ran into", sound: "ra-nin-tə", tip: "遭遇、碰到（某個問題）" },
          { orig: "fix it", sound: "fik-sit", tip: "x (/ks/) 連音 it" }
        ]
      },
      {
        speaker: "B",
        en: "Let's aim to submit the manuscript by the end of next month while the findings are fresh.",
        zh: "我們目標定在下個月底前把論文稿件投出去，趁研究成果還很有時效性。",
        ear: "Lets [aym-tə] submit the manuscript by the [en-dəv] nex' month while the findings er fresh.",
        cloze: ["aim to", "end of next"],
        chunks: [
          { orig: "end of next", sound: "en-dəv nex'", tip: "of 弱讀為 əv，next 字尾 t 省略" }
        ]
      }
    ]
  },
  {
    id: "acad-02",
    category: "academic",
    categoryName: "🎓 學術與國際研討會",
    title: "Academic 02｜國際學會 Keynote 演講後 Q&A 攻防與茶敘交流",
    focus: "聽懂歐美學者在 Q&A 連珠炮式的追問鋪墊與茶敘邀約合作",
    duration: "約 3 分鐘 · 8 句",
    lines: [
      {
        speaker: "A",
        en: "Thank you for a thought-provoking keynote, it really gave us a lot to think about.",
        zh: "感謝您帶來這麼發人深省的主題演講，真的給了我們很多啟發。",
        ear: "Thank-yü fer ə thought-provoking keynote, it really gay-vʌs [ə-la-tə] [thin-kə-bout].",
        cloze: ["a lot to", "think about"],
        chunks: [
          { orig: "gave us a lot to", sound: "gay-vʌs ə-la-tə", tip: "v 連 us，lot to 連讀為 la-tə" },
          { orig: "think about", sound: "thin-kə-bout", tip: "k 連 about" }
        ]
      },
      {
        speaker: "A",
        en: "Just to follow up on your second slide, how did you account for confounding variables?",
        zh: "延續您第二張投影片的內容追問一下，你們是如何控制干擾變數的？",
        ear: "Jəs tə [fol-low-ʌ-pon] yer second slide, how [di-jü] account fer confounding variables?",
        cloze: ["follow up on", "account for"],
        chunks: [
          { orig: "follow up on", sound: "fol-low-ʌ-pon", tip: "Q&A 最經典的追問起手式" },
          { orig: "how did you", sound: "how-di-jü", tip: "did you 縮成 dijü" }
        ]
      },
      {
        speaker: "B",
        en: "That is a spot-on question, and it was actually one of our reviewers' main concerns.",
        zh: "這問題非常切中要害，而且這其實也是我們審稿委員最主要的顧慮之一。",
        ear: "[Tha-tsə] [spa-don] question, ən it wəz actually [wʌ-nə-vour] reviewers' main concerns.",
        cloze: ["spot-on", "one of our"],
        chunks: [
          { orig: "spot-on", sound: "spa-don", tip: "非常精準、切中核心" },
          { orig: "one of our", sound: "wʌ-nə-vour", tip: "三詞連讀成 wʌ-nə-vour" }
        ]
      },
      {
        speaker: "B",
        en: "We used propensity score matching to make sure the baseline groups were comparable.",
        zh: "我們使用了傾向分數配對法，以確保基準組別之間具有可比性。",
        ear: "We used propensity score matching tə make sure the baseline groups wer comparable.",
        cloze: ["make sure", "comparable"],
        chunks: [
          { orig: "comparable", sound: "KAHM-pruh-bəl", tip: "注意母語者重音在第一音節 KAHM，中間音節壓縮！" }
        ]
      },
      {
        speaker: "A",
        en: "Got it, that makes total sense! Have you looked into deploying this in long-term care?",
        zh: "了解了，這非常合理！你們有考慮過把這套系統部署到長照機構嗎？",
        ear: "[Ga-dit], that makes [to-dəl] sense! Hav-yü [lʊk-tin-tə] deploying this in long-term care?",
        cloze: ["makes total sense", "looked into"],
        chunks: [
          { orig: "Got it", sound: "Ga-dit", tip: "t 彈舌連 it" },
          { orig: "looked into", sound: "lʊk-tin-tə", tip: "look into = 調查、研究可能性；-ed 唸 /t/ 連 into" }
        ]
      },
      {
        speaker: "B",
        en: "As a matter of fact, we are kicking off a pilot study on aging tech this fall.",
        zh: "事實上，我們今年秋天正要啟動一項高齡科技的先導研究。",
        ear: "[Æ-zə-ma-der-ə-fact], we're [ki-king-off] ə pilot study on aging tech this fall.",
        cloze: ["matter of fact", "kicking off"],
        chunks: [
          { orig: "As a matter of fact", sound: "Æ-zə-ma-der-ə-fact", tip: "「事實上、其實」在快語速中連成一氣" },
          { orig: "kicking off", sound: "ki-king-off", tip: "kick off = 正式啟動、展開" }
        ]
      },
      {
        speaker: "A",
        en: "I'd love to pick your brain over coffee if you have ten minutes during the break.",
        zh: "如果您茶敘休息時間有十分鐘的話，我很想邊喝咖啡邊向您請益。",
        ear: "I'd lʌv tə [pik-yer-brain] over coffee i-fyü hav ten minutes during the break.",
        cloze: ["pick your brain", "during the break"],
        chunks: [
          { orig: "pick your brain", sound: "pik-yer-brain", tip: "歐美學者與商務人士超愛用：「向某人請益、挖寶取經」" }
        ]
      },
      {
        speaker: "B",
        en: "I'd be happy to! Let's head over to the lounge right outside the main hall.",
        zh: "我非常樂意！我們這就去主廳外面的休息區吧。",
        ear: "I'd bee happy tü! Lets [he-do-ver] tə the lounge [righ-dout-side] the main hall.",
        cloze: ["head over", "right outside"],
        chunks: [
          { orig: "head over", sound: "he-do-ver", tip: "動身前往" },
          { orig: "right outside", sound: "righ-dout-side", tip: "right 的 t 遇 outside 變彈舌 d" }
        ]
      }
    ]
  },

  // ==================== ⚡ 連音與弱讀急救 (Connected Speech & Reductions) ====================
  {
    id: "red-01",
    category: "reduction",
    categoryName: "⚡ 連音與弱讀急救",
    title: "Reduction 01｜消失的 have 與過去推論 (should've / could've / would've)",
    focus: "母語者在口語中把 should have / would have / could have 完全壓縮成 shoulda / woulda / coulda",
    duration: "約 3 分鐘 · 8 句",
    lines: [
      {
        speaker: "A",
        en: "You should have told me you were coming in early this morning.",
        zh: "你早該告訴我你今天早上會提早進來的。",
        ear: "Yü [shʊ-də] tol' me yü-wer [cʌ-ming-in] early this morning.",
        cloze: ["should have", "coming in"],
        chunks: [
          { orig: "should have", sound: "shoulda /ˈʃʊdə/", tip: "have 弱化為 /ə/，絕不會唸出清楚的 have" },
          { orig: "told me", sound: "tol' me", tip: "told 的 d 在 m 前省略" }
        ]
      },
      {
        speaker: "B",
        en: "I would have texted you, but my phone died on the train.",
        zh: "我本來要傳訊息給你的，但我的手機在火車上沒電了。",
        ear: "I [wʊ-də] tex-ted-jü, bət my phone [dai-don] the train.",
        cloze: ["would have", "died on"],
        chunks: [
          { orig: "would have", sound: "woulda /ˈwʊdə/", tip: "聽起來就像 would + a" },
          { orig: "died on", sound: "dai-don", tip: "d 與 on 連音" }
        ]
      },
      {
        speaker: "A",
        en: "We could have grabbed a coffee downstairs before the session started.",
        zh: "我們在議程開始前本來可以在樓下買杯咖啡的。",
        ear: "We [kʊ-də] [grab-də] coffee downstairs before the session star-did.",
        cloze: ["could have", "grabbed a"],
        chunks: [
          { orig: "could have", sound: "coulda /ˈkʊdə/", tip: "could + have 縮讀為 coulda" },
          { orig: "grabbed a", sound: "grab-də", tip: "過去式 -ed (/d/) 連後面的 a" }
        ]
      },
      {
        speaker: "B",
        en: "I know, I must have left my charger at the hotel last night.",
        zh: "我知道，我昨晚一定是不小心把充電器忘在飯店了。",
        ear: "I know, I [mʌ-stə] lef' my charger at the hotel las'-night.",
        cloze: ["must have", "last night"],
        chunks: [
          { orig: "must have", sound: "musta /ˈmʌstə/", tip: "must have 縮讀為 musta" },
          { orig: "left my / last night", sound: "lef' my / las' night", tip: "字尾 ft / st 後接子音時，t 完全省略" }
        ]
      },
      {
        speaker: "A",
        en: "Hold on a second, I might have an extra cable in my backpack.",
        zh: "等一下，我背包裡說不定有一條備用的充電線。",
        ear: "[Hol-da-nə] second, I [mai-dəv] ən extra cable in my backpack.",
        cloze: ["Hold on a", "might have"],
        chunks: [
          { orig: "Hold on a", sound: "Hol-da-nə", tip: "Hold + on + a 連成 Holdana" },
          { orig: "might have", sound: "mai-dəv / mighta", tip: "might 的 t 變彈舌 d 連 əv" }
        ]
      },
      {
        speaker: "B",
        en: "Are you serious? That would save my life right now!",
        zh: "真的假的？那現在真是救了我一命！",
        ear: "Ar-yü serious? That-wʊd [sayv-my-life] [righ'-now]!",
        cloze: ["save my life", "right now"],
        chunks: [
          { orig: "right now", sound: "righ'-now", tip: "right 的 t 為喉塞音停頓" }
        ]
      },
      {
        speaker: "A",
        en: "Here you go, just plug it into the outlet right behind your chair.",
        zh: "給你，直接插進你椅子正後方的插座就行了。",
        ear: "Here-yü-go, jəs [plʌ-gi-din-tə] the outlet righ' behind yer chair.",
        cloze: ["plug it into", "behind your"],
        chunks: [
          { orig: "plug it into", sound: "plʌ-gi-din-tə", tip: "plug + it + into 三詞連讀" }
        ]
      },
      {
        speaker: "B",
        en: "I owe you one! Let me buy you lunch after we get out of here.",
        zh: "我欠你一次人情！等我們從這裡離開後讓我請你吃午飯。",
        ear: "I [oh-yü-wʌn]! [Le-mee] buy-yü lunch after we [ge-dou-də] here.",
        cloze: ["I owe you one", "get out of"],
        chunks: [
          { orig: "I owe you one", sound: "I oh-yü-wʌn", tip: "感謝別人幫忙的道地口語：「我欠你一次！」" },
          { orig: "get out of", sound: "ge-dou-də", tip: "get outta 連音彈舌" }
        ]
      }
    ]
  },
  {
    id: "red-02",
    category: "reduction",
    categoryName: "⚡ 連音與弱讀急救",
    title: "Reduction 02｜消失的 H 與代名詞連音 (him / her / them 變 'im / 'er / 'em)",
    focus: "為什麼每個字都認識卻聽不懂？因為 him/her/them 的字首子音在句中完全消失並黏在前一個字尾！",
    duration: "約 3 分鐘 · 8 句",
    lines: [
      {
        speaker: "A",
        en: "Did you ask him if he needs a ride to the station?",
        zh: "你有問他去車站需不需要搭便車嗎？",
        ear: "[Di-jü] [a-skim] [i-fee] need-zə ride tə the station?",
        cloze: ["Did you", "ask him", "if he"],
        chunks: [
          { orig: "ask him", sound: "a-skim", tip: "him 的 h 消失，ask + im 聽起來像單字 askim" },
          { orig: "if he", sound: "i-fee", tip: "he 的 h 消失，f 連 ee" }
        ]
      },
      {
        speaker: "B",
        en: "Yeah, I told her to let them know by noon today.",
        zh: "有，我跟她說今天中午前要通知他們。",
        ear: "Yeah, I [tol-der] tə [le-dəm] know by noon tə-day.",
        cloze: ["told her", "let them"],
        chunks: [
          { orig: "told her", sound: "tol-der", tip: "her 的 h 消失，told + er 聽起來像比較級 tolder" },
          { orig: "let them", sound: "le-dəm (let 'em)", tip: "them 的 th 消失，t 彈舌連 əm" }
        ]
      },
      {
        speaker: "A",
        en: "Give them a call when you get out of the committee meeting.",
        zh: "你開完委員會出來的時候打個電話給他們。",
        ear: "[Gi-vəm-ə] call when yü [ge-dou-də] the committee mee-ding.",
        cloze: ["Give them a", "get out of"],
        chunks: [
          { orig: "Give them a", sound: "Gi-vəm-ə", tip: "Give + 'em + a 三字連成一個節奏單位" }
        ]
      },
      {
        speaker: "B",
        en: "I tried calling him earlier, but it went straight to voicemail.",
        zh: "我稍早有試著打給他，但直接轉進語音信箱了。",
        ear: "I tried [caw-ling-im] earlier, bə-dit wen' [stray-tə] voicemail.",
        cloze: ["calling him", "straight to"],
        chunks: [
          { orig: "calling him", sound: "caw-ling-im", tip: "him 的 h 脫落，ng 連 im" },
          { orig: "straight to", sound: "stray-tə", tip: "兩個 t 合併發一個音" }
        ]
      },
      {
        speaker: "A",
        en: "Do you want me to send her a quick message on WhatsApp?",
        zh: "你要我在 WhatsApp 上傳個簡短訊息給她嗎？",
        ear: "[Djü-wan-mee] tə [sen-der-ə] quick message on WhatsApp?",
        cloze: ["want me to", "send her a"],
        chunks: [
          { orig: "send her a", sound: "sen-der-ə", tip: "send + 'er + a 聽起來就像 sender-a" }
        ]
      },
      {
        speaker: "B",
        en: "That would be great, just tell them we will meet them in the lobby.",
        zh: "那太好了，就跟他們說我們會在飯店大廳跟他們會合。",
        ear: "Tha'-wʊd-bee great, jəs [te-ləm] we'll [mee-dəm] in the lobby.",
        cloze: ["tell them", "meet them"],
        chunks: [
          { orig: "tell them", sound: "te-ləm", tip: "tell + 'em" },
          { orig: "meet them", sound: "mee-dəm", tip: "meet + 'em 的 t 變彈舌 d" }
        ]
      },
      {
        speaker: "A",
        en: "Should we wait for him if he is running a few minutes late?",
        zh: "如果他遲到幾分鐘的話，我們要等他嗎？",
        ear: "Shʊd-we way' [fer-im] [i-feez] running ə few minutes late?",
        cloze: ["for him", "if he is"],
        chunks: [
          { orig: "for him", sound: "fer-im", tip: "for 弱讀為 fer，連 'im" },
          { orig: "if he is", sound: "i-feez", tip: "if + he's 連成 i-feez" }
        ]
      },
      {
        speaker: "B",
        en: "Yeah, let's give him ten minutes before we head out.",
        zh: "好，我們出發前再多給他十分鐘吧。",
        ear: "Yeah, lets [gi-vim] ten minutes before we [he-dout].",
        cloze: ["give him", "head out"],
        chunks: [
          { orig: "give him", sound: "gi-vim", tip: "give + 'im 連讀為 givim" },
          { orig: "head out", sound: "he-dout", tip: "出發、離開" }
        ]
      }
    ]
  },

  // ==================== ☕ 日常寒暄與社交 (Small Talk & Social) ====================
  {
    id: "small-01",
    category: "smalltalk",
    categoryName: "☕ 日常寒暄與社交",
    title: "Small Talk 01｜走廊巧遇、週末計畫與臨時改約 (Catch-up & Rain Check)",
    focus: "母語者最常講的寒暄連音句：How have you been / Can't complain / Take a rain check / Play it by ear",
    duration: "約 3 分鐘 · 8 句",
    lines: [
      {
        speaker: "A",
        en: "Hey! Long time no see, how have you been keeping lately?",
        zh: "嗨！好久不見，你最近過得怎麼樣？",
        ear: "Hey! Long time no see, [how-vyü-bin] keeping lately?",
        cloze: ["how have you been"],
        chunks: [
          { orig: "how have you been", sound: "how-vyü-bin", tip: "have 縮成 /v/，been 唸短音 /bɪn/" }
        ]
      },
      {
        speaker: "B",
        en: "Can't complain! Been super swamped with the new semester though.",
        zh: "還不錯啦！不過最近新學期真是忙翻了。",
        ear: "[Can'-cəm-plain]! Bin super [swamp-twith] the new semester though.",
        cloze: ["Can't complain", "swamped with"],
        chunks: [
          { orig: "Can't complain", sound: "Can'-cəm-plain", tip: "「還不錯、沒什麼好抱怨的」" },
          { orig: "swamped with", sound: "swamp-twith", tip: "忙得不可開交" }
        ]
      },
      {
        speaker: "A",
        en: "Tell me about it, this whole month has been a blur.",
        zh: "可不是嗎（我完全懂），這整個月忙到一眨眼就過了。",
        ear: "[Tel-mee-ə-bou-dit], this whole month [həz-bi-nə] blur.",
        cloze: ["Tell me about it", "has been a"],
        chunks: [
          { orig: "Tell me about it", sound: "Tel-mee-ə-bou-dit", tip: "表示強烈共鳴：「我也是、誰說不是呢！」" }
        ]
      },
      {
        speaker: "B",
        en: "By the way, are we still on for dinner tonight at seven?",
        zh: "順帶一提，我們今晚七點的晚餐還照舊嗎？",
        ear: "By the way, ar-we [stil-lon-fer] dinner [tə-nigh-dat] seven?",
        cloze: ["still on for", "tonight at"],
        chunks: [
          { orig: "still on for", sound: "stil-lon-fer", tip: "確認原定約會是否照舊" }
        ]
      },
      {
        speaker: "A",
        en: "I'm so sorry, something urgent just came up at the last minute.",
        zh: "真不好意思，最後一刻突然有件急事冒出來。",
        ear: "I'm so sorry, something urgent jəs [cay-mʌp] at the [las'-minute].",
        cloze: ["came up", "last minute"],
        chunks: [
          { orig: "came up", sound: "cay-mʌp", tip: "突然發生、冒出急事" }
        ]
      },
      {
        speaker: "A",
        en: "Do you mind if I take a rain check and reschedule for next week?",
        zh: "你介意我這次先欠著，改約下禮拜嗎？",
        ear: "[Djü-mind] i-fI [tay-kə-rain-check] ən reschedule fer nex'-week?",
        cloze: ["Do you mind", "take a rain check"],
        chunks: [
          { orig: "take a rain check", sound: "tay-kə rain check", tip: "這次改期、下次補請/補約" }
        ]
      },
      {
        speaker: "B",
        en: "No worries at all! Let's play it by ear once your schedule clears up.",
        zh: "完全沒關係！等你的行程比較空下來，我們再看情況決定。",
        ear: "No [wɜr-ree-zə-dall]! Lets [play-it-by-ear] once yer schedule [cleer-zʌp].",
        cloze: ["play it by ear", "clears up"],
        chunks: [
          { orig: "play it by ear", sound: "play-it-by-ear", tip: "到時候看情況隨機應變" },
          { orig: "clears up", sound: "cleer-zʌp", tip: "行程空出來、天氣放晴" }
        ]
      },
      {
        speaker: "A",
        en: "Thanks for understanding, dinner is definitely on me next time!",
        zh: "謝謝你的體諒，下次晚餐絕對算我的（我請客）！",
        ear: "Thanks fer understanding, dinner iz definitely [on-mee] nex'-time!",
        cloze: ["on me", "next time"],
        chunks: [
          { orig: "on me", sound: "on-mee", tip: "It's on me = 由我買單請客" }
        ]
      }
    ]
  },

  // ==================== ✈️ 商務差旅與餐飲 (Dining, Coffee & Travel) ====================
  {
    id: "din-01",
    category: "dining",
    categoryName: "✈️ 商務差旅與餐飲",
    title: "Travel & Dining 01｜美式餐廳點餐、桌邊服務與分帳買單",
    focus: "餐廳服務生超快連音問句：What can I get started for you / Put it all on one card",
    duration: "約 3 分鐘 · 8 句",
    lines: [
      {
        speaker: "A",
        en: "Hi folks! Welcome in, what can I get started for you to drink?",
        zh: "嗨各位！歡迎光臨，想先點些什麼飲料呢？",
        ear: "Hi folks! [Wel-cʌ-min], wha' [kə-nI] get [star-did-fer-yü] tə drink?",
        cloze: ["can I", "started for you"],
        chunks: [
          { orig: "What can I", sound: "Wha' kə-nI", tip: "can 弱化為 /kən/ 並連 I" },
          { orig: "get started for you", sound: "get star-did fer-yü", tip: "美式餐廳點飲料/前菜的標準開場" }
        ]
      },
      {
        speaker: "B",
        en: "Could we just start with sparkling water and a couple of minutes with the menu?",
        zh: "我們可以先來氣泡水，並請再給我們幾分鐘看一下菜單嗎？",
        ear: "Kʊd-we jəs start with sparkling wa-der ən [ə-cʌ-pə-lə] minutes with the menu?",
        cloze: ["start with", "couple of"],
        chunks: [
          { orig: "a couple of", sound: "ə-coupla /əˈkʌplə/", tip: "couple of 縮成 coupla" }
        ]
      },
      {
        speaker: "A",
        en: "Of course, take your time! I'll be right back to tell you about tonight's specials.",
        zh: "當然，請慢慢看！我馬上回來跟你們介紹今晚的主廚特餐。",
        ear: "Əv-course, [take-yer-time]! I'll-bee [righ'-back] tə tel-yü ə-bout tə-night's specials.",
        cloze: ["take your time", "right back"],
        chunks: [
          { orig: "take your time", sound: "take-yer-time", tip: "慢慢來、不用急" }
        ]
      },
      {
        speaker: "B",
        en: "Excuse me, we are ready to order whenever you get a chance.",
        zh: "不好意思，您有空的時候我們準備好可以點餐了。",
        ear: "Scuse-mee, we're [re-dee-tə] order whenever yü [ge-də-chance].",
        cloze: ["ready to", "get a chance"],
        chunks: [
          { orig: "whenever you get a chance", sound: "whenever yü ge-də-chance", tip: "禮貌呼喚服務生的萬用句尾" }
        ]
      },
      {
        speaker: "A",
        en: "How is everything tasting so far? Can I get you guys anything else?",
        zh: "目前餐點口味都還合意嗎？還需要幫你們加點什麼嗎？",
        ear: "[How-zeverything] tasting so far? Kə-nI [ge-chü-guys] anything else?",
        cloze: ["How is everything", "get you guys"],
        chunks: [
          { orig: "How is everything", sound: "How-zeverything", tip: "is 縮成 /z/ 連 everything" },
          { orig: "get you guys", sound: "ge-chü-guys", tip: "t + y 同化為 /tʃ/" }
        ]
      },
      {
        speaker: "B",
        en: "Everything was delicious, could we get a box for this and the check please?",
        zh: "所有餐點都非常美味，可以幫我們拿個打包盒，並幫我們結帳嗎？",
        ear: "Everything wəz delicious, kʊd-we [ge-də-box] fer this ən the check please?",
        cloze: ["get a box", "the check"],
        chunks: [
          { orig: "get a box", sound: "ge-də-box", tip: "美式餐廳通常給盒子讓客人自己裝外帶" }
        ]
      },
      {
        speaker: "A",
        en: "Sure thing! Did you want to put it all on one card or split it up?",
        zh: "沒問題！你們想要全部刷同一張卡，還是分開結？",
        ear: "Sure thing! [Di-jü-wa-nə] [pʊ-di-dall] on one card er [spli-di-dʌp]?",
        cloze: ["put it all", "split it up"],
        chunks: [
          { orig: "put it all", sound: "pʊ-di-dall", tip: "兩個 t 全部變彈舌 d 連音" },
          { orig: "split it up", sound: "spli-di-dʌp", tip: "分開結帳" }
        ]
      },
      {
        speaker: "B",
        en: "Just put it all on this card, you can tap it right here.",
        zh: "全部刷這張卡就好，直接感應這裡就可以。",
        ear: "Jəs [pʊ-di-dall] on this card, yü kən [ta-pit] righ'-here.",
        cloze: ["put it all", "tap it"],
        chunks: [
          { orig: "tap it", sound: "ta-pit", tip: "p 與 it 連音" }
        ]
      }
    ]
  }
];

// ==================== 📚 預先找好的精選教材來源庫 (Pre-Curated Authentic Sources) ====================
// 使用者可直接從這裡挑選真實風格來源，一鍵截取成 3 分鐘訓練單元！
window.EARFLOW_PRECURATED_SOURCES = [
  {
    id: "src-hbr-meeting",
    sourceBrand: "HBR IdeaCast 商務會議實錄",
    category: "meeting",
    badge: "會議英語 · 高階決策",
    title: "HBR 精選｜如何在跨國會議中優雅反對並達成共識 (Managing Pushback in Executive Meetings)",
    duration: "3 分鐘標準單元 (8 句)",
    originUrl: "https://hbr.org/podcasts",
    description: "摘錄自哈佛商業評論管理情境：當跨部門主管對專案優先序意見分歧時，母語高階主管如何用軟性鋪墊詞（Softening phrases）化解衝突並敲定結論。",
    rawScript: `I appreciate the effort that went into this proposal, but I have some reservations about the Q3 rollout. | 我很肯定這份提案投入的心力，但我對第三季的推出時程有些保留。
Could you walk us through what happens if the vendor fails to deliver on time? | 你能帶我們推演一下，如果供應商沒能準時交貨會發生什麼事嗎？
We have built a two-week buffer into the schedule specifically to account for supply chain delays. | 我們已經在時程表中預留了兩週的緩衝期，專門用來應對供應鏈延誤。
Even so, I think we should phase in the deployment starting with just two pilot hospitals. | 儘管如此，我認為我們應該採分階段導入，先從兩家先導醫院開始。
That actually makes a lot of sense, it lowers our risk exposure significantly. | 這其實非常有道理，能大幅降低我們承受的風險。
If everyone is on board with the phased approach, let's adjust the milestones accordingly. | 如果大家都贊同分階段的做法，我們就相應地調整里程碑吧。
I'll touch base with the legal team tomorrow morning to update the contract terms. | 我明天早上會跟法務團隊聯繫，更新合約條款。
Great job everyone, we managed to find a middle ground that works for all stakeholders. | 大家做得好，我們成功找到了一個讓所有利害關係人都可行的折衷方案。`
  },
  {
    id: "src-ted-ai-health",
    sourceBrand: "TED Talks 智慧醫療與 AI",
    category: "academic",
    badge: "學術演講 · 醫療科技",
    title: "TED 精選｜AI 如何改變臨床決策與醫護工作流 (AI at the Bedside: Clinical Decision Support)",
    duration: "3 分鐘標準單元 (8 句)",
    originUrl: "https://www.ted.com/topics/health",
    description: "針對健康科技與智慧醫療領域：探討臨床決策支援系統如何減輕醫護人員倦怠（Burnout），包含大量母語講者抑揚頓挫與連音語塊。",
    rawScript: `When you walk into an intensive care unit today, clinicians are drowning in data from dozens of monitors. | 當你今天走進加護病房時，臨床醫護人員正被數十台監視器的數據淹沒。
The problem isn't a lack of information, it is figuring out which signal actually matters right now. | 問題不在於缺乏資訊，而在於弄清楚當下哪個訊號才真正重要。
We trained our machine learning model to flag subtle physiological changes six hours before a crisis hits. | 我們訓練了機器學習模型，在危急狀況發生前六小時就標示出細微的生理變化。
At first, the nursing staff was skeptical about having another algorithm tell them what to do. | 起初，護理人員對於又有一個演算法來告訴他們該怎麼做感到懷疑。
So we sat down with them and redesigned the interface from the ground up. | 所以我們與他們坐下來，從頭徹底重新設計了使用者介面。
Instead of a black box score, the system now highlights the exact lab trends driving the alert. | 系統不再只給一個黑盒子分數，而是標出觸發警報的確切檢驗趨勢。
Within three months, false alarms dropped by forty percent, and nurses had more time for patient care. | 在三個月內，假警報下降了百分之四十，護理師也有更多時間照顧病患。
At the end of the day, technology should empower human empathy rather than get in the way. | 說到底，科技應該賦能人類的同理心，而不是成為阻礙。`
  },
  {
    id: "src-bbc-casual",
    sourceBrand: "BBC Learning English · 地道口語",
    category: "smalltalk",
    badge: "日常對話 · 連音密集",
    title: "BBC 6 Minute 精選｜辦公室閒聊與週末計畫的道地回應 (Office Banter & Weekend Plans)",
    duration: "3 分鐘標準單元 (8 句)",
    originUrl: "https://www.bbc.co.uk/learningenglish",
    description: "精選日常茶水間與走廊最自然的口語對談，密集訓練母語者極快掠過的弱讀助動詞與慣用俚語。",
    rawScript: `Morning! You look like you could use another cup of coffee, rough night? | 早安！你看起來很需要再來一杯咖啡，昨晚沒睡好嗎？
Tell me about it, my neighbors were having a party until two in the morning. | 別提了，我鄰居開派對吵到凌晨兩點。
Oh no, how did you even manage to get out of bed on time today? | 天啊，那你今天到底是怎麼準時爬出被窩的？
I set three alarms and pretty much rolled out of bed ten minutes before leaving. | 我設了三個鬧鐘，出門前十分鐘才幾乎是滾下床的。
Hopefully you can take it easy tonight and catch up on some rest. | 希望你今晚可以輕鬆一點，好好補個眠。
For sure, I'm going to order takeout and go straight to bed after dinner. | 一定，我打算叫外送，吃完晚飯就直接上床睡覺。
Let me know if you want me to cover for you during the afternoon briefing. | 如果下午簡報會需要我幫你代班掩護一下，隨時跟我說。
You are a lifesaver, I'll definitely take you up on that offer! | 你真是救星，我絕對會接受你這個好意提議的！`
  },
  {
    id: "src-stanford-panel",
    sourceBrand: "Stanford Med 圓桌論壇",
    category: "academic",
    badge: "會議英語 · 學術主持",
    title: "Stanford 醫療資訊論壇｜高齡長照科技與跨領域合作 (Aging Tech & Interdisciplinary Panel)",
    duration: "3 分鐘標準單元 (8 句)",
    originUrl: "https://med.stanford.edu/",
    description: "模擬國際健康科技圓桌論壇主持與與談學者交鋒，包含主持串場、補充觀點、回扣前一位講者的道地句型。",
    rawScript: `To kick off our panel discussion, I'd like to ask each of you where you see smart aging in five years. | 為展開我們的圓桌討論，我想請教各位，你們認為五年後的智慧高齡科技會發展到哪裡？
Building on what Dr. Miller mentioned earlier, home-based sensors are going to be a game changer. | 延續 Miller 博士剛才提到的觀點，居家感測器將會徹底改變遊戲規則。
The key challenge is making sure older adults don't feel like they are being watched all the time. | 關鍵挑戰在於確保高齡長者不會覺得自己隨時隨地都在被監視。
We found that ambient radar sensors work well because nobody has to wear a device. | 我們發現環境雷達感測器效果很好，因為沒有人需要穿戴任何裝置在身上。
How do you handle the data privacy side of things when families want real-time access? | 當家屬要求即時查看權限時，你們如何處理資料隱私這一塊？
We let the seniors set their own boundaries so they stay in control of who sees what. | 我們讓長者自己設定界線，讓他們掌握誰可以看到哪些資訊的主導權。
We only have a couple of minutes left, so let's open the floor to questions from the audience. | 我們只剩下幾分鐘了，現在開放現場聽眾提問。
Please step up to the microphone in the aisle and keep your question brief. | 請走到走道上的麥克風前，並請保持問題簡潔。`
  },
  {
    id: "src-tech-negotiation",
    sourceBrand: "Silicon Valley PM 跨國會議",
    category: "meeting",
    badge: "會議英語 · 預算與時程談判",
    title: "跨國專案談判｜當對方臨時加需求（Scope Creep）時的溝通話術",
    duration: "3 分鐘標準單元 (8 句)",
    originUrl: "https://hbr.org/",
    description: "當合作方或主管在會議中臨時要求增加功能或提早交期時，如何專業、不傷和氣地談條件交換（Trade-offs）。",
    rawScript: `We would love to include the bilingual dashboard in this release if possible. | 如果可能的話，我們非常希望在這次版本中加入雙語儀表板。
I understand how valuable that feature is, but adding it now will impact our launch date. | 我明白那個功能非常有價值，但現在加進去會影響我們的上線日期。
Is there any way we can pull it off without pushing back the deadline? | 有沒有任何辦法在不延後截止日的情況下把它做出來？
If the deadline is set in stone, we would have to drop one of the other modules to free up resources. | 如果截止日期是鐵板一塊不能動的，我們就必須先拿掉另一個模組來騰出資源。
Which module do you think we could hold off on until phase two? | 你覺得哪個模組我們可以先暫緩到第二階段再做？
The automated PDF export is nice to have, whereas the dashboard is a must-have for the client. | 自動匯出 PDF 屬於錦上添花，而儀表板對客戶來說則是必備核心。
Okay, let's swap those two items out and keep the target date unchanged. | 好，那我們就把這兩項對調，並保持目標日期不變。
I'll update the project roadmap right away so everyone knows what we agreed on. | 我馬上更新專案路線圖，讓所有人都清楚我們達成的共識。`
  },
  {
    id: "src-npr-travel",
    sourceBrand: "NPR Life Kit 美式生活實境",
    category: "dining",
    badge: "差旅實戰 · 快語速應對",
    title: "NPR 差旅實境｜航班取消、機場櫃檯改簽與飯店連繫 (Flight Disrupted & Rebooking)",
    duration: "3 分鐘標準單元 (8 句)",
    originUrl: "https://www.npr.org/",
    description: "出國開會最怕遇到的突發狀況：航班臨時因天候取消，地勤人員超快語速給出改簽選項與住宿補償。",
    rawScript: `I'm sorry folks, Flight 892 to San Francisco has just been canceled due to severe weather. | 各位抱歉，飛往舊金山的 892 號航班剛才因惡劣天候取消了。
Excuse me, I have a keynote presentation tomorrow afternoon, what is the earliest flight you can put me on? | 不好意思，我明天下午有一場主題演講，您能幫我排上的最早航班是哪一班？
Let me check what is available, all direct flights tonight are completely booked up. | 讓我查一下還有什麼空位，今晚所有的直飛航班都已經全滿了。
I can route you through Seattle leaving at six-thirty, which gets you in around midnight. | 我可以幫您改走六點半起飛經西雅圖轉機的路線，大約午夜會抵達。
Will my checked luggage automatically transfer over, or do I have to pick it up? | 我的托運行李會自動轉掛過去，還是我必須先領出來？
We will tag it all the way through to your final destination, so you don't have to worry about it. | 我們會幫您一路直掛到最終目的地，所以您不必擔心行李。
Here is your new boarding pass and a meal voucher you can use at any restaurant in the terminal. | 這是您的新登機證，還有一張可在航廈內任何餐廳使用的餐券。
Thank you so much for sorting that out so quickly, I really appreciate it! | 非常感謝您這麼快幫我處理好，真的很感激！`
  }
];
