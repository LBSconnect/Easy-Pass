/**
 * Which terms is the question bank actually using?
 *
 * WHAT THIS DOES AND DELIBERATELY DOES NOT DO
 *
 * It surfaces candidate terms and where they appear. It never writes a
 * definition. Definitions of Texas insurance and real-estate terms are
 * statements of law and practice, and they belong to someone qualified to
 * make them - the same rule the study guide's key points follow.
 *
 * So the output of this is a worklist for a person: "these phrases appear
 * across your approved questions, here is where, and here is how often".
 * Someone then writes the definition, in both languages, and publishes it.
 *
 * The extraction is deliberately conservative. A candidate list that is
 * mostly noise gets ignored, which is worse than a short list - so it takes
 * multi-word capitalised phrases and a small set of recognised single words,
 * not every capitalised token.
 */

/** A question the glossary can be mined from. Approved bank questions only. */
export interface GlossarySource {
  id: string;
  topic: string | null;
  questionTextEn: string;
  explanationEn: string | null;
}

export interface TermCandidate {
  /** The phrase as it appears, normalised for capitalisation. */
  term: string;
  /** How many distinct questions it appears in. */
  questionCount: number;
  /** Up to a handful of question ids, so a reviewer can read the context. */
  sourceQuestionIds: string[];
  /** Topics it appears under, for grouping the worklist. */
  topics: string[];
}

/**
 * Grammatical words that can open a capitalised run without being part of the
 * term after it.
 *
 * These are stripped from the FRONT of a phrase only. That distinction cost
 * me a broken extractor: "policy" was briefly in this list, and stripping it
 * from the end turned "Businessowners Policy" into "Businessowners". Words
 * like Policy, Texas and Insurance are real components of real terms - they
 * are only ever noise when they lead, and mostly not even then.
 */
const LEADING_NOISE = new Set([
  "a", "an", "and", "the", "this", "that", "these", "those", "if", "when",
  "which", "what", "who", "whom", "whose", "because", "since", "while",
  "however", "therefore", "for", "of", "in", "on", "at", "to", "from", "by",
  "with", "without", "under", "over", "before", "after", "during", "all",
  "any", "each", "every", "both", "either", "neither", "not", "no", "yes",
  "is", "are", "was", "were", "be", "been", "being", "has", "have", "had",
  "do", "does", "did", "can", "could", "may", "might", "must", "shall",
  "should", "will", "would", "it", "its", "they", "them", "their", "he",
  "she", "his", "her", "you", "your", "we", "our", "one", "two", "three",
  "first", "second", "third", "note", "consider", "another", "some", "many",
  "most", "several", "such", "other", "same", "given", "following", "above",
  "below", "here", "there", "also",
]);

/**
 * Single words that are terminology in their own right.
 *
 * A deliberately short list of forms rather than a vocabulary: anything
 * ending in these suffixes is domain language in this bank, and a reviewer
 * can discard the few that are not. Not a claim about what any of them mean.
 */
const TERM_SUFFIXES = [
  "surance", "surer", "sured", "surable",   // insurance, insurer, insured...
  "demnity", "demnify",                     // indemnity, indemnify
  "ductible",                               // deductible
  "iciary",                                 // fiduciary, beneficiary
  "orsement",                               // endorsement
  "scission",                               // rescission
  "brogation",                              // subrogation
  "mortization",                            // amortization
  "crow",                                   // escrow
  "reclosure",                              // foreclosure
  "asehold",                                // leasehold
  "nuity",                                  // annuity
];

const MIN_QUESTIONS = 2;
const MAX_SOURCES_PER_TERM = 5;

/**
 * Longest phrase treated as one term.
 *
 * Terminology in this bank is two to four words. A longer unbroken run of
 * capitalised words is almost always two terms that happen to sit next to
 * each other, and there is no reliable way to tell where one ends - so the
 * run is dropped rather than guessed at. A missing candidate costs a person
 * typing one in; a wrong one costs their trust in the whole list.
 */
