/**
 * The missed-question notebook.
 *
 * Classifies a student's answer history per question so the notebook can
 * separate "still getting this wrong" from "got it wrong once, fixed it".
 * That distinction is the whole value of the feature - a flat list of every
 * question ever missed becomes useless within a week.
 *
 * Pure and clock-injected so it is deterministic under test.
 */

export type MissedStatus =
  /** Most recent answer was wrong. Still owes work. */
  | "struggling"
  /** Missed before, and the most recent answer was right. */
  | "mastered";

export interface AnswerEvent {
  questionId: string;
  topic: string;
  isCorrect: boolean;
  answeredAt: Date;
}

export interface NotebookEntry {
  questionId: string;
  topic: string;
  status: MissedStatus;
  timesSeen: number;
  timesWrong: number;
  lastAnsweredAt: Date;
  /** True when the most recent answer falls inside the recent window. */
  isRecent: boolean;
}

export type NotebookFilter =
  | "all"
  | "struggling"
  | "mastered"
  | "recent"
  | "topic";

export const RECENT_WINDOW_DAYS = 7;

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Build notebook entries from a raw response log.
 *
 * Only questions the student has missed at least once appear - a question
 * answered correctly every time was never in the notebook. Responses may
 * arrive in any order.
 */
export function buildNotebook(responses: AnswerEvent[], now: Date): NotebookEntry[] {
  const byQuestion = new Map<string, AnswerEvent[]>();
  for (const r of responses) {
    const list = byQuestion.get(r.questionId) ?? [];
    list.push(r);
    byQuestion.set(r.questionId, list);
  }

  const cutoff = new Date(now.getTime() - RECENT_WINDOW_DAYS * DAY_MS);
  const entries: NotebookEntry[] = [];

  for (const [questionId, events] of Array.from(byQuestion.entries())) {
    const timesWrong = events.filter((e) => !e.isCorrect).length;
    // Never missed: not a notebook entry.
    if (timesWrong === 0) continue;

    const ordered = [...events].sort(
      (a, b) => a.answeredAt.getTime() - b.answeredAt.getTime(),
    );
    const latest = ordered[ordered.length - 1];

    entries.push({
      questionId,
      topic: latest.topic,
      status: latest.isCorrect ? "mastered" : "struggling",
      timesSeen: events.length,
      timesWrong,
      lastAnsweredAt: latest.answeredAt,
      isRecent: latest.answeredAt >= cutoff,
    });
  }

  // Still-struggling first, then most wrong, then most recent. The student's
  // attention should land on what is actually costing them points.
  return entries.sort((a, b) => {
    if (a.status !== b.status) return a.status === "struggling" ? -1 : 1;
    if (a.timesWrong !== b.timesWrong) return b.timesWrong - a.timesWrong;
    return b.lastAnsweredAt.getTime() - a.lastAnsweredAt.getTime();
  });
}

export function filterNotebook(
  entries: NotebookEntry[],
  filter: NotebookFilter,
  topic?: string,
): NotebookEntry[] {
  switch (filter) {
    case "struggling":
      return entries.filter((e) => e.status === "struggling");
    case "mastered":
      return entries.filter((e) => e.status === "mastered");
    case "recent":
      return entries.filter((e) => e.isRecent);
    case "topic":
      // An unspecified topic filters to nothing rather than silently
      // returning everything, which would misrepresent the filter as applied.
      return topic ? entries.filter((e) => e.topic === topic) : [];
    case "all":
    default:
      return entries;
  }
}

/** Counts for the filter chips, so the UI does not recompute them. */
export function notebookCounts(entries: NotebookEntry[]) {
  return {
    all: entries.length,
    struggling: entries.filter((e) => e.status === "struggling").length,
    mastered: entries.filter((e) => e.status === "mastered").length,
    recent: entries.filter((e) => e.isRecent).length,
  };
}
