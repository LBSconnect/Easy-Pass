/**
 * Reporting a subscription to Google Ads, once, and only when it is real.
 *
 * WHAT THIS REPLACES
 *
 * The conversion used to fire from the app entrypoint whenever the URL looked
 * like `/dashboard?success=true`. That is a claim about the address bar, not
 * about a subscription, and it counted four things it should not have:
 *
 *   - anyone who opens that URL directly, signed in or not
 *   - a reload of the success page, again on every reload
 *   - a Stripe return where the payment later failed to activate
 *   - a returning subscriber who happened to arrive with the parameter set
 *
 * Bidding on those numbers means bidding on noise, and the noise flatters us:
 * every one of those inflates conversions, so the reported cost per
 * subscription comes out lower than the real one.
 *
 * WHAT REPLACES IT
 *
 * The application already asks the server to reconcile the subscription with
 * Stripe when a student returns from checkout, and the server already answers
 * with whether it found an active one. That answer is the fact worth
 * reporting, so the conversion now hangs off it instead of off the URL.
 *
 * DEDUPLICATION
 *
 * Keyed by subscription id in localStorage, so a reload, a re-render, a second
 * tab or a visit next week all report nothing further for a subscription
 * already counted. A genuinely new subscription - someone who cancelled and
 * came back - has a new id and is counted again, which is correct.
 *
 * WHAT IS SENT
 *
 * The conversion label, a value, and a currency. No email, no name, no user or
 * customer id, no subscription id. The id stays in this browser as a dedupe
 * key and is never given to Google.
 */

const CONVERSION_SEND_TO = "AW-18360793283/gQDnCM3rg-UcEMPxjbNE";
const REPORTED_KEY = "myeasypass:aw-subscribe-reported:v1";

/**
 * Kept at the value Google's conversion action is already configured with.
 *
 * The real transaction amount is not available here: the sync response
 * reports what the subscription *is*, not what was charged for it, and the
 * charge lives on a Stripe invoice this client never sees. Sending a made-up
 * amount would be worse than sending a consistent placeholder, because the
 * ratios Google optimises against would then be wrong rather than merely
 * uninformative. Wiring the real amount through is a deliberate follow-up,
 * not something to guess at here.
 */
const CONVERSION_VALUE = 1.0;

function alreadyReported(subscriptionId: string): boolean {
  try {
    const raw = localStorage.getItem(REPORTED_KEY);
    if (!raw) return false;
    const ids = JSON.parse(raw) as unknown;
    return Array.isArray(ids) && ids.includes(subscriptionId);
  } catch {
    // A browser that refuses storage cannot be deduplicated across reloads.
    // Reporting a duplicate is the lesser fault against losing the conversion
    // entirely, so this reports and moves on.
    return false;
  }
}

function markReported(subscriptionId: string): void {
  try {
    const raw = localStorage.getItem(REPORTED_KEY);
    const parsed = raw ? (JSON.parse(raw) as unknown) : [];
    const ids = Array.isArray(parsed) ? parsed.filter((id) => typeof id === "string") : [];
    if (!ids.includes(subscriptionId)) ids.push(subscriptionId);
    // A handful is plenty. Nobody holds enough distinct subscriptions for this
    // to grow, and an unbounded list in storage is a slow leak.
    localStorage.setItem(REPORTED_KEY, JSON.stringify(ids.slice(-20)));
  } catch {
    // Storage refused. The conversion still fired, which is the important half.
  }
}

/** The gtag shim installed by the entrypoint. Absent if the tag was blocked. */
function pushToDataLayer(args: unknown[]): boolean {
  const layer = (window as unknown as { dataLayer?: unknown[][] }).dataLayer;
  if (!Array.isArray(layer)) return false;
  layer.push(args);
  return true;
}

export interface VerifiedSubscription {
  /** Stripe's id for the subscription the server just verified. */
  subscriptionId: string;
  /** The server's own verdict. Anything but true must not be reported. */
  synced: boolean;
  /** Stripe's status. Only a live subscription counts. */
  status?: string | null;
}

const COUNTABLE_STATUSES = new Set(["active", "trialing"]);

/**
 * Report a verified subscription, if it is one and has not been reported.
 *
 * Returns whether the conversion was sent, which is what the tests assert
 * against - a function that silently does nothing is indistinguishable from a
 * broken one otherwise.
 */
export function reportVerifiedSubscription(subscription: VerifiedSubscription): boolean {
  if (!subscription.synced) return false;
  if (!subscription.subscriptionId) return false;
  if (subscription.status && !COUNTABLE_STATUSES.has(subscription.status)) return false;
  if (alreadyReported(subscription.subscriptionId)) return false;

  const sent = pushToDataLayer([
    "event",
    "conversion",
    {
      send_to: CONVERSION_SEND_TO,
      value: CONVERSION_VALUE,
      currency: "USD",
    },
  ]);

  // Only remember it if it actually went. Otherwise an ad-blocked first visit
  // would suppress the conversion on every later one too.
  if (sent) markReported(subscription.subscriptionId);
  return sent;
}

/** Test seam. Not used by the application. */
export const __testing = { REPORTED_KEY, CONVERSION_SEND_TO, CONVERSION_VALUE };
