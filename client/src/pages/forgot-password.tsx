import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { PageShell } from "@/components/page-shell";
import { useToast } from "@/hooks/use-toast";
import { Mail, ArrowLeft, CheckCircle, Loader2 } from "lucide-react";

const forgotPasswordSchema = z.object({
  email: z.string().email("Please enter a valid email"),
});

type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

export default function ForgotPasswordPage() {
  const { t, i18n } = useTranslation();
  const isSpanish = i18n.language === 'es';
  const [isSubmitted, setIsSubmitted] = useState(false);
  const { toast } = useToast();

  const form = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const mutation = useMutation({
    mutationFn: async (data: ForgotPasswordFormData) => {
      const response = await apiRequest("POST", "/api/forgot-password", data);
      return response.json();
    },
    onSuccess: () => {
      setIsSubmitted(true);
    },
    onError: (error: any) => {
      const message = error?.message || (isSpanish ? 'Error al procesar la solicitud' : 'Failed to process request');
      toast({
        title: isSpanish ? 'Error' : 'Error',
        description: message,
        variant: 'destructive',
      });
    },
  });

  if (isSubmitted) {
    return (
      <PageShell width="narrow" centered>
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <CardTitle as="h1" className="text-2xl font-bold">
                {isSpanish ? 'Revisa tu Correo' : 'Check Your Email'}
              </CardTitle>
              <CardDescription>
                {isSpanish 
                  ? 'Si existe una cuenta con ese correo electrónico, te hemos enviado un enlace para restablecer tu contraseña.'
                  : 'If an account exists with that email, we\'ve sent you a password reset link.'}
              </CardDescription>
            </CardHeader>
            <CardContent className="text-center space-y-4">
              <p className="text-base leading-relaxed text-muted-foreground">
                {isSpanish 
                  ? 'El enlace expirará en 1 hora. Revisa también tu carpeta de spam.'
                  : 'The link will expire in 1 hour. Please also check your spam folder.'}
              </p>
              <Link href="/login">
                <Button variant="outline" className="w-full" data-testid="button-back-to-login">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  {isSpanish ? 'Volver al Inicio de Sesión' : 'Back to Login'}
                </Button>
              </Link>
            </CardContent>
          </Card>
    </PageShell>
    );
  }

  return (
    <PageShell width="narrow" centered>
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <Mail className="h-12 w-12 text-primary mx-auto mb-4" />
            <CardTitle as="h1" className="text-2xl font-bold">
              {isSpanish ? 'Restablecer Contraseña' : 'Reset Password'}
            </CardTitle>
            <CardDescription>
              {isSpanish 
                ? 'Ingresa tu correo electrónico y te enviaremos un enlace para restablecer tu contraseña.'
                : 'Enter your email address and we\'ll send you a link to reset your password.'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
                <FormField
                  control={form.control}
                  name="email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>{isSpanish ? 'Correo Electrónico' : 'Email'}</FormLabel>
                      <FormControl>
                        <Input 
                          type="email" 
                          placeholder="you@example.com" 
                          autoComplete="email"
                          data-testid="input-forgot-email"
                          {...field} 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <Button 
                  type="submit" 
                  className="w-full" 
                  disabled={mutation.isPending}
                  data-testid="button-send-reset"
                >
                  {mutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      {isSpanish ? 'Enviando...' : 'Sending...'}
                    </>
                  ) : (
                    isSpanish ? 'Enviar Enlace de Restablecimiento' : 'Send Reset Link'
                  )}
                </Button>
              </form>
            </Form>

            <div className="mt-6 text-center">
              <Link href="/login">
                <button
                  type="button"
                  className="text-sm text-muted-foreground hover:text-foreground inline-flex items-center"
                  data-testid="link-back-to-login"
                >
                  <ArrowLeft className="mr-1 h-3 w-3" />
                  {isSpanish ? 'Volver al Inicio de Sesión' : 'Back to Login'}
                </button>
              </Link>
            </div>
          </CardContent>
        </Card>
    </PageShell>
  );
}
