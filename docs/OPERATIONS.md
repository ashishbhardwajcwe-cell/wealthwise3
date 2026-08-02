# PlanMyCashflows — Master Operations Manual

## Version 2 · 2 August 2026

**Assume nothing. Follow exactly. Every command is written out in full.**

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
| Unlisted price PDFs | `~/Desktop/wealthwise3/UNLISTED/` |
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

## 1.3 — Open: waiting on UnlistedZone CSV

Email sent 2 August requesting CSV or Excel instead of PDF. **If no reply by
Tuesday, telephone them.** This single change removes the entire OCR failure
mode.

The email, if it needs resending:

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

## 1.4 — Open: known cosmetic issues (wait for the CSV)

These all share one cause — OCR guessing at a rendered PDF — and one clean import
fixes them together. **Do not fix by hand; you'd repeat the work.**

- Price and date run together: "₹5222 Jul 2026" should be "₹52 · 22 Jul 2026"
- Nine duplicate pairs: your editorial entry plus an imported one (PharmEasy /
  Pharm Easy, NSE / NSE India Limited, Chennai Super Kings / I csk, boAt, OYO,
  Bira, CIAL, Care Health, Motilal Oswal Home Finance)
- Truncated names: "Signify Innovations (Previously Ph", "Sterlite Electric
  Limited (Formerly"
- ~170 of 188 show sector "Other" — only hand-curated entries have real sectors

## 1.5 — Open: PMS pins not yet filled

`scripts/pms-pins.json` holds placeholder names. Your next PMS import will stop
with "ambiguous rows". Part 3 step 7a fixes it — one time, ten minutes.

---

# PART 2 — UNLISTED SHARE PRICES (daily, weekdays)

**Time: 10 minutes. Tool: Terminal, then browser.**

### Step 1 — Save the PDF

Save the emailed attachment into `~/Desktop/wealthwise3/UNLISTED/`, keeping their
filename. Example: `Dealer Price List 01-08-2026.pdf`

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

- **`ABORTED`** → the PDF can't be read. **Stop. Do not do Step 5.** See 2.8.
- **Names containing numbers** (`"Shares 555"`) → same. Stop.
- **Sensible names and prices** → continue.

### Step 5 — Import

```
npm run import:unlisted -- "PASTE_PATH_HERE"
```

Expect ~180 updated, few or no creations. Hundreds of creations means stop.

### Step 6 — Tidy names

```
npm run clean:unlisted-names
```

### Step 7 — Audit

```
npm run audit:unlisted
```

Total should be about **188**. If it jumped, go to Part 10.

### Step 8 — SPOT-CHECK THE PRICES — MANDATORY

**This step exists because it caught five wrong prices on 2 August.**

Open the PDF beside https://planmycashflows.com/investment-products/unlisted-shares
(wait an hour, hard-refresh `Cmd`+`Shift`+`R`).

Check **at least eight** companies, chosen deliberately:

- The **three highest** prices on the page
- The **three lowest** prices
- Any price where the **lot size is 1** (should usually be 100+)
- Two at random from the middle

Compare each against the PDF's **RETAIL** column — never the dealer column.

**Why these:** OCR errors hide in extremes. A dropped digit turns ₹118 into ₹18;
an inserted one turns ₹10,400 into ₹1,10,400. Mid-range numbers rarely go wrong,
and when they do the error is small.

**Any mismatch → Part 9.**

### Step 9 — Only when new companies appeared

```
npm run logos:unlisted -- "PASTE_PATH_HERE"
```

### 2.8 — When the PDF can't be read

`ABORTED` means the guard worked. **Do not force it.** `--allow-drift` only
relaxes row counts, never the name checks.

In order of preference:

1. Ask UnlistedZone for CSV (1.3). Permanent fix.
2. Ask them to resend — that day's file may be malformed.
3. **Skip the day.** The site keeps showing the last good prices, clearly dated.

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
npm run logos:unlisted -- "PASTE_PDF_PATH_HERE"
```

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
| `ABORTED` on unlisted import | PDF unreadable — guard worked | 2.8. Don't force it |
| `ambiguous rows` on PMS | Pins need filling | Part 3, step 7a |
| Import rejects dates | Unpadded date | Part 3, step 5 |
| Site unchanged after import | Cache | Wait 1 hour, `Cmd`+`Shift`+`R` |
| Wrong price on the site | OCR digit error | Part 9 |
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
   credentials, client documents.
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
