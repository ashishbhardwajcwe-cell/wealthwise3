# PlanMyCashflows — Master Operations Manual

**Assume nothing. Follow exactly. Every command is written out in full.**

Last updated: 2 August 2026

---

# PART 0 — THE ABSOLUTE BASICS

Read this once. Everything after it assumes you know Part 0.

## 0.1 — The three tools, and what each one is for

You use three different things. People confuse them, so here is the rule:

| Tool | What it is | What you use it for |
|---|---|---|
| **Terminal** | The black text window on your Mac | Running commands that fetch and import data |
| **Claude Code** | The app with the repo chip at the bottom | Changing the website's code |
| **Sanity Studio** | A website at planmycashflows.com/studio | Editing content and data by hand |

**The single most important distinction:** Terminal runs the data. Claude Code changes the code. They are not interchangeable. If a step below says "Terminal", do not paste it into Claude Code.

## 0.2 — How to open Terminal

1. Press `Cmd` + `Space` (hold Command, tap Spacebar). A search box appears.
2. Type: `terminal`
3. Press `Enter`.

A window opens with white or black text ending in a `%` sign. That's Terminal.

## 0.3 — Getting into the right folder — DO THIS EVERY SINGLE TIME

Terminal always starts in your home folder. Your project is not there. **Every session, first command, no exceptions:**

```
cd ~/Desktop/wealthwise3
```

Press `Enter`.

**How to check it worked:** the text before the `%` should now end in `wealthwise3`.

- ✅ Correct: `ashishbhardwaj@Ashishs-MacBook-Air-5 wealthwise3 %`
- ❌ Wrong: `ashishbhardwaj@Ashishs-MacBook-Air-5 ~ %`

If it shows `~`, you are in the wrong place and **every command will fail** with `Could not read package.json`. Run the `cd` command again.

## 0.4 — Running a command

1. Click once inside the Terminal window.
2. Copy the command from this book (select it, `Cmd`+`C`).
3. Click in Terminal, press `Cmd`+`V` to paste.
4. Press `Enter`.
5. **Wait.** Some commands take 2–5 minutes. Terminal looks frozen while working. It is not. Do not press anything.
6. You know it's finished when the `%` prompt comes back.

**Paste ONE command at a time.** Never paste a block of several commands together. If one fails, the rest run anyway and make things worse.

## 0.5 — The two commands you run at the start of EVERY session

After `cd ~/Desktop/wealthwise3`, always run these two, one at a time:

```
git pull
```

Then:

```
npm ci
```

**What they do:** `git pull` downloads the latest code from GitHub. `npm ci` installs the tools that code needs.

**Why it matters:** if you skip `git pull`, you are running old code and will chase bugs that were already fixed. This has cost you hours already.

`npm ci` takes about 40 seconds and prints warnings about "deprecated" packages. **Warnings are normal. Ignore them.** Only the word `error` matters.

## 0.6 — Reading output: what is a problem and what isn't

| You see | Meaning |
|---|---|
| `warn` / `Warning` | **Ignore.** Always appears. Never a problem. |
| `deprecated` | **Ignore.** Always appears. |
| `ExperimentalWarning` | **Ignore.** |
| `Using <img> could result in slower LCP` | **Ignore.** Cosmetic. |
| `✓` (tick) | Good |
| `ABORTED` | **STOP.** A safety guard blocked it. Read why. |
| `error` / `Error` | **STOP.** Read the message. |
| `No such file` | The file path is wrong |

## 0.7 — Where files live

| What | Where |
|---|---|
| The project | `~/Desktop/wealthwise3` |
| Unlisted price PDFs | `~/Desktop/wealthwise3/UNLISTED/` |
| PMS archives | `~/Desktop/wealthwise3/scripts/archive/` |
| Newsletter templates | `~/Desktop/wealthwise3/newsletters/templates/` |

`~` is shorthand for `/Users/ashishbhardwaj`.

## 0.8 — How to get a file's exact path (stop guessing)

Wrong paths have wasted your time repeatedly. Never type a path by hand:

