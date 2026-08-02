# auriswealth.co — Marketing Website Build Prompt

> **How to use this file:** Save this as `CLAUDE.md` in the root of a NEW repository called `auriswealth-marketing` (separate from your WealthWise app repo). This document is for Claude Code to build the public-facing marketing website only. The actual app (login-gated WealthWise) lives in a separate repo with its own CLAUDE.md.

---

## 0. Project context

**Product:** auriswealth.co — the marketing and education website for Auris Wealth (run by Auris Pvt Ltd, India). Public-facing, no authentication required for browsing. Goal: convert visitors into WealthWise app users and Auris advisory clients.

**Distinction from the app:** 
- `auriswealth.co` (this site) = marketing, education, blog, lead gen, free AI wealth planner preview
- `wealth.auris8.com` (separate repo) = the logged-in WealthWise application with full portfolio tracking, harvesting engine, etc.

**Audience:** 
- Primary: Indian HNIs and salaried professionals
- Secondary: NRIs in US, UK, Gulf
- Tertiary: Defence officers (US, UK, India) — Ashish's natural network
- Global expansion ready from day one — every page should make sense to a Dubai expat or a US viewer who lands from a YouTube video

**Founder:** Col (Retd.) Ashish Bhardwaj. The site must feel professional, military-precise, and trustworthy — not a typical fintech startup with neon gradients.

---

## 1. Mission

Build a fast, beautiful, content-heavy marketing website that serves three jobs:

1. **Education** — explain every major investment vehicle (mutual funds, PMS, AIF, unlisted shares, crypto, stocks, insurance, real estate, gold) in a way that a smart professional with no finance background understands
2. **Trust building** — establish Auris and Ashish as credible authorities in wealth management
3. **Conversion** — get visitors to (a) try the AI wealth planner, (b) sign up for the WealthWise app, (c) book a consultation via Topmate

The aspirational benchmark for design quality: Stripe.com (clean, confident, content-forward), Wealthfront.com (calm, professional, data-led), Range.com (modern, premium feel).

---

## 2. Tech stack

**Framework:** Next.js 15+ with App Router and TypeScript
**Styling:** Tailwind CSS v4 + shadcn/ui components
**Hosting:** Netlify (existing account)
**CMS for blog:** Sanity.io (free tier, great DX) OR Markdown files in repo
**Analytics:** Google Analytics G-BNT8QF03F6 + Plausible (privacy-friendly secondary)
**Forms:** Netlify Forms (built-in) for contact, newsletter, Topmate bookings
**AI:** Claude API (`claude-sonnet-4-20250514`) via Next.js API routes (server-side, key never exposed)
**Email:** Resend or Brevo for transactional + newsletter
**Performance budget:** Lighthouse score >90 on all four metrics on every page

Why Next.js over the current Vite setup: marketing site needs SEO (server-side rendering), and Next.js wins on every benchmark for this. The WealthWise app stays on Vite — different repo, different needs.

---

## 3. Brand identity (apply consistently)

- **Name:** Auris Wealth (full) or AurisWealth (web-friendly)
- **Tagline:** "Disciplined wealth management for global Indians and military families" (or variant — A/B test)
- **Logo:** Icon-only Auris mark in navy + gold (already designed)
- **Colours:**
  - Primary navy: `#0B2447`
  - Accent gold: `#FFB800`
  - Off-white background: `#FAF9F5`
  - Charcoal text: `#1A1A1A`
  - Subtle gold tint background for highlights: `#FFF8E7`
- **Typography:**
  - Display: Playfair Display (serif, weights 500, 700) — used sparingly on hero headlines
  - Body: Inter (sans-serif, weights 400, 500, 600) — used everywhere else
- **Tone:** Calm, confident, military-precise. No exclamation marks. No "amazing!" or "revolutionary." Use understated language: "thoughtful," "considered," "rigorous," "disciplined."
- **Voice:** First-person plural ("we") for company; first-person singular for founder posts ("I'm Ashish")

---

## 4. Site architecture (every page in the site)

