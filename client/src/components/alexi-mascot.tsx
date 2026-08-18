/**
 * Alexi's mascot illustration.
 *
 * The approved concept leads both the dashboard and the exams page with a
 * friendly robot character rather than an icon, so this is that character.
 * Drawn here as inline SVG rather than shipped as a raster: it stays sharp at
 * every size, costs no extra request, and adapts to dark mode - none of which
 * a PNG would do.
 *
 * Original artwork. The silhouette (squircle head, single visor, floating
 * body, no legs) is drawn to be recognisably ours and is deliberately not
 * modelled on any existing assistant's mark.
 *
 * Decorative by default: it repeats what the adjacent heading already says, so
 * it is hidden from screen readers unless a caller passes an explicit `label`.
 *
 * The gradient ids are suffixed per instance. Two mascots on one page with
 * shared ids would make the second one inherit the first one's fills.
 */

import { useId } from "react";
import { cn } from "@/lib/utils";

interface Props {
  size?: number;
  /** Waving arm. Off for the small, calmer placements. */
  waving?: boolean;
  /** Sparkles around the character. */
  sparkles?: boolean;
  /** Accessible name. Omit to keep the illustration decorative. */
  label?: string;
  /**
   * Bring the character to life: a slow float, a wave, blinking eyes and a
   * pulsing chest light.
   *
   * Off by default. Motion belongs on a marketing page where the mascot is the
   * subject, not beside a heading a student is trying to read - and never on
   * the exam runner. Every animation here is disabled under
   * prefers-reduced-motion, which is not a nicety: for some people this kind of
   * movement causes real nausea and headaches.
   */
  animated?: boolean;
  className?: string;
}

