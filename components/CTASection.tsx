import Link from "next/link";

interface CTASectionProps {
  title: string;
  subtitle?: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  dark?: boolean;
}

export function CTASection({ title, subtitle, primaryCta, secondaryCta, dark = true }: CTASectionProps) {
  return (
    <section className={dark ? "gradient-navy text-[var(--color-cream)]" : "bg-[var(--color-parchment)]"}>
      <div className="container-wide py-20 md:py-24 text-center reveal">
        <h2 className={dark ? "text-[var(--color-cream)] max-w-3xl mx-auto text-balance" : "text-balance max-w-3xl mx-auto"}>
          {title}
        </h2>
        {subtitle && (
          <p className={`mt-5 max-w-2xl mx-auto text-lg ${dark ? "text-[var(--color-silver)]" : "text-[var(--color-slate)]"}`}>
            {subtitle}
          </p>
        )}
        <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
          <Link href={primaryCta.href} className="btn-primary">
            {primaryCta.label}
          </Link>
          {secondaryCta && (
            <Link
              href={secondaryCta.href}
              className={
                dark
                  ? "inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg border-1.5 border-white/40 text-white font-semibold text-sm hover:bg-white/10 transition-colors"
                  : "btn-outline"
              }
            >
              {secondaryCta.label}
            </Link>
          )}
        </div>
      </div>
    </section>
  );
}
