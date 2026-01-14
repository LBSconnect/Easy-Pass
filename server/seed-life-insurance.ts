import { db } from "./db";
import { questions } from "@shared/schema";

interface QuestionData {
  category: "life_insurance";
  questionTextEn: string;
  questionTextEs: string;
  optionsEn: string[];
  optionsEs: string[];
  correctAnswer: number;
  explanationEn: string;
  explanationEs: string;
}

const lifeInsuranceQuestions: QuestionData[] = [
  // TDI Regulations and Licensing (1-20)
  {
    category: "life_insurance",
    questionTextEn: "What state agency regulates life insurance in Texas?",
    questionTextEs: "¿Qué agencia estatal regula el seguro de vida en Texas?",
    optionsEn: ["Texas Department of Insurance (TDI)", "Texas Real Estate Commission", "Texas Department of Health", "Texas Banking Commission"],
    optionsEs: ["Departamento de Seguros de Texas (TDI)", "Comisión de Bienes Raíces de Texas", "Departamento de Salud de Texas", "Comisión Bancaria de Texas"],
    correctAnswer: 0,
    explanationEn: "The Texas Department of Insurance (TDI) regulates all types of insurance in Texas, including life insurance.",
    explanationEs: "El Departamento de Seguros de Texas (TDI) regula todos los tipos de seguros en Texas, incluyendo el seguro de vida."
  },
  {
    category: "life_insurance",
    questionTextEn: "How many hours of pre-licensing education are required for a life insurance license in Texas?",
    questionTextEs: "¿Cuántas horas de educación previa a la licencia se requieren para una licencia de seguro de vida en Texas?",
    optionsEn: ["40 hours", "20 hours", "60 hours", "80 hours"],
    optionsEs: ["40 horas", "20 horas", "60 horas", "80 horas"],
    correctAnswer: 0,
    explanationEn: "Texas requires 40 hours of pre-licensing education for a life insurance license.",
    explanationEs: "Texas requiere 40 horas de educación previa a la licencia para una licencia de seguro de vida."
  },
  {
    category: "life_insurance",
    questionTextEn: "How often must a Texas life insurance license be renewed?",
    questionTextEs: "¿Con qué frecuencia debe renovarse una licencia de seguro de vida de Texas?",
    optionsEn: ["Every 2 years", "Every year", "Every 3 years", "Every 5 years"],
    optionsEs: ["Cada 2 años", "Cada año", "Cada 3 años", "Cada 5 años"],
    correctAnswer: 0,
    explanationEn: "Texas insurance licenses must be renewed every two years.",
    explanationEs: "Las licencias de seguros de Texas deben renovarse cada dos años."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the continuing education requirement for Texas life insurance license renewal?",
    questionTextEs: "¿Cuál es el requisito de educación continua para la renovación de licencia de seguro de vida de Texas?",
    optionsEn: ["24 hours including ethics", "12 hours", "40 hours", "No CE required"],
    optionsEs: ["24 horas incluyendo ética", "12 horas", "40 horas", "No se requiere EC"],
    correctAnswer: 0,
    explanationEn: "Texas requires 24 hours of continuing education for license renewal, including ethics hours.",
    explanationEs: "Texas requiere 24 horas de educación continua para la renovación de licencia, incluyendo horas de ética."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the minimum age to obtain a Texas life insurance license?",
    questionTextEs: "¿Cuál es la edad mínima para obtener una licencia de seguro de vida de Texas?",
    optionsEn: ["18 years old", "21 years old", "16 years old", "25 years old"],
    optionsEs: ["18 años", "21 años", "16 años", "25 años"],
    correctAnswer: 0,
    explanationEn: "Applicants must be at least 18 years old to obtain a Texas insurance license.",
    explanationEs: "Los solicitantes deben tener al menos 18 años para obtener una licencia de seguros de Texas."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is a fiduciary?",
    questionTextEs: "¿Qué es un fiduciario?",
    optionsEn: ["Someone who holds a position of trust and must act in the best interest of another", "An insurance company", "A claims adjuster", "A marketing representative"],
    optionsEs: ["Alguien que ocupa una posición de confianza y debe actuar en el mejor interés de otro", "Una compañía de seguros", "Un ajustador de reclamos", "Un representante de marketing"],
    correctAnswer: 0,
    explanationEn: "A fiduciary is someone who is trusted to act in another person's best interests, such as handling their money.",
    explanationEs: "Un fiduciario es alguien en quien se confía para actuar en los mejores intereses de otra persona, como manejar su dinero."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the Texas Life and Health Insurance Guaranty Association?",
    questionTextEs: "¿Qué es la Asociación de Garantía de Seguros de Vida y Salud de Texas?",
    optionsEn: ["An organization that protects policyholders if an insurer becomes insolvent", "A marketing organization", "A federal agency", "An insurance company"],
    optionsEs: ["Una organización que protege a los asegurados si un asegurador se vuelve insolvente", "Una organización de marketing", "Una agencia federal", "Una compañía de seguros"],
    correctAnswer: 0,
    explanationEn: "The Guaranty Association provides protection to policyholders if their insurance company becomes financially insolvent.",
    explanationEs: "La Asociación de Garantía proporciona protección a los asegurados si su compañía de seguros se vuelve financieramente insolvente."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is replacement in life insurance?",
    questionTextEs: "¿Qué es el reemplazo en seguro de vida?",
    optionsEn: ["Using the values of an existing policy to purchase a new policy", "Buying additional coverage", "Canceling a policy", "Changing beneficiaries"],
    optionsEs: ["Usar los valores de una póliza existente para comprar una nueva póliza", "Comprar cobertura adicional", "Cancelar una póliza", "Cambiar beneficiarios"],
    correctAnswer: 0,
    explanationEn: "Replacement occurs when a new policy is purchased and an existing policy is surrendered, lapsed, or changed.",
    explanationEs: "El reemplazo ocurre cuando se compra una nueva póliza y una póliza existente se rescata, caduca o cambia."
  },
  {
    category: "life_insurance",
    questionTextEn: "What form must be completed in Texas when replacing a life insurance policy?",
    questionTextEs: "¿Qué formulario debe completarse en Texas al reemplazar una póliza de seguro de vida?",
    optionsEn: ["A replacement notice form", "No form is required", "A health questionnaire", "A tax form"],
    optionsEs: ["Un formulario de aviso de reemplazo", "No se requiere formulario", "Un cuestionario de salud", "Un formulario de impuestos"],
    correctAnswer: 0,
    explanationEn: "Texas requires specific disclosure forms when replacing life insurance policies to protect consumers.",
    explanationEs: "Texas requiere formularios de divulgación específicos al reemplazar pólizas de seguro de vida para proteger a los consumidores."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is an unfair trade practice in insurance?",
    questionTextEs: "¿Qué es una práctica comercial injusta en seguros?",
    optionsEn: ["Any deceptive or dishonest practice that violates insurance laws", "Offering discounts", "Selling multiple policies", "Providing good service"],
    optionsEs: ["Cualquier práctica engañosa o deshonesta que viole las leyes de seguros", "Ofrecer descuentos", "Vender múltiples pólizas", "Proporcionar buen servicio"],
    correctAnswer: 0,
    explanationEn: "Unfair trade practices include misrepresentation, twisting, rebating, and other deceptive activities.",
    explanationEs: "Las prácticas comerciales injustas incluyen tergiversación, twisting, rebating y otras actividades engañosas."
  },
  // Types of Life Insurance (21-50)
  {
    category: "life_insurance",
    questionTextEn: "What is term life insurance?",
    questionTextEs: "¿Qué es el seguro de vida a término?",
    optionsEn: ["Life insurance that provides coverage for a specific period of time", "Permanent life insurance", "Investment insurance", "Health insurance"],
    optionsEs: ["Seguro de vida que proporciona cobertura por un período específico de tiempo", "Seguro de vida permanente", "Seguro de inversión", "Seguro de salud"],
    correctAnswer: 0,
    explanationEn: "Term life insurance provides death benefit protection for a specified term, such as 10, 20, or 30 years.",
    explanationEs: "El seguro de vida a término proporciona protección de beneficio por muerte por un término especificado, como 10, 20 o 30 años."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is whole life insurance?",
    questionTextEs: "¿Qué es el seguro de vida entera?",
    optionsEn: ["Permanent life insurance with level premiums and cash value accumulation", "Temporary insurance", "Health insurance", "Auto insurance"],
    optionsEs: ["Seguro de vida permanente con primas niveladas y acumulación de valor en efectivo", "Seguro temporal", "Seguro de salud", "Seguro de auto"],
    correctAnswer: 0,
    explanationEn: "Whole life insurance provides lifetime coverage with fixed premiums and builds cash value over time.",
    explanationEs: "El seguro de vida entera proporciona cobertura de por vida con primas fijas y acumula valor en efectivo con el tiempo."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is universal life insurance?",
    questionTextEs: "¿Qué es el seguro de vida universal?",
    optionsEn: ["Flexible permanent insurance with adjustable premiums and death benefits", "Term insurance only", "Whole life only", "Health insurance"],
    optionsEs: ["Seguro permanente flexible con primas y beneficios por muerte ajustables", "Solo seguro a término", "Solo vida entera", "Seguro de salud"],
    correctAnswer: 0,
    explanationEn: "Universal life offers flexibility in premium payments and death benefits while building cash value.",
    explanationEs: "La vida universal ofrece flexibilidad en pagos de primas y beneficios por muerte mientras acumula valor en efectivo."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is variable life insurance?",
    questionTextEs: "¿Qué es el seguro de vida variable?",
    optionsEn: ["Life insurance where cash value is invested in securities with variable returns", "Fixed return insurance", "Term insurance", "Health insurance"],
    optionsEs: ["Seguro de vida donde el valor en efectivo se invierte en valores con rendimientos variables", "Seguro de rendimiento fijo", "Seguro a término", "Seguro de salud"],
    correctAnswer: 0,
    explanationEn: "Variable life allows the policyholder to invest cash value in securities, with death benefit and cash value varying based on investment performance.",
    explanationEs: "La vida variable permite al asegurado invertir el valor en efectivo en valores, con beneficio por muerte y valor en efectivo que varían según el rendimiento de la inversión."
  },
  {
    category: "life_insurance",
    questionTextEn: "What additional license is required to sell variable life insurance?",
    questionTextEs: "¿Qué licencia adicional se requiere para vender seguro de vida variable?",
    optionsEn: ["Securities license (FINRA)", "Real estate license", "Health insurance license only", "No additional license"],
    optionsEs: ["Licencia de valores (FINRA)", "Licencia de bienes raíces", "Solo licencia de seguro de salud", "Sin licencia adicional"],
    correctAnswer: 0,
    explanationEn: "Variable life insurance requires both an insurance license and a securities license because it involves investment products.",
    explanationEs: "El seguro de vida variable requiere tanto una licencia de seguros como una licencia de valores porque involucra productos de inversión."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is indexed universal life insurance?",
    questionTextEs: "¿Qué es el seguro de vida universal indexado?",
    optionsEn: ["Universal life with cash value growth tied to a stock market index", "Fixed rate insurance", "Variable life insurance", "Term insurance"],
    optionsEs: ["Vida universal con crecimiento de valor en efectivo vinculado a un índice bursátil", "Seguro de tasa fija", "Seguro de vida variable", "Seguro a término"],
    correctAnswer: 0,
    explanationEn: "Indexed universal life ties cash value growth to a stock market index while providing downside protection.",
    explanationEs: "La vida universal indexada vincula el crecimiento del valor en efectivo a un índice bursátil mientras proporciona protección contra pérdidas."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the face amount of a life insurance policy?",
    questionTextEs: "¿Cuál es el monto nominal de una póliza de seguro de vida?",
    optionsEn: ["The death benefit payable upon the insured's death", "The premium amount", "The cash value", "The loan amount"],
    optionsEs: ["El beneficio por muerte pagadero al fallecer el asegurado", "El monto de la prima", "El valor en efectivo", "El monto del préstamo"],
    correctAnswer: 0,
    explanationEn: "The face amount is the death benefit amount stated on the policy that will be paid to beneficiaries.",
    explanationEs: "El monto nominal es la cantidad del beneficio por muerte establecida en la póliza que se pagará a los beneficiarios."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is cash value in life insurance?",
    questionTextEs: "¿Qué es el valor en efectivo en el seguro de vida?",
    optionsEn: ["The savings component of permanent life insurance that grows over time", "The premium", "The death benefit", "The policy fee"],
    optionsEs: ["El componente de ahorro del seguro de vida permanente que crece con el tiempo", "La prima", "El beneficio por muerte", "La tarifa de la póliza"],
    correctAnswer: 0,
    explanationEn: "Cash value is the savings portion of permanent life insurance that accumulates on a tax-deferred basis.",
    explanationEs: "El valor en efectivo es la porción de ahorro del seguro de vida permanente que se acumula con impuestos diferidos."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is a premium in life insurance?",
    questionTextEs: "¿Qué es una prima en el seguro de vida?",
    optionsEn: ["The payment made to keep the policy in force", "The death benefit", "The cash value", "The beneficiary amount"],
    optionsEs: ["El pago hecho para mantener la póliza en vigor", "El beneficio por muerte", "El valor en efectivo", "El monto del beneficiario"],
    correctAnswer: 0,
    explanationEn: "A premium is the periodic payment made to the insurance company to maintain coverage.",
    explanationEs: "Una prima es el pago periódico hecho a la compañía de seguros para mantener la cobertura."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is level term life insurance?",
    questionTextEs: "¿Qué es el seguro de vida a término nivelado?",
    optionsEn: ["Term insurance with a death benefit that remains constant throughout the term", "Decreasing coverage", "Increasing coverage", "Variable coverage"],
    optionsEs: ["Seguro a término con un beneficio por muerte que permanece constante durante todo el término", "Cobertura decreciente", "Cobertura creciente", "Cobertura variable"],
    correctAnswer: 0,
    explanationEn: "Level term provides a constant death benefit and typically level premiums for the entire term.",
    explanationEs: "El término nivelado proporciona un beneficio por muerte constante y típicamente primas niveladas durante todo el término."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is decreasing term life insurance?",
    questionTextEs: "¿Qué es el seguro de vida a término decreciente?",
    optionsEn: ["Term insurance where the death benefit decreases over time", "Increasing coverage", "Level coverage", "Permanent coverage"],
    optionsEs: ["Seguro a término donde el beneficio por muerte disminuye con el tiempo", "Cobertura creciente", "Cobertura nivelada", "Cobertura permanente"],
    correctAnswer: 0,
    explanationEn: "Decreasing term has a death benefit that declines, often used to cover a decreasing debt like a mortgage.",
    explanationEs: "El término decreciente tiene un beneficio por muerte que disminuye, a menudo usado para cubrir una deuda decreciente como una hipoteca."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is renewable term life insurance?",
    questionTextEs: "¿Qué es el seguro de vida a término renovable?",
    optionsEn: ["Term insurance that can be renewed at the end of the term without proof of insurability", "One-time coverage only", "Permanent coverage", "Coverage that cannot be renewed"],
    optionsEs: ["Seguro a término que puede renovarse al final del término sin prueba de asegurabilidad", "Solo cobertura única", "Cobertura permanente", "Cobertura que no puede renovarse"],
    correctAnswer: 0,
    explanationEn: "Renewable term allows the policyholder to renew coverage at the end of the term without medical underwriting.",
    explanationEs: "El término renovable permite al asegurado renovar la cobertura al final del término sin suscripción médica."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is convertible term life insurance?",
    questionTextEs: "¿Qué es el seguro de vida a término convertible?",
    optionsEn: ["Term insurance that can be converted to permanent insurance without proof of insurability", "Permanent insurance only", "Non-convertible term", "Health insurance"],
    optionsEs: ["Seguro a término que puede convertirse a seguro permanente sin prueba de asegurabilidad", "Solo seguro permanente", "Término no convertible", "Seguro de salud"],
    correctAnswer: 0,
    explanationEn: "Convertible term allows conversion to permanent insurance without a medical exam or underwriting.",
    explanationEs: "El término convertible permite conversión a seguro permanente sin examen médico o suscripción."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is single premium life insurance?",
    questionTextEs: "¿Qué es el seguro de vida de prima única?",
    optionsEn: ["Life insurance purchased with one lump-sum payment", "Monthly premium insurance", "Annual premium insurance", "No premium insurance"],
    optionsEs: ["Seguro de vida comprado con un pago único de suma global", "Seguro de prima mensual", "Seguro de prima anual", "Seguro sin prima"],
    correctAnswer: 0,
    explanationEn: "Single premium life insurance is paid for with one upfront lump-sum payment.",
    explanationEs: "El seguro de vida de prima única se paga con un pago único por adelantado de suma global."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is limited pay life insurance?",
    questionTextEs: "¿Qué es el seguro de vida de pago limitado?",
    optionsEn: ["Permanent insurance where premiums are paid for a limited period but coverage continues for life", "Term insurance", "Single premium", "Monthly payments forever"],
    optionsEs: ["Seguro permanente donde las primas se pagan por un período limitado pero la cobertura continúa de por vida", "Seguro a término", "Prima única", "Pagos mensuales para siempre"],
    correctAnswer: 0,
    explanationEn: "Limited pay provides permanent coverage but premiums are paid over a shorter period (like 10 or 20 years).",
    explanationEs: "El pago limitado proporciona cobertura permanente pero las primas se pagan durante un período más corto (como 10 o 20 años)."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is modified whole life insurance?",
    questionTextEs: "¿Qué es el seguro de vida entera modificado?",
    optionsEn: ["Whole life with lower premiums initially that increase after a set period", "Standard whole life", "Term insurance", "Variable life"],
    optionsEs: ["Vida entera con primas más bajas inicialmente que aumentan después de un período establecido", "Vida entera estándar", "Seguro a término", "Vida variable"],
    correctAnswer: 0,
    explanationEn: "Modified whole life has lower initial premiums that increase after a specified period.",
    explanationEs: "La vida entera modificada tiene primas iniciales más bajas que aumentan después de un período especificado."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is graded premium whole life insurance?",
    questionTextEs: "¿Qué es el seguro de vida entera de prima graduada?",
    optionsEn: ["Whole life with premiums that start low and gradually increase to a level amount", "Level premium whole life", "Term insurance", "Variable life"],
    optionsEs: ["Vida entera con primas que comienzan bajas y aumentan gradualmente a una cantidad nivelada", "Vida entera de prima nivelada", "Seguro a término", "Vida variable"],
    correctAnswer: 0,
    explanationEn: "Graded premium whole life has premiums that gradually increase over several years before leveling off.",
    explanationEs: "La vida entera de prima graduada tiene primas que aumentan gradualmente durante varios años antes de nivelarse."
  },
  // Policy Provisions and Riders (51-80)
  {
    category: "life_insurance",
    questionTextEn: "What is the free-look period for life insurance in Texas?",
    questionTextEs: "¿Cuál es el período de revisión gratuita para el seguro de vida en Texas?",
    optionsEn: ["At least 10 days to review and cancel for a full refund", "30 days", "7 days", "No free-look period"],
    optionsEs: ["Al menos 10 días para revisar y cancelar para un reembolso completo", "30 días", "7 días", "Sin período de revisión gratuita"],
    correctAnswer: 0,
    explanationEn: "Texas law provides at least 10 days for policyholders to review a new policy and receive a full refund if cancelled.",
    explanationEs: "La ley de Texas proporciona al menos 10 días para que los asegurados revisen una nueva póliza y reciban un reembolso completo si la cancelan."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the grace period in life insurance?",
    questionTextEs: "¿Qué es el período de gracia en el seguro de vida?",
    optionsEn: ["A period after the premium due date during which the policy remains in force", "The free-look period", "The contestability period", "The policy term"],
    optionsEs: ["Un período después de la fecha de vencimiento de la prima durante el cual la póliza permanece en vigor", "El período de revisión gratuita", "El período de contestabilidad", "El término de la póliza"],
    correctAnswer: 0,
    explanationEn: "The grace period (typically 30-31 days) allows payment after the due date without policy lapse.",
    explanationEs: "El período de gracia (típicamente 30-31 días) permite el pago después de la fecha de vencimiento sin que la póliza caduque."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the contestability period?",
    questionTextEs: "¿Qué es el período de contestabilidad?",
    optionsEn: ["The period (usually 2 years) during which the insurer can void the policy for misrepresentation", "The grace period", "The free-look period", "The policy term"],
    optionsEs: ["El período (usualmente 2 años) durante el cual el asegurador puede anular la póliza por tergiversación", "El período de gracia", "El período de revisión gratuita", "El término de la póliza"],
    correctAnswer: 0,
    explanationEn: "During the contestability period, the insurer can investigate and deny claims for material misrepresentation.",
    explanationEs: "Durante el período de contestabilidad, el asegurador puede investigar y negar reclamos por tergiversación material."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the incontestability clause?",
    questionTextEs: "¿Qué es la cláusula de incontestabilidad?",
    optionsEn: ["After the contestability period, the insurer cannot deny claims based on misstatements in the application", "The insurer can always contest", "No claims can be denied", "The policy automatically renews"],
    optionsEs: ["Después del período de contestabilidad, el asegurador no puede negar reclamos basados en declaraciones falsas en la solicitud", "El asegurador siempre puede contestar", "No se pueden negar reclamos", "La póliza se renueva automáticamente"],
    correctAnswer: 0,
    explanationEn: "Once the contestability period expires, the insurer cannot void the policy for misrepresentation except for fraud.",
    explanationEs: "Una vez que expira el período de contestabilidad, el asegurador no puede anular la póliza por tergiversación excepto por fraude."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the suicide clause?",
    questionTextEs: "¿Qué es la cláusula de suicidio?",
    optionsEn: ["A provision limiting death benefits if the insured commits suicide within a specified period (usually 2 years)", "Full benefits always paid", "No exclusion for suicide", "Benefits doubled for suicide"],
    optionsEs: ["Una disposición que limita los beneficios por muerte si el asegurado comete suicidio dentro de un período especificado (usualmente 2 años)", "Beneficios completos siempre pagados", "Sin exclusión por suicidio", "Beneficios duplicados por suicidio"],
    correctAnswer: 0,
    explanationEn: "The suicide clause limits benefits to premium refund if death by suicide occurs within the first two years.",
    explanationEs: "La cláusula de suicidio limita los beneficios al reembolso de primas si la muerte por suicidio ocurre dentro de los primeros dos años."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the misstatement of age or sex provision?",
    questionTextEs: "¿Qué es la disposición de declaración errónea de edad o sexo?",
    optionsEn: ["If age or sex was misstated, the death benefit is adjusted to what premiums would have purchased", "Policy is voided", "No adjustment is made", "Premium is refunded"],
    optionsEs: ["Si la edad o sexo fue declarado erróneamente, el beneficio por muerte se ajusta a lo que las primas habrían comprado", "La póliza se anula", "No se hace ajuste", "Se reembolsa la prima"],
    correctAnswer: 0,
    explanationEn: "This provision adjusts the death benefit based on the correct age or sex rather than voiding the policy.",
    explanationEs: "Esta disposición ajusta el beneficio por muerte basándose en la edad o sexo correctos en lugar de anular la póliza."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the reinstatement provision?",
    questionTextEs: "¿Qué es la disposición de reinstalación?",
    optionsEn: ["Allows a lapsed policy to be restored within a certain period", "Automatic renewal", "Policy cancellation", "Premium waiver"],
    optionsEs: ["Permite que una póliza caducada se restaure dentro de un cierto período", "Renovación automática", "Cancelación de póliza", "Exención de prima"],
    correctAnswer: 0,
    explanationEn: "Reinstatement allows policyholders to restore lapsed coverage by paying back premiums and proving insurability.",
    explanationEs: "La reinstalación permite a los asegurados restaurar cobertura caducada pagando primas atrasadas y probando asegurabilidad."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is a beneficiary?",
    questionTextEs: "¿Qué es un beneficiario?",
    optionsEn: ["The person or entity designated to receive the death benefit", "The insured", "The insurance agent", "The insurance company"],
    optionsEs: ["La persona o entidad designada para recibir el beneficio por muerte", "El asegurado", "El agente de seguros", "La compañía de seguros"],
    correctAnswer: 0,
    explanationEn: "A beneficiary is the person or entity named to receive the death benefit when the insured dies.",
    explanationEs: "Un beneficiario es la persona o entidad nombrada para recibir el beneficio por muerte cuando el asegurado fallece."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is a primary beneficiary?",
    questionTextEs: "¿Qué es un beneficiario primario?",
    optionsEn: ["The first person entitled to receive the death benefit", "The secondary recipient", "The insurance agent", "The policy owner"],
    optionsEs: ["La primera persona con derecho a recibir el beneficio por muerte", "El destinatario secundario", "El agente de seguros", "El propietario de la póliza"],
    correctAnswer: 0,
    explanationEn: "The primary beneficiary is first in line to receive the death benefit upon the insured's death.",
    explanationEs: "El beneficiario primario es el primero en la línea para recibir el beneficio por muerte al fallecer el asegurado."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is a contingent beneficiary?",
    questionTextEs: "¿Qué es un beneficiario contingente?",
    optionsEn: ["The person who receives the death benefit if the primary beneficiary predeceases the insured", "The first beneficiary", "The insurance company", "The policy owner"],
    optionsEs: ["La persona que recibe el beneficio por muerte si el beneficiario primario fallece antes que el asegurado", "El primer beneficiario", "La compañía de seguros", "El propietario de la póliza"],
    correctAnswer: 0,
    explanationEn: "A contingent (secondary) beneficiary receives the death benefit only if the primary beneficiary is deceased.",
    explanationEs: "Un beneficiario contingente (secundario) recibe el beneficio por muerte solo si el beneficiario primario ha fallecido."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is an irrevocable beneficiary?",
    questionTextEs: "¿Qué es un beneficiario irrevocable?",
    optionsEn: ["A beneficiary who cannot be changed without their consent", "A beneficiary who can be changed anytime", "The insurance company", "The policy owner"],
    optionsEs: ["Un beneficiario que no puede cambiarse sin su consentimiento", "Un beneficiario que puede cambiarse en cualquier momento", "La compañía de seguros", "El propietario de la póliza"],
    correctAnswer: 0,
    explanationEn: "An irrevocable beneficiary cannot be changed without the beneficiary's written consent.",
    explanationEs: "Un beneficiario irrevocable no puede cambiarse sin el consentimiento por escrito del beneficiario."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the waiver of premium rider?",
    questionTextEs: "¿Qué es el anexo de exención de prima?",
    optionsEn: ["Waives premium payments if the insured becomes disabled", "Increases premiums", "Decreases death benefit", "Adds cash value"],
    optionsEs: ["Exime los pagos de prima si el asegurado queda discapacitado", "Aumenta las primas", "Disminuye el beneficio por muerte", "Agrega valor en efectivo"],
    correctAnswer: 0,
    explanationEn: "The waiver of premium rider pays premiums if the insured becomes totally disabled.",
    explanationEs: "El anexo de exención de prima paga las primas si el asegurado queda totalmente discapacitado."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the accelerated death benefit rider?",
    questionTextEs: "¿Qué es el anexo de beneficio por muerte acelerado?",
    optionsEn: ["Allows early access to death benefit if the insured is terminally ill", "Increases death benefit", "Decreases premiums", "Adds cash value"],
    optionsEs: ["Permite acceso anticipado al beneficio por muerte si el asegurado está terminalmente enfermo", "Aumenta el beneficio por muerte", "Disminuye las primas", "Agrega valor en efectivo"],
    correctAnswer: 0,
    explanationEn: "The accelerated death benefit rider pays a portion of the death benefit early if the insured is diagnosed with a terminal illness.",
    explanationEs: "El anexo de beneficio por muerte acelerado paga una porción del beneficio por muerte anticipadamente si el asegurado es diagnosticado con una enfermedad terminal."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the guaranteed insurability rider?",
    questionTextEs: "¿Qué es el anexo de asegurabilidad garantizada?",
    optionsEn: ["Allows purchase of additional coverage at specific times without proof of insurability", "Requires medical exam for additions", "Decreases coverage", "Cancels the policy"],
    optionsEs: ["Permite la compra de cobertura adicional en momentos específicos sin prueba de asegurabilidad", "Requiere examen médico para adiciones", "Disminuye la cobertura", "Cancela la póliza"],
    correctAnswer: 0,
    explanationEn: "The guaranteed insurability rider allows buying additional coverage at specified dates without medical underwriting.",
    explanationEs: "El anexo de asegurabilidad garantizada permite comprar cobertura adicional en fechas especificadas sin suscripción médica."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the accidental death benefit rider?",
    questionTextEs: "¿Qué es el anexo de beneficio por muerte accidental?",
    optionsEn: ["Provides additional death benefit if death results from an accident", "Reduces death benefit", "Provides health coverage", "Reduces premiums"],
    optionsEs: ["Proporciona beneficio por muerte adicional si la muerte resulta de un accidente", "Reduce el beneficio por muerte", "Proporciona cobertura de salud", "Reduce las primas"],
    correctAnswer: 0,
    explanationEn: "The accidental death benefit (double indemnity) rider pays an additional amount if death is caused by an accident.",
    explanationEs: "El anexo de beneficio por muerte accidental (doble indemnización) paga una cantidad adicional si la muerte es causada por un accidente."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is a cost of living rider?",
    questionTextEs: "¿Qué es un anexo de costo de vida?",
    optionsEn: ["Automatically increases coverage to keep pace with inflation", "Decreases coverage", "Fixed coverage amount", "Reduces premiums"],
    optionsEs: ["Aumenta automáticamente la cobertura para mantener el ritmo con la inflación", "Disminuye la cobertura", "Cantidad de cobertura fija", "Reduce las primas"],
    correctAnswer: 0,
    explanationEn: "A cost of living rider increases the death benefit periodically based on inflation or cost of living index.",
    explanationEs: "Un anexo de costo de vida aumenta el beneficio por muerte periódicamente basándose en la inflación o índice de costo de vida."
  },
  // Underwriting and Risk (81-100)
  {
    category: "life_insurance",
    questionTextEn: "What is underwriting in life insurance?",
    questionTextEs: "¿Qué es la suscripción en el seguro de vida?",
    optionsEn: ["The process of evaluating risk and determining if coverage should be issued", "Selling policies", "Paying claims", "Collecting premiums"],
    optionsEs: ["El proceso de evaluar riesgo y determinar si debe emitirse cobertura", "Vender pólizas", "Pagar reclamos", "Cobrar primas"],
    correctAnswer: 0,
    explanationEn: "Underwriting evaluates the risk of insuring an applicant and determines premium rates or if coverage should be offered.",
    explanationEs: "La suscripción evalúa el riesgo de asegurar a un solicitante y determina las tarifas de prima o si debe ofrecerse cobertura."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is a preferred risk classification?",
    questionTextEs: "¿Qué es una clasificación de riesgo preferido?",
    optionsEn: ["A rating for applicants who are healthier than average and pose lower risk", "Average risk", "High risk", "Uninsurable"],
    optionsEs: ["Una calificación para solicitantes que son más saludables que el promedio y representan menor riesgo", "Riesgo promedio", "Alto riesgo", "No asegurable"],
    correctAnswer: 0,
    explanationEn: "Preferred risk classification is for applicants in excellent health who qualify for lower premiums.",
    explanationEs: "La clasificación de riesgo preferido es para solicitantes en excelente salud que califican para primas más bajas."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is a standard risk classification?",
    questionTextEs: "¿Qué es una clasificación de riesgo estándar?",
    optionsEn: ["A rating for applicants who represent average mortality risk", "Below average risk", "High risk", "Uninsurable"],
    optionsEs: ["Una calificación para solicitantes que representan riesgo de mortalidad promedio", "Riesgo por debajo del promedio", "Alto riesgo", "No asegurable"],
    correctAnswer: 0,
    explanationEn: "Standard risk is for applicants with average health and life expectancy who pay standard premium rates.",
    explanationEs: "El riesgo estándar es para solicitantes con salud y expectativa de vida promedio que pagan tarifas de prima estándar."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is a substandard (rated) risk classification?",
    questionTextEs: "¿Qué es una clasificación de riesgo subestándar (calificado)?",
    optionsEn: ["A rating for applicants with higher-than-average risk who pay higher premiums", "Best risk", "Standard risk", "Uninsurable"],
    optionsEs: ["Una calificación para solicitantes con riesgo más alto que el promedio que pagan primas más altas", "Mejor riesgo", "Riesgo estándar", "No asegurable"],
    correctAnswer: 0,
    explanationEn: "Substandard (rated) risks have health conditions requiring higher premiums due to increased mortality risk.",
    explanationEs: "Los riesgos subestándar (calificados) tienen condiciones de salud que requieren primas más altas debido al mayor riesgo de mortalidad."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is insurable interest in life insurance?",
    questionTextEs: "¿Qué es el interés asegurable en el seguro de vida?",
    optionsEn: ["A financial stake in the continued life of the insured", "Interest earned on premiums", "The cash value", "The death benefit"],
    optionsEs: ["Una participación financiera en la vida continuada del asegurado", "Interés ganado sobre primas", "El valor en efectivo", "El beneficio por muerte"],
    correctAnswer: 0,
    explanationEn: "Insurable interest means the policy owner must have a financial or emotional stake in the insured's continued life.",
    explanationEs: "El interés asegurable significa que el propietario de la póliza debe tener una participación financiera o emocional en la vida continuada del asegurado."
  },
  {
    category: "life_insurance",
    questionTextEn: "When must insurable interest exist for life insurance?",
    questionTextEs: "¿Cuándo debe existir el interés asegurable para el seguro de vida?",
    optionsEn: ["At the time of application", "At the time of death", "At policy renewal", "At any time"],
    optionsEs: ["Al momento de la solicitud", "Al momento de la muerte", "En la renovación de la póliza", "En cualquier momento"],
    correctAnswer: 0,
    explanationEn: "For life insurance, insurable interest must exist at the time of application, not at the time of death.",
    explanationEs: "Para el seguro de vida, el interés asegurable debe existir al momento de la solicitud, no al momento de la muerte."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the Medical Information Bureau (MIB)?",
    questionTextEs: "¿Qué es la Oficina de Información Médica (MIB)?",
    optionsEn: ["An organization that shares medical underwriting information among insurers", "A government agency", "A hospital network", "An insurance company"],
    optionsEs: ["Una organización que comparte información de suscripción médica entre aseguradores", "Una agencia del gobierno", "Una red de hospitales", "Una compañía de seguros"],
    correctAnswer: 0,
    explanationEn: "The MIB is a nonprofit that helps insurers detect fraud by sharing relevant medical underwriting information.",
    explanationEs: "El MIB es una organización sin fines de lucro que ayuda a los aseguradores a detectar fraude compartiendo información relevante de suscripción médica."
  },
  // Settlement Options and Claims (101-120)
  {
    category: "life_insurance",
    questionTextEn: "What is a lump-sum settlement option?",
    questionTextEs: "¿Qué es una opción de liquidación de suma global?",
    optionsEn: ["The entire death benefit paid in one payment", "Monthly payments", "Annual payments", "Deferred payments"],
    optionsEs: ["El beneficio por muerte completo pagado en un solo pago", "Pagos mensuales", "Pagos anuales", "Pagos diferidos"],
    correctAnswer: 0,
    explanationEn: "Lump-sum settlement pays the entire death benefit to the beneficiary in one payment.",
    explanationEs: "La liquidación de suma global paga el beneficio por muerte completo al beneficiario en un solo pago."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the interest only settlement option?",
    questionTextEs: "¿Qué es la opción de liquidación de solo interés?",
    optionsEn: ["The insurer holds the death benefit and pays only interest to the beneficiary", "Principal paid immediately", "No interest paid", "Monthly principal payments"],
    optionsEs: ["El asegurador retiene el beneficio por muerte y paga solo interés al beneficiario", "Capital pagado inmediatamente", "Sin interés pagado", "Pagos mensuales de capital"],
    correctAnswer: 0,
    explanationEn: "Interest only option holds the principal and pays interest to the beneficiary; principal can be withdrawn or paid later.",
    explanationEs: "La opción de solo interés retiene el capital y paga interés al beneficiario; el capital puede retirarse o pagarse después."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the fixed period settlement option?",
    questionTextEs: "¿Qué es la opción de liquidación de período fijo?",
    optionsEn: ["Death benefit paid in equal installments over a specified period", "Lump sum payment", "Interest only", "Life income"],
    optionsEs: ["Beneficio por muerte pagado en cuotas iguales durante un período especificado", "Pago de suma global", "Solo interés", "Ingreso vitalicio"],
    correctAnswer: 0,
    explanationEn: "Fixed period settlement pays the death benefit and interest in equal installments over a chosen time period.",
    explanationEs: "La liquidación de período fijo paga el beneficio por muerte e interés en cuotas iguales durante un período de tiempo elegido."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the fixed amount settlement option?",
    questionTextEs: "¿Qué es la opción de liquidación de cantidad fija?",
    optionsEn: ["A specified amount paid periodically until the death benefit is exhausted", "Lump sum", "Interest only", "Indefinite payments"],
    optionsEs: ["Una cantidad especificada pagada periódicamente hasta que el beneficio por muerte se agote", "Suma global", "Solo interés", "Pagos indefinidos"],
    correctAnswer: 0,
    explanationEn: "Fixed amount settlement pays a specific dollar amount until the principal and interest are depleted.",
    explanationEs: "La liquidación de cantidad fija paga una cantidad de dólares específica hasta que el capital e interés se agoten."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the life income settlement option?",
    questionTextEs: "¿Qué es la opción de liquidación de ingreso vitalicio?",
    optionsEn: ["Payments made for the beneficiary's lifetime", "Fixed period payments", "Lump sum", "Interest only"],
    optionsEs: ["Pagos hechos por la vida del beneficiario", "Pagos de período fijo", "Suma global", "Solo interés"],
    correctAnswer: 0,
    explanationEn: "Life income settlement provides payments to the beneficiary for their entire life based on the death benefit.",
    explanationEs: "La liquidación de ingreso vitalicio proporciona pagos al beneficiario por toda su vida basándose en el beneficio por muerte."
  },
  {
    category: "life_insurance",
    questionTextEn: "What are policy loans?",
    questionTextEs: "¿Qué son los préstamos de póliza?",
    optionsEn: ["Loans taken against the cash value of a permanent life insurance policy", "Loans to buy insurance", "Bank loans", "Premium financing"],
    optionsEs: ["Préstamos tomados contra el valor en efectivo de una póliza de seguro de vida permanente", "Préstamos para comprar seguro", "Préstamos bancarios", "Financiamiento de primas"],
    correctAnswer: 0,
    explanationEn: "Policy loans allow policyholders to borrow against accumulated cash value at a stated interest rate.",
    explanationEs: "Los préstamos de póliza permiten a los asegurados pedir prestado contra el valor en efectivo acumulado a una tasa de interés establecida."
  },
  {
    category: "life_insurance",
    questionTextEn: "What happens if a policy loan is not repaid?",
    questionTextEs: "¿Qué sucede si un préstamo de póliza no se paga?",
    optionsEn: ["The outstanding loan amount reduces the death benefit", "Nothing happens", "The policy continues unchanged", "The insurer pays the loan"],
    optionsEs: ["El monto del préstamo pendiente reduce el beneficio por muerte", "No pasa nada", "La póliza continúa sin cambios", "El asegurador paga el préstamo"],
    correctAnswer: 0,
    explanationEn: "Unpaid policy loans plus interest are deducted from the death benefit when the insured dies.",
    explanationEs: "Los préstamos de póliza no pagados más interés se deducen del beneficio por muerte cuando el asegurado fallece."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is a policy surrender?",
    questionTextEs: "¿Qué es un rescate de póliza?",
    optionsEn: ["Canceling a policy and receiving the cash surrender value", "Renewing a policy", "Changing beneficiaries", "Adding riders"],
    optionsEs: ["Cancelar una póliza y recibir el valor de rescate en efectivo", "Renovar una póliza", "Cambiar beneficiarios", "Agregar anexos"],
    correctAnswer: 0,
    explanationEn: "Surrendering a policy means terminating it and receiving the accumulated cash value minus any surrender charges.",
    explanationEs: "Rescatar una póliza significa terminarla y recibir el valor en efectivo acumulado menos cualquier cargo por rescate."
  },
  // Annuities (121-145)
  {
    category: "life_insurance",
    questionTextEn: "What is an annuity?",
    questionTextEs: "¿Qué es una anualidad?",
    optionsEn: ["A contract that provides regular income payments, typically for retirement", "A death benefit only product", "Health insurance", "Property insurance"],
    optionsEs: ["Un contrato que proporciona pagos de ingreso regulares, típicamente para jubilación", "Un producto solo de beneficio por muerte", "Seguro de salud", "Seguro de propiedad"],
    correctAnswer: 0,
    explanationEn: "An annuity is a contract with an insurer that provides periodic payments, often used for retirement income.",
    explanationEs: "Una anualidad es un contrato con un asegurador que proporciona pagos periódicos, a menudo usado para ingreso de jubilación."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is a fixed annuity?",
    questionTextEs: "¿Qué es una anualidad fija?",
    optionsEn: ["An annuity that guarantees a fixed interest rate and payment amount", "Variable returns", "No guaranteed payments", "Stock market returns"],
    optionsEs: ["Una anualidad que garantiza una tasa de interés fija y monto de pago", "Rendimientos variables", "Sin pagos garantizados", "Rendimientos del mercado de valores"],
    correctAnswer: 0,
    explanationEn: "A fixed annuity provides guaranteed interest rates and predictable payment amounts.",
    explanationEs: "Una anualidad fija proporciona tasas de interés garantizadas y montos de pago predecibles."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is a variable annuity?",
    questionTextEs: "¿Qué es una anualidad variable?",
    optionsEn: ["An annuity where payments vary based on investment performance", "Fixed payments", "Guaranteed interest", "No investment component"],
    optionsEs: ["Una anualidad donde los pagos varían basándose en el rendimiento de la inversión", "Pagos fijos", "Interés garantizado", "Sin componente de inversión"],
    correctAnswer: 0,
    explanationEn: "Variable annuities have payments that fluctuate based on the performance of underlying investments.",
    explanationEs: "Las anualidades variables tienen pagos que fluctúan basándose en el rendimiento de las inversiones subyacentes."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is an immediate annuity?",
    questionTextEs: "¿Qué es una anualidad inmediata?",
    optionsEn: ["An annuity that begins payments within one year of purchase", "Payments start after many years", "Deferred annuity", "No payments ever"],
    optionsEs: ["Una anualidad que comienza pagos dentro de un año de la compra", "Los pagos comienzan después de muchos años", "Anualidad diferida", "Sin pagos nunca"],
    correctAnswer: 0,
    explanationEn: "An immediate annuity begins making payments shortly after a lump-sum premium is paid.",
    explanationEs: "Una anualidad inmediata comienza a hacer pagos poco después de que se paga una prima de suma global."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is a deferred annuity?",
    questionTextEs: "¿Qué es una anualidad diferida?",
    optionsEn: ["An annuity where payments are delayed until a future date", "Immediate payments", "No accumulation period", "Term insurance"],
    optionsEs: ["Una anualidad donde los pagos se retrasan hasta una fecha futura", "Pagos inmediatos", "Sin período de acumulación", "Seguro a término"],
    correctAnswer: 0,
    explanationEn: "A deferred annuity delays income payments to a future date while funds accumulate tax-deferred.",
    explanationEs: "Una anualidad diferida retrasa los pagos de ingreso a una fecha futura mientras los fondos se acumulan con impuestos diferidos."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is a single premium annuity?",
    questionTextEs: "¿Qué es una anualidad de prima única?",
    optionsEn: ["An annuity funded with one lump-sum payment", "Monthly premiums", "Annual premiums", "No premium required"],
    optionsEs: ["Una anualidad financiada con un pago único de suma global", "Primas mensuales", "Primas anuales", "Sin prima requerida"],
    correctAnswer: 0,
    explanationEn: "A single premium annuity is purchased with one lump-sum payment.",
    explanationEs: "Una anualidad de prima única se compra con un pago único de suma global."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is a flexible premium annuity?",
    questionTextEs: "¿Qué es una anualidad de prima flexible?",
    optionsEn: ["An annuity that allows varying premium payments over time", "Fixed premium amounts", "Single premium only", "No premiums"],
    optionsEs: ["Una anualidad que permite pagos de prima variables con el tiempo", "Montos de prima fijos", "Solo prima única", "Sin primas"],
    correctAnswer: 0,
    explanationEn: "Flexible premium annuities allow the owner to make varying premium payments over time.",
    explanationEs: "Las anualidades de prima flexible permiten al propietario hacer pagos de prima variables con el tiempo."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the accumulation period of an annuity?",
    questionTextEs: "¿Qué es el período de acumulación de una anualidad?",
    optionsEn: ["The time during which premiums are paid and funds grow", "The payout period", "The surrender period", "The free-look period"],
    optionsEs: ["El tiempo durante el cual se pagan las primas y los fondos crecen", "El período de pago", "El período de rescate", "El período de revisión gratuita"],
    correctAnswer: 0,
    explanationEn: "The accumulation period is when premiums are paid and the annuity value grows tax-deferred.",
    explanationEs: "El período de acumulación es cuando se pagan las primas y el valor de la anualidad crece con impuestos diferidos."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the annuity period (annuitization)?",
    questionTextEs: "¿Qué es el período de anualidad (anualización)?",
    optionsEn: ["The payout phase when periodic payments are made to the annuitant", "The accumulation phase", "The surrender period", "The application period"],
    optionsEs: ["La fase de pago cuando se hacen pagos periódicos al beneficiario", "La fase de acumulación", "El período de rescate", "El período de solicitud"],
    correctAnswer: 0,
    explanationEn: "The annuity period is when the accumulated value is converted to periodic income payments.",
    explanationEs: "El período de anualidad es cuando el valor acumulado se convierte en pagos de ingreso periódicos."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is a life annuity?",
    questionTextEs: "¿Qué es una anualidad vitalicia?",
    optionsEn: ["An annuity that pays for the lifetime of the annuitant", "Fixed period payments", "Lump sum payment", "No guaranteed payments"],
    optionsEs: ["Una anualidad que paga por la vida del beneficiario", "Pagos de período fijo", "Pago de suma global", "Sin pagos garantizados"],
    correctAnswer: 0,
    explanationEn: "A life annuity provides payments for as long as the annuitant lives.",
    explanationEs: "Una anualidad vitalicia proporciona pagos mientras el beneficiario viva."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is a joint and survivor annuity?",
    questionTextEs: "¿Qué es una anualidad conjunta y de sobreviviente?",
    optionsEn: ["An annuity that pays income for the lives of two people", "Single life only", "Fixed period only", "Lump sum only"],
    optionsEs: ["Una anualidad que paga ingreso por las vidas de dos personas", "Solo vida única", "Solo período fijo", "Solo suma global"],
    correctAnswer: 0,
    explanationEn: "Joint and survivor annuity provides payments during both annuitants' lives, continuing after the first death.",
    explanationEs: "La anualidad conjunta y de sobreviviente proporciona pagos durante las vidas de ambos beneficiarios, continuando después de la primera muerte."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is an annuity period certain?",
    questionTextEs: "¿Qué es una anualidad de período cierto?",
    optionsEn: ["Guarantees payments for a minimum period even if the annuitant dies", "Payments only while living", "No guaranteed payments", "Single payment only"],
    optionsEs: ["Garantiza pagos por un período mínimo incluso si el beneficiario fallece", "Pagos solo mientras viva", "Sin pagos garantizados", "Solo pago único"],
    correctAnswer: 0,
    explanationEn: "Period certain guarantees a minimum number of payments; if the annuitant dies early, beneficiaries receive remaining payments.",
    explanationEs: "El período cierto garantiza un número mínimo de pagos; si el beneficiario muere temprano, los beneficiarios reciben los pagos restantes."
  },
  // Group Life Insurance (146-160)
  {
    category: "life_insurance",
    questionTextEn: "What is group life insurance?",
    questionTextEs: "¿Qué es el seguro de vida grupal?",
    optionsEn: ["Life insurance covering multiple people under one master policy", "Individual policies", "Health insurance", "Property insurance"],
    optionsEs: ["Seguro de vida que cubre múltiples personas bajo una póliza maestra", "Pólizas individuales", "Seguro de salud", "Seguro de propiedad"],
    correctAnswer: 0,
    explanationEn: "Group life insurance provides coverage to a group of people, typically employees, under a single master policy.",
    explanationEs: "El seguro de vida grupal proporciona cobertura a un grupo de personas, típicamente empleados, bajo una única póliza maestra."
  },
  {
    category: "life_insurance",
    questionTextEn: "Who owns a group life insurance policy?",
    questionTextEs: "¿Quién es dueño de una póliza de seguro de vida grupal?",
    optionsEn: ["The employer or group sponsor", "Each employee", "The insurance company", "The government"],
    optionsEs: ["El empleador o patrocinador del grupo", "Cada empleado", "La compañía de seguros", "El gobierno"],
    correctAnswer: 0,
    explanationEn: "The employer or sponsoring organization owns the master policy and provides certificates to employees.",
    explanationEs: "El empleador u organización patrocinadora es dueño de la póliza maestra y proporciona certificados a los empleados."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is a certificate of insurance in group life?",
    questionTextEs: "¿Qué es un certificado de seguro en vida grupal?",
    optionsEn: ["A document given to each group member summarizing their coverage", "The master policy", "The application", "A claim form"],
    optionsEs: ["Un documento dado a cada miembro del grupo resumiendo su cobertura", "La póliza maestra", "La solicitud", "Un formulario de reclamo"],
    correctAnswer: 0,
    explanationEn: "A certificate of insurance is given to each covered employee describing their coverage under the group policy.",
    explanationEs: "Un certificado de seguro se da a cada empleado cubierto describiendo su cobertura bajo la póliza grupal."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the conversion privilege in group life insurance?",
    questionTextEs: "¿Qué es el privilegio de conversión en el seguro de vida grupal?",
    optionsEn: ["The right to convert group coverage to an individual policy without proof of insurability", "Increasing group coverage", "Changing beneficiaries", "Canceling coverage"],
    optionsEs: ["El derecho de convertir cobertura grupal a una póliza individual sin prueba de asegurabilidad", "Aumentar cobertura grupal", "Cambiar beneficiarios", "Cancelar cobertura"],
    correctAnswer: 0,
    explanationEn: "Conversion privilege allows employees leaving a group to obtain individual coverage without medical underwriting.",
    explanationEs: "El privilegio de conversión permite a los empleados que dejan un grupo obtener cobertura individual sin suscripción médica."
  },
  // Tax Considerations (161-175)
  {
    category: "life_insurance",
    questionTextEn: "Are life insurance death benefits generally taxable as income?",
    questionTextEs: "¿Son los beneficios por muerte del seguro de vida generalmente gravables como ingresos?",
    optionsEn: ["No, death benefits are generally received income tax-free", "Yes, fully taxable", "Partially taxable", "Taxed as capital gains"],
    optionsEs: ["No, los beneficios por muerte generalmente se reciben libres de impuestos sobre la renta", "Sí, totalmente gravables", "Parcialmente gravables", "Gravados como ganancias de capital"],
    correctAnswer: 0,
    explanationEn: "Life insurance death benefits are generally received by beneficiaries free of federal income tax.",
    explanationEs: "Los beneficios por muerte del seguro de vida generalmente son recibidos por los beneficiarios libres de impuestos federales sobre la renta."
  },
  {
    category: "life_insurance",
    questionTextEn: "Is cash value growth in a life insurance policy taxable?",
    questionTextEs: "¿Es gravable el crecimiento del valor en efectivo en una póliza de seguro de vida?",
    optionsEn: ["No, cash value grows tax-deferred", "Yes, taxed annually", "Taxed monthly", "Taxed at withdrawal only"],
    optionsEs: ["No, el valor en efectivo crece con impuestos diferidos", "Sí, gravado anualmente", "Gravado mensualmente", "Gravado solo al retiro"],
    correctAnswer: 0,
    explanationEn: "Cash value in a life insurance policy grows on a tax-deferred basis until withdrawn.",
    explanationEs: "El valor en efectivo en una póliza de seguro de vida crece con impuestos diferidos hasta que se retira."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the tax treatment of policy loans?",
    questionTextEs: "¿Cuál es el tratamiento fiscal de los préstamos de póliza?",
    optionsEn: ["Policy loans are not taxable if the policy remains in force", "Fully taxable", "Partially taxable", "Subject to capital gains tax"],
    optionsEs: ["Los préstamos de póliza no son gravables si la póliza permanece en vigor", "Totalmente gravables", "Parcialmente gravables", "Sujetos a impuesto de ganancias de capital"],
    correctAnswer: 0,
    explanationEn: "Policy loans are not considered taxable income as long as the policy remains in force.",
    explanationEs: "Los préstamos de póliza no se consideran ingreso gravable mientras la póliza permanezca en vigor."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is a Modified Endowment Contract (MEC)?",
    questionTextEs: "¿Qué es un Contrato de Dotación Modificado (MEC)?",
    optionsEn: ["A life insurance policy that fails the 7-pay test and has less favorable tax treatment", "A standard policy", "A health policy", "A term policy"],
    optionsEs: ["Una póliza de seguro de vida que no pasa la prueba de 7 pagos y tiene tratamiento fiscal menos favorable", "Una póliza estándar", "Una póliza de salud", "Una póliza a término"],
    correctAnswer: 0,
    explanationEn: "A MEC is a policy funded too quickly that loses some tax advantages; withdrawals may be taxable and penalized.",
    explanationEs: "Un MEC es una póliza financiada demasiado rápido que pierde algunas ventajas fiscales; los retiros pueden ser gravables y penalizados."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the 7-pay test?",
    questionTextEs: "¿Qué es la prueba de 7 pagos?",
    optionsEn: ["A test to determine if a policy is a MEC based on premium limits over 7 years", "A health test", "An income test", "A mortality test"],
    optionsEs: ["Una prueba para determinar si una póliza es un MEC basada en límites de prima durante 7 años", "Una prueba de salud", "Una prueba de ingresos", "Una prueba de mortalidad"],
    correctAnswer: 0,
    explanationEn: "The 7-pay test determines if premiums paid exceed what would fund the policy in 7 level payments.",
    explanationEs: "La prueba de 7 pagos determina si las primas pagadas exceden lo que financiaría la póliza en 7 pagos nivelados."
  },
  // Business Uses of Life Insurance (176-183)
  {
    category: "life_insurance",
    questionTextEn: "What is key person life insurance?",
    questionTextEs: "¿Qué es el seguro de vida de persona clave?",
    optionsEn: ["Insurance on a key employee to protect the business from financial loss upon their death", "Personal insurance", "Health insurance", "Property insurance"],
    optionsEs: ["Seguro sobre un empleado clave para proteger al negocio de pérdida financiera al fallecer", "Seguro personal", "Seguro de salud", "Seguro de propiedad"],
    correctAnswer: 0,
    explanationEn: "Key person insurance protects a business from financial loss if a key employee dies.",
    explanationEs: "El seguro de persona clave protege a un negocio de pérdida financiera si un empleado clave fallece."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is a buy-sell agreement funded with life insurance?",
    questionTextEs: "¿Qué es un acuerdo de compra-venta financiado con seguro de vida?",
    optionsEn: ["An agreement to transfer business ownership upon an owner's death, funded by life insurance", "A sales contract", "A property deed", "A loan agreement"],
    optionsEs: ["Un acuerdo para transferir la propiedad del negocio al fallecer un propietario, financiado por seguro de vida", "Un contrato de ventas", "Una escritura de propiedad", "Un acuerdo de préstamo"],
    correctAnswer: 0,
    explanationEn: "Buy-sell agreements use life insurance to fund the purchase of a deceased owner's business interest.",
    explanationEs: "Los acuerdos de compra-venta usan seguro de vida para financiar la compra del interés comercial de un propietario fallecido."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is a cross-purchase buy-sell agreement?",
    questionTextEs: "¿Qué es un acuerdo de compra cruzada de compra-venta?",
    optionsEn: ["Each owner buys insurance on the other owners to fund the purchase of their interest", "The business buys insurance", "No insurance involved", "Bank financing only"],
    optionsEs: ["Cada propietario compra seguro sobre los otros propietarios para financiar la compra de su interés", "El negocio compra seguro", "Sin seguro involucrado", "Solo financiamiento bancario"],
    correctAnswer: 0,
    explanationEn: "In cross-purchase agreements, business owners insure each other and use proceeds to buy a deceased owner's share.",
    explanationEs: "En acuerdos de compra cruzada, los propietarios del negocio aseguran a cada uno y usan los beneficios para comprar la parte de un propietario fallecido."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is an entity (stock redemption) buy-sell agreement?",
    questionTextEs: "¿Qué es un acuerdo de compra-venta de entidad (redención de acciones)?",
    optionsEn: ["The business itself owns policies on the owners and buys back shares upon death", "Owners insure each other", "No insurance used", "Bank purchases shares"],
    optionsEs: ["El negocio mismo posee pólizas sobre los propietarios y recompra acciones al fallecer", "Los propietarios aseguran a cada uno", "Sin seguro usado", "El banco compra acciones"],
    correctAnswer: 0,
    explanationEn: "In entity agreements, the business owns policies on each owner and uses proceeds to redeem a deceased owner's shares.",
    explanationEs: "En acuerdos de entidad, el negocio posee pólizas sobre cada propietario y usa los beneficios para redimir las acciones de un propietario fallecido."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is split-dollar life insurance?",
    questionTextEs: "¿Qué es el seguro de vida de dólar dividido?",
    optionsEn: ["An arrangement where employer and employee share premium costs and death benefits", "Standard group insurance", "Individual insurance only", "Health insurance"],
    optionsEs: ["Un arreglo donde el empleador y el empleado comparten costos de prima y beneficios por muerte", "Seguro grupal estándar", "Solo seguro individual", "Seguro de salud"],
    correctAnswer: 0,
    explanationEn: "Split-dollar involves sharing premium costs and benefits between an employer and employee.",
    explanationEs: "El dólar dividido involucra compartir costos de prima y beneficios entre un empleador y un empleado."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is corporate-owned life insurance (COLI)?",
    questionTextEs: "¿Qué es el seguro de vida propiedad de la corporación (COLI)?",
    optionsEn: ["Life insurance purchased and owned by a corporation on employees", "Personal insurance", "Health insurance", "Auto insurance"],
    optionsEs: ["Seguro de vida comprado y poseído por una corporación sobre empleados", "Seguro personal", "Seguro de salud", "Seguro de auto"],
    correctAnswer: 0,
    explanationEn: "COLI is life insurance owned by a corporation, often used for executive benefits or funding business obligations.",
    explanationEs: "COLI es seguro de vida poseído por una corporación, a menudo usado para beneficios ejecutivos o financiar obligaciones comerciales."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is a viatical settlement?",
    questionTextEs: "¿Qué es un acuerdo viático?",
    optionsEn: ["Selling a life insurance policy for a lump sum to a third party, typically by someone terminally ill", "A premium payment", "A policy loan", "A claim payment"],
    optionsEs: ["Vender una póliza de seguro de vida por una suma global a un tercero, típicamente por alguien terminalmente enfermo", "Un pago de prima", "Un préstamo de póliza", "Un pago de reclamo"],
    correctAnswer: 0,
    explanationEn: "A viatical settlement allows a terminally ill person to sell their life insurance policy for immediate cash.",
    explanationEs: "Un acuerdo viático permite a una persona terminalmente enferma vender su póliza de seguro de vida por efectivo inmediato."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is a life settlement?",
    questionTextEs: "¿Qué es un acuerdo de vida?",
    optionsEn: ["Selling a life insurance policy to a third party, typically by seniors who no longer need coverage", "A viatical settlement for terminally ill", "A policy loan", "A claim"],
    optionsEs: ["Vender una póliza de seguro de vida a un tercero, típicamente por personas mayores que ya no necesitan cobertura", "Un acuerdo viático para terminalmente enfermos", "Un préstamo de póliza", "Un reclamo"],
    correctAnswer: 0,
    explanationEn: "A life settlement is similar to viatical but for seniors who simply no longer need or want their life insurance.",
    explanationEs: "Un acuerdo de vida es similar al viático pero para personas mayores que simplemente ya no necesitan o quieren su seguro de vida."
  }
];

async function seedLifeInsuranceQuestions() {
  console.log("Seeding Life Insurance questions...");
  
  try {
    for (const question of lifeInsuranceQuestions) {
      await db.insert(questions).values(question);
    }
    console.log(`Successfully added ${lifeInsuranceQuestions.length} Life Insurance questions`);
  } catch (error) {
    console.error("Error seeding Life Insurance questions:", error);
    throw error;
  }
}

seedLifeInsuranceQuestions()
  .then(() => {
    console.log("Life Insurance seeding complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  });
