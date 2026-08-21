import bcrypt from "bcryptjs";
import { attributeUserToPartner } from "./partners/partnerStore";
import session from "express-session";
import connectPg from "connect-pg-simple";
import type { Express, RequestHandler } from "express";
import { db } from "./db";
import { users, diagnosticAttempts, questionResponses, questions } from "@shared/schema";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { sanitizeHtml } from "./sanitize";
import { rateLimit, clearRateLimit } from "./rateLimit";
import { resolveSecureCookie } from "@shared/sessionCookie";
import { recordPresence } from "./presence";
import { SIGNUP_ABUSE_FLAG } from "@shared/signupLimit";

type DiagnosticEvidence = {
  attemptId: string;
  answers: Record<string, number>;
};

/**
 * Validate the tiny diagnostic payload before we keep it in the server-side
 * session. The attempt itself is authoritative; this only preserves which
 * shuffled option the browser selected for each question until the visitor
 * signs in or creates an account.
 */
function parseDiagnosticEvidence(value: unknown): DiagnosticEvidence | null {
  if (!value || typeof value !== "object") return null;
  const candidate = value as { attemptId?: unknown; answers?: unknown };
  if (typeof candidate.attemptId !== "string" || candidate.attemptId.length < 1) return null;
  if (!candidate.answers || typeof candidate.answers !== "object" || Array.isArray(candidate.answers)) return null;

  const entries = Object.entries(candidate.answers as Record<string, unknown>);
  if (entries.length < 1 || entries.length > 25) return null;

  const answers: Record<string, number> = {};
  for (const [questionId, raw] of entries) {
    if (!questionId || typeof raw !== "number" || !Number.isInteger(raw) || raw < 0 || raw > 9) {
      return null;
    }
    answers[questionId] = raw;
  }

  return { attemptId: candidate.attemptId, answers };
}

/**
 * Turn one completed public diagnostic into first-class learning history.
 *
 * Ownership is claimed inside the same transaction that writes responses. A
 * guest attempt can therefore belong to exactly one account, while a retry by
 * that same account is harmless. The synthetic session id is covered by the
 * existing unique response index, so a repeated auth request cannot count the
 * same diagnostic question twice.
 */
async function claimDiagnosticEvidence(userId: string, evidence: DiagnosticEvidence): Promise<boolean> {
  const [attempt] = await db
    .select()
    .from(diagnosticAttempts)
    .where(eq(diagnosticAttempts.id, evidence.attemptId))
    .limit(1);

  if (!attempt || !attempt.completedAt) return false;
  if (attempt.userId && attempt.userId !== userId) return false;

  const questionIds = attempt.questionIds as string[];
  if (questionIds.length === 0) return false;
  if (Object.keys(evidence.answers).length !== questionIds.length) return false;
  if (questionIds.some((id) => evidence.answers[id] === undefined)) return false;

  const answerOrder = attempt.answerOrder as Record<string, number>;

  return db.transaction(async (tx) => {
    if (!attempt.userId) {
      const [claimed] = await tx
        .update(diagnosticAttempts)
        .set({ userId })
        .where(and(eq(diagnosticAttempts.id, attempt.id), isNull(diagnosticAttempts.userId)))
        .returning({ id: diagnosticAttempts.id });
      if (!claimed) return false;
    }

    const questionRows = await tx
      .select({ id: questions.id, topic: questions.topic })
      .from(questions)
      .where(inArray(questions.id, questionIds));
    const topicById = new Map(questionRows.map((q) => [q.id, q.topic ?? "General"]));
    const diagnosticSessionId = `diagnostic:${attempt.id}`;

    await tx
      .insert(questionResponses)
      .values(
        questionIds.map((questionId) => ({
          userId,
          questionId,
          category: attempt.category,
          topic: topicById.get(questionId) ?? "General",
          source: "diagnostic" as const,
          sessionId: diagnosticSessionId,
          selectedAnswer: evidence.answers[questionId],
          isCorrect: evidence.answers[questionId] === answerOrder[questionId],
          language: "en" as const,
          answeredAt: attempt.completedAt!,
        })),
      )
      .onConflictDoNothing();

    return true;
  });
}

async function claimSessionDiagnostic(req: any, userId: string): Promise<void> {
  const evidence = parseDiagnosticEvidence(req.session.diagnosticEvidence);
  if (!evidence) return;

  try {
    await claimDiagnosticEvidence(userId, evidence);
  } catch (error) {
    // Account access must never fail because this optional growth handoff did.
    console.error("Diagnostic evidence claim failed:", error);
  } finally {
    delete req.session.diagnosticEvidence;
  }
}

