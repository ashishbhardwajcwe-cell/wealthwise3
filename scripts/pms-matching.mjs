/**
 * Fuzzy name-matching for pmsStrategy documents, shared by the importer
 * (scripts/import-pms.mjs) and the duplicate merger
 * (scripts/merge-pms-duplicates.mjs).
 *
 * Why it exists: document _ids are derived from manager + strategyName, and
 * both drift between data refreshes ("Stallion Asset" vs "Stallion Asset
 * Private Limited", "S.E.L.F" vs "SELF", a leading/trailing "PMS"). Without
 * matching, every rename mints a duplicate document.
 */

export const norm = (s) =>
  (s || "")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/**
 * Strategy names drift by generic decorations: a leading or trailing "PMS"
 * and trailing filler like "Fund" / "Strategy" / "Portfolio" / "Product"
 * come and go between imports (e.g. "Opportunities PMS" vs "Opportunities").
 * Strip them before comparing — but never strip a name down to nothing
 * (fall back to the plain normalised name).
 */
const GENERIC_TAIL = new Set(["fund", "strategy", "portfolio", "product", "scheme", "approach", "plan", "pms"]);
export function stratNorm(s) {
  const tokens = norm(s).split(" ").filter(Boolean);
  if (tokens[0] === "pms") tokens.shift();
  while (tokens.length > 1 && GENERIC_TAIL.has(tokens[tokens.length - 1])) tokens.pop();
  const stripped = tokens.join(" ");
  return stripped || norm(s);
}

export function levenshtein(a, b) {
  if (a === b) return 0;
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, j) => j);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

/** 1 = identical after normalisation, 0 = nothing in common. */
export function similarity(a, b, normalise = norm) {
  const na = normalise(a).replace(/ /g, "");
  const nb = normalise(b).replace(/ /g, "");
  if (!na || !nb) return 0;
  if (na === nb) return 1;
  return 1 - levenshtein(na, nb) / Math.max(na.length, nb.length);
}

/**
 * Near-duplicate test. Strategy names must match almost exactly after
 * generic-word stripping (drift is punctuation/abbreviation/decoration:
 * "S.E.L.F" vs "SELF", "PMS Contra Strategy" vs "Contra"); manager names
 * drift more (e.g. "Sundaram Alternates" vs "Sundaram Alternate Asset
 * Management"), so they pass on similarity OR a shared first word.
 */
export function isNearDuplicate(a, b) {
  const stratSim = similarity(a.strategyName, b.strategyName, stratNorm);
  if (stratSim < 0.85) return { match: false };
  const mgrSim = similarity(a.manager, b.manager);
  const firstWord = (s) => norm(s).split(" ")[0];
  const mgrRelated = mgrSim >= 0.7 || (firstWord(a.manager) && firstWord(a.manager) === firstWord(b.manager));
  return { match: mgrRelated, stratSim, mgrSim };
}

/**
 * Fraction of the first name's strategy tokens that also appear in the
 * second's — catches brand-prefixed APMI names ("Core Fund" ⊂ "Stallion
 * Core Fund" → 1.0) that Levenshtein misses. Used only to rank suggestions,
 * never to auto-merge.
 */
export function tokenOverlap(a, b) {
  const ta = stratNorm(a).split(" ").filter(Boolean);
  const tb = new Set(stratNorm(b).split(" ").filter(Boolean));
  if (!ta.length) return 0;
  return ta.filter((t) => tb.has(t)).length / ta.length;
}

/**
 * Decide what merging an empty doc into a returns-bearing keeper means:
 *  - keeper has no category, empty has one   → copy it over, then delete
 *  - categories agree (or empty has none)    → nothing to copy, just delete
 *  - categories disagree                     → conflict, hands off
 */
export function classifyMerge(empty, keeper) {
  if (empty.category && keeper.category && empty.category !== keeper.category) {
    return { action: "conflict" };
  }
  if (empty.category && !keeper.category) {
    return { action: "copy-delete", category: empty.category };
  }
  return { action: "delete-only", category: keeper.category ?? null };
}

/**
 * Importer-side rename guard. Given a CSV row (with its proposed
 * name-derived _id) and the existing documents, decide which document the
 * row should write to:
 *  - "exact":     a doc with the proposed _id already exists → normal update
 *  - "renamed":   exactly one existing doc is a near-duplicate under a
 *                 different name → write to THAT doc's _id, preserving its
 *                 identity instead of minting a duplicate
 *  - "ambiguous": several near-duplicates → refuse; a human resolves via
 *                 the CSV's sanityId column
 *  - "new":       nothing matches → genuinely new strategy
 */
export function resolveImportTarget(row, existingById, existingDocs) {
  if (existingById.has(row._id)) return { id: row._id, matchType: "exact" };
  const candidates = existingDocs.filter((e) => isNearDuplicate(row, e).match);
  if (candidates.length === 1) return { id: candidates[0]._id, matchType: "renamed", matched: candidates[0] };
  if (candidates.length > 1) return { matchType: "ambiguous", candidates };
  return { id: row._id, matchType: "new" };
}
