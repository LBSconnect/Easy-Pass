import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getWebhookUrl } from '../stripeClient';

describe('getWebhookUrl', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns the production URL when NODE_ENV is production (e.g. Render)', () => {
    process.env.NODE_ENV = 'production';
    expect(getWebhookUrl()).toBe('https://www.myeasypass.net/api/stripe/webhook');
  });

  it('returns null outside production', () => {
    process.env.NODE_ENV = 'development';
    expect(getWebhookUrl()).toBeNull();
  });
});
