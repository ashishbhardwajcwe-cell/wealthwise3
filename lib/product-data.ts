import type { ProductPageData } from "@/components/InvestmentProductPage";

export const mutualFundsData: ProductPageData = {
  name: "Mutual Funds",
  oneLine: "Diversified, professionally managed, regulated. The most accessible investment vehicle in India — for good reason.",
  whatItIs: [
    "A mutual fund pools money from many investors and buys a basket of stocks, bonds, gold, or other assets. A professional fund manager makes the buy/sell decisions, and you own units that reflect your share of the basket.",
    "In India, mutual funds are regulated by SEBI and registered with AMFI. There are over 1,400 schemes across 40+ asset management companies — covering equity (large/mid/small cap, multi-cap, sectoral, thematic), debt (liquid, short-duration, dynamic bond), hybrid, ELSS for tax-saving, gold funds, and international funds.",
    "You can invest a one-time lumpsum or set up a Systematic Investment Plan (SIP) — typically ₹500 per month minimum. The two big choices most investors miss: Direct vs Regular plans (Direct saves 0.5–1% per year in expense ratio), and Active vs Passive (index funds cost 0.1–0.5% vs 1–2% for active).",
  ],
  keyFacts: [
    { label: "Minimum investment", value: "₹500 (SIP) / ₹5,000 (lumpsum)" },
    { label: "Typical returns (equity)", value: "10–14% CAGR over 10+ yrs (historical)" },
    { label: "Typical returns (debt)", value: "6–8% CAGR (historical)" },
    { label: "Lock-in", value: "None (open-ended) · 3 yrs for ELSS" },
    { label: "Taxation (equity)", value: "STCG 20% · LTCG 12.5% above ₹1.25L/yr" },
    { label: "Taxation (debt, post-Apr 2023)", value: "At slab rate (no indexation)" },
    { label: "Regulator", value: "SEBI · AMFI registered" },
    { label: "Risk level", value: "Low to Very High (varies by scheme)" },
  ],
  pros: [
    "Professionally managed and SEBI-regulated",
    "Wide diversification at low ticket size",
    "Liquid (most schemes redeem in T+1 or T+3)",
    "Transparent (NAV published daily)",
    "SIP enforces discipline — averaging costs over time",
  ],
  cons: [
    "Most active funds underperform their benchmark over 10 yrs",
    "Regular plan commissions silently eat 0.5–1% per year",
    "Exit loads (typically 1% if redeemed within 1 yr) catch new investors",
    "Debt fund taxation changed in 2023 — no longer the indexation benefit",
    "Too much choice leads to over-diversification (15 funds doing the same thing)",
  ],
  whoShouldConsider:
    "Consider mutual funds if you have ₹500+/month to invest, want to start before you have ₹50L+, value liquidity, and prefer a regulated structure. They're the right base layer for almost every investor in India.",
  commonMistakes: [
    "Buying Regular plans through your bank or app instead of Direct (costs you 0.5–1% per year — over 30 years that's a 25% smaller corpus).",
    "Picking the fund that was #1 last year. Past performance leadership is the worst predictor of future returns.",
    "Owning 12 different equity funds that all hold the same Nifty-50 stocks — you've paid 12 expense ratios for one index.",
    "Stopping SIPs in market crashes. Those are the months your units cost the least.",
    "Ignoring the ELSS deduction (₹1.5L u/s 80C) when you're in old tax regime and could save ₹15k–₹45k in tax per year.",
  ],
  howAurisHelps:
    "WealthWise tracks every mutual fund you own across folios and AMCs, flags Regular plans that should be moved to Direct, identifies overlap and concentration, and runs tax-loss harvesting on the ₹1.25L LTCG exemption every March. Our advisory layer (when our SEBI RIA licence is live) can build a goal-aligned scheme list for you.",
  faqs: [
    {
      question: "Direct vs Regular plans — does the 0.5% really matter?",
      answer:
        "Yes. On a ₹10L corpus growing at 12% for 20 years, Direct gives you ~₹96L while Regular (at 11.5%) gives ~₹87L — a ₹9L gap from the same fund. Always invest in Direct plans via platforms like Coin (Zerodha), Kuvera, MFCentral, or directly through AMC websites.",
    },
    {
      question: "How many mutual funds should I own?",
      answer:
        "For most investors: 3–5 equity funds + 1–2 debt funds is plenty. One large-cap or index fund, one flexi-cap, one mid/small-cap if appetite allows, and one debt fund for short-term goals. More than that usually creates overlap without real diversification.",
    },
    {
      question: "SIP or lumpsum?",
      answer:
        "If you have monthly income → SIP (rupee-cost averaging + discipline). If you have a lumpsum (bonus, inheritance, sale proceeds) → STP (Systematic Transfer Plan) from a liquid fund into your target equity fund over 6–12 months reduces timing risk vs deploying all at once.",
    },
    {
      question: "What about ELSS for tax saving?",
      answer:
        "ELSS funds let you deduct up to ₹1.5L u/s 80C if you're in the old tax regime, with a 3-year lock-in (the shortest of any 80C option). They invest in equities, so returns are market-linked. Skip if you're in the new tax regime — there's no 80C benefit there.",
    },
    {
      question: "Are international funds worth it?",
      answer:
        "Some allocation (5–15%) to US or global funds gives currency diversification and exposure to large global tech. But Indian mutual funds investing abroad are now taxed as debt funds (slab rate), making them less attractive vs Indian equity post-2023. Consider GIFT City or direct US brokerages for larger allocations.",
    },
    {
      question: "How much should I invest in mutual funds vs other assets?",
      answer:
        "Depends on age, goals, and other assets. A reasonable starting framework: equity MF allocation = (100 - your age) % of investable surplus, with the rest split across debt, gold (5–10%), and emergency fund (6 months expenses). The AI Wealth Planner gives you a personalised number.",
    },
  ],
  relatedPosts: [
    { slug: "mutual-funds-vs-pms", title: "Mutual funds vs PMS: which is right for you?" },
    { slug: "ltcg-125-lakh-exemption-most-underused-tax-tool", title: "The ₹1.25 lakh LTCG exemption — the most under-used tax tool in India" },
  ],
  extraDisclaimer:
    "Mutual fund investments are subject to market risks. Read all scheme-related documents carefully. AMFI Registration: pending. We do not recommend any specific scheme.",
};

