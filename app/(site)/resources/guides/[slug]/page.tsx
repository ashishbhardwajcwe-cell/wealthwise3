import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Users } from "lucide-react";
import { GUIDES } from "@/lib/guide-data";
import { StructuredData, articleSchema } from "@/components/StructuredData";
import { PrintButton } from "@/components/PrintButton";
import { siteConfig } from "@/lib/site-config";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return Object.keys(GUIDES).map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const guide = GUIDES[slug];
  if (!guide) return { title: "Guide not found" };
  return {
    title: guide.title,
    description: guide.subtitle,
    openGraph: {
      title: guide.title,
      description: guide.subtitle,
      type: "article",
    },
  };
}

export default async function GuidePage({ params }: Props) {
  const { slug } = await params;
  const guide = GUIDES[slug];
  if (!guide) notFound();

  return (
    <>
      <article className="py-16 md:py-20">
        <div className="container-narrow">
          <Link href="/resources/downloads" className="inline-flex items-center gap-1.5 text-sm font-semibold text-[var(--color-slate)] hover:text-[var(--color-gold-dim)] mb-8">
            <ArrowLeft className="w-4 h-4" /> All guides
          </Link>

          <span className="eyebrow">Free Guide</span>
          <h1 className="mt-4 text-balance">{guide.title}</h1>
          <p className="mt-4 text-xl text-[var(--color-slate)] text-balance leading-relaxed">{guide.subtitle}</p>

          <div className="mt-8 flex items-center gap-5 text-sm text-[var(--color-slate)] flex-wrap">
            <span className="inline-flex items-center gap-1.5">
              <Users className="w-4 h-4" /> For {guide.audience}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Clock className="w-4 h-4" /> {guide.readTime} read
            </span>
            <PrintButton />
          </div>

          {/* Intro */}
          <div className="prose-article mt-10">
            {guide.intro.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          {/* Sections */}
          <div className="prose-article mt-10">
            {guide.sections.map((section, i) => (
              <section key={i}>
                <h2>{section.heading}</h2>
                {section.paragraphs.map((p, j) => (
                  <p key={j}>{p}</p>
                ))}
                {section.bullets && (
                  <ul>
                    {section.bullets.map((b, k) => (
                      <li key={k}>{b}</li>
                    ))}
                  </ul>
                )}
              </section>
            ))}
          </div>

          {/* Checklist */}
          <div className="mt-12 p-6 md:p-8 bg-[var(--color-parchment)] rounded-2xl border border-[var(--color-gold)]/30">
            <h3 className="text-xl font-semibold text-[var(--color-navy)] mb-5">{guide.checklist.title}</h3>
            <ul className="space-y-3">
              {guide.checklist.items.map((item, i) => (
                <li key={i} className="flex gap-3 items-start text-[var(--color-navy)]">
                  <span className="w-6 h-6 rounded-full bg-[var(--color-gold)] text-[var(--color-navy)] flex items-center justify-center text-xs font-semibold flex-shrink-0 mt-0.5">
                    {i + 1}
                  </span>
                  <span className="leading-relaxed">{item}</span>
                </li>
              ))}
            </ul>
          </div>

          {/* Closing */}
          <div className="prose-article mt-10">
            {guide.closing.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </div>

          {/* CTA */}
          <div className="mt-12 p-6 md:p-8 bg-[var(--color-navy)] text-[var(--color-cream)] rounded-2xl">
            <h3 className="text-xl font-semibold text-[var(--color-cream)] mb-3">Ready to apply this to your situation?</h3>
            <p className="text-[var(--color-silver)] mb-6 leading-relaxed">
              The Auris Wealth Planner turns this framework into a personalised plan in 60 seconds. Or book a free 30-minute call with Ashish.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/ai-wealth-planner" className="btn-primary justify-center">Run the AI Planner</Link>
              <Link href="/contact" className="inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg border border-white/40 text-white font-semibold text-sm hover:bg-white/10 transition-colors">
                Book a call
              </Link>
            </div>
          </div>

          {/* Author footer */}
          <div className="mt-12 p-6 bg-white border border-[var(--color-silver)]/40 rounded-xl">
            <h4 className="font-semibold text-[var(--color-navy)]">Col Ashish Bhardwaj</h4>
            <p className="text-sm text-[var(--color-slate)] mt-1 leading-relaxed">
              Founder of Auris Wealth. Ex-Indian Army (20 years). NISM-certified Investment Adviser.
              Writes guides like this one for Indian and global investors who want clarity, not products.
            </p>
          </div>

          {/* Disclaimer */}
          <div className="mt-10 text-xs text-[var(--color-slate)] leading-relaxed italic">
            This guide is for educational purposes only and does not constitute investment, legal, or tax advice.
            Please consult a SEBI-registered investment adviser before making investment decisions.
          </div>
        </div>
      </article>

      <StructuredData
        data={articleSchema({
          title: guide.title,
          description: guide.subtitle,
          author: "Col Ashish Bhardwaj",
          date: "2026-05-29",
          url: `${siteConfig.url}/resources/guides/${slug}`,
        })}
      />
    </>
  );
}

