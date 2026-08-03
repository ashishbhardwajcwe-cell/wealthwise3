/**
 * The PMS comparison table — ONE component, rendered by the PMS Explorer's
 * compare modal (components/pms/PMSExplorer.tsx) and inline by the compare
 * page (components/compare/CompareExplorer.tsx).
 *
 * It lived inside PMSExplorer's CompareModal while /compare carried a second,
 * older table of its own showing only 1Y/3Y/5Y, no alpha and a Category row of
 * em-dashes. Two tables meant two answers to "how do these compare", and the
 * one on the page named "compare" was the weaker of them. Anything the
 * comparison should show belongs here, once.
 *
 * Purely presentational: it holds no state and owns no dialog. Removal and
 * enquiry are handed up as callbacks, so the caller decides whether this sits
 * in a modal (explorer) or inline on the page (compare).
 *
 * Deliberately NOT marked "use client", same as StrategyCard: no hooks here,
 * so it compiles into whichever client component imports it.
 */

import Link from "next/link";
import type { CSSProperties } from "react";
import { X } from "lucide-react";
import { CompanyLogo } from "@/components/CompanyLogo";
import type { PmsManagerLogos } from "@/lib/investment-data";
import {
  type Strategy, type Benchmark, type Period,
  PERIODS, fmtPct, toneOf, toneColor, alphaFor, beats,
} from "@/components/pms/strategy-shared";
import { formatAumCr } from "@/lib/utils";

/* ---------- layout constants ---------- */
/** Below this the table scrolls horizontally rather than crushing columns. */
const TABLE_MIN_WIDTH = 760;
/** Per-strategy column floor — names like "360 ONE Open — Enhancer Series"
 *  otherwise drag one column wide enough to squeeze the rest to nothing. */
const COL_MIN_WIDTH = 190;

const cellBase: CSSProperties = {
  padding: "10px 12px",
  verticalAlign: "middle",
  borderTop: "1px solid var(--line)",
};

/** Leading column: sticky-left with a solid fill, so the row labels survive
 *  the horizontal scroll this table does on a phone. */
const fieldCell: CSSProperties = {
  ...cellBase,
  position: "sticky",
  left: 0,
  zIndex: 2,
  background: "#fff",
  fontSize: 12,
  color: "var(--muted)",
  whiteSpace: "nowrap",
};

/** The benchmark column — tinted, so the bar being cleared reads as a column
 *  rather than something the reader has to infer from a chip. */
const benchCell: CSSProperties = { ...cellBase, background: "var(--flat-bg)" };

const strategyCell: CSSProperties = { ...cellBase, minWidth: COL_MIN_WIDTH };

/** Two-line clamp for the long strategy names in the column heads. */
const clampTwoLines: CSSProperties = {
  display: "-webkit-box",
  WebkitLineClamp: 2,
  WebkitBoxOrient: "vertical",
  overflow: "hidden",
};

/** Missing data is named, never an em-dash — a reader has to be able to tell a
 *  gap from a zero. */
function Missing({ label }: { label: string }) {
  return <span className="font-ui" style={{ fontSize: 12, color: "var(--muted)" }}>{label}</span>;
}

