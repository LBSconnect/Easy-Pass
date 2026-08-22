/**
 * The three emails the outreach engine is allowed to send, verbatim.
 *
 * Templates, not a model - the same decision shared/partnerOutreach.ts made
 * and for the same reason: a generator would occasionally invent a fact about
 * the recipient's business, and no review step reliably catches a plausible
 * invention. Every sentence below is either about MyEasyPass or is a
 * segment-level fact visible from the organization's own public description.
 * The per-prospect fields (name, organization, hypothesis) are inserted
 * verbatim from the CRM, where a person wrote them.
 *
 * TEMPLATE_VERSION is stamped onto every message row, so a sent email can
 * always be traced to the exact wording that produced it. Change the copy,
 * bump the version.
 */

import type { PartnerSegment } from "./partners";

export const TEMPLATE_VERSION = "outreach-v1";

export interface OutreachEmailInputs {
  organizationName: string;
  segment: PartnerSegment;
  decisionMakerName?: string | null;
  /** Written by whoever researched the prospect. Included verbatim or not at all. */
  partnershipHypothesis?: string | null;
  senderName: string;
}

export interface RenderedOutreachEmail {
  subject: string;
  /** Plain text. Plain text from a person-sized sender is the honest register. */
  text: string;
}

/** Why we are writing to this organization - one public, segment-level fact. */
const OPENERS: Record<PartnerSegment, (org: string) => string> = {
  real_estate_school: (org) =>
    `I'm reaching out because ${org} prepares people for the Texas real estate licensing exam.`,
  real_estate_brokerage: (org) =>
    `I'm reaching out because ${org} brings new people into real estate careers in Texas.`,
  insurance_school: (org) =>
    `I'm reaching out because ${org} trains Texas insurance license candidates.`,
  insurance_agency: (org) =>
    `I'm reaching out because ${org} recruits and develops new insurance agents.`,
  association: (org) =>
    `I'm reaching out because ${org} supports people building careers in this industry across Texas.`,
  other: (org) =>
    `I'm reaching out because ${org} works with people preparing for Texas licensing exams.`,
};

/** The recurring problem, in the recipient's terms. */
const PROBLEMS: Record<PartnerSegment, string> = {
  real_estate_school:
    "A familiar pattern after any course: students finish the material, but many walk into the TREC exam without knowing which topics would fail them, and a failed attempt costs them money and momentum.",
  real_estate_brokerage:
    "A familiar pattern with pre-license recruits: they finish their coursework, but many sit the TREC exam without knowing which topics would fail them - and every failed attempt delays a recruit you have already invested in.",
  insurance_school:
    "A familiar pattern after any class: students leave with the material fresh, but many sit the state exam without knowing which topics would fail them, and a failed attempt costs them money and momentum.",
  insurance_agency:
    "A familiar pattern with new producers: they finish pre-licensing, but many sit the state exam without knowing which topics would fail them - and every failed attempt delays a producer you are waiting on.",
  association:
    "A familiar pattern across the industry: candidates finish their pre-licensing, but many sit the state exam without knowing which topics would fail them, and failed attempts cost them money and momentum.",
  other:
    "A familiar pattern: candidates finish their preparation, but many sit their licensing exam without knowing which topics would fail them, and a failed attempt costs them money and momentum.",
};

const WHAT_IT_IS =
  "MyEasyPass is a Texas-specific, bilingual (English/Spanish) exam practice platform. Candidates take a free readiness check that shows exactly which topics need work, then drill timed practice questions until they are ready.";

const PILOT: Record<PartnerSegment, string> = {
  real_estate_school: "I'd like to offer your students free readiness checks as a small pilot - no cost, no commitment, and you see whether it helps them.",
  real_estate_brokerage: "I'd like to offer your pre-license recruits free readiness checks as a small pilot - no cost, no commitment, and you see whether it helps them.",
  insurance_school: "I'd like to offer your students free readiness checks as a small pilot - no cost, no commitment, and you see whether it helps them.",
  insurance_agency: "I'd like to offer your candidates free readiness checks as a small pilot - no cost, no commitment, and you see whether it helps them.",
  association: "I'd like to offer your members' candidates free readiness checks as a small pilot - no cost, no commitment, and you see whether it helps them.",
  other: "I'd like to offer your candidates free readiness checks as a small pilot - no cost, no commitment, and you see whether it helps them.",
};

