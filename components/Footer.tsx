import Link from "next/link";
import Image from "next/image";
import { siteConfig, investmentProducts, audiences, calculators } from "@/lib/site-config";
import { NewsletterSignup } from "@/components/NewsletterSignup";

export function Footer() {
  return (
    <footer className="bg-[var(--color-navy)] text-[var(--color-cream)]">
      <div className="container-wide py-16">
        <div className="grid grid-cols-2 md:grid-cols-5 gap-10">
          <div className="col-span-2">
            <div className="flex items-center gap-3 mb-3">
              <Image
                src="/auris-logo.png"
                alt="Auris Wealth"
                width={44}
                height={44}
                className="rounded-md"
              />
              <div className="text-xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                Auris<span className="text-[var(--color-gold)]">Wealth</span>
              </div>
            </div>
            <p className="text-sm text-[var(--color-silver)] max-w-xs mb-6">
              Wealth that compounds. Plans that hold under fire.
            </p>
            <NewsletterSignup />
          </div>

          <div>
            <h4 className="text-sm font-semibold text-[var(--color-gold-light)] mb-4">Products</h4>
            <ul className="space-y-2 text-sm">
              {investmentProducts.slice(0, 6).map((p) => (
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
              {audiences.map((a) => (
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
              <li><Link href="/resources/calculators" className="text-[var(--color-silver)] hover:text-white">Calculators</Link></li>
              <li><Link href="/resources/glossary" className="text-[var(--color-silver)] hover:text-white">Glossary</Link></li>
              <li><Link href="/resources/downloads" className="text-[var(--color-silver)] hover:text-white">Free PDFs</Link></li>
              <li><Link href="/blog" className="text-[var(--color-silver)] hover:text-white">Blog</Link></li>
              <li><Link href="/ai-wealth-planner" className="text-[var(--color-silver)] hover:text-white">AI Planner</Link></li>
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
              <li><Link href="/pricing" className="text-[var(--color-silver)] hover:text-white">Pricing</Link></li>
              <li><Link href="/wealthwise" className="text-[var(--color-silver)] hover:text-white">WealthWise App</Link></li>
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
            <ul className="space-y-2 text-sm">
              <li><a href={siteConfig.social.linkedin} target="_blank" rel="noreferrer" className="text-[var(--color-silver)] hover:text-white">LinkedIn</a></li>
              <li><a href={siteConfig.social.youtube} target="_blank" rel="noreferrer" className="text-[var(--color-silver)] hover:text-white">YouTube</a></li>
              <li><a href={siteConfig.social.twitter} target="_blank" rel="noreferrer" className="text-[var(--color-silver)] hover:text-white">Twitter</a></li>
              <li><a href={siteConfig.social.instagram} target="_blank" rel="noreferrer" className="text-[var(--color-silver)] hover:text-white">Instagram</a></li>
              <li>
                <a href={siteConfig.whatsappUrl} target="_blank" rel="noreferrer" className="text-[var(--color-silver)] hover:text-white inline-flex items-center gap-1.5">
                  <span aria-hidden>💬</span> WhatsApp
                </a>
              </li>
              <li><a href={`mailto:${siteConfig.email}`} className="text-[var(--color-silver)] hover:text-white">{siteConfig.email}</a></li>
            </ul>
          </div>
        </div>

        <div className="mt-12 pt-8 border-t border-white/10 text-xs text-[var(--color-silver)]/80 space-y-2">
          <p>
            © {new Date().getFullYear()} {siteConfig.legalName} · CIN: {siteConfig.cin}
          </p>
          <p>
            NISM-certified · DPDP compliant · AMFI Registration: pending · SEBI RIA Registration: pending
          </p>
          <p className="max-w-4xl">
            The content on this site is for educational purposes only and does not constitute investment, legal, or tax advice. Investments in
            securities and other instruments are subject to market risks. Past performance is not indicative of future returns. Please consult a
            SEBI-registered investment adviser, a chartered accountant, and a tax professional in your jurisdiction before making investment decisions.
          </p>
        </div>
      </div>
    </footer>
  );
}
