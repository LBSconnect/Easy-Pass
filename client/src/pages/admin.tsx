import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  AreaChart,
  Area,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
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
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Link } from "wouter";
import { AiUsagePanel } from "@/components/admin/ai-usage-panel";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import {
  Users,
  FileQuestion,
  BarChart3,
  DollarSign,
  TrendingUp,
  Plus,
  Pencil,
  Trash2,
  Search,
  Upload,
  CheckCircle2,
  Flag,
  MessageSquare,
  Check,
  X,
  Eye,
  Mail,
  RefreshCw,
  CreditCard,
  AlertTriangle,
  Wrench,
  ShieldCheck,
  ShieldOff,
  UserMinus,
  UserX,
  Download,
} from "lucide-react";
import type { Question, ExamCategory, QuestionFeedback } from "@shared/schema";

const questionFormSchema = z.object({
  category: z.enum(["real_estate", "property_casualty", "life_insurance", "general_lines"]),
  questionTextEn: z.string().min(10, "Question must be at least 10 characters"),
  questionTextEs: z.string().min(10, "Question must be at least 10 characters"),
  optionsEn: z.array(z.string()).min(2).max(6),
  optionsEs: z.array(z.string()).min(2).max(6),
  correctAnswer: z.number().min(0),
  explanationEn: z.string().optional(),
  explanationEs: z.string().optional(),
});

type QuestionFormValues = z.infer<typeof questionFormSchema>;

interface AdminStats {
  totalUsers: number;
  activeSubscriptions: number;
  totalRevenue: number;
  passRate: number;
}

interface AdminAnalytics {
  examsByCategory: Array<{ category: string; attempts: number; avgScore: number; passRate: number }>;
  resultsOverTime: Array<{ date: string; count: number }>;
  userGrowth: Array<{ date: string; count: number }>;
  revenueOverTime: Array<{ date: string; amount: number }>;
  subscriptionsByType: Array<{ type: string; count: number }>;
  subscriptionsByCategory: Array<{ category: string; count: number }>;
  topEvents: Array<{ event: string; count: number }>;
}

/**
 * Treat a value as an array or as empty.
 *
 * Response types describe what the API is supposed to send, not what arrives.
 * An error envelope, a proxy's HTML, or a field dropped in a shape change all
 * reach the component typed as an array and are not one.
 */
function asArray<T>(value: T[] | undefined | null): T[] {
  return Array.isArray(value) ? value : [];
}

const EVENT_LABELS: Record<string, string> = {
  diagnostic_cta_click: "Readiness Assessment Started",
  pricing_cta_click: "Pricing CTA Click",
  checkout_start: "Checkout Started",
  bootcamp_cta_click: "Bootcamp CTA Click",
  employer_inquiry_submit: "Employer Inquiry Submitted",
  official_exam_schedule_click: "Official Exam Schedule Click",
  guest_practice_start: "Guest Practice Started",
  guest_practice_wall_shown: "Guest Sign-Up Wall Shown",
  guest_practice_signup_click: "Guest Sign-Up Click",
};

const CHART_COLORS = ["#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", "#06b6d4"];

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  subscriptionStatus: string;
  subscriptionPlan: string;
  subscriptionType: string;
  allowedCategories: string[];
  stripeCustomerId: string;
  stripeSubscriptionId: string;
  createdAt: string;
  examCount: number;
  lastExamAt: string | null;
}

const ALL_CATEGORIES: ExamCategory[] = ["real_estate", "property_casualty", "life_insurance", "general_lines"];

