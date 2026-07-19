"use client";

import { useState, useMemo, type CSSProperties } from "react";
import {
  Search, X, Check, Scale, Info, SlidersHorizontal,
  ArrowUpRight, ArrowDownRight, ChevronRight,
} from "lucide-react";
import type { LivePmsStrategy } from "@/lib/investment-data";
import { hasImplausibleReturn } from "@/components/data-tables/LeagueTable";
import { fmtAsOf, latestAmfiDate } from "@/components/tables/table-utils";

/*
  PlanMyCashflows — PMS Explorer
  ------------------------------------------------------------------
  Card-based explorer for the live PMS feed.

  - Data comes in as LivePmsStrategy[] (the same livePmsStrategiesQuery
    feed that powers the league table and compare tool), passed from a
    server component via getLivePmsStrategies(). Rows with implausible
    returns are dropped with the league table's hasImplausibleReturn
    before anything renders.
  - Fonts (Fraunces / Inter / IBM Plex Mono) are loaded via next/font in
    app/layout.tsx and exposed as CSS variables; the .font-display / .font-ui
    / .font-num helpers live in app/globals.css alongside the :root design
    tokens (--ink, --green, --pos, --neg, …).
  - "Alpha" = strategy return − benchmark return for the SELECTED period.
    Benchmark = S&P BSE 500 TRI. Periods with no clean benchmark (5Y, SI)
    show raw return, no alpha.
*/

/* ---------- types ---------- */
type Period = "1M" | "3M" | "6M" | "1Y" | "2Y" | "3Y" | "5Y" | "SI";
type Tone = "pos" | "neg" | "flat";
type SortKey = "aum" | "alpha" | "return" | "name";

/** Return figures keyed by period; null where a figure isn't published. */
type PeriodReturns = Record<Period, number | null>;

/** Shape of one PMS strategy row consumed by the explorer cards. */
export type Strategy = {
  id: string;
  manager: string;
  strategy: string;
  category: string | null;
  aum: number | null; // ₹ crore
  since: string | null;
  returns: PeriodReturns;
};

/* ---- benchmark: S&P BSE 500 TRI, same periods as the cards ----
   Not in Sanity — hardcoded, so UPDATE THESE VALUES during the monthly
   data refresh (current figures as on 30 Jun 2026). 5Y and SI stay null:
   there is no clean like-for-like series for them, so those periods show
   raw return with no alpha. */
const BENCH: Record<Period, number | null> = { "1M": -0.17, "3M": -2.34, "6M": -5.39, "1Y": -0.07, "2Y": 4.14, "3Y": 13.47, "5Y": null, "SI": null };
const BENCH_NAME = "S&P BSE 500 TRI";

/* ---------- data mapping ---------- */
const orNull = (v: number | null | undefined): number | null => (typeof v === "number" ? v : null);

/** Map one Sanity feed row (flattened livePmsStrategiesQuery projection) to the card shape. */
function toExplorerStrategy(s: LivePmsStrategy): Strategy {
  return {
    id: s._id,
    manager: s.manager,
    strategy: s.strategyName,
    category: s.category ?? null,
    aum: orNull(s.aumCr),
    // pmsStrategy has no inception-date field (asOfDate is the data refresh
    // date, not launch). Map it here when the schema gains one — the card
    // and brief sheet already hide their "Since" line while this is null.
    since: null,
    returns: {
      "1M": orNull(s.returns1m),
      "3M": orNull(s.returns3m),
      "6M": orNull(s.returns6m),
      "1Y": orNull(s.returns1y),
      "2Y": orNull(s.returns2y),
      "3Y": orNull(s.returns3y),
      "5Y": orNull(s.returns5y),
      "SI": orNull(s.sinceInception),
    },
  };
}

const PERIODS: Period[] = ["1M", "3M", "6M", "1Y", "2Y", "3Y", "5Y", "SI"];
const HEADLINE_PERIODS: Period[] = ["1M", "6M", "1Y", "3Y", "5Y", "SI"]; // tiles shown on the card