1. Find the file in Finder.
2. **Right-click** it.
3. Hold down the `Option` key. The menu changes.
4. Click **"Copy [filename] as Pathname"**.
5. In Terminal, paste it **inside double quotes**.

Example: `npm run import:unlisted -- "PASTE HERE"`

The quotes matter because your filenames contain spaces.

## 0.9 — How the website updates (why you don't always see changes instantly)

Two completely separate things:

**Data changes** (prices, PMS returns) go into Sanity. The website re-reads Sanity on a timer — **up to 1 hour**. No deploy needed. If you don't see a change, wait an hour and hard-refresh (`Cmd`+`Shift`+`R`).

**Code changes** go to GitHub. Netlify rebuilds automatically — **about 3 minutes**.

---

# PART 1 — WHAT IS CURRENTLY BROKEN

Do these before treating the site as fully operational.

## 1.1 — URGENT: dealer prices exposed in Sanity

**What:** 191 documents from the failed 31 July import hold your partner's confidential **dealer** prices. They don't show on the website, but the Sanity database is publicly readable and its project ID is in your website's code. Anyone technical can read them.

**Why it isn't fixed:** the deletion tool only removes a bad document when a good version of the same company exists. None of these have one, so it refuses — correctly.

**What to do:** open Claude Code, check the chip at the bottom says `wealthwise3`, and paste:

```
URGENT — confidentiality. 191 unlistedShare documents in Sanity carry our partner's DEALER price, not retail (verified: "Shares 555" stores 545; the partner lists that company at retail 555 / dealer 545). They are marked needsReview so the site does not render them, but the dataset is publicly readable and the project id ships in the client bundle.

`npm run audit:unlisted -- --delete-flagged` removes none of them because none has a clean twin. Add a date-scoped purge to scripts/audit-unlisted.mjs:

1. `--as-of=YYYY-MM-DD` scoping every mode to that asOfDate.
2. `--purge-import=YYYY-MM-DD` deleting documents matching that asOfDate AND a corruption signature. Must refuse to run without an explicit date, print the full list first, and require typed confirmation.
3. asOfDate is the reliable discriminator: every bad document carries 2026-08-01 or 2026-07-31; the legitimate ones carry 2026-07-22. Name signatures alone are NOT safe — "Sterlite Grid 5", "Zepto Unlisted Shares (Equity)", "Signify Innovations (Previously Ph", "Sterlite Electric Limited (Formerly" and "Fusion Techstack Limited (Forme" are genuine 22-Jul documents, live on the site with correct retail prices, two carrying hand-extracted logos. Deleting any of them is a real loss.
4. Before deleting, list any CLEAN document also carrying the purge date — an existing document quietly updated with a dealer price would have a clean name and a poisoned price. Report whether any exist.
5. After deletion, re-run the report so I can confirm the count returned to ~188.

Open a PR.
```

When it's merged, in Terminal:

```
cd ~/Desktop/wealthwise3
```
```
git pull
```
```
npm run audit:unlisted -- --purge-import=2026-08-01
```

Then repeat for `2026-07-31` if that date also appears. Finish with:

```
npm run audit:unlisted
```

Total should be back near 188.

## 1.2 — The 1 August unlisted PDF cannot be read

Both the text layer and OCR produce fused names. **Do not try to force it.** `--allow-drift` will not help; it only relaxes row counts, not name checks.

Options, best first:

1. **Ask UnlistedZone for CSV or Excel.** Permanent fix. See 1.3.
2. Ask them to resend the PDF — that day's file may be malformed.
3. Skip the day. The site keeps showing 22 July prices — stale but correct and clearly dated. **Stale is far better than wrong.**

## 1.3 — The email that ends this problem

Send this today:

> Subject: Daily price list — CSV or Excel format request
>
> Hi,
>
> We're publishing your indicative retail prices on our platform daily. Reading them out of the PDF is proving unreliable — a formatting change on your end can cause us to misread a column.
>
> Could you send the daily list as CSV or Excel as well, with one column each for company name, retail price, depository and minimum lot size? A Google Sheet link that updates daily would work equally well.
>
> This would let us publish your prices faster and with no risk of transcription error.
>
> Thanks,
> PlanMyCashflows

