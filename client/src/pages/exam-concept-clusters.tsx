import { Link, useParams } from "wouter";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, CheckCircle2, ChevronRight, ClipboardCheck } from "lucide-react";
import { buildUrl, useSEO } from "@/hooks/use-seo";

interface Concept {
  slug: string;
  term: string;
  description: string;
  definition: string;
  examTip: string;
  example: string;
  points: string[];
  question: string;
  options: string[];
  answer: number;
  explanation: string;
}

interface Cluster {
  key: string;
  label: string;
  path: string;
  prepHref: string;
  practiceHref: string;
  intro: string;
  concepts: Concept[];
}

const CLUSTERS: Record<string, Cluster> = {
  "life-health": {
    key: "life-health",
    label: "Life & Health Insurance",
    path: "/texas-life-health-exam",
    prepHref: "/texas-general-lines-exam-prep",
    practiceHref: "/free/texas-general-lines-practice-test",
    intro: "Study foundational life and health insurance concepts in plain English, then test yourself with original practice questions before moving into full Texas General Lines preparation.",
    concepts: [
      {
        slug: "insurable-interest",
        term: "Insurable Interest",
        description: "Understand insurable interest for life insurance exam prep, including when it matters and how to spot it in a licensing-style question.",
        definition: "Insurable interest is a recognized financial or close personal interest in the continued life of another person. In life insurance, exam questions commonly focus on whether that interest exists when the policy is initiated.",
        examTip: "Ask why the policyowner would suffer a genuine loss if the insured died. That relationship is the core clue.",
        example: "A person purchasing life insurance on their own life clearly has an insurable interest. A business may also have an insurable interest in a key employee when the employee's death could create a financial loss.",
        points: ["Look for a legitimate financial or close personal relationship.", "Do not confuse insurable interest with beneficiary designation.", "Focus on the facts at policy inception when the question frames it that way."],
        question: "Which concept helps explain why a policyowner must have a legitimate interest in the continued life of the insured when a life policy is initiated?",
        options: ["Coinsurance", "Insurable interest", "Subrogation", "Deductible"],
        answer: 1,
        explanation: "Insurable interest is the concept that addresses the policyowner's legitimate interest in the insured's continued life.",
      },
      {
        slug: "beneficiary-types",
        term: "Primary vs Contingent Beneficiaries",
        description: "Learn the difference between primary and contingent life insurance beneficiaries with a simple exam-style example.",
        definition: "A primary beneficiary is first in line to receive policy proceeds when the insured dies, subject to the policy. A contingent beneficiary generally receives proceeds if no primary beneficiary is able to receive them under the policy terms.",
        examTip: "Primary means first. Contingent means backup. If the question says the primary beneficiary predeceased the insured, look to the contingent beneficiary unless the facts give another controlling rule.",
        example: "A policy names Jordan as primary beneficiary and Taylor as contingent beneficiary. If Jordan cannot receive the proceeds when the insured dies, Taylor may receive them under the policy terms.",
        points: ["Primary beneficiary comes first.", "Contingent beneficiary is generally next in line.", "Beneficiary rules depend on the policy and applicable law."],
        question: "A life policy names Alex as primary beneficiary and Morgan as contingent beneficiary. Alex dies before the insured. Who is generally next in line under the beneficiary designation?",
        options: ["The insurer", "Morgan", "The agent", "The policyowner automatically"],
        answer: 1,
        explanation: "The contingent beneficiary is generally next in line when no primary beneficiary can receive the proceeds.",
      },
      {
        slug: "whole-life-vs-term-life",
        term: "Whole Life vs Term Life",
        description: "Compare whole life and term life insurance for licensing exam prep with a straightforward side-by-side explanation.",
        definition: "Term life is designed to provide death-benefit protection for a specified period and generally does not build cash value. Whole life is permanent life insurance designed to remain in force for life if required premiums are paid and commonly includes guaranteed cash-value features under the contract.",
        examTip: "If the question emphasizes temporary coverage and lower initial cost, think term. If it emphasizes lifetime protection and cash value, think whole life.",
        example: "Someone needing protection during a 20-year mortgage may consider term coverage. Someone seeking permanent death-benefit protection with cash-value features may consider whole life.",
        points: ["Term: temporary protection for a stated period.", "Whole life: permanent coverage structure.", "Cash value is a key distinction in many exam questions."],
        question: "Which policy type is most commonly associated with coverage for a specified period and no cash-value accumulation?",
        options: ["Whole life", "Term life", "Universal life only", "Annuity"],
        answer: 1,
        explanation: "Term life is commonly associated with temporary death-benefit protection and no cash-value accumulation.",
      },
      {
        slug: "annuity-accumulation-vs-annuitization",
        term: "Annuity Accumulation vs Annuitization",
        description: "Learn the two major annuity phases: accumulation and annuitization, with an original practice question.",
        definition: "The accumulation phase is the period when money is contributed to and grows inside an annuity. Annuitization is the process of converting accumulated value into a stream of income payments according to the selected payout option.",
        examTip: "Accumulation means building value. Annuitization means turning value into income.",
        example: "A client funds an annuity for several years while assets grow. Later, the client elects a payout option that provides monthly income. The first period is accumulation; the payout conversion is annuitization.",
        points: ["Accumulation is the build-up stage.", "Annuitization converts value to income payments.", "Not every withdrawal from an annuity is the same as annuitization."],
        question: "What is the process called when accumulated annuity value is converted into a scheduled stream of income payments?",
        options: ["Subrogation", "Annuitization", "Coinsurance", "Assignment"],
        answer: 1,
        explanation: "Annuitization is the conversion of annuity value into a stream of income payments under a payout option.",
      },
    ],
  },
  "real-estate": {
    key: "real-estate",
    label: "Real Estate",
    path: "/texas-real-estate-exam",
    prepHref: "/texas-real-estate-exam-prep",
    practiceHref: "/free/texas-real-estate-practice-test",
    intro: "Build confidence on core real estate concepts before drilling full practice questions. These pages use plain-English explanations, simple examples, and original exam-style questions.",
    concepts: [
      {
        slug: "real-property-vs-personal-property",
        term: "Real Property vs Personal Property",
        description: "Learn how to distinguish real property from personal property for real estate licensing exam prep.",
        definition: "Real property generally includes land and things permanently attached to it, together with associated rights. Personal property is movable property that is not treated as part of the real estate.",
        examTip: "Ask whether the item is attached and intended to remain with the property. Exam questions often test whether an item has become a fixture.",
        example: "A freestanding refrigerator is typically personal property unless the transaction says otherwise. Built-in cabinetry is ordinarily treated as part of the real property.",
        points: ["Land is real property.", "Movable items are generally personal property.", "Fixtures can begin as personal property and become part of the real property."],
        question: "Which item is most likely to be treated as real property in a typical transaction?",
        options: ["A tenant's laptop", "Built-in kitchen cabinets", "A seller's bicycle", "A removable floor lamp"],
        answer: 1,
        explanation: "Built-in cabinets are attached and ordinarily intended to remain, so they are commonly treated as part of the real property.",
      },
      {
        slug: "fixture-test",
        term: "Fixtures and the Fixture Test",
        description: "Understand the basic factors used to distinguish fixtures from personal property on a real estate exam.",
        definition: "A fixture is an item that was once personal property but has become sufficiently attached or associated with real estate that it is treated as part of the real property. Exam questions may look at attachment, adaptation, intent, and agreements between the parties.",
        examTip: "Do not rely on attachment alone. Intent and the parties' agreement can matter greatly in fixture questions.",
        example: "A custom built-in shelving system designed for a particular wall is more likely to be considered a fixture than a freestanding bookcase that can be moved without altering the property.",
        points: ["Attachment is one factor.", "Adaptation to the property can matter.", "Intent and written agreements can control the result."],
        question: "Which fact most strongly suggests an item may be a fixture rather than ordinary personal property?",
        options: ["It is easy to carry", "It is permanently adapted and attached to the building", "It was purchased recently", "It is valuable"],
        answer: 1,
        explanation: "Permanent attachment and adaptation to the building are strong indicators that an item may be treated as a fixture.",
      },
      {
        slug: "agency-fiduciary-duties",
        term: "Agency and Fiduciary Duties",
        description: "Review the core idea of agency and fiduciary duties for real estate licensing exam prep.",
        definition: "An agency relationship authorizes an agent to act on behalf of a principal. Real estate exam questions commonly test duties such as loyalty, obedience to lawful instructions, disclosure, confidentiality, accounting, and reasonable care, subject to applicable law and the relationship created.",
        examTip: "When the facts ask what the agent owes the client, identify the agency relationship first and then choose the duty that matches the conduct described.",
        example: "If an agent receives earnest money or other funds that must be handled for a client or transaction, the duty of accounting is especially relevant.",
        points: ["Identify who the principal/client is.", "Duties arise from the agency relationship.", "The exact duties and disclosures are governed by applicable law and agreement."],
        question: "Which fiduciary concept is most directly related to properly handling and reporting money or property entrusted to an agent?",
        options: ["Accounting", "Depreciation", "Amortization", "Appreciation"],
        answer: 0,
        explanation: "Accounting is the fiduciary concept associated with properly handling and reporting money or property entrusted to the agent.",
      },
      {
        slug: "market-value-vs-price",
        term: "Market Value vs Price",
        description: "Learn the difference between market value and price for real estate exam prep.",
        definition: "Price is the amount actually paid or agreed to in a transaction. Market value is an opinion or estimate of what a property would likely command under defined market conditions. A property's price can differ from its market value.",
        examTip: "Price is a fact from a transaction. Value is an estimate or opinion under specified assumptions.",
        example: "A buyer may pay above an appraiser's opinion of market value because the property has special value to that buyer. The contract price is still the price; it does not automatically redefine market value.",
        points: ["Price is what was paid or agreed.", "Market value is an estimate under market assumptions.", "Price and value can be different."],
        question: "A home sells for $420,000 while an appraisal estimates market value at $405,000. Which statement is correct?",
        options: ["The price is $405,000", "The market value must become $420,000", "The price is $420,000 and the appraised market value is $405,000", "Price and value must always match"],
        answer: 2,
        explanation: "The transaction price and an opinion of market value are separate concepts and can differ.",
      },
    ],
  },
};

