# PlanMyCashflows — working rules for Claude Code

## How this project is worked on
- Specs are thought through in a separate Claude chat, then pasted here. If a
  request seems wrong, unsafe, or ambiguous, say so before implementing it.
- **Never ask the user to download a file from a session.** Commit it to a
  branch instead — files downloaded to a laptop have already been lost once.
- Nothing exists until it is committed. Every task ends with a commit and a
  pushed branch or PR — data scripts included.
- Update `docs/pms-data-import.md` whenever a pipeline changes.

## Safety
- This GitHub repo is PUBLIC. Never commit secrets, tokens, cookies, `.har`
  captures, or anything under `_local/`.
- The Sanity dataset is PUBLICLY READABLE. Nothing confidential goes into it.

## Data rules
- Unlisted shares: only the RETAIL/indicative price may be read, stored, or
  displayed. The dealer/cost price is confidential — never into Sanity, logs,
  or console output.
- Every performance figure carries `asOfDate` and `source`. Reject rows
  missing either.
- Dates are zero-padded `YYYY-MM-DD` (`2026-06-30`, never `2026-6-30`).
- PMS data comes from APMI only — never PMS Bazaar, PMS AIF World, or any
  aggregator PDF. Copyright, and their sign errors are confirmed.
- Categories are never inferred from APMI data.
- Apply the implausible-return filter (−95% to +300%) before anything reaches
  a public page.

## Architecture
- Large dynamic routes pre-render a top-N slice in `generateStaticParams` and
  rely on ISR for the long tail. Never pre-render all ~1,700 PMS pages — it
  pushed builds past 15 minutes.
- Match data columns by tolerant label regex, never fixed column position —
  APMI reorders columns between months.
- A change that leaves a live data-backed page empty is a release blocker.
  Data pages must fall back gracefully, never to a blank state.
- Prefer `npm ci` over `npm install` so `package-lock.json` stops churning.

## Editorial
- Alpha over benchmark is the headline metric, not raw returns.
- 1M/3M/6M returns are shown but never headlined — recency bias is what this
  brand argues against. They are absolute; 1Y+ are annualised. Label the
  difference.
- Public brand is "PlanMyCashflows" only. Never name the founder, the parent
  entity, or distribution partners in user-facing copy, and never reference
  defence or armed-forces audiences.
