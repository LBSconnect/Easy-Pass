import { db } from "./db";
import { questions } from "@shared/schema";

const finalRealEstateQuestions = [
  {
    category: "real_estate" as const,
    questionTextEn: "What is the difference between a mortgage and a deed of trust?",
    questionTextEs: "¿Cuál es la diferencia entre una hipoteca y un fideicomiso de título?",
    optionsEn: ["A deed of trust involves a third-party trustee; a mortgage is between borrower and lender only", "They are identical", "Mortgages are for commercial property only", "Deeds of trust are for residential only"],
    optionsEs: ["Un fideicomiso de título involucra un fideicomisario tercero; una hipoteca es solo entre prestatario y prestamista", "Son idénticos", "Las hipotecas son solo para propiedades comerciales", "Los fideicomisos de título son solo para residenciales"],
    correctAnswer: 0,
    explanationEn: "A deed of trust involves three parties (borrower, lender, and trustee), while a mortgage is a two-party agreement.",
    explanationEs: "Un fideicomiso de título involucra tres partes (prestatario, prestamista y fideicomisario), mientras que una hipoteca es un acuerdo de dos partes."
  },
  {
    category: "real_estate" as const,
    questionTextEn: "What is the primary source of income for a real estate agent?",
    questionTextEs: "¿Cuál es la fuente principal de ingresos para un agente de bienes raíces?",
    optionsEn: ["Commission on property sales", "Hourly wages", "Monthly salary from TREC", "Government subsidies"],
    optionsEs: ["Comisión sobre ventas de propiedades", "Salario por hora", "Salario mensual de TREC", "Subsidios del gobierno"],
    correctAnswer: 0,
    explanationEn: "Real estate agents typically earn income through commissions based on the sale price of properties they help buy or sell.",
    explanationEs: "Los agentes de bienes raíces típicamente ganan ingresos a través de comisiones basadas en el precio de venta de las propiedades que ayudan a comprar o vender."
  },
  {
    category: "real_estate" as const,
    questionTextEn: "What is the Texas Association of Realtors (TAR)?",
    questionTextEs: "¿Qué es la Asociación de Realtors de Texas (TAR)?",
    optionsEn: ["A professional trade association for real estate professionals in Texas", "The government licensing agency", "A title insurance company", "A mortgage lender"],
    optionsEs: ["Una asociación comercial profesional para profesionales de bienes raíces en Texas", "La agencia de licencias del gobierno", "Una compañía de seguro de título", "Un prestamista hipotecario"],
    correctAnswer: 0,
    explanationEn: "TAR is a voluntary professional trade association that provides resources, advocacy, and education for real estate professionals.",
    explanationEs: "TAR es una asociación comercial profesional voluntaria que proporciona recursos, defensa y educación para profesionales de bienes raíces."
  },
  {
    category: "real_estate" as const,
    questionTextEn: "What is MLS (Multiple Listing Service)?",
    questionTextEs: "¿Qué es el MLS (Servicio de Listado Múltiple)?",
    optionsEn: ["A database of properties for sale shared among real estate brokers", "A government property registry", "A mortgage application system", "A property tax database"],
    optionsEs: ["Una base de datos de propiedades en venta compartida entre corredores de bienes raíces", "Un registro de propiedades del gobierno", "Un sistema de solicitud de hipotecas", "Una base de datos de impuestos sobre propiedades"],
    correctAnswer: 0,
    explanationEn: "The MLS is a cooperative database where real estate brokers share property listings and offer compensation to buyer's agents.",
    explanationEs: "El MLS es una base de datos cooperativa donde los corredores de bienes raíces comparten listados de propiedades y ofrecen compensación a los agentes de compradores."
  },
  {
    category: "real_estate" as const,
    questionTextEn: "What is the purpose of a homeowners association (HOA)?",
    questionTextEs: "¿Cuál es el propósito de una asociación de propietarios (HOA)?",
    optionsEn: ["To manage common areas and enforce community rules and regulations", "To sell properties", "To provide mortgages", "To conduct appraisals"],
    optionsEs: ["Administrar áreas comunes y hacer cumplir reglas y regulaciones de la comunidad", "Vender propiedades", "Proporcionar hipotecas", "Realizar tasaciones"],
    correctAnswer: 0,
    explanationEn: "An HOA manages common areas, enforces deed restrictions, and maintains community standards in a subdivision or development.",
    explanationEs: "Una HOA administra áreas comunes, hace cumplir restricciones de escritura y mantiene estándares comunitarios en una subdivisión o desarrollo."
  }
];

async function seedFinalRealEstateQuestions() {
  console.log("Seeding final Real Estate questions to reach 200...");
  
  try {
    for (const question of finalRealEstateQuestions) {
      await db.insert(questions).values(question);
    }
    console.log(`Successfully added ${finalRealEstateQuestions.length} Real Estate questions`);
  } catch (error) {
    console.error("Error seeding Real Estate questions:", error);
    throw error;
  }
}

seedFinalRealEstateQuestions()
  .then(() => {
    console.log("Real Estate category complete with 200 questions!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  });
