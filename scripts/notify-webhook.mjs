#!/usr/bin/env node
/**
 * Posts a short JSON summary to NOTIFY_WEBHOOK_URL, if that env var is
 * set. Exits 0 (no-op, with a clear log line) if it isn't configured -
 * this must never fail the job just because no notification channel
 * exists yet.
 *
 * Reads everything from env vars so the calling workflow step doesn't
 * need to hand-build JSON in shell (fragile quoting) or inline JS.
 *
 * Required env vars: NOTIFY_WEBHOOK_URL (may be empty/unset -> no-op)
 * Optional: GITHUB_REPOSITORY, REPORT_DATE, ANY_CHECK_FAILED ("true"/"false"),
 *           NEEDS_MANUAL_REVIEW ("true"/"false"), PR_URL
 */

const webhookUrl = process.env.NOTIFY_WEBHOOK_URL;

if (!webhookUrl) {
  console.log("NOTIFY_WEBHOOK_URL is not configured - skipping notification (no-op).");
  process.exit(0);
}

const payload = {
  repo: process.env.GITHUB_REPOSITORY ?? null,
  workflow: "weekly-site-health",
  report_date: process.env.REPORT_DATE ?? null,
  any_check_failed: process.env.ANY_CHECK_FAILED === "true",
  needs_manual_review: process.env.NEEDS_MANUAL_REVIEW === "true",
  pr_url: process.env.PR_URL || null,
};

const body = JSON.stringify(payload);

let url;
try {
  url = new URL(webhookUrl);
} catch {
  console.error("NOTIFY_WEBHOOK_URL is not a valid URL - skipping notification (non-fatal).");
  process.exit(0);
}

const lib = url.protocol === "http:" ? await import("node:http") : await import("node:https");

const req = lib.request(
  url,
  {
    method: "POST",
    headers: { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(body) },
  },
  (res) => {
    console.log("Notification webhook responded with status", res.statusCode);
  }
);
req.on("error", (e) => {
  // Never fail the job over a notification delivery problem.
  console.error("Notification webhook request failed (non-fatal):", e.message);
});
req.write(body);
req.end();
