# PlanMyCashflows — SEO Deliverables

**Compiled:** 2026-08-02
**Contents:** (1) Core Web Vitals audit for the homepage, (2) Content brief for the "PMS vs mutual fund" article at `/blog/mutual-funds-vs-pms`.

---

# 1. Core Web Vitals Audit — PageSpeed + CrUX

**URL:** https://planmycashflows.com
**Strategies tested:** Mobile, Desktop
**Data freshness:** Lighthouse lab run 2026-08-01T19:15 UTC (this session). CrUX field data: unavailable.

## CrUX Field Data (28-day rolling average)

**Not available.** Google's Chrome UX Report returned: *"No CrUX data for this origin. The site likely has insufficient Chrome traffic volume for eligibility."* This is normal for lower-traffic origins and is not an auth/config error — CrUX requires a minimum real-user sample size. Treat everything below as **lab data only** (a single simulated Lighthouse run), not real-user field data. Re-check `/seo google crux` periodically as traffic grows.

## Lighthouse Lab Scores

| Category | Mobile | Desktop |
|----------|--------|---------|
| Performance | 86/100 | 98/100 |
| Accessibility | 96/100 | 95/100 |
| Best Practices | 100/100 | 100/100 |
| SEO | 100/100 | 100/100 |

## Core Web Vitals (lab simulation)

| Metric | Mobile | Rating | Desktop | Rating |
|--------|--------|--------|---------|--------|
| LCP | 3.7 s | Needs Improvement (>2.5s) | 0.7 s | Good |
| CLS | 0.008 | Good | 0.001 | Good |
| TBT (proxy for INP) | 100 ms | Good | 80 ms | Good |
| FCP | 1.1 s | Good | 0.3 s | Good |
| Speed Index | 4.6 s | Needs Improvement | 1.2 s | Good |
| TTI | 3.7 s | — | 1.0 s | — |

Mobile LCP is the only metric outside "Good" territory, and it's the metric with the most direct ranking + conversion impact since most inbound traffic to a consumer finance site is mobile.

## Top Opportunities

| Opportunity | Mobile Savings | Desktop Savings |
|-------------|----------------|------------------|
| Reduce unused JavaScript | ~71 KiB / 300 ms | ~139 KiB / 10 ms |
| Render-blocking CSS (`4f1f08c607438cf8.css`, 13.6 KiB) | 210 ms | — |
| Legacy JavaScript (unneeded ES5 transpilation) | 11 KiB | 11 KiB |

Largest unused-JS offenders (mobile): `chunks/8478-*.js` (40 KiB wasted), `chunks/445-*.js` (32 KiB wasted). Desktop additionally flags `chunks/9670-*.js` (69 KiB wasted) — likely route-level code for `/investment-products/pms` and `/compare` being pulled into the homepage bundle.

## Accessibility / Other Findings (not SEO-scored but worth fixing)

