import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import {
  BookOpen,
  Trophy,
  Clock,
  TrendingUp,
  CheckCircle2,
  XCircle,
  ArrowRight,
  CreditCard,
  Home,
  Shield,
  Heart,
  FileText,
  Target,
  Flame,
  Award,
  Calendar,
  Play,
  Sparkles,
} from "lucide-react";
import type { ExamResult, UserProfile } from "@shared/schema";

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

function getGreeting(language: string): string {
  const hour = new Date().getHours();
  if (language === "es") {
    if (hour < 12) return "Buenos días";
    if (hour < 18) return "Buenas tardes";
    return "Buenas noches";
  }
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function getMotivationalMessage(passRate: number, examsTaken: number, language: string): string {
  if (language === "es") {
    if (examsTaken === 0) return "¡Comienza tu viaje hacia el éxito hoy!";
    if (passRate >= 80) return "¡Excelente trabajo! ¡Estás listo para el examen!";
    if (passRate >= 70) return "¡Buen progreso! Sigue practicando para mejorar.";
    if (passRate >= 50) return "¡Vas por buen camino! La práctica hace al maestro.";
    return "Cada intento te acerca más a tu meta.";
  }
  if (examsTaken === 0) return "Start your journey to success today!";
  if (passRate >= 80) return "Excellent work! You're ready for the real exam!";
  if (passRate >= 70) return "Great progress! Keep practicing to improve.";
  if (passRate >= 50) return "You're on the right track! Practice makes perfect.";
  return "Every attempt brings you closer to your goal.";
}

export default function DashboardPage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const searchString = useSearch();
  const [hasSynced, setHasSynced] = useState(false);

  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
  });

  const { data: results, isLoading: resultsLoading } = useQuery<ExamResult[]>({
    queryKey: ["/api/results"],
  });

  // Auto-sync subscription after returning from checkout
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/stripe/sync-subscription");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.synced) {
        queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
        toast({
          title: i18n.language === 'es' ? "¡Suscripción activada!" : "Subscription activated!",
          description: i18n.language === 'es' 
            ? "Tu suscripción ha sido sincronizada exitosamente." 
            : "Your subscription has been synced successfully.",
        });
      }
    },
  });

  // Auto-sync on page load if coming from checkout or if profile has customer but no subscription
  useEffect(() => {
    if (hasSynced) return;
    
    const params = new URLSearchParams(searchString);
    const isFromCheckout = params.get('success') === 'true';
    const needsSync = profile?.stripeCustomerId && !profile?.subscriptionStatus;
    
    if ((isFromCheckout || needsSync) && !syncMutation.isPending) {
      setHasSynced(true);
      syncMutation.mutate();
      
      // Clean up URL
      if (isFromCheckout) {
        window.history.replaceState({}, '', '/dashboard');
      }
    }
  }, [searchString, profile, hasSynced, syncMutation]);

  const stats = {
    examsTaken: results?.length || 0,
    averageScore: results?.length
      ? Math.round(results.reduce((acc, r) => acc + r.score, 0) / results.length)
      : 0,
    passRate: results?.length
      ? Math.round((results.filter((r) => r.passed).length / results.length) * 100)
      : 0,
    studyTime: results?.length
      ? Math.round(results.reduce((acc, r) => acc + r.timeTaken, 0) / 60)
      : 0,
    passedExams: results?.filter((r) => r.passed).length || 0,
  };

  const categories = [
    { id: "real_estate" as const, totalQuestions: 200 },
    { id: "property_casualty" as const, totalQuestions: 200 },
    { id: "life_insurance" as const, totalQuestions: 199 },
    { id: "general_lines" as const, totalQuestions: 196 },
  ];

  const hasActiveSubscription = profile?.subscriptionStatus === "active";
  const greeting = getGreeting(i18n.language);
  const motivationalMessage = getMotivationalMessage(stats.passRate, stats.examsTaken, i18n.language);
  
  const getBestCategory = () => {
    if (!results || results.length === 0) return null;
    const categoryScores: Record<string, { total: number; count: number }> = {};
    results.forEach((r) => {
      if (!categoryScores[r.category]) {
        categoryScores[r.category] = { total: 0, count: 0 };
      }
      categoryScores[r.category].total += r.score;
      categoryScores[r.category].count += 1;
    });
    let best = { category: "", avg: 0 };
    Object.entries(categoryScores).forEach(([cat, data]) => {
      const avg = data.total / data.count;
      if (avg > best.avg) {
        best = { category: cat, avg };
      }
    });
    return best.category ? { category: best.category, score: Math.round(best.avg) } : null;
  };

  const bestCategory = getBestCategory();

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8 p-6 rounded-xl bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-2xl md:text-3xl font-bold">
                  {greeting}, {user?.firstName || (i18n.language === "es" ? "Estudiante" : "Student")}!
                </h1>
                <p className="text-muted-foreground mt-1 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-primary" />
                  {motivationalMessage}
                </p>
              </div>
              <div className="flex gap-3">
                <Button asChild data-testid="button-start-practice">
                  <Link href="/exams">
                    <Play className="mr-2 h-4 w-4" />
                    {i18n.language === "es" ? "Practicar Ahora" : "Practice Now"}
                  </Link>
                </Button>
                <Button variant="outline" asChild data-testid="button-schedule-exam">
                  <Link href="/schedule-exam">
                    <Calendar className="mr-2 h-4 w-4" />
                    {i18n.language === "es" ? "Programar Examen" : "Schedule Exam"}
                  </Link>
                </Button>
              </div>
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("dashboard.examsTaken")}
                </CardTitle>
                <div className="p-2 rounded-full bg-blue-500/10">
                  <BookOpen className="h-4 w-4 text-blue-500" />
                </div>
              </CardHeader>
              <CardContent>
                {resultsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <>
                    <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{stats.examsTaken}</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.passedExams} {i18n.language === "es" ? "aprobados" : "passed"}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("dashboard.averageScore")}
                </CardTitle>
                <div className="p-2 rounded-full bg-amber-500/10">
                  <Trophy className="h-4 w-4 text-amber-500" />
                </div>
              </CardHeader>
              <CardContent>
                {resultsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <>
                    <div className="text-3xl font-bold text-amber-600 dark:text-amber-400">{stats.averageScore}%</div>
                    <p className="text-xs text-muted-foreground">
                      {stats.averageScore >= 70 
                        ? (i18n.language === "es" ? "Sobre el mínimo" : "Above passing")
                        : (i18n.language === "es" ? "Sigue practicando" : "Keep practicing")}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("dashboard.passRate")}
                </CardTitle>
                <div className="p-2 rounded-full bg-green-500/10">
                  <Target className="h-4 w-4 text-green-500" />
                </div>
              </CardHeader>
              <CardContent>
                {resultsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <>
                    <div className="text-3xl font-bold text-green-600 dark:text-green-400">{stats.passRate}%</div>
                    <p className="text-xs text-muted-foreground">
                      {i18n.language === "es" ? "Tasa de aprobación" : "Success rate"}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between gap-2 pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("dashboard.studyTime")}
                </CardTitle>
                <div className="p-2 rounded-full bg-purple-500/10">
                  <Clock className="h-4 w-4 text-purple-500" />
                </div>
              </CardHeader>
              <CardContent>
                {resultsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <>
                    <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{stats.studyTime}</div>
                    <p className="text-xs text-muted-foreground">
                      {i18n.language === "es" ? "minutos de estudio" : "minutes studied"}
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {bestCategory && (
            <Card className="mb-8 bg-gradient-to-r from-amber-500/5 to-transparent border-amber-500/20">
              <CardContent className="flex items-center gap-4 py-4">
                <div className="p-3 rounded-full bg-amber-500/10">
                  <Award className="h-6 w-6 text-amber-500" />
                </div>
                <div>
                  <p className="font-medium">
                    {i18n.language === "es" ? "Tu mejor categoría" : "Your strongest category"}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {t(`categories.${bestCategory.category}`)} - {bestCategory.score}% {i18n.language === "es" ? "promedio" : "average"}
                  </p>
                </div>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Flame className="h-5 w-5 text-primary" />
                    {t("dashboard.startPracticing")}
                  </CardTitle>
                  <CardDescription>
                    {i18n.language === "es" 
                      ? "Elige una categoría de examen para comenzar" 
                      : "Choose an exam category to begin your practice session"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  {categories.map((category) => {
                    const Icon = categoryIcons[category.id];
                    const categoryResults = results?.filter((r) => r.category === category.id) || [];
                    const bestScore = categoryResults.length > 0 
                      ? Math.max(...categoryResults.map(r => r.score)) 
                      : 0;
                    
                    return (
                      <Link key={category.id} href={`/exams/${category.id}`}>
                        <Card 
                          className={`hover-elevate transition-all cursor-pointer border-2 ${categoryColors[category.id]} ${
                            !hasActiveSubscription ? "opacity-60" : ""
                          }`}
                          data-testid={`card-exam-${category.id}`}
                        >
                          <CardHeader className="pb-2">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-lg ${categoryColors[category.id]}`}>
                                <Icon className="h-5 w-5" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <CardTitle className="text-sm truncate">
                                  {t(`categories.${category.id}`)}
                                </CardTitle>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                              <span>{category.totalQuestions} {i18n.language === "es" ? "preguntas" : "questions"}</span>
                              {bestScore > 0 && (
                                <Badge variant="secondary" className="text-xs">
                                  {i18n.language === "es" ? "Mejor" : "Best"}: {bestScore}%
                                </Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </Link>
                    );
                  })}
                </CardContent>
              </Card>

              <Card className="bg-gradient-to-r from-primary/5 to-transparent border-primary/20">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    {i18n.language === "es" ? "Guía de Estudio" : "Study Guide"}
                  </CardTitle>
                  <CardDescription>
                    {i18n.language === "es" 
                      ? "Aprende a tu propio ritmo con cuestionarios por tema" 
                      : "Learn at your own pace with topic-based quizzes"}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button className="w-full min-h-[44px]" asChild>
                    <Link href="/study-guide" data-testid="link-study-guide">
                      <BookOpen className="mr-2 h-4 w-4" />
                      {i18n.language === "es" ? "Abrir Guía de Estudio" : "Open Study Guide"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    {t("fullMock.title")}
                  </CardTitle>
                  <CardDescription>
                    {t("fullMock.subtitle")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  {categories.map((category) => {
                    const Icon = categoryIcons[category.id];
                    return (
                      <Link key={category.id} href={`/exams/${category.id}?mode=full`}>
                        <div 
                          className={`flex items-center gap-3 p-3 rounded-lg border hover-elevate cursor-pointer ${
                            !hasActiveSubscription ? "opacity-60" : ""
                          }`}
                          data-testid={`card-full-mock-${category.id}`}
                        >
                          <div className={`p-2 rounded-lg ${categoryColors[category.id]}`}>
                            <Icon className="h-4 w-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {t(`categories.${category.id}`)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {category.totalQuestions} {i18n.language === "es" ? "preguntas" : "questions"}
                            </p>
                          </div>
                          <Badge variant="secondary" className="text-xs shrink-0">
                            {t("fullMock.badge")}
                          </Badge>
                        </div>
                      </Link>
                    );
                  })}
                </CardContent>
              </Card>

            </div>

            <div className="space-y-6">
              <Card className={hasActiveSubscription ? "border-green-500/20" : "border-amber-500/20"}>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    {t("dashboard.subscription")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {profileLoading ? (
                    <Skeleton className="h-20 w-full" />
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Status</span>
                        <Badge 
                          variant={hasActiveSubscription ? "default" : "secondary"}
                          className={hasActiveSubscription ? "bg-green-500" : ""}
                        >
                          {hasActiveSubscription
                            ? t("dashboard.active")
                            : t("dashboard.inactive")}
                        </Badge>
                      </div>
                      {profile?.subscriptionPlan && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {i18n.language === "es" ? "Plan" : "Plan"}
                          </span>
                          <span className="font-medium capitalize">
                            {profile.subscriptionPlan === "weekly" 
                              ? (i18n.language === "es" ? "Semanal" : "Weekly")
                              : (i18n.language === "es" ? "Mensual" : "Monthly")}
                          </span>
                        </div>
                      )}
                      {profile?.subscriptionEndDate && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {t("dashboard.expiresOn")}
                          </span>
                          <span className="font-medium">
                            {new Date(profile.subscriptionEndDate).toLocaleDateString(
                              i18n.language === "es" ? "es-ES" : "en-US"
                            )}
                          </span>
                        </div>
                      )}
                      {!hasActiveSubscription && (
                        <div className="pt-2">
                          <p className="text-sm text-muted-foreground mb-3">
                            {i18n.language === "es" 
                              ? "Suscríbete para acceso ilimitado a todos los exámenes" 
                              : "Subscribe for unlimited access to all exams"}
                          </p>
                          <Button className="w-full" asChild>
                            <Link href="/pricing">
                              <CreditCard className="mr-2 h-4 w-4" />
                              {i18n.language === "es" ? "Suscribirse Ahora" : "Subscribe Now"}
                            </Link>
                          </Button>
                        </div>
                      )}
                      {hasActiveSubscription && (
                        <Button variant="outline" className="w-full" asChild>
                          <Link href="/profile">
                            {t("dashboard.manageSubscription")}
                          </Link>
                        </Button>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5 text-primary" />
                    {t("dashboard.yourProgress")}
                  </CardTitle>
                  <CardDescription>
                    {i18n.language === "es" 
                      ? "Tasa de aprobación por categoría" 
                      : "Pass rate by category"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {categories.map((category) => {
                    const Icon = categoryIcons[category.id];
                    const categoryResults = results?.filter(
                      (r) => r.category === category.id
                    );
                    const progress = categoryResults?.length
                      ? Math.round(
                          (categoryResults.filter((r) => r.passed).length /
                            categoryResults.length) *
                            100
                        )
                      : 0;
                    const attempts = categoryResults?.length || 0;

                    return (
                      <div key={category.id} className="space-y-2">
                        <div className="flex items-center gap-2">
                          <div className={`p-1 rounded ${categoryColors[category.id]}`}>
                            <Icon className="h-3 w-3" />
                          </div>
                          <span className="text-sm truncate flex-1">
                            {t(`categories.${category.id}`)}
                          </span>
                          <span className="text-sm font-medium">{progress}%</span>
                        </div>
                        <Progress 
                          value={progress} 
                          className="h-2"
                        />
                        <p className="text-xs text-muted-foreground">
                          {attempts} {i18n.language === "es" ? "intentos" : "attempts"}
                        </p>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
