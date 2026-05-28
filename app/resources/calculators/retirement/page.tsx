"use client";

import { useState } from "react";
import { CalculatorWrapper } from "@/components/CalculatorWrapper";
import { fmtINR, fv, sipRequired } from "@/lib/utils";

export default function RetirementCalculatorPage() {
  const [age, setAge] = useState(35);
  const [retireAge, setRetireAge] = useState(60);
  const [lifeExp, setLifeExp] = useState(85);
  const [monthlyExp, setMonthlyExp] = useState(80000);
  const [inflation, setInflation] = useState(6);
  const [returnPre, setReturnPre] = useState(11);
  const [returnPost, setReturnPost] = useState(7);
  const [currentCorpus, setCurrentCorpus] = useState(2000000);

  const yToRet = Math.max(retireAge - age, 1);
  const yInRet = Math.max(lifeExp - retireAge, 1);
  const expAtRet = fv(monthlyExp * 12, inflation / 100, yToRet);

  // Corpus required: PV of annuity over retirement years (with real return = post-retirement return - inflation)
  const realR = (returnPost / 100 - inflation / 100) / (1 + inflation / 100);
  const corpus = realR > 0
    ? (expAtRet * (1 - Math.pow(1 + realR, -yInRet))) / realR
    : expAtRet * yInRet;

  const futureValueOfCurrent = fv(currentCorpus, returnPre / 100, yToRet);
  const remainingNeed = Math.max(corpus - futureValueOfCurrent, 0);
  const sipNeeded = sipRequired(remainingNeed, returnPre / 100, yToRet);

  return (
    <CalculatorWrapper
      title="Retirement Corpus Calculator"
      subtitle="How much you need at retirement, and the monthly SIP to get there."
      notes="Uses inflation-adjusted (real) return for the post-retirement drawdown phase. Returns and inflation are assumptions, not guarantees. Indian historical inflation has averaged ~6% over the last 20 years."
    >
      <div className="grid md:grid-cols-2 gap-4">
        <Input label="Current age" value={age} setValue={setAge} min={20} max={70} step={1} />
        <Input label="Target retirement age" value={retireAge} setValue={setRetireAge} min={age + 1} max={75} step={1} />
        <Input label="Life expectancy" value={lifeExp} setValue={setLifeExp} min={retireAge + 1} max={100} step={1} />
        <Input label="Monthly expenses today (₹)" value={monthlyExp} setValue={setMonthlyExp} min={10000} max={1000000} step={5000} />
        <Input label="Current invested corpus (₹)" value={currentCorpus} setValue={setCurrentCorpus} min={0} max={500000000} step={100000} />
        <Input label="Inflation % p.a." value={inflation} setValue={setInflation} min={2} max={12} step={0.5} />
        <Input label="Return pre-retirement %" value={returnPre} setValue={setReturnPre} min={4} max={18} step={0.5} />
        <Input label="Return post-retirement %" value={returnPost} setValue={setReturnPost} min={3} max={12} step={0.5} />
      </div>

      <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <Stat label="Monthly expenses at retirement" value={fmtINR(expAtRet / 12)} />
        <Stat label="Corpus needed at retirement" value={fmtINR(corpus)} color="#0891B2" big />
        <Stat label={`Your existing ₹${(currentCorpus / 100000).toFixed(0)}L grows to`} value={fmtINR(futureValueOfCurrent)} />
        <Stat label="Gap to bridge" value={fmtINR(remainingNeed)} color="#EF4444" />
        <Stat label="SIP needed (₹/month)" value={fmtINR(sipNeeded)} color="#C9A84C" big />
      </div>
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
      <div className={`${big ? "text-2xl" : "text-xl"} font-semibold`} style={{ color, fontFamily: "var(--font-display)" }}>
        {value}
      </div>
    </div>
  );
}
