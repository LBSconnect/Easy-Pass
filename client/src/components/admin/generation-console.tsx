/**
 * Question generation console.
 *
 * WHY THIS EXISTS
 *
 * The generation route, the grounding logic, the deterministic validator and
 * the second-model check were all built and wired - and nothing in the app
 * ever called them. The review queue below could only ever be empty, because
 * the only way to put a draft in it was a hand-rolled API call. This is the
 * missing control.
 *
 * It also answers the question an operator actually has when generation does
 * nothing: *why*. The flags are resolved server-side and `enabled` is the
 * master switch - every sub-capability is `enabled && itsOwnFlag` - so
 * ALEXI_QUIZ_GENERATION_ENABLED=true does nothing on its own if ALEXI_ENABLED
 * is unset. Rather than leave that to be rediscovered from source, the state
 * is shown here with the variable name that fixes it.
 *
 * Nothing here publishes anything. Generation writes drafts to a separate
 * table that no student-facing query touches; a person still has to read each
 * one and approve it in the queue below.
 */

import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { EXAM_VISUALS } from "@/lib/examVisuals";
import { Sparkles, TriangleAlert, CircleCheck, CircleX, Loader2 } from "lucide-react";
import type { ExamCategory } from "@shared/schema";
import {
  blockingEnvVar,
  CAPABILITY_ENV,
  MASTER_ENV,
  type AssistantFlagState,
} from "@shared/alexiFlags";

/** Server-side cap. Asking for more is clamped, so the UI states the truth. */
const MAX_BATCH = 8;

const CATEGORIES: { id: ExamCategory; label: string }[] = [
  { id: "real_estate", label: "Real Estate" },
  { id: "property_casualty", label: "Property & Casualty" },
  { id: "life_insurance", label: "Life Insurance" },
  { id: "general_lines", label: "General Lines" },
];

interface AlexiConfig {
  displayName: string;
  aiAvailable: boolean;
  flags: AssistantFlagState;
}

interface GenerateResult {
  generated: number;
  queuedForReview: number;
  discarded: number;
  note?: string;
}

/**
 * Flag rows, with the environment variable behind each.
 *
 * The variable names come from CAPABILITY_ENV rather than being retyped here,
 * so a renamed variable cannot leave this screen telling operators to set one
 * that no longer exists.
 */
const FLAG_ROWS: { key: keyof AssistantFlagState; label: string; env: string }[] = [
  { key: "enabled", label: "Assistant (master switch)", env: MASTER_ENV },
  { key: "tutorEnabled", label: "Tutor", env: CAPABILITY_ENV.tutorEnabled },
  { key: "quizGenerationEnabled", label: "Question generation", env: CAPABILITY_ENV.quizGenerationEnabled },
  { key: "flashcardsEnabled", label: "Flashcards", env: CAPABILITY_ENV.flashcardsEnabled },
  { key: "mockExamEnabled", label: "Mock exams", env: CAPABILITY_ENV.mockExamEnabled },
  { key: "retakerEnabled", label: "Retaker rescue", env: CAPABILITY_ENV.retakerEnabled },
  { key: "spanishEnabled", label: "Spanish", env: CAPABILITY_ENV.spanishEnabled },
];

