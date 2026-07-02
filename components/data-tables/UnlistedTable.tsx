"use client";

import { useState, useMemo } from "react";
import type { UnlistedShare } from "@/lib/investment-data";
import {
  Th, PlainTh, pillBtn,
  useTableSort, sortRows, latestAmfiDate,
} from "@/components/tables/table-utils";

type SortKey = "company" | "sector" | "priceLowINR" | "ipoStatus";

const TEXT_KEYS = ["company", "sector", "ipoStatus"] as const;

const IPO_STATUS_LABELS: Record<string, string> = {
  none: "No timeline",
  "this-fy": "This FY",
  "next-fy": "Next FY",
  "drhp-filed": "DRHP filed",
  scheduled: "IPO scheduled",
};

const IPO_STATUS_COLORS: Record<string, string> = {
  none: "bg-[var(--color-silver)]/20 text-[var(--color-slate)]",
  "this-fy": "bg-[var(--color-emerald)]/15 text-[var(--color-emerald)]",
  "next-fy": "bg-[var(--color-teal)]/15 text-[var(--color-teal)]",
  "drhp-filed": "bg-[var(--color-gold)]/15 text-[var(--color-gold-dim)]",
  scheduled: "bg-[var(--color-amber)]/15 text-[var(--color-amber)]",
};

export function UnlistedTable({ shares }: { shares: UnlistedShare[] }) {
  const [filter, setFilter] = useState<string>("All");
  const { sortBy, sortDir, toggleSort } = useTableSort<SortKey>("company", "asc", TEXT_KEYS);

  const sectors = useMemo(() => {
    const set = new Set<string>();
    shares.forEach((s) => { if (s.sector) set.add(s.sector); });
    return ["All", ...Array.from(set).sort()];
  }, [shares]);

  const rows = useMemo(() => {
    let r = shares;
    if (filter !== "All") r = r.filter((s) => s.sector === filter);
    return sortRows(r, getValue, sortBy, sortDir);
  }, [shares, filter, sortBy, sortDir]);

  const latestAsOf = useMemo(() => latestAmfiDate(shares.map((s) => s.asOfDate)), [shares]);

  return (
    <section className="py-16 bg-white">
      <div className="container-wide">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <span className="eyebrow">Live tracker</span>
            <h2 className="mt-2">Unlisted shares we&apos;re tracking</h2>
            <p className="text-sm text-[var(--color-slate)] mt-2">
              {shares.length} {shares.length === 1 ? "company" : "companies"}. Prices vary across platforms — ranges shown reflect typical spread.
              {latestAsOf && <span> Updated: {latestAsOf}</span>}
            </p>
          </div>
          <div className="flex gap-2 flex-wrap">
            {sectors.map((s) => (
              <button key={s} onClick={() => setFilter(s)} className={pillBtn(filter === s)}>
                {s}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[var(--color-silver)]/40">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-parchment)]">
              <tr>
                <Th label="Company" k="company" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="left" />
                <Th label="Sector" k="sector" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="left" />
                <Th label="Price range (₹)" k="priceLowINR" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" />
                <PlainTh align="right">Lot</PlainTh>
                <Th label="IPO" k="ipoStatus" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="left" />
                <PlainTh align="left">Platforms</PlainTh>
                <PlainTh align="right">As of</PlainTh>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-12 text-center text-[var(--color-slate)]">No shares in this sector yet.</td></tr>
              ) : rows.map((s) => (
                <tr key={s._id} className="border-t border-[var(--color-silver)]/30 hover:bg-[var(--color-parchment)]/40">
                  <td className="px-4 py-3 font-semibold text-[var(--color-navy)]">{s.company}</td>
                  <td className="px-4 py-3 text-[var(--color-slate)]">{s.sector ?? "—"}</td>
                  <td className="px-4 py-3 text-right tabular-nums">₹{s.priceLowINR.toLocaleString("en-IN")} – ₹{s.priceHighINR.toLocaleString("en-IN")}</td>
                  <td className="px-4 py-3 text-right tabular-nums text-xs">{s.lotSize ?? "—"}</td>
                  <td className="px-4 py-3">
                    {s.ipoStatus && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${IPO_STATUS_COLORS[s.ipoStatus] ?? IPO_STATUS_COLORS.none}`}>
                        {IPO_STATUS_LABELS[s.ipoStatus] ?? s.ipoStatus}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-slate)]">
                    {s.platformsAvailable?.join(", ") ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-[var(--color-slate)] tabular-nums">{s.asOfDate ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-[11px] text-[var(--color-slate)] mt-4 italic leading-relaxed">
          Unlisted share prices are platform-dependent and update weekly. Spreads of 5–15% between platforms are common.
          Prices shown are illustrative ranges; the actual price you pay depends on the platform, lot, and execution.
          Not a recommendation.
        </p>
      </div>
    </section>
  );
}

function getValue(s: UnlistedShare, key: SortKey): string | number | undefined {
  if (key === "company") return s.company;
  if (key === "sector") return s.sector;
  if (key === "priceLowINR") return s.priceLowINR;
  if (key === "ipoStatus") return s.ipoStatus;
  return undefined;
}

