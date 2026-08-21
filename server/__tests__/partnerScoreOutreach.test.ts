import { describe, it, expect } from "vitest";
import { scoreProspect, deriveComponents, SCORE_WEIGHTS } from "@shared/partnerScore";
import { buildOutreachDraft } from "@shared/partnerOutreach";
import {
  isPubliclyActive,
  suggestedCategory,
  normalizePriority,
  validatePartnerState,
  partnerCodeChangeProblem,
} from "@shared/partners";

describe("scoreProspect", () => {
  it("scores nothing as zero and everything as one hundred", () => {
    const none = { candidatePipeline: 0, productFit: 0, decisionMakerAccess: 0, audienceScale: 0 };
    const all = { candidatePipeline: 5, productFit: 5, decisionMakerAccess: 5, audienceScale: 5 };

    expect(scoreProspect(none).score).toBe(0);
    expect(scoreProspect(all).score).toBe(100);
  });

  it("weights the components as advertised", () => {
    // The weights are shown to the person using the screen, so they have to be
    // the weights actually applied - otherwise the explanation is decoration.
    const onlyPipeline = scoreProspect({ candidatePipeline: 5, productFit: 0, decisionMakerAccess: 0, audienceScale: 0 });
    expect(onlyPipeline.score).toBe(Math.round(SCORE_WEIGHTS.candidatePipeline * 100));

    const onlyFit = scoreProspect({ candidatePipeline: 0, productFit: 5, decisionMakerAccess: 0, audienceScale: 0 });
    expect(onlyFit.score).toBe(Math.round(SCORE_WEIGHTS.productFit * 100));
  });

  it("shows its working", () => {
    const { breakdown } = scoreProspect({ candidatePipeline: 3, productFit: 4, decisionMakerAccess: 1, audienceScale: 2 });

    expect(breakdown.map((b) => b.key)).toEqual([
      "candidatePipeline", "productFit", "decisionMakerAccess", "audienceScale",
    ]);
    // Every entry can be read back as "this component contributed this much".
    for (const entry of breakdown) {
      expect(entry.label.length).toBeGreaterThan(0);
      expect(entry.contribution).toBeCloseTo((entry.value / 5) * entry.weight * 100, 5);
    }
  });

  it("clamps rather than trusting a stored value", () => {
    expect(scoreProspect({ candidatePipeline: 99, productFit: -4, decisionMakerAccess: 0, audienceScale: 0 }).score)
      .toBe(Math.round(SCORE_WEIGHTS.candidatePipeline * 100));
    expect(scoreProspect({ candidatePipeline: NaN, productFit: 0, decisionMakerAccess: 0, audienceScale: 0 }).score).toBe(0);
  });
});

describe("deriveComponents", () => {
  it("ranks a large published exam volume above a small one", () => {
    const big = deriveComponents({ knownExamVolume: 15547 });
    const small = deriveComponents({ knownExamVolume: 120 });

    expect(big.candidatePipeline).toBeGreaterThan(small.candidatePipeline);
  });

  it("rates a school's product fit above a brokerage's", () => {
    // A school already teaches licence candidates; exam readiness is an
    // addition to what they do rather than a new idea.
    expect(deriveComponents({ segment: "real_estate_school" }).productFit)
      .toBeGreaterThan(deriveComponents({ segment: "real_estate_brokerage" }).productFit);
  });

  it("values a named decision maker over a switchboard", () => {
    const named = deriveComponents({ hasDecisionMaker: true });
    const number = deriveComponents({ hasContactPhone: true });

    expect(named.decisionMakerAccess).toBeGreaterThan(number.decisionMakerAccess);
  });

  it("gives an unresearched row a middling default rather than a zero", () => {
    const score = scoreProspect(deriveComponents({})).score;
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(100);
  });
});

describe("isPubliclyActive", () => {
  it("is true only for an activated partner", () => {
    expect(isPubliclyActive("active_partner", true)).toBe(true);
  });

  it.each([
    ["prospect", true],
    ["contacted", true],
    ["interested", true],
    // A pilot is a conversation, not a live link.
    ["pilot", true],
    ["inactive_partner", true],
    ["not_a_fit", true],
    ["active_partner", false],
  ])("is false for %s / active=%s", (status, active) => {
    expect(isPubliclyActive(status, active)).toBe(false);
  });

  it("is false for missing values", () => {
    expect(isPubliclyActive(null, null)).toBe(false);
    expect(isPubliclyActive(undefined, undefined)).toBe(false);
  });
});

