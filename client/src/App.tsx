import { Switch, Route, useLocation } from "wouter";
import { Suspense, lazy, useEffect } from "react";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { ThemeProvider } from "@/components/theme-provider";
import { useTranslation } from "react-i18next";
import { useAuth } from "@/hooks/use-auth";
import "./lib/i18n";

import NotFound from "@/pages/not-found";
import GlossaryPage from "@/pages/glossary";
import LandingPage from "@/pages/landing";
import DashboardPage from "@/pages/dashboard";
import MissedQuestionsPage from "@/pages/missed-questions";
import FlashcardsPage from "@/pages/flashcards";
import StudyAssistantPage from "@/pages/study-assistant";
import AlexiSessionPage from "@/pages/alexi-session";
import { PageErrorBoundary } from "@/components/error-boundary";
import ExamsPage from "@/pages/exams";
import PricingPage from "@/pages/pricing";
import ProfilePage from "@/pages/profile";
const AdminPage = lazy(() => import("@/pages/admin"));
import ScheduleExamPage from "@/pages/schedule-exam";
import StudyGuidePage from "@/pages/study-guide";
import CertificatePage from "@/pages/certificate";
import FAQPage from "@/pages/faq";
import TermsPage from "@/pages/terms";
import PrivacyPage from "@/pages/privacy";
import AuthPage from "@/pages/auth";
import ResetPasswordPage from "@/pages/reset-password";
import ForgotPasswordPage from "@/pages/forgot-password";
import TexasRealEstateExamPrepPage from "@/pages/landing-texas-real-estate";
import TexasPropertyCasualtyExamPrepPage from "@/pages/landing-texas-property-casualty";
import TexasLifeInsuranceExamPrepPage from "@/pages/landing-texas-life-insurance";
import TexasGeneralLinesExamPrepPage from "@/pages/landing-texas-general-lines";
import TexasRealEstateExamPrepEsPage from "@/pages/landing-texas-real-estate-es";
import TexasInsuranceExamPrepEsPage from "@/pages/landing-texas-insurance-es";
import FreePracticeTestPage from "@/pages/free-practice-test";
import FreePracticeTestEsPage from "@/pages/free-practice-test-es";
import InsuranceConceptPage from "@/pages/insurance-concept";
import InsuranceConceptsHubPage from "@/pages/insurance-concepts-hub";
import ExamConceptClusterPage from "@/pages/exam-concept-clusters";
import LongTailComparisonPage from "@/pages/long-tail-comparisons";
import EmployerInquiryPage from "@/pages/employer-inquiry";
import DiagnosticPage from "@/pages/diagnostic";
import CookiePolicyPage from "@/pages/cookie-policy";
import NoticeAtCollectionPage from "@/pages/notice-at-collection";
import PrivacyRequestPage from "@/pages/privacy-request";
import AccessibilityPage from "@/pages/accessibility";
import CopyrightDmcaPage from "@/pages/copyright-dmca";
import RefundPolicyPage from "@/pages/refund-policy";
import ExamDisclaimerPage from "@/pages/exam-disclaimer";
import ElectronicCommunicationsPage from "@/pages/electronic-communications";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading, isError, retry } = useAuth();
  const [, navigate] = useLocation();
  const { i18n } = useTranslation();
  const es = i18n.language === "es";

  const mustSignIn = !isLoading && !isError && !isAuthenticated;
  useEffect(() => {
    if (mustSignIn) navigate("/login", { replace: true });
  }, [mustSignIn, navigate]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" data-testid="loading-auth-gate">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold">
            {es ? "No podemos conectar con MyEasyPass ahora mismo" : "We can't reach MyEasyPass right now"}
          </h1>
          <p className="text-muted-foreground">
            {es ? "Tu cuenta está bien, solo no pudimos cargarla. Suele durar poco." : "Your account is fine - we just couldn't load it. This is usually brief."}
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <Button onClick={() => retry()} data-testid="button-auth-retry">{es ? "Reintentar" : "Try again"}</Button>
            <Button variant="outline" asChild><a href="/">{es ? "Ir al inicio" : "Go to home page"}</a></Button>
          </div>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4" data-testid="redirect-signin">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <h1 className="text-lg font-medium">{es ? "Te llevamos a iniciar sesión…" : "Taking you to sign in…"}</h1>
          <p className="text-sm text-muted-foreground">
            <a href="/login" className="text-primary underline-offset-2 hover:underline">{es ? "Continuar a iniciar sesión" : "Continue to sign in"}</a>
          </p>
        </div>
      </div>
    );
  }

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center bg-background" data-testid="loading-suspense"><div className="text-center space-y-4"><div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" /><p className="text-muted-foreground">Loading...</p></div></div>}>
      <Component />
    </Suspense>
  );
}

