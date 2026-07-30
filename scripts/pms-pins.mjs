/**
 * Persistent import pins — scripts/pms-pins.json.
 *
 * A handful of strategies are genuinely ambiguous to the name matcher: two
 * HDFC "MF Select" variants, and Neo's Club Moderate / Moderately Conservative
 * / Moderately Aggressive set. The importer refuses to guess between them and
 * aborts, which is correct — but the resolution has to be recorded somewhere
 * that survives.
 *
 * It used to be recorded in the `sanityId` column of scripts/pms-data.csv.
 * That file is REGENERATED from APMI every month, so every fetch silently
 * deleted the answer and every month's import aborted again on the same rows.
 *
 * So the pins live here instead, committed, keyed by the normalised
 * (manager, strategyName) pair — the same key the matcher itself uses, so a
 * pin follows a strategy through the punctuation and abbreviation drift that
 * `norm`/`stratNorm` already absorb. The CSV's own `sanityId` column still
 * works and still wins, for a one-off override.
 */

import { readFileSync, existsSync } from "node:fs";
import { pairKey } from "./pms-matching.mjs";

export const PINS_PATH = new URL("./pms-pins.json", import.meta.url);
/** Path as the user types it, for messages. */
export const PINS_DISPLAY_PATH = "scripts/pms-pins.json";

/**
 * Read and validate the pins file.
 *
 * Returns { byKey, resolved, unresolved, errors }:
 *   byKey       Map pairKey → pin, only for pins that actually carry an id
 *   resolved    pins with a sanityId (the ones that will be applied)
 *   unresolved  pins declaring a known-ambiguous row whose id hasn't been
 *               filled in yet — reported loudly, never applied
 *   errors      structural problems; the caller aborts on these
 *
 * A missing file is not an error: a project with no ambiguous rows needs no
 * pins, and the importer should still run.
 */
export function loadPins(path = PINS_PATH) {
  const fsPath = path instanceof URL ? path : new URL(`file://${path}`);
  // Name the file that was actually read — a --pins override pointing the
  // reader at scripts/pms-pins.json would send them to the wrong file.
  const displayPath = path === PINS_PATH ? PINS_DISPLAY_PATH : fsPath.pathname;
  const result = { byKey: new Map(), resolved: [], unresolved: [], errors: [], displayPath };

  if (!existsSync(fsPath)) return result;

  let parsed;
  try {
    parsed = JSON.parse(readFileSync(fsPath, "utf8"));
  } catch (err) {
    result.errors.push(`${displayPath} is not valid JSON: ${err.message}`);
    return result;
  }

  const pins = parsed?.pins;
  if (!Array.isArray(pins)) {
    result.errors.push(`${displayPath} must have a "pins" array.`);
    return result;
  }

  const seen = new Map();
  pins.forEach((pin, i) => {
    const where = `${displayPath} pins[${i}]`;
    const manager = typeof pin?.manager === "string" ? pin.manager.trim() : "";
    const strategyName = typeof pin?.strategyName === "string" ? pin.strategyName.trim() : "";
    const sanityId = typeof pin?.sanityId === "string" ? pin.sanityId.trim() : "";
    if (!manager || !strategyName) {
      result.errors.push(`${where}: "manager" and "strategyName" are both required.`);
      return;
    }
    const key = pairKey(manager, strategyName);
    if (seen.has(key)) {
      result.errors.push(
        `${where}: duplicates pins[${seen.get(key)}] — "${manager} — ${strategyName}" ` +
        "normalises to a pin that is already declared. Two pins cannot claim one strategy.",
      );
      return;
    }
    seen.set(key, i);

    const entry = { manager, strategyName, sanityId, note: pin?.note ?? "", key, index: i, matched: 0 };
    if (!sanityId) {
      // Declared but unfinished. Kept in the file on purpose — it records
      // WHICH rows are known-ambiguous even before anyone has looked up the
      // document ids — but it must never be applied as a pin.
      result.unresolved.push(entry);
      return;
    }
    result.resolved.push(entry);
    result.byKey.set(key, entry);
  });

  return result;
}

/** A paste-ready pins.json entry for an ambiguous row, printed by the importer. */
export function pinSuggestion(doc, candidates = []) {
  const first = candidates[0]?._id ?? "PASTE_THE_CORRECT_ID_HERE";
  return JSON.stringify(
    {
      manager: doc.manager,
      strategyName: doc.strategyName,
      sanityId: first,
      note: candidates.length
        ? `one of: ${candidates.map((c) => c._id).join(", ")}`
        : "no candidate found — check the strategy still exists in Sanity",
    },
    null,
    2,
  );
}
