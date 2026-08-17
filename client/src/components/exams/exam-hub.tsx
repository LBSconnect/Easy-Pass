/**
 * Exams hub - the landing view at /exams.
 *
 * Replaces a flat "pick one of eight buttons" grid. The page now leads with
 * what the student is already working on and what Alexi suggests doing next,
 * then offers the two ways to practise. Choosing an exam is a decision they
 * already made; the useful question here is quick practice or full mock.
 *
 * Readiness rings show only where a real, non-provisional score exists. An
 * exam the student has not touched shows no percentage rather than a zero or
 * an invented one.
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
import { ReadinessRing } from "@/components/readiness-ring";
import { AlexiMark } from "@/components/alexi-mark";
import {
  Home, Shield, Heart, FileText, Zap, ClipboardCheck, ArrowRight, CalendarDays,
  BookOpen, ChevronRight, TrendingUp, TriangleAlert,
} from "lucide-react";
import { trackEvent } from "@/lib/analytics";
import { useStudyAssistantConfig, useRecommendation, STUDY_ASSISTANT } from "@/lib/studyAssistant";
import type { ExamCategory, UserProfile, ExamResult } from "@shared/schema";

type PracticeMode = "quick" | "full";

const EXAMS: Array<{
  id: ExamCategory;
  icon: typeof Home;
  en: string;
  es: string;
  tint: string;
}> = [
  { id: "real_estate", icon: Home, en: "Texas Real Estate Salespersons", es: "Bienes Raíces de Texas", tint: "bg-blue-500/10 text-blue-600 dark:text-blue-400" },
  { id: "property_casualty", icon: Shield, en: "Texas Property and Casualty Insurance", es: "Propiedad y Casualidad de Texas", tint: "bg-amber-500/10 text-amber-600 dark:text-amber-400" },
  { id: "life_insurance", icon: Heart, en: "Texas Life Insurance", es: "Seguro de Vida de Texas", tint: "bg-rose-500/10 text-rose-600 dark:text-rose-400" },
  { id: "general_lines", icon: FileText, en: "Texas General Lines Insurance", es: "Líneas Generales de Texas", tint: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400" },
];

interface Readiness {
  score: number;
  provisional: boolean;
  weakestTopic: string | null;
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** One exam's card. Readiness is fetched per card so a slow one cannot block the grid. */
function ExamCard({
  exam,
  isCurrent,
  es,
}: {
  exam: (typeof EXAMS)[number];
  isCurrent: boolean;
  es: boolean;
}) {
  const { data: readiness } = useQuery<Readiness>({
    queryKey: [`/api/readiness/${exam.id}`],
  });

  // Only a settled score earns a ring. Provisional means "not enough evidence",
  // and rendering it as a percentage would overstate what we know.
  const score = readiness && !readiness.provisional ? readiness.score : null;

  return (
    <Card data-testid={`card-exam-${exam.id}`}>
      <CardContent className="p-5">
        <div className="flex items-start gap-4">
          <span className={`rounded-lg p-3 ${exam.tint}`}>
            <exam.icon className="h-6 w-6" aria-hidden="true" />
          </span>

          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold leading-snug">{es ? exam.es : exam.en}</h3>
            {isCurrent && (
              <Badge variant="secondary" className="mt-1.5 text-xs">
                {es ? "Activo" : "Active"}
              </Badge>
            )}
          </div>

          <ReadinessRing
            value={score}
            size={64}
            caption={score !== null ? (es ? "Listo" : "Ready") : undefined}
            label={es ? `Preparación: ${exam.es}` : `Readiness: ${exam.en}`}
          />
        </div>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <Button variant="outline" asChild className="min-h-11" data-testid={`button-quick-${exam.id}`}>
            <Link
              href={`/exams/${exam.id}`}
              onClick={() => trackEvent("quiz_me_clicked", { exam_type: exam.id })}
            >
              <Zap className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {es ? "Práctica rápida" : "Quick Practice"}
            </Link>
          </Button>
          <Button asChild className="min-h-11" data-testid={`button-mock-${exam.id}`}>
            <Link
              href={`/exams/${exam.id}?mode=full`}
              onClick={() => trackEvent("mock_exam_clicked", { exam_type: exam.id })}
            >
              <ClipboardCheck className="mr-1.5 h-4 w-4" aria-hidden="true" />
              {es ? "Examen simulado" : "Full Mock Exam"}
            </Link>
          </Button>
        </div>

        <Link
          href="/study-guide"
          // min-h-6 + padding clears the WCAG 2.2 AA 24px target floor. This is
          // a standalone card link, not a link inside a sentence, so it does
          // not qualify for the inline exception.
          className="mt-2 inline-flex min-h-6 items-center gap-1 rounded py-1 text-sm text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          data-testid={`link-guide-${exam.id}`}
        >
          {es ? "Ver guía de estudio" : "View Study Guide"}
          <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
        </Link>
      </CardContent>
    </Card>
  );
}

