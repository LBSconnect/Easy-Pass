import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
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
import { ArrowRight, Loader2, RotateCcw, Check, Sparkles, Target, TrendingUp } from "lucide-react";
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

interface DiagnosticResult {
  score: number;
  correctAnswers: number;
  totalQuestions: number;
  category?: string;
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
  const [result, setResult] = useState<DiagnosticResult | null>(null);

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
      if (typeof data?.score !== "number" || typeof data?.correctAnswers !== "number" || typeof data?.totalQuestions !== "number") {
        throw new Error("no-result");
      }
      return data as DiagnosticResult;
    },
    onSuccess: (data) => {
      setResult(data);
      // The dashboard reads this to decide whether to ask for a readiness
      // check. Queries default to staleTime: Infinity, so without this the
      // student walks back to the dashboard and is asked all over again.
      queryClient.invalidateQueries({ queryKey: ["/api/diagnostic/latest"] });
      trackEvent("diagnostic_cta_click", {
        category: category ?? undefined,
        step: "score_revealed",
        score: data.score,
      });
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
  const activeScore = result?.score ?? saved?.score ?? null;
  const activeCategory = (result?.category ?? category ?? saved?.category ?? null) as ExamCategory | null;
  const band = activeScore !== null ? readinessCopy(activeScore, isSpanish) : null;
  const alexiHref = isAuthenticated
    ? "/study-assistant"
    : `/signup?source=readiness-check${activeCategory ? `&category=${activeCategory}` : ""}${activeScore !== null ? `&score=${activeScore}` : ""}`;

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

        <div className="rounded-xl border bg-muted/30 p-4 text-left">
          <div className="flex gap-3">
            <Sparkles className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <p className="font-semibold">{isSpanish ? "Tu próximo paso: Alexi" : "Your next step: Alexi"}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {isSpanish
                  ? "Crea una cuenta gratis para que Alexi use tu progreso real, tus áreas débiles y tu tiempo disponible para recomendar qué estudiar después."
                  : "Create a free account so Alexi can use your real progress, weak areas, and available study time to recommend what to study next."}
              </p>
            </div>
          </div>
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

        <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
          <Button
            size="lg"
            asChild
            className="gap-2"
            onClick={() => trackEvent("diagnostic_cta_click", {
              category: activeCategory ?? undefined,
              step: isAuthenticated ? "alexi_plan" : "save_score_signup",
              score,
            })}
            data-testid="button-diagnostic-alexi-plan"
          >
            <Link href={alexiHref}>
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {isAuthenticated
                ? (isSpanish ? "Crear mi plan con Alexi" : "Build my Alexi study plan")
                : (isSpanish ? "Guardar puntaje y crear mi plan" : "Save my score & build my plan")}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button
            size="lg"
            variant="outline"
            onClick={savedMode ? () => setRetaking(true) : handleRestart}
            className="gap-2"
            data-testid="button-diagnostic-restart"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            {isSpanish ? "Intentar otra categoría" : "Try another category"}
          </Button>
        </div>

        <div className="text-center">
          <Button variant="link" asChild>
            <Link href={activeCategory ? `/pricing?category=${activeCategory}` : "/pricing"}>
              {isSpanish ? "Ver preparación completa" : "Explore full exam prep"}
            </Link>
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