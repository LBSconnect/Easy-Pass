import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('../storage', () => ({
  storage: {
    getAllUsers: vi.fn(),
    updateProfile: vi.fn(),
  },
}));

vi.mock('../stripeClient', () => ({
  getCachedStripeClient: vi.fn(),
}));

vi.mock('../webhookHandlers', () => ({
  updateSubscriptionByCustomerId: vi.fn(),
}));

import { reconcileAllSubscriptions } from '../subscriptionReconciliation';
import { storage } from '../storage';
import { getCachedStripeClient } from '../stripeClient';
import { updateSubscriptionByCustomerId } from '../webhookHandlers';

const mockStorage = vi.mocked(storage);
const mockGetStripeClient = vi.mocked(getCachedStripeClient);
const mockUpdateSubscriptionByCustomerId = vi.mocked(updateSubscriptionByCustomerId);

describe('reconcileAllSubscriptions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('skips users with no stripeCustomerId', async () => {
    mockStorage.getAllUsers.mockResolvedValue([
      { id: 'user_1', email: 'a@test.com', profile: { stripeCustomerId: null } },
    ] as any);
    mockGetStripeClient.mockResolvedValue({ subscriptions: { list: vi.fn() } } as any);

    const summary = await reconcileAllSubscriptions();

    expect(summary).toEqual({ checked: 0, updated: 0, skipped: 1, errors: 0 });
  });

  it('skips comp/manual grants (active status with no stripeSubscriptionId)', async () => {
    mockStorage.getAllUsers.mockResolvedValue([
      {
        id: 'user_2',
        email: 'comp@test.com',
        profile: { stripeCustomerId: 'cus_comp', subscriptionStatus: 'active', stripeSubscriptionId: null },
      },
    ] as any);
    const listMock = vi.fn();
    mockGetStripeClient.mockResolvedValue({ subscriptions: { list: listMock } } as any);

    const summary = await reconcileAllSubscriptions();

    expect(listMock).not.toHaveBeenCalled();
    expect(summary).toEqual({ checked: 0, updated: 0, skipped: 1, errors: 0 });
  });

  it('updates a user whose Stripe subscription is active', async () => {
    mockStorage.getAllUsers.mockResolvedValue([
      {
        id: 'user_3',
        email: 'active@test.com',
        profile: { stripeCustomerId: 'cus_active', subscriptionStatus: 'active', stripeSubscriptionId: 'sub_old' },
      },
    ] as any);
    const activeSub = { id: 'sub_new', status: 'active' };
    mockGetStripeClient.mockResolvedValue({
      subscriptions: { list: vi.fn().mockResolvedValue({ data: [activeSub] }) },
    } as any);

    const summary = await reconcileAllSubscriptions();

    expect(mockUpdateSubscriptionByCustomerId).toHaveBeenCalledWith('cus_active', activeSub);
    expect(summary).toEqual({ checked: 1, updated: 1, skipped: 0, errors: 0 });
  });

  it('downgrades a user whose Stripe subscription is gone', async () => {
    mockStorage.getAllUsers.mockResolvedValue([
      {
        id: 'user_4',
        email: 'gone@test.com',
        profile: { stripeCustomerId: 'cus_gone', subscriptionStatus: 'active', stripeSubscriptionId: 'sub_gone' },
      },
    ] as any);
    mockGetStripeClient.mockResolvedValue({
      subscriptions: { list: vi.fn().mockResolvedValue({ data: [] }) },
    } as any);
    mockStorage.updateProfile.mockResolvedValue({} as any);

    const summary = await reconcileAllSubscriptions();

    expect(mockStorage.updateProfile).toHaveBeenCalledWith('user_4', {
      subscriptionStatus: 'canceled',
      allowedCategories: undefined,
    });
    expect(summary).toEqual({ checked: 1, updated: 1, skipped: 0, errors: 0 });
  });

  it('does not re-write a user who is already canceled with no subscription', async () => {
    mockStorage.getAllUsers.mockResolvedValue([
      {
        id: 'user_5',
        email: 'already-canceled@test.com',
        profile: { stripeCustomerId: 'cus_5', subscriptionStatus: 'canceled', stripeSubscriptionId: 'sub_5' },
      },
    ] as any);
    mockGetStripeClient.mockResolvedValue({
      subscriptions: { list: vi.fn().mockResolvedValue({ data: [] }) },
    } as any);

    const summary = await reconcileAllSubscriptions();

    expect(mockStorage.updateProfile).not.toHaveBeenCalled();
    expect(summary).toEqual({ checked: 1, updated: 0, skipped: 0, errors: 0 });
  });

  it('records an error for one user without aborting the rest of the batch', async () => {
    mockStorage.getAllUsers.mockResolvedValue([
      {
        id: 'user_err',
        email: 'err@test.com',
        profile: { stripeCustomerId: 'cus_err', subscriptionStatus: 'active', stripeSubscriptionId: 'sub_err' },
      },
      {
        id: 'user_ok',
        email: 'ok@test.com',
        profile: { stripeCustomerId: 'cus_ok', subscriptionStatus: 'active', stripeSubscriptionId: 'sub_ok' },
      },
    ] as any);
    const okSub = { id: 'sub_ok_new', status: 'active' };
    const listMock = vi.fn()
      .mockRejectedValueOnce(new Error('Stripe API error'))
      .mockResolvedValueOnce({ data: [okSub] });
    mockGetStripeClient.mockResolvedValue({ subscriptions: { list: listMock } } as any);

    const summary = await reconcileAllSubscriptions();

    expect(summary).toEqual({ checked: 2, updated: 1, skipped: 0, errors: 1 });
  });
});
