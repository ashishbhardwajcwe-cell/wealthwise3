import Link from "next/link";
import type { UnlistedCompany } from "@/lib/unlisted-companies";
import { siteConfig } from "@/lib/site-config";

/** ISO "YYYY-MM-DD" → "31 May 2026"; empty string when absent/unrecognised. */
function fmtAsOf(iso?: string): string {
  if (!iso) return "";
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  if (!m) return iso;
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  return `${Number(m[3])} ${months[Number(m[2]) - 1] ?? m[2]} ${m[1]}`;
}

/** Pre-filled WhatsApp enquiry for a specific company, built from siteConfig. */
function enquireHref(name: string): string {
  const msg = `Hi PlanMyCashflows, I'd like to know more about ${name} (unlisted / pre-IPO shares).`;
  return `https://wa.me/${siteConfig.whatsappNumber}?text=${encodeURIComponent(msg)}`;
}

/**
 * Company card for the unlisted-shares explorer. The `indicativePrice` /
 * `priceAsOf` fields are wired in but hidden while undefined — populating them
 * (Mode 2) reveals the "Indicative" price pill and as-on date with no rebuild.
 */
export function UnlistedCompanyCard({ company }: { company: UnlistedCompany }) {
  const hasPrice = typeof company.indicativePrice === "number";

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
      )}

      <p className="mt-3 text-sm text-[var(--color-slate)] leading-relaxed flex-1">{company.about}</p>

      {company.drhpFiled && (
        <span className="mt-3 inline-flex items-center gap-1.5 self-start text-[11px] font-semibold text-[var(--color-emerald)]">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--color-emerald)]" /> DRHP filed
        </span>
      )}

      <div className="mt-5 flex items-center gap-2">
        <a
          href={enquireHref(company.name)}
          target="_blank"
          rel="noreferrer"
          className="btn-primary text-sm flex-1 justify-center"
        >
          Enquire
        </a>
        {/* TODO: link to /investment-products/unlisted-shares/[slug] once detail pages exist. */}
        <Link href="#" className="btn-outline text-sm px-3" aria-label={`Details for ${company.name}`}>
          Details
        </Link>
      </div>
    </div>
  );
}
