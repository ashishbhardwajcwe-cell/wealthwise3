# Monthly data import — PMS & AIF

The PMS and AIF pages read from Sanity. These scripts turn a spreadsheet into
Sanity documents in one command, so the monthly refresh is:
**download → paste into CSV → run one command**. No Studio clicking.

```
npm run import:pms -- scripts/pms-data.csv
npm run import:aif -- scripts/aif-data.csv
npm run fetch:benchmark -- --file scripts/apmi-report.json --asof 2026-06-30
```

The two imports upsert by `manager + name`, so re-running next month
**updates** the same rows — never duplicates. Validation runs before anything
is written; a bad row aborts the whole import with a line number.

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

### AIF — quarterly, not monthly

AIFs have no APMI equivalent with public strategy-level returns; closed-ended
fund IRRs are vintage-specific and mostly disclosed to investors:

1. **Manager quarterly letters / PPM data rooms** — as an empanelled
   distributor you receive these; they're the most accurate source for
   net IRR / MOIC / DPI / TVPI.
2. **CRISIL AIF Benchmarks** (free half-yearly summaries) — good for
   category-level context and sanity checks.
3. **SEBI AIF disclosures** — registration and aggregate data, not
   per-fund returns.

Same flow: fill `scripts/aif-data.csv` (template: `scripts/aif-template.csv`),
then `npm run import:aif -- scripts/aif-data.csv`. Quarterly is the honest
cadence here — the `asOfDate` shown on the site makes that transparent.

---

## CSV columns

**PMS** (`pms-template.csv`):
`strategyName* manager* category aumCr minInvestmentL returns1y returns3y
returns5y sinceInception feesFixed feesPerformance feesHurdle asOfDate*
source* notes`
— `category` ∈ Multicap, Largecap, Midcap, Smallcap, Thematic, Quant, Hybrid.

**AIF** (`aif-template.csv`):
`fundName* manager* category vintage fundSizeCr minCommitmentCr tenorYears
netIrr moic dpi tvpi feesManagement feesCarry feesHurdle asOfDate* source*
notes`
— `category` ∈ `Cat I - VC`, `Cat I - Infra`, `Cat I - Social`, `Cat II - PE`,
`Cat II - Credit`, `Cat II - RE`, `Cat II - FoF`, `Cat III - LS`,
`Cat III - Quant`.

`*` = required. Numbers may include `%`, `₹` and commas — they're stripped.

After an import, the pages update on their next ISR revalidation (≤5 min),
or immediately on the next deploy.
