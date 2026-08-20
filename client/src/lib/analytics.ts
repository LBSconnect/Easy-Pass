/**
 * Lightweight, self-hosted event tracking.
 *
 * Events are logged server-side to analytics_events. This module also keeps a
 * small first-touch attribution envelope in sessionStorage so a visitor who
 * arrives from Google on a study page can still be attributed when they later
 * take the diagnostic, open Alexi or start checkout.
 *
 * No email, name, answers, raw query strings or other student content is stored
 * in attribution. Only the allowlisted acquisition fields below are retained.
 */
export type AnalyticsEventName =
  | "diagnostic_cta_click"
  | "diagnostic_completed"
  | "pricing_cta_click"
  | "checkout_start"
  | "checkout_session_created"
  | "signup_started"
  | "signup_completed"
  | "login_completed"
  | "bootcamp_cta_click"
  | "employer_inquiry_submit"
  | "official_exam_schedule_click"
  | "guest_practice_start"
  | "guest_practice_wall_shown"
  | "guest_practice_signup_click"
  // Exam landing / readiness funnel. Every one of these carries an
  // `exam_type` in metadata so conversion can be compared across the four
  // exam products rather than aggregated into one meaningless number.
  | "exam_landing_view"
  | "readiness_cta_click"
  | "retaker_rescue_start"
  | "continue_studying_click"
  // Study assistant. These exist to answer whether the assistant actually
  // improves outcomes, not whether students click it - pair them with mastery
  // and EasyPass Score movement rather than reading them on their own.
  | "alexi_opened"
  | "alexi_recommendation_viewed"
  | "alexi_recommendation_started"
  | "alexi_tutor_question"
  | "alexi_human_help_recommended"
  // Dashboard and exams-page navigation. Named for the student action rather
  // than the card, so renaming a card does not orphan its history.
  | "dashboard_view"
  | "easypass_score_clicked"
  | "todays_plan_started"
  | "mastery_topic_clicked"
  | "quiz_me_clicked"
  | "flashcards_clicked"
  | "review_mistakes_clicked"
  | "mock_exam_clicked"
  | "targeted_practice_clicked"
  | "ask_alexi_clicked"
  | "change_exam_clicked"
  | "exam_date_set"
  | "upgrade_clicked"
  | "exams_page_view"
  // Search-led entry points. A visitor who arrives on a free practice test or
  // a concept explainer has not chosen an exam yet, so these are kept apart
  // from the funnel events above rather than folded into them.
  | "free_practice_cta_click"
  | "concept_practice_cta_click";

interface FirstTouchAttribution {
  landing_path: string;
  referrer_host: string | null;
  source: string | null;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
}

const ATTRIBUTION_KEY = "myeasypass:first-touch:v1";

function clean(value: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  return trimmed ? trimmed.slice(0, 250) : null;
}

function referrerHost(): string | null {
  try {
    if (!document.referrer) return null;
    const host = new URL(document.referrer).hostname.toLowerCase();
    return host === window.location.hostname.toLowerCase() ? null : host.slice(0, 250);
  } catch {
    return null;
  }
}

function captureFirstTouch(): FirstTouchAttribution {
  const params = new URLSearchParams(window.location.search);
  return {
    landing_path: window.location.pathname.slice(0, 500),
    referrer_host: referrerHost(),
    source: clean(params.get("source")),
    utm_source: clean(params.get("utm_source")),
    utm_medium: clean(params.get("utm_medium")),
    utm_campaign: clean(params.get("utm_campaign")),
    utm_content: clean(params.get("utm_content")),
    utm_term: clean(params.get("utm_term")),
  };
}

function currentSource(): string | null {
  return clean(new URLSearchParams(window.location.search).get("source"));
}

function getFirstTouch(): FirstTouchAttribution {
  const fresh = captureFirstTouch();
  try {
    const stored = sessionStorage.getItem(ATTRIBUTION_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as FirstTouchAttribution;
      if (parsed && typeof parsed.landing_path === "string") return parsed;
    }
    sessionStorage.setItem(ATTRIBUTION_KEY, JSON.stringify(fresh));
  } catch {
    // Storage can be disabled in private/restricted browser contexts. Events
    // still work; they simply carry the current page's attribution envelope.
  }
  return fresh;
}

export function trackEvent(event: AnalyticsEventName, metadata?: Record<string, unknown>) {
  try {
    const attribution = getFirstTouch();
    const body = JSON.stringify({
      event,
      path: window.location.pathname,
      metadata: {
        ...attribution,
        current_source: currentSource(),
        ...metadata,
      },
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
      // Analytics failures must never surface to the user.
    });
  } catch {
    // Never let tracking break the page.
  }
}
