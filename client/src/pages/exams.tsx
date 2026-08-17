import { useTranslation } from "react-i18next";
import { Link, useParams, useLocation, useSearch } from "wouter";
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
import { ExamHub } from "@/components/exams/exam-hub";
import { Footer } from "@/components/footer";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { trackEvent } from "@/lib/analytics";
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
  Flag,
  Bookmark,
  Award,
  Share2,
  Sparkles,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
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

function ExamSession() {
  const { t, i18n } = useTranslation();
  const params = useParams<{ category: string }>();
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  const category = params.category as ExamCategory;

  const search = useSearch();
  const mode = new URLSearchParams(search).get("mode") === "full" ? "full" : "practice";

  const [session, setSession] = useState<ExamSession | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [timeRemaining, setTimeRemaining] = useState(3600);
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [result, setResult] = useState<ExamResult | null>(null);
  const [topicBreakdown, setTopicBreakdown] = useState<Array<{topic: string; correct: number; total: number; percentage: number}>>([]);
  const [readiness, setReadiness] = useState<{
    score: number;
    band: string;
    delta: number;
    provisional: boolean;
    weakestTopic: string | null;
  } | null>(null);
  const [subscriptionRequired, setSubscriptionRequired] = useState(false);
  const [showReviewPanel, setShowReviewPanel] = useState(false);
  // Questions the student marked to come back to. Local to the sitting: a
  // flag is a working note for this attempt, not persisted study data.
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [showFeedbackDialog, setShowFeedbackDialog] = useState(false);
  const [feedbackType, setFeedbackType] = useState<string>("");
  const [feedbackDescription, setFeedbackDescription] = useState("");
  const [certificate, setCertificate] = useState<{ id: string; slug: string } | null>(null);

  const certificateMutation = useMutation({
    mutationFn: async (resultId: string) => {
      const res = await apiRequest("POST", `/api/results/${resultId}/certificate`);
      return res.json();
    },
    onSuccess: (data) => {
      setCertificate(data);
      toast({
        title: i18n.language === "es" ? "Certificado generado" : "Certificate generated",
        description: i18n.language === "es" 
          ? "Tu certificado está listo para compartir" 
          : "Your certificate is ready to share",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: async (data: { questionId: string; feedbackType: string; message: string }) => {
      const res = await apiRequest("POST", "/api/question-feedback", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: i18n.language === "es" ? "Comentario enviado" : "Feedback submitted",
        description: i18n.language === "es" 
          ? "Gracias por reportar este problema" 
          : "Thank you for reporting this issue",
      });
      setShowFeedbackDialog(false);
      setFeedbackType("");
      setFeedbackDescription("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubmitFeedback = () => {
    if (!currentQuestion || !feedbackType) return;
    feedbackMutation.mutate({
      questionId: currentQuestion.id,
      feedbackType,
      message: feedbackDescription,
    });
  };

  const startExamMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/exams/start", { category, mode });
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
      setTopicBreakdown([]);
      setReadiness(null);
      setAnswers({});
      setCurrentIndex(0);
      setCertificate(null);
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
      setTopicBreakdown(data.topicBreakdown || []);
      setReadiness(data.readiness ?? null);
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

  const cancelExamMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("DELETE", `/api/exams/${session?.id}/cancel`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: i18n.language === "es" ? "Examen cancelado" : "Exam cancelled",
        description: i18n.language === "es" ? "Tu intento ha sido cancelado" : "Your attempt has been cancelled",
      });
      setLocation("/exams");
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
  }, [category, mode]);

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

  const toggleFlag = (questionId: string) => {
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(questionId)) next.delete(questionId);
      else next.add(questionId);
      return next;
    });
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
    const topicColors = [
      "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", 
      "#ec4899", "#06b6d4", "#84cc16", "#f97316", "#6366f1"
    ];
    
    const topicChartData = topicBreakdown.map((item, index) => ({
      name: item.topic,
      percentage: item.percentage,
      correct: item.correct,
      total: item.total,
      fill: item.percentage >= 70 ? "#22c55e" : item.percentage >= 50 ? "#f59e0b" : "#ef4444",
    }));

    const categoryName = t(`categories.${category}`);

    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1">
          <div className="container mx-auto px-4 py-12">
            <div className="max-w-3xl mx-auto space-y-6">
              {readiness && (
                <Card data-testid="card-readiness-impact">
                  <CardContent className="flex flex-wrap items-center justify-between gap-4 py-5">
                    <div>
                      <p className="text-sm text-muted-foreground">
                        {i18n.language === "es" ? "Puntuación EasyPass" : "EasyPass Score"}
                      </p>
                      <div className="mt-1 flex items-baseline gap-2">
                        <span className="text-3xl font-bold tabular-nums" data-testid="text-readiness-score">
                          {readiness.score}
                        </span>
                        <span className="text-muted-foreground">/ 100</span>
                        {readiness.delta !== 0 && (
                          <span
                            className={`text-sm font-medium ${
                              readiness.delta > 0
                                ? "text-emerald-600 dark:text-emerald-400"
                                : "text-rose-600 dark:text-rose-400"
                            }`}
                            data-testid="text-readiness-delta"
                          >
                            {readiness.delta > 0 ? "+" : ""}{readiness.delta}{" "}
                            {i18n.language === "es" ? "por este examen" : "from this exam"}
                          </span>
                        )}
                      </div>
                    </div>
                    {readiness.weakestTopic && (
                      <div className="text-sm">
                        <p className="text-muted-foreground">
                          {i18n.language === "es" ? "Enfócate ahora en" : "Focus next on"}
                        </p>
                        <p className="font-medium" data-testid="text-readiness-followup">
                          {readiness.weakestTopic}
                        </p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

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

                  <div className="flex flex-col gap-3 sm:flex-row sm:justify-center sm:flex-wrap">
                    {result.passed && (
                      <>
                        {certificate ? (
                          <Button variant="default" className="gap-2" asChild data-testid="button-view-certificate">
                            <Link href={`/certificates/${certificate.slug}`}>
                              <Award className="h-4 w-4" />
                              {i18n.language === "es" ? "Ver Certificado" : "View Certificate"}
                            </Link>
                          </Button>
                        ) : (
                          <Button 
                            variant="default" 
                            className="gap-2"
                            onClick={() => certificateMutation.mutate(result.id)}
                            disabled={certificateMutation.isPending}
                            data-testid="button-get-certificate"
                          >
                            <Award className="h-4 w-4" />
                            {certificateMutation.isPending 
                              ? (i18n.language === "es" ? "Generando..." : "Generating...")
                              : (i18n.language === "es" ? "Obtener Certificado" : "Get Certificate")}
                          </Button>
                        )}
                      </>
                    )}
                    <Button variant="outline" onClick={() => startExamMutation.mutate()}>
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
                    {i18n.language === "es" ? "Resultados por Tema" : "Results by Topic"}
                  </CardTitle>
                  <CardDescription>
                    {i18n.language === "es" 
                      ? "Enfócate en los temas con puntuación más baja" 
                      : "Focus on topics with lower scores"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {topicChartData.length > 0 ? (
                    <>
                      <div className="h-64" data-testid="results-chart">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={topicChartData}
                            layout="vertical"
                            margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                          >
                            <XAxis type="number" domain={[0, 100]} unit="%" />
                            <YAxis type="category" dataKey="name" width={150} tick={{ fontSize: 12 }} />
                            <Tooltip
                              formatter={(value: number, name: string, props: any) => [
                                `${props.payload.correct}/${props.payload.total} (${value}%)`,
                                i18n.language === "es" ? "Puntuación" : "Score",
                              ]}
                            />
                            <Bar dataKey="percentage" radius={[0, 4, 4, 0]}>
                              {topicChartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.fill} />
                              ))}
                            </Bar>
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                      
                      <div className="mt-6 space-y-2">
                        <p className="text-sm font-medium mb-3">
                          {i18n.language === "es" ? "Leyenda:" : "Legend:"}
                        </p>
                        <div className="flex flex-wrap gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-green-500" />
                            <span>{i18n.language === "es" ? "70%+ Excelente" : "70%+ Excellent"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-amber-500" />
                            <span>{i18n.language === "es" ? "50-69% Necesita Práctica" : "50-69% Needs Practice"}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <div className="w-3 h-3 rounded bg-red-500" />
                            <span>{i18n.language === "es" ? "<50% Enfocarse Aquí" : "<50% Focus Here"}</span>
                          </div>
                        </div>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      {i18n.language === "es" ? "No hay datos de temas disponibles" : "No topic data available"}
                    </div>
                  )}

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

          <div className="flex items-center gap-2 sm:gap-4">
            <Badge variant="outline" className="gap-1">
              <Clock className="h-3 w-3" />
              {formatTime(timeRemaining)}
            </Badge>
            <Badge variant="secondary">
              {answeredCount}/{questions.length}
            </Badge>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setShowCancelDialog(true)}
              data-testid="button-cancel-exam"
            >
              {t("exam.cancel")}
            </Button>
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
                <div className="flex items-center justify-between gap-2">
                  <Badge variant="secondary">
                    {t("exam.question")} {currentIndex + 1} {t("exam.of")}{" "}
                    {questions.length}
                  </Badge>
                  <div className="flex items-center gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className={`h-8 gap-1 ${
                      flagged.has(questions[currentIndex]?.id)
                        ? "text-amber-600 dark:text-amber-400"
                        : "text-muted-foreground"
                    }`}
                    onClick={() => toggleFlag(questions[currentIndex].id)}
                    aria-pressed={flagged.has(questions[currentIndex]?.id)}
                    data-testid="button-flag-question"
                  >
                    <Bookmark className="h-3.5 w-3.5" />
                    <span className="text-xs hidden sm:inline">
                      {flagged.has(questions[currentIndex]?.id)
                        ? (i18n.language === "es" ? "Marcada" : "Flagged")
                        : (i18n.language === "es" ? "Marcar" : "Flag")}
                    </span>
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-8 gap-1 text-muted-foreground"
                    onClick={() => setShowFeedbackDialog(true)}
                    data-testid="button-report-question"
                  >
                    <Flag className="h-3.5 w-3.5" />
                    <span className="text-xs hidden sm:inline">
                      {i18n.language === "es" ? "Reportar" : "Report Issue"}
                    </span>
                  </Button>
                  </div>
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
                            {flagged.has(question.id) && (
                              <Bookmark
                                className="h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
                                aria-label={i18n.language === "es" ? "Marcada" : "Flagged"}
                                data-testid={`review-flagged-${index + 1}`}
                              />
                            )}
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
                <span className="block text-amber-600 dark:text-amber-400">
                  {i18n.language === "es"
                    ? `Tienes ${questions.length - answeredCount} preguntas sin responder.`
                    : `You have ${questions.length - answeredCount} unanswered question${
                        questions.length - answeredCount === 1 ? "" : "s"
                      }.`}
                </span>
              )}
              {flagged.size > 0 && (
                <span className="block text-amber-600 dark:text-amber-400">
                  {i18n.language === "es"
                    ? `Marcaste ${flagged.size} pregunta${flagged.size === 1 ? "" : "s"} para revisar.`
                    : `You flagged ${flagged.size} question${flagged.size === 1 ? "" : "s"} for review.`}
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

      <AlertDialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("exam.cancelAttempt")}</AlertDialogTitle>
            <AlertDialogDescription>
              {t("exam.confirmCancel")}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
            <AlertDialogAction 
              onClick={() => cancelExamMutation.mutate()}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              data-testid="button-confirm-cancel"
            >
              {t("exam.cancelExam")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={showFeedbackDialog} onOpenChange={setShowFeedbackDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {i18n.language === "es" ? "Reportar Problema" : "Report Issue"}
            </DialogTitle>
            <DialogDescription>
              {i18n.language === "es" 
                ? "Ayúdanos a mejorar reportando problemas con esta pregunta"
                : "Help us improve by reporting issues with this question"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {i18n.language === "es" ? "Tipo de Problema" : "Issue Type"}
              </label>
              <Select value={feedbackType} onValueChange={setFeedbackType}>
                <SelectTrigger data-testid="select-feedback-type">
                  <SelectValue placeholder={i18n.language === "es" ? "Selecciona un tipo" : "Select issue type"} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="error">
                    {i18n.language === "es" ? "Error en la pregunta" : "Error in question"}
                  </SelectItem>
                  <SelectItem value="unclear">
                    {i18n.language === "es" ? "Pregunta poco clara" : "Unclear question"}
                  </SelectItem>
                  <SelectItem value="wrong_answer">
                    {i18n.language === "es" ? "Respuesta incorrecta" : "Wrong answer marked"}
                  </SelectItem>
                  <SelectItem value="translation">
                    {i18n.language === "es" ? "Problema de traducción" : "Translation issue"}
                  </SelectItem>
                  <SelectItem value="suggestion">
                    {i18n.language === "es" ? "Sugerencia" : "Suggestion"}
                  </SelectItem>
                  <SelectItem value="other">
                    {i18n.language === "es" ? "Otro" : "Other"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {i18n.language === "es" ? "Descripción (opcional)" : "Description (optional)"}
              </label>
              <Textarea
                value={feedbackDescription}
                onChange={(e) => setFeedbackDescription(e.target.value)}
                placeholder={i18n.language === "es" 
                  ? "Describe el problema en detalle..."
                  : "Describe the issue in detail..."}
                className="min-h-[100px]"
                data-testid="textarea-feedback-description"
              />
            </div>
          </div>
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setShowFeedbackDialog(false)}
              data-testid="button-cancel-feedback"
            >
              {i18n.language === "es" ? "Cancelar" : "Cancel"}
            </Button>
            <Button
              onClick={handleSubmitFeedback}
              disabled={!feedbackType || feedbackMutation.isPending}
              data-testid="button-submit-feedback"
            >
              {feedbackMutation.isPending 
                ? (i18n.language === "es" ? "Enviando..." : "Submitting...")
                : (i18n.language === "es" ? "Enviar" : "Submit")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

interface GuestPreviewQuestion {
  id: string;
  questionTextEn: string;
  questionTextEs: string;
  optionsEn: string[];
  optionsEs: string[];
}

// Guests who aren't signed in still get to try the real quick-practice exam,
// just capped at GUEST_PREVIEW_LIMIT questions (server-enforced too - see
// POST /api/exams/guest-preview). After the last question, a sign-up dialog
// pops up instead of letting them continue into the full 50-question set.
function GuestPracticePreview({ category }: { category: ExamCategory }) {
  const { t, i18n } = useTranslation();
  const isSpanish = i18n.language === "es";
  const Icon = categoryIcons[category];

  const [questions, setQuestions] = useState<GuestPreviewQuestion[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [showWall, setShowWall] = useState(false);

  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/exams/guest-preview", { category });
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || "Failed to load practice questions");
      }
      return res.json();
    },
    onSuccess: (data) => {
      setQuestions(data.questions);
      setCurrentIndex(0);
      setAnswers({});
      setShowWall(false);
      trackEvent("guest_practice_start", { category });
    },
  });

  useEffect(() => {
    startMutation.mutate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [category]);

  const currentQuestion = questions[currentIndex];
  const questionText = isSpanish ? currentQuestion?.questionTextEs : currentQuestion?.questionTextEn;
  const options = isSpanish ? currentQuestion?.optionsEs : currentQuestion?.optionsEn;

  const handleAnswer = (value: string) => {
    if (currentQuestion) {
      setAnswers((prev) => ({ ...prev, [currentQuestion.id]: parseInt(value, 10) }));
    }
  };

  const handleNext = () => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setShowWall(true);
      trackEvent("guest_practice_wall_shown", { category });
    }
  };

  if (startMutation.isPending || (!startMutation.isError && questions.length === 0)) {
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

  if (startMutation.isError || !currentQuestion) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4">
            <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto" />
            <p className="text-muted-foreground">
              {startMutation.error instanceof Error ? startMutation.error.message : "No questions available"}
            </p>
            <Button asChild>
              <Link href="/exams">{isSpanish ? "Volver" : "Go Back"}</Link>
            </Button>
          </div>
        </main>
      </div>
    );
  }

  const progress = ((currentIndex + 1) / questions.length) * 100;

  return (
    <div className="min-h-screen flex flex-col bg-background">
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
          <div className="flex items-center gap-2 sm:gap-4">
            <Badge variant="outline">
              {isSpanish ? "Vista previa gratuita" : "Free preview"}
            </Badge>
            <Badge variant="secondary">
              {currentIndex + 1}/{questions.length}
            </Badge>
          </div>
        </div>
        <Progress value={progress} className="h-1" />
      </div>

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-3xl mx-auto">
            <Card className="mb-6">
              <CardHeader>
                <Badge variant="secondary">
                  {t("exam.question")} {currentIndex + 1} {t("exam.of")} {questions.length}
                </Badge>
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
                        answers[currentQuestion.id] === index ? "border-primary bg-primary/5" : ""
                      }`}
                    >
                      <RadioGroupItem
                        value={index.toString()}
                        id={`guest-option-${index}`}
                        data-testid={`radio-guest-option-${index}`}
                      />
                      <Label htmlFor={`guest-option-${index}`} className="flex-1 cursor-pointer text-sm">
                        {option}
                      </Label>
                    </div>
                  ))}
                </RadioGroup>
              </CardContent>
            </Card>

            <div className="flex items-center justify-end">
              <Button
                onClick={handleNext}
                disabled={answers[currentQuestion.id] === undefined}
                data-testid="button-guest-next"
              >
                {currentIndex === questions.length - 1
                  ? (isSpanish ? "Continuar" : "Continue")
                  : t("exam.next")}
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />

      <Dialog open={showWall} onOpenChange={setShowWall}>
        <DialogContent className="sm:max-w-md text-center" data-testid="dialog-guest-wall">
          <DialogHeader>
            <div className="mx-auto mb-2">
              <div className={`h-16 w-16 rounded-full flex items-center justify-center ${categoryColors[category]}`}>
                <Sparkles className="h-8 w-8" />
              </div>
            </div>
            <DialogTitle className="text-xl">
              {isSpanish ? "¡Sigue practicando!" : "Keep practicing!"}
            </DialogTitle>
            <DialogDescription>
              {isSpanish
                ? "Creaste una cuenta gratuita para continuar con el resto de las preguntas de práctica de esta categoría."
                : "Create a free account to continue with the rest of this category's practice questions."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex-col sm:flex-row gap-2 sm:justify-center">
            <Button
              asChild
              className="gap-2"
              onClick={() => trackEvent("guest_practice_signup_click", { category })}
              data-testid="button-guest-wall-signup"
            >
              <Link href="/signup">
                {isSpanish ? "Crear Cuenta Gratis" : "Create Free Account"}
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
            <Button variant="outline" asChild data-testid="button-guest-wall-login">
              <Link href="/login">
                {isSpanish ? "Ya tengo cuenta" : "I already have an account"}
              </Link>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Full mock exams stay behind a real account - no free preview, since it's a
// 150-200 question simulation meant to be taken in one sitting under
// subscription.
function GuestSignupRequired({ category }: { category: ExamCategory }) {
  const { t, i18n } = useTranslation();
  const isSpanish = i18n.language === "es";
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
                  {isSpanish ? "Crea una cuenta gratis" : "Create a free account"}
                </CardTitle>
                <CardDescription>
                  {isSpanish
                    ? "El examen completo de simulación requiere una cuenta con suscripción activa."
                    : "The full mock exam requires a signed-in account with an active subscription."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="p-4 rounded-lg bg-muted">
                  <p className="text-sm text-muted-foreground mb-2">
                    {isSpanish ? "Examen seleccionado:" : "Selected exam:"}
                  </p>
                  <p className="font-medium">{t(`categories.${category}`)}</p>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
                  <Button asChild data-testid="button-guest-signup">
                    <Link href="/signup">
                      {isSpanish ? "Crear Cuenta" : "Create Account"}
                    </Link>
                  </Button>
                  <Button variant="outline" asChild data-testid="button-guest-try-practice">
                    <Link href={`/exams/${category}`}>
                      {isSpanish ? "Probar Práctica Rápida Gratis" : "Try Free Quick Practice"}
                    </Link>
                  </Button>
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

export default function ExamsPage() {
  const params = useParams<{ category?: string }>();
  const search = useSearch();
  const mode = new URLSearchParams(search).get("mode") === "full" ? "full" : "practice";
  const { isAuthenticated, isLoading } = useAuth();

  if (!params.category) {
    return <ExamHub />;
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 flex items-center justify-center">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
        </main>
      </div>
    );
  }

  if (!isAuthenticated) {
    const category = params.category as ExamCategory;
    if (mode === "full") {
      return <GuestSignupRequired category={category} />;
    }
    return <GuestPracticePreview category={category} />;
  }

  return <ExamSession />;
}
