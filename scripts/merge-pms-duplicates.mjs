#!/usr/bin/env node
/**
 * PMS duplicate merger — finds pmsStrategy documents whose returns are all
 * empty and pairs each with a near-duplicate (fuzzy name match) that HAS
 * returns but no category. The pair is merged: the category is copied onto
 * the document with returns and the empty duplicate is deleted.
 *
 * Why these exist: the importer derives _id from manager + strategyName
 * (scripts/import-pms.mjs), so re-importing a row under a slightly
 * corrected name creates a NEW document instead of updating the old one.
 * The old doc keeps its category but never gets fresh returns; the new doc
 * has the returns but an empty category — which is exactly what shows up
 * as "N/A everywhere" cards when filtering by category on
 * /investment-products/pms.
 *
 *   node scripts/merge-pms-duplicates.mjs                  # dry run — prints the merge plan, changes nothing
 *   node scripts/merge-pms-duplicates.mjs --apply          # executes the merges, prints each one
 *   node scripts/merge-pms-duplicates.mjs --sweep          # dry run, ALSO matching keepers that already have a
 *                                                          # category (delete-only merges — nothing is copied);
 *                                                          # pairs whose categories disagree are skipped for review
 *   node scripts/merge-pms-duplicates.mjs --sweep --apply  # execute the sweep
 *
 * When the auto-matcher can't pair an empty doc (APMI often bakes the brand
 * into the strategy name — "Stallion Core Fund" vs a hand-entered "Core
 * Fund" — which is beyond safe fuzzy range), finish by hand:
 *
 *   --suggest                          # read-only: top-3 closest returns-bearing docs per unmatched empty
 *   --merge=<emptyId>:<keeperId>       # explicit merge (repeatable); validated, dry run unless --apply
 *   --delete=<docId>                   # delete a true singleton (repeatable); refuses docs that have returns
 *
 * Required env vars (environment or .env.local):
 *   NEXT_PUBLIC_SANITY_PROJECT_ID
 *   NEXT_PUBLIC_SANITY_DATASET       (default: production)
 *   SANITY_API_TOKEN                 (Viewer is enough for the dry run;
 *                                     --apply needs Editor/write access)
 */

import { pathToFileURL } from "node:url";
import { loadDotEnvLocal } from "./import-shared.mjs";

const RETURN_KEYS = ["m1", "m3", "m6", "y1", "y2", "y3", "y4", "y5", "sinceInception"];

let projectId, dataset, apiVersion, token;

/* ---------- sanity http helpers ---------- */
async function groqQuery(query) {
  const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/query/${dataset}?query=${encodeURIComponent(query)}`;
  const res = await fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`Sanity query failed (HTTP ${res.status}):\n${JSON.stringify(body, null, 2)}`);
    process.exit(1);
  }
  return body.result;
}

async function mutate(mutations) {
  const url = `https://${projectId}.api.sanity.io/v${apiVersion}/data/mutate/${dataset}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify({ mutations }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    console.error(`Sanity mutate failed (HTTP ${res.status}):\n${JSON.stringify(body, null, 2)}\n` +
      "Most common cause: SANITY_API_TOKEN lacks write (Editor) permission.");
    process.exit(1);
  }
}

/* ---------- fuzzy name matching ---------- */
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