/**
 * Attach the introducing partner to a student who has just signed in or
 * registered.
 *
 * Unlike the diagnostic stash, this is NOT deleted afterwards. The visitor may
 * still be part-way through the funnel - they often register at checkout - and
 * a second sign-in on the same visit should still find the partner. The
 * first-touch rule lives in attributeUserToPartner, which refuses to overwrite
 * an attribution that already exists, so leaving it in the session is safe.
 */
async function claimSessionPartner(req: any, userId: string): Promise<void> {
  const partner = req.session?.partnerAttribution as SessionPartner | undefined;
  if (!partner?.prospectId || !partner.partnerCode) return;

  try {
    await attributeUserToPartner(userId, partner);
  } catch (error) {
    // Signing in must never fail because an attribution write did.
    console.error("Partner attribution claim failed:", error);
  }
}

export function getSession() {
  if (!process.env.SESSION_SECRET) {
    console.error("[Session] ERROR: SESSION_SECRET is missing");
    throw new Error("SESSION_SECRET must be set.");
  }

  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const isProduction = process.env.NODE_ENV === "production";
  // Secure stays on in production unless someone deliberately turns it off.
  // express-session declines to set a Secure cookie at all over plain HTTP,
  // so a production build behind HTTP issues no session cookie and every
  // authenticated flow silently fails to establish - which is precisely the
  // shape of a CI end-to-end job.
  const secureCookie = resolveSecureCookie({
    nodeEnv: process.env.NODE_ENV,
    override: process.env.SESSION_COOKIE_SECURE,
  });
  console.log(`[Session] Environment: ${isProduction ? 'PRODUCTION' : 'DEVELOPMENT'}, secure cookies: ${secureCookie}`);

  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
    // Add SSL for production Neon connection
    ...(isProduction && {
      ssl: { rejectUnauthorized: false }
    }),
  });

  return session({
    secret: process.env.SESSION_SECRET,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: secureCookie,
      sameSite: "lax",
      maxAge: sessionTtl,
    },
  });
}

declare module "express-session" {
  interface SessionData {
    userId: string;
    email: string;
    diagnosticEvidence?: DiagnosticEvidence;
    /**
     * The partner whose link brought this browser here.
     *
     * Server-side for two reasons. It survives the trip out to Stripe and back
     * without depending on what the browser chose to keep, and it cannot be
     * set by a visitor who fancies crediting a sale to someone - the only
     * thing that writes it is a code that resolved to a live partner.
     */
    partnerAttribution?: SessionPartner;
  }
}

export interface SessionPartner {
  prospectId: string;
  partnerCode: string;
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

  // Preserve a just-completed public diagnostic in this browser's secure
  // server-side session. Nothing is assigned to an account until successful
  // auth, and the attempt id must resolve to the exact completed question set.
  app.post("/api/diagnostic/stash", async (req, res) => {
    try {
      const ip = req.ip || req.socket.remoteAddress || "unknown";
      const { allowed, resetIn } = rateLimit(`diagnostic-stash:${ip}`, 20, 15 * 60 * 1000);
      if (!allowed) {
        return res.status(429).json({
          message: "Too many attempts. Please try again later.",
          retryAfter: Math.ceil(resetIn / 1000),
        });
      }

      const evidence = parseDiagnosticEvidence(req.body);
      if (!evidence) {
        return res.status(400).json({ message: "Invalid diagnostic evidence" });
      }

      const [attempt] = await db
        .select()
        .from(diagnosticAttempts)
        .where(eq(diagnosticAttempts.id, evidence.attemptId))
        .limit(1);
      if (!attempt || !attempt.completedAt) {
        return res.status(404).json({ message: "Completed diagnostic not found" });
      }
      if (attempt.userId && attempt.userId !== req.session.userId) {
        return res.status(409).json({ message: "Diagnostic already belongs to another account" });
      }

      const questionIds = attempt.questionIds as string[];
      if (
        Object.keys(evidence.answers).length !== questionIds.length ||
        questionIds.some((id) => evidence.answers[id] === undefined) ||
        Object.keys(evidence.answers).some((id) => !questionIds.includes(id))
      ) {
        return res.status(400).json({ message: "Diagnostic answers do not match this attempt" });
      }

      req.session.diagnosticEvidence = evidence;

      // A signed-in student does not need an auth handoff; attach the evidence
      // immediately and clear the transient copy.
      if (req.session.userId) {
        await claimSessionDiagnostic(req, req.session.userId);
      }

      res.json({ stashed: true });
    } catch (error) {
      console.error("Diagnostic evidence stash failed:", error);
      res.status(500).json({ message: "Failed to preserve diagnostic evidence" });
    }
  });

