/**
 * Alexi's home screen.
 *
 * Same job as the dashboard's recommendation card, with room to change the
 * inputs: the student says how long they have and the engine reshapes the
 * session rather than just trimming it.
 *
 * Two columns on desktop - the recommendation carries the page, supporting
 * context sits beside it. Everything below the fold is subordinate by design;
 * the page must always have exactly one obvious thing to do.
 */

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { PageShell, PageHeader, SectionHeading } from "@/components/page-shell";
import { AlexiMark } from "@/components/alexi-mark";
import { ReadinessRing } from "@/components/readiness-ring";
import { CardErrorBoundary } from "@/components/error-boundary";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Clock, Play, ArrowRight, LifeBuoy, RotateCcw, Layers, Target, BookOpen, ChevronDown,
} from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import {
  STUDY_ASSISTANT, useRecommendation, useStudyAssistantConfig, modeLabel, blockHref,
} from "@/lib/studyAssistant";
import type { ExamCategory, UserProfile } from "@shared/schema";

/** Session lengths a student can realistically commit to. */
const DURATIONS = [10, 15, 30, 60];

export default function StudyAssistantPage() {
  const { i18n } = useTranslation();
  const es = i18n.language === "es";
  const [minutes, setMinutes] = useState(15);
  const [showWhy, setShowWhy] = useState(false);

  const { data: config } = useStudyAssistantConfig();
  const { data: profile } = useQuery<UserProfile>({ queryKey: ["/api/profile"] });

  const category =
    (profile?.preferredCategory as ExamCategory | null) ??
    ((profile?.allowedCategories as ExamCategory[] | null) ?? [])[0] ??
    ("real_estate" as ExamCategory);

  const { data, isLoading, isError, refetch } = useRecommendation(category, minutes);
  const named = config?.displayName ?? STUDY_ASSISTANT.displayName;

  useEffect(() => {
    trackEvent("alexi_opened", { exam_type: category });
  }, [category]);

  useEffect(() => {
    if (data) {
      trackEvent("alexi_recommendation_viewed", {
        exam_type: category,
        mode: data.recommendation.mode,
      });
    }
  }, [data, category]);

  const rec = data?.recommendation;
  const student = data?.profile;

  const secondary = [
    { href: "/missed-questions", icon: RotateCcw, en: "Review my mistakes", esLabel: "Repasar mis errores" },
    { href: "/flashcards", icon: Layers, en: "Flashcards", esLabel: "Tarjetas de estudio" },
    { href: `/exams/${category}`, icon: Target, en: "Targeted practice", esLabel: "Práctica dirigida" },
    { href: "/study-guide", icon: BookOpen, en: "Study guides", esLabel: "Guías de estudio" },
  ];

  return (
    <PageShell width="wide">
      <PageHeader
        title={named}
        subtitle={es ? STUDY_ASSISTANT.taglineEs : STUDY_ASSISTANT.taglineEn}
        icon={AlexiMark}
      />

      {/* Readiness at a glance. */}
      {student && (
        <div className="mt-6 grid gap-3 sm:grid-cols-3" data-testid="grid-alexi-stats">
          <Card>
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="text-xs text-muted-foreground">
                  {es ? "Puntaje EasyPass" : "EasyPass Score"}
                </p>
                <p className="mt-1 text-2xl font-bold" data-testid="text-alexi-score">
                  {student.easyPassScore ?? "—"}
                </p>
              </div>
              <ReadinessRing
                value={student.easyPassScore}
                size={52}
                label={es ? "Puntaje EasyPass" : "EasyPass Score"}
              />
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">
                {es ? "Días para el examen" : "Days to exam"}
              </p>
              <p className="mt-1 text-2xl font-bold" data-testid="text-alexi-days">
                {student.daysRemaining ?? (es ? "Sin fecha" : "Not set")}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">
                {es ? "Precisión reciente" : "Recent accuracy"}
              </p>
              <p className="mt-1 text-2xl font-bold" data-testid="text-alexi-accuracy">
                {student.recentAccuracy !== null ? `${student.recentAccuracy}%` : "—"}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Time available. Changing it re-asks the engine, which reshapes the
          session rather than truncating it. */}
      <div className="mt-6">
        <p className="text-sm font-medium">
          {es ? "¿Cuánto tiempo tienes?" : "How long have you got?"}
        </p>
        <div
          className="mt-2 flex flex-wrap gap-2"
          role="radiogroup"
          aria-label={es ? "Duración de la sesión" : "Session length"}
        >
          {DURATIONS.map((d) => (
            <Button
              key={d}
              size="sm"
              role="radio"
              aria-checked={minutes === d}
              variant={minutes === d ? "default" : "outline"}
              onClick={() => setMinutes(d)}
              data-testid={`button-duration-${d}`}
            >
              {d} min
            </Button>
          ))}
        </div>
      </div>

      {isLoading && (
        <div className="mt-6 grid gap-6 lg:grid-cols-12">
          <Skeleton className="h-72 w-full lg:col-span-7" />
          <Skeleton className="h-72 w-full lg:col-span-5" />
        </div>
      )}

      {isError && (
        <Card className="mt-6" data-testid="card-assistant-error">
          <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
            <p className="text-sm text-muted-foreground">
              {es
                ? "No pudimos preparar tu recomendación. Puedes seguir practicando normalmente."
                : "We couldn't prepare your recommendation. You can keep practising as normal."}
            </p>
            <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-retry-assistant">
              {es ? "Reintentar" : "Retry"}
            </Button>
          </CardContent>
        </Card>
      )}

      {rec && student && (
        <div className="mt-6 grid gap-6 lg:grid-cols-12 lg:items-start">
          {/* Primary column */}
          <div className="min-w-0 space-y-4 lg:col-span-7">
            {student.insight && (
              <Card className="border-primary/25 bg-primary/[0.04]">
                <CardContent className="p-4">
                  <p className="flex items-start gap-2 text-sm">
                    <AlexiMark size={18} className="mt-0.5 text-primary" />
                    <span data-testid="text-page-insight">{student.insight}</span>
                  </p>
                </CardContent>
              </Card>
            )}

            <Card data-testid="card-alexi-primary">
              <CardContent className="p-5 md:p-6">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{modeLabel(rec.mode, es)}</Badge>
                  <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                    {rec.estimatedMinutes} min
                  </span>
                </div>

                <h2 className="mt-3 text-xl font-bold leading-snug">{rec.headline}</h2>
                <p className="mt-1.5 text-sm text-muted-foreground">{data.phrasing}</p>

                {rec.concept && (
                  <div className="mt-4">
                    <div className="flex items-baseline justify-between gap-2 text-sm">
                      <span className="min-w-0 truncate">{rec.concept.label}</span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {rec.concept.mastery}%
                      </span>
                    </div>
                    <Progress
                      value={rec.concept.mastery}
                      className="mt-1.5 h-1.5"
                      aria-label={
                        es ? `Dominio de ${rec.concept.label}` : `${rec.concept.label} mastery`
                      }
                    />
                  </div>
                )}

                <ul className="mt-4 space-y-1.5">
                  {rec.blocks.map((block, i) => (
                    <li key={i} className="flex items-baseline gap-2 text-sm">
                      <span
                        className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary"
                        aria-hidden="true"
                      />
                      <span className="min-w-0">{block.label}</span>
                    </li>
                  ))}
                </ul>

                <Button asChild size="lg" className="mt-5 w-full sm:w-auto" data-testid="button-page-start">
                  <Link
                    href={blockHref(rec.mode, category)}
                    onClick={() =>
                      trackEvent("alexi_recommendation_started", {
                        exam_type: category,
                        mode: rec.mode,
                      })
                    }
                  >
                    <Play className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    {es ? "Empezar sesión" : "Start session"}
                  </Link>
                </Button>

                {/* Reasoning stays inspectable rather than magic. */}
                <button
                  type="button"
                  onClick={() => setShowWhy((v) => !v)}
                  className="mt-4 inline-flex min-h-6 items-center gap-1 rounded py-1.5 text-xs text-muted-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  aria-expanded={showWhy}
                  data-testid="button-page-why"
                >
                  <ChevronDown
                    className={`h-3.5 w-3.5 transition-transform ${showWhy ? "rotate-180" : ""}`}
                    aria-hidden="true"
                  />
                  {es ? "¿Por qué esto?" : "Why this?"}
                </button>
                {showWhy && (
                  <ul className="mt-2 space-y-1 text-xs text-muted-foreground" data-testid="list-page-evidence">
                    {rec.evidence.map((line, i) => (
                      <li key={i}>· {line}</li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>

            {rec.suggestHumanHelp && (
              <Card className="border-amber-500/30 bg-amber-500/10">
                <CardContent className="p-4">
                  <p className="flex items-start gap-2 text-sm">
                    <LifeBuoy
                      className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
                      aria-hidden="true"
                    />
                    <span>
                      {es
                        ? "Llevas varias sesiones en este tema sin mucha mejora. Una clase en vivo con LBS podría ayudarte más."
                        : "You've spent several sessions on this topic without much improvement. Live instruction from LBS may help more."}
                    </span>
                  </p>
                  <Button variant="outline" size="sm" className="mt-3" asChild>
                    <Link
                      href="/schedule-exam"
                      onClick={() => trackEvent("alexi_human_help_recommended", { exam_type: category })}
                    >
                      {es ? "Ver ayuda en vivo" : "View live help"}
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Supporting column */}
          <div className="min-w-0 space-y-4 lg:col-span-5">
            {student.weakestConcepts.length > 0 && (
              <Card>
                <CardContent className="p-5">
                  <SectionHeading>
                    {es ? "Tus áreas más débiles" : "Your weakest areas"}
                  </SectionHeading>
                  <ul className="mt-3 space-y-3">
                    {student.weakestConcepts.map((c) => (
                      <li key={c.conceptId}>
                        <div className="flex items-baseline justify-between gap-2 text-sm">
                          <span className="min-w-0 truncate">{c.label}</span>
                          <span className="shrink-0 tabular-nums text-muted-foreground">
                            {c.mastery}%
                          </span>
                        </div>
                        <Progress
                          value={c.mastery}
                          className="mt-1.5 h-1.5"
                          aria-label={`${c.label}: ${c.mastery}%`}
                        />
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardContent className="p-5">
                <SectionHeading>{es ? "Otras opciones" : "Other options"}</SectionHeading>
                <div className="mt-3 grid gap-2">
                  {secondary.map((a) => (
                    <Button
                      key={a.href}
                      variant="outline"
                      className="min-h-11 justify-start"
                      asChild
                    >
                      <Link href={a.href}>
                        <a.icon className="mr-2 h-4 w-4" aria-hidden="true" />
                        {es ? a.esLabel : a.en}
                        <ArrowRight className="ml-auto h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      </Link>
                    </Button>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      <p className="mt-6 text-xs text-muted-foreground">
        {es
          ? "Tu Puntaje EasyPass es un indicador de preparación de MyEasyPass basado en tu actividad y rendimiento. No garantiza ni predice el resultado de un examen oficial de licencia."
          : "Your EasyPass Score is a MyEasyPass study-readiness indicator based on your activity and performance. It does not guarantee or predict an official licensing-exam result."}
      </p>
    </PageShell>
  );
}
