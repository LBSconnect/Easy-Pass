import { Link } from "wouter";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, BookOpen, ClipboardCheck, ChevronRight } from "lucide-react";
import { useSEO, buildUrl } from "@/hooks/use-seo";

const CONCEPTS = [
  {
    slug: "actual-cash-value-vs-replacement-cost",
    title: "Actual Cash Value vs Replacement Cost",
    description: "Learn the depreciation difference that appears repeatedly in property-insurance exam questions.",
  },
  {
    slug: "coinsurance",
    title: "Coinsurance",
    description: "Break the carried-versus-required formula into a repeatable four-step calculation.",
  },
  {
    slug: "subrogation",
    title: "Subrogation",
    description: "Understand when an insurer may pursue the third party responsible for a covered loss.",
  },
  {
    slug: "indemnity",
    title: "Principle of Indemnity",
    description: "Learn why property insurance generally restores a financial loss rather than creating a profit.",
  },
  {
    slug: "deductible",
    title: "Insurance Deductibles",
    description: "See how deductibles affect a covered-loss calculation and how they differ from limits and coinsurance.",
  },
];

export default function InsuranceConceptsHubPage() {
  const canonicalUrl = buildUrl("/texas-insurance-exam/concepts");
  const title = "Texas Insurance Exam Concepts Study Guide | MyEasyPass";
  const description =
    "Study Property & Casualty insurance concepts with plain-English explanations, worked examples, and practice questions for Texas insurance exam prep.";

  useSEO({
    title,
    description,
    canonicalUrl,
    hreflang: [
      { lang: "en", url: canonicalUrl },
      { lang: "x-default", url: canonicalUrl },
    ],
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "ItemList",
        name: "Texas Property & Casualty Insurance Exam Concepts",
        itemListElement: CONCEPTS.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.title,
          url: buildUrl(`/texas-insurance-exam/${item.slug}`),
        })),
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: buildUrl("/") },
          { "@type": "ListItem", position: 2, name: "Insurance Exam Concepts", item: canonicalUrl },
        ],
      },
    ],
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <div className="border-b bg-muted/30">
          <div className="container mx-auto px-4 py-3">
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Link href="/" className="hover:text-foreground">Home</Link>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="text-foreground">Insurance Exam Concepts</span>
            </nav>
          </div>
        </div>

        <section className="bg-gradient-to-b from-primary/5 to-background py-16 md:py-20">
          <div className="container mx-auto max-w-4xl px-4 text-center">
            <Badge variant="secondary">Free Study Guide</Badge>
            <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">Texas Insurance Exam Concepts</h1>
            <p className="mx-auto mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">
              Build the concepts first, then test yourself. These free explainers break common Property & Casualty study topics into plain English, worked examples, and one practice question at a time.
            </p>
            <div className="mt-7 flex flex-wrap justify-center gap-3">
              <Button size="lg" asChild>
                <Link href="/free/texas-property-casualty-practice-test">
                  <ClipboardCheck className="mr-2 h-5 w-5" aria-hidden="true" />
                  Take Free P&C Practice
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/texas-property-casualty-exam-prep">
                  <BookOpen className="mr-2 h-5 w-5" aria-hidden="true" />
                  View Full P&C Exam Prep
                </Link>
              </Button>
            </div>
          </div>
        </section>

        <section className="py-14 md:py-16">
          <div className="container mx-auto max-w-5xl px-4">
            <div className="grid gap-5 md:grid-cols-2">
              {CONCEPTS.map((concept) => (
                <Card key={concept.slug} className="h-full">
                  <CardHeader>
                    <CardTitle>{concept.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-muted-foreground">{concept.description}</p>
                    <Button variant="link" className="mt-4 h-auto p-0" asChild>
                      <Link href={`/texas-insurance-exam/${concept.slug}`}>
                        Study this concept <ArrowRight className="ml-1 h-4 w-4" aria-hidden="true" />
                      </Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
