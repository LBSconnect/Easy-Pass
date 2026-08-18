/**
 * Tinted icon tile.
 *
 * The approved dashboard concept sets every card heading and every list row
 * behind a small rounded square of tinted colour. Defining that once keeps the
 * corner radius, padding and tint strength identical everywhere instead of
 * being re-guessed per card - which is what makes a grid of cards look like
 * one designed page rather than eight separate ones.
 *
 * Tones are semantic where they can be. Where the concept uses colour purely
 * to tell adjacent rows apart, that is what `tone` is doing and nothing more:
 * no tile is ever the only carrier of meaning, so a student who cannot
 * distinguish these hues loses nothing.
 */

import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

export type TileTone =
  | "blue"
  | "violet"
  | "amber"
  | "emerald"
  | "rose"
  | "teal"
  | "slate";

const TONES: Record<TileTone, string> = {
  blue: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  violet: "bg-violet-500/10 text-violet-600 dark:text-violet-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  teal: "bg-teal-500/10 text-teal-600 dark:text-teal-400",
  slate: "bg-muted text-muted-foreground",
};

const SIZES = {
  sm: { box: "h-8 w-8 rounded-lg", icon: "h-4 w-4" },
  md: { box: "h-10 w-10 rounded-xl", icon: "h-5 w-5" },
  lg: { box: "h-12 w-12 rounded-xl", icon: "h-6 w-6" },
} as const;

interface Props {
  icon: LucideIcon;
  tone?: TileTone;
  size?: keyof typeof SIZES;
  /** Rounded-full instead of a squircle, for the score card's stat rows. */
  circle?: boolean;
  className?: string;
}

export function IconTile({
  icon: Icon,
  tone = "blue",
  size = "sm",
  circle = false,
  className,
}: Props) {
  const s = SIZES[size];
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center",
        s.box,
        circle && "rounded-full",
        TONES[tone],
        className,
      )}
    >
      <Icon className={s.icon} aria-hidden="true" />
    </span>
  );
}
