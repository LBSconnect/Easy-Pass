import { db } from "./db";
import { questions } from "@shared/schema";

const additionalPCQuestions = [
  {
    category: "property_casualty" as const,
    questionTextEn: "What is strict liability?",
    questionTextEs: "¿Qué es la responsabilidad estricta?",
    optionsEn: ["Liability without proof of negligence, applied to abnormally dangerous activities", "Liability only with negligence", "No liability", "Criminal liability"],
    optionsEs: ["Responsabilidad sin prueba de negligencia, aplicada a actividades anormalmente peligrosas", "Responsabilidad solo con negligencia", "Sin responsabilidad", "Responsabilidad criminal"],
    correctAnswer: 0,
    explanationEn: "Strict liability holds a party responsible regardless of fault or negligence, often applied to inherently dangerous activities.",
    explanationEs: "La responsabilidad estricta hace a una parte responsable independientemente de culpa o negligencia, a menudo aplicada a actividades inherentemente peligrosas."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is vicarious liability?",
    questionTextEs: "¿Qué es la responsabilidad vicaria?",
    optionsEn: ["Liability of one party for the acts of another (like employer for employee)", "Personal liability only", "No liability", "Product liability"],
    optionsEs: ["Responsabilidad de una parte por los actos de otra (como empleador por empleado)", "Solo responsabilidad personal", "Sin responsabilidad", "Responsabilidad de producto"],
    correctAnswer: 0,
    explanationEn: "Vicarious liability holds one party responsible for the negligent acts of another, such as an employer for an employee's actions.",
    explanationEs: "La responsabilidad vicaria hace a una parte responsable por los actos negligentes de otra, como un empleador por las acciones de un empleado."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is the attractive nuisance doctrine?",
    questionTextEs: "¿Qué es la doctrina de atractivo peligroso?",
    optionsEn: ["Property owners may be liable for injuries to children attracted to dangerous conditions on their property", "A type of policy", "A coverage exclusion", "A premium discount"],
    optionsEs: ["Los propietarios pueden ser responsables por lesiones a niños atraídos a condiciones peligrosas en su propiedad", "Un tipo de póliza", "Una exclusión de cobertura", "Un descuento de prima"],
    correctAnswer: 0,
    explanationEn: "The attractive nuisance doctrine holds property owners liable for injuries to children attracted by dangerous conditions like pools.",
    explanationEs: "La doctrina de atractivo peligroso hace a los propietarios responsables por lesiones a niños atraídos por condiciones peligrosas como piscinas."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is ordinance or law coverage?",
    questionTextEs: "¿Qué es la cobertura de ordenanza o ley?",
    optionsEn: ["Coverage for additional costs to comply with building codes when repairing or rebuilding", "Standard property coverage", "Liability coverage", "Auto coverage"],
    optionsEs: ["Cobertura para costos adicionales de cumplir con códigos de construcción al reparar o reconstruir", "Cobertura estándar de propiedad", "Cobertura de responsabilidad", "Cobertura de auto"],
    correctAnswer: 0,
    explanationEn: "Ordinance or law coverage pays for additional costs to bring a damaged building up to current building codes.",
    explanationEs: "La cobertura de ordenanza o ley paga costos adicionales para llevar un edificio dañado a los códigos de construcción actuales."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is debris removal coverage?",
    questionTextEs: "¿Qué es la cobertura de remoción de escombros?",
    optionsEn: ["Coverage for costs to remove debris after a covered loss", "Coverage for trash removal", "Liability coverage", "Auto coverage"],
    optionsEs: ["Cobertura para costos de remover escombros después de una pérdida cubierta", "Cobertura para remoción de basura", "Cobertura de responsabilidad", "Cobertura de auto"],
    correctAnswer: 0,
    explanationEn: "Debris removal coverage pays for the cost of removing debris from a property after a covered loss.",
    explanationEs: "La cobertura de remoción de escombros paga el costo de remover escombros de una propiedad después de una pérdida cubierta."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is agreed value coverage?",
    questionTextEs: "¿Qué es la cobertura de valor acordado?",
    optionsEn: ["Coverage where insurer and insured agree on the value upfront, eliminating coinsurance", "Actual cash value coverage", "Market value coverage", "Replacement cost coverage"],
    optionsEs: ["Cobertura donde asegurador y asegurado acuerdan el valor por adelantado, eliminando coaseguro", "Cobertura de valor real en efectivo", "Cobertura de valor de mercado", "Cobertura de costo de reemplazo"],
    correctAnswer: 0,
    explanationEn: "Agreed value coverage establishes an agreed-upon value for the property, waiving the coinsurance requirement.",
    explanationEs: "La cobertura de valor acordado establece un valor acordado para la propiedad, renunciando al requisito de coaseguro."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is blanket coverage?",
    questionTextEs: "¿Qué es la cobertura general?",
    optionsEn: ["Single amount of coverage that applies to multiple properties or items", "Coverage for a single item", "Liability coverage", "Auto coverage"],
    optionsEs: ["Una cantidad única de cobertura que aplica a múltiples propiedades o artículos", "Cobertura para un solo artículo", "Cobertura de responsabilidad", "Cobertura de auto"],
    correctAnswer: 0,
    explanationEn: "Blanket coverage provides a single limit that covers multiple items or locations under one amount.",
    explanationEs: "La cobertura general proporciona un solo límite que cubre múltiples artículos o ubicaciones bajo una cantidad."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is specific coverage?",
    questionTextEs: "¿Qué es la cobertura específica?",
    optionsEn: ["Coverage that lists separate limits for each item or location", "Coverage for all items together", "Liability coverage", "Auto coverage"],
    optionsEs: ["Cobertura que lista límites separados para cada artículo o ubicación", "Cobertura para todos los artículos juntos", "Cobertura de responsabilidad", "Cobertura de auto"],
    correctAnswer: 0,
    explanationEn: "Specific coverage assigns a separate coverage limit to each individual item or location.",
    explanationEs: "La cobertura específica asigna un límite de cobertura separado a cada artículo o ubicación individual."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is valued policy law?",
    questionTextEs: "¿Qué es la ley de póliza valorada?",
    optionsEn: ["A state law requiring insurers to pay the full face value for total loss of property", "A federal law", "A policy exclusion", "A coverage limitation"],
    optionsEs: ["Una ley estatal que requiere que los aseguradores paguen el valor nominal total por pérdida total de propiedad", "Una ley federal", "Una exclusión de póliza", "Una limitación de cobertura"],
    correctAnswer: 0,
    explanationEn: "Valued policy laws require insurers to pay the full policy face amount in case of a total loss.",
    explanationEs: "Las leyes de póliza valorada requieren que los aseguradores paguen el monto nominal total de la póliza en caso de pérdida total."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is pair and set coverage?",
    questionTextEs: "¿Qué es la cobertura de par y conjunto?",
    optionsEn: ["Provision for how to value loss when only part of a pair or set is damaged", "Coverage for matching items", "Full replacement coverage", "Liability coverage"],
    optionsEs: ["Disposición para cómo valorar pérdida cuando solo parte de un par o conjunto está dañado", "Cobertura para artículos que hacen juego", "Cobertura de reemplazo total", "Cobertura de responsabilidad"],
    correctAnswer: 0,
    explanationEn: "Pair and set clauses determine how the insurer will value a loss when only one item of a pair or set is damaged.",
    explanationEs: "Las cláusulas de par y conjunto determinan cómo el asegurador valorará una pérdida cuando solo un artículo de un par o conjunto está dañado."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is the concealment or fraud condition?",
    questionTextEs: "¿Qué es la condición de ocultación o fraude?",
    optionsEn: ["A provision voiding coverage if the insured intentionally conceals or misrepresents material facts", "A coverage addition", "A premium discount", "A claims procedure"],
    optionsEs: ["Una disposición que anula cobertura si el asegurado oculta o tergiversa intencionalmente hechos materiales", "Una adición de cobertura", "Un descuento de prima", "Un procedimiento de reclamos"],
    correctAnswer: 0,
    explanationEn: "The concealment or fraud condition voids the policy if the insured intentionally hides or misrepresents material information.",
    explanationEs: "La condición de ocultación o fraude anula la póliza si el asegurado oculta o tergiversa intencionalmente información material."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is the mortgagee clause?",
    questionTextEs: "¿Qué es la cláusula del acreedor hipotecario?",
    optionsEn: ["Protects the mortgage lender's interest in insured property", "Protects the insured only", "A coverage exclusion", "A premium calculation"],
    optionsEs: ["Protege el interés del prestamista hipotecario en la propiedad asegurada", "Protege solo al asegurado", "Una exclusión de cobertura", "Un cálculo de prima"],
    correctAnswer: 0,
    explanationEn: "The mortgagee clause protects the lender's financial interest and ensures they receive notification of policy changes.",
    explanationEs: "La cláusula del acreedor hipotecario protege el interés financiero del prestamista y asegura que reciban notificación de cambios en la póliza."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is the loss payee clause?",
    questionTextEs: "¿Qué es la cláusula de beneficiario de pérdida?",
    optionsEn: ["Names a party with a financial interest to receive claim payments", "The insured only", "The agent", "The adjuster"],
    optionsEs: ["Nombra a una parte con interés financiero para recibir pagos de reclamos", "Solo el asegurado", "El agente", "El ajustador"],
    correctAnswer: 0,
    explanationEn: "A loss payee clause names another party (like a lienholder) to receive insurance claim payments.",
    explanationEs: "Una cláusula de beneficiario de pérdida nombra a otra parte (como un acreedor) para recibir pagos de reclamos de seguro."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is the duties after loss condition?",
    questionTextEs: "¿Qué es la condición de deberes después de la pérdida?",
    optionsEn: ["Requirements the insured must fulfill after a loss occurs", "Pre-loss requirements", "Coverage limits", "Premium calculations"],
    optionsEs: ["Requisitos que el asegurado debe cumplir después de que ocurra una pérdida", "Requisitos previos a la pérdida", "Límites de cobertura", "Cálculos de prima"],
    correctAnswer: 0,
    explanationEn: "Duties after loss require the insured to take specific actions after a loss, like protecting property and cooperating with the investigation.",
    explanationEs: "Los deberes después de la pérdida requieren que el asegurado tome acciones específicas después de una pérdida, como proteger la propiedad y cooperar con la investigación."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is the other insurance condition?",
    questionTextEs: "¿Qué es la condición de otro seguro?",
    optionsEn: ["How the policy coordinates coverage when other insurance exists", "Requirement for additional insurance", "Coverage exclusion", "Premium discount"],
    optionsEs: ["Cómo la póliza coordina cobertura cuando existe otro seguro", "Requisito de seguro adicional", "Exclusión de cobertura", "Descuento de prima"],
    correctAnswer: 0,
    explanationEn: "The other insurance condition explains how coverage is coordinated when multiple policies cover the same loss.",
    explanationEs: "La condición de otro seguro explica cómo se coordina la cobertura cuando múltiples pólizas cubren la misma pérdida."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is contribution by equal shares?",
    questionTextEs: "¿Qué es la contribución por partes iguales?",
    optionsEn: ["Each insurer pays equal amounts until the loss is paid or limits are exhausted", "One insurer pays all", "Pro rata payment", "No payment"],
    optionsEs: ["Cada asegurador paga cantidades iguales hasta que la pérdida se pague o los límites se agoten", "Un asegurador paga todo", "Pago prorrateado", "Sin pago"],
    correctAnswer: 0,
    explanationEn: "Contribution by equal shares means each insurer pays the same amount until the loss is covered or limits are reached.",
    explanationEs: "La contribución por partes iguales significa que cada asegurador paga la misma cantidad hasta que la pérdida se cubra o se alcancen los límites."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is earth movement typically classified as in property policies?",
    questionTextEs: "¿Cómo se clasifica típicamente el movimiento de tierra en pólizas de propiedad?",
    optionsEn: ["An excluded peril requiring separate coverage", "A covered peril", "A standard coverage", "Included in all policies"],
    optionsEs: ["Un peligro excluido que requiere cobertura separada", "Un peligro cubierto", "Una cobertura estándar", "Incluido en todas las pólizas"],
    correctAnswer: 0,
    explanationEn: "Earth movement (earthquakes, landslides) is typically excluded from standard property policies and requires separate coverage.",
    explanationEs: "El movimiento de tierra (terremotos, deslizamientos) típicamente se excluye de las pólizas estándar de propiedad y requiere cobertura separada."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is water damage in standard homeowners policies?",
    questionTextEs: "¿Qué es el daño por agua en pólizas estándar de propietarios?",
    optionsEn: ["Sudden/accidental discharge from plumbing is covered; flood and groundwater are excluded", "All water damage is covered", "All water damage is excluded", "Only flood is covered"],
    optionsEs: ["Descarga súbita/accidental de plomería está cubierta; inundación y agua subterránea están excluidas", "Todo daño por agua está cubierto", "Todo daño por agua está excluido", "Solo inundación está cubierta"],
    correctAnswer: 0,
    explanationEn: "Homeowners policies cover sudden water damage from plumbing but exclude flood and groundwater damage.",
    explanationEs: "Las pólizas de propietarios cubren daño súbito por agua de plomería pero excluyen daño por inundación y agua subterránea."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is sewer backup coverage?",
    questionTextEs: "¿Qué es la cobertura de respaldo de alcantarillado?",
    optionsEn: ["Optional coverage for damage from sewers or drains backing up", "Standard coverage", "Liability coverage", "Auto coverage"],
    optionsEs: ["Cobertura opcional para daño por alcantarillas o desagües que se respaldan", "Cobertura estándar", "Cobertura de responsabilidad", "Cobertura de auto"],
    correctAnswer: 0,
    explanationEn: "Sewer backup coverage is an optional endorsement covering damage when sewers or drains back up into the home.",
    explanationEs: "La cobertura de respaldo de alcantarillado es un endoso opcional que cubre daño cuando las alcantarillas o desagües se respaldan hacia la casa."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is equipment breakdown coverage?",
    questionTextEs: "¿Qué es la cobertura de avería de equipo?",
    optionsEn: ["Coverage for sudden breakdown of mechanical and electrical equipment", "Standard property coverage", "Liability coverage", "Auto coverage"],
    optionsEs: ["Cobertura para avería súbita de equipo mecánico y eléctrico", "Cobertura estándar de propiedad", "Cobertura de responsabilidad", "Cobertura de auto"],
    correctAnswer: 0,
    explanationEn: "Equipment breakdown coverage (boiler and machinery) covers sudden breakdown of mechanical and electrical equipment.",
    explanationEs: "La cobertura de avería de equipo (calderas y maquinaria) cubre avería súbita de equipo mecánico y eléctrico."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is identity theft coverage?",
    questionTextEs: "¿Qué es la cobertura de robo de identidad?",
    optionsEn: ["Coverage for expenses related to restoring identity after identity theft", "Theft of property coverage", "Liability coverage", "Auto coverage"],
    optionsEs: ["Cobertura para gastos relacionados con restaurar la identidad después del robo de identidad", "Cobertura de robo de propiedad", "Cobertura de responsabilidad", "Cobertura de auto"],
    correctAnswer: 0,
    explanationEn: "Identity theft coverage helps pay expenses to restore your identity and credit after becoming a victim of identity theft.",
    explanationEs: "La cobertura de robo de identidad ayuda a pagar gastos para restaurar su identidad y crédito después de ser víctima de robo de identidad."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is cyber liability insurance?",
    questionTextEs: "¿Qué es el seguro de responsabilidad cibernética?",
    optionsEn: ["Coverage for losses from data breaches, cyberattacks, and network security failures", "Property coverage", "Auto coverage", "Health coverage"],
    optionsEs: ["Cobertura por pérdidas de brechas de datos, ciberataques y fallas de seguridad de red", "Cobertura de propiedad", "Cobertura de auto", "Cobertura de salud"],
    correctAnswer: 0,
    explanationEn: "Cyber liability insurance covers losses from data breaches, cyberattacks, and related incidents.",
    explanationEs: "El seguro de responsabilidad cibernética cubre pérdidas de brechas de datos, ciberataques e incidentes relacionados."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is Directors and Officers (D&O) liability insurance?",
    questionTextEs: "¿Qué es el seguro de responsabilidad de Directores y Oficiales (D&O)?",
    optionsEn: ["Coverage protecting company leaders from personal liability for management decisions", "Property coverage", "Auto coverage", "Health coverage"],
    optionsEs: ["Cobertura que protege a líderes de la empresa de responsabilidad personal por decisiones de gestión", "Cobertura de propiedad", "Cobertura de auto", "Cobertura de salud"],
    correctAnswer: 0,
    explanationEn: "D&O insurance protects corporate directors and officers from personal liability for decisions made in their official capacity.",
    explanationEs: "El seguro D&O protege a directores y oficiales corporativos de responsabilidad personal por decisiones tomadas en su capacidad oficial."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is Employment Practices Liability Insurance (EPLI)?",
    questionTextEs: "¿Qué es el Seguro de Responsabilidad de Prácticas Laborales (EPLI)?",
    optionsEn: ["Coverage for claims arising from employment-related issues like discrimination and wrongful termination", "Workers compensation", "Property coverage", "Auto coverage"],
    optionsEs: ["Cobertura para reclamos que surgen de problemas relacionados con el empleo como discriminación y despido injustificado", "Compensación de trabajadores", "Cobertura de propiedad", "Cobertura de auto"],
    correctAnswer: 0,
    explanationEn: "EPLI covers claims from employees alleging discrimination, harassment, wrongful termination, and other employment issues.",
    explanationEs: "EPLI cubre reclamos de empleados que alegan discriminación, acoso, despido injustificado y otros problemas laborales."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is fiduciary liability insurance?",
    questionTextEs: "¿Qué es el seguro de responsabilidad fiduciaria?",
    optionsEn: ["Coverage for claims against those managing employee benefit plans", "Property coverage", "Auto coverage", "Life coverage"],
    optionsEs: ["Cobertura para reclamos contra quienes administran planes de beneficios para empleados", "Cobertura de propiedad", "Cobertura de auto", "Cobertura de vida"],
    correctAnswer: 0,
    explanationEn: "Fiduciary liability insurance protects those responsible for managing employee benefit plans from claims of mismanagement.",
    explanationEs: "El seguro de responsabilidad fiduciaria protege a quienes son responsables de administrar planes de beneficios para empleados de reclamos de mala gestión."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is crime insurance?",
    questionTextEs: "¿Qué es el seguro de crimen?",
    optionsEn: ["Coverage for losses from criminal acts like employee theft, robbery, and forgery", "Property coverage only", "Liability coverage", "Auto coverage"],
    optionsEs: ["Cobertura por pérdidas de actos criminales como robo por empleados, atraco y falsificación", "Solo cobertura de propiedad", "Cobertura de responsabilidad", "Cobertura de auto"],
    correctAnswer: 0,
    explanationEn: "Crime insurance covers losses from criminal acts including employee dishonesty, robbery, forgery, and computer fraud.",
    explanationEs: "El seguro de crimen cubre pérdidas de actos criminales incluyendo deshonestidad de empleados, atraco, falsificación y fraude informático."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is a fidelity bond?",
    questionTextEs: "¿Qué es una fianza de fidelidad?",
    optionsEn: ["Coverage protecting against employee dishonesty", "A surety bond", "A bail bond", "A license bond"],
    optionsEs: ["Cobertura que protege contra la deshonestidad de empleados", "Una fianza de garantía", "Una fianza de libertad", "Una fianza de licencia"],
    correctAnswer: 0,
    explanationEn: "A fidelity bond protects employers from losses caused by dishonest acts of their employees.",
    explanationEs: "Una fianza de fidelidad protege a los empleadores de pérdidas causadas por actos deshonestos de sus empleados."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is bailee coverage?",
    questionTextEs: "¿Qué es la cobertura de depositario?",
    optionsEn: ["Coverage for property of others in the care, custody, or control of the insured", "Personal property coverage", "Liability coverage", "Auto coverage"],
    optionsEs: ["Cobertura para propiedad de otros en el cuidado, custodia o control del asegurado", "Cobertura de propiedad personal", "Cobertura de responsabilidad", "Cobertura de auto"],
    correctAnswer: 0,
    explanationEn: "Bailee coverage protects property belonging to others while it's in the insured's possession or control.",
    explanationEs: "La cobertura de depositario protege propiedad perteneciente a otros mientras está en posesión o control del asegurado."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is builders risk insurance?",
    questionTextEs: "¿Qué es el seguro de riesgo de constructores?",
    optionsEn: ["Coverage for buildings under construction", "Completed building coverage", "Liability coverage", "Auto coverage"],
    optionsEs: ["Cobertura para edificios en construcción", "Cobertura de edificio completado", "Cobertura de responsabilidad", "Cobertura de auto"],
    correctAnswer: 0,
    explanationEn: "Builders risk insurance covers buildings and materials during construction until the project is complete.",
    explanationEs: "El seguro de riesgo de constructores cubre edificios y materiales durante la construcción hasta que el proyecto esté completo."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is a contractor's equipment floater?",
    questionTextEs: "¿Qué es un flotante de equipo de contratista?",
    optionsEn: ["Coverage for mobile equipment used by contractors", "Building coverage", "Liability coverage", "Auto coverage"],
    optionsEs: ["Cobertura para equipo móvil usado por contratistas", "Cobertura de edificio", "Cobertura de responsabilidad", "Cobertura de auto"],
    correctAnswer: 0,
    explanationEn: "A contractor's equipment floater covers mobile equipment and tools used at various job sites.",
    explanationEs: "Un flotante de equipo de contratista cubre equipo móvil y herramientas usados en varios sitios de trabajo."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is a garage keeper's legal liability policy?",
    questionTextEs: "¿Qué es una póliza de responsabilidad legal de cuidador de garaje?",
    optionsEn: ["Coverage for damage to customers' vehicles in the insured's care", "Auto liability coverage", "Property coverage", "Workers compensation"],
    optionsEs: ["Cobertura por daño a vehículos de clientes en el cuidado del asegurado", "Cobertura de responsabilidad de auto", "Cobertura de propiedad", "Compensación de trabajadores"],
    correctAnswer: 0,
    explanationEn: "Garagekeepers coverage protects auto service businesses for damage to customers' vehicles in their care.",
    explanationEs: "La cobertura de cuidador de garaje protege a negocios de servicio de autos por daño a vehículos de clientes en su cuidado."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is motor truck cargo insurance?",
    questionTextEs: "¿Qué es el seguro de carga de camión?",
    optionsEn: ["Coverage for goods being transported by truck", "Auto liability coverage", "Property coverage", "Workers compensation"],
    optionsEs: ["Cobertura para bienes siendo transportados por camión", "Cobertura de responsabilidad de auto", "Cobertura de propiedad", "Compensación de trabajadores"],
    correctAnswer: 0,
    explanationEn: "Motor truck cargo insurance covers goods and merchandise while being transported in a commercial truck.",
    explanationEs: "El seguro de carga de camión cubre bienes y mercancía mientras son transportados en un camión comercial."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is boatowners insurance?",
    questionTextEs: "¿Qué es el seguro de propietarios de botes?",
    optionsEn: ["Coverage for boats including hull damage, liability, and medical payments", "Homeowners coverage", "Auto coverage", "Commercial coverage"],
    optionsEs: ["Cobertura para botes incluyendo daño al casco, responsabilidad y pagos médicos", "Cobertura de propietarios", "Cobertura de auto", "Cobertura comercial"],
    correctAnswer: 0,
    explanationEn: "Boatowners insurance covers physical damage to the boat, liability for accidents, and medical payments.",
    explanationEs: "El seguro de propietarios de botes cubre daño físico al bote, responsabilidad por accidentes y pagos médicos."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is personal watercraft insurance?",
    questionTextEs: "¿Qué es el seguro de embarcaciones personales?",
    optionsEn: ["Coverage for jet skis and similar watercraft", "Boat insurance", "Auto insurance", "Homeowners insurance"],
    optionsEs: ["Cobertura para motos acuáticas y embarcaciones similares", "Seguro de botes", "Seguro de auto", "Seguro de propietarios"],
    correctAnswer: 0,
    explanationEn: "Personal watercraft insurance covers jet skis, wave runners, and similar personal watercraft.",
    explanationEs: "El seguro de embarcaciones personales cubre motos acuáticas, wave runners y embarcaciones personales similares."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is recreational vehicle (RV) insurance?",
    questionTextEs: "¿Qué es el seguro de vehículos recreativos (RV)?",
    optionsEn: ["Coverage combining auto and property features for motorhomes and campers", "Auto insurance only", "Homeowners insurance only", "Liability only"],
    optionsEs: ["Cobertura que combina características de auto y propiedad para casas rodantes y campers", "Solo seguro de auto", "Solo seguro de propietarios", "Solo responsabilidad"],
    correctAnswer: 0,
    explanationEn: "RV insurance provides coverage that combines auto-like liability with property coverage for personal belongings inside.",
    explanationEs: "El seguro de RV proporciona cobertura que combina responsabilidad tipo auto con cobertura de propiedad para pertenencias personales adentro."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is mobile home insurance?",
    questionTextEs: "¿Qué es el seguro de casa móvil?",
    optionsEn: ["Coverage for manufactured homes including structure, contents, and liability", "Standard homeowners coverage", "Auto coverage", "Commercial coverage"],
    optionsEs: ["Cobertura para casas manufacturadas incluyendo estructura, contenidos y responsabilidad", "Cobertura estándar de propietarios", "Cobertura de auto", "Cobertura comercial"],
    correctAnswer: 0,
    explanationEn: "Mobile home insurance provides coverage similar to homeowners but designed for manufactured/mobile homes.",
    explanationEs: "El seguro de casa móvil proporciona cobertura similar a la de propietarios pero diseñada para casas manufacturadas/móviles."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is farm insurance?",
    questionTextEs: "¿Qué es el seguro agrícola?",
    optionsEn: ["Coverage for farm dwellings, equipment, livestock, and farm liability", "Homeowners only", "Commercial only", "Auto only"],
    optionsEs: ["Cobertura para viviendas agrícolas, equipo, ganado y responsabilidad agrícola", "Solo propietarios", "Solo comercial", "Solo auto"],
    correctAnswer: 0,
    explanationEn: "Farm insurance combines residential coverage with coverage for farm equipment, livestock, and farm operations.",
    explanationEs: "El seguro agrícola combina cobertura residencial con cobertura para equipo agrícola, ganado y operaciones agrícolas."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is crop insurance?",
    questionTextEs: "¿Qué es el seguro de cultivos?",
    optionsEn: ["Coverage for farmers against loss of crops due to weather, disease, or price decline", "Property insurance", "Liability insurance", "Auto insurance"],
    optionsEs: ["Cobertura para agricultores contra pérdida de cultivos debido a clima, enfermedad o disminución de precios", "Seguro de propiedad", "Seguro de responsabilidad", "Seguro de auto"],
    correctAnswer: 0,
    explanationEn: "Crop insurance protects farmers from financial losses due to crop failure from weather, disease, or market conditions.",
    explanationEs: "El seguro de cultivos protege a los agricultores de pérdidas financieras debido a pérdida de cultivos por clima, enfermedad o condiciones de mercado."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is livestock insurance?",
    questionTextEs: "¿Qué es el seguro de ganado?",
    optionsEn: ["Coverage for farm animals against death or injury from covered causes", "Property insurance", "Auto insurance", "Liability insurance"],
    optionsEs: ["Cobertura para animales de granja contra muerte o lesión por causas cubiertas", "Seguro de propiedad", "Seguro de auto", "Seguro de responsabilidad"],
    correctAnswer: 0,
    explanationEn: "Livestock insurance covers farm animals against death, theft, or accidental injury.",
    explanationEs: "El seguro de ganado cubre animales de granja contra muerte, robo o lesión accidental."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is special events insurance?",
    questionTextEs: "¿Qué es el seguro de eventos especiales?",
    optionsEn: ["Short-term coverage for specific events like weddings or concerts", "Long-term coverage", "Auto coverage", "Property coverage"],
    optionsEs: ["Cobertura a corto plazo para eventos específicos como bodas o conciertos", "Cobertura a largo plazo", "Cobertura de auto", "Cobertura de propiedad"],
    correctAnswer: 0,
    explanationEn: "Special events insurance provides short-term coverage for liability and other risks at specific events.",
    explanationEs: "El seguro de eventos especiales proporciona cobertura a corto plazo para responsabilidad y otros riesgos en eventos específicos."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is liquor liability insurance?",
    questionTextEs: "¿Qué es el seguro de responsabilidad por licor?",
    optionsEn: ["Coverage for claims arising from serving alcohol", "Property coverage", "Auto coverage", "Health coverage"],
    optionsEs: ["Cobertura para reclamos que surgen de servir alcohol", "Cobertura de propiedad", "Cobertura de auto", "Cobertura de salud"],
    correctAnswer: 0,
    explanationEn: "Liquor liability insurance covers claims arising from the sale or service of alcohol.",
    explanationEs: "El seguro de responsabilidad por licor cubre reclamos que surgen de la venta o servicio de alcohol."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is professional malpractice insurance?",
    questionTextEs: "¿Qué es el seguro de mala práctica profesional?",
    optionsEn: ["Coverage for professionals against claims of negligent services or advice", "Property coverage", "Auto coverage", "Life coverage"],
    optionsEs: ["Cobertura para profesionales contra reclamos de servicios o consejos negligentes", "Cobertura de propiedad", "Cobertura de auto", "Cobertura de vida"],
    correctAnswer: 0,
    explanationEn: "Professional malpractice insurance covers claims alleging professional negligence, errors, or omissions.",
    explanationEs: "El seguro de mala práctica profesional cubre reclamos que alegan negligencia profesional, errores u omisiones."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is warranty in insurance?",
    questionTextEs: "¿Qué es una garantía en seguros?",
    optionsEn: ["A statement by the insured that must be strictly true for coverage to apply", "A promise by the insurer", "A coverage limit", "A premium discount"],
    optionsEs: ["Una declaración del asegurado que debe ser estrictamente verdadera para que aplique la cobertura", "Una promesa del asegurador", "Un límite de cobertura", "Un descuento de prima"],
    correctAnswer: 0,
    explanationEn: "A warranty is a statement made by the insured that must be strictly true; breach may void the policy.",
    explanationEs: "Una garantía es una declaración hecha por el asegurado que debe ser estrictamente verdadera; el incumplimiento puede anular la póliza."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is a representation in insurance?",
    questionTextEs: "¿Qué es una representación en seguros?",
    optionsEn: ["A statement made by the applicant that is substantially true", "A warranty", "A coverage limit", "A claim"],
    optionsEs: ["Una declaración hecha por el solicitante que es sustancialmente verdadera", "Una garantía", "Un límite de cobertura", "Un reclamo"],
    correctAnswer: 0,
    explanationEn: "A representation is a statement by the applicant that must be substantially true; only material misrepresentations void coverage.",
    explanationEs: "Una representación es una declaración del solicitante que debe ser sustancialmente verdadera; solo tergiversaciones materiales anulan la cobertura."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is material misrepresentation?",
    questionTextEs: "¿Qué es la tergiversación material?",
    optionsEn: ["A false statement that would have affected the insurer's decision to provide coverage", "A minor error", "A typo on the application", "A late payment"],
    optionsEs: ["Una declaración falsa que habría afectado la decisión del asegurador de proporcionar cobertura", "Un error menor", "Un error tipográfico en la solicitud", "Un pago atrasado"],
    correctAnswer: 0,
    explanationEn: "Material misrepresentation is a false statement significant enough to have influenced the underwriting decision.",
    explanationEs: "La tergiversación material es una declaración falsa lo suficientemente significativa para haber influido en la decisión de suscripción."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is the entire contract provision?",
    questionTextEs: "¿Qué es la disposición de contrato completo?",
    optionsEn: ["The policy and attached documents constitute the complete agreement between parties", "Part of the agreement", "The premium only", "The application only"],
    optionsEs: ["La póliza y documentos adjuntos constituyen el acuerdo completo entre las partes", "Parte del acuerdo", "Solo la prima", "Solo la solicitud"],
    correctAnswer: 0,
    explanationEn: "The entire contract provision states that the policy and any attached documents represent the complete agreement.",
    explanationEs: "La disposición de contrato completo establece que la póliza y cualquier documento adjunto representan el acuerdo completo."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is the doctrine of reasonable expectations?",
    questionTextEs: "¿Qué es la doctrina de expectativas razonables?",
    optionsEn: ["Coverage should be interpreted according to what a reasonable person would expect", "Literal interpretation only", "Insurer's interpretation", "No interpretation needed"],
    optionsEs: ["La cobertura debe interpretarse según lo que una persona razonable esperaría", "Solo interpretación literal", "Interpretación del asegurador", "No se necesita interpretación"],
    correctAnswer: 0,
    explanationEn: "The doctrine of reasonable expectations means policy language is interpreted according to what the insured would reasonably expect.",
    explanationEs: "La doctrina de expectativas razonables significa que el lenguaje de la póliza se interpreta según lo que el asegurado razonablemente esperaría."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is the parol evidence rule?",
    questionTextEs: "¿Qué es la regla de evidencia parol?",
    optionsEn: ["Oral statements cannot change a written contract's terms", "Oral statements always apply", "Written contracts are invalid", "Both oral and written are equal"],
    optionsEs: ["Las declaraciones orales no pueden cambiar los términos de un contrato escrito", "Las declaraciones orales siempre aplican", "Los contratos escritos son inválidos", "Ambos oral y escrito son iguales"],
    correctAnswer: 0,
    explanationEn: "The parol evidence rule prevents oral statements from modifying the terms of a written insurance contract.",
    explanationEs: "La regla de evidencia parol previene que las declaraciones orales modifiquen los términos de un contrato de seguro escrito."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What does 'concurrent causation' mean?",
    questionTextEs: "¿Qué significa 'causalidad concurrente'?",
    optionsEn: ["When multiple causes contribute to a loss, some covered and some excluded", "A single cause of loss", "No cause of loss", "Only excluded causes"],
    optionsEs: ["Cuando múltiples causas contribuyen a una pérdida, algunas cubiertas y algunas excluidas", "Una sola causa de pérdida", "Sin causa de pérdida", "Solo causas excluidas"],
    correctAnswer: 0,
    explanationEn: "Concurrent causation occurs when two or more causes contribute to a loss, creating coverage disputes.",
    explanationEs: "La causalidad concurrente ocurre cuando dos o más causas contribuyen a una pérdida, creando disputas de cobertura."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is an anti-concurrent causation clause?",
    questionTextEs: "¿Qué es una cláusula de anti-causalidad concurrente?",
    optionsEn: ["Provision excluding coverage when an excluded peril contributes to a loss", "A coverage addition", "A premium discount", "A claim procedure"],
    optionsEs: ["Disposición que excluye cobertura cuando un peligro excluido contribuye a una pérdida", "Una adición de cobertura", "Un descuento de prima", "Un procedimiento de reclamo"],
    correctAnswer: 0,
    explanationEn: "An anti-concurrent causation clause excludes coverage when an excluded peril is a contributing cause of loss.",
    explanationEs: "Una cláusula de anti-causalidad concurrente excluye cobertura cuando un peligro excluido es una causa contribuyente de pérdida."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is waiver in insurance?",
    questionTextEs: "¿Qué es la renuncia en seguros?",
    optionsEn: ["Voluntary giving up of a known right", "A coverage addition", "A premium increase", "A claim denial"],
    optionsEs: ["Renuncia voluntaria de un derecho conocido", "Una adición de cobertura", "Un aumento de prima", "Una denegación de reclamo"],
    correctAnswer: 0,
    explanationEn: "Waiver is the voluntary relinquishment of a known right by the insurer, which cannot later be enforced.",
    explanationEs: "La renuncia es la renuncia voluntaria de un derecho conocido por el asegurador, que luego no puede hacerse cumplir."
  },
  {
    category: "property_casualty" as const,
    questionTextEn: "What is estoppel in insurance?",
    questionTextEs: "¿Qué es el estoppel en seguros?",
    optionsEn: ["Preventing a party from asserting a right because their actions led another to rely on different facts", "A coverage type", "A premium calculation", "A claim procedure"],
    optionsEs: ["Prevenir que una parte afirme un derecho porque sus acciones llevaron a otro a confiar en hechos diferentes", "Un tipo de cobertura", "Un cálculo de prima", "Un procedimiento de reclamo"],
    correctAnswer: 0,
    explanationEn: "Estoppel prevents an insurer from denying coverage when their actions caused the insured to reasonably rely on coverage.",
    explanationEs: "El estoppel previene que un asegurador niegue cobertura cuando sus acciones causaron que el asegurado razonablemente confiara en la cobertura."
  }
];

async function seedAdditionalPCQuestions() {
  console.log("Seeding additional Property & Casualty questions...");
  
  try {
    for (const question of additionalPCQuestions) {
      await db.insert(questions).values(question);
    }
    console.log(`Successfully added ${additionalPCQuestions.length} Property & Casualty questions`);
  } catch (error) {
    console.error("Error seeding P&C questions:", error);
    throw error;
  }
}

seedAdditionalPCQuestions()
  .then(() => {
    console.log("Property & Casualty seeding complete!");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Failed:", error);
    process.exit(1);
  });
