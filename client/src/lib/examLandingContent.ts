import type { ExamCategory } from "@shared/schema";

export interface LandingFaqItem {
  question: string;
  answer: string;
}

export interface LandingBenefit {
  title: string;
  description: string;
}

export interface ExamLandingPageContent {
  slug: string;
  language: "en" | "es";
  categories: ExamCategory[];
  pageTitle: string;
  metaDescription: string;
  h1: string;
  heroSubtitle: string;
  audienceHeading: string;
  audienceParagraphs: string[];
  benefits: LandingBenefit[];
  howItWorks: { title: string; description: string }[];
  faq: LandingFaqItem[];
  relatedSlugs: string[];
  courseName: string;
  courseDescription: string;
}

const HOW_IT_WORKS_EN = [
  { title: "Create a free account", description: "Sign up with your email in under a minute - no payment required to explore the platform." },
  { title: "Choose your exam category", description: "Subscribe to the category you're licensing for, or the full bundle if you're preparing for more than one." },
  { title: "Practice with timed exams", description: "Work through practice mode (50 questions) or full mock exams, in English or Spanish, on any device." },
  { title: "Review your results", description: "Get instant, topic-by-topic feedback after every exam so you know exactly what to study next." },
];

const HOW_IT_WORKS_ES = [
  { title: "Crea una cuenta gratis", description: "Regístrate con tu correo electrónico en menos de un minuto, sin necesidad de pago para explorar la plataforma." },
  { title: "Elige tu categoría de examen", description: "Suscríbete a la categoría para la que buscas tu licencia, o al paquete completo si te preparas para más de una." },
  { title: "Practica con exámenes cronometrados", description: "Realiza el modo de práctica (50 preguntas) o exámenes simulados completos, en inglés o español, en cualquier dispositivo." },
  { title: "Revisa tus resultados", description: "Recibe retroalimentación instantánea por tema después de cada examen para saber exactamente qué estudiar." },
];

const BENEFITS_EN: LandingBenefit[] = [
  { title: "Bilingual, start to finish", description: "Every question, explanation, and result is available in English or Spanish - switch anytime." },
  { title: "Practice or full mock mode", description: "Choose a quick 50-question practice session or a full-length timed mock exam." },
  { title: "Instant, topic-level feedback", description: "See exactly which topics you got right and wrong after every exam, not just an overall score." },
  { title: "Study on any device", description: "The platform works on your phone, tablet, or computer, so you can practice during breaks." },
];

const BENEFITS_ES: LandingBenefit[] = [
  { title: "Bilingüe de principio a fin", description: "Cada pregunta, explicación y resultado está disponible en inglés o español - cambia cuando quieras." },
  { title: "Modo de práctica o examen completo", description: "Elige una sesión rápida de práctica de 50 preguntas o un examen simulado completo y cronometrado." },
  { title: "Retroalimentación instantánea por tema", description: "Ve exactamente qué temas respondiste bien o mal después de cada examen, no solo un puntaje general." },
  { title: "Estudia en cualquier dispositivo", description: "La plataforma funciona en tu teléfono, tableta o computadora, para que puedas practicar durante tus descansos." },
];

