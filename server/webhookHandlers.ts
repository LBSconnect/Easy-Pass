import { getStripeSync, getCachedStripeClient } from './stripeClient';
import { storage } from './storage';
import Stripe from 'stripe';

let webhookSecret: string | null = null;

async function getWebhookSecret(): Promise<string | null> {
  if (webhookSecret) return webhookSecret;
  
  try {
    const sync = await getStripeSync();
    const webhook = await sync.getManagedWebhook();
    webhookSecret = webhook?.secret || null;
    return webhookSecret;
  } catch (error) {
    console.log("Could not get managed webhook secret");
    return null;
  }
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

    const secret = await getWebhookSecret();
    
    if (secret) {
      try {
        event = stripe.webhooks.constructEvent(payload, signature, secret);
      } catch (err: any) {
        console.error("Webhook signature verification failed:", err.message);
        throw new Error(`Webhook signature verification failed: ${err.message}`);
      }
    } else {
      console.log("No webhook secret available, parsing event without verification (development only)");
      if (process.env.NODE_ENV === "production") {
        throw new Error("Webhook secret required in production");
      }
      event = JSON.parse(payload.toString()) as Stripe.Event;
    }

    console.log(`Processing Stripe webhook event: ${event.type}`);

    try {
      const sync = await getStripeSync();
      await sync.processWebhook(payload, signature);
      console.log("StripeSync processed event successfully");
    } catch (error) {
      console.log("StripeSync processing skipped or failed, continuing with manual handling");
    }

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

async function handleInvoicePaid(invoice: Stripe.Invoice): Promise<void> {
  console.log("Invoice paid:", invoice.id);

  const customerId = invoice.customer as string;
  const subscriptionId = (invoice as any).subscription as string;

  if (subscriptionId) {
    const stripe = await getCachedStripeClient();
    const subscription = await stripe.subscriptions.retrieve(subscriptionId);
    await updateSubscriptionByCustomerId(customerId, subscription);
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

  const { subscriptionType, allowedCategories } = getSubscriptionMetadata(subscription);

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

async function updateSubscriptionByCustomerId(customerId: string, subscription: Stripe.Subscription): Promise<void> {
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

  const { subscriptionType, allowedCategories } = getSubscriptionMetadata(subscription);

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

function getPlanFromSubscription(subscription: Stripe.Subscription): 'weekly' | 'monthly' | undefined {
  const item = subscription.items?.data?.[0];
  if (!item) return undefined;

  const interval = item.price?.recurring?.interval;
  if (interval === 'week') return 'weekly';
  if (interval === 'month') return 'monthly';
  return undefined;
}

function mapStripeStatus(stripeStatus: Stripe.Subscription.Status): 'active' | 'canceled' | 'past_due' | 'trialing' {
  switch (stripeStatus) {
    case 'active':
      return 'active';
    case 'trialing':
      return 'trialing';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    case 'canceled':
    case 'incomplete':
    case 'incomplete_expired':
    case 'paused':
    default:
      return 'canceled';
  }
}

function getSubscriptionMetadata(subscription: Stripe.Subscription): { 
  subscriptionType: 'single' | 'bundle' | undefined; 
  allowedCategories: string[] | undefined; 
} {
  const item = subscription.items?.data?.[0];
  if (!item) return { subscriptionType: undefined, allowedCategories: undefined };

  const priceMetadata = item.price?.metadata;
  
  if (!priceMetadata) {
    return { subscriptionType: undefined, allowedCategories: undefined };
  }

  const subscriptionType = priceMetadata.subscription_type as 'single' | 'bundle' | undefined;
  const allowedCategoriesStr = priceMetadata.allowed_categories;
  const allowedCategories = allowedCategoriesStr 
    ? allowedCategoriesStr.split(',').map(c => c.trim()) 
    : undefined;

  return { subscriptionType, allowedCategories };
}
