import { Resend } from "resend";

export const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

export const FROM_ADDRESS = process.env.RESEND_FROM ?? "PlanMyCashflows <hello@planmycashflows.com>";
export const REPLY_TO = process.env.RESEND_REPLY_TO ?? "hello@planmycashflows.com";
export const NOTIFY_ADDRESS = process.env.RESEND_NOTIFY ?? "hello@planmycashflows.com";

export function isResendConfigured(): boolean {
  return !!process.env.RESEND_API_KEY;
}
