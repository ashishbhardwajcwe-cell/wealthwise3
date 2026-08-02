# Monthly data import — PMS & AIF

The PMS and AIF pages read from Sanity. These scripts turn a spreadsheet into
Sanity documents in one command, so the monthly refresh is:
**download → paste into CSV → run one command**. No Studio clicking.

```
npm run fetch:pms     -- --file scripts/apmi-report.json --asof 2026-06-30   # → scripts/pms-data.csv
npm run import:pms    -- scripts/pms-data.csv
npm run fetch:sebi-aif -- --asof 2026-06-30          # → scripts/aif-data.csv
npm run import:aif    -- scripts/aif-data.csv
npm run fetch:benchmark -- --file scripts/apmi-report.json --asof 2026-06-30
```

`fetch:pms` turns one saved APMI `loadIAReport` payload into the import CSV
with **all nine return windows** (1M · 3M · 6M · 1Y · 2Y · 3Y · 4Y · 5Y · SI),
plus AUM, category and inception date. Use it instead of hand-building the
CSV: the site shipped with 1M, 3M, 6M and 2Y reading `N/A` on every strategy
page because a hand-built file simply lacked those columns, and nothing in the
pipeline noticed. `import:pms` now prints per-column coverage and refuses a
dataset whose return window is empty in every row (`--allow-gaps` to override).
Run `fetch:pms --inspect` on a new month's payload before trusting it — APMI's
field names aren't contractual, and `--inspect` shows exactly what mapped where.

