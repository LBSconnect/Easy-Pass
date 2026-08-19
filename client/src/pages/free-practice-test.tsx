import { Link, useParams } from "wouter";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, ChevronRight, ClipboardCheck, BookOpen } from "lucide-react";
import { useSEO, buildUrl } from "@/hooks/use-seo";
import { trackEvent } from "@/lib/analytics";
import type { ExamCategory } from "@shared/schema";

interface FreePracticePage {
  slug: string;
  category: ExamCategory;
  shortName: string;
  title: string;
  description: string;
  h1: string;
  intro: string;
  topics: string[];
  faq: Array<{ question: string; answer: string }>;
  paidHref: string;
}

const PAGES: Record<string, FreePracticePage> = {
  "texas-real-estate-practice-test": {
    slug: "texas-real-estate-practice-test",
    category: "real_estate",
    shortName: "Texas Real Estate",
    title: "Free Texas Real Estate Practice Test | TREC Exam Prep | MyEasyPass",
    description:
      "Try a free Texas real estate practice test and see how ready you are for the TREC license exam. Practice online with instant feedback, then continue with full MyEasyPass exam prep.",
    h1: "Free Texas Real Estate Practice Test",
    intro:
      "Start practicing for the Texas real estate license exam before you buy anything. Use real MyEasyPass practice mode, see how the questions feel, and then decide whether you want the full exam-prep experience.",
    topics: [
      "Real estate contracts and transactions",
      "Property ownership and land-use concepts",
      "Agency relationships and representation",
      "Financing, valuation, and real estate math",
      "Texas-focused real estate law concepts",
    ],
    faq: [
      {
        question: "Is this the official TREC exam?",
        answer:
          "No. MyEasyPass is independent exam-preparation material and is not affiliated with or endorsed by the Texas Real Estate Commission.",
      },
      {
        question: "Do I need an account to start?",
        answer:
          "You can open the practice experience as a guest. The app may ask you to create an account when you want to continue beyond the guest preview or use additional study features.",
      },
      {
        question: "Can I use MyEasyPass in Spanish?",
        answer:
          "Yes. MyEasyPass supports English and Spanish study content across its exam-preparation experience.",
      },
    ],
    paidHref: "/texas-real-estate-exam-prep",
  },
  "texas-property-casualty-practice-test": {
    slug: "texas-property-casualty-practice-test",
    category: "property_casualty",
    shortName: "Texas Property & Casualty",
    title: "Free Texas Property & Casualty Practice Test | MyEasyPass",
    description:
      "Try a free Texas Property & Casualty insurance practice test online. Practice P&C exam concepts with instant feedback, then continue with full MyEasyPass exam prep.",
    h1: "Free Texas Property & Casualty Practice Test",
    intro:
      "Get a feel for Texas Property & Casualty exam prep before subscribing. Start in MyEasyPass practice mode, answer questions, and use your results to decide what you need to study next.",
    topics: [
      "Property insurance fundamentals",
      "Liability and casualty concepts",
      "Personal and commercial auto concepts",
      "Policy provisions, exclusions, and conditions",
      "Claims, risk, and Texas insurance concepts",
    ],
    faq: [
      {
        question: "Is this affiliated with the Texas Department of Insurance?",
        answer:
          "No. MyEasyPass is independent practice material and is not affiliated with or endorsed by the Texas Department of Insurance.",
      },
      {
        question: "Can I try the questions before subscribing?",
        answer:
          "Yes. This page sends you into the existing guest practice experience so you can try the product before deciding whether to subscribe.",
      },
      {
        question: "Does MyEasyPass explain answers?",
        answer:
          "The MyEasyPass study experience is designed to provide feedback and explanations so you can identify weak areas instead of only memorizing a score.",
      },
    ],
    paidHref: "/texas-property-casualty-exam-prep",
  },
  "texas-life-insurance-practice-test": {
    slug: "texas-life-insurance-practice-test",
    category: "life_insurance",
    shortName: "Texas Life Insurance",
    title: "Free Texas Life Insurance Practice Test | MyEasyPass",
    description:
      "Try a free Texas life insurance practice test online. Practice licensing-exam concepts with instant feedback and continue with full MyEasyPass exam prep when you are ready.",
    h1: "Free Texas Life Insurance Practice Test",
    intro:
      "Start preparing for the Texas life insurance licensing exam with a real MyEasyPass practice experience. Try questions first, see where you struggle, and upgrade only if the study system is useful to you.",
    topics: [
      "Life insurance policy fundamentals",
      "Policy provisions, riders, and options",
      "Annuities and retirement concepts",
      "Beneficiaries, ownership, and insurable interest",
      "Texas insurance rules and licensing concepts",
    ],
    faq: [
      {
        question: "Is this the real Texas licensing exam?",
        answer:
          "No. This is independent practice material designed for exam preparation and is not the official state licensing examination.",
      },
      {
        question: "Can I start without paying?",
        answer:
          "Yes. Use the guest practice experience to try MyEasyPass before deciding whether to subscribe for broader access and study tools.",
      },
      {
        question: "Can I study on my phone?",
        answer:
          "MyEasyPass is browser-based and is designed to work across phones, tablets, and computers.",
      },
    ],
    paidHref: "/texas-life-insurance-exam-prep",
  },
  "texas-general-lines-practice-test": {
    slug: "texas-general-lines-practice-test",
    category: "general_lines",
    shortName: "Texas General Lines",
    title: "Free Texas General Lines Practice Test | Life & Health | MyEasyPass",
    description:
      "Try a free Texas General Lines Life & Health practice test online. Practice licensing-exam concepts, get feedback, and continue with full MyEasyPass exam prep.",
    h1: "Free Texas General Lines Life & Health Practice Test",
    intro:
      "Use the MyEasyPass guest practice experience to begin preparing for the Texas General Lines Life, Accident, Health and HMO licensing exam. Try the workflow first, then decide whether to unlock the full study system.",
    topics: [
      "Life and health insurance fundamentals",
      "Policy provisions and contract concepts",
      "Annuities, health coverage, and related products",
      "Ethics, regulation, and producer responsibilities",
      "Texas-focused insurance licensing concepts",
    ],
    faq: [
      {
        question: "What General Lines exam is this for?",
        answer:
          "This page is aimed at candidates preparing for Texas General Lines Life, Accident, Health and HMO licensing content available in MyEasyPass.",
      },
      {
        question: "Is this official state exam material?",
        answer:
          "No. MyEasyPass is independent preparation material and is not affiliated with or endorsed by the Texas Department of Insurance.",
      },
      {
        question: "What happens after the free practice experience?",
        answer:
          "You can review the broader exam-prep page, create an account, and choose whether you want subscription access to the full MyEasyPass study experience.",
      },
    ],
    paidHref: "/texas-general-lines-exam-prep",
  },
};

