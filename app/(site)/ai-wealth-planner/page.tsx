import type { Metadata } from "next";
import Link from "next/link";
import { ExternalLink, ArrowRight } from "lucide-react";
import { AIPlannerForm } from "@/components/AIPlannerForm";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "AI Wealth Planner — Free Personalised Financial Snapshot",
  description:
    "Get a personalised financial snapshot in 60 seconds. Multi-currency, India/US/UK/UAE/Singapore-aware, with 30-year projections and three concrete levers.",
};

export default function AIWealthPlannerPage() {
  return (
    <>
      <section className="gradient-hero">
        <div className="container-wide py-16 md:py-20 text-center">
          <span className="eyebrow">Free · No signup required</span>
          <h1 className="mt-4 max-w-3xl mx-auto text-balance">
            A personalised wealth snapshot — in 60 seconds.
          </h1>
          <p className="mt-5 max-w-2xl mx-auto text-lg text-[var(--color-slate)]">
            Four quick steps. Country-aware (India, US, UK, UAE, Singapore). The output is a calm, honest read on where you stand,
            where you&apos;re headed, and the three things that would change your outcome the most.
          </p>
          <p className="mt-6 text-sm text-[var(--color-slate)]">
            Looking for the full app instead?{" "}
            <a
              href={siteConfig.appUrl}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[var(--color-gold-dim)] inline-flex items-center gap-1 hover:text-[var(--color-navy)]"
            >
              Open WealthWise <ExternalLink className="w-3.5 h-3.5" />
            </a>
            {" · "}or{" "}
            <Link href="/plan" className="font-semibold text-[var(--color-gold-dim)] inline-flex items-center gap-1 hover:text-[var(--color-navy)]">
              compare all three planners <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </p>
        </div>
      </section>

      <section className="pb-20">
        <div className="container-narrow">
          <AIPlannerForm />

          <div className="mt-12 grid sm:grid-cols-3 gap-5">
            <InfoCard
              title="Educational, not advisory"
              body="The snapshot uses historical return assumptions (10–12% equity, 6–7% debt) and country-specific inflation. It does not recommend specific securities."
            />
            <InfoCard
              title="Your data isn't stored"
              body="We strip PII before processing. No names, emails, or phone numbers are sent to the model. The snapshot itself isn't saved."
            />
            <InfoCard
              title="Want depth?"
              body="The full WealthWise app covers 16 sections including SWOT, tax harvesting, insurance gap analysis, and detailed goal planning."
            />
          </div>
        </div>
      </section>
    </>
  );
}

function InfoCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="card-soft">
      <h3 className="text-base font-semibold mb-2">{title}</h3>
      <p className="text-sm text-[var(--color-slate)] leading-relaxed">{body}</p>
    </div>
  );
}