describe("suggestedCategory", () => {
  it("suggests real estate for real estate organizations", () => {
    expect(suggestedCategory("real_estate_school")).toBe("real_estate");
    expect(suggestedCategory("real_estate_brokerage")).toBe("real_estate");
  });

  it("refuses to guess for insurance", () => {
    // An insurance agency might send life, property and casualty or general
    // lines candidates. Guessing drops a visitor into the wrong exam.
    expect(suggestedCategory("insurance_agency")).toBeNull();
    expect(suggestedCategory("insurance_school")).toBeNull();
    expect(suggestedCategory("association")).toBeNull();
    expect(suggestedCategory("other")).toBeNull();
  });
});

describe("normalizePriority", () => {
  it("accepts the values the files use", () => {
    expect(normalizePriority("Very High")).toBe("Very High");
    expect(normalizePriority("high")).toBe("High");
  });

  it("returns null for anything else", () => {
    // A mis-split row can leave a sentence fragment here; it must not become
    // a priority.
    expect(normalizePriority("P&C licensing")).toBeNull();
    expect(normalizePriority(null)).toBeNull();
  });
});

describe("buildOutreachDraft", () => {
  const base = { organizationName: "Realty Texas", segment: "real_estate_brokerage" as const };

  it("addresses a named person", () => {
    expect(buildOutreachDraft({ ...base, decisionMakerName: "Jane" }).body).toContain("Hi Jane,");
  });

  it("uses a neutral greeting when nobody is named", () => {
    const body = buildOutreachDraft(base).body;
    expect(body).toContain("Hello,");
    expect(body).not.toContain("[Name]");
  });

  it("includes the hypothesis when there is one", () => {
    const hypothesis = "Give KSCORE graduates a free readiness check before scheduling.";
    expect(buildOutreachDraft({ ...base, partnershipHypothesis: hypothesis }).body).toContain(hypothesis);
  });

  it("leaves no placeholder when there is no hypothesis", () => {
    // A shorter email beats one with [PARTNERSHIP HYPOTHESIS] left in it.
    const body = buildOutreachDraft({ ...base, partnershipHypothesis: "   " }).body;
    expect(body).not.toMatch(/\[.*\]/);
  });

  it("writes a different opener per segment", () => {
    const openers = new Set(
      (["real_estate_school", "real_estate_brokerage", "insurance_school", "insurance_agency", "association"] as const)
        .map((segment) => buildOutreachDraft({ ...base, segment }).body.split("\n\n")[1]),
    );
    expect(openers.size).toBe(5);
  });

  it("promises nothing we cannot deliver", () => {
    const forbidden = /guarantee|guaranteed|pass rate|first try|100%|TREC-approved|official|endorsed|partnered with/i;

    for (const segment of ["real_estate_school", "real_estate_brokerage", "insurance_school", "insurance_agency", "association", "other"] as const) {
      const draft = buildOutreachDraft({ organizationName: "Acme", segment });
      expect(draft.subject).not.toMatch(forbidden);
      expect(draft.body).not.toMatch(forbidden);
    }
  });

  it("does not claim a relationship that does not exist", () => {
    const body = buildOutreachDraft(base).body;
    expect(body).toMatch(/open to a short pilot/i);
    expect(body).not.toMatch(/our partner|we work with|as a partner/i);
  });
});

