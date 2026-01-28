import { describe, it, expect } from 'vitest';
import { sanitizeHtml, sanitizeString, sanitizeObject } from '../sanitize';

describe('sanitizeHtml', () => {
  it('encodes script tags', () => {
    expect(sanitizeHtml('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;&#x2F;script&gt;'
    );
  });

  it('encodes img onerror XSS', () => {
    expect(sanitizeHtml('<img onerror=alert(1) src=x>')).toBe(
      '&lt;img onerror=alert(1) src=x&gt;'
    );
  });

  it('encodes ampersands', () => {
    expect(sanitizeHtml('foo & bar')).toBe('foo &amp; bar');
  });

  it('encodes double quotes', () => {
    expect(sanitizeHtml('say "hello"')).toBe('say &quot;hello&quot;');
  });

  it('encodes single quotes', () => {
    expect(sanitizeHtml("it's")).toBe('it&#x27;s');
  });

  it('encodes forward slashes', () => {
    expect(sanitizeHtml('a/b')).toBe('a&#x2F;b');
  });

  it('returns null for null input', () => {
    expect(sanitizeHtml(null)).toBeNull();
  });

  it('returns null for undefined input', () => {
    expect(sanitizeHtml(undefined)).toBeNull();
  });

  it('returns null for non-string input', () => {
    expect(sanitizeHtml(42 as any)).toBeNull();
  });

  it('returns empty string for empty string', () => {
    expect(sanitizeHtml('')).toBe('');
  });

  it('handles strings with no special characters', () => {
    expect(sanitizeHtml('hello world')).toBe('hello world');
  });

  it('encodes multiple special characters in one string', () => {
    expect(sanitizeHtml('<b>"test" & \'it\'</b>')).toBe(
      '&lt;b&gt;&quot;test&quot; &amp; &#x27;it&#x27;&lt;&#x2F;b&gt;'
    );
  });

  it('double-encodes already-encoded entities', () => {
    // This is expected behavior: & in &amp; gets encoded again
    expect(sanitizeHtml('&amp;')).toBe('&amp;amp;');
  });
});

describe('sanitizeString', () => {
  it('sanitizes a normal string', () => {
    expect(sanitizeString('<b>hi</b>')).toBe('&lt;b&gt;hi&lt;&#x2F;b&gt;');
  });

  it('returns original value when sanitizeHtml returns null', () => {
    // sanitizeHtml returns null for non-strings, sanitizeString falls back to input
    const num = 42 as any;
    expect(sanitizeString(num)).toBe(num);
  });
});

describe('sanitizeObject', () => {
  it('sanitizes specified string fields', () => {
    const input = { name: '<b>Test</b>', age: 25, email: 'a@b.com' };
    const result = sanitizeObject(input, ['name']);
    expect(result.name).toBe('&lt;b&gt;Test&lt;&#x2F;b&gt;');
    expect(result.age).toBe(25);
    expect(result.email).toBe('a@b.com');
  });

  it('skips non-string fields even if listed', () => {
    const input = { name: 'Test', count: 5 };
    const result = sanitizeObject(input, ['name', 'count']);
    expect(result.count).toBe(5);
  });

  it('does not mutate the original object', () => {
    const input = { name: '<script>xss</script>' };
    const result = sanitizeObject(input, ['name']);
    expect(input.name).toBe('<script>xss</script>');
    expect(result.name).toContain('&lt;');
  });

  it('sanitizes multiple fields', () => {
    const input = { first: '<a>', last: '<b>' };
    const result = sanitizeObject(input, ['first', 'last']);
    expect(result.first).toBe('&lt;a&gt;');
    expect(result.last).toBe('&lt;b&gt;');
  });

  it('handles empty fields list', () => {
    const input = { name: '<script>' };
    const result = sanitizeObject(input, []);
    expect(result.name).toBe('<script>');
  });
});
