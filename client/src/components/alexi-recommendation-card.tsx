/**
 * The assistant's recommendation card.
 *
 * Deliberately opinionated: one recommended action with one primary button,
 * and everything else demoted. A panel of twenty equally-weighted choices puts
 * the "what should I study?" decision back on the student, which is the exact
 * decision this product exists to make for them.
 */

import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Sparkles, Clock, ArrowRight, LifeBuoy, ChevronDown } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import {
  STUDY_ASSISTANT,
  useRecommendation,
  useStudyAssistantConfig,
  modeLabel,
  blockHref,
} from "@/lib/studyAssistant";
import type { ExamCategory } from "@shared/schema";

interface Props {
  category: ExamCategory;
}

export function AlexiRecommendationCard({ category }: Props) {
  const { i18n } = useTranslation();
  const es = i18n.language === "es";
  const [showWhy, setShowWhy] = useState(false);

  const { data: config } = useStudyAssistantConfig();
  const { data, isLoading, isError } = useRecommendation(category);

  // The recommendation engine is deterministic and runs without AI, so this
  // card stays useful when the assistant is switched off entirely. Only the
  // branded framing is gated.
  const named = config?.displayName ?? STUDY_ASSISTANT.displayName;
  const branded = config?.flags.enabled ?? false;

  if (isLoading) {
    return <Skeleton className="h-56 w-full" data-testid="skeleton-alexi" />;
  }

  // A failed recommendation is not worth an error card on the dashboard -
  // the student has plenty of other ways in.
  if (isError || !data) return null;

  const { recommendation: rec, phrasing, profile } = data;
  const insight = profile.insight;

  return (
    <Card
      className="border-primary/25 bg-primary/[0.03]"
      data-testid="card-alexi-recommendation"
    >
      <CardContent className="p-5 md:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Sparkles className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
          <span className="text-sm font-semibold text-primary">
            {branded
              ? es
                ? `${named} encontró algo`
                : `${named} found something`
              : es
                ? "Tu próximo paso"
                : "Your next step"}
          </span>
          {profile.isRetaker && (
            <Badge variant="secondary" className="text-xs">
              {es ? "Reintento" : "Retaker"}
            </Badge>
          )}
        </div>

        {insight && (
          <p className="mt-3 text-sm text-muted-foreground" data-testid="text-alexi-insight">
            {insight}
          </p>
        )}

        <h3 className="mt-3 text-lg font-bold md:text-xl" data-testid="text-alexi-headline">
          {rec.headline}
        </h3>
        <p className="mt-1.5 text-sm text-muted-foreground" data-testid="text-alexi-phrasing">
          {phrasing}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Clock className="h-3.5 w-3.5" aria-hidden="true" />
            {rec.estimatedMinutes} {es ? "min" : "min"}
          </span>
          <span aria-hidden="true">·</span>
          <span>{modeLabel(rec.mode, es)}</span>
          {profile.daysRemaining !== null && (
            <>
              <span aria-hidden="true">·</span>
              <span>
                {es
                  ? `Examen en ${profile.daysRemaining} d`
                  : `Exam in ${profile.daysRemaining}d`}
              </span>
            </>
          )}
        </div>

        {/* The session, block by block, so the student knows what they're
            committing to before they press the button. */}
        <ul className="mt-4 space-y-1.5" data-testid="list-alexi-blocks">
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

        <div className="mt-5 flex flex-wrap gap-2">
          <Button asChild data-testid="button-alexi-start">
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
              {es ? "Empezar" : "Start"}
              <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button variant="outline" asChild data-testid="button-alexi-more">
            <Link href="/study-assistant">
              {es ? "Ver más opciones" : "More options"}
            </Link>
          </Button>
        </div>

        {/* Live help, only when repeated practice has genuinely stalled. */}
        {rec.suggestHumanHelp && (
          <div
            className="mt-4 rounded-md border border-amber-500/30 bg-amber-500/10 p-3"
            data-testid="banner-alexi-human-help"
          >
            <p className="flex items-start gap-2 text-sm">
              <LifeBuoy
                className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
                aria-hidden="true"
              />
              <span>
                {es
                  ? "Has practicado este tema varias veces sin mucha mejora. Una clase en vivo con LBS podría ayudarte más que seguir practicando."
                  : "You've practised this topic several times without much improvement. Live instruction from LBS may help more than more practice."}
              </span>
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-3"
              asChild
              data-testid="button-alexi-live-help"
            >
              <Link
                href="/schedule-exam"
                onClick={() =>
                  trackEvent("alexi_human_help_recommended", { exam_type: category })
                }
              >
                {es ? "Ver ayuda en vivo" : "View live help"}
              </Link>
            </Button>
          </div>
        )}

        {/* Why this was recommended. Collapsed by default - students want the
            action, but the reasoning has to be inspectable rather than magic. */}
        <button
          type="button"
          onClick={() => setShowWhy((v) => !v)}
          className="mt-4 inline-flex items-center gap-1 text-xs text-muted-foreground underline-offset-2 hover:underline"
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
          <ul
            className="mt-2 space-y-1 text-xs text-muted-foreground"
            data-testid="list-alexi-evidence"
          >
            {rec.evidence.map((line, i) => (
              <li key={i}>· {line}</li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
