import type { Metadata } from "next";
import Link from "next/link";
import { PenLine, UserCheck, Sparkles, BadgeCheck } from "lucide-react";
import { ContributeForm } from "@/components/blog/ContributeForm";
import { StructuredData, faqSchema, breadcrumbSchema } from "@/components/StructuredData";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "Write for the Journal — Contribute an Article | PlanMyCashflows",
  description:
    "Share your expertise with thousands of Indian and global investors. Submit an article on investing, tax, planning, or NRI finance — every piece is editor-reviewed before publishing.",
  alternates: { canonical: `${siteConfig.url}/blog/contribute` },
  openGraph: {
    title: "Write for the PlanMyCashflows Journal",
    description:
      "Become a contributor: submit your article on investing, tax, or financial planning. Editor-reviewed, published with your byline.",
    type: "website",
    url: `${siteConfig.url}/blog/contribute`,
  },
};

const STEPS = [
  {
    Icon: PenLine,
    title: "Write & submit",
    text: "Draft your article in the form below — markdown formatting, 800–2,000 words works best.",
  },
  {
    Icon: UserCheck,
    title: "Editor review",
    text: "Every submission is personally reviewed. We check accuracy, originality, and fit — and edit with you, not over you.",
  },
  {
    Icon: Sparkles,
    title: "Published with your byline",
    text: "Approved pieces go live on the Journal with your name, bio, and links — and get shared with our newsletter readers.",
  },
];

const FAQ = [
  {
    question: "Who can write for the PlanMyCashflows Journal?",
    answer:
      "Anyone with genuine expertise or a well-researched perspective on investing, taxation, financial planning, NRI finance, or defence-personnel finances. You don't need to be a professional writer — our editor polishes every accepted piece.",
  },
  {
    question: "Is every submission published?",
    answer:
      "No. Every article is reviewed by the editor for accuracy, originality, and usefulness to readers. If your piece is selected, we'll work with you on edits before it goes live. You can track the status of your submission on this page after signing in.",
  },
  {
    question: "Do contributors get credited?",
    answer:
      "Yes — published articles carry your byline, short bio, and optional LinkedIn or Twitter links.",
  },
  {
    question: "What content is not accepted?",
    answer:
      "Product promotions, stock tips, affiliate content, AI-generated filler, and anything previously published elsewhere. Educational, original writing only.",
  },
];

export default function ContributePage() {
  return (
    <>
      {/* Masthead */}
      <header className="border-b border-[var(--color-silver)]/30 gradient-hero">
        <div className="container-wide py-12 md:py-16">
          <Link href="/blog" className="eyebrow hover:text-[var(--color-navy)] transition-colors">
            PlanMyCashflows Journal
          </Link>
          <h1 className="mt-3 text-balance max-w-3xl" style={{ fontSize: "clamp(2.25rem, 5vw, 3.5rem)" }}>
            Write for the Journal.
          </h1>
          <p className="mt-4 text-lg md:text-xl text-[var(--color-slate)] max-w-2xl leading-relaxed">
            Have a perspective on investing, tax, or planning worth sharing? Contribute an article —
            every piece is editor-reviewed and published with your byline.
          </p>
          <div className="mt-6 inline-flex items-center gap-2 text-sm font-semibold text-[var(--color-gold-dim)]">
            <BadgeCheck className="w-4 h-4" /> Editor-reviewed · Your byline · No fees, ever
          </div>
        </div>
      </header>

      {/* How it works */}
      <section className="py-12 md:py-16 border-b border-[var(--color-silver)]/30">
        <div className="container-wide">
          <div className="grid md:grid-cols-3 gap-6">
            {STEPS.map((s, i) => (
              <div key={s.title} className="p-6 rounded-2xl bg-white border border-[var(--color-silver)]/40">
                <div className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full bg-[var(--color-navy)] text-[var(--color-gold)] flex items-center justify-center">
                    <s.Icon className="w-4.5 h-4.5" />
                  </span>
                  <span className="text-xs font-semibold text-[var(--color-steel)] uppercase tracking-wider">Step {i + 1}</span>
                </div>
                <h2 className="mt-4" style={{ fontSize: "1.125rem" }}>{s.title}</h2>
                <p className="mt-2 text-sm text-[var(--color-slate)] leading-relaxed">{s.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Form */}
      <section className="py-12 md:py-16">
        <div className="container-wide">
          <div className="max-w-3xl mx-auto">
            <ContributeForm />
          </div>
        </div>
      </section>

      {/* FAQ (also rendered as FAQPage schema for SEO) */}
      <section className="py-12 md:py-16 border-t border-[var(--color-silver)]/30 bg-[var(--color-parchment)]/40">
        <div className="container-wide max-w-3xl mx-auto">
          <h2 className="mb-8" style={{ fontSize: "1.75rem" }}>Contributor FAQ</h2>
          <dl className="space-y-6">
            {FAQ.map((f) => (
              <div key={f.question}>
                <dt className="font-semibold text-[var(--color-navy)]">{f.question}</dt>
                <dd className="mt-1.5 text-sm text-[var(--color-slate)] leading-relaxed">{f.answer}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <StructuredData data={faqSchema(FAQ)} />
      <StructuredData
        data={breadcrumbSchema([
          { name: "Blog", url: `${siteConfig.url}/blog` },
          { name: "Write for the Journal", url: `${siteConfig.url}/blog/contribute` },
        ])}
      />
    </>
  );
}
