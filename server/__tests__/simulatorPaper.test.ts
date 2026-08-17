import { describe, it, expect } from "vitest";
import { buildSimulatorPaper, groupByTopic, type PaperQuestion } from "../simulatorPaper";

function pool(spec: Record<string, number>): PaperQuestion[] {
  const out: PaperQuestion[] = [];
  for (const [topic, n] of Object.entries(spec)) {
    for (let i = 0; i < n; i++) out.push({ id: `${topic}-${i}`, topic });
  }
  return out;
}

const counts = (paper: PaperQuestion[]) => {
  const m: Record<string, number> = {};
  for (const q of paper) m[q.topic || "General"] = (m[q.topic || "General"] ?? 0) + 1;
  return m;
};

describe("groupByTopic", () => {
  it("buckets untopiced questions under General", () => {
    const grouped = groupByTopic([{ id: "a", topic: null }]);
    expect(grouped.get("General")).toHaveLength(1);
  });
});

describe("buildSimulatorPaper", () => {
  it("returns exactly the requested number of questions", () => {
    const paper = buildSimulatorPaper({
      pool: pool({ Law: 100, Property: 100 }),
      targetCount: 50,
      seed: 1,
    });

    expect(paper).toHaveLength(50);
  });

  it("weights topics by their share of the bank", () => {
    // Law is 75% of the bank, so it should be roughly 75% of the paper -
    // a plain random draw would only reach this on average, not reliably.
    const paper = buildSimulatorPaper({
      pool: pool({ Law: 300, Property: 100 }),
      targetCount: 40,
      seed: 7,
    });

    expect(counts(paper).Law).toBe(30);
    expect(counts(paper).Property).toBe(10);
  });

  it("honours explicit topic weights over the bank distribution", () => {
    // Property is a small part of the bank but half the exam.
    const paper = buildSimulatorPaper({
      pool: pool({ Law: 300, Property: 100 }),
      targetCount: 40,
      topicWeights: new Map([["Law", 50], ["Property", 50]]),
      seed: 3,
    });

    expect(counts(paper).Law).toBe(20);
    expect(counts(paper).Property).toBe(20);
  });

  it("allocates without drifting off the target through rounding", () => {
    // Three topics into 100 is 33.33 each; largest-remainder must still sum
    // to exactly 100 rather than 99.
    const paper = buildSimulatorPaper({
      pool: pool({ A: 100, B: 100, C: 100 }),
      targetCount: 100,
      seed: 11,
    });

    expect(paper).toHaveLength(100);
    const c = counts(paper);
    expect(c.A + c.B + c.C).toBe(100);
  });

  it("backfills from other topics when one is too thin to fill its share", () => {
    // Property is entitled to ~20 but only has 3 questions; the paper must
    // still be 40 long rather than coming up short.
    const paper = buildSimulatorPaper({
      pool: pool({ Law: 200, Property: 3 }),
      targetCount: 40,
      topicWeights: new Map([["Law", 50], ["Property", 50]]),
      seed: 5,
    });

    expect(paper).toHaveLength(40);
    expect(counts(paper).Property).toBe(3);
    expect(counts(paper).Law).toBe(37);
  });

  it("never repeats a question", () => {
    const paper = buildSimulatorPaper({
      pool: pool({ Law: 60, Property: 60 }),
      targetCount: 100,
      seed: 9,
    });

    expect(new Set(paper.map((q) => q.id)).size).toBe(paper.length);
  });

  it("caps at the pool size when the target exceeds it", () => {
    const paper = buildSimulatorPaper({
      pool: pool({ Law: 10 }),
      targetCount: 150,
      seed: 2,
    });

    expect(paper).toHaveLength(10);
  });

  it("is deterministic for a given seed", () => {
    const args = { pool: pool({ Law: 50, Property: 50 }), targetCount: 20, seed: 42 };
    const a = buildSimulatorPaper(args);
    const b = buildSimulatorPaper(args);

    expect(a.map((q) => q.id)).toEqual(b.map((q) => q.id));
  });

  it("produces a different paper for a different seed", () => {
    const base = { pool: pool({ Law: 50, Property: 50 }), targetCount: 20 };
    const a = buildSimulatorPaper({ ...base, seed: 1 });
    const b = buildSimulatorPaper({ ...base, seed: 2 });

    expect(a.map((q) => q.id)).not.toEqual(b.map((q) => q.id));
  });

  it("does not present questions grouped by topic", () => {
    // A paper ordered Law-then-Property would telegraph the structure and
    // feel nothing like exam day.
    const paper = buildSimulatorPaper({
      pool: pool({ Law: 50, Property: 50 }),
      targetCount: 40,
      seed: 4,
    });

    const topics = paper.map((q) => q.topic);
    const firstProperty = topics.indexOf("Property");
    const lastLaw = topics.lastIndexOf("Law");
    expect(firstProperty).toBeLessThan(lastLaw);
  });

  it("handles an empty pool", () => {
    expect(buildSimulatorPaper({ pool: [], targetCount: 50, seed: 1 })).toEqual([]);
  });

  it("returns nothing for a non-positive target", () => {
    expect(buildSimulatorPaper({ pool: pool({ Law: 10 }), targetCount: 0, seed: 1 })).toEqual([]);
  });

  it("handles a pool where every question is untopiced", () => {
    const paper = buildSimulatorPaper({
      pool: [{ id: "a", topic: null }, { id: "b", topic: null }],
      targetCount: 2,
      seed: 1,
    });

    expect(paper).toHaveLength(2);
  });
});
