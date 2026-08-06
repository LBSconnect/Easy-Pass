import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import {
  HelpCircle,
  BookOpen,
  Clock,
  Brain,
  Shield,
  MessageSquare,
  ExternalLink,
  Pen,
  CheckCircle,
  Lock,
  Languages
} from "lucide-react";
import { SiReddit, SiQuora } from "react-icons/si";
import { useSEO, buildUrl } from "@/hooks/use-seo";

const guestArticleSchema = z.object({
  name: z.string().min(2, "Name is required"),
  email: z.string().email("Valid email is required"),
  topic: z.string().min(1, "Please select a topic"),
  articleUrl: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  message: z.string().min(50, "Please write at least 50 characters about your article idea"),
});

type GuestArticleForm = z.infer<typeof guestArticleSchema>;

const faqTopics = [
  {
    id: "real-estate",
    icon: BookOpen,
    titleKey: "faq.topics.realEstate.title",
    questions: [
      {
        questionKey: "faq.topics.realEstate.q1.question",
        answerKey: "faq.topics.realEstate.q1.answer",
      },
      {
        questionKey: "faq.topics.realEstate.q2.question",
        answerKey: "faq.topics.realEstate.q2.answer",
      },
      {
        questionKey: "faq.topics.realEstate.q3.question",
        answerKey: "faq.topics.realEstate.q3.answer",
      },
    ],
    resources: [
      { type: "reddit", url: "https://www.reddit.com/r/realtors/comments/10g9p8v/passed_texas_real_estate_exam_tips/", label: "Reddit: Passed Texas Real Estate Exam Tips" },
      { type: "quora", url: "https://www.quora.com/How-do-I-pass-the-Texas-real-estate-exam", label: "Quora: How to Pass Texas Real Estate Exam" },
    ],
  },
  {
    id: "life-insurance",
    icon: Shield,
    titleKey: "faq.topics.lifeInsurance.title",
    questions: [
      {
        questionKey: "faq.topics.lifeInsurance.q1.question",
        answerKey: "faq.topics.lifeInsurance.q1.answer",
      },
      {
        questionKey: "faq.topics.lifeInsurance.q2.question",
        answerKey: "faq.topics.lifeInsurance.q2.answer",
      },
    ],
    resources: [
      { type: "reddit", url: "https://www.reddit.com/r/Insurance/comments/v8c2gj/texas_life_insurance_exam_study_tips/", label: "Reddit: Texas Life Insurance Study Tips" },
      { type: "quora", url: "https://www.quora.com/What-is-the-best-way-to-study-for-the-life-insurance-exam", label: "Quora: Best Way to Study for Life Insurance" },
    ],
  },
  {
    id: "fastest-way",
    icon: Clock,
    titleKey: "faq.topics.fastestWay.title",
    questions: [
      {
        questionKey: "faq.topics.fastestWay.q1.question",
        answerKey: "faq.topics.fastestWay.q1.answer",
      },
      {
        questionKey: "faq.topics.fastestWay.q2.question",
        answerKey: "faq.topics.fastestWay.q2.answer",
      },
    ],
    resources: [
      { type: "reddit", url: "https://www.reddit.com/r/GetStudying/comments/uw5mhl/best_study_techniques_for_certification_exams/", label: "Reddit: Best Study Techniques for Certification" },
      { type: "quora", url: "https://www.quora.com/What-are-the-best-techniques-for-passing-any-exam", label: "Quora: Best Techniques for Passing Any Exam" },
    ],
  },
  {
    id: "stress-free",
    icon: Brain,
    titleKey: "faq.topics.stressFree.title",
    questions: [
      {
        questionKey: "faq.topics.stressFree.q1.question",
        answerKey: "faq.topics.stressFree.q1.answer",
      },
      {
        questionKey: "faq.topics.stressFree.q2.question",
        answerKey: "faq.topics.stressFree.q2.answer",
      },
    ],
    resources: [
      { type: "reddit", url: "https://www.reddit.com/r/GetStudying/comments/10axqj2/managing_test_anxiety_tips/", label: "Reddit: Managing Test Anxiety Tips" },
      { type: "quora", url: "https://www.quora.com/How-can-I-reduce-stress-before-an-exam", label: "Quora: How to Reduce Stress Before an Exam" },
    ],
  },
];