## 1.4 — PMS pins not yet filled

`scripts/pms-pins.json` was seeded with placeholder names. Your next PMS import will stop with "ambiguous rows". Section 3 tells you exactly what to do — it's a one-time, ten-minute fix.

---

# PART 2 — UNLISTED SHARE PRICES (daily, weekdays)

**Time: 5 minutes when it works. Tool: Terminal.**

### Step 1 — Save the PDF

When the partner's email arrives, save the attachment into:

`~/Desktop/wealthwise3/UNLISTED/`

Keep their filename. Example: `Dealer Price List 01-08-2026.pdf`

### Step 2 — Open Terminal and go to the folder

```
cd ~/Desktop/wealthwise3
```

Check the prompt ends in `wealthwise3 %`.

### Step 3 — Get the latest code

```
git pull
```

### Step 4 — Dry run — NEVER SKIP THIS

Get the file's path using the method in 0.8, then:

```
npm run import:unlisted -- "PASTE_PATH_HERE" --dry-run
```

**This writes nothing.** It only reports what it would do.

**Now read the output:**

- **If you see `ABORTED`** → the PDF can't be read correctly. **Stop. Do not continue to Step 5.** Go to section 1.2.
- **If you see a list of companies with sensible names and prices** → good, continue.
- **If names contain numbers** (like `"Shares 555"`) → stop. Same as ABORTED.

### Step 5 — Import for real

Same command, without `--dry-run`:

```
npm run import:unlisted -- "PASTE_PATH_HERE"
```

Expect roughly 180 companies updated, few or no creations. Hundreds of creations means something is wrong — stop and check.

### Step 6 — Tidy the names

```
npm run clean:unlisted-names
```

### Step 7 — Check it worked

```
npm run audit:unlisted
```

Total should be about 188. If it jumped, something went wrong.

### Step 8 — Look at the website

Open https://planmycashflows.com/investment-products/unlisted-shares

Wait up to 1 hour, then hard-refresh with `Cmd`+`Shift`+`R`. Check the "as on" date is today's and a few prices match the PDF.

### Only when new companies appear

```
npm run logos:unlisted -- "PASTE_PATH_HERE"
```

---

# PART 3 — PMS DATA (monthly, from the 12th)

**Time: 20 minutes. Tool: Terminal.**

**When:** on or after the **12th**. Fund managers have seven working days to file. Earlier means incomplete data.

Throughout, replace `7 2026` with the month you want. July 2026 = `7 2026`. **This is the month of the DATA, not today's month.** On 12 August you fetch July: `7 2026`.

### Step 1 — Open Terminal, go to the folder, update

```
cd ~/Desktop/wealthwise3
```
```
git pull
```
```
npm ci
```

### Step 2 — Archive the current data first

```
npm run archive:pms
```

This saves a dated CSV and PDF of what the site shows *right now*, into `scripts/archive/`. It is your permanent record. **Never skip it** — once you import, the old numbers are gone.

### Step 3 — Probe (writes nothing)

```
node scripts/fetch-apmi-pms.mjs 7 2026 --probe
```

You should see sample records with fund names and numbers.

**If you see `0 strategies` on every line** → APMI wants a different date format. Try:

```
node scripts/fetch-apmi-pms.mjs 7 2026 --probe --ason 2026-7-31
```

and if that fails:

```
node scripts/fetch-apmi-pms.mjs 7 2026 --probe --ason 2026-07-31
```

### Step 4 — Fetch for real

```
node scripts/fetch-apmi-pms.mjs 7 2026
```

Takes 2–3 minutes. Expect around 1,700–1,800 strategies.

### Step 5 — Check the file

```
head -1 scripts/pms-data.csv
```
```
sed -n '2p' scripts/pms-data.csv
```

The second line must contain the date as `2026-07-31` — **four digits, dash, two digits, dash, two digits.** If it shows `2026-7-31`, the import will reject it. Fix with:

