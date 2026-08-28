import { useEffect } from "react";
import { Link } from "wouter";
import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, Target } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useSEO, buildUrl } from "@/hooks/use-seo";
import { trackEvent } from "@/lib/analytics";

export type UrgentExamKind = "real_estate" | "insurance";

const CONTENT = {
  real_estate: {
    path: "/texas-real-estate-exam-last-minute-prep",
    title: "Texas Real Estate Exam Tomorrow? Last-Minute Prep | MyEasyPass",
    description: "Texas real estate exam coming up fast? Take a free readiness check, identify weak topics, and use focused last-minute practice instead of random cramming.",
    badge: "Texas Real Estate",
    h1: "Texas Real Estate Exam Tomorrow? Make the Time You Have Left Count.",
    intro: "If your Texas real estate exam is tomorrow or later this week, the goal is not to relearn everything. Find the topics most likely to cost you points, practice under pressure, and spend the remaining time where it matters most.",
    category: "real_estate",
    readinessHref: "/readiness-check?category=real_estate&utm_source=organic&utm_medium=seo&utm_campaign=last_minute_real_estate",
    pricingHref: "/pricing?category=real_estate&utm_source=organic&utm_medium=seo&utm_campaign=last_minute_real_estate",
    examLabel: "Texas Real Estate",
    faq: [
      ["Can I prepare for the Texas real estate exam in one day?", "No study platform can guarantee that one day is enough. If your exam is close, use the remaining time to diagnose weak areas, review high-value concepts, and practice answering exam-style questions under time pressure."],
      ["What should I study the night before the Texas real estate exam?", "Prioritize the topics your practice results show are weakest, then review the rules and concepts behind the questions you miss. Avoid spending the entire night rereading material you already know."],
      ["Does MyEasyPass replace Texas pre-licensing education?", "No. MyEasyPass is independent exam-readiness and practice material. It does not replace required qualifying education and is not affiliated with or endorsed by TREC or Pearson VUE."],
    ],
  },
  insurance: {
    path: "/texas-insurance-exam-last-minute-prep",
    title: "Texas Insurance Exam Tomorrow? Last-Minute Prep | MyEasyPass",
    description: "Texas insurance exam coming up fast? Take a free readiness check and focus last-minute practice on your weakest Property & Casualty, Life, or General Lines topics.",
    badge: "Texas Insurance",
    h1: "Texas Insurance Exam Tomorrow? Focus Your Last-Minute Study.",
    intro: "When your Texas insurance exam is close, random cramming wastes time. Start with a readiness check, identify the concepts costing you points, then practice the exam category you are actually taking.",
    category: null,
    readinessHref: "/readiness-check?utm_source=organic&utm_medium=seo&utm_campaign=last_minute_insurance",
    pricingHref: "/pricing?utm_source=organic&utm_medium=seo&utm_campaign=last_minute_insurance",
    examLabel: "Texas Insurance",
    faq: [
      ["Can I prepare for a Texas insurance exam in one day?", "There is no responsible way to promise that one day is enough. With limited time, use practice results to identify weak concepts, then focus on the exam category you are scheduled to take."],
      ["Which Texas insurance exams does MyEasyPass cover?", "MyEasyPass includes Texas Property & Casualty, Life Insurance, and General Lines exam-prep categories. Choose the category that matches the license exam you are taking."],
      ["Is MyEasyPass an official Texas insurance exam provider?", "No. MyEasyPass is independent exam-readiness and practice material. It is not affiliated with or endorsed by the Texas Department of Insurance or Pearson VUE."],
    ],
  },
} as const;

