import { Link, useLocation, useParams } from "wouter";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSEO, buildUrl } from "@/hooks/use-seo";

const TOPICS = {
  "named-peril-vs-open-peril": {
    esSlug: "peligro-nombrado-vs-peligro-abierto",
    category: "pc",
    en: {
      title: "Named Peril vs Open Peril: Insurance Exam Guide | MyEasyPass",
      h1: "Named Peril vs Open Peril: What’s the Difference?",
      intro: "Named-peril coverage focuses on causes of loss specifically listed by the policy. Open-peril coverage generally starts from a broader coverage approach and then looks to exclusions and policy limitations.",
      leftTitle: "Named peril",
      left: ["Coverage is tied to causes of loss specifically identified in the policy.", "A study question often asks whether the stated cause of loss appears on the covered list.", "The exact policy language controls."],
      rightTitle: "Open peril",
      right: ["Coverage generally applies more broadly unless a cause of loss is excluded or limited.", "A study question often shifts attention from what is listed to what is excluded.", "Open peril does not mean every possible loss is covered."],
      tip: "Ask whether the policy is defining what is covered or instead defining what is excluded.",
    },
    es: {
      title: "Peligro Nombrado vs Peligro Abierto | MyEasyPass",
      h1: "Peligro nombrado vs peligro abierto: ¿cuál es la diferencia?",
      intro: "La cobertura de peligros nombrados se enfoca en causas de pérdida expresamente indicadas en la póliza. La cobertura de peligros abiertos normalmente comienza con un enfoque más amplio y luego considera exclusiones y limitaciones.",
      leftTitle: "Peligro nombrado",
      left: ["La cobertura depende de causas de pérdida específicamente identificadas.", "Una pregunta puede pedirte verificar si la causa aparece en la lista cubierta.", "El lenguaje exacto de la póliza controla."],
      rightTitle: "Peligro abierto",
      right: ["La cobertura suele ser más amplia, sujeta a exclusiones y limitaciones.", "La pregunta suele enfocarse en lo que está excluido.", "Peligro abierto no significa que toda pérdida esté cubierta."],
      tip: "Pregunta si la póliza está definiendo lo cubierto o identificando lo excluido.",
    },
  },
  "cancellation-vs-nonrenewal": {
    esSlug: "cancelacion-vs-no-renovacion",
    category: "pc",
    en: {
      title: "Cancellation vs Nonrenewal: Insurance Exam Guide | MyEasyPass",
      h1: "Cancellation vs Nonrenewal: What’s the Difference?",
      intro: "Cancellation ends a policy before its scheduled expiration date. Nonrenewal means the policy is allowed to reach the end of its current term and is not continued for another term.",
      leftTitle: "Cancellation",
      left: ["Ends coverage before the stated policy expiration date.", "Timing and permitted reasons can depend on the policy and applicable law.", "Exam questions often emphasize that the current term is being cut short."],
      rightTitle: "Nonrenewal",
      right: ["The current policy term reaches its scheduled end.", "The insurer or insured does not continue the policy into a new term.", "Exam questions often emphasize the difference between ending now and declining the next term."],
      tip: "If coverage stops before the policy term ends, think cancellation. If the term finishes but is not continued, think nonrenewal.",
    },
    es: {
      title: "Cancelación vs No Renovación de Seguro | MyEasyPass",
      h1: "Cancelación vs no renovación: ¿cuál es la diferencia?",
      intro: "La cancelación termina una póliza antes de su fecha programada de vencimiento. La no renovación permite que el término actual llegue a su fin, pero la póliza no continúa por otro período.",
      leftTitle: "Cancelación",
      left: ["Termina la cobertura antes del vencimiento programado.", "Las razones y plazos pueden depender de la póliza y la ley aplicable.", "La clave es que el término actual termina antes de tiempo."],
      rightTitle: "No renovación",
      right: ["El término actual llega a su final programado.", "La póliza no continúa a un nuevo término.", "La clave es distinguir terminar ahora de no continuar después."],
      tip: "Si la cobertura termina antes del final del término, piensa cancelación. Si el término finaliza normalmente y no continúa, piensa no renovación.",
    },
  },
  "policyowner-vs-insured-vs-beneficiary": {
    esSlug: "propietario-vs-asegurado-vs-beneficiario",
    category: "life",
    en: {
      title: "Policyowner vs Insured vs Beneficiary | Life Exam Guide | MyEasyPass",
      h1: "Policyowner vs Insured vs Beneficiary",
      intro: "Life insurance questions often become easier once you separate three roles: who owns the contract, whose life is insured, and who is designated to receive policy proceeds when the insured dies.",
      leftTitle: "Policyowner & insured",
      left: ["The policyowner controls contractual rights subject to the policy.", "The insured is the person whose life is covered.", "The policyowner and insured can be the same person, but they do not have to be."],
      rightTitle: "Beneficiary",
      right: ["The beneficiary is designated to receive the death benefit under the policy terms.", "A beneficiary does not automatically own the policy.", "Exam questions often test whether you can keep ownership and benefit roles separate."],
      tip: "Translate the scenario into three labels: owns it, life covered, receives proceeds.",
    },
    es: {
      title: "Propietario vs Asegurado vs Beneficiario | MyEasyPass",
      h1: "Propietario de la póliza vs asegurado vs beneficiario",
      intro: "Muchas preguntas de seguro de vida se simplifican cuando separas tres funciones: quién posee el contrato, qué vida está asegurada y quién recibe el beneficio por fallecimiento.",
      leftTitle: "Propietario y asegurado",
      left: ["El propietario controla los derechos contractuales según la póliza.", "El asegurado es la persona cuya vida está cubierta.", "El propietario y el asegurado pueden ser la misma persona, pero no tienen que serlo."],
      rightTitle: "Beneficiario",
      right: ["El beneficiario está designado para recibir el beneficio por fallecimiento.", "Ser beneficiario no significa automáticamente ser propietario de la póliza.", "Las preguntas suelen evaluar si distingues propiedad y beneficio."],
      tip: "Reduce el escenario a tres etiquetas: quién la posee, qué vida cubre y quién recibe el beneficio.",
    },
  },
  "revocable-vs-irrevocable-beneficiary": {
    esSlug: "beneficiario-revocable-vs-irrevocable",
    category: "life",
    en: {
      title: "Revocable vs Irrevocable Beneficiary | Life Exam Guide | MyEasyPass",
      h1: "Revocable vs Irrevocable Beneficiary",
      intro: "A revocable beneficiary designation can generally be changed by the policyowner according to the contract. An irrevocable beneficiary has stronger contractual rights, so changes affecting that designation generally require the beneficiary’s consent.",
      leftTitle: "Revocable",
      left: ["The policyowner generally retains the ability to change the beneficiary designation.", "Consent from the current beneficiary is generally not required for a permitted change.", "Always follow the policy and applicable law."],
      rightTitle: "Irrevocable",
      right: ["The beneficiary has stronger rights in the designation.", "Changes affecting the beneficiary generally require consent.", "Exam questions often test whether the policyowner can act unilaterally."],
      tip: "Revocable means changeable by the policyowner under the contract; irrevocable means the beneficiary’s rights restrict unilateral changes.",
    },
    es: {
      title: "Beneficiario Revocable vs Irrevocable | MyEasyPass",
      h1: "Beneficiario revocable vs irrevocable",
      intro: "Una designación revocable normalmente puede ser cambiada por el propietario conforme al contrato. Un beneficiario irrevocable posee derechos contractuales más fuertes, por lo que los cambios que afecten la designación normalmente requieren su consentimiento.",
      leftTitle: "Revocable",
      left: ["El propietario generalmente conserva la capacidad de cambiar la designación.", "Normalmente no se requiere consentimiento del beneficiario actual para un cambio permitido.", "Siempre aplican el contrato y la ley correspondiente."],
      rightTitle: "Irrevocable",
      right: ["El beneficiario tiene derechos más fuertes sobre la designación.", "Los cambios que lo afecten generalmente requieren consentimiento.", "Las preguntas suelen evaluar si el propietario puede actuar por sí solo."],
      tip: "Revocable significa que el propietario puede cambiarlo según el contrato; irrevocable limita cambios unilaterales.",
    },
  },
  "lien-vs-encumbrance": {
    esSlug: "gravamen-lien-vs-encumbrance",
    category: "realestate",
    en: {
      title: "Lien vs Encumbrance: Real Estate Exam Guide | MyEasyPass",
      h1: "Lien vs Encumbrance: What’s the Difference?",
      intro: "An encumbrance is a broad term for a claim, right, interest, or restriction that can affect real property. A lien is a type of encumbrance that generally secures payment of a debt or obligation.",
      leftTitle: "Lien",
      left: ["A lien is commonly tied to a debt or financial obligation.", "It can affect title to real property.", "Mortgages and certain tax claims are common study examples."],
      rightTitle: "Encumbrance",
      right: ["Encumbrance is the broader category.", "It can include liens as well as certain easements, restrictions, or other interests.", "Not every encumbrance is a lien."],
      tip: "Think category and subset: liens are encumbrances, but encumbrances include more than liens.",
    },
    es: {
      title: "Lien vs Encumbrance en Bienes Raíces | MyEasyPass",
      h1: "Lien vs encumbrance: ¿cuál es la diferencia?",
      intro: "Encumbrance es un término amplio para una reclamación, derecho, interés o restricción que puede afectar bienes raíces. Un lien es un tipo de encumbrance que normalmente garantiza el pago de una deuda u obligación.",
      leftTitle: "Lien",
      left: ["Normalmente está relacionado con una deuda u obligación financiera.", "Puede afectar el título de la propiedad.", "Hipotecas y ciertos impuestos son ejemplos comunes de estudio."],
      rightTitle: "Encumbrance",
      right: ["Es la categoría más amplia.", "Puede incluir liens, easements, restricciones y otros intereses.", "No todo encumbrance es un lien."],
      tip: "Piensa en categoría y subconjunto: un lien es un encumbrance, pero existen otros tipos de encumbrances.",
    },
  },
  "joint-tenancy-vs-tenancy-in-common": {
    esSlug: "joint-tenancy-vs-tenancy-in-common",
    category: "realestate",
    en: {
      title: "Joint Tenancy vs Tenancy in Common | Real Estate Exam Guide | MyEasyPass",
      h1: "Joint Tenancy vs Tenancy in Common",
      intro: "Both are forms of concurrent ownership, but they differ in how ownership interests and survivorship are structured. Licensing questions often focus on whether a deceased owner’s interest passes automatically to surviving co-owners or through the owner’s estate.",
      leftTitle: "Joint tenancy",
      left: ["Commonly associated with a right of survivorship when validly created.", "Co-owners hold concurrent interests under the form of ownership created.", "Creation requirements depend on applicable law."],
      rightTitle: "Tenancy in common",
      right: ["Co-owners can hold separate fractional interests.", "There is generally no automatic right of survivorship simply from being tenants in common.", "An owner’s interest can generally pass through their estate, subject to applicable law."],
      tip: "For exam study, the fastest clue is survivorship: identify whether the ownership form automatically redirects the deceased owner’s interest to surviving co-owners.",
    },
    es: {
      title: "Joint Tenancy vs Tenancy in Common | MyEasyPass",
      h1: "Joint tenancy vs tenancy in common",
      intro: "Ambas son formas de propiedad concurrente, pero difieren en la estructura de los intereses y la supervivencia. Las preguntas suelen enfocarse en qué ocurre con la participación de un propietario cuando fallece.",
      leftTitle: "Joint tenancy",
      left: ["Comúnmente se asocia con derecho de supervivencia cuando se crea válidamente.", "Los copropietarios mantienen intereses concurrentes según la forma creada.", "Los requisitos dependen de la ley aplicable."],
      rightTitle: "Tenancy in common",
      right: ["Los copropietarios pueden tener participaciones fraccionarias distintas.", "Normalmente no existe un derecho automático de supervivencia solo por esta forma de propiedad.", "La participación puede pasar por la sucesión del propietario, sujeto a la ley aplicable."],
      tip: "Busca primero la supervivencia: determina si la participación del propietario fallecido pasa automáticamente a los demás copropietarios.",
    },
  },
} as const;

