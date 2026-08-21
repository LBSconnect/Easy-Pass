/**
 * The dashboard's smaller supporting cards.
 *
 * Grouped in one file because each is a handful of lines of presentation with
 * no logic of its own - splitting them across five files would be filing, not
 * structure. Anything here that grows a real behaviour should move out.
 *
 * All of these are visually subordinate by design: the page must have one
 * dominant CTA, and none of these is it.
 */

import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Target, Layers, RotateCcw, ClipboardCheck, ChevronRight, Zap,
  BookOpen, CalendarDays, FileText, Home, Shield, Heart, TrendingUp, Crown,
} from "lucide-react";
import { IconTile, type TileTone } from "@/components/icon-tile";
import { AlexiMascot } from "@/components/alexi-mascot";
import { PremiumIllustration } from "@/components/premium-illustration";
import { trackEvent, type AnalyticsEventName } from "@/lib/analytics";
import { AlexiMark } from "@/components/alexi-mark";
import type { ExamCategory } from "@shared/schema";

const CATEGORY_ICONS: Record<string, typeof Home> = {
  real_estate: Home,
  property_casualty: Shield,
  life_insurance: Heart,
  general_lines: FileText,
};

/* ------------------------------------------------------------------ */

interface QuickActionsProps {
  category: ExamCategory;
  /** Counts shown as context. Omitted rather than zeroed when unknown. */
  dueFlashcards?: number | null;
  missedCount?: number | null;
  /** Ask Alexi only appears when the tutor is actually available. */
  showAskAlexi: boolean;
}

