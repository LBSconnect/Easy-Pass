/**
 * The few things worth saying to a student before they start.
 *
 * Every line is a fact from their own record - a date they set, an answer
 * they gave, a subscription period Stripe reported. The server decides what
 * is true and how to say it; this only lays it out, so the dashboard and the
 * reminder email cannot end up telling them different things.
 *
 * It renders nothing when there is nothing to say. An empty state here would
 * be a permanent box saying "all clear", which is furniture rather than
 * information, and it would push the real work further down the page.
 */

import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { CalendarClock, CreditCard, BookMarked, Zap, ArrowRight } from "lucide-react";

interface ReminderItem {
  code: string;
  priority: number;
  data: Record<string, number | string>;
  copy: { title: string; action: string; href: string; linkLabel: string };
}

interface RemindersResponse {
  reminders: ReminderItem[];
  emailRemindersOptIn: boolean;
}

/** Icon per reminder. Decoration only - the sentence carries the meaning. */
const ICONS: Record<string, typeof CalendarClock> = {
  exam_imminent: CalendarClock,
  exam_approaching: CalendarClock,
  subscription_ending: CreditCard,
  inactive: Zap,
  notebook_waiting: BookMarked,
  no_attempts_yet: Zap,
};

/**
 * The one reminder that is genuinely time-critical gets a warmer surface.
 * Only one, so it keeps meaning something.
 */
const URGENT = new Set(["exam_imminent", "subscription_ending"]);

export function ReminderStrip() {
  const { data } = useQuery<RemindersResponse>({
    queryKey: ["/api/reminders"],
    staleTime: 60 * 1000,
  });

  const reminders = data?.reminders ?? [];
  if (reminders.length === 0) return null;

  return (
    <div className="space-y-2" data-testid="reminder-strip">
      {reminders.map((reminder) => {
        const Icon = ICONS[reminder.code] ?? Zap;
        const urgent = URGENT.has(reminder.code);

        return (
          <Card
            key={reminder.code}
            className={urgent ? "border-amber-500/40 bg-amber-500/5" : undefined}
            data-testid={`reminder-${reminder.code}`}
          >
            <CardContent className="flex flex-wrap items-center gap-3 p-4">
              <span
                className={`rounded-lg p-2 ${
                  urgent
                    ? "bg-amber-500/15 text-amber-700 dark:text-amber-400"
                    : "bg-muted text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{reminder.copy.title}</p>
                <p className="text-sm text-muted-foreground">{reminder.copy.action}</p>
              </div>

              <Link
                href={reminder.copy.href}
                // min-h-11 keeps the tap target above the WCAG floor, and the
                // link sits on its own row on a narrow screen rather than
                // squeezing the sentence - Spanish runs 20-30% longer.
                className="inline-flex min-h-11 shrink-0 items-center gap-1 rounded px-2 text-sm font-medium text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring max-sm:w-full max-sm:justify-end"
                data-testid={`reminder-link-${reminder.code}`}
              >
                {reminder.copy.linkLabel}
                <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
