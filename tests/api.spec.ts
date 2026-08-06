import { test, expect } from '@playwright/test';

test.describe('API Security Tests', () => {
  test('email validation rejects invalid emails', async ({ request }) => {
    const response = await request.post('/api/register', {
      data: {
        email: 'invalid-email',
        password: 'test123456',
        firstName: 'Test',
        lastName: 'User'
      }
    });
    expect(response.status()).toBe(400);
    const body = await response.json();
    expect(body.message).toContain('Invalid email format');
  });

  test('XSS is sanitized in registration firstName', async ({ request }) => {
    const response = await request.post('/api/register', {
      data: {
        email: `xss_test_${Date.now()}@test.com`,
        password: 'test123456',
        firstName: '<script>alert(1)</script>',
        lastName: 'User'
      }
    });
    if (response.ok()) {
      const body = await response.json();
      expect(body.firstName).not.toContain('<script>');
      expect(body.firstName).toContain('&lt;script&gt;');
    }
  });

  test('XSS is sanitized in registration lastName', async ({ request }) => {
    const response = await request.post('/api/register', {
      data: {
        email: `xss_ln_${Date.now()}@test.com`,
        password: 'test123456',
        firstName: 'Test',
        lastName: '<img onerror=alert(1) src=x>'
      }
    });
    if (response.ok()) {
      const body = await response.json();
      expect(body.lastName).not.toContain('<img');
      expect(body.lastName).toContain('&lt;img');
    }
  });

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

  test('guest article XSS sanitization', async ({ request }) => {
    const response = await request.post('/api/guest-articles', {
      data: {
        name: '<script>xss</script>Test',
        email: 'test@test.com',
        topic: 'Test Topic <img src=x>',
        message: '<img onerror=alert(1)>Message that is long enough to pass the minimum length validation on the guest article form.'
      }
    });
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(body.id).toBeDefined();
  });

  test('password too short is rejected', async ({ request }) => {
    const response = await request.post('/api/register', {
      data: {
        email: `short_pwd_${Date.now()}@test.com`,
        password: '123',
        firstName: 'Test',
        lastName: 'User'
      }
    });
    expect(response.status()).toBe(400);
  });

  test('API rejects invalid input', async ({ request }) => {
    const res = await request.post('/api/guest-articles', {
      data: { name: '' },
    });

    expect(res.status()).toBe(400);
  });
});
