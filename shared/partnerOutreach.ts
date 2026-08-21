/**
 * Draft outreach, written by a template and sent by a person.
 *
 * WHAT THIS DELIBERATELY CANNOT DO
 *
 * Send anything. There is no transport in this file and none is imported by
 * it. It returns a subject and a body; a human reads them, edits them, and
 * decides whether that organization hears from us at all.
 *
 * That is a product decision, not a technical limitation. These are small
 * businesses and schools who did not ask to be contacted, and the difference
 * between outreach and spam is precisely whether a person chose to send each
 * one.
 *
 * WHY TEMPLATES AND NOT A MODEL
 *
 * A model would write warmer copy and would occasionally invent a fact about
 * the recipient's business. A first email that misdescribes what someone does
 * is worse than a plain one, and there is no review step that reliably catches
 * a plausible invention. Every claim below is either about MyEasyPass or is a
 * field a person typed.
 */

import type { PartnerSegment } from "./partners";

export interface OutreachInputs {
  organizationName: string;
  segment: PartnerSegment;
  /** The named person, when we have one. Falls back to a neutral greeting. */
  decisionMakerName?: string | null;
  /**
   * How MyEasyPass fits this specific organization, written by whoever
   * researched them. Included verbatim when present, omitted when not - an
   * empty hypothesis produces a shorter email rather than a vaguer one.
   */
  partnershipHypothesis?: string | null;
  /** Who is sending it. */
  senderName?: string | null;
}

export interface OutreachDraft {
  subject: string;
  body: string;
}

const SUBJECTS: Record<PartnerSegment, string> = {
  real_estate_school: "Free Texas exam readiness check for your students",
  real_estate_brokerage: "Free Texas exam readiness tool for your pre-license recruits",
  insurance_school: "Free Texas insurance exam readiness check for your students",
  insurance_agency: "Free Texas licensing exam readiness check for your candidates",
  association: "Free Texas licensing exam readiness resource for your members",
  other: "Free Texas licensing exam readiness check",
};

/**
 * The one sentence that says why we are writing to this organization
 * specifically. Each is a fact about them that we can see publicly.
 */
const OPENERS: Record<PartnerSegment, (org: string) => string> = {
  real_estate_school: (org) => `I noticed ${org} prepares a large number of Texas real estate licence candidates.`,
  real_estate_brokerage: (org) => `I noticed ${org} actively supports people entering real estate careers.`,
  insurance_school: (org) => `I noticed ${org} trains Texas insurance licence candidates.`,
  insurance_agency: (org) => `I noticed ${org} recruits and develops new insurance producers.`,
  association: (org) => `I noticed ${org} supports people entering the industry across Texas.`,
  other: (org) => `I noticed ${org} works with people preparing for Texas licensing exams.`,
};

/** What we are offering, in the recipient's own terms. */
const OFFERS: Record<PartnerSegment, string> = {
  real_estate_school:
    "MyEasyPass is a Texas-specific exam readiness and practice platform. I would like to give your students a free readiness assessment that shows them where they are weak before the TREC exam, with an optional focused study path afterwards.",
  real_estate_brokerage:
    "MyEasyPass is a Texas-specific exam readiness and practice platform. I would like to give your pre-license recruits a free readiness assessment that shows them where they are weak before the TREC exam, with an optional focused study path afterwards.",
  insurance_school:
    "MyEasyPass is a Texas-specific exam readiness and practice platform. I would like to give your students a free readiness assessment that shows them where they are weak before the state licensing exam, with an optional focused study path afterwards.",
  insurance_agency:
    "MyEasyPass is a Texas-specific exam readiness and practice platform. I would like to give your producer candidates a free readiness assessment that shows them where they are weak before the state licensing exam, with an optional focused study path afterwards.",
  association:
    "MyEasyPass is a Texas-specific exam readiness and practice platform. I would like to offer your members a free readiness assessment that shows candidates where they are weak before the state licensing exam, with an optional focused study path afterwards.",
  other:
    "MyEasyPass is a Texas-specific exam readiness and practice platform. I would like to offer a free readiness assessment that shows candidates where they are weak before their licensing exam, with an optional focused study path afterwards.",
};

/**
 * Build the draft.
 *
 * Nothing here promises a pass rate, claims an affiliation with TREC, TDI or
 * Pearson VUE, or describes a relationship that does not exist. The offer is a
 * free readiness check and a conversation, which is all we actually have.
 */
export function buildOutreachDraft(inputs: OutreachInputs): OutreachDraft {
  const greetingName = inputs.decisionMakerName?.trim();
  const greeting = greetingName ? `Hi ${greetingName},` : "Hello,";

  const hypothesis = inputs.partnershipHypothesis?.trim();
  const sender = inputs.senderName?.trim() || "Sean";

  const paragraphs = [
    greeting,
    OPENERS[inputs.segment](inputs.organizationName),
    OFFERS[inputs.segment],
    // Only present when somebody wrote one. A placeholder left in an email is
    // worse than a shorter email.
    ...(hypothesis ? [hypothesis] : []),
    "There is no cost to test the resource with a small group.",
    "Would you be open to a short pilot?",
    `${sender}\nMyEasyPass`,
  ];

  return {
    subject: SUBJECTS[inputs.segment],
    body: paragraphs.join("\n\n"),
  };
}
