/**
 * AI usage and cost accounting.
 *
 * Every provider call - success, failure, cache hit, fallback - is recorded so
 * "what does a tutor answer cost us?" and "how often is the cache working?"
 * are answerable from data rather than guessed. Without this, the first signal
 * of a runaway loop is the invoice.
 *
 * Deliberately records no student text: the operation type, the model and the
 * token counts are enough for cost and quality analysis, and question or chat
 * bodies in a log table are a privacy liability with no analytical payoff.
 */

import { storage } from "../storage";
import { estimateCostUsd } from "./pricing";

export type AIOperation =
  | "tutor_explanation"
  | "recommendation_phrasing"
  | "question_generation"
  | "question_validation"
  | "flashcard_generation";

export type AIOutcome = "success" | "cache_hit" | "fallback" | "error" | "blocked";

export interface UsageRecord {
  operation: AIOperation;
  outcome: AIOutcome;
  provider: string;
  model: string | null;
  promptRef: string | null;
  inputTokens: number;
  outputTokens: number;
  latencyMs: number;
  /** Exam category, for per-product cost reporting. */
  category: string | null;
  /** Opaque internal user id. Never an email or name. */
  userId: string | null;
  /** Short machine-readable reason on non-success outcomes. */
  reason?: string | null;
}

export { estimateCostUsd } from "./pricing";

/**
 * Record one AI operation.
 *
 * Never throws. Accounting failing must not fail a student's study session -
 * a lost log line is an acceptable cost, a 500 on the tutor is not.
 */
export async function recordUsage(record: UsageRecord): Promise<void> {
  try {
    await storage.createAiUsageEvent({
      operation: record.operation,
      outcome: record.outcome,
      provider: record.provider,
      model: record.model ?? null,
      promptRef: record.promptRef ?? null,
      inputTokens: record.inputTokens,
      outputTokens: record.outputTokens,
      estimatedCostMicros: Math.round(
        estimateCostUsd(record.model, record.inputTokens, record.outputTokens) * 1_000_000,
      ),
      latencyMs: record.latencyMs,
      category: record.category ?? null,
      userId: record.userId ?? null,
      reason: record.reason ?? null,
    });
  } catch (error) {
    console.error("[alexi] failed to record AI usage:", error);
  }
}
