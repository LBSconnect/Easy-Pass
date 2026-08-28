#!/usr/bin/env node

/**
 * Submit newly-added sitemap URLs to IndexNow after a deployment commit lands.
 *
 * The workflow passes BASE_SHA and HEAD_SHA. We inspect only added <loc> lines
 * in sitemap XML diffs, so routine pushes do not repeatedly submit the entire
 * site. IndexNow keys are public ownership proofs by design; the matching key
 * file lives under client/public and is served from the site root.
 */

import { execFileSync } from "node:child_process";

const HOST = "www.myeasypass.net";
const KEY = "1142d1df0b7c4626a09477530bbd3dc9";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;
const base = process.env.BASE_SHA;
const head = process.env.HEAD_SHA || "HEAD";

if (!base || /^0+$/.test(base)) {
  console.log("IndexNow: no usable base SHA; nothing submitted.");
  process.exit(0);
}

let diff = "";
try {
  diff = execFileSync(
    "git",
    ["diff", "--unified=0", base, head, "--", "client/public/sitemap*.xml"],
    { encoding: "utf8" },
  );
} catch (error) {
  console.warn("IndexNow: could not inspect sitemap diff; skipping.", error?.message ?? error);
  process.exit(0);
}

const urls = [...new Set(
  diff
    .split("\n")
    .filter((line) => line.startsWith("+") && !line.startsWith("+++"))
    .map((line) => line.match(/<loc>(https:\/\/www\.myeasypass\.net\/[^<]+)<\/loc>/)?.[1])
    .filter(Boolean),
)];

if (urls.length === 0) {
  console.log("IndexNow: no newly-added MyEasyPass sitemap URLs found.");
  process.exit(0);
}

const response = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "Content-Type": "application/json; charset=utf-8" },
  body: JSON.stringify({
    host: HOST,
    key: KEY,
    keyLocation: KEY_LOCATION,
    urlList: urls,
  }),
});

if (!response.ok) {
  const text = await response.text().catch(() => "");
  console.error(`IndexNow: submission failed (${response.status}) ${text}`.trim());
  process.exitCode = 1;
} else {
  console.log(`IndexNow: submitted ${urls.length} newly-added URL(s).`);
  for (const url of urls) console.log(`  ${url}`);
}
