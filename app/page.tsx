import Link from "next/link";
import { ArrowRight, ShieldCheck, BarChart3, Compass } from "lucide-react";
import { Hero } from "@/components/Hero";
import { FeatureGrid } from "@/components/FeatureGrid";
import { CTASection } from "@/components/CTASection";
import { ProductCard } from "@/components/ProductCard";
import { BlogCard } from "@/components/BlogCard";
import { investmentProducts, audiences, siteConfig } from "@/lib/site-config";
import { FounderPortrait, UnifiedPlanDiagram } from "@/components/Illustrations";

export default function HomePage() {
  return (
    <>
      {/* Hero */}
      <Hero
        title="Wealth that compounds. Plans that hold under fire."
        subtitle="AI-powered financial planning and global wealth management — built for professionals, families, and military officers who want clarity."
        primaryCta={{ label: "Try the AI Wealth Planner", href: "/ai-wealth-planner" }}
        secondaryCta={{ label: "Talk to Ashish", href: siteConfig.topmateUrl }}
        trustLine={`Run by ${siteConfig.legalName} (CIN: ${siteConfig.cin}) · NISM-certified · DPDP compliant`}
      />

      {/* What we cover — 9 products */}
      <FeatureGrid
        eyebrow="What we cover"
        title="Every major investment vehicle, explained"
        subtitle="From regulated mutual funds to alternative investments, unlisted shares, and crypto — we cover what every Indian and global investor needs to understand."
        items={investmentProducts.map((p) => ({
          icon: p.icon,
          name: p.name,
          short: p.short,
          href: `/investment-products/${p.slug}`,
        }))}
        columns={3}
      />

      {/* The AI Wealth Planner — hero feature */}
      <section className="bg-[var(--color-parchment)]">
        <div className="container-wide py-20 md:py-28 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="eyebrow">AI Wealth Planner</span>
            <h2 className="mt-3 text-balance">
              A second opinion that thinks like a planner — in 60 seconds.
            </h2>
            <div className="mt-6 space-y-4 text-[var(--color-slate)] leading-relaxed">
              <p>
                Drop in three numbers — age, savings, monthly income. The planner runs the maths, considers your country&apos;s tax and inflation,
                and writes you a personalised financial snapshot in plain English.
              </p>
              <p>
                It isn&apos;t magic. It&apos;s the same framework a SEBI-registered planner would walk you through, distilled and made accessible.
                You get a 30-year trajectory, the three things that would change your outcome the most, and one specific next step.
              </p>
              <p>
                Free, no signup. The full WealthWise app extends this into 16 sections — tax harvesting, insurance gap, retirement scenarios, and detailed goal planning.
              </p>
            </div>
            <div className="mt-8 flex flex-col sm:flex-row gap-3">
              <Link href="/ai-wealth-planner" className="btn-primary">
                Get my snapshot <ArrowRight className="w-4 h-4" />
              </Link>
              <Link href="/guided" className="btn-outline">
                Try the Guided Plan
              </Link>
            </div>
          </div>

          <div className="bg-white border border-[var(--color-silver)]/40 rounded-2xl p-6 shadow-sm">
            <div className="text-xs uppercase tracking-wider text-[var(--color-gold-dim)] font-semibold mb-3">Sample snapshot</div>
            <div className="space-y-4">
              <div className="rounded-lg bg-[var(--color-sand)]/50 p-4">
                <div className="text-xs text-[var(--color-slate)] mb-1">Where you stand</div>
                <p className="text-sm text-[var(--color-navy)] leading-relaxed">
                  At 34 with ₹18L invested and ₹1.6L monthly income, you&apos;re tracking ahead of 70% of professionals in your bracket — but
                  your equity allocation is light and you have no tax-loss harvesting in place.
                </p>
              </div>
              <div className="rounded-lg bg-[var(--color-sand)]/50 p-4">
                <div className="text-xs text-[var(--color-slate)] mb-1">Projected corpus at 60</div>
                <div className="text-2xl font-semibold text-[var(--color-navy)]">₹7.4 Cr</div>
                <div className="text-xs text-[var(--color-slate)] mt-1">in today&apos;s rupees, assuming 11% equity / 7% debt and 6% inflation</div>
              </div>
              <div className="rounded-lg bg-[var(--color-sand)]/50 p-4">
                <div className="text-xs text-[var(--color-slate)] mb-1">Three levers that move the needle</div>
                <ul className="text-sm text-[var(--color-navy)] space-y-1 mt-1">
                  <li>· Increase SIP by ₹15k → +₹2.8 Cr at 60</li>
                  <li>· Shift 20% from FD to equity → +₹1.4 Cr</li>
                  <li>· Harvest LTCG yearly under ₹1.25L → +₹38L</li>
                </ul>
              </div>
            </div>
            <p className="text-[10px] text-[var(--color-slate)] mt-3 leading-relaxed">
              Illustrative only. Returns shown are historical assumptions and do not guarantee future performance.
            </p>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 md:py-28">
        <div className="container-wide">
          <div className="max-w-3xl mx-auto text-center">
            <span className="eyebrow">How it works</span>
            <h2 className="mt-3">From scattered accounts to one coherent plan</h2>
            <p className="mt-4 text-lg text-[var(--color-slate)] leading-relaxed">
              Most Indian investors have a savings account, two demat accounts, three mutual funds, a PPF, an EPF, an SGB, and a parked-and-forgotten ULIP.
              WealthWise pulls it all together — then tells you what to do next.
            </p>
          </div>

          <div className="mt-12 max-w-5xl mx-auto">
            <UnifiedPlanDiagram />
          </div>

          <div className="mt-12 grid md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            <FlowStep
              icon={<Compass className="w-5 h-5" />}
              step="01"
              title="See everything you own"
              copy="Aggregate banks, brokers, AMCs, FDs, real estate, gold, crypto — in one snapshot. No more spreadsheets."
            />
            <FlowStep
              icon={<BarChart3 className="w-5 h-5" />}
              step="02"
              title="Know what you should do next"
              copy="The planner runs goal projections, tax harvesting, insurance gap, and retirement scenarios — then writes a concrete next step."
            />
            <FlowStep
              icon={<ShieldCheck className="w-5 h-5" />}
              step="03"
              title="Plan for any future"
              copy="Stress-test your plan against job loss, inflation spikes, market crashes. Adjust the levers. Watch your trajectory react."
            />
          </div>
        </div>
      </section>

      {/* Who we serve */}
      <section className="bg-[var(--color-parchment)]">
        <div className="container-wide py-20 md:py-28">
          <div className="max-w-3xl mb-12">
            <span className="eyebrow">Who we serve</span>
            <h2 className="mt-3">Built for people with real, complex lives</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {audiences.map((a) => (
              <ProductCard
                key={a.slug}
                icon={a.slug === "defence-officers" ? "Shield" : a.slug === "nri" ? "Plane" : a.slug === "hni" ? "Gem" : "Briefcase"}
                name={a.name}
                short={a.short}
                href={`/for/${a.slug}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Featured content */}
      <section className="py-20 md:py-28">
        <div className="container-wide">
          <div className="flex items-end justify-between mb-12 flex-wrap gap-4">
            <div>
              <span className="eyebrow">From the blog</span>
              <h2 className="mt-3">Recent reading</h2>
            </div>
            <Link href="/blog" className="text-sm font-semibold text-[var(--color-gold-dim)] inline-flex items-center gap-1.5">
              All articles <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid md:grid-cols-3 gap-5">
            <BlogCard
              slug="complete-guide-to-pms-india-2026"
              title="The complete guide to PMS in India for 2026"
              excerpt="What Portfolio Management Services actually are, who they're for, what they cost, and how to evaluate a manager before committing ₹50 lakhs."
              category="Investing"
              date="May 22, 2026"
              readTime="14 min"
            />
            <BlogCard
              slug="defence-officer-financial-independence-checklist"
              title="The defence officer's complete financial independence checklist"
              excerpt="A practical 12-point framework for officers transitioning to civilian life — built from interviews with 40+ retired colonels and group captains."
              category="Defence"
              date="May 12, 2026"
              readTime="18 min"
            />
            <BlogCard
              slug="ltcg-125-lakh-exemption-most-underused-tax-tool"
              title="The ₹1.25 lakh LTCG exemption — the most under-used tax tool in India"
              excerpt="Every Indian equity investor can harvest ₹1.25 lakhs of long-term capital gains tax-free every year. Most don't. Here's how to set up the workflow."
              category="Tax"
              date="May 1, 2026"
              readTime="9 min"
            />
          </div>
        </div>
      </section>

      {/* Founder */}
      <section className="bg-[var(--color-navy)] text-[var(--color-cream)]">
        <div className="container-wide py-20 md:py-28 grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <span className="eyebrow text-[var(--color-gold-light)]">Our founder</span>
            <h2 className="mt-3 text-[var(--color-cream)] text-balance">
              From 20 years in olive greens to building a wealth firm.
            </h2>
            <p className="mt-6 text-[var(--color-silver)] leading-relaxed">
              Col Ashish Bhardwaj spent two decades in the Indian Army before leaving to build Auris Wealth.
              The mission is simple: bring the rigour, calm, and discipline of military planning to financial planning —
              for officers, professionals, NRIs, and families who deserve more than another sales pitch.
            </p>
            <Link href="/about" className="inline-flex items-center gap-2 mt-8 text-[var(--color-gold-light)] font-semibold">
              Read the founder story <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="aspect-[3/4] rounded-xl overflow-hidden">
              <FounderPortrait variant="uniform" />
            </div>
            <div className="aspect-[3/4] rounded-xl overflow-hidden mt-8">
              <FounderPortrait variant="civilian" />
            </div>
          </div>
        </div>
      </section>

      {/* Trust strip */}
      <section className="py-16">
        <div className="container-wide">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {[
              ["500+", "Clients guided"],
              ["₹12 Cr+", "Tax savings identified"],
              ["20+ yr", "Combined experience"],
              ["4.9★", "Client rating"],
            ].map(([num, label]) => (
              <div key={label} className="text-center">
                <div className="text-3xl md:text-4xl font-semibold text-[var(--color-navy)]" style={{ fontFamily: "var(--font-display)" }}>
                  {num}
                </div>
                <div className="text-xs uppercase tracking-wider text-[var(--color-slate)] mt-2">{label}</div>
              </div>
            ))}
          </div>
          <p className="text-[11px] text-[var(--color-slate)] text-center mt-6 italic">
            Figures include aspirational metrics for the network and methodology being built — not all reflect active AUM today.
          </p>
        </div>
      </section>

      {/* Final CTA */}
      <CTASection
        title="Ready to build your wealth plan?"
        subtitle="Start with the free AI snapshot. Upgrade to the full WealthWise app or a 1:1 session whenever you're ready."
        primaryCta={{ label: "Try the AI Wealth Planner", href: "/ai-wealth-planner" }}
        secondaryCta={{ label: "Talk to Ashish", href: siteConfig.topmateUrl }}
      />
    </>
  );
}

function FlowStep({ icon, step, title, copy }: { icon: React.ReactNode; step: string; title: string; copy: string }) {
  return (
    <div className="card-soft">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-[var(--color-navy)] text-[var(--color-gold)] flex items-center justify-center">
          {icon}
        </div>
        <span className="text-xs font-mono text-[var(--color-slate)]">{step}</span>
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-[var(--color-slate)] leading-relaxed">{copy}</p>
    </div>
  );
}
