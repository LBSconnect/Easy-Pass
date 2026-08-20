import { Link, useLocation, useParams } from "wouter";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { buildUrl, useSEO } from "@/hooks/use-seo";

const TOPICS = {
  "coinsurance-example": {
    esSlug: "ejemplo-coaseguro",
    category: "pc",
    en: {
      title: "Coinsurance Example: How the Formula Works | MyEasyPass",
      h1: "Coinsurance Example: How Do You Calculate It?",
      intro: "Coinsurance questions usually test whether the insured carried enough coverage compared with a required amount. A simplified study formula is: amount carried ÷ amount required × covered loss, subject to policy terms and limits.",
      steps: ["Find the insurance amount carried.", "Find the amount that should have been carried under the example.", "Divide carried by required.", "Multiply that ratio by the covered loss, then apply any deductible or policy limit if the question tells you to."],
      example: "Example: a building has a study value of $500,000 and an 80% coinsurance requirement, so the required amount is $400,000. If $300,000 was carried and a covered loss is $100,000, the simplified ratio is 300,000 ÷ 400,000 = 0.75. Applied to the $100,000 loss, the study result is $75,000 before any stated deductible or other policy limitation.",
      tip: "Do not multiply by the percentage requirement first and stop. First determine the required insurance amount, then compare carried to required.",
    },
    es: {
      title: "Ejemplo de Coaseguro: Cómo Funciona la Fórmula | MyEasyPass",
      h1: "Ejemplo de coaseguro: ¿cómo se calcula?",
      intro: "Las preguntas de coaseguro suelen evaluar si el asegurado mantuvo suficiente cobertura frente a una cantidad requerida. Una fórmula simplificada de estudio es: cantidad asegurada ÷ cantidad requerida × pérdida cubierta, sujeta a los términos y límites de la póliza.",
      steps: ["Identifica la cantidad de seguro mantenida.", "Calcula la cantidad que debía mantenerse según el ejemplo.", "Divide mantenida entre requerida.", "Multiplica esa proporción por la pérdida cubierta y luego aplica cualquier deducible o límite indicado."],
      example: "Ejemplo: un edificio tiene un valor de estudio de $500,000 y un requisito de coaseguro de 80%, por lo que la cantidad requerida es $400,000. Si se mantuvieron $300,000 y la pérdida cubierta es $100,000, la proporción simplificada es 300,000 ÷ 400,000 = 0.75. Aplicada a la pérdida, el resultado de estudio es $75,000 antes de cualquier deducible o limitación indicada.",
      tip: "No te detengas después de calcular el porcentaje. Primero calcula la cantidad requerida y luego compara lo mantenido con lo requerido.",
    },
  },
  "actual-cash-value-example": {
    esSlug: "ejemplo-valor-efectivo-real",
    category: "pc",
    en: {
      title: "Actual Cash Value Example: Replacement Cost Minus Depreciation | MyEasyPass",
      h1: "Actual Cash Value Example",
      intro: "A common exam-study shortcut is to think of actual cash value as replacement cost minus depreciation when the question is framed that way. The exact policy and valuation method always control in real claims.",
      steps: ["Identify the replacement cost in the question.", "Identify the depreciation amount or percentage supplied.", "Subtract depreciation from replacement cost when the question uses that simplified method.", "Check whether a deductible is applied separately."],
      example: "Example: an item would cost $10,000 to replace and the question assigns $3,000 of depreciation. Using the simplified exam method, actual cash value is $7,000 before any stated deductible or policy limitation.",
      tip: "Do not subtract the deductible when the question is only asking you to calculate ACV. Deductibles are a separate step unless the prompt asks for the claim payment.",
    },
    es: {
      title: "Ejemplo de Valor Efectivo Real: Costo Menos Depreciación | MyEasyPass",
      h1: "Ejemplo de valor efectivo real",
      intro: "Una forma común de estudio es pensar en valor efectivo real como costo de reemplazo menos depreciación cuando la pregunta está planteada de esa manera. En reclamaciones reales controla el método de valoración de la póliza.",
      steps: ["Identifica el costo de reemplazo.", "Identifica la depreciación indicada.", "Resta la depreciación del costo de reemplazo cuando la pregunta use ese método simplificado.", "Verifica si el deducible se aplica por separado."],
      example: "Ejemplo: reemplazar un artículo cuesta $10,000 y la pregunta asigna $3,000 de depreciación. Con el método simplificado de estudio, el valor efectivo real es $7,000 antes de cualquier deducible o limitación.",
      tip: "No restes el deducible si la pregunta solo pide calcular el valor efectivo real. El deducible es un paso separado salvo que te pidan el pago de la reclamación.",
    },
  },
  "replacement-cost-example": {
    esSlug: "ejemplo-costo-reemplazo",
    category: "pc",
    en: {
      title: "Replacement Cost Example for Insurance Exam Prep | MyEasyPass",
      h1: "Replacement Cost Example: What Does It Mean?",
      intro: "Replacement cost generally focuses on the cost to replace damaged property with new property of like kind and quality, without subtracting depreciation, subject to policy conditions and limits.",
      steps: ["Identify what property was damaged.", "Use the cost to replace it with comparable new property when the study question directs you to replacement cost.", "Do not subtract depreciation when the question is testing pure replacement-cost valuation.", "Apply policy limits or deductibles only if the question asks for the payable amount."],
      example: "Example: a covered item originally cost $6,000, is now several years old, and would cost $8,000 to replace with comparable new property. If the question asks only for replacement cost, the study answer is $8,000, not the original purchase price and not a depreciated amount.",
      tip: "Replacement cost is about today’s replacement amount, not what the item originally cost.",
    },
    es: {
      title: "Ejemplo de Costo de Reemplazo para el Examen | MyEasyPass",
      h1: "Ejemplo de costo de reemplazo",
      intro: "El costo de reemplazo generalmente se enfoca en lo que costaría reemplazar la propiedad dañada por propiedad nueva de tipo y calidad similares, sin restar depreciación, sujeto a condiciones y límites.",
      steps: ["Identifica la propiedad dañada.", "Usa el costo de reemplazarla con propiedad nueva comparable cuando la pregunta indique costo de reemplazo.", "No restes depreciación si se evalúa únicamente este método.", "Aplica límites o deducibles solo si la pregunta pide el monto pagadero."],
      example: "Ejemplo: un artículo cubierto costó originalmente $6,000, tiene varios años y hoy cuesta $8,000 reemplazarlo por uno nuevo comparable. Si la pregunta pide solo costo de reemplazo, la respuesta de estudio es $8,000.",
      tip: "Costo de reemplazo se refiere al costo actual de reemplazar, no al precio original de compra.",
    },
  },
  "earnest-money-example": {
    esSlug: "ejemplo-earnest-money",
    category: "realestate",
    en: {
      title: "Earnest Money Example for Texas Real Estate Exam Prep | MyEasyPass",
      h1: "Earnest Money Example: What Is It Doing in a Contract?",
      intro: "Earnest money is commonly used as a buyer’s deposit showing serious intent in a transaction. Exam questions often test what it represents, who holds it, or how it is handled under the contract rather than treating it as the purchase price itself.",
      steps: ["Identify that the money is connected to the buyer’s offer or contract.", "Keep it separate from the down payment concept unless the facts connect them.", "Look to the contract and applicable rules for who holds it and what happens if the deal closes or terminates."],
      example: "Example: a buyer signs a purchase contract for $350,000 and delivers $3,000 as earnest money to the party designated by the contract. The $3,000 is not the entire down payment or sales price; it is a deposit handled according to the contract and applicable rules.",
      tip: "If the question asks what earnest money proves, think serious intent and contractual deposit, not ownership of the property.",
    },
    es: {
      title: "Ejemplo de Earnest Money para Bienes Raíces | MyEasyPass",
      h1: "Ejemplo de earnest money: ¿qué función cumple?",
      intro: "Earnest money se usa comúnmente como depósito del comprador para demostrar intención seria en una transacción. Las preguntas suelen evaluar qué representa, quién lo mantiene o cómo se maneja según el contrato.",
      steps: ["Identifica que el dinero está conectado con la oferta o contrato del comprador.", "No lo confundas con el concepto completo de down payment salvo que los hechos lo indiquen.", "Consulta el contrato y las reglas aplicables para saber quién lo mantiene y qué ocurre al cerrar o terminar la transacción."],
      example: "Ejemplo: un comprador firma un contrato de compra por $350,000 y entrega $3,000 como earnest money a la parte indicada por el contrato. Los $3,000 no son el precio de venta ni necesariamente todo el down payment; son un depósito manejado conforme al contrato.",
      tip: "Si preguntan qué demuestra earnest money, piensa en intención seria y depósito contractual, no en propiedad del inmueble.",
    },
  },
  "insurable-interest-example": {
    esSlug: "ejemplo-interes-asegurable",
    category: "life",
    en: {
      title: "Insurable Interest Example for Life Insurance Exam Prep | MyEasyPass",
      h1: "Insurable Interest Example",
      intro: "Insurable interest asks whether the policyowner has a legitimate interest in the continued life of the insured when the policy is initiated. Exam questions often use family or business relationships to test that idea.",
      steps: ["Identify the policyowner.", "Identify whose life is insured.", "Ask whether the policyowner would reasonably suffer a recognized personal or financial loss from that person’s death.", "Keep insurable interest separate from who is named beneficiary."],
      example: "Example: a business purchases life insurance on a key employee whose death could create a significant financial loss for the company. That business relationship can illustrate the concept of insurable interest, subject to applicable requirements.",
      tip: "Do not assume that naming someone as beneficiary creates insurable interest. The concept is about the policyowner’s legitimate interest in the insured’s continued life.",
    },
    es: {
      title: "Ejemplo de Interés Asegurable en Seguro de Vida | MyEasyPass",
      h1: "Ejemplo de interés asegurable",
      intro: "El interés asegurable pregunta si el propietario de la póliza tiene un interés legítimo en la vida continua del asegurado cuando se inicia la póliza. Las preguntas suelen usar relaciones familiares o comerciales para evaluar este concepto.",
      steps: ["Identifica al propietario de la póliza.", "Identifica qué vida está asegurada.", "Pregunta si el propietario sufriría una pérdida personal o financiera reconocida si esa persona fallece.", "Separa interés asegurable de la designación de beneficiario."],
      example: "Ejemplo: una empresa compra seguro de vida sobre un empleado clave cuya muerte podría causar una pérdida financiera importante. Esa relación comercial puede ilustrar el concepto de interés asegurable, sujeto a los requisitos aplicables.",
      tip: "Nombrar a alguien como beneficiario no crea por sí solo interés asegurable. El concepto se enfoca en el interés legítimo del propietario en la vida del asegurado.",
    },
  },
  "beneficiary-scenario": {
    esSlug: "escenario-beneficiario",
    category: "life",
    en: {
      title: "Life Insurance Beneficiary Scenario Example | MyEasyPass",
      h1: "Beneficiary Scenario: Who Receives the Death Benefit?",
      intro: "Beneficiary questions become easier when you identify the primary beneficiary first, then check whether a contingent beneficiary matters under the facts supplied by the question and the policy terms.",
      steps: ["Identify the insured and confirm the event triggering the death benefit.", "Identify the primary beneficiary designation.", "If the primary beneficiary cannot receive the proceeds under the facts, check the contingent designation.", "Do not assume the policyowner or estate receives the proceeds unless the scenario supports that result."],
      example: "Example: a policy names Jordan as primary beneficiary and Taylor as contingent beneficiary. If Jordan dies before the insured and the policy has not been changed, Taylor is the person the exam scenario is directing you to consider next, subject to the policy and applicable law.",
      tip: "Primary means first in line under the designation; contingent means backup. Read the order before adding outside assumptions.",
    },
    es: {
      title: "Ejemplo de Escenario de Beneficiario de Seguro de Vida | MyEasyPass",
      h1: "Escenario de beneficiario: ¿quién recibe el beneficio por fallecimiento?",
      intro: "Las preguntas de beneficiarios se simplifican cuando primero identificas al beneficiario primario y luego verificas si el beneficiario contingente importa según los hechos y términos de la póliza.",
      steps: ["Identifica al asegurado y el evento que activa el beneficio por fallecimiento.", "Identifica al beneficiario primario.", "Si el primario no puede recibir los fondos según los hechos, revisa al contingente.", "No asumas que el propietario o la sucesión recibe el beneficio salvo que el escenario lo indique."],
      example: "Ejemplo: una póliza nombra a Jordan como beneficiario primario y a Taylor como contingente. Si Jordan fallece antes que el asegurado y la póliza no ha sido modificada, Taylor es la persona que el escenario te dirige a considerar después, sujeto a la póliza y la ley aplicable.",
      tip: "Primario significa primero en la designación; contingente significa respaldo. Lee el orden antes de agregar suposiciones.",
    },
  },
} as const;

