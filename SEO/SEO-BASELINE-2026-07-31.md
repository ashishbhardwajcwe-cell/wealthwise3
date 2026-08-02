# SEO Baseline — planmycashflows.com — 2026-07-31

**Site:** https://planmycashflows.com
**Audit date:** 2026-07-31
**Git SHA of `main`:** `6ada2ae65f9164b3c467a17ba6bf4e5220b3de4c` ("Merge pull request #89 from claude/pms-title-meta-length-fix")
**SHA live on production at audit time:** predates `b64469e` (2026-07-28 19:38 UTC) — the exact SHA isn't recoverable from the read-only Netlify API available in this session (no deploy-history/list endpoint, only single-deploy lookup), but the live page's absence of the category-hub link and "Similar strategies" block that ship in `b64469e` is direct evidence it was older than that commit. Production has since redeployed to `6ada2ae` (published `2026-07-30T22:40:43Z`, confirmed via Netlify), so **`main` and production are now in sync** — that was not true while the technical and programmatic audits below were being measured.
**⚠️ The Programmatic section (Internal Linking finding + one Technical finding) was measured against that stale production build.** See [Known distortions](#known-distortions).

This consolidates three audits run in this session — [`SEO-PAGE-REPORT.md`](./SEO-PAGE-REPORT.md) (homepage deep-page audit), [`SEO-TECHNICAL-REPORT.md`](./SEO-TECHNICAL-REPORT.md) (9-category sitewide technical audit), and [`SEO-PROGRAMMATIC-REPORT.md`](./SEO-PROGRAMMATIC-REPORT.md) (`/pms/*` template audit) — into one deduplicated, impact-ranked list. The three source reports remain in place with their original per-command detail; this file is the cross-cutting baseline for tracking drift going forward.

## Scorecard

| Audit | Scope | Overall Score |
|---|---|---|
| Page (deep single-page) | Homepage | 75/100 |
| Technical (9-category) | Sitewide | 78/100 |
| Programmatic (template) | `/pms/*` (~1,700 pages) | 66/100 |

<details>
<summary>Sub-category detail</summary>

| Audit | Category | Score |
|---|---|---|
| Page | On-Page SEO | 78/100 |
| Page | Content Quality | 85/100 |
| Page | Technical | 75/100 |
| Page | Schema | 55/100 |
| Page | Performance (estimated, not measured) | 65/100 |
| Page | Images | 80/100 |
| Technical | Crawlability | 90/100 |
| Technical | Indexability | 92/100 |
| Technical | Security | 78/100 |
| Technical | URL Structure | 95/100 |
| Technical | Mobile / Page Experience | 85/100 |
| Technical | Core Web Vitals | unmeasured |
| Technical | Structured Data | 55/100 |
| Technical | JavaScript Rendering | 98/100 |
| Technical | IndexNow | 40/100 |
| Programmatic | Data Quality | 92/100 |
| Programmatic | Template Uniqueness | 55/100 |
| Programmatic | URL Structure | 96/100 |
| Programmatic | Internal Linking | 45/100 — measured pre-fix, see [Known distortions](#known-distortions) |
| Programmatic | Thin Content Risk | 55/100 |
| Programmatic | Index Management | 90/100 |

</details>

## Findings, ranked by estimated impact

Ranked by breadth × severity, not by which command produced them — a template fix touching ~1,700 pages ranks above a homepage-only fix, and a sitewide structural gap ranks above a single-page cosmetic issue.

| # | Finding | Scope | Status |
|---|---|---|---|
| 1 | PMS strategy title/meta description oversized | Template (~1,700 pages) + Homepage (1 page) | **Fixed** (template, PR #89) / **Not started** (homepage) |
| 2 | PMS pages had no category/related-strategy links | Template (~1,700 pages) | **Fixed** (already merged pre-audit; now confirmed deployed) |
| 3 | No `Organization` schema anywhere on the domain | Sitewide | Not started |
| 4 | No `Content-Security-Policy` header | Sitewide | Not started |
| 5 | Core Web Vitals unmeasured | Sitewide | Not started |
| 6 | PMS prose-layer uniqueness thin, small template pool | Template (~1,700 pages) | Not started |
| 7 | No `og:image` / `twitter:image` | Homepage (1 page) | Not started |
| 8 | IndexNow not implemented | Sitewide | Not started |
| 9 | ~54 sitemap URLs lack `<lastmod>` | Sitewide (static pages) | Not started |
| 10 | Bare `<h3>` labels ("PMS"/"AIF") | Homepage (1 page) | Not started |
| 11 | ~1,700 pages already past the 500-page review-batch threshold | Template (governance) | Not started |

### 1. PMS strategy title/meta descriptions were oversized

**Template scope (~1,700 pages) — Status: Fixed.** All 9 sampled `/pms/[slug]` pages ran 92–140 chars on title (target 50-60) and 188–250 chars on description (target 150-160) — template-driven, so the whole PMS catalog, not isolated pages. Fixed in `app/(site)/pms/[slug]/page.tsx`: title/description generation now degrades in stages (drops brand suffix, then manager name) before falling back to hard truncation. Shipped in PR #89, merged to `main` (`6ada2ae`).
Confirmed post-fix: on `npm run dev`, all sampled titles ≤60 chars, all descriptions ≤160 chars (after HTML-entity decoding); `npx tsc --noEmit` passed clean.

**Homepage scope (1 page) — Status: Not started.** Title 62 chars (target 50-60), meta description 237 chars (target 150-160) — this file wasn't touched by the PMS-template fix. Suggested description (150 chars): "Compare India's leading PMS & AIF strategies in one place. AI-powered, unbiased research for HNIs, professionals and NRIs — explore before you invest."
**Verify:** re-fetch and confirm Google's SERP snippet no longer truncates with "...".

### 2. PMS pages had no category/related-strategy links

**Scope: Template (~1,700 pages) — Status: Fixed.** Of 49 internal links on a sampled PMS page, 48 were global nav/footer and only 1 was contextual (the fund's AMC hub link) — no category link, no "similar strategies" module. Investigation found the fix already existed in code (`b64469e`/`dff03da`, merged 2026-07-28/29, *before* this audit ran) — a "Similar strategies" block (3 same-AMC + 3 same-category links) and a category-hub link were already built, just not yet deployed. See [Known distortions](#known-distortions).

### 3. No `Organization` schema anywhere on the domain

**Scope: Sitewide — Status: Not started.** Flagged independently by both the page audit (homepage has only `WebSite` + `FAQPage`) and the technical audit (no entity markup tying the logo, social profiles, and contact email together anywhere on the domain) — one gap, not two. Recommended block, deliberately typed `Organization` not `FinancialService` (the site's own FAQ states it does not manage money or provide personalised advice — `FinancialService` would overclaim regulatory status):

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "PlanMyCashflows",
  "url": "https://planmycashflows.com",
  "logo": "https://planmycashflows.com/pmc-logo.png",
  "email": "hello@planmycashflows.com",
  "sameAs": [
    "https://www.youtube.com/@planmycashflows",
    "https://x.com/planmycashflows",
    "https://instagram.com/planmycashflows",
    "https://facebook.com/planmycashflows"
  ]
}
```
Add to the global layout so it's present on every page, not just the homepage.
**Verify:** Google Rich Results Test shows the `Organization` type parsed with no errors; check Search Console's Knowledge Panel signals over following weeks.

### 4. No `Content-Security-Policy` header

**Scope: Sitewide — Status: Not started.** Every other security header is properly configured (HSTS with `preload`+`includeSubDomains`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, a restrictive `Permissions-Policy`) — CSP is the one gap in an otherwise strong posture, and it's the header that actually contains XSS blast radius if any third-party script (ads, chat widgets, analytics) is ever compromised.
**Verify:** `curl -sI https://planmycashflows.com/` shows the header; test with csp-evaluator.withgoogle.com.

### 5. Core Web Vitals unmeasured

**Scope: Sitewide — Status: Not started.** No `GOOGLE_API_KEY` configured, so no real CrUX/PSI field data — the only page-experience signal that feeds ranking directly. The site is SSR'd with daily ISR (good for TTFB) but ships ~80 script chunks per page (Next.js hydration), an INP risk worth confirming rather than assuming.
Action: configure a `GOOGLE_API_KEY` and run `claude-seo run pagespeed_check.py https://planmycashflows.com --json`, or check Search Console's Core Web Vitals report directly.

### 6. PMS prose-layer uniqueness is thin, drawn from a small template pool

**Scope: Template (~1,700 pages) — Status: Not started.** Stripping shared nav/footer/legal boilerplate, each page's genuinely page-specific prose (excluding the numbers table) is ~100-130 words out of ~370-440 total — 25-35%, near this audit framework's own 30% scaled-content-abuse threshold. The numeric table itself is fully unique per page, which materially reduces real risk versus a text-only mad-libs page, but the insight-sentence pool showed only ~2-3 distinct variants across 9 sampled pages.
Recommendation: broaden the insight-sentence template pool (more tiers keyed to beat-ratio, plus one more data-driven sentence using fields not yet used in prose — category, inception/tenure, AUM trend) to lift both word count and variant count without manual writing.

### 7. No `og:image` / `twitter:image`

**Scope: Homepage (1 page) — Status: Not started.** Confirmed absent from the raw HTML (checked both meta blocks directly). Every social/WhatsApp share of the homepage renders with no preview image — meaningful given the footer leads with WhatsApp, X, Instagram, YouTube, Facebook CTAs.
**Verify:** paste the URL into Facebook's Sharing Debugger or WhatsApp itself; a card image should render.

### 8. IndexNow not implemented

**Scope: Sitewide — Status: Not started.** No key file at `/indexnow.txt` (or any variant), and robots.txt has no IndexNow reference. Given PMS data refreshes monthly and the blog publishes regularly, this is a low-effort way to get faster Bing/Yandex indexing without waiting on crawl scheduling.

### 9. ~54 sitemap URLs lack `<lastmod>`

**Scope: Sitewide (static pages) — Status: Not started.** All 2,155 PMS pages correctly carry `<lastmod>` (dated `2026-06-30`, matching the monthly refresh cadence), but ~54 static pages (home, about, legal, resource hubs) don't. Minor, but easy to make consistent.

### 10. Bare `<h3>` labels ("PMS"/"AIF")

**Scope: Homepage (1 page) — Status: Not started.** Two `<h3>` elements contain only "PMS" and "AIF" — bare 2-3 char headings used as comparison-table labels, not real headings. Semantically thin for screen readers and heading-based content extraction. Use non-heading `<span>`/`<div>` if purely a UI label, or a fuller heading if it's meant to carry SEO weight.

### 11. ~1,700 pages already past the 500-page review-batch threshold

**Scope: Template (governance) — Status: Not started.** Not a stop-publishing situation for existing inventory, but findings #1 and #6 above should be treated as a prerequisite for any further category/AMC expansion, so fixes propagate to new pages automatically rather than compounding the backlog.

## Low / Info (not ranked — no material ranking impact)

- **FAQPage schema present, retired for rich results.** Google retired FAQ rich results for all sites on 2026-05-07 — already in effect. No action needed: don't remove it, just don't expect a SERP rich-result from it. *(Homepage)*
- **Header logo `<img>` has empty `alt=""`.** Acceptable given adjacent visible brand text, but inconsistent with the second logo instance which has `alt="PlanMyCashflows"`. *(Homepage)*
- **`WebSite` schema has no `SearchAction`.** Only relevant if the site has an internal search box to expose as a sitelinks searchbox. *(Homepage)*
- **2 form inputs lack ARIA labels.** From the Agent-UX/accessibility-tree scan (score 100/100 otherwise: real buttons/anchors throughout, zero `div onclick` widgets, strong landmark structure). *(Sitewide)*
- **No `llms.txt`.** Optional and ignored by Google Search, but trivial given the volume of structured educational content (blog, glossary, calculators) already on site. *(Sitewide)*
- **Back-button hijacking not verified.** Google's spam-policy enforcement on `history.pushState`/`replaceState` hijacking went live 2026-06-15 and is Critical when found, but confirming it needs interactive browser testing this static/headless pass didn't do. Worth a manual check if any third-party ad, chat, or consent script is loaded. *(Sitewide)*
- **PMS breadcrumb visible trail reads as a short "PMS Explorer" eyebrow label**, not a full `Home > PMS > Fund Name` trail. The `BreadcrumbList` schema itself is correctly structured — cosmetic only. *(Template)*

## Known distortions

Both measured while production was serving a build older than `b64469e` (2026-07-28 19:38 UTC):

- **Finding #2** (PMS internal linking) — the audit found only 1 contextual link per PMS page because the category-hub link and "Similar strategies" block, though already merged to `main`, hadn't been deployed yet. Production has since redeployed to `6ada2ae` (2026-07-30T22:40:43Z), which includes those commits in its linear history — the feature should now be live. Recommend a spot-check on a live page to confirm rendering before closing this out.
- **Technical audit, Medium finding** "long-tail PMS pages depend heavily on pagination + sitemap for discoverability" (see `SEO-TECHNICAL-REPORT.md` #5) was measured under the same stale build — it flagged as *unconfirmed* the very category/related-strategy links that finding #2 above is about. Once #2 is confirmed live, this finding's crawl-depth concern is substantially mitigated.

## Not an SEO issue

- **`spark-bespoke-investment-ideas` (2-of-3 beat ratio) received the same "Consistent alpha across cycles — the number worth trusting" insight-sentence tier as funds with a 3-of-3 record.** "Consistent" reads as a stretch for a 2-of-3 outcome. This is a content-accuracy/editorial-tone question about where the insight-sentence tier boundary sits, not an SEO ranking, indexability, or template-uniqueness issue — flagging for whoever owns that tiering logic to confirm the boundary is intentional.
