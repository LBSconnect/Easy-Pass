import { Link, useSearch } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { CheckCircle2, ChevronRight, ExternalLink, XCircle } from "lucide-react";
import { useSEO, buildUrl } from "@/hooks/use-seo";
import { trackEvent } from "@/lib/analytics";
import { getTopicsByCategory } from "@shared/studyTopics";
import { resolveLandingVariant } from "@shared/landingIntent";
import { getLandingPageBySlug, examLandingPages, type ExamLandingPageContent } from "@/lib/examLandingContent";
import {
  ReadinessPreview,
  ProblemSolution,
  ExamStructure,
  RetakerRescueSection,
} from "@/components/exam-landing-sections";
import type { Question, ExamCategory } from "@shared/schema";

const CATEGORY_LABELS: Record<string, { en: string; es: string }> = {
  real_estate: { en: "Real Estate", es: "Bienes Raíces" },
  property_casualty: { en: "Property & Casualty Insurance", es: "Seguro de Propiedad y Accidentes" },
  life_insurance: { en: "Life Insurance", es: "Seguro de Vida" },
  general_lines: { en: "General Lines Insurance", es: "Seguro de Líneas Generales" },
};

function SampleQuestion({ categories, language }: { categories: string[]; language: "en" | "es" }) {
  const { data: question, isLoading } = useQuery<Question>({
    queryKey: ["/api/questions/sample", categories.join(",")],
    queryFn: async () => {
      const res = await fetch(`/api/questions/sample?categories=${categories.join(",")}`);
      if (!res.ok) throw new Error("Failed to load sample question");
      return res.json();
    },
  });

  const [selected, setSelected] = useState<number | null>(null);
  const isSpanish = language === "es";

  if (isLoading) {
    return <p className="text-muted-foreground">{isSpanish ? "Cargando pregunta de muestra..." : "Loading sample question..."}</p>;
  }

  const questionText = isSpanish ? question?.questionTextEs : question?.questionTextEn;
  const options = isSpanish ? question?.optionsEs : question?.optionsEn;

  // Check the shape, not just presence. A truthy response missing its options
  // used to throw here and blank the whole landing page - the top of the
  // signup funnel - rather than dropping one optional sample card.
  if (!question || !questionText || !Array.isArray(options) || options.length === 0) {
    return null;
  }

  const explanation = isSpanish ? question.explanationEs : question.explanationEn;

  return (
    <Card data-testid="card-sample-question">
      <CardHeader>
        <CardDescription>{isSpanish ? "Pregunta de Muestra" : "Sample Question"}</CardDescription>
        <CardTitle className="text-lg font-medium">{questionText}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {options.map((option, index) => {
          const isSelected = selected === index;
          const isCorrect = index === question.correctAnswer;
          const showResult = selected !== null;
          return (
            <button
              key={index}
              type="button"
              onClick={() => setSelected(index)}
              data-testid={`button-sample-option-${index}`}
              className={`w-full text-left p-3 rounded-lg border transition-colors flex items-center justify-between gap-2 ${
                showResult && isCorrect
                  ? "border-green-500 bg-green-500/10"
                  : showResult && isSelected
                  ? "border-destructive bg-destructive/10"
                  : "border-border hover:bg-muted"
              }`}
            >
              <span>{option}</span>
              {showResult && isCorrect && (
                <CheckCircle2 className="h-4 w-4 text-green-500 shrink-0" aria-hidden="true" />
              )}
              {showResult && !isCorrect && isSelected && (
                <XCircle className="h-4 w-4 text-destructive shrink-0" aria-hidden="true" />
              )}
            </button>
          );
        })}
        {selected !== null && explanation && (
          <p className="text-sm text-muted-foreground pt-2 border-t">{explanation}</p>
        )}
      </CardContent>
    </Card>
  );
}

export function ExamLandingPage({ slug }: { slug: string }) {
  const content = getLandingPageBySlug(slug);
  if (!content) return null;

  return <ExamLandingPageInner content={content} />;
}

function landingPagePath(content: ExamLandingPageContent): string {
  return content.language === "es" ? `/es/${content.slug}` : `/${content.slug}`;
}

