"use client";

import type { GuidedData } from "@/lib/guided/types";
import { fmtINR, fv, pv, sipRequired, sipFutureValue } from "@/lib/utils";
import { MetricCard } from "./MetricCard";

export function PlanSummary({ data }: { data: GuidedData }) {
  const yr = new Date().getFullYear();
  const age = new Date().getFullYear() - new Date(data.dob).getFullYear();
  const yToRet = Math.max(data.retirementAge - age, 1);
  const portR = (data.equityAlloc / 100) * (data.equityReturn / 100) + (data.debtAlloc / 100) * (data.debtReturn / 100);

  const totFA = data.assets.reduce((s, a) => s + a.value, 0);
  const totLiab = data.liabilities.reduce((s, l) => s + (l.outstanding || 0), 0);
  const netWorth = totFA + data.physicalAssets.reduce((s, a) => s + a.value, 0) - totLiab;

  const income = data.salaryMonthly + data.otherIncomeMonthly;
  const totExpM = data.householdExp + data.childcareExp + data.vacationExp + data.giftsExp + data.otherExp;
  const monthlySavings = Math.max(income - totExpM - data.liabilities.reduce((s, l) => s + (l.emi || 0), 0), 0);

  // Projection: current assets compounded + SIP from now
  const projectedAtRet = totFA * Math.pow(1 + portR, yToRet) + sipFutureValue(data.sipMonthly + monthlySavings * 0.5, portR, yToRet);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-2xl font-semibold text-[var(--color-navy)]">Your Plan</h3>
        <p className="text-sm text-[var(--color-slate)] mt-1">
          {data.name ? `${data.name}, ` : ""}here&apos;s the snapshot — built from your answers.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <MetricCard icon="💎" label="Net worth today" value={fmtINR(netWorth)} color="#C9A84C" />
        <MetricCard icon="💰" label="Monthly savings" value={fmtINR(monthlySavings)} sub={`${income > 0 ? Math.round((monthlySavings / income) * 100) : 0}% savings rate`} color="#10B981" />
        <MetricCard icon="🎯" label="Years to retirement" value={`${yToRet}y`} sub={`Target age ${data.retirementAge}`} color="#0891B2" />
        <MetricCard icon="📈" label={`Projected at ${data.retirementAge}`} value={fmtINR(projectedAtRet)} sub={`@ ${(portR * 100).toFixed(1)}% blended return`} color="#0A1628" />
      </div>

      <div>
        <h4 className="text-lg font-semibold text-[var(--color-navy)] mb-3">Your goals</h4>
        <div className="space-y-3">
          {data.goals.map((g, i) => {
            const yToGoal = Math.max(g.year - yr, 1);
            const target = fv(g.currentValue, g.inflation / 100, yToGoal);
            const sip = sipRequired(target, portR, yToGoal);
            const ifAffordableShare = monthlySavings > 0 ? Math.min(sip / monthlySavings, 1) : 0;
            return (
              <div key={i} className="bg-white rounded-xl p-5 shadow-sm border border-[var(--color-silver)]/40">
                <div className="flex justify-between flex-wrap gap-2 items-center mb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[var(--color-navy)]">{g.name}</span>
                    <span
                      className="text-xs px-2 py-0.5 rounded-full"
                      style={{
                        background: g.priority === "High" ? "rgba(239,68,68,0.1)" : g.priority === "Medium" ? "rgba(245,158,11,0.1)" : "rgba(16,185,129,0.1)",
                        color: g.priority === "High" ? "#EF4444" : g.priority === "Medium" ? "#F59E0B" : "#10B981",
                      }}
                    >
                      {g.priority}
                    </span>
                  </div>
                  <span className="text-xs text-[var(--color-slate)]">{g.year} · {yToGoal}y away</span>
                </div>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3 text-sm">
                  <div>
                    <div className="text-xs text-[var(--color-slate)]">Cost today</div>
                    <div className="font-semibold text-[var(--color-navy)]">{fmtINR(g.currentValue)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[var(--color-slate)]">Cost at {g.year}</div>
                    <div className="font-semibold text-[var(--color-navy)]">{fmtINR(target)}</div>
                  </div>
                  <div>
                    <div className="text-xs text-[var(--color-slate)]">SIP needed</div>
                    <div className="font-semibold text-[var(--color-emerald)]">{fmtINR(sip)}/mo</div>
                  </div>
                </div>
                <div className="mt-3 h-1.5 bg-[var(--color-silver)]/30 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full transition-all"
                    style={{
                      width: `${ifAffordableShare * 100}%`,
                      background: ifAffordableShare < 0.5 ? "#10B981" : ifAffordableShare < 1 ? "#F59E0B" : "#EF4444",
                    }}
                  />
                </div>
                <div className="text-xs text-[var(--color-slate)] mt-1">
                  {ifAffordableShare < 1
                    ? `${Math.round(ifAffordableShare * 100)}% of your monthly surplus`
                    : `This goal alone exceeds your monthly surplus — consider stretching the timeline.`}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-[var(--color-parchment)] rounded-xl p-5 border border-[var(--color-gold)]/30">
        <h4 className="font-semibold text-[var(--color-navy)] mb-2">Asset allocation</h4>
        <div className="flex items-center gap-2 text-sm">
          <span>Risk profile:</span>
          <span className="font-semibold text-[var(--color-navy)]">{data.riskProfile}</span>
          <span className="text-[var(--color-slate)]">·</span>
          <span>{data.equityAlloc}% equity / {data.debtAlloc}% debt</span>
        </div>
        <div className="mt-3 h-3 rounded-full overflow-hidden flex">
          <div className="bg-[var(--color-navy)]" style={{ width: `${data.equityAlloc}%` }} />
          <div className="bg-[var(--color-gold)]" style={{ width: `${data.debtAlloc}%` }} />
        </div>
      </div>
    </div>
  );
}
