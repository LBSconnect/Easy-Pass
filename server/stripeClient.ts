import Stripe from 'stripe';

let connectionSettings: any;
let cachedCredentials: { publishableKey: string; secretKey: string } | null = null;
let credentialsFetchedAt: number = 0;
const CACHE_DURATION_MS = 5 * 60 * 1000;

async function getCredentials() {
  if (cachedCredentials && (Date.now() - credentialsFetchedAt) < CACHE_DURATION_MS) {
    return cachedCredentials;
  }

  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
      ? 'depl ' + process.env.WEB_REPL_RENEWAL
      : null;

  if (!xReplitToken) {
    console.log('Not running on Replit, using direct Stripe keys');
    
    const stripeSecret = process.env.STRIPE_SECRET_KEY;
    const stripePublishable = process.env.STRIPE_PUBLISHABLE_KEY;
    
    if (!stripeSecret) {
      throw new Error('STRIPE_SECRET_KEY not found in environment variables');
    }
    
    cachedCredentials = {
      publishableKey: stripePublishable || '',
      secretKey: stripeSecret
    };
    credentialsFetchedAt = Date.now();
    
    return cachedCredentials;
  }

  const connectorName = 'stripe';
  const isProduction = process.env.REPLIT_DEPLOYMENT === '1';
  const targetEnvironment = isProduction ? 'production' : 'development';
  
  const url = new URL(`https://${hostname}/api/v2/connection`);
  url.searchParams.set('include_secrets', 'true');
  url.searchParams.set('connector_names', connectorName);
  url.searchParams.set('environment', targetEnvironment);

  const response = await fetch(url.toString(), {
    headers: {
      'Accept': 'application/json',
      'X_REPLIT_TOKEN': xReplitToken
    }
  });

  const data = await response.json();
  
  connectionSettings = data.items?.[0];
  
  if (!connectionSettings || (!connectionSettings.settings.publishable || !connectionSettings.settings.secret)) {
    throw new Error(`Stripe ${targetEnvironment} connection not found`);
  }

  cachedCredentials = {
    publishableKey: connectionSettings.settings.publishable,
    secretKey: connectionSettings.settings.secret,
  };
  credentialsFetchedAt = Date.now();
  
  return cachedCredentials;
}

let cachedStripeClient: Stripe | null = null;

export async function getCachedStripeClient(): Promise<Stripe> {
  if (cachedStripeClient && cachedCredentials && (Date.now() - credentialsFetchedAt) < CACHE_DURATION_MS) {
    return cachedStripeClient;
  }

  const { secretKey } = await getCredentials();
  cachedStripeClient = new Stripe(secretKey);
  
  return cachedStripeClient;
}

export async function getUncachableStripeClient() {
  const { secretKey } = await getCredentials();
  return new Stripe(secretKey);
}

export async function getStripePublishableKey() {
  const { publishableKey } = await getCredentials();
  return publishableKey;
}

export async function getStripeSecretKey() {
  const { secretKey } = await getCredentials();
  return secretKey;
}

let stripeSync: any = null;

export async function getStripeSync() {
  if (!stripeSync) {
    const { StripeSync } = await import('stripe-replit-sync');
    const secretKey = await getStripeSecretKey();
    stripeSync = new StripeSync({
      poolConfig: {
        connectionString: process.env.DATABASE_URL!,
        max: 2,
      },
      stripeSecretKey: secretKey,
    });
  }
  return stripeSync;
}
```

---

## 🔧 TEAM ACTION PLAN

### **Code Quality Engineer:**
**Step 1:** Go to GitHub and view the CURRENT stripeClient.ts
- URL: https://github.com/LBSconnect/Easy-Pass/blob/main/server/stripeClient.ts
- You'll probably see markdown text mixed in around line 120-130
- This is the problem!

### **DevOps Engineer:**
**Step 2:** Replace the ENTIRE file with clean code above
1. Click pencil icon
2. Select ALL (Ctrl+A)
3. Delete everything
4. Paste ONLY the clean TypeScript code (no markdown, no explanations)
5. Commit: "Fix: Remove documentation text from source code"

### **Backend Developer:**
**Step 3:** After deployment, verify Stripe integration
- Check logs for "Stripe initialized successfully"
- Test pricing page loads
- Verify no "Neither apiKey" errors

---

## ⚠️ PRODUCTION STRIPE KEY WARNING

### **Lead Developer:**
**"CRITICAL: User is using sk_live_ (production) keys!"**

**This means:**
- ❌ Real charges will be processed
- ❌ Test cards won't work (4242 4242...)
- ❌ Actual customer credit cards required
- ⚠️ **Make sure this is intentional!**

**Recommendation:**
- For testing: Use `sk_test_` keys
- For production: Keep `sk_live_` but ensure:
  - Stripe account fully verified
  - Business info complete
  - Ready for real transactions

---

## 📋 CHECKLIST

### **Team Consensus - Do These Now:**

1. ✅ **View current stripeClient.ts on GitHub** - confirm it has markdown text
2. ✅ **Replace with clean code** - no documentation, only TypeScript
3. ✅ **Commit changes** - let Render redeploy
4. ✅ **Verify Stripe keys** - confirm sk_live_ is intentional
5. ✅ **Watch deployment** - should succeed this time
6. ✅ **Test app** - Stripe prices should load

---

## 🎯 EXPECTED OUTCOME

**After fixing:**
```
✅ Build successful
✅ Not running on Replit, using direct Stripe keys  
✅ Stripe client initialized with sk_live_xxxxx
✅ Prices API returns actual pricing data
✅ App fully functional
