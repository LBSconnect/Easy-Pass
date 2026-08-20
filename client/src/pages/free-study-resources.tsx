import { Link } from "wouter";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, ClipboardCheck, ArrowRight } from "lucide-react";
import { useSEO, buildUrl } from "@/hooks/use-seo";

const RESOURCES = [
  { title: "Free Real Estate Practice Test", description: "Try Texas real estate practice questions and see where you need more study before moving into full exam prep.", href: "/free/texas-real-estate-practice-test", type: "Practice Test" },
  { title: "Free P&C Practice Test", description: "Practice Texas Property & Casualty insurance concepts with the MyEasyPass guest practice experience.", href: "/free/texas-property-casualty-practice-test", type: "Practice Test" },
  { title: "Free Life Insurance Practice Test", description: "Practice Texas life insurance licensing concepts before deciding whether you need the full study system.", href: "/free/texas-life-insurance-practice-test", type: "Practice Test" },
  { title: "Free General Lines Practice Test", description: "Try Texas General Lines Life, Accident, Health and HMO practice questions with instant study feedback.", href: "/free/texas-general-lines-practice-test", type: "Practice Test" },
  { title: "Insurance Exam Concepts", description: "Study Property & Casualty concepts such as deductible, indemnity, subrogation, coinsurance and other high-value exam topics.", href: "/texas-insurance-exam/concepts", type: "Study Guide" },
  { title: "Life & Health Concepts", description: "Review life and health concepts including beneficiaries, premiums, insurable interest, annuities and policy comparisons.", href: "/texas-life-health-exam/concepts", type: "Study Guide" },
  { title: "Real Estate Concepts", description: "Build confidence on agency, property, fixtures, market value and other Texas real estate exam concepts.", href: "/texas-real-estate-exam/concepts", type: "Study Guide" },
] as const;

const STUDY_QUESTIONS = [
  { title: "Named Peril vs Open Peril", href: "/study/named-peril-vs-open-peril", category: "Property & Casualty" },
  { title: "Cancellation vs Nonrenewal", href: "/study/cancellation-vs-nonrenewal", category: "Property & Casualty" },
  { title: "Policyowner vs Insured vs Beneficiary", href: "/study/policyowner-vs-insured-vs-beneficiary", category: "Life Insurance" },
  { title: "Revocable vs Irrevocable Beneficiary", href: "/study/revocable-vs-irrevocable-beneficiary", category: "Life Insurance" },
  { title: "Lien vs Encumbrance", href: "/study/lien-vs-encumbrance", category: "Real Estate" },
  { title: "Joint Tenancy vs Tenancy in Common", href: "/study/joint-tenancy-vs-tenancy-in-common", category: "Real Estate" },
] as const;

export default function FreeStudyResourcesPage() {
  const canonical = buildUrl("/free/study-resources");

  useSEO({
    title: "Free Texas Exam Study Resources | MyEasyPass",
    description: "Free Texas real estate and insurance practice tests, study guides and exam concept explainers from MyEasyPass.",
    canonicalUrl: canonical,
    hreflang: [{ lang: "en", url: canonical }, { lang: "x-default", url: canonical }],
    jsonLd: [
      {
        "@context": "https://schema.org",
        "@type": "CollectionPage",
        name: "Free Texas Exam Study Resources",
        description: "Free Texas real estate and insurance practice tests and study concept guides.",
        url: canonical,
        mainEntity: {
          "@type": "ItemList",
          itemListElement: [...RESOURCES, ...STUDY_QUESTIONS].map((resource, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: resource.title,
            url: buildUrl(resource.href),
          })),
        },
      },
      {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: [
          { "@type": "ListItem", position: 1, name: "Home", item: buildUrl("/") },
          { "@type": "ListItem", position: 2, name: "Free Study Resources", item: canonical },
        ],
      },
    ],
  });

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <section className="bg-gradient-to-b from-primary/5 to-background py-16 md:py-20">
          <div className="container mx-auto max-w-5xl px-4 text-center">
            <Badge variant="secondary">100% Free Study Help</Badge>
            <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">Free Study Resources</h1>
            <p className="mx-auto mt-5 max-w-3xl text-lg leading-relaxed text-muted-foreground">Start with free practice tests and plain-English study guides for Texas real estate and insurance licensing exams. Learn the concepts, test yourself, and move into full exam prep only when you need it.</p>
          </div>
        </section>

        <section className="py-14 md:py-16">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {RESOURCES.map((resource) => (
                <Card key={resource.href} className="h-full">
                  <CardHeader>
                    <div className="mb-3 flex items-center gap-2 text-sm font-medium text-primary">
                      {resource.type === "Practice Test" ? <ClipboardCheck className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                      {resource.type}
                    </div>
                    <CardTitle>{resource.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-muted-foreground">{resource.description}</p>
                    <Button variant="link" className="mt-5 h-auto justify-start p-0" asChild>
                      <Link href={resource.href}>Open resource <ArrowRight className="ml-1 h-4 w-4" /></Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="border-y bg-muted/30 py-14 md:py-16">
          <div className="container mx-auto max-w-6xl px-4">
            <div className="mb-8 max-w-3xl">
              <Badge variant="outline">Popular Study Questions</Badge>
              <h2 className="mt-3 text-2xl font-bold md:text-3xl">Quick answers to concepts students mix up</h2>
              <p className="mt-3 text-muted-foreground">Use these free side-by-side guides when two exam terms sound similar but mean different things.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {STUDY_QUESTIONS.map((item) => (
                <Card key={item.href}>
                  <CardContent className="p-6">
                    <p className="text-xs font-semibold uppercase tracking-wide text-primary">{item.category}</p>
                    <h3 className="mt-2 text-lg font-semibold">{item.title}</h3>
                    <Button variant="link" className="mt-4 h-auto p-0" asChild>
                      <Link href={item.href}>Study this difference <ArrowRight className="ml-1 h-4 w-4" /></Link>
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 md:py-14">
          <div className="container mx-auto max-w-4xl px-4 text-center">
            <h2 className="text-2xl font-bold md:text-3xl">Not sure where to start?</h2>
            <p className="mt-3 text-muted-foreground">Take the readiness check to identify the areas that deserve your attention first.</p>
            <Button className="mt-6" asChild><Link href="/readiness-check">Check My Readiness</Link></Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