export function CompareTable({
  items,
  benchmark,
  asOn,
  managerLogos = {},
  onRemove,
  onEnquire,
}: {
  items: Strategy[];
  benchmark: Benchmark;
  /** Formatted as-on date for the footnote. */
  asOn: string;
  /** manager → logo URL, same lookup the cards are given. Absent = monogram. */
  managerLogos?: PmsManagerLogos;
  onRemove?: (s: Strategy) => void;
  onEnquire?: (s: Strategy) => void;
}) {
  if (!items.length) return null;

  // The category row is dropped entirely while none of the selected strategies
  // carries a category, instead of rendering a row of dashes.
  const showCategory = items.some((s) => s.category);

  // "Beat benchmark" counts only the windows the benchmark actually publishes —
  // 5Y and SI carry no like-for-like series, so they are not windows anyone
  // could have beaten.
  const benchPeriods: Period[] = PERIODS.filter((p) => benchmark.returns[p] !== null);

  return (
    <div>
      <div className="overflow-x-auto">
        <table className="w-full" style={{ borderCollapse: "separate", borderSpacing: 0, minWidth: TABLE_MIN_WIDTH }}>
          <thead>
            <tr>
              <th scope="col" className="text-left" style={{ ...fieldCell, borderTop: "none", paddingBottom: 12, zIndex: 3 }}>
                <span className="sr-only">Field</span>
              </th>
              {items.map((s) => (
                <th key={s.id} scope="col" className="text-left align-bottom" style={{ ...strategyCell, borderTop: "none", paddingBottom: 12 }}>
                  <div className="font-ui" style={{ fontSize: 11, color: "var(--muted)" }}>{s.manager}</div>
                  <div className="font-display" title={s.strategy}
                    style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", lineHeight: 1.2, ...clampTwoLines }}>
                    <Link href={`/pms/${s.slug}`} className="hover:underline" style={{ color: "inherit" }}>{s.strategy}</Link>
                  </div>
                  {onRemove && (
                    <button onClick={() => onRemove(s)} aria-label={`Remove ${s.strategy} from comparison`}
                      className="font-ui mt-1 inline-flex items-center gap-0.5" style={{ fontSize: 11, color: "var(--neg)" }}>
                      <X size={11} /> remove
                    </button>
                  )}
                </th>
              ))}
              <th scope="col" className="text-left align-bottom" style={{ ...strategyCell, ...benchCell, borderTop: "none", paddingBottom: 12 }}>
                <div className="font-ui" style={{ fontSize: 11, color: "var(--muted)" }}>Benchmark</div>
                <div className="font-display" title={benchmark.name}
                  style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", lineHeight: 1.2, ...clampTwoLines }}>
                  {benchmark.name}
                </div>
              </th>
            </tr>
          </thead>

          <tbody>
            {/* manager */}
            <tr>
              <th scope="row" className="font-ui text-left" style={fieldCell}>Manager</th>
              {items.map((s) => (
                <td key={s.id} style={strategyCell}>
                  <div className="flex items-center gap-2 min-w-0">
                    <CompanyLogo
                      name={s.manager}
                      logoUrl={managerLogos[s.manager]}
                      logoClassName="flex items-center justify-center shrink-0 overflow-hidden rounded-lg bg-white"
                      logoStyle={{ width: 34, height: 34, border: "1px solid var(--line)", padding: 3 }}
                      monogramClassName="flex items-center justify-center rounded-lg shrink-0 font-num"
                      monogramStyle={{ width: 34, height: 34, background: "var(--green-tint)", color: "var(--green-deep)", fontSize: 12, fontWeight: 600 }}
                    />
                    {/* Plain <a>, same as the card: this is the link that keeps
                        each firm's other strategies reachable. */}
                    <a href={`/pms/amc/${s.managerSlug}`} className="font-ui hover:underline" style={{ fontSize: 12.5, color: "var(--ink)" }}>
                      {s.manager}
                    </a>
                  </div>
                </td>
              ))}
              <td style={{ ...strategyCell, ...benchCell }}><Missing label="Index" /></td>
            </tr>

            {/* category — only when at least one selection carries one */}
            {showCategory && (
              <tr>
                <th scope="row" className="font-ui text-left" style={fieldCell}>Category</th>
                {items.map((s) => (
                  <td key={s.id} style={strategyCell}>
                    {s.category
                      ? <span className="font-ui" style={{ fontSize: 13, color: "var(--ink)" }}>{s.category}</span>
                      : <Missing label="Not classified" />}
                  </td>
                ))}
                <td style={{ ...strategyCell, ...benchCell }}><Missing label="Not applicable" /></td>
              </tr>
            )}

            {/* aum */}
            <tr>
              <th scope="row" className="font-ui text-left" style={fieldCell}>AUM</th>
              {items.map((s) => (
                <td key={s.id} style={strategyCell}>
                  {/* null/undefined only — a reported AUM of exactly 0 is a
                      figure, not a gap, and must not read as "Not disclosed". */}
                  {s.aum === null || s.aum === undefined
                    ? <Missing label="Not disclosed" />
                    : <span className="font-num" style={{ fontSize: 13, color: "var(--ink)" }}>{formatAumCr(s.aum)}</span>}
                </td>
              ))}
              <td style={{ ...strategyCell, ...benchCell }}><Missing label="Not applicable" /></td>
            </tr>

            {/* every published window, with alpha where the benchmark has one */}
            {PERIODS.map((p) => {
              const b = benchmark.returns[p];
              return (
                <tr key={p}>
                  <th scope="row" className="font-ui text-left" style={fieldCell}>
                    {p}{b !== null && <span style={{ fontSize: 10 }}> (α)</span>}
                  </th>
                  {items.map((s) => {
                    const r = s.returns[p];
                    const a = alphaFor(s.returns, p, benchmark.returns);
                    return (
                      <td key={s.id} style={strategyCell}>
                        {r === null ? <Missing label="Not published" /> : (
                          <span className="font-num" style={{ fontSize: 13, fontWeight: 600, color: toneColor[toneOf(r)] }}>{fmtPct(r)}</span>
                        )}
                        {a !== null && (
                          <span className="font-num" style={{ fontSize: 11, color: toneColor[toneOf(a)], marginLeft: 6 }}>
                            {a > 0 ? "+" : ""}{a.toFixed(1)} α
                          </span>
                        )}
                      </td>
                    );
                  })}
                  <td style={{ ...strategyCell, ...benchCell }}>
                    {b === null
                      ? <Missing label="Not published" />
                      : <span className="font-num" style={{ fontSize: 13, color: "var(--ink)" }}>{fmtPct(b)}</span>}
                  </td>
                </tr>
              );
            })}

            {/* the summary the whole table is for */}
            <tr>
              <th scope="row" className="font-ui text-left" style={{ ...fieldCell, fontWeight: 600, color: "var(--ink)" }}>Beat benchmark</th>
              {items.map((s) => (
                <td key={s.id} style={strategyCell}>
                  <span className="font-num" style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>
                    {beats(s.returns, benchPeriods, benchmark.returns)} of {benchPeriods.length} windows
                  </span>
                </td>
              ))}
              <td style={{ ...strategyCell, ...benchCell }}><Missing label="Not applicable" /></td>
            </tr>

            {/* next step — the enquiry opens in place; no hand-off to /contact */}
            {onEnquire && (
              <tr>
                <th scope="row" className="font-ui text-left" style={fieldCell}>Next step</th>
                {items.map((s) => (
                  <td key={s.id} style={strategyCell}>
                    <button onClick={() => onEnquire(s)}
                      className="font-ui rounded-lg px-3 py-1.5"
                      style={{ fontSize: 12, fontWeight: 600, color: "#fff", background: "var(--green)" }}>
                      Enquire
                    </button>
                  </td>
                ))}
                <td style={{ ...strategyCell, ...benchCell }} />
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Minimum investment is not a comparison row: it is the same ₹50 lakh for
          every PMS in the country, by SEBI rule. */}
      <p className="font-ui" style={{ fontSize: 12, color: "var(--muted)", marginTop: 10 }}>
        Minimum investment for any PMS is ₹50 lakh, mandated by SEBI.
      </p>
      <p className="font-ui" style={{ fontSize: 12, color: "var(--muted)", marginTop: 4 }}>
        As on {asOn} · Returns are annualised (TWRR) beyond 1 year; 1M / 3M / 6M are absolute. Alpha is return minus {benchmark.name} over the same window, shown where the benchmark publishes one.
      </p>
    </div>
  );
}