  app.post("/api/register", async (req, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email)) {
        return res.status(400).json({ message: "Invalid email format" });
      }

      if (password.length < 8) {
        return res.status(400).json({ message: "Password must be at least 8 characters" });
      }

      // Normalize once and reuse for both the duplicate check and the insert.
      // Previously the duplicate check queried the raw, non-normalized email
      // while the insert lowercased it - a signup with a different-case
      // variant of an already-registered address (e.g. "Test@Example.com" vs
      // stored "test@example.com") would slip past the "already registered"
      // check, hit the DB's unique constraint on insert, and surface as a
      // generic 500 instead of the normal 400 - a response-based email
      // enumeration side channel as well as a confusing failure mode.
      const normalizedEmail = email.toLowerCase().trim();

      const existingUser = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
      if (existingUser.length > 0) {
        // Flagged for the sign-up limiter: repeated from one address this is
        // someone probing which emails have accounts, which is worth counting.
        // A mistyped password, a few lines above, is not. See
        // shared/signupLimit.ts.
        res.locals[SIGNUP_ABUSE_FLAG] = true;
        return res.status(400).json({ message: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);

      const sanitizedFirstName = sanitizeHtml(firstName);
      const sanitizedLastName = sanitizeHtml(lastName);

      const [newUser] = await db.insert(users).values({
        email: normalizedEmail,
        password: hashedPassword,
        firstName: sanitizedFirstName,
        lastName: sanitizedLastName,
      }).returning();

      req.session.userId = newUser.id;
      req.session.email = newUser.email!;
      await claimSessionDiagnostic(req, newUser.id);
      await claimSessionPartner(req, newUser.id);

      res.json({
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  app.post("/api/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const ip = req.ip || req.socket.remoteAddress || "unknown";
      const normalizedEmail = email.toLowerCase().trim();
      const rateLimitKey = `login:${ip}:${normalizedEmail}`;
      const { allowed, resetIn } = rateLimit(rateLimitKey, 5, 15 * 60 * 1000);

      if (!allowed) {
        const minutes = Math.ceil(resetIn / 60000);
        return res.status(429).json({
          message: `Too many login attempts. Please try again in ${minutes} minutes.`
        });
      }

      // Emails are stored lowercased (see /api/register); match on the same
      // normalized form here so a login with a different-case variant of the
      // stored address (e.g. from an email client's autofill) doesn't fail.
      const [user] = await db.select().from(users).where(eq(users.email, normalizedEmail)).limit(1);
      if (!user || !user.password) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Signing in successfully clears the attempt counter. It is consumed
      // above, before the password is checked, so without this a student who
      // signs in on a second device or loses a session cookie spends the same
      // budget as someone guessing - and is locked out on the sixth try.
      clearRateLimit(rateLimitKey);

      req.session.userId = user.id;
      req.session.email = user.email!;
      await claimSessionDiagnostic(req, user.id);
      await claimSessionPartner(req, user.id);

      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.get("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.redirect("/");
    });
  });

  app.post("/api/logout", (req, res) => {
    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ success: true });
    });
  });

  app.get("/api/auth/user", async (req, res) => {
    if (!req.session.userId) {
      return res.status(401).json({ message: "Not authenticated" });
    }

    try {
      const [user] = await db.select().from(users).where(eq(users.id, req.session.userId)).limit(1);
      if (!user) {
        return res.status(401).json({ message: "User not found" });
      }

      res.json({
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        profileImageUrl: user.profileImageUrl,
      });
    } catch (error) {
      console.error("Auth check error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });
}

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!req.session.userId) {
    return res.status(401).json({ message: "Unauthorized" });
  }
  
  (req as any).user = {
    claims: {
      sub: req.session.userId,
      email: req.session.email,
    }
  };

  // Hooked here rather than as separate middleware so it covers every
  // authenticated route by construction - a new route cannot forget it. The
  // call is throttled, never awaited, and cannot throw.
  recordPresence(req.session.userId);

  next();
};