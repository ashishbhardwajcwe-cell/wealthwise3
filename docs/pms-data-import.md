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

**Fastest path — extract the whole table instead of typing it:**

```bash
# Save APMI's loadIAReport payload to scripts/apmi-report.json, then:
npm run fetch:pms -- --file scripts/apmi-report.json --inspect   # check the mapping
npm run fetch:pms -- --file scripts/apmi-report.json --asof 2026-06-30
npm run import:pms -- scripts/pms-data.csv --dry-run             # see the plan first
npm run import:pms -- scripts/pms-data.csv
```

`fetch:pms` writes every column below — including all nine return windows —
straight from APMI's own report, so no period can be left out by hand. Run
`--inspect` first on each new month's payload: it prints the table it found,
which payload label it mapped to each column, and anything it couldn't place,
without writing. If a column comes up `NOT FOUND`, pin it and re-run:

```bash
npm run fetch:pms -- --file scripts/apmi-report.json --map y2=RET_2YR --map manager=PM_NAME
```

APMI's benchmark/index rows share the table with the approaches; `fetch:pms`
leaves them out of the strategy CSV (and says which it skipped) — those are
what `fetch:benchmark` reads.

**Manual path**, when you only want a shortlist:

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
   | inceptionDate | – | when the approach launched, as published by APMI. `YYYY-MM-DD`, `DD-MMM-YYYY` or `DD/MM/YYYY`. Renders as "Since …" and is what tells a reader whether a since-inception figure covers two years or twenty |
   | returns1m / returns3m / returns6m / returns1y / returns2y / returns3y / returns4y / returns5y / sinceInception | – | % as published by APMI (annualised beyond 1Y). **Fill every one of the nine** — APMI publishes them in a single table, and a column you leave out renders as `N/A` for that period on every strategy page. The importer refuses the run if a period is empty in all rows (see below) |
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

## Dry run first

```bash
npm run import:pms -- scripts/pms-data.csv --dry-run
```

Resolves every row against Sanity and prints what it *would* do — nothing is
written. It reports would-update / renamed-match / would-create / ambiguous
counts, lists every document it would create with its new id, and names any
existing document that looks like a collision victim (below). A dry run only
needs `NEXT_PUBLIC_SANITY_PROJECT_ID` — the dataset reads publicly, so no
Editor token has to be in the shell. It exits non-zero if the real run would
abort on ambiguity.

Do this before any month where names or the row count moved noticeably. It is
the only place the id decisions are visible before they are permanent.

## How rows are matched to documents

A row is matched to an existing document by its **normalised (manager,
strategyName) pair**, and the row then writes to whatever `_id` that document
already has. Ids are never used as the lookup key, and an existing document's
id is never rewritten. Four guards make this robust:

- **Collision-free ids for new documents.** A row that matches nothing gets a
  fresh id: the manager slug capped at 40 characters, the strategy slug capped
  at 50, and an 8-character hash of the full `manager|strategyName` pair. It is
  deterministic, so importing the same CSV twice creates the document once.

  This replaced a single 96-character slug of both fields concatenated, which
  is a bug worth remembering. APMI publishes full legal names — "360 ONE
  PORTFOLIO MANAGERS LIMITED (FORMERLY KNOWN AS IIFL WEALTH PORTFOLIO MANAGERS
  LIMITED)" is 93 characters — so the manager consumed the whole budget and
  only the first four characters of the strategy name survived. Every
  "Multicap …" strategy that manager runs derived one identical id: each
  month's import silently overwrote the previous strategy's numbers with the
  next one's, and once enough rows collided the run aborted outright with
  "Ambiguous rows — nothing imported" across 360 ONE, Spark PWM, Neo Asset,
  Trivantage, Motilal Oswal and HDFC.

- **Collision-victim report.** Every run lists existing documents sitting under
  one of those old shared ids, with the strategies that claim it. They are
  reported, never repaired — merging is a human decision. Clean them up
  afterwards with `scripts/merge-pms-duplicates.mjs` (`--suggest`, then
  `--merge=<emptyId>:<keeperId>` or `--delete=<docId>`). Rows re-pointed away
  from such an id are listed too, under "Re-pointed away from a collided id";
  both keep appearing each month until the duplicates are cleaned up.

- **Rename guard.** If APMI (or you) renames a manager or strategy between
  months ("Stallion Asset" → "Stallion Asset Private Limited"), the pair no
  longer matches. Instead of silently creating a duplicate, the importer
  fuzzy-matches the row against the existing documents: a unique near-duplicate
  keeps its existing id (reported as "matched despite a rename"), and an
  ambiguous match aborts the import with the candidate ids so you can pin the
  right one via the `sanityId` column.
- **Carry-forward.** Hand-curated fields the CSV doesn't carry — category,
  notes, fees, minInvestmentL — are preserved from the existing document
  instead of being wiped by the update. Returns and AUM always come from
  the CSV (never carried forward), so stale numbers can't survive under a
  fresh as-of date.
- **Coverage gate.** Every run prints how many rows carry each return
  period, plus category, AUM and inception. If a period is empty in *every*
  row the import stops rather than writing a dataset that renders `N/A`
  sitewide for that window. Pass `--allow-gaps` when a period genuinely
  isn't published this month.

  This gate exists because it already happened. The importer's own
  "expected header" help text had gone stale — it listed only
  `returns1y, returns3y, returns5y, sinceInception` — so a CSV built from it
  imported cleanly with `returns1m`, `returns3m`, `returns6m`, `returns2y`
  and `returns4y` absent, and every strategy page shipped with `N/A` in
  those rows. Nothing failed; the gap was only visible on the live site. The
  column list now has exactly one definition in `scripts/pms-csv.mjs`,
  the template is checked against it, and unrecognised column names (a
  typo'd `return3m`) are reported instead of silently importing as blank.

The matching and id rules live in `scripts/pms-matching.mjs` and are covered
by a dependency-free self-test — run it after touching them:

```bash
npm run test:pms-matching
```

It asserts the property that matters and that no normal run can show you: a
document that already matches a row keeps its `_id` untouched, whatever shape
that id has. A changed id doesn't error — it forks a second copy of the whole
~1,700-document universe alongside the first.

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
