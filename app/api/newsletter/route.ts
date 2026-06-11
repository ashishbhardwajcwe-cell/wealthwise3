import { NextRequest, NextResponse } from "next/server";
import { resend, FROM_ADDRESS, REPLY_TO, NOTIFY_ADDRESS, isResendConfigured } from "@/lib/resend";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  try {
    const { email, source } = await req.json();

    if (typeof email !== "string" || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }

    if (!isResendConfigured() || !resend) {
      // Soft success in environments without Resend configured (dev / preview)
      return NextResponse.json({ ok: true, queued: false });
    }

    // 1. Welcome email to the subscriber
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: email,
      replyTo: REPLY_TO,
      subject: "Welcome to the Auris Wealth weekly note",
      html: WELCOME_HTML,
      text: WELCOME_TEXT,
    });

    // 2. Internal notification
    await resend.emails.send({
      from: FROM_ADDRESS,
      to: NOTIFY_ADDRESS,
      replyTo: email,
      subject: `New newsletter subscriber: ${email}`,
      text: `Email: ${email}\nSource: ${source ?? "unknown"}\n`,
    });

    return NextResponse.json({ ok: true, queued: true });
  } catch (err) {
    console.error("newsletter error", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

const WELCOME_HTML = `
<!DOCTYPE html>
<html>
  <body style="font-family: -apple-system, system-ui, sans-serif; max-width: 580px; margin: 0 auto; padding: 32px 24px; color: #0A1628; line-height: 1.6;">
    <div style="border-top: 4px solid #C9A84C; padding-top: 24px;">
      <h1 style="font-family: 'Playfair Display', Georgia, serif; font-size: 28px; margin: 0 0 16px; letter-spacing: -0.5px;">
        Welcome to <span style="color: #C9A84C;">Auris Wealth</span>
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
      <p>While you're here, here's where every Auris wealth planner lives:</p>
      <ul>
        <li><a href="https://auriswealth.co/plan" style="color: #A08030;">Wealth Planner hub</a> — pick a Snapshot, Guided Plan, or the full app</li>
        <li><a href="https://auriswealth.co/ai-wealth-planner" style="color: #A08030;">AI Snapshot</a> — 60-second personalised snapshot, no signup</li>
        <li><a href="https://auriswealth.co/guided" style="color: #A08030;">Guided Plan</a> — 10-minute interactive plan, no signup</li>
        <li><a href="https://app.auriswealth.co" style="color: #A08030;">Full WealthWise app</a> — complete planner, 14-day trial, login required</li>
      </ul>
      <p style="margin-top: 32px;">— Col Ashish Bhardwaj<br/><span style="color: #5A6B80; font-size: 13px;">Founder, Auris Wealth</span></p>
      <hr style="border: none; border-top: 1px solid #C4CDD5; margin: 32px 0;" />
      <p style="font-size: 12px; color: #5A6B80;">
        Auris Pvt Ltd (CIN: U70200HR2026PTC141922). Educational content only. Not investment advice.
        Unsubscribe anytime by replying with "unsubscribe".
      </p>
    </div>
  </body>
</html>`;

const WELCOME_TEXT = `Welcome to Auris Wealth.

One short note a week. No noise.

I write about wealth management for Indian and global investors — what actually
compounds (planning, tax efficiency, boring discipline) and what doesn't
(fads, products, hot tips).

Each Friday you'll get a 5-minute read on something specific.

Where every Auris wealth planner lives:
- Wealth Planner hub: https://auriswealth.co/plan
- AI Snapshot (60 sec): https://auriswealth.co/ai-wealth-planner
- Guided Plan (10 min): https://auriswealth.co/guided
- Full app: https://app.auriswealth.co

— Col Ashish Bhardwaj
Founder, Auris Wealth

---
Auris Pvt Ltd (CIN: U70200HR2026PTC141922).
Educational content only. Not investment advice.
Unsubscribe by replying "unsubscribe".`;
