/**
 * The assistant's home screen.
 *
 * Leads with the single recommended action, then offers a session-length
 * picker and a small set of secondary actions. The ordering is the point: a
 * student arriving here should not have to choose between eight equal options
 * before they can start studying.
 */

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Sparkles, Clock, ArrowRight, Layers, RefreshCw, Target, BookOpen, LifeBuoy } from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import {
  STUDY_ASSISTANT,
  useRecommendation,
  useStudyAssistantConfig,
  modeLabel,
  blockHref,
} from "@/lib/studyAssistant";
import type { ExamCategory, UserProfile } from "@shared/schema";

/** Session lengths a student can actually commit to. */
const DURATIONS = [10, 15, 30, 60];

export default function StudyAssistantPage() {
  const { i18n } = useTranslation();
  const es = i18n.language === "es";
  const [minutes, setMinutes] = useState(15);

  const { data: config } = useStudyAssistantConfig();
  const { data: profile } = useQuery<UserProfile>({ queryKey: ["/api/profile"] });

  const category = ((profile?.allowedCategories as ExamCategory[] | null) ?? [])[0]
    ?? ("real_estate" as ExamCategory);

  const { data, isLoading, isError } = useRecommendation(category, minutes);
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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <div className="container mx-auto max-w-3xl px-4 py-8">
          <div className="flex items-center gap-2">
            <Sparkles className="h-6 w-6 shrink-0 text-primary" aria-hidden="true" />
            <h1 className="text-2xl font-bold md:text-3xl">{named}</h1>
          </div>
          <p className="mt-1 text-muted-foreground">
            {es ? STUDY_ASSISTANT.taglineEs : STUDY_ASSISTANT.taglineEn}
          </p>

          {/* Readiness at a glance. */}
          {student && (
            <div className="mt-6 grid gap-3 sm:grid-cols-3" data-testid="grid-alexi-stats">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs text-muted-foreground">
                    {es ? "Puntaje EasyPass" : "EasyPass Score"}
                  </p>
                  <p className="mt-1 text-2xl font-bold" data-testid="text-alexi-score">
                    {student.easyPassScore ?? "—"}
                  </p>
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

          {/* How long have you got? Re-asks the engine, which reshapes the
              session rather than just trimming it. */}
          <div className="mt-6">
            <p className="text-sm font-medium">
              {es ? "¿Cuánto tiempo tienes?" : "How long have you got?"}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              {DURATIONS.map((d) => (
                <Button
                  key={d}
                  size="sm"
                  variant={minutes === d ? "default" : "outline"}
                  onClick={() => setMinutes(d)}
                  data-testid={`button-duration-${d}`}
                >
                  {d} {es ? "min" : "min"}
                </Button>
              ))}
            </div>
          </div>

          {isLoading && <Skeleton className="mt-6 h-64 w-full" />}

          {isError && (
            <Card className="mt-6">
              <CardContent className="py-10 text-center text-muted-foreground">
                {es
                  ? "No pudimos preparar tu recomendación. Puedes seguir practicando normalmente."
                  : "We couldn't prepare your recommendation. You can keep practising as normal."}
              </CardContent>
            </Card>
          )}

          {rec && student && (
            <>
              {student.insight && (
                <Card className="mt-6 border-primary/25 bg-primary/[0.03]">
                  <CardContent className="p-4">
                    <p className="flex items-start gap-2 text-sm">
                      <Sparkles
                        className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                        aria-hidden="true"
                      />
                      <span data-testid="text-page-insight">{student.insight}</span>
                    </p>
                  </CardContent>
                </Card>
              )}

              <Card className="mt-4" data-testid="card-alexi-primary">
                <CardContent className="p-5 md:p-6">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge>{modeLabel(rec.mode, es)}</Badge>
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                      {rec.estimatedMinutes} {es ? "min" : "min"}
                    </span>
                  </div>

                  <h2 className="mt-3 text-xl font-bold">{rec.headline}</h2>
                  <p className="mt-1.5 text-sm text-muted-foreground">{data.phrasing}</p>

                  {rec.concept && (
                    <div className="mt-4">
                      <div className="flex items-baseline justify-between gap-2 text-sm">
                        <span className="min-w-0 truncate">{rec.concept.label}</span>
                        <span className="shrink-0 text-muted-foreground">
                          {rec.concept.mastery}%
                        </span>
                      </div>
                      <Progress
                        value={rec.concept.mastery}
                        className="mt-1.5 h-1.5"
                        aria-label={
                          es
                            ? `Dominio de ${rec.concept.label}`
                            : `${rec.concept.label} mastery`
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

                  <Button asChild className="mt-5 w-full sm:w-auto" data-testid="button-page-start">
                    <Link
                      href={blockHref(rec.mode, category)}
                      onClick={() =>
                        trackEvent("alexi_recommendation_started", {
                          exam_type: category,
                          mode: rec.mode,
                        })
                      }
                    >
                      {es ? "Empezar sesión" : "Start session"}
                      <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              {rec.suggestHumanHelp && (
                <Card className="mt-4 border-amber-500/30 bg-amber-500/10">
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
                        onClick={() =>
                          trackEvent("alexi_human_help_recommended", { exam_type: category })
                        }
                      >
                        {es ? "Ver ayuda en vivo" : "View live help"}
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Weakest areas, so the recommendation sits in context rather
                  than arriving out of nowhere. */}
              {student.weakestConcepts.length > 0 && (
                <Card className="mt-4">
                  <CardContent className="p-5">
                    <h3 className="font-semibold">
                      {es ? "Tus áreas más débiles" : "Your weakest areas"}
                    </h3>
                    <ul className="mt-3 space-y-3">
                      {student.weakestConcepts.map((c) => (
                        <li key={c.conceptId}>
                          <div className="flex items-baseline justify-between gap-2 text-sm">
                            <span className="min-w-0 truncate">{c.label}</span>
                            <span className="shrink-0 text-muted-foreground">{c.mastery}%</span>
                          </div>
                          <Progress value={c.mastery} className="mt-1.5 h-1.5" />
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              )}

              {/* Secondary actions, deliberately smaller than the primary CTA. */}
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <Button variant="outline" className="justify-start" asChild>
                  <Link href="/missed-questions">
                    <RefreshCw className="mr-2 h-4 w-4" aria-hidden="true" />
                    {es ? "Repasar mis errores" : "Review my mistakes"}
                  </Link>
                </Button>
                <Button variant="outline" className="justify-start" asChild>
                  <Link href="/flashcards">
                    <Layers className="mr-2 h-4 w-4" aria-hidden="true" />
                    {es ? "Tarjetas de estudio" : "Flashcards"}
                  </Link>
                </Button>
                <Button variant="outline" className="justify-start" asChild>
                  <Link href={`/exams/${category}`}>
                    <Target className="mr-2 h-4 w-4" aria-hidden="true" />
                    {es ? "Práctica dirigida" : "Targeted practice"}
                  </Link>
                </Button>
                <Button variant="outline" className="justify-start" asChild>
                  <Link href="/study-guide">
                    <BookOpen className="mr-2 h-4 w-4" aria-hidden="true" />
                    {es ? "Guías de estudio" : "Study guides"}
                  </Link>
                </Button>
              </div>

              <p className="mt-6 text-xs text-muted-foreground">
                {es
                  ? "Tu Puntaje EasyPass es un indicador de preparación de MyEasyPass basado en tu actividad y rendimiento. No garantiza ni predice el resultado de un examen oficial de licencia."
                  : "Your EasyPass Score is a MyEasyPass study-readiness indicator based on your activity and performance. It does not guarantee or predict an official licensing-exam result."}
              </p>
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
