"use client";

import type { GuidedData } from "@/lib/guided/types";
import { fmtINR } from "@/lib/utils";

export function BudgetCard({ data }: { data: GuidedData }) {
  const income = data.salaryMonthly + data.otherIncomeMonthly;
  const essentials = data.householdExp + data.childcareExp;
  const lifestyle = data.vacationExp + data.giftsExp + data.otherExp;
  const emis = data.liabilities.reduce((s, l) => s + (l.emi || 0), 0);
  const investing = data.sipMonthly + data.pfMonthly;
  const spent = essentials + lifestyle + emis + investing;
  const leftover = Math.max(income - spent, 0);
  const overAssigned = spent > income;
  const savingsRate = income > 0 ? Math.round(((income - essentials - lifestyle - emis) / income) * 100) : 0;

  const segs = [
    { label: "Essentials", val: essentials, color: "#0A1628" },
    { label: "Lifestyle", val: lifestyle, color: "#0891B2" },
    { label: "Loan EMIs", val: emis, color: "#EF4444" },
    { label: "Investing", val: investing, color: "#10B981" },
    { label: "Unassigned", val: leftover, color: "#C9A84C" },
  ].filter((s) => s.val > 0);

  const denom = Math.max(income, spent, 1);

  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-[var(--color-silver)]/40">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl">💸</span>
        <h3 className="text-xl font-semibold text-[var(--color-navy)]">Your Monthly Money Plan</h3>
      </div>
      <p className="text-sm text-[var(--color-slate)] mb-4">
        Give every rupee a job — here&apos;s where your {fmtINR(income)}/month goes.
      </p>

      <div className="flex h-6 rounded-lg overflow-hidden mb-4 bg-[var(--color-silver)]/20">
        {segs.map((s, i) => (
          <div key={i} title={`${s.label}: ${fmtINR(s.val)}`} style={{ width: `${(s.val / denom) * 100}%`, background: s.color }} />
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {segs.map((s, i) => (
          <div key={i} className="flex items-center gap-2 text-sm">
            <span className="w-2.5 h-2.5 rounded" style={{ background: s.color }} />
            <span className="text-[var(--color-slate)]">{s.label}</span>
            <span className="ml-auto font-semibold text-[var(--color-navy)]">{fmtINR(s.val)}</span>
          </div>
        ))}
      </div>

      <div
        className="mt-5 p-4 rounded-xl text-sm leading-relaxed border"
        style={{
          background: overAssigned ? "rgba(239, 68, 68, 0.06)" : "rgba(16, 185, 129, 0.06)",
          borderColor: overAssigned ? "rgba(239, 68, 68, 0.25)" : "rgba(16, 185, 129, 0.25)",
          color: "#0A1628",
        }}
      >
        {overAssigned ? (
          <>
            ⚠️ You&apos;re spending about <strong>{fmtINR(spent - income)}/month</strong> more than you earn.
            Trim lifestyle costs or grow income before adding new goals.
          </>
        ) : (
          <>
            ✅ Savings rate <strong>{savingsRate}%</strong> · <strong>{fmtINR(leftover)}/month</strong> still unassigned —
            put it to work via SIPs or toward your goals.
          </>
        )}
      </div>
    </div>
  );
}
