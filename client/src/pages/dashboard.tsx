import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { useAuth } from "@/hooks/use-auth";
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
} from "lucide-react";
import type { ExamResult, UserProfile } from "@shared/schema";

const categoryIcons = {
  real_estate: Home,
  property_casualty: Shield,
  life_insurance: Heart,
  general_lines: FileText,
};

const categoryColors = {
  real_estate: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  property_casualty: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  life_insurance: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  general_lines: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

export default function DashboardPage() {
  const { t } = useTranslation();
  const { user } = useAuth();

  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
  });

  const { data: results, isLoading: resultsLoading } = useQuery<ExamResult[]>({
    queryKey: ["/api/results"],
  });

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
  };

  const categories = [
    { id: "real_estate" as const, questions: 150 },
    { id: "property_casualty" as const, questions: 200 },
    { id: "life_insurance" as const, questions: 175 },
    { id: "general_lines" as const, questions: 180 },
  ];

  const hasActiveSubscription = profile?.subscriptionStatus === "active";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">
              {t("dashboard.welcome")}, {user?.firstName || "Student"}!
            </h1>
            <p className="text-muted-foreground mt-1">
              Track your progress and continue practicing
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("dashboard.examsTaken")}
                </CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {resultsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{stats.examsTaken}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("dashboard.averageScore")}
                </CardTitle>
                <Trophy className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {resultsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{stats.averageScore}%</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("dashboard.passRate")}
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {resultsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{stats.passRate}%</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("dashboard.studyTime")}
                </CardTitle>
                <Clock className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {resultsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">
                    {stats.studyTime} {t("common.minutes")}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t("dashboard.startPracticing")}</CardTitle>
                  <CardDescription>
                    Choose an exam category to begin your practice session
                  </CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 sm:grid-cols-2">
                  {categories.map((category) => {
                    const Icon = categoryIcons[category.id];
                    return (
                      <Link key={category.id} href={`/exams/${category.id}`}>
                        <Card 
                          className={`hover-elevate transition-all cursor-pointer ${
                            !hasActiveSubscription ? "opacity-60" : ""
                          }`}
                          data-testid={`card-exam-${category.id}`}
                        >
                          <CardHeader className="flex flex-row items-center gap-3 pb-2">
                            <div className={`p-2 rounded-lg ${categoryColors[category.id]}`}>
                              <Icon className="h-5 w-5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <CardTitle className="text-sm truncate">
                                {t(`categories.${category.id}`)}
                              </CardTitle>
                              <CardDescription className="text-xs">
                                {category.questions} {t("categories.questions")}
                              </CardDescription>
                            </div>
                          </CardHeader>
                        </Card>
                      </Link>
                    );
                  })}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>{t("dashboard.recentActivity")}</CardTitle>
                  <CardDescription>
                    Your recent exam attempts and scores
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {resultsLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : results && results.length > 0 ? (
                    <div className="space-y-4">
                      {results.slice(0, 5).map((result) => {
                        const Icon = categoryIcons[result.category as keyof typeof categoryIcons];
                        return (
                          <div
                            key={result.id}
                            className="flex items-center gap-4 p-3 rounded-lg bg-muted/50"
                          >
                            <div className={`p-2 rounded-lg ${categoryColors[result.category as keyof typeof categoryColors]}`}>
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {t(`categories.${result.category}`)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(result.completedAt).toLocaleDateString()}
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold">{result.score}%</span>
                              {result.passed ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <BookOpen className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>{t("dashboard.noActivity")}</p>
                      <Button className="mt-4" asChild>
                        <Link href="/exams">
                          {t("dashboard.startPracticing")}
                          <ArrowRight className="ml-2 h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>{t("dashboard.subscription")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {profileLoading ? (
                    <Skeleton className="h-20 w-full" />
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Status</span>
                        <Badge variant={hasActiveSubscription ? "default" : "secondary"}>
                          {hasActiveSubscription
                            ? t("dashboard.active")
                            : t("dashboard.inactive")}
                        </Badge>
                      </div>
                      {profile?.subscriptionPlan && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Plan</span>
                          <span className="font-medium capitalize">
                            {profile.subscriptionPlan}
                          </span>
                        </div>
                      )}
                      {profile?.subscriptionEndDate && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {t("dashboard.expiresOn")}
                          </span>
                          <span className="font-medium">
                            {new Date(profile.subscriptionEndDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                      {!hasActiveSubscription && (
                        <Button className="w-full mt-4" asChild>
                          <Link href="/pricing">
                            <CreditCard className="mr-2 h-4 w-4" />
                            Subscribe Now
                          </Link>
                        </Button>
                      )}
                      {hasActiveSubscription && (
                        <Button variant="outline" className="w-full mt-4" asChild>
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
                  <CardTitle>{t("dashboard.yourProgress")}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {categories.map((category) => {
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

                    return (
                      <div key={category.id} className="space-y-2">
                        <div className="flex items-center justify-between text-sm">
                          <span className="truncate">
                            {t(`categories.${category.id}`)}
                          </span>
                          <span className="text-muted-foreground">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
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