export const pmsData: ProductPageData = {
  name: "Portfolio Management Services (PMS)",
  oneLine: "Personalised portfolios for ₹50 lakh+ investors. You own the stocks directly in your demat — the manager does the picking.",
  whatItIs: [
    "A PMS is a professionally managed investment service where the manager builds and manages a customised stock portfolio in your name. Unlike mutual funds where you own units of a pool, in PMS you own the underlying shares directly in your demat account.",
    "Regulated by SEBI under the PMS Regulations 2020, the minimum investment in India is ₹50 lakhs. This high floor is intentional — PMS is designed for HNI investors who can handle concentration and short-term volatility for the potential of higher long-term alpha.",
    "PMS strategies span multicap, smallcap, thematic (consumption, banking, infrastructure), special situations, and quant-based. Fees are typically a fixed annual management fee (2–2.5%) plus a performance fee (10–20% above a hurdle rate). Compared to mutual funds, PMS gives you more transparency (you see every trade), tax efficiency (no churn of underlying when you exit), and customisation.",
  ],
  keyFacts: [
    { label: "Minimum investment", value: "₹50 lakhs (SEBI mandate)" },
    { label: "Typical strategies", value: "Multi-cap, small-cap, thematic, quant" },
    { label: "Fee structure", value: "1–2.5% fixed + 10–20% performance fee" },
    { label: "Ownership", value: "Direct (in your demat account)" },
    { label: "Lock-in", value: "None (but recommend 3+ yr horizon)" },
    { label: "Taxation", value: "As per holding period of each stock (STCG 20% / LTCG 12.5%)" },
    { label: "Regulator", value: "SEBI (PMS Regulations 2020)" },
    { label: "Risk level", value: "High (concentrated portfolios)" },
  ],
  pros: [
    "Direct ownership of stocks in your demat",
    "Customisation — manager can exclude sectors or stocks you don't want",
    "Tax-efficient (no portfolio churn on exit)",
    "Transparent (you see every buy/sell)",
    "Potential for higher alpha than mutual funds when manager is skilled",
  ],
  cons: [
    "₹50L minimum is a high bar",
    "Performance fees can be steep — manager wins even when you barely beat benchmark",
    "Concentrated (20–25 stocks) — drawdowns can be sharp",
    "Reporting can be opaque; comparing PMS returns across managers is non-trivial",
    "Most PMS underperform their benchmark net of fees over 7+ year periods",
  ],
  whoShouldConsider:
    "Consider PMS if you have ₹50L+ to invest in equities, want personalisation beyond what mutual funds offer, can stomach 20–30% short-term drawdowns, and have a 5+ year horizon. Don't consider PMS as your first equity exposure — start with mutual funds first.",
  commonMistakes: [
    "Picking a PMS based on the last 1–3 year return chart. Mean reversion is brutal in PMS — yesterday's chart-topper often becomes tomorrow's laggard.",
    "Not reading the fee structure carefully. A 1.5% fixed + 20% performance fee over 8% hurdle means you give away a third of returns above 8%.",
    "Treating PMS as a substitute for a full plan. PMS handles one slice (your equity allocation); you still need debt, gold, insurance, and goal mapping.",
    "Ignoring tax implications. Every sale in your PMS triggers capital gains — high-churn strategies can quietly create big tax bills.",
    "Choosing a small AUM PMS purely for returns. Sub-₹500 Cr AUM PMSs can have liquidity issues and key-person risk.",
  ],
  howAurisHelps:
    "We help you decide whether PMS even makes sense for you (often the answer is 'not yet — keep doing mutual funds'). If it does, we evaluate managers by their actual investment process, fee structure, risk-adjusted returns over multiple cycles, and AUM stability — not just glossy decks. WealthWise tracks your PMS portfolio alongside your other assets in one view.",
  faqs: [
    {
      question: "PMS or mutual funds — which is better?",
      answer:
        "For most investors with ₹50L+, a blend works best. Mutual funds give you cheap, diversified base exposure; PMS adds personalisation and potential alpha. Pure PMS-only portfolios concentrate risk in one manager's style. We typically suggest PMS as a 30–50% slice of equity, not the whole thing.",
    },
    {
      question: "How do I evaluate a PMS manager?",
      answer:
        "Look at: (1) Investment process — is it repeatable or vibes? (2) AUM stability — has it grown or shrunk? (3) Drawdowns — how did the fund behave in 2008, 2020, 2022? (4) Key-person risk — does it depend on one PM? (5) Fee structure — what does net-of-fee return look like over 7+ years vs Nifty 500?",
    },
    {
      question: "What's the tax treatment?",
      answer:
        "Each stock sale in your PMS is a separate capital gains event in your demat. Short-term (held < 12 months) is taxed at 20%, long-term at 12.5% above ₹1.25L. Unlike mutual funds where the AMC absorbs internal churn tax-free, PMS churn directly hits your tax bill — making low-turnover PMS strategies more tax-efficient.",
    },
    {
      question: "Can I exit a PMS anytime?",
      answer:
        "Yes, there's no lock-in by SEBI rules, though some managers have notice periods (typically 1 month). On exit, the stocks are either liquidated and cash credited, or transferred to your demat (lower cost). We recommend a minimum 3-year horizon to let the strategy play out.",
    },
    {
      question: "What about AIF instead of PMS?",
      answer:
        "AIFs (Alternative Investment Funds) start at ₹1 Cr minimum and cover strategies PMS can't — long-short, private equity, venture, structured credit. PMS = listed equity in your name. AIF = pooled vehicle for non-traditional strategies. We often suggest considering both alongside MFs for HNI portfolios.",
    },
    {
      question: "How are PMS returns calculated?",
      answer:
        "PMS returns are reported on a 'TWRR' (Time-Weighted Rate of Return) basis at the strategy level. Your individual return can differ based on when you invested. SEBI now requires 'aggregate' performance disclosure across all clients in a strategy — that's the number you should compare across managers.",
    },
  ],
  relatedPosts: [
    { slug: "complete-guide-to-pms-india-2026", title: "The complete guide to PMS in India for 2026" },
    { slug: "mutual-funds-vs-pms", title: "Mutual funds vs PMS: which is right for you?" },
  ],
  extraDisclaimer:
    "PMS investments carry concentration risk and are intended for investors with prior equity experience. Past performance of any PMS strategy is not indicative of future returns. SEBI registration verification of any PMS manager is the investor's responsibility.",
};

