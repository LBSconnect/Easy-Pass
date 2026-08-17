/**
 * Dashboard welcome card.
 *
 * Greeting on the left, the thing the student is actually working toward on
 * the right. The exam and countdown live here rather than in a card of their
 * own because "which exam, how long left" is context for everything below it,
 * not a separate decision.
 *
 * No exam date shows a prompt to set one - never a fabricated date.
 */

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CalendarDays } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { trackEvent } from "@/lib/analytics";

interface Props {
  firstName: string;
  examLabel: string | null;
  examDate: Date | null;
  daysRemaining: number | null;
}

function greetingFor(language: string): string {
  // Central time: the business and nearly all students are in Texas, so a
  // student's "afternoon" should not depend on the server's timezone.
  const hour = parseInt(
    new Date().toLocaleString("en-US", {
      timeZone: "America/Chicago",
      hour: "numeric",
      hour12: false,
    }),
    10,
  );

  if (language === "es") {
    if (hour < 12) return "Buenos días";
    if (hour < 18) return "Buenas tardes";
    return "Buenas noches";
  }
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

export function WelcomeCard({ firstName, examLabel, examDate, daysRemaining }: Props) {
  const { i18n } = useTranslation();
  const es = i18n.language === "es";
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState("");

  const saveDate = useMutation({
    mutationFn: async (iso: string) => {
      const res = await apiRequest("PATCH", "/api/profile", { examDate: iso });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      trackEvent("exam_date_set");
      setEditing(false);
    },
  });

  return (
    <Card className="border-primary/20 bg-primary/[0.04]">
      <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-6">
        <div className="min-w-0">
          <h1 className="text-xl font-bold md:text-2xl" data-testid="text-greeting">
            {greetingFor(i18n.language)}, {firstName}!
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {es
              ? "Vas progresando. Sigamos construyendo tu confianza."
              : "You're making progress. Let's keep building your confidence."}
          </p>
        </div>

        {examLabel && (
          <div className="flex shrink-0 items-center gap-3 rounded-lg border bg-background p-3">
            <CalendarDays className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-sm font-semibold" data-testid="text-current-exam">
                {examLabel}
                {daysRemaining !== null && (
                  <>
                    <span className="mx-1.5 text-muted-foreground" aria-hidden="true">·</span>
                    <span className="text-primary">
                      {es
                        ? `${daysRemaining} día${daysRemaining === 1 ? "" : "s"}`
                        : `${daysRemaining} day${daysRemaining === 1 ? "" : "s"} left`}
                    </span>
                  </>
                )}
              </p>

              {examDate ? (
                <p className="text-xs text-muted-foreground" data-testid="text-exam-date">
                  {es ? "Fecha: " : "Exam Date: "}
                  {examDate.toLocaleDateString(es ? "es-US" : "en-US", {
                    month: "long",
                    day: "numeric",
                    timeZone: "UTC",
                  })}
                </p>
              ) : editing ? (
                <div className="mt-1 flex flex-wrap items-center gap-2">
                  <Input
                    type="date"
                    value={value}
                    onChange={(e) => setValue(e.target.value)}
                    className="h-9 w-40"
                    aria-label={es ? "Fecha del examen" : "Exam date"}
                    data-testid="input-exam-date"
                  />
                  <Button
                    size="sm"
                    className="h-9"
                    disabled={!value || saveDate.isPending}
                    onClick={() => saveDate.mutate(new Date(value).toISOString())}
                    data-testid="button-save-exam-date"
                  >
                    {es ? "Guardar" : "Save"}
                  </Button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setEditing(true)}
                  className="text-xs text-primary underline-offset-2 hover:underline"
                  data-testid="button-set-exam-date"
                >
                  {es ? "Establecer fecha del examen" : "Set Exam Date"}
                </button>
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
