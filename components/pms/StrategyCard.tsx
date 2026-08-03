/**
 * The PMS strategy card — ONE component, rendered by the PMS Explorer
 * (components/pms/PMSExplorer.tsx) and by the homepage's Featured Strategies
 * grid (components/home/FeaturedStrategies.tsx).
 *
 * It lived inside PMSExplorer as a local function, and the homepage grew its
 * own thinner card showing only 1Y/3Y/5Y — no alpha, no consistency dots, no
 * manager logo. Two cards meant two answers to "how does this strategy look",
 * and the homepage's was the one that dropped the alpha this brand leads on.
 * Anything the card should show belongs here, once.
 *
 * Deliberately NOT marked "use client", same as strategy-shared.tsx: there are
 * no hooks here, so it compiles into whichever client component imports it.
 * Both current callers are client components (they own the compare/brief/
 * enquire state the handlers below drive).
 *
 * Every action is optional. The explorer passes compare/brief/enquire; the
 * homepage passes enquire alone, and the footer renders only the buttons whose
 * handler it was given.
 */

import Link from "next/link";
import { Check, Scale, ChevronRight } from "lucide-react";
import {
  type Period, type Strategy, type Benchmark,
  toneOf, toneColor, alphaFor,
  AlphaChip, ConsistencyDots,
} from "@/components/pms/strategy-shared";
import { CompanyLogo } from "@/components/CompanyLogo";
import { formatAumCr } from "@/lib/utils";

/** Periods tiled across the card, in display order. */
export const HEADLINE_PERIODS: Period[] = ["1M", "6M", "1Y", "3Y", "5Y", "SI"];

/** The grid the cards are laid out on — shared so both surfaces size alike. */
export const STRATEGY_GRID_COLUMNS = "repeat(auto-fill, minmax(320px, 1fr))";

export function ReturnTile({ label, value }: { label: string; value: number | null }) {
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

export function StrategyCard({ s, period, benchmark, logoUrl, selected = false, onCompare, onBrief, onEnquire }: {
  s: Strategy;
  /** The window the signature figure and its alpha chip report. */
  period: Period;
  benchmark: Benchmark;
  logoUrl?: string;
  selected?: boolean;
  onCompare?: (s: Strategy) => void;
  onBrief?: (s: Strategy) => void;
  onEnquire?: (s: Strategy) => void;
}) {
  const ret = s.returns[period];
  const alpha = alphaFor(s.returns, period, benchmark.returns);
  const topTone = toneOf(alpha === null ? ret : alpha);
  return (
    <div className="rounded-2xl bg-white flex flex-col" style={{ border: "1px solid var(--line)", borderTop: `3px solid ${toneColor[topTone]}` }}>
      <div className="p-4 pb-3">
        {/* manager row */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <CompanyLogo
              name={s.manager}
              logoUrl={logoUrl}
              logoClassName="flex items-center justify-center shrink-0 overflow-hidden rounded-lg bg-white"
              logoStyle={{ width: 34, height: 34, border: "1px solid var(--line)", padding: 3 }}
              monogramClassName="flex items-center justify-center rounded-lg shrink-0 font-num"
              monogramStyle={{ width: 34, height: 34, background: "var(--green-tint)", color: "var(--green-deep)", fontSize: 12, fontWeight: 600 }}
            />
            <div className="min-w-0">
              {/* manager → the AMC's own page. Plain <a>, server-rendered:
                  this is the link that stops each firm's other strategies
                  from being unreachable. */}
              <a href={`/pms/amc/${s.managerSlug}`} className="font-ui block truncate hover:underline"
                style={{ fontSize: 12, color: "var(--muted)" }}>
                {s.manager}
              </a>
              {s.since && <div className="font-num" style={{ fontSize: 11, color: "var(--muted)" }}>Since {s.since}</div>}
            </div>
          </div>
          {s.category && (
            s.categorySlug ? (
              <a href={`/pms/category/${s.categorySlug}`} className="font-ui shrink-0 rounded-full px-2 py-0.5 hover:underline"
                style={{ fontSize: 11, fontWeight: 500, color: "var(--green-deep)", background: "var(--green-tint)" }}>
                {s.category}
              </a>
            ) : (
              <span className="font-ui shrink-0 rounded-full px-2 py-0.5" style={{ fontSize: 11, fontWeight: 500, color: "var(--green-deep)", background: "var(--green-tint)" }}>
                {s.category}
              </span>
            )
          )}
        </div>

        {/* strategy name → its SEO page. s.slug is resolved against the FULL
            feed by toStrategy/pmsStrategySlug, so it stays correct even when
            only a handful of cards are handed to this component. */}
        <h3 className="font-display mt-2.5" style={{ fontSize: 19, fontWeight: 600, color: "var(--ink)", lineHeight: 1.15 }}>
          <Link href={`/pms/${s.slug}`} className="hover:underline" style={{ color: "inherit" }}>{s.strategy}</Link>
        </h3>

        {/* An institutional or catch-all mandate — a provident-fund book, an
            advisory bucket, a "customised portfolios" aggregate. The figures
            are real but they describe no single strategy, and none of it is
            subscribable. Named on the card rather than filtered out here: this
            grid is the full-feed browse surface. */}
        {s.institutional && (
          <div className="font-ui mt-1.5 inline-flex items-center rounded-full px-2 py-0.5"
            title="Reported under a PMS licence but not a product an individual can subscribe to — returns aggregate many client portfolios"
            style={{ fontSize: 11, fontWeight: 500, color: "var(--muted)", background: "var(--flat-bg)", border: "1px solid var(--line)" }}>
            Institutional mandate
          </div>
        )}

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
            <ConsistencyDots ret={s.returns} bench={benchmark.returns} benchName={benchmark.name} />
          </div>
        </div>
      </div>

      {/* tile grid */}
      <div className="px-4 grid grid-cols-6 gap-1.5">
        {HEADLINE_PERIODS.map((p) => <ReturnTile key={p} label={p} value={s.returns[p]} />)}
      </div>

      {/* footer */}
      <div className="mt-3 px-4 py-3 flex flex-wrap items-center justify-between gap-2" style={{ borderTop: "1px solid var(--line)" }}>
        <div>
          <div className="font-num" style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{formatAumCr(s.aum)}</div>
          <div className="font-ui" style={{ fontSize: 11, color: "var(--muted)" }}>AUM · min ₹50L</div>
        </div>
        <div className="flex items-center gap-1.5">
          {onEnquire && (
            <button onClick={() => onEnquire(s)}
              className="font-ui rounded-lg px-2.5 py-1.5"
              style={{ fontSize: 12, fontWeight: 600, color: "#fff", background: "var(--green)" }}>
              Enquire
            </button>
          )}
          {onCompare && (
            <button onClick={() => onCompare(s)}
              className="font-ui inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 transition-colors"
              style={{ fontSize: 12, fontWeight: 500, color: selected ? "#fff" : "var(--green-deep)", background: selected ? "var(--green)" : "var(--green-tint)" }}>
              {selected ? <Check size={13} /> : <Scale size={13} />}{selected ? "Added" : "Compare"}
            </button>
          )}
          {onBrief && (
            <button onClick={() => onBrief(s)}
              className="font-ui inline-flex items-center gap-0.5 rounded-lg px-2.5 py-1.5"
              style={{ fontSize: 12, fontWeight: 600, color: "#fff", background: "var(--ink)" }}>
              Brief <ChevronRight size={13} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
