import Link from "next/link";
import { Check, X, AlertTriangle, ArrowRight, ExternalLink } from "lucide-react";
import { Hero } from "@/components/Hero";
import { CTASection } from "@/components/CTASection";
import { StructuredData, faqSchema } from "@/components/StructuredData";
import { siteConfig } from "@/lib/site-config";

export interface ProductPageData {
  name: string;
  oneLine: string;
  whatItIs: string[];
  keyFacts: { label: string; value: string }[];
  pros: string[];
  cons: string[];
  whoShouldConsider: string;
  commonMistakes: string[];
  howAurisHelps: string;
  faqs: { question: string; answer: string }[];
  relatedPosts?: { slug: string; title: string }[];
  graphic?: React.ReactNode;
  extraDisclaimer?: string;
}

export function InvestmentProductPage({
  data,
  liveSection,
}: {
  data: ProductPageData;
  /** Optional live-data section rendered right after the hero, before
   *  the educational content. Used by crypto/stocks/MF/gold pages to
   *  give visitors immediate interactive value above the long article. */
  liveSection?: React.ReactNode;
}) {
  return (
    <>
      <Hero
        eyebrow="Investment Product"
        title={data.name}
        subtitle={data.oneLine}
        primaryCta={{ label: "Is it right for you?", href: "#fit" }}
        secondaryCta={{ label: "Get a personalised plan", href: "/plan" }}
        align="left"
      />

      {liveSection}

      {/* What it is */}
      <section className="py-16">
        <div className="container-narrow">
          <span className="eyebrow">What it is</span>
          <h2 className="mt-3 mb-6">In plain language</h2>
          <div className="prose-article">
            {data.whatItIs.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>
        </div>
      </section>

      {/* Visual explainer */}
      {data.graphic && (
        <section className="py-16 bg-[var(--color-parchment)]">
          <div className="container-narrow">
            <span className="eyebrow">How it works</span>
            <h2 className="mt-3 mb-8">Visualised</h2>
            {data.graphic}
            <p className="text-xs text-[var(--color-slate)] mt-4 italic">
              Returns shown are historical and do not guarantee future performance.
            </p>
          </div>
        </section>
      )}

      {/* Key facts */}
      <section className="py-16">
        <div className="container-narrow">
          <span className="eyebrow">Key facts</span>
          <h2 className="mt-3 mb-8">Quick reference</h2>
          <div className="grid sm:grid-cols-2 gap-x-8 gap-y-0 border-t border-[var(--color-silver)]/40">
            {data.keyFacts.map((f) => (
              <div key={f.label} className="py-4 border-b border-[var(--color-silver)]/40 flex justify-between gap-4">
                <span className="text-sm font-semibold text-[var(--color-slate)]">{f.label}</span>
                <span className="text-sm text-[var(--color-navy)] text-right">{f.value}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pros and cons */}
      <section className="py-16 bg-[var(--color-parchment)]">
        <div className="container-narrow">
          <span className="eyebrow">The honest version</span>
          <h2 className="mt-3 mb-8">Pros and cons</h2>
          <div className="grid md:grid-cols-2 gap-6">
            <div className="bg-white p-6 rounded-xl border border-[var(--color-silver)]/40">
              <h3 className="text-base font-semibold mb-4 text-[var(--color-emerald)]">Pros</h3>
              <ul className="space-y-3">
                {data.pros.map((p, i) => (
                  <li key={i} className="flex gap-2 text-sm text-[var(--color-navy)]">
                    <Check className="w-4 h-4 text-[var(--color-emerald)] mt-0.5 flex-shrink-0" />
                    <span>{p}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-white p-6 rounded-xl border border-[var(--color-silver)]/40">
              <h3 className="text-base font-semibold mb-4 text-[var(--color-ruby)]">Cons</h3>
              <ul className="space-y-3">
                {data.cons.map((c, i) => (
                  <li key={i} className="flex gap-2 text-sm text-[var(--color-navy)]">
                    <X className="w-4 h-4 text-[var(--color-ruby)] mt-0.5 flex-shrink-0" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Who should consider */}
      <section id="fit" className="py-16">
        <div className="container-narrow">
          <span className="eyebrow">Fit check</span>
          <h2 className="mt-3 mb-6">Who should consider this?</h2>
          <div className="bg-[var(--color-sand)]/50 border-l-4 border-[var(--color-gold)] p-6 rounded-r-lg">
            <p className="text-[var(--color-navy)] leading-relaxed">{data.whoShouldConsider}</p>
          </div>
        </div>
      </section>

      {/* Common mistakes */}
      <section className="py-16 bg-[var(--color-parchment)]">
        <div className="container-narrow">
          <span className="eyebrow">Watch out for</span>
          <h2 className="mt-3 mb-8">Common mistakes</h2>
          <ul className="space-y-4">
            {data.commonMistakes.map((m, i) => (
              <li key={i} className="flex gap-3 bg-white p-5 rounded-lg border border-[var(--color-silver)]/40">
                <AlertTriangle className="w-5 h-5 text-[var(--color-amber)] flex-shrink-0 mt-0.5" />
                <span className="text-sm text-[var(--color-navy)] leading-relaxed">{m}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* How PlanMyCashflows helps */}
      <section className="py-16">
        <div className="container-narrow">
          <span className="eyebrow">How we help</span>
          <h2 className="mt-3 mb-6">PlanMyCashflows + this product</h2>
          <p className="text-lg text-[var(--color-slate)] leading-relaxed">{data.howAurisHelps}</p>
          <div className="mt-8 flex gap-3 flex-wrap">
            <Link href="/plan" className="btn-primary">
              Open the Wealth Planner
            </Link>
            <a href={siteConfig.appUrl} target="_blank" rel="noreferrer" className="btn-outline inline-flex items-center gap-1.5">
              Open CashFlow Planner <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </section>

      {/* FAQs */}
      <section className="py-16 bg-[var(--color-parchment)]">
        <div className="container-narrow">
          <span className="eyebrow">Questions</span>
          <h2 className="mt-3 mb-8">Frequently asked</h2>
          <div className="space-y-3">
            {data.faqs.map((faq, i) => (
              <details key={i} className="bg-white p-5 rounded-lg border border-[var(--color-silver)]/40 group">
                <summary className="font-semibold text-[var(--color-navy)] cursor-pointer flex justify-between items-center">
                  {faq.question}
                  <span className="text-[var(--color-gold-dim)] group-open:rotate-180 transition-transform">⌄</span>
                </summary>
                <p className="mt-3 text-sm text-[var(--color-slate)] leading-relaxed">{faq.answer}</p>
              </details>
            ))}
          </div>
          <StructuredData data={faqSchema(data.faqs)} />
        </div>
      </section>

      {/* Related */}
      {data.relatedPosts && data.relatedPosts.length > 0 && (
        <section className="py-16">
          <div className="container-narrow">
            <span className="eyebrow">Read next</span>
            <h2 className="mt-3 mb-8">Related deep-dives</h2>
            <div className="space-y-2">
              {data.relatedPosts.map((p) => (
                <Link
                  key={p.slug}
                  href={`/blog/${p.slug}`}
                  className="flex items-center justify-between p-4 bg-white border border-[var(--color-silver)]/40 rounded-lg hover:border-[var(--color-gold)] transition-colors group"
                >
                  <span className="font-semibold text-[var(--color-navy)] group-hover:text-[var(--color-gold-dim)]">{p.title}</span>
                  <ArrowRight className="w-4 h-4 text-[var(--color-slate)] group-hover:text-[var(--color-gold-dim)]" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* Extra product-specific disclaimer */}
      {data.extraDisclaimer && (
        <div className="container-narrow pb-8">
          <div className="bg-[var(--color-amber)]/10 border border-[var(--color-amber)]/30 p-4 rounded-lg text-xs text-[var(--color-navy)] leading-relaxed">
            <strong>Please note:</strong> {data.extraDisclaimer}
          </div>
        </div>
      )}

      <CTASection
        title={`Get a personalised plan for ${data.name}`}
        subtitle="Run our free AI snapshot, or book a 30-minute call with Ashish."
        primaryCta={{ label: "Run my snapshot", href: "/ai-wealth-planner" }}
        secondaryCta={{ label: "Book a call", href: "/contact" }}
      />
    </>
  );
}
