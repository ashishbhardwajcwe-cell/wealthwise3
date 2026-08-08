# PlanMyCashflows — Master Operations Manual

## Version 3.2 · 8 August 2026

**Assume nothing. Follow exactly. Every command is written out in full.**

> **What changed in V3.2:** the logo import (Part 2 step 9) now matches a row to
> a document using the same rules and the same `scripts/unlisted-aliases.json`
> as the price import, so an alias entry fixes the picture as well as the price.
> The dry run writes **every** crop, named by the document's slug and split into
> three folders — what will upload, what already has a logo, and what matches
> nothing — so the review folder and Studio line up.
>
> **What changed in V3.1:** `npm run clean:unlisted-names` (Part 2 step 6) now
> strips the list's row boilerplate off the END of a name as well as OCR junk
> off the front, so "Bazar India Unlisted Shares" becomes "Bazar India" — that
> is the same rule the matcher uses, and it clears the one thing `--approve-all`
> refuses to publish. `npm run approve:unlisted -- --hide=<slug>` is new: it
> takes a live document back off the page without deleting it. And the audit no
> longer cries wolf — the "price is not trustworthy" warning is now limited to
> documents that predate the Excel importer, and "Sterlite Grid 5" is no longer
> flagged for ending in a digit.
>
> **What changed in V3:** UnlistedZone now send the daily list as `.xlsx`
> instead of PDF (1.3), so Part 2 no longer depends on OCR. Part 2 gains the
> per-sheet row counts, the relaxed-match list to read before importing, and
> the three Excel-specific aborts (2.8). Logos now come out of the workbook as
> the partner's own embedded images, with a dry run you can flip through in
> Finder before anything is attached (Part 2 step 9, and 5.3). Matching now
> bridges our OCR-damaged stored names onto the partner's clean ones, and
> `--adopt-names` (Part 2 step 5b) can repair ours from theirs. The tail that
> heuristics cannot safely reach is declared in `scripts/unlisted-aliases.json`,
> and `npm run clean:unlisted-dupes` (step 6b) merges the duplicates the first
> Excel run created. `npm run approve:unlisted` (step 6c) reviews and publishes
> the new companies as one table instead of one Studio visit each.
>
> **What changed in V2:** the dealer-price leak is resolved and that section now
> records how it was done. New: a repair procedure for wrong numbers (Part 9), a
> full recovery procedure for a bad import (Part 10), a Git problems section
> (Part 11), the mandatory spot-check after every unlisted import, and the repo
> hygiene rule that would have prevented the credentials incident.

---

# PART 0 — THE ABSOLUTE BASICS

Read this once. Everything after assumes you know Part 0.

## 0.1 — The three tools, and what each is for

| Tool | What it is | What you use it for |
|---|---|---|
| **Terminal** | The black text window on your Mac | Fetching and importing data |
| **Claude Code** | The app with the repo chip at the bottom | Changing the website's code |
| **Sanity Studio** | A website: planmycashflows.com/studio | Editing content and data by hand |

**The rule:** Terminal runs the data. Claude Code changes the code. Studio edits
by hand. They are not interchangeable. If a step says "Terminal", do not paste it
into Claude Code.

## 0.2 — How to open Terminal

1. Press `Cmd` + `Space`. A search box appears.
2. Type: `terminal`
3. Press `Enter`.

A window opens with text ending in `%`. That's Terminal.

## 0.3 — Getting into the right folder — EVERY TIME

Terminal starts in your home folder. Your project is not there. **First command
of every session, no exceptions:**

```
cd ~/Desktop/wealthwise3
```

**Check it worked:** the text before `%` must end in `wealthwise3`.

- ✅ `ashishbhardwaj@Ashishs-MacBook-Air-5 wealthwise3 %`
- ❌ `ashishbhardwaj@Ashishs-MacBook-Air-5 ~ %`

If it shows `~`, every command will fail with `Could not read package.json`.

## 0.4 — Running a command

1. Click inside the Terminal window.
2. Copy the command (`Cmd`+`C`), click in Terminal, paste (`Cmd`+`V`).
3. Press `Enter`.
4. **Wait.** Some take 2–5 minutes. Terminal looks frozen. It isn't. Don't press
   anything.
5. It's finished when the `%` prompt returns.

**Paste ONE command at a time.** Never a block. If one fails, the rest run anyway
and make it worse.

## 0.5 — Start-of-session commands

After `cd ~/Desktop/wealthwise3`, run these one at a time:

```
git pull --no-edit
```

```
npm ci
```

**`--no-edit` matters.** Without it Git may open a text editor you can't escape
(see 11.2). Always include it.

`npm ci` takes ~40 seconds and prints "deprecated" warnings. **Warnings are
normal. Ignore them.** Only `error` matters.

## 0.6 — One-time setup (run these once per Mac)

```
git config --global core.editor "nano"
```

```
git config --global pull.rebase false
```

```
git config --global push.autoSetupRemote true
```

These prevent the three most common Git traps. If you set up a new machine, run
them there too.

## 0.7 — Reading output

| You see | Meaning |
|---|---|
| `warn` / `Warning` / `deprecated` | **Ignore.** Always appears. |
| `ExperimentalWarning` | **Ignore.** |
| `Using <img> could result in slower LCP` | **Ignore.** Cosmetic. |
| `✓` | Good |
| `ABORTED` | **STOP.** A safety guard blocked it. Read why. |
| `error` / `Error` | **STOP.** Read the message. |
| `No such file` | The path is wrong |
| `Type exactly PURGE...` | It's waiting for you. Nothing has happened yet. |

## 0.8 — Where files live

| What | Where |
|---|---|
| The project (code only) | `~/Desktop/wealthwise3` |
| Unlisted price files (.xlsx/.pdf) | `~/Desktop/wealthwise3/UNLISTED/` |
| PMS archives | `~/Desktop/wealthwise3/scripts/archive/` |
| Newsletter templates | `~/Desktop/wealthwise3/newsletters/templates/` |
| **Everything else** | `~/Desktop/AURIS/` |

