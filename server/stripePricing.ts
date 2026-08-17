// Pure pricing configuration and retirement rules.
//
// Deliberately free of database and Stripe-client imports so it can be unit
// tested directly - initializeStripePrices.ts pulls in storage, which
// requires a live DATABASE_URL.

/** Current list price per category, in cents. */
export const CATEGORY_PRICE_CENTS = 3500;

// Single source of truth for what is on sale. The bundle was retired: it is
// deliberately absent here, and any surviving bundle price is deactivated
// below so it cannot be purchased. Existing bundle subscribers keep their
// access, which is driven by user_profiles.allowedCategories and not by
// whether the Stripe price is still active.
interface RequiredPriceConfig {
  productName: string;
  category: string;
  /** Retained so existing bundle-aware call sites keep compiling; always
      undefined now that the bundle is retired, so they resolve to 'single'. */
  isBundle?: boolean;
  prices: Array<{ amount: number; interval: 'month'; billingPeriod: string }>;
}

export const REQUIRED_PRICES: RequiredPriceConfig[] = [
  {
    productName: 'Real Estate Exam',
    category: 'real_estate',
    prices: [
      { amount: CATEGORY_PRICE_CENTS, interval: 'month' as const, billingPeriod: 'monthly' }
    ]
  },
  {
    productName: 'Property & Casualty Exam',
    category: 'property_casualty',
    prices: [
      { amount: CATEGORY_PRICE_CENTS, interval: 'month' as const, billingPeriod: 'monthly' }
    ]
  },
  {
    productName: 'Life Insurance Exam',
    category: 'life_insurance',
    prices: [
      { amount: CATEGORY_PRICE_CENTS, interval: 'month' as const, billingPeriod: 'monthly' }
    ]
  },
  {
    productName: 'General Lines Exam',
    category: 'general_lines',
    prices: [
      { amount: CATEGORY_PRICE_CENTS, interval: 'month' as const, billingPeriod: 'monthly' }
    ]
  }
];

/** Every amount currently on sale. Anything else is a superseded price. */
const CURRENT_AMOUNTS = new Set(
  REQUIRED_PRICES.flatMap((c) => c.prices.map((p) => p.amount))
);

/**
 * Should this existing Stripe price be retired?
 *
 * Deactivating a price in Stripe stops NEW checkouts from using it. It does
 * NOT cancel or reprice existing subscriptions - they keep billing at the
 * price they were created with. That is exactly the grandfathering we want:
 * current subscribers stay at their old rate, new customers pay the new one.
 */
export function isSupersededPrice(price: {
  active: boolean;
  unit_amount: number | null;
  recurring?: { interval?: string } | null;
  metadata?: Record<string, string> | null;
  productMetadata?: Record<string, string> | null;
}): boolean {
  if (!price.active) return false;

  // Only touch prices this app manages; never someone else's product.
  const isManaged = Boolean(
    price.metadata?.subscription_type || price.productMetadata?.subscription_type
  );
  if (!isManaged) return false;

  // Weekly billing is no longer offered.
  if (price.recurring?.interval === 'week') return true;

  // The bundle is retired.
  const subType = price.metadata?.subscription_type || price.productMetadata?.subscription_type;
  if (subType === 'bundle') return true;

  // Any other amount is a superseded list price (e.g. the old $19.99).
  return price.unit_amount === null || !CURRENT_AMOUNTS.has(price.unit_amount);
}
