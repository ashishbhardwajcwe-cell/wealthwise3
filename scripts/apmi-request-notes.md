# APMI `loadIAReport` — the request, and how to capture it again

This file exists so the PMS data pipeline can be rebuilt from scratch. The
fetcher reads APMI's investment-approach report; this is the note on where
that report comes from and what shape it has.

> **Status: recovered from source, not from a live capture.** The request
> shape below was reconstructed from the recovered `fetch-apmi-pms.mjs`, which
> encodes the POST it was written against. It has **not** been re-verified
> against a live APMI response, and that fetcher currently returns **0 rows
> for all 8 tab combinations** — see "Why it returns nothing". Treat the
> parameter names as reliable and the behaviour as suspect.

---

## Never record here

This repository is **public**. The following must never appear in this file,
in `scripts/`, in a commit message, or in any tracked file:

- `Cookie` / `Set-Cookie` headers, session ids, `ASP.NET_SessionId`
- `Authorization` headers, bearer tokens, API keys
- `X-CSRF-Token` / `__RequestVerificationToken` values
- Anything from `request.headers` or `response.headers` at all

Record only: the **endpoint**, the **HTTP method**, and the **non-sensitive
body parameters** (report month, category filter — the things that select
*which* data, not *who* is asking).

`.har` and `.harfile` are gitignored repo-wide. If the endpoint turns out to
need a session cookie, that is a runtime secret: put it in `.env.local`
(already gitignored) and read it via `process.env`, never inline.

---

## Request

The IA Performance page posts a form; the fetcher replays it once per
strategy-type × service-type combination.

| | |
|---|---|
| Host | `www.apmiindia.org` |
| Action | `loadIAReport` |
| Method | `POST` |
| Content-Type | `application/x-www-form-urlencoded` (built with `URLSearchParams`) |
| Full path | **unconfirmed** — recover it from a fresh capture |
| Auth required? | **unknown** — the 0-row result may or may not be a session problem |

### Body parameters (non-sensitive only)

| parameter | example | what it selects |
|---|---|---|
| `strategyname` | `Equity` | one of `Equity`, `Debt`, `Hybrid`, `Multi Asset` |
| `servicetype` | `D` | `D` = Discretionary, `N` = Non-Discretionary |
| *(two empty fields)* | `""`, `""` | provider / investment-approach text filters, blank to get everything |
| `fromMonth` | `6` | report month, unpadded integer |
| `fromYears` | `2026` | report year |
| `asOnDate` | `2026-6-30` | month-end — see the date defect below |

### The tabs

4 strategy types × 2 service types = **8 requests per month**. Every tab must
be non-empty for a month to be considered complete:

```
Equity / D        Equity / N
Debt / D          Debt / N
Hybrid / D        Hybrid / N
Multi Asset / D   Multi Asset / N
```

### Response row layout

The newest recovered copy carries the comment *"Data-row layout (verified):
Provider, IA, AUM, 1M, 3M, 6M, 1Y, 2Y, 3Y, 4Y, 5Y, SI (12 cells)"* — an HTML
table, parsed **positionally**.

That positional parse is itself a defect. APMI reorders columns between
months; the moment it does, every return silently lands in the wrong field.
A replacement should match on header labels, the way `scripts/apmi.mjs`
(`PERIOD_SPECS`) already does for the benchmark row.

---

## Why it returns nothing

Running the recovered fetcher for June 2026 produced:

```
Equity / D: 0 strategies        Equity / N: 0 strategies
Debt / D: 0 strategies          Debt / N: 0 strategies
Hybrid / D: 0 strategies        Hybrid / N: 0 strategies
Multi Asset / D: 0 strategies   Multi Asset / N: 0 strategies
✓ Wrote 0 strategies to pms-data.csv
```

All 8 combinations empty means the failure is upstream of the per-tab logic —
the request is rejected, or the response no longer contains the table the
parser looks for. Candidates, cheapest first:

1. **`asOnDate` is malformed.** It is built as
   `` `${year}-${Number(month)}-30` `` → `2026-6-30`: the month is not
   zero-padded and the day is hardcoded to 30. Wrong for every 31-day month
   and for February, and quite possibly rejected outright. Fix it to a padded
   real month-end first — it is one line and it is wrong regardless of whether
   it is *the* cause.
2. **The endpoint moved**, or now requires a session cookie / CSRF token.
3. **The HTML changed** and the positional parse finds no rows.

Distinguishing (1) from (2)/(3) needs one real response. Capture it and
compare — do not guess.

Note also that the fetcher's default output path is `pms-data.csv` (repo
root), not `scripts/pms-data.csv`. Pass `--out scripts/pms-data.csv`, or the
import step will look in the wrong place.

