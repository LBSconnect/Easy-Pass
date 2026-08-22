/**
 * The outbound partner email copy the outreach engine is allowed to send.
 *
 * Templates, not a model - the same decision shared/partnerOutreach.ts made
 * and for the same reason: a generator would occasionally invent a fact about
 * the recipient's business, and no review step reliably catches a plausible
 * invention. Every sentence below is either about MyEasyPass.net or is a
 * segment-level fact visible from the organization's own public description.
 * The per-prospect fields (name, organization, hypothesis) are inserted
 * verbatim from the CRM, where a person wrote them.
 *
 * TEMPLATE_VERSION is stamped onto every message row, so a sent email can
 * always be traced to the exact wording that produced it. Change the copy,
 * bump the version.
 */

import type { PartnerSegment } from "./partners";

export const TEMPLATE_VERSION = "outreach-v3";

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

/** The recurring problem, stated without pretending a short diagnostic predicts failure. */
const PROBLEMS: Record<PartnerSegment, string> = {
  real_estate_school:
    "Students often finish their coursework still unsure which areas deserve more review before exam day, and a failed attempt can cost them time, money, and momentum.",
  real_estate_brokerage:
    "Pre-license recruits often finish coursework still unsure where they need more review before the licensing exam, and every delayed pass can slow down a recruit you have already invested in.",
  insurance_school:
    "Students often finish pre-licensing still unsure which areas deserve more review before exam day, and a failed attempt can cost them time, money, and momentum.",
  insurance_agency:
    "New producers often finish pre-licensing still unsure where they need more review before the state exam, and every delayed pass can slow down the path from recruiting to production.",
  association:
    "Licensing candidates often finish pre-licensing still unsure which areas deserve more review before exam day, and a failed attempt can cost them time, money, and momentum.",
  other:
    "Licensing candidates often finish their preparation still unsure which areas deserve more review before exam day, and a failed attempt can cost them time, money, and momentum.",
};

const WHAT_IT_IS =
  "MyEasyPass.net is a Texas-specific, bilingual (English/Spanish) exam-practice platform that gives candidates a quick way to see where they may need more review before exam day, then provides focused practice around those areas. For your organization, that means an additional pre-exam readiness resource without adding work for your staff.";

const PILOT: Record<PartnerSegment, string> = {
  real_estate_school: "I'd like to offer your students a free readiness-check pilot - no cost, no commitment, and no technical integration required.",
  real_estate_brokerage: "I'd like to offer your pre-license recruits a free readiness-check pilot - no cost, no commitment, and no technical integration required.",
  insurance_school: "I'd like to offer your students a free readiness-check pilot - no cost, no commitment, and no technical integration required.",
  insurance_agency: "I'd like to offer your candidates a free readiness-check pilot - no cost, no commitment, and no technical integration required.",
  association: "I'd like to offer a small group of your members' candidates a free readiness-check pilot - no cost, no commitment, and no technical integration required.",
  other: "I'd like to offer a small group of your candidates a free readiness-check pilot - no cost, no commitment, and no technical integration required.",
};

const PILOT_AUDIENCE: Record<PartnerSegment, string> = {
  real_estate_school: "students",
  real_estate_brokerage: "pre-license recruits",
  insurance_school: "students",
  insurance_agency: "licensing candidates",
  association: "members' licensing candidates",
  other: "licensing candidates",
};

// The existing conservative classifier already treats a bare "yes" as
// interested, so the lowest-friction CTA and the automation agree exactly.
export const REPLY_CTA = `If this could be useful, just reply "yes" and I'll send the pilot details.`;

const SUBJECTS: Record<PartnerSegment, string> = {
  real_estate_school: "A readiness tool for your Texas real estate students",
  real_estate_brokerage: "Licensing readiness for your pre-license recruits",
  insurance_school: "A readiness tool for your Texas insurance students",
  insurance_agency: "Licensing readiness for your new producers",
  association: "Texas licensing readiness for your members",
  other: "Texas licensing readiness for your candidates",
};

function greeting(name?: string | null): string {
  const trimmed = name?.trim();
  return trimmed ? `Hi ${trimmed},` : "Hello,";
}

/**
 * Commercial-mail identity. Keep the real operating address in the message
 * itself rather than relying on provider-specific footer behavior.
 */
function signature(senderName: string): string {
  return `${senderName}\nMyEasyPass.net | Linton Business Solutions\nhttps://MyEasyPass.net\n616 FM 1960 Road West, Suite 101\nHouston, Texas 77090-3048`;
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
    `Following up on my note about a MyEasyPass.net Texas exam-readiness pilot for ${inputs.organizationName}'s candidates.`,
    "The short version: a candidate takes a brief readiness check, sees areas that may deserve more review before exam day, and can use focused practice to strengthen them. There is no cost or technical integration required for a small pilot.",
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
    `Last note from me on this. If a MyEasyPass.net exam-readiness pilot for your candidates could ever be useful, just reply "yes" and I'll send the details - otherwise I won't email you about it again.`,
    signature(inputs.senderName),
  ];
  return {
    subject: `Re: ${SUBJECTS[inputs.segment]}`,
    text: paragraphs.join("\n\n"),
  };
}

/**
 * Sent automatically only after a reply has already been conservatively
 * classified as interested. It explains the pilot without activating a
 * partnership or claiming any outcome the readiness check cannot prove.
 */
export function renderPilotDetailsEmail(inputs: OutreachEmailInputs): RenderedOutreachEmail {
  const audience = PILOT_AUDIENCE[inputs.segment];
  const paragraphs = [
    greeting(inputs.decisionMakerName),
    `Thanks for the interest. Here's the simple MyEasyPass.net pilot for ${inputs.organizationName}:`,
    `1. You share MyEasyPass.net with a small group of ${audience}.\n2. They take a short Texas-specific readiness check that highlights areas that may need more review.\n3. They can continue with focused practice if they choose.`,
    "There is no setup fee, contract, or technical integration required for the pilot. MyEasyPass.net does not guarantee exam results.",
    `If you'd like a tracked partner link prepared for ${inputs.organizationName}, reply "yes" again and I'll flag it for activation review. Nothing is activated automatically.`,
    signature(inputs.senderName),
  ];
  return {
    subject: `MyEasyPass.net pilot details for ${inputs.organizationName}`,
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
