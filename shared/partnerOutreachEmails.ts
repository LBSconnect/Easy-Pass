/**
 * The outbound partner email copy the outreach engine is allowed to send.
 *
 * Templates, not a model. Every sentence is either about MyEasyPass.net or a
 * segment-level fact. Prospect-specific fields are inserted verbatim from the
 * CRM. TEMPLATE_VERSION is stamped onto every message row for auditability.
 */

import type { PartnerSegment } from "./partners";

export const TEMPLATE_VERSION = "outreach-v4";

export interface OutreachEmailInputs {
  organizationName: string;
  segment: PartnerSegment;
  decisionMakerName?: string | null;
  /** Written during prospect research. Included verbatim only when it fits. */
  partnershipHypothesis?: string | null;
  senderName: string;
}

export interface RenderedOutreachEmail {
  subject: string;
  text: string;
}

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
    `I'm reaching out because ${org} supports people building licensed careers across Texas.`,
  other: (org) =>
    `I'm reaching out because ${org} works with people preparing for Texas licensing exams.`,
};

const PROBLEMS: Record<PartnerSegment, string> = {
  real_estate_school:
    "Students can finish coursework knowing the material but still be unsure where to focus their final review before exam day.",
  real_estate_brokerage:
    "Pre-license recruits can finish coursework but still be unsure where to focus before the state exam, which can stall the transition from recruiting to active production.",
  insurance_school:
    "Students can complete pre-licensing and still be unsure where to focus their final review before the state exam.",
  insurance_agency:
    "New producers can complete pre-licensing and still be unsure where to focus before the state exam, slowing the path from recruiting to production.",
  association:
    "Candidates often finish pre-licensing still unsure where to focus their final review before exam day.",
  other:
    "Candidates can complete their preparation and still be unsure where to focus their final review before exam day.",
};

const WHAT_IT_IS =
  "MyEasyPass.net gives Texas candidates a short bilingual readiness check, then focused practice around the areas that may need more review.";

const PILOT: Record<PartnerSegment, (org: string) => string> = {
  real_estate_school: (org) =>
    `I'd like to set up a no-cost 10-student pilot for ${org}. There is no contract, setup fee, or technical integration, and your staff does not need to manage the platform.`,
  real_estate_brokerage: (org) =>
    `I'd like to set up a no-cost 10-recruit pilot for ${org}. There is no contract, setup fee, or technical integration, and your recruiting team does not need to manage the platform.`,
  insurance_school: (org) =>
    `I'd like to set up a no-cost 10-student pilot for ${org}. There is no contract, setup fee, or technical integration, and your staff does not need to manage the platform.`,
  insurance_agency: (org) =>
    `I'd like to set up a no-cost 10-candidate pilot for ${org}. There is no contract, setup fee, or technical integration, and your team does not need to manage the platform.`,
  association: (org) =>
    `I'd like to set up a no-cost 10-candidate pilot for a small group connected to ${org}. There is no contract, setup fee, or technical integration, and your team does not need to manage the platform.`,
  other: (org) =>
    `I'd like to set up a no-cost 10-candidate pilot for ${org}. There is no contract, setup fee, or technical integration, and your team does not need to manage the platform.`,
};

const PILOT_AUDIENCE: Record<PartnerSegment, string> = {
  real_estate_school: "students",
  real_estate_brokerage: "pre-license recruits",
  insurance_school: "students",
  insurance_agency: "licensing candidates",
  association: "members' licensing candidates",
  other: "licensing candidates",
};

const TRACKED_LINK =
  "If the pilot is useful, I can prepare a tracked partner link for activation review.";

export const REPLY_CTA = `Worth sending over? Reply "yes" and I'll send the two-minute pilot outline.`;

function subject(segment: PartnerSegment, org: string): string {
  switch (segment) {
    case "real_estate_school":
    case "insurance_school":
      return `10-student readiness pilot for ${org}`;
    case "real_estate_brokerage":
      return `10-recruit licensing pilot for ${org}`;
    case "insurance_agency":
      return `10-candidate licensing pilot for ${org}`;
    case "association":
      return `Texas licensing pilot for ${org}`;
    default:
      return `Texas exam-readiness pilot for ${org}`;
  }
}

