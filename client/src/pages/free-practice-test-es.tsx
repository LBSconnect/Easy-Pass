import { Link, useParams } from "wouter";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ChevronRight, ClipboardCheck, BookOpen } from "lucide-react";
import { useSEO, buildUrl } from "@/hooks/use-seo";
import { trackEvent } from "@/lib/analytics";
import type { ExamCategory } from "@shared/schema";

type SpanishFreePracticePage = {
  slug: string;
  englishSlug: string;
  category: ExamCategory;
  shortName: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  topics: string[];
  faq: Array<{ question: string; answer: string }>;
  paidHref: string;
};

const PAGES: Record<string, SpanishFreePracticePage> = {
  "prueba-practica-bienes-raices-texas": {
    slug: "prueba-practica-bienes-raices-texas",
    englishSlug: "texas-real-estate-practice-test",
    category: "real_estate",
    shortName: "Bienes Raíces de Texas",
    title: "Prueba Gratis de Bienes Raíces de Texas | MyEasyPass",
    description: "Prueba gratis preguntas de práctica para el examen de bienes raíces de Texas. Recibe retroalimentación y continúa con la preparación completa de MyEasyPass si te resulta útil.",
    h1: "Prueba Gratis para el Examen de Bienes Raíces de Texas",
    intro: "Empieza a practicar para tu examen de licencia de bienes raíces de Texas antes de pagar. Prueba la experiencia de MyEasyPass, identifica temas débiles y decide después si quieres continuar con la preparación completa.",
    topics: ["Contratos y transacciones", "Propiedad y uso de terrenos", "Relaciones de agencia", "Financiamiento, valoración y matemáticas", "Conceptos de leyes inmobiliarias de Texas"],
    faq: [
      { question: "¿Es este el examen oficial de TREC?", answer: "No. MyEasyPass ofrece material independiente de preparación y no está afiliado ni respaldado por la Comisión de Bienes Raíces de Texas." },
      { question: "¿Puedo comenzar sin pagar?", answer: "Sí. Puedes entrar a la experiencia de práctica para probar el sistema antes de decidir si quieres una suscripción." },
      { question: "¿Puedo estudiar en español?", answer: "Sí. MyEasyPass ofrece contenido de estudio en inglés y español dentro de su experiencia de preparación." },
    ],
    paidHref: "/es/preparacion-examen-bienes-raices-texas",
  },
  "prueba-practica-propiedad-accidentes-texas": {
    slug: "prueba-practica-propiedad-accidentes-texas",
    englishSlug: "texas-property-casualty-practice-test",
    category: "property_casualty",
    shortName: "Propiedad y Accidentes de Texas",
    title: "Prueba Gratis Propiedad y Accidentes Texas | MyEasyPass",
    description: "Practica gratis conceptos para el examen de Propiedad y Accidentes de Texas con retroalimentación y preparación bilingüe de MyEasyPass.",
    h1: "Prueba Gratis de Propiedad y Accidentes de Texas",
    intro: "Prueba preguntas de preparación para Propiedad y Accidentes de Texas antes de suscribirte. Usa los resultados para identificar qué conceptos necesitas reforzar.",
    topics: ["Fundamentos de seguro de propiedad", "Responsabilidad civil y accidentes", "Conceptos de seguro de automóvil", "Condiciones, exclusiones y disposiciones", "Reclamaciones, riesgo y conceptos de seguros de Texas"],
    faq: [
      { question: "¿Está afiliado con el Departamento de Seguros de Texas?", answer: "No. MyEasyPass es material de práctica independiente y no está afiliado ni respaldado por el Departamento de Seguros de Texas." },
      { question: "¿Puedo probar preguntas antes de suscribirme?", answer: "Sí. La experiencia de práctica te permite conocer el producto antes de decidir si quieres continuar." },
      { question: "¿Las preguntas son oficiales?", answer: "No. Las preguntas son material original de preparación y no son preguntas oficiales del examen estatal." },
    ],
    paidHref: "/es/preparacion-examen-seguros-propiedad-accidentes-texas",
  },
  "prueba-practica-seguro-vida-texas": {
    slug: "prueba-practica-seguro-vida-texas",
    englishSlug: "texas-life-insurance-practice-test",
    category: "life_insurance",
    shortName: "Seguro de Vida de Texas",
    title: "Prueba Gratis Seguro de Vida Texas | MyEasyPass",
    description: "Prueba gratis preguntas para el examen de Seguro de Vida de Texas y descubre qué temas necesitas estudiar antes del examen de licencia.",
    h1: "Prueba Gratis para el Examen de Seguro de Vida de Texas",
    intro: "Empieza tu preparación para el examen de Seguro de Vida de Texas con una experiencia real de práctica de MyEasyPass. Prueba primero y continúa solo si el sistema te ayuda.",
    topics: ["Fundamentos de pólizas de vida", "Disposiciones, cláusulas y opciones", "Anualidades y conceptos de retiro", "Beneficiarios, propiedad e interés asegurable", "Reglas y conceptos de licencias de Texas"],
    faq: [
      { question: "¿Es este el examen real de licencia?", answer: "No. Es material independiente de preparación y no es el examen oficial del estado." },
      { question: "¿Puedo comenzar gratis?", answer: "Sí. Puedes usar la experiencia de práctica antes de decidir si quieres acceso más amplio." },
      { question: "¿Funciona en teléfono?", answer: "MyEasyPass funciona en el navegador y está diseñado para teléfonos, tabletas y computadoras." },
    ],
    paidHref: "/es/preparacion-examen-seguros-vida-texas",
  },
  "prueba-practica-lineas-generales-texas": {
    slug: "prueba-practica-lineas-generales-texas",
    englishSlug: "texas-general-lines-practice-test",
    category: "general_lines",
    shortName: "Líneas Generales de Texas",
    title: "Prueba Gratis Líneas Generales Texas | MyEasyPass",
    description: "Practica gratis conceptos para el examen de Líneas Generales de Texas con preguntas originales, retroalimentación y preparación bilingüe.",
    h1: "Prueba Gratis para el Examen de Líneas Generales de Texas",
    intro: "Usa la práctica gratuita de MyEasyPass para comenzar tu preparación de Líneas Generales de Texas. Conoce el sistema primero y decide después si quieres desbloquear la experiencia completa.",
    topics: ["Fundamentos de vida y salud", "Disposiciones y contratos", "Anualidades y coberturas relacionadas", "Ética y responsabilidades del productor", "Conceptos de licencias de seguros de Texas"],
    faq: [
      { question: "¿Para qué examen de Líneas Generales sirve?", answer: "Está dirigido a candidatos que estudian contenido de Líneas Generales de Vida, Accidentes, Salud y HMO de Texas disponible en MyEasyPass." },
      { question: "¿Es material oficial del estado?", answer: "No. MyEasyPass es preparación independiente y no está afiliado ni respaldado por el Departamento de Seguros de Texas." },
      { question: "¿Qué hago después de la práctica gratis?", answer: "Puedes revisar la página completa de preparación, crear una cuenta y decidir si quieres continuar con una suscripción." },
    ],
    paidHref: "/es/preparacion-examen-seguros-lineas-generales-texas",
  },
};

