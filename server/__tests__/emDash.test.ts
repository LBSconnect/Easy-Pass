/**
 * Getting em dashes out of what students read.
 *
 * The bar these have to clear is set by the commit that swept the repo:
 * "prose was rewritten rather than having the character swapped for a hyphen".
 * A test that only checks the dash is gone would pass on output no one would
 * write, so these check the sentence that comes out.
 */
import { describe, it, expect } from "vitest";
import { normaliseEmDash, normaliseQuestion, containsEmDash } from "@shared/emDash";

describe("normaliseEmDash", () => {
  it("fixes the sentence that is actually in the live bank", () => {
    // The General Lines "aleatory" explanation. The seed file was corrected by
    // hand to exactly this; the stored row still has the dash.
    const stored =
      "Aleatory means the value exchanged by the parties is unequal—the insured pays premiums, but the insurer may pay nothing or a large claim depending on losses.";

    expect(normaliseEmDash(stored)).toBe(
      "Aleatory means the value exchanged by the parties is unequal: the insured pays premiums, but the insurer may pay nothing or a large claim depending on losses.",
    );
  });

  it("uses a colon when the dash introduces what follows", () => {
    expect(normaliseEmDash("The rule is simple—read the policy.")).toBe(
      "The rule is simple: read the policy.",
    );
  });

  it("uses commas when a pair encloses an aside", () => {
    expect(normaliseEmDash("The policy—once delivered—cannot be altered.")).toBe(
      "The policy, once delivered, cannot be altered.",
    );
  });

  it("absorbs the spaces the dash was sitting in", () => {
    // "a — b" must not become "a  :  b".
    expect(normaliseEmDash("Coverage applies — subject to the deductible.")).toBe(
      "Coverage applies: subject to the deductible.",
    );
    expect(normaliseEmDash("Coverage applies —subject to the deductible.")).toBe(
      "Coverage applies: subject to the deductible.",
    );
  });

  it("does not leave punctuation stacked up", () => {
    expect(normaliseEmDash("It depends, — on the endorsement.")).toBe(
      "It depends: on the endorsement.",
    );
  });

  it("treats an en dash in prose the same way", () => {
    expect(normaliseEmDash("Two parties – the insurer and the insured.")).toBe(
      "Two parties: the insurer and the insured.",
    );
  });

  it("never leaves a hyphen standing in for a dash", () => {
    // The thing the original sweep explicitly refused to do.
    const out = normaliseEmDash("The engine runs—without it.");
    expect(out).not.toContain(" - ");
    expect(out).toBe("The engine runs: without it.");
  });

  it("leaves clean text exactly as it is", () => {
    const clean = "A hyphenated-term and a colon: both fine.";
    expect(normaliseEmDash(clean)).toBe(clean);
  });

  it("keeps three or more balanced rather than guessing", () => {
    // Not a structure English has a rule for. Colons at least never produce a
    // sentence with an aside that opens and does not close.
    const out = normaliseEmDash("A—B—C—D");
    expect(out).not.toMatch(/[—–]/);
    expect(out).toBe("A: B: C: D");
  });
});

describe("containsEmDash", () => {
  it("finds both dash characters", () => {
    expect(containsEmDash("a—b")).toBe(true);
    expect(containsEmDash("a–b")).toBe(true);
  });

  it("is not fooled by a hyphen", () => {
    expect(containsEmDash("co-insurance")).toBe(false);
  });

  it("copes with a missing explanation", () => {
    expect(containsEmDash(null)).toBe(false);
    expect(containsEmDash(undefined)).toBe(false);
  });
});

describe("normaliseQuestion", () => {
  const clean = {
    questionTextEn: "What is an aleatory contract?",
    questionTextEs: "¿Qué es un contrato aleatorio?",
    optionsEn: ["One", "Two"],
    optionsEs: ["Uno", "Dos"],
    explanationEn: "Because the values exchanged are unequal.",
    explanationEs: "Porque los valores intercambiados son desiguales.",
  };

  it("says nothing needs doing when the question is clean", () => {
    // Almost every row is already fine, and the caller skips the write.
    expect(normaliseQuestion(clean)).toBeNull();
  });

  it("rewrites an explanation in either language", () => {
    const out = normaliseQuestion({
      ...clean,
      explanationEs: "Los valores son desiguales—el asegurado paga primas.",
    });

    expect(out?.explanationEs).toBe("Los valores son desiguales: el asegurado paga primas.");
    // Everything else is left alone.
    expect(out?.explanationEn).toBe(clean.explanationEn);
  });

  it("rewrites the answer options too", () => {
    // A dash in an option is as visible to a student as one in the question.
    const out = normaliseQuestion({ ...clean, optionsEn: ["One", "Two—or more"] });

    expect(out?.optionsEn).toEqual(["One", "Two: or more"]);
  });

  it("rewrites the question text", () => {
    const out = normaliseQuestion({ ...clean, questionTextEn: "Which applies—and why?" });

    expect(out?.questionTextEn).toBe("Which applies: and why?");
  });

  it("leaves a missing explanation missing rather than inventing one", () => {
    const out = normaliseQuestion({
      ...clean,
      explanationEn: null,
      explanationEs: "Desiguales—sí.",
    });

    expect(out?.explanationEn).toBeNull();
  });

  it("is idempotent, so running it twice changes nothing the second time", () => {
    // It runs on every boot.
    const first = normaliseQuestion({ ...clean, explanationEn: "Unequal—the insured pays." })!;
    expect(normaliseQuestion(first)).toBeNull();
  });
});
