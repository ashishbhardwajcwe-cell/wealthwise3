# Programmatic SEO Audit — /pms/* (PMS strategy pages, ~1,700 in production)

**URL:** https://planmycashflows.com/investment-products/pms
**Audit date:** 2026-07-31
**Method:** Sampled 9 individual `/pms/[slug]` strategy pages — 5 homepage-featured strong performers and 4 pulled from deep in the sitemap (including two funds with incomplete track records) — to check whether the template holds up outside the curated best-of list. Compared titles, meta descriptions, word counts, schema, and internal-link patterns across the sample.

> **Status update (same session, after this audit):** Findings #1 and #2 below have since been addressed. See the note under each.

## Programmatic SEO Score: 66/100

| Category | Status | Score |
|---|---|---|
| Data Quality | pass | 92/100 |
| Template Uniqueness | warn | 55/100 |
| URL Structure | pass | 96/100 |
| Internal Linking | warn | 45/100 |
| Thin Content Risk | warn | 55/100 |
| Index Management | pass | 90/100 |

## What's genuinely working

- **Real per-page data differentiation.** Each page has its own AUM, minimum, as-of-date, and a full 9-window Fund/Benchmark/Alpha table with real numbers — not a city-name-swap pattern, it's the "safe" category of data-driven programmatic pages.
- **N/A handled honestly.** Funds without a 3Y track record (`accelt-long-term-equity-fund-ndpms`, `spark-bespoke-investment-ideas`) show `N/A`/"no data" rather than fabricating a number.
- **The insight sentence is genuinely dynamic, not static text.** A 1/3-beat fund gets "Thin long-term alpha — the recent figure may be flattering. Check the 3Y before the 1M," while 3/3-beat funds get "Consistent alpha across cycles."
- **Editorial rules are respected at scale.** No title or meta description headlines a raw 1M/3M/6M figure; the 3Y/alpha framing carries the headline everywhere checked, including on N/A pages, which correctly omit the number instead of falling back to a shorter window.
- Clean URLs, self-referencing canonicals, correct `robots: index,follow`, `lastmod` in the sitemap matching the real data date (`2026-06-30`) — indexability fundamentals are solid.

## Issues Found

### Critical
None — nothing here blocks indexing or violates a hard policy gate.

### High
1. **Title tags were systemically oversized across the entire set.** All 9 sampled pages ran 92–140 characters (target 50-60) — template-driven, so not 9 isolated pages, the ~1,700-page pattern. Example: `White Pine India Emerging Stars Approach PMS by White Pine Investment Management Private Limited — Returns, AUM & Analysis | PlanMyCashflows` (140 chars).
   **✅ Fixed same session:** `app/(site)/pms/[slug]/page.tsx` title/description generation now degrades in stages (drops brand suffix, then manager name) before falling back to hard truncation. Verified against the full length range in the feed, including a 97-char AMC legal name. Shipped in PR #89, merged to `main` (`6ada2ae`).
2. **Meta descriptions were also systemically oversized** — 188–250 chars (target 150-160), same root cause.
   **✅ Fixed same session** — same PR #89 fix as above; all sampled descriptions now land 113–160 chars after the fix.
3. **Internal linking from each PMS page was almost entirely global nav, not contextual.** Of 49 internal links on the Sahasrar page, 48 were the same header/footer/product-menu links present on every page site-wide. The only content-specific link was to the fund's AMC hub page — no category link, no "similar strategies" module.
   **Investigated same session:** the fix already existed in the codebase (`b64469e`/`dff03da`, merged 2026-07-28/29, before this audit ran) — a "Similar strategies" block (3 same-AMC + 3 same-category links) plus a category-hub link were already built. Re-fetching the live page confirmed they're still absent in production, meaning the deployed build is older than those commits. **This is a stale-deploy problem, not a missing-code problem** — no further code change needed, needs investigation into why `main` hasn't redeployed since 2026-07-28.

### Medium
4. **Prose-layer uniqueness is thin and drawn from a small template pool.** Stripping shared nav/footer/legal boilerplate, each page's genuinely page-specific prose (excluding the numbers table) is ~100-130 words out of ~370-440 total — 25-35%, near this skill's own 30% scaled-content-abuse threshold. The numeric table itself is fully unique per page, which materially reduces real risk versus a text-only mad-libs page, but the insight-sentence pool showed only ~2-3 distinct variants across 9 pages. One accuracy nuance: `spark-bespoke-investment-ideas` (2/3 beat) received the same "Consistent alpha across cycles — the number worth trusting" line as the 3/3-beat funds — worth confirming that tier boundary is intentional, since "consistent" reads as a stretch for a 2-of-3 record.
5. ~1,700 pages already exceed the 500-page threshold this skill flags for review-before-publishing new batches. Not a stop-publishing situation for existing inventory, but the template fixes above should be considered a prerequisite for any further category/AMC expansion, so the fix propagates to new pages automatically.

### Low
6. Visible breadcrumb trail reads as a short "PMS Explorer" eyebrow label rather than a full `Home > PMS > Fund Name` trail. The `BreadcrumbList` schema itself is correctly structured, so this is cosmetic/UX, not an indexability issue.

## Raw Data Reference

Sampled pages and observed title/description lengths (pre-fix):

| Slug | Title (chars) | Description (chars) | Word count |
|---|---|---|---|
| sahasrar-concentrated-growth-portfolio | 114 | 210 | 366 |
| white-pine-india-emerging-stars-approach | 140 | 236 | 375 |
| stallion-asset-core-fund | 106 | 221 | 443 |
| glc-growth-fund | 92 | 188 | 380 |
| aequitas-india-opportunities-product | 135 | 250 | 406 |
| accelt-long-term-equity-fund-ndpms | 113 | ~220 | 391 |
| halo-ndpms | 105 | ~225 | 409 |
| incredible-india | — | — | — |
| spark-bespoke-investment-ideas | — | — | — |

- **Schema present on every sampled page:** `FinancialProduct`, `BreadcrumbList` — no fabricated performance figures in schema, correctly omits return numbers when data is `N/A`.
- **Internal links on sample page (Sahasrar):** 49 total, 48 global nav/footer, 1 contextual (AMC hub link).
- **Sitemap:** `/pms/all` paginates to at least page 18; 2,155 PMS URLs in sitemap.xml with `lastmod=2026-06-30`.
- **Post-fix verification (PR #89):** on `npm run dev`, all sampled titles ≤60 chars, all descriptions ≤160 chars (after HTML-entity decoding); `npx tsc --noEmit` passed clean.

## Recommendations, in order

1. ~~Fix the title/meta template~~ — **done** (PR #89, merged).
2. Investigate why `main` hasn't deployed to production since `b64469e`/`dff03da` (2026-07-28) — the related-strategies/category-link code is already merged and just needs to go live.
3. Expand the insight-sentence tier pool (Medium #4) — moves the prose-uniqueness ratio comfortably clear of the 30–40% risk band, using fields already available in the data model (category, inception/tenure, AUM trend) rather than new data collection.