export const aifData: ProductPageData = {
  name: "Alternative Investment Funds (AIF)",
  oneLine: "Pooled investment vehicles for sophisticated investors — covering private equity, venture, hedge strategies, and real assets. ₹1 Cr minimum.",
  whatItIs: [
    "AIFs are SEBI-regulated pooled investment vehicles that go beyond traditional mutual funds and PMS. They invest in strategies that aren't accessible to retail investors — private equity, venture capital, distressed debt, long-short equity, real estate debt, infrastructure, and more.",
    "SEBI classifies AIFs into three categories. Category I includes funds that invest in startups, SMEs, social ventures, infrastructure, and other government-encouraged sectors. Category II is the largest bucket — private equity funds, real estate funds, debt funds, and funds-of-funds that don't fit elsewhere. Category III runs hedge fund strategies — long-short, market-neutral, derivatives — and can use leverage.",
    "Minimum investment is ₹1 crore (₹25 lakhs for angel funds). Lock-ins range from 3 to 10 years depending on the fund. Taxation varies sharply by category: Cat I & II are pass-through (taxed in your hands), Cat III is taxed at the fund level (~42% for residents on STCG). AIFs are for sophisticated HNI/UHNI investors who can lock up capital and handle illiquidity.",
  ],
  keyFacts: [
    { label: "Minimum investment", value: "₹1 Cr (₹25L for angel funds)" },
    { label: "Categories", value: "Cat I (startups/infra), Cat II (PE/RE/debt), Cat III (hedge)" },
    { label: "Lock-in", value: "3–10 yrs typically (varies by fund)" },
    { label: "Fees", value: "1.5–2.5% mgmt + 15–20% carry over hurdle" },
    { label: "Taxation (Cat I, II)", value: "Pass-through (taxed in investor hands)" },
    { label: "Taxation (Cat III)", value: "At fund level (~42% STCG, ~14.25% LTCG for residents)" },
    { label: "Regulator", value: "SEBI (AIF Regulations 2012)" },
    { label: "Risk level", value: "High to Very High" },
  ],
  pros: [
    "Access to strategies unavailable via MF/PMS (PE, VC, hedge, distressed)",
    "Potential for uncorrelated returns vs listed equity",
    "Professional management of complex strategies",
    "Diversifies a large portfolio beyond stocks and bonds",
    "Some Cat I funds offer government incentives (startup investing)",
  ],
  cons: [
    "₹1 Cr minimum and illiquidity for years",
    "High fees compound over long lock-ins — net returns often disappoint",
    "Cat III's fund-level taxation is unfavourable for taxable investors",
    "Transparency is limited compared to mutual funds",
    "Manager selection matters enormously — bad AIFs can return capital below cost",
  ],
  whoShouldConsider:
    "Consider AIFs if your investable corpus is ₹5 Cr+, you've already built a diversified MF/PMS base, you can lock up 10–20% of capital for 5+ years, and you're seeking returns or diversification not available in listed markets. Don't consider AIFs as a first or second investment.",
  commonMistakes: [
    "Investing in Cat III hedge funds in personal name without checking after-tax math. The 42% fund-level STCG often makes the same strategy uneconomical vs a long-only PMS.",
    "Not reading the PPM (Private Placement Memorandum) carefully — drawdown schedules, fee mechanics, and conflict-of-interest disclosures are usually buried in 80+ pages.",
    "Treating AIF returns gross of fees and tax. A Cat II fund with 20% IRR gross might be 12% net to you.",
    "Over-allocating to one strategy or vintage year. AIF returns are highly dependent on entry timing and economic cycle.",
    "Ignoring the J-curve. PE/VC funds typically show negative returns for years 1–3 before paying off — many investors panic-exit secondary markets at a discount.",
  ],
  howAurisHelps:
    "AIF selection requires deep diligence on manager pedigree, track record across cycles, fee transparency, and tax structure. We help filter the universe (hundreds of registered AIFs) to a shortlist that fits your portfolio gaps. WealthWise tracks committed vs called capital, distributions, and net IRR alongside your liquid investments.",
  faqs: [
    {
      question: "What's the difference between Cat I, II, and III AIFs?",
      answer:
        "Cat I = funds in sectors the government encourages (startups, SME, infra, social ventures) and get some tax sops. Cat II = the catch-all for PE, RE, debt, FoF — largest category by AUM. Cat III = uses complex/leveraged strategies (hedge funds, long-short). The category determines fees you can charge, leverage allowed, and taxation treatment.",
    },
    {
      question: "Why is Cat III taxed so badly?",
      answer:
        "Cat III AIFs are taxed at the fund level — short-term gains at the maximum marginal rate (~42% with surcharge) and long-term equity at 14.25%. This makes them less attractive than running the same strategy as a long-only PMS. The exception: tax-exempt investors (some trusts, certain offshore vehicles).",
    },
    {
      question: "How do drawdowns work?",
      answer:
        "Most AIFs use a 'commitment + drawdown' model. You commit ₹1 Cr; the fund draws down (calls) capital over 2–4 years as it deploys. Until called, your committed-but-uncalled capital stays with you (you may need to keep it in liquid funds to be ready). Distributions then come back to you as investments exit.",
    },
    {
      question: "How do I evaluate an AIF manager?",
      answer:
        "Look at: prior fund vintages and their net IRR (DPI — Distributions to Paid-In capital), team continuity, deal sourcing edge, valuation discipline, and consistency of strategy. Be sceptical of first-time funds without strong individual track records elsewhere. SEBI registration is necessary but not sufficient.",
    },
    {
      question: "Can NRIs invest in AIFs?",
      answer:
        "Yes — NRIs and foreign investors can invest in Indian AIFs, often through Cat II funds. GIFT City IFSC AIFs offer additional benefits — no tax on capital gains for non-residents under certain structures. Documentation and FEMA compliance is more involved than domestic investing.",
    },
    {
      question: "Are AIF returns better than mutual funds?",
      answer:
        "Sometimes, often not — especially after fees and tax. Top-quartile PE/VC funds can return 18–25% net IRR; bottom-quartile lose money. The dispersion is far wider than mutual funds. AIFs make sense for diversification and uncorrelated returns, not as a 'higher-return version of MF'.",
    },
  ],
  extraDisclaimer:
    "AIFs are intended for sophisticated investors. They involve illiquidity, leverage (in Cat III), and concentration risk. PPM disclosures should be reviewed carefully. Past fund performance is not indicative of future fund performance.",
};

