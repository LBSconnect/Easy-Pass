import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Link, useLocation, useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { examVisual } from "@/lib/examVisuals";
import { PageShell, PageHeader } from "@/components/page-shell";
import { useAuth } from "@/hooks/use-auth";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { BookOpen, CheckCircle2, XCircle, ArrowRight, ArrowLeft, GraduationCap, Target, Clock, Sparkles, ChevronRight, RotateCcw, Trophy, Lock } from "lucide-react";
import type { StudyProgress, UserProfile, ExamCategory } from "@shared/schema";
import type { CategoryTopics, StudyTopic } from "@shared/studyTopics";
import { activatable } from "@/lib/activatable";

interface QuizQuestion {
  id: string;
  questionEn: string;
  questionEs: string;
  optionsEn: string[];
  optionsEs: string[];
  category: string;
}

interface QuizResponse {
  topic: StudyTopic;
  category: CategoryTopics;
  questions: QuizQuestion[];
}

interface AnswerResult {
  correct: boolean;
  correctAnswer: number;
  explanationEn: string;
  explanationEs: string;
}

function TopicCard({
  topic,
  category,
  progress,
  language,
  locked,
  onStartQuiz,
}: {
  topic: StudyTopic;
  category: CategoryTopics;
  progress?: StudyProgress;
  language: string;
  locked: boolean;
  onStartQuiz: () => void;
}) {
  const { t } = useTranslation();
  const visual = examVisual(category.category);
  const Icon = visual.icon;
  const colorClass = visual.tint;

  const accuracy = progress && progress.questionsAnswered > 0
    ? Math.round((progress.correctAnswers / progress.questionsAnswered) * 100)
    : 0;
  const progressPercent = progress
    ? Math.min(100, Math.round((progress.questionsAnswered / topic.questionCount) * 100))
    : 0;

  return (
    <Card
      className={`hover-elevate transition-all duration-200 cursor-pointer group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 ${locked ? "opacity-70" : ""}`}
      // A real control, not a div that happens to respond to a mouse. Sixty
      // presses of Tab never reached this card before; see lib/activatable.ts.
      {...activatable(onStartQuiz, {
        label: locked
          ? `${language === "es" ? topic.nameEs : topic.nameEn} - ${t("study.subscriptionRequiredShort", "Subscription required")}`
          : `${t("study.startQuiz", "Start Quiz")}: ${language === "es" ? topic.nameEs : topic.nameEn}`,
      })}
      data-testid={`card-topic-${topic.id}`}
    >
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${colorClass}`}>
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold">
                {language === "es" ? topic.nameEs : topic.nameEn}
              </CardTitle>
              <CardDescription className="text-sm mt-1">
                {language === "es" ? topic.descriptionEs : topic.descriptionEn}
              </CardDescription>
            </div>
          </div>
          {locked ? (
            <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
          ) : (
            <ChevronRight className="h-5 w-5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
          )}
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <div className="space-y-3">
          {locked ? (
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-muted-foreground">
                {t("study.subscriptionRequiredShort", "Subscription required")}
              </span>
              <Badge variant="outline" className="text-xs gap-1">
                <Lock className="h-3 w-3" />
                {t("study.subscribe", "Subscribe")}
              </Badge>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  {t("study.progress", "Progress")}
                </span>
                <span className="font-medium">{progressPercent}%</span>
              </div>
              <Progress value={progressPercent} className="h-2" />

              <div className="flex items-center justify-between pt-1">
                <div className="flex items-center gap-4 text-xs text-muted-foreground">
                  <div className="flex items-center gap-1">
                    <Target className="h-3.5 w-3.5" />
                    <span>{progress?.questionsAnswered || 0}/{topic.questionCount}</span>
                  </div>
                  {progress && progress.questionsAnswered > 0 && (
                    <div className="flex items-center gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                      <span>{accuracy}%</span>
                    </div>
                  )}
                </div>
                <Badge variant="secondary" className="text-xs">
                  {t("study.startQuiz", "Start Quiz")}
                </Badge>
              </div>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

function CategorySection({
  categoryData,
  progress,
  language,
  locked,
  onSelectTopic,
}: {
  categoryData: CategoryTopics;
  progress: StudyProgress[];
  language: string;
  locked: boolean;
  onSelectTopic: (topicId: string) => void;
}) {
  const { t } = useTranslation();
  const [, setLocation] = useLocation();
  const visual = examVisual(categoryData.category);
  const Icon = visual.icon;
  const colorClass = visual.tint;
  const bgGradient = visual.softGradient;

  const categoryProgress = progress.filter(p => p.category === categoryData.category);
  const totalQuestions = categoryData.topics.reduce((sum, t) => sum + t.questionCount, 0);
  const answeredQuestions = categoryProgress.reduce((sum, p) => sum + p.questionsAnswered, 0);
  const correctAnswers = categoryProgress.reduce((sum, p) => sum + p.correctAnswers, 0);
  const overallProgress = totalQuestions > 0 ? Math.round((answeredQuestions / totalQuestions) * 100) : 0;
  const overallAccuracy = answeredQuestions > 0 ? Math.round((correctAnswers / answeredQuestions) * 100) : 0;

  return (
    <section className="space-y-4">
      <div className={`rounded-xl p-4 bg-gradient-to-r ${bgGradient}`}>
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl ${colorClass}`}>
              <Icon className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-lg font-semibold flex items-center gap-2">
                {language === "es" ? categoryData.nameEs : categoryData.nameEn}
                {locked && (
                  <Badge variant="outline" className="gap-1 text-xs font-normal">
                    <Lock className="h-3 w-3" />
                    {t("study.subscriptionRequiredShort", "Subscription required")}
                  </Badge>
                )}
              </h2>
              <p className="text-sm text-muted-foreground">
                {categoryData.topics.length} {t("study.topics", "topics")} · {totalQuestions} {t("study.questions", "questions")}
              </p>
            </div>
          </div>

          {locked ? (
            <Button asChild size="sm" data-testid={`button-subscribe-${categoryData.category}`}>
              <Link href={`/pricing?category=${categoryData.category}`}>
                {t("study.subscribe", "Subscribe")}
              </Link>
            </Button>
          ) : (
            <div className="flex items-center gap-4">
              <div className="text-right">
                <div className="text-sm text-muted-foreground">{t("study.progress", "Progress")}</div>
                <div className="font-semibold">{overallProgress}%</div>
              </div>
              {answeredQuestions > 0 && (
                <div className="text-right">
                  <div className="text-sm text-muted-foreground">{t("study.accuracy", "Accuracy")}</div>
                  <div className="font-semibold text-green-600 dark:text-green-400">{overallAccuracy}%</div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {categoryData.topics.map((topic) => {
          const topicProgress = progress.find(p => p.topicId === topic.id);
          return (
            <TopicCard
              key={topic.id}
              topic={topic}
              category={categoryData}
              progress={topicProgress}
              language={language}
              locked={locked}
              onStartQuiz={() =>
                locked
                  ? setLocation(`/pricing?category=${categoryData.category}`)
                  : onSelectTopic(topic.id)
              }
            />
          );
        })}
      </div>
    </section>
  );
}

function QuizView({
  topicId,
  onBack,
}: {
  topicId: string;
  onBack: () => void;
}) {
  const { t, i18n } = useTranslation();
  const language = i18n.language;
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answerResult, setAnswerResult] = useState<AnswerResult | null>(null);
  const [correctCount, setCorrectCount] = useState(0);
  const [answeredCount, setAnsweredCount] = useState(0);

  const { data: quizData, isLoading, error } = useQuery<QuizResponse>({
    queryKey: ["/api/study-guide/quiz", topicId],
    queryFn: async () => {
      const response = await fetch(`/api/study-guide/quiz/${topicId}`, {
        credentials: "include",
      });
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to load quiz");
      }
      return response.json();
    },
  });

  const submitAnswer = useMutation({
    mutationFn: async (data: { questionId: string; selectedAnswer: number; topicId: string }) => {
      const response = await apiRequest("POST", "/api/study-guide/answer", data);
      return response.json() as Promise<AnswerResult>;
    },
    onSuccess: (result) => {
      setAnswerResult(result);
      setAnsweredCount(prev => prev + 1);
      if (result.correct) {
        setCorrectCount(prev => prev + 1);
      }
      queryClient.invalidateQueries({ queryKey: ["/api/study-guide/progress"] });
    },
  });

  const handleAnswerSelect = (index: number) => {
    if (answerResult) return;
    setSelectedAnswer(index);
  };

  const handleSubmitAnswer = () => {
    if (selectedAnswer === null || !quizData) return;
    const question = quizData.questions[currentIndex];
    submitAnswer.mutate({
      questionId: question.id,
      selectedAnswer,
      topicId,
    });
  };

  const handleNextQuestion = () => {
    if (!quizData) return;
    if (currentIndex < quizData.questions.length - 1) {
      setCurrentIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setAnswerResult(null);
    }
  };

  const handleRestartQuiz = () => {
    setCurrentIndex(0);
    setSelectedAnswer(null);
    setAnswerResult(null);
    setCorrectCount(0);
    setAnsweredCount(0);
    queryClient.invalidateQueries({ queryKey: ["/api/study-guide/quiz", topicId] });
  };

  if (isLoading) {
    return (
      <div className="max-w-3xl mx-auto space-y-6 p-4">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64 w-full" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
          <Skeleton className="h-16" />
        </div>
      </div>
    );
  }

  if (error) {
    // The topics list shows every category regardless of subscription, so a
    // stale page, a direct link, or a race with the profile load can still
    // land someone here on a 403 from the quiz endpoint even after the
    // category-page locking above. Give that specific case its own message
    // and a Subscribe button rather than the raw server error text - but
    // don't relabel a genuine bug (topic not found, server error) as a
    // subscription issue.
    const errorMessage = (error as Error).message;
    const isSubscriptionError = /subscription/i.test(errorMessage);

    return (
      <div className="max-w-3xl mx-auto p-4">
        <Card>
          <CardContent className="py-8 text-center">
            <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">
              {isSubscriptionError
                ? t("study.subscriptionRequiredForQuiz", "Subscription required to take this Quiz")
                : t("study.errorLoading", "Error Loading Quiz")}
            </h2>
            <p className="text-muted-foreground mb-4">
              {isSubscriptionError
                ? t(
                    "study.subscriptionRequiredForQuizDesc",
                    "You need an active subscription for this exam category to take this quiz."
                  )
                : errorMessage}
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              {isSubscriptionError && (
                <Button asChild data-testid="button-subscribe-quiz-error">
                  <Link href="/pricing">{t("study.subscribe", "Subscribe")}</Link>
                </Button>
              )}
              <Button
                variant={isSubscriptionError ? "outline" : "default"}
                onClick={onBack}
                data-testid="button-back-to-topics"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t("study.backToTopics", "Back to Topics")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!quizData || quizData.questions.length === 0) {
    return (
      <div className="max-w-3xl mx-auto p-4">
        <Card>
          <CardContent className="py-8 text-center">
            <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-lg font-semibold mb-2">{t("study.noQuestions", "No Questions Available")}</h2>
            <p className="text-muted-foreground mb-4">
              {t("study.noQuestionsDesc", "There are no questions available for this topic yet.")}
            </p>
            <Button onClick={onBack} data-testid="button-back-to-topics">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("study.backToTopics", "Back to Topics")}
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const question = quizData.questions[currentIndex];
  const isLastQuestion = currentIndex === quizData.questions.length - 1;
  const quizComplete = answeredCount === quizData.questions.length && isLastQuestion && answerResult;

  const quizVisual = examVisual(quizData.category.category);
  const Icon = quizVisual.icon;
  const colorClass = quizVisual.tint;

  if (quizComplete) {
    const accuracy = Math.round((correctCount / answeredCount) * 100);
    return (
      <div className="max-w-3xl mx-auto p-4 safe-area-inset">
        <Card>
          <CardContent className="py-8 text-center space-y-6">
            <div className={`p-4 rounded-full ${colorClass} w-fit mx-auto`}>
              <Trophy className="h-12 w-12" />
            </div>
            <div>
              <h2 className="text-2xl font-bold mb-2">{t("study.quizComplete", "Quiz Complete!")}</h2>
              <p className="text-muted-foreground">
                {language === "es" ? quizData.topic.nameEs : quizData.topic.nameEn}
              </p>
            </div>
            
            <div className="grid grid-cols-2 gap-4 max-w-xs mx-auto">
              <Card>
                <CardContent className="py-4 text-center">
                  <div className="text-3xl font-bold text-green-600 dark:text-green-400">{correctCount}</div>
                  <div className="text-sm text-muted-foreground">{t("study.correct", "Correct")}</div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="py-4 text-center">
                  <div className="text-3xl font-bold">{accuracy}%</div>
                  <div className="text-sm text-muted-foreground">{t("study.accuracy", "Accuracy")}</div>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 justify-center pt-4">
              <Button variant="outline" onClick={onBack} className="min-h-[44px]" data-testid="button-back-to-topics">
                <ArrowLeft className="h-4 w-4 mr-2" />
                {t("study.backToTopics", "Back to Topics")}
              </Button>
              <Button onClick={handleRestartQuiz} className="min-h-[44px]" data-testid="button-restart-quiz">
                <RotateCcw className="h-4 w-4 mr-2" />
                {t("study.tryAgain", "Try Again")}
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto p-4 space-y-6 safe-area-inset">
      <div className="flex items-center justify-between">
        <Button variant="ghost" onClick={onBack} className="min-h-[44px]" data-testid="button-back-quiz">
          <ArrowLeft className="h-4 w-4 mr-2" />
          {t("common.back", "Back")}
        </Button>
        <div className="flex items-center gap-2">
          <Badge variant="secondary">
            {currentIndex + 1} / {quizData.questions.length}
          </Badge>
          {answeredCount > 0 && (
            <Badge variant="outline" className="text-green-600 border-green-600/20">
              {correctCount}/{answeredCount}
            </Badge>
          )}
        </div>
      </div>

      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2 mb-2">
            <div className={`p-1.5 rounded ${colorClass}`}>
              <Icon className="h-4 w-4" />
            </div>
            <span className="text-sm text-muted-foreground">
              {language === "es" ? quizData.topic.nameEs : quizData.topic.nameEn}
            </span>
          </div>
          <CardTitle className="text-lg leading-relaxed">
            {language === "es" ? question.questionEs : question.questionEn}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {(language === "es" ? question.optionsEs : question.optionsEn).map((option, index) => {
            let buttonClass = "w-full text-left p-4 min-h-[56px] justify-start text-base";
            let variant: "outline" | "default" | "destructive" | "secondary" = "outline";
            
            if (answerResult) {
              if (index === answerResult.correctAnswer) {
                buttonClass += " bg-green-500/10 border-green-500 text-green-700 dark:text-green-400";
              } else if (index === selectedAnswer && !answerResult.correct) {
                buttonClass += " bg-red-500/10 border-red-500 text-red-700 dark:text-red-400";
              }
            } else if (selectedAnswer === index) {
              buttonClass += " border-primary bg-primary/5";
            }

            return (
              <Button
                key={index}
                variant={variant}
                className={buttonClass}
                onClick={() => handleAnswerSelect(index)}
                disabled={!!answerResult}
                data-testid={`button-answer-${index}`}
              >
                <span className="font-medium mr-3 text-muted-foreground">
                  {String.fromCharCode(65 + index)}.
                </span>
                {option}
                {answerResult && index === answerResult.correctAnswer && (
                  <CheckCircle2 className="h-5 w-5 ml-auto text-green-600" />
                )}
                {answerResult && index === selectedAnswer && !answerResult.correct && (
                  <XCircle className="h-5 w-5 ml-auto text-red-600" />
                )}
              </Button>
            );
          })}
        </CardContent>
      </Card>

      {answerResult && (
        <Card className={answerResult.correct ? "border-green-500/50 bg-green-500/5" : "border-amber-500/50 bg-amber-500/5"}>
          <CardContent className="py-4">
            <div className="flex items-start gap-3">
              {answerResult.correct ? (
                <CheckCircle2 className="h-5 w-5 text-green-600 mt-0.5 shrink-0" />
              ) : (
                <Sparkles className="h-5 w-5 text-amber-600 mt-0.5 shrink-0" />
              )}
              <div>
                <p className="font-medium mb-1">
                  {answerResult.correct
                    ? t("study.correctAnswer", "Correct!")
                    : t("study.incorrectAnswer", "Not quite right")}
                </p>
                <p className="text-sm text-muted-foreground">
                  {language === "es" ? answerResult.explanationEs : answerResult.explanationEn}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex justify-end">
        {!answerResult ? (
          <Button
            onClick={handleSubmitAnswer}
            disabled={selectedAnswer === null || submitAnswer.isPending}
            className="min-h-[44px]"
            data-testid="button-submit-answer"
          >
            {submitAnswer.isPending ? t("common.loading", "Loading...") : t("study.checkAnswer", "Check Answer")}
          </Button>
        ) : (
          <Button onClick={handleNextQuestion} className="min-h-[44px]" data-testid="button-next-question">
            {isLastQuestion ? t("study.finishQuiz", "Finish Quiz") : t("study.nextQuestion", "Next Question")}
            <ArrowRight className="h-4 w-4 ml-2" />
          </Button>
        )}
      </div>
    </div>
  );
}

export default function StudyGuidePage() {
  const { t, i18n } = useTranslation();
  const { user } = useAuth();
  const language = i18n.language;
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  const { data: topics, isLoading: topicsLoading } = useQuery<CategoryTopics[]>({
    queryKey: ["/api/study-guide/topics"],
  });

  const { data: progress, isLoading: progressLoading } = useQuery<StudyProgress[]>({
    queryKey: ["/api/study-guide/progress"],
    enabled: !!user,
  });

  // The topics list above is public and shows every category regardless of
  // subscription, but the quiz endpoint enforces per-category access - so we
  // need the user's own subscription to know which categories to lock here
  // and avoid sending them into a quiz that will just 403.
  const { data: profile, isLoading: profileLoading } = useQuery<UserProfile>({
    queryKey: ["/api/profile"],
    enabled: !!user,
  });

  const isLoading = topicsLoading || progressLoading || (!!user && profileLoading);

  /**
   * The student's own exam first.
   *
   * Four categories in a fixed order means three quarters of this page is
   * material a given student cannot open, sitting above the one they can. The
   * exam they are actually studying for leads, then anything else they have
   * access to, then the rest.
   */
  const orderedTopics = (() => {
    if (!topics) return topics;
    const allowed = new Set((profile?.allowedCategories as string[] | null) ?? []);
    const preferred = profile?.preferredCategory ?? null;
    const rank = (category: string): number => {
      if (category === preferred) return 0;
      if (allowed.has(category)) return 1;
      return 2;
    };
    return [...topics].sort((a, b) => rank(a.category) - rank(b.category));
  })();

  const isCategoryLocked = (category: ExamCategory) => {
    if (!profile) return false; // don't flash "locked" before we know
    if (profile.role === "admin") return false;
    return !(profile.allowedCategories || []).includes(category);
  };

  if (selectedTopic) {
    return (
      <PageShell width="content">
        <QuizView topicId={selectedTopic} onBack={() => setSelectedTopic(null)} />
      </PageShell>
    );
  }

  return (
    <PageShell width="wide">
      <PageHeader
        title={t("study.title", "Study Guide")}
        subtitle={t("study.subtitle", "Learn at your own pace with topic-based quizzes")}
        icon={GraduationCap}
        action={
          <Button asChild variant="outline" className="min-h-11">
            <Link href="/dashboard" data-testid="link-back-dashboard">
              <ArrowLeft className="h-4 w-4 mr-2" />
              {t("common.dashboard", "Dashboard")}
            </Link>
          </Button>
        }
      />

      <div className="mt-6 space-y-8">
          {isLoading ? (
            <div className="space-y-8">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="space-y-4">
                  <Skeleton className="h-24 w-full rounded-xl" />
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Skeleton className="h-40" />
                    <Skeleton className="h-40" />
                    <Skeleton className="h-40" />
                  </div>
                </div>
              ))}
            </div>
          ) : orderedTopics && orderedTopics.length > 0 ? (
            <div className="space-y-8">
              {orderedTopics.map((categoryData) => (
                <CategorySection
                  key={categoryData.category}
                  categoryData={categoryData}
                  progress={progress || []}
                  language={language}
                  locked={isCategoryLocked(categoryData.category)}
                  onSelectTopic={setSelectedTopic}
                />
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="py-12 text-center">
                <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h2 className="text-lg font-semibold mb-2">
                  {t("study.noTopics", "No Study Topics Available")}
                </h2>
                <p className="text-muted-foreground">
                  {t("study.noTopicsDesc", "Study topics will be available soon.")}
                </p>
              </CardContent>
            </Card>
          )}
      </div>
    </PageShell>
  );
}
