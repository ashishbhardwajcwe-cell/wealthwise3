# SEO Page Audit — planmycashflows.com (homepage)

**URL:** https://planmycashflows.com
**Audit date:** 2026-07-31
**Method:** Server-rendered HTML fetched directly (confirmed SSR, `is_spa=False`), parsed for on-page, technical, schema, and image elements.

## Page Score Card

```
Overall Score: 75/100

On-Page SEO:     78/100  ███████▉░░
Content Quality: 85/100  ████████▌░
Technical:       75/100  ███████▌░░
Schema:          55/100  █████▌░░░░
Performance*:    65/100  ██████▌░░░  (*estimated — no PageSpeed/CrUX API call run)
Images:          80/100  ████████░░
```

Performance and AI-search-readiness are directional estimates from static HTML only (heavy JS payload, no rendered CWV data). Run `/seo google pagespeed https://planmycashflows.com` for measured LCP/INP/CLS instead of an estimate.

## Issues Found

### Critical
None. Page is server-rendered, indexable (`meta robots: index,follow`), correctly canonicalized, and `www` cleanly 301s to apex.

### High
1. **No `og:image` / `twitter:image`.** Confirmed absent from the raw HTML (checked both meta blocks directly). Every social/WhatsApp share of this URL renders with no preview image — meaningful given the footer leads with WhatsApp, X, Instagram, YouTube, Facebook CTAs.
2. **Meta description is 237 characters** (target 150–160). Google will truncate mid-sentence in the SERP, cutting the "for HNIs, professionals, business owners and NRIs" audience qualifier.
3. **No `Organization` schema.** Only `WebSite` and `FAQPage` are present. There's no entity markup tying the logo, `sameAs` social profiles, and contact email together — the single highest-leverage schema gap on the domain.

### Medium
4. Title tag is 62 characters — a few over the 50–60 sweet spot, risking truncation on mobile SERPs.
5. Two `<h3>` elements contain only "PMS" and "AIF" — bare 2–3 char headings used as comparison-table labels, not real headings. Semantically thin for screen readers and heading-based content extraction.

### Low / Info
6. `FAQPage` schema is present. Google retired FAQ rich results for all sites on **2026-05-07** — already in effect. No action needed: don't remove it (harmless, may still aid AI-answer extraction though unconfirmed), just don't expect a SERP rich-result from it.
7. Header logo `<img>` has empty `alt=""` — acceptable since it's paired with visible "PlanMyCashflows" text in the same link, but worth using an alt for consistency with the second logo instance which does have `alt="PlanMyCashflows"`.
8. `WebSite` schema has no `SearchAction` — only relevant if the site has an internal search box to expose as a sitelinks searchbox.

## Recommendations

### 1. Add `og:image` + `twitter:image` (1200×630, branded)
- **Why it matters:** every WhatsApp/social share currently shows zero preview — undermines the site's own primary CTAs.
- **Depends on:** nothing — pure addition, no blockers.
- **Verify it worked:** paste the URL into Facebook's Sharing Debugger or WhatsApp itself; a card image should render.
- **Watch:** social referral CTR/share rate should tick up once previews render correctly.

### 2. Tighten the meta description to ≤160 chars
Suggested (150 chars):
> "Compare India's leading PMS & AIF strategies in one place. AI-powered, unbiased research for HNIs, professionals and NRIs — explore before you invest."
- **Verify:** re-fetch and confirm Google's SERP snippet no longer truncates with "...".

### 3. Add `Organization` schema
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
Deliberately typed as `Organization`, not `FinancialService` — the site's own FAQ answer states "PlanMyCashflows is an information and distribution platform... We do not manage money, run our own fund, or provide personalised investment advice." A `FinancialService` type would overclaim regulatory status; `Organization` is accurate and still carries full entity/`sameAs` benefit.
- **Depends on:** none — additive JSON-LD block alongside the existing two.
- **Verify:** Google Rich Results Test shows the `Organization` type parsed with no errors; check Search Console's Knowledge Panel signals over following weeks.

### 4. Trim title to ~54–55 chars
e.g. `PlanMyCashflows | India's Leading PMS & AIF Strategies`

### 5. Replace the bare "PMS"/"AIF" `<h3>` labels
Use either non-heading `<span>`/`<div>` (if purely a UI label) or a fuller heading like "PMS: Direct portfolio ownership" if it's meant to carry SEO weight — pick based on whether that section is meant to rank for anything specific.

## Raw Data Reference

- **Title:** `PlanMyCashflows | Explore India's Leading PMS & AIF Strategies` (62 chars)
- **Meta description:** `Discover, compare and understand Portfolio Management Services (PMS) and Alternative Investment Funds (AIF) across India's leading fund houses. AI-powered, unbiased and education-first — for HNIs, professionals, business owners and NRIs.` (237 chars)
- **Canonical:** `https://planmycashflows.com` (self-referencing, correct)
- **Meta robots:** `index, follow`
- **H1:** "Explore India's Leading PMS & AIF Strategies — In One Place" (single, correct)
- **Word count:** 2,630
- **Schema present:** `WebSite`, `FAQPage` (10 Q&A pairs)
- **Open Graph:** `og:title`, `og:description`, `og:url`, `og:site_name`, `og:locale`, `og:type` present; `og:image` **missing**
- **Twitter Card:** `twitter:card`, `twitter:title`, `twitter:description` present; `twitter:image` **missing**
- **Images in raw HTML:** 2 `<img>` (both site logo instances); 48 inline `<svg>` icons
- **Internal links:** ~57, descriptive anchor text, covers PMS/AIF/product/resource/legal architecture
- **External links:** social profiles, WhatsApp, Topmate booking, mailto — all correctly `rel="noreferrer"`
