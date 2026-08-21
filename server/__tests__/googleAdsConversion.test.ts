/**
 * What may and may not be reported to Google Ads as a subscription.
 *
 * Every false positive here costs real money twice: once on the click that
 * gets bid up because it looks like it converts, and again on the decision
 * made from a cost-per-subscription that is lower than the true one. So these
 * assert the refusals at least as hard as the success.
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

const CONVERSION_SEND_TO = "AW-18360793283/gQDnCM3rg-UcEMPxjbNE";

/** Minimal stand-ins for the two browser globals the module touches. */
function installBrowser(): { dataLayer: unknown[][] } {
  const store = new Map<string, string>();
  const dataLayer: unknown[][] = [];

  vi.stubGlobal("window", { dataLayer });
  vi.stubGlobal("localStorage", {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => void store.set(key, value),
    removeItem: (key: string) => void store.delete(key),
  });

  return { dataLayer };
}

const conversions = (dataLayer: unknown[][]) =>
  dataLayer.filter((entry) => entry[0] === "event" && entry[1] === "conversion");

async function loadModule() {
  vi.resetModules();
  return import("../../client/src/lib/googleAds");
}

describe("reportVerifiedSubscription", () => {
  let dataLayer: unknown[][];

  beforeEach(() => {
    vi.unstubAllGlobals();
    dataLayer = installBrowser().dataLayer;
  });

  it("reports a subscription the server verified as active", async () => {
    const { reportVerifiedSubscription } = await loadModule();

    const sent = reportVerifiedSubscription({
      subscriptionId: "sub_live_1",
      synced: true,
      status: "active",
    });

    expect(sent).toBe(true);
    expect(conversions(dataLayer)).toHaveLength(1);
  });

  it("sends the configured label, a USD value, and nothing else", async () => {
    const { reportVerifiedSubscription } = await loadModule();
    reportVerifiedSubscription({ subscriptionId: "sub_live_2", synced: true, status: "active" });

    const [, , payload] = conversions(dataLayer)[0] as [string, string, Record<string, unknown>];

    expect(payload.send_to).toBe(CONVERSION_SEND_TO);
    expect(payload.currency).toBe("USD");
    expect(typeof payload.value).toBe("number");
    // No email, no user id, and not the subscription id either - that stays in
    // this browser as a dedupe key.
    expect(Object.keys(payload).sort()).toEqual(["currency", "send_to", "value"]);
    expect(JSON.stringify(payload)).not.toContain("sub_live_2");
  });

  it("does not report when the server could not verify a subscription", async () => {
    const { reportVerifiedSubscription } = await loadModule();

    // What /api/stripe/sync-subscription answers when Stripe has nothing
    // active for this customer - the case the old URL check could not see.
    const sent = reportVerifiedSubscription({ subscriptionId: "sub_x", synced: false });

    expect(sent).toBe(false);
    expect(conversions(dataLayer)).toHaveLength(0);
  });

  it.each(["canceled", "incomplete", "incomplete_expired", "past_due", "unpaid", "paused"])(
    "does not report a subscription in %s",
    async (status) => {
      const { reportVerifiedSubscription } = await loadModule();

      const sent = reportVerifiedSubscription({ subscriptionId: "sub_bad", synced: true, status });

      expect(sent).toBe(false);
      expect(conversions(dataLayer)).toHaveLength(0);
    },
  );

  it("reports a trial, which is a subscription Stripe considers live", async () => {
    const { reportVerifiedSubscription } = await loadModule();

    expect(
      reportVerifiedSubscription({ subscriptionId: "sub_trial", synced: true, status: "trialing" }),
    ).toBe(true);
  });

  it("does not report without a subscription to key on", async () => {
    const { reportVerifiedSubscription } = await loadModule();

    expect(reportVerifiedSubscription({ subscriptionId: "", synced: true, status: "active" })).toBe(false);
    expect(conversions(dataLayer)).toHaveLength(0);
  });

  it("reports one subscription once, however many times it is asked", async () => {
    const { reportVerifiedSubscription } = await loadModule();
    const verified = { subscriptionId: "sub_once", synced: true, status: "active" };

    reportVerifiedSubscription(verified);
    reportVerifiedSubscription(verified);
    reportVerifiedSubscription(verified);

    expect(conversions(dataLayer)).toHaveLength(1);
  });

  it("stays reported across a reload", async () => {
    // localStorage survives the module being torn down and re-imported, which
    // is what a refresh of the success page amounts to.
    const first = await loadModule();
    first.reportVerifiedSubscription({ subscriptionId: "sub_reload", synced: true, status: "active" });

    const second = await loadModule();
    const sentAgain = second.reportVerifiedSubscription({
      subscriptionId: "sub_reload",
      synced: true,
      status: "active",
    });

    expect(sentAgain).toBe(false);
    expect(conversions(dataLayer)).toHaveLength(1);
  });

  it("reports a genuinely new subscription after an earlier one", async () => {
    const { reportVerifiedSubscription } = await loadModule();

    reportVerifiedSubscription({ subscriptionId: "sub_first", synced: true, status: "active" });
    // Someone who cancelled and came back is a second sale, and Stripe gives
    // it a new id.
    reportVerifiedSubscription({ subscriptionId: "sub_second", synced: true, status: "active" });

    expect(conversions(dataLayer)).toHaveLength(2);
  });

  it("does not claim to have reported when the tag was blocked", async () => {
    vi.unstubAllGlobals();
    vi.stubGlobal("window", {});
    vi.stubGlobal("localStorage", { getItem: () => null, setItem: () => {} });
    const { reportVerifiedSubscription } = await loadModule();

    expect(
      reportVerifiedSubscription({ subscriptionId: "sub_blocked", synced: true, status: "active" }),
    ).toBe(false);
  });

  it("still reports when the browser refuses storage", async () => {
    vi.unstubAllGlobals();
    const dl: unknown[][] = [];
    vi.stubGlobal("window", { dataLayer: dl });
    vi.stubGlobal("localStorage", {
      getItem: () => { throw new Error("denied"); },
      setItem: () => { throw new Error("denied"); },
    });
    const { reportVerifiedSubscription } = await loadModule();

    // Losing a real conversion is worse than risking a duplicate one.
    expect(
      reportVerifiedSubscription({ subscriptionId: "sub_private", synced: true, status: "active" }),
    ).toBe(true);
    expect(conversions(dl)).toHaveLength(1);
  });
});
