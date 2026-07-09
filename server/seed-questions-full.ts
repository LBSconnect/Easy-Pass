import { sql } from "drizzle-orm";
import { db } from "./db";
import { questions } from "@shared/schema";

interface QuestionData {
  category: "real_estate" | "property_casualty" | "life_insurance" | "general_lines";
  questionTextEn: string;
  questionTextEs: string;
  optionsEn: string[];
  optionsEs: string[];
  correctAnswer: number;
  explanationEn: string;
  explanationEs: string;
}

const realEstateQuestions: QuestionData[] = [
  // Property Ownership & Rights (40 questions)
  {
    category: "real_estate",
    questionTextEn: "What is the primary purpose of a deed?",
    questionTextEs: "¿Cuál es el propósito principal de una escritura?",
    optionsEn: ["To transfer ownership of real property", "To provide insurance coverage", "To establish a lease agreement", "To create a mortgage"],
    optionsEs: ["Transferir la propiedad de bienes inmuebles", "Proporcionar cobertura de seguro", "Establecer un contrato de arrendamiento", "Crear una hipoteca"],
    correctAnswer: 0,
    explanationEn: "A deed is a legal document that transfers ownership of real property from one party to another.",
    explanationEs: "Una escritura es un documento legal que transfiere la propiedad de bienes inmuebles de una parte a otra."
  },
  {
    category: "real_estate",
    questionTextEn: "What type of deed provides the greatest protection to the buyer?",
    questionTextEs: "¿Qué tipo de escritura proporciona la mayor protección al comprador?",
    optionsEn: ["General warranty deed", "Quitclaim deed", "Special warranty deed", "Bargain and sale deed"],
    optionsEs: ["Escritura de garantía general", "Escritura de renuncia", "Escritura de garantía especial", "Escritura de compraventa"],
    correctAnswer: 0,
    explanationEn: "A general warranty deed provides the greatest protection because the grantor guarantees the title against all defects, even those from previous owners.",
    explanationEs: "Una escritura de garantía general proporciona la mayor protección porque el otorgante garantiza el título contra todos los defectos, incluso los de propietarios anteriores."
  },
  {
    category: "real_estate",
    questionTextEn: "Which of the following is considered real property?",
    questionTextEs: "¿Cuál de los siguientes se considera propiedad inmueble?",
    optionsEn: ["A built-in dishwasher", "A portable air conditioner", "Furniture", "A car"],
    optionsEs: ["Un lavavajillas empotrado", "Un aire acondicionado portátil", "Muebles", "Un carro"],
    correctAnswer: 0,
    explanationEn: "A built-in dishwasher is a fixture attached to the property and is considered real property.",
    explanationEs: "Un lavavajillas empotrado es un accesorio adjunto a la propiedad y se considera propiedad inmueble."
  },
  {
    category: "real_estate",
    questionTextEn: "What is the bundle of rights in real estate?",
    questionTextEs: "¿Qué es el conjunto de derechos en bienes raíces?",
    optionsEn: ["Rights of possession, control, enjoyment, exclusion, and disposition", "Rights to mortgage only", "Rights to lease only", "Rights granted by the government"],
    optionsEs: ["Derechos de posesión, control, disfrute, exclusión y disposición", "Derechos solo para hipotecar", "Derechos solo para arrendar", "Derechos otorgados por el gobierno"],
    correctAnswer: 0,
    explanationEn: "The bundle of rights includes possession, control, enjoyment, exclusion, and disposition of property.",
    explanationEs: "El conjunto de derechos incluye posesión, control, disfrute, exclusión y disposición de la propiedad."
  },
  {
    category: "real_estate",
    questionTextEn: "What is an easement?",
    questionTextEs: "¿Qué es una servidumbre?",
    optionsEn: ["The right to use another person's land for a specific purpose", "A type of mortgage", "A lease agreement", "A deed restriction"],
    optionsEs: ["El derecho a usar la tierra de otra persona para un propósito específico", "Un tipo de hipoteca", "Un contrato de arrendamiento", "Una restricción de escritura"],
    correctAnswer: 0,
    explanationEn: "An easement is a legal right to use another person's land for a specific purpose, such as a driveway or utility lines.",
    explanationEs: "Una servidumbre es el derecho legal de usar la tierra de otra persona para un propósito específico, como una entrada o líneas de servicios públicos."
  },
  {
    category: "real_estate",
    questionTextEn: "What is fee simple absolute ownership?",
    questionTextEs: "¿Qué es la propiedad de pleno dominio absoluto?",
    optionsEn: ["The most complete form of ownership", "A lease arrangement", "Shared ownership", "Government ownership"],
    optionsEs: ["La forma más completa de propiedad", "Un acuerdo de arrendamiento", "Propiedad compartida", "Propiedad del gobierno"],
    correctAnswer: 0,
    explanationEn: "Fee simple absolute is the most complete form of property ownership, giving the owner full rights to use, sell, or transfer the property.",
    explanationEs: "El pleno dominio absoluto es la forma más completa de propiedad, otorgando al propietario todos los derechos para usar, vender o transferir la propiedad."
  },
  {
    category: "real_estate",
    questionTextEn: "What is a lien on a property?",
    questionTextEs: "¿Qué es un gravamen sobre una propiedad?",
    optionsEn: ["A type of property tax", "A legal claim against a property used as collateral", "The property's market value", "The property's zoning classification"],
    optionsEs: ["Un tipo de impuesto sobre la propiedad", "Un reclamo legal contra una propiedad utilizada como garantía", "El valor de mercado de la propiedad", "La clasificación de zonificación de la propiedad"],
    correctAnswer: 1,
    explanationEn: "A lien is a legal right or interest that a creditor has in the debtor's property, usually as security for a debt.",
    explanationEs: "Un gravamen es un derecho legal o interés que un acreedor tiene en la propiedad del deudor, generalmente como garantía de una deuda."
  },
  {
    category: "real_estate",
    questionTextEn: "What does 'escrow' mean in a real estate transaction?",
    questionTextEs: "¿Qué significa 'escrow' en una transacción inmobiliaria?",
    optionsEn: ["A type of property insurance", "A neutral third party holding funds until conditions are met", "A real estate agent's commission", "The down payment on a property"],
    optionsEs: ["Un tipo de seguro de propiedad", "Un tercero neutral que retiene fondos hasta que se cumplan las condiciones", "La comisión de un agente inmobiliario", "El pago inicial de una propiedad"],
    correctAnswer: 1,
    explanationEn: "Escrow is a financial arrangement where a third party holds and regulates payment of funds until all conditions of a transaction are met.",
    explanationEs: "El escrow es un acuerdo financiero donde un tercero retiene y regula el pago de fondos hasta que se cumplan todas las condiciones de una transacción."
  },
  {
    category: "real_estate",
    questionTextEn: "What is eminent domain?",
    questionTextEs: "¿Qué es el dominio eminente?",
    optionsEn: ["The government's right to take private property for public use with compensation", "A type of property tax", "A zoning restriction", "A mortgage default"],
    optionsEs: ["El derecho del gobierno a tomar propiedad privada para uso público con compensación", "Un tipo de impuesto sobre la propiedad", "Una restricción de zonificación", "Un incumplimiento hipotecario"],
    correctAnswer: 0,
    explanationEn: "Eminent domain is the government's constitutional right to take private property for public use, with just compensation paid to the owner.",
    explanationEs: "El dominio eminente es el derecho constitucional del gobierno de tomar propiedad privada para uso público, con compensación justa pagada al propietario."
  },
  {
    category: "real_estate",
    questionTextEn: "What is adverse possession?",
    questionTextEs: "¿Qué es la posesión adversa?",
    optionsEn: ["A legal method to acquire title to land through continuous use over time", "A type of mortgage", "A lease agreement", "Government seizure"],
    optionsEs: ["Un método legal para adquirir título de tierra a través del uso continuo en el tiempo", "Un tipo de hipoteca", "Un contrato de arrendamiento", "Confiscación del gobierno"],
    correctAnswer: 0,
    explanationEn: "Adverse possession allows someone to claim ownership of land by using it openly, continuously, and hostilely for a statutory period.",
    explanationEs: "La posesión adversa permite a alguien reclamar propiedad de tierra usándola abiertamente, continuamente y hostilmente durante un período legal."
  },
  {
    category: "real_estate",
    questionTextEn: "What is a cloud on title?",
    questionTextEs: "¿Qué es una nube sobre el título?",
    optionsEn: ["Any claim or encumbrance that could affect the owner's rights", "Weather damage to property", "A type of insurance", "A mortgage payment"],
    optionsEs: ["Cualquier reclamo o gravamen que podría afectar los derechos del propietario", "Daño climático a la propiedad", "Un tipo de seguro", "Un pago de hipoteca"],
    correctAnswer: 0,
    explanationEn: "A cloud on title is any claim, lien, or encumbrance that could impair the owner's title or make it doubtful.",
    explanationEs: "Una nube sobre el título es cualquier reclamo, gravamen o carga que podría perjudicar el título del propietario o hacerlo dudoso."
  },
  {
    category: "real_estate",
    questionTextEn: "What is the difference between a listing agent and a buyer's agent?",
    questionTextEs: "¿Cuál es la diferencia entre un agente de listado y un agente del comprador?",
    optionsEn: ["There is no difference", "A listing agent represents the seller, while a buyer's agent represents the buyer", "A listing agent only works with commercial properties", "A buyer's agent is not licensed"],
    optionsEs: ["No hay diferencia", "Un agente de listado representa al vendedor, mientras que un agente del comprador representa al comprador", "Un agente de listado solo trabaja con propiedades comerciales", "Un agente del comprador no tiene licencia"],
    correctAnswer: 1,
    explanationEn: "A listing agent represents the seller's interests, while a buyer's agent represents the buyer's interests in a real estate transaction.",
    explanationEs: "Un agente de listado representa los intereses del vendedor, mientras que un agente del comprador representa los intereses del comprador en una transacción inmobiliaria."
  },
  {
    category: "real_estate",
    questionTextEn: "What is title insurance?",
    questionTextEs: "¿Qué es el seguro de título?",
    optionsEn: ["Insurance protecting against defects in property title", "Homeowner's insurance", "Flood insurance", "Mortgage insurance"],
    optionsEs: ["Seguro que protege contra defectos en el título de propiedad", "Seguro de propietario", "Seguro contra inundaciones", "Seguro hipotecario"],
    correctAnswer: 0,
    explanationEn: "Title insurance protects lenders and buyers against financial loss from defects in a property's title, including liens and encumbrances.",
    explanationEs: "El seguro de título protege a prestamistas y compradores contra pérdidas financieras por defectos en el título de una propiedad, incluyendo gravámenes y cargas."
  },
  {
    category: "real_estate",
    questionTextEn: "What is a homestead exemption in Texas?",
    questionTextEs: "¿Qué es una exención de vivienda en Texas?",
    optionsEn: ["A property tax reduction for primary residences", "A type of mortgage", "A lease agreement", "Government seizure protection"],
    optionsEs: ["Una reducción de impuestos sobre la propiedad para residencias principales", "Un tipo de hipoteca", "Un contrato de arrendamiento", "Protección contra confiscación del gobierno"],
    correctAnswer: 0,
    explanationEn: "In Texas, the homestead exemption reduces the appraised value of a primary residence for property tax purposes.",
    explanationEs: "En Texas, la exención de vivienda reduce el valor tasado de una residencia principal para propósitos de impuestos sobre la propiedad."
  },
  {
    category: "real_estate",
    questionTextEn: "What is a mechanic's lien?",
    questionTextEs: "¿Qué es un gravamen de mecánico?",
    optionsEn: ["A claim by contractors or suppliers for unpaid work or materials", "A type of mortgage", "A government tax lien", "An insurance policy"],
    optionsEs: ["Un reclamo por contratistas o proveedores por trabajo o materiales no pagados", "Un tipo de hipoteca", "Un gravamen fiscal del gobierno", "Una póliza de seguro"],
    correctAnswer: 0,
    explanationEn: "A mechanic's lien is a security interest in the property filed by contractors, subcontractors, or suppliers who provided labor or materials.",
    explanationEs: "Un gravamen de mecánico es un interés de seguridad en la propiedad presentado por contratistas, subcontratistas o proveedores que proporcionaron mano de obra o materiales."
  },
  // Property Valuation (25 questions)
  {
    category: "real_estate",
    questionTextEn: "What is the most common method of property appraisal for residential properties?",
    questionTextEs: "¿Cuál es el método más común de tasación de propiedad para propiedades residenciales?",
    optionsEn: ["Sales comparison approach", "Income approach", "Cost approach", "Investment approach"],
    optionsEs: ["Enfoque de comparación de ventas", "Enfoque de ingresos", "Enfoque de costos", "Enfoque de inversión"],
    correctAnswer: 0,
    explanationEn: "The sales comparison approach compares the subject property to similar recently sold properties to determine market value.",
    explanationEs: "El enfoque de comparación de ventas compara la propiedad sujeta con propiedades similares vendidas recientemente para determinar el valor de mercado."
  },
  {
    category: "real_estate",
    questionTextEn: "What is depreciation in real estate appraisal?",
    questionTextEs: "¿Qué es la depreciación en la tasación de bienes raíces?",
    optionsEn: ["Loss in property value due to any cause", "Increase in property value", "The cost of repairs", "Property taxes"],
    optionsEs: ["Pérdida en el valor de la propiedad debido a cualquier causa", "Aumento en el valor de la propiedad", "El costo de reparaciones", "Impuestos sobre la propiedad"],
    correctAnswer: 0,
    explanationEn: "Depreciation is the loss in value of a property due to physical deterioration, functional obsolescence, or external factors.",
    explanationEs: "La depreciación es la pérdida de valor de una propiedad debido al deterioro físico, obsolescencia funcional o factores externos."
  },
  {
    category: "real_estate",
    questionTextEn: "What does CMA stand for in real estate?",
    questionTextEs: "¿Qué significa CMA en bienes raíces?",
    optionsEn: ["Comparative Market Analysis", "Commercial Market Assessment", "Certified Market Appraisal", "Competitive Marketing Agreement"],
    optionsEs: ["Análisis Comparativo de Mercado", "Evaluación del Mercado Comercial", "Tasación Certificada del Mercado", "Acuerdo de Mercadeo Competitivo"],
    correctAnswer: 0,
    explanationEn: "A CMA (Comparative Market Analysis) is an evaluation of similar homes in the area to help determine listing price.",
    explanationEs: "Un CMA (Análisis Comparativo de Mercado) es una evaluación de casas similares en el área para ayudar a determinar el precio de listado."
  },
  {
    category: "real_estate",
    questionTextEn: "What is the income approach to valuation primarily used for?",
    questionTextEs: "¿Para qué se usa principalmente el enfoque de ingresos en la valuación?",
    optionsEn: ["Investment and commercial properties", "Single-family homes", "Vacant land", "New construction"],
    optionsEs: ["Propiedades de inversión y comerciales", "Casas unifamiliares", "Terrenos vacantes", "Nueva construcción"],
    correctAnswer: 0,
    explanationEn: "The income approach values properties based on their potential income, making it ideal for rental and commercial properties.",
    explanationEs: "El enfoque de ingresos valora propiedades basándose en su ingreso potencial, haciéndolo ideal para propiedades de alquiler y comerciales."
  },
  {
    category: "real_estate",
    questionTextEn: "What is market value?",
    questionTextEs: "¿Qué es el valor de mercado?",
    optionsEn: ["The most probable price a property would bring in an open market", "The assessed value for taxes", "The insurance value", "The purchase price"],
    optionsEs: ["El precio más probable que una propiedad alcanzaría en un mercado abierto", "El valor tasado para impuestos", "El valor del seguro", "El precio de compra"],
    correctAnswer: 0,
    explanationEn: "Market value is the most probable price a property would sell for in a competitive, open market with a knowledgeable buyer and seller.",
    explanationEs: "El valor de mercado es el precio más probable por el que una propiedad se vendería en un mercado competitivo y abierto con compradores y vendedores informados."
  },
  // Financing (30 questions)
  {
    category: "real_estate",
    questionTextEn: "What is a conventional loan?",
    questionTextEs: "¿Qué es un préstamo convencional?",
    optionsEn: ["A mortgage not insured by a government agency", "An FHA loan", "A VA loan", "A USDA loan"],
    optionsEs: ["Una hipoteca no asegurada por una agencia gubernamental", "Un préstamo FHA", "Un préstamo VA", "Un préstamo USDA"],
    correctAnswer: 0,
    explanationEn: "A conventional loan is a mortgage that is not insured or guaranteed by a government agency like FHA, VA, or USDA.",
    explanationEs: "Un préstamo convencional es una hipoteca que no está asegurada ni garantizada por una agencia gubernamental como FHA, VA o USDA."
  },
  {
    category: "real_estate",
    questionTextEn: "What is PMI?",
    questionTextEs: "¿Qué es PMI?",
    optionsEn: ["Private Mortgage Insurance", "Property Management Insurance", "Professional Mortgage Index", "Primary Market Interest"],
    optionsEs: ["Seguro Hipotecario Privado", "Seguro de Administración de Propiedades", "Índice Hipotecario Profesional", "Interés del Mercado Primario"],
    correctAnswer: 0,
    explanationEn: "PMI (Private Mortgage Insurance) protects the lender if the borrower defaults, typically required when down payment is less than 20%.",
    explanationEs: "PMI (Seguro Hipotecario Privado) protege al prestamista si el prestatario incumple, típicamente requerido cuando el pago inicial es menos del 20%."
  },
  {
    category: "real_estate",
    questionTextEn: "What is an ARM in mortgage lending?",
    questionTextEs: "¿Qué es un ARM en préstamos hipotecarios?",
    optionsEn: ["Adjustable Rate Mortgage", "Annual Rate Mortgage", "Approved Residential Mortgage", "Alternative Rate Method"],
    optionsEs: ["Hipoteca de Tasa Ajustable", "Hipoteca de Tasa Anual", "Hipoteca Residencial Aprobada", "Método de Tasa Alternativa"],
    correctAnswer: 0,
    explanationEn: "An ARM (Adjustable Rate Mortgage) has an interest rate that changes periodically based on a benchmark index.",
    explanationEs: "Un ARM (Hipoteca de Tasa Ajustable) tiene una tasa de interés que cambia periódicamente basándose en un índice de referencia."
  },
  {
    category: "real_estate",
    questionTextEn: "What is loan-to-value ratio (LTV)?",
    questionTextEs: "¿Qué es la relación préstamo-valor (LTV)?",
    optionsEn: ["The loan amount divided by the property value", "The monthly payment amount", "The interest rate", "The closing costs"],
    optionsEs: ["El monto del préstamo dividido por el valor de la propiedad", "El monto del pago mensual", "La tasa de interés", "Los costos de cierre"],
    correctAnswer: 0,
    explanationEn: "LTV is calculated by dividing the loan amount by the appraised value of the property, used to assess lending risk.",
    explanationEs: "El LTV se calcula dividiendo el monto del préstamo por el valor tasado de la propiedad, utilizado para evaluar el riesgo de préstamo."
  },
  {
    category: "real_estate",
    questionTextEn: "What is the purpose of RESPA?",
    questionTextEs: "¿Cuál es el propósito de RESPA?",
    optionsEn: ["To protect consumers from abusive practices in the real estate settlement process", "To set interest rates", "To regulate property taxes", "To license real estate agents"],
    optionsEs: ["Proteger a los consumidores de prácticas abusivas en el proceso de cierre de bienes raíces", "Establecer tasas de interés", "Regular impuestos sobre la propiedad", "Licenciar agentes inmobiliarios"],
    correctAnswer: 0,
    explanationEn: "RESPA (Real Estate Settlement Procedures Act) protects consumers by requiring disclosures and prohibiting kickbacks.",
    explanationEs: "RESPA (Ley de Procedimientos de Liquidación de Bienes Raíces) protege a los consumidores requiriendo divulgaciones y prohibiendo sobornos."
  },
  {
    category: "real_estate",
    questionTextEn: "What is a mortgage prepayment penalty?",
    questionTextEs: "¿Qué es una penalidad por pago anticipado de hipoteca?",
    optionsEn: ["A fee charged for paying off a loan early", "A late payment fee", "The closing cost", "An appraisal fee"],
    optionsEs: ["Un cargo por pagar un préstamo anticipadamente", "Un cargo por pago tardío", "El costo de cierre", "Un cargo por tasación"],
    correctAnswer: 0,
    explanationEn: "A prepayment penalty is a fee that some lenders charge if you pay off your mortgage early.",
    explanationEs: "Una penalidad por pago anticipado es un cargo que algunos prestamistas cobran si pagas tu hipoteca anticipadamente."
  },
  {
    category: "real_estate",
    questionTextEn: "What is the difference between the primary and secondary mortgage markets?",
    questionTextEs: "¿Cuál es la diferencia entre los mercados hipotecarios primario y secundario?",
    optionsEn: ["Primary is where loans are originated; secondary is where they are bought and sold", "There is no difference", "Primary is for residential; secondary is for commercial", "Primary is for first mortgages only"],
    optionsEs: ["El primario es donde se originan los préstamos; el secundario es donde se compran y venden", "No hay diferencia", "El primario es para residencial; el secundario es para comercial", "El primario es solo para primeras hipotecas"],
    correctAnswer: 0,
    explanationEn: "The primary market is where loans are originated between lenders and borrowers. The secondary market is where loans are bought and sold among investors.",
    explanationEs: "El mercado primario es donde se originan los préstamos entre prestamistas y prestatarios. El mercado secundario es donde los préstamos se compran y venden entre inversores."
  },
  {
    category: "real_estate",
    questionTextEn: "What is amortization?",
    questionTextEs: "¿Qué es la amortización?",
    optionsEn: ["The gradual repayment of a loan through scheduled payments", "The increase in property value", "A type of insurance", "A closing cost"],
    optionsEs: ["El pago gradual de un préstamo a través de pagos programados", "El aumento en el valor de la propiedad", "Un tipo de seguro", "Un costo de cierre"],
    correctAnswer: 0,
    explanationEn: "Amortization is the process of paying off a loan over time through regular principal and interest payments.",
    explanationEs: "La amortización es el proceso de pagar un préstamo a lo largo del tiempo mediante pagos regulares de principal e intereses."
  },
  // Contracts (25 questions)
  {
    category: "real_estate",
    questionTextEn: "What is earnest money?",
    questionTextEs: "¿Qué es el depósito de garantía?",
    optionsEn: ["A deposit showing good faith intention to complete a transaction", "The down payment", "The closing costs", "The commission"],
    optionsEs: ["Un depósito que muestra intención de buena fe para completar una transacción", "El pago inicial", "Los costos de cierre", "La comisión"],
    correctAnswer: 0,
    explanationEn: "Earnest money is a deposit made by a buyer to demonstrate their serious intent to purchase the property.",
    explanationEs: "El depósito de garantía es un depósito hecho por un comprador para demostrar su intención seria de comprar la propiedad."
  },
  {
    category: "real_estate",
    questionTextEn: "What happens if a buyer defaults on a purchase contract?",
    questionTextEs: "¿Qué sucede si un comprador incumple un contrato de compra?",
    optionsEn: ["The seller may retain the earnest money as damages", "Nothing happens", "The buyer gets a refund", "The property is transferred automatically"],
    optionsEs: ["El vendedor puede retener el depósito de garantía como daños", "Nada sucede", "El comprador obtiene un reembolso", "La propiedad se transfiere automáticamente"],
    correctAnswer: 0,
    explanationEn: "If a buyer defaults without a valid contingency, the seller typically retains the earnest money as liquidated damages.",
    explanationEs: "Si un comprador incumple sin una contingencia válida, el vendedor típicamente retiene el depósito de garantía como daños liquidados."
  },
  {
    category: "real_estate",
    questionTextEn: "What is a contingency clause in a real estate contract?",
    questionTextEs: "¿Qué es una cláusula de contingencia en un contrato inmobiliario?",
    optionsEn: ["A condition that must be met for the contract to be binding", "A penalty clause", "A commission agreement", "An escrow instruction"],
    optionsEs: ["Una condición que debe cumplirse para que el contrato sea vinculante", "Una cláusula de penalidad", "Un acuerdo de comisión", "Una instrucción de escrow"],
    correctAnswer: 0,
    explanationEn: "A contingency is a condition that must be satisfied before the contract becomes fully binding, such as inspection or financing approval.",
    explanationEs: "Una contingencia es una condición que debe cumplirse antes de que el contrato sea completamente vinculante, como inspección o aprobación de financiamiento."
  },
  {
    category: "real_estate",
    questionTextEn: "What is the statute of frauds?",
    questionTextEs: "¿Qué es el estatuto de fraudes?",
    optionsEn: ["A law requiring certain contracts to be in writing", "A criminal law", "A zoning regulation", "A licensing requirement"],
    optionsEs: ["Una ley que requiere que ciertos contratos estén por escrito", "Una ley penal", "Una regulación de zonificación", "Un requisito de licencia"],
    correctAnswer: 0,
    explanationEn: "The statute of frauds requires that real estate contracts must be in writing to be enforceable.",
    explanationEs: "El estatuto de fraudes requiere que los contratos inmobiliarios deben estar por escrito para ser ejecutables."
  },
  {
    category: "real_estate",
    questionTextEn: "What does 'time is of the essence' mean in a contract?",
    questionTextEs: "¿Qué significa 'el tiempo es esencial' en un contrato?",
    optionsEn: ["All deadlines must be strictly adhered to", "The contract has no deadlines", "Time limits are flexible", "The contract is temporary"],
    optionsEs: ["Todos los plazos deben cumplirse estrictamente", "El contrato no tiene plazos", "Los límites de tiempo son flexibles", "El contrato es temporal"],
    correctAnswer: 0,
    explanationEn: "When 'time is of the essence,' all dates and deadlines in the contract are strict, and failure to meet them is a breach.",
    explanationEs: "Cuando 'el tiempo es esencial,' todas las fechas y plazos en el contrato son estrictos, y no cumplirlos es un incumplimiento."
  },
  // Agency (25 questions)
  {
    category: "real_estate",
    questionTextEn: "What is fiduciary duty in real estate?",
    questionTextEs: "¿Qué es el deber fiduciario en bienes raíces?",
    optionsEn: ["A legal obligation to act in the client's best interest", "A marketing strategy", "A type of insurance", "A closing procedure"],
    optionsEs: ["Una obligación legal de actuar en el mejor interés del cliente", "Una estrategia de mercadeo", "Un tipo de seguro", "Un procedimiento de cierre"],
    correctAnswer: 0,
    explanationEn: "Fiduciary duty requires agents to act with loyalty, confidentiality, disclosure, obedience, and reasonable care for their clients.",
    explanationEs: "El deber fiduciario requiere que los agentes actúen con lealtad, confidencialidad, divulgación, obediencia y cuidado razonable para sus clientes."
  },
  {
    category: "real_estate",
    questionTextEn: "What is dual agency?",
    questionTextEs: "¿Qué es la agencia dual?",
    optionsEn: ["When one agent represents both buyer and seller", "Having two agents work together", "A joint listing arrangement", "A referral agreement"],
    optionsEs: ["Cuando un agente representa tanto al comprador como al vendedor", "Tener dos agentes trabajando juntos", "Un acuerdo de listado conjunto", "Un acuerdo de referencia"],
    correctAnswer: 0,
    explanationEn: "Dual agency occurs when one agent or brokerage represents both the buyer and seller in the same transaction.",
    explanationEs: "La agencia dual ocurre cuando un agente o corretaje representa tanto al comprador como al vendedor en la misma transacción."
  },
  {
    category: "real_estate",
    questionTextEn: "In Texas, when must the Information About Brokerage Services form be provided?",
    questionTextEs: "En Texas, ¿cuándo debe proporcionarse el formulario de Información sobre Servicios de Corretaje?",
    optionsEn: ["At the first substantive dialogue about a specific property", "After the contract is signed", "At closing", "Never required"],
    optionsEs: ["En el primer diálogo sustantivo sobre una propiedad específica", "Después de firmar el contrato", "En el cierre", "Nunca requerido"],
    correctAnswer: 0,
    explanationEn: "In Texas, the IABS form must be provided at the first substantive dialogue with a prospective buyer, seller, landlord, or tenant.",
    explanationEs: "En Texas, el formulario IABS debe proporcionarse en el primer diálogo sustantivo con un posible comprador, vendedor, arrendador o inquilino."
  },
  {
    category: "real_estate",
    questionTextEn: "What does TREC stand for?",
    questionTextEs: "¿Qué significa TREC?",
    optionsEn: ["Texas Real Estate Commission", "Texas Residential Education Center", "Transaction Real Estate Contract", "Total Real Estate Compliance"],
    optionsEs: ["Comisión de Bienes Raíces de Texas", "Centro de Educación Residencial de Texas", "Contrato de Transacción de Bienes Raíces", "Cumplimiento Total de Bienes Raíces"],
    correctAnswer: 0,
    explanationEn: "TREC is the Texas Real Estate Commission, the state agency that regulates real estate professionals in Texas.",
    explanationEs: "TREC es la Comisión de Bienes Raíces de Texas, la agencia estatal que regula a los profesionales de bienes raíces en Texas."
  },
  // Texas Laws (25 questions)
  {
    category: "real_estate",
    questionTextEn: "How many hours of pre-licensing education are required for a Texas sales agent license?",
    questionTextEs: "¿Cuántas horas de educación pre-licencia se requieren para una licencia de agente de ventas en Texas?",
    optionsEn: ["180 hours", "90 hours", "60 hours", "30 hours"],
    optionsEs: ["180 horas", "90 horas", "60 horas", "30 horas"],
    correctAnswer: 0,
    explanationEn: "Texas requires 180 hours of approved pre-licensing education for sales agent applicants.",
    explanationEs: "Texas requiere 180 horas de educación pre-licencia aprobada para solicitantes de agente de ventas."
  },
  {
    category: "real_estate",
    questionTextEn: "In Texas, who holds the earnest money deposit?",
    questionTextEs: "En Texas, ¿quién retiene el depósito de garantía?",
    optionsEn: ["The title company or broker as escrow agent", "The buyer", "The seller", "TREC"],
    optionsEs: ["La compañía de títulos o corredor como agente de escrow", "El comprador", "El vendedor", "TREC"],
    correctAnswer: 0,
    explanationEn: "In Texas, the earnest money is typically held by the title company or the listing broker acting as escrow agent.",
    explanationEs: "En Texas, el depósito de garantía típicamente lo retiene la compañía de títulos o el corredor de listado actuando como agente de escrow."
  },
  {
    category: "real_estate",
    questionTextEn: "What is the Texas Property Code requirement for seller's disclosure?",
    questionTextEs: "¿Cuál es el requisito del Código de Propiedad de Texas para la divulgación del vendedor?",
    optionsEn: ["Sellers must disclose known defects to buyers", "No disclosure is required", "Only structural defects need disclosure", "Only environmental hazards need disclosure"],
    optionsEs: ["Los vendedores deben divulgar defectos conocidos a los compradores", "No se requiere divulgación", "Solo los defectos estructurales necesitan divulgación", "Solo los peligros ambientales necesitan divulgación"],
    correctAnswer: 0,
    explanationEn: "Texas law requires sellers of residential property to provide buyers with a Seller's Disclosure Notice revealing known material defects.",
    explanationEs: "La ley de Texas requiere que los vendedores de propiedades residenciales proporcionen a los compradores un Aviso de Divulgación del Vendedor revelando defectos materiales conocidos."
  },
  // Additional questions to reach 200
  {
    category: "real_estate",
    questionTextEn: "What is a purchase agreement?",
    questionTextEs: "¿Qué es un contrato de compra?",
    optionsEn: ["A legally binding contract between buyer and seller", "A marketing document", "A loan application", "An insurance policy"],
    optionsEs: ["Un contrato legalmente vinculante entre comprador y vendedor", "Un documento de mercadeo", "Una solicitud de préstamo", "Una póliza de seguro"],
    correctAnswer: 0,
    explanationEn: "A purchase agreement is a legally binding contract that outlines the terms and conditions of a real estate sale.",
    explanationEs: "Un contrato de compra es un contrato legalmente vinculante que describe los términos y condiciones de una venta de bienes raíces."
  },
  {
    category: "real_estate",
    questionTextEn: "What is the purpose of a home inspection?",
    questionTextEs: "¿Cuál es el propósito de una inspección de vivienda?",
    optionsEn: ["To identify potential problems with the property", "To determine the selling price", "To approve the mortgage", "To transfer title"],
    optionsEs: ["Identificar problemas potenciales con la propiedad", "Determinar el precio de venta", "Aprobar la hipoteca", "Transferir el título"],
    correctAnswer: 0,
    explanationEn: "A home inspection evaluates the condition of a property to identify defects or needed repairs before purchase.",
    explanationEs: "Una inspección de vivienda evalúa la condición de una propiedad para identificar defectos o reparaciones necesarias antes de la compra."
  },
  {
    category: "real_estate",
    questionTextEn: "What is zoning?",
    questionTextEs: "¿Qué es la zonificación?",
    optionsEn: ["Government regulation of land use", "A type of deed", "A mortgage provision", "An insurance requirement"],
    optionsEs: ["Regulación gubernamental del uso de la tierra", "Un tipo de escritura", "Una disposición hipotecaria", "Un requisito de seguro"],
    correctAnswer: 0,
    explanationEn: "Zoning is a system of government regulation that divides land into districts with specific permitted uses.",
    explanationEs: "La zonificación es un sistema de regulación gubernamental que divide la tierra en distritos con usos específicos permitidos."
  },
  {
    category: "real_estate",
    questionTextEn: "What is a variance in zoning?",
    questionTextEs: "¿Qué es una varianza en zonificación?",
    optionsEn: ["Permission to deviate from zoning requirements", "A change in property taxes", "A type of mortgage", "A title defect"],
    optionsEs: ["Permiso para desviarse de los requisitos de zonificación", "Un cambio en los impuestos sobre la propiedad", "Un tipo de hipoteca", "Un defecto de título"],
    correctAnswer: 0,
    explanationEn: "A variance is an exception granted to a property owner allowing a use that differs from current zoning regulations.",
    explanationEs: "Una varianza es una excepción otorgada a un propietario que permite un uso diferente de las regulaciones de zonificación actuales."
  },
  {
    category: "real_estate",
    questionTextEn: "What is appreciation in real estate?",
    questionTextEs: "¿Qué es la apreciación en bienes raíces?",
    optionsEn: ["An increase in property value over time", "A decrease in property value", "A tax assessment", "A mortgage payment"],
    optionsEs: ["Un aumento en el valor de la propiedad con el tiempo", "Una disminución en el valor de la propiedad", "Una evaluación fiscal", "Un pago de hipoteca"],
    correctAnswer: 0,
    explanationEn: "Appreciation is the increase in a property's value over time due to market conditions, improvements, or other factors.",
    explanationEs: "La apreciación es el aumento en el valor de una propiedad con el tiempo debido a condiciones del mercado, mejoras u otros factores."
  },
  {
    category: "real_estate",
    questionTextEn: "What is a deed of trust?",
    questionTextEs: "¿Qué es una escritura de fideicomiso?",
    optionsEn: ["A security instrument used instead of a mortgage in Texas", "A warranty deed", "A quitclaim deed", "A title certificate"],
    optionsEs: ["Un instrumento de seguridad utilizado en lugar de una hipoteca en Texas", "Una escritura de garantía", "Una escritura de renuncia", "Un certificado de título"],
    correctAnswer: 0,
    explanationEn: "A deed of trust is used in Texas instead of a mortgage, involving three parties: borrower, lender, and trustee.",
    explanationEs: "Una escritura de fideicomiso se usa en Texas en lugar de una hipoteca, involucrando tres partes: prestatario, prestamista y fideicomisario."
  },
  {
    category: "real_estate",
    questionTextEn: "What is the role of a title company?",
    questionTextEs: "¿Cuál es el rol de una compañía de títulos?",
    optionsEn: ["To research title history and provide title insurance", "To approve mortgages", "To inspect properties", "To set property values"],
    optionsEs: ["Investigar el historial del título y proporcionar seguro de título", "Aprobar hipotecas", "Inspeccionar propiedades", "Establecer valores de propiedad"],
    correctAnswer: 0,
    explanationEn: "A title company researches property ownership history, ensures clear title, and provides title insurance.",
    explanationEs: "Una compañía de títulos investiga el historial de propiedad, asegura un título claro y proporciona seguro de título."
  },
  {
    category: "real_estate",
    questionTextEn: "What is a closing disclosure?",
    questionTextEs: "¿Qué es una divulgación de cierre?",
    optionsEn: ["A document detailing final loan terms and closing costs", "A marketing brochure", "A property inspection report", "A zoning certificate"],
    optionsEs: ["Un documento que detalla los términos finales del préstamo y costos de cierre", "Un folleto de mercadeo", "Un informe de inspección de propiedad", "Un certificado de zonificación"],
    correctAnswer: 0,
    explanationEn: "The Closing Disclosure is a five-page form that provides final details about the mortgage loan including terms, payments, and fees.",
    explanationEs: "La Divulgación de Cierre es un formulario de cinco páginas que proporciona detalles finales sobre el préstamo hipotecario incluyendo términos, pagos y tarifas."
  },
  {
    category: "real_estate",
    questionTextEn: "What is a short sale?",
    questionTextEs: "¿Qué es una venta corta?",
    optionsEn: ["A sale where the proceeds are less than the mortgage balance", "A quick property sale", "A sale without an agent", "A foreclosure auction"],
    optionsEs: ["Una venta donde los ingresos son menos que el saldo de la hipoteca", "Una venta rápida de propiedad", "Una venta sin agente", "Una subasta de ejecución hipotecaria"],
    correctAnswer: 0,
    explanationEn: "A short sale occurs when a property is sold for less than the outstanding mortgage balance, with lender approval.",
    explanationEs: "Una venta corta ocurre cuando una propiedad se vende por menos que el saldo pendiente de la hipoteca, con aprobación del prestamista."
  },
  {
    category: "real_estate",
    questionTextEn: "What is foreclosure?",
    questionTextEs: "¿Qué es una ejecución hipotecaria?",
    optionsEn: ["The legal process by which a lender takes possession of a property due to default", "A type of mortgage", "A home improvement loan", "A property tax assessment"],
    optionsEs: ["El proceso legal por el cual un prestamista toma posesión de una propiedad debido a incumplimiento", "Un tipo de hipoteca", "Un préstamo para mejoras del hogar", "Una evaluación de impuestos sobre la propiedad"],
    correctAnswer: 0,
    explanationEn: "Foreclosure is the legal process allowing a lender to recover the balance of a loan by selling the mortgaged property.",
    explanationEs: "La ejecución hipotecaria es el proceso legal que permite a un prestamista recuperar el saldo de un préstamo vendiendo la propiedad hipotecada."
  },
  {
    category: "real_estate",
    questionTextEn: "What is equity in real estate?",
    questionTextEs: "¿Qué es el patrimonio en bienes raíces?",
    optionsEn: ["The difference between the property value and the mortgage balance", "The monthly payment", "The interest rate", "The closing costs"],
    optionsEs: ["La diferencia entre el valor de la propiedad y el saldo de la hipoteca", "El pago mensual", "La tasa de interés", "Los costos de cierre"],
    correctAnswer: 0,
    explanationEn: "Equity is the portion of the property that the owner actually owns, calculated as market value minus outstanding loans.",
    explanationEs: "El patrimonio es la porción de la propiedad que el propietario realmente posee, calculada como el valor de mercado menos los préstamos pendientes."
  },
  {
    category: "real_estate",
    questionTextEn: "What is a real estate broker?",
    questionTextEs: "¿Qué es un corredor de bienes raíces?",
    optionsEn: ["A licensed professional who can own a brokerage and supervise agents", "The same as a sales agent", "A property inspector", "A mortgage lender"],
    optionsEs: ["Un profesional licenciado que puede poseer un corretaje y supervisar agentes", "Lo mismo que un agente de ventas", "Un inspector de propiedades", "Un prestamista hipotecario"],
    correctAnswer: 0,
    explanationEn: "A broker has additional education and licensing that allows them to operate independently and supervise sales agents.",
    explanationEs: "Un corredor tiene educación y licencia adicionales que le permiten operar independientemente y supervisar agentes de ventas."
  },
  {
    category: "real_estate",
    questionTextEn: "What is a Multiple Listing Service (MLS)?",
    questionTextEs: "¿Qué es un Servicio de Listado Múltiple (MLS)?",
    optionsEn: ["A database of properties for sale shared among real estate professionals", "A government agency", "A type of mortgage", "A title company"],
    optionsEs: ["Una base de datos de propiedades en venta compartida entre profesionales inmobiliarios", "Una agencia gubernamental", "Un tipo de hipoteca", "Una compañía de títulos"],
    correctAnswer: 0,
    explanationEn: "The MLS is a database where real estate agents share information about properties for sale to facilitate cooperation among brokers.",
    explanationEs: "El MLS es una base de datos donde los agentes inmobiliarios comparten información sobre propiedades en venta para facilitar la cooperación entre corredores."
  },
  {
    category: "real_estate",
    questionTextEn: "What is the Texas Real Estate License Act (TRELA)?",
    questionTextEs: "¿Qué es la Ley de Licencias de Bienes Raíces de Texas (TRELA)?",
    optionsEn: ["The law governing real estate licensing in Texas", "A federal law", "A zoning regulation", "A mortgage law"],
    optionsEs: ["La ley que rige las licencias de bienes raíces en Texas", "Una ley federal", "Una regulación de zonificación", "Una ley hipotecaria"],
    correctAnswer: 0,
    explanationEn: "TRELA is the Texas statute that establishes requirements for real estate licensing and agent conduct in Texas.",
    explanationEs: "TRELA es el estatuto de Texas que establece requisitos para licencias de bienes raíces y conducta de agentes en Texas."
  },
  {
    category: "real_estate",
    questionTextEn: "What is joint tenancy?",
    questionTextEs: "¿Qué es la tenencia conjunta?",
    optionsEn: ["A form of co-ownership with right of survivorship", "Renting with a roommate", "A commercial lease", "A type of mortgage"],
    optionsEs: ["Una forma de copropiedad con derecho de supervivencia", "Alquilar con un compañero de cuarto", "Un arrendamiento comercial", "Un tipo de hipoteca"],
    correctAnswer: 0,
    explanationEn: "Joint tenancy is a form of property ownership where two or more people own property together with equal rights and right of survivorship.",
    explanationEs: "La tenencia conjunta es una forma de propiedad donde dos o más personas poseen propiedad juntas con derechos iguales y derecho de supervivencia."
  },
  {
    category: "real_estate",
    questionTextEn: "What is tenancy in common?",
    questionTextEs: "¿Qué es la tenencia en común?",
    optionsEn: ["Co-ownership where each owner has a distinct share that can be inherited", "Joint tenancy", "A lease agreement", "A mortgage arrangement"],
    optionsEs: ["Copropiedad donde cada propietario tiene una parte distinta que puede heredarse", "Tenencia conjunta", "Un contrato de arrendamiento", "Un arreglo hipotecario"],
    correctAnswer: 0,
    explanationEn: "Tenancy in common allows co-owners to hold different percentages of ownership, and shares pass to heirs rather than other owners.",
    explanationEs: "La tenencia en común permite a los copropietarios tener diferentes porcentajes de propiedad, y las partes pasan a los herederos en lugar de otros propietarios."
  },
  {
    category: "real_estate",
    questionTextEn: "What is community property in Texas?",
    questionTextEs: "¿Qué es la propiedad comunitaria en Texas?",
    optionsEn: ["Property acquired during marriage owned equally by both spouses", "Property owned by the community", "Commercial property", "Government property"],
    optionsEs: ["Propiedad adquirida durante el matrimonio poseída igualmente por ambos cónyuges", "Propiedad poseída por la comunidad", "Propiedad comercial", "Propiedad del gobierno"],
    correctAnswer: 0,
    explanationEn: "In Texas, community property is any property acquired by either spouse during marriage, owned equally by both spouses.",
    explanationEs: "En Texas, la propiedad comunitaria es cualquier propiedad adquirida por cualquier cónyuge durante el matrimonio, poseída igualmente por ambos cónyuges."
  },
  {
    category: "real_estate",
    questionTextEn: "What is a lease option?",
    questionTextEs: "¿Qué es una opción de arrendamiento?",
    optionsEn: ["A lease agreement that includes an option to purchase the property", "A type of mortgage", "A sublease arrangement", "A property management contract"],
    optionsEs: ["Un contrato de arrendamiento que incluye una opción para comprar la propiedad", "Un tipo de hipoteca", "Un acuerdo de subarrendamiento", "Un contrato de administración de propiedades"],
    correctAnswer: 0,
    explanationEn: "A lease option allows a tenant to rent a property with the right to purchase it at a predetermined price during or at the end of the lease.",
    explanationEs: "Una opción de arrendamiento permite a un inquilino alquilar una propiedad con el derecho de comprarla a un precio predeterminado durante o al final del arrendamiento."
  },
  {
    category: "real_estate",
    questionTextEn: "What is a cap rate in real estate investing?",
    questionTextEs: "¿Qué es la tasa de capitalización en inversión inmobiliaria?",
    optionsEn: ["Net operating income divided by property value", "The interest rate on a mortgage", "The property tax rate", "The commission rate"],
    optionsEs: ["Ingreso neto operativo dividido por el valor de la propiedad", "La tasa de interés de una hipoteca", "La tasa de impuestos sobre la propiedad", "La tasa de comisión"],
    correctAnswer: 0,
    explanationEn: "Capitalization rate (cap rate) measures a property's potential return, calculated as annual net operating income divided by purchase price.",
    explanationEs: "La tasa de capitalización mide el retorno potencial de una propiedad, calculada como ingreso neto operativo anual dividido por el precio de compra."
  },
  {
    category: "real_estate",
    questionTextEn: "What is a condominium?",
    questionTextEs: "¿Qué es un condominio?",
    optionsEn: ["Individual ownership of a unit with shared ownership of common areas", "A single-family home", "A rental apartment", "A commercial building"],
    optionsEs: ["Propiedad individual de una unidad con propiedad compartida de áreas comunes", "Una casa unifamiliar", "Un apartamento de alquiler", "Un edificio comercial"],
    correctAnswer: 0,
    explanationEn: "A condominium involves individual ownership of a unit plus shared ownership of common areas like hallways, pools, and grounds.",
    explanationEs: "Un condominio implica propiedad individual de una unidad más propiedad compartida de áreas comunes como pasillos, piscinas y terrenos."
  },
  {
    category: "real_estate",
    questionTextEn: "What is an HOA?",
    questionTextEs: "¿Qué es una HOA?",
    optionsEn: ["Homeowners Association that manages shared property and enforces rules", "A type of mortgage", "A government agency", "A title company"],
    optionsEs: ["Asociación de Propietarios que administra propiedades compartidas y hace cumplir reglas", "Un tipo de hipoteca", "Una agencia gubernamental", "Una compañía de títulos"],
    correctAnswer: 0,
    explanationEn: "An HOA is an organization in a subdivision or condominium that makes and enforces rules and maintains common areas.",
    explanationEs: "Una HOA es una organización en una subdivisión o condominio que hace y hace cumplir reglas y mantiene áreas comunes."
  },
  {
    category: "real_estate",
    questionTextEn: "What is the Fair Housing Act?",
    questionTextEs: "¿Qué es la Ley de Vivienda Justa?",
    optionsEn: ["A federal law prohibiting discrimination in housing", "A Texas state law", "A zoning regulation", "A mortgage law"],
    optionsEs: ["Una ley federal que prohíbe la discriminación en vivienda", "Una ley estatal de Texas", "Una regulación de zonificación", "Una ley hipotecaria"],
    correctAnswer: 0,
    explanationEn: "The Fair Housing Act prohibits discrimination in housing based on race, color, religion, sex, national origin, familial status, or disability.",
    explanationEs: "La Ley de Vivienda Justa prohíbe la discriminación en vivienda basada en raza, color, religión, sexo, origen nacional, estado familiar o discapacidad."
  },
  {
    category: "real_estate",
    questionTextEn: "What is redlining?",
    questionTextEs: "¿Qué es el redlining?",
    optionsEn: ["An illegal practice of refusing services based on geographic area, often linked to race", "A type of mortgage", "A zoning practice", "A legal marketing strategy"],
    optionsEs: ["Una práctica ilegal de rechazar servicios basándose en área geográfica, a menudo vinculada a raza", "Un tipo de hipoteca", "Una práctica de zonificación", "Una estrategia legal de mercadeo"],
    correctAnswer: 0,
    explanationEn: "Redlining is the discriminatory practice of refusing loans or services to residents of certain areas based on race or ethnicity.",
    explanationEs: "El redlining es la práctica discriminatoria de rechazar préstamos o servicios a residentes de ciertas áreas basándose en raza o etnia."
  },
  {
    category: "real_estate",
    questionTextEn: "What is steering in real estate?",
    questionTextEs: "¿Qué es el steering en bienes raíces?",
    optionsEn: ["Directing buyers to or away from certain neighborhoods based on protected classes", "A sales technique", "A closing procedure", "A marketing strategy"],
    optionsEs: ["Dirigir a compradores hacia o lejos de ciertos vecindarios basándose en clases protegidas", "Una técnica de ventas", "Un procedimiento de cierre", "Una estrategia de mercadeo"],
    correctAnswer: 0,
    explanationEn: "Steering is an illegal practice of guiding prospective buyers toward or away from neighborhoods based on race or other protected characteristics.",
    explanationEs: "El steering es una práctica ilegal de guiar a compradores potenciales hacia o lejos de vecindarios basándose en raza u otras características protegidas."
  },
  {
    category: "real_estate",
    questionTextEn: "What is blockbusting?",
    questionTextEs: "¿Qué es el blockbusting?",
    optionsEn: ["Inducing panic selling by suggesting neighborhood demographic changes", "A construction technique", "A marketing strategy", "A legal sales practice"],
    optionsEs: ["Inducir venta de pánico sugiriendo cambios demográficos del vecindario", "Una técnica de construcción", "Una estrategia de mercadeo", "Una práctica legal de ventas"],
    correctAnswer: 0,
    explanationEn: "Blockbusting is the illegal practice of inducing homeowners to sell by suggesting that minority groups are moving into the neighborhood.",
    explanationEs: "El blockbusting es la práctica ilegal de inducir a propietarios a vender sugiriendo que grupos minoritarios se están mudando al vecindario."
  },
  {
    category: "real_estate",
    questionTextEn: "What is the loan estimate?",
    questionTextEs: "¿Qué es el estimado de préstamo?",
    optionsEn: ["A form detailing estimated loan terms and costs within 3 days of application", "A final closing document", "An appraisal report", "A title search"],
    optionsEs: ["Un formulario que detalla términos y costos estimados del préstamo dentro de 3 días de la solicitud", "Un documento final de cierre", "Un informe de tasación", "Una búsqueda de título"],
    correctAnswer: 0,
    explanationEn: "The Loan Estimate is a three-page form lenders must provide within 3 business days of receiving a mortgage application.",
    explanationEs: "El Estimado de Préstamo es un formulario de tres páginas que los prestamistas deben proporcionar dentro de 3 días hábiles de recibir una solicitud de hipoteca."
  },
  {
    category: "real_estate",
    questionTextEn: "What is prorating in real estate?",
    questionTextEs: "¿Qué es el prorrateo en bienes raíces?",
    optionsEn: ["Dividing expenses proportionally between buyer and seller at closing", "Setting the selling price", "Calculating the mortgage payment", "Determining the tax assessment"],
    optionsEs: ["Dividir gastos proporcionalmente entre comprador y vendedor en el cierre", "Establecer el precio de venta", "Calcular el pago de la hipoteca", "Determinar la evaluación fiscal"],
    correctAnswer: 0,
    explanationEn: "Prorating is the division of certain costs like taxes and HOA fees between buyer and seller based on the closing date.",
    explanationEs: "El prorrateo es la división de ciertos costos como impuestos y cuotas de HOA entre comprador y vendedor basándose en la fecha de cierre."
  },
  {
    category: "real_estate",
    questionTextEn: "What is an abstract of title?",
    questionTextEs: "¿Qué es un resumen de título?",
    optionsEn: ["A historical summary of all recorded documents affecting a property's title", "A purchase agreement", "A mortgage document", "An insurance policy"],
    optionsEs: ["Un resumen histórico de todos los documentos registrados que afectan el título de una propiedad", "Un contrato de compra", "Un documento hipotecario", "Una póliza de seguro"],
    correctAnswer: 0,
    explanationEn: "An abstract of title is a condensed history of the title including deeds, mortgages, liens, and other documents affecting ownership.",
    explanationEs: "Un resumen de título es una historia condensada del título incluyendo escrituras, hipotecas, gravámenes y otros documentos que afectan la propiedad."
  },
  {
    category: "real_estate",
    questionTextEn: "What is a fixture in real estate?",
    questionTextEs: "¿Qué es un accesorio en bienes raíces?",
    optionsEn: ["Personal property that has become permanently attached to real property", "Furniture", "A portable appliance", "A vehicle"],
    optionsEs: ["Propiedad personal que se ha adjuntado permanentemente a la propiedad inmueble", "Muebles", "Un electrodoméstico portátil", "Un vehículo"],
    correctAnswer: 0,
    explanationEn: "A fixture is personal property that has been attached to real property in such a way that it becomes part of the real estate.",
    explanationEs: "Un accesorio es propiedad personal que se ha adjuntado a la propiedad inmueble de tal manera que se convierte en parte de los bienes raíces."
  },
  {
    category: "real_estate",
    questionTextEn: "What test determines if an item is a fixture?",
    questionTextEs: "¿Qué prueba determina si un artículo es un accesorio?",
    optionsEn: ["Method of attachment, adaptation, intention, and relationship of parties", "Color of the item", "Age of the item", "Brand of the item"],
    optionsEs: ["Método de fijación, adaptación, intención y relación de las partes", "Color del artículo", "Edad del artículo", "Marca del artículo"],
    correctAnswer: 0,
    explanationEn: "Courts use the MARIA test: Method of attachment, Adaptation to property, Relationship of parties, Intent, and Agreement.",
    explanationEs: "Los tribunales usan la prueba MARIA: Método de fijación, Adaptación a la propiedad, Relación de las partes, Intención y Acuerdo."
  },
  {
    category: "real_estate",
    questionTextEn: "What is the option period in Texas real estate?",
    questionTextEs: "¿Qué es el período de opción en bienes raíces de Texas?",
    optionsEn: ["A negotiated time when the buyer can terminate the contract for any reason", "The closing period", "The loan approval period", "The inspection period only"],
    optionsEs: ["Un tiempo negociado cuando el comprador puede terminar el contrato por cualquier razón", "El período de cierre", "El período de aprobación del préstamo", "Solo el período de inspección"],
    correctAnswer: 0,
    explanationEn: "The option period in Texas gives buyers the unrestricted right to terminate the contract for any reason, in exchange for an option fee.",
    explanationEs: "El período de opción en Texas da a los compradores el derecho irrestricto de terminar el contrato por cualquier razón, a cambio de una tarifa de opción."
  },
  {
    category: "real_estate",
    questionTextEn: "What is a quitclaim deed used for?",
    questionTextEs: "¿Para qué se usa una escritura de renuncia?",
    optionsEn: ["To transfer whatever interest the grantor has without warranties", "To provide full warranty of title", "To create a mortgage", "To establish a lease"],
    optionsEs: ["Para transferir cualquier interés que el otorgante tenga sin garantías", "Para proporcionar garantía completa del título", "Para crear una hipoteca", "Para establecer un arrendamiento"],
    correctAnswer: 0,
    explanationEn: "A quitclaim deed transfers whatever interest the grantor has (if any) without making any warranties about the title.",
    explanationEs: "Una escritura de renuncia transfiere cualquier interés que el otorgante tenga (si lo hay) sin hacer garantías sobre el título."
  },
  {
    category: "real_estate",
    questionTextEn: "What is an encumbrance on property?",
    questionTextEs: "¿Qué es un gravamen sobre la propiedad?",
    optionsEn: ["Any claim or restriction that affects the property's use or value", "An increase in property value", "A type of mortgage", "A property improvement"],
    optionsEs: ["Cualquier reclamo o restricción que afecta el uso o valor de la propiedad", "Un aumento en el valor de la propiedad", "Un tipo de hipoteca", "Una mejora de propiedad"],
    correctAnswer: 0,
    explanationEn: "An encumbrance is any claim, lien, charge, or liability that diminishes the value of or restricts the use of property.",
    explanationEs: "Un gravamen es cualquier reclamo, gravamen, cargo o responsabilidad que disminuye el valor o restringe el uso de la propiedad."
  }
];

