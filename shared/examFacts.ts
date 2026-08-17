/**
 * Official examination facts.
 *
 * EVERY value here must come from a current authoritative source - the exam
 * provider's candidate handbook or the regulator - never from memory, a
 * competitor blog, or inference. Each record carries its source so a future
 * maintainer can re-verify it, and `verifiedOn` so staleness is visible.
 *
 * An exam with `verified: false` has NO published figures. The landing pages
 * render the exam-structure section only when `verified` is true, so an
 * unverified exam simply omits the section rather than showing guesses.
 * That is deliberate: publishing an invented question count or passing score
 * for a state licensing exam is a factual claim we cannot support.
 *
 * MyEasyPass is not affiliated with, endorsed by, or acting on behalf of TREC,
 * TDI, Pearson VUE or any state agency. These figures describe the exam a
 * candidate will sit; they do not imply any relationship.
 */

export interface ExamPortion {
  name: string;
  nameEs: string;
  /** Total items presented, scored plus pretest. */
  totalItems: number;
  scoredItems?: number;
  pretestItems?: number;
  timeMinutes: number;
  /** Scored questions that must be answered correctly to pass. */
  correctToPass?: number;
}

export interface ExamFacts {
  /** Official exam name as the provider states it. */
  examName: string;
  examNameEs: string;
  regulator: string;
  examProvider: string;
  portions: ExamPortion[];
  /** Where these figures came from. */
  source: { label: string; url: string; documentId?: string };
  /** ISO date these figures were last checked against the source. */
  verifiedOn: string;
  /** False means: publish nothing factual about this exam's structure. */
  verified: boolean;
  /** Shown alongside any published figures. */
  note?: string;
  noteEs?: string;
}

export const EXAM_FACTS: Record<string, ExamFacts> = {
  real_estate: {
    examName: "Texas Real Estate Sales Agent Examination",
    examNameEs: "Examen de Agente de Ventas de Bienes Raíces de Texas",
    regulator: "Texas Real Estate Commission (TREC)",
    examProvider: "Pearson VUE",
    portions: [
      {
        name: "National portion",
        nameEs: "Porción nacional",
        totalItems: 85,
        scoredItems: 80,
        pretestItems: 5,
        timeMinutes: 150,
        correctToPass: 56,
      },
      {
        name: "Texas state law portion",
        nameEs: "Porción de ley estatal de Texas",
        totalItems: 50,
        scoredItems: 40,
        pretestItems: 10,
        timeMinutes: 90,
        correctToPass: 28,
      },
    ],
    source: {
      label: "Texas Real Estate Candidate Handbook, Pearson VUE",
      url: "https://www.pearsonvue.com/content/dam/VUE/vue/en/documents/publications/094400.pdf",
      documentId: "094400 v2.1 (May 2026)",
    },
    verifiedOn: "2026-08-17",
    verified: true,
    note: "Candidates must pass both portions. Pretest questions are mixed in and do not affect your score.",
    noteEs: "Los candidatos deben aprobar ambas porciones. Las preguntas de prueba se mezclan y no afectan tu puntuación.",
  },

  // The three insurance exams are administered for the Texas Department of
  // Insurance. Their current candidate-handbook figures have NOT been verified
  // against the official source in this pass, so nothing factual is published
  // for them and the exam-structure section stays hidden on those pages.
  property_casualty: {
    examName: "Texas General Lines - Property and Casualty Examination",
    examNameEs: "Examen de Líneas Generales de Texas - Propiedad y Accidentes",
    regulator: "Texas Department of Insurance (TDI)",
    examProvider: "Pearson VUE",
    portions: [],
    source: { label: "Pending verification against the current TDI/Pearson VUE candidate handbook", url: "" },
    verifiedOn: "",
    verified: false,
  },
  life_insurance: {
    examName: "Texas General Lines - Life, Accident and Health Examination (Life)",
    examNameEs: "Examen de Líneas Generales de Texas - Vida",
    regulator: "Texas Department of Insurance (TDI)",
    examProvider: "Pearson VUE",
    portions: [],
    source: { label: "Pending verification against the current TDI/Pearson VUE candidate handbook", url: "" },
    verifiedOn: "",
    verified: false,
  },
  general_lines: {
    examName: "Texas General Lines - Life, Accident and Health Examination",
    examNameEs: "Examen de Líneas Generales de Texas - Vida, Accidentes y Salud",
    regulator: "Texas Department of Insurance (TDI)",
    examProvider: "Pearson VUE",
    portions: [],
    source: { label: "Pending verification against the current TDI/Pearson VUE candidate handbook", url: "" },
    verifiedOn: "",
    verified: false,
  },
};

export function getExamFacts(category: string): ExamFacts | undefined {
  return EXAM_FACTS[category];
}

/** Only verified exams with at least one portion may publish figures. */
export function hasPublishableFacts(category: string): boolean {
  const facts = EXAM_FACTS[category];
  return Boolean(facts?.verified && facts.portions.length > 0);
}
