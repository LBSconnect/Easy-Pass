import { db } from "./db";
import { questions } from "@shared/schema";

const generalLinesQuestions = [
  {
    category: "general_lines",
    questionTextEn: "What is fire legal liability coverage?",
    questionTextEs: "¿Qué es la cobertura de responsabilidad legal por incendio?",
    optionsEn: ["Coverage for the insured's property", "Coverage for damage to rented premises caused by fire", "Auto coverage", "Life insurance"],
    optionsEs: ["Cobertura para la propiedad del asegurado", "Cobertura por daños a instalaciones alquiladas causados por incendio", "Cobertura de auto", "Seguro de vida"],
    correctAnswer: 1,
    explanationEn: "Fire legal liability (damage to premises rented to you) coverage pays for fire damage to premises the insured rents or temporarily occupies.",
    explanationEs: "La cobertura de responsabilidad legal por incendio (daños a instalaciones alquiladas) paga por daños por incendio a instalaciones que el asegurado alquila u ocupa temporalmente."
  },
  {
    category: "general_lines",
    questionTextEn: "What is a commercial crime policy?",
    questionTextEs: "¿Qué es una póliza de crimen comercial?",
    optionsEn: ["Coverage for criminal defendants", "Coverage for losses caused by criminal acts against the business", "Auto coverage", "Life insurance"],
    optionsEs: ["Cobertura para acusados criminales", "Cobertura por pérdidas causadas por actos criminales contra el negocio", "Cobertura de auto", "Seguro de vida"],
    correctAnswer: 1,
    explanationEn: "A commercial crime policy covers losses from criminal acts including employee theft, forgery, computer fraud, and funds transfer fraud.",
    explanationEs: "Una póliza de crimen comercial cubre pérdidas por actos criminales incluyendo robo de empleados, falsificación, fraude informático y fraude de transferencia de fondos."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the difference between burglary and robbery?",
    questionTextEs: "¿Cuál es la diferencia entre allanamiento y robo?",
    optionsEn: ["No difference", "Burglary involves forced entry; robbery involves force or threat against a person", "Robbery requires forced entry", "Burglary requires a weapon"],
    optionsEs: ["Sin diferencia", "El allanamiento involucra entrada forzada; el robo involucra fuerza o amenaza contra una persona", "El robo requiere entrada forzada", "El allanamiento requiere un arma"],
    correctAnswer: 1,
    explanationEn: "Burglary involves unlawful entry with visible signs of forced entry, while robbery involves taking property by force, violence, or threat against a person.",
    explanationEs: "El allanamiento involucra entrada ilegal con signos visibles de entrada forzada, mientras que el robo involucra tomar propiedad por fuerza, violencia o amenaza contra una persona."
  },
  {
    category: "general_lines",
    questionTextEn: "What is employee dishonesty coverage?",
    questionTextEs: "¿Qué es la cobertura de deshonestidad de empleados?",
    optionsEn: ["Coverage for employee injuries", "Coverage for losses caused by dishonest acts of employees", "Health insurance", "Life insurance"],
    optionsEs: ["Cobertura para lesiones de empleados", "Cobertura por pérdidas causadas por actos deshonestos de empleados", "Seguro de salud", "Seguro de vida"],
    correctAnswer: 1,
    explanationEn: "Employee dishonesty coverage protects employers from losses caused by fraudulent or dishonest acts committed by employees.",
    explanationEs: "La cobertura de deshonestidad de empleados protege a los empleadores de pérdidas causadas por actos fraudulentos o deshonestos cometidos por empleados."
  },
  {
    category: "general_lines",
    questionTextEn: "What is computer fraud coverage?",
    questionTextEs: "¿Qué es la cobertura de fraude informático?",
    optionsEn: ["Coverage for computer hardware", "Coverage for losses from unauthorized computer access or theft of funds", "Property coverage for computers", "Life insurance"],
    optionsEs: ["Cobertura para hardware de computadora", "Cobertura por pérdidas de acceso no autorizado a computadoras o robo de fondos", "Cobertura de propiedad para computadoras", "Seguro de vida"],
    correctAnswer: 1,
    explanationEn: "Computer fraud coverage protects against loss of money or securities resulting from fraudulent computer entry or unauthorized computer access.",
    explanationEs: "La cobertura de fraude informático protege contra pérdida de dinero o valores resultante de entrada fraudulenta a computadoras o acceso no autorizado."
  },
  {
    category: "general_lines",
    questionTextEn: "What is social engineering fraud coverage?",
    questionTextEs: "¿Qué es la cobertura de fraude de ingeniería social?",
    optionsEn: ["Coverage for construction projects", "Coverage for losses from deceptive schemes that trick employees into transferring money", "Property coverage", "Auto coverage"],
    optionsEs: ["Cobertura para proyectos de construcción", "Cobertura por pérdidas de esquemas engañosos que engañan a empleados para transferir dinero", "Cobertura de propiedad", "Cobertura de auto"],
    correctAnswer: 1,
    explanationEn: "Social engineering fraud coverage protects against losses when employees are tricked into transferring money or securities through deceptive communications.",
    explanationEs: "La cobertura de fraude de ingeniería social protege contra pérdidas cuando empleados son engañados para transferir dinero o valores a través de comunicaciones engañosas."
  },
  {
    category: "general_lines",
    questionTextEn: "What is extra expense coverage?",
    questionTextEs: "¿Qué es la cobertura de gastos extra?",
    optionsEn: ["Coverage for luxury items", "Coverage for additional costs to continue operations after a covered loss", "Premium payments", "Deductible expenses"],
    optionsEs: ["Cobertura para artículos de lujo", "Cobertura para costos adicionales para continuar operaciones después de una pérdida cubierta", "Pagos de prima", "Gastos de deducible"],
    correctAnswer: 1,
    explanationEn: "Extra expense coverage pays for additional costs necessary to continue business operations while property is being repaired after a covered loss.",
    explanationEs: "La cobertura de gastos extra paga costos adicionales necesarios para continuar las operaciones del negocio mientras la propiedad está siendo reparada después de una pérdida cubierta."
  },
  {
    category: "general_lines",
    questionTextEn: "What is ordinance or law coverage?",
    questionTextEs: "¿Qué es la cobertura de ordenanza o ley?",
    optionsEn: ["Legal defense coverage", "Coverage for costs to comply with building codes when rebuilding after a loss", "Professional liability", "Auto coverage"],
    optionsEs: ["Cobertura de defensa legal", "Cobertura para costos de cumplir con códigos de construcción al reconstruir después de una pérdida", "Responsabilidad profesional", "Cobertura de auto"],
    correctAnswer: 1,
    explanationEn: "Ordinance or law coverage pays for increased costs to comply with current building codes and laws when repairing or rebuilding after a covered loss.",
    explanationEs: "La cobertura de ordenanza o ley paga por costos aumentados para cumplir con códigos de construcción y leyes actuales al reparar o reconstruir después de una pérdida cubierta."
  },
  {
    category: "general_lines",
    questionTextEn: "What is utility services coverage?",
    questionTextEs: "¿Qué es la cobertura de servicios públicos?",
    optionsEn: ["Coverage for utility company property", "Coverage for losses caused by interruption of utility services", "Life insurance", "Auto coverage"],
    optionsEs: ["Cobertura para propiedad de compañías de servicios públicos", "Cobertura por pérdidas causadas por interrupción de servicios públicos", "Seguro de vida", "Cobertura de auto"],
    correctAnswer: 1,
    explanationEn: "Utility services coverage pays for losses resulting from the interruption of utility services (power, water, communications) caused by damage to utility property.",
    explanationEs: "La cobertura de servicios públicos paga por pérdidas resultantes de la interrupción de servicios públicos (electricidad, agua, comunicaciones) causada por daños a la propiedad de servicios públicos."
  },
  {
    category: "general_lines",
    questionTextEn: "What is spoilage coverage?",
    questionTextEs: "¿Qué es la cobertura de deterioro?",
    optionsEn: ["Coverage for employee theft", "Coverage for loss of perishable goods due to temperature change or power failure", "Auto coverage", "Life insurance"],
    optionsEs: ["Cobertura para robo de empleados", "Cobertura por pérdida de bienes perecederos debido a cambio de temperatura o falla de energía", "Cobertura de auto", "Seguro de vida"],
    correctAnswer: 1,
    explanationEn: "Spoilage coverage protects against loss of perishable stock due to breakdown of refrigeration equipment, power failure, or temperature change.",
    explanationEs: "La cobertura de deterioro protege contra pérdida de stock perecedero debido a avería de equipo de refrigeración, falla de energía o cambio de temperatura."
  },
  {
    category: "general_lines",
    questionTextEn: "What is accounts receivable coverage?",
    questionTextEs: "¿Qué es la cobertura de cuentas por cobrar?",
    optionsEn: ["Coverage for debt collection", "Coverage for inability to collect accounts receivable due to loss of records", "Liability coverage", "Auto coverage"],
    optionsEs: ["Cobertura para cobro de deudas", "Cobertura por incapacidad de cobrar cuentas por cobrar debido a pérdida de registros", "Cobertura de responsabilidad", "Cobertura de auto"],
    correctAnswer: 1,
    explanationEn: "Accounts receivable coverage pays for losses when records are destroyed and the business cannot collect money owed by customers.",
    explanationEs: "La cobertura de cuentas por cobrar paga por pérdidas cuando los registros son destruidos y el negocio no puede cobrar dinero adeudado por clientes."
  },
  {
    category: "general_lines",
    questionTextEn: "What is valuable papers coverage?",
    questionTextEs: "¿Qué es la cobertura de documentos valiosos?",
    optionsEn: ["Coverage for currency", "Coverage for the cost to research, replace, or restore important documents", "Life insurance", "Auto coverage"],
    optionsEs: ["Cobertura para moneda", "Cobertura para el costo de investigar, reemplazar o restaurar documentos importantes", "Seguro de vida", "Cobertura de auto"],
    correctAnswer: 1,
    explanationEn: "Valuable papers coverage pays for the cost to research, replace, or restore valuable documents and records that are damaged or destroyed.",
    explanationEs: "La cobertura de documentos valiosos paga por el costo de investigar, reemplazar o restaurar documentos y registros valiosos que son dañados o destruidos."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the difference between scheduled and blanket coverage?",
    questionTextEs: "¿Cuál es la diferencia entre cobertura programada y general?",
    optionsEn: ["No difference", "Scheduled lists specific items with values; blanket covers multiple items under one limit", "Blanket is always more expensive", "Scheduled has no limits"],
    optionsEs: ["Sin diferencia", "Programada lista artículos específicos con valores; general cubre múltiples artículos bajo un límite", "General siempre es más cara", "Programada no tiene límites"],
    correctAnswer: 1,
    explanationEn: "Scheduled coverage lists specific items with individual values, while blanket coverage applies a single limit to multiple items or locations.",
    explanationEs: "La cobertura programada lista artículos específicos con valores individuales, mientras que la cobertura general aplica un solo límite a múltiples artículos o ubicaciones."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the purpose of a manuscript policy?",
    questionTextEs: "¿Cuál es el propósito de una póliza manuscrita?",
    optionsEn: ["A standard form policy", "A customized policy written for unique risks", "A life insurance policy", "An auto policy"],
    optionsEs: ["Una póliza de formulario estándar", "Una póliza personalizada escrita para riesgos únicos", "Una póliza de seguro de vida", "Una póliza de auto"],
    correctAnswer: 1,
    explanationEn: "A manuscript policy is a customized policy specifically drafted to address unique coverage needs that standard forms don't adequately cover.",
    explanationEs: "Una póliza manuscrita es una póliza personalizada específicamente redactada para abordar necesidades de cobertura únicas que los formularios estándar no cubren adecuadamente."
  },
  {
    category: "general_lines",
    questionTextEn: "What is ocean marine insurance?",
    questionTextEs: "¿Qué es el seguro marítimo oceánico?",
    optionsEn: ["Insurance for beach property", "Coverage for ships, cargo, and marine-related liabilities", "Flood insurance", "Life insurance"],
    optionsEs: ["Seguro para propiedad de playa", "Cobertura para barcos, carga y responsabilidades relacionadas con el mar", "Seguro contra inundaciones", "Seguro de vida"],
    correctAnswer: 1,
    explanationEn: "Ocean marine insurance covers ships, cargo, and liabilities associated with ocean-going vessels and international shipping.",
    explanationEs: "El seguro marítimo oceánico cubre barcos, carga y responsabilidades asociadas con embarcaciones oceánicas y envío internacional."
  },
  {
    category: "general_lines",
    questionTextEn: "What is hull insurance?",
    questionTextEs: "¿Qué es el seguro de casco?",
    optionsEn: ["Life insurance for sailors", "Coverage for the physical structure of a vessel", "Cargo coverage", "Liability coverage"],
    optionsEs: ["Seguro de vida para marineros", "Cobertura para la estructura física de una embarcación", "Cobertura de carga", "Cobertura de responsabilidad"],
    correctAnswer: 1,
    explanationEn: "Hull insurance covers physical damage to the vessel (ship's body and machinery) from covered perils.",
    explanationEs: "El seguro de casco cubre daños físicos a la embarcación (cuerpo del barco y maquinaria) de riesgos cubiertos."
  },
  {
    category: "general_lines",
    questionTextEn: "What is Protection and Indemnity (P&I) coverage?",
    questionTextEs: "¿Qué es la cobertura de Protección e Indemnización (P&I)?",
    optionsEn: ["Property coverage", "Marine liability coverage for bodily injury, property damage, and pollution", "Cargo coverage", "Hull coverage"],
    optionsEs: ["Cobertura de propiedad", "Cobertura de responsabilidad marítima para lesiones corporales, daños a la propiedad y contaminación", "Cobertura de carga", "Cobertura de casco"],
    correctAnswer: 1,
    explanationEn: "P&I coverage provides liability protection for shipowners covering bodily injury, property damage, collision liability, and pollution.",
    explanationEs: "La cobertura P&I proporciona protección de responsabilidad para propietarios de barcos cubriendo lesiones corporales, daños a la propiedad, responsabilidad por colisión y contaminación."
  },
  {
    category: "general_lines",
    questionTextEn: "What is general average in marine insurance?",
    questionTextEs: "¿Qué es la avería gruesa en el seguro marítimo?",
    optionsEn: ["An average claim", "A maritime law principle where all parties share in losses from voluntary sacrifice to save the voyage", "A premium calculation", "A deductible"],
    optionsEs: ["Un reclamo promedio", "Un principio de ley marítima donde todas las partes comparten pérdidas de sacrificio voluntario para salvar el viaje", "Un cálculo de prima", "Un deducible"],
    correctAnswer: 1,
    explanationEn: "General average is a maritime law principle requiring all parties (ship, cargo owners) to share proportionally in losses from deliberate sacrifice to save the voyage.",
    explanationEs: "La avería gruesa es un principio de ley marítima que requiere que todas las partes (barco, propietarios de carga) compartan proporcionalmente las pérdidas de sacrificio deliberado para salvar el viaje."
  },
  {
    category: "general_lines",
    questionTextEn: "What is aviation insurance?",
    questionTextEs: "¿Qué es el seguro de aviación?",
    optionsEn: ["Travel insurance", "Coverage for aircraft hull damage and aviation-related liabilities", "Auto insurance", "Life insurance"],
    optionsEs: ["Seguro de viaje", "Cobertura para daños al casco de aeronaves y responsabilidades relacionadas con la aviación", "Seguro de auto", "Seguro de vida"],
    correctAnswer: 1,
    explanationEn: "Aviation insurance covers aircraft physical damage (hull coverage), liability for passenger injuries and property damage, and other aviation-related risks.",
    explanationEs: "El seguro de aviación cubre daños físicos a aeronaves (cobertura de casco), responsabilidad por lesiones a pasajeros y daños a la propiedad, y otros riesgos relacionados con la aviación."
  },
  {
    category: "general_lines",
    questionTextEn: "What is a fiduciary bond?",
    questionTextEs: "¿Qué es una fianza fiduciaria?",
    optionsEn: ["A performance bond", "A bond guaranteeing faithful performance by persons in positions of trust", "A bid bond", "A payment bond"],
    optionsEs: ["Una fianza de cumplimiento", "Una fianza que garantiza el desempeño fiel de personas en posiciones de confianza", "Una fianza de licitación", "Una fianza de pago"],
    correctAnswer: 1,
    explanationEn: "A fiduciary bond guarantees faithful performance by a person in a position of trust, such as an executor, administrator, or trustee.",
    explanationEs: "Una fianza fiduciaria garantiza el desempeño fiel de una persona en una posición de confianza, como un ejecutor, administrador o fideicomisario."
  },
  {
    category: "general_lines",
    questionTextEn: "What is a court bond?",
    questionTextEs: "¿Qué es una fianza judicial?",
    optionsEn: ["A performance bond", "A bond required in judicial proceedings to guarantee performance of obligations", "A bid bond", "An employee bond"],
    optionsEs: ["Una fianza de cumplimiento", "Una fianza requerida en procedimientos judiciales para garantizar el cumplimiento de obligaciones", "Una fianza de licitación", "Una fianza de empleado"],
    correctAnswer: 1,
    explanationEn: "A court bond is required in judicial proceedings and guarantees that a party will fulfill certain obligations ordered by the court.",
    explanationEs: "Una fianza judicial es requerida en procedimientos judiciales y garantiza que una parte cumplirá ciertas obligaciones ordenadas por el tribunal."
  },
  {
    category: "general_lines",
    questionTextEn: "What is a license and permit bond?",
    questionTextEs: "¿Qué es una fianza de licencia y permiso?",
    optionsEn: ["A performance bond", "A bond required by government for licensees to ensure compliance with regulations", "A payment bond", "A fidelity bond"],
    optionsEs: ["Una fianza de cumplimiento", "Una fianza requerida por el gobierno para licenciatarios para asegurar cumplimiento con regulaciones", "Una fianza de pago", "Una fianza de fidelidad"],
    correctAnswer: 1,
    explanationEn: "License and permit bonds are required by government agencies and guarantee that licensees will comply with laws and regulations in their business activities.",
    explanationEs: "Las fianzas de licencia y permiso son requeridas por agencias gubernamentales y garantizan que los licenciatarios cumplirán con leyes y regulaciones en sus actividades comerciales."
  },
  {
    category: "general_lines",
    questionTextEn: "What is a public official bond?",
    questionTextEs: "¿Qué es una fianza de funcionario público?",
    optionsEn: ["A private bond", "A bond guaranteeing honest performance by elected or appointed officials", "A bid bond", "A payment bond"],
    optionsEs: ["Una fianza privada", "Una fianza que garantiza el desempeño honesto de funcionarios electos o nombrados", "Una fianza de licitación", "Una fianza de pago"],
    correctAnswer: 1,
    explanationEn: "A public official bond guarantees that elected or appointed public officials will faithfully and honestly perform their duties.",
    explanationEs: "Una fianza de funcionario público garantiza que los funcionarios públicos electos o nombrados desempeñarán sus deberes fielmente y honestamente."
  },
  {
    category: "general_lines",
    questionTextEn: "What is a lost instrument bond?",
    questionTextEs: "¿Qué es una fianza de instrumento perdido?",
    optionsEn: ["A musical instrument bond", "A bond protecting against claims from a lost negotiable instrument like a stock certificate", "A court bond", "A fidelity bond"],
    optionsEs: ["Una fianza de instrumento musical", "Una fianza que protege contra reclamos de un instrumento negociable perdido como un certificado de acciones", "Una fianza judicial", "Una fianza de fidelidad"],
    correctAnswer: 1,
    explanationEn: "A lost instrument bond protects an issuer when replacing lost, stolen, or destroyed negotiable instruments like stock certificates or bonds.",
    explanationEs: "Una fianza de instrumento perdido protege a un emisor al reemplazar instrumentos negociables perdidos, robados o destruidos como certificados de acciones o bonos."
  },
  {
    category: "general_lines",
    questionTextEn: "What is a motor carrier bond?",
    questionTextEs: "¿Qué es una fianza de transportista motorizado?",
    optionsEn: ["Auto insurance", "A bond required for trucking companies to guarantee cargo and liability obligations", "A personal bond", "A life insurance bond"],
    optionsEs: ["Seguro de auto", "Una fianza requerida para compañías de camiones para garantizar obligaciones de carga y responsabilidad", "Una fianza personal", "Una fianza de seguro de vida"],
    correctAnswer: 1,
    explanationEn: "A motor carrier bond is required by federal and state regulations for trucking companies to guarantee payment for cargo damage and liability claims.",
    explanationEs: "Una fianza de transportista motorizado es requerida por regulaciones federales y estatales para compañías de camiones para garantizar el pago por daños a la carga y reclamos de responsabilidad."
  },
  {
    category: "general_lines",
    questionTextEn: "What is commercial general liability limit per occurrence?",
    questionTextEs: "¿Qué es el límite por ocurrencia de responsabilidad general comercial?",
    optionsEn: ["The annual maximum", "The maximum the insurer will pay for any single occurrence", "The deductible", "The premium"],
    optionsEs: ["El máximo anual", "El máximo que el asegurador pagará por cualquier ocurrencia única", "El deducible", "La prima"],
    correctAnswer: 1,
    explanationEn: "The per occurrence limit is the maximum amount the insurer will pay for all bodily injury and property damage arising from a single occurrence.",
    explanationEs: "El límite por ocurrencia es la cantidad máxima que el asegurador pagará por todas las lesiones corporales y daños a la propiedad que surgen de una sola ocurrencia."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the products-completed operations aggregate limit?",
    questionTextEs: "¿Qué es el límite agregado de productos-operaciones completadas?",
    optionsEn: ["A per claim limit", "The maximum the insurer will pay for all products and completed operations claims in a policy period", "A deductible", "The premium"],
    optionsEs: ["Un límite por reclamo", "El máximo que el asegurador pagará por todos los reclamos de productos y operaciones completadas en un período de póliza", "Un deducible", "La prima"],
    correctAnswer: 1,
    explanationEn: "The products-completed operations aggregate is the maximum the insurer will pay for all products liability and completed operations claims during a policy period.",
    explanationEs: "El agregado de productos-operaciones completadas es el máximo que el asegurador pagará por todos los reclamos de responsabilidad por productos y operaciones completadas durante un período de póliza."
  },
  {
    category: "general_lines",
    questionTextEn: "What is a general aggregate limit?",
    questionTextEs: "¿Qué es un límite agregado general?",
    optionsEn: ["A per claim limit", "The maximum the insurer will pay for all covered claims (except products/completed operations) in a policy period", "A deductible", "The premium"],
    optionsEs: ["Un límite por reclamo", "El máximo que el asegurador pagará por todos los reclamos cubiertos (excepto productos/operaciones completadas) en un período de póliza", "Un deducible", "La prima"],
    correctAnswer: 1,
    explanationEn: "The general aggregate is the maximum the insurer will pay for all claims other than products-completed operations during a policy period.",
    explanationEs: "El agregado general es el máximo que el asegurador pagará por todos los reclamos excepto productos-operaciones completadas durante un período de póliza."
  },
  {
    category: "general_lines",
    questionTextEn: "What is defense cost coverage in liability insurance?",
    questionTextEs: "¿Qué es la cobertura de costos de defensa en el seguro de responsabilidad?",
    optionsEn: ["Military insurance", "Coverage for legal costs to defend against covered claims", "Property coverage", "Auto coverage"],
    optionsEs: ["Seguro militar", "Cobertura para costos legales de defender contra reclamos cubiertos", "Cobertura de propiedad", "Cobertura de auto"],
    correctAnswer: 1,
    explanationEn: "Defense cost coverage pays for attorneys' fees, court costs, and other expenses to defend against claims or lawsuits covered by the liability policy.",
    explanationEs: "La cobertura de costos de defensa paga por honorarios de abogados, costos judiciales y otros gastos para defender contra reclamos o demandas cubiertos por la póliza de responsabilidad."
  },
  {
    category: "general_lines",
    questionTextEn: "What does 'defense costs inside limits' mean?",
    questionTextEs: "¿Qué significa 'costos de defensa dentro de los límites'?",
    optionsEn: ["Defense costs are unlimited", "Defense costs reduce the available policy limits for claim payments", "Defense costs are not covered", "Defense costs are paid separately"],
    optionsEs: ["Los costos de defensa son ilimitados", "Los costos de defensa reducen los límites de póliza disponibles para pagos de reclamos", "Los costos de defensa no están cubiertos", "Los costos de defensa se pagan por separado"],
    correctAnswer: 1,
    explanationEn: "Defense costs inside limits means that attorneys' fees and defense expenses reduce the policy limits available to pay claims.",
    explanationEs: "Costos de defensa dentro de los límites significa que los honorarios de abogados y gastos de defensa reducen los límites de póliza disponibles para pagar reclamos."
  },
  {
    category: "general_lines",
    questionTextEn: "What is supplementary payments coverage in CGL?",
    questionTextEs: "¿Qué es la cobertura de pagos suplementarios en CGL?",
    optionsEn: ["Additional premium payments", "Coverage for expenses like bail bonds and loss of earnings in addition to defense costs", "Extra claim payments", "Premium refunds"],
    optionsEs: ["Pagos de prima adicionales", "Cobertura para gastos como fianzas y pérdida de ganancias además de costos de defensa", "Pagos de reclamos extra", "Reembolsos de prima"],
    correctAnswer: 1,
    explanationEn: "Supplementary payments cover certain costs in addition to defense, such as bail bonds, loss of earnings for attending trials, and post-judgment interest.",
    explanationEs: "Los pagos suplementarios cubren ciertos costos además de defensa, como fianzas, pérdida de ganancias por asistir a juicios e intereses post-sentencia."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the mobile equipment exclusion in commercial auto policies?",
    questionTextEs: "¿Qué es la exclusión de equipo móvil en pólizas de auto comercial?",
    optionsEn: ["An exclusion for trucks", "An exclusion for vehicles primarily designed for off-road use that may be covered under CGL instead", "An exclusion for trailers", "An exclusion for motorcycles"],
    optionsEs: ["Una exclusión para camiones", "Una exclusión para vehículos diseñados principalmente para uso fuera de carretera que pueden estar cubiertos bajo CGL en su lugar", "Una exclusión para remolques", "Una exclusión para motocicletas"],
    correctAnswer: 1,
    explanationEn: "Mobile equipment (bulldozers, forklifts, etc.) is excluded from commercial auto policies because liability for such equipment is typically covered under CGL.",
    explanationEs: "El equipo móvil (bulldozers, montacargas, etc.) está excluido de las pólizas de auto comercial porque la responsabilidad por dicho equipo típicamente está cubierta bajo CGL."
  },
  {
    category: "general_lines",
    questionTextEn: "What is MCS-90 endorsement?",
    questionTextEs: "¿Qué es el endoso MCS-90?",
    optionsEn: ["A property endorsement", "A federal endorsement requiring interstate motor carriers to provide minimum liability coverage", "A life insurance endorsement", "A health endorsement"],
    optionsEs: ["Un endoso de propiedad", "Un endoso federal que requiere que los transportistas interestatales proporcionen cobertura de responsabilidad mínima", "Un endoso de seguro de vida", "Un endoso de salud"],
    correctAnswer: 1,
    explanationEn: "MCS-90 is a federal endorsement that ensures interstate trucking companies maintain minimum liability coverage required by the Department of Transportation.",
    explanationEs: "MCS-90 es un endoso federal que asegura que las compañías de camiones interestatales mantengan la cobertura de responsabilidad mínima requerida por el Departamento de Transporte."
  },
  {
    category: "general_lines",
    questionTextEn: "What is garagekeepers coverage?",
    questionTextEs: "¿Qué es la cobertura de cuidador de garaje?",
    optionsEn: ["Coverage for garage buildings", "Coverage for damage to customers' vehicles in the care of an auto service business", "Liability coverage", "Life insurance"],
    optionsEs: ["Cobertura para edificios de garaje", "Cobertura por daños a vehículos de clientes bajo el cuidado de un negocio de servicio de autos", "Cobertura de responsabilidad", "Seguro de vida"],
    correctAnswer: 1,
    explanationEn: "Garagekeepers coverage protects auto dealers and repair shops for damage to customers' vehicles left in their care, custody, or control.",
    explanationEs: "La cobertura de cuidador de garaje protege a concesionarios de autos y talleres de reparación por daños a vehículos de clientes dejados bajo su cuidado, custodia o control."
  },
  {
    category: "general_lines",
    questionTextEn: "What is dealers open lot coverage?",
    questionTextEs: "¿Qué es la cobertura de lote abierto de concesionarios?",
    optionsEn: ["Liability coverage", "Coverage for damage to vehicles in an auto dealer's inventory", "Life insurance", "Health insurance"],
    optionsEs: ["Cobertura de responsabilidad", "Cobertura por daños a vehículos en el inventario de un concesionario de autos", "Seguro de vida", "Seguro de salud"],
    correctAnswer: 1,
    explanationEn: "Dealers open lot coverage protects auto dealers for physical damage to vehicles in their inventory while on the dealer's lot.",
    explanationEs: "La cobertura de lote abierto de concesionarios protege a los concesionarios de autos por daños físicos a vehículos en su inventario mientras están en el lote del concesionario."
  },
  {
    category: "general_lines",
    questionTextEn: "What is a symbol system in commercial auto coverage?",
    questionTextEs: "¿Qué es un sistema de símbolos en la cobertura de auto comercial?",
    optionsEn: ["A company logo", "A numbering system that identifies which vehicles are covered for each type of coverage", "A premium calculation", "A claim form"],
    optionsEs: ["Un logotipo de empresa", "Un sistema de numeración que identifica qué vehículos están cubiertos para cada tipo de cobertura", "Un cálculo de prima", "Un formulario de reclamo"],
    correctAnswer: 1,
    explanationEn: "The symbol system uses numbers (1-9) to identify which vehicles are covered for liability, physical damage, and other coverages in the policy.",
    explanationEs: "El sistema de símbolos usa números (1-9) para identificar qué vehículos están cubiertos para responsabilidad, daños físicos y otras coberturas en la póliza."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the difference between comprehensive and collision coverage?",
    questionTextEs: "¿Cuál es la diferencia entre cobertura comprensiva y de colisión?",
    optionsEn: ["No difference", "Comprehensive covers non-collision losses; collision covers collision with objects", "Collision is always cheaper", "Comprehensive only covers theft"],
    optionsEs: ["Sin diferencia", "Comprensiva cubre pérdidas sin colisión; colisión cubre colisión con objetos", "Colisión siempre es más barata", "Comprensiva solo cubre robo"],
    correctAnswer: 1,
    explanationEn: "Comprehensive covers losses other than collision (theft, fire, vandalism, weather), while collision covers damage from impact with another object.",
    explanationEs: "Comprensiva cubre pérdidas que no son de colisión (robo, incendio, vandalismo, clima), mientras que colisión cubre daños por impacto con otro objeto."
  },
  {
    category: "general_lines",
    questionTextEn: "What is medical payments coverage in commercial auto?",
    questionTextEs: "¿Qué es la cobertura de pagos médicos en auto comercial?",
    optionsEn: ["Health insurance", "Coverage for medical expenses of occupants of the insured vehicle regardless of fault", "Liability coverage", "Property coverage"],
    optionsEs: ["Seguro de salud", "Cobertura para gastos médicos de ocupantes del vehículo asegurado sin importar la culpa", "Cobertura de responsabilidad", "Cobertura de propiedad"],
    correctAnswer: 1,
    explanationEn: "Medical payments coverage pays medical expenses for injuries to the driver and passengers of the insured vehicle, regardless of who is at fault.",
    explanationEs: "La cobertura de pagos médicos paga gastos médicos por lesiones al conductor y pasajeros del vehículo asegurado, sin importar quién tiene la culpa."
  },
  {
    category: "general_lines",
    questionTextEn: "What is uninsured/underinsured motorist coverage?",
    questionTextEs: "¿Qué es la cobertura de motorista sin seguro/con seguro insuficiente?",
    optionsEn: ["Coverage for uninsured vehicles", "Coverage protecting the insured when injured by a driver with no or inadequate insurance", "Property coverage", "Life insurance"],
    optionsEs: ["Cobertura para vehículos sin seguro", "Cobertura que protege al asegurado cuando es lesionado por un conductor sin seguro o con seguro inadecuado", "Cobertura de propiedad", "Seguro de vida"],
    correctAnswer: 1,
    explanationEn: "UM/UIM coverage pays for injuries to the insured when the at-fault driver has no insurance or insufficient coverage to pay for damages.",
    explanationEs: "La cobertura UM/UIM paga por lesiones al asegurado cuando el conductor culpable no tiene seguro o tiene cobertura insuficiente para pagar los daños."
  },
  {
    category: "general_lines",
    questionTextEn: "What is personal injury protection (PIP)?",
    questionTextEs: "¿Qué es la protección de lesiones personales (PIP)?",
    optionsEn: ["Liability coverage", "No-fault coverage for medical expenses and lost wages regardless of who caused the accident", "Property coverage", "Life insurance"],
    optionsEs: ["Cobertura de responsabilidad", "Cobertura sin culpa para gastos médicos y salarios perdidos sin importar quién causó el accidente", "Cobertura de propiedad", "Seguro de vida"],
    correctAnswer: 1,
    explanationEn: "PIP is no-fault coverage that pays for medical expenses, lost wages, and other benefits regardless of who is at fault in the accident.",
    explanationEs: "PIP es cobertura sin culpa que paga gastos médicos, salarios perdidos y otros beneficios sin importar quién tiene la culpa en el accidente."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the Texas personal auto policy minimum liability requirement?",
    questionTextEs: "¿Cuál es el requisito mínimo de responsabilidad de la póliza de auto personal de Texas?",
    optionsEn: ["$15,000/$30,000/$5,000", "$25,000/$50,000/$25,000", "$30,000/$60,000/$25,000", "$50,000/$100,000/$50,000"],
    optionsEs: ["$15,000/$30,000/$5,000", "$25,000/$50,000/$25,000", "$30,000/$60,000/$25,000", "$50,000/$100,000/$50,000"],
    correctAnswer: 2,
    explanationEn: "Texas requires minimum auto liability coverage of 30/60/25: $30,000 per person bodily injury, $60,000 per accident bodily injury, $25,000 property damage.",
    explanationEs: "Texas requiere cobertura de responsabilidad de auto mínima de 30/60/25: $30,000 por persona por lesiones corporales, $60,000 por accidente por lesiones corporales, $25,000 por daños a la propiedad."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the purpose of loss control services?",
    questionTextEs: "¿Cuál es el propósito de los servicios de control de pérdidas?",
    optionsEn: ["To pay claims faster", "To help insureds identify and reduce hazards that could lead to losses", "To increase premiums", "To deny claims"],
    optionsEs: ["Pagar reclamos más rápido", "Ayudar a los asegurados a identificar y reducir peligros que podrían llevar a pérdidas", "Aumentar las primas", "Denegar reclamos"],
    correctAnswer: 1,
    explanationEn: "Loss control services help insureds identify hazards and implement measures to prevent or reduce losses, benefiting both the insured and insurer.",
    explanationEs: "Los servicios de control de pérdidas ayudan a los asegurados a identificar peligros e implementar medidas para prevenir o reducir pérdidas, beneficiando tanto al asegurado como al asegurador."
  },
  {
    category: "general_lines",
    questionTextEn: "What is a loss ratio?",
    questionTextEs: "¿Qué es un índice de pérdidas?",
    optionsEn: ["A claims processing speed", "The ratio of claims paid to premiums earned", "A deductible calculation", "A coverage limit"],
    optionsEs: ["Una velocidad de procesamiento de reclamos", "La proporción de reclamos pagados a primas ganadas", "Un cálculo de deducible", "Un límite de cobertura"],
    correctAnswer: 1,
    explanationEn: "The loss ratio is calculated by dividing incurred losses by earned premiums, measuring the percentage of premiums used to pay claims.",
    explanationEs: "El índice de pérdidas se calcula dividiendo las pérdidas incurridas entre las primas ganadas, midiendo el porcentaje de primas usadas para pagar reclamos."
  },
  {
    category: "general_lines",
    questionTextEn: "What is a combined ratio in insurance?",
    questionTextEs: "¿Qué es un índice combinado en seguros?",
    optionsEn: ["A premium calculation", "The sum of loss ratio and expense ratio measuring overall profitability", "A claims calculation", "A coverage calculation"],
    optionsEs: ["Un cálculo de prima", "La suma del índice de pérdidas y el índice de gastos midiendo la rentabilidad general", "Un cálculo de reclamos", "Un cálculo de cobertura"],
    correctAnswer: 1,
    explanationEn: "The combined ratio adds the loss ratio and expense ratio to measure underwriting profitability; a ratio under 100% indicates underwriting profit.",
    explanationEs: "El índice combinado suma el índice de pérdidas y el índice de gastos para medir la rentabilidad de suscripción; un índice bajo 100% indica ganancia de suscripción."
  }
];

export async function seedGeneralLinesPart3() {
  console.log("Seeding General Lines questions (Part 3)...");
  
  for (const question of generalLinesQuestions) {
    await db.insert(questions).values(question);
  }
  
  console.log(`Added ${generalLinesQuestions.length} General Lines questions`);
}

seedGeneralLinesPart3()
  .then(() => {
    console.log("General Lines Part 3 seeding completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error seeding General Lines Part 3:", error);
    process.exit(1);
  });
