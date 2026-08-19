/**
 * Getting em dashes out of what students read.
 *
 * WHY THIS IS NOT A FIND AND REPLACE
 *
 * The repo was swept once already, and the note in that commit is the rule
 * this file follows: prose was rewritten rather than having the character
 * swapped for a hyphen, because "unequal - the insured pays premiums" is just
 * the same sentence with worse punctuation.
 *
 * Swapping in a hyphen is not a fix. So the two jobs an em dash actually does
 * in question prose get the two different marks English uses for them:
 *
 * One dash introduces what follows. "The value exchanged is unequal - the
 * insured pays premiums, but the insurer may pay nothing." That is a colon.
 *
 * A matched pair encloses an aside. "The policy - once delivered - cannot be
 * altered." Those are commas.
 *
 * WHY IT IS NEEDED AT ALL
 *
 * Seed files are fixed in the repo, but seeding does not rewrite rows that
 * already exist, so a question written before the sweep still shows an em dash
 * to every student reading it today. That is a database problem, and this is
 * the part of it that can be reasoned about and tested without a database.
 */

/** The character itself, plus the en dash, which reads the same way in prose. */
const DASHES = /[—–]/;
const DASH_GLOBAL = /[—–]/g;

export function containsEmDash(text: string | null | undefined): boolean {
  return typeof text === "string" && DASHES.test(text);
}

/**
 * Rewrite the dashes in one piece of text.
 *
 * Whitespace around the original is absorbed, so "a — b", "a—b" and "a —b" all
 * come out the same way rather than leaving a doubled space behind.
 */
export function normaliseEmDash(text: string): string {
  if (!DASHES.test(text)) return text;

  const count = (text.match(DASH_GLOBAL) ?? []).length;

  // A pair encloses an aside, which takes commas: the first dash gets the
  // comma, the second gets the comma that closes it.
  //
  // Only an exact pair is treated this way. Three or more is not a structure
  // English has a rule for, so those fall through to colons, which at least
  // never produce an unbalanced sentence.
  if (count === 2) {
    let seen = 0;
    return collapse(
      text.replace(DASH_GLOBAL, () => {
        seen += 1;
        return seen === 1 ? ", " : ", ";
      }),
    );
  }

  return collapse(text.replace(DASH_GLOBAL, ": "));
}

/**
 * Tidy the seam.
 *
 * The dash may have had spaces around it, and the replacement brings its own,
 * so " : " and ",  " are both possible without this. Punctuation immediately
 * before the dash is dropped for the same reason - "unequal, - the insured"
 * is not something anyone would write.
 */
function collapse(text: string): string {
  return text
    .replace(/\s+([:,])\s+/g, "$1 ")
    .replace(/([,;:])\s*([:,])\s/g, "$2 ")
    .replace(/[ \t]{2,}/g, " ")
    .trimEnd();
}

/** Every student-facing field on a question that could carry one. */
export interface QuestionText {
  questionTextEn: string;
  questionTextEs: string;
  optionsEn: string[];
  optionsEs: string[];
  explanationEn: string | null;
  explanationEs: string | null;
}

/**
 * Rewrite a whole question, or report that it needs no change.
 *
 * Returns null when nothing contains a dash, so a caller can skip the write
 * entirely - this runs over the whole bank and almost every row is already
 * clean.
 */
export function normaliseQuestion(question: QuestionText): QuestionText | null {
  const fields: QuestionText = {
    questionTextEn: normaliseEmDash(question.questionTextEn ?? ""),
    questionTextEs: normaliseEmDash(question.questionTextEs ?? ""),
    optionsEn: (question.optionsEn ?? []).map(normaliseEmDash),
    optionsEs: (question.optionsEs ?? []).map(normaliseEmDash),
    explanationEn:
      typeof question.explanationEn === "string"
        ? normaliseEmDash(question.explanationEn)
        : question.explanationEn ?? null,
    explanationEs:
      typeof question.explanationEs === "string"
        ? normaliseEmDash(question.explanationEs)
        : question.explanationEs ?? null,
  };

  const changed =
    fields.questionTextEn !== question.questionTextEn ||
    fields.questionTextEs !== question.questionTextEs ||
    fields.explanationEn !== question.explanationEn ||
    fields.explanationEs !== question.explanationEs ||
    fields.optionsEn.some((o, i) => o !== question.optionsEn?.[i]) ||
    fields.optionsEs.some((o, i) => o !== question.optionsEs?.[i]);

  return changed ? fields : null;
}
