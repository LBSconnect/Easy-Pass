/**
 * Topic mastery.
 *
 * Horizontal bars, weakest last so the eye lands on the strong end first and
 * travels down to the work. Every row states its percentage as text and
 * carries a word-level tier, so nothing here depends on colour perception -
 * a red/green bar chart alone would fail WCAG 1.4.1.
 *
 * Only topics for the selected exam are shown; the API is already scoped.
 */

import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ChartColumn } from "lucide-react";
import { IconTile } from "@/components/icon-tile";
import { trackEvent } from "@/lib/analytics";
import type { ExamCategory } from "@shared/schema";

interface TopicMastery {
  topic: string;
  answered: number;
  correct: number;
  accuracy: number;
}

/** Tier words so the bar is never the only signal. */
function tierFor(accuracy: number, es: boolean): { word: string; bar: string } {
  if (accuracy >= 85) {
    return { word: es ? "Fuerte" : "Strong", bar: "bg-emerald-600 dark:bg-emerald-500" };
  }
  if (accuracy >= 70) {
    return { word: es ? "Bien" : "Good", bar: "bg-blue-600 dark:bg-blue-500" };
  }
  if (accuracy >= 60) {
    return { word: es ? "Repasar" : "Review", bar: "bg-amber-500" };
  }
  return { word: es ? "Débil" : "Weak", bar: "bg-rose-600 dark:bg-rose-500" };
}

/** How many rows before the card becomes a wall. */
const MAX_ROWS = 6;

export function MasteryCard({ category }: { category: ExamCategory }) {
  const { i18n } = useTranslation();
  const es = i18n.language === "es";

  const { data, isLoading, isError, refetch } = useQuery<TopicMastery[]>({
    queryKey: [`/api/mastery/${category}`],
  });

  if (isLoading) return <Skeleton className="h-full min-h-56 w-full" data-testid="skeleton-mastery" />;

  if (isError) {
    return (
      <Card className="h-full" data-testid="card-mastery-error">
        <CardContent className="flex h-full flex-col items-center justify-center gap-3 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            {es ? "No pudimos cargar tu dominio por tema." : "We couldn't load your topic mastery."}
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-retry-mastery">
            {es ? "Reintentar" : "Retry"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const topics = (data ?? []).slice().sort((a, b) => b.accuracy - a.accuracy).slice(0, MAX_ROWS);

  if (topics.length === 0) {
    return (
      <Card className="h-full" data-testid="card-mastery-empty">
        <CardContent className="flex h-full items-center justify-center py-10 text-center">
          <p className="text-sm text-muted-foreground">
            {es
              ? "Practica algunas preguntas para ver tu dominio por tema."
              : "Answer some questions to see your topic mastery."}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="h-full" data-testid="card-mastery">
      <CardContent className="p-5">
        <div className="flex items-center gap-2.5">
          <IconTile icon={ChartColumn} tone="violet" />
          <h2 className="text-base font-semibold">{es ? "Tu dominio" : "Your Mastery"}</h2>
        </div>

        <ul className="mt-4 space-y-3">
          {topics.map((t) => {
            const tier = tierFor(t.accuracy, es);
            return (
              <li key={t.topic}>
                <Link
                  href={`/exams/${category}`}
                  onClick={() =>
                    trackEvent("mastery_topic_clicked", { exam_type: category, topic: t.topic })
                  }
                  className="block rounded-md p-1 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  data-testid={`mastery-row-${t.topic}`}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="min-w-0 truncate text-sm">{t.topic}</span>
                    <span className="shrink-0 text-sm font-medium tabular-nums">{t.accuracy}%</span>
                  </div>
                  <div
                    className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted"
                    role="progressbar"
                    aria-valuenow={t.accuracy}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${t.topic}: ${t.accuracy}% — ${tier.word}`}
                  >
                    <div
                      className={`h-full rounded-full ${tier.bar}`}
                      style={{ width: `${Math.max(2, t.accuracy)}%` }}
                    />
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      </CardContent>
    </Card>
  );
}
