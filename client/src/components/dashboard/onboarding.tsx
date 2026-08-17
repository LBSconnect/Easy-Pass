/**
 * New-student onboarding.
 *
 * Replaces the old zero-state dashboard entirely. "Exams Taken: 0, Average
 * Score: 0%, Pass Rate: 0%" told a student nothing they did not already know
 * and made the product look empty; this asks the three questions that make
 * everything else work.
 *
 * Three steps, each unlocking the next, so the page has exactly one thing to
 * do at any moment.
 */

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Home, Shield, Heart, FileText, Check, ArrowRight } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { trackEvent } from "@/lib/analytics";
import { AlexiMark } from "@/components/alexi-mark";
import type { ExamCategory } from "@shared/schema";

const EXAMS: Array<{ id: ExamCategory; icon: typeof Home; en: string; es: string }> = [
  { id: "real_estate", icon: Home, en: "Texas Real Estate Salesperson", es: "Bienes Raíces de Texas" },
  { id: "property_casualty", icon: Shield, en: "Texas Property & Casualty", es: "Propiedad y Casualidad de Texas" },
  { id: "life_insurance", icon: Heart, en: "Texas Life Insurance", es: "Seguro de Vida de Texas" },
  { id: "general_lines", icon: FileText, en: "Texas General Lines Life & Health", es: "Líneas Generales de Texas" },
];

interface Props {
  /** Exam already on the profile, if any. */
  selectedExam: ExamCategory | null;
  hasExamDate: boolean;
}

export function DashboardOnboarding({ selectedExam, hasExamDate }: Props) {
  const { i18n } = useTranslation();
  const es = i18n.language === "es";
  const [chosen, setChosen] = useState<ExamCategory | null>(selectedExam);
  const [dateValue, setDateValue] = useState("");
  const [dateAnswered, setDateAnswered] = useState(hasExamDate);

  const saveProfile = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const res = await apiRequest("PATCH", "/api/profile", patch);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/profile"] }),
  });

  const stepDone = "border-primary/40 bg-primary/[0.04]";

  return (
    <div className="space-y-4">
      <Card className="border-primary/25 bg-primary/[0.04]">
        <CardContent className="p-5 md:p-6">
          <div className="flex items-center gap-2">
            <AlexiMark size={24} className="text-primary" />
            <h1 className="text-xl font-bold md:text-2xl">
              {es ? "Bienvenido a MyEasyPass" : "Welcome to MyEasyPass"}
            </h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            {es
              ? "Tres pasos rápidos y sabremos exactamente qué deberías estudiar primero."
              : "Three quick steps and we'll know exactly what you should study first."}
          </p>
        </CardContent>
      </Card>

      {/* Step 1 - which exam */}
      <Card className={chosen ? stepDone : undefined} data-testid="card-onboarding-exam">
        <CardContent className="p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            {chosen && <Check className="h-4 w-4 text-primary" aria-hidden="true" />}
            {es ? "1. ¿Para qué examen te preparas?" : "1. What exam are you preparing for?"}
          </h2>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {EXAMS.map((exam) => {
              const active = chosen === exam.id;
              return (
                <button
                  key={exam.id}
                  type="button"
                  onClick={() => {
                    setChosen(exam.id);
                    saveProfile.mutate({ preferredCategory: exam.id });
                  }}
                  aria-pressed={active}
                  className={`flex min-h-11 items-center gap-3 rounded-md border p-3 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                    active ? "border-primary bg-primary/10" : ""
                  }`}
                  data-testid={`onboarding-exam-${exam.id}`}
                >
                  <exam.icon className="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                  <span className="min-w-0 text-sm font-medium">{es ? exam.es : exam.en}</span>
                  {active && <Check className="ml-auto h-4 w-4 shrink-0 text-primary" aria-hidden="true" />}
                </button>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Step 2 - exam date. "Not scheduled" is a real answer, not a skip. */}
      {chosen && (
        <Card className={dateAnswered ? stepDone : undefined} data-testid="card-onboarding-date">
          <CardContent className="p-5">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              {dateAnswered && <Check className="h-4 w-4 text-primary" aria-hidden="true" />}
              {es ? "2. ¿Cuándo es tu examen?" : "2. When is your exam?"}
            </h2>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Input
                type="date"
                value={dateValue}
                onChange={(e) => setDateValue(e.target.value)}
                className="h-11 w-44"
                aria-label={es ? "Fecha del examen" : "Exam date"}
                data-testid="input-onboarding-date"
              />
              <Button
                className="h-11"
                disabled={!dateValue || saveProfile.isPending}
                onClick={() => {
                  saveProfile.mutate({ examDate: new Date(dateValue).toISOString() });
                  trackEvent("exam_date_set", { exam_type: chosen });
                  setDateAnswered(true);
                }}
                data-testid="button-onboarding-save-date"
              >
                {es ? "Guardar fecha" : "Select Date"}
              </Button>
              <Button
                variant="ghost"
                className="h-11"
                onClick={() => setDateAnswered(true)}
                data-testid="button-onboarding-no-date"
              >
                {es ? "Aún no la he programado" : "I haven't scheduled it yet"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3 - the diagnostic. The one dominant CTA on this page. */}
      {chosen && dateAnswered && (
        <Card className="border-primary/30 bg-primary/[0.06]" data-testid="card-onboarding-diagnostic">
          <CardContent className="p-5 md:p-6">
            <h2 className="text-base font-semibold">
              {es ? "3. Veamos dónde estás" : "3. Let's find out where you stand"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {es
                ? "Haz un diagnóstico corto para que MyEasyPass identifique tus temas más fuertes y más débiles."
                : "Take a short readiness diagnostic so MyEasyPass can identify your strongest and weakest topics."}
            </p>
            <Button asChild size="lg" className="mt-4 w-full sm:w-auto" data-testid="button-onboarding-diagnostic">
              <Link
                href="/readiness-check"
                onClick={() => trackEvent("diagnostic_cta_click", { exam_type: chosen })}
              >
                {es ? "Comenzar mi prueba de preparación" : "Start My Readiness Test"}
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
