import { db } from "./db";
import { questions } from "@shared/schema";

const generalLinesQuestions = [
  {
    category: "general_lines",
    questionTextEn: "What is underwriting in insurance?",
    questionTextEs: "¿Qué es la suscripción en seguros?",
    optionsEn: ["Selling insurance policies", "The process of evaluating risks and determining coverage terms and pricing", "Paying claims", "Processing applications"],
    optionsEs: ["Vender pólizas de seguro", "El proceso de evaluar riesgos y determinar términos de cobertura y precios", "Pagar reclamos", "Procesar solicitudes"],
    correctAnswer: 1,
    explanationEn: "Underwriting is the process of evaluating insurance applications, assessing risk, and determining whether to accept the risk and at what price and terms.",
    explanationEs: "La suscripción es el proceso de evaluar solicitudes de seguro, evaluar riesgos y determinar si aceptar el riesgo y a qué precio y términos."
  },
  {
    category: "general_lines",
    questionTextEn: "What is rate making in insurance?",
    questionTextEs: "¿Qué es la tarificación en seguros?",
    optionsEn: ["Setting agent commissions", "The process of determining premium rates based on expected losses and expenses", "Paying claims", "Marketing insurance"],
    optionsEs: ["Establecer comisiones de agentes", "El proceso de determinar tasas de primas basadas en pérdidas esperadas y gastos", "Pagar reclamos", "Comercializar seguros"],
    correctAnswer: 1,
    explanationEn: "Rate making is the process insurers use to determine premium rates, considering expected losses, expenses, and profit margins.",
    explanationEs: "La tarificación es el proceso que los aseguradores usan para determinar tasas de primas, considerando pérdidas esperadas, gastos y márgenes de ganancia."
  },
  {
    category: "general_lines",
    questionTextEn: "What is a pure premium?",
    questionTextEs: "¿Qué es una prima pura?",
    optionsEn: ["The total premium charged", "The portion of premium needed to pay expected losses", "The agent's commission", "The profit margin"],
    optionsEs: ["La prima total cobrada", "La porción de la prima necesaria para pagar las pérdidas esperadas", "La comisión del agente", "El margen de ganancia"],
    correctAnswer: 1,
    explanationEn: "The pure premium is the portion of the premium that covers expected losses, before adding expenses and profit loading.",
    explanationEs: "La prima pura es la porción de la prima que cubre las pérdidas esperadas, antes de agregar gastos y carga de ganancia."
  },
  {
    category: "general_lines",
    questionTextEn: "What is a loading in insurance premiums?",
    questionTextEs: "¿Qué es una carga en las primas de seguro?",
    optionsEn: ["Expected losses", "The amount added to pure premium for expenses, contingencies, and profit", "A discount", "A deductible"],
    optionsEs: ["Pérdidas esperadas", "La cantidad agregada a la prima pura para gastos, contingencias y ganancia", "Un descuento", "Un deducible"],
    correctAnswer: 1,
    explanationEn: "Loading is the amount added to the pure premium to cover operating expenses, contingencies, and provide a profit margin.",
    explanationEs: "La carga es la cantidad agregada a la prima pura para cubrir gastos operativos, contingencias y proporcionar un margen de ganancia."
  },
  {
    category: "general_lines",
    questionTextEn: "What is adverse selection in insurance?",
    questionTextEs: "¿Qué es la selección adversa en seguros?",
    optionsEn: ["Choosing the best risks", "The tendency for higher-risk individuals to seek more insurance coverage", "Selecting good agents", "Choosing low premiums"],
    optionsEs: ["Elegir los mejores riesgos", "La tendencia de individuos de alto riesgo a buscar más cobertura de seguro", "Seleccionar buenos agentes", "Elegir primas bajas"],
    correctAnswer: 1,
    explanationEn: "Adverse selection occurs when people with higher risks are more likely to purchase insurance, potentially leading to higher claims than expected.",
    explanationEs: "La selección adversa ocurre cuando las personas con mayores riesgos tienen más probabilidades de comprar seguros, potencialmente llevando a reclamos más altos de lo esperado."
  },
  {
    category: "general_lines",
    questionTextEn: "What is moral hazard?",
    questionTextEs: "¿Qué es el riesgo moral?",
    optionsEn: ["Unethical behavior by agents", "Increased risk-taking because insurance covers the loss", "A physical hazard", "A premium calculation"],
    optionsEs: ["Comportamiento poco ético de agentes", "Mayor toma de riesgos porque el seguro cubre la pérdida", "Un peligro físico", "Un cálculo de prima"],
    correctAnswer: 1,
    explanationEn: "Moral hazard is the tendency for people to take greater risks or be less careful because they have insurance to cover potential losses.",
    explanationEs: "El riesgo moral es la tendencia de las personas a tomar mayores riesgos o ser menos cuidadosos porque tienen seguro para cubrir pérdidas potenciales."
  },
  {
    category: "general_lines",
    questionTextEn: "What is morale hazard?",
    questionTextEs: "¿Qué es el peligro de moralidad?",
    optionsEn: ["Intentional loss causing", "Carelessness or indifference to loss because of insurance", "A physical condition", "An exclusion"],
    optionsEs: ["Causar pérdidas intencionales", "Descuido o indiferencia a la pérdida debido al seguro", "Una condición física", "Una exclusión"],
    correctAnswer: 1,
    explanationEn: "Morale hazard is unintentional carelessness or indifference to preventing losses because insurance will cover the damage.",
    explanationEs: "El peligro de moralidad es el descuido no intencional o la indiferencia hacia la prevención de pérdidas porque el seguro cubrirá el daño."
  },
  {
    category: "general_lines",
    questionTextEn: "What is a physical hazard?",
    questionTextEs: "¿Qué es un peligro físico?",
    optionsEn: ["A moral condition", "A physical condition that increases the likelihood or severity of loss", "An exclusion", "A premium"],
    optionsEs: ["Una condición moral", "Una condición física que aumenta la probabilidad o severidad de pérdida", "Una exclusión", "Una prima"],
    correctAnswer: 1,
    explanationEn: "A physical hazard is a tangible condition that increases the chance of loss, such as faulty wiring, icy sidewalks, or defective equipment.",
    explanationEs: "Un peligro físico es una condición tangible que aumenta la probabilidad de pérdida, como cableado defectuoso, aceras heladas o equipo defectuoso."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the law of large numbers?",
    questionTextEs: "¿Qué es la ley de los grandes números?",
    optionsEn: ["A tax law", "A statistical principle that allows insurers to predict losses more accurately with larger samples", "A premium calculation", "A coverage limit"],
    optionsEs: ["Una ley fiscal", "Un principio estadístico que permite a los aseguradores predecir pérdidas con mayor precisión con muestras más grandes", "Un cálculo de prima", "Un límite de cobertura"],
    correctAnswer: 1,
    explanationEn: "The law of large numbers states that as the sample size increases, actual results will more closely approximate expected results, allowing accurate loss prediction.",
    explanationEs: "La ley de los grandes números establece que a medida que aumenta el tamaño de la muestra, los resultados reales se aproximarán más a los resultados esperados, permitiendo una predicción de pérdidas precisa."
  },
  {
    category: "general_lines",
    questionTextEn: "What is risk pooling?",
    questionTextEs: "¿Qué es la agrupación de riesgos?",
    optionsEn: ["Avoiding all risks", "Combining many similar risks to spread the cost of losses among all members", "Transferring all risks", "Eliminating risks"],
    optionsEs: ["Evitar todos los riesgos", "Combinar muchos riesgos similares para distribuir el costo de las pérdidas entre todos los miembros", "Transferir todos los riesgos", "Eliminar riesgos"],
    correctAnswer: 1,
    explanationEn: "Risk pooling combines many similar exposures to spread the cost of losses among the entire group, making individual losses more predictable.",
    explanationEs: "La agrupación de riesgos combina muchas exposiciones similares para distribuir el costo de las pérdidas entre todo el grupo, haciendo las pérdidas individuales más predecibles."
  },
  {
    category: "general_lines",
    questionTextEn: "What is a retrospective rating plan?",
    questionTextEs: "¿Qué es un plan de tarificación retrospectiva?",
    optionsEn: ["A fixed premium plan", "A plan where final premium is adjusted based on actual loss experience during the policy period", "A discount plan", "A life insurance plan"],
    optionsEs: ["Un plan de prima fija", "Un plan donde la prima final se ajusta basada en la experiencia real de pérdidas durante el período de la póliza", "Un plan de descuento", "Un plan de seguro de vida"],
    correctAnswer: 1,
    explanationEn: "A retrospective rating plan adjusts the final premium based on the insured's actual loss experience during the policy period, within minimum and maximum limits.",
    explanationEs: "Un plan de tarificación retrospectiva ajusta la prima final basada en la experiencia real de pérdidas del asegurado durante el período de la póliza, dentro de límites mínimos y máximos."
  },
  {
    category: "general_lines",
    questionTextEn: "What is a large deductible program?",
    questionTextEs: "¿Qué es un programa de deducible grande?",
    optionsEn: ["A standard insurance program", "A program where the insured retains a significant portion of losses through a high deductible", "A life insurance program", "A health insurance program"],
    optionsEs: ["Un programa de seguro estándar", "Un programa donde el asegurado retiene una porción significativa de las pérdidas a través de un deducible alto", "Un programa de seguro de vida", "Un programa de seguro de salud"],
    correctAnswer: 1,
    explanationEn: "A large deductible program allows the insured to retain a significant portion of losses, reducing premium costs while the insurer handles claims administration.",
    explanationEs: "Un programa de deducible grande permite al asegurado retener una porción significativa de las pérdidas, reduciendo los costos de prima mientras el asegurador maneja la administración de reclamos."
  },
  {
    category: "general_lines",
    questionTextEn: "What is risk retention?",
    questionTextEs: "¿Qué es la retención de riesgos?",
    optionsEn: ["Transferring all risk", "The decision to absorb a risk and pay for losses out of one's own resources", "Avoiding all risk", "Purchasing insurance"],
    optionsEs: ["Transferir todo el riesgo", "La decisión de absorber un riesgo y pagar las pérdidas con recursos propios", "Evitar todo el riesgo", "Comprar seguro"],
    correctAnswer: 1,
    explanationEn: "Risk retention is a risk management technique where the organization decides to absorb potential losses rather than transfer them to an insurer.",
    explanationEs: "La retención de riesgos es una técnica de gestión de riesgos donde la organización decide absorber las pérdidas potenciales en lugar de transferirlas a un asegurador."
  },
  {
    category: "general_lines",
    questionTextEn: "What is risk avoidance?",
    questionTextEs: "¿Qué es la evitación de riesgos?",
    optionsEn: ["Purchasing insurance", "Eliminating exposure to a risk by not engaging in the activity", "Transferring risk", "Reducing risk"],
    optionsEs: ["Comprar seguro", "Eliminar la exposición a un riesgo al no participar en la actividad", "Transferir el riesgo", "Reducir el riesgo"],
    correctAnswer: 1,
    explanationEn: "Risk avoidance eliminates exposure to a potential loss by choosing not to engage in the activity that creates the risk.",
    explanationEs: "La evitación de riesgos elimina la exposición a una pérdida potencial al elegir no participar en la actividad que crea el riesgo."
  },
  {
    category: "general_lines",
    questionTextEn: "What is risk transfer?",
    questionTextEs: "¿Qué es la transferencia de riesgos?",
    optionsEn: ["Keeping all risks", "Shifting the financial consequences of risk to another party, such as through insurance", "Avoiding risks", "Reducing risks"],
    optionsEs: ["Mantener todos los riesgos", "Trasladar las consecuencias financieras del riesgo a otra parte, como a través del seguro", "Evitar riesgos", "Reducir riesgos"],
    correctAnswer: 1,
    explanationEn: "Risk transfer shifts the financial consequences of potential losses to another party, typically through insurance contracts or hold harmless agreements.",
    explanationEs: "La transferencia de riesgos traslada las consecuencias financieras de las pérdidas potenciales a otra parte, típicamente a través de contratos de seguro o acuerdos de exoneración."
  },
  {
    category: "general_lines",
    questionTextEn: "What is a risk management program?",
    questionTextEs: "¿Qué es un programa de gestión de riesgos?",
    optionsEn: ["Only purchasing insurance", "A systematic approach to identifying, analyzing, and controlling risks", "Avoiding all activities", "Only transferring risk"],
    optionsEs: ["Solo comprar seguro", "Un enfoque sistemático para identificar, analizar y controlar riesgos", "Evitar todas las actividades", "Solo transferir riesgos"],
    correctAnswer: 1,
    explanationEn: "A risk management program is a comprehensive approach that identifies exposures, analyzes risks, selects appropriate techniques, and monitors results.",
    explanationEs: "Un programa de gestión de riesgos es un enfoque integral que identifica exposiciones, analiza riesgos, selecciona técnicas apropiadas y monitorea resultados."
  },
  {
    category: "general_lines",
    questionTextEn: "What is a loss exposure?",
    questionTextEs: "¿Qué es una exposición a pérdidas?",
    optionsEn: ["An actual loss", "Any condition or situation that presents the possibility of loss", "An insurance policy", "A premium payment"],
    optionsEs: ["Una pérdida real", "Cualquier condición o situación que presenta la posibilidad de pérdida", "Una póliza de seguro", "Un pago de prima"],
    correctAnswer: 1,
    explanationEn: "A loss exposure is any condition, situation, or activity that could result in a financial loss, such as owning property or operating a business.",
    explanationEs: "Una exposición a pérdidas es cualquier condición, situación o actividad que podría resultar en una pérdida financiera, como poseer propiedad u operar un negocio."
  },
  {
    category: "general_lines",
    questionTextEn: "What is frequency in risk analysis?",
    questionTextEs: "¿Qué es la frecuencia en el análisis de riesgos?",
    optionsEn: ["The size of losses", "How often losses are expected to occur", "The cost of insurance", "The premium amount"],
    optionsEs: ["El tamaño de las pérdidas", "Con qué frecuencia se espera que ocurran las pérdidas", "El costo del seguro", "El monto de la prima"],
    correctAnswer: 1,
    explanationEn: "Frequency refers to how often losses are expected to occur, which helps determine appropriate risk management techniques.",
    explanationEs: "La frecuencia se refiere a con qué frecuencia se espera que ocurran las pérdidas, lo que ayuda a determinar técnicas apropiadas de gestión de riesgos."
  },
  {
    category: "general_lines",
    questionTextEn: "What is severity in risk analysis?",
    questionTextEs: "¿Qué es la severidad en el análisis de riesgos?",
    optionsEn: ["How often losses occur", "The potential size or magnitude of losses when they occur", "The premium cost", "The deductible amount"],
    optionsEs: ["Con qué frecuencia ocurren las pérdidas", "El tamaño potencial o magnitud de las pérdidas cuando ocurren", "El costo de la prima", "El monto del deducible"],
    correctAnswer: 1,
    explanationEn: "Severity refers to the potential size or financial impact of losses when they occur, used to determine appropriate coverage limits.",
    explanationEs: "La severidad se refiere al tamaño potencial o impacto financiero de las pérdidas cuando ocurren, utilizada para determinar límites de cobertura apropiados."
  },
  {
    category: "general_lines",
    questionTextEn: "What is a claim adjuster?",
    questionTextEs: "¿Qué es un ajustador de reclamos?",
    optionsEn: ["An insurance salesperson", "A person who investigates claims and determines payment amounts", "A policy underwriter", "A premium collector"],
    optionsEs: ["Un vendedor de seguros", "Una persona que investiga reclamos y determina los montos de pago", "Un suscriptor de pólizas", "Un cobrador de primas"],
    correctAnswer: 1,
    explanationEn: "A claim adjuster investigates insurance claims, evaluates damages, determines coverage, and negotiates settlements with claimants.",
    explanationEs: "Un ajustador de reclamos investiga reclamos de seguros, evalúa daños, determina la cobertura y negocia acuerdos con los reclamantes."
  },
  {
    category: "general_lines",
    questionTextEn: "What is a public adjuster?",
    questionTextEs: "¿Qué es un ajustador público?",
    optionsEn: ["An insurance company employee", "An adjuster who represents policyholders in claim negotiations", "A government official", "A court-appointed adjuster"],
    optionsEs: ["Un empleado de la compañía de seguros", "Un ajustador que representa a los titulares de pólizas en negociaciones de reclamos", "Un funcionario del gobierno", "Un ajustador nombrado por el tribunal"],
    correctAnswer: 1,
    explanationEn: "A public adjuster is hired by policyholders to represent their interests in claim negotiations with the insurance company, usually for a percentage of the settlement.",
    explanationEs: "Un ajustador público es contratado por los titulares de pólizas para representar sus intereses en negociaciones de reclamos con la compañía de seguros, generalmente por un porcentaje del acuerdo."
  },
  {
    category: "general_lines",
    questionTextEn: "What is an independent adjuster?",
    questionTextEs: "¿Qué es un ajustador independiente?",
    optionsEn: ["An insurance company employee", "A contract adjuster hired by insurers to handle claims", "A public adjuster", "A government adjuster"],
    optionsEs: ["Un empleado de la compañía de seguros", "Un ajustador contratado por aseguradores para manejar reclamos", "Un ajustador público", "Un ajustador del gobierno"],
    correctAnswer: 1,
    explanationEn: "An independent adjuster is a contractor hired by insurance companies to investigate and settle claims, not employed directly by any insurer.",
    explanationEs: "Un ajustador independiente es un contratista contratado por compañías de seguros para investigar y liquidar reclamos, no empleado directamente por ningún asegurador."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the proof of loss requirement?",
    questionTextEs: "¿Qué es el requisito de prueba de pérdida?",
    optionsEn: ["A premium payment", "A sworn statement documenting the facts and amount of the loss", "An insurance application", "A policy renewal"],
    optionsEs: ["Un pago de prima", "Una declaración jurada documentando los hechos y el monto de la pérdida", "Una solicitud de seguro", "Una renovación de póliza"],
    correctAnswer: 1,
    explanationEn: "Proof of loss is a formal sworn statement the insured must submit to the insurance company documenting the details and amount of a claimed loss.",
    explanationEs: "La prueba de pérdida es una declaración jurada formal que el asegurado debe presentar a la compañía de seguros documentando los detalles y el monto de una pérdida reclamada."
  },
  {
    category: "general_lines",
    questionTextEn: "What is an appraisal clause?",
    questionTextEs: "¿Qué es una cláusula de tasación?",
    optionsEn: ["A premium calculation method", "A policy provision for resolving disputes over the value of a loss", "A coverage limit", "An exclusion"],
    optionsEs: ["Un método de cálculo de prima", "Una disposición de póliza para resolver disputas sobre el valor de una pérdida", "Un límite de cobertura", "Una exclusión"],
    correctAnswer: 1,
    explanationEn: "The appraisal clause provides a process to resolve disputes over the amount of a loss, where each party selects an appraiser and they choose an umpire.",
    explanationEs: "La cláusula de tasación proporciona un proceso para resolver disputas sobre el monto de una pérdida, donde cada parte selecciona un tasador y ellos eligen un árbitro."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the duty to cooperate?",
    questionTextEs: "¿Qué es el deber de cooperar?",
    optionsEn: ["A sales requirement", "The insured's obligation to assist the insurer in investigating and defending claims", "A premium payment duty", "An agent's obligation"],
    optionsEs: ["Un requisito de ventas", "La obligación del asegurado de asistir al asegurador en investigar y defender reclamos", "Un deber de pago de prima", "Una obligación del agente"],
    correctAnswer: 1,
    explanationEn: "The duty to cooperate requires the insured to assist the insurer in claim investigation, provide documents, and cooperate in legal defense.",
    explanationEs: "El deber de cooperar requiere que el asegurado asista al asegurador en la investigación de reclamos, proporcione documentos y coopere en la defensa legal."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the notice of loss requirement?",
    questionTextEs: "¿Qué es el requisito de aviso de pérdida?",
    optionsEn: ["A premium notice", "The insured's duty to promptly inform the insurer of a loss or potential claim", "A renewal notice", "A cancellation notice"],
    optionsEs: ["Un aviso de prima", "El deber del asegurado de informar prontamente al asegurador de una pérdida o reclamo potencial", "Un aviso de renovación", "Un aviso de cancelación"],
    correctAnswer: 1,
    explanationEn: "The notice of loss requirement obligates the insured to notify the insurer promptly after a loss occurs or when a claim is likely to be made.",
    explanationEs: "El requisito de aviso de pérdida obliga al asegurado a notificar al asegurador prontamente después de que ocurre una pérdida o cuando es probable que se haga un reclamo."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the examination under oath provision?",
    questionTextEs: "¿Qué es la disposición de examen bajo juramento?",
    optionsEn: ["A court trial", "A policy provision allowing the insurer to require sworn testimony from the insured about a claim", "A premium calculation", "An exclusion"],
    optionsEs: ["Un juicio en tribunal", "Una disposición de póliza que permite al asegurador requerir testimonio jurado del asegurado sobre un reclamo", "Un cálculo de prima", "Una exclusión"],
    correctAnswer: 1,
    explanationEn: "The examination under oath provision allows the insurer to require the insured to provide sworn testimony about a claim, typically recorded by a court reporter.",
    explanationEs: "La disposición de examen bajo juramento permite al asegurador requerir que el asegurado proporcione testimonio jurado sobre un reclamo, típicamente registrado por un taquígrafo judicial."
  },
  {
    category: "general_lines",
    questionTextEn: "What is salvage in insurance?",
    questionTextEs: "¿Qué es el salvamento en seguros?",
    optionsEn: ["A type of coverage", "Property recovered by the insurer after paying a total loss", "A premium discount", "An exclusion"],
    optionsEs: ["Un tipo de cobertura", "Propiedad recuperada por el asegurador después de pagar una pérdida total", "Un descuento de prima", "Una exclusión"],
    correctAnswer: 1,
    explanationEn: "Salvage is the damaged property that belongs to the insurer after paying a total loss claim, which the insurer can sell to reduce the net loss.",
    explanationEs: "El salvamento es la propiedad dañada que pertenece al asegurador después de pagar un reclamo de pérdida total, que el asegurador puede vender para reducir la pérdida neta."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the standard fire policy?",
    questionTextEs: "¿Qué es la póliza estándar contra incendios?",
    optionsEn: ["A modern policy form", "A historical policy form providing basic fire coverage that has been replaced by newer forms", "A life insurance policy", "An auto policy"],
    optionsEs: ["Un formulario de póliza moderno", "Un formulario de póliza histórico que proporciona cobertura básica contra incendios que ha sido reemplazado por formularios más nuevos", "Una póliza de seguro de vida", "Una póliza de auto"],
    correctAnswer: 1,
    explanationEn: "The standard fire policy was a basic property insurance form that has largely been replaced by more comprehensive commercial property forms.",
    explanationEs: "La póliza estándar contra incendios fue un formulario básico de seguro de propiedad que ha sido reemplazado en gran parte por formularios de propiedad comercial más completos."
  },
  {
    category: "general_lines",
    questionTextEn: "What is flood insurance typically excluded from?",
    questionTextEs: "¿De qué está típicamente excluido el seguro contra inundaciones?",
    optionsEn: ["Flood policies", "Standard property insurance policies, requiring separate coverage", "Life insurance", "Auto insurance"],
    optionsEs: ["Pólizas contra inundaciones", "Pólizas de seguro de propiedad estándar, requiriendo cobertura separada", "Seguro de vida", "Seguro de auto"],
    correctAnswer: 1,
    explanationEn: "Flood is typically excluded from standard property policies and must be purchased separately through the NFIP or private flood insurers.",
    explanationEs: "Las inundaciones típicamente están excluidas de las pólizas de propiedad estándar y deben comprarse por separado a través del NFIP o aseguradores privados de inundaciones."
  },
  {
    category: "general_lines",
    questionTextEn: "What is earthquake coverage?",
    questionTextEs: "¿Qué es la cobertura contra terremotos?",
    optionsEn: ["Included in all policies", "Coverage for earthquake damage typically requiring a separate policy or endorsement", "Life insurance", "Auto coverage"],
    optionsEs: ["Incluida en todas las pólizas", "Cobertura para daños por terremotos típicamente requiriendo una póliza separada o endoso", "Seguro de vida", "Cobertura de auto"],
    correctAnswer: 1,
    explanationEn: "Earthquake coverage protects against earthquake damage and is usually excluded from standard property policies, requiring a separate policy or endorsement.",
    explanationEs: "La cobertura contra terremotos protege contra daños por terremotos y usualmente está excluida de las pólizas de propiedad estándar, requiriendo una póliza o endoso separado."
  },
  {
    category: "general_lines",
    questionTextEn: "What is terrorism insurance coverage?",
    questionTextEs: "¿Qué es la cobertura de seguro contra terrorismo?",
    optionsEn: ["Always included free", "Coverage for losses from certified acts of terrorism, often through TRIA", "Life insurance only", "Auto coverage"],
    optionsEs: ["Siempre incluida gratis", "Cobertura para pérdidas por actos certificados de terrorismo, a menudo a través de TRIA", "Solo seguro de vida", "Cobertura de auto"],
    correctAnswer: 1,
    explanationEn: "Terrorism coverage protects against certified acts of terrorism and is backed by the federal government through the Terrorism Risk Insurance Act (TRIA).",
    explanationEs: "La cobertura contra terrorismo protege contra actos certificados de terrorismo y está respaldada por el gobierno federal a través de la Ley de Seguro de Riesgo de Terrorismo (TRIA)."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the purpose of a binder in insurance?",
    questionTextEs: "¿Cuál es el propósito de un binder en seguros?",
    optionsEn: ["To permanently bind a policy", "To provide temporary evidence of coverage until the policy is issued", "To cancel coverage", "To increase premiums"],
    optionsEs: ["Vincular permanentemente una póliza", "Proporcionar evidencia temporal de cobertura hasta que se emita la póliza", "Cancelar la cobertura", "Aumentar las primas"],
    correctAnswer: 1,
    explanationEn: "A binder provides temporary evidence of insurance coverage until the formal policy is issued, allowing immediate protection for the insured.",
    explanationEs: "Un binder proporciona evidencia temporal de cobertura de seguro hasta que se emita la póliza formal, permitiendo protección inmediata para el asegurado."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the cancellation provision in a policy?",
    questionTextEs: "¿Qué es la disposición de cancelación en una póliza?",
    optionsEn: ["A coverage provision", "Terms explaining how either party may cancel the policy", "A premium calculation", "An exclusion"],
    optionsEs: ["Una disposición de cobertura", "Términos que explican cómo cualquiera de las partes puede cancelar la póliza", "Un cálculo de prima", "Una exclusión"],
    correctAnswer: 1,
    explanationEn: "The cancellation provision specifies the conditions and procedures under which the insurer or insured may cancel the policy before expiration.",
    explanationEs: "La disposición de cancelación especifica las condiciones y procedimientos bajo los cuales el asegurador o asegurado puede cancelar la póliza antes del vencimiento."
  },
  {
    category: "general_lines",
    questionTextEn: "What is nonrenewal in insurance?",
    questionTextEs: "¿Qué es la no renovación en seguros?",
    optionsEn: ["Policy cancellation", "The insurer's decision not to renew a policy at the end of its term", "A premium discount", "An endorsement"],
    optionsEs: ["Cancelación de póliza", "La decisión del asegurador de no renovar una póliza al final de su término", "Un descuento de prima", "Un endoso"],
    correctAnswer: 1,
    explanationEn: "Nonrenewal is the insurer's decision not to renew a policy when it expires, which requires proper advance notice to the policyholder.",
    explanationEs: "La no renovación es la decisión del asegurador de no renovar una póliza cuando expira, lo cual requiere aviso previo apropiado al titular de la póliza."
  },
  {
    category: "general_lines",
    questionTextEn: "What is short rate cancellation?",
    questionTextEs: "¿Qué es la cancelación a tasa corta?",
    optionsEn: ["A full refund", "A cancellation method where a penalty is applied to the return premium", "A pro rata refund", "A premium increase"],
    optionsEs: ["Un reembolso completo", "Un método de cancelación donde se aplica una penalidad al reembolso de prima", "Un reembolso prorrateado", "Un aumento de prima"],
    correctAnswer: 1,
    explanationEn: "Short rate cancellation applies a penalty to the premium refund when the insured requests cancellation, retaining more premium than a pro rata return.",
    explanationEs: "La cancelación a tasa corta aplica una penalidad al reembolso de prima cuando el asegurado solicita la cancelación, reteniendo más prima que un retorno prorrateado."
  },
  {
    category: "general_lines",
    questionTextEn: "What is pro rata cancellation?",
    questionTextEs: "¿Qué es la cancelación prorrateada?",
    optionsEn: ["A penalty-based cancellation", "A cancellation where the return premium is calculated based on time remaining without penalty", "A full premium return", "A premium increase"],
    optionsEs: ["Una cancelación basada en penalidad", "Una cancelación donde el reembolso de prima se calcula basado en el tiempo restante sin penalidad", "Un retorno de prima completo", "Un aumento de prima"],
    correctAnswer: 1,
    explanationEn: "Pro rata cancellation returns the unearned premium based on the exact time remaining in the policy period, with no penalty deducted.",
    explanationEs: "La cancelación prorrateada devuelve la prima no ganada basada en el tiempo exacto restante en el período de la póliza, sin penalidad deducida."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the Texas agent licensing examination requirement?",
    questionTextEs: "¿Cuál es el requisito del examen de licencia de agente de Texas?",
    optionsEn: ["No exam required", "Passing a state-administered examination covering insurance principles and laws", "Only a background check", "Only a fee payment"],
    optionsEs: ["No se requiere examen", "Aprobar un examen administrado por el estado que cubre principios y leyes de seguros", "Solo una verificación de antecedentes", "Solo un pago de tarifa"],
    correctAnswer: 1,
    explanationEn: "Texas requires prospective agents to pass a licensing examination testing knowledge of insurance principles, coverage, and Texas insurance laws.",
    explanationEs: "Texas requiere que los agentes potenciales aprueben un examen de licencia que evalúa el conocimiento de principios de seguros, cobertura y leyes de seguros de Texas."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the continuing education requirement for Texas insurance agents?",
    questionTextEs: "¿Cuál es el requisito de educación continua para agentes de seguros de Texas?",
    optionsEn: ["No requirement", "Completing required continuing education hours to maintain licensure", "Only one course ever", "Only for new agents"],
    optionsEs: ["Sin requisito", "Completar las horas de educación continua requeridas para mantener la licencia", "Solo un curso", "Solo para nuevos agentes"],
    correctAnswer: 1,
    explanationEn: "Texas requires licensed agents to complete continuing education hours every licensing period, including ethics courses, to maintain their license.",
    explanationEs: "Texas requiere que los agentes con licencia completen horas de educación continua cada período de licencia, incluyendo cursos de ética, para mantener su licencia."
  },
  {
    category: "general_lines",
    questionTextEn: "What is the penalty for selling insurance without a license in Texas?",
    questionTextEs: "¿Cuál es la penalidad por vender seguros sin licencia en Texas?",
    optionsEn: ["No penalty", "Criminal penalties including fines and possible imprisonment", "Only a warning", "Only premium refund"],
    optionsEs: ["Sin penalidad", "Penalidades criminales incluyendo multas y posible encarcelamiento", "Solo una advertencia", "Solo reembolso de prima"],
    correctAnswer: 1,
    explanationEn: "Selling insurance without a license in Texas is a criminal offense that can result in fines, imprisonment, and other penalties under the Texas Insurance Code.",
    explanationEs: "Vender seguros sin licencia en Texas es un delito criminal que puede resultar en multas, encarcelamiento y otras penalidades bajo el Código de Seguros de Texas."
  },
  {
    category: "general_lines",
    questionTextEn: "What fiduciary duty does an agent owe to their clients?",
    questionTextEs: "¿Qué deber fiduciario debe un agente a sus clientes?",
    optionsEn: ["No duties", "A duty of loyalty, care, and to act in the client's best interest", "Only to sell policies", "Only to collect premiums"],
    optionsEs: ["Sin deberes", "Un deber de lealtad, cuidado y actuar en el mejor interés del cliente", "Solo vender pólizas", "Solo cobrar primas"],
    correctAnswer: 1,
    explanationEn: "Agents owe fiduciary duties including loyalty, care, good faith, and the obligation to act in the best interest of their clients.",
    explanationEs: "Los agentes deben deberes fiduciarios incluyendo lealtad, cuidado, buena fe y la obligación de actuar en el mejor interés de sus clientes."
  }
];

export async function seedGeneralLinesPart4() {
  console.log("Seeding General Lines questions (Part 4 - Final)...");
  
  for (const question of generalLinesQuestions) {
    await db.insert(questions).values(question);
  }
  
  console.log(`Added ${generalLinesQuestions.length} General Lines questions`);
}

seedGeneralLinesPart4()
  .then(() => {
    console.log("General Lines Part 4 seeding completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error seeding General Lines Part 4:", error);
    process.exit(1);
  });