- **Heading order broken** on both strategies: an `<h4>` (Products column, "text-sm font-semibold" style) appears out of sequence in the footer/nav area — skips heading levels, hurts screen-reader and crawler content-structure parsing.
- **Color contrast failures**: gold-on-white text at 3.73:1 (needs 4.5:1), and desktop-only WhatsApp CTA button at 1.98:1 (`#ffffff` on `#25d366`) — clearly fails WCAG AA.
- **Desktop only**: `label-content-name-mismatch` on 2 elements (visible button/link text doesn't match accessible name).
- **Missing security headers** (informational insights, not scored): no CSP, no COOP, no Trusted Types directive. Doesn't affect Lighthouse Best Practices score in this run but is worth closing given the site handles indicative pricing data.

## Recommendations

**1. [High] Cut mobile LCP from 3.7s toward <2.5s**
- *Why:* Mobile carries the bulk of organic traffic; LCP is a ranking factor and this is the only metric outside "Good."
- *How:* Address the render-blocking CSS (defer/inline critical styles, 210ms win) and trim the 71 KiB of unused JS shipped to the homepage — likely route code from `/compare` or `/investment-products/pms` bleeding into the shared bundle. Check code-splitting boundaries.
- *Falsifiable check:* Re-run `/seo google pagespeed` after deploy — LCP should drop below 2.5s (lab) and eventually show "Good" once CrUX has enough traffic to report.

**2. [Medium] Fix heading order and color contrast**
- *Why:* Both fail on every page load (mobile + desktop), affecting accessibility and content-structure signals search engines use.
- *How:* Change the footer `<h4>` to the correct sequential level; darken the gold text and the WhatsApp CTA button background/foreground pairing to meet 4.5:1 (text) / 3:1 (large text, UI components).
- *Falsifiable check:* Lighthouse accessibility score should rise from 96/95 toward 100; `color-contrast` and `heading-order` audits should flip to pass.

**3. [Low] Trim legacy JS polyfills**
- *Why:* 11 KiB wasted on both strategies transpiling for browsers you likely don't need to support.
- *How:* Check the build target (browserslist/tsconfig) and drop unnecessary ES5 transforms.
- *Falsifiable check:* `legacy-javascript-insight` savings should drop to near 0 KiB.

**4. [Info] CrUX ineligible — no action, just monitor**
- *Leading indicator:* Once organic traffic grows, `/seo google crux` will start returning p75 field data. Re-run monthly; field data (not lab data) is what actually reflects real users and what Google uses for the CWV ranking signal.

---
*Generated 2026-08-02 via `/seo google pagespeed https://planmycashflows.com`.*
*CrUX data updates daily ~04:00 UTC when eligible; 28-day rolling average.*
*INP replaced FID as the responsiveness Core Web Vital on March 12, 2024 — TBT is used above as the closest lab proxy.*

---

# 2. Content Brief: PMS vs Mutual Fund

**Mode: Improve existing page.** This topic already lives at `/blog/mutual-funds-vs-pms` (449 words, published 2026-05-18), linked from the homepage, the PMS product page, and the Mutual Funds product page. Building a new page would split link equity three ways — everything below edits that page in place.

### Search Intent

Commercial-investigation intent — searchers know what both products are and are deciding which fits their money. Google rewards a scannable comparison table near the top plus a decision framework and FAQ further down. Audience: Indian investors at/near the ₹50L PMS eligibility line who already have a mutual fund portfolio.

### Competitor Analysis

| # | URL | Key H2 Sections | Est. Words | Score | Main Gap |
|---|-----|-----------------|------------|-------|----------|
| 1 | groww.in/blog/pms-vs-mutual-funds-investment | Comparison table, investor-type breakdown, risk-appetite breakdown, allocation guidance | ~4,300 | 32/40 | No worked tax-drag example; generic, not manager-evaluation focused |
| 2 | gripinvest.in/blog/pms-vs-mutual-fund | Comparison table, worked fee example, suitability checklist, FAQs | ~3,650 | 29/40 | Grip sells bonds not PMS/MF — lower topical authority |
| 3 | anandrathipms.com/blog/mutual-funds-vs-pms.php | Comparison table, taxation, "switch to PMS" section, FAQs | ~2,300 | 25/40 | Published by a PMS seller — sales framing, not neutral |
| 4 | shriramamc.in/learn/which-is-best-pms-or-mutual-funds | Comparison table, decision framework, FAQs | ~2,300 | 23/40 | AMC-published, plugs own funds mid-article; thin tax coverage |
| 5 | zerodhafundhouse.com/blog/pms-vs-mutual-funds | 2 tables, suitability guidance | ~1,800 | 24/40 | **No taxation section at all** on a query where tax is the #1 economic difference |

### Content Gaps and Opportunities

**Topic gaps (nobody covers this):**
- A live, working comparison tool. Every competitor is static text/tables. This site already has one (`/compare`) and a real APMI-sourced PMS strategy explorer (`/investment-products/pms`) — no competitor can link a reader straight into a working tool mid-article.
- Neutral authorship. Anand Rathi sells PMS; Shriram sells mutual funds; Groww and Zerodha sell both. Every top-5 result has a commercial incentive pointing one direction. PlanMyCashflows doesn't sell either product — it's genuinely positioned to say "start with mutual funds first" the way the current draft already does.

**Depth gaps:**
- **Word count**: current page is 449 words against a competitor average of ~2,980. This is the largest single reason it's losing to longer, more structured pages.
- **No comparison table.** All 5 scored competitors have at least one; ours is prose-only. This is the single highest-priority add — it's also what AI Overviews and answer engines pull from first for "X vs Y" queries.
- **No taxation numbers.** Current page says PMS is "more tax-efficient" but never states the actual mechanism (per-transaction capital gains in your own demat vs. tax-deferred-until-redemption for MF units) or current rates. 3 of 5 competitors cover this; it's the single biggest economic difference between the two products and readers will bounce to a competitor that states the number.
- **No fee comparison with real ranges.** Grip's worked ₹58.9L-vs-₹57.3L example is a strong format to match (with our own numbers, not theirs).

**Quality gaps:**
- No FAQ-style Q&A block. 3 of 5 competitors have one; it's useful for scanability and for AI-answer citability (not for Google's retired FAQ rich result — see note below).
- No links into the site's own live PMS data or fee calculator, despite both existing. This is a missed differentiation opportunity, not a competitor weakness — it's our own gap.

