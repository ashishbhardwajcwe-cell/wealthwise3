"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { placeholderStrategies } from "@/lib/home-content";
import type { LivePmsStrategy } from "@/lib/investment-data";
import { fmtPct, fmtAumCr, fmtMinL, fmtAsOf, latestAmfiDate } from "@/components/tables/table-utils";
import { hasImplausibleReturn } from "@/lib/pms";

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
 * Dependency-free searchable strategy picker. A text input filters a listbox
 * by a case-insensitive substring match on "manager + strategy", so the
 * ~1,700-row live feed is findable by typing instead of an endless scroll.
 * Clicking a result selects it; picking "— None —" clears the slot.
 */
function StrategyCombobox({
  slot,
  items,
  value,
  disabledIndexes,
  onChange,
}: {
  slot: number;
  items: CompareItem[];
  value: number | null;
  disabledIndexes: Set<number>;
  onChange: (value: number | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close the listbox when the user clicks outside the widget.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [open]);

  const selected = value !== null ? items[value] : null;
  const label = (s: CompareItem) => `${s.category} · ${s.strategy}`;

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items
      .map((s, i) => ({ s, i }))
      .filter(({ s }) => !q || `${s.house} ${s.strategy}`.toLowerCase().includes(q));
  }, [items, query]);

  const select = (i: number | null) => {
    onChange(i);
    setQuery("");
    setOpen(false);
  };

  return (
    <div ref={wrapRef} className="relative">
      <input
        id={`compare-slot-${slot}`}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={`compare-listbox-${slot}`}
        autoComplete="off"
        placeholder={selected ? label(selected) : "— None — (type to search)"}
        value={open ? query : selected ? label(selected) : ""}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); }}
        className="w-full px-3 py-2.5 bg-white border border-[var(--color-silver)]/60 rounded-lg text-sm focus:outline-none focus:border-[var(--color-gold)]"
      />
      {open && (
        <ul
          id={`compare-listbox-${slot}`}
          role="listbox"
          className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-[var(--color-silver)]/60 bg-white shadow-lg text-sm"
        >
          <li role="option" aria-selected={value === null}>
            <button
              type="button"
              onClick={() => select(null)}
              className="w-full text-left px-3 py-2 hover:bg-[var(--color-parchment)]/60 text-[var(--color-slate)]"
            >
              — None —
            </button>
          </li>
          {matches.length === 0 ? (
            <li className="px-3 py-2 text-[var(--color-slate)] italic">No matches</li>
          ) : (
            matches.map(({ s, i }) => {
              const isDisabled = disabledIndexes.has(i) && value !== i;
              return (
                <li key={i} role="option" aria-selected={value === i}>
                  <button
                    type="button"
                    disabled={isDisabled}
                    onClick={() => select(i)}
                    className={`w-full text-left px-3 py-2 ${
                      isDisabled
                        ? "text-[var(--color-silver)] cursor-not-allowed"
                        : value === i
                        ? "bg-[var(--color-parchment)] text-[var(--color-navy)] font-semibold"
                        : "hover:bg-[var(--color-parchment)]/60 text-[var(--color-navy)]"
                    }`}
                  >
                    <span className="block">{s.strategy}</span>
                    <span className="block text-xs text-[var(--color-slate)]">
                      {s.house}{s.category !== "—" ? ` · ${s.category}` : ""}
                    </span>
                  </button>
                </li>
              );
            })
          )}
        </ul>
      )}
    </div>
  );
}

/**
 * Pick up to three strategies and compare them side-by-side. Uses the live
 * PMS feed from Sanity when available and falls back to the illustrative
 * placeholder array when empty. Reporting artifacts (implausible returns) are
 * filtered out so the picker never offers them. No returns figures are hardcoded.
 */
export function CompareTool({ strategies }: { strategies?: LivePmsStrategy[] }) {
  const liveStrategies = useMemo(
    () => (strategies ?? []).filter((s) => !hasImplausibleReturn(s)),
    [strategies],
  );
  const isLive = liveStrategies.length > 0;

  const items: CompareItem[] = useMemo(() => {
    if (isLive) {
      return liveStrategies.map((s) => ({
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
  }, [isLive, liveStrategies]);

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

  const setSlot = (slot: number, value: number | null) => {
    setSlots((prev) => prev.map((v, i) => (i === slot ? value : v)));
  };

  const selectedIndexes = new Set(slots.filter((v): v is number => v !== null));

  const chosen = slots
    .filter((v): v is number => v !== null)
    .map((i) => items[i])
    .filter(Boolean);

  const latestAsOf = isLive ? fmtAsOf(latestAmfiDate(liveStrategies.map((s) => s.asOfDate))) : null;

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
            <StrategyCombobox
              slot={slot}
              items={items}
              value={slots[slot]}
              disabledIndexes={selectedIndexes}
              onChange={(v) => setSlot(slot, v)}
            />
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
