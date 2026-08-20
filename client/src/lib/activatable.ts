/**
 * Making a whole card or row clickable without locking out the keyboard.
 *
 * WHAT WENT WRONG
 *
 * The study guide's topic cards were a `<div>` with an `onClick` and a
 * `cursor-pointer` class. They looked like buttons, they behaved like buttons
 * under a mouse, and they were invisible to a keyboard: no role, no tab stop,
 * no key handler. Pressing Tab sixty times on that page never reached one, so
 * a student who does not use a mouse could not open a single quiz. The same
 * pattern was in the exam review panel, where it stopped a student jumping
 * back to a question they had flagged.
 *
 * WHY A HELPER RATHER THAN FIXING TWO FILES
 *
 * "Add role and tabIndex" is easy to say and easy to get subtly wrong. A
 * button responds to BOTH Enter and Space; Space also scrolls the page unless
 * that is prevented; and a card containing its own link or button must not
 * fire twice when that inner control is used. Getting all three right once and
 * reusing it beats getting them mostly right in each new place.
 *
 * A test walks the client source and fails on any `onClick` that is not
 * focusable, so the next card built this way is caught before it ships rather
 * than by a student who cannot use it.
 *
 * WHEN NOT TO USE THIS
 *
 * If the thing navigates, it is a link - use one, so it opens in a new tab and
 * shows its destination in the status bar. This is for a card that performs an
 * action in place.
 */

import type { KeyboardEvent, MouseEvent } from "react";

export interface ActivatableOptions {
  /**
   * What a screen reader should announce.
   *
   * Worth setting on a card: without it the accessible name is every word the
   * card contains, which for a topic card is the title, the description, a
   * percentage and a progress count read as one sentence.
   */
  label?: string;
  disabled?: boolean;
}

/** Elements that handle their own activation and must not trigger the card. */
const INTERACTIVE = "a, button, input, select, textarea, [role='button'], [role='link']";

/**
 * Props that turn any element into a real, keyboard-operable control.
 *
 * Spread onto the element: `<Card {...activatable(open, { label })}>`.
 */
export function activatable(
  onActivate: () => void,
  options: ActivatableOptions = {},
) {
  const { label, disabled = false } = options;

  /**
   * Did this event come from a control INSIDE the card, rather than the card?
   *
   * `closest()` matches the element it starts from, and the card itself now
   * carries role="button" - so a naive check treated every activation of the
   * card as coming from a nested control and swallowed it. The card was
   * focusable, announced correctly, and completely dead to Enter and Space.
   * Only a real key press in a real browser showed it.
   *
   * The boundary is the element the handler is attached to: an interactive
   * ancestor that IS that element is the card doing its job.
   */
  const fromInnerControl = (event: {
    target: EventTarget | null;
    currentTarget: EventTarget | null;
  }): boolean => {
    // Duck-typed rather than `instanceof Element`, which is false for a node
    // from another document - and unavailable in a plain Node test, where
    // these handlers are worth checking without booting a DOM.
    const target = event.target as { closest?: (selector: string) => unknown } | null;
    if (typeof target?.closest !== "function") return false;

    const control = target.closest(INTERACTIVE);
    return Boolean(control) && control !== event.currentTarget;
  };

  return {
    role: "button" as const,
    tabIndex: disabled ? -1 : 0,
    "aria-label": label,
    "aria-disabled": disabled || undefined,
    onClick: (event: MouseEvent) => {
      if (disabled || fromInnerControl(event)) return;
      onActivate();
    },
    onKeyDown: (event: KeyboardEvent) => {
      if (disabled) return;
      if (event.key !== "Enter" && event.key !== " ") return;
      if (fromInnerControl(event)) return;
      // Space scrolls the page by default, which is the wrong thing to do to
      // someone who just pressed it to open a quiz.
      event.preventDefault();
      onActivate();
    },
  };
}
