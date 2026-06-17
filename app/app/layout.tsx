import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CurrencyProvider } from "@/components/CurrencyProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";

/**
 * The planner (/app) reuses the marketing site's Header AND full Footer so
 * moving from the homepage into the AI planner feels like one continuous
 * site — identical navigation and the same complete sitemap of links in the
 * footer. The planner itself is mounted with `embedded` so it suppresses its
 * own navbar/footer.
 *
 * min-h-screen + flex column keeps the footer pinned to the bottom even when
 * a planner step is short, so there's no floating-footer gap.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CurrencyProvider>
        <div className="min-h-screen flex flex-col">
          <Header />
          <main className="flex-1 flex flex-col">{children}</main>
          <Footer />
        </div>
      </CurrencyProvider>
    </AuthProvider>
  );
}
