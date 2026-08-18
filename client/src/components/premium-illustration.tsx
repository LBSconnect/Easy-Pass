/**
 * Go Premium illustration - a cut gem on a plinth.
 *
 * The upgrade card in the approved concept carries an illustration rather than
 * an icon, and this is it. Inline SVG for the same reasons as the mascot:
 * crisp at any size, no extra request, one asset for both themes.
 *
 * Deliberately just a gem. No badges, no percentages, no "limited time" ribbon
 * - the upgrade card sells the product, and manufactured urgency on an exam
 * purchase would be dishonest.
 *
 * Ids are per-instance so a second copy on the page cannot steal the fills.
 */

import { useId } from "react";
import { cn } from "@/lib/utils";

interface Props {
  size?: number;
  className?: string;
}

export function PremiumIllustration({ size = 120, className }: Props) {
  const uid = useId().replace(/:/g, "");
  const id = (name: string) => `gem-${name}-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 120 120"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        {/* Crown facets, lit from the upper left. */}
        <linearGradient id={id("light")} x1="18%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#8FC7FA" />
          <stop offset="100%" stopColor="#4E9BF0" />
        </linearGradient>
        <linearGradient id={id("mid")} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#4E9BF0" />
          <stop offset="100%" stopColor="#2B6FD4" />
        </linearGradient>
        {/* Pavilion - the shaded underside that gives the gem depth. */}
        <linearGradient id={id("deep")} x1="50%" y1="0%" x2="50%" y2="100%">
          <stop offset="0%" stopColor="#3D86E4" />
          <stop offset="100%" stopColor="#1D4FA8" />
        </linearGradient>
        <linearGradient id={id("plinth")} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#CBDFF8" />
          <stop offset="100%" stopColor="#9DBFE8" />
        </linearGradient>
      </defs>

      {/* Plinth. Ellipse top plus a short body reads as a cylinder. */}
      <ellipse cx="60" cy="100" rx="30" ry="8.5" fill="#1D4FA8" opacity="0.12" />
      <path d="M32 92.5v-5a28 8 0 0 1 56 0v5a28 8 0 0 1-56 0Z" fill={`url(#${id("plinth")})`} />
      <ellipse cx="60" cy="87.5" rx="28" ry="8" fill="#E3EEFB" />

      {/* --- gem ------------------------------------------------------------ */}
      {/* Pavilion: the point below the girdle. */}
      <path d="M28 52h64L60 92 28 52Z" fill={`url(#${id("deep")})`} />
      {/* Left and right pavilion facets, so the underside is not one flat shape. */}
      <path d="M28 52h16l16 40L28 52Z" fill="#2B6FD4" opacity="0.55" />
      <path d="M92 52H76L60 92l32-40Z" fill="#12408F" opacity="0.35" />

      {/* Crown: table plus the sloping facets around it. */}
      <path d="M44 30h32l16 22H28l16-22Z" fill={`url(#${id("mid")})`} />
      <path d="M44 30h32l-6 22H50l-6-22Z" fill={`url(#${id("light")})`} />
      <path d="M44 30 28 52h16l6-22h-6Z" fill="#7FBCF7" opacity="0.75" />

      {/* Girdle - the bright line where crown meets pavilion. */}
      <path d="M28 52h64" stroke="#DCEBFC" strokeWidth="1.6" opacity="0.7" />
      {/* Table highlight. */}
      <path d="M49 33h20l-2.2 6H51.2L49 33Z" fill="#FFFFFF" opacity="0.4" />

      {/* Sparkles. */}
      <g fill="#F5B740">
        <path d="M22 26l2 5.2 5.2 2-5.2 2-2 5.2-2-5.2-5.2-2 5.2-2Z" />
        <path d="M100 36l1.4 3.7 3.7 1.4-3.7 1.4-1.4 3.7-1.4-3.7-3.7-1.4 3.7-1.4Z" opacity="0.8" />
        <path d="M97 66l1.1 2.9 2.9 1.1-2.9 1.1-1.1 2.9-1.1-2.9-2.9-1.1 2.9-1.1Z" opacity="0.6" />
        <path d="M20 62l1.1 2.9 2.9 1.1-2.9 1.1L20 71l-1.1-2.9-2.9-1.1 2.9-1.1Z" opacity="0.55" />
      </g>
    </svg>
  );
}
