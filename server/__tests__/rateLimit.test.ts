import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// We need to import from the module. The module has a setInterval side effect,
// so we mock timers before importing.
vi.useFakeTimers();

// Dynamic import to get the module after timer mocking
const { rateLimit, getClientIp } = await import('../rateLimit');

describe('rateLimit', () => {
  beforeEach(() => {
    vi.setSystemTime(new Date('2025-01-01T00:00:00Z'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('allows the first request', () => {
    const result = rateLimit('test-first', 5, 60000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('decrements remaining on subsequent requests', () => {
    const key = 'test-decrement';
    rateLimit(key, 5, 60000);
    const result = rateLimit(key, 5, 60000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(3);
  });

  it('blocks after max attempts reached', () => {
    const key = 'test-block';
    for (let i = 0; i < 5; i++) {
      rateLimit(key, 5, 60000);
    }
    const result = rateLimit(key, 5, 60000);
    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
  });

  it('resets after the time window expires', () => {
    const key = 'test-reset';
    for (let i = 0; i < 5; i++) {
      rateLimit(key, 5, 60000);
    }
    // Blocked
    expect(rateLimit(key, 5, 60000).allowed).toBe(false);

    // Advance past the window
    vi.advanceTimersByTime(61000);

    // Should be allowed again
    const result = rateLimit(key, 5, 60000);
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(4);
  });

  it('returns resetIn time for blocked requests', () => {
    const key = 'test-resetin';
    for (let i = 0; i < 5; i++) {
      rateLimit(key, 5, 60000);
    }
    const result = rateLimit(key, 5, 60000);
    expect(result.allowed).toBe(false);
    expect(result.resetIn).toBeGreaterThan(0);
    expect(result.resetIn).toBeLessThanOrEqual(60000);
  });

  it('treats different keys independently', () => {
    for (let i = 0; i < 5; i++) {
      rateLimit('key-a', 5, 60000);
    }
    expect(rateLimit('key-a', 5, 60000).allowed).toBe(false);
    expect(rateLimit('key-b', 5, 60000).allowed).toBe(true);
  });

  it('works with maxAttempts of 1', () => {
    const key = 'test-max1';
    const first = rateLimit(key, 1, 60000);
    expect(first.allowed).toBe(true);
    expect(first.remaining).toBe(0);

    const second = rateLimit(key, 1, 60000);
    expect(second.allowed).toBe(false);
  });
});

describe('getClientIp', () => {
  it('extracts IP from x-forwarded-for header (string)', () => {
    const req = {
      headers: { 'x-forwarded-for': '1.2.3.4, 5.6.7.8' },
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
    } as any;
    expect(getClientIp(req)).toBe('1.2.3.4');
  });

  it('extracts IP from x-forwarded-for header (array)', () => {
    const req = {
      headers: { 'x-forwarded-for': ['10.0.0.1', '10.0.0.2'] },
      ip: '127.0.0.1',
      socket: { remoteAddress: '127.0.0.1' },
    } as any;
    expect(getClientIp(req)).toBe('10.0.0.1');
  });

  it('falls back to req.ip when no x-forwarded-for', () => {
    const req = {
      headers: {},
      ip: '192.168.1.1',
      socket: { remoteAddress: '127.0.0.1' },
    } as any;
    expect(getClientIp(req)).toBe('192.168.1.1');
  });

  it('falls back to socket.remoteAddress when req.ip is undefined', () => {
    const req = {
      headers: {},
      ip: undefined,
      socket: { remoteAddress: '10.10.10.10' },
    } as any;
    expect(getClientIp(req)).toBe('10.10.10.10');
  });

  it('returns unknown when no IP source available', () => {
    const req = {
      headers: {},
      ip: undefined,
      socket: {},
    } as any;
    expect(getClientIp(req)).toBe('unknown');
  });

  it('ignores x-forwarded-for value of "unknown"', () => {
    const req = {
      headers: { 'x-forwarded-for': 'unknown' },
      ip: '1.1.1.1',
      socket: { remoteAddress: '127.0.0.1' },
    } as any;
    expect(getClientIp(req)).toBe('1.1.1.1');
  });
});
