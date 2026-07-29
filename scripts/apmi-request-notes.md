# APMI `loadIAReport` — how to capture the payload again

This file exists so the PMS data pipeline can be rebuilt from scratch. The
fetcher (`scripts/fetch-pms.mjs`) reads a saved copy of APMI's
investment-approach report; this is the note on where that copy comes from.

> **Status: placeholders.** The values below have NOT been filled in from a
> real capture yet — the DevTools HAR lives on a local machine and was not
> reachable from the environment this file was written in. Fill in every
> `TBD` from your own capture using the commands below, and delete this
> notice. Everything outside the `TBD`s is safe to rely on.

---

## Never record here

This repository is **public**. The following must never appear in this file,
in `scripts/`, in a commit message, or in any tracked file:

- `Cookie` / `Set-Cookie` headers, session ids, `ASP.NET_SessionId`
- `Authorization` headers, bearer tokens, API keys
- `X-CSRF-Token` / `__RequestVerificationToken` values
- Anything from `request.headers` or `response.headers` at all

Record only: the **endpoint URL**, the **HTTP method**, and the
**non-sensitive body/query parameters** (report month, category filter, page
size — the things that select *which* data, not *who* is asking).

`.har` and `.harfile` are gitignored repo-wide. If APMI's endpoint turns out
to need a session cookie to respond, that is a runtime secret: put it in
`.env.local` (already gitignored) and read it via `process.env`, never inline.

---

## Request

| | |
|---|---|
| Endpoint | `TBD — e.g. https://www.apmiindia.org/apmi/loadIAReport.htm` |
| Method | `TBD — GET or POST` |
| Content-Type | `TBD — e.g. application/x-www-form-urlencoded, or application/json` |
| Auth required? | `TBD — does it respond to a plain curl with no cookie?` |

### Body / query parameters (non-sensitive only)

| parameter | example value | what it selects |
|---|---|---|
| `TBD` | `TBD` | `TBD` |

Reproduce with (fill in from the table above):

```bash
# TBD — the curl equivalent, with NO -H 'Cookie: …' and NO -b flag
curl -sS 'TBD' -o scripts/apmi-report.json
```

---

## Extracting the payload from a HAR — without the headers

Do this rather than committing or pasting the capture. It writes only the
response **body**; cookies and auth headers are never read.

```bash
# 1. Confirm which entry is the report call
jq -r '.log.entries[] | select(.request.url | test("loadIAReport"; "i"))
       | "\(.request.method)  \(.request.url)"' ~/Downloads/www.apmiindia.org.har

# 2. Request shape — method, URL, query names/values, body. Review this
#    output before pasting it anywhere; it should contain no credentials.
jq -r '[.log.entries[] | select(.request.url | test("loadIAReport"; "i"))][0]
       | "METHOD: \(.request.method)",
         "URL:    \(.request.url | split("?")[0])",
         "QUERY:  \([.request.queryString[]? | "\(.name)=\(.value)"] | join("&"))",
         "BODY:   \(.request.postData.text // "(none)")"' \
   ~/Downloads/www.apmiindia.org.har

# 3. The response body only → the file the fetcher reads
jq -r '[.log.entries[] | select(.request.url | test("loadIAReport"; "i"))][0]
       .response.content.text' \
   ~/Downloads/www.apmiindia.org.har > scripts/apmi-report.json
```

If step 3 produces an empty file, the HAR was saved without response bodies —
re-capture with **"Preserve log"** on and export via *Save all as HAR with
content*.

---

## What the response actually contains

Run the fetcher's inspector — it prints the row array it found, every field
label, which label mapped to which CSV column, and everything it could not
place. That is the authoritative answer, always current:

```bash
npm run fetch:pms -- --file scripts/apmi-report.json --inspect
```

Paste the `Column mapping` and `Unmapped payload labels` sections below once
you have run it, so the next person does not have to re-derive them.

### Row array location

`TBD — e.g. $.d.Table1` (pass to `--rows-at` if the heuristic picks wrong)

### Field labels → CSV columns

| CSV column | APMI label | notes |
|---|---|---|
| `strategyName` | `TBD` | |
| `manager` | `TBD` | |
| `category` | `TBD` | |
| `aumCr` | `TBD` | check the unit — ₹ crore, ₹ lakh or rupees (`--aum-unit`) |
| `inceptionDate` | `TBD` | |
| `returns1m` … `sinceInception` | `TBD` | all nine windows |

### Open questions to answer from the capture

- **Does the payload carry each strategy's own declared benchmark?** A name
  (e.g. "S&P BSE 500 TRI", "Nifty Smallcap 250 TRI") and its returns per
  window? `--inspect`'s unmapped-label list answers this. Today every
  strategy on the site is measured against one global benchmark, which
  overstates or understates alpha for anything that isn't a broad-market
  approach. Capturing a per-strategy benchmark needs a Sanity schema field
  and an importer column, so note the answer here and raise it as its own
  change — the current CSV contract has nowhere to put it.
- **Is the report paginated or tabbed?** If it returns one category or page
  at a time, record how many calls make a full month and what parameter
  drives them, so the fetcher can be taught to walk them.
- **Does it include the benchmark/index rows** alongside the approaches?
  (`scripts/fetch-benchmark.mjs` reads those; `fetch-pms.mjs` filters them
  out of the strategy CSV.)

---

## Once captured

```bash
npm run fetch:pms -- --file scripts/apmi-report.json --inspect        # check the mapping
npm run fetch:pms -- --file scripts/apmi-report.json --probe          # eyeball 3 records
npm run fetch:pms -- --file scripts/apmi-report.json --asof 2026-06-30
npm run import:pms -- scripts/pms-data.csv
```