export function AlexiMascot({
  size = 128,
  waving = true,
  sparkles = true,
  label,
  animated = false,
  className,
}: Props) {
  const uid = useId().replace(/:/g, "");
  const id = (name: string) => `alexi-${name}-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 160 160"
      fill="none"
      className={cn("shrink-0", className)}
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      <defs>
        {/* Soft halo the character floats on. */}
        <radialGradient id={id("halo")} cx="50%" cy="46%" r="50%">
          <stop offset="0%" stopColor="#DCEAFE" stopOpacity="0.95" />
          <stop offset="65%" stopColor="#DCEAFE" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#DCEAFE" stopOpacity="0" />
        </radialGradient>

        {/* Shell: near-white with a cool shadow so it reads as three-dimensional. */}
        <linearGradient id={id("shell")} x1="30%" y1="8%" x2="72%" y2="100%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="58%" stopColor="#F4F8FE" />
          <stop offset="100%" stopColor="#DCE6F5" />
        </linearGradient>

        {/* Visor glass. */}
        <linearGradient id={id("visor")} x1="20%" y1="0%" x2="85%" y2="100%">
          <stop offset="0%" stopColor="#2B4A7D" />
          <stop offset="100%" stopColor="#132C52" />
        </linearGradient>

        {/* Eye glow. */}
        <linearGradient id={id("eye")} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#7FD4FF" />
          <stop offset="100%" stopColor="#2E9BEA" />
        </linearGradient>
      </defs>

      {animated && (
        // Scoped to this instance so two mascots on a page cannot fight over
        // the same animation names. The reduced-motion block is the important
        // half: it stops every one of these dead.
        <style>{`
          @keyframes ${id("float")} { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-5px); } }
          @keyframes ${id("wave")}  { 0%,60%,100% { transform: rotate(0deg); } 70% { transform: rotate(-16deg); } 85% { transform: rotate(6deg); } }
          @keyframes ${id("blink")} { 0%,92%,100% { transform: scaleY(1); } 96% { transform: scaleY(0.1); } }
          @keyframes ${id("pulse")} { 0%,100% { opacity: 1; } 50% { opacity: 0.45; } }
          .${id("body")}  { animation: ${id("float")} 4s ease-in-out infinite; }
          .${id("arm")}   { animation: ${id("wave")} 3.2s ease-in-out infinite; transform-origin: 104px 97px; }
          .${id("eyes")}  { animation: ${id("blink")} 5.5s ease-in-out infinite; transform-origin: center 57px; }
          .${id("chest")} { animation: ${id("pulse")} 2.6s ease-in-out infinite; }
          @media (prefers-reduced-motion: reduce) {
            .${id("body")}, .${id("arm")}, .${id("eyes")}, .${id("chest")} { animation: none; }
          }
        `}</style>
      )}

      {sparkles && <circle cx="80" cy="76" r="72" fill={`url(#${id("halo")})`} />}

      {/* Ground shadow, keeping the character from floating without weight. */}
      <ellipse cx="80" cy="137" rx="31" ry="6.5" fill="#1E3A6B" opacity="0.13" />

      <g className={animated ? id("body") : undefined}>
      {/* --- body ---------------------------------------------------------- */}
      <path
        d="M80 92c15.6 0 27 9.4 29.4 23.2 1 5.6-3.3 10.8-9 10.8H59.6c-5.7 0-10-5.2-9-10.8C53 101.4 64.4 92 80 92Z"
        fill={`url(#${id("shell")})`}
        stroke="#C3D4EA"
        strokeWidth="1.6"
      />
      {/* Chest light - the "thinking" indicator. */}
      <circle cx="80" cy="111" r="6.4" fill="#BBDCF7" />
      <circle
        cx="80" cy="111" r="3.4"
        fill={`url(#${id("eye")})`}
        className={animated ? id("chest") : undefined}
      />

      {/* --- arms ---------------------------------------------------------- */}
      {/* Resting arm. */}
      <path
        d="M56 99c-6.4 2.6-10.6 7.2-12.4 13.6"
        stroke="#C3D4EA"
        strokeWidth="7.5"
        strokeLinecap="round"
      />
      <circle cx="42.6" cy="114.6" r="6.6" fill={`url(#${id("shell")})`} stroke="#C3D4EA" strokeWidth="1.6" />

      {waving ? (
        <g className={animated ? id("arm") : undefined}>
          {/* Raised waving arm. */}
          <path
            d="M104 97c8.4-1.6 15.2-6.8 19.2-15.2"
            stroke="#C3D4EA"
            strokeWidth="7.5"
            strokeLinecap="round"
          />
          <g>
            {/* Open hand: palm plus three suggested fingers. */}
            <circle cx="127.4" cy="75.4" r="7.8" fill={`url(#${id("shell")})`} stroke="#C3D4EA" strokeWidth="1.6" />
            <path
              d="M123.6 68.6v-6.4M128.4 67.6v-7.8M132.8 69.8l2-5.8"
              stroke="#C3D4EA"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
          </g>
        </g>
      ) : (
        <>
          <path
            d="M104 99c6.4 2.6 10.6 7.2 12.4 13.6"
            stroke="#C3D4EA"
            strokeWidth="7.5"
            strokeLinecap="round"
          />
          <circle cx="117.4" cy="114.6" r="6.6" fill={`url(#${id("shell")})`} stroke="#C3D4EA" strokeWidth="1.6" />
        </>
      )}

      {/* --- antenna ------------------------------------------------------- */}
      <path d="M80 26v-9" stroke="#C3D4EA" strokeWidth="4.2" strokeLinecap="round" />
      <circle cx="80" cy="13.4" r="5.4" fill={`url(#${id("eye")})`} />
      <circle cx="80" cy="13.4" r="9.4" fill="#2E9BEA" opacity="0.16" />

      {/* --- head ---------------------------------------------------------- */}
      <rect
        x="42"
        y="25"
        width="76"
        height="66"
        rx="30"
        fill={`url(#${id("shell")})`}
        stroke="#C3D4EA"
        strokeWidth="1.8"
      />
      {/* Ear pods. */}
      <rect x="34.5" y="47" width="9" height="20" rx="4.5" fill="#C3D4EA" />
      <rect x="116.5" y="47" width="9" height="20" rx="4.5" fill="#C3D4EA" />

      {/* Visor. */}
      <rect x="53" y="40" width="54" height="35" rx="17.5" fill={`url(#${id("visor")})`} />
      {/* Glass highlight, top-left, so the visor reads as curved glass. */}
      <path
        d="M60 48.5c3.4-4.2 9-6.6 15.6-6.6 2 0 3.6 1.4 3.6 3.2s-1.6 3.2-3.6 3.2c-4.6 0-8.2 1.6-10.4 4.4-1.2 1.5-3.4 1.8-4.9.7-1.4-1.1-1.6-3.3-.3-4.9Z"
        fill="#FFFFFF"
        opacity="0.18"
      />

      {/* Eyes. */}
      <g className={animated ? id("eyes") : undefined}>
        <ellipse cx="70" cy="57.5" rx="5.6" ry="7" fill={`url(#${id("eye")})`} />
        <ellipse cx="90" cy="57.5" rx="5.6" ry="7" fill={`url(#${id("eye")})`} />
        <circle cx="71.8" cy="54.4" r="1.9" fill="#FFFFFF" opacity="0.85" />
        <circle cx="91.8" cy="54.4" r="1.9" fill="#FFFFFF" opacity="0.85" />
      </g>

      {/* Cheeks - the difference between friendly and clinical. */}
      <ellipse cx="58.5" cy="70" rx="4.6" ry="3" fill="#7FC4F5" opacity="0.4" />
      <ellipse cx="101.5" cy="70" rx="4.6" ry="3" fill="#7FC4F5" opacity="0.4" />
      </g>

      {sparkles && (
        <g fill="#F5B740">
          <path d="M28 34.5l1.75 4.6 4.6 1.75-4.6 1.75L28 47.2l-1.75-4.6-4.6-1.75 4.6-1.75Z" />
          <path d="M133 40.5l1.35 3.55 3.55 1.35-3.55 1.35L133 50.3l-1.35-3.55-3.55-1.35 3.55-1.35Z" opacity="0.75" />
          <path d="M120.5 25l1 2.6 2.6 1-2.6 1-1 2.6-1-2.6-2.6-1 2.6-1Z" opacity="0.6" />
        </g>
      )}
    </svg>
  );
}
