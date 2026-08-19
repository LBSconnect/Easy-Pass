/**
 * Every translated string the app asks for actually exists, in both languages.
 *
 * THE BUG THIS PREVENTS
 *
 * Components call `t("auth.email", "Email")`. If the key is missing, i18next
 * returns the second argument and says nothing. So English looks perfect and
 * Spanish shows English - and since almost everyone develops and tests in
 * English, nothing ever surfaces it.
 *
 * The whole `auth` namespace was missing that way. A Spanish student reached a
 * sign-up form reading "Create Account / First Name / Password / Confirm
 * Password / Already have an account?" inside a page whose header and footer
 * were fully translated. It is the first form they touch, and half this
 * product's audience is Spanish-speaking.
 *
 * WHY A SOURCE SCAN RATHER THAN A BROWSER TEST
 *
 * A browser test can only check the page it visits, and there is no realistic
 * suite that visits every page in both languages. This reads every t() call in
 * the client at once, costs milliseconds, and needs no server - so it runs in
 * the fast unit job on every push.
 *
 * WHEN THIS FAILS
 *
 * Add the key to BOTH `en` and `es` in client/src/lib/i18nResources.ts. Do not
 * delete the inline English fallback in the component - it is a reasonable
 * belt-and-braces default. Just stop relying on it.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { resources } from "../../client/src/lib/i18nResources";

const CLIENT_SRC = path.resolve(__dirname, "../../client/src");

/** Keys the app deliberately shows the same way in both languages. */
const SAME_IN_BOTH_LANGUAGES = new Set([
  "nav.admin", // Staff-only label; the panel itself is English.
  "nav.timeClock", // "Work-A-Beez" is a product name.
  "footer.company", // A registered company name is not translated.
  "scheduleExam.form.errorTitle", // "Error" is the same word in Spanish.
]);

type Table = Record<string, unknown>;

function sourceFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) sourceFiles(full, found);
    else if (/\.(tsx?|jsx?)$/.test(full)) found.push(full);
  }
  return found;
}

function flatten(table: Table, prefix = "", out = new Map<string, string>()): Map<string, string> {
  for (const [key, value] of Object.entries(table)) {
    const full = prefix ? `${prefix}.${key}` : key;
    if (value && typeof value === "object") flatten(value as Table, full, out);
    else out.set(full, String(value));
  }
  return out;
}

const en = flatten(resources.en.translation as Table);
const es = flatten(resources.es.translation as Table);

/**
 * Every `t("some.key"...)` in the client.
 *
 * Only dotted keys are collected. A bare `t("Continue")` is not an i18n key in
 * this codebase, and treating it as one would produce noise rather than
 * findings.
 */
function translationCalls(): Array<{ file: string; key: string }> {
  const calls: Array<{ file: string; key: string }> = [];
  const pattern = /\bt\(\s*(['"])([A-Za-z0-9_.]+)\1/g;

  for (const file of sourceFiles(CLIENT_SRC)) {
    if (file.endsWith("i18nResources.ts") || file.endsWith("i18n.ts")) continue;
    for (const match of readFileSync(file, "utf8").matchAll(pattern)) {
      const key = match[2];
      if (key.includes(".")) {
        calls.push({ file: path.relative(CLIENT_SRC, file), key });
      }
    }
  }
  return calls;
}

describe("translation coverage", () => {
  const calls = translationCalls();

  it("finds the translation calls at all", () => {
    // If the scan silently matched nothing, every assertion below would pass
    // while checking exactly nothing.
    expect(calls.length).toBeGreaterThan(100);
  });

  it("has an English string for every key the app asks for", () => {
    const missing = calls
      .filter(({ key }) => !en.has(key))
      .map(({ file, key }) => `${file}: ${key}`);

    expect([...new Set(missing)]).toEqual([]);
  });

  it("has a Spanish string for every key the app asks for", () => {
    // The half that actually broke. English hid it behind the inline fallback.
    const missing = calls
      .filter(({ key }) => !es.has(key))
      .map(({ file, key }) => `${file}: ${key}`);

    expect([...new Set(missing)]).toEqual([]);
  });

  it("keeps the two tables the same shape", () => {
    // A key added to one language only is the same bug caught one step
    // earlier - before anything even calls it.
    expect([...en.keys()].filter((k) => !es.has(k))).toEqual([]);
    expect([...es.keys()].filter((k) => !en.has(k))).toEqual([]);
  });

  it("does not leave English text sitting in the Spanish table", () => {
    // A copied-not-translated entry reads as a working translation and is not
    // one. Proper nouns are listed above by name rather than waved through.
    const untranslated = [...en.entries()]
      .filter(([key, value]) => !SAME_IN_BOTH_LANGUAGES.has(key) && es.get(key) === value)
      // Numbers, punctuation and single symbols are legitimately identical.
      .filter(([, value]) => /[a-zA-Z]{4,}/.test(value))
      .map(([key, value]) => `${key} = ${value}`);

    expect(untranslated).toEqual([]);
  });
});