type TopicKey = keyof typeof TOPICS;
type Lang = "en" | "es";
const KEYS = Object.keys(TOPICS) as TopicKey[];
const ES_TO_KEY = Object.fromEntries(KEYS.map((key) => [TOPICS[key].esSlug, key])) as Record<string, TopicKey>;

function categoryLinks(category: "pc" | "life" | "realestate", lang: Lang) {
  if (category === "pc") return lang === "es"
    ? { practice: "/es/free/prueba-practica-propiedad-accidentes-texas", prep: "/es/preparacion-examen-seguros-propiedad-accidentes-texas" }
    : { practice: "/free/texas-property-casualty-practice-test", prep: "/texas-property-casualty-exam-prep" };
  if (category === "life") return lang === "es"
    ? { practice: "/es/free/prueba-practica-seguro-vida-texas", prep: "/es/preparacion-examen-seguros-vida-texas" }
    : { practice: "/free/texas-life-insurance-practice-test", prep: "/texas-life-insurance-exam-prep" };
  return lang === "es"
    ? { practice: "/es/free/prueba-practica-bienes-raices-texas", prep: "/es/preparacion-examen-bienes-raices-texas" }
    : { practice: "/free/texas-real-estate-practice-test", prep: "/texas-real-estate-exam-prep" };
}