function getConcept(cluster: Cluster, slug?: string) {
  return cluster.concepts.find((concept) => concept.slug === slug);
}

function Hub({ cluster }: { cluster: Cluster }) {
  const canonicalUrl = buildUrl(`${cluster.path}/concepts`);
  useSEO({
    title: `Texas ${cluster.label} Exam Concepts Study Guide | MyEasyPass`,
    description: cluster.intro,
    canonicalUrl,
    hreflang: [{ lang: "en", url: canonicalUrl }, { lang: "x-default", url: canonicalUrl }],
    jsonLd: [{
      "@context": "https://schema.org",
      "@type": "ItemList",
      name: `Texas ${cluster.label} Exam Concepts`,
      itemListElement: cluster.concepts.map((concept, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: concept.term,
        url: buildUrl(`${cluster.path}/${concept.slug}`),
      })),
    }],
  });

  return <Shell>
    <section className="bg-gradient-to-b from-primary/5 to-background py-16">
      <div className="container mx-auto max-w-4xl px-4 text-center">
        <Badge variant="secondary">Free Study Guide</Badge>
        <h1 className="mt-4 text-4xl font-bold md:text-5xl">Texas {cluster.label} Exam Concepts</h1>
        <p className="mx-auto mt-5 max-w-3xl text-lg text-muted-foreground">{cluster.intro}</p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Button asChild><Link href={cluster.practiceHref}><ClipboardCheck className="mr-2 h-4 w-4" />Free Practice Test</Link></Button>
          <Button variant="outline" asChild><Link href={cluster.prepHref}><BookOpen className="mr-2 h-4 w-4" />Full Exam Prep</Link></Button>
        </div>
      </div>
    </section>
    <section className="py-14">
      <div className="container mx-auto grid max-w-5xl gap-5 px-4 md:grid-cols-2">
        {cluster.concepts.map((concept) => <Card key={concept.slug}>
          <CardHeader><CardTitle>{concept.term}</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">{concept.description}</p>
            <Button variant="link" className="mt-3 px-0" asChild><Link href={`${cluster.path}/${concept.slug}`}>Study this concept</Link></Button>
          </CardContent>
        </Card>)}
      </div>
    </section>
  </Shell>;
}

