/**
 * The tutor's memory window.
 *
 * Two properties matter. Cost: every remembered turn is tokens on every
 * later call, so the window has to be bounded by characters and not just by
 * turn count - six short turns and six long ones are very different bills.
 * And order: a follow-up refers to what was just said, so when the budget
 * runs out it is the oldest turns that go.
 */
import { describe, it, expect } from "vitest";
import {
  selectRecentTurns,
  MAX_REMEMBERED_TURNS,
  MAX_REMEMBERED_CHARS,
  MAX_TURN_CHARS,
  type TutorTurn,
} from "../alexi/conversationMemory";

const turn = (text: string, minutesAgo: number, role: "student" | "assistant" = "student"): TutorTurn => ({
  role,
  text,
  createdAt: new Date(Date.UTC(2026, 0, 1, 12, 0) - minutesAgo * 60_000),
});

describe("selectRecentTurns", () => {
  it("returns nothing for an empty history", () => {
    expect(selectRecentTurns([])).toEqual({ turns: [], dropped: 0 });
  });

  it("keeps a short conversation whole, oldest first", () => {
    const history = [turn("second", 1), turn("first", 2)];
    const { turns } = selectRecentTurns(history);
    expect(turns.map((t) => t.text)).toEqual(["first", "second"]);
  });

  it("sorts rather than trusting the order it was handed", () => {
    const history = [turn("third", 1), turn("first", 3), turn("second", 2)];
    expect(selectRecentTurns(history).turns.map((t) => t.text)).toEqual([
      "first",
      "second",
      "third",
    ]);
  });

  it("drops the oldest turns when there are too many", () => {
    // The newest exchange is what a follow-up question refers to.
    const history = Array.from({ length: MAX_REMEMBERED_TURNS + 3 }, (_, i) =>
      turn(`turn-${i}`, 20 - i),
    );
    const { turns, dropped } = selectRecentTurns(history);

    expect(turns).toHaveLength(MAX_REMEMBERED_TURNS);
    expect(dropped).toBe(3);
    // turn-0 is the oldest and should be gone; the last one must survive.
    expect(turns.map((t) => t.text)).not.toContain("turn-0");
    expect(turns[turns.length - 1].text).toBe(`turn-${MAX_REMEMBERED_TURNS + 2}`);
  });

  it("stops on the character budget even when the turn count allows more", () => {
    // The budget that actually binds: three turns, well under the count cap,
    // that would still be an expensive prompt.
    const long = "x".repeat(MAX_TURN_CHARS);
    const history = [turn(long, 3), turn(long, 2), turn(long, 1)];
    const { turns } = selectRecentTurns(history);

    const total = turns.reduce((sum, t) => sum + t.text.length, 0);
    expect(total).toBeLessThanOrEqual(MAX_REMEMBERED_CHARS);
    expect(turns.length).toBeLessThan(history.length);
  });

  it("keeps the most recent turn when the budget is tight", () => {
    const long = "x".repeat(MAX_TURN_CHARS);
    const { turns } = selectRecentTurns([turn(long, 2), turn("the latest", 1)]);
    expect(turns[turns.length - 1].text).toBe("the latest");
  });

  it("drops an oversized turn whole rather than truncating it", () => {
    // Half a thought is worse to reason about than none, and an enormous
    // turn is a paste or a bug rather than a question.
    const huge = "y".repeat(MAX_TURN_CHARS + 1);
    const { turns } = selectRecentTurns([turn(huge, 2), turn("normal", 1)]);
    expect(turns.map((t) => t.text)).toEqual(["normal"]);
  });

  it("ignores empty and whitespace-only turns", () => {
    const { turns } = selectRecentTurns([turn("", 3), turn("   ", 2), turn("real", 1)]);
    expect(turns.map((t) => t.text)).toEqual(["real"]);
  });

  it("trims the text it keeps", () => {
    const { turns } = selectRecentTurns([turn("  padded  ", 1)]);
    expect(turns[0].text).toBe("padded");
  });

  it("keeps both sides of the conversation", () => {
    const history = [turn("why?", 2, "student"), turn("because", 1, "assistant")];
    expect(selectRecentTurns(history).turns.map((t) => t.role)).toEqual([
      "student",
      "assistant",
    ]);
  });

  it("does not throw on an unparseable timestamp", () => {
    const broken: TutorTurn = { role: "student", text: "odd", createdAt: "not a date" };
    expect(() => selectRecentTurns([broken, turn("fine", 1)])).not.toThrow();
    expect(selectRecentTurns([broken, turn("fine", 1)]).turns).toHaveLength(2);
  });

  it("honours explicit limits over the defaults", () => {
    const history = [turn("a", 3), turn("b", 2), turn("c", 1)];
    expect(selectRecentTurns(history, { maxTurns: 1 }).turns.map((t) => t.text)).toEqual(["c"]);
  });
});
