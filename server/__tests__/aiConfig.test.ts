import { describe, it, expect } from "vitest";
import { isolateAiEnv } from "./support/aiEnv";
import { getAIConfig, hasCredentials } from "../ai/config";
import { estimateCostUsd } from "../ai/pricing";
import { UnconfiguredProvider, AIError } from "../ai/provider";

// These tests assert what happens with NO configuration, so they must not see
// the machine's. The list they used to clear was hand-written and drifted:
// ALEXI_MOCK_EXAM_ENABLED was never added, so wherever that is genuinely set
// this file failed. See support/aiEnv.ts.
isolateAiEnv();

describe("hasCredentials", () => {
  it("is false with no key", () => {
    expect(hasCredentials()).toBe(false);
  });

  it("is true once a key is present", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    expect(hasCredentials()).toBe(true);
  });
});

describe("getAIConfig", () => {
  it("keeps the assistant off when there are no credentials", () => {
    // A deployment that advertises the assistant and then 500s on every call
    // is worse than one that never shows it.
    process.env.ALEXI_ENABLED = "true";

    const config = getAIConfig();
    expect(config.flags.enabled).toBe(false);
    expect(config.provider).toBe("none");
  });

  it("keeps the assistant off when credentials exist but the flag does not", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";

    expect(getAIConfig().flags.enabled).toBe(false);
  });

  it("enables only with both a key and the flag", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    process.env.ALEXI_ENABLED = "true";

    const config = getAIConfig();
    expect(config.flags.enabled).toBe(true);
    expect(config.provider).toBe("anthropic");
  });

  it("makes the master switch actually master", () => {
    // Sub-capabilities must not survive the master switch being off, or an
    // incident kill-switch would not work.
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    process.env.ALEXI_ENABLED = "false";
    process.env.ALEXI_TUTOR_ENABLED = "true";
    process.env.ALEXI_SPANISH_ENABLED = "true";

    const { flags } = getAIConfig();
    expect(flags.tutorEnabled).toBe(false);
    expect(flags.spanishEnabled).toBe(false);
  });

  it("allows one capability to be switched off without the others", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    process.env.ALEXI_ENABLED = "true";
    process.env.ALEXI_TUTOR_ENABLED = "false";

    const { flags } = getAIConfig();
    expect(flags.tutorEnabled).toBe(false);
    expect(flags.flashcardsEnabled).toBe(true);
  });

  it("keeps question generation off by default", () => {
    // Generation without the validation pipeline would put unreviewed
    // licensing content in front of students, so it stays dark until asked for.
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    process.env.ALEXI_ENABLED = "true";

    expect(getAIConfig().flags.quizGenerationEnabled).toBe(false);
    expect(getAIConfig().flags.mockExamEnabled).toBe(false);
  });

  it("routes routine work to a cheaper model than tutoring", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";

    const { models } = getAIConfig();
    expect(models.utility).not.toBe(models.tutor);
  });

  it("lets every model be overridden from the environment", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    process.env.ALEXI_MODEL_TUTOR = "claude-sonnet-5";

    expect(getAIConfig().models.tutor).toBe("claude-sonnet-5");
  });

  it("keeps tutor answers short by default to control cost", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";

    expect(getAIConfig().maxTokens.tutor).toBeLessThanOrEqual(1000);
  });

  it("ignores a non-numeric token override rather than producing NaN", () => {
    process.env.ANTHROPIC_API_KEY = "sk-ant-test";
    process.env.ALEXI_MAX_TOKENS_TUTOR = "not-a-number";

    expect(getAIConfig().maxTokens.tutor).toBe(700);
  });

  it("uses a low temperature - this is regulated content, not creative writing", () => {
    expect(getAIConfig().temperature).toBeLessThanOrEqual(0.3);
  });

  it("bounds latency so a student is never left hanging", () => {
    const config = getAIConfig();

    expect(config.timeoutMs).toBeLessThanOrEqual(30000);
    expect(config.maxRetries).toBeLessThanOrEqual(2);
  });
});

describe("UnconfiguredProvider", () => {
  it("fails fast rather than pretending to work", async () => {
    await expect(new UnconfiguredProvider().complete()).rejects.toThrow(AIError);
  });

  it("reports the failure as non-retryable so callers fall back immediately", async () => {
    // Retrying a missing key wastes a student's time; the caller should go
    // straight to approved content.
    // Resolve to null on success so a provider that stopped throwing shows up
    // as "did not reject" rather than as a missing property on a response.
    const thrown: unknown = await new UnconfiguredProvider()
      .complete()
      .then(() => null)
      .catch((e: unknown) => e);

    expect(thrown).toBeInstanceOf(AIError);
    const error = thrown as AIError;
    expect(error.kind).toBe("not_configured");
    expect(error.retryable).toBe(false);
  });
});

describe("estimateCostUsd", () => {
  it("costs a typical tutor answer at well under a cent", () => {
    // Sanity floor on the unit economics: if one explanation cost dollars the
    // whole design would need rethinking.
    const cost = estimateCostUsd("claude-opus-5", 1200, 250);

    expect(cost).toBeGreaterThan(0);
    expect(cost).toBeLessThan(0.02);
  });

  it("prices the utility model below the flagship", () => {
    expect(estimateCostUsd("claude-haiku-4-5", 1000, 1000))
      .toBeLessThan(estimateCostUsd("claude-opus-5", 1000, 1000));
  });

  it("returns zero for an unknown or absent model rather than guessing", () => {
    expect(estimateCostUsd(null, 1000, 1000)).toBe(0);
    expect(estimateCostUsd("some-future-model", 1000, 1000)).toBe(0);
  });
});
