import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import { setupAuth } from "./simpleAuth";
import { runMigrations } from "stripe-replit-sync";
import { getStripeSync } from "./stripeClient";
import { WebhookHandlers } from "./webhookHandlers";
import { initializeStripePrices } from "./initializeStripePrices";

const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

export function log(message: string, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

async function initStripe() {
  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.log("DATABASE_URL not set, skipping Stripe initialization");
    return;
  }

  try {
    console.log("Initializing Stripe schema...");
    await runMigrations({
      databaseUrl,
      schema: "stripe",
    } as any);
    console.log("Stripe schema ready");

    const stripeSync = await getStripeSync();

    // Safe webhook initialization - never crash the server
    console.log("Setting up managed webhook...");
    const isProduction = process.env.REPLIT_DEPLOYMENT === "1";
    const customDomain = "myeasypass.net";
    
    let webhookBaseUrl: string | null = null;
    if (isProduction) {
      webhookBaseUrl = `https://${customDomain}`;
    } else {
      const domains = process.env.REPLIT_DOMAINS?.split(",") || [];
      if (domains.length > 0) {
        webhookBaseUrl = `https://${domains[0]}`;
      }
    }
    
    if (webhookBaseUrl) {
      try {
        // Use a more robust approach that won't crash if webhook doesn't exist
        const webhookUrl = `${webhookBaseUrl}/api/stripe/webhook`;
        
        try {
          const result = await stripeSync.findOrCreateManagedWebhook(webhookUrl);
          const configuredUrl = result?.webhook?.url || result?.url || webhookUrl;
          console.log(`Webhook configured: ${configuredUrl}`);
        } catch (webhookErr: any) {
          // Check if it's a "no such webhook endpoint" error
          if (webhookErr.code === 'resource_missing' || 
              webhookErr.message?.includes('No such webhook endpoint') ||
              webhookErr.type === 'StripeInvalidRequestError') {
            console.warn("[Stripe Init] Old webhook endpoint not found, will use new one");
            console.log(`[Stripe Init] Webhook URL ready: ${webhookUrl}`);
            // Don't crash - the webhook route is still registered and will work
          } else {
            console.log("Webhook setup warning:", webhookErr.message);
          }
        }
      } catch (outerErr: any) {
        console.log("[Stripe Init] Webhook initialization skipped:", outerErr.message);
        // Do NOT crash the server; continue startup
      }
    }

    // IMPORTANT: Initialize prices FIRST (creates missing products/prices in Stripe)
    // THEN sync to database so all prices are available locally
    console.log("Initializing Stripe prices...");
    await initializeStripePrices();

    console.log("Syncing Stripe data to database...");
    try {
      await stripeSync.syncBackfill();
      console.log("Stripe data synced");
    } catch (err: any) {
      console.log("Stripe sync warning:", err.message);
    }
  } catch (error: any) {
    console.log("Stripe initialization skipped:", error.message);
    console.log("Stripe features may be limited");
  }
}

(async () => {
  // Stripe webhook must be registered BEFORE express.json() to receive raw body
  app.post(
    "/api/stripe/webhook",
    express.raw({ type: "application/json" }),
    async (req, res) => {
      const signature = req.headers["stripe-signature"];

      if (!signature) {
        return res.status(400).json({ error: "Missing stripe-signature" });
      }

      try {
        const sig = Array.isArray(signature) ? signature[0] : signature;

        if (!Buffer.isBuffer(req.body)) {
          console.error("STRIPE WEBHOOK ERROR: req.body is not a Buffer");
          return res.status(500).json({ error: "Webhook processing error" });
        }

        await WebhookHandlers.processWebhook(req.body as Buffer, sig);

        res.status(200).json({ received: true });
      } catch (error: any) {
        console.error("Webhook error:", error.message);
        res.status(400).json({ error: "Webhook processing error" });
      }
    }
  );

  // JSON body parsing must be set up BEFORE auth routes
  app.use(
    express.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      },
    })
  );

  app.use(express.urlencoded({ extended: false }));

  await setupAuth(app);

  await initStripe();

  app.use((req, res, next) => {
    const start = Date.now();
    const path = req.path;
    let capturedJsonResponse: Record<string, any> | undefined = undefined;

    const originalResJson = res.json;
    res.json = function (bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };

    res.on("finish", () => {
      const duration = Date.now() - start;
      if (path.startsWith("/api")) {
        let logLine = `${req.method} ${path} ${res.statusCode} in ${duration}ms`;
        if (capturedJsonResponse) {
          logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
        }

        log(logLine);
      }
    });

    next();
  });

  await registerRoutes(httpServer, app);

  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";

    res.status(status).json({ message });
    throw err;
  });

  // Detect production: REPLIT_DEPLOYMENT is set to "1" in deployed apps
  const isProduction = process.env.REPLIT_DEPLOYMENT === "1" || process.env.NODE_ENV === "production";
  
  if (isProduction) {
    log(`Running in PRODUCTION mode (REPLIT_DEPLOYMENT=${process.env.REPLIT_DEPLOYMENT}, NODE_ENV=${process.env.NODE_ENV})`);
    serveStatic(app);
  } else {
    log(`Running in DEVELOPMENT mode`);
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  const port = parseInt(process.env.PORT || "5000", 10);
  httpServer.listen(
    {
      port,
      host: "0.0.0.0",
      reusePort: true,
    },
    () => {
      log(`serving on port ${port}`);
    }
  );
})();
// Security Middleware Configuration
// Add this to your server/index.ts file

