/**
 * Auditing the shipped question bank.
 *
 * The point of these tests is that a real defect in a real question is
 * caught, and that a sound question is left alone. The second half matters
 * as much as the first: an audit that flags everything tells an operator
 * nothing, and they will stop reading it.
 */
import { describe, it, expect } from "vitest";
import {
  auditQuestion,
  auditBank,
  findNearDuplicates,
  findThinTopics,
  MIN_TOPIC_QUESTIONS,
  type BankQuestion,
} from "../alexi/bankAudit";

const sound = (over: Partial<BankQuestion> = {}): BankQuestion => ({
  id: "q1",
  category: "life_insurance",
  topic: "li_policies",
  questionTextEn: "Which policy builds cash value the policyholder may borrow against?",
  questionTextEs: "Cual poliza acumula valor en efectivo contra el que se puede pedir prestado?",
  optionsEn: ["Term life", "Whole life", "Accidental death", "Credit life"],
  optionsEs: ["Vida a termino", "Vida entera", "Muerte accidental", "Vida de credito"],
  correctAnswer: 1,
  explanationEn: "Whole life accrues cash value that the owner can borrow against as a policy loan.",
  explanationEs: "La vida entera acumula valor en efectivo que el titular puede pedir prestado.",
  ...over,
});

const codes = (q: BankQuestion) => auditQuestion(q).map((f) => f.code);

describe("auditQuestion - a sound question", () => {
  it("reports nothing", () => {
    expect(auditQuestion(sound())).toEqual([]);
  });
});

describe("auditQuestion - things that break the question", () => {
  it("catches a missing Spanish stem", () => {
    // The Spanish paper is a paper a student actually sits, not a nicety.
    expect(codes(sound({ questionTextEs: "   " }))).toContain("missing_question_es");
  });

  it("catches an answer index pointing past the options", () => {
    expect(codes(sound({ correctAnswer: 7 }))).toContain("answer_out_of_range");
    expect(codes(sound({ correctAnswer: -1 }))).toContain("answer_out_of_range");
  });

  it("catches the two languages disagreeing about how many options there are", () => {
    // The answer is an index. If the lists differ in length, the index means
    // different things in the two languages.
    expect(codes(sound({ optionsEs: ["Vida a termino", "Vida entera"] }))).toContain(
      "option_count_mismatch",
    );
  });

  it("catches an empty option in either language", () => {
    expect(codes(sound({ optionsEn: ["Term life", "", "Accidental death", "Credit life"] })))
      .toContain("empty_option_en");
    expect(codes(sound({ optionsEs: ["Vida a termino", "Vida entera", " ", "Vida de credito"] })))
      .toContain("empty_option_es");
  });

  it("catches the same option offered twice", () => {
    expect(
      codes(sound({ optionsEn: ["Whole life", "Whole life", "Term life", "Credit life"] })),
    ).toContain("duplicate_options");
  });

  it("treats these as critical, not advisory", () => {
    const findings = auditQuestion(sound({ correctAnswer: 9 }));
    expect(findings.every((f) => f.severity === "critical")).toBe(true);
  });
});

describe("auditQuestion - things that weaken it", () => {
  it("notices a missing explanation in either language", () => {
    expect(codes(sound({ explanationEn: null }))).toContain("missing_explanation_en");
    expect(codes(sound({ explanationEs: "Corto" }))).toContain("missing_explanation_es");
  });

  it("notices an untopiced question", () => {
    // It can still be asked; it just cannot be aimed at a weak area.
    expect(codes(sound({ topic: null }))).toContain("missing_topic");
  });

  it("notices a correct answer that is conspicuously the longest", () => {
    // A tell that survives option shuffling, so a student really can exploit
    // it without knowing the material.
    const findings = codes(
      sound({
        optionsEn: [
          "Term",
          "Whole life, which accrues cash value the owner may borrow against as a policy loan",
          "Accident",
          "Credit",
        ],
      }),
    );
    expect(findings).toContain("answer_length_tell");
  });

  it("keeps these advisory rather than critical", () => {
    const findings = auditQuestion(sound({ explanationEn: null }));
    expect(findings.every((f) => f.severity === "warning")).toBe(true);
  });
});

