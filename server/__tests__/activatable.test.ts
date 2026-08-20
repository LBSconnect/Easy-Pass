/**
 * Making a card keyboard-operable.
 *
 * The study guide's topic cards were a div with an onClick: focusable by
 * nobody, so a student without a mouse could not open a single quiz.
 *
 * The first attempt at the fix made them focusable and still dead. The card
 * was given role="button", and the guard that stops a nested link firing the
 * card used `closest()` - which matches the element it starts from - so every
 * activation of the card looked like it came from an inner control and was
 * swallowed. It announced correctly, took focus correctly, and did nothing.
 * These tests pin both halves: the card fires, the inner control does not.
 */
import { describe, it, expect, vi } from "vitest";
import { activatable } from "../../client/src/lib/activatable";

/** A stand-in for the DOM shapes the handlers actually read. */
function element(selectorMatches: string[] = []): any {
  const el: any = {
    matches: (sel: string) => selectorMatches.some((s) => sel.includes(s)),
  };
  return el;
}

/** target.closest(...) resolves to `control`; currentTarget is the card. */
function event(card: any, control: any | null, key?: string) {
  return {
    target: { closest: () => control },
    currentTarget: card,
    key,
    preventDefault: vi.fn(),
  } as any;
}

describe("activatable", () => {
  it("makes the element a real, focusable control", () => {
    const props = activatable(() => {}, { label: "Start Quiz: Contracts" });

    expect(props.role).toBe("button");
    expect(props.tabIndex).toBe(0);
    expect(props["aria-label"]).toBe("Start Quiz: Contracts");
  });

  it("fires on click", () => {
    const open = vi.fn();
    const card = element();
    activatable(open).onClick(event(card, card));

    expect(open).toHaveBeenCalledTimes(1);
  });

  it("fires on Enter", () => {
    const open = vi.fn();
    const card = element();
    activatable(open).onKeyDown(event(card, card, "Enter"));

    expect(open).toHaveBeenCalledTimes(1);
  });

  it("fires on Space, and stops the page scrolling", () => {
    // Space scrolls by default, which is the wrong thing to do to someone who
    // just pressed it to open a quiz.
    const open = vi.fn();
    const card = element();
    const e = event(card, card, " ");
    activatable(open).onKeyDown(e);

    expect(open).toHaveBeenCalledTimes(1);
    expect(e.preventDefault).toHaveBeenCalled();
  });

  it("is not swallowed by its own role", () => {
    // The regression. The card carries role="button", and closest() matches
    // the element it starts from - so the guard below must compare against the
    // element the handler is on, not merely find an interactive ancestor.
    const open = vi.fn();
    const card = element(["[role='button']"]);
    activatable(open).onKeyDown(event(card, card, "Enter"));
    activatable(open).onClick(event(card, card));

    expect(open).toHaveBeenCalledTimes(2);
  });

  it("leaves a link inside the card to do its own job", () => {
    // Otherwise one press both follows the link and opens the card.
    const open = vi.fn();
    const card = element();
    const innerLink = element();
    activatable(open).onClick(event(card, innerLink));
    activatable(open).onKeyDown(event(card, innerLink, "Enter"));

    expect(open).not.toHaveBeenCalled();
  });

  it("ignores keys that are not activation keys", () => {
    const open = vi.fn();
    const card = element();
    for (const key of ["Tab", "a", "ArrowDown", "Escape"]) {
      activatable(open).onKeyDown(event(card, card, key));
    }

    expect(open).not.toHaveBeenCalled();
  });

  it("goes quiet when disabled, and leaves the tab order", () => {
    const open = vi.fn();
    const card = element();
    const props = activatable(open, { disabled: true });
    props.onClick(event(card, card));
    props.onKeyDown(event(card, card, "Enter"));

    expect(open).not.toHaveBeenCalled();
    expect(props.tabIndex).toBe(-1);
    expect(props["aria-disabled"]).toBe(true);
  });
});
