import Link from "next/link";
import Image from "next/image";
import { siteConfig, audiences, calculators, moreNavProducts } from "@/lib/site-config";
import { NewsletterSignup } from "@/components/NewsletterSignup";
import { SocialLinks } from "@/components/SocialLinks";

// The For column drops the software-professionals page (still reachable)
// to match the four core audiences.
const footerAudiences = audiences.filter((a) => a.slug !== "software-professionals");

export function Footer() {
  return (
    <footer className="bg-[var(--color-navy)] text-[var(--color-cream)]">
      <div className="container-wide py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          <div className="col-span-2">
            <div className="flex items-center gap-3 mb-3">
              <Image
                src="/pmc-logo.png"
                alt="PlanMyCashflows"
                width={44}
                height={44}
                className="rounded-md"
              />
              <div className="text-xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                PlanMy<span className="text-[var(--color-gold)]">Cashflows</span>
              </div>
            </div>
            <p className="text-sm text-[var(--color-silver)] max-w-xs mb-6">
              Discover, compare and understand PMS &amp; AIF, the education-first way.
            </p>
            <NewsletterSignup />
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[var(--color-gold-light)] mb-4">Products</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/investment-products/pms" className="text-[var(--color-silver)] hover:text-white">PMS</Link></li>
              {/* The A–Z directory: the site-wide entry point to every
                  individual strategy page, from every page's footer. */}
              <li><Link href="/pms/all" className="text-[var(--color-silver)] hover:text-white">All PMS Strategies A–Z</Link></li>
              <li><Link href="/investment-products/aif" className="text-[var(--color-silver)] hover:text-white">AIF</Link></li>
              <li><Link href="/investment-products/mutual-funds" className="text-[var(--color-silver)] hover:text-white">Mutual Funds</Link></li>
              <li><Link href="/compare" className="text-[var(--color-silver)] hover:text-white">Compare</Link></li>
              <li><Link href="/#how-it-works" className="text-[var(--color-silver)] hover:text-white">How It Works</Link></li>
            </ul>
            <h4 className="text-xs font-semibold text-[var(--color-gold-light)]/80 mt-5 mb-3 uppercase tracking-wider">More products</h4>
            <ul className="space-y-2 text-sm">
              {moreNavProducts.map((p) => (
                <li key={p.slug}>
                  <Link href={`/investment-products/${p.slug}`} className="text-[var(--color-silver)] hover:text-white">
                    {p.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[var(--color-gold-light)] mb-4">For</h4>
            <ul className="space-y-2 text-sm">
              {footerAudiences.map((a) => (
                <li key={a.slug}>
                  <Link href={`/for/${a.slug}`} className="text-[var(--color-silver)] hover:text-white">
                    {a.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[var(--color-gold-light)] mb-4">Resources</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/blog" className="text-[var(--color-silver)] hover:text-white">Education Hub</Link></li>
              <li><Link href="/resources/calculators" className="text-[var(--color-silver)] hover:text-white">Calculators</Link></li>
              <li><Link href="/resources/glossary" className="text-[var(--color-silver)] hover:text-white">Glossary</Link></li>
              <li><Link href="/resources/downloads" className="text-[var(--color-silver)] hover:text-white">Free PDFs</Link></li>
              <li><Link href="/blog" className="text-[var(--color-silver)] hover:text-white">Blog</Link></li>
              <li><Link href="/plan" className="text-[var(--color-silver)] hover:text-white">Wealth Planner</Link></li>
              <li><Link href="/ai-wealth-planner" className="text-[var(--color-silver)] hover:text-white">AI Snapshot</Link></li>
              <li><Link href="/guided" className="text-[var(--color-silver)] hover:text-white">Guided Plan</Link></li>
            </ul>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mt-12 pt-12 border-t border-white/10">
          <div>
            <h4 className="text-sm font-semibold text-[var(--color-gold-light)] mb-4">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/about" className="text-[var(--color-silver)] hover:text-white">About</Link></li>
              <li><Link href="/contact" className="text-[var(--color-silver)] hover:text-white">Contact</Link></li>
              <li><Link href="/financial-planning" className="text-[var(--color-silver)] hover:text-white">Financial Planning</Link></li>
              <li><Link href="/pricing" className="text-[var(--color-silver)] hover:text-white">Pricing</Link></li>
              <li><Link href="/wealthwise" className="text-[var(--color-silver)] hover:text-white">CashFlow Planner App</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[var(--color-gold-light)] mb-4">Legal</h4>
            <ul className="space-y-2 text-sm">
              <li><Link href="/legal/privacy" className="text-[var(--color-silver)] hover:text-white">Privacy</Link></li>
              <li><Link href="/legal/terms" className="text-[var(--color-silver)] hover:text-white">Terms</Link></li>
              <li><Link href="/legal/disclaimers" className="text-[var(--color-silver)] hover:text-white">Disclaimers</Link></li>
              <li><Link href="/legal/sebi-compliance" className="text-[var(--color-silver)] hover:text-white">SEBI Compliance</Link></li>
              <li><Link href="/legal/grievance-redressal" className="text-[var(--color-silver)] hover:text-white">Grievance Redressal</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[var(--color-gold-light)] mb-4">Calculators</h4>
            <ul className="space-y-2 text-sm">
              {calculators.slice(0, 5).map((c) => (
                <li key={c.slug}>
                  <Link href={`/resources/calculators/${c.slug}`} className="text-[var(--color-silver)] hover:text-white">
                    {c.name}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[var(--color-gold-light)] mb-4">Connect</h4>
            <div className="mb-4">
              <SocialLinks size={40} />
            </div>
            <a href={`mailto:${siteConfig.email}`} className="text-sm text-[var(--color-silver)] hover:text-white">{siteConfig.email}</a>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 text-xs text-[var(--color-silver)]/80 space-y-3">
          <p className="max-w-4xl">
            <strong>Disclaimer:</strong> The information, tools, comparisons and content on this website are provided solely for informational and
            educational purposes and do not constitute investment advice, a recommendation, or a solicitation or offer to buy or sell any security
            or investment product. PlanMyCashflows is an information and distribution platform that facilitates access to third-party Portfolio
            Management Services (PMS) and Alternative Investment Funds (AIF) managed by their respective SEBI-registered managers. PlanMyCashflows
            is not a SEBI-registered investment adviser and does not provide personalised investment advice.
          </p>
          <p className="max-w-4xl">
            Investments in securities markets are subject to market risks. Read all scheme-related and offer documents carefully before investing.
            Past performance is not indicative of future returns and is not a guarantee of future results. PMS and AIF products involve higher
            minimum investments, higher risk, and lower liquidity than traditional products, and may not be suitable for all investors. Please
            consult your own financial, legal and tax advisers before making any investment decision.
          </p>
          <p>© {new Date().getFullYear()} PlanMyCashflows. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
