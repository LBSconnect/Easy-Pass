/**
 * Anthropic adapter.
 *
 * The only file in the codebase that knows Anthropic exists. Uses the official
 * SDK, loaded lazily so a deployment without credentials never pays the import
 * cost and the package stays an optional dependency at runtime.
 */

import { getAIConfig } from "./config";
import {
  AIError,
  type AIProvider,
  type CompletionRequest,
  type CompletionResponse,
} from "./provider";

type AnthropicClient = {
  messages: {
    create(body: Record<string, unknown>, options?: Record<string, unknown>): Promise<{
      content: Array<{ type: string; text?: string }>;
      usage?: { input_tokens?: number; output_tokens?: number };
      model?: string;
    }>;
  };
};

let clientPromise: Promise<AnthropicClient> | null = null;

async function getClient(): Promise<AnthropicClient> {
  if (!clientPromise) {
    clientPromise = (async () => {
      const apiKey = process.env.ANTHROPIC_API_KEY;
      if (!apiKey) {
        throw new AIError("not_configured", "ANTHROPIC_API_KEY is not set");
      }
      // Dynamic import keeps the SDK out of the startup path and lets the
      // build succeed in environments that never install it.
      const mod: any = await import("@anthropic-ai/sdk");
      const Anthropic = mod.default ?? mod.Anthropic;
      return new Anthropic({ apiKey }) as AnthropicClient;
    })().catch((err) => {
      // Do not cache a failed construction - the key may be added later.
      clientPromise = null;
      throw err;
    });
  }
  return clientPromise;
}

/** Map an SDK/network error onto our own taxonomy so callers can branch. */
/**
 * The provider's own description of what went wrong.
 *
 * Recorded so the admin usage panel can say "model claude-opus-5 not found"
 * rather than "provider_error", which is true but unactionable. Truncated
 * because it is stored in a short column and a stack trace is not the point.
 */
export function providerDetail(err: unknown): string {
  const raw = (err as { message?: string })?.message;
  if (typeof raw !== "string" || !raw.trim()) return "";

  // The SDK's message is the status followed by the whole JSON envelope, so
  // truncating it blindly spends the budget on `{"type":"error","error":...`
  // and cuts off the sentence that says what went wrong. That is exactly what
  // happened in production: an operator saw `"message":"Your cred` and had to
  // guess the rest. The human sentence is what gets kept.
  const inner =
    (err as { error?: { error?: { message?: unknown } } })?.error?.error?.message;
  if (typeof inner === "string" && inner.trim()) {
    return inner.trim().slice(0, 100);
  }

  const match = raw.match(/"message"\s*:\s*"((?:[^"\\]|\\.)*)"/);
  if (match) {
    try {
      return JSON.parse(`"${match[1]}"`).slice(0, 100);
    } catch {
      return match[1].slice(0, 100);
    }
  }

  return raw.trim().slice(0, 100);
}

export function classify(err: unknown): AIError {
  if (err instanceof AIError) return err;

  const status = (err as { status?: number })?.status;
  const name = (err as { name?: string })?.name;

  if (name === "AbortError" || name === "TimeoutError") {
    return new AIError("timeout", "AI request timed out", err);
  }
  if (status === 429) {
    return new AIError("rate_limited", "AI provider rate limited the request", err);
  }
  if (status === 401 || status === 403) {
    return new AIError("not_configured", "AI credentials rejected", err);
  }
  if (status === 404) {
    // Almost always the configured model name. Said plainly, because this is
    // the failure that makes every call fall back while the key is fine.
    return new AIError("model_not_found", providerDetail(err) || "AI model not found", err);
  }
  if (status === 400 || status === 422) {
    // The provider read the request and said no. Retrying gets the same no,
    // so this is reported once and not repeated - and the provider's own
    // sentence is kept, because "bad request" alone does not distinguish a
    // schema mistake from an account that has run out of credit.
    return new AIError("bad_request", providerDetail(err) || "AI provider rejected the request", err);
  }
  return new AIError("provider_error", providerDetail(err) || "AI provider request failed", err);
}

export class AnthropicProvider implements AIProvider {
  readonly name = "anthropic";

  async complete(request: CompletionRequest): Promise<CompletionResponse> {
    const config = getAIConfig();
    const model = config.models[request.role];
    const maxTokens = request.maxTokens ?? config.maxTokens[request.role];

    const body: Record<string, unknown> = {
      model,
      max_tokens: maxTokens,
      temperature: request.temperature ?? config.temperature,
      system: request.system,
      messages: request.messages,
    };

    // Structured output: constrain the response to the caller's schema so we
    // never regex exam content out of prose.
    if (request.jsonSchema) {
      body.output_config = {
        format: { type: "json_schema", schema: request.jsonSchema },
      };
    }

    const started = Date.now();
    let lastError: unknown;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
      try {
        const client = await getClient();
        const response = await client.messages.create(body, {
          timeout: config.timeoutMs,
          maxRetries: 0, // We own the retry loop so latency stays bounded.
        });

        const text = response.content
          .filter((block) => block.type === "text")
          .map((block) => block.text ?? "")
          .join("")
          .trim();

        if (!text) {
          throw new AIError("invalid_response", "AI returned an empty response");
        }

        return {
          text,
          usage: {
            inputTokens: response.usage?.input_tokens ?? 0,
            outputTokens: response.usage?.output_tokens ?? 0,
          },
          model: response.model ?? model,
          latencyMs: Date.now() - started,
        };
      } catch (err) {
        lastError = err;
        const classified = classify(err);
        // Only retry things a retry could fix, and only once by default -
        // a student waiting on an explanation will not sit through three
        // backoffs.
        if (!classified.retryable || attempt === config.maxRetries) {
          throw classified;
        }
        await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
      }
    }

    throw classify(lastError);
  }
}
