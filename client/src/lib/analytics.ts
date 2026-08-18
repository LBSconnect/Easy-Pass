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
  | "exams_page_view";

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
