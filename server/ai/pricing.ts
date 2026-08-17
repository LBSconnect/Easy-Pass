/**
 * Token pricing.
 *
 * Split out from `usageLog` so cost maths is testable without a database
 * connection - `usageLog` imports `storage`, which requires DATABASE_URL at
 * module load, and unit tests should not need a database to check arithmetic.
 */

/**
 * Indicative per-million-token prices, USD.
 *
 * Internal reporting only, never shown to students. Prices move, so treat the
 * output as an estimate; the token counts stored alongside it are the durable
 * record and can always be re-costed later.
 */
export const PRICE_PER_MTOK: Record<string, { input: number; output: number }> = {
  "claude-opus-5": { input: 5, output: 25 },
  "claude-sonnet-5": { input: 3, output: 15 },
  "claude-haiku-4-5": { input: 1, output: 5 },
};

export function estimateCostUsd(
  model: string | null,
  inputTokens: number,
  outputTokens: number,
): number {
  if (!model) return 0;
  const price = PRICE_PER_MTOK[model];
  // An unknown model costs 0 rather than a guessed rate - a wrong number on a
  // cost dashboard is worse than a visibly missing one.
  if (!price) return 0;

  return (inputTokens / 1_000_000) * price.input + (outputTokens / 1_000_000) * price.output;
}
