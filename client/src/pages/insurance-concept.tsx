import { Link, useParams } from "wouter";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, BookOpen, CheckCircle2, ChevronRight, ClipboardCheck } from "lucide-react";
import { useSEO, buildUrl } from "@/hooks/use-seo";
import { trackEvent } from "@/lib/analytics";

interface ConceptContent {
  slug: string;
  term: string;
  title: string;
  description: string;
  h1: string;
  lede: string;
  definition: string;
  examTip: string;
  example: string;
  keyPoints: string[];
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
  faq: Array<{ question: string; answer: string }>;
  relatedSlugs: string[];
}

const CONCEPTS: Record<string, ConceptContent> = {
  "actual-cash-value-vs-replacement-cost": {
    slug: "actual-cash-value-vs-replacement-cost",
    term: "Actual Cash Value vs Replacement Cost",
    title: "Actual Cash Value vs Replacement Cost | Texas Insurance Exam Prep | MyEasyPass",
    description:
      "Learn the difference between actual cash value and replacement cost for Texas Property & Casualty insurance exam prep, with a simple example and practice question.",
    h1: "Actual Cash Value vs Replacement Cost",
    lede:
      "ACV and replacement cost are easy to mix up under exam pressure. The shortcut is to focus on depreciation: ACV commonly accounts for it, while replacement cost generally does not, subject to the policy's terms and limits.",
    definition:
      "For exam-prep purposes, actual cash value (ACV) is commonly expressed as replacement cost minus depreciation. Replacement cost coverage values a covered loss using the cost to repair or replace damaged property with property of like kind and quality without deducting depreciation, subject to the contract's conditions, limits, and settlement rules.",
    examTip:
      "If a question gives you replacement cost and depreciation and asks for ACV, subtract the depreciation unless the question gives a different valuation method.",
    example:
      "Simplified example: damaged property would cost $12,000 to replace and has $4,000 of depreciation. The ACV is $8,000 before any applicable deductible. A replacement-cost settlement may use the $12,000 replacement figure if the policy requirements are satisfied.",
    keyPoints: [
      "ACV generally reflects depreciation.",
      "Replacement cost generally does not deduct depreciation.",
      "Policy limits and deductibles still matter under either valuation method.",
      "Read the question carefully for whether it asks for value, covered loss, or final claim payment.",
    ],
    question:
      "A covered item has a replacement cost of $10,000 and $3,000 of depreciation. If the policy values the item at actual cash value, what is the simplified ACV before any deductible?",
    options: ["$3,000", "$7,000", "$10,000", "$13,000"],
    correctIndex: 1,
    explanation: "Replacement cost ($10,000) minus depreciation ($3,000) equals an ACV of $7,000.",
    faq: [
      {
        question: "Is actual cash value always replacement cost minus depreciation?",
        answer:
          "That is the common exam-prep shorthand, but actual policy valuation can depend on contract language and applicable law. For a licensing-style question, use the facts and formula the question provides.",
      },
      {
        question: "Does replacement cost mean the insurer always pays the full replacement price?",
        answer:
          "No. Coverage limits, deductibles, loss-settlement conditions, and other policy terms can affect the amount payable.",
      },
    ],
    relatedSlugs: ["deductible", "indemnity", "coinsurance"],
  },
  coinsurance: {
    slug: "coinsurance",
    term: "Coinsurance",
    title: "Coinsurance Formula Explained | Texas P&C Exam Prep | MyEasyPass",
    description:
      "Understand property insurance coinsurance for Texas P&C exam prep, including the carried-versus-required formula, a worked example, and practice question.",
    h1: "Coinsurance: The Formula Without the Confusion",
    lede:
      "Coinsurance questions look intimidating because they combine percentages and property values. Break them into three numbers: insurance carried, insurance required, and the covered loss.",
    definition:
      "A property coinsurance condition generally requires the insured to carry insurance equal to a stated percentage of the property's value. If the insured carries less than the required amount, payment for a partial loss may be reduced according to the policy's coinsurance formula.",
    examTip:
      "Use the classic sequence: determine insurance required, divide insurance carried by insurance required, multiply that fraction by the loss, then apply the deductible if the question calls for it.",
    example:
      "Simplified example: a building is worth $200,000 and the policy has an 80% coinsurance requirement, so $160,000 is required. If the insured carries $120,000 and has a $40,000 covered loss, the ratio is 120,000 / 160,000 = 0.75. The indicated loss payment is $30,000 before any deductible or other policy limitation.",
    keyPoints: [
      "Insurance required = property value × coinsurance percentage.",
      "Coinsurance ratio = insurance carried ÷ insurance required.",
      "Indicated payment = coinsurance ratio × covered loss.",
      "Apply deductibles and policy limits as directed by the question.",
    ],
    question:
      "A property worth $200,000 has an 80% coinsurance requirement. The insured carries $120,000 and suffers a $40,000 covered partial loss. Ignoring the deductible, what is the indicated payment using the coinsurance formula?",
    options: ["$20,000", "$30,000", "$32,000", "$40,000"],
    correctIndex: 1,
    explanation:
      "Required insurance is $160,000. The insured carried 75% of the required amount ($120,000 ÷ $160,000). Seventy-five percent of the $40,000 loss is $30,000.",
    faq: [
      {
        question: "Why does a coinsurance clause exist?",
        answer:
          "It encourages insureds to maintain insurance that bears a stated relationship to the property's value rather than carrying a very small limit and expecting full payment on partial losses.",
      },
      {
        question: "Is coinsurance the same thing as a deductible?",
        answer:
          "No. A deductible is the portion of a covered loss the insured absorbs under the policy. Coinsurance can reduce a partial-loss payment when the insured did not carry the required amount of insurance.",
      },
    ],
    relatedSlugs: ["actual-cash-value-vs-replacement-cost", "deductible", "indemnity"],
  },
  subrogation: {
    slug: "subrogation",
    term: "Subrogation",
    title: "Subrogation Explained | Texas Insurance Exam Prep | MyEasyPass",
    description:
      "Learn subrogation for Texas Property & Casualty insurance exam prep with a plain-English definition, example, and practice question.",
    h1: "Subrogation Explained in Plain English",
    lede:
      "Subrogation is about who gets to pursue the responsible third party after an insurer pays a covered loss. Think: the insurer steps into the insured's shoes to the extent of the payment and applicable rights.",
    definition:
      "Subrogation is the insurer's right, after paying a covered loss, to pursue a responsible third party to recover amounts the insurer paid, subject to policy terms and law. It helps place the ultimate financial responsibility on the party that caused the loss and helps prevent double recovery for the same damage.",
    examTip:
      "When the insurer pays its insured and someone else caused the loss, look for subrogation as the concept that may allow the insurer to seek recovery from that third party.",
    example:
      "Example: a negligent contractor damages an insured building. The property insurer pays the covered claim. The insurer may then pursue the contractor for recovery of amounts it paid, to the extent subrogation rights apply.",
    keyPoints: [
      "The insurer usually pays the insured first under the covered claim.",
      "A responsible third party may then become the recovery target.",
      "The insurer's recovery rights are limited by policy terms and applicable law.",
      "Subrogation helps prevent duplicate recovery for the same loss.",
    ],
    question:
      "An insurer pays its policyholder for covered property damage caused by a negligent third party. Which principle may allow the insurer to seek recovery from the negligent party?",
    options: ["Coinsurance", "Subrogation", "Indemnity period", "Deductible"],
    correctIndex: 1,
    explanation:
      "Subrogation may allow the insurer to pursue the responsible third party after paying the insured's covered loss.",
    faq: [
      {
        question: "Does subrogation mean the insured never has rights against the third party?",
        answer:
          "No. Rights can depend on what was paid, the policy, releases, and applicable law. Exam questions usually focus on the insurer's recovery right after payment.",
      },
      {
        question: "What is the easiest way to remember subrogation?",
        answer:
          "Remember: insurer pays, then insurer may pursue the responsible third party to recover what it paid.",
      },
    ],
    relatedSlugs: ["indemnity", "deductible", "actual-cash-value-vs-replacement-cost"],
  },
  indemnity: {
    slug: "indemnity",
    term: "Indemnity",
    title: "Principle of Indemnity Explained | Texas P&C Exam Prep | MyEasyPass",
    description:
      "Learn the principle of indemnity for Texas Property & Casualty exam prep, including what it means, why it matters, and a practice question.",
    h1: "The Principle of Indemnity",
    lede:
      "The exam-friendly idea behind indemnity is simple: insurance is generally meant to restore a covered loss financially, not create a profit from the loss.",
    definition:
      "In property and casualty insurance, the principle of indemnity generally aims to place the insured in approximately the same financial position after a covered loss as immediately before it, subject to the policy's terms, limits, valuation provisions, and deductibles.",
    examTip:
      "When a question asks why an insured should not profit from a property loss, indemnity is usually the concept being tested.",
    example:
      "Example: if covered property worth $5,000 is destroyed, the insured generally cannot use the loss to collect $10,000 merely to make a profit. The policy's valuation method and limits determine the covered amount.",
    keyPoints: [
      "Indemnity focuses on financial restoration rather than profit.",
      "Policy valuation rules determine how the loss is measured.",
      "Limits, exclusions, and deductibles can reduce the amount paid.",
      "For exam questions, keep property/casualty indemnity concepts separate from life insurance contract principles.",
    ],
    question:
      "Which insurance principle is most closely associated with restoring an insured to approximately the same financial position held before a covered property loss?",
    options: ["Indemnity", "Subrogation", "Adhesion", "Coinsurance"],
    correctIndex: 0,
    explanation:
      "Indemnity is the principle associated with financial restoration after a covered property or casualty loss, rather than allowing profit from the loss.",
    faq: [
      {
        question: "Does indemnity guarantee full reimbursement for every loss?",
        answer:
          "No. The policy's coverage, exclusions, limits, valuation method, and deductible determine what is payable.",
      },
      {
        question: "Is every type of insurance a contract of indemnity?",
        answer:
          "No. Licensing exams often distinguish property/casualty indemnity concepts from life insurance, which has different contract and valuation principles.",
      },
    ],
    relatedSlugs: ["subrogation", "actual-cash-value-vs-replacement-cost", "deductible"],
  },
  deductible: {
    slug: "deductible",
    term: "Deductible",
    title: "Insurance Deductible Explained | Texas P&C Exam Prep | MyEasyPass",
    description:
      "Understand insurance deductibles for Texas Property & Casualty exam prep with a simple claim example, key distinctions, and practice question.",
    h1: "Insurance Deductibles: What the Exam Wants You to Notice",
    lede:
      "A deductible is the part of a covered loss the insured absorbs under the policy before the insurer's payment is calculated, subject to the contract's specific deductible rules.",
    definition:
      "A deductible is an amount or percentage specified by the policy that is borne by the insured when a covered loss occurs. Deductibles reduce small-claim frequency and make the insured share part of the loss.",
    examTip:
      "Do the coverage calculation first, then subtract the deductible when the question tells you the deductible applies to that loss. Watch for percentage deductibles and special deductibles that may work differently.",
    example:
      "Simplified example: a covered loss is $5,000 and a $1,000 deductible applies. If no other limitation changes the calculation, the insurer's indicated payment is $4,000.",
    keyPoints: [
      "A deductible is not the same as a coverage limit.",
      "Some deductibles are fixed dollar amounts; others can be percentages.",
      "A deductible generally reduces the insurer's payment on a covered loss.",
      "Always follow the question's stated policy terms and order of calculation.",
    ],
    question:
      "A policy covers a $5,000 loss and a $1,000 deductible applies. Assuming no other limitation, what is the insurer's indicated payment?",
    options: ["$1,000", "$4,000", "$5,000", "$6,000"],
    correctIndex: 1,
    explanation: "The $1,000 deductible is subtracted from the $5,000 covered loss, leaving an indicated payment of $4,000.",
    faq: [
      {
        question: "Is a deductible the same as coinsurance?",
        answer:
          "No. A deductible is a specified amount or percentage the insured bears on a covered loss. A property coinsurance condition can reduce a partial-loss payment when required insurance was not carried.",
      },
      {
        question: "Does every insurance policy use the same deductible?",
        answer:
          "No. Deductibles vary by policy and coverage, and some policies use special percentage or catastrophe-related deductibles.",
      },
    ],
    relatedSlugs: ["coinsurance", "actual-cash-value-vs-replacement-cost", "indemnity"],
  },
};