export function QuickActionsCard({
  category,
  dueFlashcards,
  missedCount,
  showAskAlexi,
}: QuickActionsProps) {
  const { i18n } = useTranslation();
  const es = i18n.language === "es";

  const actions: Array<{
    href: string;
    icon: typeof Target;
    tone: TileTone;
    title: string;
    sub: string;
    event: AnalyticsEventName;
    testId: string;
    /** Alexi's row carries the mascot instead of a generic icon. */
    mascot?: boolean;
  }> = [
    {
      href: `/exams/${category}`,
      icon: Target,
      tone: "blue",
      title: es ? "Practicar" : "Quiz Me",
      sub: es ? "Práctica con preguntas inteligentes" : "Practice with smart quizzes",
      event: "quiz_me_clicked",
      testId: "action-quiz",
    },
    {
      href: "/flashcards",
      icon: Layers,
      tone: "violet",
      title: es ? "Tarjetas" : "Flashcards",
      sub:
        typeof dueFlashcards === "number" && dueFlashcards > 0
          ? es ? `${dueFlashcards} pendientes hoy` : `${dueFlashcards} due today`
          : es ? "Repasa términos clave" : "Review key terms",
      event: "flashcards_clicked",
      testId: "action-flashcards",
    },
    {
      href: "/missed-questions",
      icon: RotateCcw,
      tone: "amber",
      title: es ? "Repasar errores" : "Review Mistakes",
      sub:
        typeof missedCount === "number" && missedCount > 0
          ? es ? `${missedCount} preguntas` : `${missedCount} questions`
          : es ? "Aprende de tus fallos" : "Learn from your misses",
      event: "review_mistakes_clicked",
      testId: "action-mistakes",
    },
    {
      href: `/exams/${category}?mode=full`,
      icon: ClipboardCheck,
      tone: "emerald",
      title: es ? "Examen simulado" : "Mock Exam",
      sub: es ? "Simula el examen real" : "Simulate exam conditions",
      event: "mock_exam_clicked",
      testId: "action-mock",
    },
  ];

  if (showAskAlexi) {
    actions.push({
      // Anchored at the ask section rather than the top of the page: the
      // button says "Ask Alexi", so it should land on the part that asks.
      href: "/study-assistant#ask",
      icon: Target,
      tone: "slate",
      mascot: true,
      title: es ? "Pregúntale a Alexi" : "Ask Alexi",
      sub: es ? "Ayuda de estudio experta" : "Get expert study help",
      event: "ask_alexi_clicked",
      testId: "action-ask-alexi",
    });
  }

  return (
    <Card className="h-full" data-testid="card-quick-actions">
      <CardContent className="p-5">
        <div className="flex items-center gap-2.5">
          <IconTile icon={Zap} tone="blue" />
          <h2 className="text-base font-semibold">{es ? "Acciones rápidas" : "Quick Actions"}</h2>
        </div>
        <ul className="mt-3 space-y-2">
          {actions.map((a) => (
            <li key={a.testId}>
              <Link
                href={a.href}
                onClick={() => trackEvent(a.event, { exam_type: category })}
                // min-h-11 keeps the tap target at 44px on touch devices.
                className="flex min-h-11 items-center gap-3 rounded-md border p-2.5 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                data-testid={a.testId}
              >
                {a.mascot ? (
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                    <AlexiMascot size={26} waving={false} sparkles={false} />
                  </span>
                ) : (
                  <IconTile icon={a.icon} tone={a.tone} />
                )}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-base font-medium">{a.title}</span>
                  <span className="block truncate text-sm text-muted-foreground">{a.sub}</span>
                </span>
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden="true" />
              </Link>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

export function CurrentExamCard({
  category,
  label,
  isActive,
}: {
  category: ExamCategory;
  label: string;
  isActive: boolean;
}) {
  const { i18n } = useTranslation();
  const es = i18n.language === "es";
  const Icon = CATEGORY_ICONS[category] ?? FileText;

  return (
    <Card className="h-full" data-testid="card-current-exam">
      <CardContent className="flex h-full flex-col p-5">
        <div className="flex items-center gap-2.5">
          <IconTile icon={ClipboardCheck} tone="blue" />
          <h2 className="text-base font-semibold">{es ? "Examen actual" : "Current Exam"}</h2>
        </div>

        <div className="mt-4 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-base font-semibold leading-snug" data-testid="text-current-exam-name">
              {label}
            </p>
            {isActive && (
              <Badge
                variant="secondary"
                className="mt-1.5 border-emerald-500/25 bg-emerald-500/10 text-xs text-emerald-700 dark:text-emerald-400"
              >
                {es ? "Activo" : "Active"}
              </Badge>
            )}
          </div>
          <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary/10">
            <Icon className="h-6 w-6 text-primary" aria-hidden="true" />
          </span>
        </div>

        <Button
          variant="outline"
          asChild
          className="mt-auto w-full"
          data-testid="button-change-exam"
        >
          <Link href="/exams" onClick={() => trackEvent("change_exam_clicked", { exam_type: category })}>
            {es ? "Cambiar examen" : "Change Exam"}
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

export function StudyResourcesCard() {
  const { i18n } = useTranslation();
  const es = i18n.language === "es";

  const resources = [
    {
      href: "/study-guide",
      icon: BookOpen,
      tone: "blue" as TileTone,
      title: es ? "Guía de estudio" : "Study Guide",
      sub: es ? "Aprende a tu ritmo" : "Learn at your own pace",
      testId: "resource-study-guide",
    },
    {
      href: "/schedule-exam",
      icon: CalendarDays,
      tone: "violet" as TileTone,
      title: es ? "Programar examen" : "Schedule Exam",
      sub: es ? "Elige tu fecha" : "Pick your exam date",
      testId: "resource-schedule",
    },
  ];

  return (
    <Card className="h-full" data-testid="card-study-resources">
      <CardContent className="p-5">
        <div className="flex items-center gap-2.5">
          <IconTile icon={BookOpen} tone="blue" />
          <h2 className="text-base font-semibold">{es ? "Recursos" : "Study Resources"}</h2>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {resources.map((r) => (
            <Link
              key={r.testId}
              href={r.href}
              className="flex min-h-11 items-center gap-3 rounded-xl border p-3.5 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              data-testid={r.testId}
            >
              <IconTile icon={r.icon} tone={r.tone} size="md" />
              <span className="min-w-0">
                <span className="block text-base font-medium">{r.title}</span>
                <span className="block text-sm text-muted-foreground">{r.sub}</span>
              </span>
            </Link>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

/**
 * Conversion card. Free students only, always last on the page.
 *
 * No countdowns, no scarcity, no invented discounts - the value proposition is
 * the product, and manufactured urgency on an exam-prep purchase would be
 * both dishonest and counterproductive.
 */
export function UpgradeCard() {
  const { i18n } = useTranslation();
  const es = i18n.language === "es";

  return (
    <Card
      className="relative h-full overflow-hidden border-amber-500/30 bg-amber-500/[0.07]"
      data-testid="card-upgrade"
    >
      <CardContent className="flex h-full flex-col p-5">
        <div className="flex flex-wrap items-center gap-2">
          <Crown
            className="h-5 w-5 shrink-0 text-amber-600 dark:text-amber-400"
            aria-hidden="true"
          />
          <h2 className="text-base font-semibold">
            {es ? "Hazte Premium" : "Go Premium"}
          </h2>
          {/* A factual descriptor of the plan, not a countdown or a discount:
              manufactured urgency on an exam purchase would be dishonest. */}
          <Badge
            variant="secondary"
            className="border-amber-500/25 bg-amber-500/15 text-xs text-amber-700 dark:text-amber-400"
          >
            {es ? "Acceso completo" : "Full Access"}
          </Badge>
        </div>

        <p className="mt-2.5 max-w-[24ch] text-sm text-muted-foreground sm:max-w-[30ch]">
          {es
            ? "Práctica ilimitada, análisis avanzado y orientación personalizada."
            : "Unlock unlimited practice, advanced analytics, and personalised coaching."}
        </p>

        <Button asChild className="mt-4 w-full sm:w-auto sm:self-start" data-testid="button-view-plans">
          <Link href="/pricing" onClick={() => trackEvent("upgrade_clicked")}>
            {es ? "Mejorar ahora" : "Upgrade Now"}
          </Link>
        </Button>

        {/* Sits behind the text and is hidden on narrow cards, where it would
            crowd the copy rather than decorate it. */}
        <PremiumIllustration
          size={120}
          className="pointer-events-none absolute bottom-1 right-1 hidden opacity-95 sm:block"
        />
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

export interface WeeklyStats {
  questionsAnswered: number;
  accuracy: number;
  topicsImproved: number;
}

/**
 * This week's activity.
 *
 * Only rendered once the caller has confirmed there is enough history for the
 * numbers to mean something - an empty summary is worse than no summary.
 */
export function WeeklySummaryCard({ stats }: { stats: WeeklyStats }) {
  const { i18n } = useTranslation();
  const es = i18n.language === "es";

  const items = [
    {
      value: String(stats.questionsAnswered),
      label: es ? "preguntas respondidas" : "questions answered",
      testId: "stat-questions",
    },
    { value: `${stats.accuracy}%`, label: es ? "precisión" : "accuracy", testId: "stat-accuracy" },
    {
      value: String(stats.topicsImproved),
      label: es ? "temas mejorados" : "topics improved",
      testId: "stat-improved",
    },
  ];

  return (
    <Card data-testid="card-weekly-summary">
      <CardContent className="p-5">
        <h2 className="flex items-center gap-2 text-base font-semibold">
          <TrendingUp className="h-4 w-4 text-primary" aria-hidden="true" />
          {es ? "Esta semana" : "This Week"}
        </h2>
        <dl className="mt-3 grid grid-cols-3 gap-3">
          {items.map((i) => (
            <div key={i.testId} className="min-w-0">
              <dd className="text-xl font-bold" data-testid={i.testId}>{i.value}</dd>
              <dt className="text-xs text-muted-foreground">{i.label}</dt>
            </div>
          ))}
        </dl>
      </CardContent>
    </Card>
  );
}

/* ------------------------------------------------------------------ */

/** Small Alexi lockup used in card headers. */
export function AlexiBadge({ className }: { className?: string }) {
  return (
    <span className={className}>
      <AlexiMark size={20} className="text-primary" />
    </span>
  );
}
