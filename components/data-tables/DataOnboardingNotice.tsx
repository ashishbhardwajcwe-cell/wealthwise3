import Link from "next/link";
import { Database } from "lucide-react";

/**
 * Shown in place of the PMS / AIF live tables while their datasets are
 * empty — a designed placeholder beats a silently missing section.
 */
export function DataOnboardingNotice({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <section className="py-16 bg-white">
      <div className="container-wide">
        <div className="max-w-2xl mx-auto text-center border border-dashed border-[var(--color-silver)]/60 rounded-2xl px-8 py-14 bg-[var(--color-parchment)]/40">
          <div className="w-12 h-12 mx-auto rounded-xl bg-[var(--color-navy)] text-[var(--color-gold)] flex items-center justify-center mb-5">
            <Database className="w-5 h-5" />
          </div>
          <h2 className="text-xl md:text-2xl mb-3">{title}</h2>
          <p className="text-sm text-[var(--color-slate)] leading-relaxed mb-6">{description}</p>
          <Link href="/contact" className="btn-outline text-sm">
            Ask us about a specific strategy →
          </Link>
        </div>
      </div>
    </section>
  );
}
