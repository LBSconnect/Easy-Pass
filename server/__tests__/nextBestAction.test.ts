import { describe, it, expect } from "vitest";
import { buildLearningProfile, type ProfileInput, type ProfileResponse } from "../alexi/learningProfile";
import {
  recommendNextAction,
  difficultyFor,
  modeFor,
  composeSession,
  buildInsight,
  DEFAULT_SESSION_MINUTES,
} from "../alexi/nextBestAction";

const NOW = new Date("2026-08-17T12:00:00Z");
const DAY = 24 * 60 * 60 * 1000;
const daysAgo = (n: number) => new Date(NOW.getTime() - n * DAY);
const daysAhead = (n: number) => new Date(NOW.getTime() + n * DAY);

function series(topic: string, results: boolean[], startDaysAgo = 0): ProfileResponse[] {
  return results.map((isCorrect, i) => ({
    questionId: `${topic}-${i}`,
    topic,
    isCorrect,
    answeredAt: daysAgo(startDaysAgo + (results.length - i - 1)),
  }));
}

function profileOf(over: Partial<ProfileInput> = {}) {
  return buildLearningProfile({
    category: "property_casualty",
    responses: [],
    mockExamScores: [],
    questionBankSize: 100,
    examDate: null,
    hasPreviousAttempt: null,
    language: "en",
    easyPassScore: 70,
    now: NOW,
    ...over,
  });
}

const recommend = (over: Partial<ProfileInput> = {}, availableMinutes?: number) =>
  recommendNextAction({ profile: profileOf(over), availableMinutes, now: NOW });

describe("difficultyFor", () => {
  it("climbs the ladder with mastery", () => {
    expect(difficultyFor(40)).toBe("foundation");
    expect(difficultyFor(65)).toBe("standard");
    expect(difficultyFor(80)).toBe("exam_level");
    expect(difficultyFor(95)).toBe("challenge");
  });

  it("never throws a struggling student at the hardest questions", () => {
    // The anti-goal: repeatedly serving challenge questions to someone who is
    // failing is how adaptive systems demoralise the students they help.
    expect(difficultyFor(20)).toBe("foundation");
  });

  it("defaults to standard with no mastery signal", () => {
    expect(difficultyFor(null)).toBe("standard");
  });
});

describe("modeFor", () => {
  const base = profileOf();

  it("switches to teaching when a concept is missed repeatedly", () => {
    // Feature 14. More questions do not fix a comprehension gap.
    const concept = {
      conceptId: "bop",
      label: "BOP Eligibility",
      mastery: 45,
      band: "critical" as const,
      attempts: 12,
      uniqueQuestions: 10,
      missedInWindow: 3,
      trend: "flat" as const,
      lastSeenAt: NOW,
    };

    expect(modeFor(concept, base)).toBe("teach");
  });

  it("uses flashcards when the student has barely met a concept", () => {
    const concept = {
      conceptId: "annuities",
      label: "Annuities",
      mastery: 60,
      band: "needs_work" as const,
      attempts: 3,
      uniqueQuestions: 3,
      missedInWindow: 0,
      trend: "unknown" as const,
      lastSeenAt: NOW,
    };

    expect(modeFor(concept, base)).toBe("flashcards");
  });

  it("moves a strong concept to scenarios as the exam nears", () => {
    // Knows the facts; the remaining gap is application, which is what the
    // real exam tests.
    const concept = {
      conceptId: "liability",
      label: "Liability",
      mastery: 88,
      band: "strong" as const,
      attempts: 20,
      uniqueQuestions: 18,
      missedInWindow: 0,
      trend: "improving" as const,
      lastSeenAt: NOW,
    };
    const soon = profileOf({ examDate: daysAhead(10) });

    expect(modeFor(concept, soon)).toBe("scenarios");
  });

  it("reviews when there is no concept to target", () => {
    expect(modeFor(null, base)).toBe("review");
  });
});

