/**
 * Alexi recommendation card - one of the two lead cards.
 *
 * The recommendation is computed server-side from real performance data and
 * arrives already decided; this component only presents it. When there is not
 * enough data it says so and points at the diagnostic rather than inventing a
 * weakness for a student who has not studied yet.
 *
 * The card renders even with the assistant switched off, because the
 * underlying engine is deterministic and needs no AI - only the Alexi framing
 * is gated.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Play, LifeBuoy, ChevronDown } from "lucide-react";
import { AlexiMascot } from "@/components/alexi-mascot";
import { trackEvent } from "@/lib/analytics";
import {
  STUDY_ASSISTANT,
  useRecommendation,
  useStudyAssistantConfig,
  blockHref,
} from "@/lib/studyAssistant";
import type { ExamCategory } from "@shared/schema";

interface Props {
  category: ExamCategory;
  /** False when the student has no meaningful history - shows the empty state. */
  hasHistory: boolean;
  /**
   * Has the readiness check already been done?
   *
   * The empty state used to send everyone to the readiness check regardless.
   * For a student who had already taken it that was a loop back to a step they
   * had finished; they need practice questions, not another diagnostic.
   */
  hasDiagnostic?: boolean;
}

export function AlexiCard({ category, hasHistory, hasDiagnostic = false }: Props) {
  const { i18n } = useTranslation();
  const es = i18n.language === "es";
  const [showWhy, setShowWhy] = useState(false);

  const { data: config } = useStudyAssistantConfig();
  const { data, isLoading, isError, refetch } = useRecommendation(hasHistory ? category : null);

  const named = config?.displayName ?? STUDY_ASSISTANT.displayName;
  const branded = config?.flags.enabled ?? false;

  // No history: never invent a weakness. Point at the diagnostic.
  if (!hasHistory) {
    return (
      <Card className="h-full border-primary/25 bg-primary/[0.04]" data-testid="card-alexi-empty">
        <CardContent className="flex h-full flex-col p-5 md:p-6">
          <div className="flex items-center gap-3">
            <span className="hidden shrink-0 items-center justify-center rounded-full bg-background/70 p-1 sm:inline-flex">
              <AlexiMascot size={56} waving={false} sparkles={false} animated />
            </span>
            <span className="text-base font-bold">{named}</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {hasDiagnostic
              ? es
                ? `Ya tenemos tu prueba de preparación. Responde algunas preguntas de práctica y ${named} te dirá exactamente qué estudiar.`
                : `We have your readiness check. Answer a few practice questions and ${named} will tell you exactly what to study.`
              : es
                ? `Haz tu diagnóstico de preparación para que ${named} pueda identificar qué debes estudiar primero.`
                : `Take your readiness diagnostic so ${named} can identify what you should study first.`}
          </p>
          {hasDiagnostic ? (
            <Button asChild className="mt-auto w-full sm:w-auto" data-testid="button-alexi-practice">
              <Link href={`/exams/${category}`}>
                {es ? "Empezar a practicar" : "Start practising"}
              </Link>
            </Button>
          ) : (
            <Button asChild className="mt-auto w-full sm:w-auto" data-testid="button-alexi-diagnostic">
              <Link
                href="/readiness-check"
                onClick={() => trackEvent("diagnostic_cta_click", { exam_type: category })}
              >
                {es ? "Comenzar diagnóstico" : "Start Readiness Test"}
              </Link>
            </Button>
          )}
        </CardContent>
      </Card>
    );
  }

  if (isLoading) return <Skeleton className="h-full min-h-56 w-full" data-testid="skeleton-alexi" />;

  if (isError || !data) {
    return (
      <Card className="h-full" data-testid="card-alexi-error">
        <CardContent className="flex h-full flex-col items-center justify-center gap-3 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            {es ? "No pudimos cargar tu recomendación." : "We couldn't load your recommendation."}
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-retry-alexi">
            {es ? "Reintentar" : "Retry"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  const { recommendation: rec, phrasing, profile } = data;

  // The session contents read as one line rather than a bullet list. The
  // concept still gets its own emphasis because it is the answer to "what am I
  // being sent to do".
  const blockSummary = rec.blocks.map((b) => b.label).join(" · ");

  return (
    <Card className="h-full border-primary/25 bg-primary/[0.04]" data-testid="card-alexi">
      <CardContent className="flex h-full flex-col p-5 md:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
          {/* Mascot sits on a pale disc so it reads as a portrait, not a spot
              illustration floating in the card. */}
          <span className="hidden shrink-0 items-center justify-center rounded-full bg-background/70 p-2 shadow-sm sm:inline-flex">
            <AlexiMascot size={92} label={`${named}`} animated />
          </span>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex flex-wrap items-center gap-2">
              <AlexiMascot size={34} waving={false} sparkles={false} className="sm:hidden" />
              <h2 className="text-lg font-bold leading-snug" data-testid="text-alexi-title">
                {branded
                  ? es ? `${named} encontró algo` : `${named} found something`
                  : es ? "Tu próximo paso" : "Your next step"}
              </h2>
              <Badge variant="secondary" className="text-xs">
                {es ? "Recomendado" : "Recommended"}
              </Badge>
              {profile.isRetaker && (
                <Badge variant="outline" className="text-xs">
                  {es ? "Reintento" : "Retaker"}
                </Badge>
              )}
            </div>

            <p className="mt-2.5 text-[0.95rem] leading-relaxed text-muted-foreground" data-testid="text-alexi-headline">
              {phrasing}
            </p>

            {blockSummary && (
              <p className="mt-2 text-sm" data-testid="text-alexi-blocks">
                <span className="font-semibold">
                  {es
                    ? `Sesión de ${rec.estimatedMinutes} min`
                    : `${rec.estimatedMinutes}-minute session`}
                </span>
                <span className="text-primary"> · {blockSummary}</span>
              </p>
            )}

            <div className="mt-4 border-t pt-4">
              <Button asChild size="lg" data-testid="button-alexi-start">
                <Link
                  href={blockHref(rec.mode, category)}
                  onClick={() =>
                    trackEvent("alexi_recommendation_started", {
                      exam_type: category,
                      mode: rec.mode,
                      concept: rec.concept?.conceptId ?? null,
                    })
                  }
                >
                  <Play className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  {es ? "Comenzar sesión" : `Start ${named} Session`}
                </Link>
              </Button>
            </div>
          </div>
        </div>

        {rec.suggestHumanHelp && (
          <div
            className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/10 p-3"
            data-testid="banner-human-help"
          >
            <p className="flex items-start gap-2 text-sm">
              <LifeBuoy
                className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
                aria-hidden="true"
              />
              <span>
                {es
                  ? "Has practicado este tema varias veces sin mucha mejora. Una clase en vivo con LBS podría ayudarte más."
                  : "You've practised this topic several times without much improvement. Live instruction from LBS may help more."}
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
          </div>
        )}

        {/* The reasoning stays inspectable rather than magic, but collapsed -
            students want the action, admins want the evidence. */}
        <button
          type="button"
          onClick={() => setShowWhy((v) => !v)}
          // py-1.5 lifts this past the WCAG 2.2 AA 24px target-size floor; as a
          // standalone disclosure control it does not qualify for the inline
          // exception the way a link inside a sentence would.
          className="mt-3 inline-flex min-h-6 items-center gap-1 self-start rounded py-1.5 text-xs text-muted-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          aria-expanded={showWhy}
          data-testid="button-alexi-why"
        >
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${showWhy ? "rotate-180" : ""}`}
            aria-hidden="true"
          />
          {es ? "¿Por qué esto?" : "Why this?"}
        </button>
        {showWhy && (
          <ul className="mt-2 space-y-1 text-xs text-muted-foreground" data-testid="list-alexi-evidence">
            {rec.evidence.map((line, i) => (
              <li key={i}>· {line}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