import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import cors from 'cors';

// ==========================================
// 1. HELMET - Security Headers
// ==========================================
// Add this RIGHT AFTER creating your Express app
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:"],
      frameSrc: ["https://js.stripe.com", "https://hooks.stripe.com"],
      connectSrc: ["'self'", "https://api.stripe.com"],
    },
  },
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true,
  },
}));

// ==========================================
// 2. CORS - Cross-Origin Resource Sharing
// ==========================================
const allowedOrigins = [
  'https://www.myeasypass.net',
  'https://myeasypass.net',
  'https://easy-pass-ht1x.onrender.com',
  process.env.NODE_ENV === 'development' ? 'http://localhost:5000' : null,
].filter(Boolean);

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman, etc.)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[CORS] Blocked request from origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ==========================================
// 3. RATE LIMITING
// ==========================================

// General API rate limit - 100 requests per 15 minutes
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    console.warn(`[Rate Limit] IP ${req.ip} exceeded API limit`);
    res.status(429).json({
      error: 'Too many requests',
      message: 'Please try again later.',
      retryAfter: 900, // 15 minutes in seconds
    });
  },
});

// Strict rate limit for authentication endpoints - 5 attempts per 15 minutes
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: 'Too many login attempts, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true, // Don't count successful logins
  handler: (req, res) => {
    console.warn(`[Rate Limit] IP ${req.ip} exceeded auth limit`);
    res.status(429).json({
      error: 'Too many attempts',
      message: 'Too many login attempts. Please try again in 15 minutes.',
      retryAfter: 900,
    });
  },
});

// Apply rate limiters
app.use('/api/', apiLimiter); // General API rate limiting
app.use('/api/login', authLimiter); // Strict auth rate limiting
app.use('/api/register', authLimiter);
app.use('/api/reset-password', authLimiter);

// ==========================================
// 4. SECURE SESSION COOKIES
// ==========================================
// Update your session configuration to this:
import session from 'express-session';

app.use(session({
  secret: process.env.SESSION_SECRET!,
  resave: false,
  saveUninitialized: false,
  name: 'sessionId', // Don't use default 'connect.sid'
  cookie: {
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    httpOnly: true, // Not accessible via JavaScript
    sameSite: 'lax', // CSRF protection (use 'strict' for more security)
    maxAge: 24 * 60 * 60 * 1000, // 24 hours
    domain: process.env.NODE_ENV === 'production' ? '.myeasypass.net' : undefined,
  },
  proxy: true, // Trust Render's proxy
}));

// ==========================================
// 5. LOGGING MIDDLEWARE
// ==========================================
// Add request logging
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    const logLevel = res.statusCode >= 400 ? 'WARN' : 'INFO';
    
    console.log(`[${logLevel}] ${req.method} ${req.path} ${res.statusCode} - ${duration}ms - IP: ${req.ip}`);
    
    // Log failed auth attempts
    if (req.path.includes('/login') && res.statusCode === 401) {
      console.warn(`[Security] Failed login attempt from IP: ${req.ip}`);
    }
  });
  
  next();
});

// ==========================================
// 6. ERROR HANDLER (Add at the END of all routes)
// ==========================================
app.use((err: any, req: any, res: any, next: any) => {
  // Log the error
  console.error('[Error]', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.path,
    method: req.method,
    ip: req.ip,
    timestamp: new Date().toISOString(),
  });
  
  // Don't leak error details in production
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : err.message;
  
  res.status(err.status || 500).json({
    error: message,
  });
});
// Stripe Webhook Security
// Add this to your Stripe webhook route

import Stripe from 'stripe';
import express from 'express';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2023-10-16',
});

