/**
 * The two failure modes a real subscriber surfaced, fixed and pinned.
 *
 * 1. Revenue silently missing: recordPaymentHistory matched users only by
 *    profile.stripeCustomerId, so a payment whose profile link was missing
 *    was dropped with a 200 - Stripe never retried, and the money existed
 *    everywhere except the admin panel. The resolver now falls back to the
 *    subscription's stamped userId, then to the customer's email, and heals
 *    the profile link when a fallback matches.
 *
 * 2. No owner notice existed at all. It now rides the new-payment-row path,
 *    inheriting that path's idempotence, and is strictly best-effort.
 *
 * All through WebhookHandlers.processWebhook with a real invoice.paid
 * payload, mocked storage/provider - the same harness the existing webhook
 * tests use.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../storage', () => ({
  storage: {
    getProfile: vi.fn(),
    updateProfile: vi.fn(),
    getAllUsers: vi.fn(),
    createPaymentHistory: vi.fn(),
    getPaymentByStripeId: vi.fn(),
  },
}));

vi.mock('../stripeClient', () => ({
  getCachedStripeClient: vi.fn(),
}));

vi.mock('../resendClient', () => ({
  getResendClient: vi.fn(),
}));

import { WebhookHandlers } from '../webhookHandlers';
import { storage } from '../storage';
import { getCachedStripeClient } from '../stripeClient';
import { getResendClient } from '../resendClient';

const mockStorage = vi.mocked(storage);
const mockGetStripeClient = vi.mocked(getCachedStripeClient);
const mockGetResendClient = vi.mocked(getResendClient);

const USER = { id: 'user-1', email: 'Student@Example.com', profile: { stripeCustomerId: 'cus_linked' } };
const UNLINKED_USER = { id: 'user-2', email: 'new.subscriber@example.com', profile: { stripeCustomerId: null } };

const SUBSCRIPTION = {
  id: 'sub_1',
  status: 'active',
  metadata: {},
  items: {
    data: [{
      price: {
        recurring: { interval: 'week' },
        metadata: { subscription_type: 'single', allowed_categories: 'life_insurance' },
      },
    }],
  },
};

function invoicePaidEvent(overrides: {
  customer?: string;
  subscriptionMeta?: Record<string, string>;
} = {}) {
  return Buffer.from(JSON.stringify({
    type: 'invoice.paid',
    data: {
      object: {
        id: 'in_1',
        customer: overrides.customer ?? 'cus_new',
        subscription: 'sub_1',
        payment_intent: 'pi_1',
        amount_paid: 3999,
        currency: 'usd',
      },
    },
  }));
}

/**
 * The invoice shape production actually receives on current Stripe API
 * versions - modeled on the real event that surfaced the bug: NO top-level
 * `subscription`, NO top-level `payment_intent`; the subscription id and the
 * checkout-stamped userId live under `parent.subscription_details`, with a
 * per-line copy under `lines.data[].parent.subscription_item_details`.
 */
function newShapeInvoicePaidEvent(overrides: { customer?: string } = {}) {
  return Buffer.from(JSON.stringify({
    type: 'invoice.paid',
    data: {
      object: {
        id: 'in_newshape_1',
        customer: overrides.customer ?? 'cus_new',
        amount_paid: 3500,
        currency: 'usd',
        billing_reason: 'subscription_create',
        status: 'paid',
        parent: {
          type: 'subscription_details',
          subscription_details: {
            metadata: { userId: 'user-1' },
            subscription: 'sub_1',
          },
        },
        lines: {
          data: [{
            metadata: { userId: 'user-1' },
            parent: {
              type: 'subscription_item_details',
              subscription_item_details: { subscription: 'sub_1' },
            },
          }],
        },
      },
    },
  }));
}

function stripeMock(customerEmail: string | null = null, subscriptionMeta: Record<string, string> = {}) {
  return {
    subscriptions: {
      retrieve: vi.fn().mockResolvedValue({ ...SUBSCRIPTION, metadata: subscriptionMeta }),
    },
    customers: {
      retrieve: vi.fn().mockResolvedValue(
        customerEmail === null ? { deleted: true } : { id: 'cus_new', email: customerEmail },
      ),
    },
  } as any;
}

function emailMock() {
  const send = vi.fn().mockResolvedValue({ data: { id: 'email-1' } });
  mockGetResendClient.mockResolvedValue({
    client: { emails: { send } },
    fromEmail: 'MyEasyPass <noreply@myeasypass.net>',
  } as any);
  return send;
}