The imports upsert on a stable key — PMS by `manager + name`, AIF by SEBI
**registration number** — so re-running next month **updates** the same rows,
never duplicates. Validation runs before anything is written; a bad row aborts
the whole import with a line number. See
[the AIF directory](#aif--a-sebi-registry-directory--performance-for-select-funds)
below for how `fetch:sebi-aif` pulls SEBI's registered-AIF list.

`fetch:benchmark` keeps the S&P BSE 500 TRI **benchmark** the explorer measures
alpha against current — it's a Sanity document now, not a hardcoded constant.
It reads APMI's own investment-approach report (`loadIAReport`) and, if that
carries the benchmark TRI row, upserts it. If it doesn't, it prints an
`UPDATE BENCHMARK MANUALLY in Sanity Studio` notice and writes nothing — it
never scrapes third-party sites for the figure. See
[Benchmark (S&P BSE 500 TRI)](#benchmark-sp-bse-500-tri) below.

Required env (in `.env.local` or the shell):

```
NEXT_PUBLIC_SANITY_PROJECT_ID=...
SANITY_API_TOKEN=...            # Editor (write) token from sanity.io/manage
```

---

## Where to get the data (ranked)

### PMS — use APMI, not AMFI

AMFI covers **mutual funds only** — PMS data was never there, which is why
searching it felt hopeless. The body you want is **APMI (Association of
Portfolio Managers in India, apmiindia.org)**. Since SEBI's 2023 circular,
every registered portfolio manager must report standardised monthly TWRR
performance to APMI, and APMI publishes it:

1. **APMI website → "Monthly Reports" / investment-approach performance.**
   Free, official, standardised methodology (TWRR net of fees), covers every
   SEBI-registered strategy. This is the same underlying dataset PMS Bazaar
   dresses up. You can filter by strategy and copy a month's table in one go —
   one page for the whole industry, not one search per manager.
2. **SEBI website → Portfolio Managers → monthly reports** — the same data,
   uglier layout. Use it to spot-check.
3. **PMS Bazaar / AIF & PMS Experts** — commercial aggregators. Their numbers
   are the managers' APMI submissions, but the *compilation* is their
   copyrighted work product. Don't scrape or bulk-copy it. If you have a paid
   subscription that permits export for your own site, that's a licensing
   question to confirm with them in writing — otherwise stick with APMI, which
   is free and authoritative.
4. **Manager factsheets** — you're empanelled with many of these firms; their
   monthly factsheet emails are a legitimate direct source. Use them to fill
   AUM and fee columns APMI doesn't carry.

Monthly routine (~15 minutes for a 20-strategy list):
1. Open APMI's monthly performance page after the ~10th (previous month's
   data is in by then).
2. Copy the rows for the strategies you track into `scripts/pms-data.csv`
   (start from `scripts/pms-template.csv`; column order doesn't matter).
3. Set `asOfDate` (YYYY-MM-DD, month-end) and `source`
   (e.g. `APMI monthly report, Jun 2026`) — both are mandatory, for
   SEBI-compliance attribution on the site.
4. `npm run import:pms -- scripts/pms-data.csv`
5. Refresh the benchmark from the same report:
   `npm run fetch:benchmark -- --file scripts/apmi-report.json --asof <month-end>`
   (see [Benchmark](#benchmark-sp-bse-500-tri) — it prints a manual-update
   notice if APMI didn't carry the S&P BSE 500 TRI row that month).

### Benchmark (S&P BSE 500 TRI)

The explorer's alpha, consistency dots and "beat benchmark only" filter all
compare each strategy against the **S&P BSE 500 TRI**. That series lives in
Sanity as a single `benchmark` document (Investment Data → *Benchmark (S&P BSE
500 TRI)*), refreshed each month next to the strategy returns.

APMI's investment-approach report (`loadIAReport`) publishes the benchmark TRI
rows alongside the strategy rows, so it's the same official source — no
third-party site involved. Two ways to run it:

```
# Save the APMI loadIAReport JSON payload, then:
npm run fetch:benchmark -- --file scripts/apmi-report.json --asof 2026-06-30 \
    --source "APMI monthly report, Jun 2026"

# Or, if the endpoint is reachable from where you run it:
npm run fetch:benchmark -- --url "$APMI_REPORT_URL" --asof 2026-06-30
```

Add `--dry-run` to see the document it would write without touching Sanity.

If the response **doesn't** carry the S&P BSE 500 TRI row (or you didn't hand
it a report), the script prints an `UPDATE BENCHMARK MANUALLY in Sanity Studio`
notice and writes nothing. In that case open the Benchmark document and fill in
1M/3M/6M/1Y/2Y/3Y from the APMI table by hand. Leave **5Y** and **SI** blank
unless APMI carries a clean like-for-like TRI series — the site suppresses
alpha for any window the document leaves empty. The site always falls back to
the last stored benchmark, so it never crashes or blanks while you catch up.

### Unlisted shares — daily partner price list

Mode 2 of the unlisted section: indicative prices come from the distribution
partner's daily "Unlisted Shares Price List" (PDF or CSV) and live in the
`unlistedShare` documents.

```
npm run import:unlisted -- pricelist.pdf --dry-run     # preview first
npm run import:unlisted -- pricelist.pdf               # write
npm run import:unlisted -- prices.csv --date=2026-07-22
npm run import:unlisted -- --seed-editorial            # one-time content seed
npm run audit:unlisted                                 # read-only health check
npm run test:unlisted                                  # parser/guard self-test
```

The PDF's "DATE 22 Jul 2026" header sets the as-of date (`--date` overrides;
everything is zero-padded ISO). Matching runs slug → aliases → normalised
company name, and truncated list names ("Motilal Oswal Home Fin…") match by
unique prefix. Matched docs get price/lot/depository refreshed — never their
company name or slug. Unmatched rows are auto-created with `needsReview`, stay
**off the site**, and wait in Studio → Investment Data → *Unlisted Shares
(needs review)*.

**Image-only PDFs (OCR).** The partner's designed export draws every price as
a vector outline with no text layer, so text extraction finds nothing. The
importer detects this (0 text rows — or a text layer whose names come back with
prices fused onto them, see the guards below) and falls back to OCR:
it renders each page and reads it with tesseract.js (bundled — fully offline,
~5s/page). The retail price is recovered from per-glyph geometry (the ₹ symbol
mis-OCRs as a leading `3`/`R`/`%`), and the **dealer column is excluded by its
x-position** — never read. When OCR can't read a price cleanly (e.g. it turns
`24` into `2%`), that row is **skipped and listed** for manual entry rather
than risk a wrong number — expect a handful per list. OCR mode needs the
`tesseract.js`, `@tesseract.js-data/eng`, `@napi-rs/canvas` and `pdf-parse`
devDependencies (`npm install`).

> **Confidential:** the partner list also shows a dealer (cost) price. The
> importer never captures that column, and the schema has no field for it —
> the Sanity dataset is publicly readable. Don't "improve" either side.

**Pre-write guards (added after the 31-Jul-2026 incident).** The importer now
refuses to write rather than publish a bad parse:

1. **Fused names discard the text layer.** `parsePriceListLine` takes *the last
   number before the depository column* as the retail price. That holds for the
   documented column order (name · retail · depository · dealer · lot) and
   breaks the moment the extracted text carries a second numeric column before
   the depository — the parser then stores the **wrong column** and leaves the
   real price welded onto the company name. When any parsed name comes back with
   price digits on it, the whole text-layer parse is thrown away and the pages
   are re-read with OCR, which cuts the name at the price column's x-position
   and cannot fuse the two.
2. **No silent downgrade.** If OCR can't run (missing dependencies, unreadable
   pages) the import **aborts**. It never falls back to a text-layer parse it
   just proved untrustworthy. Run `npm ci`, or get the list as CSV.
