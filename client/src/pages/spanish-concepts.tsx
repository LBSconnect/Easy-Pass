import { Link, useParams } from "wouter";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSEO, buildUrl } from "@/hooks/use-seo";

const CONCEPTS = {
  deducible: {
    title: "Deducible en Seguros: Qué Es y Cómo Funciona | MyEasyPass",
    h1: "¿Qué es un deducible en seguros?",
    summary: "El deducible es la cantidad que, según los términos de una póliza, normalmente corresponde al asegurado antes de que la aseguradora pague la parte cubierta de una pérdida.",
    example: "Si una pérdida cubierta es de $5,000 y el deducible aplicable es de $1,000, el ejemplo simplificado deja $4,000 para considerar bajo la cobertura, sujeto a los demás términos y límites de la póliza.",
    examTip: "En preguntas de práctica, distingue entre el monto total de la pérdida, el deducible y el límite de cobertura.",
    english: "/texas-insurance-exam/deductible",
    practice: "/es/free/prueba-practica-propiedad-accidentes-texas",
    prep: "/es/preparacion-examen-seguros-propiedad-accidentes-texas",
    hub: "/es/conceptos-seguros-texas",
  },
  indemnizacion: {
    title: "Indemnización en Seguros: Concepto para el Examen | MyEasyPass",
    h1: "¿Qué significa indemnización en seguros?",
    summary: "La indemnización es el principio de compensar una pérdida cubierta de acuerdo con la póliza, sin convertir el siniestro en una fuente de ganancia para el asegurado.",
    example: "En un ejemplo simple, una póliza busca restaurar económicamente al asegurado según la pérdida cubierta y sus términos, no pagar más que la pérdida solo porque existe seguro.",
    examTip: "Relaciona indemnización con la idea de compensación por pérdida y evita confundirla con enriquecimiento.",
    english: "/texas-insurance-exam/indemnity",
    practice: "/es/free/prueba-practica-propiedad-accidentes-texas",
    prep: "/es/preparacion-examen-seguros-propiedad-accidentes-texas",
    hub: "/es/conceptos-seguros-texas",
  },
  subrogacion: {
    title: "Subrogación en Seguros: Explicación para el Examen | MyEasyPass",
    h1: "¿Qué es la subrogación en seguros?",
    summary: "La subrogación permite que una aseguradora, después de pagar una pérdida cubierta, pueda ejercer ciertos derechos de recuperación que correspondían al asegurado frente a un tercero responsable.",
    example: "Si una aseguradora paga una pérdida causada por un tercero, puede buscar recuperar del tercero lo pagado, según las circunstancias y los términos aplicables.",
    examTip: "Piensa en subrogación como recuperación frente a un tercero después del pago de una pérdida cubierta.",
    english: "/texas-insurance-exam/subrogation",
    practice: "/es/free/prueba-practica-propiedad-accidentes-texas",
    prep: "/es/preparacion-examen-seguros-propiedad-accidentes-texas",
    hub: "/es/conceptos-seguros-texas",
  },
  prima: {
    title: "Prima de Seguro: Qué Es y Por Qué Importa | MyEasyPass",
    h1: "¿Qué es una prima de seguro?",
    summary: "La prima es el precio que se cobra por la cobertura de seguro, normalmente según el período y las condiciones establecidas en la póliza.",
    example: "Una póliza puede cobrar su prima mensual, trimestral o anual. La frecuencia de pago no cambia el concepto básico: la prima es el costo de la cobertura.",
    examTip: "No confundas prima con beneficio, valor en efectivo, deducible o límite de póliza.",
    english: "/texas-life-health-exam/premium",
    practice: "/es/free/prueba-practica-seguro-vida-texas",
    prep: "/es/preparacion-examen-seguros-vida-texas",
    hub: "/es/conceptos-seguros-texas",
  },
  beneficiario: {
    title: "Beneficiario en Seguro de Vida: Concepto Clave | MyEasyPass",
    h1: "¿Qué es un beneficiario en un seguro de vida?",
    summary: "El beneficiario es la persona o entidad designada para recibir el beneficio por fallecimiento conforme a los términos de una póliza de seguro de vida.",
    example: "El propietario de una póliza puede designar uno o más beneficiarios, sujeto a las reglas y términos aplicables del contrato.",
    examTip: "Distingue entre propietario de la póliza, asegurado, pagador de la prima y beneficiario.",
    english: "/texas-life-health-exam/beneficiary",
    practice: "/es/free/prueba-practica-seguro-vida-texas",
    prep: "/es/preparacion-examen-seguros-vida-texas",
    hub: "/es/conceptos-seguros-texas",
  },
  "periodo-de-gracia": {
    title: "Período de Gracia en Seguros: Explicación | MyEasyPass",
    h1: "¿Qué es un período de gracia en seguros?",
    summary: "Un período de gracia es un tiempo adicional permitido para realizar un pago de prima después de su fecha de vencimiento, de acuerdo con el contrato y las reglas aplicables.",
    example: "Si una prima vence y la póliza contempla un período de gracia, el contrato puede permanecer vigente durante ese intervalo sujeto a sus condiciones.",
    examTip: "No memorices una duración universal: concéntrate en el concepto y revisa las reglas específicas de la licencia que estás estudiando.",
    english: "/texas-life-health-exam/grace-period",
    practice: "/es/free/prueba-practica-seguro-vida-texas",
    prep: "/es/preparacion-examen-seguros-vida-texas",
    hub: "/es/conceptos-seguros-texas",
  },
  agencia: {
    title: "Agencia en Bienes Raíces: Concepto para el Examen | MyEasyPass",
    h1: "¿Qué significa agencia en bienes raíces?",
    summary: "En bienes raíces, la agencia describe una relación en la que un agente representa a otra parte y asume deberes derivados de esa relación conforme a la ley y al acuerdo aplicable.",
    example: "Una relación de agencia puede implicar representación de un cliente en una transacción, con obligaciones que dependen de la función y de las reglas aplicables.",
    examTip: "Distingue entre cliente, consumidor, agente, broker y la parte representada en cada escenario.",
    english: "/texas-real-estate-exam/agency",
    practice: "/es/free/prueba-practica-bienes-raices-texas",
    prep: "/es/preparacion-examen-bienes-raices-texas",
    hub: "/es/conceptos-bienes-raices-texas",
  },
  "escritura-vs-titulo": {
    title: "Escritura vs. Título en Bienes Raíces | MyEasyPass",
    h1: "Escritura vs. título: ¿cuál es la diferencia?",
    summary: "El título se refiere al concepto de derechos de propiedad, mientras que una escritura es un documento utilizado para transferir ciertos intereses en bienes raíces.",
    example: "Una persona puede recibir una escritura como parte de una transferencia; el título describe la condición o derecho de propiedad que resulta de la relación jurídica.",
    examTip: "Una pregunta clásica compara el documento de transferencia con el concepto jurídico de propiedad: escritura no es sinónimo de título.",
    english: "/texas-real-estate-exam/deed-vs-title",
    practice: "/es/free/prueba-practica-bienes-raices-texas",
    prep: "/es/preparacion-examen-bienes-raices-texas",
    hub: "/es/conceptos-bienes-raices-texas",
  },
} as const;

