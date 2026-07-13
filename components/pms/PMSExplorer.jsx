import React, { useState, useMemo } from "react";
import {
  Search, X, Check, Scale, Info, SlidersHorizontal,
  ArrowUpRight, ArrowDownRight, ChevronRight,
} from "lucide-react";

/*
  PlanMyCashflows — PMS Explorer
  ------------------------------------------------------------------
  Drop-in prototype for /investment-products/pms.

  Design notes for porting into the Next.js app:
  - Fonts are loaded here via a <style> @import for the prototype.
    In the app, move Fraunces / Inter / IBM Plex Mono into next/font
    and delete the injected <style>.
  - Colours + fonts are applied with inline styles / helper classes so
    the file renders standalone. Layout uses Tailwind core utilities,
    which your app already has.
  - STRATEGIES is a hand-built sample (~30 funds, as-on 30 Jun 2026)
    assembled from your live data + the compendium grid. Swap it for
    your real feed — the card only needs { manager, strategy, category,
    aum, minL, since, returns:{'1M'..'SI'} }.
  - "Alpha" = strategy return − benchmark return for the SELECTED period.
    Benchmark = S&P BSE 500 TRI (your FAQ already references Nifty 500).
    Periods with no clean benchmark (5Y, SI) show raw return, no alpha.
*/

/* ---- benchmark: S&P BSE 500 TRI, same periods as the cards ---- */
const BENCH = { "1M": -0.17, "3M": -2.34, "6M": -5.39, "1Y": -0.07, "2Y": 4.14, "3Y": 13.47, "5Y": null, "SI": null };
const BENCH_NAME = "S&P BSE 500 TRI";
const AS_ON = "30 Jun 2026";

