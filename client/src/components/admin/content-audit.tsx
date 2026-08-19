/**
 * What the question bank actually looks like.
 *
 * The validation pipeline runs on generated candidates before they are
 * stored. It has never seen the hand-written bank students sit, so until now
 * nobody could say whether that bank had questions with no Spanish text, an
 * answer index pointing past the options, or a correct answer that is
 * conspicuously the longest one.
 *
 * This is read-only on purpose. It names what it found and where; deciding
 * what to do about a finding is a person's job, and an automatic fix here
 * would edit material a paying student is studying from.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { ClipboardList, TriangleAlert, CircleCheck } from "lucide-react";
import type { ExamCategory } from "@shared/schema";

interface Finding {
  questionId: string;
  code: string;
  severity: "critical" | "warning";
  detail: string;
}

interface ThinTopic {
  category: string;
  topic: string;
  questions: number;
}

interface AuditReport {
  total: number;
  criticalCount: number;
  warningCount: number;
  cleanCount: number;
  findings: Finding[];
  findingsTruncated: boolean;
  byCode: Array<{ code: string; severity: "critical" | "warning"; questions: number }>;
  thinTopics: ThinTopic[];
}

const CATEGORIES: Array<{ value: string; label: string }> = [
  { value: "all", label: "All exams" },
  { value: "real_estate", label: "Real Estate" },
  { value: "property_casualty", label: "Property & Casualty" },
  { value: "life_insurance", label: "Life Insurance" },
  { value: "general_lines", label: "General Lines" },
];

/** Plain English for each code, so a finding is actionable without the source. */
const CODE_LABELS: Record<string, string> = {
  missing_question_en: "No English question text",
  missing_question_es: "No Spanish question text",
  too_few_options: "Fewer than two options",
  option_count_mismatch: "English and Spanish option counts differ",
  answer_out_of_range: "Answer index points past the options",
  empty_option_en: "Blank English option",
  empty_option_es: "Blank Spanish option",
  duplicate_options: "The same option offered twice",
  missing_explanation_en: "No English explanation",
  missing_explanation_es: "No Spanish explanation",
  missing_topic: "No topic, so it cannot be targeted",
  answer_length_tell: "Correct answer is conspicuously the longest",
  stem_echo: "Correct answer echoes the question wording",
  absolute_qualifier_tell: "Only the distractors hedge with absolutes",
  near_duplicate: "Near-duplicate of another question",
};

function label(code: string): string {
  return CODE_LABELS[code] ?? code;
}

/**
 * Read the payload without trusting its shape.
 *
 * A 200 whose body is missing `byCode` is not hypothetical - an object is
 * truthy even when every field in it is undefined, so `data.byCode.length`
 * threw and took the whole Review Queue tab down with it, generation console
 * and all. Normalising here means a partial body degrades to an empty report
 * instead of a blank page.
 */
function normalise(raw: unknown): AuditReport | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<AuditReport>;
  const count = (value: unknown) => (typeof value === "number" && Number.isFinite(value) ? value : 0);

  return {
    total: count(r.total),
    criticalCount: count(r.criticalCount),
    warningCount: count(r.warningCount),
    cleanCount: count(r.cleanCount),
    findings: Array.isArray(r.findings) ? r.findings : [],
    findingsTruncated: r.findingsTruncated === true,
    byCode: Array.isArray(r.byCode) ? r.byCode : [],
    thinTopics: Array.isArray(r.thinTopics) ? r.thinTopics : [],
  };
}

