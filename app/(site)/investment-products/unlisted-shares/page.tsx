import type { Metadata } from "next";
import Link from "next/link";
import { Search, MessageSquare, Handshake, ShieldAlert } from "lucide-react";
import { InvestmentProductPage } from "@/components/InvestmentProductPage";
import { unlistedSharesData } from "@/lib/product-data";
import { UnlistedSharesGraph } from "@/components/ProductGraphs";
import { UnlistedExplorer } from "@/components/unlisted/UnlistedExplorer";
import { getUnlistedShares } from "@/lib/investment-data";
import { slugifyHeading } from "@/lib/slugify";
import { fmtAsOf } from "@/lib/format";
import { unlistedCompanies, type UnlistedCompany } from "@/lib/unlisted-companies";

export const metadata: Metadata = {
  title: "Unlisted Shares & Pre-IPO Investing in India — Live Indicative Prices",
  description:
    "Explore unlisted and pre-IPO shares in India with live indicative prices, minimum lot sizes and depository details — plus tax treatment (LTCG 24mo), liquidity and valuation-risk guidance.",
};

const STEPS = [
  {
    icon: Search,
    title: "Research",
    body: "Browse researched company data on unlisted, pre-IPO and ESOP shares. Read the business, sector and status before you decide anything.",
  },
  {
    icon: MessageSquare,
    title: "Enquire",
    body: "Tell us which company interests you. We share what we know and answer your questions — no obligation, no pressure to transact.",
  },
  {
    icon: Handshake,
    title: "We connect & guide",
    body: "When you're ready, we help connect buyers and sellers and guide you through KYC, paperwork and settlement.",
  },
];

export const revalidate = 3600;

export default async function Page() {
  // Mode 2 — live Sanity feed (indicative prices from the daily list, layered
  // on the curated editorial content). The query already filters
  // needsReview / inactive docs. We only switch off the Mode-1 fallback once
  // at least one document actually carries a price, so the page never regresses
  // to a priceless live feed.
  const shares = await getUnlistedShares();
  const priced = shares.filter((s) => typeof s.indicativePriceINR === "number");
  const useLive = priced.length > 0;

  const live: UnlistedCompany[] = shares.map((s) => ({
    name: s.company,
    slug: s.slug ?? slugifyHeading(s.company),
    sector: s.sector ?? "Other",
    about: s.summary ?? "",
    drhpFiled: s.ipoStatus === "drhp-filed",
    indicativePrice: s.indicativePriceINR,
    priceAsOf: s.asOfDate,
    lotSize: s.lotSize,
    depository: s.depository,
  }));

  // Header summary. Counts reflect whichever dataset actually renders; the
  // "prices as on" clause shows only when live prices exist.
  const companyCount = useLive ? live.length : unlistedCompanies.length;
  const latestAsOf =
    priced.map((s) => s.asOfDate).filter(Boolean).sort().at(-1) ?? null;

  // The live explorer — rendered as InvestmentProductPage's liveSection so it
  // sits right after the hero, before the educational guide (visitors reach
  // the actual company data without scrolling past the long article).
  const exploreSection = (
    <section className="py-16 bg-white border-t border-[var(--color-silver)]/30">
      <div className="container-wide">
        <div className="max-w-3xl mb-10">
          <span className="eyebrow">Unlisted &amp; Pre-IPO Shares</span>
          <h2 className="mt-3">Explore Unlisted &amp; Pre-IPO Shares</h2>
          <p className="mt-4 text-[var(--color-slate)] leading-relaxed">
            Researched company data on unlisted, pre-IPO and ESOP shares — for information and education only, not
            an offer to deal. When you&apos;re ready, we help connect buyers and sellers.
          </p>
          <p className="mt-4 text-sm font-semibold text-[var(--color-navy)]">
            {companyCount} {companyCount === 1 ? "company" : "companies"}
            {latestAsOf && (
              <span className="font-medium text-[var(--color-slate)]"> · prices as on {fmtAsOf(latestAsOf)}</span>
            )}
          </p>
        </div>

        <UnlistedExplorer companies={useLive ? live : undefined} />
      </div>
    </section>
  );

  return (
    <>
      {/* Sticky compliance ribbon — this page only. Sits just below the h-16 header. */}
      <div className="sticky top-16 z-40 bg-[var(--color-navy)] text-[var(--color-cream)]">
        <div className="container-wide py-2 text-center text-[11px] sm:text-xs leading-snug">
          An information platform for unlisted &amp; pre-IPO shares · Not a SEBI-recognised stock exchange or
          trading platform · All prices are indicative
        </div>
      </div>

      {/* Hero + the live explorer (liveSection) + the educational guide. */}
      <InvestmentProductPage
        data={{ ...unlistedSharesData, graphic: <UnlistedSharesGraph /> }}
        liveSection={exploreSection}
      />

      {/* How it works */}
      <section className="py-16 bg-[var(--color-parchment)]">
        <div className="container-wide">
          <div className="max-w-3xl mb-10">
            <span className="eyebrow">How it works</span>
            <h2 className="mt-3">A guided process — not a self-serve exchange</h2>
          </div>

          <ol className="grid md:grid-cols-3 gap-5">
            {STEPS.map((step, i) => (
              <li key={step.title} className="card-soft flex flex-col">
                <div className="flex items-center gap-3 mb-3">
                  <span className="w-9 h-9 rounded-lg bg-[var(--color-navy)] text-[var(--color-gold)] flex items-center justify-center shrink-0">
                    <step.icon className="w-5 h-5" aria-hidden />
                  </span>
                  <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--color-slate)]">
                    Step {i + 1}
                  </span>
                </div>
                <h3 className="text-base font-semibold mb-1.5">{step.title}</h3>
                <p className="text-sm text-[var(--color-slate)] leading-relaxed">{step.body}</p>
              </li>
            ))}
          </ol>

          <p className="mt-6 text-sm font-medium text-[var(--color-navy)] leading-relaxed">
            Shares settle directly to your own demat account; we never route shares through third-party accounts.
          </p>
        </div>
      </section>

      {/* Official bank accounts — impersonation warning */}
      <section className="py-10">
        <div className="container-narrow">
          <div className="card-soft border-l-4 border-[var(--color-amber)] flex gap-3 items-start">
            <ShieldAlert className="w-5 h-5 text-[var(--color-amber)] shrink-0 mt-0.5" aria-hidden />
            <div>
              <h3 className="text-base font-semibold mb-1.5">Beware of impersonation</h3>
              <p className="text-sm text-[var(--color-slate)] leading-relaxed">
                We will only ever request payment to our official bank accounts. Never transfer money to a personal
                account, UPI ID or wallet, or act on payment details shared over a call or chat alone — verify them
                against our published list first.{" "}
                {/* TODO: create /official-accounts and point this link at it. */}
                <Link href="#" className="font-semibold text-[var(--color-gold-dim)] whitespace-nowrap">
                  View our official bank accounts →
                </Link>
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
