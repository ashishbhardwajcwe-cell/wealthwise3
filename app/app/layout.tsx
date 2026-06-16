import { Header } from "@/components/Header";
import { CurrencyProvider } from "@/components/CurrencyProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CurrencyProvider>
        <Header />
        {/* The planner ships its own sticky toolbar (logo + Sign In). Stop it
            from fighting the site header for top:0 — push it down to sit
            cleanly underneath so both stay visible while the user scrolls.
            The site header is h-16 (64px). */}
        <style>{`nav.glass-nav.no-print { top: 64px !important; }`}</style>
        <main>{children}</main>
      </CurrencyProvider>
    </AuthProvider>
  );
}
