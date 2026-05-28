"use client";

import { useState } from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { CalculatorWrapper } from "@/components/CalculatorWrapper";
import { fmtINR, sipFutureValue } from "@/lib/utils";

export default function SIPCalculatorPage() {
  const [monthly, setMonthly] = useState(10000);
  const [returnPct, setReturnPct] = useState(12);
  const [years, setYears] = useState(20);

  const total = monthly * 12 * years;
  const fv = sipFutureValue(monthly, returnPct / 100, years);
  const gain = fv - total;

  const data: { year: number; invested: number; value: number }[] = [];
  for (let y = 1; y <= years; y++) {
    const v = sipFutureValue(monthly, returnPct / 100, y);
    data.push({ year: y, invested: monthly * 12 * y, value: Math.round(v) });
  }

  return (
    <CalculatorWrapper
      title="SIP Calculator"
      subtitle="Project the future value of monthly investments at a given expected return."
      notes="Returns shown are based on a fixed CAGR assumption — actual market returns vary year-to-year. Indian equity has historically delivered 10-14% CAGR over 10+ year periods; this is not a guarantee of future returns."
    >
      <div className="grid md:grid-cols-3 gap-6">
        <Slider label="Monthly SIP (₹)" min={500} max={500000} step={500} value={monthly} setValue={setMonthly} format={(v) => fmtINR(v)} />
        <Slider label="Expected return (% p.a.)" min={4} max={20} step={0.5} value={returnPct} setValue={setReturnPct} format={(v) => `${v}%`} />
        <Slider label="Years" min={1} max={40} step={1} value={years} setValue={setYears} format={(v) => `${v}y`} />
      </div>

      <div className="mt-8 grid sm:grid-cols-3 gap-4">
        <Stat label="Total invested" value={fmtINR(total)} />
        <Stat label="Estimated gain" value={fmtINR(gain)} color="#10B981" />
        <Stat label="Future value" value={fmtINR(fv)} color="#C9A84C" big />
      </div>

      <div className="mt-8 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="year" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => fmtINR(v)} tick={{ fontSize: 11 }} width={70} />
            <Tooltip formatter={(v: number) => fmtINR(v)} />
            <Line type="monotone" dataKey="invested" stroke="#5A6B80" strokeWidth={2} dot={false} name="Invested" />
            <Line type="monotone" dataKey="value" stroke="#C9A84C" strokeWidth={2.5} dot={false} name="Value" />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </CalculatorWrapper>
  );
}

function Slider({ label, min, max, step, value, setValue, format }: {
  label: string; min: number; max: number; step: number; value: number; setValue: (v: number) => void; format: (v: number) => string;
}) {
  return (
    <div>
      <div className="flex justify-between mb-1.5">
        <label className="text-sm font-semibold text-[var(--color-navy)]">{label}</label>
        <span className="text-sm font-semibold text-[var(--color-gold-dim)]">{format(value)}</span>
      </div>
      <input
        type="range" min={min} max={max} step={step} value={value}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full accent-[var(--color-gold)]"
      />
      <input
        type="number" value={value} min={min} max={max} step={step}
        onChange={(e) => setValue(Number(e.target.value))}
        className="w-full mt-2 px-3 py-2 border border-[var(--color-silver)]/40 rounded text-sm"
      />
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