```
sed -i '' 's/,2026-7-31,/,2026-07-31,/g' scripts/pms-data.csv
```

(Change both dates to match your month.)

### Step 6 — Back up the file

```
cp scripts/pms-data.csv ~/Desktop/AURIS/PMS/pms-data-2026-07-31.csv
```

### Step 7 — Dry run — NEVER SKIP

```
npm run import:pms -- scripts/pms-data.csv --dry-run
```

Scroll to the summary at the bottom. You want:

- `ambiguous 0`
- `would update` around 1,700+
- `would create` small (tens)

**If `ambiguous` is more than 0** → go to Step 7a.
**If `would create` is in the hundreds** → stop, something is wrong.

### Step 7a — Fixing ambiguous rows (first time only)

The dry run prints paste-ready blocks with real names and document IDs.

1. Open `~/Desktop/wealthwise3/scripts/pms-pins.json` in TextEdit.
2. Replace the placeholder entries with the blocks from the output.
3. Save.
4. Run Step 7 again. It should now say `ambiguous 0`.
5. Commit it so you never do this again:

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

Alpha is your headline number. If strategies hold July data and the benchmark still holds June, **every alpha figure on your site is wrong.**

```
npm run fetch:benchmark -- --asof 2026-07-31
```

If it says "UPDATE BENCHMARK MANUALLY": open planmycashflows.com/studio, find the Benchmark document, and type in the six figures from APMI's table by hand.

### Step 10 — Save the archive to GitHub

```
git add scripts/archive/
```
```
git commit -m "PMS data as on 2026-07-31"
```
```
git push
```

### Step 11 — Check the website

Open https://planmycashflows.com/investment-products/pms — wait an hour, hard-refresh, check the as-on date changed and cards show 1M/6M figures.

---

# PART 4 — AIF DATA (quarterly)

**Time: 15 minutes. Tool: Terminal.**

**When:** after 31 Mar, 30 Jun, 30 Sep, 31 Dec.

```
cd ~/Desktop/wealthwise3
```
```
git pull
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

**Time: 10 minutes, or 1 hour for the one-time setup. Tool: Terminal.**

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

## 5.2 — The one-time fix for 312 missing logos

```
npm run logos:pms -- --template
```

This creates `pms-logos.csv`. Open it in Excel or Numbers. Each row is a manager with an empty `source` column. Google each manager, find their website, and type just the domain (e.g. `marcellus.in` — no `https://`, no `www.`).

Save as CSV, then:

```
npm run logos:pms -- pms-logos.csv --dry-run
```
```
npm run logos:pms -- pms-logos.csv
```

One hour of work, permanently solved.

## 5.3 — Unlisted company logos

```
npm run logos:unlisted -- "PASTE_PDF_PATH_HERE"
```

---

# PART 6 — MONTHLY NEWSLETTER

**Time: 1–2 hours. Tools: Terminal + text editor + email.**

### Step 1 — Do the PMS refresh first (Part 3)

The newsletter uses that month's numbers. Never write it before the data is in.

### Step 2 — Get the numbers

```
cd ~/Desktop/wealthwise3
```
```
open scripts/archive/
```

A Finder window opens. Open the newest CSV in Excel or Numbers. From it, pull:

- How many strategies beat the benchmark this month
- The top 5 by 3-year alpha (not by raw return — alpha is your brand)
- Anything notable: a strategy that flipped, a category that moved

### Step 3 — Open the template

```
open newsletters/templates/
```

Duplicate `pms-newsletter.html`, rename it for the month, open it in TextEdit, replace last month's numbers with this month's.

### Step 4 — Make the PDF

Open the HTML file in Chrome → `Cmd`+`P` → Destination "Save as PDF" → save into `~/Desktop/wealthwise3/public/newsletters/` as `PlanMyCashflows-PMS-Brief-July-2026.pdf`.

### Step 5 — Publish it to the site

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

Wait 3 minutes for Netlify.

### Step 6 — Send it

