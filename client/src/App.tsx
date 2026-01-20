import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/use-auth";
import "./lib/i18n";

import NotFound from "@/pages/not-found";
import LandingPage from "@/pages/landing";
import DashboardPage from "@/pages/dashboard";
import ExamsPage from "@/pages/exams";
import PricingPage from "@/pages/pricing";
import ProfilePage from "@/pages/profile";
import AdminPage from "@/pages/admin";
import ScheduleExamPage from "@/pages/schedule-exam";
import StudyGuidePage from "@/pages/study-guide";
import CertificatePage from "@/pages/certificate";
import FAQPage from "@/pages/faq";
import TermsPage from "@/pages/terms";
import PrivacyPage from "@/pages/privacy";
import AuthPage from "@/pages/auth";
import ResetPasswordPage from "@/pages/reset-password";
import ForgotPasswordPage from "@/pages/forgot-password";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    window.location.href = "/login";
    return null;
  }

  return <Component />;
}

function HomePage() {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent mx-auto" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
    return <DashboardPage />;
  }

  return <LandingPage />;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={HomePage} />
      <Route path="/login" component={AuthPage} />
      <Route path="/signup" component={AuthPage} />
      <Route path="/forgot-password" component={ForgotPasswordPage} />
      <Route path="/reset-password" component={ResetPasswordPage} />
      <Route path="/dashboard" component={() => <ProtectedRoute component={DashboardPage} />} />
      <Route path="/exams" component={() => <ProtectedRoute component={ExamsPage} />} />
      <Route path="/exams/:category" component={() => <ProtectedRoute component={ExamsPage} />} />
      <Route path="/pricing" component={PricingPage} />
      <Route path="/schedule-exam" component={ScheduleExamPage} />
      <Route path="/study-guide" component={() => <ProtectedRoute component={StudyGuidePage} />} />
      <Route path="/profile" component={() => <ProtectedRoute component={ProfilePage} />} />
      <Route path="/admin" component={() => <ProtectedRoute component={AdminPage} />} />
      <Route path="/certificates/:slug" component={CertificatePage} />
      <Route path="/faq" component={FAQPage} />
      <Route path="/terms" component={TermsPage} />
      <Route path="/privacy" component={PrivacyPage} />
      <Route component={NotFound} />
    </Switch>
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
