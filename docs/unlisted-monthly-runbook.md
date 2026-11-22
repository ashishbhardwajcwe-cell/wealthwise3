# Unlisted shares — monthly update runbook

The job: a new partner price list arrives, prices on the site refresh, new
companies wait for review, logos stay as they are. Budget 10–15 minutes.

This file is also the context to paste into a Claude Project, so a fresh Claude
Code session each month starts knowing the rules rather than rediscovering them.

---

## Ground rules (these do not change)

- **Only the RETAIL price may be stored.** The partner's list carries a DEALER
  (cost) price beside it. It must never reach Sanity, a log, or console output.
  The Sanity dataset is publicly readable and the project id ships in the client
  bundle, so "it's only in the API" is not a defence. There is no field for it
  on the schema; keep it that way.
- **Existing logos are never replaced.** Logos are hand-extracted and cannot be
  re-created from the list. `npm run logos:unlisted` already skips any document
  that has one. Never pass `--force` unless you intend to overwrite.
- **Never touch an existing document's `company` or `slug` from partner data.**
  Partner names are noisy; our names are curated. The importer only ever appends
  a raw list name to `aliases`.
- Dates are zero-padded `YYYY-MM-DD`.
- Auto-created companies land with `needsReview: true` and stay off the site
  until a human clears them in Studio.

## What goes wrong, and what now stops it

The 31-Jul-2026 run read the PDF's text layer instead of OCRing it, stored the
**dealer** column as the price, welded the retail price onto the company name
("(Manipal Cards) 385"), and created 179 duplicate documents. Nothing errored.

Four guards now stand between a bad parse and the dataset:

| Guard | Trips when | Override |
|---|---|---|
| Fused names | a parsed name carries price digits | none — it re-reads with OCR, or aborts |
| OCR unavailable | the OCR toolchain can't run | none — aborts rather than fall back |
| Row-count band | row count outside 60–150% of last import | `--allow-drift` |
| Creation ceiling | run would create >20% new companies | `--allow-drift` |

`--allow-drift` is for a list that genuinely grew. It is **not** for pushing a
bad parse through. If the names in the dry-run look wrong, the parse is wrong.

---

## The monthly run

### 1. Drop the new file in the UNLISTED folder

Keep the partner's filename. The importer reads **`.xlsx` directly** (preferred:
no OCR, exact prices), as well as `.pdf` and `.csv`. No conversion is needed for
an Excel sheet. A workbook carries no "As on" date, so pass `--date=YYYY-MM-DD`
explicitly or the import stamps today.

### 2. Dry run

```bash
npm run import:unlisted -- "<path to the new file>" --date=YYYY-MM-DD --dry-run
```

Read the output before anything else:

- **Company names** in the Created list. Clean names with no trailing digits?
  Good. Anything like `(PPFAS) 19850` means the parse is wrong — stop, and do
  not override.
- **Updated vs Created.** A monthly list should mostly *update*. A pile of new
  companies usually means names parsed differently, not that the partner added
  a hundred companies.
- **Skipped rows.** A handful per list is normal — OCR refuses to guess a price
  it can't read cleanly. Those get entered by hand in Studio.

If it aborts on the row-count or creation guard **and** the names look right,
re-run with `--allow-drift`.

### 3. Write

```bash
npm run import:unlisted -- "<path to the new file>" --date=YYYY-MM-DD
```

### 4. Logos

```bash
npm run logos:unlisted -- "<path to the new file>"
```

Works with the `.xlsx` as well as the PDF — the workbook carries its own row
logos, so no PDF is needed.

No `--force`. Documents that already carry a logo are skipped and reported as
such; only companies new this month get one. Logos never create documents and
never change a name.

### 5. Confirm

```bash
npm run audit:unlisted
```

Check:

- **Documents by asOfDate** — the new date carries roughly the expected count.
- **flagged** — should be the same small number as last month (a few real names
  like `Sterlite Grid 5` always trip the rules; see below). A jump means the
  import went wrong and should be purged.
- **carrying a logo** — must not have gone *down*.

### 6. Review in Studio

Studio → Investment Data → *Unlisted Shares (needs review)*. Check the name and
sector, then untick `needsReview`. The site picks it up on the next
revalidation (≤5 min) or deploy.

### 7. Fundamentals (when new results or DRHP news arrive)

Fundamentals are annual, so most months there is nothing to import. When a
company files results (MCA, annual report) or a DRHP is filed/approved:

1. Copy `_templates/unlisted-fundamentals.csv` (header only; see
   `_templates/unlisted-fundamentals.example.csv` for filled rows) into
   `_incoming/` and fill it in. One row per company per FY. A row with a blank
   `fy_end` updates company-level fields only (DRHP, sector, peers, investors).
   - Money columns in **₹ crore**; `shares_outstanding` is an absolute count.
   - `source` is MCA, Tofler, DRHP or Annual report; `source_date` is required.
   - Blank means "not available". Never type 0 for a figure you don't have.
   - Identify companies by **`slug`** (as in Studio) or **`cin`**. Never by
     name. The first import for a company needs its slug.
   - The CSV has **no price column**. The retail price comes from Sanity at
     snapshot time. Any price, dealer, cost or buy column aborts the import.
