import { db } from "./db";
import { questions } from "@shared/schema";

interface QuestionData {
  category: "property_casualty";
  questionTextEn: string;
  questionTextEs: string;
  optionsEn: string[];
  optionsEs: string[];
  correctAnswer: number;
  explanationEn: string;
  explanationEs: string;
}

const propertyCasualtyQuestions: QuestionData[] = [
  // TDI Regulations and Licensing (1-25)
  {
    category: "property_casualty",
    questionTextEn: "What state agency regulates insurance in Texas?",
    questionTextEs: "¿Qué agencia estatal regula los seguros en Texas?",
    optionsEn: ["Texas Department of Insurance (TDI)", "Texas Real Estate Commission", "Texas Department of Licensing", "Texas Insurance Board"],
    optionsEs: ["Departamento de Seguros de Texas (TDI)", "Comisión de Bienes Raíces de Texas", "Departamento de Licencias de Texas", "Junta de Seguros de Texas"],
    correctAnswer: 0,
    explanationEn: "The Texas Department of Insurance (TDI) regulates the insurance industry in Texas.",
    explanationEs: "El Departamento de Seguros de Texas (TDI) regula la industria de seguros en Texas."
  },
  {
    category: "property_casualty",
    questionTextEn: "How many hours of pre-licensing education are required for a Property & Casualty license in Texas?",
    questionTextEs: "¿Cuántas horas de educación previa a la licencia se requieren para una licencia de Propiedad y Accidentes en Texas?",
    optionsEn: ["40 hours", "20 hours", "60 hours", "80 hours"],
    optionsEs: ["40 horas", "20 horas", "60 horas", "80 horas"],
    correctAnswer: 0,
    explanationEn: "Texas requires 40 hours of pre-licensing education for a Property & Casualty insurance license.",
    explanationEs: "Texas requiere 40 horas de educación previa a la licencia para una licencia de seguros de Propiedad y Accidentes."
  },
  {
    category: "property_casualty",
    questionTextEn: "How often must a Texas P&C insurance license be renewed?",
    questionTextEs: "¿Con qué frecuencia debe renovarse una licencia de seguros P&C de Texas?",
    optionsEn: ["Every 2 years", "Every year", "Every 3 years", "Every 5 years"],
    optionsEs: ["Cada 2 años", "Cada año", "Cada 3 años", "Cada 5 años"],
    correctAnswer: 0,
    explanationEn: "Texas insurance licenses must be renewed every two years.",
    explanationEs: "Las licencias de seguros de Texas deben renovarse cada dos años."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is the continuing education requirement for Texas P&C license renewal?",
    questionTextEs: "¿Cuál es el requisito de educación continua para la renovación de licencia P&C de Texas?",
    optionsEn: ["24 hours including ethics", "12 hours", "40 hours", "No CE required"],
    optionsEs: ["24 horas incluyendo ética", "12 horas", "40 horas", "No se requiere EC"],
    correctAnswer: 0,
    explanationEn: "Texas requires 24 hours of continuing education for license renewal, including ethics hours.",
    explanationEs: "Texas requiere 24 horas de educación continua para la renovación de licencia, incluyendo horas de ética."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is the minimum age to obtain a Texas insurance license?",
    questionTextEs: "¿Cuál es la edad mínima para obtener una licencia de seguros de Texas?",
    optionsEn: ["18 years old", "21 years old", "16 years old", "25 years old"],
    optionsEs: ["18 años", "21 años", "16 años", "25 años"],
    correctAnswer: 0,
    explanationEn: "Applicants must be at least 18 years old to obtain a Texas insurance license.",
    explanationEs: "Los solicitantes deben tener al menos 18 años para obtener una licencia de seguros de Texas."
  },
  {
    category: "property_casualty",
    questionTextEn: "An insurance agent who represents multiple insurance companies is called a:",
    questionTextEs: "Un agente de seguros que representa a múltiples compañías de seguros se llama:",
    optionsEn: ["Independent agent", "Captive agent", "Exclusive agent", "Company agent"],
    optionsEs: ["Agente independiente", "Agente cautivo", "Agente exclusivo", "Agente de compañía"],
    correctAnswer: 0,
    explanationEn: "An independent agent represents multiple insurance companies and can offer products from various insurers.",
    explanationEs: "Un agente independiente representa a múltiples compañías de seguros y puede ofrecer productos de varios aseguradores."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is an insurance producer?",
    questionTextEs: "¿Qué es un productor de seguros?",
    optionsEn: ["A licensed individual who sells, solicits, or negotiates insurance", "An insurance company", "A claims adjuster", "An underwriter"],
    optionsEs: ["Un individuo licenciado que vende, solicita o negocia seguros", "Una compañía de seguros", "Un ajustador de reclamos", "Un suscriptor"],
    correctAnswer: 0,
    explanationEn: "An insurance producer is a licensed individual who sells, solicits, or negotiates insurance contracts.",
    explanationEs: "Un productor de seguros es un individuo licenciado que vende, solicita o negocia contratos de seguros."
  },
  {
    category: "property_casualty",
    questionTextEn: "What action can TDI take against an agent who commits fraud?",
    questionTextEs: "¿Qué acción puede tomar TDI contra un agente que comete fraude?",
    optionsEn: ["Revoke or suspend the license and impose fines", "Only issue a warning", "Nothing", "Transfer to another state"],
    optionsEs: ["Revocar o suspender la licencia e imponer multas", "Solo emitir una advertencia", "Nada", "Transferir a otro estado"],
    correctAnswer: 0,
    explanationEn: "TDI can revoke, suspend, or refuse to renew licenses and impose administrative penalties for fraud.",
    explanationEs: "TDI puede revocar, suspender o negarse a renovar licencias e imponer penalidades administrativas por fraude."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is twisting in insurance?",
    questionTextEs: "¿Qué es el twisting en seguros?",
    optionsEn: ["Using misrepresentation to induce a policyholder to replace existing coverage", "Selling multiple policies", "Offering discounts", "Providing good service"],
    optionsEs: ["Usar tergiversación para inducir a un asegurado a reemplazar cobertura existente", "Vender múltiples pólizas", "Ofrecer descuentos", "Proporcionar buen servicio"],
    correctAnswer: 0,
    explanationEn: "Twisting is the unethical practice of using misrepresentation to induce a customer to cancel existing coverage and buy a new policy.",
    explanationEs: "El twisting es la práctica poco ética de usar tergiversación para inducir a un cliente a cancelar cobertura existente y comprar una nueva póliza."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is rebating in insurance?",
    questionTextEs: "¿Qué es el rebating en seguros?",
    optionsEn: ["Offering something of value not in the policy as an inducement to purchase", "Providing a policy discount", "Offering good customer service", "Providing a quote"],
    optionsEs: ["Ofrecer algo de valor no incluido en la póliza como incentivo para comprar", "Proporcionar un descuento en la póliza", "Ofrecer buen servicio al cliente", "Proporcionar una cotización"],
    correctAnswer: 0,
    explanationEn: "Rebating is the illegal practice of offering anything of value not specified in the policy as an inducement to purchase insurance.",
    explanationEs: "El rebating es la práctica ilegal de ofrecer cualquier cosa de valor no especificada en la póliza como incentivo para comprar seguros."
  },
  // Property Insurance Fundamentals (26-55)
  {
    category: "property_casualty",
    questionTextEn: "What does a homeowners insurance policy typically cover?",
    questionTextEs: "¿Qué cubre típicamente una póliza de seguro de propietarios?",
    optionsEn: ["Dwelling, personal property, liability, and additional living expenses", "Only the structure", "Only personal belongings", "Only liability"],
    optionsEs: ["Vivienda, propiedad personal, responsabilidad y gastos de vida adicionales", "Solo la estructura", "Solo pertenencias personales", "Solo responsabilidad"],
    correctAnswer: 0,
    explanationEn: "Standard homeowners policies cover the dwelling, other structures, personal property, liability, and additional living expenses.",
    explanationEs: "Las pólizas estándar de propietarios cubren la vivienda, otras estructuras, propiedad personal, responsabilidad y gastos de vida adicionales."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is the difference between named perils and open perils coverage?",
    questionTextEs: "¿Cuál es la diferencia entre cobertura de riesgos nombrados y riesgos abiertos?",
    optionsEn: ["Named perils covers only listed perils; open perils covers all except exclusions", "They are the same", "Open perils is cheaper", "Named perils covers more"],
    optionsEs: ["Riesgos nombrados cubre solo riesgos listados; riesgos abiertos cubre todos excepto exclusiones", "Son lo mismo", "Riesgos abiertos es más barato", "Riesgos nombrados cubre más"],
    correctAnswer: 0,
    explanationEn: "Named perils coverage only covers losses from specifically listed causes, while open perils covers any cause not specifically excluded.",
    explanationEs: "La cobertura de riesgos nombrados solo cubre pérdidas de causas específicamente listadas, mientras que riesgos abiertos cubre cualquier causa no específicamente excluida."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is actual cash value (ACV)?",
    questionTextEs: "¿Qué es el valor real en efectivo (ACV)?",
    optionsEn: ["Replacement cost minus depreciation", "Original purchase price", "Market value only", "Appraised value"],
    optionsEs: ["Costo de reemplazo menos depreciación", "Precio de compra original", "Solo valor de mercado", "Valor tasado"],
    correctAnswer: 0,
    explanationEn: "Actual cash value is the replacement cost of property minus depreciation for age and condition.",
    explanationEs: "El valor real en efectivo es el costo de reemplazo de la propiedad menos la depreciación por edad y condición."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is replacement cost coverage?",
    questionTextEs: "¿Qué es la cobertura de costo de reemplazo?",
    optionsEn: ["Coverage that pays to replace damaged property without deducting depreciation", "The cheapest coverage option", "Coverage for old items only", "Coverage minus deductible only"],
    optionsEs: ["Cobertura que paga para reemplazar propiedad dañada sin deducir depreciación", "La opción de cobertura más barata", "Cobertura solo para artículos viejos", "Cobertura menos deducible solamente"],
    correctAnswer: 0,
    explanationEn: "Replacement cost coverage pays the full cost to replace damaged property with new items of similar kind and quality, without depreciation.",
    explanationEs: "La cobertura de costo de reemplazo paga el costo total para reemplazar propiedad dañada con artículos nuevos de tipo y calidad similar, sin depreciación."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is a deductible?",
    questionTextEs: "¿Qué es un deducible?",
    optionsEn: ["The amount the insured must pay before insurance coverage kicks in", "The premium amount", "The coverage limit", "The policy fee"],
    optionsEs: ["La cantidad que el asegurado debe pagar antes de que la cobertura de seguro comience", "El monto de la prima", "El límite de cobertura", "La tarifa de la póliza"],
    correctAnswer: 0,
    explanationEn: "A deductible is the out-of-pocket amount the policyholder pays before the insurance company pays a claim.",
    explanationEs: "Un deducible es la cantidad de bolsillo que el asegurado paga antes de que la compañía de seguros pague un reclamo."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is coinsurance in property insurance?",
    questionTextEs: "¿Qué es el coaseguro en seguros de propiedad?",
    optionsEn: ["A clause requiring the insured to carry a minimum percentage of property value", "Sharing a policy with another person", "Having two insurance companies", "A type of deductible"],
    optionsEs: ["Una cláusula que requiere que el asegurado lleve un porcentaje mínimo del valor de la propiedad", "Compartir una póliza con otra persona", "Tener dos compañías de seguros", "Un tipo de deducible"],
    correctAnswer: 0,
    explanationEn: "Coinsurance requires the insured to maintain coverage at a specified percentage (usually 80%) of the property's value to receive full claim payment.",
    explanationEs: "El coaseguro requiere que el asegurado mantenga cobertura a un porcentaje especificado (usualmente 80%) del valor de la propiedad para recibir el pago completo del reclamo."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is the HO-3 policy form?",
    questionTextEs: "¿Qué es el formulario de póliza HO-3?",
    optionsEn: ["The most common homeowners policy with open perils on dwelling, named perils on contents", "A renter's policy", "A condo policy", "A mobile home policy"],
    optionsEs: ["La póliza de propietarios más común con riesgos abiertos en vivienda, riesgos nombrados en contenidos", "Una póliza de inquilinos", "Una póliza de condominio", "Una póliza de casa móvil"],
    correctAnswer: 0,
    explanationEn: "The HO-3 is the most common homeowners policy, providing open peril coverage on the dwelling and named peril coverage on personal property.",
    explanationEs: "El HO-3 es la póliza de propietarios más común, proporcionando cobertura de riesgo abierto en la vivienda y cobertura de riesgo nombrado en propiedad personal."
  },
  {
    category: "property_casualty",
    questionTextEn: "What does Coverage A in a homeowners policy cover?",
    questionTextEs: "¿Qué cubre la Cobertura A en una póliza de propietarios?",
    optionsEn: ["The dwelling (main residence)", "Personal property", "Liability", "Medical payments"],
    optionsEs: ["La vivienda (residencia principal)", "Propiedad personal", "Responsabilidad", "Pagos médicos"],
    correctAnswer: 0,
    explanationEn: "Coverage A covers the dwelling structure itself, including attached structures like a garage.",
    explanationEs: "La Cobertura A cubre la estructura de la vivienda en sí, incluyendo estructuras adjuntas como un garaje."
  },
  {
    category: "property_casualty",
    questionTextEn: "What does Coverage B in a homeowners policy cover?",
    questionTextEs: "¿Qué cubre la Cobertura B en una póliza de propietarios?",
    optionsEn: ["Other structures on the property (detached garage, fence, shed)", "The main house", "Personal belongings", "Liability claims"],
    optionsEs: ["Otras estructuras en la propiedad (garaje separado, cerca, cobertizo)", "La casa principal", "Pertenencias personales", "Reclamos de responsabilidad"],
    correctAnswer: 0,
    explanationEn: "Coverage B covers other structures on the property that are not attached to the dwelling, such as a detached garage or fence.",
    explanationEs: "La Cobertura B cubre otras estructuras en la propiedad que no están adjuntas a la vivienda, como un garaje separado o cerca."
  },
  {
    category: "property_casualty",
    questionTextEn: "What does Coverage C in a homeowners policy cover?",
    questionTextEs: "¿Qué cubre la Cobertura C en una póliza de propietarios?",
    optionsEn: ["Personal property (belongings)", "The dwelling", "Other structures", "Liability"],
    optionsEs: ["Propiedad personal (pertenencias)", "La vivienda", "Otras estructuras", "Responsabilidad"],
    correctAnswer: 0,
    explanationEn: "Coverage C covers the policyholder's personal property, including furniture, clothing, electronics, and other belongings.",
    explanationEs: "La Cobertura C cubre la propiedad personal del asegurado, incluyendo muebles, ropa, electrónicos y otras pertenencias."
  },
  {
    category: "property_casualty",
    questionTextEn: "What does Coverage D in a homeowners policy cover?",
    questionTextEs: "¿Qué cubre la Cobertura D en una póliza de propietarios?",
    optionsEn: ["Loss of use/additional living expenses", "The dwelling", "Personal property", "Liability"],
    optionsEs: ["Pérdida de uso/gastos de vida adicionales", "La vivienda", "Propiedad personal", "Responsabilidad"],
    correctAnswer: 0,
    explanationEn: "Coverage D covers additional living expenses if the home becomes uninhabitable due to a covered loss.",
    explanationEs: "La Cobertura D cubre gastos de vida adicionales si la casa se vuelve inhabitable debido a una pérdida cubierta."
  },
  {
    category: "property_casualty",
    questionTextEn: "What does Coverage E in a homeowners policy cover?",
    questionTextEs: "¿Qué cubre la Cobertura E en una póliza de propietarios?",
    optionsEn: ["Personal liability", "The dwelling", "Personal property", "Medical payments"],
    optionsEs: ["Responsabilidad personal", "La vivienda", "Propiedad personal", "Pagos médicos"],
    correctAnswer: 0,
    explanationEn: "Coverage E provides personal liability protection for claims against the insured for bodily injury or property damage to others.",
    explanationEs: "La Cobertura E proporciona protección de responsabilidad personal para reclamos contra el asegurado por lesiones corporales o daños a la propiedad de otros."
  },
  {
    category: "property_casualty",
    questionTextEn: "What does Coverage F in a homeowners policy cover?",
    questionTextEs: "¿Qué cubre la Cobertura F en una póliza de propietarios?",
    optionsEn: ["Medical payments to others", "The dwelling", "Personal property", "Liability lawsuits"],
    optionsEs: ["Pagos médicos a otros", "La vivienda", "Propiedad personal", "Demandas de responsabilidad"],
    correctAnswer: 0,
    explanationEn: "Coverage F provides medical payments to others who are injured on the insured's property, regardless of fault.",
    explanationEs: "La Cobertura F proporciona pagos médicos a otros que se lesionan en la propiedad del asegurado, independientemente de la culpa."
  },
  {
    category: "property_casualty",
    questionTextEn: "Which peril is typically excluded from standard homeowners policies?",
    questionTextEs: "¿Qué peligro típicamente se excluye de las pólizas estándar de propietarios?",
    optionsEn: ["Flood", "Fire", "Wind", "Lightning"],
    optionsEs: ["Inundación", "Incendio", "Viento", "Rayo"],
    correctAnswer: 0,
    explanationEn: "Flood damage is typically excluded from standard homeowners policies and requires separate flood insurance.",
    explanationEs: "El daño por inundación típicamente se excluye de las pólizas estándar de propietarios y requiere seguro contra inundaciones separado."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is the National Flood Insurance Program (NFIP)?",
    questionTextEs: "¿Qué es el Programa Nacional de Seguro contra Inundaciones (NFIP)?",
    optionsEn: ["A federal program providing flood insurance in participating communities", "A private insurance company", "A state program", "A type of homeowners policy"],
    optionsEs: ["Un programa federal que proporciona seguro contra inundaciones en comunidades participantes", "Una compañía de seguros privada", "Un programa estatal", "Un tipo de póliza de propietarios"],
    correctAnswer: 0,
    explanationEn: "The NFIP is a federal program administered by FEMA that provides flood insurance to property owners in participating communities.",
    explanationEs: "El NFIP es un programa federal administrado por FEMA que proporciona seguro contra inundaciones a propietarios en comunidades participantes."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is a dwelling policy?",
    questionTextEs: "¿Qué es una póliza de vivienda?",
    optionsEn: ["A policy for rental properties or homes that don't qualify for standard homeowners coverage", "The same as HO-3", "A commercial policy", "A liability-only policy"],
    optionsEs: ["Una póliza para propiedades de alquiler o casas que no califican para cobertura estándar de propietarios", "Lo mismo que HO-3", "Una póliza comercial", "Una póliza solo de responsabilidad"],
    correctAnswer: 0,
    explanationEn: "Dwelling policies provide coverage for properties that don't qualify for homeowners policies, such as rental properties or vacant homes.",
    explanationEs: "Las pólizas de vivienda proporcionan cobertura para propiedades que no califican para pólizas de propietarios, como propiedades de alquiler o casas vacías."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is an HO-4 policy?",
    questionTextEs: "¿Qué es una póliza HO-4?",
    optionsEn: ["Renter's insurance policy", "Homeowner's policy", "Condo policy", "Mobile home policy"],
    optionsEs: ["Póliza de seguro de inquilinos", "Póliza de propietarios", "Póliza de condominio", "Póliza de casa móvil"],
    correctAnswer: 0,
    explanationEn: "HO-4 is renters insurance, covering personal property and liability for tenants who don't own the dwelling.",
    explanationEs: "HO-4 es seguro de inquilinos, cubriendo propiedad personal y responsabilidad para inquilinos que no son dueños de la vivienda."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is an HO-6 policy?",
    questionTextEs: "¿Qué es una póliza HO-6?",
    optionsEn: ["Condominium unit owners policy", "Single family homeowners policy", "Renter's policy", "Mobile home policy"],
    optionsEs: ["Póliza de propietarios de unidades de condominio", "Póliza de propietarios de casa unifamiliar", "Póliza de inquilinos", "Póliza de casa móvil"],
    correctAnswer: 0,
    explanationEn: "HO-6 is designed for condominium unit owners, covering personal property, liability, and improvements to the unit.",
    explanationEs: "HO-6 está diseñada para propietarios de unidades de condominio, cubriendo propiedad personal, responsabilidad y mejoras a la unidad."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is subrogation in insurance?",
    questionTextEs: "¿Qué es la subrogación en seguros?",
    optionsEn: ["The insurer's right to pursue a third party that caused the loss", "Transferring the policy to another person", "Canceling the policy", "Reducing the premium"],
    optionsEs: ["El derecho del asegurador de perseguir a un tercero que causó la pérdida", "Transferir la póliza a otra persona", "Cancelar la póliza", "Reducir la prima"],
    correctAnswer: 0,
    explanationEn: "Subrogation allows an insurer that paid a claim to pursue recovery from the third party responsible for causing the loss.",
    explanationEs: "La subrogación permite a un asegurador que pagó un reclamo perseguir la recuperación del tercero responsable de causar la pérdida."
  },
  // Auto Insurance (56-90)
  {
    category: "property_casualty",
    questionTextEn: "What are the minimum liability limits required for auto insurance in Texas?",
    questionTextEs: "¿Cuáles son los límites mínimos de responsabilidad requeridos para el seguro de auto en Texas?",
    optionsEn: ["30/60/25 (30K bodily injury per person, 60K per accident, 25K property damage)", "15/30/10", "50/100/50", "100/300/100"],
    optionsEs: ["30/60/25 (30K lesiones corporales por persona, 60K por accidente, 25K daños a la propiedad)", "15/30/10", "50/100/50", "100/300/100"],
    correctAnswer: 0,
    explanationEn: "Texas requires minimum liability coverage of 30/60/25: $30,000 bodily injury per person, $60,000 per accident, and $25,000 property damage.",
    explanationEs: "Texas requiere cobertura mínima de responsabilidad de 30/60/25: $30,000 lesiones corporales por persona, $60,000 por accidente y $25,000 daños a la propiedad."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is liability coverage in auto insurance?",
    questionTextEs: "¿Qué es la cobertura de responsabilidad en el seguro de auto?",
    optionsEn: ["Coverage for damages you cause to others", "Coverage for your own vehicle", "Coverage for medical bills", "Coverage for theft"],
    optionsEs: ["Cobertura por daños que usted causa a otros", "Cobertura para su propio vehículo", "Cobertura para facturas médicas", "Cobertura por robo"],
    correctAnswer: 0,
    explanationEn: "Liability coverage pays for injuries and property damage you cause to others in an accident where you are at fault.",
    explanationEs: "La cobertura de responsabilidad paga por lesiones y daños a la propiedad que usted causa a otros en un accidente donde usted tiene la culpa."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is collision coverage?",
    questionTextEs: "¿Qué es la cobertura de colisión?",
    optionsEn: ["Coverage for damage to your vehicle from hitting another vehicle or object", "Coverage for damage from weather", "Coverage for theft", "Coverage for medical bills"],
    optionsEs: ["Cobertura por daños a su vehículo por chocar con otro vehículo u objeto", "Cobertura por daños del clima", "Cobertura por robo", "Cobertura para facturas médicas"],
    correctAnswer: 0,
    explanationEn: "Collision coverage pays to repair or replace your vehicle if it collides with another vehicle or object, regardless of fault.",
    explanationEs: "La cobertura de colisión paga para reparar o reemplazar su vehículo si colisiona con otro vehículo u objeto, independientemente de la culpa."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is comprehensive coverage?",
    questionTextEs: "¿Qué es la cobertura comprensiva?",
    optionsEn: ["Coverage for non-collision damage like theft, vandalism, weather, and animal strikes", "Coverage for collisions only", "Liability coverage", "Medical payments coverage"],
    optionsEs: ["Cobertura por daños sin colisión como robo, vandalismo, clima e impactos de animales", "Cobertura solo por colisiones", "Cobertura de responsabilidad", "Cobertura de pagos médicos"],
    correctAnswer: 0,
    explanationEn: "Comprehensive coverage pays for damage to your vehicle from non-collision events such as theft, vandalism, hail, fire, and animal strikes.",
    explanationEs: "La cobertura comprensiva paga por daños a su vehículo de eventos sin colisión como robo, vandalismo, granizo, incendio e impactos de animales."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is Personal Injury Protection (PIP) in Texas?",
    questionTextEs: "¿Qué es la Protección de Lesiones Personales (PIP) en Texas?",
    optionsEn: ["No-fault coverage for medical expenses and lost wages for the insured", "Liability coverage", "Collision coverage", "Property damage coverage"],
    optionsEs: ["Cobertura sin culpa para gastos médicos y salarios perdidos para el asegurado", "Cobertura de responsabilidad", "Cobertura de colisión", "Cobertura de daños a la propiedad"],
    correctAnswer: 0,
    explanationEn: "PIP is no-fault coverage that pays medical expenses and lost income for you and your passengers, regardless of who caused the accident.",
    explanationEs: "PIP es cobertura sin culpa que paga gastos médicos e ingresos perdidos para usted y sus pasajeros, independientemente de quién causó el accidente."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is uninsured motorist coverage?",
    questionTextEs: "¿Qué es la cobertura de motorista sin seguro?",
    optionsEn: ["Coverage when you're hit by a driver who has no insurance", "Coverage for your vehicle repairs", "Medical payments coverage", "Comprehensive coverage"],
    optionsEs: ["Cobertura cuando es golpeado por un conductor que no tiene seguro", "Cobertura para reparaciones de su vehículo", "Cobertura de pagos médicos", "Cobertura comprensiva"],
    correctAnswer: 0,
    explanationEn: "Uninsured motorist coverage protects you when you're injured by a driver who has no liability insurance.",
    explanationEs: "La cobertura de motorista sin seguro lo protege cuando es lesionado por un conductor que no tiene seguro de responsabilidad."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is underinsured motorist coverage?",
    questionTextEs: "¿Qué es la cobertura de motorista con seguro insuficiente?",
    optionsEn: ["Coverage when the at-fault driver's insurance limits are insufficient to cover your damages", "Coverage for uninsured drivers", "Collision coverage", "Comprehensive coverage"],
    optionsEs: ["Cobertura cuando los límites de seguro del conductor culpable son insuficientes para cubrir sus daños", "Cobertura para conductores sin seguro", "Cobertura de colisión", "Cobertura comprensiva"],
    correctAnswer: 0,
    explanationEn: "Underinsured motorist coverage kicks in when the at-fault driver's insurance isn't enough to cover your injuries and damages.",
    explanationEs: "La cobertura de motorista con seguro insuficiente entra cuando el seguro del conductor culpable no es suficiente para cubrir sus lesiones y daños."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is a personal auto policy (PAP)?",
    questionTextEs: "¿Qué es una póliza de automóvil personal (PAP)?",
    optionsEn: ["A standard personal automobile insurance policy", "A commercial auto policy", "A motorcycle policy", "A fleet policy"],
    optionsEs: ["Una póliza estándar de seguro de automóvil personal", "Una póliza de auto comercial", "Una póliza de motocicleta", "Una póliza de flota"],
    correctAnswer: 0,
    explanationEn: "The PAP is the standard personal automobile insurance policy covering personal vehicles for non-commercial use.",
    explanationEs: "La PAP es la póliza estándar de seguro de automóvil personal que cubre vehículos personales para uso no comercial."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is medical payments coverage in auto insurance?",
    questionTextEs: "¿Qué es la cobertura de pagos médicos en el seguro de auto?",
    optionsEn: ["Coverage for medical expenses for you and passengers regardless of fault", "Liability coverage", "Collision coverage", "Comprehensive coverage"],
    optionsEs: ["Cobertura para gastos médicos para usted y pasajeros independientemente de la culpa", "Cobertura de responsabilidad", "Cobertura de colisión", "Cobertura comprensiva"],
    correctAnswer: 0,
    explanationEn: "Medical payments coverage pays for medical expenses for you and your passengers injured in an auto accident, regardless of fault.",
    explanationEs: "La cobertura de pagos médicos paga gastos médicos para usted y sus pasajeros lesionados en un accidente de auto, independientemente de la culpa."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is rental reimbursement coverage?",
    questionTextEs: "¿Qué es la cobertura de reembolso de alquiler?",
    optionsEn: ["Coverage for the cost of a rental car while your vehicle is being repaired", "Coverage for rental property", "Liability coverage", "Medical coverage"],
    optionsEs: ["Cobertura para el costo de un auto de alquiler mientras su vehículo está siendo reparado", "Cobertura para propiedad de alquiler", "Cobertura de responsabilidad", "Cobertura médica"],
    correctAnswer: 0,
    explanationEn: "Rental reimbursement coverage pays for a rental car while your vehicle is being repaired after a covered claim.",
    explanationEs: "La cobertura de reembolso de alquiler paga por un auto de alquiler mientras su vehículo está siendo reparado después de un reclamo cubierto."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is towing and labor coverage?",
    questionTextEs: "¿Qué es la cobertura de remolque y mano de obra?",
    optionsEn: ["Coverage for towing and roadside service costs", "Collision coverage", "Comprehensive coverage", "Liability coverage"],
    optionsEs: ["Cobertura para costos de remolque y servicio en carretera", "Cobertura de colisión", "Cobertura comprensiva", "Cobertura de responsabilidad"],
    correctAnswer: 0,
    explanationEn: "Towing and labor coverage pays for towing and minor roadside repairs when your vehicle is disabled.",
    explanationEs: "La cobertura de remolque y mano de obra paga por remolque y reparaciones menores en carretera cuando su vehículo está deshabilitado."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is gap coverage?",
    questionTextEs: "¿Qué es la cobertura de brecha?",
    optionsEn: ["Coverage for the difference between what you owe on a vehicle and its actual cash value", "Coverage for gaps in employment", "Medical coverage gaps", "Liability gaps"],
    optionsEs: ["Cobertura por la diferencia entre lo que debe en un vehículo y su valor real en efectivo", "Cobertura por brechas en el empleo", "Brechas de cobertura médica", "Brechas de responsabilidad"],
    correctAnswer: 0,
    explanationEn: "Gap coverage pays the difference between what you owe on a financed/leased vehicle and its ACV if it's totaled.",
    explanationEs: "La cobertura de brecha paga la diferencia entre lo que debe en un vehículo financiado/arrendado y su ACV si es pérdida total."
  },
  {
    category: "property_casualty",
    questionTextEn: "Who is covered under a personal auto policy's liability coverage?",
    questionTextEs: "¿Quién está cubierto bajo la cobertura de responsabilidad de una póliza de auto personal?",
    optionsEn: ["The named insured, family members, and permissive users", "Only the named insured", "Only family members", "Only the vehicle owner"],
    optionsEs: ["El asegurado nombrado, miembros de la familia y usuarios permitidos", "Solo el asegurado nombrado", "Solo miembros de la familia", "Solo el propietario del vehículo"],
    correctAnswer: 0,
    explanationEn: "Liability coverage typically extends to the named insured, resident family members, and anyone using the vehicle with permission.",
    explanationEs: "La cobertura de responsabilidad típicamente se extiende al asegurado nombrado, miembros de la familia residentes y cualquiera que use el vehículo con permiso."
  },
  {
    category: "property_casualty",
    questionTextEn: "What happens if you let an uninsured friend drive your car and they cause an accident?",
    questionTextEs: "¿Qué pasa si deja que un amigo sin seguro conduzca su auto y causa un accidente?",
    optionsEn: ["Your insurance typically covers the accident as primary", "The friend's insurance covers it", "No coverage applies", "The state pays for damages"],
    optionsEs: ["Su seguro típicamente cubre el accidente como primario", "El seguro del amigo lo cubre", "No aplica cobertura", "El estado paga por los daños"],
    correctAnswer: 0,
    explanationEn: "In most cases, auto insurance follows the vehicle, so your policy would be primary coverage for permissive users.",
    explanationEs: "En la mayoría de los casos, el seguro de auto sigue al vehículo, así que su póliza sería la cobertura primaria para usuarios permitidos."
  },
  // Commercial Insurance (66-90)
  {
    category: "property_casualty",
    questionTextEn: "What is a Commercial Package Policy (CPP)?",
    questionTextEs: "¿Qué es una Póliza de Paquete Comercial (CPP)?",
    optionsEn: ["A customizable policy combining property and liability coverage for businesses", "A personal auto policy", "A homeowners policy", "A health insurance policy"],
    optionsEs: ["Una póliza personalizable que combina cobertura de propiedad y responsabilidad para negocios", "Una póliza de auto personal", "Una póliza de propietarios", "Una póliza de seguro de salud"],
    correctAnswer: 0,
    explanationEn: "A CPP combines various business coverages like property, liability, and crime into one customizable policy.",
    explanationEs: "Una CPP combina varias coberturas de negocios como propiedad, responsabilidad y crimen en una póliza personalizable."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is a Business Owners Policy (BOP)?",
    questionTextEs: "¿Qué es una Póliza de Propietarios de Negocios (BOP)?",
    optionsEn: ["A package policy for small to medium businesses combining property and liability", "A large corporation policy", "A personal policy", "An auto policy"],
    optionsEs: ["Una póliza de paquete para pequeñas y medianas empresas que combina propiedad y responsabilidad", "Una póliza de corporación grande", "Una póliza personal", "Una póliza de auto"],
    correctAnswer: 0,
    explanationEn: "A BOP is a simplified package policy designed for small to medium-sized businesses, combining property and general liability coverage.",
    explanationEs: "Una BOP es una póliza de paquete simplificada diseñada para pequeñas y medianas empresas, combinando cobertura de propiedad y responsabilidad general."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is Commercial General Liability (CGL) insurance?",
    questionTextEs: "¿Qué es el seguro de Responsabilidad General Comercial (CGL)?",
    optionsEn: ["Coverage for a business's liability for bodily injury, property damage, and personal/advertising injury", "Auto insurance for businesses", "Property insurance", "Workers compensation"],
    optionsEs: ["Cobertura para la responsabilidad de un negocio por lesiones corporales, daños a la propiedad y lesiones personales/publicitarias", "Seguro de auto para negocios", "Seguro de propiedad", "Compensación de trabajadores"],
    correctAnswer: 0,
    explanationEn: "CGL insurance protects businesses against claims of bodily injury, property damage, and personal/advertising injury to third parties.",
    explanationEs: "El seguro CGL protege a los negocios contra reclamos de lesiones corporales, daños a la propiedad y lesiones personales/publicitarias a terceros."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is products liability coverage?",
    questionTextEs: "¿Qué es la cobertura de responsabilidad de productos?",
    optionsEn: ["Coverage for claims arising from products manufactured or sold by the business", "Coverage for product warranties", "Property insurance", "Auto insurance"],
    optionsEs: ["Cobertura para reclamos que surgen de productos fabricados o vendidos por el negocio", "Cobertura para garantías de productos", "Seguro de propiedad", "Seguro de auto"],
    correctAnswer: 0,
    explanationEn: "Products liability coverage protects businesses against claims for injuries or damages caused by products they manufacture or sell.",
    explanationEs: "La cobertura de responsabilidad de productos protege a los negocios contra reclamos por lesiones o daños causados por productos que fabrican o venden."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is professional liability insurance (E&O)?",
    questionTextEs: "¿Qué es el seguro de responsabilidad profesional (E&O)?",
    optionsEn: ["Coverage for claims arising from professional services or advice", "General liability insurance", "Property insurance", "Auto insurance"],
    optionsEs: ["Cobertura para reclamos que surgen de servicios o consejos profesionales", "Seguro de responsabilidad general", "Seguro de propiedad", "Seguro de auto"],
    correctAnswer: 0,
    explanationEn: "Professional liability (Errors & Omissions) insurance covers claims arising from professional negligence, errors, or omissions.",
    explanationEs: "El seguro de responsabilidad profesional (Errores y Omisiones) cubre reclamos que surgen de negligencia profesional, errores u omisiones."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is workers' compensation insurance?",
    questionTextEs: "¿Qué es el seguro de compensación de trabajadores?",
    optionsEn: ["Coverage for employee injuries and illnesses arising from employment", "Health insurance for employees", "Life insurance for workers", "Disability insurance"],
    optionsEs: ["Cobertura para lesiones y enfermedades de empleados que surgen del empleo", "Seguro de salud para empleados", "Seguro de vida para trabajadores", "Seguro de discapacidad"],
    correctAnswer: 0,
    explanationEn: "Workers' compensation provides benefits to employees who suffer work-related injuries or illnesses, covering medical costs and lost wages.",
    explanationEs: "La compensación de trabajadores proporciona beneficios a empleados que sufren lesiones o enfermedades relacionadas con el trabajo, cubriendo costos médicos y salarios perdidos."
  },
  {
    category: "property_casualty",
    questionTextEn: "Is workers' compensation required in Texas?",
    questionTextEs: "¿Se requiere la compensación de trabajadores en Texas?",
    optionsEn: ["No, Texas is a non-compulsory state, but employers who opt out face different liability", "Yes, it is mandatory for all employers", "Only for large businesses", "Only for construction companies"],
    optionsEs: ["No, Texas es un estado no obligatorio, pero los empleadores que no participan enfrentan diferente responsabilidad", "Sí, es obligatorio para todos los empleadores", "Solo para negocios grandes", "Solo para compañías de construcción"],
    correctAnswer: 0,
    explanationEn: "Texas is a non-compulsory workers' compensation state; employers can opt out but face increased liability exposure.",
    explanationEs: "Texas es un estado de compensación de trabajadores no obligatoria; los empleadores pueden optar por no participar pero enfrentan mayor exposición a responsabilidad."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is commercial auto insurance?",
    questionTextEs: "¿Qué es el seguro de auto comercial?",
    optionsEn: ["Auto insurance for vehicles used for business purposes", "Personal auto insurance", "Motorcycle insurance", "RV insurance"],
    optionsEs: ["Seguro de auto para vehículos usados con fines comerciales", "Seguro de auto personal", "Seguro de motocicleta", "Seguro de RV"],
    correctAnswer: 0,
    explanationEn: "Commercial auto insurance covers vehicles owned or used by a business for business purposes.",
    explanationEs: "El seguro de auto comercial cubre vehículos propiedad de un negocio o usados por un negocio con fines comerciales."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is an umbrella policy?",
    questionTextEs: "¿Qué es una póliza paraguas?",
    optionsEn: ["Excess liability coverage that provides additional limits above underlying policies", "Weather coverage", "A homeowners policy", "An auto policy"],
    optionsEs: ["Cobertura de responsabilidad excedente que proporciona límites adicionales por encima de las pólizas subyacentes", "Cobertura climática", "Una póliza de propietarios", "Una póliza de auto"],
    correctAnswer: 0,
    explanationEn: "An umbrella policy provides excess liability coverage above the limits of underlying auto, home, or other liability policies.",
    explanationEs: "Una póliza paraguas proporciona cobertura de responsabilidad excedente por encima de los límites de las pólizas subyacentes de auto, hogar u otra responsabilidad."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is business interruption insurance?",
    questionTextEs: "¿Qué es el seguro de interrupción de negocios?",
    optionsEn: ["Coverage for lost income when a business cannot operate due to a covered loss", "Property insurance", "Liability insurance", "Auto insurance"],
    optionsEs: ["Cobertura por ingresos perdidos cuando un negocio no puede operar debido a una pérdida cubierta", "Seguro de propiedad", "Seguro de responsabilidad", "Seguro de auto"],
    correctAnswer: 0,
    explanationEn: "Business interruption insurance covers lost income and ongoing expenses when a business must close due to a covered property loss.",
    explanationEs: "El seguro de interrupción de negocios cubre ingresos perdidos y gastos continuos cuando un negocio debe cerrar debido a una pérdida de propiedad cubierta."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is inland marine insurance?",
    questionTextEs: "¿Qué es el seguro marino interior?",
    optionsEn: ["Coverage for property in transit or movable property not covered by standard policies", "Coverage for boats only", "Ocean cargo insurance", "Flood insurance"],
    optionsEs: ["Cobertura para propiedad en tránsito o propiedad móvil no cubierta por pólizas estándar", "Cobertura solo para botes", "Seguro de carga oceánica", "Seguro contra inundaciones"],
    correctAnswer: 0,
    explanationEn: "Inland marine insurance covers property in transit, movable equipment, and specialized items not adequately covered by standard property policies.",
    explanationEs: "El seguro marino interior cubre propiedad en tránsito, equipo móvil y artículos especializados no cubiertos adecuadamente por pólizas de propiedad estándar."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is a surety bond?",
    questionTextEs: "¿Qué es una fianza?",
    optionsEn: ["A three-party agreement guaranteeing one party will fulfill obligations to another", "An insurance policy", "A bank account", "A loan"],
    optionsEs: ["Un acuerdo de tres partes que garantiza que una parte cumplirá obligaciones con otra", "Una póliza de seguro", "Una cuenta bancaria", "Un préstamo"],
    correctAnswer: 0,
    explanationEn: "A surety bond is a three-party contract where the surety guarantees the principal will fulfill obligations to the obligee.",
    explanationEs: "Una fianza es un contrato de tres partes donde el fiador garantiza que el principal cumplirá obligaciones con el acreedor."
  },
  // Insurance Principles and Concepts (91-120)
  {
    category: "property_casualty",
    questionTextEn: "What is the principle of indemnity?",
    questionTextEs: "¿Cuál es el principio de indemnización?",
    optionsEn: ["Insurance should restore the insured to the same financial position as before the loss", "Insurance should profit the insured", "Insurance covers all losses", "Insurance is optional"],
    optionsEs: ["El seguro debe restaurar al asegurado a la misma posición financiera que antes de la pérdida", "El seguro debe beneficiar al asegurado", "El seguro cubre todas las pérdidas", "El seguro es opcional"],
    correctAnswer: 0,
    explanationEn: "The principle of indemnity ensures that insurance restores the insured to their pre-loss condition without profit.",
    explanationEs: "El principio de indemnización asegura que el seguro restaure al asegurado a su condición anterior a la pérdida sin ganancia."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is insurable interest?",
    questionTextEs: "¿Qué es el interés asegurable?",
    optionsEn: ["A financial stake in the subject of insurance that would cause financial loss if destroyed", "Interest earned on premiums", "The insurance company's profit", "A type of policy"],
    optionsEs: ["Una participación financiera en el sujeto del seguro que causaría pérdida financiera si se destruyera", "Interés ganado sobre primas", "La ganancia de la compañía de seguros", "Un tipo de póliza"],
    correctAnswer: 0,
    explanationEn: "Insurable interest means the insured must have a financial stake in the subject matter and would suffer financially from its loss.",
    explanationEs: "El interés asegurable significa que el asegurado debe tener una participación financiera en el tema y sufriría financieramente por su pérdida."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is utmost good faith in insurance?",
    questionTextEs: "¿Qué es la máxima buena fe en seguros?",
    optionsEn: ["Both parties must deal honestly and disclose all material information", "The insurer decides everything", "No disclosure is required", "Only the insurer must be honest"],
    optionsEs: ["Ambas partes deben tratar honestamente y divulgar toda la información material", "El asegurador decide todo", "No se requiere divulgación", "Solo el asegurador debe ser honesto"],
    correctAnswer: 0,
    explanationEn: "Utmost good faith (uberrimae fidei) requires both parties to deal honestly and disclose all material facts.",
    explanationEs: "La máxima buena fe (uberrimae fidei) requiere que ambas partes traten honestamente y divulguen todos los hechos materiales."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is a moral hazard?",
    questionTextEs: "¿Qué es un riesgo moral?",
    optionsEn: ["The tendency to be less careful when insured, or to intentionally cause a loss", "A physical condition that increases risk", "A type of coverage", "An insurance premium"],
    optionsEs: ["La tendencia a ser menos cuidadoso cuando se está asegurado, o a causar una pérdida intencionalmente", "Una condición física que aumenta el riesgo", "Un tipo de cobertura", "Una prima de seguro"],
    correctAnswer: 0,
    explanationEn: "Moral hazard refers to the increased likelihood of loss due to dishonesty or character defects of the insured.",
    explanationEs: "El riesgo moral se refiere a la mayor probabilidad de pérdida debido a la deshonestidad o defectos de carácter del asegurado."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is a morale hazard?",
    questionTextEs: "¿Qué es un riesgo de moralidad?",
    optionsEn: ["Carelessness or indifference to loss because insurance exists", "Intentional damage", "A physical hazard", "A coverage limitation"],
    optionsEs: ["Descuido o indiferencia a la pérdida porque existe el seguro", "Daño intencional", "Un peligro físico", "Una limitación de cobertura"],
    correctAnswer: 0,
    explanationEn: "Morale hazard is the tendency to be careless or indifferent about preventing losses because insurance will cover them.",
    explanationEs: "El riesgo de moralidad es la tendencia a ser descuidado o indiferente sobre prevenir pérdidas porque el seguro las cubrirá."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is a physical hazard?",
    questionTextEs: "¿Qué es un peligro físico?",
    optionsEn: ["A tangible condition that increases the likelihood or severity of a loss", "A character defect", "A type of coverage", "An insurance company"],
    optionsEs: ["Una condición tangible que aumenta la probabilidad o severidad de una pérdida", "Un defecto de carácter", "Un tipo de cobertura", "Una compañía de seguros"],
    correctAnswer: 0,
    explanationEn: "A physical hazard is a tangible condition (like faulty wiring) that increases the chance or magnitude of a loss.",
    explanationEs: "Un peligro físico es una condición tangible (como cableado defectuoso) que aumenta la probabilidad o magnitud de una pérdida."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is the law of large numbers?",
    questionTextEs: "¿Qué es la ley de los grandes números?",
    optionsEn: ["The larger the group of similar exposures, the more predictable the losses", "A counting method", "A policy limit", "A coverage requirement"],
    optionsEs: ["Cuanto mayor sea el grupo de exposiciones similares, más predecibles son las pérdidas", "Un método de conteo", "Un límite de póliza", "Un requisito de cobertura"],
    correctAnswer: 0,
    explanationEn: "The law of large numbers states that as the number of similar exposures increases, actual losses become more predictable.",
    explanationEs: "La ley de los grandes números establece que a medida que aumenta el número de exposiciones similares, las pérdidas reales se vuelven más predecibles."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is adverse selection?",
    questionTextEs: "¿Qué es la selección adversa?",
    optionsEn: ["The tendency of higher-risk individuals to seek more insurance", "Choosing the best policy", "A coverage type", "An underwriting term"],
    optionsEs: ["La tendencia de individuos de mayor riesgo a buscar más seguro", "Elegir la mejor póliza", "Un tipo de cobertura", "Un término de suscripción"],
    correctAnswer: 0,
    explanationEn: "Adverse selection occurs when those most likely to have a loss are the most likely to purchase insurance.",
    explanationEs: "La selección adversa ocurre cuando aquellos más propensos a tener una pérdida son los más propensos a comprar seguros."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is an exclusion in an insurance policy?",
    questionTextEs: "¿Qué es una exclusión en una póliza de seguro?",
    optionsEn: ["A specific condition or circumstance that is not covered by the policy", "An additional coverage", "A premium reduction", "A claim payment"],
    optionsEs: ["Una condición o circunstancia específica que no está cubierta por la póliza", "Una cobertura adicional", "Una reducción de prima", "Un pago de reclamo"],
    correctAnswer: 0,
    explanationEn: "An exclusion is a provision that eliminates coverage for certain risks, perils, or circumstances.",
    explanationEs: "Una exclusión es una disposición que elimina la cobertura para ciertos riesgos, peligros o circunstancias."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is a policy condition?",
    questionTextEs: "¿Qué es una condición de póliza?",
    optionsEn: ["A provision that qualifies or limits the insurer's obligation to pay", "The premium amount", "The coverage limit", "The deductible"],
    optionsEs: ["Una disposición que califica o limita la obligación del asegurador de pagar", "El monto de la prima", "El límite de cobertura", "El deducible"],
    correctAnswer: 0,
    explanationEn: "Policy conditions are provisions that qualify or limit the insurer's promise to pay, often outlining duties of both parties.",
    explanationEs: "Las condiciones de póliza son disposiciones que califican o limitan la promesa del asegurador de pagar, a menudo describiendo deberes de ambas partes."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is a policy endorsement?",
    questionTextEs: "¿Qué es un endoso de póliza?",
    optionsEn: ["A written document that modifies the original policy terms", "A signature on the policy", "The policy declaration", "The premium payment"],
    optionsEs: ["Un documento escrito que modifica los términos originales de la póliza", "Una firma en la póliza", "La declaración de la póliza", "El pago de la prima"],
    correctAnswer: 0,
    explanationEn: "An endorsement (or rider) is a written document attached to a policy that modifies its terms and conditions.",
    explanationEs: "Un endoso (o anexo) es un documento escrito adjunto a una póliza que modifica sus términos y condiciones."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is the declarations page?",
    questionTextEs: "¿Qué es la página de declaraciones?",
    optionsEn: ["The section of a policy that includes specific information about the insured and coverage", "The claims form", "The payment receipt", "The application"],
    optionsEs: ["La sección de una póliza que incluye información específica sobre el asegurado y la cobertura", "El formulario de reclamos", "El recibo de pago", "La solicitud"],
    correctAnswer: 0,
    explanationEn: "The declarations page summarizes key policy information: named insured, policy period, limits, premiums, and covered property.",
    explanationEs: "La página de declaraciones resume información clave de la póliza: asegurado nombrado, período de la póliza, límites, primas y propiedad cubierta."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is the insuring agreement?",
    questionTextEs: "¿Qué es el acuerdo de seguro?",
    optionsEn: ["The section of a policy that states what the insurer promises to do", "The application", "The premium payment", "The claims process"],
    optionsEs: ["La sección de una póliza que establece lo que el asegurador promete hacer", "La solicitud", "El pago de la prima", "El proceso de reclamos"],
    correctAnswer: 0,
    explanationEn: "The insuring agreement is the heart of the policy, stating the insurer's promise to pay for covered losses.",
    explanationEs: "El acuerdo de seguro es el corazón de la póliza, estableciendo la promesa del asegurador de pagar por pérdidas cubiertas."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is pro rata liability?",
    questionTextEs: "¿Qué es la responsabilidad prorrateada?",
    optionsEn: ["Each insurer pays its proportional share when multiple policies cover the same loss", "One insurer pays all", "No insurer pays", "The insured pays all"],
    optionsEs: ["Cada asegurador paga su parte proporcional cuando múltiples pólizas cubren la misma pérdida", "Un asegurador paga todo", "Ningún asegurador paga", "El asegurado paga todo"],
    correctAnswer: 0,
    explanationEn: "Pro rata liability means each insurer pays a proportion of the loss based on their policy limits relative to total coverage.",
    explanationEs: "La responsabilidad prorrateada significa que cada asegurador paga una proporción de la pérdida basada en sus límites de póliza en relación con la cobertura total."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is a binder in insurance?",
    questionTextEs: "¿Qué es un binder en seguros?",
    optionsEn: ["Temporary evidence of coverage until a formal policy is issued", "A policy cancellation", "A claim denial", "A premium refund"],
    optionsEs: ["Evidencia temporal de cobertura hasta que se emita una póliza formal", "Una cancelación de póliza", "Una denegación de reclamo", "Un reembolso de prima"],
    correctAnswer: 0,
    explanationEn: "A binder is temporary proof of insurance that provides coverage until the formal policy is issued.",
    explanationEs: "Un binder es prueba temporal de seguro que proporciona cobertura hasta que se emita la póliza formal."
  },
  // Claims and Adjusting (121-145)
  {
    category: "property_casualty",
    questionTextEn: "What is the role of a claims adjuster?",
    questionTextEs: "¿Cuál es el rol de un ajustador de reclamos?",
    optionsEn: ["To investigate claims and determine the amount the insurer should pay", "To sell insurance", "To underwrite policies", "To set premiums"],
    optionsEs: ["Investigar reclamos y determinar el monto que el asegurador debe pagar", "Vender seguros", "Suscribir pólizas", "Establecer primas"],
    correctAnswer: 0,
    explanationEn: "A claims adjuster investigates insurance claims, evaluates damages, and determines the appropriate settlement amount.",
    explanationEs: "Un ajustador de reclamos investiga reclamos de seguro, evalúa daños y determina el monto apropiado de liquidación."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is a public adjuster?",
    questionTextEs: "¿Qué es un ajustador público?",
    optionsEn: ["An adjuster hired by the insured to represent their interests in a claim", "An adjuster employed by the insurance company", "A government employee", "An independent contractor for insurers"],
    optionsEs: ["Un ajustador contratado por el asegurado para representar sus intereses en un reclamo", "Un ajustador empleado por la compañía de seguros", "Un empleado del gobierno", "Un contratista independiente para aseguradores"],
    correctAnswer: 0,
    explanationEn: "A public adjuster works for the policyholder, not the insurance company, to help negotiate and settle claims.",
    explanationEs: "Un ajustador público trabaja para el asegurado, no la compañía de seguros, para ayudar a negociar y liquidar reclamos."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is a proof of loss?",
    questionTextEs: "¿Qué es una prueba de pérdida?",
    optionsEn: ["A formal sworn statement documenting the facts and amount of a loss", "The insurance policy", "The premium receipt", "A claim form"],
    optionsEs: ["Una declaración jurada formal que documenta los hechos y el monto de una pérdida", "La póliza de seguro", "El recibo de prima", "Un formulario de reclamo"],
    correctAnswer: 0,
    explanationEn: "A proof of loss is a formal, sworn statement submitted by the insured documenting the details and amount of a claimed loss.",
    explanationEs: "Una prueba de pérdida es una declaración jurada formal presentada por el asegurado documentando los detalles y el monto de una pérdida reclamada."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is the duty to mitigate damages?",
    questionTextEs: "¿Cuál es el deber de mitigar daños?",
    optionsEn: ["The insured's obligation to take reasonable steps to prevent further damage after a loss", "The insurer's duty to pay claims", "A coverage limit", "A policy exclusion"],
    optionsEs: ["La obligación del asegurado de tomar medidas razonables para prevenir más daños después de una pérdida", "El deber del asegurador de pagar reclamos", "Un límite de cobertura", "Una exclusión de póliza"],
    correctAnswer: 0,
    explanationEn: "The duty to mitigate requires the insured to take reasonable actions to prevent further damage after a covered loss occurs.",
    explanationEs: "El deber de mitigar requiere que el asegurado tome acciones razonables para prevenir más daños después de que ocurra una pérdida cubierta."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is reservation of rights?",
    questionTextEs: "¿Qué es la reserva de derechos?",
    optionsEn: ["A letter from the insurer stating they may deny coverage while investigating", "Approval of a claim", "A policy endorsement", "A premium increase"],
    optionsEs: ["Una carta del asegurador indicando que pueden negar cobertura mientras investigan", "Aprobación de un reclamo", "Un endoso de póliza", "Un aumento de prima"],
    correctAnswer: 0,
    explanationEn: "A reservation of rights letter notifies the insured that the insurer may deny coverage while they investigate a claim.",
    explanationEs: "Una carta de reserva de derechos notifica al asegurado que el asegurador puede negar cobertura mientras investigan un reclamo."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is salvage in insurance?",
    questionTextEs: "¿Qué es el salvamento en seguros?",
    optionsEn: ["The value recovered from damaged property after a claim is paid", "A type of coverage", "A policy fee", "A premium"],
    optionsEs: ["El valor recuperado de propiedad dañada después de que se paga un reclamo", "Un tipo de cobertura", "Una tarifa de póliza", "Una prima"],
    correctAnswer: 0,
    explanationEn: "Salvage is the remaining value of damaged property that the insurer can recover after paying a total loss claim.",
    explanationEs: "El salvamento es el valor restante de propiedad dañada que el asegurador puede recuperar después de pagar un reclamo de pérdida total."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is the appraisal clause?",
    questionTextEs: "¿Qué es la cláusula de tasación?",
    optionsEn: ["A policy provision for resolving disputes about the value of a loss", "A coverage limit", "A premium calculation", "A policy exclusion"],
    optionsEs: ["Una disposición de póliza para resolver disputas sobre el valor de una pérdida", "Un límite de cobertura", "Un cálculo de prima", "Una exclusión de póliza"],
    correctAnswer: 0,
    explanationEn: "The appraisal clause allows either party to demand an appraisal when they disagree about the amount of a loss.",
    explanationEs: "La cláusula de tasación permite a cualquier parte exigir una tasación cuando no están de acuerdo sobre el monto de una pérdida."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is a third-party claim?",
    questionTextEs: "¿Qué es un reclamo de terceros?",
    optionsEn: ["A claim made by someone who is not the insured against the insured's policy", "A claim by the insured", "A policy endorsement", "A coverage addition"],
    optionsEs: ["Un reclamo hecho por alguien que no es el asegurado contra la póliza del asegurado", "Un reclamo del asegurado", "Un endoso de póliza", "Una adición de cobertura"],
    correctAnswer: 0,
    explanationEn: "A third-party claim is made by someone outside the insurance contract who seeks compensation from the insured's liability coverage.",
    explanationEs: "Un reclamo de terceros es hecho por alguien fuera del contrato de seguro que busca compensación de la cobertura de responsabilidad del asegurado."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is a first-party claim?",
    questionTextEs: "¿Qué es un reclamo de primera parte?",
    optionsEn: ["A claim made by the insured for their own losses under their policy", "A claim by someone else", "A liability claim", "A third-party claim"],
    optionsEs: ["Un reclamo hecho por el asegurado por sus propias pérdidas bajo su póliza", "Un reclamo por alguien más", "Un reclamo de responsabilidad", "Un reclamo de terceros"],
    correctAnswer: 0,
    explanationEn: "A first-party claim is made by the policyholder for their own loss under their own insurance policy.",
    explanationEs: "Un reclamo de primera parte es hecho por el asegurado por su propia pérdida bajo su propia póliza de seguro."
  },
  // Additional P&C Topics (146-178)
  {
    category: "property_casualty",
    questionTextEn: "What is a loss ratio?",
    questionTextEs: "¿Qué es un índice de pérdida?",
    optionsEn: ["The ratio of claims paid to premiums earned", "The deductible amount", "The coverage limit", "The premium cost"],
    optionsEs: ["La proporción de reclamos pagados a primas ganadas", "El monto del deducible", "El límite de cobertura", "El costo de la prima"],
    correctAnswer: 0,
    explanationEn: "Loss ratio is calculated by dividing incurred losses by earned premiums, used to measure insurer profitability.",
    explanationEs: "El índice de pérdida se calcula dividiendo las pérdidas incurridas por las primas ganadas, usado para medir la rentabilidad del asegurador."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is underwriting?",
    questionTextEs: "¿Qué es la suscripción?",
    optionsEn: ["The process of evaluating and selecting risks to insure", "Selling policies", "Paying claims", "Investing premiums"],
    optionsEs: ["El proceso de evaluar y seleccionar riesgos para asegurar", "Vender pólizas", "Pagar reclamos", "Invertir primas"],
    correctAnswer: 0,
    explanationEn: "Underwriting is the process of evaluating risks and determining whether to accept them and at what premium.",
    explanationEs: "La suscripción es el proceso de evaluar riesgos y determinar si aceptarlos y a qué prima."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is reinsurance?",
    questionTextEs: "¿Qué es el reaseguro?",
    optionsEn: ["Insurance purchased by insurers to transfer some of their risk", "A type of homeowners policy", "Additional coverage for consumers", "A form of self-insurance"],
    optionsEs: ["Seguro comprado por aseguradores para transferir parte de su riesgo", "Un tipo de póliza de propietarios", "Cobertura adicional para consumidores", "Una forma de autoaseguro"],
    correctAnswer: 0,
    explanationEn: "Reinsurance is insurance that insurers purchase to protect themselves from large or catastrophic losses.",
    explanationEs: "El reaseguro es seguro que los aseguradores compran para protegerse de pérdidas grandes o catastróficas."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is Texas FAIR Plan?",
    questionTextEs: "¿Qué es el Plan FAIR de Texas?",
    optionsEn: ["A state program providing property insurance for high-risk properties that can't get coverage elsewhere", "A discount program", "A government subsidy", "A commercial insurance company"],
    optionsEs: ["Un programa estatal que proporciona seguro de propiedad para propiedades de alto riesgo que no pueden obtener cobertura en otro lugar", "Un programa de descuento", "Un subsidio del gobierno", "Una compañía de seguros comercial"],
    correctAnswer: 0,
    explanationEn: "The Texas FAIR Plan is a last-resort insurance program for property owners who cannot obtain coverage in the regular market.",
    explanationEs: "El Plan FAIR de Texas es un programa de seguro de último recurso para propietarios que no pueden obtener cobertura en el mercado regular."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is the Texas Windstorm Insurance Association (TWIA)?",
    questionTextEs: "¿Qué es la Asociación de Seguro contra Tormentas de Viento de Texas (TWIA)?",
    optionsEn: ["A state-created insurer providing wind and hail coverage in coastal areas", "A private insurance company", "A federal program", "A discount program"],
    optionsEs: ["Un asegurador creado por el estado que proporciona cobertura contra viento y granizo en áreas costeras", "Una compañía de seguros privada", "Un programa federal", "Un programa de descuento"],
    correctAnswer: 0,
    explanationEn: "TWIA provides windstorm and hail insurance for property owners in designated coastal areas of Texas.",
    explanationEs: "TWIA proporciona seguro contra tormentas de viento y granizo para propietarios en áreas costeras designadas de Texas."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is a scheduled personal property endorsement?",
    questionTextEs: "¿Qué es un endoso de propiedad personal programada?",
    optionsEn: ["An endorsement listing specific high-value items for additional coverage", "A policy cancellation", "A premium reduction", "A claim form"],
    optionsEs: ["Un endoso que lista artículos específicos de alto valor para cobertura adicional", "Una cancelación de póliza", "Una reducción de prima", "Un formulario de reclamo"],
    correctAnswer: 0,
    explanationEn: "A scheduled personal property endorsement adds specific coverage for high-value items like jewelry, art, or collectibles.",
    explanationEs: "Un endoso de propiedad personal programada agrega cobertura específica para artículos de alto valor como joyas, arte o coleccionables."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is an occurrence-based policy?",
    questionTextEs: "¿Qué es una póliza basada en ocurrencia?",
    optionsEn: ["A policy that covers claims for incidents that occur during the policy period, regardless of when the claim is filed", "A claims-made policy", "A named peril policy", "A temporary policy"],
    optionsEs: ["Una póliza que cubre reclamos por incidentes que ocurren durante el período de la póliza, independientemente de cuándo se presente el reclamo", "Una póliza de reclamos hechos", "Una póliza de riesgo nombrado", "Una póliza temporal"],
    correctAnswer: 0,
    explanationEn: "An occurrence-based policy covers claims for events that happen during the policy period, even if the claim is filed years later.",
    explanationEs: "Una póliza basada en ocurrencia cubre reclamos por eventos que suceden durante el período de la póliza, incluso si el reclamo se presenta años después."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is a claims-made policy?",
    questionTextEs: "¿Qué es una póliza de reclamos hechos?",
    optionsEn: ["A policy that covers claims only if both the incident and the claim occur during the policy period", "An occurrence policy", "A perpetual policy", "A temporary policy"],
    optionsEs: ["Una póliza que cubre reclamos solo si tanto el incidente como el reclamo ocurren durante el período de la póliza", "Una póliza de ocurrencia", "Una póliza perpetua", "Una póliza temporal"],
    correctAnswer: 0,
    explanationEn: "A claims-made policy only covers claims if the incident occurred and the claim is made while the policy is in force.",
    explanationEs: "Una póliza de reclamos hechos solo cubre reclamos si el incidente ocurrió y el reclamo se hace mientras la póliza está en vigor."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is the difference between an agent and a broker?",
    questionTextEs: "¿Cuál es la diferencia entre un agente y un corredor?",
    optionsEn: ["An agent represents the insurer; a broker represents the client", "They are the same", "A broker represents the insurer", "An agent represents the client"],
    optionsEs: ["Un agente representa al asegurador; un corredor representa al cliente", "Son lo mismo", "Un corredor representa al asegurador", "Un agente representa al cliente"],
    correctAnswer: 0,
    explanationEn: "An agent typically represents the insurance company, while a broker represents the insurance buyer.",
    explanationEs: "Un agente típicamente representa a la compañía de seguros, mientras que un corredor representa al comprador de seguros."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is a surplus lines insurer?",
    questionTextEs: "¿Qué es un asegurador de líneas excedentes?",
    optionsEn: ["An insurer not licensed in the state that provides coverage for hard-to-place risks", "A standard market insurer", "A government insurer", "A reinsurer"],
    optionsEs: ["Un asegurador no licenciado en el estado que proporciona cobertura para riesgos difíciles de colocar", "Un asegurador de mercado estándar", "Un asegurador del gobierno", "Un reasegurador"],
    correctAnswer: 0,
    explanationEn: "Surplus lines insurers are not licensed in the state but can write coverage for risks that standard insurers won't cover.",
    explanationEs: "Los aseguradores de líneas excedentes no están licenciados en el estado pero pueden suscribir cobertura para riesgos que los aseguradores estándar no cubrirán."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is the Texas Automobile Insurance Plan Association (TAIPA)?",
    questionTextEs: "¿Qué es la Asociación del Plan de Seguro de Automóviles de Texas (TAIPA)?",
    optionsEn: ["An assigned risk plan for drivers who can't get auto insurance in the regular market", "A discount program", "A federal program", "A private company"],
    optionsEs: ["Un plan de riesgo asignado para conductores que no pueden obtener seguro de auto en el mercado regular", "Un programa de descuento", "Un programa federal", "Una compañía privada"],
    correctAnswer: 0,
    explanationEn: "TAIPA is Texas's assigned risk plan, providing auto insurance to drivers who cannot obtain coverage elsewhere.",
    explanationEs: "TAIPA es el plan de riesgo asignado de Texas, proporcionando seguro de auto a conductores que no pueden obtener cobertura en otro lugar."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is the cancellation notice period for a homeowners policy in Texas?",
    questionTextEs: "¿Cuál es el período de aviso de cancelación para una póliza de propietarios en Texas?",
    optionsEn: ["30 days for most reasons, 10 days for non-payment", "7 days", "60 days", "90 days"],
    optionsEs: ["30 días para la mayoría de razones, 10 días por falta de pago", "7 días", "60 días", "90 días"],
    correctAnswer: 0,
    explanationEn: "Texas requires insurers to give 30 days' notice for most cancellations and 10 days' notice for non-payment of premium.",
    explanationEs: "Texas requiere que los aseguradores den 30 días de aviso para la mayoría de cancelaciones y 10 días de aviso por falta de pago de prima."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is a peril in insurance terms?",
    questionTextEs: "¿Qué es un peligro en términos de seguros?",
    optionsEn: ["A cause of loss (fire, theft, wind, etc.)", "A coverage type", "A policy limit", "A premium"],
    optionsEs: ["Una causa de pérdida (incendio, robo, viento, etc.)", "Un tipo de cobertura", "Un límite de póliza", "Una prima"],
    correctAnswer: 0,
    explanationEn: "A peril is the immediate cause of loss, such as fire, theft, windstorm, or vandalism.",
    explanationEs: "Un peligro es la causa inmediata de pérdida, como incendio, robo, tormenta de viento o vandalismo."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is a hazard in insurance?",
    questionTextEs: "¿Qué es un riesgo en seguros?",
    optionsEn: ["A condition that increases the likelihood or severity of a loss", "The cause of a loss", "A type of coverage", "A premium discount"],
    optionsEs: ["Una condición que aumenta la probabilidad o severidad de una pérdida", "La causa de una pérdida", "Un tipo de cobertura", "Un descuento de prima"],
    correctAnswer: 0,
    explanationEn: "A hazard is a condition that increases the probability or severity of a loss from a given peril.",
    explanationEs: "Un riesgo es una condición que aumenta la probabilidad o severidad de una pérdida de un peligro dado."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is the grace period for premium payment in Texas?",
    questionTextEs: "¿Cuál es el período de gracia para el pago de prima en Texas?",
    optionsEn: ["Typically 10-30 days depending on the policy", "5 days", "60 days", "90 days"],
    optionsEs: ["Típicamente 10-30 días dependiendo de la póliza", "5 días", "60 días", "90 días"],
    correctAnswer: 0,
    explanationEn: "The grace period allows policyholders additional time (typically 10-30 days) to pay premiums without losing coverage.",
    explanationEs: "El período de gracia permite a los asegurados tiempo adicional (típicamente 10-30 días) para pagar primas sin perder cobertura."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is an insurance fraud?",
    questionTextEs: "¿Qué es el fraude de seguros?",
    optionsEn: ["Any deliberate deception to obtain an illegitimate gain from insurance", "A legitimate claim", "A policy endorsement", "A coverage limitation"],
    optionsEs: ["Cualquier engaño deliberado para obtener una ganancia ilegítima del seguro", "Un reclamo legítimo", "Un endoso de póliza", "Una limitación de cobertura"],
    correctAnswer: 0,
    explanationEn: "Insurance fraud is any intentional act of deception to obtain payment or benefit from an insurance policy.",
    explanationEs: "El fraude de seguros es cualquier acto intencional de engaño para obtener pago o beneficio de una póliza de seguro."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is negligence in liability claims?",
    questionTextEs: "¿Qué es la negligencia en reclamos de responsabilidad?",
    optionsEn: ["Failure to exercise the degree of care that a reasonable person would exercise", "Intentional harm", "An accident", "A policy exclusion"],
    optionsEs: ["Falta de ejercer el grado de cuidado que una persona razonable ejercería", "Daño intencional", "Un accidente", "Una exclusión de póliza"],
    correctAnswer: 0,
    explanationEn: "Negligence is the failure to use reasonable care, resulting in damage or injury to another person or property.",
    explanationEs: "La negligencia es la falta de usar cuidado razonable, resultando en daño o lesión a otra persona o propiedad."
  },
  {
    category: "property_casualty",
    questionTextEn: "What are the four elements required to prove negligence?",
    questionTextEs: "¿Cuáles son los cuatro elementos requeridos para probar negligencia?",
    optionsEn: ["Duty, breach of duty, causation, and damages", "Intent, action, result, and proof", "Negligence, harm, payment, and settlement", "Coverage, claim, proof, and payment"],
    optionsEs: ["Deber, incumplimiento del deber, causalidad y daños", "Intención, acción, resultado y prueba", "Negligencia, daño, pago y liquidación", "Cobertura, reclamo, prueba y pago"],
    correctAnswer: 0,
    explanationEn: "To prove negligence, one must establish duty owed, breach of that duty, causation, and resulting damages.",
    explanationEs: "Para probar negligencia, uno debe establecer deber debido, incumplimiento de ese deber, causalidad y daños resultantes."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is comparative negligence?",
    questionTextEs: "¿Qué es la negligencia comparativa?",
    optionsEn: ["A system where damages are reduced by the plaintiff's percentage of fault", "Full responsibility for the defendant", "No responsibility for either party", "Automatic claim denial"],
    optionsEs: ["Un sistema donde los daños se reducen por el porcentaje de culpa del demandante", "Responsabilidad total del demandado", "Sin responsabilidad para ninguna parte", "Denegación automática de reclamo"],
    correctAnswer: 0,
    explanationEn: "Comparative negligence reduces the plaintiff's recovery by their percentage of fault in causing the accident.",
    explanationEs: "La negligencia comparativa reduce la recuperación del demandante por su porcentaje de culpa en causar el accidente."
  },
  {
    category: "property_casualty",
    questionTextEn: "Texas follows what type of negligence rule?",
    questionTextEs: "¿Texas sigue qué tipo de regla de negligencia?",
    optionsEn: ["Modified comparative negligence (51% bar rule)", "Pure comparative negligence", "Contributory negligence", "No-fault"],
    optionsEs: ["Negligencia comparativa modificada (regla de barrera del 51%)", "Negligencia comparativa pura", "Negligencia contributiva", "Sin culpa"],
    correctAnswer: 0,
    explanationEn: "Texas uses modified comparative negligence: a plaintiff cannot recover if they are 51% or more at fault.",
    explanationEs: "Texas usa negligencia comparativa modificada: un demandante no puede recuperar si tiene 51% o más de culpa."
  }
];

async function seedPropertyCasualtyQuestions() {
  console.log("Seeding Property & Casualty questions...");
  
  try {
    for (const question of propertyCasualtyQuestions) {
      await db.insert(questions).values(question);
    }
    console.log(`Successfully added ${propertyCasualtyQuestions.length} Property & Casualty questions`);
  } catch (error) {
    console.error("Error seeding P&C questions:", error);
    throw error;
  }
}

seedPropertyCasualtyQuestions()
  .then(() => {
    console.log("Property & Casualty seeding complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  });
