import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { PageShell, PageHeader } from "@/components/page-shell";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { 
  User, 
  CreditCard, 
  Clock, 
  CheckCircle2, 
  XCircle,
  Settings,
  Home,
  Shield,
  Heart,
  FileText,
} from "lucide-react";
import type { UserProfile, ExamResult } from "@shared/schema";

const categoryIcons = {
  real_estate: Home,
  property_casualty: Shield,
  life_insurance: Heart,
  general_lines: FileText,
};

const profileFormSchema = z.object({
  phone: z.string().optional(),
  preferredLanguage: z.enum(["en", "es"]),
});

type ProfileFormValues = z.infer<typeof profileFormSchema>;

export default function ProfilePage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const { toast } = useToast();

  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
  });

  const { data: results, isLoading: resultsLoading } = useQuery<ExamResult[]>({
    queryKey: ["/api/results"],
  });

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      phone: profile?.phone || "",
      preferredLanguage: (profile?.preferredLanguage as "en" | "es") || "en",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (data: ProfileFormValues) => {
      const res = await apiRequest("PATCH", "/api/profile", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t("common.success"),
        description: "Profile updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      if (form.getValues("preferredLanguage") !== i18n.language) {
        i18n.changeLanguage(form.getValues("preferredLanguage"));
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

  const cancelSubscriptionMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/stripe/cancel-subscription");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t("common.success"),
        description: "Subscription cancelled successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const portalMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/stripe/portal");
      return res.json();
    },
    onSuccess: (data) => {
      if (data.url) {
        window.location.href = data.url;
      } else {
        toast({
          title: "Error",
          description: "Unable to open billing portal",
          variant: "destructive",
        });
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

  const onSubmit = (data: ProfileFormValues) => {
    updateProfileMutation.mutate(data);
  };

  const getInitials = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName[0]}${user.lastName[0]}`.toUpperCase();
    }
    if (user?.email) {
      return user.email[0].toUpperCase();
    }
    return "U";
  };

  // "trialing" is a fully valid, exam-taking subscription state (see server/subscriptionCheck.ts
  // checkSubscriptionActive, which also treats "active" and "trialing" as active). Keeping this
  // in sync avoids telling a user on a Stripe trial that they have no subscription and need to
  // resubscribe, which could otherwise cause a duplicate subscription/charge.
  const hasActiveSubscription = profile?.subscriptionStatus === "active" || profile?.subscriptionStatus === "trialing";

  return (
    <PageShell>
          <div className="mb-8">      <PageHeader
        icon={User}
        title={t("profile.title")}
        subtitle="Manage your account settings and preferences"
      />
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="min-w-0 lg:col-span-2 space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <User className="h-5 w-5" />
                    {t("profile.personalInfo")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {profileLoading ? (
                    <div className="space-y-4">
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                      <Skeleton className="h-10 w-full" />
                    </div>
                  ) : (
                    <div className="min-w-0 space-y-6">
                      <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                          <AvatarImage src={user?.profileImageUrl || undefined} />
                          <AvatarFallback className="text-lg">{getInitials()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-medium text-lg">
                            {user?.firstName} {user?.lastName}
                          </p>
                          <p className="text-muted-foreground">{user?.email}</p>
                        </div>
                      </div>

                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                          <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("profile.phone")}</FormLabel>
                                <FormControl>
                                  <Input
                                    placeholder="+1 (555) 123-4567"
                                    {...field}
                                    data-testid="input-phone"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="preferredLanguage"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("profile.language")}</FormLabel>
                                <Select
                                  onValueChange={field.onChange}
                                  defaultValue={field.value}
                                >
                                  <FormControl>
                                    <SelectTrigger data-testid="select-language">
                                      <SelectValue placeholder="Select language" />
                                    </SelectTrigger>
                                  </FormControl>
                                  <SelectContent>
                                    <SelectItem value="en">{t("common.english")}</SelectItem>
                                    <SelectItem value="es">{t("common.spanish")}</SelectItem>
                                  </SelectContent>
                                </Select>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <Button
                            type="submit"
                            disabled={updateProfileMutation.isPending}
                            data-testid="button-save-profile"
                          >
                            {updateProfileMutation.isPending
                              ? t("common.loading")
                              : t("profile.saveChanges")}
                          </Button>
                        </form>
                      </Form>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5" />
                    {t("profile.examHistory")}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {resultsLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : results && results.length > 0 ? (
                    <div className="space-y-4">
                      {results.map((result) => {
                        const Icon = categoryIcons[result.category as keyof typeof categoryIcons];
                        return (
                          <div
                            key={result.id}
                            className="flex items-center gap-4 p-4 rounded-lg border"
                          >
                            <div className="p-2 rounded-lg bg-muted">
                              <Icon className="h-4 w-4" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-sm truncate">
                                {t(`categories.${result.category}`)}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                {new Date(result.completedAt).toLocaleDateString()} -{" "}
                                {Math.floor(result.timeTaken / 60)}:{String(result.timeTaken % 60).padStart(2, "0")}
                              </p>
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="text-right">
                                <span className="font-bold">{result.score}%</span>
                                <p className="text-xs text-muted-foreground">
                                  {result.correctAnswers}/{result.totalQuestions}
                                </p>
                              </div>
                              {result.passed ? (
                                <CheckCircle2 className="h-5 w-5 text-green-500" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-500" />
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">
                      {t("profile.noExams")}
                    </p>
                  )}
                </CardContent>
              </Card>
            </div>

            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    {t("profile.subscription")}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {profileLoading ? (
                    <Skeleton className="h-32 w-full" />
                  ) : (
                    <>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          {t("profile.status")}
                        </span>
                        <Badge variant={hasActiveSubscription ? "default" : "secondary"}>
                          {hasActiveSubscription ? "Active" : "Inactive"}
                        </Badge>
                      </div>

                      {profile?.subscriptionPlan && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {t("profile.plan")}
                          </span>
                          <span className="font-medium capitalize">
                            {profile.subscriptionPlan}
                          </span>
                        </div>
                      )}

                      {hasActiveSubscription && profile?.subscriptionType && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {i18n.language === "es" ? "Tipo" : "Type"}
                          </span>
                          <Badge variant="outline" className="capitalize">
                            {profile.subscriptionType === "bundle" 
                              ? (i18n.language === "es" ? "Paquete Completo" : "Full Bundle")
                              : (i18n.language === "es" ? "Categoría Individual" : "Single Category")}
                          </Badge>
                        </div>
                      )}

                      {hasActiveSubscription && profile?.allowedCategories && profile.allowedCategories.length > 0 && (
                        <div className="space-y-2">
                          <span className="text-sm text-muted-foreground">
                            {i18n.language === "es" ? "Categorías Incluidas" : "Included Categories"}
                          </span>
                          <div className="flex flex-wrap gap-2">
                            {profile.allowedCategories.map((category) => {
                              const Icon = categoryIcons[category as keyof typeof categoryIcons];
                              return (
                                <Badge key={category} variant="secondary" className="flex items-center gap-1">
                                  {Icon && <Icon className="h-3 w-3" />}
                                  <span className="text-xs">{t(`categories.${category}`)}</span>
                                </Badge>
                              );
                            })}
                          </div>
                        </div>
                      )}

                      {profile?.subscriptionEndDate && (
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">
                            {t("profile.nextBilling")}
                          </span>
                          <span className="font-medium">
                            {new Date(profile.subscriptionEndDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}

                      {hasActiveSubscription && (
                        <>
                          <Button
                            variant="outline"
                            className="w-full"
                            onClick={() => portalMutation.mutate()}
                            disabled={portalMutation.isPending}
                            data-testid="button-manage-billing"
                          >
                            {portalMutation.isPending ? (
                              "Loading..."
                            ) : (
                              <>
                                <Settings className="mr-2 h-4 w-4" />
                                {i18n.language === "es" ? "Administrar Facturación" : "Manage Billing"}
                              </>
                            )}
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                className="w-full"
                                disabled={cancelSubscriptionMutation.isPending}
                                data-testid="button-cancel-subscription"
                              >
                                {cancelSubscriptionMutation.isPending 
                                  ? "Canceling..." 
                                  : t("profile.cancelSubscription")}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  {t("profile.cancelSubscription")}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {i18n.language === "es" 
                                    ? "¿Está seguro de que desea cancelar su suscripción? Perderá el acceso a todos los exámenes de práctica al final de su período de facturación actual."
                                    : "Are you sure you want to cancel your subscription? You will lose access to all practice exams at the end of your current billing period."}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => cancelSubscriptionMutation.mutate()}
                                  disabled={cancelSubscriptionMutation.isPending}
                                >
                                  {i18n.language === "es" ? "Sí, cancelar suscripción" : "Yes, cancel subscription"}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}

                      {!hasActiveSubscription && (
                        <Button className="w-full" asChild>
                          <Link href="/pricing">Subscribe Now</Link>
                        </Button>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
    </PageShell>
  );
}
