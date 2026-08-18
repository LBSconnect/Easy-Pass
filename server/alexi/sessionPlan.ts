/**
 * Turning a recommendation into a session a student can actually sit.
 *
 * The engine already decides what to study: it returns ordered blocks like
 * "3-minute review, 8 flashcards, 12 targeted questions". Until now those
 * blocks were only ever rendered as text and the Start button dropped the
 * student on a generic page - the session was described but never run.
 *
 * This module resolves the described blocks into concrete material drawn from
 * the question bank. It is deliberately pure: it takes questions, mastery and
 * history as arguments and returns a plan. Everything to do with the database,
 * subscriptions and HTTP lives in the route.
 *
 * GROUNDING
 *
 * A "teach" block is built from worked examples - real questions on the
 * concept, shown with their approved explanations - not from generated prose.
 * The study-topic config carries a one-line description and nothing more, so
 * generating an explanation would mean stating Texas regulation from memory.
 * A worked example with an approved explanation teaches the same point and is
 * something we can stand behind.
 */

export type SessionBlockMode =
  | "teach"
  | "flashcards"
  | "practice"
  | "scenarios"
  | "review"
  | "mock_exam";

/** The subset of a question this module needs. */
export interface PlannableQuestion {
  id: string;
  topic: string;
  questionText: string;
  options: string[];
  correctAnswer: number;
  explanation: string | null;
}

export interface PlanInput {
  /** Blocks the recommendation asked for, in order. */
  blocks: Array<{ mode: SessionBlockMode; itemCount: number; estimatedMinutes: number; label: string }>;
  /** Active questions for the category, already scoped. */
  pool: PlannableQuestion[];
  /** Question ids this student has previously answered incorrectly, newest first. */
  missedQuestionIds: string[];
  /** Question ids the student has answered at all. */
  answeredQuestionIds: Set<string>;
  /** The concept the recommendation named, matched against question topics. */
  conceptTopic: string | null;
  /** Resolved by the caller: authored if the config has them, else distilled. */
  keyPoints?: string[];
}

export interface TeachBlock {
  mode: "teach";
  label: string;
  estimatedMinutes: number;
  /** Short grounded statements shown before the worked examples. */
  keyPoints: string[];
  /** Worked examples: question, correct answer and the approved explanation. */
  examples: Array<{
    questionId: string;
    topic: string;
    questionText: string;
    options: string[];
    correctIndex: number;
    explanation: string;
  }>;
}

export interface FlashcardBlock {
  mode: "flashcards";
  label: string;
  estimatedMinutes: number;
  cards: Array<{
    questionId: string;
    topic: string;
    front: string;
    back: string;
  }>;
}

export interface QuestionBlock {
  mode: "practice" | "scenarios";
  label: string;
  estimatedMinutes: number;
  /** Correct answers are never sent; the client asks per answer. */
  questions: Array<{
    questionId: string;
    topic: string;
    questionText: string;
    options: string[];
  }>;
}

export interface ReviewBlock {
  mode: "review";
  label: string;
  estimatedMinutes: number;
  items: Array<{
    questionId: string;
    topic: string;
    questionText: string;
    options: string[];
    correctIndex: number;
    explanation: string | null;
  }>;
}

export interface MockExamBlock {
  mode: "mock_exam";
  label: string;
  estimatedMinutes: number;
}

export type ResolvedBlock =
  | TeachBlock
  | FlashcardBlock
  | QuestionBlock
  | ReviewBlock
  | MockExamBlock;

/**
 * Keep a block's label truthful about how much material it actually holds.
 *
 * The engine writes labels like "8 smart flashcards" or "5-question mastery
 * check" from the count it asked for. When the bank can only supply three,
 * the label becomes a small lie the student can check against the "1 / 3"
 * counter on screen. Rewriting the leading number keeps the engine's phrasing
 * and fixes only the claim.
 *
 * Only the first standalone integer is touched, and only when it differs, so
 * a label with no number in it is returned untouched. Applied only to blocks
 * whose label states a quantity - a teach label names a concept, and any
 * number in it is part of the subject rather than a count.
 */
export function reconcileLabel(label: string, actual: number): string {
  return label.replace(/\d+/, (found) =>
    Number(found) === actual ? found : String(actual),
  );
}

/** Worked examples beyond this stop being a lead-in and start being a lecture. */
const MAX_TEACH_EXAMPLES = 3;

/**
 * Questions on the named concept first, then the rest.
 *
 * Topic matching is case- and whitespace-insensitive because concept labels
 * and stored topics are authored by different people at different times.
 */
function byConceptFirst(pool: PlannableQuestion[], conceptTopic: string | null): PlannableQuestion[] {
  if (!conceptTopic) return pool;
  const want = conceptTopic.trim().toLowerCase();
  const on: PlannableQuestion[] = [];
  const off: PlannableQuestion[] = [];
  for (const q of pool) {
    (q.topic.trim().toLowerCase() === want ? on : off).push(q);
  }
  return [...on, ...off];
}

