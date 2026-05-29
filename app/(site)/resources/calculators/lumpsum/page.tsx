"use client";

import { useState } from "react";
import { CalculatorWrapper } from "@/components/CalculatorWrapper";
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
        <Input label="Amount (₹)" value={amount} setValue={setAmount} min={1000} max={100000000} step={1000} />
        <Input label="Return % p.a." value={returnPct} setValue={setReturnPct} min={1} max={25} step={0.5} />
        <Input label="Years" value={years} setValue={setYears} min={1} max={40} step={1} />
      </div>
      <div className="mt-8 grid sm:grid-cols-3 gap-4">
        <Stat label="Invested" value={fmtINR(amount)} />
        <Stat label="Gain" value={fmtINR(gain)} color="#10B981" />
        <Stat label="Future value" value={fmtINR(value)} color="#C9A84C" big />
      </div>
    </CalculatorWrapper>
  );
}

function Input({ label, value, setValue, min, max, step }: { label: string; value: number; setValue: (v: number) => void; min: number; max: number; step: number }) {
  return (
    <div>
      <label className="text-sm font-semibold text-[var(--color-navy)] block mb-1.5">{label}</label>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => setValue(Number(e.target.value))} className="w-full accent-[var(--color-gold)]" />
      <input type="number" value={value} onChange={(e) => setValue(Number(e.target.value))} className="w-full mt-2 px-3 py-2 border border-[var(--color-silver)]/40 rounded text-sm" />
    </div>
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
