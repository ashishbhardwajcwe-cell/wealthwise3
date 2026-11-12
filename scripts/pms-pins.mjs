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
 * So the pins live here instead, committed. Each pin is matched two ways:
 *
 *  1. By its EXACT name (exactKey: lowercase, whitespace collapsed, every
 *     word and punctuation mark kept). APMI lists siblings that differ only
 *     by a word or a hyphen the matcher strips — "…Investment Product" vs
 *     "…Investment Strategy", "Bespoke-Dynamic Debt" vs "Bespoke Dynamic
 *     Debt" — and only the exact name can tell those apart.
 *  2. By the normalised (manager, strategyName) pair (pairKey, the key the
 *     matcher itself uses), so a pin still follows its strategy through the
 *     punctuation and abbreviation drift `norm`/`stratNorm` absorb. This is
 *     a fallback: it only applies to a pin that no row matched exactly, and
 *     only when that pin is the sole resolved pin on its pairKey — otherwise
 *     a pair match could drag an unpinned sibling onto the wrong document.
 *
 * The CSV's own `sanityId` column still works and still wins, for a one-off
 * override.
 */

import { readFileSync, existsSync } from "node:fs";
import { pairKey } from "./pms-matching.mjs";

/**
 * A pin's exact identity: lowercase, whitespace collapsed, nothing else
 * touched — punctuation and generic words ("Product", "Strategy") are kept,
 * because they are exactly what separates the siblings pairKey merges.
 * Whitespace can't survive the collapse as "\n", so the separator can never
 * be name content.
 */
const exactPart = (s) => (s || "").toLowerCase().replace(/\s+/g, " ").trim();
export const exactKey = (manager, strategyName) => `${exactPart(manager)}\n${exactPart(strategyName)}`;

export const PINS_PATH = new URL("./pms-pins.json", import.meta.url);
/** Path as the user types it, for messages. */
export const PINS_DISPLAY_PATH = "scripts/pms-pins.json";

/**
 * Read and validate the pins file.
 *
 * Returns { byExact, byKey, resolved, unresolved, errors }:
 *   byExact     Map exactKey → pin, for every pin that carries an id
 *   byKey       Map pairKey → pin, ONLY where that pin is the sole resolved
 *               pin on its pairKey (siblings that share one are exact-only)
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
  const result = { byExact: new Map(), byKey: new Map(), resolved: [], unresolved: [], errors: [], displayPath };

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

  const seen = new Map(); // exactKey → index
  const idOwner = new Map(); // sanityId → index
  pins.forEach((pin, i) => {
    const where = `${displayPath} pins[${i}]`;
    const manager = typeof pin?.manager === "string" ? pin.manager.trim() : "";
    const strategyName = typeof pin?.strategyName === "string" ? pin.strategyName.trim() : "";
    const sanityId = typeof pin?.sanityId === "string" ? pin.sanityId.trim() : "";
    if (!manager || !strategyName) {
      result.errors.push(`${where}: "manager" and "strategyName" are both required.`);
      return;
    }
    const exact = exactKey(manager, strategyName);
    if (seen.has(exact)) {
      result.errors.push(
        `${where}: duplicates pins[${seen.get(exact)}] — "${manager} — ${strategyName}" ` +
        "is already declared. Two pins cannot claim one strategy.",
      );
      return;
    }
    seen.set(exact, i);
    if (sanityId && idOwner.has(sanityId)) {
      result.errors.push(
        `${where}: points at ${sanityId}, which pins[${idOwner.get(sanityId)}] already claims. ` +
        "Two strategies written to one document overwrite each other's numbers — give each its own id.",
      );
      return;
    }
    if (sanityId) idOwner.set(sanityId, i);

    const entry = {
      manager, strategyName, sanityId, note: pin?.note ?? "",
      key: pairKey(manager, strategyName), exactKey: exact, index: i,
      matched: 0, overridden: 0,
    };
    if (!sanityId) {
      // Declared but unfinished. Kept in the file on purpose — it records
      // WHICH rows are known-ambiguous even before anyone has looked up the
      // document ids — but it must never be applied as a pin.
      result.unresolved.push(entry);
      return;
    }
    result.resolved.push(entry);
    result.byExact.set(exact, entry);
  });

  // The pair fallback only for a pin that is alone on its pairKey. Two
  // resolved pins on one key are siblings the matcher can't tell apart, so
  // they must match by exact name or not at all.
  const perKey = new Map();
  for (const p of result.resolved) perKey.set(p.key, (perKey.get(p.key) ?? 0) + 1);
  for (const p of result.resolved) if (perKey.get(p.key) === 1) result.byKey.set(p.key, p);

  return result;
}

/**
 * Stamp `__pinnedId` / `__pinnedBy = "pins-file"` onto the CSV rows the pins
 * select, counting `matched` on each pin. Two passes:
 *
 *  1. exact name — always wins;
 *  2. pairKey — only for pins no row matched (or claimed) in pass 1, so when
 *     a pinned row and an unpinned sibling share a pairKey, the sibling falls
 *     through to the normal matcher instead of being dragged onto the pinned
 *     row's document.
 *
 * A row that already carries `__pinnedId` (the CSV's sanityId column) is left
 * alone. If its exact name matches a pin, that pin counts as `overridden` —
 * not unmatched — and is kept out of pass 2 for the same reason.
 */
export function applyPins(docs, pins) {
  const exactlyClaimed = new Set();
  for (const doc of docs) {
    const pin = pins.byExact.get(exactKey(doc.manager, doc.strategyName));
    if (!pin) continue;
    exactlyClaimed.add(pin);
    if (doc.__pinnedId) {
      pin.overridden++;
      continue;
    }
    pin.matched++;
    doc.__pinnedId = pin.sanityId;
    doc.__pinnedBy = "pins-file";
  }
  for (const doc of docs) {
    if (doc.__pinnedId) continue;
    const pin = pins.byKey.get(pairKey(doc.manager, doc.strategyName));
    if (!pin || exactlyClaimed.has(pin)) continue;
    pin.matched++;
    doc.__pinnedId = pin.sanityId;
    doc.__pinnedBy = "pins-file";
  }
  return docs;
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
