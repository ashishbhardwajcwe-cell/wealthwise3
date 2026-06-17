import { Header } from "@/components/Header";
import { AppFooter } from "@/components/AppFooter";
import { CurrencyProvider } from "@/components/CurrencyProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";

/**
 * The planner (/app) reuses the marketing site's Header so moving from the
 * homepage into the AI planner feels like one continuous site. It gets a
 * SLIM footer (AppFooter) rather than the full marketing sitemap — a giant
 * footer under a data-entry tool reads as bolted-on. The planner itself is
 * mounted with `embedded` so it suppresses its own navbar/footer.
 *
 * min-h-screen + flex column keeps the slim footer pinned to the bottom even
 * when a planner step is short, so there's no floating-footer gap.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CurrencyProvider>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 flex flex-col">{children}</main>
          <AppFooter />
        </div>
      </CurrencyProvider>
    </AuthProvider>
  );
}
