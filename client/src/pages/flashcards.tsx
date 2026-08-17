import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { Navbar } from "@/components/navbar";
import { Footer } from "@/components/footer";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { apiRequest } from "@/lib/queryClient";
import { CircleCheck, CircleAlert, Eye, Layers } from "lucide-react";
import type { ExamCategory, UserProfile } from "@shared/schema";

type Scope = "smart" | "weak" | "missed" | "bookmarked";

interface Flashcard {
  questionId: string;
  topic: string;
  frontEn: string;
  frontEs: string;
  backEn: string;
  backEs: string;
  explanationEn: string | null;
  explanationEs: string | null;
}

export default function FlashcardsPage() {
  const { i18n } = useTranslation();
  const es = i18n.language === "es";
  const [scope, setScope] = useState<Scope>("smart");
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);

  const { data: profile } = useQuery<UserProfile>({ queryKey: ["/api/profile"] });
  const category = ((profile?.allowedCategories as ExamCategory[] | null) ?? [])[0]
    ?? ("real_estate" as ExamCategory);

  const { data, isLoading, isError } = useQuery<{ cards: Flashcard[]; dueCount: number }>({
    queryKey: [`/api/flashcards/${category}?scope=${scope}&limit=20`],
  });

  // Changing scope loads a different deck, so start it from the top.
  useEffect(() => {
    setIndex(0);
    setRevealed(false);
  }, [scope]);

  const review = useMutation({
    mutationFn: async ({ questionId, rating }: { questionId: string; rating: string }) => {
      const res = await apiRequest("POST", `/api/flashcards/${questionId}/review`, { rating });
      return res.json();
    },
  });

  const cards = data?.cards ?? [];
  const card = cards[index];

  const rate = (rating: "known" | "needs_work") => {
    if (!card) return;
    // Fire and forget: the student should not wait on the network between
    // cards, and a lost review only means the card comes back sooner.
    review.mutate({ questionId: card.questionId, rating });
    setRevealed(false);
    setIndex((i) => i + 1);
  };

  const SCOPES: Array<{ key: Scope; en: string; esLabel: string }> = [
    { key: "smart", en: "Smart mix", esLabel: "Mezcla inteligente" },
    { key: "weak", en: "Weak areas", esLabel: "Áreas débiles" },
    { key: "missed", en: "Missed", esLabel: "Falladas" },
    { key: "bookmarked", en: "Bookmarked", esLabel: "Guardadas" },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Navbar />
      <main className="flex-1">
        <div className="container mx-auto max-w-2xl px-4 py-8">
          <div className="flex items-center gap-2">
            <Layers className="h-6 w-6 text-primary" />
            <h1 className="text-2xl font-bold md:text-3xl">
              {es ? "Tarjetas de Estudio" : "Flashcards"}
            </h1>
          </div>
          <p className="mt-1 text-muted-foreground">
            {es
              ? "Las tarjetas que marques como difíciles vuelven antes."
              : "Cards you find hard come back sooner."}
          </p>

          <div className="mt-5 flex flex-wrap gap-2">
            {SCOPES.map((s) => (
              <Button
                key={s.key}
                size="sm"
                variant={scope === s.key ? "default" : "outline"}
                onClick={() => setScope(s.key)}
                data-testid={`button-scope-${s.key}`}
              >
                {es ? s.esLabel : s.en}
              </Button>
            ))}
          </div>

          {isLoading && <Skeleton className="mt-6 h-64 w-full" />}

          {isError && (
            <Card className="mt-6">
              <CardContent className="py-10 text-center text-muted-foreground">
                {es ? "No pudimos cargar tus tarjetas." : "We couldn't load your cards."}
              </CardContent>
            </Card>
          )}

          {data && cards.length === 0 && (
            <Card className="mt-6" data-testid="card-deck-empty">
              <CardContent className="py-12 text-center">
                <CircleCheck className="mx-auto h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                <p className="mt-3 font-medium">
                  {es ? "Nada pendiente por ahora." : "Nothing due right now."}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {es
                    ? "Vuelve más tarde: las tarjetas reaparecen cuando toca repasarlas."
                    : "Check back later — cards return when they're due for review."}
                </p>
              </CardContent>
            </Card>
          )}

          {data && cards.length > 0 && index >= cards.length && (
            <Card className="mt-6" data-testid="card-deck-complete">
              <CardContent className="py-12 text-center">
                <CircleCheck className="mx-auto h-8 w-8 text-emerald-600 dark:text-emerald-400" />
                <p className="mt-3 font-medium">
                  {es ? `Terminaste ${cards.length} tarjetas.` : `You finished ${cards.length} cards.`}
                </p>
              </CardContent>
            </Card>
          )}

          {card && (
            <>
              <Progress
                value={((index) / cards.length) * 100}
                className="mt-6 h-1.5"
                aria-label={es ? "Progreso del mazo" : "Deck progress"}
              />
              <p className="mt-2 text-xs text-muted-foreground" data-testid="text-deck-position">
                {index + 1} / {cards.length}
              </p>

              <Card className="mt-3" data-testid="card-flashcard">
                <CardContent className="py-8">
                  <Badge variant="secondary">{card.topic}</Badge>
                  <p className="mt-4 text-lg font-medium" data-testid="text-card-front">
                    {es ? card.frontEs : card.frontEn}
                  </p>

                  {revealed ? (
                    <div className="mt-5 border-t pt-5" data-testid="text-card-back">
                      <p className="font-semibold text-emerald-700 dark:text-emerald-400">
                        {es ? card.backEs : card.backEn}
                      </p>
                      {(es ? card.explanationEs : card.explanationEn) && (
                        <p className="mt-2 text-sm text-muted-foreground">
                          {es ? card.explanationEs : card.explanationEn}
                        </p>
                      )}
                    </div>
                  ) : (
                    <Button
                      variant="outline"
                      className="mt-5 w-full"
                      onClick={() => setRevealed(true)}
                      data-testid="button-reveal"
                    >
                      <Eye className="mr-1.5 h-4 w-4" />
                      {es ? "Mostrar respuesta" : "Show answer"}
                    </Button>
                  )}
                </CardContent>
              </Card>

              {/* Rating only after reveal: grading recall you have not tested
                  yet would corrupt the schedule. */}
              {revealed && (
                <div className="mt-4 grid grid-cols-2 gap-3">
                  <Button
                    variant="outline"
                    onClick={() => rate("needs_work")}
                    data-testid="button-needs-work"
                  >
                    <CircleAlert className="mr-1.5 h-4 w-4 text-amber-600 dark:text-amber-400" />
                    {es ? "Necesito repasar" : "Needs work"}
                  </Button>
                  <Button onClick={() => rate("known")} data-testid="button-known">
                    <CircleCheck className="mr-1.5 h-4 w-4" />
                    {es ? "Ya la sé" : "I know this"}
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </main>
      <Footer />
    </div>
  );
}
