import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { apiRequest } from "@/lib/queryClient";
import { Bookmark, BookmarkCheck, CircleCheck, CircleX, RotateCcw } from "lucide-react";
import type { ExamCategory, UserProfile } from "@shared/schema";

type NotebookFilter = "all" | "struggling" | "mastered" | "recent";

interface NotebookEntry {
  questionId: string;
  topic: string;
  status: "struggling" | "mastered";
  timesSeen: number;
  timesWrong: number;
  isBookmarked: boolean;
  question: {
    id: string;
    questionTextEn: string;
    questionTextEs: string;
    optionsEn: string[];
    optionsEs: string[];
    correctAnswer: number;
    explanationEn: string | null;
    explanationEs: string | null;
  };
}

interface NotebookResponse {
  entries: NotebookEntry[];
  counts: Record<NotebookFilter, number>;
  topics: string[];
}

export default function MissedQuestionsPage() {
  const { i18n } = useTranslation();
  const es = i18n.language === "es";
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<NotebookFilter>("struggling");

  const { data: profile } = useQuery<UserProfile>({ queryKey: ["/api/profile"] });
  const category = ((profile?.allowedCategories as ExamCategory[] | null) ?? [])[0]
    ?? ("real_estate" as ExamCategory);

  const { data, isLoading, isError } = useQuery<NotebookResponse>({
    queryKey: [`/api/missed-questions/${category}?filter=${filter}`],
  });

  // Normalise the response shape once. Checking `data` alone is not enough -
  // a truthy body missing `entries` threw on `.length` here and took the whole
  // page down with it.
  const entries = Array.isArray(data?.entries) ? data.entries : [];

  const toggleBookmark = useMutation({
    mutationFn: async (questionId: string) => {
      const res = await apiRequest("POST", `/api/bookmarks/${questionId}`);
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: [`/api/missed-questions/${category}?filter=${filter}`],
      });
    },
  });

  const FILTERS: Array<{ key: NotebookFilter; en: string; esLabel: string }> = [
    { key: "struggling", en: "Still struggling", esLabel: "Aún con dificultad" },
    { key: "mastered", en: "Mastered", esLabel: "Dominadas" },
    { key: "recent", en: "This week", esLabel: "Esta semana" },
    { key: "all", en: "All", esLabel: "Todas" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <div className="container mx-auto max-w-3xl px-4 py-8">
          <h1 className="text-2xl font-bold md:text-3xl">
            {es ? "Mis Preguntas Falladas" : "My Missed Questions"}
          </h1>
          <p className="mt-1 text-muted-foreground">
            {es
              ? "Repasa lo que fallaste y por qué la respuesta correcta lo es."
              : "Review what you got wrong, and why the right answer is right."}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {FILTERS.map((f) => (
              <Button
                key={f.key}
                size="sm"
                variant={filter === f.key ? "default" : "outline"}
                onClick={() => setFilter(f.key)}
                data-testid={`button-filter-${f.key}`}
              >
                {es ? f.esLabel : f.en}
                {data?.counts && (
                  <span className="ml-1.5 opacity-70">{data.counts[f.key] ?? 0}</span>
                )}
              </Button>
            ))}
          </div>

          {isLoading && (
            <div className="mt-6 space-y-4">
              <Skeleton className="h-32 w-full" />
              <Skeleton className="h-32 w-full" />
            </div>
          )}

          {isError && (
            <Card className="mt-6">
              <CardContent className="py-8 text-center text-muted-foreground">
                {es
                  ? "No pudimos cargar tus preguntas falladas."
                  : "We couldn't load your missed questions."}
              </CardContent>
            </Card>
          )}

          {data && entries.length === 0 && (
            <Card className="mt-6" data-testid="card-notebook-empty">
              <CardContent className="py-10 text-center">
                <CircleCheck className="mx-auto h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                <p className="mt-3 font-medium">
                  {filter === "struggling"
                    ? es
                      ? "Nada pendiente aquí. Buen trabajo."
                      : "Nothing outstanding here. Nice work."
                    : es
                      ? "Todavía no hay preguntas en esta vista."
                      : "No questions in this view yet."}
                </p>
              </CardContent>
            </Card>
          )}

          <div className="mt-6 space-y-4">
            {entries.map((entry) => {
              const q = entry.question;
              const options = es ? q.optionsEs : q.optionsEn;
              const explanation = es ? q.explanationEs : q.explanationEn;
              const struggling = entry.status === "struggling";

              return (
                <Card key={entry.questionId} data-testid={`card-missed-${entry.status}`}>
                  <CardContent className="py-5">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {/* Status stated in words as well as icon and colour. */}
                        {struggling ? (
                          <CircleX className="h-4 w-4 text-rose-600 dark:text-rose-400" aria-hidden="true" />
                        ) : (
                          <CircleCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" />
                        )}
                        <span className="text-sm font-medium">
                          {struggling
                            ? es ? "Aún con dificultad" : "Still struggling"
                            : es ? "Dominada" : "Mastered"}
                        </span>
                        <Badge variant="secondary">{entry.topic}</Badge>
                      </div>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => toggleBookmark.mutate(entry.questionId)}
                        aria-label={
                          entry.isBookmarked
                            ? es ? "Quitar marcador" : "Remove bookmark"
                            : es ? "Marcar pregunta" : "Bookmark question"
                        }
                        aria-pressed={entry.isBookmarked}
                        data-testid={`button-bookmark-${entry.questionId}`}
                      >
                        {entry.isBookmarked ? (
                          <BookmarkCheck className="h-4 w-4 text-primary" />
                        ) : (
                          <Bookmark className="h-4 w-4" />
                        )}
                      </Button>
                    </div>

                    <p className="mt-3 font-medium">
                      {es ? q.questionTextEs : q.questionTextEn}
                    </p>

                    <ul className="mt-3 space-y-1.5">
                      {options.map((option, i) => {
                        const isCorrect = i === q.correctAnswer;
                        return (
                          <li
                            key={i}
                            className={`rounded-md px-3 py-2 text-sm ${
                              isCorrect
                                ? "bg-emerald-500/10 font-medium"
                                : "bg-muted/40 text-muted-foreground"
                            }`}
                          >
                            {isCorrect && (
                              <span className="mr-1.5 text-emerald-700 dark:text-emerald-400">
                                {es ? "Correcta:" : "Correct:"}
                              </span>
                            )}
                            {option}
                          </li>
                        );
                      })}
                    </ul>

                    {explanation && (
                      <p className="mt-3 border-l-2 border-primary/40 pl-3 text-sm text-muted-foreground">
                        {explanation}
                      </p>
                    )}

                    <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
                      <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
                      {es
                        ? `Fallada ${entry.timesWrong} de ${entry.timesSeen} intentos`
                        : `Missed ${entry.timesWrong} of ${entry.timesSeen} attempts`}
                    </p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </main>
      <Footer />
    </div>
  );
}
