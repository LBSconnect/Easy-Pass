#!/usr/bin/env node
/**
 * Renders the weekly site-health markdown report from environment
 * variables and the JSON produced by check-broken-links.mjs / npm audit.
 * Never includes secrets or personal data — only aggregate, non-identifying
 * counts and file/line references from source code.
 *
 * Required env vars:
 *   REPORT_DATE          YYYY-MM-DD
 *   COMMIT_SHA           git commit SHA tested
 *   START_TIME           ISO 8601 UTC
 *   END_TIME             ISO 8601 UTC
 *   TYPECHECK_OUTCOME    success | failure
 *   TEST_OUTCOME         success | failure
 *   BUILD_OUTCOME        success | failure
 *   LINK_REPORT_PATH     path to check-broken-links.mjs --json-out file
 *   AUDIT_JSON_PATH      path to `npm audit --json` output
 *   FIXES_JSON_PATH      path to fix-broken-links.mjs stdout JSON (optional)
 *
 * Prints the rendered markdown to stdout.
 */

import { readFile } from "node:fs/promises";

function env(name, fallback = "") {
  return process.env[name] ?? fallback;
}

async function readJsonIfExists(p) {
  if (!p) return null;
  try {
    return JSON.parse(await readFile(p, "utf-8"));
  } catch {
    return null;
  }
}

function summarizeAudit(auditJson) {
  if (!auditJson || !auditJson.metadata || !auditJson.metadata.vulnerabilities) {
    return { total: 0, byLevel: {}, note: "No `npm audit` data available." };
  }
  const v = auditJson.metadata.vulnerabilities;
  const total =
    typeof v.total === "number"
      ? v.total
      : Object.entries(v).reduce((a, [k, b]) => a + (k !== "total" && typeof b === "number" ? b : 0), 0);
  return { total, byLevel: v, note: null };
}

async function main() {
  const reportDate = env("REPORT_DATE");
  const commitSha = env("COMMIT_SHA");
  const startTime = env("START_TIME");
  const endTime = env("END_TIME");
  const typecheck = env("TYPECHECK_OUTCOME", "unknown");
  const test = env("TEST_OUTCOME", "unknown");
  const build = env("BUILD_OUTCOME", "unknown");

  const linkReport = await readJsonIfExists(env("LINK_REPORT_PATH"));
  const auditJson = await readJsonIfExists(env("AUDIT_JSON_PATH"));
  const fixesJson = await readJsonIfExists(env("FIXES_JSON_PATH"));

  const auditSummary = summarizeAudit(auditJson);
  const brokenLinks = linkReport?.broken ?? [];
  const appliedFixes = fixesJson?.applied ?? [];
  const skippedFixes = fixesJson?.skipped ?? [];
  const unresolvedBroken = brokenLinks.filter(
    (b) => !appliedFixes.some((f) => f.file === b.file && f.line === b.line)
  );

  const allChecksPassed = typecheck === "success" && test === "success" && build === "success";
  const overallStatus =
    allChecksPassed && unresolvedBroken.length === 0 && auditSummary.byLevel.critical === undefined
      ? "HEALTHY"
      : allChecksPassed && unresolvedBroken.length === 0
      ? "HEALTHY (with dependency alerts to review)"
      : "ISSUES FOUND";

  const recommended = [];
  if (typecheck !== "success") recommended.push("Investigate and fix TypeScript type errors (`npm run check`).");
  if (test !== "success") recommended.push("Investigate failing unit tests (`npm test`).");
  if (build !== "success") recommended.push("Investigate the production build failure (`npm run build`).");
  if (unresolvedBroken.length > 0) {
    recommended.push(
      `Manually fix ${unresolvedBroken.length} broken internal link(s) that could not be auto-corrected with high confidence (see below).`
    );
  }
  if ((auditSummary.byLevel.critical ?? 0) > 0 || (auditSummary.byLevel.high ?? 0) > 0) {
    recommended.push(
      "Review and address high/critical `npm audit` findings — run `npm audit --production` locally, consider `npm audit fix` on a branch, and test before merging."
    );
  }
  if (appliedFixes.length > 0) {
    recommended.push(
      "Review the auto-applied broken-link fix(es) in the linked PR before merging (or let auto-merge handle it if configured and all checks pass)."
    );
  }
  if (recommended.length === 0) {
    recommended.push("No action needed this week.");
  }

  const lines = [];
  lines.push(`# Site Health Report — ${reportDate}`);
  lines.push("");
  lines.push(`**Overall status:** ${overallStatus}`);
  lines.push("");
  lines.push("## Run details");
  lines.push("");
  lines.push(`- Commit SHA tested: \`${commitSha}\``);
  lines.push(`- Start time (UTC): ${startTime}`);
  lines.push(`- End time (UTC): ${endTime}`);
  lines.push("");
  lines.push("## Checks");
  lines.push("");
  lines.push("| Check | Result |");
  lines.push("|---|---|");
  lines.push(`| Type check (\`npm run check\`) | ${typecheck === "success" ? "PASSED" : "FAILED"} |`);
  lines.push(`| Unit tests (\`npm test\`) | ${test === "success" ? "PASSED" : "FAILED"} |`);
  lines.push(`| Build (\`npm run build\`) | ${build === "success" ? "PASSED" : "FAILED"} |`);
  lines.push(
    `| Internal broken-link scan | ${brokenLinks.length === 0 ? "PASSED (0 found)" : `${brokenLinks.length} found, ${appliedFixes.length} auto-fixed, ${unresolvedBroken.length} unresolved`} |`
  );
  lines.push("");
  lines.push("## Dependency audit (`npm audit --production`)");
  lines.push("");
  if (auditSummary.note) {
    lines.push(auditSummary.note);
  } else {
    lines.push(`Total advisories: ${auditSummary.total}`);
    lines.push("");
    lines.push("| Severity | Count |");
    lines.push("|---|---|");
    for (const level of ["critical", "high", "moderate", "low", "info"]) {
      if (auditSummary.byLevel[level] !== undefined) {
        lines.push(`| ${level} | ${auditSummary.byLevel[level]} |`);
      }
    }
  }
  lines.push("");
  lines.push("## Broken-link findings");
  lines.push("");
  if (brokenLinks.length === 0) {
    lines.push("No broken internal links found.");
    lines.push("");
  } else {
    if (appliedFixes.length > 0) {
      lines.push(`### Auto-fixed (${appliedFixes.length})`);
      lines.push("");
      for (const f of appliedFixes) {
        lines.push(`- \`${f.file}:${f.line}\` — \`${f.oldHref}\` → \`${f.newHref}\` (edit distance ${f.editDistance})`);
      }
      lines.push("");
    }
    if (unresolvedBroken.length > 0) {
      lines.push(`### Needs manual review (${unresolvedBroken.length})`);
      lines.push("");
      for (const b of unresolvedBroken) {
        const skip = skippedFixes.find((s) => s.file === b.file && s.line === b.line);
        lines.push(`- \`${b.file}:${b.line}\` — \`${b.href}\`${skip ? ` (${skip.reason})` : ""}`);
      }
      lines.push("");
    }
  }
  lines.push("## Recommended human actions");
  lines.push("");
  for (const r of recommended) {
    lines.push(`- ${r}`);
  }
  lines.push("");

  process.stdout.write(lines.join("\n"));
}

main().catch((err) => {
  console.error("site-health-report failed:", err);
  process.exit(1);
});
