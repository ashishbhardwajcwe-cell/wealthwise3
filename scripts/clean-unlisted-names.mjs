#!/usr/bin/env node
/**
 * One-time (safe to re-run) cleanup for unlisted-share company names.
 *
 * The partner's price list is an image PDF; OCR captures the company logo as
 * junk on the front of the name — a bracketed monogram ("[J] Capgemini…"), a
 * stray symbol ('"India Carbon…', '«wx Fusion…', '#ex Indian Gas…') or a short
 * lowercase logo token ('i Urban Tots', 'm S3V Vascular'). This strips that
 * leading junk and patches the `company` field in place.
 *
 *   node scripts/clean-unlisted-names.mjs --dry-run   # preview every change
 *   node scripts/clean-unlisted-names.mjs             # apply
 *   npm run clean:unlisted-names -- --dry-run
 *
 * It is CONSERVATIVE and idempotent: it only removes leading logo junk, never
 * touches a name that's already clean, and leaves the middle/end of the name
 * alone — so curated names with intentional CamelCase (Hero FinCorp, PharmEasy,
 * boAt) are untouched. Rows it can't confidently fix (e.g. a leading digit
 * logo like "4A …") are left for a manual edit in Studio. Only the display
 * name is changed; slugs are left as-is (regenerate them if/when per-company
 * detail pages are built). Aliases keep the raw OCR name, so future imports
 * still match these documents.
 *
 * Env: NEXT_PUBLIC_SANITY_PROJECT_ID, SANITY_API_TOKEN (Editor) — same as the
 * other importers.
 */

import { requireSanityEnv, sanityQuery, sanityMutate } from "./import-shared.mjs";

/**
 * Strip leading OCR logo-junk from a company name. Steps run front-to-back:
 *   1. a bracketed monogram: "[J] ", "[Z] "
 *   2. leading symbols: " «wx", '"India', "#ex", "=m", "|c", "~", "*", …
 *   3. a residual short lowercase logo token before the real name:
 *      "wx Fusion" → "Fusion", "ex Indian" → "Indian", "i Urban" → "Urban".
 * A real Indian company name never starts with a short lowercase word, so (3)
 * is safe; it also can't fire on an uppercase first word (so "A One Steel"
 * and "B9 Beverages" are safe).
 */
export function cleanUnlistedName(raw) {
  let s = String(raw ?? "").trim();

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

  return s.replace(/\s{2,}/g, " ").trim();
}

// Allow importing the pure function (for tests) without running the script.
if (import.meta.url === `file://${process.argv[1]}`) {
  const dryRun = process.argv.includes("--dry-run");
  const env = requireSanityEnv();

  const docs = await sanityQuery(
    env,
    `*[_type == "unlistedShare" && !(_id in path("drafts.**"))]{ _id, company }`,
  );

  const changes = [];
  for (const d of docs) {
    const cleaned = cleanUnlistedName(d.company);
    if (cleaned && cleaned.length >= 2 && cleaned !== d.company) {
      changes.push({ _id: d._id, from: d.company, to: cleaned });
    }
  }

  console.log(`${docs.length} unlisted companies scanned · ${changes.length} names to clean\n`);
  for (const c of changes) console.log(`  "${c.from}"  →  "${c.to}"`);

  if (changes.length === 0) {
    console.log("\nNothing to clean — every name is already tidy.");
    process.exit(0);
  }
  if (dryRun) {
    console.log("\n--dry-run: nothing written.");
    process.exit(0);
  }

  await sanityMutate(env, changes.map((c) => ({ patch: { id: c._id, set: { company: c.to } } })));
  console.log(`\nPatched ${changes.length} names in Sanity (${env.projectId}/${env.dataset}).`);
  console.log("The unlisted-shares page shows the tidy names on its next revalidation or deploy.");
}
