/**
 * Reconciling the two answers to "when is your exam?".
 *
 * There are two fields and they can contradict each other. `examDate` is a
 * scheduled date; `examDateSkipped` records "I haven't scheduled it yet" so a
 * returning student is not asked again. A student who skips and later books a
 * date would otherwise end up with both set, and "skipped" would outlive the
 * fact it described - leaving the checklist reporting an answer the student
 * has since replaced.
 *
 * So the rule lives here rather than being implied by the order of two
 * spreads in a route handler: setting a real date clears the skip.
 */

export interface ExamDateInput {
  /** ISO string to set one, null to clear it, undefined to leave it alone. */
  examDate?: string | null;
  /** True when the student says they have not scheduled it. */
  examDateSkipped?: boolean | null;
}

export interface ExamDatePatch {
  examDate?: Date | null;
  examDateSkipped?: boolean | null;
}

export function examDatePatch(input: ExamDateInput): ExamDatePatch {
  const patch: ExamDatePatch = {};

  if (input.examDate !== undefined) {
    patch.examDate = input.examDate ? new Date(input.examDate) : null;
  }
  if (input.examDateSkipped !== undefined) {
    patch.examDateSkipped = input.examDateSkipped;
  }

  // A real date means it is scheduled, whatever the request also said. Note
  // this fires on the date, not on the caller having sent the skip field:
  // a student who skipped last week and books today sends only a date.
  if (patch.examDate instanceof Date) {
    patch.examDateSkipped = false;
  }

  return patch;
}

/**
 * Has this student answered the date question at all?
 *
 * A scheduled date and an explicit "not yet" are both answers. Only silence
 * is not, and silence is what the checklist should still ask about.
 */
export function hasAnsweredExamDate(profile: {
  examDate?: Date | string | null;
  examDateSkipped?: boolean | null;
}): boolean {
  return Boolean(profile.examDate) || profile.examDateSkipped === true;
}
