import { describe, it, expect } from "vitest";
import {
  generateStudyPlan,
  intensityFor,
  daysUntil,
  type PlanInput,
  type TopicStanding,
} from "../studyPlan";

const NOW = new Date("2026-08-17T12:00:00Z");
const inDays = (n: number) => new Date(NOW.getTime() + n * 24 * 60 * 60 * 1000);

function topic(name: string, accuracy: number, answered = 10): TopicStanding {
  return { topic: name, accuracy, answered };
}

function input(over: Partial<PlanInput> = {}): PlanInput {
  return {
    topics: [],
    missedQuestionCount: 0,
    examDate: null,
    now: NOW,
    hasPreviousAttempt: false,
    hasSatMock: true,
    ...over,
  };
}

const kinds = (p: ReturnType<typeof generateStudyPlan>) => p.tasks.map((t) => t.kind);

describe("daysUntil", () => {
  it("counts calendar days, not elapsed hours", () => {
    // 11pm today to 1am tomorrow is 2 hours but must read as 1 day.
    const lateNow = new Date("2026-08-17T23:00:00Z");
    const earlyTomorrow = new Date("2026-08-18T01:00:00Z");
    expect(daysUntil(earlyTomorrow, lateNow)).toBe(1);
  });

  it("returns 0 for an exam later today", () => {
    expect(daysUntil(new Date("2026-08-17T23:00:00Z"), NOW)).toBe(0);
  });

  it("goes negative for a past exam", () => {
    expect(daysUntil(inDays(-3), NOW)).toBe(-3);
  });
});

describe("intensityFor", () => {
  it("maps day counts to plan shapes", () => {
    expect(intensityFor(null)).toBe("untimed");
    expect(intensityFor(0)).toBe("final_review");
    expect(intensityFor(1)).toBe("final_review");
    expect(intensityFor(2)).toBe("cram_3_day");
    expect(intensityFor(3)).toBe("cram_3_day");
    expect(intensityFor(7)).toBe("cram_7_day");
    expect(intensityFor(14)).toBe("standard_14_day");
    expect(intensityFor(30)).toBe("extended");
  });

  it("treats an overdue exam as final review", () => {
    expect(intensityFor(-1)).toBe("final_review");
  });
});