export default function FreePracticeTestPage() {
  const { slug } = useParams<{ slug: string }>();
  const page = PAGES[slug ?? ""];

  if (!page) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-bold">Practice test not found</h1>
          <p className="mt-3 text-muted-foreground">Choose one of the available Texas exam-prep categories.</p>
          <Button asChild className="mt-6"><Link href="/exams">View practice exams</Link></Button>
        </main>
        <Footer />
      </div>
    );
  }

  const canonicalUrl = buildUrl(`/free/${page.slug}`);
  const practiceHref = `/exams/${page.category}`;

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: buildUrl("/") },
      { "@type": "ListItem", position: 2, name: "Free Practice Tests", item: buildUrl("/free/texas-real-estate-practice-test") },
      { "@type": "ListItem", position: 3, name: page.shortName, item: canonicalUrl },
    ],
  };

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: page.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  useSEO({
    title: page.title,
    description: page.description,
    canonicalUrl,
    hreflang: [
      { lang: "en", url: canonicalUrl },
      { lang: "x-default", url: canonicalUrl },
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
              <Link href="/" className="hover:text-foreground">Home</Link>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Free Practice Tests</span>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="text-foreground">{page.shortName}</span>
            </nav>
          </div>
        </div>

        <section className="bg-gradient-to-b from-primary/5 to-background py-16 md:py-20">
          <div className="container mx-auto grid gap-10 px-4 lg:grid-cols-[1.2fr_.8fr] lg:items-center">
            <div>
              <Badge variant="secondary">Free Practice</Badge>
              <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">{page.h1}</h1>
              <p className="mt-5 max-w-2xl text-lg leading-relaxed text-muted-foreground">{page.intro}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button size="lg" asChild>
                  <Link
                    href={practiceHref}
                    onClick={() => trackEvent("free_practice_cta_click", { exam_type: page.category, source: page.slug })}
                  >
                    <ClipboardCheck className="mr-2 h-5 w-5" aria-hidden="true" />
                    Start Free Practice
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href={page.paidHref}>
                    <BookOpen className="mr-2 h-5 w-5" aria-hidden="true" />
                    View Full Exam Prep
                  </Link>
                </Button>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">No promise of passing. No fake “official questions.” Just a real look at the MyEasyPass study experience.</p>
            </div>

            <Card>
              <CardContent className="p-6">
                <p className="text-sm font-semibold uppercase tracking-wide text-primary">What you can practice</p>
                <ul className="mt-5 space-y-3">
                  {page.topics.map((topic) => (
                    <li key={topic} className="flex items-start gap-2.5">
                      <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                      <span>{topic}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="py-14 md:py-16">
          <div className="container mx-auto max-w-4xl px-4">
            <h2 className="text-3xl font-bold">How to use this free practice test</h2>
            <div className="mt-8 grid gap-5 md:grid-cols-3">
              {[
                ["1", "Start practicing", "Open the MyEasyPass guest practice experience for this exam category."],
                ["2", "Find weak spots", "Pay attention to the concepts you hesitate on or answer incorrectly."],
                ["3", "Keep going if useful", "Move into the full exam-prep page only if the practice experience is helping you."],
              ].map(([number, heading, copy]) => (
                <Card key={number}>
                  <CardContent className="p-5">
                    <div className="text-2xl font-bold text-primary">{number}</div>
                    <h3 className="mt-2 font-semibold">{heading}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{copy}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="bg-muted/30 py-14 md:py-16">
          <div className="container mx-auto max-w-4xl px-4">
            <h2 className="text-3xl font-bold">Frequently asked questions</h2>
            <div className="mt-8 space-y-6">
              {page.faq.map((item) => (
                <div key={item.question}>
                  <h3 className="text-lg font-semibold">{item.question}</h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">{item.answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-14 text-center md:py-16">
          <div className="container mx-auto max-w-3xl px-4">
            <h2 className="text-3xl font-bold">Ready to see where you stand?</h2>
            <p className="mt-3 text-muted-foreground">Start with practice. Subscribe only if MyEasyPass earns it.</p>
            <Button size="lg" className="mt-6" asChild>
              <Link
                href={practiceHref}
                onClick={() => trackEvent("free_practice_cta_click", { exam_type: page.category, source: `${page.slug}-bottom` })}
              >
                Start Free Practice
              </Link>
            </Button>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
