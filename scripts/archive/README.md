# PMS monthly archive

Written by `npm run archive:pms` (scripts/archive-pms.mjs), immediately
**before** each month's import overwrites the live data.

```
pms-YYYY-MM-DD.csv    every pmsStrategy document as it stood on that date, in
                      the pms-template.csv column shape, plus each document's
                      real _id in the sanityId column
pms-YYYY-MM-DD.pdf    the same data, readable — cover page, full table, source
                      footer
```

## These files are committed on purpose

**Do not add this directory to `.gitignore`.** A dated, diffable record of what
the site displayed each month is the entire point:

```bash
git diff scripts/archive/pms-2026-05-31.csv scripts/archive/pms-2026-06-30.csv
```

answers "what changed between these two months, and when" directly — which is
the question a compliance query, a manager dispute, or a "this figure looks
wrong" email actually asks. The data is public (APMI publishes it), so there is
nothing here that shouldn't be in a public repo.

The `sanityId` column also makes an archive the easiest source for filling in
`scripts/pms-pins.json`: it maps every strategy name to the document id that
was holding it.

The date in a filename is the **data's** as-on date, not the day the script
ran. `archive-pms.mjs` refuses to overwrite an existing archive for a date
unless `--force` — rewriting a past snapshot is the one thing an audit trail
must not do.
