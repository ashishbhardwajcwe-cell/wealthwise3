import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Bot,
  Check,
  Compass,
  Eye,
  Gem,
  GraduationCap,
  Handshake,
  Scale,
} from "lucide-react";
import { LazyYouTube, HERO_VIDEO_ID } from "@/components/home/LazyYouTube";
import { FeaturedStrategies } from "@/components/home/FeaturedStrategies";
import { HomeFaq } from "@/components/home/HomeFaq";
import { HomeNewsletter } from "@/components/home/HomeNewsletter";
import { StructuredData, faqSchema } from "@/components/StructuredData";
import { siteConfig } from "@/lib/site-config";
import { comparisonRows, educationTiles, homeFaqs, industryStats } from "@/lib/home-content";

const PAGE_TITLE = "PlanMyCashflows | Explore India's Leading PMS & AIF Strategies";
const PAGE_DESCRIPTION =
  "Discover, compare and understand Portfolio Management Services (PMS) and Alternative Investment Funds (AIF) across India's leading fund houses. AI-powered, unbiased and education-first — for HNIs, professionals, business owners and NRIs.";

export const metadata: Metadata = {
  title: { absolute: PAGE_TITLE },
  description: PAGE_DESCRIPTION,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: siteConfig.url,
    siteName: siteConfig.name,
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
  twitter: {
    card: "summary_large_image",
    title: PAGE_TITLE,
    description: PAGE_DESCRIPTION,
  },
};

