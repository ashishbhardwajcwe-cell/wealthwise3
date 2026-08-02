# Core Web Vitals Audit — PageSpeed + CrUX

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
