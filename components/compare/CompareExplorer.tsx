"use client";

import {
  Suspense, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState,
  type CSSProperties,
} from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Check, Copy, Search, SlidersHorizontal, X } from "lucide-react";
import type { LivePmsStrategy, PmsManagerLogos } from "@/lib/investment-data";
import { hasImplausibleReturn } from "@/lib/pms";
import { fmtAsOf, latestAmfiDate } from "@/lib/format";
import {
  type Period, type Strategy, type Benchmark,
  toStrategy, alphaFor, toneOf, toneColor, AlphaChip,
} from "@/components/pms/strategy-shared";
import { StrategyCard, STRATEGY_GRID_COLUMNS } from "@/components/pms/StrategyCard";
import { BriefSheet } from "@/components/pms/BriefSheet";
import { CompareTable } from "@/components/pms/CompareTable";
import { EnquireModal } from "@/components/pms/EnquireModal";
import { CompanyLogo } from "@/components/CompanyLogo";

/*
  PlanMyCashflows — Compare (/compare)
  ------------------------------------------------------------------
  The compare-first entry point to the same live PMS feed the explorer
  runs on. It shares the explorer's primitives outright — StrategyCard,
  BriefSheet, CompareTable, EnquireModal, the shared tone/alpha helpers —
  so there is one card and one comparison table in the codebase.

  What it does differently from the explorer, and why:
   - The comparison renders INLINE under the slot rail, not behind a
     "Compare" button in a modal. This page exists to compare.
   - Category chips filter in place instead of linking to
     /pms/category/[slug]. The explorer's chips stay links (they are the
     crawl path); navigating away mid-pick is wrong on a picker.
   - Nothing is auto-selected. The page used to open on the first three
     strategies alphabetically — 1729 / 1729-NDPMS / 2Point2 — which is
     not a comparison, it is an accident of sort order. The rail opens
     empty with three quick-add chips ranked on 3Y alpha instead.
   - Selections live in the URL (?s=slug1,slug2,slug3), so any three-way
     comparison can be sent to someone or linked from the newsletter.
*/

/** Cards per page. This is a picker, not a browse surface — the explorer
 *  at /investment-products/pms is where the full feed is meant to be read. */
const PAGE_SIZE = 12;
const MAX_SLOTS = 3;

/** Quick-add ranking — the same rule the homepage Featured grid opens with:
 *  ranked on 3Y alpha, floor of ₹100 Cr AUM. */
const QUICK_ADD_PERIOD: Period = "3Y";
const QUICK_ADD_AUM_FLOOR = 100;

type SortKey = "aum" | "alpha" | "return" | "name";

const chipStyle: CSSProperties = {
  fontSize: 13,
  fontWeight: 500,
  color: "var(--ink)",
  background: "#fff",
  border: "1px solid var(--line)",
};

const activeChipStyle: CSSProperties = {
  ...chipStyle,
  color: "#fff",
  background: "var(--green)",
  border: "1px solid var(--green)",
};

/* ---------- slot rail pieces ---------- */
function EmptySlot() {
  return (
    <div className="rounded-xl flex items-center justify-center shrink-0"
      style={{ border: "1px dashed var(--line)", background: "rgba(255,255,255,0.5)", minWidth: 210, minHeight: 74, flex: "1 1 0%" }}>
      <span className="font-ui" style={{ fontSize: 12.5, color: "var(--muted)" }}>Pick a strategy below</span>
    </div>
  );
}

