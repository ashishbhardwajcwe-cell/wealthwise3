import { NextRequest, NextResponse } from "next/server";
import { resend, FROM_ADDRESS, REPLY_TO, NOTIFY_ADDRESS, isResendConfigured } from "@/lib/resend";

export const runtime = "nodejs";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const DOWNLOAD_CATALOG: Record<string, { title: string; url: string; pages: number }> = {
  "financial-health-check": {
    title: "The 15-minute financial health check for professionals",
    url: "https://auriswealth.co/downloads/financial-health-check.pdf",
    pages: 8,
  },
  "defence-transition-planner": {
    title: "The defence officer's transition financial planner",
    url: "https://auriswealth.co/downloads/defence-transition-planner.pdf",
    pages: 24,
  },
  "nri-india-cheatsheet": {
    title: "NRI investing in India: 2026 cheat sheet",
    url: "https://auriswealth.co/downloads/nri-india-cheatsheet.pdf",
    pages: 16,
  },
  "pms-empanelment-guide": {
    title: "PMS empanelment: how to evaluate a manager",
    url: "https://auriswealth.co/downloads/pms-empanelment-guide.pdf",
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

    if (!isResendConfigured() || !resend) {
      return NextResponse.json({ ok: true, queued: false });
    }

    await resend.emails.send({
      from: FROM_ADDRESS,
      to: email,
      replyTo: REPLY_TO,
      subject: `Your download: ${item.title}`,
      html: downloadHtml(item),
      text: downloadText(item),
    });

    await resend.emails.send({
      from: FROM_ADDRESS,
      to: NOTIFY_ADDRESS,
      replyTo: email,
      subject: `Download requested: ${slug}`,
      text: `Email: ${email}\nDownload: ${slug} (${item.title})\n`,
    });

    return NextResponse.json({ ok: true, queued: true });
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
        Your download is ready
      </h1>
      <p>${item.title}<br/><span style="color: #5A6B80; font-size: 13px;">${item.pages}-page PDF</span></p>
      <p style="margin: 32px 0;">
        <a href="${item.url}" style="display: inline-block; padding: 12px 24px; background: #0A1628; color: #FFFDF5; text-decoration: none; border-radius: 8px; font-weight: 600;">Download PDF →</a>
      </p>
      <p>I'll also send you our weekly note every Friday. Reply "unsubscribe" anytime to stop.</p>
      <p style="margin-top: 32px;">— Col Ashish Bhardwaj<br/><span style="color: #5A6B80; font-size: 13px;">Founder, Auris Wealth</span></p>
      <hr style="border: none; border-top: 1px solid #C4CDD5; margin: 32px 0;" />
      <p style="font-size: 12px; color: #5A6B80;">
        Auris Pvt Ltd (CIN: U70200HR2026PTC141922). Educational content only. Not investment advice.
      </p>
    </div>
  </body>
</html>`;
}

function downloadText(item: { title: string; url: string; pages: number }) {
  return `Your download is ready.

${item.title}
${item.pages}-page PDF

Download: ${item.url}

I'll also send you our weekly note every Friday. Reply "unsubscribe" anytime.

— Col Ashish Bhardwaj
Founder, Auris Wealth

---
Auris Pvt Ltd (CIN: U70200HR2026PTC141922).
Educational content only. Not investment advice.`;
}