export function ContentAudit() {
  const [category, setCategory] = useState("all");

  const { data: raw, isLoading, isError, refetch, isFetching } = useQuery<unknown>({
    queryKey: [`/api/admin/content-audit?category=${category}`],
    // The audit reads the whole bank, so it is not something to re-run on
    // every focus change.
    staleTime: 5 * 60 * 1000,
  });

  const data = normalise(raw);

  return (
    <Card data-testid="card-content-audit">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ClipboardList className="h-5 w-5" aria-hidden="true" />
          Question bank audit
        </CardTitle>
        <CardDescription>
          Checks the live bank against the same standard generated questions have to meet.
          Nothing here changes a question.
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-5">
        <div className="flex flex-wrap items-center gap-2">
          {CATEGORIES.map((c) => (
            <Button
              key={c.value}
              size="sm"
              variant={category === c.value ? "default" : "outline"}
              onClick={() => setCategory(c.value)}
              data-testid={`button-audit-${c.value}`}
            >
              {c.label}
            </Button>
          ))}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => refetch()}
            disabled={isFetching}
            data-testid="button-audit-refresh"
          >
            {isFetching ? "Checking…" : "Re-run"}
          </Button>
        </div>

        {isLoading && <Skeleton className="h-32 w-full" />}

        {isError && (
          <p className="text-sm text-destructive" data-testid="text-audit-error">
            The audit could not be run. Nothing has been changed.
          </p>
        )}

        {data && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <Figure label="Questions" value={data.total} testId="stat-audit-total" />
              <Figure
                label="With a blocking problem"
                value={data.criticalCount}
                tone={data.criticalCount > 0 ? "bad" : "good"}
                testId="stat-audit-critical"
              />
              <Figure
                label="With a weakness"
                value={data.warningCount}
                tone={data.warningCount > 0 ? "warn" : "good"}
                testId="stat-audit-warning"
              />
              <Figure label="Clean" value={data.cleanCount} tone="good" testId="stat-audit-clean" />
            </div>

            {data.byCode.length === 0 ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground" data-testid="text-audit-clean">
                <CircleCheck className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                Nothing to report for this selection.
              </p>
            ) : (
              <div className="space-y-2">
                <h3 className="text-sm font-medium">What was found</h3>
                <ul className="space-y-1.5" data-testid="list-audit-codes">
                  {data.byCode.map((entry) => (
                    <li
                      key={entry.code}
                      className="flex items-center justify-between gap-3 rounded-md border p-2.5 text-sm"
                    >
                      <span className="flex min-w-0 items-center gap-2">
                        <Badge variant={entry.severity === "critical" ? "destructive" : "secondary"}>
                          {entry.severity === "critical" ? "Blocking" : "Weakness"}
                        </Badge>
                        <span className="truncate">{label(entry.code)}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {entry.questions}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.thinTopics.length > 0 && (
              <div className="space-y-2">
                <h3 className="flex items-center gap-2 text-sm font-medium">
                  <TriangleAlert className="h-4 w-4 text-amber-600" aria-hidden="true" />
                  Topics with too few questions
                </h3>
                <p className="text-sm text-muted-foreground">
                  A topic this thin cannot fill its share of a paper, so the same questions come
                  round every sitting.
                </p>
                <ul className="space-y-1 text-sm" data-testid="list-thin-topics">
                  {data.thinTopics.map((t) => (
                    <li key={`${t.category}-${t.topic}`} className="flex justify-between gap-3">
                      <span className="truncate">
                        {t.topic}
                        <span className="text-muted-foreground"> · {t.category}</span>
                      </span>
                      <span className="shrink-0 tabular-nums text-muted-foreground">
                        {t.questions}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {data.findings.length > 0 && (
              <details className="rounded-md border p-3">
                <summary className="cursor-pointer text-sm font-medium">
                  Every finding ({data.findings.length}
                  {data.findingsTruncated ? ", capped" : ""})
                </summary>
                <ul className="mt-3 space-y-1.5 text-sm" data-testid="list-audit-findings">
                  {data.findings.map((f, i) => (
                    <li key={`${f.questionId}-${f.code}-${i}`} className="border-b pb-1.5 last:border-0">
                      <span className="font-mono text-xs text-muted-foreground">{f.questionId}</span>
                      <span className="mx-2">{label(f.code)}</span>
                      <span className="text-muted-foreground">{f.detail}</span>
                    </li>
                  ))}
                </ul>
                {data.findingsTruncated && (
                  <p className="mt-2 text-xs text-muted-foreground">
                    The list is capped; the counts above cover the whole bank.
                  </p>
                )}
              </details>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function Figure({
  label,
  value,
  tone,
  testId,
}: {
  label: string;
  value: number;
  tone?: "good" | "warn" | "bad";
  testId: string;
}) {
  const colour =
    tone === "bad" && value > 0
      ? "text-destructive"
      : tone === "warn" && value > 0
        ? "text-amber-600 dark:text-amber-400"
        : tone === "good"
          ? "text-emerald-600 dark:text-emerald-400"
          : "";

  return (
    <div className="rounded-lg border p-3">
      <div className={`text-2xl font-semibold tabular-nums ${colour}`} data-testid={testId}>
        {value}
      </div>
      <div className="text-xs text-muted-foreground">{label}</div>
    </div>
  );
}
