import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Grid3x3, Target, CircleCheck, CircleAlert, CircleX } from "lucide-react";
import type { ExamCategory } from "@shared/schema";

interface TopicMastery {
  topic: string;
  answered: number;
  correct: number;
  accuracy: number;
}

/**
 * Mastery tiers. Each carries an icon and a word as well as a colour, so the
 * heatmap is readable without colour perception - a plain red/amber/green grid
 * would fail WCAG 1.4.1 (use of colour).
 */
function tierFor(accuracy: number) {
  if (accuracy >= 80) {
    return {
      key: "strong" as const,
      Icon: CircleCheck,
      tone: "text-emerald-600 dark:text-emerald-400",
      bar: "[&>div]:bg-emerald-500",
      label: { en: "Strong", es: "Fuerte" },
    };
  }
  if (accuracy >= 60) {
    return {
      key: "moderate" as const,
      Icon: CircleAlert,
      tone: "text-amber-600 dark:text-amber-400",
      bar: "[&>div]:bg-amber-500",
      label: { en: "Needs review", es: "Necesita repaso" },
    };
  }
  return {
    key: "weak" as const,
    Icon: CircleX,
    tone: "text-rose-600 dark:text-rose-400",
    bar: "[&>div]:bg-rose-500",
    label: { en: "Weak", es: "Débil" },
  };
}

export function MasteryHeatmap({ category }: { category: ExamCategory }) {
  const { i18n } = useTranslation();
  const es = i18n.language === "es";
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data, isLoading, isError } = useQuery<TopicMastery[]>({
    queryKey: [`/api/mastery/${category}`],
  });

  const startDrill = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/drills/weak-areas/${category}`, {
        questionCount: 20,
      });
      return res.json();
    },
    onSuccess: (data) => {
      if (data?.session?.id) {
        navigate(`/exams/${category}?session=${data.session.id}`);
      }
    },
    onError: () => {
      toast({
        variant: "destructive",
        title: es ? "No se pudo iniciar" : "Couldn't start drill",
        description: es
          ? "Inténtalo de nuevo en un momento."
          : "Please try again in a moment.",
      });
    },
  });

  if (isLoading) {
    return (
      <Card data-testid="card-mastery-heatmap">
        <CardContent className="py-6">
          <Skeleton className="h-5 w-36" />
          <Skeleton className="mt-4 h-4 w-full" />
          <Skeleton className="mt-2 h-4 w-full" />
        </CardContent>
      </Card>
    );
  }

  // Mastery failing must not take the dashboard down.
  if (isError || !data || data.length === 0) return null;

  const weakest = data.filter((t) => t.accuracy < 70);

  return (
    <Card data-testid="card-mastery-heatmap">
      <CardContent className="py-6">
        <div className="flex items-center gap-2">
          <Grid3x3 className="h-5 w-5 text-primary" />
          <h2 className="font-semibold">
            {es ? "Tu Dominio por Tema" : "Your Topic Mastery"}
          </h2>
        </div>

        <ul className="mt-4 space-y-3">
          {data.map((topic) => {
            const tier = tierFor(topic.accuracy);
            const tierLabel = tier.label[es ? "es" : "en"];
            return (
              <li key={topic.topic} data-testid={`row-mastery-${tier.key}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-2">
                    <tier.Icon className={`h-4 w-4 shrink-0 ${tier.tone}`} aria-hidden="true" />
                    <span className="truncate text-sm font-medium">{topic.topic}</span>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {/* The tier word carries the meaning; colour reinforces it. */}
                    <span className={`text-xs ${tier.tone}`}>{tierLabel}</span>
                    <span className="text-sm font-semibold tabular-nums">
                      {topic.accuracy}%
                    </span>
                  </div>
                </div>
                <Progress
                  value={topic.accuracy}
                  className={`mt-1.5 h-1.5 ${tier.bar}`}
                  aria-label={`${topic.topic}: ${topic.accuracy}%, ${tierLabel}`}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  {topic.correct}/{topic.answered}{" "}
                  {es ? "correctas" : "correct"}
                </p>
              </li>
            );
          })}
        </ul>

        {weakest.length > 0 && (
          <Button
            className="mt-5 w-full"
            onClick={() => startDrill.mutate()}
            disabled={startDrill.isPending}
            data-testid="button-weak-area-drill"
          >
            <Target className="mr-1.5 h-4 w-4" />
            {startDrill.isPending
              ? es
                ? "Preparando..."
                : "Preparing…"
              : es
                ? "Estudiar Mis Temas Más Débiles"
                : "Study My Weakest Topics"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
