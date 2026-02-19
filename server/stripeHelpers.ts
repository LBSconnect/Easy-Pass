import type Stripe from 'stripe';

export function mapStripeStatus(stripeStatus: Stripe.Subscription.Status): 'active' | 'canceled' | 'past_due' | 'trialing' {
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

export function getPlanFromSubscription(subscription: Stripe.Subscription): 'weekly' | 'monthly' | undefined {
  const item = subscription.items?.data?.[0];
  if (!item) return undefined;

  const interval = item.price?.recurring?.interval;
  if (interval === 'week') return 'weekly';
  if (interval === 'month') return 'monthly';
  return undefined;
}
