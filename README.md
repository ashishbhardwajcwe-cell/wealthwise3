# PlanMyCashflows — Marketing Site (wealthwise3)

The marketing site for [PlanMyCashflows](https://planmycashflows.com) — built with Next.js 15, TypeScript, and Tailwind CSS v4.

## Stack

- **Next.js 15** (App Router) with TypeScript
- **Tailwind CSS v4** — design system in `app/globals.css`
- **shadcn/ui** patterns (lightweight, no full install required)
- **Recharts** — interactive financial charts
- **Anthropic SDK** — AI Wealth Planner API
- **Lucide React** — icons
- **next-sitemap** — auto-generated sitemap.xml + robots.txt

## Site map

```
/                                  Home
/investment-products/              Index of all 9 products
  /mutual-funds                    Mutual fund deep dive
  /pms                             Portfolio Management Services
  /aif                             Alternative Investment Funds
  /unlisted-shares                 Pre-IPO + unlisted equity
  /cryptocurrency                  Crypto with India tax context
  /direct-equity                   Stocks
  /insurance                       Term, health, ULIP analysis
  /real-estate                     Residential, commercial, REITs
  /gold                            Physical, ETF, SGB
/ai-wealth-planner                 Free AI planner (Claude-powered)
/guided                            Guided Plan (interactive Q&A wizard)
/wealthwise                        CashFlow Planner app product page
/for/                              Audience landing pages
  /defence-officers
  /nri
  /hni
  /professionals
/blog/                             Blog index
  /[slug]                          Individual posts (10 seed posts)
  /category/[category]             Category archives
/about                             Founder story, team
/contact                           Contact form + Topmate
/pricing                           Free / Premium / HNI / Enterprise tiers
/resources/
  /calculators                     7 calculators (SIP, FIRE, etc.)
  /glossary                        60+ finance terms
  /downloads                       4 free PDF guides
/legal/                            Privacy, Terms, Disclaimers, SEBI, Grievance
/api/wealth-snapshot               POST endpoint — Claude API
```

## Local development

```bash
npm install
cp .env.example .env.local
# Add ANTHROPIC_API_KEY for AI Wealth Planner
npm run dev
```

Site runs at http://localhost:3000.

## Environment variables

See `.env.example`. The critical ones:

- `ANTHROPIC_API_KEY` — for the AI Wealth Planner (Claude API)
- `NEXT_PUBLIC_SITE_URL` — used in sitemap, OG tags, structured data
- `NEXT_PUBLIC_GA_ID` — Google Analytics ID

## Architecture notes

### GUIDED Plan
The Guided Plan (ported from wealthwise2) lives at `/guided` and is composed of:
- `lib/guided/questions.ts` — 40 questions across 7 sections
- `lib/guided/build-data.ts` — converts answers + numbers to financial data
- `lib/guided/debt-simulator.ts` — avalanche/snowball debt payoff
- `components/guided/*` — UI for the wizard and 4 result tabs (Budget, Plan, Debt, Reports)

### AI Wealth Planner
- `app/api/wealth-snapshot/route.ts` — POST endpoint, calls Claude
- `components/AIPlannerForm.tsx` — 4-step wizard with Recharts results
- Strips PII before sending to model
- System prompt enforces SEBI-compliant educational framing only

### Investment product pages
Each of the 9 product pages uses a shared template (`components/InvestmentProductPage.tsx`) with product-specific data in `lib/product-data.ts`. Consistent structure helps SEO and reading flow.

### Design system
- Colors: navy `#0A1628`, gold `#C9A84C`, parchment `#FFF9EC`
- Fonts: Playfair Display (display), Inter (body)
- All design tokens in `app/globals.css` `@theme` block (Tailwind v4 pattern)

## Compliance

- Mandatory disclaimer banner appears site-wide via `components/DisclaimerBanner.tsx`
- Each product page has additional product-specific disclaimer
- No specific buy/sell recommendations until SEBI RIA licence is granted
- Privacy policy is DPDP-compliant

## Deployment

Configured for Netlify (`netlify.toml`). Push to `main` for production deploy.

## License

Proprietary - copyright 2026 Auris Pvt Ltd