const conceptList = Object.values(CONCEPTS);

function ConceptsHub() {
  const canonicalUrl = buildUrl("/texas-insurance-exam/concepts");
  const title = "Texas Insurance Exam Concepts Study Guide | MyEasyPass";
  const description =
    "Study high-value Property & Casualty insurance concepts with plain-English explanations, worked examples, and practice questions for Texas insurance exam prep.";

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
        itemListElement: conceptList.map((item, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: item.term,
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
              {conceptList.map((concept) => (
                <Card key={concept.slug} className="h-full">
                  <CardHeader>
                    <CardTitle>{concept.term}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm leading-relaxed text-muted-foreground">{concept.lede}</p>
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

export default function InsuranceConceptPage() {
  const { slug } = useParams<{ slug: string }>();

  if (slug === "concepts") return <ConceptsHub />;

  const concept = CONCEPTS[slug ?? ""];
  if (!concept) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 container mx-auto px-4 py-20 text-center">
          <h1 className="text-3xl font-bold">Insurance concept not found</h1>
          <p className="mt-3 text-muted-foreground">Browse the free Texas insurance exam concept study guide instead.</p>
          <Button asChild className="mt-6"><Link href="/texas-insurance-exam/concepts">View study concepts</Link></Button>
        </main>
        <Footer />
      </div>
    );
  }

  const canonicalUrl = buildUrl(`/texas-insurance-exam/${concept.slug}`);
  const faqSchema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: concept.faq.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };
  const breadcrumbSchema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: buildUrl("/") },
      { "@type": "ListItem", position: 2, name: "Insurance Exam Concepts", item: buildUrl("/texas-insurance-exam/concepts") },
      { "@type": "ListItem", position: 3, name: concept.term, item: canonicalUrl },
    ],
  };
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: concept.h1,
    description: concept.description,
    mainEntityOfPage: canonicalUrl,
    about: { "@type": "Thing", name: concept.term },
    publisher: {
      "@type": "Organization",
      name: "MyEasyPass",
      url: "https://www.myeasypass.net/",
    },
  };

  useSEO({
    title: concept.title,
    description: concept.description,
    canonicalUrl,
    hreflang: [
      { lang: "en", url: canonicalUrl },
      { lang: "x-default", url: canonicalUrl },
    ],
    jsonLd: [articleSchema, faqSchema, breadcrumbSchema],
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
              <Link href="/texas-insurance-exam/concepts" className="hover:text-foreground">Insurance Exam Concepts</Link>
              <ChevronRight className="h-3.5 w-3.5" aria-hidden="true" />
              <span className="text-foreground">{concept.term}</span>
            </nav>
          </div>
        </div>

        <article>
          <section className="bg-gradient-to-b from-primary/5 to-background py-16 md:py-20">
            <div className="container mx-auto max-w-4xl px-4">
              <Badge variant="secondary">Texas P&C Exam Study Concept</Badge>
              <h1 className="mt-4 text-4xl font-bold tracking-tight md:text-5xl">{concept.h1}</h1>
              <p className="mt-5 text-lg leading-relaxed text-muted-foreground">{concept.lede}</p>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button asChild>
                  <Link
                    href="/free/texas-property-casualty-practice-test"
                    onClick={() => trackEvent("concept_practice_cta_click", { concept: concept.slug })}
                  >
                    <ClipboardCheck className="mr-2 h-4 w-4" aria-hidden="true" />
                    Try Free P&C Practice
                  </Link>
                </Button>
                <Button variant="outline" asChild>
                  <Link href="/texas-property-casualty-exam-prep">
                    <BookOpen className="mr-2 h-4 w-4" aria-hidden="true" />
                    P&C Exam Prep
                  </Link>
                </Button>
              </div>
            </div>
          </section>

          <section className="py-12 md:py-16">
            <div className="container mx-auto grid max-w-5xl gap-6 px-4 lg:grid-cols-[1.25fr_.75fr]">
              <div className="space-y-8">
                <div>
                  <h2 className="text-2xl font-bold">Definition</h2>
                  <p className="mt-3 leading-relaxed text-muted-foreground">{concept.definition}</p>
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Simple example</h2>
                  <p className="mt-3 leading-relaxed text-muted-foreground">{concept.example}</p>
                </div>
              </div>

              <Card className="h-fit border-primary/20 bg-primary/5">
                <CardContent className="p-6">
                  <p className="text-sm font-semibold uppercase tracking-wide text-primary">Exam tip</p>
                  <p className="mt-3 leading-relaxed">{concept.examTip}</p>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="bg-muted/30 py-12 md:py-16">
            <div className="container mx-auto max-w-4xl px-4">
              <h2 className="text-2xl font-bold">Key points to remember</h2>
              <ul className="mt-6 grid gap-4 md:grid-cols-2">
                {concept.keyPoints.map((point) => (
                  <li key={point} className="flex items-start gap-2.5 rounded-lg bg-background p-4">
                    <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="py-12 md:py-16">
            <div className="container mx-auto max-w-3xl px-4">
              <h2 className="text-2xl font-bold">Practice question</h2>
              <Card className="mt-6">
                <CardContent className="p-6">
                  <p className="font-semibold leading-relaxed">{concept.question}</p>
                  <ol className="mt-5 space-y-2">
                    {concept.options.map((option, index) => (
                      <li
                        key={option}
                        className={`rounded-lg border p-3 ${index === concept.correctIndex ? "border-primary/40 bg-primary/5" : ""}`}
                      >
                        <span className="mr-2 font-semibold">{String.fromCharCode(65 + index)}.</span>
                        {option}
                      </li>
                    ))}
                  </ol>
                  <div className="mt-5 rounded-lg bg-muted p-4">
                    <p className="font-semibold">Answer: {String.fromCharCode(65 + concept.correctIndex)} — {concept.options[concept.correctIndex]}</p>
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{concept.explanation}</p>
                  </div>
                </CardContent>
              </Card>
            </div>
          </section>

          <section className="bg-muted/30 py-12 md:py-16">
            <div className="container mx-auto max-w-4xl px-4">
              <h2 className="text-2xl font-bold">Related insurance concepts</h2>
              <div className="mt-6 flex flex-wrap gap-3">
                {concept.relatedSlugs.map((relatedSlug) => (
                  <Button key={relatedSlug} variant="outline" asChild>
                    <Link href={`/texas-insurance-exam/${relatedSlug}`}>
                      {CONCEPTS[relatedSlug]?.term ?? relatedSlug}
                    </Link>
                  </Button>
                ))}
                <Button variant="outline" asChild>
                  <Link href="/texas-insurance-exam/concepts">View all concepts</Link>
                </Button>
              </div>
            </div>
          </section>

          <section className="py-12 md:py-16">
            <div className="container mx-auto max-w-3xl px-4">
              <h2 className="text-2xl font-bold">Frequently asked questions</h2>
              <div className="mt-7 space-y-6">
                {concept.faq.map((item) => (
                  <div key={item.question}>
                    <h3 className="text-lg font-semibold">{item.question}</h3>
                    <p className="mt-2 leading-relaxed text-muted-foreground">{item.answer}</p>
                  </div>
                ))}
              </div>
              <p className="mt-8 text-xs leading-relaxed text-muted-foreground">
                Educational exam-prep content only. MyEasyPass is independent and is not affiliated with or endorsed by the Texas Department of Insurance or any testing provider. Policy language and applicable law control actual coverage.
              </p>
            </div>
          </section>
        </article>
      </main>
      <Footer />
    </div>
  );
}
