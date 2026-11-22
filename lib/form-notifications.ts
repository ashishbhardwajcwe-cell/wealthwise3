import { resend, FROM_ADDRESS, REPLY_TO, NOTIFY_ADDRESS, isResendConfigured } from "@/lib/resend";
import { notifySlack, escapeSlack } from "@/lib/slack";

/**
 * Best-effort notification emails + Slack pings for the public forms.
 * Moved here from the old /api/newsletter and /api/download routes. Every
 * function swallows its own errors: the lead is already stored in Supabase
 * by the time these run, so a mail failure must never fail the form.
 */

const WELCOME_HTML = `
<!DOCTYPE html>
<html>
  <body style="font-family: -apple-system, system-ui, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; color: #0A1628; line-height: 1.6;">
    <div style="border-top: 4px solid #C9A84C; padding-top: 24px;">
      <h1 style="font-family: 'Playfair Display', Georgia, serif; font-size: 28px; margin: 0 0 16px; letter-spacing: -0.5px;">
        Welcome to <span style="color: #C9A84C;">PlanMyCashflows</span>
      </h1>
      <p>One short note a week. No noise.</p>
      <p>
        I write about wealth management for Indian and global investors — what actually compounds (planning,
        tax efficiency, the boring discipline) and what doesn't (fads, products, hot tips).
      </p>
      <p>
        Each Friday you'll get a 5-minute read on something specific — usually a case study, a tax
        nuance, or a question one of you asked.
      </p>
      <p>While you're here, here's where every PlanMyCashflows wealth planner lives:</p>
      <ul>
        <li><a href="https://planmycashflows.com/plan" style="color: #A08030;">Wealth Planner hub</a> — pick a Snapshot, Guided Plan, or the full app</li>
        <li><a href="https://planmycashflows.com/ai-wealth-planner" style="color: #A08030;">AI Snapshot</a> — 60-second personalised snapshot, no signup</li>
        <li><a href="https://planmycashflows.com/guided" style="color: #A08030;">Guided Plan</a> — 10-minute interactive plan, no signup</li>
        <li><a href="https://planmycashflows.com/app" style="color: #A08030;">Full CashFlow Planner app</a> — complete planner, 14-day trial, login required</li>
      </ul>
      <p style="margin-top: 32px;">— The PlanMyCashflows Team</p>
      <hr style="border: none; border-top: 1px solid #C4CDD5; margin: 32px 0;" />
      <p style="font-size: 12px; color: #5A6B80;">
        PlanMyCashflows. Educational content only. Not investment advice.
        Unsubscribe anytime by replying with "unsubscribe".
      </p>
    </div>
  </body>
</html>`;

const WELCOME_TEXT = `Welcome to PlanMyCashflows.

One short note a week. No noise.

I write about wealth management for Indian and global investors — what actually
compounds (planning, tax efficiency, boring discipline) and what doesn't
(fads, products, hot tips).

Each Friday you'll get a 5-minute read on something specific.

Where every PlanMyCashflows wealth planner lives:
- Wealth Planner hub: https://planmycashflows.com/plan
- AI Snapshot (60 sec): https://planmycashflows.com/ai-wealth-planner
- Guided Plan (10 min): https://planmycashflows.com/guided
- Full app: https://planmycashflows.com/app

— The PlanMyCashflows Team

---
PlanMyCashflows.
Educational content only. Not investment advice.
Unsubscribe by replying "unsubscribe".`;

export const DOWNLOAD_CATALOG: Record<string, { title: string; url: string; pages: number }> = {
  "financial-health-check": {
    title: "The 15-minute financial health check for professionals",
    url: "https://planmycashflows.com/resources/guides/financial-health-check",
    pages: 8,
  },
  "nri-india-cheatsheet": {
    title: "NRI investing in India: 2026 cheat sheet",
    url: "https://planmycashflows.com/resources/guides/nri-india-cheatsheet",
    pages: 16,
  },
  "pms-empanelment-guide": {
    title: "PMS empanelment: how to evaluate a manager",
    url: "https://planmycashflows.com/resources/guides/pms-empanelment-guide",
    pages: 12,
  },
};

