/**
 * Nothing in the app responds to a mouse and ignores the keyboard.
 *
 * THE BUG THIS PREVENTS
 *
 * The study guide's topic cards were a `<div>` with an `onClick` and a
 * `cursor-pointer` class. Under a mouse they were indistinguishable from
 * buttons. To a keyboard they did not exist: no role, no tab stop, no key
 * handler. Sixty presses of Tab on that page never reached one, so a student
 * who does not use a mouse could not open a single quiz - on a site that
 * publishes an accessibility statement. The exam review panel had the same
 * pattern, blocking a return to a flagged question.
 *
 * WHY A SOURCE SCAN
 *
 * A browser test only checks the page it visits, and this is a shape mistake
 * that can appear on any page the moment someone makes a card clickable. This
 * reads every component at once, costs milliseconds, and runs in the fast unit
 * job - so the next one is caught before it ships rather than by a student.
 *
 * WHEN THIS FAILS
 *
 * Spread `activatable()` from client/src/lib/activatable.ts onto the element.
 * It supplies the role, the tab stop, Enter and Space handling, and stops a
 * nested link firing the card as well. If the thing navigates rather than
 * acting in place, use a link instead - that is better than either.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const CLIENT_SRC = path.resolve(__dirname, "../../client/src");

/**
 * Tags that are already keyboard-operable, or that render one.
 *
 * The Radix and shadcn wrappers here render a real button or menu item;
 * putting an onClick on them is correct and needs nothing added.
 */
const ALREADY_INTERACTIVE = new Set([
  "button", "a", "input", "select", "textarea", "label", "summary",
  "Button", "Link", "Checkbox", "Switch", "Toggle", "ToggleGroupItem",
  "DropdownMenuItem", "DropdownMenuCheckboxItem", "DropdownMenuRadioItem",
  "SelectItem", "TabsTrigger", "AccordionTrigger", "CommandItem",
  "AlertDialogAction", "AlertDialogCancel", "DialogClose", "SheetClose",
  "MenubarItem", "ContextMenuItem", "NavigationMenuLink", "PaginationLink",
  "CarouselPrevious", "CarouselNext", "SidebarMenuButton",
]);

function componentFiles(dir: string, found: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) componentFiles(full, found);
    else if (full.endsWith(".tsx")) found.push(full);
  }
  return found;
}

interface Offender {
  file: string;
  line: number;
  tag: string;
}

/**
 * Every JSX element that takes a click but cannot be focused.
 *
 * Opening tags are matched with their attributes, allowing one level of nested
 * braces so a handler written inline does not end the match early.
 */
function clickableButNotFocusable(): Offender[] {
  const offenders: Offender[] = [];
  const openingTag = /<([A-Za-z][\w.]*)((?:[^<>]|\{[^{}]*\})*?)>/gs;

  for (const file of componentFiles(CLIENT_SRC)) {
    const source = readFileSync(file, "utf8");
    for (const match of source.matchAll(openingTag)) {
      const [, tag, attributes] = match;
      if (!attributes.includes("onClick")) continue;
      if (ALREADY_INTERACTIVE.has(tag)) continue;

      // `activatable()` supplies all of these, so a spread of it counts.
      const focusable =
        attributes.includes("tabIndex") ||
        /role=["']button["']/.test(attributes) ||
        attributes.includes("activatable(");
      if (focusable) continue;

      offenders.push({
        file: path.relative(CLIENT_SRC, file),
        line: source.slice(0, match.index).split("\n").length,
        tag,
      });
    }
  }
  return offenders;
}

describe("clickable things are reachable by keyboard", () => {
  it("scans the components at all", () => {
    // A scan that silently matched nothing would pass while checking nothing.
    expect(componentFiles(CLIENT_SRC).length).toBeGreaterThan(30);
  });

  it("finds no element that takes a click but cannot be focused", () => {
    const offenders = clickableButNotFocusable().map(
      ({ file, line, tag }) => `${file}:${line} <${tag}>`,
    );

    expect(offenders).toEqual([]);
  });
});
