# Sanity CMS — quick guide

This site's content is managed through Sanity Studio, embedded at `/studio`.

## First-time setup (10 minutes, one-off)

### 1. Sanity dashboard — add CORS origins
The Studio must be allowed to talk to your Sanity project from your live URL.

1. Go to https://sanity.io/manage → your "Auris Wealth" project → **API → CORS Origins**
2. Click **Add CORS origin** and add each of:
   - `https://auriswealth.co` — Allow credentials: ✅
   - `https://www.auriswealth.co` — Allow credentials: ✅
   - `http://localhost:3000` — Allow credentials: ✅ (for local dev)
3. Save

### 2. Sanity dashboard — set up the revalidation webhook
This makes published content appear on the live site within seconds.

1. **API → Webhooks → Create webhook**
2. Configure:
   - **Name**: Production revalidation
   - **URL**: `https://auriswealth.co/api/revalidate`
   - **Dataset**: `production`
   - **Trigger on**: Create, Update, Delete
   - **Filter**: `_type in ["blogPost","stockAnalysis","pmsStrategy","aifFund","unlistedShare","author","category"]`
   - **HTTP method**: POST
   - **API version**: same as `NEXT_PUBLIC_SANITY_API_VERSION` (default `2024-09-01`)
   - **Secret**: pick a long random string (e.g. 32+ chars from a password manager). Save the same value in Netlify env var `SANITY_REVALIDATE_SECRET`.
3. Save

### 3. Netlify env vars (verify these are present)
- `NEXT_PUBLIC_SANITY_PROJECT_ID` — your Sanity project ID
- `NEXT_PUBLIC_SANITY_DATASET` — `production`
- `SANITY_API_TOKEN` — Viewer-role token (read-only)
- `SANITY_REVALIDATE_SECRET` — same value you set in the webhook above

### 4. Sanity Studio — invite yourself
Visit `https://auriswealth.co/studio` → log in with the same Sanity account you used to create the project. Studio is access-controlled by Sanity itself; it's safe to leave the URL public.

## Daily use — publishing a blog post

1. Go to `auriswealth.co/studio`
2. Sidebar → **Editorial → Blog Posts → Create new**
3. Fill in:
   - Title
   - Slug (auto-generates from title — leave it)
   - Excerpt (1-2 sentences shown in blog cards and meta description)
   - Hero image (upload)
   - Body (rich text — H2/H3, bold, italic, links, images, callout boxes)
   - Author (pick or create one)
   - Category (pick or create one)
   - Tags
   - Read time ("8 min")
   - Featured (toggle to pin to home page)
4. Click **Publish** (top right)
5. The webhook fires → the live blog post is up within ~5 seconds

## Adding stock analyses

1. Sidebar → **Editorial → Stock Analyses → Create new**
2. Fill in:
   - Title, slug, NSE ticker, company name, sector, market cap category
   - Investment thesis (1 paragraph)
   - Key metrics (CMP, P/E, ROE, D/E, market cap)
   - Full analysis (rich text body)
   - Strengths (3-5 bullets)
   - Risks (3-5 bullets)
   - Conclusion
   - Analysis date
   - Author
3. Publish

## Updating PMS / AIF / Unlisted Shares data

These are structured data records, updated on a cadence:

- **PMS Strategies** — monthly (typically first week, after PMS Bazaar's monthly digest is out)
- **AIF Funds** — quarterly
- **Unlisted Shares** — weekly (top 20 names)

Each record carries an `asOfDate` field so the site can display "as of DD-MMM-YYYY" prominently.

## Migrating existing 10 blog posts

The existing 10 seed posts live in `lib/blog-data.ts`. They continue to render on the site until you migrate each one to Sanity. To migrate:

1. Studio → Blog Posts → Create new
2. Use the same **slug** as the existing post (e.g. `complete-guide-to-pms-india-2026`) — this makes Sanity's version override the local version
3. Copy the title and excerpt
4. Paste the body content (Studio's rich-text editor accepts markdown-style pasting for headings and links)
5. Pick or create the matching Author and Category
6. Publish

Once all 10 are in Sanity, you can delete `lib/blog-data.ts` and remove the fallback code from `lib/blog.ts`.

## Troubleshooting

**Blog post published but not appearing on live site:**
- Check the webhook in Sanity (Activity log under API → Webhooks → your webhook) — it should show a 200 response
- If it's failing 401, the `SANITY_REVALIDATE_SECRET` mismatch. Re-paste the same value in both places
- If the webhook isn't firing at all, check the filter — `_type` must match one of the documented types
- Worst case: trigger a Netlify redeploy

**Studio shows "Sanity is not configured":**
- The Netlify env vars (`NEXT_PUBLIC_SANITY_PROJECT_ID` + `NEXT_PUBLIC_SANITY_DATASET`) aren't set or weren't included in the build
- Trigger a redeploy after adding them

**Studio fails to load images:**
- CORS origins setting is missing for your domain. See setup step 1.

**Sanity asks me to log in repeatedly:**
- "Allow credentials" wasn't checked for your CORS origin. Fix in Sanity → API → CORS Origins.

## Free tier limits to keep in mind

- 3 admin users (you + maybe a VA)
- 10,000 documents (you'll have ~50-200)
- 100,000 CDN API requests/month (ISR caches most reads, so very hard to hit)

You'll stay on the free tier indefinitely for normal use.
