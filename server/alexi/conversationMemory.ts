/**
 * What the tutor remembers of a conversation.
 *
 * WHAT IS REMEMBERED, AND WHY SO NARROWLY
 *
 * Memory is scoped to one student and one question they have already
 * answered. That is not a simplification - it is what keeps the existing
 * safety property intact. The tutor may only discuss a question the student
 * has already answered, because otherwise it would be handing out answers to
 * questions still ahead of them. If memory spanned questions, an earlier
 * conversation about question B could be carried into a discussion of
 * question A and leak B's answer. Per-question memory cannot do that.
 *
 * WHAT IT COSTS
 *
 * Every remembered turn is tokens on every subsequent call, on a product
 * where a tutor answer has to stay well under a cent. So the window is
 * bounded twice: by how many turns, and by how many characters those turns
 * may occupy in total. The character budget is the one that actually binds -
 * six short turns and six long ones cost very differently.
 *
 * Turns are dropped oldest-first, because the most recent exchange is what a
 * follow-up question refers to.
 */

export type TurnRole = "student" | "assistant";

export interface TutorTurn {
  role: TurnRole;
  text: string;
  createdAt: Date | string;
}

/**
 * How much conversation the tutor carries.
 *
 * Six turns is three exchanges, which covers "explain more" followed by a
 * clarification - the pattern this exists for - without letting a long
 * session grow unboundedly expensive.
 */
export const MAX_REMEMBERED_TURNS = 6;

/** Total characters those turns may occupy. Roughly 500 tokens. */
export const MAX_REMEMBERED_CHARS = 2000;

/** Longest single turn kept whole; anything longer is dropped, not cut. */
export const MAX_TURN_CHARS = 800;

export interface MemoryWindow {
  /** Oldest first, which is the order a conversation reads in. */
  turns: TutorTurn[];
  /** Turns left out, so callers can say the history was trimmed. */
  dropped: number;
}

function textOf(turn: TutorTurn): string {
  return (turn.text ?? "").trim();
}

function timeOf(turn: TutorTurn): number {
  const value = new Date(turn.createdAt).getTime();
  // An unparseable timestamp sorts oldest rather than throwing: losing the
  // position of one turn is better than losing the conversation.
  return Number.isFinite(value) ? value : 0;
}

/**
 * Choose which turns to carry into the next request.
 *
 * @param turns any order; sorted here rather than trusting the caller.
 */
export function selectRecentTurns(
  turns: TutorTurn[],
  limits: { maxTurns?: number; maxChars?: number } = {},
): MemoryWindow {
  const maxTurns = limits.maxTurns ?? MAX_REMEMBERED_TURNS;
  const maxChars = limits.maxChars ?? MAX_REMEMBERED_CHARS;

  const usable = (turns ?? [])
    .filter((turn) => {
      const text = textOf(turn);
      // An empty turn carries no meaning and still costs message overhead.
      // An enormous one is either a paste or a bug; dropping it whole beats
      // truncating mid-sentence and asking the model to reason about half a
      // thought.
      return text.length > 0 && text.length <= MAX_TURN_CHARS;
    })
    .sort((a, b) => timeOf(a) - timeOf(b));

  const kept: TutorTurn[] = [];
  let chars = 0;

  // Walk backwards from the most recent: a follow-up refers to what was just
  // said, so the newest turns are the ones worth the budget.
  for (let i = usable.length - 1; i >= 0; i--) {
    if (kept.length >= maxTurns) break;
    const text = textOf(usable[i]);
    if (chars + text.length > maxChars) break;

    kept.push({ ...usable[i], text });
    chars += text.length;
  }

  kept.reverse();

  return { turns: kept, dropped: (turns ?? []).length - kept.length };
}
