import { describe, it, expect } from 'vitest';
import { mapStripeStatus, getPlanFromSubscription } from '../stripeHelpers';
import type Stripe from 'stripe';

describe('mapStripeStatus', () => {
  it('maps "active" to "active"', () => {
    expect(mapStripeStatus('active')).toBe('active');
  });

  it('maps "trialing" to "trialing"', () => {
    expect(mapStripeStatus('trialing')).toBe('trialing');
  });

  it('maps "past_due" to "past_due"', () => {
    expect(mapStripeStatus('past_due')).toBe('past_due');
  });

  it('maps "unpaid" to "past_due"', () => {
    expect(mapStripeStatus('unpaid')).toBe('past_due');
  });

  it('maps "canceled" to "canceled"', () => {
    expect(mapStripeStatus('canceled')).toBe('canceled');
  });

  it('maps "incomplete" to "canceled"', () => {
    expect(mapStripeStatus('incomplete')).toBe('canceled');
  });

  it('maps "incomplete_expired" to "canceled"', () => {
    expect(mapStripeStatus('incomplete_expired')).toBe('canceled');
  });

  it('maps "paused" to "canceled"', () => {
    expect(mapStripeStatus('paused')).toBe('canceled');
  });

  it('maps unknown status to "canceled" (default)', () => {
    expect(mapStripeStatus('some_future_status' as any)).toBe('canceled');
  });
});

describe('getPlanFromSubscription', () => {
  function makeSubscription(interval?: string): Stripe.Subscription {
    if (!interval) {
      return { items: { data: [] } } as any;
    }
    return {
      items: {
        data: [
          {
            price: {
              recurring: { interval },
            },
          },
        ],
      },
    } as any;
  }

  it('returns "weekly" for week interval', () => {
    expect(getPlanFromSubscription(makeSubscription('week'))).toBe('weekly');
  });

  it('returns "monthly" for month interval', () => {
    expect(getPlanFromSubscription(makeSubscription('month'))).toBe('monthly');
  });

  it('returns undefined for year interval', () => {
    expect(getPlanFromSubscription(makeSubscription('year'))).toBeUndefined();
  });

  it('returns undefined when no items', () => {
    expect(getPlanFromSubscription(makeSubscription())).toBeUndefined();
  });

  it('returns undefined when items.data is missing', () => {
    const sub = { items: undefined } as any;
    expect(getPlanFromSubscription(sub)).toBeUndefined();
  });
});
