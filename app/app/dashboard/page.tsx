import type { Metadata } from "next";
import PlannerMount from "@/components/planner/PlannerMount";

export const metadata: Metadata = {
  title: "Dashboard",
  robots: { index: false, follow: false },
};

export default function Page() {
  return <PlannerMount initialPage="dashboard" />;
}
