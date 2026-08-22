import { describe, expect, it } from "vitest";
import { PARTNER_SEGMENTS } from "@shared/partners";
import { classifyReply } from "@shared/outreachCampaign";
import {
  REPLY_CTA,
  TEMPLATE_VERSION,
  renderFollowUp1,
  renderFollowUp2,
  renderInitialEmail,
} from "@shared/partnerOutreachEmails";
import {
  LAUNCH_DAILY_NEW_PROSPECT_LIMIT,
  outreachConfig,
} from "../outreach/emailService";

const BUSINESS_ADDRESS = [
  "MyEasyPass | Linton Business Solutions",
  "616 FM 1960 Road West, Suite 101",
  "Houston, Texas 77090-3048",
];

describe("outreach v2 hardening", () => {
  const base = {
    organizationName: "Example Licensing School",
    senderName: "Sean",
  };

  it("uses the v2 template, outcome-led subjects, and a classifier-compatible asynchronous CTA", () => {
    expect(TEMPLATE_VERSION).toBe("outreach-v2");
    expect(REPLY_CTA.toLowerCase()).toContain('reply "yes"');
    expect(classifyReply("yes")).toBe("interested");

    for (const segment of PARTNER_SEGMENTS) {
      const email = renderInitialEmail({ ...base, segment });
      expect(email.subject.toLowerCase().startsWith("free ")).toBe(false);
      expect(email.text).toContain(REPLY_CTA);
      expect(email.text.toLowerCase()).not.toContain("would fail");
      expect(email.text.toLowerCase()).not.toContain("exactly which topics");
      expect(email.text.toLowerCase()).toContain("may need more work");
    }
  });

  it("puts the operating business identity and mailing address in every step", () => {
    for (const segment of PARTNER_SEGMENTS) {
      const emails = [
        renderInitialEmail({ ...base, segment }),
        renderFollowUp1({ ...base, segment }),
        renderFollowUp2({ ...base, segment }),
      ];

      for (const email of emails) {
        for (const line of BUSINESS_ADDRESS) expect(email.text).toContain(line);
      }
    }
  });

  it("launches at five new prospects per day unless an operator deliberately raises it", () => {
    expect(LAUNCH_DAILY_NEW_PROSPECT_LIMIT).toBe(5);
    expect(outreachConfig({} as NodeJS.ProcessEnv).dailyNewProspectLimit).toBe(5);
    expect(outreachConfig({ OUTREACH_DAILY_LIMIT: "8" } as NodeJS.ProcessEnv).dailyNewProspectLimit).toBe(8);
  });

  it("uses a strict deliverability breaker for a small high-value list", () => {
    const config = outreachConfig({} as NodeJS.ProcessEnv);
    expect(config.breakers.spamComplaintLimit).toBe(0);
    expect(config.breakers.hardBounceRatioLimit).toBe(0.03);
    expect(config.breakers.bounceCheckMinSends).toBe(10);
  });

  it("documents the intended verified outreach identity in config examples", () => {
    const config = outreachConfig({
      OUTREACH_FROM_EMAIL: "Sean at MyEasyPass <sean@partners.myeasypass.net>",
      OUTREACH_REPLY_TO: "info@lbsconect.net",
    } as NodeJS.ProcessEnv);

    expect(config.fromEmail).toBe("Sean at MyEasyPass <sean@partners.myeasypass.net>");
    expect(config.replyTo).toBe("info@lbsconect.net");
  });
});