export const ENGLISH_TO_SPANISH_FREE_PRACTICE: Record<string, string> = Object.fromEntries(
  Object.values(PAGES).map((page) => [page.englishSlug, page.slug]),
);

export default function FreePracticeTestEsPage() {
  const { slug } = useParams<{ slug: string }>();
  const page = PAGES[slug ?? ""];
  const { i18n } = useTranslation();

  useEffect(() => {
    if (i18n.language !== "es") i18n.changeLanguage("es");
  }, [i18n]);

  if (!page) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-bold">Prueba de práctica no encontrada</h1>
          <p className="mt-3 text-muted-foreground">Elige una de las categorías disponibles.</p>
          <Button asChild className="mt-6"><Link href="/exams">Ver exámenes de práctica</Link></Button>
        </main>
        <Footer />
      </div>
    );
  }

  const canonicalUrl = buildUrl(`/es/free/${page.slug}`);
  const englishUrl = buildUrl(`/free/${page.englishSlug}`);
  const practiceHref = `/exams/${page.category}`;
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Inicio", item: buildUrl("/") },
      { "@type": "ListItem", position: 2, name: "Pruebas Gratis", item: canonicalUrl },
      { "@type": "ListItem", position: 3, name: page.shortName, item: canonicalUrl },
    ],
  };

  useSEO({
    title: page.title,
    description: page.description,
    canonicalUrl,
    ogLocale: "es_US",
    hreflang: [
      { lang: "es", url: canonicalUrl },
      { lang: "en", url: englishUrl },
      { lang: "x-default", url: englishUrl },
    ],
    jsonLd: [breadcrumbSchema, faqSchema],
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <div className="border-b bg-muted/30">
          <div className="container mx-auto px-4 py-3">
            <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground">Inicio</Link><ChevronRight className="h-3.5 w-3.5" /><span>Pruebas Gratis</span><ChevronRight className="h-3.5 w-3.5" /><span className="text-foreground">{page.shortName}</span>
            </nav>
          </div>
        </div>

        <section className="bg-gradient-to-b from-primary/5 to-background py-16 md:py-20">
          <div className="container mx-auto grid gap-10 px-4 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
            <div>
              <Badge variant="secondary">Práctica Gratis</Badge>
              <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">{page.h1}</h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">{page.intro}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button size="lg" asChild><Link href={practiceHref} onClick={() => trackEvent("free_practice_cta_click", { exam_type: page.category, source: `es-${page.slug}` })}><ClipboardCheck className="mr-2 h-5 w-5" />Comenzar Práctica Gratis</Link></Button>
                <Button size="lg" variant="outline" asChild><Link href={page.paidHref}><BookOpen className="mr-2 h-5 w-5" />Ver Preparación Completa</Link></Button>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">Sin promesas de aprobar y sin preguntas “oficiales” falsas. Solo una forma real de probar MyEasyPass.</p>
            </div>
            <Card><CardContent className="p-6"><p className="text-sm font-semibold uppercase tracking-wide text-primary">Qué puedes practicar</p><ul className="mt-5 space-y-3">{page.topics.map((topic) => <li key={topic} className="flex items-start gap-2.5"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><span>{topic}</span></li>)}</ul></CardContent></Card>
          </div>
        </section>

        <section className="py-14 md:py-16"><div className="container mx-auto max-w-4xl px-4"><h2 className="text-3xl font-bold">Cómo usar esta prueba gratuita</h2><div className="mt-8 grid gap-5 md:grid-cols-3">{[["1","Empieza a practicar","Abre la experiencia de práctica de MyEasyPass para esta categoría."],["2","Encuentra temas débiles","Observa los conceptos que dudas o respondes incorrectamente."],["3","Continúa si te ayuda","Pasa a la preparación completa solo si la práctica te está ayudando."]].map(([n,h,c]) => <Card key={n}><CardContent className="p-5"><div className="text-2xl font-bold text-primary">{n}</div><h3 className="mt-2 font-semibold">{h}</h3><p className="mt-2 text-sm leading-relaxed text-muted-foreground">{c}</p></CardContent></Card>)}</div></div></section>

        <section className="bg-muted/30 py-14 md:py-16"><div className="container mx-auto max-w-4xl px-4"><h2 className="text-3xl font-bold">Preguntas frecuentes</h2><div className="mt-8 space-y-6">{page.faq.map((item) => <div key={item.question}><h3 className="text-lg font-semibold">{item.question}</h3><p className="mt-2 leading-relaxed text-muted-foreground">{item.answer}</p></div>)}</div></div></section>

        <section className="py-14 text-center md:py-16"><div className="container mx-auto max-w-3xl px-4"><h2 className="text-3xl font-bold">¿Listo para ver dónde estás?</h2><p className="mt-3 text-muted-foreground">Empieza con práctica. Suscríbete solo si MyEasyPass se gana tu confianza.</p><div className="mt-6 flex flex-wrap justify-center gap-3"><Button size="lg" asChild><Link href={practiceHref} onClick={() => trackEvent("free_practice_cta_click", { exam_type: page.category, source: `es-${page.slug}-bottom` })}>Comenzar Práctica Gratis</Link></Button><Button size="lg" variant="outline" asChild><Link href="/readiness-check">Prueba de Preparación</Link></Button></div></div></section>
      </main>
      <Footer />
    </div>
  );
}
