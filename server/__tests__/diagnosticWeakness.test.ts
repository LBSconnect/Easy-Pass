import { describe, it, expect } from "vitest";
import { weakTopics, MAX_WEAK_TOPICS, type TopicNameLookup } from "@shared/diagnosticWeakness";

/** Names every slug, so tests exercise ranking rather than lookup failure. */
const names: TopicNameLookup = (id) => ({ nameEn: `EN ${id}`, nameEs: `ES ${id}` });

const asked = (topic: string, correct: boolean) => ({ topic, correct });

describe("weakTopics", () => {
  it("reports a topic the student missed questions on", () => {
    const result = weakTopics([asked("li_policies", false), asked("li_policies", true)], names);

    expect(result).toEqual([
      { id: "li_policies", nameEn: "EN li_policies", nameEs: "ES li_policies", missed: 1, asked: 2 },
    ]);
  });

  it("says nothing about a topic they got right", () => {
    expect(weakTopics([asked("li_annuities", true), asked("li_annuities", true)], names)).toEqual([]);
  });

  it("counts only the questions actually asked on that topic", () => {
    const [area] = weakTopics(
      [asked("li_health", false), asked("li_health", false), asked("li_health", true)],
      names,
    );

    // "missed 2 of 3" has to be true of this attempt, not of the topic at large.
    expect(area).toMatchObject({ missed: 2, asked: 3 });
  });

  it("puts the topic they missed most first", () => {
    const result = weakTopics(
      [
        asked("li_annuities", false),
        asked("li_policies", false),
        asked("li_policies", false),
        asked("li_policies", false),
      ],
      names,
    );

    expect(result.map((area) => area.id)).toEqual(["li_policies", "li_annuities"]);
  });

  it("breaks a tie on how much of the topic was missed", () => {
    // Both missed two. One of them was two out of two.
    const result = weakTopics(
      [
        asked("li_health", false),
        asked("li_health", false),
        asked("li_regulations", false),
        asked("li_regulations", false),
        asked("li_regulations", true),
        asked("li_regulations", true),
      ],
      names,
    );

    expect(result.map((area) => area.id)).toEqual(["li_health", "li_regulations"]);
  });

  it("orders the same result the same way every time", () => {
    // Identical on both ranking keys, so only the id separates them. Without
    // that last tie-break the order would follow insertion and could differ
    // between two renders of one score.
    const outcomes = [asked("b_topic", false), asked("a_topic", false)];

    expect(weakTopics(outcomes, names).map((a) => a.id)).toEqual(["a_topic", "b_topic"]);
    expect(weakTopics(outcomes.slice().reverse(), names).map((a) => a.id)).toEqual(["a_topic", "b_topic"]);
  });

  it("caps the list so the advice stays actionable", () => {
    const outcomes = ["t1", "t2", "t3", "t4", "t5"].map((topic) => asked(topic, false));

    expect(weakTopics(outcomes, names)).toHaveLength(MAX_WEAK_TOPICS);
  });

  it("drops a question that carries no topic rather than attributing it", () => {
    const result = weakTopics([{ topic: null, correct: false }, asked("li_policies", false)], names);

    expect(result.map((area) => area.id)).toEqual(["li_policies"]);
  });

  it("drops a topic the config cannot name, rather than showing a raw slug", () => {
    const onlyKnown: TopicNameLookup = (id) =>
      id === "li_policies" ? { nameEn: "Policy provisions", nameEs: "Provisiones" } : undefined;

    const result = weakTopics(
      [asked("li_policies", false), asked("some_retired_slug", false)],
      onlyKnown,
    );

    expect(result.map((area) => area.nameEn)).toEqual(["Policy provisions"]);
  });

  it("returns nothing for a perfect attempt", () => {
    expect(weakTopics([asked("li_policies", true), asked("li_health", true)], names)).toEqual([]);
  });

  it("returns nothing when asked for nothing", () => {
    expect(weakTopics([asked("li_policies", false)], names, 0)).toEqual([]);
    expect(weakTopics([], names)).toEqual([]);
  });
});
