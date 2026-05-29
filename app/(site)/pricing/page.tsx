"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, X } from "lucide-react";
import { Hero } from "@/components/Hero";

export default function PricingPage() {
  const [annual, setAnnual] = useState(true);

  const tiers = [
    {
      name: "Free",
      monthly: 0,
      annual: 0,
      tagline: "Start here. Always free.",
      cta: { label: "Get started", href: "https://wealth.auris8.com/signup" },
      features: [
        { label: "AI Wealth Planner (3 snapshots / month)", on: true },
        { label: "Guided Plan (full)", on: true },
        { label: "Basic portfolio tracking (3 accounts)", on: true },
        { label: "All calculators and glossary", on: true },
        { label: "Newsletter & weekly note", on: true },
        { label: "1:1 advisory", on: false },
        { label: "Tax harvesting automation", on: false },
        { label: "Unlimited accounts", on: false },
      ],
    },
    {
      name: "Premium",
      monthly: 499,
      annual: 4990,
      tagline: "For serious investors building wealth.",
      cta: { label: "Start 14-day free trial", href: "https://wealth.auris8.com/signup?tier=premium" },
      highlight: true,
      features: [
        { label: "Everything in Free", on: true },
        { label: "Unlimited AI snapshots", on: true },
        { label: "Unlimited account aggregation", on: true },
        { label: "Tax-loss harvesting on ₹1.25L LTCG", on: true },
        { label: "Insurance gap analysis", on: true },
        { label: "Scenario planning (retire early, market crash)", on: true },
        { label: "Quarterly review email", on: true },
        { label: "PMS / AIF tracking", on: false },
      ],
    },
    {
      name: "HNI",
      monthly: 2499,
      annual: 24990,
      tagline: "For ₹2 Cr+ portfolios with complexity.",
      cta: { label: "Talk to us", href: "/contact" },
      features: [
        { label: "Everything in Premium", on: true },
        { label: "PMS, AIF, unlisted shares tracking", on: true },
        { label: "Cross-border / NRI tax planning", on: true },
        { label: "2x annual 1:1 review with Ashish", on: true },
        { label: "Custom asset allocation models", on: true },
        { label: "Estate & succession framework", on: true },
        { label: "Priority email/WhatsApp support", on: true },
        { label: "Family-office equivalent reporting", on: true },
      ],
    },
    {
      name: "Enterprise",
      monthly: null,
      annual: null,
      tagline: "Family offices & defence units (custom).",
      cta: { label: "Contact sales", href: "/contact" },
      features: [
        { label: "Everything in HNI", on: true },
        { label: "Multi-user, multi-family accounts", on: true },
        { label: "Defence unit / regiment plans", on: true },
        { label: "Quarterly in-person reviews", on: true },
        { label: "Bespoke reporting & dashboards", on: true },
        { label: "Direct line to founder", on: true },
        { label: "SLAs & dedicated success manager", on: true },
        { label: "White-glove onboarding", on: true },
      ],
    },
  ];

  return (
    <>
      <Hero
        eyebrow="Pricing"
        title="Honest, transparent, no hidden commissions"
        subtitle="We do not earn commissions on the products you invest in. Our revenue is your subscription. That alignment is the whole point."
      />

      <section className="py-12">
        <div className="container-wide flex justify-center mb-12">
          <div className="inline-flex bg-white border border-[var(--color-silver)]/40 rounded-full p-1">
            <button
              onClick={() => setAnnual(false)}
              className={`px-4 py-2 rounded-full text-sm font-semibold ${!annual ? "bg-[var(--color-navy)] text-[var(--color-cream)]" : "text-[var(--color-slate)]"}`}
            >
              Monthly
            </button>
            <button
              onClick={() => setAnnual(true)}
              className={`px-4 py-2 rounded-full text-sm font-semibold ${annual ? "bg-[var(--color-navy)] text-[var(--color-cream)]" : "text-[var(--color-slate)]"}`}
            >
              Annual <span className="text-[var(--color-gold)]">save 17%</span>
            </button>
          </div>
        </div>

        <div className="container-wide grid md:grid-cols-2 lg:grid-cols-4 gap-5 pb-20">
          {tiers.map((tier) => {
            const price = tier.monthly === null ? null : annual ? Math.round(tier.annual / 12) : tier.monthly;
            return (
              <div
                key={tier.name}
                className={`rounded-2xl p-6 border ${
                  tier.highlight
                    ? "bg-[var(--color-navy)] text-[var(--color-cream)] border-[var(--color-gold)] shadow-lg"
                    : "bg-white border-[var(--color-silver)]/40"
                }`}
              >
                <div className={`text-xs uppercase tracking-wider font-semibold mb-2 ${tier.highlight ? "text-[var(--color-gold-light)]" : "text-[var(--color-gold-dim)]"}`}>
                  {tier.name}
                </div>
                <div className="mb-4">
                  {price === null ? (
                    <div className="text-3xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>Custom</div>
                  ) : (
                    <>
                      <div className="text-4xl font-semibold" style={{ fontFamily: "var(--font-display)" }}>
                        ₹{price.toLocaleString("en-IN")}
                        <span className="text-base text-[var(--color-slate)] font-normal">/month</span>
                      </div>
                      {annual && tier.annual !== null && tier.annual > 0 && (
                        <div className={`text-xs mt-1 ${tier.highlight ? "text-[var(--color-silver)]" : "text-[var(--color-slate)]"}`}>
                          Billed annually (₹{tier.annual.toLocaleString("en-IN")}/yr)
                        </div>
                      )}
                    </>
                  )}
                </div>
                <p className={`text-sm mb-6 ${tier.highlight ? "text-[var(--color-silver)]" : "text-[var(--color-slate)]"}`}>{tier.tagline}</p>

                <Link
                  href={tier.cta.href}
                  className={tier.highlight ? "btn-primary w-full justify-center" : "btn-outline w-full justify-center"}
                >
                  {tier.cta.label}
                </Link>

                <ul className="mt-6 space-y-2.5">
                  {tier.features.map((f, i) => (
                    <li key={i} className="flex gap-2 items-start text-sm">
                      {f.on ? (
                        <Check className={`w-4 h-4 mt-0.5 flex-shrink-0 ${tier.highlight ? "text-[var(--color-gold-light)]" : "text-[var(--color-emerald)]"}`} />
                      ) : (
                        <X className={`w-4 h-4 mt-0.5 flex-shrink-0 ${tier.highlight ? "text-[var(--color-silver)]/40" : "text-[var(--color-silver)]"}`} />
                      )}
                      <span className={!f.on ? "opacity-50" : ""}>{f.label}</span>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </>
  );
}
