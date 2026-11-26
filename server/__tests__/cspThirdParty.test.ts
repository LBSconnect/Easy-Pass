/**
 * The CSP must allow every third-party script the client actually injects.
 *
 * The failure this pins: client/src/main.tsx loads the Google Ads gtag from
 * googletagmanager.com, but the helmet policy in server/index.ts did not list
 * that host in script-src, so production browsers silently refused the tag
 * and no Ads conversion ever fired. The page kept working, which is exactly
 * why nothing noticed - only the browser console knew.
 *
 * These are static source checks, matching the repo's other content audits:
 * the policy lives inline in server/index.ts, so the test reads the source
 * rather than booting the server.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const serverIndex = readFileSync(resolve(__dirname, '../index.ts'), 'utf8');
const clientHtml = readFileSync(resolve(__dirname, '../../client/index.html'), 'utf8');
const mainTsx = readFileSync(resolve(__dirname, '../../client/src/main.tsx'), 'utf8');

function directive(name: string): string {
  const match = serverIndex.match(new RegExp(`${name}:\\s*\\[([^\\]]*)\\]`, 's'));
  expect(match, `CSP directive ${name} not found in server/index.ts`).toBeTruthy();
  return match![1];
}

describe('content security policy covers injected third parties', () => {
  it('allows the Google Ads gtag loader that main.tsx injects', () => {
    // The injection and the policy must agree on the host.
    expect(mainTsx).toContain('https://www.googletagmanager.com/gtag/js');
    expect(directive('scriptSrc')).toContain('https://www.googletagmanager.com');
  });

  it('allows the endpoints gtag reports conversions to', () => {
    const connect = directive('connectSrc');
    for (const host of [
      'https://www.googletagmanager.com',
      'https://www.google.com',
      'https://googleads.g.doubleclick.net',
      'https://www.googleadservices.com',
    ]) {
      expect(connect, `connect-src missing ${host}`).toContain(host);
    }
  });

  it('keeps Stripe allowed - the fix must not narrow what already worked', () => {
    expect(directive('scriptSrc')).toContain('https://js.stripe.com');
    expect(directive('connectSrc')).toContain('https://api.stripe.com');
    expect(directive('frameSrc')).toContain('https://js.stripe.com');
  });

  it('index.html uses no inline event handlers, which script-src-attr blocks', () => {
    // helmet's default script-src-attr 'none' silently disables onload= and
    // friends; the font promotion broke this way. Keep the document free of
    // them so nothing regresses into a handler the CSP will refuse.
    const handlers = clientHtml.match(/\son[a-z]+\s*=/gi) ?? [];
    expect(handlers, `inline handlers found: ${handlers.join(', ')}`).toHaveLength(0);
  });
});