export const unlistedSharesData: ProductPageData = {
  name: "Unlisted Shares",
  oneLine: "Pre-IPO and unlisted equity — owning shares of companies before they hit public markets. High potential, high illiquidity.",
  whatItIs: [
    "Unlisted shares are equity in companies that aren't yet listed on the stock exchanges (NSE/BSE). This includes pre-IPO companies (often within 1–3 years of listing), private companies that may never list, and shares of public-sector unlisted entities (like NSE itself, which is unlisted despite running the exchange).",
    "In India, the unlisted shares market has matured rapidly since 2020. Platforms like UnlistedArena, Stockify, Precize, and Altius let retail investors access shares that were earlier limited to PE/VC funds. Typical ticket sizes range from ₹50,000 to ₹5,00,000 per investment. You hold the shares in your demat account just like listed stocks.",
    "Tax treatment is different from listed equity. Long-term holding (>24 months) qualifies for LTCG at 12.5% (with indexation removed post-Jul 2024). Short-term (<24 months) is taxed at your slab rate — which can be a brutal 30%+ for HNIs. There's no STT, no exchange transaction cost — but pricing is opaque and bid-ask spreads can be 5–15%.",
  ],
  keyFacts: [
    { label: "Minimum investment", value: "₹50,000 typical (platform-dependent)" },
    { label: "Typical returns", value: "Highly variable; 0% to multi-bagger" },
    { label: "Liquidity", value: "Low — exit via platform secondary or post-IPO" },
    { label: "Holding period for LTCG", value: "24 months" },
    { label: "Tax (LTCG)", value: "12.5%" },
    { label: "Tax (STCG)", value: "At your slab rate" },
    { label: "Regulator", value: "Not directly — platforms are facilitators" },
    { label: "Risk level", value: "Very High" },
  ],
  pros: [
    "Access to companies before public markets price them in",
    "Potential for high returns if a company IPOs successfully",
    "Diversifies beyond listed equity universe",
    "Tax treatment improves once held 24+ months",
    "Builds early ownership in compelling private businesses",
  ],
  cons: [
    "Illiquid — you can be stuck for years, especially if IPO is delayed",
    "Bid-ask spreads of 5–15% mean meaningful friction on entry and exit",
    "Valuation opacity — no daily mark-to-market, prices set by platform demand",
    "STCG at slab rate makes short holds extremely tax-inefficient",
    "Information asymmetry — promoters often know more than buyers in secondary",
  ],
  whoShouldConsider:
    "Consider unlisted shares as a small (3–8%) allocation if your portfolio is already diversified, you can hold for 3+ years, and you understand the company you're buying (financials, sector, why it's likely to IPO). Don't allocate retirement or short-term goal money to unlisted.",
  commonMistakes: [
    "Buying based on the 'this will IPO at 3x' pitch from a platform RM. Most pre-IPO valuations crash 30–50% from grey-market prices when the actual IPO happens.",
    "Ignoring the 24-month holding period and exiting in 6 months — your STCG eats most of the upside.",
    "Concentrating in one or two hot names. Diversify across 4–6 unlisted holdings to manage single-company risk.",
    "Not checking the company's financials, board, or auditor track record before investing.",
    "Confusing 'pre-IPO' (likely listing soon) with 'unlisted forever' (private company that may never list).",
  ],
  howAurisHelps:
    "We help you evaluate whether a specific unlisted opportunity fits your portfolio, vet the platform you're buying through (custody, settlement, KYC), and time the exit — pre-IPO, at IPO, or post-listing — for maximum after-tax outcome. WealthWise tracks unlisted holdings alongside listed equity and flags upcoming IPO/event windows.",
  faqs: [
    {
      question: "Are unlisted shares legal in India?",
      answer:
        "Yes, fully legal. They're transferred via off-market trades to your demat account. The transaction itself doesn't go through an exchange. Platforms like UnlistedArena, Stockify, and Precize are facilitators, not exchanges. Just ensure your KYC, PAN, and demat are in order.",
    },
    {
      question: "Which platforms should I use?",
      answer:
        "Established platforms in India include UnlistedArena, Stockify, Precize, Altius, and Sharescart. Each has different inventories. Always verify the platform's track record, settlement process, and how they custody shares before transferring large amounts.",
    },
    {
      question: "How is the price determined?",
      answer:
        "There's no exchange-determined price. Platforms set prices based on demand-supply, recent funding rounds, peer comparables, and (closer to IPO) grey-market premium. The same share can have 5–15% price differences across platforms on the same day. Always compare before buying.",
    },
    {
      question: "What happens when the company IPOs?",
      answer:
        "Your unlisted shares typically have a 6-month post-IPO lock-in (for pre-IPO investors). After lock-in expires, you can sell on the exchange like any listed share. If you bought 24+ months before IPO, gains are taxed as LTCG at 12.5%.",
    },
    {
      question: "What if the company never IPOs?",
      answer:
        "You're holding an illiquid private equity stake. You can sell back to the same platform (often at a discount), find a private buyer, or wait. Some companies do tender offers or buybacks. The risk of being stuck indefinitely is real — size your allocation accordingly.",
    },
    {
      question: "Are there scams I should watch for?",
      answer:
        "Yes. Red flags: 'guaranteed' returns, pushy sales pressure, paying via UPI to a personal account (always pay to a legal entity), shares of companies you can't find on MCA records, or platforms with no physical office. Stick to established names and always verify the share transfer in your demat before paying.",
    },
  ],
  extraDisclaimer:
    "Unlisted shares are highly illiquid and carry significant valuation and execution risk. Platform-quoted prices may not reflect realisable value. No content here is a recommendation to buy or sell any specific unlisted security.",
};

export const cryptoData: ProductPageData = {
  name: "Cryptocurrency",
  oneLine: "Digital assets with real returns and brutal volatility — taxed harshly in India. A small allocation can make sense; treating it as your main investment usually doesn't.",
  whatItIs: [
    "Cryptocurrencies are digital assets running on decentralised blockchains. Bitcoin (BTC), launched in 2009, remains the largest and most established — often called digital gold. Ethereum (ETH) added programmable smart contracts, enabling DeFi, NFTs, and stablecoins. Beyond BTC and ETH, the market includes thousands of altcoins of widely varying quality.",
    "In India, crypto is legal to buy, hold, and sell — but the regulatory environment is hostile. The 2022 budget introduced a flat 30% tax on crypto gains (no loss set-off, no indexation, no deductions other than cost of acquisition) and a 1% TDS on every transaction above ₹50,000/year. Effectively, India taxes crypto worse than any other asset class.",
    "Indian exchanges (CoinDCX, CoinSwitch, WazirX, Mudrex) handle KYC, taxation, and reporting. NRIs and global Indians often use international exchanges (Coinbase, Kraken, Binance) where tax treatment depends on their country of residence. Self-custody (hardware wallets like Ledger or Trezor) eliminates exchange risk but adds operational responsibility.",
  ],
  keyFacts: [
    { label: "Minimum investment", value: "₹100 (Indian exchanges)" },
    { label: "Typical volatility", value: "Bitcoin can move 30–50% in a year" },
    { label: "Tax in India (gains)", value: "30% flat, no loss set-off" },
    { label: "TDS in India", value: "1% on every transaction > ₹50k/yr" },
    { label: "Tax in US (LTCG, >1yr)", value: "0%, 15%, or 20% by income bracket" },
    { label: "Suggested allocation", value: "5–10% max of investable portfolio" },
    { label: "Regulator", value: "FIU-IND (AML compliance); RBI/SEBI hands-off on assets" },
    { label: "Risk level", value: "Very High" },
  ],
  pros: [
    "Bitcoin has historically outperformed every major asset class over 10-year periods",
    "Uncorrelated (most of the time) with Indian equity",
    "Liquid 24/7 across global exchanges",
    "Programmable money + DeFi opens new financial primitives",
    "Globally accessible — useful for NRIs holding multiple currencies",
  ],
  cons: [
    "India's 30% tax + 1% TDS + no loss set-off is the worst tax regime among major economies",
    "Volatility means 70–80% drawdowns happen periodically",
    "No intrinsic cash flow — purely greater-fool dynamics in the short term",
    "Exchange risk (FTX, WazirX issues) and custody risk are real",
    "Many altcoins are outright scams or fail; concentrating outside BTC/ETH is dangerous",
  ],
  whoShouldConsider:
    "Consider a 5–10% allocation to crypto (mostly BTC, some ETH) if you've built a solid base of equity, debt, and emergency fund, can stomach 70% drawdowns, and view it as a 10-year position. Don't consider crypto if you'd panic-sell in a crash, or if you're using leverage. NRIs in tax-friendlier jurisdictions can be more aggressive.",
  commonMistakes: [
    "Treating gains as 'just buy-sell income' and ignoring the 30% tax — quarterly advance tax obligations apply.",
    "Trading frequently. Every trade triggers 1% TDS and 30% tax on gains. India's regime brutally punishes frequent traders.",
    "Holding everything on an exchange. WazirX 2024 incident showed that exchange custody is not your custody.",
    "Concentrating in altcoins for higher returns. >80% of altcoins from 2017–18 are worth essentially zero today.",
    "Forgetting that crypto income must be reported in ITR Schedule VDA. Non-disclosure invites penalties.",
  ],
  howAurisHelps:
    "We help you size a sensible crypto allocation within your overall plan, choose between exchange custody and self-custody, and track cost basis for tax reporting. WealthWise integrates with Indian and global exchanges to give you a unified portfolio view including crypto. We don't recommend specific coins.",
  faqs: [
    {
      question: "Should I invest in crypto in India given the tax regime?",
      answer:
        "It can still make sense as a small (5–10%) long-term position because expected pre-tax returns are high enough to absorb 30% tax. But it's no longer a frequent-trading game — the 1% TDS + 30% tax + no loss set-off makes anything other than long-term holding uneconomical. NRIs in lower-tax jurisdictions have more flexibility.",
    },
    {
      question: "Indian exchange or international?",
      answer:
        "For Indian residents, Indian exchanges are the practical choice — they handle KYC, TDS, and report to tax authorities, making compliance easier. NRIs can use global exchanges (Coinbase, Kraken) governed by their resident-country tax. Always pick exchanges with proof of reserves and regulatory licences.",
    },
    {
      question: "What about self-custody (hardware wallets)?",
      answer:
        "For positions >₹10L or for long-term holdings, self-custody (Ledger or Trezor hardware wallets) eliminates exchange risk. But it adds operational complexity — seed phrase backup, transaction signing, and security hygiene. If you'll panic when you have to remember 24 words, stay on a reputable exchange.",
    },
    {
      question: "Should I trust altcoins?",
      answer:
        "Most altcoins are speculative tokens with limited fundamental value. Of the top 100 cryptocurrencies in 2017, fewer than 20 remain in the top 100 today. We suggest concentrating crypto allocation in BTC (70%+) and ETH (20–30%), with at most a small experimental allocation to others.",
    },
    {
      question: "How do I report crypto in my ITR?",
      answer:
        "Crypto income goes in Schedule VDA (Virtual Digital Assets) of ITR-2 or ITR-3. You report each transaction with date, cost of acquisition, sale value, and gain. There's no offset against other gains — each crypto gain is taxed at 30% standalone. Exchanges issue tax statements (P&L reports) to help with this.",
    },
    {
      question: "Is GIFT City a way around crypto tax?",
      answer:
        "Not generally. The 30% tax applies to all Indian residents regardless of where the trade happens. GIFT City has some advantages for certain financial products but doesn't currently offer special crypto tax treatment for residents. Non-residents (NRIs investing through IFSC structures) have other considerations.",
    },
  ],
  extraDisclaimer:
    "Cryptocurrency is highly volatile and may result in loss of all invested capital. Cryptocurrency gains are taxed at 30% flat in India, with 1% TDS on transactions over ₹50,000 per year. Losses cannot be set off against gains in other asset classes. Self-custody carries operational risk; exchange custody carries counterparty risk.",
};