function downloadHtml(item: { title: string; url: string; pages: number }) {
  return `
<!DOCTYPE html>
<html>
  <body style="font-family: -apple-system, system-ui, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; color: #0A1628; line-height: 1.6;">
    <div style="border-top: 4px solid #C9A84C; padding-top: 24px;">
      <h1 style="font-family: 'Playfair Display', Georgia, serif; font-size: 24px; margin: 0 0 16px;">
        Your guide is ready
      </h1>
      <p>${item.title}<br/><span style="color: #5A6B80; font-size: 13px;">Approximately a ${item.pages}-minute read</span></p>
      <p style="margin: 32px 0;">
        <a href="${item.url}" style="display: inline-block; padding: 12px 24px; background: #0A1628; color: #FFFDF5; text-decoration: none; border-radius: 8px; font-weight: 600;">Read your guide →</a>
      </p>
      <p style="font-size: 13px; color: #5A6B80;">
        On the guide page, you'll also find a "Save as PDF" button if you'd like to keep an offline copy.
      </p>
      <p>I'll also send you our weekly note every Friday. Reply "unsubscribe" anytime to stop.</p>
      <p style="margin-top: 32px;">— The PlanMyCashflows Team</p>
      <hr style="border: none; border-top: 1px solid #C4CDD5; margin: 32px 0;" />
      <p style="font-size: 12px; color: #5A6B80;">
        PlanMyCashflows. Educational content only. Not investment advice.
      </p>
    </div>
  </body>
</html>`;
}

function downloadText(item: { title: string; url: string; pages: number }) {
  return `Your guide is ready.

${item.title}
Approximately a ${item.pages}-minute read

Read your guide: ${item.url}

(On the guide page, you'll also find a "Save as PDF" button for an offline copy.)

I'll also send you our weekly note every Friday. Reply "unsubscribe" anytime.

— The PlanMyCashflows Team

---
PlanMyCashflows.
Educational content only. Not investment advice.`;
}

export async function notifyNewSubscriber(email: string, source: string): Promise<void> {
  const tasks: Promise<unknown>[] = [
    notifySlack(`:tada: New newsletter subscriber: *${escapeSlack(email)}*  _(source: ${escapeSlack(source)})_`),
  ];
  if (isResendConfigured() && resend) {
    tasks.push(
      resend.emails.send({ from: FROM_ADDRESS, to: email, replyTo: REPLY_TO, subject: "Welcome to the PlanMyCashflows weekly note", html: WELCOME_HTML, text: WELCOME_TEXT }),
      resend.emails.send({ from: FROM_ADDRESS, to: NOTIFY_ADDRESS, replyTo: email, subject: `New newsletter subscriber: ${email}`, text: `Email: ${email}\nSource: ${source}\n` }),
    );
  }
  for (const r of await Promise.allSettled(tasks)) if (r.status === "rejected") console.error("newsletter notify failed", r.reason);
}

export async function notifyDownload(email: string, slug: string): Promise<void> {
  const item = DOWNLOAD_CATALOG[slug];
  if (!item) return;
  const tasks: Promise<unknown>[] = [
    notifySlack(`:arrow_down: Guide download: *${escapeSlack(item.title)}*  _(${escapeSlack(email)})_`),
  ];
  if (isResendConfigured() && resend) {
    tasks.push(
      resend.emails.send({ from: FROM_ADDRESS, to: email, replyTo: REPLY_TO, subject: `Your download: ${item.title}`, html: downloadHtml(item), text: downloadText(item) }),
      resend.emails.send({ from: FROM_ADDRESS, to: NOTIFY_ADDRESS, replyTo: email, subject: `Download requested: ${slug}`, text: `Email: ${email}\nDownload: ${slug} (${item.title})\n` }),
    );
  }
  for (const r of await Promise.allSettled(tasks)) if (r.status === "rejected") console.error("download notify failed", r.reason);
}

export async function notifyContact(c: { name: string; email: string; topic: string; message: string }): Promise<void> {
  const tasks: Promise<unknown>[] = [
    notifySlack(`:envelope: Contact message from *${escapeSlack(c.name)}* (${escapeSlack(c.email)}) — ${escapeSlack(c.topic)}\n${escapeSlack(c.message.slice(0, 500))}`),
  ];
  if (isResendConfigured() && resend) {
    tasks.push(
      resend.emails.send({ from: FROM_ADDRESS, to: NOTIFY_ADDRESS, replyTo: c.email, subject: `Contact: ${c.topic} — ${c.name}`, text: `Name: ${c.name}\nEmail: ${c.email}\nTopic: ${c.topic}\n\n${c.message}\n` }),
    );
  }
  for (const r of await Promise.allSettled(tasks)) if (r.status === "rejected") console.error("contact notify failed", r.reason);
}
