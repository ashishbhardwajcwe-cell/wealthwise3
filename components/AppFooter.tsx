import Link from "next/link";
import Image from "next/image";
import { siteConfig } from "@/lib/site-config";
import { SocialLinks } from "@/components/SocialLinks";

/**
 * Slim footer for the planner (/app). App screens get a compact footer —
 * brand, socials, key legal links and a one-line disclaimer — rather than
 * the full marketing sitemap, which looks heavy bolted under a data-entry
 * tool. Marketing pages still use the full <Footer />.
 */
export function AppFooter() {
  return (
    <footer className="bg-[var(--color-navy)] text-[var(--color-cream)] mt-auto">
      <div className="container-wide py-10">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div className="flex items-center gap-3">
            <Image src="/pmc-logo.png" alt="PlanMyCashflows" width={36} height={36} className="rounded-md" />
            <div>
              <div className="text-base font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                PlanMy<span className="text-[var(--color-gold)]">Cashflows</span>
              </div>
              <p className="text-xs text-[var(--color-silver)]">Wealth that compounds. Plans that hold.</p>
            </div>
          </div>
          <SocialLinks size={36} />
        </div>

        <div className="mt-8 pt-6 border-t border-white/10 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div className="flex flex-wrap gap-x-5 gap-y-2 text-xs text-[var(--color-silver)]">
            <Link href="/pricing" className="hover:text-white">Pricing</Link>
            <Link href="/legal/privacy" className="hover:text-white">Privacy</Link>
            <Link href="/legal/terms" className="hover:text-white">Terms</Link>
            <Link href="/legal/disclaimers" className="hover:text-white">Disclaimers</Link>
            <Link href="/legal/sebi-compliance" className="hover:text-white">SEBI Compliance</Link>
            <a href={`mailto:${siteConfig.email}`} className="hover:text-white">{siteConfig.email}</a>
          </div>
          <p className="text-xs text-[var(--color-silver)]/80 shrink-0">
            © {new Date().getFullYear()} {siteConfig.name}. All rights reserved.
          </p>
        </div>

        <p className="mt-4 text-[11px] leading-relaxed text-[var(--color-silver)]/70">
          Educational tool only — not investment advice. Investments are subject to market risks; past performance is not
          indicative of future returns. Consult a SEBI-registered investment adviser, a chartered accountant, and a tax
          professional before acting on anything you see here.
        </p>
      </div>
    </footer>
  );
}