/* ---- sample data (real published figures, curated subset) ---- */
const STRATEGIES = [
  { manager: "Stallion Asset", strategy: "Core Fund", category: "Multicap", aum: 8102, since: "Oct 2018", returns: { "1M": 7.56, "3M": 15.17, "6M": 4.72, "1Y": 15.31, "2Y": 21.25, "3Y": 39.14, "5Y": 25.9, "SI": 28.02 } },
  { manager: "Aequitas", strategy: "India Opportunities Product", category: "Smallcap", aum: 2637, since: "Feb 2013", returns: { "1M": 0.52, "3M": -5.02, "6M": 15.55, "1Y": 41.15, "2Y": 31.12, "3Y": 41.13, "5Y": 38.16, "SI": 32.9 } },
  { manager: "Wallfort", strategy: "Diversified Fund", category: "Mid & Small", aum: 574, since: "Nov 2018", returns: { "1M": 0.7, "3M": 8.59, "6M": -8.52, "1Y": 4.2, "2Y": 17.17, "3Y": 38.05, "5Y": 26.57, "SI": 22.22 } },
  { manager: "Green Lantern Capital", strategy: "Growth Fund", category: "Mid & Small", aum: 1769, since: "Dec 2017", returns: { "1M": -0.29, "3M": 7.65, "6M": 9.4, "1Y": 7.89, "2Y": 8.92, "3Y": 37.85, "5Y": 34.86, "SI": 23.17 } },
  { manager: "Sundaram Alternates", strategy: "SISOP", category: "Multicap", aum: 1865, since: "Feb 2010", returns: { "1M": 7.5, "3M": 16.5, "6M": 17.3, "1Y": 33.7, "2Y": 28.6, "3Y": 25.3, "5Y": 19.07, "SI": 18.87 } },
  { manager: "Sundaram Alternates", strategy: "S.E.L.F", category: "Midcap", aum: 1027, since: "Jun 2010", returns: { "1M": 8.2, "3M": 18.7, "6M": 19.8, "1Y": 35.1, "2Y": 24.7, "3Y": 24.6, "5Y": 17.96, "SI": 18.32 } },
  { manager: "Carnelian", strategy: "Bespoke Portfolio", category: "Multicap", aum: 3645, since: "Aug 2019", returns: { "1M": 4.6, "3M": 6.93, "6M": 1.01, "1Y": 14.22, "2Y": 13.67, "3Y": 25.33, "5Y": null, "SI": 25.58 } },
  { manager: "Carnelian", strategy: "Shift Strategy", category: "Mid & Small", aum: 5699, since: "Dec 2021", returns: { "1M": 5.07, "3M": 8.17, "6M": 0.19, "1Y": 5.4, "2Y": 13.26, "3Y": 23.74, "5Y": null, "SI": null } },
  { manager: "ICICI Prudential", strategy: "PMS Contra Strategy", category: "Flexicap", aum: 13837, since: "Sep 2018", returns: { "1M": -0.16, "3M": -2.99, "6M": -1.65, "1Y": 4.29, "2Y": 4.29, "3Y": 19.0, "5Y": 17.47, "SI": 18.02 } },
  { manager: "ICICI Prudential", strategy: "PMS PIPE Strategy", category: "Smallcap", aum: 7830, since: "Sep 2019", returns: { "1M": 0.09, "3M": 3.2, "6M": 1.42, "1Y": 5.95, "2Y": 6.81, "3Y": 22.2, "5Y": null, "SI": 25.05 } },
  { manager: "ICICI Prudential", strategy: "PMS Largecap Strategy", category: "Largecap", aum: 879, since: "Mar 2009", returns: { "1M": 1.1, "3M": -4.08, "6M": -2.72, "1Y": 3.09, "2Y": 4.96, "3Y": 19.51, "5Y": 16.02, "SI": 15.82 } },
  { manager: "Abakkus", strategy: "All Cap Approach", category: "Multicap", aum: 7767, since: "Oct 2020", returns: { "1M": 1.23, "3M": -2.27, "6M": -0.27, "1Y": 8.69, "2Y": 6.78, "3Y": 17.05, "5Y": null, "SI": 22.95 } },
  { manager: "Abakkus", strategy: "Emerging Opportunities", category: "Mid & Small", aum: 5943, since: "Oct 2020", returns: { "1M": -1.71, "3M": 1.89, "6M": -3.71, "1Y": -2.39, "2Y": 7.28, "3Y": 18.14, "5Y": null, "SI": 26.43 } },
  { manager: "Buoyant Capital", strategy: "Opportunities PMS", category: "Multicap", aum: 11548, since: "Jun 2016", returns: { "1M": -0.78, "3M": -3.73, "6M": -2.48, "1Y": 8.11, "2Y": 12.03, "3Y": 18.92, "5Y": null, "SI": 20.75 } },
  { manager: "ValueQuest", strategy: "Growth", category: "Multicap", aum: 2020, since: "Jul 2018", returns: { "1M": 6.0, "3M": 18.8, "6M": 11.9, "1Y": 16.2, "2Y": 11.1, "3Y": 18.9, "5Y": null, "SI": null } },
  { manager: "Equitree Capital", strategy: "Emerging Opportunities", category: "Smallcap", aum: 1512, since: "Oct 2017", returns: { "1M": -0.69, "3M": 8.78, "6M": -5.71, "1Y": -6.87, "2Y": 7.97, "3Y": 27.24, "5Y": 23.23, "SI": 7.9 } },
  { manager: "Counter Cyclical", strategy: "Diversified Long Term Value", category: "Smallcap", aum: 972, since: "Nov 2018", returns: { "1M": 4.53, "3M": 11.12, "6M": 2.38, "1Y": -3.12, "2Y": 10.16, "3Y": 22.64, "5Y": 32.56, "SI": 44.64 } },
  { manager: "Sundaram Alternates", strategy: "Rising Stars", category: "Smallcap", aum: 121, since: "Nov 2009", returns: { "1M": 5.7, "3M": 18.6, "6M": 22.0, "1Y": 37.2, "2Y": 23.5, "3Y": 17.8, "5Y": 16.94, "SI": 15.14 } },
  { manager: "Aditya Birla Sun Life", strategy: "Select Sector Portfolio", category: "Mid & Small", aum: 588, since: "Oct 2009", returns: { "1M": 4.03, "3M": 9.13, "6M": 6.91, "1Y": 12.63, "2Y": 18.13, "3Y": 27.64, "5Y": 19.86, "SI": 17.25 } },
  { manager: "Wallfort", strategy: "Avenue Fund", category: "Mid & Small", aum: 146, since: "Feb 2022", returns: { "1M": 0.23, "3M": 7.27, "6M": 5.19, "1Y": 25.52, "2Y": 14.72, "3Y": 30.5, "5Y": null, "SI": 25.01 } },
  { manager: "InCred", strategy: "Healthcare Portfolio", category: "Thematic", aum: 657, since: "Feb 2023", returns: { "1M": 7.12, "3M": 8.61, "6M": -6.51, "1Y": 10.19, "2Y": 25.56, "3Y": 28.28, "5Y": null, "SI": null } },
  { manager: "Negen Capital", strategy: "Special Situations & Dynamic Allocation", category: "Thematic", aum: 1451, since: "Aug 2017", returns: { "1M": 2.45, "3M": 10.39, "6M": 1.77, "1Y": -0.35, "2Y": 11.71, "3Y": 24.59, "5Y": null, "SI": 17.51 } },
  { manager: "Invesco", strategy: "India R.I.S.E Portfolio", category: "Thematic", aum: 338, since: "—", returns: { "1M": 0.63, "3M": -2.14, "6M": -0.76, "1Y": 10.92, "2Y": 6.24, "3Y": 18.69, "5Y": null, "SI": null } },
  { manager: "360 ONE", strategy: "Phoenix Portfolio", category: "Multicap", aum: 1754, since: "Jan 2021", returns: { "1M": 1.97, "3M": -1.36, "6M": -3.39, "1Y": 1.77, "2Y": 4.52, "3Y": 16.59, "5Y": 16.2, "SI": 17.56 } },
  { manager: "Unifi Capital", strategy: "APJ (formerly APJ 20)", category: "Midcap", aum: 900, since: "—", returns: { "1M": 1.32, "3M": 1.15, "6M": -5.43, "1Y": -1.77, "2Y": 4.5, "3Y": 13.57, "5Y": null, "SI": null } },
  { manager: "Marcellus", strategy: "Consistent Compounders", category: "Largecap", aum: 1666, since: "—", returns: { "1M": 4.0, "3M": 1.11, "6M": -4.6, "1Y": -4.05, "2Y": 2.3, "3Y": 5.43, "5Y": null, "SI": null } },
  { manager: "Marcellus", strategy: "Kings of Capital", category: "Largecap", aum: 135, since: "—", returns: { "1M": 0.32, "3M": -2.19, "6M": -7.77, "1Y": -6.12, "2Y": 7.11, "3Y": 8.25, "5Y": null, "SI": null } },
  { manager: "Marcellus", strategy: "Little Champs", category: "Midcap", aum: 129, since: "—", returns: { "1M": 0.67, "3M": 0.98, "6M": -6.06, "1Y": -6.77, "2Y": 0.93, "3Y": 1.96, "5Y": null, "SI": null } },
  { manager: "Estee Advisors", strategy: "I Alpha", category: "Hybrid", aum: 257, since: "Sep 2009", returns: { "1M": 0.87, "3M": 2.08, "6M": 3.9, "1Y": 7.9, "2Y": 9.36, "3Y": 10.7, "5Y": 9.06, "SI": 10.46 } },
  { manager: "Asit C. Mehta", strategy: "Ace Multi Asset Portfolio", category: "Hybrid", aum: 12, since: "Oct 2018", returns: { "1M": 0.01, "3M": 1.03, "6M": -1.62, "1Y": 6.8, "2Y": 5.55, "3Y": 25.15, "5Y": 19.63, "SI": 16.41 } },
];

