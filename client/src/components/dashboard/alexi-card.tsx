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
import { Clock, Play, LifeBuoy, ChevronDown } from "lucide-react";
import { AlexiMark } from "@/components/alexi-mark";
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
}

export function AlexiCard({ category, hasHistory }: Props) {
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
          <div className="flex items-center gap-2">
            <AlexiMark size={22} className="text-primary" />
            <span className="text-sm font-semibold text-primary">{named}</span>
          </div>
          <p className="mt-3 text-sm text-muted-foreground">
            {es
              ? `Haz tu diagnóstico de preparación para que ${named} pueda identificar qué debes estudiar primero.`
              : `Take your readiness diagnostic so ${named} can identify what you should study first.`}
          </p>
          <Button asChild className="mt-auto w-full sm:w-auto" data-testid="button-alexi-diagnostic">
            <Link
              href="/readiness-check"
              onClick={() => trackEvent("diagnostic_cta_click", { exam_type: category })}
            >
              {es ? "Comenzar diagnóstico" : "Start Readiness Test"}
            </Link>
          </Button>
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

  return (
    <Card className="h-full border-primary/25 bg-primary/[0.04]" data-testid="card-alexi">
      <CardContent className="flex h-full flex-col p-5 md:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <AlexiMark size={22} className="text-primary" />
          <span className="text-sm font-semibold text-primary" data-testid="text-alexi-title">
            {branded
              ? es ? `${named} encontró algo` : `${named} found something`
              : es ? "Tu próximo paso" : "Your next step"}
          </span>
          <Badge variant="secondary" className="text-xs">
            {es ? "Recomendado" : "Recommended"}
          </Badge>
          {profile.isRetaker && (
            <Badge variant="outline" className="text-xs">
              {es ? "Reintento" : "Retaker"}
            </Badge>
          )}
        </div>

        {profile.insight && (
          <p className="mt-3 text-sm" data-testid="text-alexi-insight">
            {profile.insight}
          </p>
        )}

        <h2 className="mt-3 text-lg font-bold leading-snug" data-testid="text-alexi-headline">
          {rec.headline}
        </h2>
        <p className="mt-1.5 text-sm text-muted-foreground" data-testid="text-alexi-phrasing">
          {phrasing}
        </p>

        <ul className="mt-4 space-y-1.5" data-testid="list-alexi-blocks">
          {rec.blocks.map((b, i) => (
            <li key={i} className="flex items-baseline gap-2 text-sm">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />
              <span className="min-w-0">{b.label}</span>
            </li>
          ))}
        </ul>

        <div className="mt-5 flex flex-wrap items-center gap-3">
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
              {es ? `Comenzar sesión` : `Start ${named} Session`}
            </Link>
          </Button>
          <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {rec.estimatedMinutes} {es ? "min" : "min"}
          </span>
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
