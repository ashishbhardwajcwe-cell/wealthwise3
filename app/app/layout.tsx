import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CurrencyProvider } from "@/components/CurrencyProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";
import { DisclaimerBanner } from "@/components/DisclaimerBanner";

/**
 * The planner (/app) reuses the marketing site's Header + Footer so moving
 * from the homepage into the AI planner feels like one continuous site —
 * same nav, same logo, same brand chrome. The planner itself is mounted
 * with `embedded` so it suppresses its own navbar/footer and renders only
 * its content between this shared header and footer.
 */
export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CurrencyProvider>
        <Header />
        <main>{children}</main>
        <DisclaimerBanner />
        <Footer />
      </CurrencyProvider>
    </AuthProvider>
  );
}
