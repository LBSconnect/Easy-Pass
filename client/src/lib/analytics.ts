/**
 * Lightweight, self-hosted event tracking. No third-party analytics platform
 * is configured yet (see Phase 1 audit) - events are logged server-side to
 * the analytics_events table via POST /api/analytics/events. Swap the body
 * of trackEvent for a third-party SDK call later without touching call sites.
 */
export type AnalyticsEventName =
  | "diagnostic_cta_click"
  | "pricing_cta_click"
  | "checkout_start"
  | "bootcamp_cta_click"
  | "employer_inquiry_submit"
  | "official_exam_schedule_click";

export function trackEvent(event: AnalyticsEventName, metadata?: Record<string, unknown>) {
  try {
    const body = JSON.stringify({
      event,
      path: window.location.pathname,
      metadata,
    });

    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: "application/json" });
      navigator.sendBeacon("/api/analytics/events", blob);
      return;
    }

    fetch("/api/analytics/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      credentials: "include",
      keepalive: true,
    }).catch(() => {
      // Analytics failures must never surface to the user
    });
  } catch {
    // Never let tracking break the page
  }
}