```
/
├── /                              (Home — the hero page)
├── /investment-products/
│   ├── /mutual-funds              (educational deep-dive)
│   ├── /pms                       (Portfolio Management Services)
│   ├── /aif                       (Alternative Investment Funds)
│   ├── /unlisted-shares           (pre-IPO + unlisted equity)
│   ├── /cryptocurrency            (crypto, with India tax context)
│   ├── /direct-equity             (stocks)
│   ├── /insurance                 (life, health, term)
│   ├── /real-estate               (residential, commercial, REITs)
│   └── /gold                      (physical, ETF, SGB)
├── /ai-wealth-planner             (Free AI planner preview — high conversion page)
├── /wealthwise                    (The product page — what the app does)
├── /for/
│   ├── /defence-officers          (defence officer landing page)
│   ├── /nri                       (NRI / global Indians landing page)
│   ├── /hni                       (high-net-worth individuals)
│   └── /professionals             (salaried, mid-career)
├── /blog/                         (the blog — content marketing engine)
│   ├── /[slug]                    (individual blog post)
│   └── /category/[category]       (category archive)
├── /about/                        (founder story, team, mission)
├── /contact/                      (contact form + Topmate embed)
├── /pricing/                      (subscription tiers)
├── /resources/
│   ├── /glossary                  (finance glossary for SEO long-tail)
│   ├── /calculators               (SIP, lumpsum, retirement, FIRE calculators)
│   └── /downloads                 (free PDFs — financial planning checklist, etc.)
├── /legal/
│   ├── /privacy
│   ├── /terms
│   ├── /disclaimers
│   ├── /sebi-compliance
│   └── /grievance-redressal
└── /sitemap.xml + /robots.txt
```

---

## 5. Page-by-page specification

### 5.1 Home page (`/`)

**The hero section (above the fold):**

- Headline (Playfair Display, large): *"Wealth that compounds. Plans that hold under fire."*
- Sub-headline (Inter, medium): *"AI-powered financial planning and global wealth management — built for professionals, families, and military officers who want clarity."*
- Two CTAs side by side:
  - Primary: "Try the AI Wealth Planner" (gold button, links to `/ai-wealth-planner`)
  - Secondary: "Talk to Ashish" (outline button, links to Topmate)
- Background: subtle navy-to-off-white gradient, no images yet — let typography lead
- Trust strip below: small text "Run by Auris Pvt Ltd (CIN: U70200HR2026PTC141922) | NISM-certified | DPDP compliant"

**Section 2 — "What we cover":**
Title: *"Every major investment vehicle, explained"*
A grid of 9 cards (3x3 on desktop, 1 column on mobile), each linking to the relevant `/investment-products/` page. Each card has:
- Icon (Lucide React)
- Product name
- One-line description
- Subtle hover state with the brand gold

The 9 products: Mutual Funds, PMS, AIF, Unlisted Shares, Cryptocurrency, Direct Equity, Insurance, Real Estate, Gold.

**Section 3 — "The AI Wealth Planner" (hero feature):**

A large section showcasing the AI planner with:
- Left side: copy explaining the planner (3-4 paragraphs)
- Right side: animated screenshot/mockup of the planner in action OR an interactive embedded preview that lets visitors input 3 simple numbers (current age, savings, monthly income) and see a sample projection

**This is the conversion engine.** Build it as a Next.js client component that:
1. Takes 3 inputs (age, current savings in ₹/$, monthly income)
2. Calls a Claude API route on the server
3. Returns a personalised 3-paragraph "financial snapshot" — what you're on track for, what you could improve, what the next step looks like
4. Below the snapshot: "Get the full plan in 60 seconds" CTA → routes to `/ai-wealth-planner` for full version

**Section 4 — "How it works" (the comparison graph):**

A visual section showing the journey from "scattered investments" to "unified planning" — use a custom SVG diagram showing:
- Left: chaos of disconnected accounts (small icons of various banks, brokers, AMCs)
- Center: WealthWise as the unifying layer
- Right: a single coherent plan with goals achieved

**Section 5 — "Who we serve":**
4 audience-specific cards linking to `/for/defence-officers`, `/for/nri`, `/for/hni`, `/for/professionals`.

**Section 6 — "Featured content" (blog teaser):**
3 most recent or featured blog posts with thumbnails, titles, excerpts.

