/**
 * Sending the one reminder email a student agreed to receive.
 *
 * HOW IT IS TRIGGERED
 *
 * There is no scheduler inside this app. The dispatcher is exposed as a route
 * guarded by a shared secret, so a Render cron job or a GitHub Action calls
 * it on whatever schedule the operator sets. That is stated plainly rather
 * than implied: with nothing configured to call it, no reminder emails go
 * out, and someone reading this should know that rather than assume a cron
 * exists somewhere.
 *
 * THE RULES THAT PROTECT THE STUDENT
 *
 *   - Opt-in only. The column is nullable with no default, so nobody who
 *     already existed was opted in by the migration.
 *   - One email per student per window, enforced by a timestamp in the
 *     database rather than by the caller's discipline. Running the dispatcher
 *     twice sends nothing the second time.
 *   - At most one reminder per email, and only about something that will have
 *     passed by next week. A full notebook does not earn an email.
 *   - An unsubscribe link in every message, working without a login.
 *   - A student with nothing worth saying gets no email at all, and their
 *     timestamp is left alone so they are still eligible tomorrow.
 */

import { randomBytes } from "crypto";
import { storage, type ReminderRecipient } from "./storage";
import { getResendClient } from "./resendClient";
import { emailReminder, type Reminder } from "@shared/studyReminders";
import { reminderCopy } from "@shared/reminderCopy";

/** How long between reminder emails to the same student. */
export const REMINDER_INTERVAL_DAYS = 7;

/** Emails sent in one run, so a single call cannot fan out unboundedly. */
export const MAX_EMAILS_PER_RUN = 200;

export interface DispatchResult {
  considered: number;
  sent: number;
  /** Students with nothing worth an email. Not a failure. */
  skipped: number;
  failed: number;
  /** True when the provider is not configured, so nothing could be sent. */
  emailUnavailable: boolean;
}

function appOrigin(): string {
  const host = process.env.APP_DOMAIN || "www.myeasypass.net";
  return `https://${host}`;
}

/** A token that only ever turns reminders off. */
export function newUnsubscribeToken(): string {
  return randomBytes(24).toString("hex");
}

export function renderReminderEmail(
  recipient: ReminderRecipient,
  reminder: Reminder,
  unsubscribeUrl: string,
): { subject: string; html: string; text: string } {
  const lang = recipient.preferredLanguage;
  const copy = reminderCopy(reminder, lang);
  const origin = appOrigin();
  const link = `${origin}${copy.href}`;
  const greeting = recipient.firstName
    ? `${lang === "es" ? "Hola" : "Hi"} ${recipient.firstName},`
    : `${lang === "es" ? "Hola," : "Hi,"}`;

  const buttonLabel = lang === "es" ? "Abrir MyEasyPass" : "Open MyEasyPass";
  const unsubscribeLabel =
    lang === "es"
      ? "Dejar de recibir estos recordatorios"
      : "Stop receiving these reminders";
  // Said in every message, because a student should never have to wonder why
  // they are getting an email from us.
  const because =
    lang === "es"
      ? "Recibes esto porque activaste los recordatorios de estudio en tu perfil."
      : "You are getting this because you turned on study reminders in your profile.";

  const html = `
<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; margin-bottom: 30px;">
    <h1 style="color: #2563eb; margin: 0;">MyEasyPass</h1>
    <p style="color: #666; margin: 5px 0 0 0;">Texas Licensing Exam Prep</p>
  </div>
  <p style="color: #333; line-height: 1.6;">${greeting}</p>
  <p style="color: #333; line-height: 1.6; font-size: 18px;"><strong>${copy.title}</strong></p>
  <p style="color: #333; line-height: 1.6;">${copy.action}</p>
  <div style="text-align: center; margin: 30px 0;">
    <a href="${link}" style="background-color: #2563eb; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: 600; font-size: 16px;">
      ${buttonLabel}
    </a>
  </div>
  <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
  <p style="color: #999; font-size: 12px; text-align: center;">
    ${because}<br/>
    <a href="${unsubscribeUrl}" style="color: #2563eb;">${unsubscribeLabel}</a>
  </p>
</div>`.trim();

  const text = [
    greeting,
    "",
    copy.title,
    copy.action,
    link,
    "",
    because,
    `${unsubscribeLabel}: ${unsubscribeUrl}`,
  ].join("\n");

  return { subject: copy.title, html, text };
}

/**
 * Send whatever is due.
 *
 * @param now injected so a run is testable and so the window is computed once
 *   rather than drifting across a long batch.
 */
export async function dispatchReminderEmails(now = new Date()): Promise<DispatchResult> {
  const result: DispatchResult = {
    considered: 0,
    sent: 0,
    skipped: 0,
    failed: 0,
    emailUnavailable: false,
  };

  const resend = await getResendClient();
  if (!resend) {
    // Not an error. A deployment without email credentials simply does not
    // send reminders, and saying so is more useful than a 500.
    result.emailUnavailable = true;
    return result;
  }

  const cutoff = new Date(now.getTime() - REMINDER_INTERVAL_DAYS * 24 * 60 * 60 * 1000);
  const recipients = await storage.getReminderRecipients(cutoff);
  result.considered = recipients.length;

  for (const recipient of recipients.slice(0, MAX_EMAILS_PER_RUN)) {
    try {
      const [missedIds, results, lastAnsweredAt] = await Promise.all([
        storage.getMissedQuestionIds(recipient.userId),
        storage.getExamResults(recipient.userId),
        storage.getLastAnsweredAt(recipient.userId),
      ]);

      const reminder = emailReminder({
        now,
        examDate: recipient.examDate,
        subscriptionEndDate: recipient.subscriptionEndDate,
        hasActiveSubscription: recipient.hasActiveSubscription,
        lastAnsweredAt,
        missedQuestionCount: missedIds.length,
        totalAttempts: results.length,
      });

      if (!reminder) {
        // Nothing worth an email. The timestamp is deliberately not touched,
        // so they are still eligible as soon as something is.
        result.skipped++;
        continue;
      }

      let token = recipient.unsubscribeToken;
      if (!token) {
        token = newUnsubscribeToken();
        await storage.setUnsubscribeToken(recipient.userId, token);
      }
      const unsubscribeUrl = `${appOrigin()}/api/reminders/unsubscribe?token=${token}`;

      const { subject, html, text } = renderReminderEmail(recipient, reminder, unsubscribeUrl);

      const sendResult = await resend.client.emails.send({
        from: resend.fromEmail,
        to: recipient.email,
        subject,
        html,
        text,
        // Lets a mail client offer one-click unsubscribe without opening the
        // message, which is both kinder and what the large providers expect.
        headers: {
          "List-Unsubscribe": `<${unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      });

      // The Resend SDK reports a rejected send by returning an error rather
      // than throwing, so a bad API key or a blocked address arrives here
      // looking exactly like success. Without this check a student would be
      // marked as emailed for the week having received nothing at all.
      if (sendResult?.error) {
        console.error(`[Reminders] Provider rejected send for ${recipient.userId}:`, sendResult.error);
        result.failed++;
        continue;
      }

      // Recorded after the send, so a failure leaves them eligible for the
      // next run rather than silently skipping their week.
      await storage.markReminderEmailSent(recipient.userId, now);
      result.sent++;
    } catch (error) {
      // One student's failure must not stop the batch.
      console.error(`[Reminders] Failed for ${recipient.userId}:`, error);
      result.failed++;
    }
  }

  return result;
}
