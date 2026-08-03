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

## The monthly sequence

Four steps, in this order, plus an optional fifth. Step 1 is not optional —
once step 4 runs, the previous month's figures are gone from Sanity and the
archive is the only record that they were ever displayed.

```bash
# 1. ARCHIVE what the site is showing right now, before anything overwrites it.
npm run archive:pms
git add scripts/archive && git commit -m "Archive PMS data as on 2026-06-30"

# 2. FETCH the new month from APMI.
node scripts/fetch-apmi-pms.mjs 7 2026 --probe     # check the request + parse first
node scripts/fetch-apmi-pms.mjs 7 2026             # writes scripts/pms-data.csv
#    …or, from a saved loadIAReport payload:
npm run fetch:pms -- --file scripts/apmi-report.json --inspect
npm run fetch:pms -- --file scripts/apmi-report.json --asof 2026-07-31

# 3. DRY RUN the import. Read the counts before writing anything.
npm run import:pms -- scripts/pms-data.csv --dry-run

# 4. IMPORT.
npm run import:pms -- scripts/pms-data.csv

# 5. CATEGORIES — only worth running when new strategies appeared.
npm run enrich:categories > categories.csv     # dry run, writes nothing
npm run enrich:categories -- --apply
```

Between steps 3 and 4, deal with anything the dry run flags: ambiguous rows
(record them in `scripts/pms-pins.json` — it prints paste-ready entries),
pins that matched nothing, and collision victims. Steps 2 and 3 write nothing
to Sanity, so they are safe to repeat.

### Step 1 — archive (`npm run archive:pms`)

Reads every `pmsStrategy` document as it currently stands and writes two files
into `scripts/archive/`, named for the **data's** as-on date rather than the
day it ran:

| file | what it is |
|---|---|
| `pms-YYYY-MM-DD.csv` | one row per strategy in the `pms-template.csv` column shape, plus each document's real `_id` in the `sanityId` column |
| `pms-YYYY-MM-DD.pdf` | the same data, readable — cover page with as-on date, strategy count and total AUM; then every strategy with manager, category, AUM and all nine return windows; source footer on every page |

**Commit both.** They are not gitignored and must not be: `git diff` between
two months' CSVs answers "what changed, and when" directly, which is what a
compliance query or a disputed figure actually asks. The data is public, so
nothing here is unsafe for a public repo. See `scripts/archive/README.md`.

It refuses to overwrite an existing archive for the same date unless
`--force`. Reading needs only `NEXT_PUBLIC_SANITY_PROJECT_ID` — no Editor
token, and it never writes to Sanity.

```bash
npm run archive:pms                       # archive the current state
npm run archive:pms -- --date 2026-06-30  # name it explicitly
npm run archive:pms -- --force            # replace an existing archive
```

### Step 2 — dates

`fetch-apmi-pms.mjs` derives both dates from the month you ask for. They are
deliberately not the same value:

- **CSV `asOfDate`** is always strict zero-padded `YYYY-MM-DD` at the month's
  real last day — `2026-07-31`, not `2026-7-30`. The day used to be hardcoded
  to 30 (wrong in every 31-day month, and by two days in February) and the
  month was not padded, which `import-pms.mjs` rejects outright.
- **The APMI POST body's `asOnDate`** keeps the unpadded shape the endpoint was
  originally written against, with the day corrected to the real month-end.
  That format has never been confirmed against a live response. `--probe`
  prints exactly what would be sent; `--ason <literal>` sends a specific string
  once a live capture shows what APMI wants.

### Step 2 — the two fetchers

`fetch-apmi-pms.mjs` calls APMI live but parses the response table by column
*position*. `fetch:pms` reads a saved payload but maps by column *label*, so it
survives APMI reordering columns. Prefer `fetch:pms` whenever the layout may
have moved; use the live fetcher when it hasn't.

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
   | sanityId | – | pin the row to an exact existing document `_id`, for a **one-off** override. A pin that should survive next month's fetch belongs in `scripts/pms-pins.json` instead — see below |

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
  right one.

- **Persistent pins — `scripts/pms-pins.json`.** A few strategies are genuinely
  ambiguous by name (two HDFC "MF Select" variants; Neo's Club Moderate /
  Moderately Conservative / Moderately Aggressive set). The importer refuses to
  guess between them, so the answer has to be recorded — and it has to be
  recorded somewhere that survives, because `scripts/pms-data.csv` is
  regenerated from APMI every month. Pins used to live in that CSV's `sanityId`
  column, so every fetch deleted them and the same rows aborted the import
  every single month.

  Pins are keyed by the normalised `(manager, strategyName)` pair — the same
  key the matcher uses — so a pin survives punctuation and abbreviation drift.
  The CSV's own `sanityId` column still works and still wins, as a one-off
  override.

  ```jsonc
  {
    "pins": [
      {
        "manager": "Neo Asset Management Private Limited",
        "strategyName": "Club Moderately Conservative",
        "sanityId": "pmsStrategy-…",
        "note": "why this document and not its sibling"
      }
    ]
  }
  ```

  You do not have to write these by hand. The dry run prints a paste-ready
  entry for every ambiguous row, with the candidate document ids filled in —
  pick the right one, paste, commit. Every run then reports how many pins
  matched, and flags four kinds of trouble loudly:

  | flag | meaning |
  |---|---|
  | `UNRESOLVED` | the entry names a known-ambiguous row but its `sanityId` is still empty, so nothing is pinned |
  | `UNMATCHED` | no CSV row matches this pin — almost always a strategy the manager has renamed, which means it is unpinned this month and may abort |
  | `STALE` | the pinned `sanityId` matches no document, so importing would *create* one under that id rather than update |
  | `TOO BROAD` | one pin matches several CSV rows, which would write them all to a single document |
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

