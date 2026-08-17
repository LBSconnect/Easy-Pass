import { describe, it, expect } from "vitest";
import {
  isSupersededPrice,
  REQUIRED_PRICES,
  CATEGORY_PRICE_CENTS,
} from "../stripePricing";

const managed = { subscription_type: "single" };

function price(over: Partial<Parameters<typeof isSupersededPrice>[0]> = {}) {
  return {
    active: true,
    unit_amount: CATEGORY_PRICE_CENTS,
    recurring: { interval: "month" },
    metadata: managed,
    productMetadata: null,
    ...over,
  };
}

describe("REQUIRED_PRICES", () => {
  it("sells all four categories at $35/month", () => {
    expect(REQUIRED_PRICES).toHaveLength(4);
    expect(CATEGORY_PRICE_CENTS).toBe(3500);
    for (const config of REQUIRED_PRICES) {
      expect(config.prices).toHaveLength(1);
      expect(config.prices[0].amount).toBe(3500);
      expect(config.prices[0].interval).toBe("month");
    }
  });

  it("covers exactly the four exam categories", () => {
    expect(REQUIRED_PRICES.map((c) => c.category).sort()).toEqual([
      "general_lines",
      "life_insurance",
      "property_casualty",
      "real_estate",
    ]);
  });

  it("no longer offers a bundle", () => {
    expect(REQUIRED_PRICES.some((c) => c.category === "bundle")).toBe(false);
    expect(REQUIRED_PRICES.some((c) => c.isBundle)).toBe(false);
  });
});

describe("isSupersededPrice", () => {
  it("keeps the current $35 monthly price", () => {
    expect(isSupersededPrice(price())).toBe(false);
  });

  it("retires the old $19.99 monthly price", () => {
    expect(isSupersededPrice(price({ unit_amount: 1999 }))).toBe(true);
  });

  it("retires weekly billing", () => {
    expect(
      isSupersededPrice(price({ recurring: { interval: "week" }, unit_amount: 3500 })),
    ).toBe(true);
  });

  it("retires the bundle even when priced at the current amount", () => {
    expect(
      isSupersededPrice(
        price({ unit_amount: 3500, metadata: { subscription_type: "bundle" } }),
      ),
    ).toBe(true);
  });

  it("retires the old $34.99 bundle price", () => {
    expect(
      isSupersededPrice(
        price({ unit_amount: 3499, metadata: { subscription_type: "bundle" } }),
      ),
    ).toBe(true);
  });

  it("recognises subscription metadata carried on the product", () => {
    expect(
      isSupersededPrice(
        price({ unit_amount: 1999, metadata: {}, productMetadata: managed }),
      ),
    ).toBe(true);
  });

  it("never touches prices this app does not manage", () => {
    // No subscription_type metadata anywhere: not ours, leave it alone even
    // though the amount is unrecognised.
    expect(
      isSupersededPrice(
        price({ unit_amount: 4999, metadata: {}, productMetadata: {} }),
      ),
    ).toBe(false);
  });

  it("ignores prices that are already inactive", () => {
    expect(isSupersededPrice(price({ active: false, unit_amount: 1999 }))).toBe(false);
  });

  it("retires a managed price with no amount", () => {
    expect(isSupersededPrice(price({ unit_amount: null }))).toBe(true);
  });
});