export default function AdminPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const { user: currentUser } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [activityFilter, setActivityFilter] = useState<string>("all");
  const [joinedFrom, setJoinedFrom] = useState("");
  const [joinedTo, setJoinedTo] = useState("");
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ExamCategory | "all">("all");

  // Authorization gate. The server already refuses admin data to non-admins,
  // so nothing leaks - but without this the page fired every admin query,
  // received {message:"Forbidden"} where it expected arrays, and crashed on
  // .map(). A non-admin who types /admin saw a broken page instead of being
  // told they lack access. Queries stay disabled until the role is confirmed
  // so we do not fire requests we know will be refused.
  const { data: viewerProfile, isLoading: viewerLoading } = useQuery<{ role?: string }>({
    queryKey: ["/api/profile"],
  });
  const isAdmin = viewerProfile?.role === "admin";

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    enabled: isAdmin,
  });

  const { data: analyticsData, isLoading: analyticsLoading } = useQuery<AdminAnalytics>({
    queryKey: ["/api/admin/analytics"],
    enabled: isAdmin,
  });

  // Checking `analytics` alone is not enough: an object missing its array
  // fields is still truthy, so the guard passed and `.map` threw on undefined.
  // Every series is normalised here so a partial body renders empty charts
  // instead of taking the panel down.
  const analytics: AdminAnalytics | null = analyticsData
    ? {
        examsByCategory: asArray(analyticsData.examsByCategory),
        resultsOverTime: asArray(analyticsData.resultsOverTime),
        userGrowth: asArray(analyticsData.userGrowth),
        revenueOverTime: asArray(analyticsData.revenueOverTime),
        subscriptionsByType: asArray(analyticsData.subscriptionsByType),
        subscriptionsByCategory: asArray(analyticsData.subscriptionsByCategory),
        topEvents: asArray(analyticsData.topEvents),
      }
    : null;

  // These three are typed as arrays, but the type is a promise about the
  // network rather than a guarantee from it. A body that is not an array -
  // an error envelope, a proxy's HTML, a shape change - used to reach
  // `.filter` and take the whole admin panel down with
  // "cs?.filter is not a function". Normalise once, here, so no call site
  // downstream has to remember.
  const { data: usersData, isLoading: usersLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    enabled: isAdmin,
  });
  const users = Array.isArray(usersData) ? usersData : [];

  const { data: questionsData, isLoading: questionsLoading } = useQuery<Question[]>({
    queryKey: ["/api/admin/questions"],
    enabled: isAdmin,
  });
  const questions = Array.isArray(questionsData) ? questionsData : [];

  const { data: feedbackData, isLoading: feedbackLoading } = useQuery<QuestionFeedback[]>({
    queryKey: ["/api/admin/question-feedback"],
    enabled: isAdmin,
  });
  const feedback = Array.isArray(feedbackData) ? feedbackData : [];

  const [selectedFeedback, setSelectedFeedback] = useState<QuestionFeedback | null>(null);
  const [feedbackAdminNotes, setFeedbackAdminNotes] = useState("");

  const updateFeedbackMutation = useMutation({
    mutationFn: async ({ id, status, adminNotes }: { id: string; status: string; adminNotes?: string }) => {
      const res = await apiRequest("PATCH", `/api/admin/question-feedback/${id}`, { status, adminNotes });
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t("common.success"),
        description: "Feedback updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/question-feedback"] });
      setSelectedFeedback(null);
      setFeedbackAdminNotes("");
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });
  
  const sendPasswordResetMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/admin/send-password-reset/${userId}`, {
        method: "POST",
        credentials: "include",
      });
      const body = await res.json();
      if (res.ok) return body;
      // Attach status and parsed body so onError can handle 503 vs other errors
      const err = new Error(body.message || "Failed to send password reset") as any;
      err.status = res.status;
      err.resetLink = body.resetLink;
      throw err;
    },
    onSuccess: () => {
      toast({
        title: t("common.success"),
        description: "Password reset email sent successfully",
      });
    },
    onError: (error: any) => {
      if (error.status === 503 && error.resetLink) {
        // Email service unavailable but token was created — show the link
        navigator.clipboard.writeText(error.resetLink).catch(() => {});
        toast({
          title: "Email service unavailable",
          description: "Reset link copied to clipboard. Share it with the user manually.",
          variant: "destructive",
        });
      } else if (error.status === 401) {
        toast({
          title: "Unauthorized",
          description: "Please log in again.",
          variant: "destructive",
        });
      } else {
        toast({
          title: "Error",
          description: error.message,
          variant: "destructive",
        });
      }
    },
  });

  const syncSubscriptionMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/admin/sync-user-subscription/${userId}`, {
        method: "POST",
        credentials: "include",
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.message || "Failed to sync subscription");
      }
      return body;
    },
    onSuccess: (data) => {
      toast({
        title: data.synced ? t("common.success") : "Info",
        description: data.message || "Subscription sync completed",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const clearExamHistoryMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/admin/users/${userId}/exam-history`, {
        method: "DELETE",
        credentials: "include",
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.message || "Failed to clear exam history");
      }
      return body;
    },
    onSuccess: (data) => {
      toast({
        title: t("common.success"),
        description: data.message || "Exam history cleared",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: "user" | "admin" }) => {
      const res = await fetch(`/api/admin/users/${userId}/role`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ role }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.message || "Failed to update role");
      }
      return body;
    },
    onSuccess: (data) => {
      toast({ title: t("common.success"), description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const [grantAccessUser, setGrantAccessUser] = useState<AdminUser | null>(null);
  const [grantCategories, setGrantCategories] = useState<ExamCategory[]>([]);
  const [grantExpiryDays, setGrantExpiryDays] = useState("");

  const grantAccessMutation = useMutation({
    mutationFn: async ({ userId, categories, expiresInDays }: { userId: string; categories: ExamCategory[]; expiresInDays?: number }) => {
      const res = await fetch(`/api/admin/users/${userId}/comp-access`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ categories, expiresInDays }),
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.message || "Failed to grant access");
      }
      return body;
    },
    onSuccess: (data) => {
      toast({ title: t("common.success"), description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      setGrantAccessUser(null);
      setGrantCategories([]);
      setGrantExpiryDays("");
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const revokeAccessMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/admin/users/${userId}/revoke-access`, {
        method: "POST",
        credentials: "include",
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.message || "Failed to revoke access");
      }
      return body;
    },
    onSuccess: (data) => {
      toast({ title: t("common.success"), description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const deleteAccountMutation = useMutation({
    mutationFn: async (userId: string) => {
      const res = await fetch(`/api/admin/users/${userId}`, {
        method: "DELETE",
        credentials: "include",
      });
      const body = await res.json();
      if (!res.ok) {
        throw new Error(body.message || "Failed to delete account");
      }
      return body;
    },
    onSuccess: (data) => {
      toast({ title: t("common.success"), description: data.message });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/users"] });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/stats"] });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const [stripeDiagnostic, setStripeDiagnostic] = useState<any>(null);
  const [stripeFixResults, setStripeFixResults] = useState<string[] | null>(null);

  const stripeDiagnosticMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("GET", "/api/admin/stripe-diagnostic");
      return res.json();
    },
    onSuccess: (data) => {
      setStripeDiagnostic(data);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const stripeFixMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/stripe-force-create");
      return res.json();
    },
    onSuccess: (data) => {
      setStripeFixResults(data.results);
      setStripeDiagnostic(null); // reset so user re-runs diagnostic to see updated state
      toast({ title: "Done", description: "Stripe fix completed. Run diagnostic to verify." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const stripeInitMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/admin/init-stripe-prices");
      return res.json();
    },
    onSuccess: () => {
      setStripeDiagnostic(null);
      toast({ title: "Done", description: "Stripe prices initialized. Run diagnostic to verify." });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const shuffleAnswersMutation = useMutation({
    mutationFn: async () => {
      const url = selectedCategory === "all"
        ? "/api/admin/questions/shuffle-answers"
        : `/api/admin/questions/shuffle-answers?category=${selectedCategory}`;
      const res = await apiRequest("POST", url);
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/questions"] });
      toast({ title: "Done", description: data.message });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const form = useForm<QuestionFormValues>({
    resolver: zodResolver(questionFormSchema),
    defaultValues: {
      category: "real_estate",
      questionTextEn: "",
      questionTextEs: "",
      optionsEn: ["", "", "", ""],
      optionsEs: ["", "", "", ""],
      correctAnswer: 0,
      explanationEn: "",
      explanationEs: "",
    },
  });

  const createQuestionMutation = useMutation({
    mutationFn: async (data: QuestionFormValues) => {
      const res = await apiRequest("POST", "/api/admin/questions", data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t("common.success"),
        description: "Question created successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/questions"] });
      setIsQuestionDialogOpen(false);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const updateQuestionMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: QuestionFormValues }) => {
      const res = await apiRequest("PATCH", `/api/admin/questions/${id}`, data);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t("common.success"),
        description: "Question updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/questions"] });
      setIsQuestionDialogOpen(false);
      setEditingQuestion(null);
      form.reset();
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const deleteQuestionMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await apiRequest("DELETE", `/api/admin/questions/${id}`);
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: t("common.success"),
        description: "Question deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/admin/questions"] });
    },
    onError: (error: Error) => {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: QuestionFormValues) => {
    if (editingQuestion) {
      updateQuestionMutation.mutate({ id: editingQuestion.id, data });
    } else {
      createQuestionMutation.mutate(data);
    }
  };

  const handleEditQuestion = (question: Question) => {
    setEditingQuestion(question);
    form.reset({
      category: question.category as ExamCategory,
      questionTextEn: question.questionTextEn,
      questionTextEs: question.questionTextEs,
      optionsEn: question.optionsEn as string[],
      optionsEs: question.optionsEs as string[],
      correctAnswer: question.correctAnswer,
      explanationEn: question.explanationEn || "",
      explanationEs: question.explanationEs || "",
    });
    setIsQuestionDialogOpen(true);
  };

  const hasActiveUserFilters =
    searchQuery !== "" ||
    roleFilter !== "all" ||
    statusFilter !== "all" ||
    typeFilter !== "all" ||
    categoryFilter !== "all" ||
    activityFilter !== "all" ||
    joinedFrom !== "" ||
    joinedTo !== "";

  const clearUserFilters = () => {
    setSearchQuery("");
    setRoleFilter("all");
    setStatusFilter("all");
    setTypeFilter("all");
    setCategoryFilter("all");
    setActivityFilter("all");
    setJoinedFrom("");
    setJoinedTo("");
  };

  const filteredUsers = users?.filter((user) => {
    const matchesSearch =
      searchQuery === "" ||
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesRole = roleFilter === "all" || (user.role || "user") === roleFilter;

    const matchesStatus =
      statusFilter === "all" ||
      (statusFilter === "none" ? !user.subscriptionStatus : user.subscriptionStatus === statusFilter);

    const matchesType =
      typeFilter === "all" ||
      (typeFilter === "none" ? !user.subscriptionType : user.subscriptionType === typeFilter);

    const matchesCategory =
      categoryFilter === "all" ||
      (user.allowedCategories || []).includes(categoryFilter);

    const matchesActivity =
      activityFilter === "all" ||
      (activityFilter === "none" ? (user.examCount ?? 0) === 0 : (user.examCount ?? 0) > 0);

    const joinedDate = new Date(user.createdAt);
    const matchesFrom = joinedFrom === "" || joinedDate >= new Date(joinedFrom);
    const matchesTo = joinedTo === "" || joinedDate <= new Date(`${joinedTo}T23:59:59.999`);

    return (
      matchesSearch &&
      matchesRole &&
      matchesStatus &&
      matchesType &&
      matchesCategory &&
      matchesActivity &&
      matchesFrom &&
      matchesTo
    );
  });

  const exportUsersCsv = () => {
    if (!filteredUsers || filteredUsers.length === 0) return;

    const headers = ["First Name", "Last Name", "Email", "Role", "Subscription Status", "Plan", "Type", "Categories", "Joined", "Exams Taken", "Last Exam"];
    const escapeCsvField = (value: string) => `"${value.replace(/"/g, '""')}"`;
    const rows = filteredUsers.map((user) => [
      user.firstName || "",
      user.lastName || "",
      user.email || "",
      user.role || "user",
      user.subscriptionStatus || "",
      user.subscriptionPlan || "",
      user.subscriptionType || "",
      (user.allowedCategories || []).join("; "),
      new Date(user.createdAt).toLocaleDateString(),
      String(user.examCount ?? 0),
      user.lastExamAt ? new Date(user.lastExamAt).toLocaleDateString() : "Never",
    ].map((field) => escapeCsvField(String(field))));

    const csv = [headers.map(escapeCsvField), ...rows].map((row) => row.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `myeasypass-users-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const filteredQuestions = questions?.filter(
    (q) => selectedCategory === "all" || q.category === selectedCategory
  );

  // Placed after every hook so hook order stays stable across renders.
  if (viewerLoading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </main>
        <Footer />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Navbar />
        <main className="flex-1 flex items-center justify-center p-4">
          <div className="max-w-md text-center" data-testid="admin-access-denied">
            <h1 className="text-xl font-bold">Admin access required</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              This area is limited to MyEasyPass administrators.
            </p>
            <Button asChild className="mt-6">
              <Link href="/dashboard">Go to dashboard</Link>
            </Button>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />

      <main className="flex-1">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">{t("admin.title")}</h1>
            <p className="text-muted-foreground mt-1">
              Manage users, questions, and view analytics
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-4 mb-8">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("admin.totalUsers")}
                </CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{stats?.totalUsers || 0}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("admin.activeSubscriptions")}
                </CardTitle>
                <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{stats?.activeSubscriptions || 0}</div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("admin.totalRevenue")}
                </CardTitle>
                <DollarSign className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">
                    ${((stats?.totalRevenue || 0) / 100).toFixed(2)}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  {t("admin.passRate")}
                </CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                {statsLoading ? (
                  <Skeleton className="h-8 w-16" />
                ) : (
                  <div className="text-2xl font-bold">{stats?.passRate || 0}%</div>
                )}
              </CardContent>
            </Card>
          </div>

          <Tabs defaultValue="questions" className="space-y-6">
            <TabsList>
              <TabsTrigger value="questions" className="gap-2">
                <FileQuestion className="h-4 w-4" />
                {t("admin.questions")}
              </TabsTrigger>
              <TabsTrigger value="users" className="gap-2">
                <Users className="h-4 w-4" />
                {t("admin.users")}
              </TabsTrigger>
              <TabsTrigger value="analytics" className="gap-2">
                <BarChart3 className="h-4 w-4" />
                {t("admin.analytics")}
              </TabsTrigger>
              <TabsTrigger value="stripe" className="gap-2">
                <CreditCard className="h-4 w-4" />
                Stripe Setup
              </TabsTrigger>
              <TabsTrigger value="feedback" className="gap-2">
                <Flag className="h-4 w-4" />
                Feedback
                {feedback && feedback.filter(f => f.status === "pending").length > 0 && (
                  <Badge variant="destructive" className="ml-1 h-5 min-w-[20px] px-1.5">
                    {feedback.filter(f => f.status === "pending").length}
                  </Badge>
                )}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="questions" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle>{t("admin.questionManagement")}</CardTitle>
                      <CardDescription>
                        Add, edit, or delete exam questions
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Select
                        value={selectedCategory}
                        onValueChange={(v) => setSelectedCategory(v as ExamCategory | "all")}
                      >
                        <SelectTrigger className="w-[180px]" data-testid="select-category-filter">
                          <SelectValue placeholder="Filter by category" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Categories</SelectItem>
                          <SelectItem value="real_estate">Real Estate</SelectItem>
                          <SelectItem value="property_casualty">Property & Casualty</SelectItem>
                          <SelectItem value="life_insurance">Life Insurance</SelectItem>
                          <SelectItem value="general_lines">General Lines</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button
                        variant="outline"
                        onClick={() => shuffleAnswersMutation.mutate()}
                        disabled={shuffleAnswersMutation.isPending}
                        data-testid="button-shuffle-answers"
                      >
                        <RefreshCw className={`mr-2 h-4 w-4 ${shuffleAnswersMutation.isPending ? "animate-spin" : ""}`} />
                        Shuffle Answer Positions
                      </Button>
                      <Dialog open={isQuestionDialogOpen} onOpenChange={setIsQuestionDialogOpen}>
                        <DialogTrigger asChild>
                          <Button
                            onClick={() => {
                              setEditingQuestion(null);
                              form.reset();
                            }}
                            data-testid="button-add-question"
                          >
                            <Plus className="mr-2 h-4 w-4" />
                            {t("admin.addQuestion")}
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                          <DialogHeader>
                            <DialogTitle>
                              {editingQuestion
                                ? t("admin.editQuestion")
                                : t("admin.addQuestion")}
                            </DialogTitle>
                            <DialogDescription>
                              Fill in the question details in both English and Spanish
                            </DialogDescription>
                          </DialogHeader>
                          <Form {...form}>
                            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                              <FormField
                                control={form.control}
                                name="category"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Category</FormLabel>
                                    <Select
                                      onValueChange={field.onChange}
                                      defaultValue={field.value}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select category" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="real_estate">Real Estate</SelectItem>
                                        <SelectItem value="property_casualty">Property & Casualty</SelectItem>
                                        <SelectItem value="life_insurance">Life Insurance</SelectItem>
                                        <SelectItem value="general_lines">General Lines</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <div className="grid gap-4 md:grid-cols-2">
                                <FormField
                                  control={form.control}
                                  name="questionTextEn"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Question (English)</FormLabel>
                                      <FormControl>
                                        <Textarea {...field} rows={3} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                                <FormField
                                  control={form.control}
                                  name="questionTextEs"
                                  render={({ field }) => (
                                    <FormItem>
                                      <FormLabel>Question (Spanish)</FormLabel>
                                      <FormControl>
                                        <Textarea {...field} rows={3} />
                                      </FormControl>
                                      <FormMessage />
                                    </FormItem>
                                  )}
                                />
                              </div>

                              <div className="space-y-2">
                                <FormLabel>Options (English)</FormLabel>
                                {[0, 1, 2, 3].map((index) => (
                                  <FormField
                                    key={`optionEn-${index}`}
                                    control={form.control}
                                    name={`optionsEn.${index}`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormControl>
                                          <div className="flex gap-2">
                                            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-sm">
                                              {String.fromCharCode(65 + index)}
                                            </span>
                                            <Input {...field} placeholder={`Option ${index + 1}`} />
                                          </div>
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                ))}
                              </div>

                              <div className="space-y-2">
                                <FormLabel>Options (Spanish)</FormLabel>
                                {[0, 1, 2, 3].map((index) => (
                                  <FormField
                                    key={`optionEs-${index}`}
                                    control={form.control}
                                    name={`optionsEs.${index}`}
                                    render={({ field }) => (
                                      <FormItem>
                                        <FormControl>
                                          <div className="flex gap-2">
                                            <span className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-sm">
                                              {String.fromCharCode(65 + index)}
                                            </span>
                                            <Input {...field} placeholder={`Opción ${index + 1}`} />
                                          </div>
                                        </FormControl>
                                      </FormItem>
                                    )}
                                  />
                                ))}
                              </div>

                              <FormField
                                control={form.control}
                                name="correctAnswer"
                                render={({ field }) => (
                                  <FormItem>
                                    <FormLabel>Correct Answer</FormLabel>
                                    <Select
                                      onValueChange={(v) => field.onChange(parseInt(v))}
                                      defaultValue={field.value.toString()}
                                    >
                                      <FormControl>
                                        <SelectTrigger>
                                          <SelectValue placeholder="Select correct answer" />
                                        </SelectTrigger>
                                      </FormControl>
                                      <SelectContent>
                                        <SelectItem value="0">A</SelectItem>
                                        <SelectItem value="1">B</SelectItem>
                                        <SelectItem value="2">C</SelectItem>
                                        <SelectItem value="3">D</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <FormMessage />
                                  </FormItem>
                                )}
                              />

                              <DialogFooter>
                                <Button
                                  type="submit"
                                  disabled={
                                    createQuestionMutation.isPending ||
                                    updateQuestionMutation.isPending
                                  }
                                >
                                  {createQuestionMutation.isPending ||
                                  updateQuestionMutation.isPending
                                    ? t("common.loading")
                                    : editingQuestion
                                    ? t("common.save")
                                    : t("admin.addQuestion")}
                                </Button>
                              </DialogFooter>
                            </form>
                          </Form>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {questionsLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : filteredQuestions && filteredQuestions.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[150px]">Category</TableHead>
                          <TableHead>Question (English)</TableHead>
                          <TableHead className="w-[100px]">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredQuestions.map((question) => (
                          <TableRow key={question.id}>
                            <TableCell>
                              <Badge variant="secondary" className="capitalize">
                                {question.category.replace("_", " ")}
                              </Badge>
                            </TableCell>
                            <TableCell className="max-w-md truncate">
                              {question.questionTextEn}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => handleEditQuestion(question)}
                                  aria-label={`Edit question: ${question.questionTextEn}`}
                                  data-testid={`button-edit-${question.id}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteQuestionMutation.mutate(question.id)}
                                  aria-label={`Delete question: ${question.questionTextEn}`}
                                  data-testid={`button-delete-${question.id}`}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">
                      No questions found
                    </p>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="users" className="space-y-4">
              <Card>
                <CardHeader>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <CardTitle>{t("admin.userManagement")}</CardTitle>
                      <CardDescription>
                        View and manage user accounts
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          placeholder={t("admin.searchUsers")}
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          className="pl-9 w-[250px]"
                          data-testid="input-search-users"
                        />
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={exportUsersCsv}
                        disabled={!filteredUsers || filteredUsers.length === 0}
                        title="Export visible users to CSV"
                        data-testid="button-export-users-csv"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Export CSV
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex flex-wrap items-end gap-3 mb-4">
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="filter-role" className="text-xs text-muted-foreground">Role</Label>
                      <Select value={roleFilter} onValueChange={setRoleFilter}>
                        <SelectTrigger id="filter-role" className="w-[130px]" data-testid="select-filter-role">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All roles</SelectItem>
                          <SelectItem value="user">User</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="filter-status" className="text-xs text-muted-foreground">Subscription</Label>
                      <Select value={statusFilter} onValueChange={setStatusFilter}>
                        <SelectTrigger id="filter-status" className="w-[150px]" data-testid="select-filter-status">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All statuses</SelectItem>
                          <SelectItem value="active">Active</SelectItem>
                          <SelectItem value="trialing">Trialing</SelectItem>
                          <SelectItem value="past_due">Past due</SelectItem>
                          <SelectItem value="canceled">Canceled</SelectItem>
                          <SelectItem value="none">None</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="filter-type" className="text-xs text-muted-foreground">Type</Label>
                      <Select value={typeFilter} onValueChange={setTypeFilter}>
                        <SelectTrigger id="filter-type" className="w-[130px]" data-testid="select-filter-type">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All types</SelectItem>
                          <SelectItem value="single">Single</SelectItem>
                          <SelectItem value="bundle">Bundle</SelectItem>
                          <SelectItem value="none">None</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="filter-category" className="text-xs text-muted-foreground">Category</Label>
                      <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger id="filter-category" className="w-[170px]" data-testid="select-filter-category">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All categories</SelectItem>
                          {ALL_CATEGORIES.map((category) => (
                            <SelectItem key={category} value={category} className="capitalize">
                              {category.replace("_", " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="filter-activity" className="text-xs text-muted-foreground">Activity</Label>
                      <Select value={activityFilter} onValueChange={setActivityFilter}>
                        <SelectTrigger id="filter-activity" className="w-[150px]" data-testid="select-filter-activity">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All activity</SelectItem>
                          <SelectItem value="none">No exams taken</SelectItem>
                          <SelectItem value="some">Has taken exams</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="filter-joined-from" className="text-xs text-muted-foreground">Joined from</Label>
                      <Input
                        id="filter-joined-from"
                        type="date"
                        value={joinedFrom}
                        onChange={(e) => setJoinedFrom(e.target.value)}
                        className="w-[150px]"
                        data-testid="input-filter-joined-from"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <Label htmlFor="filter-joined-to" className="text-xs text-muted-foreground">Joined to</Label>
                      <Input
                        id="filter-joined-to"
                        type="date"
                        value={joinedTo}
                        onChange={(e) => setJoinedTo(e.target.value)}
                        className="w-[150px]"
                        data-testid="input-filter-joined-to"
                      />
                    </div>
                    {hasActiveUserFilters && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={clearUserFilters}
                        data-testid="button-clear-user-filters"
                      >
                        <X className="h-4 w-4 mr-1" />
                        Clear filters
                      </Button>
                    )}
                  </div>
                  {!usersLoading && (
                    <p className="text-sm text-muted-foreground mb-3" data-testid="text-user-filter-count">
                      Showing {filteredUsers?.length ?? 0} of {users?.length ?? 0} users
                    </p>
                  )}
                  {usersLoading ? (
                    <div className="space-y-4">
                      {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-16 w-full" />
                      ))}
                    </div>
                  ) : filteredUsers && filteredUsers.length > 0 ? (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>User</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                          <TableHead>Subscription</TableHead>
                          <TableHead>Plan/Type</TableHead>
                          <TableHead>Categories</TableHead>
                          <TableHead>Activity</TableHead>
                          <TableHead>Joined</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {filteredUsers.map((user) => (
                          <TableRow key={user.id}>
                            <TableCell>
                              {user.firstName} {user.lastName}
                            </TableCell>
                            <TableCell>{user.email}</TableCell>
                            <TableCell>
                              <Badge variant={user.role === "admin" ? "default" : "secondary"}>
                                {user.role || "user"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  user.subscriptionStatus === "active"
                                    ? "default"
                                    : user.subscriptionStatus === "trialing"
                                    ? "outline"
                                    : "secondary"
                                }
                              >
                                {user.subscriptionStatus || "None"}
                              </Badge>
                            </TableCell>
                            <TableCell className="capitalize">
                              <div className="flex flex-col gap-0.5">
                                <span>{user.subscriptionPlan || "-"}</span>
                                {user.subscriptionType && (
                                  <span className="text-xs text-muted-foreground">
                                    ({user.subscriptionType})
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {user.allowedCategories && user.allowedCategories.length > 0 ? (
                                <div className="flex flex-wrap gap-1">
                                  {user.allowedCategories.map((cat) => (
                                    <Badge key={cat} variant="outline" className="text-xs">
                                      {cat.replace("_", " ")}
                                    </Badge>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-0.5">
                                <span className={user.examCount > 0 ? "" : "text-muted-foreground"}>
                                  {user.examCount > 0 ? `${user.examCount} exam${user.examCount === 1 ? "" : "s"}` : "No exams"}
                                </span>
                                {user.lastExamAt && (
                                  <span className="text-xs text-muted-foreground">
                                    Last: {new Date(user.lastExamAt).toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              {new Date(user.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => syncSubscriptionMutation.mutate(user.id)}
                                  disabled={syncSubscriptionMutation.isPending}
                                  title="Sync subscription from Stripe"
                                  data-testid={`button-sync-subscription-${user.id}`}
                                >
                                  <RefreshCw className={`h-4 w-4 ${syncSubscriptionMutation.isPending ? 'animate-spin' : ''}`} />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => sendPasswordResetMutation.mutate(user.id)}
                                  disabled={sendPasswordResetMutation.isPending}
                                  title="Send password reset email"
                                  data-testid={`button-reset-password-${user.id}`}
                                >
                                  <Mail className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        `Clear all exam history (sessions, results, study progress, and certificates) for ${user.email}? This cannot be undone.`
                                      )
                                    ) {
                                      clearExamHistoryMutation.mutate(user.id);
                                    }
                                  }}
                                  disabled={clearExamHistoryMutation.isPending}
                                  title="Clear exam history"
                                  data-testid={`button-clear-history-${user.id}`}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    const nextRole = user.role === "admin" ? "user" : "admin";
                                    if (
                                      window.confirm(
                                        `${nextRole === "admin" ? "Grant" : "Remove"} admin access ${
                                          nextRole === "admin" ? "to" : "from"
                                        } ${user.email}?`
                                      )
                                    ) {
                                      updateRoleMutation.mutate({ userId: user.id, role: nextRole });
                                    }
                                  }}
                                  disabled={updateRoleMutation.isPending || user.id === currentUser?.id}
                                  title={user.role === "admin" ? "Remove admin access" : "Make admin"}
                                  data-testid={`button-toggle-role-${user.id}`}
                                >
                                  {user.role === "admin" ? (
                                    <ShieldOff className="h-4 w-4" />
                                  ) : (
                                    <ShieldCheck className="h-4 w-4" />
                                  )}
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    setGrantAccessUser(user);
                                    setGrantCategories(user.allowedCategories && user.allowedCategories.length > 0 ? [...user.allowedCategories] as ExamCategory[] : []);
                                    setGrantExpiryDays("");
                                  }}
                                  title="Grant complimentary access"
                                  data-testid={`button-grant-access-${user.id}`}
                                >
                                  <ShieldCheck className="h-4 w-4 mr-1" />
                                  Grant
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        `Revoke ${user.email}'s access? This sets their subscription status to canceled and clears allowed categories.`
                                      )
                                    ) {
                                      revokeAccessMutation.mutate(user.id);
                                    }
                                  }}
                                  disabled={revokeAccessMutation.isPending}
                                  title="Revoke access"
                                  data-testid={`button-revoke-access-${user.id}`}
                                >
                                  <UserX className="h-4 w-4" />
                                </Button>
                                <Button
                                  size="sm"
                                  variant="destructive"
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        `Permanently delete the account for ${user.email}? This removes their profile, exam sessions, results, study progress, certificates, and feedback. Payment and subscription records are retained for accounting purposes. This cannot be undone.`
                                      )
                                    ) {
                                      deleteAccountMutation.mutate(user.id);
                                    }
                                  }}
                                  disabled={deleteAccountMutation.isPending || user.id === currentUser?.id}
                                  title="Delete account"
                                  data-testid={`button-delete-account-${user.id}`}
                                >
                                  <UserMinus className="h-4 w-4" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  ) : (
                    <p className="text-center py-8 text-muted-foreground">
                      No users found
                    </p>
                  )}
                </CardContent>
              </Card>

              <Dialog open={!!grantAccessUser} onOpenChange={(open) => !open && setGrantAccessUser(null)}>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Grant Complimentary Access</DialogTitle>
                    <DialogDescription>
                      {grantAccessUser
                        ? `Grant ${grantAccessUser.email} access without a Stripe subscription. This will not be affected by the daily subscription sync.`
                        : ""}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 py-2">
                    <div className="space-y-2">
                      <Label>Categories</Label>
                      <div className="space-y-2">
                        {ALL_CATEGORIES.map((category) => (
                          <div key={category} className="flex items-center gap-2">
                            <Checkbox
                              id={`grant-category-${category}`}
                              checked={grantCategories.includes(category)}
                              onCheckedChange={(checked) => {
                                setGrantCategories((prev) =>
                                  checked
                                    ? [...prev, category]
                                    : prev.filter((c) => c !== category)
                                );
                              }}
                            />
                            <Label htmlFor={`grant-category-${category}`} className="capitalize font-normal">
                              {category.replace("_", " ")}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="grant-expiry-days">Expires in (days, optional)</Label>
                      <Input
                        id="grant-expiry-days"
                        type="number"
                        min="1"
                        placeholder="Leave blank for no expiration"
                        value={grantExpiryDays}
                        onChange={(e) => setGrantExpiryDays(e.target.value)}
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setGrantAccessUser(null)}>
                      Cancel
                    </Button>
                    <Button
                      onClick={() => {
                        if (!grantAccessUser || grantCategories.length === 0) return;
                        grantAccessMutation.mutate({
                          userId: grantAccessUser.id,
                          categories: grantCategories,
                          expiresInDays: grantExpiryDays ? parseInt(grantExpiryDays, 10) : undefined,
                        });
                      }}
                      disabled={grantCategories.length === 0 || grantAccessMutation.isPending}
                      data-testid="button-confirm-grant-access"
                    >
                      Grant Access
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <AiUsagePanel />

              <Card>
                <CardHeader>
                  <CardTitle>Analytics Dashboard</CardTitle>
                  <CardDescription>
                    View detailed performance metrics and insights
                  </CardDescription>
                </CardHeader>
              </Card>

              {analyticsLoading ? (
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <Skeleton key={i} className="h-64 w-full" />
                  ))}
                </div>
              ) : analytics ? (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Exam Performance by Category</CardTitle>
                      <CardDescription>
                        Attempts, average score, and pass rate for each exam category
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-72" data-testid="chart-exams-by-category">
                        <ResponsiveContainer width="100%" height="100%">
                          <BarChart
                            data={analytics.examsByCategory.map((c) => ({
                              ...c,
                              categoryLabel: c.category.replace("_", " "),
                            }))}
                          >
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="categoryLabel" tick={{ fontSize: 12 }} />
                            <YAxis yAxisId="left" allowDecimals={false} tick={{ fontSize: 12 }} />
                            <YAxis yAxisId="right" orientation="right" domain={[0, 100]} unit="%" tick={{ fontSize: 12 }} />
                            <Tooltip />
                            <Legend />
                            <Bar yAxisId="left" dataKey="attempts" name="Attempts" fill={CHART_COLORS[0]} radius={[4, 4, 0, 0]} />
                            <Bar yAxisId="right" dataKey="avgScore" name="Avg Score %" fill={CHART_COLORS[1]} radius={[4, 4, 0, 0]} />
                            <Bar yAxisId="right" dataKey="passRate" name="Pass Rate %" fill={CHART_COLORS[2]} radius={[4, 4, 0, 0]} />
                          </BarChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Exam Activity</CardTitle>
                        <CardDescription>Exams completed per day, last 30 days</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-56" data-testid="chart-exam-activity">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={analytics.resultsOverTime}>
                              <defs>
                                <linearGradient id="colorResults" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor={CHART_COLORS[0]} stopOpacity={0.4} />
                                  <stop offset="95%" stopColor={CHART_COLORS[0]} stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} minTickGap={20} />
                              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                              <Tooltip labelFormatter={(d) => new Date(d).toLocaleDateString()} />
                              <Area type="monotone" dataKey="count" name="Exams" stroke={CHART_COLORS[0]} fill="url(#colorResults)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">New Signups</CardTitle>
                        <CardDescription>New accounts created per day, last 30 days</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-56" data-testid="chart-user-growth">
                          <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={analytics.userGrowth}>
                              <defs>
                                <linearGradient id="colorUsers" x1="0" y1="0" x2="0" y2="1">
                                  <stop offset="5%" stopColor={CHART_COLORS[1]} stopOpacity={0.4} />
                                  <stop offset="95%" stopColor={CHART_COLORS[1]} stopOpacity={0} />
                                </linearGradient>
                              </defs>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} minTickGap={20} />
                              <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
                              <Tooltip labelFormatter={(d) => new Date(d).toLocaleDateString()} />
                              <Area type="monotone" dataKey="count" name="Signups" stroke={CHART_COLORS[1]} fill="url(#colorUsers)" />
                            </AreaChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Revenue</CardTitle>
                      <CardDescription>Successful payments per day, last 30 days</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="h-56" data-testid="chart-revenue">
                        <ResponsiveContainer width="100%" height="100%">
                          <AreaChart data={analytics.revenueOverTime}>
                            <defs>
                              <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor={CHART_COLORS[2]} stopOpacity={0.4} />
                                <stop offset="95%" stopColor={CHART_COLORS[2]} stopOpacity={0} />
                              </linearGradient>
                            </defs>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={(d) => d.slice(5)} minTickGap={20} />
                            <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `$${v}`} />
                            <Tooltip
                              formatter={(v: number) => [`$${v.toFixed(2)}`, "Revenue"]}
                              labelFormatter={(d) => new Date(d).toLocaleDateString()}
                            />
                            <Area type="monotone" dataKey="amount" name="Revenue" stroke={CHART_COLORS[2]} fill="url(#colorRevenue)" />
                          </AreaChart>
                        </ResponsiveContainer>
                      </div>
                    </CardContent>
                  </Card>

                  <div className="grid gap-4 md:grid-cols-2">
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Active Subscriptions by Type</CardTitle>
                        <CardDescription>Single-category vs. bundle, among active/trialing users</CardDescription>
                      </CardHeader>
                      <CardContent>
                        {analytics.subscriptionsByType.some((t) => t.count > 0) ? (
                          <div className="h-56" data-testid="chart-subscriptions-by-type">
                            <ResponsiveContainer width="100%" height="100%">
                              <PieChart>
                                <Pie
                                  data={analytics.subscriptionsByType}
                                  dataKey="count"
                                  nameKey="type"
                                  cx="50%"
                                  cy="50%"
                                  outerRadius={80}
                                  label={(entry) => `${entry.type}: ${entry.count}`}
                                >
                                  {analytics.subscriptionsByType.map((entry, index) => (
                                    <Cell key={entry.type} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                  ))}
                                </Pie>
                                <Tooltip />
                                <Legend />
                              </PieChart>
                            </ResponsiveContainer>
                          </div>
                        ) : (
                          <p className="text-center py-12 text-muted-foreground">No active subscriptions yet</p>
                        )}
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Active Subscriptions by Category</CardTitle>
                        <CardDescription>Active/trialing users with access to each category</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="h-56" data-testid="chart-subscriptions-by-category">
                          <ResponsiveContainer width="100%" height="100%">
                            <BarChart
                              data={analytics.subscriptionsByCategory.map((c) => ({
                                ...c,
                                categoryLabel: c.category.replace("_", " "),
                              }))}
                              layout="vertical"
                            >
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
                              <YAxis type="category" dataKey="categoryLabel" width={110} tick={{ fontSize: 12 }} />
                              <Tooltip />
                              <Bar dataKey="count" name="Active users" radius={[0, 4, 4, 0]}>
                                {analytics.subscriptionsByCategory.map((entry, index) => (
                                  <Cell key={entry.category} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                                ))}
                              </Bar>
                            </BarChart>
                          </ResponsiveContainer>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  <Card>
                    <CardHeader>
                      <CardTitle className="text-lg">Top Events (Last 30 Days)</CardTitle>
                      <CardDescription>Marketing and funnel events tracked sitewide</CardDescription>
                    </CardHeader>
                    <CardContent>
                      {analytics.topEvents.length > 0 ? (
                        <div className="space-y-1" data-testid="list-top-events">
                          {analytics.topEvents.map((item) => (
                            <div
                              key={item.event}
                              className="flex items-center justify-between py-2 border-b last:border-0"
                            >
                              <span className="text-sm">{EVENT_LABELS[item.event] || item.event}</span>
                              <Badge variant="secondary">{item.count}</Badge>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-center py-8 text-muted-foreground">
                          No events recorded in the last 30 days
                        </p>
                      )}
                    </CardContent>
                  </Card>
                </>
              ) : (
                <Card>
                  <CardContent>
                    <div className="text-center py-12 text-muted-foreground">
                      <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>Unable to load analytics data</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </TabsContent>

            <TabsContent value="feedback" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MessageSquare className="h-5 w-5" />
                    Question Feedback
                  </CardTitle>
                  <CardDescription>
                    Review and manage user-submitted feedback on exam questions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {feedbackLoading ? (
                    <div className="space-y-4">
                      {[...Array(3)].map((_, i) => (
                        <Skeleton key={i} className="h-20 w-full" />
                      ))}
                    </div>
                  ) : feedback && feedback.length > 0 ? (
                    <div className="space-y-4">
                      {feedback.map((item) => {
                        const feedbackTypeLabels: Record<string, string> = {
                          error: "Error in question",
                          unclear: "Unclear question",
                          wrong_answer: "Wrong answer marked",
                          translation: "Translation issue",
                          suggestion: "Suggestion",
                          other: "Other",
                        };
                        const statusColors: Record<string, string> = {
                          pending: "bg-amber-500/10 text-amber-600 border-amber-500/20",
                          reviewed: "bg-blue-500/10 text-blue-600 border-blue-500/20",
                          resolved: "bg-green-500/10 text-green-600 border-green-500/20",
                          dismissed: "bg-gray-500/10 text-gray-600 border-gray-500/20",
                        };

                        return (
                          <Card key={item.id} className="border">
                            <CardContent className="pt-4">
                              <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 space-y-2">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <Badge variant="outline" className={statusColors[item.status]}>
                                      {item.status.charAt(0).toUpperCase() + item.status.slice(1)}
                                    </Badge>
                                    <Badge variant="secondary">
                                      {feedbackTypeLabels[item.feedbackType] || item.feedbackType}
                                    </Badge>
                                    <span className="text-xs text-muted-foreground">
                                      {new Date(item.createdAt).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    Question ID: <code className="text-xs bg-muted px-1 py-0.5 rounded">{item.questionId.slice(0, 8)}...</code>
                                  </p>
                                  {item.message && (
                                    <p className="text-sm border-l-2 border-muted pl-3 py-1">
                                      {item.message}
                                    </p>
                                  )}
                                  {item.adminNotes && (
                                    <div className="bg-muted/50 rounded p-2 text-sm">
                                      <span className="font-medium">Admin notes:</span> {item.adminNotes}
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  {item.status === "pending" && (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 gap-1"
                                        onClick={() => {
                                          setSelectedFeedback(item);
                                          setFeedbackAdminNotes(item.adminNotes || "");
                                        }}
                                        data-testid={`button-review-feedback-${item.id}`}
                                      >
                                        <Eye className="h-3 w-3" />
                                        Review
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 text-green-600"
                                        onClick={() => updateFeedbackMutation.mutate({ id: item.id, status: "resolved" })}
                                        aria-label="Mark feedback as resolved"
                                        data-testid={`button-resolve-feedback-${item.id}`}
                                      >
                                        <Check className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 text-muted-foreground"
                                        onClick={() => updateFeedbackMutation.mutate({ id: item.id, status: "dismissed" })}
                                        aria-label="Dismiss feedback"
                                        data-testid={`button-dismiss-feedback-${item.id}`}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      <Flag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                      <p>No feedback submitted yet</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="stripe" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <CreditCard className="h-5 w-5" />
                    Stripe Product & Price Configuration
                  </CardTitle>
                  <CardDescription>
                    Diagnose and fix missing Stripe products/prices for each exam category.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap gap-3">
                    <Button
                      onClick={() => stripeDiagnosticMutation.mutate()}
                      disabled={stripeDiagnosticMutation.isPending}
                      variant="outline"
                    >
                      <Search className="mr-2 h-4 w-4" />
                      {stripeDiagnosticMutation.isPending ? "Running..." : "Run Diagnostic"}
                    </Button>
                    <Button
                      onClick={() => stripeInitMutation.mutate()}
                      disabled={stripeInitMutation.isPending}
                      variant="outline"
                    >
                      <RefreshCw className="mr-2 h-4 w-4" />
                      {stripeInitMutation.isPending ? "Running..." : "Re-run Price Init"}
                    </Button>
                    <Button
                      onClick={() => stripeFixMutation.mutate()}
                      disabled={stripeFixMutation.isPending}
                    >
                      <Wrench className="mr-2 h-4 w-4" />
                      {stripeFixMutation.isPending ? "Fixing..." : "Force Create Missing Prices"}
                    </Button>
                  </div>

                  {stripeDiagnostic && (
                    <div className="space-y-4">
                      <div className="flex items-center gap-2">
                        <Badge variant={stripeDiagnostic.summary?.missingCount > 0 ? "destructive" : "default"}>
                          {stripeDiagnostic.environment}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {stripeDiagnostic.summary?.totalProducts} products · {stripeDiagnostic.summary?.totalPrices} prices
                          {stripeDiagnostic.summary?.missingCount > 0 && (
                            <span className="text-destructive ml-2">· {stripeDiagnostic.summary.missingCount} missing</span>
                          )}
                        </span>
                      </div>

                      {stripeDiagnostic.missing?.length > 0 && (
                        <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-md">
                          <p className="text-sm font-medium text-destructive flex items-center gap-1 mb-2">
                            <AlertTriangle className="h-4 w-4" /> Missing items
                          </p>
                          <ul className="text-sm space-y-1">
                            {stripeDiagnostic.missing.map((item: string, i: number) => (
                              <li key={i} className="text-destructive">• {item}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div>
                        <p className="text-sm font-medium mb-2">Products in Stripe</p>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Name</TableHead>
                                <TableHead>ID</TableHead>
                                <TableHead>subscription_type</TableHead>
                                <TableHead>allowed_categories</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {stripeDiagnostic.products?.map((p: any) => (
                                <TableRow key={p.id}>
                                  <TableCell className="font-medium">{p.name}</TableCell>
                                  <TableCell className="font-mono text-xs">{p.id}</TableCell>
                                  <TableCell>
                                    {p.metadata?.subscription_type
                                      ? <Badge variant="default">{p.metadata.subscription_type}</Badge>
                                      : <Badge variant="destructive">missing</Badge>}
                                  </TableCell>
                                  <TableCell>
                                    {p.metadata?.allowed_categories
                                      ? <span className="text-sm">{p.metadata.allowed_categories}</span>
                                      : <Badge variant="destructive">missing</Badge>}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>

                      <div>
                        <p className="text-sm font-medium mb-2">Prices in Stripe</p>
                        <div className="overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Product</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Interval</TableHead>
                                <TableHead>subscription_type</TableHead>
                                <TableHead>allowed_categories</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {stripeDiagnostic.prices?.map((p: any) => (
                                <TableRow key={p.id}>
                                  <TableCell className="font-medium">{p.product_name}</TableCell>
                                  <TableCell>${(p.amount / 100).toFixed(2)}</TableCell>
                                  <TableCell>{p.interval}</TableCell>
                                  <TableCell>
                                    {p.metadata?.subscription_type
                                      ? <Badge variant="default">{p.metadata.subscription_type}</Badge>
                                      : <Badge variant="destructive">missing</Badge>}
                                  </TableCell>
                                  <TableCell>
                                    {p.metadata?.allowed_categories
                                      ? <span className="text-sm">{p.metadata.allowed_categories}</span>
                                      : <Badge variant="destructive">missing</Badge>}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    </div>
                  )}

                  {stripeFixResults && (
                    <div className="p-3 bg-muted rounded-md">
                      <p className="text-sm font-medium mb-2">Fix Results</p>
                      <ul className="text-sm space-y-1 font-mono">
                        {stripeFixResults.map((r, i) => (
                          <li key={i} className={r.startsWith('ERROR') ? 'text-destructive' : 'text-foreground'}>
                            {r}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>

      <Dialog open={!!selectedFeedback} onOpenChange={(open) => !open && setSelectedFeedback(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Feedback</DialogTitle>
            <DialogDescription>
              Update the status and add notes for this feedback
            </DialogDescription>
          </DialogHeader>
          {selectedFeedback && (
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Feedback Type</label>
                <p className="text-sm text-muted-foreground">
                  {{
                    error: "Error in question",
                    unclear: "Unclear question",
                    wrong_answer: "Wrong answer marked",
                    translation: "Translation issue",
                    suggestion: "Suggestion",
                    other: "Other",
                  }[selectedFeedback.feedbackType] || selectedFeedback.feedbackType}
                </p>
              </div>
              {selectedFeedback.message && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">User Description</label>
                  <p className="text-sm bg-muted/50 rounded p-3">{selectedFeedback.message}</p>
                </div>
              )}
              <div className="space-y-2">
                <label className="text-sm font-medium">Admin Notes</label>
                <Textarea
                  value={feedbackAdminNotes}
                  onChange={(e) => setFeedbackAdminNotes(e.target.value)}
                  placeholder="Add notes about this feedback..."
                  className="min-h-[100px]"
                  data-testid="textarea-admin-notes"
                />
              </div>
            </div>
          )}
          <DialogFooter className="flex-col sm:flex-row gap-2">
            <Button
              variant="outline"
              onClick={() => setSelectedFeedback(null)}
            >
              Cancel
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                if (selectedFeedback) {
                  updateFeedbackMutation.mutate({
                    id: selectedFeedback.id,
                    status: "dismissed",
                    adminNotes: feedbackAdminNotes,
                  });
                }
              }}
              disabled={updateFeedbackMutation.isPending}
            >
              Dismiss
            </Button>
            <Button
              onClick={() => {
                if (selectedFeedback) {
                  updateFeedbackMutation.mutate({
                    id: selectedFeedback.id,
                    status: "resolved",
                    adminNotes: feedbackAdminNotes,
                  });
                }
              }}
              disabled={updateFeedbackMutation.isPending}
            >
              Mark Resolved
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
        </div>
      </main>

      <Footer />
    </div>
  );
}
