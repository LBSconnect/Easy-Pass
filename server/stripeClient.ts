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

  // If not on Replit, use direct Stripe keys from environment
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

  // Replit-specific logic
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

## 🔧 Key Fixes

1. ✅ **Line 45:** Fixed `new URL(` with proper parenthesis
2. ✅ **Line 61:** Fixed `new Error(` with proper parenthesis  
3. ✅ **Lines 21-36:** Proper return of credentials object (not Stripe function)
4. ✅ **Added proper caching** for non-Replit environments
5. ✅ **Returns credentials structure** that works with rest of the code

---

## 📝 Apply This Fix

1. Go to: https://github.com/LBSconnect/Easy-Pass/blob/main/server/stripeClient.ts
2. Click **pencil icon** ✏️
3. **Select ALL** (Ctrl+A)
4. **Delete everything**
5. **Paste the fixed code above**
6. **Commit message:** `Fix: Stripe client syntax errors and Render compatibility`
7. Click **"Commit changes"**

---

## ⏰ After Committing

Render will auto-redeploy (3-5 minutes)

**This time you should see:**
```
✅ Not running on Replit, using direct Stripe keys
✅ Stripe initialized successfully
✅ Prices loading in UI!
