# Monthly prompt: PMS portal refresh + Monthly PMS Brief

Paste everything inside the box into Claude Code on or after the **12th**,
from `~/Desktop/wealthwise3`. Change only the first line: `M` is the month
of the **data** (on 12 December you run November, so `11 2026`).

```text
MONTH: 11 2026

Monthly PMS refresh and newsletter for MONTH above (data as on that month's
last day). Use Node 20 (nvm use 20). Follow CLAUDE.md, docs/OPERATIONS.md
Parts 3 and 6, and docs/pms-data-import.md. Work on branches and open PRs.
Never send an email or post anywhere. If anything below is ambiguous or
looks wrong, stop and tell me before acting.

PART A — UPDATE THE PORTAL
1. git checkout main && git pull, then npm ci.
2. npm run archive:pms. Commit the new scripts/archive/ file.
3. Fetch: node scripts/fetch-apmi-pms.mjs M YYYY --probe, then without
   --probe. The fetch maps APMI's columns by header label. If it stops on
   an unreadable header, show me the header; don't work around it.
   Back up: cp scripts/pms-data.csv ~/Desktop/AURIS/PMS/pms-data-<date>.csv
4. Benchmark: npm run fetch:benchmark -- --asof <date>. Confirm the Sanity
   benchmark document is as on <date>. If it isn't, STOP and ask me for
   the six S&P BSE 500 TRI figures. Never reuse last month's.
5. Dry run: npm run import:pms -- scripts/pms-data.csv --dry-run.
   - Needs "ambiguous 0". For each ambiguous, renamed or new row, check it
     against last month's archive (AUM and return continuity). Add an
     exact-name pin to scripts/pms-pins.json with a note giving the
     evidence. Never guess. A rename should keep its existing document.
   - Explain every "would create" in a sentence. Hundreds of creates: stop.
6. I authorise the real import once step 5 shows ambiguous 0 and every
   create is explained: npm run import:pms -- scripts/pms-data.csv
7. New strategies only: npm run enrich:categories (dry run). Show me the
   summary; don't --apply without my OK.
8. Verify: node scripts/verify-pms-vs-apmi.mjs M YYYY. It must end with
   "✓ Every APMI figure is on the portal". NOT ON PORTAL or MISSING means a
   late filer or a rename: re-fetch, pin, dry-run, import, verify again.
   Report the STALE count (funds APMI didn't report this month).
9. Spot-check three live pages on planmycashflows.com/pms/<slug>: the as-on
   date, the 1M/3M/6M figures, and alpha against the new benchmark.
10. Run npm run test:pms. Commit pins and docs, open a PR.

PART B — THE MONTHLY PMS BRIEF
1. Read last month's newsletters/issues/<YYYY-MM>-pms-brief.html and keep
   its sections, markup, colours and chart slots.
2. Figures: node scripts/pms-brief-figures.mjs scripts/pms-data.csv
   --json <scratchpad>/brief.json. Print the output for me. Every number
   in the issue must come from this output; never type a number by hand.
3. Copy last month's issue to newsletters/issues/<YYYY-MM>-pms-brief.html
   and update every date, count and table. Keep the honour roll at 5 rows:
   beat the index over 1, 3 and 5Y, equity, ₹100 Cr+, one per manager,
   ranked on 3Y alpha. Reality check: the script's top candidate pair,
   unless a strategy in it was used last month. Before naming any
   manager, ask me whether it is one of our distribution partners.
4. Variety: write a fresh "From the desk" and a fresh headline built
   around what changed this month (the index's own move, the share beating
   it, a shift in the median). Don't reuse last month's sentences.
5. Charts: node scripts/pms-brief-charts.mjs <scratchpad>/brief.json
   newsletters/issues/<YYYY-MM>-pms-brief.html
6. PDF with headless Chrome (command in OPERATIONS.md Part 6, Step 4) to
   public/newsletters/PlanMyCashflows-PMS-Brief-<Month>-<YYYY>.pdf.
   Render the pages to PNG and look at them: no split charts, no
   overlapping labels.
7. Add the issue at the TOP of lib/newsletters.ts with the real page count.
   Run npm run test:newsletters.
8. Write for me in the PR description:
   (a) a short WhatsApp/text message to send with the PDF;
   (b) the email: subject, preview text, body, compliance footer.
9. Commit, open a PR listing the headline figures: beat-the-index counts
   per window, the five honour-roll names with 3Y alpha, the reality-check
   pair.

COMPLIANCE (non-negotiable)
- Source labelled APMI; every figure carries "as on <DD Mon YYYY>".
- Headline is 3-year alpha over the S&P BSE 500 TRI. 1M/3M/6M may appear
  but are never headlined. 1M/3M/6M are absolute; 1Y and longer are
  annualised. Label the difference.
- No "best" or "top"; educational framing; past-performance caveat.
- Brand is PlanMyCashflows only: no founder, parent entity or
  distribution-partner names. Never mention defence or armed forces.
- Category leaders: only from curated Sanity categories, and only when a
  category holds enough strategies to mean something. Never infer a
  category from a fund's name.
```

## Why each step is there

- **Step A3, header-mapped fetch:** APMI's table has a commented-out
  "9 Months" column. A positional reader would shift every figure from 1Y
  onwards the day it returns. `scripts/apmi-html.mjs` stops instead.
- **Step A8, verify:** managers keep filing after the 12th. In October 2026
  two late filers and three renames appeared after the fetch. The verifier
  catches that; a two-page spot check can't.
- **Step B2, figures from the script:** the same computation feeds the copy
  and the charts, so they can't disagree.
