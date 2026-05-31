"use client";

import { useState } from "react";
import { Loader2, ArrowRight, ArrowLeft, Sparkles, TrendingUp } from "lucide-react";
import {
  LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid,
} from "recharts";
import { fmtCurrency } from "@/lib/utils";

type RiskTolerance = "conservative" | "balanced" | "aggressive";

interface FormState {
  age: number;
  country: string;
  monthlyIncome: string;
  dependents: number;
  currentSavings: string;
  monthlyExpenses: string;
  hasDebt: boolean;
  debtAmount: string;
  ownsHome: boolean;
  retirementAge: number;
  primaryGoal: string;
  riskTolerance: RiskTolerance | "";
}

interface SnapshotResult {
  where_you_stand: string;
  trajectory_summary: string;
  projected_corpus: number;
  yearly_projection: { year: number; value: number }[];
  three_levers: { lever: string; impact: string }[];
  next_step: string;
}

const COUNTRIES = ["India", "US", "UK", "UAE", "Singapore", "Other"];
const CURRENCY_BY_COUNTRY: Record<string, string> = {
  India: "INR", US: "USD", UK: "GBP", UAE: "AED", Singapore: "SGD", Other: "USD",
};

export function AIPlannerForm() {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<FormState>({
    age: 35,
    country: "India",
    monthlyIncome: "",
    dependents: 0,
    currentSavings: "",
    monthlyExpenses: "",
    hasDebt: false,
    debtAmount: "",
    ownsHome: false,
    retirementAge: 60,
    primaryGoal: "",
    riskTolerance: "",
  });
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SnapshotResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const currency = CURRENCY_BY_COUNTRY[form.country] ?? "USD";

  const canProceedStep1 = form.age > 0 && form.country && Number(form.monthlyIncome) > 0;
  const canProceedStep2 = Number(form.currentSavings) >= 0 && Number(form.monthlyExpenses) > 0;
  const canSubmit = canProceedStep1 && canProceedStep2 && form.primaryGoal.length > 3 && form.riskTolerance && form.retirementAge > form.age;

  async function handleSubmit() {
    setError(null);
    setLoading(true);
    try {
      const res = await fetch("/api/wealth-snapshot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age: form.age,
          country: form.country,
          monthlyIncome: Number(form.monthlyIncome),
          dependents: form.dependents,
          currentSavings: Number(form.currentSavings),
          monthlyExpenses: Number(form.monthlyExpenses),
          hasDebt: form.hasDebt,
          debtAmount: Number(form.debtAmount) || 0,
          ownsHome: form.ownsHome,
          retirementAge: form.retirementAge,
          primaryGoal: form.primaryGoal,
          riskTolerance: form.riskTolerance,
        }),
      });

      if (!res.ok) {
        const body = await res.json();
        throw new Error(body.error ?? "Something went wrong");
      }

      const data: SnapshotResult = await res.json();
      setResult(data);
      setStep(5);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unable to generate snapshot. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (result && step === 5) {
    return <SnapshotResults result={result} currency={currency} onReset={() => { setResult(null); setStep(1); }} />;
  }

  return (
    <div className="bg-white border border-[var(--color-silver)]/40 rounded-2xl shadow-sm">
      <ProgressBar step={step} total={4} />

      <div className="p-6 md:p-8">
        {step === 1 && (
          <FormStep title="About you" subtitle="A few baseline numbers to start.">
            <Field label={`Age (${form.age})`}>
              <input
                type="range" min={18} max={75} value={form.age}
                onChange={(e) => setForm({ ...form, age: Number(e.target.value) })}
                className="w-full accent-[var(--color-gold)]"
              />
              <div className="flex justify-between text-xs text-[var(--color-slate)] mt-1">
                <span>18</span><span>75</span>
              </div>
            </Field>

            <Field label="Country of residence">
              <select
                value={form.country}
                onChange={(e) => setForm({ ...form, country: e.target.value })}
                className="input-base"
              >
                {COUNTRIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>

            <Field label={`Monthly income (${currency})`}>
              <input
                type="number" inputMode="numeric" placeholder="e.g. 150000"
                value={form.monthlyIncome}
                onChange={(e) => setForm({ ...form, monthlyIncome: e.target.value })}
                className="input-base"
              />
            </Field>

            <Field label="Number of dependents">
              <input
                type="number" min={0} max={10} value={form.dependents}
                onChange={(e) => setForm({ ...form, dependents: Number(e.target.value) })}
                className="input-base"
              />
            </Field>
          </FormStep>
        )}

        {step === 2 && (
          <FormStep title="Your current situation" subtitle="Honest numbers give better answers.">
            <Field label={`Total current savings & investments (${currency})`}>
              <input
                type="number" inputMode="numeric" placeholder="e.g. 1800000"
                value={form.currentSavings}
                onChange={(e) => setForm({ ...form, currentSavings: e.target.value })}
                className="input-base"
              />
            </Field>

            <Field label={`Monthly expenses (${currency})`}>
              <input
                type="number" inputMode="numeric" placeholder="e.g. 80000"
                value={form.monthlyExpenses}
                onChange={(e) => setForm({ ...form, monthlyExpenses: e.target.value })}
                className="input-base"
              />
            </Field>

            <Field label="Major debt?">
              <div className="flex gap-3">
                <button onClick={() => setForm({ ...form, hasDebt: false })}
                  className={pillBtn(!form.hasDebt)}>No</button>
                <button onClick={() => setForm({ ...form, hasDebt: true })}
                  className={pillBtn(form.hasDebt)}>Yes</button>
              </div>
            </Field>

            {form.hasDebt && (
              <Field label={`Approximate outstanding debt (${currency})`}>
                <input
                  type="number" inputMode="numeric" placeholder="e.g. 2500000"
                  value={form.debtAmount}
                  onChange={(e) => setForm({ ...form, debtAmount: e.target.value })}
                  className="input-base"
                />
              </Field>
            )}

            <Field label="Own your primary home?">
              <div className="flex gap-3">
                <button onClick={() => setForm({ ...form, ownsHome: false })}
                  className={pillBtn(!form.ownsHome)}>No</button>
                <button onClick={() => setForm({ ...form, ownsHome: true })}
                  className={pillBtn(form.ownsHome)}>Yes</button>
              </div>
            </Field>
          </FormStep>
        )}

        {step === 3 && (
          <FormStep title="Your goals" subtitle="One headline goal + your risk appetite.">
            <Field label={`Target retirement age (${form.retirementAge})`}>
              <input
                type="range" min={Math.max(form.age + 5, 40)} max={75} value={form.retirementAge}
                onChange={(e) => setForm({ ...form, retirementAge: Number(e.target.value) })}
                className="w-full accent-[var(--color-gold)]"
              />
              <div className="flex justify-between text-xs text-[var(--color-slate)] mt-1">
                <span>{Math.max(form.age + 5, 40)}</span><span>75</span>
              </div>
            </Field>

            <Field label="One specific big goal" hint="e.g. 'Kids' education in 2032', 'Buy a home by 2030'">
              <input
                type="text" placeholder="One sentence is enough"
                value={form.primaryGoal}
                onChange={(e) => setForm({ ...form, primaryGoal: e.target.value })}
                className="input-base"
                maxLength={120}
              />
            </Field>

            <Field label="Risk tolerance">
              <div className="grid grid-cols-3 gap-2">
                {(["conservative", "balanced", "aggressive"] as RiskTolerance[]).map((r) => (
                  <button
                    key={r}
                    onClick={() => setForm({ ...form, riskTolerance: r })}
                    className={`px-3 py-3 rounded-lg text-sm font-semibold capitalize border ${
                      form.riskTolerance === r
                        ? "bg-[var(--color-navy)] text-[var(--color-cream)] border-[var(--color-navy)]"
                        : "bg-white text-[var(--color-navy)] border-[var(--color-silver)] hover:border-[var(--color-gold)]"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
              <p className="text-xs text-[var(--color-slate)] mt-2">
                Conservative: 40% equity · Balanced: 60% equity · Aggressive: 80% equity
              </p>
            </Field>
          </FormStep>
        )}

        {step === 4 && (
          <FormStep title="Ready to run your snapshot" subtitle="We'll call Claude to assemble your personalised view.">
            <div className="bg-[var(--color-parchment)] rounded-lg p-5 space-y-2 text-sm">
              <SummaryRow label="Age" value={`${form.age} · retiring at ${form.retirementAge}`} />
              <SummaryRow label="Country" value={form.country} />
              <SummaryRow label="Monthly income" value={fmtCurrency(Number(form.monthlyIncome), currency)} />
              <SummaryRow label="Current savings" value={fmtCurrency(Number(form.currentSavings), currency)} />
              <SummaryRow label="Monthly expenses" value={fmtCurrency(Number(form.monthlyExpenses), currency)} />
              <SummaryRow label="Risk" value={form.riskTolerance} />
              <SummaryRow label="Goal" value={form.primaryGoal} />
            </div>
            {error && (
              <div className="mt-4 text-sm text-[var(--color-ruby)] bg-[var(--color-ruby)]/10 p-3 rounded">{error}</div>
            )}
          </FormStep>
        )}

        <div className="mt-8 flex items-center justify-between gap-3 border-t pt-5 border-[var(--color-silver)]/40">
          {step > 1 ? (
            <button onClick={() => setStep(step - 1)} className="text-sm font-semibold text-[var(--color-slate)] inline-flex items-center gap-1">
              <ArrowLeft className="w-4 h-4" /> Back
            </button>
          ) : <div />}

          {step < 4 ? (
            <button
              onClick={() => setStep(step + 1)}
              disabled={(step === 1 && !canProceedStep1) || (step === 2 && !canProceedStep2)}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleSubmit}
              disabled={!canSubmit || loading}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Analysing…
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" /> Run my snapshot
                </>
              )}
            </button>
          )}
        </div>
      </div>

      <style jsx>{`
        .input-base {
          width: 100%; padding: 0.75rem 1rem; border-radius: 0.5rem;
          border: 1px solid rgb(196 205 213 / 0.6); background: white;
          font-size: 0.95rem; color: var(--color-navy);
        }
        .input-base:focus { outline: none; border-color: var(--color-gold); }
      `}</style>
    </div>
  );
}

function pillBtn(active: boolean) {
  return `px-5 py-2.5 rounded-lg text-sm font-semibold border ${
    active
      ? "bg-[var(--color-navy)] text-[var(--color-cream)] border-[var(--color-navy)]"
      : "bg-white text-[var(--color-navy)] border-[var(--color-silver)] hover:border-[var(--color-gold)]"
  }`;
}

function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = (step / total) * 100;
  return (
    <div className="h-1 bg-[var(--color-silver)]/30 rounded-t-2xl overflow-hidden">
      <div className="h-full bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-gold-light)] transition-all"
        style={{ width: `${pct}%` }} />
    </div>
  );
}

function FormStep({ title, subtitle, children }: { title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-2xl font-semibold mb-1.5">{title}</h2>
      <p className="text-sm text-[var(--color-slate)] mb-6">{subtitle}</p>
      <div className="space-y-5">{children}</div>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[var(--color-navy)] mb-2">{label}</label>
      {children}
      {hint && <p className="text-xs text-[var(--color-slate)] mt-1.5">{hint}</p>}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex justify-between items-baseline gap-3">
      <span className="text-[var(--color-slate)]">{label}</span>
      <span className="font-semibold text-[var(--color-navy)] text-right">{value}</span>
    </div>
  );
}

function SnapshotResults({ result, currency, onReset }: { result: SnapshotResult; currency: string; onReset: () => void }) {
  return (
    <div className="bg-white border border-[var(--color-silver)]/40 rounded-2xl shadow-sm p-6 md:p-8">
      <div className="flex items-center gap-2 mb-6">
        <Sparkles className="w-5 h-5 text-[var(--color-gold)]" />
        <span className="eyebrow">Your snapshot</span>
      </div>

      <h2 className="text-2xl font-semibold mb-3">Where you stand</h2>
      <p className="text-[var(--color-slate)] leading-relaxed whitespace-pre-line">{result.where_you_stand}</p>

      <div className="mt-8 bg-[var(--color-parchment)] rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-[var(--color-gold-dim)] font-semibold">Projected corpus at retirement</div>
            <div className="text-3xl md:text-4xl font-semibold text-[var(--color-navy)] mt-1">
              {fmtCurrency(result.projected_corpus, currency)}
            </div>
          </div>
          <TrendingUp className="w-8 h-8 text-[var(--color-gold)]" />
        </div>
        <p className="text-sm text-[var(--color-slate)] leading-relaxed">{result.trajectory_summary}</p>

        {result.yearly_projection && result.yearly_projection.length > 0 && (
          <div className="h-56 mt-6">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={result.yearly_projection}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" />
                <XAxis dataKey="year" tick={{ fontSize: 11, fill: "#5A6B80" }} />
                <YAxis tick={{ fontSize: 11, fill: "#5A6B80" }} tickFormatter={(v) => fmtCurrency(v, currency)} width={80} />
                <Tooltip formatter={(v: number) => fmtCurrency(v, currency)} />
                <Line type="monotone" dataKey="value" stroke="#C9A84C" strokeWidth={2.5} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      <h3 className="text-xl font-semibold mt-10 mb-4">Three levers that move the needle</h3>
      <div className="space-y-3">
        {result.three_levers.map((lever, i) => (
          <div key={i} className="flex gap-4 items-start p-4 bg-white border border-[var(--color-silver)]/40 rounded-lg">
            <div className="w-8 h-8 rounded-full bg-[var(--color-navy)] text-[var(--color-gold)] flex items-center justify-center text-sm font-semibold flex-shrink-0">
              {i + 1}
            </div>
            <div>
              <div className="font-semibold text-[var(--color-navy)]">{lever.lever}</div>
              <div className="text-sm text-[var(--color-slate)] mt-1">{lever.impact}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mt-10 bg-[var(--color-navy)] text-[var(--color-cream)] rounded-xl p-6">
        <div className="text-xs uppercase tracking-wider text-[var(--color-gold-light)] font-semibold mb-2">Your next step</div>
        <p className="text-lg leading-relaxed">{result.next_step}</p>
      </div>

      <div className="mt-8 p-6 bg-[var(--color-parchment)] rounded-xl border border-[var(--color-gold)]/30">
        <h3 className="text-lg font-semibold mb-2">This is the surface.</h3>
        <p className="text-sm text-[var(--color-slate)] leading-relaxed mb-4">
          The full WealthWise plan covers 16 sections including SWOT, tax harvesting, insurance gap, retirement scenarios, and detailed goal planning.
          Try it free for 14 days — no card required.
        </p>
        <div className="flex flex-col sm:flex-row gap-3">
          <a href="https://app.auriswealth.co/?signup" className="btn-primary">Start free trial</a>
          <button onClick={onReset} className="btn-outline">Run another snapshot</button>
        </div>
      </div>

      <p className="text-[11px] text-[var(--color-slate)] italic mt-6 leading-relaxed">
        This snapshot is generated by an AI assistant for educational purposes only. It does not constitute investment advice.
        Returns and inflation assumptions are illustrative. Please consult a SEBI-registered investment adviser before making investment decisions.
      </p>
    </div>
  );
}
