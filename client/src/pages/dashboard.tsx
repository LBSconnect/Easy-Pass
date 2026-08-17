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
  RotateCcw,
  Layers,
} from "lucide-react";
import type { ExamResult, UserProfile, ExamCategory } from "@shared/schema";
import { EasyPassScoreCard } from "@/components/easypass-score-card";
import { StudyPlanCard } from "@/components/study-plan-card";
import { MasteryHeatmap } from "@/components/mastery-heatmap";
import { RetakerRescueCard } from "@/components/retaker-rescue-card";
import { AlexiRecommendationCard } from "@/components/alexi-recommendation-card";

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

// Surface tint only - no text color, so card copy keeps full foreground contrast.
const categorySurfaces = {
  real_estate: "bg-blue-500/10 border-blue-500/20",
  property_casualty: "bg-amber-500/10 border-amber-500/20",
  life_insurance: "bg-rose-500/10 border-rose-500/20",
  general_lines: "bg-emerald-500/10 border-emerald-500/20",
};

function getGreeting(language: string): string {
  const hour = parseInt(new Date().toLocaleString('en-US', { timeZone: 'America/Chicago', hour: 'numeric', hour12: false }), 10);
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

  // "trialing" is a fully valid, exam-taking subscription state (see server/subscriptionCheck.ts
  // checkSubscriptionActive, which also treats "active" and "trialing" as active). Keeping this
  // in sync avoids showing a user on a Stripe trial dimmed-out exam categories and a "subscribe"
  // prompt for access they already have.
  const hasActiveSubscription = profile?.subscriptionStatus === "active" || profile?.subscriptionStatus === "trialing";

  // The category the EasyPass Score is shown for. Most students only ever have
  // one, so prefer the one they last sat an exam in, then whatever they have
  // access to, and fall back to the first category so the card can still
  // render its "start practising" state for a brand new account.
  const allowed = (profile?.allowedCategories as ExamCategory[] | null) ?? [];
  const mostRecentCategory = results
    ?.slice()
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0]
    ?.category as ExamCategory | undefined;
  const scoreCategory: ExamCategory =
    mostRecentCategory ?? allowed[0] ?? categories[0].id;
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
              {/* wrap + shrink-0: both labels are nowrap buttons, so on a narrow
                  phone the pair overflowed the viewport rather than stacking. */}
              <div className="flex flex-wrap gap-3">
                <Button asChild className="shrink-0" data-testid="button-start-practice">
                  <Link href="/exams">
                    <Play className="mr-2 h-4 w-4" />
                    {i18n.language === "es" ? "Practicar Ahora" : "Practice Now"}
                  </Link>
                </Button>
                <Button variant="outline" asChild className="shrink-0" data-testid="button-schedule-exam">
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

          {/* Subscription Alert for inactive users */}
          {!hasActiveSubscription && !profileLoading && (
            <Card className="mb-8 border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-transparent">
              <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 rounded-full bg-amber-500/20">
                    <CreditCard className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                  </div>
                  <div>
                    <p className="font-semibold">
                      {i18n.language === "es" ? "Activa tu suscripción" : "Activate Your Subscription"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {i18n.language === "es" 
                        ? "Obtén acceso ilimitado a todos los exámenes de práctica" 
                        : "Get unlimited access to all practice exams"}
                    </p>
                  </div>
                </div>
                <Button asChild className="shrink-0">
                  <Link href="/pricing">
                    {i18n.language === "es" ? "Ver Planes" : "View Plans"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Main Content Grid */}
          {/* min-w-0 on the grid items: the exam-card titles use `truncate`,
              which sets white-space:nowrap and so makes their min-content the
              full title width. Without min-w-0 the column refuses to shrink
              below that and drags the whole page into horizontal scroll on
              phones (689px wide at a 375px viewport before this). */}
          <div className="grid gap-6 lg:grid-cols-12">
            {/* Left Column - Main Actions */}
            <div className="lg:col-span-8 min-w-0 space-y-6">

              <RetakerRescueCard
                hasPreviousAttempt={profile?.hasPreviousAttempt}
                category={scoreCategory}
              />

              {/* Sits above the score: the score tells a student where they
                  are, this tells them what to do about it, and the second is
                  the more useful thing to read first. */}
              <AlexiRecommendationCard category={scoreCategory} />

              <EasyPassScoreCard category={scoreCategory} />

              <StudyPlanCard category={scoreCategory} />

              <MasteryHeatmap category={scoreCategory} />

              {/* Entry point to the missed-question notebook. Kept as a plain
                  row rather than a card so it does not compete with the score
                  and plan above it. */}
              <Button
                variant="outline"
                asChild
                className="w-full justify-start"
                data-testid="link-missed-questions"
              >
                <Link href="/missed-questions">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  {i18n.language === "es"
                    ? "Repasar Mis Preguntas Falladas"
                    : "Review My Missed Questions"}
                </Link>
              </Button>

              <Button
                variant="outline"
                asChild
                className="w-full justify-start"
                data-testid="link-flashcards"
              >
                <Link href="/flashcards">
                  <Layers className="mr-2 h-4 w-4" />
                  {i18n.language === "es" ? "Tarjetas de Estudio" : "Flashcards"}
                </Link>
              </Button>

              {/* Exam Categories - Combined Practice & Full Mock */}
              <Card>
                <CardHeader className="pb-4">
                  <CardTitle className="flex items-center gap-2 text-xl">
                    <Flame className="h-5 w-5 text-primary" />
                    {i18n.language === "es" ? "Elige Tu Examen" : "Choose Your Exam"}
                  </CardTitle>
                  <CardDescription>
                    {i18n.language === "es" 
                      ? "Selecciona una categoría y modo de práctica" 
                      : "Select a category and practice mode"}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {categories.map((category) => {
                    const Icon = categoryIcons[category.id];
                    const categoryResults = results?.filter((r) => r.category === category.id) || [];
                    const bestScore = categoryResults.length > 0 
                      ? Math.max(...categoryResults.map(r => r.score)) 
                      : 0;
                    const passRate = categoryResults.length > 0
                      ? Math.round((categoryResults.filter(r => r.passed).length / categoryResults.length) * 100)
                      : 0;
                    const attempts = categoryResults.length;
                    
                    return (
                      <div 
                        key={category.id}
                        className={`p-4 rounded-xl border-2 ${categorySurfaces[category.id]}`}
                      >
                        <div className="flex items-start gap-4">
                          <div className={`p-3 rounded-xl ${categoryColors[category.id]}`}>
                            <Icon className="h-6 w-6" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <h2 className="font-semibold truncate">
                                {t(`categories.${category.id}`)}
                              </h2>
                              {bestScore > 0 && (
                                <Badge variant="secondary" className="shrink-0">
                                  {i18n.language === "es" ? "Mejor" : "Best"}: {bestScore}%
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">
                              {category.totalQuestions} {i18n.language === "es" ? "preguntas disponibles" : "questions available"}
                              {attempts > 0 && ` • ${attempts} ${i18n.language === "es" ? "intentos" : "attempts"}`}
                            </p>
                            
                            {/* Progress bar */}
                            {attempts > 0 && (
                              <div className="mb-3">
                                <div className="flex justify-between text-xs text-muted-foreground mb-1">
                                  <span>{i18n.language === "es" ? "Tasa de aprobación" : "Pass rate"}</span>
                                  <span>{passRate}%</span>
                                </div>
                                <Progress value={passRate} className="h-1.5" />
                              </div>
                            )}
                            
                            {/* Action buttons */}
                            <div className="flex flex-wrap gap-2">
                              <Button
                                size="sm"
                                asChild
                                data-testid={`button-practice-${category.id}`}
                              >
                                <Link href={`/exams/${category.id}`}>
                                  <Play className="mr-1.5 h-3.5 w-3.5" />
                                  {i18n.language === "es" ? "Práctica Rápida" : "Quick Practice"}
                                </Link>
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                asChild
                                data-testid={`button-full-mock-${category.id}`}
                              >
                                <Link href={`/exams/${category.id}?mode=full`}>
                                  <Target className="mr-1.5 h-3.5 w-3.5" />
                                  {i18n.language === "es" ? "Examen Completo" : "Full Mock Exam"}
                                </Link>
                              </Button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </CardContent>
              </Card>

              {/* Study Guide Card */}
              <Card className="bg-gradient-to-r from-primary/5 to-transparent border-primary/20">
                <CardContent className="flex flex-col sm:flex-row items-center justify-between gap-4 py-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 rounded-xl bg-primary/10">
                      <BookOpen className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h2 className="font-semibold">
                        {i18n.language === "es" ? "Guía de Estudio" : "Study Guide"}
                      </h2>
                      <p className="text-sm text-muted-foreground">
                        {i18n.language === "es" 
                          ? "Aprende a tu ritmo con cuestionarios por tema" 
                          : "Learn at your own pace with topic-based quizzes"}
                      </p>
                    </div>
                  </div>
                  <Button asChild className="shrink-0">
                    <Link href="/study-guide" data-testid="link-study-guide">
                      {i18n.language === "es" ? "Abrir Guía" : "Open Guide"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Right Column - Subscription & Quick Stats */}
            <div className="lg:col-span-4 min-w-0 space-y-6">
              
              {/* Subscription Card */}
              {hasActiveSubscription && (
                <Card className="border-green-500/20 bg-gradient-to-br from-green-500/5 to-transparent">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        {t("dashboard.subscription")}
                      </CardTitle>
                      <Badge className="bg-green-500">
                        {t("dashboard.active")}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {profileLoading ? (
                      <Skeleton className="h-16 w-full" />
                    ) : (
                      <>
                        {profile?.subscriptionPlan && (
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
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
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">
                              {t("dashboard.expiresOn")}
                            </span>
                            <span className="font-medium">
                              {new Date(profile.subscriptionEndDate).toLocaleDateString(
                                i18n.language === "es" ? "es-ES" : "en-US"
                              )}
                            </span>
                          </div>
                        )}
                        <Button variant="outline" size="sm" className="w-full mt-2" asChild>
                          <Link href="/profile">
                            {t("dashboard.manageSubscription")}
                          </Link>
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Quick Stats Summary */}
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2 text-base">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    {i18n.language === "es" ? "Resumen Rápido" : "Quick Summary"}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {resultsLoading ? (
                    <Skeleton className="h-24 w-full" />
                  ) : stats.examsTaken > 0 ? (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <div className="text-2xl font-bold text-primary">{stats.examsTaken}</div>
                        <div className="text-xs text-muted-foreground">
                          {i18n.language === "es" ? "Exámenes" : "Exams"}
                        </div>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <div className="text-2xl font-bold text-green-600 dark:text-green-400">{stats.passRate}%</div>
                        <div className="text-xs text-muted-foreground">
                          {i18n.language === "es" ? "Aprobación" : "Pass Rate"}
                        </div>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">{stats.averageScore}%</div>
                        <div className="text-xs text-muted-foreground">
                          {i18n.language === "es" ? "Promedio" : "Average"}
                        </div>
                      </div>
                      <div className="text-center p-3 rounded-lg bg-muted/50">
                        <div className="text-2xl font-bold text-purple-600 dark:text-purple-400">{stats.studyTime}</div>
                        <div className="text-xs text-muted-foreground">
                          {i18n.language === "es" ? "Minutos" : "Minutes"}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-6 text-muted-foreground">
                      <BookOpen className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">
                        {i18n.language === "es" 
                          ? "Toma tu primer examen para ver estadísticas" 
                          : "Take your first exam to see stats"}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Recent Activity */}
              {results && results.length > 0 && (
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Clock className="h-5 w-5 text-primary" />
                      {i18n.language === "es" ? "Actividad Reciente" : "Recent Activity"}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {results.slice(0, 3).map((result) => {
                      const Icon = categoryIcons[result.category as keyof typeof categoryIcons];
                      return (
                        <div key={result.id} className="flex items-center gap-3 text-sm">
                          <div className={`p-1.5 rounded ${categoryColors[result.category as keyof typeof categoryColors]}`}>
                            <Icon className="h-3 w-3" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="truncate font-medium">{t(`categories.${result.category}`)}</p>
                            <p className="text-xs text-muted-foreground">
                              {new Date(result.completedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold">{result.score}%</span>
                            {result.passed ? (
                              <CheckCircle2 className="h-4 w-4 text-green-500" />
                            ) : (
                              <XCircle className="h-4 w-4 text-red-500" />
                            )}
                          </div>
                        </div>
                      );
                    })}
                    {results.length > 3 && (
                      <Button variant="ghost" size="sm" className="w-full" asChild>
                        <Link href="/profile">
                          {i18n.language === "es" ? "Ver Todo" : "View All"}
                          <ArrowRight className="ml-2 h-3 w-3" />
                        </Link>
                      </Button>
                    )}
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