---

## The capture on hand is not a capture

`~/Downloads/[www.apmiindia.org.har](https://www.apmiindia.org.har)` is
**155 bytes**. A HAR of a real page load is hundreds of KB at minimum. That
file is a saved markdown link — its *name* is literally markdown link syntax —
not a DevTools export. There is nothing in it to parse, which is why the `jq`
extraction found no entries.

**Re-capture properly:** DevTools → Network → tick **Preserve log** → load the
IA Performance page and run the search → right-click the request list →
**Save all as HAR with content** (not "Copy as HAR" on a single row).

Verify before using it:

```bash
ls -lh capture.har                       # hundreds of KB, not bytes
jq '.log.entries | length' capture.har   # tens or hundreds, not null
```

### Extracting the payload — without the headers

Do this rather than committing or pasting the capture. It reads only the
response **body**; cookies and auth headers are never touched.

```bash
# 1. Confirm which entry is the report call
jq -r '.log.entries[] | select(.request.url | test("loadIAReport"; "i"))
       | "\(.request.method)  \(.request.url)"' capture.har

# 2. Request shape — method, URL, query names/values, body. Review this
#    output before pasting it anywhere; it should contain no credentials.
jq -r '[.log.entries[] | select(.request.url | test("loadIAReport"; "i"))][0]
       | "METHOD: \(.request.method)",
         "URL:    \(.request.url | split("?")[0])",
         "QUERY:  \([.request.queryString[]? | "\(.name)=\(.value)"] | join("&"))",
         "BODY:   \(.request.postData.text // "(none)")"' capture.har

# 3. The response body only → the file the fetcher reads
jq -r '[.log.entries[] | select(.request.url | test("loadIAReport"; "i"))][0]
       .response.content.text' capture.har > scripts/apmi-report.json
```

If step 3 produces an empty file, the HAR was saved without response bodies —
re-export with content.

---

## The five recovered copies — which one to build on

The fetcher was never tracked in git and survived only as loose copies. All
five date from 13 Jul 2026, within 30 minutes of each other:

| file | size | modified | CSV header |
|---|---|---|---|
| `Desktop/AURIS/PMS/fetch-apmi-pms.mjs` | 7.3 K | 01:43 | 9 periods, no `returns9m` |
| `Downloads/fe/fetch-apmi-pmsold.mjs` | 7.3 K | 01:43 | same as above (duplicate) |
| `Downloads/fe/fetch-apmi-pms (1).mjs` | 7.9 K | 01:52 | — |
| `Downloads/fe/fetch-apmi-pms.mjs` | 7.9 K | 01:59 | **emits `returns9m`** |
| `Downloads/fetch-apmi-pms.mjs` | 5.6 K | **02:13** | **exact template match** |

**Build on the 02:13 copy**, for three reasons:

- It is the newest, and its header comment marks the 12-cell row layout as
  *verified* — the others don't claim that.
- Its CSV header matches `scripts/pms-template.csv` exactly. The 01:59 copy
  emits a `returns9m` column that no template, schema field or importer branch
  knows about; `import-pms.mjs` now reports it as an unrecognised column, but
  the 9-month figure it carries has nowhere to go.
- It gained `--min-aum`, so it is the furthest along.

It is smaller only because the comment block was condensed.

⚠️ The copy restored into `scripts/` during the local recovery was the
**01:59** one — the `returns9m` variant. Re-copy from the 02:13 file before
doing further work on it.

---

## How this relates to `scripts/fetch-pms.mjs`

Two different front doors to the same data:

- **`fetch-apmi-pms.mjs`** (recovered, currently returning 0 rows) hits APMI's
  endpoint live and parses the HTML table. No manual capture needed — when it
  works.
- **`fetch-pms.mjs`** (`npm run fetch:pms`, on main) reads a *saved*
  `loadIAReport` payload and maps it by label, with `--inspect`, `--probe`,
  `--map` and a per-period fill-rate report.

They are complementary: the first removes the manual capture step, the second
is robust to APMI renaming its fields. The end state is one fetcher with both
properties — live retrieval plus label-based mapping. Until the live request
is working again, `fetch-pms.mjs` on a captured payload is the path that runs.

```bash
npm run fetch:pms -- --file scripts/apmi-report.json --inspect   # check the mapping
npm run fetch:pms -- --file scripts/apmi-report.json --probe     # eyeball 3 records
npm run fetch:pms -- --file scripts/apmi-report.json --asof 2026-06-30
npm run import:pms -- scripts/pms-data.csv
```
