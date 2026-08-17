/**
 * EasyPass Score card.
 *
 * One of the two lead cards. Large number, readiness band as words, real
 * weekly movement, and the two topics that matter most - the one carrying the
 * student and the one holding them back.
 *
 * Every number here is real. The weekly delta is computed server-side by
 * re-scoring the student as of seven days ago; a student without a week of
 * history simply has no trend shown rather than a made-up one.
 */

import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ReadinessRing } from "@/components/readiness-ring";
import { TrendingUp, TrendingDown, ShieldCheck, TriangleAlert, ArrowRight } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import type { ExamCategory } from "@shared/schema";

type ReadinessBand =
  | "exam_ready"
  | "nearly_ready"
  | "improving"
  | "needs_review"
  | "intensive_study";

interface Readiness {
  score: number;
  band: ReadinessBand;
  provisional: boolean;
  questionsAttempted: number;
  strongestTopic: string | null;
  weakestTopic: string | null;
  weeklyDelta: number | null;
}

interface TopicMastery {
  topic: string;
  accuracy: number;
}

// Words carry the band; colour only reinforces it.
const BAND_LABELS: Record<ReadinessBand, { en: string; es: string }> = {
  exam_ready: { en: "READY", es: "LISTO" },
  nearly_ready: { en: "ALMOST READY", es: "CASI LISTO" },
  improving: { en: "IMPROVING", es: "MEJORANDO" },
  needs_review: { en: "NEEDS REVIEW", es: "NECESITA REPASO" },
  intensive_study: { en: "FOCUSED STUDY RECOMMENDED", es: "ESTUDIO ENFOCADO RECOMENDADO" },
};

export function ScoreCard({ category }: { category: ExamCategory }) {
  const { i18n } = useTranslation();
  const es = i18n.language === "es";

  const { data, isLoading, isError, refetch } = useQuery<Readiness>({
    queryKey: [`/api/readiness/${category}`],
  });
  const { data: mastery } = useQuery<TopicMastery[]>({
    queryKey: [`/api/mastery/${category}`],
  });

  if (isLoading) return <Skeleton className="h-64 w-full" data-testid="skeleton-score" />;

  // One failing card must not take the dashboard with it.
  if (isError || !data) {
    return (
      <Card data-testid="card-score-error">
        <CardContent className="flex h-full flex-col items-center justify-center gap-3 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            {es
              ? "No pudimos cargar tus datos de preparación."
              : "We couldn't load your latest readiness data."}
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-retry-score">
            {es ? "Reintentar" : "Retry"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  // A provisional score is not a score. Say so and point at the fix.
  if (data.provisional) {
    return (
      <Card className="h-full" data-testid="card-score-provisional">
        <CardContent className="flex h-full flex-col p-5 md:p-6">
          <h2 className="text-base font-semibold">
            {es ? "Puntaje EasyPass" : "EasyPass Score"}
          </h2>
          <div className="mt-4 flex items-center gap-4">
            <ReadinessRing value={null} size={80} label={es ? "Puntaje EasyPass" : "EasyPass Score"} />
            <p className="text-sm text-muted-foreground">
              {es
                ? "Aún no calculado. Haz tu diagnóstico para establecer tu punto de partida."
                : "Not calculated yet. Take your diagnostic to establish your starting readiness score."}
            </p>
          </div>
          <Button asChild className="mt-auto w-full sm:w-auto" data-testid="button-start-diagnostic">
            <Link
              href="/readiness-check"
              onClick={() => trackEvent("diagnostic_cta_click", { exam_type: category })}
            >
              {es ? "Comenzar diagnóstico" : "Start Diagnostic"}
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const band = BAND_LABELS[data.band] ?? BAND_LABELS.improving;
  const sorted = (mastery ?? []).slice().sort((a, b) => b.accuracy - a.accuracy);
  const strongest = sorted[0];
  const weakest = sorted[sorted.length - 1];

  return (
    <Card className="h-full" data-testid="card-score">
      <CardContent className="flex h-full flex-col p-5 md:p-6">
        <h2 className="text-base font-semibold">{es ? "Puntaje EasyPass" : "EasyPass Score"}</h2>

        <div className="mt-4 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
              <span className="text-4xl font-bold leading-none md:text-5xl" data-testid="text-score-value">
                {data.score}
              </span>
              <span className="text-sm font-semibold text-primary" data-testid="text-score-band">
                {es ? band.es : band.en}
              </span>
            </div>

            {data.weeklyDelta !== null && data.weeklyDelta !== 0 && (
              <p
                className={`mt-2 flex items-center gap-1 text-sm ${
                  data.weeklyDelta > 0
                    ? "text-emerald-600 dark:text-emerald-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
                data-testid="text-score-delta"
              >
                {data.weeklyDelta > 0 ? (
                  <TrendingUp className="h-4 w-4" aria-hidden="true" />
                ) : (
                  <TrendingDown className="h-4 w-4" aria-hidden="true" />
                )}
                {data.weeklyDelta > 0 ? "+" : ""}
                {data.weeklyDelta} {es ? "esta semana" : "this week"}
              </p>
            )}
          </div>

          <ReadinessRing
            value={data.score}
            size={96}
            caption="/100"
            label={es ? "Puntaje EasyPass" : "EasyPass Score"}
          />
        </div>

        {(strongest || weakest) && (
          <div className="mt-5 grid gap-3 border-t pt-4 sm:grid-cols-2">
            {strongest && (
              <div className="flex items-start gap-2 min-w-0">
                <ShieldCheck
                  className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">
                    {es ? "Tema más fuerte" : "Strongest Topic"}
                  </p>
                  <p className="truncate text-sm font-medium" data-testid="text-strongest-topic">
                    {strongest.topic} — {strongest.accuracy}%
                  </p>
                </div>
              </div>
            )}
            {weakest && weakest.topic !== strongest?.topic && (
              <div className="flex items-start gap-2 min-w-0">
                <TriangleAlert
                  className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="text-xs text-muted-foreground">
                    {es ? "Necesita atención" : "Needs Attention"}
                  </p>
                  <p className="truncate text-sm font-medium" data-testid="text-weakest-topic">
                    {weakest.topic} — {weakest.accuracy}%
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        <Button
          variant="outline"
          asChild
          className="mt-auto w-full pt-0 sm:w-auto"
          data-testid="button-readiness-report"
        >
          <Link
            href="/study-assistant"
            onClick={() => trackEvent("easypass_score_clicked", { exam_type: category })}
          >
            {es ? "Ver mi informe" : "View My Readiness Report"}
            <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
