import { useState } from "react";
import { useTranslation } from "react-i18next";
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
import { MapPin, Phone, Clock, Calendar, ExternalLink, CheckCircle } from "lucide-react";

const callbackFormSchema = z.object({
  firstName: z.string().min(1, "First name is required").max(100),
  lastName: z.string().min(1, "Last name is required").max(100),
  email: z.string().email("Invalid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits").max(20),
  preferredDay: z.string().min(1, "Please select a preferred day"),
  preferredTime: z.string().min(1, "Please select a preferred time"),
});

type CallbackFormData = z.infer<typeof callbackFormSchema>;

const TESTING_CENTER_ADDRESS = "616 Cypress Creek Road, Suite 575, Houston, TX 77090";
const ENCODED_DESTINATION = encodeURIComponent(TESTING_CENTER_ADDRESS);

export default function ScheduleExamPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [origin, setOrigin] = useState("");
  const [showDirections, setShowDirections] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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

  const encodedOrigin = encodeURIComponent(origin);
  const externalMapsUrl = `https://www.google.com/maps/dir/?api=1&origin=${encodedOrigin}&destination=${ENCODED_DESTINATION}`;
  const locationOnlyUrl = `https://www.google.com/maps?q=${ENCODED_DESTINATION}&output=embed`;
  const directionsMapUrl = `https://www.google.com/maps?saddr=${encodedOrigin}&daddr=${ENCODED_DESTINATION}&output=embed`;

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      
      <main className="flex-1">
        <section className="bg-primary/5 py-16">
          <div className="container mx-auto px-4 text-center">
            <h1 className="text-4xl font-bold mb-4" data-testid="text-page-title">
              {t("scheduleExam.title")}
            </h1>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {t("scheduleExam.subtitle")}
            </p>
          </div>
        </section>

        <section className="py-12">
          <div className="container mx-auto px-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
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
                      <p className="text-muted-foreground">616 Cypress Creek Road</p>
                      <p className="text-muted-foreground">Suite 575</p>
                      <p className="text-muted-foreground">Houston, Texas 77090</p>
                    </div>
                    
                    <div className="space-y-3">
                      <Label htmlFor="origin">{t("scheduleExam.directions.enterOrigin")}</Label>
                      <div className="flex gap-2">
                        <Input
                          id="origin"
                          placeholder={t("scheduleExam.directions.placeholder")}
                          value={origin}
                          onChange={(e) => setOrigin(e.target.value)}
                          onKeyDown={(e) => e.key === "Enter" && handleGetDirections()}
                          data-testid="input-origin-address"
                        />
                        <Button onClick={handleGetDirections} data-testid="button-get-directions">
                          {t("scheduleExam.directions.getDirections")}
                        </Button>
                      </div>
                    </div>

                    <div className="aspect-video w-full rounded-lg overflow-hidden border">
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
                      <Button variant="outline" className="w-full" asChild>
                        <a href={externalMapsUrl} target="_blank" rel="noopener noreferrer" data-testid="link-open-maps">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          {t("scheduleExam.directions.openInMaps")}
                        </a>
                      </Button>
                    )}
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
                            className="w-full" 
                            disabled={submitMutation.isPending}
                            data-testid="button-submit-callback"
                          >
                            {submitMutation.isPending ? t("scheduleExam.form.submitting") : t("scheduleExam.form.submit")}
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
