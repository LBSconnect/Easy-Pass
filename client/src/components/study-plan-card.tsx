import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { CalendarDays, ListChecks, Play, Target, RefreshCw, BookOpen, Layers, Sparkles } from "lucide-react";
import { RescueBanner } from "@/components/retaker-rescue-card";
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

interface RoadmapDay {
  day: number;
  title: string;
  detail: string;
  minutes: number;
  kind: TaskKind | "mixed_review";
}

const TASK_ICON: Record<TaskKind, typeof Target> = {
  weak_topic_drill: Target,
  missed_review: RefreshCw,
  mock_exam: Layers,
  mastery_check: ListChecks,
  broad_practice: BookOpen,
};

function taskLabel(task: PlanTask, es: boolean): string {
  const n = task.questionCount;
  switch (task.kind) {
    case "weak_topic_drill":
      return es
        ? `${task.topic}: ${n} preguntas`
        : `${task.topic}: ${n} questions`;
    case "missed_review":
      return es
        ? `Repasa ${n} preguntas falladas`
        : `Review ${n} missed questions`;
    case "mock_exam":
      return es ? "Examen simulado completo" : "Full mock exam";
    case "mastery_check":
      return es
        ? `Prueba de dominio: ${task.topic}`
        : `Mastery check: ${task.topic}`;
    case "broad_practice":
      return es ? `${n} preguntas de práctica` : `${n} practice questions`;
  }
}

function buildSevenDayRoadmap(plan: StudyPlan, es: boolean): RoadmapDay[] {
  const weakTopics = plan.tasks
    .filter((task) => task.kind === "weak_topic_drill" && task.topic)
    .map((task) => task.topic as string);
  const uniqueWeak = Array.from(new Set(weakTopics));
  const missed = plan.tasks.find((task) => task.kind === "missed_review");
  const hasMock = plan.tasks.some((task) => task.kind === "mock_exam");
  const dayCount = plan.daysUntilExam === null
    ? 7
    : Math.max(1, Math.min(7, plan.daysUntilExam + 1));
  const defaultMinutes = Math.max(15, Math.min(60, plan.estimatedMinutes || 30));

  const topicFor = (index: number) => uniqueWeak[index % Math.max(1, uniqueWeak.length)] ?? null;
  const days: RoadmapDay[] = [];

  for (let day = 1; day <= dayCount; day++) {
    if (day === 1) {
      days.push({
        day,
        title: es ? "Haz el plan de hoy" : "Complete today's plan",
        detail: es
          ? "Empieza con la recomendación que Alexi ya priorizó usando tu rendimiento actual."
          : "Start with the recommendation Alexi already prioritized from your current performance.",
        minutes: defaultMinutes,
        kind: "mixed_review",
      });
      continue;
    }

    if (day === dayCount && plan.daysUntilExam !== null && plan.daysUntilExam <= 6) {
      days.push({
        day,
        title: es ? "Repaso final" : "Final review",
        detail: es
          ? "Repasa errores recientes y conceptos débiles; evita añadir material nuevo a última hora."
          : "Review recent misses and weak concepts; avoid adding brand-new material at the last minute.",
        minutes: Math.min(defaultMinutes, 30),
        kind: "missed_review",
      });
      continue;
    }

    if ((day === 4 || (dayCount <= 4 && day === 3)) && (hasMock || plan.daysUntilExam !== null)) {
      days.push({
        day,
        title: es ? "Día de simulación" : "Mock-exam checkpoint",
        detail: es
          ? "Haz una sesión representativa y usa el resultado para recalibrar los días restantes."
          : "Take a representative sitting and use the result to recalibrate the remaining days.",
        minutes: Math.max(defaultMinutes, 45),
        kind: "mock_exam",
      });
      continue;
    }

    const topic = topicFor(day - 2);
    if (topic) {
      days.push({
        day,
        title: topic,
        detail: missed && day % 2 === 1
          ? (es ? "Trabaja este tema y vuelve a intentar errores relacionados." : "Work this topic, then retry related misses.")
          : (es ? "Sesión dirigida al concepto débil que Alexi identificó." : "Target the weak concept Alexi identified from your performance."),
        minutes: defaultMinutes,
        kind: "weak_topic_drill",
      });
      continue;
    }

    days.push({
      day,
      title: day % 2 === 0
        ? (es ? "Práctica mixta" : "Mixed practice")
        : (es ? "Revisión de errores" : "Mistake review"),
      detail: day % 2 === 0
        ? (es ? "Amplía cobertura y busca nuevas brechas antes del siguiente control." : "Broaden coverage and surface new gaps before the next checkpoint.")
        : (es ? "Vuelve a las preguntas que fallaste y comprueba que el error no se repita." : "Return to missed questions and confirm the same error does not repeat."),
      minutes: defaultMinutes,
      kind: day % 2 === 0 ? "broad_practice" : "missed_review",
    });
  }

  return days;
}

