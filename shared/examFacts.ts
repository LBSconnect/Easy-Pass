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
  /**
   * Time for this portion alone. Omitted where the provider times the whole
   * exam as one sitting rather than per section - see `totalTimeMinutes`.
   * Real estate is two separately timed exams; the insurance exams are one.
   */
  timeMinutes?: number;
  /**
   * Scored questions that must be answered correctly to pass.
   *
   * Only set where the provider publishes a raw count. The insurance exams
   * report a SCALED score instead, and the handbook is explicit that it is
   * "neither the number of questions you answered correctly nor the
   * percentage" - so inventing a raw threshold for them would misdescribe
   * how those exams are actually graded.
   */
  correctToPass?: number;
}

export interface ExamFacts {
  /** Official exam name as the provider states it. */
  examName: string;
  examNameEs: string;
  regulator: string;
  examProvider: string;
  portions: ExamPortion[];
  /**
   * Time for the whole exam, where it is sat as a single timed session
   * covering every portion. Mutually exclusive in practice with per-portion
   * `timeMinutes`.
   */
  totalTimeMinutes?: number;
  /**
   * Passing score on the provider's reported scale, where the result is
   * reported as a scaled score rather than a raw count.
   */
  passingScaledScore?: number;
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
  // Insurance. Unlike real estate - two separately timed exams with published
  // raw passing counts - each of these is ONE timed sitting covering a general
  // knowledge section and a Texas-specific section, graded on a scaled score.
  //
  // Question counts come from the content outlines (124401, effective
  // 1 December 2025); session times from the candidate handbook (124400).
  // The handbook states the passing score is a scaled 70 and is expressly
  // "neither the number of questions you answered correctly nor the
  // percentage", so no `correctToPass` is published for these.
  property_casualty: {
    examName: "Texas General Lines - Property and Casualty Agent Examination",
    examNameEs: "Examen de Agente de Líneas Generales de Texas - Propiedad y Accidentes",
    regulator: "Texas Department of Insurance (TDI)",
    examProvider: "Pearson VUE",
    portions: [
      {
        name: "General knowledge",
        nameEs: "Conocimiento general",
        totalItems: 110,
        scoredItems: 100,
        pretestItems: 10,
      },
      {
        name: "Texas state-specific",
        nameEs: "Específico del estado de Texas",
        totalItems: 35,
        scoredItems: 30,
        pretestItems: 5,
      },
    ],
    totalTimeMinutes: 150,
    passingScaledScore: 70,
    source: {
      label: "Texas Insurance Examination Content Outlines and Candidate Handbook, Pearson VUE",
      url: "https://www.pearsonvue.com/content/dam/VUE/vue/en/documents/publications/124401.pdf",
      documentId: "124401 (effective 1 December 2025); times from handbook 124400",
    },
    verifiedOn: "2026-08-17",
    verified: true,
    note: "Both sections are sat in one 150-minute session. Results are reported as a scaled score from 0-100, and 70 is the passing score - that is not a percentage of questions answered correctly. Pretest questions are mixed in and do not affect your score.",
    noteEs: "Ambas secciones se presentan en una sola sesión de 150 minutos. El resultado se informa como una puntuación escalada de 0 a 100, y 70 es la puntuación para aprobar, lo cual no es un porcentaje de preguntas correctas. Las preguntas de prueba se mezclan y no afectan tu puntuación.",
  },
  life_insurance: {
    examName: "Texas Life Agent Examination",
    examNameEs: "Examen de Agente de Vida de Texas",
    regulator: "Texas Department of Insurance (TDI)",
    examProvider: "Pearson VUE",
    portions: [
      {
        name: "General knowledge",
        nameEs: "Conocimiento general",
        totalItems: 55,
        scoredItems: 50,
        pretestItems: 5,
      },
      {
        name: "Texas state-specific",
        nameEs: "Específico del estado de Texas",
        totalItems: 35,
        scoredItems: 30,
        pretestItems: 5,
      },
    ],
    totalTimeMinutes: 120,
    passingScaledScore: 70,
    source: {
      label: "Texas Insurance Examination Content Outlines and Candidate Handbook, Pearson VUE",
      url: "https://www.pearsonvue.com/content/dam/VUE/vue/en/documents/publications/124401.pdf",
      documentId: "124401 (effective 1 December 2025); times from handbook 124400",
    },
    verifiedOn: "2026-08-17",
    verified: true,
    note: "Both sections are sat in one 120-minute session. Results are reported as a scaled score from 0-100, and 70 is the passing score - that is not a percentage of questions answered correctly. Pretest questions are mixed in and do not affect your score.",
    noteEs: "Ambas secciones se presentan en una sola sesión de 120 minutos. El resultado se informa como una puntuación escalada de 0 a 100, y 70 es la puntuación para aprobar, lo cual no es un porcentaje de preguntas correctas. Las preguntas de prueba se mezclan y no afectan tu puntuación.",
  },
  general_lines: {
    examName: "Texas General Lines - Life, Accident and Health Agent Examination",
    examNameEs: "Examen de Agente de Líneas Generales de Texas - Vida, Accidentes y Salud",
    regulator: "Texas Department of Insurance (TDI)",
    examProvider: "Pearson VUE",
    portions: [
      {
        name: "General knowledge",
        nameEs: "Conocimiento general",
        totalItems: 110,
        scoredItems: 100,
        pretestItems: 10,
      },
      {
        name: "Texas state-specific",
        nameEs: "Específico del estado de Texas",
        totalItems: 35,
        scoredItems: 30,
        pretestItems: 5,
      },
    ],
    totalTimeMinutes: 150,
    passingScaledScore: 70,
    source: {
      label: "Texas Insurance Examination Content Outlines and Candidate Handbook, Pearson VUE",
      url: "https://www.pearsonvue.com/content/dam/VUE/vue/en/documents/publications/124401.pdf",
      documentId: "124401 (effective 1 December 2025); times from handbook 124400",
    },
    verifiedOn: "2026-08-17",
    verified: true,
    note: "Both sections are sat in one 150-minute session. Results are reported as a scaled score from 0-100, and 70 is the passing score - that is not a percentage of questions answered correctly. Pretest questions are mixed in and do not affect your score.",
    noteEs: "Ambas secciones se presentan en una sola sesión de 150 minutos. El resultado se informa como una puntuación escalada de 0 a 100, y 70 es la puntuación para aprobar, lo cual no es un porcentaje de preguntas correctas. Las preguntas de prueba se mezclan y no afectan tu puntuación.",
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
