import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  ArrowRight
} from "lucide-react";
import logoImage from "@assets/log_1768432206192.jpg";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

const categoryIcons = {
  real_estate: Home,
  property_casualty: Shield,
  life_insurance: Heart,
  general_lines: FileText,
};

const categoryColors = {
  real_estate: "bg-blue-500/10 text-blue-600 dark:text-blue-400",
  property_casualty: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  life_insurance: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  general_lines: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
};

export default function LandingPage() {
  const { t } = useTranslation();

  const categories = [
    { id: "real_estate", questions: 150 },
    { id: "property_casualty", questions: 200 },
    { id: "life_insurance", questions: 175 },
    { id: "general_lines", questions: 180 },
  ] as const;

  const features = [
    { key: "bilingual", icon: Languages },
    { key: "instant", icon: Zap },
    { key: "mobile", icon: Smartphone },
    { key: "timed", icon: Clock },
    { key: "progress", icon: TrendingUp },
    { key: "affordable", icon: DollarSign },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-1">
        <section className="relative overflow-hidden bg-gradient-to-b from-primary/5 via-background to-background py-20 lg:py-32">
          <div className="container mx-auto px-4">
            <div className="grid gap-12 lg:grid-cols-2 lg:gap-16 items-center">
              <div className="space-y-8">
                <div className="space-y-4">
                  <Badge variant="secondary" className="px-4 py-1">
                    <Star className="mr-1 h-3 w-3" />
                    {t("hero.trustedBy")}
                  </Badge>
                  <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                    {t("hero.title")}
                  </h1>
                  <p className="text-lg text-muted-foreground max-w-lg">
                    {t("hero.subtitle")}
                  </p>
                </div>
                
                <div className="flex flex-col gap-4 sm:flex-row">
                  <Button size="lg" asChild className="gap-2" data-testid="button-get-started">
                    <a href="/api/login">
                      {t("hero.cta")}
                      <ArrowRight className="h-4 w-4" />
                    </a>
                  </Button>
                  <Button size="lg" variant="outline" asChild data-testid="button-view-pricing">
                    <Link href="/pricing">{t("hero.viewPricing")}</Link>
                  </Button>
                </div>

                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Check className="h-4 w-4 text-green-500" />
                    <span>{t("hero.bilingual")}</span>
                  </div>
                </div>
              </div>

              <div className="relative hidden lg:block">
                <div className="relative aspect-square w-full max-w-lg mx-auto">
                  <div className="absolute inset-0 bg-gradient-to-tr from-primary/20 to-primary/5 rounded-3xl" />
                  <div className="absolute inset-4 bg-card rounded-2xl shadow-2xl border flex items-center justify-center">
                    <div className="text-center p-8 space-y-4">
                      <div className="flex justify-center">
                        <img src={logoImage} alt="LBS EasyPass" className="h-32 w-32 object-contain" />
                      </div>
                      <h3 className="text-2xl font-bold">LBS EasyPass</h3>
                      <p className="text-muted-foreground">
                        Texas Licensing Exam Prep
                      </p>
                      <div className="flex justify-center gap-2">
                        <Badge>Real Estate</Badge>
                        <Badge>Insurance</Badge>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-20 bg-muted/30" id="categories">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">{t("categories.title")}</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {t("categories.subtitle")}
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 max-w-4xl mx-auto">
              {categories.map((category) => {
                const Icon = categoryIcons[category.id];
                return (
                  <Card 
                    key={category.id} 
                    className="hover-elevate transition-all duration-200"
                    data-testid={`card-category-${category.id}`}
                  >
                    <CardHeader className="flex flex-row items-center gap-4">
                      <div className={`p-3 rounded-lg ${categoryColors[category.id]}`}>
                        <Icon className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <CardTitle className="text-lg">
                          {t(`categories.${category.id}`)}
                        </CardTitle>
                        <CardDescription>
                          {category.questions} {t("categories.questions")}
                        </CardDescription>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Button variant="outline" className="w-full gap-2" asChild>
                        <a href="/api/login">
                          {t("categories.practiceNow")}
                          <ArrowRight className="h-4 w-4" />
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-20" id="features">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">{t("features.title")}</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {t("features.subtitle")}
              </p>
            </div>

            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3 max-w-5xl mx-auto">
              {features.map((feature) => {
                const Icon = feature.icon;
                return (
                  <Card key={feature.key} className="text-center">
                    <CardHeader>
                      <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                        <Icon className="h-6 w-6 text-primary" />
                      </div>
                      <CardTitle className="text-lg">
                        {t(`features.${feature.key}.title`)}
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm text-muted-foreground">
                        {t(`features.${feature.key}.description`)}
                      </p>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </section>

        <section className="py-20 bg-muted/30" id="pricing">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">{t("pricing.title")}</h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {t("pricing.subtitle")}
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 max-w-3xl mx-auto">
              <Card className="relative" data-testid="card-pricing-weekly">
                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-xl font-black tracking-wide">{t("pricing.weekly.name")}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{t("pricing.weekly.price")}</span>
                    <span className="text-muted-foreground">{t("pricing.weekly.period")}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {(t("pricing.weekly.features", { returnObjects: true }) as string[]).map(
                      (feature, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      )
                    )}
                  </ul>
                  <Button className="w-full" variant="outline" asChild>
                    <a href="/api/login">{t("pricing.subscribe")}</a>
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    {t("pricing.cancelAnytime")}
                  </p>
                </CardContent>
              </Card>

              <Card className="relative border-primary" data-testid="card-pricing-monthly">
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary">{t("pricing.monthly.savings")}</Badge>
                </div>
                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-xl font-black tracking-wide">{t("pricing.monthly.name")}</CardTitle>
                  <div className="mt-4">
                    <span className="text-4xl font-bold">{t("pricing.monthly.price")}</span>
                    <span className="text-muted-foreground">{t("pricing.monthly.period")}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <ul className="space-y-3">
                    {(t("pricing.monthly.features", { returnObjects: true }) as string[]).map(
                      (feature, index) => (
                        <li key={index} className="flex items-center gap-2">
                          <Check className="h-4 w-4 text-green-500 flex-shrink-0" />
                          <span className="text-sm">{feature}</span>
                        </li>
                      )
                    )}
                  </ul>
                  <Button className="w-full" asChild>
                    <a href="/api/login">{t("pricing.subscribe")}</a>
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    {t("pricing.cancelAnytime")}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-20" id="testimonials">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold mb-4">{t("testimonials.title")}</h2>
            </div>

            <div className="grid gap-6 md:grid-cols-3 max-w-5xl mx-auto">
              {(t("testimonials.reviews", { returnObjects: true }) as Array<{
                name: string;
                exam: string;
                quote: string;
              }>).map((review, index) => (
                <Card key={index}>
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarFallback>{review.name[0]}</AvatarFallback>
                      </Avatar>
                      <div>
                        <CardTitle className="text-base">{review.name}</CardTitle>
                        <CardDescription>{review.exam}</CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex gap-1 mb-3">
                      {[...Array(5)].map((_, i) => (
                        <Star key={i} className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      ))}
                    </div>
                    <p className="text-sm text-muted-foreground italic">
                      "{review.quote}"
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </section>

        <section className="py-20 bg-primary text-primary-foreground">
          <div className="container mx-auto px-4 text-center">
            <h2 className="text-3xl font-bold mb-4">
              Ready to Pass Your Exam?
            </h2>
            <p className="text-primary-foreground/80 mb-8 max-w-2xl mx-auto">
              Join thousands of successful test takers who trusted LBS EasyPass for their exam preparation.
            </p>
            <Button size="lg" variant="secondary" asChild className="gap-2">
              <a href="/api/login">
                {t("hero.cta")}
                <ArrowRight className="h-4 w-4" />
              </a>
            </Button>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
