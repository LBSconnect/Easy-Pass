import bcrypt from "bcryptjs";
import session from "express-session";
import connectPg from "connect-pg-simple";
import type { Express, RequestHandler } from "express";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import { sanitizeHtml } from "./sanitize";
import { rateLimit } from "./rateLimit";
import { resolveSecureCookie } from "@shared/sessionCookie";
import { recordPresence } from "./presence";
import { SIGNUP_ABUSE_FLAG } from "@shared/signupLimit";

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
  }
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());

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

      req.session.userId = user.id;
      req.session.email = user.email!;

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
