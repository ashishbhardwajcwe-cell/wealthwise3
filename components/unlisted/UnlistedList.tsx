"use client";

import { useMemo } from "react";
import type { UnlistedCompany } from "@/lib/unlisted-companies";
import { fmtAsOf } from "@/lib/format";
import { Th, PlainTh, useTableSort, sortRows } from "@/components/tables/table-utils";
import { CompanyLogo } from "@/components/CompanyLogo";

/**
 * List / comparison view of the unlisted companies — the same data as the
 * card grid, in a sortable table so figures line up column-by-column. Shares
 * the explorer's enquiry modal via onEnquire. Missing Mode-2 fields render as
 * an em dash rather than being hidden, so the table stays comparable.
 */
type SortKey = "name" | "sector" | "indicativePrice" | "lotSize" | "minInvestment";
const TEXT_KEYS = ["name", "sector"] as const;

function minInvestmentOf(c: UnlistedCompany): number | undefined {
  return typeof c.indicativePrice === "number" && c.lotSize ? c.indicativePrice * c.lotSize : undefined;
}

function getValue(c: UnlistedCompany, key: SortKey): string | number | undefined {
  if (key === "name") return c.name;
  if (key === "sector") return c.sector;
  if (key === "indicativePrice") return c.indicativePrice;
  if (key === "lotSize") return c.lotSize;
  if (key === "minInvestment") return minInvestmentOf(c);
  return undefined;
}

export function UnlistedList({
  companies,
  onEnquire,
}: {
  companies: UnlistedCompany[];
  onEnquire: (name: string) => void;
}) {
  const { sortBy, sortDir, toggleSort } = useTableSort<SortKey>("name", "asc", TEXT_KEYS);
  const rows = useMemo(() => sortRows(companies, getValue, sortBy, sortDir), [companies, sortBy, sortDir]);

  return (
    <div className="overflow-x-auto rounded-xl border border-[var(--color-silver)]/40">
      <table className="w-full min-w-[720px] text-sm">
        <thead className="bg-[var(--color-parchment)]">
          <tr>
            <Th label="Company" k="name" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="left" />
            <Th label="Sector" k="sector" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="left" />
            <Th label="Indicative ₹" k="indicativePrice" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" />
            <Th label="Min lot" k="lotSize" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" />
            <Th label="Min investment" k="minInvestment" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" />
            <PlainTh align="left">Depository</PlainTh>
            <PlainTh align="right">Enquire</PlainTh>
          </tr>
        </thead>
        <tbody>
          {rows.map((c) => {
            const mi = minInvestmentOf(c);
            return (
              <tr key={c.slug} className="border-t border-[var(--color-silver)]/30 hover:bg-[var(--color-parchment)]/40">
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2.5">
                    <CompanyLogo
                      name={c.name}
                      logoUrl={c.logoUrl}
                      logoClassName="flex h-7 w-7 shrink-0 items-center justify-center overflow-hidden rounded-md border border-[var(--color-silver)]/50 bg-white p-0.5"
                      monogramClassName="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-[var(--color-navy)] text-[10px] font-bold text-[var(--color-gold)]"
                    />
                    <span className="font-semibold text-[var(--color-navy)]">{c.name}</span>
                    {c.drhpFiled && (
                      <span className="hidden shrink-0 rounded-full bg-[var(--color-emerald)]/12 px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wide text-[var(--color-emerald)] sm:inline">
                        DRHP
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-4 py-3 text-xs text-[var(--color-slate)]">{c.sector}</td>
                <td className="px-4 py-3 text-right font-semibold text-[var(--color-navy)] tabular-nums">
                  {typeof c.indicativePrice === "number" ? (
                    <>
                      ₹{c.indicativePrice.toLocaleString("en-IN")}
                      {c.priceAsOf && (
                        <span className="ml-1 hidden text-[10px] font-normal text-[var(--color-slate)] sm:inline">
                          {fmtAsOf(c.priceAsOf)}
                        </span>
                      )}
                    </>
                  ) : (
                    <span className="text-[var(--color-slate)]">—</span>
                  )}
                </td>
                <td className="px-4 py-3 text-right text-xs tabular-nums">
                  {c.lotSize ? c.lotSize.toLocaleString("en-IN") : "—"}
                </td>
                <td className="px-4 py-3 text-right text-xs font-medium tabular-nums text-[var(--color-navy)]">
                  {mi ? `≈ ₹${mi.toLocaleString("en-IN")}` : "—"}
                </td>
                <td className="px-4 py-3 text-xs text-[var(--color-slate)]">{c.depository ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => onEnquire(c.name)}
                    className="whitespace-nowrap rounded-full border border-[var(--color-navy)] px-3 py-1 text-xs font-semibold text-[var(--color-navy)] transition-colors hover:bg-[var(--color-navy)] hover:text-[var(--color-cream)]"
                  >
                    Enquire
                  </button>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
