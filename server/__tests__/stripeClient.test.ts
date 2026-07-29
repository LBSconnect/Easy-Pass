import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { getWebhookUrl } from '../stripeClient';

describe('getWebhookUrl', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    delete process.env.REPLIT_DEPLOYMENT;
    delete process.env.REPLIT_DOMAINS;
    delete process.env.NODE_ENV;
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  it('returns the production URL when NODE_ENV is production (e.g. Render)', () => {
    process.env.NODE_ENV = 'production';
    expect(getWebhookUrl()).toBe('https://www.myeasypass.net/api/stripe/webhook');
  });

  it('returns the production URL when REPLIT_DEPLOYMENT is set', () => {
    process.env.REPLIT_DEPLOYMENT = '1';
    expect(getWebhookUrl()).toBe('https://www.myeasypass.net/api/stripe/webhook');
  });

  it('returns the Replit dev domain URL outside production', () => {
    process.env.NODE_ENV = 'development';
    process.env.REPLIT_DOMAINS = 'abc-123.replit.dev,other-domain.com';
    expect(getWebhookUrl()).toBe('https://abc-123.replit.dev/api/stripe/webhook');
  });

  it('returns null when there is no way to determine a public URL', () => {
    process.env.NODE_ENV = 'development';
    expect(getWebhookUrl()).toBeNull();
  });
});
