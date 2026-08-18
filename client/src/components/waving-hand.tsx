/**
 * Waving hand for the dashboard greeting.
 *
 * Drawn rather than typed as an emoji on purpose. The 👋 glyph renders as a
 * completely different illustration on every platform - Apple, Google, Windows
 * and most Linux font stacks all ship their own - and on a machine with no
 * colour emoji font it degrades to a black-and-white outline or a blank box.
 * A greeting that looks broken on one platform is not a greeting.
 *
 * Purely decorative: the heading beside it already says hello.
 */

import { useId } from "react";
import { cn } from "@/lib/utils";

export function WavingHand({ size = 40, className }: { size?: number; className?: string }) {
  const uid = useId().replace(/:/g, "");
  const skin = `wave-skin-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={skin} x1="20%" y1="0%" x2="80%" y2="100%">
          <stop offset="0%" stopColor="#FCC168" />
          <stop offset="100%" stopColor="#F0A03C" />
        </linearGradient>
      </defs>

      {/* Palm. */}
      <path
        d="M13.5 22.5c0-6 3.4-10.4 8.6-12.2 5.6-2 11.4.4 13.8 5.6 1.9 4.2 1.6 8-.7 12.4l-3.4 6.4c-1.9 3.6-5.3 5.8-9.2 5.8-5.6 0-9.6-3.7-10.4-9.2l-.5-3.6a24 24 0 0 1 .8-5.2Z"
        fill={`url(#${skin})`}
      />

      {/* Fingers, fanned. Rotated slightly to read as mid-wave. */}
      <g stroke={`url(#${skin})`} strokeLinecap="round" strokeWidth="5.2">
        <path d="M18.6 20.6 16.4 12" />
        <path d="M24.4 18.8 24 9.4" />
        <path d="M30 19.4 31.8 10.6" />
        <path d="M34.6 22.4 38 15.4" />
      </g>
      {/* Thumb. */}
      <path
        d="M14.2 26.4c-1.8-1.6-4.2-1.5-5.6.2-1.4 1.7-1 4.1.8 5.7l4.6 4-1.6-8.4a3 3 0 0 0 1.8-1.5Z"
        fill={`url(#${skin})`}
      />

      {/* Motion arcs - the difference between a raised hand and a wave. */}
      <g stroke="#F5B740" strokeLinecap="round" strokeWidth="2.4" opacity="0.75">
        <path d="M40.5 9.5a10 10 0 0 1 3.2 6" />
        <path d="M43.4 4.6a15 15 0 0 1 3 6.6" opacity="0.6" />
      </g>
    </svg>
  );
}