type ConceptSlug = keyof typeof CONCEPTS;
const INSURANCE_CONCEPTS: ConceptSlug[] = ["deducible", "indemnizacion", "subrogacion", "prima", "beneficiario", "periodo-de-gracia"];
const REAL_ESTATE_CONCEPTS: ConceptSlug[] = ["agencia", "escritura-vs-titulo"];

function conceptPath(slug: ConceptSlug) {
  return `/es/concepto-${slug}-texas`;
}

function ConceptCard({ slug }: { slug: ConceptSlug }) {
  const concept = CONCEPTS[slug];
  return (
    <Card>
      <CardHeader><CardTitle className="text-lg">{concept.h1}</CardTitle></CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground mb-4">{concept.summary}</p>
        <Link href={conceptPath(slug)} className="text-primary font-medium hover:underline">Estudiar este concepto →</Link>
      </CardContent>
    </Card>
  );
}

export function SpanishConceptHub({ kind }: { kind: "seguros" | "bienes-raices" }) {
  const slugs = kind === "seguros" ? INSURANCE_CONCEPTS : REAL_ESTATE_CONCEPTS;
  const h1 = kind === "seguros" ? "Conceptos de Seguros para el Examen de Texas" : "Conceptos de Bienes Raíces para el Examen de Texas";
  const path = kind === "seguros" ? "/es/conceptos-seguros-texas" : "/es/conceptos-bienes-raices-texas";
  const canonical = buildUrl(path);
  useSEO({
    title: `${h1} | MyEasyPass`,
    description: "Estudia conceptos clave en español con explicaciones simples, ejemplos y enlaces a práctica gratuita de MyEasyPass.",
    canonicalUrl: canonical,
    hreflang: [{ lang: "es", url: canonical }, { lang: "x-default", url: canonical }],
    jsonLd: [{ "@context": "https://schema.org", "@type": "CollectionPage", name: h1, url: canonical, inLanguage: "es" }],
  });
  return (
    <div className="min-h-screen flex flex-col bg-background"><Navbar /><main className="flex-1">
      <section className="py-16 md:py-20 bg-gradient-to-b from-primary/5 to-background"><div className="container mx-auto px-4 max-w-5xl"><h1 className="text-3xl sm:text-4xl md:text-5xl font-bold">{h1}</h1><p className="mt-5 text-lg text-muted-foreground max-w-3xl">Explicaciones de estudio en español diseñadas para ayudarte a reconocer conceptos frecuentes sin usar preguntas oficiales del examen.</p></div></section>
      <section className="py-12 md:py-16"><div className="container mx-auto px-4 max-w-5xl grid gap-5 md:grid-cols-2">{slugs.map((slug) => <ConceptCard key={slug} slug={slug} />)}</div></section>
    </main><Footer /></div>
  );
}