describe("validatePartnerState", () => {
  const live = {
    partnerStatus: "active_partner",
    partnerCode: "kw-southwest",
    defaultExamCategory: "real_estate",
    partnerActive: true,
  };

  it("accepts a complete active partner", () => {
    expect(validatePartnerState(live)).toEqual([]);
  });

  it("says nothing about a record that is not active", () => {
    // A prospect with no code and no exam is a perfectly normal prospect.
    expect(validatePartnerState({ partnerActive: false })).toEqual([]);
    expect(validatePartnerState({})).toEqual([]);
  });

  it("refuses an active partner with no exam", () => {
    // The case the old patch-shaped check missed entirely: clearing the exam
    // on its own left the link live and pointing at nothing.
    const problems = validatePartnerState({ ...live, defaultExamCategory: null });

    expect(problems).toHaveLength(1);
    expect(problems[0]).toMatchObject({ field: "defaultExamCategory", status: 400 });
  });

  it("refuses an active partner with no code", () => {
    expect(validatePartnerState({ ...live, partnerCode: null })[0]).toMatchObject({
      field: "partnerCode",
      status: 400,
    });
  });

  it("refuses an active partner whose code could never resolve", () => {
    expect(validatePartnerState({ ...live, partnerCode: "  " })[0]).toMatchObject({ field: "partnerCode" });
  });

  it.each(["prospect", "interested", "pilot", "inactive_partner", "not_a_fit"])(
    "refuses an active link on a %s",
    (status) => {
      expect(validatePartnerState({ ...live, partnerStatus: status })[0]).toMatchObject({
        field: "partnerStatus",
        status: 400,
      });
    },
  );

  it("reports every problem, so the first one returned is a real choice", () => {
    expect(validatePartnerState({ partnerActive: true })).toHaveLength(3);
  });
});

describe("partnerCodeChangeProblem", () => {
  const live = { partnerCode: "kw-southwest", partnerCreatedAt: new Date("2026-08-01") };
  const draft = { partnerCode: "kw-southwest", partnerCreatedAt: null };

  it("allows a code to be set before the link has ever been live", () => {
    expect(partnerCodeChangeProblem(draft, "kw-score")).toBeNull();
    expect(partnerCodeChangeProblem({ partnerCode: null, partnerCreatedAt: null }, "anything")).toBeNull();
  });

  it("refuses to rename a code that has been live", () => {
    // Analytics events carry the code they were recorded under, and the report
    // joins them to the partner's current code. Renaming does not move the
    // history, it detaches it.
    const problem = partnerCodeChangeProblem(live, "kw-score");

    expect(problem).toMatchObject({ field: "partnerCode", status: 409 });
    expect(problem!.message).toMatch(/cannot be changed/i);
  });

  it("refuses to clear a code that has been live", () => {
    for (const cleared of ["", null]) {
      const problem = partnerCodeChangeProblem(live, cleared);
      expect(problem).toMatchObject({ status: 409 });
      expect(problem!.message).toMatch(/cannot be cleared/i);
    }
  });

  it("allows a request that does not touch the code", () => {
    // Deactivating, renaming the display name, adding notes - none of these
    // are code changes, and none may be blocked by this rule.
    expect(partnerCodeChangeProblem(live, undefined)).toBeNull();
  });

  it("allows resubmitting the same code, however it was typed", () => {
    // The admin form posts every field back, so the unchanged code arrives on
    // requests that have nothing to do with it.
    expect(partnerCodeChangeProblem(live, "kw-southwest")).toBeNull();
    expect(partnerCodeChangeProblem(live, "KW Southwest")).toBeNull();
  });

  it("locks the code of a row that is switched on but never went through the route", () => {
    // partner_created_at is stamped by the admin route. A row activated any
    // other way - a fixture, a migration, a hand-written UPDATE during an
    // incident - has a live link and no stamp, and its code is just as load
    // bearing as anyone else's.
    const activeWithoutStamp = { partnerCode: "kw-southwest", partnerCreatedAt: null, partnerActive: true };

    expect(partnerCodeChangeProblem(activeWithoutStamp, "kw-score")).toMatchObject({ status: 409 });
    expect(partnerCodeChangeProblem(activeWithoutStamp, null)).toMatchObject({ status: 409 });
    expect(partnerCodeChangeProblem(activeWithoutStamp, "kw-southwest")).toBeNull();
  });

  it("keeps the code locked after the link is switched off", () => {
    // Deactivating is not un-publishing: the events recorded under that code
    // are still in the report, and the link may be switched back on.
    const retired = { partnerCode: "kw-southwest", partnerCreatedAt: new Date("2026-08-01"), partnerActive: false };

    expect(partnerCodeChangeProblem(retired, "kw-score")).toMatchObject({ status: 409 });
  });
});
