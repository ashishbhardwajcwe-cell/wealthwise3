import type { Liability } from "./types";

export type DebtStrategy = "avalanche" | "snowball";

export interface DebtSimResult {
  months: number;
  interest: number;
}

export function simulateDebt(
  liabs: Liability[],
  extra: number,
  strategy: DebtStrategy,
): DebtSimResult {
  const L = liabs
    .filter((l) => (l.outstanding ?? 0) > 0)
    .map((l) => ({
      bal: l.outstanding,
      r: (l.rate ?? 0) / 100 / 12,
      emi: l.emi ?? 0,
    }));

  if (L.length === 0) return { months: 0, interest: 0 };

  let months = 0;
  let interest = 0;

  while (L.some((l) => l.bal > 0.5) && months < 1200) {
    months++;
    let freed = 0;

    L.forEach((l) => {
      if (l.bal <= 0) {
        freed += l.emi;
        return;
      }
      const i = l.bal * l.r;
      interest += i;
      const pay = Math.min(l.emi, l.bal + i);
      l.bal = l.bal + i - pay;
      if (l.bal < 0) l.bal = 0;
    });

    let extraLeft = extra + freed;
    const order = L.filter((l) => l.bal > 0).sort((a, b) =>
      strategy === "avalanche" ? b.r - a.r : a.bal - b.bal,
    );

    for (const l of order) {
      if (extraLeft <= 0) break;
      const pay = Math.min(extraLeft, l.bal);
      l.bal -= pay;
      extraLeft -= pay;
    }
  }

  return { months, interest: Math.round(interest) };
}
