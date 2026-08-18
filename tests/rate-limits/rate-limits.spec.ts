/**
 * The rate limiters, on a server that still has real ones.
 *
 * WHY THESE LIVE APART
 *
 * These specs prove the limiters work by deliberately exhausting them. That
 * makes them poison for every other spec: the auth limiter is per IP, the
 * whole suite comes from 127.0.0.1, and once five failed logins are spent
 * every later auth spec gets a 429 where it expected a 400. The first time
 * this suite was ever actually run, twelve specs failed exactly that way.
 *
 * The wrong fix is to relax the limits until everything passes, which throws
 * away the only coverage of a real control. So these run against their own
 * server, on its own port, with the default limits - and the functional
 * specs run against one with the caps raised, where a limiter is not the
 * thing under test.
 *
 * Consequence to keep in mind when adding to this file: everything here
 * shares one limiter budget per endpoint, so a new spec that exhausts an
 * endpoint another spec here depends on will break it.
 */

import { test, expect } from '@playwright/test';

test('rate limiting blocks excessive login attempts', async ({ request }) => {
  const uniqueEmail = `ratelimit_${Date.now()}@test.com`;
  
  for (let i = 0; i < 6; i++) {
    const response = await request.post('/api/login', {
    data: { email: uniqueEmail, password: 'wrongpassword' }
    });
    
    if (i >= 5) {
    expect(response.status()).toBe(429);
    const body = await response.json();
    expect(body.message).toContain('Too many login attempts');
    }
  }
});


test.describe('Rate Limiting', () => {

    test('rate limits forgot-password after 5 requests from same IP', async ({ request }) => {
      const uniqueEmail = `ratelimit-forgot-${Date.now()}@test.com`;
      
      for (let i = 0; i < 7; i++) {
        const response = await request.post('/api/forgot-password', {
          data: { email: uniqueEmail }
        });
        
        if (i >= 5) {
          expect(response.status()).toBe(429);
          const body = await response.json();
          expect(body.message).toContain('Too many password reset requests');
          expect(body.retryAfter).toBeGreaterThan(0);
        }
      }
    });

    test('rate limits reset-password after 10 requests from same IP', async ({ request }) => {
      for (let i = 0; i < 12; i++) {
        const response = await request.post('/api/reset-password', {
          data: { 
            token: `invalid-token-${i}`,
            password: 'NewPassword123!'
          }
        });
        
        if (i >= 10) {
          expect(response.status()).toBe(429);
          const body = await response.json();
          expect(body.message).toContain('Too many reset attempts');
        }
      }
    });

    test('rate limits verify endpoint after 20 requests from same IP', async ({ request }) => {
      for (let i = 0; i < 22; i++) {
        const response = await request.get(`/api/reset-password/verify?token=token-${i}`);
        
        if (i >= 20) {
          expect(response.status()).toBe(429);
          const body = await response.json();
          expect(body.message).toContain('Too many verification attempts');
        }
      }
    });
});