type TopicKey = keyof typeof TOPICS;
type Lang = "en" | "es";

const EN_KEYS = Object.keys(TOPICS) as TopicKey[];
const ES_TO_KEY = Object.fromEntries(EN_KEYS.map((key) => [TOPICS[key].esSlug, key])) as Record<string, TopicKey>;

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
  return lang === "es" ? `/es/estudiar/${TOPICS[key].esSlug}` : `/study/${key}`;
}

export default function SearchIntentStudyPage() {
  const [location] = useLocation();
  const params = useParams<{ slug: string }>();
  const lang: Lang = location.startsWith("/es/") ? "es" : "en";
  const key = lang === "en" ? (params.slug as TopicKey) : ES_TO_KEY[params.slug];
  const topic = TOPICS[key];

  if (!topic) {
    return <div className="min-h-screen flex flex-col bg-background"><Navbar /><main className="flex-1 container mx-auto px-4 py-20"><h1 className="text-3xl font-bold">{lang === "es" ? "Recurso no encontrado" : "Study resource not found"}</h1></main><Footer /></div>;
  }

  const page = topic[lang];
  const canonical = buildUrl(pathFor(key, lang));
  const alternate = buildUrl(pathFor(key, lang === "en" ? "es" : "en"));
  const links = categoryLinks(topic.category, lang);

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
      { "@context": "https://schema.org", "@type": "Article", headline: page.h1, description: page.intro, url: canonical, inLanguage: lang, publisher: { "@type": "Organization", name: "MyEasyPass", url: buildUrl("/") } },
      { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: lang === "es" ? "Inicio" : "Home", item: buildUrl("/") },
        { "@type": "ListItem", position: 2, name: lang === "es" ? "Recursos de estudio" : "Free Study Resources", item: buildUrl("/free/study-resources") },
        { "@type": "ListItem", position: 3, name: page.h1, item: canonical },
      ] },
    ],
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <section className="bg-gradient-to-b from-primary/5 to-background py-16 md:py-20">
          <div className="container mx-auto max-w-5xl px-4">
            <Badge variant="secondary">{lang === "es" ? "Guía gratuita" : "Free exam study guide"}</Badge>
            <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">{page.h1}</h1>
            <p className="mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">{page.intro}</p>
          </div>
        </section>
        <section className="py-12 md:py-16">
          <div className="container mx-auto grid max-w-5xl gap-6 px-4 md:grid-cols-2">
            <Card><CardHeader><CardTitle>{page.leftTitle}</CardTitle></CardHeader><CardContent><ul className="space-y-3 text-muted-foreground">{page.left.map((item) => <li key={item}>• {item}</li>)}</ul></CardContent></Card>
            <Card><CardHeader><CardTitle>{page.rightTitle}</CardTitle></CardHeader><CardContent><ul className="space-y-3 text-muted-foreground">{page.right.map((item) => <li key={item}>• {item}</li>)}</ul></CardContent></Card>
          </div>
        </section>
        <section className="border-y bg-muted/30 py-12 md:py-14">
          <div className="container mx-auto max-w-4xl px-4">
            <h2 className="text-2xl font-bold">{lang === "es" ? "Cómo recordarlo para el examen" : "How to remember it for the exam"}</h2>
            <p className="mt-3 leading-relaxed text-muted-foreground">{page.tip}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild><Link href={links.practice}>{lang === "es" ? "Práctica gratis" : "Free practice"}</Link></Button>
              <Button variant="outline" asChild><Link href={links.prep}>{lang === "es" ? "Preparación completa" : "Full exam prep"}</Link></Button>
              <Button variant="outline" asChild><Link href="/free/study-resources">{lang === "es" ? "Más recursos" : "More free resources"}</Link></Button>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">{lang === "es" ? "Material educativo independiente. No son preguntas oficiales del examen y no se garantiza aprobar." : "Independent educational material. These are not official exam questions and passing is not guaranteed."}</p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
