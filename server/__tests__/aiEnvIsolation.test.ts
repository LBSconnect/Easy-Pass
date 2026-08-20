/**
 * The AI tests must not read the machine they run on.
 *
 * WHAT THIS IS FOR
 *
 * aiConfig.test.ts asserts what the assistant does with NO configuration. It
 * used to establish that by deleting a hand-written list of variables, and the
 * list drifted: ALEXI_MOCK_EXAM_ENABLED was added to the product and never to
 * the list. On any machine where that variable is genuinely set - the
 * production environment - the test inherited it and failed with
 * "expected false, received true". Green everywhere it did not matter, red
 * where it did.
 *
 * Adding the missing name would have fixed that one instance and left the next
 * capability to repeat it. So the isolation discovers variables instead of
 * listing them, and these tests hold it to that.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { aiEnvKeys, isolateAiEnv } from "./support/aiEnv";
import { CAPABILITY_ENV, MASTER_ENV } from "@shared/alexiFlags";

describe("aiEnvKeys", () => {
  const planted = ["ALEXI_MOCK_EXAM_ENABLED", "ALEXI_SOMETHING_INVENTED_LATER", MASTER_ENV];
  let before: Record<string, string | undefined>;

  beforeEach(() => {
    before = Object.fromEntries(planted.map((k) => [k, process.env[k]]));
    for (const key of planted) process.env[key] = "true";
  });

  afterEach(() => {
    for (const [key, value] of Object.entries(before)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  });

  it("covers every capability flag the product has", () => {
    // The exact drift that caused the failure: a capability existed and the
    // reset list did not know about it.
    const keys = aiEnvKeys();
    for (const variable of Object.values(CAPABILITY_ENV)) {
      expect(keys, `${variable} is not cleared between tests`).toContain(variable);
    }
    expect(keys).toContain(MASTER_ENV);
  });

  it("covers a flag nobody has invented yet", () => {
    // The point of discovering rather than listing. A capability added next
    // month is handled the day it appears.
    expect(aiEnvKeys()).toContain("ALEXI_SOMETHING_INVENTED_LATER");
  });

  it("covers the credential, which does not share the prefix", () => {
    expect(aiEnvKeys()).toContain("ANTHROPIC_API_KEY");
  });
});

describe("isolateAiEnv", () => {
  const OUTSIDE = "ALEXI_MOCK_EXAM_ENABLED";
  let before: string | undefined;

  beforeEach(() => {
    before = process.env[OUTSIDE];
    // Stand in for a deployment that really does set this.
    process.env[OUTSIDE] = "true";
  });

  afterEach(() => {
    if (before === undefined) delete process.env[OUTSIDE];
    else process.env[OUTSIDE] = before;
  });

  describe("inside an isolated block", () => {
    isolateAiEnv();

    it("does not see a variable the machine had set", () => {
      expect(process.env[OUTSIDE]).toBeUndefined();
    });

    it("still lets a test set what it is actually about", () => {
      process.env.ALEXI_TUTOR_ENABLED = "true";
      expect(process.env.ALEXI_TUTOR_ENABLED).toBe("true");
    });

    it("does not leak that between tests", () => {
      // Whatever the test above set must be gone, or these stop being
      // independent and start depending on their order.
      expect(process.env.ALEXI_TUTOR_ENABLED).toBeUndefined();
    });
  });

  it("gives the machine's value back afterwards", () => {
    // This runs outside the isolated block above. Leaving the variable
    // deleted would change the behaviour of every later test in the process.
    expect(process.env[OUTSIDE]).toBe("true");
  });
});
