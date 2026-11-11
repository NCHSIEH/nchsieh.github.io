// EarFlow 3分鐘微單元完整課程庫 (32 個核心場景單元 + 12 個預選權威語料來源)
// 每單元設計為「約 3 分鐘訓練量」（8 句完整來回交鋒對話：盲聽 45 秒 + 弱讀聽寫 60 秒 + 連音解剖與跟讀 75 秒 ≈ 3 分鐘）

window.EARFLOW_CATEGORIES = [
  { id: "all", name: "全部課程 (32)" },
  { id: "meeting", name: "💼 會議英語專區" },
  { id: "academic", name: "🎓 學術與國際研討會" },
  { id: "reduction", name: "⚡ 連音與弱讀急救" },
  { id: "smalltalk", name: "☕ 日常寒暄與社交" },
  { id: "travel", name: "✈️ 機場航空與交通" },
  { id: "dining", name: "🍽️ 餐廳咖啡廳與飯店" },
  { id: "medical", name: "🏥 醫療看診與藥局" },
  { id: "shopping", name: "🛒 購物消費與電話客服" },
  { id: "custom", name: "⭐ 自選來源 / 收藏" }
];

window.EARFLOW_DEFAULT_UNITS = [
  // ==================== 💼 會議英語專區 (Meeting English · 6 Units) ====================
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
    focus: "專案會議追進度必聽詞：bandwidth（心力/時間）、snag（小阻礙）、ballpark（粗估）",
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
    focus: "會議結束前 3 分鐘的關鍵交辦：top of the hour、on the same page、sign off、touch base",
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
        ear: "I kən [take-the-lee-don] drafting the budget section by Wenz-day.",
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
  {
    id: "meet-05",
    category: "meeting",
    categoryName: "💼 會議英語專區",
    title: "Meeting 05｜預算談判、臨時加需求與資源交換 (Scope Creep & Trade-offs)",
    focus: "當對方在會議中要求加功能又不延後交期時，母語主管如何談條件交換（set in stone / hold off on）",
    duration: "約 3 分鐘 · 8 句",
    lines: [
      {
        speaker: "A",
        en: "The client just asked if we could squeeze in a bilingual dashboard before launch.",
        zh: "客戶剛才問我們能不能在正式上線前，硬擠出一個雙語儀表板功能。",
        ear: "The client jəs [ask-tif] we kʊd [skwee-zin] ə bilingual dashboard before launch.",
        cloze: ["asked if", "squeeze in"],
        chunks: [
          { orig: "asked if", sound: "ask-tif", tip: "asked 的 -ed 發 /t/ 並與 if 連音" },
          { orig: "squeeze in", sound: "skwee-zin", tip: "在緊湊的時間或空間裡「硬塞進、擠出時間做」" }
        ]
      },
      {
        speaker: "B",
        en: "To be honest, adding a major feature this late in the game is pretty risky.",
        zh: "老實說，在專案都進行到這麼後期的階段才加大型功能，風險相當高。",
        ear: "[Tə-bee-ah-nist], adding ə major feature this [lay-din-the-game] iz pri-dee risky.",
        cloze: ["To be honest", "late in the game"],
        chunks: [
          { orig: "late in the game", sound: "lay-din-the-game", tip: "源自球賽末尾，指「在計畫或專案已經進入尾聲的階段」" }
        ]
      },
      {
        speaker: "A",
        en: "Is there any way we can pull it off without pushing back the deadline?",
        zh: "有沒有任何辦法在不延後截止日的情況下把它做出來？",
        ear: "Iz-there any way we kən [pʊ-li-doff] without [pʊ-shing-back] the deadline?",
        cloze: ["pull it off", "pushing back"],
        chunks: [
          { orig: "pull it off", sound: "pʊ-li-doff", tip: "克服困難成功辦到某事" }
        ]
      },
      {
        speaker: "B",
        en: "If the launch date is set in stone, we will have to drop something else.",
        zh: "如果上線日期是鐵板一塊不能動的，我們就必須先捨棄其他項目。",
        ear: "If the launch date iz [se-din-stone], we'll [haf-tə] drop something else.",
        cloze: ["set in stone", "have to"],
        chunks: [
          { orig: "set in stone", sound: "se-din-stone", tip: "刻在石頭上 = 鐵板釘釘、絕對不能更改" },
          { orig: "we will have to", sound: "we'll haf-tə", tip: "have to 無聲化為 hafta" }
        ]
      },
      {
        speaker: "A",
        en: "Which module do you think we could hold off on until phase two?",
        zh: "你覺得哪個模組我們可以先暫緩到第二階段再做？",
        ear: "Which module [djü-think] we kʊd [hol-doff-on] until phase two?",
        cloze: ["do you think", "hold off on"],
        chunks: [
          { orig: "hold off on", sound: "hol-doff-on", tip: "暫緩、延後執行某事" }
        ]
      },
      {
        speaker: "B",
        en: "The automated PDF report is nice to have, whereas the dashboard is a must-have.",
        zh: "自動匯出 PDF 報表屬於錦上添花，而儀表板則是必備核心。",
        ear: "The automated PDF report iz [nais-tə-hav], whereas the dashboard iz [ə-mʌst-hav].",
        cloze: ["nice to have", "must-have"],
        chunks: [
          { orig: "nice to have", sound: "nais-tə-hav", tip: "會議排優先序必用詞：有很好但非急迫的功能（對比 must-have）" }
        ]
      },
      {
        speaker: "A",
        en: "Fair enough, let's swap those two items out and keep the target date unchanged.",
        zh: "說得有理，那我們就把這兩項對調，並保持目標日期不變。",
        ear: "[Fair-i-nʌf], lets [swa-pthoze] two items out ən keep the target date unchanged.",
        cloze: ["Fair enough", "swap those"],
        chunks: [
          { orig: "Fair enough", sound: "Fair-i-nʌf", tip: "表示同意對方的折衷方案" }
        ]
      },
      {
        speaker: "B",
        en: "I'll run it by the product owner this afternoon so nobody is caught off guard.",
        zh: "我今天下午會先跟產品負責人報備一聲，這樣才不會有人措手不及。",
        ear: "I'll [rʌ-nit-by] the product owner this afternoon so nobody iz [caw-doff-guard].",
        cloze: ["run it by", "caught off guard"],
        chunks: [
          { orig: "run it by", sound: "rʌ-nit-by", tip: "run something by someone = 把想法或決定先拿給某人過目/報備" },
          { orig: "caught off guard", sound: "caw-doff-guard", tip: "措手不及" }
        ]
      }
    ]
  },
  {
    id: "meet-06",
    category: "meeting",
    categoryName: "💼 會議英語專區",
    title: "Meeting 06｜跨國危機處理與系統異常應變 (Crisis & Damage Control)",
    focus: "緊急應變會議：找出根本原因（root cause）、不推卸責任、先止血（stopgap）再徹底修復",
    duration: "約 3 分鐘 · 8 句",
    lines: [
      {
        speaker: "A",
        en: "Thanks for jumping on this call on such short notice, we have an urgent issue.",
        zh: "感謝大家在這麼臨時的通知下馬上連上會議，我們遇到了一個緊急狀況。",
        ear: "Thanks fer [jʌm-ping-on] this call on [sʌch-shor'-notice], we ha-vən urgent issue.",
        cloze: ["jumping on", "short notice"],
        chunks: [
          { orig: "on such short notice", sound: "on sʌch shor'-notice", tip: "在極為倉促、臨時的通知下" }
        ]
      },
      {
        speaker: "B",
        en: "What is going on? We saw a spike in error rates about twenty minutes ago.",
        zh: "發生什麼事了？我們大約二十分鐘前看到錯誤率突然飆高。",
        ear: "[Wha-ts] going on? We saw [ə-spai-kin] error rates ə-bou' twen-dee minutes ə-go.",
        cloze: ["spike in", "twenty minutes"],
        chunks: [
          { orig: "a spike in", sound: "ə-spai-kin", tip: "數據或錯誤率突然暴增、飆升" },
          { orig: "twenty", sound: "twen-dee / twen-nee", tip: "美式口語常將 nt 唸作 n (twennee)" }
        ]
      },
      {
        speaker: "A",
        en: "Have we narrowed down the root cause of the outage yet?",
        zh: "我們已經縮小範圍找出這次當機的根本原因了嗎？",
        ear: "Hav-we [na-row-down] the [roo'-cause] əv the outage yet?",
        cloze: ["narrowed down", "root cause"],
        chunks: [
          { orig: "narrowed down", sound: "na-row-down", tip: "縮小排查範圍" },
          { orig: "root cause", sound: "roo'-cause", tip: "根本原因" }
        ]
      },
      {
        speaker: "B",
        en: "It looks like the latest database patch triggered a memory leak on the main server.",
        zh: "看起來是最新的資料庫修補程式在主伺服器上觸發了記憶體洩漏。",
        ear: "It [lʊk-slaik] the latest day-də-base patch [tri-ger-də] memory leak on the main server.",
        cloze: ["looks like", "triggered a"],
        chunks: [
          { orig: "triggered a", sound: "tri-ger-də", tip: "過去式 -ed (/d/) 連後面的 a" }
        ]
      },
      {
        speaker: "A",
        en: "Can we roll back to the previous version as a quick stopgap measure?",
        zh: "我們可以先退回上一個版本，作為快速的暫時止血措施嗎？",
        ear: "Kən-we [rol-back] tə the previous version əz ə quick [stap-gap] measure?",
        cloze: ["roll back", "stopgap measure"],
        chunks: [
          { orig: "roll back", sound: "rol-back", tip: "系統退回前一穩定版本" },
          { orig: "stopgap measure", sound: "stap-gap measure", tip: "權宜之計、暫時止血的應急措施" }
        ]
      },
      {
        speaker: "B",
        en: "Yes, we are rolling it back right now, everything should be back up in five minutes.",
        zh: "可以，我們現在正在退回版本，所有服務應該五分鐘內就會恢復正常。",
        ear: "Yes, we're [ro-ling-it-back] righ'-now, everything shʊd-bee [ba-kʌp] in five minutes.",
        cloze: ["rolling it back", "back up"],
        chunks: [
          { orig: "back up", sound: "ba-kʌp", tip: "系統恢復上線運作（be back up and running）" }
        ]
      },
      {
        speaker: "A",
        en: "Good call, let's put out a brief statement so our users aren't left in the dark.",
        zh: "明智的決定，我們發個簡短聲明，別讓使用者被蒙在鼓裡乾著急。",
        ear: "[Gʊd-call], lets [pʊ-dou-də] brief statement so our users aren't [lef-tin-the-dark].",
        cloze: ["put out a", "left in the dark"],
        chunks: [
          { orig: "Good call", sound: "Gʊd-call", tip: "稱讚對方「決定得好、判斷正確」" },
          { orig: "left in the dark", sound: "lef-tin-the-dark", tip: "被蒙在鼓裡、毫不知情" }
        ]
      },
      {
        speaker: "B",
        en: "Once the dust settles, we will schedule a post-mortem to prevent this from happening again.",
        zh: "等事情平息下來後，我們會排一場事後檢討會，防止類似情況再次發生。",
        ear: "Once the [dʌs'-se-dəlz], we'll schedule ə [post-mor-dəm] tə prevent this frəm happening ə-gain.",
        cloze: ["dust settles", "post-mortem"],
        chunks: [
          { orig: "Once the dust settles", sound: "Once the dʌs'-se-dəlz", tip: "等塵埃落定、混亂平息之後" },
          { orig: "post-mortem", sound: "post-mor-dəm", tip: "源自醫學驗屍，商務/工程界指「專案或事故後的不究責檢討會」" }
        ]
      }
    ]
  },

  // ==================== 🎓 學術與國際研討會 (Academic & Conferences · 4 Units) ====================
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
  {
    id: "acad-03",
    category: "academic",
    categoryName: "🎓 學術與國際研討會",
    title: "Academic 03｜研討會晚宴寒暄、時差適應與學者交流 (Conference Banquet Chat)",
    focus: "晚宴背景噪音下的快語速寒暄：jet lag treating you、wide awake、stick around",
    duration: "約 3 分鐘 · 8 句",
    lines: [
      {
        speaker: "A",
        en: "Is this seat taken, or do you mind if I join you guys?",
        zh: "請問這個位子有人坐嗎，你們介意我坐這嗎？",
        ear: "Iz-this [see'-tay-kən], er [djü-mind] i-fI join-yü guys?",
        cloze: ["seat taken", "do you mind"],
        chunks: [
          { orig: "seat taken", sound: "see'-tay-kən", tip: "seat 的 t 停頓後直接唸 taken" },
          { orig: "do you mind if I", sound: "djü-mind i-fI", tip: "禮貌詢問同桌入座的標準句" }
        ]
      },
      {
        speaker: "B",
        en: "Not at all, please have a seat! How has the jet lag been treating you?",
        zh: "完全不介意，請坐！自從抵達後，時差還好嗎（有沒有折磨你）？",
        ear: "[Na-də-dall], please [ha-və-seat]! How həz the jet lag [bin-tree-ding-yü]?",
        cloze: ["Not at all", "been treating you"],
        chunks: [
          { orig: "Not at all", sound: "Na-də-dall", tip: "兩個 t 皆變成美式彈舌 d，聽起來像 Nadadall" },
          { orig: "been treating you", sound: "bin-tree-ding-yü", tip: "How is X treating you = 詢問適應狀況的道地問法" }
        ]
      },
      {
        speaker: "A",
        en: "To be honest, I woke up wide awake at three in the morning today.",
        zh: "老實說，我今天凌晨三點就完全清醒地醒來了。",
        ear: "[Tə-bee-ah-nist], I [wo-kʌp] [wai-də-wake] at three in the morning tə-day.",
        cloze: ["woke up", "wide awake"],
        chunks: [
          { orig: "woke up wide awake", sound: "wo-kʌp wai-də-wake", tip: "k 連 up，wide 的 d 連 awake" }
        ]
      },
      {
        speaker: "B",
        en: "Hang in there, the first couple of days are always the hardest.",
        zh: "撐著點，前兩天總是最難熬的。",
        ear: "[Hang-in-there], the firs' [cʌ-pə-lə] days er always the hardest.",
        cloze: ["Hang in there", "couple of"],
        chunks: [
          { orig: "couple of", sound: "coupla /ˈkʌplə/", tip: "couple of 在口語中幾乎都縮讀為 coupla" }
        ]
      },
      {
        speaker: "A",
        en: "Are you sticking around for a few days after the conference wraps up?",
        zh: "研討會結束後，你會多留幾天嗎？",
        ear: "Ar-yü [stik-king-ə-round] fer ə few days after the conference [rap-sʌp]?",
        cloze: ["sticking around", "wraps up"],
        chunks: [
          { orig: "sticking around", sound: "stik-king-ə-round", tip: "多待一陣子、不急著離開" },
          { orig: "wraps up", sound: "rap-sʌp", tip: "圓滿結束" }
        ]
      },
      {
        speaker: "B",
        en: "I wish I could, but I have to fly back on Saturday to teach my Monday class.",
        zh: "我也很想，但我週六就得飛回去，好趕上週一的課。",
        ear: "I [wi-shI-kʊd], bə-dI [haf-tə] fly back on Sa-der-day tə teach my Monday class.",
        cloze: ["wish I could", "have to"],
        chunks: [
          { orig: "I wish I could", sound: "I wi-shI-kʊd", tip: "表達「我也很想（但沒辦法）」的萬用句" },
          { orig: "Saturday", sound: "Sa-der-day", tip: "美式口語 Saturday 的 t 必變彈舌 d" }
        ]
      },
      {
        speaker: "A",
        en: "We are hosting a symposium in Taipei next spring, you should definitely come visit!",
        zh: "我們明年春天會在台北主辦一場研討會，您一定要來訪問交流！",
        ear: "We're hosting ə symposium in Taipei nex'-spring, yü shʊd definitely [cʌm-vi-zit]!",
        cloze: ["next spring", "come visit"],
        chunks: [
          { orig: "come visit", sound: "cʌm-vi-zit", tip: "美式口語常省略 come and visit 中間的 and/to" }
        ]
      },
      {
        speaker: "B",
        en: "Count me in! Let's exchange cards so we can stay in touch.",
        zh: "算我一份！我們交換個名片，保持聯繫。",
        ear: "[Coun'-mee-in]! Lets exchange cards so we kən [stay-in-tʌch].",
        cloze: ["Count me in", "stay in touch"],
        chunks: [
          { orig: "Count me in", sound: "Coun'-mee-in", tip: "「算我一份、我一定參加！」" }
        ]
      }
    ]
  },
  {
    id: "acad-04",
    category: "academic",
    categoryName: "🎓 學術與國際研討會",
    title: "Academic 04｜期刊審稿意見回覆與共同作者討論 (Peer Review & Revision)",
    focus: "研究團隊討論 Major Revision、Reviewer 2 的尖銳意見與補做實驗時程",
    duration: "約 3 分鐘 · 8 句",
    lines: [
      {
        speaker: "A",
        en: "Did you see the decision letter from the editor that came in this morning?",
        zh: "你有看到今天早上收到的期刊主編審查決定信嗎？",
        ear: "[Di-jü] see the decision le-der frəm the editor that [cay-min] this morning?",
        cloze: ["Did you", "came in"],
        chunks: [
          { orig: "came in", sound: "cay-min", tip: "信件或消息「寄達、進來」" }
        ]
      },
      {
        speaker: "B",
        en: "Yes! Getting a major revision at a top-tier journal is actually a great sign.",
        zh: "有！在頂尖期刊拿到「大幅修改後重審（Major Revision）」其實是很棒的訊號。",
        ear: "Yes! [Ge-ding-ə] major revision a-də top-tier journal iz actually ə gray'-sign.",
        cloze: ["Getting a", "top-tier"],
        chunks: [
          { orig: "Getting a", sound: "Ge-ding-ə", tip: "tt 變彈舌 d 並連 a" }
        ]
      },
      {
        speaker: "A",
        en: "Reviewer One was very supportive, but Reviewer Two really tore into our methodology.",
        zh: "一號審稿人非常正面支持，但二號審稿人對我們的研究方法批得很兇。",
        ear: "Reviewer One wəz very supportive, bət Reviewer Two really [tor-in-tə] our methodology.",
        cloze: ["tore into", "methodology"],
        chunks: [
          { orig: "tore into", sound: "tor-in-tə", tip: "tear into = 猛烈批評、嚴厲挑剔" }
        ]
      },
      {
        speaker: "B",
        en: "Don't let it get to you, most of their comments are actually pretty straightforward to address.",
        zh: "別放在心上，他們絕大多數的意見其實都滿容易正面回覆解決的。",
        ear: "Don' [le-dit-ge'-tə-yü], mos-təv their comments er actually pri-dee straightforward tə address.",
        cloze: ["get to you", "most of"],
        chunks: [
          { orig: "Don't let it get to you", sound: "Don' le-dit ge'-tə-yü", tip: "安慰別人「別因此氣餒、別往心裡去」" },
          { orig: "most of", sound: "mos-təv", tip: "t 連 əv" }
        ]
      },
      {
        speaker: "A",
        en: "Do we need to run a whole new set of ablation studies, or just clarify the text?",
        zh: "我們需要重跑一整套消融實驗（Ablation Study），還是只要在內文中解釋清楚？",
        ear: "Də-we need tə [rʌ-nə] whole new [se-dəv] ablation studies, er jəs clarify the text?",
        cloze: ["run a", "set of"],
        chunks: [
          { orig: "set of", sound: "se-dəv", tip: "set 的 t 遇 of 變彈舌 d" }
        ]
      },
      {
        speaker: "B",
        en: "If we add one extra table in the appendix, that should put their concerns to rest.",
        zh: "如果我們在附錄多加一張數據表，應該就能徹底消除他們的疑慮。",
        ear: "If-we [a-dwʌn] extra table in the appendix, that shʊd pʊt their concerns [tə-rest].",
        cloze: ["add one", "to rest"],
        chunks: [
          { orig: "put their concerns to rest", sound: "pʊt their concerns tə-rest", tip: "put ... to rest = 徹底消除（疑慮或爭論）" }
        ]
      },
      {
        speaker: "A",
        en: "How much time did the journal give us to turn the point-by-point response around?",
        zh: "期刊給我們多少時間完成逐點回覆（Point-by-point response）並交回去？",
        ear: "How much time did the journal [gi-vʌs] tə turn the point-by-point response [ə-round]?",
        cloze: ["give us", "turn ... around"],
        chunks: [
          { orig: "turn ... around", sound: "turn ... ə-round", tip: "turn something around = 完成處理並交付回來" }
        ]
      },
      {
        speaker: "B",
        en: "We have six weeks, so let's divide and conquer the rebuttal items today.",
        zh: "我們有六週時間，所以我們今天就來分工合作（各個擊破）這些回覆項目吧。",
        ear: "We hav six weeks, so lets [di-vai-dən-con-ker] the rebuttal items tə-day.",
        cloze: ["divide and conquer", "rebuttal"],
        chunks: [
          { orig: "divide and conquer", sound: "di-vai-dən-con-ker", tip: "分工合作、各個擊破" }
        ]
      }
    ]
  },

  // ==================== ⚡ 連音與弱讀急救 (Connected Speech & Reductions · 4 Units) ====================
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
  {
    id: "red-03",
    category: "reduction",
    categoryName: "⚡ 連音與弱讀急救",
    title: "Reduction 03｜美式彈舌 T、同化音與連珠炮問句 (Whatcha / Didja / Put it on)",
    focus: "母音間的 T 全變 D 音（put it on -> pudidon），加上 T/D + Y 同化成 ch/j 音",
    duration: "約 3 分鐘 · 8 句",
    lines: [
      {
        speaker: "A",
        en: "What are you up to this afternoon? Do you have a minute to chat?",
        zh: "你今天下午要忙什麼？有幾分鐘可以聊一下嗎？",
        ear: "[Wha-chü] up-tə this afternoon? [Djü-ha-və] minute tə chat?",
        cloze: ["What are you", "have a minute"],
        chunks: [
          { orig: "What are you", sound: "Wha-chü / Wha-der-yü", tip: "極高頻縮讀，聽起來像 Whatcha" },
          { orig: "Do you have a", sound: "Djü-ha-və", tip: "Do you 壓縮為單音節 Djü" }
        ]
      },
      {
        speaker: "B",
        en: "Not a lot, I'm just trying to catch up on my emails.",
        zh: "沒特別忙什麼，我只是想把累積的信件回完。",
        ear: "[Na-də-lot], I'm jəs [trai-nə] [ca-chʌp] on my emails.",
        cloze: ["Not a lot", "trying to"],
        chunks: [
          { orig: "Not a lot", sound: "Na-də-lot", tip: "Not + a 連成 Nadə" },
          { orig: "trying to", sound: "tryna /ˈtraɪnə/", tip: "口語中 trying to 常縮為 tryna" }
        ]
      },
      {
        speaker: "A",
        en: "Did you get a chance to check it out after I sent it over?",
        zh: "我把資料寄過去之後，你有空看過了嗎？",
        ear: "[Di-jü] [ge-də] chance tə [che-ki-dout] after I [sen-di-do-ver]?",
        cloze: ["check it out", "sent it over"],
        chunks: [
          { orig: "check it out", sound: "che-ki-dout", tip: "k 連 it，it 的 t 變彈舌 d 連 out" },
          { orig: "sent it over", sound: "sen-di-do-ver", tip: "兩個 t 皆變彈舌 d 連音" }
        ]
      },
      {
        speaker: "B",
        en: "I looked at it briefly, but I haven't gone through the whole thing yet.",
        zh: "我有稍微看了一下，但我還沒把整份看完。",
        ear: "I [lʊk-da-dit] briefly, bə-dI haven't gone through the whole thing yet.",
        cloze: ["looked at it", "gone through"],
        chunks: [
          { orig: "looked at it", sound: "lʊk-ta-dit", tip: "looked (/t/) + at + it 三字連成 look-ta-dit" }
        ]
      },
      {
        speaker: "A",
        en: "Don't you think we should put it on the agenda for Monday?",
        zh: "你不覺得我們應該把它排進週一的會議議程裡嗎？",
        ear: "[Don-chü] think we shʊd [pʊ-di-don] the agenda fer Monday?",
        cloze: ["Don't you", "put it on"],
        chunks: [
          { orig: "Don't you", sound: "Don-chü /ˈdoʊntʃə/", tip: "t + y 同化為 /tʃ/" },
          { orig: "put it on", sound: "pʊ-di-don", tip: "經典雙彈舌連音，聽起來像 pudidon" }
        ]
      },
      {
        speaker: "B",
        en: "Good idea, let me write it down before it slips my mind.",
        zh: "好主意，趁我還沒忘記，讓我現在就把它記下來。",
        ear: "[Gʊ-dai-dee-ə], [le-mee] [wri-dit] down before it [slips-my-mind].",
        cloze: ["let me", "slips my mind"],
        chunks: [
          { orig: "Good idea", sound: "Gʊ-dai-dee-ə", tip: "d 與 idea 連音" },
          { orig: "slips my mind", sound: "slips my mind", tip: "不小心忘記、從腦海中溜走" }
        ]
      },
      {
        speaker: "A",
        en: "What did you end up deciding about the keynote speaker?",
        zh: "關於主題演講講者的人選，你們最後決定得怎麼樣了？",
        ear: "[Wha-djü] [en-dʌp] deciding ə-bout the keynote speaker?",
        cloze: ["What did you", "end up"],
        chunks: [
          { orig: "What did you", sound: "Wha-djü /ˈwʌdʒə/", tip: "What + did + you 三字濃縮成兩音節 Whadjü" },
          { orig: "end up", sound: "en-dʌp", tip: "最後結果變成..." }
        ]
      },
      {
        speaker: "B",
        en: "We are going to reach out to Dr. Evans first and see if she is free.",
        zh: "我們打算先聯繫 Evans 博士，看看她有沒有空。",
        ear: "We're [gə-nə] [ree-chout] tə Dr. Evans firs' ən see if she'z free.",
        cloze: ["going to", "reach out"],
        chunks: [
          { orig: "reach out to", sound: "ree-chout tə", tip: "主動聯繫某人" }
        ]
      }
    ]
  },
  {
    id: "red-04",
    category: "reduction",
    categoryName: "⚡ 連音與弱讀急救",
    title: "Reduction 04｜數字、金額、日期與時間的快語速陷阱 (15 vs 50 / Time & Numbers)",
    focus: "母語者不靠字尾 -n 區分 15 與 50，而是靠「重音與彈舌 D」！以及時間與百分比速聽",
    duration: "約 3 分鐘 · 8 句",
    lines: [
      {
        speaker: "A",
        en: "Did she say the registration fee is one-fifteen or one-fifty?",
        zh: "她剛才是說報名費是 115 塊還是 150 塊美金？",
        ear: "Did-she say the registration fee iz [wʌn-fif-TEEN] er [wʌn-FIF-dee]?",
        cloze: ["one-fifteen", "one-fifty"],
        chunks: [
          { orig: "fifteen vs fifty", sound: "fif-TEEN vs FIF-dee", tip: "15 重音在後且 T 清脆；50 重音在前且 T 變彈舌 D (FIF-dee)" }
        ]
      },
      {
        speaker: "B",
        en: "It is a hundred and fifty bucks if you sign up before the twentieth.",
        zh: "如果你在 20 號之前報名，是 150 塊美金。",
        ear: "I-ts [ə-hʌn-drə-dən-FIF-dee] bucks i-fyü [sai-nʌp] before the twen-dee-ith.",
        cloze: ["hundred and fifty", "sign up"],
        chunks: [
          { orig: "a hundred and fifty", sound: "ə-hʌn-drə-dən-FIF-dee", tip: "and 縮成 /ən/，黏在 hundred 後面" }
        ]
      },
      {
        speaker: "A",
        en: "Gotcha, and the shuttle bus leaves at a quarter to eight, right?",
        zh: "懂了，然後接駁巴士是七點四十五分（差一刻八點）發車對吧？",
        ear: "[Ga-chə], ən the shuttle bus leev-zə-də [kwor-der-tə-eight], right?",
        cloze: ["Gotcha", "quarter to eight"],
        chunks: [
          { orig: "a quarter to eight", sound: "ə kwor-der-tə-eight", tip: "quarter to eight = 7:45；quarter past eight = 8:15" }
        ]
      },
      {
        speaker: "B",
        en: "Yep, they run every fifteen minutes between seven and nine-thirty.",
        zh: "對，它們在七點到九點半之間，每 15 分鐘發一班車。",
        ear: "Yep, they rʌn every [fif-TEEN] minutes between se-vən ən [nain-THIR-dee].",
        cloze: ["every fifteen", "nine-thirty"],
        chunks: [
          { orig: "nine-thirty", sound: "nain-THIR-dee", tip: "thirty 的 두 번째 t 必唸彈舌 d (thir-dee)" }
        ]
      },
      {
        speaker: "A",
        en: "How many people showed up for the morning workshop yesterday?",
        zh: "昨天早上的工作坊有多少人出席？",
        ear: "How many people [sho-dʌp] fer the morning workshop yesterday?",
        cloze: ["showed up", "morning workshop"],
        chunks: [
          { orig: "showed up", sound: "sho-dʌp", tip: "出席、到場" }
        ]
      },
      {
        speaker: "B",
        en: "Roughly two-thirds of the eighty registered participants were there.",
        zh: "80 位報名參加者中，大約有三分之二的人到場。",
        ear: "Roughly [tü-thɜrdz-əv] the [AY-dee] registered participants wer there.",
        cloze: ["two-thirds of", "eighty"],
        chunks: [
          { orig: "eighty", sound: "AY-dee /ˈeɪɾi/", tip: "80 (eighty) 的 t 是彈舌 d，重音在第一音節 AY" }
        ]
      },
      {
        speaker: "A",
        en: "Can I get your phone number just in case we get separated in the crowd?",
        zh: "可以請你留個電話號碼給我嗎，以防萬一我們在人群中走散？",
        ear: "Kə-nI [ge-cher] phone number [jʌs-tin-case] we get separated in the crowd?",
        cloze: ["get your", "just in case"],
        chunks: [
          { orig: "just in case", sound: "jʌs-tin-case", tip: "以防萬一；t 連 in" }
        ]
      },
      {
        speaker: "B",
        en: "Sure, it is four-oh-eight, five-five-five, oh-one-nine-two.",
        zh: "當然，號碼是 408-555-0192。",
        ear: "Sure, i-ts [for-oh-eight], five-five-five, [oh-wʌn-nain-tü].",
        cloze: ["four-oh-eight", "oh-one-nine-two"],
        chunks: [
          { orig: "oh (0)", sound: "oh /oʊ/", tip: "電話號碼與房號中的 0，母語者 95% 唸成字母 O (oh) 而非 zero" }
        ]
      }
    ]
  },

  // ==================== ☕ 日常寒暄與社交 (Small Talk & Social · 4 Units) ====================
  {
    id: "small-01",
    category: "smalltalk",
    categoryName: "☕ 日常寒暄與社交",
    title: "Small Talk 01｜走廊巧遇、近況更新與臨時改約 (Catch-up & Rain Check)",
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
  {
    id: "small-02",
    category: "smalltalk",
    categoryName: "☕ 日常寒暄與社交",
    title: "Small Talk 02｜週末計畫、天氣變化與休閒運動 (Weekend & Weather Banter)",
    focus: "電梯與茶水間最常發生的 60 秒破冰對話：get away / cooped up / call for rain",
    duration: "約 3 分鐘 · 8 句",
    lines: [
      {
        speaker: "A",
        en: "Thank goodness it is Friday! Do you have anything fun lined up for the weekend?",
        zh: "謝天謝地終於週五了！你這週末有安排什麼好玩的活動嗎？",
        ear: "Thank goodness i-ts Friday! Djü hav anything fʌn [lain-dʌp] fer the weekend?",
        cloze: ["lined up", "for the weekend"],
        chunks: [
          { orig: "lined up", sound: "lain-dʌp", tip: "have something lined up = 已經安排好、排定某活動" }
        ]
      },
      {
        speaker: "B",
        en: "We are thinking of heading up to the mountains to get away from the city.",
        zh: "我們在想說要去山上走走，遠離一下城市喧囂。",
        ear: "We're [thin-king-əv] [he-ding-ʌp] tə the mountains tə [ge-də-way] frəm the city.",
        cloze: ["heading up", "get away"],
        chunks: [
          { orig: "get away", sound: "ge-də-way", tip: "外出渡假、暫時逃離日常繁忙" }
        ]
      },
      {
        speaker: "A",
        en: "That sounds amazing, I feel like I've been cooped up indoors all week.",
        zh: "聽起來太棒了，我覺得自己整週都被關在室內悶壞了。",
        ear: "That sounz ə-mazing, I feel lai-kI'v bin [coop-tʌp] indoors all week.",
        cloze: ["feel like", "cooped up"],
        chunks: [
          { orig: "cooped up", sound: "coop-tʌp", tip: "像雞被關在籠子裡 = 悶在室內太久沒出門" }
        ]
      },
      {
        speaker: "B",
        en: "Hopefully the weather holds up, the forecast was calling for rain on Sunday.",
        zh: "希望好天氣能維持住，氣象預報說週日可能會下雨。",
        ear: "Hopefully the weather [hol-dzʌp], the forecast wəz [caw-ling-fer] rain on Sunday.",
        cloze: ["holds up", "calling for"],
        chunks: [
          { orig: "calling for rain", sound: "caw-ling fer rain", tip: "氣象預報「預測會有雨」的道地說法" }
        ]
      },
      {
        speaker: "A",
        en: "Even if it drizzles a bit, the fresh air will do you some good.",
        zh: "就算飄一點毛毛雨，呼吸新鮮空氣對你也會很有好處。",
        ear: "Even i-fit [dri-zəl-zə-bit], the fresh air wil [dü-yü-səm-gʊd].",
        cloze: ["drizzles a bit", "do you some good"],
        chunks: [
          { orig: "do you some good", sound: "dü-yü-səm-gʊd", tip: "對某人身心有益處" }
        ]
      },
      {
        speaker: "B",
        en: "How about you? Are you taking it easy or catching up on family time?",
        zh: "那你呢？打算放輕鬆休息，還是陪陪家人？",
        ear: "How-ə-bou-chü? Ar-yü [tay-king-i-dee-zee] er [ca-ching-ʌ-pon] family time?",
        cloze: ["taking it easy", "catching up on"],
        chunks: [
          { orig: "taking it easy", sound: "tay-king-i-dee-zee", tip: "放輕鬆、不排滿行程" }
        ]
      },
      {
        speaker: "A",
        en: "Mostly just running errands and taking my kids to their soccer game.",
        zh: "大部分就是跑腿辦點日常雜事，還有帶小孩去踢足球比賽。",
        ear: "Mostly jəs [rʌ-ning-e-rəndz] ən taking my kids tə their soccer game.",
        cloze: ["running errands", "soccer game"],
        chunks: [
          { orig: "running errands", sound: "rʌ-ning e-rəndz", tip: "出門辦日常瑣事（買菜、寄信、去銀行等）" }
        ]
      },
      {
        speaker: "B",
        en: "Have a great weekend, I'll see you bright and early on Monday!",
        zh: "祝你有個美好的週末，我們週一一大早見！",
        ear: "[Ha-və-gray'] weekend, I'll see-yü [brai-dən-early] on Monday!",
        cloze: ["great weekend", "bright and early"],
        chunks: [
          { orig: "bright and early", sound: "brai-dən-early", tip: "一大清早、準時有精神地" }
        ]
      }
    ]
  },
  {
    id: "small-03",
    category: "smalltalk",
    categoryName: "☕ 日常寒暄與社交",
    title: "Small Talk 03｜美劇與母語者高頻慣用口語 (Everyday Idioms in Action)",
    focus: "每個單字都簡單，合在一起卻聽不懂的母語片語：wrap my head around / up in the air / out of the question",
    duration: "約 3 分鐘 · 8 句",
    lines: [
      {
        speaker: "A",
        en: "I still can't wrap my head around why they reorganized the department.",
        zh: "我還是想不通他們為什麼要改組整個部門。",
        ear: "I still can' [rap-my-he-də-round] why they reorganized the department.",
        cloze: ["wrap my head around"],
        chunks: [
          { orig: "wrap my head around", sound: "rap-my-he-də-round", tip: "理解、想通某件令人費解的事" }
        ]
      },
      {
        speaker: "B",
        en: "It caught everyone off guard, nobody saw it coming at all.",
        zh: "這讓所有人都措手不及，完全沒有人預料到會這樣。",
        ear: "It [cau-deveryone] [off-guard], nobody [saw-it-cʌ-ming] ə-dall.",
        cloze: ["off guard", "saw it coming"],
        chunks: [
          { orig: "saw it coming", sound: "saw-it-cʌ-ming", tip: "事先預料到某事會發生" }
        ]
      },
      {
        speaker: "A",
        en: "Have they figured out who is going to take over the new division?",
        zh: "他們搞定好誰要接手那個新部門了嗎？",
        ear: "Hav-they [fi-gyer-dout] who'z gə-nə [tay-ko-ver] the new division?",
        cloze: ["figured out", "take over"],
        chunks: [
          { orig: "take over", sound: "tay-ko-ver", tip: "接管、接手負責" }
        ]
      },
      {
        speaker: "B",
        en: "Nope, everything is still up in the air until the board meets next month.",
        zh: "還沒，在下個月董事會開會之前，所有事情都還懸而未決。",
        ear: "Nope, everything iz still [ʌ-pin-the-air] until the board meets nex'-month.",
        cloze: ["up in the air", "next month"],
        chunks: [
          { orig: "up in the air", sound: "ʌ-pin-the-air", tip: "懸在半空中 = 尚未定案、充滿變數" }
        ]
      },
      {
        speaker: "A",
        en: "Hiring someone from outside is pretty much out of the question, right?",
        zh: "從外部找人空降基本上是不可能的事，對吧？",
        ear: "Hiring someone frəm outside iz [pri-dee-much] [ou-də-the-question], right?",
        cloze: ["pretty much", "out of the question"],
        chunks: [
          { orig: "out of the question", sound: "ou-də-the-question", tip: "完全不可能、免談" }
        ]
      },
      {
        speaker: "B",
        en: "Yeah, at the end of the day, it comes down to budget constraints.",
        zh: "對啊，說到底（歸根結底），還是受限於預算考量。",
        ear: "Yeah, [at-the-en-dəv-the-day], it [cʌmz-down-tə] budget constraints.",
        cloze: ["end of the day", "comes down to"],
        chunks: [
          { orig: "At the end of the day", sound: "At-the-en-dəv-the-day", tip: "說到底、歸根結底" }
        ]
      },
      {
        speaker: "A",
        en: "Let's just keep a low profile and focus on our own projects for now.",
        zh: "我們暫時就保持低調，專注在我們自己的計畫上吧。",
        ear: "Lets jəs [kee-pə-low-profile] ən [fo-kə-son] our own projects fer now.",
        cloze: ["low profile", "focus on"],
        chunks: [
          { orig: "keep a low profile", sound: "kee-pə low profile", tip: "保持低調、不強出頭" }
        ]
      },
      {
        speaker: "B",
        en: "You can say that again! No need to rock the boat right now.",
        zh: "你說得太對了！現在完全沒必要去無事生非（打破平衡）。",
        ear: "[Yü-kən-say-tha-də-gain]! No need tə [rak-the-boat] righ'-now.",
        cloze: ["say that again", "rock the boat"],
        chunks: [
          { orig: "You can say that again", sound: "Yü-kən-say-tha-də-gain", tip: "意思是「我百分之百同意你！」（不是叫對方再講一次）" },
          { orig: "rock the boat", sound: "rak-the-boat", tip: "搖晃船隻 = 節外生枝、破壞現狀穩定" }
        ]
      }
    ]
  },
  {
    id: "small-04",
    category: "smalltalk",
    categoryName: "☕ 日常寒暄與社交",
    title: "Small Talk 04｜鄰居寒暄、代收包裹與居家生活 (Neighborhood & Home Chat)",
    focus: "出國短期訪問學人或居住時與鄰居、管理員的自然口語互動",
    duration: "約 3 分鐘 · 8 句",
    lines: [
      {
        speaker: "A",
        en: "Hi neighbor! A package was left on my porch by mistake, I think it is yours.",
        zh: "嗨鄰居！有個包裹被誤放在我家門廊上了，我想那是你的。",
        ear: "Hi neighbor! Ə package wəz [lef-ton] my porch [by-mi-stake], I think i-ts yorz.",
        cloze: ["left on", "by mistake"],
        chunks: [
          { orig: "left on", sound: "lef-ton", tip: "t 連後面的 on" },
          { orig: "by mistake", sound: "by-mi-stake", tip: "不小心弄錯、誤放" }
        ]
      },
      {
        speaker: "B",
        en: "Oh, thank you so much! I was wondering what happened to my delivery.",
        zh: "喔，太感謝你了！我才正在納悶我的快遞怎麼不見了。",
        ear: "Oh, thank-yü so much! I wəz wondering [wha'-ha-pənd] tə my delivery.",
        cloze: ["was wondering", "what happened"],
        chunks: [
          { orig: "what happened", sound: "wha'-ha-pənd", tip: "what 的 t 停頓省略" }
        ]
      },
      {
        speaker: "A",
        en: "The courier numbers on this street can be a little confusing at night.",
        zh: "這條街的門牌號碼在晚上對快遞員來說確實有點容易搞混。",
        ear: "The courier numbers on this street kən-bee [ə-li-dəl] confusing at night.",
        cloze: ["can be", "a little confusing"],
        chunks: [
          { orig: "a little", sound: "ə-li-dəl", tip: "tt 變彈舌 d" }
        ]
      },
      {
        speaker: "B",
        en: "By the way, we are going out of town for a few days starting tomorrow.",
        zh: "順帶一提，我們明天起要出遠門不在家幾天。",
        ear: "By the way, we're going [ou-də-town] fer ə few days [star-ding] tə-morrow.",
        cloze: ["out of town", "for a few"],
        chunks: [
          { orig: "out of town", sound: "ou-də-town", tip: "出遠門、不在城裡" }
        ]
      },
      {
        speaker: "A",
        en: "Would you like me to keep an eye on your place while you're away?",
        zh: "你們不在家的時候，需要我幫你們留意照看一下房子嗎？",
        ear: "[Wʊ-jü] like mee tə [kee-pə-nai-on] yer place while yer ə-way?",
        cloze: ["keep an eye on", "while you're"],
        chunks: [
          { orig: "keep an eye on", sound: "kee-pə-nai-on", tip: "幫忙留意、照看" }
        ]
      },
      {
        speaker: "B",
        en: "That is so kind of you! Could you grab any packages if they show up?",
        zh: "你人真的太好了！如果有任何包裹送到的話，可以幫我先收起來嗎？",
        ear: "Tha-ts so [kain-də-vyü]! Kʊ-jü grab any packages if they [sho-ʌp]?",
        cloze: ["kind of you", "show up"],
        chunks: [
          { orig: "kind of you", sound: "kain-də-vyü", tip: "kind + of + you 三詞連音" }
        ]
      },
      {
        speaker: "A",
        en: "Happy to help! Just text me when you guys get back in town.",
        zh: "很樂意幫忙！等你們回到城裡時再傳個訊息給我就好。",
        ear: "Happy tə help! Jəs tex'-mee when yü guys [ge'-ba-kin] town.",
        cloze: ["Happy to", "get back in"],
        chunks: [
          { orig: "get back in town", sound: "ge'-ba-kin town", tip: "出差或旅遊回來" }
        ]
      },
      {
        speaker: "B",
        en: "We will bring you back some local coffee beans from Seattle!",
        zh: "我們會從西雅圖帶些當地的咖啡豆回來送你！",
        ear: "We'll [bring-yü-back] səm local coffee beans frəm Seattle!",
        cloze: ["bring you back", "coffee beans"],
        chunks: [
          { orig: "bring you back", sound: "bring-yü-back", tip: "順道帶禮物/伴手禮回來給某人" }
        ]
      }
    ]
  },

  // ==================== ✈️ 機場航空與交通移動 (Airport, Flights & Transit · 4 Units) ====================
  {
    id: "trav-01",
    category: "travel",
    categoryName: "✈️ 機場航空與交通",
    title: "Travel 01｜機場櫃檯報到、行李直掛與座位升等 (Check-in & Baggage)",
    focus: "地勤人員一秒問完的快語速問題：靠窗靠走道、行李直掛目的地、登機艙等",
    duration: "約 3 分鐘 · 8 句",
    lines: [
      {
        speaker: "A",
        en: "Good afternoon! Where are you flying to today, and how many bags are you checking?",
        zh: "午安！請問今天要飛往哪裡？有幾件行李要托運？",
        ear: "Gʊd afternoon! Where er-yü flying tü tə-day, ən how many bagz [er-yü] checking?",
        cloze: ["flying to", "are you checking"],
        chunks: [
          { orig: "are you", sound: "er-yü /ərjə/", tip: "問句中 are you 常弱讀為 er-yü" }
        ]
      },
      {
        speaker: "B",
        en: "I'm heading to Boston with a layover in Chicago, just checking this one suitcase.",
        zh: "我要去波士頓，中途在芝加哥轉機，只托運這一個行李箱。",
        ear: "I'm [he-ding-tə] Boston [wi-thə] layover in Chicago, jəs checking this wʌn suitcase.",
        cloze: ["heading to", "layover in"],
        chunks: [
          { orig: "layover in", sound: "lay-o-ver-in", tip: "轉機停留" }
        ]
      },
      {
        speaker: "A",
        en: "Go ahead and place it on the scale for me, did you want a window or an aisle seat?",
        zh: "請幫我把行李放到磅秤上，請問您想要靠窗還是靠走道的位子？",
        ear: "Go-ə-head ən [play-si-don] the scale fer-mee, [di-jü-wa-nə] window er [ə-nail] seat?",
        cloze: ["place it on", "an aisle seat"],
        chunks: [
          { orig: "place it on", sound: "play-si-don", tip: "s 連 it，t 變彈舌 d 連 on" },
          { orig: "an aisle seat", sound: "ə-nail seat", tip: "aisle 的 s 不發音 (/aɪl/)，連前方的 an 聽起來就像 a nail！" }
        ]
      },
      {
        speaker: "B",
        en: "An aisle seat near the front would be great, and can I use miles to upgrade?",
        zh: "靠前排的走道位就太好了，另外請問我可以用哩程升等嗎？",
        ear: "[Ə-nail] seat near the frʌnt wʊd-bee great, ən kə-nI use miles tə upgrade?",
        cloze: ["near the front", "use miles"],
        chunks: [
          { orig: "use miles to upgrade", sound: "yüz mailz tə upgrade", tip: "用航空哩程升等" }
        ]
      },
      {
        speaker: "A",
        en: "Let me check if there are any seats left in business class on the first leg.",
        zh: "讓我查一下第一段航程的商務艙還有沒有空位。",
        ear: "[Le-mee] check if there-er any seats [lef-tin] business class on the [firs'-leg].",
        cloze: ["seats left in", "first leg"],
        chunks: [
          { orig: "first leg", sound: "firs'-leg", tip: "轉機航程中的「第一段航程」稱為 first leg" }
        ]
      },
      {
        speaker: "A",
        en: "You are in luck! There is one aisle seat left, so I went ahead and processed that.",
        zh: "您運氣真好！剛好還剩一個走道位，我已經直接幫您辦好升等了。",
        ear: "[Yer-in-lʌk]! There-z wʌn aisle seat left, so I [wen-də-head] ən processed that.",
        cloze: ["in luck", "went ahead"],
        chunks: [
          { orig: "You're in luck", sound: "Yer-in-lʌk", tip: "你運氣真好！" },
          { orig: "went ahead and", sound: "wen-də-head ən", tip: "已經主動先幫您辦好了" }
        ]
      },
      {
        speaker: "B",
        en: "Awesome! Will my bag go all the way through, or do I pick it up in Chicago?",
        zh: "太棒了！我的行李會一路直掛到底，還是在芝加哥要先領出來？",
        ear: "Awesome! Wil my bag go [all-the-way-through], er dü-I [pi-ki-dʌp] in Chicago?",
        cloze: ["all the way through", "pick it up"],
        chunks: [
          { orig: "all the way through", sound: "all-the-way-through", tip: "行李直掛最終目的地" }
        ]
      },
      {
        speaker: "A",
        en: "Since Chicago is your port of entry, you will need to claim it for customs and re-check it.",
        zh: "因為芝加哥是您的第一入境點，您需要先領出行李過海關，再重新托運。",
        ear: "Since Chicago iz yer [por-də-ventry], yü'll need tə [clay-mit] fer customs ən re-check it.",
        cloze: ["port of entry", "claim it"],
        chunks: [
          { orig: "port of entry", sound: "por-də-ventry", tip: "第一入境關口" },
          { orig: "claim it", sound: "clay-mit", tip: "領取行李" }
        ]
      }
    ]
  },
  {
    id: "trav-02",
    category: "travel",
    categoryName: "✈️ 機場航空與交通",
    title: "Travel 02｜美國海關入境查驗、轉機安檢與登機門變更 (Customs & Gate Change)",
    focus: "海關官員連珠炮提問（What brings you to / How long are you staying）與登機門突發改動",
    duration: "約 3 分鐘 · 8 句",
    lines: [
      {
        speaker: "A",
        en: "Next in line, please! Passport and boarding pass, what brings you to the States?",
        zh: "下一位請上前！請出示護照與登機證，請問這次來美國的目的是什麼？",
        ear: "[Nek-stin-line], please! Passport ən boarding pass, [wha'-bring-zyü] tə the States?",
        cloze: ["Next in line", "brings you to"],
        chunks: [
          { orig: "What brings you to...", sound: "Wha'-bring-zyü tə", tip: "海關與社交最常問：「是什麼風把你吹來的（來此目的為何）？」" }
        ]
      },
      {
        speaker: "B",
        en: "I'm here to present a paper at an international healthcare conference in Boston.",
        zh: "我是來波士頓的一場國際醫療研討會發表論文的。",
        ear: "I'm here tə [pri-zen-də] paper a-dən international healthcare conference in Boston.",
        cloze: ["present a", "at an"],
        chunks: [
          { orig: "present a", sound: "pri-zen-də", tip: "動詞 present 重音在第二音節，t 連 a 變彈舌 d" }
        ]
      },
      {
        speaker: "A",
        en: "How long are you planning on staying, and where will you be staying?",
        zh: "您預計停留多久？期間會住在哪裡？",
        ear: "How long er-yü [pla-ning-on] staying, ən where [wil-yü-bee] staying?",
        cloze: ["planning on", "will you be"],
        chunks: [
          { orig: "planning on", sound: "pla-ning-on", tip: "ng 與 on 連讀" }
        ]
      },
      {
        speaker: "B",
        en: "Just for six days, I'm staying at the Marriott right next to the convention center.",
        zh: "只待六天，我住在會展中心正隔壁的萬豪飯店。",
        ear: "Jəs fer six days, I'm staying at the Marriott [righ'-nek-stə] the convention center.",
        cloze: ["Just for", "right next to"],
        chunks: [
          { orig: "right next to", sound: "righ'-nek-stə", tip: "next to 的兩個 t 合併發一個音" }
        ]
      },
      {
        speaker: "A",
        en: "Are you carrying any food, agricultural products, or over ten thousand dollars in cash?",
        zh: "您有攜帶任何食物、農產品，或超過一萬美金的現金嗎？",
        ear: "Ar-yü carrying any food, agricultural products, er over ten thousand dollars [in-cash]?",
        cloze: ["carrying any", "in cash"],
        chunks: [
          { orig: "or over", sound: "er-o-ver", tip: "or 弱化為 /ər/ 並連 over" }
        ]
      },
      {
        speaker: "B",
        en: "No, none of those, just my laptop and personal clothes for the week.",
        zh: "沒有，那些都沒有，只有我的筆電和這週的個人衣物。",
        ear: "No, [nʌ-nəv-thoze], jəs my laptop ən personal clothes fer the week.",
        cloze: ["none of those", "for the week"],
        chunks: [
          { orig: "none of those", sound: "nʌ-nəv-thoze", tip: "none + of 連讀為 nʌ-nəv" }
        ]
      },
      {
        speaker: "A",
        en: "Look right into the camera for me, all set! Have a great trip.",
        zh: "請幫我直視鏡頭，搞定了！祝您旅途愉快。",
        ear: "Lʊk [righ-din-tə] the camera fer-mee, [all-set]! Ha-və gray'-trip.",
        cloze: ["right into", "all set"],
        chunks: [
          { orig: "all set", sound: "all-set", tip: "美國隨處可聽見的高頻詞：「都辦好了、大功告成！」" }
        ]
      },
      {
        speaker: "B",
        en: "Thank you! By the way, is the domestic transfer security right down this hall?",
        zh: "謝謝您！順帶問一下，轉國內線的安檢口就是順著這條走廊走到底嗎？",
        ear: "Thank-yü! By the way, iz the domestic transfer security [righ'-down] this hall?",
        cloze: ["By the way", "right down"],
        chunks: [
          { orig: "right down this hall", sound: "righ'-down this hall", tip: "順著走廊直走下去" }
        ]
      }
    ]
  },
  {
    id: "trav-03",
    category: "travel",
    categoryName: "✈️ 機場航空與交通",
    title: "Travel 03｜機場租車取車、保險推銷與滿油歸還 (Car Rental & Insurance)",
    focus: "租車櫃檯最容易讓人聽不懂的保險條款（bumper-to-bumper / deductible / full tank）與升級話術",
    duration: "約 3 分鐘 · 8 句",
    lines: [
      {
        speaker: "A",
        en: "Hi! I booked a mid-size SUV online, here is my driver's license and credit card.",
        zh: "嗨！我在網路上預訂了一台中型休旅車，這是我的駕照與信用卡。",
        ear: "Hi! I [bʊk-tə] mid-size SUV online, here-z my driver's license ən credit card.",
        cloze: ["booked a", "here is my"],
        chunks: [
          { orig: "booked a", sound: "bʊk-tə", tip: "booked 的 -ed 發 /t/ 連 a" }
        ]
      },
      {
        speaker: "B",
        en: "Got it! Did you want to add our full coverage insurance so you have zero deductible?",
        zh: "找到了！請問您要加購我們全險方案，這樣萬一擦撞完全零自負額嗎？",
        ear: "[Ga-dit]! [Di-jü-wa-nə] add our full coverage insurance so yü hav zero deductible?",
        cloze: ["want to add", "zero deductible"],
        chunks: [
          { orig: "zero deductible", sound: "zero di-dʌk-tə-bəl", tip: "deductible = 保險自負額（出險時自己要先賠的金額）" }
        ]
      },
      {
        speaker: "A",
        en: "Does that cover everything including windshield chips and flat tires?",
        zh: "那包含所有項目嗎，像是擋風玻璃被小石頭砸傷和爆胎？",
        ear: "Dəz-that cover everything including windshield chips ən [fla'-tires]?",
        cloze: ["cover everything", "flat tires"],
        chunks: [
          { orig: "flat tires", sound: "fla'-tires", tip: "flat 的 t 停頓後直接發 tires" }
        ]
      },
      {
        speaker: "B",
        en: "Yes, it is bumper-to-bumper, you can just walk away no matter what happens.",
        zh: "是的，這是從車頭保到車尾的全險，不管發生什麼事您都可以直接交還車鑰匙走人。",
        ear: "Yes, i-ts [bʌm-per-tə-bʌm-per], yü kən jəs [waw-kə-way] no ma-der wha' happens.",
        cloze: ["bumper-to-bumper", "walk away"],
        chunks: [
          { orig: "bumper-to-bumper", sound: "bʌm-per-tə-bʌm-per", tip: "從前保險桿到後保險桿 = 全車全險（亦可用於形容塞車車貼車）" }
        ]
      },
      {
        speaker: "A",
        en: "Okay, let's go ahead and add it for peace of mind.",
        zh: "好，那我們就加保吧，買個安心。",
        ear: "Okay, lets [go-ə-head] ən [a-dit] fer [pee-səv-mind].",
        cloze: ["add it", "peace of mind"],
        chunks: [
          { orig: "peace of mind", sound: "pee-səv-mind", tip: "買個安心、放心" }
        ]
      },
      {
        speaker: "B",
        en: "Also, the tank is full right now, would you like to prepay for gas or bring it back full?",
        zh: "另外，現在油箱是滿的，您想要預付一桶油錢，還是還車時自己加滿油？",
        ear: "Also, the tank iz full righ'-now, wʊ-jü like tə prepay fer gas er [bring-it-back] full?",
        cloze: ["prepay for", "bring it back"],
        chunks: [
          { orig: "bring it back full", sound: "bring-it-back full", tip: "還車時加滿油歸還" }
        ]
      },
      {
        speaker: "A",
        en: "I'll fill it up myself before I drop it off at the airport.",
        zh: "我在把車還回機場之前，會自己去加滿油。",
        ear: "I'll [fi-li-dʌp] myself before I [dra-pi-doff] at the airport.",
        cloze: ["fill it up", "drop it off"],
        chunks: [
          { orig: "fill it up", sound: "fi-li-dʌp", tip: "加滿油" },
          { orig: "drop it off", sound: "dra-pi-doff", tip: "還車（或讓乘客下車）" }
        ]
      },
      {
        speaker: "B",
        en: "Here are your keys, you can pick any car in Row C on the second level.",
        zh: "這是您的車鑰匙，您可以到二樓 C 排任選一台車開走。",
        ear: "Here-er yer keys, yü kən [pi-kɛ-nee] car in Row C on the second level.",
        cloze: ["pick any", "second level"],
        chunks: [
          { orig: "pick any", sound: "pi-kɛ-nee", tip: "美國機場租車常讓你直接去指定排任選一台喜歡的車" }
        ]
      }
    ]
  },
  {
    id: "trav-04",
    category: "travel",
    categoryName: "✈️ 機場航空與交通",
    title: "Travel 04｜Uber 共乘確認、塞車改道與地鐵問路 (Uber, Subway & Directions)",
    focus: "街頭與車內快語速對話：backed up（塞車回堵）、drop me off、two blocks down",
    duration: "約 3 分鐘 · 8 句",
    lines: [
      {
        speaker: "A",
        en: "Hey! Heading to the convention center on Fifth Avenue, right?",
        zh: "嗨！是要去第五大道上的會展中心，對吧？",
        ear: "Hey! [He-ding-tə] the convention center on Fifth Avenue, right?",
        cloze: ["Heading to", "Fifth Avenue"],
        chunks: [
          { orig: "Heading to", sound: "He-ding-tə", tip: "正要前往..." }
        ]
      },
      {
        speaker: "B",
        en: "Yep, that is the one! Let me pop my suitcase in the trunk real quick.",
        zh: "對，就是那裡！讓我快速把行李箱放進後車廂。",
        ear: "Yep, [tha-ts-the-wʌn]! Le-mee pop my suitcase in the trunk [reel-quick].",
        cloze: ["that is the one", "real quick"],
        chunks: [
          { orig: "pop ... in the trunk", sound: "pop ... in the trunk", tip: "把東西快速放進後車廂" }
        ]
      },
      {
        speaker: "A",
        en: "Hop on in! Is the temperature back there okay for you?",
        zh: "快上車吧！後座的冷氣溫度對你來說還舒適嗎？",
        ear: "[Ha-po-nin]! Iz the [tem-prə-cher] back there okay fer-yü?",
        cloze: ["Hop on in", "back there"],
        chunks: [
          { orig: "Hop on in", sound: "Ha-po-nin", tip: "司機熱絡招呼乘客上車的常用語" },
          { orig: "temperature", sound: "tem-prə-cher", tip: "只有三個音節，中間的 era 不發音" }
        ]
      },
      {
        speaker: "B",
        en: "Feels great! Are we going to hit a lot of traffic on the bridge right now?",
        zh: "很舒服！我們現在在橋上會遇到大塞車嗎？",
        ear: "Feelz great! Ar-we gə-nə [hi-də-la-də] traffic on the bridge righ'-now?",
        cloze: ["hit a lot of", "right now"],
        chunks: [
          { orig: "hit a lot of", sound: "hi-də-la-də", tip: "兩個 t 全變彈舌 d，of 變 ə" }
        ]
      },
      {
        speaker: "A",
        en: "The highway is pretty backed up due to roadwork, so I'll take the tunnel instead.",
        zh: "高速公路因為道路施工有點回堵，所以我會改走隧道。",
        ear: "The highway iz pri-dee [bak-tʌp] due tə roadwork, so I'll take the tunnel instead.",
        cloze: ["backed up", "take the tunnel"],
        chunks: [
          { orig: "backed up", sound: "bak-tʌp", tip: "車流回堵、塞車" }
        ]
      },
      {
        speaker: "B",
        en: "Whatever is fastest works for me, I have a panel starting at ten.",
        zh: "哪條路最快都好，我十點有一場座談會要開始。",
        ear: "Wha-dever iz fastest [wɜrk-sfer-mee], I ha-və panel star-ding at ten.",
        cloze: ["works for me", "starting at"],
        chunks: [
          { orig: "works for me", sound: "wɜrk-sfer-mee", tip: "「對我來說沒問題、可以接受」" }
        ]
      },
      {
        speaker: "A",
        en: "The front driveway is blocked off by police, is it okay if I let you out at the corner?",
        zh: "正門車道被警察封鎖管制了，我讓你在轉角處下車可以嗎？",
        ear: "The frʌn' driveway iz [blak-toff] by police, i-zi-dokay i-fI [le-chü-out] at the corner?",
        cloze: ["blocked off", "let you out"],
        chunks: [
          { orig: "let you out", sound: "le-chü-out", tip: "讓乘客下車" }
        ]
      },
      {
        speaker: "B",
        en: "Right here is perfect, thank you so much and have a good one!",
        zh: "停在這裡就很完美，非常謝謝你，祝你有美好的一天！",
        ear: "Righ'-here iz perfect, thank-yü so much ən [ha-və-gʊ-dwʌn]!",
        cloze: ["Right here", "have a good one"],
        chunks: [
          { orig: "Have a good one", sound: "Ha-və-gʊ-dwʌn", tip: "美加地區下車或離開商店最常講的道別語（不分早晚皆可用）" }
        ]
      }
    ]
  },

  // ==================== 🍽️ 餐廳咖啡廳與飯店住宿 (Dining, Coffee & Hotel · 4 Units) ====================
  {
    id: "din-01",
    category: "dining",
    categoryName: "🍽️ 餐廳咖啡廳與飯店",
    title: "Dining 01｜美式餐廳點餐、桌邊服務與分帳買單 (Sit-down Restaurant)",
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
  },
  {
    id: "din-02",
    category: "dining",
    categoryName: "🍽️ 餐廳咖啡廳與飯店",
    title: "Dining 02｜星巴克與美式咖啡廳超快客製化點餐 (Fast Coffee Counter)",
    focus: "店員一秒問完：內用外帶（for here or to go）、奶類替換、加熱可頌與感應刷卡",
    duration: "約 3 分鐘 · 8 句",
    lines: [
      {
        speaker: "A",
        en: "Good morning! I can help whoever is next in line.",
        zh: "早安！我可以幫排隊的下一位客人點餐。",
        ear: "Gʊd morning! I kən help [hoo-e-ver-z] [nek-stin-line].",
        cloze: ["whoever is", "next in line"],
        chunks: [
          { orig: "next in line", sound: "nek-stin-line", tip: "排隊的下一位" }
        ]
      },
      {
        speaker: "B",
        en: "Hi! Could I get a medium iced latte with oat milk and half the sweetener?",
        zh: "嗨！請給我一杯中杯冰燕麥奶拿鐵，甜度半糖。",
        ear: "Hi! [Kʊ-dI-ge-də] medium iced latte with oa'-milk ən [haf-the] sweetener?",
        cloze: ["Could I get a", "oat milk"],
        chunks: [
          { orig: "Could I get a", sound: "Kʊ-dI-ge-də", tip: "四個字連成一氣" }
        ]
      },
      {
        speaker: "A",
        en: "You got it! Would you like anything to eat with that today?",
        zh: "沒問題！今天想要搭配什麼吃的嗎？",
        ear: "[Yü-ga-dit]! Wʊ-jü like anything [tə-ee'-with] that tə-day?",
        cloze: ["You got it", "to eat with"],
        chunks: [
          { orig: "You got it", sound: "Yü-ga-dit", tip: "服務業最常回的「沒問題、馬上辦！」" }
        ]
      },
      {
        speaker: "B",
        en: "Yeah, let me grab one of those almond croissants as well.",
        zh: "好，那我也順便拿一個杏仁可頌。",
        ear: "Yeah, [le-mee] grab [wʌ-nəv-thoze] almond croissants [əz-well].",
        cloze: ["one of those", "as well"],
        chunks: [
          { orig: "one of those", sound: "wʌ-nəv-thoze", tip: "連音縮讀" }
        ]
      },
      {
        speaker: "A",
        en: "Did you want me to warm that up for you, or leave it as is?",
        zh: "需要我幫您把可頌加熱嗎，還是維持原樣就好？",
        ear: "[Di-jü-wan-mee] tə [wor-mtha-dʌp] fer-yü, er [lee-vi-dæ-ziz]?",
        cloze: ["warm that up", "as is"],
        chunks: [
          { orig: "warm that up", sound: "wor-mtha-dʌp", tip: "加熱烘烤一下" },
          { orig: "leave it as is", sound: "lee-vi-dæ-ziz", tip: "維持現狀、不用特別處理" }
        ]
      },
      {
        speaker: "B",
        en: "Warmed up would be great, and this is all to go.",
        zh: "幫我加熱就太好了，然後這些全部要外帶。",
        ear: "[Worm-dʌp] wʊd-bee great, ən this iz [all-tə-go].",
        cloze: ["Warmed up", "all to go"],
        chunks: [
          { orig: "all to go", sound: "all-tə-go", tip: "全部外帶" }
        ]
      },
      {
        speaker: "A",
        en: "Can I get a name for the cup? Your total comes out to nine eighty-five.",
        zh: "請問杯子上要寫什麼名字？您的總金額是 9 塊 8 毛 5。",
        ear: "Kə-nI [ge-də-name] fer the cup? Yer total [cʌm-zou'-tə] nine AY-dee-five.",
        cloze: ["get a name", "comes out to"],
        chunks: [
          { orig: "comes out to", sound: "cʌm-zou'-tə", tip: "結帳金額總計為..." }
        ]
      },
      {
        speaker: "A",
        en: "We will call your name at the pickup counter right down at the end.",
        zh: "做好後我們會在最底端那邊的取餐檯叫您的名字。",
        ear: "We'll call yer name at the [pi-kʌp] counter righ' down at the end.",
        cloze: ["call your name", "pickup counter"],
        chunks: [
          { orig: "pickup counter", sound: "pi-kʌp counter", tip: "取餐櫃檯" }
        ]
      }
    ]
  },
  {
    id: "din-03",
    category: "dining",
    categoryName: "🍽️ 餐廳咖啡廳與飯店",
    title: "Dining 03｜飯店入住、房間空調反映與延遲退房 (Hotel Check-in & Room Issue)",
    focus: "飯店櫃檯與房務溝通：incidentals（雜費押金）、acting up（設備故障）、late checkout",
    duration: "約 3 分鐘 · 8 句",
    lines: [
      {
        speaker: "A",
        en: "Hi there, I have a reservation under Hsieh, checking in for four nights.",
        zh: "您好，我有以 Hsieh 的名字訂房，入住四晚。",
        ear: "Hi there, I [ha-və] reservation under Hsieh, [che-king-in] fer four nights.",
        cloze: ["have a", "checking in"],
        chunks: [
          { orig: "checking in", sound: "che-king-in", tip: "辦理入住" }
        ]
      },
      {
        speaker: "B",
        en: "Welcome! Could I just see your ID and a credit card for incidentals?",
        zh: "歡迎光臨！可以請您出示證件，以及一張用來刷雜費押金的信用卡嗎？",
        ear: "Welcome! [Kʊ-dI] jəs see yer ID ən ə credit card [fer-in-si-den-dəlz]?",
        cloze: ["Could I", "for incidentals"],
        chunks: [
          { orig: "for incidentals", sound: "fer in-si-den-dəlz", tip: "歐美飯店必問：刷一張卡預授權作為「房間雜費押金」" }
        ]
      },
      {
        speaker: "A",
        en: "Here you go, is breakfast included with my room rate?",
        zh: "給您，請問我的房價有包含早餐嗎？",
        ear: "[Here-yü-go], iz breakfast included with my room rate?",
        cloze: ["Here you go", "room rate"],
        chunks: [
          { orig: "Here you go", sound: "Here-yü-go", tip: "把東西遞給對方的常用語" }
        ]
      },
      {
        speaker: "B",
        en: "Yes, breakfast runs from six-thirty to ten, and the Wi-Fi password is on your key sleeve.",
        zh: "有的，早餐從六點半供應到十點，Wi-Fi 密碼印在您的房卡套上。",
        ear: "Yes, breakfast rʌnz frəm six-thir-dee tə ten, ən the Wi-Fi password iz on yer [key-sleeve].",
        cloze: ["runs from", "key sleeve"],
        chunks: [
          { orig: "key sleeve", sound: "key-sleeve", tip: "裝房卡的小紙套" }
        ]
      },
      {
        speaker: "A",
        en: "Hi front desk, the air conditioning in Room 508 seems to be acting up.",
        zh: "櫃檯您好，508 號房的空調好像有點故障不靈光。",
        ear: "Hi frʌn' desk, the air conditioning in Room [fai-voh-eight] seemz tə-bee [ak-ting-ʌp].",
        cloze: ["seems to be", "acting up"],
        chunks: [
          { orig: "acting up", sound: "ak-ting-ʌp", tip: "機器設備或身體部位「鬧脾氣、出毛病不正常運作」" }
        ]
      },
      {
        speaker: "B",
        en: "I'm sorry about that! I can send maintenance up right away, or move you to another room.",
        zh: "真不好意思！我可以馬上派維修人員上去，或者幫您換到另一間房。",
        ear: "I'm sorry ə-bou' that! I kən send maintenance ʌp [righ-də-way], er [moo-vyü] tə ə-nʌ-ther room.",
        cloze: ["right away", "move you"],
        chunks: [
          { orig: "right away", sound: "righ-də-way", tip: "立刻、馬上；t 變彈舌 d" }
        ]
      },
      {
        speaker: "A",
        en: "Moving to a quieter room away from the elevator would actually be great.",
        zh: "如果能換到一間遠離電梯、比較安靜的房間那就太好了。",
        ear: "Moving tə ə quieter room [ə-way-frəm] the elevator wʊd actually bee great.",
        cloze: ["quieter room", "away from"],
        chunks: [
          { orig: "away from", sound: "ə-way-frəm", tip: "遠離..." }
        ]
      },
      {
        speaker: "B",
        en: "No problem, I'll bring the new keys up to you and help you with your luggage.",
        zh: "沒問題，我這就把新房卡拿上去給您，順便幫您搬行李。",
        ear: "No problem, I'll bring the new [kee-zʌp] tə-yü ən [hel-pyü] with yer luggage.",
        cloze: ["keys up", "help you"],
        chunks: [
          { orig: "keys up", sound: "kee-zʌp", tip: "/z/ 與 up 連音" }
        ]
      }
    ]
  },
  {
    id: "din-04",
    category: "dining",
    categoryName: "🍽️ 餐廳咖啡廳與飯店",
    title: "Dining 04｜商務餐敘招待、飲食禁忌與搶買單禮儀 (Business Dinner Hosting)",
    focus: "招待外賓用餐的道地互動：dietary restrictions、share family-style、my treat",
    duration: "約 3 分鐘 · 8 句",
    lines: [
      {
        speaker: "A",
        en: "Before we order, does anyone have any food allergies or dietary restrictions?",
        zh: "在我們點餐之前，請問有人有任何食物過敏或飲食禁忌嗎？",
        ear: "Before we order, dəz anyone hav any food allergies er [dai-ə-te-ree] restrictions?",
        cloze: ["food allergies", "dietary restrictions"],
        chunks: [
          { orig: "dietary restrictions", sound: "dai-ə-te-ree restrictions", tip: "國際餐敘必問的禮貌用語：飲食限制（素食、不吃牛、無麩質等）" }
        ]
      },
      {
        speaker: "B",
        en: "I'm good with anything, I'm pretty adventurous when it comes to local food!",
        zh: "我吃什麼都可以，說到品嚐在地美食我還滿勇於嘗試的！",
        ear: "I'm [gʊ-dwith] anything, I'm pri-dee adventurous [whe-nit-cʌmz-tə] local food!",
        cloze: ["good with", "when it comes to"],
        chunks: [
          { orig: "when it comes to", sound: "whe-nit-cʌmz-tə", tip: "一提到...、就...而言" }
        ]
      },
      {
        speaker: "A",
        en: "Would you guys like to order a few signature dishes and share them family-style?",
        zh: "大家想要點幾道這裡的招牌菜，然後像家庭聚餐那樣放中間一起分享嗎？",
        ear: "Wʊ-jü guys like tə order ə few signature dishes ən [share-əm] family-style?",
        cloze: ["signature dishes", "share them"],
        chunks: [
          { orig: "share them family-style", sound: "share-əm family-style", tip: "歐美習慣一人一盤，若要合菜分食會說 share family-style" }
        ]
      },
      {
        speaker: "B",
        en: "That sounds wonderful, that way we get to try a little bit of everything.",
        zh: "聽起來太棒了，這樣我們每種菜色都能嚐到一點。",
        ear: "That sounz wonderful, that way we [ge'-tə-try] [ə-li-dəl-bi-dəv] everything.",
        cloze: ["get to try", "little bit of"],
        chunks: [
          { orig: "a little bit of", sound: "ə-li-dəl-bi-dəv", tip: "連續兩個彈舌 t 連音" }
        ]
      },
      {
        speaker: "A",
        en: "I'd like to propose a quick toast to our partnership and a successful conference.",
        zh: "我想提議大家舉杯，敬我們的合作夥伴關係以及這次研討會圓滿成功。",
        ear: "I'd like tə [prə-po-zə] quick toast tə our partnership ən ə successful conference.",
        cloze: ["propose a", "quick toast"],
        chunks: [
          { orig: "propose a toast", sound: "prə-po-zə toast", tip: "提議舉杯敬酒" }
        ]
      },
      {
        speaker: "B",
        en: "Cheers to that! Thank you for being such a generous host throughout our visit.",
        zh: "敬這個！感謝您在我們來訪期間這麼熱情大方地款待。",
        ear: "[Cheerz-tə-that]! Thank-yü fer being [sʌ-chə] generous host throughout our visit.",
        cloze: ["Cheers to that", "such a"],
        chunks: [
          { orig: "Cheers to that", sound: "Cheerz-tə-that", tip: "舉杯附和對方的祝酒詞" }
        ]
      },
      {
        speaker: "B",
        en: "Please let me at least chip in for the wine tonight.",
        zh: "今晚請至少讓我分攤這瓶酒的錢吧。",
        ear: "Please le-mee [a'-leest] [chi-pin] fer the wine tə-night.",
        cloze: ["at least", "chip in"],
        chunks: [
          { orig: "chip in", sound: "chi-pin", tip: "共同出錢、分攤一部分費用" }
        ]
      },
      {
        speaker: "A",
        en: "Not a chance, tonight is my treat! You can get the next one when I visit Boston.",
        zh: "那怎麼行，今晚絕對我請客！等我去波士頓拜訪時再換你請。",
        ear: "[Na-də-chance], tə-night iz [my-treat]! Yü kən get the nek-stwʌn when I visit Boston.",
        cloze: ["Not a chance", "my treat"],
        chunks: [
          { orig: "Not a chance / my treat", sound: "Na-də-chance / my treat", tip: "熱情買單請客最道地的說法" }
        ]
      }
    ]
  },

  // ==================== 🏥 醫療看診與健康生活 (Medical, Pharmacy & Wellness · 3 Units) ====================
  {
    id: "med-01",
    category: "medical",
    categoryName: "🏥 醫療看診與藥局",
    title: "Medical 01｜國外突發看診、症狀描述與醫師問診 (Urgent Care & Symptoms)",
    focus: "門診醫師與護理師的快語速問診：come down with / run a fever / over-the-counter",
    duration: "約 3 分鐘 · 8 句",
    lines: [
      {
        speaker: "A",
        en: "Hi, what brings you into the urgent care clinic today?",
        zh: "您好，請問今天是什麼狀況讓您來急門診看診呢？",
        ear: "Hi, [wha'-bring-zyü] in-tə the urgent care clinic tə-day?",
        cloze: ["what brings you", "urgent care"],
        chunks: [
          { orig: "urgent care clinic", sound: "urgent care clinic", tip: "美國介於一般診所與大醫院急診（ER）之間的「急門診中心」，免預約且較便宜" }
        ]
      },
      {
        speaker: "B",
        en: "I think I came down with a bad cold or the flu on my flight over here.",
        zh: "我覺得我在飛過來的班機上好像染上了重感冒或流感。",
        ear: "I think I [caym-down-with] ə bad cold er the flu on my [flai-do-ver] here.",
        cloze: ["came down with", "flight over"],
        chunks: [
          { orig: "came down with", sound: "caym-down-with", tip: "come down with = 開始生某種病（感冒、發燒等）" }
        ]
      },
      {
        speaker: "A",
        en: "How long have you been having symptoms, and have you been running a fever?",
        zh: "您出現症狀多久了？這段期間有發燒嗎？",
        ear: "How long [ha-vyü-bin] having symptoms, ən ha-vyü bin [rʌ-ning-ə-fee-ver]?",
        cloze: ["have you been", "running a fever"],
        chunks: [
          { orig: "running a fever", sound: "rʌ-ning-ə-fee-ver", tip: "發燒的口語最常說 run a fever" }
        ]
      },
      {
        speaker: "B",
        en: "Since yesterday evening, I had chills last night and my throat is really sore.",
        zh: "從昨天傍晚開始的，我昨晚覺得畏寒發冷，而且喉嚨非常痛。",
        ear: "Since yesterday evening, I had chillz las'-night ən my [thro-diz] really sore.",
        cloze: ["had chills", "throat is"],
        chunks: [
          { orig: "throat is", sound: "thro-diz", tip: "t 連 is 變彈舌 d" }
        ]
      },
      {
        speaker: "A",
        en: "Let's take a quick swab to rule out strep throat and the flu.",
        zh: "我們來做個快速咽喉拭子篩檢，以排除鏈球菌咽喉炎和流感。",
        ear: "Lets [tay-kə-quick] swab tə [roo-lout] strep throat ən the flu.",
        cloze: ["take a quick", "rule out"],
        chunks: [
          { orig: "rule out", sound: "roo-lout", tip: "醫療與研究高頻詞：排除（某疾病或可能性）" }
        ]
      },
      {
        speaker: "A",
        en: "Open wide and say ah for me, your tonsils look a little swollen.",
        zh: "請幫我嘴巴張大說「啊」，您的扁桃腺看起來有點腫。",
        ear: "Open wide ən say ah fer-mee, yer tonsils lʊk [ə-li-dəl] swollen.",
        cloze: ["Open wide", "a little swollen"],
        chunks: [
          { orig: "Open wide", sound: "Open wide", tip: "看喉嚨或牙醫時的標準指令：嘴巴張大" }
        ]
      },
      {
        speaker: "B",
        en: "Is there anything you can prescribe so I can get through my talk tomorrow?",
        zh: "有沒有什麼藥是您可以開給我，讓我明天能順利撐完演講的？",
        ear: "Iz-there anything yü kən prescribe so I kən [ge'-through] my talk tə-morrow?",
        cloze: ["prescribe", "get through"],
        chunks: [
          { orig: "get through", sound: "ge'-through", tip: "撐過、順利度過（某項考驗或難關）" }
        ]
      },
      {
        speaker: "A",
        en: "I'll call in a prescription to the pharmacy across the street, you can pick it up in thirty minutes.",
        zh: "我會直接把處方傳送到對街的藥局，您三十分鐘後就可以過去領藥。",
        ear: "I'll [caw-li-nə] prescription tə the pharmacy ə-cross the street, yü kən [pi-ki-dʌp] in thir-dee minutes.",
        cloze: ["call in a", "pick it up"],
        chunks: [
          { orig: "call in a prescription", sound: "caw-li-nə prescription", tip: "歐美醫師通常直接將電子處方傳給指定藥局，稱為 call in" }
        ]
      }
    ]
  },
  {
    id: "med-02",
    category: "medical",
    categoryName: "🏥 醫療看診與藥局",
    title: "Medical 02｜藥局領處方籤、成藥建議與副作用確認 (Pharmacy & Dosage)",
    focus: "藥師快語速交代服藥須知：drowsy（想睡覺）、on an empty stomach、wear off",
    duration: "約 3 分鐘 · 8 句",
    lines: [
      {
        speaker: "A",
        en: "Hi! I'm picking up a prescription that my doctor just sent over.",
        zh: "您好！我要領取我的醫師剛才傳過來的處方藥。",
        ear: "Hi! I'm [pi-king-ʌ-pə] prescription that my doctor jəs [sen-do-ver].",
        cloze: ["picking up a", "sent over"],
        chunks: [
          { orig: "picking up a", sound: "pi-king-ʌ-pə", tip: "領藥、取件" }
        ]
      },
      {
        speaker: "B",
        en: "Sure! Can I get your last name and date of birth to pull it up?",
        zh: "沒問題！請告訴我您的姓氏與出生年月日，讓我調出資料。",
        ear: "Sure! Kə-nI [ge-cher] las'-name ən [day-dəv-birth] tə [pʊ-li-dʌp]?",
        cloze: ["date of birth", "pull it up"],
        chunks: [
          { orig: "date of birth", sound: "day-dəv-birth", tip: "歐美藥局核對身分必問：姓氏 + 生日（月/日/年）" }
        ]
      },
      {
        speaker: "A",
        en: "Last name is Hsieh, H-S-I-E-H, and my birthday is November eleventh.",
        zh: "姓氏是 Hsieh，H-S-I-E-H，生日是 11 月 11 日。",
        ear: "Las'-name iz Hsieh, H-S-I-E-H, ən my birthday iz November [i-le-vənth].",
        cloze: ["Last name", "eleventh"],
        chunks: [
          { orig: "eleventh", sound: "i-le-vənth", tip: "重音在第二音節 le" }
        ]
      },
      {
        speaker: "B",
        en: "Found it! Have you taken this medication before, or do you have any questions for the pharmacist?",
        zh: "找到了！請問您之前吃過這種藥嗎，或者有問題想問藥師嗎？",
        ear: "[Foun-dit]! Ha-vyü taken this medication before, er djü hav any questions fer the pharmacist?",
        cloze: ["Found it", "taken this"],
        chunks: [
          { orig: "Found it", sound: "Foun-dit", tip: "d 與 it 連音" }
        ]
      },
      {
        speaker: "A",
        en: "Should I take it with food, and is it going to make me drowsy during the day?",
        zh: "我應該隨餐服用嗎？還有這在白天吃了會讓我昏昏欲睡嗎？",
        ear: "Shʊ-dI [tay-kit] with food, ən i-zit gə-nə make-mee [drow-zee] during the day?",
        cloze: ["take it with", "make me drowsy"],
        chunks: [
          { orig: "make me drowsy", sound: "make-mee drow-zee", tip: "drowsy = 嗜睡、昏昏欲睡（感冒藥常見標示 non-drowsy）" }
        ]
      },
      {
        speaker: "B",
        en: "Take one tablet twice a day after meals so it doesn't upset your stomach.",
        zh: "每天飯後服用一顆，早晚各一次，這樣才不會傷胃。",
        ear: "Take wʌn tablet [twai-sə-day] after meals so it dʌ-zən [ʌp-se'-cher] stomach.",
        cloze: ["twice a day", "upset your"],
        chunks: [
          { orig: "twice a day", sound: "twai-sə-day", tip: "一天兩次" },
          { orig: "upset your stomach", sound: "ʌp-se'-cher stomach", tip: "引起腸胃不適" }
        ]
      },
      {
        speaker: "B",
        en: "The daytime pills are non-drowsy, just save the blue ones for bedtime.",
        zh: "日間錠是不會嗜睡的，只要把藍色的那顆留到睡前吃就好。",
        ear: "The daytime pillz er non-drowsy, jəs save the blue wʌnz [fer-bed-time].",
        cloze: ["non-drowsy", "for bedtime"],
        chunks: [
          { orig: "save ... for bedtime", sound: "save ... fer bed-time", tip: "留到睡前再吃" }
        ]
      },
      {
        speaker: "A",
        en: "Got it, thank you for walking me through the instructions!",
        zh: "清楚了，謝謝您帶我詳細確認用藥說明！",
        ear: "[Ga-dit], thank-yü fer [waw-king-mee-through] the instructions!",
        cloze: ["Got it", "walking me through"],
        chunks: [
          { orig: "walking me through", sound: "waw-king-mee-through", tip: "逐步向我解說清楚" }
        ]
      }
    ]
  },
  {
    id: "med-03",
    category: "medical",
    categoryName: "🏥 醫療看診與藥局",
    title: "Medical 03｜健檢報告、穿戴裝置數據與日常保健 (Health Checkup & Wearables)",
    focus: "與家庭醫師或同事聊健康數據：blood work、borderline、cut back on、keep track of",
    duration: "約 3 分鐘 · 8 句",
    lines: [
      {
        speaker: "A",
        en: "Good news, all the blood work from your annual physical came back normal!",
        zh: "好消息，您年度健檢的所有抽血檢驗結果出來都很正常！",
        ear: "Gʊd news, all the [blʌd-work] frəm yer annual physical [caym-back] normal!",
        cloze: ["blood work", "came back"],
        chunks: [
          { orig: "blood work", sound: "blʌd-work", tip: "抽血檢驗報告" },
          { orig: "came back normal", sound: "caym-back normal", tip: "檢驗結果出爐為正常" }
        ]
      },
      {
        speaker: "B",
        en: "That is a huge relief! How did my cholesterol and blood sugar look?",
        zh: "那真是鬆了一大口氣！我的膽固醇和血糖數值看起來如何？",
        ear: "[Tha-tsə] huge relief! How did my cholesterol ən [blʌd-shʊ-ger] lʊk?",
        cloze: ["huge relief", "blood sugar"],
        chunks: [
          { orig: "That's a huge relief", sound: "Tha-tsə huge relief", tip: "真是鬆了一大口氣" }
        ]
      },
      {
        speaker: "A",
        en: "Your fasting glucose is slightly borderline, so it is worth keeping an eye on.",
        zh: "您的空腹血糖稍微在臨界值邊緣，所以值得多加留意。",
        ear: "Yer fasting glucose iz slightly borderline, so i-ts worth [kee-ping-ə-nai-on].",
        cloze: ["borderline", "keeping an eye on"],
        chunks: [
          { orig: "borderline", sound: "bor-der-lain", tip: "數值處於正常與超標的臨界邊緣" }
        ]
      },
      {
        speaker: "B",
        en: "I've been using my smartwatch to keep track of my daily steps and heart rate.",
        zh: "我最近一直有用智慧手錶在追蹤記錄每天的步數與心率。",
        ear: "I'v bin using my smartwatch tə [keep-tra-kəv] my daily steps ən har'-rate.",
        cloze: ["keep track of", "heart rate"],
        chunks: [
          { orig: "keep track of", sound: "keep-tra-kəv", tip: "持續記錄、追蹤" }
        ]
      },
      {
        speaker: "A",
        en: "That is a great habit, even a brisk twenty-minute walk after dinner makes a big difference.",
        zh: "這習慣非常棒，就算只是晚餐後快走二十分鐘，也會帶來很大的改善。",
        ear: "Tha-tsə gray' habit, even ə brisk twen-dee-minute walk after dinner [mayk-sə] big difference.",
        cloze: ["brisk", "makes a big difference"],
        chunks: [
          { orig: "brisk walk", sound: "brisk walk", tip: "步調輕快、有運動效果的快走" }
        ]
      },
      {
        speaker: "B",
        en: "I'm also trying to cut back on late-night snacks and get more sleep.",
        zh: "我也正在試著減少吃宵夜，並讓自己睡眠更充足。",
        ear: "I'm also [trai-nə] [cʌ'-ba-kon] late-night snacks ən get more sleep.",
        cloze: ["cut back on", "late-night"],
        chunks: [
          { orig: "cut back on", sound: "cʌ'-ba-kon", tip: "減少攝取或減少花費" }
        ]
      },
      {
        speaker: "A",
        en: "Keep it up! We will recheck your numbers in six months to see the trend.",
        zh: "繼續保持！我們六個月後再複查一次您的數值，看看變化趨勢。",
        ear: "[Kee-pi-dʌp]! We'll recheck yer numbers in six months tə see the trend.",
        cloze: ["Keep it up", "in six months"],
        chunks: [
          { orig: "Keep it up", sound: "Kee-pi-dʌp", tip: "繼續保持好表現！" }
        ]
      },
      {
        speaker: "B",
        en: "Sounds good, thanks for taking the time to explain everything so clearly.",
        zh: "太好了，謝謝您花時間把所有細節解釋得這麼清楚。",
        ear: "Sounz gʊd, thanks fer [tay-king-the-time] tə explain everything so clearly.",
        cloze: ["Sounds good", "taking the time"],
        chunks: [
          { orig: "taking the time", sound: "tay-king the time", tip: "特地抽空、花時間" }
        ]
      }
    ]
  },

  // ==================== 🛒 購物消費、客服與銀行電信 (Shopping, Customer Service & Errands · 3 Units) ====================
  {
    id: "shop-01",
    category: "shopping",
    categoryName: "🛒 購物消費與電話客服",
    title: "Shopping 01｜百貨門市退換貨、尺寸詢問與刷退收據 (Returns & Exchanges)",
    focus: "門市退換貨與尋找尺寸高頻對話：try this on / run small / store credit / back on your card",
    duration: "約 3 分鐘 · 8 句",
    lines: [
      {
        speaker: "A",
        en: "Hi there! Are you finding everything okay, or looking for a specific size?",
        zh: "您好！今天找東西都還順利嗎，還是在找特定的尺寸？",
        ear: "Hi there! Ar-yü finding everything okay, er [lʊ-king-fer-ə] specific size?",
        cloze: ["finding everything", "looking for a"],
        chunks: [
          { orig: "Are you finding everything okay?", sound: "Ar-yü finding everything okay", tip: "北美店員主動招呼客人的標準句型" }
        ]
      },
      {
        speaker: "B",
        en: "I bought this jacket yesterday, but it turns out it runs a little small.",
        zh: "我昨天買了這件外套，結果發現它的版型偏小了一點。",
        ear: "I baw' this jacket yesterday, bə-dit [tɜrn-zout] it [rʌn-zə-li-dəl] small.",
        cloze: ["turns out", "runs a little small"],
        chunks: [
          { orig: "turns out", sound: "tɜrn-zout", tip: "結果發現、原來..." },
          { orig: "runs small / runs large", sound: "rʌnz small", tip: "衣服鞋子「版型偏小／偏大」的道地說法" }
        ]
      },
      {
        speaker: "A",
        en: "Would you like to swap it out for a large, or just do a full return?",
        zh: "您想要換成大一號（L 號），還是直接辦理全額退貨？",
        ear: "Wʊ-jü like tə [swa-pi-dout] fer ə large, er jəs dü ə full return?",
        cloze: ["swap it out", "full return"],
        chunks: [
          { orig: "swap it out", sound: "swa-pi-dout", tip: "換貨、替換掉" }
        ]
      },
      {
        speaker: "B",
        en: "Let me try on the large first, where are your fitting rooms located?",
        zh: "讓我先試穿看看 L 號，請問你們的試衣間在哪裡？",
        ear: "[Le-mee] [trai-on] the large first, where-er yer [fi-ding-roomz] located?",
        cloze: ["try on", "fitting rooms"],
        chunks: [
          { orig: "fitting rooms", sound: "fi-ding roomz", tip: "試衣間；tt 變彈舌 d" }
        ]
      },
      {
        speaker: "A",
        en: "Right around the corner by the cashier, I'll unlock a room for you.",
        zh: "就在收銀台旁邊轉角處，我幫您把試衣間的門打開。",
        ear: "[Righ-də-round] the corner by the cashier, I'll [ʌn-la-kə] room fer-yü.",
        cloze: ["around the corner", "unlock a"],
        chunks: [
          { orig: "Right around the corner", sound: "Righ-də-round the corner", tip: "就在轉角附近" }
        ]
      },
      {
        speaker: "B",
        en: "Actually, the sleeves are still a bit too long, so I'd like to return it.",
        zh: "其實袖子對我來說還是稍微太長了，所以我想直接退貨。",
        ear: "Actually, the sleevz er still [ə-bi'-tü] long, so I'd like tə [ri-tɜr-nit].",
        cloze: ["a bit too", "return it"],
        chunks: [
          { orig: "return it", sound: "ri-tɜr-nit", tip: "n 與 it 連音" }
        ]
      },
      {
        speaker: "A",
        en: "No problem at all! As long as you have the receipt and the tags are still on.",
        zh: "完全沒問題！只要您有收據，而且吊牌都還在衣服上就可以。",
        ear: "No problem ə-dall! [Əz-long-əz] yü hav the receipt ən the tagz er [stil-lon].",
        cloze: ["As long as", "still on"],
        chunks: [
          { orig: "receipt", sound: "ri-SEET", tip: "注意 p 完全不發音！" }
        ]
      },
      {
        speaker: "A",
        en: "The refund will go right back onto your original card within three business days.",
        zh: "退款會在三個工作天內直接退回您原本刷的那張信用卡。",
        ear: "The refund wil go [righ'-back] on-tə yer original card within three business days.",
        cloze: ["right back", "business days"],
        chunks: [
          { orig: "back onto your card", sound: "back on-tə yer card", tip: "刷退回原信用卡" }
        ]
      }
    ]
  },
  {
    id: "shop-02",
    category: "shopping",
    categoryName: "🛒 購物消費與電話客服",
    title: "Shopping 02｜電話客服交涉：帳單重複扣款與費用減免 (Customer Support & Billing)",
    focus: "最考驗純聽力的無畫面電話客服：charged twice / waive the fee / confirmation number",
    duration: "約 3 分鐘 · 8 句",
    lines: [
      {
        speaker: "A",
        en: "Thank you for calling customer support, how can I help you out today?",
        zh: "感謝您致電客戶服務中心，請問今天有什麼我可以幫您的？",
        ear: "Thank-yü fer calling customer support, how kə-nI [hel-pyü-out] tə-day?",
        cloze: ["calling", "help you out"],
        chunks: [
          { orig: "help you out", sound: "hel-pyü-out", tip: "幫你解決問題" }
        ]
      },
      {
        speaker: "B",
        en: "Hi, I was looking at my monthly statement and noticed I was charged twice.",
        zh: "您好，我剛才在看我的月結帳單，發現我被重複扣款了兩次。",
        ear: "Hi, I wəz [lʊ-king-at] my monthly statement ən noticed I wəz [charj-dtwais].",
        cloze: ["monthly statement", "charged twice"],
        chunks: [
          { orig: "charged twice", sound: "charj-dtwais", tip: "被刷了兩次卡、重複收費" }
        ]
      },
      {
        speaker: "A",
        en: "I'd be happy to look into that for you, may I have your account number?",
        zh: "我很樂意幫您查詢這筆紀錄，請問您的帳號是多少？",
        ear: "I'd bee happy tə [lʊ-kin-tə] that fer-yü, may I hav yer account number?",
        cloze: ["look into", "account number"],
        chunks: [
          { orig: "look into that", sound: "lʊ-kin-tə that", tip: "幫您查明、調查" }
        ]
      },
      {
        speaker: "A",
        en: "I see what happened, the first transaction is just a pending hold that will drop off.",
        zh: "我看到原因了，第一筆交易只是預授權圈存，過幾天就會自動取消消失。",
        ear: "I see wha' happened, the firs' transaction iz jəs ə [pen-ding-hold] that-əl [dra-poff].",
        cloze: ["pending hold", "drop off"],
        chunks: [
          { orig: "pending hold", sound: "pen-ding hold", tip: "信用卡尚未請款的預授權圈存" },
          { orig: "drop off", sound: "dra-poff", tip: "從帳單明細上自動消失解除" }
        ]
      },
      {
        speaker: "B",
        en: "Also, I got hit with a late fee even though I set up auto-pay last month.",
        zh: "另外，我上個月明明已經設定了自動扣繳，卻還是被收了一筆滯納金。",
        ear: "Also, I [ga'-hit-with] ə late fee even though I [se-dʌp] auto-pay las'-month.",
        cloze: ["got hit with", "set up"],
        chunks: [
          { orig: "got hit with a fee", sound: "ga'-hit with ə fee", tip: "莫名被收取某筆罰金或費用" }
        ]
      },
      {
        speaker: "A",
        en: "Since you have a great payment history, I can go ahead and waive that fee as a one-time courtesy.",
        zh: "因為您的繳款紀錄一向良好，我可以直接破例幫您免除這筆費用。",
        ear: "Since yü ha-və gray' payment history, I kən go-ə-head ən [wayv-that-fee] əz ə one-time courtesy.",
        cloze: ["waive that fee", "one-time courtesy"],
        chunks: [
          { orig: "waive that fee", sound: "wayv-that-fee", tip: "免除手續費或違約金（電話交涉必備關鍵詞！）" }
        ]
      },
      {
        speaker: "B",
        en: "I really appreciate that! Could you give me a reference number for this call?",
        zh: "非常感謝您！可以請您給我這通客服電話的案件編號嗎？",
        ear: "I really appreciate that! Kʊ-jü [giv-mee-ə] reference number fer this call?",
        cloze: ["give me a", "reference number"],
        chunks: [
          { orig: "reference number", sound: "ref-rəns number", tip: "客服案件紀錄編號" }
        ]
      },
      {
        speaker: "A",
        en: "Sure, I just sent a confirmation email to the address we have on file.",
        zh: "沒問題，我剛才已經把確認信寄到我們系統留存的電子信箱了。",
        ear: "Sure, I jəs [sen-də] confirmation email tə the address we [ha-von-file].",
        cloze: ["sent a", "on file"],
        chunks: [
          { orig: "on file", sound: "on-file", tip: "系統存檔中、留存紀錄的" }
        ]
      }
    ]
  },
  {
    id: "shop-03",
    category: "shopping",
    categoryName: "🛒 購物消費與電話客服",
    title: "Shopping 03｜Apple/電子門市線上取貨、轉移資料與保固維修 (Tech Store & Pickup)",
    focus: "門市購買 iPad / iPhone 常見對話：in stock / trade in / out of the box / AppleCare",
    duration: "約 3 分鐘 · 8 句",
    lines: [
      {
        speaker: "A",
        en: "Hi! I placed an order online for an iPad Air, I'm here to pick it up.",
        zh: "嗨！我在網路上下單買了一台 iPad Air，我是來店裡取貨的。",
        ear: "Hi! I [play-stən-order] online fer ən iPad Air, I'm here tə [pi-ki-dʌp].",
        cloze: ["placed an order", "pick it up"],
        chunks: [
          { orig: "placed an order", sound: "play-stən-order", tip: "下訂單" }
        ]
      },
      {
        speaker: "B",
        en: "Awesome! Let me scan the QR code on your phone and grab it from the back.",
        zh: "太棒了！讓我掃一下您手機上的 QR Code，然後去後面倉庫幫您拿出來。",
        ear: "Awesome! Le-mee scan the QR code on yer phone ən [gra-bit] frəm the back.",
        cloze: ["grab it", "from the back"],
        chunks: [
          { orig: "from the back", sound: "frəm the back", tip: "從門市後方的庫房拿出來" }
        ]
      },
      {
        speaker: "A",
        en: "By the way, do you have the Apple Pencil Pro in stock right now?",
        zh: "順帶問一下，你們現在店裡有 Apple Pencil Pro 的現貨嗎？",
        ear: "By the way, djü hav the Apple Pencil Pro [in-stak] righ'-now?",
        cloze: ["in stock", "right now"],
        chunks: [
          { orig: "in stock / out of stock", sound: "in-stak / ou-də-stak", tip: "有現貨／缺貨" }
        ]
      },
      {
        speaker: "B",
        en: "We sure do! Did you want to trade in your old device for instant credit?",
        zh: "我們當然有！請問您想要拿舊機折抵換購，直接折抵現金嗎？",
        ear: "[We-shʊr-dü]! Di-jü wa-nə [tray-din] yer old device fer instant credit?",
        cloze: ["trade in", "instant credit"],
        chunks: [
          { orig: "trade in", sound: "tray-din", tip: "舊機換新機折抵" }
        ]
      },
      {
        speaker: "A",
        en: "Not today, I'm handing my old one down to my student for lab work.",
        zh: "今天先不用，我打算把舊的那台傳給我的學生做實驗室研究用。",
        ear: "Na' tə-day, I'm [han-ding] my old wʌn down tə my student fer lab work.",
        cloze: ["handing ... down", "lab work"],
        chunks: [
          { orig: "hand down", sound: "hand down", tip: "把用過的物品傳承/轉交給下一代或後輩" }
        ]
      },
      {
        speaker: "B",
        en: "Would you like to set it up here on our Wi-Fi, or take it home sealed?",
        zh: "您想要在店裡連我們的 Wi-Fi 現場開機設定，還是保持未拆封直接帶回家？",
        ear: "Wʊ-jü like tə [se-di-dʌp] here on our Wi-Fi, er [tay-kit-home] sealed?",
        cloze: ["set it up", "take it home"],
        chunks: [
          { orig: "set it up", sound: "se-di-dʌp", tip: "兩個 t 皆變彈舌 d 連音" }
        ]
      },
      {
        speaker: "A",
        en: "I'll set it up at the hotel, it is pretty easy to transfer data right out of the box.",
        zh: "我回飯店再設定就好，現在新機開箱直接轉移資料非常簡單。",
        ear: "I'll se-di-dʌp at the hotel, i-ts pri-dee easy tə transfer day-də [righ-dou-də-the-box].",
        cloze: ["transfer data", "out of the box"],
        chunks: [
          { orig: "right out of the box", sound: "righ-dou-də-the-box", tip: "一開箱即可直接使用、免複雜安裝" }
        ]
      },
      {
        speaker: "B",
        en: "You have sixty days to add extended warranty if you change your mind!",
        zh: "如果您之後改變心意，在六十天內都可以加購延長保固！",
        ear: "Yü hav SIX-dee days tə add extended warranty i-fyü [chayn-jer-mind]!",
        cloze: ["extended warranty", "change your mind"],
        chunks: [
          { orig: "change your mind", sound: "chayn-jer-mind", tip: "改變心意" }
        ]
      }
    ]
  }
];

// ==================== 📚 預先找好的精選教材來源庫 (12 Pre-Curated Authentic Sources) ====================
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
    id: "src-tech-negotiation",
    sourceBrand: "Silicon Valley PM 跨國會議",
    category: "meeting",
    badge: "會議英語 · 預算與時程談判",
    title: "矽谷產品會議｜當對方臨時加需求（Scope Creep）時的溝通話術",
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
    id: "src-wharton-leadership",
    sourceBrand: "Wharton 華頓商學院高管論壇",
    category: "meeting",
    badge: "會議英語 · 預算審核與 KPI",
    title: "華頓商管精選｜年度預算審查與投資報酬率攻防 (Annual Budget Review & ROI)",
    duration: "3 分鐘標準單元 (8 句)",
    originUrl: "https://knowledge.wharton.upenn.edu/",
    description: "高階主管與校務/院務委員會審查年度預算時，針對成本效益、資源重新配置與關鍵指標的快語速問答。",
    rawScript: `Before we approve the new equipment budget, we need to see a clear return on investment. | 在我們批准新設備預算之前，我們需要看到明確的投資報酬率。
Our projections show that automating the workflow will cut processing time by thirty percent. | 我們的預測顯示，將工作流程自動化能減少百分之三十的處理時間。
How long will it take for the cost savings to offset the initial upfront investment? | 節省下來的成本需要多久才能抵銷最初的前期投資？
We expect to break even within fourteen months of full deployment. | 我們預計在全面部署後的十四個月內達到損益兩平。
Have you factored in the ongoing maintenance and staff training costs? | 你們把後續的定期維護與人員教育訓練成本也算進去了嗎？
Yes, those are already baked into the operating expenses on slide four. | 有的，那些已經包含在第四頁投影片的營運費用裡面了。
In that case, I'm comfortable moving forward with the first phase of funding. | 既然如此，我贊成繼續推進第一階段的經費撥款。
Let's review the KPIs at the end of Q2 before releasing the remaining funds. | 我們在第二季結束時先檢視關鍵績效指標，再撥付剩餘的經費。`
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
    id: "src-nejm-podcast",
    sourceBrand: "NEJM 臨床醫學對談",
    category: "academic",
    badge: "學術交流 · 生成式 AI 醫療",
    title: "NEJM 訪談精選｜大型語言模型在病歷摘要與醫病溝通的實證評估",
    duration: "3 分鐘標準單元 (8 句)",
    originUrl: "https://ai.nejm.org/",
    description: "探討醫療生成式 AI 如何協助臨床醫師撰寫出院病摘，以及如何防範模型幻覺（Hallucinations）的快語速學者對談。",
    rawScript: `One of the biggest time sinks for physicians is writing discharge summaries after a long shift. | 對醫師來說，最耗時間的工作之一就是在漫長的值班後撰寫出院病歷摘要。
Large language models can draft a comprehensive summary in seconds, but accuracy is paramount. | 大型語言模型能在幾秒內草擬出完整的摘要，但準確性是最高原則。
In our clinical trial, we found that doctors still needed to keep a human in the loop. | 在我們的臨床試驗中，我們發現醫師仍然必須維持「人類專家在迴路中把關」的機制。
Did the model ever hallucinate medications or lab values that weren't in the chart? | 模型有沒有曾經憑空捏造出病歷上沒有的藥物或檢驗數值？
It happened in less than two percent of cases, mostly when the handwritten notes were ambiguous. | 那發生在不到百分之二的案例中，大多是因為手寫紀錄模稜兩可的時候。
Once we restricted the prompt to structured EHR fields, those errors virtually disappeared. | 一旦我們將提示詞限制在結構化的電子病歷欄位，那些錯誤就幾乎完全消失了。
Patients also reported that the AI-assisted instructions were much easier to understand. | 病患也回報表示，有 AI 輔助生成的衛教說明變得更容易理解了。
The next step is evaluating whether this actually reduces thirty-day hospital readmissions. | 下一步是評估這是否能真正降低三十天內的再住院率。`
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
    id: "src-npr-travel",
    sourceBrand: "NPR Life Kit 美式生活實境",
    category: "travel",
    badge: "差旅實戰 · 機場應變",
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
  },
  {
    id: "src-nyt-dining",
    sourceBrand: "NYT Cooking & Dining 餐酒館實境",
    category: "dining",
    badge: "餐廳社交 · 點酒與推薦",
    title: "紐約餐廳實境｜詢問侍酒師推薦、牛排熟度與桌邊寒暄 (Sommelier & Fine Dining)",
    duration: "3 分鐘標準單元 (8 句)",
    originUrl: "https://www.nytimes.com/section/food",
    description: "在歐美高檔餐廳用餐時，服務生高速介紹當日鮮魚、配菜替換與紅白酒搭餐的真實口語。",
    rawScript: `Good evening! Tonight our chef is featuring a pan-seared halibut with roasted asparagus. | 晚安！今晚我們主廚特別推出香煎大比目魚佐烤蘆筍。
That sounds tempting, how is the ribeye steak prepared, and what sides come with it? | 聽起來很誘人，請問肋眼牛排是怎麼料理的？附餐配菜有什麼？
It is dry-aged for thirty days and comes with truffle mashed potatoes, cooked to your liking. | 它經過三十天乾式熟成，附松露馬鈴薯泥，熟度依您的喜好烹調。
I'll go with the ribeye medium-rare, and could I swap the potatoes for a side salad? | 我要點三分熟的肋眼牛排，另外可以把馬鈴薯泥換成配餐沙拉嗎？
Absolutely! And would you like to see the wine list, or start with a cocktail? | 當然沒問題！請問您想看酒單，還是先來杯調酒？
Could you recommend a full-bodied red wine by the glass that pairs well with the steak? | 可以請您推薦一款適合搭配牛排、可單杯點用的酒體飽滿紅酒嗎？
Our Napa Valley Cabernet is fantastic, let me pour you a small taste first to make sure you like it. | 我們納帕谷的卡本內紅酒非常棒，讓我先倒一小口給您試喝，確認您喜歡。
It is super smooth, we will take two glasses of that, please! | 口感非常順口，請給我們來兩杯！`
  },
  {
    id: "src-mayo-wellness",
    sourceBrand: "Mayo Clinic 梅奧診所健康管理",
    category: "medical",
    badge: "醫療健康 · 睡眠與壓力",
    title: "Mayo Clinic 精選｜改善睡眠品質、克服時差與預防倦怠 (Sleep Hygiene & Jet Lag)",
    duration: "3 分鐘標準單元 (8 句)",
    originUrl: "https://www.mayoclinic.org/",
    description: "針對經常跨時區出差與高壓研究的學者主管，醫師給予的睡眠生理時鐘調整建議。",
    rawScript: `When you fly across multiple time zones, your internal body clock gets completely thrown off. | 當你飛越數個時區時，你體內的生理時鐘會完全被打亂。
The best way to reset your circadian rhythm is getting natural sunlight first thing in the morning. | 重設晝夜節律最好的方法，就是一早起來立刻去曬自然陽光。
Should I take melatonin before getting on the plane, or wait until I land? | 我應該在上飛機前吃褪黑激素，還是等降落之後再吃？
Wait until it is bedtime at your destination, taking it too early can actually backfire. | 等到目的地時間的睡前再吃，太早吃反而可能產生反效果。
Also, try to avoid heavy meals and caffeine at least six hours before you plan to sleep. | 此外，在計畫入睡前至少六小時，盡量避免大魚大肉和咖啡因。
What if I wake up at three in the morning and can't fall back asleep? | 萬一我凌晨三點醒來，然後再也睡不著怎麼辦？
Don't just toss and turn in bed, get up and read a book under dim light for twenty minutes. | 別在床上翻來覆去，起身在微弱燈光下看二十分鐘的書。
Within two or three days, your sleep cycle should be right back on track. | 在兩到三天之內，你的睡眠週期應該就會回到正軌了。`
  },
  {
    id: "src-wsj-tech-errands",
    sourceBrand: "WSJ Personal Tech 數位生活",
    category: "shopping",
    badge: "消費客服 · 國際漫遊與電信",
    title: "出國電信門市｜辦理 eSIM 數據方案、熱點分享與收訊排障 (eSIM & Roaming Setup)",
    duration: "3 分鐘標準單元 (8 句)",
    originUrl: "https://www.wsj.com/tech/personal-tech",
    description: "抵達國外機場或市區電信行辦理 eSIM 網路方案、確認熱點分享額度與跨州收訊的實用對話。",
    rawScript: `Hi! I'm visiting for two weeks and need a prepaid eSIM data plan for my iPhone. | 您好！我來這裡出差兩週，需要為我的 iPhone 辦理預付型 eSIM 上網方案。
First, let's make sure your phone is carrier-unlocked so it can accept a local eSIM. | 首先，我們先確認您的手機沒有電信商鎖機，才能安裝當地的 eSIM。
Yes, it is unlocked, and I'd like to keep my home number active for text messages. | 有的，手機是無鎖版，而且我想保留原本門號開啟以接收簡訊。
No problem, we can set our eSIM as your primary line for cellular data only. | 沒問題，我們可以把我們的 eSIM 設定為僅供行動數據上網的主線路。
Does the thirty-gigabyte plan allow me to use personal hotspot for my iPad? | 請問 30GB 的方案允許我開個人熱點分享給我的 iPad 使用嗎？
Yes, hotspot tethering is included at full speed up to ten gigabytes. | 可以的，方案包含高達 10GB 的全速熱點分享額度。
Just scan this QR code in your settings, and it should activate within a couple of minutes. | 只要在手機設定裡掃描這個 QR Code，幾分鐘內就會開通生效。
Awesome, I already see five-G bars at the top of my screen, thanks a lot! | 太棒了，我已經看到螢幕上方出現 5G 訊號格了，非常謝謝你！`
  },
  {
    id: "src-friends-sitcom",
    sourceBrand: "美劇日常快語速連音實境",
    category: "reduction",
    badge: "連音特訓 · 母語超快語速",
    title: "美劇生活對話｜臨時揪團聚餐、忘記帶錢包與轉帳分攤 (Venmo & Casual Hangout)",
    duration: "3 分鐘標準單元 (8 句)",
    originUrl: "https://www.npr.org/sections/pop-culture",
    description: "模擬美劇朋友間最真實的超快連音對白：充滿 gonna / wanna / gotta / whatcha / Venmo you。",
    rawScript: `Hey, what are you guys doing for lunch? Do you want to grab tacos down the street? | 嗨，你們午餐要吃什麼？想不想去街角買塔可餅吃？
I was going to heat up my leftovers, but tacos sound way better right now. | 我本來打算微波加熱我的剩菜，但現在塔可餅聽起來誘人多了。
Awesome, let's head out before the noon rush hits, that place gets packed fast. | 太棒了，我們在中午尖峰人潮湧現前出發吧，那家店很快就會客滿。
Oh shoot, I just realized I left my wallet in my other jacket pocket! | 糟糕，我才剛發現我把錢包忘在另一件外套口袋裡了！
Don't sweat it, I've got you covered, you can just pay me back later. | 別擔心，我先幫你墊，你晚點再還我就好。
Are you sure? I can transfer it to you right now on my phone. | 你確定嗎？我現在就可以用手機轉帳給你。
Yeah, no rush at all, just get me back next time we go out for coffee. | 對啦，完全不急，下次我們去喝咖啡時再換你請我就好。
You are the best! Come on, let's get going before they run out of guacamole. | 你人最好了！走吧，我們快出發，免得他們的酪梨醬賣光了。`
  }
];

