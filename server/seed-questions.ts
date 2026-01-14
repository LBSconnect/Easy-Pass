import { db } from "./db";
import { questions } from "@shared/schema";

const sampleQuestions = [
  {
    category: "real_estate" as const,
    questionTextEn: "What is the primary purpose of a deed?",
    questionTextEs: "¿Cuál es el propósito principal de una escritura?",
    optionsEn: [
      "To transfer ownership of real property",
      "To provide insurance coverage",
      "To establish a lease agreement",
      "To create a mortgage"
    ],
    optionsEs: [
      "Transferir la propiedad de bienes inmuebles",
      "Proporcionar cobertura de seguro",
      "Establecer un contrato de arrendamiento",
      "Crear una hipoteca"
    ],
    correctAnswer: 0,
    explanationEn: "A deed is a legal document that transfers ownership of real property from one party to another.",
    explanationEs: "Una escritura es un documento legal que transfiere la propiedad de bienes inmuebles de una parte a otra.",
  },
  {
    category: "real_estate" as const,
    questionTextEn: "What does 'escrow' mean in a real estate transaction?",
    questionTextEs: "¿Qué significa 'escrow' en una transacción inmobiliaria?",
    optionsEn: [
      "A type of property insurance",
      "A neutral third party holding funds until conditions are met",
      "A real estate agent's commission",
      "The down payment on a property"
    ],
    optionsEs: [
      "Un tipo de seguro de propiedad",
      "Un tercero neutral que retiene fondos hasta que se cumplan las condiciones",
      "La comisión de un agente inmobiliario",
      "El pago inicial de una propiedad"
    ],
    correctAnswer: 1,
    explanationEn: "Escrow is a financial arrangement where a third party holds and regulates payment of funds until all conditions of a transaction are met.",
    explanationEs: "El escrow es un acuerdo financiero donde un tercero retiene y regula el pago de fondos hasta que se cumplan todas las condiciones de una transacción.",
  },
  {
    category: "real_estate" as const,
    questionTextEn: "What is the difference between a listing agent and a buyer's agent?",
    questionTextEs: "¿Cuál es la diferencia entre un agente de listado y un agente del comprador?",
    optionsEn: [
      "There is no difference",
      "A listing agent represents the seller, while a buyer's agent represents the buyer",
      "A listing agent only works with commercial properties",
      "A buyer's agent is not licensed"
    ],
    optionsEs: [
      "No hay diferencia",
      "Un agente de listado representa al vendedor, mientras que un agente del comprador representa al comprador",
      "Un agente de listado solo trabaja con propiedades comerciales",
      "Un agente del comprador no tiene licencia"
    ],
    correctAnswer: 1,
    explanationEn: "A listing agent represents the seller's interests, while a buyer's agent represents the buyer's interests in a real estate transaction.",
    explanationEs: "Un agente de listado representa los intereses del vendedor, mientras que un agente del comprador representa los intereses del comprador en una transacción inmobiliaria.",
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What does a homeowner's insurance policy typically cover?",
    questionTextEs: "¿Qué cubre típicamente una póliza de seguro de propietario de vivienda?",
    optionsEn: [
      "Only the structure of the home",
      "The structure, personal property, liability, and additional living expenses",
      "Only personal belongings",
      "Only liability claims"
    ],
    optionsEs: [
      "Solo la estructura de la casa",
      "La estructura, propiedad personal, responsabilidad y gastos de vida adicionales",
      "Solo pertenencias personales",
      "Solo reclamaciones de responsabilidad"
    ],
    correctAnswer: 1,
    explanationEn: "A standard homeowner's policy provides comprehensive coverage including the dwelling, personal property, liability protection, and additional living expenses if the home becomes uninhabitable.",
    explanationEs: "Una póliza de propietario estándar proporciona cobertura integral que incluye la vivienda, propiedad personal, protección de responsabilidad y gastos de vida adicionales si la casa se vuelve inhabitable.",
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is the purpose of a deductible in an insurance policy?",
    questionTextEs: "¿Cuál es el propósito de un deducible en una póliza de seguro?",
    optionsEn: [
      "To increase the premium cost",
      "To reduce the insurance company's exposure and the policyholder's premium",
      "To eliminate all coverage",
      "To add more coverage"
    ],
    optionsEs: [
      "Aumentar el costo de la prima",
      "Reducir la exposición de la compañía de seguros y la prima del asegurado",
      "Eliminar toda la cobertura",
      "Agregar más cobertura"
    ],
    correctAnswer: 1,
    explanationEn: "A deductible is the amount the policyholder pays out of pocket before insurance kicks in. Higher deductibles typically mean lower premiums.",
    explanationEs: "Un deducible es la cantidad que el asegurado paga de su bolsillo antes de que el seguro entre en vigor. Los deducibles más altos generalmente significan primas más bajas.",
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is the main difference between term life and whole life insurance?",
    questionTextEs: "¿Cuál es la diferencia principal entre el seguro de vida a plazo y el seguro de vida entera?",
    optionsEn: [
      "Term life is more expensive",
      "Term life provides coverage for a specific period, while whole life provides lifetime coverage with cash value",
      "Whole life has no death benefit",
      "There is no difference"
    ],
    optionsEs: [
      "El seguro a plazo es más caro",
      "El seguro a plazo proporciona cobertura por un período específico, mientras que el seguro de vida entera proporciona cobertura de por vida con valor en efectivo",
      "El seguro de vida entera no tiene beneficio por fallecimiento",
      "No hay diferencia"
    ],
    correctAnswer: 1,
    explanationEn: "Term life insurance provides coverage for a set period (10, 20, or 30 years), while whole life insurance provides lifetime coverage and builds cash value over time.",
    explanationEs: "El seguro de vida a plazo proporciona cobertura por un período determinado (10, 20 o 30 años), mientras que el seguro de vida entera proporciona cobertura de por vida y acumula valor en efectivo con el tiempo.",
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is a beneficiary in a life insurance policy?",
    questionTextEs: "¿Qué es un beneficiario en una póliza de seguro de vida?",
    optionsEn: [
      "The insurance company",
      "The person who receives the death benefit",
      "The policyholder",
      "The insurance agent"
    ],
    optionsEs: [
      "La compañía de seguros",
      "La persona que recibe el beneficio por fallecimiento",
      "El titular de la póliza",
      "El agente de seguros"
    ],
    correctAnswer: 1,
    explanationEn: "A beneficiary is the person or entity designated to receive the death benefit when the insured person dies.",
    explanationEs: "Un beneficiario es la persona o entidad designada para recibir el beneficio por fallecimiento cuando el asegurado fallece.",
  },
  {
    category: "general_lines" as const,
    questionTextEn: "What is the role of an insurance underwriter?",
    questionTextEs: "¿Cuál es el rol de un suscriptor de seguros?",
    optionsEn: [
      "To sell insurance policies",
      "To evaluate risks and determine policy terms and premiums",
      "To process claims",
      "To manage customer complaints"
    ],
    optionsEs: [
      "Vender pólizas de seguro",
      "Evaluar riesgos y determinar los términos y primas de la póliza",
      "Procesar reclamaciones",
      "Gestionar quejas de clientes"
    ],
    correctAnswer: 1,
    explanationEn: "An underwriter assesses the risk of insuring a person or asset and determines whether to offer coverage and at what premium.",
    explanationEs: "Un suscriptor evalúa el riesgo de asegurar a una persona o activo y determina si ofrecer cobertura y a qué prima.",
  },
  {
    category: "general_lines" as const,
    questionTextEn: "What does 'premium' mean in insurance terminology?",
    questionTextEs: "¿Qué significa 'prima' en terminología de seguros?",
    optionsEn: [
      "The amount paid for coverage",
      "The maximum coverage limit",
      "The deductible amount",
      "The claim payout"
    ],
    optionsEs: [
      "La cantidad pagada por la cobertura",
      "El límite máximo de cobertura",
      "El monto del deducible",
      "El pago de la reclamación"
    ],
    correctAnswer: 0,
    explanationEn: "A premium is the amount of money an individual or business pays for an insurance policy, typically on a monthly or annual basis.",
    explanationEs: "Una prima es la cantidad de dinero que un individuo o empresa paga por una póliza de seguro, generalmente de forma mensual o anual.",
  },
  {
    category: "real_estate" as const,
    questionTextEn: "What is a lien on a property?",
    questionTextEs: "¿Qué es un gravamen sobre una propiedad?",
    optionsEn: [
      "A type of property tax",
      "A legal claim against a property used as collateral",
      "The property's market value",
      "The property's zoning classification"
    ],
    optionsEs: [
      "Un tipo de impuesto sobre la propiedad",
      "Un reclamo legal contra una propiedad utilizada como garantía",
      "El valor de mercado de la propiedad",
      "La clasificación de zonificación de la propiedad"
    ],
    correctAnswer: 1,
    explanationEn: "A lien is a legal right or interest that a creditor has in the debtor's property, usually as security for a debt.",
    explanationEs: "Un gravamen es un derecho legal o interés que un acreedor tiene en la propiedad del deudor, generalmente como garantía de una deuda.",
  },
];

async function seedQuestions() {
  console.log("Seeding questions...");
  
  for (const question of sampleQuestions) {
    await db.insert(questions).values(question);
  }
  
  console.log(`Inserted ${sampleQuestions.length} sample questions`);
}

seedQuestions().catch(console.error);
