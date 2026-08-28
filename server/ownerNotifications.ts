/**
 * Emails to the site owner about business events.
 *
 * First (and so far only) notice: a new verified subscription payment. It is
 * sent from exactly one place - the moment recordPaymentHistory writes a NEW
 * payment row - so its idempotence is inherited from the payment table's
 * own keying on Stripe's payment id: a redelivered webhook that skips the
 * duplicate insert never re-sends the notice either.
 *
 * Best-effort by contract. The caller wraps this in try/catch and the
 * function itself never throws for an unconfigured mailbox or provider:
 * losing a courtesy email must never fail a Stripe webhook, because a non-2xx
 * makes Stripe retry an invoice that was already recorded.
 */

import { getResendClient } from "./resendClient";

export interface NewSubscriberNotice {
  subscriberEmail: string;
  amountCents: number;
  currency: string;
  plan?: string | null;
  subscriptionType?: string | null;
  categories?: string[] | null;
  /** How the payment was tied to the account - shown so an operator can spot
   *  a weakening link (email-matched today means metadata missing upstream). */
  matchedBy?: string;
}

export async function sendNewSubscriberNotice(notice: NewSubscriberNotice): Promise<boolean> {
  const to = process.env.ADMIN_EMAIL;
  if (!to) {
    console.log("[OwnerNotice] ADMIN_EMAIL not set; new-subscriber notice not sent");
    return false;
  }

  const resend = await getResendClient();
  if (!resend) {
    console.log("[OwnerNotice] Email provider not configured; new-subscriber notice not sent");
    return false;
  }

  const amount = `$${(notice.amountCents / 100).toFixed(2)} ${notice.currency.toUpperCase()}`;
  const lines = [
    `A subscription payment just came through on MyEasyPass.`,
    ``,
    `Subscriber: ${notice.subscriberEmail}`,
    `Amount:     ${amount}`,
    `Plan:       ${notice.plan ?? "(unknown)"}${notice.subscriptionType ? ` (${notice.subscriptionType})` : ""}`,
    `Exams:      ${notice.categories?.length ? notice.categories.join(", ") : "(not recorded)"}`,
    `Matched by: ${notice.matchedBy ?? "customer id"}`,
    ``,
    `Recorded in the site's payment history; the admin panel's Total Revenue`,
    `now includes it. Stripe remains the authoritative ledger.`,
  ];

  const result = await resend.client.emails.send({
    from: resend.fromEmail,
    to,
    subject: `New MyEasyPass subscriber: ${notice.subscriberEmail} (${amount})`,
    text: lines.join("\n"),
  });

  if (result?.error) {
    console.error("[OwnerNotice] Provider rejected new-subscriber notice:", result.error);
    return false;
  }

  console.log(`[OwnerNotice] New-subscriber notice sent to ${to}`);
  return true;
}
