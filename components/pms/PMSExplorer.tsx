"use client";

import { useState, useMemo, useDeferredValue, useEffect, type CSSProperties } from "react";
import Link from "next/link";
import {
  Search, X, Check, SlidersHorizontal,
} from "lucide-react";
import type { LivePmsStrategy, PmsManagerLogos } from "@/lib/investment-data";
import { hasImplausibleReturn } from "@/lib/pms";
import { fmtAsOf, latestAmfiDate } from "@/lib/format";
import {
  type Period, type Strategy, type Benchmark,
  FALLBACK_BENCHMARK,
  toStrategy, alphaFor,
  ComplianceFootnote,
} from "@/components/pms/strategy-shared";
import { StrategyCard, STRATEGY_GRID_COLUMNS } from "@/components/pms/StrategyCard";
import { BriefSheet } from "@/components/pms/BriefSheet";
import { CompareTable } from "@/components/pms/CompareTable";
import { EnquireModal } from "@/components/pms/EnquireModal";
import { NewsletterBand } from "@/components/pms/NewsletterBand";
import { Modal } from "@/components/ui/Modal";

/*
  PlanMyCashflows — PMS Explorer
  ------------------------------------------------------------------
  Card-based explorer for the live PMS feed.

  - Data comes in as LivePmsStrategy[] (the same livePmsStrategiesQuery
    feed that powers the league table and compare tool), passed from a
    server component via getLivePmsStrategies(). Rows with implausible
    returns are dropped with hasImplausibleReturn before anything renders.
  - The shared types, benchmark series, tone helpers and the Brief sheet's
    sections (facts grid, returns table, honesty block, disclaimer) live in
    strategy-shared.tsx — the same pieces render the /pms/[slug] SEO pages.
  - The card itself is StrategyCard.tsx, shared with the homepage's Featured
    Strategies grid so both surfaces show the same figures. It used to be a
    local function here, which is how the homepage ended up with a thinner
    card of its own.
  - Fonts (Fraunces / Inter / IBM Plex Mono) are loaded via next/font in
    app/layout.tsx and exposed as CSS variables; the .font-display / .font-ui
    / .font-num helpers live in app/globals.css alongside the :root design
    tokens (--ink, --green, --pos, --neg, …).
  - "Alpha" = strategy return − benchmark return for the SELECTED period.
    Benchmark = S&P BSE 500 TRI. Periods with no clean benchmark (5Y, SI)
    show raw return, no alpha.
*/

/* ---------- types ---------- */
type SortKey = "aum" | "alpha" | "return" | "name";

/**
 * Cards rendered per page. The feed is ~1,700 strategies and each card is
 * ~46 DOM elements, so rendering the whole filtered set put ~80,000 nodes on
 * the page — seconds of blocked main thread on a mid-range phone, and well
 * past the point where browsers stay responsive. Filtering and sorting still
 * run over the entire feed; only the render is windowed.
 */
const PAGE_SIZE = 24;

/* ---------- compare modal ---------- */
/** The shell only — the table itself is CompareTable, shared with /compare. */
function CompareModal({ items, benchmark, asOn, managerLogos, onClose, onRemove }: {
  items: Strategy[];
  benchmark: Benchmark;
  asOn: string;
  managerLogos: PmsManagerLogos;
  onClose: () => void;
  onRemove: (s: Strategy) => void;
}) {
  if (!items.length) return null;
  return (
    <Modal onClose={onClose} label={`Compare ${items.length} strategies`} panelClassName="w-full max-w-4xl max-h-[85vh] overflow-auto rounded-2xl bg-white">
      <>
        <div className="sticky top-0 bg-white px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--line)", zIndex: 4 }}>
          <h2 className="font-display" style={{ fontSize: 20, fontWeight: 600, color: "var(--ink)" }}>Compare · {items.length} strategies</h2>
          <button onClick={onClose} aria-label="Close comparison" className="rounded-lg p-1.5" style={{ background: "var(--flat-bg)" }}><X size={18} color="var(--ink)" /></button>
        </div>
        <div className="p-5">
          <CompareTable items={items} benchmark={benchmark} asOn={asOn} managerLogos={managerLogos} onRemove={onRemove} />
        </div>
      </>
    </Modal>
  );
}