function levenshtein(a, b) {
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
 * Fraction of the empty doc's strategy-name tokens that also appear in the
 * candidate's — catches brand-prefixed APMI names ("Core Fund" ⊂ "Stallion
 * Core Fund" → 1.0) that Levenshtein misses. Used only to rank --suggest
 * candidates, never to auto-merge.
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

/* ---------- diagnose + merge ---------- */
async function main() {
  const APPLY = process.argv.includes("--apply");
  const SWEEP = process.argv.includes("--sweep");
  const SUGGEST = process.argv.includes("--suggest");
  const mergeArgs = process.argv.filter((a) => a.startsWith("--merge=")).map((a) => a.slice("--merge=".length));
  const deleteArgs = process.argv.filter((a) => a.startsWith("--delete=")).map((a) => a.slice("--delete=".length));

  loadDotEnvLocal();
  projectId = process.env.NEXT_PUBLIC_SANITY_PROJECT_ID;
  dataset = process.env.NEXT_PUBLIC_SANITY_DATASET || "production";
  apiVersion = process.env.NEXT_PUBLIC_SANITY_API_VERSION || "2024-09-01";
  token = process.env.SANITY_API_TOKEN;
  if (!projectId) {
    console.error("Missing NEXT_PUBLIC_SANITY_PROJECT_ID (set it in the environment or .env.local).");
    process.exit(1);
  }
  if (APPLY && !token) {
    console.error("--apply needs SANITY_API_TOKEN with write (Editor) access.");
    process.exit(1);
  }

  const docs = await groqQuery(
    `*[_type == "pmsStrategy" && !(_id in path("drafts.**"))]{ _id, strategyName, manager, category, aumCr, returns }`,
  );

  const hasAnyReturn = (d) => RETURN_KEYS.some((k) => typeof d.returns?.[k] === "number");
  const label = (d) => `${d.manager} — ${d.strategyName}`;

  // ----- explicit mode: --merge= / --delete= pairs decided by a human -----
  if (mergeArgs.length || deleteArgs.length) {
    const byId = new Map(docs.map((d) => [d._id, d]));
    const ops = [];
    for (const spec of mergeArgs) {
      const [emptyId, keeperId] = spec.split(":");
      const empty = byId.get(emptyId);
      const keeper = byId.get(keeperId);
      if (!empty || !keeper) { console.log(`  ✗ --merge ${spec}: ${!empty ? emptyId : keeperId} not found`); continue; }
      if (hasAnyReturn(empty)) { console.log(`  ✗ --merge ${spec}: ${label(empty)} has return figures — refusing to delete it`); continue; }
      if (!hasAnyReturn(keeper)) { console.log(`  ✗ --merge ${spec}: keeper ${label(keeper)} has no returns — wrong way round?`); continue; }
      const plan = classifyMerge(empty, keeper);
      if (plan.action === "conflict") {
        console.log(`  ✗ --merge ${spec}: category conflict (empty "${empty.category}" vs keeper "${keeper.category}") — align them in the Studio first`);
        continue;
      }
      ops.push({
        desc: `merge ${label(empty)} → ${label(keeper)}${plan.action === "copy-delete" ? ` (copy category "${plan.category}")` : ""}`,
        muts: [
          ...(plan.action === "copy-delete" ? [{ patch: { id: keeper._id, set: { category: plan.category } } }] : []),
          { delete: { id: empty._id } },
        ],
      });
    }
    for (const id of deleteArgs) {
      const doc = byId.get(id);
      if (!doc) { console.log(`  ✗ --delete ${id}: not found`); continue; }
      if (hasAnyReturn(doc)) { console.log(`  ✗ --delete ${id}: ${label(doc)} has return figures — refusing`); continue; }
      ops.push({ desc: `delete ${label(doc)}  [${id}]`, muts: [{ delete: { id } }] });
    }
    if (!ops.length) { console.log("Nothing valid to do."); return; }
    if (!APPLY) {
      console.log(`PLAN (dry run — add --apply to execute): ${ops.length} operation(s)\n`);
      for (const op of ops) console.log(`  • ${op.desc}`);
      return;
    }
    for (const op of ops) {
      await mutate(op.muts);
      console.log(`  done: ${op.desc}`);
    }
    console.log(`\nDone — ${ops.length} operation(s) applied. The site picks the change up on the next revalidation (≤5 min).`);
    return;
  }

  const empties = docs.filter((d) => !hasAnyReturn(d));
  const fullsAll = docs.filter((d) => hasAnyReturn(d));
  // Default pass only pairs empties with uncategorised keepers (the merge
  // copies the category over). --sweep widens the net to every returns-
  // bearing doc, turning matches with already-categorised keepers into
  // delete-only merges.
  const fulls = fullsAll.filter((d) => SWEEP || !d.category);

  console.log(`${docs.length} pmsStrategy documents in ${projectId}/${dataset}`);
  console.log(`  ${empties.length} with no return figures at all (the "N/A" cards)`);
  console.log(`  ${fulls.length} returns-bearing merge candidates${SWEEP ? " (sweep: categorised keepers included)" : " (no category)"}\n`);
  const merges = [];
  const ambiguous = [];
  const unmatched = [];

  for (const empty of empties) {
    const matches = fulls
      .map((full) => ({ full, ...isNearDuplicate(empty, full) }))
      .filter((m) => m.match);
    if (matches.length === 1) merges.push({ empty, ...matches[0] });
    else if (matches.length > 1) ambiguous.push({ empty, matches });
    else unmatched.push(empty);
  }

  // A full doc claimed by more than one empty is ambiguous too — hands off.
  const claims = new Map();
  for (const m of merges) claims.set(m.full._id, (claims.get(m.full._id) ?? 0) + 1);
  const unique = merges.filter((m) => claims.get(m.full._id) === 1);
  const contested = merges.filter((m) => claims.get(m.full._id) > 1);

  // Category conflicts (empty and keeper disagree) are never auto-merged.
  const safe = [];
  const conflicts = [];
  for (const m of unique) {
    const plan = classifyMerge(m.empty, m.full);
    if (plan.action === "conflict") conflicts.push(m);
    else safe.push({ ...m, plan });
  }

  if (safe.length === 0) {
    console.log("No safe merges found.");
  } else {
    console.log(`${APPLY ? "MERGING" : "MERGE PLAN (dry run — re-run with --apply to execute)"}: ${safe.length} pair(s)\n`);
    for (const { empty, full, plan, stratSim, mgrSim } of safe) {
      const cat = plan.action === "copy-delete"
        ? `copy category "${plan.category}"`
        : plan.category
          ? `keeper already categorised "${plan.category}" — delete only`
          : "no category on either side — delete only";
      console.log(`  • KEEP   ${label(full)}  [${full._id}]`);
      console.log(`    DELETE ${label(empty)}  [${empty._id}]`);
      console.log(`    ${cat} · name similarity strategy=${(stratSim * 100).toFixed(0)}% manager=${(mgrSim * 100).toFixed(0)}%\n`);
    }
  }

  for (const m of conflicts) {
    console.log(`  ⚠ SKIPPED (category conflict — empty says "${m.empty.category}", keeper says "${m.full.category}"): ${label(m.empty)} [${m.empty._id}] → ${label(m.full)} [${m.full._id}]`);
  }

  for (const { empty, matches } of ambiguous) {
    console.log(`  ⚠ SKIPPED (matches ${matches.length} docs — resolve by hand): ${label(empty)} [${empty._id}]`);
    for (const m of matches) console.log(`      candidate: ${label(m.full)} [${m.full._id}]`);
  }
  for (const m of contested) {
    console.log(`  ⚠ SKIPPED (keeper claimed by multiple empties): ${label(m.empty)} [${m.empty._id}] → ${label(m.full)}`);
  }
  for (const d of unmatched) {
    console.log(`  ⚠ NO MATCH (empty doc, no near-duplicate with returns — left in place): ${label(d)} [${d._id}]`);
    if (SUGGEST) {
      // Rank every returns-bearing doc by a blend of fuzzy similarity and
      // token overlap (the latter catches brand-prefixed APMI names).
      const ranked = fullsAll
        .map((full) => {
          const stratSim = similarity(d.strategyName, full.strategyName, stratNorm);
          const overlap = tokenOverlap(d.strategyName, full.strategyName);
          const mgrSim = similarity(d.manager, full.manager);
          return { full, stratSim, overlap, mgrSim, score: 0.6 * Math.max(stratSim, overlap) + 0.4 * mgrSim };
        })
        .sort((x, y) => y.score - x.score)
        .slice(0, 3);
      for (const r of ranked) {
        console.log(`      closest: ${label(r.full)}  [${r.full._id}]`);
        console.log(`               score=${(r.score * 100).toFixed(0)}% (strat=${(r.stratSim * 100).toFixed(0)}% overlap=${(r.overlap * 100).toFixed(0)}% mgr=${(r.mgrSim * 100).toFixed(0)}%)${r.full.category ? ` · keeper category "${r.full.category}"` : ""}`);
      }
      console.log(`      → to merge: --merge=${d._id}:<keeperId>   · to remove as a singleton: --delete=${d._id}`);
    }
  }

  if (APPLY && safe.length > 0) {
    // One transaction per pair: the category patch and the delete land
    // together or not at all.
    for (const { empty, full, plan } of safe) {
      const mutations = [
        ...(plan.action === "copy-delete"
          ? [{ patch: { id: full._id, set: { category: plan.category } } }]
          : []),
        { delete: { id: empty._id } },
      ];
      await mutate(mutations);
      const note = plan.action === "copy-delete"
        ? ` (category ${plan.category})`
        : plan.category ? ` (kept keeper's ${plan.category})` : "";
      console.log(`  merged: ${label(empty)} → ${label(full)}${note}`);
    }
    console.log(`\nDone — ${safe.length} merge(s) applied. The site picks the change up on the next revalidation (≤5 min).`);
  } else if (!APPLY && safe.length > 0) {
    console.log("\nDry run only — nothing was changed. Re-run with --apply to execute the merges above.");
  }
}

// Only run when invoked directly (node scripts/merge-pms-duplicates.mjs),
// not when the matcher functions are imported elsewhere.
if (import.meta.url === pathToFileURL(process.argv[1] ?? "").href) {
  await main();
}