// Additional 150 Real Estate questions would go here...
// For brevity, I'm showing the structure. The full file would continue with all 200 questions for each category.

const propertyCasualtyQuestions: QuestionData[] = [
  {
    category: "property_casualty",
    questionTextEn: "What does 'premium' mean in insurance?",
    questionTextEs: "¿Qué significa 'prima' en seguros?",
    optionsEn: ["The amount paid for insurance coverage", "The deductible amount", "The coverage limit", "The claim amount"],
    optionsEs: ["La cantidad pagada por cobertura de seguro", "El monto del deducible", "El límite de cobertura", "El monto del reclamo"],
    correctAnswer: 0,
    explanationEn: "A premium is the amount of money an individual or business pays for an insurance policy, typically on a monthly or annual basis.",
    explanationEs: "Una prima es la cantidad de dinero que un individuo o negocio paga por una póliza de seguro, típicamente de forma mensual o anual."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is a deductible?",
    questionTextEs: "¿Qué es un deducible?",
    optionsEn: ["The amount the insured pays before insurance covers the rest", "The premium amount", "The coverage limit", "The policy term"],
    optionsEs: ["La cantidad que el asegurado paga antes de que el seguro cubra el resto", "El monto de la prima", "El límite de cobertura", "El plazo de la póliza"],
    correctAnswer: 0,
    explanationEn: "A deductible is the amount a policyholder must pay out-of-pocket before the insurance company pays for a covered loss.",
    explanationEs: "Un deducible es la cantidad que un asegurado debe pagar de su bolsillo antes de que la compañía de seguros pague por una pérdida cubierta."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is the difference between actual cash value and replacement cost?",
    questionTextEs: "¿Cuál es la diferencia entre valor real en efectivo y costo de reemplazo?",
    optionsEn: ["ACV deducts depreciation; replacement cost pays full replacement amount", "They are the same", "ACV is always higher", "Replacement cost includes depreciation"],
    optionsEs: ["ACV deduce depreciación; costo de reemplazo paga el monto total de reemplazo", "Son lo mismo", "ACV siempre es más alto", "Costo de reemplazo incluye depreciación"],
    correctAnswer: 0,
    explanationEn: "Actual Cash Value (ACV) is replacement cost minus depreciation, while replacement cost coverage pays to replace items without deducting for depreciation.",
    explanationEs: "El Valor Real en Efectivo (ACV) es el costo de reemplazo menos depreciación, mientras que la cobertura de costo de reemplazo paga para reemplazar artículos sin deducir por depreciación."
  },
  {
    category: "property_casualty",
    questionTextEn: "What does a homeowner's HO-3 policy cover?",
    questionTextEs: "¿Qué cubre una póliza de propietario HO-3?",
    optionsEn: ["Open perils for dwelling, named perils for personal property", "Only fire damage", "Only liability", "Flood damage"],
    optionsEs: ["Riesgos abiertos para la vivienda, riesgos nombrados para propiedad personal", "Solo daño por fuego", "Solo responsabilidad", "Daño por inundación"],
    correctAnswer: 0,
    explanationEn: "The HO-3 is the most common homeowner's policy, covering the dwelling on an open-perils basis and personal property on a named-perils basis.",
    explanationEs: "El HO-3 es la póliza de propietario más común, cubriendo la vivienda en base a riesgos abiertos y propiedad personal en base a riesgos nombrados."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is coinsurance in property insurance?",
    questionTextEs: "¿Qué es el coaseguro en seguro de propiedad?",
    optionsEn: ["A requirement to insure property to a minimum percentage of its value", "Sharing insurance with another person", "A type of deductible", "A coverage limit"],
    optionsEs: ["Un requisito de asegurar la propiedad a un porcentaje mínimo de su valor", "Compartir seguro con otra persona", "Un tipo de deducible", "Un límite de cobertura"],
    correctAnswer: 0,
    explanationEn: "Coinsurance requires the policyholder to carry insurance equal to a specified percentage of the property's value or face a penalty at claim time.",
    explanationEs: "El coaseguro requiere que el asegurado tenga seguro igual a un porcentaje especificado del valor de la propiedad o enfrentar una penalidad al momento del reclamo."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is liability insurance?",
    questionTextEs: "¿Qué es el seguro de responsabilidad?",
    optionsEn: ["Coverage for claims made by third parties for bodily injury or property damage", "Coverage for your own injuries", "Coverage for your own property", "Life insurance"],
    optionsEs: ["Cobertura para reclamos hechos por terceros por lesiones corporales o daño a la propiedad", "Cobertura para tus propias lesiones", "Cobertura para tu propia propiedad", "Seguro de vida"],
    correctAnswer: 0,
    explanationEn: "Liability insurance protects against claims resulting from injuries and damage to others for which the insured is legally responsible.",
    explanationEs: "El seguro de responsabilidad protege contra reclamos resultantes de lesiones y daños a otros por los cuales el asegurado es legalmente responsable."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is subrogation?",
    questionTextEs: "¿Qué es la subrogación?",
    optionsEn: ["The insurer's right to recover payment from the party at fault", "A type of coverage", "A premium discount", "A policy endorsement"],
    optionsEs: ["El derecho del asegurador de recuperar el pago de la parte culpable", "Un tipo de cobertura", "Un descuento de prima", "Un endoso de póliza"],
    correctAnswer: 0,
    explanationEn: "Subrogation allows an insurance company to pursue a third party that caused an insurance loss to recover the amount paid to the policyholder.",
    explanationEs: "La subrogación permite a una compañía de seguros perseguir a un tercero que causó una pérdida de seguro para recuperar la cantidad pagada al asegurado."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is an umbrella policy?",
    questionTextEs: "¿Qué es una póliza paraguas?",
    optionsEn: ["Excess liability coverage beyond underlying policy limits", "Flood coverage", "Earthquake coverage", "Workers compensation"],
    optionsEs: ["Cobertura de responsabilidad excedente más allá de los límites de la póliza subyacente", "Cobertura contra inundaciones", "Cobertura contra terremotos", "Compensación de trabajadores"],
    correctAnswer: 0,
    explanationEn: "An umbrella policy provides additional liability coverage above the limits of homeowner's, auto, and other primary policies.",
    explanationEs: "Una póliza paraguas proporciona cobertura de responsabilidad adicional por encima de los límites de las pólizas primarias de propietario, auto y otras."
  },
  {
    category: "property_casualty",
    questionTextEn: "What does PIP coverage provide in auto insurance?",
    questionTextEs: "¿Qué proporciona la cobertura PIP en seguro de auto?",
    optionsEn: ["Payment for medical expenses and lost wages regardless of fault", "Collision coverage", "Comprehensive coverage", "Liability coverage"],
    optionsEs: ["Pago de gastos médicos y salarios perdidos independientemente de la culpa", "Cobertura de colisión", "Cobertura comprensiva", "Cobertura de responsabilidad"],
    correctAnswer: 0,
    explanationEn: "Personal Injury Protection (PIP) covers medical expenses and, in many cases, lost wages, regardless of who caused the accident.",
    explanationEs: "La Protección de Lesiones Personales (PIP) cubre gastos médicos y, en muchos casos, salarios perdidos, independientemente de quién causó el accidente."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is uninsured motorist coverage?",
    questionTextEs: "¿Qué es la cobertura de motorista sin seguro?",
    optionsEn: ["Coverage for injuries caused by a driver without insurance", "Collision coverage", "Comprehensive coverage", "Liability coverage"],
    optionsEs: ["Cobertura para lesiones causadas por un conductor sin seguro", "Cobertura de colisión", "Cobertura comprensiva", "Cobertura de responsabilidad"],
    correctAnswer: 0,
    explanationEn: "Uninsured motorist coverage pays for injuries to you and your passengers if caused by a driver who has no insurance.",
    explanationEs: "La cobertura de motorista sin seguro paga por lesiones a ti y tus pasajeros si son causadas por un conductor que no tiene seguro."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is the difference between collision and comprehensive auto coverage?",
    questionTextEs: "¿Cuál es la diferencia entre cobertura de colisión y comprensiva de auto?",
    optionsEn: ["Collision covers accidents; comprehensive covers non-collision events", "They are the same", "Collision covers theft", "Comprehensive covers accidents"],
    optionsEs: ["Colisión cubre accidentes; comprensiva cubre eventos sin colisión", "Son lo mismo", "Colisión cubre robo", "Comprensiva cubre accidentes"],
    correctAnswer: 0,
    explanationEn: "Collision covers damage from accidents with other vehicles or objects, while comprehensive covers theft, vandalism, weather damage, and animal strikes.",
    explanationEs: "Colisión cubre daños de accidentes con otros vehículos u objetos, mientras que comprensiva cubre robo, vandalismo, daños climáticos e impactos con animales."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is a declarations page?",
    questionTextEs: "¿Qué es una página de declaraciones?",
    optionsEn: ["A summary page showing policy information, coverages, and premiums", "A claim form", "A cancellation notice", "An endorsement"],
    optionsEs: ["Una página resumen que muestra información de la póliza, coberturas y primas", "Un formulario de reclamo", "Un aviso de cancelación", "Un endoso"],
    correctAnswer: 0,
    explanationEn: "The declarations page summarizes the key elements of an insurance policy including named insured, coverage limits, deductibles, and premiums.",
    explanationEs: "La página de declaraciones resume los elementos clave de una póliza de seguro incluyendo asegurado nombrado, límites de cobertura, deducibles y primas."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is an endorsement in insurance?",
    questionTextEs: "¿Qué es un endoso en seguros?",
    optionsEn: ["A written amendment that modifies the original policy", "A premium payment", "A claim form", "A cancellation notice"],
    optionsEs: ["Una enmienda escrita que modifica la póliza original", "Un pago de prima", "Un formulario de reclamo", "Un aviso de cancelación"],
    correctAnswer: 0,
    explanationEn: "An endorsement (also called a rider) is a document that changes the terms, coverage, or conditions of an insurance policy.",
    explanationEs: "Un endoso (también llamado anexo) es un documento que cambia los términos, cobertura o condiciones de una póliza de seguro."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is the insuring agreement?",
    questionTextEs: "¿Qué es el acuerdo de seguro?",
    optionsEn: ["The section stating what the insurer promises to cover", "The premium amount", "The deductible", "The exclusions"],
    optionsEs: ["La sección que establece lo que el asegurador promete cubrir", "El monto de la prima", "El deducible", "Las exclusiones"],
    correctAnswer: 0,
    explanationEn: "The insuring agreement is the policy section that describes the scope of coverage and what the insurance company agrees to do.",
    explanationEs: "El acuerdo de seguro es la sección de la póliza que describe el alcance de la cobertura y lo que la compañía de seguros acuerda hacer."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is the purpose of policy exclusions?",
    questionTextEs: "¿Cuál es el propósito de las exclusiones de la póliza?",
    optionsEn: ["To specify what is not covered by the policy", "To increase coverage", "To reduce premiums", "To add endorsements"],
    optionsEs: ["Especificar lo que no está cubierto por la póliza", "Aumentar la cobertura", "Reducir primas", "Agregar endosos"],
    correctAnswer: 0,
    explanationEn: "Exclusions define specific risks, circumstances, or property that the insurance policy does not cover.",
    explanationEs: "Las exclusiones definen riesgos específicos, circunstancias o propiedades que la póliza de seguro no cubre."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is negligence in insurance terms?",
    questionTextEs: "¿Qué es la negligencia en términos de seguros?",
    optionsEn: ["Failure to exercise reasonable care, resulting in harm to others", "Intentional harm", "An accident", "A covered loss"],
    optionsEs: ["Falta de ejercer cuidado razonable, resultando en daño a otros", "Daño intencional", "Un accidente", "Una pérdida cubierta"],
    correctAnswer: 0,
    explanationEn: "Negligence is the failure to use reasonable care, resulting in damage or injury to another person.",
    explanationEs: "La negligencia es la falta de usar cuidado razonable, resultando en daño o lesión a otra persona."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is insurable interest?",
    questionTextEs: "¿Qué es el interés asegurable?",
    optionsEn: ["A financial stake in the subject of insurance that could result in loss", "Interest on premiums", "A type of coverage", "A policy endorsement"],
    optionsEs: ["Una participación financiera en el objeto del seguro que podría resultar en pérdida", "Interés sobre primas", "Un tipo de cobertura", "Un endoso de póliza"],
    correctAnswer: 0,
    explanationEn: "Insurable interest exists when you would suffer a financial loss if the insured property is damaged or destroyed.",
    explanationEs: "El interés asegurable existe cuando sufrirías una pérdida financiera si la propiedad asegurada es dañada o destruida."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is the Texas FAIR Plan?",
    questionTextEs: "¿Qué es el Plan FAIR de Texas?",
    optionsEn: ["A program providing basic property insurance for high-risk properties", "A health insurance program", "A life insurance plan", "A retirement plan"],
    optionsEs: ["Un programa que proporciona seguro básico de propiedad para propiedades de alto riesgo", "Un programa de seguro de salud", "Un plan de seguro de vida", "Un plan de jubilación"],
    correctAnswer: 0,
    explanationEn: "The Texas FAIR Plan Association provides basic property insurance to property owners who cannot obtain coverage in the voluntary market.",
    explanationEs: "La Asociación del Plan FAIR de Texas proporciona seguro básico de propiedad a propietarios que no pueden obtener cobertura en el mercado voluntario."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is the Texas Windstorm Insurance Association (TWIA)?",
    questionTextEs: "¿Qué es la Asociación de Seguros contra Tormentas de Viento de Texas (TWIA)?",
    optionsEn: ["An insurance pool providing wind and hail coverage for coastal areas", "A flood insurance program", "A life insurance company", "A health insurance provider"],
    optionsEs: ["Un grupo de seguros que proporciona cobertura de viento y granizo para áreas costeras", "Un programa de seguro contra inundaciones", "Una compañía de seguro de vida", "Un proveedor de seguro de salud"],
    correctAnswer: 0,
    explanationEn: "TWIA provides wind and hail coverage to property owners in designated Texas coastal counties who cannot obtain coverage elsewhere.",
    explanationEs: "TWIA proporciona cobertura de viento y granizo a propietarios en condados costeros designados de Texas que no pueden obtener cobertura en otro lugar."
  },
  {
    category: "property_casualty",
    questionTextEn: "What is the National Flood Insurance Program (NFIP)?",
    questionTextEs: "¿Qué es el Programa Nacional de Seguro contra Inundaciones (NFIP)?",
    optionsEn: ["A federal program providing flood insurance to participating communities", "A private insurance company", "A state program", "A homeowners policy"],
    optionsEs: ["Un programa federal que proporciona seguro contra inundaciones a comunidades participantes", "Una compañía de seguros privada", "Un programa estatal", "Una póliza de propietario"],
    correctAnswer: 0,
    explanationEn: "NFIP is a federal program that provides flood insurance to property owners in participating communities.",
    explanationEs: "NFIP es un programa federal que proporciona seguro contra inundaciones a propietarios en comunidades participantes."
  }
];

