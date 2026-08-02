/**
 * The strategy "Brief" slide-in sheet — ONE component, opened from the card
 * grid on the PMS Explorer (components/pms/PMSExplorer.tsx) and on the compare
 * page (components/compare/CompareExplorer.tsx).
 *
 * It was a local function inside PMSExplorer. Lifting it out unchanged is what
 * lets the compare page wire `onBrief` exactly as the explorer does without
 * importing the whole explorer — and therefore its ~1,700-row filtering,
 * sorting and tray — into the compare page's bundle.
 *
 * Not marked "use client": no hooks here, so it compiles into whichever client
 * component imports it (both current callers are client components — they own
 * the brief/enquire state the handlers below drive).
 */

import Link from "next/link";
import { X, ArrowUpRight } from "lucide-react";
import {
  type Strategy, type Benchmark,
  FactsGrid, ReturnsVsBenchmarkTable, HowToReadThis,
} from "@/components/pms/strategy-shared";
import { Modal } from "@/components/ui/Modal";

export function BriefSheet({ s, asOn, benchmark, onClose, onEnquire }: {
  s: Strategy | null;
  asOn: string;
  benchmark: Benchmark;
  onClose: () => void;
  onEnquire: (s: Strategy) => void;
}) {
  if (!s) return null;
  return (
    <Modal
      onClose={onClose}
      label={`${s.strategy} — brief`}
      align="end"
      overlayClassName="fixed inset-0 flex justify-end"
      overlayStyle={{ background: "rgba(15,26,20,0.45)" }}
      panelClassName="h-full w-full max-w-md bg-white overflow-y-auto"
      panelStyle={{ boxShadow: "-8px 0 40px rgba(0,0,0,0.15)" }}
    >
      <>
        <div className="sticky top-0 bg-white px-5 py-4 flex items-start justify-between" style={{ borderBottom: "1px solid var(--line)" }}>
          <div>
            <div className="font-ui" style={{ fontSize: 12, color: "var(--muted)" }}>{s.manager}</div>
            <h2 className="font-display" style={{ fontSize: 22, fontWeight: 600, color: "var(--ink)", lineHeight: 1.1 }}>{s.strategy}</h2>
          </div>
          <button onClick={onClose} aria-label="Close brief" className="rounded-lg p-1.5" style={{ background: "var(--flat-bg)" }}><X size={18} color="var(--ink)" /></button>
        </div>

        <div className="p-5">
          {/* facts */}
          <FactsGrid s={s} />

          {/* full analysis lives on the strategy's own SEO page */}
          <Link href={`/pms/${s.slug}`}
            className="font-ui mt-3 flex items-center justify-between rounded-xl px-4 py-3"
            style={{ fontSize: 13, fontWeight: 600, color: "var(--green-deep)", background: "var(--green-tint)", border: "1px solid var(--green)" }}>
            View full analysis <ArrowUpRight size={15} />
          </Link>

          {/* full grid vs benchmark */}
          <h3 className="font-ui mt-5 mb-2" style={{ fontSize: 13, fontWeight: 600, color: "var(--ink)" }}>Returns vs {benchmark.name}</h3>
          <ReturnsVsBenchmarkTable returns={s.returns} bench={benchmark.returns} />

          {/* honest read */}
          <div className="mt-4">
            <HowToReadThis returns={s.returns} asOn={asOn} bench={benchmark.returns} />
          </div>

          <button onClick={() => onEnquire(s)}
            className="font-ui w-full mt-4 rounded-xl py-3" style={{ fontSize: 14, fontWeight: 600, color: "#fff", background: "var(--green)" }}>
            Enquire about {s.strategy}
          </button>
        </div>
      </>
    </Modal>
  );
}
