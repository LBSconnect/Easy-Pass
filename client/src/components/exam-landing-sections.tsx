import { Link } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/hooks/use-auth";
import { trackEvent } from "@/lib/analytics";
import { getExamFacts, hasPublishableFacts } from "@shared/examFacts";
import {
  Gauge, Target, Search, TrendingUp, LifeBuoy, Clock, FileText, ArrowRight,
} from "lucide-react";
import type { ExamCategory, UserProfile } from "@shared/schema";

/**
 * Shared conversion sections for the four exam landing pages.
 *
 * These are configuration-driven and identical in structure across exams, so
 * the pages stay one product family. Exam-specific wording and data arrive as
 * props rather than being duplicated per page.
 */

interface SectionProps {
  category: ExamCategory;
  slug: string;
  isSpanish: boolean;
}

/** Sample figures for the anonymous hero preview. */
const SAMPLE = {
  score: 74,
  band: { en: "ALMOST READY", es: "CASI LISTO" },
  strongest: 84,
  weakest: 57,
  drillMinutes: 12,
  drillQuestions: 15,
};

/**
 * Readiness dashboard preview.
 *
 * For anonymous visitors this is explicitly labelled a SAMPLE - the brief is
 * clear that we must not imply the score belongs to them, and an unlabelled
 * dashboard reads as personal data. Signed-in students see their real score
 * instead, so the page stops selling and starts being useful.
 */
export function ReadinessPreview({ category, slug, isSpanish }: SectionProps) {
  const { isAuthenticated } = useAuth();

  const { data: readiness } = useQuery<{
    score: number;
    band: string;
    questionsAttempted: number;
    strongestTopic: string | null;
    weakestTopic: string | null;
  }>({
    queryKey: [`/api/readiness/${category}`],
    enabled: isAuthenticated,
  });

  const live = isAuthenticated && readiness && readiness.questionsAttempted > 0;
  const score = live ? readiness.score : SAMPLE.score;

  return (
    <Card className="border-primary/20 shadow-lg" data-testid="card-readiness-preview">
      <CardContent className="py-6">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Gauge className="h-5 w-5 text-primary" />
            <span className="font-semibold">
              {isSpanish ? "Puntuación EasyPass" : "EasyPass Score"}
            </span>
          </div>
          <Badge variant={live ? "default" : "secondary"} data-testid="badge-readiness-mode">
            {live
              ? isSpanish ? "TU PUNTUACIÓN" : "YOUR SCORE"
              : isSpanish ? "PANEL DE MUESTRA" : "SAMPLE DASHBOARD"}
          </Badge>
        </div>

        <div className="mt-4 flex items-baseline gap-2">
          <span className="text-5xl font-bold tabular-nums" data-testid="text-preview-score">
            {score}
          </span>
          <span className="text-lg text-muted-foreground">/ 100</span>
        </div>
        <Progress value={score} className="mt-3 h-2" aria-label={isSpanish ? "Puntuación EasyPass" : "EasyPass Score"} />

        <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-muted-foreground">{isSpanish ? "Más fuerte" : "Strongest"}</p>
            <p className="mt-0.5 font-semibold">
              {live && readiness.strongestTopic ? readiness.strongestTopic : `${SAMPLE.strongest}%`}
            </p>
          </div>
          <div className="rounded-lg bg-muted/50 p-3">
            <p className="text-muted-foreground">{isSpanish ? "Más débil" : "Weakest"}</p>
            <p className="mt-0.5 font-semibold">
              {live && readiness.weakestTopic ? readiness.weakestTopic : `${SAMPLE.weakest}%`}
            </p>
          </div>
        </div>

        <div className="mt-4 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
          <p className="text-muted-foreground">{isSpanish ? "Recomendado ahora" : "Recommended next"}</p>
          <p className="mt-0.5 font-medium">
            {isSpanish
              ? `Práctica dirigida de ${SAMPLE.drillQuestions} preguntas`
              : `${SAMPLE.drillQuestions}-question weak area drill`}
          </p>
          <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {isSpanish ? `Aprox. ${SAMPLE.drillMinutes} minutos` : `About ${SAMPLE.drillMinutes} minutes`}
          </p>
        </div>

        <Button asChild className="mt-4 w-full" data-testid="button-preview-cta">
          <Link
            href={live ? "/dashboard" : "/readiness-check"}
            onClick={() =>
              trackEvent(live ? "continue_studying_click" : "readiness_cta_click", {
                slug, exam_type: category, source: "hero_preview",
              })
            }
          >
            {live
              ? isSpanish ? "Continuar Estudiando" : "Continue Studying"
              : isSpanish ? "Comenzar Mi Plan de Estudio" : "Start My Study Plan"}
          </Link>
        </Button>

        {/* Required framing: this is a study-readiness indicator, never a
            prediction of an official licensing outcome. */}
        <p className="mt-3 text-xs text-muted-foreground">
          {isSpanish
            ? "Tu Puntuación EasyPass es un indicador de preparación de estudio de MyEasyPass basado en tu actividad y desempeño. No garantiza ni predice un resultado oficial del examen de licencia."
            : "Your EasyPass Score is a MyEasyPass study-readiness indicator based on your activity and performance. It does not guarantee or predict an official licensing-exam result."}
        </p>
      </CardContent>
    </Card>
  );
}

