#!/usr/bin/env node
/**
 * Lightweight internal broken-link checker.
 *
 * Reuses the same manual approach used during the repo audit:
 *   1. Read the route table straight out of client/src/App.tsx (the single
 *      source of truth for what paths the SPA actually serves).
 *   2. Walk client/src for every `href="/...”`-style internal link
 *      (plain <a href> and wouter's <Link href>).
 *   3. Cross-check each internal href against the route table, allowing for
 *      dynamic segments (":category", ":slug", ...) and ignoring query
 *      strings / hash fragments.
 *
 * This is intentionally NOT a full crawler — it does not start a server,
 * does not follow external links, and does not resolve href values built
 * from template literals or JS expressions (those are reported separately
 * as "skipped / dynamic" rather than flagged as broken, since we can't
 * statically know their value).
 *
 * Usage:
 *   node scripts/check-broken-links.mjs               # human-readable report
 *   node scripts/check-broken-links.mjs --json         # JSON on stdout
 *   node scripts/check-broken-links.mjs --json-out=FILE
 *
 * Exit code: 1 if any broken internal link is found, 0 otherwise.
 */

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REPO_ROOT = path.resolve(__dirname, "..");
const APP_TSX = path.join(REPO_ROOT, "client", "src", "App.tsx");
const SRC_DIR = path.join(REPO_ROOT, "client", "src");

const SCAN_EXTENSIONS = new Set([".tsx", ".ts", ".jsx", ".js"]);
const IGNORE_DIRS = new Set(["node_modules", "dist", "build", ".git"]);

async function walk(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    if (IGNORE_DIRS.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await walk(full)));
    } else if (SCAN_EXTENSIONS.has(path.extname(entry.name))) {
      files.push(full);
    }
  }
  return files;
}

/** Extract `<Route path="...">` values from App.tsx. */
function extractRoutes(appTsxContent) {
  const routeRegex = /<Route\s+path="([^"]+)"/g;
  const routes = [];
  let m;
  while ((m = routeRegex.exec(appTsxContent)) !== null) {
    routes.push(m[1]);
  }
  return routes;
}

/** Turn a route pattern like "/exams/:category" into a matcher regex. */
function routeToRegex(route) {
  const escaped = route
    .split("/")
    .map((seg) => (seg.startsWith(":") ? "[^/]+" : seg.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")))
    .join("/");
  return new RegExp(`^${escaped}$`);
}

/** Find internal href="..." / href='...' occurrences with line numbers. */
function extractHrefs(fileContent) {
  const hrefRegex = /href\s*=\s*(?:"([^"]*)"|'([^']*)'|\{([^}]*)\})/g;
  const lines = fileContent.split("\n");
  // Precompute cumulative line-start offsets for line-number lookup.
  const offsets = [0];
  for (const line of lines) offsets.push(offsets[offsets.length - 1] + line.length + 1);
  const lineFor = (index) => {
    let lo = 0,
      hi = offsets.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (offsets[mid] <= index) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };

  const results = [];
  let m;
  while ((m = hrefRegex.exec(fileContent)) !== null) {
    const dynamic = m[3] !== undefined;
    const value = m[1] ?? m[2] ?? m[3];
    results.push({ value, dynamic, line: lineFor(m.index) });
  }
  return results;
}

function isInternalHref(value) {
  if (!value) return false;
  if (!value.startsWith("/")) return false;
  // /api/* are backend endpoints (e.g. window.location.href = "/api/logout"
  // triggers a server redirect), not client-side SPA routes — they're not
  // in App.tsx's route table by design, so skip them here.
  if (value.startsWith("/api/")) return false;
  return true;
}

async function main() {
  const args = process.argv.slice(2);
  const wantJson = args.includes("--json");
  const jsonOutArg = args.find((a) => a.startsWith("--json-out="));
  const jsonOutFile = jsonOutArg ? jsonOutArg.split("=").slice(1).join("=") : null;

  const appTsxContent = await readFile(APP_TSX, "utf-8");
  const routes = extractRoutes(appTsxContent);
  const routeMatchers = routes.map((r) => ({ route: r, regex: routeToRegex(r) }));

  function matchesRoute(pathname) {
    return routeMatchers.some(({ regex }) => regex.test(pathname));
  }

  const files = await walk(SRC_DIR);
  const broken = [];
  const skippedDynamic = [];
  let checked = 0;

  for (const file of files) {
    const content = await readFile(file, "utf-8");
    const hrefs = extractHrefs(content);
    const relFile = path.relative(REPO_ROOT, file);

    for (const { value, dynamic, line } of hrefs) {
      if (dynamic) {
        skippedDynamic.push({ file: relFile, line, value: value.trim() });
        continue;
      }
      if (!isInternalHref(value)) continue;

      checked++;
      const [pathname] = value.split("#")[0].split("?");
      if (pathname === "") continue; // pure hash link like "/#section" resolved via "" -> treated below
      const normalizedPath = pathname === "" ? "/" : pathname;

      if (!matchesRoute(normalizedPath)) {
        broken.push({ file: relFile, line, href: value, resolvedPath: normalizedPath });
      }
    }
  }

  const summary = {
    routesFound: routes.length,
    routes,
    filesScanned: files.length,
    internalHrefsChecked: checked,
    brokenCount: broken.length,
    broken,
    skippedDynamicCount: skippedDynamic.length,
    skippedDynamic,
  };

  if (jsonOutFile) {
    await (await import("node:fs/promises")).writeFile(
      jsonOutFile,
      JSON.stringify(summary, null, 2),
      "utf-8"
    );
  }

  if (wantJson) {
    console.log(JSON.stringify(summary, null, 2));
  } else {
    console.log(`Broken-link check`);
    console.log(`  Routes discovered in App.tsx: ${summary.routesFound}`);
    console.log(`  Files scanned: ${summary.filesScanned}`);
    console.log(`  Internal hrefs checked: ${summary.internalHrefsChecked}`);
    console.log(`  Dynamic hrefs skipped (not statically resolvable): ${summary.skippedDynamicCount}`);
    console.log("");
    if (broken.length === 0) {
      console.log("No broken internal links found.");
    } else {
      console.log(`Found ${broken.length} broken internal link(s):`);
      for (const b of broken) {
        console.log(`  - ${b.file}:${b.line} -> "${b.href}" (no matching route for "${b.resolvedPath}")`);
      }
    }
  }

  process.exit(broken.length > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error("check-broken-links failed:", err);
  process.exit(2);
});