export const directEquityData: ProductPageData = {
  name: "Direct Equity",
  oneLine: "Buying individual stocks on NSE and BSE. The most studied way to lose money — and the most rewarding when done patiently.",
  whatItIs: [
    "Direct equity means buying shares of individual companies listed on Indian exchanges (NSE and BSE), held in your demat account. You become a part-owner of the business, with voting rights and a share of dividends. Brokers like Zerodha, Groww, Upstox, ICICI Direct, and HDFC Securities facilitate trades.",
    "The Indian market has 5,000+ listed companies but real liquidity in maybe 500. The Nifty 50 represents large-caps; Nifty Next 50, Midcap 150, and Smallcap 250 cover progressively smaller companies. Each segment has very different risk-return profiles — small-caps can deliver 30% annual returns or 70% drawdowns.",
    "Equity returns come from two sources: business growth (earnings compounding) and re-rating (multiple expansion). Over 20+ year periods, Indian equity has historically delivered 12–14% CAGR, beating inflation and most other asset classes. Over 1–3 years, it can do anything. The key insight: time in the market matters more than timing the market.",
  ],
  keyFacts: [
    { label: "Minimum investment", value: "Cost of 1 share + brokerage" },
    { label: "Typical returns (long-term)", value: "12–14% CAGR (historical, Nifty 50)" },
    { label: "Brokerage", value: "₹0–20 per trade (discount brokers)" },
    { label: "Tax (STCG, <1yr equity)", value: "20%" },
    { label: "Tax (LTCG, >1yr equity)", value: "12.5% above ₹1.25L per year" },
    { label: "Dividend tax", value: "Slab rate (in your hands)" },
    { label: "Regulator", value: "SEBI · Stock exchanges (NSE/BSE) · Depositories (NSDL/CDSL)" },
    { label: "Risk level", value: "High (stock-specific) to Very High (small caps)" },
  ],
  pros: [
    "Direct ownership — no expense ratio, no fund manager's bias",
    "Full control over what you buy, when, and how long you hold",
    "Tax-efficient buy-and-hold via the ₹1.25L LTCG exemption",
    "Dividend income (often grows with earnings)",
    "Liquid (large/mid caps) — sell anytime markets are open",
  ],
  cons: [
    "Hard work to research and monitor 15+ companies properly",
    "Behaviour is the biggest enemy — most retail investors sell low, buy high",
    "Concentration risk if you over-allocate to one stock",
    "Information asymmetry vs institutional investors",
    "STCG of 20% punishes short-term trading; transaction costs add up",
  ],
  whoShouldConsider:
    "Consider direct equity if you can spend 5+ hours/month researching and tracking, can hold winners through 30% drawdowns without panic, and limit positions to ones you can explain in two sentences. For everyone else, an index fund or flexi-cap mutual fund is usually a better path to the same returns with less work and less behavioural risk.",
  commonMistakes: [
    "Buying tips from TV, Twitter, or WhatsApp groups. The good ideas are spread after the easy money is made.",
    "Averaging down on losers without re-examining the original thesis. Adding to a falling stock is doubling your bet — it has to be a deliberate decision, not a reflex.",
    "Confusing 'cheap' (low P/E) with 'undervalued'. A company can trade at P/E of 5 because earnings are about to collapse.",
    "Trading too much. Every trade is a tax event and a chance to make a behavioural mistake. The best portfolios are boring portfolios.",
    "Not selling. Founders fall in love with their picks — but a stock that's tripled may now be 40% of your portfolio. Rebalancing isn't a crime.",
  ],
  howAurisHelps:
    "Most investors are best served by index funds + a flexi-cap MF — we'll often tell you that's enough. If you do hold direct equity, WealthWise tracks your portfolio in real time, flags overweighted positions, runs tax-loss harvesting to save on LTCG, and shows portfolio drift vs your target allocation. We don't give stock recommendations.",
  faqs: [
    {
      question: "Index funds vs direct stocks — which should I choose?",
      answer:
        "For most investors, index funds (or a flexi-cap MF) win on simplicity, cost, and behaviour. The Nifty 50 has delivered ~12% CAGR over 20 years; very few retail direct-equity portfolios beat that net of mistakes. Direct equity makes sense when you genuinely enjoy research and have an information edge in specific sectors.",
    },
    {
      question: "How many stocks should I own?",
      answer:
        "For active direct equity portfolios: 15–25 stocks is a sweet spot. Below 15 = too concentrated, above 25 = you can't really know all of them. Within that, no single position should be more than 8–10% of portfolio (except by appreciation).",
    },
    {
      question: "Long-term vs trading — what's the right approach?",
      answer:
        "Long-term investing (3+ years per position) wins on every measurable axis: tax (LTCG at 12.5% vs STCG at 20%), transaction costs, behaviour, and historical returns. Trading sounds glamorous; the data shows 90% of intraday and F&O traders lose money. Pick one approach and stick to it.",
    },
    {
      question: "How do I evaluate a stock?",
      answer:
        "A reasonable starter checklist: (1) Earnings growth over 5–10 years, (2) Return on Equity > 15%, (3) Debt-to-Equity < 1 (varies by sector), (4) Free cash flow positive, (5) Management quality (capital allocation track record, governance), (6) Valuation (P/E vs growth — PEG < 1.5 is a starting filter, not a rule).",
    },
    {
      question: "Should I invest in small-caps?",
      answer:
        "Small-caps can deliver outsized returns over decades but go through brutal drawdowns (40–60% in cycles like 2018–2019 and 2022). A small-cap allocation makes sense (10–20% of equity) for investors under 50 with long horizons. Older investors should be more cautious — the recovery time from a smallcap drawdown can be 3–5 years.",
    },
    {
      question: "What about dividends?",
      answer:
        "Dividends are nice but in India they're taxed at your slab rate (up to 39% for HNIs). For tax-efficient income, holding shares and selling small amounts annually using the ₹1.25L LTCG exemption beats dividend income in most cases. Dividend yield is more about company quality (companies that pay dividends consistently often have good cash flow) than as an income strategy.",
    },
  ],
  extraDisclaimer:
    "Direct equity investing involves significant risk including loss of principal. Past performance of any stock or the broader market does not guarantee future returns. Do your own research or consult a SEBI-registered investment adviser before making decisions.",
};

