"use client";

import { useMemo, useState } from "react";
import { unlistedCompanies, unlistedSectors, type UnlistedCompany } from "@/lib/unlisted-companies";
import { UnlistedCompanyCard } from "./UnlistedCompanyCard";

/**
 * Filterable grid of unlisted / pre-IPO companies. Data-array driven (Mode 1);
 * the `companies` prop can later be fed from a Sanity `unlistedCompany` query
 * without touching this component.
 */
export function UnlistedExplorer({ companies = unlistedCompanies }: { companies?: UnlistedCompany[] }) {
  const [sector, setSector] = useState("All");
  const [drhpOnly, setDrhpOnly] = useState(false);

  const sectors = useMemo(() => unlistedSectors(companies), [companies]);

  const filtered = useMemo(
    () =>
      companies.filter((c) => {
        if (sector !== "All" && c.sector !== sector) return false;
        if (drhpOnly && !c.drhpFiled) return false;
        return true;
      }),
    [companies, sector, drhpOnly],
  );

  return (
    <div>
      {/* Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
        <div>
          <label htmlFor="unlisted-sector" className="sr-only">Filter by sector</label>
          <select
            id="unlisted-sector"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="w-full sm:w-64 px-3 py-2.5 bg-white border border-[var(--color-silver)]/60 rounded-lg text-sm focus:outline-none focus:border-[var(--color-gold)]"
          >
            <option value="All">All sectors</option>
            {sectors.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        <label className="inline-flex items-center gap-2.5 cursor-pointer select-none text-sm font-medium text-[var(--color-navy)]">
          <input
            type="checkbox"
            checked={drhpOnly}
            onChange={(e) => setDrhpOnly(e.target.checked)}
            className="peer sr-only"
          />
          <span className="relative w-9 h-5 rounded-full bg-[var(--color-silver)]/50 transition-colors peer-checked:bg-[var(--color-navy)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-gold)] after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:w-4 after:h-4 after:rounded-full after:bg-white after:transition-transform peer-checked:after:translate-x-4" />
          DRHP filed only
        </label>

        <span className="text-xs text-[var(--color-slate)] sm:ml-auto">
          {filtered.length} {filtered.length === 1 ? "company" : "companies"}
        </span>
      </div>

      {filtered.length === 0 ? (
        <p className="text-sm text-[var(--color-slate)] italic py-10 text-center">
          No companies match these filters yet.
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {filtered.map((c) => (
            <UnlistedCompanyCard key={c.slug} company={c} />
          ))}
        </div>
      )}
    </div>
  );
}
