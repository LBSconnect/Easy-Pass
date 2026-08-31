import { describe, expect, it } from "vitest";
import { PARTNER_SEGMENTS } from "@shared/partners";
import { classifyReply } from "@shared/outreachCampaign";
import {
  REPLY_CTA,
  TEMPLATE_VERSION,
  renderFollowUp1,
  renderFollowUp2,
  renderInitialEmail,
  renderPilotDetailsEmail,
} from "@shared/partnerOutreachEmails";
import {
  LAUNCH_DAILY_NEW_PROSPECT_LIMIT,
  outreachConfig,
} from "../outreach/emailService";

const BUSINESS_ADDRESS = [
  "MyEasyPass.net | Linton Business Solutions",
  "616 FM 1960 Road West, Suite 101",
  "Houston, Texas 77090-3048",
];

const BRAND = "MyEasyPass.net";

describe("outreach v3 hardening", () => {
  const base = { organizationName: "Example Licensing School", senderName: "Sean" };

  it("uses the v3 template, outcome-led subjects, and a classifier-compatible asynchronous CTA", () => {
    expect(TEMPLATE_VERSION).toBe("outreach-v3");
    expect(REPLY_CTA.toLowerCase()).toContain('reply "yes"');
    expect(classifyReply("yes")).toBe("interested");

    for (const segment of PARTNER_SEGMENTS) {
      const email = renderInitialEmail({ ...base, segment });
      expect(email.subject.toLowerCase().startsWith("free ")).toBe(false);
      expect(email.text).toContain(REPLY_CTA);
      expect(email.text.toLowerCase()).not.toContain("would fail");
      expect(email.text.toLowerCase()).not.toContain("exactly which topics");
      expect(email.text.toLowerCase()).toContain("may need more review");
      expect(email.text.toLowerCase()).toContain("without adding work for your staff");
    }
  });

  it("brands every prospect-facing product reference as MyEasyPass.net and never uses an em dash", () => {
    for (const segment of PARTNER_SEGMENTS) {
      for (const email of [
        renderInitialEmail({ ...base, segment }),
        renderFollowUp1({ ...base, segment }),
        renderFollowUp2({ ...base, segment }),
        renderPilotDetailsEmail({ ...base, segment }),
      ]) {
        const rendered = `${email.subject}\n${email.text}`;
        expect(rendered).toContain(BRAND);
        expect(rendered).not.toMatch(/\bMyEasyPass(?!\.net)\b/);
        expect(rendered).not.toContain("\u2014");
      }
    }
  });

  it("puts the operating business identity and mailing address in every outbound template", () => {
    for (const segment of PARTNER_SEGMENTS) {
      for (const email of [
        renderInitialEmail({ ...base, segment }),
        renderFollowUp1({ ...base, segment }),
        renderFollowUp2({ ...base, segment }),
        renderPilotDetailsEmail({ ...base, segment }),
      ]) {
        for (const line of BUSINESS_ADDRESS) expect(email.text).toContain(line);
      }
    }
  });

  it("keeps automatic pilot details factual and leaves activation deliberate", () => {
    for (const segment of PARTNER_SEGMENTS) {
      const lower = renderPilotDetailsEmail({ ...base, segment }).text.toLowerCase();
      expect(lower).toContain("may need more review");
      expect(lower).toContain("does not guarantee exam results");
      expect(lower).toContain('reply "yes" again');
      expect(lower).toContain("nothing is activated automatically");
    }
  });

  it("launches at five new prospects per day unless an operator deliberately raises it", () => {
    expect(LAUNCH_DAILY_NEW_PROSPECT_LIMIT).toBe(5);
    expect(outreachConfig({} as NodeJS.ProcessEnv).dailyNewProspectLimit).toBe(5);
    expect(outreachConfig({ OUTREACH_DAILY_LIMIT: "8" } as NodeJS.ProcessEnv).dailyNewProspectLimit).toBe(8);
  });

  it("keeps spam complaints as the global breaker while hard bounces stay address-level by default", () => {
    const config = outreachConfig({} as NodeJS.ProcessEnv);
    expect(config.breakers.spamComplaintLimit).toBe(0);
    expect(config.breakers.hardBounceRatioLimit).toBe(Number.POSITIVE_INFINITY);
    expect(config.breakers.bounceCheckMinSends).toBe(1);
  });

  it("uses info@lbsconnect.net with the MyEasyPass.net display name", () => {
    const config = outreachConfig({
      OUTREACH_FROM_EMAIL: "Sean at MyEasyPass.net <info@lbsconnect.net>",
      OUTREACH_REPLY_TO: "info@lbsconnect.net",
    } as NodeJS.ProcessEnv);

    expect(config.fromEmail).toBe("Sean at MyEasyPass.net <info@lbsconnect.net>");
    expect(config.replyTo).toBe("info@lbsconnect.net");
  });
});