const CATEGORIES = ["All", "Largecap", "Flexicap", "Multicap", "Mid & Small", "Midcap", "Smallcap", "Thematic", "Hybrid"];
const PERIODS = ["1M", "3M", "6M", "1Y", "2Y", "3Y", "5Y", "SI"];
const HEADLINE_PERIODS = ["1M", "6M", "1Y", "3Y", "5Y", "SI"]; // tiles shown on the card

/* ---------- helpers ---------- */
const fmtPct = (v) => (v === null || v === undefined ? "N/A" : `${v > 0 ? "+" : ""}${v.toFixed(2)}%`);
const fmtAum = (cr) => (cr >= 1000 ? `₹${(cr / 1000).toFixed(2)}K Cr` : `₹${cr.toLocaleString("en-IN")} Cr`);
const toneOf = (v) => (v === null || v === undefined ? "flat" : v > 0.0001 ? "pos" : v < -0.0001 ? "neg" : "flat");
const toneColor = { pos: "var(--pos)", neg: "var(--neg)", flat: "var(--flat)" };
const toneBg = { pos: "var(--pos-bg)", neg: "var(--neg-bg)", flat: "var(--flat-bg)" };
const monogram = (m) => m.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
const alphaFor = (ret, p) => (ret[p] === null || ret[p] === undefined || BENCH[p] === null ? null : ret[p] - BENCH[p]);
const beats = (ret, periods) => periods.reduce((n, p) => n + (alphaFor(ret, p) > 0 ? 1 : 0), 0);