export function ExamHub() {
  const { i18n } = useTranslation();
  const es = i18n.language === "es";
  const [mode, setMode] = useState<PracticeMode>("quick");

  const { data: profile } = useQuery<UserProfile>({ queryKey: ["/api/profile"] });
  const { data: results } = useQuery<ExamResult[]>({ queryKey: ["/api/results"] });
  const { data: config } = useStudyAssistantConfig();

  const allowed = (profile?.allowedCategories as ExamCategory[] | null) ?? [];
  const mostRecent = results
    ?.slice()
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0];
  const current =
    (profile?.preferredCategory as ExamCategory | null) ??
    (mostRecent?.category as ExamCategory | undefined) ??
    allowed[0] ??
    null;

  const { data: recommendation } = useRecommendation(current);
  const { data: currentReadiness } = useQuery<Readiness>({
    queryKey: [`/api/readiness/${current}`],
    enabled: Boolean(current),
  });

  const named = config?.displayName ?? STUDY_ASSISTANT.displayName;
  const alexiOn = config?.flags.enabled ?? false;

  useEffect(() => {
    trackEvent("exams_page_view", { exam_type: current ?? null });
  }, [current]);

  const examDate = profile?.examDate ? new Date(profile.examDate) : null;
  const today = new Date();
  const daysLeft = examDate
    ? Math.max(
        0,
        Math.round(
          (Date.UTC(examDate.getUTCFullYear(), examDate.getUTCMonth(), examDate.getUTCDate()) -
            Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) /
            DAY_MS,
        ),
      )
    : null;

  const currentExam = EXAMS.find((e) => e.id === current);

  // Recent results, only where real data exists.
  const weekAgo = Date.now() - 7 * DAY_MS;
  const questionsThisWeek = (results ?? [])
    .filter((r) => new Date(r.completedAt).getTime() >= weekAgo)
    .reduce((sum, r) => sum + (r.totalQuestions ?? 0), 0);
  const lastMock = mostRecent ?? null;
  const hasRecentData = Boolean(lastMock) || questionsThisWeek > 0;

  const steps = [
    {
      n: 1,
      icon: Zap,
      title: es ? "Empieza con práctica rápida" : "Start with Quick Practice",
      sub: es
        ? "Gana impulso con sesiones cortas y enfocadas."
        : "Build momentum with short, focused practice sessions.",
    },
    {
      n: 2,
      icon: TrendingUp,
      title: es ? "Repasa tus temas débiles" : "Review Weak Topics",
      sub: es
        ? "Usa tus resultados para reforzar tus áreas más bajas."
        : "Use your results to strengthen your lowest-scoring areas.",
    },
    {
      n: 3,
      icon: ClipboardCheck,
      title: es ? "Haz un examen simulado" : "Take a Full Mock Exam",
      sub: es
        ? "Simula el examen real y mide tu preparación."
        : "Simulate the real exam and track your readiness.",
    },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <div className="container mx-auto max-w-[1320px] px-4 py-6 md:py-8">
          {/* Header */}
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3">
              <span className="rounded-lg bg-primary/10 p-3">
                <ClipboardCheck className="h-6 w-6 text-primary" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h1 className="text-2xl font-bold md:text-3xl">{es ? "Exámenes" : "Exams"}</h1>
                <p className="text-sm text-muted-foreground">
                  {es
                    ? "Elige la mejor forma de practicar antes del día del examen."
                    : "Choose the best way to practice and build confidence before test day."}
                </p>
              </div>
            </div>

            {currentExam && (
              <Link
                href="/dashboard"
                className="flex min-h-11 shrink-0 items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                data-testid="link-current-exam"
              >
                <CalendarDays className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <span className="min-w-0">
                  <span className="block text-sm font-medium">
                    {es ? "Examen actual: " : "Current Exam: "}
                    {es ? currentExam.es : currentExam.en}
                    {daysLeft !== null && (
                      <span className="ml-1.5 text-primary">
                        · {daysLeft} {es ? "días" : "days left"}
                      </span>
                    )}
                  </span>
                  {examDate && (
                    <span className="block text-xs text-muted-foreground">
                      {es ? "Fecha: " : "Exam Date: "}
                      {examDate.toLocaleDateString(es ? "es-US" : "en-US", {
                        month: "long",
                        day: "numeric",
                        year: "numeric",
                        timeZone: "UTC",
                      })}
                    </span>
                  )}
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            )}
          </div>

          {/* Alexi banner - only with a real recommendation to make. */}
          {recommendation && current && (
            <Card className="mt-6 border-primary/25 bg-primary/[0.04]" data-testid="card-exams-alexi">
              <CardContent className="flex flex-col gap-4 p-5 md:flex-row md:items-center md:justify-between md:p-6">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <AlexiMark size={22} className="text-primary" />
                    <span className="text-sm font-semibold text-primary">
                      {alexiOn ? (es ? `${named} recomienda` : `${named} recommends`) : es ? "Recomendado" : "Recommended"}
                    </span>
                  </div>
                  <h2 className="mt-2 text-lg font-bold leading-snug" data-testid="text-exams-alexi-headline">
                    {recommendation.recommendation.headline}
                  </h2>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {recommendation.phrasing}
                  </p>
                </div>

                <div className="shrink-0 md:text-right">
                  <Button asChild size="lg" data-testid="button-exams-alexi-start">
                    <Link
                      href={`/exams/${current}`}
                      onClick={() =>
                        trackEvent("alexi_recommendation_started", {
                          exam_type: current,
                          mode: recommendation.recommendation.mode,
                        })
                      }
                    >
                      {es ? "Comenzar sesión recomendada" : "Start Recommended Session"}
                      <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <p className="mt-2 text-xs text-muted-foreground">
                    {recommendation.recommendation.estimatedMinutes} {es ? "min" : "min"}
                    {" · "}
                    {es ? "Personalizado a tus temas débiles" : "Personalised to your weak topics"}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Mode selector. Radio semantics, not links - it filters the grid below. */}
          <div className="mt-6 grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label={es ? "Modo de práctica" : "Practice mode"}>
            {([
              { key: "quick" as const, icon: Zap, title: es ? "Práctica rápida" : "Quick Practice", sub: es ? "Sesiones cortas y enfocadas" : "Short, focused sessions to build speed and confidence" },
              { key: "full" as const, icon: ClipboardCheck, title: es ? "Exámenes simulados" : "Full Mock Exams", sub: es ? "Simula el examen real cronometrado" : "Simulate the real exam under timed conditions" },
            ]).map((m) => (
              <button
                key={m.key}
                type="button"
                role="radio"
                aria-checked={mode === m.key}
                onClick={() => setMode(m.key)}
                className={`flex min-h-11 items-start gap-3 rounded-lg border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                  mode === m.key ? "border-primary bg-primary/[0.06]" : "hover:bg-muted/60"
                }`}
                data-testid={`button-mode-${m.key}`}
              >
                <m.icon
                  className={`mt-0.5 h-5 w-5 shrink-0 ${mode === m.key ? "text-primary" : "text-muted-foreground"}`}
                  aria-hidden="true"
                />
                <span className="min-w-0">
                  <span className={`block font-semibold ${mode === m.key ? "text-primary" : ""}`}>
                    {m.title}
                  </span>
                  <span className="block text-sm text-muted-foreground">{m.sub}</span>
                </span>
              </button>
            ))}
          </div>

          {/* Exam grid */}
          <div className="mt-4 grid gap-4 lg:grid-cols-2">
            {EXAMS.map((exam) => (
              <ExamCard key={exam.id} exam={exam} isCurrent={exam.id === current} es={es} />
            ))}
          </div>

          {/* Guidance + recent results */}
          <div className="mt-6 grid gap-4 lg:grid-cols-2">
            <Card data-testid="card-before-you-start">
              <CardContent className="p-5">
                <h2 className="text-base font-semibold">
                  {es ? "Antes de empezar" : "Before You Start"}
                </h2>
                <ol className="mt-3 space-y-3">
                  {steps.map((s) => (
                    <li key={s.n} className="flex items-start gap-3">
                      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                        {s.n}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{s.title}</span>
                        <span className="block text-xs text-muted-foreground">{s.sub}</span>
                      </span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>

            <Card data-testid="card-recent-results">
              <CardContent className="p-5">
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-base font-semibold">
                    {es ? "Tus resultados recientes" : "Your Recent Results"}
                  </h2>
                  {hasRecentData && (
                    <Link
                      href="/profile"
                      className="inline-flex min-h-6 items-center rounded py-1 text-sm text-primary underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      data-testid="link-all-results"
                    >
                      {es ? "Ver todos" : "View all"}
                    </Link>
                  )}
                </div>

                {!hasRecentData ? (
                  <p className="mt-3 text-sm text-muted-foreground">
                    {es
                      ? "Aún no hay resultados. Haz una práctica rápida para empezar a medir tu progreso."
                      : "No results yet. Take a quick practice session to start tracking your progress."}
                  </p>
                ) : (
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    {lastMock && (
                      <div className="rounded-lg border p-3">
                        <p className="text-xs text-muted-foreground">
                          {es ? "Último resultado" : "Last Score"}
                        </p>
                        <p className="mt-1 text-xl font-bold" data-testid="stat-last-score">
                          {lastMock.score}%
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(lastMock.completedAt).toLocaleDateString(es ? "es-US" : "en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                        </p>
                      </div>
                    )}
                    <div className="rounded-lg border p-3">
                      <p className="text-xs text-muted-foreground">
                        {es ? "Preguntas esta semana" : "Questions This Week"}
                      </p>
                      <p className="mt-1 text-xl font-bold" data-testid="stat-questions-week">
                        {questionsThisWeek}
                      </p>
                    </div>
                    {currentReadiness?.weakestTopic && (
                      <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3">
                        <p className="flex items-center gap-1 text-xs text-muted-foreground">
                          <TriangleAlert className="h-3 w-3" aria-hidden="true" />
                          {es ? "Tema más débil" : "Weakest Topic"}
                        </p>
                        <p className="mt-1 truncate text-sm font-semibold" data-testid="stat-weakest">
                          {currentReadiness.weakestTopic}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {es ? "Enfócate aquí" : "Focus here next"}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
