import { ChevronDown } from "lucide-react";
import { homeFaqs } from "@/lib/home-content";

/**
 * FAQ accordion built on native <details>/<summary> — keyboard-accessible
 * with zero client JS. FAQPage JSON-LD is emitted by the page itself.
 */
export function HomeFaq() {
  return (
    <div className="max-w-3xl mx-auto space-y-3">
      {homeFaqs.map((faq) => (
        <details key={faq.question} className="group bg-white rounded-xl border border-[var(--color-silver)]/40 open:border-[var(--color-gold)]/60 transition-colors">
          <summary className="flex items-center justify-between gap-4 cursor-pointer list-none px-5 py-4 text-sm md:text-base font-semibold text-[var(--color-navy)] [&::-webkit-details-marker]:hidden">
            {faq.question}
            <ChevronDown className="w-4 h-4 shrink-0 text-[var(--color-slate)] transition-transform group-open:rotate-180" aria-hidden />
          </summary>
          <p className="px-5 pb-5 text-sm text-[var(--color-slate)] leading-relaxed">{faq.answer}</p>
        </details>
      ))}
    </div>
  );
}