The parts of this pipeline that fail *silently* are covered by a
dependency-free self-test — run it after touching any of them:

```bash
npm run test:pms
```

It asserts the three properties no normal run can show you:

- a document that already matches a row keeps its `_id` untouched, whatever
  shape that id has (`scripts/pms-matching.mjs`). A changed id doesn't error —
  it forks a second copy of the whole ~1,700-document universe alongside the
  first;
- month-end dates are the real last day and always zero-padded
  (`scripts/import-shared.mjs`). A wrong date imports perfectly happily and
  mislabels the entire site;
- the pins file loads, rejects malformed entries, and never treats an empty
  `sanityId` as a pin (`scripts/pms-pins.mjs`). A pin that quietly fails to
  load surfaces a month later as an ambiguity abort.

Strategies you add by hand in the Studio are never touched unless a CSV row
matches them. Keep `scripts/pms-data.csv` out of git if you prefer (it
contains only public data, so committing it is also fine and gives you a
history of what was published when).

## Categories (`npm run enrich:categories`)

APMI publishes no category per strategy, so most of the feed arrives without
one. That single gap is why the compare table's Category row was blank, the
explorer's chip row nearly empty and the `/pms/category/[slug]` pages thin.

`scripts/enrich-pms-categories.mjs` fills it in from the only category signal
the feed actually carries — the manager's own name for the product.

```bash
npm run enrich:categories > categories.csv     # dry run; CSV to the file, summary on screen
npm run enrich:categories -- --apply           # patches Sanity
```

**It does not guess.** A category is proposed only when the strategy name
literally contains a category token (`Small Cap`, `Flexi`, `Multi Asset`,
`Debt`, `Quant`, …). Anything else stays uncategorised, because a wrong
category on a public comparison page is worse than a blank one. Three
consequences worth knowing:

- `Mid & Small Cap` is reported as **ambiguous on purpose**. It spans two
  bands and has no canonical value; the rule exists so those names don't fall
  through to `Smallcap`, which they are not. Hand-map them.
- Cap bands outrank style words, so `Small Cap Value` is `Smallcap`. `Value`
  and `Growth` are matched last — they are marketing adjectives far more often
  than they are categories.
- `Quantum` (a real manager) never matches `Quant`.

**It never overwrites.** `--apply` patches only documents whose `category` is
absent, each with its own `_rev` as `ifRevisionID`, so a value typed in the
Studio between the read and the write aborts the mutation instead of being
clobbered. The dry run also lists documents whose *stored* category disagrees
with their name — it changes nothing there, but those are usually data errors.

### The residue

Strategies with no category token in the name are the residue, and they are
hand-mapped in `scripts/pms-category-overrides.json` — **committed**, read on
every run, and applied ahead of the keyword table, so a manual decision
survives every future APMI import. The dry run's CSV is the worksheet: rows
with an empty `proposedCategory` are the ones still to decide.

### Adding a category value

The script can propose fourteen values, but the `category` field only accepts
the eight in its Sanity option list. A proposal outside that list is reported
as **blocked** and not written — a value outside the list reads as an invalid
selection in the Studio, where the next editor to open the document can clear
it in one click. To unlock one, add it in all three places and re-run:

| file | what to add |
|---|---|
| `sanity/schemas/pmsStrategy.ts` | the value in `options.list` |
| `scripts/import-pms.mjs` | the value in `VALID_CATEGORIES` |
| `lib/pms.ts` | a `PMS_CATEGORIES` entry, or the landing page gets a generic intro |

`--allow-new-categories` writes them anyway. Use it knowing the Studio will
flag every one of those documents.

### Why this survives the monthly import

`import-pms.mjs` carries `category` forward from the existing document when
the CSV doesn't supply one (`if (!doc.category && prev.category)`), and it
validates `VALID_CATEGORIES` against the **CSV** value only — never against
the carried-forward one. So an enriched category is neither wiped nor able to
abort next month's import.

## Compliance notes

- Every row must carry `asOfDate` and `source` — the importer refuses rows
  without them. The page should always display both.
- Categories are never read out of APMI's own data. The enrichment pass above
  works on the strategy name and on hand decisions, and declines to guess.
- Returns are historical disclosures, never projections. Keep `notes`
  educational ("focused on smallcap value since 2014"), never
  recommendation-shaped ("best PMS", "will outperform").

## Later: full automation

This importer is deliberately CSV-first so the numbers you publish are the
numbers you saw. If APMI's site exposes a stable data endpoint, a fetch
step can be added in front of the same validation + upsert pipeline (e.g.
as a Netlify scheduled function) — the Sanity side of this script needs no
changes for that.
