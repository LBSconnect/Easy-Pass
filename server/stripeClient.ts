import Stripe from 'stripe';

let cachedStripeClient: Stripe | null = null;

function getStripeSecretKey(): string {
  const secretKey = process.env.STRIPE_SECRET_KEY;
  if (!secretKey) {
    throw new Error('STRIPE_SECRET_KEY not found in environment variables');
  }
  return secretKey;
}

export async function getCachedStripeClient(): Promise<Stripe> {
  if (!cachedStripeClient) {
    cachedStripeClient = new Stripe(getStripeSecretKey());
  }
  return cachedStripeClient;
}

export async function getUncachableStripeClient() {
  return new Stripe(getStripeSecretKey());
}

export function getWebhookUrl(): string | null {
  if (process.env.NODE_ENV !== "production") {
    return null;
  }
  // Must be the www subdomain: the naked domain 307-redirects to www at the
  // DNS/CDN layer, and Stripe does not follow redirects when delivering
  // webhooks, so a naked-domain URL here means every webhook silently fails.
  return "https://www.myeasypass.net/api/stripe/webhook";
}
