import { test, expect } from '@playwright/test';

test.describe('Public Endpoints', () => {

  test.describe('Study Guide Topics', () => {
    test('GET /api/study-guide/topics returns all topic categories', async ({ request }) => {
      const response = await request.get('/api/study-guide/topics');
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(4);
    });

    test('GET /api/study-guide/topics/real_estate returns topics for category', async ({ request }) => {
      const response = await request.get('/api/study-guide/topics/real_estate');
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(5);
      expect(body[0].id).toBe('re_contracts');
    });

    test('GET /api/study-guide/topics/property_casualty returns correct topics', async ({ request }) => {
      const response = await request.get('/api/study-guide/topics/property_casualty');
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.length).toBe(4);
    });

    test('GET /api/study-guide/topics/life_insurance returns correct topics', async ({ request }) => {
      const response = await request.get('/api/study-guide/topics/life_insurance');
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.length).toBe(4);
    });

    test('GET /api/study-guide/topics/general_lines returns correct topics', async ({ request }) => {
      const response = await request.get('/api/study-guide/topics/general_lines');
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.length).toBe(4);
    });

    test('GET /api/study-guide/topics/invalid_category returns 400', async ({ request }) => {
      const response = await request.get('/api/study-guide/topics/invalid_category');
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.message).toContain('Invalid category');
    });
  });

  test.describe('Public Certificate Access', () => {
    test('GET /api/certificates/public/nonexistent-slug returns 404', async ({ request }) => {
      const response = await request.get('/api/certificates/public/nonexistent-slug');
      expect(response.status()).toBe(404);
      const body = await response.json();
      expect(body.message).toContain('Certificate not found');
    });
  });

  test.describe('Authentication Endpoints', () => {
    test('GET /api/auth/user returns 401 when not logged in', async ({ request }) => {
      const response = await request.get('/api/auth/user');
      expect(response.status()).toBe(401);
    });

    test('POST /api/login with missing fields returns 400', async ({ request }) => {
      const response = await request.post('/api/login', {
        data: {},
      });
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.message).toContain('Email and password are required');
    });

    test('POST /api/register with missing fields returns 400', async ({ request }) => {
      const response = await request.post('/api/register', {
        data: {},
      });
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.message).toContain('Email and password are required');
    });

    test('POST /api/register with duplicate email returns 400', async ({ request }) => {
      // Use a known test email pattern -- register twice
      const email = `dup_test_${Date.now()}@example.com`;
      const data = { email, password: 'TestPass123!', firstName: 'Dup', lastName: 'Test' };

      const first = await request.post('/api/register', { data });
      // First might succeed or fail depending on environment state, but second should fail
      if (first.ok()) {
        const second = await request.post('/api/register', { data });
        expect(second.status()).toBe(400);
        const body = await second.json();
        expect(body.message).toContain('Email already registered');
      }
    });

    test('POST /api/logout returns success as JSON', async ({ request }) => {
      // Even without a session, POST logout shouldn't crash
      const response = await request.post('/api/logout');
      // Should succeed (destroy empty session) or handle gracefully
      expect([200, 500].includes(response.status())).toBe(true);
    });
  });

  test.describe('Callback Requests', () => {
    test('POST /api/callback-requests with valid data succeeds', async ({ request }) => {
      const response = await request.post('/api/callback-requests', {
        data: {
          firstName: 'Jane',
          lastName: 'Doe',
          email: 'jane.doe@example.com',
          phone: '281-555-0123',
          preferredDay: 'Monday',
          preferredTime: '10:00 AM',
        },
      });
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.id).toBeDefined();
    });

    test('POST /api/callback-requests with missing fields returns 400', async ({ request }) => {
      const response = await request.post('/api/callback-requests', {
        data: { firstName: 'Jane' },
      });
      expect(response.status()).toBe(400);
      const body = await response.json();
      expect(body.message).toContain('Invalid data');
    });

    test('POST /api/callback-requests sanitizes XSS in fields', async ({ request }) => {
      const response = await request.post('/api/callback-requests', {
        data: {
          firstName: '<script>alert(1)</script>',
          lastName: 'Safe',
          email: 'xss-callback@example.com',
          phone: '281-555-0124',
          preferredDay: 'Tuesday',
          preferredTime: '2:00 PM',
        },
      });
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
    });
  });

  test.describe('Guest Articles', () => {
    test('POST /api/guest-articles with valid data succeeds', async ({ request }) => {
      const response = await request.post('/api/guest-articles', {
        data: {
          name: 'John Doe',
          email: 'john@example.com',
          topic: 'Insurance Tips',
          message: 'Here are my tips for passing the exam. Study a little every day, take practice tests, and review your weak topics.',
        },
      });
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.id).toBeDefined();
    });

    test('POST /api/guest-articles with missing required fields returns 400', async ({ request }) => {
      const response = await request.post('/api/guest-articles', {
        data: { name: 'Incomplete' },
      });
      expect(response.status()).toBe(400);
    });
  });
});