export default function UrgentExamPrepPage({ kind }: { kind: UrgentExamKind }) {
  const content = CONTENT[kind];
  const canonicalUrl = buildUrl(content.path);

  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: content.faq.map(([question, answer]) => ({
      "@type": "Question",
      name: question,
      acceptedAnswer: { "@type": "Answer", text: answer },
    })),
  };

  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: buildUrl("/") },
      { "@type": "ListItem", position: 2, name: `${content.examLabel} Last-Minute Prep`, item: canonicalUrl },
    ],
  };

  useSEO({
    title: content.title,
    description: content.description,
    canonicalUrl,
    hreflang: [
      { lang: "en", url: canonicalUrl },
      { lang: "x-default", url: canonicalUrl },
    ],
    jsonLd: [faqSchema, breadcrumbSchema],
  });

  useEffect(() => {
    trackEvent("exam_landing_view", {
      slug: content.path.slice(1),
      exam_type: content.category ?? "insurance_multi",
      intent_variant: "last_minute",
    });
  }, [content.path, content.category]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <main>
        <section className="border-b bg-gradient-to-b from-primary/10 via-primary/5 to-background py-14 md:py-20">
          <div className="container mx-auto max-w-5xl px-4">
            <div className="max-w-3xl">
              <Badge variant="secondary" className="mb-4">{content.badge} · Last-Minute Prep</Badge>
              <h1 className="text-3xl font-bold tracking-tight sm:text-4xl md:text-5xl">{content.h1}</h1>
              <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{content.intro}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button size="lg" asChild>
                  <Link
                    href={content.readinessHref}
                    onClick={() => trackEvent("readiness_cta_click", {
                      exam_type: content.category ?? "insurance_multi",
                      source: "urgent_hero",
                    })}
                  >
                    Take the Free Readiness Check
                    <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link
                    href={content.pricingHref}
                    onClick={() => trackEvent("pricing_cta_click", {
                      exam_type: content.category ?? "insurance_multi",
                      source: "urgent_hero",
                    })}
                  >
                    See Exam Prep Options
                  </Link>
                </Button>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">Free readiness check · 10 questions · Instant result</p>
            </div>
          </div>
        </section>

        <section className="py-12 md:py-16">
          <div className="container mx-auto max-w-5xl px-4">
            <div className="grid gap-5 md:grid-cols-3">
              <Card>
                <CardHeader><Target className="h-5 w-5 text-primary" aria-hidden="true" /><CardTitle className="text-lg">1. Find the gaps first</CardTitle></CardHeader>
                <CardContent className="text-muted-foreground">Use the free readiness check before deciding what to review. A weak topic deserves your time; a strong one probably does not.</CardContent>
              </Card>
              <Card>
                <CardHeader><Clock3 className="h-5 w-5 text-primary" aria-hidden="true" /><CardTitle className="text-lg">2. Practice under a clock</CardTitle></CardHeader>
                <CardContent className="text-muted-foreground">Last-minute study should include answering questions at exam pace, not only reading notes. Practice exposes hesitation and weak recall.</CardContent>
              </Card>
              <Card>
                <CardHeader><CheckCircle2 className="h-5 w-5 text-primary" aria-hidden="true" /><CardTitle className="text-lg">3. Review why you missed it</CardTitle></CardHeader>
                <CardContent className="text-muted-foreground">Do not memorize answer letters. Review the underlying rule or concept so a differently worded question does not beat you again.</CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="bg-muted/30 py-12 md:py-16">
          <div className="container mx-auto max-w-3xl px-4">
            <div className="rounded-2xl border bg-background p-6 md:p-8">
              <div className="flex items-start gap-3">
                <AlertTriangle className="mt-1 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                <div>
                  <h2 className="text-2xl font-bold">What not to do the night before</h2>
                  <ul className="mt-4 space-y-3 text-muted-foreground">
                    <li>• Do not try to relearn the entire course from page one.</li>
                    <li>• Do not spend all your time on topics you already answer correctly.</li>
                    <li>• Do not treat a practice score as a guarantee of an official exam result.</li>
                    <li>• Do not sacrifice all sleep for low-quality review. Your recall and attention matter on exam day.</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-12 md:py-16">
          <div className="container mx-auto max-w-3xl px-4">
            <h2 className="text-2xl font-bold md:text-3xl">Last-minute questions</h2>
            <div className="mt-6 space-y-5">
              {content.faq.map(([question, answer]) => (
                <div key={question} className="rounded-xl border p-5">
                  <h3 className="font-semibold">{question}</h3>
                  <p className="mt-2 leading-relaxed text-muted-foreground">{answer}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="border-t bg-primary/5 py-12">
          <div className="container mx-auto max-w-3xl px-4 text-center">
            <h2 className="text-2xl font-bold">Start with evidence, not panic.</h2>
            <p className="mx-auto mt-3 max-w-xl text-muted-foreground">Take 10 questions, see where you stand, and use the remaining time on the areas your result actually identifies.</p>
            <Button size="lg" className="mt-6" asChild>
              <Link
                href={content.readinessHref}
                onClick={() => trackEvent("readiness_cta_click", {
                  exam_type: content.category ?? "insurance_multi",
                  source: "urgent_bottom",
                })}
              >
                Take My Free Readiness Check
                <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
              </Link>
            </Button>
            <p className="mt-5 text-xs leading-relaxed text-muted-foreground">MyEasyPass is independent exam-preparation material. It is not affiliated with or endorsed by TREC, TDI, or Pearson VUE, and no practice result guarantees an official exam outcome.</p>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