function pathFor(key: TopicKey, lang: Lang) {
  return lang === "es" ? `/es/ejemplos/${TOPICS[key].esSlug}` : `/examples/${key}`;
}

export default function WorkedExampleStudyPage() {
  const [location] = useLocation();
  const params = useParams<{ slug?: string }>();
  const lang: Lang = location.startsWith("/es/") ? "es" : "en";
  const key = lang === "es" ? ES_TO_KEY[params.slug ?? ""] : (params.slug as TopicKey | undefined);
  const topic = key ? TOPICS[key] : undefined;

  if (!topic || !key) {
    return <div className="min-h-screen flex flex-col bg-background"><Navbar /><main className="flex-1 container mx-auto px-4 py-20 text-center"><h1 className="text-3xl font-bold">{lang === "es" ? "Ejemplo no encontrado" : "Example not found"}</h1></main><Footer /></div>;
  }

  const page = topic[lang];
  const links = categoryLinks(topic.category, lang);
  const canonical = buildUrl(pathFor(key, lang));
  const alternate = buildUrl(pathFor(key, lang === "en" ? "es" : "en"));

  useSEO({
    title: page.title,
    description: page.intro,
    canonicalUrl: canonical,
    hreflang: [
      { lang, url: canonical },
      { lang: lang === "en" ? "es" : "en", url: alternate },
      { lang: "x-default", url: buildUrl(pathFor(key, "en")) },
    ],
    jsonLd: [
      { "@context": "https://schema.org", "@type": "Article", headline: page.h1, description: page.intro, url: canonical, inLanguage: lang, publisher: { "@type": "Organization", name: "MyEasyPass" } },
      { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: lang === "es" ? "Inicio" : "Home", item: buildUrl("/") },
        { "@type": "ListItem", position: 2, name: lang === "es" ? "Recursos gratuitos" : "Free Study Resources", item: buildUrl("/free/study-resources") },
        { "@type": "ListItem", position: 3, name: page.h1, item: canonical },
      ] },
    ],
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <section className="bg-gradient-to-b from-primary/5 to-background py-16 md:py-20">
          <div className="container mx-auto max-w-4xl px-4">
            <Badge variant="secondary">{lang === "es" ? "Ejemplo de estudio" : "Worked Study Example"}</Badge>
            <h1 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">{page.h1}</h1>
            <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{page.intro}</p>
          </div>
        </section>

        <section className="py-12 md:py-16">
          <div className="container mx-auto max-w-5xl px-4 grid gap-6 md:grid-cols-2">
            <Card><CardHeader><CardTitle>{lang === "es" ? "Paso a paso" : "Step by step"}</CardTitle></CardHeader><CardContent><ol className="space-y-3 text-muted-foreground">{page.steps.map((step, index) => <li key={step}><strong className="text-foreground">{index + 1}.</strong> {step}</li>)}</ol></CardContent></Card>
            <Card><CardHeader><CardTitle>{lang === "es" ? "Ejemplo simplificado" : "Simplified example"}</CardTitle></CardHeader><CardContent><p className="leading-relaxed text-muted-foreground">{page.example}</p></CardContent></Card>
          </div>
        </section>

        <section className="bg-muted/30 py-12 md:py-16">
          <div className="container mx-auto max-w-4xl px-4">
            <h2 className="text-2xl font-bold">{lang === "es" ? "Consejo para el examen" : "Exam-study tip"}</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">{page.tip}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild><Link href={links.practice}>{lang === "es" ? "Práctica gratis" : "Free practice"}</Link></Button>
              <Button variant="outline" asChild><Link href={links.prep}>{lang === "es" ? "Preparación completa" : "Full exam prep"}</Link></Button>
              <Button variant="outline" asChild><Link href="/free/study-resources">{lang === "es" ? "Más recursos" : "More free resources"}</Link></Button>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">{lang === "es" ? "Ejemplos educativos simplificados. No son preguntas oficiales del examen ni asesoría sobre una reclamación o transacción real." : "Simplified educational examples. These are not official exam questions or advice about a real claim or transaction."}</p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
