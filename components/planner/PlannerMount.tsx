"use client";

import dynamic from "next/dynamic";
import Script from "next/script";
import type { ComponentType } from "react";

type PlannerProps = {
  initialPage?: "landing" | "dashboard" | "guided";
  /** Hide the planner's own navbar + footer — the site layout provides them. */
  embedded?: boolean;
};

// The planner is a self-contained client SPA (Supabase auth, Recharts, PDF
// export, direct window/document access). Load it client-only so it never
// runs during SSR / prerender. It's authored in JS, so type its props here.
const PlannerApp = dynamic(() => import("./PlannerApp"), {
  ssr: false,
  loading: () => <div style={{ minHeight: "100vh", background: "#FFFDF5" }} />,
}) as ComponentType<PlannerProps>;

export default function PlannerMount({ initialPage, embedded = true }: PlannerProps) {
  return (
    <>
      {/* Cashfree checkout SDK — used by the in-app Pro upgrade flow */}
      <Script src="https://sdk.cashfree.com/js/v3/cashfree.js" strategy="afterInteractive" />
      <PlannerApp initialPage={initialPage} embedded={embedded} />
    </>
  );
}
