/**
 * Admin AI cost and reliability panel.
 *
 * The usage endpoint has existed since the assistant shipped with nothing
 * reading it, so AI spend was only observable by querying the database. This
 * surfaces the three numbers that actually decide whether the AI layer is
 * behaving: what it costs, how often the cache saves a call, and how often it
 * falls back.
 *
 * Cost figures are internal and never shown to students.
 */

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { SectionHeading } from "@/components/page-shell";
import { TriangleAlert, TrendingUp } from "lucide-react";

interface UsageRow {
  operation: string;
  outcome: string;
  calls: number;
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
  avgLatencyMs: number;
}

interface UsageSummary {
  sinceDays: number;
  totalCalls: number;
  totalCostUsd: number;
  cacheHitRate: number;
  errorRate: number;
  byOperation: UsageRow[];
}

const RANGES = [7, 30, 90];

/** Outcome styling. The word carries the meaning; colour reinforces it. */
const OUTCOME_TONE: Record<string, string> = {
  success: "text-emerald-600 dark:text-emerald-400",
  cache_hit: "text-blue-600 dark:text-blue-400",
  fallback: "text-amber-600 dark:text-amber-400",
  error: "text-rose-600 dark:text-rose-400",
  blocked: "text-muted-foreground",
};

export function AiUsagePanel() {
  const [days, setDays] = useState(30);

  const { data, isLoading, isError, refetch } = useQuery<UsageSummary>({
    queryKey: [`/api/admin/ai-usage?days=${days}`],
  });

  if (isLoading) return <Skeleton className="h-64 w-full" data-testid="skeleton-ai-usage" />;

  if (isError) {
    return (
      <Card data-testid="card-ai-usage-error">
        <CardContent className="flex flex-col items-center gap-3 py-10 text-center">
          <p className="text-sm text-muted-foreground">Couldn't load AI usage.</p>
          <Button variant="outline" size="sm" onClick={() => refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const summary = data;
  const hasData = (summary?.totalCalls ?? 0) > 0;

  // A high fallback rate means students are quietly getting approved content
  // instead of assistant output - working as designed, but worth noticing.
  const errorRateHigh = (summary?.errorRate ?? 0) > 0.1;

  return (
    <Card data-testid="card-ai-usage">
      <CardContent className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionHeading>AI usage and cost</SectionHeading>
          <div className="flex gap-1.5" role="radiogroup" aria-label="Time range">
            {RANGES.map((r) => (
              <Button
                key={r}
                size="sm"
                role="radio"
                aria-checked={days === r}
                variant={days === r ? "default" : "outline"}
                onClick={() => setDays(r)}
                data-testid={`button-ai-range-${r}`}
              >
                {r}d
              </Button>
            ))}
          </div>
        </div>

        {!hasData ? (
          <p className="mt-4 text-sm text-muted-foreground" data-testid="text-ai-usage-empty">
            No AI calls recorded in this period. That is expected while the assistant is
            switched off — the recommendation engine runs without it.
          </p>
        ) : (
          <>
            <dl className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-4">
              <div>
                <dd className="text-2xl font-bold tabular-nums" data-testid="stat-ai-calls">
                  {summary!.totalCalls}
                </dd>
                <dt className="text-xs text-muted-foreground">calls</dt>
              </div>
              <div>
                <dd className="text-2xl font-bold tabular-nums" data-testid="stat-ai-cost">
                  ${summary!.totalCostUsd.toFixed(2)}
                </dd>
                <dt className="text-xs text-muted-foreground">estimated cost</dt>
              </div>
              <div>
                <dd className="text-2xl font-bold tabular-nums" data-testid="stat-ai-cache">
                  {Math.round(summary!.cacheHitRate * 100)}%
                </dd>
                <dt className="text-xs text-muted-foreground">cache hits</dt>
              </div>
              <div>
                <dd
                  className={`text-2xl font-bold tabular-nums ${errorRateHigh ? "text-amber-600 dark:text-amber-400" : ""}`}
                  data-testid="stat-ai-fallback"
                >
                  {Math.round(summary!.errorRate * 100)}%
                </dd>
                <dt className="text-xs text-muted-foreground">fallbacks</dt>
              </div>
            </dl>

            {errorRateHigh && (
              <p
                className="mt-3 flex items-start gap-2 rounded-md border border-amber-500/30 bg-amber-500/10 p-3 text-sm"
                data-testid="banner-ai-fallback-high"
              >
                <TriangleAlert
                  className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400"
                  aria-hidden="true"
                />
                <span>
                  More than one call in ten is falling back to approved content. Students are
                  still being served correctly, but the assistant is not reaching them.
                </span>
              </p>
            )}

            {/* Per-operation breakdown, so a single expensive operation is
                visible rather than averaged away. */}
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b text-left text-xs text-muted-foreground">
                    <th scope="col" className="pb-2 font-medium">Operation</th>
                    <th scope="col" className="pb-2 font-medium">Outcome</th>
                    <th scope="col" className="pb-2 text-right font-medium">Calls</th>
                    <th scope="col" className="pb-2 text-right font-medium">Cost</th>
                    <th scope="col" className="pb-2 text-right font-medium">Avg ms</th>
                  </tr>
                </thead>
                <tbody>
                  {summary!.byOperation
                    .slice()
                    .sort((a, b) => b.calls - a.calls)
                    .map((row) => (
                      <tr key={`${row.operation}:${row.outcome}`} className="border-b last:border-0">
                        <td className="py-2">{row.operation}</td>
                        <td className="py-2">
                          <span className={OUTCOME_TONE[row.outcome] ?? ""}>{row.outcome}</span>
                        </td>
                        <td className="py-2 text-right tabular-nums">{row.calls}</td>
                        <td className="py-2 text-right tabular-nums">
                          ${row.costUsd.toFixed(4)}
                        </td>
                        <td className="py-2 text-right tabular-nums">{row.avgLatencyMs}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            <p className="mt-3 flex items-start gap-1.5 text-xs text-muted-foreground">
              <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              Costs are estimates from token counts at published rates. Token counts are the
              durable record and can be re-costed if prices change.
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