/* ---------- small pieces ---------- */
function AlphaChip({ value }) {
  if (value === null) return <span className="font-num" style={{ fontSize: 12, color: "var(--muted)" }}>no benchmark</span>;
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

function ConsistencyDots({ ret }) {
  // over 1Y / 2Y / 3Y — the periods that actually matter for selection
  const longPeriods = ["1Y", "2Y", "3Y"];
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

function ReturnTile({ label, value }) {
  const t = toneOf(value);
  return (
    <div className="rounded-lg px-2 py-1.5 text-center" style={{ background: "var(--flat-bg)", border: "1px solid var(--line)" }}>
      <div className="font-num" style={{ fontSize: 13, fontWeight: 600, color: value === null ? "var(--muted)" : toneColor[t], lineHeight: 1.1 }}>
        {value === null ? "—" : `${value > 0 ? "" : ""}${value.toFixed(1)}%`}
      </div>
      <div className="font-num" style={{ fontSize: 10, color: "var(--muted)", marginTop: 2, letterSpacing: 0.3 }}>{label}</div>
    </div>
  );
}

/* ---------- card ---------- */
function StrategyCard({ s, period, selected, onCompare, onBrief }) {
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
              <div className="font-num" style={{ fontSize: 11, color: "var(--muted)" }}>Since {s.since}</div>
            </div>
          </div>
          <span className="font-ui shrink-0 rounded-full px-2 py-0.5" style={{ fontSize: 11, fontWeight: 500, color: "var(--green-deep)", background: "var(--green-tint)" }}>
            {s.category}
          </span>
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
            <AlphaChip value={alpha} />
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
function BriefSheet({ s, onClose }) {
  if (!s) return null;
  const nBeat = beats(s.returns, ["1Y", "2Y", "3Y"]);
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
            {[["Category", s.category], ["AUM", fmtAum(s.aum)], ["Minimum", "₹50 lakh"], ["Since", s.since]].map(([k, v]) => (
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
              {" "}Returns are TWRR at strategy level, as on {AS_ON}. Your own return depends on entry timing. Past performance doesn't predict the future.
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
function CompareModal({ items, onClose, onRemove }) {
  if (!items.length) return null;
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
                  <th key={s.strategy} className="px-3 pb-3 text-left align-bottom">
                    <div className="font-ui" style={{ fontSize: 11, color: "var(--muted)" }}>{s.manager}</div>
                    <div className="font-display" style={{ fontSize: 15, fontWeight: 600, color: "var(--ink)", lineHeight: 1.1 }}>{s.strategy}</div>
                    <button onClick={() => onRemove(s)} className="font-ui mt-1" style={{ fontSize: 11, color: "var(--neg)" }}>remove</button>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {[["Category", (s) => s.category], ["AUM", (s) => fmtAum(s.aum)]].map(([label, fn]) => (
                <tr key={label} style={{ borderTop: "1px solid var(--line)" }}>
                  <td className="font-ui px-3 py-2" style={{ fontSize: 12, color: "var(--muted)" }}>{label}</td>
                  {items.map((s) => <td key={s.strategy} className="font-num px-3 py-2" style={{ fontSize: 13, color: "var(--ink)" }}>{fn(s)}</td>)}
                </tr>
              ))}
              {PERIODS.map((p) => (
                <tr key={p} style={{ borderTop: "1px solid var(--line)" }}>
                  <td className="font-ui px-3 py-2" style={{ fontSize: 12, color: "var(--muted)" }}>{p} <span style={{ fontSize: 10 }}>(α)</span></td>
                  {items.map((s) => {
                    const a = alphaFor(s.returns, p);
                    return (
                      <td key={s.strategy} className="px-3 py-2">
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
export default function PMSExplorer() {
  const [category, setCategory] = useState("All");
  const [period, setPeriod] = useState("3Y");
  const [sort, setSort] = useState("aum");
  const [query, setQuery] = useState("");
  const [beatOnly, setBeatOnly] = useState(false);
  const [compare, setCompare] = useState([]);
  const [brief, setBrief] = useState(null);
  const [showCompare, setShowCompare] = useState(false);

  const toggleCompare = (s) => {
    setCompare((prev) => prev.find((x) => x.strategy === s.strategy && x.manager === s.manager)
      ? prev.filter((x) => !(x.strategy === s.strategy && x.manager === s.manager))
      : prev.length >= 3 ? prev : [...prev, s]);
  };
  const isSelected = (s) => !!compare.find((x) => x.strategy === s.strategy && x.manager === s.manager);

  const filtered = useMemo(() => {
    let list = STRATEGIES.filter((s) => category === "All" || s.category === category);
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((s) => (s.manager + " " + s.strategy).toLowerCase().includes(q));
    }
    if (beatOnly && BENCH[period] !== null) list = list.filter((s) => alphaFor(s.returns, period) > 0);
    const val = (s) => s.returns[period];
    list = [...list].sort((a, b) => {
      if (sort === "aum") return b.aum - a.aum;
      if (sort === "return") return (val(b) ?? -999) - (val(a) ?? -999);
      if (sort === "alpha") return (alphaFor(b.returns, period) ?? -999) - (alphaFor(a.returns, period) ?? -999);
      if (sort === "name") return (a.manager + a.strategy).localeCompare(b.manager + b.strategy);
      return 0;
    });
    return list;
  }, [category, period, sort, query, beatOnly]);

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');
    :root{
      --ink:#0F1A14; --muted:#5B6660; --line:#E4E7E2; --page:#F3F5F1; --card:#FFFFFF;
      --green:#0E7C56; --green-deep:#0A5E41; --green-tint:#E7F3EC;
      --pos:#15803D; --pos-bg:#E9F6ED; --neg:#C0392B; --neg-bg:#FBEBE9; --flat:#6B7280; --flat-bg:#F2F4F0;
    }
    .font-display{font-family:'Fraunces',Georgia,serif;}
    .font-ui{font-family:'Inter',system-ui,-apple-system,sans-serif;}
    .font-num{font-family:'IBM Plex Mono',ui-monospace,monospace;font-variant-numeric:tabular-nums;}
    .pmc-scroll::-webkit-scrollbar{height:6px;width:6px;} .pmc-scroll::-webkit-scrollbar-thumb{background:var(--line);border-radius:3px;}
  `;

  const chipStyle = (active) => ({
    fontSize: 13, fontWeight: 500,
    color: active ? "#fff" : "var(--ink)",
    background: active ? "var(--ink)" : "#fff",
    border: `1px solid ${active ? "var(--ink)" : "var(--line)"}`,
  });

  return (
    <div className="font-ui min-h-screen" style={{ background: "var(--page)", color: "var(--ink)" }}>
      <style>{css}</style>

      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* header */}
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="font-ui" style={{ fontSize: 12, letterSpacing: 1.5, textTransform: "uppercase", color: "var(--green-deep)", fontWeight: 600 }}>PlanMyCashflows</div>
            <h1 className="font-display" style={{ fontSize: 40, fontWeight: 600, color: "var(--ink)", lineHeight: 1.05, marginTop: 4 }}>PMS Explorer</h1>
            <p className="font-ui" style={{ fontSize: 15, color: "var(--muted)", marginTop: 8, maxWidth: 560 }}>
              We rank on <strong style={{ color: "var(--ink)" }}>alpha</strong>, not the raw return chart — because in PMS, last year's chart-topper is often next year's laggard. Every card shows return <em>and</em> what it beat.
            </p>
          </div>
          <div className="text-right">
            <div className="font-num" style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>{STRATEGIES.length} of 1,734 shown</div>
            <div className="font-ui" style={{ fontSize: 12, color: "var(--muted)" }}>as on {AS_ON}</div>
          </div>
        </div>

        {/* controls */}
        <div className="sticky top-0 z-30 -mx-4 px-4 sm:-mx-6 sm:px-6 py-3 mt-6" style={{ background: "var(--page)", borderBottom: "1px solid var(--line)" }}>
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
              {["1M", "1Y", "3Y", "5Y", "SI"].map((p) => (
                <button key={p} onClick={() => setPeriod(p)} className="font-num px-2.5 py-2"
                  style={{ fontSize: 12, fontWeight: 600, color: period === p ? "#fff" : "var(--ink)", background: period === p ? "var(--green)" : "transparent" }}>{p}</button>
              ))}
            </div>

            <div className="relative">
              <select value={sort} onChange={(e) => setSort(e.target.value)}
                className="font-ui appearance-none rounded-xl bg-white pl-3 pr-8 py-2" style={{ fontSize: 13, border: "1px solid var(--line)", color: "var(--ink)" }}>
                <option value="aum">Sort: AUM</option>
                <option value="alpha">Sort: Alpha ({period})</option>
                <option value="return">Sort: Return ({period})</option>
                <option value="name">Sort: Name</option>
              </select>
              <SlidersHorizontal size={14} color="var(--muted)" style={{ position: "absolute", right: 10, top: 11, pointerEvents: "none" }} />
            </div>
          </div>

          {/* category chips + beat-only */}
          <div className="flex items-center gap-2 mt-2.5 overflow-x-auto pb-1 pmc-scroll">
            {CATEGORIES.map((c) => (
              <button key={c} onClick={() => setCategory(c)} className="font-ui whitespace-nowrap rounded-full px-3 py-1.5" style={chipStyle(category === c)}>{c}</button>
            ))}
            <div style={{ width: 1, height: 22, background: "var(--line)", margin: "0 4px" }} />
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
        {filtered.length === 0 ? (
          <div className="text-center py-20">
            <p className="font-display" style={{ fontSize: 20, color: "var(--ink)" }}>No strategies match those filters.</p>
            <p className="font-ui" style={{ fontSize: 14, color: "var(--muted)", marginTop: 6 }}>Try clearing “beat benchmark only,” or widening the category.</p>
          </div>
        ) : (
          <div className="grid gap-4 mt-6" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
            {filtered.map((s) => (
              <StrategyCard key={s.manager + s.strategy} s={s} period={period}
                selected={isSelected(s)} onCompare={toggleCompare} onBrief={setBrief} />
            ))}
          </div>
        )}

        {/* footnote */}
        <p className="font-ui mt-8" style={{ fontSize: 12, color: "var(--muted)", lineHeight: 1.6, maxWidth: 720 }}>
          Returns are Time-Weighted Rate of Return at the strategy level, annualised beyond 1 year, as on {AS_ON}. Alpha is return minus {BENCH_NAME} for the same window (shown where a like-for-like benchmark exists). Figures are sourced from disclosures and are not verified by SEBI. Past performance is not indicative of future returns. Minimum investment ₹50 lakh (SEBI mandate). This is not investment advice.
        </p>
      </div>

      {/* compare tray */}
      {compare.length > 0 && (
        <div className="fixed bottom-0 left-0 right-0 z-40" style={{ background: "var(--ink)" }}>
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 overflow-x-auto pmc-scroll">
              <span className="font-ui shrink-0" style={{ fontSize: 13, color: "#fff", fontWeight: 500 }}>{compare.length}/3 to compare:</span>
              {compare.map((s) => (
                <span key={s.strategy} className="font-ui shrink-0 inline-flex items-center gap-1 rounded-full px-2.5 py-1" style={{ fontSize: 12, background: "rgba(255,255,255,0.12)", color: "#fff" }}>
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

      <BriefSheet s={brief} onClose={() => setBrief(null)} />
      {showCompare && <CompareModal items={compare} onClose={() => setShowCompare(false)} onRemove={toggleCompare} />}
    </div>
  );
}