export function SpanishConceptPage({ conceptSlug }: { conceptSlug?: ConceptSlug }) {
  const params = useParams<{ spanishExamSlug?: string }>();
  const inferred = params.spanishExamSlug?.replace(/^concepto-/, "").replace(/-texas$/, "") as ConceptSlug | undefined;
  const slug = conceptSlug ?? inferred;
  const concept = slug ? CONCEPTS[slug] : undefined;
  if (!concept || !slug) return <div className="min-h-screen flex flex-col bg-background"><Navbar /><main className="flex-1 container mx-auto px-4 py-20"><h1 className="text-3xl font-bold">Concepto no encontrado</h1></main><Footer /></div>;

  const canonical = buildUrl(conceptPath(slug));
  useSEO({
    title: concept.title,
    description: concept.summary,
    canonicalUrl: canonical,
    hreflang: [{ lang: "es", url: canonical }, { lang: "en", url: buildUrl(concept.english) }, { lang: "x-default", url: buildUrl(concept.english) }],
    jsonLd: [
      { "@context": "https://schema.org", "@type": "Article", headline: concept.h1, description: concept.summary, url: canonical, inLanguage: "es", publisher: { "@type": "Organization", name: "MyEasyPass" } },
      { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: buildUrl("/") },
        { "@type": "ListItem", position: 2, name: "Conceptos", item: buildUrl(concept.hub) },
        { "@type": "ListItem", position: 3, name: concept.h1, item: canonical },
      ] },
    ],
  });

  return (
    <div className="min-h-screen flex flex-col bg-background"><Navbar /><main className="flex-1">
      <section className="py-16 md:py-20 bg-gradient-to-b from-primary/5 to-background"><div className="container mx-auto px-4 max-w-4xl"><h1 className="text-3xl sm:text-4xl md:text-5xl font-bold">{concept.h1}</h1><p className="mt-5 text-lg text-muted-foreground">{concept.summary}</p></div></section>
      <section className="py-12 md:py-16"><div className="container mx-auto px-4 max-w-4xl grid gap-6 md:grid-cols-2">
        <Card><CardHeader><CardTitle>Ejemplo simplificado</CardTitle></CardHeader><CardContent className="text-muted-foreground leading-relaxed">{concept.example}</CardContent></Card>
        <Card><CardHeader><CardTitle>Consejo para estudiar</CardTitle></CardHeader><CardContent className="text-muted-foreground leading-relaxed">{concept.examTip}</CardContent></Card>
      </div></section>
      <section className="py-12 md:py-16 bg-muted/30"><div className="container mx-auto px-4 max-w-4xl"><h2 className="text-2xl font-bold">Pon el concepto en práctica</h2><p className="mt-3 text-muted-foreground">Usa preguntas originales de práctica para comprobar si reconoces el concepto dentro de un escenario.</p><div className="mt-6 flex flex-wrap gap-3"><Button asChild><Link href={concept.practice}>Práctica gratis</Link></Button><Button variant="outline" asChild><Link href={concept.prep}>Ver preparación completa</Link></Button><Button variant="outline" asChild><Link href={concept.hub}>Más conceptos</Link></Button></div><p className="mt-6 text-sm text-muted-foreground">Material educativo independiente. No son preguntas oficiales del examen y no se garantiza aprobar.</p></div></section>
    </main><Footer /></div>
  );
}
