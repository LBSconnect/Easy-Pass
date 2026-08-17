/**
 * Personalised daily study plan.
 *
 * Turns "I bought 1,000 questions" into "complete these 27 minutes of targeted
 * study today". The plan is derived from what the student is actually weak at
 * and how long they have left, never from a fixed curriculum - two students
 * with the same exam date and different weaknesses get different plans.
 *
 * Pure and clock-injected so it is deterministic under test.
 */

export type PlanIntensity =
  | "final_review" // exam is today or tomorrow
  | "cram_3_day"
  | "cram_7_day"
  | "standard_14_day"
  | "extended" // more than 14 days, or no date set
  | "untimed"; // no exam date

export type TaskKind =
  | "weak_topic_drill"
  | "missed_review"
  | "mock_exam"
  | "mastery_check"
  | "broad_practice";

export interface PlanTask {
  kind: TaskKind;
  /** Topic this task targets, when it is topic-specific. */
  topic: string | null;
  /** Questions to attempt. Null for tasks not measured in questions. */
  questionCount: number | null;
  estimatedMinutes: number;
  /** Current accuracy on this topic, for "Texas Law - 54%" style labels. */
  topicAccuracy: number | null;
}

export interface StudyPlan {
  intensity: PlanIntensity;
  /** Whole days until the exam. Null when no date is set. Negative if past. */
  daysUntilExam: number | null;
  tasks: PlanTask[];
  estimatedMinutes: number;
}

export interface TopicStanding {
  topic: string;
  answered: number;
  accuracy: number;
}

export interface PlanInput {
  topics: TopicStanding[];
  /** Questions whose most recent answer was wrong. */
  missedQuestionCount: number;
  examDate: Date | null;
  now: Date;
  /** Retakers get a weaker-area-heavy plan. */
  hasPreviousAttempt: boolean;
  /** Whether the student has ever completed a full mock exam. */
  hasSatMock: boolean;
}

/** Minutes per question, used to size tasks. */
const MINUTES_PER_QUESTION = 0.75;
const MOCK_EXAM_MINUTES = 90;

/** A topic is "weak" below this accuracy. */
const WEAK_THRESHOLD = 70;

/** Ignore topics with too little data to judge. */
const MIN_ATTEMPTS_TO_JUDGE = 3;

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysUntil(examDate: Date, now: Date): number {
  // Compare calendar days, not elapsed hours: an exam "tomorrow" should read
  // as 1 day whether it is now 9am or 11pm.
  const a = Date.UTC(examDate.getUTCFullYear(), examDate.getUTCMonth(), examDate.getUTCDate());
  const b = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  return Math.round((a - b) / DAY_MS);
}

export function intensityFor(daysLeft: number | null): PlanIntensity {
  if (daysLeft === null) return "untimed";
  if (daysLeft <= 1) return "final_review";
  if (daysLeft <= 3) return "cram_3_day";
  if (daysLeft <= 7) return "cram_7_day";
  if (daysLeft <= 14) return "standard_14_day";
  return "extended";
}

/** Daily question budget by intensity. Tighter deadline, heavier day. */
const DAILY_BUDGET: Record<PlanIntensity, number> = {
  final_review: 30,
  cram_3_day: 60,
  cram_7_day: 45,
  standard_14_day: 35,
  extended: 25,
  untimed: 25,
};

function minutesFor(questions: number): number {
  return Math.max(1, Math.round(questions * MINUTES_PER_QUESTION));
}

export function generateStudyPlan(input: PlanInput): StudyPlan {
  const daysLeft = input.examDate ? daysUntil(input.examDate, input.now) : null;
  const intensity = intensityFor(daysLeft);

  let budget = DAILY_BUDGET[intensity];
  // Retakers already know the exam; bias their day toward more volume on the
  // areas that cost them points last time.
  if (input.hasPreviousAttempt) budget = Math.round(budget * 1.2);

  const judged = input.topics.filter((t) => t.answered >= MIN_ATTEMPTS_TO_JUDGE);
  const weak = judged
    .filter((t) => t.accuracy < WEAK_THRESHOLD)
    .sort((a, b) => a.accuracy - b.accuracy);

  const tasks: PlanTask[] = [];

  // 1. Clear the missed-question backlog first. Re-attempting a question you
  //    got wrong is the highest-yield minute a student can spend, and on the
  //    final day it is essentially all that is worth doing.
  if (input.missedQuestionCount > 0) {
    const cap = intensity === "final_review" ? budget : Math.ceil(budget * 0.3);
    const count = Math.min(input.missedQuestionCount, cap);
    tasks.push({
      kind: "missed_review",
      topic: null,
      questionCount: count,
      estimatedMinutes: minutesFor(count),
      topicAccuracy: null,
    });
    budget -= count;
  }

  // 2. Drill the weakest topics. On the final day, skip drilling entirely -
  //    cramming a weak topic hours before the exam is not a good use of the
  //    student's remaining time, and reviewing known misses is.
  if (intensity !== "final_review") {
    // Fewer, deeper drills when time is short; broader when there is room.
    const drillCount = intensity === "cram_3_day" ? 2 : 3;
    for (const topic of weak.slice(0, drillCount)) {
      if (budget <= 0) break;
      const count = Math.min(budget, Math.max(5, Math.ceil(budget / drillCount)));
      tasks.push({
        kind: "weak_topic_drill",
        topic: topic.topic,
        questionCount: count,
        estimatedMinutes: minutesFor(count),
        topicAccuracy: Math.round(topic.accuracy),
      });
      budget -= count;
    }
  }

  // 3. A student with no weak topics identified yet needs breadth, not
  //    targeting - there is nothing to target.
  if (weak.length === 0 && budget > 0 && intensity !== "final_review") {
    tasks.push({
      kind: "broad_practice",
      topic: null,
      questionCount: budget,
      estimatedMinutes: minutesFor(budget),
      topicAccuracy: null,
    });
    budget = 0;
  }

  // 4. Mock exam. Worth a full sitting when the exam is close enough to
  //    matter but not so close that the day is better spent on review, or
  //    whenever the student has never sat one.
  const mockDay =
    intensity === "cram_3_day" ||
    intensity === "cram_7_day" ||
    (!input.hasSatMock && intensity !== "final_review" && intensity !== "untimed");
  if (mockDay) {
    tasks.push({
      kind: "mock_exam",
      topic: null,
      questionCount: null,
      estimatedMinutes: MOCK_EXAM_MINUTES,
      topicAccuracy: null,
    });
  }

  // 5. Close the day with a short mastery check on the weakest topic, so the
  //    student sees whether the drill moved anything.
  if (weak.length > 0 && intensity !== "final_review") {
    tasks.push({
      kind: "mastery_check",
      topic: weak[0].topic,
      questionCount: 10,
      estimatedMinutes: minutesFor(10),
      topicAccuracy: Math.round(weak[0].accuracy),
    });
  }

  return {
    intensity,
    daysUntilExam: daysLeft,
    tasks,
    estimatedMinutes: tasks.reduce((sum, t) => sum + t.estimatedMinutes, 0),
  };
}
