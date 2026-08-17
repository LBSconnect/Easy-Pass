/**
 * Alexi's visual mark.
 *
 * Original to MyEasyPass. Deliberately NOT a robot face or a voice-assistant
 * orb - the brief was explicit about not mimicking Amazon Alexa, and a cartoon
 * robot would undercut a product people trust with a professional licence.
 *
 * The motif is a compass rose crossed with a study spark: Alexi's job is to
 * point at what to study next. It reads as a considered brand mark at 24px and
 * still holds together at 64px.
 *
 * Uses currentColor so it inherits the surrounding text colour and works on
 * both themes without a second asset.
 */

import { cn } from "@/lib/utils";

interface Props {
  size?: number;
  className?: string;
}

export function AlexiMark({ size = 32, className }: Props) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      className={cn("shrink-0", className)}
      aria-hidden="true"
      focusable="false"
    >
      {/* Soft disc so the mark holds its shape on any card background. */}
      <circle cx="16" cy="16" r="15" className="fill-current opacity-10" />

      {/* Compass needle - the "what to study next" pointer. */}
      <path
        d="M16 7.5 L19.1 14.2 L16 16 L12.9 14.2 Z"
        className="fill-current"
      />
      <path
        d="M16 24.5 L12.9 17.8 L16 16 L19.1 17.8 Z"
        className="fill-current opacity-45"
      />

      {/* Study spark, offset so it reads as a highlight rather than a second focal point. */}
      <path
        d="M24.5 8.2 L25.3 10.4 L27.5 11.2 L25.3 12 L24.5 14.2 L23.7 12 L21.5 11.2 L23.7 10.4 Z"
        className="fill-current"
      />
    </svg>
  );
}
