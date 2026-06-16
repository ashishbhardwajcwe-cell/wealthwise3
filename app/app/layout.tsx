import { Header } from "@/components/Header";
import { CurrencyProvider } from "@/components/CurrencyProvider";
import { AuthProvider } from "@/components/auth/AuthProvider";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthProvider>
      <CurrencyProvider>
        <Header />
        {/* The planner ships its own thin sticky toolbar (logo + Sign In +
            Guided Plan). The site header above already covers every action
            it offered — nav, sign in (shared Supabase cookie), Guided Plan
            (Planners dropdown). Hide the planner's toolbar so /app reads as
            a continuation of the marketing site instead of a second app. */}
        <style>{`nav.glass-nav.no-print { display: none !important; }`}</style>
        <main>{children}</main>
      </CurrencyProvider>
    </AuthProvider>
  );
}
