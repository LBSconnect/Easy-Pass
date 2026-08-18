import type { ExamCategory } from "./schema";

export interface StudyTopic {
  id: string;
  nameEn: string;
  nameEs: string;
  descriptionEn: string;
  descriptionEs: string;
  questionCount: number;
  /**
   * Editorial key points for Alexi's teach step, 3-5 per topic.
   *
   * Optional and empty for now on purpose. These are factual statements about
   * Texas licensing law, so they belong to a subject-matter expert, not to
   * whoever is nearest the keyboard. Until a topic has them, the teach step
   * distils its points from the approved explanations already attached to
   * questions on that topic - see server/alexi/keyPoints.ts - which is true by
   * construction rather than by recall.
   *
   * Fill these in and they take precedence outright.
   */
  keyPointsEn?: string[];
  keyPointsEs?: string[];
}

export interface CategoryTopics {
  category: ExamCategory;
  nameEn: string;
  nameEs: string;
  topics: StudyTopic[];
}

export const studyTopicsConfig: CategoryTopics[] = [
  {
    category: "real_estate",
    nameEn: "Real Estate",
    nameEs: "Bienes Raices",
    topics: [
      {
        id: "re_contracts",
        nameEn: "Real Estate Contracts",
        nameEs: "Contratos de Bienes Raices",
        descriptionEn: "Purchase agreements, listing contracts, and contract law fundamentals",
        descriptionEs: "Acuerdos de compra, contratos de listado y fundamentos del derecho contractual",
        questionCount: 40,
      },
      {
        id: "re_financing",
        nameEn: "Real Estate Financing",
        nameEs: "Financiamiento Inmobiliario",
        descriptionEn: "Mortgages, loans, interest rates, and lending practices",
        descriptionEs: "Hipotecas, prestamos, tasas de interes y practicas de prestamo",
        questionCount: 40,
      },
      {
        id: "re_ownership",
        nameEn: "Property Ownership",
        nameEs: "Propiedad Inmobiliaria",
        descriptionEn: "Types of ownership, deeds, titles, and property rights",
        descriptionEs: "Tipos de propiedad, escrituras, titulos y derechos de propiedad",
        questionCount: 40,
      },
      {
        id: "re_agency",
        nameEn: "Agency Relationships",
        nameEs: "Relaciones de Agencia",
        descriptionEn: "Agent duties, fiduciary responsibilities, and disclosure requirements",
        descriptionEs: "Deberes del agente, responsabilidades fiduciarias y requisitos de divulgacion",
        questionCount: 40,
      },
      {
        id: "re_laws",
        nameEn: "Texas Real Estate Laws",
        nameEs: "Leyes de Bienes Raices de Texas",
        descriptionEn: "State regulations, licensing requirements, and compliance",
        descriptionEs: "Regulaciones estatales, requisitos de licencia y cumplimiento",
        questionCount: 40,
      },
    ],
  },
  {
    category: "property_casualty",
    nameEn: "Property & Casualty Insurance",
    nameEs: "Seguro de Propiedad y Accidentes",
    topics: [
      {
        id: "pc_property",
        nameEn: "Property Insurance",
        nameEs: "Seguro de Propiedad",
        descriptionEn: "Homeowners, dwelling, and commercial property coverage",
        descriptionEs: "Cobertura de propietarios, vivienda y propiedad comercial",
        questionCount: 50,
      },
      {
        id: "pc_liability",
        nameEn: "Liability Insurance",
        nameEs: "Seguro de Responsabilidad",
        descriptionEn: "Personal and commercial liability coverage types",
        descriptionEs: "Tipos de cobertura de responsabilidad personal y comercial",
        questionCount: 50,
      },
      {
        id: "pc_auto",
        nameEn: "Auto Insurance",
        nameEs: "Seguro de Auto",
        descriptionEn: "Personal and commercial auto policies and coverage",
        descriptionEs: "Polizas de auto personal y comercial y cobertura",
        questionCount: 50,
      },
      {
        id: "pc_claims",
        nameEn: "Claims & Adjusting",
        nameEs: "Reclamaciones y Ajustes",
        descriptionEn: "Claims process, settlement, and adjusting procedures",
        descriptionEs: "Proceso de reclamaciones, liquidacion y procedimientos de ajuste",
        questionCount: 50,
      },
    ],
  },
  {
    category: "life_insurance",
    nameEn: "Life Insurance",
    nameEs: "Seguro de Vida",
    topics: [
      {
        id: "li_policies",
        nameEn: "Life Insurance Policies",
        nameEs: "Polizas de Seguro de Vida",
        descriptionEn: "Term, whole, universal life and policy types",
        descriptionEs: "Vida a termino, vida entera, vida universal y tipos de polizas",
        questionCount: 50,
      },
      {
        id: "li_annuities",
        nameEn: "Annuities",
        nameEs: "Anualidades",
        descriptionEn: "Fixed, variable, and indexed annuity products",
        descriptionEs: "Productos de anualidades fijas, variables e indexadas",
        questionCount: 50,
      },
      {
        id: "li_health",
        nameEn: "Health Insurance Basics",
        nameEs: "Fundamentos del Seguro de Salud",
        descriptionEn: "Health coverage types and regulations",
        descriptionEs: "Tipos de cobertura de salud y regulaciones",
        questionCount: 50,
      },
      {
        id: "li_regulations",
        nameEn: "Texas Insurance Regulations",
        nameEs: "Regulaciones de Seguros de Texas",
        descriptionEn: "State laws, licensing, and compliance requirements",
        descriptionEs: "Leyes estatales, licencias y requisitos de cumplimiento",
        questionCount: 49,
      },
    ],
  },
  {
    category: "general_lines",
    nameEn: "General Lines Insurance",
    nameEs: "Seguro de Lineas Generales",
    topics: [
      {
        id: "gl_commercial",
        nameEn: "Commercial Insurance",
        nameEs: "Seguro Comercial",
        descriptionEn: "Business insurance policies and commercial coverage",
        descriptionEs: "Polizas de seguro empresarial y cobertura comercial",
        questionCount: 50,
      },
      {
        id: "gl_bonds",
        nameEn: "Surety Bonds",
        nameEs: "Fianzas",
        descriptionEn: "Bond types, requirements, and applications",
        descriptionEs: "Tipos de fianzas, requisitos y aplicaciones",
        questionCount: 50,
      },
      {
        id: "gl_risk",
        nameEn: "Risk Management",
        nameEs: "Gestion de Riesgos",
        descriptionEn: "Risk assessment, mitigation, and insurance planning",
        descriptionEs: "Evaluacion de riesgos, mitigacion y planificacion de seguros",
        questionCount: 50,
      },
      {
        id: "gl_ethics",
        nameEn: "Ethics & Regulations",
        nameEs: "Etica y Regulaciones",
        descriptionEn: "Professional ethics, Texas regulations, and compliance",
        descriptionEs: "Etica profesional, regulaciones de Texas y cumplimiento",
        questionCount: 46,
      },
    ],
  },
];

export function getTopicById(topicId: string): { topic: StudyTopic; category: CategoryTopics } | undefined {
  for (const category of studyTopicsConfig) {
    const topic = category.topics.find(t => t.id === topicId);
    if (topic) {
      return { topic, category };
    }
  }
  return undefined;
}

export function getTopicsByCategory(category: ExamCategory): StudyTopic[] {
  const categoryConfig = studyTopicsConfig.find(c => c.category === category);
  return categoryConfig?.topics || [];
}
