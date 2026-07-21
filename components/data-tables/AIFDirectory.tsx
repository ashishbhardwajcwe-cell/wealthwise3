"use client";

import { useState, useMemo } from "react";
import { Search, X, FileText } from "lucide-react";
import type { AifFund } from "@/lib/investment-data";
import { fmtAsOf } from "@/lib/format";
import { pillBtn } from "@/components/tables/table-utils";
import { EnquireModal } from "@/components/pms/EnquireModal";

/*
  AIF Directory — the SEBI registry, browsable.

  Data is the `aifFund` collection built from SEBI's public "Recognised
  Intermediaries" AIF list (scripts/fetch-sebi-aif.mjs → import-aif). It's a
  registry, not a performance table: no returns columns. Each row can request
  the fund's factsheet, which opens the shared lead-capture modal with the AIF
  name prefilled (source: "aif-directory"). Performance is layered onto select
  funds later, as AMCs share factsheets.
*/

const CAT_CHIPS: { label: string; value: string }[] = [
  { label: "All", value: "All" },
  { label: "Cat I", value: "I" },
  { label: "Cat II", value: "II" },
  { label: "Cat III", value: "III" },
];

const PAGE = 60;

export function AIFDirectory({ funds }: { funds: AifFund[] }) {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All");
  const [limit, setLimit] = useState(PAGE);
  const [enquire, setEnquire] = useState<string | null>(null);

  const asOf = useMemo(() => {
    const dates = funds.map((f) => f.asOfDate).filter(Boolean).sort();
    return dates.length ? fmtAsOf(dates[dates.length - 1]) : null;
  }, [funds]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return funds
      .filter((f) => category === "All" || f.category === category)
      .filter((f) => {
        if (!q) return true;
        return [f.fundName, f.manager, f.sponsor, f.registrationNo]
          .filter(Boolean)
          .some((v) => (v as string).toLowerCase().includes(q));
      })
      .sort((a, b) => a.fundName.localeCompare(b.fundName));
  }, [funds, query, category]);

  const visible = filtered.slice(0, limit);

  return (
    <section className="py-16 bg-white">
      <div className="container-wide">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-2">
          <div>
            <span className="eyebrow">AIF directory</span>
            <h2 className="mt-2">Registered Alternative Investment Funds</h2>
            <p className="text-sm text-[var(--color-slate)] mt-2 max-w-2xl">
              Every SEBI-registered AIF, searchable. Registry data from SEBI. Performance for
              select funds is added as we receive AMC factsheets.
            </p>
          </div>
          <div className="text-right shrink-0">
            <div className="text-sm font-semibold text-[var(--color-navy)] tabular-nums">
              {filtered.length.toLocaleString("en-IN")} {filtered.length === 1 ? "fund" : "funds"}
            </div>
            {asOf && <div className="text-xs text-[var(--color-slate)]">as of {asOf}</div>}
          </div>
        </div>

        {/* controls */}
        <div className="flex flex-wrap items-center gap-2 mt-5 mb-4">
          <div className="flex items-center gap-2 rounded-full border border-[var(--color-silver)]/50 bg-white px-3 py-2 flex-1 min-w-[220px]">
            <Search size={16} className="text-[var(--color-slate)]" />
            <input
              value={query}
              onChange={(e) => { setQuery(e.target.value); setLimit(PAGE); }}
              placeholder="Search fund, manager or registration no.…"
              className="w-full outline-none text-sm bg-transparent text-[var(--color-navy)]"
            />
            {query && (
              <button onClick={() => setQuery("")} aria-label="Clear search">
                <X size={15} className="text-[var(--color-slate)]" />
              </button>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {CAT_CHIPS.map((c) => (
              <button key={c.value} onClick={() => { setCategory(c.value); setLimit(PAGE); }} className={pillBtn(category === c.value)}>
                {c.label}
              </button>
            ))}
          </div>
        </div>

        {/* table */}
        <div className="overflow-x-auto rounded-xl border border-[var(--color-silver)]/40">
          <table className="w-full text-sm">
            <thead className="bg-[var(--color-parchment)]">
              <tr className="text-left text-[var(--color-slate)]">
                <th className="px-4 py-3 font-semibold">Fund</th>
                <th className="px-4 py-3 font-semibold">Category</th>
                <th className="px-4 py-3 font-semibold">Registration no.</th>
                <th className="px-4 py-3 font-semibold">Registered</th>
                <th className="px-4 py-3 font-semibold">Manager / sponsor</th>
                <th className="px-4 py-3 font-semibold text-right">Factsheet</th>
              </tr>
            </thead>
            <tbody>
              {visible.length === 0 ? (
                <tr><td colSpan={6} className="px-4 py-12 text-center text-[var(--color-slate)]">No funds match those filters.</td></tr>
              ) : visible.map((f) => (
                <tr key={f._id} className="border-t border-[var(--color-silver)]/30 hover:bg-[var(--color-parchment)]/40 align-top">
                  <td className="px-4 py-3 font-semibold text-[var(--color-navy)]">{f.fundName}</td>
                  <td className="px-4 py-3">
                    {f.category ? (
                      <span className="inline-block rounded-full bg-[var(--color-parchment)] px-2 py-0.5 text-xs font-semibold text-[var(--color-navy)]">Cat {f.category}</span>
                    ) : <span className="text-[var(--color-slate)]">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-[var(--color-slate)] tabular-nums whitespace-nowrap">{f.registrationNo ?? "—"}</td>
                  <td className="px-4 py-3 text-xs text-[var(--color-slate)] tabular-nums whitespace-nowrap">{f.registrationDate ? fmtAsOf(f.registrationDate) : "—"}</td>
                  <td className="px-4 py-3 text-[var(--color-slate)]">{f.manager ?? f.sponsor ?? "—"}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setEnquire(f.fundName)}
                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--color-navy)] px-3 py-1.5 text-xs font-semibold text-[var(--color-navy)] hover:bg-[var(--color-navy)] hover:text-[var(--color-cream)] transition-colors whitespace-nowrap"
                    >
                      <FileText size={13} /> Request factsheet
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filtered.length > limit && (
          <div className="mt-4 text-center">
            <button
              onClick={() => setLimit((n) => n + PAGE)}
              className="rounded-full border border-[var(--color-silver)]/60 px-5 py-2 text-sm font-semibold text-[var(--color-navy)] hover:border-[var(--color-gold)] transition-colors"
            >
              Show more ({(filtered.length - limit).toLocaleString("en-IN")} more)
            </button>
          </div>
        )}

        <p className="text-[11px] text-[var(--color-slate)] mt-4 italic leading-relaxed">
          Registry data from SEBI&apos;s public list of registered intermediaries. A SEBI
          registration is not an endorsement, rating, or recommendation. Performance for select
          funds is added as we receive AMC factsheets. AIF minimum commitment is ₹1 Cr (SEBI mandate).
        </p>
      </div>

      {enquire && (
        <EnquireModal strategy={enquire} source="aif-directory" title="Request factsheet" onClose={() => setEnquire(null)} />
      )}
    </section>
  );
}
