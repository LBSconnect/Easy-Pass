import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearch } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Progress } from "@/components/ui/progress";
import { PageShell } from "@/components/page-shell";
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";
import { EXAM_VISUALS } from "@/lib/examVisuals";
import { trackEvent } from "@/lib/analytics";
import { useSEO, buildUrl } from "@/hooks/use-seo";
import { useAuth } from "@/hooks/use-auth";
import { useStudyAssistantConfig } from "@/lib/studyAssistant";
import { STUDY_ASSISTANT } from "@shared/studyAssistant";
import { ArrowRight, Loader2, RotateCcw, Target, Sparkles, TrendingUp } from "lucide-react";
import type { ExamCategory } from "@shared/schema";

const categories: ExamCategory[] = ["real_estate", "property_casualty", "life_insurance", "general_lines"];

/** Named the way the exam is sold, so the CTA reads as the thing they came for. */
const EXAM_LABELS: Record<ExamCategory, { en: string; es: string }> = {
  real_estate: { en: "Real Estate", es: "Bienes Raíces" },
  property_casualty: { en: "Property & Casualty", es: "Propiedad y Accidentes" },
  life_insurance: { en: "Life Insurance", es: "Seguro de Vida" },
  general_lines: { en: "General Lines", es: "Líneas Generales" },
};

interface SavedDiagnostic {
  category: string;
  score: number | null;
  correctAnswers: number | null;
  totalQuestions: number;
  completedAt: string | null;
}

interface DiagnosticQuestion {
  id: string;
  questionTextEn: string;
  questionTextEs: string;
  optionsEn: string[];
  optionsEs: string[];
}

interface WeakArea {
  id: string;
  nameEn: string;
  nameEs: string;
  missed: number;
  asked: number;
}

interface DiagnosticResult {
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  category?: string;
  /** Optional: an older server, or one that could not resolve topics, omits it. */
  weakAreas?: WeakArea[];
}

function readinessCopy(score: number, isSpanish: boolean) {
  if (score >= 80) {
    return {
      label: isSpanish ? "Base sólida" : "Strong foundation",
      message: isSpanish
        ? "Tu muestra inicial es fuerte. Alexi puede concentrar tu tiempo en brechas específicas y práctica de nivel examen."
        : "Your initial sample is strong. Alexi can focus your time on specific gaps and exam-level practice.",
    };
  }

  if (score >= 60) {
    return {
      label: isSpanish ? "En desarrollo" : "Developing",
      message: isSpanish
        ? "Tienes una base útil, pero todavía hay áreas que pueden costarte puntos. Alexi puede priorizar qué estudiar primero."
        : "You have a useful foundation, but there are still areas that can cost you points. Alexi can prioritize what to study first.",
    };
  }

  return {
    label: isSpanish ? "Construir fundamentos" : "Build the foundations",
    message: isSpanish
      ? "Esta muestra encontró brechas importantes. Eso es exactamente lo que una evaluación debe revelar: Alexi puede convertirlas en un plan paso a paso."
      : "This sample found important gaps. That is exactly what a diagnostic should reveal: Alexi can turn them into a step-by-step plan.",
  };
}