**THE REPO HYGIENE RULE — READ THIS TWICE**

`~/Desktop/wealthwise3` is a **public** GitHub repository. Anything you put in
that folder is one careless command away from the internet.

**Never place in it:** credentials or key files, videos, competitor reports,
client documents, invoices, scanned papers, anything confidential.

**Those go in `~/Desktop/AURIS/`.**

On 2 August, Google Cloud credentials were nearly pushed to the public repo.
GitHub blocked it. It won't always.

**THE 1 MB RULE**

Git keeps **every version of every file forever**. A file committed once stays in
the repository's history even after you delete it — there is no clean way to
remove it later. So the only moment that matters is before you commit.

**Before adding any file over 1 MB, ask: is this part of the website?**

- **Yes** (a blog image users will see) → compress it first at
  **tinypng.com**, then commit. A 7 MB PNG becomes 300 KB with no visible
  difference.
- **No** (music, video, a PDF, a report, a scan) → it goes in
  `~/Desktop/AURIS/`, never the repo.

| Type | Where it goes |
|---|---|
| Code, markdown, small compressed web images | `~/Desktop/wealthwise3` |
| Music, video, PDFs, documents, credentials, competitor reports, client files | `~/Desktop/AURIS/` |

**Blocked automatically** by `.gitignore`: `.mp4`, `.mp3`, `.mov`, `.wav`, `.zip`.
If you find yourself typing `git add -f` to force one of these in, stop — the
rule is there for a reason.

**How to check the repo's size** if it feels heavy:

```
du -sh ~/Desktop/wealthwise3/.git
```

Under 100 MB is fine. Above that, find what's large before committing anything
more:

```
cd ~/Desktop/wealthwise3
```
```
find . -path ./.git -prune -o -type f -size +1M -print0 | xargs -0 du -h | sort -rh | head
```

On 2 August the repo went from 5 MB to 50 MB in one evening — 28 MB of MP3s and
13 MB of uncompressed blog PNGs. The music was moved out; the history cost
stands. Prevention is the only cure.

## 0.9 — Getting a file's exact path (stop typing them)

1. Find the file in Finder.
2. **Right-click** it.
3. Hold `Option`. The menu changes.
4. Click **"Copy [filename] as Pathname"**.
5. Paste it **inside double quotes**: `npm run import:unlisted -- "PASTE HERE"`

Quotes matter — your filenames contain spaces.

## 0.10 — How the website updates

**Data changes** (prices, PMS returns) go to Sanity. The site re-reads on a timer
— **up to 1 hour**. No deploy needed. Hard-refresh with `Cmd`+`Shift`+`R`.

**Code changes** go to GitHub. Netlify rebuilds — **about 3 minutes**.

---

# PART 1 — CURRENT STATUS

## 1.1 — Resolved: dealer prices removed from Sanity ✅

**What happened:** a failed import on 31 July / 1 August created 179 documents
holding the partner's confidential **dealer** prices with mangled names. Marked
`needsReview` so invisible on the site, but the Sanity dataset is publicly
readable.

**How it was fixed** (2 August):

```
npm run audit:unlisted
```
```
npm run audit:unlisted -- --purge-import=2026-08-01
```
Typed `PURGE 2026-08-01` at the prompt.
```
npm run audit:unlisted
```

Result: 367 → **188 documents**. The audit confirmed the bad run only *created*
documents; it never overwrote an existing company's price.

**Keep for reference — this is now a solved problem class.** Full procedure in
Part 10.

## 1.2 — Resolved: nine wrong prices corrected ✅

A spot-check against the source PDF found OCR digit errors on live prices —
Bharat Nidhi showing ₹1,10,400 instead of ₹10,400, and eight others. All
corrected by hand in Studio.

**This is why Part 2 now has a mandatory spot-check step.**

## 1.3 — Resolved: UnlistedZone now send Excel ✅

Asked on 2 August; first `.xlsx` arrived **6 August 2026**. This removes the
entire OCR failure mode: every column is its own cell with its own header, so
no column can be misread as another, and the import verifies that the price
column it selected really is the retail one before reading a single figure.

Two consequences worth knowing about, both handled:

- **Their names are now full and untruncated**, which is exactly why matching
  had to change. Most incoming names carry a trailing "Unlisted Shares" that
  our stored names never had, and some stored names are OCR stumps of the new
  full ones. Both are matched onto the existing company instead of creating a
  duplicate, and both are listed in the import summary for checking. See Part 2.
- **The file is a conversion of their PDF** and carries a handful of font
  ligature codepoints inside company names — one glyph where two letters belong,
  in Elofic, Indofil, Market Simplified, SMILE Microfinance, Calcutta Stock
  Exchange and a few others. These are repaired on read, and every repair is
  printed so you can see what changed.

The original request email, kept in case the format ever regresses:

> Subject: Daily price list — CSV or Excel format request
>
> Hi,
>
> We're publishing your indicative retail prices on our platform daily. Reading
> them out of the PDF is proving unreliable — a formatting change on your end can
> cause us to misread a column.
>
> Could you send the daily list as CSV or Excel as well, with one column each for
> company name, retail price, depository and minimum lot size? A Google Sheet link
> that updates daily would work equally well.
>
> This would let us publish your prices faster and with no risk of transcription
> error.
>
> Thanks,
> PlanMyCashflows

## 1.4 — Open: known cosmetic issues (the Excel import fixes most of these)

These all share one cause — OCR guessing at a rendered PDF — and the switch to
Excel fixes them as the new list lands. **Do not fix by hand; you'd repeat the
work.** Re-check this list after two or three Excel imports and delete what has
gone.