/* ---------- main ---------- */
export default function PMSExplorer({
  strategies,
  benchmark = FALLBACK_BENCHMARK,
  managerLogos = {},
}: {
  strategies: LivePmsStrategy[];
  benchmark?: Benchmark;
  /** manager → logo URL; sent as a lookup so the URL isn't repeated per row. */
  managerLogos?: PmsManagerLogos;
}) {
  const [period, setPeriod] = useState<Period>("3Y");
  const [sort, setSort] = useState<SortKey>("aum");
  const [query, setQuery] = useState<string>("");
  const [beatOnly, setBeatOnly] = useState<boolean>(false);
  const [compare, setCompare] = useState<Strategy[]>([]);
  const [brief, setBrief] = useState<Strategy | null>(null);
  const [enquire, setEnquire] = useState<Strategy | null>(null);
  const [showCompare, setShowCompare] = useState<boolean>(false);
  const [visibleCount, setVisibleCount] = useState<number>(PAGE_SIZE);

  // Keystrokes update the input immediately but the (whole-feed) filter runs
  // against a deferred copy, so typing never blocks on re-filtering ~1,700 rows.
  const deferredQuery = useDeferredValue(query);

  // Drop reporting artifacts first — same guard as the league table — so
  // cards, categories, count and as-of date all reflect the trustworthy set.
  const clean = useMemo(() => strategies.filter((s) => !hasImplausibleReturn(s)), [strategies]);
  const data = useMemo<Strategy[]>(() => clean.map((s) => toStrategy(s, clean)), [clean]);
  const asOf = useMemo(() => fmtAsOf(latestAmfiDate(clean.map((s) => s.asOfDate))), [clean]);

  // Category chips only exist for categories actually present in the data.
  // While the enrichment pass hasn't run (category mostly empty), this is []
  // and the chip row collapses to the A–Z link.
  //
  // These used to be client-side filter buttons. They are now plain <a> links
  // to /pms/category/[slug] — a filtered view that only exists in this
  // component's state is invisible to a crawler and impossible to link to,
  // which is how ~1,700 strategy pages ended up orphaned in the first place.
  const categories = useMemo(() => {
    const set = new Map<string, string>();
    data.forEach((s) => { if (s.category && s.categorySlug) set.set(s.categorySlug, s.category); });
    return Array.from(set, ([slug, label]) => ({ slug, label })).sort((a, b) => a.label.localeCompare(b.label));
  }, [data]);

  const toggleCompare = (s: Strategy) => {
    setCompare((prev) => prev.find((x) => x.id === s.id)
      ? prev.filter((x) => x.id !== s.id)
      : prev.length >= 3 ? prev : [...prev, s]);
  };
  const isSelected = (s: Strategy) => !!compare.find((x) => x.id === s.id);

  const filtered = useMemo<Strategy[]>(() => {
    let list = data;
    if (deferredQuery.trim()) {
      const q = deferredQuery.toLowerCase();
      list = list.filter((s) => (s.manager + " " + s.strategy).toLowerCase().includes(q));
    }
    if (beatOnly && benchmark.returns[period] !== null) list = list.filter((s) => (alphaFor(s.returns, period, benchmark.returns) ?? -Infinity) > 0);
    const val = (s: Strategy) => s.returns[period];
    list = [...list].sort((a, b) => {
      if (sort === "aum") return (b.aum ?? -1) - (a.aum ?? -1);
      if (sort === "return") return (val(b) ?? -999) - (val(a) ?? -999);
      if (sort === "alpha") return (alphaFor(b.returns, period, benchmark.returns) ?? -999) - (alphaFor(a.returns, period, benchmark.returns) ?? -999);
      if (sort === "name") return (a.manager + a.strategy).localeCompare(b.manager + b.strategy);
      return 0;
    });
    return list;
  }, [data, period, sort, deferredQuery, beatOnly, benchmark]);

  // Any change to the filter/sort inputs starts the window over, so a narrowed
  // result set never opens already scrolled deep into "show more" territory.
  useEffect(() => {
    setVisibleCount(PAGE_SIZE);
  }, [period, sort, deferredQuery, beatOnly]);

  const visible = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);
  const remaining = filtered.length - visible.length;

  const chipStyle: CSSProperties = {
    fontSize: 13, fontWeight: 500,
    color: "var(--ink)",
    background: "#fff",
    border: "1px solid var(--line)",
  };

  return (
    <div className="font-ui min-h-screen" style={{ background: "var(--page)", color: "var(--ink)" }}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="font-ui" style={{ fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--green-deep)", fontWeight: 600 }}>PlanMyCashflows</div>
            {/* h2, not h1 — the page hero (InvestmentProductPage) owns the page's h1 */}
            <h2 className="font-display" style={{ fontSize: 40, fontWeight: 600, color: "var(--ink)", lineHeight: 1.05, marginTop: 4 }}>PMS Explorer</h2>
            <p className="font-ui" style={{ fontSize: 15, color: "var(--muted)", marginTop: 8, maxWidth: 560 }}>
              We rank on <strong style={{ color: "var(--ink)" }}>alpha</strong>, not the raw return chart — because in PMS, last year&apos;s chart-topper is often next year&apos;s laggard. Every card shows return <em>and</em> what it beat.
            </p>
          </div>
          <div className="text-right">
            <div className="font-num" style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{filtered.length} of {data.length} shown</div>
            <div className="font-ui" style={{ fontSize: 12, color: "var(--muted)" }}>as on {asOf}</div>
          </div>
        </div>

        {/* controls — top-16 sticks them below the site header (sticky h-16 z-50) */}
        <div className="sticky top-16 z-30 -mx-4 px-4 sm:-mx-6 sm:px-6 py-3 mt-6" style={{ background: "var(--page)", borderBottom: "1px solid var(--line)" }}>
          {/* search + period + sort */}
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
                className="font-ui appearance-none rounded-xl bg-white pl-3 pr-8 py-2" style={{ fontSize: 13, border: "1px solid var(--line)", color: "var(--ink)" }}>
                <option value="aum">Sort: AUM</option>
                <option value="alpha">Sort: Alpha ({period})</option>
                <option value="return">Sort: Return ({period})</option>
                <option value="name">Sort: Name</option>
              </select>
              <SlidersHorizontal size={14} color="var(--muted)" style={{ position: "absolute", right: 10, top: 11, pointerEvents: "none" }} />
            </div>
          </div>

          {/* category links (hidden while the data has no categories),
              the full A–Z directory, then the beat-only toggle */}
          <div className="flex items-center gap-2 mt-2.5 overflow-x-auto pb-1 pmc-scroll">
            {categories.map((c) => (
              <a key={c.slug} href={`/pms/category/${c.slug}`} className="font-ui whitespace-nowrap rounded-full px-3 py-1.5 hover:underline" style={chipStyle}>{c.label}</a>
            ))}
            {/* Hidden while the feed is empty — /pms/all has nothing to list
                and 404s in that state. */}
            {data.length > 0 && (
              <Link href="/pms/all" className="font-ui whitespace-nowrap rounded-full px-3 py-1.5 hover:underline"
                style={{ fontSize: 13, fontWeight: 600, color: "#fff", background: "var(--ink)", border: "1px solid var(--ink)" }}>
                All {data.length.toLocaleString("en-IN")} strategies A–Z
              </Link>
            )}
            <div style={{ width: 1, height: 22, background: "var(--line)", margin: "0 4px" }} />
            <button onClick={() => setBeatOnly((v) => !v)} title={benchmark.returns[period] === null ? "No benchmark for this period" : ""}
              disabled={benchmark.returns[period] === null}
              className="font-ui whitespace-nowrap inline-flex items-center gap-1.5 rounded-full px-3 py-1.5"
              style={{ fontSize: 13, fontWeight: 500, opacity: benchmark.returns[period] === null ? 0.4 : 1,
                color: beatOnly ? "#fff" : "var(--green-deep)", background: beatOnly ? "var(--green)" : "var(--green-tint)", border: "1px solid transparent" }}>
              <Check size={13} /> Beat benchmark only
            </button>
          </div>
        </div>

        {/* grid */}
        {data.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-display" style={{ fontSize: 20, color: "var(--ink)" }}>Live data is being onboarded.</p>
            <p className="font-ui" style={{ fontSize: 14, color: "var(--muted)", marginTop: 6 }}>We refresh PMS strategy returns monthly from APMI disclosures — check back shortly.</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-display" style={{ fontSize: 20, color: "var(--ink)" }}>No strategies match those filters.</p>
            <p className="font-ui" style={{ fontSize: 14, color: "var(--muted)", marginTop: 6 }}>Try clearing “beat benchmark only,” or a broader search term.</p>
          </div>
        ) : (
          <>
            <div className="grid gap-4 mt-6" style={{ gridTemplateColumns: STRATEGY_GRID_COLUMNS }}>
              {visible.map((s) => (
                <StrategyCard key={s.id} s={s} period={period} benchmark={benchmark}
                  logoUrl={managerLogos[s.manager]}
                  selected={isSelected(s)} onCompare={toggleCompare} onBrief={setBrief} onEnquire={setEnquire} />
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

        {/* monthly brief signup */}
        <NewsletterBand source="pms-explorer" />

        {/* footnote */}
        <ComplianceFootnote asOn={asOf} benchName={benchmark.name} />
      </div>

      {/* compare tray */}
      {compare.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40" style={{ background: "var(--ink)" }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pmc-scroll">
              <span className="font-ui shrink-0" style={{ fontSize: 13, color: "#fff", fontWeight: 500 }}>{compare.length}/3 to compare:</span>
              {compare.map((s) => (
                <span key={s.id} className="font-ui shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1" style={{ fontSize: 12, background: "rgba(255,255,255,0.12)", color: "#fff" }}>
                  {s.strategy}<button onClick={() => toggleCompare(s)} aria-label={`Remove ${s.strategy} from comparison`}><X size={12} /></button>
                </span>
              ))}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={() => setCompare([])} className="font-ui" style={{ fontSize: 13, color: "rgba(255,255,255,0.7)" }}>Clear</button>
              <button onClick={() => setShowCompare(true)} className="font-ui rounded-lg px-4 py-2" style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)", background: "#fff" }}>Compare</button>
            </div>
          </div>
        </div>
      )}

      <BriefSheet s={brief} asOn={asOf} benchmark={benchmark} onClose={() => setBrief(null)} onEnquire={setEnquire} />
      {showCompare && <CompareModal items={compare} benchmark={benchmark} asOn={asOf} managerLogos={managerLogos} onClose={() => setShowCompare(false)} onRemove={toggleCompare} />}
      {/* z-[60] — sits above the brief sheet when opened from inside it */}
      {enquire && <EnquireModal strategy={enquire.strategy} source="pms-explorer" onClose={() => setEnquire(null)} />}
    </div>
  );
}
