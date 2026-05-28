"use client";

import { useState } from "react";
import { CalculatorWrapper } from "@/components/CalculatorWrapper";
import { fmtINR } from "@/lib/utils";

export default function EMICalculatorPage() {
  const [principal, setPrincipal] = useState(5000000);
  const [ratePct, setRatePct] = useState(8.5);
  const [years, setYears] = useState(20);

  const r = ratePct / 100 / 12;
  const n = years * 12;
  const emi = r === 0 ? principal / n : (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const totalPayment = emi * n;
  const totalInterest = totalPayment - principal;

  return (
    <CalculatorWrapper
      title="EMI Calculator"
      subtitle="Monthly EMI, total interest, and amortisation summary for any loan."
      notes="EMI is calculated on a reducing-balance basis (standard for home and personal loans in India). Actual bank EMIs may differ slightly due to processing fees, GST on interest, and prepayment terms."
    >
      <div className="grid md:grid-cols-3 gap-6">
        <Input label="Loan amount (₹)" value={principal} setValue={setPrincipal} min={100000} max={100000000} step={100000} />
        <Input label="Interest rate % p.a." value={ratePct} setValue={setRatePct} min={5} max={36} step={0.25} />
        <Input label="Tenure (years)" value={years} setValue={setYears} min={1} max={30} step={1} />
      </div>

      <div className="mt-8 grid sm:grid-cols-3 gap-4">
        <Stat label="Monthly EMI" value={fmtINR(emi)} color="#C9A84C" big />
        <Stat label="Total interest" value={fmtINR(totalInterest)} color="#EF4444" />
        <Stat label="Total payment" value={fmtINR(totalPayment)} />
      </div>

      <p className="mt-6 text-sm text-[var(--color-slate)] leading-relaxed">
        Over {years} years, you&apos;ll pay <strong>{fmtINR(totalInterest)}</strong> in interest — that&apos;s{" "}
        <strong>{((totalInterest / principal) * 100).toFixed(0)}%</strong> of the principal. Prepaying even ₹{(emi * 2 / 1000).toFixed(0)}k extra per year
        in early years can reduce total interest by 25-40%.
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

function Stat({ label, value, color = "#0A1628", big }: { label: string; value: string; color?: string; big?: boolean }) {
  return (
    <div className="bg-[var(--color-parchment)] rounded-xl p-5">
      <div className="text-xs uppercase tracking-wider font-semibold text-[var(--color-slate)] mb-2">{label}</div>
      <div className={`${big ? "text-3xl" : "text-xl"} font-semibold`} style={{ color, fontFamily: "var(--font-display)" }}>
        {value}
      </div>
    </div>
  );
}
