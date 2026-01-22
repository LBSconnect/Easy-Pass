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
        const result = await stripeSync.findOrCreateManagedWebhook(
          `${webhookBaseUrl}/api/stripe/webhook`
        );
        const webhookUrl = result?.webhook?.url || result?.url || webhookBaseUrl + "/api/stripe/webhook";
        console.log(`Webhook configured: ${webhookUrl}`);
      } catch (webhookErr) {
        console.log("Webhook setup skipped:", (webhookErr as Error).message);
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
