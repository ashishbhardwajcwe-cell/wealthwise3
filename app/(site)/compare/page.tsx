import type { Metadata } from "next";
import Link from "next/link";
import { CompareExplorer } from "@/components/compare/CompareExplorer";
import { toBenchmark } from "@/components/pms/strategy-shared";
import { siteConfig } from "@/lib/site-config";
import { getLivePmsStrategies, getBenchmark, getPmsManagerLogos } from "@/lib/investment-data";

const TITLE = "Compare PMS Strategies Side by Side | PlanMyCashflows";
const DESCRIPTION =
  "Put up to three PMS strategies side by side — returns across every published window, and the alpha each one earned over the S&P BSE 500 TRI.";

/**
 * The page's own card, not the sitewide one.
 *
 * /compare produces shareable ?s=… URLs and the channel they travel on is
 * WhatsApp, which renders og:title/og:description and nothing else. Inheriting
 * the site defaults meant every forwarded comparison previewed as the generic
 * homepage card — the one thing guaranteed not to explain why the link was
 * sent.
 *
 * NOT done here: a per-comparison preview. A `generateMetadata({ searchParams })`
 * could read `s`, resolve the three slugs and name the strategies in the card
 * ("Marcellus vs ASK vs Motilal Oswal — compared"). It would mean dropping
 * `export const revalidate` for per-request rendering, so every visit costs a
 * Sanity fetch instead of hitting a 5-minute-cached static page — a trade worth
 * deciding on its own, not as a side effect of fixing the card.
 */
export const metadata: Metadata = {
  // AIF is deliberately absent: there is no AIF performance data behind this
  // page, and the old title promised a comparison it could not deliver.
  title: { absolute: TITLE },
  description: DESCRIPTION,
  alternates: { canonical: "/compare" },
  openGraph: {
    title: TITLE,
    description: DESCRIPTION,
    url: "https://planmycashflows.com/compare",
    type: "website",
    // Carried over from the root metadata: an openGraph block replaces the
    // inherited one wholesale rather than merging field by field. That
    // includes the file-based app/opengraph-image.tsx card, which silently
    // disappeared from this page's tags the first time this block existed —
    // a preview with no image at all is a worse WhatsApp card than the
    // generic one this was written to replace, so it is named explicitly.
    siteName: "PlanMyCashflows",
    locale: "en_IN",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: TITLE }],
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: TITLE }],
  },
};

export const revalidate = 300;

export default async function ComparePage() {
  const [strategies, benchmark, managerLogos] = await Promise.all([
    getLivePmsStrategies(),
    getBenchmark(86400),
    getPmsManagerLogos(),
  ]);

  return (
    <>
      <section className="gradient-hero aurora">
        <div className="container-wide py-16 md:py-20 text-center">
          <span className="eyebrow">Compare</span>
          <h1 className="mt-4 text-balance max-w-3xl mx-auto">Compare PMS strategies on what they beat</h1>
          <p className="mt-5 text-lg text-[var(--color-slate)] leading-relaxed max-w-2xl mx-auto text-balance">
            Put up to three side by side — returns across every published window, and the alpha each one earned over
            the S&amp;P BSE 500 TRI. Pick from the cards below.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container-wide">
          <CompareExplorer
            strategies={strategies}
            benchmark={toBenchmark(benchmark)}
            managerLogos={managerLogos}
          />

          <p className="text-xs text-[var(--color-slate)] italic text-center mt-8 max-w-3xl mx-auto">
            Strategy details shown are for information and education only and do not constitute a recommendation or
            an offer to invest. Past performance is not indicative of future returns. Investments in securities
            markets are subject to market risks; read all scheme-related documents carefully before investing.
          </p>

          <div className="mt-12 max-w-3xl mx-auto card-soft text-center">
            <p className="text-sm md:text-base text-[var(--color-slate)] leading-relaxed">
              Not sure where to start? Learn the basics of{" "}
              <Link href="/investment-products/pms" className="font-semibold text-[var(--color-gold-dim)]">
                PMS
              </Link>{" "}
              and{" "}
              <Link href="/investment-products/aif" className="font-semibold text-[var(--color-gold-dim)]">
                AIF
              </Link>
              , or talk it through with our team.
            </p>
            <a href={siteConfig.topmateUrl} target="_blank" rel="noreferrer" className="btn-primary mt-5 inline-flex">
              Book a Call
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
