import { getCachedStripeClient } from "./stripeClient";
import { updateSubscriptionByCustomerId } from "./webhookHandlers";
import { storage } from "./storage";

export interface ReconciliationSummary {
  checked: number;
  updated: number;
  skipped: number;
  errors: number;
}

/**
 * Re-checks every user's subscription status directly against Stripe and
 * corrects our local copy if it's drifted (e.g. a webhook was ever missed
 * or failed to deliver - see the July 2026 webhook outage incident).
 *
 * This is the safety net behind the real-time webhook flow, not a
 * replacement for it: Stripe webhooks are still what keeps the dashboard
 * current minute-to-minute. This job exists so that a missed/failed event
 * doesn't leave a user's access silently wrong indefinitely.
 *
 * Deliberately skips two kinds of users so it can never clobber state that
 * didn't come from a real Stripe subscription:
 *   - Users with no stripeCustomerId at all (never checked out).
 *   - Users with subscriptionStatus "active" but no stripeSubscriptionId -
 *     that combination only happens via admin-granted comp/manual access
 *     (see grantComplimentaryAccess in routes.ts), which this job must
 *     never silently downgrade just because Stripe has no matching
 *     subscription for them.
 */
export async function reconcileAllSubscriptions(): Promise<ReconciliationSummary> {
  const summary: ReconciliationSummary = { checked: 0, updated: 0, skipped: 0, errors: 0 };

  const stripe = await getCachedStripeClient();
  const allUsers = await storage.getAllUsers();

  for (const user of allUsers) {
    const profile = user.profile;
    if (!profile?.stripeCustomerId) {
      summary.skipped++;
      continue;
    }
    if (profile.subscriptionStatus === "active" && !profile.stripeSubscriptionId) {
      // Comp/manual grant - not Stripe-managed, leave it alone.
      summary.skipped++;
      continue;
    }

    summary.checked++;

    try {
      const subscriptions = await stripe.subscriptions.list({
        customer: profile.stripeCustomerId,
        limit: 10,
      });

      const activeSubscription = subscriptions.data.find(
        (s) => s.status === "active" || s.status === "trialing"
      );

      if (activeSubscription) {
        await updateSubscriptionByCustomerId(profile.stripeCustomerId, activeSubscription);
        summary.updated++;
      } else if (profile.subscriptionStatus !== "canceled") {
        await storage.updateProfile(user.id, {
          subscriptionStatus: "canceled",
          allowedCategories: undefined,
        });
        summary.updated++;
      }
    } catch (error: any) {
      summary.errors++;
      console.error(`[Subscription Reconciliation] Failed to reconcile user ${user.id}:`, error.message);
    }
  }

  return summary;
}

const RECONCILIATION_INTERVAL_MS = 24 * 60 * 60 * 1000; // daily
const INITIAL_DELAY_MS = 60 * 1000; // let the server finish booting first

/**
 * Starts the daily reconciliation loop. Safe to call even if Stripe isn't
 * configured for this environment - reconcileAllSubscriptions() will throw
 * on the first getCachedStripeClient() call and that's caught and logged,
 * not fatal.
 */
export function scheduleSubscriptionReconciliation(): void {
  const runAndLog = async () => {
    try {
      console.log("[Subscription Reconciliation] Starting daily sync...");
      const summary = await reconcileAllSubscriptions();
      console.log(
        `[Subscription Reconciliation] Done. Checked ${summary.checked}, updated ${summary.updated}, ` +
        `skipped ${summary.skipped} (no Stripe customer or comp access), errors ${summary.errors}.`
      );
    } catch (error: any) {
      console.log("[Subscription Reconciliation] Skipped:", error.message);
    }
  };

  setTimeout(runAndLog, INITIAL_DELAY_MS);
  setInterval(runAndLog, RECONCILIATION_INTERVAL_MS);
}
