import { NextRequest, NextResponse } from "next/server";
import { resend, FROM_ADDRESS, REPLY_TO, NOTIFY_ADDRESS, isResendConfigured } from "@/lib/resend";
import { notifySlack, escapeSlack } from "@/lib/slack";
import { formRateLimit, getClientIp } from "@/lib/redis";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DOWNLOAD_CATALOG: Record<string, { title: string; url: string; pages: number }> = {
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

export async function POST(req: NextRequest) {
  try {
    const { email, slug } = await req.json();

    if (typeof email !== "string" || !EMAIL_RE.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }
    if (typeof slug !== "string" || !DOWNLOAD_CATALOG[slug]) {
      return NextResponse.json({ error: "Unknown download" }, { status: 400 });
    }

    const item = DOWNLOAD_CATALOG[slug];

    // Rate limit per IP (10 / hour). Skipped silently if Upstash isn't configured.
    if (formRateLimit) {
      const { success } = await formRateLimit.limit(getClientIp(req));
      if (!success) {
        return NextResponse.json({ error: "Too many requests. Please try again later." }, { status: 429 });
      }
    }

    // Run notifications concurrently so a slow Slack or email never blocks the
    // others — or the response. Slack is a no-op without SLACK_WEBHOOK_URL;
    // emails are skipped when Resend is unconfigured.
    const queued = isResendConfigured() && !!resend;
    const tasks: Promise<unknown>[] = [
      notifySlack(`:arrow_down: Guide download: *${escapeSlack(item.title)}*  _(${escapeSlack(email)})_`),
    ];
    if (queued && resend) {
      tasks.push(
        // Guide email to the requester
        resend.emails.send({
          from: FROM_ADDRESS,
          to: email,
          replyTo: REPLY_TO,
          subject: `Your download: ${item.title}`,
          html: downloadHtml(item),
          text: downloadText(item),
        }),
        // Internal notification
        resend.emails.send({
          from: FROM_ADDRESS,
          to: NOTIFY_ADDRESS,
          replyTo: email,
          subject: `Download requested: ${slug}`,
          text: `Email: ${email}\nDownload: ${slug} (${item.title})\n`,
        }),
      );
    }

    const results = await Promise.allSettled(tasks);
    for (const r of results) {
      if (r.status === "rejected") console.error("download task failed", r.reason);
    }

    return NextResponse.json({ ok: true, queued });
  } catch (err) {
    console.error("download error", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}

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
