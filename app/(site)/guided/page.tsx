import type { Metadata } from "next";
import { GuidedPlanWizard } from "@/components/guided/GuidedPlanWizard";

export const metadata: Metadata = {
  title: "Guided Plan — Build your financial plan in 10 minutes",
  description:
    "A guided, question-by-question financial plan: budget, goals, debt payoff, net-worth projection. Indian-investor focused, no jargon.",
};

export default function GuidedPage() {
  return (
    <div className="bg-[var(--color-offwhite)] min-h-screen">
      <GuidedPlanWizard />
    </div>
  );
}
