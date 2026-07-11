"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { placeholderStrategies } from "@/lib/home-content";
import type { LivePmsStrategy } from "@/lib/investment-data";
import { fmtPct, fmtAumCr, fmtMinL, fmtAsOf, latestAmfiDate } from "@/components/tables/table-utils";

const MAX_COLUMNS = 3;

/** Normalised comparison item shared by live and placeholder rows. */
interface CompareItem {
  strategy: string;
  house: string;
  category: string;
  returns1y: string;
  returns3y: string;
  returns5y: string;
  aum: string;
  minInvestment: string;
}

/**
 * Pick up to three strategies and compare them side-by-side. Uses the live
 * PMS feed from Sanity when available and falls back to the illustrative
 * placeholder array when empty. No returns figures are hardcoded.
 */
export function CompareTool({ strategies }: { strategies?: LivePmsStrategy[] }) {
  const isLive = !!strategies && strategies.length > 0;

  const items: CompareItem[] = useMemo(() => {
    if (isLive) {
      return strategies!.map((s) => ({
        strategy: s.strategyName,
        house: s.manager,
        category: s.category ?? "—",
        returns1y: fmtPct(s.returns1y),
        returns3y: fmtPct(s.returns3y),
        returns5y: fmtPct(s.returns5y),
        aum: fmtAumCr(s.aumCr),
        minInvestment: fmtMinL(s.minInvestmentL),
      }));
    }
    return placeholderStrategies.map((s) => ({
      strategy: s.strategy,
      house: s.fundHouse,
      category: s.category,
      returns1y: s.returns1y,
      returns3y: s.returns3y,
      returns5y: s.returns5y,
      aum: s.aum,
      minInvestment: s.minInvestment,
    }));
  }, [isLive, strategies]);

  const houseLabel = isLive ? "Manager" : "Fund House";

  const rowSpec: { label: string; get: (s: CompareItem) => string }[] = [
    { label: houseLabel, get: (s) => s.house },
    { label: "Category", get: (s) => s.category },
    { label: "1Y Return", get: (s) => s.returns1y },
    { label: "3Y Return", get: (s) => s.returns3y },
    { label: "5Y Return", get: (s) => s.returns5y },
    { label: "AUM", get: (s) => s.aum },
    { label: "Min. Investment", get: (s) => s.minInvestment },
  ];

  // Selected indexes into `items`; null = empty slot. Preselect as many of
  // the first strategies as exist (so a 1- or 2-item feed still works).
  const [slots, setSlots] = useState<(number | null)[]>(() =>
    Array.from({ length: MAX_COLUMNS }, (_, i) => (i < items.length ? i : null)),
  );

  const setSlot = (slot: number, value: string) => {
    setSlots((prev) => prev.map((v, i) => (i === slot ? (value === "" ? null : Number(value)) : v)));
  };

  const chosen = slots
    .filter((v): v is number => v !== null)
    .map((i) => items[i])
    .filter(Boolean);

  const latestAsOf = isLive ? fmtAsOf(latestAmfiDate(strategies!.map((s) => s.asOfDate))) : null;

  return (
    <div>
      {/* Slot pickers */}
      <div className="grid sm:grid-cols-3 gap-4 mb-8">
        {Array.from({ length: MAX_COLUMNS }, (_, slot) => (
          <div key={slot}>
            <label
              htmlFor={`compare-slot-${slot}`}
              className="block text-xs uppercase tracking-wider font-semibold text-[var(--color-slate)] mb-1.5"
            >
              Strategy {slot + 1}
            </label>
            <select
              id={`compare-slot-${slot}`}
              value={slots[slot] ?? ""}
              onChange={(e) => setSlot(slot, e.target.value)}
              className="w-full px-3 py-2.5 bg-white border border-[var(--color-silver)]/60 rounded-lg text-sm focus:outline-none focus:border-[var(--color-gold)]"
            >
              <option value="">— None —</option>
              {items.map((s, i) => (
                <option key={i} value={i} disabled={slots.includes(i) && slots[slot] !== i}>
                  {s.category} · {s.strategy}
                </option>
              ))}
            </select>
          </div>
        ))}
      </div>

      {chosen.length === 0 ? (
        <p className="text-sm text-[var(--color-slate)] italic py-10 text-center">
          Pick at least one strategy above to start comparing.
        </p>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-[var(--color-silver)]/40 bg-white">
          <table className="w-full text-sm text-left min-w-[36rem]">
            <thead>
              <tr className="bg-[var(--color-navy)] text-[var(--color-cream)]">
                <th scope="col" className="px-5 py-4 font-semibold w-44">Field</th>
                {chosen.map((s, i) => (
                  <th scope="col" key={i} className="px-5 py-4 font-semibold">
                    {s.strategy}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rowSpec.map((row, ri) => (
                <tr key={row.label} className={ri % 2 ? "bg-[var(--color-offwhite)]" : "bg-white"}>
                  <th scope="row" className="px-5 py-3.5 font-semibold text-[var(--color-navy)] align-top">
                    {row.label}
                  </th>
                  {chosen.map((s, i) => (
                    <td key={i} className="px-5 py-3.5 text-[var(--color-slate)] align-top">
                      {row.get(s)}
                    </td>
                  ))}
                </tr>
              ))}
              <tr className="bg-[var(--color-parchment)]/60">
                <th scope="row" className="px-5 py-3.5 font-semibold text-[var(--color-navy)]">
                  Next step
                </th>
                {chosen.map((_, i) => (
                  <td key={i} className="px-5 py-3.5">
                    <Link href="/contact" className="btn-outline text-xs py-1.5 px-3">
                      Enquire
                    </Link>
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      )}

      {isLive && latestAsOf && (
        <p className="text-[11px] text-[var(--color-slate)] italic mt-3">
          As on {latestAsOf} · Returns are annualised (TWRR).
        </p>
      )}
    </div>
  );
}
