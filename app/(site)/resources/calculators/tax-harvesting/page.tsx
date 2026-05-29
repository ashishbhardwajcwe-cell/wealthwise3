"use client";

import { useState } from "react";
import { CalculatorWrapper } from "@/components/CalculatorWrapper";
import { fmtINR } from "@/lib/utils";

const LTCG_EXEMPTION = 125000;
const LTCG_RATE = 0.125;

export default function TaxHarvestingCalculatorPage() {
  const [unrealisedGain, setUnrealisedGain] = useState(800000);
  const [yearsToFinalSale, setYearsToFinalSale] = useState(10);
  const [annualReturnPct, setAnnualReturnPct] = useState(11);

  const annualHarvest = Math.min(unrealisedGain, LTCG_EXEMPTION);
  const totalHarvested = annualHarvest * yearsToFinalSale;
  const taxSaved = totalHarvested * LTCG_RATE;

  // Crude estimate of future portfolio value
  const corpusFV = unrealisedGain * Math.pow(1 + annualReturnPct / 100, yearsToFinalSale);

  return (
    <CalculatorWrapper
      title="Tax Harvesting Estimator"
      subtitle="How much LTCG tax you can save annually by harvesting up to ₹1.25 lakh of long-term equity gains tax-free."
      notes="This is an estimate. Actual savings depend on your specific holdings, costs, and execution. Tax harvesting requires actually executing a sale and re-purchase — not just on paper. Direct plans on Coin, Kuvera, MFCentral are easiest."
    >
      <div className="grid md:grid-cols-3 gap-6">
        <Input label="Current unrealised LTCG (₹)" value={unrealisedGain} setValue={setUnrealisedGain} min={50000} max={50000000} step={25000} />
        <Input label="Years until final sale" value={yearsToFinalSale} setValue={setYearsToFinalSale} min={1} max={40} step={1} />
        <Input label="Expected return % p.a." value={annualReturnPct} setValue={setAnnualReturnPct} min={4} max={18} step={0.5} />
      </div>

      <div className="mt-8 grid sm:grid-cols-3 gap-4">
        <Stat label="Annual harvest (₹)" value={fmtINR(annualHarvest)} />
        <Stat label={`Total harvested over ${yearsToFinalSale} years`} value={fmtINR(totalHarvested)} color="#10B981" />
        <Stat label="Tax saved (lifetime)" value={fmtINR(taxSaved)} color="#C9A84C" big />
      </div>

      <div className="mt-8 p-5 bg-[var(--color-parchment)] rounded-xl border border-[var(--color-gold)]/20 text-sm leading-relaxed">
        <p>
          <strong>How it works:</strong> Each financial year, you can realise up to ₹{LTCG_EXEMPTION.toLocaleString("en-IN")} of long-term capital gains
          (on equity / equity MFs held more than 12 months) <strong>tax-free</strong>. Sell units to realise the gain, then immediately re-buy the same units.
          Your economic position is unchanged, but you&apos;ve permanently shifted that ₹{LTCG_EXEMPTION.toLocaleString("en-IN")} out of the taxable bucket.
        </p>
        <p className="mt-3">
          Over a 10-15 year holding period, this typically saves a serious investor <strong>₹1.5L to ₹4L</strong> in eventual tax — without changing the
          underlying portfolio at all.
        </p>
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
      <div className={`${big ? "text-3xl" : "text-xl"} font-semibold`} style={{ color, fontFamily: "var(--font-display)" }}>
        {value}
      </div>
    </div>
  );
}
