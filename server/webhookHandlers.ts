import { getCachedStripeClient } from './stripeClient';
import { storage } from './storage';
import Stripe from 'stripe';
import { mapStripeStatus, getPlanFromSubscription } from './stripeHelpers';
import { sendNewSubscriberNotice } from './ownerNotifications';

function getWebhookSecret(): string | null {
  return process.env.STRIPE_WEBHOOK_SECRET || null;
}

export class WebhookHandlers {
  static async processWebhook(payload: Buffer, signature: string): Promise<void> {
    if (!Buffer.isBuffer(payload)) {
      throw new Error(
        'STRIPE WEBHOOK ERROR: Payload must be a Buffer. ' +
        'Received type: ' + typeof payload + '. ' +
        'This usually means express.json() parsed the body before reaching this handler. ' +
        'FIX: Ensure webhook route is registered BEFORE app.use(express.json()).'
      );
    }

    const stripe = await getCachedStripeClient();
    let event: Stripe.Event;

    const secret = getWebhookSecret();

    if (secret) {
      try {
        event = stripe.webhooks.constructEvent(payload, signature, secret);
      } catch (err: any) {
        console.error("Webhook signature verification failed:", err.message);
        throw new Error(`Webhook signature verification failed: ${err.message}`);
      }
    } else {
      console.log("No webhook secret available, parsing event without verification (development only)");
      const isProduction = process.env.NODE_ENV === "production";
      if (isProduction) {
        throw new Error("Webhook secret required in production");
      }
      event = JSON.parse(payload.toString()) as Stripe.Event;
    }

    console.log(`Processing Stripe webhook event: ${event.type}`);

    switch (event.type) {
      case 'checkout.session.completed':
        await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
        break;
      case 'customer.subscription.created':
      case 'customer.subscription.updated':
        await handleSubscriptionUpdated(event.data.object as Stripe.Subscription);
        break;
      case 'customer.subscription.deleted':
        await handleSubscriptionDeleted(event.data.object as Stripe.Subscription);
        break;
      case 'invoice.paid':
        await handleInvoicePaid(event.data.object as Stripe.Invoice);
        break;
      case 'invoice.payment_failed':
        await handleInvoicePaymentFailed(event.data.object as Stripe.Invoice);
        break;
      default:
        console.log(`Unhandled event type: ${event.type}`);
    }
  }
}

async function handleCheckoutCompleted(session: Stripe.Checkout.Session): Promise<void> {
  console.log("Checkout session completed:", session.id);

  const userId = session.metadata?.userId;
  if (!userId) {
    console.error("No userId in checkout session metadata");
    return;
  }

  if (session.subscription) {
    const stripe = await getCachedStripeClient();
    const subscription = await stripe.subscriptions.retrieve(session.subscription as string);
    await updateUserSubscription(userId, subscription);
  }
}

async function handleSubscriptionUpdated(subscription: Stripe.Subscription): Promise<void> {
  console.log("Subscription updated:", subscription.id, subscription.status);

  const userId = subscription.metadata?.userId;
  if (!userId) {
    const customerId = subscription.customer as string;
    await updateSubscriptionByCustomerId(customerId, subscription);
    return;
  }

  await updateUserSubscription(userId, subscription);
}

async function handleSubscriptionDeleted(subscription: Stripe.Subscription): Promise<void> {
  console.log("Subscription deleted:", subscription.id);

  const customerId = subscription.customer as string;
  await updateSubscriptionByCustomerId(customerId, {
    ...subscription,
    status: 'canceled',
  });
}

/**
 * The subscription an invoice bills, across Stripe API shapes.
 *
 * Older API versions put it at `invoice.subscription`. Newer versions (the
 * shape production actually receives today) removed that field and nest it at
 * `invoice.parent.subscription_details.subscription`, with a per-line copy at
 * `line.parent.subscription_item_details.subscription`. Reading only the old
 * location made every new-shape subscription invoice look like a one-off
 * payment, which recordPaymentHistory rightly refuses to count - so real
 * revenue was dropped before any user matching ran.
 */
function subscriptionIdFromInvoice(invoice: Stripe.Invoice): string | null {
  const candidates: unknown[] = [
    (invoice as any).subscription,
    (invoice as any).parent?.subscription_details?.subscription,
    ...(((invoice as any).lines?.data ?? []) as any[]).map(
      (line) => line?.parent?.subscription_item_details?.subscription ?? line?.subscription,
    ),
  ];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate) return candidate;
    // Expanded form: the whole subscription object instead of its id.
    if (candidate && typeof candidate === "object" && typeof (candidate as any).id === "string") {
      return (candidate as any).id;
    }
  }
  return null;
}