3. **Name check on every path** — PDF text, OCR and CSV alike. A name ending in
   a separate 3+ digit number, or carrying a `₹` amount, aborts the run. Real
   names keep their digits: `Bira 91`, `Cars24`, `B9 Beverages` all pass.
4. **Row-count band and creation ceiling.** The row count must sit within
   60–150% of the previous import, and a run may not create more than 20% new
   companies against a non-empty dataset. `--allow-drift` relaxes *these two*
   for a genuinely reshaped list or a first import. Nothing relaxes (3).

**Auditing what is already in Sanity.** `npm run audit:unlisted` lists every
`unlistedShare` document and flags any whose `company` ends in digits, has an
unbalanced bracket, contains the list's "Unlisted Shares" boilerplate, or is a
near-duplicate of another document once trailing digits are stripped. For each
one it prints the price, lot, partner, as-of date, whether it is publicly
visible, and whether a **clean twin** survives.

```
npm run audit:unlisted                                # read-only, writes nothing
npm run audit:unlisted -- --as-of=2026-08-01          # scope everything to one import
npm run audit:unlisted -- --from=dump.json            # rehearse against a dump, offline
npm run audit:unlisted -- --delete-flagged            # remove corruptions that have a clean twin
npm run audit:unlisted -- --purge-import=2026-08-01   # remove one bad import
```

Every run opens with a **documents-by-asOfDate breakdown**, which is how you
pick the date to purge and confirm the discriminator before acting on it.

`--delete-flagged` deletes a document only when the name carries a corruption
signature **and** a clean document for the same company still exists. A
corruption with no twin, an ambiguous twin, or any hand-curated content
(summary, sector, risks, logo, IPO status) is printed for manual review and
left in place — it will never leave a company with no document at all.

`--purge-import=YYYY-MM-DD` is for a whole bad import, where nothing has a twin
because every document is new. It deletes documents carrying that `asOfDate`
**and** a corruption signature. It refuses to run without an explicit
zero-padded date, prints the complete list first, requires the exact phrase
`PURGE <date>` typed on stdin (closed stdin is not consent), refuses a purge
that would empty the dataset, and re-reads the dataset afterwards so the
resulting count is observed rather than predicted.

