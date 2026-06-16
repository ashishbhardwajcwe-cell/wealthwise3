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
    author: "Col Ashish Bhardwaj",
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

1. **Picking by last year's chart leader** — almost guaranteed to disappoint over 3+ years.
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
    author: "Col Ashish Bhardwaj",
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
    slug: "defence-officer-financial-independence-checklist",
    title: "The defence officer's complete financial independence checklist",
    excerpt: "A practical 12-point framework for officers transitioning to civilian life — built from interviews with 40+ retired colonels and group captains.",
    category: "Defence",
    tags: ["Defence", "Retirement", "Transition"],
    date: "2026-05-12",
    readTime: "18 min",
    author: "Col Ashish Bhardwaj",
    content: `
After interviewing 40+ retired colonels, group captains, and naval captains over the last two years, certain patterns emerge in who navigates the transition to civilian life well — and who struggles. This checklist captures the framework that the well-navigators used.

## The 12-point framework

### 1. Calculate your actual post-retirement income

Most officers underestimate the cliff. Take basic + DA in service, multiply by 50% (pension % varies by category), add commutation reduction, add any DSOP/AGIF maturity income annuitised. That's your starting number. It's often 30-50% of in-service income.

### 2. Decide commutation early

The DA-Pension Commutation decision is binary: you take a lump sum now in exchange for a reduced pension for 15 years. The IRR of commutation is roughly 8-9%, which is attractive vs FD but loses to equity over the same period. The right choice depends on your existing corpus and your ability to invest the lump sum well.

### 3. Plan healthcare beyond ECHS

ECHS is excellent but has gaps — empanelled hospital availability, certain procedures, civilian family members. Build a personal health insurance policy of ₹15-25L as a top-up while you're still in service (premiums rise sharply post-retirement).

### 4. Stop buying LIC

If you've been buying LIC endowment "as savings", convert to paid-up now or surrender (run the maths on each policy). The 4-5% return is dramatically worse than equity. Use the freed premiums for goal-aligned investments.

### 5. Build a second-career income stream

The officers who navigate retirement best have 50-70% of in-service income post-retirement, not 30-50%. The differential comes from second careers — corporate roles (PSU boards, private security, defence consulting), small businesses (resort, school, real estate brokerage), or freelance (training, consulting).

### 6. Right-size your home

The biggest mistake retiring officers make is buying or upgrading to a too-large home using AGIF/DSOP money. House size grows but income shrinks. Many regret the high maintenance costs and the inflexibility. Conservative housing decision = better retirement.

### 7. Move LIC, NSC, KVP to equity

If you have NSC/KVP at sub-7% returns and equity at 11-13% historical, the math is clear. Move at maturity (don't break for the small penalty cost). Over 20 years post-retirement, 4% additional return on ₹50L is the difference between ₹1.1 Cr and ₹2.6 Cr.

### 8. Set up an emergency fund for the first 18 months

The transition gap (pension fixation, AGIF maturity, second career setup) often takes 12-18 months. Keep ₹15-25L in FDs/liquid funds for this period. Once stabilised, redeploy to long-term assets.

### 9. Write your will

70% of officers we've worked with don't have a will. Without one, even nominated bank accounts and demat holdings can face procedural delays for the spouse. A simple ₹15,000 will from a lawyer solves this completely.

### 10. Brief your spouse

Most spouses know "Papa handles the money." When something happens to Papa, this becomes a nightmare. Brief your spouse on every account, every advisor contact, the financial logic, and what to do in the first 90 days. We help structure a "continuity binder" for this.

### 11. Set up an asset allocation that fits retirement

In-service: aggressive (80% equity makes sense). Post-retirement: shift to 50-60% equity / 40-50% debt over 3-5 years. Equity is still needed for inflation hedging over 25+ years of retirement, but the volatility tolerance shifts.

### 12. Stay away from "guaranteed" schemes

Retiring officers are heavily targeted by frauds dressed as "ex-servicemen schemes", "unlisted shares of defence companies", or "guaranteed 18% returns." Without exception, anything offering guaranteed double-digit returns is either fraud or about to collapse. The right plan doesn't need 18% returns to succeed.

## Want a personalised checklist?

The 12-point framework above is generic. Your specific situation — service category, current corpus, dependents, second-career prospects — drives the priorities. We build personalised transition plans for officers in their last 18 months of service.

[Book a call →](/contact)
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
    author: "Col Ashish Bhardwaj",
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
    title: "AIF Category I, II, III: a plain-English explanation",
    excerpt: "Cut through the jargon. What each AIF category covers, what taxation looks like, and when each makes sense in an HNI portfolio.",
    category: "Investing",
    tags: ["AIF", "HNI"],
    date: "2026-04-25",
    readTime: "11 min",
    author: "Col Ashish Bhardwaj",
    content: "AIFs (Alternative Investment Funds) are SEBI-regulated pooled vehicles for sophisticated investors — minimum ₹1 Cr. The three categories serve very different purposes. [Read the full AIF guide →](/investment-products/aif)",
  },
  {
    slug: "cryptocurrency-indian-portfolio",
    title: "How to think about cryptocurrency as part of an Indian portfolio",
    excerpt: "The 30% tax + 1% TDS reality, why allocation should be 5-10% maximum, and the case for BTC over altcoins.",
    category: "Investing",
    tags: ["Crypto", "BTC", "Tax"],
    date: "2026-04-18",
    readTime: "12 min",
    author: "Col Ashish Bhardwaj",
    content: "India has one of the world's harshest crypto tax regimes — 30% flat on gains, 1% TDS on transactions, no loss set-off. Despite this, a small allocation (5-10%) to BTC and ETH can still make sense. [Read the full crypto guide →](/investment-products/cryptocurrency)",
  },
  {
    slug: "why-i-left-military-career-to-start-wealth-firm",
    title: "Why I left a 20-year military career to start a wealth firm",
    excerpt: "After two decades in the Indian Army, the choice to leave wasn't easy. The reason was clear: the financial advice ecosystem in India is broken.",
    category: "Founder",
    tags: ["Story", "Founder"],
    date: "2026-04-10",
    readTime: "8 min",
    author: "Col Ashish Bhardwaj",
    content: "I was 38 when my wife asked me what we'd do if I died. I had vague answers and no plan. That conversation started a five-year exploration into how Indian families actually plan (or fail to plan) their wealth. By the time I left the Army, the gap I wanted to fill was obvious. [Read more on the About page →](/about)",
  },
  {
    slug: "nri-investing-india-2026-rulebook",
    title: "NRI investing in India: the 2026 rulebook",
    excerpt: "FEMA, RBI, SEBI, FATCA, DTAA — the rules NRIs need to know in 2026 to invest in India compliantly and tax-efficiently.",
    category: "NRI",
    tags: ["NRI", "Tax", "FEMA"],
    date: "2026-03-28",
    readTime: "15 min",
    author: "Col Ashish Bhardwaj",
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
    author: "Col Ashish Bhardwaj",
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
    author: "Col Ashish Bhardwaj",
    content: "Indian households have 60-70% of net worth in real estate. Is this rational? The 20-year data and honest math suggest most families would be better off with less real estate and more equity. [Read the real estate guide →](/investment-products/real-estate)",
  },
];

export const BLOG_CATEGORIES = [
  "Investing",
  "Planning",
  "Tax",
  "NRI",
  "Defence",
  "Market Commentary",
  "Tools & Apps",
  "Founder",
];