describe("composeSession", () => {
  it("always ends with a mastery check so the loop can close", () => {
    // Without measurement after study, the adapt-measure-adapt loop this
    // product is built on never closes.
    //
    // "review" used to be missing from this list, and was the one mode that
    // did not end with a check. It was also the mode chosen for the last days
    // before an exam - so the sessions closest to the exam were the ones that
    // measured nothing. Excluding it from the loop hid that.
    for (const mode of ["teach", "flashcards", "practice", "scenarios", "review"] as const) {
      const blocks = composeSession(mode, 15, "Texas Law");
      expect(blocks[blocks.length - 1].mode).toBe("practice");
      expect(blocks[blocks.length - 1].label).toContain("mastery check");
    }
  });

  it("does not name two different steps the same thing", () => {
    // A practice session is two practice blocks - the practice, then the check
    // at the end. Labelling from mode alone printed "Targeted practice" twice
    // in the summary and again as two identical chips on the progress rail, so
    // the measurement looked like a repeat of the step before it.
    for (const mode of ["teach", "flashcards", "practice", "scenarios", "review"] as const) {
      const blocks = composeSession(mode, 15, "Texas Law");
      const named = blocks.map((b) => `${b.mode}:${b.purpose}`);
      expect(new Set(named).size, `${mode} repeats a step name: ${named.join(", ")}`).toBe(
        blocks.length,
      );
    }
  });

  it("marks the closing block as a check rather than more of the same", () => {
    for (const mode of ["teach", "flashcards", "practice", "scenarios", "review"] as const) {
      const blocks = composeSession(mode, 15, "Texas Law");
      expect(blocks[blocks.length - 1].purpose).toBe("check");
    }
  });

  it("marks the block that eases a student in as a warm-up", () => {
    const blocks = composeSession("review", 15, null);
    expect(blocks[0].purpose).toBe("warm_up");
  });

  it("gives every block a purpose, so nothing falls back to its mode", () => {
    for (const mode of ["teach", "flashcards", "practice", "scenarios", "review", "mock_exam"] as const) {
      for (const block of composeSession(mode, 15, "Texas Law")) {
        expect(["main", "warm_up", "check"]).toContain(block.purpose);
      }
    }
  });

  it("gives a review session a shape rather than one long list", () => {
    // It used to be a single block: "N-question mixed review", rendered as the
    // answers the student already had wrong. Warm up, recall, check.
    const blocks = composeSession("review", 15, null);

    expect(blocks.map((b) => b.mode)).toEqual(["flashcards", "review", "practice"]);
  });

  it("asks the review block to be recall rather than reading", () => {
    // The label is what the student reads on the step card, so it has to
    // promise the right activity.
    const recall = composeSession("review", 15, null).find((b) => b.mode === "review")!;

    expect(recall.label).toMatch(/from memory/i);
    expect(recall.itemCount).toBeGreaterThan(0);
  });

  it("front-loads explanation in a teaching session", () => {
    const blocks = composeSession("teach", 15, "BOP Eligibility");

    expect(blocks[0].mode).toBe("teach");
    expect(blocks[0].label).toContain("BOP Eligibility");
  });

  it("keeps block minutes summing to the budget", () => {
    for (const mode of ["teach", "flashcards", "practice", "scenarios", "review"] as const) {
      const total = composeSession(mode, 20, "Law").reduce((s, b) => s + b.estimatedMinutes, 0);
      expect(total).toBe(20);
    }
  });

  it("still produces a usable session at the smallest budget", () => {
    const blocks = composeSession("flashcards", 5, "Law");

    expect(blocks.every((b) => b.itemCount > 0)).toBe(true);
  });

  it("scales item counts with the time available", () => {
    const short = composeSession("practice", 10, "Law")[0].itemCount;
    const long = composeSession("practice", 60, "Law")[0].itemCount;

    expect(long).toBeGreaterThan(short);
  });
});

