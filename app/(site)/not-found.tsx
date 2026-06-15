import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="text-center px-6">
        <span className="eyebrow">404</span>
        <h1 className="mt-3 mb-4">This page took a detour.</h1>
        <p className="text-[var(--color-slate)] max-w-md mx-auto mb-8">
          The URL you tried doesn&apos;t exist on PlanMyCashflows. Try one of these:
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/" className="btn-primary">Home</Link>
          <Link href="/plan" className="btn-outline">Wealth Planner</Link>
          <Link href="/blog" className="btn-outline">Blog</Link>
        </div>
      </div>
    </div>
  );
}
