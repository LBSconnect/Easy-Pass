import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { useMutation, useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { PageShell } from "@/components/page-shell";
import { apiRequest, getQueryFn, queryClient } from "@/lib/queryClient";
import { EXAM_VISUALS } from "@/lib/examVisuals";
import { trackEvent } from "@/lib/analytics";
import { useSEO, buildUrl } from "@/hooks/use-seo";
import { ArrowRight, Loader2, RotateCcw, Lock, Check } from "lucide-react";
import type { ExamCategory } from "@shared/schema";

const categories: ExamCategory[] = ["real_estate", "property_casualty", "life_insurance", "general_lines"];

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

export default function DiagnosticPage() {
  const { t, i18n } = useTranslation();
  const isSpanish = i18n.language === "es";

  useSEO({
    title: isSpanish
      ? "Evaluación de Preparación | MyEasyPass"
      : "Readiness Assessment | MyEasyPass",
    description: isSpanish
      ? "10 preguntas rápidas para ver cómo te desempeñas. Sin necesidad de suscripción."
      : "10 quick questions to see how you'd do. No subscription required.",
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
  const { data: saved } = useQuery<SavedDiagnostic | null>({
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
  const [result, setResult] = useState<{ score: number; correctAnswers: number; totalQuestions: number } | null>(null);
  // The score itself is computed as soon as the quiz is submitted, but we
  // hold off rendering it until the user has seen (and can dismiss) a
  // subscribe prompt - this is a soft gate, not a hard paywall, since the
  // page's own copy promises "no subscription required" for the assessment.
  const [revealScore, setRevealScore] = useState(false);

  const startMutation = useMutation({
    mutationFn: async (cat: ExamCategory) => {
      const res = await apiRequest("POST", "/api/diagnostic/start", { category: cat });
      const data = await res.json();
      // Validate at the boundary. A 200 whose body has no `questions` used to
      // set the array to undefined, and the next render read index 0 of it and
      // took the page down. Failing here routes it to the error state instead.
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
      setRevealScore(false);
    },
    onError: () => {
      // The category is set before the request, so a failure otherwise strands
      // the student in a state with no questions and no picker - and the retry
      // message lives on the picker. Send them back to it.
      setCategory(null);
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/diagnostic/${attemptId}/submit`, { answers });
      const data = await res.json();
      if (typeof data?.correctAnswers !== "number" || typeof data?.totalQuestions !== "number") {
        throw new Error("no-result");
      }
      return data;
    },
    onSuccess: (data) => {
      setResult(data);
      setRevealScore(false);
      // The dashboard reads this to decide whether to ask for a readiness
      // check. Queries default to staleTime: Infinity, so without this the
      // student walks back to the dashboard and is asked all over again -
      // which is the whole bug this is here to prevent.
      queryClient.invalidateQueries({ queryKey: ["/api/diagnostic/latest"] });
      trackEvent("diagnostic_cta_click", { category: category ?? undefined, step: "subscribe_prompt_shown" });
    },
  });

  const handleSelectCategory = (cat: ExamCategory) => {
    setCategory(cat);
    trackEvent("diagnostic_cta_click", { category: cat, step: "start" });
    startMutation.mutate(cat);
  };

  const handleSelectAnswer = (questionId: string, index: number) => {
    setAnswers((prev) => ({ ...prev, [questionId]: index }));
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
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
    setRevealScore(false);
  };

  const handleSubscribeClick = () => {
    trackEvent("diagnostic_cta_click", { category: category ?? undefined, step: "subscribe_prompt_subscribe" });
  };

  const handleSkipSubscribePrompt = () => {
    trackEvent("diagnostic_cta_click", { category: category ?? undefined, step: "subscribe_prompt_skip" });
    setRevealScore(true);
  };

  const currentQuestion = questions[currentIndex];

  /**
   * Show the saved result rather than the picker.
   *
   * Only when they have not started a run this visit and have not asked to
   * redo it - otherwise finishing a retake would bounce straight back to the
   * old score.
   */
  const showSaved = Boolean(saved?.completedAt) && !category && !result && !retaking;

  return (
    <PageShell width="narrow">
      <div>
          {showSaved && saved && (
            <Card data-testid="card-diagnostic-saved">
              <CardHeader>
                <CardTitle as="h1" className="flex items-center gap-2">
                  <Check className="h-5 w-5 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                  {isSpanish ? "Ya hiciste tu evaluación" : "You've already done your readiness check"}
                </CardTitle>
                <CardDescription>
                  {isSpanish
                    ? "Guardamos tu resultado, así que no necesitas repetirla."
                    : "We saved your result, so there's no need to take it again."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                {saved.score !== null && (
                  <div className="text-center">
                    <div className="text-5xl font-bold text-primary" data-testid="text-saved-score">
                      {saved.score}%
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {isSpanish
                        ? `Acertaste ${saved.correctAnswers ?? 0} de ${saved.totalQuestions} preguntas.`
                        : `You answered ${saved.correctAnswers ?? 0} of ${saved.totalQuestions} questions correctly.`}
                    </p>
                  </div>
                )}

                <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
                  <Button asChild size="lg" data-testid="button-saved-subscribe">
                    <Link href={`/pricing?category=${saved.category}`}>
                      {isSpanish ? "Ver planes" : "See plans"}
                      <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setRetaking(true)}
                    data-testid="button-saved-retake"
                  >
                    <RotateCcw className="mr-1.5 h-4 w-4" aria-hidden="true" />
                    {isSpanish ? "Volver a hacerla" : "Take it again"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {!category && !showSaved && (
            <>
              <div className="text-center mb-8">
                <h1 className="text-2xl md:text-3xl font-bold mb-3">
                  {isSpanish ? "Evaluación de Preparación" : "Readiness Assessment"}
                </h1>
                <p className="text-muted-foreground text-lg">
                  {isSpanish
                    ? "10 preguntas rápidas para ver cómo te desempeñas. Sin necesidad de suscripción."
                    : "10 quick questions to see how you'd do. No subscription required."}
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
                    isSpanish ? "Ver Resultados" : "See Results"
                  )}
                </Button>
              </CardContent>
            </Card>
          )}

          {result && !revealScore && (
            <Card>
              <CardHeader className="text-center">
                <div className="mx-auto mb-2 p-3 rounded-full bg-primary/10 w-fit">
                  <Lock className="h-8 w-8 text-primary" />
                </div>
                <CardTitle as="h1" className="text-2xl">
                  {isSpanish ? "¡Evaluación completa!" : "Assessment complete!"}
                </CardTitle>
                <CardDescription>
                  {isSpanish
                    ? "Suscríbete para desbloquear tu puntuación y obtener acceso ilimitado a exámenes de práctica completos."
                    : "Subscribe to unlock your score and get unlimited access to full practice exams."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 text-center">
                <p className="text-muted-foreground">
                  {isSpanish
                    ? "Ya respondiste todas las preguntas. Suscríbete ahora para ver cómo te fue y seguir practicando con nuestro banco completo de preguntas."
                    : "You've answered every question. Subscribe now to see how you did and keep practicing with our full question bank."}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    size="lg"
                    asChild
                    className="gap-2"
                    onClick={handleSubscribeClick}
                    data-testid="button-diagnostic-subscribe-prompt"
                  >
                    <Link href="/pricing">
                      {isSpanish ? "Suscribirse Ahora" : "Subscribe Now"}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleSkipSubscribePrompt}
                    data-testid="button-diagnostic-skip-subscribe"
                  >
                    {isSpanish ? "Ver mi puntuación" : "See my score"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {result && revealScore && (
            <Card>
              <CardHeader className="text-center">
                <CardTitle as="h1" className="text-2xl">
                  {isSpanish ? "Tus Resultados" : "Your Results"}
                </CardTitle>
                <CardDescription>
                  {isSpanish
                    ? `Respondiste correctamente ${result.correctAnswers} de ${result.totalQuestions} preguntas.`
                    : `You answered ${result.correctAnswers} of ${result.totalQuestions} questions correctly.`}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 text-center">
                <div className="text-5xl font-bold text-primary" data-testid="text-diagnostic-score">
                  {result.score}%
                </div>
                <p className="text-muted-foreground">
                  {isSpanish
                    ? "Esto es solo un vistazo rápido, no un examen oficial. Practica con nuestro banco completo de preguntas para prepararte a fondo."
                    : "This is just a quick snapshot, not an official exam. Practice with our full question bank to prepare in depth."}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <Button
                    size="lg"
                    asChild
                    className="gap-2"
                    onClick={() => trackEvent("diagnostic_cta_click", { category: category ?? undefined, step: "results_signup" })}
                    data-testid="button-diagnostic-signup"
                  >
                    <Link href="/signup">
                      {isSpanish ? "Comenzar a Practicar" : "Start Practicing"}
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    onClick={handleRestart}
                    className="gap-2"
                    data-testid="button-diagnostic-restart"
                  >
                    <RotateCcw className="h-4 w-4" />
                    {isSpanish ? "Intentar Otra Categoría" : "Try Another Category"}
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}
      </div>
    </PageShell>
  );
}
