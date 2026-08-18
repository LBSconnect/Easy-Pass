/**
 * How each exam looks.
 *
 * The same icon-and-colour scheme was copy-pasted into the landing page, the
 * diagnostic, the study guide, the certificate, the exams hub and the pricing
 * page - six declarations of one fact. Predictably they drifted: the pricing
 * page ended up with a violet General Lines and an emerald Property &
 * Casualty, and the dashboard's onboarding had no colour at all, so the first
 * screen a new student sees taught them a colour code the rest of the app
 * then contradicted.
 *
 * One definition, used everywhere. The colours are the established ones -
 * blue, amber, rose, emerald - not a new palette.
 *
 * Colour is never the only carrier of meaning here: every place these are used
 * shows the exam's name in words beside the icon, so nothing is lost to a
 * student who cannot tell these hues apart.
 */

import { Home, Shield, Heart, FileText, type LucideIcon } from "lucide-react";
import type { ExamCategory } from "@shared/schema";

export interface ExamVisual {
  icon: LucideIcon;
  /** Tinted surface plus matching text, for icon tiles and selectable cards. */
  tint: string;
  /** Border to pair with `tint` on a bordered card. */
  border: string;
  /**
   * Text-only accent, for a number or a ring stroke on a light surface.
   *
   * Property & Casualty deliberately shifts from amber to orange here: amber
   * text on a white card is too pale to read comfortably, while the amber tint
   * behind an icon is fine. Kept as-is rather than "corrected" - it is a
   * legibility decision, not drift.
   */
  accent: string;
  /** Solid fill, for a primary button in the exam's colour. */
  solid: string;
  /** Two-stop gradient, for the certificate's printed header. */
  gradient: string;
  /** Faint gradient wash, for a card header that should not shout. */
  softGradient: string;
}

export const EXAM_VISUALS: Record<ExamCategory, ExamVisual> = {
  real_estate: {
    icon: Home,
    tint: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
    border: "border-blue-500/20",
    accent: "text-blue-600 dark:text-blue-400",
    solid: "bg-blue-600 text-white hover:bg-blue-700",
    gradient: "from-blue-600 to-blue-800",
    softGradient: "from-blue-500/20 to-blue-600/5",
  },
  property_casualty: {
    icon: Shield,
    tint: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
    border: "border-amber-500/20",
    accent: "text-orange-600 dark:text-orange-400",
    solid: "bg-orange-600 text-white hover:bg-orange-700",
    gradient: "from-amber-600 to-amber-800",
    softGradient: "from-amber-500/20 to-amber-600/5",
  },
  life_insurance: {
    icon: Heart,
    tint: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
    border: "border-rose-500/20",
    accent: "text-rose-600 dark:text-rose-400",
    solid: "bg-rose-600 text-white hover:bg-rose-700",
    gradient: "from-rose-600 to-rose-800",
    softGradient: "from-rose-500/20 to-rose-600/5",
  },
  general_lines: {
    icon: FileText,
    tint: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
    border: "border-emerald-500/20",
    accent: "text-emerald-600 dark:text-emerald-400",
    solid: "bg-emerald-600 text-white hover:bg-emerald-700",
    gradient: "from-emerald-600 to-emerald-800",
    softGradient: "from-emerald-500/20 to-emerald-600/5",
  },
};

/** Tint plus border, the combination most call sites want. */
export function examSurface(category: ExamCategory): string {
  const v = EXAM_VISUALS[category];
  return `${v.tint} ${v.border}`;
}

/**
 * Lookup that tolerates a category from outside the enum.
 *
 * Certificates and results carry a category string from the database, which
 * can outlive a rename. A neutral fallback beats an undefined dereference.
 */
export function examVisual(category: string | null | undefined): ExamVisual {
  return (
    EXAM_VISUALS[category as ExamCategory] ?? {
      icon: FileText,
      tint: "bg-muted text-muted-foreground",
      border: "border-border",
      accent: "text-muted-foreground",
      solid: "bg-slate-600 text-white hover:bg-slate-700",
      gradient: "from-slate-600 to-slate-800",
      softGradient: "from-muted/20 to-muted/5",
    }
  );
}
