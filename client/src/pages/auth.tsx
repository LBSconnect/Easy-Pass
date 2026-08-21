import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation, useSearch } from "wouter";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Eye, EyeOff } from "lucide-react";
import { PageShell } from "@/components/page-shell";
import { useSEO, buildUrl } from "@/hooks/use-seo";
import { safeNextPath } from "@shared/redirects";

/**
 * The rules the form checks before it asks the server.
 *
 * Built per render from `t` rather than declared at module scope, because
 * these messages are the ones a student actually reads when they get
 * something wrong - and at module scope they could only ever be English.
 * A Spanish student filling in a Spanish form was told "Passwords don't
 * match", which is the moment the translation matters most.
 */
type Translate = (key: string, fallback: string) => string;

function buildLoginSchema(t: Translate) {
  return z.object({
    email: z.string().email(t("auth.invalidEmail", "Please enter a valid email")),
    password: z.string().min(1, t("auth.passwordRequired", "Password is required")),
  });
}

function buildSignupSchema(t: Translate) {
  return z
    .object({
      firstName: z.string().optional(),
      lastName: z.string().optional(),
      email: z.string().email(t("auth.invalidEmail", "Please enter a valid email")),
      password: z
        .string()
        .min(8, t("auth.passwordTooShort", "Password must be at least 8 characters")),
      confirmPassword: z.string(),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t("auth.passwordsDoNotMatch", "Passwords don't match"),
      path: ["confirmPassword"],
    });
}

type LoginFormData = z.infer<ReturnType<typeof buildLoginSchema>>;
type SignupFormData = z.infer<ReturnType<typeof buildSignupSchema>>;

