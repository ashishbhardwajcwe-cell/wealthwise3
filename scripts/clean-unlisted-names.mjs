#!/usr/bin/env node
/**
 * One-time (safe to re-run) cleanup for unlisted-share company names.
 *
 * Two kinds of junk end up welded to a company name, one at each end.
 *
 * At the FRONT: the partner's price list is an image PDF, and OCR captures the
 * company logo as junk on the front of the name — a bracketed monogram
 * ("[J] Capgemini…"), a stray symbol ('"India Carbon…', '«wx Fusion…',
 * '#ex Indian Gas…') or a short lowercase logo token ('i Urban Tots',
 * 'm S3V Vascular').
 *
 * At the BACK: the list's ROW BOILERPLATE. Every row on the partner's sheet is
 * headed "<Company> Unlisted Shares", some of them "… Unlisted Shares Price".
 * The matcher has always stripped that before comparing, so those rows resolve
 * onto the right document — but a row that matched nothing was CREATED with the
 * boilerplate baked into its company name, and "Bazar India Unlisted Shares"
 * then went onto a public page as though that were the company's name.
 *
 * Both ends are stripped here and the `company` field is patched in place.
 *
 *   node scripts/clean-unlisted-names.mjs --dry-run   # preview every change
 *   node scripts/clean-unlisted-names.mjs             # apply
 *   npm run clean:unlisted-names -- --dry-run
 *
 * It is CONSERVATIVE and idempotent: it removes only leading logo junk and
 * trailing row boilerplate, never touches a name that's already clean, and
 * leaves the rest of the name alone — so curated names with intentional
 * CamelCase (Hero FinCorp, PharmEasy, boAt) are untouched, and a bracketed
 * qualifier that distinguishes two lines of the same company survives:
 * "Zepto Unlisted Shares (Equity)" becomes "Zepto (Equity)", not "Zepto".
 * Rows it can't confidently fix (e.g. a leading digit logo like "4A …") are
 * left for a manual edit in Studio.
 *
 * Only the DISPLAY NAME is changed. Slugs are left as-is — a slug is a public
 * URL and this script never moves one — and the old name is appended to
 * `aliases`, so tomorrow's list still resolves onto the same document instead
 * of creating a second one. An alias the document already answers to is not
 * added twice.
 *
 * Env: NEXT_PUBLIC_SANITY_PROJECT_ID, SANITY_API_TOKEN (Editor) — same as the
 * other importers.
 */

import { requireSanityEnv, sanityQuery, sanityMutate } from "./import-shared.mjs";
import {
  priceFusedName, hasUnbalancedBracket, stripListBoilerplate, normalizeCompanyName,
} from "./unlisted-matching.mjs";

/**
 * Strip leading OCR logo-junk and trailing row boilerplate from a company name.
 * Steps run front-to-back:
 *   1. a bracketed monogram: "[J] ", "[Z] "
 *   2. leading symbols: " «wx", '"India', "#ex", "=m", "|c", "~", "*", …
 *   3. a residual short lowercase logo token before the real name:
 *      "wx Fusion" → "Fusion", "ex Indian" → "Indian", "i Urban" → "Urban".
 * A real Indian company name never starts with a short lowercase word, so (3)
 * is safe; it also can't fire on an uppercase first word (so "A One Steel"
 * and "B9 Beverages" are safe).
 *
 * …then the tail, step 6: the list's "Unlisted Shares" / "Unlisted Share" row
 * boilerplate and a trailing "Price".
 */