const articleTopics = [
  "How to Pass Texas Real Estate Exam",
  "Texas Life Insurance Exam Tips",
  "Property & Casualty Insurance Strategies",
  "General Lines Insurance Guide",
  "Study Techniques & Time Management",
  "Exam Day Preparation",
  "Career After Licensing",
  "Other",
];

export default function FAQPage() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [submittedSuccessfully, setSubmittedSuccessfully] = useState(false);
  const isSpanish = i18n.language.startsWith("es");
  const canonicalUrl = buildUrl(isSpanish ? "/faq?lang=es" : "/faq");

  useSEO({
    title: `${t("faq.title")} | MyEasyPass`,
    description: t("faq.subtitle"),
    canonicalUrl,
    hreflang: [
      { lang: "en", url: buildUrl("/faq") },
      { lang: "es", url: buildUrl("/faq?lang=es") },
      { lang: "x-default", url: buildUrl("/faq") },
    ],
  });

  const form = useForm<GuestArticleForm>({
    resolver: zodResolver(guestArticleSchema),
    defaultValues: {
      name: "",
      email: "",
      topic: "",
      articleUrl: "",
      message: "",
    },
  });

  const submitArticleMutation = useMutation({
    mutationFn: async (data: GuestArticleForm) => {
      return apiRequest("POST", "/api/guest-articles", data);
    },
    onSuccess: () => {
      setSubmittedSuccessfully(true);
      form.reset();
      toast({
        title: t("faq.guestPost.successTitle"),
        description: t("faq.guestPost.successMessage"),
      });
    },
    onError: () => {
      toast({
        title: t("faq.guestPost.errorTitle"),
        description: t("faq.guestPost.errorMessage"),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: GuestArticleForm) => {
    submitArticleMutation.mutate(data);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <section className="relative bg-gradient-to-br from-primary/10 via-background to-accent/10 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-3xl mx-auto text-center">
            <div className="flex items-center justify-center gap-2 mb-4">
              <HelpCircle className="h-8 w-8 text-primary" />
              <h1 className="text-4xl font-bold tracking-tight" data-testid="text-faq-title">
                {t("faq.title")}
              </h1>
            </div>
            <p className="text-lg text-muted-foreground" data-testid="text-faq-subtitle">
              {t("faq.subtitle")}
            </p>
          </div>
        </div>
      </section>

      <section className="py-12 border-b">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="flex justify-center mb-3">
                  <div className="p-3 rounded-full bg-primary/10">
                    <BookOpen className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <p className="font-bold text-2xl" data-testid="text-trust-questions">800+</p>
                <p className="text-sm text-muted-foreground">{t("faq.trust.questions")}</p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="flex justify-center mb-3">
                  <div className="p-3 rounded-full bg-green-500/10">
                    <Lock className="h-6 w-6 text-green-500" />
                  </div>
                </div>
                <p className="font-bold text-lg" data-testid="text-trust-secure">{t("faq.trust.secureTitle")}</p>
                <p className="text-sm text-muted-foreground">{t("faq.trust.secureDesc")}</p>
              </CardContent>
            </Card>

            <Card className="text-center">
              <CardContent className="pt-6">
                <div className="flex justify-center mb-3">
                  <div className="p-3 rounded-full bg-yellow-500/10">
                    <Languages className="h-6 w-6 text-yellow-500" />
                  </div>
                </div>
                <p className="font-bold text-lg" data-testid="text-trust-bilingual">{t("faq.trust.bilingualTitle")}</p>
                <p className="text-sm text-muted-foreground">{t("faq.trust.bilingualDesc")}</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-12">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto space-y-8">
            {faqTopics.map((topic) => (
              <Card key={topic.id} data-testid={`card-faq-${topic.id}`}>
                <CardHeader>
                  <div className="flex items-center gap-3">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <topic.icon className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{t(topic.titleKey)}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Accordion type="single" collapsible className="w-full">
                    {topic.questions.map((q, idx) => (
                      <AccordionItem key={idx} value={`item-${idx}`}>
                        <AccordionTrigger className="text-left" data-testid={`accordion-${topic.id}-q${idx + 1}`}>
                          {t(q.questionKey)}
                        </AccordionTrigger>
                        <AccordionContent className="text-muted-foreground whitespace-pre-line">
                          {t(q.answerKey)}
                        </AccordionContent>
                      </AccordionItem>
                    ))}
                  </Accordion>
                  
                  <div className="pt-4 border-t">
                    <p className="text-sm font-medium mb-3">{t("faq.externalResources")}</p>
                    <div className="flex flex-wrap gap-2">
                      {topic.resources.map((resource, idx) => (
                        <a
                          key={idx}
                          href={resource.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex"
                        >
                          <Badge variant="outline" className="hover-elevate cursor-pointer gap-1.5">
                            {resource.type === "reddit" ? (
                              <SiReddit className="h-3.5 w-3.5 text-orange-500" />
                            ) : (
                              <SiQuora className="h-3.5 w-3.5 text-red-600" />
                            )}
                            <span className="text-xs">{resource.type === "reddit" ? "Reddit" : "Quora"}</span>
                            <ExternalLink className="h-3 w-3" />
                          </Badge>
                        </a>
                      ))}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <section className="py-12 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader className="text-center">
                <div className="flex justify-center mb-3">
                  <div className="p-3 rounded-full bg-primary/10">
                    <Pen className="h-6 w-6 text-primary" />
                  </div>
                </div>
                <CardTitle className="text-2xl">{t("faq.guestPost.title")}</CardTitle>
                <CardDescription>{t("faq.guestPost.description")}</CardDescription>
                <Badge variant="secondary" className="mt-2">{t("faq.guestPost.code")}: write for us + exam</Badge>
              </CardHeader>
              <CardContent>
                {submittedSuccessfully ? (
                  <div className="text-center py-8">
                    <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                    <h2 className="text-lg font-semibold mb-2">{t("faq.guestPost.successTitle")}</h2>
                    <p className="text-muted-foreground">{t("faq.guestPost.successMessage")}</p>
                    <Button 
                      className="mt-4" 
                      variant="outline"
                      onClick={() => setSubmittedSuccessfully(false)}
                      data-testid="button-submit-another"
                    >
                      {t("faq.guestPost.submitAnother")}
                    </Button>
                  </div>
                ) : (
                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <FormField
                          control={form.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("faq.guestPost.name")}</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder={t("faq.guestPost.namePlaceholder")} 
                                  {...field} 
                                  data-testid="input-guest-name"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="email"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>{t("faq.guestPost.email")}</FormLabel>
                              <FormControl>
                                <Input 
                                  type="email" 
                                  placeholder={t("faq.guestPost.emailPlaceholder")} 
                                  {...field} 
                                  data-testid="input-guest-email"
                                />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <FormField
                        control={form.control}
                        name="topic"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("faq.guestPost.topic")}</FormLabel>
                            <Select onValueChange={field.onChange} defaultValue={field.value}>
                              <FormControl>
                                <SelectTrigger data-testid="select-guest-topic">
                                  <SelectValue placeholder={t("faq.guestPost.topicPlaceholder")} />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {articleTopics.map((topic) => (
                                  <SelectItem key={topic} value={topic}>{topic}</SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="articleUrl"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("faq.guestPost.articleUrl")} ({t("faq.guestPost.optional")})</FormLabel>
                            <FormControl>
                              <Input 
                                type="url"
                                placeholder="https://..." 
                                {...field} 
                                data-testid="input-guest-url"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="message"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>{t("faq.guestPost.message")}</FormLabel>
                            <FormControl>
                              <Textarea 
                                placeholder={t("faq.guestPost.messagePlaceholder")}
                                className="min-h-[120px]"
                                {...field} 
                                data-testid="textarea-guest-message"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <Button 
                        type="submit" 
                        className="w-full min-h-[44px]"
                        disabled={submitArticleMutation.isPending}
                        data-testid="button-submit-article"
                      >
                        {submitArticleMutation.isPending ? (
                          <span className="flex items-center gap-2">
                            <span className="animate-spin h-4 w-4 border-2 border-current border-t-transparent rounded-full" />
                            {t("faq.guestPost.submitting")}
                          </span>
                        ) : (
                          <span className="flex items-center gap-2">
                            <MessageSquare className="h-4 w-4" />
                            {t("faq.guestPost.submit")}
                          </span>
                        )}
                      </Button>
                    </form>
                  </Form>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      <Footer />
    </div>
  );
}
