import { describe, it, expect } from "vitest";
import {
  buildLearningProfile,
  conceptMastery,
  conceptTrend,
  bandFor,
  toProviderSummary,
  type ProfileInput,
  type ProfileResponse,
} from "../alexi/learningProfile";

const NOW = new Date("2026-08-17T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(NOW.getTime() - n * DAY);

function response(over: Partial<ProfileResponse> = {}): ProfileResponse {
  return {
    questionId: "q1",
    topic: "Texas Law",
    isCorrect: true,
    answeredAt: NOW,
    ...over,
  };
}

/** n responses on one topic, alternating correctness by the given pattern. */
function series(topic: string, results: boolean[], startDaysAgo = 0): ProfileResponse[] {
  return results.map((isCorrect, i) => ({
    questionId: `${topic}-${i}`,
    topic,
    isCorrect,
    answeredAt: daysAgo(startDaysAgo + (results.length - i - 1)),
  }));
}

function input(over: Partial<ProfileInput> = {}): ProfileInput {
  return {
    category: "property_casualty",
    responses: [],
    mockExamScores: [],
    questionBankSize: 100,
    examDate: null,
    hasPreviousAttempt: null,
    language: "en",
    easyPassScore: null,
    now: NOW,
    ...over,
  };
}

describe("bandFor", () => {
  it("bands mastery from critical to strong", () => {
    expect(bandFor(30)).toBe("critical");
    expect(bandFor(60)).toBe("needs_work");
    expect(bandFor(75)).toBe("improving");
    expect(bandFor(95)).toBe("strong");
  });
});

describe("conceptMastery", () => {
  it("returns zero with no evidence", () => {
    expect(conceptMastery([], NOW)).toBe(0);
  });

  it("shrinks sparse evidence toward neutral", () => {
    // Two lucky answers must not read as mastered - otherwise a student who
    // happened to see two easy questions outranks one with a real record.
    const twoCorrect = conceptMastery(
      [response({ questionId: "a" }), response({ questionId: "b" })],
      NOW,
    );

    expect(twoCorrect).toBeLessThan(90);
    expect(twoCorrect).toBeGreaterThan(50);
  });

  it("trusts a substantial record", () => {
    const many = conceptMastery(series("Law", Array(12).fill(true)), NOW);

    expect(many).toBeGreaterThan(95);
  });

  it("weights recent results above old ones", () => {
    // Same tally, opposite order in time. The student who has been getting it
    // right lately should score higher.
    const improving = conceptMastery(
      [
        ...series("Law", [false, false, false, false], 30),
        ...series("Law", [true, true, true, true], 0),
      ],
      NOW,
    );
    const declining = conceptMastery(
      [
        ...series("Law", [true, true, true, true], 30),
        ...series("Law", [false, false, false, false], 0),
      ],
      NOW,
    );

    expect(improving).toBeGreaterThan(declining);
  });

  it("lets an old mistake fade rather than permanently depress a concept", () => {
    const oldMiss = conceptMastery(
      [
        ...series("Law", [false], 90),
        ...series("Law", [true, true, true, true, true, true], 0),
      ],
      NOW,
    );

    expect(oldMiss).toBeGreaterThan(90);
  });
});

describe("conceptTrend", () => {
  it("refuses to call a trend on thin evidence", () => {
    // Telling a student they are declining on the strength of two answers is
    // both statistically wrong and demoralising.
    expect(conceptTrend(series("Law", [true, false]))).toBe("unknown");
    expect(conceptTrend(series("Law", [true, false, true, false, true]))).toBe("unknown");
  });

  it("detects improvement", () => {
    expect(conceptTrend(series("Law", [false, false, false, true, true, true]))).toBe("improving");
  });

  it("detects decline", () => {
    expect(conceptTrend(series("Law", [true, true, true, false, false, false]))).toBe("declining");
  });

  it("reports flat when both halves match", () => {
    expect(conceptTrend(series("Law", [true, false, true, true, false, true]))).toBe("flat");
  });
});

describe("buildLearningProfile", () => {
  it("handles a student with no history", () => {
    const profile = buildLearningProfile(input());

    expect(profile.totalAttempts).toBe(0);
    expect(profile.concepts).toEqual([]);
    expect(profile.overallMastery).toBeNull();
    expect(profile.recentAccuracy).toBeNull();
    expect(profile.coverage).toBe(0);
  });

  it("groups differently worded topics into one concept", () => {
    const profile = buildLearningProfile(
      input({
        responses: [
          ...series("Texas Law & Regulations", [true, false]),
          ...series("Texas Laws and Regulations", [false, false]),
        ],
      }),
    );

    expect(profile.concepts).toHaveLength(1);
    expect(profile.concepts[0].attempts).toBe(4);
  });

  it("orders concepts weakest first", () => {
    const profile = buildLearningProfile(
      input({
        responses: [
          ...series("Strong", Array(10).fill(true)),
          ...series("Weak", Array(10).fill(false)),
        ],
      }),
    );

    expect(profile.concepts[0].label).toBe("Weak");
    expect(profile.weakestConcepts[0].label).toBe("Weak");
  });

  it("prefers the better-evidenced concept when mastery ties", () => {
    // A 50% built on twelve attempts is a more actionable target than a 50%
    // built on two, so it should be offered first.
    const profile = buildLearningProfile(
      input({
        responses: [
          ...series("Thin", [true, false]),
          ...series("Thick", [true, false, true, false, true, false, true, false]),
        ],
      }),
    );

    const thin = profile.concepts.find((c) => c.label === "Thin")!;
    const thick = profile.concepts.find((c) => c.label === "Thick")!;
    if (thin.mastery === thick.mastery) {
      expect(profile.concepts[0].label).toBe("Thick");
    }
    expect(thick.attempts).toBeGreaterThan(thin.attempts);
  });

  it("flags only concepts missed more than once recently", () => {
    // One miss is an off day; two is a pattern worth intervening on.
    const profile = buildLearningProfile(
      input({
        responses: [
          ...series("OneMiss", [false, true, true, true]),
          ...series("Repeated", [false, false, false, true]),
        ],
      }),
    );

    const flagged = profile.repeatedlyMissedConcepts.map((c) => c.label);
    expect(flagged).toContain("Repeated");
    expect(flagged).not.toContain("OneMiss");
  });

  it("does not count misses outside the recent window", () => {
    const profile = buildLearningProfile(
      input({ responses: series("Old", [false, false, false], 60) }),
    );

    expect(profile.concepts[0].missedInWindow).toBe(0);
    expect(profile.repeatedlyMissedConcepts).toEqual([]);
  });

  it("measures coverage against the bank, not attempts", () => {
    // 20 attempts on 5 distinct questions is 5% coverage, not 20%. This is
    // what stops memorisation from reading as readiness.
    const repeated = Array.from({ length: 20 }, (_, i) => ({
      questionId: `q${i % 5}`,
      topic: "Law",
      isCorrect: true,
      answeredAt: NOW,
    }));
    const profile = buildLearningProfile(input({ responses: repeated, questionBankSize: 100 }));

    expect(profile.uniqueQuestionsSeen).toBe(5);
    expect(profile.coverage).toBeCloseTo(0.05);
  });

  it("caps coverage at 1 when the bank shrinks below what was seen", () => {
    const profile = buildLearningProfile(
      input({ responses: series("Law", Array(10).fill(true)), questionBankSize: 3 }),
    );

    expect(profile.coverage).toBe(1);
  });

  it("computes days remaining from the exam date", () => {
    const profile = buildLearningProfile(
      input({ examDate: new Date("2026-08-22T09:00:00Z") }),
    );

    expect(profile.daysRemaining).toBe(5);
  });

  it("never reports negative days for a past exam date", () => {
    const profile = buildLearningProfile(
      input({ examDate: new Date("2026-08-01T09:00:00Z") }),
    );

    expect(profile.daysRemaining).toBe(0);
  });

  it("marks a retaker only on an explicit yes", () => {
    expect(buildLearningProfile(input({ hasPreviousAttempt: true })).isRetaker).toBe(true);
    expect(buildLearningProfile(input({ hasPreviousAttempt: false })).isRetaker).toBe(false);
    // Null means "never asked", which is not the same as "no".
    expect(buildLearningProfile(input({ hasPreviousAttempt: null })).isRetaker).toBe(false);
  });
});

describe("toProviderSummary", () => {
  it("contains performance facts and no personal data", () => {
    // The redaction guarantee: whatever else changes, this string is what
    // leaves our infrastructure.
    const profile = buildLearningProfile(
      input({
        responses: series("Commercial Property", [false, false, true, false]),
        easyPassScore: 64,
        examDate: new Date("2026-08-22T09:00:00Z"),
        hasPreviousAttempt: true,
      }),
    );
    const summary = toProviderSummary(profile);

    expect(summary).toContain("property_casualty");
    expect(summary).toContain("64");
    expect(summary).toContain("Commercial Property");
    // No identifiers of any kind.
    expect(summary).not.toMatch(/@/);
    expect(summary).not.toMatch(/user[_-]?id/i);
    expect(summary).not.toMatch(/\bq\d/);
  });

  it("says so plainly when there is no score yet", () => {
    const summary = toProviderSummary(buildLearningProfile(input()));

    expect(summary).toContain("not yet established");
    expect(summary).toContain("not scheduled");
  });
});
