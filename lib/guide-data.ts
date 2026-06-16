export interface GuideSection {
  heading: string;
  paragraphs: string[];
  bullets?: string[];
}

export interface GuideContent {
  slug: string;
  title: string;
  subtitle: string;
  audience: string;
  readTime: string;
  intro: string[];
  sections: GuideSection[];
  checklist: { title: string; items: string[] };
  closing: string[];
}

export const GUIDES: Record<string, GuideContent> = {
  "financial-health-check": {
    slug: "financial-health-check",
    title: "The 15-minute financial health check for professionals",
    subtitle: "Twelve questions, one score, three concrete next steps.",
    audience: "Salaried professionals in their 30s and 40s",
    readTime: "15 minutes",
    intro: [
      "Most professionals we meet are doing fine on paper — earning well, investing a bit, owning a flat or two. They also have a nagging suspicion that something isn't quite right. They can't articulate what.",
      "This 15-minute check is the framework we use to find the biggest gap in someone's plan. It's the same framework we walk paying clients through in their first session, distilled into 12 questions you can answer yourself.",
      "There are no scores to game, no products to push. Just an honest look at where you stand on the dimensions that actually matter over a 30-year wealth-building career.",
    ],
    sections: [
      {
        heading: "1. Income coverage",
        paragraphs: [
          "If your monthly take-home stopped tomorrow, how many months could you survive on your liquid savings (bank, FDs, liquid mutual funds — not real estate, not equity)?",
        ],
        bullets: [
          "Under 3 months — you're exposed. Build emergency fund before any new investments.",
          "3–6 months — adequate for stable income. Build to 6 if business or variable.",
          "6+ months — healthy. Consider deploying excess to long-term investments.",
          "12+ months — too conservative if you're under 50; opportunity cost is real.",
        ],
      },
      {
        heading: "2. Term insurance adequacy",
        paragraphs: [
          "Term cover should be roughly 10–15x your annual income, plus outstanding debts. If you earn ₹20L, with a ₹50L home loan, you need ₹2.5–3 Cr of pure term cover. Endowment, LIC, ULIP — none of these count toward this number.",
        ],
      },
      {
        heading: "3. Health insurance reality check",
        paragraphs: [
          "Employer health insurance vanishes the day you leave the job. Always have a personal policy alongside. Recommended: ₹15–25L family floater + ₹10L super top-up. Premium for a family of 4 in your 30s is typically ₹30–50k/year — minor cost, enormous protection.",
        ],
      },
      {
        heading: "4. Tax regime fit",
        paragraphs: [
          "Did you actually run the math on old vs new tax regime this year, or did you copy what a colleague said? Run both calculations explicitly using your actual 80C usage, HRA, home loan interest, and NPS. About 40% of professionals who switched to new regime would be ₹50k–₹2L better off in old.",
        ],
      },
      {
        heading: "5. Asset allocation drift",
        paragraphs: [
          "What's the actual split of your investments today across equity, debt, gold, real estate, and cash? If you've never written it down, do it now. Most professionals are massively over-allocated to real estate (60–70%) and cash (15–20%), with too little in equity for their age.",
          "Rough rule of thumb for asset allocation: (100 minus your age) percent in equity, with the rest split between debt and gold. A 35-year-old should be 65% in equity. Most aren't.",
        ],
      },
      {
        heading: "6. Direct vs Regular plan check",
        paragraphs: [
          "Open one of your mutual fund holdings. Look at the scheme name. Does it say 'Direct' or 'Regular' (or nothing — which usually means Regular)? If you have ₹20L in Regular plans for 20 years, you'll give up ₹15–20L to distributor commissions silently. Move everything to Direct via Coin, Kuvera, or MFCentral.",
        ],
      },
      {
        heading: "7. ESOP / RSU concentration",
        paragraphs: [
          "If you work at a tech company and have ESOPs or RSUs vesting, what percentage of your net worth is in your employer's stock? Anything above 15% is a concentration risk — your income AND your wealth both depend on the same company. Sell vested RSUs systematically; redeploy.",
        ],
      },
      {
        heading: "8. Tax harvesting status",
        paragraphs: [
          "Have you harvested your ₹1.25L LTCG exemption this financial year? If not, you're throwing away ₹15,625 in tax savings annually. Compounds to ₹15–20L over a 30-year investing career. Set a recurring March 15 reminder.",
        ],
      },
      {
        heading: "9. Will and nominees",
        paragraphs: [
          "Do all your bank accounts, demat, mutual funds, EPF, PPF, NPS, insurance policies have current nominees on file? Have you written a will? 70% of professionals haven't. Without a will and aligned nominees, your spouse can face 6–18 months of legal process to access funds in an emergency.",
        ],
      },
      {
        heading: "10. Goal projections",
        paragraphs: [
          "Pick your top 3 financial goals (retirement, kids' education, home upgrade). For each, do you know: target year, future cost adjusted for inflation, monthly SIP needed, current trajectory? If not all 3 are mapped, you're flying blind on the goals you care most about.",
        ],
      },
      {
        heading: "11. Debt vs invest balance",
        paragraphs: [
          "Are you paying more than 30% of take-home pay in EMIs? Anything above 30% squeezes your ability to invest, and almost guarantees retirement compromise. Above 40% is dangerous. If you're there, focus on debt prepayment over new investments.",
        ],
      },
      {
        heading: "12. Spouse briefing",
        paragraphs: [
          "If you were incapacitated tomorrow, could your spouse: access all bank accounts, know every advisor and account number, understand the financial logic of your investments, and act on your retirement plan? If not, write a one-page continuity document. This single deliverable matters more than 90% of investment decisions.",
        ],
      },
    ],
    checklist: {
      title: "Three concrete next steps from this check",
      items: [
        "Identify your single biggest gap from the 12 questions above. Don't try to fix everything at once.",
        "Block one Saturday morning in the next 30 days. Open every account, calculate your actual net worth, asset allocation, and savings rate. Write it down.",
        "Pick the lowest-effort, highest-impact fix from your gap. Examples: switch Regular to Direct (1 hour, saves ₹15k/year), buy adequate term insurance (2 hours, saves your family ₹2 Cr if needed), file a will (₹15k one-time, saves your spouse months of pain).",
      ],
    },
    closing: [
      "This check identifies the gap. Filling it is the work. If you want a second pair of eyes on your specific situation, the PlanMyCashflows Planner runs the math in 60 seconds, and a 30-minute call with Ashish is free for the first session.",
      "The biggest mistake most people make is doing more — adding more SIPs, more apps, more accounts — when what they need is doing less, better. This check is designed to find the one thing that, fixed, changes everything else.",
    ],
  },

  "defence-transition-planner": {
    slug: "defence-transition-planner",
    title: "The defence officer's transition financial planner",
    subtitle: "A 12-point framework for the 18 months before — and after — superannuation.",
    audience: "Serving and recently-retired defence officers",
    readTime: "20 minutes",
    intro: [
      "After interviewing 40+ retired colonels, group captains, and naval captains over the last two years, certain patterns emerge in who navigates the transition to civilian life well — and who struggles. This planner captures the framework the well-navigators used.",
      "I went through this transition myself. The financial cliff at superannuation is steeper than most officers expect, and the institutional advice ecosystem available to defence officers is mostly commission-driven LIC agents and well-meaning but undertrained peers.",
      "This planner won't replace a real financial plan, but it will tell you what to ask, when, and to whom. It's the structure I wish I had when I had 18 months left.",
    ],
    sections: [
      {
        heading: "Phase 1: 18 months before retirement",
        paragraphs: [
          "This is the most leverage you'll have in your financial life. You still have income, still have employer benefits, and have time to make structural decisions before the income cliff hits.",
        ],
        bullets: [
          "Calculate your actual post-retirement income. Take basic + DA × 50% (varies by category), subtract commutation reduction if you'll commute, add DSOP/AGIF annuitised at 7%. This is your new baseline. Most officers' post-retirement income is 30–50% of in-service.",
          "Decide commutation early. The IRR on commutation is roughly 8–9% — attractive vs FD, loses to equity over the same period. Right answer depends on your existing corpus and ability to invest the lump sum well.",
          "Audit your insurance. List every LIC, AGIF, postal life insurance policy. Calculate IRR on each — most are 4–5%, dramatically worse than equity. Decide which to keep, paid-up, or surrender. Redirect freed premiums to goal-aligned mutual funds.",
          "Buy adequate term cover NOW. Premiums rise sharply at 50+. A ₹2 Cr term policy bought at 45 might be ₹15k/year; at 55 it could be ₹40k/year. AGIF doesn't count — it's a savings product, not pure insurance.",
          "Build personal health insurance alongside ECHS. ECHS has gaps — empanelled hospital availability, certain procedures, dependents. ₹15–25L family floater + ₹15L super top-up while you're still in service (insurers won't issue post-retirement at the same price).",
        ],
      },
      {
        heading: "Phase 2: Last 6 months — set up the second career engine",
        paragraphs: [
          "The officers who navigate retirement best have 50–70% of in-service income post-retirement, not 30–50%. The differential comes from second careers. Start setting this up in the last 6 months.",
        ],
        bullets: [
          "Identify 2–3 second-career paths and have meaningful conversations in each: corporate roles (PSU boards, private security, defence consulting), small business (resort, school, real estate brokerage), or freelance (training, consulting, expert witness).",
          "Update LinkedIn properly. Most officer LinkedIn profiles read like a service record. Rewrite for civilian recruiters: emphasize leadership scale, P&L responsibility, crisis management, training of large teams.",
          "Build pre-retirement runway. Aim to enter retirement with at least 18–24 months of expenses in liquid funds. Pension fixation, AGIF maturity, second-career setup, ECHS card processing — these take longer than expected.",
          "Right-size your housing decision. The single biggest mistake retiring officers make is buying or upgrading to a too-large home using AGIF/DSOP money. House size grows but income shrinks; many regret the high maintenance costs and inflexibility.",
        ],
      },
      {
        heading: "Phase 3: The 90 days post-retirement",
        paragraphs: [
          "Most logistic and financial mistakes happen in this window. Have a written 90-day checklist.",
        ],
        bullets: [
          "Pension fixation paperwork. Pursue this actively — it can take 3–6 months and your first pension may be off if not corrected early.",
          "AGIF claim and reinvestment. The lump sum from AGIF will land in your bank — don't let it sit in savings account for 6 months. Plan deployment in advance: portion to debt fund for stability, portion to equity SIP via STP over 12 months.",
          "Update tax residency status if relocating. Many officers move to a different state post-retirement (Pune, Bangalore, Dehradun). HRA, state-specific deductions, and stamp duty considerations change.",
          "ECHS card activation. Mandatory. Don't postpone — emergencies don't wait.",
          "Pension bank account separation. Many officers keep using their CGDA SBI account for everything. Better: dedicated pension-receiving account, separate operating account, separate investment-clearing account. Easier to track, audit, and pass on.",
        ],
      },
      {
        heading: "Phase 4: Years 1–3 post-retirement",
        paragraphs: [
          "Asset allocation shifts. In-service: aggressive (80%+ equity is fine). Post-retirement: shift to 50–60% equity over 3 years. Don't go below 40% equity — you still need inflation protection for 25+ years of retirement.",
        ],
        bullets: [
          "Set up SWP (Systematic Withdrawal Plan) for income supplementation if pension + second career income isn't enough.",
          "Tax planning: Pension qualifies for special considerations under sec 87A; second-career income is fresh tax territory. Engage a CA familiar with ex-services finance.",
          "Write your will. 70% of officers haven't. Without one, your spouse can face 6–18 months of process to access funds.",
          "Brief your spouse. Most spouses know 'Papa handles the money.' Write a one-page continuity document covering: every account, every advisor's contact, the financial plan in plain English, what to do in the first 90 days if something happens to you.",
        ],
      },
      {
        heading: "Stay away from these traps",
        paragraphs: [
          "Retiring officers are heavily targeted by frauds dressed up as ex-servicemen schemes, unlisted shares of defence companies, or guaranteed 18% returns.",
        ],
        bullets: [
          "Anything offering guaranteed double-digit returns is either fraud or about to collapse.",
          "Anything pitched specifically because you're an officer (ex-servicemen scheme, defence officer special access) deserves extra scrutiny — most are exploiting trust, not offering genuine access.",
          "Anything with urgency (closing tomorrow, last 5 spots) is engineered to bypass your judgment. The right plan doesn't need 18% returns to succeed.",
          "The hardest lesson: your decades of discipline and discernment in uniform don't transfer automatically to financial decisions. Different domain, different threat model, different counter-parties.",
        ],
      },
    ],
    checklist: {
      title: "Quarterly checkpoints for the 18 months around retirement",
      items: [
        "Q-4 (18 months out): Insurance audit complete. Term + health adequate.",
        "Q-3 (12 months out): Second-career path identified. LinkedIn updated. Pre-retirement runway being built.",
        "Q-2 (6 months out): Pension calculation done. Commutation decision made. AGIF deployment plan written.",
        "Q-1 (3 months out): Housing decision finalised. Spouse briefing document drafted. 90-day post-retirement checklist ready.",
        "Q+1 (3 months in): Pension fixation pursued. AGIF deployed. ECHS active.",
        "Q+2 (6 months in): Tax structure for new income mix optimised. Will written.",
        "Q+3 (9 months in): Asset allocation rebalanced for retirement phase. SWP set up if needed.",
        "Q+4 (12 months in): Full annual financial review. Adjust 5-year plan based on actuals.",
      ],
    },
    closing: [
      "I've been through this. So have most officers I work with. The transition is harder than peacetime postings, easier than active service — and the financial cliff is the dimension nobody briefed you on.",
      "If you want a personalised version of this plan applied to your situation — your pension category, AGIF balance, second-career prospects, dependents — book a 30-minute session. It's free for officers in their last 18 months. We can do most of the planning together in that one call.",
    ],
  },

  "nri-india-cheatsheet": {
    slug: "nri-india-cheatsheet",
    title: "NRI investing in India: the 2026 cheat sheet",
    subtitle: "FEMA, RBI, SEBI, DTAA, GIFT City — the practical rules in one document.",
    audience: "NRIs in US, UK, UAE, Singapore investing in India",
    readTime: "18 minutes",
    intro: [
      "NRI financial planning sits at the intersection of three regulatory regimes you have to satisfy simultaneously — Indian FEMA + Indian Income Tax + your resident country's tax — and one operational layer: NRO/NRE/FCNR accounts.",
      "Most NRI advice you'll find is either too general (written for resident Indians) or oversimplified (written for someone who's never lived through PFIC rules, DTAA filings, or a return-to-India planning event).",
      "This cheat sheet is the reference doc serious NRI investors keep open. It assumes you already know the basics; it goes deep on the practical mechanics that change outcomes.",
    ],
    sections: [
      {
        heading: "Account structure: NRE vs NRO vs FCNR",
        paragraphs: [
          "These three accounts cover 95% of NRI banking needs. Use them correctly and your tax filings simplify dramatically.",
        ],
        bullets: [
          "NRE (Non-Resident External) — Rupee account, deposits come from foreign income. Fully repatriable. Interest tax-FREE in India. Use this for: savings from your foreign salary that you want to invest in India.",
          "NRO (Non-Resident Ordinary) — Rupee account for India-source income (rent, dividends, pension, sale of inherited property). Limited repatriability ($1M/year). Interest taxable in India at 30%. Use this for: receiving India-side income.",
          "FCNR (Foreign Currency Non-Resident) — Term deposit in USD/GBP/etc. Fully repatriable. Interest tax-free in India. No currency conversion risk. Use this for: parking foreign currency you don't want to convert to INR.",
        ],
      },
      {
        heading: "US-resident NRIs: the PFIC trap",
        paragraphs: [
          "If you're a US tax resident (citizen, green card, or substantial presence test), Indian mutual funds are PFICs (Passive Foreign Investment Companies). The US tax regime for PFICs is punitive — gains can be taxed at the highest marginal rate plus interest charges on deferred gains.",
          "This is the single biggest mistake we see in US-resident NRIs: holding Indian mutual funds without knowing the PFIC implications. By the time it surfaces (often during return-to-India tax filing), the damage is done.",
        ],
        bullets: [
          "Option 1: Switch from Indian MFs to direct Indian equity (no PFIC issue). Manage with care to avoid wash sale issues.",
          "Option 2: Use QEF (Qualified Electing Fund) election if your AMC supports it — passes through gains annually at long-term rate. Rare in Indian MFs.",
          "Option 3: Use Mark-to-Market election — recognise gains/losses annually. Works for some.",
          "Option 4: GIFT City vehicles for non-residents that don't trigger PFIC. Newer option, evaluate carefully.",
          "Best: Don't open new Indian MF positions while US-resident. If you have existing ones, work with a US-India tax advisor on the cleanest exit path.",
        ],
      },
      {
        heading: "UK-resident NRIs",
        paragraphs: [
          "UK tax is simpler than US but has its own nuances around remittance basis, ISA limits, and SIPP coordination with Indian retirement vehicles.",
        ],
        bullets: [
          "Remittance basis vs arising basis — for non-domiciled UK residents, the remittance basis can shield foreign income/gains from UK tax if not remitted. Becomes more complex after 7 years.",
          "Indian dividend income — taxable in UK at marginal rate; DTAA credit available for Indian tax withheld.",
          "Capital gains on Indian equity — UK CGT applies if you're UK resident; DTAA may give relief for Indian LTCG/STCG paid.",
          "ISA vs Indian SIP — ISA has £20k/year limit, tax-free growth, tax-free withdrawals. Use it fully before adding to Indian investments unless return-to-India is imminent.",
        ],
      },
      {
        heading: "UAE-resident NRIs",
        paragraphs: [
          "UAE residents have some of the most favourable tax positions globally. The 2023 corporate tax doesn't apply to personal investment income for most individuals.",
        ],
        bullets: [
          "Salary in UAE — tax-free for residents (subject to free zone rules if applicable).",
          "Investments in India via NRE route — no UAE tax on capital gains, dividends, interest (for individuals).",
          "GIFT City IFSC investments — non-residents in GIFT City qualify for capital gains exemption on certain securities. Worth structuring large positions through here.",
          "India tax still applies to India-source income — TDS, LTCG/STCG. DTAA between India-UAE caps some withholding at lower rates.",
          "Golden visa property route — buying property worth AED 2M+ qualifies for 10-year visa. Real estate yields in UAE are 5–8% vs 2–3% in Indian metros.",
        ],
      },
      {
        heading: "Singapore-resident NRIs",
        paragraphs: [
          "Singapore taxes only Singapore-source income for individuals (no global income tax for most cases). Indian investments are tax-free at the Singapore end but subject to Indian tax.",
        ],
        bullets: [
          "CPF (Singapore retirement) — use up SA (Special Account) top-ups for tax relief before adding to Indian NPS.",
          "Singapore-India DTAA — provides relief on Indian dividends, interest, and capital gains.",
          "Recent treaty changes — India can now tax capital gains on Indian shares held by Singapore-resident investors (post-2017 grandfather provisions). Check year of acquisition.",
        ],
      },
      {
        heading: "Return-to-India planning",
        paragraphs: [
          "The 3 years before return are the most valuable from a tax-planning perspective — particularly the RNOR (Resident but Not Ordinarily Resident) window post-return, which gives 1–3 years of preferential treatment on foreign income.",
        ],
        bullets: [
          "Determine your RNOR window precisely — typically 2–3 years post-return based on prior residency pattern. During RNOR, foreign-source income (US 401k, UK SIPP, dividends from foreign stocks) is not taxed in India.",
          "Time your remittances and asset sales — large unrealised gains in foreign accounts are often better realised during RNOR, not after becoming Ordinary Resident.",
          "ESOP exercise timing — if you have unvested or unexercised foreign ESOPs, the tax treatment changes dramatically at the moment of becoming Resident. Plan exercise/sale around this.",
          "FCNR/NRE account closure — after becoming resident, you have 6 months to convert NRE to resident account or transfer balances. FCNR can continue till maturity.",
          "Reverse the PFIC math — for US-residents holding Indian MFs, the move to India often simplifies things — but plan the year of move carefully.",
        ],
      },
      {
        heading: "GIFT City: when it's actually worth it",
        paragraphs: [
          "GIFT City IFSC is India's offshore financial centre. It's powerful for specific use cases — overhyped for general ones.",
        ],
        bullets: [
          "Worth it for: large NRI investments in Indian equity via GIFT City AIFs (no capital gains tax), foreign currency hedging vehicles, structured products.",
          "Probably not worth it for: small (sub-₹50L) positions, simple mutual fund equivalents, anything you could do simpler via NRE route.",
          "Operational reality: GIFT City onboarding is slower and more paper-intensive than mainland Indian accounts. Allow 2–4 weeks for setup.",
        ],
      },
    ],
    checklist: {
      title: "NRI annual financial checklist",
      items: [
        "Reconcile FATCA / CRS reporting between resident-country and India — ensure no mismatches that trigger audit.",
        "Review NRE/NRO interest income for resident-country tax reporting (Form 1116, FTC claims).",
        "If US-resident: Form 8938 + FBAR if Indian assets cross thresholds. Don't skip these — penalties are severe.",
        "Indian ITR filing (typically ITR-2 for NRI) — even if all income is below TDS thresholds, filing keeps you in compliance.",
        "Review LTCG harvesting opportunity (₹1.25L exemption) on Indian equity if you'll continue holding.",
        "Rebalance India vs foreign allocation based on currency outlook and life-stage.",
        "Update nominations across all NRE/NRO/FCNR accounts and demat — especially if marital or family status changed.",
      ],
    },
    closing: [
      "NRI investing rewards the patient and the structured. Skipping the boring compliance work to chase yield is the single biggest pattern in NRI investment loss cases.",
      "If you'd like this cheatsheet personalised to your country of residence, return-to-India horizon, and current portfolio mix, a 30-minute call with Ashish can map your specific path. NRI calls are usually scheduled around your timezone.",
    ],
  },

  "pms-empanelment-guide": {
    slug: "pms-empanelment-guide",
    title: "PMS empanelment: how to evaluate a manager",
    subtitle: "The 7-point framework we use before recommending any PMS strategy.",
    audience: "HNI investors evaluating their first or next PMS",
    readTime: "15 minutes",
    intro: [
      "PMS in India has matured into a ₹30+ lakh crore industry with 400+ registered managers. The SEBI minimum is ₹50 lakhs, but the right minimum is much higher — at least 30–50% of your equity allocation, not your entire equity.",
      "Most investors evaluate PMS managers wrong. They look at the last 1–3 year return chart and pick the leader. This is mean-reversion bait — yesterday's chart-topper often becomes tomorrow's laggard.",
      "This guide walks you through the seven dimensions we evaluate before recommending any PMS, including the specific questions to ask in the discovery call. It's the framework we wish we'd had on our first PMS investment.",
    ],
    sections: [
      {
        heading: "1. Investment process — is it repeatable or vibes?",
        paragraphs: [
          "The first question: can the manager articulate their investment process in a way that's repeatable, falsifiable, and consistent with what they actually do? Or is it vague (we pick good stocks, we focus on quality)?",
          "Repeatable process: written investment philosophy, clear screening criteria, position sizing rules, sell discipline. You should be able to look at any stock in the portfolio and explain why it's there using their stated framework.",
          "Vibes-based process: the manager's personality is the strategy. Works for some star managers; falls apart when they leave or when their style is out of favour.",
        ],
        bullets: [
          "Ask: Walk me through how you decided to buy your top holding. What's your sell discipline for it?",
          "Ask: How does your process behave in different market regimes? What did it tell you to do in March 2020? Oct 2022?",
          "Red flag: vague answers, references to instinct, refusal to share written framework.",
        ],
      },
      {
        heading: "2. AUM trajectory — growth pattern matters",
        paragraphs: [
          "AUM growth tells a story. Steady, multi-year growth typically indicates a mature, repeatable strategy. Sudden spikes followed by contraction often indicate fund chasing a hot theme or styling.",
        ],
        bullets: [
          "Healthy: AUM grew from ₹100 Cr to ₹2,500 Cr over 8 years, steadily.",
          "Yellow flag: AUM went from ₹500 Cr to ₹5,000 Cr in 18 months. Often the strategy doesn't scale; performance degrades.",
          "Red flag: AUM peaked 3 years ago and has been declining. Investors are exiting; ask why.",
          "Ask: What's your strategy capacity? Will you close the fund at a certain AUM?",
        ],
      },
      {
        heading: "3. Drawdown behaviour across cycles",
        paragraphs: [
          "How a strategy behaved in 2008, 2018–19 (mid/smallcap correction), March 2020 (Covid crash), 2022 (rates + inflation regime) tells you far more than peak-to-peak returns.",
        ],
        bullets: [
          "Did the strategy drop with the market, lose less, or lose more?",
          "How long did it take to recover to prior peaks?",
          "Did the manager change style mid-cycle (style drift is a red flag) or stay disciplined?",
          "Compare strategy drawdowns against Nifty 500 in the same window.",
          "Ask: Pull out your worst 12-month rolling return in the last 5 years. Explain what happened and what you did.",
        ],
      },
      {
        heading: "4. Key-person risk",
        paragraphs: [
          "Does the strategy depend on one Portfolio Manager? What happens if they leave? Are there documented decision-making processes that can survive a PM departure?",
        ],
        bullets: [
          "Single-PM funds: returns can be extraordinary, key-person risk is enormous.",
          "Team-based: more institutional, harder to attribute alpha, but more durable.",
          "Ask: How long has the lead PM been managing this specific strategy? What's the succession plan?",
          "Red flag: PM has been on the strategy less than 5 years, or has had multiple strategy changes within the firm.",
        ],
      },
      {
        heading: "5. Fee transparency",
        paragraphs: [
          "PMS fees come in three flavours. Make sure you understand the full picture, including any hidden charges (custody, transaction, brokerage, audit, advisory).",
        ],
        bullets: [
          "Fixed-only (2-2.5% / year) — simplest. Manager paid regardless of performance.",
          "Performance-only (20% above hurdle) — rare. Aligns interests but managers prefer hybrid for income stability.",
          "Hybrid (1-2% + 10-20% above hurdle of 6-10%) — most common. Read carefully; can be expensive in good years.",
          "Ask for fee illustration: if your strategy returns 15% gross over 3 years, what does my account look like net of all charges?",
          "Red flag: Refusal to provide written illustrative fee breakdown. Refusal to disclose related-party transaction policies (broker selection, etc.).",
        ],
      },
      {
        heading: "6. Concentration discipline",
        paragraphs: [
          "Does the PMS have written position-sizing rules? Or does the manager bet large when conviction is high?",
        ],
        bullets: [
          "Healthy: max 8-10% per single position, sector concentration limits, written rebalancing rules.",
          "Risky: 20%+ single positions, unconstrained sector tilts.",
          "Both can work — concentrated PMS can deliver outsized alpha but can also drawdown brutally. Match concentration tolerance to your risk profile.",
          "Ask: What's your max single position size? How do you decide when to trim a winner that's growing into the portfolio?",
        ],
      },
      {
        heading: "7. Track record duration and verification",
        paragraphs: [
          "Has the manager managed THIS specific strategy across at least one full market cycle (5-7 years)? SEBI now requires aggregate performance disclosure across all clients — that's the number to compare across managers.",
        ],
        bullets: [
          "Less than 5 years: manager hasn't seen one full cycle. Be cautious.",
          "5-7 years: includes at least one significant drawdown. Look at how they handled it.",
          "7+ years: includes a major drawdown cycle. Returns are more trustworthy.",
          "Verify aggregate TWRR (Time-Weighted Rate of Return) at strategy level, not cherry-picked client returns.",
          "Ask: Share the SEBI-format aggregate performance disclosure for the last 7 years.",
        ],
      },
    ],
    checklist: {
      title: "Pre-investment PMS checklist",
      items: [
        "Read the Disclosure Document (DD) — not just the executive summary. Fee details, related-party transactions, conflict policies are all in there.",
        "Verify SEBI registration is current. Search at sebi.gov.in/sebiweb/other/OtherAction.do?doRecognised=yes",
        "Get the last 3 years of monthly portfolio statements — look at actual holdings drift over time, not just summary returns.",
        "Talk to 2-3 existing clients (the manager will provide references, but ask through your own network too).",
        "Run the after-tax math, not gross returns. PMS returns are taxed at your slab rate based on holdings turnover.",
        "Verify custodian arrangements — your demat is held at a SEBI-registered custodian, not the PMS firm itself.",
        "Document your investment thesis in writing before transferring funds. Why this manager, this strategy, this allocation. Reference it annually to evaluate the decision.",
      ],
    },
    closing: [
      "PMS done well can add 2-4% of alpha over 7+ year periods. PMS done poorly can underperform Nifty 500 net of fees while charging premium prices.",
      "We use this exact framework to evaluate every PMS before recommending to a client. If you'd like a second opinion on a PMS you're considering — or help shortlisting from your specific criteria — book a 30-minute call. We don't take kickbacks from any PMS, so the recommendation is what actually fits your goals.",
    ],
  },
};
