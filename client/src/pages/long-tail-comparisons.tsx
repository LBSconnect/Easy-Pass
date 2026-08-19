import { Link, useLocation } from "wouter";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSEO, buildUrl } from "@/hooks/use-seo";

const PAGES = {
  "ho-2-vs-ho-3": {
    en: {
      title: "HO-2 vs HO-3: Homeowners Insurance Exam Comparison | MyEasyPass",
      h1: "HO-2 vs HO-3: What’s the Difference?",
      summary: "HO-2 and HO-3 are homeowners policy forms that differ mainly in how covered causes of loss are approached for the dwelling and personal property. For exam study, focus on the coverage method rather than memorizing isolated labels.",
      left: ["Generally associated with named-peril coverage", "Coverage depends on causes of loss specifically listed by the policy", "Exam questions often test whether a loss falls within a listed peril"],
      right: ["Generally associated with broader open-peril treatment for the dwelling, subject to exclusions", "Personal property is commonly handled differently from the dwelling", "Exam questions often test the difference between open-peril and named-peril treatment"],
      tip: "When comparing HO forms, ask two questions: what property is being discussed, and is the cause-of-loss approach named peril or open peril?",
      practice: "/free/texas-property-casualty-practice-test",
      prep: "/texas-property-casualty-exam-prep",
    },
    es: {
      title: "HO-2 vs HO-3: Comparación para el Examen de Seguros | MyEasyPass",
      h1: "HO-2 vs HO-3: ¿Cuál es la diferencia?",
      summary: "HO-2 y HO-3 son formularios de póliza para propietarios de vivienda que se estudian por la forma en que tratan las causas de pérdida para la vivienda y los bienes personales. Para el examen, enfócate en el método de cobertura.",
      left: ["Generalmente se asocia con cobertura de peligros nombrados", "La cobertura depende de causas de pérdida expresamente incluidas", "Las preguntas suelen pedir identificar si el peligro está incluido"],
      right: ["Generalmente se asocia con un enfoque más amplio de peligros abiertos para la vivienda, sujeto a exclusiones", "Los bienes personales pueden tratarse de manera distinta a la vivienda", "Las preguntas suelen comparar peligros abiertos con peligros nombrados"],
      tip: "Al comparar formularios HO, identifica primero qué propiedad está en cuestión y luego si la causa de pérdida se analiza como peligro nombrado o abierto.",
      practice: "/es/free/prueba-practica-propiedad-accidentes-texas",
      prep: "/es/preparacion-examen-seguros-propiedad-accidentes-texas",
    },
  },
  "peril-vs-hazard": {
    en: {
      title: "Peril vs Hazard: Insurance Exam Difference Explained | MyEasyPass",
      h1: "Peril vs Hazard: What’s the Difference?",
      summary: "A peril is a cause of loss, while a hazard is a condition that can increase the chance or severity of loss. This distinction appears repeatedly in insurance study questions.",
      left: ["A peril is the event or cause of loss", "Examples can include fire, wind, or theft depending on context", "Ask: what actually caused the damage?"],
      right: ["A hazard increases the likelihood or severity of loss", "Hazards may be physical, moral, or morale-related depending on the study context", "Ask: what condition made the loss more likely or worse?"],
      tip: "If the question describes the event that produced the damage, think peril. If it describes a condition that raises risk, think hazard.",
      practice: "/free/texas-property-casualty-practice-test",
      prep: "/texas-property-casualty-exam-prep",
    },
    es: {
      title: "Peligro vs Condición de Riesgo en Seguros | MyEasyPass",
      h1: "Peligro vs condición de riesgo: ¿cuál es la diferencia?",
      summary: "En el estudio de seguros, el peril es la causa directa de una pérdida, mientras que un hazard es una condición que puede aumentar la probabilidad o severidad de esa pérdida.",
      left: ["El peril es el evento o causa de la pérdida", "Puede incluir incendio, viento o robo según el contexto", "Pregunta clave: ¿qué causó el daño?"],
      right: ["El hazard es una condición que aumenta la probabilidad o gravedad de la pérdida", "Puede clasificarse de distintas formas según el contexto de estudio", "Pregunta clave: ¿qué condición hizo más probable o grave la pérdida?"],
      tip: "Si el escenario describe el evento que produjo el daño, piensa en peril. Si describe una condición que aumenta el riesgo, piensa en hazard.",
      practice: "/es/free/prueba-practica-propiedad-accidentes-texas",
      prep: "/es/preparacion-examen-seguros-propiedad-accidentes-texas",
    },
  },
  "vacancy-vs-unoccupancy": {
    en: {
      title: "Vacancy vs Unoccupancy: Insurance Exam Comparison | MyEasyPass",
      h1: "Vacancy vs Unoccupancy: What’s the Difference?",
      summary: "Vacancy and unoccupancy both describe a property not being used normally, but they are not identical. Exam questions often test whether contents and normal signs of occupancy remain.",
      left: ["Vacancy generally suggests the property lacks occupants and much of the property needed for normal use", "The building may be substantially empty", "Policy consequences depend on the actual contract and circumstances"],
      right: ["Unoccupancy generally means people are temporarily absent while the property remains furnished or ready for normal use", "Normal contents may still be present", "Duration and policy wording still matter"],
      tip: "Do not treat vacancy and unoccupancy as synonyms. Look for whether the property is furnished and ready for normal use.",
      practice: "/free/texas-property-casualty-practice-test",
      prep: "/texas-property-casualty-exam-prep",
    },
    es: {
      title: "Vacancia vs Desocupación en Seguros | MyEasyPass",
      h1: "Vacancia vs desocupación: ¿cuál es la diferencia?",
      summary: "Vacancia y desocupación describen situaciones distintas. Para el examen, suele importar si la propiedad conserva mobiliario, contenido y condiciones normales de uso aunque las personas estén ausentes.",
      left: ["La vacancia suele implicar ausencia de ocupantes y de gran parte de los elementos necesarios para uso normal", "El inmueble puede estar sustancialmente vacío", "Las consecuencias dependen del contrato y de las circunstancias"],
      right: ["La desocupación suele implicar una ausencia temporal de personas mientras la propiedad permanece lista para uso normal", "El mobiliario y contenido pueden seguir presentes", "La duración y el lenguaje de la póliza siguen siendo importantes"],
      tip: "No trates vacancia y desocupación como sinónimos. Busca si la propiedad sigue amueblada y preparada para uso normal.",
      practice: "/es/free/prueba-practica-propiedad-accidentes-texas",
      prep: "/es/preparacion-examen-seguros-propiedad-accidentes-texas",
    },
  },
  "term-vs-whole-life": {
    en: {
      title: "Term vs Whole Life Insurance: Exam Comparison | MyEasyPass",
      h1: "Term vs Whole Life Insurance: What’s the Difference?",
      summary: "Term life is designed around coverage for a specified period, while whole life is a form of permanent life insurance that is generally structured to remain in force for life when required premiums and policy conditions are met.",
      left: ["Coverage is designed for a specified term", "Typically emphasizes death-benefit protection rather than cash-value accumulation", "Premium and renewal structure depend on the contract"],
      right: ["A form of permanent life insurance", "Typically includes cash-value features", "Premium and policy guarantees depend on the contract"],
      tip: "For exam questions, first identify whether the policy is temporary or permanent, then look for cash-value features and premium structure.",
      practice: "/free/texas-life-insurance-practice-test",
      prep: "/texas-life-insurance-exam-prep",
    },
    es: {
      title: "Seguro a Término vs Vida Entera | MyEasyPass",
      h1: "Seguro a término vs vida entera: ¿cuál es la diferencia?",
      summary: "El seguro de vida a término está diseñado para brindar cobertura durante un período específico, mientras que vida entera es una forma de seguro permanente que generalmente incluye características de valor en efectivo.",
      left: ["Cobertura diseñada para un período específico", "Normalmente se enfoca en la protección por fallecimiento", "La estructura de prima y renovación depende del contrato"],
      right: ["Forma de seguro de vida permanente", "Normalmente incluye características de valor en efectivo", "Las garantías y primas dependen del contrato"],
      tip: "Primero identifica si la póliza es temporal o permanente; después busca valor en efectivo y cómo se estructura la prima.",
      practice: "/es/free/prueba-practica-seguro-vida-texas",
      prep: "/es/preparacion-examen-seguros-vida-texas",
    },
  },
} as const;

