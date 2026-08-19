/**
 * Provider-neutral AI interface.
 *
 * Product code depends on THIS file, never on a vendor SDK. Swapping or adding
 * a provider means writing one adapter, not touching tutor/generation logic.
 *
 * The interface is deliberately small - one text completion call with an
 * optional JSON schema. Anything richer (tool use, streaming, batching) would
 * leak a particular vendor's shape into the abstraction, and none of it is
 * needed for grounded tutoring or structured content generation.
 */

import type { ModelRole } from "./config";

export interface CompletionRequest {
  /** Which task this is - the config maps it to a concrete model. */
  role: ModelRole;
  /** Instructions. Never contains secrets or student PII. */
  system: string;
  /** The user-visible turn(s). Untrusted student text must be pre-wrapped. */
  messages: Array<{ role: "user" | "assistant"; content: string }>;
  /**
   * When set, the provider must return JSON conforming to this schema.
   * Structured output is not a nicety here: parsing exam questions out of
   * free prose is how wrong answers reach students.
   */
  jsonSchema?: Record<string, unknown>;
  maxTokens?: number;
  temperature?: number;
}

export interface CompletionUsage {
  inputTokens: number;
  outputTokens: number;
}

export interface CompletionResponse {
  text: string;
  usage: CompletionUsage;
  model: string;
  /** Milliseconds spent in the provider call. */
  latencyMs: number;
}

/**
 * Why a call failed. Callers branch on this to decide whether to fall back
 * silently (provider problems) or surface something (bad request).
 */
export type AIErrorKind =
  | "not_configured"
  | "timeout"
  | "rate_limited"
  // The model name was rejected. Kept apart from provider_error because it
  // fails every single call rather than some of them, and the fix is a
  // configuration change rather than waiting - "100% fallback" reported as a
  // generic provider error sends an operator looking for an outage that is
  // not happening.
  | "model_not_found"
  // The provider understood the request and refused it - a malformed body, or
  // an account that cannot be billed. Kept apart from provider_error because
  // that one is retried and this one must not be: the answer is identical the
  // second time, so a retry only doubles the student's wait and the bill for
  // a call that was never going to work.
  | "bad_request"
  | "provider_error"
  | "invalid_response";

export class AIError extends Error {
  constructor(
    readonly kind: AIErrorKind,
    message: string,
    readonly cause?: unknown,
  ) {
    super(message);
    this.name = "AIError";
  }

  /** Whether retrying the same request could plausibly succeed. */
  get retryable(): boolean {
    // model_not_found, not_configured and bad_request are deliberately absent:
    // retrying a wrong model name, a rejected key or a refused request just
    // fails again.
    return this.kind === "timeout" || this.kind === "rate_limited" || this.kind === "provider_error";
  }
}

export interface AIProvider {
  readonly name: string;
  complete(request: CompletionRequest): Promise<CompletionResponse>;
}

/**
 * Stand-in used when no credentials are configured.
 *
 * It fails fast and loudly *to the caller* rather than pretending to work.
 * Every caller is required to handle failure by falling back to approved
 * static content, so an uncredentialed deployment degrades to the pre-AI
 * product rather than breaking.
 */
export class UnconfiguredProvider implements AIProvider {
  readonly name = "none";

  async complete(): Promise<CompletionResponse> {
    throw new AIError("not_configured", "No AI provider is configured");
  }
}
