/**
 * Money, and which unit it is in.
 *
 * Stripe deals in the smallest currency unit - cents - and the database stores
 * exactly what Stripe sent. Everything a person reads is in dollars. The whole
 * risk lives in that one conversion, and the way it goes wrong is not a wrong
 * formula but a right formula applied twice.
 *
 * That happened here: the stats endpoint divided by 100 on the way out, and the
 * admin card divided by 100 again on the way in. Total Revenue read $0.60 while
 * the revenue chart on the same page, which converted once, showed the real
 * figure. Nothing threw and nothing looked broken - the number was simply
 * a hundred times too small, next to seven active subscriptions.
 *
 * So the rule is: convert once, at the edge where cents leave the database, and
 * never do arithmetic on money at a display site. `centsToUsd` is that single
 * conversion; `formatUsd` takes dollars and only formats. A display that calls
 * `formatUsd` cannot silently halve or hundredth a figure, because it has no
 * arithmetic left to get wrong.
 */

/**
 * Convert a Stripe amount to dollars.
 *
 * Call this once, where the stored amount leaves the database. Anything past
 * that point is already dollars.
 */
export function centsToUsd(cents: number): number {
  if (!Number.isFinite(cents)) return 0;
  return cents / 100;
}

/**
 * Render an amount that is already in dollars.
 *
 * Takes dollars, not cents, precisely so that a caller holding cents has to
 * stop and convert rather than dividing by chance.
 */
export function formatUsd(amountUsd: number | null | undefined): string {
  const value = typeof amountUsd === "number" && Number.isFinite(amountUsd) ? amountUsd : 0;
  return `$${value.toFixed(2)}`;
}
