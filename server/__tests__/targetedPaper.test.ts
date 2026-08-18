/**
 * The targeted practice paper.
 *
 * Two things have to hold at once, and they pull against each other. The
 * paper must lean toward what the student is weakest on - that is the whole
 * point of it - while still being a full-length paper. A weighting scheme
 * that produces a short paper whenever a weak topic is thin has failed, and
 * so has one that quietly hands back the bank's own distribution.
 */
import { describe, it, expect } from "vitest";
import {
  buildTargetedPaper,
  topicMultiplier,
  DEFAULT_WEAK_BIAS,
  MAX_WEAK_BIAS,
} from "../alexi/targetedPaper";
import type { PaperQuestion } from "../simulatorPaper";

/** A bank of `count` questions on `topic`, ids prefixed so they are traceable. */
const bank = (topic: string, count: number): PaperQuestion[] =>
  Array.from({ length: count }, (_, i) => ({ id: `${topic}-${i}`, topic }));

const countByTopic = (paper: PaperQuestion[]): Record<string, number> => {
  const out: Record<string, number> = {};
  for (const q of paper) {
    const topic = q.topic || "General";
    out[topic] = (out[topic] ?? 0) + 1;
  }
  return out;
};

describe("topicMultiplier", () => {
  it("gives a topic answered perfectly no boost at all", () => {
    expect(topicMultiplier(100, DEFAULT_WEAK_BIAS)).toBe(1);
  });

  it("gives a topic answered wrongly every time the full bias", () => {
    expect(topicMultiplier(0, DEFAULT_WEAK_BIAS)).toBe(DEFAULT_WEAK_BIAS);
  });

  it("scales linearly in between", () => {
    const half = topicMultiplier(50, 3);
    expect(half).toBe(2);
    expect(half).toBeGreaterThan(topicMultiplier(75, 3));
    expect(half).toBeLessThan(topicMultiplier(25, 3));
  });

  it("treats an untried topic as mid-scale rather than strong", () => {
    // A student should not be steered away from a topic purely because they
    // have never attempted it.
    const unknown = topicMultiplier(null, DEFAULT_WEAK_BIAS);
    expect(unknown).toBeGreaterThan(topicMultiplier(100, DEFAULT_WEAK_BIAS));
    expect(unknown).toBeLessThan(topicMultiplier(0, DEFAULT_WEAK_BIAS));
    expect(unknown).toBe(topicMultiplier(50, DEFAULT_WEAK_BIAS));
  });

  it("caps the bias so one topic cannot swallow the paper", () => {
    expect(topicMultiplier(0, 99)).toBe(MAX_WEAK_BIAS);
  });

  it("refuses a bias below 1, which would favour strong topics", () => {
    expect(topicMultiplier(0, 0)).toBe(1);
    expect(topicMultiplier(0, -5)).toBe(1);
  });

  it("clamps accuracy that arrives outside 0-100", () => {
    expect(topicMultiplier(120, DEFAULT_WEAK_BIAS)).toBe(topicMultiplier(100, DEFAULT_WEAK_BIAS));
    expect(topicMultiplier(-20, DEFAULT_WEAK_BIAS)).toBe(topicMultiplier(0, DEFAULT_WEAK_BIAS));
  });

  it("does not throw on a non-finite accuracy", () => {
    expect(topicMultiplier(NaN, DEFAULT_WEAK_BIAS)).toBe(topicMultiplier(null, DEFAULT_WEAK_BIAS));
  });
});