// IMPORTANT: This route must use raw body parser, not JSON
// Add this BEFORE your other middleware
app.post('/api/stripe/webhook',
  express.raw({ type: 'application/json' }), // Use raw body for signature verification
  async (req, res) => {
    const sig = req.headers['stripe-signature'] as string;
    
    if (!sig) {
      console.error('[Stripe Webhook] No signature provided');
      return res.status(400).send('No signature');
    }
    
    let event: Stripe.Event;
    
    try {
      // Verify the webhook signature
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
      
      console.log(`[Stripe Webhook] Verified event: ${event.type}`);
    } catch (err: any) {
      console.error(`[Stripe Webhook] Signature verification failed: ${err.message}`);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }
    
    // Handle the verified event
    try {
      switch (event.type) {
        case 'checkout.session.completed':
          const session = event.data.object;
          console.log(`[Stripe] Payment successful: ${session.id}`);
          // Handle successful payment
          break;
          
        case 'customer.subscription.created':
        case 'customer.subscription.updated':
        case 'customer.subscription.deleted':
          const subscription = event.data.object;
          console.log(`[Stripe] Subscription ${event.type}: ${subscription.id}`);
          // Handle subscription changes
          break;
          
        case 'invoice.payment_succeeded':
        case 'invoice.payment_failed':
          const invoice = event.data.object;
          console.log(`[Stripe] Invoice ${event.type}: ${invoice.id}`);
          // Handle invoice events
          break;
          
        default:
          console.log(`[Stripe] Unhandled event type: ${event.type}`);
      }
      
      // Return 200 to acknowledge receipt
      res.json({ received: true });
      
    } catch (err: any) {
      console.error(`[Stripe Webhook] Error processing event: ${err.message}`);
      res.status(500).json({ error: 'Webhook processing failed' });
    }
  }
);

// ==========================================
// STRIPE WEBHOOK SETUP IN STRIPE DASHBOARD
// ==========================================
/*
1. Go to: https://dashboard.stripe.com/webhooks
2. Click "Add endpoint"
3. Endpoint URL: https://www.myeasypass.net/api/stripe/webhook
4. Select events to listen to:
   - checkout.session.completed
   - customer.subscription.created
   - customer.subscription.updated
   - customer.subscription.deleted
   - invoice.payment_succeeded
   - invoice.payment_failed
5. Click "Add endpoint"
6. Copy the "Signing secret" (starts with whsec_)
7. Add to Render environment as: STRIPE_WEBHOOK_SECRET
*/
// Input Validation & Sanitization
// Add these to your route handlers

import { body, validationResult } from 'express-validator';

// ==========================================
// VALIDATION MIDDLEWARE
// ==========================================

// Helper function to handle validation errors
const handleValidationErrors = (req: any, res: any, next: any) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    console.warn('[Validation] Failed:', errors.array());
    return res.status(400).json({ 
      error: 'Validation failed',
      details: errors.array() 
    });
  }
  next();
};

// ==========================================
// REGISTRATION VALIDATION
// ==========================================
export const registerValidation = [
  body('email')
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail()
    .trim(),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
  
  body('firstName')
    .trim()
    .escape()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be 1-50 characters'),
  
  body('lastName')
    .trim()
    .escape()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be 1-50 characters'),
  
  handleValidationErrors,
];

// Use it like this:
// app.post('/api/register', registerValidation, async (req, res) => { ... });

// ==========================================
// LOGIN VALIDATION
// ==========================================
export const loginValidation = [
  body('email')
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail()
    .trim(),
  
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  
  handleValidationErrors,
];

// ==========================================
// PASSWORD RESET VALIDATION
// ==========================================
export const passwordResetValidation = [
  body('email')
    .isEmail()
    .withMessage('Invalid email address')
    .normalizeEmail()
    .trim(),
  
  handleValidationErrors,
];

export const passwordResetConfirmValidation = [
  body('token')
    .notEmpty()
    .withMessage('Reset token is required')
    .isLength({ min: 20, max: 200 })
    .withMessage('Invalid reset token'),
  
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
  
  handleValidationErrors,
];

// ==========================================
// PROFILE UPDATE VALIDATION
// ==========================================
export const profileUpdateValidation = [
  body('firstName')
    .optional()
    .trim()
    .escape()
    .isLength({ min: 1, max: 50 })
    .withMessage('First name must be 1-50 characters'),
  
  body('lastName')
    .optional()
    .trim()
    .escape()
    .isLength({ min: 1, max: 50 })
    .withMessage('Last name must be 1-50 characters'),
  
  body('phone')
    .optional()
    .trim()
    .isMobilePhone('any')
    .withMessage('Invalid phone number'),
  
  handleValidationErrors,
];

// ==========================================
// USAGE EXAMPLES
// ==========================================
/*
// In your routes file:

import {
  registerValidation,
  loginValidation,
  passwordResetValidation,
  profileUpdateValidation,
} from './validation';

app.post('/api/register', registerValidation, async (req, res) => {
  // If we reach here, validation passed
  const { email, password, firstName, lastName } = req.body;
  // ... register user
});

app.post('/api/login', loginValidation, async (req, res) => {
  const { email, password } = req.body;
  // ... authenticate user
});

app.post('/api/reset-password', passwordResetValidation, async (req, res) => {
  const { email } = req.body;
  // ... send reset email
});

app.patch('/api/profile', profileUpdateValidation, async (req, res) => {
  const updates = req.body;
  // ... update profile
});
*/
