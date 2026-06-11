import type { Metadata } from "next";
import { Hero } from "@/components/Hero";
import { CTASection } from "@/components/CTASection";
import { siteConfig } from "@/lib/site-config";

export const metadata: Metadata = {
  title: "About Auris Wealth — Founder Story, Team, Mission",
  description:
    "Auris Wealth was founded by Col Ashish Bhardwaj after 20 years in the Indian Army. Read the story, meet the team, and understand the mission.",
};

export default function AboutPage() {
  return (
    <>
      <Hero
        eyebrow="About"
        title="From 20 years in olive greens to building a wealth firm."
        subtitle="Auris Wealth was founded in 2026 by Col Ashish Bhardwaj after two decades in the Indian Army. The mission is simple: bring the rigour, calm, and discipline of military planning to financial planning."
      />

      <section className="py-20">
        <div className="container-narrow prose-article">
          <h2>The founder story</h2>
          <p>
            Ashish joined the Indian Military Academy at 18 and was commissioned into the Army Corps of Signals. Over the next two decades he served across the country —
            from high-altitude postings in the Himalayas to instructional duty at the Military College of Telecommunication Engineering.
          </p>
          <p>
            Through that time, like most officers, he managed his own money — first into LIC endowment plans because that&apos;s what officers did, then mutual funds when his
            wife (a chartered accountant) pointed out the maths. By his mid-thirties he was advising fellow officers on tax, investments, and post-service planning,
            because the institutional financial advice available to defence officers was either commission-driven or generic.
          </p>
          <p>
            After completing his NISM certifications and applying for SEBI RIA registration, he left the Army in 2026 to build Auris Wealth — a firm explicitly designed
            for the kind of advice he wanted when he was in uniform: clear, honest, mathematical, and free of product-pushing.
          </p>

          <h2>Mission</h2>
          <p>
            We believe wealth planning in India is broken. Most retail investors are sold products by people earning commissions on those products.
            Most high-net-worth investors get glossy decks and hand-holding but not actual planning. And most defence officers, NRIs, and salaried professionals
            with complex situations are left to figure it out alone.
          </p>
          <p>
            Auris Wealth is building a different kind of firm — one where the planning tools (WealthWise app), the educational content (this site), and the
            advisory layer (1:1 sessions, full plans) are aligned with the investor&apos;s interests, not the distributor&apos;s.
          </p>

          <h2>Team</h2>
          <p>
            <strong>Col Ashish Bhardwaj</strong> — Founder. Ex-Indian Army (20 years). NISM-certified Investment Adviser (Levels I &amp; II), Mutual Fund Distributor.
            SEBI RIA application in process.
          </p>
          <p>
            <strong>Diganta Das</strong> — Co-founder. Tech and product lead. Previously built and operated SaaS products across fintech and education.
          </p>
          <p>
            <strong>Advisors and consultants</strong> — A small network of chartered accountants, lawyers, and ex-AMC investment professionals who support specific engagements.
          </p>

          <h2>Company facts</h2>
          <ul>
            <li>Legal entity: {siteConfig.legalName}</li>
            <li>CIN: {siteConfig.cin}</li>
            <li>Incorporated: 2026 · India</li>
            <li>Registered office: Gurugram, Haryana</li>
            <li>Contact: <a href={`mailto:${siteConfig.email}`}>{siteConfig.email}</a></li>
            <li>NISM Investment Adviser Levels I &amp; II: Certified</li>
            <li>AMFI Mutual Fund Distributor: Registered (ARN pending)</li>
            <li>SEBI RIA: Application in process</li>
          </ul>

          <h2>Press &amp; media</h2>
          <p>
            For interviews, comments, or media requests, please email <a href="mailto:press@auriswealth.co">press@auriswealth.co</a>.
            A press kit (logos, founder photos, company facts) is available on request.
          </p>
        </div>
      </section>

      <CTASection
        title="Want to work together?"
        subtitle="The fastest way to evaluate fit is a free 30-minute call. Book a slot or run the AI Wealth Planner first."
        primaryCta={{ label: "Book a call", href: "/contact" }}
        secondaryCta={{ label: "Open the Wealth Planner", href: "/plan" }}
      />
    </>
  );
}
