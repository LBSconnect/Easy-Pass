import { useState, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearch } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { trackEvent } from "@/lib/analytics";
import { useSEO, buildUrl } from "@/hooks/use-seo";
import { Check, Sparkles, AlertCircle, Package } from "lucide-react";

const VALID_CATEGORY_IDS = ["real_estate", "property_casualty", "life_insurance", "general_lines"];

interface StripePrice {
  id: string;
  unit_amount: number;
  currency: string;
  recurring_interval: string;
  subscription_type: 'single' | 'bundle';
  allowed_categories: string[];
  billing_period: string;
  product_name: string;
}

const EXAM_CATEGORIES = [
  { id: 'real_estate', label: 'Real Estate', labelEs: 'Bienes Raíces' },
  { id: 'property_casualty', label: 'Property & Casualty Insurance', labelEs: 'Seguro de Propiedad y Accidentes' },
  { id: 'life_insurance', label: 'Life Insurance', labelEs: 'Seguro de Vida' },
  { id: 'general_lines', label: 'General Lines Insurance', labelEs: 'Seguro de Líneas Generales' },
];

export default function PricingPage() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const isSpanish = i18n.language === 'es';
  const search = useSearch();

  useSEO({
    title: `${t("pricing.title")} | MyEasyPass`,
    description: t("pricing.subtitle"),
    canonicalUrl: buildUrl(isSpanish ? "/pricing?lang=es" : "/pricing"),
    hreflang: [
      { lang: "en", url: buildUrl("/pricing") },
      { lang: "es", url: buildUrl("/pricing?lang=es") },
      { lang: "x-default", url: buildUrl("/pricing") },
    ],
  });

  const [selectedCategories, setSelectedCategories] = useState<string[]>(() => {
    const params = new URLSearchParams(search);
    const preselect = params.get('category');
    return preselect && VALID_CATEGORY_IDS.includes(preselect) ? [preselect] : [];
  });
  const billingPeriod = 'monthly' as const;

  const { data: prices = [], isLoading: pricesLoading, error: pricesError } = useQuery<StripePrice[]>({
    queryKey: ["/api/stripe/prices"],
  });

  const checkoutMutation = useMutation({
    mutationFn: async (priceId: string) => {
      trackEvent("checkout_start", { priceId, categories: selectedCategories });
      const res = await apiRequest("POST", "/api/stripe/checkout", { priceId });
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (error: Error) => {
      toast({
        title: isSpanish ? "Error" : "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const selectionState = useMemo(() => {
    const count = selectedCategories.length;
    if (count === 0) {
      return { type: 'none', message: null, canSubscribe: false };
    }
    if (count === 1) {
      return { type: 'single', message: null, canSubscribe: true };
    }
    return { 
      type: 'bundle', 
      message: isSpanish 
        ? 'Solo se permite un examen por suscripción individual. Para múltiples exámenes, seleccione el paquete de Seguro + Bienes Raíces.'
        : 'Only one exam allowed per single subscription. To subscribe to multiple exams, please choose the Insurance + Real Estate bundle.',
      canSubscribe: true 
    };
  }, [selectedCategories, isSpanish]);

  const applicablePrice = useMemo(() => {
    if (selectedCategories.length === 0) return null;
    
    if (selectedCategories.length === 1) {
      return prices.find(p => 
        p.subscription_type === 'single' && 
        p.allowed_categories.includes(selectedCategories[0]) &&
        p.billing_period === billingPeriod
      );
    }
    
    return prices.find(p => 
      p.subscription_type === 'bundle' && 
      p.billing_period === billingPeriod
    );
  }, [selectedCategories, billingPeriod, prices]);

  const bundlePrice = useMemo(() => {
    return prices.find(p => 
      p.subscription_type === 'bundle' && 
      p.billing_period === billingPeriod
    );
  }, [prices, billingPeriod]);

  const handleCategoryToggle = (categoryId: string) => {
    setSelectedCategories(prev => 
      prev.includes(categoryId)
        ? prev.filter(id => id !== categoryId)
        : [...prev, categoryId]
    );
  };

  const handleSelectBundle = () => {
    setSelectedCategories(['real_estate', 'property_casualty', 'life_insurance', 'general_lines']);
  };

  const handleSubscribe = () => {
    if (!isAuthenticated) {
      window.location.href = "/login";
      return;
    }
    if (applicablePrice) {
      checkoutMutation.mutate(applicablePrice.id);
    }
  };

  const formatPrice = (amount: number) => {
    return `$${(amount / 100).toFixed(2)}`;
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <Badge className="mb-4" variant="secondary">
                <Sparkles className="mr-1 h-3 w-3" />
                {isSpanish ? 'Precios Simples' : 'Simple Pricing'}
              </Badge>
              <h1 className="text-4xl font-bold mb-4">{t("pricing.title")}</h1>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                {t("pricing.subtitle")}
              </p>
            </div>

            <div className="max-w-4xl mx-auto">
              {pricesError && (
                <div className="mb-8 p-4 bg-red-50 dark:bg-red-950/30 rounded-md border border-red-200 dark:border-red-800">
                  <div className="flex items-center gap-3">
                    <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                    <div>
                      <p className="font-medium text-red-800 dark:text-red-200">
                        {isSpanish ? 'Error al cargar los precios' : 'Failed to load pricing'}
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                        {isSpanish
                          ? 'Por favor actualice la página o inténtelo de nuevo más tarde.'
                          : 'Please refresh the page or try again later.'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <Card className="mb-8" data-testid="card-category-selection">
                <CardHeader>
                  <CardTitle className="text-xl">
                    {isSpanish ? '1. Seleccione sus Categorías de Examen' : '1. Select Your Exam Categories'}
                  </CardTitle>
                  <CardDescription>
                    {isSpanish 
                      ? 'Elija los exámenes para los que desea prepararse' 
                      : 'Choose the exams you want to prepare for'}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    {EXAM_CATEGORIES.map((category) => (
                      <label
                        key={category.id}
                        className={`flex items-center gap-3 p-4 rounded-md border cursor-pointer transition-colors ${
                          selectedCategories.includes(category.id)
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover-elevate'
                        }`}
                        data-testid={`checkbox-category-${category.id}`}
                      >
                        <Checkbox
                          checked={selectedCategories.includes(category.id)}
                          onCheckedChange={() => handleCategoryToggle(category.id)}
                        />
                        <span className="font-medium">
                          {isSpanish ? category.labelEs : category.label}
                        </span>
                      </label>
                    ))}
                  </div>

                  {selectionState.type === 'bundle' && (
                    <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-950/30 rounded-md border border-amber-200 dark:border-amber-800">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm text-amber-800 dark:text-amber-200">
                            {selectionState.message}
                          </p>
                          <Button 
                            variant="outline" 
                            size="sm" 
                            className="mt-3"
                            onClick={handleSelectBundle}
                            data-testid="button-select-bundle"
                          >
                            <Package className="mr-2 h-4 w-4" />
                            {isSpanish ? 'Seleccionar Paquete Completo' : 'Select Full Bundle'}
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>


              <Card className={`border-2 ${applicablePrice ? 'border-primary' : 'border-muted'}`} data-testid="card-subscription-summary">
                <CardHeader>
                  <CardTitle className="text-xl">
                    {isSpanish ? '2. Resumen de Suscripción' : '2. Subscription Summary'}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {selectedCategories.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>{isSpanish ? 'Seleccione al menos una categoría de examen arriba' : 'Select at least one exam category above'}</p>
                    </div>
                  ) : (
                    <div className="space-y-6">
                      <div>
                        <h4 className="font-medium mb-2">
                          {selectionState.type === 'bundle' 
                            ? (isSpanish ? 'Paquete de Seguro + Bienes Raíces' : 'Insurance + Real Estate Bundle')
                            : (isSpanish ? 'Suscripción Individual' : 'Single Category Subscription')}
                        </h4>
                        <ul className="space-y-2">
                          {(selectionState.type === 'bundle' ? EXAM_CATEGORIES : EXAM_CATEGORIES.filter(c => selectedCategories.includes(c.id))).map(category => (
                            <li key={category.id} className="flex items-center gap-2 text-sm">
                              <Check className="h-4 w-4 text-green-500" />
                              <span>{isSpanish ? category.labelEs : category.label}</span>
                            </li>
                          ))}
                        </ul>
                      </div>

                      <div className="flex items-center justify-between pt-4 border-t">
                        <div>
                          <p className="text-sm text-muted-foreground">
                            {isSpanish ? 'Facturado mensualmente' : 'Billed monthly'}
                          </p>
                          <p className="text-3xl font-bold">
                            {applicablePrice ? formatPrice(applicablePrice.unit_amount) : '--'}
                            <span className="text-base font-normal text-muted-foreground">
                              /{isSpanish ? 'mes' : 'month'}
                            </span>
                          </p>
                        </div>
                        <Button
                          size="lg"
                          onClick={handleSubscribe}
                          disabled={!selectionState.canSubscribe || checkoutMutation.isPending || pricesLoading || !applicablePrice}
                          data-testid="button-subscribe"
                        >
                          {checkoutMutation.isPending 
                            ? (isSpanish ? 'Procesando...' : 'Processing...') 
                            : (isSpanish ? 'Suscribirse Ahora' : 'Subscribe Now')}
                        </Button>
                      </div>

                      <p className="text-center text-sm text-muted-foreground">
                        {t("pricing.cancelAnytime")}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>

              {bundlePrice && (
                <Card className="mt-8 bg-gradient-to-r from-primary/5 to-primary/10" data-testid="card-bundle-promo">
                  <CardContent className="flex items-center justify-between py-6">
                    <div className="flex items-center gap-4">
                      <Package className="h-10 w-10 text-primary" />
                      <div>
                        <h3 className="font-semibold">
                          {isSpanish ? 'Paquete Completo: Seguro + Bienes Raíces' : 'Complete Bundle: Insurance + Real Estate'}
                        </h3>
                        <p className="text-sm text-muted-foreground">
                          {isSpanish 
                            ? 'Acceso a las 4 categorías de exámenes por un precio especial'
                            : 'Access all 4 exam categories for a special price'}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">
                        {formatPrice(bundlePrice.unit_amount)}
                        <span className="text-sm font-normal text-muted-foreground">
                          /{isSpanish ? 'mes' : 'month'}
                        </span>
                      </p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={handleSelectBundle}
                        data-testid="button-get-bundle"
                      >
                        {isSpanish ? 'Obtener Paquete' : 'Get Bundle'}
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}

              <div className="mt-12 text-center">
                <p className="text-muted-foreground mb-6">
                  {isSpanish 
                    ? 'Todos los planes incluyen acceso a nuestro banco de preguntas completo con explicaciones detalladas'
                    : 'All plans include access to our complete question bank with detailed explanations'}
                </p>
                <div className="flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    {isSpanish ? 'Sin tarifas ocultas' : 'No hidden fees'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    {isSpanish ? 'Cancelar en cualquier momento' : 'Cancel anytime'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    {isSpanish ? 'Pagos seguros' : 'Secure payments'}
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" />
                    {isSpanish ? 'Acceso instantáneo' : 'Instant access'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
