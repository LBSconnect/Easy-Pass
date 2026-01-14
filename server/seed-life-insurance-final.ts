import { db } from "./db";
import { questions } from "@shared/schema";

const additionalLifeQuestions = [
  {
    category: "life_insurance" as const,
    questionTextEn: "What is the entire contract provision?",
    questionTextEs: "¿Qué es la disposición de contrato completo?",
    optionsEn: ["The policy and application together constitute the entire agreement", "Only the policy matters", "Only the application matters", "Verbal agreements included"],
    optionsEs: ["La póliza y la solicitud juntas constituyen el acuerdo completo", "Solo la póliza importa", "Solo la solicitud importa", "Acuerdos verbales incluidos"],
    correctAnswer: 0,
    explanationEn: "The entire contract provision states that the policy and attached application make up the complete contract.",
    explanationEs: "La disposición de contrato completo establece que la póliza y la solicitud adjunta componen el contrato completo."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is nonforfeiture in life insurance?",
    questionTextEs: "¿Qué es la no caducidad en el seguro de vida?",
    optionsEn: ["Options that allow policyholders to retain some value if they stop paying premiums", "Forfeiting all value", "Automatic cancellation", "Premium refund only"],
    optionsEs: ["Opciones que permiten a los asegurados retener algún valor si dejan de pagar primas", "Perder todo el valor", "Cancelación automática", "Solo reembolso de prima"],
    correctAnswer: 0,
    explanationEn: "Nonforfeiture options protect the policyholder's cash value if they can no longer pay premiums.",
    explanationEs: "Las opciones de no caducidad protegen el valor en efectivo del asegurado si ya no puede pagar las primas."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is extended term insurance as a nonforfeiture option?",
    questionTextEs: "¿Qué es el seguro a término extendido como opción de no caducidad?",
    optionsEn: ["Using cash value to purchase term insurance for the same face amount", "Reduced paid-up insurance", "Cash surrender", "Automatic premium loan"],
    optionsEs: ["Usar el valor en efectivo para comprar seguro a término por el mismo monto nominal", "Seguro reducido pagado", "Rescate en efectivo", "Préstamo automático de prima"],
    correctAnswer: 0,
    explanationEn: "Extended term uses the cash value to buy term insurance for the full face amount for as long as the cash value allows.",
    explanationEs: "El término extendido usa el valor en efectivo para comprar seguro a término por el monto nominal completo por el tiempo que el valor en efectivo permita."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is reduced paid-up insurance as a nonforfeiture option?",
    questionTextEs: "¿Qué es el seguro reducido pagado como opción de no caducidad?",
    optionsEn: ["Using cash value to purchase a smaller permanent policy with no future premiums", "Extended term", "Cash surrender", "Premium refund"],
    optionsEs: ["Usar el valor en efectivo para comprar una póliza permanente más pequeña sin primas futuras", "Término extendido", "Rescate en efectivo", "Reembolso de prima"],
    correctAnswer: 0,
    explanationEn: "Reduced paid-up uses cash value to purchase a smaller permanent policy that remains in force without future premiums.",
    explanationEs: "El seguro reducido pagado usa el valor en efectivo para comprar una póliza permanente más pequeña que permanece en vigor sin primas futuras."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is the automatic premium loan provision?",
    questionTextEs: "¿Qué es la disposición de préstamo automático de prima?",
    optionsEn: ["Automatically borrows from cash value to pay overdue premiums", "Cancels the policy", "Requires additional payment", "Reduces death benefit immediately"],
    optionsEs: ["Toma prestado automáticamente del valor en efectivo para pagar primas vencidas", "Cancela la póliza", "Requiere pago adicional", "Reduce el beneficio por muerte inmediatamente"],
    correctAnswer: 0,
    explanationEn: "The automatic premium loan provision uses cash value to pay premiums if the policyholder misses a payment.",
    explanationEs: "La disposición de préstamo automático de prima usa el valor en efectivo para pagar primas si el asegurado pierde un pago."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is the assignment provision?",
    questionTextEs: "¿Qué es la disposición de cesión?",
    optionsEn: ["Allows the policy owner to transfer ownership rights to another party", "Prevents any transfers", "Changes the insured", "Cancels the policy"],
    optionsEs: ["Permite al propietario de la póliza transferir derechos de propiedad a otra parte", "Previene cualquier transferencia", "Cambia al asegurado", "Cancela la póliza"],
    correctAnswer: 0,
    explanationEn: "The assignment provision allows the policy owner to transfer some or all policy rights to another person or entity.",
    explanationEs: "La disposición de cesión permite al propietario de la póliza transferir algunos o todos los derechos de la póliza a otra persona o entidad."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is an absolute assignment?",
    questionTextEs: "¿Qué es una cesión absoluta?",
    optionsEn: ["Complete transfer of all policy rights permanently", "Temporary transfer", "Partial transfer", "No transfer"],
    optionsEs: ["Transferencia completa de todos los derechos de la póliza permanentemente", "Transferencia temporal", "Transferencia parcial", "Sin transferencia"],
    correctAnswer: 0,
    explanationEn: "An absolute assignment permanently transfers all ownership rights to the assignee.",
    explanationEs: "Una cesión absoluta transfiere permanentemente todos los derechos de propiedad al cesionario."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is a collateral assignment?",
    questionTextEs: "¿Qué es una cesión colateral?",
    optionsEn: ["Temporary transfer of policy rights as security for a loan", "Permanent transfer", "Beneficiary change", "Policy cancellation"],
    optionsEs: ["Transferencia temporal de derechos de la póliza como garantía de un préstamo", "Transferencia permanente", "Cambio de beneficiario", "Cancelación de póliza"],
    correctAnswer: 0,
    explanationEn: "A collateral assignment temporarily assigns policy rights to a lender as loan collateral.",
    explanationEs: "Una cesión colateral asigna temporalmente derechos de la póliza a un prestamista como garantía de préstamo."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is a spendthrift clause?",
    questionTextEs: "¿Qué es una cláusula de derrochador?",
    optionsEn: ["Protects policy proceeds from creditors of the beneficiary", "Allows creditor access", "Increases death benefit", "Reduces premiums"],
    optionsEs: ["Protege los beneficios de la póliza de los acreedores del beneficiario", "Permite acceso de acreedores", "Aumenta el beneficio por muerte", "Reduce las primas"],
    correctAnswer: 0,
    explanationEn: "A spendthrift clause protects death benefit proceeds from claims by the beneficiary's creditors.",
    explanationEs: "Una cláusula de derrochador protege los beneficios por muerte de reclamos de los acreedores del beneficiario."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is the common disaster clause?",
    questionTextEs: "¿Qué es la cláusula de desastre común?",
    optionsEn: ["Determines who receives proceeds if insured and beneficiary die in same accident", "Increases death benefit", "Reduces premiums", "Changes policy term"],
    optionsEs: ["Determina quién recibe los beneficios si el asegurado y el beneficiario mueren en el mismo accidente", "Aumenta el beneficio por muerte", "Reduce las primas", "Cambia el término de la póliza"],
    correctAnswer: 0,
    explanationEn: "The common disaster clause specifies how benefits are paid if the insured and beneficiary die in the same event.",
    explanationEs: "La cláusula de desastre común especifica cómo se pagan los beneficios si el asegurado y el beneficiario mueren en el mismo evento."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is the aviation exclusion?",
    questionTextEs: "¿Qué es la exclusión de aviación?",
    optionsEn: ["Excludes death benefits if death occurs during certain aviation activities", "Covers all aviation deaths", "Increases benefits for pilots", "No effect on coverage"],
    optionsEs: ["Excluye beneficios por muerte si la muerte ocurre durante ciertas actividades de aviación", "Cubre todas las muertes de aviación", "Aumenta beneficios para pilotos", "Sin efecto en la cobertura"],
    correctAnswer: 0,
    explanationEn: "The aviation exclusion may exclude or limit benefits if death results from certain flying activities.",
    explanationEs: "La exclusión de aviación puede excluir o limitar beneficios si la muerte resulta de ciertas actividades de vuelo."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is the war exclusion?",
    questionTextEs: "¿Qué es la exclusión de guerra?",
    optionsEn: ["Excludes death benefits for death caused by war or military action", "Covers war deaths", "Increases war coverage", "No war clause exists"],
    optionsEs: ["Excluye beneficios por muerte por muerte causada por guerra o acción militar", "Cubre muertes de guerra", "Aumenta cobertura de guerra", "No existe cláusula de guerra"],
    correctAnswer: 0,
    explanationEn: "The war exclusion excludes coverage for deaths resulting from war or acts of war.",
    explanationEs: "La exclusión de guerra excluye cobertura por muertes resultantes de guerra o actos de guerra."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is a hazardous occupation rider?",
    questionTextEs: "¿Qué es un anexo de ocupación peligrosa?",
    optionsEn: ["Modifies coverage or premium for high-risk occupations", "Provides extra coverage", "Reduces all premiums", "Cancels the policy"],
    optionsEs: ["Modifica cobertura o prima para ocupaciones de alto riesgo", "Proporciona cobertura extra", "Reduce todas las primas", "Cancela la póliza"],
    correctAnswer: 0,
    explanationEn: "A hazardous occupation rider adjusts coverage terms for insureds in dangerous jobs.",
    explanationEs: "Un anexo de ocupación peligrosa ajusta los términos de cobertura para asegurados en trabajos peligrosos."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is the payor benefit rider?",
    questionTextEs: "¿Qué es el anexo de beneficio del pagador?",
    optionsEn: ["Waives premiums on a juvenile policy if the adult paying premiums dies or becomes disabled", "Increases death benefit", "Reduces coverage", "Changes beneficiary"],
    optionsEs: ["Exime primas en una póliza juvenil si el adulto que paga las primas fallece o queda discapacitado", "Aumenta el beneficio por muerte", "Reduce la cobertura", "Cambia el beneficiario"],
    correctAnswer: 0,
    explanationEn: "The payor benefit rider waives premiums on a child's policy if the premium-paying adult dies or is disabled.",
    explanationEs: "El anexo de beneficio del pagador exime las primas en la póliza de un niño si el adulto que paga las primas fallece o queda discapacitado."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is a child term rider?",
    questionTextEs: "¿Qué es un anexo de término infantil?",
    optionsEn: ["Provides term insurance coverage on all children of the insured", "Only covers one child", "Permanent coverage for children", "No coverage for children"],
    optionsEs: ["Proporciona cobertura de seguro a término para todos los hijos del asegurado", "Solo cubre a un hijo", "Cobertura permanente para hijos", "Sin cobertura para hijos"],
    correctAnswer: 0,
    explanationEn: "A child term rider provides term life coverage for all eligible children of the policyholder.",
    explanationEs: "Un anexo de término infantil proporciona cobertura de vida a término para todos los hijos elegibles del asegurado."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is a long-term care rider?",
    questionTextEs: "¿Qué es un anexo de cuidado a largo plazo?",
    optionsEn: ["Allows access to death benefit for long-term care expenses", "Increases death benefit", "Reduces premiums", "Changes beneficiary"],
    optionsEs: ["Permite acceso al beneficio por muerte para gastos de cuidado a largo plazo", "Aumenta el beneficio por muerte", "Reduce las primas", "Cambia el beneficiario"],
    correctAnswer: 0,
    explanationEn: "A long-term care rider allows the insured to access part of the death benefit to pay for long-term care needs.",
    explanationEs: "Un anexo de cuidado a largo plazo permite al asegurado acceder a parte del beneficio por muerte para pagar necesidades de cuidado a largo plazo."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is chronic illness rider?",
    questionTextEs: "¿Qué es un anexo de enfermedad crónica?",
    optionsEn: ["Allows early access to death benefit if diagnosed with a chronic illness", "Terminal illness only", "No access to benefits", "Increases premium"],
    optionsEs: ["Permite acceso anticipado al beneficio por muerte si se diagnostica una enfermedad crónica", "Solo enfermedad terminal", "Sin acceso a beneficios", "Aumenta la prima"],
    correctAnswer: 0,
    explanationEn: "A chronic illness rider allows the insured to access death benefits if they're diagnosed with a chronic illness.",
    explanationEs: "Un anexo de enfermedad crónica permite al asegurado acceder a beneficios por muerte si se le diagnostica una enfermedad crónica."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is the return of premium rider?",
    questionTextEs: "¿Qué es el anexo de devolución de prima?",
    optionsEn: ["Returns premiums paid if the insured outlives the policy term", "No premium refund", "Reduces death benefit", "Increases coverage"],
    optionsEs: ["Devuelve las primas pagadas si el asegurado sobrevive el término de la póliza", "Sin reembolso de prima", "Reduce el beneficio por muerte", "Aumenta la cobertura"],
    correctAnswer: 0,
    explanationEn: "The return of premium rider refunds all premiums paid if the insured survives the term of the policy.",
    explanationEs: "El anexo de devolución de prima reembolsa todas las primas pagadas si el asegurado sobrevive el término de la póliza."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is a term conversion rider?",
    questionTextEs: "¿Qué es un anexo de conversión a término?",
    optionsEn: ["Allows converting term insurance to permanent insurance without proof of insurability", "Only permanent to term", "No conversion allowed", "Requires medical exam"],
    optionsEs: ["Permite convertir seguro a término a seguro permanente sin prueba de asegurabilidad", "Solo permanente a término", "No se permite conversión", "Requiere examen médico"],
    correctAnswer: 0,
    explanationEn: "The term conversion rider allows converting a term policy to permanent coverage without medical underwriting.",
    explanationEs: "El anexo de conversión a término permite convertir una póliza a término a cobertura permanente sin suscripción médica."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is a participating policy?",
    questionTextEs: "¿Qué es una póliza participante?",
    optionsEn: ["A policy that pays dividends to policyholders", "A non-dividend policy", "A term policy only", "A variable policy"],
    optionsEs: ["Una póliza que paga dividendos a los asegurados", "Una póliza sin dividendos", "Solo una póliza a término", "Una póliza variable"],
    correctAnswer: 0,
    explanationEn: "A participating policy shares in the insurer's surplus by paying policy dividends to owners.",
    explanationEs: "Una póliza participante comparte el excedente del asegurador pagando dividendos de póliza a los propietarios."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "Are life insurance dividends taxable?",
    questionTextEs: "¿Son gravables los dividendos del seguro de vida?",
    optionsEn: ["Generally no, they are considered a return of premium", "Yes, fully taxable", "Taxed as capital gains", "Taxed as interest income"],
    optionsEs: ["Generalmente no, se consideran una devolución de prima", "Sí, totalmente gravables", "Gravados como ganancias de capital", "Gravados como ingresos por intereses"],
    correctAnswer: 0,
    explanationEn: "Policy dividends are generally not taxable because they're considered a return of overpaid premiums.",
    explanationEs: "Los dividendos de póliza generalmente no son gravables porque se consideran una devolución de primas pagadas en exceso."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What dividend option uses dividends to purchase additional paid-up insurance?",
    questionTextEs: "¿Qué opción de dividendos usa los dividendos para comprar seguro pagado adicional?",
    optionsEn: ["Paid-up additions", "Cash payment", "Premium reduction", "Accumulate at interest"],
    optionsEs: ["Adiciones pagadas", "Pago en efectivo", "Reducción de prima", "Acumular a interés"],
    correctAnswer: 0,
    explanationEn: "Paid-up additions use dividends to purchase additional fully paid permanent insurance.",
    explanationEs: "Las adiciones pagadas usan dividendos para comprar seguro permanente totalmente pagado adicional."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What dividend option applies dividends toward premium payments?",
    questionTextEs: "¿Qué opción de dividendos aplica los dividendos hacia pagos de primas?",
    optionsEn: ["Premium reduction", "Cash payment", "Paid-up additions", "Accumulate at interest"],
    optionsEs: ["Reducción de prima", "Pago en efectivo", "Adiciones pagadas", "Acumular a interés"],
    correctAnswer: 0,
    explanationEn: "The premium reduction option uses dividends to reduce the amount of premium due.",
    explanationEs: "La opción de reducción de prima usa dividendos para reducir el monto de prima debido."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is the accumulate at interest dividend option?",
    questionTextEs: "¿Qué es la opción de dividendos de acumular a interés?",
    optionsEn: ["Dividends are left with the insurer to accumulate interest", "Paid out immediately", "Used to buy insurance", "Applied to premiums"],
    optionsEs: ["Los dividendos se dejan con el asegurador para acumular interés", "Pagados inmediatamente", "Usados para comprar seguro", "Aplicados a primas"],
    correctAnswer: 0,
    explanationEn: "Accumulate at interest leaves dividends with the insurer where they earn interest.",
    explanationEs: "Acumular a interés deja los dividendos con el asegurador donde ganan interés."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is a non-participating policy?",
    questionTextEs: "¿Qué es una póliza no participante?",
    optionsEn: ["A policy that does not pay dividends", "A policy that pays dividends", "A term policy", "A variable policy"],
    optionsEs: ["Una póliza que no paga dividendos", "Una póliza que paga dividendos", "Una póliza a término", "Una póliza variable"],
    correctAnswer: 0,
    explanationEn: "A non-participating policy does not share in the insurer's surplus and pays no dividends.",
    explanationEs: "Una póliza no participante no comparte el excedente del asegurador y no paga dividendos."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is joint life insurance?",
    questionTextEs: "¿Qué es el seguro de vida conjunto?",
    optionsEn: ["A single policy covering two lives, paying on the first death", "Individual policies", "Group insurance", "No death benefit"],
    optionsEs: ["Una sola póliza que cubre dos vidas, pagando en la primera muerte", "Pólizas individuales", "Seguro grupal", "Sin beneficio por muerte"],
    correctAnswer: 0,
    explanationEn: "Joint life (first-to-die) insurance covers two people and pays the death benefit when the first insured dies.",
    explanationEs: "El seguro de vida conjunto (primero en morir) cubre a dos personas y paga el beneficio por muerte cuando el primer asegurado fallece."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is survivorship (second-to-die) life insurance?",
    questionTextEs: "¿Qué es el seguro de vida de supervivencia (segundo en morir)?",
    optionsEn: ["A policy that pays the death benefit when the second of two insureds dies", "Pays on first death", "Individual policy", "Term insurance"],
    optionsEs: ["Una póliza que paga el beneficio por muerte cuando el segundo de dos asegurados fallece", "Paga en la primera muerte", "Póliza individual", "Seguro a término"],
    correctAnswer: 0,
    explanationEn: "Survivorship insurance covers two lives but pays the death benefit only after both insureds have died.",
    explanationEs: "El seguro de supervivencia cubre dos vidas pero paga el beneficio por muerte solo después de que ambos asegurados hayan fallecido."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is final expense insurance?",
    questionTextEs: "¿Qué es el seguro de gastos finales?",
    optionsEn: ["Small whole life policies designed to cover funeral and burial costs", "Large death benefits", "Investment products", "Health insurance"],
    optionsEs: ["Pólizas pequeñas de vida entera diseñadas para cubrir costos funerarios y de entierro", "Grandes beneficios por muerte", "Productos de inversión", "Seguro de salud"],
    correctAnswer: 0,
    explanationEn: "Final expense insurance provides a small death benefit intended to cover burial, funeral, and final medical expenses.",
    explanationEs: "El seguro de gastos finales proporciona un pequeño beneficio por muerte destinado a cubrir entierro, funeral y gastos médicos finales."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is guaranteed issue life insurance?",
    questionTextEs: "¿Qué es el seguro de vida de emisión garantizada?",
    optionsEn: ["Life insurance issued without medical underwriting or health questions", "Full medical exam required", "Only for healthy individuals", "Variable insurance"],
    optionsEs: ["Seguro de vida emitido sin suscripción médica o preguntas de salud", "Examen médico completo requerido", "Solo para individuos saludables", "Seguro variable"],
    correctAnswer: 0,
    explanationEn: "Guaranteed issue policies accept all applicants without health questions, typically with limited benefits initially.",
    explanationEs: "Las pólizas de emisión garantizada aceptan a todos los solicitantes sin preguntas de salud, típicamente con beneficios limitados inicialmente."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is simplified issue life insurance?",
    questionTextEs: "¿Qué es el seguro de vida de emisión simplificada?",
    optionsEn: ["Life insurance with limited health questions and no medical exam", "Full underwriting required", "Guaranteed issue", "Variable life"],
    optionsEs: ["Seguro de vida con preguntas de salud limitadas y sin examen médico", "Suscripción completa requerida", "Emisión garantizada", "Vida variable"],
    correctAnswer: 0,
    explanationEn: "Simplified issue has a short health questionnaire but no physical exam, with faster underwriting.",
    explanationEs: "La emisión simplificada tiene un cuestionario de salud corto pero sin examen físico, con suscripción más rápida."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is a graded death benefit?",
    questionTextEs: "¿Qué es un beneficio por muerte graduado?",
    optionsEn: ["A death benefit that increases over time, often used in guaranteed issue policies", "Full benefit immediately", "Decreasing benefit", "No death benefit"],
    optionsEs: ["Un beneficio por muerte que aumenta con el tiempo, a menudo usado en pólizas de emisión garantizada", "Beneficio completo inmediatamente", "Beneficio decreciente", "Sin beneficio por muerte"],
    correctAnswer: 0,
    explanationEn: "Graded death benefits start low and increase over the first few years, common in guaranteed issue products.",
    explanationEs: "Los beneficios por muerte graduados comienzan bajos y aumentan durante los primeros años, común en productos de emisión garantizada."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is credit life insurance?",
    questionTextEs: "¿Qué es el seguro de vida de crédito?",
    optionsEn: ["Insurance that pays off a loan balance if the borrower dies", "Investment insurance", "Health insurance", "Property insurance"],
    optionsEs: ["Seguro que paga el saldo de un préstamo si el prestatario fallece", "Seguro de inversión", "Seguro de salud", "Seguro de propiedad"],
    correctAnswer: 0,
    explanationEn: "Credit life insurance pays the outstanding loan balance to the lender if the borrower dies.",
    explanationEs: "El seguro de vida de crédito paga el saldo del préstamo pendiente al prestamista si el prestatario fallece."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is mortgage life insurance?",
    questionTextEs: "¿Qué es el seguro de vida hipotecario?",
    optionsEn: ["Decreasing term insurance designed to pay off a mortgage balance", "Increasing coverage", "Permanent insurance", "Health insurance"],
    optionsEs: ["Seguro a término decreciente diseñado para pagar un saldo hipotecario", "Cobertura creciente", "Seguro permanente", "Seguro de salud"],
    correctAnswer: 0,
    explanationEn: "Mortgage life insurance is decreasing term insurance that pays off the remaining mortgage if the homeowner dies.",
    explanationEs: "El seguro de vida hipotecario es seguro a término decreciente que paga la hipoteca restante si el propietario fallece."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is industrial life insurance?",
    questionTextEs: "¿Qué es el seguro de vida industrial?",
    optionsEn: ["Small face amount policies with premiums collected weekly at the home", "Large policies", "Group insurance", "Variable insurance"],
    optionsEs: ["Pólizas de monto nominal pequeño con primas cobradas semanalmente en el hogar", "Pólizas grandes", "Seguro grupal", "Seguro variable"],
    correctAnswer: 0,
    explanationEn: "Industrial (debit) life insurance has small face amounts with premiums collected weekly at the policyholder's home.",
    explanationEs: "El seguro de vida industrial (débito) tiene montos nominales pequeños con primas cobradas semanalmente en el hogar del asegurado."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is family income policy?",
    questionTextEs: "¿Qué es una póliza de ingreso familiar?",
    optionsEn: ["Combines whole life with decreasing term to provide income for a period after death", "Term only", "Whole life only", "Variable life"],
    optionsEs: ["Combina vida entera con término decreciente para proporcionar ingreso por un período después de la muerte", "Solo término", "Solo vida entera", "Vida variable"],
    correctAnswer: 0,
    explanationEn: "A family income policy provides monthly income to survivors for a specified period, plus a lump-sum death benefit.",
    explanationEs: "Una póliza de ingreso familiar proporciona ingreso mensual a los sobrevivientes por un período especificado, más un beneficio por muerte de suma global."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is family maintenance policy?",
    questionTextEs: "¿Qué es una póliza de mantenimiento familiar?",
    optionsEn: ["Provides monthly income for a set period following the insured's death, then lump sum", "Lump sum only", "Income only", "No death benefit"],
    optionsEs: ["Proporciona ingreso mensual por un período establecido después de la muerte del asegurado, luego suma global", "Solo suma global", "Solo ingreso", "Sin beneficio por muerte"],
    correctAnswer: 0,
    explanationEn: "Family maintenance policy provides income for a fixed period after death, then pays the full face amount.",
    explanationEs: "La póliza de mantenimiento familiar proporciona ingreso por un período fijo después de la muerte, luego paga el monto nominal completo."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is juvenile life insurance?",
    questionTextEs: "¿Qué es el seguro de vida juvenil?",
    optionsEn: ["Life insurance purchased on a child's life", "Adult insurance only", "Health insurance for children", "Property insurance"],
    optionsEs: ["Seguro de vida comprado sobre la vida de un niño", "Solo seguro de adultos", "Seguro de salud para niños", "Seguro de propiedad"],
    correctAnswer: 0,
    explanationEn: "Juvenile life insurance is purchased on a child's life, often by parents or grandparents.",
    explanationEs: "El seguro de vida juvenil se compra sobre la vida de un niño, a menudo por padres o abuelos."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "Who owns a juvenile life insurance policy?",
    questionTextEs: "¿Quién es dueño de una póliza de seguro de vida juvenil?",
    optionsEn: ["The adult who purchased it until the child reaches a specified age", "The child from the start", "The insurance company", "The government"],
    optionsEs: ["El adulto que la compró hasta que el niño alcance una edad especificada", "El niño desde el inicio", "La compañía de seguros", "El gobierno"],
    correctAnswer: 0,
    explanationEn: "The adult purchaser owns the juvenile policy until ownership transfers to the child at a specified age.",
    explanationEs: "El adulto comprador es dueño de la póliza juvenil hasta que la propiedad se transfiere al niño a una edad especificada."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is needs-based selling?",
    questionTextEs: "¿Qué es la venta basada en necesidades?",
    optionsEn: ["Recommending coverage based on the client's specific financial needs", "Selling any available product", "High-pressure sales", "Cold calling"],
    optionsEs: ["Recomendar cobertura basada en las necesidades financieras específicas del cliente", "Vender cualquier producto disponible", "Ventas de alta presión", "Llamadas en frío"],
    correctAnswer: 0,
    explanationEn: "Needs-based selling analyzes a client's financial situation to recommend appropriate coverage amounts and types.",
    explanationEs: "La venta basada en necesidades analiza la situación financiera de un cliente para recomendar montos y tipos de cobertura apropiados."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is the human life value approach?",
    questionTextEs: "¿Qué es el enfoque de valor de vida humana?",
    optionsEn: ["Calculating insurance needs based on the present value of future earnings", "Based on debts only", "Arbitrary amounts", "Based on age only"],
    optionsEs: ["Calcular necesidades de seguro basándose en el valor presente de ingresos futuros", "Basado solo en deudas", "Montos arbitrarios", "Basado solo en edad"],
    correctAnswer: 0,
    explanationEn: "The human life value approach determines insurance needs by calculating the present value of expected future income.",
    explanationEs: "El enfoque de valor de vida humana determina las necesidades de seguro calculando el valor presente del ingreso futuro esperado."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is the needs approach to life insurance?",
    questionTextEs: "¿Qué es el enfoque de necesidades para el seguro de vida?",
    optionsEn: ["Calculating coverage based on specific financial needs like debts, education, and income replacement", "Human life value only", "Minimum coverage", "Maximum coverage"],
    optionsEs: ["Calcular cobertura basándose en necesidades financieras específicas como deudas, educación y reemplazo de ingreso", "Solo valor de vida humana", "Cobertura mínima", "Cobertura máxima"],
    correctAnswer: 0,
    explanationEn: "The needs approach calculates coverage by adding up specific financial needs survivors would have.",
    explanationEs: "El enfoque de necesidades calcula la cobertura sumando las necesidades financieras específicas que tendrían los sobrevivientes."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is stranger-originated life insurance (STOLI)?",
    questionTextEs: "¿Qué es el seguro de vida originado por extraños (STOLI)?",
    optionsEn: ["Life insurance purchased by investors with no insurable interest on the insured", "Standard life insurance", "Group insurance", "Term insurance"],
    optionsEs: ["Seguro de vida comprado por inversores sin interés asegurable en el asegurado", "Seguro de vida estándar", "Seguro grupal", "Seguro a término"],
    correctAnswer: 0,
    explanationEn: "STOLI involves third-party investors purchasing life insurance on individuals, which is generally prohibited.",
    explanationEs: "STOLI involucra a inversores terceros comprando seguro de vida sobre individuos, lo cual generalmente está prohibido."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is a 1035 exchange?",
    questionTextEs: "¿Qué es un intercambio 1035?",
    optionsEn: ["Tax-free exchange of one life insurance or annuity for another", "Taxable exchange", "Premium payment", "Policy loan"],
    optionsEs: ["Intercambio libre de impuestos de un seguro de vida o anualidad por otro", "Intercambio gravable", "Pago de prima", "Préstamo de póliza"],
    correctAnswer: 0,
    explanationEn: "A 1035 exchange allows tax-free transfer of values from one life insurance policy or annuity to another.",
    explanationEs: "Un intercambio 1035 permite transferencia libre de impuestos de valores de una póliza de seguro de vida o anualidad a otra."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What types of exchanges qualify under Section 1035?",
    questionTextEs: "¿Qué tipos de intercambios califican bajo la Sección 1035?",
    optionsEn: ["Life to life, annuity to annuity, life to annuity (but not annuity to life)", "Any insurance exchange", "Only annuities", "Only term insurance"],
    optionsEs: ["Vida a vida, anualidad a anualidad, vida a anualidad (pero no anualidad a vida)", "Cualquier intercambio de seguros", "Solo anualidades", "Solo seguro a término"],
    correctAnswer: 0,
    explanationEn: "Section 1035 allows life-to-life, annuity-to-annuity, and life-to-annuity exchanges, but not annuity-to-life.",
    explanationEs: "La Sección 1035 permite intercambios vida-a-vida, anualidad-a-anualidad y vida-a-anualidad, pero no anualidad-a-vida."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is the transfer for value rule?",
    questionTextEs: "¿Qué es la regla de transferencia por valor?",
    optionsEn: ["If a policy is sold for value, death benefits may become taxable", "Benefits are always tax-free", "Premium payments are taxed", "No tax implications"],
    optionsEs: ["Si una póliza se vende por valor, los beneficios por muerte pueden volverse gravables", "Los beneficios siempre son libres de impuestos", "Los pagos de primas son gravados", "Sin implicaciones fiscales"],
    correctAnswer: 0,
    explanationEn: "Under the transfer for value rule, if a policy is sold, death benefits above the buyer's cost may be taxable.",
    explanationEs: "Bajo la regla de transferencia por valor, si una póliza se vende, los beneficios por muerte por encima del costo del comprador pueden ser gravables."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is an irrevocable life insurance trust (ILIT)?",
    questionTextEs: "¿Qué es un fideicomiso de seguro de vida irrevocable (ILIT)?",
    optionsEn: ["A trust that owns life insurance to remove it from the insured's estate", "A revocable trust", "A bank account", "A checking account"],
    optionsEs: ["Un fideicomiso que posee seguro de vida para removerlo del patrimonio del asegurado", "Un fideicomiso revocable", "Una cuenta bancaria", "Una cuenta de cheques"],
    correctAnswer: 0,
    explanationEn: "An ILIT owns a life insurance policy so the death benefit is not included in the insured's taxable estate.",
    explanationEs: "Un ILIT posee una póliza de seguro de vida para que el beneficio por muerte no se incluya en el patrimonio gravable del asegurado."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is the three-year rule for life insurance and estate taxes?",
    questionTextEs: "¿Qué es la regla de tres años para seguro de vida e impuestos patrimoniales?",
    optionsEn: ["Policies transferred within 3 years of death may be included in the estate", "No time limit", "1-year rule", "5-year rule"],
    optionsEs: ["Las pólizas transferidas dentro de 3 años de la muerte pueden incluirse en el patrimonio", "Sin límite de tiempo", "Regla de 1 año", "Regla de 5 años"],
    correctAnswer: 0,
    explanationEn: "If a policy is transferred to an ILIT within 3 years of death, it may still be included in the taxable estate.",
    explanationEs: "Si una póliza se transfiere a un ILIT dentro de 3 años de la muerte, aún puede incluirse en el patrimonio gravable."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is a mortality table?",
    questionTextEs: "¿Qué es una tabla de mortalidad?",
    optionsEn: ["A statistical chart showing death rates at each age", "A premium chart", "A coverage table", "A claims record"],
    optionsEs: ["Un gráfico estadístico que muestra tasas de muerte a cada edad", "Un gráfico de primas", "Una tabla de cobertura", "Un registro de reclamos"],
    correctAnswer: 0,
    explanationEn: "Mortality tables show the probability of death at each age, used to calculate life insurance premiums.",
    explanationEs: "Las tablas de mortalidad muestran la probabilidad de muerte a cada edad, usadas para calcular primas de seguro de vida."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is the cost of insurance in a life insurance policy?",
    questionTextEs: "¿Cuál es el costo de seguro en una póliza de seguro de vida?",
    optionsEn: ["The portion of premium that covers the mortality risk", "The full premium", "The cash value", "The death benefit"],
    optionsEs: ["La porción de la prima que cubre el riesgo de mortalidad", "La prima completa", "El valor en efectivo", "El beneficio por muerte"],
    correctAnswer: 0,
    explanationEn: "The cost of insurance is the mortality charge that covers the risk of paying the death benefit.",
    explanationEs: "El costo de seguro es el cargo de mortalidad que cubre el riesgo de pagar el beneficio por muerte."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is an exclusion ratio in annuities?",
    questionTextEs: "¿Qué es un índice de exclusión en anualidades?",
    optionsEn: ["The portion of each annuity payment that is tax-free return of principal", "Full taxation", "No taxation", "Capital gains rate"],
    optionsEs: ["La porción de cada pago de anualidad que es devolución de capital libre de impuestos", "Tributación completa", "Sin tributación", "Tasa de ganancias de capital"],
    correctAnswer: 0,
    explanationEn: "The exclusion ratio determines how much of each annuity payment is return of premium (tax-free) vs. taxable gain.",
    explanationEs: "El índice de exclusión determina cuánto de cada pago de anualidad es devolución de prima (libre de impuestos) vs. ganancia gravable."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is the surrender charge in an annuity?",
    questionTextEs: "¿Qué es el cargo por rescate en una anualidad?",
    optionsEn: ["A fee charged for early withdrawal from the annuity", "A premium payment", "An interest payment", "A death benefit"],
    optionsEs: ["Una tarifa cobrada por retiro anticipado de la anualidad", "Un pago de prima", "Un pago de interés", "Un beneficio por muerte"],
    correctAnswer: 0,
    explanationEn: "Surrender charges are fees deducted if you withdraw from or surrender an annuity during the surrender period.",
    explanationEs: "Los cargos por rescate son tarifas deducidas si se retira o rescata una anualidad durante el período de rescate."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is the death benefit guarantee in a variable annuity?",
    questionTextEs: "¿Qué es la garantía de beneficio por muerte en una anualidad variable?",
    optionsEn: ["Guarantees beneficiaries receive at least the amount invested if the annuitant dies during accumulation", "No guarantee", "Full market value only", "Double the investment"],
    optionsEs: ["Garantiza que los beneficiarios reciban al menos el monto invertido si el beneficiario fallece durante la acumulación", "Sin garantía", "Solo valor de mercado completo", "El doble de la inversión"],
    correctAnswer: 0,
    explanationEn: "The death benefit guarantee ensures beneficiaries receive at least the principal invested, regardless of market performance.",
    explanationEs: "La garantía de beneficio por muerte asegura que los beneficiarios reciban al menos el capital invertido, independientemente del rendimiento del mercado."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is a qualified annuity?",
    questionTextEs: "¿Qué es una anualidad calificada?",
    optionsEn: ["An annuity funded with pre-tax dollars as part of a qualified retirement plan", "Post-tax funded", "Not for retirement", "Individual policy only"],
    optionsEs: ["Una anualidad financiada con dólares antes de impuestos como parte de un plan de jubilación calificado", "Financiada después de impuestos", "No para jubilación", "Solo póliza individual"],
    correctAnswer: 0,
    explanationEn: "A qualified annuity is funded with pre-tax dollars and is subject to retirement plan rules and taxation.",
    explanationEs: "Una anualidad calificada se financia con dólares antes de impuestos y está sujeta a reglas de planes de jubilación y tributación."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is a non-qualified annuity?",
    questionTextEs: "¿Qué es una anualidad no calificada?",
    optionsEn: ["An annuity purchased with after-tax dollars outside a retirement plan", "Pre-tax funded", "Only for retirement plans", "Group annuity"],
    optionsEs: ["Una anualidad comprada con dólares después de impuestos fuera de un plan de jubilación", "Financiada antes de impuestos", "Solo para planes de jubilación", "Anualidad grupal"],
    correctAnswer: 0,
    explanationEn: "A non-qualified annuity is purchased with after-tax money and only the earnings are taxable upon withdrawal.",
    explanationEs: "Una anualidad no calificada se compra con dinero después de impuestos y solo las ganancias son gravables al retiro."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is the 10% early withdrawal penalty for annuities?",
    questionTextEs: "¿Qué es la penalidad del 10% por retiro anticipado para anualidades?",
    optionsEn: ["A federal tax penalty on taxable withdrawals before age 59½", "No penalty exists", "State penalty only", "Premium refund"],
    optionsEs: ["Una penalidad fiscal federal sobre retiros gravables antes de los 59½ años", "No existe penalidad", "Solo penalidad estatal", "Reembolso de prima"],
    correctAnswer: 0,
    explanationEn: "Withdrawals of taxable amounts from annuities before age 59½ are subject to a 10% IRS penalty plus income tax.",
    explanationEs: "Los retiros de montos gravables de anualidades antes de los 59½ años están sujetos a una penalidad del 10% del IRS más impuesto sobre la renta."
  },
  {
    category: "life_insurance" as const,
    questionTextEn: "What is a refund annuity?",
    questionTextEs: "¿Qué es una anualidad con reembolso?",
    optionsEn: ["Guarantees that total payments will at least equal the premium paid", "No refund available", "Lump sum only", "Life income only"],
    optionsEs: ["Garantiza que los pagos totales al menos igualen la prima pagada", "Sin reembolso disponible", "Solo suma global", "Solo ingreso vitalicio"],
    correctAnswer: 0,
    explanationEn: "A refund annuity guarantees that if the annuitant dies early, beneficiaries receive at least the premium paid.",
    explanationEs: "Una anualidad con reembolso garantiza que si el beneficiario muere temprano, los beneficiarios reciben al menos la prima pagada."
  }
];

async function seedAdditionalLifeQuestions() {
  console.log("Seeding additional Life Insurance questions...");
  
  try {
    for (const question of additionalLifeQuestions) {
      await db.insert(questions).values(question);
    }
    console.log(`Successfully added ${additionalLifeQuestions.length} Life Insurance questions`);
  } catch (error) {
    console.error("Error seeding Life Insurance questions:", error);
    throw error;
  }
}

seedAdditionalLifeQuestions()
  .then(() => {
    console.log("Life Insurance additional seeding complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  });
