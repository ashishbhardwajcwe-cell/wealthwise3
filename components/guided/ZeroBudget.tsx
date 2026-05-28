"use client";

import { useState } from "react";
import type { GuidedData, Numbers } from "@/lib/guided/types";
import { fmtINR } from "@/lib/utils";

const toNum = (v: unknown): number => {
  const x = parseFloat(String(v ?? ""));
  return isNaN(x) ? 0 : x;
};

interface BudgetGroup {
  id: string;
  label: string;
  color: string;
  items: [string, string][];
}

const BUDGET_GROUPS: BudgetGroup[] = [
  {
    id: "essentials", label: "Essentials", color: "#0A1628",
    items: [
      ["housing", "🏠 Housing / Rent"],
      ["utilities", "💡 Utilities"],
      ["groceries", "🛒 Groceries"],
      ["transport", "🚗 Transport"],
      ["health", "🏥 Health"],
    ],
  },
  {
    id: "lifestyle", label: "Lifestyle", color: "#0891B2",
    items: [
      ["dining", "🍽️ Dining & fun"],
      ["shopping", "🛍️ Shopping"],
      ["subscriptions", "📺 Subscriptions"],
      ["education", "🎓 Childcare / school"],
      ["other", "➕ Other"],
    ],
  },
  {
    id: "true", label: "True Expenses — monthly set-aside for big yearly bills", color: "#F59E0B",
    items: [
      ["insurance", "🛡️ Insurance"],
      ["festivals", "🎁 Festivals & gifts"],
      ["vacation", "✈️ Vacation fund"],
      ["maintenance", "🔧 Maintenance"],
    ],
  },
];

export function ZeroBudget({ data, n }: { data: GuidedData; n: Numbers }) {
  const income = data.salaryMonthly + data.otherIncomeMonthly;

  const initialAmts: Record<string, number> = {
    housing: toNum(n.e_housing), utilities: toNum(n.e_utilities), groceries: toNum(n.e_groceries),
    transport: toNum(n.e_transport), health: toNum(n.e_health),
    dining: toNum(n.e_dining), shopping: toNum(n.e_shopping), subscriptions: toNum(n.e_subscriptions),
    education: toNum(n.e_education), other: toNum(n.e_other),
    insurance: Math.round(toNum(n.a_insurance) / 12),
    festivals: Math.round(toNum(n.a_festivals) / 12),
    vacation: Math.round(toNum(n.a_vacation) / 12),
    maintenance: Math.round(toNum(n.a_maintenance) / 12),
  };

  const [amts, setAmts] = useState<Record<string, number>>(initialAmts);
  const set = (k: string) => (v: string) => setAmts((p) => ({ ...p, [k]: toNum(v) }));

  const emis = data.liabilities.reduce((s, l) => s + (l.emi || 0), 0);
  const sip = data.sipMonthly + data.pfMonthly;
  const assigned = Object.values(amts).reduce((s, v) => s + v, 0) + emis + sip;
  const toAssign = income - assigned;

  const banner =
    toAssign === 0
      ? { bg: "rgba(16,185,129,0.08)", color: "#10B981", txt: "🎉 Every rupee has a job — your budget is balanced!" }
      : toAssign > 0
      ? { bg: "rgba(201,168,76,0.08)", color: "#A08030", txt: `${fmtINR(toAssign)} still to assign — give it a job (more savings, a goal, or paying down debt).` }
      : { bg: "rgba(239,68,68,0.08)", color: "#EF4444", txt: `Over-assigned by ${fmtINR(-toAssign)} — trim a category or you'll dip into savings.` };

  return (
    <div>
      <div className="flex justify-between items-center flex-wrap gap-3 mb-3">
        <div>
          <h3 className="text-2xl font-semibold text-[var(--color-navy)]">Monthly Budget</h3>
          <p className="text-sm text-[var(--color-slate)]">YNAB rule #1: give every one of your {fmtINR(income)} a job.</p>
        </div>
        <div className="text-right">
          <div className="text-xs uppercase tracking-wider font-semibold text-[var(--color-slate)]">To Assign</div>
          <div
            className="text-3xl font-semibold"
            style={{
              fontFamily: "var(--font-display)",
              color: toAssign === 0 ? "#10B981" : toAssign > 0 ? "#A08030" : "#EF4444",
            }}
          >
            {fmtINR(toAssign)}
          </div>
        </div>
      </div>

      <div
        className="p-3 px-4 rounded-xl text-sm font-semibold mb-4"
        style={{ background: banner.bg, color: banner.color }}
      >
        {banner.txt}
      </div>

      {BUDGET_GROUPS.map((g) => {
        const sub = g.items.reduce((s, [k]) => s + (amts[k] || 0), 0);
        return (
          <div
            key={g.id}
            className="bg-white rounded-xl p-4 shadow-sm mb-3"
            style={{ borderLeft: `4px solid ${g.color}` }}
          >
            <div className="flex justify-between mb-2">
              <span className="font-semibold text-sm" style={{ color: g.color }}>{g.label}</span>
              <span className="font-semibold text-sm text-[var(--color-navy)]">{fmtINR(sub)}</span>
            </div>
            {g.items.map(([k, lbl]) => (
              <div key={k} className="flex justify-between items-center py-1 text-sm text-[var(--color-slate)]">
                <span>{lbl}</span>
                <span className="relative">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-[var(--color-steel)]">₹</span>
                  <input
                    type="number"
                    value={amts[k] || ""}
                    onChange={(e) => set(k)(e.target.value)}
                    className="w-24 py-1.5 pl-5 pr-2 border border-[var(--color-silver)]/50 rounded text-sm text-right text-[var(--color-navy)]"
                  />
                </span>
              </div>
            ))}
          </div>
        );
      })}

      <div className="bg-white rounded-xl p-4 shadow-sm" style={{ borderLeft: "4px solid #10B981" }}>
        <div className="flex justify-between py-1 text-sm text-[var(--color-slate)]">
          <span>💸 Loan EMIs (fixed)</span>
          <span className="font-semibold text-[var(--color-navy)]">{fmtINR(emis)}</span>
        </div>
        <div className="flex justify-between py-1 text-sm text-[var(--color-slate)]">
          <span>📈 Investing (SIP / RD)</span>
          <span className="font-semibold text-[var(--color-emerald)]">{fmtINR(sip)}</span>
        </div>
      </div>

      <p className="text-xs text-[var(--color-slate)] mt-3 leading-relaxed">
        💡 <strong>True Expenses:</strong> big yearly bills (insurance, festivals, vacations, repairs) are divided into monthly set-asides so they never blindside you — that&apos;s YNAB rule #2.
      </p>
    </div>
  );
}
