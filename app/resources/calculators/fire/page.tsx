"use client";

import { useState } from "react";
import { CalculatorWrapper } from "@/components/CalculatorWrapper";
import { fmtINR, sipFutureValue } from "@/lib/utils";

export default function FIRECalculatorPage() {
  const [age, setAge] = useState(30);
  const [monthlySaving, setMonthlySaving] = useState(80000);
  const [currentCorpus, setCurrentCorpus] = useState(2500000);
  const [annualExpenses, setAnnualExpenses] = useState(960000);
  const [returnPct, setReturnPct] = useState(11);
  const [swr, setSwr] = useState(4);

  // FIRE corpus = annual expenses / SWR
  const fireCorpus = annualExpenses / (swr / 100);

  // Simulate year by year
  let corpus = currentCorpus;
  let yearsToFire = 0;
  for (let y = 1; y <= 60; y++) {
    corpus = corpus * (1 + returnPct / 100) + monthlySaving * 12 * (1 + returnPct / 100 / 2);
    if (corpus >= fireCorpus) {
      yearsToFire = y;
      break;
    }
  }

  const fireAge = age + yearsToFire;

  return (
    <CalculatorWrapper
      title="FIRE Calculator"
      subtitle="Financial Independence, Retire Early. When does work become optional for you?"
      notes="Uses the 4% Safe Withdrawal Rate (Trinity Study) by default. Indian investors often use 3-3.5% for more conservative SWR given different inflation/return profile vs US data."
    >
      <div className="grid md:grid-cols-2 gap-4">
        <Input label="Current age" value={age} setValue={setAge} min={20} max={60} step={1} />
        <Input label="Current invested (₹)" value={currentCorpus} setValue={setCurrentCorpus} min={0} max={500000000} step={100000} />
        <Input label="Monthly savings (₹)" value={monthlySaving} setValue={setMonthlySaving} min={5000} max={1000000} step={5000} />
        <Input label="Annual living expenses (₹)" value={annualExpenses} setValue={setAnnualExpenses} min={100000} max={20000000} step={50000} />
        <Input label="Expected return % p.a." value={returnPct} setValue={setReturnPct} min={4} max={18} step={0.5} />
        <Input label="Safe Withdrawal Rate %" value={swr} setValue={setSwr} min={2.5} max={5} step={0.25} />
      </div>

      <div className="mt-8 grid sm:grid-cols-3 gap-4">
        <Stat label="FIRE corpus needed" value={fmtINR(fireCorpus)} />
        <Stat label="Years to FIRE" value={yearsToFire > 0 ? `${yearsToFire} years` : "60+"} color="#0891B2" big />
        <Stat label="Age at FIRE" value={yearsToFire > 0 ? `${fireAge}` : "—"} color="#C9A84C" big />
      </div>

      <p className="mt-6 text-sm text-[var(--color-slate)] leading-relaxed">
        At a {swr}% withdrawal rate, your FIRE corpus would generate {fmtINR(annualExpenses)} per year in retirement.
        Most FIRE practitioners use a 3.5-4% SWR for a 30+ year horizon.
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
