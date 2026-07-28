# PMS data import — monthly workflow

The `/investment-products/pms` page reads `pmsStrategy` documents from
Sanity and hides itself while there are none. This importer fills (and
monthly, refreshes) those documents from a CSV, so the PMS section becomes
a live, dated data table instead of a blank page.

## Where the data comes from

**APMI — Association of Portfolio Managers in India**
(<https://www.apmiindia.org>) is the official, free source: SEBI requires
every registered portfolio manager to publish standardized monthly
performance there (TWRR returns, AUM, since-inception figures). SEBI's own
monthly Portfolio Managers reports (<https://www.sebi.gov.in>) are a
secondary cross-check.

Do **not** scrape PMS Bazaar / PMS AIF World — they are private aggregators
and republishing their data without permission violates their terms and the
project's own compliance rules (CLAUDE-level rule: cite source, no
copyrighted reproduction).

## Monthly workflow (10–15 minutes)

1. Open APMI's monthly performance section and pick the strategies you
   feature (start with your shortlist of ~20).
2. Copy `scripts/pms-template.csv` to `scripts/pms-data.csv` and fill one
   row per strategy. Columns:

   | column | required | notes |
   |---|---|---|
   | strategyName | ✅ | e.g. `India Growth Multicap` |
   | manager | ✅ | the PMS firm |
   | category | – | one of `Multicap, Largecap, Midcap, Smallcap, Thematic, Quant, Hybrid, Debt` — each value gets a `/pms/category/<slugified>` landing page |
   | aumCr | – | AUM in ₹ crore |
   | minInvestmentL | – | minimum in ₹ lakh (SEBI floor is 50) |
   | returns1m / returns3m / returns6m / returns1y / returns2y / returns3y / returns4y / returns5y / sinceInception | – | % as published by APMI (annualised beyond 1Y) |
   | feesFixed / feesPerformance / feesHurdle | – | % figures from the manager's disclosure |
   | asOfDate | ✅ | `YYYY-MM-DD` — the month-end the APMI numbers refer to |
   | source | ✅ | e.g. `APMI monthly report, May 2026` |
   | notes | – | one-line editorial note, educational framing only |
   | sanityId | – | pin the row to an exact existing document `_id` — only needed when the importer reports an ambiguous rename match |

3. Run the import (needs a Sanity **write** token; the read-only token used
   by the website is not enough — create an Editor token once in
   sanity.io → project → API → Tokens, and keep it in `.env.local`):

   ```bash
   npm run import:pms -- scripts/pms-data.csv
   ```

4. Check the output list, then verify on the site (the page revalidates on
   deploy or via the Sanity webhook).

Re-running is safe: the document id is derived from manager + strategy
name, so each month's run **updates** the same records. Two guards make
this robust:

- **Rename guard.** If APMI (or you) renames a manager or strategy between
  months ("Stallion Asset" → "Stallion Asset Private Limited"), the row's
  derived id no longer matches. Instead of silently creating a duplicate,
  the importer fuzzy-matches the row against the existing documents: a
  unique near-duplicate keeps its existing id (reported as "matched despite
  a rename"), and an ambiguous match aborts the import with the candidate
  ids so you can pin the right one via the `sanityId` column.
- **Carry-forward.** Hand-curated fields the CSV doesn't carry — category,
  notes, fees, minInvestmentL — are preserved from the existing document
  instead of being wiped by the update. Returns and AUM always come from
  the CSV (never carried forward), so stale numbers can't survive under a
  fresh as-of date.

Strategies you add by hand in the Studio are never touched unless a CSV row
matches them. Keep `scripts/pms-data.csv` out of git if you prefer (it
contains only public data, so committing it is also fine and gives you a
history of what was published when).

## Compliance notes

- Every row must carry `asOfDate` and `source` — the importer refuses rows
  without them. The page should always display both.
- Returns are historical disclosures, never projections. Keep `notes`
  educational ("focused on smallcap value since 2014"), never
  recommendation-shaped ("best PMS", "will outperform").

## Later: full automation

This importer is deliberately CSV-first so the numbers you publish are the
numbers you saw. If APMI's site exposes a stable data endpoint, a fetch
step can be added in front of the same validation + upsert pipeline (e.g.
as a Netlify scheduled function) — the Sanity side of this script needs no
changes for that.
