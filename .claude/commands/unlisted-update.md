---
description: Monthly unlisted-shares price update (dry run, gated write, logos, audit)
argument-hint: <path to price list, e.g. "UNLISTED/Dealer Price List 21-11-2026.xlsx">
---

Run the monthly unlisted update for the price list at: $ARGUMENTS

Follow `docs/unlisted-monthly-runbook.md`. If `$ARGUMENTS` is empty or the file
does not exist, stop and ask. Ignore any other file in `UNLISTED/` (e.g. a PDF
for a neighbouring date) unless told otherwise.

## Never, without my explicit OK in this chat
`--force`, `--publish`, `--adopt-names`, `--allow-drift`. Never read, print or
store the DEALER price column. Never edit or delete existing documents or
move logos by hand.

## Steps

1. **Branch.** `git status`; if not clean, stop and show me. Otherwise
   `git checkout main && git pull`. Work on main for the run. Any alias/doc
   change goes on a new branch with a PR (never merge it without showing me).

2. **Date.** Take it from the filename (`DD-MM-YYYY` → zero-padded
   `YYYY-MM-DD`). If the filename has no date, stop and ask. Workbooks carry no
   "As on" date, so always pass `--date`.

3. **Baseline.** `npm run audit:unlisted` — record flagged count, logo count,
   total docs, and the document count of the most recent existing asOfDate
   (that is "last month's updated count").

4. **Dry run.**
   `npm run import:unlisted -- "<file>" --date=<date> --dry-run`
   Summarise: as-of date, Updated / Created / Skipped, rows read, Created list,
   POSSIBLE DUPLICATE list, AMBIGUOUS list, skipped rows, ligature warnings.

5. **Gate — write only if ALL hold:**
   - AMBIGUOUS = 0
   - no company name (Created or Updated) ends in price-like digits, e.g. `(PPFAS) 19850`
   - Created ≤ 20% of rows read (rows read = the "N rows read" figure, minus blank/header rows)
   - Updated ≥ last month's count from step 3
   - no "POSSIBLE DUPLICATE" entries left unresolved
   If any fail, STOP and show me the dry-run summary and which check failed.
   Do not add aliases or override guards on your own; propose them and wait.

6. **Write.** `npm run import:unlisted -- "<file>" --date=<date>`

7. **Logos.** `npm run logos:unlisted -- "<file>"` (no `--force`; works with .xlsx).

8. **Audit.** `npm run audit:unlisted`, then report:
   - Updated / Created / Skipped
   - documents per asOfDate (new date's count)
   - flagged: before → after
   - logos: before → after (must not go down; if it does, stop and say so)
   - any dealer-price warnings from the audit (docs predating the .xlsx
     importer, anything suggesting a dealer price was stored)
   - new `needsReview` docs to clean in Studio, and any duplicates to merge

Everything is read-only except steps 6–7. Do not run `--purge-import`,
`--delete-flagged` or the clean scripts unless I ask.