function greeting(name?: string | null): string {
  const trimmed = name?.trim();
  return trimmed ? `Hi ${trimmed},` : "Hello,";
}

function signature(senderName: string): string {
  return `${senderName}\nMyEasyPass.net | Linton Business Solutions\nhttps://MyEasyPass.net\n616 FM 1960 Road West, Suite 101\nHouston, Texas 77090-3048`;
}

export const INITIAL_MIN_WORDS = 90;
export const INITIAL_MAX_WORDS = 150;

export function renderInitialEmail(inputs: OutreachEmailInputs): RenderedOutreachEmail {
  const hypothesis = inputs.partnershipHypothesis?.trim();
  const core = [
    greeting(inputs.decisionMakerName),
    OPENERS[inputs.segment](inputs.organizationName),
    PROBLEMS[inputs.segment],
    WHAT_IT_IS,
    PILOT[inputs.segment](inputs.organizationName),
    TRACKED_LINK,
    REPLY_CTA,
  ];

  let body = core;
  if (hypothesis) {
    const withHypothesis = [...core.slice(0, 4), hypothesis, ...core.slice(4)];
    if (countWords(withHypothesis.join(" ")) <= INITIAL_MAX_WORDS) body = withHypothesis;
  }

  return {
    subject: subject(inputs.segment, inputs.organizationName),
    text: [...body, signature(inputs.senderName)].join("\n\n"),
  };
}

export function renderFollowUp1(inputs: OutreachEmailInputs): RenderedOutreachEmail {
  const audience = PILOT_AUDIENCE[inputs.segment];
  const paragraphs = [
    greeting(inputs.decisionMakerName),
    `Quick follow-up on the no-cost MyEasyPass.net pilot for ${inputs.organizationName}.`,
    `The idea is simple: let 10 ${audience} try the Texas-specific bilingual readiness check and focused practice without adding software work for your team.`,
    `If it looks useful, I can prepare a tracked partner link for activation review.`,
    REPLY_CTA,
    signature(inputs.senderName),
  ];
  return {
    subject: `Re: ${subject(inputs.segment, inputs.organizationName)}`,
    text: paragraphs.join("\n\n"),
  };
}

export function renderFollowUp2(inputs: OutreachEmailInputs): RenderedOutreachEmail {
  const paragraphs = [
    greeting(inputs.decisionMakerName),
    `Closing the loop on the MyEasyPass.net pilot for ${inputs.organizationName}. If you'd like the two-minute outline for a no-cost 10-candidate test, reply "yes" and I'll send it. Otherwise I won't email you about it again.`,
    signature(inputs.senderName),
  ];
  return {
    subject: `Re: ${subject(inputs.segment, inputs.organizationName)}`,
    text: paragraphs.join("\n\n"),
  };
}

export function renderPilotDetailsEmail(inputs: OutreachEmailInputs): RenderedOutreachEmail {
  const audience = PILOT_AUDIENCE[inputs.segment];
  const paragraphs = [
    greeting(inputs.decisionMakerName),
    `Thanks for the interest. Here's the two-minute MyEasyPass.net pilot outline for ${inputs.organizationName}:`,
    `1. Pick up to 10 ${audience}.\n2. Share MyEasyPass.net with the group.\n3. Each candidate takes a short Texas-specific bilingual readiness check that highlights areas that may need more review.\n4. Candidates can continue with focused practice if they choose.`,
    "There is no setup fee, contract, or technical integration required for the pilot. MyEasyPass.net does not guarantee exam results.",
    `If you'd like a tracked partner link prepared for ${inputs.organizationName}, reply "yes" again and I'll flag it for activation review. Nothing is activated automatically.`,
    signature(inputs.senderName),
  ];
  return {
    subject: `MyEasyPass.net 10-candidate pilot for ${inputs.organizationName}`,
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

export function unsubscribeFooter(unsubscribeUrl: string): string {
  return `--\nIf you'd rather not hear from me about this, one click here stops it: ${unsubscribeUrl}`;
}

export function countWords(text: string): number {
  return text.split(/\s+/).filter(Boolean).length;
}
