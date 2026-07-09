import { db } from "./db";
import { questions, type InsertQuestion } from "@shared/schema";

const generalLinesQuestions: InsertQuestion[] = [
  {
    category: "general_lines",
    questionTextEn: "What is General Lines insurance in Texas?",
    questionTextEs: "¿Qué es el seguro de Líneas Generales en Texas?",
    optionsEn: ["Only life insurance", "Property, casualty, surety, and related coverages", "Only health insurance", "Only auto insurance"],
    optionsEs: ["Solo seguro de vida", "Propiedad, accidentes, fianzas y coberturas relacionadas", "Solo seguro de salud", "Solo seguro de auto"],
    correctAnswer: 1,
    explanationEn: "General Lines insurance in Texas includes property, casualty, surety bonds, and related lines of coverage.",
    explanationEs: "El seguro de Líneas Generales en Texas incluye propiedad, accidentes, fianzas y líneas de cobertura relacionadas."
  },
  {
    category: "general_lines",
    questionTextEn: "What does a Commercial General Liability (CGL) policy primarily cover?",
    questionTextEs: "¿Qué cubre principalmente una póliza de Responsabilidad General Comercial (CGL)?",
    optionsEn: ["Employee injuries", "Third-party bodily injury and property damage claims", "Auto accidents", "Professional errors"],
    optionsEs: ["Lesiones de empleados", "Reclamos de lesiones corporales y daños a la propiedad de terceros", "Accidentes de auto", "Errores profesionales"],
    correctAnswer: 1,
    explanationEn: "A CGL policy provides coverage for third-party claims of bodily injury, property damage, and personal/advertising injury.",
    explanationEs: "Una póliza CGL proporciona cobertura para reclamos de terceros por lesiones corporales, daños a la propiedad y lesiones personales/publicitarias."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the purpose of a surety bond?",
    questionTextEs: "¿Cuál es el propósito de una fianza?",
    optionsEn: ["To provide life insurance", "To guarantee performance or payment of an obligation", "To cover auto accidents", "To pay medical bills"],
    optionsEs: ["Proporcionar seguro de vida", "Garantizar el cumplimiento o pago de una obligación", "Cubrir accidentes de auto", "Pagar facturas médicas"],
    correctAnswer: 1,
    explanationEn: "A surety bond is a three-party agreement that guarantees the principal will fulfill an obligation to the obligee.",
    explanationEs: "Una fianza es un acuerdo de tres partes que garantiza que el principal cumplirá una obligación con el obligado."
  },
  {
    category: "general_lines",
    questionTextEn: "What are the three parties to a surety bond?",
    questionTextEs: "¿Cuáles son las tres partes de una fianza?",
    optionsEn: ["Insurer, insured, beneficiary", "Principal, obligee, surety", "Policyholder, agent, company", "Buyer, seller, bank"],
    optionsEs: ["Asegurador, asegurado, beneficiario", "Principal, obligado, fiador", "Titular de póliza, agente, compañía", "Comprador, vendedor, banco"],
    correctAnswer: 1,
    explanationEn: "The three parties are the principal (who has the obligation), the obligee (who receives the guarantee), and the surety (who provides the bond).",
    explanationEs: "Las tres partes son el principal (quien tiene la obligación), el obligado (quien recibe la garantía) y el fiador (quien proporciona la fianza)."
  },
  {
    category: "general_lines",
    questionTextEn: "What is a fidelity bond used for?",
    questionTextEs: "¿Para qué se utiliza una fianza de fidelidad?",
    optionsEn: ["To cover property damage", "To protect against employee dishonesty", "To guarantee construction completion", "To provide auto coverage"],
    optionsEs: ["Cubrir daños a la propiedad", "Proteger contra la deshonestidad de empleados", "Garantizar la finalización de construcción", "Proporcionar cobertura de auto"],
    correctAnswer: 1,
    explanationEn: "A fidelity bond protects an employer against losses caused by dishonest acts of employees, such as theft or fraud.",
    explanationEs: "Una fianza de fidelidad protege a un empleador contra pérdidas causadas por actos deshonestos de empleados, como robo o fraude."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the difference between occurrence and claims-made coverage?",
    questionTextEs: "¿Cuál es la diferencia entre la cobertura por ocurrencia y la cobertura por reclamos hechos?",
    optionsEn: ["No difference", "Occurrence covers events during policy period; claims-made covers claims filed during policy period", "Claims-made is always more expensive", "Occurrence only covers property"],
    optionsEs: ["Sin diferencia", "Ocurrencia cubre eventos durante el período de la póliza; reclamos hechos cubre reclamos presentados durante el período de la póliza", "Reclamos hechos siempre es más caro", "Ocurrencia solo cubre propiedad"],
    correctAnswer: 1,
    explanationEn: "Occurrence coverage covers incidents that occur during the policy period regardless of when claims are filed, while claims-made covers claims filed during the policy period.",
    explanationEs: "La cobertura por ocurrencia cubre incidentes que ocurren durante el período de la póliza sin importar cuándo se presenten los reclamos, mientras que reclamos hechos cubre reclamos presentados durante el período de la póliza."
  },
  {
    category: "general_lines",
    questionTextEn: "What is an endorsement in insurance?",
    questionTextEs: "¿Qué es un endoso en seguros?",
    optionsEn: ["A signature on a check", "A written document that modifies the original policy", "A type of surety bond", "A claim form"],
    optionsEs: ["Una firma en un cheque", "Un documento escrito que modifica la póliza original", "Un tipo de fianza", "Un formulario de reclamo"],
    correctAnswer: 1,
    explanationEn: "An endorsement (or rider) is a written document attached to a policy that modifies, adds, or removes coverage.",
    explanationEs: "Un endoso (o anexo) es un documento escrito adjunto a una póliza que modifica, agrega o elimina cobertura."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the purpose of a Business Owner's Policy (BOP)?",
    questionTextEs: "¿Cuál es el propósito de una Póliza de Propietario de Negocio (BOP)?",
    optionsEn: ["To cover only liability", "To combine property and liability coverage in one package for small businesses", "To cover only employees", "To provide life insurance"],
    optionsEs: ["Cubrir solo responsabilidad", "Combinar cobertura de propiedad y responsabilidad en un paquete para pequeños negocios", "Cubrir solo empleados", "Proporcionar seguro de vida"],
    correctAnswer: 1,
    explanationEn: "A BOP combines property insurance, business interruption insurance, and liability coverage into a single package for eligible small to mid-sized businesses.",
    explanationEs: "Una BOP combina seguro de propiedad, seguro de interrupción de negocios y cobertura de responsabilidad en un solo paquete para pequeños y medianos negocios elegibles."
  },
  {
    category: "general_lines",
    questionTextEn: "What is professional liability insurance also known as?",
    questionTextEs: "¿Cómo se conoce también el seguro de responsabilidad profesional?",
    optionsEn: ["General liability", "Errors and Omissions (E&O) insurance", "Workers compensation", "Product liability"],
    optionsEs: ["Responsabilidad general", "Seguro de Errores y Omisiones (E&O)", "Compensación de trabajadores", "Responsabilidad por productos"],
    correctAnswer: 1,
    explanationEn: "Professional liability insurance is commonly called Errors and Omissions (E&O) insurance and covers professionals against negligence claims.",
    explanationEs: "El seguro de responsabilidad profesional se conoce comúnmente como seguro de Errores y Omisiones (E&O) y cubre a los profesionales contra reclamos de negligencia."
  },
  {
    category: "general_lines",
    questionTextEn: "What does inland marine insurance typically cover?",
    questionTextEs: "¿Qué cubre típicamente el seguro marítimo interior?",
    optionsEn: ["Ocean vessels only", "Property in transit and movable property", "Health care costs", "Life insurance"],
    optionsEs: ["Solo embarcaciones oceánicas", "Propiedad en tránsito y propiedad móvil", "Costos de atención médica", "Seguro de vida"],
    correctAnswer: 1,
    explanationEn: "Inland marine insurance covers property in transit, movable property, and property held by bailees, excluding ocean-going vessels.",
    explanationEs: "El seguro marítimo interior cubre propiedad en tránsito, propiedad móvil y propiedad retenida por depositarios, excluyendo embarcaciones oceánicas."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the difference between named perils and open perils coverage?",
    questionTextEs: "¿Cuál es la diferencia entre cobertura de riesgos nombrados y riesgos abiertos?",
    optionsEn: ["No difference", "Named perils covers only listed risks; open perils covers all risks except those excluded", "Open perils is always cheaper", "Named perils covers more"],
    optionsEs: ["Sin diferencia", "Riesgos nombrados cubre solo riesgos listados; riesgos abiertos cubre todos los riesgos excepto los excluidos", "Riesgos abiertos siempre es más barato", "Riesgos nombrados cubre más"],
    correctAnswer: 1,
    explanationEn: "Named perils coverage only covers losses from specifically listed perils, while open perils (all-risk) covers all losses except those specifically excluded.",
    explanationEs: "La cobertura de riesgos nombrados solo cubre pérdidas de riesgos específicamente listados, mientras que riesgos abiertos (todo riesgo) cubre todas las pérdidas excepto las específicamente excluidas."
  },
  {
    category: "general_lines",
    questionTextEn: "What is a certificate of insurance?",
    questionTextEs: "¿Qué es un certificado de seguro?",
    optionsEn: ["The actual policy document", "A document showing proof of insurance coverage", "A license to sell insurance", "A claim form"],
    optionsEs: ["El documento de póliza real", "Un documento que muestra prueba de cobertura de seguro", "Una licencia para vender seguros", "Un formulario de reclamo"],
    correctAnswer: 1,
    explanationEn: "A certificate of insurance is a document that provides evidence of insurance coverage, often required by third parties for contractual purposes.",
    explanationEs: "Un certificado de seguro es un documento que proporciona evidencia de cobertura de seguro, a menudo requerido por terceros para propósitos contractuales."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the purpose of umbrella liability insurance?",
    questionTextEs: "¿Cuál es el propósito del seguro de responsabilidad paraguas?",
    optionsEn: ["To replace other policies", "To provide excess liability coverage above underlying policy limits", "To cover property only", "To provide workers compensation"],
    optionsEs: ["Reemplazar otras pólizas", "Proporcionar cobertura de responsabilidad excedente por encima de los límites de la póliza subyacente", "Cubrir solo propiedad", "Proporcionar compensación de trabajadores"],
    correctAnswer: 1,
    explanationEn: "Umbrella liability insurance provides additional liability coverage above the limits of underlying policies and may cover some claims excluded by underlying policies.",
    explanationEs: "El seguro de responsabilidad paraguas proporciona cobertura de responsabilidad adicional por encima de los límites de las pólizas subyacentes y puede cubrir algunos reclamos excluidos por las pólizas subyacentes."
  },
  {
    category: "general_lines",
    questionTextEn: "What is subrogation in insurance?",
    questionTextEs: "¿Qué es la subrogación en seguros?",
    optionsEn: ["A type of policy", "The insurer's right to recover from a third party after paying a claim", "A premium payment method", "A type of endorsement"],
    optionsEs: ["Un tipo de póliza", "El derecho del asegurador de recuperar de un tercero después de pagar un reclamo", "Un método de pago de prima", "Un tipo de endoso"],
    correctAnswer: 1,
    explanationEn: "Subrogation is the insurer's legal right to pursue a third party who caused the loss after the insurer has paid the claim.",
    explanationEs: "La subrogación es el derecho legal del asegurador de perseguir a un tercero que causó la pérdida después de que el asegurador haya pagado el reclamo."
  },
  {
    category: "general_lines",
    questionTextEn: "What does coinsurance mean in commercial property insurance?",
    questionTextEs: "¿Qué significa el coaseguro en el seguro de propiedad comercial?",
    optionsEn: ["Two insurers share the risk equally", "The insured must insure property to a specified percentage of its value or face a penalty", "The premium is shared", "Coverage is automatic"],
    optionsEs: ["Dos aseguradores comparten el riesgo por igual", "El asegurado debe asegurar la propiedad a un porcentaje especificado de su valor o enfrentar una penalidad", "La prima se comparte", "La cobertura es automática"],
    correctAnswer: 1,
    explanationEn: "Coinsurance requires the insured to maintain coverage equal to a specified percentage of the property's value (typically 80%) or face a reduced claim payment.",
    explanationEs: "El coaseguro requiere que el asegurado mantenga cobertura igual a un porcentaje especificado del valor de la propiedad (típicamente 80%) o enfrente un pago de reclamo reducido."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the purpose of a hold harmless agreement?",
    questionTextEs: "¿Cuál es el propósito de un acuerdo de exoneración de responsabilidad?",
    optionsEn: ["To cancel insurance", "To transfer liability from one party to another", "To increase premiums", "To deny claims"],
    optionsEs: ["Cancelar el seguro", "Transferir responsabilidad de una parte a otra", "Aumentar las primas", "Denegar reclamos"],
    correctAnswer: 1,
    explanationEn: "A hold harmless agreement is a contractual provision where one party agrees to indemnify and hold the other party harmless from liability.",
    explanationEs: "Un acuerdo de exoneración de responsabilidad es una disposición contractual donde una parte acuerda indemnizar y exonerar a la otra parte de responsabilidad."
  },
  {
    category: "general_lines",
    questionTextEn: "What is a bid bond?",
    questionTextEs: "¿Qué es una fianza de licitación?",
    optionsEn: ["Insurance for property", "A guarantee that a contractor will honor their bid if selected", "A type of liability coverage", "An employee benefit"],
    optionsEs: ["Seguro de propiedad", "Una garantía de que un contratista honrará su oferta si es seleccionado", "Un tipo de cobertura de responsabilidad", "Un beneficio para empleados"],
    correctAnswer: 1,
    explanationEn: "A bid bond guarantees that a contractor will enter into a contract and provide required bonds if their bid is accepted.",
    explanationEs: "Una fianza de licitación garantiza que un contratista celebrará un contrato y proporcionará las fianzas requeridas si su oferta es aceptada."
  },
  {
    category: "general_lines",
    questionTextEn: "What is a performance bond?",
    questionTextEs: "¿Qué es una fianza de cumplimiento?",
    optionsEn: ["Insurance for actors", "A guarantee that a contractor will complete a project according to specifications", "A type of life insurance", "Health coverage"],
    optionsEs: ["Seguro para actores", "Una garantía de que un contratista completará un proyecto según las especificaciones", "Un tipo de seguro de vida", "Cobertura de salud"],
    correctAnswer: 1,
    explanationEn: "A performance bond guarantees that a contractor will complete a project according to the contract terms and specifications.",
    explanationEs: "Una fianza de cumplimiento garantiza que un contratista completará un proyecto según los términos del contrato y las especificaciones."
  },
  {
    category: "general_lines",
    questionTextEn: "What is a payment bond?",
    questionTextEs: "¿Qué es una fianza de pago?",
    optionsEn: ["A premium payment plan", "A guarantee that subcontractors and suppliers will be paid", "A type of deductible", "An endorsement"],
    optionsEs: ["Un plan de pago de prima", "Una garantía de que los subcontratistas y proveedores serán pagados", "Un tipo de deducible", "Un endoso"],
    correctAnswer: 1,
    explanationEn: "A payment bond guarantees that the contractor will pay subcontractors, laborers, and suppliers for work performed on a project.",
    explanationEs: "Una fianza de pago garantiza que el contratista pagará a los subcontratistas, trabajadores y proveedores por el trabajo realizado en un proyecto."
  },
  {
    category: "general_lines",
    questionTextEn: "What is business interruption insurance?",
    questionTextEs: "¿Qué es el seguro de interrupción de negocios?",
    optionsEn: ["Coverage for employee injuries", "Coverage for lost income when a business cannot operate due to a covered loss", "Coverage for auto accidents", "Coverage for professional errors"],
    optionsEs: ["Cobertura para lesiones de empleados", "Cobertura para ingresos perdidos cuando un negocio no puede operar debido a una pérdida cubierta", "Cobertura para accidentes de auto", "Cobertura para errores profesionales"],
    correctAnswer: 1,
    explanationEn: "Business interruption insurance covers lost income and ongoing expenses when a business is unable to operate due to a covered property loss.",
    explanationEs: "El seguro de interrupción de negocios cubre ingresos perdidos y gastos continuos cuando un negocio no puede operar debido a una pérdida de propiedad cubierta."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the purpose of a blanket policy?",
    questionTextEs: "¿Cuál es el propósito de una póliza general?",
    optionsEn: ["To cover only one item", "To cover multiple locations or types of property under a single limit", "To exclude coverage", "To provide life insurance"],
    optionsEs: ["Cubrir solo un artículo", "Cubrir múltiples ubicaciones o tipos de propiedad bajo un solo límite", "Excluir cobertura", "Proporcionar seguro de vida"],
    correctAnswer: 1,
    explanationEn: "A blanket policy covers multiple properties, locations, or types of property under a single coverage limit.",
    explanationEs: "Una póliza general cubre múltiples propiedades, ubicaciones o tipos de propiedad bajo un solo límite de cobertura."
  },
  {
    category: "general_lines",
    questionTextEn: "What is products liability insurance?",
    questionTextEs: "¿Qué es el seguro de responsabilidad por productos?",
    optionsEn: ["Insurance for product manufacturing", "Coverage for claims arising from products that cause injury or damage", "Coverage for theft of products", "Insurance for product advertising"],
    optionsEs: ["Seguro para la fabricación de productos", "Cobertura para reclamos que surgen de productos que causan lesiones o daños", "Cobertura para robo de productos", "Seguro para publicidad de productos"],
    correctAnswer: 1,
    explanationEn: "Products liability insurance covers claims arising from bodily injury or property damage caused by products manufactured, sold, or distributed by the insured.",
    explanationEs: "El seguro de responsabilidad por productos cubre reclamos que surgen de lesiones corporales o daños a la propiedad causados por productos fabricados, vendidos o distribuidos por el asegurado."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the difference between replacement cost and actual cash value?",
    questionTextEs: "¿Cuál es la diferencia entre costo de reemplazo y valor real en efectivo?",
    optionsEn: ["No difference", "Replacement cost pays full replacement; actual cash value deducts depreciation", "Actual cash value pays more", "Replacement cost includes market value"],
    optionsEs: ["Sin diferencia", "Costo de reemplazo paga el reemplazo completo; valor real en efectivo deduce depreciación", "Valor real en efectivo paga más", "Costo de reemplazo incluye valor de mercado"],
    correctAnswer: 1,
    explanationEn: "Replacement cost pays to replace or repair property without deducting for depreciation, while actual cash value deducts depreciation from the replacement cost.",
    explanationEs: "El costo de reemplazo paga para reemplazar o reparar la propiedad sin deducir la depreciación, mientras que el valor real en efectivo deduce la depreciación del costo de reemplazo."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the purpose of a deductible in insurance?",
    questionTextEs: "¿Cuál es el propósito de un deducible en seguros?",
    optionsEn: ["To increase claim payments", "To have the insured share in the loss and reduce small claims", "To eliminate all coverage", "To replace the premium"],
    optionsEs: ["Aumentar los pagos de reclamos", "Hacer que el asegurado comparta la pérdida y reducir reclamos pequeños", "Eliminar toda la cobertura", "Reemplazar la prima"],
    correctAnswer: 1,
    explanationEn: "A deductible is the amount the insured must pay out of pocket before insurance coverage applies, reducing moral hazard and small claims.",
    explanationEs: "Un deducible es la cantidad que el asegurado debe pagar de su bolsillo antes de que se aplique la cobertura del seguro, reduciendo el riesgo moral y los reclamos pequeños."
  },
  {
    category: "general_lines",
    questionTextEn: "What is a loss payee?",
    questionTextEs: "¿Qué es un beneficiario de pérdida?",
    optionsEn: ["The insurance company", "A party with a financial interest who receives claim payments", "The insured", "The agent"],
    optionsEs: ["La compañía de seguros", "Una parte con interés financiero que recibe pagos de reclamos", "El asegurado", "El agente"],
    correctAnswer: 1,
    explanationEn: "A loss payee is a party, often a lender, with a financial interest in the insured property who is entitled to receive claim payments.",
    explanationEs: "Un beneficiario de pérdida es una parte, a menudo un prestamista, con interés financiero en la propiedad asegurada que tiene derecho a recibir pagos de reclamos."
  },
  {
    category: "general_lines",
    questionTextEn: "What is an additional insured?",
    questionTextEs: "¿Qué es un asegurado adicional?",
    optionsEn: ["A duplicate policy", "A person or organization added to a policy who receives liability protection", "An exclusion", "A premium discount"],
    optionsEs: ["Una póliza duplicada", "Una persona u organización agregada a una póliza que recibe protección de responsabilidad", "Una exclusión", "Un descuento de prima"],
    correctAnswer: 1,
    explanationEn: "An additional insured is a person or organization added to a liability policy who receives protection under that policy's coverage.",
    explanationEs: "Un asegurado adicional es una persona u organización agregada a una póliza de responsabilidad que recibe protección bajo la cobertura de esa póliza."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the purpose of a commercial auto policy?",
    questionTextEs: "¿Cuál es el propósito de una póliza de auto comercial?",
    optionsEn: ["To cover personal vehicles only", "To provide coverage for vehicles used in business operations", "To cover only liability", "To provide life insurance"],
    optionsEs: ["Cubrir solo vehículos personales", "Proporcionar cobertura para vehículos utilizados en operaciones comerciales", "Cubrir solo responsabilidad", "Proporcionar seguro de vida"],
    correctAnswer: 1,
    explanationEn: "A commercial auto policy provides liability, physical damage, and other coverage for vehicles owned, leased, hired, or borrowed for business purposes.",
    explanationEs: "Una póliza de auto comercial proporciona responsabilidad, daños físicos y otra cobertura para vehículos propiedad, arrendados, alquilados o prestados para propósitos comerciales."
  },
  {
    category: "general_lines",
    questionTextEn: "What is hired and non-owned auto coverage?",
    questionTextEs: "¿Qué es la cobertura de autos alquilados y no propios?",
    optionsEn: ["Coverage for owned vehicles", "Coverage for vehicles an employee uses for business that the business doesn't own", "Personal auto coverage", "Motorcycle coverage"],
    optionsEs: ["Cobertura para vehículos propios", "Cobertura para vehículos que un empleado usa para negocios que el negocio no posee", "Cobertura de auto personal", "Cobertura de motocicleta"],
    correctAnswer: 1,
    explanationEn: "Hired and non-owned auto coverage provides liability protection when employees use rental cars or personal vehicles for business purposes.",
    explanationEs: "La cobertura de autos alquilados y no propios proporciona protección de responsabilidad cuando los empleados usan autos de alquiler o vehículos personales para propósitos comerciales."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the primary purpose of workers' compensation insurance?",
    questionTextEs: "¿Cuál es el propósito principal del seguro de compensación de trabajadores?",
    optionsEn: ["To provide life insurance to employees", "To provide benefits to employees injured or ill due to their job", "To cover property damage", "To provide auto coverage"],
    optionsEs: ["Proporcionar seguro de vida a los empleados", "Proporcionar beneficios a empleados lesionados o enfermos debido a su trabajo", "Cubrir daños a la propiedad", "Proporcionar cobertura de auto"],
    correctAnswer: 1,
    explanationEn: "Workers' compensation insurance provides medical benefits and wage replacement to employees who suffer work-related injuries or illnesses.",
    explanationEs: "El seguro de compensación de trabajadores proporciona beneficios médicos y reemplazo de salario a empleados que sufren lesiones o enfermedades relacionadas con el trabajo."
  },
  {
    category: "general_lines",
    questionTextEn: "In Texas, workers' compensation is:",
    questionTextEs: "En Texas, la compensación de trabajadores es:",
    optionsEn: ["Mandatory for all employers", "Optional for most private employers", "Only for government employers", "Required only for large companies"],
    optionsEs: ["Obligatoria para todos los empleadores", "Opcional para la mayoría de empleadores privados", "Solo para empleadores gubernamentales", "Requerida solo para grandes empresas"],
    correctAnswer: 1,
    explanationEn: "Texas is unique in that workers' compensation insurance is optional for most private employers, though they face certain liabilities if they don't carry it.",
    explanationEs: "Texas es único en que el seguro de compensación de trabajadores es opcional para la mayoría de empleadores privados, aunque enfrentan ciertas responsabilidades si no lo tienen."
  },
  {
    category: "general_lines",
    questionTextEn: "What is an experience modification factor in workers' compensation?",
    questionTextEs: "¿Qué es un factor de modificación de experiencia en compensación de trabajadores?",
    optionsEn: ["A type of coverage", "A multiplier that adjusts premiums based on the employer's claims history", "An exclusion", "A deductible"],
    optionsEs: ["Un tipo de cobertura", "Un multiplicador que ajusta las primas basado en el historial de reclamos del empleador", "Una exclusión", "Un deducible"],
    correctAnswer: 1,
    explanationEn: "The experience modification factor adjusts workers' compensation premiums based on an employer's past claims experience compared to similar employers.",
    explanationEs: "El factor de modificación de experiencia ajusta las primas de compensación de trabajadores basado en la experiencia de reclamos pasados del empleador comparado con empleadores similares."
  },
  {
    category: "general_lines",
    questionTextEn: "What is employers' liability insurance?",
    questionTextEs: "¿Qué es el seguro de responsabilidad del empleador?",
    optionsEn: ["The same as workers' compensation", "Coverage for lawsuits by injured employees not covered by workers' compensation", "Property insurance", "Auto insurance"],
    optionsEs: ["Lo mismo que compensación de trabajadores", "Cobertura para demandas por empleados lesionados no cubiertas por compensación de trabajadores", "Seguro de propiedad", "Seguro de auto"],
    correctAnswer: 1,
    explanationEn: "Employers' liability insurance covers claims by employees or their heirs that fall outside the workers' compensation system, such as third-party-over claims.",
    explanationEs: "El seguro de responsabilidad del empleador cubre reclamos de empleados o sus herederos que caen fuera del sistema de compensación de trabajadores, como reclamos de terceros."
  },
  {
    category: "general_lines",
    questionTextEn: "What is a builders risk policy?",
    questionTextEs: "¿Qué es una póliza de riesgo de constructores?",
    optionsEn: ["Insurance for property owners only", "Coverage for buildings under construction", "Life insurance for builders", "Auto insurance for contractors"],
    optionsEs: ["Seguro solo para propietarios de propiedad", "Cobertura para edificios en construcción", "Seguro de vida para constructores", "Seguro de auto para contratistas"],
    correctAnswer: 1,
    explanationEn: "A builders risk policy provides coverage for buildings under construction against damage from covered perils such as fire, theft, and weather.",
    explanationEs: "Una póliza de riesgo de constructores proporciona cobertura para edificios en construcción contra daños de riesgos cubiertos como incendio, robo y clima."
  },
  {
    category: "general_lines",
    questionTextEn: "What is crime insurance?",
    questionTextEs: "¿Qué es el seguro contra crímenes?",
    optionsEn: ["Insurance for criminals", "Coverage for losses due to criminal acts such as theft, fraud, and forgery", "Liability insurance", "Life insurance"],
    optionsEs: ["Seguro para criminales", "Cobertura para pérdidas debido a actos criminales como robo, fraude y falsificación", "Seguro de responsabilidad", "Seguro de vida"],
    correctAnswer: 1,
    explanationEn: "Crime insurance covers losses resulting from criminal acts including employee theft, forgery, robbery, burglary, and computer fraud.",
    explanationEs: "El seguro contra crímenes cubre pérdidas resultantes de actos criminales incluyendo robo de empleados, falsificación, robo con violencia, allanamiento y fraude informático."
  },
  {
    category: "general_lines",
    questionTextEn: "What is a commercial package policy (CPP)?",
    questionTextEs: "¿Qué es una póliza de paquete comercial (CPP)?",
    optionsEn: ["A policy for shipping packages", "A modular policy combining multiple commercial coverages", "A personal insurance policy", "A life insurance policy"],
    optionsEs: ["Una póliza para enviar paquetes", "Una póliza modular que combina múltiples coberturas comerciales", "Una póliza de seguro personal", "Una póliza de seguro de vida"],
    correctAnswer: 1,
    explanationEn: "A CPP is a modular policy that combines two or more commercial coverage parts, such as property, liability, and crime, into a single policy.",
    explanationEs: "Una CPP es una póliza modular que combina dos o más partes de cobertura comercial, como propiedad, responsabilidad y crímenes, en una sola póliza."
  },
  {
    category: "general_lines",
    questionTextEn: "What is equipment breakdown insurance (formerly boiler and machinery)?",
    questionTextEs: "¿Qué es el seguro de avería de equipos (anteriormente calderas y maquinaria)?",
    optionsEn: ["Coverage for manual tools only", "Coverage for mechanical and electrical equipment failures", "Auto coverage", "Life insurance"],
    optionsEs: ["Cobertura solo para herramientas manuales", "Cobertura para fallas de equipos mecánicos y eléctricos", "Cobertura de auto", "Seguro de vida"],
    correctAnswer: 1,
    explanationEn: "Equipment breakdown insurance covers losses from the sudden and accidental breakdown of mechanical, electrical, and pressure equipment.",
    explanationEs: "El seguro de avería de equipos cubre pérdidas por la avería repentina y accidental de equipos mecánicos, eléctricos y de presión."
  },
  {
    category: "general_lines",
    questionTextEn: "What is cyber liability insurance?",
    questionTextEs: "¿Qué es el seguro de responsabilidad cibernética?",
    optionsEn: ["Auto insurance", "Coverage for losses from data breaches and cyber attacks", "Property insurance", "Life insurance"],
    optionsEs: ["Seguro de auto", "Cobertura para pérdidas por violaciones de datos y ataques cibernéticos", "Seguro de propiedad", "Seguro de vida"],
    correctAnswer: 1,
    explanationEn: "Cyber liability insurance covers losses resulting from data breaches, cyber attacks, and other technology-related risks.",
    explanationEs: "El seguro de responsabilidad cibernética cubre pérdidas resultantes de violaciones de datos, ataques cibernéticos y otros riesgos relacionados con la tecnología."
  },
  {
    category: "general_lines",
    questionTextEn: "What is directors and officers (D&O) liability insurance?",
    questionTextEs: "¿Qué es el seguro de responsabilidad de directores y funcionarios (D&O)?",
    optionsEn: ["Property insurance", "Coverage for claims against corporate leadership for wrongful acts", "Auto insurance", "Workers compensation"],
    optionsEs: ["Seguro de propiedad", "Cobertura para reclamos contra liderazgo corporativo por actos ilícitos", "Seguro de auto", "Compensación de trabajadores"],
    correctAnswer: 1,
    explanationEn: "D&O insurance protects company directors and officers from personal liability for wrongful acts in managing the company.",
    explanationEs: "El seguro D&O protege a los directores y funcionarios de la empresa de responsabilidad personal por actos ilícitos en la gestión de la empresa."
  },
  {
    category: "general_lines",
    questionTextEn: "What is employment practices liability insurance (EPLI)?",
    questionTextEs: "¿Qué es el seguro de responsabilidad por prácticas de empleo (EPLI)?",
    optionsEn: ["Workers compensation", "Coverage for claims of discrimination, harassment, and wrongful termination", "Auto insurance", "Property insurance"],
    optionsEs: ["Compensación de trabajadores", "Cobertura para reclamos de discriminación, acoso y terminación injusta", "Seguro de auto", "Seguro de propiedad"],
    correctAnswer: 1,
    explanationEn: "EPLI covers claims by employees alleging discrimination, sexual harassment, wrongful termination, and other employment-related issues.",
    explanationEs: "El EPLI cubre reclamos de empleados alegando discriminación, acoso sexual, terminación injusta y otros problemas relacionados con el empleo."
  },
  {
    category: "general_lines",
    questionTextEn: "What is a retroactive date in a claims-made policy?",
    questionTextEs: "¿Qué es una fecha retroactiva en una póliza de reclamos hechos?",
    optionsEn: ["The policy expiration date", "The date before which claims for incidents are not covered", "The premium due date", "The renewal date"],
    optionsEs: ["La fecha de vencimiento de la póliza", "La fecha antes de la cual los reclamos por incidentes no están cubiertos", "La fecha de vencimiento de la prima", "La fecha de renovación"],
    correctAnswer: 1,
    explanationEn: "The retroactive date establishes the earliest date for which a claims-made policy will cover claims arising from incidents.",
    explanationEs: "La fecha retroactiva establece la fecha más temprana para la cual una póliza de reclamos hechos cubrirá reclamos que surjan de incidentes."
  },
  {
    category: "general_lines",
    questionTextEn: "What is extended reporting period coverage (tail coverage)?",
    questionTextEs: "¿Qué es la cobertura de período de informe extendido (cobertura de cola)?",
    optionsEn: ["Coverage for property", "Coverage allowing claims to be reported after a claims-made policy expires", "Auto coverage", "Life insurance"],
    optionsEs: ["Cobertura de propiedad", "Cobertura que permite que los reclamos se reporten después de que expire una póliza de reclamos hechos", "Cobertura de auto", "Seguro de vida"],
    correctAnswer: 1,
    explanationEn: "Tail coverage extends the time period during which claims can be reported under a claims-made policy after the policy has expired.",
    explanationEs: "La cobertura de cola extiende el período de tiempo durante el cual los reclamos pueden reportarse bajo una póliza de reclamos hechos después de que la póliza haya expirado."
  },
  {
    category: "general_lines",
    questionTextEn: "What is bailee coverage?",
    questionTextEs: "¿Qué es la cobertura de depositario?",
    optionsEn: ["Coverage for bail bonds", "Coverage for property of others in the care of the insured", "Life insurance", "Auto coverage"],
    optionsEs: ["Cobertura para fianzas de libertad bajo fianza", "Cobertura para propiedad de otros bajo el cuidado del asegurado", "Seguro de vida", "Cobertura de auto"],
    correctAnswer: 1,
    explanationEn: "Bailee coverage protects businesses for damage to customer property left in their care, custody, or control.",
    explanationEs: "La cobertura de depositario protege a los negocios por daños a la propiedad de clientes dejada bajo su cuidado, custodia o control."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the difference between primary and excess insurance?",
    questionTextEs: "¿Cuál es la diferencia entre seguro primario y excedente?",
    optionsEn: ["No difference", "Primary pays first; excess pays after primary limits are exhausted", "Excess always pays first", "Primary covers property only"],
    optionsEs: ["Sin diferencia", "El primario paga primero; el excedente paga después de que se agoten los límites primarios", "El excedente siempre paga primero", "El primario solo cubre propiedad"],
    correctAnswer: 1,
    explanationEn: "Primary insurance pays claims first up to its limits, while excess insurance only pays after the primary policy's limits are exhausted.",
    explanationEs: "El seguro primario paga reclamos primero hasta sus límites, mientras que el seguro excedente solo paga después de que se agoten los límites de la póliza primaria."
  },
  {
    category: "general_lines",
    questionTextEn: "What is a floater policy?",
    questionTextEs: "¿Qué es una póliza flotante?",
    optionsEn: ["A policy that covers only water damage", "A policy that covers movable property at various locations", "A life insurance policy", "An auto policy"],
    optionsEs: ["Una póliza que solo cubre daños por agua", "Una póliza que cubre propiedad móvil en varias ubicaciones", "Una póliza de seguro de vida", "Una póliza de auto"],
    correctAnswer: 1,
    explanationEn: "A floater policy provides coverage for movable property that travels to different locations, such as jewelry, fine art, or contractor equipment.",
    explanationEs: "Una póliza flotante proporciona cobertura para propiedad móvil que viaja a diferentes ubicaciones, como joyas, arte fino o equipo de contratistas."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the purpose of the 'other insurance' clause?",
    questionTextEs: "¿Cuál es el propósito de la cláusula de 'otro seguro'?",
    optionsEn: ["To eliminate coverage", "To determine how multiple policies covering the same loss will share payment", "To increase premiums", "To reduce deductibles"],
    optionsEs: ["Eliminar cobertura", "Determinar cómo múltiples pólizas que cubren la misma pérdida compartirán el pago", "Aumentar las primas", "Reducir deducibles"],
    correctAnswer: 1,
    explanationEn: "The other insurance clause establishes how claims will be handled when more than one policy covers the same loss.",
    explanationEs: "La cláusula de otro seguro establece cómo se manejarán los reclamos cuando más de una póliza cubra la misma pérdida."
  },
  {
    category: "general_lines",
    questionTextEn: "What is garage liability coverage?",
    questionTextEs: "¿Qué es la cobertura de responsabilidad de garaje?",
    optionsEn: ["Homeowners coverage for garages", "Liability coverage for auto dealers and repair shops", "Personal auto coverage", "Property coverage only"],
    optionsEs: ["Cobertura de propietarios para garajes", "Cobertura de responsabilidad para concesionarios de autos y talleres de reparación", "Cobertura de auto personal", "Solo cobertura de propiedad"],
    correctAnswer: 1,
    explanationEn: "Garage liability coverage provides liability protection for businesses such as auto dealers, repair shops, and service stations.",
    explanationEs: "La cobertura de responsabilidad de garaje proporciona protección de responsabilidad para negocios como concesionarios de autos, talleres de reparación y estaciones de servicio."
  },
  {
    category: "general_lines",
    questionTextEn: "What is liquor liability insurance?",
    questionTextEs: "¿Qué es el seguro de responsabilidad por licor?",
    optionsEn: ["Insurance for liquor stores", "Coverage for claims arising from the sale or service of alcohol", "Property coverage", "Auto coverage"],
    optionsEs: ["Seguro para tiendas de licores", "Cobertura para reclamos que surgen de la venta o servicio de alcohol", "Cobertura de propiedad", "Cobertura de auto"],
    correctAnswer: 1,
    explanationEn: "Liquor liability insurance covers claims arising from injuries or damages caused by intoxicated persons who were served alcohol by the insured.",
    explanationEs: "El seguro de responsabilidad por licor cubre reclamos que surgen de lesiones o daños causados por personas intoxicadas a quienes el asegurado sirvió alcohol."
  }
];

export async function seedGeneralLinesPart1() {
  console.log("Seeding General Lines questions (Part 1 - 50)...");
  
  for (const question of generalLinesQuestions) {
    await db.insert(questions).values(question);
  }
  
  console.log(`Added ${generalLinesQuestions.length} General Lines questions`);
}

seedGeneralLinesPart1()
  .then(() => {
    console.log("General Lines Part 1 seeding completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error seeding General Lines Part 1:", error);
    process.exit(1);
  });
