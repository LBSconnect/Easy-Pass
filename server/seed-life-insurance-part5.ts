import { db } from "./db";
import { questions } from "@shared/schema";

const lifeInsuranceQuestions = [
  {
    category: "life_insurance",
    questionTextEn: "Under Texas law, what is the maximum period for a life insurance policy's suicide exclusion clause?",
    questionTextEs: "Según la ley de Texas, ¿cuál es el período máximo para la cláusula de exclusión por suicidio de una póliza de seguro de vida?",
    optionsEn: ["1 year", "2 years", "3 years", "5 years"],
    optionsEs: ["1 año", "2 años", "3 años", "5 años"],
    correctAnswer: 1,
    explanationEn: "Texas Insurance Code limits the suicide exclusion period to a maximum of 2 years from the policy issue date.",
    explanationEs: "El Código de Seguros de Texas limita el período de exclusión por suicidio a un máximo de 2 años desde la fecha de emisión de la póliza."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the purpose of a life insurance policy illustration in Texas?",
    questionTextEs: "¿Cuál es el propósito de una ilustración de póliza de seguro de vida en Texas?",
    optionsEn: ["To guarantee future returns", "To show how the policy may perform under different scenarios", "To replace the policy contract", "To waive disclosure requirements"],
    optionsEs: ["Garantizar rendimientos futuros", "Mostrar cómo puede funcionar la póliza bajo diferentes escenarios", "Reemplazar el contrato de la póliza", "Renunciar a los requisitos de divulgación"],
    correctAnswer: 1,
    explanationEn: "Policy illustrations show hypothetical scenarios of how a policy may perform but are not guarantees of future performance.",
    explanationEs: "Las ilustraciones de pólizas muestran escenarios hipotéticos de cómo puede funcionar una póliza pero no son garantías de rendimiento futuro."
  },
  {
    category: "life_insurance",
    questionTextEn: "In Texas, what is a viatical settlement?",
    questionTextEs: "En Texas, ¿qué es un acuerdo viático?",
    optionsEn: ["A loan against the policy", "Sale of a life insurance policy by a terminally ill person", "A type of annuity", "A dividend option"],
    optionsEs: ["Un préstamo contra la póliza", "Venta de una póliza de seguro de vida por una persona con enfermedad terminal", "Un tipo de anualidad", "Una opción de dividendos"],
    correctAnswer: 1,
    explanationEn: "A viatical settlement is the sale of a life insurance policy by a terminally ill insured to a third party for less than the death benefit.",
    explanationEs: "Un acuerdo viático es la venta de una póliza de seguro de vida por un asegurado con enfermedad terminal a un tercero por menos del beneficio por muerte."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the purpose of the Medical Information Bureau (MIB) in life insurance underwriting?",
    questionTextEs: "¿Cuál es el propósito de la Oficina de Información Médica (MIB) en la suscripción de seguros de vida?",
    optionsEn: ["To provide medical treatment", "To share medical underwriting information between insurers", "To set premium rates", "To issue policies"],
    optionsEs: ["Proporcionar tratamiento médico", "Compartir información de suscripción médica entre aseguradoras", "Establecer tasas de primas", "Emitir pólizas"],
    correctAnswer: 1,
    explanationEn: "The MIB is a database that allows insurance companies to share medical underwriting information to prevent fraud and assess risk.",
    explanationEs: "El MIB es una base de datos que permite a las compañías de seguros compartir información de suscripción médica para prevenir fraudes y evaluar riesgos."
  },
  {
    category: "life_insurance",
    questionTextEn: "Under Texas law, what happens to a life insurance policy if the insured dies during the grace period?",
    questionTextEs: "Según la ley de Texas, ¿qué sucede con una póliza de seguro de vida si el asegurado muere durante el período de gracia?",
    optionsEn: ["The policy is void", "The claim is denied", "The death benefit is paid minus the unpaid premium", "The beneficiary must pay all back premiums"],
    optionsEs: ["La póliza es nula", "El reclamo es denegado", "El beneficio por muerte se paga menos la prima no pagada", "El beneficiario debe pagar todas las primas atrasadas"],
    correctAnswer: 2,
    explanationEn: "If the insured dies during the grace period, the death benefit is paid but the unpaid premium is deducted from the benefit amount.",
    explanationEs: "Si el asegurado muere durante el período de gracia, el beneficio por muerte se paga pero la prima no pagada se deduce del monto del beneficio."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is a Modified Endowment Contract (MEC) in life insurance?",
    questionTextEs: "¿Qué es un Contrato de Dotación Modificado (MEC) en seguros de vida?",
    optionsEn: ["A policy with reduced benefits", "A policy that fails the 7-pay test and has different tax treatment", "A term life policy", "A policy without cash value"],
    optionsEs: ["Una póliza con beneficios reducidos", "Una póliza que no pasa la prueba de 7 pagos y tiene un tratamiento fiscal diferente", "Una póliza de vida a término", "Una póliza sin valor en efectivo"],
    correctAnswer: 1,
    explanationEn: "A MEC is a life insurance policy that is funded too quickly (fails the 7-pay test) and receives less favorable tax treatment on distributions.",
    explanationEs: "Un MEC es una póliza de seguro de vida que se financia demasiado rápido (no pasa la prueba de 7 pagos) y recibe un tratamiento fiscal menos favorable en las distribuciones."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the purpose of the life insurance policy's entire contract provision?",
    questionTextEs: "¿Cuál es el propósito de la disposición del contrato completo de la póliza de seguro de vida?",
    optionsEn: ["To allow changes at any time", "To ensure all terms are in the policy and application", "To reduce premiums", "To eliminate the beneficiary"],
    optionsEs: ["Permitir cambios en cualquier momento", "Asegurar que todos los términos estén en la póliza y la solicitud", "Reducir las primas", "Eliminar al beneficiario"],
    correctAnswer: 1,
    explanationEn: "The entire contract provision ensures that the policy and attached application constitute the complete agreement between the insurer and policyholder.",
    explanationEs: "La disposición del contrato completo asegura que la póliza y la solicitud adjunta constituyan el acuerdo completo entre el asegurador y el titular de la póliza."
  },
  {
    category: "life_insurance",
    questionTextEn: "In Texas, what is the minimum age requirement to obtain a life insurance agent license?",
    questionTextEs: "En Texas, ¿cuál es el requisito de edad mínima para obtener una licencia de agente de seguros de vida?",
    optionsEn: ["16 years", "18 years", "21 years", "25 years"],
    optionsEs: ["16 años", "18 años", "21 años", "25 años"],
    correctAnswer: 1,
    explanationEn: "Texas requires life insurance agent license applicants to be at least 18 years of age.",
    explanationEs: "Texas requiere que los solicitantes de licencia de agente de seguros de vida tengan al menos 18 años de edad."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the purpose of an accelerated death benefit rider?",
    questionTextEs: "¿Cuál es el propósito de un anexo de beneficio por muerte acelerada?",
    optionsEn: ["To increase the death benefit", "To allow early access to death benefit for terminally ill insureds", "To reduce premiums", "To add additional insureds"],
    optionsEs: ["Aumentar el beneficio por muerte", "Permitir acceso anticipado al beneficio por muerte para asegurados con enfermedad terminal", "Reducir las primas", "Agregar asegurados adicionales"],
    correctAnswer: 1,
    explanationEn: "An accelerated death benefit rider allows terminally ill policyholders to receive a portion of the death benefit while still living.",
    explanationEs: "Un anexo de beneficio por muerte acelerada permite a los titulares de pólizas con enfermedades terminales recibir una porción del beneficio por muerte mientras aún viven."
  },
  {
    category: "life_insurance",
    questionTextEn: "What type of life insurance provides coverage for a specific period and has no cash value?",
    questionTextEs: "¿Qué tipo de seguro de vida proporciona cobertura por un período específico y no tiene valor en efectivo?",
    optionsEn: ["Whole life", "Universal life", "Term life", "Variable life"],
    optionsEs: ["Vida entera", "Vida universal", "Vida a término", "Vida variable"],
    correctAnswer: 2,
    explanationEn: "Term life insurance provides coverage for a specific period (term) and does not accumulate cash value.",
    explanationEs: "El seguro de vida a término proporciona cobertura por un período específico (término) y no acumula valor en efectivo."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the purpose of the life insurance policy's reinstatement provision?",
    questionTextEs: "¿Cuál es el propósito de la disposición de reinstalación de la póliza de seguro de vida?",
    optionsEn: ["To cancel the policy", "To allow revival of a lapsed policy under certain conditions", "To change beneficiaries", "To reduce the face amount"],
    optionsEs: ["Cancelar la póliza", "Permitir la reactivación de una póliza vencida bajo ciertas condiciones", "Cambiar beneficiarios", "Reducir el monto nominal"],
    correctAnswer: 1,
    explanationEn: "The reinstatement provision allows a policyholder to revive a lapsed policy within a certain timeframe by paying back premiums and providing evidence of insurability.",
    explanationEs: "La disposición de reinstalación permite a un titular de póliza reactivar una póliza vencida dentro de un cierto período de tiempo pagando las primas atrasadas y proporcionando evidencia de asegurabilidad."
  },
  {
    category: "life_insurance",
    questionTextEn: "Under Texas law, how long does a life insurance company have to pay a death claim after receiving proof of loss?",
    questionTextEs: "Según la ley de Texas, ¿cuánto tiempo tiene una compañía de seguros de vida para pagar un reclamo por muerte después de recibir la prueba de pérdida?",
    optionsEn: ["15 days", "30 days", "60 days", "90 days"],
    optionsEs: ["15 días", "30 días", "60 días", "90 días"],
    correctAnswer: 2,
    explanationEn: "Texas law requires life insurance companies to pay death claims within 60 days after receiving satisfactory proof of loss.",
    explanationEs: "La ley de Texas requiere que las compañías de seguros de vida paguen los reclamos por muerte dentro de los 60 días posteriores a recibir la prueba de pérdida satisfactoria."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the purpose of the payor benefit rider in life insurance?",
    questionTextEs: "¿Cuál es el propósito del anexo de beneficio del pagador en el seguro de vida?",
    optionsEn: ["To pay additional death benefits", "To waive premiums if the premium payer dies or becomes disabled", "To add additional insureds", "To increase cash value"],
    optionsEs: ["Pagar beneficios adicionales por muerte", "Eximir las primas si el pagador de la prima muere o queda discapacitado", "Agregar asegurados adicionales", "Aumentar el valor en efectivo"],
    correctAnswer: 1,
    explanationEn: "The payor benefit rider waives future premiums on a juvenile policy if the premium payer (usually a parent) dies or becomes disabled.",
    explanationEs: "El anexo de beneficio del pagador exime las primas futuras de una póliza juvenil si el pagador de la prima (generalmente un padre) muere o queda discapacitado."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is a key person life insurance policy?",
    questionTextEs: "¿Qué es una póliza de seguro de vida de persona clave?",
    optionsEn: ["Insurance on all employees", "Insurance on a valuable employee or owner to protect the business", "Personal life insurance", "Group life insurance"],
    optionsEs: ["Seguro para todos los empleados", "Seguro sobre un empleado valioso o propietario para proteger el negocio", "Seguro de vida personal", "Seguro de vida grupal"],
    correctAnswer: 1,
    explanationEn: "Key person life insurance protects a business from financial loss if a key employee or owner dies, with the business as beneficiary.",
    explanationEs: "El seguro de vida de persona clave protege a un negocio de pérdidas financieras si un empleado clave o propietario muere, con el negocio como beneficiario."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the difference between a revocable and irrevocable beneficiary?",
    questionTextEs: "¿Cuál es la diferencia entre un beneficiario revocable e irrevocable?",
    optionsEn: ["No difference", "Revocable can be changed; irrevocable cannot be changed without consent", "Irrevocable receives more money", "Revocable must be a family member"],
    optionsEs: ["Sin diferencia", "El revocable se puede cambiar; el irrevocable no se puede cambiar sin consentimiento", "El irrevocable recibe más dinero", "El revocable debe ser un familiar"],
    correctAnswer: 1,
    explanationEn: "A revocable beneficiary can be changed by the policyholder at any time, while an irrevocable beneficiary cannot be changed without that beneficiary's consent.",
    explanationEs: "Un beneficiario revocable puede ser cambiado por el titular de la póliza en cualquier momento, mientras que un beneficiario irrevocable no puede ser cambiado sin el consentimiento de ese beneficiario."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the purpose of the life insurance policy's incontestability clause?",
    questionTextEs: "¿Cuál es el propósito de la cláusula de incontestabilidad de la póliza de seguro de vida?",
    optionsEn: ["To allow the insurer to contest claims indefinitely", "To limit the time the insurer can contest a policy based on misrepresentation", "To increase premiums", "To change the death benefit"],
    optionsEs: ["Permitir que el asegurador impugne reclamos indefinidamente", "Limitar el tiempo que el asegurador puede impugnar una póliza basándose en tergiversación", "Aumentar las primas", "Cambiar el beneficio por muerte"],
    correctAnswer: 1,
    explanationEn: "The incontestability clause limits the insurer's right to void a policy based on misrepresentation to a specific period, typically 2 years.",
    explanationEs: "La cláusula de incontestabilidad limita el derecho del asegurador de anular una póliza basándose en tergiversación a un período específico, típicamente 2 años."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is an annuity's accumulation period?",
    questionTextEs: "¿Qué es el período de acumulación de una anualidad?",
    optionsEn: ["When payments are received", "The time during which premiums are paid and funds grow", "After the annuitant dies", "The grace period"],
    optionsEs: ["Cuando se reciben los pagos", "El tiempo durante el cual se pagan las primas y los fondos crecen", "Después de que el rentista muere", "El período de gracia"],
    correctAnswer: 1,
    explanationEn: "The accumulation period is the phase during which premiums are paid into the annuity and the funds grow tax-deferred.",
    explanationEs: "El período de acumulación es la fase durante la cual se pagan las primas en la anualidad y los fondos crecen con impuestos diferidos."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the purpose of a life settlement?",
    questionTextEs: "¿Cuál es el propósito de un acuerdo de vida?",
    optionsEn: ["To cancel a policy", "To sell a life insurance policy for more than its cash value but less than the death benefit", "To change beneficiaries", "To reduce coverage"],
    optionsEs: ["Cancelar una póliza", "Vender una póliza de seguro de vida por más de su valor en efectivo pero menos del beneficio por muerte", "Cambiar beneficiarios", "Reducir la cobertura"],
    correctAnswer: 1,
    explanationEn: "A life settlement is the sale of an existing life insurance policy to a third party for more than the cash surrender value but less than the face amount.",
    explanationEs: "Un acuerdo de vida es la venta de una póliza de seguro de vida existente a un tercero por más del valor de rescate en efectivo pero menos del monto nominal."
  },
  {
    category: "life_insurance",
    questionTextEn: "In Texas, what is required before an agent can sell variable life insurance?",
    questionTextEs: "En Texas, ¿qué se requiere antes de que un agente pueda vender seguro de vida variable?",
    optionsEn: ["Only a life insurance license", "A life insurance license and securities registration", "No special requirements", "Only securities registration"],
    optionsEs: ["Solo una licencia de seguro de vida", "Una licencia de seguro de vida y registro de valores", "Sin requisitos especiales", "Solo registro de valores"],
    correctAnswer: 1,
    explanationEn: "To sell variable life insurance in Texas, an agent must hold both a life insurance license and be registered with FINRA to sell securities.",
    explanationEs: "Para vender seguros de vida variable en Texas, un agente debe tener tanto una licencia de seguro de vida como estar registrado con FINRA para vender valores."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is a guaranteed insurability rider?",
    questionTextEs: "¿Qué es un anexo de asegurabilidad garantizada?",
    optionsEn: ["A rider that reduces premiums", "A rider allowing purchase of additional coverage without evidence of insurability", "A rider that pays dividends", "A rider for accidental death"],
    optionsEs: ["Un anexo que reduce las primas", "Un anexo que permite la compra de cobertura adicional sin evidencia de asegurabilidad", "Un anexo que paga dividendos", "Un anexo para muerte accidental"],
    correctAnswer: 1,
    explanationEn: "A guaranteed insurability rider allows the policyholder to purchase additional coverage at specified dates without proving insurability.",
    explanationEs: "Un anexo de asegurabilidad garantizada permite al titular de la póliza comprar cobertura adicional en fechas específicas sin probar asegurabilidad."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the cost basis in a life insurance policy?",
    questionTextEs: "¿Cuál es la base de costo en una póliza de seguro de vida?",
    optionsEn: ["The death benefit amount", "The total premiums paid into the policy", "The cash value", "The face amount"],
    optionsEs: ["El monto del beneficio por muerte", "El total de primas pagadas en la póliza", "El valor en efectivo", "El monto nominal"],
    correctAnswer: 1,
    explanationEn: "The cost basis is the total amount of premiums paid into a life insurance policy, used to determine taxable gains on surrenders or withdrawals.",
    explanationEs: "La base de costo es el monto total de primas pagadas en una póliza de seguro de vida, utilizado para determinar las ganancias imponibles en rescates o retiros."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the purpose of the automatic premium loan provision?",
    questionTextEs: "¿Cuál es el propósito de la disposición de préstamo automático de prima?",
    optionsEn: ["To cancel the policy", "To prevent lapse by using cash value to pay overdue premiums", "To increase the death benefit", "To pay dividends"],
    optionsEs: ["Cancelar la póliza", "Prevenir el vencimiento usando el valor en efectivo para pagar primas vencidas", "Aumentar el beneficio por muerte", "Pagar dividendos"],
    correctAnswer: 1,
    explanationEn: "The automatic premium loan provision prevents policy lapse by automatically using the cash value to pay any unpaid premiums.",
    explanationEs: "La disposición de préstamo automático de prima previene el vencimiento de la póliza utilizando automáticamente el valor en efectivo para pagar cualquier prima no pagada."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the taxation treatment of life insurance death benefits paid to a beneficiary?",
    questionTextEs: "¿Cuál es el tratamiento fiscal de los beneficios por muerte del seguro de vida pagados a un beneficiario?",
    optionsEn: ["Fully taxable as ordinary income", "Generally received income tax-free", "Taxed at capital gains rates", "Subject to 50% tax"],
    optionsEs: ["Totalmente imponible como ingreso ordinario", "Generalmente recibido libre de impuestos sobre la renta", "Gravado a tasas de ganancias de capital", "Sujeto a impuesto del 50%"],
    correctAnswer: 1,
    explanationEn: "Life insurance death benefits are generally received income tax-free by beneficiaries under federal tax law.",
    explanationEs: "Los beneficios por muerte del seguro de vida generalmente se reciben libres de impuestos sobre la renta por los beneficiarios según la ley fiscal federal."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is a fixed annuity?",
    questionTextEs: "¿Qué es una anualidad fija?",
    optionsEn: ["An annuity with variable payments", "An annuity that guarantees a minimum interest rate and fixed payments", "An annuity tied to the stock market", "An annuity with no guarantees"],
    optionsEs: ["Una anualidad con pagos variables", "Una anualidad que garantiza una tasa de interés mínima y pagos fijos", "Una anualidad vinculada al mercado de valores", "Una anualidad sin garantías"],
    correctAnswer: 1,
    explanationEn: "A fixed annuity provides a guaranteed minimum interest rate during accumulation and fixed payments during the payout phase.",
    explanationEs: "Una anualidad fija proporciona una tasa de interés mínima garantizada durante la acumulación y pagos fijos durante la fase de pago."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is a joint life insurance policy?",
    questionTextEs: "¿Qué es una póliza de seguro de vida conjunta?",
    optionsEn: ["A policy on one person", "A policy that covers two or more people under one contract", "A term policy only", "A group policy"],
    optionsEs: ["Una póliza sobre una persona", "Una póliza que cubre a dos o más personas bajo un contrato", "Solo una póliza a término", "Una póliza grupal"],
    correctAnswer: 1,
    explanationEn: "A joint life insurance policy covers two or more people under a single policy and may pay upon the first or second death.",
    explanationEs: "Una póliza de seguro de vida conjunta cubre a dos o más personas bajo una sola póliza y puede pagar al primer o segundo fallecimiento."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the purpose of a spendthrift clause in a life insurance policy?",
    questionTextEs: "¿Cuál es el propósito de una cláusula de derrochador en una póliza de seguro de vida?",
    optionsEn: ["To increase premiums", "To protect policy proceeds from the beneficiary's creditors", "To reduce the death benefit", "To change the beneficiary"],
    optionsEs: ["Aumentar las primas", "Proteger los beneficios de la póliza de los acreedores del beneficiario", "Reducir el beneficio por muerte", "Cambiar al beneficiario"],
    correctAnswer: 1,
    explanationEn: "A spendthrift clause protects policy proceeds from being claimed by the beneficiary's creditors before the proceeds are paid.",
    explanationEs: "Una cláusula de derrochador protege los beneficios de la póliza de ser reclamados por los acreedores del beneficiario antes de que se paguen los beneficios."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the difference between current assumption whole life and traditional whole life?",
    questionTextEs: "¿Cuál es la diferencia entre vida entera de suposición actual y vida entera tradicional?",
    optionsEn: ["No difference", "Current assumption has non-guaranteed elements that can change", "Traditional has variable investments", "Current assumption has no cash value"],
    optionsEs: ["Sin diferencia", "La suposición actual tiene elementos no garantizados que pueden cambiar", "La tradicional tiene inversiones variables", "La suposición actual no tiene valor en efectivo"],
    correctAnswer: 1,
    explanationEn: "Current assumption whole life has non-guaranteed elements like interest rates and mortality charges that can be adjusted by the insurer.",
    explanationEs: "La vida entera de suposición actual tiene elementos no garantizados como tasas de interés y cargos de mortalidad que pueden ser ajustados por el asegurador."
  },
  {
    category: "life_insurance",
    questionTextEn: "In Texas, what is the standard free look period for life insurance policies?",
    questionTextEs: "En Texas, ¿cuál es el período estándar de revisión gratuita para pólizas de seguro de vida?",
    optionsEn: ["5 days", "10 days", "20 days", "30 days"],
    optionsEs: ["5 días", "10 días", "20 días", "30 días"],
    correctAnswer: 2,
    explanationEn: "Texas provides a 20-day free look period for life insurance policies, allowing the policyholder to return the policy for a full refund.",
    explanationEs: "Texas proporciona un período de revisión gratuita de 20 días para pólizas de seguro de vida, permitiendo al titular de la póliza devolver la póliza para un reembolso completo."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is an equity-indexed annuity?",
    questionTextEs: "¿Qué es una anualidad indexada a la renta variable?",
    optionsEn: ["A fixed annuity with no market participation", "An annuity with returns linked to a market index with downside protection", "A variable annuity", "A term annuity"],
    optionsEs: ["Una anualidad fija sin participación en el mercado", "Una anualidad con rendimientos vinculados a un índice de mercado con protección contra pérdidas", "Una anualidad variable", "Una anualidad a término"],
    correctAnswer: 1,
    explanationEn: "An equity-indexed annuity provides returns based on a market index while protecting against market losses with a minimum guaranteed rate.",
    explanationEs: "Una anualidad indexada a la renta variable proporciona rendimientos basados en un índice de mercado mientras protege contra pérdidas del mercado con una tasa mínima garantizada."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the primary purpose of the life insurance needs analysis?",
    questionTextEs: "¿Cuál es el propósito principal del análisis de necesidades de seguro de vida?",
    optionsEn: ["To sell the largest policy possible", "To determine the appropriate amount of coverage based on the client's needs", "To compare insurance companies", "To reduce underwriting requirements"],
    optionsEs: ["Vender la póliza más grande posible", "Determinar la cantidad apropiada de cobertura basada en las necesidades del cliente", "Comparar compañías de seguros", "Reducir los requisitos de suscripción"],
    correctAnswer: 1,
    explanationEn: "A needs analysis helps determine the appropriate amount of life insurance coverage based on the client's financial situation, obligations, and goals.",
    explanationEs: "Un análisis de necesidades ayuda a determinar la cantidad apropiada de cobertura de seguro de vida basada en la situación financiera, obligaciones y metas del cliente."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the purpose of a conditional receipt in life insurance?",
    questionTextEs: "¿Cuál es el propósito de un recibo condicional en el seguro de vida?",
    optionsEn: ["To deny coverage", "To provide temporary coverage while the application is being processed", "To cancel the policy", "To increase premiums"],
    optionsEs: ["Denegar cobertura", "Proporcionar cobertura temporal mientras se procesa la solicitud", "Cancelar la póliza", "Aumentar las primas"],
    correctAnswer: 1,
    explanationEn: "A conditional receipt provides temporary coverage beginning from the date of application, subject to the applicant meeting insurability requirements.",
    explanationEs: "Un recibo condicional proporciona cobertura temporal comenzando desde la fecha de solicitud, sujeto a que el solicitante cumpla con los requisitos de asegurabilidad."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the purpose of the insurance company's annual statement?",
    questionTextEs: "¿Cuál es el propósito de la declaración anual de la compañía de seguros?",
    optionsEn: ["To advertise products", "To report the company's financial condition to regulators", "To pay dividends", "To issue new policies"],
    optionsEs: ["Publicitar productos", "Informar la condición financiera de la compañía a los reguladores", "Pagar dividendos", "Emitir nuevas pólizas"],
    correctAnswer: 1,
    explanationEn: "The annual statement reports the insurance company's financial condition to state regulators and is filed with the Texas Department of Insurance.",
    explanationEs: "La declaración anual informa la condición financiera de la compañía de seguros a los reguladores estatales y se presenta ante el Departamento de Seguros de Texas."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is a survivorship life insurance policy (second-to-die)?",
    questionTextEs: "¿Qué es una póliza de seguro de vida de sobrevivencia (segundo en morir)?",
    optionsEn: ["Pays when the first insured dies", "Pays when the last of two or more insureds dies", "Pays immediately upon purchase", "A term policy only"],
    optionsEs: ["Paga cuando muere el primer asegurado", "Paga cuando muere el último de dos o más asegurados", "Paga inmediatamente al comprar", "Solo una póliza a término"],
    correctAnswer: 1,
    explanationEn: "A survivorship policy covers two or more people and pays the death benefit only after the last surviving insured dies.",
    explanationEs: "Una póliza de sobrevivencia cubre a dos o más personas y paga el beneficio por muerte solo después de que muere el último asegurado sobreviviente."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the purpose of FINRA in relation to variable life insurance?",
    questionTextEs: "¿Cuál es el propósito de FINRA en relación con el seguro de vida variable?",
    optionsEn: ["To issue insurance licenses", "To regulate securities aspects of variable products", "To pay claims", "To set premium rates"],
    optionsEs: ["Emitir licencias de seguros", "Regular aspectos de valores de productos variables", "Pagar reclamos", "Establecer tasas de primas"],
    correctAnswer: 1,
    explanationEn: "FINRA regulates the securities aspects of variable life insurance, requiring agents to be registered and products to be prospectus-filed.",
    explanationEs: "FINRA regula los aspectos de valores del seguro de vida variable, requiriendo que los agentes estén registrados y que los productos tengan prospectos archivados."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the minimum grace period for life insurance premiums in Texas?",
    questionTextEs: "¿Cuál es el período de gracia mínimo para las primas de seguro de vida en Texas?",
    optionsEn: ["7 days", "15 days", "30 days", "60 days"],
    optionsEs: ["7 días", "15 días", "30 días", "60 días"],
    correctAnswer: 2,
    explanationEn: "Texas requires a minimum 30-day grace period for life insurance premium payments after the due date.",
    explanationEs: "Texas requiere un período de gracia mínimo de 30 días para los pagos de primas de seguro de vida después de la fecha de vencimiento."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the purpose of the life insurance policy's assignment provision?",
    questionTextEs: "¿Cuál es el propósito de la disposición de cesión de la póliza de seguro de vida?",
    optionsEn: ["To prevent policy transfer", "To allow the policyholder to transfer ownership rights to another party", "To cancel the policy", "To reduce premiums"],
    optionsEs: ["Prevenir la transferencia de la póliza", "Permitir que el titular de la póliza transfiera los derechos de propiedad a otra parte", "Cancelar la póliza", "Reducir las primas"],
    correctAnswer: 1,
    explanationEn: "The assignment provision allows the policyholder to transfer ownership or rights in the policy to another party, such as for collateral.",
    explanationEs: "La disposición de cesión permite al titular de la póliza transferir la propiedad o los derechos de la póliza a otra parte, como para garantía."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is the purpose of the Texas Guaranty Association for life insurance?",
    questionTextEs: "¿Cuál es el propósito de la Asociación de Garantía de Texas para el seguro de vida?",
    optionsEn: ["To sell insurance", "To protect policyholders if their insurer becomes insolvent", "To regulate insurance rates", "To issue licenses"],
    optionsEs: ["Vender seguros", "Proteger a los titulares de pólizas si su asegurador se vuelve insolvente", "Regular las tasas de seguros", "Emitir licencias"],
    correctAnswer: 1,
    explanationEn: "The Texas Life and Health Insurance Guaranty Association protects policyholders by providing coverage if their insurance company becomes insolvent.",
    explanationEs: "La Asociación de Garantía de Seguros de Vida y Salud de Texas protege a los titulares de pólizas proporcionando cobertura si su compañía de seguros se vuelve insolvente."
  },
  {
    category: "life_insurance",
    questionTextEn: "What is a deferred annuity?",
    questionTextEs: "¿Qué es una anualidad diferida?",
    optionsEn: ["An annuity that pays immediately", "An annuity where payouts begin at a future date", "A term annuity", "An annuity with no cash value"],
    optionsEs: ["Una anualidad que paga inmediatamente", "Una anualidad donde los pagos comienzan en una fecha futura", "Una anualidad a término", "Una anualidad sin valor en efectivo"],
    correctAnswer: 1,
    explanationEn: "A deferred annuity postpones the payout phase to a future date, allowing funds to accumulate during the accumulation period.",
    explanationEs: "Una anualidad diferida pospone la fase de pago a una fecha futura, permitiendo que los fondos se acumulen durante el período de acumulación."
  },
  {
    category: "life_insurance",
    questionTextEn: "What happens when a universal life insurance policy lapses due to insufficient cash value?",
    questionTextEs: "¿Qué sucede cuando una póliza de seguro de vida universal vence debido a un valor en efectivo insuficiente?",
    optionsEn: ["The policy continues indefinitely", "Coverage terminates", "The death benefit increases", "Premiums are waived"],
    optionsEs: ["La póliza continúa indefinidamente", "La cobertura termina", "El beneficio por muerte aumenta", "Las primas son eximidas"],
    correctAnswer: 1,
    explanationEn: "When a universal life policy has insufficient cash value to cover the cost of insurance, the policy lapses and coverage terminates.",
    explanationEs: "Cuando una póliza de vida universal tiene un valor en efectivo insuficiente para cubrir el costo del seguro, la póliza vence y la cobertura termina."
  }
];

export async function seedLifeInsurancePart5() {
  console.log("Seeding Life Insurance questions (Part 5 - Final 40)...");
  
  for (const question of lifeInsuranceQuestions) {
    await db.insert(questions).values(question);
  }
  
  console.log(`Added ${lifeInsuranceQuestions.length} Life Insurance questions`);
}

seedLifeInsurancePart5()
  .then(() => {
    console.log("Life Insurance Part 5 seeding completed!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Error seeding Life Insurance Part 5:", error);
    process.exit(1);
  });