export function StudyPlanCard({ category }: { category: ExamCategory }) {
  const { i18n } = useTranslation();
  const es = i18n.language === "es";
  const [dateDraft, setDateDraft] = useState("");

  const { data: plan, isLoading, isError } = useQuery<StudyPlan>({
    queryKey: [`/api/study-plan/${category}`],
  });

  const setExamDate = useMutation({
    mutationFn: async (iso: string | null) => {
      const res = await apiRequest("PATCH", "/api/profile", { examDate: iso });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: [`/api/study-plan/${category}`] });
    },
  });

  if (isLoading) {
    return (
      <Card data-testid="card-study-plan">
        <CardContent className="py-6">
          <Skeleton className="h-5 w-44" />
          <Skeleton className="mt-4 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-5/6" />
        </CardContent>
      </Card>
    );
  }

  if (isError || !plan) return null;

  const days = plan.daysUntilExam;
  const roadmap = buildSevenDayRoadmap(plan, es);

  return (
    <Card data-testid="card-study-plan">
      <CardContent className="py-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <ListChecks className="h-5 w-5 text-primary" />
            <h2 className="font-semibold">
              {es ? "El Plan de Hoy" : "Today's Plan"}
            </h2>
          </div>
          {plan.tasks.length > 0 && (
            <Badge variant="secondary" data-testid="badge-plan-minutes">
              ~{plan.estimatedMinutes} min
            </Badge>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg bg-muted/50 p-3">
          <CalendarDays className="h-4 w-4 shrink-0 text-muted-foreground" />
          {days !== null ? (
            <span className="text-sm" data-testid="text-exam-countdown">
              {days > 1
                ? es
                  ? `Faltan ${days} días para tu examen`
                  : `${days} days until your exam`
                : days === 1
                  ? es
                    ? "Tu examen es mañana"
                    : "Your exam is tomorrow"
                  : days === 0
                    ? es
                      ? "Tu examen es hoy"
                      : "Your exam is today"
                    : es
                      ? "Tu fecha de examen ya pasó"
                      : "Your exam date has passed"}
            </span>
          ) : (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-sm text-muted-foreground">
                {es ? "¿Cuándo es tu examen?" : "When is your exam?"}
              </span>
              <Input
                type="date"
                value={dateDraft}
                onChange={(e) => setDateDraft(e.target.value)}
                className="h-8 w-auto"
                aria-label={es ? "Fecha del examen" : "Exam date"}
                data-testid="input-exam-date"
              />
              <Button
                size="sm"
                variant="outline"
                disabled={!dateDraft || setExamDate.isPending}
                onClick={() =>
                  setExamDate.mutate(new Date(`${dateDraft}T00:00:00Z`).toISOString())
                }
                data-testid="button-save-exam-date"
              >
                {es ? "Guardar" : "Save"}
              </Button>
            </div>
          )}
        </div>

        {plan.isRescuePlan && <RescueBanner />}

        <ol className="mt-4 space-y-3">
          {plan.tasks.map((task, i) => {
            const Icon = TASK_ICON[task.kind];
            return (
              <li key={`${task.kind}-${i}`} className="flex items-start gap-3">
                <div className="mt-0.5 rounded-lg bg-primary/10 p-1.5">
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{taskLabel(task, es)}</p>
                  <p className="text-xs text-muted-foreground">
                    {task.topicAccuracy !== null && (
                      <span data-testid="text-task-accuracy">
                        {es ? "Actualmente" : "Currently"} {task.topicAccuracy}% ·{" "}
                      </span>
                    )}
                    ~{task.estimatedMinutes} min
                  </p>
                </div>
              </li>
            );
          })}
        </ol>

        <Button asChild className="mt-5 w-full" data-testid="button-start-plan">
          <Link href={`/exams/${category}`}>
            <Play className="mr-1.5 h-4 w-4" />
            {es ? "Comenzar el Plan de Hoy" : "Start Today's Plan"}
          </Link>
        </Button>

        <div className="mt-7 border-t pt-6" data-testid="section-seven-day-roadmap">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
              <div>
                <h3 className="font-semibold">
                  {es ? "Tu Ruta de 7 Días con Alexi" : "Your 7-Day Alexi Roadmap"}
                </h3>
                <p className="text-xs text-muted-foreground">
                  {roadmap.length < 7
                    ? (es ? "Comprimida automáticamente para tu fecha de examen." : "Automatically compressed for your exam date.")
                    : (es ? "Basada en tus prioridades de estudio actuales." : "Based on your current study priorities.")}
                </p>
              </div>
            </div>
            <Badge variant="outline">
              {roadmap.length} {es ? "días" : roadmap.length === 1 ? "day" : "days"}
            </Badge>
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {roadmap.map((item) => (
              <div key={item.day} className="rounded-lg border p-3" data-testid={`roadmap-day-${item.day}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                      {es ? `Día ${item.day}` : `Day ${item.day}`}
                    </p>
                    <p className="mt-1 font-medium">{item.title}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground">~{item.minutes} min</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{item.detail}</p>
              </div>
            ))}
          </div>

          <p className="mt-3 text-xs text-muted-foreground">
            {es
              ? "Alexi recalcula tus prioridades a medida que respondes más preguntas, así que esta ruta puede cambiar con tu progreso."
              : "Alexi recalculates your priorities as you answer more questions, so this roadmap can change with your progress."}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
