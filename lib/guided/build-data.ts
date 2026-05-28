import type {
  Answers, Numbers, GuidedData, Asset, PhysicalAsset, Liability, Goal,
} from "./types";

const toNum = (v: unknown): number => {
  const x = parseFloat(String(v ?? ""));
  return isNaN(x) ? 0 : x;
};

const has = (a: Answers, key: string, val: string | number) =>
  Array.isArray(a[key]) && (a[key] as (string | number)[]).includes(val);

const defaultData = (): GuidedData => ({
  name: "",
  city: "",
  dob: "1990-01-01",
  retirementAge: 60,
  incomeGrowth: 6,
  riskProfile: "Balanced",
  equityAlloc: 60,
  debtAlloc: 40,
  equityReturn: 11,
  debtReturn: 7,
  realEstateReturn: 6,
  salaryMonthly: 0,
  otherIncomeMonthly: 0,
  householdExp: 0,
  childcareExp: 0,
  vacationExp: 0,
  giftsExp: 0,
  otherExp: 0,
  sipMonthly: 0,
  pfMonthly: 0,
  assets: [],
  physicalAssets: [],
  liabilities: [],
  insurance: { lifeCover: 0, healthCover: 0 },
  goals: [],
});

export function buildGuidedData(answers: Answers, n: Numbers): GuidedData {
  const base = defaultData();
  const yr = new Date().getFullYear();
  const age = toNum(n.age) || Number(answers.ageBand) || 35;

  base.name = String(n.name ?? "").trim();
  base.city = String(n.city ?? "").trim();
  base.dob = `${yr - age}-01-01`;
  base.retirementAge = Number(answers.retireAge) || 55;
  base.incomeGrowth =
    answers.incomeGrowthExp === "high" ? 10 : answers.incomeGrowthExp === "low" ? 3 : 6;

  const riskMap: Record<string, [GuidedData["riskProfile"], number]> = {
    cons: ["Conservative", 40],
    "bal-": ["Balanced", 60],
    bal: ["Balanced", 70],
    agg: ["Aggressive", 85],
  };
  const [rp, eqInit] = riskMap[String(answers.risk)] ?? ["Balanced", 70];
  let eq = eqInit;
  if (answers.horizon === "short" && eq > 50) eq = 50;
  base.riskProfile = rp;
  base.equityAlloc = eq;
  base.debtAlloc = 100 - eq;

  base.salaryMonthly = toNum(n.income);
  base.otherIncomeMonthly = toNum(n.otherIncome);

  // Monthly expenses, grouped from detailed categories + monthly slice of annual costs
  const mAnnual = (v: unknown) => toNum(v) / 12;
  base.householdExp = Math.round(
    toNum(n.e_housing) + toNum(n.e_utilities) + toNum(n.e_groceries) + toNum(n.e_shopping),
  );
  base.childcareExp = Math.round(toNum(n.e_education));
  base.vacationExp = Math.round(toNum(n.e_dining) + mAnnual(n.a_vacation));
  base.giftsExp = Math.round(toNum(n.e_subscriptions) + mAnnual(n.a_festivals));
  base.otherExp = Math.round(
    toNum(n.e_transport) + toNum(n.e_health) + toNum(n.e_other) +
    mAnnual(n.a_insurance) + mAnnual(n.a_maintenance),
  );
  const totExpM = base.householdExp + base.childcareExp + base.vacationExp + base.giftsExp + base.otherExp;
  const annualExp = totExpM * 12;

  base.sipMonthly = toNum(n.sip);
  base.pfMonthly = 0;

  // Assets
  const assets: Asset[] = [];
  const pushA = (name: string, type: Asset["type"], v: unknown) => {
    if (toNum(v) > 0) assets.push({ name, type, value: toNum(v) });
  };
  pushA("Mutual Funds", "Equity", n.as_mf);
  pushA("Direct Stocks", "Equity", n.as_stocks);
  pushA("Savings Account", "Debt", n.as_savings);
  pushA("Fixed Deposits", "Debt", n.as_fd);
  pushA("EPF / PPF / NPS", "Debt", n.as_epf);
  pushA("Gold", "Gold", n.as_gold);
  pushA("Crypto", "Other", n.as_crypto);
  if (assets.length === 0) assets.push({ name: "Savings", type: "Debt", value: 0 });
  base.assets = assets;

  const physical: PhysicalAsset[] = [];
  if ((answers.home === "owned" || answers.home === "loan") && toNum(n.as_homevalue) > 0) {
    physical.push({ name: "Home", value: toNum(n.as_homevalue) });
  }
  if (toNum(n.as_realestate) > 0) {
    physical.push({ name: "Real Estate", value: toNum(n.as_realestate) });
  }
  base.physicalAssets = physical;

  // Liabilities
  const liab: Liability[] = [];
  const pushL = (name: string, out: unknown, emi: unknown, rate: number) => {
    if (toNum(out) > 0 || toNum(emi) > 0) {
      liab.push({ name, outstanding: toNum(out), emi: toNum(emi), rate });
    }
  };
  const loanSel = (k: string) =>
    has(answers, "loans", k) ||
    (k === "home" && answers.home === "loan") ||
    (k === "car" && answers.car === "loan");
  if (loanSel("home")) pushL("Home Loan", n.l_home_out, n.l_home_emi, 8.5);
  if (loanSel("car")) pushL("Car Loan", n.l_car_out, n.l_car_emi, 9.5);
  if (loanSel("personal")) pushL("Personal Loan", n.l_personal_out, n.l_personal_emi, 13);
  if (loanSel("education")) pushL("Education Loan", n.l_education_out, n.l_education_emi, 9);
  if (loanSel("cc")) pushL("Credit Card", n.l_cc_out, n.l_cc_emi, 38);
  base.liabilities = liab;

  // Insurance
  base.insurance = { lifeCover: toNum(n.ins_life), healthCover: toNum(n.ins_health) };

  // Goals
  const yToRet = Math.max(base.retirementAge - age, 1);
  const hasKids = has(answers, "dependents", "kids");
  const kidsCount = Number(answers.kids) || 1;

  const goalDefs: Record<string, () => Goal> = {
    home: () => ({
      name: "Home Purchase", year: yr + 7,
      currentValue: toNum(n.g_home) || 8000000, inflation: 5, priority: "High",
    }),
    education: () => ({
      name: "Children's Education", year: yr + 15,
      currentValue: toNum(n.g_education) || 3000000 * kidsCount,
      inflation: 10, priority: "High",
    }),
    retire: () => ({
      name: "Early Retirement Fund", year: yr + yToRet,
      currentValue: annualExp * 15 || 5000000, inflation: 6, priority: "High",
    }),
    wealth: () => ({
      name: "Wealth Building", year: yr + 15,
      currentValue: 5000000, inflation: 6, priority: "Medium",
    }),
    emergency: () => ({
      name: "Emergency Fund", year: yr + 1,
      currentValue: totExpM * 6 || 300000, inflation: 6, priority: "High",
    }),
    travel: () => ({
      name: "Travel / Lifestyle", year: yr + 3,
      currentValue: toNum(n.g_travel) || 500000, inflation: 6, priority: "Low",
    }),
    car: () => ({
      name: "Car Purchase", year: yr + 4,
      currentValue: toNum(n.g_car) || 1000000, inflation: 6, priority: "Medium",
    }),
  };

  const chosen = new Set<string>(
    [String(answers.goal), ...(Array.isArray(answers.goals2) ? (answers.goals2 as string[]) : [])].filter(Boolean),
  );
  if (hasKids) chosen.add("education");

  const goals: Goal[] = [];
  if (answers.goal && goalDefs[String(answers.goal)]) {
    const g = goalDefs[String(answers.goal)]();
    g.priority = "High";
    goals.push(g);
    chosen.delete(String(answers.goal));
  }
  chosen.forEach((k) => {
    if (goalDefs[k]) goals.push(goalDefs[k]());
  });
  if (![...chosen, String(answers.goal)].includes("retire")) {
    goals.push({
      name: "Retirement Corpus", year: yr + yToRet,
      currentValue: annualExp * 12 || 5000000, inflation: 6, priority: "High",
    });
  }
  base.goals = goals;

  return base;
}
