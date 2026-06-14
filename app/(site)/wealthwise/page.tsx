import type { Metadata } from "next";
import Link from "next/link";
import { Eye, Brain, GitBranch, Check } from "lucide-react";
import { Hero } from "@/components/Hero";
import { CTASection } from "@/components/CTASection";
import { AppScreenshot } from "@/components/Illustrations";

export const metadata: Metadata = {
  title: "WealthWise — The wealth platform that thinks alongside you",
  description:
    "WealthWise unifies your portfolio across banks, brokers, AMCs and goal types — and tells you what to do next. Try free for 14 days.",
};

export default function WealthWiseAppPage() {
  return (
    <>
      <Hero
        eyebrow="The Product"
        title="The wealth platform that thinks alongside you"
        subtitle="See everything you own, know what you should do next, plan for any future. WealthWise turns 30 spreadsheets and apps into one coherent picture."
        primaryCta={{ label: "Start 14-day free trial", href: "https://app.auriscashflow.com/?signup" }}
        secondaryCta={{ label: "See pricing", href: "/pricing" }}
      />

      {/* Three pillars */}
      <section className="py-20">
        <div className="container-wide grid md:grid-cols-3 gap-6">
          <Pillar
            icon={<Eye className="w-6 h-6" />}
            title="See everything you own"
            copy="Bank accounts, FDs, mutual funds (across folios and AMCs), demat holdings, EPF, PPF, NPS, gold (physical, SGB, ETF), real estate, crypto, even ESOPs. One live snapshot."
          />
          <Pillar
            icon={<Brain className="w-6 h-6" />}
            title="Know what you should do next"
            copy="The AI planner runs goal projections, tax-loss harvesting on the ₹1.25L LTCG exemption, insurance gap analysis, and retirement scenarios — then writes a one-page next step."
          />
          <Pillar
            icon={<GitBranch className="w-6 h-6" />}
            title="Plan for any future"
            copy="Stress-test against job loss, inflation spikes, market crashes. Toggle scenarios (SIP +₹15k, retire at 55 vs 60). Watch your trajectory react in real-time."
          />
        </div>
      </section>

      {/* Product tour — 6 screenshots */}
      <section className="py-20 bg-[var(--color-parchment)]">
        <div className="container-wide">
          <div className="max-w-3xl mb-12">
            <span className="eyebrow">Product tour</span>
            <h2 className="mt-3">Six things you can do in your first session</h2>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
            {tourScreens.map((s, i) => (
              <div key={i} className="card-soft">
                <div className="aspect-video rounded-lg mb-4 overflow-hidden border border-[var(--color-silver)]/40">
                  <AppScreenshot title={s.title} kind={s.kind} />
                </div>
                <h3 className="text-base font-semibold mb-1.5">{s.title}</h3>
                <p className="text-sm text-[var(--color-slate)] leading-relaxed">{s.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Comparison */}
      <section className="py-20">
        <div className="container-wide">
          <div className="max-w-3xl mb-12">
            <span className="eyebrow">How we compare</span>
            <h2 className="mt-3">WealthWise vs everything else you&apos;ve tried</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="border-b border-[var(--color-silver)]/40">
                  <th className="text-left p-4 font-semibold text-[var(--color-slate)]">Capability</th>
                  <th className="text-center p-4 font-semibold text-[var(--color-gold-dim)]">WealthWise</th>
                  <th className="text-center p-4 font-semibold text-[var(--color-slate)]">Excel</th>
                  <th className="text-center p-4 font-semibold text-[var(--color-slate)]">Traditional Advisor</th>
                  <th className="text-center p-4 font-semibold text-[var(--color-slate)]">Kuvera / INDmoney</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr key={i} className="border-b border-[var(--color-silver)]/30">
                    <td className="p-4 text-[var(--color-navy)]">{row.label}</td>
                    <Cell yes={row.ww} />
                    <Cell yes={row.excel} />
                    <Cell yes={row.advisor} />
                    <Cell yes={row.kuvera} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* Founder note */}
      <section className="py-20 bg-[var(--color-navy)] text-[var(--color-cream)]">
        <div className="container-narrow">
          <span className="eyebrow text-[var(--color-gold-light)]">A note from the founder</span>
          <h2 className="text-[var(--color-cream)] mt-3 text-balance">Why I built this</h2>
          <div className="mt-8 space-y-5 text-[var(--color-silver)] leading-relaxed">
            <p>
              When I left the Army after 20 years, I sat down to actually plan my financial life. I had EPF, NPS, mutual funds across three AMCs, FDs at two banks,
              an SGB tranche I&apos;d forgotten about, a flat in Pune, a small US stocks position, and a vague sense that things were &ldquo;probably fine.&rdquo;
            </p>
            <p>
              They weren&apos;t fine. They weren&apos;t terrible — but I had no view of my actual net worth, no rebalancing happening, no tax harvesting,
              and my retirement projection was somebody&apos;s spreadsheet from 2019. I wanted one place that made the picture honest and actionable.
              Excel wasn&apos;t enough. The apps I tried were either glorified portfolio trackers or thinly disguised distributor platforms.
            </p>
            <p>
              WealthWise is what I wanted. A serious tool for serious investors — military officers, professionals, NRIs, families with real complexity.
              It doesn&apos;t sell you products. It tells you what to do.
            </p>
            <p className="text-[var(--color-gold-light)] font-semibold">— Col Ashish Bhardwaj</p>
          </div>
        </div>
      </section>

      <CTASection
        title="Start your 14-day free trial"
        subtitle="No credit card required. Cancel anytime in one click. Your data stays private — encrypted in transit and at rest."
        primaryCta={{ label: "Try WealthWise free", href: "https://app.auriscashflow.com/?signup" }}
        secondaryCta={{ label: "See pricing", href: "/pricing" }}
      />
    </>
  );
}

const tourScreens: { title: string; copy: string; kind: "dashboard" | "goals" | "harvest" | "scenarios" | "insurance" | "drift" }[] = [
  { title: "Unified portfolio", kind: "dashboard", copy: "All your holdings in one view — drillable to scheme, AMC, fund manager, current NAV, cost basis, and gain/loss." },
  { title: "Goal projections", kind: "goals", copy: "Every goal projected with inflation, required SIP, current trajectory, and on-track / off-track flag." },
  { title: "Tax harvesting", kind: "harvest", copy: "March-end automation: identifies LTCG up to ₹1.25L to harvest tax-free, and STCG losses to offset." },
  { title: "Scenario builder", kind: "scenarios", copy: "Toggle 'retire at 55' vs 60, 'SIP +₹15k', 'market drops 30%'. Trajectory rebuilds in real-time." },
  { title: "Insurance gap", kind: "insurance", copy: "Recommended term cover vs current cover, health insurance adequacy, and where you're under-protected." },
  { title: "Asset allocation drift", kind: "drift", copy: "Live tracking of equity/debt/gold drift from your target. Rebalancing alerts only when threshold breached." },
];

const comparisonRows = [
  { label: "Aggregates portfolio across banks, AMCs, brokers", ww: true, excel: false, advisor: false, kuvera: true },
  { label: "AI-generated next-step recommendations", ww: true, excel: false, advisor: false, kuvera: false },
  { label: "Tax-loss harvesting on ₹1.25L exemption", ww: true, excel: false, advisor: true, kuvera: false },
  { label: "Scenario planning (job loss, retire early)", ww: true, excel: true, advisor: true, kuvera: false },
  { label: "No product sales / commissions", ww: true, excel: true, advisor: false, kuvera: false },
  { label: "Insurance gap analysis", ww: true, excel: false, advisor: true, kuvera: false },
  { label: "Built for ₹10L+ portfolios", ww: true, excel: true, advisor: true, kuvera: false },
];

function Pillar({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: string }) {
  return (
    <div className="card-soft">
      <div className="w-12 h-12 rounded-xl bg-[var(--color-navy)] text-[var(--color-gold)] flex items-center justify-center mb-5">
        {icon}
      </div>
      <h3 className="text-xl font-semibold mb-3">{title}</h3>
      <p className="text-[var(--color-slate)] leading-relaxed">{copy}</p>
    </div>
  );
}

function Cell({ yes }: { yes: boolean }) {
  return (
    <td className="p-4 text-center">
      {yes ? (
        <Check className="w-5 h-5 text-[var(--color-emerald)] inline" />
      ) : (
        <span className="text-[var(--color-silver)]">—</span>
      )}
    </td>
  );
}
