/**
 * New-student onboarding.
 *
 * Replaces the old zero-state dashboard entirely. "Exams Taken: 0, Average
 * Score: 0%, Pass Rate: 0%" told a student nothing they did not already know
 * and made the product look empty; this asks the questions that make
 * everything else work.
 *
 * Four steps, each unlocking the next, so the page has exactly one thing to do
 * at any moment: which exam, when, where do you stand, and then subscribe.
 *
 * THE STEP THAT USED TO REPEAT
 *
 * Step 3 reads the student's stored readiness check rather than assuming it
 * has never been done. Before, the dashboard's only evidence of activity was
 * questions answered inside a paid exam session - zero until you subscribe -
 * so a student who finished their readiness check, declined the subscribe
 * prompt and came back was asked to take it again. And again. This shows the
 * result they already earned and moves them on to the step that actually
 * remains.
 */

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, ArrowRight, Sparkles } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { trackEvent } from "@/lib/analytics";
import { AlexiMark } from "@/components/alexi-mark";
import { EXAM_VISUALS } from "@/lib/examVisuals";
import type { ExamCategory } from "@shared/schema";

const EXAMS: Array<{ id: ExamCategory; en: string; es: string }> = [
  { id: "real_estate", en: "Texas Real Estate Salesperson", es: "Bienes Raíces de Texas" },
  { id: "property_casualty", en: "Texas Property & Casualty", es: "Propiedad y Casualidad de Texas" },
  { id: "life_insurance", en: "Texas Life Insurance", es: "Seguro de Vida de Texas" },
  { id: "general_lines", en: "Texas General Lines Life & Health", es: "Líneas Generales de Texas" },
];

/** The stored readiness check, if the student has finished one. */
export interface DiagnosticSummary {
  category: string;
  score: number | null;
  correctAnswers: number | null;
  totalQuestions: number;
  completedAt: string | null;
}

interface Props {
  /** Exam already on the profile, if any. */
  selectedExam: ExamCategory | null;
  hasExamDate: boolean;
  /** They have said "not scheduled yet", and we remembered. */
  examDateSkipped: boolean;
  /** Retained readiness check. Null when they have not done one. */
  diagnostic: DiagnosticSummary | null;
  hasActiveSubscription: boolean;
}

