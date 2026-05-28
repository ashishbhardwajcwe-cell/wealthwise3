import { siteConfig } from "@/lib/site-config";

export function DisclaimerBanner() {
  return (
    <div className="bg-[var(--color-sand)]/40 border-t border-[var(--color-silver)]/30">
      <div className="container-wide py-6 text-xs text-[var(--color-slate)] space-y-2">
        <p>
          <strong>{siteConfig.name}</strong> is a brand of {siteConfig.legalName} (CIN: {siteConfig.cin}).
          The content on this site is for educational purposes only and does not constitute investment, legal, or tax advice.
        </p>
        <p>
          Investments in mutual funds, PMS, AIF, equities, cryptocurrencies, and other instruments are subject to market risks.
          Past performance is not indicative of future returns. Please read all scheme-related documents carefully and consult a
          SEBI-registered investment adviser, chartered accountant, and tax professional in your jurisdiction before making investment decisions.
        </p>
        <p>
          {siteConfig.name}, its directors, employees, and contractors do not guarantee any returns and are not liable for any losses
          arising from decisions based on the content of this site.
        </p>
      </div>
    </div>
  );
}