Email with subscribers in **BCC** (never CC — that leaks every subscriber's address to everyone). Attach the PDF. Then share on WhatsApp.

### Every figure must carry

- The as-on date
- "Past performance is not indicative of future returns"
- Never the words "best" or "top"

---

# PART 7 — BLOG POSTS

**Time: 1–2 hours. Tool: Sanity Studio (a website, not Terminal).**

### Step 1 — Open the Studio

Go to https://planmycashflows.com/studio and log in.

### Step 2 — Create the post

Click **Blog Post** → **Create new**. Fill in title, slug (the URL — lowercase with dashes), category, excerpt, body, and publish date.

### Step 3 — Publish

Click **Publish** (bottom right). It appears on the site within the hour and enters your sitemap automatically — no Terminal, no deploy.

### Rules

- Alpha over benchmark, never raw-return leaderboards
- Short-period returns shown but never headlined
- Educational framing, never advice — you are not RIA-licensed yet
- Never name yourself, the parent company, distribution partners, or defence audiences

---

# PART 8 — SOCIAL MEDIA

**Time: 1 hour a month. Tool: browser.**

There is no automation for this. The workflow:

1. Publish the newsletter (Part 6)
2. Publish a blog post expanding one idea from it (Part 7)
3. Write 3–4 short posts pointing to the blog post
4. Post to LinkedIn, X, Instagram, WhatsApp status

**Every post that mentions a number needs:** the as-on date, the source (APMI), and the past-performance caveat. No "best", no "top", no implied recommendation. If a post makes you hesitate, don't publish it.

---

# PART 9 — WHEN SOMETHING GOES WRONG

| What you see | What it means | What to do |
|---|---|---|
| `Could not read package.json` | Wrong folder | `cd ~/Desktop/wealthwise3` |
| `No such file` | Wrong path | Redo step 0.8, use quotes |
| `ABORTED` on unlisted import | PDF unreadable — guard worked | Section 1.2. Don't force it |
| `ambiguous rows` on PMS import | Pins need filling | Step 7a |
| Import rejects dates | Unpadded date | Step 5 of Part 3 |
| Website unchanged after import | Cache | Wait 1 hour, `Cmd`+`Shift`+`R` |
| Netlify build failed | Code error | `npm run build` locally, fix, push |
| Local build fails, GitHub looks fine | Stale local copy | `git pull` |
| `Authentication failed` on push | Git auth | `gh auth setup-git` |
| Terminal seems frozen | It's working | Wait. Don't press anything |

---

# PART 10 — THE RULES THAT DON'T BEND

1. **`cd ~/Desktop/wealthwise3` first, every session.**
2. **`git pull` before anything else.**
3. **Dry run before every import. No exceptions.**
4. **Archive before every PMS import.**
5. **Dealer price never enters Sanity.**
6. **`ABORTED` means stop, not "try harder".**
7. **Never download a file from a Claude Code session** — have it commit to a branch, then `git pull`. A script was lost this way once.
8. **Check the repo chip says `wealthwise3`** before pasting into Claude Code.
9. **Stale but correct beats fresh but wrong.** Skipping a day costs nothing. Publishing wrong prices costs trust.
10. **Never CC subscribers. Always BCC.**

---

# PART 11 — GETTING YOUR TIME BACK

You should not be spending your working hours on this. Ranked by hours saved:

**1. Get CSV from UnlistedZone (section 1.3).** Removes the daily OCR gamble entirely. One email.

**2. Fill in `pms-logos.csv` once (5.2).** One hour, permanently done.

**3. Finish the PMS pins once (7a).** Ten minutes, permanently done.

**4. Ask for a newsletter generator.** Once the archive CSV exists, a script can fill the template from it. Ask in the chat and you'll get the prompt.

**5. Category enrichment.** Only 28% of strategies have a category, which is why filters are thin. One Claude Code job, not recurring.

Realistic steady state once those are done: **10 minutes a day** for unlisted, **20 minutes a month** for PMS, **half a day a month** for newsletter and content. Everything else is one-time.

---

*Keep this file at `~/Desktop/wealthwise3/docs/OPERATIONS.md` so it travels with the code.*
