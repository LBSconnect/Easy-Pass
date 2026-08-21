/**
 * How a prospect gets prioritised, and why it is arithmetic rather than a model.
 *
 * WHAT THIS SCORE IS
 *
 * A sort order for a list of sixty-two organizations, so the first week of
 * outreach starts at the top rather than at whichever row was pasted in first.
 *
 * WHAT IT IS NOT
 *
 * A probability that anyone will sign. Nothing here has been fitted to any
 * outcome, because there are no outcomes yet - the first partner has not been
 * signed. Presenting this as a likelihood would be inventing evidence.
 *
 * WHY NOT A MODEL
 *
 * Whoever is doing outreach has to be able to disagree with the ranking, and
 * that requires seeing what produced it. Four visible components with stated
 * weights can be argued with; a number from a model can only be believed or
 * ignored. The components are also exactly the four questions a person asks
 * when looking at a row, which is not a coincidence - it is the design.
 */

export interface ScoreComponents {
  /** How many licence candidates realistically pass through them. 0-5. */
  candidatePipeline: number;
  /** How well exam readiness fits what they already do. 0-5. */
  productFit: number;
  /** How reachable the person who can say yes is. 0-5. */
  decisionMakerAccess: number;
  /** How large the audience is if it works. 0-5. */
  audienceScale: number;
}

/** Stated on the admin screen next to the score, so the weighting is arguable. */
export const SCORE_WEIGHTS = {
  candidatePipeline: 0.35,
  productFit: 0.3,
  decisionMakerAccess: 0.2,
  audienceScale: 0.15,
} as const;

export const MAX_COMPONENT = 5;

export interface ScoreBreakdownEntry {
  key: keyof ScoreComponents;
  label: string;
  value: number;
  weight: number;
  /** This component's contribution to the final 0-100. */
  contribution: number;
}

export interface ProspectScore {
  score: number;
  breakdown: ScoreBreakdownEntry[];
}

const LABELS: Record<keyof ScoreComponents, string> = {
  candidatePipeline: "Candidate pipeline strength",
  productFit: "MyEasyPass product fit",
  decisionMakerAccess: "Ease of reaching decision maker",
  audienceScale: "Estimated audience scale",
};

function clamp(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.min(MAX_COMPONENT, Math.max(0, value));
}

/** The score, 0-100, with the arithmetic that produced it. */
export function scoreProspect(components: ScoreComponents): ProspectScore {
  const breakdown = (Object.keys(SCORE_WEIGHTS) as Array<keyof ScoreComponents>).map((key) => {
    const value = clamp(components[key]);
    const weight = SCORE_WEIGHTS[key];
    return {
      key,
      label: LABELS[key],
      value,
      weight,
      contribution: (value / MAX_COMPONENT) * weight * 100,
    };
  });

  const total = breakdown.reduce((sum, entry) => sum + entry.contribution, 0);
  return { score: Math.round(total), breakdown };
}

export interface ScoreInputs {
  /** TREC's published sales-agent exam count, where the source file has one. */
  knownExamVolume?: number | null;
  priority?: string | null;
  segment?: string | null;
  hasContactEmail?: boolean;
  hasContactPhone?: boolean;
  hasDecisionMaker?: boolean;
}

/**
 * A starting set of components derived from what the import actually knows.
 *
 * Deliberately coarse. This exists so a freshly imported list is not sixty-two
 * identical zeros, not so it can be trusted - an admin override is the point,
 * and the derived value is only ever a default until somebody who has done the
 * research changes it.
 */
export function deriveComponents(inputs: ScoreInputs): ScoreComponents {
  const volume = inputs.knownExamVolume ?? null;

  // TREC's own exam counts, which are the only hard numbers in the source data.
  // Anything above a few thousand candidates a year is a large pipeline by the
  // standard of this list; the bands are wide because the underlying figure is
  // annual and approximate.
  let candidatePipeline: number;
  if (volume === null) candidatePipeline = 2;
  else if (volume >= 8000) candidatePipeline = 5;
  else if (volume >= 3000) candidatePipeline = 4;
  else if (volume >= 1000) candidatePipeline = 3;
  else if (volume >= 250) candidatePipeline = 2;
  else candidatePipeline = 1;

  // Priority is a judgement a person already made while researching the row.
  // It stands in for scale rather than for fit, because that is what it was
  // recorded to mean.
  const priority = (inputs.priority ?? "").toLowerCase();
  let audienceScale = 2;
  if (priority === "very high") audienceScale = 5;
  else if (priority === "high") audienceScale = 4;
  else if (priority === "medium") audienceScale = 3;
  else if (priority === "low") audienceScale = 1;

  // Schools and associations already teach or convene licence candidates, so
  // exam readiness is an addition to something they do rather than a new idea.
  // Brokerages and agencies recruit, which is a good fit but a longer
  // conversation, since exam prep is adjacent to their business rather than in it.
  const segment = inputs.segment ?? "";
  let productFit = 3;
  if (segment === "real_estate_school" || segment === "insurance_school") productFit = 5;
  else if (segment === "association") productFit = 4;
  else if (segment === "real_estate_brokerage" || segment === "insurance_agency") productFit = 3;
  else productFit = 2;

  // Reachability, counted from what we actually hold. A named person is worth
  // more than a switchboard number, because outreach to "info@" mostly is not
  // outreach at all.
  let decisionMakerAccess = 0;
  if (inputs.hasDecisionMaker) decisionMakerAccess += 3;
  if (inputs.hasContactEmail) decisionMakerAccess += 1;
  if (inputs.hasContactPhone) decisionMakerAccess += 1;

  return { candidatePipeline, productFit, decisionMakerAccess, audienceScale };
}