async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  console.log("Invoice paid:", invoice.id);

  const customerId = invoice.customer as string;
  const subscriptionId = subscriptionIdFromInvoice(invoice);

  let subscription: Stripe.Subscription | null = null;
  if (subscriptionId) {
    const stripe = await getCachedStripeClient();
    subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await updateSubscriptionByCustomerId(customerId, subscription);
  }

  await recordPaymentHistory(invoice, customerId, subscriptionId, subscription);
}

/**
 * Record a successful payment, if it is one of this site's subscriptions.
 *
 * WHAT THIS TABLE IS FOR
 *
 * payment_history is the only source of the admin Total Revenue figure (see
 * getAdminStats). That figure is read as "what this site earned", so what gets
 * written here is the definition of that claim - a filter added later on the
 * read side cannot recover information the write side threw away.
 *
 * WHAT COUNTS
 *
 * Two things, both checked here rather than assumed:
 *
 * The invoice must be for a subscription. This app only ever creates
 * `mode: "subscription"` checkouts against recurring prices, so a one-off
 * invoice on this Stripe account did not come from this site.
 *
 * The subscription must be this site's. Checkout stamps `metadata.userId` on
 * every subscription it creates, so a subscription naming a different user
 * than the one the customer id resolves to belongs to something else on the
 * same Stripe account and is not this site's income. Missing metadata is not
 * treated as a mismatch: subscriptions created before checkout stamped it are
 * genuine, and the customer match already ties them to a user here.
 *
 * IDEMPOTENCE
 *
 * Keyed on Stripe's own payment identifier, so a redelivered invoice.paid
 * webhook (Stripe retries on any non-2xx or timeout) never doubles a payment.
 */
async function recordPaymentHistory(
  invoice: Stripe.Invoice,
  customerId: string,
  subscriptionId: string | null,
  subscription: Stripe.Subscription | null,
): Promise<void> {
  const stripePaymentId = ((invoice as any).payment_intent as string) || invoice.id;
  if (!stripePaymentId) {
    console.error("Invoice has no id/payment_intent to key payment history on:", invoice.id);
    return;
  }

  if (!subscriptionId) {
    // Not an error - just not this site's revenue. Logged at info so an
    // operator wondering why a payment is missing from the total can see why.
    console.log(
      `Invoice ${invoice.id} is not for a subscription; not counted as site revenue`,
    );
    return;
  }

  const resolved = await resolveUserForPayment(customerId, subscription);
  if (!resolved) {
    console.error(
      `No user found for payment history (customer ${customerId}, ` +
      `subscription ${subscriptionId}); tried customer id, subscription ` +
      `metadata, and customer email`,
    );
    return;
  }
  const user = resolved.user;

  // The foreign-product guard, unchanged in meaning: a subscription stamped
  // for a DIFFERENT user than the one the customer resolves to is not this
  // site's income. (A metadata match IS the stamp, so it passes trivially.)
  const stampedUserId = subscription?.metadata?.userId;
  if (stampedUserId && stampedUserId !== user.id) {
    console.error(
      `Subscription ${subscriptionId} is stamped for user ${stampedUserId} but ` +
      `customer ${customerId} resolves to ${user.id}; not counted as site revenue`,
    );
    return;
  }

  const existing = await storage.getPaymentByStripeId(stripePaymentId);
  if (existing) {
    console.log(`Payment ${stripePaymentId} already recorded, skipping duplicate (idempotent webhook redelivery)`);
    return;
  }

  await storage.createPaymentHistory({
    userId: user.id,
    stripePaymentId,
    stripeSubscriptionId: subscriptionId,
    amount: invoice.amount_paid ?? 0,
    currency: invoice.currency || "usd",
    status: "succeeded",
    description: invoice.description || undefined,
  });

  console.log(`Recorded payment history for user ${user.id}: ${invoice.amount_paid} ${invoice.currency}`);

  // The owner's notice rides on the NEW-row path only, so webhook redelivery
  // (which returns above at the duplicate check) can never repeat it. And it
  // is strictly best-effort: a failed courtesy email must not fail the
  // webhook - a non-2xx would make Stripe retry an already-recorded invoice.
  try {
    const meta = subscription
      ? await getSubscriptionMetadata(subscription)
      : { subscriptionType: undefined, allowedCategories: undefined };
    await sendNewSubscriberNotice({
      subscriberEmail: user.email ?? "(no email on file)",
      amountCents: invoice.amount_paid ?? 0,
      currency: invoice.currency || "usd",
      plan: subscription ? getPlanFromSubscription(subscription) : undefined,
      subscriptionType: meta.subscriptionType,
      categories: meta.allowedCategories,
      matchedBy: resolved.matchedBy,
    });
  } catch (error) {
    console.error("New-subscriber notice failed (payment recorded fine):", error);
  }
}

