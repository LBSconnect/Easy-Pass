import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Gauge, TrendingUp, TrendingDown, Play } from "lucide-react";
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
}

// Band presentation. Text carries the meaning; color only reinforces it, so
// the card stays readable for color-blind users and in monochrome.
const BAND_LABELS: Record<ReadinessBand, { en: string; es: string }> = {
  exam_ready: { en: "Exam Ready", es: "Listo para el Examen" },
  nearly_ready: { en: "Nearly Ready", es: "Casi Listo" },
  improving: { en: "Improving", es: "Mejorando" },
  needs_review: { en: "Needs Review", es: "Necesita Repaso" },
  intensive_study: { en: "Intensive Study Recommended", es: "Se Recomienda Estudio Intensivo" },
};

const BAND_TONE: Record<ReadinessBand, string> = {
  exam_ready: "text-emerald-600 dark:text-emerald-400",
  nearly_ready: "text-blue-600 dark:text-blue-400",
  improving: "text-amber-600 dark:text-amber-400",
  needs_review: "text-orange-600 dark:text-orange-400",
  intensive_study: "text-rose-600 dark:text-rose-400",
};

export function EasyPassScoreCard({ category }: { category: ExamCategory }) {
  const { i18n } = useTranslation();
  const es = i18n.language === "es";

  const { data, isLoading, isError } = useQuery<Readiness>({
    queryKey: [`/api/readiness/${category}`],
  });

  if (isLoading) {
    return (
      <Card data-testid="card-easypass-score">
        <CardContent className="py-6">
          <Skeleton className="h-5 w-40" />
          <Skeleton className="mt-4 h-14 w-32" />
          <Skeleton className="mt-4 h-2 w-full" />
        </CardContent>
      </Card>
    );
  }

  // A readiness failure must not take the dashboard down with it.
  if (isError || !data) return null;

  // Nothing answered yet: promise nothing, just point at the way in.
  if (data.questionsAttempted === 0) {
    return (
      <Card data-testid="card-easypass-score">
        <CardContent className="flex flex-col gap-4 py-6 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-xl bg-primary/10 p-3">
              <Gauge className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="font-semibold">
                {es ? "Puntuación EasyPass" : "EasyPass Score"}
              </h2>
              <p className="text-sm text-muted-foreground">
                {es
                  ? "Responde algunas preguntas de práctica para ver tu preparación."
                  : "Answer some practice questions to see where you stand."}
              </p>
            </div>
          </div>
          <Button asChild className="shrink-0" data-testid="button-score-start">
            <Link href={`/exams/${category}`}>
              <Play className="mr-1.5 h-4 w-4" />
              {es ? "Comenzar" : "Start practising"}
            </Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  // Defensive lookup: an unrecognised band (a server-side band added ahead of
  // a client deploy) previously threw here and white-screened the entire
  // dashboard, not just this card. Degrade to a neutral label instead.
  const bandLabel = BAND_LABELS[data.band] ?? BAND_LABELS.improving;
  const label = bandLabel[es ? "es" : "en"];

  return (
    <Card data-testid="card-easypass-score">
      <CardContent className="py-6">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">
              {es ? "Puntuación EasyPass" : "EasyPass Score"}
            </h2>
          </div>
          {data.provisional && (
            <Badge variant="secondary" data-testid="badge-score-provisional">
              {es ? "Provisional" : "Provisional"}
            </Badge>
          )}
        </div>

        <div className="mt-4 flex items-baseline gap-2">
          <span
            className="text-5xl font-bold tabular-nums"
            data-testid="text-score-value"
          >
            {data.score}
          </span>
          <span className="text-lg text-muted-foreground">/ 100</span>
        </div>

        <p
          className={`mt-1 font-medium ${BAND_TONE[data.band] ?? BAND_TONE.improving}`}
          data-testid="text-score-band"
        >
          {label}
        </p>

        <Progress
          value={data.score}
          className="mt-4 h-2"
          aria-label={es ? "Puntuación EasyPass" : "EasyPass Score"}
        />

        {data.provisional && (
          <p className="mt-3 text-xs text-muted-foreground">
            {es
              ? `Basado en ${data.questionsAttempted} preguntas. Responde más para una lectura más confiable.`
              : `Based on ${data.questionsAttempted} questions. Answer more for a more reliable reading.`}
          </p>
        )}

        {(data.strongestTopic || data.weakestTopic) && (
          <div className="mt-4 space-y-2 border-t pt-4 text-sm">
            {data.strongestTopic && (
              <div className="flex items-center gap-2" data-testid="text-score-strongest">
                <TrendingUp className="h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
                <span className="text-muted-foreground">
                  {es ? "Más fuerte:" : "Strongest:"}
                </span>
                <span className="font-medium">{data.strongestTopic}</span>
              </div>
            )}
            {data.weakestTopic && (
              <div className="flex items-center gap-2" data-testid="text-score-weakest">
                <TrendingDown className="h-4 w-4 shrink-0 text-rose-600 dark:text-rose-400" />
                <span className="text-muted-foreground">
                  {es ? "Más débil:" : "Weakest:"}
                </span>
                <span className="font-medium">{data.weakestTopic}</span>
              </div>
            )}
          </div>
        )}

        <p className="mt-4 text-xs text-muted-foreground">
          {es
            ? "Una medida interna de tu preparación de estudio, no una predicción del examen oficial."
            : "An internal measure of your study readiness, not a prediction of your official exam result."}
        </p>
      </CardContent>
    </Card>
  );
}
