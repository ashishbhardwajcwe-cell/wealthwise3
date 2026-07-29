/**
 * Skeleton for a strategy page.
 *
 * Every strategy is pre-rendered now, so this rarely shows — but it still
 * covers an ISR revalidation and any strategy added between deploys, which
 * render on demand. It mirrors the real layout — hero stat, facts grid,
 * returns table — so the wait reads as loading rather than as a broken page.
 */
function Bar({ w, h = 14 }: { w: string; h?: number }) {
  return <div className="pmc-skel" style={{ width: w, height: h, borderRadius: 4 }} />;
}

export default function Loading() {
  return (
    <div className="font-ui min-h-screen" style={{ background: "var(--page)" }} aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading strategy…</span>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 flex flex-col gap-6">
        <Bar w="120px" h={13} />

        <div className="flex flex-col gap-3">
          <Bar w="80%" h={30} />
          <Bar w="180px" h={13} />
        </div>

        {/* hero stat */}
        <div className="rounded-2xl bg-white p-5 flex items-end justify-between" style={{ border: "1px solid var(--line)" }}>
          <div className="flex flex-col gap-2.5">
            <Bar w="140px" h={40} />
            <Bar w="160px" h={12} />
          </div>
          <Bar w="90px" h={22} />
        </div>

        {/* facts grid */}
        <div className="grid grid-cols-2 gap-3">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl px-3 py-2.5 flex flex-col gap-2" style={{ background: "var(--flat-bg)" }}>
              <Bar w="60px" h={11} />
              <Bar w="90px" h={16} />
            </div>
          ))}
        </div>

        {/* returns table */}
        <div className="rounded-xl overflow-hidden flex flex-col" style={{ border: "1px solid var(--line)" }}>
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="flex items-center justify-between px-3 py-2.5"
              style={{ borderTop: i === 0 ? "none" : "1px solid var(--line)", background: i === 0 ? "var(--flat-bg)" : "transparent" }}
            >
              <Bar w="42px" h={12} />
              <Bar w="56px" h={12} />
              <Bar w="56px" h={12} />
              <Bar w="42px" h={12} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