export default function HomePage() {
  return (
    <>
      {/* 1 — Hero: text left, lazy video facade right */}
      <section className="gradient-hero aurora">
        <div className="container-wide py-16 md:py-24 grid lg:grid-cols-2 gap-10 lg:gap-14 items-center">
          <div className="flex flex-col items-center text-center lg:items-start lg:text-left order-1">
            <span className="eyebrow animate-fade-up">AI-Powered PMS & AIF Discovery Platform</span>
            <h1 className="mt-4 text-balance animate-fade-up" style={{ animationDelay: "0.05s" }}>
              Explore India&apos;s Leading PMS & AIF Strategies — In One Place
            </h1>
            <p
              className="mt-6 text-lg md:text-xl text-[var(--color-slate)] leading-relaxed text-balance animate-fade-up"
              style={{ animationDelay: "0.12s" }}
            >
              PlanMyCashflows is an AI-powered platform that helps affluent professionals, business owners, HNIs,
              UHNIs and NRIs discover, compare and understand Portfolio Management Services (PMS) and Alternative
              Investment Funds (AIF) from India&apos;s leading fund houses — with unbiased research and
              education-first guidance, all in one place.
            </p>
            <div
              className="mt-8 flex flex-col sm:flex-row gap-3 animate-fade-up"
              style={{ animationDelay: "0.18s" }}
            >
              <a href="#strategies" className="btn-primary">
                Explore PMS & AIF Strategies
              </a>
              <a href={siteConfig.topmateUrl} target="_blank" rel="noreferrer" className="btn-outline">
                Book a Call
              </a>
            </div>
            <p
              className="mt-8 text-xs text-[var(--color-slate)] uppercase tracking-wider animate-fade-up"
              style={{ animationDelay: "0.24s" }}
            >
              SEBI-regulated products · Curated across multiple fund houses · Education-first, no sales pressure
            </p>
          </div>
          <div className="order-2 animate-fade-up" style={{ animationDelay: "0.15s" }}>
            <LazyYouTube videoId={HERO_VIDEO_ID} title="How PlanMyCashflows works" />
            <p className="text-xs text-[var(--color-slate)] mt-3 text-center">
              ▶ Watch: How PlanMyCashflows works (2 min)
            </p>
          </div>
        </div>
      </section>

      {/* 2 — What is PMS / What is AIF */}
      <section className="py-20 md:py-28">
        <div className="container-wide">
          <div className="max-w-3xl mx-auto text-center mb-12 reveal">
            <span className="eyebrow">Learn the basics</span>
            <h2 className="mt-3 text-balance">Understand PMS & AIF Before You Invest</h2>
          </div>

          <div className="grid lg:grid-cols-2 gap-6 reveal">
            <div className="glass-card">
              <h3 className="text-xl font-semibold mb-4">What is a Portfolio Management Service (PMS)?</h3>
              <p className="text-sm text-[var(--color-slate)] leading-relaxed">
                A Portfolio Management Service is a professionally managed, personalised investment portfolio built
                and managed for you by a SEBI-registered portfolio manager. Unlike a mutual fund — where your money
                is pooled and you hold units — in a PMS the securities are held directly in your own name and demat
                account, giving you full transparency into every holding. SEBI mandates a{" "}
                <strong>minimum investment of ₹50 lakh</strong> per portfolio manager. PMS can be{" "}
                <strong>discretionary</strong> (the manager makes buy/sell decisions on your behalf) or{" "}
                <strong>non-discretionary</strong> (the manager recommends; you decide). PMS is designed for
                investors who want a concentrated, high-conviction, customised portfolio and are comfortable with
                the associated risk.
              </p>
            </div>

            <div className="glass-card">
              <h3 className="text-xl font-semibold mb-4">What is an Alternative Investment Fund (AIF)?</h3>
              <p className="text-sm text-[var(--color-slate)] leading-relaxed">
                An Alternative Investment Fund is a SEBI-regulated pooled investment vehicle for sophisticated
                investors, investing in strategies beyond traditional stocks and bonds. SEBI mandates a{" "}
                <strong>minimum investment of ₹1 crore</strong> (₹25 lakh for the fund&apos;s own
                employees/directors), and each scheme is capped at 1,000 investors (49 for Angel Funds). AIFs fall
                into three categories:
              </p>
              <ul className="mt-4 space-y-3 text-sm text-[var(--color-slate)] leading-relaxed">
                <li>
                  <strong className="text-[var(--color-navy)]">Category I</strong> — funds with positive
                  economic/social spillover: venture capital, SME, infrastructure, angel and social-impact funds.
                </li>
                <li>
                  <strong className="text-[var(--color-navy)]">Category II</strong> — funds that don&apos;t use
                  significant leverage: private equity, private credit/debt funds, and real-estate funds. This is
                  the largest category by commitments in India.
                </li>
                <li>
                  <strong className="text-[var(--color-navy)]">Category III</strong> — funds that may use complex or
                  leveraged strategies, including long-short and other hedge-fund-style approaches; often structured
                  as listed-equity Category III AIFs for HNIs.
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-6 card-soft reveal">
            <h3 className="text-lg font-semibold mb-3">A quick word on taxation (educational overview)</h3>
            <ul className="space-y-3 text-sm text-[var(--color-slate)] leading-relaxed">
              <li>
                In a <strong className="text-[var(--color-navy)]">PMS</strong>, because you own the securities
                directly, you are taxed as if you traded them yourself. For listed equity, short-term capital gains
                (holding under 12 months) are taxed at 20% and long-term gains (over 12 months) at 12.5% on gains
                above ₹1.25 lakh per year (rates applicable for FY 2025–26 onward); dividends are taxed at your
                slab rate.
              </li>
              <li>
                In an <strong className="text-[var(--color-navy)]">AIF</strong>, taxation depends on the category.
                Category I and II AIFs generally enjoy &quot;pass-through&quot; status (income is taxed in the
                investor&apos;s hands), while Category III AIFs are typically taxed at the fund level. NRIs may be
                able to reduce tax through applicable Double Taxation Avoidance Agreements (DTAA).
              </li>
            </ul>
            <p className="mt-4 text-xs text-[var(--color-slate)] italic">
              Tax rules change with each Union Budget and depend on your personal situation. This is general
              information, not tax advice — please consult a qualified tax adviser.
            </p>
          </div>
        </div>
      </section>

      {/* 3 — Why investors are moving beyond mutual funds */}
      <section className="bg-[var(--color-parchment)]">
        <div className="container-wide py-20 md:py-28">
          <div className="max-w-3xl mx-auto text-center mb-12 reveal">
            <span className="eyebrow">The case for alternatives</span>
            <h2 className="mt-3 text-balance">Why Investors Are Looking Beyond Mutual Funds</h2>
            <p className="mt-4 text-lg text-[var(--color-slate)] leading-relaxed">
              As your wealth grows, a standardised, pooled mutual fund may no longer match your goals. That&apos;s
              why a growing number of affluent professionals, business owners, HNIs, UHNIs and NRIs are adding PMS
              and AIF to their portfolios:
            </p>
          </div>

          <ul className="max-w-3xl mx-auto space-y-4 reveal">
            {[
              ["Direct ownership & transparency.", "In a PMS, securities sit in your own demat account — you see exactly what you own and why, not just a monthly factsheet."],
              ["Customisation.", "Portfolios can be shaped around your goals, risk appetite, time horizon and existing holdings, rather than a one-size-fits-all mandate."],
              ["High-conviction, concentrated strategies.", "PMS managers can run focused portfolios and specialised themes that pooled funds typically cannot."],
              ["Access to private markets.", "AIFs open the door to private equity, private credit, structured strategies and other opportunities not available through mutual funds."],
              ["A structure built for scale.", "With ₹50 lakh–₹1 crore-plus corpuses, PMS and AIF give sophisticated investors institutional-quality management with individual attention."],
            ].map(([lead, rest]) => (
              <li key={lead} className="flex items-start gap-3">
                <span className="mt-0.5 w-6 h-6 rounded-full bg-[var(--color-gold)]/20 text-[var(--color-gold-dim)] flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5" aria-hidden />
                </span>
                <p className="text-sm md:text-base text-[var(--color-slate)] leading-relaxed">
                  <strong className="text-[var(--color-navy)]">{lead}</strong> {rest}
                </p>
              </li>
            ))}
          </ul>

          <p className="max-w-3xl mx-auto mt-8 text-sm text-[var(--color-slate)] italic text-center reveal">
            These products carry higher minimums, different risks and lower liquidity than mutual funds — which is
            exactly why unbiased research and education matter before you commit.
          </p>
        </div>
      </section>

      {/* 4 — Industry stats */}
      <section className="gradient-navy text-[var(--color-cream)]">
        <div className="container-wide py-20 md:py-28">
          <div className="max-w-3xl mx-auto text-center mb-12 reveal">
            <span className="eyebrow text-[var(--color-gold-light)]">India&apos;s alternatives market</span>
            <h2 className="mt-3 text-[var(--color-cream)] text-balance">A Fast-Growing Opportunity</h2>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 reveal">
            {industryStats.map((stat) => (
              <div key={stat.value} className="text-center bg-white/5 rounded-2xl p-6 border border-white/10">
                <div
                  className="text-2xl md:text-3xl font-semibold text-[var(--color-gold-light)]"
                  style={{ fontFamily: "var(--font-display)" }}
                >
                  {stat.value}
                </div>
                <p className="text-sm text-[var(--color-silver)] mt-3 leading-relaxed">{stat.label}</p>
                <p className="text-[11px] text-[var(--color-silver)]/70 mt-3 italic">{stat.source}</p>
              </div>
            ))}
          </div>

          <p className="max-w-3xl mx-auto mt-10 text-center text-[var(--color-silver)] leading-relaxed reveal">
            India&apos;s alternative-investment ecosystem is broadening quickly, with AIF commitments compounding at
            roughly 25–30% a year over the last five years. As more fund houses and strategies launch, choosing the
            right one — for your goals, corpus and risk appetite — becomes both more important and more complex.
            That&apos;s where PlanMyCashflows helps.
          </p>
          <p className="max-w-3xl mx-auto mt-4 text-center text-[11px] text-[var(--color-silver)]/70 italic">
            Figures are as of the dates shown and are drawn from APMI and SEBI data. Industry data is updated
            periodically; please treat figures as indicative.
          </p>
        </div>
      </section>

      {/* 5 — How it works */}
      <section id="how-it-works" className="py-20 md:py-28 scroll-mt-20">
        <div className="container-wide">
          <div className="max-w-3xl mx-auto text-center mb-12 reveal">
            <span className="eyebrow">How PlanMyCashflows works</span>
            <h2 className="mt-3 text-balance">Discover → Compare → Invest with Guidance</h2>
          </div>

          <div className="grid md:grid-cols-3 gap-6 max-w-5xl mx-auto reveal">
            <StepCard
              icon={<Compass className="w-5 h-5" />}
              step="01"
              title="Discover"
              copy="Browse curated PMS and AIF strategies across India's leading fund houses, organised by category, objective and risk profile. Our AI-assisted tools help you shortlist strategies that fit your needs."
            />
            <StepCard
              icon={<BarChart3 className="w-5 h-5" />}
              step="02"
              title="Compare"
              copy="Study strategies side-by-side — approach, category, structure, minimums and key features — with clear, unbiased information and education-first explainers, so you understand what you're evaluating."
            />
            <StepCard
              icon={<Handshake className="w-5 h-5" />}
              step="03"
              title="Invest with guidance"
              copy="When you're ready, our team helps you complete the process with the relevant fund house — walking you through documentation, onboarding and the practical steps. We are a distribution platform that connects you with third-party products; we do not manage your money or run our own fund."
            />
          </div>
        </div>
      </section>

      {/* 6 — Comparison table */}
      <section id="comparison" className="bg-[var(--color-parchment)] scroll-mt-20">
        <div className="container-wide py-20 md:py-28">
          <div className="max-w-3xl mx-auto text-center mb-12 reveal">
            <span className="eyebrow">Know the difference</span>
            <h2 className="mt-3 text-balance">PMS vs AIF vs Mutual Funds</h2>
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block overflow-x-auto rounded-2xl border border-[var(--color-silver)]/40 bg-white reveal">
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="bg-[var(--color-navy)] text-[var(--color-cream)]">
                  <th scope="col" className="px-5 py-4 font-semibold">Feature</th>
                  <th scope="col" className="px-5 py-4 font-semibold">Mutual Funds</th>
                  <th scope="col" className="px-5 py-4 font-semibold">PMS</th>
                  <th scope="col" className="px-5 py-4 font-semibold">AIF</th>
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row, i) => (
                  <tr key={row.feature} className={i % 2 ? "bg-[var(--color-offwhite)]" : "bg-white"}>
                    <th scope="row" className="px-5 py-3.5 font-semibold text-[var(--color-navy)] align-top">
                      {row.feature}
                    </th>
                    <td className="px-5 py-3.5 text-[var(--color-slate)] align-top">{row.mutualFunds}</td>
                    <td className="px-5 py-3.5 text-[var(--color-slate)] align-top">{row.pms}</td>
                    <td className="px-5 py-3.5 text-[var(--color-slate)] align-top">{row.aif}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile: stacked cards */}
          <div className="md:hidden space-y-5 reveal">
            {(
              [
                ["Mutual Funds", "mutualFunds"],
                ["PMS", "pms"],
                ["AIF", "aif"],
              ] as const
            ).map(([name, key]) => (
              <div key={key} className="bg-white rounded-2xl border border-[var(--color-silver)]/40 p-5">
                <h3 className="text-base font-semibold mb-3">{name}</h3>
                <dl className="space-y-2.5">
                  {comparisonRows.map((row) => (
                    <div key={row.feature} className="flex justify-between gap-4 text-xs">
                      <dt className="text-[var(--color-slate)] shrink-0">{row.feature}</dt>
                      <dd className="font-medium text-[var(--color-navy)] text-right">{row[key]}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            ))}
          </div>

          <p className="text-xs text-[var(--color-slate)] italic text-center mt-6 reveal">
            Illustrative comparison for educational purposes. Specifics vary by product and change with regulation
            and Budget updates.
          </p>
        </div>
      </section>

      {/* 7 — Why PlanMyCashflows */}
      <section className="py-20 md:py-28">
        <div className="container-wide">
          <div className="max-w-3xl mx-auto text-center mb-12 reveal">
            <span className="eyebrow">Our approach</span>
            <h2 className="mt-3 text-balance">Why PlanMyCashflows</h2>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 reveal">
            <WhyCard
              icon={<Bot className="w-5 h-5" />}
              title="AI-powered platform"
              copy="Smart tools help you discover and shortlist relevant PMS and AIF strategies faster, matched to your objectives."
            />
            <WhyCard
              icon={<Scale className="w-5 h-5" />}
              title="Unbiased curation across fund houses"
              copy="We bring together strategies from multiple managers so you can compare on the merits — not on who's selling hardest."
            />
            <WhyCard
              icon={<GraduationCap className="w-5 h-5" />}
              title="Education-first"
              copy="Clear, plain-English explainers, guides and comparisons help you understand products before you commit. No pressure, no jargon."
            />
            <WhyCard
              icon={<Eye className="w-5 h-5" />}
              title="Transparency"
              copy="Straightforward information on structures, minimums, features and how we're compensated — so you always know where you stand."
            />
            <WhyCard
              icon={<Gem className="w-5 h-5" />}
              title="Built for serious investors"
              copy="Designed for affluent professionals, business owners, HNIs, UHNIs and NRIs who want institutional-quality opportunities with personal guidance."
            />
          </div>
        </div>
      </section>

      {/* 8 — Featured strategies */}
      <section id="strategies" className="bg-[var(--color-parchment)] scroll-mt-20">
        <div className="container-wide py-20 md:py-28">
          <div className="max-w-3xl mx-auto text-center mb-10 reveal">
            <span className="eyebrow">Featured strategies</span>
            <h2 className="mt-3 text-balance">Explore Curated Strategies</h2>
            <p className="mt-4 text-lg text-[var(--color-slate)] leading-relaxed">
              Browse a selection of PMS and AIF strategies across categories.{" "}
              <em className="text-sm">
                (Live performance data is being integrated — the cards below are illustrative examples of what
                you&apos;ll be able to explore and compare.)
              </em>
            </p>
          </div>

          <div className="reveal">
            <FeaturedStrategies />
          </div>

          <p className="text-xs text-[var(--color-slate)] italic text-center mt-8 max-w-3xl mx-auto reveal">
            Strategy details shown are for information and education only and do not constitute a recommendation or
            an offer to invest. Past performance is not indicative of future returns. Investments in securities
            markets are subject to market risks; read all scheme-related documents carefully before investing.
          </p>
        </div>
      </section>

      {/* 9 — Education hub teaser */}
      <section className="py-20 md:py-28">
        <div className="container-wide">
          <div className="max-w-3xl mx-auto text-center mb-12 reveal">
            <span className="eyebrow">Education hub</span>
            <h2 className="mt-3 text-balance">Learn Before You Invest</h2>
            <p className="mt-4 text-lg text-[var(--color-slate)] leading-relaxed">
              New to alternatives? Our Education Hub breaks down PMS and AIF in plain English — from minimums and
              categories to taxation and how to get started.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto reveal">
            {educationTiles.map((tile) => (
              <Link
                key={tile.title}
                href={tile.href}
                className="card-soft flex items-center justify-between gap-3 group"
              >
                <span className="text-sm font-semibold text-[var(--color-navy)]">{tile.title}</span>
                <ArrowRight className="w-4 h-4 shrink-0 text-[var(--color-gold-dim)] transition-transform group-hover:translate-x-1" aria-hidden />
              </Link>
            ))}
          </div>

          <div className="text-center mt-10 reveal">
            <Link href="/blog" className="btn-primary">
              Explore the Education Hub
            </Link>
          </div>
        </div>
      </section>

      {/* 10 — FAQ */}
      <section className="bg-[var(--color-parchment)]">
        <div className="container-wide py-20 md:py-28">
          <div className="max-w-3xl mx-auto text-center mb-12 reveal">
            <span className="eyebrow">Good to know</span>
            <h2 className="mt-3 text-balance">Frequently Asked Questions</h2>
          </div>
          <div className="reveal">
            <HomeFaq />
          </div>
        </div>
      </section>

      {/* 11 — Newsletter + book-a-call lead capture */}
      <section className="py-20 md:py-28">
        <div className="container-wide">
          <div className="max-w-3xl mx-auto text-center reveal">
            <span className="eyebrow">Stay informed</span>
            <h2 className="mt-3 text-balance">Stay Ahead in Alternatives</h2>
            <p className="mt-4 text-lg text-[var(--color-slate)] leading-relaxed">
              Get PMS & AIF insights, category explainers and market updates delivered to your inbox. Practical,
              unbiased and education-first — no spam.
            </p>
            <div className="mt-8">
              <HomeNewsletter />
            </div>
          </div>

          <div className="max-w-3xl mx-auto mt-12 card-soft text-center reveal">
            <p className="text-sm md:text-base text-[var(--color-slate)] leading-relaxed">
              Prefer to talk? Book a no-obligation call with our team to explore PMS and AIF options suited to your
              goals.
            </p>
            <a
              href={siteConfig.topmateUrl}
              target="_blank"
              rel="noreferrer"
              className="btn-primary mt-5 inline-flex"
            >
              Book a Call
            </a>
          </div>
        </div>
      </section>

      {/* Structured data: WebSite + FAQPage (Organization is emitted site-wide by the layout) */}
      <StructuredData
        data={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: siteConfig.name,
          url: siteConfig.url,
          description: PAGE_DESCRIPTION,
        }}
      />
      <StructuredData data={faqSchema(homeFaqs)} />
    </>
  );
}

function StepCard({ icon, step, title, copy }: { icon: React.ReactNode; step: string; title: string; copy: string }) {
  return (
    <div className="glass-card">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-lg bg-[var(--color-navy)] text-[var(--color-gold)] flex items-center justify-center">
          {icon}
        </div>
        <span className="text-xs font-mono text-[var(--color-slate)]">{step}</span>
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-[var(--color-slate)] leading-relaxed">{copy}</p>
    </div>
  );
}

function WhyCard({ icon, title, copy }: { icon: React.ReactNode; title: string; copy: string }) {
  return (
    <div className="glass-card">
      <div className="w-10 h-10 rounded-lg bg-[var(--color-sand)]/70 text-[var(--color-gold-dim)] flex items-center justify-center mb-4">
        {icon}
      </div>
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-[var(--color-slate)] leading-relaxed">{copy}</p>
    </div>
  );
}
