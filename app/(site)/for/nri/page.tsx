import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, FileCheck2, Globe2, Landmark, ShieldAlert, Wallet } from "lucide-react";
import { Hero } from "@/components/Hero";
import { CTASection } from "@/components/CTASection";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "PMS & AIF for NRIs — Invest in India from Abroad",
  description:
    "How NRIs invest in PMS and AIF in India: NRE vs NRO accounts, PIS/demat setup, ₹50 lakh and ₹1 crore minimums, DTAA with TRC/Form 10F, FATCA notes for US/Canada, repatriation and step-by-step onboarding.",
};

export default function NriPage() {
  return (
    <>
      <Hero
        eyebrow="For NRIs & Global Indians"
        title="PMS & AIF for NRIs — invest in India's growth, compliantly."
        subtitle="Portfolio Management Services and Alternative Investment Funds are open to NRIs — with the right accounts, the right paperwork and a process that is largely digital. Here is how it works, in plain English."
        primaryCta={{ label: "Book a Call", href: siteConfig.topmateUrl }}
        secondaryCta={{ label: "Explore PMS", href: "/investment-products/pms" }}
      />

      {/* NRE vs NRO */}
      <section className="py-20 md:py-28">
        <div className="container-wide">
          <div className="max-w-3xl mx-auto text-center mb-12 reveal">
            <span className="eyebrow">Step zero</span>
            <h2 className="mt-3 text-balance">NRE or NRO — where does the money come from?</h2>
            <p className="mt-4 text-lg text-[var(--color-slate)] leading-relaxed">
              NRIs invest in PMS and AIF through their NRE or NRO accounts, subject to KYC and FEMA compliance.
              The choice determines how freely your money can move back out.
            </p>
          </div>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto reveal">
            <div className="glass-card">
              <div className="w-10 h-10 rounded-lg bg-[var(--color-navy)] text-[var(--color-gold)] flex items-center justify-center mb-4">
                <Globe2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold mb-2">NRE — fully repatriable</h3>
              <p className="text-sm text-[var(--color-slate)] leading-relaxed">
                Funds in a Non-Resident External account came from abroad, and both principal and gains can be
                repatriated freely. Investing from NRE keeps the door fully open for money to return to your country
                of residence.
              </p>
            </div>
            <div className="glass-card">
              <div className="w-10 h-10 rounded-lg bg-[var(--color-sand)]/70 text-[var(--color-gold-dim)] flex items-center justify-center mb-4">
                <Wallet className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold mb-2">NRO — capped repatriation</h3>
              <p className="text-sm text-[var(--color-slate)] leading-relaxed">
                A Non-Resident Ordinary account holds India-source income (rent, dividends, sale proceeds).
                Repatriation is capped at USD 1 million per financial year, with a chartered accountant&apos;s
                certificate (Form 15CA/15CB) for the transfer.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Minimums + PIS/demat */}
      <section className="bg-[var(--color-parchment)]">
        <div className="container-wide py-20 md:py-28">
          <div className="max-w-3xl mx-auto text-center mb-12 reveal">
            <span className="eyebrow">The entry requirements</span>
            <h2 className="mt-3 text-balance">Minimums and accounts you&apos;ll need</h2>
          </div>
          <div className="grid sm:grid-cols-3 gap-5 max-w-4xl mx-auto reveal">
            <div className="card-soft text-center">
              <div className="text-2xl font-semibold text-[var(--color-navy)]" style={{ fontFamily: "var(--font-display)" }}>₹50 lakh</div>
              <p className="text-sm text-[var(--color-slate)] mt-2 leading-relaxed">
                SEBI-mandated minimum investment for a <strong>PMS</strong>, per portfolio manager.
              </p>
            </div>
            <div className="card-soft text-center">
              <div className="text-2xl font-semibold text-[var(--color-navy)]" style={{ fontFamily: "var(--font-display)" }}>₹1 crore</div>
              <p className="text-sm text-[var(--color-slate)] mt-2 leading-relaxed">
                SEBI-mandated minimum for an <strong>AIF</strong> (₹25 lakh for a fund&apos;s own employees/directors).
              </p>
            </div>
            <div className="card-soft text-center">
              <div className="text-2xl font-semibold text-[var(--color-navy)]" style={{ fontFamily: "var(--font-display)" }}>PIS + demat</div>
              <p className="text-sm text-[var(--color-slate)] mt-2 leading-relaxed">
                Equity-based <strong>PMS</strong> typically requires an NRI demat and bank setup (PIS route where
                applicable); AIFs are pooled and usually need no demat.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Tax: DTAA, TRC, FATCA */}
      <section className="py-20 md:py-28">
        <div className="container-wide">
          <div className="max-w-3xl mx-auto text-center mb-12 reveal">
            <span className="eyebrow">Tax, treaties and paperwork</span>
            <h2 className="mt-3 text-balance">DTAA, TRC and the FATCA question</h2>
          </div>
          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto reveal">
            <div className="glass-card">
              <div className="w-10 h-10 rounded-lg bg-[var(--color-navy)] text-[var(--color-gold)] flex items-center justify-center mb-4">
                <Landmark className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold mb-2">DTAA relief</h3>
              <p className="text-sm text-[var(--color-slate)] leading-relaxed">
                India&apos;s Double Taxation Avoidance Agreements can reduce the tax you pay on Indian income and
                gains, depending on your country of residence. Category I and II AIFs are generally tax
                pass-through; PMS gains are taxed in your hands like direct holdings.
              </p>
            </div>
            <div className="glass-card">
              <div className="w-10 h-10 rounded-lg bg-[var(--color-sand)]/70 text-[var(--color-gold-dim)] flex items-center justify-center mb-4">
                <FileCheck2 className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold mb-2">TRC + Form 10F</h3>
              <p className="text-sm text-[var(--color-slate)] leading-relaxed">
                To claim DTAA benefits you submit a Tax Residency Certificate from your country of residence along
                with Form 10F. Without them, tax is deducted at the standard (higher) domestic rates.
              </p>
            </div>
            <div className="glass-card">
              <div className="w-10 h-10 rounded-lg bg-[var(--color-navy)] text-[var(--color-gold)] flex items-center justify-center mb-4">
                <ShieldAlert className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-semibold mb-2">US / Canada (FATCA)</h3>
              <p className="text-sm text-[var(--color-slate)] leading-relaxed">
                Some managers have additional compliance requirements for US and Canada-based NRIs under FATCA, and
                a few don&apos;t onboard them at all. We help you shortlist managers that do — before you start the
                paperwork.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Repatriation */}
      <section className="bg-[var(--color-parchment)]">
        <div className="container-wide py-20 md:py-28">
          <div className="max-w-3xl mx-auto text-center reveal">
            <span className="eyebrow">Getting money home</span>
            <h2 className="mt-3 text-balance">Repatriation, in one paragraph</h2>
            <p className="mt-5 text-lg text-[var(--color-slate)] leading-relaxed">
              Investments made from an NRE account are fully repatriable — principal and gains. Investments made
              from an NRO account can be repatriated up to USD 1 million per financial year with a CA certificate.
              Plan the account you invest from around whether — and when — you want the money back abroad.
            </p>
          </div>
        </div>
      </section>

      {/* Step-by-step onboarding */}
      <section className="py-20 md:py-28">
        <div className="container-wide">
          <div className="max-w-3xl mx-auto text-center mb-12 reveal">
            <span className="eyebrow">The process</span>
            <h2 className="mt-3 text-balance">Onboarding, step by step</h2>
            <p className="mt-4 text-lg text-[var(--color-slate)] leading-relaxed">
              The process is largely digital and typically takes a couple of weeks end-to-end.
            </p>
          </div>
          <ol className="max-w-2xl mx-auto space-y-4 reveal">
            {[
              ["Shortlist strategies", "Discover and compare PMS and AIF strategies that accept NRIs from your country of residence — we help you filter."],
              ["KYC as an NRI", "Complete NRI KYC with passport, visa/residence proof, overseas address and PAN. FEMA declarations are part of the pack."],
              ["Set up accounts", "Open or link your NRE/NRO bank account; for equity PMS, add the NRI demat (and PIS approval where applicable)."],
              ["Sign and fund", "Execute the manager's agreement or fund documents digitally, then remit the corpus from the chosen account."],
              ["Claim treaty benefits", "Submit your TRC and Form 10F so DTAA rates apply, and set the repatriation path that matches your plans."],
            ].map(([title, copy], i) => (
              <li key={title} className="flex items-start gap-4 bg-white rounded-xl border border-[var(--color-silver)]/40 p-5">
                <span className="w-8 h-8 rounded-full bg-[var(--color-navy)] text-[var(--color-gold)] flex items-center justify-center shrink-0 text-sm font-semibold">
                  {i + 1}
                </span>
                <div>
                  <h3 className="text-base font-semibold">{title}</h3>
                  <p className="text-sm text-[var(--color-slate)] mt-1 leading-relaxed">{copy}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="text-center mt-10 reveal">
            <Link href="/investment-products/pms" className="inline-flex items-center gap-2 font-semibold text-[var(--color-gold-dim)]">
              Start with the PMS guide <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <p className="text-xs text-[var(--color-slate)] italic text-center mt-10 max-w-3xl mx-auto">
            This page is for information and education only and does not constitute investment, legal or tax advice.
            PMS and AIF are subject to market risks; minimums, eligibility and tax treatment vary by product,
            manager and your country of residence. Consult your own tax and legal advisers before investing.
          </p>
        </div>
      </section>

      <CTASection
        title="Ready to explore PMS & AIF from abroad?"
        subtitle="Book a no-obligation call — we'll map the NRE/NRO, KYC and treaty steps to your situation and shortlist managers that onboard NRIs from your country."
        primaryCta={{ label: "Book a Call", href: siteConfig.topmateUrl }}
        secondaryCta={{ label: "Explore PMS", href: "/investment-products/pms" }}
      />
    </>
  );
}
