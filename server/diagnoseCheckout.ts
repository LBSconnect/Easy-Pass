/**
 * Checkout diagnostics.
 *
 * Read-only. Answers "why did Subscribe return a 500?" without anyone having
 * to paste credentials anywhere: it runs where the key already is, and prints
 * only what the key can see, never the key itself.
 *
 *   npx tsx server/diagnoseCheckout.ts
 *   npx tsx server/diagnoseCheckout.ts price_1234...   # check one price id
 *
 * Makes no writes of any kind - no prices created, archived or modified.
 */

import { getCachedStripeClient } from "./stripeClient";

/** Mirrors isSellableExamPrice in routes.ts - the gate checkout applies. */
function isSellable(price: {
  active: boolean;
  recurring?: unknown;
  metadata?: Record<string, string> | null;
  product: unknown;
}): { ok: boolean; why: string } {
  if (!price.active) return { ok: false, why: "price is ARCHIVED" };

  const product =
    typeof price.product === "object" && price.product && !("deleted" in (price.product as object))
      ? (price.product as { name?: string; metadata?: Record<string, string>; active?: boolean })
      : null;

  if (!product) return { ok: false, why: "product deleted or not expanded" };
  if (product.active === false) return { ok: false, why: "PRODUCT is archived" };

  const subType = price.metadata?.subscription_type || product.metadata?.subscription_type;
  if (subType) return { ok: true, why: `managed price (subscription_type=${subType})` };
  if (!price.recurring) return { ok: false, why: "not a recurring price" };

  return { ok: true, why: "recurring price on a known product" };
}

function money(amount: number | null, currency: string): string {
  return amount === null ? "—" : `${(amount / 100).toFixed(2)} ${currency.toUpperCase()}`;
}

async function main() {
  const key = process.env.STRIPE_SECRET_KEY ?? "";

  // Mode first: a live site pointed at a test key renders prices fine and then
  // fails at checkout, which looks exactly like a price problem.
  const mode = key.startsWith("sk_live_")
    ? "LIVE"
    : key.startsWith("sk_test_")
      ? "TEST/SANDBOX"
      : key
        ? "UNRECOGNISED PREFIX"
        : "NOT SET";

  console.log(`\n=== Stripe key ===`);
  console.log(`  mode: ${mode}   (length ${key.length}, value never printed)`);
  if (mode === "TEST/SANDBOX") {
    console.log(`  >>> This is a TEST key. If myeasypass.net is taking real payments,`);
    console.log(`  >>> this alone explains a failing checkout.`);
  }
  if (mode === "NOT SET") {
    console.log(`  >>> STRIPE_SECRET_KEY is missing. Checkout cannot work.`);
    return;
  }

  const stripe = await getCachedStripeClient();

  const account = await stripe.accounts.retrieve();
  console.log(`\n=== Account ===`);
  console.log(`  id: ${account.id}`);
  console.log(`  charges enabled: ${account.charges_enabled}`);
  if (!account.charges_enabled) {
    console.log(`  >>> Charges are DISABLED on this account. Checkout will fail.`);
  }

  // One specific price, if the caller named one.
  const target = process.argv[2];
  if (target) {
    console.log(`\n=== Price ${target} ===`);
    try {
      const price = await stripe.prices.retrieve(target, { expand: ["product"] });
      const verdict = isSellable(price as never);
      console.log(`  amount:    ${money(price.unit_amount, price.currency)}`);
      console.log(`  interval:  ${price.recurring?.interval ?? "one-off"}`);
      console.log(`  active:    ${price.active}`);
      console.log(`  metadata:  ${JSON.stringify(price.metadata ?? {})}`);
      console.log(`  SELLABLE:  ${verdict.ok ? "YES" : "NO"} - ${verdict.why}`);
    } catch (err) {
      const e = err as { code?: string; message?: string };
      console.log(`  LOOKUP FAILED: ${e.code ?? "?"} - ${e.message ?? String(err)}`);
      console.log(`  >>> A price id that does not exist in THIS account usually means`);
      console.log(`  >>> the site is pointed at a different account than the one that`);
      console.log(`  >>> created the price (test vs live is the common case).`);
    }
    return;
  }

  console.log(`\n=== Prices visible to this key ===`);
  const prices = await stripe.prices.list({ limit: 100, expand: ["data.product"] });

  if (prices.data.length === 0) {
    console.log(`  NONE. This key can see no prices at all - almost certainly the`);
    console.log(`  wrong account or wrong mode.`);
    return;
  }

  const rows = prices.data.map((p) => {
    const product = (p.product ?? {}) as { name?: string };
    const verdict = isSellable(p as never);
    return {
      id: p.id,
      product: (product.name ?? "?").slice(0, 34),
      amount: money(p.unit_amount, p.currency),
      interval: p.recurring?.interval ?? "one-off",
      active: p.active,
      sellable: verdict.ok,
      why: verdict.why,
    };
  });

  const sellable = rows.filter((r) => r.sellable);

  for (const r of rows.sort((a, b) => Number(b.sellable) - Number(a.sellable))) {
    console.log(
      `  ${r.sellable ? "OK  " : "BAD "} ${r.amount.padEnd(11)} ${r.interval.padEnd(8)} ` +
      `${r.product.padEnd(35)} ${r.id}`,
    );
    if (!r.sellable) console.log(`       reason: ${r.why}`);
  }

  console.log(`\n=== Summary ===`);
  console.log(`  ${prices.data.length} prices, ${sellable.length} sellable at checkout`);

  if (sellable.length === 0) {
    console.log(`  >>> NOTHING is sellable. Every checkout attempt will fail.`);
  }

  // The $35 repricing is the change most likely to have caused this.
  const at3500 = sellable.filter((r) => r.amount.startsWith("35.00"));
  console.log(`  ${at3500.length} sellable prices at $35.00`);
  if (at3500.length < 4) {
    console.log(`  >>> Fewer than four $35 prices are sellable. If the pricing page`);
    console.log(`  >>> is offering a category whose $35 price is missing or archived,`);
    console.log(`  >>> that category's Subscribe button will fail.`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("\n[diagnose] failed:", err);
    process.exit(1);
  });