- Price and date run together: "₹5222 Jul 2026" should be "₹52 · 22 Jul 2026"
- Nine duplicate pairs: your editorial entry plus an imported one (PharmEasy /
  Pharm Easy, NSE / NSE India Limited, Chennai Super Kings / I csk, boAt, OYO,
  Bira, CIAL, Care Health, Motilal Oswal Home Finance). The import will not
  choose between a pair — it reports them as `ambiguous` and skips the row, so
  merging them in Studio is still a job for you
- Truncated names ("Signify Innovations (Previously Ph", "Hindustan Power
  Exchange Limit"), stray leading characters ("EB Graand Prix Luxury Elevators
  Limi", "Rt. Hindon Mercantile Limited") and l/I/1 mix-ups ("Bvglndia
  Limited") — about 34 documents. The Excel list has the correct spelling of
  every one and the import now matches onto these rather than creating a second
  copy. `--adopt-names` (Part 2 step 5b) rewrites the stored name from the
  list, once, without moving any URL
- Row boilerplate baked into a company name ("Bazar India Unlisted Shares",
  "Gynofem Healthcare Unlisted Shares Price") on rows the first Excel run
  created from scratch — five documents. **Step 6 now strips this**; run it and
  they are gone
- ~170 of 188 show sector "Other" — only hand-curated entries have real sectors

## 1.5 — Open: PMS pins not yet filled

`scripts/pms-pins.json` holds placeholder names. Your next PMS import will stop
with "ambiguous rows". Part 3 step 7a fixes it — one time, ten minutes.

---

# PART 2 — UNLISTED SHARE PRICES (daily, weekdays)

**Time: 10 minutes. Tool: Terminal, then browser.**

> **ONE-TIME, before your next import — seed the price history.** We now store a
> `priceHistory` log per company and show a small ▲/▼ change indicator on the
> card, because the partner only ever sends today's price. A company with no
> history has nothing for tomorrow's import to compare against, so run this once
> so the *next* import is the first comparison, not the first entry.
>
> ```
> cd ~/Desktop/wealthwise3
> git pull --no-edit
> npm run seed:unlisted-history -- --dry-run     # read this — expect ~185 to seed
> npm run seed:unlisted-history                  # write
> ```
>
> The ~20 editorial companies with no price are skipped (correct). It is
> idempotent — a second run seeds nothing.
>
> **Attribute-ceiling check (also one-time).** A Sanity document may have at most
> 2000 attribute paths. These three new fields add ~5, and we are nowhere near
> the ceiling, but confirm it: open
> `https://fhpazm9i.api.sanity.io/v1/data/stats/production` **before** the seed
> and **after** the seed + your first import, and note `fields.count.value` both
> times. A jump of ~5, staying far below 2000, is expected. (~12 KB per company
> per year — negligible against Sanity's 32 MB-per-document limit.)

### Step 1 — Save the file

Save the emailed attachment into `~/Desktop/wealthwise3/UNLISTED/`, keeping their
filename. Example: `Dealer Price List 06-08-2026.xlsx`

**Since 6 August 2026 the partner sends `.xlsx`, not PDF.** That is the good
case — the import reads the spreadsheet directly, with no OCR and no guessing
which column is which, because every column has its own header. `.pdf` still
works exactly as before if they ever send one again; so does `.csv`. The
command is the same either way — the importer looks at the file extension.

Two things the Excel path prints that the PDF one didn't, both worth reading:

- **A per-sheet breakdown.** The workbook has ~21 tabs and only ~7 hold prices.
  You should see all 7 listed with a row count each, ~183 rows in total. If one
  tab shows rows and the rest show `0`, the import stops by itself.
- **"Matched by a RELAXED pass".** The Excel list writes names in full —
  `APL Metals Unlisted Shares` where we store `APL Metals`, and the whole of a
  name our old OCR had cut short. Those are matched onto the existing company
  rather than creating a second copy of it, and every one is listed so you can
  check it. **Read that list.** A wrong line there means a price landing on the
  wrong company. Each match also records the list's spelling as an alias, so
  the same name matches exactly from the next day on and the list shrinks.

### Step 2 — Open Terminal, go to the folder

```
cd ~/Desktop/wealthwise3
```

Check the prompt ends in `wealthwise3 %`.

### Step 3 — Update

```
git pull --no-edit
```

### Step 4 — Dry run — NEVER SKIP

Get the path (0.9), then:

```
npm run import:unlisted -- "PASTE_PATH_HERE" --dry-run
```

**This writes nothing.** Read the output:

- **`ABORTED`** → the file can't be read safely, or two rows landed on one of
  our documents. **Stop. Do not do Step 5.** See 2.8.
- **Names containing numbers** (`"Shares 555"`) → same. Stop.
- **Fewer than 7 sheets listed, or only one with rows** (Excel only) → stop; the
  import will have aborted by itself.
- **`⚠ CONFIRM THESE AGAINST THE PARTNER'S PDF`** (Excel only) → a company name
  contained a font ligature that appears exactly once in the whole list, so the
  letters it stands for are a judgement call. Check that one name against their
  PDF. It is not a reason to stop.
- **`unreadable depository cells`** → those rows import with no depository
  rather than a guessed one. Tell the partner; don't hand-edit.
- **`Price history:` line** → appends · in-place corrections · skips · documents
  gaining a first-ever previous price. On a normal weekday most rows are appends;
  right after the one-time seed you'll also see many "gaining a first-ever
  previous price". All-skips means you imported the same date twice (harmless).
- **Sensible names and prices** → continue.

### Step 5 — Import

```
npm run import:unlisted -- "PASTE_PATH_HERE"
```

Expect ~180 updated, few or no creations. Hundreds of creations means stop.

The first Excel run will show a long "Matched by a RELAXED pass" list — that is
the switch from PDF names to full Excel names being absorbed once. It should be
much shorter on day two and near-empty after that, because each match is
remembered as an alias. If it stays long, something is not being remembered:
say so rather than living with it.

**`AMBIGUOUS` rows are yours to decide.** When two of our documents both claim
one row, the import refuses to guess and prints both — slug, live or hidden,
current price and date, and what curated content each carries. Pick the
survivor (usually the one with the logo and summary — that is the expensive
part) and add the row to `scripts/unlisted-aliases.json`:

```
"<survivor-slug>": ["<the name exactly as the list writes it>"]
```

Commit that. Until you do, those companies keep the price they had before.

**The "Created" list comes in two parts.** "Genuinely new companies" are ones
nothing in the dataset resembles. "POSSIBLE DUPLICATE of an existing document"
means the name shares a long opening with something we already have — usually
our own name is the damaged one and the two should be one document. Fix those
in Studio (put the list's spelling in the existing doc's aliases) and re-run,
rather than letting a second copy be created.

### Step 5b — Once, after the first Excel import: adopt the clean names

Roughly 34 of our stored names are wreckage from the old OCR — `Hindustan Power
Exchange Limit`, `EB Graand Prix Luxury Elevators Limi`, `Bvglndia Limited`.
The Excel list has the correct spelling of every one. The import can take it:

```
npm run import:unlisted -- "PASTE_PATH_HERE" --dry-run --adopt-names
```

Read the `old -> new` list it prints. **Every line is a company name that will
change on the public site**, so read all of them, not a sample. When they look
right:

```
npm run import:unlisted -- "PASTE_PATH_HERE" --adopt-names
```

- **URLs never move.** The slug is left exactly as it is, so no link breaks.
- Logos, sectors, summaries and IPO status are untouched.
- The old name is kept as an alias, so it still resolves.
- A name is only ever replaced when ours carries actual damage — a cut-off
  word, stray leading characters, or an l/I/1 mix-up. A name that is merely
  shorter than the partner's is left alone.

Without `--adopt-names` the list is still printed, and nothing is renamed. You
only need this once; after it, day-to-day imports need no flag.

### Step 6 — Tidy names

```
npm run clean:unlisted-names -- --dry-run
```

It prints every rename it would make. Two kinds:

- **OCR junk off the front** — `"[J] Capgemini…"`, `"«wx Fusion…"`, `"i Urban
  Tots"`. That is the logo the old PDF list rendered next to the name.
- **Row boilerplate off the back** — `"Bazar India Unlisted Shares"` →
  `"Bazar India"`, `"Gynofem Healthcare Unlisted Shares Price"` → `"Gynofem
  Healthcare"`. Every row on the partner's sheet is headed "<Company> Unlisted
  Shares"; when a row matches nothing the importer creates the document with
  that heading baked in, and it would go onto a public page as the company's
  name. This is what step 6c refuses to publish, so run step 6 first.

A bracketed qualifier survives: `"Zepto Unlisted Shares (Equity)"` becomes
`"Zepto (Equity)"`, not `"Zepto"` — the `(Equity)` is the only thing separating
it from the CCPS line.

Read the list, then apply:

```
npm run clean:unlisted-names
```

**It only ever changes the display name.** Slugs are not touched — a slug is a
public URL — and the old name is added to that document's `aliases`, so
tomorrow's list still lands on the same document instead of creating a second
one. Safe to re-run: a name that is already tidy is left alone, and an alias the
document already has is not added twice.

Names it cannot fix confidently — a leading digit logo like `"4A …"`, or the
mangled `"BB Zepto Unlisted( Ccps Shares((79.."` — are left for a hand edit in
Studio. It will not guess.

### Step 6b — Once, after the first Excel import: merge the duplicates

The 06-Aug run created a second document for ~9 companies whose stored names
our old OCR had mangled beyond what matching can bridge. `scripts/unlisted-aliases.json`
says which list name belongs to which document. This applies it:

```
npm run clean:unlisted-dupes -- --dry-run
```

Read the three sections:

- **Alias additions** — the list's spelling is recorded on the surviving
  document, so tomorrow's import matches it exactly with no guessing.
- **Deletions** — the duplicate the 06-Aug run created. Only ever a document
  that is still hidden (`needsReview`) and carries no logo, summary, sector or
  IPO status.
- **Skipped — NOT deletable** — anything live or curated. These are printed
  with the reason and **never touched**. Merge them in Studio yourself: open
  both, move anything worth keeping onto the survivor, delete the other.

Then:

```
npm run clean:unlisted-dupes
```

Safe to re-run — an alias the survivor already has is not added twice.

It also tidies **doubled aliases**: 25 documents carry the same name twice
because the `--adopt-names` run appended an old company name the document
already answered to under a slightly different spelling. Cosmetic only — both
spellings match identically — but it makes the alias lists readable again.

### Step 6c — Publish the new companies

The import parks a company it has never seen behind `needsReview`, so it stays
off the site until someone reads it. After the first Excel run that is ~18
documents, which is 18 trips through Studio. Instead:

```
npm run approve:unlisted
```

That writes nothing. It prints one table — slug, company, price, lot,
depository, as-of date, logo — so you can scan the whole set at once, and lists
anything `--approve-all` would refuse. Then either:

```
npm run approve:unlisted -- --approve-all
```

which publishes everything **except** documents with no price, no minimum lot
size, or `"Unlisted Shares"` still in the company name — those are printed and
skipped, because that is the partner's row boilerplate and it would go straight
onto a public page. **Step 6 fixes that last one for you**; if anything is still
refused for its name after step 6, fix it in Studio and re-run.

Or publish specific ones:

```
npm run approve:unlisted -- --approve=machint-solutions-limited,vivriti-finance-limited
```

Naming a slug is your decision and is honoured even if the gate would complain
— you get a warning, not a refusal. A document that is already live is never
touched on any path, and publishing changes `needsReview` and nothing else.

**Order matters:** run 6b before 6c, and step 6 before both. Several of the
hidden documents are duplicates that 6b deletes, and there is no point reviewing
something that is about to go.

### Step 6d — Taking something back off the page

Sometimes a document that is already live should not be. The usual reason: it
carries a price no current list can refresh, so the figure is stale and nothing
will correct it.

```
npm run approve:unlisted -- --hide=bb-zepto-unlisted-ccps-shares-79
```

That sets `needsReview` back to true, which takes it off the public page. It
**deletes nothing** — the price, name, slug and aliases all stay — so when the
partner lists that line again, `--approve=<slug>` brings it straight back. You
can pass the document id instead of the slug; the audit prints ids.

A document that is already hidden is never touched, the same way an already-live
document is never re-published.

> Done once already, on 8 August 2026:
> `unlistedShare-bb-zepto-unlisted-ccps-shares-79` (the Zepto CCPS line) was
> live with a price from the old importer, a lot size of 2, and no row in the
> 06-Aug list to refresh it. It is hidden, not deleted.

### Step 7 — Audit

```
npm run audit:unlisted
```

Total should be about **188**. If it jumped, go to Part 10.

Flagged documents are ones whose **name** looks wrong. Read the note under the
summary carefully — it now separates the two cases:

- Flagged **and** stamped before `2026-08-06` (the first Excel import): the
  price came from the old importer and may be the confidential dealer figure.
  Those documents are listed by id. Delete the price; do not re-use it.
- Flagged and stamped `2026-08-06` or later: the price came through the Excel
  importer, which picks the price column by its header and refuses to run
  unless that header says "retail". **The name needs fixing; the price is
  fine.** Step 6 fixes most of these names.

### Step 8 — SPOT-CHECK THE PRICES — MANDATORY

**This step exists because it caught five wrong prices on 2 August.**

Open the PDF beside https://planmycashflows.com/investment-products/unlisted-shares
(wait an hour, hard-refresh `Cmd`+`Shift`+`R`).

Check **at least eight** companies, chosen deliberately:

- The **three highest** prices on the page
- The **three lowest** prices
- Any price where the **lot size is 1** (should usually be 100+)
- Two at random from the middle

Compare each against the file's **RETAIL** column — never the dealer column.
(The importer cannot read the dealer column: it refuses to run unless the price
column it selected has "retail" in its header. Your eyes are the one place that
rule isn't enforced, so keep them on the right column.)

**Why these:** OCR errors hide in extremes. A dropped digit turns ₹118 into ₹18;
an inserted one turns ₹10,400 into ₹1,10,400. Mid-range numbers rarely go wrong,
and when they do the error is small.

**Any mismatch → Part 9.**

### Step 9 — Only when new companies appeared

Always dry-run first — it writes the logos to a folder so you can look at them
before any of them reaches the site:

```
npm run logos:unlisted -- "PASTE_PATH_HERE" --dry-run
```

Open `~/Desktop/wealthwise3/unlisted-logos/` in Finder, switch to icon view and
flip through. **Every** crop is written, in three places:

| folder | what's in it |
| --- | --- |
| `unlisted-logos/` | exactly what the real run will upload, one file per document, named `<slug>.jpeg` |
| `unlisted-logos/_already-has-logo/` | the document already has a logo, so it is left alone — `--force` replaces these |
| `unlisted-logos/_unmatched/` | no document of ours matches this row; named from the partner's list |

The file name is the **document's slug**, which is what you see in Studio's URL
bar — so a wrong pairing is visible at a glance, and you can go straight to the
document to check it. Then:

```
npm run logos:unlisted -- "PASTE_PATH_HERE"
```

From the `.xlsx` the logos are the partner's own embedded images, read straight
out of the file — no rendering, no OCR, and the workbook itself says which row
each image belongs to. Expect ~161 attached and ~22 companies listed as having
no logo in the file; those keep our monogram, which is the designed behaviour
and not a failure. Logos never create companies and never change a name.

A row is matched to a document exactly the way the price import matches it —
same rules, same `scripts/unlisted-aliases.json`. If you add an entry to that
file to fix a price, it fixes the logo too, and the run says how many logos it
placed that way. Two images can never land on one document: the second is
reported and skipped.

Images are used at the size the partner sends them (40–168px). Nothing is ever
upscaled — a blown-up 40px mark looks worse than our monogram. Uniform white
borders are trimmed, and anything under 32px after trimming is dropped and
listed as rejected.

### 2.8 — When the file can't be read

`ABORTED` means the guard worked. **Do not force it.** `--allow-drift` only
relaxes row counts, never the name checks and never the column checks.

In order of preference:

1. Ask UnlistedZone to resend — that day's file may be malformed.
2. **Skip the day.** The site keeps showing the last good prices, clearly dated.

Three aborts are specific to the Excel file and mean specific things:

| Message | What happened | What to do |
|---|---|---|
| `is not a RETAIL price column` | They renamed or moved the price column, so the importer can no longer prove which one is the retail price. It will not guess. | Tell them. Never rename the header yourself to get past this — that is the one check standing between the dealer column and a public page. |
| `Multi-sheet reading failed silently` | Sheets carry price data that wasn't read. | Send them the file name; do not import a partial list. |
| `no "Share Name" header` | Wrong file, or they restructured it. | Check you sent the right attachment. |
| `declared in scripts/unlisted-aliases.json, but the document pointed at no longer exists` | A row on today's list is declared, but its target document has been renamed, merged or deleted. Honouring it is impossible; ignoring it would recreate the duplicate it exists to prevent. | Find the document in Studio, copy the slug from the URL bar, correct the file. |
| `claimed by more than one row` | Two companies on the list matched ONE of our documents. Left alone, the second price would overwrite the first and a company would vanish from the site. | Open the named document in Studio, give each company its own document with the right list name in its aliases, re-run. No flag relaxes this. |

**Stale but correct beats fresh but wrong. Always.**

---

# PART 3 — PMS DATA (monthly, from the 12th)

**Time: 20 minutes. Tool: Terminal.**

**When:** on or after the **12th**. Managers have seven working days to file.

Replace `7 2026` with the month of the **data**, not today. On 12 August you
fetch July: `7 2026`.

### Step 1 — Open, go to folder, update

```
cd ~/Desktop/wealthwise3
```
```
git pull --no-edit
```
```
npm ci
```

### Step 2 — Archive first

```
npm run archive:pms
```

Saves a dated CSV and PDF of what the site shows *now* into `scripts/archive/`.
**Never skip.** Once you import, the old numbers are gone.

### Step 3 — Probe (writes nothing)

```
node scripts/fetch-apmi-pms.mjs 7 2026 --probe
```

Expect sample records with fund names and numbers.

**If every line says `0 strategies`**, APMI wants a different date format:

```
node scripts/fetch-apmi-pms.mjs 7 2026 --probe --ason 2026-7-31
```

then if needed:

```
node scripts/fetch-apmi-pms.mjs 7 2026 --probe --ason 2026-07-31
```

### Step 4 — Fetch

```
node scripts/fetch-apmi-pms.mjs 7 2026
```

2–3 minutes. Expect 1,700–1,800 strategies.

### Step 5 — Check the file

```
head -1 scripts/pms-data.csv
```
```
sed -n '2p' scripts/pms-data.csv
```

The date must read `2026-07-31` — **four digits, dash, two, dash, two.** If it
shows `2026-7-31`:

```
sed -i '' 's/,2026-7-31,/,2026-07-31,/g' scripts/pms-data.csv
```

### Step 6 — Back it up

```
cp scripts/pms-data.csv ~/Desktop/AURIS/PMS/pms-data-2026-07-31.csv
```

### Step 7 — Dry run — NEVER SKIP

```
npm run import:pms -- scripts/pms-data.csv --dry-run
```

At the bottom you want:

- `ambiguous 0`
- `would update` ~1,700+
- `would create` small (tens)

`ambiguous` > 0 → Step 7a. Hundreds of creates → stop.

### Step 7a — Ambiguous rows (first time only)

The dry run prints paste-ready blocks with real names and IDs.

1. Open `~/Desktop/wealthwise3/scripts/pms-pins.json` in TextEdit
2. Replace the placeholders with those blocks
3. Save, re-run Step 7 — should now say `ambiguous 0`
4. Commit so it never recurs:

```
git add scripts/pms-pins.json
```
```
git commit -m "Fill PMS pins with real document ids"
```
```
git push
```

### Step 8 — Import

```
npm run import:pms -- scripts/pms-data.csv
```

### Step 8a — Categories (only when new strategies appeared)

APMI sends no category, so new strategies arrive uncategorised — which is what
empties the Category row on the compare page and thins the category pages.

Dry run first. It writes nothing and leaves you a spreadsheet:

```
npm run enrich:categories > categories.csv
```

Read the summary on screen. It tells you coverage before → after, how many it
would set, and how many it refuses to guess at. Then:

```
npm run enrich:categories -- --apply
```

It only fills in blanks. It never changes a category that is already there.

**The ones it won't guess.** Anything with no category word in its name, plus
every "Mid & Small Cap" (that spans two bands, so it refuses to pick one).
Open `categories.csv` — the rows with an empty `proposedCategory` are those.
Decide them yourself in `scripts/pms-category-overrides.json`, then commit so
next month's import can't undo the work:

```
git add scripts/pms-category-overrides.json
```
```
git commit -m "Hand-map PMS categories"
```
```
git push
```

**If it says "blocked by schema"**: it wants to use a category the site
doesn't offer yet (Flexicap, Sectoral, Multi-Asset, ESG, Value, Growth). That
is a code change, not a data one — leave it and ask Claude. See
`docs/pms-data-import.md` → "Adding a category value".

### Step 9 — Update the benchmark — DO NOT SKIP

Alpha is your headline number. Strategies on July data against a June benchmark
makes **every alpha figure on the site wrong.**

```
npm run fetch:benchmark -- --asof 2026-07-31
```

If it says "UPDATE BENCHMARK MANUALLY": open Studio, find the Benchmark
document, type the six figures from APMI's table by hand.

### Step 10 — Commit the archive

```
git add scripts/archive/
```
```
git commit -m "PMS data as on 2026-07-31"
```
```
git push
```

### Step 11 — Spot-check

Open https://planmycashflows.com/investment-products/pms after an hour. Confirm
the as-on date changed and cards show 1M/6M figures. Open two strategy pages and
check the returns against APMI's table.

---

# PART 4 — AIF DATA (quarterly)

**Time: 15 minutes. Tool: Terminal.** After 31 Mar, 30 Jun, 30 Sep, 31 Dec.

```
cd ~/Desktop/wealthwise3
```
```
git pull --no-edit
```
```
npm run fetch:sebi-aif -- --asof 2026-09-30
```
```
npm run import:aif -- scripts/aif-data.csv
```

Check https://planmycashflows.com/investment-products/aif after an hour.

---

# PART 5 — LOGOS

## 5.1 — PMS manager logos

```
cd ~/Desktop/wealthwise3
```
```
npm run logos:pms -- --dry-run
```
```
npm run logos:pms
```

## 5.2 — One-time fix for 312 missing logos

```
npm run logos:pms -- --template
```

Creates `pms-logos.csv`. Open in Excel or Numbers. Each row is a manager with an
empty `source` column. Google each, enter just the domain (`marcellus.in` — no
`https://`, no `www.`). Save as CSV, then:

```
npm run logos:pms -- pms-logos.csv --dry-run
```
```
npm run logos:pms -- pms-logos.csv
```

One hour, permanently solved.

## 5.3 — Unlisted company logos

```
npm run logos:unlisted -- "PASTE_PATH_HERE" --dry-run
```
```
npm run logos:unlisted -- "PASTE_PATH_HERE"
```

Takes the same file as the price import. An `.xlsx` gives the partner's own
embedded images (fast, exact); a `.pdf` falls back to rendering and OCR
(slow, approximate). Add `--force` only when you want to replace logos that are
already set. See Part 2 step 9.

The dry run writes every crop under the document's slug, so the review folder
and Studio line up. Matching uses the same rules and the same alias file as the
price import, and reads no price of any kind from either file — only names and
pictures.

---

# PART 6 — MONTHLY NEWSLETTER

**Time: 1–2 hours.**

### Step 1 — Do the PMS refresh first (Part 3)

Never write it before the data is in.

### Step 2 — Get the numbers

```
cd ~/Desktop/wealthwise3
```
```
open scripts/archive/
```

Open the newest CSV in Excel or Numbers. Pull: how many strategies beat the
benchmark, the top 5 by **3-year alpha** (not raw return — alpha is your brand),
and anything notable.

### Step 3 — Fill the template

```
open newsletters/templates/
```

Duplicate `pms-newsletter.html`, rename for the month, edit in TextEdit.

### Step 4 — Make the PDF

Open the HTML in Chrome → `Cmd`+`P` → "Save as PDF" → save into
`~/Desktop/wealthwise3/public/newsletters/` as
`PlanMyCashflows-PMS-Brief-July-2026.pdf`.

### Step 5 — Publish to the site

```
cd ~/Desktop/wealthwise3
```
```
git add public/newsletters/ newsletters/
```
```
git commit -m "Newsletter July 2026"
```
```
git push
```

### Step 6 — Send

Subscribers in **BCC** — never CC, that leaks every address to everyone. Attach
the PDF. Then WhatsApp.

### Every figure carries

The as-on date. "Past performance is not indicative of future returns." Never
"best" or "top".

---

# PART 7 — BLOG POSTS

**Time: 1–2 hours. Tool: Sanity Studio.**

1. Go to https://planmycashflows.com/studio, log in
2. Click **Blog Post** → **Create new**
3. Fill in title, slug (lowercase-with-dashes), category, excerpt, body, date
4. Click **Publish**

Live within the hour, in the sitemap automatically. No Terminal, no deploy.

**Rules:** alpha over benchmark, never raw-return leaderboards. Short-period
returns shown but never headlined. Educational framing, never advice — you are
not RIA-licensed. Never name yourself, the parent company, distribution partners,
or defence audiences.

---

# PART 8 — SOCIAL MEDIA

**Time: 1 hour a month. Tool: browser.** No automation exists.

1. Publish the newsletter (Part 6)
2. Publish a blog post expanding one idea from it (Part 7)
3. Write 3–4 short posts pointing to the blog post
4. Post to LinkedIn, X, Instagram, WhatsApp status

**Every post mentioning a number needs:** the as-on date, the source (APMI), and
the past-performance caveat. No "best", no "top", no implied recommendation. If a
post makes you hesitate, don't publish it.

---

# PART 9 — FIXING A WRONG NUMBER BY HAND

**Tool: Sanity Studio. Use when the spot-check finds a mismatch.**

1. Go to **https://planmycashflows.com/studio**, log in
2. Left sidebar → **Unlisted Shares** (or **PMS Strategies**)
3. Use the **search box** — type part of the company name
4. Click the document. A form opens on the right
5. Click into the wrong field. Select the number (triple-click or drag)
6. Type the correct value — **digits only.** `10400`, not `₹10,400`
7. Click green **Publish**, bottom right. Wait for "Published"
8. Back arrow, next one

**Which field:**

| Symptom | Field |
|---|---|
| Price wrong | `indicativePriceINR` |
| Min investment wildly off | `lotSize` |
| Name garbled | `company` |

**Cautions:**

- If search shows two entries for one company, pick the one **with a price**.
  The other is your editorial entry — leave it alone.
- If **Publish** is greyed out, you haven't changed anything yet.
- If a field won't accept typing, refresh the page.

Changes appear on the site within the hour.

---

# PART 10 — RECOVERING FROM A BAD IMPORT

**Use when the audit shows a jump in document count, or garbled names appear.**

### Step 1 — See the damage (writes nothing)

```
cd ~/Desktop/wealthwise3
```
```
npm run audit:unlisted
```

Read the summary at the bottom: total, clean, flagged.

**Normal:** total ~188, flagged ~12. Those 12 are false positives — genuine
companies whose names trip the checks (`Sterlite Grid 5`, `Zepto Unlisted Shares
(Equity)`, `Fusion Techstack Limited (Forme`). **Leave them.**

**Bad:** total jumped to 300+, flagged in the hundreds.

### Step 2 — Identify the bad import's date

Every document carries an `asOfDate`. The bad ones share the date of the failed
run. The audit lists documents by date.

### Step 3 — Preview the purge

```
npm run audit:unlisted -- --purge-import=2026-08-01
```

Replace the date with the bad import's. **This only prints a plan.** Read:

- How many would be deleted
- **"CLEAN NAMES ALSO CARRYING [date]"** — this is the important one. If it says
  **None**, the bad run only created documents and didn't corrupt existing ones.
  If it lists any, check those by hand before proceeding.

### Step 4 — Execute

At the prompt, type exactly:

```
PURGE 2026-08-01
```

Capital letters, one space, the date. Anything else aborts safely.

### Step 5 — Confirm

```
npm run audit:unlisted
```

Total back to ~188.

### Step 6 — Check other dates

```
npm run audit:unlisted -- --purge-import=2026-07-31
```

If nothing matches, you're clear.

### Step 7 — Spot-check survivors

Run Part 2 Step 8. A bad import may have corrupted a few good documents before
you noticed.

---

# PART 11 — GIT PROBLEMS

## 11.1 — "Need to specify how to reconcile divergent branches"

Both your Mac and GitHub have new commits.

```
git config --global pull.rebase false
```
```
git pull --no-edit
```
```
git push
```

## 11.2 — A text editor opened and you can't escape

Screen full of `~` symbols, `-- (insert)` at the bottom. That's **vim**.

1. Press `Esc`
2. Type `:q!`
3. Press `Enter`

**If Esc doesn't respond:**

1. `Cmd`+`Q` to quit Terminal entirely
2. Reopen Terminal
3. ```
   cd ~/Desktop/wealthwise3
   ```
4. ```
   git merge --abort
   ```
5. ```
   git config --global core.editor "nano"
   ```
6. ```
   git pull --no-edit
   ```

**Prevention:** always `git pull --no-edit`.

## 11.3 — "Push cannot contain secrets" / GH013

GitHub found credentials in your commit and blocked it. **This is protection, not
a bug.**

**NEVER click the "allow the secret" link.** That publishes the credentials.

```
git reset --soft HEAD~1
```

(Use `HEAD~2` if two commits contain it.)

```
git restore --staged "PATH/TO/CREDENTIAL/FOLDER"
```
```
mkdir -p ~/Desktop/AURIS/credentials
```
```
mv "PATH/TO/CREDENTIAL/FOLDER" ~/Desktop/AURIS/credentials/
```

Then commit and push normally.

**Afterwards:** consider rotating the exposed keys in their console (Google Cloud
→ IAM & Admin → Service Accounts), even though they were blocked.

## 11.4 — "Updates were rejected (fetch first)"

```
git pull --no-edit
```
```
git push
```

## 11.5 — "Authentication failed"

```
gh auth setup-git
```

If that fails:

```
gh auth login
```

Choose GitHub.com → HTTPS → **Yes** to authenticate Git → browser.

## 11.6 — Files show as `deleted` that you didn't mean to delete

```
git checkout -- FILENAME
```

Restores it from GitHub.

## 11.7 — `package-lock.json` always showing as modified

```
git checkout -- package-lock.json
```

Use `npm ci`, never `npm install`, and it stops happening.

---

# PART 12 — TROUBLESHOOTING TABLE

| What you see | Meaning | What to do |
|---|---|---|
| `Could not read package.json` | Wrong folder | `cd ~/Desktop/wealthwise3` |
| `No such file` | Wrong path | Redo 0.9, use quotes |
| `ABORTED` on unlisted import | File unreadable — guard worked | 2.8. Don't force it |
| `ambiguous rows` on PMS | Pins need filling | Part 3, step 7a |
| Import rejects dates | Unpadded date | Part 3, step 5 |
| Site unchanged after import | Cache | Wait 1 hour, `Cmd`+`Shift`+`R` |
| Wrong price on the site | OCR digit error (PDF), or a wrong relaxed match | Part 9 |
| Document count jumped | Bad import | Part 10 |
| Netlify build failed | Code error | `npm run build` locally, fix, push |
| Local build fails, GitHub fine | Stale local copy | `git pull --no-edit` |
| Screen full of `~` | vim | 11.2 |
| `Push cannot contain secrets` | Credentials in commit | 11.3 |
| `divergent branches` | Both sides have commits | 11.1 |
| Terminal seems frozen | It's working | Wait |

---

# PART 13 — THE RULES THAT DON'T BEND

1. **`cd ~/Desktop/wealthwise3` first, every session.**
2. **`git pull --no-edit` before anything else.**
3. **Dry run before every import. No exceptions.**
4. **Spot-check prices after every unlisted import** — highest, lowest, any lot
   size of 1.
5. **Archive before every PMS import.**
6. **Dealer price never enters Sanity.**
7. **The repo folder contains the website and nothing else.** No PDFs, videos,
   music, credentials, or client documents. **Anything over 1 MB: compress it if
   it's website content, move it to `~/Desktop/AURIS/` if it isn't.** Git keeps
   every file forever — there is no undo.
8. **`ABORTED` means stop, not "try harder".**
9. **Never download a file from a Claude Code session** — have it commit to a
   branch, then `git pull`. A script was lost this way once.
10. **Check the repo chip says `wealthwise3`** before pasting into Claude Code.
11. **Stale but correct beats fresh but wrong.**
12. **Never CC subscribers. Always BCC.**
13. **Never click "allow the secret".**

---

# PART 14 — GETTING YOUR TIME BACK

Ranked by hours saved:

**1. Get CSV from UnlistedZone (1.3).** Removes the daily OCR gamble, the wrong
prices, the duplicates, and the truncated names — all at once. Chase by phone if
needed.

**2. Fill `pms-logos.csv` once (5.2).** One hour, permanently done.

**3. Finish the PMS pins once (Part 3, 7a).** Ten minutes, permanently done.

**4. Ask for a newsletter generator.** The archive CSV exists; a script can fill
the template from it. Ask in the chat for the prompt.

**5. Category enrichment.** Only 28% of PMS strategies have a category, which is
why filters are thin. One Claude Code job, not recurring.

**Realistic steady state once those are done:** 10 minutes a day for unlisted, 20
minutes a month for PMS, half a day a month for content. Everything else is
one-time.

---

# PART 15 — WORKING WITH CLAUDE

**Think in chat, execute in Claude Code.** Discuss the problem here, paste the
resulting prompt there. This split exists because Claude Code executes a spec
well but won't stop to ask whether the spec is wise.

**Come to chat for:** data pipelines, compliance, money, architecture, anything
where a wrong decision is expensive.

**Go straight to Claude Code for:** copy edits, styling, a broken link, anything
you can specify in one sentence.

**Model choice:** Opus 5 for anything where the diagnosis is the hard part.
Sonnet 5 for mechanical, fully-specified work. Stay on Opus 5 when unsure.

**Before pasting into Claude Code:** check the repo chip at the bottom says
`wealthwise3`. You have more than one project.

**Standing rules** live in `CLAUDE.md` at the repo root — Claude Code reads it
automatically at the start of every session. Add rules there rather than
re-typing them.

---

*Keep this at `~/Desktop/wealthwise3/docs/OPERATIONS.md` so it travels with the
code.*
