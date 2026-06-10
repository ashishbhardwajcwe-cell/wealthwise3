import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, ExternalLink, Sparkles, ListChecks, Layers, Check } from "lucide-react";
import { Hero } from "@/components/Hero";
import { CTASection } from "@/components/CTASection";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Wealth Planner — Snapshot, Guided Plan, Full App | Auris Wealth",
  description:
    "Three ways to plan: a free 60-second AI snapshot, a 10-minute guided plan, or the full WealthWise app with portfolio aggregation, tax harvesting and PDF reports.",
};

interface PlannerCard {
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  copy: string;
  time: string;
  gate: string;
  features: string[];
  cta: { label: string; href: string; external?: boolean };
  featured?: boolean;
}

const CARDS: PlannerCard[] = [
  {
    icon: <Sparkles className="w-6 h-6" />,
    eyebrow: "60 seconds · No signup",
    title: "AI Snapshot",
    copy: "Drop in three numbers — age, savings, monthly income. Get a personalised AI-generated read on where you stand, where you’re headed, and the three things that would change your outcome the most. Country-aware: India, US, UK, UAE, Singapore.",
    time: "~1 minute",
    gate: "Free · No signup",
    features: [
      "Where-you-stand summary",
      "Projected corpus at retirement",
      "30-year trajectory chart",
      "Three levers ranked by impact",
    ],
    cta: { label: "Run my snapshot", href: "/ai-wealth-planner" },
  },
  {
    icon: <ListChecks className="w-6 h-6" />,
    eyebrow: "10 minutes · No signup",
    title: "Guided Plan",
    copy: "Forty plain-language questions across eight sections. Builds you a YNAB-style zero-based budget, a debt payoff strategy, a goal map with traffic-light status, and a projected net-worth timeline. All in your browser — nothing stored.",
    time: "~10 minutes",
    gate: "Free · No signup",
    features: [
      "Zero-based budget · every rupee a job",
      "Snowball / avalanche debt payoff",
      "Goal traffic-lights (on / at-risk / off)",
      "Financial Freedom Number",
    ],
    cta: { label: "Start guided plan", href: "/guided" },
    featured: true,
  },
  {
    icon: <Layers className="w-6 h-6" />,
    eyebrow: "Full picture · Login required",
    title: "Full WealthWise App",
    copy: "The complete platform: portfolio aggregation across banks/AMCs/brokers, AI wealth plan covering 16 sections (SWOT, risk profile, retirement scenarios, tax harvesting, insurance gap, asset allocation drift), PDF export. 14-day free trial — no card required.",
    time: "~30 minutes for first plan",
    gate: "14-day free trial · Login",
    features: [
      "Live portfolio across every account",
      "16-section Equentis-style plan",
      "Tax-loss + LTCG harvesting alerts",
      "Stress-test scenarios + PDF export",
    ],
    cta: { label: "Open the app", href: siteConfig.appUrl, external: true },
  },
];

export default function Page() {
  return (
    <>
      <Hero
        eyebrow="Wealth planning"
        title="Three planners. One place."
        subtitle="Pick the depth that matches the moment — a 60-second snapshot, a 10-minute guided plan, or the full WealthWise app. All three are free to try. The first two run in your browser. The full app saves your plan and tracks it over time."
        primaryCta={{ label: "Open the full app", href: siteConfig.appUrl }}
        secondaryCta={{ label: "Try the 60-second snapshot", href: "/ai-wealth-planner" }}
        align="left"
      />

      <section className="py-16 md:py-20">
        <div className="container-wide">
          <div className="grid md:grid-cols-3 gap-5 lg:gap-6">
            {CARDS.map((c) => <Card key={c.title} card={c} />)}
          </div>

          <p className="text-xs text-[var(--color-slate)] text-center mt-10 italic max-w-2xl mx-auto">
            The Snapshot and Guided Plan run entirely in your browser with no data stored. The full WealthWise app
            saves your plan and tracks it over time — that’s why it asks you to sign in. Your data is encrypted in
            transit and at rest.
          </p>
        </div>
      </section>

      {/* Comparison */}
      <section className="py-16 md:py-20 bg-[var(--color-parchment)]">
        <div className="container-wide">
          <div className="max-w-3xl mb-10">
            <span className="eyebrow">Side by side</span>
            <h2 className="mt-3">Which one fits the moment?</h2>
            <p className="mt-3 text-[var(--color-slate)] leading-relaxed">
              All three planners share the same compounding assumptions. They differ in depth, data captured, and
              whether they remember you between visits.
            </p>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[var(--color-silver)]/40 bg-white">
            <table className="w-full text-sm">
              <thead className="bg-[var(--color-sand)]/40">
                <tr>
                  <th className="text-left p-4 font-semibold text-[var(--color-slate)] text-xs uppercase tracking-wider">Capability</th>
                  <th className="text-center p-4 font-semibold text-[var(--color-navy)]">Snapshot</th>
                  <th className="text-center p-4 font-semibold text-[var(--color-navy)]">Guided</th>
                  <th className="text-center p-4 font-semibold text-[var(--color-gold-dim)]">Full App</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row) => (
                  <tr key={row.label} className="border-t border-[var(--color-silver)]/30">
                    <td className="p-4 text-[var(--color-navy)]">{row.label}</td>
                    <CellMark on={row.snapshot} />
                    <CellMark on={row.guided} />
                    <CellMark on={row.app} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <CTASection
        title="Ready to plan?"
        subtitle="Start anywhere — the 60-second snapshot, the 10-minute guided plan, or open the full app. They all fit together."
        primaryCta={{ label: "Open the full app", href: siteConfig.appUrl }}
        secondaryCta={{ label: "Book a 30-min call", href: "/contact" }}
      />
    </>
  );
}

