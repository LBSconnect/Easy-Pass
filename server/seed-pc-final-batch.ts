import { db } from "./db";
import { questions } from "@shared/schema";

const finalPCQuestions = [
  {
    category: "property_casualty" as const,
    questionTextEn: "What is the difference between primary and excess coverage?",
    questionTextEs: "¿Cuál es la diferencia entre cobertura primaria y excedente?",
    optionsEn: ["Primary pays first; excess pays after primary limits are exhausted", "They pay equally", "Excess pays first", "Primary never pays"],
    optionsEs: ["Primaria paga primero; excedente paga después de que los límites primarios se agotan", "Pagan igualmente", "Excedente paga primero", "Primaria nunca paga"],
    correctAnswer: 0,
    explanationEn: "Primary insurance pays first up to its limits, then excess coverage kicks in for amounts above those limits.",
    explanationEs: "El seguro primario paga primero hasta sus límites, luego la cobertura excedente entra para montos por encima de esos límites."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is a loss of income endorsement for homeowners?",
    questionTextEs: "¿Qué es un endoso de pérdida de ingresos para propietarios?",
    optionsEn: ["Coverage for rental income lost when a rental portion of the home is damaged", "Disability coverage", "Life insurance", "Auto coverage"],
    optionsEs: ["Cobertura por ingresos de alquiler perdidos cuando una porción de alquiler de la casa está dañada", "Cobertura de discapacidad", "Seguro de vida", "Cobertura de auto"],
    correctAnswer: 0,
    explanationEn: "This endorsement covers lost rental income when a portion of the insured's home that is rented becomes uninhabitable.",
    explanationEs: "Este endoso cubre ingresos de alquiler perdidos cuando una porción de la casa del asegurado que se alquila se vuelve inhabitable."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is an occurrence trigger in liability insurance?",
    questionTextEs: "¿Qué es un disparador de ocurrencia en seguro de responsabilidad?",
    optionsEn: ["Coverage is triggered when the bodily injury or property damage occurs", "When the claim is filed", "When the policy is purchased", "When premium is paid"],
    optionsEs: ["La cobertura se activa cuando ocurre la lesión corporal o el daño a la propiedad", "Cuando se presenta el reclamo", "Cuando se compra la póliza", "Cuando se paga la prima"],
    correctAnswer: 0,
    explanationEn: "In occurrence-based policies, coverage is triggered by when the injury or damage actually occurred.",
    explanationEs: "En pólizas basadas en ocurrencia, la cobertura se activa por cuándo realmente ocurrió la lesión o el daño."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is an aggregate limit?",
    questionTextEs: "¿Qué es un límite agregado?",
    optionsEn: ["The maximum amount an insurer will pay for all claims during a policy period", "Per-claim limit", "Deductible amount", "Premium amount"],
    optionsEs: ["La cantidad máxima que un asegurador pagará por todos los reclamos durante un período de póliza", "Límite por reclamo", "Monto del deducible", "Monto de la prima"],
    correctAnswer: 0,
    explanationEn: "The aggregate limit caps the total amount the insurer will pay for all claims during the policy period.",
    explanationEs: "El límite agregado limita la cantidad total que el asegurador pagará por todos los reclamos durante el período de la póliza."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is a per-occurrence limit?",
    questionTextEs: "¿Qué es un límite por ocurrencia?",
    optionsEn: ["The maximum amount paid for a single claim or occurrence", "The aggregate limit", "The deductible", "The premium"],
    optionsEs: ["La cantidad máxima pagada por un solo reclamo u ocurrencia", "El límite agregado", "El deducible", "La prima"],
    correctAnswer: 0,
    explanationEn: "The per-occurrence limit is the maximum the insurer will pay for any single event or claim.",
    explanationEs: "El límite por ocurrencia es lo máximo que el asegurador pagará por cualquier evento o reclamo individual."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What does 'additional insured' mean?",
    questionTextEs: "¿Qué significa 'asegurado adicional'?",
    optionsEn: ["A party added to a policy who receives coverage under the named insured's policy", "The primary policyholder", "The insurance agent", "The claims adjuster"],
    optionsEs: ["Una parte agregada a una póliza que recibe cobertura bajo la póliza del asegurado nombrado", "El asegurado principal", "El agente de seguros", "El ajustador de reclamos"],
    correctAnswer: 0,
    explanationEn: "An additional insured is a person or entity added to an insurance policy to receive coverage.",
    explanationEs: "Un asegurado adicional es una persona o entidad agregada a una póliza de seguro para recibir cobertura."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is a hold harmless agreement?",
    questionTextEs: "¿Qué es un acuerdo de exención de responsabilidad?",
    optionsEn: ["A contract where one party agrees not to hold another liable for certain damages", "An insurance policy", "A coverage endorsement", "A premium payment"],
    optionsEs: ["Un contrato donde una parte acuerda no responsabilizar a otra por ciertos daños", "Una póliza de seguro", "Un endoso de cobertura", "Un pago de prima"],
    correctAnswer: 0,
    explanationEn: "A hold harmless agreement is a contract where one party agrees to assume liability for the other party.",
    explanationEs: "Un acuerdo de exención de responsabilidad es un contrato donde una parte acuerda asumir responsabilidad por la otra parte."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is contractual liability coverage?",
    questionTextEs: "¿Qué es la cobertura de responsabilidad contractual?",
    optionsEn: ["Coverage for liability assumed under a contract", "Property coverage", "Auto coverage", "Life coverage"],
    optionsEs: ["Cobertura por responsabilidad asumida bajo un contrato", "Cobertura de propiedad", "Cobertura de auto", "Cobertura de vida"],
    correctAnswer: 0,
    explanationEn: "Contractual liability coverage protects the insured for liability they've assumed under contracts or agreements.",
    explanationEs: "La cobertura de responsabilidad contractual protege al asegurado por responsabilidad que han asumido bajo contratos o acuerdos."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is the pollution exclusion?",
    questionTextEs: "¿Qué es la exclusión de contaminación?",
    optionsEn: ["An exclusion eliminating coverage for pollution-related claims", "A coverage for pollution", "A premium discount", "A claim procedure"],
    optionsEs: ["Una exclusión que elimina cobertura para reclamos relacionados con contaminación", "Una cobertura para contaminación", "Un descuento de prima", "Un procedimiento de reclamo"],
    correctAnswer: 0,
    explanationEn: "The pollution exclusion removes coverage for claims arising from the discharge of pollutants.",
    explanationEs: "La exclusión de contaminación elimina cobertura para reclamos que surgen de la descarga de contaminantes."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is environmental impairment liability insurance?",
    questionTextEs: "¿Qué es el seguro de responsabilidad por deterioro ambiental?",
    optionsEn: ["Specialized coverage for pollution and environmental damage claims", "Standard liability", "Property coverage", "Auto coverage"],
    optionsEs: ["Cobertura especializada para reclamos de contaminación y daño ambiental", "Responsabilidad estándar", "Cobertura de propiedad", "Cobertura de auto"],
    correctAnswer: 0,
    explanationEn: "Environmental impairment liability insurance specifically covers pollution and environmental contamination claims.",
    explanationEs: "El seguro de responsabilidad por deterioro ambiental cubre específicamente reclamos de contaminación y contaminación ambiental."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is the expected or intended injury exclusion?",
    questionTextEs: "¿Qué es la exclusión de lesión esperada o intencional?",
    optionsEn: ["Exclusion for injuries the insured expected or intended to cause", "Coverage for intentional acts", "A premium calculation", "A claim form"],
    optionsEs: ["Exclusión por lesiones que el asegurado esperaba o tenía la intención de causar", "Cobertura para actos intencionales", "Un cálculo de prima", "Un formulario de reclamo"],
    correctAnswer: 0,
    explanationEn: "This exclusion removes coverage when the insured expected or intended to cause the injury or damage.",
    explanationEs: "Esta exclusión elimina cobertura cuando el asegurado esperaba o tenía la intención de causar la lesión o el daño."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is the business pursuits exclusion?",
    questionTextEs: "¿Qué es la exclusión de actividades comerciales?",
    optionsEn: ["An exclusion in personal policies for liability arising from business activities", "Business coverage", "A coverage addition", "A premium discount"],
    optionsEs: ["Una exclusión en pólizas personales por responsabilidad que surge de actividades comerciales", "Cobertura comercial", "Una adición de cobertura", "Un descuento de prima"],
    correctAnswer: 0,
    explanationEn: "The business pursuits exclusion removes coverage for liability arising from the insured's business activities.",
    explanationEs: "La exclusión de actividades comerciales elimina cobertura por responsabilidad que surge de las actividades comerciales del asegurado."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is the motor vehicle exclusion in homeowners policies?",
    questionTextEs: "¿Qué es la exclusión de vehículo motorizado en pólizas de propietarios?",
    optionsEn: ["Exclusion for liability arising from motor vehicle use", "Coverage for motor vehicles", "A premium discount", "A coverage addition"],
    optionsEs: ["Exclusión por responsabilidad que surge del uso de vehículos motorizados", "Cobertura para vehículos motorizados", "Un descuento de prima", "Una adición de cobertura"],
    correctAnswer: 0,
    explanationEn: "The motor vehicle exclusion removes coverage for motor vehicle-related liability from homeowners policies.",
    explanationEs: "La exclusión de vehículo motorizado elimina cobertura por responsabilidad relacionada con vehículos motorizados de las pólizas de propietarios."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is the watercraft exclusion?",
    questionTextEs: "¿Qué es la exclusión de embarcaciones?",
    optionsEn: ["Exclusion for liability from larger watercraft in homeowners policies", "Boat coverage", "A coverage addition", "A premium discount"],
    optionsEs: ["Exclusión por responsabilidad de embarcaciones más grandes en pólizas de propietarios", "Cobertura de botes", "Una adición de cobertura", "Un descuento de prima"],
    correctAnswer: 0,
    explanationEn: "The watercraft exclusion removes coverage for liability from larger boats and motorized watercraft.",
    explanationEs: "La exclusión de embarcaciones elimina cobertura por responsabilidad de botes más grandes y embarcaciones motorizadas."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is the aircraft exclusion?",
    questionTextEs: "¿Qué es la exclusión de aeronaves?",
    optionsEn: ["Exclusion for liability arising from aircraft ownership or operation", "Aircraft coverage", "A coverage addition", "A premium discount"],
    optionsEs: ["Exclusión por responsabilidad que surge de la propiedad u operación de aeronaves", "Cobertura de aeronaves", "Una adición de cobertura", "Un descuento de prima"],
    correctAnswer: 0,
    explanationEn: "The aircraft exclusion removes coverage for liability from owning, maintaining, or using aircraft.",
    explanationEs: "La exclusión de aeronaves elimina cobertura por responsabilidad de poseer, mantener o usar aeronaves."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is a workers compensation premium audit?",
    questionTextEs: "¿Qué es una auditoría de prima de compensación de trabajadores?",
    optionsEn: ["A review to verify actual payroll compared to estimated payroll for premium calculation", "A coverage audit", "A claims audit", "A policy review"],
    optionsEs: ["Una revisión para verificar la nómina real comparada con la nómina estimada para el cálculo de la prima", "Una auditoría de cobertura", "Una auditoría de reclamos", "Una revisión de póliza"],
    correctAnswer: 0,
    explanationEn: "A premium audit compares actual payroll to estimated payroll to determine if additional premium is owed.",
    explanationEs: "Una auditoría de prima compara la nómina real con la nómina estimada para determinar si se debe prima adicional."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is experience modification in workers compensation?",
    questionTextEs: "¿Qué es la modificación de experiencia en compensación de trabajadores?",
    optionsEn: ["A factor that adjusts premium based on the employer's loss history", "A coverage type", "A claim procedure", "A policy endorsement"],
    optionsEs: ["Un factor que ajusta la prima basándose en el historial de pérdidas del empleador", "Un tipo de cobertura", "Un procedimiento de reclamo", "Un endoso de póliza"],
    correctAnswer: 0,
    explanationEn: "Experience modification adjusts workers comp premiums based on the employer's actual loss experience compared to average.",
    explanationEs: "La modificación de experiencia ajusta las primas de compensación de trabajadores basándose en la experiencia de pérdidas real del empleador comparada con el promedio."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is the exclusive remedy doctrine in workers compensation?",
    questionTextEs: "¿Qué es la doctrina de remedio exclusivo en compensación de trabajadores?",
    optionsEn: ["Workers comp is the only remedy for workplace injuries; employees cannot sue employers", "Employees can sue for any injury", "Multiple remedies are available", "No remedy exists"],
    optionsEs: ["La compensación de trabajadores es el único remedio para lesiones en el trabajo; los empleados no pueden demandar a los empleadores", "Los empleados pueden demandar por cualquier lesión", "Múltiples remedios están disponibles", "No existe remedio"],
    correctAnswer: 0,
    explanationEn: "The exclusive remedy doctrine means workers compensation is the sole remedy for workplace injuries, barring lawsuits against employers.",
    explanationEs: "La doctrina de remedio exclusivo significa que la compensación de trabajadores es el único remedio para lesiones en el trabajo, impidiendo demandas contra empleadores."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What benefits does workers compensation typically provide?",
    questionTextEs: "¿Qué beneficios proporciona típicamente la compensación de trabajadores?",
    optionsEn: ["Medical expenses, lost wages, rehabilitation, and death benefits", "Only medical expenses", "Only lost wages", "Only rehabilitation"],
    optionsEs: ["Gastos médicos, salarios perdidos, rehabilitación y beneficios por muerte", "Solo gastos médicos", "Solo salarios perdidos", "Solo rehabilitación"],
    correctAnswer: 0,
    explanationEn: "Workers compensation provides medical benefits, disability income, rehabilitation services, and death benefits to survivors.",
    explanationEs: "La compensación de trabajadores proporciona beneficios médicos, ingresos por discapacidad, servicios de rehabilitación y beneficios por muerte a sobrevivientes."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is employers liability coverage in a workers compensation policy?",
    questionTextEs: "¿Qué es la cobertura de responsabilidad del empleador en una póliza de compensación de trabajadores?",
    optionsEn: ["Coverage for lawsuits by employees that are not covered under workers compensation", "Standard workers comp", "Property coverage", "Auto coverage"],
    optionsEs: ["Cobertura para demandas de empleados que no están cubiertas bajo compensación de trabajadores", "Compensación de trabajadores estándar", "Cobertura de propiedad", "Cobertura de auto"],
    correctAnswer: 0,
    explanationEn: "Employers liability (Part B) covers lawsuits from employees for workplace injuries not covered by workers compensation.",
    explanationEs: "La responsabilidad del empleador (Parte B) cubre demandas de empleados por lesiones en el trabajo no cubiertas por compensación de trabajadores."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is the standard workers compensation policy form?",
    questionTextEs: "¿Cuál es el formulario de póliza estándar de compensación de trabajadores?",
    optionsEn: ["Part A (Workers Comp) and Part B (Employers Liability)", "Only Part A", "Only Part B", "There is no standard form"],
    optionsEs: ["Parte A (Compensación de Trabajadores) y Parte B (Responsabilidad del Empleador)", "Solo Parte A", "Solo Parte B", "No hay formulario estándar"],
    correctAnswer: 0,
    explanationEn: "The standard workers compensation policy includes Part A for statutory benefits and Part B for employers liability.",
    explanationEs: "La póliza estándar de compensación de trabajadores incluye Parte A para beneficios estatutarios y Parte B para responsabilidad del empleador."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is the difference between replacement cost and market value?",
    questionTextEs: "¿Cuál es la diferencia entre costo de reemplazo y valor de mercado?",
    optionsEn: ["Replacement cost is what it costs to rebuild; market value is what the property would sell for", "They are the same", "Market value is always higher", "Replacement cost is always lower"],
    optionsEs: ["El costo de reemplazo es lo que cuesta reconstruir; el valor de mercado es por lo que la propiedad se vendería", "Son lo mismo", "El valor de mercado siempre es más alto", "El costo de reemplazo siempre es más bajo"],
    correctAnswer: 0,
    explanationEn: "Replacement cost is the cost to rebuild or replace; market value is what a buyer would pay in the open market.",
    explanationEs: "El costo de reemplazo es el costo de reconstruir o reemplazar; el valor de mercado es lo que un comprador pagaría en el mercado abierto."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is the purpose of a policy limit?",
    questionTextEs: "¿Cuál es el propósito de un límite de póliza?",
    optionsEn: ["To cap the maximum amount the insurer will pay for a covered loss", "To set the premium", "To define deductibles", "To list exclusions"],
    optionsEs: ["Limitar la cantidad máxima que el asegurador pagará por una pérdida cubierta", "Establecer la prima", "Definir deducibles", "Listar exclusiones"],
    correctAnswer: 0,
    explanationEn: "Policy limits establish the maximum amount the insurance company will pay for covered losses.",
    explanationEs: "Los límites de póliza establecen la cantidad máxima que la compañía de seguros pagará por pérdidas cubiertas."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is the purpose of a premium?",
    questionTextEs: "¿Cuál es el propósito de una prima?",
    optionsEn: ["The payment made by the insured in exchange for insurance coverage", "The deductible", "The claim payment", "The policy limit"],
    optionsEs: ["El pago hecho por el asegurado a cambio de cobertura de seguro", "El deducible", "El pago del reclamo", "El límite de póliza"],
    correctAnswer: 0,
    explanationEn: "A premium is the amount paid to the insurance company for insurance coverage.",
    explanationEs: "Una prima es la cantidad pagada a la compañía de seguros por cobertura de seguro."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What factors affect homeowners insurance premiums?",
    questionTextEs: "¿Qué factores afectan las primas de seguro de propietarios?",
    optionsEn: ["Location, construction type, coverage amount, deductible, claims history, and credit score", "Only location", "Only coverage amount", "Only claims history"],
    optionsEs: ["Ubicación, tipo de construcción, monto de cobertura, deducible, historial de reclamos y puntaje de crédito", "Solo ubicación", "Solo monto de cobertura", "Solo historial de reclamos"],
    correctAnswer: 0,
    explanationEn: "Multiple factors affect homeowners premiums including location, construction, coverage, deductible, claims history, and credit.",
    explanationEs: "Múltiples factores afectan las primas de propietarios incluyendo ubicación, construcción, cobertura, deducible, historial de reclamos y crédito."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What factors affect auto insurance premiums?",
    questionTextEs: "¿Qué factores afectan las primas de seguro de auto?",
    optionsEn: ["Driving record, age, vehicle type, location, coverage, and credit score", "Only age", "Only vehicle type", "Only driving record"],
    optionsEs: ["Historial de manejo, edad, tipo de vehículo, ubicación, cobertura y puntaje de crédito", "Solo edad", "Solo tipo de vehículo", "Solo historial de manejo"],
    correctAnswer: 0,
    explanationEn: "Auto premiums are affected by driving record, age, vehicle, location, coverage amounts, and credit history.",
    explanationEs: "Las primas de auto se ven afectadas por historial de manejo, edad, vehículo, ubicación, montos de cobertura e historial de crédito."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is the good student discount in auto insurance?",
    questionTextEs: "¿Qué es el descuento de buen estudiante en seguro de auto?",
    optionsEn: ["A discount for students who maintain good grades", "A discount for safe drivers", "A discount for new cars", "A discount for seniors"],
    optionsEs: ["Un descuento para estudiantes que mantienen buenas calificaciones", "Un descuento para conductores seguros", "Un descuento para carros nuevos", "Un descuento para adultos mayores"],
    correctAnswer: 0,
    explanationEn: "The good student discount reduces auto premiums for young drivers who maintain good academic grades.",
    explanationEs: "El descuento de buen estudiante reduce las primas de auto para conductores jóvenes que mantienen buenas calificaciones académicas."
  }
];

async function seedFinalPCQuestions() {
  console.log("Seeding final Property & Casualty questions...");
  
  try {
    for (const question of finalPCQuestions) {
      await db.insert(questions).values(question);
    }
    console.log(`Successfully added ${finalPCQuestions.length} Property & Casualty questions`);
  } catch (error) {
    console.error("Error seeding P&C questions:", error);
    throw error;
  }
}

seedFinalPCQuestions()
  .then(() => {
    console.log("Property & Casualty now at 200 questions!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  });
