import type { Metadata } from "next";
import { Bot, Eye, GraduationCap, Scale } from "lucide-react";
import { Hero } from "@/components/Hero";
import { CTASection } from "@/components/CTASection";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "About PlanMyCashflows — Our Mission",
  description:
    "PlanMyCashflows is an AI-powered, education-first platform helping Indian investors discover, compare and understand PMS and AIF. Learn about our mission and approach.",
};

export default function AboutPage() {
  return (
    <>
      <Hero
        eyebrow="About"
        title="Making PMS & AIF understandable for India's serious investors."
        subtitle="PlanMyCashflows is an AI-powered, education-first platform that helps affluent professionals, business owners, HNIs, UHNIs and NRIs discover, compare and understand Portfolio Management Services and Alternative Investment Funds."
      />

      {/* Why we exist */}
      <section className="py-20 md:py-28">
        <div className="container-narrow">
          <div className="max-w-3xl mx-auto text-center mb-10 reveal">
            <span className="eyebrow">Why we exist</span>
            <h2 className="mt-3 text-balance">Alternatives are growing fast. Understanding them hasn&apos;t kept up.</h2>
          </div>
          <div className="max-w-3xl mx-auto space-y-5 text-[var(--color-slate)] leading-relaxed reveal">
            <p>
              India&apos;s alternative-investment ecosystem — PMS and AIF — is expanding at a remarkable pace, with
              new fund houses, categories and strategies launching every year. Yet for most investors these products
              remain opaque: scattered information, jargon-heavy factsheets, and sales pitches that start with a
              product rather than with you. Choosing well requires comparing across managers — something few
              investors have the time or the tools to do.
            </p>
            <p>
              We believe investors deserve better: unbiased, education-first discovery across fund houses, in plain
              English, with clear information on structures, minimums, risks and costs before any commitment. That
              is what PlanMyCashflows is built to provide — clarity first, conversation second, and never any
              pressure.
            </p>
          </div>
        </div>
      </section>

      {/* Our approach */}
      <section className="bg-[var(--color-parchment)]">
        <div className="container-wide py-20 md:py-28">
          <div className="max-w-3xl mx-auto text-center mb-12 reveal">
            <span className="eyebrow">Our approach</span>
            <h2 className="mt-3 text-balance">Four principles behind everything we publish</h2>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 reveal">
            <ApproachCard
              icon={<GraduationCap className="w-5 h-5" />}
              title="Education-first"
              copy="Plain-English explainers, guides and comparisons help you understand products before you commit. No pressure, no jargon."
            />
            <ApproachCard
              icon={<Scale className="w-5 h-5" />}
              title="Unbiased curation"
              copy="We bring together strategies from multiple fund houses so you can compare on the merits — not on who's selling hardest."
            />
            <ApproachCard
              icon={<Eye className="w-5 h-5" />}
              title="Transparency"
              copy="Straightforward information on structures, minimums, features and how we're compensated — so you always know where you stand."
            />
            <ApproachCard
              icon={<Bot className="w-5 h-5" />}
              title="Technology"
              copy="AI-assisted tools help you discover and shortlist relevant PMS and AIF strategies faster, matched to your objectives."
            />
          </div>
        </div>
      </section>

      {/* What we are — and what we're not */}
      <section className="py-20 md:py-28">
        <div className="container-narrow">
          <div className="max-w-3xl mx-auto text-center mb-10 reveal">
            <span className="eyebrow">Where we stand</span>
            <h2 className="mt-3 text-balance">What we are — and what we&apos;re not</h2>
          </div>
          <div className="max-w-3xl mx-auto grid md:grid-cols-2 gap-6 reveal">
            <div className="glass-card">
              <h3 className="text-lg font-semibold mb-3">We are</h3>
              <p className="text-sm text-[var(--color-slate)] leading-relaxed">
                An information and distribution platform. We help you discover, compare and understand third-party
                PMS and AIF products from SEBI-registered managers, and our team helps you complete the process with
                the relevant fund house when you&apos;re ready.
              </p>
            </div>
            <div className="glass-card">
              <h3 className="text-lg font-semibold mb-3">We are not</h3>
              <p className="text-sm text-[var(--color-slate)] leading-relaxed">
                A fund manager or an investment adviser. We do not manage money, run our own fund, or provide
                personalised investment advice. All products are managed by their respective SEBI-registered
                managers, and all investment decisions remain yours.
              </p>
            </div>
          </div>
          <p className="max-w-3xl mx-auto mt-8 text-sm text-[var(--color-slate)] text-center reveal">
            For interviews, comments, or media requests, please email{" "}
            <a href="mailto:press@planmycashflows.com" className="font-semibold text-[var(--color-gold-dim)]">
              press@planmycashflows.com
            </a>
            .
          </p>
        </div>
      </section>

      <CTASection
        title="Ready to explore alternatives?"
        subtitle="Browse curated PMS and AIF strategies, or book a no-obligation call with our team."
        primaryCta={{ label: "Explore PMS & AIF Strategies", href: "/#strategies" }}
        secondaryCta={{ label: "Book a Call", href: siteConfig.topmateUrl }}
      />
    </>
  );
}

function ApproachCard({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: string }) {
  return (
    <div className="glass-card">
      <div className="w-10 h-10 rounded-lg bg-[var(--color-sand)]/70 text-[var(--color-gold-dim)] flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-[var(--color-slate)] leading-relaxed">{copy}</p>
    </div>
  );
}
