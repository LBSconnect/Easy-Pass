import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { Mail, Lock, User, ArrowRight, Eye, EyeOff } from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";

const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

const signupSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

type LoginFormData = z.infer<typeof loginSchema>;
type SignupFormData = z.infer<typeof signupSchema>;

export default function AuthPage() {
  const [isLogin, setIsLogin] = useState(true);
  const [showPassword, setShowPassword] = useState(false);
  const [, navigate] = useLocation();
  const { t } = useTranslation();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const loginForm = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const signupForm = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: "", password: "", confirmPassword: "", firstName: "", lastName: "" },
  });

  const loginMutation = useMutation({
    mutationFn: async (data: LoginFormData) => {
      const response = await apiRequest("POST", "/api/login", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: t("auth.loginSuccess", "Login successful!") });
      navigate("/dashboard");
    },
    onError: (error: Error) => {
      toast({ 
        title: t("auth.loginError", "Login failed"), 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: SignupFormData) => {
      const { confirmPassword, ...payload } = data;
      const response = await apiRequest("POST", "/api/register", payload);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({ title: t("auth.signupSuccess", "Account created successfully!") });
      navigate("/dashboard");
    },
    onError: (error: Error) => {
      toast({ 
        title: t("auth.signupError", "Signup failed"), 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const onLogin = (data: LoginFormData) => {
    loginMutation.mutate(data);
  };

  const onSignup = (data: SignupFormData) => {
    signupMutation.mutate(data);
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1 flex items-center justify-center py-12 px-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">
              {isLogin ? t("auth.loginTitle", "Welcome Back") : t("auth.signupTitle", "Create Account")}
            </CardTitle>
            <CardDescription>
              {isLogin 
                ? t("auth.loginSubtitle", "Sign in to continue your exam preparation")
                : t("auth.signupSubtitle", "Join Easy Pass and start preparing for your Texas licensing exams")
              }
            </CardDescription>
          </CardHeader>
          <CardContent>
            {isLogin ? (
              <Form {...loginForm}>
                <form onSubmit={loginForm.handleSubmit(onLogin)} className="space-y-4">
                  <FormField
                    control={loginForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("auth.email", "Email")}</FormLabel>
                        <FormControl>
                          <div className="relative z-10">
                            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-20" />
                            <Input 
                              type="email" 
                              placeholder="you@example.com" 
                              className="pl-10 relative z-10" 
                              data-testid="input-email"
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={loginForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("auth.password", "Password")}</FormLabel>
                        <FormControl>
                          <div className="relative z-10">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-20" />
                            <Input 
                              type={showPassword ? "text" : "password"} 
                              placeholder="••••••••" 
                              className="pl-10 pr-10 relative z-10" 
                              data-testid="input-password"
                              {...field} 
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-30"
                              data-testid="button-toggle-password"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={loginMutation.isPending}
                    data-testid="button-login"
                  >
                    {loginMutation.isPending ? t("auth.loggingIn", "Signing in...") : t("auth.login", "Sign In")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </Form>
            ) : (
              <Form {...signupForm}>
                <form onSubmit={signupForm.handleSubmit(onSignup)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={signupForm.control}
                      name="firstName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("auth.firstName", "First Name")}</FormLabel>
                          <FormControl>
                            <div className="relative z-10">
                              <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-20" />
                              <Input 
                                placeholder="John" 
                                className="pl-10 relative z-10" 
                                data-testid="input-first-name"
                                {...field} 
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={signupForm.control}
                      name="lastName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>{t("auth.lastName", "Last Name")}</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Doe" 
                              className="relative z-10"
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
                    control={signupForm.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("auth.email", "Email")}</FormLabel>
                        <FormControl>
                          <Input 
                            type="email" 
                            placeholder="you@example.com" 
                            data-testid="input-signup-email"
                            {...field} 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signupForm.control}
                    name="password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("auth.password", "Password")}</FormLabel>
                        <FormControl>
                          <div className="relative z-10">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-20" />
                            <Input 
                              type={showPassword ? "text" : "password"} 
                              placeholder="••••••••" 
                              className="pl-10 pr-10 relative z-10" 
                              data-testid="input-signup-password"
                              {...field} 
                            />
                            <button
                              type="button"
                              onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground z-30"
                              data-testid="button-toggle-signup-password"
                            >
                              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={signupForm.control}
                    name="confirmPassword"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>{t("auth.confirmPassword", "Confirm Password")}</FormLabel>
                        <FormControl>
                          <div className="relative z-10">
                            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none z-20" />
                            <Input 
                              type={showPassword ? "text" : "password"} 
                              placeholder="••••••••" 
                              className="pl-10 relative z-10" 
                              data-testid="input-confirm-password"
                              {...field} 
                            />
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <Button 
                    type="submit" 
                    className="w-full" 
                    disabled={signupMutation.isPending}
                    data-testid="button-signup"
                  >
                    {signupMutation.isPending ? t("auth.creatingAccount", "Creating account...") : t("auth.createAccount", "Create Account")}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </form>
              </Form>
            )}

            <div className="mt-6 text-center">
              <p className="text-sm text-muted-foreground">
                {isLogin ? t("auth.noAccount", "Don't have an account?") : t("auth.hasAccount", "Already have an account?")}
                {" "}
                <button
                  type="button"
                  onClick={() => {
                    setIsLogin(!isLogin);
                    loginForm.reset();
                    signupForm.reset();
                  }}
                  className="text-primary font-medium hover:underline"
                  data-testid="button-switch-auth-mode"
                >
                  {isLogin ? t("auth.signUp", "Sign up") : t("auth.signIn", "Sign in")}
                </button>
              </p>
            </div>
          </CardContent>
        </Card>
      </main>
      <Footer />
    </div>
  );
}