2. Dry run, then write:

```bash
npm run import:unlisted-fundamentals -- _incoming/<file>.csv --dry-run
npm run import:unlisted-fundamentals -- _incoming/<file>.csv
```

   Unknown slug/CIN refuses the whole file. An FY already on file with
   different figures is a **restatement**: it is refused and the changed fields
   listed. Only if the company genuinely restated, re-run with
   `--allow-restatement`. There is no `--force`.
3. The write only touches `unlistedFundamentals` documents (Studio → Investment
   Data → Unlisted Fundamentals). Prices, names, slugs and logos on the Unlisted
   Shares are never changed. The CSV is copied to
   `data/unlisted-fundamentals/imports/`. Commit it.

### 8. Monthly newsletter snapshot

After the price import (and any fundamentals import) is confirmed and the
review queue is cleared:

```bash
npm run unlisted:snapshot -- --date=YYYY-MM-DD --dry-run   # the price import's asOfDate
npm run unlisted:snapshot -- --date=YYYY-MM-DD
npm run check:confidential
```

It writes `data/unlisted-snapshots/YYYY-MM.json` and refreshes `latest.json`.
Commit them on a branch and open a PR.

- The month is found by the price import's **asOfDate** (a date ≥20 documents
  carry), never by name.
- Per company: latest fundamentals, metrics, the 7-factor scorecard, valuation
  at that month's **retail** price, and `changesThisMonth` (results filed, DRHP
  filed/approved, auditor change, qualification added) compared with the
  previous month's file.
- **Not a buy signal.** Companies are alphabetical. Factors are never summed,
  weighted or ranked. Price momentum is never used; the price only feeds market
  cap, P/E, P/B and EV/Sales.
- Thresholds live in `config/unlisted-scorecard.json`. Change them there, and
  the next snapshot shows the new rule text.
- Missing data is `null`, with the reason in `metricNotes` and on the factor
  ("not available"). Growth outside −95%..+300% is withheld as implausible.
- **Retail price only.** The snapshot aborts if a dealer/cost/buy-style field
  exists in Sanity or the output, or "dealer" appears in the file.
  `check:confidential` re-scans the data, template and `_incoming/` folders
  (add `--staged` before committing).
- `npm run unlisted:snapshot -- --backfill` rebuilds every month in order. A
  backfilled month only includes fundamentals imported, and DRHP events dated,
  by that month's end.

---

## Known false positives — do not delete these

These are genuine documents, live with correct retail prices, two of them
carrying hand-extracted logos. Every one trips a name rule. They will appear in
the flagged list every single month. That is expected.

- `Sterlite Grid 5`
- `Zepto Unlisted Shares (Equity)`
- `Signify Innovations (Previously Ph`
- `Sterlite Electric Limited (Formerly`
- `Fusion Techstack Limited (Forme`

This is why nothing is ever deleted on a name signature alone.

---

## If an import goes wrong anyway

`asOfDate` is the discriminator, not the name.

```bash
npm run audit:unlisted                              # read the asOfDate breakdown FIRST
npm run audit:unlisted -- --as-of=<bad date>        # inspect just that import
npm run audit:unlisted -- --purge-import=<bad date> # type: PURGE <date>
```

The purge deletes documents carrying that `asOfDate` **and** a corruption
signature. It prints the full list first, requires the phrase typed out, and
re-reads the dataset afterwards.

Two things it will tell you that matter:

- **Logos about to be lost.** Deleting a document drops its logo reference. The
  plan prints `logos N now → M after`. Re-attach with `npm run logos:unlisted`
  after re-importing.
- **Clean names carrying the bad date.** Real companies whose price the bad run
  overwrote. These are *not* deleted — the document is real, only the price is
  wrong. A clean name means `needsReview` never got set, so these are rendering
  on the site. Fix by re-importing the correct list for that date, or by
  clearing `indicativePriceINR`/`asOfDate` in Studio.

If dealer prices were publicly readable for any length of time, that is a
conversation with the partner, not something the script settles.

---

## Commands

| Command | Does |
|---|---|
| `npm run import:unlisted -- <file> --date=<date> --dry-run` | parse and preview, write nothing |
| `npm run import:unlisted -- <file> --date=<date>` | write prices to Sanity |
| `npm run logos:unlisted -- <file>` | attach logos to companies that lack one |
| `npm run audit:unlisted` | read-only health check |
| `npm run audit:unlisted -- --purge-import=<date>` | delete one bad import |
| `npm run test:unlisted` | self-test the parser and the guards |
| `npm run import:unlisted-fundamentals -- <csv> --dry-run` | validate + preview a fundamentals CSV |
| `npm run import:unlisted-fundamentals -- <csv>` | write fundamentals to Sanity |
| `npm run unlisted:snapshot -- --date=<date>` | write the month's newsletter snapshot |
| `npm run check:confidential` | fail if a dealer/cost price field or term appears |
| `npm run test:unlisted-fundamentals` | self-test CSV guard, metrics, scorecard |

Env, from `.env.local`: `NEXT_PUBLIC_SANITY_PROJECT_ID` for reads,
`SANITY_API_TOKEN` (Editor) for writes.

Reference for how the pipeline works: `scripts/README.md`.
