"use client";

import { useState } from "react";
import Link from "next/link";
import type { UnlistedCompany } from "@/lib/unlisted-companies";
import { fmtAsOf } from "@/lib/format";
import { EnquireModal } from "@/components/pms/EnquireModal";

/**
 * Company card for the unlisted-shares explorer. When Sanity supplies Mode-2
 * fields, the card reveals the indicative price pill, its as-on date, the
 * minimum lot, an "≈ ₹X min investment" (price × lot) and the depository —
 * all hidden while those fields are undefined, so the same card renders the
 * Mode-1 editorial fallback unchanged. Enquiries open the shared lead-capture
 * modal (source: "unlisted-page") with the company name prefilled.
 */
export function UnlistedCompanyCard({ company }: { company: UnlistedCompany }) {
  const [enquire, setEnquire] = useState(false);
  const hasPrice = typeof company.indicativePrice === "number";
  const minInvestment =
    hasPrice && company.lotSize ? company.indicativePrice! * company.lotSize : null;

  return (
    <div className="card-soft flex flex-col h-full">
      <div className="flex items-start justify-between gap-3">
        <h3 className="text-base font-semibold leading-snug">{company.name}</h3>
        <span className="shrink-0 text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full bg-[var(--color-gold)]/15 text-[var(--color-gold-dim)]">
          {company.sector}
        </span>
      </div>

      {/* Mode 2 — indicative price. Hidden entirely while no price is set. */}
      {hasPrice && (
        <>
          <div className="mt-3 flex flex-wrap items-baseline gap-2">
            <span className="text-lg font-semibold text-[var(--color-navy)] tabular-nums">
              ₹{company.indicativePrice!.toLocaleString("en-IN")}
            </span>
            <span className="text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[var(--color-navy)] text-[var(--color-cream)]">
              Indicative
            </span>
            {company.priceAsOf && (
              <span className="text-[11px] text-[var(--color-slate)]">as on {fmtAsOf(company.priceAsOf)}</span>
            )}
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-[var(--color-slate)]">
            {company.lotSize && (
              <span>
                Min lot{" "}
                <strong className="text-[var(--color-navy)] tabular-nums">
                  {company.lotSize.toLocaleString("en-IN")} shares
                </strong>
              </span>
            )}
            {minInvestment && (
              <span>
                Min investment{" "}
                <strong className="text-[var(--color-navy)] tabular-nums">
                  ≈ ₹{minInvestment.toLocaleString("en-IN")}
                </strong>
              </span>
            )}
            {company.depository && (
              <span className="rounded-full bg-[var(--color-parchment)] px-2 py-0.5 font-semibold text-[var(--color-navy)]">
                {company.depository}
              </span>
            )}
          </div>
        </>
      )}

      <p className="mt-3 text-sm text-[var(--color-slate)] leading-relaxed flex-1">{company.about}</p>

      {company.drhpFiled && (
        <span className="mt-3 inline-flex items-center gap-1.5 self-start text-[11px] font-semibold text-[var(--color-emerald)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-emerald)]" /> DRHP filed
        </span>
      )}

      <div className="mt-5 flex items-center gap-2">
        <button
          onClick={() => setEnquire(true)}
          className="btn-primary text-sm flex-1 justify-center"
        >
          Enquire
        </button>
        {/* TODO: link to /investment-products/unlisted-shares/[slug] once detail pages exist. */}
        <Link href="#" className="btn-outline text-sm px-3" aria-label={`Details for ${company.name}`}>
          Details
        </Link>
      </div>

      {enquire && (
        <EnquireModal strategy={company.name} source="unlisted-page" onClose={() => setEnquire(false)} />
      )}
    </div>
  );
}
