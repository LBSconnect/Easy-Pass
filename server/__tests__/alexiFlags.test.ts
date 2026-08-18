/**
 * Which switch is blocking a capability.
 *
 * The rule matters because getting it wrong sends an operator to change a
 * variable that will have no effect. The master switch overrides everything,
 * so it has to be reported first even when the specific capability's own flag
 * is also off.
 */
import { describe, it, expect } from "vitest";
import {
  blockingEnvVar,
  MASTER_ENV,
  CAPABILITY_ENV,
  resolveTargetedPractice,
  TARGETED_PRACTICE_ENV,
  type AssistantFlagState,
} from "@shared/alexiFlags";

const allOn: AssistantFlagState = {
  enabled: true,
  tutorEnabled: true,
  quizGenerationEnabled: true,
  flashcardsEnabled: true,
  mockExamEnabled: true,
  retakerEnabled: true,
  spanishEnabled: true,
};

describe("blockingEnvVar", () => {
  it("returns null when the capability is on", () => {
    expect(blockingEnvVar(allOn, "quizGenerationEnabled")).toBeNull();
  });

  it("names the master switch when it is off", () => {
    expect(blockingEnvVar({ ...allOn, enabled: false }, "quizGenerationEnabled")).toBe(MASTER_ENV);
  });

  it("names the master switch even when the capability flag is also off", () => {
    // This is the case that bit us: setting ALEXI_QUIZ_GENERATION_ENABLED
    // alone changes nothing, so pointing at it would waste a deploy.
    expect(
      blockingEnvVar({ ...allOn, enabled: false, quizGenerationEnabled: false }, "quizGenerationEnabled"),
    ).toBe(MASTER_ENV);
  });

  it("names the capability's own variable when only it is off", () => {
    expect(blockingEnvVar({ ...allOn, quizGenerationEnabled: false }, "quizGenerationEnabled")).toBe(
      "ALEXI_QUIZ_GENERATION_ENABLED",
    );
    expect(blockingEnvVar({ ...allOn, mockExamEnabled: false }, "mockExamEnabled")).toBe(
      "ALEXI_MOCK_EXAM_ENABLED",
    );
  });

  it("falls back to the master switch when there is no config", () => {
    // Nothing downstream can be true without it, so this is not a guess.
    expect(blockingEnvVar(null, "tutorEnabled")).toBe(MASTER_ENV);
    expect(blockingEnvVar(undefined, "tutorEnabled")).toBe(MASTER_ENV);
  });

  it("has an environment variable for every capability", () => {
    // A capability added without one would render an empty instruction.
    const capabilities = Object.keys(allOn).filter((k) => k !== "enabled");
    for (const capability of capabilities) {
      expect(CAPABILITY_ENV[capability as keyof typeof CAPABILITY_ENV]).toMatch(/^ALEXI_/);
    }
    expect(Object.keys(CAPABILITY_ENV)).toHaveLength(capabilities.length);
  });
});

describe("resolveTargetedPractice", () => {
  it("is off unless deliberately turned on", () => {
    for (const raw of [undefined, "", "false", "0", "yes", "TRUE", "on"]) {
      expect(resolveTargetedPractice(raw)).toBe(false);
    }
  });

  it("accepts the two values the rest of the flag surface accepts", () => {
    expect(resolveTargetedPractice("true")).toBe(true);
    expect(resolveTargetedPractice("1")).toBe(true);
  });

  it("uses the mock-exam switch operators already have", () => {
    expect(TARGETED_PRACTICE_ENV).toBe("ALEXI_MOCK_EXAM_ENABLED");
  });
});
