/**
 * Quality audit of the question bank we actually ship.
 *
 * WHY THIS IS NOT THE VALIDATOR
 *
 * server/alexi/questionValidation.ts runs on generated candidates, before
 * anything is stored. It has never seen a single question a student has sat:
 * the existing bank was written by hand and went into the database without
 * passing through it. So the checks exist and the content they were written
 * for has never been checked.
 *
 * This closes that gap, and adds the checks a per-question validator cannot
 * make - ones about the bank as a whole, like two questions being near
 * duplicates of each other.
 *
 * WHAT IS DELIBERATELY NOT CHECKED
 *
 * Answer *position* bias - "the answer is usually C" - is not reported as a
 * defect, because every exam session shuffles each question's options before
 * sending them (see server/shuffleQuestionOptions.ts). Whatever order the
 * bank stores, the student never sees it, so flagging it would be inventing
 * a problem. The tells that DO survive shuffling are the ones here: a
 * correct option that is conspicuously longer, one that echoes the stem, and
 * distractors that all hedge with absolutes.
 *
 * Every finding names a real, checkable property. Nothing here scores a
 * question on whether it is "good" in a way we cannot defend.
 */

import { detectAnswerLeakage, similarity, DUPLICATE_SIMILARITY } from "./questionValidation";

export interface BankQuestion {
  id: string;
  category: string;
  topic: string | null;
  questionTextEn: string;
  questionTextEs: string;
  optionsEn: string[];
  optionsEs: string[];
  correctAnswer: number;
  explanationEn: string | null;
  explanationEs: string | null;
}

export type FindingSeverity = "critical" | "warning";

export interface BankFinding {
  questionId: string;
  code: string;
  severity: FindingSeverity;
  detail: string;
}

export interface BankAuditReport {
  /** Questions examined. */
  total: number;
  /** Questions with at least one critical finding. */
  criticalCount: number;
  /** Questions with warnings but no criticals. */
  warningCount: number;
  /** Questions with nothing to report. */
  cleanCount: number;
  findings: BankFinding[];
  /** How many questions carry each code, for a summary that fits on a screen. */
  byCode: Array<{ code: string; severity: FindingSeverity; questions: number }>;
}

/**
 * Shortest an option may be.
 *
 * This catches blanks and single characters. A one-character option in a
 * licensing-exam question is a truncated import or a placeholder, not a
 * position a student can weigh against three others.
 */
export const MIN_OPTION_CHARS = 2;

/** Below this an explanation cannot say why the answer is right. */
export const MIN_EXPLANATION_CHARS = 30;

/**
 * Below this many questions, a topic cannot fill its share of a paper and
 * the same items come round every sitting. Not a defect in any one question,
 * so it is reported separately from the per-question findings.
 */
export const MIN_TOPIC_QUESTIONS = 20;

function trimmed(value: string | null | undefined): string {
  return (value ?? "").trim();
}

/**
 * Check one question in isolation.
 *
 * Both languages are checked, because a Spanish-speaking student sits the
 * Spanish paper and a missing translation there is not a cosmetic problem.
 */
export function auditQuestion(q: BankQuestion): BankFinding[] {
  const findings: BankFinding[] = [];
  const add = (code: string, severity: FindingSeverity, detail: string) =>
    findings.push({ questionId: q.id, code, severity, detail });

  const en = trimmed(q.questionTextEn);
  const es = trimmed(q.questionTextEs);
  if (!en) add("missing_question_en", "critical", "English question text is empty");
  if (!es) add("missing_question_es", "critical", "Spanish question text is empty");

  const optionsEn = Array.isArray(q.optionsEn) ? q.optionsEn : [];
  const optionsEs = Array.isArray(q.optionsEs) ? q.optionsEs : [];

  if (optionsEn.length < 2) {
    add("too_few_options", "critical", `Only ${optionsEn.length} English options`);
  }
  // A mismatch means the two languages disagree about which option is which,
  // so the answer index points at different text depending on the language.
  if (optionsEn.length !== optionsEs.length) {
    add(
      "option_count_mismatch",
      "critical",
      `${optionsEn.length} English options against ${optionsEs.length} Spanish`,
    );
  }

  if (
    !Number.isInteger(q.correctAnswer) ||
    q.correctAnswer < 0 ||
    q.correctAnswer >= optionsEn.length
  ) {
    add(
      "answer_out_of_range",
      "critical",
      `Correct answer index ${q.correctAnswer} with ${optionsEn.length} options`,
    );
  }

  const blankEn = optionsEn.filter((o) => trimmed(o).length < MIN_OPTION_CHARS).length;
  const blankEs = optionsEs.filter((o) => trimmed(o).length < MIN_OPTION_CHARS).length;
  if (blankEn > 0) add("empty_option_en", "critical", `${blankEn} English options are empty`);
  if (blankEs > 0) add("empty_option_es", "critical", `${blankEs} Spanish options are empty`);

  // Two identical options mean one of them is unpickable-but-correct, or the
  // student is asked to choose between the same answer twice.
  const distinctEn = new Set(optionsEn.map((o) => trimmed(o).toLowerCase()));
  if (optionsEn.length > 0 && distinctEn.size < optionsEn.length) {
    add("duplicate_options", "critical", "Two English options have the same text");
  }

  if (trimmed(q.explanationEn).length < MIN_EXPLANATION_CHARS) {
    add(
      "missing_explanation_en",
      "warning",
      `English explanation is ${trimmed(q.explanationEn).length} chars`,
    );
  }
  if (trimmed(q.explanationEs).length < MIN_EXPLANATION_CHARS) {
    add(
      "missing_explanation_es",
      "warning",
      `Spanish explanation is ${trimmed(q.explanationEs).length} chars`,
    );
  }

  if (!trimmed(q.topic)) {
    // Untopiced questions still get asked, but they cannot be aimed at a
    // weak area or counted toward a topic's mastery.
    add("missing_topic", "warning", "Question has no topic");
  }

  // The answer-key tells, reused rather than reimplemented so the bank is
  // held to exactly the standard generated content is held to.
  if (optionsEn.length > 1 && q.correctAnswer >= 0 && q.correctAnswer < optionsEn.length) {
    const leakage = detectAnswerLeakage({
      question: en,
      choices: optionsEn.map((text, i) => ({ id: String(i), text, explanation: "" })),
      correctAnswer: String(q.correctAnswer),
      explanation: trimmed(q.explanationEn),
      // Fields the leakage check does not read; present to satisfy the shape.
      examId: q.category,
      conceptId: "",
      topic: trimmed(q.topic),
      distractorExplanations: {},
      difficulty: "standard",
      language: "en",
      generationVersion: "bank-audit",
      sourceIds: [],
    });
    for (const issue of leakage) add(issue.code, "warning", issue.detail);
  }

  return findings;
}

