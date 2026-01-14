import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Check, Sparkles } from "lucide-react";

export default function PricingPage() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();

  const { data: prices, isLoading: pricesLoading } = useQuery<any[]>({
    queryKey: ["/api/stripe/prices"],
  });

  const checkoutMutation = useMutation({
    mutationFn: async (priceId: string) => {
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
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const handleSubscribe = (priceId: string) => {
    if (!isAuthenticated) {
      window.location.href = "/api/login";
      return;
    }
    checkoutMutation.mutate(priceId);
  };

  const weeklyFeatures = t("pricing.weekly.features", { returnObjects: true }) as string[];
  const monthlyFeatures = t("pricing.monthly.features", { returnObjects: true }) as string[];

  const weeklyPrice = prices?.find(p => p.recurring_interval === "week" || p.recurring?.interval === "week");
  const monthlyPrice = prices?.find(p => p.recurring_interval === "month" || p.recurring?.interval === "month");

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        <section className="py-20">
          <div className="container mx-auto px-4">
            <div className="text-center mb-12">
              <Badge className="mb-4" variant="secondary">
                <Sparkles className="mr-1 h-3 w-3" />
                Simple Pricing
              </Badge>
              <h1 className="text-4xl font-bold mb-4">{t("pricing.title")}</h1>
              <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
                {t("pricing.subtitle")}
              </p>
            </div>

            <div className="grid gap-8 md:grid-cols-2 max-w-4xl mx-auto">
              <Card className="relative" data-testid="card-pricing-weekly">
                <CardHeader className="text-center pb-8">
                  <CardTitle className="text-2xl font-black tracking-wide">{t("pricing.weekly.name")}</CardTitle>
                  <CardDescription>Perfect for quick preparation</CardDescription>
                  <div className="mt-6">
                    <span className="text-5xl font-bold">
                      {weeklyPrice ? `$${(weeklyPrice.unit_amount / 100).toFixed(2)}` : t("pricing.weekly.price")}
                    </span>
                    <span className="text-muted-foreground text-lg">{t("pricing.weekly.period")}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ul className="space-y-4">
                    {weeklyFeatures.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    variant="outline"
                    size="lg"
                    onClick={() => weeklyPrice && handleSubscribe(weeklyPrice.id)}
                    disabled={checkoutMutation.isPending || pricesLoading}
                    data-testid="button-subscribe-weekly"
                  >
                    {checkoutMutation.isPending ? t("common.loading") : t("pricing.subscribe")}
                  </Button>
                  <p className="text-center text-sm text-muted-foreground">
                    {t("pricing.cancelAnytime")}
                  </p>
                </CardContent>
              </Card>

              <Card className="relative border-primary border-2 shadow-lg" data-testid="card-pricing-monthly">
                <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary px-4 py-1 text-sm">
                    {t("pricing.monthly.savings")}
                  </Badge>
                </div>
                <CardHeader className="text-center pb-8 pt-8">
                  <CardTitle className="text-2xl font-black tracking-wide">{t("pricing.monthly.name")}</CardTitle>
                  <CardDescription>Best value for serious students</CardDescription>
                  <div className="mt-6">
                    <span className="text-5xl font-bold">
                      {monthlyPrice ? `$${(monthlyPrice.unit_amount / 100).toFixed(2)}` : t("pricing.monthly.price")}
                    </span>
                    <span className="text-muted-foreground text-lg">{t("pricing.monthly.period")}</span>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <ul className="space-y-4">
                    {monthlyFeatures.map((feature, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <Check className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={() => monthlyPrice && handleSubscribe(monthlyPrice.id)}
                    disabled={checkoutMutation.isPending || pricesLoading}
                    data-testid="button-subscribe-monthly"
                  >
                    {checkoutMutation.isPending ? t("common.loading") : t("pricing.subscribe")}
                  </Button>
                  <p className="text-center text-sm text-muted-foreground">
                    {t("pricing.cancelAnytime")}
                  </p>
                </CardContent>
              </Card>
            </div>

            <div className="mt-16 text-center">
              <p className="text-muted-foreground mb-6">
                All plans include access to our complete question bank with detailed explanations
              </p>
              <div className="flex flex-wrap justify-center gap-8 text-sm text-muted-foreground">
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  No hidden fees
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Cancel anytime
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Secure payments
                </div>
                <div className="flex items-center gap-2">
                  <Check className="h-4 w-4 text-green-500" />
                  Instant access
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