export function cleanUnlistedName(raw) {
  const original = String(raw ?? "").trim();
  let s = original;

  // 0. A name with a price welded onto it is not OCR logo junk — it is a
  //    broken import, and every rule below assumes an otherwise-sound name.
  //    Running them anyway is what turned "(Manipal Cards) 385" into the
  //    dangling "Manipal Cards) 385" on 31-Jul-2026: step 2 read the opening
  //    bracket as a stray symbol and stripped it. Leave these alone; they
  //    belong to scripts/audit-unlisted.mjs.
  if (priceFusedName(s)) return s;

  // 1. bracketed monogram: "[J] ", "[Z] "
  s = s.replace(/^\[[A-Za-z0-9]{1,4}\]\s*/, "");

  // 2. leading symbols; a lowercase logo remnant ("ex" in "#ex Indian",
  //    "wx" in "«wx Fusion", "m" in "=m S3V") usually trails a stripped one.
  let hadSymbol = false;
  s = s.replace(/^[\s"'`«»“”„#=|~*·•¤%@!^&<>{}()\\/®™+]+/, () => { hadSymbol = true; return ""; });
  if (hadSymbol) s = s.replace(/^[a-z]{1,3}[.=]?\s+(?=[A-Za-z0-9])/, "");

  // 3. a stray leading single lowercase letter ("w Fino", "x Lakeshore",
  //    "a= Jai Mata") — never a real company-name start.
  s = s.replace(/^[a-z][.=]?\s+(?=[A-Z0-9])/, "");

  // 4. an ALL-UPPERCASE logo monogram (or a single uppercase letter) that
  //    duplicates the following word's initial: "GS Galaxeye" (G==G),
  //    "HPX Hindustan" (H), "A Arohan" (A). Requiring all-caps protects real
  //    Capitalised first words ("Tea Time", "Sun Drops", "Apl Metals"); the
  //    initial-match protects "A One Steel" (A≠O); and needing whitespace
  //    right after protects alphanumeric names ("B9 Beverages", "HDFC …").
  const m = s.match(/^([A-Z]{1,3})\.?\s+([A-Za-z])/);
  if (m && m[1][0] === m[2].toUpperCase()) s = s.slice(m[0].length - 1);

  // 5. trailing OCR junk ("Capgemini Technology Services|")
  s = s.replace(/[|"'`\\]+$/, "");

  // 6. The list's ROW BOILERPLATE — "Bazar India Unlisted Shares" is not a
  //    company name, it is a row heading the importer baked in when the row
  //    matched nothing. Shared with the matcher rather than reimplemented: the
  //    matcher strips this before comparing, so if the two ever drifted, this
  //    script would rename a document to something its own matcher no longer
  //    recognised and the next import would fork a duplicate.
  //
  //    It removes the boilerplate WHEREVER it sits, not just at the end, so a
  //    bracketed qualifier survives it: "Zepto Unlisted Shares (Equity)" keeps
  //    its "(Equity)", which is the only thing separating it from the CCPS line.
  s = stripListBoilerplate(s);

  s = s.replace(/\s{2,}/g, " ").trim();

  // 7. Never hand back a name whose brackets stopped pairing up. Step 2 strips
  //    leading symbols, and "(" is one of them — on a name that legitimately
  //    opens with a bracket that turns a tidy name into a broken one.
  if (hasUnbalancedBracket(s) && !hasUnbalancedBracket(original)) return original;

  return s;
}

// Allow importing the pure function (for tests) without running the script.
if (import.meta.url === `file://${process.argv[1]}`) {
  const dryRun = process.argv.includes("--dry-run");
  const env = requireSanityEnv();

  const docs = await sanityQuery(
    env,
    `*[_type == "unlistedShare" && !(_id in path("drafts.**"))]{ _id, company, "slug": slug.current, aliases }`,
  );

  const changes = [];
  for (const d of docs) {
    const cleaned = cleanUnlistedName(d.company);
    if (!cleaned || cleaned.length < 2 || cleaned === d.company) continue;
    // Keep the old name reachable. The next import matches on it, and without
    // this the row would find nothing and create a second document for a
    // company we just renamed. Skip it when the document already answers to it
    // — re-running this script must not stack duplicate aliases.
    const known = [cleaned, ...(d.aliases ?? [])].map(normalizeCompanyName).filter(Boolean);
    const keepAlias = !known.includes(normalizeCompanyName(d.company));
    changes.push({ _id: d._id, from: d.company, to: cleaned, keepAlias });
  }

  console.log(`${docs.length} unlisted companies scanned · ${changes.length} names to clean\n`);
  for (const c of changes) {
    console.log(`  "${c.from}"  →  "${c.to}"${c.keepAlias ? "   (+alias)" : ""}`);
  }

  if (changes.length === 0) {
    console.log("\nNothing to clean — every name is already tidy.");
    process.exit(0);
  }

  const aliased = changes.filter((c) => c.keepAlias).length;
  console.log(
    `\nSlugs are NOT touched — a slug is a public URL. ${aliased} of ${changes.length} ` +
    `also gain an alias; the other ${changes.length - aliased} already answer to the old name.`,
  );

  if (dryRun) {
    console.log("\n--dry-run: nothing written.");
    process.exit(0);
  }

  const mutations = [];
  for (const c of changes) {
    mutations.push({ patch: { id: c._id, set: { company: c.to } } });
    if (c.keepAlias) {
      mutations.push({ patch: { id: c._id, setIfMissing: { aliases: [] } } });
      mutations.push({ patch: { id: c._id, insert: { after: "aliases[-1]", items: [c.from] } } });
    }
  }
  await sanityMutate(env, mutations);
  console.log(`\nPatched ${changes.length} names in Sanity (${env.projectId}/${env.dataset}).`);
  console.log("The unlisted-shares page shows the tidy names on its next revalidation or deploy.");
}