**Section 7 — "Our founder":**
Short bio of Col Ashish Bhardwaj. Photo (uniform photo + civilian photo side by side telling the transition story). Link to `/about`.

**Section 8 — "Trust signals":**
- Statistics (with disclaimer that these are aspirational/illustrative if not yet real): clients served, total AUM advised, years of combined experience
- Press mentions (when you have them — placeholder for now)
- Certifications: NISM, AMFI registration (when ARN comes), SEBI RIA (when granted)

**Section 9 — Final CTA:**
Big section with: *"Ready to build your wealth plan?"* + the two CTAs.

**Footer:**
- 4 columns: Products, For, Resources, Company
- Newsletter signup
- Social links (LinkedIn, YouTube, Twitter, Instagram, Facebook)
- Bottom strip: copyright, CIN, legal links, full disclaimer

---

### 5.2 Investment product pages

Each of the 9 product pages follows the SAME template structure but with product-specific content. This is critical for SEO (consistent structure helps Google).

**Template structure for `/investment-products/[product]`:**

1. **Hero**: Product name + one-line summary + "is it right for you?" CTA scrolling to section 6
2. **What it is**: 2-3 paragraphs in plain language, no jargon
3. **Visual explainer**: Custom SVG/illustration showing how the product works
4. **Key facts table**: Minimum investment, typical returns, lock-in, tax treatment, who regulates it, risk level
5. **Pros and cons**: Two columns, 5 bullets each
6. **Who should consider this**: Specific profile descriptions ("Consider PMS if you have ₹50L+ to invest, want personalisation, and can stomach short-term volatility")
7. **Common mistakes**: 4-5 things people get wrong with this product
8. **How Auris helps**: Brief section on how WealthWise + advisory work with this product
9. **Frequently asked questions**: 6-8 FAQs with structured data markup for SEO rich snippets
10. **Related content**: Links to 3 blog posts on this topic
11. **CTA**: "Get a personalised plan for this product"

**Specific content focus for each product page:**

**Mutual Funds (`/investment-products/mutual-funds`):**
- Cover: equity, debt, hybrid, ELSS, gold, international
- Indian tax context: STCG 20%, LTCG 12.5% above ₹1.25L
- Direct vs Regular plans (this alone drives huge SEO traffic)
- SIP vs Lumpsum
- Active vs Passive (index funds, ETFs)

**PMS (`/investment-products/pms`):**
- Min ₹50 lakhs in India
- How it differs from MF (direct ownership in Demat)
- Major PMS strategies (multicap, smallcap, thematic)
- Cost structure (fixed + performance fees)
- How to evaluate a PMS manager (track record, AUM, style)

**AIF (`/investment-products/aif`):**
- Categories I, II, III explained simply
- Min ₹1 crore
- Examples: PE funds, VC funds, long-short funds, real estate funds
- Liquidity and lock-in explanations
- When AIFs make sense vs PMS vs MF

**Unlisted Shares (`/investment-products/unlisted-shares`):**
- What pre-IPO investing is
- Platforms in India (UnlistedArena, Stockify, Precize)
- Notable examples (without recommendation language) — companies that went IPO
- Risks (illiquidity, valuation opacity)
- Tax treatment (LTCG after 24 months, before 24 months = STCG at slab rate)

**Cryptocurrency (`/investment-products/cryptocurrency`):**
- BTC, ETH, top altcoins
- India tax: 30% flat + 1% TDS, no loss set-off
- US tax for NRIs (long-term vs short-term)
- Exchanges: India (CoinDCX, CoinSwitch), Global (Coinbase, Kraken)
- Wallet security basics
- Allocation guidance (5-10% max for most investors)

**Direct Equity (`/investment-products/direct-equity`):**
- NSE vs BSE
- Demat account basics
- Long-term investing vs trading
- How to evaluate a stock (PE, PB, ROE, debt)
- Why most retail investors underperform

**Insurance (`/investment-products/insurance`):**
- Term vs endowment vs ULIP (advocate term, explain why endowment is usually bad)
- Health insurance fundamentals
- How much cover do you need (10x annual income for term, 15-25L for health)
- Riders that are worth it