function HomePage() {
  const { isAuthenticated, isLoading, isError } = useAuth();

  if (isLoading && !isError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background" data-testid="loading-home">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) return <DashboardPage />;
  return <LandingPage />;
}

function Router() {
  return (
    <PageErrorBoundary label="route">
      <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/login" component={AuthPage} />
      <Route path="/signup" component={AuthPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={DashboardPage} />} />
      <Route path="/missed-questions" component={() => <ProtectedRoute component={MissedQuestionsPage} />} />
      <Route path="/flashcards" component={() => <ProtectedRoute component={FlashcardsPage} />} />
      <Route path="/study-assistant" component={() => <ProtectedRoute component={StudyAssistantPage} />} />
      <Route path="/session/:category" component={() => <ProtectedRoute component={AlexiSessionPage} />} />
      <Route path="/exams" component={ExamsPage} />
      <Route path="/exams/:category" component={ExamsPage} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/free/:slug" component={FreePracticeTestPage} />
      <Route path="/es/free/:slug" component={FreePracticeTestEsPage} />
      <Route path="/texas-insurance-exam/concepts" component={InsuranceConceptsHubPage} />
      <Route path="/texas-insurance-exam/ho-2-vs-ho-3" component={LongTailComparisonPage} />
      <Route path="/texas-insurance-exam/peril-vs-hazard" component={LongTailComparisonPage} />
      <Route path="/texas-insurance-exam/vacancy-vs-unoccupancy" component={LongTailComparisonPage} />
      <Route path="/texas-insurance-exam/:slug" component={InsuranceConceptPage} />
      <Route path="/texas-life-health-exam/:slug" component={() => <ExamConceptClusterPage clusterKey="life-health" />} />
      <Route path="/texas-real-estate-exam/:slug" component={() => <ExamConceptClusterPage clusterKey="real-estate" />} />
      <Route path="/texas-real-estate-exam-prep" component={TexasRealEstateExamPrepPage} />
      <Route path="/texas-property-casualty-exam-prep" component={TexasPropertyCasualtyExamPrepPage} />
      <Route path="/texas-life-insurance-exam-prep" component={TexasLifeInsuranceExamPrepPage} />
      <Route path="/texas-general-lines-exam-prep" component={TexasGeneralLinesExamPrepPage} />
      <Route path="/es/preparacion-examen-bienes-raices-texas" component={TexasRealEstateExamPrepEsPage} />
      <Route path="/es/comparacion-ho-2-vs-ho-3-texas" component={LongTailComparisonPage} />
      <Route path="/es/comparacion-peril-vs-hazard-texas" component={LongTailComparisonPage} />
      <Route path="/es/comparacion-vacancy-vs-unoccupancy-texas" component={LongTailComparisonPage} />
      <Route path="/es/comparacion-term-vs-whole-life-texas" component={LongTailComparisonPage} />
      <Route path="/es/:spanishExamSlug" component={TexasInsuranceExamPrepEsPage} />
      <Route path="/employer-inquiry" component={EmployerInquiryPage} />
      <Route path="/readiness-check" component={DiagnosticPage} />
      <Route path="/schedule-exam" component={ScheduleExamPage} />
      <Route path="/study-guide" component={() => <ProtectedRoute component={StudyGuidePage} />} />
      <Route path="/profile" component={() => <ProtectedRoute component={ProfilePage} />} />
      <Route path="/admin" component={() => <ProtectedRoute component={AdminPage} />} />
      <Route path="/certificates/:slug" component={CertificatePage} />
      <Route path="/faq" component={FAQPage} />
      <Route path="/glossary" component={GlossaryPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route path="/cookie-policy" component={CookiePolicyPage} />
      <Route path="/notice-at-collection" component={NoticeAtCollectionPage} />
      <Route path="/privacy-request" component={PrivacyRequestPage} />
      <Route path="/accessibility" component={AccessibilityPage} />
      <Route path="/copyright-dmca" component={CopyrightDmcaPage} />
      <Route path="/refund-policy" component={RefundPolicyPage} />
      <Route path="/exam-disclaimer" component={ExamDisclaimerPage} />
      <Route path="/electronic-communications" component={ElectronicCommunicationsPage} />
      <Route component={NotFound} />
      </Switch>
    </PageErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider defaultTheme="light" storageKey="easy-pass-theme">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
