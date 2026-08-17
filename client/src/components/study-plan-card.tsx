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
import { CalendarDays, ListChecks, Play, Target, RefreshCw, BookOpen, Layers } from "lucide-react";
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
        ? `${task.topic} — ${n} preguntas`
        : `${task.topic} — ${n} questions`;
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

  // A plan failure must not take the dashboard down with it.
  if (isError || !plan) return null;

  const days = plan.daysUntilExam;

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
              {es
                ? `~${plan.estimatedMinutes} min`
                : `~${plan.estimatedMinutes} min`}
            </Badge>
          )}
        </div>

        {/* Exam countdown, or an invitation to set a date. Not scheduling yet
            is a supported answer, so this asks once and stays quiet. */}
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
      </CardContent>
    </Card>
  );
}
