import { OUTREACH_TIME_ZONE, type SendingWindowConfig } from "@shared/outreachCampaign";

/**
 * Production outreach may leave Monday through Saturday from 8:00 AM until
 * 6:00 PM in the Texas clock. This is intentionally separate from
 * isBusinessDay/addBusinessDays: allowing Saturday delivery must not silently
 * turn Saturday into a business day for the +4/+9 follow-up cadence.
 */
export const OUTREACH_SENDING_WINDOW: SendingWindowConfig = {
  startHour: 8,
  endHour: 18,
  timeZone: OUTREACH_TIME_ZONE,
};

function localWeekdayAndHour(at: Date, timeZone: string): { weekday: string; hour: number } {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "numeric",
    hour12: false,
  });
  const parts = fmt.formatToParts(at);
  const get = (type: string) => parts.find((part) => part.type === type)?.value ?? "";
  return {
    weekday: get("weekday"),
    hour: Number(get("hour")) % 24,
  };
}

export function isOutreachSendingWindow(
  at: Date,
  window: SendingWindowConfig = OUTREACH_SENDING_WINDOW,
): boolean {
  const { weekday, hour } = localWeekdayAndHour(at, window.timeZone);
  if (!["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].includes(weekday)) return false;
  return hour >= window.startHour && hour < window.endHour;
}