export default function DiagnosticPage() {
  const { t, i18n } = useTranslation();
  const isSpanish = i18n.language === "es";
  const { isAuthenticated } = useAuth();
  const search = useSearch();

  useSEO({
    title: isSpanish
      ? "Evaluación Gratis de Preparación | MyEasyPass"
      : "Free Exam Readiness Check | MyEasyPass",
    description: isSpanish
      ? "Responde 10 preguntas gratis, recibe tu puntuación diagnóstica y descubre qué estudiar después con MyEasyPass."
      : "Answer 10 free questions, get your diagnostic readiness score, and see what to study next with MyEasyPass.",
    canonicalUrl: buildUrl(isSpanish ? "/readiness-check?lang=es" : "/readiness-check"),
    hreflang: [
      { lang: "en", url: buildUrl("/readiness-check") },
      { lang: "es", url: buildUrl("/readiness-check?lang=es") },
      { lang: "x-default", url: buildUrl("/readiness-check") },
    ],
  });

  /**
   * A readiness check this student has already finished.
   *
   * Returns null for a signed-out visitor - the assessment is public, and the
   * endpoint that remembers results is not. So a guest sees the picker exactly
   * as before, and a signed-in student who has already done one is shown what
   * they scored instead of being walked through it again.
   */
  const { data: saved, isLoading: savedLoading } = useQuery<SavedDiagnostic | null>({
    queryKey: ["/api/diagnostic/latest"],
    queryFn: getQueryFn({ on401: "returnNull" }),
  });
  /** Set when they choose to redo it, so the saved result stops standing in. */
  const [retaking, setRetaking] = useState(false);

  const [category, setCategory] = useState<ExamCategory | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<DiagnosticQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<DiagnosticResult | null>(null);

  const startMutation = useMutation({
    mutationFn: async (cat: ExamCategory) => {
      const res = await apiRequest("POST", "/api/diagnostic/start", { category: cat });
      const data = await res.json();
      if (!data?.attemptId || !Array.isArray(data.questions) || data.questions.length === 0) {
        throw new Error("no-questions");
      }
      return data;
    },
    onSuccess: (data) => {
      setAttemptId(data.attemptId);
      setQuestions(data.questions);
      setCurrentIndex(0);
      setAnswers({});
      setResult(null);
    },
    onError: () => {
      setCategory(null);
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/diagnostic/${attemptId}/submit`, { answers });
      const data = await res.json();
      if (typeof data?.score !== "number" || typeof data?.correctAnswers !== "number" || typeof data?.totalQuestions !== "number") {
        throw new Error("no-result");
      }

      // Preserve the exact completed attempt in the secure server-side session
      // before the visitor enters signup/login. This is deliberately best
      // effort: a transient stash failure must never hide a score they earned.
      try {
        await apiRequest("POST", "/api/diagnostic/stash", { attemptId, answers });
      } catch (error) {
        console.warn("Could not preserve diagnostic evidence for account handoff", error);
      }

      return data as DiagnosticResult;
    },
    onSuccess: (data) => {
      setResult(data);
      queryClient.invalidateQueries({ queryKey: ["/api/diagnostic/latest"] });
      trackEvent("diagnostic_cta_click", {
        category: category ?? undefined,
        step: "score_revealed",
        score: data.score,
      });
    },
  });

  const handleSelectCategory = (cat: ExamCategory, source: "chooser" | "preselected" = "chooser") => {
    setCategory(cat);
    trackEvent("diagnostic_cta_click", { category: cat, step: "start" });
    trackEvent("diagnostic_start", { category: cat, source });
    startMutation.mutate(cat);
  };

  // Arriving with the exam already chosen - from a landing page or a retaker
  // CTA - starts it, rather than showing a chooser with one obvious answer.
  //
  // Guarded on `attemptId` and `startMutation.isPending` as well as `category`
  // because this runs on every render: without them, a re-render mid-request
  // would fire a second attempt, and the student would answer questions
  // belonging to an attempt that had already been replaced.
  //
  // Anyone opening /readiness-check with no parameter, or with one that is not
  // an exam we run, still gets the chooser. An unknown value is ignored rather
  // than guessed at.
  const requestedCategory = new URLSearchParams(search).get("category");
  const preselected =
    requestedCategory && (categories as string[]).includes(requestedCategory)
      ? (requestedCategory as ExamCategory)
      : null;

  useEffect(() => {
    if (!preselected) return;
    if (category || attemptId || retaking) return;
    if (startMutation.isPending || savedLoading) return;
    // A returning student with a saved result keeps seeing it; auto-starting
    // over the top of their own history would look like it had been lost.
    if (saved?.completedAt) return;
    handleSelectCategory(preselected, "preselected");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [preselected, category, attemptId, retaking, startMutation.isPending, savedLoading, saved?.completedAt]);

  const handleSelectAnswer = (questionId: string, index: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: index }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      const nextIndex = currentIndex + 1;
      // A single midpoint marker. Enough to see where a ten-question run loses
      // people without turning every answer into an analytics write.
      if (nextIndex === Math.floor(questions.length / 2)) {
        trackEvent("diagnostic_progress", {
          category: category ?? undefined,
          question_number: nextIndex,
          total_questions: questions.length,
        });
      }
      setCurrentIndex(nextIndex);
    } else {
      submitMutation.mutate();
    }
  };

  const handleRestart = () => {
    setRetaking(false);
    setCategory(null);
    setAttemptId(null);
    setQuestions([]);
    setCurrentIndex(0);
    setAnswers({});
    setResult(null);
  };

  const currentQuestion = questions[currentIndex];
  const showSaved = Boolean(saved?.completedAt) && !category && !result && !retaking;
  const activeScore = result?.score ?? saved?.score ?? null;
  const activeCategory = (result?.category ?? category ?? saved?.category ?? null) as ExamCategory | null;
  const band = activeScore !== null ? readinessCopy(activeScore, isSpanish) : null;
  const alexiDestination = `/study-assistant${activeCategory ? `?category=${activeCategory}` : ""}`;
  const alexiHref = isAuthenticated
    ? alexiDestination
    : `/signup?next=${encodeURIComponent(alexiDestination)}&source=readiness-check`;

  // Carries the exam into pricing, which preselects from it and then carries
  // it through login and into checkout. Nobody picks their exam twice.
  const pricingHref = activeCategory ? `/pricing?category=${activeCategory}` : "/pricing";
  const examLabel = activeCategory
    ? (isSpanish ? EXAM_LABELS[activeCategory].es : EXAM_LABELS[activeCategory].en)
    : (isSpanish ? "tu examen" : "your exam");

  // Only ever what the server sent back. A saved result is a score without the
  // per-question evidence, so it correctly shows no areas rather than stale ones.
  const weakAreas = result?.weakAreas ?? [];

  // Named from config so the assistant can be renamed in one place, and hidden
  // entirely when it is switched off rather than advertised and then missing.
  const { data: assistantConfig } = useStudyAssistantConfig();
  const assistantName = assistantConfig?.displayName ?? STUDY_ASSISTANT.displayName;
  const assistantEnabled = assistantConfig?.flags?.enabled === true;

  // One view event per revealed score, whether it was just earned or restored
  // from a previous visit - both are someone looking at their result.
  const viewedScore = activeScore;
  useEffect(() => {
    if (viewedScore === null) return;
    trackEvent("diagnostic_result_view", {
      category: activeCategory ?? undefined,
      score: viewedScore,
      weak_area_count: weakAreas.length,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewedScore, activeCategory]);

  const renderScoreCard = (score: number, correctAnswers: number, totalQuestions: number, savedMode = false) => (
    <Card data-testid={savedMode ? "card-diagnostic-saved" : "card-diagnostic-result"}>
      <CardHeader className="text-center">
        <div className="mx-auto mb-2 rounded-full bg-primary/10 p-3">
          <Target className="h-8 w-8 text-primary" aria-hidden="true" />
        </div>
        <CardTitle as="h1" className="text-2xl md:text-3xl">
          {isSpanish ? "Tu Puntuación Diagnóstica de Preparación" : "Your Diagnostic Readiness Score"}
        </CardTitle>
        <CardDescription>
          {isSpanish
            ? `Acertaste ${correctAnswers} de ${totalQuestions} preguntas.`
            : `You answered ${correctAnswers} of ${totalQuestions} questions correctly.`}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="text-center">
          <div className="text-6xl font-bold text-primary" data-testid={savedMode ? "text-saved-score" : "text-diagnostic-score"}>
            {score}%
          </div>
          {band && (
            <div className="mt-3">
              <p className="text-lg font-semibold" data-testid="text-readiness-band">{band.label}</p>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-muted-foreground">{band.message}</p>
            </div>
          )}
        </div>

        {/* Where the marks actually went. Only topics with a missed question
            appear, and only ones the study-topic config can name - see
            shared/diagnosticWeakness. No list rather than a padded one. */}
        {weakAreas.length > 0 && (
          <div className="rounded-xl border bg-muted/30 p-4 text-left" data-testid="card-weak-areas">
            <p className="font-semibold">{isSpanish ? "Enfócate ahora en:" : "Focus next on:"}</p>
            <ul className="mt-2 space-y-1.5">
              {weakAreas.map((area) => (
                <li key={area.id} className="flex items-start gap-2 text-sm" data-testid={`weak-area-${area.id}`}>
                  <Target className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                  <span>
                    {isSpanish ? area.nameEs : area.nameEn}
                    <span className="text-muted-foreground">
                      {isSpanish
                        ? ` — ${area.missed} de ${area.asked} incorrectas`
                        : ` — missed ${area.missed} of ${area.asked}`}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="rounded-xl border bg-primary/5 p-4 text-left" data-testid="card-result-offer">
          <p className="font-semibold">
            {isSpanish
              ? `Qué incluye la preparación de ${examLabel}`
              : `What ${examLabel} prep includes`}
          </p>
          <ul className="mt-2 grid gap-1.5 text-sm text-muted-foreground sm:grid-cols-2">
            <li>{isSpanish ? "Exámenes de práctica cronometrados" : "Timed practice exams"}</li>
            <li>{isSpanish ? "Cientos de preguntas con explicaciones" : "Hundreds of questions with explanations"}</li>
            <li>{isSpanish ? "Guía de estudio por tema" : "Topic-by-topic study guide"}</li>
            <li>{isSpanish ? "Cuaderno de preguntas falladas" : "A notebook of what you missed"}</li>
            {assistantEnabled && (
              <li>{isSpanish ? `Estudio personalizado con ${assistantName}` : `Personalized study with ${assistantName}`}</li>
            )}
          </ul>
          <p className="mt-3 text-sm">
            {isSpanish
              ? "Precio y planes actuales en la página de precios."
              : "Current pricing and plans are on the pricing page."}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-3 text-left">
          <div className="rounded-lg border p-3">
            <Target className="h-4 w-4 text-primary" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium">{isSpanish ? "1. Detecta brechas" : "1. Find the gaps"}</p>
          </div>
          <div className="rounded-lg border p-3">
            <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium">{isSpanish ? "2. Alexi prioriza" : "2. Alexi prioritizes"}</p>
          </div>
          <div className="rounded-lg border p-3">
            <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
            <p className="mt-2 text-sm font-medium">{isSpanish ? "3. Mejora tu puntaje" : "3. Improve your score"}</p>
          </div>
        </div>

        <p className="text-center text-xs leading-relaxed text-muted-foreground">
          {isSpanish
            ? "Esta puntuación es una muestra diagnóstica de 10 preguntas, no una predicción de aprobación ni un examen oficial. Tu EasyPass Score completo se vuelve más útil a medida que practicas."
            : "This is a 10-question diagnostic snapshot, not a pass prediction or an official exam. Your full EasyPass Score becomes more informative as you practice."}
        </p>

        {/* CTA order is the change that matters on this card.

            The dominant action used to be "create a free account", which asks
            paid-search traffic to sign up before they have seen what is being
            sold. The product is what they came for, so the product goes first
            and the account is asked for at checkout, where it is unavoidable.
            Alexi stays as a real second option rather than the only door. */}
        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            size="lg"
            asChild
            className="gap-2"
            onClick={() => {
              trackEvent("result_upgrade_click", {
                category: activeCategory ?? undefined,
                score,
                authenticated: isAuthenticated,
              });
              trackEvent("diagnostic_cta_click", {
                category: activeCategory ?? undefined,
                step: "upgrade",
                score,
              });
            }}
            data-testid="button-diagnostic-upgrade"
          >
            <Link href={pricingHref}>
              {isSpanish ? `Empezar mi preparación de ${examLabel}` : `Start my ${examLabel} prep`}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            asChild
            className="gap-2"
            onClick={() => trackEvent("diagnostic_cta_click", {
              category: activeCategory ?? undefined,
              step: isAuthenticated ? "alexi_plan" : "alexi_plan_signup",
              score,
            })}
            data-testid="button-diagnostic-alexi-plan"
          >
            <Link href={alexiHref}>
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {isAuthenticated
                ? (isSpanish ? "Crear mi plan con Alexi" : "Build my Alexi study plan")
                : (isSpanish ? "Crear cuenta gratis y mi plan" : "Create free account & build my plan")}
            </Link>
          </Button>
        </div>

        {/* Not everyone is ready to buy, and pretending otherwise loses the
            ones who would have come back. Retaking stays available. */}
        <div className="flex justify-center">
          <Button
            variant="ghost"
            onClick={savedMode ? () => setRetaking(true) : handleRestart}
            className="gap-2"
            // Named for which card it is on, like the card and the score two
            // dozen lines above. The saved card lost its own name when the
            // fresh and saved results were merged into this one function, and
            // the spec asserting a student can still retake had nothing left
            // to click.
            data-testid={savedMode ? "button-saved-retake" : "button-diagnostic-restart"}
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {isSpanish ? "Intentar otra categoría" : "Try another category"}
          </Button>
        </div>

      </CardContent>
    </Card>
  );

  return (
    <PageShell width="narrow">
      <div>
          {showSaved && saved && saved.score !== null && (
            renderScoreCard(saved.score, saved.correctAnswers ?? 0, saved.totalQuestions, true)
          )}

          {!category && !showSaved && (
            <>
              <div className="text-center mb-8">
                <p className="mb-2 text-sm font-semibold text-primary">
                  {isSpanish ? "Gratis · 10 preguntas · Resultado inmediato" : "Free · 10 questions · Instant result"}
                </p>
                <h1 className="text-2xl md:text-3xl font-bold mb-3">
                  {isSpanish ? "Evaluación de Preparación MyEasyPass" : "MyEasyPass Readiness Check"}
                </h1>
                <p className="text-muted-foreground text-lg">
                  {isSpanish
                    ? "Descubre dónde estás hoy y qué deberías estudiar después. Sin suscripción y sin ocultar tu resultado."
                    : "See where you stand today and what you should study next. No subscription and no hidden score."}
                </p>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                {categories.map((cat) => {
                  const visual = EXAM_VISUALS[cat];
                  const Icon = visual.icon;
                  return (
                    <button
                      key={cat}
                      onClick={() => handleSelectCategory(cat)}
                      disabled={startMutation.isPending}
                      className={`text-left rounded-xl border-2 hover-elevate transition-all p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60 ${visual.tint} ${visual.border}`}
                      data-testid={`button-diagnostic-category-${cat}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`shrink-0 p-3 rounded-xl ${visual.tint}`}>
                          <Icon className="h-7 w-7" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-lg font-semibold text-foreground">
                            {t(`categories.${cat}`)}
                          </div>
                        </div>
                        {startMutation.isPending && startMutation.variables === cat && (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
              {startMutation.isError && (
                <p className="text-center text-destructive text-sm mt-4">
                  {isSpanish ? "No se pudo iniciar la evaluación. Intenta de nuevo." : "Couldn't start the assessment. Please try again."}
                </p>
              )}
            </>
          )}

          {category && !result && currentQuestion && (
            <Card>
              <CardHeader className="pb-4">
                <div className="flex items-center justify-between mb-2">
                  <h1 className="text-sm font-medium text-muted-foreground">
                    {isSpanish
                      ? `Pregunta ${currentIndex + 1} de ${questions.length}`
                      : `Question ${currentIndex + 1} of ${questions.length}`}
                  </h1>
                </div>
                <Progress value={((currentIndex + 1) / questions.length) * 100} className="h-1.5" />
              </CardHeader>
              <CardContent className="space-y-6">
                <h2 className="text-lg font-medium" data-testid="text-diagnostic-question">
                  {isSpanish ? currentQuestion.questionTextEs : currentQuestion.questionTextEn}
                </h2>
                <RadioGroup
                  value={answers[currentQuestion.id]?.toString() ?? ""}
                  onValueChange={(val) => handleSelectAnswer(currentQuestion.id, parseInt(val, 10))}
                >
                  {(isSpanish ? currentQuestion.optionsEs : currentQuestion.optionsEn).map((option, index) => (
                    <label
                      key={index}
                      className="flex items-center gap-3 p-3 rounded-md border cursor-pointer hover-elevate"
                      data-testid={`radio-diagnostic-option-${index}`}
                    >
                      <RadioGroupItem value={index.toString()} />
                      <span>{option}</span>
                    </label>
                  ))}
                </RadioGroup>
                <Button
                  onClick={handleNext}
                  disabled={answers[currentQuestion.id] === undefined || submitMutation.isPending}
                  className="w-full gap-2"
                  data-testid="button-diagnostic-next"
                >
                  {submitMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : currentIndex < questions.length - 1 ? (
                    <>
                      {isSpanish ? "Siguiente" : "Next"}
                      <ArrowRight className="h-4 w-4" />
                    </>
                  ) : (
                    isSpanish ? "Ver mi puntuación" : "See my score"
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {result && renderScoreCard(result.score, result.correctAnswers, result.totalQuestions)}
      </div>
    </PageShell>
  );
}