export const insuranceData: ProductPageData = {
  name: "Insurance",
  oneLine: "Buy what protects your family. Skip what's sold as 'investment'. The right insurance is boring, cheap, and saves lives.",
  whatItIs: [
    "Insurance protects you from low-probability, high-impact financial losses — death of an earner, serious illness, accident, asset destruction. It's not an investment vehicle. The two essential covers for every adult: term life insurance (if anyone depends on your income) and health insurance (for everyone, regardless of dependents).",
    "Term life insurance pays a lump sum to your family if you die during the policy term. It's the cheapest form of life cover — ₹1 crore of cover for a healthy 30-year-old costs ₹10,000–₹15,000 per year. There's no maturity payout if you survive (which is the point — you don't want to die so your family gets money).",
    "The insurance industry pushes endowment plans, money-back policies, and ULIPs because they generate fat commissions. These mix insufficient insurance with poor-quality investment, charging 3–8% in hidden costs. The honest path: pure term plan + health insurance + invest the difference in mutual funds. You'll be better protected and significantly wealthier.",
  ],
  keyFacts: [
    { label: "Term cover needed", value: "10–15x annual income" },
    { label: "Health cover needed", value: "₹15–25 L family floater, more in metros" },
    { label: "Term premium (30y/M/non-smoker, ₹1Cr/30y)", value: "₹10–15k/yr" },
    { label: "Health premium (family of 4, ₹15L)", value: "₹25–40k/yr (varies by age/city)" },
    { label: "Endowment IRR", value: "4–5% (worse than FD)" },
    { label: "ULIP IRR", value: "4–7% net of charges (vs 10–12% in MF)" },
    { label: "Tax (premium)", value: "80C (life) + 80D (health) deductions" },
    { label: "Tax (payout)", value: "Term — tax-free · ULIP/endowment — case-by-case" },
  ],
  pros: [
    "Term life: cheap, large cover, exactly the protection your family needs",
    "Health insurance: protects against medical bills that can wipe out savings",
    "Premiums are tax-deductible under 80C (life) and 80D (health)",
    "Term claim payouts are tax-free",
    "Riders (critical illness, accident) add meaningful cover at low cost",
  ],
  cons: [
    "Endowment/money-back plans are poor investments masquerading as protection",
    "ULIPs combine the worst of both worlds — high charges + complex tax",
    "Health insurance has waiting periods (pre-existing conditions, specific ailments)",
    "Claim disputes happen — read exclusions carefully before buying",
    "Insurance agents push products that pay them most, not what's best for you",
  ],
  whoShouldConsider:
    "Every adult with dependents needs term life insurance until they're financially independent. Every adult and family needs health insurance regardless. Skip endowment, money-back, whole-life, and ULIPs — they're investment products dressed as insurance, and they're bad investment products.",
  commonMistakes: [
    "Buying LIC endowment 'because Papa took one'. The 4–5% return locks up money for 20+ years vs 10–12% in mutual funds.",
    "Buying ₹50 lakh term cover when income is ₹20 lakhs/year. Rule of thumb: 10–15x annual income for term cover, more if you have young kids and big loans.",
    "Relying only on employer health insurance. It vanishes when you change jobs or retire. Always have a personal policy alongside.",
    "Skipping the medical test option to save 15 minutes. The price difference between tested and non-tested policies, and the claim dispute risk, makes the test worth doing.",
    "Buying a 'return of premium' term plan that returns your money if you survive. Sounds nice — but the premium is 2–3x a pure term, and the extra cost invested in MF would massively outperform the 'returned' premium.",
  ],
  howAurisHelps:
    "We'll calculate your real term cover need based on income, dependents, and existing liabilities, recommend buying directly from insurer websites (not agents — saves the 30% commission), and identify health insurance gaps. WealthWise's insurance gap analysis is part of every plan. We never sell insurance — there's no commission conflict.",
  faqs: [
    {
      question: "How much term life cover do I need?",
      answer:
        "A reasonable formula: (10–15x annual income) + (outstanding loans) + (kids' education future cost) − (existing investments). For a 35-year-old earning ₹20L with ₹50L home loan and two kids, that's typically ₹2–3 crore. Cheaper than most people expect — under ₹25,000/year.",
    },
    {
      question: "Term insurance till what age?",
      answer:
        "Match it to the age you expect to be financially independent — typically 55 to 65. Term till 75 or 80 is rarely worth the premium hike, because by then your investments should cover your family's needs. The exception: very late starters or those with continuing dependents.",
    },
    {
      question: "Health insurance — family floater or individual?",
      answer:
        "Family floater for young families (₹15–25L cover for the whole family is cost-efficient). For older parents (60+), individual policies often work better because of how floater claims share the cover. A practical setup: floater for spouse + kids, separate ₹10–15L policies for parents.",
    },
    {
      question: "ULIPs — are they really that bad?",
      answer:
        "Post-2010 ULIPs reduced charges, but they still underperform a comparable term + MF combination by 2–4% per year after fees. The one case where ULIPs make sense: investors who would otherwise not invest at all and need the forced lock-in. For disciplined investors, term + MF wins decisively.",
    },
    {
      question: "What riders are worth it?",
      answer:
        "Critical illness rider (₹25–50L for ₹1,500–₹3,000/year extra) is excellent — pays out on diagnosis of cancer, heart attack, kidney failure. Accidental death and permanent disability rider is also worth it. Waiver of premium rider is good for sole earners. Skip 'income replacement' riders — duplicates what term cover already does.",
    },
    {
      question: "Should I cancel my old endowment/LIC policy?",
      answer:
        "Depends on years remaining. If you've paid 3+ years and are deep in, calculate the 'paid-up' option (stop new premiums, get reduced sum at maturity) vs surrender vs continue. For policies bought in last 1–2 years, often better to surrender, take the loss, and redirect premiums to term + MF. A planner can run the maths on your specific policy.",
    },
  ],
  extraDisclaimer:
    "Insurance products are subject to terms, conditions, and exclusions of the policy. Read the policy document carefully before buying. Premiums and benefits vary by age, health, sum assured, and insurer. We do not sell insurance.",
};

