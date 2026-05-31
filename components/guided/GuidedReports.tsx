"use client";

import {
  AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer,
} from "recharts";
import type { GuidedData } from "@/lib/guided/types";
import { fmtINR } from "@/lib/utils";
import { MetricCard } from "./MetricCard";

const CHART_COLORS = ["#0A1628", "#C9A84C", "#0891B2", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6", "#EC4899"];

export function GuidedReports({ data }: { data: GuidedData }) {
  const income = data.salaryMonthly + data.otherIncomeMonthly;
  const totExpM = data.householdExp + data.childcareExp + data.vacationExp + data.giftsExp + data.otherExp;
  const savM = income - totExpM;
  const portR = (data.equityAlloc / 100) * (data.equityReturn / 100) + (data.debtAlloc / 100) * (data.debtReturn / 100);

  const totFA = data.assets.reduce((s, a) => s + a.value, 0);
  const totPA = data.physicalAssets.reduce((s, a) => s + a.value, 0);
  let liab = data.liabilities.reduce((s, l) => s + (l.outstanding || 0), 0);
  const emis = data.liabilities.reduce((s, l) => s + (l.emi || 0), 0) * 12;

  const spend = [
    { name: "Essentials", value: data.householdExp + data.childcareExp },
    { name: "Lifestyle", value: data.vacationExp + data.giftsExp },
    { name: "Other", value: data.otherExp },
  ].filter((s) => s.value > 0);

  const yr0 = new Date().getFullYear();
  let fa = totFA;
  let pa = totPA;
  let lb = liab;
  const trend: { year: number; networth: number }[] = [];
  for (let y = 0; y <= 10; y++) {
    trend.push({ year: yr0 + y, networth: Math.round(fa + pa - lb) });
    fa = fa * (1 + portR) + savM * 12;
    pa = pa * (1 + data.realEstateReturn / 100);
    lb = Math.max(lb - emis, 0);
  }

  const liquid = data.assets.filter((a) => a.type === "Debt").reduce((s, a) => s + a.value, 0);
  const ageOfMoney = totExpM > 0 ? Math.round((liquid / totExpM) * 30) : 0;

  return (
    <div>
      <h3 className="text-2xl font-semibold text-[var(--color-navy)]">Reports</h3>
      <p className="text-sm text-[var(--color-slate)] mb-4">The fun part — watch your money work.</p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        <MetricCard icon="⏳" label="Age of Money" value={`${ageOfMoney} days`} sub="how long your cash would last" color="#0891B2" />
        <MetricCard icon="💰" label="Net Worth Today" value={fmtINR(totFA + totPA - liab)} color="#C9A84C" />
        <MetricCard icon="📈" label="Net Worth in 10y" value={fmtINR(trend[trend.length - 1].networth)} sub="projected" color="#10B981" />
      </div>

      <div className="bg-white rounded-2xl p-6 shadow-sm mb-4">
        <div className="font-semibold text-[var(--color-navy)] mb-3">Projected net worth</div>
        <div className="h-60">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trend}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(196,205,213,0.4)" />
              <XAxis dataKey="year" tick={{ fontSize: 12 }} />
              <YAxis tickFormatter={(v) => fmtINR(v)} tick={{ fontSize: 11 }} width={70} />
              <Tooltip formatter={(v: number) => fmtINR(v)} />
              <Area type="monotone" dataKey="networth" stroke="#C9A84C" strokeWidth={2} fill="rgba(201,168,76,0.13)" name="Net worth" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {spend.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-sm">
          <div className="font-semibold text-[var(--color-navy)] mb-3">Where your money goes</div>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={spend} cx="50%" cy="50%" innerRadius={45} outerRadius={85} dataKey="value"
                  label={({ name, percent }) => `${name} ${((percent || 0) * 100).toFixed(0)}%`}
                >
                  {spend.map((_, i) => (
                    <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: number) => fmtINR(v)} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <p className="text-xs text-[var(--color-slate)] mt-4 leading-relaxed">
        &ldquo;Age of Money&rdquo; estimates how many days your liquid savings could cover expenses — higher is healthier.
        Net-worth projection assumes a {(portR * 100).toFixed(1)}% return and your current savings rate. Educational only.
      </p>
    </div>
  );
}
