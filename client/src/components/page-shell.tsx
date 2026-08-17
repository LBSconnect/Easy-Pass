/**
 * Shared page shell.
 *
 * Twenty-six pages were repeating the same navbar/main/footer scaffold with
 * ten different container widths between them, so "how wide is a page?" had
 * ten answers depending on which file you opened. The dashboard and exams
 * redesigns established one answer; this puts it somewhere the other pages can
 * share rather than each re-deciding.
 *
 * Three widths, chosen by what the page contains rather than by taste:
 *
 * - `wide`    data-dense pages that use the full desktop canvas (dashboard,
 *             exams). 1320px matches the approved concept.
 * - `content` the default. Reading and form pages, held near 65-75 characters
 *             per line because long measures are genuinely harder to read.
 * - `narrow`  single-focus flows - one card, one decision.
 */

import type { ReactNode } from "react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { cn } from "@/lib/utils";

export type ShellWidth = "wide" | "content" | "narrow";

const WIDTHS: Record<ShellWidth, string> = {
  wide: "max-w-[1320px]",
  content: "max-w-4xl",
  narrow: "max-w-2xl",
};

interface PageShellProps {
  children: ReactNode;
  width?: ShellWidth;
  /** Extra classes on the inner container. */
  className?: string;
  /** Drop the footer for immersive flows (an exam in progress, say). */
  hideFooter?: boolean;
}

export function PageShell({
  children,
  width = "content",
  className,
  hideFooter = false,
}: PageShellProps) {
  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <div className={cn("container mx-auto px-4 py-6 md:py-8", WIDTHS[width], className)}>
          {children}
        </div>
      </main>
      {!hideFooter && <Footer />}
    </div>
  );
}

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  /** Lucide icon component, rendered in a tinted tile. */
  icon?: React.ComponentType<{ className?: string }>;
  /** Right-hand slot - a CTA, a status chip, a countdown. */
  action?: ReactNode;
  className?: string;
}

/**
 * Page title block.
 *
 * Always renders the single `h1` for the page. Centralising it is what keeps
 * heading order correct across pages that would otherwise each invent their
 * own hierarchy.
 */
export function PageHeader({
  title,
  subtitle,
  icon: Icon,
  action,
  className,
}: PageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 md:flex-row md:items-center md:justify-between",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        {Icon && (
          <span className="shrink-0 rounded-lg bg-primary/10 p-3">
            <Icon className="h-6 w-6 text-primary" />
          </span>
        )}
        <div className="min-w-0">
          <h1 className="text-2xl font-bold md:text-3xl">{title}</h1>
          {subtitle && <p className="mt-0.5 text-sm text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

/**
 * Section heading inside a page.
 *
 * An `h2`, so pages built from these never skip a heading level - the failure
 * a screen-reader user actually notices.
 */
export function SectionHeading({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  return <h2 className={cn("text-base font-semibold", className)}>{children}</h2>;
}