> **The date is the discriminator, not the name.** `Sterlite Grid 5`,
> `Zepto Unlisted Shares (Equity)`, `Signify Innovations (Previously Ph`,
> `Sterlite Electric Limited (Formerly` and `Fusion Techstack Limited (Forme`
> are genuine 22-Jul documents — live, correctly priced, two with
> hand-extracted logos — and every one of them trips a name signature. Purging
> on signatures alone destroys them. `--purge-import` intersects signature with
> `asOfDate` and never uses either alone.

A document carrying the purge date but a **clean name** is never deleted: it is
a real company whose price the bad run overwrote, so the document must stay and
only the price is wrong. Those are listed separately before the confirmation
prompt — a clean name means `needsReview` is not hiding it from the site, so
they are the more urgent case. Fix them by re-importing the correct list for
that date, or by clearing `indicativePriceINR`/`asOfDate` in Studio.

Prices printed for flagged documents are **not** to be reused: the bug stored
whichever number came last before the depository column, which on the partner's
list is the dealer price.

`--seed-editorial` copies the curated Mode-1 content from
`lib/unlisted-companies.ts` (summary/sector/IPO status) onto matching docs,
creating them where absent — run it once before the first price import so the
partner names land on reviewed companies.

### AIF — a SEBI registry directory (+ performance for select funds)

The AIF page leads with a **directory**: every SEBI-registered Alternative
Investment Fund, searchable, with Cat I/II/III filters. That base comes from
SEBI's own public "Recognised Intermediaries" list — the authoritative, free
source — not from any commercial aggregator.

```
# From a machine that can reach sebi.gov.in:
npm run fetch:sebi-aif -- --asof <today>            # → scripts/aif-data.csv
npm run import:aif      -- scripts/aif-data.csv     # upserts by registration no.
```

`fetch:sebi-aif` is **polite** (sequential requests, a delay, a clear
User-Agent) and only ever reads SEBI. Because the build sandbox can't reach
sebi.gov.in, its HTML parser is a best-effort, header-driven guess — confirm it
on the first live run. If it finds 0 funds, re-run with `--dump ./raw` to save
the pages, then check the column headings. The most reliable path is offline:
save the list pages from a browser and parse them with no network at all —
`npm run fetch:sebi-aif -- --dir ./sebi-pages` (or repeated `--file`). See the
script header for every flag.

Documents are keyed by **SEBI registration number**, so re-running next month
updates rows in place. `import-aif` never wipes hand-added performance: any
column the registry CSV omits (net IRR / MOIC / fund size / fees …) is carried
forward from the existing document.

**Performance** (net IRR / MOIC / DPI / TVPI) is layered onto *select* funds as
their AMCs share factsheets — add those columns to the CSV row for that fund
(matched by registration number) and re-import, or edit the fund in Studio.
Only funds that carry performance appear in the "AIF funds on our radar"
tracker; everything else stays in the directory. Closed-ended IRRs are
vintage-specific, so the `asOfDate` on each row keeps that honest.

---

## CSV columns

**PMS** (`pms-template.csv`):
`strategyName* manager* category aumCr minInvestmentL returns1y returns3y
returns5y sinceInception feesFixed feesPerformance feesHurdle asOfDate*
source* notes`
— `category` ∈ Multicap, Largecap, Midcap, Smallcap, Thematic, Quant, Hybrid.

**AIF** (`aif-template.csv`):
`fundName* registrationNo* category registrationDate sponsor manager vintage
fundSizeCr minCommitmentCr tenorYears netIrr moic dpi tvpi feesManagement
feesCarry feesHurdle asOfDate* source* notes`
— `category` is the broad SEBI class: `I`, `II` or `III` (blank allowed).
`registrationDate` accepts `YYYY-MM-DD`, `DD-MMM-YYYY` or `DD/MM/YYYY`.
Registry rows use `source = SEBI registered intermediaries list`; the
performance columns are optional, for the funds you have factsheets for.

`*` = required. Numbers may include `%`, `₹` and commas — they're stripped.

After an import, the pages update on their next ISR revalidation (≤5 min),
or immediately on the next deploy.
