import { useTranslation } from "react-i18next";
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
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
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

  const hasActiveSubscription = profile?.subscriptionStatus === "active";

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">{t("profile.title")}</h1>
            <p className="text-muted-foreground mt-1">
              Manage your account settings and preferences
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <div className="lg:col-span-2 space-y-6">
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
                    <div className="space-y-6">
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
                            data-testid="button-manage-subscription"
                          >
                            <Settings className="mr-2 h-4 w-4" />
                            Manage Billing
                          </Button>

                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button
                                variant="destructive"
                                className="w-full"
                                data-testid="button-cancel-subscription"
                              >
                                {t("profile.cancelSubscription")}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>
                                  {t("profile.cancelSubscription")}
                                </AlertDialogTitle>
                                <AlertDialogDescription>
                                  {t("profile.confirmCancel")}
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>{t("common.cancel")}</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => cancelSubscriptionMutation.mutate()}
                                >
                                  {t("common.confirm")}
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </>
                      )}

                      {!hasActiveSubscription && (
                        <Button className="w-full" asChild>
                          <a href="/pricing">Subscribe Now</a>
                        </Button>
                      )}
                    </>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
