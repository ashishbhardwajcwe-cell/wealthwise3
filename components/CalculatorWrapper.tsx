import Link from "next/link";

interface CalculatorWrapperProps {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  notes?: string;
}

export function CalculatorWrapper({ title, subtitle, children, notes }: CalculatorWrapperProps) {
  return (
    <div className="py-16">
      <div className="container-narrow">
        <span className="eyebrow">Calculator</span>
        <h1 className="mt-3">{title}</h1>
        <p className="mt-3 text-lg text-[var(--color-slate)] max-w-2xl">{subtitle}</p>

        <div className="mt-10 bg-white border border-[var(--color-silver)]/40 rounded-2xl shadow-sm p-6 md:p-8">
          {children}
        </div>

        {notes && <p className="mt-6 text-xs text-[var(--color-slate)] italic leading-relaxed">{notes}</p>}

        <div className="mt-10 p-6 bg-[var(--color-parchment)] rounded-xl border border-[var(--color-gold)]/20">
          <p className="text-sm text-[var(--color-slate)] leading-relaxed">
            Want this analysis applied to your actual portfolio with real numbers?{" "}
            <Link href="/plan" className="font-semibold text-[var(--color-gold-dim)]">
              Open the Wealth Planner →
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
