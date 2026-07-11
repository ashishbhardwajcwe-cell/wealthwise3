"use client";

import { useState } from "react";
import Link from "next/link";
import { placeholderStrategies, type StrategyCardData } from "@/lib/home-content";

const MAX_COLUMNS = 3;

/** Row spec: label + accessor, in PMS-Bazaar-style comparison order. */
const ROWS: { label: string; get: (s: StrategyCardData) => string }[] = [
  { label: "Strategy", get: (s) => s.strategy },
  { label: "Fund House", get: (s) => s.fundHouse },
  { label: "Category", get: (s) => s.category },
  { label: "1Y Return", get: (s) => s.returns1y },
  { label: "3Y Return", get: (s) => s.returns3y },
  { label: "5Y Return", get: (s) => s.returns5y },
  { label: "AUM", get: (s) => s.aum },
  { label: "Min. Investment", get: (s) => s.minInvestment },
];

/**
 * Pick up to three strategies and compare them side-by-side. Reads the
 * same swappable data array as the homepage grid, so wiring in the live
 * APMI feed later updates both surfaces at once.
 */
export function CompareTool() {
  // Selected indexes into placeholderStrategies; null = empty slot.
  const [slots, setSlots] = useState<(number | null)[]>([0, 1, 2]);

  const setSlot = (slot: number, value: string) => {
    setSlots((prev) => prev.map((v, i) => (i === slot ? (value === "" ? null : Number(value)) : v)));
  };

  const chosen = slots
    .filter((v): v is number => v !== null)
    .map((i) => placeholderStrategies[i])
    .filter(Boolean);

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
              {placeholderStrategies.map((s, i) => (
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
                    {s.category}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROWS.map((row, ri) => (
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
    </div>
  );
}