export const REPLY_CTA = "Would you be open to testing this with a small group of candidates?";

const SUBJECTS: Record<PartnerSegment, string> = {
  real_estate_school: "Free Texas exam readiness check for your students",
  real_estate_brokerage: "Free exam readiness check for your pre-license recruits",
  insurance_school: "Free Texas insurance exam readiness check for your students",
  insurance_agency: "Free licensing exam readiness check for your candidates",
  association: "Free licensing exam readiness resource for your members",
  other: "Free Texas licensing exam readiness check",
};

function greeting(name?: string | null): string {
  const trimmed = name?.trim();
  return trimmed ? `Hi ${trimmed},` : "Hello,";
}

function signature(senderName: string): string {
  return `${senderName}\nMyEasyPass\nwww.myeasypass.net`;
}

/** The word budget the initial email is held to (signature excluded). */
export const INITIAL_MIN_WORDS = 90;
export const INITIAL_MAX_WORDS = 150;

/**
 * The initial email. Five parts, in order: reason, problem, what it is,
 * pilot, reply CTA. Held to 90-150 words excluding the signature; the
 * researched hypothesis is included verbatim only while it fits the budget -
 * a shorter email over a bloated one, never a vaguer one over either.
 */
export function renderInitialEmail(inputs: OutreachEmailInputs): RenderedOutreachEmail {
  const hypothesis = inputs.partnershipHypothesis?.trim();

  const core = [
    greeting(inputs.decisionMakerName),
    OPENERS[inputs.segment](inputs.organizationName),
    PROBLEMS[inputs.segment],
    WHAT_IT_IS,
    PILOT[inputs.segment],
    REPLY_CTA,
  ];

  let body = core;
  if (hypothesis) {
    const withHypothesis = [...core.slice(0, 4), hypothesis, ...core.slice(4)];
    if (countWords(withHypothesis.join(" ")) <= INITIAL_MAX_WORDS) {
      body = withHypothesis;
    }
  }

  return {
    subject: SUBJECTS[inputs.segment],
    text: [...body, signature(inputs.senderName)].join("\n\n"),
  };
}

/** Follow-up #1: short reminder plus the value in one line. No urgency theater. */
export function renderFollowUp1(inputs: OutreachEmailInputs): RenderedOutreachEmail {
  const paragraphs = [
    greeting(inputs.decisionMakerName),
    `Following up on my note about a free Texas exam readiness check for ${inputs.organizationName}'s candidates.`,
    "The short version: a candidate takes a free diagnostic, sees exactly which topics need work before exam day, and can practice until they are ready. There is no cost to try it with a small group.",
    REPLY_CTA,
    signature(inputs.senderName),
  ];
  return {
    subject: `Re: ${SUBJECTS[inputs.segment]}`,
    text: paragraphs.join("\n\n"),
  };
}

/** Follow-up #2: close the loop and go quiet. The sequence ends here. */
export function renderFollowUp2(inputs: OutreachEmailInputs): RenderedOutreachEmail {
  const paragraphs = [
    greeting(inputs.decisionMakerName),
    `Last note from me on this. If a free exam readiness check for your candidates could ever be useful, just reply and I'll send the pilot details - otherwise I won't email you about it again.`,
    signature(inputs.senderName),
  ];
  return {
    subject: `Re: ${SUBJECTS[inputs.segment]}`,
    text: paragraphs.join("\n\n"),
  };
}

export function renderStep(
  step: "initial" | "follow_up_1" | "follow_up_2",
  inputs: OutreachEmailInputs,
): RenderedOutreachEmail {
  if (step === "initial") return renderInitialEmail(inputs);
  if (step === "follow_up_1") return renderFollowUp1(inputs);
  return renderFollowUp2(inputs);
}

/**
 * The unsubscribe footer, appended by the sender (not the templates) so no
 * message can be assembled without it. Plain and honest - one click, no login.
 */
export function unsubscribeFooter(unsubscribeUrl: string): string {
  return `--\nIf you'd rather not hear from me about this, one click here stops it: ${unsubscribeUrl}`;
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