describe("buildTargetedPaper", () => {
  const pool = [...bank("weak", 40), ...bank("strong", 40)];

  it("over-represents the topic the student is weakest on", () => {
    const paper = buildTargetedPaper({
      pool,
      targetCount: 40,
      topicAccuracy: [
        { topic: "weak", accuracy: 20 },
        { topic: "strong", accuracy: 95 },
      ],
      seed: 1,
    });

    const counts = countByTopic(paper);
    expect(counts.weak).toBeGreaterThan(counts.strong);
  });

  it("leaves the bank's distribution alone at a bias of 1", () => {
    // The escape hatch: bias 1 must be a genuine no-op, otherwise there is no
    // way to tell what the weighting is contributing.
    const paper = buildTargetedPaper({
      pool,
      targetCount: 40,
      topicAccuracy: [
        { topic: "weak", accuracy: 0 },
        { topic: "strong", accuracy: 100 },
      ],
      weakBias: 1,
      seed: 1,
    });

    expect(countByTopic(paper)).toEqual({ weak: 20, strong: 20 });
  });

  it("still reaches the requested length", () => {
    const paper = buildTargetedPaper({
      pool,
      targetCount: 40,
      topicAccuracy: [{ topic: "weak", accuracy: 0 }],
      seed: 7,
    });
    expect(paper).toHaveLength(40);
  });

  it("cannot fill a paper from a thin topic it does not have questions for", () => {
    // Weighting decides the share, not the supply. A student weak on a topic
    // with three questions gets three, and the rest of the paper is real.
    const thin = [...bank("weak", 3), ...bank("strong", 40)];
    const paper = buildTargetedPaper({
      pool: thin,
      targetCount: 30,
      topicAccuracy: [
        { topic: "weak", accuracy: 0 },
        { topic: "strong", accuracy: 100 },
      ],
      seed: 3,
    });

    expect(paper).toHaveLength(30);
    expect(countByTopic(paper).weak).toBeLessThanOrEqual(3);
  });

  it("never repeats a question", () => {
    const paper = buildTargetedPaper({
      pool,
      targetCount: 40,
      topicAccuracy: [{ topic: "weak", accuracy: 10 }],
      seed: 11,
    });
    expect(new Set(paper.map((q) => q.id)).size).toBe(paper.length);
  });

  it("draws unseen questions before repeating recent ones", () => {
    const recentlySeenIds = bank("weak", 40).map((q) => q.id);
    const paper = buildTargetedPaper({
      pool,
      targetCount: 30,
      topicAccuracy: [{ topic: "weak", accuracy: 0 }],
      recentlySeenIds,
      seed: 5,
    });

    // Every "weak" question was seen recently and there are 40 unseen
    // "strong" ones, so a 30-question paper needs none of them - despite
    // "weak" carrying the heavier weight.
    expect(countByTopic(paper).weak ?? 0).toBe(0);
    expect(paper).toHaveLength(30);
  });

  it("falls back to recently-seen questions rather than shortening the paper", () => {
    // The student who practises most would otherwise be handed the shortest
    // papers, which is exactly backwards.
    const small = bank("weak", 20);
    const paper = buildTargetedPaper({
      pool: small,
      targetCount: 20,
      topicAccuracy: [{ topic: "weak", accuracy: 0 }],
      recentlySeenIds: small.slice(0, 15).map((q) => q.id),
      seed: 9,
    });

    expect(paper).toHaveLength(20);
    expect(new Set(paper.map((q) => q.id)).size).toBe(20);
  });

  it("puts the unseen questions first when it has to reuse some", () => {
    const small = bank("weak", 10);
    const seenIds = small.slice(0, 6).map((q) => q.id);
    const paper = buildTargetedPaper({
      pool: small,
      targetCount: 10,
      topicAccuracy: [],
      recentlySeenIds: seenIds,
      seed: 2,
    });

    const seen = new Set(seenIds);
    const firstRepeat = paper.findIndex((q) => seen.has(q.id));
    expect(firstRepeat).toBe(4);
  });

  it("is deterministic for a given seed", () => {
    const args = {
      pool,
      targetCount: 25,
      topicAccuracy: [{ topic: "weak", accuracy: 30 }],
      seed: 42,
    };
    expect(buildTargetedPaper(args).map((q) => q.id)).toEqual(
      buildTargetedPaper(args).map((q) => q.id),
    );
  });

  it("produces different papers for different seeds", () => {
    const base = {
      pool,
      targetCount: 25,
      topicAccuracy: [{ topic: "weak", accuracy: 30 }],
    };
    const a = buildTargetedPaper({ ...base, seed: 1 }).map((q) => q.id);
    const b = buildTargetedPaper({ ...base, seed: 2 }).map((q) => q.id);
    expect(a).not.toEqual(b);
  });

  it("handles an empty pool and a zero target without throwing", () => {
    expect(buildTargetedPaper({ pool: [], targetCount: 20, topicAccuracy: [], seed: 1 })).toEqual([]);
    expect(buildTargetedPaper({ pool, targetCount: 0, topicAccuracy: [], seed: 1 })).toEqual([]);
  });

  it("does not invent questions when the bank is smaller than the target", () => {
    const paper = buildTargetedPaper({
      pool: bank("weak", 5),
      targetCount: 50,
      topicAccuracy: [{ topic: "weak", accuracy: 0 }],
      seed: 1,
    });
    expect(paper).toHaveLength(5);
  });

  it("treats untopiced questions as one group rather than dropping them", () => {
    const paper = buildTargetedPaper({
      pool: [...bank("weak", 10), { id: "loose-1", topic: null }],
      targetCount: 11,
      topicAccuracy: [],
      seed: 4,
    });
    expect(paper.map((q) => q.id)).toContain("loose-1");
  });
});
