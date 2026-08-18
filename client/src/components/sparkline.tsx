/**
 * Sparkline - a trend line with no axes, sized to sit inside a stat tile.
 *
 * Deliberately minimal. A sparkline's job is to show shape: rising, falling,
 * volatile. The number beside it carries the value, so this carries no scale,
 * no gridlines and no labels that would compete with it.
 *
 * Honest about small samples: with fewer than two points there is no trend to
 * draw and it renders nothing rather than a flat line, which would read as
 * "steady" when the truth is "not enough data".
 *
 * Decorative by default. The tile's number and caption already state the
 * value; a caller with something extra to say passes `label`.
 */

import { useId } from "react";
import { cn } from "@/lib/utils";

interface Props {
  /** Oldest first. */
  values: number[];
  width?: number;
  height?: number;
  className?: string;
  /** Accessible description. Omit to keep the line decorative. */
  label?: string;
}

/** Below this there is no shape to show. */
const MIN_POINTS = 2;

export function Sparkline({ values, width = 72, height = 28, className, label }: Props) {
  const uid = useId().replace(/:/g, "");
  const fillId = `spark-${uid}`;

  if (values.length < MIN_POINTS) return null;

  const min = Math.min(...values);
  const max = Math.max(...values);
  // A flat series would divide by zero; draw it down the middle instead.
  const span = max - min || 1;
  const pad = 2;
  const stepX = (width - pad * 2) / (values.length - 1);

  const points = values.map((v, i) => {
    const x = pad + i * stepX;
    const y = max === min
      ? height / 2
      : pad + (1 - (v - min) / span) * (height - pad * 2);
    return [x, y] as const;
  });

  const line = points.map(([x, y], i) => `${i === 0 ? "M" : "L"}${x.toFixed(1)} ${y.toFixed(1)}`).join(" ");
  const area = `${line} L${points[points.length - 1][0].toFixed(1)} ${height} L${points[0][0].toFixed(1)} ${height} Z`;

  // Direction drives the colour, and the caller's number states the value, so
  // colour is never the only thing carrying meaning here.
  const rising = values[values.length - 1] >= values[0];
  const stroke = rising ? "#10b981" : "#f43f5e";

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      fill="none"
      className={cn("shrink-0 overflow-visible", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.22" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>

      <path d={area} fill={`url(#${fillId})`} />
      <path d={line} stroke={stroke} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
      {/* Latest point marked, so the eye lands on "now" rather than the middle. */}
      <circle
        cx={points[points.length - 1][0]}
        cy={points[points.length - 1][1]}
        r="2.4"
        fill={stroke}
      />
    </svg>
  );
}
