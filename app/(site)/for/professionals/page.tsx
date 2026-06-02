import type { Metadata } from "next";
import { AudienceLanding } from "@/components/AudienceLanding";

export const metadata: Metadata = {
  title: "Financial Planning for Salaried Professionals — Mid-Career",
  description:
    "For salaried mid-career professionals (₹15L–₹1Cr income): tax optimisation, ESOP planning, kids' education, retirement on track.",
};

export default function Page() {
  return (
    <AudienceLanding
      content={{
        eyebrow: "For Salaried Professionals",
        title: "Mid-career planning that actually compounds.",
        subtitle: "For professionals earning ₹15L–₹1Cr who are doing OK but want clarity: am I saving enough? Are my SIPs in the right funds? Will I retire when I want?",
        intro: [
          "Most mid-career professionals have a salary, a home loan, an EPF, a couple of mutual funds, maybe some ESOPs, term insurance someone’s spouse sold them, and a vague worry that “something might be off.”",
          "Often something is off — too much in their employer’s stock, term cover too low for the home loan they took, EPF not actively tracked, ESOPs ignored till they vest worthless, tax regime choice copy-pasted from a colleague. A 90-minute proper plan often unlocks ₹3–5 lakhs a year of better outcome.",
        ],
        whatYouGet: [
          "Old vs new tax regime decision (more nuanced than the calculators suggest — factors in 80C optimisation, HRA, home loan interest, NPS)",
          "ESOP / RSU planning: when to exercise, when to hold vs sell, tax-efficient diversification away from concentration",
          "Kids’ education planning: realistic costs (with inflation), the right SIP, USD vs INR vehicles for overseas education",
          "Term insurance and health insurance gap analysis",
          "Retirement math: when can you actually retire, what corpus is needed, is your current SIP rate enough",
          "EPF + NPS + PPF optimisation: which to push, which to stop, which to ignore",
        ],
        commonSituations: [
          {
            title: "“I’m 35, earning ₹40L, with ₹50L invested — am I on track?”",
            copy: "Depends on your goals, expenses, and existing investments — but the AI Wealth Planner gives you a 60-second view, and a full plan tells you precisely whether you’ll retire at 55 or 65 on current trajectory, and the three things that would move that needle most.",
          },
          {
            title: "“I have ₹80L in my employer’s stock — should I sell?”",
            copy: "Almost certainly yes, in tranches. Concentration in employer stock is one of the worst risks professionals carry — your income depends on that company, and so does your wealth. We model tax-efficient diversification with LTCG harvesting and STP into broad indices.",
          },
          {
            title: "“I switched to new tax regime two years ago — was that right?”",
            copy: "Depends on your deductions usage, home loan, HRA, and 80C habits. About 40% of professionals who switched would actually be better off in old regime. We run the precise math with your numbers — and the answer often changes year to year as your situation evolves.",
          },
          {
            title: "“Buy a home now or keep renting?”",
            copy: "Pure rent vs buy math in metros currently favours rent (rental yields 2–3% vs home loan 8–9%). But emotional, lifestyle, and stability factors matter. We model the precise opportunity cost both ways for your specific city, EMI capacity, and horizon — then you decide.",
          },
        ],
        ctaTitle: "Build your plan in 60 seconds",
      }}
    />
  );
}
