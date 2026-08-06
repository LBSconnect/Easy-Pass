import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock the storage module before importing webhookHandlers
vi.mock('../storage', () => ({
  storage: {
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    getAllUsers: vi.fn(),
    createPaymentHistory: vi.fn(),
    getPaymentByStripeId: vi.fn(),
  },
}));

// Mock the stripeClient module
vi.mock('../stripeClient', () => ({
  getCachedStripeClient: vi.fn(),
}));

// Now import after mocks are set up
import { WebhookHandlers } from '../webhookHandlers';
import { storage } from '../storage';
import { getCachedStripeClient } from '../stripeClient';

const mockStorage = vi.mocked(storage);
const mockGetStripeClient = vi.mocked(getCachedStripeClient);

describe('WebhookHandlers.processWebhook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.STRIPE_WEBHOOK_SECRET;
  });

  it('throws if payload is not a Buffer', async () => {
    await expect(
      WebhookHandlers.processWebhook('not-a-buffer' as any, 'sig')
    ).rejects.toThrow('Payload must be a Buffer');
  });

  it('throws in production if no webhook secret available', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'production';

    mockGetStripeClient.mockResolvedValue({
      webhooks: {
        constructEvent: vi.fn(),
      },
    } as any);

    const payload = Buffer.from(JSON.stringify({ type: 'test', data: { object: {} } }));

    await expect(
      WebhookHandlers.processWebhook(payload, 'sig')
    ).rejects.toThrow('Webhook secret required in production');

    process.env.NODE_ENV = originalEnv;
  });

  it('processes checkout.session.completed event', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const mockSubscription = {
      id: 'sub_123',
      status: 'active',
      items: {
        data: [{
          price: {
            recurring: { interval: 'month' },
            metadata: { subscription_type: 'single', allowed_categories: 'real_estate' },
            product: 'prod_123',
          },
        }],
      },
      current_period_end: Math.floor(Date.now() / 1000) + 86400,
      metadata: {},
    };

    mockGetStripeClient.mockResolvedValue({
      webhooks: { constructEvent: vi.fn() },
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue(mockSubscription),
      },
    } as any);

    mockStorage.updateProfile.mockResolvedValue({} as any);

    const event = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_123',
          subscription: 'sub_123',
          metadata: { userId: 'user_1' },
        },
      },
    };

    const payload = Buffer.from(JSON.stringify(event));
    await WebhookHandlers.processWebhook(payload, 'sig');

    expect(mockStorage.updateProfile).toHaveBeenCalledWith('user_1', expect.objectContaining({
      stripeSubscriptionId: 'sub_123',
      subscriptionStatus: 'active',
      subscriptionPlan: 'monthly',
    }));

    process.env.NODE_ENV = originalEnv;
  });

  it('processes customer.subscription.updated event with userId in metadata', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    mockGetStripeClient.mockResolvedValue({
      webhooks: { constructEvent: vi.fn() },
    } as any);

    mockStorage.updateProfile.mockResolvedValue({} as any);

    const event = {
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_456',
          status: 'trialing',
          customer: 'cus_abc',
          metadata: { userId: 'user_2' },
          items: {
            data: [{
              price: {
                recurring: { interval: 'week' },
                metadata: { subscription_type: 'bundle', allowed_categories: 'real_estate,life_insurance,property_casualty,general_lines' },
                product: 'prod_456',
              },
            }],
          },
          current_period_end: Math.floor(Date.now() / 1000) + 604800,
        },
      },
    };

    const payload = Buffer.from(JSON.stringify(event));
    await WebhookHandlers.processWebhook(payload, 'sig');

    expect(mockStorage.updateProfile).toHaveBeenCalledWith('user_2', expect.objectContaining({
      stripeSubscriptionId: 'sub_456',
      subscriptionStatus: 'trialing',
      subscriptionPlan: 'weekly',
      subscriptionType: 'bundle',
    }));

    process.env.NODE_ENV = originalEnv;
  });

  it('processes customer.subscription.updated by customer ID when no userId metadata', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    mockGetStripeClient.mockResolvedValue({
      webhooks: { constructEvent: vi.fn() },
    } as any);

    mockStorage.getAllUsers.mockResolvedValue([
      { id: 'user_3', email: 'test@test.com', profile: { stripeCustomerId: 'cus_xyz' } },
      { id: 'user_4', email: 'other@test.com', profile: { stripeCustomerId: 'cus_other' } },
    ] as any);
    mockStorage.updateProfile.mockResolvedValue({} as any);

    const event = {
      type: 'customer.subscription.updated',
      data: {
        object: {
          id: 'sub_789',
          status: 'active',
          customer: 'cus_xyz',
          metadata: {},
          items: {
            data: [{
              price: {
                recurring: { interval: 'month' },
                metadata: { subscription_type: 'single', allowed_categories: 'life_insurance' },
                product: 'prod_789',
              },
            }],
          },
          current_period_end: Math.floor(Date.now() / 1000) + 2592000,
        },
      },
    };

    const payload = Buffer.from(JSON.stringify(event));
    await WebhookHandlers.processWebhook(payload, 'sig');

    expect(mockStorage.getAllUsers).toHaveBeenCalled();
    expect(mockStorage.updateProfile).toHaveBeenCalledWith('user_3', expect.objectContaining({
      stripeSubscriptionId: 'sub_789',
      subscriptionStatus: 'active',
    }));

    process.env.NODE_ENV = originalEnv;
  });

  it('processes customer.subscription.deleted event', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    mockGetStripeClient.mockResolvedValue({
      webhooks: { constructEvent: vi.fn() },
    } as any);

    mockStorage.getAllUsers.mockResolvedValue([
      { id: 'user_5', email: 'del@test.com', profile: { stripeCustomerId: 'cus_del' } },
    ] as any);
    mockStorage.updateProfile.mockResolvedValue({} as any);

    const event = {
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_del',
          status: 'canceled',
          customer: 'cus_del',
          metadata: {},
          items: {
            data: [{
              price: {
                recurring: { interval: 'month' },
                metadata: {},
                product: 'prod_del',
              },
            }],
          },
        },
      },
    };

    const payload = Buffer.from(JSON.stringify(event));
    await WebhookHandlers.processWebhook(payload, 'sig');

    expect(mockStorage.updateProfile).toHaveBeenCalledWith('user_5', expect.objectContaining({
      subscriptionStatus: 'canceled',
    }));

    process.env.NODE_ENV = originalEnv;
  });

  it('processes invoice.payment_failed event and sets user to past_due', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    mockGetStripeClient.mockResolvedValue({
      webhooks: { constructEvent: vi.fn() },
    } as any);

    mockStorage.getAllUsers.mockResolvedValue([
      { id: 'user_6', email: 'fail@test.com', profile: { stripeCustomerId: 'cus_fail' } },
    ] as any);
    mockStorage.updateProfile.mockResolvedValue({} as any);

    const event = {
      type: 'invoice.payment_failed',
      data: {
        object: {
          id: 'inv_fail',
          customer: 'cus_fail',
          subscription: null,
        },
      },
    };

    const payload = Buffer.from(JSON.stringify(event));
    await WebhookHandlers.processWebhook(payload, 'sig');

    expect(mockStorage.updateProfile).toHaveBeenCalledWith('user_6', {
      subscriptionStatus: 'past_due',
    });

    process.env.NODE_ENV = originalEnv;
  });

  it('processes invoice.paid event with subscription', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const mockSubscription = {
      id: 'sub_inv',
      status: 'active',
      items: {
        data: [{
          price: {
            recurring: { interval: 'month' },
            metadata: { subscription_type: 'single', allowed_categories: 'general_lines' },
            product: 'prod_inv',
          },
        }],
      },
      current_period_end: Math.floor(Date.now() / 1000) + 2592000,
      metadata: {},
    };

    mockGetStripeClient.mockResolvedValue({
      webhooks: { constructEvent: vi.fn() },
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue(mockSubscription),
      },
    } as any);

    mockStorage.getAllUsers.mockResolvedValue([
      { id: 'user_7', email: 'paid@test.com', profile: { stripeCustomerId: 'cus_paid' } },
    ] as any);
    mockStorage.updateProfile.mockResolvedValue({} as any);
    mockStorage.getPaymentByStripeId.mockResolvedValue(undefined);
    mockStorage.createPaymentHistory.mockResolvedValue({} as any);

    const event = {
      type: 'invoice.paid',
      data: {
        object: {
          id: 'inv_paid',
          customer: 'cus_paid',
          subscription: 'sub_inv',
          payment_intent: 'pi_paid_123',
          amount_paid: 1999,
          currency: 'usd',
        },
      },
    };

    const payload = Buffer.from(JSON.stringify(event));
    await WebhookHandlers.processWebhook(payload, 'sig');

    expect(mockStorage.updateProfile).toHaveBeenCalledWith('user_7', expect.objectContaining({
      subscriptionStatus: 'active',
      subscriptionPlan: 'monthly',
    }));

    // Payment is recorded, keyed on Stripe's own payment identifier so a
    // redelivery of this same event won't double-insert.
    expect(mockStorage.getPaymentByStripeId).toHaveBeenCalledWith('pi_paid_123');
    expect(mockStorage.createPaymentHistory).toHaveBeenCalledWith({
      userId: 'user_7',
      stripePaymentId: 'pi_paid_123',
      amount: 1999,
      currency: 'usd',
      status: 'succeeded',
      description: undefined,
    });

    process.env.NODE_ENV = originalEnv;
  });

  it('does not double-record payment history on a redelivered invoice.paid event', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    const mockSubscription = {
      id: 'sub_inv2',
      status: 'active',
      items: {
        data: [{
          price: {
            recurring: { interval: 'month' },
            metadata: { subscription_type: 'single', allowed_categories: 'general_lines' },
            product: 'prod_inv2',
          },
        }],
      },
      current_period_end: Math.floor(Date.now() / 1000) + 2592000,
      metadata: {},
    };

    mockGetStripeClient.mockResolvedValue({
      webhooks: { constructEvent: vi.fn() },
      subscriptions: {
        retrieve: vi.fn().mockResolvedValue(mockSubscription),
      },
    } as any);

    mockStorage.getAllUsers.mockResolvedValue([
      { id: 'user_8', email: 'paid2@test.com', profile: { stripeCustomerId: 'cus_paid2' } },
    ] as any);
    mockStorage.updateProfile.mockResolvedValue({} as any);
    // Simulate this payment already having been recorded by a prior delivery
    // of the same webhook event.
    mockStorage.getPaymentByStripeId.mockResolvedValue({ id: 'existing-row' } as any);

    const event = {
      type: 'invoice.paid',
      data: {
        object: {
          id: 'inv_paid2',
          customer: 'cus_paid2',
          subscription: 'sub_inv2',
          payment_intent: 'pi_paid_456',
          amount_paid: 1999,
          currency: 'usd',
        },
      },
    };

    const payload = Buffer.from(JSON.stringify(event));
    await WebhookHandlers.processWebhook(payload, 'sig');

    expect(mockStorage.getPaymentByStripeId).toHaveBeenCalledWith('pi_paid_456');
    expect(mockStorage.createPaymentHistory).not.toHaveBeenCalled();

    process.env.NODE_ENV = originalEnv;
  });

  it('handles checkout.session.completed without userId gracefully', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    mockGetStripeClient.mockResolvedValue({
      webhooks: { constructEvent: vi.fn() },
    } as any);

    const event = {
      type: 'checkout.session.completed',
      data: {
        object: {
          id: 'cs_no_user',
          subscription: 'sub_no_user',
          metadata: {},
        },
      },
    };

    const payload = Buffer.from(JSON.stringify(event));
    // Should not throw -- just logs and returns
    await expect(WebhookHandlers.processWebhook(payload, 'sig')).resolves.not.toThrow();
    expect(mockStorage.updateProfile).not.toHaveBeenCalled();

    process.env.NODE_ENV = originalEnv;
  });

  it('handles subscription.deleted when no user found for customer ID', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    mockGetStripeClient.mockResolvedValue({
      webhooks: { constructEvent: vi.fn() },
    } as any);

    mockStorage.getAllUsers.mockResolvedValue([
      { id: 'user_x', email: 'x@test.com', profile: { stripeCustomerId: 'cus_different' } },
    ] as any);

    const event = {
      type: 'customer.subscription.deleted',
      data: {
        object: {
          id: 'sub_orphan',
          status: 'canceled',
          customer: 'cus_unknown',
          metadata: {},
          items: { data: [] },
        },
      },
    };

    const payload = Buffer.from(JSON.stringify(event));
    await expect(WebhookHandlers.processWebhook(payload, 'sig')).resolves.not.toThrow();
    expect(mockStorage.updateProfile).not.toHaveBeenCalled();

    process.env.NODE_ENV = originalEnv;
  });

  it('handles unrecognized event type gracefully', async () => {
    const originalEnv = process.env.NODE_ENV;
    process.env.NODE_ENV = 'development';

    mockGetStripeClient.mockResolvedValue({
      webhooks: { constructEvent: vi.fn() },
    } as any);

    const event = {
      type: 'some.future.event',
      data: { object: {} },
    };

    const payload = Buffer.from(JSON.stringify(event));
    await expect(WebhookHandlers.processWebhook(payload, 'sig')).resolves.not.toThrow();
    expect(mockStorage.updateProfile).not.toHaveBeenCalled();

    process.env.NODE_ENV = originalEnv;
  });
});