function LoginForm({
  onSwitchToSignup,
  next,
}: {
  onSwitchToSignup: () => void;
  /** Where to land after signing in. Already validated by the caller. */
  next: string;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [, navigate] = useLocation();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Rebuilt when the language changes, so a student who switches language
  // mid-form does not get the previous language's error next time they slip.
  const loginSchema = useMemo(() => buildLoginSchema(t), [t, i18n.language]);

  const form = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const mutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const response = await apiRequest("POST", "/api/login", data);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/user"], data);
      toast({ title: t("auth.loginSuccess", "Login successful!") });
      navigate(next);
    },
    onError: (error: Error) => {
      toast({ 
        title: t("auth.loginError", "Login failed"), 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle as="h1" className="text-2xl font-bold">
          {t("auth.loginTitle", "Welcome Back")}
        </CardTitle>
        <CardDescription>
          {t("auth.loginSubtitle", "Sign in to continue your exam preparation")}
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
                  <FormLabel>{t("auth.email", "Email")}</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="you@example.com" 
                      autoComplete="email"
                      data-testid="input-email"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("auth.password", "Password")}</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="••••••••" 
                        className="pr-10"
                        autoComplete="current-password"
                        data-testid="input-password"
                        {...field} 
                      />
                    </FormControl>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? t("auth.hidePassword", "Hide password") : t("auth.showPassword", "Show password")}
                      data-testid="button-toggle-password"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end">
              <a
                href="/forgot-password"
                className="text-sm text-primary hover:underline"
                data-testid="link-forgot-password"
              >
                {t("auth.forgotPassword", "Forgot password?")}
              </a>
            </div>
            <Button 
              type="submit" 
              className="w-full" 
              disabled={mutation.isPending}
              data-testid="button-login"
            >
              {mutation.isPending ? t("auth.loggingIn", "Signing in...") : t("auth.login", "Sign In")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
        </Form>

        <p className="mt-4 text-sm leading-relaxed text-muted-foreground text-center">
          {t("auth.caseSensitiveNote", "Login and passwords are case sensitive. Please write down your password in a safe place.")}
        </p>

        <div className="mt-4 text-center">
          <p className="text-sm text-muted-foreground">
            {t("auth.noAccount", "Don't have an account?")}{" "}
            <button
              type="button"
              onClick={onSwitchToSignup}
              className="text-primary font-medium hover:underline"
              data-testid="button-switch-auth-mode"
            >
              {t("auth.signUp", "Sign up")}
            </button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function SignupForm({
  onSwitchToLogin,
  next,
}: {
  onSwitchToLogin: () => void;
  /** Where to land after creating an account. Already validated by the caller. */
  next: string;
}) {
  const [showPassword, setShowPassword] = useState(false);
  const [, navigate] = useLocation();
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const signupSchema = useMemo(() => buildSignupSchema(t), [t, i18n.language]);

  const form = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { 
      firstName: "", 
      lastName: "", 
      email: "", 
      password: "", 
      confirmPassword: "" 
    },
  });

  const mutation = useMutation({
    mutationFn: async (data: SignupFormData) => {
      const { confirmPassword, ...payload } = data;
      const response = await apiRequest("POST", "/api/register", payload);
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(["/api/auth/user"], data);
      toast({ title: t("auth.signupSuccess", "Account created successfully!") });
      navigate(next);
    },
    onError: (error: Error) => {
      toast({ 
        title: t("auth.signupError", "Signup failed"), 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <CardTitle as="h1" className="text-2xl font-bold">
          {t("auth.signupTitle", "Create Account")}
        </CardTitle>
        <CardDescription>
          {t("auth.signupSubtitle", "Join Easy Pass and start preparing for your Texas licensing exams")}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit((data) => mutation.mutate(data))} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="firstName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>{t("auth.firstName", "First Name")}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="John" 
                        autoComplete="given-name"
                        data-testid="input-first-name"
                        {...field} 
                      />
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
                    <FormLabel>{t("auth.lastName", "Last Name")}</FormLabel>
                    <FormControl>
                      <Input 
                        placeholder="Doe" 
                        autoComplete="family-name"
                        data-testid="input-last-name"
                        {...field} 
                      />
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
                  <FormLabel>{t("auth.email", "Email")}</FormLabel>
                  <FormControl>
                    <Input 
                      type="email" 
                      placeholder="you@example.com"
                      autoComplete="email"
                      data-testid="input-signup-email"
                      {...field} 
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="password"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("auth.password", "Password")}</FormLabel>
                  <div className="relative">
                    <FormControl>
                      <Input 
                        type={showPassword ? "text" : "password"} 
                        placeholder="••••••••" 
                        className="pr-10"
                        autoComplete="new-password"
                        data-testid="input-signup-password"
                        {...field} 
                      />
                    </FormControl>
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      aria-label={showPassword ? t("auth.hidePassword", "Hide password") : t("auth.showPassword", "Show password")}
                      data-testid="button-toggle-signup-password"
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="confirmPassword"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>{t("auth.confirmPassword", "Confirm Password")}</FormLabel>
                  <FormControl>
                    <Input 
                      type={showPassword ? "text" : "password"} 
                      placeholder="••••••••"
                      autoComplete="new-password"
                      data-testid="input-confirm-password"
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
              data-testid="button-signup"
            >
              {mutation.isPending ? t("auth.creatingAccount", "Creating account...") : t("auth.createAccount", "Create Account")}
              <ArrowRight className="ml-2 h-4 w-4" />
            </Button>
          </form>
        </Form>

        <div className="mt-6 text-center">
          <p className="text-sm text-muted-foreground">
            {t("auth.hasAccount", "Already have an account?")}{" "}
            <button
              type="button"
              onClick={onSwitchToLogin}
              className="text-primary font-medium hover:underline"
              data-testid="button-switch-auth-mode"
            >
              {t("auth.signIn", "Sign in")}
            </button>
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default function AuthPage() {
  const [location] = useLocation();
  const search = useSearch();
  const [isLogin, setIsLogin] = useState(location !== "/signup");

  /**
   * Where to go once they are signed in.
   *
   * Pages that need an account first - the pricing page's Subscribe button,
   * mainly - send people here carrying what they were trying to do, so they
   * come back to it instead of being dropped on a dashboard that has forgotten
   * their choice. `safeNextPath` refuses anything that leaves this app, and
   * falls back to the dashboard, so this stays a redirect and never becomes an
   * open one.
   */
  const next = safeNextPath(new URLSearchParams(search).get("next"));

  useEffect(() => {
    setIsLogin(location !== "/signup");
  }, [location]);

  useSEO({
    title: isLogin ? "Log In | MyEasyPass" : "Sign Up | MyEasyPass",
    description: isLogin
      ? "Log in to MyEasyPass to continue your Texas real estate or insurance exam prep with timed practice tests and score tracking."
      : "Create a free MyEasyPass account to start practicing for your Texas real estate or insurance licensing exam.",
    canonicalUrl: buildUrl(isLogin ? "/login" : "/signup"),
  });

  return (
    <PageShell width="narrow" centered>
        {isLogin ? (
          <LoginForm key="login" next={next} onSwitchToSignup={() => setIsLogin(false)} />
        ) : (
          <SignupForm key="signup" next={next} onSwitchToLogin={() => setIsLogin(true)} />
        )}
    </PageShell>
  );
}
