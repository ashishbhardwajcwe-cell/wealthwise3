"use client";

import { useState } from "react";
import { CalculatorWrapper } from "@/components/CalculatorWrapper";
import { CalcInput } from "@/components/calculators/CalcInput";
import { fmtINR, fv } from "@/lib/utils";

export default function LumpsumCalculatorPage() {
  const [amount, setAmount] = useState(500000);
  const [returnPct, setReturnPct] = useState(12);
  const [years, setYears] = useState(15);
  const value = fv(amount, returnPct / 100, years);
  const gain = value - amount;

  return (
    <CalculatorWrapper
      title="Lumpsum Calculator"
      subtitle="Future value of a one-time investment at a given expected return."
      notes="Returns are illustrative based on a fixed CAGR — actual market returns vary year-to-year."
    >
      <div className="grid md:grid-cols-3 gap-6">
        <CalcInput label="Amount (₹)" value={amount} setValue={setAmount} min={1000} max={100000000} step={1000} />
        <CalcInput label="Return % p.a." value={returnPct} setValue={setReturnPct} min={1} max={25} step={0.5} />
        <CalcInput label="Years" value={years} setValue={setYears} min={1} max={40} step={1} />
      </div>
      <div className="mt-8 grid sm:grid-cols-3 gap-4">
        <Stat label="Invested" value={fmtINR(amount)} />
        <Stat label="Gain" value={fmtINR(gain)} color="#10B981" />
        <Stat label="Future value" value={fmtINR(value)} color="#C9A84C" big />
      </div>
    </CalculatorWrapper>
  );
}

function Stat({ label, value, color = "#0A1628", big }: { label: string; value: string; color?: string; big?: boolean }) {
  return (
    <div className="bg-[var(--color-parchment)] rounded-xl p-5">
      <div className="text-xs uppercase tracking-wider font-semibold text-[var(--color-slate)] mb-2">{label}</div>
      <div className={`${big ? "text-3xl" : "text-2xl"} font-semibold`} style={{ color, fontFamily: "var(--font-display)" }}>
        {value}
      </div>
    </div>
  );
}