export const realEstateData: ProductPageData = {
  name: "Real Estate",
  oneLine: "Residential, commercial, REITs — the largest asset class in most Indian household balance sheets, and often the most over-allocated.",
  whatItIs: [
    "Real estate spans residential property (your home, rental flats, plots), commercial property (offices, retail, warehouses), and listed real estate vehicles like REITs (Real Estate Investment Trusts) and InvITs (Infrastructure Investment Trusts). It's typically the largest single asset Indian households own.",
    "Residential ownership of your primary home is often more emotional than financial — it gives stability, removes rent inflation, and earns LTCG benefits on sale. Investment property (second home, rental flats) has different math: rental yields in Indian metros are 2–3% (vs 8%+ in many international markets), and capital appreciation depends heavily on micromarket and timing.",
    "REITs (since 2014) let you own commercial real estate liquidly on the exchange. Embassy, Mindspace, Brookfield India, and Nexus Select Trust own income-producing office or retail portfolios and distribute 6–9% annual income to unitholders. Minimum investment is the cost of one unit (~₹300–500). For most investors, REITs are a more practical way to add real estate than a second flat.",
  ],
  keyFacts: [
    { label: "Min investment (residential)", value: "₹40 L+ (varies by city)" },
    { label: "Min investment (REIT)", value: "Cost of 1 unit (~₹300–500)" },
    { label: "Rental yield (India residential)", value: "2–3%" },
    { label: "Rental yield (REIT)", value: "6–9% (distribution yield)" },
    { label: "Capital appreciation (long-term)", value: "5–8% (highly micromarket-dependent)" },
    { label: "LTCG holding period", value: "24 months" },
    { label: "Tax (LTCG, post-Jul 2024)", value: "12.5% without indexation OR 20% with indexation (for older property)" },
    { label: "Tax (rental income)", value: "Slab rate (after 30% standard deduction)" },
  ],
  pros: [
    "Tangible asset — hard to lose to fraud or company collapse",
    "Leverage available cheaply (home loans at 8–9%) for primary residence",
    "Rental income provides cash flow",
    "Hedge against inflation over very long periods",
    "REITs give liquid, professionally managed exposure",
  ],
  cons: [
    "Illiquid — selling a flat can take 6–24 months",
    "Transaction costs (stamp duty + registration + brokerage) eat 8–10% of price",
    "Concentration risk — buying a ₹1 Cr flat is one undiversified bet",
    "Maintenance, tenant issues, property tax — real costs, real headaches",
    "Indian rental yields are low — capital appreciation has to do all the work",
  ],
  whoShouldConsider:
    "Own your primary residence if you're settled in a location and the EMI is within 30% of take-home. Investment property (second/third flat) makes sense only if you have ₹2 Cr+ of liquid assets first, the property is in a high-rental-demand area, and you're not over-allocating. REITs make sense as a 5–15% allocation in most portfolios.",
  commonMistakes: [
    "Buying a second flat 'as investment' when 60% of your net worth is already in your primary residence. Most Indian portfolios are dangerously real-estate-heavy.",
    "Believing the broker's quoted 'rental yield' — it's typically gross, ignoring vacancies, maintenance, and property tax. Actual net yield is 30–40% lower.",
    "Buying under-construction property and being stuck for years when the developer delays. Always factor in 1–3 year delays.",
    "Calculating 'returns' on real estate without including imputed rent, maintenance, society fees, property tax, and interest — most informal calculations dramatically overstate returns.",
    "Ignoring REITs because 'real estate must be a physical flat'. REITs are real estate — just liquid and diversified.",
  ],
  howAurisHelps:
    "We help you assess whether your existing real estate allocation is healthy (often it's already too high), whether to buy vs rent for your primary home, and how to add real estate exposure via REITs vs physical property. WealthWise tracks your real estate holdings (with market value updates) as part of the unified portfolio view.",
  faqs: [
    {
      question: "Buy vs rent — what's the right call?",
      answer:
        "Pure financial math often favours renting in metros — rental yields are 2–3% while home loan rates are 8–9%, plus the opportunity cost of the down payment. Buying makes more sense if you'll stay 7+ years, prices are below long-term trend, and the EMI is under 30% of take-home. Emotional and lifestyle factors matter too.",
    },
    {
      question: "What are REITs and how do they work?",
      answer:
        "REITs pool money to buy income-producing commercial real estate (mostly Grade A offices and retail malls). They're listed on NSE/BSE; you buy units like shares. By law, 90%+ of rental income is distributed to unitholders quarterly. India has 4 listed REITs as of 2026: Embassy, Mindspace, Brookfield India, and Nexus Select Trust.",
    },
    {
      question: "How is REIT income taxed?",
      answer:
        "REIT distributions come in 3 parts: dividends (tax-free or taxable depending on REIT's election), interest (taxed at your slab), and return of capital (reduces your cost basis). It's more complex than mutual funds — the AMC sends you a breakdown each year. Net effective tax is typically 10–15% for most investors.",
    },
    {
      question: "Should I take a home loan?",
      answer:
        "If buying your primary home and the EMI is under 30–35% of take-home pay, yes. Home loans are the cheapest debt available (~8–9%), tax-deductible for principal (80C, up to ₹1.5L) and interest (Sec 24, up to ₹2L for self-occupied), and the asset has long-term value. For second/investment property, the math is much tighter.",
    },
    {
      question: "Is now a good time to buy property?",
      answer:
        "Real estate timing is hard. Indian property has been range-bound in real terms in most metros over the last decade (2015–2024). Specific micromarkets have done very well; many have done nothing. If you're buying to live in for 10+ years, timing matters less. If you're investing, study the specific micromarket's supply pipeline and rental demand carefully.",
    },
    {
      question: "What about commercial property directly?",
      answer:
        "Yields are higher (6–9% vs residential's 2–3%) but tickets are large (₹1.5 Cr+), tenant risk is concentrated (one tenant vacating = 100% vacancy), and exit liquidity is low. For most investors, a Grade A office REIT gives the same exposure with better diversification and liquidity. Direct commercial makes sense for HNIs with ₹5 Cr+ already deployed.",
    },
  ],
  extraDisclaimer:
    "Real estate values are highly micromarket-dependent and illiquid. Rental yields quoted are gross of vacancies, maintenance, and tax. REIT distributions can fluctuate based on occupancy and market conditions. Consult a tax advisor on capital gains treatment, especially for property purchased before July 2024.",
};

