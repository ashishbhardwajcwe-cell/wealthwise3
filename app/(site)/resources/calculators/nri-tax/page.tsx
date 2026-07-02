"use client";

import { useState } from "react";
import { CalculatorWrapper } from "@/components/CalculatorWrapper";
import { fmtINR } from "@/lib/utils";

const COUNTRIES: { code: string; label: string; symbol: string; taxOnLT: number; taxOnST: number; note: string }[] = [
  { code: "US", label: "United States", symbol: "USD", taxOnLT: 15, taxOnST: 32, note: "LTCG 0-20% (varies by bracket; 15% mid-range)" },
  { code: "UK", label: "United Kingdom", symbol: "GBP", taxOnLT: 20, taxOnST: 40, note: "CGT 10-20% basic/higher rate" },
  { code: "UAE", label: "UAE", symbol: "AED", taxOnLT: 0, taxOnST: 0, note: "No personal CGT for residents" },
  { code: "SG", label: "Singapore", symbol: "SGD", taxOnLT: 0, taxOnST: 0, note: "No CGT for individuals" },
];

export default function NRITaxCalculatorPage() {
  const [country, setCountry] = useState("US");
  const [gain, setGain] = useState(500000);
  const [isLong, setIsLong] = useState(true);
  const indiaLTRate = 12.5;
  const indiaSTRate = 20;

  const ctry = COUNTRIES.find((c) => c.code === country)!;
  const indiaTaxRate = isLong ? indiaLTRate : indiaSTRate;
  const indiaTax = (gain * indiaTaxRate) / 100;

  const residentTaxRate = isLong ? ctry.taxOnLT : ctry.taxOnST;
  const residentTaxGross = (gain * residentTaxRate) / 100;
  // DTAA: typically you pay India tax first, then claim credit in resident country
  const ftcAvailable = Math.min(indiaTax, residentTaxGross);
  const residentTaxNet = Math.max(residentTaxGross - ftcAvailable, 0);
  const totalTax = indiaTax + residentTaxNet;
  const effectiveRate = (totalTax / gain) * 100;

  return (
    <CalculatorWrapper
      title="NRI Tax Calculator"
      subtitle="Approximate effective tax on India-source capital gains, accounting for DTAA foreign tax credit."
      notes="This is a directional estimate. Actual outcomes depend on your tax residency status, country-specific filings, ITR Schedule FA disclosures, and the specific instrument. Consult a CA / international tax advisor before transacting at scale."
    >
      <div className="grid md:grid-cols-3 gap-6">
        <div>
          <label className="text-sm font-semibold text-[var(--color-navy)] block mb-1.5">Resident country</label>
          <select value={country} onChange={(e) => setCountry(e.target.value)} className="w-full px-3 py-2.5 border border-[var(--color-silver)]/40 rounded text-sm bg-white">
            {COUNTRIES.map((c) => <option key={c.code} value={c.code}>{c.label}</option>)}
          </select>
          <p className="text-xs text-[var(--color-slate)] mt-2">{ctry.note}</p>
        </div>
        <Input label="Capital gain (₹)" value={gain} setValue={setGain} min={10000} max={50000000} step={10000} />
        <div>
          <label className="text-sm font-semibold text-[var(--color-navy)] block mb-1.5">Holding period</label>
          <div className="flex gap-2">
            <button onClick={() => setIsLong(true)} className={`flex-1 px-3 py-2.5 rounded text-sm font-semibold border ${isLong ? "bg-[var(--color-navy)] text-[var(--color-cream)] border-[var(--color-navy)]" : "bg-white border-[var(--color-silver)]"}`}>Long term (12+ mo)</button>
            <button onClick={() => setIsLong(false)} className={`flex-1 px-3 py-2.5 rounded text-sm font-semibold border ${!isLong ? "bg-[var(--color-navy)] text-[var(--color-cream)] border-[var(--color-navy)]" : "bg-white border-[var(--color-silver)]"}`}>Short term</button>
          </div>
        </div>
      </div>

      <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="India tax" value={fmtINR(indiaTax)} sub={`${indiaTaxRate}% rate`} />
        <Stat label={`${ctry.label} tax (gross, ₹ equivalent)`} value={fmtINR(residentTaxGross)} sub={`${residentTaxRate}% rate`} />
        <Stat label="FTC available (DTAA)" value={fmtINR(ftcAvailable)} color="#10B981" />
        <Stat label="Total effective tax" value={`${effectiveRate.toFixed(1)}%`} color="#C9A84C" big sub={fmtINR(totalTax)} />
      </div>

      <p className="mt-6 text-sm text-[var(--color-slate)] leading-relaxed">
        Under DTAA between India and your resident country, the tax paid in India is usually creditable against your resident-country tax liability,
        avoiding double taxation. The effective tax rate is typically the <strong>higher</strong> of the two countries&apos; rates.
      </p>
    </CalculatorWrapper>
  );
}

function Input({ label, value, setValue, min, max, step }: { label: string; value: number; setValue: (v: number) => void; min: number; max: number; step: number }) {
  return (
    <div>
      <label className="text-sm font-semibold text-[var(--color-navy)] block mb-1.5">{label}</label>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => setValue(Number(e.target.value))} className="w-full accent-[var(--color-gold)]" />
      <input type="number" value={value} onChange={(e) => setValue(Number(e.target.value))} className="w-full mt-1.5 px-3 py-2 border border-[var(--color-silver)]/40 rounded text-sm" />
    </div>
  );
}

function Stat({ label, value, color = "#0A1628", big, sub }: { label: string; value: string; color?: string; big?: boolean; sub?: string }) {
  return (
    <div className="bg-[var(--color-parchment)] rounded-xl p-5">
      <div className="text-xs uppercase tracking-wider font-semibold text-[var(--color-slate)] mb-2">{label}</div>
      <div className={`${big ? "text-3xl" : "text-xl"} font-semibold`} style={{ color, fontFamily: "var(--font-display)" }}>
        {value}
      </div>
      {sub && <div className="text-xs text-[var(--color-slate)] mt-1">{sub}</div>}
    </div>
  );
}
