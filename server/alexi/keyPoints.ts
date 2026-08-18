/**
 * Key points for a concept, for the teach step.
 *
 * WHERE THE FACTS COME FROM
 *
 * Not from the model, and not from me. Every line here is drawn from the
 * approved explanations already attached to questions in the bank - content
 * the business has reviewed and stands behind. Writing bullet points about
 * Texas insurance and real-estate regulation from memory is precisely the
 * thing the grounding rule exists to prevent, and a confidently wrong fact on
 * a licensing product is worse than a thin one.
 *
 * So this distils rather than authors: it takes the first substantive sentence
 * of each distinct approved explanation on the concept, deduplicates them, and
 * returns the strongest few.
 *
 * A human-authored list in the study-topic config always wins. That field is
 * the place for real editorial content when a subject-matter expert writes it;
 * until then, the distilled version is a genuine improvement on nothing and is
 * true by construction.
 */

/** More than this stops being a lead-in and becomes a wall of text. */
export const MAX_KEY_POINTS = 5;

/** Below this a "sentence" is a fragment, not a point. */
const MIN_POINT_CHARS = 25;

/** Above this it is a paragraph and belongs in the worked example instead. */
const MAX_POINT_CHARS = 220;

export interface KeyPointSource {
  topic: string;
  explanation: string | null;
}

/**
 * First substantive sentence of an explanation.
 *
 * Splits on sentence enders followed by whitespace. Abbreviations common in
 * this material - "Sec.", "Art.", "No.", "vs." - would otherwise split a
 * sentence in half, so they are stitched back.
 */
export function firstSentence(text: string): string {
  const cleaned = text.trim().replace(/\s+/g, " ");
  if (!cleaned) return "";

  const parts: string[] = [];
  let buffer = "";
  for (const chunk of cleaned.split(/(?<=[.!?])\s+/)) {
    buffer = buffer ? `${buffer} ${chunk}` : chunk;
    // A trailing known abbreviation means the sentence has not ended.
    if (/\b(Sec|Art|No|vs|e\.g|i\.e|approx|Inc|Co|Ch)\.$/i.test(buffer)) continue;
    parts.push(buffer);
    buffer = "";
  }
  if (buffer) parts.push(buffer);

  const first = parts[0] ?? cleaned;
  return first.length > MAX_POINT_CHARS ? "" : first;
}

/** Comparison key for near-duplicate detection. */
function normalise(point: string): string {
  return point.toLowerCase().replace(/[^a-z0-9áéíóúñü ]/gi, "").replace(/\s+/g, " ").trim();
}

/**
 * Distil key points for one concept from the approved explanations on it.
 *
 * Returns an empty array rather than padding: with nothing approved to say,
 * the teach step falls back to worked examples alone, which is honest.
 */
export function deriveKeyPoints(
  sources: KeyPointSource[],
  conceptTopic: string | null,
  limit: number = MAX_KEY_POINTS,
): string[] {
  const want = conceptTopic?.trim().toLowerCase() ?? null;

  const onConcept = want
    ? sources.filter((s) => s.topic.trim().toLowerCase() === want)
    : sources;

  const points: string[] = [];
  const seen = new Set<string>();

  for (const source of onConcept) {
    if (points.length >= limit) break;
    if (!source.explanation) continue;

    const point = firstSentence(source.explanation);
    if (point.length < MIN_POINT_CHARS) continue;

    const key = normalise(point);
    if (!key || seen.has(key)) continue;

    seen.add(key);
    points.push(point);
  }

  return points;
}

/**
 * Human-authored points if the config has them, otherwise the distilled set.
 *
 * Authored content wins outright rather than being merged: an editor who has
 * written five points has chosen those five, and silently appending machine
 * output to their list would undo that choice.
 */
export function keyPointsFor(
  authored: string[] | undefined,
  sources: KeyPointSource[],
  conceptTopic: string | null,
): { points: string[]; source: "authored" | "derived" | "none" } {
  const cleanAuthored = (authored ?? []).map((p) => p.trim()).filter(Boolean);
  if (cleanAuthored.length > 0) {
    return { points: cleanAuthored.slice(0, MAX_KEY_POINTS), source: "authored" };
  }

  const derived = deriveKeyPoints(sources, conceptTopic);
  return derived.length > 0
    ? { points: derived, source: "derived" }
    : { points: [], source: "none" };
}
