# Monthly data import — PMS & AIF

The PMS and AIF pages read from Sanity. These scripts turn a spreadsheet into
Sanity documents in one command, so the monthly refresh is:
**download → paste into CSV → run one command**. No Studio clicking.

```
npm run import:pms -- scripts/pms-data.csv
npm run fetch:benchmark
npm run import:aif -- scripts/aif-data.csv
```

`fetch:benchmark` refreshes the S&P BSE 500 TRI series (the Sanity
`benchmark` document) that alpha is computed against. It tries APMI's
loadIAReport endpoint; when the response carries no parseable benchmark TRI
row it prints an **UPDATE BENCHMARK MANUALLY in Sanity Studio** notice and
leaves the last stored values in place — it never scrapes third-party sites.
Useful flags: `--dry-run` (parse and print, write nothing) and
`--as-of YYYY-MM-DD` (defaults to the previous month-end).

Both upsert by `manager + name`, so re-running next month **updates** the same
rows — never duplicates. Validation runs before anything is written; a bad row
aborts the whole import with a line number.

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