export function GenerationConsole() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [category, setCategory] = useState<ExamCategory>("real_estate");
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState(5);
  const [lastResult, setLastResult] = useState<GenerateResult | null>(null);

  const { data: config, isLoading: configLoading } = useQuery<AlexiConfig>({
    queryKey: ["/api/alexi/config"],
  });

  const generate = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", `/api/admin/generate-questions/${category}`, {
        count,
        topic: topic.trim() || undefined,
      });
      const data = await res.json();
      // The route answers with counts. A 200 that carries none of them means
      // something changed underneath us, and silently showing "0 queued"
      // would read as a successful empty run.
      if (typeof data?.queuedForReview !== "number") {
        throw new Error("The server returned an unexpected response.");
      }
      return data as GenerateResult;
    },
    onSuccess: (data) => {
      setLastResult(data);
      queryClient.invalidateQueries({
        queryKey: ["/api/admin/generated-questions?status=pending"],
      });
      toast({
        title: `${data.queuedForReview} draft${data.queuedForReview === 1 ? "" : "s"} queued`,
        description: "Nothing reaches students until you approve it below.",
      });
    },
    onError: (error: Error) =>
      toast({ title: "Generation failed", description: error.message, variant: "destructive" }),
  });

  if (configLoading) return <Skeleton className="h-64 w-full" />;

  const flags = config?.flags;
  const canGenerate = Boolean(flags?.enabled && flags?.quizGenerationEnabled);

  // Say precisely which switch is the problem, rather than "unavailable".
  const blockedBecause = blockingEnvVar(flags, "quizGenerationEnabled");

  return (
    <div className="space-y-4">
      {/* --- what the server actually thinks is on ------------------------- */}
      <Card data-testid="card-alexi-status">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" aria-hidden="true" />
            {config?.displayName ?? "Assistant"} status
          </CardTitle>
          <CardDescription>
            Resolved on the server from environment variables. Every capability is also gated
            by the master switch, so one of these being on is not enough on its own.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex flex-wrap items-center gap-2 text-sm">
            <span className="text-muted-foreground">Model provider credentials:</span>
            {config?.aiAvailable ? (
              <Badge variant="secondary" className="gap-1">
                <CircleCheck className="h-3 w-3" aria-hidden="true" />
                present
              </Badge>
            ) : (
              <Badge variant="destructive" className="gap-1">
                <CircleX className="h-3 w-3" aria-hidden="true" />
                missing
              </Badge>
            )}
          </div>

          <div className="grid gap-1.5 sm:grid-cols-2">
            {FLAG_ROWS.map((row) => {
              const on = Boolean(flags?.[row.key]);
              return (
                <div
                  key={row.key}
                  className="flex items-center justify-between gap-3 rounded-md border p-2.5"
                  data-testid={`flag-${row.key}`}
                >
                  <span className="min-w-0">
                    <span className="block text-sm font-medium">{row.label}</span>
                    <code className="block text-xs text-muted-foreground">{row.env}</code>
                  </span>
                  <Badge variant={on ? "secondary" : "outline"} className="shrink-0">
                    {on ? "on" : "off"}
                  </Badge>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* --- the control that was missing ---------------------------------- */}
      <Card data-testid="card-generate">
        <CardHeader>
          <CardTitle>Generate drafts</CardTitle>
          <CardDescription>
            Variants are grounded in approved questions from the bank for the exam you pick -
            never written from a bare topic name. Each one goes through the deterministic
            checks and an independent model review before it reaches the queue below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!canGenerate && (
            <div
              className="flex items-start gap-3 rounded-md border border-amber-500/40 bg-amber-500/5 p-3"
              data-testid="notice-generation-off"
            >
              <TriangleAlert
                className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
                aria-hidden="true"
              />
              <p className="min-w-0 text-sm">
                Generation is switched off. Set <code className="font-mono">{blockedBecause}</code>{" "}
                and redeploy to enable it.
              </p>
            </div>
          )}

          <div>
            <p className="mb-2 text-sm font-medium">Exam</p>
            <div
              className="grid gap-2 sm:grid-cols-2"
              role="radiogroup"
              aria-label="Exam category"
            >
              {CATEGORIES.map((c) => {
                const visual = EXAM_VISUALS[c.id];
                const Icon = visual.icon;
                const active = category === c.id;
                return (
                  <button
                    key={c.id}
                    type="button"
                    role="radio"
                    aria-checked={active}
                    onClick={() => setCategory(c.id)}
                    className={`flex min-h-11 items-center gap-3 rounded-md border p-3 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${
                      active ? `${visual.border} ${visual.tint}` : ""
                    }`}
                    data-testid={`generate-category-${c.id}`}
                  >
                    <span
                      className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${visual.tint}`}
                    >
                      <Icon className="h-4 w-4" aria-hidden="true" />
                    </span>
                    <span className="min-w-0 text-sm font-medium text-foreground">{c.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="generate-topic">
                Topic (optional)
              </label>
              <Input
                id="generate-topic"
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="e.g. BOP Eligibility"
                data-testid="input-generate-topic"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                Leave blank to ground in whatever the bank holds for this exam.
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium" htmlFor="generate-count">
                How many
              </label>
              <Input
                id="generate-count"
                type="number"
                min={1}
                max={MAX_BATCH}
                value={count}
                onChange={(e) => setCount(Number(e.target.value))}
                data-testid="input-generate-count"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                1 to {MAX_BATCH}. Anything higher is clamped server-side.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button
              disabled={!canGenerate || generate.isPending}
              onClick={() => generate.mutate()}
              data-testid="button-generate"
            >
              {generate.isPending ? (
                <>
                  <Loader2 className="mr-1.5 h-4 w-4 animate-spin" aria-hidden="true" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-1.5 h-4 w-4" aria-hidden="true" />
                  Generate drafts
                </>
              )}
            </Button>
            {generate.isPending && (
              <span className="text-xs text-muted-foreground">
                Each draft is checked by a second model, so this takes a moment.
              </span>
            )}
          </div>

          {/* What actually happened, including what was thrown away - a run
              that discards everything is information, not a failure. */}
          {lastResult && (
            <div className="rounded-md border p-3 text-sm" data-testid="text-generate-result">
              <p>
                Produced {lastResult.generated}, queued{" "}
                <strong>{lastResult.queuedForReview}</strong> for review, discarded{" "}
                {lastResult.discarded} that failed the checks.
              </p>
              {lastResult.queuedForReview === 0 && (
                <p className="mt-1 text-muted-foreground">
                  Nothing survived the checks this time. Try a different topic, or widen it by
                  leaving the topic blank.
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
