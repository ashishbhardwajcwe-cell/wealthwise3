/**
 * Skeleton for the PMS explorer while the strategy feed is fetched.
 * Mirrors the hero, the sticky control bar and the first row of cards so the
 * page doesn't jump when the real content lands.
 */
export default function Loading() {
  return (
    <div className="font-ui min-h-screen" style={{ background: "var(--page)" }} aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading PMS strategies…</span>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col gap-6">
        <div className="flex flex-col gap-3">
          <div className="pmc-skel" style={{ width: 150, height: 12, borderRadius: 4 }} />
          <div className="pmc-skel" style={{ width: 280, height: 38, borderRadius: 6 }} />
          <div className="pmc-skel" style={{ width: "min(100%, 520px)", height: 14, borderRadius: 4 }} />
        </div>

        {/* control bar */}
        <div className="flex flex-wrap gap-2">
          <div className="pmc-skel" style={{ flex: "1 1 220px", height: 40, borderRadius: 12 }} />
          <div className="pmc-skel" style={{ width: 210, height: 40, borderRadius: 12 }} />
          <div className="pmc-skel" style={{ width: 130, height: 40, borderRadius: 12 }} />
        </div>

        {/* card grid */}
        <div className="grid gap-4" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))" }}>
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="rounded-2xl bg-white p-4 flex flex-col gap-3" style={{ border: "1px solid var(--line)" }}>
              <div className="flex items-center gap-2">
                <div className="pmc-skel" style={{ width: 34, height: 34, borderRadius: 8 }} />
                <div className="pmc-skel" style={{ width: 150, height: 12, borderRadius: 4 }} />
              </div>
              <div className="pmc-skel" style={{ width: "85%", height: 20, borderRadius: 4 }} />
              <div className="pmc-skel" style={{ width: 110, height: 30, borderRadius: 4 }} />
              <div className="grid grid-cols-6 gap-1.5">
                {Array.from({ length: 6 }).map((__, j) => (
                  <div key={j} className="pmc-skel" style={{ height: 38, borderRadius: 8 }} />
                ))}
              </div>
              <div className="pmc-skel" style={{ width: "100%", height: 34, borderRadius: 8 }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
