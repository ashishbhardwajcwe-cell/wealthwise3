/**
 * Declared name → document mappings — scripts/unlisted-aliases.json.
 *
 * The heuristics in unlisted-matching.mjs get most of the partner's list onto
 * the right documents. They cannot get all of it, and they should not try:
 * "IFincorp Limited" is our stored spelling of "ICL Fincorp Limited" with a
 * character missing, "Hur Solar" is "HVR Solar" with one substituted, and
 * "csk" is three letters that could belong to anything. A rule loose enough to
 * catch those is loose enough to put a price on the wrong company.
 *
 * So the tail is DECLARED rather than guessed, in a committed file, the same
 * way scripts/pms-pins.json records the PMS strategies the matcher refuses to
 * separate. An entry is an operator's decision and outranks every heuristic.
 *
 * Keyed by the target document's slug — stable, human-checkable, and the thing
 * an operator can see in Studio's URL bar.
 */

import { readFileSync, existsSync } from "node:fs";
import { declaredNameKey } from "./unlisted-matching.mjs";

export const ALIASES_PATH = new URL("./unlisted-aliases.json", import.meta.url);
/** Path as the user types it, for messages. */
export const ALIASES_DISPLAY_PATH = "scripts/unlisted-aliases.json";

/**
 * Read and validate the alias file.
 *
 * Returns { byIncoming, entries, errors, displayPath }:
 *   byIncoming  Map normalised incoming name → target slug, for the matcher
 *   entries     [{ slug, name }] in file order, for reports and the cleanup
 *   errors      structural problems; the caller aborts on these
 *
 * A missing file is not an error — a dataset with no declared pairs should
 * still import.
 */
export function loadUnlistedAliases(path = ALIASES_PATH) {
  const fsPath = path instanceof URL ? path : new URL(`file://${path}`);
  const displayPath = path === ALIASES_PATH ? ALIASES_DISPLAY_PATH : fsPath.pathname;
  const result = { byIncoming: new Map(), entries: [], errors: [], displayPath };

  if (!existsSync(fsPath)) return result;

  let parsed;
  try {
    parsed = JSON.parse(readFileSync(fsPath, "utf8"));
  } catch (err) {
    result.errors.push(`${displayPath} is not valid JSON: ${err.message}`);
    return result;
  }

  const aliases = parsed?.aliases;
  if (aliases === undefined) return result;
  if (typeof aliases !== "object" || Array.isArray(aliases) || aliases === null) {
    result.errors.push(`${displayPath} must have an "aliases" object keyed by document slug.`);
    return result;
  }

  // A name declared for two different documents is the one mistake this file
  // can make that the matcher could not catch — it would resolve by whichever
  // key the object happened to iterate first.
  const claimedBy = new Map();

  for (const [slug, names] of Object.entries(aliases)) {
    if (!slug.trim()) {
      result.errors.push(`${displayPath}: an entry has an empty slug.`);
      continue;
    }
    if (!Array.isArray(names)) {
      result.errors.push(`${displayPath}: "${slug}" must map to an array of list names.`);
      continue;
    }
    for (const name of names) {
      if (typeof name !== "string" || !name.trim()) {
        result.errors.push(`${displayPath}: "${slug}" has an entry that is not a non-empty string.`);
        continue;
      }
      const key = declaredNameKey(name);
      if (!key) {
        result.errors.push(`${displayPath}: "${name}" (under "${slug}") normalises to nothing.`);
        continue;
      }
      const owner = claimedBy.get(key);
      if (owner && owner !== slug) {
        result.errors.push(
          `${displayPath}: "${name}" is declared for both "${owner}" and "${slug}" — it can only belong to one.`,
        );
        continue;
      }
      claimedBy.set(key, slug);
      result.byIncoming.set(key, slug);
      result.entries.push({ slug, name });
    }
  }

  return result;
}

/**
 * Which declared entries point at a slug no document has. A typo here would
 * otherwise be silent — the row would fall through to the heuristics and quite
 * possibly create the duplicate the entry was written to prevent.
 */
export function unresolvedAliasTargets(entries, docs) {
  const slugs = new Set(docs.map((d) => d.slug).filter(Boolean));
  return entries.filter((e) => !slugs.has(e.slug));
}
