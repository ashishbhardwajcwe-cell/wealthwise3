/**
 * PMS strategy building blocks shared by the explorer's Brief slide-in
 * sheet and the standalone /pms/[slug] SEO pages. Deliberately NOT marked
 * "use client": nothing here uses hooks or handlers, so the same pieces
 * server-render on the strategy pages and bundle into the client explorer.
 *
 * Styling leans on the PMS Explorer design system — the :root tokens
 * (--ink, --pos, …) and .font-display/.font-ui/.font-num helpers defined
 * globally in app/globals.css.
 */

import { ArrowUpRight, ArrowDownRight, Info } from "lucide-react";
import type { LivePmsStrategy } from "@/lib/investment-data";
import { pmsStrategySlug } from "@/lib/pms";
import { formatAumCr } from "@/lib/utils";

/* ---------- types ---------- */
export type Period = "1M" | "3M" | "6M" | "1Y" | "2Y" | "3Y" | "5Y" | "SI";
export type Tone = "pos" | "neg" | "flat";

/** Return figures keyed by period; null where a figure isn't published. */
export type PeriodReturns = Record<Period, number | null>;

/** Shape of one PMS strategy row consumed by the cards, sheet and pages. */
export type Strategy = {
  id: string;
  slug: string;
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
export const BENCH: Record<Period, number | null> = { "1M": -0.17, "3M": -2.34, "6M": -5.39, "1Y": -0.07, "2Y": 4.14, "3Y": 13.47, "5Y": null, "SI": null };
export const BENCH_NAME = "S&P BSE 500 TRI";

export const PERIODS: Period[] = ["1M", "3M", "6M", "1Y", "2Y", "3Y", "5Y", "SI"];

/* ---------- data mapping ---------- */
const orNull = (v: number | null | undefined): number | null => (typeof v === "number" ? v : null);

/** Map one Sanity feed row (flattened livePmsStrategiesQuery projection) to
 *  the shared shape. `all` is the full clean feed — needed so the slug can
 *  detect name collisions deterministically. */
export function toStrategy(s: LivePmsStrategy, all: LivePmsStrategy[]): Strategy {
  return {
    id: s._id,
    slug: pmsStrategySlug(s, all),
    manager: s.manager,
    strategy: s.strategyName,
    category: s.category ?? null,
    aum: orNull(s.aumCr),
    // pmsStrategy has no inception-date field (asOfDate is the data refresh
    // date, not launch). Map it here when the schema gains one — the card,
    // brief sheet and strategy page already hide "Since" while this is null.
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

/* ---------- helpers ---------- */
export const fmtPct = (v: number | null | undefined): string => (v === null || v === undefined ? "N/A" : `${v > 0 ? "+" : ""}${v.toFixed(2)}%`);
export const toneOf = (v: number | null | undefined): Tone => (v === null || v === undefined ? "flat" : v > 0.0001 ? "pos" : v < -0.0001 ? "neg" : "flat");
export const toneColor: Record<Tone, string> = { pos: "var(--pos)", neg: "var(--neg)", flat: "var(--flat)" };
export const toneBg: Record<Tone, string> = { pos: "var(--pos-bg)", neg: "var(--neg-bg)", flat: "var(--flat-bg)" };
export const alphaFor = (ret: PeriodReturns, p: Period): number | null => {
  const r = ret[p];
  const b = BENCH[p];
  if (r === null || b === null) return null;
  return r - b;
};
export const beats = (ret: PeriodReturns, periods: Period[]): number =>
  periods.reduce((n, p) => {
    const a = alphaFor(ret, p);
    return n + (a !== null && a > 0 ? 1 : 0);
  }, 0);

/* ---------- small pieces ---------- */
export function AlphaChip({ value, ret }: { value: number | null; ret: number | null }) {
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

export function ConsistencyDots({ ret }: { ret: PeriodReturns }) {
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

/* ---------- brief/page sections ---------- */
/** Key facts grid: category (if present), AUM, SEBI minimum, inception (if present). */
export function FactsGrid({ s }: { s: Strategy }) {
  const facts: [string, string][] = [
    ...(s.category ? ([["Category", s.category]] as [string, string][]) : []),
    ["AUM", formatAumCr(s.aum)],
    ["Minimum", "₹50 lakh"],
    ...(s.since ? ([["Since", s.since]] as [string, string][]) : []),
  ];
  return (
    <div className="grid grid-cols-2 gap-3">
      {facts.map(([k, v]) => (
        <div key={k} className="rounded-xl px-3 py-2.5" style={{ background: "var(--flat-bg)" }}>
          <div className="font-ui" style={{ fontSize: 11, color: "var(--muted)" }}>{k}</div>
          <div className="font-num" style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)" }}>{v}</div>
        </div>
      ))}
    </div>
  );
}

/** Full 1M→SI returns table vs the benchmark, with alpha per row. */
export function ReturnsVsBenchmarkTable({ returns }: { returns: PeriodReturns }) {
  return (
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
            const a = alphaFor(returns, p);
            return (
              <tr key={p} style={{ borderTop: "1px solid var(--line)" }}>
                <td className="font-num px-3 py-2" style={{ fontSize: 12, color: "var(--ink)" }}>{p}</td>
                <td className="font-num text-right px-3 py-2" style={{ fontSize: 12, fontWeight: 600, color: returns[p] === null ? "var(--muted)" : toneColor[toneOf(returns[p])] }}>{fmtPct(returns[p])}</td>
                <td className="font-num text-right px-3 py-2" style={{ fontSize: 12, color: "var(--muted)" }}>{BENCH[p] === null ? "—" : fmtPct(BENCH[p])}</td>
                <td className="font-num text-right px-3 py-2" style={{ fontSize: 12, fontWeight: 600, color: a === null ? "var(--muted)" : toneColor[toneOf(a)] }}>{a === null ? "—" : `${a > 0 ? "+" : ""}${a.toFixed(1)}`}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

/** The honesty block: how many long-term windows beat the benchmark, and what that means. */
export function HowToReadThis({ returns, asOn }: { returns: PeriodReturns; asOn: string }) {
  const nBeat = beats(returns, ["1Y", "2Y", "3Y"]);
  return (
    <div className="rounded-xl p-3.5" style={{ background: "var(--green-tint)" }}>
      <div className="font-ui flex items-center gap-1.5 mb-1" style={{ fontSize: 12, fontWeight: 600, color: "var(--green-deep)" }}>
        <Info size={13} /> How to read this
      </div>
      <p className="font-ui" style={{ fontSize: 12.5, color: "var(--ink)", lineHeight: 1.5, margin: 0 }}>
        Beat the benchmark in <strong>{nBeat} of 3</strong> long-term windows (1Y / 2Y / 3Y).
        {nBeat >= 2 ? " Consistent alpha across cycles — the number worth trusting." : " Thin long-term alpha — the recent figure may be flattering. Check the 3Y before the 1M."}
        {" "}Returns are TWRR at strategy level, as on {asOn}. Your own return depends on entry timing. Past performance doesn&apos;t predict the future.
      </p>
    </div>
  );
}

/** The compliance disclaimer — one source of truth for explorer and strategy pages. */
export function ComplianceFootnote({ asOn }: { asOn: string }) {
  return (
    <p className="font-ui mt-8" style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6, maxWidth: 720 }}>
      Returns are Time-Weighted Rate of Return at the strategy level, annualised beyond 1 year, as on {asOn}. Alpha is return minus {BENCH_NAME} for the same window (shown where a like-for-like benchmark exists). Figures are sourced from disclosures and are not verified by SEBI. Past performance is not indicative of future returns. Minimum investment ₹50 lakh (SEBI mandate). This is not investment advice.
    </p>
  );
}
