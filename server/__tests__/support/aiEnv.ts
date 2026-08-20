/**
 * Keeping the deployment's environment out of the AI config tests.
 *
 * WHAT WENT WRONG
 *
 * These tests assert what the assistant does with no configuration - that a
 * capability is off unless something turns it on. They did that by deleting a
 * hand-written list of variables before each test.
 *
 * The list drifted. `ALEXI_MOCK_EXAM_ENABLED` was added to the product and
 * never added to the list, so wherever that variable is actually set - which
 * is the production environment - the test inherited it and "keeps question
 * generation off by default" failed with `expected false, received true`. The
 * suite passed on any machine where the flag happened to be unset and failed
 * on the one that matters.
 *
 * A test that reads ambient environment is not testing the code; it is testing
 * the machine.
 *
 * WHY THIS DISCOVERS RATHER THAN LISTS
 *
 * The fix is not to add the missing name - that is the same bug again the next
 * time a capability is added. Every `ALEXI_*` variable present in the
 * environment is cleared, whatever it is called, so a flag introduced later is
 * covered the day it appears. The credential is named explicitly because it
 * does not share that prefix.
 *
 * Restoring afterwards matters as much as clearing: these run in one process
 * with everything else, and a leaked variable would change the behaviour of
 * whatever ran next.
 */

import { beforeEach, afterEach } from "vitest";
import { CAPABILITY_ENV, MASTER_ENV } from "@shared/alexiFlags";

/**
 * Every variable that can steer AI configuration.
 *
 * Two sources, deliberately. The declared flags come from CAPABILITY_ENV, so
 * the list cannot drift behind the product. Discovery by prefix then catches
 * everything else - model overrides, token limits, a flag added next month.
 *
 * Read at the moment it is called rather than captured once, so a variable a
 * test sets during its run is also cleaned up afterwards.
 */
export function aiEnvKeys(): string[] {
  return Array.from(
    new Set([
      // The credential, which does not share the prefix.
      "ANTHROPIC_API_KEY",
      // Every flag the product declares, taken from the module that declares
      // them rather than copied. This is the half that drifted.
      MASTER_ENV,
      ...Object.values(CAPABILITY_ENV),
      // And anything else ALEXI_-shaped that is actually set - model
      // overrides, token limits, and whatever gets added next.
      ...Object.keys(process.env).filter((key) => key.startsWith("ALEXI_")),
    ]),
  );
}

/**
 * Run the surrounding tests against an environment with no AI configuration.
 *
 * Call once at the top level of a describe or file. Tests are then free to set
 * whatever variables they are actually about.
 */
export function isolateAiEnv(): void {
  let saved: Record<string, string | undefined> = {};

  beforeEach(() => {
    saved = {};
    for (const key of aiEnvKeys()) {
      saved[key] = process.env[key];
      delete process.env[key];
    }
  });

  afterEach(() => {
    // Clear first, so anything a test introduced does not survive; then put
    // back exactly what was there before.
    for (const key of aiEnvKeys()) delete process.env[key];
    for (const [key, value] of Object.entries(saved)) {
      if (value !== undefined) process.env[key] = value;
    }
  });
}