/** How a payment was tied to a user account. */
export type PaymentUserMatch = "customer_id" | "subscription_metadata" | "customer_email";

/**
 * Resolve which of this site's users a Stripe payment belongs to.
 *
 * WHY THREE PATHS
 *
 * The original lookup matched only `profile.stripeCustomerId`, which made the
 * revenue record silently drop any genuine payment whose profile link was
 * missing - a webhook race at first checkout, a customer created under a
 * different email, a profile edit. The invoice returned 200, so Stripe never
 * retried, and the money existed everywhere except the admin panel.
 *
 * So the match now tries, in order of strength:
 *
 *   1. The stored customer link (`profile.stripeCustomerId`) - the normal case.
 *   2. The user id this site's own checkout stamped onto the subscription
 *      (`metadata.userId`) - authoritative, because we wrote it.
 *   3. The Stripe customer's email against the user table - the human-level
 *      link, case-insensitive.
 *
 * A fallback match HEALS the profile by storing the customer id, so the next
 * webhook for the same person matches on path 1. Failure to heal is logged
 * and swallowed - recording the payment matters more than the repair.
 */
export async function resolveUserForPayment(
  customerId: string,
  subscription: Stripe.Subscription | null,
): Promise<{ user: { id: string; email: string | null }; matchedBy: PaymentUserMatch } | null> {
  const allUsers = await storage.getAllUsers();

  const byCustomer = allUsers.find((u) => u.profile?.stripeCustomerId === customerId);
  if (byCustomer) return { user: byCustomer, matchedBy: "customer_id" };

  const stampedUserId = subscription?.metadata?.userId;
  if (stampedUserId) {
    const stamped = allUsers.find((u) => u.id === stampedUserId);
    if (stamped) {
      await healCustomerLink(stamped.id, customerId, "subscription metadata");
      return { user: stamped, matchedBy: "subscription_metadata" };
    }
  }

  try {
    const stripe = await getCachedStripeClient();
    const customer = await stripe.customers.retrieve(customerId);
    const email = customer.deleted ? null : (customer as Stripe.Customer).email;
    if (email) {
      const needle = email.toLowerCase();
      const byEmail = allUsers.find((u) => u.email?.toLowerCase() === needle);
      if (byEmail) {
        await healCustomerLink(byEmail.id, customerId, "customer email");
        return { user: byEmail, matchedBy: "customer_email" };
      }
    }
  } catch (error) {
    console.error("Could not retrieve Stripe customer while resolving payment:", error);
  }

  return null;
}

async function healCustomerLink(userId: string, customerId: string, via: string): Promise<void> {
  try {
    await storage.updateProfile(userId, { stripeCustomerId: customerId });
    console.log(
      `Healed missing stripeCustomerId for user ${userId} (matched via ${via}); ` +
      `future webhooks will match directly`,
    );
  } catch (error) {
    console.error(`Could not heal stripeCustomerId for user ${userId}:`, error);
  }
}

async function handleInvoicePaymentFailed(invoice: Stripe.Invoice): Promise<void> {
  console.log("Invoice payment failed:", invoice.id);

  const customerId = invoice.customer as string;
  const allUsers = await storage.getAllUsers();
  const user = allUsers.find(u => u.profile?.stripeCustomerId === customerId);

  if (user?.profile) {
    await storage.updateProfile(user.id, {
      subscriptionStatus: 'past_due',
    });
    console.log(`Set user ${user.id} subscription to past_due`);
  }
}

