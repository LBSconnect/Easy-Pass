import { Link } from "wouter";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSEO, buildUrl } from "@/hooks/use-seo";

const PAGES = {
  "propiedad-accidentes": {
    title: "Preparación Examen Propiedad y Accidentes Texas | MyEasyPass",
    description: "Prepárate para el examen de Seguro de Propiedad y Accidentes de Texas con práctica bilingüe, exámenes cronometrados y retroalimentación por tema.",
    h1: "Preparación para el Examen de Propiedad y Accidentes de Texas",
    intro: "Practica para tu examen de licencia de Propiedad y Accidentes de Texas con preguntas organizadas por tema, exámenes simulados y explicaciones en español o inglés.",
    topics: ["Seguro de propiedad", "Responsabilidad civil", "Seguro de automóvil", "Reclamaciones y principios de seguros"],
    english: "/texas-property-casualty-exam-prep",
    practice: "/es/free/prueba-practica-propiedad-accidentes-texas",
    pricing: "/pricing?category=property_casualty",
  },
  "vida": {
    title: "Preparación Examen Seguro de Vida Texas | MyEasyPass",
    description: "Prepárate para el examen de Seguro de Vida de Texas con práctica bilingüe, exámenes cronometrados y retroalimentación instantánea por tema.",
    h1: "Preparación para el Examen de Seguro de Vida de Texas",
    intro: "Estudia para tu examen de licencia de Seguro de Vida de Texas con práctica enfocada, exámenes simulados y explicaciones disponibles en español o inglés.",
    topics: ["Pólizas de seguro de vida", "Anualidades", "Conceptos básicos de salud", "Principios y regulación de seguros"],
    english: "/texas-life-insurance-exam-prep",
    practice: "/es/free/prueba-practica-seguro-vida-texas",
    pricing: "/pricing?category=life_insurance",
  },
  "lineas-generales": {
    title: "Preparación Examen Líneas Generales Texas | MyEasyPass",
    description: "Prepárate para el examen de Líneas Generales de Texas con práctica bilingüe, exámenes simulados y retroalimentación por tema.",
    h1: "Preparación para el Examen de Líneas Generales de Texas",
    intro: "Practica para tu examen de licencia de Líneas Generales de Texas con sesiones enfocadas, exámenes cronometrados y explicaciones bilingües.",
    topics: ["Coberturas de líneas generales", "Gestión de riesgos", "Conceptos de seguros comerciales", "Ética y regulación"],
    english: "/texas-general-lines-exam-prep",
    practice: "/es/free/prueba-practica-lineas-generales-texas",
    pricing: "/pricing?category=general_lines",
  },
} as const;

export default function SpanishInsuranceCategoryPage({ kind }: { kind: keyof typeof PAGES }) {
  const page = PAGES[kind];
  const { i18n } = useTranslation();
  const canonical = buildUrl(`/es/preparacion-examen-seguros-${kind}-texas`);

  useEffect(() => {
    if (i18n.language !== "es") i18n.changeLanguage("es");
  }, [i18n]);

  useSEO({
    title: page.title,
    description: page.description,
    canonicalUrl: canonical,
    hreflang: [
      { lang: "es", url: canonical },
      { lang: "en", url: buildUrl(page.english) },
      { lang: "x-default", url: buildUrl(page.english) },
    ],
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "Course",
        name: page.h1,
        description: page.description,
        url: canonical,
        provider: { "@type": "EducationalOrganization", name: "MyEasyPass", url: "https://www.myeasypass.net/" },
        inLanguage: "es",
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Inicio", item: buildUrl("/") },
          { "@type": "ListItem", position: 2, name: page.h1, item: canonical },
        ],
      },
    ],
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <section className="py-16 md:py-20 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4 max-w-5xl">
            <p className="text-sm font-semibold text-primary mb-3">Preparación bilingüe para licencias de Texas</p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight mb-6">{page.h1}</h1>
            <p className="text-lg text-muted-foreground max-w-3xl mb-8">{page.intro}</p>
            <div className="flex flex-wrap gap-3">
              <Link href={page.practice}><Button size="lg">Prueba de práctica gratis</Button></Link>
              <Link href={page.pricing}><Button size="lg" variant="outline">Ver precios</Button></Link>
            </div>
          </div>
        </section>

        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-bold mb-8">Qué puedes estudiar</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {page.topics.map((topic) => (
                <Card key={topic}><CardHeader><CardTitle className="text-lg">{topic}</CardTitle></CardHeader><CardContent className="text-sm text-muted-foreground">Practica conceptos y preguntas originales de preparación relacionados con este tema.</CardContent></Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 md:py-16 bg-muted/30">
          <div className="container mx-auto px-4 max-w-3xl space-y-4">
            <h2 className="text-2xl md:text-3xl font-bold">Preparación independiente</h2>
            <p className="text-muted-foreground">MyEasyPass ofrece material educativo independiente para ayudarte a estudiar. No está afiliado ni respaldado por el Departamento de Seguros de Texas ni por el proveedor oficial del examen.</p>
            <p className="text-muted-foreground">Las preguntas de práctica son originales y están diseñadas para reforzar conceptos de estudio; no son preguntas oficiales del examen.</p>
            <Link href={page.english} className="text-primary hover:underline">View this exam-prep page in English</Link>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