function Card({ card }: { card: PlannerCard }) {
  const Wrapper = ({ children }: { children: React.ReactNode }) => card.cta.external
    ? <a href={card.cta.href} target="_blank" rel="noreferrer" className="contents">{children}</a>
    : <Link href={card.cta.href} className="contents">{children}</Link>;

  return (
    <Wrapper>
      <div className={`group h-full flex flex-col bg-white rounded-2xl p-6 md:p-7 border transition-all hover:-translate-y-1 hover:shadow-lg cursor-pointer
        ${card.featured ? "border-[var(--color-gold)] shadow-md ring-1 ring-[var(--color-gold)]/20" : "border-[var(--color-silver)]/40 hover:border-[var(--color-gold)]"}`}>
        <div className="flex items-center justify-between mb-5">
          <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${card.featured ? "bg-[var(--color-navy)] text-[var(--color-gold)]" : "bg-[var(--color-sand)]/70 text-[var(--color-gold-dim)]"}`}>
            {card.icon}
          </div>
          {card.featured && (
            <span className="text-[10px] font-semibold uppercase tracking-wider px-2 py-1 rounded-full bg-[var(--color-gold)]/15 text-[var(--color-gold-dim)]">
              Most popular
            </span>
          )}
        </div>
        <div className="text-xs uppercase tracking-wider font-semibold text-[var(--color-gold-dim)]">{card.eyebrow}</div>
        <h3 className="text-xl font-semibold mt-1.5 mb-3">{card.title}</h3>
        <p className="text-sm text-[var(--color-slate)] leading-relaxed flex-1">{card.copy}</p>

        <ul className="mt-5 space-y-2">
          {card.features.map((f) => (
            <li key={f} className="flex gap-2 text-xs text-[var(--color-navy)]">
              <Check className="w-3.5 h-3.5 text-[var(--color-emerald)] flex-shrink-0 mt-0.5" />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 pt-5 border-t border-[var(--color-silver)]/30 grid grid-cols-2 gap-2 text-xs text-[var(--color-slate)]">
          <div>
            <div className="text-[10px] uppercase tracking-wider">Typical time</div>
            <div className="font-semibold text-[var(--color-navy)] mt-0.5">{card.time}</div>
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-wider">Access</div>
            <div className="font-semibold text-[var(--color-navy)] mt-0.5">{card.gate}</div>
          </div>
        </div>

        <div className={`mt-5 inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-semibold text-sm w-full
          ${card.featured
            ? "bg-gradient-to-br from-[var(--color-gold)] to-[var(--color-gold-light)] text-[var(--color-navy)]"
            : "bg-[var(--color-navy)] text-[var(--color-cream)]"}
          group-hover:gap-3 transition-all`}>
          {card.cta.label}
          {card.cta.external ? <ExternalLink className="w-3.5 h-3.5" /> : <ArrowRight className="w-4 h-4" />}
        </div>
      </div>
    </Wrapper>
  );
}

function CellMark({ on }: { on: boolean }) {
  return (
    <td className="p-4 text-center">
      {on ? <Check className="w-4 h-4 text-[var(--color-emerald)] inline" /> : <span className="text-[var(--color-silver)]">—</span>}
    </td>
  );
}

const COMPARISON: { label: string; snapshot: boolean; guided: boolean; app: boolean }[] = [
  { label: "Personalised AI summary",                snapshot: true,  guided: true,  app: true },
  { label: "Retirement corpus projection",            snapshot: true,  guided: true,  app: true },
  { label: "Country-aware (India / US / UK / UAE)",   snapshot: true,  guided: true,  app: true },
  { label: "Zero-based monthly budget",               snapshot: false, guided: true,  app: true },
  { label: "Goal traffic-lights (on / at-risk / off)",snapshot: false, guided: true,  app: true },
  { label: "Debt payoff calculator (snowball/avalanche)", snapshot: false, guided: true,  app: true },
  { label: "Portfolio aggregation across AMCs/banks", snapshot: false, guided: false, app: true },
  { label: "Tax-loss + LTCG harvesting alerts",       snapshot: false, guided: false, app: true },
  { label: "16-section Equentis-style plan",          snapshot: false, guided: false, app: true },
  { label: "PDF export",                              snapshot: false, guided: true,  app: true },
  { label: "Saves between visits",                    snapshot: false, guided: false, app: true },
  { label: "Login required",                          snapshot: false, guided: false, app: true },
];
