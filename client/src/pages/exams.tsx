import { useTranslation } from "react-i18next";
import { Link, useParams, useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState, useEffect, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Home,
  Shield,
  Heart,
  FileText,
  ArrowRight,
  ArrowLeft,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  List,
  ChevronDown,
  ChevronUp,
  Edit2,
} from "lucide-react";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Cell, Legend, Tooltip } from "recharts";
import type { ExamCategory, Question, ExamSession, ExamResult } from "@shared/schema";

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

function ExamCategorySelection() {
  const { t, i18n } = useTranslation();

  const categories = [
    { id: "real_estate" as const, questions: 50 },
    { id: "property_casualty" as const, questions: 50 },
    { id: "life_insurance" as const, questions: 50 },
    { id: "general_lines" as const, questions: 50 },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <div className="container mx-auto px-4 py-12">
          <div className="max-w-3xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-3xl font-bold mb-4">{t("exam.selectCategory")}</h1>
              <p className="text-muted-foreground">
                Choose an exam category to start your practice session
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              {categories.map((category) => {
                const Icon = categoryIcons[category.id];
                return (
                  <Link key={category.id} href={`/exams/${category.id}`}>
                    <Card
                      className={`hover-elevate transition-all cursor-pointer border-2 ${categoryColors[category.id]}`}
                      data-testid={`card-select-${category.id}`}
                    >
                      <CardHeader className="flex flex-row items-center gap-4">
                        <div className={`p-4 rounded-lg ${categoryColors[category.id]}`}>
                          <Icon className="h-8 w-8" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg">
                            {t(`categories.${category.id}`)}
                          </CardTitle>
                          <CardDescription>
                            {category.questions} {t("categories.questions")}
                          </CardDescription>
                        </div>
                        <ArrowRight className="h-5 w-5 text-muted-foreground" />
                      </CardHeader>
                    </Card>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}

function ExamSession() {
  const { t, i18n } = useTranslation();
  const params = useParams<{ category: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const category = params.category as ExamCategory;

  const [session, setSession] = useState<ExamSession | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeRemaining, setTimeRemaining] = useState(3600);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [subscriptionRequired, setSubscriptionRequired] = useState(false);
  const [showReviewPanel, setShowReviewPanel] = useState(false);

  const startExamMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/exams/start", { category });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to start exam");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setSession(data.session);
      setQuestions(data.questions);
      setTimeRemaining(data.session.timeLimit);
      setSubscriptionRequired(false);
      setResult(null);
      setAnswers({});
      setCurrentIndex(0);
    },
    onError: (error: Error) => {
      if (error.message.includes("subscription") || error.message.includes("subscribe")) {
        setSubscriptionRequired(true);
      } else {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  const submitExamMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/exams/${session?.id}/submit`, {
        answers,
      });
      return res.json();
    },
    onSuccess: (data) => {
      setResult(data.result);
      queryClient.invalidateQueries({ queryKey: ["/api/results"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  useEffect(() => {
    startExamMutation.mutate();
  }, [category]);

  useEffect(() => {
    if (!session || result) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          submitExamMutation.mutate();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [session, result]);

  useEffect(() => {
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (session && !result) {
        e.preventDefault();
        e.returnValue = "";
      }
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [session, result]);

  const formatTime = useCallback((seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }, []);

  const currentQuestion = questions[currentIndex];
  const questionText =
    i18n.language === "es"
      ? currentQuestion?.questionTextEs
      : currentQuestion?.questionTextEn;
  const options =
    i18n.language === "es"
      ? currentQuestion?.optionsEs
      : currentQuestion?.optionsEn;

  const handleAnswer = (value: string) => {
    if (currentQuestion) {
      setAnswers((prev) => ({
        ...prev,
        [currentQuestion.id]: parseInt(value),
      }));
    }
  };

  const handleSubmit = () => {
    setShowSubmitDialog(false);
    submitExamMutation.mutate();
  };

  if (startExamMutation.isPending) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
            <p className="text-muted-foreground">{t("common.loading")}</p>
          </div>
        </main>
      </div>
    );
  }

  if (subscriptionRequired) {
    const Icon = categoryIcons[category];
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1">
          <div className="container mx-auto px-4 py-12">
            <div className="max-w-lg mx-auto">
              <Card className="text-center">
                <CardHeader className="pb-4">
                  <div className="mx-auto mb-4">
                    <div className={`h-20 w-20 rounded-full flex items-center justify-center ${categoryColors[category]}`}>
                      <Icon className="h-10 w-10" />
                    </div>
                  </div>
                  <CardTitle className="text-2xl">
                    {i18n.language === "es" ? "Suscripción Requerida" : "Subscription Required"}
                  </CardTitle>
                  <CardDescription>
                    {i18n.language === "es" 
                      ? "Para acceder a los exámenes de práctica, necesitas una suscripción activa."
                      : "To access practice exams, you need an active subscription."}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="p-4 rounded-lg bg-muted">
                    <p className="text-sm text-muted-foreground mb-2">
                      {i18n.language === "es" ? "Examen seleccionado:" : "Selected exam:"}
                    </p>
                    <p className="font-medium">{t(`categories.${category}`)}</p>
                  </div>

                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground">
                      {i18n.language === "es" 
                        ? "Suscríbete ahora para obtener acceso ilimitado a todos los exámenes de práctica."
                        : "Subscribe now to get unlimited access to all practice exams."}
                    </p>
                    <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                      <Button asChild data-testid="button-subscribe-now">
                        <Link href="/pricing">
                          {i18n.language === "es" ? "Ver Planes" : "View Plans"}
                        </Link>
                      </Button>
                      <Button variant="outline" asChild data-testid="button-back-to-exams">
                        <Link href="/exams">
                          {i18n.language === "es" ? "Volver a Exámenes" : "Back to Exams"}
                        </Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (result) {
    const chartData = [
      {
        name: i18n.language === "es" ? "Correctas" : "Correct",
        value: result.correctAnswers,
        fill: "#22c55e",
      },
      {
        name: i18n.language === "es" ? "Incorrectas" : "Incorrect",
        value: result.totalQuestions - result.correctAnswers,
        fill: "#ef4444",
      },
    ];

    const categoryName = t(`categories.${category}`);

    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1">
          <div className="container mx-auto px-4 py-12">
            <div className="max-w-3xl mx-auto space-y-6">
              <Card className="text-center">
                <CardHeader className="pb-4">
                  <div className="mx-auto mb-4">
                    {result.passed ? (
                      <div className="h-20 w-20 rounded-full bg-green-500/10 flex items-center justify-center">
                        <CheckCircle2 className="h-10 w-10 text-green-500" />
                      </div>
                    ) : (
                      <div className="h-20 w-20 rounded-full bg-red-500/10 flex items-center justify-center">
                        <XCircle className="h-10 w-10 text-red-500" />
                      </div>
                    )}
                  </div>
                  <CardTitle className="text-2xl">
                    {result.passed
                      ? t("exam.results.passed")
                      : t("exam.results.failed")}
                  </CardTitle>
                  <CardDescription>{t("exam.results.passingScore")}</CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="text-5xl font-bold text-primary">
                    {result.score}%
                  </div>

                  <div className="grid grid-cols-3 gap-4">
                    <div className="p-4 rounded-lg bg-muted">
                      <div className="text-2xl font-bold text-green-500">
                        {result.correctAnswers}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t("exam.results.correct")}
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-muted">
                      <div className="text-2xl font-bold text-red-500">
                        {result.totalQuestions - result.correctAnswers}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t("exam.results.incorrect")}
                      </div>
                    </div>
                    <div className="p-4 rounded-lg bg-muted">
                      <div className="text-2xl font-bold">
                        {Math.floor(result.timeTaken / 60)}:{String(result.timeTaken % 60).padStart(2, "0")}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {t("exam.results.timeTaken")}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                    <Button onClick={() => startExamMutation.mutate()}>
                      {t("exam.results.tryAgain")}
                    </Button>
                    <Button variant="outline" asChild>
                      <Link href="/dashboard">{t("exam.results.backToDashboard")}</Link>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">
                    {i18n.language === "es" ? "Resultados por Categoría" : "Results by Category"}
                  </CardTitle>
                  <CardDescription>
                    {categoryName}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64" data-testid="results-chart">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={chartData}
                        layout="vertical"
                        margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                      >
                        <XAxis type="number" domain={[0, result.totalQuestions]} />
                        <YAxis type="category" dataKey="name" width={100} />
                        <Tooltip
                          formatter={(value: number) => [
                            `${value} ${i18n.language === "es" ? "preguntas" : "questions"}`,
                            "",
                          ]}
                        />
                        <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  
                  <div className="mt-6 grid grid-cols-2 gap-4">
                    <div className="flex items-center gap-3 p-3 rounded-lg border">
                      <div className="w-4 h-4 rounded bg-green-500" />
                      <div>
                        <div className="font-medium text-green-600 dark:text-green-400">
                          {result.correctAnswers} / {result.totalQuestions}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {i18n.language === "es" ? "Respuestas Correctas" : "Correct Answers"}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 p-3 rounded-lg border">
                      <div className="w-4 h-4 rounded bg-red-500" />
                      <div>
                        <div className="font-medium text-red-600 dark:text-red-400">
                          {result.totalQuestions - result.correctAnswers} / {result.totalQuestions}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {i18n.language === "es" ? "Respuestas Incorrectas" : "Incorrect Answers"}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 p-4 rounded-lg bg-muted">
                    <div className="text-center">
                      <div className="text-sm text-muted-foreground mb-1">
                        {i18n.language === "es" ? "Porcentaje de Aprobación" : "Pass Rate"}
                      </div>
                      <div className="text-2xl font-bold">
                        {result.score >= 70 ? (
                          <span className="text-green-500">{result.score}%</span>
                        ) : (
                          <span className="text-red-500">{result.score}%</span>
                        )}
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {i18n.language === "es" ? "Se requiere 70% para aprobar" : "70% required to pass"}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (!currentQuestion) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">No questions available</p>
            <Button asChild>
              <Link href="/exams">Go Back</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const Icon = categoryIcons[category];
  const answeredCount = Object.keys(answers).length;
  const progress = (answeredCount / questions.length) * 100;

  return (
    <div className="min-h-screen flex flex-col bg-background print:hidden">
      <style>{`@media print { body { display: none !important; } }`}</style>

      <div className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur">
        <div className="container mx-auto flex h-14 items-center justify-between gap-4 px-4">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${categoryColors[category]}`}>
              <Icon className="h-4 w-4" />
            </div>
            <span className="font-medium text-sm hidden sm:inline">
              {t(`categories.${category}`)}
            </span>
          </div>

          <div className="flex items-center gap-4">
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(timeRemaining)}
            </Badge>
            <Badge variant="secondary">
              {answeredCount}/{questions.length}
            </Badge>
            <Button 
              variant="destructive" 
              size="sm"
              onClick={() => setShowSubmitDialog(true)}
              data-testid="button-end-quiz"
            >
              {t("exam.endQuiz")}
            </Button>
          </div>
        </div>
        <Progress value={progress} className="h-1" />
      </div>

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            <Card className="mb-6">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <Badge variant="secondary">
                    {t("exam.question")} {currentIndex + 1} {t("exam.of")}{" "}
                    {questions.length}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-6">
                <p className="text-lg font-medium leading-relaxed">{questionText}</p>

                <RadioGroup
                  value={answers[currentQuestion.id]?.toString() || ""}
                  onValueChange={handleAnswer}
                  className="space-y-3"
                >
                  {options?.map((option, index) => (
                    <div
                      key={index}
                      className={`flex items-center space-x-3 rounded-lg border p-4 transition-colors hover-elevate ${
                        answers[currentQuestion.id] === index
                          ? "border-primary bg-primary/5"
                          : ""
                      }`}
                    >
                      <RadioGroupItem
                        value={index.toString()}
                        id={`option-${index}`}
                        data-testid={`radio-option-${index}`}
                      />
                      <Label
                        htmlFor={`option-${index}`}
                        className="flex-1 cursor-pointer text-sm"
                      >
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>

            <div className="flex items-center justify-between gap-4">
              <Button
                variant="outline"
                onClick={() => setCurrentIndex((prev) => prev - 1)}
                disabled={currentIndex === 0}
                data-testid="button-previous"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                {t("exam.previous")}
              </Button>

              {currentIndex === questions.length - 1 ? (
                <Button
                  onClick={() => setShowSubmitDialog(true)}
                  disabled={submitExamMutation.isPending}
                  data-testid="button-submit"
                >
                  {t("exam.submit")}
                </Button>
              ) : (
                <Button
                  onClick={() => setCurrentIndex((prev) => prev + 1)}
                  data-testid="button-next"
                >
                  {t("exam.next")}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>

            <div className="mt-8 flex flex-wrap gap-2 justify-center">
              {questions.map((_, index) => (
                <Button
                  key={index}
                  variant={
                    index === currentIndex
                      ? "default"
                      : answers[questions[index].id] !== undefined
                      ? "secondary"
                      : "outline"
                  }
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setCurrentIndex(index)}
                  data-testid={`button-question-${index + 1}`}
                >
                  {index + 1}
                </Button>
              ))}
            </div>

            <div className="mt-6">
              <Button
                variant="outline"
                className="w-full gap-2"
                onClick={() => setShowReviewPanel(!showReviewPanel)}
                data-testid="button-review-answers"
              >
                <List className="h-4 w-4" />
                {t("exam.reviewAnswers")}
                {showReviewPanel ? (
                  <ChevronUp className="h-4 w-4 ml-auto" />
                ) : (
                  <ChevronDown className="h-4 w-4 ml-auto" />
                )}
              </Button>

              {showReviewPanel && (
                <Card className="mt-4">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-lg flex items-center gap-2">
                      <List className="h-5 w-5" />
                      {t("exam.reviewAnswers")}
                    </CardTitle>
                    <CardDescription>
                      {i18n.language === "es" 
                        ? "Haz clic en cualquier pregunta para cambiar tu respuesta"
                        : "Click on any question to change your answer"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                    {questions.map((question, index) => {
                      const qText = i18n.language === "es" ? question.questionTextEs : question.questionTextEn;
                      const opts = i18n.language === "es" ? question.optionsEs : question.optionsEn;
                      const hasAnswer = answers[question.id] !== undefined;
                      const selectedOption = hasAnswer ? opts?.[answers[question.id]] : null;

                      return (
                        <div
                          key={question.id}
                          className={`p-3 rounded-lg border cursor-pointer transition-colors hover-elevate ${
                            index === currentIndex ? "border-primary bg-primary/5" : ""
                          } ${!hasAnswer ? "border-amber-500/50 bg-amber-500/5" : ""}`}
                          onClick={() => {
                            setCurrentIndex(index);
                            setShowReviewPanel(false);
                          }}
                          data-testid={`review-question-${index + 1}`}
                        >
                          <div className="flex items-start gap-3">
                            <Badge 
                              variant={hasAnswer ? "secondary" : "outline"}
                              className={`shrink-0 ${!hasAnswer ? "border-amber-500 text-amber-600" : ""}`}
                            >
                              {index + 1}
                            </Badge>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium line-clamp-2 mb-1">
                                {qText}
                              </p>
                              {hasAnswer ? (
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <CheckCircle2 className="h-3 w-3 text-green-500" />
                                  <span className="line-clamp-1">{selectedOption}</span>
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 text-xs text-amber-600">
                                  <AlertCircle className="h-3 w-3" />
                                  {i18n.language === "es" ? "Sin responder" : "Not answered"}
                                </div>
                              )}
                            </div>
                            <Edit2 className="h-4 w-4 text-muted-foreground shrink-0" />
                          </div>
                        </div>
                      );
                    })}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>

      <AlertDialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("exam.submit")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("exam.confirmSubmit")}
              <br />
              <br />
              {answeredCount < questions.length && (
                <span className="text-amber-500">
                  You have {questions.length - answeredCount} unanswered questions.
                </span>
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction onClick={handleSubmit}>
              {t("common.confirm")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

export default function ExamsPage() {
  const params = useParams<{ category?: string }>();

  if (params.category) {
    return <ExamSession />;
  }

  return <ExamCategorySelection />;
}
