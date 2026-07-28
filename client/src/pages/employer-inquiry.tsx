import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/lib/queryClient";
import { trackEvent } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { useToast } from "@/hooks/use-toast";
import { useSEO, buildUrl } from "@/hooks/use-seo";
import { Building2, ArrowLeft, CheckCircle, Loader2 } from "lucide-react";

const EXAM_CATEGORIES = [
  { id: "real_estate", label: "Real Estate", labelEs: "Bienes Raíces" },
  { id: "property_casualty", label: "Property & Casualty Insurance", labelEs: "Seguro de Propiedad y Accidentes" },
  { id: "life_insurance", label: "Life Insurance", labelEs: "Seguro de Vida" },
  { id: "general_lines", label: "General Lines Insurance", labelEs: "Seguro de Líneas Generales" },
];

const employerInquirySchema = z.object({
  companyName: z.string().min(1, "Company name is required").max(200),
  contactName: z.string().min(1, "Contact name is required").max(200),
  email: z.string().email("Please enter a valid email"),
  phone: z.string().max(20).optional().or(z.literal("")),
  teamSize: z.string().max(50).optional().or(z.literal("")),
  categoriesInterested: z.array(z.string()).optional(),
  message: z.string().max(2000).optional().or(z.literal("")),
});

type EmployerInquiryFormData = z.infer<typeof employerInquirySchema>;

export default function EmployerInquiryPage() {
  const { i18n } = useTranslation();
  const isSpanish = i18n.language === "es";
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  useSEO({
    title: isSpanish
      ? "Preparación de Licencias para Equipos | MyEasyPass"
      : "Team Licensing Prep | MyEasyPass",
    description: isSpanish
      ? "Cuéntanos sobre tu equipo y te contactaremos para hablar sobre opciones de preparación de licencias para tu organización."
      : "Tell us about your team and we'll reach out to discuss licensing prep options for your organization.",
    canonicalUrl: buildUrl(isSpanish ? "/employer-inquiry?lang=es" : "/employer-inquiry"),
    hreflang: [
      { lang: "en", url: buildUrl("/employer-inquiry") },
      { lang: "es", url: buildUrl("/employer-inquiry?lang=es") },
      { lang: "x-default", url: buildUrl("/employer-inquiry") },
    ],
  });

  const form = useForm<EmployerInquiryFormData>({
    resolver: zodResolver(employerInquirySchema),
    defaultValues: {
      companyName: "",
      contactName: "",
      email: "",
      phone: "",
      teamSize: "",
      categoriesInterested: [],
      message: "",
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: EmployerInquiryFormData) => {
      const payload = {
        ...data,
        phone: data.phone || undefined,
        teamSize: data.teamSize || undefined,
        message: data.message || undefined,
      };
      const response = await apiRequest("POST", "/api/employer-inquiries", payload);
      return response.json();
    },
    onSuccess: () => {
      trackEvent("employer_inquiry_submit", { categoriesInterested: form.getValues("categoriesInterested") });
      setIsSubmitted(true);
    },
    onError: (error: any) => {
      const message = error?.message || (isSpanish ? "Error al enviar la solicitud" : "Failed to submit inquiry");
      toast({
        title: isSpanish ? "Error" : "Error",
        description: message,
        variant: "destructive",
      });
    },
  });

  const toggleCategory = (categoryId: string) => {
    const current = form.getValues("categoriesInterested") || [];
    form.setValue(
      "categoriesInterested",
      current.includes(categoryId) ? current.filter((c) => c !== categoryId) : [...current, categoryId]
    );
  };

  if (isSubmitted) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 flex items-center justify-center py-12 px-4">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <CardTitle className="text-2xl font-bold">
                {isSpanish ? "Solicitud Recibida" : "Inquiry Received"}
              </CardTitle>
              <CardDescription>
                {isSpanish
                  ? "Gracias por tu interés. Nuestro equipo se pondrá en contacto contigo pronto."
                  : "Thanks for your interest. Our team will reach out to you shortly."}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center">
              <Link href="/">
                <Button variant="outline" className="w-full" data-testid="button-back-home">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {isSpanish ? "Volver al Inicio" : "Back to Home"}
                </Button>
              </Link>
            </CardContent>
          </Card>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 py-12 px-4">
        <Card className="w-full max-w-xl mx-auto">
          <CardHeader className="text-center">
            <Building2 className="h-12 w-12 text-primary mx-auto mb-4" />
            <CardTitle className="text-2xl font-bold">
              {isSpanish ? "Preparación de Licencias para Equipos" : "Team Licensing Prep"}
            </CardTitle>
            <CardDescription>
              {isSpanish
                ? "Cuéntanos sobre tu equipo y te contactaremos para hablar sobre opciones de preparación de licencias para tu organización."
                : "Tell us about your team and we'll reach out to discuss licensing prep options for your organization."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="companyName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{isSpanish ? "Nombre de la Empresa" : "Company Name"}</FormLabel>
                        <FormControl>
                          <Input data-testid="input-company-name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{isSpanish ? "Nombre de Contacto" : "Contact Name"}</FormLabel>
                        <FormControl>
                          <Input data-testid="input-contact-name" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{isSpanish ? "Correo Electrónico" : "Email"}</FormLabel>
                        <FormControl>
                          <Input type="email" autoComplete="email" data-testid="input-email" {...field} />
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
                        <FormLabel>
                          {isSpanish ? "Teléfono" : "Phone"}{" "}
                          <span className="text-muted-foreground font-normal">({isSpanish ? "opcional" : "optional"})</span>
                        </FormLabel>
                        <FormControl>
                          <Input type="tel" data-testid="input-phone" {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                <FormField
                  control={form.control}
                  name="teamSize"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {isSpanish ? "Tamaño del Equipo" : "Team Size"}{" "}
                        <span className="text-muted-foreground font-normal">({isSpanish ? "opcional" : "optional"})</span>
                      </FormLabel>
                      <FormControl>
                        <Input placeholder={isSpanish ? "ej. 10-20 personas" : "e.g. 10-20 people"} data-testid="input-team-size" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <div>
                  <FormLabel className="mb-2 block">
                    {isSpanish ? "Exámenes de Interés" : "Exams of Interest"}{" "}
                    <span className="text-muted-foreground font-normal">({isSpanish ? "opcional" : "optional"})</span>
                  </FormLabel>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {EXAM_CATEGORIES.map((category) => (
                      <label
                        key={category.id}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                        data-testid={`checkbox-interest-${category.id}`}
                      >
                        <Checkbox
                          checked={(form.watch("categoriesInterested") || []).includes(category.id)}
                          onCheckedChange={() => toggleCategory(category.id)}
                        />
                        <span>{isSpanish ? category.labelEs : category.label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="message"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        {isSpanish ? "Mensaje" : "Message"}{" "}
                        <span className="text-muted-foreground font-normal">({isSpanish ? "opcional" : "optional"})</span>
                      </FormLabel>
                      <FormControl>
                        <Textarea rows={4} data-testid="input-message" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <Button type="submit" className="w-full" disabled={mutation.isPending} data-testid="button-submit-inquiry">
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isSpanish ? "Enviando..." : "Submitting..."}
                    </>
                  ) : isSpanish ? (
                    "Enviar Solicitud"
                  ) : (
                    "Submit Inquiry"
                  )}
                </Button>
              </form>
            </Form>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