function FilledSlot({ s, period, benchmark, logoUrl, onRemove }: {
  s: Strategy;
  period: Period;
  benchmark: Benchmark;
  logoUrl?: string;
  onRemove: (s: Strategy) => void;
}) {
  const ret = s.returns[period];
  const alpha = alphaFor(s.returns, period, benchmark.returns);
  return (
    <div className="rounded-xl bg-white p-2.5 flex items-start gap-2 shrink-0"
      style={{ border: "1px solid var(--line)", minWidth: 210, minHeight: 74, flex: "1 1 0%" }}>
      <CompanyLogo
        name={s.manager}
        logoUrl={logoUrl}
        logoClassName="flex items-center justify-center shrink-0 overflow-hidden rounded-lg bg-white"
        logoStyle={{ width: 28, height: 28, border: "1px solid var(--line)", padding: 2 }}
        monogramClassName="flex items-center justify-center rounded-lg shrink-0 font-num"
        monogramStyle={{ width: 28, height: 28, background: "var(--green-tint)", color: "var(--green-deep)", fontSize: 11, fontWeight: 600 }}
      />
      <div className="min-w-0 flex-1">
        <div className="font-ui truncate" style={{ fontSize: 11, color: "var(--muted)" }}>{s.manager}</div>
        <div className="font-display truncate" title={s.strategy} style={{ fontSize: 13.5, fontWeight: 600, color: "var(--ink)", lineHeight: 1.2 }}>{s.strategy}</div>
        <div className="mt-1 flex items-center gap-1.5 flex-wrap">
          <span className="font-num" style={{ fontSize: 14, fontWeight: 600, color: ret === null ? "var(--muted)" : toneColor[toneOf(ret)] }}>
            {ret === null ? "N/A" : `${ret.toFixed(1)}%`}
          </span>
          <span className="font-ui" style={{ fontSize: 10, color: "var(--muted)" }}>{period}</span>
          <AlphaChip value={alpha} ret={ret} />
        </div>
      </div>
      <button onClick={() => onRemove(s)} aria-label={`Remove ${s.strategy} from comparison`}
        className="rounded-lg p-1 shrink-0" style={{ background: "var(--flat-bg)" }}>
        <X size={13} color="var(--ink)" />
      </button>
    </div>
  );
}

/* ---------- URL hydration ----------
   Isolated into its own component so the Suspense boundary the App Router
   requires around useSearchParams wraps a null-rendering child instead of the
   whole page — the card grid still prerenders. Reads once, on mount. */
function SelectionFromUrl({ onHydrate }: { onHydrate: (slugs: string[]) => void }) {
  const params = useSearchParams();
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    const raw = params.get("s") ?? "";
    onHydrate(raw.split(",").map((v) => v.trim()).filter(Boolean).slice(0, MAX_SLOTS));
  }, [params, onHydrate]);
  return null;
}