const MAX_TERM_WORDS = 4;

/** Title case, so "BOP eligibility" and "BOP Eligibility" are one term. */
function normalise(term: string): string {
  return term
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[.,;:!?]+$/, "");
}

function isLeadingNoise(word: string): boolean {
  return LEADING_NOISE.has(word.toLowerCase());
}

function hasTermSuffix(word: string): boolean {
  const lower = word.toLowerCase();
  return TERM_SUFFIXES.some((suffix) => lower.endsWith(suffix));
}

/**
 * Pull candidate phrases out of one piece of text.
 *
 * Two shapes count:
 *  - a run of two or more capitalised words ("Businessowners Policy"),
 *    which is how this bank writes named concepts;
 *  - a single word whose form marks it as terminology (see TERM_SUFFIXES).
 *
 * An all-caps acronym on its own is skipped: "BOP" is meaningless in a
 * glossary without the phrase it stands for, and the phrase is usually
 * present nearby anyway.
 */
export function extractTerms(text: string): string[] {
  const found: string[] = [];

  // Multi-word capitalised phrases.
  for (const match of Array.from(text.matchAll(/\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)+)\b/g))) {
    const phrase = normalise(match[1]);
    const words = phrase.split(" ");

    // A phrase that is only grammar is not a term.
    if (words.every(isLeadingNoise)) continue;

    // Drop leading openers: "The Businessowners Policy" is the same term as
    // "Businessowners Policy", and "Another" likewise. Only the front - a
    // trailing word is far more likely to be part of the term than noise.
    while (words.length > 1 && isLeadingNoise(words[0])) words.shift();

    if (words.length < 2) continue;
    // Too long to be one term, and ambiguous to split. Skip it.
    if (words.length > MAX_TERM_WORDS) continue;

    found.push(words.join(" "));
  }

  // Single words whose form marks them as domain language.
  for (const match of Array.from(text.matchAll(/\b([A-Za-z]{5,})\b/g))) {
    const word = normalise(match[1]);
    if (isLeadingNoise(word)) continue;
    if (hasTermSuffix(word)) found.push(word.toLowerCase());
  }

  return found;
}

/**
 * Build the reviewer's worklist from approved questions.
 *
 * Ranked by how many questions use the term, because a term the bank leans on
 * is worth defining before one that appears once. Terms appearing in fewer
 * than MIN_QUESTIONS questions are dropped: a phrase used once is usually
 * incidental phrasing, not vocabulary.
 *
 * @param sources approved questions - never generated drafts.
 * @param alreadyDefined terms the glossary already holds, case-insensitive.
 */
export function glossaryCandidates(
  sources: GlossarySource[],
  alreadyDefined: string[] = [],
): TermCandidate[] {
  const defined = new Set(alreadyDefined.map((t) => t.trim().toLowerCase()));
  const byTerm = new Map<string, { display: string; questions: Set<string>; topics: Set<string> }>();

  for (const source of sources) {
    const text = [source.questionTextEn, source.explanationEn ?? ""].join(" ");
    // A term appearing three times in one explanation is still one question's
    // worth of evidence, so dedupe within the source before counting.
    for (const term of Array.from(new Set(extractTerms(text)))) {
      const key = term.toLowerCase();
      if (defined.has(key)) continue;

      const entry = byTerm.get(key) ?? { display: term, questions: new Set(), topics: new Set() };
      entry.questions.add(source.id);
      if (source.topic) entry.topics.add(source.topic);
      byTerm.set(key, entry);
    }
  }

  return Array.from(byTerm.values())
    .filter((entry) => entry.questions.size >= MIN_QUESTIONS)
    .map((entry) => ({
      term: entry.display,
      questionCount: entry.questions.size,
      sourceQuestionIds: Array.from(entry.questions).slice(0, MAX_SOURCES_PER_TERM),
      topics: Array.from(entry.topics).sort(),
    }))
    .sort((a, b) => b.questionCount - a.questionCount || a.term.localeCompare(b.term));
}
