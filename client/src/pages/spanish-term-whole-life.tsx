import { Link } from "wouter";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSEO, buildUrl } from "@/hooks/use-seo";

export default function SpanishTermWholeLifePage() {
  const canonical = buildUrl("/es/comparacion-term-vs-whole-life-texas");
  const english = buildUrl("/texas-life-health-exam/whole-life-vs-term-life");

  useSEO({
    title: "Seguro a Término vs Vida Entera | Examen de Seguros | MyEasyPass",
    description: "Compara seguro de vida a término y vida entera para el examen de seguros de Texas. Aprende duración, valor en efectivo y diferencias clave.",
    canonicalUrl: canonical,
    hreflang: [{ lang: "es", url: canonical }, { lang: "en", url: english }, { lang: "x-default", url: english }],
    jsonLd: [
      { "@context": "https://schema.org", "@type": "Article", headline: "Seguro a término vs vida entera: ¿cuál es la diferencia?", description: "Comparación educativa entre seguro de vida a término y vida entera para preparación de examen.", url: canonical, inLanguage: "es", publisher: { "@type": "Organization", name: "MyEasyPass" } },
      { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Inicio", item: buildUrl("/") },
        { "@type": "ListItem", position: 2, name: "Conceptos de seguros", item: buildUrl("/es/conceptos-seguros-texas") },
        { "@type": "ListItem", position: 3, name: "Término vs vida entera", item: canonical },
      ] },
    ],
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <section className="py-16 md:py-20 bg-gradient-to-b from-primary/5 to-background">
          <div className="container mx-auto px-4 max-w-5xl">
            <p className="text-sm font-semibold text-primary mb-3">Comparación para estudiar</p>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight">Seguro a término vs vida entera: ¿cuál es la diferencia?</h1>
            <p className="mt-5 text-lg text-muted-foreground max-w-3xl">El seguro de vida a término está diseñado para brindar cobertura durante un período específico, mientras que vida entera es una forma de seguro permanente que generalmente incluye características de valor en efectivo.</p>
          </div>
        </section>
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4 max-w-5xl grid gap-6 md:grid-cols-2">
            <Card><CardHeader><CardTitle>Seguro a término</CardTitle></CardHeader><CardContent><ul className="space-y-3 text-muted-foreground"><li>• Cobertura diseñada para un período específico.</li><li>• Normalmente se enfoca en la protección por fallecimiento.</li><li>• La estructura de prima y renovación depende del contrato.</li></ul></CardContent></Card>
            <Card><CardHeader><CardTitle>Vida entera</CardTitle></CardHeader><CardContent><ul className="space-y-3 text-muted-foreground"><li>• Forma de seguro de vida permanente.</li><li>• Normalmente incluye características de valor en efectivo.</li><li>• Las garantías y primas dependen del contrato.</li></ul></CardContent></Card>
          </div>
        </section>
        <section className="py-12 md:py-16 bg-muted/30">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-2xl font-bold">Consejo para el examen</h2>
            <p className="mt-3 text-muted-foreground">Primero identifica si la póliza es temporal o permanente. Después busca si el escenario menciona valor en efectivo, duración o estructura de primas.</p>
            <div className="mt-6 flex flex-wrap gap-3"><Button asChild><Link href="/es/free/prueba-practica-seguro-vida-texas">Práctica gratis</Link></Button><Button variant="outline" asChild><Link href="/es/preparacion-examen-seguros-vida-texas">Preparación completa</Link></Button><Button variant="outline" asChild><Link href="/es/conceptos-seguros-texas">Más conceptos</Link></Button></div>
            <p className="mt-6 text-sm text-muted-foreground">Material educativo independiente. No son preguntas oficiales del examen y no se garantiza aprobar.</p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