/** Diagnose → Target → Prepare. */
export function ProblemSolution({ category, slug, isSpanish }: SectionProps) {
  const steps = [
    {
      Icon: Search,
      title: isSpanish ? "1. DIAGNOSTICAR" : "1. DIAGNOSE",
      body: isSpanish
        ? "Haz una evaluación corta de preparación."
        : "Take a short readiness assessment.",
    },
    {
      Icon: Target,
      title: isSpanish ? "2. ENFOCAR" : "2. TARGET",
      body: isSpanish
        ? "Ve tus temas más fuertes y más débiles."
        : "See your strongest and weakest exam topics.",
    },
    {
      Icon: TrendingUp,
      title: isSpanish ? "3. PREPARAR" : "3. PREPARE",
      body: isSpanish
        ? "Practica áreas débiles, haz exámenes simulados y sigue tu progreso."
        : "Practice weaker areas, take mock exams and monitor progress.",
    },
  ];

  return (
    <section className="py-12 md:py-16" data-testid="section-problem-solution">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold md:text-3xl">
            {isSpanish
              ? "NO VUELVAS A ESTUDIAR TODO. ESTUDIA LO QUE TE FALTA."
              : "DON'T STUDY EVERYTHING AGAIN. STUDY WHAT YOU'RE MISSING."}
          </h2>
          <p className="mt-3 text-muted-foreground">
            {isSpanish
              ? "Ya dedicaste tiempo a aprender el material. Ahora identifica qué temas necesitan más atención antes del día del examen."
              : "You've already spent time learning the material. Now identify which topics require the most attention before exam day."}
          </p>
        </div>

        <div className="mx-auto mt-8 grid max-w-4xl gap-4 sm:grid-cols-3">
          {steps.map((s) => (
            <Card key={s.title}>
              <CardContent className="py-6">
                <div className="w-fit rounded-xl bg-primary/10 p-2.5">
                  <s.Icon className="h-5 w-5 text-primary" />
                </div>
                <h3 className="mt-3 font-semibold">{s.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{s.body}</p>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Button asChild size="lg" data-testid="button-find-weak-areas">
            <Link
              href="/readiness-check"
              onClick={() =>
                trackEvent("readiness_cta_click", { slug, exam_type: category, source: "problem_solution" })
              }
            >
              {isSpanish ? "ENCONTRAR MIS ÁREAS DÉBILES" : "FIND MY WEAK AREAS"}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>
    </section>
  );
}

/**
 * Official exam structure.
 *
 * Renders ONLY when shared/examFacts has verified figures for this exam. An
 * unverified exam shows nothing rather than guesses - publishing an invented
 * question count or passing score for a state licensing exam is a factual
 * claim we cannot support.
 */
export function ExamStructure({ category, isSpanish }: SectionProps) {
  if (!hasPublishableFacts(category)) return null;
  const facts = getExamFacts(category)!;

  return (
    <section className="py-12 md:py-16 bg-muted/30" data-testid="section-exam-structure">
      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-3xl text-center">
          <h2 className="text-2xl font-bold md:text-3xl">
            {isSpanish
              ? "CONSTRUIDO EN TORNO AL EXAMEN ACTUAL DE TEXAS"
              : "BUILT AROUND THE CURRENT TEXAS EXAM"}
          </h2>
          <p className="mt-2 text-muted-foreground">
            {isSpanish ? facts.examNameEs : facts.examName}
          </p>
        </div>

        <div className="mx-auto mt-8 grid max-w-3xl gap-4 sm:grid-cols-2">
          {facts.portions.map((p) => (
            <Card key={p.name} data-testid={`card-portion-${p.totalItems}`}>
              <CardContent className="py-6">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <h3 className="font-semibold">{isSpanish ? p.nameEs : p.name}</h3>
                </div>
                <dl className="mt-3 space-y-1.5 text-sm">
                  <div className="flex justify-between gap-4">
                    <dt className="text-muted-foreground">{isSpanish ? "Preguntas" : "Questions"}</dt>
                    <dd className="font-medium tabular-nums">
                      {p.totalItems}
                      {p.scoredItems !== undefined && (
                        <span className="ml-1 font-normal text-muted-foreground">
                          ({p.scoredItems} {isSpanish ? "calificadas" : "scored"})
                        </span>
                      )}
                    </dd>
                  </div>
                  {/* Only where the provider times each portion separately.
                      The insurance exams are one timed sitting covering both
                      sections, so their time is shown once below instead. */}
                  {p.timeMinutes !== undefined && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">{isSpanish ? "Tiempo" : "Time"}</dt>
                      <dd className="font-medium tabular-nums">
                        {p.timeMinutes} {isSpanish ? "minutos" : "minutes"}
                      </dd>
                    </div>
                  )}
                  {p.correctToPass !== undefined && (
                    <div className="flex justify-between gap-4">
                      <dt className="text-muted-foreground">{isSpanish ? "Para aprobar" : "To pass"}</dt>
                      <dd className="font-medium tabular-nums">
                        {p.correctToPass} {isSpanish ? "correctas" : "correct"}
                      </dd>
                    </div>
                  )}
                </dl>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Whole-exam facts, for providers that time the sitting as one block
            and report a scaled score rather than a raw count. */}
        {(facts.totalTimeMinutes !== undefined || facts.passingScaledScore !== undefined) && (
          <div
            className="mx-auto mt-4 flex max-w-3xl flex-wrap justify-center gap-x-8 gap-y-2 text-sm"
            data-testid="exam-total-facts"
          >
            {facts.totalTimeMinutes !== undefined && (
              <p>
                <span className="text-muted-foreground">
                  {isSpanish ? "Tiempo total: " : "Total time: "}
                </span>
                <span className="font-medium tabular-nums">
                  {facts.totalTimeMinutes} {isSpanish ? "minutos" : "minutes"}
                </span>
              </p>
            )}
            {facts.passingScaledScore !== undefined && (
              <p>
                <span className="text-muted-foreground">
                  {isSpanish ? "Puntuación para aprobar: " : "Passing score: "}
                </span>
                <span className="font-medium tabular-nums">
                  {facts.passingScaledScore}
                </span>
                <span className="text-muted-foreground">
                  {isSpanish ? " (escala 0-100)" : " (scaled, 0-100)"}
                </span>
              </p>
            )}
          </div>
        )}

        <p className="mx-auto mt-6 max-w-3xl text-center text-xs text-muted-foreground">
          {isSpanish ? facts.noteEs ?? facts.note : facts.note}{" "}
          {isSpanish ? "Fuente:" : "Source:"}{" "}
          <a
            href={facts.source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
            data-testid="link-exam-source"
          >
            {facts.source.label}
            {facts.source.documentId ? ` (${facts.source.documentId})` : ""}
          </a>
          {". "}
          {isSpanish
            ? "MyEasyPass no está afiliado ni respaldado por TREC, TDI o Pearson VUE."
            : "MyEasyPass is not affiliated with or endorsed by TREC, TDI or Pearson VUE."}
        </p>
      </div>
    </section>
  );
}

/** Retaker Rescue entry point. */
export function RetakerRescueSection({ category, slug, isSpanish }: SectionProps) {
  const { isAuthenticated } = useAuth();
  const { data: profile } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
    enabled: isAuthenticated,
  });

  return (
    <section className="py-12 md:py-16" data-testid="section-retaker-rescue">
      <div className="container mx-auto px-4">
        <Card className="mx-auto max-w-3xl border-primary/30 bg-primary/5">
          <CardContent className="py-8">
            <div className="flex items-start gap-4">
              <div className="rounded-xl bg-primary/10 p-3">
                <LifeBuoy className="h-6 w-6 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-xl font-bold md:text-2xl">
                  {isSpanish
                    ? "¿YA PRESENTASTE EL EXAMEN? NO EMPIECES DE CERO."
                    : "ALREADY TOOK THE EXAM? DON'T START OVER."}
                </h2>
                <p className="mt-2 text-muted-foreground">
                  {isSpanish
                    ? "Tu intento anterior te dio información. Enfoquémonos en lo que necesita mejorar."
                    : "Your previous attempt gave you information. Let's focus on what needs improvement."}
                </p>
                <ul className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
                  {(isSpanish
                    ? ["Diagnóstico dirigido", "Identificación de áreas débiles", "Práctica enfocada", "Repaso de preguntas falladas"]
                    : ["Targeted diagnostic", "Weak-area identification", "Focused drills", "Missed-question review"]
                  ).map((item) => (
                    <li key={item} className="flex items-center gap-2">
                      <Target className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
                <Button
                  asChild
                  className="mt-5"
                  data-testid="button-retaker-plan"
                >
                  <Link
                    href={profile ? "/dashboard" : "/readiness-check"}
                    onClick={() =>
                      trackEvent("retaker_rescue_start", { slug, exam_type: category, source: "landing" })
                    }
                  >
                    {isSpanish ? "CREAR MI PLAN DE REINTENTO" : "BUILD MY RETAKER PLAN"}
                  </Link>
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