/* ---------- helpers ---------- */
const fmtPct = (v: number | null | undefined): string => (v === null || v === undefined ? "N/A" : `${v > 0 ? "+" : ""}${v.toFixed(2)}%`);
const fmtAum = (cr: number | null): string => (cr === null ? "—" : cr >= 1000 ? `₹${(cr / 1000).toFixed(2)}K Cr` : `₹${cr.toLocaleString("en-IN")} Cr`);
const toneOf = (v: number | null | undefined): Tone => (v === null || v === undefined ? "flat" : v > 0.0001 ? "pos" : v < -0.0001 ? "neg" : "flat");
const toneColor: Record<Tone, string> = { pos: "var(--pos)", neg: "var(--neg)", flat: "var(--flat)" };
const toneBg: Record<Tone, string> = { pos: "var(--pos-bg)", neg: "var(--neg-bg)", flat: "var(--flat-bg)" };
const monogram = (m: string): string => m.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
const alphaFor = (ret: PeriodReturns, p: Period): number | null => {
  const r = ret[p];
  const b = BENCH[p];
  if (r === null || b === null) return null;
  return r - b;
};
const beats = (ret: PeriodReturns, periods: Period[]): number =>
  periods.reduce((n, p) => {
    const a = alphaFor(ret, p);
    return n + (a !== null && a > 0 ? 1 : 0);
  }, 0);

/* ---------- small pieces ---------- */
function AlphaChip({ value, ret }: { value: number | null; ret: number | null }) {
  if (value === null) {
    // Missing return → "no data"; return present but no benchmark series
    // for this period (BENCH[period] null → alpha null) → "no benchmark".
    return <span className="font-num" style={{ fontSize: 12, color: "var(--muted)" }}>{ret === null ? "no data" : "no benchmark"}</span>;
  }
  const t = toneOf(value);
  const Icon = value > 0 ? ArrowUpRight : ArrowDownRight;
  return (
    <span className="font-num inline-flex items-center gap-0.5 rounded-full px-2 py-0.5"
      style={{ fontSize: 12, fontWeight: 600, color: toneColor[t], background: toneBg[t] }}>
      <Icon size={12} strokeWidth={2.5} />
      {`${value > 0 ? "+" : ""}${value.toFixed(1)} α`}
    </span>
  );
}

function ConsistencyDots({ ret }: { ret: PeriodReturns }) {
  // over 1Y / 2Y / 3Y — the periods that actually matter for selection
  const longPeriods: Period[] = ["1Y", "2Y", "3Y"];
  const n = beats(ret, longPeriods);
  return (
    <span className="inline-flex items-center gap-1" title={`Beat ${BENCH_NAME} in ${n} of 3 long-term windows`}>
      {longPeriods.map((p, i) => (
        <span key={p} className="inline-block rounded-full"
          style={{ width: 7, height: 7, background: i < n ? "var(--green)" : "var(--line)" }} />
      ))}
      <span className="font-num" style={{ fontSize: 11, color: "var(--muted)", marginLeft: 2 }}>{n}/3 beat</span>
    </span>
  );
}

function ReturnTile({ label, value }: { label: string; value: number | null }) {
  const t = toneOf(value);
  return (
    <div className="rounded-lg px-2 py-1.5 text-center" style={{ background: "var(--flat-bg)", border: "1px solid var(--line)" }}>
      <div className="font-num" style={{ fontSize: 13, fontWeight: 600, color: value === null ? "var(--muted)" : toneColor[t], lineHeight: 1.1 }}>
        {value === null ? "—" : `${value.toFixed(1)}%`}
      </div>
      <div className="font-num" style={{ fontSize: 10, color: "var(--muted)", marginTop: 2, letterSpacing: 0.3 }}>{label}</div>
    </div>
  );
}

