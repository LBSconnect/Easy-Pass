import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LifeBuoy } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { ExamCategory } from "@shared/schema";

/**
 * Asks once whether this is the student's first attempt, then gets out of the
 * way. A student who has failed before does not need to be reminded of it
 * every time they open the dashboard, so this renders only while the answer
 * is unknown - and the reassurance shows once, on answering.
 */
export function RetakerRescueCard({
  hasPreviousAttempt,
  category,
}: {
  hasPreviousAttempt: boolean | null | undefined;
  category: ExamCategory;
}) {
  const { i18n } = useTranslation();
  const es = i18n.language === "es";
  const queryClient = useQueryClient();

  const answer = useMutation({
    mutationFn: async (previous: boolean) => {
      const res = await apiRequest("PATCH", "/api/profile", {
        hasPreviousAttempt: previous,
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      // The plan shape changes for retakers, so it has to be recomputed.
      queryClient.invalidateQueries({ queryKey: [`/api/study-plan/${category}`] });
    },
  });

  // Already answered: nothing to ask.
  if (hasPreviousAttempt !== null && hasPreviousAttempt !== undefined) return null;

  return (
    <Card className="border-primary/30 bg-primary/5" data-testid="card-retaker-rescue">
      <CardContent className="py-5">
        <div className="flex items-start gap-3">
          <div className="rounded-xl bg-primary/10 p-2.5">
            <LifeBuoy className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">
              {es ? "¿Es tu primer intento?" : "Is this your first attempt?"}
            </h2>
            <p className="mt-1 text-sm text-muted-foreground">
              {es
                ? "Si ya presentaste el examen, ajustamos tu plan para enfocarnos en lo que te costó puntos."
                : "If you've taken the exam before, we'll shape your plan around what cost you points."}
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button
                size="sm"
                disabled={answer.isPending}
                onClick={() => answer.mutate(false)}
                data-testid="button-first-attempt"
              >
                {es ? "Sí, es mi primer intento" : "Yes, this is my first"}
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={answer.isPending}
                onClick={() => answer.mutate(true)}
                data-testid="button-retaker"
              >
                {es ? "No, ya lo presenté antes" : "No, I've taken it before"}
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Shown on a retaker's plan. The brief's framing, deliberately kept to one
 * encouraging line rather than a recurring banner about having failed.
 */
export function RescueBanner() {
  const { i18n } = useTranslation();
  const es = i18n.language === "es";

  return (
    <div
      className="mt-4 flex items-start gap-2 rounded-lg border border-primary/20 bg-primary/5 p-3"
      data-testid="banner-rescue"
    >
      <LifeBuoy className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
      <p className="text-sm">
        {es
          ? "No necesitas empezar de cero. Identifiquemos qué te costó puntos y arreglémoslo."
          : "You don't need to start over. Let's identify what cost you points and fix it."}
      </p>
    </div>
  );
}
