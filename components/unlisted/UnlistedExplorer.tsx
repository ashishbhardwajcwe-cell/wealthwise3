"use client";

import { useMemo, useState } from "react";
import { Search, X, LayoutGrid, List as ListIcon } from "lucide-react";
import { unlistedCompanies, unlistedSectors, type UnlistedCompany } from "@/lib/unlisted-companies";
import { UnlistedCompanyCard } from "./UnlistedCompanyCard";
import { UnlistedList } from "./UnlistedList";
import { EnquireModal } from "@/components/pms/EnquireModal";

/**
 * Explorer for the unlisted / pre-IPO companies. Two views over the same
 * filtered set — an attractive card grid and a sortable comparison list —
 * toggled by the user, plus search, a sector filter and a DRHP-only switch.
 * Data-array driven: `companies` comes from the live Sanity feed, falling
 * back to the Mode-1 editorial array. All enquiries open one shared modal
 * (source "unlisted-page") with the company name prefilled.
 */
type View = "cards" | "list";

export function UnlistedExplorer({ companies = unlistedCompanies }: { companies?: UnlistedCompany[] }) {
  const [sector, setSector] = useState("All");
  const [drhpOnly, setDrhpOnly] = useState(false);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("cards");
  const [enquire, setEnquire] = useState<string | null>(null);

  const sectors = useMemo(() => unlistedSectors(companies), [companies]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return companies.filter((c) => {
      if (sector !== "All" && c.sector !== sector) return false;
      if (drhpOnly && !c.drhpFiled) return false;
      if (q && !`${c.name} ${c.sector}`.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [companies, sector, drhpOnly, query]);

  const segBtn = (active: boolean) =>
    `inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold transition-colors ${
      active ? "bg-[var(--color-navy)] text-[var(--color-cream)]" : "bg-white text-[var(--color-slate)] hover:text-[var(--color-navy)]"
    }`;

  return (
    <div>
      {/* controls */}
      <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div className="flex flex-1 items-center gap-2 rounded-lg border border-[var(--color-silver)]/60 bg-white px-3 py-2.5">
          <Search className="h-4 w-4 shrink-0 text-[var(--color-slate)]" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search company or sector…"
            className="w-full bg-transparent text-sm text-[var(--color-navy)] outline-none"
          />
          {query && (
            <button onClick={() => setQuery("")} aria-label="Clear search">
              <X className="h-4 w-4 text-[var(--color-slate)]" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <label htmlFor="unlisted-sector" className="sr-only">Filter by sector</label>
          <select
            id="unlisted-sector"
            value={sector}
            onChange={(e) => setSector(e.target.value)}
            className="rounded-lg border border-[var(--color-silver)]/60 bg-white px-3 py-2.5 text-sm text-[var(--color-navy)] focus:border-[var(--color-gold)] focus:outline-none"
          >
            <option value="All">All sectors</option>
            {sectors.map((s) => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>

          <label className="inline-flex cursor-pointer select-none items-center gap-2.5 text-sm font-medium text-[var(--color-navy)]">
            <input
              type="checkbox"
              checked={drhpOnly}
              onChange={(e) => setDrhpOnly(e.target.checked)}
              className="peer sr-only"
            />
            <span className="relative h-5 w-9 rounded-full bg-[var(--color-silver)]/50 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition-transform after:content-[''] peer-checked:bg-[var(--color-navy)] peer-checked:after:translate-x-4 peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-gold)]" />
            DRHP filed
          </label>

          <div className="inline-flex overflow-hidden rounded-lg border border-[var(--color-silver)]/60">
            <button onClick={() => setView("cards")} className={segBtn(view === "cards")} aria-pressed={view === "cards"}>
              <LayoutGrid className="h-4 w-4" /> Cards
            </button>
            <button onClick={() => setView("list")} className={segBtn(view === "list")} aria-pressed={view === "list"}>
              <ListIcon className="h-4 w-4" /> List
            </button>
          </div>
        </div>
      </div>

      <div className="mb-4 text-xs text-[var(--color-slate)]">
        {filtered.length === companies.length
          ? `${filtered.length} ${filtered.length === 1 ? "company" : "companies"}`
          : `Showing ${filtered.length} of ${companies.length}`}
      </div>

      {filtered.length === 0 ? (
        <p className="py-10 text-center text-sm italic text-[var(--color-slate)]">
          No companies match these filters yet.
        </p>
      ) : view === "cards" ? (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((c) => (
            <UnlistedCompanyCard key={c.slug} company={c} onEnquire={setEnquire} />
          ))}
        </div>
      ) : (
        <UnlistedList companies={filtered} onEnquire={setEnquire} />
      )}

      {enquire && (
        <EnquireModal strategy={enquire} source="unlisted-page" onClose={() => setEnquire(null)} />
      )}
    </div>
  );
}
