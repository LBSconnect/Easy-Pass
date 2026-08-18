import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Star,
  Home,
  Shield,
  Heart,
  FileText,
  ArrowRight,
  ExternalLink,
  BookOpen,
  Target,
  Award,
  UserCheck,
  ClipboardCheck,
  PlayCircle,
  CheckCircle2,
  GraduationCap,
  Users,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { AlexiMascot } from "@/components/alexi-mascot";
import { STUDY_ASSISTANT } from "@/lib/studyAssistant";
import { Footer } from "@/components/footer";
import { trackEvent } from "@/lib/analytics";

// Confirmed by owner: LBS4 bootcamp services listing.
const BOOTCAMP_HREF = "https://www.lbs4.com/services?filter=bootcamp";

const categoryIcons = {
  real_estate: Home,
  property_casualty: Shield,
  life_insurance: Heart,
  general_lines: FileText,
};

const categoryColors = {
  real_estate: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
  property_casualty: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
  life_insurance: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  general_lines: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
};

export default function LandingPage() {
  const { t, i18n } = useTranslation();
  const isSpanish = i18n.language === "es";

  const howItWorks = [
    {
      step: 1,
      icon: UserCheck,
      title: isSpanish ? "Crea tu Cuenta" : "Create Your Account",
      description: isSpanish
        ? "Regístrate gratis en menos de 30 segundos"
        : "Sign up free in under 30 seconds",
    },
    {
      step: 2,
      icon: ClipboardCheck,
      title: isSpanish ? "Elige tu Examen" : "Choose Your Exam",
      description: isSpanish
        ? "Selecciona Real Estate o Insurance"
        : "Select Real Estate or Insurance exam",
    },
    {
      step: 3,
      icon: PlayCircle,
      title: isSpanish ? "Practica a tu Ritmo" : "Practice at Your Pace",
      description: isSpanish
        ? "Accede a cientos de preguntas reales"
        : "Access hundreds of real exam questions",
    },
    {
      step: 4,
      icon: Award,
      title: isSpanish ? "Aprueba con Confianza" : "Pass with Confidence",
      description: isSpanish
        ? "Prepárate para aprobar en el primer intento"
        : "Be ready to pass on your first try",
    },
  ];

  const whatsIncluded = [
    {
      icon: Target,
      title: isSpanish ? "Preguntas de Práctica" : "Practice Questions",
      description: isSpanish
        ? "Más de 800 preguntas en formato real del examen con respuestas explicadas"
        : "800+ questions in real exam format with detailed explanations",
      highlight: isSpanish ? "800+ preguntas" : "800+ questions",
    },
    {
      icon: ClipboardCheck,
      title: isSpanish ? "Exámenes Simulados" : "Full Mock Exams",
      description: isSpanish
        ? "Simula el examen completo con cronómetro y puntuación real"
        : "Simulate the full exam with timer and real scoring",
      highlight: isSpanish ? "Cronometrado" : "Timed",
    },
    {
      icon: BookOpen,
      title: isSpanish ? "Guía de Estudio" : "Study Guide",
      description: isSpanish
        ? "Aprende por temas con quizzes interactivos y seguimiento de progreso"
        : "Learn by topic with interactive quizzes and progress tracking",
      highlight: isSpanish ? "Por temas" : "By topic",
    },
  ];

  const alexiOffering = [
    {
      icon: Target,
      title: isSpanish ? "Sabe dónde fallas" : "Knows where you slip",
      body: isSpanish
        ? "Sigue tu precisión por tema y encuentra el que más te cuesta."
        : "Tracks your accuracy by topic and finds the one costing you most.",
    },
    {
      icon: ClipboardCheck,
      title: isSpanish ? "Prepara la sesión" : "Builds the session",
      body: isSpanish
        ? "Explicación, tarjetas y preguntas dirigidas, en un plan que puedes hacer."
        : "Explanation, flashcards and targeted questions, in one plan you can sit.",
    },
    {
      icon: BookOpen,
      title: isSpanish ? "Explica las respuestas" : "Explains the answers",
      body: isSpanish
        ? "Pregunta por qué fallaste y te lo explica con el material aprobado."
        : "Ask why you got one wrong and it explains from approved material.",
    },
  ];

  const categories = [
    { id: "real_estate" as const, questions: 200 },
    { id: "property_casualty" as const, questions: 200 },
    { id: "life_insurance" as const, questions: 199 },
    { id: "general_lines" as const, questions: 196 },
  ];

  // TODO(owner): trust indicators intentionally limited to verifiable facts.
  // Do not add student counts, pass rates, or testimonials without real,
  // owner-supplied and substantiated data.
  const trustIndicators = [
    { value: "800+", label: isSpanish ? "Preguntas" : "Questions" },
    { value: "4", label: isSpanish ? "Categorías" : "Categories" },
    { value: "EN/ES", label: isSpanish ? "Bilingüe" : "Bilingual" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section - compact two-column layout */}
        <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-primary/3 to-background">
          <div className="container mx-auto px-4 py-10 md:py-14 lg:py-16">
            <div className="grid lg:grid-cols-2 gap-10 lg:gap-8 items-center max-w-6xl mx-auto">
              {/* Left column: copy + CTAs */}
              <div className="text-center lg:text-left space-y-5">
                <Badge variant="secondary" className="px-4 py-2 text-sm whitespace-normal text-center sm:whitespace-nowrap">
                  <Star className="mr-1.5 h-3.5 w-3.5 shrink-0 fill-yellow-500 text-yellow-500" />
                  {isSpanish ? "Disponible en Inglés y Español" : "Available in English & Spanish"}
                </Badge>

                <h1 className="text-3xl sm:text-4xl md:text-5xl font-bold tracking-tight text-foreground leading-tight">
                  {isSpanish ? (
                    <>
                      Aprueba tu Examen de{" "}
                      <span className="text-primary">Licencia de Texas</span> en el
                      Primer Intento
                    </>
                  ) : (
                    <>
                      Pass Your Texas{" "}
                      <span className="text-primary">Licensing Exam</span> on the
                      First Try
                    </>
                  )}
                </h1>

                <p className="text-lg text-muted-foreground max-w-xl mx-auto lg:mx-0 leading-relaxed">
                  {isSpanish
                    ? "Preparación bilingüe para exámenes de Real Estate e Insurance. Practica con preguntas reales, a tu ritmo, en tu idioma."
                    : "Bilingual exam prep for Real Estate & Insurance. Practice with real exam questions, at your pace, in your language."}
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-1">
                  <Button
                    size="lg"
                    asChild
                    className="w-full sm:w-auto min-h-[52px] text-lg px-8 gap-2 shadow-lg"
                    data-testid="cta-hero-start-practicing"
                    data-analytics="hero-cta-start"
                  >
                    <Link href="/signup">
                      {isSpanish ? "Comenzar a Practicar" : "Start Practicing"}
                      <ArrowRight className="h-5 w-5" />
                    </Link>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    asChild
                    className="w-full sm:w-auto min-h-[52px] text-lg px-8"
                    data-testid="cta-hero-view-pricing"
                    data-analytics="hero-cta-pricing"
                  >
                    <Link href="/pricing">
                      {isSpanish ? "Ver Precios" : "View Pricing"}
                    </Link>
                  </Button>
                </div>

                <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 pt-2 text-sm">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>{isSpanish ? "Inglés y Español" : "English & Spanish"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>{isSpanish ? "Acceso Móvil" : "Mobile Access"}</span>
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                    <span>{isSpanish ? "Cancela Cuando Quieras" : "Cancel Anytime"}</span>
                  </div>
                </div>
              </div>

              {/* Right column: visual treatment built from existing categories + stats, no fabricated UI */}
              <div className="hidden lg:block" aria-hidden="true">
                <div className="rounded-2xl border bg-card p-6 shadow-lg">
                  <div className="grid grid-cols-2 gap-4">
                    {categories.map((category) => {
                      const Icon = categoryIcons[category.id];
                      return (
                        <div
                          key={category.id}
                          className={`rounded-xl border p-4 ${categoryColors[category.id]}`}
                        >
                          <Icon className="h-7 w-7 mb-3" />
                          <div className="text-sm font-semibold text-foreground">
                            {t(`categories.${category.id}`)}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-4 flex items-center justify-between gap-3 rounded-xl bg-muted/50 px-4 py-3">
                    {trustIndicators.map((stat, index) => (
                      <div key={index} className="text-center">
                        <div className="text-xl font-bold text-primary">{stat.value}</div>
                        <div className="text-xs text-muted-foreground">{stat.label}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Exam Categories - moved up, closer to hero */}
        <section className="py-12 md:py-16" id="exams">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8 md:mb-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">
                {isSpanish ? "Exámenes Disponibles" : "Available Exams"}
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                {isSpanish
                  ? "Preparación completa para todos los exámenes de licencia de Texas"
                  : "Complete prep for all Texas licensing exams"}
              </p>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 max-w-4xl mx-auto">
              {categories.map((category) => {
                const Icon = categoryIcons[category.id];
                return (
                  <Link
                    key={category.id}
                    href="/signup"
                    className={`group block rounded-xl border-2 hover-elevate transition-all p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${categoryColors[category.id]}`}
                    data-testid={`card-category-${category.id}`}
                    data-analytics={`category-cta-${category.id}`}
                  >
                    <div className="flex items-center gap-3 sm:gap-4">
                      <div className={`shrink-0 p-3 sm:p-4 rounded-xl ${categoryColors[category.id]}`}>
                        <Icon className="h-7 w-7 sm:h-8 sm:w-8" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-base sm:text-lg font-semibold text-foreground">
                          {t(`categories.${category.id}`)}
                        </div>
                        <div className="text-sm sm:text-base text-muted-foreground">
                          {category.questions} {isSpanish ? "preguntas" : "questions"}
                        </div>
                      </div>
                      <span className="shrink-0 inline-flex items-center gap-1 text-sm font-medium text-foreground opacity-80 group-hover:opacity-100 group-hover:gap-2 transition-all">
                        {isSpanish ? "Comenzar" : "Start"}
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>
        </section>

        {/* How EasyPass Works */}
        <section className="py-12 md:py-16 bg-muted/30" id="how-it-works">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8 md:mb-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">
                {isSpanish ? "Cómo Funciona EasyPass" : "How EasyPass Works"}
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                {isSpanish
                  ? "En 4 simples pasos estarás listo para aprobar tu examen"
                  : "4 simple steps to get you ready to pass your exam"}
              </p>
            </div>

            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
              {howItWorks.map((step) => (
                <div
                  key={step.step}
                  className="relative text-center p-5 rounded-2xl bg-card border"
                >
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-3 py-1 text-sm font-bold">
                      {step.step}
                    </Badge>
                  </div>

                  <div className="mt-3 mb-3">
                    <div className="mx-auto w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <step.icon className="h-7 w-7 text-primary" />
                    </div>
                  </div>

                  <h3 className="font-semibold text-lg mb-1.5">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Diagnostic assessment teaser */}
        <section className="py-10 md:py-12 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4 text-center md:text-left">
                <div className="hidden sm:flex shrink-0 items-center justify-center w-14 h-14 rounded-2xl bg-primary-foreground/10">
                  <ClipboardCheck className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold mb-1">
                    {isSpanish ? "¿No Sabes si Estás Listo?" : "Not Sure If You're Ready?"}
                  </h2>
                  <p className="text-primary-foreground/80">
                    {isSpanish
                      ? "Responde 10 preguntas rápidas para ver cómo te desempeñarías. Sin necesidad de suscripción."
                      : "Take a short 10-question check to see how you'd do. No subscription required."}
                  </p>
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 shrink-0">
                <Button
                  size="lg"
                  variant="secondary"
                  asChild
                  className="gap-2"
                  onClick={() => trackEvent("diagnostic_cta_click", { source: "homepage_banner" })}
                  data-testid="cta-homepage-diagnostic"
                >
                  <Link href="/readiness-check">
                    {isSpanish ? "Verificar mi Preparación" : "Check My Readiness"}
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  asChild
                  className="border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                  data-testid="cta-homepage-explore-exam-prep"
                >
                  <Link href="#exams">
                    {isSpanish ? "Explorar Preparación" : "Explore Exam Prep"}
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>


        {/* What's Included */}
        <section className="py-12 md:py-16" id="whats-included">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8 md:mb-10">
              <h2 className="text-2xl md:text-3xl font-bold mb-3">
                {isSpanish ? "Qué Incluye Tu Suscripción" : "What's Included"}
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                {isSpanish
                  ? "Todo lo que necesitas para aprobar tu examen en un solo lugar"
                  : "Everything you need to pass your exam in one place"}
              </p>
            </div>

            <div className="grid gap-5 md:grid-cols-3 max-w-5xl mx-auto">
              {whatsIncluded.map((item, index) => (
                <Card key={index} className="relative overflow-hidden border-2 hover-elevate">
                  <div className="absolute top-0 right-0">
                    <Badge variant="secondary" className="rounded-none rounded-bl-lg">
                      {item.highlight}
                    </Badge>
                  </div>
                  <CardHeader className="pt-7 pb-2">
                    <div className="mb-3 w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center">
                      <item.icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            <div className="text-center mt-10">
              <Button
                size="lg"
                asChild
                className="min-h-[52px] text-lg px-8 gap-2"
                data-testid="cta-included-start"
                data-analytics="included-cta-start"
              >
                <Link href="/signup">
                  {isSpanish ? "Comenzar Ahora" : "Get Started Now"}
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
            </div>
          </div>
        </section>


        {/*
          Alexi as a service offering.

          Every claim here describes something the product actually does today:
          the engine picks a concept from real performance data, the session
          runner runs it, and the tutor answers about a question the student has
          already answered using that question's approved explanation. No pass
          rates, no guarantees, and nothing about the assistant "knowing" Texas
          law - it explains approved material, which is a different and honest
          promise.
        */}
        <section className="py-12 md:py-16" id="alexi">
          <div className="container mx-auto px-4 max-w-5xl">
            <div className="grid items-center gap-8 md:grid-cols-[auto_1fr]">
              <div className="mx-auto flex shrink-0 items-center justify-center rounded-full bg-primary/[0.07] p-4 md:mx-0">
                <AlexiMascot size={168} animated label={STUDY_ASSISTANT.displayName} />
              </div>

              <div className="min-w-0 text-center md:text-left">
                <Badge variant="secondary" className="mb-3">
                  {isSpanish ? "Incluido en tu suscripción" : "Included with your subscription"}
                </Badge>
                <h2 className="text-2xl md:text-3xl font-bold">
                  {isSpanish
                    ? `Conoce a ${STUDY_ASSISTANT.displayName}, tu asistente de estudio`
                    : `Meet ${STUDY_ASSISTANT.displayName}, your study assistant`}
                </h2>
                <p className="mt-3 text-muted-foreground text-lg">
                  {isSpanish
                    ? `${STUDY_ASSISTANT.displayName} revisa tu rendimiento real, elige el tema que más te está costando y prepara una sesión corta para ese tema. Nada de adivinar qué estudiar.`
                    : `${STUDY_ASSISTANT.displayName} looks at how you are actually performing, picks the topic costing you the most marks, and builds a short session around it. No more guessing what to study.`}
                </p>

                <ul className="mt-5 grid gap-3 sm:grid-cols-3">
                  {alexiOffering.map((item) => (
                    <li key={item.title} className="flex items-start gap-2.5 text-left">
                      <item.icon className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
                      <span className="min-w-0">
                        <span className="block text-sm font-semibold">{item.title}</span>
                        <span className="block text-sm text-muted-foreground">{item.body}</span>
                      </span>
                    </li>
                  ))}
                </ul>

                {/* The scope is stated plainly rather than left to be assumed:
                    the assistant explains approved material, it does not answer
                    open questions about Texas law. */}
                <p className="mt-5 text-xs text-muted-foreground">
                  {isSpanish
                    ? `${STUDY_ASSISTANT.displayName} explica las preguntas que ya has respondido usando el material aprobado de cada pregunta.`
                    : `${STUDY_ASSISTANT.displayName} explains questions you have already answered, using each question's approved study material.`}
                </p>

                <Button asChild size="lg" className="mt-5" data-testid="button-alexi-signup">
                  <Link href="/signup">
                    {isSpanish ? "Empezar gratis" : "Get started free"}
                    <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </section>

        {/* Live Bootcamp */}
        <section className="py-12 md:py-16 bg-muted/30">
          <div className="container mx-auto px-4 max-w-4xl">
            <Card className="overflow-hidden border-2">
              <div className="grid md:grid-cols-[auto_1fr] items-center gap-6 p-6 md:p-8">
                <div className="hidden md:flex shrink-0 items-center justify-center w-28 h-28 rounded-2xl bg-primary/10">
                  <GraduationCap className="h-14 w-14 text-primary" />
                </div>
                <div>
                  <Badge variant="secondary" className="mb-3">
                    {isSpanish ? "INSTRUCCIÓN EN VIVO" : "LIVE INSTRUCTION"}
                  </Badge>
                  <h2 className="text-xl md:text-2xl font-bold mb-2">
                    {isSpanish ? "¿Prefieres un Bootcamp en Vivo?" : "Prefer a Live Bootcamp?"}
                  </h2>
                  <p className="text-muted-foreground mb-4">
                    {isSpanish
                      ? "Conéctate con bootcamps de repaso de examen en vivo y nuestro centro de exámenes en Houston."
                      : "Connect with live exam-cram bootcamps and our Houston testing center."}
                  </p>
                  <div className="flex flex-wrap gap-x-5 gap-y-2 mb-5 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>{isSpanish ? "Instrucción en vivo" : "Live, in-person instruction"}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                      <span>{isSpanish ? "Ubicación en Houston" : "Houston location"}</span>
                    </div>
                  </div>
                  <a href={BOOTCAMP_HREF} target="_blank" rel="noopener noreferrer">
                    <Button
                      className="gap-2"
                      onClick={() => trackEvent("bootcamp_cta_click", { source: "homepage" })}
                      data-testid="button-homepage-bootcamp-cta"
                    >
                      {isSpanish ? "Ver Bootcamps en Vivo" : "See Live Exam Bootcamps"}
                      <ExternalLink className="h-4 w-4" />
                    </Button>
                  </a>
                </div>
              </div>
            </Card>
          </div>
        </section>

        {/* Team Licensing */}
        <section className="py-12 md:py-16 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 max-w-4xl">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-4 text-center md:text-left">
                <div className="hidden sm:flex shrink-0 items-center justify-center w-14 h-14 rounded-2xl bg-primary-foreground/10">
                  <Users className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="text-xl md:text-2xl font-bold mb-1">
                    {isSpanish ? "Preparando a tu Equipo" : "Preparing a Team for Licensing"}
                  </h2>
                  <p className="text-primary-foreground/80">
                    {isSpanish
                      ? "Opciones de preparación de licencias para equipos y organizaciones."
                      : "Licensing prep options for teams and organizations."}
                  </p>
                </div>
              </div>
              <Button
                size="lg"
                variant="secondary"
                asChild
                className="gap-2 shrink-0"
                data-testid="button-homepage-employer-cta"
              >
                <Link href="/employer-inquiry">
                  {isSpanish ? "Solicitar Información" : "Request Team Information"}
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-12 md:py-16 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">
              {isSpanish ? "¿Listo para Aprobar tu Examen?" : "Ready to Pass Your Exam?"}
            </h2>
            <p className="text-primary-foreground/80 mb-6 max-w-2xl mx-auto text-lg">
              {isSpanish
                ? "Prepárate hoy para tu examen de licencia de Texas con EasyPass."
                : "Get ready today for your Texas licensing exam with EasyPass."}
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                size="lg"
                variant="secondary"
                asChild
                className="min-h-[52px] text-lg px-8 gap-2 shadow-lg"
                data-testid="cta-final-start"
                data-analytics="final-cta-start"
              >
                <Link href="/signup">
                  {isSpanish ? "Comenzar a Practicar" : "Start Practicing Today"}
                  <ArrowRight className="h-5 w-5" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
                className="min-h-[52px] text-lg px-8 border-primary-foreground/30 text-primary-foreground hover:bg-primary-foreground/10"
                data-testid="cta-final-pricing"
                data-analytics="final-cta-pricing"
              >
                <Link href="/pricing">
                  {isSpanish ? "Ver Precios" : "View Pricing"}
                </Link>
              </Button>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
