"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { Mail, MessageCircle, MapPin, Check } from "lucide-react";
import { Hero } from "@/components/Hero";
import { siteConfig } from "@/lib/site-config";

export default function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    const formData = new FormData(e.currentTarget);
    const body = new URLSearchParams();
    body.append("form-name", "contact");
    formData.forEach((value, key) => body.append(key, value.toString()));

    try {
      const res = await fetch("/", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: body.toString(),
      });
      if (!res.ok) throw new Error("Submission failed");
      setSubmitted(true);
    } catch {
      setError("Couldn't send your message. Please email us directly.");
    }
  }

  return (
    <>
      <Hero
        eyebrow="Contact"
        title="We&apos;d like to hear from you."
        subtitle="Book a 30-minute call, send a message, or just say hi. Most messages are answered within 24 hours on weekdays."
      />

      <section className="py-20">
        <div className="container-narrow grid lg:grid-cols-2 gap-12">
          <div>
            <h2 className="text-2xl font-semibold mb-6">Send a message</h2>

            {submitted ? (
              <div className="bg-[var(--color-emerald)]/10 border border-[var(--color-emerald)]/30 p-6 rounded-xl text-center">
                <Check className="w-8 h-8 text-[var(--color-emerald)] mx-auto mb-3" />
                <h3 className="text-lg font-semibold mb-2">Thanks — we&apos;ve got your message</h3>
                <p className="text-sm text-[var(--color-slate)]">
                  You&apos;ll hear from us within 24 hours on weekdays. For urgent matters, book a Topmate slot directly.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <input type="hidden" name="form-name" value="contact" />
                <p hidden>
                  <label>Don&apos;t fill this out: <input name="bot-field" /></label>
                </p>
                <Field label="Name" name="name" required />
                <Field label="Email" name="email" type="email" required />
                <Field label="Phone (optional)" name="phone" type="tel" />
                <SelectField label="What can we help with?" name="topic" options={[
                  "Free AI Wealth Planner question",
                  "WealthWise app trial / pricing",
                  "1:1 financial planning",
                  "PMS / AIF advisory",
                  "NRI planning",
                  "Defence officer planning",
                  "Press / media",
                  "Something else",
                ]} />
                <Field label="Message" name="message" textarea required />
                {error && <p className="text-sm text-[var(--color-ruby)]">{error}</p>}
                <button type="submit" className="btn-primary w-full">Send</button>
              </form>
            )}
          </div>

          <div>
            <h2 className="text-2xl font-semibold mb-6">Other ways to reach us</h2>

            <div className="space-y-5">
              <ContactBlock
                icon={<MessageCircle className="w-5 h-5" />}
                title="Book a 30-minute call"
                body="The fastest way to evaluate fit. Free for the first session."
                cta={{ label: "Open Topmate", href: siteConfig.topmateUrl }}
              />

              <ContactBlock
                icon={<Mail className="w-5 h-5" />}
                title="Email"
                body={siteConfig.email}
                cta={{ label: "Send email", href: `mailto:${siteConfig.email}` }}
              />

              <ContactBlock
                icon={<MapPin className="w-5 h-5" />}
                title="Office"
                body={`${siteConfig.legalName}\nGurugram, Haryana\nIndia`}
              />
            </div>

            <div className="mt-10 bg-[var(--color-parchment)] rounded-xl p-5 border border-[var(--color-gold)]/30">
              <h3 className="font-semibold text-[var(--color-navy)] mb-2">Before you write</h3>
              <p className="text-sm text-[var(--color-slate)] leading-relaxed">
                We can&apos;t give specific buy/sell recommendations until our SEBI RIA licence is live. Educational and planning conversations are very welcome.
              </p>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

function Field({ label, name, type = "text", textarea, required }: { label: string; name: string; type?: string; textarea?: boolean; required?: boolean }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[var(--color-navy)] mb-2">
        {label} {required && <span className="text-[var(--color-ruby)]">*</span>}
      </label>
      {textarea ? (
        <textarea
          name={name} required={required} rows={5}
          className="w-full px-4 py-3 border border-[var(--color-silver)]/50 rounded-lg text-sm focus:outline-none focus:border-[var(--color-gold)]"
        />
      ) : (
        <input
          type={type} name={name} required={required}
          className="w-full px-4 py-3 border border-[var(--color-silver)]/50 rounded-lg text-sm focus:outline-none focus:border-[var(--color-gold)]"
        />
      )}
    </div>
  );
}

function SelectField({ label, name, options }: { label: string; name: string; options: string[] }) {
  return (
    <div>
      <label className="block text-sm font-semibold text-[var(--color-navy)] mb-2">{label}</label>
      <select name={name} className="w-full px-4 py-3 border border-[var(--color-silver)]/50 rounded-lg text-sm focus:outline-none focus:border-[var(--color-gold)] bg-white">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function ContactBlock({ icon, title, body, cta }: { icon: React.ReactNode; title: string; body: string; cta?: { label: string; href: string } }) {
  return (
    <div className="flex gap-4 p-5 bg-white rounded-xl border border-[var(--color-silver)]/40">
      <div className="w-10 h-10 rounded-lg bg-[var(--color-navy)] text-[var(--color-gold)] flex items-center justify-center flex-shrink-0">
        {icon}
      </div>
      <div className="flex-1">
        <h3 className="font-semibold text-[var(--color-navy)]">{title}</h3>
        <p className="text-sm text-[var(--color-slate)] mt-1 whitespace-pre-line">{body}</p>
        {cta && (
          <a href={cta.href} target={cta.href.startsWith("http") ? "_blank" : undefined} rel="noreferrer" className="text-sm font-semibold text-[var(--color-gold-dim)] mt-2 inline-block">
            {cta.label} →
          </a>
        )}
      </div>
    </div>
  );
}