/* ---------- card ---------- */
function StrategyCard({ s, period, selected, onCompare, onBrief }: {
  s: Strategy;
  period: Period;
  selected: boolean;
  onCompare: (s: Strategy) => void;
  onBrief: (s: Strategy) => void;
}) {
  const ret = s.returns[period];
  const alpha = alphaFor(s.returns, period);
  const topTone = toneOf(alpha === null ? ret : alpha);
  return (
    <div className="rounded-2xl bg-white flex flex-col" style={{ border: "1px solid var(--line)", borderTop: `3px solid ${toneColor[topTone]}` }}>
      <div className="p-4 pb-3">
        {/* manager row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <div className="flex items-center justify-center rounded-lg shrink-0 font-num"
              style={{ width: 34, height: 34, background: "var(--green-tint)", color: "var(--green-deep)", fontSize: 12, fontWeight: 600 }}>
              {monogram(s.manager)}
            </div>
            <div className="min-w-0">
              <div className="font-ui truncate" style={{ fontSize: 12, color: "var(--muted)" }}>{s.manager}</div>
              {s.since && <div className="font-num" style={{ fontSize: 11, color: "var(--muted)" }}>Since {s.since}</div>}
            </div>
          </div>
          {s.category && (
            <span className="font-ui shrink-0 rounded-full px-2 py-0.5" style={{ fontSize: 11, fontWeight: 500, color: "var(--green-deep)", background: "var(--green-tint)" }}>
              {s.category}
            </span>
          )}
        </div>

        {/* strategy name */}
        <h3 className="font-display mt-2.5" style={{ fontSize: 19, fontWeight: 600, color: "var(--ink)", lineHeight: 1.15 }}>{s.strategy}</h3>

        {/* signature: selected-period return + alpha */}
        <div className="mt-3 flex items-end justify-between">
          <div>
            <div className="font-num" style={{ fontSize: 30, fontWeight: 600, color: ret === null ? "var(--muted)" : toneColor[toneOf(ret)], lineHeight: 1 }}>
              {ret === null ? "N/A" : `${ret.toFixed(1)}%`}
            </div>
            <div className="font-ui" style={{ fontSize: 11, color: "var(--muted)", marginTop: 3 }}>{period} return {period !== "1M" && period !== "3M" && period !== "6M" ? "· annualised" : ""}</div>
          </div>
          <div className="flex flex-col items-end gap-1.5 pb-0.5">
            <AlphaChip value={alpha} ret={ret} />
            <ConsistencyDots ret={s.returns} />
          </div>
        </div>
      </div>

      {/* tile grid */}
      <div className="px-4 grid grid-cols-6 gap-1.5">
        {HEADLINE_PERIODS.map((p) => <ReturnTile key={p} label={p} value={s.returns[p]} />)}
      </div>

      {/* footer */}
      <div className="mt-3 px-4 py-3 flex items-center justify-between" style={{ borderTop: "1px solid var(--line)" }}>
        <div>
          <div className="font-num" style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{fmtAum(s.aum)}</div>
          <div className="font-ui" style={{ fontSize: 11, color: "var(--muted)" }}>AUM · min ₹50L</div>
        </div>
        <div className="flex items-center gap-1.5">
          <button onClick={() => onCompare(s)}
            className="font-ui inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 transition-colors"
            style={{ fontSize: 12, fontWeight: 500, color: selected ? "#fff" : "var(--green-deep)", background: selected ? "var(--green)" : "var(--green-tint)" }}>
            {selected ? <Check size={13} /> : <Scale size={13} />}{selected ? "Added" : "Compare"}
          </button>
          <button onClick={() => onBrief(s)}
            className="font-ui inline-flex items-center gap-0.5 rounded-lg px-2.5 py-1.5"
            style={{ fontSize: 12, fontWeight: 600, color: "#fff", background: "var(--ink)" }}>
            Brief <ChevronRight size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- brief sheet ---------- */
function BriefSheet({ s, asOn, onClose }: { s: Strategy | null; asOn: string; onClose: () => void }) {
  if (!s) return null;
  const nBeat = beats(s.returns, ["1Y", "2Y", "3Y"]);
  const facts: [string, string][] = [
    ...(s.category ? ([["Category", s.category]] as [string, string][]) : []),
    ["AUM", fmtAum(s.aum)],
    ["Minimum", "₹50 lakh"],
    ...(s.since ? ([["Since", s.since]] as [string, string][]) : []),
  ];
  return (
    <div className="fixed inset-0 z-50 flex justify-end" style={{ background: "rgba(15,26,20,0.45)" }} onClick={onClose}>
      <div className="h-full w-full max-w-md bg-white overflow-y-auto" style={{ boxShadow: "-8px 0 40px rgba(0,0,0,0.15)" }} onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white px-5 py-4 flex items-start justify-between" style={{ borderBottom: "1px solid var(--line)" }}>
          <div>
            <div className="font-ui" style={{ fontSize: 12, color: "var(--muted)" }}>{s.manager}</div>
            <h2 className="font-display" style={{ fontSize: 22, fontWeight: 600, color: "var(--ink)", lineHeight: 1.1 }}>{s.strategy}</h2>
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5" style={{ background: "var(--flat-bg)" }}><X size={18} color="var(--ink)" /></button>
        </div>

        <div className="p-5">
          {/* facts */}
          <div className="grid grid-cols-2 gap-3">
            {facts.map(([k, v]) => (
              <div key={k} className="rounded-xl px-3 py-2.5" style={{ background: "var(--flat-bg)" }}>
                <div className="font-ui" style={{ fontSize: 11, color: "var(--muted)" }}>{k}</div>
                <div className="font-num" style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{v}</div>
              </div>
            ))}
          </div>

          {/* full grid vs benchmark */}
          <h3 className="font-ui mt-5 mb-2" style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Returns vs {BENCH_NAME}</h3>
          <div className="rounded-xl overflow-hidden" style={{ border: "1px solid var(--line)" }}>
            <table className="w-full" style={{ borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "var(--flat-bg)" }}>
                  <th className="font-ui text-left px-3 py-2" style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500 }}>Period</th>
                  <th className="font-ui text-right px-3 py-2" style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500 }}>Fund</th>
                  <th className="font-ui text-right px-3 py-2" style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500 }}>Bench</th>
                  <th className="font-ui text-right px-3 py-2" style={{ fontSize: 11, color: "var(--muted)", fontWeight: 500 }}>Alpha</th>
                </tr>
              </thead>
              <tbody>
                {PERIODS.map((p) => {
                  const a = alphaFor(s.returns, p);
                  return (
                    <tr key={p} style={{ borderTop: "1px solid var(--line)" }}>
                      <td className="font-num px-3 py-2" style={{ fontSize: 12, color: "var(--ink)" }}>{p}</td>
                      <td className="font-num text-right px-3 py-2" style={{ fontSize: 12, fontWeight: 600, color: s.returns[p] === null ? "var(--muted)" : toneColor[toneOf(s.returns[p])] }}>{fmtPct(s.returns[p])}</td>
                      <td className="font-num text-right px-3 py-2" style={{ fontSize: 12, color: "var(--muted)" }}>{BENCH[p] === null ? "—" : fmtPct(BENCH[p])}</td>
                      <td className="font-num text-right px-3 py-2" style={{ fontSize: 12, fontWeight: 600, color: a === null ? "var(--muted)" : toneColor[toneOf(a)] }}>{a === null ? "—" : `${a > 0 ? "+" : ""}${a.toFixed(1)}`}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* honest read */}
          <div className="rounded-xl mt-4 p-3.5" style={{ background: "var(--green-tint)" }}>
            <div className="font-ui flex items-center gap-1.5 mb-1" style={{ fontSize: 12, fontWeight: 600, color: "var(--green-deep)" }}>
              <Info size={13} /> How to read this
            </div>
            <p className="font-ui" style={{ fontSize: 12.5, color: "var(--ink)", lineHeight: 1.5, margin: 0 }}>
              Beat the benchmark in <strong>{nBeat} of 3</strong> long-term windows (1Y / 2Y / 3Y).
              {nBeat >= 2 ? " Consistent alpha across cycles — the number worth trusting." : " Thin long-term alpha — the recent figure may be flattering. Check the 3Y before the 1M."}
              {" "}Returns are TWRR at strategy level, as on {asOn}. Your own return depends on entry timing. Past performance doesn&apos;t predict the future.
            </p>
          </div>

          <button className="font-ui w-full mt-4 rounded-xl py-3" style={{ fontSize: 14, fontWeight: 600, color: "#fff", background: "var(--green)" }}>
            Enquire about {s.strategy}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------- compare modal ---------- */
function CompareModal({ items, onClose, onRemove }: {
  items: Strategy[];
  onClose: () => void;
  onRemove: (s: Strategy) => void;
}) {
  if (!items.length) return null;
  // Facts rows — the category row is dropped entirely while the category
  // enrichment pass hasn't run, instead of rendering a row of dashes.
  const factRows: [string, (s: Strategy) => string][] = [
    ...(items.some((s) => s.category) ? ([["Category", (s: Strategy) => s.category ?? "—"]] as [string, (s: Strategy) => string][]) : []),
    ["AUM", (s: Strategy) => fmtAum(s.aum)],
  ];
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,26,20,0.5)" }} onClick={onClose}>
      <div className="w-full max-w-4xl max-h-[85vh] overflow-auto rounded-2xl bg-white" onClick={(e) => e.stopPropagation()}>
        <div className="sticky top-0 bg-white px-5 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid var(--line)" }}>
          <h2 className="font-display" style={{ fontSize: 20, fontWeight: 600, color: "var(--ink)" }}>Compare · {items.length} strategies</h2>
          <button onClick={onClose} className="rounded-lg p-1.5" style={{ background: "var(--flat-bg)" }}><X size={18} color="var(--ink)" /></button>
        </div>
        <div className="p-5 overflow-x-auto">
          <table className="w-full" style={{ borderCollapse: "collapse", minWidth: 560 }}>
            <thead>
              <tr>
                <th></th>
                {items.map((s) => (
                  <th key={s.id} className="px-3 pb-3 text-left align-bottom">
                    <div className="font-ui" style={{ fontSize: 11, color: "var(--muted)" }}>{s.manager}</div>
                    <div className="font-display" style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", lineHeight: 1.1 }}>{s.strategy}</div>
                    <button onClick={() => onRemove(s)} className="font-ui mt-1" style={{ fontSize: 11, color: "var(--neg)" }}>remove</button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {factRows.map(([label, fn]) => (
                <tr key={label} style={{ borderTop: "1px solid var(--line)" }}>
                  <td className="font-ui px-3 py-2" style={{ fontSize: 12, color: "var(--muted)" }}>{label}</td>
                  {items.map((s) => <td key={s.id} className="font-num px-3 py-2" style={{ fontSize: 13, color: "var(--ink)" }}>{fn(s)}</td>)}
                </tr>
              ))}
              {PERIODS.map((p) => (
                <tr key={p} style={{ borderTop: "1px solid var(--line)" }}>
                  <td className="font-ui px-3 py-2" style={{ fontSize: 12, color: "var(--muted)" }}>{p} <span style={{ fontSize: 10 }}>(α)</span></td>
                  {items.map((s) => {
                    const a = alphaFor(s.returns, p);
                    return (
                      <td key={s.id} className="px-3 py-2">
                        <span className="font-num" style={{ fontSize: 13, fontWeight: 600, color: s.returns[p] === null ? "var(--muted)" : toneColor[toneOf(s.returns[p])] }}>{fmtPct(s.returns[p])}</span>
                        {a !== null && <span className="font-num" style={{ fontSize: 11, color: toneColor[toneOf(a)], marginLeft: 6 }}>{a > 0 ? "+" : ""}{a.toFixed(1)}</span>}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* ---------- main ---------- */
export default function PMSExplorer({ strategies }: { strategies: LivePmsStrategy[] }) {
  const [category, setCategory] = useState<string>("All");
  const [period, setPeriod] = useState<Period>("3Y");
  const [sort, setSort] = useState<SortKey>("aum");
  const [query, setQuery] = useState<string>("");
  const [beatOnly, setBeatOnly] = useState<boolean>(false);
  const [compare, setCompare] = useState<Strategy[]>([]);
  const [brief, setBrief] = useState<Strategy | null>(null);
  const [showCompare, setShowCompare] = useState<boolean>(false);

  // Drop reporting artifacts first — same guard as the league table — so
  // cards, categories, count and as-of date all reflect the trustworthy set.
  const clean = useMemo(() => strategies.filter((s) => !hasImplausibleReturn(s)), [strategies]);
  const data = useMemo<Strategy[]>(() => clean.map(toExplorerStrategy), [clean]);
  const asOf = useMemo(() => fmtAsOf(latestAmfiDate(clean.map((s) => s.asOfDate))), [clean]);

  // Category chips only exist for categories actually present in the data.
  // While the enrichment pass hasn't run (category mostly empty), this is
  // [] and the whole filter row hides.
  const categories = useMemo(() => {
    const set = new Set<string>();
    data.forEach((s) => { if (s.category) set.add(s.category); });
    return set.size > 0 ? ["All", ...Array.from(set).sort()] : [];
  }, [data]);

  const toggleCompare = (s: Strategy) => {
    setCompare((prev) => prev.find((x) => x.id === s.id)
      ? prev.filter((x) => x.id !== s.id)
      : prev.length >= 3 ? prev : [...prev, s]);
  };
  const isSelected = (s: Strategy) => !!compare.find((x) => x.id === s.id);

  const filtered = useMemo<Strategy[]>(() => {
    let list = data.filter((s) => category === "All" || s.category === category);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((s) => (s.manager + " " + s.strategy).toLowerCase().includes(q));
    }
    if (beatOnly && BENCH[period] !== null) list = list.filter((s) => (alphaFor(s.returns, period) ?? -Infinity) > 0);
    const val = (s: Strategy) => s.returns[period];
    list = [...list].sort((a, b) => {
      if (sort === "aum") return (b.aum ?? -1) - (a.aum ?? -1);
      if (sort === "return") return (val(b) ?? -999) - (val(a) ?? -999);
      if (sort === "alpha") return (alphaFor(b.returns, period) ?? -999) - (alphaFor(a.returns, period) ?? -999);
      if (sort === "name") return (a.manager + a.strategy).localeCompare(b.manager + b.strategy);
      return 0;
    });
    return list;
  }, [data, category, period, sort, query, beatOnly]);

  const chipStyle = (active: boolean): CSSProperties => ({
    fontSize: 13, fontWeight: 500,
    color: active ? "#fff" : "var(--ink)",
    background: active ? "var(--ink)" : "#fff",
    border: `1px solid ${active ? "var(--ink)" : "var(--line)"}`,
  });

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
              {query && <button onClick={() => setQuery("")}><X size={15} color="var(--muted)" /></button>}
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

          {/* category chips (hidden while the data has no categories) + beat-only */}
          <div className="flex items-center gap-2 mt-2.5 overflow-x-auto pb-1 pmc-scroll">
            {categories.map((c) => (
              <button key={c} onClick={() => setCategory(c)} className="font-ui whitespace-nowrap rounded-full px-3 py-1.5" style={chipStyle(category === c)}>{c}</button>
            ))}
            {categories.length > 0 && <div style={{ width: 1, height: 22, background: "var(--line)", margin: "0 4px" }} />}
            <button onClick={() => setBeatOnly((v) => !v)} title={BENCH[period] === null ? "No benchmark for this period" : ""}
              disabled={BENCH[period] === null}
              className="font-ui whitespace-nowrap inline-flex items-center gap-1.5 rounded-full px-3 py-1.5"
              style={{ fontSize: 13, fontWeight: 500, opacity: BENCH[period] === null ? 0.4 : 1,
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
            <p className="font-ui" style={{ fontSize: 14, color: "var(--muted)", marginTop: 6 }}>Try clearing “beat benchmark only,” or widening the category.</p>
          </div>
        ) : (
          <div className="grid gap-4 mt-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
            {filtered.map((s) => (
              <StrategyCard key={s.id} s={s} period={period}
                selected={isSelected(s)} onCompare={toggleCompare} onBrief={setBrief} />
            ))}
          </div>
        )}

        {/* footnote */}
        <p className="font-ui mt-8" style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6, maxWidth: 720 }}>
          Returns are Time-Weighted Rate of Return at the strategy level, annualised beyond 1 year, as on {asOf}. Alpha is return minus {BENCH_NAME} for the same window (shown where a like-for-like benchmark exists). Figures are sourced from disclosures and are not verified by SEBI. Past performance is not indicative of future returns. Minimum investment ₹50 lakh (SEBI mandate). This is not investment advice.
        </p>
      </div>

      {/* compare tray */}
      {compare.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40" style={{ background: "var(--ink)" }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pmc-scroll">
              <span className="font-ui shrink-0" style={{ fontSize: 13, color: "#fff", fontWeight: 500 }}>{compare.length}/3 to compare:</span>
              {compare.map((s) => (
                <span key={s.id} className="font-ui shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1" style={{ fontSize: 12, background: "rgba(255,255,255,0.12)", color: "#fff" }}>
                  {s.strategy}<button onClick={() => toggleCompare(s)}><X size={12} /></button>
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

      <BriefSheet s={brief} asOn={asOf} onClose={() => setBrief(null)} />
      {showCompare && <CompareModal items={compare} onClose={() => setShowCompare(false)} onRemove={toggleCompare} />}
    </div>
  );
}