describe("generateStudyPlan", () => {
  it("gives a brand new student breadth, since there is nothing to target", () => {
    const plan = generateStudyPlan(input());

    expect(kinds(plan)).toContain("broad_practice");
    expect(kinds(plan)).not.toContain("weak_topic_drill");
    expect(plan.estimatedMinutes).toBeGreaterThan(0);
  });

  it("targets the weakest topics, weakest first", () => {
    const plan = generateStudyPlan(
      input({
        topics: [topic("Property", 82), topic("Law", 41), topic("Workers Comp", 63)],
      }),
    );

    const drills = plan.tasks.filter((t) => t.kind === "weak_topic_drill");
    expect(drills.map((d) => d.topic)).toEqual(["Law", "Workers Comp"]);
    // Property is above the weak threshold and must not be drilled.
    expect(drills.map((d) => d.topic)).not.toContain("Property");
  });

  it("reports each drilled topic's current accuracy for the UI", () => {
    const plan = generateStudyPlan(input({ topics: [topic("Law", 54)] }));
    const drill = plan.tasks.find((t) => t.kind === "weak_topic_drill")!;

    expect(drill.topicAccuracy).toBe(54);
  });

  it("ignores topics with too few attempts to judge", () => {
    const plan = generateStudyPlan(
      input({ topics: [topic("Law", 20, 2), topic("Property", 85, 40)] }),
    );

    // Law looks terrible but rests on 2 answers, so it is not drilled - and
    // with no judged weak topic left, the day falls back to breadth.
    expect(kinds(plan)).not.toContain("weak_topic_drill");
    expect(kinds(plan)).toContain("broad_practice");
  });

  it("clears the missed-question backlog before anything else", () => {
    const plan = generateStudyPlan(
      input({ topics: [topic("Law", 40)], missedQuestionCount: 25 }),
    );

    expect(plan.tasks[0].kind).toBe("missed_review");
  });

  it("never queues more missed questions than the student has", () => {
    const plan = generateStudyPlan(input({ missedQuestionCount: 3 }));
    const review = plan.tasks.find((t) => t.kind === "missed_review")!;

    expect(review.questionCount).toBe(3);
  });

  it("omits missed review when there is no backlog", () => {
    const plan = generateStudyPlan(input({ missedQuestionCount: 0 }));

    expect(kinds(plan)).not.toContain("missed_review");
  });

  it("spends the final day on review, not on drilling or a mock", () => {
    const plan = generateStudyPlan(
      input({
        examDate: inDays(1),
        topics: [topic("Law", 40)],
        missedQuestionCount: 40,
      }),
    );

    expect(plan.intensity).toBe("final_review");
    expect(kinds(plan)).toEqual(["missed_review"]);
    expect(kinds(plan)).not.toContain("mock_exam");
    expect(kinds(plan)).not.toContain("weak_topic_drill");
  });

  it("schedules a heavier day as the exam gets closer", () => {
    const topics = [topic("Law", 40)];
    const far = generateStudyPlan(input({ examDate: inDays(30), topics }));
    const near = generateStudyPlan(input({ examDate: inDays(3), topics }));

    expect(near.intensity).toBe("cram_3_day");
    expect(far.intensity).toBe("extended");
    const questions = (p: typeof far) =>
      p.tasks.reduce((s, t) => s + (t.questionCount ?? 0), 0);
    expect(questions(near)).toBeGreaterThan(questions(far));
  });

  it("includes a mock exam during cram windows", () => {
    const plan = generateStudyPlan(
      input({ examDate: inDays(5), topics: [topic("Law", 40)] }),
    );

    expect(kinds(plan)).toContain("mock_exam");
  });

  it("includes a mock exam for a student who has never sat one", () => {
    const plan = generateStudyPlan(
      input({ examDate: inDays(30), topics: [topic("Law", 40)], hasSatMock: false }),
    );

    expect(kinds(plan)).toContain("mock_exam");
  });

  it("does not push a mock on a student who already sits them regularly", () => {
    const plan = generateStudyPlan(
      input({ examDate: inDays(30), topics: [topic("Law", 40)], hasSatMock: true }),
    );

    expect(kinds(plan)).not.toContain("mock_exam");
  });

  it("flags a retaker's plan as a rescue plan", () => {
    const first = generateStudyPlan(input({ topics: [topic("Law", 40)] }));
    const retaker = generateStudyPlan(
      input({ topics: [topic("Law", 40)], hasPreviousAttempt: true }),
    );

    expect(first.isRescuePlan).toBe(false);
    expect(retaker.isRescuePlan).toBe(true);
  });

  it("drills more distinct weak topics for a retaker", () => {
    const topics = [
      topic("A", 30),
      topic("B", 40),
      topic("C", 50),
      topic("D", 60),
    ];
    const base = { examDate: inDays(10), topics };
    const first = generateStudyPlan(input(base));
    const retaker = generateStudyPlan(input({ ...base, hasPreviousAttempt: true }));

    const drills = (p: typeof first) =>
      p.tasks.filter((t) => t.kind === "weak_topic_drill").length;
    expect(drills(retaker)).toBeGreaterThan(drills(first));
  });

  it("gives retakers a heavier day than first-timers", () => {
    const base = { examDate: inDays(10), topics: [topic("Law", 40)] };
    const first = generateStudyPlan(input(base));
    const retaker = generateStudyPlan(input({ ...base, hasPreviousAttempt: true }));

    const questions = (p: typeof first) =>
      p.tasks.reduce((s, t) => s + (t.questionCount ?? 0), 0);
    expect(questions(retaker)).toBeGreaterThan(questions(first));
  });

  it("closes with a mastery check on the weakest topic", () => {
    const plan = generateStudyPlan(
      input({ topics: [topic("Property", 65), topic("Law", 41)] }),
    );
    const check = plan.tasks.find((t) => t.kind === "mastery_check")!;

    expect(check.topic).toBe("Law");
    expect(check.questionCount).toBe(10);
  });

  it("produces different plans for students with different weaknesses", () => {
    // The brief's core requirement: not everybody gets the same curriculum.
    const a = generateStudyPlan(input({ topics: [topic("Law", 41)] }));
    const b = generateStudyPlan(input({ topics: [topic("Workers Comp", 41)] }));

    const drillTopic = (p: typeof a) =>
      p.tasks.find((t) => t.kind === "weak_topic_drill")?.topic;
    expect(drillTopic(a)).toBe("Law");
    expect(drillTopic(b)).toBe("Workers Comp");
  });

  it("reports days remaining for the countdown", () => {
    const plan = generateStudyPlan(input({ examDate: inDays(29) }));

    expect(plan.daysUntilExam).toBe(29);
  });

  it("reports a null countdown when no exam is scheduled", () => {
    const plan = generateStudyPlan(input());

    expect(plan.daysUntilExam).toBeNull();
    expect(plan.intensity).toBe("untimed");
  });

  it("sums estimated minutes across the whole plan", () => {
    const plan = generateStudyPlan(
      input({ topics: [topic("Law", 40)], missedQuestionCount: 10 }),
    );

    const summed = plan.tasks.reduce((s, t) => s + t.estimatedMinutes, 0);
    expect(plan.estimatedMinutes).toBe(summed);
    expect(plan.estimatedMinutes).toBeGreaterThan(0);
  });

  it("never emits a task with a non-positive question count", () => {
    const plan = generateStudyPlan(
      input({
        topics: [topic("A", 10), topic("B", 20), topic("C", 30), topic("D", 40)],
        missedQuestionCount: 200,
        examDate: inDays(30),
      }),
    );

    for (const task of plan.tasks) {
      if (task.questionCount !== null) expect(task.questionCount).toBeGreaterThan(0);
      expect(task.estimatedMinutes).toBeGreaterThan(0);
    }
  });
});
