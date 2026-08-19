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


/**
 * Sign-up is not login, and used to be limited as though it were.
 *
 * Both endpoints shared one control: five failures per IP per fifteen minutes.
 * On login that is brute-force protection. On a sign-up form it counted people
 * mistyping - a password under eight characters was enough - so five typos
 * locked the address out of registering, and told the person "Too many login
 * attempts", which is not what they were doing.
 *
 * An address is a whole office, school or carrier NAT, so one student fumbling
 * the form could stop the rest of the room from signing up. That is the failure
 * these specs exist to prevent coming back.
 *
 * This server runs with REGISTER_RATE_LIMIT_MAX small, so the cap can be
 * reached in a handful of requests rather than forty.
 */
test.describe('sign-up limiting', () => {
  // One test, deliberately, because both halves spend the same per-IP hourly
  // budget - and no retries, because a retry would run against a budget the
  // first attempt already consumed and fail for a reason that has nothing to
  // do with the code. A misleading second failure is worse than one honest
  // first one. Nothing else in this file may register while this runs.
  test.describe.configure({ retries: 0 });

  const cap = Number(process.env.REGISTER_RATE_LIMIT_MAX_EXPECTED || '5');

  test('typos are free, but creating accounts in bulk is still capped', async ({ request }) => {
    // Comfortably more rejections than the cap, none of them an attack.
    for (let i = 0; i < cap + 3; i++) {
      const rejected = await request.post('/api/register', {
        data: { email: `typo-${Date.now()}-${i}@test.com`, password: 'short' },
      });
      expect(rejected.status(), 'a mistyped form must never spend the budget').toBe(400);
    }

    // The student on the next desk, who typed it correctly.
    const created = await request.post('/api/register', {
      data: {
        email: `classmate-${Date.now()}@test.com`,
        password: 'TestPassword123!',
        firstName: 'Class',
        lastName: 'Mate',
      },
    });
    expect(created.status(), 'a valid sign-up after typos must still work').toBe(200);

    // The control has to survive being made kinder. That first account counts,
    // so the rest of the budget is a few more.
    let blocked = false;
    for (let i = 0; i < cap + 2; i++) {
      const response = await request.post('/api/register', {
        data: {
          email: `bulk-${Date.now()}-${i}@test.com`,
          password: 'TestPassword123!',
          firstName: 'Bulk',
          lastName: 'Signup',
        },
      });
      if (response.status() === 429) {
        const body = await response.json();
        // And it says what actually happened, rather than talking about logins.
        expect(body.message).toContain('accounts have been created');
        blocked = true;
        break;
      }
      expect(response.status()).toBe(200);
    }

    expect(blocked, 'bulk sign-up must still hit the cap').toBe(true);
  });
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