async function updateUserSubscription(userId: string, subscription: Stripe.Subscription): Promise<void> {
  const plan = getPlanFromSubscription(subscription);
  const status = mapStripeStatus(subscription.status);
  const periodEnd = (subscription as any).current_period_end;
  const endDate = periodEnd 
    ? new Date(periodEnd * 1000) 
    : undefined;

  const { subscriptionType, allowedCategories } = await getSubscriptionMetadata(subscription);

  await storage.updateProfile(userId, {
    stripeSubscriptionId: subscription.id,
    subscriptionStatus: status,
    subscriptionPlan: plan,
    subscriptionType: subscriptionType,
    allowedCategories: allowedCategories,
    subscriptionEndDate: endDate,
  });

  console.log(`Updated user ${userId} subscription: ${status}, plan: ${plan}, type: ${subscriptionType}, categories: ${allowedCategories?.join(',')}`);
}

export async function updateSubscriptionByCustomerId(customerId: string, subscription: Stripe.Subscription): Promise<void> {
  const allUsers = await storage.getAllUsers();
  const user = allUsers.find(u => u.profile?.stripeCustomerId === customerId);

  if (!user) {
    console.error("No user found with customerId:", customerId);
    return;
  }

  const plan = getPlanFromSubscription(subscription);
  const status = mapStripeStatus(subscription.status);
  const periodEnd = (subscription as any).current_period_end;
  const endDate = periodEnd 
    ? new Date(periodEnd * 1000) 
    : undefined;

  const { subscriptionType, allowedCategories } = await getSubscriptionMetadata(subscription);

  await storage.updateProfile(user.id, {
    stripeSubscriptionId: subscription.id,
    subscriptionStatus: status,
    subscriptionPlan: plan,
    subscriptionType: subscriptionType,
    allowedCategories: allowedCategories,
    subscriptionEndDate: endDate,
  });

  console.log(`Updated user ${user.id} (customer ${customerId}) subscription: ${status}, plan: ${plan}, type: ${subscriptionType}, categories: ${allowedCategories?.join(',')}`);
}

// mapStripeStatus and getPlanFromSubscription are imported from ./stripeHelpers

// Helper to read a Stripe metadata field, handling trailing-space key bugs
function getMetaField(meta: Record<string, string> | null | undefined, key: string): string | undefined {
  if (!meta) return undefined;
  if (meta[key] !== undefined) return meta[key];
  const found = Object.keys(meta).find(k => k.trim() === key);
  return found ? meta[found] : undefined;
}

// Infer exam category from Stripe product name when allowed_categories metadata is missing
function inferCategoryFromProductName(productName: string): string[] | undefined {
  const pname = productName.toLowerCase();
  if (pname.includes('real estate') && !pname.includes('bundle')) return ['real_estate'];
  if (pname.includes('property') && pname.includes('casualty')) return ['property_casualty'];
  if (pname.includes('life insurance')) return ['life_insurance'];
  if (pname.includes('general lines')) return ['general_lines'];
  return undefined;
}

async function getSubscriptionMetadata(subscription: Stripe.Subscription): Promise<{
  subscriptionType: 'single' | 'bundle' | undefined;
  allowedCategories: string[] | undefined;
}> {
  const item = subscription.items?.data?.[0];
  if (!item) return { subscriptionType: undefined, allowedCategories: undefined };

  const priceMetadata = item.price?.metadata || {};

  // First check price metadata (with trailing-space key fallback)
  let subscriptionType = getMetaField(priceMetadata, 'subscription_type') as 'single' | 'bundle' | undefined;
  let allowedCategoriesStr = getMetaField(priceMetadata, 'allowed_categories');

  let productName: string | undefined;

  // If not found in price, check product metadata
  if (!subscriptionType || !allowedCategoriesStr) {
    try {
      const stripe = await getCachedStripeClient();
      const productId = typeof item.price?.product === 'string'
        ? item.price.product
        : item.price?.product?.id;

      if (productId) {
        const product = await stripe.products.retrieve(productId);
        productName = product.name;
        if (!subscriptionType) {
          subscriptionType = getMetaField(product.metadata, 'subscription_type') as 'single' | 'bundle' | undefined;
        }
        if (!allowedCategoriesStr) {
          allowedCategoriesStr = getMetaField(product.metadata, 'allowed_categories');
        }
      }
    } catch (error) {
      console.log("Could not fetch product metadata:", error);
    }
  }

  let allowedCategories = allowedCategoriesStr
    ? allowedCategoriesStr.split(',').map(c => c.trim())
    : undefined;

  // Fallback: infer category from product name when allowed_categories metadata is missing
  if (!allowedCategories && subscriptionType === 'single' && productName) {
    allowedCategories = inferCategoryFromProductName(productName);
  }

  return { subscriptionType, allowedCategories };
}
