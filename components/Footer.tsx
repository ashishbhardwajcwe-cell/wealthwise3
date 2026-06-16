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
            <div className="flex flex-wrap gap-3 mb-4">
              {/* YouTube */}
              <a href={siteConfig.social.youtube} target="_blank" rel="noreferrer" aria-label="YouTube"
                className="w-10 h-10 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
                style={{ backgroundColor: "#FF0000" }}>
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" aria-hidden>
                  <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                </svg>
              </a>
              {/* X / Twitter */}
              <a href={siteConfig.social.twitter} target="_blank" rel="noreferrer" aria-label="X (Twitter)"
                className="w-10 h-10 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
                style={{ backgroundColor: "#000000" }}>
                <svg viewBox="0 0 24 24" className="w-4 h-4 fill-white" aria-hidden>
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                </svg>
              </a>
              {/* Instagram */}
              <a href={siteConfig.social.instagram} target="_blank" rel="noreferrer" aria-label="Instagram"
                className="w-10 h-10 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
                style={{ background: "radial-gradient(circle at 30% 107%, #fdf497 0%, #fdf497 5%, #fd5949 45%, #d6249f 60%, #285AEB 90%)" }}>
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" aria-hidden>
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z"/>
                </svg>
              </a>
              {/* Facebook */}
              <a href={siteConfig.social.facebook} target="_blank" rel="noreferrer" aria-label="Facebook"
                className="w-10 h-10 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
                style={{ backgroundColor: "#1877F2" }}>
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" aria-hidden>
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                </svg>
              </a>
              {/* WhatsApp */}
              <a href={siteConfig.whatsappUrl} target="_blank" rel="noreferrer" aria-label="WhatsApp"
                className="w-10 h-10 rounded-full flex items-center justify-center transition-opacity hover:opacity-80"
                style={{ backgroundColor: "#25D366" }}>
                <svg viewBox="0 0 24 24" className="w-5 h-5 fill-white" aria-hidden>
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
                </svg>
              </a>
            </div>
            <a href={`mailto:${siteConfig.email}`} className="text-sm text-[var(--color-silver)] hover:text-white">{siteConfig.email}</a>
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
