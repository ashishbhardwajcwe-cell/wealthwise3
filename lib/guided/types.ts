export type QuestionType = "single" | "multi";

export interface QuestionOption {
  icon: string;
  label: string;
  value: string | number;
}

export interface Question {
  id: string;
  section: string;
  q: string;
  sub?: string;
  type: QuestionType;
  options: QuestionOption[];
  showIf?: (answers: Answers) => boolean;
}

export type Answers = Record<string, string | number | (string | number)[]>;

export type Numbers = Record<string, string | number>;

export interface Asset {
  name: string;
  type: "Equity" | "Debt" | "Gold" | "Other";
  value: number;
}

export interface PhysicalAsset {
  name: string;
  value: number;
}

export interface Liability {
  name: string;
  outstanding: number;
  emi: number;
  rate: number;
}

export interface Goal {
  name: string;
  year: number;
  currentValue: number;
  inflation: number;
  priority: "Low" | "Medium" | "High";
}

export interface GuidedData {
  name: string;
  city: string;
  dob: string;
  retirementAge: number;
  incomeGrowth: number;
  riskProfile: "Conservative" | "Balanced" | "Aggressive";
  equityAlloc: number;
  debtAlloc: number;
  equityReturn: number;
  debtReturn: number;
  realEstateReturn: number;
  salaryMonthly: number;
  otherIncomeMonthly: number;
  householdExp: number;
  childcareExp: number;
  vacationExp: number;
  giftsExp: number;
  otherExp: number;
  sipMonthly: number;
  pfMonthly: number;
  assets: Asset[];
  physicalAssets: PhysicalAsset[];
  liabilities: Liability[];
  insurance: { lifeCover: number; healthCover: number };
  goals: Goal[];
}
