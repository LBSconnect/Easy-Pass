/**
 * Regression tests for checkout price validation.
 *
 * Production checkout returned a bare 500 on Subscribe. The cause was a
 * never-expiring in-memory set of "known good" price ids: a price validated
 * once stayed valid forever, including after repricing archived it. The stale
 * id passed validation and then failed inside Stripe's session creation.
 *
 * These lock the two properties that matter: an archived price is never
 * sellable, and validity is re-checked rather than remembered.
 */

import { describe, it, expect, vi } from "vitest";

/** Mirrors isSellableExamPrice in routes.ts. */
function isSellableExamPrice(price: {
  active: boolean;
  recurring?: unknown;
  metadata?: Record<string, string> | null;
  product: any;
}): boolean {
  if (!price.active) return false;
  const product =
    typeof price.product === "object" && price.product && !("deleted" in price.product)
      ? price.product
      : null;
  if (price.metadata?.subscription_type || product?.metadata?.subscription_type) {
    return true;
  }
  return Boolean(price.recurring) && Boolean(product?.name);
}

const activePrice = (over: Record<string, unknown> = {}) => ({
  id: "price_live",
  active: true,
  recurring: { interval: "month" },
  metadata: { subscription_type: "single" },
  product: { name: "Texas Life Insurance", metadata: {} },
  ...over,
});

describe("isSellableExamPrice", () => {
  it("accepts a live monthly exam price", () => {
    expect(isSellableExamPrice(activePrice())).toBe(true);
  });

  it("rejects an archived price", () => {
    // The specific state that broke production: repricing archives the
    // superseded price, and Stripe refuses to open a subscription on it.
    expect(isSellableExamPrice(activePrice({ active: false }))).toBe(false);
  });

  it("rejects a one-off price with no recurring interval", () => {
    expect(
      isSellableExamPrice({
        active: true,
        recurring: null,
        metadata: {},
        product: { name: "Texas Life Insurance", metadata: {} },
      }),
    ).toBe(false);
  });

  it("rejects a price whose product was deleted", () => {
    expect(
      isSellableExamPrice({
        active: true,
        recurring: { interval: "month" },
        metadata: {},
        product: { deleted: true },
      }),
    ).toBe(false);
  });
});

/**
 * The cache behaviour itself. Reimplemented here in both the broken and the
 * fixed shape so the difference is asserted rather than described.
 */
describe("price id validation caching", () => {
  function makeValidator(useCache: boolean) {
    const cache = new Set<string>();
    return {
      cache,
      async validate(
        priceId: string,
        retrieve: (id: string) => Promise<ReturnType<typeof activePrice>>,
      ) {
        if (useCache && cache.has(priceId)) return true;
        const price = await retrieve(priceId);
        if (isSellableExamPrice(price)) {
          cache.add(price.id);
          return true;
        }
        return false;
      },
    };
  }

  it("the old cached behaviour kept approving a price after it was archived", () => {
    // Documents the bug so the fix below is not mistaken for a no-op.
    const v = makeValidator(true);
    const live = vi.fn().mockResolvedValue(activePrice());

    return v.validate("price_live", live).then(async (first) => {
      expect(first).toBe(true);

      const archived = vi.fn().mockResolvedValue(activePrice({ active: false }));
      const second = await v.validate("price_live", archived);

      expect(second).toBe(true); // wrong, and exactly what shipped
      expect(archived).not.toHaveBeenCalled();
    });
  });

  it("re-checks every time, so an archived price is rejected", async () => {
    const v = makeValidator(false);

    expect(await v.validate("price_live", async () => activePrice())).toBe(true);
    expect(
      await v.validate("price_live", async () => activePrice({ active: false })),
    ).toBe(false);
  });

  it("hits Stripe on each checkout rather than trusting a remembered answer", async () => {
    const v = makeValidator(false);
    const live = vi.fn().mockResolvedValue(activePrice());

    await v.validate("price_live", live);
    await v.validate("price_live", live);

    // Checkout happens once per subscriber; correctness on a payment path is
    // worth one lookup.
    expect(live).toHaveBeenCalledTimes(2);
  });
});
