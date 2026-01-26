import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { 
  Languages, 
  Zap, 
  Smartphone, 
  Clock, 
  TrendingUp, 
  DollarSign,
  Star,
  Check,
  Home,
  Shield,
  Heart,
  FileText,
  ArrowRight,
  BookOpen,
  Target,
  Award,
  UserCheck,
  ClipboardCheck,
  PlayCircle,
  CheckCircle2,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

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

  const categories = [
    { id: "real_estate" as const, questions: 200 },
    { id: "property_casualty" as const, questions: 200 },
    { id: "life_insurance" as const, questions: 199 },
    { id: "general_lines" as const, questions: 196 },
  ];

  const testimonials = [
    {
      name: "Maria G.",
      exam: isSpanish ? "Real Estate - Aprobada" : "Real Estate - Passed",
      quote: isSpanish 
        ? "Estudié en español y aprobé en mi primer intento. Las preguntas eran muy similares al examen real." 
        : "I studied in Spanish and passed on my first try. The questions were very similar to the real exam.",
    },
    {
      name: "James T.",
      exam: isSpanish ? "Property & Casualty - Aprobado" : "Property & Casualty - Passed",
      quote: isSpanish 
        ? "Los exámenes simulados me prepararon perfectamente. Valió cada centavo." 
        : "The mock exams prepared me perfectly. Worth every penny.",
    },
    {
      name: "Sandra L.",
      exam: isSpanish ? "Life Insurance - Aprobada" : "Life Insurance - Passed",
      quote: isSpanish 
        ? "Podía practicar en mi teléfono durante mis descansos. Muy conveniente." 
        : "I could practice on my phone during breaks. So convenient.",
    },
  ];

  const trustIndicators = [
    { value: "5,000+", label: isSpanish ? "Estudiantes" : "Students" },
    { value: "92%", label: isSpanish ? "Tasa de Aprobación" : "Pass Rate" },
    { value: "800+", label: isSpanish ? "Preguntas" : "Questions" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1">
        {/* Hero Section - Clear Value Proposition */}
        <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-primary/3 to-background">
          <div className="container mx-auto px-4 py-16 md:py-24 lg:py-32">
            <div className="max-w-4xl mx-auto text-center space-y-8">
              {/* Trust Badge */}
              <Badge variant="secondary" className="px-4 py-2 text-sm">
                <Star className="mr-1.5 h-3.5 w-3.5 fill-yellow-500 text-yellow-500" />
                {isSpanish ? "Más de 5,000 estudiantes confían en nosotros" : "Trusted by 5,000+ Texas students"}
              </Badge>

              {/* Main Headline - Who it's for & what problem it solves */}
              <h1 className="text-3xl sm:text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-foreground leading-tight">
                {isSpanish ? (
                  <>
                    Aprueba tu Examen de
                    <span className="text-primary"> Licencia de Texas </span>
                    <br className="block sm:hidden" />
                     en el Primer Intento
                  </>
                ) : (
                  <>
                    Pass Your Texas
                   <span className="text-primary whitespace-nowrap"> Licensing Exam</span>{" "}
on the First Try
                  </>
                )}
              </h1>

              {/* Subheadline - Target audience & benefit */}
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
                {isSpanish 
                  ? "Preparación bilingüe para exámenes de Real Estate e Insurance. Practica con preguntas reales, a tu ritmo, en tu idioma." 
                  : "Bilingual exam prep for Real Estate & Insurance. Practice with real exam questions, at your pace, in your language."}
              </p>

              {/* Primary CTA - High Contrast */}
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
                <Button 
                  size="lg" 
                  asChild 
                  className="w-full sm:w-auto min-h-[56px] text-lg px-8 gap-2 shadow-lg"
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
                  className="w-full sm:w-auto min-h-[56px] text-lg px-8"
                  data-testid="cta-hero-view-pricing"
                  data-analytics="hero-cta-pricing"
                >
                  <Link href="/pricing">
                    {isSpanish ? "Ver Precios" : "View Pricing"}
                  </Link>
                </Button>
              </div>

              {/* Trust Indicators */}
              <div className="flex flex-wrap items-center justify-center gap-6 pt-6 text-sm">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>{isSpanish ? "Inglés y Español" : "English & Spanish"}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>{isSpanish ? "Acceso Móvil" : "Mobile Access"}</span>
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                  <span>{isSpanish ? "Cancela Cuando Quieras" : "Cancel Anytime"}</span>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Trust Stats Bar */}
        <section className="border-y bg-muted/30 py-8">
          <div className="container mx-auto px-4">
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16">
              {trustIndicators.map((stat, index) => (
                <div key={index} className="text-center">
                  <div className="text-3xl md:text-4xl font-bold text-primary">{stat.value}</div>
                  <div className="text-sm text-muted-foreground">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How EasyPass Works - 4 Steps */}
        <section className="py-16 md:py-24" id="how-it-works">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
                {isSpanish ? "Cómo Funciona EasyPass" : "How EasyPass Works"}
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                {isSpanish 
                  ? "En 4 simples pasos estarás listo para aprobar tu examen" 
                  : "4 simple steps to get you ready to pass your exam"}
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4 max-w-5xl mx-auto">
              {howItWorks.map((step) => (
                <div 
                  key={step.step} 
                  className="relative text-center p-6 rounded-2xl bg-card border"
                >
                  {/* Step Number */}
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary text-primary-foreground px-3 py-1 text-sm font-bold">
                      {step.step}
                    </Badge>
                  </div>
                  
                  <div className="mt-4 mb-4">
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center">
                      <step.icon className="h-8 w-8 text-primary" />
                    </div>
                  </div>
                  
                  <h3 className="font-semibold text-lg mb-2">{step.title}</h3>
                  <p className="text-sm text-muted-foreground">{step.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* What's Included */}
        <section className="py-16 md:py-24 bg-muted/30" id="whats-included">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
                {isSpanish ? "Qué Incluye Tu Suscripción" : "What's Included"}
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                {isSpanish 
                  ? "Todo lo que necesitas para aprobar tu examen en un solo lugar" 
                  : "Everything you need to pass your exam in one place"}
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
              {whatsIncluded.map((item, index) => (
                <Card key={index} className="relative overflow-hidden border-2 hover-elevate">
                  <div className="absolute top-0 right-0">
                    <Badge variant="secondary" className="rounded-none rounded-bl-lg">
                      {item.highlight}
                    </Badge>
                  </div>
                  <CardHeader className="pt-8">
                    <div className="mb-4 w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center">
                      <item.icon className="h-7 w-7 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{item.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-muted-foreground">{item.description}</p>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* CTA after What's Included */}
            <div className="text-center mt-12">
              <Button 
                size="lg" 
                asChild 
                className="min-h-[56px] text-lg px-8 gap-2"
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

        {/* Exam Categories */}
        <section className="py-16 md:py-24" id="exams">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
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
                  <Card
                    key={category.id}
                    className={`border-2 hover-elevate transition-all ${categoryColors[category.id]}`}
                    data-testid={`card-category-${category.id}`}
                  >
                    <CardHeader className="flex flex-row items-center gap-4 pb-2">
                      <div className={`p-4 rounded-xl ${categoryColors[category.id]}`}>
                        <Icon className="h-8 w-8" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">
                          {t(`categories.${category.id}`)}
                        </CardTitle>
                        <CardDescription className="text-base">
                          {category.questions} {isSpanish ? "preguntas" : "questions"}
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent className="pt-2">
                      <Button 
                        variant="secondary"
                        className="w-full gap-2 opacity-80 hover:opacity-100" 
                        asChild
                        data-testid={`cta-category-${category.id}`}
                        data-analytics={`category-cta-${category.id}`}
                      >
                        <Link href="/signup">
                          {isSpanish ? "Comenzar" : "Start Practicing"}
                          <ArrowRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        {/* Testimonials */}
        <section className="py-16 md:py-24 bg-muted/30" id="testimonials">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12 md:mb-16">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
                {isSpanish ? "Lo Que Dicen Nuestros Estudiantes" : "What Our Students Say"}
              </h2>
            </div>

            <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
              {testimonials.map((review, index) => (
                <Card key={index} className="border">
                  <CardHeader className="pb-2">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {review.name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">{review.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1">
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                          {review.exam}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-0.5 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-muted-foreground leading-relaxed">
                      "{review.quote}"
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        {/* Pricing Preview */}
        <section className="py-16 md:py-24" id="pricing-preview">
          <div className="container mx-auto px-4">
            <div className="max-w-3xl mx-auto text-center">
              <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
                {isSpanish ? "Precios Accesibles" : "Affordable Pricing"}
              </h2>
              <p className="text-muted-foreground text-lg mb-8">
                {isSpanish 
                  ? "Invierte en tu futuro por menos del precio de un libro de texto" 
                  : "Invest in your future for less than the price of a textbook"}
              </p>

              <div className="grid gap-6 md:grid-cols-2 max-w-2xl mx-auto">
                {/* Single Category */}
                <Card className="border-2">
                  <CardHeader className="text-center pb-4">
                    <CardDescription className="text-base">
                      {isSpanish ? "Por Categoría" : "Single Category"}
                    </CardDescription>
                    <div className="mt-2">
                      <span className="text-4xl font-bold">$6.99</span>
                      <span className="text-muted-foreground">/{isSpanish ? "semana" : "week"}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      variant="outline" 
                      className="w-full" 
                      asChild
                      data-testid="cta-pricing-single"
                      data-analytics="pricing-cta-single"
                    >
                      <Link href="/pricing">{isSpanish ? "Ver Detalles" : "View Details"}</Link>
                    </Button>
                  </CardContent>
                </Card>

                {/* Bundle - Best Value */}
                <Card className="border-2 border-primary relative">
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                    <Badge className="bg-primary px-4 py-1">
                      {isSpanish ? "Mejor Valor" : "Best Value"}
                    </Badge>
                  </div>
                  <CardHeader className="text-center pb-4">
                    <CardDescription className="text-base">
                      {isSpanish ? "Paquete Completo" : "Full Bundle"}
                    </CardDescription>
                    <div className="mt-2">
                      <span className="text-4xl font-bold">$12.99</span>
                      <span className="text-muted-foreground">/{isSpanish ? "semana" : "week"}</span>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <Button 
                      className="w-full" 
                      asChild
                      data-testid="cta-pricing-bundle"
                      data-analytics="pricing-cta-bundle"
                    >
                      <Link href="/pricing">{isSpanish ? "Ver Detalles" : "View Details"}</Link>
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <p className="text-sm text-muted-foreground mt-6">
                {isSpanish ? "Cancela cuando quieras. Sin compromisos." : "Cancel anytime. No commitments."}
              </p>
            </div>
          </div>
        </section>

        {/* Final CTA Section */}
        <section className="py-16 md:py-24 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-2xl md:text-3xl lg:text-4xl font-bold mb-4">
              {isSpanish ? "¿Listo para Aprobar tu Examen?" : "Ready to Pass Your Exam?"}
            </h2>
            <p className="text-primary-foreground/80 mb-8 max-w-2xl mx-auto text-lg">
              {isSpanish 
                ? "Únete a miles de estudiantes que aprobaron su examen de licencia de Texas con EasyPass." 
                : "Join thousands who passed their Texas licensing exam with EasyPass."}
            </p>
            <Button 
              size="lg" 
              variant="secondary" 
              asChild 
              className="min-h-[56px] text-lg px-8 gap-2 shadow-lg"
              data-testid="cta-final-start"
              data-analytics="final-cta-start"
            >
              <Link href="/signup">
                {isSpanish ? "Comenzar a Practicar Gratis" : "Start Practicing Free"}
                <ArrowRight className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
