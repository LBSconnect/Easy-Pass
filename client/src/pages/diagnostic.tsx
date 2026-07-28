import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { apiRequest } from "@/lib/queryClient";
import { trackEvent } from "@/lib/analytics";
import { Home, Shield, Heart, FileText, ArrowRight, Loader2, RotateCcw } from "lucide-react";
import type { ExamCategory } from "@shared/schema";

const categoryIcons = {
  real_estate: Home,
  property_casualty: Shield,
  life_insurance: Heart,
  general_lines: FileText,
};

const categoryColors = {
  real_estate: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  property_casualty: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  life_insurance: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  general_lines: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
};

const categories: ExamCategory[] = ["real_estate", "property_casualty", "life_insurance", "general_lines"];

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

  const [category, setCategory] = useState<ExamCategory | null>(null);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<DiagnosticQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [result, setResult] = useState<{ score: number; correctAnswers: number; totalQuestions: number } | null>(null);

  const startMutation = useMutation({
    mutationFn: async (cat: ExamCategory) => {
      const res = await apiRequest("POST", "/api/diagnostic/start", { category: cat });
      return res.json();
    },
    onSuccess: (data) => {
      setAttemptId(data.attemptId);
      setQuestions(data.questions);
      setCurrentIndex(0);
      setAnswers({});
      setResult(null);
    },
  });

  const submitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/diagnostic/${attemptId}/submit`, { answers });
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data);
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
    setCategory(null);
    setAttemptId(null);
    setQuestions([]);
    setCurrentIndex(0);
    setAnswers({});
    setResult(null);
  };

  const currentQuestion = questions[currentIndex];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 py-10 px-4">
        <div className="container mx-auto max-w-2xl">
          {!category && (
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
                  const Icon = categoryIcons[cat];
                  return (
                    <button
                      key={cat}
                      onClick={() => handleSelectCategory(cat)}
                      disabled={startMutation.isPending}
                      className={`text-left rounded-xl border-2 hover-elevate transition-all p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:opacity-60 ${categoryColors[cat]}`}
                      data-testid={`button-diagnostic-category-${cat}`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`shrink-0 p-3 rounded-xl ${categoryColors[cat]}`}>
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
                  <span className="text-sm font-medium text-muted-foreground">
                    {isSpanish
                      ? `Pregunta ${currentIndex + 1} de ${questions.length}`
                      : `Question ${currentIndex + 1} of ${questions.length}`}
                  </span>
                </div>
                <Progress value={((currentIndex + 1) / questions.length) * 100} className="h-1.5" />
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-lg font-medium" data-testid="text-diagnostic-question">
                  {isSpanish ? currentQuestion.questionTextEs : currentQuestion.questionTextEn}
                </p>
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

          {result && (
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">
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
      </main>
      <Footer />
    </div>
  );
}
