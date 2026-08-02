# Technical SEO Audit — planmycashflows.com

**URL:** https://planmycashflows.com
**Audit date:** 2026-07-31
**Method:** 9-category technical SEO audit — direct HTTP/HTML inspection (headers, robots.txt, sitemap.xml, canonical/meta-robots spot checks across page types), plus an Agent-UX/accessibility-tree scan via headless Chromium. No Google API credentials were configured, so Core Web Vitals are unmeasured (no CrUX/PageSpeed field data) rather than estimated.

## Technical Score: 78/100

*(Core Web Vitals sub-score is unmeasured, not zero — it's excluded from the estimate below with a caveat rather than guessed. Run `/seo google pagespeed https://planmycashflows.com` for real field data.)*

| Category | Status | Score |
|---|---|---|
| Crawlability | pass | 90/100 |
| Indexability | pass | 92/100 |
| Security | warn | 78/100 |
| URL Structure | pass | 95/100 |
| Mobile / Page Experience | pass | 85/100 |
| Core Web Vitals | **unmeasured** | — |
| Structured Data | warn | 55/100 |
| JavaScript Rendering | pass | 98/100 |
| IndexNow | fail | 40/100 |

## Issues Found

### Critical
None found.

### High
1. **No `Content-Security-Policy` header.** Every other security header is properly configured (HSTS with `preload`+`includeSubDomains`, `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, a restrictive `Permissions-Policy`) — CSP is the one gap in an otherwise strong posture, and it's the header that actually contains XSS blast radius if any third-party script (ads, chat widgets, analytics) is ever compromised.
2. **Core Web Vitals are unmeasured.** No `GOOGLE_API_KEY` configured, so this audit has no real CrUX/PSI field data — the only page-experience signal that feeds ranking directly. The site is SSR'd with daily ISR (good for TTFB), but ships ~80 script chunks per page (Next.js hydration), which is an INP risk worth confirming rather than assuming.
3. **Missing `Organization` schema** (also flagged in the homepage page audit) — no entity markup ties the logo, social profiles, and contact info together anywhere on the domain.

### Medium
4. **IndexNow not implemented.** No key file at `/indexnow.txt` (or any variant), and robots.txt has no IndexNow reference. Given PMS data refreshes monthly and the blog publishes regularly, this is a low-effort way to get faster Bing/Yandex indexing without waiting on crawl scheduling.
5. **Long-tail PMS pages depend heavily on pagination + sitemap for discoverability.** `/pms/all` paginates to at least page 18 (~1,700 individual strategy pages). The sitemap correctly lists all of them with `lastmod`, which is the right mitigation — but worth confirming category/AMC hub pages and "related strategies" links also give these pages a shorter path than 18 clicks of pagination.
6. **~54 sitemap URLs lack `<lastmod>`** while all 2,155 PMS pages correctly carry it (dated `2026-06-30`, matching the monthly refresh cadence — good). The gap is on the static pages (home, about, legal, resource hubs).

### Low
7. Agent-UX scan (Lighthouse-style semantic HTML/accessibility check) scored **100/100** — real `<button>`/`<a>` elements throughout, zero `<div onclick>` widgets, strong landmark structure. Only nit: 2 form inputs lack ARIA labels.
8. No `llms.txt`. Optional and ignored by Google Search, but trivial to add given how much structured educational content (blog, glossary, calculators) already exists.
9. **Not verified in this pass:** back-button hijacking via `history.pushState`/`replaceState`. Google's spam-policy enforcement on this went live 2026-06-15, and it's flagged Critical when found — but confirming it requires interactive browser testing, which this static/headless pass didn't do. Worth a manual check if any third-party ad, chat, or consent script is loaded on the site.

## What's working well

- robots.txt correctly blocks `/studio/`, `/admin/`, `/api/`, `/app/` from indexing — the right call for keeping the Sanity Studio and internal app out of search while keeping content crawlable.
- Canonical tags are self-referencing and consistent across every page type sampled (home, blog post, page 18 of PMS pagination) — no JS-injection drift, meets Google's Dec 2025 guidance of serving canonical/robots/schema server-side.
- `www` → apex and HTTP → HTTPS both single-hop 301s, no redirect chains.
- Valid SSL cert, HSTS preload — strong transport security baseline.

## Raw Data Reference

- **HTTP → HTTPS:** single-hop 301 (`http://planmycashflows.com` → `https://planmycashflows.com/`)
- **www → apex:** single-hop 301
- **Security headers present:** `strict-transport-security: max-age=63072000; includeSubDomains; preload`, `x-frame-options: DENY`, `x-content-type-options: nosniff`, `referrer-policy: strict-origin-when-cross-origin`, `permissions-policy: camera=(), microphone=(), geolocation=()`
- **Security header missing:** `content-security-policy`
- **SSL cert:** valid, `notBefore=2026-06-15`, `notAfter=2026-09-13`, `CN=planmycashflows.com`
- **robots.txt:** `Allow: /`; `Disallow: /api/`, `/admin/`, `/studio/`, `/app/`; sitemap declared
- **Sitemap:** `https://planmycashflows.com/sitemap.xml`, single flat `urlset`, 2,209 URLs (2,155 with `lastmod`), valid, discoverable via robots.txt
- **PMS pages in sitemap:** 2,155, `lastmod` dated `2026-06-30T00:00:00.000Z` (matches monthly APMI refresh cadence)
- **Blog posts in sitemap:** 12
- **Canonical/robots spot checks:** homepage, `/pms/all/18` (deep pagination), `/blog/complete-guide-to-pms-india-2026` — all self-referencing canonical, all `index, follow`, no noindex leakage
- **Google API credentials:** none configured (`google_auth.py --check` → Credential Tier -1, all APIs missing)
- **IndexNow key file:** not found (404 at `/indexnow.txt`)
- **llms.txt:** not found (404)
- **Agent-UX scan:** score 100/100; 21 real buttons, 77 real anchors, 0 `div onclick` widgets, 15 semantic landmarks, 2 inputs without ARIA labels, 0 inputs without a `<label>`
- **Mixed content:** none found (only `http://www.w3.org/2000/svg` XML namespace declarations, not resource loads)

## Recommendations

1. Add a `Content-Security-Policy` header. Verify: `curl -sI https://planmycashflows.com/` shows the header; test with csp-evaluator.withgoogle.com.
2. Configure a `GOOGLE_API_KEY` and run `claude-seo run pagespeed_check.py https://planmycashflows.com --json` (or check Search Console's Core Web Vitals report directly) to replace the unmeasured CWV line with real numbers.
3. Add `Organization` schema site-wide (same JSON-LD block as in `SEO-PAGE-REPORT.md`, added to the global layout so it's present on every page, not just the homepage).
4. Implement IndexNow for faster Bing/Yandex/Naver indexing of monthly data refreshes.
5. Add `<lastmod>` to the ~54 static sitemap URLs currently missing it, for consistency with the PMS pages.
