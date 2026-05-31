import { Check } from "lucide-react";
import { Hero } from "@/components/Hero";
import { CTASection } from "@/components/CTASection";

export interface AudienceContent {
  eyebrow: string;
  title: string;
  subtitle: string;
  intro: string[];
  whatYouGet: string[];
  commonSituations: { title: string; copy: string }[];
  ctaTitle: string;
}

export function AudienceLanding({ content }: { content: AudienceContent }) {
  return (
    <>
      <Hero
        eyebrow={content.eyebrow}
        title={content.title}
        subtitle={content.subtitle}
        primaryCta={{ label: "Try the AI Wealth Planner", href: "/ai-wealth-planner" }}
        secondaryCta={{ label: "Book a call", href: "/contact" }}
      />

      <section className="py-20">
        <div className="container-narrow prose-article">
          {content.intro.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
      </section>

      <section className="py-20 bg-[var(--color-parchment)]">
        <div className="container-narrow">
          <span className="eyebrow">What you get</span>
          <h2 className="mt-3 mb-8">Designed around your reality</h2>
          <ul className="space-y-3">
            {content.whatYouGet.map((item, i) => (
              <li key={i} className="flex gap-3 items-start p-4 bg-white border border-[var(--color-silver)]/40 rounded-lg">
                <Check className="w-5 h-5 text-[var(--color-emerald)] flex-shrink-0 mt-0.5" />
                <span className="text-[var(--color-navy)] leading-relaxed">{item}</span>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="py-20">
        <div className="container-narrow">
          <span className="eyebrow">Common situations</span>
          <h2 className="mt-3 mb-8">Situations we see all the time</h2>
          <div className="space-y-5">
            {content.commonSituations.map((s, i) => (
              <div key={i} className="card-soft">
                <h3 className="text-lg font-semibold mb-2">{s.title}</h3>
                <p className="text-[var(--color-slate)] leading-relaxed">{s.copy}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <CTASection
        title={content.ctaTitle}
        subtitle="Start with the free AI Wealth Planner, or book a 30-minute call."
        primaryCta={{ label: "Run my snapshot", href: "/ai-wealth-planner" }}
        secondaryCta={{ label: "Book a call", href: "/contact" }}
      />
    </>
  );
}
