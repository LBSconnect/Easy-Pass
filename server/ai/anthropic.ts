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
function classify(err: unknown): AIError {
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
  return new AIError("provider_error", "AI provider request failed", err);
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