### Winning Outline

**H1:** PMS vs Mutual Fund in India: Which Is Right for You?
**URL Slug:** `/blog/mutual-funds-vs-pms` — **keep unchanged.** It's already linked from `lib/home-content.ts`, `lib/product-data.ts` (×2 related-post entries), and self-referenced from `lib/blog-data.ts`'s AIF post. Changing the slug breaks four internal links and discards whatever authority the URL has accumulated since 2026-05-18. Only the on-page H1/title/copy need updating, not the URL.
**Target Word Count:** ~1,650–1,800 words (currently 449). Note: this deliberately does **not** match the ~2,980-word competitor average. Every other post on this site runs 450–900 words (e.g. `complete-guide-to-pms-india-2026` is 866 words, `ltcg-125-lakh-exemption` is 697) — matching Groww's 4,300-word format would break house voice for one page. ~1,700 words is enough to close every gap above (table, tax numbers, fees, FAQ) while staying recognisably in the site's concise, opinionated style rather than becoming a generic SEO listicle.

---

**Intro** (KEEP, strengthen) — ~120 words
Keep the existing "Should I stop my SIPs and move to PMS?" hook — it's a strong, specific opening no competitor has. Work "PMS vs mutual fund" naturally into the first 100 words (it currently isn't there verbatim). Add one sentence stating the piece is independent — PlanMyCashflows doesn't sell either product — as an E-E-A-T/trust signal that no competitor can credibly make.
*Keyword: primary keyword once, in the first paragraph.*

**NEW — "PMS vs mutual fund at a glance" (comparison table)** — ~90 words + table — **FS target**
Add immediately after the intro, before any prose. 8–9 rows: Ownership structure, Minimum investment, Regulator/registration, Typical fee structure, Tax trigger, Customisation, Diversification, Liquidity, Best suited for. This is the #1 priority add — every scored competitor has one and it's what gets pulled into featured snippets and AI answer summaries for "X vs Y" queries.
*Keyword: H2 should contain "PMS vs mutual fund" near-verbatim.*

**"The core difference"** (KEEP, trim slightly) — ~100 words
Keep as-is; it's a clean, accurate two-bullet definition. Trim any content that now duplicates the new table.

