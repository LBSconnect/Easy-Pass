/**
 * Today's Plan.
 *
 * Tasks come from the existing server-side study plan, which derives them from
 * the student's real topic standing, missed-question backlog and exam date.
 * The frontend never fabricates a plan - it renders one.
 *
 * The plan is stable for a given day's data, so a refresh does not shuffle it
 * into something different.
 */

import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Layers, Target, RotateCcw, CircleCheck, ClipboardCheck, BookOpen, Clock, Play,
  CalendarDays,
} from "lucide-react";
import { IconTile, type TileTone } from "@/components/icon-tile";
import { trackEvent } from "@/lib/analytics";
import { STUDY_ASSISTANT, useStudyAssistantConfig } from "@/lib/studyAssistant";
import type { ExamCategory } from "@shared/schema";

type TaskKind =
  | "weak_topic_drill"
  | "missed_review"
  | "mock_exam"
  | "mastery_check"
  | "broad_practice";

interface PlanTask {
  kind: TaskKind;
  topic: string | null;
  questionCount: number | null;
  estimatedMinutes: number;
  topicAccuracy: number | null;
}

interface StudyPlan {
  intensity: string;
  isRescuePlan: boolean;
  daysUntilExam: number | null;
  tasks: PlanTask[];
  estimatedMinutes: number;
}

const TASK_META: Record<TaskKind, { icon: typeof Target; href: string; tone: TileTone }> = {
  weak_topic_drill: { icon: Target, href: "/exams", tone: "blue" },
  missed_review: { icon: RotateCcw, href: "/missed-questions", tone: "amber" },
  mock_exam: { icon: ClipboardCheck, href: "/exams", tone: "violet" },
  mastery_check: { icon: CircleCheck, href: "/exams", tone: "emerald" },
  broad_practice: { icon: BookOpen, href: "/exams", tone: "teal" },
};

function taskCopy(task: PlanTask, es: boolean): { title: string; sub: string } {
  const n = task.questionCount;
  switch (task.kind) {
    case "weak_topic_drill":
      return {
        title: es ? "Práctica de área débil" : "Weak Area Quiz",
        sub: task.topic
          ? es ? `Enfócate en ${task.topic}` : `Focus on ${task.topic}`
          : es ? "Enfócate en tus temas débiles" : "Focus on your weak topics",
      };
    case "missed_review":
      return {
        title: es ? "Repasar preguntas falladas" : "Review Missed Questions",
        sub: n
          ? es ? `${n} preguntas recientes` : `${n} recent questions`
          : es ? "Aprende de tus errores" : "Learn from recent mistakes",
      };
    case "mock_exam":
      return {
        title: es ? "Examen simulado" : "Full Mock Exam",
        sub: es ? "Simula condiciones reales" : "Simulate real exam conditions",
      };
    case "mastery_check":
      return {
        title: es ? "Prueba de dominio" : "Mastery Check",
        sub: n
          ? es ? `${n} preguntas` : `${n} questions`
          : es ? "Comprueba lo aprendido" : "Test your understanding",
      };
    case "broad_practice":
      return {
        title: es ? "Práctica general" : "Practice Session",
        sub: n
          ? es ? `${n} preguntas variadas` : `${n} mixed questions`
          : es ? "Amplía tu cobertura" : "Broaden your coverage",
      };
  }
}

export function TodaysPlanCard({ category }: { category: ExamCategory }) {
  const { i18n } = useTranslation();
  const es = i18n.language === "es";

  const { data: config } = useStudyAssistantConfig();
  const { data, isLoading, isError, refetch } = useQuery<StudyPlan>({
    queryKey: [`/api/study-plan/${category}`],
  });

  const named = config?.displayName ?? STUDY_ASSISTANT.displayName;
  const branded = config?.flags.enabled ?? false;

  if (isLoading) return <Skeleton className="h-72 w-full" data-testid="skeleton-plan" />;

  if (isError || !data) {
    return (
      <Card data-testid="card-plan-error">
        <CardContent className="flex flex-col items-center justify-center gap-3 py-10 text-center">
          <p className="text-sm text-muted-foreground">
            {es ? "No pudimos cargar tu plan de hoy." : "We couldn't load today's plan."}
          </p>
          <Button variant="outline" size="sm" onClick={() => refetch()} data-testid="button-retry-plan">
            {es ? "Reintentar" : "Retry"}
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (data.tasks.length === 0) {
    return (
      <Card data-testid="card-plan-empty">
        <CardContent className="py-10 text-center">
          <p className="text-sm text-muted-foreground">
            {es
              ? "No hay tareas pendientes. Practica un poco para generar tu plan de mañana."
              : "Nothing scheduled right now. Practise a little to build tomorrow's plan."}
          </p>
        </CardContent>
      </Card>
    );
  }

  const first = data.tasks[0];
  const firstHref = TASK_META[first.kind]?.href ?? "/exams";

  return (
    <Card data-testid="card-todays-plan">
      <CardContent className="p-5 md:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <IconTile icon={CalendarDays} tone="blue" />
          <h2 className="text-base font-semibold">{es ? "Plan de hoy" : "Today's Plan"}</h2>
          <Badge variant="secondary" className="inline-flex items-center gap-1 text-xs">
            <Clock className="h-3 w-3" aria-hidden="true" />
            {data.estimatedMinutes} {es ? "min" : "min"}
          </Badge>
          {data.isRescuePlan && (
            <Badge variant="outline" className="text-xs">
              {es ? "Plan de rescate" : "Rescue plan"}
            </Badge>
          )}
        </div>

        {branded && (
          <p className="mt-1 text-xs text-muted-foreground">
            {es
              ? `Preparado por ${named} según tu rendimiento reciente.`
              : `Prepared by ${named} based on your recent performance.`}
          </p>
        )}

        <ol className="mt-4 space-y-2" data-testid="list-plan-tasks">
          {data.tasks.map((task, i) => {
            const meta = TASK_META[task.kind] ?? TASK_META.broad_practice;
            const copy = taskCopy(task, es);
            return (
              <li key={i}>
                <Link
                  href={meta.href === "/exams" ? `/exams/${category}` : meta.href}
                  className="flex min-h-11 items-center gap-3 rounded-md border p-3 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  data-testid={`plan-task-${task.kind}`}
                >
                  <IconTile icon={meta.icon} tone={meta.tone} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{copy.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{copy.sub}</span>
                  </span>
                  <span className="shrink-0 text-xs tabular-nums text-muted-foreground">
                    {task.estimatedMinutes} {es ? "min" : "min"}
                  </span>
                  {/* Empty marker, not a control: the plan is completed by
                      doing the task, so a real checkbox here would promise a
                      toggle that does nothing. */}
                  <span
                    className="hidden h-[18px] w-[18px] shrink-0 rounded border sm:block"
                    aria-hidden="true"
                  />
                </Link>
              </li>
            );
          })}
        </ol>

        <Button
          asChild
          size="lg"
          className="mt-5 w-full"
          data-testid="button-start-plan"
        >
          <Link
            href={firstHref === "/exams" ? `/exams/${category}` : firstHref}
            onClick={() => trackEvent("todays_plan_started", { exam_type: category })}
          >
            <Play className="mr-1.5 h-4 w-4" aria-hidden="true" />
            {es ? "Comenzar el plan de hoy" : "Start Today's Plan"}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