describe("recommendNextAction", () => {
  it("sends a brand new student to a diagnostic", () => {
    const rec = recommend();

    expect(rec.reasonCodes).toContain("no_activity_yet");
    expect(rec.headline).toMatch(/readiness check/i);
    expect(rec.concept).toBeNull();
  });

  it("targets the weakest concept", () => {
    // Misses are outside the recent window, so this exercises the plain
    // weak-concept branch rather than the higher-priority repeated-miss one.
    const rec = recommend({
      responses: [
        ...series("Liability", Array(10).fill(true)),
        ...series("Commercial Property", [false, false, false, false, false, true, false, true], 30),
      ],
    });

    expect(rec.concept?.label).toBe("Commercial Property");
    expect(rec.reasonCodes).toContain("weak_concept");
  });

  it("prioritises a repeatedly missed concept and teaches rather than drills", () => {
    const rec = recommend({
      responses: [
        ...series("Liability", Array(10).fill(true)),
        ...series("BOP Eligibility", [false, false, false, true, false, true, false, true, true, true]),
      ],
    });

    expect(rec.reasonCodes).toContain("repeated_concept_misses");
    expect(rec.concept?.label).toBe("BOP Eligibility");
    expect(rec.mode).toBe("teach");
    expect(rec.detail).toMatch(/explanation rather than more questions/i);
  });

  it("does not start new material in the final days", () => {
    // Opening a fresh weak topic two days out costs confidence and gains
    // almost nothing.
    const rec = recommend({
      examDate: daysAhead(1),
      responses: [
        ...series("Liability", Array(10).fill(true)),
        ...series("Commercial Property", Array(10).fill(false)),
      ],
    });

    expect(rec.reasonCodes).toContain("exam_imminent");
    expect(rec.mode).toBe("review");
    expect(rec.detail).toMatch(/rather than starting anything new/i);
  });

  it("keeps exam day itself to light review", () => {
    const rec = recommend({
      examDate: NOW,
      responses: series("Commercial Property", Array(10).fill(false)),
    });

    expect(rec.headline).toMatch(/light review/i);
  });

  it("does not treat a distant exam as imminent", () => {
    const rec = recommend({
      examDate: daysAhead(30),
      responses: series("Commercial Property", Array(10).fill(false)),
    });

    expect(rec.reasonCodes).not.toContain("exam_imminent");
  });

  it("frames a retaker's weak area as a rescue", () => {
    // Misses pushed outside the recent window so the dedicated retaker branch
    // wins rather than the repeated-miss one.
    const rec = recommend({
      hasPreviousAttempt: true,
      responses: [
        ...series("Liability", Array(10).fill(true)),
        ...series("Texas Law", [false, true, false, true, false, true, true, true], 30),
      ],
    });

    expect(rec.reasonCodes).toContain("retaker_rescue");
    expect(rec.headline).toMatch(/retaker rescue/i);
  });

  it("keeps the retaker flag even when a more urgent branch wins", () => {
    // The reason codes describe the student, not just the winning branch -
    // otherwise analytics cannot separate retaker sessions from first-timers.
    const rec = recommend({
      hasPreviousAttempt: true,
      responses: series("Texas Law", [false, false, false, true, true, true, true, true]),
    });

    expect(rec.reasonCodes).toContain("repeated_concept_misses");
    expect(rec.reasonCodes).toContain("retaker_rescue");
  });

  it("does not flag a first-timer as a retaker", () => {
    const rec = recommend({
      hasPreviousAttempt: false,
      responses: series("Texas Law", Array(10).fill(false)),
    });

    expect(rec.reasonCodes).not.toContain("retaker_rescue");
  });

  it("refuses to call a student ready on thin coverage", () => {
    // Twelve questions answered well is not readiness. Without this guard the
    // product would tell someone to book an exam on the strength of a
    // memorised handful.
    const rec = recommend({
      responses: series("Law", Array(12).fill(true)),
      questionBankSize: 500,
    });

    expect(rec.reasonCodes).toContain("low_coverage");
    expect(rec.mode).not.toBe("mock_exam");
    expect(rec.detail).toMatch(/haven't seen enough/i);
  });

  it("recommends a mock exam when strong across the board with real coverage", () => {
    const wide = Array.from({ length: 60 }, (_, i) => ({
      questionId: `q${i}`,
      topic: i % 2 === 0 ? "Liability" : "Property",
      isCorrect: true,
      answeredAt: daysAgo(i % 10),
    }));
    const rec = recommend({ responses: wide, questionBankSize: 100 });

    expect(rec.mode).toBe("mock_exam");
    expect(rec.reasonCodes).toContain("broadly_ready");
    // A mock is not a 15-minute activity.
    expect(rec.estimatedMinutes).toBeGreaterThanOrEqual(60);
  });

  it("suggests live help when practice has stopped working", () => {
    // Feature 24: many attempts, mastery still low. More AI practice is not
    // the answer and pretending otherwise wastes the student's remaining time.
    const rec = recommend({
      responses: series(
        "Texas Law",
        Array.from({ length: 24 }, (_, i) => i % 4 === 0),
      ),
    });

    expect(rec.suggestHumanHelp).toBe(true);
    expect(rec.reasonCodes).toContain("stalled_despite_practice");
  });

  it("does not suggest live help to a student making progress", () => {
    const rec = recommend({
      responses: [
        ...series("Liability", Array(10).fill(true)),
        ...series("Property", [false, false, true, true, true, true]),
      ],
    });

    expect(rec.suggestHumanHelp).toBe(false);
  });

  it("honours the time the student actually has", () => {
    const short = recommend({ responses: series("Law", Array(10).fill(false)) }, 10);
    const long = recommend({ responses: series("Law", Array(10).fill(false)) }, 45);

    expect(short.estimatedMinutes).toBe(10);
    expect(long.estimatedMinutes).toBe(45);
    expect(short.headline).toContain("10-minute");
  });

  it("defaults to the standard session length", () => {
    const rec = recommend({ responses: series("Law", Array(10).fill(false)) });

    expect(rec.estimatedMinutes).toBe(DEFAULT_SESSION_MINUTES);
  });

  it("always supplies deterministic copy that needs no model", () => {
    // The provider-outage guarantee starts here: every branch ships usable
    // student-facing text without any AI call.
    const cases = [
      recommend(),
      recommend({ responses: series("Law", Array(10).fill(false)) }),
      recommend({ examDate: daysAhead(1), responses: series("Law", Array(10).fill(false)) }),
      recommend({ hasPreviousAttempt: true, responses: series("Law", Array(10).fill(false)) }),
    ];

    for (const rec of cases) {
      expect(rec.headline.length).toBeGreaterThan(0);
      expect(rec.detail.length).toBeGreaterThan(0);
      expect(rec.blocks.length).toBeGreaterThan(0);
      expect(rec.evidence.length).toBeGreaterThan(0);
    }
  });

  it("gives every recommendation an auditable reason", () => {
    const rec = recommend({ responses: series("Law", Array(10).fill(false)) });

    expect(rec.reasonCodes.length).toBeGreaterThan(0);
    expect(rec.evidence.join(" ")).toMatch(/mastery/i);
  });

  it("is deterministic - same input, same output", () => {
    const args = { responses: series("Law", [false, true, false, false, true, false, true, true]) };
    const a = recommend(args);
    const b = recommend(args);

    expect(a.headline).toBe(b.headline);
    expect(a.concept?.conceptId).toBe(b.concept?.conceptId);
    expect(a.reasonCodes).toEqual(b.reasonCodes);
  });
});

describe("buildInsight", () => {
  it("stays silent when there is nothing worth saying", () => {
    // An insights panel that fires every visit stops being read.
    expect(buildInsight(profileOf())).toBeNull();
  });

  it("leads with a decline, which is the actionable finding", () => {
    const insight = buildInsight(
      profileOf({ responses: series("Texas Law", [true, true, true, false, false, false]) }),
    );

    expect(insight).toMatch(/Texas Law/);
    expect(insight).toMatch(/slipping/i);
  });

  it("pairs a gain with the remaining gap", () => {
    const insight = buildInsight(
      profileOf({
        responses: [
          ...series("Liability", [false, false, false, true, true, true]),
          ...series("Commercial Property", Array(8).fill(false)),
        ],
      }),
    );

    expect(insight).toMatch(/improved in Liability/i);
    expect(insight).toMatch(/Commercial Property/);
  });

  it("notices three declining mock exams", () => {
    const insight = buildInsight(profileOf({ mockExamScores: [58, 65, 72] }));

    expect(insight).toMatch(/three mock exam scores/i);
  });

  it("does not flag mocks that are improving", () => {
    // Scores are most-recent-first, so this student is climbing.
    const insight = buildInsight(profileOf({ mockExamScores: [80, 70, 60] }));

    expect(insight ?? "").not.toMatch(/mock exam/i);
  });
});
