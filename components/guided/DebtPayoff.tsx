"use client";

import { useState } from "react";
import type { GuidedData } from "@/lib/guided/types";
import { simulateDebt, type DebtStrategy } from "@/lib/guided/debt-simulator";
import { fmtINR } from "@/lib/utils";
import { MetricCard } from "./MetricCard";

export function DebtPayoff({ data }: { data: GuidedData }) {
  const [extra, setExtra] = useState(5000);
  const [strategy, setStrategy] = useState<DebtStrategy>("avalanche");

  const loans = data.liabilities.filter((l) => (l.outstanding || 0) > 0);

  if (loans.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 text-center shadow-sm">
        <div className="text-5xl">🎉</div>
        <h3 className="text-2xl font-semibold text-[var(--color-emerald)] mt-3">You&apos;re debt-free!</h3>
        <p className="text-[var(--color-slate)] mt-2">Nothing to pay down — channel that freedom into investing for your goals.</p>
      </div>
    );
  }

  const base = simulateDebt(loans, 0, strategy);
  const withExtra = simulateDebt(loans, extra, strategy);
  const interestSaved = Math.max(base.interest - withExtra.interest, 0);
  const monthsSaved = Math.max(base.months - withExtra.months, 0);
  const ym = (m: number) => `${Math.floor(m / 12)}y ${m % 12}m`;

  return (
    <div>
      <h3 className="text-2xl font-semibold text-[var(--color-navy)]">Debt Payoff Planner</h3>
      <p className="text-sm text-[var(--color-slate)] mb-4">
        See how much faster — and cheaper — you clear debt by paying a little extra each month.
      </p>

      <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <div className="font-semibold text-[var(--color-navy)] mb-2 text-sm">Your loans</div>
        {loans.map((l, i) => (
          <div
            key={i}
            className={`flex justify-between py-1.5 text-sm text-[var(--color-slate)] ${
              i < loans.length - 1 ? "border-b border-[var(--color-silver)]/25" : ""
            }`}
          >
            <span>
              {l.name}{" "}
              <span className="text-xs text-[var(--color-steel)]">
                · {l.rate}% · EMI {fmtINR(l.emi)}
              </span>
            </span>
            <span className="font-semibold text-[var(--color-navy)]">{fmtINR(l.outstanding)}</span>
          </div>
        ))}
      </div>

      <div className="flex gap-3 flex-wrap items-center mb-4">
        <span className="text-sm font-semibold text-[var(--color-slate)]">Strategy:</span>
        {(
          [
            ["avalanche", "Avalanche (save most interest)"],
            ["snowball", "Snowball (quick wins)"],
          ] as [DebtStrategy, string][]
        ).map(([v, lbl]) => (
          <button
            key={v}
            onClick={() => setStrategy(v)}
            className={`px-3 py-1.5 rounded-lg text-sm font-semibold border ${
              strategy === v
                ? "bg-[var(--color-gold)]/10 border-[var(--color-gold)]"
                : "bg-white border-[var(--color-silver)]/40 hover:border-[var(--color-gold)]"
            }`}
          >
            {lbl}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <label className="text-sm font-semibold text-[var(--color-slate)]">Extra payment per month</label>
        <div className="flex items-center gap-3 mt-2">
          <input
            type="range" min={0} max={50000} step={1000}
            value={extra}
            onChange={(e) => setExtra(Number(e.target.value))}
            className="flex-1 accent-[var(--color-gold)]"
          />
          <div className="relative">
            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-steel)]">₹</span>
            <input
              type="number" value={extra}
              onChange={(e) => setExtra(Number(e.target.value))}
              className="w-28 py-2 pl-6 pr-2 border border-[var(--color-silver)]/50 rounded text-sm text-[var(--color-navy)]"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <MetricCard icon="📅" label="Debt-free in" value={ym(withExtra.months)} sub={`was ${ym(base.months)}`} color="#0891B2" />
        <MetricCard icon="⏱️" label="Time saved" value={ym(monthsSaved)} sub="vs minimums only" color="#10B981" />
        <MetricCard icon="💸" label="Interest saved" value={fmtINR(interestSaved)} sub={`total interest ${fmtINR(withExtra.interest)}`} color="#C9A84C" />
      </div>

      <p className="text-xs text-[var(--color-slate)] mt-4 leading-relaxed">
        Educational estimate based on the balances, rates and EMIs you entered. As each loan clears, its EMI rolls into the next (&quot;rollover&quot;).
        Confirm exact figures with your lender.
      </p>
    </div>
  );
}
