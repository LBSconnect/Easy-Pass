/**
 * Student dashboard.
 *
 * Rebuilt around one question: "what should I do next to get closer to
 * passing?" Sections are ordered by the state machine in shared/dashboardState
 * rather than by a fixed template, because a student three days from their
 * exam and one who signed up this morning need different things at the top.
 *
 * Two rules hold in every state: there is exactly one dominant CTA, and
 * upgrade messaging never sits above study tools.
 *
 * What was deliberately removed: the four zeroed statistic cards (they told a
 * new student nothing and made the product look empty), the subscription card
 * near the top, and the four full-width exam cards (once a student has picked
 * an exam, re-offering all four every visit is friction, not choice).
 */

import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useSearch } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { trackEvent } from "@/lib/analytics";
import { deriveDashboardState, sectionsFor, type DashboardSection } from "@shared/dashboardState";
import { useStudyAssistantConfig } from "@/lib/studyAssistant";
import { CardErrorBoundary } from "@/components/error-boundary";
import { WelcomeCard } from "@/components/dashboard/welcome-card";
import {
  DashboardOnboarding,
  type DiagnosticSummary,
} from "@/components/dashboard/onboarding";
import { AlexiCard } from "@/components/dashboard/alexi-card";
import { ScoreCard } from "@/components/dashboard/score-card";
import { TodaysPlanCard } from "@/components/dashboard/todays-plan";
import { MasteryCard } from "@/components/dashboard/mastery-card";
import {
  QuickActionsCard,
  CurrentExamCard,
  StudyResourcesCard,
  UpgradeCard,
  WeeklySummaryCard,
} from "@/components/dashboard/side-cards";
import type { ExamResult, UserProfile, ExamCategory } from "@shared/schema";

const EXAM_LABELS: Record<ExamCategory, { en: string; es: string }> = {
  real_estate: { en: "Texas Real Estate Salespersons", es: "Bienes Raíces de Texas" },
  property_casualty: {
    en: "Texas Property & Casualty Insurance",
    es: "Propiedad y Casualidad de Texas",
  },
  life_insurance: { en: "Texas Life Insurance", es: "Seguro de Vida de Texas" },
  general_lines: { en: "Texas General Lines Insurance", es: "Líneas Generales de Texas" },
};

