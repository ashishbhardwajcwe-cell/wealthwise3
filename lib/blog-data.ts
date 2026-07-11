export interface BlogPost {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  tags: string[];
  date: string;
  readTime: string;
  author: string;
  content: string;
  /** Optional FAQ block — also emitted as FAQPage JSON-LD on the post page. */
  faqs?: { question: string; answer: string }[];
}

export const BLOG_POSTS: BlogPost[] = [
  {
    slug: "complete-guide-to-pms-india-2026",
    title: "The complete guide to PMS in India for 2026",
    excerpt: "What Portfolio Management Services actually are, who they're for, what they cost, and how to evaluate a manager before committing ₹50 lakhs.",
    category: "Investing",
    tags: ["PMS", "HNI", "Equity"],
    date: "2026-05-22",
    readTime: "14 min",
    author: "PlanMyCashflows Research",
    content: `
Portfolio Management Services (PMS) in India have grown from a niche product for the ultra-rich into a ₹30+ lakh crore industry serving 100,000+ HNI investors. With the SEBI minimum at ₹50 lakhs and over 400 registered PMS providers, choosing well matters more than ever.

This guide walks you through what PMS is, who it's actually for, how to evaluate a manager, what fees you'll actually pay, and the common mistakes investors make in their first PMS investment.

## What is PMS?

A Portfolio Management Service is a SEBI-regulated investment service where a professional manager builds and manages a stock portfolio in your name. Unlike mutual funds — where you own units of a pool that the AMC controls — in PMS you own the actual stocks in your demat account. The manager has Power of Attorney to buy and sell on your behalf, but the holdings are yours.

This direct ownership creates three differences that matter:

1. **Customisation** — your portfolio can exclude sectors or stocks you don't want (ESG concerns, conflict of interest with your employer, etc.)
2. **Tax efficiency** — there's no portfolio-level churn tax. When you exit the PMS, your stocks transfer to you; you only pay capital gains on what you actually sell
3. **Transparency** — every trade is visible to you in real time

[See our full Portfolio Management Services product page →](/investment-products/pms)

## Who is PMS actually for?

PMS makes sense if all of these are true:

- You have **₹50L+** to invest in equity strategies (SEBI minimum)
- You already have a diversified mutual fund base (PMS as a complement, not a substitute)
- You can stomach **20–30% short-term drawdowns** without panic
- You have a **5+ year horizon** for the strategy to play out
- You want **concentrated bets** by a manager you respect, not broad market exposure

PMS does NOT make sense as your first equity exposure. Start with index funds and flexi-cap mutual funds first. PMS as a 30–50% slice of equity for ₹50L+ investors is the typical structure that works.

## Fee structures — the part most decks gloss over

PMS fees come in three flavours:

1. **Fixed fee only** — typically 2–2.5% of AUM per year. Simple, predictable, manager paid regardless of performance. Few managers offer this purely.

2. **Performance-only** — typically 20% of returns above a hurdle (usually 8–10%) with no fixed fee. Aligned with you, but managers rarely offer this without volume commitment.

3. **Hybrid (most common)** — 1–2% fixed + 10–20% performance over a hurdle of 6–10%. The fixed fee keeps the manager paid; the performance fee rewards alpha.

The hybrid structure can look cheap but bite hard. Example: 1.5% fixed + 20% performance over 8% hurdle. If your PMS returns 18% gross, you pay 1.5% fixed + 20% × (18% – 8%) = 1.5% + 2% = 3.5% total. Net return: 14.5%. You give up over a third of the excess return above hurdle.

## How to evaluate a PMS manager

Most investors evaluate PMS managers wrong. They look at the last 1–3 year return chart and pick the leader. This is mean-reversion bait — yesterday's chart-topper often becomes tomorrow's laggard, particularly in smaller PMS strategies that ride a single thematic wave.

A better evaluation framework:

1. **Investment process** — is there a repeatable framework you can articulate, or is it just "we pick good stocks"?
2. **AUM trajectory** — has the strategy's AUM grown steadily (good) or spiked and contracted (bad)?
3. **Drawdown behaviour** — how did the strategy perform in 2008, 2018-19, March 2020, and 2022? Compare with Nifty 500.
4. **Key-person risk** — does the strategy depend on one PM? What happens if they leave?
5. **Fee transparency** — is the fee structure clearly explained without finance jargon, or does it require a lawyer to parse?
6. **Track record length** — has the manager managed THIS strategy across at least one full market cycle (5+ years)?
7. **Concentration discipline** — does the PMS publish its position sizing rules?

## Common mistakes in first PMS investment

After looking at hundreds of HNI portfolios, the same mistakes show up repeatedly:

1. **Picking by last year's chart leader** — almost certain to disappoint over 3+ years.
2. **Not reading the disclosure document** — fees, conflicts, related-party transactions are all in there.
3. **Adding too many PMSs** — owning 5 PMSs is rarely better than owning 2 well-chosen ones; the overlap is enormous in large-cap names.
4. **Treating PMS as your full equity exposure** — it should typically be 30–50% of equity, with MFs / index funds as the base.
5. **Ignoring tax implications of high-churn strategies** — frequent rebalancing in your PMS = your tax bill.

## Bottom line

PMS is a legitimate tool for ₹50L+ equity investors who want personalisation, direct stock ownership, and the chance for alpha. It's not magic — most PMSs underperform their benchmark net of fees over 7+ year periods, so manager selection matters enormously.

If you're considering your first PMS, start with the **PlanMyCashflows AI Wealth Planner** — it'll tell you whether PMS makes sense in your situation, or whether you're better off optimising mutual fund selection first.

[Try the AI Wealth Planner →](/ai-wealth-planner)
    `,
  },
  {
    slug: "mutual-funds-vs-pms",
    title: "Mutual funds vs PMS: which is right for you?",
    excerpt: "The decision framework: when mutual funds win, when PMS adds value, and the typical blend that works for HNI portfolios.",
    category: "Investing",
    tags: ["Mutual Funds", "PMS"],
    date: "2026-05-18",
    readTime: "10 min",
    author: "PlanMyCashflows Research",
    content: `
"Should I stop my SIPs and move to PMS?" is one of the most common questions we hear from HNI investors. The honest answer is almost always: **no, you should run them in parallel — with different roles**.

## The core difference

- **Mutual funds** — pooled investment, AMC owns the stocks, you own units. Cheap (Direct plans 0.5-1% expense ratio), accessible (₹500 minimum), diversified, regulated tightly.
- **PMS** — managed account, you own the stocks directly in demat. Expensive (2-3.5% total fees), high minimum (₹50L), concentrated (15-25 stocks), more customisable.

## When mutual funds win

For most investors and most goals, mutual funds win on simplicity, cost, and behavioural friction:

1. **Investing under ₹50L** — PMS isn't an option
2. **Index strategies** — passive index funds at 0.1-0.2% expense ratio are unbeatable for broad market exposure
3. **Tax-efficient base allocation** — MF internal churn doesn't hit your tax bill
4. **Diversified core holdings** — flexi-cap MFs give you 60+ stock diversification at minimal cost
5. **Goal-based investing with SIPs** — automated, disciplined, perfectly suited to mid-career professionals

## When PMS adds value

PMS adds value at the edges, not as a substitute for the base:

1. **Concentrated alpha bets** — well-run PMS strategies can outperform benchmarks meaningfully over 5+ years (though most don't)
2. **Style-specific exposure** — value, quality, small-cap focused — that mutual funds in India often don't offer cleanly
3. **Customisation needs** — sector exclusions, ESG preferences, conflict-of-interest avoidance with employer holdings
4. **Tax efficiency on exit** — particularly important for very long-term holdings; no portfolio churn cost on exit

## The typical HNI blend that works

For investors with ₹5 Cr+ equity allocation, a blend like this often makes sense:

- **50-60% in index + flexi-cap mutual funds** (the boring base)
- **20-30% in 2-3 carefully selected PMSs** (style or theme bets)
- **10-20% in AIFs / unlisted / international** (for diversification beyond listed Indian equity)

This structure gives you broad market participation at low cost, concentrated alpha bets with managers you trust, and diversification beyond the Indian listed universe.

## The decision framework

Ask yourself, honestly:

1. Do I have ₹50L+ to commit to a single PMS strategy?
2. Have I already built a diversified MF base?
3. Can I name a specific reason this PMS strategy will outperform Nifty 500 over 7+ years (not just last 3)?
4. Am I comfortable with concentration risk and 30%+ drawdowns?
5. Have I read the actual fee structure and understood my net-of-fee expected return?

If you can't say yes to all five, stay with mutual funds. If you can, PMS is a legitimate tool — but pick the manager carefully.

[Read the full PMS guide →](/investment-products/pms)
    `,
  },
  {
    slug: "ltcg-125-lakh-exemption-most-underused-tax-tool",
    title: "The ₹1.25 lakh LTCG exemption — the most under-used tax tool in India",
    excerpt: "Every Indian equity investor can harvest ₹1.25 lakhs of long-term capital gains tax-free every year. Most don't. Here's how to set up the workflow.",
    category: "Tax",
    tags: ["Tax", "LTCG", "Harvesting"],
    date: "2026-05-01",
    readTime: "9 min",
    author: "PlanMyCashflows Research",
    content: `
Every year, Indian equity investors leave thousands of rupees of tax savings on the table. The reason: they don't actively harvest the ₹1.25 lakh LTCG exemption that's available to them every single financial year.

This post explains what tax harvesting is, why it matters, and how to set up a 30-minute March-end workflow that saves you ₹12,500 to ₹40,000 in tax per year.

## What the rule says

Under current Indian tax law (post-Jul 2024):

- Long-term capital gains (held >12 months) on listed equity/equity MFs are taxed at **12.5%**
- But there's an **annual exemption of ₹1.25 lakhs** per individual

The exemption applies per financial year — use it or lose it. There's no rollover.

## What "harvesting" means

You **sell** units that have appreciated and immediately **re-buy** the same units. The net economic position is identical (you own the same number of units in the same fund), but you've **realised** the gains up to ₹1.25L, which are now tax-exempt and your cost basis has reset higher.

When you eventually sell for real, you only pay tax on gains **above** this new (higher) cost basis. You've permanently saved tax on ₹1.25L of gains.

## A simple example

Say you bought ₹10L of an equity mutual fund 18 months ago. It's now worth ₹15L (₹5L unrealised gain).

**Without harvesting:** You hold for another 10 years, eventually sell at ₹40L. LTCG = ₹40L − ₹10L = ₹30L. Tax = 12.5% × (₹30L − ₹1.25L) = ₹3,59,375.

**With harvesting (assume you harvest each year):** Each year you sell ₹1.25L of gains and re-buy. After 10 years, you've harvested 10 × ₹1.25L = ₹12.5L of gains tax-free, and your cost basis has reset accordingly. The final sale's tax liability drops to roughly 12.5% × (₹17.5L − ₹1.25L) = ₹2,03,125.

**Net savings: ₹1,56,250 over 10 years**, just from this one fund. For a serious investor with multiple funds, this can scale to ₹5-10L of lifetime tax savings.

## How to actually do it

Every March (3rd or 4th week is fine):

1. **Pull your equity mutual fund holdings** — direct units only, regular plan units don't behave the same way
2. **For each fund, identify long-term (>12 month) holdings with appreciation**
3. **Calculate the redemption amount needed** to realise gains close to ₹1.25L total (across all funds)
4. **Execute the redemption** through the AMC website or platform
5. **Immediately invest the same redemption proceeds** back into the same funds

The crucial bit: you must execute the redemption AND the re-purchase in the same fund family ideally on the same day to minimise market gap risk. Use Direct plans on Coin, Kuvera, or MFCentral.

## Common questions

**Will the exit load apply?**

Most equity MFs have exit load only in the first 1 year. Since you're harvesting long-term holdings, no exit load applies.

**Does it work for direct stocks too?**

Yes — same principle. Sell and re-buy listed equity. Bear in mind delivery brokerage costs (small with discount brokers, but real).

**What if I have a loss to set off?**

Even better. Harvest STCG losses first (they offset both STCG and LTCG), then use the ₹1.25L exemption on remaining gains. This requires more careful planning — happy to walk you through it.

**Do I need to actually sell, or is there a paper trick?**

Yes, you need to actually execute a sale and a purchase. There's no automatic exemption — it has to be a realised gain.

## Why doesn't your broker remind you?

Because most brokers and AMCs make money from your trading frequency, not your tax efficiency. Tax harvesting is one of the few activities where YOUR interest doesn't align with theirs.

## Bottom line

A 30-minute workflow in mid-March each year can save you ₹12,500-40,000 in current-year tax. Over a 30-year investing career, that's potentially ₹15-20 lakhs of saved tax — enough to fund a small retirement bucket entirely.

The CashFlow Planner app automates this — every March it identifies which units to harvest in which order, executes via your broker, and confirms the realised gain stayed under ₹1.25L. But even without an app, this is a worthwhile 30 minutes once a year.

[Run the tax harvesting calculator →](/resources/calculators/tax-harvesting)
    `,
  },
  {
    slug: "aif-category-1-2-3-explanation",
    title: "AIF Categories I, II & III Explained",
    excerpt: "What each AIF category actually invests in, the minimums and investor caps, how pass-through vs fund-level taxation works, and who each category suits.",
    category: "Investing",
    tags: ["AIF", "HNI", "Alternatives"],
    date: "2026-07-11",
    readTime: "8 min",
    author: "PlanMyCashflows Research",
    content: `
An Alternative Investment Fund (AIF) is a SEBI-regulated pooled investment vehicle for sophisticated investors — money collected from a limited number of investors and deployed in strategies beyond everyday stocks, bonds and mutual funds. SEBI's AIF Regulations, introduced in 2012, split the universe into three categories, and the category a fund registers under determines what it may invest in, how much leverage it may use, and — importantly for you — how its income is taxed.

This explainer walks through each category in plain English: what it covers, real-world examples, the entry requirements, the tax treatment, and the kind of investor each one tends to suit. It is education, not a recommendation — by the end you should be able to read a fund deck and immediately place it in the right mental box.

## First, what every AIF has in common

Before the categories diverge, the basics are shared. Every AIF is registered with SEBI and managed by a professional investment team. The SEBI-mandated minimum investment is **₹1 crore** per investor (₹25 lakh for the fund's own employees and directors), and each scheme is capped at **1,000 investors** (49 for Angel Funds). The fund's sponsor and manager must keep their own capital in the fund — a "skin in the game" requirement — and every scheme must publish a private placement memorandum (PPM) that spells out strategy, fees, risks and tenure.

AIFs are typically closed-ended (Category III may be open-ended): you commit capital, the fund draws it down over time, and you get it back — with gains or losses — as investments mature. Liquidity is therefore very different from a mutual fund; lock-ins of five to ten years are common in Categories I and II.

## Category I — funds the policy-maker wants to encourage

Category I covers funds that invest in areas with positive spillovers for the economy: **venture capital funds** backing early-stage startups, **SME funds** financing small and mid-size enterprises, **infrastructure funds**, **angel funds**, and **social venture funds**. Because the government sees these as economically useful, Category I enjoys the friendliest regulatory treatment.

An example: a venture capital AIF raising ₹500 crore to invest in seed and Series-A technology startups over four years, holding each position for five to eight years, and returning capital as portfolio companies are acquired or listed. Returns depend almost entirely on a handful of winners — the classic venture power-law.

Category I funds may not use leverage except for temporary funding needs, and their tenure is fixed at launch (minimum three years). For investors, that means long, illiquid commitments with capital drawn down in tranches.

## Category II — the private-markets workhorse

Category II is the residual and, by commitments, the **largest category in India**. It covers funds that don't fit Category I and don't trade with leverage: **private equity funds**, **private credit and debt funds**, **real-estate funds**, **pre-IPO funds** and structured strategies. If you've been pitched an AIF at a wealth event, odds are it was Category II.

Examples: a private credit fund lending to mid-market companies at fixed yields with quarterly payouts; a real-estate fund financing residential projects; a late-stage PE fund buying minority stakes in profitable unlisted companies. Cash-flow profiles vary — credit funds often distribute income along the way, while PE funds return lumpy capital as exits happen.

Like Category I, leverage is restricted to temporary requirements, funds are closed-ended with a minimum three-year tenure, and lock-ins matching the underlying assets are the norm.

## Category III — public markets, hedge-fund style

Category III funds may employ **complex or leveraged strategies** in listed markets: long-short equity, market-neutral, arbitrage, derivatives-driven and quantitative approaches. They are India's closest cousin to hedge funds, and many are structured as open-ended vehicles with periodic (often monthly or quarterly) liquidity — far more liquid than Categories I and II.

An example: a long-short equity fund that holds its highest-conviction stocks while shorting index futures to dampen market swings, aiming for equity-like returns with lower drawdowns. Leverage is permitted within SEBI's limits, which is precisely what makes the category more complex — the same tool that smooths returns can amplify losses.

## The entry ticket, side by side

All three categories share the ₹1 crore SEBI minimum and the 1,000-investor cap. Where they differ is liquidity and horizon: Category I and II commitments typically run five to ten years with capital drawn down over time, while Category III funds often allow periodic redemption. None of them suit money you may need at short notice.

## Reading a fund deck: where the category shows up

When a PPM lands in your inbox, the category is stated on the first page — and it frames everything that follows. Check three things against it: the **investment strategy** section should match the category's permitted universe (a "long-short listed equity" strategy in a Category II wrapper deserves questions); the **tenure and redemption terms** should match the liquidity you expect from the category; and the **leverage policy** should be explicit, especially for Category III. The categories exist precisely so this cross-checking takes minutes, not hours.

## Taxation: pass-through vs fund-level

This is the single most practical difference between the categories.

**Category I and II AIFs have statutory pass-through status.** The fund itself does not pay tax on its investment income (business income is the exception); instead, income is taxed **in your hands** as if you had earned it directly — capital gains as capital gains, interest as interest — with the fund deducting 10% TDS on income credited to resident investors. You then reconcile the actual liability in your own return. For NRIs, applicable DTAA rates can apply, claimed via a Tax Residency Certificate and Form 10F.

**Category III AIFs are taxed at the fund level.** The fund pays tax on its gains — often at the maximum marginal rate for business income — and what you receive is post-tax. There is no pass-through, which is why comparing a Category III fund's returns with a PMS or mutual fund requires care: the Category III number you see is typically already net of fund-level tax, while the others are pre-tax in your hands.

Tax rules change with Finance Acts and depend on fund structure and your residency — treat this as a map, not a measurement, and confirm specifics with a tax adviser before committing.

## Who does each category suit?

**Category I** suits investors who want concentrated exposure to early-stage or infrastructure themes, can lock capital away for seven-plus years, and can absorb the possibility that individual bets go to zero. **Category II** suits investors building a private-markets allocation — credit for income, PE and real estate for growth — who value pass-through taxation and accept multi-year lock-ins. **Category III** suits investors who want sophisticated listed-market strategies with meaningful liquidity, and who understand that leverage and fund-level taxation change both the risk and the after-tax arithmetic.

Across all three, the honest common denominator: these are ₹1-crore-plus commitments designed for people whose core portfolio is already in order.

## Frequently asked questions

### Can I invest less than ₹1 crore in an AIF?

No. The ₹1 crore minimum is set by SEBI regulation and applies across all providers and categories. The only exceptions are employees and directors of the fund itself (₹25 lakh) and accredited investors under SEBI's accreditation framework, for whom certain flexibilities exist.

### Which AIF category is the largest in India?

Category II holds the majority of industry commitments — private equity, private credit and real-estate funds dominate India's AIF landscape.

### Do AIF returns come with any guarantee?

No. AIFs are market-linked vehicles; returns are not guaranteed, capital is at risk, and past performance is not indicative of future results. Any pitch that suggests otherwise should be treated as a red flag.

### How do AIFs differ from PMS?

A PMS holds securities directly in your own demat account with a ₹50 lakh minimum; an AIF pools money into a fund where you hold units, with a ₹1 crore minimum. PMS gains are taxed in your hands transaction by transaction; AIF taxation depends on category. [The full comparison lives here →](/blog/mutual-funds-vs-pms)

### Where can I learn more before talking to anyone?

Start with our [AIF product guide](/investment-products/aif) and the [PMS guide](/investment-products/pms) — then, if useful, our team can walk you through specific fund documents.

This article is for information and education only and does not constitute investment advice, a recommendation, or an offer to invest. AIF investments are subject to market risks, including possible loss of capital; minimums, tenure and taxation vary by fund and can change with regulation. Read the private placement memorandum carefully and consult your own financial and tax advisers before investing.
`,
    faqs: [
      { question: "Can I invest less than ₹1 crore in an AIF?", answer: "No. The ₹1 crore minimum is set by SEBI regulation and applies across all providers and categories. The only exceptions are employees and directors of the fund itself (₹25 lakh) and accredited investors under SEBI's accreditation framework, for whom certain flexibilities exist." },
      { question: "Which AIF category is the largest in India?", answer: "Category II holds the majority of industry commitments — private equity, private credit and real-estate funds dominate India's AIF landscape." },
      { question: "Do AIF returns come with any guarantee?", answer: "No. AIFs are market-linked vehicles; returns are not guaranteed, capital is at risk, and past performance is not indicative of future results. Any pitch that suggests otherwise should be treated as a red flag." },
      { question: "How do AIFs differ from PMS?", answer: "A PMS holds securities directly in your own demat account with a ₹50 lakh minimum; an AIF pools money into a fund where you hold units, with a ₹1 crore minimum. PMS gains are taxed in your hands transaction by transaction; AIF taxation depends on category." },
    ],
  },
  {
    slug: "cryptocurrency-indian-portfolio",
    title: "How to think about cryptocurrency as part of an Indian portfolio",
    excerpt: "The 30% tax + 1% TDS reality, why allocation should be 5-10% maximum, and the case for BTC over altcoins.",
    category: "Investing",
    tags: ["Crypto", "BTC", "Tax"],
    date: "2026-04-18",
    readTime: "12 min",
    author: "PlanMyCashflows Research",
    content: "India has one of the world's harshest crypto tax regimes — 30% flat on gains, 1% TDS on transactions, no loss set-off. Despite this, a small allocation (5-10%) to BTC and ETH can still make sense. [Read the full crypto guide →](/investment-products/cryptocurrency)",
  },
  {
    slug: "pms-aif-fees-taxation-risks",
    title: "Understanding Fees, Taxation & Risks in PMS & AIF",
    excerpt: "Fixed vs performance fees, hurdles and high-watermarks, exit loads, how PMS capital gains and AIF category taxation actually work, the risks that matter, and the questions to ask before you sign.",
    category: "Investing",
    tags: ["PMS", "AIF", "Fees", "Tax"],
    date: "2026-07-11",
    readTime: "8 min",
    author: "PlanMyCashflows Research",
    content: `
Portfolio Management Services and Alternative Investment Funds are sophisticated products, and their economics are more layered than a mutual fund's single expense ratio. Before you evaluate any strategy's returns, you need to understand three things: what you will pay, how you will be taxed, and what can go wrong. This explainer covers all three — in plain English, with no product pitch attached.

## The two levers: fixed fees and performance fees

Almost every PMS and AIF charges through some combination of two levers. The **fixed fee** (also called the management fee) is a percentage of your portfolio value charged every year regardless of performance — commonly somewhere between 1% and 2.5% in PMS, and similar in AIFs. It pays for the team, research and operations, and it compounds quietly: 2% a year for a decade consumes a surprisingly large slice of your final corpus.

The **performance fee** (or carried interest, in fund language) is a share of the profits — often 10% to 20% — that the manager earns only when returns cross an agreed threshold. Structures vary: some managers charge a lower fixed fee with a higher performance share ("1 and 20"), others a flat fixed fee with no performance component, and many offer more than one option for the same strategy. Neither structure is inherently better; a performance-heavy structure aligns incentives in good years but can tempt risk-taking, while a fixed-heavy structure is predictable but paid even in flat years.

## Hurdle rates and high-watermarks — the fine print that decides everything

Two clauses determine how much a performance fee actually costs you.

The **hurdle rate** is the return the manager must beat before any performance fee applies. With a 10% hurdle, a 16% gross year means the performance share applies only to the 6% excess — not the whole gain. Check whether the hurdle is simple or compounding, and whether there is a "catch-up" clause that lets the manager take a larger share once the hurdle is crossed.

The **high-watermark** protects you from paying twice for the same gains. If your portfolio falls from ₹1.2 crore to ₹1 crore and then recovers to ₹1.2 crore, a manager with a high-watermark earns no performance fee on the recovery — only on gains above the previous peak. Without a high-watermark, you can end up paying performance fees in recovery years even though you are no better off than before the drawdown. It is one of the first things worth checking in any fee schedule.

## Exit loads and the other line items

Beyond the headline fees, read for: **exit loads** (typically 1–3% if you withdraw within the first one to three years of a PMS, and structurally enforced lock-ins in most Category I and II AIFs), **brokerage and transaction costs** passed through to your account, custody and audit charges, and — in funds — setup or placement fees. In a PMS, all of these appear in your account statements because the securities are held in your name; in an AIF they are disclosed in the private placement memorandum. None of these are hidden if you read the schedule; most disappointment comes from not reading it.

## How a PMS is taxed: capital gains in your hands

A PMS is legally transparent: the securities sit in **your** demat account, so every buy and sell the manager executes is a taxable event for **you**, exactly as if you had traded yourself. For listed equity held over 12 months, gains are long-term and taxed at 12.5% above the annual ₹1.25 lakh exemption; gains on holdings under 12 months are short-term and taxed at 20% (rates applicable from FY 2025–26). Dividends are taxed at your slab rate.

Two practical consequences follow. First, a high-churn PMS strategy generates more short-term gains, which are taxed more heavily — after-tax returns can diverge meaningfully from the gross numbers in a factsheet. Second, you receive detailed transaction statements and must reconcile them in your return; good managers provide audited tax packs, and it is fair to ask to see a sample before onboarding.

## How AIFs are taxed: the category decides

AIF taxation follows the category system. **Category I and II AIFs enjoy statutory pass-through**: the fund pays no tax on its investment income; instead the income retains its character and is taxed in your hands — capital gains as capital gains, interest income at your slab — with the fund deducting 10% TDS for resident investors along the way. **Category III AIFs are taxed at the fund level**, frequently at the maximum marginal rate on trading income, and you receive post-tax returns.

NRIs can often reduce the tax on Indian income via the applicable Double Taxation Avoidance Agreement, claimed by submitting a Tax Residency Certificate and Form 10F. Every one of these rules can shift with a Finance Act — verify current rates with a tax adviser before committing, and read the tax section of the fund's PPM rather than relying on a sales summary.

## The risks that actually matter

**Market and concentration risk.** PMS strategies are typically concentrated — 15 to 30 stocks — which is the source of both outperformance and deeper drawdowns than a diversified fund. **Liquidity risk.** Category I and II AIFs lock capital for five to ten years; even PMS exits can take days to weeks to execute in falling markets, and exit loads may apply. **Leverage risk.** Category III funds may use leverage, which amplifies losses as efficiently as gains. **Manager risk.** You are underwriting a team and a process; key-person departures, style drift and asset bloat are all real. **Valuation risk.** Unlisted holdings in Category I/II funds are periodically valued, not continuously priced — interim NAVs are estimates. And in every case: **past performance is not indicative of future results**, and none of these products guarantees returns or capital.

## Ten questions to ask before you sign

What is the full fee schedule — fixed, performance, hurdle, catch-up, high-watermark, exit load — in writing? Is the hurdle compounding? Is the performance fee charged on realised or unrealised gains, and how often is it crystallised? What was the strategy's worst drawdown, and how long did recovery take? What is the typical portfolio turnover, and what does that imply for my short-term tax? How are the reported returns calculated (TWRR, pre- or post-fee, pre- or post-tax)? What happens if the key fund manager leaves? For an AIF: which category, what tenure, and what is the realistic distribution schedule? What conflicts of interest exist, and how is the distributor compensated? And finally — can I see the complete disclosure document and a sample tax pack before committing?

A manager comfortable answering all ten in writing is telling you something almost as valuable as the answers themselves.

## Frequently asked questions

### Is a performance fee better than a fixed fee?

Neither is inherently better. A performance-heavy structure costs less in bad years and aligns incentives in good ones, but check the hurdle and high-watermark fine print. A fixed-only structure is predictable and simple. Model both against realistic return assumptions — our [calculators](/resources/calculators) can help you see the compounding effect of fees.

### Why does the same PMS return leave investors with different after-tax outcomes?

Because PMS gains are taxed in each investor's hands: your holding periods, your other gains against the ₹1.25 lakh LTCG exemption, and your slab rate for dividends all differ. Two investors in the same strategy can legitimately report different after-tax results.

### Are AIF returns shown before or after tax?

It depends on the category. Category III funds pay tax at the fund level, so reported returns are usually post-tax; Category I and II funds are pass-through, so returns are typically pre-tax in your hands. Never compare the two without adjusting for this.

### Can fees be negotiated?

Sometimes. Larger commitments often access lower fee slabs, and many managers publish multiple fee options for the same strategy. What matters is that whatever you agree appears in the signed fee schedule — verbal assurances don't survive a drawdown.

This article is for information and education only and does not constitute investment advice, a recommendation, or an offer to invest. PMS and AIF investments are subject to market risks, including possible loss of capital; fees, taxation and structures vary by provider and change with regulation. Read all scheme-related and disclosure documents carefully and consult your own financial and tax advisers before investing.
`,
    faqs: [
      { question: "Is a performance fee better than a fixed fee?", answer: "Neither is inherently better. A performance-heavy structure costs less in bad years and aligns incentives in good ones, but check the hurdle and high-watermark fine print. A fixed-only structure is predictable and simple. Model both against realistic return assumptions before deciding." },
      { question: "Why does the same PMS return leave investors with different after-tax outcomes?", answer: "Because PMS gains are taxed in each investor's hands: your holding periods, your other gains against the ₹1.25 lakh LTCG exemption, and your slab rate for dividends all differ. Two investors in the same strategy can legitimately report different after-tax results." },
      { question: "Are AIF returns shown before or after tax?", answer: "It depends on the category. Category III funds pay tax at the fund level, so reported returns are usually post-tax; Category I and II funds are pass-through, so returns are typically pre-tax in your hands. Never compare the two without adjusting for this." },
      { question: "Can fees be negotiated?", answer: "Sometimes. Larger commitments often access lower fee slabs, and many managers publish multiple fee options for the same strategy. Whatever you agree should appear in the signed fee schedule." },
    ],
  },
  {
    slug: "nri-investing-india-2026-rulebook",
    title: "NRI investing in India: the 2026 rulebook",
    excerpt: "FEMA, RBI, SEBI, FATCA, DTAA — the rules NRIs need to know in 2026 to invest in India compliantly and tax-efficiently.",
    category: "NRI",
    tags: ["NRI", "Tax", "FEMA"],
    date: "2026-03-28",
    readTime: "15 min",
    author: "PlanMyCashflows Research",
    content: "NRIs investing in India navigate three regulatory regimes (Indian FEMA + Indian tax + resident-country tax) and one operational regime (NRO/NRE/FCNR mechanics). This guide covers the practical rulebook for 2026. [See the NRI landing page →](/for/nri)",
  },
  {
    slug: "ai-changing-wealth-management",
    title: "How AI is changing wealth management — and what it can't do",
    excerpt: "Where LLMs add real value in financial planning, where they fall short, and how the role of a human advisor is changing.",
    category: "Tools & Apps",
    tags: ["AI", "Tools"],
    date: "2026-03-15",
    readTime: "10 min",
    author: "PlanMyCashflows Research",
    content: "AI is dramatically lowering the cost of basic financial planning — what used to cost ₹50k from a planner can now be approximated in 60 seconds. But there are sharp limits to what LLMs can and should do in financial advice. [Try the AI Wealth Planner →](/ai-wealth-planner)",
  },
  {
    slug: "real-estate-vs-equity-indian-debate",
    title: "Real estate vs equity: settling the Indian investor's eternal debate",
    excerpt: "Twenty-year data, honest math, and why the answer for most Indian families is 'less real estate than you think.'",
    category: "Investing",
    tags: ["Real Estate", "Equity"],
    date: "2026-03-01",
    readTime: "13 min",
    author: "PlanMyCashflows Research",
    content: "Indian households have 60-70% of net worth in real estate. Is this rational? The 20-year data and honest math suggest most families would be better off with less real estate and more equity. [Read the real estate guide →](/investment-products/real-estate)",
  },
];

export const BLOG_CATEGORIES = [
  "Investing",
  "Planning",
  "Tax",
  "NRI",
  "Market Commentary",
  "Tools & Apps",
];