export function DashboardOnboarding({
  selectedExam,
  hasExamDate,
  examDateSkipped,
  diagnostic,
  hasActiveSubscription,
}: Props) {
  const { i18n } = useTranslation();
  const es = i18n.language === "es";
  const [chosen, setChosen] = useState<ExamCategory | null>(selectedExam);
  const [dateValue, setDateValue] = useState("");
  // Both a booked date and a remembered "not yet" count as answered. Before
  // the skip was persisted, only the first did - so the question came back on
  // every visit.
  const [dateAnswered, setDateAnswered] = useState(hasExamDate || examDateSkipped);

  const saveProfile = useMutation({
    mutationFn: async (patch: Record<string, unknown>) => {
      const res = await apiRequest("PATCH", "/api/profile", patch);
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/profile"] }),
  });

  const stepDone = "border-primary/40 bg-primary/[0.04]";
  const diagnosticDone = Boolean(diagnostic?.completedAt);

  /**
   * Whether the steps below the date question are shown.
   *
   * The skip is persisted now, so a returning student who said "not yet" is
   * past this question and stays past it. The readiness check still unlocks
   * the rest independently: someone who has completed one is plainly beyond
   * the date question whatever they answered, and a student who reached the
   * subscribe step should not lose it to an unrelated field.
   */
  const pastDateStep = dateAnswered || diagnosticDone;

  // How many steps there are depends on whether they still need to subscribe.
  // Counting them here keeps the numbering honest instead of hard-coding a
  // "4." that a paid student would see with nothing under it.
  const totalSteps = hasActiveSubscription ? 3 : 4;

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
              ? `${totalSteps} pasos rápidos y sabremos exactamente qué deberías estudiar primero.`
              : `${totalSteps} quick steps and we'll know exactly what you should study first.`}
          </p>
        </CardContent>
      </Card>

      {/* Step 1 - which exam. Each exam carries the colour and icon it has
          everywhere else in the app, so the code a student learns on their
          first screen is the one the rest of the product uses. */}
      <Card className={chosen ? stepDone : undefined} data-testid="card-onboarding-exam">
        <CardContent className="p-5">
          <h2 className="flex items-center gap-2 text-base font-semibold">
            {chosen && <Check className="h-4 w-4 text-primary" aria-hidden="true" />}
            {es ? "1. ¿Para qué examen te preparas?" : "1. What exam are you preparing for?"}
          </h2>

          <div className="mt-3 grid gap-2 sm:grid-cols-2">
            {EXAMS.map((exam) => {
              const active = chosen === exam.id;
              const visual = EXAM_VISUALS[exam.id];
              const Icon = visual.icon;
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
                    active ? `${visual.border} ${visual.tint}` : ""
                  }`}
                  data-testid={`onboarding-exam-${exam.id}`}
                >
                  <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${visual.tint}`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 text-sm font-medium text-foreground">
                    {es ? exam.es : exam.en}
                  </span>
                  {active && (
                    <Check className={`ml-auto h-4 w-4 shrink-0 ${visual.accent}`} aria-hidden="true" />
                  )}
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
                onClick={() => {
                  // Remembered, so the question does not come back next visit.
                  saveProfile.mutate({ examDateSkipped: true });
                  setDateAnswered(true);
                }}
                data-testid="button-onboarding-no-date"
              >
                {es ? "Aún no la he programado" : "I haven't scheduled it yet"}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Step 3 - the readiness check, or the result of the one already done. */}
      {chosen && pastDateStep && (
        <Card
          className={diagnosticDone ? stepDone : "border-primary/30 bg-primary/[0.06]"}
          data-testid="card-onboarding-diagnostic"
        >
          <CardContent className="p-5 md:p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              {diagnosticDone && <Check className="h-4 w-4 text-primary" aria-hidden="true" />}
              {es ? "3. Veamos dónde estás" : "3. Let's find out where you stand"}
            </h2>

            {diagnosticDone ? (
              <>
                <p className="mt-2 text-sm text-muted-foreground" data-testid="text-diagnostic-retained">
                  {diagnostic?.score !== null && diagnostic?.score !== undefined
                    ? es
                      ? `Listo. Acertaste ${diagnostic.correctAnswers ?? 0} de ${diagnostic.totalQuestions} (${diagnostic.score}%).`
                      : `Done. You got ${diagnostic.correctAnswers ?? 0} of ${diagnostic.totalQuestions} right (${diagnostic.score}%).`
                    : es
                      ? "Listo. Guardamos tu prueba de preparación."
                      : "Done. Your readiness check is saved."}
                </p>
                <Button
                  asChild
                  variant="outline"
                  size="sm"
                  className="mt-3"
                  data-testid="button-onboarding-retake"
                >
                  <Link href="/readiness-check">
                    {es ? "Volver a hacerla" : "Take it again"}
                  </Link>
                </Button>
              </>
            ) : (
              <>
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
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Step 4 - subscribe. Only once they know where they stand, and only
          for those with nothing active; a paying student has no fourth step. */}
      {chosen && pastDateStep && diagnosticDone && !hasActiveSubscription && (
        <Card className="border-primary/30 bg-primary/[0.06]" data-testid="card-onboarding-subscribe">
          <CardContent className="p-5 md:p-6">
            <h2 className="flex items-center gap-2 text-base font-semibold">
              <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
              {es ? "4. Empieza a estudiar" : "4. Start studying"}
            </h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {es
                ? "Suscríbete para desbloquear el banco completo de preguntas, los exámenes de práctica cronometrados y tu plan de estudio."
                : "Subscribe to unlock the full question bank, timed practice exams, and your study plan."}
            </p>
            <Button asChild size="lg" className="mt-4 w-full sm:w-auto" data-testid="button-onboarding-subscribe">
              <Link
                href={`/pricing?category=${chosen}`}
                onClick={() => trackEvent("checkout_start", { exam_type: chosen, step: "onboarding_step_4" })}
              >
                {es ? "Ver planes" : "See plans"}
                <ArrowRight className="ml-1.5 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