type ComparisonSlug = keyof typeof PAGES;
type Lang = "en" | "es";

const SLUGS = Object.keys(PAGES) as ComparisonSlug[];

function pagePath(slug: ComparisonSlug, lang: Lang) {
  return lang === "es" ? `/es/comparacion-${slug}-texas` : `/texas-insurance-exam/${slug}`;
}

export default function LongTailComparisonPage() {
  const [location] = useLocation();
  const isSpanish = location.startsWith("/es/");
  const lang: Lang = isSpanish ? "es" : "en";
  const slug = SLUGS.find((candidate) => location === pagePath(candidate, lang));

  if (!slug) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-bold">{isSpanish ? "Comparación no encontrada" : "Comparison not found"}</h1>
        </main>
        <Footer />
      </div>
    );
  }

  const page = PAGES[slug][lang];
  const canonical = buildUrl(pagePath(slug, lang));
  const alternate = buildUrl(pagePath(slug, lang === "en" ? "es" : "en"));

  useSEO({
    title: page.title,
    description: page.summary,
    canonicalUrl: canonical,
    hreflang: [
      { lang, url: canonical },
      { lang: lang === "en" ? "es" : "en", url: alternate },
      { lang: "x-default", url: buildUrl(pagePath(slug, "en")) },
    ],
    jsonLd: [
      { "@context": "https://schema.org", "@type": "Article", headline: page.h1, description: page.summary, url: canonical, inLanguage: lang, publisher: { "@type": "Organization", name: "MyEasyPass" } },
      { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: isSpanish ? "Inicio" : "Home", item: buildUrl("/") },
        { "@type": "ListItem", position: 2, name: isSpanish ? "Conceptos de estudio" : "Study concepts", item: buildUrl(isSpanish ? "/es/conceptos-seguros-texas" : "/texas-insurance-exam/concepts") },
        { "@type": "ListItem", position: 3, name: page.h1, item: canonical },
      ] },
    ],
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <section className="py-16 md:py-20 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4 max-w-5xl">
            <p className="text-sm font-semibold text-primary mb-3">{isSpanish ? "Comparación para estudiar" : "Exam study comparison"}</p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">{page.h1}</h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-3xl">{page.summary}</p>
          </div>
        </section>

        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4 max-w-5xl grid gap-6 md:grid-cols-2">
            <Card><CardHeader><CardTitle>{page.h1.split(":")[0].split(" vs ")[0]}</CardTitle></CardHeader><CardContent><ul className="space-y-3 text-muted-foreground">{page.left.map((item) => <li key={item}>• {item}</li>)}</ul></CardContent></Card>
            <Card><CardHeader><CardTitle>{page.h1.split(":")[0].split(" vs ")[1] ?? (isSpanish ? "Comparación" : "Comparison")}</CardTitle></CardHeader><CardContent><ul className="space-y-3 text-muted-foreground">{page.right.map((item) => <li key={item}>• {item}</li>)}</ul></CardContent></Card>
          </div>
        </section>

        <section className="py-12 md:py-16 bg-muted/30">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-2xl font-bold">{isSpanish ? "Consejo para el examen" : "Exam-study tip"}</h2>
            <p className="mt-3 text-muted-foreground leading-relaxed">{page.tip}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild><Link href={page.practice}>{isSpanish ? "Práctica gratis" : "Free practice"}</Link></Button>
              <Button variant="outline" asChild><Link href={page.prep}>{isSpanish ? "Preparación completa" : "Full exam prep"}</Link></Button>
              <Button variant="outline" asChild><Link href={isSpanish ? "/es/conceptos-seguros-texas" : "/texas-insurance-exam/concepts"}>{isSpanish ? "Más conceptos" : "More concepts"}</Link></Button>
            </div>
            <p className="mt-6 text-sm text-muted-foreground">{isSpanish ? "Material educativo independiente. No son preguntas oficiales del examen y no se garantiza aprobar." : "Independent educational material. These are not official exam questions and passing is not guaranteed."}</p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
