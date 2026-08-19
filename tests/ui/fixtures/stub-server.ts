/**
 * A stub API in front of the real built client.
 *
 * WHY NOT JUST USE THE REAL SERVER
 *
 * The end-to-end suite in tests/ drives a real server and a real database,
 * which is right for auth guards and page rendering. It is the wrong tool for
 * the behaviour these specs cover: what the interface does when an endpoint
 * returns 500, when an account is empty, when a body arrives malformed, or
 * when Stripe has no weekly price. Producing those states for real means
 * breaking the server on purpose.
 *
 * So these specs serve the genuinely built client from dist/public and answer
 * its API calls from a script. The client is the real thing, compiled the way
 * production compiles it; only the backend is a stand-in. Every defect these
 * catch is a defect in the interface, which is what they are for.
 *
 * Each spec gets its own server on its own port, so they can run in parallel
 * and one spec's state cannot leak into another's.
 */

import express, { type Express } from 'express';
import type { Server } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
/** The real compiled client. `npm run build` must have run. */
const CLIENT_ROOT = path.resolve(here, '../../../dist/public');

export interface StubServer {
  baseURL: string;
  close(): Promise<void>;
}

/**
 * Start a stub.
 *
 * @param configure adds routes. Anything it does not handle falls through to
 *   an empty JSON object, so a spec only writes the endpoints it cares about.
 */
export async function startStubServer(configure: (app: Express) => void): Promise<StubServer> {
  const app = express();
  app.use(express.json());

  configure(app);

  // Unhandled API calls answer with an empty object rather than the SPA's
  // index.html, which would otherwise arrive as HTML where JSON was expected
  // and fail in a way that looks like a client bug.
  app.all(/^\/api\//, (_req, res) => res.json({}));

  app.use(express.static(CLIENT_ROOT));
  app.get(/.*/, (_req, res) => res.sendFile(path.join(CLIENT_ROOT, 'index.html')));

  const server: Server = await new Promise((resolve) => {
    // Port 0: the OS picks a free one, so parallel specs never collide.
    const s = app.listen(0, () => resolve(s));
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('stub server did not bind to a port');
  }

  return {
    baseURL: `http://127.0.0.1:${address.port}`,
    close: () =>
      new Promise<void>((resolve, reject) => {
        // server.close() stops the server accepting new connections and then
        // waits for the open ones to end. A browser holds its sockets open
        // with keep-alive, so that wait does not finish and the afterEach
        // hook times out the spec.
        //
        // Which specs it kills depends on how many requests the page happened
        // to make and how they were reused - adding one unrelated fetch to
        // the dashboard turned three passing onboarding specs red without
        // touching them. Closing the sockets explicitly makes teardown
        // deterministic instead.
        server.closeAllConnections();
        server.close((err) => (err ? reject(err) : resolve()));
      }),
  };
}

/** A signed-in student, for the endpoints nearly every page calls. */
export function signedInUser(app: Express, profile: Record<string, unknown> = {}) {
  app.get('/api/auth/user', (_req, res) =>
    res.json({
      id: 'u1',
      email: 'student@example.com',
      firstName: 'Sam',
      claims: { sub: 'u1' },
    }),
  );
  app.get('/api/profile', (_req, res) =>
    res.json({
      userId: 'u1',
      preferredLanguage: 'en',
      allowedCategories: [],
      subscriptionStatus: null,
      preferredCategory: 'property_casualty',
      role: 'user',
      examDate: null,
      hasPreviousAttempt: false,
      ...profile,
    }),
  );
  app.patch('/api/profile', (_req, res) => res.json({ ok: true }));
  app.get('/api/alexi/config', (_req, res) =>
    res.json({
      displayName: 'Alexi',
      aiAvailable: true,
      flags: {
        enabled: true,
        tutorEnabled: true,
        quizGenerationEnabled: true,
        flashcardsEnabled: true,
        mockExamEnabled: false,
        retakerEnabled: true,
        spanishEnabled: true,
      },
    }),
  );
}