**"When mutual funds win"** (KEEP, strengthen) — ~180 words
Keep all 5 existing points. Add a 6th: liquidity/redemption timeline (T+2/3 for MF vs. PMS's slower, provider-dependent exits) — every competitor with a comparison table flags this and the current draft doesn't mention it at all.

**"When PMS adds value"** (KEEP, strengthen) — ~180 words
Keep all 4 existing points. Do not add specific alpha/return numbers here without an `asOfDate` and `source` — if any performance claim is added, it must headline alpha-over-benchmark, not raw CAGR, and 1M/3M/6M figures (if cited) must be labelled absolute and never headlined, per house data rules. Safest edit: keep this section qualitative, as it already is.

**NEW — "Taxation: the difference that compounds"** — ~220 words
State the mechanism plainly: PMS securities sit in your own demat, so every sale is a separate capital-gains event; MF unit redemption is the only taxable event, and internal fund churn doesn't hit your tax bill. State current rates (STCG/LTCG on listed equity, and the ₹1.25L LTCG exemption) with the effective date cited. Include one small worked illustration of the tax-drag difference over a multi-year holding period — label it explicitly as a hypothetical illustration, not a projected or actual scheme return. Close with a link to the existing deep-dive (`/blog/pms-aif-fees-taxation-risks`) rather than duplicating its full detail.
*Keyword: secondary keyword "PMS taxation vs mutual fund taxation" in the H2.*

**NEW — "Fees: what you're actually paying"** — ~150 words
State typical ranges (MF Direct plan expense ratio vs. PMS fixed + performance fee above hurdle) and link to the existing `/resources/calculators/pms-fees` calculator so the reader can run their own numbers instead of just reading ours.
*Keyword: secondary keyword "PMS fees vs mutual fund expense ratio."*

**"The typical HNI blend that works"** (KEEP, strengthen) — ~160 words
Keep the existing 50-60/20-30/10-20 framework. Add one sentence explicitly labelling it as an illustrative framework, not a recommendation, and one line pointing readers who aren't at ₹50L+ yet to `/investment-products/mutual-funds`.

**NEW — "Who should choose which, at a glance"** — ~130 words
Three short bullet groups instead of a full 5-persona breakdown (keeps this shorter than Groww/Bajaj's version, matching house length): (1) under ₹50L or early-career → mutual funds only; (2) ₹50L–5Cr with an existing MF base → blend; (3) family office / business owner already running PMS or AIF relationships → PMS-heavy plus AIF diversification, link to `/blog/aif-category-1-2-3-explanation`.

**"The decision framework"** (KEEP, no change) — ~120 words
Keep the 5-question framework as-is — it's the strongest, most specific section on the page and nothing in competitor content beats it.

**NEW — FAQ block** — ~150 words, 2–3 Q&As
Suggested questions: "PMS or mutual funds — which is better?" (a version of this already exists as unused FAQ copy in `lib/product-data.ts:48-50` — reuse/adapt it), "Can I hold both PMS and mutual funds in the same portfolio?", "Is PMS riskier than mutual funds?" Present as plain reader Q&A for scanability and AI-answer citability — **do not** wrap this in FAQPage schema. Google retired FAQ rich results for all sites on 2026-05-07, so there's no SERP snippet benefit to claim, and none should be implied to the reader or in any schema markup added.

**Closing CTA** (KEEP, unchanged) — ~40 words
Keep the existing AI Wealth Planner link as-is.

### Recommended Meta Tags

**Title** (52 chars)
PMS vs Mutual Fund in India: Which Is Right for You?

**Meta Description** (131 chars)
PMS vs mutual fund, compared: minimum investment, fees, taxation, and a 5-question framework for which one — or a blend — fits you.

*Note on brand suffix:* every other post in `lib/blog-data.ts` omits a "| PlanMyCashflows" suffix on its title (e.g. "The complete guide to PMS in India for 2026"), and the blog `[slug]` page renders the title field directly with no override. Kept consistent with that pattern rather than the generic "brand name last" rule — matches actual site convention.

### Unique Angle and Information Gain

Two things no competitor in the top 5 can credibly offer: (1) neutral authorship — every scored competitor sells PMS, mutual funds, or both, and it shows in their framing (Anand Rathi's "switch to PMS" section, Shriram's mid-article AMC plug); PlanMyCashflows sells neither, so "start with mutual funds first" is a genuinely disinterested recommendation, not a hedge. (2) A live path from the article into real tools — the comparison table links straight into the working `/compare` tool and the APMI-sourced `/investment-products/pms` strategy explorer, and the fee section links into a working fee calculator. No competitor page connects its comparison prose to an actual interactive tool; they're all static.

### E-E-A-T Requirements

- Byline stays "PlanMyCashflows Research" (existing convention across the blog) — do not name any individual founder or the parent entity, per house editorial rules.
- Add a "last updated" date distinct from the original publish date once edited, so readers and crawlers can see it's current.
- Cite the effective date for any tax rate mentioned (STCG/LTCG rates, the ₹1.25L LTCG exemption) — tax law changes with Finance Acts, so an undated rate claim ages badly.
- Any performance or return figure added must carry an `asOfDate` and a named source (APMI for PMS data) — no PMS figures sourced from PMS Bazaar, PMS AIF World, or any aggregator PDF, per house data rules. If no properly sourced figure is available for a claim, keep the claim qualitative instead.
- No FAQPage schema (see FAQ section above) — content-only Q&A.

### Internal Linking Opportunities

- **"PMS vs mutual fund at a glance" table →** `/compare` — anchor: "compare specific strategies side-by-side"
- **Taxation section →** `/blog/pms-aif-fees-taxation-risks` — anchor: "the full breakdown of PMS and AIF taxation"
- **Fees section →** `/resources/calculators/pms-fees` — anchor: "run the PMS fee calculator"
- **"Who should choose which" (family office bullet) →** `/blog/aif-category-1-2-3-explanation` — anchor: "AIF categories explained"
- **HNI blend section (non-HNI readers) →** `/investment-products/mutual-funds` — anchor: "the mutual funds guide"

This page is a spoke, not a hub — it links out to the deeper PMS/AIF/fee content rather than trying to contain it, and continues receiving inbound links from the PMS and Mutual Funds product pages and the homepage as it already does today.
