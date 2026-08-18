/**
 * Guard for specs that write.
 *
 * Several specs in this suite POST to /api/register. Until the default target
 * was changed they ran against https://www.myeasypass.net, so `npm run
 * test:e2e` with nothing set created real accounts in the production
 * database — silently, and every run.
 *
 * Changing the default fixes the accident. This closes the remaining hole:
 * someone who sets TEST_BASE_URL to production to check a deploy should not
 * thereby start writing to it. Read-only specs are unaffected; only the ones
 * that create data call this.
 */

/** Hosts we are willing to create data on without an explicit opt-in. */
const LOCAL_HOSTS = new Set(['localhost', '127.0.0.1', '[::1]', '0.0.0.0']);

export function isLocalTarget(baseURL: string | undefined): boolean {
  if (!baseURL) return false;
  try {
    return LOCAL_HOSTS.has(new URL(baseURL).hostname);
  } catch {
    // An unparseable base URL is not something to give the benefit of the
    // doubt to.
    return false;
  }
}

/**
 * Throws unless the target is local, or the caller has explicitly said they
 * mean it.
 *
 * Set `ALLOW_REMOTE_WRITES=1` to run the writing specs against a deployed
 * environment — a staging one, ideally. The variable is deliberately awkward
 * and not set anywhere in CI.
 */
export function requireWritableTarget(baseURL: string | undefined): void {
  if (isLocalTarget(baseURL)) return;
  if (process.env.ALLOW_REMOTE_WRITES === '1') return;

  throw new Error(
    `Refusing to run data-creating tests against ${baseURL ?? '(no base URL)'}.\n` +
      'These specs register accounts. Point TEST_BASE_URL at a local server, ' +
      'or set ALLOW_REMOTE_WRITES=1 if you genuinely intend to write to that ' +
      'environment.',
  );
}