export const goldData: ProductPageData = {
  name: "Gold",
  oneLine: "Portfolio insurance, not a growth engine. 5–10% allocation is the sensible middle — and SGB beats every other form of buying gold.",
  whatItIs: [
    "Gold has been an Indian household savings instrument for centuries — first as jewellery, more recently as coins, ETFs, and Sovereign Gold Bonds (SGBs). Its job in a modern portfolio isn't to make you rich; it's to provide ballast during equity crashes, currency depreciation, and high-inflation episodes.",
    "There are five practical ways to own gold in India: (1) Physical (jewellery, coins, bars) — most expensive due to making charges and storage; (2) Digital gold (PhonePe, MMTC) — convenient but storage charges and counter-party risk; (3) Gold ETFs (HDFC Gold ETF, Nippon India Gold BeES) — liquid, low cost, but no interest; (4) Gold mutual funds — fund-of-fund layer over ETFs, slightly higher cost; (5) Sovereign Gold Bonds (SGBs) — government-issued, 2.5% annual interest plus gold price appreciation, LTCG-exempt if held to maturity.",
    "For long-term portfolio allocation, SGB is mathematically superior to every other form of gold ownership: zero making charges, 2.5% interest on top of gold price, no storage risk, tax-free at maturity. The downside: 8-year lock-in (with early exit windows from year 5), and primary issuance has been paused at times. Gold ETFs are the next best — liquid, low-cost, no lock-in.",
  ],
  keyFacts: [
    { label: "Suggested allocation", value: "5–10% of investable portfolio" },
    { label: "Best form (long-term)", value: "Sovereign Gold Bonds (SGB)" },
    { label: "SGB interest", value: "2.5% per annum (in addition to gold price)" },
    { label: "SGB lock-in", value: "8 years (early exit windows from year 5)" },
    { label: "SGB tax", value: "LTCG exempt if held to maturity · Interest taxed at slab" },
    { label: "Gold ETF expense ratio", value: "0.3–0.7%" },
    { label: "Gold MF expense ratio", value: "0.4–1% (slightly higher than ETF)" },
    { label: "Physical making charges", value: "8–25% (jewellery) · 3–8% (coins/bars)" },
  ],
  pros: [
    "Negatively or weakly correlated with equity in crashes — true diversifier",
    "Hedge against rupee depreciation (gold is dollar-denominated globally)",
    "SGB pays 2.5% interest while you wait for appreciation",
    "Inflation hedge over very long periods",
    "Liquid via ETFs and SGB secondary market",
  ],
  cons: [
    "Long-term returns lag equity meaningfully (~8% gold vs 12–14% equity)",
    "No cash flow (other than SGB's 2.5% interest)",
    "Physical gold has storage cost, security risk, and 8–25% making charges",
    "Can underperform for 5–10 year stretches",
    "SGB primary issuance has been paused at times — making market entry harder",
  ],
  whoShouldConsider:
    "Every multi-asset portfolio benefits from 5–10% gold as ballast. Heavier allocations (15–20%) make sense for retirees prioritising stability over growth, or in periods of currency uncertainty. For wealth-building investors under 40, keep gold below 10% — the opportunity cost vs equity is real.",
  commonMistakes: [
    "Buying physical gold jewellery 'as investment'. The 15–25% making charges mean you start ~20% in the hole on day one — the price needs to rise 25% just to break even.",
    "Treating gold as a primary growth asset. Over 30-year periods, equity has trounced gold by 4–6% CAGR — that's a 5–8x difference in terminal wealth.",
    "Skipping SGB because '8 years is too long'. If you'd allocate to gold anyway, SGB beats every alternative — even with the lock-in, you have liquidity from year 5 via early redemption windows and from day one via the secondary market.",
    "Confusing 'digital gold' (PhonePe, Paytm) with Gold ETF. Digital gold has counter-party risk with the vault operator and is not exchange-traded.",
    "Forgetting that SGB interest (2.5%) is taxable at your slab rate, even though capital appreciation at maturity is tax-free.",
  ],
  howAurisHelps:
    "We help you decide the right gold allocation for your age and risk profile, choose between SGB and Gold ETFs based on your liquidity needs, and stagger SGB purchases across multiple tranches for vintage diversification. WealthWise tracks your gold across all forms (physical, ETF, SGB) at live market prices.",
  faqs: [
    {
      question: "Is SGB really better than Gold ETF?",
      answer:
        "Yes, for long-term allocation. SGB gives you 2.5% interest annually + gold price appreciation + tax-free LTCG at maturity. Gold ETF gives just gold price appreciation, minus 0.3–0.7% expense ratio, with LTCG taxed at 12.5%. Over 8 years, SGB outperforms an equivalent Gold ETF investment by ~25% pre-tax.",
    },
    {
      question: "What if I need money before SGB matures?",
      answer:
        "SGB has two exit routes: (1) Early redemption windows on coupon payment dates from year 5 onwards (you redeem to the government at the prevailing gold price); (2) Sell anytime on NSE/BSE in the secondary market (where SGBs trade, though sometimes at a slight discount). Either way, you have liquidity well before maturity.",
    },
    {
      question: "Should I buy gold jewellery for investment?",
      answer:
        "No. Jewellery making charges (typically 8–25%) and the loss on resale (jewellers buy back at scrap rates minus 5–10%) make jewellery one of the worst ways to own gold for investment. Buy jewellery because you want jewellery; for investment, use SGB or ETF.",
    },
    {
      question: "How much gold should my portfolio have?",
      answer:
        "5–10% is the sensible default for most investors. Higher (15%) if you're closer to retirement or worried about currency depreciation. Lower (3–5%) if you're young, aggressive, and have a 30-year horizon. Almost never higher than 20% — the opportunity cost vs equity becomes significant over long periods.",
    },
    {
      question: "Digital gold (PhonePe, Paytm) — is it safe?",
      answer:
        "Digital gold platforms hold physical gold in vaults on your behalf via the MMTC-PAMP partnership. It's not exchange-traded — there's vault operator counter-party risk. Practical for very small amounts (₹100/month accumulation); for serious allocation, SGB or Gold ETF is structurally safer and cheaper.",
    },
    {
      question: "How do I time my gold purchases?",
      answer:
        "Don't try. Gold price moves are notoriously hard to time. Stagger purchases over multiple tranches (especially SGBs, which are issued in series 3–6 times a year). For ETFs, monthly SIPs work the same way they do for equity. The goal of gold is ballast, not alpha — timing isn't where the value comes from.",
    },
  ],
  extraDisclaimer:
    "Gold prices in INR are influenced by global gold prices, the USD/INR exchange rate, and Indian customs duty. Past gold returns do not guarantee future performance. SGB early redemption is at the prevailing gold price, which may be lower than your purchase price.",
};
