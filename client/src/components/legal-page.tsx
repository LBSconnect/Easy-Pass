/**
 * Shell for the policy and notice pages.
 *
 * Ten pages — terms, privacy, cookies, DMCA, refunds, accessibility, the exam
 * disclaimer and the rest — each repeated the same scaffold: navbar, a
 * `container mx-auto px-4 py-12 max-w-4xl`, a heading, an identical
 * effective/updated block, an identical prose wrapper, footer. Ten copies of
 * one layout, which is ten places for it to drift and ten places to edit when
 * the dates change.
 *
 * They also sat at a different vertical rhythm from every other page in the
 * app, because `py-12` predates the shared shell.
 *
 * So the layout is declared once and the pages carry only their words. The
 * dates default to the values all ten already used and can be overridden per
 * page, so a policy that genuinely changes on its own schedule can say so.
 */

import type { ReactNode } from "react";
import { PageShell } from "@/components/page-shell";

/** What every policy page currently states. Overridable per page. */
export const DEFAULT_EFFECTIVE_DATE = "July 30, 2026";
export const DEFAULT_UPDATED_DATE = "July 30, 2026";

interface Props {
  title: string;
  /** Suffix for the heading's test id, e.g. "terms" -> heading-terms. */
  testId: string;
  effectiveDate?: string;
  updatedDate?: string;
  children: ReactNode;
}

export function LegalPage({
  title,
  testId,
  effectiveDate = DEFAULT_EFFECTIVE_DATE,
  updatedDate = DEFAULT_UPDATED_DATE,
  children,
}: Props) {
  return (
    <PageShell>
      <h1 className="text-3xl font-bold" data-testid={`heading-${testId}`}>
        {title}
      </h1>

      <p className="mt-2 text-sm text-muted-foreground">
        Effective Date: {effectiveDate}
        <br />
        Last Updated: {updatedDate}
      </p>

      {/* `max-w-none` because the shell already holds the measure; without it
          the prose plugin would narrow the column a second time. */}
      <div className="prose prose-slate dark:prose-invert mt-8 max-w-none space-y-8">
        {children}
      </div>
    </PageShell>
  );
}
