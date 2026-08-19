/**
 * What the admin panel is told when an AI call fails.
 *
 * The usage panel records one short string per failure. If that string is the
 * front of the provider's JSON envelope, every failure reads the same and an
 * operator has to guess. This actually happened: for weeks every Alexi call
 * fell back, and the recorded reason was `provider_error` - then, once a detail
 * was recorded, `provider_error: 400 {"type":"error","error":{"type":"invali`.
 * The one sentence that said what to do ("Your credit balance is too low")
 * was past the cut.
 *
 * So these tests pin the sentence, not the envelope.
 */
import { describe, it, expect } from "vitest";
import { providerDetail, classify } from "../ai/anthropic";
import { AIError } from "../ai/provider";

/** The shape the SDK actually throws: status prefix, then the whole body. */
function sdkError(status: number, type: string, message: string) {
  const body = { type: "error", error: { type, message } };
  const err: any = new Error(`${status} ${JSON.stringify(body)}`);
  err.status = status;
  err.error = body;
  return err;
}

const CREDIT_MESSAGE =
  "Your credit balance is too low to access the Anthropic API. Please go to Plans & Billing to upgrade or purchase credits.";

describe("providerDetail", () => {
  it("reports the sentence an operator can act on", () => {
    const detail = providerDetail(sdkError(400, "invalid_request_error", CREDIT_MESSAGE));

    expect(detail).toContain("credit balance is too low");
    // The envelope is noise; if it appears at all it has eaten the budget.
    expect(detail).not.toContain('{"type"');
    expect(detail).not.toContain("invalid_request_error");
  });

  it("finds the sentence even when the parsed body is missing", () => {
    // Some transports hand back only the message string.
    const err: any = new Error(
      `400 ${JSON.stringify({ type: "error", error: { type: "invalid_request_error", message: CREDIT_MESSAGE } })}`,
    );
    err.status = 400;

    expect(providerDetail(err)).toContain("credit balance is too low");
  });

  it("unescapes a message that was quoted inside the envelope", () => {
    const err: any = new Error(
      '400 {"type":"error","error":{"type":"invalid_request_error","message":"model \\"claude-nope\\" not found"}}',
    );

    expect(providerDetail(err)).toBe('model "claude-nope" not found');
  });

  it("falls back to the raw message when there is no envelope", () => {
    expect(providerDetail(new Error("socket hang up"))).toBe("socket hang up");
  });

  it("says nothing rather than something meaningless", () => {
    expect(providerDetail(new Error("   "))).toBe("");
    expect(providerDetail(undefined)).toBe("");
    expect(providerDetail({})).toBe("");
  });

  it("stays short enough for the column it is stored in", () => {
    const detail = providerDetail(sdkError(400, "invalid_request_error", "x".repeat(500)));

    expect(detail.length).toBeLessThanOrEqual(100);
  });
});

describe("classify", () => {
  it("carries the credit message through to the recorded failure", () => {
    // The end-to-end property: what the provider said reaches the admin panel.
    const error = classify(sdkError(400, "invalid_request_error", CREDIT_MESSAGE));

    expect(error).toBeInstanceOf(AIError);
    expect(error.kind).toBe("bad_request");
    expect(error.message).toContain("credit balance is too low");
    // An empty wallet is still empty on the second attempt. Retrying it just
    // doubles the wait before the student sees the same fallback.
    expect(error.retryable).toBe(false);
  });

  it("names the model when the provider does not recognise it", () => {
    const error = classify(sdkError(404, "not_found_error", "model: claude-nope"));

    expect(error.kind).toBe("model_not_found");
    expect(error.message).toContain("claude-nope");
    // Retrying a name the provider has never heard of just burns a student's
    // wait for the same answer.
    expect(error.retryable).toBe(false);
  });

  it("keeps a rejected key distinct from an empty wallet", () => {
    // Both leave the tutor silent, but only one is fixed by adding credit.
    expect(classify(sdkError(401, "authentication_error", "invalid x-api-key")).kind).toBe(
      "not_configured",
    );
  });

  it("still retries the failures a retry could actually fix", () => {
    const flaky: any = new Error("500 internal server error");
    flaky.status = 500;
    expect(classify(flaky).kind).toBe("provider_error");
    expect(classify(flaky).retryable).toBe(true);
  });

  it("still classifies the cases that have nothing to say", () => {
    expect(classify(sdkError(429, "rate_limit_error", "slow down")).kind).toBe("rate_limited");

    const aborted: any = new Error("aborted");
    aborted.name = "AbortError";
    expect(classify(aborted).kind).toBe("timeout");
  });

  it("passes an AIError through untouched", () => {
    const original = new AIError("invalid_response", "AI returned an empty response");
    expect(classify(original)).toBe(original);
  });
});
