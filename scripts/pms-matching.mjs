/**
 * Fuzzy name-matching for pmsStrategy documents, shared by the importer
 * (scripts/import-pms.mjs) and the duplicate merger
 * (scripts/merge-pms-duplicates.mjs).
 *
 * Why it exists: names drift between data refreshes ("Stallion Asset" vs
 * "Stallion Asset Private Limited", "S.E.L.F" vs "SELF", a leading/trailing
 * "PMS"). Without matching, every rename mints a duplicate document.
 *
 * The normalised (manager, strategyName) PAIR is the primary key here — NOT
 * the name-derived _id. The derived id used to be treated as the key, and
 * because it was a single 96-character slug of both fields concatenated, a
 * long manager name consumed the whole budget and every strategy from that
 * manager derived one identical id (360 ONE, Spark PWM, Neo Asset,
 * Trivantage, Motilal Oswal, HDFC). A derived id is now only ever minted for
 * a row that matches nothing — and it budgets both fields and carries a hash
 * of the pair so it cannot collide.
 */

import { slugify, shortHash } from "./import-shared.mjs";

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

/* ---------- document identity ---------- */

/**
 * The identity of a strategy: its manager and strategy name, normalised.
 * `stratNorm` on the strategy side means "Contra" and "PMS Contra Strategy"
 * are the same key — the same equivalence `isNearDuplicate` already treats as
 * a perfect name match, so a pair hit is always also a fuzzy hit.
 * "|" cannot survive norm(), so the separator can never be name content.
 */
export const pairKey = (manager, strategyName) => `${norm(manager)}|${stratNorm(strategyName)}`;

/**
 * The id shape earlier imports produced. Kept ONLY so documents those imports
 * created can still be recognised — never minted for a new document, because
 * slugify's 96-character cap makes it collide across a long-named manager's
 * whole strategy list.
 */
export const legacyStrategyId = (manager, strategyName) =>
  `pmsStrategy-${slugify(`${manager}-${strategyName}`)}`;

// Budgeted separately so neither field can consume the whole slug. 40 + 50 +
// an 8-char hash + separators + the "pmsStrategy-" prefix stays inside
// Sanity's 128-character document id limit.
const MANAGER_SLUG_BUDGET = 40;
const STRATEGY_SLUG_BUDGET = 50;
const clip = (s, max) => slugify(s || "").slice(0, max).replace(/-+$/g, "");

/**
 * A collision-free id for a genuinely new strategy: a truncated slug of each
 * field (so the id still reads like the strategy it points at) plus a
 * deterministic hash of the full `manager|strategyName` pair (so two rows
 * that truncate to the same text still get distinct ids). Deterministic, so
 * re-running the same CSV twice creates the document once.
 */
export function newStrategyId(manager, strategyName) {
  const parts = [clip(manager, MANAGER_SLUG_BUDGET), clip(strategyName, STRATEGY_SLUG_BUDGET)].filter(Boolean);
  return `pmsStrategy-${[...parts, shortHash(`${manager}|${strategyName}`)].join("-")}`;
}

/* ---------- importer-side target resolution ---------- */

/** Index the existing documents once: by _id, and by normalised name pair. */
export function buildExistingIndex(existingDocs) {
  const byId = new Map();
  const byPair = new Map();
  for (const doc of existingDocs) {
    byId.set(doc._id, doc);
    const key = pairKey(doc.manager, doc.strategyName);
    if (!byPair.has(key)) byPair.set(key, []);
    byPair.get(key).push(doc);
  }
  return { byId, byPair, docs: existingDocs };
}

/**
 * Narrow a set of candidate documents for one row, strongest signal first:
 * an exactly-equal name pair beats a decorated one, and the id this row's own
 * earlier imports wrote to beats an unrelated document. Returns the original
 * set when nothing separates them — the caller then calls it ambiguous.
 */
function narrow(candidates, row, legacyId) {
  if (candidates.length <= 1) return candidates;
  const exact = candidates.filter(
    (c) => norm(c.strategyName) === norm(row.strategyName) && norm(c.manager) === norm(row.manager),
  );
  if (exact.length === 1) return exact;
  const pool = exact.length ? exact : candidates;
  const legacy = pool.filter((c) => c._id === legacyId);
  return legacy.length === 1 ? legacy : pool;
}

/**
 * Decide which document a CSV row should write to:
 *  - "exact":     one existing doc carries the same normalised (manager,
 *                 strategyName) pair → update it, keeping ITS _id whatever
 *                 shape that id happens to have
 *  - "renamed":   no pair match, but exactly one existing doc is a
 *                 near-duplicate under a drifted name → write to that doc
 *  - "ambiguous": several candidates and nothing separates them → refuse; a
 *                 human resolves via the CSV's sanityId column
 *  - "new":       nothing matches → mint a fresh collision-free id
 *
 * Note what is NOT here: a lookup of the row's own derived id. Two rows can
 * derive the same legacy id, so finding a document under it proves nothing
 * about whose document it is. The legacy id is used only to break a tie
 * between candidates that already match the row by name.
 */
export function resolveImportTarget(row, index) {
  const legacyId = row.__legacyId ?? legacyStrategyId(row.manager, row.strategyName);

  const pairMatches = narrow(index.byPair.get(pairKey(row.manager, row.strategyName)) ?? [], row, legacyId);
  if (pairMatches.length === 1) return { id: pairMatches[0]._id, matchType: "exact", matched: pairMatches[0] };
  if (pairMatches.length > 1) {
    return {
      matchType: "ambiguous",
      candidates: pairMatches,
      reason: "several existing documents already carry this exact manager + strategy name",
    };
  }

  const fuzzy = narrow(index.docs.filter((e) => isNearDuplicate(row, e).match), row, legacyId);
  if (fuzzy.length === 1) return { id: fuzzy[0]._id, matchType: "renamed", matched: fuzzy[0] };
  if (fuzzy.length > 1) {
    return { matchType: "ambiguous", candidates: fuzzy, reason: "matches several existing documents by name" };
  }

  return { id: newStrategyId(row.manager, row.strategyName), matchType: "new" };
}
