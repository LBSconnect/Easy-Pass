/**
 * Circular readiness indicator.
 *
 * Shared by the dashboard score card and the per-exam cards on the exams page.
 *
 * Accessibility: the number is rendered as text inside the ring and the ring
 * carries an explicit role and value. Colour reinforces the band, it never
 * carries it alone - a student with a colour vision deficiency reads the same
 * information from the digits and the label.
 */

import { cn } from "@/lib/utils";

interface Props {
  /** 0-100. Null renders an empty ring rather than a misleading zero. */
  value: number | null;
  size?: number;
  strokeWidth?: number;
  /** Small caption under the number, e.g. "Ready" or "/100". */
  caption?: string;
  className?: string;
  /** Accessible name. Required - the ring is meaningless to a screen reader without it. */
  label: string;
}

/** Band colours. Text and caption always carry the same meaning. */
function toneFor(value: number | null): string {
  if (value === null) return "text-muted-foreground";
  if (value >= 85) return "text-emerald-600 dark:text-emerald-400";
  if (value >= 70) return "text-blue-600 dark:text-blue-400";
  if (value >= 60) return "text-amber-600 dark:text-amber-400";
  return "text-rose-600 dark:text-rose-400";
}

export function ReadinessRing({
  value,
  size = 88,
  strokeWidth = 8,
  caption,
  className,
  label,
}: Props) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clamped = value === null ? 0 : Math.min(100, Math.max(0, value));
  const dash = (clamped / 100) * circumference;

  return (
    <div
      className={cn("relative shrink-0", className)}
      style={{ width: size, height: size }}
      role="img"
      aria-label={value === null ? `${label}: not calculated yet` : `${label}: ${clamped} out of 100`}
    >
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          strokeWidth={strokeWidth}
          className="stroke-muted"
        />
        {value !== null && (
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={`${dash} ${circumference - dash}`}
            className={cn("stroke-current transition-[stroke-dasharray] duration-500", toneFor(value))}
          />
        )}
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
        <span className={cn("font-bold leading-none", toneFor(value))} style={{ fontSize: size * 0.28 }}>
          {value === null ? "—" : clamped}
        </span>
        {caption && (
          <span className="mt-0.5 text-muted-foreground" style={{ fontSize: size * 0.12 }}>
            {caption}
          </span>
        )}
      </div>
    </div>
  );
}
