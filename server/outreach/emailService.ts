/**
 * The one seam between the outreach engine and any email provider.
 *
 * The engine talks to this interface and nothing else. Resend - already this
 * app's provider for password resets and study reminders - sits behind it in
 * one class; swapping providers, or running the whole engine against the
 * recording fake in tests, touches no engine code. Credentials come from the
 * environment at call time and are never stored, logged, or passed around.
 */

import { Resend } from "resend";
import {
  DEFAULT_DAILY_NEW_PROSPECT_LIMIT,
  MAX_DAILY_NEW_PROSPECT_LIMIT,
} from "@shared/outreachCampaign";

export interface OutboundEmail {
  to: string;
  subject: string;
  text: string;
  headers?: Record<string, string>;
  replyTo?: string;
}

export type SendOutcome =
  | { ok: true; providerMessageId: string | null }
  | { ok: false; error: string };

export interface OutreachEmailService {
  /** Truthful readiness: false means a send would certainly fail. */
  isConfigured(): boolean;
  send(email: OutboundEmail): Promise<SendOutcome>;
}

export interface OutreachEmailConfig {
  /** Master switch. Everything refuses while this is off. */
  enabled: boolean;
  /** e.g. "Sean at MyEasyPass <partners@myeasypass.net>". Required to send. */
  fromEmail: string | null;
  /** Where replies land. Defaults to the from address. */
  replyTo: string | null;
  /** Where interested-prospect alerts go. */
  alertEmail: string | null;
  senderName: string;
  dailyNewProspectLimit: number;
  /**
   * Circuit breakers: when tripped, the WHOLE campaign refuses to run, not
   * just one address. Deliberate defaults: a single spam complaint in the
   * window pauses everything until a person looks - complaints are how
   * domains die, and continuing blindly after one is how they die faster.
   */
  breakers: {
    /** Spam complaints tolerated in the window before pausing. Default 0. */
    spamComplaintLimit: number;
    /** Hard-bounce fraction of sends that pauses the campaign. */
    hardBounceRatioLimit: number;
    /** Bounce ratio is only meaningful over at least this many sends. */
    bounceCheckMinSends: number;
    /** The look-back window, in days. */
    windowDays: number;
  };
}

/** Read the engine's configuration from the environment, clamped to safety. */
export function outreachConfig(env: NodeJS.ProcessEnv = process.env): OutreachEmailConfig {
  const rawLimit = Number(env.OUTREACH_DAILY_LIMIT);
  const dailyNewProspectLimit = Number.isFinite(rawLimit) && rawLimit >= 1
    ? Math.min(Math.floor(rawLimit), MAX_DAILY_NEW_PROSPECT_LIMIT)
    : DEFAULT_DAILY_NEW_PROSPECT_LIMIT;

  return {
    enabled: env.OUTREACH_ENABLED === "true",
    fromEmail: env.OUTREACH_FROM_EMAIL || null,
    replyTo: env.OUTREACH_REPLY_TO || env.OUTREACH_FROM_EMAIL || null,
    alertEmail: env.OUTREACH_ALERT_EMAIL || null,
    senderName: env.OUTREACH_SENDER_NAME || "Sean",
    dailyNewProspectLimit,
    breakers: {
      spamComplaintLimit: 0,
      hardBounceRatioLimit: 0.15,
      bounceCheckMinSends: 10,
      windowDays: 7,
    },
  };
}

/** Resend, behind the interface. The only file that imports the SDK for outreach. */
export class ResendOutreachEmailService implements OutreachEmailService {
  constructor(private readonly fromEmail: string | null = outreachConfig().fromEmail) {}

  isConfigured(): boolean {
    return Boolean(process.env.RESEND_API_KEY && this.fromEmail);
  }

  async send(email: OutboundEmail): Promise<SendOutcome> {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey || !this.fromEmail) {
      return { ok: false, error: "Outreach email is not configured" };
    }

    try {
      const client = new Resend(apiKey);
      const result = await client.emails.send({
        from: this.fromEmail,
        to: email.to,
        subject: email.subject,
        text: email.text,
        ...(email.replyTo ? { replyTo: email.replyTo } : {}),
        ...(email.headers ? { headers: email.headers } : {}),
      });

      // Resend reports rejection by returning an error, not throwing - the
      // same trap resendClient.ts documents. Treat it as the failure it is.
      if (result?.error) {
        return { ok: false, error: String(result.error.message ?? result.error) };
      }
      return { ok: true, providerMessageId: result?.data?.id ?? null };
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) };
    }
  }
}

/**
 * The test double: records everything, sends nothing, and can be told to
 * fail. Lives here rather than in a test file so DB tests and any future
 * dry-run mode use the identical fake.
 */
export class RecordingEmailService implements OutreachEmailService {
  public sent: OutboundEmail[] = [];
  public failNext = 0;

  isConfigured(): boolean {
    return true;
  }

  async send(email: OutboundEmail): Promise<SendOutcome> {
    if (this.failNext > 0) {
      this.failNext -= 1;
      return { ok: false, error: "simulated provider failure" };
    }
    this.sent.push(email);
    return { ok: true, providerMessageId: `fake-${this.sent.length}` };
  }
}
