/**
 * Slack Incoming Webhook notifications.
 *
 * Posts short messages to a Slack channel when a lead event happens
 * (newsletter signup, guide download, AI snapshot). Mirrors the
 * "soft no-op if not configured" pattern used by lib/resend.ts so the
 * site keeps working in dev/preview without a webhook.
 *
 * Setup: api.slack.com/apps -> Create app -> Incoming Webhooks ->
 * Add webhook to a channel -> copy URL into SLACK_WEBHOOK_URL.
 */

const WEBHOOK_URL = process.env.SLACK_WEBHOOK_URL;

// Slack treats hooks.slack.com responses as best-effort; cap the wait so a slow
// or unreachable endpoint can never stall the request that triggered it.
const TIMEOUT_MS = 2500;

export function isSlackConfigured(): boolean {
  return !!WEBHOOK_URL;
}

/**
 * Escape Slack mrkdwn control characters so untrusted user input can't trigger
 * mentions (e.g. <!channel>) or break message formatting. Length-capped to keep
 * a single field from dominating the message. See api.slack.com/reference/surfaces/formatting#escaping
 */
export function escapeSlack(text: string): string {
  return text
    .slice(0, 256)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/**
 * Send a message to the configured Slack channel.
 *
 * No-op when SLACK_WEBHOOK_URL is unset. Never throws: failures are
 * logged but must not break the request that triggered them.
 *
 * @param text  Message body. Supports Slack mrkdwn (*bold*, _italic_, :emoji:).
 */
export async function notifySlack(text: string): Promise<void> {
  if (!WEBHOOK_URL) return;
  try {
    const res = await fetch(WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    if (!res.ok) {
      console.error("slack notify failed", res.status, await res.text());
    }
  } catch (err) {
    console.error("slack notify error", err);
  }
}
