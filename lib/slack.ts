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

export function isSlackConfigured(): boolean {
  return !!WEBHOOK_URL;
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
    });
    if (!res.ok) {
      console.error("slack notify failed", res.status, await res.text());
    }
  } catch (err) {
    console.error("slack notify error", err);
  }
}
