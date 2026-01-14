import { db } from "./db";
import { questions } from "@shared/schema";

interface QuestionData {
  category: "real_estate";
  questionTextEn: string;
  questionTextEs: string;
  optionsEn: string[];
  optionsEs: string[];
  correctAnswer: number;
  explanationEn: string;
  explanationEs: string;
}

const additionalRealEstateQuestions: QuestionData[] = [
  // TREC License Law and Rules (Questions 1-25)
  {
    category: "real_estate",
    questionTextEn: "Under TREC rules, how many hours of continuing education are required for license renewal?",
    questionTextEs: "Según las reglas de TREC, ¿cuántas horas de educación continua se requieren para la renovación de licencia?",
    optionsEn: ["18 hours", "30 hours", "15 hours", "24 hours"],
    optionsEs: ["18 horas", "30 horas", "15 horas", "24 horas"],
    correctAnswer: 0,
    explanationEn: "TREC requires 18 hours of continuing education for license renewal, including specific legal and ethics hours.",
    explanationEs: "TREC requiere 18 horas de educación continua para la renovación de licencia, incluyendo horas específicas de legal y ética."
  },
  {
    category: "real_estate",
    questionTextEn: "What is the minimum age requirement to obtain a Texas real estate sales agent license?",
    questionTextEs: "¿Cuál es el requisito de edad mínima para obtener una licencia de agente de ventas de bienes raíces en Texas?",
    optionsEn: ["18 years old", "21 years old", "25 years old", "16 years old"],
    optionsEs: ["18 años", "21 años", "25 años", "16 años"],
    correctAnswer: 0,
    explanationEn: "Texas requires applicants to be at least 18 years of age to obtain a real estate sales agent license.",
    explanationEs: "Texas requiere que los solicitantes tengan al menos 18 años de edad para obtener una licencia de agente de ventas de bienes raíces."
  },
  {
    category: "real_estate",
    questionTextEn: "How many classroom hours of qualifying education are required for a Texas sales agent license?",
    questionTextEs: "¿Cuántas horas de educación calificada en aula se requieren para una licencia de agente de ventas en Texas?",
    optionsEn: ["180 hours", "150 hours", "120 hours", "90 hours"],
    optionsEs: ["180 horas", "150 horas", "120 horas", "90 horas"],
    correctAnswer: 0,
    explanationEn: "Texas requires 180 classroom hours of qualifying education for a sales agent license.",
    explanationEs: "Texas requiere 180 horas de educación calificada en aula para una licencia de agente de ventas."
  },
  {
    category: "real_estate",
    questionTextEn: "What organization administers the Texas real estate license exam?",
    questionTextEs: "¿Qué organización administra el examen de licencia de bienes raíces de Texas?",
    optionsEn: ["Pearson VUE", "TREC directly", "Texas Association of Realtors", "National Association of Realtors"],
    optionsEs: ["Pearson VUE", "TREC directamente", "Asociación de Realtors de Texas", "Asociación Nacional de Realtors"],
    correctAnswer: 0,
    explanationEn: "Pearson VUE administers the Texas real estate license examination on behalf of TREC.",
    explanationEs: "Pearson VUE administra el examen de licencia de bienes raíces de Texas en nombre de TREC."
  },
  {
    category: "real_estate",
    questionTextEn: "Under TREC rules, when must a license holder provide the Information About Brokerage Services form?",
    questionTextEs: "Según las reglas de TREC, ¿cuándo debe un titular de licencia proporcionar el formulario de Información Sobre Servicios de Corretaje?",
    optionsEn: ["At first substantive dialogue", "After signing a listing agreement", "At closing", "When asked by the client"],
    optionsEs: ["En el primer diálogo sustancial", "Después de firmar un acuerdo de listado", "Al cierre", "Cuando el cliente lo solicite"],
    correctAnswer: 0,
    explanationEn: "The Information About Brokerage Services form must be provided at the first substantive dialogue with a prospective buyer or seller.",
    explanationEs: "El formulario de Información Sobre Servicios de Corretaje debe proporcionarse en el primer diálogo sustancial con un posible comprador o vendedor."
  },
  {
    category: "real_estate",
    questionTextEn: "What is the maximum penalty TREC can assess for a single violation of the Real Estate License Act?",
    questionTextEs: "¿Cuál es la penalidad máxima que TREC puede imponer por una sola violación de la Ley de Licencias de Bienes Raíces?",
    optionsEn: ["$5,000", "$10,000", "$1,000", "$25,000"],
    optionsEs: ["$5,000", "$10,000", "$1,000", "$25,000"],
    correctAnswer: 0,
    explanationEn: "TREC can assess an administrative penalty of up to $5,000 for each violation of the Real Estate License Act.",
    explanationEs: "TREC puede imponer una penalidad administrativa de hasta $5,000 por cada violación de la Ley de Licencias de Bienes Raíces."
  },
  {
    category: "real_estate",
    questionTextEn: "A Texas real estate license must be renewed every:",
    questionTextEs: "Una licencia de bienes raíces de Texas debe renovarse cada:",
    optionsEn: ["2 years", "1 year", "3 years", "5 years"],
    optionsEs: ["2 años", "1 año", "3 años", "5 años"],
    correctAnswer: 0,
    explanationEn: "Texas real estate licenses must be renewed every two years from the date of issuance.",
    explanationEs: "Las licencias de bienes raíces de Texas deben renovarse cada dos años a partir de la fecha de emisión."
  },
  {
    category: "real_estate",
    questionTextEn: "Which of the following would be grounds for TREC to deny a license application?",
    questionTextEs: "¿Cuál de los siguientes sería motivo para que TREC niegue una solicitud de licencia?",
    optionsEn: ["Felony conviction involving fraud", "Having a civil judgment", "Being under 25 years old", "Not owning property"],
    optionsEs: ["Condena por delito grave que involucre fraude", "Tener un fallo civil", "Tener menos de 25 años", "No ser propietario de bienes"],
    correctAnswer: 0,
    explanationEn: "TREC may deny a license to an applicant with a felony conviction, particularly one involving fraud, dishonesty, or moral turpitude.",
    explanationEs: "TREC puede negar una licencia a un solicitante con una condena por delito grave, particularmente uno que involucre fraude, deshonestidad o torpeza moral."
  },
  {
    category: "real_estate",
    questionTextEn: "Under Texas law, a real estate broker must maintain a trust account at:",
    questionTextEs: "Según la ley de Texas, un corredor de bienes raíces debe mantener una cuenta fiduciaria en:",
    optionsEn: ["A federally insured bank in Texas", "Any bank in the United States", "A credit union only", "The broker's personal bank"],
    optionsEs: ["Un banco asegurado federalmente en Texas", "Cualquier banco en Estados Unidos", "Solo una cooperativa de crédito", "El banco personal del corredor"],
    correctAnswer: 0,
    explanationEn: "Texas law requires brokers to maintain trust accounts at federally insured financial institutions in Texas.",
    explanationEs: "La ley de Texas requiere que los corredores mantengan cuentas fiduciarias en instituciones financieras aseguradas federalmente en Texas."
  },
  {
    category: "real_estate",
    questionTextEn: "What is the purpose of the Texas Real Estate Recovery Fund?",
    questionTextEs: "¿Cuál es el propósito del Fondo de Recuperación de Bienes Raíces de Texas?",
    optionsEn: ["To compensate consumers harmed by licensee misconduct", "To fund TREC operations", "To provide loans to new agents", "To insure property transactions"],
    optionsEs: ["Compensar a consumidores perjudicados por mala conducta de licenciatarios", "Financiar operaciones de TREC", "Proporcionar préstamos a nuevos agentes", "Asegurar transacciones de propiedades"],
    correctAnswer: 0,
    explanationEn: "The Recovery Fund compensates consumers who have been harmed by the fraudulent or dishonest acts of a licensed broker or sales agent.",
    explanationEs: "El Fondo de Recuperación compensa a los consumidores que han sido perjudicados por actos fraudulentos o deshonestos de un corredor o agente de ventas licenciado."
  },
  {
    category: "real_estate",
    questionTextEn: "A sales agent's license is automatically inactivated when:",
    questionTextEs: "La licencia de un agente de ventas se inactiva automáticamente cuando:",
    optionsEn: ["The sponsoring broker's license expires or is revoked", "The agent moves to a different city", "The agent sells fewer than 3 properties per year", "The agent reaches age 65"],
    optionsEs: ["La licencia del corredor patrocinador expira o es revocada", "El agente se muda a otra ciudad", "El agente vende menos de 3 propiedades por año", "El agente alcanza los 65 años"],
    correctAnswer: 0,
    explanationEn: "A sales agent's license is automatically placed on inactive status when their sponsoring broker's license expires, is suspended, or is revoked.",
    explanationEs: "La licencia de un agente de ventas se coloca automáticamente en estado inactivo cuando la licencia de su corredor patrocinador expira, se suspende o se revoca."
  },
  {
    category: "real_estate",
    questionTextEn: "How long does an applicant have to pass the Texas real estate exam after completing the required education?",
    questionTextEs: "¿Cuánto tiempo tiene un solicitante para aprobar el examen de bienes raíces de Texas después de completar la educación requerida?",
    optionsEn: ["1 year", "2 years", "6 months", "18 months"],
    optionsEs: ["1 año", "2 años", "6 meses", "18 meses"],
    correctAnswer: 0,
    explanationEn: "Applicants have one year from the date TREC approves their application to pass the licensing examination.",
    explanationEs: "Los solicitantes tienen un año desde la fecha en que TREC aprueba su solicitud para aprobar el examen de licencia."
  },
  {
    category: "real_estate",
    questionTextEn: "Which of the following activities requires a real estate license in Texas?",
    questionTextEs: "¿Cuál de las siguientes actividades requiere una licencia de bienes raíces en Texas?",
    optionsEn: ["Negotiating a lease for another person for compensation", "Managing your own property", "Selling your own home", "Appraising property"],
    optionsEs: ["Negociar un arrendamiento para otra persona por compensación", "Administrar su propia propiedad", "Vender su propia casa", "Tasar propiedades"],
    correctAnswer: 0,
    explanationEn: "Negotiating a lease or sale of real property for another person for compensation requires a Texas real estate license.",
    explanationEs: "Negociar un arrendamiento o venta de bienes inmuebles para otra persona por compensación requiere una licencia de bienes raíces de Texas."
  },
  {
    category: "real_estate",
    questionTextEn: "What is the term for a licensed sales agent working under a broker's supervision?",
    questionTextEs: "¿Cuál es el término para un agente de ventas licenciado que trabaja bajo la supervisión de un corredor?",
    optionsEn: ["Sponsored sales agent", "Associate broker", "Apprentice", "Junior agent"],
    optionsEs: ["Agente de ventas patrocinado", "Corredor asociado", "Aprendiz", "Agente junior"],
    correctAnswer: 0,
    explanationEn: "In Texas, a sales agent must be sponsored by a licensed broker to engage in real estate activities.",
    explanationEs: "En Texas, un agente de ventas debe ser patrocinado por un corredor licenciado para participar en actividades de bienes raíces."
  },
  {
    category: "real_estate",
    questionTextEn: "TREC promulgated contract forms are:",
    questionTextEs: "Los formularios de contrato promulgados por TREC son:",
    optionsEn: ["Required for use by license holders in most transactions", "Optional suggestions", "Only for commercial transactions", "Created by the Texas Bar Association"],
    optionsEs: ["Requeridos para uso de titulares de licencia en la mayoría de transacciones", "Sugerencias opcionales", "Solo para transacciones comerciales", "Creados por el Colegio de Abogados de Texas"],
    correctAnswer: 0,
    explanationEn: "License holders are required to use TREC promulgated contract forms for most residential transactions in Texas.",
    explanationEs: "Los titulares de licencia están obligados a usar formularios de contrato promulgados por TREC para la mayoría de transacciones residenciales en Texas."
  },
  {
    category: "real_estate",
    questionTextEn: "What must a broker do upon receiving earnest money from a buyer?",
    questionTextEs: "¿Qué debe hacer un corredor al recibir dinero de garantía de un comprador?",
    optionsEn: ["Deposit it in the trust account by the close of the second business day", "Immediately give it to the seller", "Hold it personally for 30 days", "Deposit it in the broker's personal account"],
    optionsEs: ["Depositarlo en la cuenta fiduciaria antes del cierre del segundo día hábil", "Entregarlo inmediatamente al vendedor", "Retenerlo personalmente por 30 días", "Depositarlo en la cuenta personal del corredor"],
    correctAnswer: 0,
    explanationEn: "Texas law requires earnest money to be deposited in the broker's trust account by the close of the second business day after receipt.",
    explanationEs: "La ley de Texas requiere que el dinero de garantía se deposite en la cuenta fiduciaria del corredor antes del cierre del segundo día hábil después de recibirlo."
  },
  // Agency Relationships (Questions 17-35)
  {
    category: "real_estate",
    questionTextEn: "In Texas, what type of agency relationship exists when a broker represents both buyer and seller?",
    questionTextEs: "En Texas, ¿qué tipo de relación de agencia existe cuando un corredor representa tanto al comprador como al vendedor?",
    optionsEn: ["Intermediary", "Dual agency", "Single agency", "Sub-agency"],
    optionsEs: ["Intermediario", "Agencia dual", "Agencia única", "Sub-agencia"],
    correctAnswer: 0,
    explanationEn: "Texas uses the intermediary relationship when a broker represents both parties, requiring written consent from both.",
    explanationEs: "Texas usa la relación de intermediario cuando un corredor representa a ambas partes, requiriendo consentimiento escrito de ambos."
  },
  {
    category: "real_estate",
    questionTextEn: "What are the duties of a fiduciary in a real estate transaction?",
    questionTextEs: "¿Cuáles son los deberes de un fiduciario en una transacción de bienes raíces?",
    optionsEn: ["Obedience, loyalty, disclosure, confidentiality, accounting, and reasonable care", "Only to complete the sale", "To maximize the agent's commission", "To keep all information confidential from all parties"],
    optionsEs: ["Obediencia, lealtad, divulgación, confidencialidad, contabilidad y cuidado razonable", "Solo completar la venta", "Maximizar la comisión del agente", "Mantener toda la información confidencial de todas las partes"],
    correctAnswer: 0,
    explanationEn: "Fiduciary duties include obedience, loyalty, disclosure, confidentiality, accounting, and reasonable care (OLD CAR).",
    explanationEs: "Los deberes fiduciarios incluyen obediencia, lealtad, divulgación, confidencialidad, contabilidad y cuidado razonable."
  },
  {
    category: "real_estate",
    questionTextEn: "When may a broker act as an intermediary in Texas?",
    questionTextEs: "¿Cuándo puede un corredor actuar como intermediario en Texas?",
    optionsEn: ["When both parties give written consent", "At any time without consent", "Only in commercial transactions", "Never, it is prohibited"],
    optionsEs: ["Cuando ambas partes dan consentimiento escrito", "En cualquier momento sin consentimiento", "Solo en transacciones comerciales", "Nunca, está prohibido"],
    correctAnswer: 0,
    explanationEn: "A broker may act as an intermediary only if both the buyer and seller consent in writing.",
    explanationEs: "Un corredor puede actuar como intermediario solo si tanto el comprador como el vendedor consienten por escrito."
  },
  {
    category: "real_estate",
    questionTextEn: "A listing agreement in Texas creates what type of agency relationship?",
    questionTextEs: "Un acuerdo de listado en Texas crea qué tipo de relación de agencia?",
    optionsEn: ["Seller agency", "Buyer agency", "Dual agency", "No agency"],
    optionsEs: ["Agencia del vendedor", "Agencia del comprador", "Agencia dual", "Sin agencia"],
    correctAnswer: 0,
    explanationEn: "A listing agreement creates an agency relationship where the broker represents the seller's interests.",
    explanationEs: "Un acuerdo de listado crea una relación de agencia donde el corredor representa los intereses del vendedor."
  },
  {
    category: "real_estate",
    questionTextEn: "An agent's duty of loyalty requires the agent to:",
    questionTextEs: "El deber de lealtad de un agente requiere que el agente:",
    optionsEn: ["Put the client's interests above all others, including the agent's own", "Always agree with the client", "Never negotiate on price", "Share all information with other parties"],
    optionsEs: ["Poner los intereses del cliente por encima de todos los demás, incluyendo los propios", "Siempre estar de acuerdo con el cliente", "Nunca negociar sobre el precio", "Compartir toda la información con otras partes"],
    correctAnswer: 0,
    explanationEn: "The duty of loyalty requires an agent to place the client's interests above all others, including the agent's own interests.",
    explanationEs: "El deber de lealtad requiere que un agente coloque los intereses del cliente por encima de todos los demás, incluyendo los propios intereses del agente."
  },
  {
    category: "real_estate",
    questionTextEn: "What information must an agent disclose to all parties regardless of representation?",
    questionTextEs: "¿Qué información debe divulgar un agente a todas las partes independientemente de la representación?",
    optionsEn: ["Material facts that affect the property's value or desirability", "The seller's minimum acceptable price", "The buyer's maximum budget", "Personal financial information"],
    optionsEs: ["Hechos materiales que afectan el valor o deseabilidad de la propiedad", "El precio mínimo aceptable del vendedor", "El presupuesto máximo del comprador", "Información financiera personal"],
    correctAnswer: 0,
    explanationEn: "Agents must disclose material facts about the property to all parties, regardless of whom they represent.",
    explanationEs: "Los agentes deben divulgar hechos materiales sobre la propiedad a todas las partes, independientemente de a quién representen."
  },
  {
    category: "real_estate",
    questionTextEn: "In an intermediary relationship, an appointed licensee may:",
    questionTextEs: "En una relación de intermediario, un licenciatario designado puede:",
    optionsEn: ["Provide advice and opinions to their appointed party", "Share confidential information between parties", "Negotiate for both parties equally", "Act as a neutral mediator only"],
    optionsEs: ["Proporcionar consejos y opiniones a su parte designada", "Compartir información confidencial entre partes", "Negociar para ambas partes por igual", "Actuar solo como mediador neutral"],
    correctAnswer: 0,
    explanationEn: "An appointed licensee in an intermediary relationship may provide advice and opinions to the party they are appointed to represent.",
    explanationEs: "Un licenciatario designado en una relación de intermediario puede proporcionar consejos y opiniones a la parte que está designado a representar."
  },
  {
    category: "real_estate",
    questionTextEn: "A buyer's agent owes the buyer:",
    questionTextEs: "Un agente del comprador le debe al comprador:",
    optionsEn: ["Full fiduciary duties", "Only the duty of honesty", "No specific duties", "Only the duty to complete paperwork"],
    optionsEs: ["Todos los deberes fiduciarios", "Solo el deber de honestidad", "Ningún deber específico", "Solo el deber de completar documentos"],
    correctAnswer: 0,
    explanationEn: "A buyer's agent owes full fiduciary duties to the buyer, including loyalty, obedience, disclosure, confidentiality, accounting, and reasonable care.",
    explanationEs: "Un agente del comprador debe todos los deberes fiduciarios al comprador, incluyendo lealtad, obediencia, divulgación, confidencialidad, contabilidad y cuidado razonable."
  },
  {
    category: "real_estate",
    questionTextEn: "Which party pays the commission does NOT determine:",
    questionTextEs: "Qué parte paga la comisión NO determina:",
    optionsEn: ["Agency representation", "The amount of the commission", "Tax deductibility", "Closing costs"],
    optionsEs: ["La representación de agencia", "El monto de la comisión", "La deducibilidad fiscal", "Los costos de cierre"],
    correctAnswer: 0,
    explanationEn: "Who pays the commission does not determine which party an agent represents; agency is established by agreement.",
    explanationEs: "Quién paga la comisión no determina a qué parte representa un agente; la agencia se establece por acuerdo."
  },
  // Contracts and Forms (Questions 26-50)
  {
    category: "real_estate",
    questionTextEn: "What are the essential elements of a valid real estate contract?",
    questionTextEs: "¿Cuáles son los elementos esenciales de un contrato de bienes raíces válido?",
    optionsEn: ["Competent parties, offer and acceptance, consideration, legal purpose, and written form", "Only a signature", "Verbal agreement only", "Just the price agreed upon"],
    optionsEs: ["Partes competentes, oferta y aceptación, contraprestación, propósito legal y forma escrita", "Solo una firma", "Solo acuerdo verbal", "Solo el precio acordado"],
    correctAnswer: 0,
    explanationEn: "A valid real estate contract requires competent parties, mutual agreement (offer and acceptance), consideration, legal purpose, and written form per the Statute of Frauds.",
    explanationEs: "Un contrato de bienes raíces válido requiere partes competentes, acuerdo mutuo (oferta y aceptación), contraprestación, propósito legal y forma escrita según el Estatuto de Fraudes."
  },
  {
    category: "real_estate",
    questionTextEn: "Under the Statute of Frauds, which contracts must be in writing?",
    questionTextEs: "Según el Estatuto de Fraudes, ¿qué contratos deben ser por escrito?",
    optionsEn: ["Contracts for the sale of real property", "All verbal agreements", "Only commercial leases", "Short-term rental agreements"],
    optionsEs: ["Contratos para la venta de bienes inmuebles", "Todos los acuerdos verbales", "Solo arrendamientos comerciales", "Acuerdos de alquiler a corto plazo"],
    correctAnswer: 0,
    explanationEn: "The Statute of Frauds requires contracts for the sale of real property to be in writing to be enforceable.",
    explanationEs: "El Estatuto de Fraudes requiere que los contratos para la venta de bienes inmuebles estén por escrito para ser ejecutables."
  },
  {
    category: "real_estate",
    questionTextEn: "What is the option period in a Texas residential contract?",
    questionTextEs: "¿Qué es el período de opción en un contrato residencial de Texas?",
    optionsEn: ["A negotiated time for the buyer to conduct inspections and terminate without penalty", "The time to close the sale", "The marketing period", "The appraisal time frame"],
    optionsEs: ["Un tiempo negociado para que el comprador realice inspecciones y termine sin penalidad", "El tiempo para cerrar la venta", "El período de mercadeo", "El plazo de tasación"],
    correctAnswer: 0,
    explanationEn: "The option period is a negotiated time during which the buyer may conduct inspections and terminate the contract for any reason.",
    explanationEs: "El período de opción es un tiempo negociado durante el cual el comprador puede realizar inspecciones y terminar el contrato por cualquier razón."
  },
  {
    category: "real_estate",
    questionTextEn: "What is the purpose of earnest money in a real estate transaction?",
    questionTextEs: "¿Cuál es el propósito del dinero de garantía en una transacción de bienes raíces?",
    optionsEn: ["To show the buyer's good faith and serious intent to purchase", "To pay the agent's commission", "To cover closing costs", "To pay property taxes"],
    optionsEs: ["Mostrar la buena fe del comprador y la intención seria de comprar", "Pagar la comisión del agente", "Cubrir los costos de cierre", "Pagar impuestos sobre la propiedad"],
    correctAnswer: 0,
    explanationEn: "Earnest money demonstrates the buyer's good faith commitment to complete the purchase.",
    explanationEs: "El dinero de garantía demuestra el compromiso de buena fe del comprador de completar la compra."
  },
  {
    category: "real_estate",
    questionTextEn: "In the TREC One to Four Family Residential Contract, the effective date is:",
    questionTextEs: "En el Contrato Residencial de Una a Cuatro Familias de TREC, la fecha efectiva es:",
    optionsEn: ["The date the last party signs and communicates acceptance", "The date the contract is written", "The closing date", "The date earnest money is received"],
    optionsEs: ["La fecha en que la última parte firma y comunica la aceptación", "La fecha en que se escribe el contrato", "La fecha de cierre", "La fecha en que se recibe el dinero de garantía"],
    correctAnswer: 0,
    explanationEn: "The effective date is when the last party to sign the contract communicates acceptance to the other party.",
    explanationEs: "La fecha efectiva es cuando la última parte en firmar el contrato comunica la aceptación a la otra parte."
  },
  {
    category: "real_estate",
    questionTextEn: "A counteroffer in real estate:",
    questionTextEs: "Una contraoferta en bienes raíces:",
    optionsEn: ["Terminates the original offer and creates a new offer", "Accepts the original offer with modifications", "Must be in the same amount as the original", "Is automatically accepted"],
    optionsEs: ["Termina la oferta original y crea una nueva oferta", "Acepta la oferta original con modificaciones", "Debe ser por el mismo monto que la original", "Se acepta automáticamente"],
    correctAnswer: 0,
    explanationEn: "A counteroffer terminates the original offer and creates a new offer that the other party may accept, reject, or counter.",
    explanationEs: "Una contraoferta termina la oferta original y crea una nueva oferta que la otra parte puede aceptar, rechazar o contraofertar."
  },
  {
    category: "real_estate",
    questionTextEn: "What is a contingency in a real estate contract?",
    questionTextEs: "¿Qué es una contingencia en un contrato de bienes raíces?",
    optionsEn: ["A condition that must be met for the contract to be binding", "A guarantee of closing", "An automatic approval", "A penalty clause"],
    optionsEs: ["Una condición que debe cumplirse para que el contrato sea vinculante", "Una garantía de cierre", "Una aprobación automática", "Una cláusula de penalidad"],
    correctAnswer: 0,
    explanationEn: "A contingency is a condition that must be satisfied for the contract to become fully binding.",
    explanationEs: "Una contingencia es una condición que debe satisfacerse para que el contrato sea completamente vinculante."
  },
  {
    category: "real_estate",
    questionTextEn: "The amendment versus addendum: An addendum is used to:",
    questionTextEs: "La enmienda versus el anexo: Un anexo se usa para:",
    optionsEn: ["Add terms to a contract before execution", "Change terms after the contract is executed", "Cancel a contract", "Extend the closing date"],
    optionsEs: ["Agregar términos a un contrato antes de la ejecución", "Cambiar términos después de que el contrato se ejecuta", "Cancelar un contrato", "Extender la fecha de cierre"],
    correctAnswer: 0,
    explanationEn: "An addendum adds terms to a contract before execution, while an amendment modifies terms after execution.",
    explanationEs: "Un anexo agrega términos a un contrato antes de la ejecución, mientras que una enmienda modifica términos después de la ejecución."
  },
  {
    category: "real_estate",
    questionTextEn: "What happens if a buyer defaults on a real estate contract?",
    questionTextEs: "¿Qué sucede si un comprador incumple un contrato de bienes raíces?",
    optionsEn: ["The seller may keep the earnest money as liquidated damages", "Nothing happens", "The buyer automatically gets a refund", "The seller must still sell"],
    optionsEs: ["El vendedor puede quedarse con el dinero de garantía como daños liquidados", "No pasa nada", "El comprador obtiene un reembolso automáticamente", "El vendedor aún debe vender"],
    correctAnswer: 0,
    explanationEn: "If the buyer defaults, the seller typically may keep the earnest money as liquidated damages as specified in the contract.",
    explanationEs: "Si el comprador incumple, el vendedor típicamente puede quedarse con el dinero de garantía como daños liquidados según lo especificado en el contrato."
  },
  {
    category: "real_estate",
    questionTextEn: "Which of the following is NOT a TREC promulgated form?",
    questionTextEs: "¿Cuál de los siguientes NO es un formulario promulgado por TREC?",
    optionsEn: ["Commercial lease agreement", "One to Four Family Residential Contract", "Seller's Disclosure Notice", "Addendum for Property Subject to Mandatory Membership"],
    optionsEs: ["Contrato de arrendamiento comercial", "Contrato Residencial de Una a Cuatro Familias", "Aviso de Divulgación del Vendedor", "Anexo para Propiedad Sujeta a Membresía Obligatoria"],
    correctAnswer: 0,
    explanationEn: "Commercial lease agreements are not TREC promulgated forms; they are typically prepared by attorneys.",
    explanationEs: "Los contratos de arrendamiento comercial no son formularios promulgados por TREC; típicamente son preparados por abogados."
  },
  {
    category: "real_estate",
    questionTextEn: "The Seller's Disclosure Notice in Texas must disclose:",
    questionTextEs: "El Aviso de Divulgación del Vendedor en Texas debe divulgar:",
    optionsEn: ["Known defects and conditions affecting the property", "The seller's reason for selling", "The purchase price paid by the seller", "Future development plans in the area"],
    optionsEs: ["Defectos y condiciones conocidas que afectan la propiedad", "La razón del vendedor para vender", "El precio de compra pagado por el vendedor", "Planes de desarrollo futuro en el área"],
    correctAnswer: 0,
    explanationEn: "The Seller's Disclosure Notice requires sellers to disclose known defects and conditions that materially affect the property.",
    explanationEs: "El Aviso de Divulgación del Vendedor requiere que los vendedores divulguen defectos y condiciones conocidas que afectan materialmente la propiedad."
  },
  {
    category: "real_estate",
    questionTextEn: "Which addendum would be used for a property in a homeowners association?",
    questionTextEs: "¿Qué anexo se usaría para una propiedad en una asociación de propietarios?",
    optionsEn: ["Addendum for Property Subject to Mandatory Membership in a Property Owners Association", "Third Party Financing Addendum", "Seller Financing Addendum", "Environmental Assessment Addendum"],
    optionsEs: ["Anexo para Propiedad Sujeta a Membresía Obligatoria en una Asociación de Propietarios", "Anexo de Financiamiento de Terceros", "Anexo de Financiamiento del Vendedor", "Anexo de Evaluación Ambiental"],
    correctAnswer: 0,
    explanationEn: "The Addendum for Property Subject to Mandatory Membership in a Property Owners Association is required for HOA properties.",
    explanationEs: "El Anexo para Propiedad Sujeta a Membresía Obligatoria en una Asociación de Propietarios se requiere para propiedades con HOA."
  },
  {
    category: "real_estate",
    questionTextEn: "The Third Party Financing Addendum specifies:",
    questionTextEs: "El Anexo de Financiamiento de Terceros especifica:",
    optionsEn: ["The buyer's financing terms and conditions", "The seller's existing mortgage", "The title company's requirements", "The appraisal requirements"],
    optionsEs: ["Los términos y condiciones de financiamiento del comprador", "La hipoteca existente del vendedor", "Los requisitos de la compañía de títulos", "Los requisitos de tasación"],
    correctAnswer: 0,
    explanationEn: "The Third Party Financing Addendum outlines the buyer's financing terms including loan type, amount, interest rate, and approval timeline.",
    explanationEs: "El Anexo de Financiamiento de Terceros describe los términos de financiamiento del comprador incluyendo tipo de préstamo, monto, tasa de interés y plazo de aprobación."
  },
  {
    category: "real_estate",
    questionTextEn: "What is specific performance in a real estate contract?",
    questionTextEs: "¿Qué es el cumplimiento específico en un contrato de bienes raíces?",
    optionsEn: ["A court order requiring the party to perform as agreed in the contract", "A penalty payment", "A contract cancellation", "A price reduction"],
    optionsEs: ["Una orden judicial que requiere que la parte cumpla según lo acordado en el contrato", "Un pago de penalidad", "Una cancelación de contrato", "Una reducción de precio"],
    correctAnswer: 0,
    explanationEn: "Specific performance is a legal remedy where the court orders a party to fulfill their contractual obligations.",
    explanationEs: "El cumplimiento específico es un remedio legal donde el tribunal ordena a una parte cumplir con sus obligaciones contractuales."
  },
  {
    category: "real_estate",
    questionTextEn: "An exclusive right-to-sell listing means:",
    questionTextEs: "Un listado de derecho exclusivo de venta significa:",
    optionsEn: ["The broker earns a commission regardless of who sells the property", "The seller can sell without paying commission", "Multiple brokers can list the property", "No commission is paid"],
    optionsEs: ["El corredor gana una comisión independientemente de quién venda la propiedad", "El vendedor puede vender sin pagar comisión", "Múltiples corredores pueden listar la propiedad", "No se paga comisión"],
    correctAnswer: 0,
    explanationEn: "In an exclusive right-to-sell listing, the broker earns commission if the property sells during the listing period, regardless of who procures the buyer.",
    explanationEs: "En un listado de derecho exclusivo de venta, el corredor gana comisión si la propiedad se vende durante el período de listado, independientemente de quién consiga al comprador."
  },
  // Finance and Mortgages (Questions 41-60)
  {
    category: "real_estate",
    questionTextEn: "What is the loan-to-value ratio (LTV)?",
    questionTextEs: "¿Qué es la relación préstamo-valor (LTV)?",
    optionsEn: ["The loan amount divided by the property's appraised value", "The interest rate on the loan", "The monthly payment amount", "The closing costs"],
    optionsEs: ["El monto del préstamo dividido por el valor tasado de la propiedad", "La tasa de interés del préstamo", "El monto del pago mensual", "Los costos de cierre"],
    correctAnswer: 0,
    explanationEn: "LTV is calculated by dividing the loan amount by the property's appraised value, expressed as a percentage.",
    explanationEs: "El LTV se calcula dividiendo el monto del préstamo por el valor tasado de la propiedad, expresado como porcentaje."
  },
  {
    category: "real_estate",
    questionTextEn: "Private Mortgage Insurance (PMI) is typically required when:",
    questionTextEs: "El Seguro Hipotecario Privado (PMI) típicamente se requiere cuando:",
    optionsEn: ["The down payment is less than 20%", "The buyer has excellent credit", "The loan is from the VA", "The property is commercial"],
    optionsEs: ["El pago inicial es menos del 20%", "El comprador tiene excelente crédito", "El préstamo es del VA", "La propiedad es comercial"],
    correctAnswer: 0,
    explanationEn: "PMI is typically required when the buyer's down payment is less than 20% of the purchase price.",
    explanationEs: "El PMI típicamente se requiere cuando el pago inicial del comprador es menos del 20% del precio de compra."
  },
  {
    category: "real_estate",
    questionTextEn: "What is a conventional loan?",
    questionTextEs: "¿Qué es un préstamo convencional?",
    optionsEn: ["A loan not insured or guaranteed by a government agency", "A government-backed loan", "A VA loan", "An FHA loan"],
    optionsEs: ["Un préstamo no asegurado ni garantizado por una agencia gubernamental", "Un préstamo respaldado por el gobierno", "Un préstamo VA", "Un préstamo FHA"],
    correctAnswer: 0,
    explanationEn: "A conventional loan is made by private lenders without government insurance or guarantees.",
    explanationEs: "Un préstamo convencional es hecho por prestamistas privados sin seguro ni garantías del gobierno."
  },
  {
    category: "real_estate",
    questionTextEn: "FHA loans are designed primarily for:",
    questionTextEs: "Los préstamos FHA están diseñados principalmente para:",
    optionsEn: ["First-time homebuyers and those with lower credit scores", "Wealthy investors", "Commercial properties only", "Vacation homes only"],
    optionsEs: ["Compradores de vivienda por primera vez y aquellos con puntajes de crédito más bajos", "Inversionistas adinerados", "Solo propiedades comerciales", "Solo casas vacacionales"],
    correctAnswer: 0,
    explanationEn: "FHA loans are designed to help first-time homebuyers and borrowers with lower credit scores or smaller down payments.",
    explanationEs: "Los préstamos FHA están diseñados para ayudar a compradores de vivienda por primera vez y prestatarios con puntajes de crédito más bajos o pagos iniciales más pequeños."
  },
  {
    category: "real_estate",
    questionTextEn: "What is the difference between a fixed-rate and adjustable-rate mortgage?",
    questionTextEs: "¿Cuál es la diferencia entre una hipoteca de tasa fija y una de tasa ajustable?",
    optionsEn: ["Fixed-rate stays the same; adjustable-rate can change over time", "They are exactly the same", "Fixed-rate is always higher", "Adjustable-rate never changes"],
    optionsEs: ["La tasa fija permanece igual; la tasa ajustable puede cambiar con el tiempo", "Son exactamente iguales", "La tasa fija siempre es más alta", "La tasa ajustable nunca cambia"],
    correctAnswer: 0,
    explanationEn: "A fixed-rate mortgage has a constant interest rate, while an adjustable-rate mortgage (ARM) has a rate that can change based on market conditions.",
    explanationEs: "Una hipoteca de tasa fija tiene una tasa de interés constante, mientras que una hipoteca de tasa ajustable (ARM) tiene una tasa que puede cambiar según las condiciones del mercado."
  },
  {
    category: "real_estate",
    questionTextEn: "What is PITI in mortgage terms?",
    questionTextEs: "¿Qué es PITI en términos hipotecarios?",
    optionsEn: ["Principal, Interest, Taxes, and Insurance", "Property Income Tax Interest", "Payment Interest Total Index", "Principal Investment Tax Interest"],
    optionsEs: ["Principal, Interés, Impuestos y Seguro", "Interés de Impuesto sobre Ingresos de Propiedad", "Índice Total de Interés de Pago", "Interés de Impuesto de Inversión Principal"],
    correctAnswer: 0,
    explanationEn: "PITI represents the four components of a typical monthly mortgage payment: Principal, Interest, Taxes, and Insurance.",
    explanationEs: "PITI representa los cuatro componentes de un pago hipotecario mensual típico: Principal, Interés, Impuestos y Seguro."
  },
  {
    category: "real_estate",
    questionTextEn: "What is a VA loan?",
    questionTextEs: "¿Qué es un préstamo VA?",
    optionsEn: ["A loan guaranteed by the Department of Veterans Affairs for eligible veterans", "A loan from Virginia", "A variable adjustment loan", "A vacation home loan"],
    optionsEs: ["Un préstamo garantizado por el Departamento de Asuntos de Veteranos para veteranos elegibles", "Un préstamo de Virginia", "Un préstamo de ajuste variable", "Un préstamo para casa vacacional"],
    correctAnswer: 0,
    explanationEn: "VA loans are guaranteed by the U.S. Department of Veterans Affairs and available to eligible military veterans and their families.",
    explanationEs: "Los préstamos VA son garantizados por el Departamento de Asuntos de Veteranos de EE.UU. y están disponibles para veteranos militares elegibles y sus familias."
  },
  {
    category: "real_estate",
    questionTextEn: "What is a mortgage assumption?",
    questionTextEs: "¿Qué es una asunción de hipoteca?",
    optionsEn: ["When a buyer takes over the seller's existing mortgage", "A new loan application", "A loan denial", "A refinancing option"],
    optionsEs: ["Cuando un comprador toma el control de la hipoteca existente del vendedor", "Una nueva solicitud de préstamo", "Una denegación de préstamo", "Una opción de refinanciamiento"],
    correctAnswer: 0,
    explanationEn: "A mortgage assumption occurs when a buyer agrees to take over the seller's existing mortgage under its current terms.",
    explanationEs: "Una asunción de hipoteca ocurre cuando un comprador acepta tomar el control de la hipoteca existente del vendedor bajo sus términos actuales."
  },
  {
    category: "real_estate",
    questionTextEn: "What is the purpose of a loan estimate?",
    questionTextEs: "¿Cuál es el propósito de un estimado de préstamo?",
    optionsEn: ["To provide borrowers with estimated loan costs and terms within 3 days of application", "To approve the loan", "To deny the loan", "To transfer the loan"],
    optionsEs: ["Proporcionar a los prestatarios costos y términos estimados del préstamo dentro de 3 días de la solicitud", "Aprobar el préstamo", "Denegar el préstamo", "Transferir el préstamo"],
    correctAnswer: 0,
    explanationEn: "A Loan Estimate must be provided within 3 business days of a mortgage application, showing estimated costs and terms.",
    explanationEs: "Un Estimado de Préstamo debe proporcionarse dentro de 3 días hábiles de una solicitud de hipoteca, mostrando costos y términos estimados."
  },
  {
    category: "real_estate",
    questionTextEn: "What is the Closing Disclosure?",
    questionTextEs: "¿Qué es la Divulgación de Cierre?",
    optionsEn: ["A document showing final loan terms and closing costs, provided 3 days before closing", "The deed to the property", "The appraisal report", "The inspection report"],
    optionsEs: ["Un documento que muestra los términos finales del préstamo y costos de cierre, proporcionado 3 días antes del cierre", "La escritura de la propiedad", "El informe de tasación", "El informe de inspección"],
    correctAnswer: 0,
    explanationEn: "The Closing Disclosure must be provided at least 3 business days before closing, showing final loan terms and closing costs.",
    explanationEs: "La Divulgación de Cierre debe proporcionarse al menos 3 días hábiles antes del cierre, mostrando los términos finales del préstamo y costos de cierre."
  },
  {
    category: "real_estate",
    questionTextEn: "What is a prepayment penalty?",
    questionTextEs: "¿Qué es una penalidad por pago anticipado?",
    optionsEn: ["A fee charged for paying off a loan before its maturity date", "A late payment fee", "The interest rate", "The down payment"],
    optionsEs: ["Una tarifa cobrada por pagar un préstamo antes de su fecha de vencimiento", "Una tarifa por pago atrasado", "La tasa de interés", "El pago inicial"],
    correctAnswer: 0,
    explanationEn: "A prepayment penalty is a fee charged to a borrower who pays off their loan before the scheduled maturity date.",
    explanationEs: "Una penalidad por pago anticipado es una tarifa cobrada a un prestatario que paga su préstamo antes de la fecha de vencimiento programada."
  },
  {
    category: "real_estate",
    questionTextEn: "What does it mean when a property goes into foreclosure?",
    questionTextEs: "¿Qué significa cuando una propiedad entra en ejecución hipotecaria?",
    optionsEn: ["The lender is seizing the property due to default on mortgage payments", "The property is being sold by the owner", "The property is being rented", "The property is being renovated"],
    optionsEs: ["El prestamista está embargando la propiedad debido a incumplimiento en los pagos de la hipoteca", "La propiedad está siendo vendida por el propietario", "La propiedad está siendo alquilada", "La propiedad está siendo renovada"],
    correctAnswer: 0,
    explanationEn: "Foreclosure occurs when a lender takes legal action to seize and sell a property because the borrower has defaulted on mortgage payments.",
    explanationEs: "La ejecución hipotecaria ocurre cuando un prestamista toma acción legal para embargar y vender una propiedad porque el prestatario ha incumplido los pagos de la hipoteca."
  },
  {
    category: "real_estate",
    questionTextEn: "What is equity in a home?",
    questionTextEs: "¿Qué es el patrimonio en una vivienda?",
    optionsEn: ["The difference between the property's market value and the amount owed on it", "The mortgage balance", "The monthly payment", "The interest rate"],
    optionsEs: ["La diferencia entre el valor de mercado de la propiedad y el monto adeudado", "El saldo de la hipoteca", "El pago mensual", "La tasa de interés"],
    correctAnswer: 0,
    explanationEn: "Home equity is the difference between what the home is worth and what is still owed on the mortgage.",
    explanationEs: "El patrimonio de la vivienda es la diferencia entre lo que vale la casa y lo que aún se debe de la hipoteca."
  },
  {
    category: "real_estate",
    questionTextEn: "What is amortization in a mortgage?",
    questionTextEs: "¿Qué es la amortización en una hipoteca?",
    optionsEn: ["The process of paying off a loan through regular payments over time", "The interest calculation", "The appraisal process", "The closing process"],
    optionsEs: ["El proceso de pagar un préstamo a través de pagos regulares con el tiempo", "El cálculo de interés", "El proceso de tasación", "El proceso de cierre"],
    correctAnswer: 0,
    explanationEn: "Amortization is the process of gradually paying off a mortgage through scheduled periodic payments.",
    explanationEs: "La amortización es el proceso de pagar gradualmente una hipoteca a través de pagos periódicos programados."
  },
  {
    category: "real_estate",
    questionTextEn: "What is a home equity line of credit (HELOC)?",
    questionTextEs: "¿Qué es una línea de crédito con garantía hipotecaria (HELOC)?",
    optionsEn: ["A revolving credit line secured by the equity in your home", "A fixed-rate mortgage", "A personal loan", "A credit card"],
    optionsEs: ["Una línea de crédito rotativa asegurada por el patrimonio de su casa", "Una hipoteca de tasa fija", "Un préstamo personal", "Una tarjeta de crédito"],
    correctAnswer: 0,
    explanationEn: "A HELOC is a revolving line of credit that uses your home equity as collateral, allowing you to borrow as needed.",
    explanationEs: "Una HELOC es una línea de crédito rotativa que usa el patrimonio de su casa como garantía, permitiéndole pedir prestado según sea necesario."
  },
  // Property Valuation and Appraisal (Questions 56-75)
  {
    category: "real_estate",
    questionTextEn: "What is the purpose of a real estate appraisal?",
    questionTextEs: "¿Cuál es el propósito de una tasación de bienes raíces?",
    optionsEn: ["To determine the fair market value of a property", "To inspect for defects", "To determine property taxes", "To measure the property"],
    optionsEs: ["Determinar el valor justo de mercado de una propiedad", "Inspeccionar por defectos", "Determinar impuestos sobre la propiedad", "Medir la propiedad"],
    correctAnswer: 0,
    explanationEn: "An appraisal is an unbiased professional opinion of a property's fair market value.",
    explanationEs: "Una tasación es una opinión profesional imparcial del valor justo de mercado de una propiedad."
  },
  {
    category: "real_estate",
    questionTextEn: "The sales comparison approach to value uses:",
    questionTextEs: "El enfoque de comparación de ventas para el valor utiliza:",
    optionsEn: ["Recent sales of similar properties to estimate value", "The cost to build the property", "The income the property generates", "Government assessments only"],
    optionsEs: ["Ventas recientes de propiedades similares para estimar el valor", "El costo de construir la propiedad", "Los ingresos que genera la propiedad", "Solo evaluaciones del gobierno"],
    correctAnswer: 0,
    explanationEn: "The sales comparison approach estimates value by comparing the subject property to similar properties that have recently sold.",
    explanationEs: "El enfoque de comparación de ventas estima el valor comparando la propiedad sujeto con propiedades similares que se han vendido recientemente."
  },
  {
    category: "real_estate",
    questionTextEn: "The cost approach to value is based on:",
    questionTextEs: "El enfoque de costo para el valor se basa en:",
    optionsEn: ["The cost to replace or reproduce the property minus depreciation, plus land value", "Comparable sales only", "Rental income", "Tax assessments"],
    optionsEs: ["El costo de reemplazar o reproducir la propiedad menos depreciación, más valor del terreno", "Solo ventas comparables", "Ingresos por alquiler", "Evaluaciones fiscales"],
    correctAnswer: 0,
    explanationEn: "The cost approach estimates value by calculating the cost to replace the improvements, subtracting depreciation, and adding land value.",
    explanationEs: "El enfoque de costo estima el valor calculando el costo de reemplazar las mejoras, restando la depreciación y agregando el valor del terreno."
  },
  {
    category: "real_estate",
    questionTextEn: "The income approach to value is used primarily for:",
    questionTextEs: "El enfoque de ingresos para el valor se utiliza principalmente para:",
    optionsEn: ["Investment and income-producing properties", "Single-family homes only", "Vacant land only", "New construction only"],
    optionsEs: ["Propiedades de inversión y productoras de ingresos", "Solo casas unifamiliares", "Solo terrenos vacíos", "Solo nueva construcción"],
    correctAnswer: 0,
    explanationEn: "The income approach is primarily used to value income-producing properties based on the income they generate.",
    explanationEs: "El enfoque de ingresos se utiliza principalmente para valorar propiedades productoras de ingresos basándose en los ingresos que generan."
  },
  {
    category: "real_estate",
    questionTextEn: "What is a Comparative Market Analysis (CMA)?",
    questionTextEs: "¿Qué es un Análisis Comparativo de Mercado (CMA)?",
    optionsEn: ["An informal estimate of property value prepared by a real estate agent", "An official appraisal", "A government assessment", "A title search"],
    optionsEs: ["Una estimación informal del valor de la propiedad preparada por un agente de bienes raíces", "Una tasación oficial", "Una evaluación del gobierno", "Una búsqueda de título"],
    correctAnswer: 0,
    explanationEn: "A CMA is an informal estimate of market value based on sales of comparable properties, prepared by a real estate agent.",
    explanationEs: "Un CMA es una estimación informal del valor de mercado basada en ventas de propiedades comparables, preparada por un agente de bienes raíces."
  },
  {
    category: "real_estate",
    questionTextEn: "What is depreciation in real estate?",
    questionTextEs: "¿Qué es la depreciación en bienes raíces?",
    optionsEn: ["The loss of value due to physical deterioration, functional obsolescence, or external factors", "An increase in value", "The mortgage balance", "Property taxes"],
    optionsEs: ["La pérdida de valor debido a deterioro físico, obsolescencia funcional o factores externos", "Un aumento en el valor", "El saldo de la hipoteca", "Impuestos sobre la propiedad"],
    correctAnswer: 0,
    explanationEn: "Depreciation is the loss of property value due to physical wear, outdated features, or external factors.",
    explanationEs: "La depreciación es la pérdida del valor de la propiedad debido al desgaste físico, características obsoletas o factores externos."
  },
  {
    category: "real_estate",
    questionTextEn: "What is functional obsolescence?",
    questionTextEs: "¿Qué es la obsolescencia funcional?",
    optionsEn: ["A loss of value due to outdated design or features", "Physical damage to the property", "Neighborhood decline", "Market appreciation"],
    optionsEs: ["Una pérdida de valor debido a diseño o características obsoletas", "Daño físico a la propiedad", "Deterioro del vecindario", "Apreciación del mercado"],
    correctAnswer: 0,
    explanationEn: "Functional obsolescence is the loss of value due to outdated or inefficient design, layout, or features.",
    explanationEs: "La obsolescencia funcional es la pérdida de valor debido a diseño, distribución o características obsoletas o ineficientes."
  },
  {
    category: "real_estate",
    questionTextEn: "What is external obsolescence?",
    questionTextEs: "¿Qué es la obsolescencia externa?",
    optionsEn: ["A loss of value due to factors outside the property", "Outdated appliances", "Physical deterioration", "Poor maintenance"],
    optionsEs: ["Una pérdida de valor debido a factores fuera de la propiedad", "Electrodomésticos obsoletos", "Deterioro físico", "Mal mantenimiento"],
    correctAnswer: 0,
    explanationEn: "External obsolescence is the loss of value caused by factors outside the property, such as neighborhood decline or economic conditions.",
    explanationEs: "La obsolescencia externa es la pérdida de valor causada por factores fuera de la propiedad, como el deterioro del vecindario o condiciones económicas."
  },
  {
    category: "real_estate",
    questionTextEn: "What is market value?",
    questionTextEs: "¿Qué es el valor de mercado?",
    optionsEn: ["The most probable price a property would bring in a competitive market", "The asking price", "The tax assessed value", "The original purchase price"],
    optionsEs: ["El precio más probable que una propiedad obtendría en un mercado competitivo", "El precio de venta", "El valor tasado para impuestos", "El precio de compra original"],
    correctAnswer: 0,
    explanationEn: "Market value is the most probable price a property would sell for in a competitive, open market with informed buyers and sellers.",
    explanationEs: "El valor de mercado es el precio más probable por el que una propiedad se vendería en un mercado competitivo y abierto con compradores y vendedores informados."
  },
  {
    category: "real_estate",
    questionTextEn: "What is the capitalization rate (cap rate)?",
    questionTextEs: "¿Qué es la tasa de capitalización (cap rate)?",
    optionsEn: ["Net operating income divided by property value or price", "The interest rate on a mortgage", "The tax rate", "The appreciation rate"],
    optionsEs: ["Ingreso operativo neto dividido por el valor o precio de la propiedad", "La tasa de interés de una hipoteca", "La tasa de impuestos", "La tasa de apreciación"],
    correctAnswer: 0,
    explanationEn: "The cap rate is calculated by dividing the net operating income by the property's value, used to evaluate investment properties.",
    explanationEs: "La tasa de capitalización se calcula dividiendo el ingreso operativo neto por el valor de la propiedad, usado para evaluar propiedades de inversión."
  },
  // Property Disclosure and Condition (Questions 66-85)
  {
    category: "real_estate",
    questionTextEn: "Under Texas law, sellers must disclose:",
    questionTextEs: "Según la ley de Texas, los vendedores deben divulgar:",
    optionsEn: ["Known material defects affecting the property", "The original purchase price", "Names of previous owners", "Future development plans nearby"],
    optionsEs: ["Defectos materiales conocidos que afectan la propiedad", "El precio de compra original", "Nombres de propietarios anteriores", "Planes de desarrollo futuro cercanos"],
    correctAnswer: 0,
    explanationEn: "Texas law requires sellers to disclose known material defects that could affect the property's value or the buyer's decision.",
    explanationEs: "La ley de Texas requiere que los vendedores divulguen defectos materiales conocidos que podrían afectar el valor de la propiedad o la decisión del comprador."
  },
  {
    category: "real_estate",
    questionTextEn: "Which properties are exempt from the Texas Seller's Disclosure requirement?",
    questionTextEs: "¿Qué propiedades están exentas del requisito de Divulgación del Vendedor de Texas?",
    optionsEn: ["Foreclosures, new construction by a builder, and transfers by court order", "All residential properties", "Properties under $100,000", "Properties over 50 years old"],
    optionsEs: ["Ejecuciones hipotecarias, nueva construcción por un constructor y transferencias por orden judicial", "Todas las propiedades residenciales", "Propiedades menores de $100,000", "Propiedades de más de 50 años"],
    correctAnswer: 0,
    explanationEn: "Certain transfers are exempt from disclosure requirements, including foreclosures, new construction, and court-ordered transfers.",
    explanationEs: "Ciertas transferencias están exentas de requisitos de divulgación, incluyendo ejecuciones hipotecarias, nueva construcción y transferencias ordenadas por el tribunal."
  },
  {
    category: "real_estate",
    questionTextEn: "What must be disclosed about lead-based paint?",
    questionTextEs: "¿Qué debe divulgarse sobre la pintura a base de plomo?",
    optionsEn: ["Known presence of lead-based paint in homes built before 1978", "All paint colors used", "The brand of paint", "Nothing is required"],
    optionsEs: ["Presencia conocida de pintura a base de plomo en casas construidas antes de 1978", "Todos los colores de pintura usados", "La marca de pintura", "No se requiere nada"],
    correctAnswer: 0,
    explanationEn: "Federal law requires disclosure of known lead-based paint hazards for residential properties built before 1978.",
    explanationEs: "La ley federal requiere la divulgación de peligros conocidos de pintura a base de plomo para propiedades residenciales construidas antes de 1978."
  },
  {
    category: "real_estate",
    questionTextEn: "What is a home inspection?",
    questionTextEs: "¿Qué es una inspección de vivienda?",
    optionsEn: ["A professional evaluation of the home's physical condition", "An appraisal", "A title search", "A survey"],
    optionsEs: ["Una evaluación profesional de la condición física de la casa", "Una tasación", "Una búsqueda de título", "Un levantamiento topográfico"],
    correctAnswer: 0,
    explanationEn: "A home inspection is a professional evaluation of a property's physical condition, typically including structure, systems, and components.",
    explanationEs: "Una inspección de vivienda es una evaluación profesional de la condición física de una propiedad, típicamente incluyendo estructura, sistemas y componentes."
  },
  {
    category: "real_estate",
    questionTextEn: "What is radon?",
    questionTextEs: "¿Qué es el radón?",
    optionsEn: ["A naturally occurring radioactive gas that can accumulate in buildings", "A type of mold", "A building material", "A pesticide"],
    optionsEs: ["Un gas radiactivo de origen natural que puede acumularse en edificios", "Un tipo de moho", "Un material de construcción", "Un pesticida"],
    correctAnswer: 0,
    explanationEn: "Radon is a colorless, odorless radioactive gas that can seep into buildings from the ground and pose health risks.",
    explanationEs: "El radón es un gas radiactivo incoloro e inodoro que puede filtrarse en edificios desde el suelo y representar riesgos para la salud."
  },
  {
    category: "real_estate",
    questionTextEn: "What is the purpose of a survey in real estate?",
    questionTextEs: "¿Cuál es el propósito de un levantamiento topográfico en bienes raíces?",
    optionsEn: ["To determine property boundaries and identify encroachments", "To determine property value", "To inspect the home's condition", "To test for radon"],
    optionsEs: ["Determinar los límites de la propiedad e identificar invasiones", "Determinar el valor de la propiedad", "Inspeccionar la condición de la casa", "Probar para radón"],
    correctAnswer: 0,
    explanationEn: "A survey identifies property boundaries, improvements, easements, and any encroachments on the property.",
    explanationEs: "Un levantamiento topográfico identifica los límites de la propiedad, mejoras, servidumbres y cualquier invasión en la propiedad."
  },
  {
    category: "real_estate",
    questionTextEn: "What is an encroachment?",
    questionTextEs: "¿Qué es una invasión?",
    optionsEn: ["When a structure or improvement illegally extends onto another's property", "A type of easement", "A mortgage term", "A zoning violation"],
    optionsEs: ["Cuando una estructura o mejora se extiende ilegalmente a la propiedad de otro", "Un tipo de servidumbre", "Un término hipotecario", "Una violación de zonificación"],
    correctAnswer: 0,
    explanationEn: "An encroachment occurs when a structure, fence, or other improvement extends beyond property boundaries onto neighboring land.",
    explanationEs: "Una invasión ocurre cuando una estructura, cerca u otra mejora se extiende más allá de los límites de la propiedad hacia terreno vecino."
  },
  {
    category: "real_estate",
    questionTextEn: "What should be disclosed about a property in a flood zone?",
    questionTextEs: "¿Qué debe divulgarse sobre una propiedad en una zona de inundación?",
    optionsEn: ["That the property is in a designated flood zone and may require flood insurance", "Nothing special is required", "Only if there has been flooding", "Only for commercial properties"],
    optionsEs: ["Que la propiedad está en una zona de inundación designada y puede requerir seguro contra inundaciones", "No se requiere nada especial", "Solo si ha habido inundaciones", "Solo para propiedades comerciales"],
    correctAnswer: 0,
    explanationEn: "Properties in FEMA-designated flood zones must be disclosed, and flood insurance may be required for mortgage approval.",
    explanationEs: "Las propiedades en zonas de inundación designadas por FEMA deben ser divulgadas, y puede requerirse seguro contra inundaciones para la aprobación de la hipoteca."
  },
  {
    category: "real_estate",
    questionTextEn: "What is asbestos?",
    questionTextEs: "¿Qué es el asbesto?",
    optionsEn: ["A hazardous mineral fiber once used in building materials", "A type of mold", "A foundation material", "A roofing style"],
    optionsEs: ["Una fibra mineral peligrosa una vez usada en materiales de construcción", "Un tipo de moho", "Un material de cimentación", "Un estilo de techo"],
    correctAnswer: 0,
    explanationEn: "Asbestos is a hazardous mineral fiber that was commonly used in building materials and can cause serious health issues when disturbed.",
    explanationEs: "El asbesto es una fibra mineral peligrosa que fue comúnmente usada en materiales de construcción y puede causar serios problemas de salud cuando se perturba."
  },
  {
    category: "real_estate",
    questionTextEn: "What is the purpose of title insurance?",
    questionTextEs: "¿Cuál es el propósito del seguro de título?",
    optionsEn: ["To protect against defects or claims against the property's title", "To insure against property damage", "To cover mortgage payments", "To pay property taxes"],
    optionsEs: ["Proteger contra defectos o reclamos contra el título de la propiedad", "Asegurar contra daños a la propiedad", "Cubrir pagos de hipoteca", "Pagar impuestos sobre la propiedad"],
    correctAnswer: 0,
    explanationEn: "Title insurance protects against financial loss from defects in the title or unknown liens and encumbrances.",
    explanationEs: "El seguro de título protege contra pérdida financiera por defectos en el título o gravámenes y cargas desconocidos."
  },
  // Fair Housing and Ethics (Questions 76-90)
  {
    category: "real_estate",
    questionTextEn: "The Fair Housing Act prohibits discrimination based on:",
    questionTextEs: "La Ley de Vivienda Justa prohíbe la discriminación basada en:",
    optionsEn: ["Race, color, religion, national origin, sex, familial status, and disability", "Income level", "Credit score", "Employment history"],
    optionsEs: ["Raza, color, religión, origen nacional, sexo, estado familiar y discapacidad", "Nivel de ingresos", "Puntaje de crédito", "Historial de empleo"],
    correctAnswer: 0,
    explanationEn: "The Fair Housing Act protects seven classes: race, color, religion, national origin, sex, familial status, and disability.",
    explanationEs: "La Ley de Vivienda Justa protege siete clases: raza, color, religión, origen nacional, sexo, estado familiar y discapacidad."
  },
  {
    category: "real_estate",
    questionTextEn: "What is steering in real estate?",
    questionTextEs: "¿Qué es el direccionamiento en bienes raíces?",
    optionsEn: ["Directing buyers to or away from certain neighborhoods based on protected characteristics", "Guiding buyers through the purchase process", "Marketing properties online", "Setting property prices"],
    optionsEs: ["Dirigir compradores hacia o lejos de ciertos vecindarios basándose en características protegidas", "Guiar compradores a través del proceso de compra", "Comercializar propiedades en línea", "Establecer precios de propiedades"],
    correctAnswer: 0,
    explanationEn: "Steering is the illegal practice of directing buyers toward or away from neighborhoods based on race or other protected characteristics.",
    explanationEs: "El direccionamiento es la práctica ilegal de dirigir compradores hacia o lejos de vecindarios basándose en raza u otras características protegidas."
  },
  {
    category: "real_estate",
    questionTextEn: "What is blockbusting?",
    questionTextEs: "¿Qué es el blockbusting?",
    optionsEn: ["Inducing panic selling by suggesting that protected classes are moving into an area", "Building large developments", "Buying foreclosed properties", "Investing in real estate"],
    optionsEs: ["Inducir ventas por pánico sugiriendo que clases protegidas se están mudando a un área", "Construir grandes desarrollos", "Comprar propiedades en ejecución hipotecaria", "Invertir en bienes raíces"],
    correctAnswer: 0,
    explanationEn: "Blockbusting is the illegal practice of inducing homeowners to sell by suggesting that members of protected classes are moving into the area.",
    explanationEs: "El blockbusting es la práctica ilegal de inducir a propietarios a vender sugiriendo que miembros de clases protegidas se están mudando al área."
  },
  {
    category: "real_estate",
    questionTextEn: "What is redlining?",
    questionTextEs: "¿Qué es el redlining?",
    optionsEn: ["Refusing to provide services to certain geographic areas based on demographics", "Drawing property boundaries", "Creating marketing materials", "Setting interest rates"],
    optionsEs: ["Negarse a proporcionar servicios a ciertas áreas geográficas basándose en demografía", "Dibujar límites de propiedades", "Crear materiales de marketing", "Establecer tasas de interés"],
    correctAnswer: 0,
    explanationEn: "Redlining is the illegal practice of refusing to provide services in certain areas based on the racial or ethnic composition of those areas.",
    explanationEs: "El redlining es la práctica ilegal de negarse a proporcionar servicios en ciertas áreas basándose en la composición racial o étnica de esas áreas."
  },
  {
    category: "real_estate",
    questionTextEn: "Under Fair Housing, which of the following IS permitted?",
    questionTextEs: "Según la Vivienda Justa, ¿cuál de las siguientes está permitida?",
    optionsEn: ["Requiring higher income qualifications for all applicants equally", "Refusing to rent to families with children", "Advertising for tenants of a specific religion", "Charging higher rent based on national origin"],
    optionsEs: ["Requerir calificaciones de ingresos más altos para todos los solicitantes por igual", "Negarse a alquilar a familias con niños", "Anunciar para inquilinos de una religión específica", "Cobrar alquiler más alto basándose en origen nacional"],
    correctAnswer: 0,
    explanationEn: "Income requirements are permitted as long as they are applied equally to all applicants and are not used as a pretext for discrimination.",
    explanationEs: "Los requisitos de ingresos están permitidos siempre que se apliquen por igual a todos los solicitantes y no se usen como pretexto para discriminación."
  },
  {
    category: "real_estate",
    questionTextEn: "The Americans with Disabilities Act (ADA) requires:",
    questionTextEs: "La Ley de Estadounidenses con Discapacidades (ADA) requiere:",
    optionsEn: ["Reasonable accommodations for persons with disabilities in public accommodations", "All homes to have elevators", "All properties to be wheelchair accessible", "Special parking only"],
    optionsEs: ["Acomodaciones razonables para personas con discapacidades en lugares públicos", "Que todas las casas tengan elevadores", "Que todas las propiedades sean accesibles para sillas de ruedas", "Solo estacionamiento especial"],
    correctAnswer: 0,
    explanationEn: "The ADA requires reasonable accommodations and accessibility modifications in places of public accommodation.",
    explanationEs: "La ADA requiere acomodaciones razonables y modificaciones de accesibilidad en lugares de acomodación pública."
  },
  {
    category: "real_estate",
    questionTextEn: "What is a reasonable accommodation under Fair Housing?",
    questionTextEs: "¿Qué es una acomodación razonable según la Vivienda Justa?",
    optionsEn: ["A change in rules, policies, or services to allow a disabled person equal housing opportunity", "A rent reduction", "A security deposit waiver", "A lease termination"],
    optionsEs: ["Un cambio en reglas, políticas o servicios para permitir a una persona discapacitada igualdad de oportunidad de vivienda", "Una reducción de alquiler", "Una exención del depósito de seguridad", "Una terminación de arrendamiento"],
    correctAnswer: 0,
    explanationEn: "A reasonable accommodation is a change in rules, policies, or services that enables a person with a disability to have equal housing opportunities.",
    explanationEs: "Una acomodación razonable es un cambio en reglas, políticas o servicios que permite a una persona con discapacidad tener igualdad de oportunidades de vivienda."
  },
  {
    category: "real_estate",
    questionTextEn: "What is the penalty for violating the Fair Housing Act?",
    questionTextEs: "¿Cuál es la penalidad por violar la Ley de Vivienda Justa?",
    optionsEn: ["Civil fines, damages, and possible criminal penalties", "Only a warning", "No penalties exist", "Automatic license revocation only"],
    optionsEs: ["Multas civiles, daños y posibles penalidades criminales", "Solo una advertencia", "No existen penalidades", "Solo revocación automática de licencia"],
    correctAnswer: 0,
    explanationEn: "Fair Housing violations can result in civil fines up to $100,000+, actual and punitive damages, and possible criminal penalties.",
    explanationEs: "Las violaciones de Vivienda Justa pueden resultar en multas civiles de hasta $100,000+, daños reales y punitivos, y posibles penalidades criminales."
  },
  {
    category: "real_estate",
    questionTextEn: "Which agency enforces Fair Housing laws?",
    questionTextEs: "¿Qué agencia hace cumplir las leyes de Vivienda Justa?",
    optionsEn: ["HUD (Department of Housing and Urban Development)", "FBI", "IRS", "SEC"],
    optionsEs: ["HUD (Departamento de Vivienda y Desarrollo Urbano)", "FBI", "IRS", "SEC"],
    correctAnswer: 0,
    explanationEn: "The U.S. Department of Housing and Urban Development (HUD) is the primary federal agency enforcing Fair Housing laws.",
    explanationEs: "El Departamento de Vivienda y Desarrollo Urbano de EE.UU. (HUD) es la principal agencia federal que hace cumplir las leyes de Vivienda Justa."
  },
  {
    category: "real_estate",
    questionTextEn: "A real estate licensee must treat all parties to a transaction:",
    questionTextEs: "Un licenciatario de bienes raíces debe tratar a todas las partes de una transacción:",
    optionsEn: ["Honestly and fairly", "Equally in all respects", "As fiduciaries", "With no obligations"],
    optionsEs: ["Honesta y justamente", "Igualmente en todos los aspectos", "Como fiduciarios", "Sin obligaciones"],
    correctAnswer: 0,
    explanationEn: "All parties must be treated honestly and fairly, though fiduciary duties are owed only to the client.",
    explanationEs: "Todas las partes deben ser tratadas honesta y justamente, aunque los deberes fiduciarios se deben solo al cliente."
  },
  // Closing and Settlement (Questions 86-100)
  {
    category: "real_estate",
    questionTextEn: "Who typically attends a real estate closing in Texas?",
    questionTextEs: "¿Quién típicamente asiste a un cierre de bienes raíces en Texas?",
    optionsEn: ["Buyer, seller, real estate agents, title company representative, and lender representative", "Only the buyer", "Only the seller", "Only the agents"],
    optionsEs: ["Comprador, vendedor, agentes de bienes raíces, representante de la compañía de títulos y representante del prestamista", "Solo el comprador", "Solo el vendedor", "Solo los agentes"],
    correctAnswer: 0,
    explanationEn: "Texas closings typically involve the buyer, seller, their agents, a title company representative, and often a lender representative.",
    explanationEs: "Los cierres en Texas típicamente involucran al comprador, vendedor, sus agentes, un representante de la compañía de títulos, y a menudo un representante del prestamista."
  },
  {
    category: "real_estate",
    questionTextEn: "What is the purpose of a title search?",
    questionTextEs: "¿Cuál es el propósito de una búsqueda de título?",
    optionsEn: ["To examine public records and verify the seller has clear title to transfer", "To determine property value", "To inspect the property condition", "To calculate closing costs"],
    optionsEs: ["Examinar registros públicos y verificar que el vendedor tiene título claro para transferir", "Determinar el valor de la propiedad", "Inspeccionar la condición de la propiedad", "Calcular costos de cierre"],
    correctAnswer: 0,
    explanationEn: "A title search examines public records to verify ownership and identify any liens, encumbrances, or defects in the title.",
    explanationEs: "Una búsqueda de título examina registros públicos para verificar la propiedad e identificar cualquier gravamen, carga o defecto en el título."
  },
  {
    category: "real_estate",
    questionTextEn: "What is proration at closing?",
    questionTextEs: "¿Qué es el prorrateo en el cierre?",
    optionsEn: ["Dividing expenses between buyer and seller based on the closing date", "Adding up all costs", "Calculating the commission", "Determining the loan amount"],
    optionsEs: ["Dividir gastos entre comprador y vendedor basándose en la fecha de cierre", "Sumar todos los costos", "Calcular la comisión", "Determinar el monto del préstamo"],
    correctAnswer: 0,
    explanationEn: "Proration is the process of dividing property expenses, such as taxes and HOA fees, between buyer and seller based on the closing date.",
    explanationEs: "El prorrateo es el proceso de dividir gastos de la propiedad, como impuestos y cuotas de HOA, entre comprador y vendedor basándose en la fecha de cierre."
  },
  {
    category: "real_estate",
    questionTextEn: "What document transfers title from seller to buyer?",
    questionTextEs: "¿Qué documento transfiere el título del vendedor al comprador?",
    optionsEn: ["The deed", "The mortgage", "The note", "The title insurance policy"],
    optionsEs: ["La escritura", "La hipoteca", "El pagaré", "La póliza de seguro de título"],
    correctAnswer: 0,
    explanationEn: "The deed is the legal document that transfers ownership of real property from the seller to the buyer.",
    explanationEs: "La escritura es el documento legal que transfiere la propiedad de bienes inmuebles del vendedor al comprador."
  },
  {
    category: "real_estate",
    questionTextEn: "What is a settlement statement?",
    questionTextEs: "¿Qué es una declaración de liquidación?",
    optionsEn: ["A document itemizing all costs and credits for buyer and seller at closing", "A loan application", "A purchase offer", "A listing agreement"],
    optionsEs: ["Un documento que detalla todos los costos y créditos para comprador y vendedor en el cierre", "Una solicitud de préstamo", "Una oferta de compra", "Un acuerdo de listado"],
    correctAnswer: 0,
    explanationEn: "The settlement statement (Closing Disclosure) itemizes all financial aspects of the transaction for both parties.",
    explanationEs: "La declaración de liquidación (Divulgación de Cierre) detalla todos los aspectos financieros de la transacción para ambas partes."
  },
  {
    category: "real_estate",
    questionTextEn: "When does ownership legally transfer in Texas?",
    questionTextEs: "¿Cuándo se transfiere legalmente la propiedad en Texas?",
    optionsEn: ["When the deed is delivered and accepted", "When the contract is signed", "When the money changes hands", "When the keys are handed over"],
    optionsEs: ["Cuando la escritura se entrega y acepta", "Cuando el contrato se firma", "Cuando el dinero cambia de manos", "Cuando se entregan las llaves"],
    correctAnswer: 0,
    explanationEn: "Ownership legally transfers when the deed is delivered to and accepted by the buyer.",
    explanationEs: "La propiedad se transfiere legalmente cuando la escritura se entrega y es aceptada por el comprador."
  },
  {
    category: "real_estate",
    questionTextEn: "What is recording a deed?",
    questionTextEs: "¿Qué es registrar una escritura?",
    optionsEn: ["Filing the deed in the county records to provide public notice of ownership", "Signing the deed", "Notarizing the deed", "Mailing the deed"],
    optionsEs: ["Archivar la escritura en los registros del condado para proporcionar aviso público de propiedad", "Firmar la escritura", "Notarizar la escritura", "Enviar la escritura por correo"],
    correctAnswer: 0,
    explanationEn: "Recording a deed means filing it with the county clerk's office to provide public notice of the ownership transfer.",
    explanationEs: "Registrar una escritura significa archivarla en la oficina del secretario del condado para proporcionar aviso público de la transferencia de propiedad."
  },
  {
    category: "real_estate",
    questionTextEn: "What are common buyer closing costs?",
    questionTextEs: "¿Cuáles son los costos de cierre comunes del comprador?",
    optionsEn: ["Loan origination fees, appraisal, title insurance, and prepaid items", "Real estate commission", "Seller's moving expenses", "Property repairs"],
    optionsEs: ["Cargos de originación del préstamo, tasación, seguro de título y artículos prepagados", "Comisión de bienes raíces", "Gastos de mudanza del vendedor", "Reparaciones de la propiedad"],
    correctAnswer: 0,
    explanationEn: "Buyer closing costs typically include loan fees, appraisal, title insurance, escrow setup, and prepaid items like taxes and insurance.",
    explanationEs: "Los costos de cierre del comprador típicamente incluyen cargos del préstamo, tasación, seguro de título, configuración de escrow y artículos prepagados como impuestos y seguro."
  },
  {
    category: "real_estate",
    questionTextEn: "What is a walk-through inspection?",
    questionTextEs: "¿Qué es una inspección de recorrido final?",
    optionsEn: ["A final inspection by the buyer before closing to verify property condition", "The initial home inspection", "The appraisal", "The title search"],
    optionsEs: ["Una inspección final por el comprador antes del cierre para verificar la condición de la propiedad", "La inspección inicial de la casa", "La tasación", "La búsqueda de título"],
    correctAnswer: 0,
    explanationEn: "The walk-through is a final inspection before closing to verify the property is in the agreed-upon condition.",
    explanationEs: "El recorrido final es una inspección final antes del cierre para verificar que la propiedad está en la condición acordada."
  },
  {
    category: "real_estate",
    questionTextEn: "What is a dry closing?",
    questionTextEs: "¿Qué es un cierre en seco?",
    optionsEn: ["A closing where documents are signed but funds are not yet disbursed", "A closing without a title company", "A closing without agents present", "A remote closing"],
    optionsEs: ["Un cierre donde los documentos se firman pero los fondos aún no se desembolsan", "Un cierre sin compañía de títulos", "Un cierre sin agentes presentes", "Un cierre remoto"],
    correctAnswer: 0,
    explanationEn: "A dry closing occurs when all documents are signed, but the funds are not disbursed until a later time.",
    explanationEs: "Un cierre en seco ocurre cuando todos los documentos se firman, pero los fondos no se desembolsan hasta un momento posterior."
  },
  // Land Use and Zoning (Questions 101-115)
  {
    category: "real_estate",
    questionTextEn: "What is zoning?",
    questionTextEs: "¿Qué es la zonificación?",
    optionsEn: ["Government regulation of land use within designated areas", "Property tax assessment", "Building inspection", "Title examination"],
    optionsEs: ["Regulación gubernamental del uso de terreno dentro de áreas designadas", "Evaluación de impuestos sobre la propiedad", "Inspección de edificios", "Examen de título"],
    correctAnswer: 0,
    explanationEn: "Zoning is a government regulation that divides land into zones and controls how property in each zone may be used.",
    explanationEs: "La zonificación es una regulación gubernamental que divide el terreno en zonas y controla cómo puede usarse la propiedad en cada zona."
  },
  {
    category: "real_estate",
    questionTextEn: "What is a variance in zoning?",
    questionTextEs: "¿Qué es una variación en zonificación?",
    optionsEn: ["Permission to deviate from zoning requirements", "A type of easement", "A deed restriction", "A building permit"],
    optionsEs: ["Permiso para desviarse de los requisitos de zonificación", "Un tipo de servidumbre", "Una restricción de escritura", "Un permiso de construcción"],
    correctAnswer: 0,
    explanationEn: "A variance is permission granted by a zoning board to deviate from strict zoning requirements due to hardship.",
    explanationEs: "Una variación es un permiso otorgado por una junta de zonificación para desviarse de los requisitos estrictos de zonificación debido a dificultades."
  },
  {
    category: "real_estate",
    questionTextEn: "What is a nonconforming use?",
    questionTextEs: "¿Qué es un uso no conforme?",
    optionsEn: ["A legal use that existed before a zoning change and is allowed to continue", "An illegal use of property", "A temporary use permit", "A conditional use"],
    optionsEs: ["Un uso legal que existía antes de un cambio de zonificación y se permite continuar", "Un uso ilegal de la propiedad", "Un permiso de uso temporal", "Un uso condicional"],
    correctAnswer: 0,
    explanationEn: "A nonconforming use is a property use that was legal when established but no longer conforms to current zoning, yet is allowed to continue.",
    explanationEs: "Un uso no conforme es un uso de propiedad que era legal cuando se estableció pero ya no cumple con la zonificación actual, pero se permite continuar."
  },
  {
    category: "real_estate",
    questionTextEn: "What are deed restrictions?",
    questionTextEs: "¿Qué son las restricciones de escritura?",
    optionsEn: ["Private limitations placed on property use by developers or previous owners", "Government zoning laws", "Building codes", "Tax assessments"],
    optionsEs: ["Limitaciones privadas sobre el uso de la propiedad por desarrolladores o propietarios anteriores", "Leyes de zonificación del gobierno", "Códigos de construcción", "Evaluaciones fiscales"],
    correctAnswer: 0,
    explanationEn: "Deed restrictions are private agreements that limit how property can be used, often imposed by developers.",
    explanationEs: "Las restricciones de escritura son acuerdos privados que limitan cómo puede usarse la propiedad, a menudo impuestas por desarrolladores."
  },
  {
    category: "real_estate",
    questionTextEn: "What is the difference between zoning and deed restrictions?",
    questionTextEs: "¿Cuál es la diferencia entre zonificación y restricciones de escritura?",
    optionsEn: ["Zoning is public law; deed restrictions are private agreements", "They are the same thing", "Deed restrictions are more powerful", "Zoning is optional"],
    optionsEs: ["La zonificación es ley pública; las restricciones de escritura son acuerdos privados", "Son lo mismo", "Las restricciones de escritura son más poderosas", "La zonificación es opcional"],
    correctAnswer: 0,
    explanationEn: "Zoning is government regulation while deed restrictions are private contractual limitations, though both may apply.",
    explanationEs: "La zonificación es regulación gubernamental mientras que las restricciones de escritura son limitaciones contractuales privadas, aunque ambas pueden aplicar."
  },
  {
    category: "real_estate",
    questionTextEn: "What is a building permit?",
    questionTextEs: "¿Qué es un permiso de construcción?",
    optionsEn: ["Official permission from the local government to construct or modify a building", "A zoning change", "A deed restriction", "A title policy"],
    optionsEs: ["Permiso oficial del gobierno local para construir o modificar un edificio", "Un cambio de zonificación", "Una restricción de escritura", "Una póliza de título"],
    correctAnswer: 0,
    explanationEn: "A building permit is authorization from local government allowing construction or renovation to proceed.",
    explanationEs: "Un permiso de construcción es una autorización del gobierno local que permite que la construcción o renovación proceda."
  },
  {
    category: "real_estate",
    questionTextEn: "What is a subdivision?",
    questionTextEs: "¿Qué es una subdivisión?",
    optionsEn: ["The division of land into smaller parcels for sale or development", "A type of zoning", "A mortgage", "A deed"],
    optionsEs: ["La división de terreno en parcelas más pequeñas para venta o desarrollo", "Un tipo de zonificación", "Una hipoteca", "Una escritura"],
    correctAnswer: 0,
    explanationEn: "A subdivision is the process of dividing a larger parcel of land into smaller lots for sale or development.",
    explanationEs: "Una subdivisión es el proceso de dividir una parcela de terreno más grande en lotes más pequeños para venta o desarrollo."
  },
  {
    category: "real_estate",
    questionTextEn: "What is a plat?",
    questionTextEs: "¿Qué es un plano de subdivisión?",
    optionsEn: ["A map showing the division of land into lots", "A deed", "A mortgage document", "An appraisal"],
    optionsEs: ["Un mapa que muestra la división del terreno en lotes", "Una escritura", "Un documento hipotecario", "Una tasación"],
    correctAnswer: 0,
    explanationEn: "A plat is a map of a subdivision showing individual lots, streets, easements, and other features.",
    explanationEs: "Un plano de subdivisión es un mapa de una subdivisión que muestra lotes individuales, calles, servidumbres y otras características."
  },
  {
    category: "real_estate",
    questionTextEn: "What is an environmental impact assessment?",
    questionTextEs: "¿Qué es una evaluación de impacto ambiental?",
    optionsEn: ["An evaluation of how a proposed development may affect the environment", "A property appraisal", "A home inspection", "A title search"],
    optionsEs: ["Una evaluación de cómo un desarrollo propuesto puede afectar el medio ambiente", "Una tasación de propiedad", "Una inspección de casa", "Una búsqueda de título"],
    correctAnswer: 0,
    explanationEn: "An environmental impact assessment evaluates the potential environmental effects of a proposed development project.",
    explanationEs: "Una evaluación de impacto ambiental evalúa los efectos ambientales potenciales de un proyecto de desarrollo propuesto."
  },
  {
    category: "real_estate",
    questionTextEn: "What is eminent domain used for?",
    questionTextEs: "¿Para qué se usa el dominio eminente?",
    optionsEn: ["Acquiring private property for public use such as roads, schools, or utilities", "Private development", "Personal use", "Commercial development only"],
    optionsEs: ["Adquirir propiedad privada para uso público como carreteras, escuelas o servicios públicos", "Desarrollo privado", "Uso personal", "Solo desarrollo comercial"],
    correctAnswer: 0,
    explanationEn: "Eminent domain allows government to take private property for public purposes like roads, utilities, and public buildings.",
    explanationEs: "El dominio eminente permite al gobierno tomar propiedad privada para propósitos públicos como carreteras, servicios públicos y edificios públicos."
  },
  // Property Management and Leasing (Questions 111-123)
  {
    category: "real_estate",
    questionTextEn: "What is a lease?",
    questionTextEs: "¿Qué es un arrendamiento?",
    optionsEn: ["A contract granting possession and use of property for a specified time in exchange for rent", "A deed", "A mortgage", "A sale agreement"],
    optionsEs: ["Un contrato que otorga posesión y uso de propiedad por un tiempo especificado a cambio de alquiler", "Una escritura", "Una hipoteca", "Un acuerdo de venta"],
    correctAnswer: 0,
    explanationEn: "A lease is a contract that grants the tenant the right to use and possess property for a specified period in exchange for rent.",
    explanationEs: "Un arrendamiento es un contrato que otorga al inquilino el derecho de usar y poseer propiedad por un período especificado a cambio de alquiler."
  },
  {
    category: "real_estate",
    questionTextEn: "What is the difference between a landlord and a lessor?",
    questionTextEs: "¿Cuál es la diferencia entre un arrendador y un lessor?",
    optionsEn: ["They mean the same thing - the owner who rents property to others", "Landlord owns; lessor manages", "Lessor is the tenant", "They are opposites"],
    optionsEs: ["Significan lo mismo - el propietario que alquila propiedad a otros", "El arrendador posee; el lessor administra", "El lessor es el inquilino", "Son opuestos"],
    correctAnswer: 0,
    explanationEn: "Landlord and lessor are interchangeable terms for the property owner who rents to a tenant (lessee).",
    explanationEs: "Arrendador y lessor son términos intercambiables para el propietario que alquila a un inquilino (arrendatario)."
  },
  {
    category: "real_estate",
    questionTextEn: "What is a security deposit?",
    questionTextEs: "¿Qué es un depósito de seguridad?",
    optionsEn: ["Money paid by tenant to cover potential damages or unpaid rent", "The first month's rent", "The commission", "The option fee"],
    optionsEs: ["Dinero pagado por el inquilino para cubrir daños potenciales o alquiler impago", "El primer mes de alquiler", "La comisión", "La tarifa de opción"],
    correctAnswer: 0,
    explanationEn: "A security deposit is money paid by a tenant to protect the landlord against property damage or unpaid rent.",
    explanationEs: "Un depósito de seguridad es dinero pagado por un inquilino para proteger al arrendador contra daños a la propiedad o alquiler impago."
  },
  {
    category: "real_estate",
    questionTextEn: "Under Texas law, how long does a landlord have to return a security deposit after move-out?",
    questionTextEs: "Según la ley de Texas, ¿cuánto tiempo tiene un arrendador para devolver un depósito de seguridad después de la mudanza?",
    optionsEn: ["30 days", "15 days", "60 days", "90 days"],
    optionsEs: ["30 días", "15 días", "60 días", "90 días"],
    correctAnswer: 0,
    explanationEn: "Texas law requires landlords to return security deposits within 30 days after the tenant surrenders the property.",
    explanationEs: "La ley de Texas requiere que los arrendadores devuelvan los depósitos de seguridad dentro de 30 días después de que el inquilino entregue la propiedad."
  },
  {
    category: "real_estate",
    questionTextEn: "What is a property manager's primary responsibility?",
    questionTextEs: "¿Cuál es la responsabilidad principal de un administrador de propiedades?",
    optionsEn: ["To manage property on behalf of the owner to maximize return on investment", "To sell the property", "To appraise the property", "To finance the property"],
    optionsEs: ["Administrar la propiedad en nombre del propietario para maximizar el retorno de la inversión", "Vender la propiedad", "Tasar la propiedad", "Financiar la propiedad"],
    correctAnswer: 0,
    explanationEn: "A property manager's primary duty is to manage property on behalf of the owner, including tenant relations, maintenance, and maximizing income.",
    explanationEs: "El deber principal de un administrador de propiedades es administrar la propiedad en nombre del propietario, incluyendo relaciones con inquilinos, mantenimiento y maximizar ingresos."
  },
  {
    category: "real_estate",
    questionTextEn: "What is an eviction?",
    questionTextEs: "¿Qué es un desalojo?",
    optionsEn: ["The legal process of removing a tenant from a property", "A lease renewal", "A security deposit refund", "A rent increase"],
    optionsEs: ["El proceso legal de remover a un inquilino de una propiedad", "Una renovación de arrendamiento", "Un reembolso de depósito de seguridad", "Un aumento de alquiler"],
    correctAnswer: 0,
    explanationEn: "Eviction is the legal process by which a landlord removes a tenant from rental property, typically for lease violations or nonpayment.",
    explanationEs: "El desalojo es el proceso legal por el cual un arrendador remueve a un inquilino de una propiedad de alquiler, típicamente por violaciones del arrendamiento o falta de pago."
  },
  {
    category: "real_estate",
    questionTextEn: "What type of lease has a specific beginning and ending date?",
    questionTextEs: "¿Qué tipo de arrendamiento tiene una fecha específica de inicio y fin?",
    optionsEn: ["Estate for years", "Estate at will", "Estate at sufferance", "Periodic tenancy"],
    optionsEs: ["Patrimonio por años", "Patrimonio a voluntad", "Patrimonio por tolerancia", "Tenencia periódica"],
    correctAnswer: 0,
    explanationEn: "An estate for years is a lease with a definite beginning and ending date, regardless of actual duration.",
    explanationEs: "Un patrimonio por años es un arrendamiento con una fecha de inicio y fin definida, independientemente de la duración real."
  },
  {
    category: "real_estate",
    questionTextEn: "What is gross rent multiplier (GRM)?",
    questionTextEs: "¿Qué es el multiplicador de alquiler bruto (GRM)?",
    optionsEn: ["Property price divided by annual gross rental income", "Monthly rent times 12", "Net operating income divided by price", "Cap rate times 100"],
    optionsEs: ["Precio de la propiedad dividido por el ingreso de alquiler bruto anual", "Alquiler mensual por 12", "Ingreso operativo neto dividido por precio", "Tasa de capitalización por 100"],
    correctAnswer: 0,
    explanationEn: "GRM is calculated by dividing the property price by the annual gross rental income, used to compare investment properties.",
    explanationEs: "El GRM se calcula dividiendo el precio de la propiedad por el ingreso de alquiler bruto anual, usado para comparar propiedades de inversión."
  },
  {
    category: "real_estate",
    questionTextEn: "What is the implied warranty of habitability?",
    questionTextEs: "¿Qué es la garantía implícita de habitabilidad?",
    optionsEn: ["The landlord's legal obligation to maintain rental property in livable condition", "A written lease requirement", "A tenant's responsibility", "An insurance policy"],
    optionsEs: ["La obligación legal del arrendador de mantener la propiedad de alquiler en condiciones habitables", "Un requisito de arrendamiento escrito", "Una responsabilidad del inquilino", "Una póliza de seguro"],
    correctAnswer: 0,
    explanationEn: "The implied warranty of habitability requires landlords to maintain rental properties in a condition fit for human habitation.",
    explanationEs: "La garantía implícita de habitabilidad requiere que los arrendadores mantengan las propiedades de alquiler en una condición apta para habitación humana."
  },
  {
    category: "real_estate",
    questionTextEn: "What is a triple net (NNN) lease?",
    questionTextEs: "¿Qué es un arrendamiento triple neto (NNN)?",
    optionsEn: ["A lease where the tenant pays rent plus property taxes, insurance, and maintenance", "A lease with three tenants", "A three-year lease", "A residential lease type"],
    optionsEs: ["Un arrendamiento donde el inquilino paga alquiler más impuestos sobre la propiedad, seguro y mantenimiento", "Un arrendamiento con tres inquilinos", "Un arrendamiento de tres años", "Un tipo de arrendamiento residencial"],
    correctAnswer: 0,
    explanationEn: "A triple net lease requires the tenant to pay base rent plus property taxes, insurance, and maintenance costs.",
    explanationEs: "Un arrendamiento triple neto requiere que el inquilino pague alquiler base más impuestos sobre la propiedad, seguro y costos de mantenimiento."
  },
  {
    category: "real_estate",
    questionTextEn: "What is constructive eviction?",
    questionTextEs: "¿Qué es el desalojo constructivo?",
    optionsEn: ["When a landlord's actions or neglect make the property uninhabitable, forcing the tenant to leave", "A formal eviction notice", "A lease termination by the tenant", "A court-ordered eviction"],
    optionsEs: ["Cuando las acciones o negligencia del arrendador hacen la propiedad inhabitable, forzando al inquilino a irse", "Un aviso formal de desalojo", "Una terminación de arrendamiento por el inquilino", "Un desalojo ordenado por el tribunal"],
    correctAnswer: 0,
    explanationEn: "Constructive eviction occurs when the landlord's actions or failure to act renders the property uninhabitable.",
    explanationEs: "El desalojo constructivo ocurre cuando las acciones del arrendador o la falta de actuar hacen la propiedad inhabitable."
  },
  {
    category: "real_estate",
    questionTextEn: "What is a month-to-month tenancy?",
    questionTextEs: "¿Qué es una tenencia de mes a mes?",
    optionsEn: ["A periodic tenancy that automatically renews each month until terminated", "A one-month lease", "A commercial lease only", "A sublease"],
    optionsEs: ["Una tenencia periódica que se renueva automáticamente cada mes hasta terminarla", "Un arrendamiento de un mes", "Solo un arrendamiento comercial", "Un subarrendamiento"],
    correctAnswer: 0,
    explanationEn: "A month-to-month tenancy is a periodic tenancy that renews automatically each month until properly terminated.",
    explanationEs: "Una tenencia de mes a mes es una tenencia periódica que se renueva automáticamente cada mes hasta que se termine apropiadamente."
  },
  {
    category: "real_estate",
    questionTextEn: "In Texas, a sales agent must work under:",
    questionTextEs: "En Texas, un agente de ventas debe trabajar bajo:",
    optionsEn: ["A licensed broker", "Another sales agent", "TREC directly", "The Texas Association of Realtors"],
    optionsEs: ["Un corredor licenciado", "Otro agente de ventas", "TREC directamente", "La Asociación de Realtors de Texas"],
    correctAnswer: 0,
    explanationEn: "All Texas sales agents must be sponsored by and work under a licensed broker.",
    explanationEs: "Todos los agentes de ventas de Texas deben ser patrocinados y trabajar bajo un corredor licenciado."
  }
];

async function seedAdditionalRealEstateQuestions() {
  console.log("Seeding additional Real Estate questions...");
  
  try {
    for (const question of additionalRealEstateQuestions) {
      await db.insert(questions).values(question);
    }
    console.log(`Successfully added ${additionalRealEstateQuestions.length} Real Estate questions`);
  } catch (error) {
    console.error("Error seeding Real Estate questions:", error);
    throw error;
  }
}

seedAdditionalRealEstateQuestions()
  .then(() => {
    console.log("Real Estate question seeding complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed to seed Real Estate questions:", error);
    process.exit(1);
  });
