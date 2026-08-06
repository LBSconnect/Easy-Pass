#!/usr/bin/env node
/**
 * Conservative auto-fixer for broken internal links found by
 * scripts/check-broken-links.mjs.
 *
 * Only fixes a broken link when there is exactly one static (non-dynamic)
 * route in App.tsx within Levenshtein distance <= 2 of the broken path —
 * e.g. a typo'd or stale route ("/pricing/" -> "/pricing", "/facq" ->
 * "/faq"). Anything ambiguous, or with no close match, is left alone and
 * simply stays in the report as a finding for a human to fix.
 *
 * Hard safety rules (never touched, regardless of match quality):
 *   - shared/schema.ts (database schema)
 *   - server/routes.ts (all API routes, including auth)
 *   - server/simpleAuth.ts, server/subscriptionCheck.ts (auth/subscription)
 *   - any legal or pricing page under client/src/pages/
 *
 * Usage:
 *   node scripts/fix-broken-links.mjs --report=link-report.json [--max-fixes=5]
 *
 * Prints a JSON summary of applied fixes to stdout and exits 0 always
 * (finding nothing to fix is not an error — it just means the PR will only
 * carry the report, no code change).
 */

import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");

// Never auto-edit these, no matter how confident the match.
const DENYLIST_PATTERNS = [
  /^shared\/schema\.ts$/,
  /^server\/routes\.ts$/,
  /^server\/simpleAuth\.ts$/,
  /^server\/subscriptionCheck\.ts$/,
  /^client\/src\/pages\/(terms|privacy|pricing|refund-policy|cookie-policy|notice-at-collection|privacy-request|accessibility|copyright-dmca|exam-disclaimer|electronic-communications)\.tsx$/,
];

function isDenied(relFile) {
  return DENYLIST_PATTERNS.some((re) => re.test(relFile));
}

function levenshtein(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1]
          : 1 + Math.min(dp[i - 1][j - 1], dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return dp[m][n];
}

function parseArgs(argv) {
  const out = { report: "link-report.json", maxFixes: 5 };
  for (const arg of argv) {
    if (arg.startsWith("--report=")) out.report = arg.split("=").slice(1).join("=");
    if (arg.startsWith("--max-fixes=")) out.maxFixes = parseInt(arg.split("=")[1], 10);
  }
  return out;
}

async function main() {
  const { report: reportPath, maxFixes } = parseArgs(process.argv.slice(2));

  // If the link-check step failed before it could write its JSON report
  // (or wrote something unparseable), don't let that crash the whole job -
  // just report that nothing was fixed and let the report step move on.
  let report;
  try {
    const reportRaw = await readFile(path.resolve(REPO_ROOT, reportPath), "utf-8");
    report = JSON.parse(reportRaw);
  } catch (err) {
    console.error(`Could not read/parse ${reportPath} (${err.message}) - skipping auto-fix.`);
    console.log(JSON.stringify({ applied: [], skipped: [] }, null, 2));
    return;
  }

  const staticRoutes = (report.routes || []).filter((r) => !r.includes(":"));
  const applied = [];
  const skipped = [];

  for (const brokenLink of report.broken || []) {
    if (applied.length >= maxFixes) {
      skipped.push({ ...brokenLink, reason: "max-fixes-per-run limit reached" });
      continue;
    }

    if (isDenied(brokenLink.file)) {
      skipped.push({ ...brokenLink, reason: "file is on the never-auto-edit denylist" });
      continue;
    }

    const distances = staticRoutes
      .map((route) => ({ route, distance: levenshtein(brokenLink.resolvedPath, route) }))
      .filter((d) => d.distance <= 2)
      .sort((a, b) => a.distance - b.distance);

    if (distances.length === 0) {
      skipped.push({ ...brokenLink, reason: "no close-match route found" });
      continue;
    }
    const bestDistance = distances[0].distance;
    const bestMatches = distances.filter((d) => d.distance === bestDistance);
    if (bestMatches.length > 1) {
      skipped.push({
        ...brokenLink,
        reason: `ambiguous - ${bestMatches.length} equally close routes: ${bestMatches
          .map((m) => m.route)
          .join(", ")}`,
      });
      continue;
    }

    const correctedRoute = bestMatches[0].route;
    const suffix = brokenLink.href.slice(brokenLink.resolvedPath.length); // preserves ?query / #hash
    const newHref = `${correctedRoute}${suffix}`;

    const absFile = path.resolve(REPO_ROOT, brokenLink.file);
    const content = await readFile(absFile, "utf-8");
    const lines = content.split("\n");
    const lineIdx = brokenLink.line - 1;
    if (lineIdx < 0 || lineIdx >= lines.length || !lines[lineIdx].includes(brokenLink.href)) {
      skipped.push({ ...brokenLink, reason: "source line no longer matches expected content" });
      continue;
    }
    lines[lineIdx] = lines[lineIdx].replace(`"${brokenLink.href}"`, `"${newHref}"`);
    await writeFile(absFile, lines.join("\n"), "utf-8");

    applied.push({
      file: brokenLink.file,
      line: brokenLink.line,
      oldHref: brokenLink.href,
      newHref,
      editDistance: bestDistance,
    });
  }

  console.log(JSON.stringify({ applied, skipped }, null, 2));
}

main().catch((err) => {
  console.error("fix-broken-links failed:", err);
  process.exit(1);
});