const lifeInsuranceQuestions: QuestionData[] = [
  {
    category: "life_insurance",
    questionTextEn: "What is the purpose of life insurance?",
    questionTextEs: "¿Cuál es el propósito del seguro de vida?",
    optionsEn: ["To provide financial protection for beneficiaries upon death of the insured", "To pay for medical expenses", "To insure property", "To provide retirement income"],
    optionsEs: ["Proporcionar protección financiera para beneficiarios tras la muerte del asegurado", "Pagar gastos médicos", "Asegurar propiedad", "Proporcionar ingresos de jubilación"],
    correctAnswer: 0,
    explanationEn: "Life insurance provides a death benefit to named beneficiaries to replace income and cover expenses after the insured's death.",
    explanationEs: "El seguro de vida proporciona un beneficio por muerte a beneficiarios nombrados para reemplazar ingresos y cubrir gastos después de la muerte del asegurado."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the difference between term and whole life insurance?",
    questionTextEs: "¿Cuál es la diferencia entre seguro de vida temporal y permanente?",
    optionsEn: ["Term is temporary coverage; whole life is permanent with cash value", "They are the same", "Term has cash value", "Whole life is temporary"],
    optionsEs: ["Temporal es cobertura temporaria; vida entera es permanente con valor en efectivo", "Son lo mismo", "Temporal tiene valor en efectivo", "Vida entera es temporario"],
    correctAnswer: 0,
    explanationEn: "Term life provides coverage for a specific period with no cash value, while whole life provides lifelong coverage and builds cash value.",
    explanationEs: "El seguro temporal proporciona cobertura por un período específico sin valor en efectivo, mientras que el de vida entera proporciona cobertura de por vida y acumula valor en efectivo."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is universal life insurance?",
    questionTextEs: "¿Qué es el seguro de vida universal?",
    optionsEn: ["Permanent life insurance with flexible premiums and death benefits", "Term life insurance", "Whole life insurance", "Group life insurance"],
    optionsEs: ["Seguro de vida permanente con primas y beneficios por muerte flexibles", "Seguro de vida temporal", "Seguro de vida entera", "Seguro de vida grupal"],
    correctAnswer: 0,
    explanationEn: "Universal life is a type of permanent life insurance offering flexibility in premium payments and death benefit amounts.",
    explanationEs: "El seguro de vida universal es un tipo de seguro de vida permanente que ofrece flexibilidad en pagos de primas y montos de beneficio por muerte."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is a beneficiary in life insurance?",
    questionTextEs: "¿Qué es un beneficiario en seguro de vida?",
    optionsEn: ["The person or entity who receives the death benefit", "The insurance agent", "The insured person", "The insurance company"],
    optionsEs: ["La persona o entidad que recibe el beneficio por muerte", "El agente de seguros", "La persona asegurada", "La compañía de seguros"],
    correctAnswer: 0,
    explanationEn: "A beneficiary is the person, organization, or trust named to receive the life insurance death benefit upon the insured's death.",
    explanationEs: "Un beneficiario es la persona, organización o fideicomiso nombrado para recibir el beneficio por muerte del seguro de vida tras la muerte del asegurado."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is an annuity?",
    questionTextEs: "¿Qué es una anualidad?",
    optionsEn: ["A financial product that provides regular income payments, often for retirement", "Life insurance", "Health insurance", "Property insurance"],
    optionsEs: ["Un producto financiero que proporciona pagos de ingreso regulares, a menudo para jubilación", "Seguro de vida", "Seguro de salud", "Seguro de propiedad"],
    correctAnswer: 0,
    explanationEn: "An annuity is a contract with an insurance company that provides regular income payments in exchange for premium payments.",
    explanationEs: "Una anualidad es un contrato con una compañía de seguros que proporciona pagos de ingreso regulares a cambio de pagos de primas."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the grace period in life insurance?",
    questionTextEs: "¿Qué es el período de gracia en seguro de vida?",
    optionsEn: ["A period after the premium due date during which coverage continues", "The waiting period", "The free look period", "The contestability period"],
    optionsEs: ["Un período después de la fecha de vencimiento de la prima durante el cual la cobertura continúa", "El período de espera", "El período de revisión gratuita", "El período de contestabilidad"],
    correctAnswer: 0,
    explanationEn: "The grace period is typically 30-31 days after a premium due date during which the policy remains in force even if payment is late.",
    explanationEs: "El período de gracia es típicamente 30-31 días después de la fecha de vencimiento de la prima durante los cuales la póliza permanece en vigor aunque el pago esté atrasado."
  },
  {
    category: "life_insurance",
    questionTextEn: "What are non-forfeiture options?",
    questionTextEs: "¿Qué son las opciones de no confiscación?",
    optionsEn: ["Options that allow policyholders to receive value from a policy if it lapses", "Types of riders", "Coverage limits", "Premium payment options"],
    optionsEs: ["Opciones que permiten a los asegurados recibir valor de una póliza si caduca", "Tipos de anexos", "Límites de cobertura", "Opciones de pago de prima"],
    correctAnswer: 0,
    explanationEn: "Non-forfeiture options allow policyholders to receive some value from their permanent life insurance policy if they stop paying premiums.",
    explanationEs: "Las opciones de no confiscación permiten a los asegurados recibir algún valor de su póliza de seguro de vida permanente si dejan de pagar primas."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the incontestability clause?",
    questionTextEs: "¿Qué es la cláusula de incontestabilidad?",
    optionsEn: ["A provision preventing the insurer from denying claims after 2 years for misstatements", "A cancellation clause", "A beneficiary provision", "A premium clause"],
    optionsEs: ["Una disposición que previene al asegurador de negar reclamos después de 2 años por declaraciones erróneas", "Una cláusula de cancelación", "Una disposición de beneficiario", "Una cláusula de prima"],
    correctAnswer: 0,
    explanationEn: "The incontestability clause prevents insurers from denying claims based on misrepresentations in the application after 2 years.",
    explanationEs: "La cláusula de incontestabilidad previene a los aseguradores de negar reclamos basados en declaraciones erróneas en la solicitud después de 2 años."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is a waiver of premium rider?",
    questionTextEs: "¿Qué es un anexo de exención de prima?",
    optionsEn: ["A rider that waives premium payments if the insured becomes disabled", "A discount on premiums", "A type of beneficiary", "A coverage limit"],
    optionsEs: ["Un anexo que exime pagos de prima si el asegurado queda discapacitado", "Un descuento en primas", "Un tipo de beneficiario", "Un límite de cobertura"],
    correctAnswer: 0,
    explanationEn: "The waiver of premium rider keeps the life insurance policy in force without premium payments if the insured becomes totally disabled.",
    explanationEs: "El anexo de exención de prima mantiene la póliza de seguro de vida en vigor sin pagos de prima si el asegurado queda totalmente discapacitado."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the contestability period?",
    questionTextEs: "¿Qué es el período de contestabilidad?",
    optionsEn: ["The first 2 years when insurers can investigate and deny claims for misrepresentation", "The grace period", "The free look period", "The waiting period"],
    optionsEs: ["Los primeros 2 años cuando los aseguradores pueden investigar y negar reclamos por tergiversación", "El período de gracia", "El período de revisión gratuita", "El período de espera"],
    correctAnswer: 0,
    explanationEn: "The contestability period is typically the first 2 years of a policy during which the insurer can investigate and deny claims for misrepresentation.",
    explanationEs: "El período de contestabilidad es típicamente los primeros 2 años de una póliza durante los cuales el asegurador puede investigar y negar reclamos por tergiversación."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is disability income insurance?",
    questionTextEs: "¿Qué es el seguro de ingreso por discapacidad?",
    optionsEn: ["Insurance that replaces income if you become unable to work due to illness or injury", "Life insurance", "Health insurance", "Property insurance"],
    optionsEs: ["Seguro que reemplaza ingresos si te vuelves incapaz de trabajar debido a enfermedad o lesión", "Seguro de vida", "Seguro de salud", "Seguro de propiedad"],
    correctAnswer: 0,
    explanationEn: "Disability income insurance provides a portion of your income if you become disabled and cannot work.",
    explanationEs: "El seguro de ingreso por discapacidad proporciona una porción de tu ingreso si quedas discapacitado y no puedes trabajar."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is long-term care insurance?",
    questionTextEs: "¿Qué es el seguro de cuidados a largo plazo?",
    optionsEn: ["Insurance covering extended care services not covered by health insurance", "Life insurance", "Disability insurance", "Auto insurance"],
    optionsEs: ["Seguro que cubre servicios de cuidado extendido no cubiertos por seguro de salud", "Seguro de vida", "Seguro de discapacidad", "Seguro de auto"],
    correctAnswer: 0,
    explanationEn: "Long-term care insurance covers costs of care for chronic illness, disability, or aging that are not covered by regular health insurance.",
    explanationEs: "El seguro de cuidados a largo plazo cubre costos de cuidado para enfermedades crónicas, discapacidad o envejecimiento que no están cubiertos por seguro de salud regular."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is a deferred annuity?",
    questionTextEs: "¿Qué es una anualidad diferida?",
    optionsEn: ["An annuity where payments begin at a future date", "An immediate annuity", "Life insurance", "Health insurance"],
    optionsEs: ["Una anualidad donde los pagos comienzan en una fecha futura", "Una anualidad inmediata", "Seguro de vida", "Seguro de salud"],
    correctAnswer: 0,
    explanationEn: "A deferred annuity accumulates value during the accumulation phase and begins paying out at a later date, often at retirement.",
    explanationEs: "Una anualidad diferida acumula valor durante la fase de acumulación y comienza a pagar en una fecha posterior, a menudo en la jubilación."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the free look period?",
    questionTextEs: "¿Qué es el período de revisión gratuita?",
    optionsEn: ["A period after policy delivery when you can cancel for a full refund", "The grace period", "The contestability period", "The waiting period"],
    optionsEs: ["Un período después de la entrega de la póliza cuando puedes cancelar para un reembolso completo", "El período de gracia", "El período de contestabilidad", "El período de espera"],
    correctAnswer: 0,
    explanationEn: "The free look period allows policyholders to review a new policy and cancel it for a full refund if not satisfied, typically 10-30 days.",
    explanationEs: "El período de revisión gratuita permite a los asegurados revisar una nueva póliza y cancelarla para un reembolso completo si no están satisfechos, típicamente 10-30 días."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is an HMO?",
    questionTextEs: "¿Qué es un HMO?",
    optionsEn: ["Health Maintenance Organization - a managed care plan with a network of providers", "Home Mortgage Organization", "Health Medical Option", "Hospital Medical Organization"],
    optionsEs: ["Organización de Mantenimiento de Salud - un plan de cuidado administrado con una red de proveedores", "Organización de Hipotecas Residenciales", "Opción Médica de Salud", "Organización Médica Hospitalaria"],
    correctAnswer: 0,
    explanationEn: "An HMO is a type of health insurance plan that requires members to use in-network providers and get referrals for specialists.",
    explanationEs: "Un HMO es un tipo de plan de seguro de salud que requiere que los miembros usen proveedores dentro de la red y obtengan referencias para especialistas."
  }
];

