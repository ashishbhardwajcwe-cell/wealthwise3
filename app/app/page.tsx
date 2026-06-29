import type { Metadata } from "next";
import PlannerMount from "@/components/planner/PlannerMount";

export const metadata: Metadata = {
  title: "CashFlow Planner",
  description: "Your personalised financial independence planner.",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <PlannerMount />;
}
