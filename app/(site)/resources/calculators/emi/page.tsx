"use client";

import { useState } from "react";
import { CalculatorWrapper } from "@/components/CalculatorWrapper";
import { CalcInput } from "@/components/calculators/CalcInput";
import { fmtINR } from "@/lib/utils";

export default function EMICalculatorPage() {
  const [principal, setPrincipal] = useState(5000000);
  const [ratePct, setRatePct] = useState(8.5);
  const [years, setYears] = useState(20);

  const r = ratePct / 100 / 12;
  const n = years * 12;
  // n === 0 would make the zero-rate branch divide by zero; both inputs are
  // clamped to a positive minimum, but the guard keeps the maths total.
  const emi = n <= 0 ? 0 : r === 0 ? principal / n : (principal * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  const totalPayment = emi * n;
  const totalInterest = totalPayment - principal;
  // Interest as a share of principal — "NaN%" when the principal was cleared.
  const interestPctOfPrincipal = principal > 0 ? (totalInterest / principal) * 100 : 0;

  return (
    <CalculatorWrapper
      title="EMI Calculator"
      subtitle="Monthly EMI, total interest, and amortisation summary for any loan."
      notes="EMI is calculated on a reducing-balance basis (standard for home and personal loans in India). Actual bank EMIs may differ slightly due to processing fees, GST on interest, and prepayment terms."
    >
      <div className="grid md:grid-cols-3 gap-6">
        <CalcInput label="Loan amount (₹)" value={principal} setValue={setPrincipal} min={100000} max={100000000} step={100000} />
        <CalcInput label="Interest rate % p.a." value={ratePct} setValue={setRatePct} min={5} max={36} step={0.25} />
        <CalcInput label="Tenure (years)" value={years} setValue={setYears} min={1} max={30} step={1} />
      </div>

      <div className="mt-8 grid sm:grid-cols-3 gap-4">
        <Stat label="Monthly EMI" value={fmtINR(emi)} color="#C9A84C" big />
        <Stat label="Total interest" value={fmtINR(totalInterest)} color="#EF4444" />
        <Stat label="Total payment" value={fmtINR(totalPayment)} />
      </div>

      <p className="mt-6 text-sm text-[var(--color-slate)] leading-relaxed">
        Over {years} years, you&apos;ll pay <strong>{fmtINR(totalInterest)}</strong> in interest — that&apos;s{" "}
        <strong>{interestPctOfPrincipal.toFixed(0)}%</strong> of the principal. Prepaying even ₹{(emi * 2 / 1000).toFixed(0)}k extra per year
        in early years can reduce total interest by 25-40%.
      </p>
    </CalculatorWrapper>
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