**Real Estate (`/investment-products/real-estate`):**
- Residential vs commercial
- REITs and InvITs
- Tax treatment (rental income, capital gains)
- Why real estate is often over-allocated in Indian portfolios
- Liquidity reality check

**Gold (`/investment-products/gold`):**
- Physical vs digital gold vs SGB vs gold ETF vs gold MF
- SGB benefits (2.5% interest + capital appreciation, exempt LTCG if held to maturity)
- Why allocation matters (5-10% as portfolio insurance)

---

### 5.3 The AI Wealth Planner page (`/ai-wealth-planner`) — the conversion engine

**This is the most important page on the site.** It's the free version of the WealthWise app's planner — generous enough to be useful, focused enough to drive signups for the full app.

**The interactive planner form:**

Multi-step wizard with these steps (build with React Hook Form):

**Step 1 — About you:**
- Age (slider 25-75)
- Country of residence (dropdown: India, US, UK, UAE, Singapore, other)
- Current monthly income (in user's local currency)
- Number of dependents

**Step 2 — Your current situation:**
- Total current savings/investments (single number, simplified)
- Total monthly expenses
- Any major debts (Y/N + amount)
- Major asset (own home / no)

**Step 3 — Your goals:**
- Target retirement age (slider)
- One specific big goal (text input: "kid's education in 2032," "buy a home by 2030," etc.)
- Risk tolerance (3 options: conservative, balanced, aggressive)

**Step 4 — Output:**
- Loading state ("Analysing your situation...")
- Server-side call to Claude API with structured prompt
- Returns: a 4-section snapshot
  1. **Where you stand**: 2-paragraph honest assessment
  2. **Your trajectory**: projected net worth at retirement based on current path (one number + 30-year line chart using Recharts)
  3. **What changes things**: 3 specific levers (save more, invest differently, optimise tax) with quantified impact
  4. **Your next step**: a single clear recommendation
- **At the end**: "This is the surface. The full WealthWise plan covers 16 sections including SWOT, tax harvesting, insurance gap, retirement scenarios, and detailed goal planning. Try it free for 14 days." → CTA to wealth.auris8.com/signup

**The Claude API prompt for this page (build into the API route):**

```typescript
// /app/api/wealth-snapshot/route.ts
const systemPrompt = `You are a SEBI-compliant financial planning assistant
generating a brief wealth snapshot for a global investor. Use ONLY the data
provided. Output strictly as JSON with this structure:
{
  "where_you_stand": "2-paragraph honest assessment, max 120 words",
  "trajectory_summary": "1 paragraph on projected net worth at retirement",
  "projected_corpus": <number in INR or USD>,
  "yearly_projection": [{year: 2026, value: X}, ...],
  "three_levers": [{lever: "...", impact: "..."}, {...}, {...}],
  "next_step": "1 sentence specific recommendation"
}

CRITICAL RULES:
- Do NOT recommend specific securities, funds, or companies
- Do NOT promise guaranteed returns — use "could," "may," "historically"
- Use educational framing: "you may wish to consider," "one approach is"
- Account for the user's country: India context for INR users, US context for USD,
  UAE context for AED, etc.
- Returns assumption: 10-12% for equity, 6-7% for debt — clearly mention these
  are assumptions, not guarantees
- Inflation assumption: 6% for India, 3% for US/UK, 2.5% for UAE
- Keep tone calm, military-precise, no exclamation marks`;
```

**SEO note for this page:** This page targets the search "free financial plan online" and "AI wealth planner" — high-intent queries. Optimise title, meta description, H1, and schema markup for these.

---

### 5.4 The WealthWise product page (`/wealthwise`)

This page sells the full app. Structure:

1. **Hero**: "The wealth platform that thinks alongside you" + screenshot of the app
2. **Three feature pillars**: 
   - "See everything you own" (portfolio aggregator)
   - "Know what you should do next" (AI planner + harvesting engine)
   - "Plan for any future" (goal planning + scenarios)
3. **Visual product tour**: 6 screenshots with captions
4. **Pricing teaser**: link to `/pricing`
5. **Comparison table**: vs Excel, vs traditional advisor, vs other apps (Kuvera, INDmoney) — highlight WealthWise's unique features
6. **Founder note**: 3-paragraph note from Ashish on why he built it
7. **CTA**: "Start your 14-day free trial"

---

### 5.5 Audience landing pages

**`/for/defence-officers`:**
- Hero: "Wealth strategy for officers in transition" + photo of Ashish in uniform
- Sections: pension planning, DSOP optimisation, post-service career, family financial planning
- Testimonials (when available)
- Specific calculators: pension projector, DSOP corpus, OROP impact
- CTA: "Book a call with a fellow officer" → Topmate

**`/for/nri`:**
- Hero: "Wealth across borders, planned in one place"
- Sections: India tax for NRIs, repatriation, dual-country planning, NRE/NRO/FCNR, US 401(k) and IRA basics
- Specific calculators: FX impact, cross-border tax

**`/for/hni`:**
- Hero: "When the spreadsheet stops being enough"
- Sections: PMS strategy, AIF allocation, family office services, estate planning
- "Concierge advisory" CTA → direct contact form for Ashish

**`/for/professionals`:**
- Hero: "From your first SIP to your first crore"
- Sections: starting young, salary optimisation, tax planning, first home, kids' future

Each landing page must have its own unique value proposition. Don't just template-swap. Each is its own conversion engine.

---

### 5.6 Blog (`/blog`)

**Architecture:**
- Sanity.io headless CMS (or Markdown in `/content/blog/`)
- Categories: Investing, Planning, Tax, NRI, Defence, Market Commentary, Tools & Apps
- Tags: free-form
- Author profiles (Ashish + future team members)
- Featured image, OG image, structured data for articles

**Blog post template:**
- Hero with title, author, date, read time
- Hero image
- Table of contents (auto-generated from H2s) for posts over 1500 words
- Article body with prose, images, embedded calculators, callout boxes
- Author bio at bottom
- 3 related posts
- Newsletter signup
- Disclaimer footer

**Initial posts to seed (write these in Sanity before launch):**

1. "The complete guide to PMS in India for 2026"
2. "Mutual funds vs PMS: which is right for you?"
3. "AIF Category I, II, III: a plain-English explanation"
4. "How to think about cryptocurrency as part of an Indian portfolio"
5. "Why I left a 20-year military career to start a wealth firm" (founder story)
6. "The defence officer's complete financial independence checklist"
7. "NRI investing in India: the 2026 rulebook"
8. "How AI is changing wealth management — and what it can't do"
9. "The ₹1.25 lakh LTCG exemption: the most under-used tax tool in India"
10. "Real estate vs equity: settling the Indian investor's eternal debate"

Each post: 1,500-3,000 words, SEO-optimised, with a CTA to either the AI planner or WealthWise app.

---

### 5.7 About page (`/about`)

- Founder story (Ashish): the military-to-finance journey
- Team: co-founder Diganta Das, consultant, future hires
- Mission statement
- Company facts: Auris Pvt Ltd, CIN, registered office, contact
- Press kit download link
- Photo gallery (Ashish in uniform, current professional photos, office space)

---

### 5.8 Contact page (`/contact`)

- Embedded Topmate widget (auris8 profile)
- Contact form (name, email, phone, message, what you're looking for dropdown) → Netlify Forms
- Office address
- Email: hello@auriswealth.co
- Phone (if you choose to publish)
- WhatsApp Business link
- Social media links

---

### 5.9 Pricing page (`/pricing`)

Show the 4 tiers from the WealthWise app spec (Free, Premium, HNI, Enterprise). Beautiful comparison table. Annual vs monthly toggle for premium. Clear CTAs per tier.

---

### 5.10 Resources

**Calculators (`/resources/calculators`):**
Each as a standalone interactive page:
- SIP calculator
- Lumpsum calculator
- Retirement corpus calculator
- FIRE calculator (financial independence)
- Tax harvesting estimator
- NRI tax calculator
- EMI calculator (for context, not lending)

Each calculator: clean input form, instant calculation, downloadable PDF result, CTA to AI planner for deeper analysis.

**Glossary (`/resources/glossary`):**
An alphabetical glossary of 100+ finance terms. SEO gold — captures long-tail searches like "what is AIF Cat III" or "what is LTCG."

Each term: short definition (2-3 sentences), example, link to related deep-dive content.

**Downloads (`/resources/downloads`):**
Free PDF downloads (gated by email signup):
- "The 15-minute financial health check for professionals"
- "The defence officer's transition financial planner"
- "NRI investing in India: 2026 cheat sheet"
- "PMS empanelment: how to evaluate a manager"

Each download = email capture = nurture sequence.

---

### 5.11 Legal pages

All legal pages should be drafted with help of a CA / lawyer but the templates should exist:

- `/legal/privacy` — DPDP-compliant privacy policy
- `/legal/terms` — terms of service
- `/legal/disclaimers` — full investment disclaimer
- `/legal/sebi-compliance` — SEBI-mandated disclosures (especially for RIA when licensed)
- `/legal/grievance-redressal` — SEBI requires this for any regulated entity

---

## 6. Components to build (reusable)

Create these as `/components/` in the Next.js project:

- `<Header />` — navigation, mobile menu, CTA button
- `<Footer />` — multi-column footer
- `<Hero />` — reusable hero section template
- `<FeatureGrid />` — 3x3 grid of feature cards
- `<ProductCard />` — single product card with icon, title, description
- `<CTASection />` — final call-to-action section
- `<TestimonialCarousel />` — when testimonials exist
- `<BlogCard />` — blog post preview card
- `<CalculatorWrapper />` — base for all calculators (input form, result display, PDF export)
- `<DisclaimerBanner />` — appears on every product page
- `<ChatWithAshish />` — Topmate widget wrapper
- `<NewsletterSignup />` — email capture
- `<TableOfContents />` — auto-generated TOC for blog posts
- `<StructuredData />` — JSON-LD schema for SEO

---

## 7. Performance and SEO requirements

**Performance:**
- Every page Lighthouse score >90 on Performance, Accessibility, Best Practices, SEO
- LCP < 2.5s
- CLS < 0.1
- All images via Next.js `<Image />` with WebP
- Fonts loaded with `next/font` (no FOUT)
- Tailwind purged in production

**SEO essentials per page:**
- Unique title tag (50-60 chars)
- Unique meta description (140-160 chars)
- Open Graph image (1200x630, custom per page when possible)
- Twitter card meta
- Canonical URL
- Structured data (Article schema for blog, FAQ schema for product pages, Organisation schema sitewide)
- Sitemap auto-generated (`next-sitemap`)
- Robots.txt configured
- Schema.org markup for breadcrumbs

**Content SEO:**
- Every page has a clear H1 (only one per page)
- H2/H3 hierarchy is logical and uses target keywords naturally
- Internal linking strategy: every blog post links to relevant product pages and other blog posts
- External links to authoritative sources (SEBI, RBI, NISM, AMFI) — establishes trust + helps SEO

---

## 8. Multi-currency and i18n preparation

Build the site so a Dubai-based user lands and the experience makes sense.

- Detect user's likely currency from IP (use a free service like ipapi.co at build time or Edge Function)
- All monetary values stored as raw numbers in components; render with a `<Currency value={X} />` component that respects user's currency
- Default currency: INR (Indian audience is largest)
- Toggle visible in header: ₹ | $ | £ | AED | SGD
- Stored in localStorage; respects user choice across pages

i18n structure (English only for v1, but ready for Hindi and Arabic later):
- Use `next-intl` library
- All copy in `/messages/en.json`
- Easy to add `/messages/hi.json` and `/messages/ar.json` later

---

## 9. Compliance gates (non-negotiable)

**Every page** must include the disclaimer footer:

> *Auris Pvt Ltd (CIN: U70200HR2026PTC141922) is a private limited company registered in India. The content on this site is for educational purposes only and does not constitute investment advice. Investments in securities and other instruments are subject to market risks. Past performance is not indicative of future returns. Please consult a SEBI-registered investment adviser, a chartered accountant, and a tax professional in your jurisdiction before making investment decisions.*

**Product pages with India-specific products** (MF, PMS, AIF, unlisted) add:

> *AMFI Registration Number: [pending]. SEBI RIA Registration: [pending]. We do not guarantee returns on any product. Read all scheme-related documents carefully.*

**Crypto page** adds:

> *Cryptocurrency is taxed at 30% flat in India with 1% TDS on transactions over ₹50,000 per year. Losses cannot be set off against gains in other asset classes. Crypto is highly volatile and may result in loss of all invested capital.*

**Hard rule:** No specific buy/sell recommendations anywhere on the site until SEBI RIA licence is live. All language is educational.

---

## 10. The AI wealth planner — API route specification

**File:** `/app/api/wealth-snapshot/route.ts`

```typescript
import Anthropic from '@anthropic-ai/sdk';
import { NextRequest, NextResponse } from 'next/server';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY!,
});

export async function POST(req: NextRequest) {
  const data = await req.json();
  
  // Server-side validation
  const { age, country, monthlyIncome, currentSavings, monthlyExpenses, 
          hasDebt, debtAmount, ownsHome, retirementAge, primaryGoal, 
          riskTolerance } = data;
  
  // Strip all PII — no name, no email, no identifying data
  
  // Construct the prompt
  const systemPrompt = `[as defined in section 5.3]`;
  
  const userPrompt = `[anonymised data summary]`;
  
  try {
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      temperature: 0.3,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    });
    
    const content = response.content[0];
    if (content.type !== 'text') throw new Error('Unexpected response type');
    
    const parsed = JSON.parse(content.text);
    
    // Log the call (anonymised)
    await logSnapshotCall({ country, age, riskTolerance });
    
    return NextResponse.json(parsed);
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to generate snapshot. Please try again.' }, 
      { status: 500 }
    );
  }
}
```

**Rate limiting:** Use Upstash Redis or Netlify's built-in to limit to 3 snapshots per IP per hour (prevents abuse, keeps API costs sane).

**Caching:** Cache identical input combinations for 24 hours to reduce duplicate API calls.

---

## 11. The blog editorial workflow

**For each post:**
1. Draft in Sanity Studio (or Markdown file in `/content/`)
2. Use the SEO checklist:
   - Target keyword identified (use VidIQ or Ahrefs free tools)
   - Title contains primary keyword
   - Meta description compelling
   - H1 = title
   - At least 3 H2 sections
   - Image alt text on every image
   - Internal links to at least 3 other pages
   - External links to 2 authoritative sources
   - CTA at end
3. Preview on staging
4. Publish

**Build a `/app/blog` page that:**
- Lists all posts paginated (10 per page)
- Filter by category, search by tag
- Featured post at top
- RSS feed at `/rss.xml`

---

## 12. Visual content — graphs and illustrations

You asked for "informative graphs" explaining major investment products. Build these as reusable React components using Recharts.

**The 9 hero graphics (one per product):**

For each product page, create a custom data visualisation:

1. **Mutual Funds**: Bar chart of "Equity vs Debt MF returns over 10 years" with note that past performance ≠ future
2. **PMS**: Comparison of typical PMS fee structure vs MF total expense ratio
3. **AIF**: Treemap of AIF categories with example funds in each
4. **Unlisted Shares**: Timeline of pre-IPO companies that listed in India (when allowed) — illustrative only
5. **Cryptocurrency**: BTC + ETH price history with India tax overlay
6. **Direct Equity**: Nifty 50 vs Sensex vs Smallcap 250 over 20 years
7. **Insurance**: Cover gap calculator visualisation
8. **Real Estate**: Equity vs real estate returns 20-year comparison (with caveats)
9. **Gold**: Gold price in INR over 25 years + SGB benefit illustration

Each graph component:
- Uses Recharts for interactivity
- Source clearly cited beneath
- Includes "Returns shown are historical and do not guarantee future performance"
- Mobile-responsive

---

## 13. Newsletter and lead capture

**Strategy:** 
- Newsletter signup on every page (footer + inline)
- Lead magnet (gated PDF) on resources pages
- Topmate booking on contact + product pages
- Free AI snapshot = email capture at the end

**Email provider:** Resend (developer-friendly) or Brevo (free tier with 300 sends/day)

**Welcome sequence (5 emails over 14 days for new subscribers):**

1. Day 0: Welcome + the WealthWise founder story + free PDF
2. Day 2: "The 3 questions every investor should answer this week"
3. Day 5: Case study — a real (anonymised) financial plan
4. Day 9: Product education — most relevant to the user's profile (defence officer / NRI / etc.)
5. Day 14: Soft pitch for the WealthWise 14-day trial

---

## 14. Analytics and tracking

**Setup:**
- Google Analytics 4 (G-BNT8QF03F6) with consent banner (DPDP requirement)
- Plausible.io as backup (privacy-friendly, simple)
- Goal tracking:
  - AI snapshot completion
  - WealthWise app signup
  - Topmate booking initiated
  - Newsletter signup
  - PDF download
  - Blog post read (>50% scroll)
- UTM tracking for YouTube, LinkedIn, Twitter campaigns
- Heatmaps via Microsoft Clarity (free, GDPR-compliant)

**Dashboard for Ashish:** A simple `/admin/dashboard` (password-protected) showing weekly:
- Visitors
- AI snapshots run
- Email signups
- Top blog posts
- Top traffic sources

---

## 15. Build sequence for Claude Code

**Phase 1 — Foundation (week 1):**
1. Set up Next.js 15 + Tailwind v4 + shadcn/ui
2. Build layout, Header, Footer, Hero, basic typography system
3. Configure Netlify deployment + custom domain
4. Set up analytics

**Phase 2 — Core pages (week 2):**
5. Home page with all sections
6. WealthWise product page
7. About page
8. Contact page (with Topmate embed)

**Phase 3 — Investment product pages (week 3-4):**
9. Build the product page template
10. Create all 9 product pages
11. Build the 9 hero graphics

**Phase 4 — The AI planner (week 5):**
12. Build the multi-step wizard
13. Build the API route + Claude integration
14. Build the results display with chart

**Phase 5 — Blog + audience pages (week 6):**
15. Set up Sanity.io and seed initial posts
16. Build blog index, post template, category pages
17. Build 4 audience landing pages

**Phase 6 — Resources (week 7):**
18. Build 7 calculator pages
19. Build glossary page
20. Build downloads page with email gating

**Phase 7 — Polish (week 8):**
21. SEO audit and fixes
22. Performance optimisation
23. A11y audit
24. Legal pages review
25. Pre-launch QA checklist

---

## 16. The first prompt to give Claude Code

> Read CLAUDE.md. Initialise a new Next.js 15 project with TypeScript, Tailwind CSS v4, and shadcn/ui. Configure the project structure exactly as specified in Section 4. Set up the design system in Section 3 (colours, fonts, base components). Build the Header and Footer components. Create a placeholder home page using the structure from Section 5.1, but with all sections as empty bordered placeholders that I'll fill in next. Deploy to Netlify with the custom domain auriswealth.co. Confirm Lighthouse score >85 on the initial build.

After that, proceed phase by phase.

---

## 17. What NOT to build on this marketing site

- Any login/authentication (the app does that, separate repo)
- Any portfolio tracking (the app does that)
- Any transaction execution (regulatory issue)
- E-commerce / direct product sales (regulatory issue)
- Forum / community features (not the strategy yet)
- Live chat (use Topmate booking instead, more qualified)

---

## 18. Mandatory site-wide disclaimer footer

```html
<div class="text-xs text-gray-500 border-t pt-6 mt-12">
  <p>Auris Wealth is a brand of Auris Pvt Ltd (CIN: U70200HR2026PTC141922).</p>
  <p>The content on this site is for educational purposes only and does not 
     constitute investment, legal, or tax advice. Investments in mutual funds, 
     PMS, AIF, equities, cryptocurrencies, and other instruments are subject 
     to market risks. Past performance is not indicative of future returns. 
     Please read all scheme-related documents carefully and consult a 
     SEBI-registered investment adviser, chartered accountant, and tax 
     professional in your jurisdiction before making investment decisions.</p>
  <p>Auris Wealth, its directors, employees, and contractors do not guarantee 
     any returns and are not liable for any losses arising from decisions 
     based on the content of this site.</p>
</div>
```

---

*This file is the source of truth. Update it as the website evolves. The marketing site, the WealthWise app, and the social media strategy are three connected pieces of the same business — they share branding, voice, and audience but live in separate codebases and channels.*

— Auris Wealth marketing site spec, May 2026
