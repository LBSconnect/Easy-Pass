/**
 * Audience signals must be useful enough to build high-intent remarketing
 * segments without leaking student identity or content to Google Ads.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

function installBrowser(): unknown[][] {
  const dataLayer: unknown[][] = [];
  vi.stubGlobal("window", { dataLayer });
  return dataLayer;
}

async function loadModule() {
  vi.resetModules();
  return import("../../client/src/lib/googleAdsAudiences");
}

describe("sendGoogleAdsAudienceSignal", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("sends a high-intent readiness completion with acquisition context", async () => {
    const dataLayer = installBrowser();
    const { sendGoogleAdsAudienceSignal } = await loadModule();

    const sent = sendGoogleAdsAudienceSignal({
      event: "diagnostic_completed",
      path: "/readiness-check",
      attribution: {
        utm_source: "blinn",
        utm_medium: "partner",
        utm_campaign: "real-estate",
        partner_code: "blinn-re",
      },
      metadata: { exam_type: "real_estate", language: "en" },
    });

    expect(sent).toBe(true);
    expect(dataLayer).toHaveLength(1);
    const [, eventName, payload] = dataLayer[0] as [string, string, Record<string, unknown>];
    expect(eventName).toBe("page_view");
    expect(payload.mep_funnel_stage).toBe("readiness_completed");
    expect(payload.mep_exam_type).toBe("real_estate");
    expect(payload.mep_partner_code).toBe("blinn-re");
    expect(payload.mep_source).toBe("blinn");
  });

  it("does not send low-value events that are not allowlisted", async () => {
    const dataLayer = installBrowser();
    const { sendGoogleAdsAudienceSignal } = await loadModule();

    expect(
      sendGoogleAdsAudienceSignal({
        event: "diagnostic_progress",
        path: "/readiness-check",
        attribution: {},
        metadata: { question_number: 5 },
      }),
    ).toBe(false);
    expect(dataLayer).toHaveLength(0);
  });

  it("never forwards arbitrary metadata such as email or quiz content", async () => {
    const dataLayer = installBrowser();
    const { sendGoogleAdsAudienceSignal } = await loadModule();

    sendGoogleAdsAudienceSignal({
      event: "checkout_start",
      path: "/pricing",
      attribution: { utm_campaign: "summer" },
      metadata: {
        exam_type: "life_insurance",
        email: "student@example.com",
        answer: "private answer",
        user_id: "user-123",
      },
    });

    const payload = (dataLayer[0] as [string, string, Record<string, unknown>])[2];
    const serialized = JSON.stringify(payload);
    expect(serialized).not.toContain("student@example.com");
    expect(serialized).not.toContain("private answer");
    expect(serialized).not.toContain("user-123");
    expect(payload.mep_exam_type).toBe("life_insurance");
  });

  it("fails safely when the Google tag is unavailable", async () => {
    vi.stubGlobal("window", {});
    const { sendGoogleAdsAudienceSignal } = await loadModule();

    expect(
      sendGoogleAdsAudienceSignal({
        event: "pricing_view",
        path: "/pricing",
        attribution: {},
      }),
    ).toBe(false);
  });
});
