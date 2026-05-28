import Link from "next/link";
import { cn } from "@/lib/utils";

interface HeroProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  primaryCta?: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  trustLine?: string;
  align?: "left" | "center";
  className?: string;
  children?: React.ReactNode;
}

export function Hero({
  eyebrow,
  title,
  subtitle,
  primaryCta,
  secondaryCta,
  trustLine,
  align = "center",
  className,
  children,
}: HeroProps) {
  return (
    <section className={cn("gradient-hero", className)}>
      <div
        className={cn(
          "container-wide py-20 md:py-28 flex flex-col",
          align === "center" ? "items-center text-center" : "items-start text-left",
        )}
      >
        {eyebrow && <span className="eyebrow mb-4">{eyebrow}</span>}
        <h1 className="max-w-4xl text-balance">{title}</h1>
        {subtitle && (
          <p className="mt-6 max-w-2xl text-lg md:text-xl text-[var(--color-slate)] leading-relaxed text-balance">
            {subtitle}
          </p>
        )}
        {(primaryCta || secondaryCta) && (
          <div className={cn("mt-8 flex flex-col sm:flex-row gap-3", align === "center" ? "items-center" : "items-start")}>
            {primaryCta && (
              <Link href={primaryCta.href} className="btn-primary">
                {primaryCta.label}
              </Link>
            )}
            {secondaryCta && (
              <Link href={secondaryCta.href} className="btn-outline">
                {secondaryCta.label}
              </Link>
            )}
          </div>
        )}
        {trustLine && (
          <p className="mt-8 text-xs text-[var(--color-slate)] uppercase tracking-wider">{trustLine}</p>
        )}
        {children}
      </div>
    </section>
  );
}