/* ---------- main ---------- */
export function CompareExplorer({ strategies, benchmark, managerLogos }: {
  strategies: LivePmsStrategy[];
  benchmark: Benchmark;
  /** manager → logo URL; a lookup, so the URL isn't repeated per row. */
  managerLogos: PmsManagerLogos;
}) {
  const router = useRouter();
  const pathname = usePathname();

  const [period, setPeriod] = useState<Period>("3Y");
  const [sort, setSort] = useState<SortKey>("aum");
  const [query, setQuery] = useState<string>("");
  const [category, setCategory] = useState<string | null>(null);
  const [beatOnly, setBeatOnly] = useState<boolean>(false);
  const [selected, setSelected] = useState<Strategy[]>([]);
  const [brief, setBrief] = useState<Strategy | null>(null);
  const [enquire, setEnquire] = useState<Strategy | null>(null);
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);
  const [flash, setFlash] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Typing updates the input immediately; the whole-feed filter runs against a
  // deferred copy, so a keystroke never blocks on re-filtering ~1,700 rows.
  const deferredQuery = useDeferredValue(query);

  // Reporting artifacts are dropped first, before anything renders — same
  // guard as the explorer and the league table.
  const clean = useMemo(() => strategies.filter((s) => !hasImplausibleReturn(s)), [strategies]);
  const data = useMemo<Strategy[]>(() => clean.map((s) => toStrategy(s, clean)), [clean]);
  const asOf = useMemo(() => fmtAsOf(latestAmfiDate(clean.map((s) => s.asOfDate))), [clean]);

  /* --- URL <-> selection --- */
  const hydrated = useRef(false);

  const hydrate = useCallback((slugs: string[]) => {
    if (slugs.length) {
      const bySlug = new Map(data.map((s) => [s.slug, s]));
      const picked = slugs.map((sl) => bySlug.get(sl)).filter((s): s is Strategy => !!s);
      // Never overwrite a selection the visitor already made in the moment
      // between mount and this reading of the query string.
      if (picked.length) setSelected((prev) => (prev.length ? prev : picked));
    }
    hydrated.current = true;
  }, [data]);

  useEffect(() => {
    if (!hydrated.current) return;
    const slugs = selected.map((s) => s.slug).join(",");
    // Slugs are already url-safe (lowercase + hyphens), so the comma stays
    // readable rather than being percent-encoded by URLSearchParams.
    router.replace(slugs ? `${pathname}?s=${slugs}` : pathname, { scroll: false });
    setCopied(false);
  }, [selected, pathname, router]);

  /* --- selection --- */
  const isSelected = useCallback((s: Strategy) => selected.some((x) => x.id === s.id), [selected]);

  const remove = useCallback((s: Strategy) => {
    setSelected((prev) => prev.filter((x) => x.id !== s.id));
  }, []);

  // Fills the first empty slot. With all three full the click is ignored and
  // the rail flashes, rather than silently dropping the pick.
  const toggle = useCallback((s: Strategy) => {
    if (selected.some((x) => x.id === s.id)) { remove(s); return; }
    if (selected.length >= MAX_SLOTS) { setFlash(true); return; }
    setSelected((prev) => [...prev, s]);
  }, [selected, remove]);

  useEffect(() => {
    if (!flash) return;
    const t = setTimeout(() => setFlash(false), 700);
    return () => clearTimeout(t);
  }, [flash]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
    } catch {
      // Clipboard blocked (insecure context or denied permission) — the URL in
      // the address bar is already the shareable one, so say nothing.
    }
  }, []);

  /* --- quick adds: top 3 by 3Y alpha, AUM floor ₹100 Cr --- */
  const quickAdds = useMemo<Strategy[]>(() => {
    const rank = (s: Strategy) => alphaFor(s.returns, QUICK_ADD_PERIOD, benchmark.returns);
    return data
      .filter((s) => (s.aum ?? 0) >= QUICK_ADD_AUM_FLOOR && s.returns[QUICK_ADD_PERIOD] !== null)
      .sort((a, b) => {
        const aa = rank(a);
        const ba = rank(b);
        if (aa !== null && ba !== null && aa !== ba) return ba - aa;
        if (aa !== null && ba === null) return -1;
        if (aa === null && ba !== null) return 1;
        // No benchmark for this window — fall back to the raw 3Y return so the
        // order stays deterministic rather than feed order.
        return (b.returns[QUICK_ADD_PERIOD] ?? 0) - (a.returns[QUICK_ADD_PERIOD] ?? 0);
      })
      .slice(0, MAX_SLOTS);
  }, [data, benchmark]);

  /* --- categories: filter buttons here, not links --- */
  const categories = useMemo(() => {
    const set = new Set<string>();
    data.forEach((s) => { if (s.category) set.add(s.category); });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [data]);

  const filtered = useMemo<Strategy[]>(() => {
    let list = data;
    if (category) list = list.filter((s) => s.category === category);
    if (deferredQuery.trim()) {
      const q = deferredQuery.toLowerCase();
      list = list.filter((s) => (s.manager + " " + s.strategy).toLowerCase().includes(q));
    }
    if (beatOnly && benchmark.returns[period] !== null) {
      list = list.filter((s) => (alphaFor(s.returns, period, benchmark.returns) ?? -Infinity) > 0);
    }
    const val = (s: Strategy) => s.returns[period];
    return [...list].sort((a, b) => {
      if (sort === "aum") return (b.aum ?? -1) - (a.aum ?? -1);
      if (sort === "return") return (val(b) ?? -999) - (val(a) ?? -999);
      if (sort === "alpha") return (alphaFor(b.returns, period, benchmark.returns) ?? -999) - (alphaFor(a.returns, period, benchmark.returns) ?? -999);
      if (sort === "name") return (a.manager + a.strategy).localeCompare(b.manager + b.strategy);
      return 0;
    });
  }, [data, category, period, sort, deferredQuery, beatOnly, benchmark]);

  // Any change to the filter/sort inputs starts the window over.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [period, sort, deferredQuery, beatOnly, category]);

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const remaining = filtered.length - visible.length;

  if (data.length === 0) {
    return (
      <div className="font-ui text-center py-16">
        <p className="font-display" style={{ fontSize: 20, color: "var(--ink)" }}>Live data is being onboarded.</p>
        <p className="font-ui" style={{ fontSize: 14, color: "var(--muted)", marginTop: 6 }}>
          We refresh PMS strategy returns monthly from APMI disclosures — check back shortly.
        </p>
      </div>
    );
  }

  const slots = Array.from({ length: MAX_SLOTS }, (_, i) => selected[i] ?? null);

  return (
    <div className="font-ui" style={{ color: "var(--ink)" }}>
      <Suspense fallback={null}>
        <SelectionFromUrl onHydrate={hydrate} />
      </Suspense>

      {/* ---------- slot rail — sticky below the site header (sticky h-16) ----------
          -mx-5 px-5 cancels container-wide's 1.25rem inline padding exactly, so
          the sticky band spans the viewport without pushing the page sideways. */}
      <div className="sticky top-16 z-30 -mx-5 px-5 py-3" style={{ background: "var(--page)", borderBottom: "1px solid var(--line)" }}>
        <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
          <div className="font-ui" style={{ fontSize: 12, color: "var(--muted)" }}>
            {selected.length} of {MAX_SLOTS} selected · showing {period} return
          </div>
          <div className="flex items-center gap-2">
            {selected.length > 0 && (
              <button onClick={() => setSelected([])} className="font-ui" style={{ fontSize: 12, color: "var(--muted)" }}>Clear</button>
            )}
            <button onClick={copyLink}
              className="font-ui inline-flex items-center gap-1.5 rounded-full px-3 py-1.5"
              style={{ fontSize: 12, fontWeight: 600, color: "var(--green-deep)", background: "var(--green-tint)" }}>
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? "Link copied" : "Copy link to this comparison"}
            </button>
          </div>
        </div>

        <div className="flex gap-2 overflow-x-auto pmc-scroll pb-1"
          style={{ outline: `2px solid ${flash ? "var(--green)" : "transparent"}`, outlineOffset: 4, borderRadius: 14, transition: "outline-color 220ms ease" }}>
          {slots.map((s, i) => s
            ? <FilledSlot key={s.id} s={s} period={period} benchmark={benchmark} logoUrl={managerLogos[s.manager]} onRemove={remove} />
            : <EmptySlot key={`empty-${i}`} />)}
        </div>

        {/* No auto-selection: an empty rail offers a ranked starting point
            instead of opening on whatever sorts first alphabetically. */}
        {selected.length === 0 && quickAdds.length > 0 && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2">
            <span className="font-ui" style={{ fontSize: 12.5, color: "var(--muted)" }}>Start with three the data likes</span>
            {/* Clamped: a chip carrying "360 ONE Open - Enhancer Series -
                Blended Equity Enhancer Portfolio" at full width pushes the
                whole page sideways on a phone. */}
            {quickAdds.map((s) => (
              <button key={s.id} onClick={() => toggle(s)}
                className="font-ui truncate rounded-full px-3 py-1.5 hover:underline"
                title={`${s.manager} — ${s.strategy}`}
                style={{ ...chipStyle, maxWidth: "min(100%, 260px)" }}>
                + {s.strategy}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* ---------- the comparison, inline ---------- */}
      {selected.length > 0 ? (
        <div className="mt-5 rounded-2xl bg-white p-4 sm:p-5" style={{ border: "1px solid var(--line)" }}>
          <CompareTable
            items={selected}
            benchmark={benchmark}
            asOn={asOf}
            managerLogos={managerLogos}
            onRemove={remove}
            onEnquire={setEnquire}
          />
          {selected.length === 1 && (
            <p className="font-ui" style={{ fontSize: 13, color: "var(--muted)", marginTop: 12 }}>
              Add one more to see them side by side.
            </p>
          )}
        </div>
      ) : null}

      {/* ---------- controls ---------- */}
      <div className="mt-6 pt-4" style={{ borderTop: "1px solid var(--line)" }}>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-2 rounded-xl px-3 py-2 bg-white flex-1 min-w-[220px]" style={{ border: "1px solid var(--line)" }}>
            <Search size={16} color="var(--muted)" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search manager or strategy…"
              className="font-ui w-full outline-none" style={{ fontSize: 14, background: "transparent", color: "var(--ink)" }} />
            {query && <button onClick={() => setQuery("")} aria-label="Clear search"><X size={15} color="var(--muted)" /></button>}
          </div>

          <div className="flex items-center rounded-xl bg-white overflow-hidden" style={{ border: "1px solid var(--line)" }}>
            <span className="font-ui px-2.5" style={{ fontSize: 11, color: "var(--muted)" }}>PERIOD</span>
            {(["1M", "1Y", "3Y", "5Y", "SI"] as const).map((p) => (
              <button key={p} onClick={() => setPeriod(p)} className="font-num px-2.5 py-2"
                style={{ fontSize: 12, fontWeight: 600, color: period === p ? "#fff" : "var(--ink)", background: period === p ? "var(--green)" : "transparent" }}>{p}</button>
            ))}
          </div>

          <div className="relative">
            <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}
              aria-label="Sort strategies"
              className="font-ui appearance-none rounded-xl bg-white pl-3 pr-8 py-2" style={{ fontSize: 13, border: "1px solid var(--line)", color: "var(--ink)" }}>
              <option value="aum">Sort: AUM</option>
              <option value="alpha">Sort: Alpha ({period})</option>
              <option value="return">Sort: Return ({period})</option>
              <option value="name">Sort: Name</option>
            </select>
            <SlidersHorizontal size={14} color="var(--muted)" style={{ position: "absolute", right: 10, top: 11, pointerEvents: "none" }} />
          </div>
        </div>

        {/* Category chips FILTER here rather than linking to
            /pms/category/[slug] — navigating away mid-pick is the wrong
            behaviour on a picker. The explorer's chips stay links: they are
            the crawl path to the category pages. */}
        <div className="flex items-center gap-2 mt-2.5 overflow-x-auto pb-1 pmc-scroll">
          {categories.length > 0 && (
            <button onClick={() => setCategory(null)} className="font-ui whitespace-nowrap rounded-full px-3 py-1.5"
              style={category === null ? activeChipStyle : chipStyle}>All</button>
          )}
          {categories.map((c) => (
            <button key={c} onClick={() => setCategory((prev) => (prev === c ? null : c))}
              className="font-ui whitespace-nowrap rounded-full px-3 py-1.5"
              style={category === c ? activeChipStyle : chipStyle}>{c}</button>
          ))}
          <div style={{ width: 1, height: 22, background: "var(--line)", margin: "0 4px" }} />
          <button onClick={() => setBeatOnly((v) => !v)} title={benchmark.returns[period] === null ? "No benchmark for this period" : ""}
            disabled={benchmark.returns[period] === null}
            className="font-ui whitespace-nowrap inline-flex items-center gap-1.5 rounded-full px-3 py-1.5"
            style={{ fontSize: 13, fontWeight: 500, opacity: benchmark.returns[period] === null ? 0.4 : 1,
              color: beatOnly ? "#fff" : "var(--green-deep)", background: beatOnly ? "var(--green)" : "var(--green-tint)", border: "1px solid transparent" }}>
            <Check size={13} /> Beat benchmark only
          </button>
        </div>

        <div className="font-ui flex flex-wrap items-baseline justify-between gap-2 mt-3">
          <p className="font-num" style={{ fontSize: 12.5, color: "var(--muted)", margin: 0 }}>
            {filtered.length.toLocaleString("en-IN")} of {data.length.toLocaleString("en-IN")} strategies
          </p>
          <p className="font-ui" style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>as on {asOf}</p>
        </div>
      </div>

      {/* ---------- card grid ---------- */}
      {filtered.length === 0 ? (
        <div className="text-center py-16">
          <p className="font-display" style={{ fontSize: 20, color: "var(--ink)" }}>No strategies match those filters.</p>
          <p className="font-ui" style={{ fontSize: 14, color: "var(--muted)", marginTop: 6 }}>Try clearing “beat benchmark only,” a category, or a broader search term.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-4 mt-5" style={{ gridTemplateColumns: STRATEGY_GRID_COLUMNS }}>
            {visible.map((s) => (
              <StrategyCard key={s.id} s={s} period={period} benchmark={benchmark}
                logoUrl={managerLogos[s.manager]}
                selected={isSelected(s)} onCompare={toggle} onBrief={setBrief} onEnquire={setEnquire} />
            ))}
          </div>
          {remaining > 0 && (
            <div className="mt-6 flex flex-col items-center gap-2">
              <button
                onClick={() => setVisibleCount((n) => n + PAGE_SIZE)}
                className="font-ui rounded-xl px-5 py-2.5"
                style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", background: "#fff", border: "1px solid var(--line)" }}
              >
                Show {Math.min(remaining, PAGE_SIZE)} more
              </button>
              {/* aria-live so the count is announced as the window grows. */}
              <p className="font-num" aria-live="polite" style={{ fontSize: 12, color: "var(--muted)", margin: 0 }}>
                Showing {visible.length} of {filtered.length}
              </p>
            </div>
          )}
        </>
      )}

      <BriefSheet s={brief} asOn={asOf} benchmark={benchmark} onClose={() => setBrief(null)} onEnquire={setEnquire} />
      {/* z-[60] — sits above the brief sheet when opened from inside it */}
      {enquire && <EnquireModal strategy={enquire.strategy} source="compare" onClose={() => setEnquire(null)} />}
    </div>
  );
}
