import type { Question, Answers } from "./types";

const has = (a: Answers, key: string, val: string | number) =>
  Array.isArray(a[key]) && (a[key] as (string | number)[]).includes(val);

export const GUIDED_QUESTIONS: Question[] = [
  // ── About You ──
  {
    id: "lifeStage", section: "About You",
    q: "Where are you in life right now?",
    sub: "This helps us pick the right time horizon.",
    type: "single",
    options: [
      { icon: "🌱", label: "Just starting out", value: "start" },
      { icon: "🚀", label: "Building my career", value: "build" },
      { icon: "💼", label: "Peak earning years", value: "peak" },
      { icon: "🏖️", label: "Near / in retirement", value: "retire" },
    ],
  },
  {
    id: "ageBand", section: "About You",
    q: "Which age group are you in?",
    sub: "A rough range is fine — you'll confirm the exact age later.",
    type: "single",
    options: [
      { icon: "🧑", label: "20s", value: 25 },
      { icon: "🧑‍💼", label: "30s", value: 35 },
      { icon: "👨‍👩‍👧", label: "40s", value: 45 },
      { icon: "🧓", label: "50s", value: 55 },
      { icon: "👴", label: "60 or above", value: 65 },
    ],
  },
  {
    id: "maritalStatus", section: "About You",
    q: "What's your marital status?",
    type: "single",
    options: [
      { icon: "🧍", label: "Single", value: "single" },
      { icon: "💍", label: "Married", value: "married" },
      { icon: "💔", label: "Divorced", value: "divorced" },
      { icon: "🕯️", label: "Widowed", value: "widowed" },
    ],
  },
  {
    id: "dependents", section: "About You",
    q: "Who depends on you financially?",
    sub: "Pick all that apply.",
    type: "multi",
    options: [
      { icon: "🧍", label: "Just me", value: "self" },
      { icon: "💑", label: "Spouse / partner", value: "spouse" },
      { icon: "🧒", label: "Children", value: "kids" },
      { icon: "👵", label: "Parents", value: "parents" },
    ],
  },
  {
    id: "kids", section: "About You",
    q: "How many children do you support?",
    type: "single",
    showIf: (a) => has(a, "dependents", "kids"),
    options: [
      { icon: "1️⃣", label: "One", value: 1 },
      { icon: "2️⃣", label: "Two", value: 2 },
      { icon: "3️⃣", label: "Three or more", value: 3 },
    ],
  },
  {
    id: "employment", section: "About You",
    q: "How do you earn your primary income?",
    type: "single",
    options: [
      { icon: "🏢", label: "Salaried — private", value: "private" },
      { icon: "🏛️", label: "Salaried — government", value: "govt" },
      { icon: "🎖️", label: "Defence services", value: "defence" },
      { icon: "💻", label: "Self-employed / freelance", value: "self" },
      { icon: "🏭", label: "Business owner", value: "business" },
      { icon: "🏖️", label: "Retired", value: "retired" },
    ],
  },
  {
    id: "cityTier", section: "About You",
    q: "Where do you live?",
    sub: "Cost of living varies a lot by city.",
    type: "single",
    options: [
      { icon: "🌆", label: "Metro (Mumbai, Delhi, etc.)", value: "metro" },
      { icon: "🏙️", label: "Tier-2 city", value: "tier2" },
      { icon: "🏡", label: "Tier-3 / town", value: "tier3" },
    ],
  },

  // ── Income ──
  {
    id: "incomeStability", section: "Income",
    q: "How steady is your income?",
    type: "single",
    options: [
      { icon: "🏢", label: "Very steady (salaried)", value: "steady" },
      { icon: "📊", label: "Mostly steady", value: "mostly" },
      { icon: "📈", label: "Variable / business", value: "variable" },
      { icon: "🎲", label: "Irregular", value: "irregular" },
    ],
  },
  {
    id: "incomeSources", section: "Income",
    q: "How many income sources do you have?",
    sub: "Salary, rent, business, freelance, etc.",
    type: "single",
    options: [
      { icon: "1️⃣", label: "Just one", value: "one" },
      { icon: "2️⃣", label: "Two", value: "two" },
      { icon: "3️⃣", label: "Three or more", value: "threePlus" },
    ],
  },
  {
    id: "incomeGrowthExp", section: "Income",
    q: "How fast do you expect your income to grow?",
    type: "single",
    options: [
      { icon: "🐢", label: "Slowly (≈3%/yr)", value: "low" },
      { icon: "🚶", label: "Moderately (≈6%/yr)", value: "moderate" },
      { icon: "🏃", label: "Quickly (≈10%/yr)", value: "high" },
    ],
  },
  {
    id: "bonusVariable", section: "Income",
    q: "Do you get bonuses or variable pay?",
    type: "single",
    options: [
      { icon: "✅", label: "Yes, a meaningful chunk", value: "yes" },
      { icon: "➖", label: "A little", value: "some" },
      { icon: "❌", label: "No", value: "no" },
    ],
  },

  // ── Spending ──
  {
    id: "trackSpending", section: "Spending",
    q: "How do you track your spending today?",
    type: "single",
    options: [
      { icon: "🤷", label: "I don't track", value: "no" },
      { icon: "🧠", label: "Mentally", value: "mentally" },
      { icon: "📊", label: "A spreadsheet", value: "spreadsheet" },
      { icon: "📱", label: "An app", value: "app" },
    ],
  },
  {
    id: "home", section: "Spending",
    q: "What's your home situation?",
    type: "single",
    options: [
      { icon: "🔑", label: "Renting", value: "rent" },
      { icon: "🏠", label: "Own — with a home loan", value: "loan" },
      { icon: "🏡", label: "Own — fully paid", value: "owned" },
      { icon: "👨‍👩‍👧", label: "Live with family", value: "family" },
    ],
  },
  {
    id: "vehicles", section: "Spending",
    q: "How many vehicles in your household?",
    type: "single",
    options: [
      { icon: "🚌", label: "None", value: "0" },
      { icon: "🚗", label: "One", value: "1" },
      { icon: "🚙", label: "Two or more", value: "2plus" },
    ],
  },
  {
    id: "car", section: "Spending",
    q: "Is any vehicle on a loan?",
    type: "single",
    showIf: (a) => a.vehicles === "1" || a.vehicles === "2plus",
    options: [
      { icon: "💸", label: "Yes — on loan", value: "loan" },
      { icon: "✅", label: "No — paid off", value: "paid" },
    ],
  },
  {
    id: "eatOut", section: "Spending",
    q: "How often do you eat out or order in?",
    type: "single",
    options: [
      { icon: "🍱", label: "Rarely", value: "rarely" },
      { icon: "🍽️", label: "Weekly", value: "weekly" },
      { icon: "🍔", label: "A few times a week", value: "often" },
      { icon: "🛵", label: "Almost daily", value: "daily" },
    ],
  },
  {
    id: "subscriptionsCount", section: "Spending",
    q: "How many paid subscriptions do you have?",
    sub: "OTT, music, apps, gym, etc.",
    type: "single",
    options: [
      { icon: "🔹", label: "0–1", value: "few" },
      { icon: "🔸", label: "2–4", value: "some" },
      { icon: "🔶", label: "5 or more", value: "many" },
    ],
  },
  {
    id: "supportFamily", section: "Spending",
    q: "Do you financially support parents or extended family?",
    type: "single",
    options: [
      { icon: "✅", label: "Yes, regularly", value: "yes" },
      { icon: "➖", label: "Occasionally", value: "sometimes" },
      { icon: "❌", label: "No", value: "no" },
    ],
  },
  {
    id: "spending", section: "Spending",
    q: "How would you describe your spending?",
    sub: "Be honest — there's no wrong answer.",
    type: "single",
    options: [
      { icon: "🐷", label: "I save a lot", value: "saver" },
      { icon: "🙂", label: "I save some", value: "some" },
      { icon: "⚖️", label: "I break even", value: "even" },
      { icon: "😅", label: "I tend to overspend", value: "over" },
    ],
  },

  // ── Debt ──
  {
    id: "hasLoans", section: "Debt",
    q: "Do you currently have any loans?",
    type: "single",
    options: [
      { icon: "✅", label: "Yes", value: "yes" },
      { icon: "🎉", label: "No, I'm debt-free", value: "no" },
    ],
  },
  {
    id: "loans", section: "Debt",
    q: "Which loans do you have?",
    sub: "Pick all that apply.",
    type: "multi",
    showIf: (a) => a.hasLoans === "yes",
    options: [
      { icon: "🏠", label: "Home loan", value: "home" },
      { icon: "🚗", label: "Car loan", value: "car" },
      { icon: "💳", label: "Credit card debt", value: "cc" },
      { icon: "🧾", label: "Personal loan", value: "personal" },
      { icon: "🎓", label: "Education loan", value: "education" },
    ],
  },
  {
    id: "ccBehavior", section: "Debt",
    q: "How do you handle your credit card bill?",
    type: "single",
    options: [
      { icon: "✅", label: "Pay in full", value: "full" },
      { icon: "〽️", label: "Pay minimum / partial", value: "minimum" },
      { icon: "🔴", label: "Carry a balance", value: "carry" },
      { icon: "🚫", label: "I don't use one", value: "none" },
    ],
  },
  {
    id: "debtFeeling", section: "Debt",
    q: "How do you feel about your debt?",
    type: "single",
    options: [
      { icon: "😀", label: "No debt", value: "none" },
      { icon: "🙂", label: "Manageable", value: "manageable" },
      { icon: "😟", label: "A bit stressful", value: "stressful" },
      { icon: "😣", label: "Overwhelming", value: "overwhelming" },
    ],
  },
  {
    id: "debtVsInvest", section: "Debt",
    q: "What matters more to you right now?",
    type: "single",
    options: [
      { icon: "💥", label: "Clearing debt fast", value: "payDebt" },
      { icon: "⚖️", label: "A bit of both", value: "balance" },
      { icon: "📈", label: "Investing for growth", value: "invest" },
    ],
  },

  // ── Savings & Assets ──
  {
    id: "emergencyFund", section: "Savings & Assets",
    q: "How big is your emergency fund?",
    sub: "Cash you could live on if income stopped.",
    type: "single",
    options: [
      { icon: "🚫", label: "None yet", value: "none" },
      { icon: "🔸", label: "Under 3 months", value: "under3" },
      { icon: "🔹", label: "3–6 months", value: "3to6" },
      { icon: "🛡️", label: "6+ months", value: "6plus" },
    ],
  },
  {
    id: "assetTypes", section: "Savings & Assets",
    q: "Where is your money today?",
    sub: "Pick all that apply — we'll ask amounts next.",
    type: "multi",
    options: [
      { icon: "🏦", label: "Savings account", value: "savings" },
      { icon: "📜", label: "Fixed deposits", value: "fd" },
      { icon: "📈", label: "Mutual funds", value: "mf" },
      { icon: "📊", label: "Direct stocks", value: "stocks" },
      { icon: "🏛️", label: "EPF / PPF / NPS", value: "epf" },
      { icon: "🪙", label: "Gold", value: "gold" },
      { icon: "🏠", label: "Real estate (extra)", value: "realestate" },
      { icon: "₿", label: "Crypto", value: "crypto" },
    ],
  },
  {
    id: "investingExp", section: "Savings & Assets",
    q: "How experienced are you with investing?",
    type: "single",
    options: [
      { icon: "🆕", label: "Beginner", value: "none" },
      { icon: "📘", label: "Some basics", value: "beginner" },
      { icon: "📗", label: "Fairly confident", value: "intermediate" },
      { icon: "📕", label: "Very experienced", value: "advanced" },
    ],
  },
  {
    id: "investRegular", section: "Savings & Assets",
    q: "Do you invest regularly?",
    type: "single",
    options: [
      { icon: "❌", label: "Not really", value: "no" },
      { icon: "➖", label: "Sometimes", value: "sometimes" },
      { icon: "📅", label: "Yes — monthly SIP", value: "monthly" },
    ],
  },
  {
    id: "retirementAccounts", section: "Savings & Assets",
    q: "Which retirement accounts do you have?",
    sub: "Pick all that apply.",
    type: "multi",
    options: [
      { icon: "🏛️", label: "EPF", value: "epf" },
      { icon: "📜", label: "PPF", value: "ppf" },
      { icon: "📈", label: "NPS", value: "nps" },
      { icon: "🚫", label: "None", value: "none" },
    ],
  },

  // ── Protection ──
  {
    id: "lifeInsurance", section: "Protection",
    q: "Do you have life insurance?",
    type: "single",
    options: [
      { icon: "🚫", label: "None", value: "none" },
      { icon: "🔸", label: "Some cover", value: "some" },
      { icon: "🛡️", label: "Adequate term cover", value: "adequate" },
      { icon: "❓", label: "Not sure", value: "unsure" },
    ],
  },
  {
    id: "healthInsurance", section: "Protection",
    q: "Do you have health insurance?",
    type: "single",
    options: [
      { icon: "🚫", label: "None", value: "none" },
      { icon: "🏢", label: "Only via employer", value: "employer" },
      { icon: "🧾", label: "Personal policy", value: "personal" },
      { icon: "✅", label: "Both", value: "both" },
    ],
  },
  {
    id: "willNominee", section: "Protection",
    q: "Have you set up a will & nominees?",
    type: "single",
    options: [
      { icon: "❌", label: "Not yet", value: "no" },
      { icon: "〽️", label: "Partially (some nominees)", value: "partial" },
      { icon: "✅", label: "Yes, sorted", value: "yes" },
    ],
  },

  // ── Goals ──
  {
    id: "goal", section: "Goals",
    q: "What's your #1 financial goal?",
    sub: "We'll build the plan around this.",
    type: "single",
    options: [
      { icon: "🏠", label: "Buy a home", value: "home" },
      { icon: "🎓", label: "Kids' education", value: "education" },
      { icon: "🏝️", label: "Retire early", value: "retire" },
      { icon: "📈", label: "Build wealth", value: "wealth" },
      { icon: "🛟", label: "Emergency safety net", value: "emergency" },
      { icon: "✈️", label: "Travel / lifestyle", value: "travel" },
    ],
  },
  {
    id: "goals2", section: "Goals",
    q: "Any other goals on your radar?",
    sub: "Pick all that apply (optional).",
    type: "multi",
    options: [
      { icon: "🏠", label: "Home", value: "home" },
      { icon: "🎓", label: "Education", value: "education" },
      { icon: "🚗", label: "A car", value: "car" },
      { icon: "✈️", label: "Travel", value: "travel" },
      { icon: "🏝️", label: "Retirement", value: "retire" },
      { icon: "📈", label: "Wealth", value: "wealth" },
    ],
  },
  {
    id: "retireAge", section: "Goals",
    q: "When do you want work to become optional?",
    sub: "Your target financial-freedom age.",
    type: "single",
    options: [
      { icon: "⚡", label: "By 45", value: 45 },
      { icon: "🎯", label: "By 50", value: 50 },
      { icon: "🛠️", label: "By 55", value: 55 },
      { icon: "🌅", label: "By 60", value: 60 },
      { icon: "⏳", label: "65 or later", value: 65 },
    ],
  },
  {
    id: "legacy", section: "Goals",
    q: "How important is leaving a legacy / estate?",
    type: "single",
    options: [
      { icon: "🔹", label: "Not a priority", value: "low" },
      { icon: "🔸", label: "Somewhat", value: "medium" },
      { icon: "🏛️", label: "Very important", value: "high" },
    ],
  },

  // ── Mindset ──
  {
    id: "risk", section: "Mindset",
    q: "If your investments dropped 20% in a month, you'd…",
    sub: "This sets your risk profile.",
    type: "single",
    options: [
      { icon: "😱", label: "Sell everything", value: "cons" },
      { icon: "😟", label: "Worry, maybe sell some", value: "bal-" },
      { icon: "😐", label: "Hold and wait it out", value: "bal" },
      { icon: "😎", label: "Invest more — it's a sale!", value: "agg" },
    ],
  },
  {
    id: "horizon", section: "Mindset",
    q: "How long can you leave money invested?",
    type: "single",
    options: [
      { icon: "⏱️", label: "Under 3 years", value: "short" },
      { icon: "📆", label: "3–7 years", value: "medium" },
      { icon: "📅", label: "7+ years", value: "long" },
    ],
  },
  {
    id: "moneyPersona", section: "Mindset",
    q: "Which sounds most like you?",
    type: "single",
    options: [
      { icon: "🐷", label: "Saver", value: "saver" },
      { icon: "🛍️", label: "Spender", value: "spender" },
      { icon: "🙈", label: "Avoider", value: "avoider" },
      { icon: "🎯", label: "Optimizer", value: "optimizer" },
    ],
  },
  {
    id: "freedomMeaning", section: "Mindset",
    q: "What does financial freedom mean to you?",
    type: "single",
    options: [
      { icon: "🚫", label: "Being debt-free", value: "nodebt" },
      { icon: "💧", label: "Passive income covers expenses", value: "passive" },
      { icon: "🏝️", label: "Retiring early", value: "retireEarly" },
      { icon: "🧘", label: "Work becomes a choice", value: "optional" },
    ],
  },
];
