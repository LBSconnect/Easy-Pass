import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link } from "wouter";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { z } from "zod";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { trackEvent } from "@/lib/analytics";
import { useSEO, buildUrl } from "@/hooks/use-seo";
import { MapPin, Phone, Clock, Calendar, ExternalLink, CheckCircle, BookOpen } from "lucide-react";

const callbackFormSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits").max(20),
  preferredDay: z.string().min(1, "Please select a preferred day"),
  preferredTime: z.string().min(1, "Please select a preferred time"),
});

type CallbackFormData = z.infer<typeof callbackFormSchema>;

const TESTING_CENTER_ADDRESS = "616 FM 1960 RD W STE 101, Houston, TX 77090-3048";
const ENCODED_DESTINATION = encodeURIComponent(TESTING_CENTER_ADDRESS);

export default function ScheduleExamPage() {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [origin, setOrigin] = useState("");
  const [showDirections, setShowDirections] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const isSpanish = i18n.language.startsWith("es");

  useSEO({
    title: `${t("scheduleExam.title")} | MyEasyPass`,
    description: t("scheduleExam.subtitle"),
    canonicalUrl: buildUrl(isSpanish ? "/schedule-exam?lang=es" : "/schedule-exam"),
    hreflang: [
      { lang: "en", url: buildUrl("/schedule-exam") },
      { lang: "es", url: buildUrl("/schedule-exam?lang=es") },
      { lang: "x-default", url: buildUrl("/schedule-exam") },
    ],
  });

  const form = useForm<CallbackFormData>({
    resolver: zodResolver(callbackFormSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      preferredDay: "",
      preferredTime: "",
    },
  });

  const submitMutation = useMutation({
    mutationFn: async (data: CallbackFormData) => {
      return apiRequest("POST", "/api/callback-requests", data);
    },
    onSuccess: () => {
      setSubmitted(true);
      form.reset();
      toast({
        title: t("scheduleExam.form.successTitle"),
        description: t("scheduleExam.form.successMessage"),
      });
    },
    onError: () => {
      toast({
        title: t("scheduleExam.form.errorTitle"),
        description: t("scheduleExam.form.errorMessage"),
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: CallbackFormData) => {
    submitMutation.mutate(data);
  };

  const handleGetDirections = () => {
    if (origin.trim()) {
      setShowDirections(true);
    }
  };

  const handleScheduleOfficialClick = () => {
    trackEvent("official_exam_schedule_click", { step: "path_selected" });
    document.getElementById("schedule-official")?.scrollIntoView({ behavior: "smooth" });
  };

  const encodedOrigin = encodeURIComponent(origin);
  const externalMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodedOrigin}&destination=${ENCODED_DESTINATION}`;
  const locationOnlyUrl = `https://www.google.com/maps?q=${ENCODED_DESTINATION}&output=embed`;
  const directionsMapUrl = `https://www.google.com/maps?saddr=${encodedOrigin}&daddr=${ENCODED_DESTINATION}&output=embed`;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1">
        <section className="bg-primary/5 py-8 sm:py-12 md:py-16">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold mb-3 sm:mb-4" data-testid="text-page-title">
              {t("scheduleExam.title")}
            </h1>
            <p className="text-base sm:text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto px-2">
              {t("scheduleExam.subtitle")}
            </p>
          </div>
        </section>

        <section className="py-8 sm:py-10 md:py-14 border-b">
          <div className="container mx-auto px-4">
            <div className="text-center mb-8 sm:mb-10">
              <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-2" data-testid="text-path-chooser-heading">
                {t("scheduleExam.pathChooser.heading")}
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {t("scheduleExam.pathChooser.subheading")}
              </p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6 max-w-4xl mx-auto">
              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-primary" />
                    {t("scheduleExam.pathChooser.preparePath.title")}
                  </CardTitle>
                  <CardDescription>
                    {t("scheduleExam.pathChooser.preparePath.description")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto">
                  <Button className="w-full min-h-[44px]" asChild data-testid="button-path-prepare">
                    <Link href="/exams">{t("scheduleExam.pathChooser.preparePath.cta")}</Link>
                  </Button>
                </CardContent>
              </Card>

              <Card className="flex flex-col">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5 text-primary" />
                    {t("scheduleExam.pathChooser.schedulePath.title")}
                  </CardTitle>
                  <CardDescription>
                    {t("scheduleExam.pathChooser.schedulePath.description")}
                  </CardDescription>
                </CardHeader>
                <CardContent className="mt-auto">
                  <Button
                    className="w-full min-h-[44px]"
                    onClick={handleScheduleOfficialClick}
                    data-testid="button-path-schedule"
                  >
                    {t("scheduleExam.pathChooser.schedulePath.cta")}
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section id="schedule-official" className="py-6 sm:py-8 md:py-12 safe-area-inset scroll-mt-16">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 md:gap-8">
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <MapPin className="h-5 w-5 text-primary" />
                      {t("scheduleExam.location.title")}
                    </CardTitle>
                    <CardDescription>
                      {t("scheduleExam.location.description")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="bg-muted/50 p-4 rounded-lg">
                      <p className="font-semibold text-lg" data-testid="text-address">LBS Exam Testing Center</p>
                      <p className="text-muted-foreground">616 FM 1960 RD W STE 101</p>
                      <p className="text-muted-foreground">Houston, TX 77090-3048</p>
                    </div>
                    
                    <div className="space-y-3">
                      <Label htmlFor="origin">{t("scheduleExam.directions.enterOrigin")}</Label>
                      <div className="flex flex-col sm:flex-row gap-2">
                        <Input
                          id="origin"
                          placeholder={t("scheduleExam.directions.placeholder")}
                          value={origin}
                          onChange={(e) => setOrigin(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleGetDirections()}
                          className="text-base min-h-[44px]"
                          data-testid="input-origin-address"
                        />
                        <Button 
                          onClick={handleGetDirections} 
                          className="w-full sm:w-auto min-h-[44px]"
                          data-testid="button-get-directions"
                        >
                          {t("scheduleExam.directions.getDirections")}
                        </Button>
                      </div>
                    </div>

                    <div className="aspect-[4/3] sm:aspect-video w-full rounded-lg overflow-hidden border">
                      <iframe
                        title="LBS Testing Center Location"
                        width="100%"
                        height="100%"
                        style={{ border: 0 }}
                        loading="lazy"
                        allowFullScreen
                        referrerPolicy="no-referrer-when-downgrade"
                        src={showDirections && origin ? directionsMapUrl : locationOnlyUrl}
                        data-testid="map-iframe"
                      />
                    </div>

                    {showDirections && origin && (
                      <Button variant="outline" className="w-full min-h-[44px]" asChild>
                        <a href={externalMapsUrl} target="_blank" rel="noopener noreferrer" data-testid="link-open-maps">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          {t("scheduleExam.directions.openInMaps")}
                        </a>
                      </Button>
                    )}

                    <Button variant="default" className="w-full min-h-[44px]" asChild>
                      <a href="https://www.lbs4.com/" target="_blank" rel="noopener noreferrer" data-testid="link-test-center-website">
                        <ExternalLink className="h-4 w-4 mr-2" />
                        {t("scheduleExam.visitTestCenter")}
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              </div>

              <div>
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Phone className="h-5 w-5 text-primary" />
                      {t("scheduleExam.form.title")}
                    </CardTitle>
                    <CardDescription>
                      {t("scheduleExam.form.description")}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {submitted ? (
                      <div className="text-center py-8 space-y-4">
                        <CheckCircle className="h-16 w-16 text-green-500 mx-auto" />
                        <h3 className="text-xl font-semibold">{t("scheduleExam.form.thankYou")}</h3>
                        <p className="text-muted-foreground">{t("scheduleExam.form.willContact")}</p>
                        <Button variant="outline" onClick={() => setSubmitted(false)} data-testid="button-new-request">
                          {t("scheduleExam.form.submitAnother")}
                        </Button>
                      </div>
                    ) : (
                      <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="firstName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t("scheduleExam.form.firstName")}</FormLabel>
                                  <FormControl>
                                    <Input placeholder="John" {...field} data-testid="input-first-name" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                            <FormField
                              control={form.control}
                              name="lastName"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel>{t("scheduleExam.form.lastName")}</FormLabel>
                                  <FormControl>
                                    <Input placeholder="Doe" {...field} data-testid="input-last-name" />
                                  </FormControl>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("scheduleExam.form.email")}</FormLabel>
                                <FormControl>
                                  <Input type="email" placeholder="john@example.com" {...field} data-testid="input-email" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <FormField
                            control={form.control}
                            name="phone"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>{t("scheduleExam.form.phone")}</FormLabel>
                                <FormControl>
                                  <Input type="tel" placeholder="(281) 836-5357" {...field} data-testid="input-phone" />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <FormField
                              control={form.control}
                              name="preferredDay"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center gap-1">
                                    <Calendar className="h-4 w-4" />
                                    {t("scheduleExam.form.preferredDay")}
                                  </FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-preferred-day">
                                        <SelectValue placeholder={t("scheduleExam.form.selectDay")} />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="monday">{t("scheduleExam.days.monday")}</SelectItem>
                                      <SelectItem value="tuesday">{t("scheduleExam.days.tuesday")}</SelectItem>
                                      <SelectItem value="wednesday">{t("scheduleExam.days.wednesday")}</SelectItem>
                                      <SelectItem value="thursday">{t("scheduleExam.days.thursday")}</SelectItem>
                                      <SelectItem value="friday">{t("scheduleExam.days.friday")}</SelectItem>
                                      <SelectItem value="saturday">{t("scheduleExam.days.saturday")}</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />

                            <FormField
                              control={form.control}
                              name="preferredTime"
                              render={({ field }) => (
                                <FormItem>
                                  <FormLabel className="flex items-center gap-1">
                                    <Clock className="h-4 w-4" />
                                    {t("scheduleExam.form.preferredTime")}
                                  </FormLabel>
                                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                                    <FormControl>
                                      <SelectTrigger data-testid="select-preferred-time">
                                        <SelectValue placeholder={t("scheduleExam.form.selectTime")} />
                                      </SelectTrigger>
                                    </FormControl>
                                    <SelectContent>
                                      <SelectItem value="morning">{t("scheduleExam.times.morning")}</SelectItem>
                                      <SelectItem value="afternoon">{t("scheduleExam.times.afternoon")}</SelectItem>
                                      <SelectItem value="evening">{t("scheduleExam.times.evening")}</SelectItem>
                                    </SelectContent>
                                  </Select>
                                  <FormMessage />
                                </FormItem>
                              )}
                            />
                          </div>

                          <Button 
                            type="submit" 
                            className="w-full min-h-[44px] text-base" 
                            disabled={submitMutation.isPending}
                            data-testid="button-submit-callback"
                          >
                            {submitMutation.isPending ? t("scheduleExam.form.submitting") : t("scheduleExam.form.submit")}
                          </Button>

                          <Button className="w-full min-h-[44px] text-base bg-green-600 hover:bg-green-700 text-white" asChild>
                            <a
                              href="https://www.lbs4.com/"
                              target="_blank"
                              rel="noopener noreferrer"
                              data-testid="link-ready-to-book"
                              onClick={() => trackEvent("official_exam_schedule_click", { step: "book_now_click" })}
                            >
                              <ExternalLink className="h-4 w-4 mr-2" />
                              {t("scheduleExam.form.readyToBook")}
                            </a>
                          </Button>
                        </form>
                      </Form>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