export const examLandingPages: ExamLandingPageContent[] = [
  {
    slug: "texas-real-estate-exam-prep",
    language: "en",
    categories: ["real_estate"],
    pageTitle: "Texas Real Estate Exam Prep | TREC License Exam Practice | MyEasyPass",
    metaDescription: "Prepare for the Texas real estate (TREC) license exam with timed practice tests, full mock exams, and instant topic-by-topic feedback. Available in English and Spanish.",
    h1: "Texas Real Estate Exam Prep",
    heroSubtitle: "Practice for your TREC real estate license exam with timed, topic-organized questions and instant feedback - in English or Spanish.",
    audienceHeading: "Who this is for",
    audienceParagraphs: [
      "For candidates preparing to take the Texas Real Estate Commission (TREC) salesperson or broker license exam after completing their required pre-licensing education.",
      // TODO(owner): confirm whether to name specific pre-licensing course providers or requirements here.
    ],
    benefits: BENEFITS_EN,
    howItWorks: HOW_IT_WORKS_EN,
    faq: [
      { question: "What topics does this cover?", answer: "Practice questions are organized around the core TREC exam content areas, including real estate contracts, financing, property ownership, agency relationships, and Texas real estate law." },
      { question: "Is this the same as the official TREC exam?", answer: "No. This is independent practice material designed to help you prepare - it is not affiliated with or endorsed by TREC, and does not guarantee exam questions or passing the official exam." },
      { question: "Can I practice in Spanish?", answer: "Yes. Every question, answer choice, and explanation is available in both English and Spanish, and you can switch languages at any time." },
      { question: "Do I need to finish my pre-licensing education first?", answer: "This platform is for exam practice only and does not replace TREC-required pre-licensing education hours." },
    ],
    relatedSlugs: ["texas-property-casualty-exam-prep", "texas-life-insurance-exam-prep", "texas-general-lines-exam-prep"],
    courseName: "Texas Real Estate Exam Prep",
    courseDescription: "Practice questions and timed mock exams for the Texas real estate (TREC) license exam. Bilingual English/Spanish.",
  },
  {
    slug: "texas-property-casualty-exam-prep",
    language: "en",
    categories: ["property_casualty"],
    pageTitle: "Texas Property & Casualty Insurance Exam Prep | MyEasyPass",
    metaDescription: "Prepare for the Texas Property & Casualty insurance license exam with timed practice tests and instant topic-by-topic feedback. Available in English and Spanish.",
    h1: "Texas Property & Casualty Insurance Exam Prep",
    heroSubtitle: "Practice for your Texas Property & Casualty insurance license exam with timed, topic-organized questions and instant feedback - in English or Spanish.",
    audienceHeading: "Who this is for",
    audienceParagraphs: [
      "For candidates preparing to take the Texas Department of Insurance (TDI) Property & Casualty license exam after completing their required pre-licensing education.",
    ],
    benefits: BENEFITS_EN,
    howItWorks: HOW_IT_WORKS_EN,
    faq: [
      { question: "What topics does this cover?", answer: "Practice questions cover core Property & Casualty content areas, including property insurance, liability insurance, auto insurance, and claims & adjusting." },
      { question: "Is this affiliated with TDI?", answer: "No. This is independent practice material designed to help you prepare - it is not affiliated with or endorsed by the Texas Department of Insurance." },
      { question: "Can I practice in Spanish?", answer: "Yes. Every question, answer choice, and explanation is available in both English and Spanish, and you can switch languages at any time." },
    ],
    relatedSlugs: ["texas-real-estate-exam-prep", "texas-life-insurance-exam-prep", "texas-general-lines-exam-prep"],
    courseName: "Texas Property & Casualty Insurance Exam Prep",
    courseDescription: "Practice questions and timed mock exams for the Texas Property & Casualty insurance license exam. Bilingual English/Spanish.",
  },
  {
    slug: "texas-life-insurance-exam-prep",
    language: "en",
    categories: ["life_insurance"],
    pageTitle: "Texas Life Insurance Exam Prep | MyEasyPass",
    metaDescription: "Prepare for the Texas Life Insurance license exam with timed practice tests and instant topic-by-topic feedback. Available in English and Spanish.",
    h1: "Texas Life Insurance Exam Prep",
    heroSubtitle: "Practice for your Texas Life Insurance license exam with timed, topic-organized questions and instant feedback - in English or Spanish.",
    audienceHeading: "Who this is for",
    audienceParagraphs: [
      "For candidates preparing to take the Texas Department of Insurance (TDI) Life Insurance license exam after completing their required pre-licensing education.",
    ],
    benefits: BENEFITS_EN,
    howItWorks: HOW_IT_WORKS_EN,
    faq: [
      { question: "What topics does this cover?", answer: "Practice questions cover core Life Insurance content areas, including life insurance policies, annuities, health insurance basics, and Texas insurance regulations." },
      { question: "Is this affiliated with TDI?", answer: "No. This is independent practice material designed to help you prepare - it is not affiliated with or endorsed by the Texas Department of Insurance." },
      { question: "Can I practice in Spanish?", answer: "Yes. Every question, answer choice, and explanation is available in both English and Spanish, and you can switch languages at any time." },
    ],
    relatedSlugs: ["texas-real-estate-exam-prep", "texas-property-casualty-exam-prep", "texas-general-lines-exam-prep"],
    courseName: "Texas Life Insurance Exam Prep",
    courseDescription: "Practice questions and timed mock exams for the Texas Life Insurance license exam. Bilingual English/Spanish.",
  },
  {
    slug: "texas-general-lines-exam-prep",
    language: "en",
    categories: ["general_lines"],
    pageTitle: "Texas General Lines Life & Health Insurance Exam Prep | MyEasyPass",
    metaDescription: "Prepare for the Texas General Lines Life & Health insurance license exam with timed practice tests and instant topic-by-topic feedback. Available in English and Spanish.",
    h1: "Texas General Lines - Life & Health Insurance Exam Prep",
    heroSubtitle: "Practice for your Texas General Lines Life & Health insurance license exam with timed, topic-organized questions and instant feedback - in English or Spanish.",
    audienceHeading: "Who this is for",
    audienceParagraphs: [
      "For candidates preparing to take the Texas Department of Insurance (TDI) General Lines - Life, Accident, Health and HMO license exam after completing their required pre-licensing education.",
    ],
    benefits: BENEFITS_EN,
    howItWorks: HOW_IT_WORKS_EN,
    faq: [
      { question: "What topics does this cover?", answer: "Practice questions cover core General Lines content areas, including commercial insurance, surety bonds, risk management, and ethics & regulations." },
      { question: "Is this affiliated with TDI?", answer: "No. This is independent practice material designed to help you prepare - it is not affiliated with or endorsed by the Texas Department of Insurance." },
      { question: "Can I practice in Spanish?", answer: "Yes. Every question, answer choice, and explanation is available in both English and Spanish, and you can switch languages at any time." },
    ],
    relatedSlugs: ["texas-real-estate-exam-prep", "texas-property-casualty-exam-prep", "texas-life-insurance-exam-prep"],
    courseName: "Texas General Lines Life & Health Insurance Exam Prep",
    courseDescription: "Practice questions and timed mock exams for the Texas General Lines Life & Health insurance license exam. Bilingual English/Spanish.",
  },
  {
    slug: "preparacion-examen-bienes-raices-texas",
    language: "es",
    categories: ["real_estate"],
    pageTitle: "Preparación para el Examen de Bienes Raíces de Texas | MyEasyPass",
    metaDescription: "Prepárate para el examen de licencia de bienes raíces de Texas (TREC) con exámenes de práctica cronometrados y retroalimentación instantánea por tema. Disponible en inglés y español.",
    h1: "Preparación para el Examen de Bienes Raíces de Texas",
    heroSubtitle: "Practica para tu examen de licencia de bienes raíces de Texas (TREC) con preguntas cronometradas organizadas por tema y retroalimentación instantánea, en inglés o español.",
    audienceHeading: "Para quién es esto",
    audienceParagraphs: [
      "Para candidatos que se preparan para tomar el examen de licencia de vendedor o corredor de la Comisión de Bienes Raíces de Texas (TREC) después de completar su educación previa a la licencia requerida.",
    ],
    benefits: BENEFITS_ES,
    howItWorks: HOW_IT_WORKS_ES,
    faq: [
      { question: "¿Qué temas cubre esto?", answer: "Las preguntas de práctica están organizadas según las áreas principales del examen de TREC, incluyendo contratos de bienes raíces, financiamiento, propiedad, relaciones de agencia y leyes de bienes raíces de Texas." },
      { question: "¿Es esto lo mismo que el examen oficial de TREC?", answer: "No. Este es material de práctica independiente diseñado para ayudarte a prepararte - no está afiliado ni respaldado por TREC, y no garantiza las preguntas del examen ni aprobar el examen oficial." },
      { question: "¿Puedo practicar en español?", answer: "Sí. Cada pregunta, opción de respuesta y explicación está disponible en inglés y español, y puedes cambiar de idioma en cualquier momento." },
    ],
    relatedSlugs: ["preparacion-examen-seguros-texas", "texas-real-estate-exam-prep"],
    courseName: "Preparación para el Examen de Bienes Raíces de Texas",
    courseDescription: "Preguntas de práctica y exámenes simulados cronometrados para el examen de licencia de bienes raíces de Texas (TREC). Bilingüe inglés/español.",
  },
  {
    slug: "preparacion-examen-seguros-texas",
    language: "es",
    categories: ["life_insurance", "property_casualty", "general_lines"],
    pageTitle: "Preparación para el Examen de Seguros de Texas | MyEasyPass",
    metaDescription: "Prepárate para tu examen de licencia de seguros de Texas (Vida, Propiedad y Accidentes, o Líneas Generales) con exámenes de práctica cronometrados. Disponible en inglés y español.",
    h1: "Preparación para el Examen de Seguros de Texas",
    heroSubtitle: "Practica para tu examen de licencia de seguros de Texas - Vida, Propiedad y Accidentes, o Líneas Generales - con preguntas cronometradas y retroalimentación instantánea.",
    audienceHeading: "Para quién es esto",
    audienceParagraphs: [
      "Para candidatos que se preparan para tomar el examen de licencia de seguros del Departamento de Seguros de Texas (TDI) - Seguro de Vida, Seguro de Propiedad y Accidentes, o Líneas Generales - después de completar su educación previa a la licencia requerida.",
    ],
    benefits: BENEFITS_ES,
    howItWorks: HOW_IT_WORKS_ES,
    faq: [
      { question: "¿Qué categorías de seguros cubre esto?", answer: "Esta página cubre práctica para las tres categorías de licencia de seguros: Seguro de Vida, Seguro de Propiedad y Accidentes, y Líneas Generales. Cada una tiene su propia suscripción." },
      { question: "¿Es esto afiliado con el TDI?", answer: "No. Este es material de práctica independiente diseñado para ayudarte a prepararte - no está afiliado ni respaldado por el Departamento de Seguros de Texas." },
      { question: "¿Puedo practicar en español?", answer: "Sí. Cada pregunta, opción de respuesta y explicación está disponible en inglés y español, y puedes cambiar de idioma en cualquier momento." },
    ],
    relatedSlugs: ["preparacion-examen-bienes-raices-texas", "texas-property-casualty-exam-prep", "texas-life-insurance-exam-prep", "texas-general-lines-exam-prep"],
    courseName: "Preparación para el Examen de Seguros de Texas",
    courseDescription: "Preguntas de práctica y exámenes simulados cronometrados para los exámenes de licencia de seguros de Texas (Vida, Propiedad y Accidentes, Líneas Generales). Bilingüe inglés/español.",
  },
];

export function getLandingPageBySlug(slug: string): ExamLandingPageContent | undefined {
  return examLandingPages.find((p) => p.slug === slug);
}