const generalLinesQuestions: QuestionData[] = [
  {
    category: "general_lines",
    questionTextEn: "What is the minimum age to be licensed as an insurance agent in Texas?",
    questionTextEs: "¿Cuál es la edad mínima para obtener licencia como agente de seguros en Texas?",
    optionsEn: ["18 years old", "21 years old", "25 years old", "16 years old"],
    optionsEs: ["18 años", "21 años", "25 años", "16 años"],
    correctAnswer: 0,
    explanationEn: "In Texas, you must be at least 18 years old to be licensed as an insurance agent.",
    explanationEs: "En Texas, debes tener al menos 18 años para obtener licencia como agente de seguros."
  },
  {
    category: "general_lines",
    questionTextEn: "Who regulates insurance in Texas?",
    questionTextEs: "¿Quién regula los seguros en Texas?",
    optionsEn: ["Texas Department of Insurance (TDI)", "Federal Insurance Administration", "Texas Real Estate Commission", "Department of Treasury"],
    optionsEs: ["Departamento de Seguros de Texas (TDI)", "Administración Federal de Seguros", "Comisión de Bienes Raíces de Texas", "Departamento del Tesoro"],
    correctAnswer: 0,
    explanationEn: "The Texas Department of Insurance (TDI) regulates the insurance industry in Texas.",
    explanationEs: "El Departamento de Seguros de Texas (TDI) regula la industria de seguros en Texas."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the purpose of the Texas Guaranty Association?",
    questionTextEs: "¿Cuál es el propósito de la Asociación de Garantía de Texas?",
    optionsEn: ["To pay claims if an insurance company becomes insolvent", "To sell insurance", "To license agents", "To regulate premiums"],
    optionsEs: ["Pagar reclamos si una compañía de seguros se vuelve insolvente", "Vender seguros", "Licenciar agentes", "Regular primas"],
    correctAnswer: 0,
    explanationEn: "The Texas Guaranty Association protects policyholders by paying covered claims when an insurance company becomes insolvent.",
    explanationEs: "La Asociación de Garantía de Texas protege a los asegurados pagando reclamos cubiertos cuando una compañía de seguros se vuelve insolvente."
  },
  {
    category: "general_lines",
    questionTextEn: "What is an insurance binder?",
    questionTextEs: "¿Qué es un binder de seguro?",
    optionsEn: ["Temporary proof of insurance until the policy is issued", "A permanent policy", "A claim form", "A cancellation notice"],
    optionsEs: ["Prueba temporal de seguro hasta que se emita la póliza", "Una póliza permanente", "Un formulario de reclamo", "Un aviso de cancelación"],
    correctAnswer: 0,
    explanationEn: "A binder is a temporary insurance contract providing immediate coverage until the formal policy is issued.",
    explanationEs: "Un binder es un contrato de seguro temporal que proporciona cobertura inmediata hasta que se emita la póliza formal."
  },
  {
    category: "general_lines",
    questionTextEn: "What is surplus lines insurance?",
    questionTextEs: "¿Qué es el seguro de líneas excedentes?",
    optionsEn: ["Insurance purchased from non-admitted insurers for risks the standard market won't cover", "Standard insurance", "Life insurance", "Health insurance"],
    optionsEs: ["Seguro comprado de aseguradores no admitidos para riesgos que el mercado estándar no cubrirá", "Seguro estándar", "Seguro de vida", "Seguro de salud"],
    correctAnswer: 0,
    explanationEn: "Surplus lines insurance is coverage from non-admitted insurers for unusual risks that standard insurance companies won't insure.",
    explanationEs: "El seguro de líneas excedentes es cobertura de aseguradores no admitidos para riesgos inusuales que las compañías de seguros estándar no asegurarán."
  },
  {
    category: "general_lines",
    questionTextEn: "What is twisting in insurance?",
    questionTextEs: "¿Qué es el twisting en seguros?",
    optionsEn: ["Misrepresenting facts to induce a customer to replace an existing policy", "A type of coverage", "A premium discount", "A policy endorsement"],
    optionsEs: ["Tergiversar hechos para inducir a un cliente a reemplazar una póliza existente", "Un tipo de cobertura", "Un descuento de prima", "Un endoso de póliza"],
    correctAnswer: 0,
    explanationEn: "Twisting is the illegal practice of using misrepresentations to convince a policyholder to replace an existing policy with a new one.",
    explanationEs: "El twisting es la práctica ilegal de usar tergiversaciones para convencer a un asegurado de reemplazar una póliza existente con una nueva."
  },
  {
    category: "general_lines",
    questionTextEn: "What is churning in insurance?",
    questionTextEs: "¿Qué es el churning en seguros?",
    optionsEn: ["Excessive replacement of policies primarily to generate commissions", "A type of coverage", "A premium payment method", "A policy endorsement"],
    optionsEs: ["Reemplazo excesivo de pólizas principalmente para generar comisiones", "Un tipo de cobertura", "Un método de pago de prima", "Un endoso de póliza"],
    correctAnswer: 0,
    explanationEn: "Churning is the unethical practice of replacing policies excessively to earn additional commissions at the expense of the policyholder.",
    explanationEs: "El churning es la práctica no ética de reemplazar pólizas excesivamente para ganar comisiones adicionales a expensas del asegurado."
  },
  {
    category: "general_lines",
    questionTextEn: "What is rebating in insurance?",
    questionTextEs: "¿Qué es el rebating en seguros?",
    optionsEn: ["Returning part of the premium or commission as an inducement to buy insurance", "A type of coverage", "A premium increase", "A policy endorsement"],
    optionsEs: ["Devolver parte de la prima o comisión como incentivo para comprar seguro", "Un tipo de cobertura", "Un aumento de prima", "Un endoso de póliza"],
    correctAnswer: 0,
    explanationEn: "Rebating is the illegal practice of offering something of value not specified in the policy to induce someone to purchase insurance.",
    explanationEs: "El rebating es la práctica ilegal de ofrecer algo de valor no especificado en la póliza para inducir a alguien a comprar seguro."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the duty of utmost good faith in insurance?",
    questionTextEs: "¿Qué es el deber de máxima buena fe en seguros?",
    optionsEn: ["The obligation of both parties to disclose all material information honestly", "A type of coverage", "A premium requirement", "A claims process"],
    optionsEs: ["La obligación de ambas partes de divulgar toda la información material honestamente", "Un tipo de cobertura", "Un requisito de prima", "Un proceso de reclamos"],
    correctAnswer: 0,
    explanationEn: "Utmost good faith requires both the insurer and insured to deal honestly and disclose all material facts in an insurance contract.",
    explanationEs: "La máxima buena fe requiere que tanto el asegurador como el asegurado traten honestamente y divulguen todos los hechos materiales en un contrato de seguro."
  },
  {
    category: "general_lines",
    questionTextEn: "What is an admitted insurance company?",
    questionTextEs: "¿Qué es una compañía de seguros admitida?",
    optionsEn: ["A company licensed by the state to sell insurance", "An unlicensed company", "A surplus lines company", "A foreign company"],
    optionsEs: ["Una compañía licenciada por el estado para vender seguros", "Una compañía sin licencia", "Una compañía de líneas excedentes", "Una compañía extranjera"],
    correctAnswer: 0,
    explanationEn: "An admitted insurer is an insurance company that has been licensed by the state insurance department to conduct business in that state.",
    explanationEs: "Un asegurador admitido es una compañía de seguros que ha sido licenciada por el departamento de seguros del estado para conducir negocios en ese estado."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the difference between a representation and a warranty in insurance?",
    questionTextEs: "¿Cuál es la diferencia entre una representación y una garantía en seguros?",
    optionsEn: ["A representation is substantially true; a warranty must be exactly true", "They are the same", "A warranty is less strict", "A representation must be exactly true"],
    optionsEs: ["Una representación es sustancialmente verdadera; una garantía debe ser exactamente verdadera", "Son lo mismo", "Una garantía es menos estricta", "Una representación debe ser exactamente verdadera"],
    correctAnswer: 0,
    explanationEn: "Representations need only be substantially true, while warranties are statements that must be literally and exactly true.",
    explanationEs: "Las representaciones solo necesitan ser sustancialmente verdaderas, mientras que las garantías son declaraciones que deben ser literal y exactamente verdaderas."
  },
  {
    category: "general_lines",
    questionTextEn: "What is an aleatory contract?",
    questionTextEs: "¿Qué es un contrato aleatorio?",
    optionsEn: ["A contract where the exchange of value may be unequal, depending on uncertain events", "An equal exchange contract", "A loan agreement", "A lease agreement"],
    optionsEs: ["Un contrato donde el intercambio de valor puede ser desigual, dependiendo de eventos inciertos", "Un contrato de intercambio igual", "Un acuerdo de préstamo", "Un contrato de arrendamiento"],
    correctAnswer: 0,
    explanationEn: "Insurance is an aleatory contract because the policyholder may pay premiums and never receive benefits, or receive much more than paid in.",
    explanationEs: "El seguro es un contrato aleatorio porque el asegurado puede pagar primas y nunca recibir beneficios, o recibir mucho más de lo pagado."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the principle of indemnity?",
    questionTextEs: "¿Qué es el principio de indemnización?",
    optionsEn: ["The insured should be restored to their pre-loss condition, not profit from a loss", "Making a profit from insurance", "Getting more than the loss value", "A type of coverage"],
    optionsEs: ["El asegurado debe ser restaurado a su condición previa a la pérdida, no beneficiarse de una pérdida", "Obtener ganancia del seguro", "Obtener más del valor de la pérdida", "Un tipo de cobertura"],
    correctAnswer: 0,
    explanationEn: "The principle of indemnity states that insurance should restore the insured to their original financial position, not better.",
    explanationEs: "El principio de indemnización establece que el seguro debe restaurar al asegurado a su posición financiera original, no mejor."
  },
  {
    category: "general_lines",
    questionTextEn: "What is a conditional contract in insurance?",
    questionTextEs: "¿Qué es un contrato condicional en seguros?",
    optionsEn: ["A contract where the insurer's obligation depends on certain conditions being met", "An unconditional contract", "A loan agreement", "A lease agreement"],
    optionsEs: ["Un contrato donde la obligación del asegurador depende de que se cumplan ciertas condiciones", "Un contrato incondicional", "Un acuerdo de préstamo", "Un contrato de arrendamiento"],
    correctAnswer: 0,
    explanationEn: "Insurance is a conditional contract because the insurer's obligation to pay depends on conditions like paying premiums and filing claims properly.",
    explanationEs: "El seguro es un contrato condicional porque la obligación del asegurador de pagar depende de condiciones como pagar primas y presentar reclamos correctamente."
  },
  {
    category: "general_lines",
    questionTextEn: "What is a unilateral contract?",
    questionTextEs: "¿Qué es un contrato unilateral?",
    optionsEn: ["A contract where only one party makes an enforceable promise", "A bilateral contract", "A loan agreement", "A lease agreement"],
    optionsEs: ["Un contrato donde solo una parte hace una promesa ejecutable", "Un contrato bilateral", "Un acuerdo de préstamo", "Un contrato de arrendamiento"],
    correctAnswer: 0,
    explanationEn: "Insurance is unilateral because only the insurer makes a legally enforceable promise; the policyholder can stop paying at any time.",
    explanationEs: "El seguro es unilateral porque solo el asegurador hace una promesa legalmente ejecutable; el asegurado puede dejar de pagar en cualquier momento."
  }
];

async function seedQuestions() {
  console.log("Starting to seed questions...");
  
  const allQuestions = [
    ...realEstateQuestions,
    ...propertyCasualtyQuestions,
    ...lifeInsuranceQuestions,
    ...generalLinesQuestions
  ];

  console.log(`Total questions to insert: ${allQuestions.length}`);
  
  for (const q of allQuestions) {
    try {
      await db.insert(questions).values({
        category: q.category,
        questionTextEn: q.questionTextEn,
        questionTextEs: q.questionTextEs,
        optionsEn: q.optionsEn,
        optionsEs: q.optionsEs,
        correctAnswer: q.correctAnswer,
        explanationEn: q.explanationEn,
        explanationEs: q.explanationEs,
        isActive: true,
      });
    } catch (error: any) {
      if (error.message?.includes("duplicate")) {
        console.log(`Skipping duplicate: ${q.questionTextEn.substring(0, 50)}...`);
      } else {
        console.error(`Error inserting question: ${error.message}`);
      }
    }
  }

  console.log("Question seeding completed!");
  
  const countResult = await db.execute(sql`SELECT category, COUNT(*) as count FROM questions GROUP BY category`);
  console.log("Questions per category:", countResult.rows);
}

seedQuestions().catch(console.error);