describe("findNearDuplicates", () => {
  it("finds two questions that are the same question", () => {
    const a = sound({ id: "a" });
    const b = sound({ id: "b" });
    const findings = findNearDuplicates([a, b]);

    expect(findings).toHaveLength(1);
    expect(findings[0].questionId).toBe("b");
    expect(findings[0].detail).toContain("a");
  });

  it("leaves genuinely different questions alone", () => {
    const a = sound({ id: "a" });
    const b = sound({
      id: "b",
      questionTextEn: "How many days does an insurer have to acknowledge a claim in Texas?",
    });
    expect(findNearDuplicates([a, b])).toEqual([]);
  });

  it("does not compare across categories", () => {
    // The same wording is a different question in a different exam, and
    // flagging those would bury the real duplicates.
    const a = sound({ id: "a", category: "life_insurance" });
    const b = sound({ id: "b", category: "general_lines" });
    expect(findNearDuplicates([a, b])).toEqual([]);
  });
});

describe("findThinTopics", () => {
  const bulk = (topic: string, count: number) =>
    Array.from({ length: count }, (_, i) => sound({ id: `${topic}-${i}`, topic }));

  it("names topics too small to fill their share of a paper", () => {
    const thin = findThinTopics([...bulk("li_policies", MIN_TOPIC_QUESTIONS + 5), ...bulk("li_annuities", 3)]);
    expect(thin.map((t) => t.topic)).toEqual(["li_annuities"]);
    expect(thin[0].questions).toBe(3);
  });

  it("ignores untopiced questions rather than counting them as a topic", () => {
    expect(findThinTopics([sound({ topic: null })])).toEqual([]);
  });

  it("reports the thinnest first", () => {
    const thin = findThinTopics([...bulk("a", 2), ...bulk("b", 1)]);
    expect(thin.map((t) => t.topic)).toEqual(["b", "a"]);
  });
});

describe("auditBank", () => {
  it("counts each question once however many findings it has", () => {
    const broken = sound({ id: "broken", correctAnswer: 9, questionTextEs: "", explanationEn: null });
    const report = auditBank([sound({ id: "ok" }), broken]);

    expect(report.total).toBe(2);
    expect(report.criticalCount).toBe(1);
    expect(report.cleanCount).toBe(1);
    expect(report.findings.length).toBeGreaterThan(1);
  });

  it("does not count a question as both critical and warning", () => {
    // A question with both is a critical one; counting it twice would make
    // the totals add up to more than the bank.
    const report = auditBank([sound({ id: "x", correctAnswer: 9, explanationEn: null })]);
    expect(report.criticalCount).toBe(1);
    expect(report.warningCount).toBe(0);
    expect(report.criticalCount + report.warningCount + report.cleanCount).toBe(report.total);
  });

  it("summarises by code, worst-represented first", () => {
    const report = auditBank([
      sound({ id: "a", explanationEn: null }),
      sound({ id: "b", explanationEn: null, questionTextEn: "A completely different stem about claim handling deadlines" }),
      sound({ id: "c", topic: null, questionTextEn: "Another different stem about surety bond requirements" }),
    ]);

    const top = report.byCode[0];
    expect(top.code).toBe("missing_explanation_en");
    expect(top.questions).toBe(2);
  });

  it("reports a clean bank as clean", () => {
    const report = auditBank([
      sound({ id: "a" }),
      sound({ id: "b", questionTextEn: "How long does an insurer have to acknowledge a claim?" }),
    ]);
    expect(report.findings).toEqual([]);
    expect(report.cleanCount).toBe(2);
  });

  it("survives an empty bank", () => {
    const report = auditBank([]);
    expect(report.total).toBe(0);
    expect(report.cleanCount).toBe(0);
  });
});
