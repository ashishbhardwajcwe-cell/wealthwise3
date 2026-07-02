"use client";

/**
 * Shared plumbing for the sortable data tables (crypto, mutual funds,
 * gold/silver ETFs, PMS, AIF, unlisted shares). One implementation of
 * the sort state machine, the null-safe comparator, the header cell,
 * and the small presentational helpers every table repeats.
 */

import { useCallback, useState } from "react";
import { ArrowUpDown, ArrowDown, ArrowUp, X } from "lucide-react";
import { InfoTip } from "@/components/InfoTip";

export type SortDir = "asc" | "desc";

/**
 * Sort state + toggle behaviour: clicking the active column flips
 * direction; clicking a new column selects it with a sensible default
 * (ascending for the keys listed in `ascKeys` — text columns and ranks —
 * descending for numeric ones, so "biggest first").
 */
export function useTableSort<K extends string>(
  initial: K,
  initialDir: SortDir,
  ascKeys: readonly K[],
) {
  const [sortBy, setSortBy] = useState<K>(initial);
  const [sortDir, setSortDir] = useState<SortDir>(initialDir);

  const toggleSort = useCallback(
    (key: K) => {
      if (sortBy === key) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
      } else {
        setSortBy(key);
        setSortDir(ascKeys.includes(key) ? "asc" : "desc");
      }
    },
    [sortBy, ascKeys],
  );

  return { sortBy, sortDir, toggleSort, setSortBy, setSortDir };
}

/**
 * Null-safe sort. Strings compare locale-aware; numbers numerically;
 * null/undefined/NaN always sink to the bottom regardless of direction
 * (a missing 5Y return should never float above real data).
 */
export function sortRows<T, K extends string>(
  rows: T[],
  getValue: (row: T, key: K) => string | number | null | undefined,
  sortBy: K,
  sortDir: SortDir,
): T[] {
  const dir = sortDir === "asc" ? 1 : -1;
  return [...rows].sort((a, b) => {
    const av = getValue(a, sortBy);
    const bv = getValue(b, sortBy);
    if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * dir;
    const an = Number(av);
    const bn = Number(bv);
    const aInvalid = av == null || Number.isNaN(an);
    const bInvalid = bv == null || Number.isNaN(bn);
    if (aInvalid && !bInvalid) return 1;
    if (!aInvalid && bInvalid) return -1;
    if (aInvalid && bInvalid) return 0;
    return (an - bn) * dir;
  });
}

/** Sortable header cell with direction indicator and optional info tooltip. */
export function Th<K extends string>({
  label,
  k,
  sortBy,
  sortDir,
  onSort,
  align = "left",
  tip,
}: {
  label: string;
  k: K;
  sortBy: K;
  sortDir: SortDir;
  onSort: (k: K) => void;
  align?: "left" | "right";
  tip?: string;
}) {
  const active = sortBy === k;
  const Icon = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th className={`px-4 py-3 ${align === "right" ? "text-right" : "text-left"}`}>
      <span className={`inline-flex items-center gap-1.5 ${align === "right" ? "justify-end" : ""}`}>
        <button
          onClick={() => onSort(k)}
          className={`inline-flex items-center gap-1 text-[10px] uppercase tracking-wider hover:text-[var(--color-navy)] ${
            active ? "text-[var(--color-navy)] font-bold" : "text-[var(--color-slate)] font-semibold"
          }`}
        >
          {label}
          <Icon className={`w-3 h-3 ${active ? "text-[var(--color-gold-dim)]" : "opacity-40"}`} />
        </button>
        {tip && <InfoTip text={tip} />}
      </span>
    </th>
  );
}

/** Plain (non-sortable) header cell, matching Th typography. */
export function PlainTh({
  children,
  align = "left",
}: {
  children: React.ReactNode;
  align?: "left" | "right" | "center";
}) {
  const alignClass = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
  return (
    <th className={`px-4 py-3 ${alignClass} font-semibold text-[var(--color-slate)] text-[10px] uppercase tracking-wider`}>
      {children}
    </th>
  );
}

/** "Showing X of Y · Reset filters" strip shown while any filter is active. */
export function FilterStatus({
  active,
  shown,
  total,
  onReset,
}: {
  active: boolean;
  shown: number;
  total: number;
  onReset: () => void;
}) {
  if (!active) return <div className="h-2" />;
  return (
    <div className="flex items-center justify-between gap-2 mb-2 text-xs text-[var(--color-slate)]">
      <span>
        Showing <strong className="text-[var(--color-navy)]">{shown}</strong> of {total}
      </span>
      <button
        onClick={onReset}
        className="inline-flex items-center gap-1 text-[var(--color-gold-dim)] hover:text-[var(--color-navy)] font-semibold"
      >
        <X className="w-3 h-3" /> Reset filters
      </button>
    </div>
  );
}

/** Eyebrow label with the pulsing "live" dot used above every live table. */
export function LiveEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="eyebrow inline-flex items-center gap-2">
      <span className="relative flex h-2 w-2">
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-emerald)] opacity-60" />
        <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-emerald)]" />
      </span>
      {children}
    </span>
  );
}

/** Filter pill button classes (active = navy fill). */
export function pillBtn(active: boolean): string {
  return `px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
    active
      ? "bg-[var(--color-navy)] text-[var(--color-cream)] border-[var(--color-navy)]"
      : "bg-white text-[var(--color-navy)] border-[var(--color-silver)]/40 hover:border-[var(--color-gold)]"
  }`;
}

/** "12.3%" or an em dash for missing values. */
export function fmtPct(v?: number | null): string {
  if (v === undefined || v === null) return "—";
  return `${v.toFixed(1)}%`;
}

/**
 * Latest date from a list of AMFI-style "DD-MMM-YYYY" date strings
 * (e.g. "30-Jun-2026"). Falls back to the last lexicographic value for
 * unrecognised formats. Returns null when the list is empty.
 */
export function latestAmfiDate(dates: Array<string | null | undefined>): string | null {
  const valid = dates.filter(Boolean) as string[];
  if (valid.length === 0) return null;
  const MONTHS: Record<string, number> = {
    jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
    jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  };
  let best: string | null = null;
  let bestTs = -Infinity;
  for (const d of valid) {
    const m = d.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
    if (!m) continue;
    const ts = new Date(Number(m[3]), MONTHS[m[2].toLowerCase()] ?? 0, Number(m[1])).getTime();
    if (!Number.isNaN(ts) && ts > bestTs) {
      bestTs = ts;
      best = d;
    }
  }
  // Nothing matched the AMFI format — fall back to the lexicographic max
  // (correct for ISO-style strings, and no worse than arbitrary otherwise).
  return best ?? [...valid].sort()[valid.length - 1];
}
