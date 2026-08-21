/**
 * Which topics did this diagnostic actually catch the student out on?
 *
 * The submit handler already works out which of the ten questions were missed
 * - it has to, to produce a score - and then throws that away. Every question
 * carries a topic, so the same pass can say "you missed two of the three
 * questions on policy provisions" without any new storage and without any new
 * question of the student.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO
 *
 * It does not infer. A topic appears here only because a question tagged with
 * it was asked and answered wrongly. Ten questions spread over four or five
 * topics is a small sample, and treating it as a diagnosis of what someone
 * knows would be dressing up noise - so the wording this feeds ("focus next
 * on") is a suggestion of where to start, which is what the evidence supports.
 *
 * It also never carries an answer key. A topic name says where marks were
 * lost; it says nothing about which option was right.
 */

export interface DiagnosticItemOutcome {
  /** The topic slug on the question, or null when the question has none. */
  topic: string | null;
  correct: boolean;
}

export interface WeakTopic {
  id: string;
  nameEn: string;
  nameEs: string;
  /** How many questions on this topic were missed. */
  missed: number;
  /** How many were asked, so the caller can show "2 of 3" honestly. */
  asked: number;
}

/** Names come from the study-topic config so the two never drift apart. */
export type TopicNameLookup = (topicId: string) => { nameEn: string; nameEs: string } | undefined;

/**
 * Three is the cap because a next step a student can hold in their head is
 * worth more than a complete inventory of everything they got wrong.
 */
export const MAX_WEAK_TOPICS = 3;

/**
 * Weak topics, strongest signal first.
 *
 * Ordering is by how many questions were missed, then by the share of that
 * topic missed, then by id. The last is not a tie-break anyone will notice;
 * it is there so the same result always renders in the same order rather than
 * shuffling between two renders of the same score.
 */
export function weakTopics(
  outcomes: DiagnosticItemOutcome[],
  lookup: TopicNameLookup,
  maxTopics: number = MAX_WEAK_TOPICS,
): WeakTopic[] {
  if (maxTopics <= 0) return [];

  const tally = new Map<string, { missed: number; asked: number }>();
  for (const outcome of outcomes) {
    // A question with no topic cannot be attributed to one. Counting it
    // anywhere would be inventing the evidence this is supposed to report.
    if (!outcome.topic) continue;
    const entry = tally.get(outcome.topic) ?? { missed: 0, asked: 0 };
    entry.asked += 1;
    if (!outcome.correct) entry.missed += 1;
    tally.set(outcome.topic, entry);
  }

  const ranked: WeakTopic[] = [];
  for (const [id, { missed, asked }] of Array.from(tally.entries())) {
    // Nothing missed is not a weakness, however few were asked.
    if (missed === 0) continue;
    const names = lookup(id);
    // An unrecognised topic slug would render as a raw database value in front
    // of a student. Better to show one fewer area than a slug.
    if (!names) continue;
    ranked.push({ id, nameEn: names.nameEn, nameEs: names.nameEs, missed, asked });
  }

  ranked.sort((a, b) => {
    if (b.missed !== a.missed) return b.missed - a.missed;
    const aRate = a.missed / a.asked;
    const bRate = b.missed / b.asked;
    if (bRate !== aRate) return bRate - aRate;
    return a.id.localeCompare(b.id);
  });

  return ranked.slice(0, maxTopics);
}
