/**
 * Skeleton for the unlisted-shares page while the Sanity feed is fetched.
 * Approximates the compliance ribbon, hero and the explorer's card grid.
 */
export default function Loading() {
  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading unlisted companies…</span>

      {/* compliance ribbon */}
      <div className="sticky top-16 z-40 bg-[var(--color-navy)]">
        <div className="container-wide py-2 flex justify-center">
          <div className="pmc-skel" style={{ width: "min(90%, 560px)", height: 12, borderRadius: 4, opacity: 0.35 }} />
        </div>
      </div>

      <section className="py-16 bg-white">
        <div className="container-wide flex flex-col gap-10">
          <div className="max-w-3xl flex flex-col gap-3">
            <div className="pmc-skel" style={{ width: 190, height: 12, borderRadius: 4 }} />
            <div className="pmc-skel" style={{ width: "min(100%, 420px)", height: 34, borderRadius: 6 }} />
            <div className="pmc-skel" style={{ width: "min(100%, 620px)", height: 14, borderRadius: 4 }} />
            <div className="pmc-skel" style={{ width: 260, height: 14, borderRadius: 4 }} />
          </div>

          <div className="flex flex-wrap gap-2">
            <div className="pmc-skel" style={{ flex: "1 1 240px", height: 42, borderRadius: 12 }} />
            <div className="pmc-skel" style={{ width: 170, height: 42, borderRadius: 12 }} />
            <div className="pmc-skel" style={{ width: 120, height: 42, borderRadius: 12 }} />
          </div>

          <div className="grid gap-5" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))" }}>
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl bg-white p-5 flex flex-col gap-4 border border-[var(--color-silver)]/40">
                <div className="flex items-start gap-3">
                  <div className="pmc-skel" style={{ width: 44, height: 44, borderRadius: 12 }} />
                  <div className="flex-1 flex flex-col gap-2">
                    <div className="pmc-skel" style={{ width: "85%", height: 15, borderRadius: 4 }} />
                    <div className="pmc-skel" style={{ width: 100, height: 14, borderRadius: 999 }} />
                  </div>
                </div>
                <div className="pmc-skel" style={{ width: "100%", height: 96, borderRadius: 12 }} />
                <div className="pmc-skel" style={{ width: "100%", height: 36, borderRadius: 8 }} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
