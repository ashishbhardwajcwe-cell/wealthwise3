"use client";

import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { UnlistedCompany } from "@/lib/unlisted-companies";
import { fmtAsOf } from "@/lib/format";
import { CompanyLogo } from "@/components/CompanyLogo";
import { PriceChangeBadge } from "./PriceChangeBadge";

/**
 * Company card for the unlisted-shares explorer. Polished regardless of
 * whether a price is set: monogram, sector/DRHP badges, business summary and
 * enquiry CTA always render; the indicative-price panel (price, as-on, min
 * lot, min investment, depository) appears only once Sanity supplies Mode-2
 * fields. Enquiries bubble up to the explorer's shared modal via onEnquire.
 */
export function UnlistedCompanyCard({
  company,
  onEnquire,
}: {
  company: UnlistedCompany;
  onEnquire: (name: string) => void;
}) {
  const hasPrice = typeof company.indicativePrice === "number";
  const minInvestment = hasPrice && company.lotSize ? company.indicativePrice! * company.lotSize : null;

  return (
    <div className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-[var(--color-silver)]/40 bg-white transition-all duration-200 hover:-translate-y-0.5 hover:border-[var(--color-gold)] hover:shadow-[0_10px_30px_rgb(10_22_40/0.08)]">
      <div className="h-1 bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-gold-dim)]" />

      <div className="flex h-full flex-col p-5">
        {/* header */}
        <div className="flex items-start gap-3">
          <CompanyLogo
            name={company.name}
            logoUrl={company.logoUrl}
            logoClassName="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[var(--color-silver)]/50 bg-white p-1"
            monogramClassName="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--color-navy)] text-sm font-bold text-[var(--color-gold)]"
          />
          <div className="min-w-0 flex-1">
            <h3 className="text-[15px] font-semibold leading-snug text-[var(--color-navy)]">{company.name}</h3>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="rounded-full bg-[var(--color-gold)]/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--color-gold-dim)]">
                {company.sector}
              </span>
              {company.drhpFiled && (
                <span className="inline-flex items-center gap-1 rounded-full bg-[var(--color-emerald)]/12 px-2 py-0.5 text-[10px] font-semibold text-[var(--color-emerald)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-emerald)]" /> DRHP filed
                </span>
              )}
            </div>
          </div>
        </div>

        {/* indicative price panel — only when priced */}
        {hasPrice && (
          <div className="mt-4 rounded-xl bg-[var(--color-parchment)] p-3.5">
            <div className="flex items-end justify-between gap-2">
              <div>
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--color-slate)]">
                  Indicative price
                </div>
                <div className="flex items-baseline gap-2">
                  <div className="text-2xl font-bold leading-tight text-[var(--color-navy)] tabular-nums">
                    ₹{company.indicativePrice!.toLocaleString("en-IN")}
                  </div>
                  <PriceChangeBadge
                    current={company.indicativePrice}
                    previous={company.previousPrice}
                    asOf={company.priceAsOf}
                    previousAsOf={company.previousPriceAsOf}
                    className="text-xs"
                  />
                </div>
              </div>
              {company.priceAsOf && (
                <div className="text-right text-[10px] leading-tight text-[var(--color-slate)]">
                  as on
                  <br />
                  {fmtAsOf(company.priceAsOf)}
                </div>
              )}
            </div>

            {(company.lotSize || minInvestment) && (
              <div className="mt-3 grid grid-cols-2 gap-2 border-t border-[var(--color-silver)]/40 pt-3 text-[11px]">
                {company.lotSize && (
                  <div>
                    <div className="text-[var(--color-slate)]">Min lot</div>
                    <div className="font-semibold text-[var(--color-navy)] tabular-nums">
                      {company.lotSize.toLocaleString("en-IN")} shares
                    </div>
                  </div>
                )}
                {minInvestment && (
                  <div>
                    <div className="text-[var(--color-slate)]">Min investment</div>
                    <div className="font-semibold text-[var(--color-navy)] tabular-nums">
                      ≈ ₹{minInvestment.toLocaleString("en-IN")}
                    </div>
                  </div>
                )}
              </div>
            )}

            {company.depository && (
              <div className="mt-2.5 inline-flex items-center gap-1.5 text-[10px] font-semibold text-[var(--color-navy)]">
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--color-teal)]" /> {company.depository}
              </div>
            )}
          </div>
        )}

        {/* about */}
        <p className="mt-4 line-clamp-3 flex-1 text-[13px] leading-relaxed text-[var(--color-slate)]">
          {company.about}
        </p>

        {/* CTA */}
        <div className="mt-4 flex items-center gap-2">
          <button
            onClick={() => onEnquire(company.name)}
            className="btn-primary flex-1 justify-center text-sm"
          >
            Enquire
          </button>
          {/* TODO: link to /investment-products/unlisted-shares/[slug] once detail pages exist. */}
          <Link
            href="#"
            className="inline-flex items-center gap-1 rounded-lg border border-[var(--color-silver)]/60 px-3 py-2 text-sm font-semibold text-[var(--color-navy)] transition-colors hover:border-[var(--color-gold)]"
            aria-label={`Details for ${company.name}`}
          >
            Details <ArrowUpRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
