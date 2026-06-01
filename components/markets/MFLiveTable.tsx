"use client";

import { useMemo, useState } from "react";
import { ArrowUpDown, ArrowDown, ArrowUp } from "lucide-react";
import type { MFLiveRow } from "@/lib/mutual-funds";
import { MF_CATEGORIES } from "@/lib/mutual-funds";

type SortKey = "name" | "amc" | "category" | "nav";

export function MFLiveTable({ rows }: { rows: MFLiveRow[] }) {
  const [filter, setFilter] = useState<string>("all");
  const [sortBy, setSortBy] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const filtered = useMemo(() => {
    const base = filter === "all" ? rows : rows.filter((r) => r.category === filter);
    const dir = sortDir === "asc" ? 1 : -1;
    return [...base].sort((a, b) => {
      const av = getValue(a, sortBy);
      const bv = getValue(b, sortBy);
      if (typeof av === "string" && typeof bv === "string") return av.localeCompare(bv) * dir;
      return ((Number(av) || 0) - (Number(bv) || 0)) * dir;
    });
  }, [rows, filter, sortBy, sortDir]);

  function toggleSort(key: SortKey) {
    if (sortBy === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else { setSortBy(key); setSortDir(key === "nav" ? "desc" : "asc"); }
  }

  const latestAsOf = useMemo(() => {
    const dates = rows.map((r) => r.asOf).filter(Boolean) as string[];
    return dates.length > 0 ? dates[0] : null;
  }, [rows]);

  const categoryName = (slug: string) => MF_CATEGORIES.find((c) => c.slug === slug)?.name ?? slug;

  return (
    <section className="py-16 bg-white">
      <div className="container-wide">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <span className="eyebrow inline-flex items-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--color-emerald)] opacity-60" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--color-emerald)]" />
              </span>
              Live NAV tracker
            </span>
            <h2 className="mt-2">Mutual funds we track</h2>
            <p className="text-sm text-[var(--color-slate)] mt-2">
              {rows.length} hand-picked funds across {MF_CATEGORIES.length} categories. Live NAVs from AMFI India daily feed.
              {latestAsOf && <span> NAV as of {latestAsOf}.</span>}
            </p>
          </div>

          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setFilter("all")}
              className={pillBtn(filter === "all")}
            >
              All
            </button>
            {MF_CATEGORIES.map((c) => (
              <button key={c.slug} onClick={() => setFilter(c.slug)} className={pillBtn(filter === c.slug)}>
                {c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-[var(--color-silver)]/40">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-parchment)]">
              <tr>
                <Th label="Fund" k="name" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="left" />
                <Th label="AMC" k="amc" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="left" />
                <Th label="Category" k="category" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="left" />
                <Th label="NAV (₹)" k="nav" sortBy={sortBy} sortDir={sortDir} onSort={toggleSort} align="right" />
                <th className="px-4 py-3 text-right font-semibold text-[var(--color-slate)] text-[10px] uppercase tracking-wider">As of</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={5} className="px-4 py-12 text-center text-[var(--color-slate)]">No funds in this category yet.</td></tr>
              ) : filtered.map((r) => (
                <tr key={r.schemeCode + r.name} className="border-t border-[var(--color-silver)]/30 hover:bg-[var(--color-parchment)]/40">
                  <td className="px-4 py-3 font-semibold text-[var(--color-navy)]">{r.name}</td>
                  <td className="px-4 py-3 text-[var(--color-slate)]">{r.amc}</td>
                  <td className="px-4 py-3 text-xs">
                    <span className="px-2 py-0.5 rounded-full bg-[var(--color-sand)]/60 text-[var(--color-slate)] font-semibold">
                      {categoryName(r.category)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums font-semibold text-[var(--color-navy)]">
                    {r.nav != null ? r.nav.toFixed(2) : <span className="text-[var(--color-slate)]/60">—</span>}
                  </td>
                  <td className="px-4 py-3 text-right text-xs text-[var(--color-slate)] tabular-nums">{r.asOf ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <p className="text-[11px] text-[var(--color-slate)] mt-4 italic leading-relaxed">
          NAVs are sourced live from AMFI India&apos;s daily feed and refresh once per business day (~10 PM IST).
          All schemes shown are Direct/Growth plans. Past performance is not indicative of future returns.
          This list is editorial — not a recommendation. Read scheme-related documents carefully before investing.
        </p>
      </div>
    </section>
  );
}

function pillBtn(active: boolean) {
  return `px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors ${
    active
      ? "bg-[var(--color-navy)] text-[var(--color-cream)] border-[var(--color-navy)]"
      : "bg-white text-[var(--color-navy)] border-[var(--color-silver)]/40 hover:border-[var(--color-gold)]"
  }`;
}

function getValue(r: MFLiveRow, key: SortKey): string | number | null {
  if (key === "name") return r.name;
  if (key === "amc") return r.amc;
  if (key === "category") return r.category;
  if (key === "nav") return r.nav;
  return null;
}

function Th({ label, k, sortBy, sortDir, onSort, align = "left" }: {
  label: string; k: SortKey;
  sortBy: SortKey; sortDir: "asc" | "desc";
  onSort: (k: SortKey) => void; align?: "left" | "right";
}) {
  const active = sortBy === k;
  const Icon = !active ? ArrowUpDown : sortDir === "asc" ? ArrowUp : ArrowDown;
  return (
    <th className={`px-4 py-3 ${align === "right" ? "text-right" : "text-left"}`}>
      <button onClick={() => onSort(k)} className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-semibold text-[var(--color-slate)] hover:text-[var(--color-navy)]">
        {label}
        <Icon className={`w-3 h-3 ${active ? "text-[var(--color-gold-dim)]" : "opacity-50"}`} />
      </button>
    </th>
  );
}
