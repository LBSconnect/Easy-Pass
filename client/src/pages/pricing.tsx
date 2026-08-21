/**
 * Pricing.
 *
 * WHAT WAS WRONG WITH THIS PAGE
 *
 * It was a pricing page that did not show a price. You had to tick a category
 * before anything but "--" appeared, so someone arriving to answer "what does
 * this cost?" had to commit to a choice first. The checkboxes made it worse by
 * implying you could pick several, when picking a second silently replaced the
 * first - one subscription covers one exam.
 *
 * It also only ever offered monthly. Stripe returns weekly prices too, and the
 * page hard-coded `billingPeriod = 'monthly'`, so anything sold weekly was
 * unreachable through the UI.
 *
 * So: every category shows its own real price up front, selection is a radio
 * group because that is what it actually is, and the billing choice is built
 * from whatever Stripe returns rather than assumed - if only monthly prices
 * exist the toggle does not appear at all.
 *
 * Prices are never invented client-side. If Stripe has no active price for a
 * category, that card says so and cannot be selected; showing a plausible
 * number for something we cannot actually charge would be worse than showing
 * nothing.
 */

import { useState, useMemo, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearch, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { PageShell, PageHeader, SectionHeading } from "@/components/page-shell";
import { EXAM_VISUALS } from "@/lib/examVisuals";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { trackEvent } from "@/lib/analytics";
import { useSEO, buildUrl } from "@/hooks/use-seo";
import type { ExamCategory } from "@shared/schema";
import { Check, Info, Sparkles, TriangleAlert } from "lucide-react";

interface StripePrice {
  id: string;
  unit_amount: number;
  currency: string;
  recurring_interval: string;
  subscription_type: "single" | "bundle";
  allowed_categories: string[];
  billing_period: string;
  product_name: string;
}

type BillingPeriod = "weekly" | "monthly";

// Icons and colours come from EXAM_VISUALS so this page teaches the same code
// as the rest of the app. It previously invented its own - a violet General
// Lines and an emerald Property & Casualty - which contradicted every other
// screen a student had already seen.
const EXAM_CATEGORIES: { id: ExamCategory; label: string; labelEs: string }[] = [
  { id: "real_estate", label: "Real Estate", labelEs: "Bienes Raíces" },
  {
    id: "property_casualty",
    label: "Property & Casualty Insurance",
    labelEs: "Seguro de Propiedad y Accidentes",
  },
  { id: "life_insurance", label: "Life Insurance", labelEs: "Seguro de Vida" },
  {
    id: "general_lines",
    label: "General Lines Insurance",
    labelEs: "Seguro de Líneas Generales",
  },
];

const VALID_CATEGORY_IDS: ExamCategory[] = EXAM_CATEGORIES.map((c) => c.id);

/** What every subscription includes, whichever exam it is for. */
function includedItems(isSpanish: boolean) {
  return isSpanish
    ? [
        "Banco completo de preguntas con explicaciones",
        "Exámenes de práctica cronometrados y simulacros completos",
        "Guía de estudio por tema y seguimiento de progreso",
        "Todo en inglés y español",
      ]
    : [
        "The full question bank, every question explained",
        "Timed quick practice and full mock exams",
        "Topic-by-topic study guide and progress tracking",
        "Everything in both English and Spanish",
      ];
}

export default function PricingPage() {
  const { t, i18n } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const isSpanish = i18n.language === "es";
  const search = useSearch();
  const [, navigate] = useLocation();

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

  const [selectedCategory, setSelectedCategory] = useState<ExamCategory | null>(() => {
    const preselect = new URLSearchParams(search).get("category");
    return preselect && VALID_CATEGORY_IDS.includes(preselect as ExamCategory)
      ? (preselect as ExamCategory)
      : null;
  });

  // Backed out of Stripe. The cancel URL carries the category, so the exam is
  // already re-selected by the initialiser above - what remains is saying so,
  // calmly. Cancelling is a normal part of deciding, not an error.
  const returnedFromCanceledCheckout = useMemo(
    () => new URLSearchParams(search).get("canceled") === "true",
    [search],
  );
  useEffect(() => {
    if (!returnedFromCanceledCheckout) return;
    trackEvent("checkout_canceled", {
      exam_type: selectedCategory,
      category_preserved: selectedCategory !== null,
    });
    // Once per return, like pricing_view above.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The step between the result card and checkout. Without it the funnel has a
  // gap exactly where people are deciding, and an abandonment between "saw the
  // price" and "started checkout" is indistinguishable from never arriving.
  //
  // Records whether the exam arrived preselected, because a visitor who still
  // has to choose one here is in a different position from one who does not.
  const arrivedPreselected = selectedCategory !== null;
  useEffect(() => {
    trackEvent("pricing_view", {
      exam_type: arrivedPreselected ? selectedCategory : null,
      preselected: arrivedPreselected,
    });
    // Once per arrival. Re-firing as they click between exams would count one
    // visit several times and make this step look busier than it is.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const {
    data: prices,
    isLoading: pricesLoading,
    isError: pricesError,
  } = useQuery<StripePrice[]>({
    queryKey: ["/api/stripe/prices"],
  });

  // The endpoint returns an array, but a page that renders four cards off it
  // should not take that on trust - one malformed response would otherwise
  // take the whole page down rather than one card.
  const singlePrices = useMemo(
    () =>
      (Array.isArray(prices) ? prices : []).filter(
        (p) => p?.subscription_type === "single" && typeof p.unit_amount === "number",
      ),
    [prices],
  );

  /** Billing periods we can actually sell, in the order we offer them. */
  const availablePeriods = useMemo<BillingPeriod[]>(
    () =>
      (["monthly", "weekly"] as const).filter((period) =>
        singlePrices.some((p) => p.billing_period === period),
      ),
    [singlePrices],
  );

  const [billingPeriod, setBillingPeriod] = useState<BillingPeriod>("monthly");

  // Prices arrive after first paint, so the default has to settle once they do.
  // Monthly stays preferred when it exists; otherwise fall to whatever Stripe
  // is actually selling rather than showing an empty page.
  useEffect(() => {
    if (availablePeriods.length > 0 && !availablePeriods.includes(billingPeriod)) {
      setBillingPeriod(availablePeriods[0]);
    }
  }, [availablePeriods, billingPeriod]);

  const priceFor = (categoryId: string, period: BillingPeriod) =>
    singlePrices.find(
      (p) => p.billing_period === period && p.allowed_categories?.includes(categoryId),
    );

  const applicablePrice = selectedCategory ? priceFor(selectedCategory, billingPeriod) : undefined;

  const checkoutMutation = useMutation({
    mutationFn: async (priceId: string) => {
      trackEvent("checkout_start", { priceId, category: selectedCategory });
      // The category rides along so a cancelled checkout can bring the
      // student back to this page with their exam still selected.
      const res = await apiRequest("POST", "/api/stripe/checkout", {
        priceId,
        category: selectedCategory ?? undefined,
      });
      const data = await res.json();
      // A 200 with no URL used to leave the button silently doing nothing.
      // Failing here surfaces it as a toast instead of as a dead click.
      if (!data?.url || typeof data.url !== "string") {
        throw new Error(
          isSpanish
            ? "No pudimos abrir el pago. Inténtelo de nuevo."
            : "We couldn't open checkout. Please try again.",
        );
      }
      return data.url as string;
    },
    onSuccess: (url) => {
      // Stripe-hosted checkout, so this genuinely leaves the app.
      window.location.href = url;
    },
    onError: (error: Error) => {
      toast({
        title: isSpanish ? "No se pudo continuar" : "Couldn't continue",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubscribe = () => {
    if (!selectedCategory || !applicablePrice) return;

    if (!isAuthenticated) {
      // Carry the choice through sign-up. Without this the student picks an
      // exam, signs in, and lands on a dashboard that never heard about it.
      //
      // Signup, not login: almost everyone reaching Subscribe without a
      // session is new - they came from an ad, took the readiness check and
      // chose a plan. Landing them on "Log In" reads as being asked for an
      // account they do not have. The signup screen keeps its "Already have
      // an account?" switch, so returning students lose nothing.
      const back = `/pricing?category=${encodeURIComponent(selectedCategory)}`;
      navigate(`/signup?next=${encodeURIComponent(back)}`);
      return;
    }
    checkoutMutation.mutate(applicablePrice.id);
  };

  const formatPrice = (amount: number) => `$${(amount / 100).toFixed(2)}`;
  const perPeriod = (period: BillingPeriod) =>
    period === "weekly" ? (isSpanish ? "semana" : "week") : isSpanish ? "mes" : "month";

  const selected = EXAM_CATEGORIES.find((c) => c.id === selectedCategory);

  return (
    <PageShell>
      <PageHeader
        title={t("pricing.title")}
        subtitle={t("pricing.subtitle")}
        action={
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            {isSpanish ? "Precios simples" : "Simple pricing"}
          </Badge>
        }
      />

      {returnedFromCanceledCheckout && (
        // Deliberately not error styling: nothing went wrong. The one fact a
        // person who backed out needs is that they were not charged; the next
        // most useful is that their choice survived.
        <Card className="mt-6 border-primary/25 bg-primary/[0.04]" data-testid="card-checkout-canceled">
          <CardContent className="flex items-start gap-3 p-4">
            <Info className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
            <p className="min-w-0 text-base leading-relaxed">
              {isSpanish
                ? "El pago fue cancelado y no se realizó ningún cargo. Tu selección de examen sigue aquí — continúa cuando estés listo."
                : "Checkout was canceled and nothing was charged. Your exam selection is still here — pick up whenever you're ready."}
            </p>
          </CardContent>
        </Card>
      )}

      {pricesError && (
        <Card className="mt-6 border-destructive/40" data-testid="card-prices-error">
          <CardContent className="flex items-start gap-3 p-4">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-destructive" aria-hidden="true" />
            <div className="min-w-0">
              <p className="font-medium">
                {isSpanish ? "No pudimos cargar los precios" : "We couldn't load pricing"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {isSpanish
                  ? "Actualice la página o inténtelo de nuevo en unos minutos."
                  : "Refresh the page, or try again in a few minutes."}
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* One price covers one exam, said plainly rather than left to be worked
          out from the fact that the second click clears the first. */}
      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <SectionHeading>
          {isSpanish ? "Elija su examen" : "Choose your exam"}
        </SectionHeading>

        {availablePeriods.length > 1 && (
          <div
            className="inline-flex rounded-lg border p-1"
            role="radiogroup"
            aria-label={isSpanish ? "Periodo de facturación" : "Billing period"}
            data-testid="toggle-billing-period"
          >
            {availablePeriods.map((period) => (
              <button
                key={period}
                type="button"
                role="radio"
                aria-checked={billingPeriod === period}
                onClick={() => setBillingPeriod(period)}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  billingPeriod === period
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`button-period-${period}`}
              >
                {period === "weekly"
                  ? isSpanish
                    ? "Semanal"
                    : "Weekly"
                  : isSpanish
                    ? "Mensual"
                    : "Monthly"}
              </button>
            ))}
          </div>
        )}
      </div>

      <p className="mt-1 text-sm text-muted-foreground">
        {isSpanish
          ? "Una suscripción cubre un examen. Puede cambiar o cancelar cuando quiera."
          : "One subscription covers one exam. Change or cancel whenever you like."}
      </p>

      {pricesLoading ? (
        <div className="mt-4 grid gap-4 sm:grid-cols-2" data-testid="loading-prices">
          {EXAM_CATEGORIES.map((c) => (
            <Skeleton key={c.id} className="h-[132px] w-full rounded-xl" />
          ))}
        </div>
      ) : (
        <div
          className="mt-4 grid gap-4 sm:grid-cols-2"
          role="radiogroup"
          aria-label={isSpanish ? "Categoría de examen" : "Exam category"}
          data-testid="list-categories"
        >
          {EXAM_CATEGORIES.map((category) => {
            const price = priceFor(category.id, billingPeriod);
            const visual = EXAM_VISUALS[category.id];
            const Icon = visual.icon;
            const isSelected = selectedCategory === category.id;
            const unavailable = !price;

            return (
              <button
                key={category.id}
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={unavailable}
                onClick={() => setSelectedCategory(category.id)}
                className={`rounded-xl border-2 p-5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${
                  isSelected
                    ? "border-primary bg-primary/5"
                    : unavailable
                      ? "cursor-not-allowed border-border opacity-60"
                      : "border-border hover-elevate"
                }`}
                data-testid={`button-category-${category.id}`}
              >
                <div className="flex items-start gap-3">
                  <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${visual.tint}`}>
                    <Icon className="h-5 w-5" aria-hidden="true" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <span className="block font-semibold">
                      {isSpanish ? category.labelEs : category.label}
                    </span>
                    {price ? (
                      <span className="mt-1 block">
                        <span className="text-2xl font-bold" data-testid={`text-price-${category.id}`}>
                          {formatPrice(price.unit_amount)}
                        </span>
                        <span className="text-sm font-normal text-muted-foreground">
                          {" / "}
                          {perPeriod(billingPeriod)}
                        </span>
                      </span>
                    ) : (
                      <span className="mt-1 block text-sm text-muted-foreground">
                        {isSpanish
                          ? "No disponible en este momento"
                          : "Not available right now"}
                      </span>
                    )}
                  </div>
                  {isSelected && (
                    <Check className={`h-5 w-5 shrink-0 ${visual.accent}`} aria-hidden="true" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* What you get, and the one button that acts on it. */}
      <Card
        className={`mt-6 border-2 ${applicablePrice ? "border-primary" : "border-border"}`}
        data-testid="card-subscription-summary"
      >
        <CardContent className="p-5">
          <SectionHeading>
            {isSpanish ? "Todas las suscripciones incluyen" : "Every subscription includes"}
          </SectionHeading>

          <ul className="mt-3 grid gap-2 sm:grid-cols-2">
            {includedItems(isSpanish).map((item) => (
              <li key={item} className="flex items-start gap-2 text-base">
                <Check
                  className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                  aria-hidden="true"
                />
                <span className="min-w-0">{item}</span>
              </li>
            ))}
          </ul>

          <div className="mt-5 flex flex-col gap-4 border-t pt-5 sm:flex-row sm:items-end sm:justify-between">
            <div className="min-w-0">
              {selected && applicablePrice ? (
                <>
                  <p className="text-sm text-muted-foreground">
                    {isSpanish ? selected.labelEs : selected.label}
                  </p>
                  <p className="text-3xl font-bold" data-testid="text-total-price">
                    {formatPrice(applicablePrice.unit_amount)}
                    <span className="text-base font-normal text-muted-foreground">
                      {" / "}
                      {perPeriod(billingPeriod)}
                    </span>
                  </p>
                </>
              ) : (
                <p className="text-base text-muted-foreground">
                  {isSpanish
                    ? "Elija un examen arriba para continuar."
                    : "Pick an exam above to continue."}
                </p>
              )}
            </div>

            <Button
              size="lg"
              onClick={handleSubscribe}
              disabled={!applicablePrice || checkoutMutation.isPending}
              data-testid="button-subscribe"
            >
              {checkoutMutation.isPending
                ? isSpanish
                  ? "Procesando..."
                  : "Processing..."
                : t("pricing.subscribe")}
            </Button>
          </div>

          <p className="mt-4 text-center text-sm text-muted-foreground">
            {t("pricing.cancelAnytime")}
          </p>
        </CardContent>
      </Card>

      <div className="mt-8 flex flex-wrap justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground">
        {(isSpanish
          ? ["Sin tarifas ocultas", "Cancele cuando quiera", "Pagos seguros", "Acceso inmediato"]
          : ["No hidden fees", "Cancel anytime", "Secure payments", "Instant access"]
        ).map((item) => (
          <span key={item} className="flex items-center gap-2">
            <Check
              className="h-4 w-4 text-emerald-600 dark:text-emerald-400"
              aria-hidden="true"
            />
            {item}
          </span>
        ))}
      </div>
    </PageShell>
  );
}
