import { useTranslation } from "react-i18next";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
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
import { useToast } from "@/hooks/use-toast";
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

interface AdminUser {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  subscriptionStatus: string;
  subscriptionPlan: string;
  createdAt: string;
}

export default function AdminPage() {
  const { t } = useTranslation();
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [isQuestionDialogOpen, setIsQuestionDialogOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<ExamCategory | "all">("all");

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
  });

  const { data: users, isLoading: usersLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
  });

  const { data: questions, isLoading: questionsLoading } = useQuery<Question[]>({
    queryKey: ["/api/admin/questions", selectedCategory],
  });

  const { data: feedback, isLoading: feedbackLoading } = useQuery<QuestionFeedback[]>({
    queryKey: ["/api/admin/question-feedback"],
  });

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

  const filteredUsers = users?.filter(
    (user) =>
      user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.lastName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredQuestions = questions?.filter(
    (q) => selectedCategory === "all" || q.category === selectedCategory
  );

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
                                  data-testid={`button-edit-${question.id}`}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={() => deleteQuestionMutation.mutate(question.id)}
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
                  </div>
                </CardHeader>
                <CardContent>
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
                          <TableHead>Subscription</TableHead>
                          <TableHead>Plan</TableHead>
                          <TableHead>Joined</TableHead>
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
                              <Badge
                                variant={
                                  user.subscriptionStatus === "active"
                                    ? "default"
                                    : "secondary"
                                }
                              >
                                {user.subscriptionStatus || "None"}
                              </Badge>
                            </TableCell>
                            <TableCell className="capitalize">
                              {user.subscriptionPlan || "-"}
                            </TableCell>
                            <TableCell>
                              {new Date(user.createdAt).toLocaleDateString()}
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
            </TabsContent>

            <TabsContent value="analytics" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>Analytics Dashboard</CardTitle>
                  <CardDescription>
                    View detailed performance metrics and insights
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-12 text-muted-foreground">
                    <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>Analytics dashboard coming soon</p>
                  </div>
                </CardContent>
              </Card>
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
                                  {item.description && (
                                    <p className="text-sm border-l-2 border-muted pl-3 py-1">
                                      {item.description}
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
                                        onClick={() => setSelectedFeedback(item)}
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
                                        data-testid={`button-resolve-feedback-${item.id}`}
                                      >
                                        <Check className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="h-8 text-muted-foreground"
                                        onClick={() => updateFeedbackMutation.mutate({ id: item.id, status: "dismissed" })}
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
              {selectedFeedback.description && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">User Description</label>
                  <p className="text-sm bg-muted/50 rounded p-3">{selectedFeedback.description}</p>
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