describe('subscription revenue recording and owner notice', () => {
  const originalEnv = process.env.NODE_ENV;

  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.STRIPE_WEBHOOK_SECRET;
    process.env.NODE_ENV = 'development';
    process.env.ADMIN_EMAIL = 'owner@example.com';
    mockStorage.getPaymentByStripeId.mockResolvedValue(undefined as any);
    mockStorage.updateProfile.mockResolvedValue({} as any);
    mockStorage.createPaymentHistory.mockResolvedValue({} as any);
  });

  afterEach(() => {
    process.env.NODE_ENV = originalEnv;
    delete process.env.ADMIN_EMAIL;
  });

  it('records the payment and sends the owner notice on the normal customer-id match', async () => {
    mockStorage.getAllUsers.mockResolvedValue([{ ...USER, profile: { stripeCustomerId: 'cus_new' } }] as any);
    mockGetStripeClient.mockResolvedValue(stripeMock());
    const send = emailMock();

    await WebhookHandlers.processWebhook(invoicePaidEvent(), 'sig');

    expect(mockStorage.createPaymentHistory).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1', amount: 3999, stripePaymentId: 'pi_1' }),
    );
    expect(send).toHaveBeenCalledTimes(1);
    const email = send.mock.calls[0][0];
    expect(email.to).toBe('owner@example.com');
    expect(email.subject).toContain('Student@Example.com');
    expect(email.subject).toContain('$39.99');
    expect(email.text).toContain('life_insurance');
  });

  it('falls back to the subscription\'s stamped userId and heals the profile link', async () => {
    // Nobody's profile carries this customer id - the exact shape of the
    // dropped-revenue bug. The subscription was stamped by our checkout.
    mockStorage.getAllUsers.mockResolvedValue([UNLINKED_USER] as any);
    mockGetStripeClient.mockResolvedValue(stripeMock(null, { userId: 'user-2' }));
    emailMock();

    await WebhookHandlers.processWebhook(invoicePaidEvent(), 'sig');

    expect(mockStorage.createPaymentHistory).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-2' }),
    );
    // Healed: the next webhook for this person matches directly.
    expect(mockStorage.updateProfile).toHaveBeenCalledWith(
      'user-2', expect.objectContaining({ stripeCustomerId: 'cus_new' }),
    );
  });

  it('falls back to the Stripe customer email, case-insensitively, and heals', async () => {
    mockStorage.getAllUsers.mockResolvedValue([UNLINKED_USER] as any);
    mockGetStripeClient.mockResolvedValue(stripeMock('NEW.SUBSCRIBER@example.com'));
    const send = emailMock();

    await WebhookHandlers.processWebhook(invoicePaidEvent(), 'sig');

    expect(mockStorage.createPaymentHistory).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-2' }),
    );
    expect(mockStorage.updateProfile).toHaveBeenCalledWith(
      'user-2', expect.objectContaining({ stripeCustomerId: 'cus_new' }),
    );
    expect(send).toHaveBeenCalledTimes(1);
  });

  it('records nothing when no path matches, and sends no notice', async () => {
    mockStorage.getAllUsers.mockResolvedValue([UNLINKED_USER] as any);
    mockGetStripeClient.mockResolvedValue(stripeMock('stranger@elsewhere.com'));
    const send = emailMock();

    await WebhookHandlers.processWebhook(invoicePaidEvent(), 'sig');

    expect(mockStorage.createPaymentHistory).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('still refuses a subscription stamped for a different user (foreign-product guard)', async () => {
    mockStorage.getAllUsers.mockResolvedValue([{ ...USER, profile: { stripeCustomerId: 'cus_new' } }] as any);
    mockGetStripeClient.mockResolvedValue(stripeMock(null, { userId: 'somebody-else' }));
    const send = emailMock();

    await WebhookHandlers.processWebhook(invoicePaidEvent(), 'sig');

    expect(mockStorage.createPaymentHistory).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('a redelivered webhook neither duplicates the payment nor re-sends the notice', async () => {
    mockStorage.getAllUsers.mockResolvedValue([{ ...USER, profile: { stripeCustomerId: 'cus_new' } }] as any);
    mockStorage.getPaymentByStripeId.mockResolvedValue({ id: 'existing' } as any);
    mockGetStripeClient.mockResolvedValue(stripeMock());
    const send = emailMock();

    await WebhookHandlers.processWebhook(invoicePaidEvent(), 'sig');

    expect(mockStorage.createPaymentHistory).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('a failing notice never fails the webhook - the payment stays recorded', async () => {
    mockStorage.getAllUsers.mockResolvedValue([{ ...USER, profile: { stripeCustomerId: 'cus_new' } }] as any);
    mockGetStripeClient.mockResolvedValue(stripeMock());
    mockGetResendClient.mockRejectedValue(new Error('provider down'));

    await expect(
      WebhookHandlers.processWebhook(invoicePaidEvent(), 'sig'),
    ).resolves.toBeUndefined();

    expect(mockStorage.createPaymentHistory).toHaveBeenCalledTimes(1);
  });

  it('with ADMIN_EMAIL unset the payment is recorded and the notice quietly skipped', async () => {
    delete process.env.ADMIN_EMAIL;
    mockStorage.getAllUsers.mockResolvedValue([{ ...USER, profile: { stripeCustomerId: 'cus_new' } }] as any);
    mockGetStripeClient.mockResolvedValue(stripeMock());
    const send = emailMock();

    await WebhookHandlers.processWebhook(invoicePaidEvent(), 'sig');

    expect(mockStorage.createPaymentHistory).toHaveBeenCalledTimes(1);
    expect(send).not.toHaveBeenCalled();
  });

  it('records revenue from the new invoice shape (subscription under parent.subscription_details)', async () => {
    // The production bug: this invoice has no top-level `subscription`, so the
    // old extraction saw "not a subscription" and dropped the revenue before
    // any user matching ran. It must record and notify like the old shape.
    mockStorage.getAllUsers.mockResolvedValue([{ ...USER, profile: { stripeCustomerId: 'cus_new' } }] as any);
    mockGetStripeClient.mockResolvedValue(stripeMock(null, { userId: 'user-1' }));
    const send = emailMock();

    await WebhookHandlers.processWebhook(newShapeInvoicePaidEvent(), 'sig');

    expect(mockStorage.createPaymentHistory).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-1',
        amount: 3500,
        stripeSubscriptionId: 'sub_1',
        // No top-level payment_intent on this shape: keyed on the invoice id.
        stripePaymentId: 'in_newshape_1',
      }),
    );
    expect(send).toHaveBeenCalledTimes(1);
    expect(send.mock.calls[0][0].subject).toContain('$35.00');
  });

  it('new shape still resolves via the stamped userId when no profile is linked', async () => {
    mockStorage.getAllUsers.mockResolvedValue([{ ...USER, profile: { stripeCustomerId: null } }] as any);
    mockGetStripeClient.mockResolvedValue(stripeMock(null, { userId: 'user-1' }));
    emailMock();

    await WebhookHandlers.processWebhook(newShapeInvoicePaidEvent(), 'sig');

    expect(mockStorage.createPaymentHistory).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-1' }),
    );
    expect(mockStorage.updateProfile).toHaveBeenCalledWith(
      'user-1', expect.objectContaining({ stripeCustomerId: 'cus_new' }),
    );
  });

  it('an invoice with no subscription in either shape is still not counted', async () => {
    mockStorage.getAllUsers.mockResolvedValue([{ ...USER, profile: { stripeCustomerId: 'cus_new' } }] as any);
    mockGetStripeClient.mockResolvedValue(stripeMock());
    const send = emailMock();

    await WebhookHandlers.processWebhook(Buffer.from(JSON.stringify({
      type: 'invoice.paid',
      data: {
        object: { id: 'in_oneoff', customer: 'cus_new', amount_paid: 1000, currency: 'usd' },
      },
    })), 'sig');

    expect(mockStorage.createPaymentHistory).not.toHaveBeenCalled();
    expect(send).not.toHaveBeenCalled();
  });

  it('a failed heal does not lose the payment', async () => {
    mockStorage.getAllUsers.mockResolvedValue([UNLINKED_USER] as any);
    mockStorage.updateProfile.mockRejectedValue(new Error('no profile row'));
    mockGetStripeClient.mockResolvedValue(stripeMock(null, { userId: 'user-2' }));
    emailMock();

    await WebhookHandlers.processWebhook(invoicePaidEvent(), 'sig');

    expect(mockStorage.createPaymentHistory).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'user-2' }),
    );
  });
});