function ExamLandingPageInner({ content }: { content: ExamLandingPageContent }) {
  const isSpanish = content.language === "es";
  const { i18n } = useTranslation();
  const search = useSearch();

  useEffect(() => {
    if (isSpanish && i18n.language !== "es") {
      i18n.changeLanguage("es");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSpanish]);

  const canonicalUrl = buildUrl(landingPagePath(content));
  const alternateContent = examLandingAlternate(content);

  const courseSchemas = content.categories.map((category) => ({
    "@context": "https://schema.org",
    "@type": "Course",
    name: `${content.courseName}${content.categories.length > 1 ? ` - ${CATEGORY_LABELS[category]?.[content.language]}` : ""}`,
    description: content.courseDescription,
    url: canonicalUrl,
    provider: {
      "@type": "EducationalOrganization",
      name: "MyEasyPass",
      url: "https://www.myeasypass.net/",
    },
    inLanguage: [content.language],
    availableLanguage: ["English", "Spanish"],
  }));

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: content.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: isSpanish ? "Inicio" : "Home", item: buildUrl("/") },
      { "@type": "ListItem", position: 2, name: content.h1, item: canonicalUrl },
    ],
  };

  // The exam this page sells. Config lists categories; the first is primary
  // and drives readiness, exam facts and analytics for the page.
  const primaryCategory = content.categories[0] as ExamCategory;

  // Headline matching for paid search, from an allowlist and nothing else.
  //
  // `intent` is read rather than utm_term because utm_term carries whatever
  // the ad platform put in it. Either way the value is only ever a lookup key:
  // an unrecognised one leaves the page's own H1 in place, and no inbound text
  // is ever rendered. See shared/landingIntent.
  const intentVariant = resolveLandingVariant(
    primaryCategory,
    new URLSearchParams(search).get("intent"),
  );
  const heading = intentVariant
    ? (isSpanish ? intentVariant.headingEs : intentVariant.headingEn)
    : content.h1;

  // One view event per page load, tagged with the exam so the four products
  // can be compared against each other in the funnel.
  useEffect(() => {
    trackEvent("exam_landing_view", {
      slug: content.slug,
      exam_type: primaryCategory,
      // Which approved variant was shown, never the raw parameter.
      intent_variant: intentVariant?.key ?? null,
    });
  }, [content.slug, primaryCategory, intentVariant?.key]);

  useSEO({
    title: content.pageTitle,
    description: content.metaDescription,
    canonicalUrl,
    hreflang: [
      { lang: content.language, url: canonicalUrl },
      ...(alternateContent ? [{ lang: alternateContent.language, url: buildUrl(landingPagePath(alternateContent)) }] : []),
      { lang: "x-default", url: canonicalUrl },
    ],
    jsonLd: [...courseSchemas, faqSchema, breadcrumbSchema],
  });

  const pricingHref = content.categories.length === 1 ? `/pricing?category=${content.categories[0]}` : "/pricing";
  // Someone who clicked an ad for a specific exam has already told us which
  // one. Asking them to pick it again from four options on the next screen is
  // a step that can only lose people, so the page carries the answer forward.
  // A page covering several exams has no single answer to carry, and
  // /readiness-check on its own still asks - see client/src/pages/diagnostic.
  const readinessHref =
    content.categories.length === 1
      ? `/readiness-check?category=${content.categories[0]}`
      : "/readiness-check";
  // Confirmed by owner: LBS4 bootcamp services listing.
  const bootcampHref = "https://www.lbs4.com/services?filter=bootcamp";

  const topicsByCategory = content.categories.map((category) => ({
    category,
    topics: getTopicsByCategory(category),
  }));

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        {/* Breadcrumb */}
        <div className="border-b bg-muted/30">
          <div className="container mx-auto px-4 py-3">
            <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <Link href="/">
                <span className="hover:text-foreground transition-colors">{isSpanish ? "Inicio" : "Home"}</span>
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <span className="text-foreground">{content.h1}</span>
            </nav>
          </div>
        </div>

        {/* Hero: copy on the left, live product preview on the right. The
            preview is the marketing image - the readiness dashboard is the
            product, so showing it beats any stock photograph. */}
        <section className="py-16 md:py-20 bg-gradient-to-b from-primary/5 via-primary/3 to-background">
          <div className="container mx-auto px-4">
            <div className="grid items-center gap-10 lg:grid-cols-2">
              <div className="min-w-0 space-y-6">
                <div className="flex flex-wrap gap-2">
                  {content.categories.map((category) => (
                    <Badge key={category} variant="secondary">
                      {CATEGORY_LABELS[category]?.[content.language]}
                    </Badge>
                  ))}
                </div>
                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight" data-testid="heading-landing-h1">
                  {heading}
                </h1>
                <p className="text-lg text-muted-foreground">{content.heroSubtitle}</p>
                <div className="flex flex-wrap gap-3 pt-2">
                  {/* Primary CTA is the free diagnostic, not checkout: cold
                      traffic converts better after experiencing the product. */}
                  <Link href={readinessHref}>
                    <Button
                      size="lg"
                      onClick={() =>
                        trackEvent("readiness_cta_click", {
                          slug: content.slug,
                          exam_type: primaryCategory,
                          source: "hero",
                        })
                      }
                      data-testid="button-hero-readiness-cta"
                    >
                      {isSpanish ? "Tomar Mi Prueba Gratuita" : "Take My Free Readiness Test"}
                    </Button>
                  </Link>
                  <Link href={pricingHref}>
                    <Button
                      size="lg"
                      variant="outline"
                      onClick={() =>
                        trackEvent("pricing_cta_click", {
                          slug: content.slug,
                          exam_type: primaryCategory,
                          source: "hero",
                        })
                      }
                      data-testid="button-hero-pricing-cta"
                    >
                      {isSpanish ? "Ver Qué Incluye" : "See What's Included"}
                    </Button>
                  </Link>
                </div>
                <ul className="flex flex-wrap gap-x-5 gap-y-2 pt-1 text-sm text-muted-foreground">
                  {(isSpanish
                    ? ["Específico de Texas", "Práctica adaptativa", "Inglés + Español", "Estudia donde sea"]
                    : ["Texas-Specific", "Adaptive Practice", "English + Español", "Study Anywhere"]
                  ).map((item) => (
                    <li key={item} className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="min-w-0">
                <ReadinessPreview
                  category={primaryCategory}
                  slug={content.slug}
                  isSpanish={isSpanish}
                />
              </div>
            </div>
          </div>
        </section>

        <ProblemSolution category={primaryCategory} slug={content.slug} isSpanish={isSpanish} />
        <ExamStructure category={primaryCategory} slug={content.slug} isSpanish={isSpanish} />
        <RetakerRescueSection category={primaryCategory} slug={content.slug} isSpanish={isSpanish} />

        {/* Audience */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-bold mb-4">{content.audienceHeading}</h2>
            {content.audienceParagraphs.map((p, i) => (
              <p key={i} className="text-muted-foreground leading-relaxed mb-3">{p}</p>
            ))}
          </div>
        </section>

        {/* Topics covered */}
        <section className="py-12 md:py-16 bg-muted/30">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">
              {isSpanish ? "Temas Cubiertos" : "Topics Covered"}
            </h2>
            <div className={`grid gap-6 ${topicsByCategory.length > 1 ? "md:grid-cols-3" : "md:grid-cols-2"}`}>
              {topicsByCategory.map(({ category, topics }) => (
                <div key={category} className="space-y-3">
                  {topicsByCategory.length > 1 && (
                    <h3 className="font-semibold text-sm text-primary">{CATEGORY_LABELS[category]?.[content.language]}</h3>
                  )}
                  {topics.map((topic) => (
                    <div key={topic.id} className="flex items-start gap-2">
                      <CheckCircle2 className="h-4 w-4 text-primary mt-1 shrink-0" />
                      <div>
                        <p className="font-medium text-sm">{isSpanish ? topic.nameEs : topic.nameEn}</p>
                        <p className="text-xs text-muted-foreground">{isSpanish ? topic.descriptionEs : topic.descriptionEn}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Benefits */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4 max-w-5xl">
            <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">
              {isSpanish ? "Beneficios" : "Benefits"}
            </h2>
            <div className="grid gap-6 sm:grid-cols-2">
              {content.benefits.map((benefit) => (
                <Card key={benefit.title}>
                  <CardHeader>
                    <CardTitle className="text-base">{benefit.title}</CardTitle>
                    <CardDescription>{benefit.description}</CardDescription>
                  </CardHeader>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section className="py-12 md:py-16 bg-muted/30">
          <div className="container mx-auto px-4 max-w-4xl">
            <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">
              {isSpanish ? "Cómo Funciona" : "How It Works"}
            </h2>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {content.howItWorks.map((step, i) => (
                <div key={i} className="text-center space-y-2">
                  <div className="mx-auto h-8 w-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-sm">
                    {i + 1}
                  </div>
                  <h3 className="font-semibold text-sm">{step.title}</h3>
                  <p className="text-xs text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Sample question */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4 max-w-2xl">
            <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">
              {isSpanish ? "Prueba una Pregunta de Muestra" : "Try a Sample Question"}
            </h2>
            <SampleQuestion categories={content.categories} language={content.language} />
          </div>
        </section>

        {/* FAQ */}
        <section className="py-12 md:py-16 bg-muted/30">
          <div className="container mx-auto px-4 max-w-3xl">
            <h2 className="text-2xl md:text-3xl font-bold mb-8 text-center">
              {isSpanish ? "Preguntas Frecuentes" : "Frequently Asked Questions"}
            </h2>
            <Accordion type="single" collapsible>
              {content.faq.map((item, i) => (
                <AccordionItem key={i} value={`item-${i}`}>
                  <AccordionTrigger>{item.question}</AccordionTrigger>
                  <AccordionContent>{item.answer}</AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
          </div>
        </section>

        {/* Pricing + Bootcamp CTA */}
        <section className="py-12 md:py-16">
          <div className="container mx-auto px-4 max-w-4xl grid gap-6 md:grid-cols-2">
            <Card className="bg-gradient-to-br from-primary/5 to-primary/10">
              <CardHeader>
                <CardTitle>{isSpanish ? "Comienza a Practicar" : "Start Practicing"}</CardTitle>
                <CardDescription>
                  {isSpanish ? "Ve los planes de suscripción disponibles para esta categoría." : "See subscription plans available for this category."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Link href={pricingHref}>
                  <Button
                    className="w-full"
                    onClick={() => trackEvent("pricing_cta_click", { slug: content.slug, source: "footer_cta" })}
                    data-testid="button-footer-pricing-cta"
                  >
                    {isSpanish ? "Ver Precios" : "View Pricing"}
                  </Button>
                </Link>
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>{isSpanish ? "¿Prefieres un Bootcamp en Vivo?" : "Prefer a Live Bootcamp?"}</CardTitle>
                <CardDescription>
                  {isSpanish
                    ? "Conéctate con bootcamps de repaso de examen en vivo y nuestro centro de exámenes en Houston."
                    : "Connect with live exam-cram bootcamps and our Houston testing center."}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <a href={bootcampHref} target="_blank" rel="noopener noreferrer">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => trackEvent("bootcamp_cta_click", { slug: content.slug, source: "footer_cta" })}
                    data-testid="button-footer-bootcamp-cta"
                  >
                    {isSpanish ? "Ver Bootcamps en Vivo" : "See Live Exam Bootcamps"}
                    <ExternalLink className="ml-2 h-4 w-4" />
                  </Button>
                </a>
              </CardContent>
            </Card>
          </div>
        </section>

        {/* Related exams */}
        {content.relatedSlugs.length > 0 && (
          <section className="py-12 md:py-16 bg-muted/30">
            <div className="container mx-auto px-4 max-w-4xl">
              <h2 className="text-xl md:text-2xl font-bold mb-6 text-center">
                {isSpanish ? "Otros Exámenes" : "Other Exams"}
              </h2>
              <div className="flex flex-wrap justify-center gap-3">
                {content.relatedSlugs.map((relatedSlug) => {
                  const related = getLandingPageBySlug(relatedSlug);
                  if (!related) return null;
                  return (
                    <Link key={relatedSlug} href={landingPagePath(related)}>
                      <Button variant="outline" size="sm" data-testid={`link-related-${relatedSlug}`}>
                        {related.h1}
                      </Button>
                    </Link>
                  );
                })}
              </div>
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}

function examLandingAlternate(content: ExamLandingPageContent): ExamLandingPageContent | undefined {
  // Best-effort pairing of an EN page with its ES counterpart (or vice versa)
  // for hreflang purposes, based on overlapping categories.
  return examLandingPages.find(
    (p) => p.language !== content.language && p.categories.some((c) => content.categories.includes(c))
  );
}
