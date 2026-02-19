import { describe, it, expect } from 'vitest';
import { checkSubscriptionActive, type SubscriptionProfile } from '../subscriptionCheck';

describe('checkSubscriptionActive', () => {
  it('returns inactive when profile is null', () => {
    const result = checkSubscriptionActive(null);
    expect(result.active).toBe(false);
    expect(result.message).toBe('Profile not found');
  });

  it('returns inactive when profile is undefined', () => {
    const result = checkSubscriptionActive(undefined);
    expect(result.active).toBe(false);
    expect(result.message).toBe('Profile not found');
  });

  it('allows admin regardless of subscription status', () => {
    const profile: SubscriptionProfile = {
      role: 'admin',
      subscriptionStatus: null,
      subscriptionEndDate: null,
      allowedCategories: null,
    };
    const result = checkSubscriptionActive(profile, 'real_estate');
    expect(result.active).toBe(true);
    expect(result.message).toBeUndefined();
  });

  it('denies when subscription status is canceled', () => {
    const profile: SubscriptionProfile = {
      role: 'user',
      subscriptionStatus: 'canceled',
      subscriptionEndDate: null,
      allowedCategories: ['real_estate'],
    };
    const result = checkSubscriptionActive(profile);
    expect(result.active).toBe(false);
    expect(result.message).toContain('Active subscription required');
  });

  it('denies when subscription status is null', () => {
    const profile: SubscriptionProfile = {
      role: 'user',
      subscriptionStatus: null,
      allowedCategories: ['real_estate'],
    };
    const result = checkSubscriptionActive(profile);
    expect(result.active).toBe(false);
  });

  it('denies when subscription status is past_due', () => {
    const profile: SubscriptionProfile = {
      role: 'user',
      subscriptionStatus: 'past_due',
      allowedCategories: ['real_estate'],
    };
    const result = checkSubscriptionActive(profile);
    expect(result.active).toBe(false);
  });

  it('allows active subscription without category check', () => {
    const profile: SubscriptionProfile = {
      role: 'user',
      subscriptionStatus: 'active',
      allowedCategories: ['real_estate'],
    };
    const result = checkSubscriptionActive(profile);
    expect(result.active).toBe(true);
  });

  it('allows trialing subscription', () => {
    const profile: SubscriptionProfile = {
      role: 'user',
      subscriptionStatus: 'trialing',
      allowedCategories: ['real_estate'],
    };
    const result = checkSubscriptionActive(profile);
    expect(result.active).toBe(true);
  });

  it('denies when subscription end date is in the past', () => {
    const yesterday = new Date(Date.now() - 86400000);
    const profile: SubscriptionProfile = {
      role: 'user',
      subscriptionStatus: 'active',
      subscriptionEndDate: yesterday,
      allowedCategories: ['real_estate'],
    };
    const result = checkSubscriptionActive(profile, 'real_estate');
    expect(result.active).toBe(false);
    expect(result.message).toContain('expired');
  });

  it('allows when subscription end date is in the future', () => {
    const tomorrow = new Date(Date.now() + 86400000);
    const profile: SubscriptionProfile = {
      role: 'user',
      subscriptionStatus: 'active',
      subscriptionEndDate: tomorrow,
      allowedCategories: ['real_estate'],
    };
    const result = checkSubscriptionActive(profile, 'real_estate');
    expect(result.active).toBe(true);
  });

  it('allows when subscriptionEndDate is null (no expiry set)', () => {
    const profile: SubscriptionProfile = {
      role: 'user',
      subscriptionStatus: 'active',
      subscriptionEndDate: null,
      allowedCategories: ['real_estate'],
    };
    const result = checkSubscriptionActive(profile, 'real_estate');
    expect(result.active).toBe(true);
  });

  it('denies when allowedCategories is empty and category is specified', () => {
    const profile: SubscriptionProfile = {
      role: 'user',
      subscriptionStatus: 'active',
      allowedCategories: [],
    };
    const result = checkSubscriptionActive(profile, 'real_estate');
    expect(result.active).toBe(false);
    expect(result.message).toContain('not configured');
  });

  it('denies when allowedCategories is null and category is specified', () => {
    const profile: SubscriptionProfile = {
      role: 'user',
      subscriptionStatus: 'active',
      allowedCategories: null,
    };
    const result = checkSubscriptionActive(profile, 'real_estate');
    expect(result.active).toBe(false);
    expect(result.message).toContain('not configured');
  });

  it('denies when category is not in allowedCategories', () => {
    const profile: SubscriptionProfile = {
      role: 'user',
      subscriptionStatus: 'active',
      allowedCategories: ['property_casualty'],
    };
    const result = checkSubscriptionActive(profile, 'real_estate');
    expect(result.active).toBe(false);
    expect(result.message).toContain('does not include access');
  });

  it('allows when category matches allowedCategories', () => {
    const profile: SubscriptionProfile = {
      role: 'user',
      subscriptionStatus: 'active',
      allowedCategories: ['real_estate', 'life_insurance'],
    };
    const result = checkSubscriptionActive(profile, 'real_estate');
    expect(result.active).toBe(true);
  });

  it('allows bundle subscription with all categories', () => {
    const profile: SubscriptionProfile = {
      role: 'user',
      subscriptionStatus: 'active',
      allowedCategories: [
        'real_estate',
        'property_casualty',
        'life_insurance',
        'general_lines',
      ],
    };
    expect(checkSubscriptionActive(profile, 'real_estate').active).toBe(true);
    expect(checkSubscriptionActive(profile, 'property_casualty').active).toBe(true);
    expect(checkSubscriptionActive(profile, 'life_insurance').active).toBe(true);
    expect(checkSubscriptionActive(profile, 'general_lines').active).toBe(true);
  });

  it('accepts string date format for subscriptionEndDate', () => {
    const futureDate = new Date(Date.now() + 86400000).toISOString();
    const profile: SubscriptionProfile = {
      role: 'user',
      subscriptionStatus: 'active',
      subscriptionEndDate: futureDate,
      allowedCategories: ['real_estate'],
    };
    const result = checkSubscriptionActive(profile, 'real_estate');
    expect(result.active).toBe(true);
  });
});