/**
 * Resolve one described block into material.
 *
 * Returns null when the bank cannot support the block - a flashcard block with
 * no cards, or a teach block with no explained question on the concept. A
 * block that would render empty is dropped rather than shown as a step the
 * student clicks through and learns nothing from.
 */
export function resolveBlock(
  block: PlanInput["blocks"][number],
  input: PlanInput,
): ResolvedBlock | null {
  const { pool, missedQuestionIds, answeredQuestionIds, conceptTopic } = input;
  const count = Math.max(1, block.itemCount);
  const ordered = byConceptFirst(pool, conceptTopic);

  switch (block.mode) {
    case "mock_exam":
      // Never inlined. A timed 100-question paper is its own screen with its
      // own rules, and burying it inside a 15-minute session would misrepresent
      // what the student is about to start.
      return {
        mode: "mock_exam",
        label: block.label,
        estimatedMinutes: block.estimatedMinutes,
      };

    case "teach": {
      // Only questions carrying an approved explanation can teach anything.
      const examples = ordered
        .filter((q) => q.explanation && q.explanation.trim().length > 0)
        .slice(0, Math.min(count, MAX_TEACH_EXAMPLES))
        .map((q) => ({
          questionId: q.id,
          topic: q.topic,
          questionText: q.questionText,
          options: q.options,
          correctIndex: q.correctAnswer,
          explanation: (q.explanation ?? "").trim(),
        }));
      const keyPoints = input.keyPoints ?? [];
      // Worked examples remain the floor. Key points enrich the step; with
      // neither there is nothing to teach and the block is dropped.
      if (examples.length === 0 && keyPoints.length === 0) return null;
      return {
        mode: "teach",
        label: block.label,
        estimatedMinutes: block.estimatedMinutes,
        keyPoints,
        examples,
      };
    }

    case "flashcards": {
      // Front is the question, back is the correct option plus the reason.
      const cards = ordered
        .slice(0, count)
        .map((q) => {
          const answer = q.options[q.correctAnswer];
          if (!answer) return null;
          return {
            questionId: q.id,
            topic: q.topic,
            front: q.questionText,
            back: q.explanation?.trim() ? `${answer}\n\n${q.explanation.trim()}` : answer,
          };
        })
        .filter((c): c is NonNullable<typeof c> => c !== null);
      if (cards.length === 0) return null;
      return {
        mode: "flashcards",
        label: reconcileLabel(block.label, cards.length),
        estimatedMinutes: block.estimatedMinutes,
        cards,
      };
    }

    case "review": {
      // Review means "questions you got wrong", so it is driven by history
      // rather than the pool order. With no misses there is nothing to review
      // and the block is dropped - inventing a review out of unseen questions
      // would make "review" mean "practice".
      const byId = new Map(pool.map((q) => [q.id, q]));
      const items = missedQuestionIds
        .map((id) => byId.get(id))
        .filter((q): q is PlannableQuestion => Boolean(q))
        .slice(0, count)
        .map((q) => ({
          questionId: q.id,
          topic: q.topic,
          questionText: q.questionText,
          options: q.options,
          correctIndex: q.correctAnswer,
          explanation: q.explanation,
        }));
      if (items.length === 0) return null;
      return {
        mode: "review",
        label: reconcileLabel(block.label, items.length),
        estimatedMinutes: block.estimatedMinutes,
        items,
      };
    }

    case "practice":
    case "scenarios": {
      // Prefer questions this student has not already answered, so a practice
      // block is new work rather than a re-run of the same items.
      const unseen = ordered.filter((q) => !answeredQuestionIds.has(q.id));
      const seen = ordered.filter((q) => answeredQuestionIds.has(q.id));
      const questions = [...unseen, ...seen].slice(0, count).map((q) => ({
        questionId: q.id,
        topic: q.topic,
        questionText: q.questionText,
        options: q.options,
      }));
      if (questions.length === 0) return null;
      return {
        mode: block.mode,
        label: reconcileLabel(block.label, questions.length),
        estimatedMinutes: block.estimatedMinutes,
        questions,
      };
    }
  }
}

export interface SessionPlan {
  blocks: ResolvedBlock[];
  /** Every question id the plan will ask about, for answer-order bookkeeping. */
  questionIds: string[];
  estimatedMinutes: number;
}

/**
 * Resolve a whole recommendation into a runnable plan.
 *
 * Blocks the bank cannot support are dropped, and the estimate is recomputed
 * from what survived - a student told "15 minutes" should not be handed nine.
 */
export function buildSessionPlan(input: PlanInput): SessionPlan {
  const blocks = input.blocks
    .map((b) => resolveBlock(b, input))
    .filter((b): b is ResolvedBlock => b !== null);

  const questionIds: string[] = [];
  for (const b of blocks) {
    if (b.mode === "practice" || b.mode === "scenarios") {
      questionIds.push(...b.questions.map((q) => q.questionId));
    }
  }

  return {
    blocks,
    questionIds,
    estimatedMinutes: blocks.reduce((sum, b) => sum + b.estimatedMinutes, 0),
  };
}
