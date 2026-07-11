"use client";

import { useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { CalculatorWrapper } from "@/components/CalculatorWrapper";
import { fmtINR } from "@/lib/utils";

interface YearRow {
  year: number;
  gross: number;
  fixedFee: number;
  perfFee: number;
  net: number;
  mf: number;
}

/**
 * Illustrative PMS fee model:
 * - Gross return compounds yearly; the fixed fee is charged on the
 *   year-end (pre-fee) value.
 * - The performance fee applies to gains above the hurdle — and, when the
 *   high-watermark toggle is on, only above the highest previous year-end
 *   net value as well.
 * - The mutual-fund comparison approximates a 1% TER by reducing the gross
 *   return by one percentage point.
 * Actual fee mechanics vary by manager (charging frequency, averaging,
 * catch-up clauses) — treat outputs as directional, not exact.
 */
function simulate(
  corpus: number,
  grossPct: number,
  fixedPct: number,
  perfPct: number,
  hurdlePct: number,
  highWatermark: boolean,
  years: number,
): YearRow[] {
  const rows: YearRow[] = [];
  let net = corpus;
  let mf = corpus;
  let hwm = corpus;

  for (let y = 1; y <= years; y++) {
    const gross = net * (1 + grossPct / 100);
    const fixedFee = gross * (fixedPct / 100);
    const afterFixed = gross - fixedFee;

    const hurdleValue = net * (1 + hurdlePct / 100);
    const floor = highWatermark ? Math.max(hurdleValue, hwm) : hurdleValue;
    const perfFee = Math.max(0, afterFixed - floor) * (perfPct / 100);

    net = afterFixed - perfFee;
    hwm = Math.max(hwm, net);
    mf = mf * (1 + (grossPct - 1) / 100);

    rows.push({
      year: y,
      gross: Math.round(gross),
      fixedFee: Math.round(fixedFee),
      perfFee: Math.round(perfFee),
      net: Math.round(net),
      mf: Math.round(mf),
    });
  }
  return rows;
}

export default function PMSFeeCalculatorPage() {
  const [corpus, setCorpus] = useState(5000000);
  const [grossPct, setGrossPct] = useState(14);
  const [fixedPct, setFixedPct] = useState(1.5);
  const [perfPct, setPerfPct] = useState(15);
  const [hurdlePct, setHurdlePct] = useState(10);
  const [highWatermark, setHighWatermark] = useState(true);
  const [years, setYears] = useState(10);

  const rows = useMemo(
    () => simulate(corpus, grossPct, fixedPct, perfPct, hurdlePct, highWatermark, years),
    [corpus, grossPct, fixedPct, perfPct, hurdlePct, highWatermark, years],
  );

  const totalFees = rows.reduce((sum, r) => sum + r.fixedFee + r.perfFee, 0);
  const finalNet = rows[rows.length - 1]?.net ?? corpus;
  const finalMf = rows[rows.length - 1]?.mf ?? corpus;

  return (
    <CalculatorWrapper
      title="PMS Fee Calculator"
      subtitle="Model how fixed and performance fees compound over time — and how the net result compares with a 1% TER mutual fund at the same gross return."
      notes="Illustrative model only: the fixed fee is applied to the year-end value, the performance fee to gains above the hurdle (and high-watermark, when enabled), and the mutual-fund comparison approximates a 1% total expense ratio. Actual PMS fee mechanics — charging frequency, averaging, exit loads, catch-up clauses and taxes — vary by manager and can change the outcome. This is education, not advice; read the manager's fee schedule and disclosure document carefully."
    >
      <div className="grid md:grid-cols-3 gap-6">
        <Slider label="Corpus (₹)" min={5000000} max={100000000} step={500000} value={corpus} setValue={setCorpus} format={(v) => fmtINR(v)} />
        <Slider label="Expected gross return (% p.a.)" min={4} max={24} step={0.5} value={grossPct} setValue={setGrossPct} format={(v) => `${v}%`} />
        <Slider label="Years" min={1} max={25} step={1} value={years} setValue={setYears} format={(v) => `${v}y`} />
        <Slider label="Fixed fee (% p.a.)" min={0} max={3} step={0.05} value={fixedPct} setValue={setFixedPct} format={(v) => `${v}%`} />
        <Slider label="Performance fee (% of excess)" min={0} max={30} step={0.5} value={perfPct} setValue={setPerfPct} format={(v) => `${v}%`} />
        <Slider label="Hurdle rate (% p.a.)" min={0} max={15} step={0.5} value={hurdlePct} setValue={setHurdlePct} format={(v) => `${v}%`} />
      </div>

      <label className="mt-6 flex items-center gap-2 text-sm text-[var(--color-navy)] font-medium cursor-pointer">
        <input
          type="checkbox"
          checked={highWatermark}
          onChange={(e) => setHighWatermark(e.target.checked)}
          className="accent-[var(--color-gold-dim)]"
        />
        Apply high-watermark (performance fee only on gains above the previous peak)
      </label>

      <div className="mt-8 grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat label="Total fees paid" value={fmtINR(totalFees)} color="#EF4444" />
        <Stat label={`Net PMS corpus (${years}y)`} value={fmtINR(finalNet)} color="#C9A84C" big />
        <Stat label="1% TER mutual fund" value={fmtINR(finalMf)} />
        <Stat
          label="PMS minus mutual fund"
          value={`${finalNet >= finalMf ? "+" : "−"}${fmtINR(Math.abs(finalNet - finalMf))}`}
          color={finalNet >= finalMf ? "#10B981" : "#EF4444"}
        />
      </div>

      <div className="mt-8 h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={rows}>
            <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
            <XAxis dataKey="year" tick={{ fontSize: 11 }} />
            <YAxis tickFormatter={(v) => fmtINR(v)} tick={{ fontSize: 11 }} width={80} />
            <Tooltip formatter={(v: number) => fmtINR(v)} />
            <Line type="monotone" dataKey="net" stroke="#C9A84C" strokeWidth={2.5} dot={false} name="PMS (net of fees)" />
            <Line type="monotone" dataKey="mf" stroke="#5A6B80" strokeWidth={2} dot={false} name="Mutual fund (1% TER)" />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="mt-8 overflow-x-auto rounded-xl border border-[var(--color-silver)]/40">
        <table className="w-full text-sm text-left min-w-[36rem]">
          <thead>
            <tr className="bg-[var(--color-navy)] text-[var(--color-cream)]">
              <th scope="col" className="px-4 py-3 font-semibold">Year</th>
              <th scope="col" className="px-4 py-3 font-semibold">Gross value</th>
              <th scope="col" className="px-4 py-3 font-semibold">Fixed fee</th>
              <th scope="col" className="px-4 py-3 font-semibold">Performance fee</th>
              <th scope="col" className="px-4 py-3 font-semibold">Net PMS value</th>
              <th scope="col" className="px-4 py-3 font-semibold">MF (1% TER)</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.year} className={i % 2 ? "bg-[var(--color-offwhite)]" : "bg-white"}>
                <td className="px-4 py-2.5 font-semibold text-[var(--color-navy)]">{r.year}</td>
                <td className="px-4 py-2.5 text-[var(--color-slate)]">{fmtINR(r.gross)}</td>
                <td className="px-4 py-2.5 text-[var(--color-slate)]">{fmtINR(r.fixedFee)}</td>
                <td className="px-4 py-2.5 text-[var(--color-slate)]">{fmtINR(r.perfFee)}</td>
                <td className="px-4 py-2.5 font-semibold text-[var(--color-navy)]">{fmtINR(r.net)}</td>
                <td className="px-4 py-2.5 text-[var(--color-slate)]">{fmtINR(r.mf)}</td>
              </tr>
            ))}
          </tbody>
        </table>
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
    <div className="bg-[var(--color-offwhite)] rounded-xl p-4 border border-[var(--color-silver)]/30">
      <div className="text-xs uppercase tracking-wider text-[var(--color-slate)]">{label}</div>
      <div className={`mt-1 font-semibold ${big ? "text-2xl" : "text-xl"}`} style={{ color, fontFamily: "var(--font-display)" }}>
        {value}
      </div>
    </div>
  );
}
