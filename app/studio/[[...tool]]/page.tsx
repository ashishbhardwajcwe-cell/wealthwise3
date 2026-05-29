"use client";

/**
 * Sanity Studio mounted at /studio.
 *
 * Log in with the Sanity account you used to create the project.
 * Published changes appear on the public site within seconds (via webhook).
 *
 * Sidebar workspaces (after login):
 *   - Blog Posts      — write and publish posts
 *   - Stock Analyses  — equity research notes
 *   - PMS Strategies  — monthly data updates
 *   - AIF Funds       — quarterly data updates
 *   - Unlisted Shares — weekly price updates
 *   - Authors         — author profiles
 *   - Categories      — blog categories
 */

import { NextStudio } from "next-sanity/studio";
import config from "@/sanity.config";

export default function StudioPage() {
  return <NextStudio config={config} />;
}
