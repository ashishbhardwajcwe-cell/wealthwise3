"use client";

import { useState, useMemo } from "react";
import { X, ArrowLeft, Sparkles } from "lucide-react";
import { GUIDED_QUESTIONS } from "@/lib/guided/questions";
import { buildGuidedData } from "@/lib/guided/build-data";
import type { Answers, Numbers, GuidedData } from "@/lib/guided/types";
import { BudgetCard } from "./BudgetCard";
import { ZeroBudget } from "./ZeroBudget";
import { DebtPayoff } from "./DebtPayoff";
import { GuidedReports } from "./GuidedReports";
import { PlanSummary } from "./PlanSummary";

type Phase = "quiz" | "numbers" | "report";
type ResultTab = "budget" | "plan" | "debt" | "reports";

export function GuidedPlanWizard() {
  const [phase, setPhase] = useState<Phase>("quiz");
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Answers>({});
  const [numbers, setNumbers] = useState<Numbers>({});
  const [data, setData] = useState<GuidedData | null>(null);
  const [resultTab, setResultTab] = useState<ResultTab>("budget");

  const visible = useMemo(
    () => GUIDED_QUESTIONS.filter((q) => !q.showIf || q.showIf(answers)),
    [answers],
  );

  const idx = Math.min(step, visible.length - 1);
  const q = visible[idx];

  function next() {
    if (step >= visible.length - 1) {
      setPhase("numbers");
      window.scrollTo({ top: 0 });
    } else {
      setStep(step + 1);
    }
  }

  function back() {
    if (step <= 0) return;
    setStep(step - 1);
  }

  function pick(val: string | number) {
    setAnswers((a) => ({ ...a, [q.id]: val }));
    setTimeout(next, 150);
  }

  function toggle(val: string | number) {
    setAnswers((a) => {
      const cur = Array.isArray(a[q.id]) ? (a[q.id] as (string | number)[]) : [];
      return { ...a, [q.id]: cur.includes(val) ? cur.filter((x) => x !== val) : [...cur, val] };
    });
  }

  const isSel = (val: string | number) =>
    q.type === "multi"
      ? Array.isArray(answers[q.id]) && (answers[q.id] as (string | number)[]).includes(val)
      : answers[q.id] === val;

  const setN = (k: string) => (v: string | number) => setNumbers((p) => ({ ...p, [k]: v }));

  function createPlan() {
    const income = parseFloat(String(numbers.income || ""));
    if (!income || income <= 0) {
      alert("Please enter your monthly take-home income to build the plan.");
      return;
    }
    setData(buildGuidedData(answers, numbers));
    setPhase("report");
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // ── REPORT VIEW ──
  if (phase === "report" && data) {
    const TABS: [ResultTab, string][] = [
      ["budget", "💸 Budget"],
      ["plan", "📊 Plan"],
      ["debt", "💳 Debt"],
      ["reports", "📈 Reports"],
    ];

    return (
      <div className="max-w-4xl mx-auto px-4 pt-6 pb-16">
        <div className="flex justify-between flex-wrap gap-3 mb-6">
          <div className="flex gap-2 flex-wrap">
            {TABS.map(([id, lbl]) => (
              <button
                key={id}
                onClick={() => {
                  setResultTab(id);
                  window.scrollTo({ top: 0 });
                }}
                className={`px-4 py-2 rounded-lg text-sm font-semibold border ${
                  resultTab === id
                    ? "bg-gradient-to-br from-[var(--color-gold)] to-[var(--color-gold-light)] border-[var(--color-gold)] text-[var(--color-navy)]"
                    : "bg-white border-[var(--color-silver)]/40 text-[var(--color-navy)] hover:border-[var(--color-gold)]"
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setPhase("numbers");
                window.scrollTo({ top: 0 });
              }}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold bg-[var(--color-navy)]/5 border border-[var(--color-silver)]/40 text-[var(--color-slate)]"
            >
              <ArrowLeft className="w-3.5 h-3.5 inline mr-1" /> Edit
            </button>
            <button
              onClick={() => {
                setPhase("quiz");
                setStep(0);
                setAnswers({});
                setNumbers({});
                setData(null);
              }}
              className="px-3 py-1.5 rounded-lg text-sm font-semibold border border-[var(--color-silver)]/40 text-[var(--color-slate)]"
            >
              <X className="w-3.5 h-3.5 inline mr-1" /> Reset
            </button>
          </div>
        </div>

        {resultTab === "budget" && (
          <>
            <BudgetCard data={data} />
            <div className="h-6" />
            <ZeroBudget data={data} n={numbers} />
          </>
        )}
        {resultTab === "plan" && <PlanSummary data={data} />}
        {resultTab === "debt" && <DebtPayoff data={data} />}
        {resultTab === "reports" && <GuidedReports data={data} />}

        <div className="mt-12 p-6 bg-[var(--color-parchment)] rounded-xl border border-[var(--color-gold)]/30">
          <h3 className="text-lg font-semibold mb-2">Want this saved and tracked over time?</h3>
          <p className="text-sm text-[var(--color-slate)] leading-relaxed mb-4">
            The full WealthWise app saves your plan, tracks your portfolio across all accounts, runs tax-loss harvesting, and updates your trajectory monthly.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <a href="https://wealth.auris8.com/signup" className="btn-primary">Start free trial</a>
            <a href="/ai-wealth-planner" className="btn-outline">Try AI Snapshot</a>
          </div>
        </div>
      </div>
    );
  }

  // ── QUIZ ──
  if (phase === "quiz") {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="flex justify-between items-center mb-5">
          <span className="text-sm font-semibold text-[var(--color-gold-dim)] uppercase tracking-wider inline-flex items-center gap-1.5">
            <Sparkles className="w-4 h-4 text-[var(--color-gold)]" /> GUIDED PLAN
          </span>
        </div>

        <div className="h-1.5 rounded-full bg-[var(--color-silver)]/30 mb-3 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-gold-light)] transition-all duration-500"
            style={{ width: `${(idx / visible.length) * 100}%` }}
          />
        </div>
        <div className="flex justify-between mb-4 text-xs">
          <span className="font-semibold text-[var(--color-gold-dim)] uppercase tracking-wider">{q.section}</span>
          <span className="text-[var(--color-steel)]">Question {idx + 1} of {visible.length}</span>
        </div>

        <h2 className="text-2xl md:text-3xl font-semibold text-[var(--color-navy)] leading-tight">{q.q}</h2>
        {q.sub && <p className="text-[var(--color-slate)] mt-2">{q.sub}</p>}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-6">
          {q.options.map((o) => (
            <button
              key={String(o.value)}
              onClick={() => (q.type === "multi" ? toggle(o.value) : pick(o.value))}
              className={`flex items-center gap-3 p-4 rounded-xl text-left font-semibold text-[var(--color-navy)] border-2 transition-all ${
                isSel(o.value)
                  ? "border-[var(--color-gold)] bg-[var(--color-gold)]/10 shadow"
                  : "border-[var(--color-silver)]/40 bg-white hover:border-[var(--color-gold)]/60"
              }`}
            >
              <span className="text-2xl">{o.icon}</span>
              <span className="text-sm">{o.label}</span>
            </button>
          ))}
        </div>

        <div className="flex justify-between items-center mt-8">
          <button
            onClick={back}
            disabled={step === 0}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold bg-[var(--color-navy)] text-[var(--color-cream)] disabled:opacity-30 disabled:cursor-not-allowed"
          >
            ← Back
          </button>
          {q.type === "multi" ? (
            <button
              onClick={next}
              disabled={!(answers[q.id] && (answers[q.id] as (string | number)[]).length)}
              className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Next →
            </button>
          ) : (
            <span className="text-xs text-[var(--color-steel)] italic">Tap an option to continue</span>
          )}
        </div>
      </div>
    );
  }

  // ── NUMBERS ──
  return (
    <NumbersForm
      answers={answers}
      numbers={numbers}
      setN={setN}
      onBack={() => {
        setPhase("quiz");
        setStep(visible.length - 1);
      }}
      onSubmit={createPlan}
    />
  );
}

interface NumbersFormProps {
  answers: Answers;
  numbers: Numbers;
  setN: (k: string) => (v: string | number) => void;
  onBack: () => void;
  onSubmit: () => void;
}

function NumbersForm({ answers, numbers, setN, onBack, onSubmit }: NumbersFormProps) {
  const hasA = (k: string) => Array.isArray(answers.assetTypes) && (answers.assetTypes as string[]).includes(k);
  const hasL = (k: string) =>
    (Array.isArray(answers.loans) && (answers.loans as string[]).includes(k)) ||
    (k === "home" && answers.home === "loan") ||
    (k === "car" && answers.car === "loan");
  const wantsGoal = (k: string) =>
    answers.goal === k || (Array.isArray(answers.goals2) && (answers.goals2 as string[]).includes(k));
  const hasKids = Array.isArray(answers.dependents) && (answers.dependents as string[]).includes("kids");
  const noAssets = !hasA("savings") && !hasA("fd") && !hasA("mf") && !hasA("stocks") && !hasA("epf") && !hasA("gold") && !hasA("crypto") && !hasA("realestate");

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="h-1.5 rounded-full bg-[var(--color-silver)]/30 mb-3 overflow-hidden">
        <div className="h-full rounded-full bg-gradient-to-r from-[var(--color-gold)] to-[var(--color-gold-light)]" style={{ width: "92%" }} />
      </div>

      <h2 className="text-2xl md:text-3xl font-semibold text-[var(--color-navy)]">Now, the numbers</h2>
      <p className="text-[var(--color-slate)] mt-2 mb-6">Fill in what you can — leave the rest blank. We only ask about what you told us you have.</p>

      <Card icon="🪪" title="About you">
        <Field label="Your name (optional)" value={String(numbers.name ?? "")} onChange={setN("name")} placeholder="e.g. Rajesh Kumar" />
        <Grid2>
          <Field label="Your age" type="number" value={String(numbers.age ?? answers.ageBand ?? "")} onChange={setN("age")} />
          <Field label="City (optional)" value={String(numbers.city ?? "")} onChange={setN("city")} placeholder="e.g. Pune" />
        </Grid2>
      </Card>

      <Card icon="📈" title="Monthly income" hint="Your take-home (in-hand) amounts per month.">
        <Grid2>
          <Field label="Take-home salary" type="number" prefix="₹" value={String(numbers.income ?? "")} onChange={setN("income")} />
          <Field label="Other income" type="number" prefix="₹" value={String(numbers.otherIncome ?? "")} onChange={setN("otherIncome")} note="Rent, freelance, etc." />
        </Grid2>
      </Card>

      <Card icon="🧾" title="Monthly expenses" hint="Roughly what you spend each month, by category.">
        <Grid2>
          <Field label={answers.home === "rent" ? "Rent" : "Housing / upkeep"} type="number" prefix="₹" value={String(numbers.e_housing ?? "")} onChange={setN("e_housing")} />
          <Field label="Utilities & bills" type="number" prefix="₹" value={String(numbers.e_utilities ?? "")} onChange={setN("e_utilities")} />
          <Field label="Groceries" type="number" prefix="₹" value={String(numbers.e_groceries ?? "")} onChange={setN("e_groceries")} />
          <Field label="Transport / fuel" type="number" prefix="₹" value={String(numbers.e_transport ?? "")} onChange={setN("e_transport")} />
          <Field label="Dining & entertainment" type="number" prefix="₹" value={String(numbers.e_dining ?? "")} onChange={setN("e_dining")} />
          {hasKids && <Field label="Childcare / school" type="number" prefix="₹" value={String(numbers.e_education ?? "")} onChange={setN("e_education")} />}
          <Field label="Health / medical" type="number" prefix="₹" value={String(numbers.e_health ?? "")} onChange={setN("e_health")} />
          <Field label="Shopping / personal" type="number" prefix="₹" value={String(numbers.e_shopping ?? "")} onChange={setN("e_shopping")} />
          <Field label="Subscriptions" type="number" prefix="₹" value={String(numbers.e_subscriptions ?? "")} onChange={setN("e_subscriptions")} />
          <Field label="Anything else" type="number" prefix="₹" value={String(numbers.e_other ?? "")} onChange={setN("e_other")} />
        </Grid2>
      </Card>

      <Card icon="🗓️" title="Irregular & annual costs (optional)" hint="Big bills that hit once or twice a year — we'll spread them across the months.">
        <Grid2>
          <Field label="Insurance premiums / yr" type="number" prefix="₹" value={String(numbers.a_insurance ?? "")} onChange={setN("a_insurance")} />
          <Field label="Festivals & gifts / yr" type="number" prefix="₹" value={String(numbers.a_festivals ?? "")} onChange={setN("a_festivals")} />
          <Field label="Vacations / yr" type="number" prefix="₹" value={String(numbers.a_vacation ?? "")} onChange={setN("a_vacation")} />
          <Field label="Maintenance & repairs / yr" type="number" prefix="₹" value={String(numbers.a_maintenance ?? "")} onChange={setN("a_maintenance")} />
        </Grid2>
      </Card>

      <Card icon="💰" title="Savings & investments" hint="Current value of what you own.">
        <Field label="Monthly amount you invest (SIP/RD)" type="number" prefix="₹" value={String(numbers.sip ?? "")} onChange={setN("sip")} />
        <Grid2>
          {hasA("savings") && <Field label="Savings account" type="number" prefix="₹" value={String(numbers.as_savings ?? "")} onChange={setN("as_savings")} />}
          {hasA("fd") && <Field label="Fixed deposits" type="number" prefix="₹" value={String(numbers.as_fd ?? "")} onChange={setN("as_fd")} />}
          {hasA("mf") && <Field label="Mutual funds" type="number" prefix="₹" value={String(numbers.as_mf ?? "")} onChange={setN("as_mf")} />}
          {hasA("stocks") && <Field label="Direct stocks" type="number" prefix="₹" value={String(numbers.as_stocks ?? "")} onChange={setN("as_stocks")} />}
          {hasA("epf") && <Field label="EPF / PPF / NPS" type="number" prefix="₹" value={String(numbers.as_epf ?? "")} onChange={setN("as_epf")} />}
          {hasA("gold") && <Field label="Gold" type="number" prefix="₹" value={String(numbers.as_gold ?? "")} onChange={setN("as_gold")} />}
          {hasA("crypto") && <Field label="Crypto" type="number" prefix="₹" value={String(numbers.as_crypto ?? "")} onChange={setN("as_crypto")} />}
          {hasA("realestate") && <Field label="Real estate (extra)" type="number" prefix="₹" value={String(numbers.as_realestate ?? "")} onChange={setN("as_realestate")} />}
          {(answers.home === "owned" || answers.home === "loan") && (
            <Field label="Value of your home" type="number" prefix="₹" value={String(numbers.as_homevalue ?? "")} onChange={setN("as_homevalue")} />
          )}
        </Grid2>
        {noAssets && (
          <p className="text-xs text-[var(--color-slate)] italic mt-2">
            You didn&apos;t select any asset types earlier — that&apos;s fine, we&apos;ll plan from your savings rate.
          </p>
        )}
      </Card>

      {answers.hasLoans === "yes" && (
        <Card icon="💳" title="Loans & liabilities" hint="Outstanding balance and the EMI you pay each month.">
          {hasL("home") && (
            <LoanRow label="🏠 Home loan" outKey="l_home_out" emiKey="l_home_emi" numbers={numbers} setN={setN} />
          )}
          {hasL("car") && (
            <LoanRow label="🚗 Car loan" outKey="l_car_out" emiKey="l_car_emi" numbers={numbers} setN={setN} />
          )}
          {hasL("personal") && (
            <LoanRow label="🧾 Personal loan" outKey="l_personal_out" emiKey="l_personal_emi" numbers={numbers} setN={setN} />
          )}
          {hasL("education") && (
            <LoanRow label="🎓 Education loan" outKey="l_education_out" emiKey="l_education_emi" numbers={numbers} setN={setN} />
          )}
          {hasL("cc") && (
            <LoanRow label="💳 Credit card" outKey="l_cc_out" emiKey="l_cc_emi" emiLabel="Min. payment / month" numbers={numbers} setN={setN} />
          )}
        </Card>
      )}

      <Card icon="🛡️" title="Insurance cover (optional)" hint="Total sum assured, not the premium.">
        <Grid2>
          <Field label="Life cover" type="number" prefix="₹" value={String(numbers.ins_life ?? "")} onChange={setN("ins_life")} />
          <Field label="Health cover" type="number" prefix="₹" value={String(numbers.ins_health ?? "")} onChange={setN("ins_health")} />
        </Grid2>
      </Card>

      {(wantsGoal("home") || wantsGoal("education") || wantsGoal("travel") || wantsGoal("car") || hasKids) && (
        <Card icon="🎯" title="Goal targets (optional)" hint="Roughly what each goal costs in today's money. Leave blank for a sensible default.">
          <Grid2>
            {wantsGoal("home") && <Field label="Home cost today" type="number" prefix="₹" value={String(numbers.g_home ?? "")} onChange={setN("g_home")} />}
            {(wantsGoal("education") || hasKids) && <Field label="Education cost today" type="number" prefix="₹" value={String(numbers.g_education ?? "")} onChange={setN("g_education")} />}
            {wantsGoal("car") && <Field label="Car cost today" type="number" prefix="₹" value={String(numbers.g_car ?? "")} onChange={setN("g_car")} />}
            {wantsGoal("travel") && <Field label="Travel budget today" type="number" prefix="₹" value={String(numbers.g_travel ?? "")} onChange={setN("g_travel")} />}
          </Grid2>
        </Card>
      )}

      <div className="flex justify-between mt-3">
        <button onClick={onBack} className="px-5 py-3 rounded-xl text-sm font-semibold bg-[var(--color-navy)] text-[var(--color-cream)]">
          ← Back
        </button>
        <button onClick={onSubmit} className="btn-primary px-8 py-3 text-base shadow-lg">
          Create My Plan →
        </button>
      </div>
    </div>
  );
}

function Card({ icon, title, hint, children }: { icon: string; title: string; hint?: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl p-6 shadow-sm border border-[var(--color-gold)]/10 mb-4">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">{icon}</span>
        <h3 className="text-lg font-semibold text-[var(--color-navy)]">{title}</h3>
      </div>
      {hint && <p className="text-xs text-[var(--color-slate)] mb-3">{hint}</p>}
      {children}
    </div>
  );
}

function Grid2({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 md:grid-cols-2 gap-3">{children}</div>;
}

interface FieldProps {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  prefix?: string;
  placeholder?: string;
  note?: string;
}

function Field({ label, value, onChange, type = "text", prefix, placeholder, note }: FieldProps) {
  return (
    <div>
      <label className="text-xs font-semibold text-[var(--color-slate)] block mb-1">{label}</label>
      <div className="relative">
        {prefix && (
          <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--color-steel)] text-sm">{prefix}</span>
        )}
        <input
          type={type}
          inputMode={type === "number" ? "numeric" : undefined}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full py-2.5 ${prefix ? "pl-7" : "pl-3"} pr-3 border border-[var(--color-silver)]/50 rounded-lg text-sm text-[var(--color-navy)] focus:outline-none focus:border-[var(--color-gold)]`}
        />
      </div>
      {note && <p className="text-[10px] text-[var(--color-steel)] mt-1">{note}</p>}
    </div>
  );
}

function LoanRow({ label, outKey, emiKey, emiLabel = "EMI / month", numbers, setN }: {
  label: string; outKey: string; emiKey: string; emiLabel?: string;
  numbers: Numbers; setN: (k: string) => (v: string) => void;
}) {
  return (
    <>
      <div className="text-xs font-semibold text-[var(--color-slate)] mt-2 mb-1">{label}</div>
      <Grid2>
        <Field label="Outstanding" type="number" prefix="₹" value={String(numbers[outKey] ?? "")} onChange={setN(outKey)} />
        <Field label={emiLabel} type="number" prefix="₹" value={String(numbers[emiKey] ?? "")} onChange={setN(emiKey)} />
      </Grid2>
    </>
  );
}