interface Readiness {
  score: number;
  provisional: boolean;
  questionsAttempted: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export default function DashboardPage() {
  const { i18n } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();
  const searchString = useSearch();
  const [hasSynced, setHasSynced] = useState(false);
  const es = i18n.language === "es";

  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
  });
  const { data: results, isLoading: resultsLoading } = useQuery<ExamResult[]>({
    queryKey: ["/api/results"],
  });
  const { data: assistantConfig } = useStudyAssistantConfig();

  // The readiness check the student has already completed, if any. Without
  // this the dashboard's only evidence of activity is questions answered
  // inside a paid exam session, so an unsubscribed student who finished their
  // readiness check looked brand new and was asked to take it again on every
  // visit.
  const { data: diagnostic, isLoading: diagnosticLoading } = useQuery<DiagnosticSummary | null>({
    queryKey: ["/api/diagnostic/latest"],
  });

  // Preserved from the previous dashboard: students returning from Stripe
  // checkout need their subscription synced before the page means anything.
  const syncMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/stripe/sync-subscription");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.synced) {
        queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
        toast({
          title: es ? "¡Suscripción activada!" : "Subscription activated!",
          description: es
            ? "Tu suscripción ha sido sincronizada exitosamente."
            : "Your subscription has been synced successfully.",
        });
      }
    },
  });

  useEffect(() => {
    if (hasSynced) return;
    const params = new URLSearchParams(searchString);
    const isFromCheckout = params.get("success") === "true";
    const needsSync = profile?.stripeCustomerId && !profile?.subscriptionStatus;

    if ((isFromCheckout || needsSync) && !syncMutation.isPending) {
      setHasSynced(true);
      syncMutation.mutate();
      if (isFromCheckout) window.history.replaceState({}, "", "/dashboard");
    }
  }, [searchString, profile, hasSynced, syncMutation]);

  // Which exam is this student working on? Explicit choice wins, then the one
  // they most recently sat, then whatever they have access to.
  const allowed = (profile?.allowedCategories as ExamCategory[] | null) ?? [];
  const mostRecent = results
    ?.slice()
    .sort((a, b) => new Date(b.completedAt).getTime() - new Date(a.completedAt).getTime())[0]
    ?.category as ExamCategory | undefined;
  const category =
    (profile?.preferredCategory as ExamCategory | null) ?? mostRecent ?? allowed[0] ?? null;

  const { data: readiness } = useQuery<Readiness>({
    queryKey: [`/api/readiness/${category}`],
    enabled: Boolean(category),
  });

  useEffect(() => {
    trackEvent("dashboard_view", { exam_type: category ?? null });
  }, [category]);

  // Loading is not the same as empty: showing a zeroed dashboard while data is
  // still in flight is the exact thing this redesign removes.
  if (profileLoading || resultsLoading || diagnosticLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1">
          <div className="container mx-auto max-w-[1320px] px-4 py-8">
            <Skeleton className="h-24 w-full" />
            <div className="mt-6 grid gap-6 lg:grid-cols-2">
              <Skeleton className="h-64 w-full" />
              <Skeleton className="h-64 w-full" />
            </div>
            <Skeleton className="mt-6 h-72 w-full" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const examDate = profile?.examDate ? new Date(profile.examDate) : null;
  const today = new Date();
  const daysUntilExam = examDate
    ? Math.max(
        0,
        Math.round(
          (Date.UTC(examDate.getUTCFullYear(), examDate.getUTCMonth(), examDate.getUTCDate()) -
            Date.UTC(today.getFullYear(), today.getMonth(), today.getDate())) /
            DAY_MS,
        ),
      )
    : null;

  const totalAttempts = readiness?.questionsAttempted ?? 0;
  const hasActiveSubscription =
    profile?.subscriptionStatus === "active" || profile?.subscriptionStatus === "trialing";

  const input = {
    hasSelectedExam: Boolean(category),
    totalAttempts,
    easyPassScore: readiness && !readiness.provisional ? readiness.score : null,
    daysUntilExam,
    hasPreviousAttempt: profile?.hasPreviousAttempt ?? null,
    hasActiveSubscription,
    examsTaken: results?.length ?? 0,
    hasCompletedDiagnostic: Boolean(diagnostic?.completedAt),
  };

  const state = deriveDashboardState(input);
  const sections = sectionsFor(state, input);
  const examLabel = category ? EXAM_LABELS[category][es ? "es" : "en"] : null;
  const firstName = user?.firstName || (es ? "Estudiante" : "Student");

  // Weekly summary from real completed exams in the last seven days.
  const weekAgo = Date.now() - 7 * DAY_MS;
  const recentResults = (results ?? []).filter(
    (r) => new Date(r.completedAt).getTime() >= weekAgo,
  );
  const weeklyStats = {
    questionsAnswered: recentResults.reduce((sum, r) => sum + (r.totalQuestions ?? 0), 0),
    accuracy: recentResults.length
      ? Math.round(recentResults.reduce((sum, r) => sum + r.score, 0) / recentResults.length)
      : 0,
    topicsImproved: recentResults.filter((r) => r.passed).length,
  };

  // Gate on the state machine's section list. Rendering a section directly
  // without this check silently ignores the ordering rules - it is how a paid
  // student ends up seeing upgrade messaging.
  const render = (section: DashboardSection) => {
    if (!sections.includes(section)) return null;

    switch (section) {
      case "welcome":
        return (
          <WelcomeCard
            firstName={firstName}
            examLabel={examLabel}
            examDate={examDate}
            daysRemaining={daysUntilExam}
          />
        );
      case "summary":
        // Only when there is genuinely something to summarise.
        return weeklyStats.questionsAnswered > 0 ? <WeeklySummaryCard stats={weeklyStats} /> : null;
      case "resources":
        return <StudyResourcesCard />;
      case "upgrade":
        return <UpgradeCard />;
      default:
        return null;
    }
  };

  // Paired rows. Ordering within each pair follows the state machine, so an
  // approaching exam leads with readiness while a retaker leads with the
  // rescue recommendation.
  const alexiFirst = sections.indexOf("alexi") < sections.indexOf("score");
  const showLeadRow = sections.includes("alexi") && sections.includes("score");
  const quickActionsFirst =
    sections.indexOf("quick_actions") >= 0 &&
    sections.indexOf("quick_actions") < sections.indexOf("plan");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <div className="container mx-auto max-w-[1320px] px-4 py-6 md:py-8">
          {state === "new" ? (
            <div className="space-y-6">
              <DashboardOnboarding
                selectedExam={(profile?.preferredCategory as ExamCategory | null) ?? null}
                hasExamDate={Boolean(examDate)}
                examDateSkipped={profile?.examDateSkipped === true}
                diagnostic={diagnostic ?? null}
                hasActiveSubscription={hasActiveSubscription}
              />
              <StudyResourcesCard />
            </div>
          ) : (
            <div className="space-y-6">
              {render("welcome")}

              {showLeadRow && category && (
                <div className="grid gap-6 lg:grid-cols-2">
                  {alexiFirst ? (
                    <>
                      <CardErrorBoundary label="alexi"><AlexiCard
                          category={category}
                          hasHistory={totalAttempts > 0}
                          hasDiagnostic={Boolean(diagnostic?.completedAt)}
                        /></CardErrorBoundary>
                      <CardErrorBoundary label="score"><ScoreCard category={category} /></CardErrorBoundary>
                    </>
                  ) : (
                    <>
                      <CardErrorBoundary label="score"><ScoreCard category={category} /></CardErrorBoundary>
                      <CardErrorBoundary label="alexi"><AlexiCard
                          category={category}
                          hasHistory={totalAttempts > 0}
                          hasDiagnostic={Boolean(diagnostic?.completedAt)}
                        /></CardErrorBoundary>
                    </>
                  )}
                </div>
              )}

              {category && (
                <div className="grid gap-6 lg:grid-cols-12">
                  <div
                    className={`min-w-0 lg:col-span-6 ${quickActionsFirst ? "lg:order-2" : ""}`}
                  >
                    <CardErrorBoundary label="plan"><TodaysPlanCard category={category} /></CardErrorBoundary>
                  </div>
                  <div
                    className={`min-w-0 lg:col-span-3 ${quickActionsFirst ? "lg:order-3" : ""}`}
                  >
                    <CardErrorBoundary label="mastery"><MasteryCard category={category} /></CardErrorBoundary>
                  </div>
                  <div
                    className={`min-w-0 lg:col-span-3 ${quickActionsFirst ? "lg:order-1" : ""}`}
                  >
                    <QuickActionsCard
                      category={category}
                      showAskAlexi={assistantConfig?.flags.tutorEnabled ?? false}
                    />
                  </div>
                </div>
              )}

              {render("summary")}

              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {category && examLabel && (
                  <CurrentExamCard
                    category={category}
                    label={examLabel}
                    isActive={hasActiveSubscription}
                  />
                )}
                {render("resources")}
                {render("upgrade")}
              </div>
            </div>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
