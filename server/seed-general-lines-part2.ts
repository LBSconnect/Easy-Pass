import { db } from "./db";
import { questions, type InsertQuestion } from "@shared/schema";

const generalLinesQuestions: InsertQuestion[] = [
  {
    category: "general_lines",
    questionTextEn: "What is a waiver of subrogation?",
    questionTextEs: "¿Qué es una renuncia de subrogación?",
    optionsEn: ["A type of coverage", "An agreement where the insurer gives up the right to recover from a third party", "A premium discount", "A deductible waiver"],
    optionsEs: ["Un tipo de cobertura", "Un acuerdo donde el asegurador renuncia al derecho de recuperar de un tercero", "Un descuento de prima", "Una exención de deducible"],
    correctAnswer: 1,
    explanationEn: "A waiver of subrogation is an endorsement where the insurer agrees not to pursue recovery from a specific third party after paying a claim.",
    explanationEs: "Una renuncia de subrogación es un endoso donde el asegurador acepta no buscar recuperación de un tercero específico después de pagar un reclamo."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the purpose of a commercial property policy?",
    questionTextEs: "¿Cuál es el propósito de una póliza de propiedad comercial?",
    optionsEn: ["To cover employee injuries", "To protect business property from physical damage", "To provide life insurance", "To cover auto accidents"],
    optionsEs: ["Cubrir lesiones de empleados", "Proteger la propiedad comercial de daños físicos", "Proporcionar seguro de vida", "Cubrir accidentes de auto"],
    correctAnswer: 1,
    explanationEn: "A commercial property policy protects business property, including buildings, equipment, and inventory, from covered perils.",
    explanationEs: "Una póliza de propiedad comercial protege la propiedad comercial, incluyendo edificios, equipos e inventario, de riesgos cubiertos."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the liberalization clause in a property policy?",
    questionTextEs: "¿Qué es la cláusula de liberalización en una póliza de propiedad?",
    optionsEn: ["A clause that increases premiums", "A clause that extends benefits if coverage is broadened during the policy term", "A clause that reduces coverage", "A cancellation clause"],
    optionsEs: ["Una cláusula que aumenta las primas", "Una cláusula que extiende beneficios si la cobertura se amplía durante el término de la póliza", "Una cláusula que reduce la cobertura", "Una cláusula de cancelación"],
    correctAnswer: 1,
    explanationEn: "The liberalization clause automatically extends the benefit of any coverage improvements made by the insurer during the policy period without additional premium.",
    explanationEs: "La cláusula de liberalización extiende automáticamente el beneficio de cualquier mejora de cobertura hecha por el asegurador durante el período de la póliza sin prima adicional."
  },
  {
    category: "general_lines",
    questionTextEn: "What does the term 'aggregate limit' mean in liability insurance?",
    questionTextEs: "¿Qué significa el término 'límite agregado' en el seguro de responsabilidad?",
    optionsEn: ["The per-claim limit", "The maximum amount the insurer will pay for all claims during the policy period", "The deductible amount", "The minimum coverage required"],
    optionsEs: ["El límite por reclamo", "La cantidad máxima que el asegurador pagará por todos los reclamos durante el período de la póliza", "El monto del deducible", "La cobertura mínima requerida"],
    correctAnswer: 1,
    explanationEn: "The aggregate limit is the maximum total amount the insurer will pay for all covered claims during a policy period.",
    explanationEs: "El límite agregado es la cantidad total máxima que el asegurador pagará por todos los reclamos cubiertos durante un período de póliza."
  },
  {
    category: "general_lines",
    questionTextEn: "What is vicarious liability?",
    questionTextEs: "¿Qué es la responsabilidad vicaria?",
    optionsEn: ["Personal liability only", "Liability for the actions of another person, such as an employee", "Product liability", "Property liability"],
    optionsEs: ["Solo responsabilidad personal", "Responsabilidad por las acciones de otra persona, como un empleado", "Responsabilidad por productos", "Responsabilidad de propiedad"],
    correctAnswer: 1,
    explanationEn: "Vicarious liability holds one party responsible for the actions of another, such as an employer being liable for employee actions within the scope of employment.",
    explanationEs: "La responsabilidad vicaria hace responsable a una parte por las acciones de otra, como un empleador siendo responsable de las acciones de un empleado dentro del alcance del empleo."
  },
  {
    category: "general_lines",
    questionTextEn: "What is a schedule in an insurance policy?",
    questionTextEs: "¿Qué es un anexo en una póliza de seguro?",
    optionsEn: ["A payment plan", "A list of covered items, locations, or values specific to the policy", "A cancellation date", "A type of coverage"],
    optionsEs: ["Un plan de pago", "Una lista de artículos cubiertos, ubicaciones o valores específicos de la póliza", "Una fecha de cancelación", "Un tipo de cobertura"],
    correctAnswer: 1,
    explanationEn: "A schedule is a document attached to a policy listing specific items, locations, values, or other details particular to that policy.",
    explanationEs: "Un anexo es un documento adjunto a una póliza que lista artículos específicos, ubicaciones, valores u otros detalles particulares de esa póliza."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the duty to defend in liability insurance?",
    questionTextEs: "¿Qué es el deber de defender en el seguro de responsabilidad?",
    optionsEn: ["The insured's obligation to fight claims", "The insurer's obligation to provide legal defense for covered claims", "The agent's duty", "A premium requirement"],
    optionsEs: ["La obligación del asegurado de combatir reclamos", "La obligación del asegurador de proporcionar defensa legal para reclamos cubiertos", "El deber del agente", "Un requisito de prima"],
    correctAnswer: 1,
    explanationEn: "The duty to defend is the insurer's contractual obligation to provide legal defense for the insured when a covered claim or lawsuit is filed.",
    explanationEs: "El deber de defender es la obligación contractual del asegurador de proporcionar defensa legal para el asegurado cuando se presenta un reclamo o demanda cubierta."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the difference between a broker and an agent in Texas?",
    questionTextEs: "¿Cuál es la diferencia entre un corredor y un agente en Texas?",
    optionsEn: ["No difference", "A broker represents the insured; an agent represents the insurance company", "A broker sells only life insurance", "An agent cannot sell commercial insurance"],
    optionsEs: ["Sin diferencia", "Un corredor representa al asegurado; un agente representa a la compañía de seguros", "Un corredor solo vende seguros de vida", "Un agente no puede vender seguros comerciales"],
    correctAnswer: 1,
    explanationEn: "In Texas, a broker legally represents the client/insured, while an agent represents the insurance company in transactions.",
    explanationEs: "En Texas, un corredor representa legalmente al cliente/asegurado, mientras que un agente representa a la compañía de seguros en transacciones."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the Texas Department of Insurance (TDI)?",
    questionTextEs: "¿Qué es el Departamento de Seguros de Texas (TDI)?",
    optionsEn: ["A private insurance company", "The state agency that regulates the insurance industry in Texas", "A federal agency", "An insurance trade association"],
    optionsEs: ["Una compañía de seguros privada", "La agencia estatal que regula la industria de seguros en Texas", "Una agencia federal", "Una asociación comercial de seguros"],
    correctAnswer: 1,
    explanationEn: "TDI is the Texas state agency responsible for regulating the insurance industry, licensing agents, and protecting consumers.",
    explanationEs: "TDI es la agencia estatal de Texas responsable de regular la industria de seguros, licenciar agentes y proteger a los consumidores."
  },
  {
    category: "general_lines",
    questionTextEn: "What is twisting in insurance?",
    questionTextEs: "¿Qué es el 'twisting' en seguros?",
    optionsEn: ["A legal sales practice", "Using misrepresentation to induce a policyholder to replace an existing policy", "A type of endorsement", "A coverage modification"],
    optionsEs: ["Una práctica de ventas legal", "Usar tergiversación para inducir a un titular de póliza a reemplazar una póliza existente", "Un tipo de endoso", "Una modificación de cobertura"],
    correctAnswer: 1,
    explanationEn: "Twisting is an illegal practice involving misrepresentation to induce a policyholder to lapse, forfeit, or surrender an existing policy to purchase a new one.",
    explanationEs: "El twisting es una práctica ilegal que involucra tergiversación para inducir a un titular de póliza a dejar vencer, perder o rendir una póliza existente para comprar una nueva."
  },
  {
    category: "general_lines",
    questionTextEn: "What is churning in insurance?",
    questionTextEs: "¿Qué es el 'churning' en seguros?",
    optionsEn: ["A type of coverage", "Excessive replacement of policies to generate commissions", "A premium payment method", "A claims process"],
    optionsEs: ["Un tipo de cobertura", "Reemplazo excesivo de pólizas para generar comisiones", "Un método de pago de prima", "Un proceso de reclamos"],
    correctAnswer: 1,
    explanationEn: "Churning is the unethical practice of repeatedly replacing insurance policies primarily to generate commission income for the agent.",
    explanationEs: "El churning es la práctica poco ética de reemplazar repetidamente pólizas de seguro principalmente para generar ingresos por comisiones para el agente."
  },
  {
    category: "general_lines",
    questionTextEn: "What is rebating in insurance?",
    questionTextEs: "¿Qué es el 'rebating' en seguros?",
    optionsEn: ["A type of discount", "Giving part of the agent's commission back to the insured as an inducement to purchase", "A premium refund", "A claims payment"],
    optionsEs: ["Un tipo de descuento", "Dar parte de la comisión del agente al asegurado como incentivo para comprar", "Un reembolso de prima", "Un pago de reclamos"],
    correctAnswer: 1,
    explanationEn: "Rebating is the illegal practice of giving any portion of an agent's commission or something of value to the insured as an inducement to purchase insurance.",
    explanationEs: "El rebating es la práctica ilegal de dar cualquier porción de la comisión de un agente o algo de valor al asegurado como incentivo para comprar seguro."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the difference between fraud and misrepresentation?",
    questionTextEs: "¿Cuál es la diferencia entre fraude y tergiversación?",
    optionsEn: ["No difference", "Fraud involves intentional deception; misrepresentation may be unintentional", "Misrepresentation is always criminal", "Fraud only applies to claims"],
    optionsEs: ["Sin diferencia", "El fraude involucra engaño intencional; la tergiversación puede ser no intencional", "La tergiversación siempre es criminal", "El fraude solo aplica a reclamos"],
    correctAnswer: 1,
    explanationEn: "Fraud involves intentional deception for gain, while misrepresentation can be either intentional or unintentional false statements.",
    explanationEs: "El fraude involucra engaño intencional para obtener ganancia, mientras que la tergiversación puede ser declaraciones falsas intencionales o no intencionales."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the purpose of a reservation of rights letter?",
    questionTextEs: "¿Cuál es el propósito de una carta de reserva de derechos?",
    optionsEn: ["To accept a claim", "To notify the insured that the insurer is investigating coverage while defending the claim", "To cancel the policy", "To increase premiums"],
    optionsEs: ["Aceptar un reclamo", "Notificar al asegurado que el asegurador está investigando la cobertura mientras defiende el reclamo", "Cancelar la póliza", "Aumentar las primas"],
    correctAnswer: 1,
    explanationEn: "A reservation of rights letter notifies the insured that the insurer is providing a defense but reserves the right to later deny coverage based on policy terms.",
    explanationEs: "Una carta de reserva de derechos notifica al asegurado que el asegurador está proporcionando una defensa pero se reserva el derecho de luego denegar la cobertura basándose en los términos de la póliza."
  },
  {
    category: "general_lines",
    questionTextEn: "What is an admitted insurance company?",
    questionTextEs: "¿Qué es una compañía de seguros admitida?",
    optionsEn: ["Any insurance company", "A company licensed to write insurance in a particular state", "A company that admits claims", "A surplus lines insurer"],
    optionsEs: ["Cualquier compañía de seguros", "Una compañía autorizada para escribir seguros en un estado particular", "Una compañía que admite reclamos", "Un asegurador de líneas excedentes"],
    correctAnswer: 1,
    explanationEn: "An admitted insurer is licensed by the state to sell insurance and is subject to state regulations and guaranty fund protection.",
    explanationEs: "Un asegurador admitido está autorizado por el estado para vender seguros y está sujeto a regulaciones estatales y protección del fondo de garantía."
  },
  {
    category: "general_lines",
    questionTextEn: "What is surplus lines insurance?",
    questionTextEs: "¿Qué es el seguro de líneas excedentes?",
    optionsEn: ["Extra coverage", "Insurance from non-admitted carriers for risks that admitted insurers won't cover", "Excess liability insurance", "Life insurance"],
    optionsEs: ["Cobertura extra", "Seguro de aseguradores no admitidos para riesgos que los aseguradores admitidos no cubrirán", "Seguro de responsabilidad excedente", "Seguro de vida"],
    correctAnswer: 1,
    explanationEn: "Surplus lines insurance is coverage placed with non-admitted insurers for risks that cannot be placed with admitted carriers in the standard market.",
    explanationEs: "El seguro de líneas excedentes es cobertura colocada con aseguradores no admitidos para riesgos que no pueden colocarse con aseguradores admitidos en el mercado estándar."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the Texas Windstorm Insurance Association (TWIA)?",
    questionTextEs: "¿Qué es la Asociación de Seguros contra Tormentas de Viento de Texas (TWIA)?",
    optionsEn: ["A private insurer", "A state-created pool providing wind and hail coverage in designated coastal areas", "A federal program", "A liability insurer"],
    optionsEs: ["Un asegurador privado", "Un fondo creado por el estado que proporciona cobertura de viento y granizo en áreas costeras designadas", "Un programa federal", "Un asegurador de responsabilidad"],
    correctAnswer: 1,
    explanationEn: "TWIA is a residual market mechanism created by the Texas Legislature to provide wind and hail coverage in designated catastrophe areas along the coast.",
    explanationEs: "TWIA es un mecanismo de mercado residual creado por la Legislatura de Texas para proporcionar cobertura de viento y granizo en áreas de catástrofe designadas a lo largo de la costa."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the FAIR Plan?",
    questionTextEs: "¿Qué es el Plan FAIR?",
    optionsEn: ["A discount program", "A program providing basic property insurance to those who cannot obtain coverage in the standard market", "A life insurance plan", "An auto insurance program"],
    optionsEs: ["Un programa de descuento", "Un programa que proporciona seguro de propiedad básico a aquellos que no pueden obtener cobertura en el mercado estándar", "Un plan de seguro de vida", "Un programa de seguro de auto"],
    correctAnswer: 1,
    explanationEn: "FAIR (Fair Access to Insurance Requirements) Plans are state-mandated programs that provide basic property insurance to property owners who cannot find coverage in the standard market.",
    explanationEs: "Los Planes FAIR (Acceso Justo a Requisitos de Seguro) son programas mandados por el estado que proporcionan seguro de propiedad básico a propietarios que no pueden encontrar cobertura en el mercado estándar."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the National Flood Insurance Program (NFIP)?",
    questionTextEs: "¿Qué es el Programa Nacional de Seguro contra Inundaciones (NFIP)?",
    optionsEn: ["A private insurance program", "A federal program providing flood insurance in participating communities", "A state program", "An excess flood program"],
    optionsEs: ["Un programa de seguro privado", "Un programa federal que proporciona seguro contra inundaciones en comunidades participantes", "Un programa estatal", "Un programa de inundación excedente"],
    correctAnswer: 1,
    explanationEn: "The NFIP is a federal program administered by FEMA that provides flood insurance to property owners in participating communities.",
    explanationEs: "El NFIP es un programa federal administrado por FEMA que proporciona seguro contra inundaciones a propietarios de propiedades en comunidades participantes."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the purpose of the declarations page in an insurance policy?",
    questionTextEs: "¿Cuál es el propósito de la página de declaraciones en una póliza de seguro?",
    optionsEn: ["To list exclusions", "To summarize key policy information such as named insured, coverage limits, and premium", "To define terms", "To list claims"],
    optionsEs: ["Listar exclusiones", "Resumir información clave de la póliza como el asegurado nombrado, límites de cobertura y prima", "Definir términos", "Listar reclamos"],
    correctAnswer: 1,
    explanationEn: "The declarations page (dec page) provides a summary of the policy including the named insured, policy period, coverage amounts, deductibles, and premium.",
    explanationEs: "La página de declaraciones proporciona un resumen de la póliza incluyendo el asegurado nombrado, período de la póliza, montos de cobertura, deducibles y prima."
  },
  {
    category: "general_lines",
    questionTextEn: "What are policy conditions?",
    questionTextEs: "¿Qué son las condiciones de la póliza?",
    optionsEn: ["Types of coverage", "Provisions that describe the rights and duties of both the insurer and the insured", "Exclusions", "Endorsements"],
    optionsEs: ["Tipos de cobertura", "Disposiciones que describen los derechos y deberes tanto del asegurador como del asegurado", "Exclusiones", "Endosos"],
    correctAnswer: 1,
    explanationEn: "Policy conditions are provisions that describe the responsibilities and requirements of both the insurer and insured, such as notice requirements and cooperation duties.",
    explanationEs: "Las condiciones de la póliza son disposiciones que describen las responsabilidades y requisitos tanto del asegurador como del asegurado, como requisitos de aviso y deberes de cooperación."
  },
  {
    category: "general_lines",
    questionTextEn: "What is concurrent causation?",
    questionTextEs: "¿Qué es la causación concurrente?",
    optionsEn: ["A type of policy", "When two or more causes contribute to a loss, one covered and one excluded", "A claims process", "A premium calculation"],
    optionsEs: ["Un tipo de póliza", "Cuando dos o más causas contribuyen a una pérdida, una cubierta y una excluida", "Un proceso de reclamos", "Un cálculo de prima"],
    correctAnswer: 1,
    explanationEn: "Concurrent causation occurs when two or more causes (one covered, one excluded) contribute to a loss, potentially triggering coverage disputes.",
    explanationEs: "La causación concurrente ocurre cuando dos o más causas (una cubierta, una excluida) contribuyen a una pérdida, potencialmente generando disputas de cobertura."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the proximate cause of loss?",
    questionTextEs: "¿Qué es la causa próxima de pérdida?",
    optionsEn: ["The last cause in a chain of events", "The primary cause that sets in motion an unbroken chain of events leading to a loss", "Any cause of loss", "An excluded cause"],
    optionsEs: ["La última causa en una cadena de eventos", "La causa primaria que pone en movimiento una cadena ininterrumpida de eventos que llevan a una pérdida", "Cualquier causa de pérdida", "Una causa excluida"],
    correctAnswer: 1,
    explanationEn: "Proximate cause is the primary cause that initiates an unbroken chain of events leading to a loss, used to determine coverage.",
    explanationEs: "La causa próxima es la causa primaria que inicia una cadena ininterrumpida de eventos que llevan a una pérdida, utilizada para determinar la cobertura."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the principle of indemnity?",
    questionTextEs: "¿Qué es el principio de indemnización?",
    optionsEn: ["To make the insured wealthy", "To restore the insured to the same financial position as before the loss", "To pay more than the loss", "To deny all claims"],
    optionsEs: ["Enriquecer al asegurado", "Restaurar al asegurado a la misma posición financiera que antes de la pérdida", "Pagar más que la pérdida", "Denegar todos los reclamos"],
    correctAnswer: 1,
    explanationEn: "The principle of indemnity ensures the insured is restored to their pre-loss financial condition, not better or worse.",
    explanationEs: "El principio de indemnización asegura que el asegurado sea restaurado a su condición financiera previa a la pérdida, no mejor ni peor."
  },
  {
    category: "general_lines",
    questionTextEn: "What is insurable interest?",
    questionTextEs: "¿Qué es el interés asegurable?",
    optionsEn: ["Interest earned on premiums", "A financial stake in the subject of insurance that would result in financial loss if damaged", "Interest in buying insurance", "A curiosity about insurance"],
    optionsEs: ["Interés ganado sobre primas", "Una participación financiera en el objeto del seguro que resultaría en pérdida financiera si se daña", "Interés en comprar seguro", "Una curiosidad sobre seguros"],
    correctAnswer: 1,
    explanationEn: "Insurable interest means the insured would suffer a financial loss if the insured property or person is damaged or dies.",
    explanationEs: "El interés asegurable significa que el asegurado sufriría una pérdida financiera si la propiedad o persona asegurada se daña o muere."
  },
  {
    category: "general_lines",
    questionTextEn: "What is utmost good faith in insurance?",
    questionTextEs: "¿Qué es la máxima buena fe en seguros?",
    optionsEn: ["A sales technique", "The requirement that both parties must deal honestly and disclose all material facts", "A type of policy", "A claims procedure"],
    optionsEs: ["Una técnica de ventas", "El requisito de que ambas partes deben actuar honestamente y revelar todos los hechos materiales", "Un tipo de póliza", "Un procedimiento de reclamos"],
    correctAnswer: 1,
    explanationEn: "Utmost good faith requires both the insurer and the insured to deal honestly and disclose all material information relevant to the insurance contract.",
    explanationEs: "La máxima buena fe requiere que tanto el asegurador como el asegurado actúen honestamente y revelen toda la información material relevante para el contrato de seguro."
  },
  {
    category: "general_lines",
    questionTextEn: "What is a material misrepresentation?",
    questionTextEs: "¿Qué es una tergiversación material?",
    optionsEn: ["A minor error", "A false statement that would affect the insurer's decision to issue or price the policy", "A premium calculation", "An endorsement"],
    optionsEs: ["Un error menor", "Una declaración falsa que afectaría la decisión del asegurador de emitir o fijar el precio de la póliza", "Un cálculo de prima", "Un endoso"],
    correctAnswer: 1,
    explanationEn: "A material misrepresentation is a false or misleading statement that would have influenced the insurer's decision to accept the risk or the terms of coverage.",
    explanationEs: "Una tergiversación material es una declaración falsa o engañosa que habría influido en la decisión del asegurador de aceptar el riesgo o los términos de la cobertura."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the difference between concealment and misrepresentation?",
    questionTextEs: "¿Cuál es la diferencia entre ocultación y tergiversación?",
    optionsEn: ["No difference", "Concealment is failure to disclose; misrepresentation is making a false statement", "Both are the same thing", "Concealment is always fraud"],
    optionsEs: ["Sin diferencia", "Ocultación es no revelar; tergiversación es hacer una declaración falsa", "Ambos son lo mismo", "Ocultación siempre es fraude"],
    correctAnswer: 1,
    explanationEn: "Concealment is the intentional failure to disclose material information, while misrepresentation is making a false or misleading statement.",
    explanationEs: "La ocultación es la falta intencional de revelar información material, mientras que la tergiversación es hacer una declaración falsa o engañosa."
  },
  {
    category: "general_lines",
    questionTextEn: "What is a warranty in an insurance contract?",
    questionTextEs: "¿Qué es una garantía en un contrato de seguro?",
    optionsEn: ["A type of coverage", "A statement or promise by the insured that must be strictly true for coverage to apply", "A premium discount", "An exclusion"],
    optionsEs: ["Un tipo de cobertura", "Una declaración o promesa del asegurado que debe ser estrictamente verdadera para que se aplique la cobertura", "Un descuento de prima", "Una exclusión"],
    correctAnswer: 1,
    explanationEn: "A warranty is a statement or promise made by the insured that must be strictly true, and a breach may void the policy.",
    explanationEs: "Una garantía es una declaración o promesa hecha por el asegurado que debe ser estrictamente verdadera, y una violación puede anular la póliza."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the adhesion characteristic of insurance contracts?",
    questionTextEs: "¿Qué es la característica de adhesión de los contratos de seguro?",
    optionsEn: ["Negotiated equally", "One party drafts the contract and the other must accept or reject it as written", "Both parties write the contract", "No standard forms are used"],
    optionsEs: ["Negociado igualmente", "Una parte redacta el contrato y la otra debe aceptarlo o rechazarlo como está escrito", "Ambas partes escriben el contrato", "No se usan formularios estándar"],
    correctAnswer: 1,
    explanationEn: "Insurance contracts are contracts of adhesion, meaning the insurer drafts the contract and the insured must accept or reject it without negotiation of terms.",
    explanationEs: "Los contratos de seguro son contratos de adhesión, lo que significa que el asegurador redacta el contrato y el asegurado debe aceptarlo o rechazarlo sin negociación de términos."
  },
  {
    category: "general_lines",
    questionTextEn: "What does 'aleatory' mean regarding insurance contracts?",
    questionTextEs: "¿Qué significa 'aleatorio' respecto a los contratos de seguro?",
    optionsEn: ["Equal exchange of value", "The amounts exchanged by the parties may be unequal depending on whether a loss occurs", "Guaranteed payments", "No risk involved"],
    optionsEs: ["Intercambio igual de valor", "Las cantidades intercambiadas por las partes pueden ser desiguales dependiendo de si ocurre una pérdida", "Pagos garantizados", "Sin riesgo involucrado"],
    correctAnswer: 1,
    explanationEn: "Aleatory means the value exchanged by the parties is unequal: the insured pays premiums, but the insurer may pay nothing or a large claim depending on losses.",
    explanationEs: "Aleatorio significa que el valor intercambiado por las partes es desigual: el asegurado paga primas, pero el asegurador puede no pagar nada o un gran reclamo dependiendo de las pérdidas."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the doctrine of reasonable expectations?",
    questionTextEs: "¿Qué es la doctrina de expectativas razonables?",
    optionsEn: ["Insurers expect premiums", "Courts may interpret policy language in favor of what a reasonable insured would expect", "Agents expect commissions", "Insurers control all interpretations"],
    optionsEs: ["Los aseguradores esperan primas", "Los tribunales pueden interpretar el lenguaje de la póliza a favor de lo que un asegurado razonable esperaría", "Los agentes esperan comisiones", "Los aseguradores controlan todas las interpretaciones"],
    correctAnswer: 1,
    explanationEn: "The doctrine of reasonable expectations holds that ambiguous policy language should be interpreted according to what a reasonable insured would expect.",
    explanationEs: "La doctrina de expectativas razonables sostiene que el lenguaje ambiguo de la póliza debe interpretarse según lo que un asegurado razonable esperaría."
  },
  {
    category: "general_lines",
    questionTextEn: "What is a valued policy?",
    questionTextEs: "¿Qué es una póliza valorada?",
    optionsEn: ["A policy with no value", "A policy that pays a predetermined amount in case of total loss", "A liability policy", "A term policy"],
    optionsEs: ["Una póliza sin valor", "Una póliza que paga una cantidad predeterminada en caso de pérdida total", "Una póliza de responsabilidad", "Una póliza a término"],
    correctAnswer: 1,
    explanationEn: "A valued policy pays a predetermined amount stated in the policy in the event of a total loss, regardless of actual cash value.",
    explanationEs: "Una póliza valorada paga una cantidad predeterminada indicada en la póliza en caso de una pérdida total, independientemente del valor real en efectivo."
  },
  {
    category: "general_lines",
    questionTextEn: "What is a self-insured retention (SIR)?",
    questionTextEs: "¿Qué es una retención autoasegurada (SIR)?",
    optionsEn: ["A type of coverage", "The amount the insured must pay before excess or umbrella coverage applies", "A premium payment", "An endorsement"],
    optionsEs: ["Un tipo de cobertura", "La cantidad que el asegurado debe pagar antes de que se aplique la cobertura excedente o paraguas", "Un pago de prima", "Un endoso"],
    correctAnswer: 1,
    explanationEn: "A self-insured retention is a dollar amount the insured is responsible for before excess or umbrella coverage begins to pay.",
    explanationEs: "Una retención autoasegurada es una cantidad en dólares de la cual el asegurado es responsable antes de que la cobertura excedente o paraguas comience a pagar."
  },
  {
    category: "general_lines",
    questionTextEn: "What is a captive insurance company?",
    questionTextEs: "¿Qué es una compañía de seguros cautiva?",
    optionsEn: ["An insurance company held hostage", "An insurance company created by a parent company to insure its own risks", "A standard insurer", "A surplus lines company"],
    optionsEs: ["Una compañía de seguros retenida como rehén", "Una compañía de seguros creada por una empresa matriz para asegurar sus propios riesgos", "Un asegurador estándar", "Una compañía de líneas excedentes"],
    correctAnswer: 1,
    explanationEn: "A captive insurance company is formed by a parent company or group to provide coverage primarily for the risks of its owner(s).",
    explanationEs: "Una compañía de seguros cautiva es formada por una empresa matriz o grupo para proporcionar cobertura principalmente para los riesgos de su(s) propietario(s)."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the purpose of reinsurance?",
    questionTextEs: "¿Cuál es el propósito del reaseguro?",
    optionsEn: ["To sell more insurance", "To allow insurers to transfer portions of their risk to other insurers", "To eliminate all risk", "To reduce premiums"],
    optionsEs: ["Vender más seguros", "Permitir que los aseguradores transfieran porciones de su riesgo a otros aseguradores", "Eliminar todo el riesgo", "Reducir las primas"],
    correctAnswer: 1,
    explanationEn: "Reinsurance allows primary insurers to transfer part of their risk exposure to other insurers, helping manage capacity and catastrophic losses.",
    explanationEs: "El reaseguro permite a los aseguradores primarios transferir parte de su exposición al riesgo a otros aseguradores, ayudando a gestionar la capacidad y las pérdidas catastróficas."
  },
  {
    category: "general_lines",
    questionTextEn: "What is facultative reinsurance?",
    questionTextEs: "¿Qué es el reaseguro facultativo?",
    optionsEn: ["Automatic reinsurance", "Reinsurance negotiated on a case-by-case basis for individual risks", "Group reinsurance", "Life reinsurance"],
    optionsEs: ["Reaseguro automático", "Reaseguro negociado caso por caso para riesgos individuales", "Reaseguro grupal", "Reaseguro de vida"],
    correctAnswer: 1,
    explanationEn: "Facultative reinsurance is arranged on a case-by-case basis where the reinsurer evaluates and chooses whether to accept each individual risk.",
    explanationEs: "El reaseguro facultativo se arregla caso por caso donde el reasegurador evalúa y elige si acepta cada riesgo individual."
  },
  {
    category: "general_lines",
    questionTextEn: "What is treaty reinsurance?",
    questionTextEs: "¿Qué es el reaseguro por tratado?",
    optionsEn: ["Case-by-case reinsurance", "An agreement where the reinsurer automatically accepts a portion of specified business", "International reinsurance only", "Property reinsurance only"],
    optionsEs: ["Reaseguro caso por caso", "Un acuerdo donde el reasegurador automáticamente acepta una porción del negocio especificado", "Solo reaseguro internacional", "Solo reaseguro de propiedad"],
    correctAnswer: 1,
    explanationEn: "Treaty reinsurance is an ongoing agreement where the reinsurer automatically accepts a defined share of the ceding company's specified business.",
    explanationEs: "El reaseguro por tratado es un acuerdo continuo donde el reasegurador automáticamente acepta una participación definida del negocio especificado de la compañía cedente."
  },
  {
    category: "general_lines",
    questionTextEn: "What is an occurrence in CGL policies?",
    questionTextEs: "¿Qué es una ocurrencia en las pólizas CGL?",
    optionsEn: ["A planned event", "An accident including continuous or repeated exposure to conditions causing injury or damage", "A claim", "A premium payment"],
    optionsEs: ["Un evento planificado", "Un accidente incluyendo exposición continua o repetida a condiciones que causan lesión o daño", "Un reclamo", "Un pago de prima"],
    correctAnswer: 1,
    explanationEn: "An occurrence is defined as an accident, including continuous or repeated exposure to substantially the same general harmful conditions.",
    explanationEs: "Una ocurrencia se define como un accidente, incluyendo exposición continua o repetida a sustancialmente las mismas condiciones dañinas generales."
  },
  {
    category: "general_lines",
    questionTextEn: "What is personal and advertising injury coverage in CGL?",
    questionTextEs: "¿Qué es la cobertura de lesiones personales y publicitarias en CGL?",
    optionsEn: ["Coverage for physical injuries", "Coverage for offenses like defamation, invasion of privacy, and copyright infringement", "Auto coverage", "Property coverage"],
    optionsEs: ["Cobertura para lesiones físicas", "Cobertura para ofensas como difamación, invasión de privacidad e infracción de derechos de autor", "Cobertura de auto", "Cobertura de propiedad"],
    correctAnswer: 1,
    explanationEn: "Personal and advertising injury coverage protects against non-physical offenses such as libel, slander, false arrest, and copyright infringement in advertising.",
    explanationEs: "La cobertura de lesiones personales y publicitarias protege contra ofensas no físicas como libelo, calumnia, arresto falso e infracción de derechos de autor en publicidad."
  },
  {
    category: "general_lines",
    questionTextEn: "What is premises liability?",
    questionTextEs: "¿Qué es la responsabilidad por instalaciones?",
    optionsEn: ["Product liability", "Liability for injuries occurring on property owned or occupied by the insured", "Auto liability", "Professional liability"],
    optionsEs: ["Responsabilidad por productos", "Responsabilidad por lesiones que ocurren en propiedad poseída u ocupada por el asegurado", "Responsabilidad de auto", "Responsabilidad profesional"],
    correctAnswer: 1,
    explanationEn: "Premises liability covers claims for bodily injury or property damage occurring on the insured's premises due to a dangerous condition.",
    explanationEs: "La responsabilidad por instalaciones cubre reclamos por lesiones corporales o daños a la propiedad que ocurren en las instalaciones del asegurado debido a una condición peligrosa."
  },
  {
    category: "general_lines",
    questionTextEn: "What is completed operations coverage?",
    questionTextEs: "¿Qué es la cobertura de operaciones completadas?",
    optionsEn: ["Coverage during work", "Liability coverage for injuries or damage arising from work completed away from the premises", "Property coverage", "Auto coverage"],
    optionsEs: ["Cobertura durante el trabajo", "Cobertura de responsabilidad para lesiones o daños que surgen de trabajo completado fuera de las instalaciones", "Cobertura de propiedad", "Cobertura de auto"],
    correctAnswer: 1,
    explanationEn: "Completed operations coverage provides liability protection for claims arising from work completed by the insured at a location away from the insured's premises.",
    explanationEs: "La cobertura de operaciones completadas proporciona protección de responsabilidad para reclamos que surgen de trabajo completado por el asegurado en una ubicación fuera de las instalaciones del asegurado."
  },
  {
    category: "general_lines",
    questionTextEn: "What is contractual liability?",
    questionTextEs: "¿Qué es la responsabilidad contractual?",
    optionsEn: ["Only statutory liability", "Liability assumed through a contract or agreement", "Product liability", "Auto liability"],
    optionsEs: ["Solo responsabilidad estatutaria", "Responsabilidad asumida a través de un contrato o acuerdo", "Responsabilidad por productos", "Responsabilidad de auto"],
    correctAnswer: 1,
    explanationEn: "Contractual liability is liability that the insured assumes under a contract, such as a hold harmless or indemnity agreement.",
    explanationEs: "La responsabilidad contractual es la responsabilidad que el asegurado asume bajo un contrato, como un acuerdo de exoneración o indemnización."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the pollution exclusion in CGL policies?",
    questionTextEs: "¿Qué es la exclusión de contaminación en las pólizas CGL?",
    optionsEn: ["Coverage for pollution", "An exclusion eliminating coverage for most pollution-related claims", "A premium surcharge", "An endorsement adding coverage"],
    optionsEs: ["Cobertura para contaminación", "Una exclusión que elimina la cobertura para la mayoría de los reclamos relacionados con contaminación", "Un recargo de prima", "Un endoso que agrega cobertura"],
    correctAnswer: 1,
    explanationEn: "The pollution exclusion eliminates coverage for bodily injury or property damage arising from the discharge, dispersal, or release of pollutants.",
    explanationEs: "La exclusión de contaminación elimina la cobertura para lesiones corporales o daños a la propiedad que surgen de la descarga, dispersión o liberación de contaminantes."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the expected or intended injury exclusion?",
    questionTextEs: "¿Qué es la exclusión de lesión esperada o intencional?",
    optionsEn: ["Coverage for intentional acts", "An exclusion for injury the insured expected or intended", "A premium calculation", "An endorsement"],
    optionsEs: ["Cobertura para actos intencionales", "Una exclusión para lesiones que el asegurado esperaba o pretendía", "Un cálculo de prima", "Un endoso"],
    correctAnswer: 1,
    explanationEn: "The expected or intended injury exclusion eliminates coverage for bodily injury or property damage that the insured expected or intended to cause.",
    explanationEs: "La exclusión de lesión esperada o intencional elimina la cobertura para lesiones corporales o daños a la propiedad que el asegurado esperaba o pretendía causar."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the care, custody, or control exclusion?",
    questionTextEs: "¿Qué es la exclusión de cuidado, custodia o control?",
    optionsEn: ["Coverage for property in your care", "An exclusion for property in the insured's care, custody, or control", "A premium discount", "An endorsement"],
    optionsEs: ["Cobertura para propiedad bajo su cuidado", "Una exclusión para propiedad bajo el cuidado, custodia o control del asegurado", "Un descuento de prima", "Un endoso"],
    correctAnswer: 1,
    explanationEn: "This exclusion eliminates liability coverage for damage to property in the insured's care, custody, or control, which should be covered by property or bailee coverage.",
    explanationEs: "Esta exclusión elimina la cobertura de responsabilidad por daños a la propiedad bajo el cuidado, custodia o control del asegurado, que debería estar cubierta por cobertura de propiedad o depositario."
  },
  {
    category: "general_lines",
    questionTextEn: "What is medical payments coverage in a CGL policy?",
    questionTextEs: "¿Qué es la cobertura de pagos médicos en una póliza CGL?",
    optionsEn: ["Coverage for employee injuries", "Coverage paying medical expenses for injuries to non-employees on the premises regardless of fault", "Health insurance", "Life insurance"],
    optionsEs: ["Cobertura para lesiones de empleados", "Cobertura que paga gastos médicos para lesiones a no empleados en las instalaciones sin importar la culpa", "Seguro de salud", "Seguro de vida"],
    correctAnswer: 1,
    explanationEn: "Medical payments coverage pays medical expenses for injuries to third parties on the insured's premises, regardless of fault, up to the policy limit.",
    explanationEs: "La cobertura de pagos médicos paga gastos médicos para lesiones a terceros en las instalaciones del asegurado, sin importar la culpa, hasta el límite de la póliza."
  }
];

export async function seedGeneralLinesPart2() {
  console.log("Seeding General Lines questions (Part 2)...");
  
  for (const question of generalLinesQuestions) {
    await db.insert(questions).values(question);
  }
  
  console.log(`Added ${generalLinesQuestions.length} General Lines questions`);
}

seedGeneralLinesPart2()
  .then(() => {
    console.log("General Lines Part 2 seeding completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error seeding General Lines Part 2:", error);
    process.exit(1);
  });