export default function ExamConceptClusterPage({ clusterKey }: { clusterKey: "life-health" | "real-estate" }) {
  const { slug } = useParams<{ slug: string }>();
  const cluster = CLUSTERS[clusterKey];
  if (slug === "concepts") return <Hub cluster={cluster} />;
  const concept = getConcept(cluster, slug);

  if (!concept) return <Shell><main className="container mx-auto px-4 py-20 text-center"><h1 className="text-3xl font-bold">Study concept not found</h1><Button className="mt-6" asChild><Link href={`${cluster.path}/concepts`}>View all concepts</Link></Button></main></Shell>;

  const canonicalUrl = buildUrl(`${cluster.path}/${concept.slug}`);
  useSEO({
    title: `${concept.term} | Texas ${cluster.label} Exam Prep | MyEasyPass`,
    description: concept.description,
    canonicalUrl,
    hreflang: [{ lang: "en", url: canonicalUrl }, { lang: "x-default", url: canonicalUrl }],
    jsonLd: [
      { "@context": "https://schema.org", "@type": "Article", headline: concept.term, description: concept.description, mainEntityOfPage: canonicalUrl, publisher: { "@type": "Organization", name: "MyEasyPass", url: buildUrl("/") } },
      { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: [
        { "@type": "ListItem", position: 1, name: "Home", item: buildUrl("/") },
        { "@type": "ListItem", position: 2, name: `${cluster.label} Concepts`, item: buildUrl(`${cluster.path}/concepts`) },
        { "@type": "ListItem", position: 3, name: concept.term, item: canonicalUrl },
      ] },
    ],
  });

  return <Shell>
    <div className="border-b bg-muted/30"><div className="container mx-auto px-4 py-3"><nav className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground"><Link href="/">Home</Link><ChevronRight className="h-3.5 w-3.5" /><Link href={`${cluster.path}/concepts`}>{cluster.label} Concepts</Link><ChevronRight className="h-3.5 w-3.5" /><span className="text-foreground">{concept.term}</span></nav></div></div>
    <article>
      <section className="bg-gradient-to-b from-primary/5 to-background py-16"><div className="container mx-auto max-w-4xl px-4"><Badge variant="secondary">Exam Study Concept</Badge><h1 className="mt-4 text-4xl font-bold md:text-5xl">{concept.term}</h1><p className="mt-5 text-lg text-muted-foreground">{concept.description}</p><div className="mt-7 flex gap-3"><Button asChild><Link href={cluster.practiceHref}>Try Free Practice</Link></Button><Button variant="outline" asChild><Link href={cluster.prepHref}>Full Exam Prep</Link></Button></div></div></section>
      <section className="py-12"><div className="container mx-auto grid max-w-5xl gap-6 px-4 lg:grid-cols-[1.25fr_.75fr]"><div><h2 className="text-2xl font-bold">Definition</h2><p className="mt-3 leading-relaxed text-muted-foreground">{concept.definition}</p><h2 className="mt-8 text-2xl font-bold">Simple example</h2><p className="mt-3 leading-relaxed text-muted-foreground">{concept.example}</p></div><Card className="h-fit bg-primary/5"><CardContent className="p-6"><p className="text-sm font-semibold uppercase tracking-wide text-primary">Exam tip</p><p className="mt-3">{concept.examTip}</p></CardContent></Card></div></section>
      <section className="bg-muted/30 py-12"><div className="container mx-auto max-w-4xl px-4"><h2 className="text-2xl font-bold">Key points</h2><ul className="mt-6 grid gap-4 md:grid-cols-2">{concept.points.map((point) => <li key={point} className="flex gap-2 rounded-lg bg-background p-4"><CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />{point}</li>)}</ul></div></section>
      <section className="py-12"><div className="container mx-auto max-w-3xl px-4"><h2 className="text-2xl font-bold">Original practice question</h2><Card className="mt-6"><CardContent className="p-6"><p className="font-semibold">{concept.question}</p><ol className="mt-5 space-y-2">{concept.options.map((option, i) => <li key={option} className={`rounded-lg border p-3 ${i === concept.answer ? "border-primary/40 bg-primary/5" : ""}`}><strong>{String.fromCharCode(65 + i)}.</strong> {option}</li>)}</ol><div className="mt-5 rounded-lg bg-muted p-4"><strong>Answer: {String.fromCharCode(65 + concept.answer)} — {concept.options[concept.answer]}</strong><p className="mt-2 text-sm text-muted-foreground">{concept.explanation}</p></div></CardContent></Card><p className="mt-8 text-xs text-muted-foreground">Educational exam-prep content only. MyEasyPass is independent and is not affiliated with or endorsed by a licensing agency or testing provider. Applicable law and official exam outlines control.</p></div></section>
    </article>
  </Shell>;
}

function Shell({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen flex flex-col bg-background"><Navbar /><main className="flex-1">{children}</main><Footer /></div>;
}