/**
 * Near-duplicate pairs within a category.
 *
 * Compared within a category only: "What is the maximum penalty?" is a
 * different question in real estate and in life insurance, and comparing
 * across the whole bank would flag those as duplicates of each other. It is
 * also what keeps this from being a full cross-product of the bank.
 */
export function findNearDuplicates(questions: BankQuestion[]): BankFinding[] {
  const findings: BankFinding[] = [];
  const byCategory = new Map<string, BankQuestion[]>();
  for (const q of questions) {
    const list = byCategory.get(q.category) ?? [];
    list.push(q);
    byCategory.set(q.category, list);
  }

  for (const group of Array.from(byCategory.values())) {
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const score = similarity(group[i].questionTextEn, group[j].questionTextEn);
        if (score >= DUPLICATE_SIMILARITY) {
          // Reported against the later one: the earlier is treated as the
          // original, so a reviewer has one to keep and one to look at.
          findings.push({
            questionId: group[j].id,
            code: "near_duplicate",
            severity: "warning",
            detail: `${Math.round(score * 100)}% similar to question ${group[i].id}`,
          });
        }
      }
    }
  }

  return findings;
}

export interface ThinTopic {
  category: string;
  topic: string;
  questions: number;
}

/** Topics too small to fill their share of a paper without repeating. */
export function findThinTopics(
  questions: BankQuestion[],
  minimum = MIN_TOPIC_QUESTIONS,
): ThinTopic[] {
  const counts = new Map<string, { category: string; topic: string; questions: number }>();
  for (const q of questions) {
    const topic = trimmed(q.topic);
    if (!topic) continue;
    const key = `${q.category}::${topic}`;
    const entry = counts.get(key) ?? { category: q.category, topic, questions: 0 };
    entry.questions++;
    counts.set(key, entry);
  }

  return Array.from(counts.values())
    .filter((t) => t.questions < minimum)
    .sort((a, b) => a.questions - b.questions);
}

/** Audit the whole bank and summarise it. */
export function auditBank(questions: BankQuestion[]): BankAuditReport {
  const findings = [
    ...questions.flatMap((q) => auditQuestion(q)),
    ...findNearDuplicates(questions),
  ];

  const worstByQuestion = new Map<string, FindingSeverity>();
  for (const f of findings) {
    if (worstByQuestion.get(f.questionId) !== "critical") {
      worstByQuestion.set(f.questionId, f.severity);
    }
  }

  let criticalCount = 0;
  let warningCount = 0;
  for (const severity of Array.from(worstByQuestion.values())) {
    if (severity === "critical") criticalCount++;
    else warningCount++;
  }

  const codeMap = new Map<string, { severity: FindingSeverity; ids: Set<string> }>();
  for (const f of findings) {
    const entry = codeMap.get(f.code) ?? { severity: f.severity, ids: new Set<string>() };
    entry.ids.add(f.questionId);
    codeMap.set(f.code, entry);
  }

  const byCode = Array.from(codeMap.entries())
    .map(([code, entry]) => ({ code, severity: entry.severity, questions: entry.ids.size }))
    .sort((a, b) => b.questions - a.questions || a.code.localeCompare(b.code));

  return {
    total: questions.length,
    criticalCount,
    warningCount,
    cleanCount: questions.length - worstByQuestion.size,
    findings,
    byCode,
  };
}
